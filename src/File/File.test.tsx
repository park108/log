import { Profiler } from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

// 이 테스트는 render 만 하고 **아무것도 단언하지 않았다.** 관리자 게이트를
// 통째로 지워도 초록이었다 — 이름이 주장하는 것을 재지 않고 있었다.
test('redirect to log when user is not admin', async () => {

	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);

	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(false);

	const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Where />
			<File />
		</MemoryRouter>
	);

	await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/log'));
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

		// 삭제 실패 문구다. 이 단정은 "Upload file failed." 를 박고 있었는데,
		// 그것은 삭제 갈래에 업로드 문구가 남아 있던 결함을 고정한 것이었다.
		const toasterErrorText = await screen.findByText("Delete file failed.");
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

		// 위와 같은 이유 — 삭제 네트워크 실패 갈래에도 업로드 문구가 남아 있었다.
		const toasterErrorText2 = await screen.findByText("Delete file failed for network issue.");
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

// 목록 새로고침 콜백 2건이 한 번도 실행되지 않았다.
//
// File.tsx 는 업로드 완료(`callbackAfterUpload`)와 삭제 완료(`deleted`) 에 각각
// `() => setIsGetData(true)` 를 넘겨 목록을 다시 읽는다. 그 화살표들이 미커버였고,
// 기존 삭제 케이스는 주석으로 "refresh 자체 검증은 범위 밖" 이라 밝히고 있었다.
// 게다가 그 케이스의 삭제 클릭은 `if (buttons.length > 1)` 조건부라, 버튼이 없으면
// 조용히 건너뛰고 통과한다. 배선이 끊겨도 아무도 모른다.
describe('목록 새로고침 배선', () => {
	useMockServer(() => mock.prodServerOk);

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);
	});

	it('삭제가 성공하면 목록을 다시 읽는다', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const getFilesSpy = vi.spyOn(api, 'getFiles');

		render(
			<MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>,
		);

		await screen.findByText('20220606_log_CQRS.png');
		const callsBeforeDelete = getFilesSpy.mock.calls.length;
		expect(callsBeforeDelete).toBeGreaterThanOrEqual(1);

		// 조건부 클릭을 쓰지 않는다 — 대상이 없으면 통과가 아니라 실패여야 한다.
		const deleteButton = screen.getByRole('button', { name: 'Delete 20220606_log_CQRS.png' });
		await act(async () => {
			fireEvent.click(deleteButton);
		});

		// FileItem 은 삭제 성공 후 refreshTimeout(3000ms) 뒤에 부모 콜백을 부른다.
		await act(async () => {
			await vi.advanceTimersByTimeAsync(3000);
		});

		await waitFor(() =>
			expect(getFilesSpy.mock.calls.length).toBeGreaterThan(callsBeforeDelete),
		);
	});
});

// 모바일 여부에 따라 업로드 UI 가 갈린다 (FileUpload ↔ FileDrop). 모바일 분기는
// 한 번도 렌더된 적이 없어, 두 분기를 뒤바꿔도 어떤 테스트도 붉어지지 않았다.
describe('업로드 UI 분기', () => {
	useMockServer(() => mock.prodServerOk);

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);
	});

	const renderFile = () => render(
		<MemoryRouter initialEntries={[testEntry]}>
			<File />
		</MemoryRouter>,
	);

	it('데스크톱에서는 드롭존을 그린다', async () => {

		vi.spyOn(common, 'isMobile').mockReturnValue(false);

		renderFile();

		expect(await screen.findByTestId('dropzone')).toBeInTheDocument();
	});

	it('모바일에서는 드롭존 대신 파일 선택 UI 를 그린다', async () => {

		vi.spyOn(common, 'isMobile').mockReturnValue(true);

		renderFile();

		await screen.findByText('20220606_log_CQRS.png');

		// 대조 — 위 케이스가 "언제나 드롭존" 으로 통과하지 않게 한다.
		expect(screen.queryByTestId('dropzone')).toBeNull();
	});
});

