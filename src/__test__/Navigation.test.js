import { render, screen } from '@testing-library/react';
import {createMemoryHistory} from 'history'
import { Router } from 'react-router-dom';
import Navigation from '../common/Navigation';
import * as common from '../common/common';

describe('render navigation menu correctly', () => {

	const history = createMemoryHistory();

	it('render title menu correctly', () => {

		history.push({location: {pathname: "/log"}});

		// Mocking login and admin check
		common.isLoggedIn = jest.fn().mockResolvedValue(false);
		common.isAdmin = jest.fn().mockResolvedValue(false);

		render(
			<Router location={history.location} navigator={history}>
				<Navigation />
			</Router>
		);

		const html = screen.getByText("park108.net").closest('a');

		const expected = document.createElement("a");
		expected.innerHTML = "park108.net";

		expect(expected).toStrictEqual(html);
	});

	it('render file menu correctly', () => {

		history.push({location: {pathname: "/file"}});

		// Mocking login and admin check
		common.isLoggedIn = jest.fn().mockResolvedValue(true);
		common.isAdmin = jest.fn().mockResolvedValue(true);

		render(
			<Router location={history.location} navigator={history}>
				<Navigation />
			</Router>
		);

		const html = screen.getByText("file").closest('a');

		const expected = document.createElement("a");
		expected.setAttribute("href", "/file");
		expected.innerHTML = "file";

		expect(expected).toStrictEqual(html);
	});

	it('render monitor menu correctly', () => {

		history.push({location: {pathname: "/monitor"}});

		// Mocking login and admin check
		common.isLoggedIn = jest.fn().mockResolvedValue(true);
		common.isAdmin = jest.fn().mockResolvedValue(true);

		render(
			<Router location={history.location} navigator={history}>
				<Navigation />
			</Router>
		);

		const html = screen.getByText("mon").closest('a');

		const expected = document.createElement("a");
		expected.setAttribute("href", "/monitor");
		expected.innerHTML = "mon";

		expect(expected).toStrictEqual(html);
	});
});