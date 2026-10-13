import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 목록 항목 안 줄은 탭·공백을 섞어 들여써도 같은 열이면 같게 렌더된다 (spec
// `markdown-rendering` §동작 19 열 동치 하위 항목).
//
// 판정면은 정제를 거친 DOM 과 그 `innerHTML` 이다 — 독자가 보는 것이다.
//
// 마커 없는 줄의 귀속은 열로 셌지만 본문 걷기는 탭만 또는 공백만 셌다. 그래서 탭과
// 공백을 섞어 들여쓴 줄은 항목에 붙고도 들여쓰기 일부가 본문 앞에 남았고, 남은
// 공백·탭이 다음 판정(인용 `>` · 마커)을 가로막아 표기 문자가 글자로 보였다.
//
// 열 동치의 짝은 열거하지 않고 `toColumnSpaces` 로 도출한다 — 짝을 손으로 적으면
// 짝 쪽의 오타가 동치를 우연히 맞춘다. 대조(K)는 이 셈이 **바꾸지 않는** 것을 잰다.
// 기대 문자열은 열 동치가 들어오기 전의 정제 후 `innerHTML` 그대로다.

const html = (markdown: string): string => sanitizeHtml(markdownToHtml(markdown));

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = html(markdown);
	return el;
};

// 첫 줄을 뺀 각 줄의 줄 머리 `[ \t]*` 를 같은 열의 공백으로 바꾼다. 탭은 다음 4의
// 배수 열까지다 (CommonMark §2.2). 파서의 셈을 부르지 않는다 — 판정 대상과 같은
// 셈으로 짝을 만들면 셈이 틀려도 동치가 맞는다.
const TAB_STOP = 4;
const toColumnSpaces = (markdown: string): string => markdown.split('\n').map((line, i) => {
	if(0 === i) return line;
	const indent = /^[ \t]*/.exec(line)?.[0] ?? '';
	let column = 0;
	for(const c of indent) column += ' ' === c ? 1 : TAB_STOP - column % TAB_STOP;
	return ' '.repeat(column) + line.slice(indent.length);
}).join('\n');

// 섞어 쓴 줄 14 입력 (REQ-20261013-111 P 행 + 바깥 항목 귀속 O 행).
const MIXED = {
	P01: '\t- b\n\n\t  본문',
	P02: '- a\n\t  본문',
	P03: '- a\n  \t본문',
	P04: '- a\n\n  \t본문',
	P05: '\t- b\n\t  > 인용',
	P06: '- a\n \t> 인용',
	P11: '- a\n\n\t  > 인용',
	P13: '- a\n\n \t본문\n- b',
	P14: '1. a\n\t   본문',
	P16: '1. a\n\t - c',
	P17: '- a\n \t- c',
	P18: '1. a\n\t > 인용',
	O1: '1. a\n   - b\n\n \t본문\n2. c',
	O2: '1. a\n   - b\n\n\t > 인용\n2. c',
} as const;

type Row = keyof typeof MIXED;

const BODY: readonly Row[] = ['P01', 'P02', 'P03', 'P04', 'P13', 'P14', 'O1'];
const QUOTE: readonly Row[] = ['P05', 'P06', 'P11', 'P18', 'O2'];
const MARKER: readonly Row[] = ['P16', 'P17'];

// 공백만·탭만 들여쓴 줄 · 열린 항목이 없는 줄 · 최상위 탭 펜스.
const CONTROL: Record<string, readonly [string, string]> = {
	K08: ['1. a\n\t본문', '<ol><li>a<br>본문</li></ol>'],
	K09: ['- a\n    본문', '<ul><li>a<br>본문</li></ul>'],
	K10: ['- a\n\t\t본문', '<ul><li>a<br>본문</li></ul>'],
	K12: ['- a\n  > 인용', '<ul><li>a<blockquote>인용</blockquote></li></ul>'],
	K15: ['- a\n\t> 인용', '<ul><li>a<blockquote>인용</blockquote></li></ul>'],
	K19: ['1. a\n   - c', '<ol><li>a<ul><li>c</li></ul></li></ol>'],
	K20: ['- a\n  - c', '<ul><li>a<ul><li>c</li></ul></li></ul>'],
	K21: ['  hello', '<p>  hello</p>'],
	K22: ['\t```\n\tcode\n\t```', '<p>\t```</p><p>\tcode</p><p>\t```</p>'],
};

// `needle` 을 담은 텍스트 노드 전부.
const textNodesContaining = (root: Node, needle: string): string[] => {
	const out: string[] = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for(let n = walker.nextNode(); null !== n; n = walker.nextNode()) {
		if((n.nodeValue ?? '').includes(needle)) out.push(n.nodeValue ?? '');
	}
	return out;
};

describe('목록 항목 안 섞어 쓴 들여쓰기의 열 동치', () => {

	it('변환 함수는 탭을 탭 정지까지의 공백으로 바꾸고 첫 줄은 두며, 14 입력 모두를 바꾼다', () => {
		expect(toColumnSpaces('- a\n\t  본문')).toBe('- a\n      본문');
		expect(toColumnSpaces('- a\n \t- c')).toBe('- a\n    - c');
		expect(toColumnSpaces('\t- b\n\t > x')).toBe('\t- b\n     > x');
		// 짝이 입력과 같으면 동치는 공허하다.
		for(const markdown of Object.values(MIXED)) expect(toColumnSpaces(markdown)).not.toBe(markdown);
	});

	it.each(Object.keys(MIXED) as Row[])('%s · 같은 열의 공백만 입력과 산출이 문자열로 같다', (row) => {
		const markdown = MIXED[row];
		expect(html(markdown)).toBe(html(toColumnSpaces(markdown)));
	});

	it.each(BODY)('%s · 본문 앞에 공백·탭이 남지 않는다', (row) => {
		const texts = textNodesContaining(render(MIXED[row]), '본문');
		expect(texts.length).toBeGreaterThan(0);
		for(const t of texts) expect(t).not.toMatch(/^[ \t]/);
	});

	it.each(QUOTE)('%s · 걷은 뒤의 `>` 는 항목 안 인용이고 글자로 보이지 않는다', (row) => {
		const el = render(MIXED[row]);
		const quotes = el.querySelectorAll('li blockquote');
		expect(quotes).toHaveLength(1);
		expect(quotes[0]?.textContent).toContain('인용');
		expect(el.textContent).not.toContain('>');
	});

	it.each(MARKER)('%s · 걷은 뒤의 마커는 중첩 목록이고 마커 표기는 보이지 않는다', (row) => {
		const el = render(MIXED[row]);
		expect(el.querySelectorAll('li li').length).toBeGreaterThanOrEqual(1);
		expect(el.querySelector('li li')?.textContent).toBe('c');
		expect(el.textContent).not.toContain('- c');
	});

	it.each(Object.keys(CONTROL))('%s · (대조) 공백만·탭만 들여쓴 줄과 열린 항목 밖 줄의 산출은 그대로다', (row) => {
		const [markdown, expected] = CONTROL[row] as readonly [string, string];
		expect(html(markdown)).toBe(expected);
	});
});