// "See more" 는 `isGetNextData` 플래그로 효과를 깨우는데, 그 플래그는 요청을
// 띄운 **직후** 내려간다 (완료를 기다리지 않는다). 그래서 응답이 오기 전에 다시
// 누르면 같은 커서로 요청이 또 나갔다 — 실측: 세 번 누르면 호출 3회(인자 전부
// 같은 커서), 항목이 3개여야 할 자리에 5개가 됐다. 목록 화면과 같은 결함이다.
describe('File 다음 페이지 재진입', () => {

	const seeMore = () => screen.queryByTestId('seeMoreButton') as HTMLButtonElement | null;
	const items = () => document.querySelectorAll('[role="listitem"]').length;

	const filePage = (names: string[], next?: number) => new Response(JSON.stringify({
		body: {
			Items: names.map((name, index) => ({
				key: name,
				url: 'https://example.com/' + name,
				lastModified: 1700000000000 + index,
				size: 100,
			})),
			...(next === undefined ? {} : { LastEvaluatedKey: { timestamp: next } }),
		},
	}), { status: 200, headers: { 'Content-Type': 'application/json' } });

	it('응답 전에 여러 번 눌러도 요청은 한 번이고 페이지가 겹치지 않는다', async () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(common, 'isMobile').mockReturnValue(false);
		vi.spyOn(api, 'getFiles').mockResolvedValue(filePage(['a.txt', 'b.txt'], 99));

		const releases: ((value: Response) => void)[] = [];
		const cursors: (string | number)[] = [];
		const getNextSpy = vi.spyOn(api, 'getNextFiles').mockImplementation((timestamp: string | number) => {
			cursors.push(timestamp);
			return new Promise<Response>(resolve => { releases.push(resolve); });
		});

		render(<MemoryRouter><File /></MemoryRouter>);
		await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });

		const before = items();
		expect(before).toBe(2);

		await act(async () => { fireEvent.click(seeMore() as HTMLElement); });

		expect(seeMore()).toBeDisabled();

		await act(async () => { fireEvent.click(seeMore() as HTMLElement); });
		await act(async () => { fireEvent.click(seeMore() as HTMLElement); });

		expect(getNextSpy).toHaveBeenCalledTimes(1);
		expect(cursors).toEqual([99]);

		await act(async () => {
			for(const release of releases) release(filePage(['c.txt'], 98));
			await new Promise(resolve => setTimeout(resolve, 30));
		});

		expect(items()).toBe(before + 1);
	});

	// 한 페이지를 가져온 뒤 다음 페이지를 여전히 가져올 수 있어야 한다.
	it('연달아 두 페이지를 가져올 수 있다', async () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(common, 'isMobile').mockReturnValue(false);
		vi.spyOn(api, 'getFiles').mockResolvedValue(filePage(['a.txt', 'b.txt'], 99));

		const cursors: (string | number)[] = [];
		vi.spyOn(api, 'getNextFiles').mockImplementation((timestamp: string | number) => {
			cursors.push(timestamp);
			return Promise.resolve(filePage(['p' + cursors.length + '.txt'], 99 - cursors.length));
		});

		render(<MemoryRouter><File /></MemoryRouter>);
		await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });

		await act(async () => { fireEvent.click(seeMore() as HTMLElement); });
		await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
		expect(items()).toBe(3);

		await act(async () => { fireEvent.click(seeMore() as HTMLElement); });
		await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
		expect(items()).toBe(4);

		expect(cursors).toEqual([99, 98]);
	});
});

