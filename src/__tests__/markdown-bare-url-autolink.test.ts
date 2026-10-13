import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 산문에 그냥 쓴 주소는 링크가 된다 (spec `markdown-rendering` §동작 25).
//
// 이 계약이 없던 동안 꺾쇠 없이 쓴 `https://…` · `www.…` 는 글자로만 보였다
// (운영자 신고). 꺾쇠 형태(`<https://…>`)만 링크가 됐다. 판정면은 정제를 거친 DOM
// 이다 — 직렬화 문자열이 아니다.

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const anchors = (el: HTMLElement): HTMLAnchorElement[] => Array.from(el.querySelectorAll('a'));

const BARE = {
	U1: '주소 https://example.com/a?b=1&c=2 를 본다',
	U2: '(https://example.com).',
	U3: 'www.example.com 참고',
	U4: 'https://example.com에서 봐',
	// spec 의 예는 위키백과 한국어판 주소다. 소스(주석 포함)의 실제 호스트는
	// csp-origin-coverage 게이트의 스캔 대상이라 같은 꼴(하위 도메인 · 경로 안 한글)의
	// example 호스트로 쓴다.
	U5: 'https://ko.example.org/wiki/서울',
	U6: 'https://example.com/a**b**c',
	U7: '`https://example.com`',
	U8: '[보기 https://example.com](https://example.com)',
	U9: '<https://example.com>',
	U10: 'https://example.com/path. 다음',
	U11: '*https://example.com*',
	U12: 'xhttps://example.com',
	U13: '```\nhttps://example.com\n```',
};

describe('보이는 글자는 원문 그대로다', () => {

	// U11 의 별표는 강조 구분자라 렌더 텍스트에 남지 않는다 — 주소 글자가 그대로인지를 잰다.
	it.each([
		['U1', BARE.U1, BARE.U1],
		['U2', BARE.U2, BARE.U2],
		['U3', BARE.U3, BARE.U3],
		['U4', BARE.U4, BARE.U4],
		['U5', BARE.U5, BARE.U5],
		['U6', BARE.U6, BARE.U6],
		['U10', BARE.U10, BARE.U10],
		['U11', BARE.U11, 'https://example.com'],
	])('%s 렌더 텍스트 === 입력', (_label, markdown, expected) => {

		expect(render(markdown).textContent).toBe(expected);
	});
});

describe('맨 주소는 링크다', () => {

	it('U1 쿼리까지 링크 · 외부 주소는 새 탭', () => {

		const a = anchors(render(BARE.U1));
		expect(a.length).toBe(1);
		expect(a[0]?.getAttribute('href')).toBe('https://example.com/a?b=1&c=2');
		expect(a[0]?.getAttribute('target')).toBe('_blank');
		expect(a[0]?.getAttribute('rel')).toContain('noreferrer');
	});

	it('U3 `www.` 는 `http://` 를 붙인 주소로 연결되고 글자는 원문이다', () => {

		const a = anchors(render(BARE.U3));
		expect(a.length).toBe(1);
		expect(a[0]?.href).toBe('http://www.example.com/');
		expect(a[0]?.textContent).toBe('www.example.com');
	});

	it('U5 경로 안의 한글은 링크에 포함된다', () => {

		const a = anchors(render(BARE.U5));
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe(BARE.U5);
		expect(a[0]?.getAttribute('href')).toBe(BARE.U5);
	});
});

describe('링크 밖에 남는 것', () => {

	it('U2 짝 없는 닫는 괄호와 끝 문장부호', () => {

		const a = anchors(render(BARE.U2));
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe('https://example.com');
	});

	it('U4 호스트 바로 뒤에 붙은 한글', () => {

		const a = anchors(render(BARE.U4));
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe('https://example.com');
	});

	it('U10 경로 끝의 마침표', () => {

		const a = anchors(render(BARE.U10));
		expect(a.length).toBe(1);
		expect(a[0]?.textContent).toBe('https://example.com/path');
	});

	it('U12 낱말 안에서 시작하는 주소는 링크가 아니다', () => {

		expect(anchors(render(BARE.U12)).length).toBe(0);
	});
});

describe('이중 링크·재가공 금지', () => {

	it('U6 주소 안의 `**` 는 강조가 아니다', () => {

		const el = render(BARE.U6);
		expect(el.querySelectorAll('strong').length).toBe(0);
		expect(anchors(el)[0]?.getAttribute('href')).toBe(BARE.U6);
	});

	it('U7 코드 스팬 안의 주소는 링크가 아니다', () => {

		expect(anchors(render(BARE.U7)).length).toBe(0);
	});

	// 링크 텍스트가 주소로 **시작**하는 `[https://…](…)` 은 여는 태그 자리표시자 바로
	// 뒤라 시작 조건에 우연히 걸리지 않는다 — 텍스트 가운데의 주소여야 함정이 보인다.
	it('U8 링크 텍스트 안의 주소는 다시 링크가 되지 않는다', () => {

		const el = render(BARE.U8);
		expect(anchors(el).length).toBe(1);
		expect(el.querySelectorAll('a a').length).toBe(0);
	});

	it('U9 꺾쇠 형태는 링크 하나다', () => {

		const el = render(BARE.U9);
		expect(anchors(el).length).toBe(1);
		expect(el.querySelectorAll('a a').length).toBe(0);
	});

	it('U11 강조 구분자 사이의 주소', () => {

		const el = render(BARE.U11);
		expect(el.querySelectorAll('em').length).toBe(1);
		expect(el.querySelectorAll('em > a').length).toBe(1);
		expect(anchors(el)[0]?.textContent).toBe('https://example.com');
	});

	it('U13 코드 블록 안의 주소는 링크가 아니다', () => {

		expect(anchors(render(BARE.U13)).length).toBe(0);
	});
});
