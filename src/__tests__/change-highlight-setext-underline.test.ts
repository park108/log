import { markChangedLines } from '../Log/diffContents';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// **변경 이력 강조는 밑줄식 제목의 밑줄 줄을 감싸지 않는다 — 밑줄 판정은 파서의 것이다**
// (spec `writer-change-history-highlight` 동작 6).
//
// 강조가 줄 전체 표기 가운데 가로줄 꼴만 비켜 가던 동안 밑줄 줄(`=` 1개 이상 · `-` 1~2개)은
// 감싸였다. 감싼 줄은 밑줄 꼴이 아니어서 파서가 제목을 세우지 않는다 — 변경 이력에서만
// 제목이 문단으로 풀리고 밑줄이 글자로 보였다 (HEAD=ad8e798 실측: `제목\n===` / `제목\n---` →
// `<p>제목</p><p><span …>===</span></p>`).
//
// 판정면은 `change-highlight-preserves-rendering.test.ts` 와 같다 — 강조본에서 강조 span
// 태그만 걷은 문자열이 평소 렌더와 같은가. 식별자·주석은 재지 않는다. 밑줄 판정 함수의
// 이름이나 위치가 바뀌어도 이 파일은 초록이어야 하고, 밑줄 정규식 사본이 돌아오면 붉어야
// 한다 — 앞 줄이 문단이 아닌 밑줄 꼴(아래 셋째 묶음)과 인용 안 밑줄(U7)이 그 사본을 가른다.

const HIGHLIGHT_SPAN = /<span class="span--logitem-changed">|<\/span>/g;
const SPAN_OPEN = /<span class="span--logitem-changed">/g;

const plain = (markdown: string): string => sanitizeHtml(markdownToHtml(markdown));

const highlighted = (newer: string, older: string): string =>
	sanitizeHtml(markdownToHtml(markChangedLines(newer, older)));

// 강조 span 태그만 걷은 강조본.
const unmarked = (newer: string, older: string): string =>
	highlighted(newer, older).replace(HIGHLIGHT_SPAN, '');

const spanCount = (html: string): number => html.match(SPAN_OPEN)?.length ?? 0;

describe('밑줄식 제목의 밑줄 줄은 감싸지 않는다 (동작 6)', () => {

	// 밑줄만 바뀐 판본. 걷은 강조본 === 평소 렌더 (HEAD=ad8e798 7/7 다름).
	it.each([
		['U1', '제목\n===', '제목\n---'],
		['U2', '제목\n--', '제목'],
		['U4', '제목\n-', '제목'],
		['U5', '제목\n=', '제목\n=='],
		['U8', '제목\n==\n본문', '제목\n===\n본문'],
		['U11', '제목\n  ===', '제목\n==='],
		['U7', '> 제목\n> ===', '> 제목\n> ---'],
	])('%s', (_label, newer, older) => {

		expect(unmarked(newer, older)).toBe(plain(newer));
	});

	// 평소 렌더가 정말 제목을 세우는지 — 파서가 밑줄을 보지 않는 트리에서는 위 등식이
	// 무판정으로 초록이 된다.
	it.each([
		['U1', '제목\n===', '<h1>제목</h1>'],
		['U2', '제목\n--', '<h2>제목</h2>'],
		['U7', '> 제목\n> ===', '<blockquote><h1>제목</h1></blockquote>'],
	])('%s 평소 렌더는 제목이다', (_label, newer, expected) => {

		expect(plain(newer)).toBe(expected);
	});
});

describe('바뀌지 않는 것 — 강조 렌더 그대로 (대조)', () => {

	it.each([
		['U3 가로줄 꼴 밑줄', '제목\n---', '제목\n===', '<h2>제목</h2>'],
		['U6 제목 글자가 바뀜', '새 제목\n===', '제목\n===', '<h1><span class="span--logitem-changed">새 제목</span></h1>'],
		['U9 가로줄', 'a\n---\nb', 'a\n***\nb', '<h2>a</h2><p>b</p>'],
		['U10 밑줄 꼴 아님', '제목\n= =', '제목', '<p>제목</p><p><span class="span--logitem-changed">= =</span></p>'],
	])('%s', (_label, newer, older, expected) => {

		expect(highlighted(newer, older)).toBe(expected);
	});
});

describe('앞 줄이 문단이 아닌 밑줄 꼴은 강조된다 — 밑줄 정규식 사본을 가른다', () => {

	it.each([
		['앞 줄 없음', '==\n본문', '=\n본문'],
		['앞 줄 빈 줄', '본문\n\n==', '본문\n\n='],
		['항목 안', '- a\n  ==', '- a\n  ='],
	])('%s', (_label, newer, older) => {

		const out = highlighted(newer, older);

		expect(spanCount(out)).toBe(1);
		expect(unmarked(newer, older)).toBe(plain(newer));
	});
});
