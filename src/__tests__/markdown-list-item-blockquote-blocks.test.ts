import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 목록 항목 안 인용의 블록 문법 (spec `markdown-rendering` §동작 3 하위 항목 ·
// §수용 기준 "항목 안 인용의 블록 문법").
//
// 줄 머리 인용(`> …`)은 안에서 펜스·제목·목록이 동작했지만, 목록 항목의 이어짐으로
// 들어간 인용은 이어짐 패스가 표식 문자로 항목 본문에 이어 붙이기만 해서 블록
// 판정을 한 번도 받지 않았다. 그래서
//   `- a\n  > ```\n  > x\n  > ```` → `<li>a<blockquote>``<code><br>x<br></code>``</blockquote></li>`
// 로 펜스 표기가 글자로 남았고, `> # 제목` · `> - b` 도 글자였다.
//
// 판정면은 정제를 거친 DOM 이다 — 독자가 보는 것이다. Q6 · Q7 은 대조다 — 블록
// 문법 없는 항목 안 인용과 줄 머리 인용 펜스의 산출은 **문자열 전체**로 잰다.
const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const ITEM_QUOTE = {
	Q1: '- a\n  > ```\n  > x\n  > ```',
	Q2: '- a\n\n  > ```\n  > x\n  > ```\n- b',
	Q3: '- a\n  > ```\n  > **x**\n  > ```',
	Q4: '- a\n  > # 제목',
	Q5: '- a\n  > - b\n  > - c',
	Q6: '- a\n  > 인용문',
	Q7: '> ```\n> code\n> ```',
} as const;

describe('목록 항목 안 인용의 블록 문법', () => {

	it('Q1 · 항목 안 인용의 펜스는 그 인용 안의 코드 블록이고 펜스 표기는 글자로 남지 않는다', () => {
		const el = render(ITEM_QUOTE.Q1);
		const pres = el.querySelectorAll('li blockquote pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('x');
		expect(el.textContent).not.toContain('`');
	});

	it('Q2 · 앞에 빈 줄이 있어도 같고 목록은 하나로 이어진다', () => {
		const el = render(ITEM_QUOTE.Q2);
		const pres = el.querySelectorAll('li blockquote pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('x');
		expect(el.textContent).not.toContain('`');
		expect(el.querySelectorAll('ul')).toHaveLength(1);
		expect(el.querySelectorAll('li')).toHaveLength(2);
	});

	it('Q3 · 항목 안 인용의 코드 줄은 인라인 처리를 받지 않는다', () => {
		const el = render(ITEM_QUOTE.Q3);
		const pres = el.querySelectorAll('li blockquote pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('**x**');
		expect(el.querySelectorAll('strong')).toHaveLength(0);
	});

	it('Q4 · 항목 안 인용의 ATX 제목은 그 인용 안의 제목이다', () => {
		const el = render(ITEM_QUOTE.Q4);
		const headings = el.querySelectorAll('li blockquote h1');
		expect(headings).toHaveLength(1);
		expect(headings[0]?.textContent).toBe('제목');
	});

	it('Q5 · 항목 안 인용의 목록은 그 인용 안의 목록이지 바깥 목록의 항목이 아니다', () => {
		const el = render(ITEM_QUOTE.Q5);
		expect(el.querySelectorAll('li blockquote ul li')).toHaveLength(2);
		expect(el.querySelectorAll(':scope > ul')).toHaveLength(1);
	});

	it('Q6 · 대조 — 블록 문법 없는 항목 안 인용의 산출은 바뀌지 않는다', () => {
		expect(markdownToHtml(ITEM_QUOTE.Q6)).toBe('<ul><li>a<blockquote>인용문</blockquote></li></ul>');
	});

	it('Q7 · 대조 — 줄 머리 인용 안 펜스의 산출은 바뀌지 않는다', () => {
		expect(markdownToHtml(ITEM_QUOTE.Q7)).toBe('<blockquote><pre>code<br /></pre></blockquote>');
	});
});
