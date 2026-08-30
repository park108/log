import fs from 'node:fs';
import path from 'node:path';

// 앱 셸 래퍼는 **두 조각이 함께 있어야만** 성립한다.
//
//   (1) `App.tsx` 가 `div--app-shell` 래퍼로 라우터를 감싼다 — 오프라인 알림이
//       떠 있는 동안에도 앱 트리를 마운트 상태로 유지하기 위한 것이다.
//   (2) `utilities.css` 가 그 래퍼를 `display: contents` 로 박스 트리에서 뺀다.
//
// (2) 가 사라지면 래퍼는 평범한 블록이 되어 `#root` 의 flex 컬럼을 끊는다.
// 실측(Chrome, 375px, 짧은 본문): footer 가 y=1276.81 → 120.80 으로 올라와
// 화면 중간에 떴고 main 높이가 1175.02 → 19 로 주저앉았다. jsdom 은 레이아웃을
// 계산하지 않으므로 이 회귀는 어떤 렌더 테스트에도 걸리지 않는다 — 그래서
// 두 조각의 공존만 정적으로 못 박는다.
//
// `[hidden]` 규칙도 함께 본다. UA 스타일시트의 `[hidden] { display: none }` 은
// 저자 선언인 `display: contents` 에 지므로, 저자 쪽에서 다시 주지 않으면
// 오프라인일 때 앱이 알림 뒤에 그대로 보인다.

const read = (relative: string) =>
	fs.readFileSync(path.join(process.cwd(), relative), 'utf-8');

const SHELL_CLASS = 'div--app-shell';

describe('app shell 래퍼는 CSS 와 짝이 맞는다', () => {

	it('App.tsx 가 래퍼를 쓰면 utilities.css 에 display: contents 규칙이 있다', () => {

		const app = read('src/App.tsx');
		const css = read('src/styles/utilities.css');

		expect(app).toContain(SHELL_CLASS);

		expect(css).toMatch(
			new RegExp(`\\.${SHELL_CLASS}\\s*\\{[^{}]*display\\s*:\\s*contents`)
		);
	});

	it('감춤 규칙이 저자 스타일시트에 있다', () => {

		const css = read('src/styles/utilities.css');

		expect(css).toMatch(
			new RegExp(`\\.${SHELL_CLASS}\\[hidden\\]\\s*\\{[^{}]*display\\s*:\\s*none`)
		);
	});

	it('래퍼에는 hidden 속성이 온라인 여부로 걸린다', () => {

		const app = read('src/App.tsx');

		expect(app).toMatch(new RegExp(`className="[^"]*${SHELL_CLASS}[^"]*"\\s*hidden=\\{!isOnline\\}`));
	});
});
