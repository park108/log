import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 목록 항목 안 펜스 보호는 항목 안 어느 자리의 펜스에도 걸리고, 닫는 펜스 줄이 입력 끝까지
// 없는 항목 안 펜스는 그 항목이 끝나는 자리에서 끝난다 (spec `markdown-rendering` §동작 21
// 항목 안 하위 항목의 둘째 단 · §수용 기준 "항목 안 펜스 보호의 자리 · 닫히지 않은 펜스").
//
// 판정면은 정제를 거친 DOM 이다 — 독자가 보는 것이다.
//
// 보호 패스가 보수적으로 열을 닫던 세 자리에서 `---` 줄이 앞 줄을 `h2` 로 만들었다.
//   M1 · M1b — 같은 항목의 앞 코드 블록(최상위 펜스 패스가 세운 `pre`) 뒤의 펜스.
//   M2       — 마커 줄이 표 행 후보(`|` 포함)인 항목의 펜스.
//   M3 · M3b — 닫히지 않은 항목 안 펜스. 내용 열 4 이상(M3)은 뒤 패스가 그 안 줄을 가져갔고,
//              내용 열 2(M3b)는 최상위 펜스 패스가 입력 끝까지 코드로 세워 `- b` 를 삼켰다.
//
// CONTROL 은 산출 불변 대조다 — 정제 후 `innerHTML` 문자열을 그대로 잰다. M5 는 닫힌 펜스
// 사이의 0칸 줄이 지금처럼 코드라는 것이다 (닫히지 않은 펜스의 끝 규칙을 닫힌 펜스에 넓히면
// 여기서 갈린다).

const F = '```';

const DEFECT = {
	M1: `- a\n  ${F}\n  x\n  ${F}\n\n    ${F}\n    ---\n    ${F}\n- b`,
	M1b: `- a\n  ${F}\n  x\n  ${F}\n    ${F}\n    ---\n    ${F}\n- b`,
	M2: `- a | b\n    ${F}\n    ---\n    ${F}\n- b`,
	M3: `10. a\n    ${F}\n    x\n    ---\n11. b`,
	M3b: `- a\n  ${F}\n  x\n  ---\n- b`,
} as const;

const CONTROL: readonly (readonly [string, string, string])[] = [
	['L1', `10. 설정\n    ${F}yaml\n    a: 1\n    ---\n    b: 2\n    ${F}\n11. 다음`,
		'<ol start="10"><li>설정<pre><span class="span--yml-key">a</span>: 1<br>---<br><span class="span--yml-key">b</span>: 2<br></pre></li><li>다음</li></ol>'],
	['L2', `- a\n\n    ${F}\n    ---\n    ${F}\n- b`, '<ul><li>a<pre>---<br></pre></li><li>b</li></ul>'],
	['M2b', `- a | b\n  ${F}\n  ---\n  ${F}\n- b`, '<ul><li>a | b<pre>---<br></pre></li><li>b</li></ul>'],
	['M4', `- a\n  > q\n\n    ${F}\n    ---\n    ${F}\n- b`, '<ul><li>a<blockquote>q</blockquote><pre>---<br></pre></li><li>b</li></ul>'],
	['M5', `10. a\n    ${F}\n> q\n    ${F}\n11. b`, '<ol start="10"><li>a<pre>&gt; q<br></pre></li><li>b</li></ol>'],
	['setext', '제목\n---', '<h2>제목</h2>'],
];

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

// `pre` 의 코드 줄. `br` 을 줄 경계로 바꾼 글자다 — 하이라이트가 `span` 을 끼우므로
// `textContent` 하나로는 줄이 갈리지 않는다. 마지막 줄 뒤의 `br` 이 남기는 빈 조각은
// 줄이 아니다.
const preLines = (pre: Element): string[] => {
	const lines = pre.innerHTML.split(/<br\s*\/?>/i).map((fragment) => {
		const holder = document.createElement('div');
		holder.innerHTML = fragment;
		return holder.textContent ?? '';
	});
	if(lines.length > 0 && '' === lines[lines.length - 1]) lines.pop();
	return lines;
};

