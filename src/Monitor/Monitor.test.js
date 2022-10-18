import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import App from '../App';
import Monitor from '../Monitor/Monitor';
import * as api from '../Monitor/api';
import * as common from '../common/common';
import userEvent from '@testing-library/user-event';

console.error = jest.fn();

it('render monitor if it logged in', async () => {

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);
	common.setFullscreen = jest.fn().mockResolvedValue(true);

	const history = createMemoryHistory();
	history.push({location: {pathname: "/monitor"}});

	render(
		<Router location={history.location} navigator={history}>
			<Monitor />
		</Router>
	);
	
	const title = await screen.findByText("Contents in the last 6 months");
	expect(title).toBeInTheDocument();
});

it('redirect if not admin', async () => {
	
	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(false);

	const history = createMemoryHistory();
	const location = {location: {pathname: "/monitor"}};
	history.push(location);

	render(
		<Router location={location} navigator={history}>
			<Monitor />
		</Router>
	);

	const title = screen.queryByText("Contents in the last 6 months");
	expect(title).not.toBeInTheDocument();
});

describe("get api url", () => {

	it('get production api', () => {

		process.env.NODE_ENV = 'production';
		let prod = api.getAPI();
		expect(prod).toBe("https://4568z7p97l.execute-api.ap-northeast-2.amazonaws.com/prod");
	});

	it('get development api', () => {

		process.env.NODE_ENV = 'development';
		let test = api.getAPI();
		expect(test).toBe("https://4568z7p97l.execute-api.ap-northeast-2.amazonaws.com/test");
	});

	it('failed get development api', () => {

		process.env.NODE_ENV = '';
		let test = api.getAPI();
		expect(test).toBe(undefined);
	});
});