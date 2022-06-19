import { render, screen } from '@testing-library/react';
import Monitor from '../Monitor/Monitor';
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