import fs from 'node:fs';
import path from 'node:path';

// 끊을 자리가 없는 긴 토큰(URL · 라틴 식별자)은 줄바꿈 기회가 없어 컨테이너를
// 밀어낸다. 실측 (Chrome, 375px, 실제 CSS + 실제 파서 출력):
//
//   본문 · 긴 URL      main scrollWidth 785 / clientWidth 375
//   본문 · 긴 라틴 단어   772 / 375
//   본문 · 긴 링크      716 / 375
//   댓글 · 긴 URL      666 / 359
//   본문 · 긴 한글      375 / 375   ← 한글은 어디서나 끊긴다. 라틴 토큰만의 문제다.
//
// `.main--main-contents` 가 `overflow: auto` 라 문서 자체는 넘치지 않지만, 본문
// 영역이 통째로 가로로 밀려 휴대폰에서 글을 읽을 수 없다. 기술 글과 댓글에 긴
// URL 은 흔하다.
//
// jsdom 은 레이아웃을 계산하지 않으므로 이 회귀는 어떤 렌더 테스트에도 걸리지
// 않는다 — 규칙의 실재만 정적으로 못 박는다. 수치는 위 실측이 근거다.

const read = (relative: string): string =>
	fs.readFileSync(path.join(process.cwd(), relative), 'utf-8');

/** `<selector> { ... }` 블록 본문을 꺼낸다 (중첩 없는 평면 CSS 기준). */
const ruleBody = (css: string, selector: string): string | null => {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const matched = new RegExp(`(^|\\})\\s*${escaped}\\s*\\{([^{}]*)\\}`, 'm').exec(css);
	return matched ? (matched[2] ?? null) : null;
};

const WRAPS = /overflow-wrap\s*:\s*(break-word|anywhere)/;

describe('사용자 글이 놓이는 자리는 긴 토큰을 끊는다', () => {

	it.each([
		['본문', 'src/styles/typography.css', '.section--logitem-contents'],
		['댓글', 'src/Comment/Comment.module.css', '.div--comment-message'],
	])('%s 컨테이너에 줄바꿈 규칙이 있다', (_name, file, selector) => {

		const body = ruleBody(read(file), selector);

		expect(body).not.toBeNull();
		expect(body ?? '').toMatch(WRAPS);
	});

	// 코드 블록은 끊지 않고 **가로로 스크롤** 한다 — 코드는 줄이 바뀌면 뜻이
	// 달라질 수 있어 다른 처리가 맞다. 실측에서 `pre` 는 scrollW 1096 / clientW 341
	// 이었고 자체 스크롤로 도달 가능했다. 두 처리를 뒤섞지 않는다.
	it('코드 블록은 끊는 대신 가로 스크롤을 준다', () => {

		const body = ruleBody(read('src/styles/typography.css'), 'pre');

		expect(body).not.toBeNull();
		expect(body ?? '').toMatch(/overflow-x\s*:\s*(auto|scroll)/);
	});
});
