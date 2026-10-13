import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 종류가 두 번 이상 바뀌는 목록 중첩 (spec `markdown-rendering` §동작 7 하위 항목).
//
// 판정면은 둘이다. 구조(최상위 목록 수 · 항목의 자손 관계 · 귀속 블록 · 맨 글자)는
// 정제를 거친 DOM 에서 잰다 — 독자가 보는 것이다. 목록 태그 짝은 **정제 전**
// `markdownToHtml` 문자열에서 잰다 — HTML 파서의 오류 복구가 구조를 맞춰 주는 꼴
// (`1. a\n   - b\n     - c` 의 원시 꼬리 `…</li></ol></li></ul>`)은 DOM 만 재면 안 보인다.
//
// 빚(`</li>` 미루기)을 한 겹만 들던 동안 셋째 단은 새 최상위 목록으로 끊겼다. 독자는
// `ol → ul → ol` 에서 `1.` 을 두 번 봤고, 그 자리에 귀속된 `본문` 은 들어갈 항목이 이미
// 닫혀 최상위 맨 글자가 됐다.

const ALT = {
	A1: '- a\n  1. b\n     - c',
	A2: '1. a\n   - b\n     1. c',
	A6: '- a\n  1. b\n     - c\n- d',
	A7: '1. a\n   - b\n     1. c\n2. d',
	A8: '- a\n  1. b\n     - c\n       1. e',
	A3: '- a\n  1. b\n     - c\n\n  본문\n- d',
	A4: '- a\n  1. b\n     - c\n\n     본문\n- d',
	A5: '1. a\n   - b\n     1. c\n\n   본문\n2. d',
} as const;

// 산출 불변 대조 — 기대값은 이 변경 전(HEAD=b1d1e4c)의 정제 후 innerHTML 그대로다.
// 같은 종류 3단 둘 · 2단 교대 셋 · 셋째 단이 둘째와 같은 종류인 꼴 둘.
const CONTROL = {
	C1: ['- a\n  - b\n    - c', '<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul>'],
	C5: ['1. a\n   1. b\n      1. c', '<ol><li>a<ol><li>b<ol><li>c</li></ol></li></ol></li></ol>'],
	C2: ['- a\n  1. b', '<ul><li>a<ol><li>b</li></ol></li></ul>'],
	C6: ['1. a\n   - b', '<ol><li>a<ul><li>b</li></ul></li></ol>'],
	C7: ['1. a\n   - b\n2. c', '<ol><li>a<ul><li>b</li></ul></li><li>c</li></ol>'],
	C4: ['- a\n  1. b\n     1. c', '<ul><li>a<ol><li>b<ol><li>c</li></ol></li></ol></li></ul>'],
	C3: ['1. a\n   - b\n     - c', '<ol><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ol>'],
} as const;

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

// 첫 텍스트 노드가 `name` 인 항목. 하나여야 한다.
const item = (root: Element, name: string): HTMLLIElement => {
	const found = Array.from(root.querySelectorAll('li'))
		.filter((li) => (li.firstChild?.nodeValue ?? '').trim() === name);
	expect(found, `항목 ${name}`).toHaveLength(1);
	return found[0] as HTMLLIElement;
};

// `needle` 을 담은 첫 텍스트 노드.
const textNodeContaining = (root: Node, needle: string): Text | null => {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for(let n = walker.nextNode(); null !== n; n = walker.nextNode()) {
		if((n.nodeValue ?? '').includes(needle)) return n as Text;
	}
	return null;
};

// 정제 전 문자열의 `ul`·`ol`·`li` 여는 태그를 쌓고 닫는 태그마다 꺼내 이름이 다르거나
// 끝에 남은 수.
const listTagMismatch = (raw: string): number => {
	const stack: string[] = [];
	let bad = 0;
	for(const m of raw.matchAll(/<(\/?)(ul|ol|li)\b[^>]*>/g)) {
		if('' === m[1]) stack.push(m[2] as string);
		else if(stack.pop() !== m[2]) bad++;
	}
	return bad + stack.length;
};

