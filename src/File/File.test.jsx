import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import * as mock from './api.mock';
import * as common from '../common/common';
import File from '../File/File';
import { useMockServer } from '../test-utils/msw';
import { ERROR_500 } from '../__fixtures__/common';

console.log = vi.fn();
console.error = vi.fn();

const API_URL = import.meta.env.VITE_FILE_API_BASE;

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

		// See more -> no data
		const seeMoreButton2 = await screen.findByTestId("seeMoreButton");
		expect(seeMoreButton2).toBeDefined();
		fireEvent.click(seeMoreButton2);

		// Delete
		const buttons = await screen.findAllByRole("button");
		const firstDeleteButton = buttons[1];

		vi.spyOn(window, 'confirm').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
			return true;
		});

		fireEvent.click(firstDeleteButton);

		// Copy URL
		Object.assign(navigator, {
			clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
		});
		const firstFile = buttons[0];
		fireEvent.click(firstFile);

		const copiedToast = await screen.findByText(/URL copied\.$/);
		expect(copiedToast).toBeInTheDocument();
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
		server.use(
			http.get(API_URL + "/test", () => HttpResponse.json(ERROR_500)),
			http.delete(API_URL + "/test/key/20220606_log_CQRS.png", async () => HttpResponse.json(ERROR_500)),
		);

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
		server.use(
			http.get(API_URL + "/test", () => HttpResponse.error()),
			http.delete(API_URL + "/test/key/20220606_log_CQRS.png", async () => HttpResponse.error()),
		);

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
