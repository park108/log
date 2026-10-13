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

// 목록 항목의 내용 열까지 들여쓴 블록은 그 항목 안에 있다 (§19).
//
// 이 판정이 없던 동안 번호 목록 항목 사이에 코드 블록이나 둘째 문단을 넣으면
// 목록이 끊기고 **번호가 되감겼다** — 독자는 `1.` 을 두 번 봤다:
//   `1. 설치\n\n   ```\n   npm i\n   ```\n2. 실행`
//     → `<ol><li>설치</li></ol><p></p><pre>   npm i<br /></pre><ol><li>실행</li></ol>`
// 이어짐 패스가 빈 줄을 항목 경계로만 봤고, 펜스 패스가 목록 패스보다 먼저 돌아
// 항목 안 펜스를 비-목록 노드로 만들었다.
//
// 내용 열 = 마커 폭 + 뒤따르는 공백 수 (`- `→2 · `1. `→3 · `10. `→4).
// B5 · B6 · B7 은 대조다 — 산출 문자열 **전체**로 잰다. B5 는 빈 줄 경계,
// B6 은 내용 열 미만, B7 은 마커 줄의 중첩 깊이(§7)가 내용 열과 별개라는 것이다.
// 나머지는 정제를 거친 DOM 의 **구조**로 잰다 (항목 안 줄 구분 표기에 무감해야 한다).
// B12 는 코드 블록 **뒤**의 문단이다 — 코드 블록 다음에는 이어 붙일 문단이 없어
// 그 항목에 새 문단을 여는 경로가 따로 있다.
const ITEM_BLOCKS = {
	B1: '1. 설치\n\n   ```\n   npm i\n   ```\n2. 실행',
	B2: '1. 설치\n   ```\n   npm i\n   ```\n2. 실행',
	B3: '- 첫 문단\n\n  둘째 문단\n- 다음 항목',
	B4: '10. 열\n\n    본문\n11. 열하나',
	B5: '1. 첫째\n\n본문',
	B6: '1. 첫째\n\n  본문',
	B7: '1. a\n  - b',
	B9: '- 항목\n\n  ```\n    들여쓴 코드\n  ```',
	B11: '10. 열\n    ```\n    x\n    ```\n11. 열하나',
	B12: '1. 설치\n   ```\n   npm i\n   ```\n   그리고 실행\n2. 다음',
} as const;

describe('목록 항목 내용 열 블록', () => {

	it('B1 · 빈 줄 뒤 내용 열까지 들여쓴 펜스는 그 항목의 코드 블록이고 번호는 되감기지 않는다', () => {
		const el = render(ITEM_BLOCKS.B1);
		expect(el.querySelectorAll('ol')).toHaveLength(1);
		const items = el.querySelectorAll('li');
		expect(items).toHaveLength(2);
		expect(el.querySelectorAll('pre')).toHaveLength(1);
		const pre = items[0]?.querySelector('pre');
		expect(pre).not.toBeNull();
		expect(pre?.textContent).toMatch(/^npm i/);
	});

	it('B2 · 빈 줄 없이 이어진 펜스도 같다', () => {
		const el = render(ITEM_BLOCKS.B2);
		expect(el.querySelectorAll('ol')).toHaveLength(1);
		const items = el.querySelectorAll('li');
		expect(items).toHaveLength(2);
		expect(el.querySelectorAll('pre')).toHaveLength(1);
		const pre = items[0]?.querySelector('pre');
		expect(pre).not.toBeNull();
		expect(pre?.textContent).toMatch(/^npm i/);
	});

	it('B3 · 빈 줄 뒤 내용 열까지 들여쓴 문단은 그 항목 안이고 들여쓰기는 남지 않는다', () => {
		const el = render(ITEM_BLOCKS.B3);
		expect(el.querySelectorAll('ul')).toHaveLength(1);
		const items = el.querySelectorAll('li');
		expect(items).toHaveLength(2);
		expect(items[0]?.textContent).toContain('둘째 문단');
		expect(items[0]?.textContent).not.toMatch(/\s둘째/);
	});

	it('B4 · 마커 폭이 넓으면 내용 열도 넓다 (`10. `→4)', () => {
		const el = render(ITEM_BLOCKS.B4);
		expect(el.querySelectorAll('ol')).toHaveLength(1);
		const items = el.querySelectorAll('li');
		expect(items).toHaveLength(2);
		expect(items[0]?.textContent).toContain('본문');
	});

	it('B5 · 대조 — 빈 줄 뒤 들여쓰지 않은 문단에서 목록은 끝난다', () => {
		expect(markdownToHtml(ITEM_BLOCKS.B5)).toBe('<ol><li>첫째</li></ol><p></p><p>본문</p>');
	});

	it('B6 · 대조 — 빈 줄 뒤 내용 열 미만 문단에서 목록은 끝난다', () => {
		expect(markdownToHtml(ITEM_BLOCKS.B6)).toBe('<ol><li>첫째</li></ol><p></p><p>  본문</p>');
	});

	it('B7 · 대조 — 마커 줄의 중첩 깊이는 내용 열로 판정하지 않는다', () => {
		expect(markdownToHtml(ITEM_BLOCKS.B7)).toBe('<ol><li>a<ul><li>b</li></ul></li></ol>');
	});

	it('B9 · 항목 안 코드 줄은 내용 열까지만 걷히고 그 너머의 들여쓰기는 남는다', () => {
		const el = render(ITEM_BLOCKS.B9);
		const pres = el.querySelectorAll('li pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('  들여쓴 코드');
	});

	it('B11 · 최상위에선 펜스가 아닌 4칸 펜스도 내용 열을 걷으면 그 항목의 코드 블록이다', () => {
		const el = render(ITEM_BLOCKS.B11);
		expect(el.querySelectorAll('ol')).toHaveLength(1);
		const items = el.querySelectorAll('li');
		expect(items).toHaveLength(2);
		expect(el.querySelectorAll('pre')).toHaveLength(1);
		const pre = items[0]?.querySelector('pre');
		expect(pre).not.toBeNull();
		expect(pre?.textContent).toBe('x');
	});

	it('B12 · 항목 안 코드 블록 뒤 내용 열까지 들여쓴 문단도 그 항목 안이다', () => {
		const el = render(ITEM_BLOCKS.B12);
		expect(el.querySelectorAll('ol')).toHaveLength(1);
		const items = el.querySelectorAll('li');
		expect(items).toHaveLength(2);
		expect(items[0]?.querySelector('pre')).not.toBeNull();
		expect(items[0]?.textContent).toContain('그리고 실행');
		expect(items[0]?.textContent).not.toMatch(/\s그리고/);
		expect(el.querySelectorAll('p')).toHaveLength(0);
	});
});
