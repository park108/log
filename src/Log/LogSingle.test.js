import { fireEvent, render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import LogSingle from '../Log/LogSingle';

console.log = jest.fn();
console.error = jest.fn();

const testEntry = {
	pathname: "/log"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};
	
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useParams: () => ({ timestamp: '1656034616036' }),
}));

it('render LogSingle on prod server', async () => {

	mock.prodServerOk.listen();
	process.env.NODE_ENV = 'production';
  
	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	jest.spyOn(window, 'confirm').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
		return true;
	});

	jest.useFakeTimers();

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	);

	const obj = await screen.findByText("Test Contents");
	expect(obj).toBeInTheDocument();

	act(() => {
		jest.runOnlyPendingTimers();
	});

	const deleteButton = await screen.findByText("Delete");
	expect(deleteButton).toBeInTheDocument();
	fireEvent.click(deleteButton);

	act(() => {
		jest.runOnlyPendingTimers();
	});

	const deleteResultText = await screen.findByText("The log deleted.");
	expect(deleteResultText).toBeInTheDocument();

	jest.useRealTimers();

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

it('render "Page Not Found" page if it cannot fetch', async () => {

	mock.prodServerFailed.listen();
	process.env.NODE_ENV = 'production';

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	);

	const obj = await screen.findByText("Page Not Found.");
	expect(obj).toBeInTheDocument();

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

it('render "Page Not Found" page if it has no log', async () => {

	mock.prodServerHasNoData.listen();
	process.env.NODE_ENV = 'production';

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	);

	const obj = await screen.findByText("Page Not Found.");
	expect(obj).toBeInTheDocument();

	mock.prodServerHasNoData.resetHandlers();
	mock.prodServerHasNoData.close();
});

it('render "Page Not Found" page if API is down', async () => {

	mock.prodServerNetworkError.listen();
	process.env.NODE_ENV = 'production';

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	);

	const obj = await screen.findByText("Page Not Found.");
	expect(obj).toBeInTheDocument();

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});