import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 본문 번호 목록의 표지는 첫 번호의 자릿수와 무관하게 잘리지 않는다
// (spec `logitem-ordered-list-marker-visible` §동작 1~3 · §수용 기준 2).
//
// 바깥 표지는 `li` 왼쪽 바깥에 그려지고 그 자리는 article 패딩 1em + ol 패딩 1.4em
// = 38.4px(16px) 뿐이다. 더 넓은 표지는 `overflow: auto` 인 `main` 의 왼쪽 끝에서
// 잘린다 — `2024. 회고` 로 시작하는 글에서 독자는 `024.` 를 봤다. jsdom 에는 레이아웃이
// 없어 잘림 자체는 여기서 잴 수 없다. **판정면은 실제 레이아웃이다**
// (`scripts/check-ordered-list-marker-visible.mjs`). 이 파일은 CI 쪽 대리로, 착지한
// 수단 — 파서가 첫 번호의 자릿수를 `ol` 의 class 로 싣고 `typography.css` 가 그 class 에
// 표지 폭만큼의 패딩을 준다 — 이 정제를 지나 계산 스타일까지 닿는지를 못 박는다.
// 같은 결과를 내는 다른 CSS 로 바꾸면 이 파일이 붉어질 수 있다. 그때는 레이아웃
// 판정을 다시 돌리고 이 파일을 갱신한다.
//
// 수치 근거 — 레이아웃 판정 출력 (2026-10-13, Chrome headless, 16px; 표지·li 왼쪽 끝은
// `main` 기준 px; 표지 왼쪽 끝은 "li 내용 왼쪽 끝 − `N. ` 폭" 근사):
//
//   착지 전 (수단 없음 — 넓은 둘만 옮긴다. 1280 은 375 와 같은 값이고 좁은 둘은 착지 후와 같다)
//     mode=as-is webfont=loaded width=375 start=2024 class=- padding=22.4px ch=9.53 marker="2024. " marker-w=47.39 marker-left=-9.00 li-left=38.39 list-style=outside/decimal verdict=clipped
//     mode=as-is webfont=loaded width=375 start=20241231 class=- padding=22.4px ch=9.53 marker="20241231. " marker-w=86.70 marker-left=-48.31 li-left=38.39 list-style=outside/decimal verdict=clipped
//     mode=no-pretendard webfont=absent width=375 start=2024 class=- padding=22.4px ch=10.08 marker="2024. " marker-w=47.69 marker-left=-9.30 li-left=38.39 list-style=outside/decimal verdict=clipped
//     mode=no-pretendard webfont=absent width=375 start=20241231 class=- padding=22.4px ch=10.08 marker="20241231. " marker-w=86.75 marker-left=-48.36 li-left=38.39 list-style=outside/decimal verdict=clipped
//     clipped=8 moved=0 measured=16/16                                       → exit 1
//
//   착지 후
//     html start=2024 <ol start="2024" class="ol--marker-digits-4"><li>회고</li><li>계획</li></ol>
//     html start=20241231 <ol start="20241231" class="ol--marker-digits-8"><li>x</li></ol>
//     html start=1 <ol><li>하나</li><li>둘</li></ol>
//     html start=10 <ol start="10"><li>열</li><li>열하나</li></ol>
//     mode=as-is webfont=loaded width=375 start=2024 class=ol--marker-digits-4 padding=46.125px ch=9.53 marker="2024. " marker-w=47.39 marker-left=14.73 li-left=62.13 list-style=outside/decimal verdict=ok
//     mode=as-is webfont=loaded width=375 start=20241231 class=ol--marker-digits-8 padding=84.25px ch=9.53 marker="20241231. " marker-w=86.70 marker-left=13.55 li-left=100.25 list-style=outside/decimal verdict=ok
//     mode=as-is webfont=loaded width=375 start=1 class=- padding=22.4px ch=9.53 marker="1. " marker-w=17.91 marker-left=20.48 li-left=38.39 list-style=outside/decimal verdict=ok
//     mode=as-is webfont=loaded width=375 start=10 class=- padding=22.4px ch=9.53 marker="10. " marker-w=27.73 marker-left=10.66 li-left=38.39 list-style=outside/decimal verdict=ok
//     mode=as-is webfont=loaded width=1280 start=2024 class=ol--marker-digits-4 padding=46.125px ch=9.53 marker="2024. " marker-w=47.39 marker-left=14.73 li-left=62.13 list-style=outside/decimal verdict=ok
//     mode=as-is webfont=loaded width=1280 start=20241231 class=ol--marker-digits-8 padding=84.25px ch=9.53 marker="20241231. " marker-w=86.70 marker-left=13.55 li-left=100.25 list-style=outside/decimal verdict=ok
//     mode=as-is webfont=loaded width=1280 start=1 class=- padding=22.4px ch=9.53 marker="1. " marker-w=17.91 marker-left=20.48 li-left=38.39 list-style=outside/decimal verdict=ok
//     mode=as-is webfont=loaded width=1280 start=10 class=- padding=22.4px ch=9.53 marker="10. " marker-w=27.73 marker-left=10.66 li-left=38.39 list-style=outside/decimal verdict=ok
//     mode=no-pretendard webfont=absent width=375 start=2024 class=ol--marker-digits-4 padding=48.3125px ch=10.08 marker="2024. " marker-w=47.69 marker-left=16.63 li-left=64.31 list-style=outside/decimal verdict=ok
//     mode=no-pretendard webfont=absent width=375 start=20241231 class=ol--marker-digits-8 padding=88.625px ch=10.08 marker="20241231. " marker-w=86.75 marker-left=17.88 li-left=104.63 list-style=outside/decimal verdict=ok
//     mode=no-pretendard webfont=absent width=375 start=1 class=- padding=22.4px ch=10.08 marker="1. " marker-w=18.39 marker-left=20.00 li-left=38.39 list-style=outside/decimal verdict=ok
//     mode=no-pretendard webfont=absent width=375 start=10 class=- padding=22.4px ch=10.08 marker="10. " marker-w=28.16 marker-left=10.23 li-left=38.39 list-style=outside/decimal verdict=ok
//     mode=no-pretendard webfont=absent width=1280 start=2024 class=ol--marker-digits-4 padding=48.3125px ch=10.08 marker="2024. " marker-w=47.69 marker-left=16.63 li-left=64.31 list-style=outside/decimal verdict=ok
//     mode=no-pretendard webfont=absent width=1280 start=20241231 class=ol--marker-digits-8 padding=88.625px ch=10.08 marker="20241231. " marker-w=86.75 marker-left=17.88 li-left=104.63 list-style=outside/decimal verdict=ok
//     mode=no-pretendard webfont=absent width=1280 start=1 class=- padding=22.4px ch=10.08 marker="1. " marker-w=18.39 marker-left=20.00 li-left=38.39 list-style=outside/decimal verdict=ok
//     mode=no-pretendard webfont=absent width=1280 start=10 class=- padding=22.4px ch=10.08 marker="10. " marker-w=28.16 marker-left=10.23 li-left=38.39 list-style=outside/decimal verdict=ok
//     clipped=0 moved=0 measured=16/16                                       → exit 0
//
// 좁은 둘(1 · 10)의 marker-left · li-left 는 착지 전후가 같다 (spec 동작 2).

