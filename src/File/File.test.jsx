import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import File from '../File/File';

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

test('render files but no data on prod server', async () => {

	mock.prodServerHasNoData.listen();
	
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

	mock.prodServerHasNoData.resetHandlers();
	mock.prodServerHasNoData.close();
});

test('render files, next files, delete file and confirm on prod server', async () => {

	mock.prodServerOk.listen();
	
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

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

test('copy URL failure shows error Toaster on prod server', async () => {

	mock.prodServerOk.listen();

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

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

test('render failed when internal error on prod server', async () => {

	mock.prodServerFailed.listen();

	vi.useFakeTimers();

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

	act(() => {
		vi.runAllTimers();
	});

	expect(failMessage).toBeDefined();
	
	vi.useRealTimers();

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

test('render failed when network error on prod server', async () => {

	mock.prodServerNetworkError.listen();

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

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});

test('render files and get next files failed on dev server', async () => {

	mock.devServerOk.listen();
	
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

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();


	mock.devServerFailed.listen();

	vi.useFakeTimers();

	const seeMoreButton = await screen.findByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();
	fireEvent.click(seeMoreButton);

	const failMessage = await screen.findByText("Get more files failed.");

	act(() => {
		vi.runAllTimers();
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

	mock.devServerFailed.resetHandlers();
	mock.devServerFailed.close();


	mock.devServerNetworkError.listen();

	const seeMoreButton2 = await screen.findByTestId("seeMoreButton");
	expect(seeMoreButton2).toBeDefined();
	fireEvent.click(seeMoreButton2);

	const failMessage2 = await screen.findByText("Get more files failed for network issue.");

	act(() => {
		vi.runAllTimers();
	});

	expect(failMessage2).toBeDefined();
	
	// Delete
	const buttons2 = await screen.findAllByRole("button");
	const firstDeleteButton2 = buttons2[1];

	fireEvent.click(firstDeleteButton2);

	const toasterErrorText2 = await screen.findByText("Upload file failed for network issue.");
	expect(toasterErrorText2).toBeInTheDocument();
	
	vi.useRealTimers();

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});