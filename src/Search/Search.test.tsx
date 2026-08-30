import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import Search from './Search';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';

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

// REQ-20260420-028 §3.3 / REQ-20260519-001 — Search 는 App 레벨 Provider 를 소비하지만
// 테스트는 `createQueryTestWrapper` 단일 출처 helper 를 경유해 per-call 격리 QueryClient 로
// 캐시 누수를 차단한다 (정책 토큰: retry:false, staleTime:0, gcTime:0, mutations.retry:false).
const renderWithQueryRouter = (ui: React.ReactNode, { entries = [testEntry] } = {}) => {
	const { Wrapper: QueryWrapper } = createQueryTestWrapper();
	return render(
		<QueryWrapper>
			<MemoryRouter initialEntries={entries}>
				{ui}
			</MemoryRouter>
		</QueryWrapper>
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

		// 실패는 "결과 0건" 과 구별되어야 한다 — 같은 화면을 쓰면 사용자는 요청
		// 실패를 검색어 부재로 읽는다.
		const searchedItem = await screen.findByText("Search failed.");
		expect(searchedItem).toBeInTheDocument();
		expect(screen.queryByText("No search results.")).toBeNull();
		expect(screen.getByTestId("search-retry-button")).toBeInTheDocument();
	});
});

describe('Search render network error', () => {
	useMockServer(() => mock.prodServerNetworkError);

	it('render search network error', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(<Search />);

		const searchedItem = await screen.findByText("Search failed for network issue.");
		expect(searchedItem).toBeInTheDocument();
		expect(screen.queryByText("No search results.")).toBeNull();
		expect(screen.getByTestId("search-retry-button")).toBeInTheDocument();
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
			// 실패 표면 렌더 = data 반영 완료 시점.
			await screen.findByText("Search failed.");

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

			await screen.findByText("Search failed for network issue.");

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

		// 이 단정은 "No search results." 를 박고 있었다 — 질의어가 없는 상태를
		// 결과 0건과 같은 화면으로 취급한 것이다. 하지도 않은 검색이 실패한 것처럼
		// 읽히므로 안내문으로 가른다. 저장소가 이미 지키는 원칙과 같다:
		// 조회 실패와 결과 0건은 서로 다르게 보여야 한다.
		const prompt = await screen.findByText("Type a keyword to search.");
		expect(prompt).toBeInTheDocument();
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

		// 관측 창을 unmount 이후로 한정한다 — errorSpy 는 render 이전에 설치돼
		// 마운트 중 발화까지 담고 있다 (:305-312 가 같은 이유로 mockClear 를 둔다).
		errorSpy.mockClear();

		// mount 직후 fetch 는 in-flight. 응답 도착 전 unmount.
		unmount();

		// microtask + macrotask 모두 flush
		await new Promise((r) => setTimeout(r, 0));

		// **무필터** console.error 0 hit. `.includes('unmounted')` 필터는 제거했다 —
		// React 18.2 는 unmount 된 fiber 의 setState 에 경고를 내지 않으므로 그 필터의
		// 결과는 코드 상태와 무관하게 항상 0 이었다 (민감도 0). 구조 판정은 G-F 가 본다.
		expect(errorSpy).not.toHaveBeenCalled();

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
		vi.runOnlyPendingTimers();
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

		// 관측 창을 unmount 이후로 한정한다 — 마운트 중 발화까지 세면
		// 단정이 성립하지 않는다 (현재 마운트 중 발화는 0 이지만 창을 명시한다).
		errSpy.mockClear();
		unmount();

		// unmount 후 추가 tick 예약 시도 — clearInterval 이 정합이면 경고 0.
		act(() => { vi.advanceTimersByTime(900); });

		// **무필터** console.error 0 hit. `.includes('unmounted')` 필터는 제거했다 —
		// React 18.2 는 unmount 된 fiber 의 setState 에 경고를 내지 않으므로 그 필터의
		// 결과는 코드 상태와 무관하게 항상 0 이었다 (민감도 0. 리터럴 문구 grep 으로는
		// 이 변형이 잡히지 않아 채널의 G-F 가 구조로 판정한다).
		expect(errSpy).not.toHaveBeenCalled();
	});
});

// 결과 요약 문구의 복수형.
//
// 두 분기가 서로 다른 규칙을 쓰고 있었다 — N건 분기는 `result{s}` 로 복수를
// 처리했지만 0건 분기는 "0 result" 로 고정이었고, 처리 시간은 양쪽 다
// "1 milliseconds" 를 냈다. 한 헬퍼로 합쳤다.
describe('결과 요약 문구 — 복수형', () => {

	describe('0건', () => {
		useMockServer(() => mock.prodServerNoData);

		it('"0 results" 로 적는다', async () => {
			// 요약 문구는 질의어가 <span> 으로 쪼개져 있어 텍스트 매처로는 못 잡는다.

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			const { container } = renderWithQueryRouter(<Search />);
			await screen.findByText('No search results.');
			expect(container.textContent).toContain('0 results');
			// 구 구현은 여기서 "0 result" 였다.
			expect(container.textContent).not.toMatch(/\b0 result\b(?!s)/);
		});
	});

	describe('1건', () => {
		useMockServer(() => mock.prodServerGetSingle);

		it('"1 result" 로 적는다 (단수)', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			const { container } = renderWithQueryRouter(<Search />);
			await screen.findByText('검색을 위해 추가');
			// 대조 — 무조건 s 를 붙이는 구현이면 여기서 걸린다.
			expect(container.textContent).toMatch(/\b1 result\b/);
			expect(container.textContent).not.toContain('1 results');
		});
	});
});