// 다음 페이지의 병합은 **더하기** 다. 예전에는 항목이 없는 응답에서 빈 배열로
// 갈아치워, 다음 페이지에 항목이 없다는 이유로 이미 받아 둔 목록이 통째로
// 사라졌다 (실측: 2 → 0). 새로 알게 된 것이 없을 때의 답은 "그대로" 다.
//
// 이 응답 형태를 실제 API 에서 만들어 보이지는 못했다 — 합성 입력이다. 그럼에도
// 이 갈래는 어떤 입력에서도 옳을 수 없어 못 박는다.
describe('File 다음 페이지 병합', () => {

	const items = () => document.querySelectorAll('[role="listitem"]').length;

	const filePage = (names: string[], next?: number) => new Response(JSON.stringify({
		body: {
			Items: names.map((name, index) => ({
				key: name, url: 'https://example.com/' + name,
				lastModified: 1700000000000 + index, size: 100,
			})),
			...(next === undefined ? {} : { LastEvaluatedKey: { timestamp: next } }),
		},
	}), { status: 200, headers: { 'Content-Type': 'application/json' } });

	const settle = async () => {
		await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
	};

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(common, 'isMobile').mockReturnValue(false);
		vi.spyOn(api, 'getFiles').mockImplementation(async () => filePage(['a.txt', 'b.txt'], 99));
	});

	it('항목이 없는 다음 페이지가 이미 받은 목록을 지우지 않는다', async () => {

		vi.spyOn(api, 'getNextFiles').mockImplementation(async () => new Response(
			JSON.stringify({ body: { LastEvaluatedKey: { timestamp: 98 } } }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		));

		render(<MemoryRouter><File /></MemoryRouter>);
		await settle();
		expect(items()).toBe(2);

		await act(async () => { fireEvent.click(screen.getByTestId('seeMoreButton')); });
		await settle();

		expect(items()).toBe(2);
	});

	// 반대 방향 — 항목이 있으면 더해져야 한다.
	it('항목이 있는 다음 페이지는 더해진다', async () => {

		vi.spyOn(api, 'getNextFiles').mockImplementation(async () => filePage(['c.txt'], 98));

		render(<MemoryRouter><File /></MemoryRouter>);
		await settle();

		await act(async () => { fireEvent.click(screen.getByTestId('seeMoreButton')); });
		await settle();

		expect(items()).toBe(3);
	});
});

// 목록이 비었다는 것과 무언가 잘못됐다는 것은 구별되어야 한다 (LogList 와 동일).
describe('File 빈 목록', () => {

	const empty = () => screen.queryByTestId('fileListEmpty');

	const settle = async () => {
		await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
	};

	const filePage = (names: string[]) => new Response(JSON.stringify({
		body: { Items: names.map((name, index) => ({
			key: name, url: 'https://example.com/' + name,
			lastModified: 1700000000000 + index, size: 100,
		})) },
	}), { status: 200, headers: { 'Content-Type': 'application/json' } });

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(common, 'isMobile').mockReturnValue(false);
	});

	it('파일이 하나도 없으면 그렇다고 알린다', async () => {

		vi.spyOn(api, 'getFiles').mockImplementation(async () => filePage([]));

		render(<MemoryRouter><File /></MemoryRouter>);
		await settle();

		expect(empty()).toBeInTheDocument();
	});

	// **커밋마다 본다.** 문제의 구간은 마운트 직후 두 커밋이고 그 안에서 끝난다 —
	// 나중에 한 번만 단언하면 창을 통째로 놓친다.
	it('조회에 착수하기 전에는 없다고 말하지 않는다', async () => {

		let release: ((value: Response) => void) | null = null;
		vi.spyOn(api, 'getFiles').mockImplementation(() =>
			new Promise<Response>(resolve => { release = resolve; }));

		const seen: boolean[] = [];
		render(
			<Profiler id="file" onRender={() => { seen.push(Boolean(empty())); }}>
				<MemoryRouter><File /></MemoryRouter>
			</Profiler>
		);
		await settle();

		expect(seen.length, '커밋이 한 번도 없었다 — 판정이 공허하다').toBeGreaterThan(0);
		expect(seen).not.toContain(true);

		await act(async () => {
			(release as unknown as (value: Response) => void)(filePage([]));
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		expect(empty()).toBeInTheDocument();
	});

	// 이 화면에는 `isError` 상태가 없다. 실패해도 토스터만 세우고 진행하므로
	// 목록이 빈 채 안내가 떴고, 토스터가 2초 뒤 사라지면 화면에 남는 유일한
	// 문장이 "No files yet." 이었다 — 관리자는 파일이 지워졌다고 읽는다.
	it('조회가 실패하면 없다고 말하지 않는다', async () => {

		vi.spyOn(api, 'getFiles').mockRejectedValue(new Error('down'));
		vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		render(<MemoryRouter><File /></MemoryRouter>);
		await settle();
		await settle();

		expect(empty()).toBeNull();
	});

	it('파일이 있으면 그 안내를 내지 않는다', async () => {

		vi.spyOn(api, 'getFiles').mockImplementation(async () => filePage(['a.txt']));

		render(<MemoryRouter><File /></MemoryRouter>);
		await settle();

		expect(document.querySelectorAll('[role="listitem"]').length).toBe(1);
		expect(empty()).toBeNull();
	});
});

