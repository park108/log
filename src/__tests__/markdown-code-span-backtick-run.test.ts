import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 코드 스팬 백틱 런 길이 (spec `markdown-rendering` §동작 26 ·
// §수용 기준 "코드 스팬 백틱 런 길이 (26)").
//
// 스캔의 코드 스팬 갈래가 홑 백틱 한 쌍만 알았다. 그래서 겹 백틱으로 연 스팬은
// 바깥 백틱이 글자로 남고, 스팬 안에 백틱을 쓰려던 글은 엉뚱한 자리에서 닫혔다 —
//   ``a ` b`` 끝  →  <p>`<code>a </code> b`` 끝</p>
// 짝 없는 런은 그 가운데 백틱이 홑 스팬을 열었다 (``a` 끝 → `<code>a</code> 끝).
//
// 판정면은 정제를 거친 DOM 이다 — `code` 수 · `code` 텍스트 · 렌더 텍스트의 백틱 수.
// K1 · K2 는 대조다 — 홑 백틱 스팬과 스팬 안 백슬래시의 산출은 문자열 전체로 잰다.
const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const backticks = (text: string | null | undefined): number =>
	(text ?? '').split('').filter((c) => '`' === c).length;

const SPAN = {
	S1: '``a ` b`` 끝',
	S2: '```인라인``` 문장',
	S3: '`` `x` ``',
	S4: '``a` 끝',
	S5: '> ``a ` b``',
	S6: '- ``a ` b``',
	S7: '| h |\n|---|\n| ``a ` b`` |',
	S8: '``my_var_name``',
	K1: '`a` 끝',
	K2: '`a\\` b',
} as const;

describe('코드 스팬 백틱 런 길이', () => {

	it('S1 · 겹 백틱으로 연 스팬은 같은 길이의 런에서 닫히고 안의 홑 백틱은 글자다', () => {
		const el = render(SPAN.S1);
		const codes = el.querySelectorAll('code');
		expect(codes).toHaveLength(1);
		expect(codes[0]?.textContent).toBe('a ` b');
		expect(backticks(el.textContent)).toBe(1);
	});

	it('S2 · 세 백틱 런으로 연 스팬 — 여닫는 백틱은 렌더 텍스트에 남지 않는다', () => {
		const el = render(SPAN.S2);
		const codes = el.querySelectorAll('code');
		expect(codes).toHaveLength(1);
		expect(codes[0]?.textContent).toBe('인라인');
		expect(backticks(el.textContent)).toBe(0);
	});

	it('S3 · 내용이 공백으로 시작하고 끝나면 앞뒤 한 칸씩 걷는다', () => {
		const el = render(SPAN.S3);
		const codes = el.querySelectorAll('code');
		expect(codes).toHaveLength(1);
		expect(codes[0]?.textContent).toBe('`x`');
	});

	it('S4 · 같은 길이의 닫는 런이 없는 여는 런은 글자다', () => {
		const el = render(SPAN.S4);
		expect(el.querySelectorAll('code')).toHaveLength(0);
		expect(el.textContent).toBe(SPAN.S4);
	});

	it('S5 · 인용 안에서도 같은 판정이다', () => {
		const el = render(SPAN.S5);
		const codes = el.querySelectorAll('blockquote code');
		expect(el.querySelectorAll('code')).toHaveLength(1);
		expect(codes).toHaveLength(1);
		expect(codes[0]?.textContent).toBe('a ` b');
		expect(backticks(el.textContent)).toBe(1);
	});

	it('S6 · 목록 항목 안에서도 같은 판정이다', () => {
		const el = render(SPAN.S6);
		const codes = el.querySelectorAll('li code');
		expect(el.querySelectorAll('code')).toHaveLength(1);
		expect(codes).toHaveLength(1);
		expect(codes[0]?.textContent).toBe('a ` b');
		expect(backticks(el.textContent)).toBe(1);
	});

	it('S7 · 표 칸 안에서도 같은 판정이다', () => {
		const el = render(SPAN.S7);
		const cells = el.querySelectorAll('td');
		expect(cells).toHaveLength(1);
		const codes = cells[0]?.querySelectorAll('code');
		expect(codes).toHaveLength(1);
		expect(codes?.[0]?.textContent).toBe('a ` b');
		expect(backticks(cells[0]?.textContent)).toBe(1);
	});

	it('S8 · 겹 백틱 스팬 안의 구분자도 강조가 아니다 (15 보호 축)', () => {
		const el = render(SPAN.S8);
		const codes = el.querySelectorAll('code');
		expect(codes).toHaveLength(1);
		expect(codes[0]?.textContent).toBe('my_var_name');
		expect(el.querySelectorAll('em')).toHaveLength(0);
	});

	it('K1 · 대조 — 홑 백틱 스팬의 산출은 바뀌지 않는다', () => {
		expect(markdownToHtml(SPAN.K1)).toBe('<p><code>a</code> 끝</p>');
	});

	it('K2 · 대조 — 스팬 안 백슬래시는 이스케이프가 아니다', () => {
		expect(markdownToHtml(SPAN.K2)).toBe('<p><code>a\\</code> b</p>');
	});
});
