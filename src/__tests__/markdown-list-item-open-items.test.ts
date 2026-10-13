import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 빈 줄·코드 블록 뒤 블록은 닿는 가장 깊은 열린 항목에 귀속된다 (spec
// `markdown-rendering` §동작 19 열린 항목 하위 항목).
//
// 판정면은 정제를 거친 DOM 이다 — 독자가 보는 것이다.
//
// 열린 항목을 가장 최근 마커 줄 하나로만 들던 동안, 중첩 항목 뒤에 빈 줄을 두고 바깥
// 항목의 내용 열로 들여쓴 블록은 안쪽 항목의 열에 못 미쳐 목록 밖으로 떨어졌다. `O1`
// 은 `<ol>` 이 둘로 갈라져 독자가 `2.` 를 새 목록의 첫 번호로 봤고 `본문` 앞에 공백
// 셋이 남았다. `O2` 는 코드 블록이 항목 밖으로, `O3` 은 셋째 단의 `본문` 이 목록 밖으로
// 떨어졌다.
//
// O4 · O5 는 **산출 불변 대조**다. O4 는 열린 항목이 하나뿐인 자리(종전 경로), O5 는
// 빈 줄 없는 이어짐(§5 — 가장 안쪽 항목에 붙는다)이다. 기대 문자열은 이 귀속 규칙이
// 들어오기 전의 `markdownToHtml` 산출(정제 전) 그대로다.

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const OPEN = {
	O1: '1. a\n   - b\n\n   본문\n2. c',
	O2: '1. a\n   - b\n\n   ```\n   x\n   ```\n2. c',
	O3: '- a\n  - b\n    - c\n\n    본문\n- d',
	O4: '1. a\n\n   본문\n2. c',
	O5: '1. a\n   - b\n   본문\n2. c',
} as const;

// `needle` 을 담은 첫 텍스트 노드.
const textNodeContaining = (root: Node, needle: string): Text | null => {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for(let n = walker.nextNode(); null !== n; n = walker.nextNode()) {
		if((n.nodeValue ?? '').includes(needle)) return n as Text;
	}
	return null;
};

// `node` 를 담은 `parent` 의 직계 자식 (`node` 자신일 수 있다).
const childHolding = (parent: Element, node: Node): ChildNode | null => {
	let at: Node | null = node;
	while(null !== at && at.parentNode !== parent) at = at.parentNode;
	return at as ChildNode | null;
};

describe('열린 항목의 열 — 빈 줄·코드 블록 뒤 블록의 귀속', () => {

	it('O1 · 빈 줄 뒤 바깥 내용 열의 문단은 첫 바깥 항목 안, 안쪽 목록 뒤에 오고 목록은 이어진다', () => {
		const el = render(OPEN.O1);

		expect(el.querySelectorAll('ol')).toHaveLength(1);
		const outer = el.querySelectorAll(':scope > ol > li');
		expect(outer).toHaveLength(2);

		const first = outer[0] as HTMLLIElement;
		const body = textNodeContaining(el, '본문');
		expect(body).not.toBeNull();
		expect(first.contains(body)).toBe(true);
		expect((outer[1] as HTMLLIElement).contains(body)).toBe(false);

		// 안쪽 목록은 닫혔다 — `본문` 은 `ul` 의 자손이 아니고, 자식 순서에서 `ul` 뒤다.
		const ul = first.querySelector(':scope > ul');
		expect(ul).not.toBeNull();
		expect(ul?.contains(body)).toBe(false);
		const children = Array.from(first.childNodes);
		const holder = childHolding(first, body as Text);
		expect(children.indexOf(ul as ChildNode)).toBeGreaterThanOrEqual(0);
		expect(children.indexOf(ul as ChildNode)).toBeLessThan(children.indexOf(holder as ChildNode));

		// 내용 열까지의 들여쓰기는 남지 않는다.
		expect(el.textContent).not.toContain('   본문');
		expect((body?.nodeValue ?? '').startsWith('본문')).toBe(true);
	});

	it('O2 · 빈 줄 뒤 바깥 내용 열의 펜스 코드 블록은 첫 바깥 항목 안이고 목록은 이어진다', () => {
		const el = render(OPEN.O2);

		expect(el.querySelectorAll('ol')).toHaveLength(1);
		expect(el.querySelectorAll(':scope > ol > li')).toHaveLength(2);

		const pres = el.querySelectorAll('pre');
		expect(pres).toHaveLength(1);
		const first = el.querySelector(':scope > ol > li') as HTMLLIElement;
		expect(first.contains(pres[0] as Node)).toBe(true);
		expect(first.querySelector(':scope > ul')?.contains(pres[0] as Node)).toBe(false);
		expect(pres[0]?.textContent).toBe('x');
		expect(el.textContent).not.toContain('`');
	});

	it('O3 · 셋째 단 뒤 둘째 단 내용 열의 문단은 둘째 단 항목 안이고 셋째 단 항목 밖이다', () => {
		const el = render(OPEN.O3);

		expect(el.querySelectorAll(':scope > ul')).toHaveLength(1);
		expect(el.querySelectorAll(':scope > ul > li')).toHaveLength(2);

		const b = el.querySelector(':scope > ul > li > ul > li');
		const c = el.querySelector(':scope > ul > li > ul > li > ul > li');
		expect(b).not.toBeNull();
		expect(c).not.toBeNull();
		expect(c?.textContent).toBe('c');

		const body = textNodeContaining(el, '본문');
		expect(body).not.toBeNull();
		expect(b?.contains(body)).toBe(true);
		expect(c?.contains(body)).toBe(false);
		expect(el.textContent).not.toContain(' 본문');
	});

	it('O4 · 대조 — 열린 항목이 하나뿐인 자리의 산출은 바뀌지 않는다', () => {
		expect(markdownToHtml(OPEN.O4)).toBe('<ol><li>a<br />본문</li><li>c</li></ol>');
	});

	it('O5 · 대조 — 빈 줄 없는 이어짐은 가장 안쪽 항목에 붙고 산출은 바뀌지 않는다', () => {
		expect(markdownToHtml(OPEN.O5)).toBe('<ol><li>a<ul><li>b<br />본문</li></ul></li><li>c</li></ol>');
	});
});
