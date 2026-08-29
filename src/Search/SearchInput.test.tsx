import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import * as common from "../common/common";
import { waitForToasterVisible, waitForToasterHidden } from '../test-utils/toaster';
import SearchInput from './SearchInput';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

const testEntry = {
	pathname: "/log"
	, search: ""
	, hash: ""
	, state: null
	, key: "default"
};

describe('test key up events', () => {

	let inputElement: HTMLInputElement | null = null;
	let searchButton: HTMLElement | null = null;
	let mobileSearchButton: HTMLElement | null = null;

	it('firing keyUp event', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		inputElement = screen.getAllByPlaceholderText("Input search string...")[0] as HTMLInputElement;
		searchButton = screen.getByText("go");
		mobileSearchButton = screen.getByText("search");

		fireEvent.keyUp(inputElement, { keyCode: 97 });
		fireEvent.keyUp(inputElement, { keyCode: 98 });
		fireEvent.keyUp(inputElement, { keyCode: 99 });

		inputElement.value = "테스트";
		fireEvent.keyUp(inputElement, { keyCode: 13 });

		expect(searchButton).toBeDefined();
		fireEvent.click(searchButton);

		expect(mobileSearchButton).toBeDefined();
		fireEvent.click(mobileSearchButton);
		fireEvent.click(mobileSearchButton);
	});

	it('mobile search toggle is a focusable button (role=button)', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		// 패턴 A: <span onClick> 을 <button type="button"> 으로 교체.
		// getByRole('button', { name: /search/i }) 은 go 버튼과 충돌하므로 텍스트로 한정.
		const toggle = screen.getByText("search");
		expect(toggle.tagName).toBe("BUTTON");
		expect(toggle.getAttribute("type")).toBe("button");

		// <button> 은 브라우저 기본으로 포커스 가능하며 Enter/Space 에서 click 이 합성된다.
		toggle.focus();
		expect(document.activeElement).toBe(toggle);
	});

	it('mobile search toggle activates on Enter key (click synthesis)', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		const toggle = screen.getByText("search");

		// 브라우저는 <button> 에서 Enter 를 click 으로 합성한다.
		// jsdom 은 합성을 수행하지 않으므로, Enter 가 활성화하는 최종 동작(click) 을 어서트.
		fireEvent.click(toggle);

		const mobileSearch = document.getElementById("mobile-search");
		expect(mobileSearch!.getAttribute("class")).toContain("search-mobile");
	});

	it('mobile search toggle activates on Space key (click synthesis)', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		const toggle = screen.getByText("search");

		// 브라우저는 <button> 에서 Space 를 click 으로 합성한다.
		fireEvent.click(toggle);
		// 두 번째 클릭으로 토글이 hide 로 되돌아오는지도 확인.
		fireEvent.click(toggle);

		const mobileSearch = document.getElementById("mobile-search");
		expect(mobileSearch!.getAttribute("class")).toContain("search-mobilehide");
	});

	it('firing search when the search string is null', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(false);

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);
	
		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		inputElement = screen.getAllByPlaceholderText("Input search string...")[0] as HTMLInputElement;

		vi.useFakeTimers({ shouldAdvanceTime: true });

		inputElement.value = "";
		fireEvent.keyUp(inputElement, { keyCode: 13 });

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		const nullStringAlert = await screen.findByText("Enter the keyword to search for");
		expect(nullStringAlert).toBeDefined();
	});
});

// 검색 실행 경로는 지금까지 한 번도 실행되지 않았다. 기존 스모크 테스트가
// `input.value = "..."` 로 **DOM 값을 직접** 넣었기 때문이다 — React 의 onChange 를
// 우회하므로 queryString 상태는 빈 문자열로 남고, Enter 가 "빈 질의" 분기로 빠진다.
// 그 결과 navigate 호출부(SearchInput.tsx:39-40)와 세 입력의 onChange 가 전부
// 미커버였다. 상태를 실제로 태우는 경로로 못 박는다.
const LocationProbe = () => {
	const location = useLocation();
	return (
		<div
			data-testid="probe"
			data-path={location.pathname}
			data-query={(location.state as { queryString?: string } | null)?.queryString ?? ''}
		/>
	);
};

const renderWithRoutes = () => render(
	<MemoryRouter initialEntries={[ testEntry ]}>
		<SearchInput />
		<LocationProbe />
		<Routes>
			<Route path="/log/search" element={<div data-testid="search-page" />} />
		</Routes>
	</MemoryRouter>
);

