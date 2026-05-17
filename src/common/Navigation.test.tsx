import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from './Navigation';
import * as common from './common';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('render navigation menu correctly', () => {

	const activatedListItemClass = "li li--nav-active";

	// REQ-20260420-002 FR-01 / TSK-20260420-37 §C — getUrl() 런타임이 isDev()/isProd()
	// (= `import.meta.env.DEV/PROD`) 경유로 전환되면서, vitest 기본 `DEV=true` 가
	// 활성화된 상태에서는 `<a href="http://localhost:3000/">` 가 렌더돼
	// 아래 `render title menu correctly` 의 baseline assertion (`<a>park108.net</a>`) 이
	// 회귀한다. 본 describe 내부는 명시적으로 `stubMode('test')` 로 DEV/PROD 모두 false
	// 로 고정해 baseline 의 href-미설정 동작을 보존한다.
	// REQ-20260420-009 — render title 어설션을 intent-based 로 재설계해 env 분기와 assertion 을 분리.
	const stubMode = (mode: string): void => {
		vi.stubEnv('MODE', mode);
		vi.stubEnv('DEV', mode === 'development');
		vi.stubEnv('PROD', mode === 'production');
	};

	beforeEach(() => stubMode('test'));

	it('render title menu correctly', () => {

		// Mocking login and admin check
		vi.spyOn(common, "isLoggedIn").mockResolvedValue(false);
		vi.spyOn(common, "isAdmin").mockResolvedValue(false);

		const testEntry = {
			pathname: "/log"
			, search: ""
			, hash: ""
			, state: null
			, key: "default"
		};

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<Navigation />
			</MemoryRouter>
		);

		const link = screen.getByText("park108.net").closest('a');

		expect(link).not.toBeNull();
		const href = link!.getAttribute('href');
		expect(href === null || /^https?:\/\//.test(href)).toBe(true);
	});

	it('render file menu correctly', () => {

		// Mocking login and admin check
		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);

		const testEntry = {
			pathname: "/file"
			, search: ""
			, hash: ""
			, state: null
			, key: "default"
		};

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<Navigation />
			</MemoryRouter>
		);
		
		// Is a anchor tag exist?
		const anchor = screen.getByText("file").closest('a');

		const expected = document.createElement("a");
		expected.setAttribute("data-discover", "true");
		expected.setAttribute("href", "/file");
		expected.innerHTML = "file";

		expect(expected).toStrictEqual(anchor);

		// Is this menu's class active now?
		const li = anchor!.parentNode as HTMLElement | null;
		const liClass = li!.getAttribute("class");

		expect(liClass).toStrictEqual(activatedListItemClass);
	});

	it('render monitor menu correctly', async () => {

		// Mocking login and admin check
		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);

		const testEntry = {
			pathname: "/monitor"
			, search: ""
			, hash: ""
			, state: null
			, key: "default"
		};

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<Navigation />
			</MemoryRouter>
		);
		
		// Is a anchor tag exist?
		const anchor = screen.getByText("mon").closest('a');

		const expected = document.createElement("a");
		expected.setAttribute("data-discover", "true");
		expected.setAttribute("href", "/monitor");
		expected.innerHTML = "mon";

		expect(expected).toStrictEqual(anchor);

		// Is this menu's class active now?
		const li = anchor!.parentNode as HTMLElement | null;
		const liClass = li!.getAttribute("class");

		expect(liClass).toStrictEqual(activatedListItemClass);
	});
});