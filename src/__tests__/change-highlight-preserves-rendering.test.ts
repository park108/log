import { markChangedLines } from '../Log/diffContents';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// **변경 이력의 강조는 문서의 모양을 바꾸지 않는다.**
//
// 강조는 바뀐 줄을 표식으로 감싸 넣는 방식이다. 그런데 표식이 줄 끝에 붙으면
// **줄 전체를 보는 문법**이 더 이상 매치하지 못한다. 실측:
//
//   ---              평소 <hr>              강조 <p>---</p>        선이 사라진다
//   ## 제목 ##       평소 <h2>제목</h2>     강조 <h2>제목 ##</h2>  표기가 보인다
//
// 판정 방법이 이 게이트의 핵심이다. 개별 문법을 하나씩 단언하는 대신 **강조본에서
// 표식만 걷어낸 것이 평소 렌더와 같은가** 를 본다. 그래야 앞으로 추가될 문법도
// 자동으로 모집단에 들어온다 — 오늘 이 결함은 제목 닫는 `#` 이 추가되면서 생겼고,
// 그때 이 축을 보는 게이트가 없었다.

const HIGHLIGHT_SPAN = /<span class="span--logitem-changed">|<\/span>/g;

const plain = (markdown: string): string => sanitizeHtml(markdownToHtml(markdown));

const highlighted = (current: string, previous: string): string =>
	sanitizeHtml(markdownToHtml(markChangedLines(current, previous)));

// 표식만 걷어낸 강조본.
const unmarked = (current: string, previous: string): string =>
	highlighted(current, previous).replace(HIGHLIGHT_SPAN, '');

describe('강조는 렌더 결과를 바꾸지 않는다', () => {

	it.each([
		['수평선', 'a\n---\nb', 'a\n***\nb'],
		['제목 닫는 샵', '## 제목 바뀜 ##', '## 제목 ##'],
		['제목 (닫는 샵 없음)', '## 제목 바뀜', '## 제목'],
		['제목 안의 C#', '## C# 과 F# 바뀜', '## C# 과 F#'],
		['글머리 목록', '- 하나 바뀜', '- 하나'],
		['번호 목록', '1. 하나 바뀜', '1. 하나'],
		['목록 이어짐', '1. 하나\n   이어짐 바뀜', '1. 하나\n   이어짐'],
		['여러 줄 인용', '> 첫 줄\n> 둘째 줄 바뀜', '> 첫 줄\n> 둘째 줄'],
		['이스케이프', '별표 \\*새것\\* 이다', '별표 \\*옛것\\* 이다'],
		['문단 끝 해시태그', '끝에 #태그 바뀜', '끝에 #태그'],
		['링크', '[바깥](https://example.com) 바뀜', '[바깥](https://example.com)'],
	])('%s', (_label, current, previous) => {

		expect(unmarked(current, previous)).toBe(plain(current));
	});

	// 위 단언은 "강조를 아예 안 넣는다" 는 구현도 통과시킨다. 강조가 실제로
	// 들어갔는지 따로 본다.
	it('바뀐 줄에는 강조가 실제로 들어간다', () => {

		expect(highlighted('## 제목 바뀜 ##', '## 제목 ##'))
			.toContain('class="span--logitem-changed"');
	});

	// 안 바뀐 줄에는 들어가지 않는다 — 전부 강조하면 위 단언이 공허해진다.
	it('안 바뀐 줄에는 들어가지 않는다', () => {

		expect(highlighted('## 제목 ##', '## 제목 ##'))
			.not.toContain('class="span--logitem-changed"');
	});

	// **제목이 아닌 줄에서는 줄 끝 `#` 도 내용이다.** 닫는 시퀀스 규칙을 모든 줄에
	// 적용하면 그 글자가 강조 밖으로 밀린다 — 렌더 결과는 같으므로 위 불변식이
	// 잡지 못한다 (실측: 주입 5방향 중 이 한 방향이 새어 나갔다). 강조 범위 자체를
	// 본다.
	it('제목이 아닌 줄에서는 끝의 # 도 강조 안에 든다', () => {

		expect(highlighted('이건 샵 #', '이건 샵'))
			.toBe('<p><span class="span--logitem-changed">이건 샵 #</span></p>');
	});

	// 줄 전체가 표기인 것에는 감쌀 내용이 없다 — 감싸면 그 문법이 죽는다.
	//
	// 입력은 그대로 두고 기대값만 갱신했다 (TSK-20260831-22-b). `a` 밑의 `---` 은
	// 이제 밑줄식 제목이라 `<hr>` 이 아니라 `<h2>` 를 낸다. **이 it 의 본래 주제는
	// 아래 `not.toContain` 이다** — 줄 전체가 표기인 것에 강조를 감싸지 않는다는
	// 명제는 계약과 직교하며 여전히 참이므로 그대로 둔다.
	it('줄 전체가 표기인 것에는 강조를 넣지 않는다', () => {

		const out = highlighted('a\n---\nb', 'a\n***\nb');

		expect(out).toContain('<h2>a</h2>');
		expect(out).not.toContain('class="span--logitem-changed"');
	});
});