// 최상위 목록은 하나 — 컨테이너 직계 자식 `ul`·`ol` 수로 잰다. 그 목록의 직계 항목들을 돌려준다.
const onlyTopLevelList = (el: HTMLElement, tagName: 'ul' | 'ol'): HTMLLIElement[] => {
	const lists = el.querySelectorAll(':scope > ul, :scope > ol');
	expect(lists).toHaveLength(1);
	const list = lists[0] as Element;
	expect(list.tagName.toLowerCase()).toBe(tagName);
	return Array.from(list.querySelectorAll(':scope > li')) as HTMLLIElement[];
};

describe('항목 안 펜스 보호의 자리 — 같은 항목의 앞 코드 블록 뒤', () => {

	it.each(['M1', 'M1b'] as const)('%s · 둘째 펜스도 첫 항목 안 `pre` 이고 `---` 가 앞 줄을 제목으로 만들지 않는다', (name) => {
		const el = render(DEFECT[name]);

		const items = onlyTopLevelList(el, 'ul');
		expect(items).toHaveLength(2);

		const pres = (items[0] as HTMLLIElement).querySelectorAll('pre');
		expect(pres).toHaveLength(2);
		expect(preLines(pres[1] as Element)).toEqual(['---']);

		expect(el.querySelectorAll('h2')).toHaveLength(0);
		expect(el.textContent).not.toContain('`');
	});
});

describe('항목 안 펜스 보호의 자리 — 표 행 후보 마커 줄의 항목', () => {

	it('M2 · `- a | b` 항목의 펜스는 그 항목 안 `pre` 이고 표도 제목도 생기지 않는다', () => {
		const el = render(DEFECT.M2);

		const items = onlyTopLevelList(el, 'ul');
		expect(items).toHaveLength(2);

		const pres = (items[0] as HTMLLIElement).querySelectorAll('pre');
		expect(pres).toHaveLength(1);
		expect(preLines(pres[0] as Element)).toEqual(['---']);

		expect(el.querySelectorAll('h2')).toHaveLength(0);
		expect(el.querySelectorAll('table')).toHaveLength(0);
	});
});

describe('닫히지 않은 항목 안 펜스 — 그 항목이 끝나는 자리에서 끝난다', () => {

	it('M3 · 내용 열 4 항목: `pre` 는 `x`·`---` 이고 `11.` 은 같은 목록의 둘째 항목이다', () => {
		const el = render(DEFECT.M3);

		const items = onlyTopLevelList(el, 'ol');
		expect(items).toHaveLength(2);

		const pres = el.querySelectorAll('pre');
		expect(pres).toHaveLength(1);
		expect((items[0] as HTMLLIElement).contains(pres[0] as Element)).toBe(true);
		expect(preLines(pres[0] as Element)).toEqual(['x', '---']);

		expect(el.querySelectorAll('h2')).toHaveLength(0);

		const started = el.querySelectorAll('[start]');
		expect(started).toHaveLength(1);
		expect((started[0] as Element).getAttribute('start')).toBe('10');
	});

	it('M3b · 내용 열 2 항목: 같은 모양이고 `pre` 가 다음 항목 마커를 삼키지 않는다', () => {
		const el = render(DEFECT.M3b);

		const items = onlyTopLevelList(el, 'ul');
		expect(items).toHaveLength(2);

		const pres = el.querySelectorAll('pre');
		expect(pres).toHaveLength(1);
		expect((items[0] as HTMLLIElement).contains(pres[0] as Element)).toBe(true);
		expect(preLines(pres[0] as Element)).not.toContain('- b');
		expect(preLines(pres[0] as Element)).toEqual(['x', '---']);

		expect(el.querySelectorAll('h2')).toHaveLength(0);
	});
});

describe('산출 불변 대조 — 정제 후 innerHTML', () => {

	it.each(CONTROL)('%s', (_name, input, expected) => {
		expect(render(input).innerHTML).toBe(expected);
	});
});
