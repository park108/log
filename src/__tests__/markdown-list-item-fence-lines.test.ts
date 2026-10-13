import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 목록 항목 안 펜스 코드 블록의 줄은 다른 블록 판정을 받지 않는다 (spec
// `markdown-rendering` §동작 21 항목 안 하위 항목 · §수용 기준 "항목 안 펜스 줄 보호").
//
// 판정면은 정제를 거친 DOM 이다 — 독자가 보는 것이다.
//
// 0~3칸 펜스는 최상위 펜스 패스가 먼저 `pre` 로 세우므로 그 안의 줄은 뒤 패스에 보이지
// 않는다. 내용 열이 4 이상인 항목(`10. ` · 중첩 항목 `  - `) 안의 펜스는 최상위에서
// 펜스가 아니라 평범한 줄로 남았고, 이어짐 패스가 펜스로 알아보기 전에 밑줄식 제목 ·
// 가로줄 · 파이프 표 패스가 그 줄을 가져갔다. `L1` 은 `<h2>    a: 1</h2>` 이 생기고
// 빈 `pre` 가 남았으며 목록이 둘로 갈라져 독자가 `11.` 을 새 목록의 첫 번호로 봤다.
//
// L6 · K1 · K2 · K3 는 **산출 불변 대조**다. L6 은 펜스 안 인용·목록 꼴 줄(지금도 옳다),
// K1 · K2 는 내용 열 3 항목의 같은 입력(최상위 펜스 패스가 이미 보호한다), K3 은 최상위
// 밑줄식 제목이다 — 보호를 항목 밖까지 넓히는 구현이 여기서 갈린다.

const F = '```';

const ITEM_FENCE = {
	L1: `10. 설정\n    ${F}yaml\n    a: 1\n    ---\n    b: 2\n    ${F}\n11. 다음`,
	L2: `10. 설정\n    ${F}\n    ---\n    ${F}\n11. 다음`,
	L3: `10. 설정\n    ${F}\n    a | b\n    --|--\n    ${F}\n11. 다음`,
	L4: `10. 설정\n    ${F}\n    a\n    ===\n    ${F}\n11. 다음`,
	L5: `- a\n  - b\n    ${F}\n    x\n    ---\n    ${F}\n  - c`,
	L6: `10. 설정\n    ${F}\n    > q\n    - x\n    ${F}\n11. 다음`,
	K1: `1. 설정\n   ${F}yaml\n   a: 1\n   ---\n   b: 2\n   ${F}\n2. 다음`,
	K2: `1. 설정\n   ${F}\n   a | b\n   --|--\n   ${F}\n2. 다음`,
	K3: '제목\n---',
} as const;

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

// `pre` 의 코드 줄. 줄 경계는 `<br>` 이고 각 조각의 글자를 잰다 — 하이라이트가 `span`
// 을 끼우므로 `textContent` 하나로는 줄이 갈리지 않는다. 마지막 줄 뒤의 `<br>` 이
// 남기는 빈 조각은 줄이 아니다.
const preLines = (pre: Element): string[] => {
	const lines = pre.innerHTML.split(/<br\s*\/?>/i).map((fragment) => {
		const holder = document.createElement('div');
		holder.innerHTML = fragment;
		return holder.textContent ?? '';
	});
	if(lines.length > 0 && '' === lines[lines.length - 1]) lines.pop();
	return lines;
};

// 직계 글자가 `label` 로 시작하는 `li`.
const itemLabelled = (root: Element, label: string): HTMLLIElement | undefined =>
	Array.from(root.querySelectorAll('li')).find((li) =>
		(li.firstChild?.textContent ?? '').trim().startsWith(label)) as HTMLLIElement | undefined;

// 번호 목록 하나에 항목 둘 — 펜스 뒤의 `11.` 이 같은 목록을 잇고 번호는 되감기지 않는다.
const expectOneOrderedList = (el: HTMLElement, start: string | null): void => {
	const ols = el.querySelectorAll('ol');
	expect(ols).toHaveLength(1);
	expect((ols[0] as HTMLOListElement).querySelectorAll(':scope > li')).toHaveLength(2);
	expect((ols[0] as HTMLOListElement).getAttribute('start')).toBe(start);
};

// 코드 블록은 첫 항목 하나 안에 하나다.
const onlyPreInFirstItem = (el: HTMLElement): Element => {
	const pres = el.querySelectorAll('pre');
	expect(pres).toHaveLength(1);
	expect(el.querySelectorAll('li pre')).toHaveLength(1);
	const first = el.querySelector('ol > li, ul > li') as HTMLLIElement;
	expect(first.contains(pres[0] as Element)).toBe(true);
	return pres[0] as Element;
};

describe('목록 항목 안 펜스 줄 보호 — 내용 열 4 이상 항목', () => {

	it('L1 · `---` 를 담은 yaml 펜스는 하나의 `li > pre` 이고 제목이 생기지 않으며 목록은 이어진다', () => {
		const el = render(ITEM_FENCE.L1);

		expectOneOrderedList(el, '10');
		const pre = onlyPreInFirstItem(el);
		expect(el.querySelectorAll('h1, h2')).toHaveLength(0);
		expect(preLines(pre)).toEqual(['a: 1', '---', 'b: 2']);
	});

	it('L2 · 펜스 안 `---` 한 줄은 가로줄도 제목도 표도 아니다', () => {
		const el = render(ITEM_FENCE.L2);

		expect(el.querySelectorAll('hr')).toHaveLength(0);
		expect(el.querySelectorAll('table')).toHaveLength(0);
		expect(el.querySelectorAll('h1, h2')).toHaveLength(0);
		expectOneOrderedList(el, '10');
		const pre = onlyPreInFirstItem(el);
		expect(preLines(pre)).toEqual(['---']);
	});

	it('L3 · 펜스 안 표 꼴 두 줄은 표가 아니다', () => {
		const el = render(ITEM_FENCE.L3);

		expect(el.querySelectorAll('hr')).toHaveLength(0);
		expect(el.querySelectorAll('table')).toHaveLength(0);
		expect(el.querySelectorAll('h1, h2')).toHaveLength(0);
		expectOneOrderedList(el, '10');
		const pre = onlyPreInFirstItem(el);
		expect(preLines(pre)).toEqual(['a | b', '--|--']);
	});

	it('L4 · 펜스 안 `===` 밑줄은 앞 줄을 제목으로 만들지 않는다', () => {
		const el = render(ITEM_FENCE.L4);

		expect(el.querySelectorAll('h1, h2')).toHaveLength(0);
		expectOneOrderedList(el, '10');
		const pre = onlyPreInFirstItem(el);
		expect(preLines(pre)).toEqual(['a', '===']);
	});

	it('L5 · 중첩 항목(내용 열 4) 안 펜스도 보호되고 `pre` 는 그 항목 안이며 최상위 목록은 하나다', () => {
		const el = render(ITEM_FENCE.L5);

		expect(el.querySelectorAll('h1, h2')).toHaveLength(0);
		expect(el.querySelectorAll('hr')).toHaveLength(0);
		expect(el.querySelectorAll(':scope > ul')).toHaveLength(1);

		const pres = el.querySelectorAll('pre');
		expect(pres).toHaveLength(1);
		const pre = pres[0] as Element;

		const b = itemLabelled(el, 'b');
		const c = itemLabelled(el, 'c');
		expect(b).toBeDefined();
		expect(c).toBeDefined();
		expect(b?.contains(pre)).toBe(true);
		expect(c?.contains(pre)).toBe(false);
		expect(preLines(pre)).toEqual(['x', '---']);
	});
});

describe('목록 항목 안 펜스 줄 보호 — 산출 불변 대조', () => {

	it('L6 · 펜스 안 인용·목록 꼴 줄은 지금처럼 코드 글자다', () => {
		const el = render(ITEM_FENCE.L6);

		expect(el.querySelectorAll('li blockquote')).toHaveLength(0);
		expectOneOrderedList(el, '10');
		const pre = onlyPreInFirstItem(el);
		const lines = preLines(pre);
		expect(lines).toContain('> q');
		expect(lines).toContain('- x');
	});

	it('K1 · 내용 열 3 항목의 같은 yaml 입력은 지금처럼 하나의 `li > pre` 다', () => {
		const el = render(ITEM_FENCE.K1);

		expectOneOrderedList(el, null);
		const pre = onlyPreInFirstItem(el);
		expect(el.querySelectorAll('h1, h2')).toHaveLength(0);
		expect(preLines(pre)).toEqual(['a: 1', '---', 'b: 2']);
	});

	it('K2 · 내용 열 3 항목의 표 꼴 입력은 지금처럼 표가 아니다', () => {
		const el = render(ITEM_FENCE.K2);

		expectOneOrderedList(el, null);
		onlyPreInFirstItem(el);
		expect(el.querySelectorAll('table')).toHaveLength(0);
	});

	it('K3 · 최상위 밑줄식 제목은 그대로다', () => {
		expect(markdownToHtml(ITEM_FENCE.K3)).toBe('<h2>제목</h2>');
	});
});
