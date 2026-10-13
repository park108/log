import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 목록 항목 안 인용 뒤 줄 (spec `markdown-rendering` §동작 3 둘째 하위 항목 ·
// §동작 19 열린 항목 하위 항목 "블록 뒤 0칸 줄의 귀속" · §수용 기준 "항목 안 인용 뒤 줄").
//
// 항목 안 인용을 닫은 뒤 같은 항목에 이어지는 줄 앞에 `<br>` 이 붙었다 —
//   `- a\n  > q\n  more` → `<ul><li>a<blockquote>q</blockquote><br>more</li></ul>`
// 블록 바로 뒤의 `<br>` 은 글쓴이가 쓰지 않은 빈 줄 하나를 만든다. 항목 안 코드 블록
// 뒤 줄에는 없다. 또 인용 뒤 0칸 줄은 항목에 남았지만 코드 블록 뒤 0칸 줄은 목록을
// 끝냈다 — 블록 뒤 0칸 줄의 귀속은 블록 종류와 무관하다.
//
// 판정면은 정제를 거친 DOM 과 정제 후 `innerHTML` 이다 — 독자가 보는 것이다.
const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

// 첫 텍스트 노드가 `name` 인 항목 — 인용을 담은 항목을 이름으로 찾는다.
const itemNamed = (el: HTMLElement, name: string): HTMLLIElement | undefined =>
	Array.from(el.querySelectorAll('li')).find(li => (li.firstChild?.nodeValue ?? '').trim() === name);

// 글자가 정확히 `text` 인 텍스트 노드 전부.
const textNodes = (el: HTMLElement, text: string): Text[] => {
	const found: Text[] = [];
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	for(let n = walker.nextNode(); null !== n; n = walker.nextNode()) {
		if(text === (n.nodeValue ?? '').trim()) found.push(n as Text);
	}
	return found;
};

// 결함 — 정제 후 innerHTML 에 `</blockquote><br` 0 · `more` 는 인용을 담은 `a` 항목 안.
const DEFECT = {
	A1: '- a\n  > q\n  more',
	A3: '- a\n  > q\n\n  more',
	E5: '- a\n  > q\n\n  more\n- b',
	A9: '1. a\n   > q\n   more\n2. b',
	A10: '- a\n  > q\n  > r\n  more',
	A8: '- a\n  > # 제목\n  more',
	A12: '- a\n  > - b\n  more',
	A13: '- a\n  > ```\n  > x\n  > ```\n  more',
	F3: '- a\n  > q\n  > ```\n  > x\n  > ```\n  more',
} as const;

// 대조 — 정제 후 innerHTML 그대로 (HEAD=ad8e798).
const CONTROL = {
	A6: ['- a\n  > q', '<ul><li>a<blockquote>q</blockquote></li></ul>'],
	A7: ['- a\n  > q\n- b', '<ul><li>a<blockquote>q</blockquote></li><li>b</li></ul>'],
	A11: ['- a\n  b\n  more', '<ul><li>a<br>b<br>more</li></ul>'],
	A4: ['> q\nmore', '<blockquote>q</blockquote><p>more</p>'],
	A14: ['> q\n\nmore', '<blockquote>q</blockquote><p></p><p>more</p>'],
	A5: ['- a\n  ```\n  c\n  ```\n  more', '<ul><li>a<pre>c<br></pre>more</li></ul>'],
	G1: ['- a\n  ```\n  c\n  ```\n\n  more', '<ul><li>a<pre>c<br></pre>more</li></ul>'],
} as const;

// 블록 뒤 0칸 줄 — `lazy` 는 최상위 `p` 하나이고 어느 `li` 안에도 없다 (목록이 끝난다).
const LAZY = {
	A2: '- a\n  > q\nlazy',
	G2: '- a\n  ```\n  c\n  ```\nlazy',
} as const;

describe('목록 항목 안 인용 뒤 줄은 <br> 없이 시작한다', () => {

	it.each(Object.entries(DEFECT))('%s · 정제 후 innerHTML 에 </blockquote><br 이 없다', (_name, markdown) => {
		expect(render(markdown).innerHTML).not.toContain('</blockquote><br');
	});

	it.each(Object.entries(DEFECT))('%s · 인용 뒤 줄은 인용을 담은 같은 항목 안에 있다', (_name, markdown) => {
		const el = render(markdown);
		const item = itemNamed(el, 'a');
		expect(item).toBeDefined();
		const quote = item?.querySelector(':scope > blockquote');
		expect(quote).not.toBeNull();

		// HEAD 에서도 참이다 — `<br>` 을 지우면서 뒤 줄을 항목 밖으로 밀어내거나 인용
		// 안으로 끌어들이는 구현을 가르는 자리다 (뒤 줄은 `</blockquote>` 뒤에서 시작한다).
		const more = textNodes(el, 'more');
		expect(more).toHaveLength(1);
		expect(item?.contains(more[0] as Text)).toBe(true);
		expect(quote?.contains(more[0] as Text)).toBe(false);
	});
});

describe('대조 — 산출이 바뀌지 않는 꼴', () => {

	it.each(Object.entries(CONTROL))('%s · 정제 후 innerHTML 이 그대로다', (_name, [markdown, expected]) => {
		expect(render(markdown).innerHTML).toBe(expected);
	});
});

describe('블록 뒤 0칸 줄의 귀속은 블록 종류와 무관하다', () => {

	it.each(Object.entries(LAZY))('%s · lazy 는 최상위 p 이고 목록이 끝난다', (_name, markdown) => {
		const el = render(markdown);

		const paragraphs = Array.from(el.querySelectorAll(':scope > p'));
		expect(paragraphs.map(p => p.textContent)).toEqual(['lazy']);

		const lazy = textNodes(el, 'lazy');
		expect(lazy).toHaveLength(1);
		expect(lazy[0]?.parentElement?.closest('li')).toBeNull();
	});
});
