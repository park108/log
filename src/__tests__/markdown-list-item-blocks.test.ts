import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 목록 항목·인용 안의 블록 (spec `markdown-rendering` §동작 19 · 3 의 인용 안 펜스).
//
// 판정면은 정제를 거친 DOM 이다 — 독자가 보는 것이다. 입력은 백틱이 섞여 표 칸에
// 적으면 모호하므로 JS 문자열 리터럴 그대로 적는다.

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

// 인용 안의 펜스 줄은 인용 내용이 코드 블록이 되는 자리다 (§3).
//
// 이 판정이 없던 동안 인용 패스는 펜스 줄을 평범한 인용 줄로 이어 붙였다. 최상위
// 펜스 패스는 인용 패스보다 먼저 돌아 `>` 로 시작하는 줄을 보지 못한다. 그래서
//   `> ```\n> code\n> ```` → `<blockquote>```<br />code<br />```</blockquote>`
// 로 펜스 표기가 글자로 남고, 코드 줄 `**x**` 가 굵게 처리됐다.
//
// A6 · A7 은 대조다. A6 은 최상위의 "펜스가 아닌 줄" (§21) 과 같은 판정이 인용
// 안에서도 나오는지를 잰다 — 판정이 파서 안에 하나라는 것의 산출 쪽 증거다.
// A7 은 **구조로만** 잰다 (평문 줄 사이 구분 표기에 무감해야 한다).
const QUOTE_FENCE = {
	A1: '> ```\n> code\n> ```',
	A2: '> 앞\n> ```\n> **x**\n> ```\n> 뒤',
	A3: '> ~~~kotlin\n> val a = 1\n> ~~~',
	A4: '> ```\n> 열린 채 끝남',
	A5: '> > ```\n> > x\n> > ```',
	A6: '> ```인라인``` 문장',
	A7: '> 앞\n> 뒤',
} as const;

describe('인용 안 펜스 코드 블록', () => {

	it('A1 · 인용 안 펜스는 인용 안의 코드 블록이고 펜스 표기는 글자로 남지 않는다', () => {
		const el = render(QUOTE_FENCE.A1);
		expect(el.querySelectorAll('blockquote')).toHaveLength(1);
		const pres = el.querySelectorAll('blockquote pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('code');
		expect(el.textContent).not.toContain('`');
	});

	it('A2 · 인용 안 코드 줄은 인라인 처리를 받지 않고 앞뒤 인용 글은 남는다', () => {
		const el = render(QUOTE_FENCE.A2);
		const pres = el.querySelectorAll('blockquote pre');
		expect(pres).toHaveLength(1);
		expect(el.querySelectorAll('strong')).toHaveLength(0);
		expect(pres[0]?.textContent).toBe('**x**');
		expect(el.textContent).toContain('앞');
		expect(el.textContent).toContain('뒤');
	});

	it('A3 · 인용 안 물결 펜스도 코드 블록이다', () => {
		const el = render(QUOTE_FENCE.A3);
		const pres = el.querySelectorAll('blockquote pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('val a = 1');
		expect(el.textContent).not.toContain('~');
	});

	it('A4 · 닫히지 않은 인용 안 펜스는 인용과 함께 닫힌다', () => {
		const html = markdownToHtml(QUOTE_FENCE.A4);
		const el = render(QUOTE_FENCE.A4);
		const pres = el.querySelectorAll('blockquote pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('열린 채 끝남');
		// blockquote 가 pre 를 감싼 채 닫힌다 — 산출 문자열에서도 짝이 맞는다.
		expect(el.children).toHaveLength(1);
		expect(el.children[0]?.tagName).toBe('BLOCKQUOTE');
		expect(el.children[0]?.lastElementChild?.tagName).toBe('PRE');
		expect(html.split('<pre>').length).toBe(html.split('</pre>').length);
		expect(html.indexOf('</pre>')).toBeLessThan(html.lastIndexOf('</blockquote>'));
	});

	it('A5 · 중첩 인용 안 펜스는 안쪽 인용의 코드 블록이다', () => {
		const el = render(QUOTE_FENCE.A5);
		expect(el.querySelectorAll('blockquote blockquote pre')).toHaveLength(1);
		expect(el.textContent).not.toContain('`');
	});

	it('A6 · 대조 — 정보 문자열에 백틱이 든 줄은 인용 안에서도 펜스가 아니다', () => {
		const el = render(QUOTE_FENCE.A6);
		expect(el.querySelectorAll('pre')).toHaveLength(0);
		expect(el.querySelectorAll('blockquote')).toHaveLength(1);
		const codes = el.querySelectorAll('code');
		expect(codes).toHaveLength(1);
		expect(codes[0]?.textContent).toBe('인라인');
	});

	it('A7 · 대조 — 펜스 없는 인용은 코드 블록을 만들지 않는다', () => {
		const el = render(QUOTE_FENCE.A7);
		expect(el.querySelectorAll('pre')).toHaveLength(0);
		expect(el.querySelectorAll('blockquote')).toHaveLength(1);
		expect(el.textContent).toBe('앞뒤');
	});
});