// 첫 조회 실패는 **토스터보다 오래 사는 표면**과 **빠져나갈 길**을 남겨야 한다.
// spec: specs/30.spec/green/components/file.md §동작 8 (F2)(F3)(F5)
describe('File 첫 조회 실패 표면', () => {

	const settle = async () => {
		await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
	};

	const filePage = (names: string[]) => new Response(JSON.stringify({
		body: { Items: names.map((name, index) => ({
			key: name, url: 'https://example.com/' + name,
			lastModified: 1700000000000 + index, size: 100,
		})) },
	}), { status: 200, headers: { 'Content-Type': 'application/json' } });

	// 비-2xx 본문 갈래 — 200 응답에 `errorType` 이 실려 온다. `mockRejectedValue` 로는
	// 이 갈래에 닿지 못한다 (그쪽은 `catch` 로 빠진다).
	const errorTypePage = () => new Response(JSON.stringify({
		errorType: 'InternalServerError',
		errorMessage: 'files table unavailable',
	}), { status: 200, headers: { 'Content-Type': 'application/json' } });

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(common, 'isMobile').mockReturnValue(false);
		vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
	});

	// **토스터가 물러난 뒤에 단언한다.** 하단 토스터는 `duration=2000` 이 지나면
	// `data-show="2"` 로 전이해 시야에서 사라진다. 그 창 안에서만 재면 "토스터가
	// 유일한 실패 표면" 인 종전 상태도 그대로 통과하므로, 이 방향의 검출력이 0 이
	// 된다. `waitForToasterHidden` 은 도달을 관측하지 못하면 통과가 아니라 reject 라
	// (test-utils/toaster.ts) 실패 경로가 실제로 탔다는 전제까지 함께 진다.
	it('조회에 실패하면 다시 시도할 길을 남긴다', async () => {

		const spy = vi.spyOn(api, 'getFiles').mockRejectedValue(new Error('down'));

		render(<MemoryRouter><File /></MemoryRouter>);
		await settle();

		await waitForToasterHidden('error', 'bottom');

		// (F2) 토스터가 물러난 뒤에도 실패를 말하는 표면이 남아 있다.
		const surface = screen.getByTestId('fileListError');
		expect(surface).toBeInTheDocument();

		// (F3) 그 표면 안에 다시 시도할 조작부가 있다.
		const retry = within(surface).getByRole('button', { name: /retry/i });

		// 그 조작부는 장식이 아니라 실제로 1차 조회를 다시 태운다.
		const callsBefore = spy.mock.calls.length;
		spy.mockImplementation(async () => filePage(['a.txt']));
		await act(async () => { fireEvent.click(retry); });
		await settle();

		expect(spy.mock.calls.length).toBeGreaterThan(callsBefore);
		expect(screen.queryByTestId('fileListError')).toBeNull();
		expect(document.querySelectorAll('[role="listitem"]').length).toBe(1);
	});

	// 첫 조회 실패는 갈래가 둘이고 (F5) 는 **양쪽 모두**에 성립한다. 한쪽만 전이하면
	// 나머지 한쪽이 정확히 종전 상태로 남는데, `mockRejectedValue` 만 쓰는 테스트는
	// 그것을 통과시킨다 — 그래서 이 케이스는 `errorType` 본문 갈래를 태운다.
	it('errorType 갈래도 같은 실패 표면을 낸다', async () => {

		vi.spyOn(api, 'getFiles').mockImplementation(async () => errorTypePage());

		render(<MemoryRouter><File /></MemoryRouter>);
		await settle();

		await waitForToasterHidden('error', 'bottom');

		const surface = screen.getByTestId('fileListError');
		expect(surface).toBeInTheDocument();
		expect(within(surface).getByRole('button', { name: /retry/i })).toBeInTheDocument();

		// 실패는 "없음" 의 근거가 아니다 — 빈 안내와 겹치지 않는다 (F1 비퇴행).
		expect(screen.queryByTestId('fileListEmpty')).toBeNull();
	});
});
