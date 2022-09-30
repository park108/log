import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as common from '../common/common';

console.error = jest.fn();

it('render title text "park108.net" correctly', async () => {
	render(<App />);
	expect(await screen.findByText("park108.net", {}, { timeout: 0 })).toBeInTheDocument();
});

it('render after resize', () => {

	const spyFunction = jest.fn();
	window.addEventListener('resize', spyFunction);

	const testHeight = 400;
	window.innerHeight = testHeight;
	window.dispatchEvent(new Event('resize'));
	render(<App />);

	expect(spyFunction).toHaveBeenCalled();
	expect(window.innerHeight).toBe(testHeight);
});

it('reload page', () => {

	const spyFunction = jest.fn();
	window.addEventListener('beforeunload', spyFunction);

	window.dispatchEvent(new Event('beforeunload'));
	render(<App />);

	expect(spyFunction).toHaveBeenCalled();
});

it('redirect page', () => {

	render(<App />);
});

describe('click login button', () => {

	it("test logout", async () => {
	
		common.isLoggedIn = jest.fn().mockResolvedValue(true);
		common.isAdmin = jest.fn().mockResolvedValueOnce(true);

		render(<App />);

		const logoutButton = await screen.findByTestId("logout-button");
		expect(logoutButton).toBeInTheDocument();
		expect(logoutButton.getAttribute("class")).toBe("span span--login-loggedin");

		userEvent.click(logoutButton);
	});

	it("test login", async () => {

		common.isLoggedIn = jest.fn().mockResolvedValueOnce(false);
		common.isAdmin = jest.fn().mockResolvedValueOnce(false);
		
		render(<App />);

		const loginButton = await screen.findByTestId("login-button");
		expect(loginButton).toBeInTheDocument();
		expect(loginButton.getAttribute("class")).toBe("span span--login-loggedout");

		userEvent.click(loginButton);
	});
});