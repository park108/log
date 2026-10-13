import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 문자 사이에 공백을 둔 가로줄 (spec `markdown-rendering` §동작 29 ·
// §수용 기준 "공백 낀 가로줄 (29)").
//
// 산문에서 장면 전환으로 흔히 쓰는 `* * *` 가 선 대신 글머리표 하나와 글자 `* *` 로
// 보였다. 목록 바로 뒤에 쓰면 그 목록의 항목이 하나 더 생겼다. 가로줄 판정이 같은 문자
// 3개 이상의 **연속**만 받아 문자 사이 공백을 받지 않았다 (CommonMark §4.1 은 받는다).
//
// 판정면은 정제를 거친 DOM 과 정제 후 `innerHTML` 이다 — 독자가 보는 것이다. `hr` 수만
// 세면 표기가 글자로 함께 남는 산출을 놓친다 (REQ-135 NFR-02). 그래서 렌더 텍스트의
// 표기 런(`* *` · `- -` · `_ _`) 0 을 함께 잰다.
const html = (markdown: string): string => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el.innerHTML;
};

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

// (가) 의 기대값은 **변환 함수로** 도출한다 — 파서의 판정을 부르지 않는다.
//
// 줄 머리 `> ` 접두 뒤, 0–3칸 들여쓰기 뒤 같은 문자 3개 이상이고 문자 사이에 공백·탭이
// 하나라도 있는 줄 → 같은 접두·들여쓰기의 `***`. `***` 는 지금도 가로줄이고 밑줄이
// 아니므로 밑줄식 제목(2)과 얽히지 않는다.
const SPACED = /^((?:> ?)*)( {0,3})([-*_])((?:[ \t]*\3){2,})[ \t]*$/;

const toStars = (md: string): string => md.split('\n').map((line) => {
	const m = SPACED.exec(line);
	if(!m || !/[ \t]/.test((m[3] ?? '') + (m[4] ?? ''))) return line;
	return (m[1] ?? '') + (m[2] ?? '') + '***';
}).join('\n');

// (가) 열린 목록 항목 밖의 자리 (최상위 · 인용 안 · 목록이 끝난 뒤) — 21행.
// html(md) === html(toStars(md)) · 렌더 텍스트 표기 런 0.
const OUTSIDE: Record<string, string> = {
	E51: ' - - -',
	E52: ' **  * ** * ** * **',
	E53: '-     -      -      -',
	E54: '- - - -    ',
	E60: '* Foo\n* * *\n* Bar',
	T1: '* * *',
	T2: '- - -',
	T3: '_ _ _',
	T4: '*  *  *',
	T5: ' * * *',
	T6: '* * * *',
	T7: '-- -',
	T12: '> * * *',
	T13: '- a\n\n* * *',
	T14: '문단\n* * *',
	T15: '문단\n- - -',
	T17: '앞 문단\n\n* * *\n\n뒤 문단',
	TAB: '*\t*\t*',
	I3: '   * * *',
	L1: '- a\n- - -',
	L2: '- ---',
};

const OUTSIDE_RUN = /\* \*|- -|_ _/;

// (나) 목록 항목의 내용이 가로줄 꼴인 자리 — 5행.
// 'li hr' 1 · ':scope > hr' 0 · 렌더 텍스트 표기 런 0.
const INSIDE: Record<string, string> = {
	E61: '- Foo\n- * * *',
	T16: '- a\n\n  * * *',
	S1: '- ***',
	S2: '1. ***',
	S3: '- a\n\n  ***',
};

const INSIDE_RUN = /\* \*|\*\*\*/;

// (다) 바뀌지 않는 산출 — 13행. 정제 후 innerHTML 그대로 (HEAD=7849dc7).
// (예제 번호는 CommonMark 0.31.2 §4.1 — 43 · 47 · 50 · 56 · 57 · 58 · 59.)
const CONTROL: [string, string][] = [
	['***', '<hr>'],
	['***   ', '<hr>'],
	['---  ', '<hr>'],
	['_ _ _ 글', '<p>_ _ _ 글</p>'],
	['***\n---\n___', '<hr><hr><hr>'],
	[' ***\n  ***\n   ***', '<hr><hr><hr>'],
	['_____________________________________', '<hr>'],
	[' *-*', '<p> <em>-</em></p>'],
	['- foo\n***\n- bar', '<ul><li>foo</li></ul><hr><ul><li>bar</li></ul>'],
	['Foo\n***\nbar', '<p>Foo</p><hr><p>bar</p>'],
	['Foo\n---\nbar', '<h2>Foo</h2><p>bar</p>'],
	['문단\n---', '<h2>문단</h2>'],
	['    ***', '<hr>'],
];

describe('공백 낀 가로줄 — 무판정 가드', () => {

	it('(가) 21행 전부를 toStars 가 바꾸고 (다) 13행은 하나도 바꾸지 않는다', () => {
		const outside = Object.values(OUTSIDE);
		expect(outside).toHaveLength(21);
		for(const md of outside) expect(toStars(md)).not.toBe(md);

		expect(CONTROL).toHaveLength(13);
		for(const [md] of CONTROL) expect(toStars(md)).toBe(md);

		expect(Object.keys(INSIDE)).toHaveLength(5);
	});
});

describe('(가) 목록 항목 밖의 공백 낀 가로줄은 같은 자리의 *** 와 같은 산출이다', () => {

	it.each(Object.entries(OUTSIDE))('%s · html(md) === html(toStars(md)) · hr 실재 · 표기 런 0', (_, md) => {
		expect(html(md)).toBe(html(toStars(md)));

		const el = render(md);
		expect(el.querySelectorAll('hr').length).toBeGreaterThan(0);
		expect(el.textContent ?? '').not.toMatch(OUTSIDE_RUN);
	});
});

describe('(나) 목록 항목의 내용이 가로줄 꼴이면 그 항목 안 hr 이다', () => {

	it.each(Object.entries(INSIDE))('%s · li 안 hr 1 · 최상위 hr 0 · 표기 런 0', (_, md) => {
		const el = render(md);
		expect(el.querySelectorAll('li hr')).toHaveLength(1);
		expect(el.querySelectorAll(':scope > hr')).toHaveLength(0);
		expect(el.textContent ?? '').not.toMatch(INSIDE_RUN);
	});

	it('E61 · 가로줄은 둘째 항목 안에 있다 (CommonMark 예제 61)', () => {
		const items = render(INSIDE.E61 ?? '').querySelectorAll('li');
		expect(items).toHaveLength(2);
		expect(items[0]?.querySelectorAll('hr')).toHaveLength(0);
		expect(items[1]?.querySelectorAll('hr')).toHaveLength(1);
	});

	it.each(['T16', 'S3'])('%s · 빈 줄 뒤 내용 열의 가로줄은 a 의 항목 안에 있다 (19 귀속)', (key) => {
		const items = render(INSIDE[key] ?? '').querySelectorAll('li');
		expect(items).toHaveLength(1);
		expect(items[0]?.textContent).toBe('a');
		expect(items[0]?.querySelectorAll('hr')).toHaveLength(1);
	});
});

describe('공백 낀 가로줄 — 바뀌지 않는 산출 (대조)', () => {

	it.each(CONTROL)('%j · 산출 불변', (md, expected) => {
		expect(html(md)).toBe(expected);
	});
});
