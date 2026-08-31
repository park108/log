import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 글에 쓴 글자는 화면에 남아야 한다.
//
// 이 불변식이 없던 동안 꺾쇠가 든 문장이 조용히 잘렸다 — 브라우저가 `<String>` 을
// 태그로 읽고 sanitize 가 미지의 태그를 지운 결과다. 실측:
//   "제네릭은 List<String> 이다"  → "제네릭은 List 이다"
//   "조건은 a<b 이고 c>d 이다"    → "조건은 ad 이다"
// 코드 블록 안도 같았다.
//
// 아래 corpus 는 **마크다운 문법이 없는 평문**만 담는다. 그래야 "입력과 출력이
// 같아야 한다" 는 판정이 성립한다. 문법이 든 경우는 markdownParser.test.ts 가
// 개별로 다룬다.

const PLAIN_PROSE = [
	'제네릭은 List<String> 이다',
	'React 에서 <div> 를 쓴다',
	'조건은 a<b 이고 c>d 이다',
	'<script>alert(1)</script> 를 조심하라',
	'AT&T 와 R&D 와 Q&A',
	'꺾쇠 사이 공백: a < b > c',
	'화살표는 -> 와 => 로 쓴다',
	'비교 연산자 a <= b 와 c >= d',
	'제네릭 중첩 Map<String, List<Integer>> 이다',
	'HTML 엔티티는 &amp; 로 쓴다',
	'따옴표 "큰것" 과 \'작은것\'',
	'백분율 100% 와 통화 $100',
	'이모지 🎉 와 한글과 English 혼용',
	'수식 2 * 3 * 4 = 24 이다',
	// 겹 별표 쪽 짝. 앞뒤가 공백인 ` ** ` 가 한 줄에 두 번 나온다 — 짝이 맞아
	// 보이므로 공백 판정이 없으면 문장 한가운데부터 통째로 굵어지고 구분자
	// 네 글자가 사라진다. 홑 별표 쪽 `수식 2 * 3 * 4 = 24 이다` 만 있던 동안
	// 이 형태가 게이트 사각에 들어앉아 있었다.
	'거듭제곱은 2 ** 10 은 1024 이고 2 ** 20 은 1048576 이다',
	'경로는 src/**/*.ts 이다',
	// 물결 쪽 짝. 한국어 늘임 표기 `와~~` · `대박~~` 이 한 줄에 두 번 나온다 —
	// 짝이 맞아 보이므로 공백 판정이 없으면 문장 한가운데부터 통째로 취소선이
	// 되고 물결 네 글자가 사라진다. 목록 요약 경로에서는 태그까지 벗겨져
	// `와 좋다 정말 대박` 으로 줄어, 글쓴이가 자기 원문에서 잘못을 찾을 수 없다.
	// 겹 별표 쪽 짝만 있던 동안 이 형태가 게이트 사각에 들어앉아 있었다.
	'와~~ 좋다 정말 대박~~',
	// 늘임표기 **뒤에 문장부호**가 오는 형태. 위 `와~~ … 대박~~` 은 뒤가
	// 공백이라 **조건 1**이 지키는 자리이고, 이 두 줄은 뒤가 문장부호라
	// **조건 2**(flanking) 가 지키는 자리다 — 조건 1 만 있던 동안 첫 줄이
	// `대박<del>. 진짜</del>. 좋다` 로 렌더돼 요약 경로에서 물결 네 글자가
	// 사라졌다. 조건 1 쪽 줄만으로는 이 방향이 죽어도 붉지 않는다.
	//
	// **짝이 맞는 취소선을 여기 넣지 않는다** — `~~취소~~` 는 실제 문법이라
	// 물결이 정당하게 소비되고, 이 파일이 머리말에서 선언한 "마크다운 문법이
	// 없는 평문만" 전제를 깬다. 그 방향은 markdownParser.test.ts 가 잰다.
	'대박~~. 진짜~~. 좋다',
	'진짜~~, 그리고 좋다',

	// 마크다운 문법에 **인접한** 표기들. 줄 머리가 아니거나 짝이 없어 문법이
	// 아니지만, 파서가 잘못 삼키기 쉬운 자리다.
	// `snake_case_name` 은 단어 **안쪽**의 `_` 라 CommonMark 에서 강조를 열지
	// 못한다 — 그래서 평문이다. 여기 함께 있던 `__dunder__` 는 평문이 아니라
	// **짝이 맞는 굵게 문법**이었다 (앞뒤가 공백이고 안쪽이 단어 글자다).
	// 이 파일이 머리말에서 선언한 "마크다운 문법이 없는 평문만" 을 그 항목이
	// 스스로 어겼고, 그 결과 밑줄 강조를 구현하는 작업이 이 게이트에 막혔다
	// (`TSK-20260831-04` 격리). 전제를 되돌리는 것이지 완화가 아니다.
	//
	// 산문에서 `__init__` 같은 표기를 글자 그대로 쓰려면 코드 스팬에 넣는다 —
	// 그 경로는 아래 corpus 의 백틱 항목과 `backslash-escape` 게이트가 지킨다.
	'변수는 snake_case_name 을 쓴다',
	'대괄호 [메모] 와 느낌표 ![alt] 만 있다',
	'백틱 하나 ` 만 있는 문장',
	'파이프 a | b | c 와 물결 ~홈',
	'대시 -- 두 개와 역슬래시 C:\\Users\\me',
	'중괄호 {a: 1} 과 캐럿 a^b',
	'따옴표 안 별표 "a*b" 이다',
	'줄 가운데 인용부호 > 는 인용이 아니다',
	'숫자 1.5 초는 목록이 아니다',
	'주소 https://example.com/a?b=1&c=2 를 본다',
];

const renderedText = (markdown: string): string => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el.textContent ?? '';
};

describe('마크다운 렌더에서 글자가 사라지지 않는다', () => {

	it.each(PLAIN_PROSE)('평문이 그대로 남는다: %s', (prose) => {
		expect(renderedText(prose)).toBe(prose);
	});

	it('코드 블록 안의 글자도 그대로 남는다', () => {
		const code = 'Map<String, List<Integer>> m = new HashMap<>();';
		expect(renderedText('```java\n' + code + '\n```')).toContain(code);
	});

	it('인라인 코드 안의 글자도 그대로 남는다', () => {
		expect(renderedText('`List<String>` 은 코드')).toBe('List<String> 은 코드');
	});

	// 대조 — escape 는 표시를 위한 것이지 실행 허용이 아니다.
	it('스크립트는 글자로 보이되 태그로 남지 않는다', () => {
		const html = sanitizeHtml(markdownToHtml('<script>alert(1)</script>'));
		expect(html.toLowerCase()).not.toContain('<script');
		expect(html.toLowerCase()).not.toContain('<img');
	});

	// 대조 — corpus 가 실제로 무언가를 재고 있는지. 비어 있으면 위 전부가 공허하다.
	it('corpus 가 비어 있지 않다', () => {
		expect(PLAIN_PROSE.length).toBeGreaterThanOrEqual(10);
		expect(PLAIN_PROSE.some((s) => s.includes('<'))).toBe(true);
		expect(PLAIN_PROSE.some((s) => s.includes('&'))).toBe(true);
	});
});
