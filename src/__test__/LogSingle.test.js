import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import LogSingle from '../Log/LogSingle';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();
const errorMessage = "API is down";
	
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useParams: () => ({ timestamp: '1656034616036' }),
}));

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

	process.env.NODE_ENV = 'production';

	const history = createMemoryHistory();
	const location = { pathname: "/log" };
	history.push(location);

	render(
		<Router location={location} history={history} >
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

	process.env.NODE_ENV = 'development';

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log/"}});

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

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log/"}});

	render(
		<Router location={history.location} navigator={history}>
			<LogSingle />
		</Router>
	);

	const obj = await screen.findByText("Page Not Found.", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render "Page Not Found" page if API is down', async () => {

	// fetchFirst -> Server error
	global.fetch = () => Promise.reject(errorMessage);

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log/"}});

	render(
		<Router location={history.location} navigator={history}>
			<LogSingle />
		</Router>
	);

	global.fetch = unmockedFetch;
});