// 미리보기 한 줄은 `white-space: nowrap; overflow: hidden` 이라 앞부분만 보인다.
// 본문을 통째로 그리던 동안 매치는 그 밖에 있었다 — 캡처된 실제 응답 한 건이
// 1019자이고 매치 위치가 1010 이다. 결과는 나오는데 왜 걸렸는지가 화면에 없었다.
describe('Search 결과 미리보기', () => {
	useMockServer(() => mock.prodServerLateMatch);

	const previewText = async () => {
		const item = await screen.findByRole('listitem');
		const preview = item.querySelector('.div--loglist-contents') as HTMLElement;
		expect(preview).not.toBeNull();
		return preview.textContent ?? "";
	};

	it('뒤쪽에 있는 매치를 미리보기 앞으로 끌어온다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(<Search />);

		const text = await previewText();
		// 매치가 보이는 자리에 있어야 한다. 잘라내기 전에는 500 을 넘었다.
		expect(text.indexOf('테스트')).toBeGreaterThanOrEqual(0);
		expect(text.indexOf('테스트')).toBeLessThan(30);
	});

	it('강조 span 이 실제 매치 글자를 감싼다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(<Search />);

		const item = await screen.findByRole('listitem');
		const marks = Array.from(item.querySelectorAll('span[class*="search-keyword"]'));
		expect(marks.length).toBeGreaterThan(0);
		expect(marks.map((m) => m.textContent)).toContain('테스트');
	});

	it('잘라낸 미리보기는 생략 부호로 시작한다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(<Search />);

		const text = await previewText();
		expect(text.startsWith('…')).toBe(true);
	});
});

// 대조 — 자르기가 조건 없이 발동하면 이 스위트가 붉어진다. 매치가 이미 앞에
// 있는 본문까지 `…` 를 붙여 잘라내는 구현을 배제한다.
describe('Search 결과 미리보기 — 매치가 앞에 있는 본문', () => {
	useMockServer(() => mock.prodServerGetSingle);

	it('잘라내지 않고 그대로 보여준다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		renderWithQueryRouter(<Search />);

		const item = await screen.findByRole('listitem');
		const preview = item.querySelector('.div--loglist-contents') as HTMLElement;
		const text = preview.textContent ?? "";

		expect(text.startsWith('…')).toBe(false);
		expect(text.startsWith('검색을 위해 추가')).toBe(true);
	});
});

// 질의어가 없는 상태는 결과 0건이 아니다.
//
// 이 경로에 새로고침·북마크·새 탭으로 직접 들어오면 location.state 가 없어
// 질의어가 빈 문자열이 된다. 그때 "0건" 분기로 떨어지면 화면이
// `0 results for "" — No search results.` 를 냈다 — 하지도 않은 검색이 실패한
// 것처럼 읽힌다.
describe('Search 질의어 없이 들어온 경우', () => {
	useMockServer(() => mock.prodServerGetList);

	const renderAt = (state: unknown) => {
		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);
		const { Wrapper: QueryWrapper } = createQueryTestWrapper();
		return render(
			<QueryWrapper>
				<MemoryRouter initialEntries={[{ pathname: '/log/search', search: '', hash: '', state, key: 'k' }]}>
					<Search />
				</MemoryRouter>
			</QueryWrapper>
		);
	};

	it('결과 0건이라고 말하지 않는다', async () => {

		const { container } = renderAt(null);
		const text = await waitFor(() => {
			const t = container.textContent ?? '';
			expect(t.length).toBeGreaterThan(0);
			return t;
		});

		// 이전에는 `0 results for "" ... No search results.` 였다.
		expect(text).not.toContain('0 results');
		expect(text).not.toContain('No search results');
		expect(text).toContain('Type a keyword to search.');
	});

	it('제목이 빈 질의어로 끝나지 않는다', async () => {

		renderAt(null);
		await waitFor(() => expect(document.title).toContain('park108.net'));

		// 이전에는 "search results for  - park108.net" 이었다.
		expect(document.title).not.toContain('results for ');
	});

	it('목록으로 돌아갈 길을 남긴다', async () => {

		const { container } = renderAt(null);
		await waitFor(() => expect(container.textContent).toContain('To list'));
	});

	// 대조 — 질의어가 있으면 결과를 그대로 보여준다. 없으면 "언제나 안내문"
	// 구현도 통과한다.
	it('질의어가 있으면 결과를 보여준다', async () => {

		const { container } = renderAt({ queryString: '테스트' });
		await waitFor(() => expect(container.textContent).toContain('results for'));

		expect(container.textContent).not.toContain('Type a keyword to search.');
	});
});