const LIST = {
	W4: '2024. 회고\n2025. 계획',
	W8: '20241231. x',
	N1: '1. 하나\n2. 둘',
	N2: '10. 열\n11. 열하나',
} as const;

const CSS = readFileSync(path.join(process.cwd(), 'src/styles/typography.css'), 'utf-8');

let style: HTMLStyleElement;

beforeAll(() => {
	style = document.createElement('style');
	style.textContent = CSS;
	document.head.appendChild(style);
});

afterAll(() => {
	style.remove();
});

afterEach(() => {
	document.body.innerHTML = '';
});

// 본문과 같은 자리 — 규칙은 `.section--logitem-contents` 아래에서만 건다.
const renderList = (markdown: string): HTMLOListElement => {
	const section = document.createElement('section');
	section.className = 'section section--logitem-contents';
	section.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	document.body.appendChild(section);
	const ol = section.querySelector('ol');
	if(!ol) throw new Error('번호 목록이 없다: ' + JSON.stringify(markdown));
	return ol;
};

const padding = (ol: Element): string =>
	getComputedStyle(ol).getPropertyValue('padding-inline-start').replace(/\s+/g, ' ').trim();

const markerSpace = (digits: number): string => 'calc(' + digits + 'ch + 0.5em)';

describe('번호 목록 표지는 잘리지 않는다 — 정제를 지난 계산 스타일', () => {

	it('W4 · 네 자리 첫 번호는 숫자 넷 + ". " 의 표지 공간을 받는다', () => {
		const ol = renderList(LIST.W4);
		expect(ol.getAttribute('start')).toBe('2024');
		expect(padding(ol)).toBe(markerSpace(4));
	});

	it('W8 · 여덟 자리 첫 번호는 숫자 여덟 + ". " 의 표지 공간을 받는다', () => {
		const ol = renderList(LIST.W8);
		expect(ol.getAttribute('start')).toBe('20241231');
		expect(padding(ol)).toBe(markerSpace(8));
	});

	// 세 자리부터 아홉 자리(CommonMark 의 번호 표지 상한)까지 빠짐없이 — 파서가 내는
	// 자릿수마다 CSS 규칙이 있어야 한다. 하나라도 빠지면 그 자릿수의 표지는 다시
	// 38.4px 에 갇힌다.
	it('3~9자리 첫 번호마다 그 자릿수의 표지 공간이 계산 스타일에 닿는다', () => {
		for(let digits = 3; digits <= 9; digits++) {
			const first = '1' + '0'.repeat(digits - 1);
			const ol = renderList(first + '. x\n' + first.replace(/0$/, '1') + '. y');
			expect({ digits, start: ol.getAttribute('start'), padding: padding(ol) })
				.toEqual({ digits, start: first, padding: markerSpace(digits) });
		}
	});
});

describe('1~2자리 목록은 그대로다 (spec 동작 2)', () => {

	it('N1 · 첫 번호 1 — 산출 문자열이 종전 그대로이고 패딩은 1.4em', () => {
		expect(markdownToHtml(LIST.N1)).toBe('<ol><li>하나</li><li>둘</li></ol>');
		expect(padding(renderList(LIST.N1))).toBe('1.4em');
	});

	it('N2 · 첫 번호 10 — 산출 문자열이 종전 그대로이고 패딩은 1.4em', () => {
		expect(markdownToHtml(LIST.N2)).toBe('<ol start="10"><li>열</li><li>열하나</li></ol>');
		expect(padding(renderList(LIST.N2))).toBe('1.4em');
	});

	// 자릿수는 앞자리 0 을 걷은 번호로 센다 — `003.` 은 한 자리 `3` 이다.
	it('앞자리 0 은 자릿수에 들지 않는다', () => {
		const ol = renderList('003. x');
		expect(ol.getAttribute('start')).toBe('3');
		expect(ol.hasAttribute('class')).toBe(false);
		expect(padding(ol)).toBe('1.4em');
	});
});
