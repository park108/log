import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 참조 링크의 인라인 우선과 정의 수집 범위 — 렌더 텍스트를 잰다
// (spec `markdown-rendering` §동작 24 둘째·셋째 하위 항목).
//
// - 인라인 링크에 밀린 라벨은 참조되지 않은 것이다 — 그 정의 줄은 글자로 남는다.
// - 정의는 최상위 문단 줄에서만 수집된다 — 인용·목록 항목 안 정의 줄은 정의가 아니고
//   (같은 컨테이너 안이어도), 게으른 이어짐 줄은 목록 항목 문단의 이어짐이다.
//
// `markdown-reference-link.test.ts` R12b 는 같은 입력의 `href` 목록만 단언한다.
// 인라인 링크 텍스트와 같은 라벨을 "참조됨" 으로 표시해 정의 줄을 걷는 변형에서도
// `href` 는 `["/b"]` 그대로라 그쪽은 초록이다 — 이 파일은 렌더 텍스트로 그 변형을 잡는다.
// 판정면은 정제를 거친 DOM 이다 — 직렬화 문자열이 아니다.

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

type Expected = { hrefs: string[]; text: string };

const SCOPE: Record<string, [string, Expected]> = {
	P2: ['[a](/b)\n\n[a]: /x', { hrefs: ['/b'], text: 'a[a]: /x' }], // 밀린 정의 줄
	K1: ['[a]\n\n> [a]: /q', { hrefs: [], text: '[a][a]: /q' }], // 인용 안 정의
	K2: ['[a]\n\n- [a]: /li2', { hrefs: [], text: '[a][a]: /li2' }], // 목록 항목 안 정의
	K3: ['- [a]\n\n  [a]: /li3', { hrefs: [], text: '[a][a]: /li3' }], // 같은 항목 안
	K4: ['> [a]\n>\n> [a]: /q2', { hrefs: [], text: '[a][a]: /q2' }], // 같은 인용 안
	L1: ['- 항목 [a]\n[a]: /li', { hrefs: [], text: '항목 [a][a]: /li' }], // 게으른 이어짐
	P1: ['[a](/b)[c]\n\n[c]: /d', { hrefs: ['/b', '/d'], text: 'ac' }], // 대조 — [c] 만 참조 후보
};

const check = (name: string): void => {

	const [markdown, expected] = SCOPE[name] as [string, Expected];
	const el = render(markdown);
	const anchors = Array.from(el.querySelectorAll('a'));

	expect(anchors.length).toBe(expected.hrefs.length);
	expect(anchors.map((a) => a.getAttribute('href'))).toEqual(expected.hrefs);
	expect(el.textContent).toBe(expected.text);
};

describe('인라인 링크에 밀린 라벨은 참조되지 않은 것이다', () => {

	it('P2 `[a](/b)` 뒤 `[a]: /x` — 링크는 인라인 주소, 정의 줄은 글자로 남는다', () => {
		check('P2');
	});

	it('P1 (대조) `[a](/b)[c]` — `[c]` 만 참조되어 그 정의 줄만 걷힌다', () => {
		check('P1');
	});
});

describe('정의는 최상위 문단 줄에서만 수집된다', () => {

	it('K1 인용 안 정의 줄은 정의가 아니다', () => {
		check('K1');
	});

	it('K2 목록 항목 안 정의 줄은 정의가 아니다', () => {
		check('K2');
	});

	it('K3 같은 목록 항목 안이어도 정의가 아니다', () => {
		check('K3');
	});

	it('K4 같은 인용 안이어도 정의가 아니다', () => {
		check('K4');
	});

	it('L1 게으른 이어짐 줄은 목록 항목 문단의 이어짐이다', () => {
		check('L1');
	});
});
