import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as api from './api';
import * as common from '../common/common';
import * as errorReporter from '../common/errorReporter';
import File from '../File/File';
import { useMockServer } from '../test-utils/msw';
import { ASYNC_ASSERTION_TIMEOUT_MS } from '../test-utils/timing';
import { waitForToasterHidden } from '../test-utils/toaster';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

// TSK-20260824-07-b — 응답을 **마운트 상태에서** 적용시키는 대기 헬퍼.
// 본 스위트의 일부 케이스는 응답 도착 전에 본문이 끝나 RTL auto-cleanup unmount 이후에야
// 응답이 적용되고 있었다 (= spec 이 금지하는 post-unmount 발화 그 자체). 본 task 의 가드가
// 그 적용을 억제하므로, 응답 분기를 계속 덮으려면 마운트 중 도착을 명시적으로 기다려야 한다.
const settleFetch = async (spy: ReturnType<typeof vi.spyOn>): Promise<void> => {
	await waitFor(() => expect(spy).toHaveBeenCalled());
	await act(async () => {
		await Promise.allSettled(spy.mock.results.map((r: { value: unknown }) => r.value));
		await new Promise<void>(resolve => setTimeout(resolve, 0));
	});
};

const testEntry = {
	pathname: "/file"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};

test('redirect to log when user is not admin', async () => {

	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);

	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(false);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<File />
		</MemoryRouter>
	);
});

describe('File render files but no data on prod server', () => {
	useMockServer(() => mock.prodServerHasNoData);

	test('render files but no data on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		const getFilesSpy = vi.spyOn(api, 'getFiles');

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		const dropZone = await screen.findByText("Drop files here!");
		expect(dropZone).toBeDefined();

		// 빈 응답(`{ body: {} }`) 이 마운트 중에 적용되어야 `Items`/`LastEvaluatedKey` 부재
		// 분기가 실행된다 — 이전에는 unmount 이후 적용되고 있었다.
		await settleFetch(getFilesSpy);
		expect(screen.queryByTestId("seeMoreButton")).toBeNull();
	});
});

describe('File render files, next, delete on prod server', () => {
	useMockServer(() => mock.prodServerOk);

	test('render files, next files, delete file and confirm on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		const getNextFilesSpy = vi.spyOn(api, 'getNextFiles');

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		// Get 7 files
		const files = await screen.findAllByRole("listitem");
		expect(files.length).toBe(7);

		// See more -> get more data
		const seeMoreButton = await screen.findByTestId("seeMoreButton");
		expect(seeMoreButton).toBeDefined();
		fireEvent.click(seeMoreButton);

		// 8th File
		const file8 = await screen.findByText("308142rg.jpg");
		expect(file8).toBeInTheDocument();

		// Get 10 files
		const files2 = await screen.findAllByRole("listitem");
		expect(files2.length).toBe(10);

		// β 하이브리드 — Loading 토스터 숨김 + listitem 렌더 확인 → 재조회한 버튼 참조로 클릭 → toaster 단정.
		// (기존 플로우: See more→no data→buttons 캡처→delete click 순이었으나, React 19 concurrent rendering 에서
		//  빈 상태가 flush 되며 stale 참조 click 이 무시됨. Copy URL 을 listitem 존재 상태에서 먼저 실행한다.)
		Object.assign(navigator, {
			clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
		});
		await waitForToasterHidden('information', 'center');
		await waitFor(
			() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0),
			{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }
		);
		const buttonsBeforeSeeMore2 = screen.getAllByRole("button");
		fireEvent.click(buttonsBeforeSeeMore2[0]!);
		await waitFor(
			() => expect(screen.getByText(/URL copied\.$/)).toBeInTheDocument(),
			{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }
		);

		// See more -> no data (플로우 보존 — empty response 핸들러가 호출되는지 확인)
		const seeMoreButton2 = await screen.findByTestId("seeMoreButton");
		expect(seeMoreButton2).toBeDefined();
		fireEvent.click(seeMoreButton2);

		// Delete — 삭제 버튼 click. confirm mock + 200 OK response. setTimeout 3000ms 후 refreshFiles 는
		// 별도 단정 없이 진행 (refresh 자체 검증은 본 태스크 범위 밖 — 원 테스트가 검증한 유일한 단정은 toaster).
		vi.spyOn(window, 'confirm').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
			return true;
		});
		const buttonsForDelete = screen.queryAllByRole("button");
		if (buttonsForDelete.length > 1) {
			fireEvent.click(buttonsForDelete[1]!);
		}

		// 마지막 See more 의 빈 응답(`{ body: {} }`) 을 마운트 중에 적용시킨다 —
		// `Items` 부재 분기(`: []`) 와 `LastEvaluatedKey` 부재 분기(`: undefined`) 도달점.
		await settleFetch(getNextFilesSpy);
		expect(screen.queryByTestId("seeMoreButton")).toBeNull();
	});
});

