import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 표 구분선의 정렬 표기는 그 열의 정렬로 보인다 (spec `markdown-rendering` §동작 22).
//
// **판정면은 계산된 스타일이다.** 실제 `typography.css` 를 `<style>` 로 넣은 문서에
// `sanitizeHtml(markdownToHtml(x))` 를 붙이고 `getComputedStyle(cell).textAlign` 을 잰다.
// 정렬이 독자에게 닿는 길은 파서 class → 정제 통과 → 전역 CSS 셋이다. class 문자열만
// 재면 CSS 규칙이 빠진 구현에서도 초록이고, `align` 속성은 전역 `th, td` 규칙에 져서
// 정제를 넓혀 통과시켜도 독자는 왼쪽 정렬을 본다.
//
// class **이름**은 재지 않는다 — 이름은 수단이다. 정제 전후 class 집합이 같은지만 잰다.

const TABLE = {
	T1: '| 왼 | 가운데 | 오른 |\n|:--|:-:|--:|\n| a | b | c |',
	T2: '| 이름 | 값 |\n|---|---|\n| a | 1 |',
	T3: '| a | b |\n|---|--:|\n| 1 |\n| 1 | 2 | 3 |',
	T4: '| a |\n|:--|\n| 1 |',
	// T3 의 짧은 행은 정렬 없는 열만 남아 "짧은 행은 정렬을 버린다" 는 구현을 못 잡는다.
	// 정렬된 열이 짧은 행 안에 들어오는 표를 따로 둔다.
	T5: '| a | b |\n|--:|:-:|\n| 1 |',
} as const;

const T2_HTML = '<table><thead><tr><th>이름</th><th>값</th></tr></thead><tbody><tr><td>a</td><td>1</td></tr></tbody></table>';

const CSS = readFileSync(path.join(process.cwd(), 'src/styles/typography.css'), 'utf-8');

let style: HTMLStyleElement;

beforeAll(() => {
	style = document.createElement('style');
	style.textContent = CSS;
	document.head.appendChild(style);
});

afterAll(() => {
	style.remove();
});

afterEach(() => {
	document.body.innerHTML = '';
});

const mount = (html: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = html;
	document.body.appendChild(el);
	return el;
};

const render = (markdown: string): HTMLDivElement =>
	mount(sanitizeHtml(markdownToHtml(markdown)));

const align = (cell: Element | null | undefined): string => {
	if(!cell) throw new Error('셀이 없다');
	return getComputedStyle(cell).textAlign;
};

const row = (el: HTMLElement, selector: string): Element[] =>
	[...(el.querySelector(selector)?.children ?? [])];

const classSets = (el: HTMLElement): string[][] =>
	[...el.querySelectorAll('th, td')].map((cell) => [...cell.classList].sort());

describe('표 열 정렬', () => {

	it('판정면 전제 · 실제 CSS 가 문서에 적용돼 맨 셀은 왼쪽이다', () => {
		const el = render(TABLE.T2);
		expect(el.querySelectorAll('td')).toHaveLength(2);
		expect(align(el.querySelector('td'))).toBe('left');
	});

	it('T1 · 왼쪽 · 가운데 · 오른쪽 표기가 그 열의 th 와 td 정렬이다', () => {
		const el = render(TABLE.T1);
		const head = row(el, 'thead tr');
		const body = row(el, 'tbody tr');

		expect(head).toHaveLength(3);
		expect(body).toHaveLength(3);

		expect(head.map(align)).toEqual(['left', 'center', 'right']);
		expect(body.map(align)).toEqual(['left', 'center', 'right']);
	});

	it('T1 · 정렬 표지는 정제 전후 같은 class 로 남는다', () => {
		const raw = markdownToHtml(TABLE.T1);
		const before = classSets(mount(raw));
		const after = classSets(mount(sanitizeHtml(raw)));

		expect(before).toHaveLength(6);
		expect(after).toEqual(before);
	});

	it('T2 · 정렬 표기가 없는 표의 산출은 종전 그대로다', () => {
		expect(markdownToHtml(TABLE.T2)).toBe(T2_HTML);
	});

	it('T3 · 열 대응은 위치다 — 본문 행의 셀 수가 머리 행과 달라도', () => {
		const el = render(TABLE.T3);
		const head = row(el, 'thead tr');
		const rows = [...el.querySelectorAll('tbody tr')];

		expect(head.map(align)).toEqual(['left', 'right']);
		expect(rows).toHaveLength(2);

		const short = [...(rows[0]?.children ?? [])];
		const long = [...(rows[1]?.children ?? [])];

		expect(short).toHaveLength(1);
		expect(align(short[0])).toBe('left');

		expect(long).toHaveLength(3);
		expect(long.map(align)).toEqual(['left', 'right', 'left']);
	});

	it('T4 · 명시적 왼쪽은 왼쪽이다', () => {
		const el = render(TABLE.T4);
		expect(align(el.querySelector('th'))).toBe('left');
		expect(align(el.querySelector('td'))).toBe('left');
	});

	it('T5 · 머리 행보다 짧은 본문 행도 그 위치의 정렬을 받는다', () => {
		const el = render(TABLE.T5);
		const head = row(el, 'thead tr');
		const body = row(el, 'tbody tr');

		expect(head.map(align)).toEqual(['right', 'center']);
		expect(body).toHaveLength(1);
		expect(align(body[0])).toBe('right');
	});

	it.each(Object.entries(TABLE))('%s · 정제 뒤 DOM 에 style · align 속성이 없다', (_id, markdown) => {
		const el = render(markdown);
		expect(el.querySelectorAll('table')).toHaveLength(1);
		expect(el.querySelectorAll('[style]')).toHaveLength(0);
		expect(el.querySelectorAll('[align]')).toHaveLength(0);
	});
});
