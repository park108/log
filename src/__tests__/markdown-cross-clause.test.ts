import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 엔티티(23) · 참조 링크(24) · 맨 URL(25) 이 겹치는 입력에서 판정이 엇갈리지 않는다
// (spec `markdown-rendering` §수용 기준 "항 사이 교차 입력").
//
// 세 항은 따로 착지했고 각 항의 게이트는 자기 항의 입력만 잰다. 이 파일은 둘이 겹치는
// 입력만 둔다. 맨 URL 안의 엔티티는 23 이 이긴다 — 링크의 범위는 원문 글자로 정하고
// `href` 와 보이는 글자는 해석을 거친다. 같은 주소를 인라인 링크로 쓴 것(K1)과 산출이
// 갈리지 않아야 한다. 판정면은 정제를 거친 DOM 이다 — 실효 `href` 는 `getAttribute` 로
// 잰다 (`a.href` 는 jsdom 이 정규화한다).

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const anchors = (el: HTMLElement): HTMLAnchorElement[] => Array.from(el.querySelectorAll('a'));

const CROSS = {
	X1: '주소 https://example.com/?a=1&amp;b=2 를 본다', // 23×25
	X2: '[참고]: https://example.com', // 24×25
	X3: '[x]\n\n[x]: https://a.example/?a=1&amp;b=2', // 23×24
	K1: '[x](https://example.com/?a=1&amp;b=2)', // 대조 — 인라인 링크 (23)
};

describe('23×25 맨 URL 안의 엔티티는 23 이 이긴다', () => {

	it('X1 링크는 엔티티에서 끊기지 않고 href · 링크 글자 · 렌더 텍스트가 해석을 거친다', () => {

		const el = render(CROSS.X1);
		const a = anchors(el);
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('https://example.com/?a=1&b=2');
		expect(a[0]?.textContent).toBe('https://example.com/?a=1&b=2');
		expect(el.textContent).toBe('주소 https://example.com/?a=1&b=2 를 본다');
	});

	it('X1 과 같은 주소를 인라인 링크로 쓴 K1 의 href 가 같다', () => {

		const bare = anchors(render(CROSS.X1));
		const inline = anchors(render(CROSS.K1));
		expect(bare.length).toBe(1);
		expect(inline.length).toBe(1);
		expect(bare[0]?.getAttribute('href')).toBe(inline[0]?.getAttribute('href'));
	});
});

describe('24×25 참조되지 않은 정의 줄 안의 주소', () => {

	it('X2 정의 줄은 문단 하나로 남고 렌더 텍스트 === 입력, 주소만 링크다', () => {

		const el = render(CROSS.X2);
		expect(el.querySelectorAll('p').length).toBe(1);
		expect(el.textContent).toBe(CROSS.X2);
		const a = anchors(el);
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('https://example.com');
		expect(a[0]?.textContent).toBe('https://example.com');
	});
});

describe('23×24 참조 정의 주소 안의 엔티티', () => {

	it('X3 정의 주소의 엔티티는 해석된다', () => {

		const a = anchors(render(CROSS.X3));
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('https://a.example/?a=1&b=2');
	});
});

describe('대조 — 인라인 링크 (23)', () => {

	it('K1 인라인 링크 주소의 엔티티는 해석된다', () => {

		const a = anchors(render(CROSS.K1));
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('https://example.com/?a=1&b=2');
	});
});