describe('검색 실행', () => {

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);
	});

	it('질의어를 입력하고 Enter 를 누르면 검색 화면으로 이동하며 질의어를 넘긴다', async () => {

		renderWithRoutes();

		const input = screen.getAllByPlaceholderText('Input search string...')[0] as HTMLInputElement;

		// change 이벤트로 넣어야 React 상태가 실제로 바뀐다.
		fireEvent.change(input, { target: { value: '사과' } });
		expect(input.value).toBe('사과');

		await act(async () => {
			fireEvent.keyUp(input, { keyCode: 13 });
		});

		expect(await screen.findByTestId('search-page')).toBeInTheDocument();

		const probe = screen.getByTestId('probe');
		expect(probe).toHaveAttribute('data-path', '/log/search');
		// 질의어가 실려야 한다 — 이동만 하고 빈 질의를 넘기면 검색 결과가 비어 보인다.
		expect(probe).toHaveAttribute('data-query', '사과');
	});

	it('질의어가 비어 있으면 이동하지 않는다', async () => {

		renderWithRoutes();

		const input = screen.getAllByPlaceholderText('Input search string...')[0] as HTMLInputElement;

		await act(async () => {
			fireEvent.keyUp(input, { keyCode: 13 });
		});

		// 대조 — 위 케이스가 "Enter 만 누르면 늘 이동" 으로 통과하지 않게 한다.
		expect(screen.queryByTestId('search-page')).toBeNull();
		expect(screen.getByTestId('probe')).toHaveAttribute('data-path', '/log');
	});
});

describe('모바일 검색 패널', () => {

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);
	});

	it('모바일 입력으로 검색하면 이동하고 패널이 닫힌다', async () => {

		renderWithRoutes();

		// 토글을 눌러 패널을 연다.
		fireEvent.click(screen.getByText('search'));
		const panel = document.getElementById('mobile-search');
		expect(panel?.className).toContain('search-mobile');

		// 데스크톱 입력과 모바일 입력은 별개 요소다 — 두 번째가 모바일 쪽이다.
		const inputs = screen.getAllByPlaceholderText('Input search string...') as HTMLInputElement[];
		expect(inputs.length).toBeGreaterThan(1);

		fireEvent.change(inputs[1]!, { target: { value: '복숭아' } });

		await act(async () => {
			fireEvent.click(screen.getByText('go'));
		});

		expect(await screen.findByTestId('search-page')).toBeInTheDocument();
		expect(screen.getByTestId('probe')).toHaveAttribute('data-query', '복숭아');

		// 검색이 성립하면 패널은 닫힌다 (SearchInput.tsx:39).
		expect(document.getElementById('mobile-search')?.className).toContain('search-mobilehide');
	});
});

describe('비관리자 변형', () => {

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);
	});

	it('입력과 검색이 관리자 변형과 동일하게 동작한다', async () => {

		renderWithRoutes();

		// 비관리자에는 모바일 토글이 없다 — 입력 1개뿐이다.
		expect(screen.queryByText('search')).toBeNull();
		const inputs = screen.getAllByPlaceholderText('Input search string...') as HTMLInputElement[];
		expect(inputs).toHaveLength(1);

		fireEvent.change(inputs[0]!, { target: { value: '배' } });

		await act(async () => {
			fireEvent.keyUp(inputs[0]!, { keyCode: 13 });
		});

		expect(await screen.findByTestId('search-page')).toBeInTheDocument();
		expect(screen.getByTestId('probe')).toHaveAttribute('data-query', '배');
	});
});

describe('빈 질의 토스터', () => {

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);
	});

	// 토스터의 completed 콜백은 duration 뒤에 부르는 실타이머 콜백이라, 시각을
	// 고정하지 않으면 커버 여부가 실행 시각에 따라 갈린다 (Comment.tsx:261 과 동일
	// 부류 — 그쪽은 전수 커버리지를 실행 순서마다 흔들었다).
	it('빈 질의로 뜬 토스터가 duration 경과 후 스스로 닫힌다', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true });

		renderWithRoutes();

		const input = screen.getAllByPlaceholderText('Input search string...')[0] as HTMLInputElement;

		await act(async () => {
			fireEvent.keyUp(input, { keyCode: 13 });
		});

		await waitForToasterVisible('warning', 'bottom');

		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000);
		});

		await waitForToasterHidden('warning', 'bottom');
	});
});
