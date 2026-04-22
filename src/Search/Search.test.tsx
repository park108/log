import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as mock from './api.mock';
import Search from './Search';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
});

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
const renderWithQueryRouter = (ui: React.ReactNode, { entries = [testEntry] } = {}) => {
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

// REQ-20260421-039 FR-03 — 도메인 에러 보고는 `reportError` 채널로 흐른다.
// `console.error` 직접 호출 금지 (FR-02 negative).
describe('Search reportError 채널 (REQ-20260421-039 FR-03)', () => {

	describe('List API errorType 응답 분기', () => {
		useMockServer(() => mock.prodServerFailed);

		it('errorType 응답 수신 시 reportError 1회 호출 (payload 포함)', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			renderWithQueryRouter(<Search />);

			// errorType 분기 useEffect 는 data 수신 후 동기 side-effect.
			// "No search results." 렌더 대기 = data 반영 완료 시점.
			await screen.findByText("No search results.");

			const calls = vi.mocked(errorReporter.reportError).mock.calls;
			expect(calls.length).toBe(1);
			// payload 는 errorType 필드를 포함하는 body 객체.
			expect(calls[0]![0]).toMatchObject({ errorType: "500" });
		});
	});

	describe('fetch reject catch 분기', () => {
		useMockServer(() => mock.prodServerNetworkError);

		it('network error 수신 시 reportError 1회 호출', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			renderWithQueryRouter(<Search />);

			await screen.findByText("No search results.");

			const calls = vi.mocked(errorReporter.reportError).mock.calls;
			expect(calls.length).toBe(1);
			// error 인자는 Error-like (Failed to fetch / network error).
			expect(calls[0]![0]).toBeDefined();
		});
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
		(document.getElementById("query-string-by-enter") as HTMLInputElement).value = "테스트";
		(document.getElementById("query-string-by-button") as HTMLInputElement).value = "테스트";

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
