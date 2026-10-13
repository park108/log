import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 줄을 건너는 코드 스팬 · 인용 줄 인라인 (spec `markdown-rendering` §동작 26 둘째 하위 항목 ·
// §수용 기준 "줄을 건너는 코드 스팬 · 인용 줄 인라인").
//
// 목록 항목 이어짐 줄과 인용 줄은 둘 다 `<br>` 로 이어지지만 인라인 판정 범위가 달랐다.
// 항목 이어짐은 한 텍스트로 판정돼 줄을 건너는 코드 스팬이 섰는데, 줄 이음이 스팬 안에
// `<br>` 로 남았다 (아래 V2 —  <ul><li>a<br><code>b<br>c</code></li></ul>).
// 인용 줄은 줄마다 따로 판정돼 줄을 건너는 스팬·강조·링크가 서지 않고 표기 글자가
// 남았다 (아래 V5 —  <blockquote>`b<br>c`</blockquote>).
//
// 판정면은 정제를 거친 DOM 이다. CONTROL 은 대조다 — 코드 스팬 밖의 줄 사이 `<br>` ·
// 항목 경계를 건너는 표기 · 최상위 줄마다 문단은 정제 후 `innerHTML` 그대로다.
const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const count = (text: string | null | undefined, mark: string): number =>
	(text ?? '').split(mark).length - 1;

// 항목 이어짐 — code 1 · code 안 br 0 · code 텍스트.
const ITEM: [string, string, string][] = [
	['V1', '1. a\n       ```\n       const y = 2;\n       ```', 'const y = 2;'],
	['V7', '1. a\n       ```js\n       x\n       ```\n2. b', 'js x '],
	['V8', '- a\n      ```\n      x\n      ```', 'x'],
	['V2', '- a\n  `b\n  c`', 'b c'],
	['V3', '- a\n  ``b\n  c``', 'b c'],
	['V9', '- `a\n  b` 끝', 'a b'],
	['W6', '1. a\n   `b\n   c`\n2. d', 'b c'],
];

// 인용 줄 — 인용 안 요소 수 · 렌더 텍스트에 표기 글자 0.
const QUOTE_CODE: [string, string, string][] = [
	['V5', '> `b\n> c`', 'b c'],
	['W2', '> a\n> `b\n> c` d', 'b c'],
];

// 대조 — 정제 후 innerHTML 그대로.
const CONTROL: [string, string, string][] = [
	['W5', '- a\n  `b`\n  c', '<ul><li>a<br><code>b</code><br>c</li></ul>'],
	['W7', '- `a\n- b`', '<ul><li>`a</li><li>b`</li></ul>'],
	['V4', '`b\nc`', '<p>`b</p><p>c`</p>'],
	['V6', '- a\n  *b\n  c*', '<ul><li>a<br><em>b<br>c</em></li></ul>'],
	['W3', '- [a\n  b](/x)', '<ul><li><a href="/x">a<br>b</a></li></ul>'],
];

describe('줄을 건너는 코드 스팬 안에는 줄 이음이 없다', () => {

	it('모집단이 비어 있지 않다', () => {
		expect(ITEM.length).toBe(7);
		expect(QUOTE_CODE.length).toBe(2);
		expect(CONTROL.length).toBe(5);
	});

	it.each(ITEM)('%s · 항목 이어짐을 건너는 스팬', (_id, markdown, expected) => {
		const el = render(markdown);
		const codes = el.querySelectorAll('code');
		expect(codes).toHaveLength(1);
		expect(el.querySelectorAll('code br')).toHaveLength(0);
		expect(codes[0]?.textContent).toBe(expected);
	});
});

describe('인용 줄을 건너는 인라인도 항목 이어짐과 같게 판정된다', () => {

	it.each(QUOTE_CODE)('%s · 인용 줄을 건너는 코드 스팬', (_id, markdown, expected) => {
		const el = render(markdown);
		const codes = el.querySelectorAll('blockquote code');
		expect(el.querySelectorAll('code')).toHaveLength(1);
		expect(codes).toHaveLength(1);
		expect(el.querySelectorAll('code br')).toHaveLength(0);
		expect(codes[0]?.textContent).toBe(expected);
		expect(count(el.textContent, '`')).toBe(0);
	});

	it('W1 · 인용 줄을 건너는 강조', () => {
		const el = render('> *b\n> c*');
		expect(el.querySelectorAll('blockquote em')).toHaveLength(1);
		expect(count(el.textContent, '*')).toBe(0);
	});

	it('W4 · 인용 줄을 건너는 링크', () => {
		const el = render('> [a\n> b](/x)');
		const links = el.querySelectorAll('blockquote a');
		expect(links).toHaveLength(1);
		expect(links[0]?.getAttribute('href')).toBe('/x');
		expect(count(el.textContent, '](')).toBe(0);
	});
});

describe('대조 — 코드 스팬 밖의 줄 모델은 바뀌지 않는다', () => {

	it.each(CONTROL)('%s', (_id, markdown, expected) => {
		expect(render(markdown).innerHTML).toBe(expected);
	});
});
