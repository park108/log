import { render, screen } from '@testing-library/react';
import {createMemoryHistory} from 'history'
import { Router } from 'react-router-dom';
import Navigation from '../common/Navigation';
import * as common from '../common/common';

describe('render navigation menu correctly', () => {

	const history = createMemoryHistory();
	const prevLocation = window.location;
	const activatedListItemClass = "li li--nav-active";

	it('render title menu correctly', () => {

		// Mocking location
		const location = new URL('https://www.park108.net/log')
		location.assign = jest.fn()
		location.replace = jest.fn()
		location.reload = jest.fn()

		delete window.location;
		window.location = location;

		history.push(location);

		// Mocking login and admin check
		common.isLoggedIn = jest.fn().mockResolvedValue(false);
		common.isAdmin = jest.fn().mockResolvedValue(false);

		render(
			<Router location={location} navigator={history}>
				<Navigation />
			</Router>
		);

		const html = screen.getByText("park108.net").closest('a');

		const expected = document.createElement("a");
		expected.innerHTML = "park108.net";

		expect(expected).toStrictEqual(html);

		window.location = prevLocation;
	});

	it('render file menu correctly', () => {

		// Mocking location
		const location = new URL('https://www.park108.net/file')
		location.assign = jest.fn()
		location.replace = jest.fn()
		location.reload = jest.fn()

		delete window.location;
		window.location = location;

		history.push(location);

		// Mocking login and admin check
		common.isLoggedIn = jest.fn().mockResolvedValue(true);
		common.isAdmin = jest.fn().mockResolvedValue(true);

		render(
			<Router location={location} navigator={history}>
				<Navigation />
			</Router>
		);
		
		// Is a anchor tag exist?
		const anchor = screen.getByText("file").closest('a');

		const expected = document.createElement("a");
		expected.setAttribute("href", "/file");
		expected.innerHTML = "file";

		expect(expected).toStrictEqual(anchor);
		
		// Is this menu's class active now?
		const li = anchor.parentNode;
		const liClass = li.getAttribute("class");

		expect(liClass).toStrictEqual(activatedListItemClass);
		
		// Revert location
		window.location = prevLocation;
	});

	it('render monitor menu correctly', async () => {

		// Mocking location
		const location = new URL('https://www.park108.net/monitor')
		location.assign = jest.fn()
		location.replace = jest.fn()
		location.reload = jest.fn()

		delete window.location;
		window.location = location;

		history.push(location);

		// Mocking login and admin check
		common.isLoggedIn = jest.fn().mockResolvedValue(true);
		common.isAdmin = jest.fn().mockResolvedValue(true);

		render(
			<Router location={location} navigator={history}>
				<Navigation />
			</Router>
		);
		
		// Is a anchor tag exist?
		const anchor = screen.getByText("mon").closest('a');

		const expected = document.createElement("a");
		expected.setAttribute("href", "/monitor");
		expected.innerHTML = "mon";

		expect(expected).toStrictEqual(anchor);
		
		// Is this menu's class active now?
		const li = anchor.parentNode;
		const liClass = li.getAttribute("class");

		expect(liClass).toStrictEqual(activatedListItemClass);
		
		// Revert location
		window.location = prevLocation;
	});
});