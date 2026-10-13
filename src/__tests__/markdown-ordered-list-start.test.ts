import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 번호 목록은 글쓴이가 쓴 첫 번호부터 보인다 (spec `markdown-rendering` §동작 20).
//
// 판정면은 정제를 거친 DOM 의 `ol.getAttribute('start')` 다 — 독자가 보는 번호는
// 그것이 정한다. 파서만 `start` 를 내고 정제가 지우면(`sanitizeHtml` (I15)) 독자는
// 여전히 `1.` 부터 본다. **한쪽만 고치면 독자에게는 아무 변화가 없다** — 그래서
// 파서 산출 문자열이 아니라 `sanitizeHtml(markdownToHtml(x))` 를 넣은 DOM 을 잰다.
// S2 만 산출 문자열을 바이트로 비교한다 (첫 번호 1 의 산출은 종전 그대로다).

const START = {
	S1: '3. a\n7. b',
	S2: '1. 하나\n2. 둘',
	S3: '003. x',
	S4: '0. z',
	S5: '1. a\n   5. b',
	S6: '10. 열\n11. 열하나',
} as const;

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const lists = (markdown: string): HTMLOListElement[] =>
	[...render(markdown).querySelectorAll('ol')];

describe('번호 목록 첫 번호', () => {

	it('S1 · 첫 번호가 시작 번호이고 둘째 항목 이후의 번호는 무관하다', () => {
		const ols = lists(START.S1);
		expect(ols).toHaveLength(1);
		expect(ols[0]?.getAttribute('start')).toBe('3');
		expect(ols[0]?.querySelectorAll('li')).toHaveLength(2);
	});

	it('S2 · 첫 번호가 1 이면 start 를 내지 않고 산출은 종전 그대로다', () => {
		expect(markdownToHtml(START.S2)).toBe('<ol><li>하나</li><li>둘</li></ol>');
		const ols = lists(START.S2);
		expect(ols).toHaveLength(1);
		expect(ols[0]?.getAttribute('start')).toBeNull();
	});

	it('S3 · 시작 번호는 10진 정규화된다 (앞자리 0 을 걷는다)', () => {
		const ols = lists(START.S3);
		expect(ols).toHaveLength(1);
		expect(ols[0]?.getAttribute('start')).toBe('3');
	});

	it('S4 · 0 으로 시작한 목록은 0 부터 보인다', () => {
		const ols = lists(START.S4);
		expect(ols).toHaveLength(1);
		expect(ols[0]?.getAttribute('start')).toBe('0');
	});

	it('S5 · 중첩 번호 목록은 자기 첫 번호를 따른다', () => {
		const el = render(START.S5);
		const outer = el.querySelector(':scope > ol');
		const inner = el.querySelector('ol ol');
		expect(outer).not.toBeNull();
		expect(inner).not.toBeNull();
		expect(outer?.getAttribute('start')).toBeNull();
		expect(inner?.getAttribute('start')).toBe('5');
	});

	it('S6 · 여러 자리 번호도 그대로 시작 번호다', () => {
		const ols = lists(START.S6);
		expect(ols).toHaveLength(1);
		expect(ols[0]?.getAttribute('start')).toBe('10');
		expect(ols[0]?.querySelectorAll('li')).toHaveLength(2);
	});

	it('모든 start 값은 숫자 문자뿐이다', () => {
		const starts = Object.values(START)
			.flatMap((markdown) => lists(markdown))
			.map((ol) => ol.getAttribute('start'))
			.filter((v): v is string => null !== v);
		// 측정 대상이 비면 아래 단언은 공허하다.
		expect(starts.length).toBeGreaterThan(0);
		for (const v of starts) expect(v).toMatch(/^\d+$/);
	});
});
