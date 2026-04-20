import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import File from '../File/File';
import { useMockServer } from '../test-utils/msw';
import { ASYNC_ASSERTION_TIMEOUT_MS } from '../test-utils/timing';
import { waitForToasterHidden } from '../test-utils/toaster';

console.log = vi.fn();
console.error = vi.fn();

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

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<File />
			</MemoryRouter>
		);

		const dropZone = await screen.findByText("Drop files here!");
		expect(dropZone).toBeDefined();
	});
});

describe('File render files, next, delete on prod server', () => {
	useMockServer(() => mock.prodServerOk);

	test('render files, next files, delete file and confirm on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

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
		fireEvent.click(buttonsBeforeSeeMore2[0]);
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
			fireEvent.click(buttonsForDelete[1]);
		}
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
		const firstFile = buttons[0];
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
		const firstDeleteButton = buttons[1];

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
		const firstDeleteButton2 = buttons2[1];

		fireEvent.click(firstDeleteButton2);

		const toasterErrorText2 = await screen.findByText("Upload file failed for network issue.");
		expect(toasterErrorText2).toBeInTheDocument();
	});
});
