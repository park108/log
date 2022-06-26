import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import LogSingle from '../Log/LogSingle';
import { getLog } from '../Log/api';

const unmockedFetch = global.fetch;
console.error = jest.fn();

it('render LogSingle', async () => {
	
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			body: {
				Count: 1,
				Items: [
					{
						author: "park108@gmail.com",
						timestamp: 1656034616036,
						logs: [
							{
								contents: "Test Contents",
								timestamp: 1656034616036,
							}
						]
					},
				]
			}
		}),
	})

	await getLog("1656034616036");

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log"}});

	render(
		<Router location={history.location} navigator={history}>
			<LogSingle />
		</Router>
	);

	const obj = await screen.findByText("Test Contents", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render "Page Not Found" page if it cannot fetch', async () => {
	
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	})

	await getLog("1656034616036");

	const history = createMemoryHistory();
	history.push({location: {pathname: "/og"}});

	render(
		<Router location={history.location} navigator={history}>
			<LogSingle />
		</Router>
	);

	const obj = await screen.findByText("Page Not Found.", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render "Page Not Found" page if it has no log', async () => {
	
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			body: {
				Count: 0
			}
		}),
	})

	await getLog("1656034616036");

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log"}});

	render(
		<Router location={history.location} navigator={history}>
			<LogSingle />
		</Router>
	);

	const obj = await screen.findByText("Page Not Found.", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});