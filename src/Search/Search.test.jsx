import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as mock from './api.mock';
import Search from './Search';
import { useMockServer } from '../test-utils/msw';

console.log = vi.fn();
console.error = vi.fn();

const testEntry = {
	pathname: "/log/search"
	, search: ""
	, hash: ""
	, state: { queryString: "테스트" }
	, key: "default"
};

// REQ-20260420-028 §3.3: Search 는 App 레벨 Provider 를 소비하지만 테스트는 per-call
// QueryClient 로 캐시 누수를 차단한다 (createQueryTestWrapper 와 동일 정책: retry:false,
// staleTime:0, gcTime:0).
const renderWithQueryRouter = (ui, { entries = [testEntry] } = {}) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: 0, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={entries}>
				{ui}
			</MemoryRouter>
		</QueryClientProvider>
	);
};

describe('Search render list result', () => {
	useMockServer(() => mock.prodServerGetList);

	it('render search result', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(<Search />);

		const searchedItem = await screen.findByText("검색을 위해 추가");
		expect(searchedItem).toBeInTheDocument();

		const toListButton = await screen.findByText("To list");
		fireEvent.click(toListButton);
	});
});

describe('Search render single result', () => {
	useMockServer(() => mock.prodServerGetSingle);

	it('render search single result', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(<Search />);

		const searchedItem = await screen.findByText("검색을 위해 추가");
		expect(searchedItem).toBeInTheDocument();

		const toListButton = await screen.findByText("To list");
		fireEvent.click(toListButton);
	});
});

describe('Search render failed', () => {
	useMockServer(() => mock.prodServerFailed);

	it('render search failed', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(<Search />);

		const searchedItem = await screen.findByText("No search results.");
		expect(searchedItem).toBeInTheDocument();
	});
});

describe('Search render network error', () => {
	useMockServer(() => mock.prodServerNetworkError);

	it('render search network error', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(<Search />);

		const searchedItem = await screen.findByText("No search results.");
		expect(searchedItem).toBeInTheDocument();
	});
});

describe('Search render with no query string', () => {
	useMockServer(() => mock.prodServerNoData);

	it('render if has no query string', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		const noQueryString = {
			pathname: "/log/search"
			, search: ""
			, hash: ""
			, state: { queryString: "" }
			, key: "default"
		};

		renderWithQueryRouter(<Search />, { entries: [noQueryString] });

		const searchedItem = await screen.findByText("No search results.");
		expect(searchedItem).toBeInTheDocument();
	});
});

describe('Search navigate to log list via toList button', () => {
	useMockServer(() => mock.prodServerGetList);

	it('render search list and navigate to log list via toList button', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(
			<>
				<input id="query-string-by-enter"></input>
				<input id="query-string-by-button"></input>
				<Search />
			</>
		);

		// Test query string initializing
		document.getElementById("query-string-by-enter").value = "테스트";
		document.getElementById("query-string-by-button").value = "테스트";

		const toListButton = await screen.findByText("To list");
		fireEvent.click(toListButton);
	});
});

describe('Search aborts in-flight fetch on unmount', () => {
	useMockServer(() => mock.prodServerGetList);

	it('aborts in-flight fetch on unmount — no setState after unmount', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const { unmount } = renderWithQueryRouter(<Search />);

		// mount 직후 fetch 는 in-flight. 응답 도착 전 unmount.
		unmount();

		// microtask + macrotask 모두 flush
		await new Promise((r) => setTimeout(r, 0));

		// 기대: React "Cannot update unmounted component" 경고가 0. (NFR-01 per REQ-021)
		const warn = errorSpy.mock.calls.find(args => String(args[0]).includes('unmounted'));
		expect(warn).toBeUndefined();

		errorSpy.mockRestore();
	});
});

describe('Search render with no-data payload', () => {
	useMockServer(() => mock.prodServerNoData);

	it('render search with no-data payload and no-result banner', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(
			<>
				<input id="query-string-by-enter"></input>
				<input id="query-string-by-button"></input>
				<Search />
			</>
		);

		const searchedItem = await screen.findByText("No search results.");
		expect(searchedItem).toBeInTheDocument();
	});
});

// --- Loading dots timer cleanup regression guards (REQ-20260420-004, TSK-20260420-16) ---
// blue spec: specs/30.spec/blue/testing/search-abort-runtime-smoke-spec.md §3.11
describe('loading dots timer cleanup', () => {

	const getLoadingDotsText = () => document.getElementById('loading')?.textContent ?? '';

	// fetch 를 미해결 promise 로 stub → isLoading=true 가 유지되어 dots 애니메이션 관찰 가능
	const stubPendingFetch = () => {
		return vi.spyOn(globalThis, 'fetch').mockImplementation(
			() => new Promise(() => { /* never resolves */ })
		);
	};

	beforeEach(() => {
		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);
		vi.useFakeTimers({ shouldAdvanceTime: false });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it('loading dots increment every 300ms while isLoading', () => {
		stubPendingFetch();

		renderWithQueryRouter(<Search />);

		// 초기 진입: isLoading=true 전이 후 dots 는 "".
		expect(getLoadingDotsText()).toBe('');

		act(() => { vi.advanceTimersByTime(300); });
		expect(getLoadingDotsText()).toBe('.');

		act(() => { vi.advanceTimersByTime(300); });
		expect(getLoadingDotsText()).toBe('..');

		act(() => { vi.advanceTimersByTime(300); });
		expect(getLoadingDotsText()).toBe('...');

		// prev.length >= 3 → "" 로 재시작 (권장안 로직)
		act(() => { vi.advanceTimersByTime(300); });
		expect(getLoadingDotsText()).toBe('');
	});

	it('does not setLoadingDots after unmount (no stale interval tick)', () => {
		stubPendingFetch();

		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const { unmount } = renderWithQueryRouter(<Search />);

		// 최소 1회 tick 경과시켜 interval 등록 상태 확인.
		act(() => { vi.advanceTimersByTime(300); });
		expect(getLoadingDotsText()).toBe('.');

		unmount();

		// unmount 후 추가 tick 예약 시도 — clearInterval 이 정합이면 경고 0.
		act(() => { vi.advanceTimersByTime(900); });

		const unmountedWarn = errSpy.mock.calls.filter(
			c => String(c[0]).includes('unmounted')
		);
		expect(unmountedWarn.length).toBe(0);
	});
});
