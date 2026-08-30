import fs from 'node:fs';
import path from 'node:path';

// 바닥 토스터는 높이를 `1em` 으로 못 박고 `overflow: hidden` 을 두고 있었다.
// 두 줄이 된 문구의 둘째 줄이 조용히 잘린다. 실측 (Chrome, 375px, 실제 CSS):
//
//   "Markdown string copied."                     박스 h=48   (한 줄)
//   "<긴 파일명>.pdf URL copied."                  박스 h=48, 내용 64  ← 한 줄 잘림
//
// 이 자리에는 **사용자 파일명이 그대로 실린다** (`FileItem` 의 "<name> URL copied."
// · "URL is not available for <name>."). 이름이 길면 결과 문구 자체가 화면에서
// 사라진다 — 알림이 알리지 못한다.
//
// jsdom 은 레이아웃을 계산하지 않아 이 회귀는 어떤 렌더 테스트에도 걸리지 않는다.
// 규칙의 실재만 정적으로 못 박는다. 수치는 위 실측이 근거다.

const read = (relative: string): string =>
	fs.readFileSync(path.join(process.cwd(), relative), 'utf-8');

const ruleBody = (css: string, selector: string): string | null => {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const matched = new RegExp(`(^|\\})\\s*${escaped}\\s*\\{([^{}]*)\\}`, 'm').exec(css);
	return matched ? (matched[2] ?? null) : null;
};

describe('토스터는 문구를 잘라 내지 않는다', () => {

	const css = () => read('src/Toaster/Toaster.module.css');

	it('바닥 토스터의 높이가 고정되어 있지 않다', () => {

		const body = ruleBody(css(), '.div--toaster-bottom');

		expect(body).not.toBeNull();
		// `height: <값>` 은 안 되고 `min-height` 는 된다.
		expect(body ?? '').not.toMatch(/(^|[;{\s])height\s*:/);
		expect(body ?? '').toMatch(/min-height\s*:/);
	});

	it('세로 방향을 잘라 내지 않는다', () => {

		const body = ruleBody(css(), '.div--toaster-bottom');

		// `overflow: hidden` 은 세로까지 자른다. 가로만 막는다.
		expect(body ?? '').not.toMatch(/(^|[;{\s])overflow\s*:\s*hidden/);
	});

	// 가로는 여전히 막는다 — 긴 토큰이 화면을 밀어내면 안 된다.
	it('긴 토큰은 접고 가로 넘침은 막는다', () => {

		const body = ruleBody(css(), '.div--toaster-bottom');

		expect(body ?? '').toMatch(/overflow-x\s*:\s*(hidden|auto|clip)/);
		expect(body ?? '').toMatch(/overflow-wrap\s*:\s*(break-word|anywhere)/);
	});
});
