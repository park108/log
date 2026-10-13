import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 목록 항목 안에서 줄 머리 탭은 4칸 탭 정지로 센다 (spec `markdown-rendering` §동작 19
// 탭 하위 항목 · CommonMark §2.2).
//
// 판정면은 정제를 거친 DOM 이다 — 독자가 보는 것이다.
//
// 내용 열 판정과 항목 안 코드 줄 걷기가 공백만 세던 동안, 탭으로 들여쓴 블록은 내용
// 열에 닿지 않은 것으로 판정돼 항목 밖으로 떨어졌다. `T1` 은 펜스 표기가 글자로 남아
// 백틱 넷이 보였고, `T2` 는 목록이 둘로 갈라지고 본문 앞에 탭이 남았다.
//
// T3 · T4 는 대조다 — 이 셈이 **바꾸지 않는** 것을 잰다. 탭 하나는 4칸이라 최상위
// 펜스가 아니고(§21), 마커 줄의 중첩 깊이는 현 모델 그대로다(§19 둘째 하위 항목).

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const TAB = {
	T1: '- 항목\n\t```js\n\tx\n\t```',
	T2: '- a\n\n\t본문\n- b',
	T3: '\t```\n\tcode\n\t```',
	T4: '- a\n\t- b',
} as const;

// 요소 아래 텍스트 노드 전부 (자손 포함).
const textNodes = (root: Node): string[] => {
	const out: string[] = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for(let n = walker.nextNode(); null !== n; n = walker.nextNode()) out.push(n.nodeValue ?? '');
	return out;
};

describe('목록 항목 안 탭 들여쓰기의 내용 열', () => {

	it('T1 · 탭으로 들여쓴 펜스는 항목 안의 코드 블록이고 펜스 표기는 보이지 않는다', () => {
		const el = render(TAB.T1);
		const pres = el.querySelectorAll('li pre');
		expect(pres).toHaveLength(1);
		expect(el.querySelectorAll('li > pre')).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('x');
		expect(el.textContent).not.toContain('`');
		expect(el.textContent).not.toContain('js');
		expect(el.textContent).toContain('항목');
	});

	it('T2 · 빈 줄 뒤 탭으로 들여쓴 문단은 첫 항목 안이고 목록은 이어진다', () => {
		const el = render(TAB.T2);
		expect(el.querySelectorAll('ul')).toHaveLength(1);
		const items = el.querySelectorAll('li');
		expect(items).toHaveLength(2);
		expect(items[0]?.textContent).toContain('본문');
		expect(items[1]?.textContent).not.toContain('본문');
		// 앞에 탭이 남지 않는다 — 첫 항목의 텍스트 노드 어디에도 탭이 없다.
		const texts = textNodes(items[0] as Node);
		expect(texts.join('')).toContain('본문');
		for(const t of texts) expect(t).not.toContain('\t');
	});

	it('T3 · (대조) 탭으로 시작하는 최상위 펜스 줄은 펜스가 아니다', () => {
		const el = render(TAB.T3);
		expect(el.querySelectorAll('pre')).toHaveLength(0);
	});

	it('T4 · (대조) 탭으로 들여쓴 마커 줄은 지금처럼 한 단계 중첩된다', () => {
		const el = render(TAB.T4);
		expect(el.querySelectorAll('ul ul')).toHaveLength(1);
		expect(el.querySelectorAll('ul')).toHaveLength(2);
		expect(el.querySelectorAll('li')).toHaveLength(2);
	});
});
