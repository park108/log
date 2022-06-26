import { render, screen } from '@testing-library/react';
import Monitor from '../Monitor/Monitor';
import * as api from '../Monitor/api';
import * as common from '../common/common';

beforeAll(() => {
	delete window.location;
	window.location = {
		href: '/monitor',
	};
});

it('render monitor if it logged in', async () => {

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);
	common.setFullscreen = jest.fn().mockResolvedValue(true);

	jest.mock("react-router-dom", () => ({
		...jest.requireActual("react-router-dom"),
		useLocation: () => ({
			pathname: "/monitor"
		})
	}));

	render(
		<Monitor />
	);

	expect(await screen.findByText("Contents in the last 6 months", {}, { timeout: 0 })).toBeInTheDocument();
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