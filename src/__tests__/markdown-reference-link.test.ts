import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 참조 링크는 정의된 주소로 연결되고, 참조된 정의 줄만 걷힌다
// (spec `markdown-rendering` §동작 24).
//
// 이 계약이 없던 동안 `[텍스트][라벨]` 과 `[라벨]: 주소` 정의가 둘 다 글자로 보였다
// (운영자 신고). 참조되지 않은 정의 줄은 글자로 남는다 — CommonMark §4.7 과 의도적으로
// 갈린다. 판정면은 정제를 거친 DOM 이다 — 직렬화 문자열이 아니다.

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const anchors = (el: HTMLElement): HTMLAnchorElement[] => Array.from(el.querySelectorAll('a'));

const REF = {
	R1: '[텍스트][라벨]\n\n[라벨]: https://example.com',
	R2: '[라벨][]\n\n[라벨]: https://example.com "제목"',
	R3: '[라벨]\n\n[라벨]: https://example.com',
	R4: '[a]: /first\n\n[a] 를 본다',
	R5: '[Foo  Bar]\n\n[foo bar]: /x',
	R6: '[a]\n\n[a]: /one\n[a]: /two',
	R7: '[참고]: https://example.com',
	R8: '대괄호 [메모] 와 느낌표 ![alt] 만 있다',
	R9: '[x]\n\n[x]: javascript:alert(1)',
	R10: '`[a]`\n\n[a]: /local',
	R11: '```\n[a]: /x\n```\n\n[a]',
	R12: '[a](/b)[c]\n\n[c]: /d',
	R13: '[**굵게**][r]\n\n[r]: https://example.com',
	R14: '[r]\n\n[r]: /log/1',
	// R12 의 짝 — 인라인 링크와 같은 라벨의 정의가 있어도 인라인이 이긴다. R12 는
	// `[a]` 에 정의가 없어 참조가 먼저 돌아도 같은 산출이므로 이 순서를 붙들지 못한다.
	R12b: '[a](/b)\n\n[a]: /x',
};

describe('세 형태는 정의된 주소의 링크다', () => {

	it('R1 `[텍스트][라벨]` — 정의 줄은 걷힌다', () => {

		const el = render(REF.R1);
		const a = anchors(el);
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('https://example.com');
		expect(a[0]?.textContent).toBe('텍스트');
		expect(el.textContent).not.toContain('[라벨]:');
	});

	it('R2 `[라벨][]` — 제목이 title 이 된다', () => {

		const a = anchors(render(REF.R2));
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe('라벨');
		expect(a[0]?.getAttribute('title')).toBe('제목');
	});

	it('R3 `[라벨]`', () => {

		const a = anchors(render(REF.R3));
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe('라벨');
	});

	it('R4 정의가 사용보다 앞에 와도 된다', () => {

		const a = anchors(render(REF.R4));
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('/first');
	});
});

describe('라벨 대조', () => {

	it('R5 대소문자 접기 · 내부 공백 축약', () => {

		const a = anchors(render(REF.R5));
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('/x');
	});

	it('R6 같은 라벨이 여럿이면 첫 정의', () => {

		const a = anchors(render(REF.R6));
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('/one');
	});
});

describe('정의가 없거나 참조되지 않으면 글자다', () => {

	it('R7 참조되지 않은 정의 줄은 남는다', () => {

		const el = render(REF.R7);
		expect(el.textContent).toBe(REF.R7);
		expect(el.querySelectorAll('p').length).toBe(1);
	});

	it('R8 정의가 없는 꼴은 글자 그대로다', () => {

		const el = render(REF.R8);
		expect(el.textContent).toBe(REF.R8);
		expect(el.querySelectorAll('a').length).toBe(0);
		expect(el.querySelectorAll('img').length).toBe(0);
	});
});

describe('정제는 인라인 링크와 같다', () => {

	it('R9 `javascript:` 정의는 실효 href 가 되지 않는다', () => {

		const hrefs = anchors(render(REF.R9)).map((a) => a.getAttribute('href') ?? '');
		expect(hrefs.filter((h) => h.trim().toLowerCase().startsWith('javascript:')).length).toBe(0);
	});

	it('R13 링크 텍스트는 강조를 받고 외부 주소는 새 탭이다', () => {

		const a = anchors(render(REF.R13));
		expect(a.length).toBe(1);
		expect(a[0]?.querySelector('strong')?.textContent).toBe('굵게');
		expect(a[0]?.getAttribute('target')).toBe('_blank');
		expect(a[0]?.getAttribute('rel') ?? '').toContain('noreferrer');
	});

	it('R14 내부 주소는 새 탭을 열지 않는다', () => {

		const a = anchors(render(REF.R14));
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('/log/1');
		expect(a[0]?.hasAttribute('target')).toBe(false);
	});
});

describe('코드 안은 정의도 참조도 아니다', () => {

	it('R10 코드 스팬 안의 참조 꼴', () => {

		const el = render(REF.R10);
		expect(el.querySelector('code')?.textContent).toBe('[a]');
		expect(el.querySelectorAll('a').length).toBe(0);
		expect(el.textContent).toContain('[a]: /local');
	});

	it('R11 코드 블록 안의 정의는 수집되지 않는다', () => {

		const el = render(REF.R11);
		expect(el.querySelectorAll('a').length).toBe(0);
		expect(el.querySelector('pre')?.textContent).toBe('[a]: /x');
	});
});

describe('인라인 링크가 먼저 소비한다', () => {

	it('R12 `[a](/b)[c]` 에서 `[c]` 만 참조 후보', () => {

		const hrefs = anchors(render(REF.R12)).map((a) => a.getAttribute('href'));
		expect(hrefs).toEqual(['/b', '/d']);
	});

	it('R12b 같은 라벨의 정의가 있어도 인라인 링크가 이긴다', () => {

		const hrefs = anchors(render(REF.R12b)).map((a) => a.getAttribute('href'));
		expect(hrefs).toEqual(['/b']);
	});
});
