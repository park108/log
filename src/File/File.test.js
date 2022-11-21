import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import File from '../File/File';

console.log = jest.fn();
console.error = jest.fn();

const testEntry = {
	pathname: "/file"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};

test('redirect to log when user is not admin', async () => {
	
	process.env.NODE_ENV = 'development';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(false);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<File />
		</MemoryRouter>
	);
});

test('render files but no data on prod server', async () => {

	mock.prodServerHasNoData.listen();
	
	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

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
	
	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<File />
		</MemoryRouter>
	);
	
	// Get 7 files
	const files = await screen.findAllByRole("listitem");
	expect(files.length).toBe(7);
	
	// See more -> get more data
	// TODO: GET MORE DATA NOT WORKING
	const seeMoreButton = await screen.findByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();
	fireEvent.click(seeMoreButton);

	// See more -> no data
	const seeMoreButton2 = await screen.findByTestId("seeMoreButton");
	expect(seeMoreButton2).toBeDefined();
	fireEvent.click(seeMoreButton2);
	
	// Delete
	const buttons = await screen.findAllByRole("button");
	const firstDeleteButton = buttons[1];

	jest.spyOn(window, 'confirm').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
		return true;
	});

	fireEvent.click(firstDeleteButton);

	// Copy URL
	document.execCommand = jest.fn();
	const firstFile = buttons[0];
	fireEvent.click(firstFile);

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

test('render failed when internal error on prod server', async () => {

	mock.prodServerFailed.listen();

	jest.useFakeTimers();

	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<File />
		</MemoryRouter>
	);

	const failMessage = await screen.findByText("Get files failed.");

	act(() => {
		jest.runAllTimers();
	});

	expect(failMessage).toBeDefined();
	
	jest.useRealTimers();

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

test('render failed when network error on prod server', async () => {

	mock.prodServerNetworkError.listen();

	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

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
	
	process.env.NODE_ENV = 'development';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);
	common.isMobile = jest.fn().mockReturnValue(true); // Mobile UI test

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<File />
		</MemoryRouter>
	);

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();


	mock.devServerFailed.listen();

	jest.useFakeTimers();

	const seeMoreButton = await screen.findByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();
	fireEvent.click(seeMoreButton);

	const failMessage = await screen.findByText("Get more files failed.");

	act(() => {
		jest.runAllTimers();
	});

	expect(failMessage).toBeDefined();
	
	// Delete
	const buttons = await screen.findAllByRole("button");
	const firstDeleteButton = buttons[1];

	jest.spyOn(window, 'confirm').mockImplementation((message) => {
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
		jest.runAllTimers();
	});

	expect(failMessage2).toBeDefined();
	
	// Delete
	const buttons2 = await screen.findAllByRole("button");
	const firstDeleteButton2 = buttons2[1];

	fireEvent.click(firstDeleteButton2);

	const toasterErrorText2 = await screen.findByText("Upload file failed for network issue.");
	expect(toasterErrorText2).toBeInTheDocument();
	
	jest.useRealTimers();

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});