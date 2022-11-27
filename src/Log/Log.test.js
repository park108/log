import { fireEvent, render, screen,act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import Log from '../Log/Log';

// console.log = jest.fn();
// console.error = jest.fn();

const testEntry = {
	pathname: "/"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};

beforeEach(() => {
	sessionStorage.removeItem("logList");
	sessionStorage.removeItem("logListLastTimestamp");
});

test('render log has no data', async () => {

	mock.prodServerHasNoData.listen();
	
	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Log />
		</MemoryRouter>
	);
	
	const logsHasNoData = await screen.findByRole("list");
	expect(logsHasNoData).toBeDefined();

	mock.prodServerHasNoData.resetHandlers();
	mock.prodServerHasNoData.close();
});

test('render log if it logged in', async () => {

	mock.prodServerOk.listen();
	
	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Log />
		</MemoryRouter>
	);
	
	// Get 7 logs
	const logs = await screen.findAllByRole("listitem");
	expect(logs.length).toBe(7);

	const seeMoreButton = await screen.findByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();
	fireEvent.click(seeMoreButton);
	
	// Get 3 more logs
	const contentsText = await screen.findByText("Noew Version 10! Can i success? Change once again! ...");
	expect(contentsText).toBeInTheDocument();

	const logs2 = await screen.findAllByRole("listitem");
	expect(logs2.length).toBe(10);	

	const seeMoreButton2 = await screen.findByTestId("seeMoreButton");
	expect(seeMoreButton2).toBeDefined();
	fireEvent.click(seeMoreButton2);

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

test('render failed when internal server error on prod server', async () => {

	mock.prodServerFailed.listen();

	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Log />
		</MemoryRouter>
	);

	const errorMessage = await screen.findByText("Whoops, something went wrong on our end.");
	expect(errorMessage).toBeInTheDocument();

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();
	fireEvent.click(retryButton);

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
			<Log />
		</MemoryRouter>
	);

	const errorMessage = await screen.findByText("Whoops, something went wrong on our end.");
	expect(errorMessage).toBeInTheDocument();

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});

test('render logs and getting next failed', async () => {

	mock.prodServerFirstOkNextFailed.listen();
	
	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Log />
		</MemoryRouter>
	);
	
	// Get 7 logs
	const logs = await screen.findAllByRole("listitem");
	expect(logs.length).toBe(7);

	const seeMoreButton = await screen.findByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();
	fireEvent.click(seeMoreButton);

	const errorMessage = await screen.findByText("Whoops, something went wrong on our end.");
	expect(errorMessage).toBeInTheDocument();

	mock.prodServerFirstOkNextFailed.resetHandlers();
	mock.prodServerFirstOkNextFailed.close();
});

test('render logs and getting next error', async () => {

	mock.prodServerFirstOkNextError.listen();
	
	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Log />
		</MemoryRouter>
	);
	
	// Get 7 logs
	const logs = await screen.findAllByRole("listitem");
	expect(logs.length).toBe(7);

	const seeMoreButton = await screen.findByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();
	fireEvent.click(seeMoreButton);

	const errorMessage = await screen.findByText("Whoops, something went wrong on our end.");
	expect(errorMessage).toBeInTheDocument();

	mock.prodServerFirstOkNextError.resetHandlers();
	mock.prodServerFirstOkNextError.close();
});