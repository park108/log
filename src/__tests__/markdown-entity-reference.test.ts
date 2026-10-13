import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import { trimmedContents } from '../Log/api';

// 코드 밖의 유효한 엔티티 참조는 그 문자로 보인다 (spec `markdown-rendering` §동작 23).
//
// 이 계약이 없던 동안 본문 escape 가 `&` 를 무조건 `&amp;` 로 바꿔, 글쓴이가 쓴
// `&copy;` 가 글자 `&copy;` 로 보였다 (운영자 신고). 판정면은 정제를 거친 DOM 의
// 글자·요소 수·속성값과 요약 경로(`trimmedContents`)다 — 직렬화 문자열이 아니다.

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const text = (markdown: string): string => render(markdown).textContent ?? '';

describe('엔티티 참조는 그 문자로 보인다', () => {

	it.each([
		['E1 이름 엔티티', '&copy; 2026', '© 2026'],
		['E2 줄바꿈 없는 공백', '&nbsp;', '\u00A0'],
		['E4 앰퍼샌드', '&amp;', '&'],
		['E5 무효 코드 포인트는 U+FFFD', '&#0; &#x110000;', '\uFFFD \uFFFD'],
		['E14 엔티티 문법을 설명하는 문장', 'HTML 엔티티는 &amp; 로 쓴다', 'HTML 엔티티는 & 로 쓴다'],
	])('%s', (_label, markdown, expected) => {

		expect(text(markdown)).toBe(expected);
	});

	// 무효한 `&…;` 는 지금처럼 글자다.
	it('E6 무효한 참조는 글자 그대로 남는다', () => {

		const markdown = 'AT&T &없는이름;';
		expect(text(markdown)).toBe(markdown);
	});
});

// 해석된 문자는 마크업이 되지 않고 구조에 참여하지 않는다.
describe('해석된 문자는 구조에 참여하지 않는다', () => {

	it('E3 `&#35;` 는 제목을 열지 않는다', () => {

		const el = render('&#35; 제목');
		expect(el.textContent).toBe('# 제목');
		expect(el.querySelectorAll('h1').length).toBe(0);
	});

	it('E10 `&lt;script&gt;` 는 글자이고 요소가 아니다', () => {

		const el = render('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(el.textContent).toBe('<script>alert(1)</script>');
		expect(el.querySelectorAll('script').length).toBe(0);
	});

	it('E11 `&#42;` 는 강조를 열지 않는다', () => {

		const el = render('&#42;굵게 아님&#42;');
		expect(el.textContent).toBe('*굵게 아님*');
		expect(el.querySelectorAll('em').length).toBe(0);
	});
});

// 코드 스팬·코드 블록 안과 백슬래시 뒤는 해석하지 않는다.
describe('코드와 이스케이프 안은 글자다', () => {

	it('E7 코드 스팬 안', () => {

		const el = render('`&copy;`');
		expect(el.querySelector('code')?.textContent).toBe('&copy;');
	});

	it('E8 코드 블록 안', () => {

		const el = render('```\n&copy;\n```');
		expect(el.querySelector('pre')?.textContent).toBe('&copy;');
	});

	it('E9 백슬래시 뒤', () => {

		expect(text('\\&copy;')).toBe('&copy;');
	});
});

// 링크·이미지의 주소와 제목 안 엔티티도 해석된다. 속성값 escape 는 해석 뒤에 건다.
describe('주소와 제목 안의 엔티티', () => {

	it('E12 링크 주소', () => {

		const a = render('[x](https://example.com/?a=1&amp;b=2)').querySelector('a');
		expect(a?.getAttribute('href')).toBe('https://example.com/?a=1&b=2');
	});

	it('E13 이미지 제목', () => {

		const img = render('![a](https://example.com/x.png "&copy; 제목")').querySelector('img');
		expect(img?.getAttribute('title')).toBe('© 제목');
	});

	// 해석된 따옴표가 속성값을 닫으면 그 뒤가 새 속성이 된다.
	it('E15 해석된 따옴표는 속성값을 닫지 않는다', () => {

		const a = render('[x](https://example.com/&#39;x)').querySelector('a');
		expect(a?.getAttribute('href')).toBe("https://example.com/'x");
		expect(a?.getAttributeNames().sort()).toEqual(['href', 'rel', 'target']);
	});
});

// 파서 산출이 해석된 문자를 담으므로 요약도 같은 글자를 보인다.
describe('요약 경로', () => {

	it('trimmedContents 도 해석된 문자를 보인다', () => {

		expect(trimmedContents('&copy; 2026')).toBe('© 2026');
	});
});