describe('File copy URL failure on prod server', () => {
	useMockServer(() => mock.prodServerOk);

	test('copy URL failure shows error Toaster on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockRejectedValueOnce(new Error('permission denied')),
			},
		});

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		const buttons = await screen.findAllByRole("button");
		const firstFile = buttons[0]!;
		fireEvent.click(firstFile);

		const errorToast = await screen.findByText("Copy failed (permission denied or unavailable).");
		expect(errorToast).toBeInTheDocument();
	});
});

describe('File render failed when internal error on prod server', () => {
	useMockServer(() => mock.prodServerFailed);

	test('render failed when internal error on prod server', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true });

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		const failMessage = await screen.findByText("Get files failed.");

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		expect(failMessage).toBeDefined();
	});
});

describe('File render failed when network error on prod server', () => {
	useMockServer(() => mock.prodServerNetworkError);

	test('render failed when network error on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		const failMessage = await screen.findByText("Get files failed.");
		expect(failMessage).toBeDefined();
	});
});

describe('File reportError 채널 (REQ-20260421-039 FR-03)', () => {
	// Files first fetch errorType 분기 실패 시 reportError(newData) 가 호출된다.
	describe('Files first fetch errorType 분기', () => {
		useMockServer(() => mock.prodServerFailed);

		test('reports error via reportError when errorType branch is taken', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
			vi.spyOn(common, "isAdmin").mockReturnValue(true);

			const spy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

			render(
				<MemoryRouter initialEntries={[testEntry]}>
					<File />
				</MemoryRouter>
			);

			await screen.findByText("Get files failed.");
			await waitFor(
				() => expect(spy).toHaveBeenCalledTimes(1),
				{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }
			);

			spy.mockRestore();
		});
	});

	// Files next fetch catch (network error) 시 reportError(err) 가 호출된다.
	describe('Files next fetch 실패', () => {
		const server = useMockServer(() => mock.devServerOk);

		test('reports error via reportError when next fetch network-errors', async () => {

			vi.stubEnv('DEV', true);
			vi.stubEnv('PROD', false);

			vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
			vi.spyOn(common, "isAdmin").mockReturnValue(true);

			const spy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

			render(
				<MemoryRouter initialEntries={[testEntry]}>
					<File />
				</MemoryRouter>
			);

			// 첫 페이지 로드 완료 대기 (reportError 호출 없음 — 성공 경로).
			const seeMoreButton = await screen.findByTestId("seeMoreButton");
			expect(seeMoreButton).toBeDefined();

			// 다음 페이지 fetch 를 네트워크 에러로 전환 → catch 경로 → reportError 호출.
			server.use(mock.networkErrorGetHandler);
			fireEvent.click(seeMoreButton);

			await screen.findByText("Get more files failed for network issue.");
			await waitFor(
				() => expect(spy).toHaveBeenCalledTimes(1),
				{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }
			);

			spy.mockRestore();
		});
	});
});

describe('File render files and get next files failed on dev server', () => {
	// This suite uses a single running `devServerOk` for the baseline, and
	// mid-test switches behavior via `server.use(...)` (runtime handler override).
	// teardown 은 `useMockServer` 의 `afterEach` 가 resetHandlers + close 를 보장.
	const server = useMockServer(() => mock.devServerOk);

	test('render files and get next files failed on dev server', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "isMobile").mockReturnValue(true); // Mobile UI test

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		// Switch handlers to failure responses (mirrors devServerFailed)
		server.use(mock.failedGetHandler, mock.failedDeleteHandler);

		vi.useFakeTimers({ shouldAdvanceTime: true });

		const seeMoreButton = await screen.findByTestId("seeMoreButton");
		expect(seeMoreButton).toBeDefined();
		fireEvent.click(seeMoreButton);

		const failMessage = await screen.findByText("Get more files failed.");

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		expect(failMessage).toBeDefined();

		// Delete
		const buttons = await screen.findAllByRole("button");
		const firstDeleteButton = buttons[1]!;

		vi.spyOn(window, 'confirm').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
			return true;
		});

		fireEvent.click(firstDeleteButton);

		const toasterErrorText = await screen.findByText("Upload file failed.");
		expect(toasterErrorText).toBeInTheDocument();

		// Switch handlers to network-error responses (mirrors devServerNetworkError)
		server.use(mock.networkErrorGetHandler, mock.networkErrorDeleteHandler);

		const seeMoreButton2 = await screen.findByTestId("seeMoreButton");
		expect(seeMoreButton2).toBeDefined();
		fireEvent.click(seeMoreButton2);

		const failMessage2 = await screen.findByText("Get more files failed for network issue.");

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		expect(failMessage2).toBeDefined();

		// Delete
		const buttons2 = await screen.findAllByRole("button");
		const firstDeleteButton2 = buttons2[1]!;

		fireEvent.click(firstDeleteButton2);

		const toasterErrorText2 = await screen.findByText("Upload file failed for network issue.");
		expect(toasterErrorText2).toBeInTheDocument();
	});
});

// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-b —
// async effect unmount race 박제. pending `getFiles` / `getNextFiles` 를 `vi.spyOn` 으로
// 외부 resolve/reject 가능한 deferred 로 바꾼 뒤 `unmount()` → 응답 도착 왕복을 만든다.
// 단정 3종: (a) state 전이 0 (toaster/목록 DOM 부재 + unmounted setState Warning 0),
// (b) `console.log` 0 hit, (c) `console.error` 0 hit. spy 는 unmount 직후 `mockClear()` 로
// 기준점을 잡아 unmount **이전** 발화와 분리한다.
// DEV stub 필수 — `log()` 는 `isDev()` 분기 안에서만 `console.log` 로 나가므로
// PROD stub 이면 (b) 단정이 공허해진다.
describe('File unmount-safety (REQ-20260517-093 (I1)(I2))', () => {

	const flushAfterResponse = async (): Promise<void> => {
		await act(async () => {
			await new Promise<void>(resolve => setTimeout(resolve, 0));
		});
	};

	const expectNoEmission = (
		logSpy: ReturnType<typeof vi.spyOn>,
		errorSpy: ReturnType<typeof vi.spyOn>,
	): void => {
		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
	};

	beforeEach(() => {
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);
		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
	});

	it('pending getFiles 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		let resolveResp!: (r: Response) => void;
		const pending = new Promise<Response>((resolve) => { resolveResp = resolve; });
		const getFilesSpy = vi.spyOn(api, 'getFiles').mockReturnValue(pending);

		const { unmount } = render(
			<MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		await waitFor(() => expect(getFilesSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		resolveResp(new Response(JSON.stringify({
			body: { Items: [{ key: 'a.txt', timestamp: 1 }], LastEvaluatedKey: { timestamp: 1 } },
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
		await flushAfterResponse();

		expectNoEmission(logSpy, errorSpy);
		expect(screen.queryByRole('listitem')).toBeNull();
	});

	it('pending getFiles 중 unmount 후 reject → catch 경로도 어떤 발화도 하지 않는다', async () => {

		let rejectResp!: (e: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		const getFilesSpy = vi.spyOn(api, 'getFiles').mockReturnValue(pending);

		const { unmount } = render(
			<MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		await waitFor(() => expect(getFilesSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		rejectResp(new Error('network down'));
		await flushAfterResponse();

		expectNoEmission(logSpy, errorSpy);
		expect(screen.queryByText('Get files failed.')).toBeNull();
	});

	it('pending getNextFiles 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		vi.spyOn(api, 'getFiles').mockResolvedValue(new Response(JSON.stringify({
			body: { Items: [{ key: 'a.txt', timestamp: 1 }], LastEvaluatedKey: { timestamp: 1 } },
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		let resolveNext!: (r: Response) => void;
		const pendingNext = new Promise<Response>((resolve) => { resolveNext = resolve; });
		const getNextFilesSpy = vi.spyOn(api, 'getNextFiles').mockReturnValue(pendingNext);

		const { unmount } = render(
			<MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		const seeMoreButton = await screen.findByTestId('seeMoreButton');
		fireEvent.click(seeMoreButton);

		await waitFor(() => expect(getNextFilesSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		resolveNext(new Response(JSON.stringify({
			body: { Items: [{ key: 'b.txt', timestamp: 2 }], LastEvaluatedKey: { timestamp: 2 } },
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
		await flushAfterResponse();

		expectNoEmission(logSpy, errorSpy);
	});

	it('pending getNextFiles 중 unmount 후 reject → catch 경로도 어떤 발화도 하지 않는다', async () => {

		vi.spyOn(api, 'getFiles').mockResolvedValue(new Response(JSON.stringify({
			body: { Items: [{ key: 'a.txt', timestamp: 1 }], LastEvaluatedKey: { timestamp: 1 } },
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		let rejectNext!: (e: unknown) => void;
		const pendingNext = new Promise<Response>((_, reject) => { rejectNext = reject; });
		const getNextFilesSpy = vi.spyOn(api, 'getNextFiles').mockReturnValue(pendingNext);

		const { unmount } = render(
			<MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		const seeMoreButton = await screen.findByTestId('seeMoreButton');
		fireEvent.click(seeMoreButton);

		await waitFor(() => expect(getNextFilesSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		rejectNext(new Error('next network down'));
		await flushAfterResponse();

		expectNoEmission(logSpy, errorSpy);
		expect(screen.queryByText('Get more files failed for network issue.')).toBeNull();
	});
});
