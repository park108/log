import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import { trimmedContents } from '../Log/api';

// 링크 텍스트와 이미지 설명 안의 짝 맞는 대괄호는 링크·이미지를 깨지 않는다
// (spec `markdown-rendering` §동작 28 — CommonMark §6.3).
//
// 텍스트를 첫 `]` 에서 끊던 동안 `[arr[0] 접근](https://example.com/)` 은 링크가 서지 못하고
// `(…)` 안의 주소만 맨 URL 링크가 됐다 — 링크 수는 그때도 1 이라 링크 수로는 결함이 보이지
// 않는다. 그래서 판정은 링크의 텍스트와 렌더 텍스트의 `](` 로 한다. 판정면은 정제를 거친
// DOM 의 `textContent` · `getAttribute` 와 요약 경로(`trimmedContents`)다.

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const anchors = (el: HTMLElement): HTMLAnchorElement[] => Array.from(el.querySelectorAll('a'));
const images = (el: HTMLElement): HTMLImageElement[] => Array.from(el.querySelectorAll('img'));

// 입력 · 링크 텍스트 · href
const LINK_TEXT: Record<string, [string, string, string]> = {
	B1:   ['[arr[0] 접근](https://example.com/)', 'arr[0] 접근',      'https://example.com/'],
	B2:   ['[a [b] c](https://example.com/)',     'a [b] c',          'https://example.com/'],
	C512: ['[link [foo [bar]]](/uri)',             'link [foo [bar]]', '/uri'],
};

describe('링크 텍스트 안의 짝 맞는 대괄호', () => {

	it.each(Object.entries(LINK_TEXT))('%s', (_key, [markdown, text, href]) => {

		const el = render(markdown);
		const a = anchors(el);
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe(text);
		expect(a[0]?.getAttribute('href')).toBe(href);
		expect(el.textContent).not.toContain('](');
	});
});

describe('이미지 설명 안의 짝 맞는 대괄호 · 링크 · 이미지', () => {

	it('B3 `![그림 [1]](…)` — alt 는 대괄호째다', () => {

		const el = render('![그림 [1]](https://example.com/x.png)');
		const img = images(el);
		expect(img.length).toBe(1);
		expect(img[0]?.getAttribute('src')).toBe('https://example.com/x.png');
		expect(img[0]?.getAttribute('alt')).toBe('그림 [1]');
		expect(el.textContent).not.toContain('](');
	});

	// 설명 안의 링크·이미지는 바깥 이미지의 설명이다 — `alt` 는 27 의 평문이다.
	it.each([
		['C575', '![foo [bar](/url)](/url2)'],
		['C574', '![foo ![bar](/url)](/url2)'],
	])('%s', (_key, markdown) => {

		const el = render(markdown);
		const img = images(el);
		expect(img.length).toBe(1);
		expect(img[0]?.getAttribute('src')).toBe('/url2');
		expect(img[0]?.getAttribute('alt')).toBe('foo bar');
		expect(el.textContent).not.toContain('](');
		expect(trimmedContents(markdown)).not.toContain('](');
	});
});

describe('짝 없는 `[` · 참조 링크 · 링크 안 링크', () => {

	it('C514 짝 없는 `[` 는 글자이고 링크는 짝이 맞는 `[` 부터다', () => {

		const el = render('[link [bar](/uri)');
		const a = anchors(el);
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe('bar');
		expect(el.textContent).toBe('[link bar');
	});

	it('C528 참조 링크도 같은 짝 판정을 부른다', () => {

		const a = anchors(render('[link [foo [bar]]][ref]\n\n[ref]: /uri'));
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe('link [foo [bar]]');
		expect(a[0]?.getAttribute('href')).toBe('/uri');
	});

	// 판정면 자가 확인 — HTML 파서는 `a` 안의 `a` 를 형제 둘로 쪼갠다 (adoption agency).
	// 그래서 정제 뒤 DOM 의 `a a` 는 산출이 `a` 를 겹쳐 내도 0 이다. 겹친 산출은 DOM 에서
	// 링크 둘로 드러난다 — 518 의 입력에서 바깥과 안쪽 후보는 겹치므로 링크가 둘 이상이면
	// 그것은 겹친 산출이다.
	it('겹친 `a` 는 정제 뒤 DOM 에서 `a a` 가 아니라 링크 둘이 된다', () => {

		const el = document.createElement('div');
		el.innerHTML = sanitizeHtml('<a href="/x">foo <a href="/y">bar</a></a>');
		expect(el.querySelectorAll('a a').length).toBe(0);
		expect(anchors(el).length).toBe(2);
	});

	it('C518 링크 안에 링크는 생기지 않는다', () => {

		const el = render('[foo [bar](/uri)](/uri)');
		expect(el.querySelectorAll('a a').length).toBe(0);
		expect(anchors(el).length).toBeLessThanOrEqual(1);
	});
});

describe('대조 — 바뀌지 않는 것', () => {

	it('K513 짝 없는 `]` 는 글자다', () => {

		const markdown = '[link] bar](/uri)';
		const el = render(markdown);
		expect(anchors(el).length).toBe(0);
		expect(el.textContent).toBe(markdown);
	});

	it('KB4 이스케이프된 대괄호는 글자다', () => {

		const a = anchors(render('[a \\] b](https://example.com/)'));
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe('a ] b');
	});

	it('KR17 링크 안 이미지(배지)', () => {

		const el = render('[![배지](https://example.com/b.svg)](https://example.com/)');
		const img = Array.from(el.querySelectorAll('a > img'));
		expect(img.length).toBe(1);
		expect(img[0]?.getAttribute('alt')).toBe('배지');
	});
});