describe('종류 교대 중첩 — 최상위 목록은 1개다', () => {

	it.each(Object.entries(ALT))('%s · 최상위 목록 1 · 최상위 맨 글자 0 · start 0', (_, md) => {
		const el = render(md);

		expect(el.querySelectorAll(':scope > ul, :scope > ol')).toHaveLength(1);
		const bare = Array.from(el.childNodes)
			.filter((n) => Node.TEXT_NODE === n.nodeType && '' !== (n.nodeValue ?? '').trim());
		expect(bare).toHaveLength(0);
		// 번호는 되감기지 않는다 — 다시 연 번호 목록이 이어지는 번호를 `start` 로 싣지 않는다.
		expect(el.querySelectorAll('ol[start]')).toHaveLength(0);
	});

	it('A6 · 최상위 목록은 `ul` 하나다', () => {
		const el = render(ALT.A6);
		expect(el.querySelectorAll(':scope > ul')).toHaveLength(1);
		expect(el.querySelectorAll(':scope > ol')).toHaveLength(0);
		expect(el.querySelectorAll(':scope > ul > li')).toHaveLength(2);
	});

	it('A7 · 최상위 목록은 `ol` 하나이고 그 직계 항목은 `a` · `d` 둘이다', () => {
		const el = render(ALT.A7);
		expect(el.querySelectorAll(':scope > ol')).toHaveLength(1);
		expect(el.querySelectorAll(':scope > ul')).toHaveLength(0);
		const outer = Array.from(el.querySelectorAll(':scope > ol > li'));
		expect(outer).toHaveLength(2);
		expect(outer.map((li) => (li.firstChild?.nodeValue ?? '').trim())).toEqual(['a', 'd']);
		expect((el.querySelector(':scope > ol') as HTMLOListElement).hasAttribute('start')).toBe(false);
	});
});

describe('종류 교대 중첩 — 더 깊게 들여쓴 마커는 바로 위 항목 안에 있다', () => {

	it.each(['A1', 'A2', 'A6', 'A7', 'A8'] as const)('%s · c ⊂ b ⊂ a', (key) => {
		const el = render(ALT[key]);
		const a = item(el, 'a');
		const b = item(el, 'b');
		const c = item(el, 'c');

		expect(a.contains(b) && a !== b).toBe(true);
		expect(b.contains(c) && b !== c).toBe(true);
		if('A8' === key) {
			const e = item(el, 'e');
			expect(c.contains(e) && c !== e).toBe(true);
		}
	});
});

describe('종류 교대 중첩 — 귀속 블록은 가장 깊은 열린 항목 안에 있다', () => {

	// [입력, 담는 항목, 담지 않는 더 깊은 항목]
	const HOLDS: ['A3' | 'A4' | 'A5', string, string][] = [
		['A3', 'a', 'b'],
		['A4', 'b', 'c'],
		['A5', 'a', 'b'],
	];

	it.each(HOLDS)('%s · 본문 ⊂ %s · 본문 ⊄ %s', (key, holder, deeper) => {
		const el = render(ALT[key]);
		const body = textNodeContaining(el, '본문');

		expect(body).not.toBeNull();
		expect(item(el, holder).contains(body)).toBe(true);
		expect(item(el, deeper).contains(body)).toBe(false);
		// 내용 열까지의 들여쓰기는 남지 않는다.
		expect((body?.nodeValue ?? '').startsWith('본문')).toBe(true);
	});
});

describe('목록 태그 짝 — 정제 전 원시 문자열', () => {

	const ROWS: [string, string][] = [
		...Object.entries(ALT),
		...Object.entries(CONTROL).map(([k, [md]]): [string, string] => [k, md]),
	];

	it.each(ROWS)('%s · 어긋남 0', (_, md) => {
		const raw = markdownToHtml(md);
		expect(listTagMismatch(raw), raw).toBe(0);
	});
});

describe('산출 불변 대조 — 같은 종류 중첩 · 2단 교대 · 셋째 단 같은 종류', () => {

	it.each(Object.entries(CONTROL))('%s · 정제 후 DOM 불변', (_, [md, expected]) => {
		expect(render(md).innerHTML).toBe(expected);
	});
});
