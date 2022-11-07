import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from './Navigation';
import * as common from './common';

console.log = jest.fn();
console.error = jest.fn();

describe('render navigation menu correctly', () => {

	const activatedListItemClass = "li li--nav-active";

	it('render title menu correctly', () => {

		// Mocking login and admin check
		common.isLoggedIn = jest.fn().mockResolvedValue(false);
		common.isAdmin = jest.fn().mockResolvedValue(false);

		const testEntry = {
			pathname: "/log"
			, search: ""
			, hash: ""
			, state: null
			, key: "default"
		};

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<Navigation />
			</MemoryRouter>
		);

		const html = screen.getByText("park108.net").closest('a');

		const expected = document.createElement("a");
		expected.innerHTML = "park108.net";

		expect(expected).toStrictEqual(html);
	});

	it('render file menu correctly', () => {

		// Mocking login and admin check
		common.isLoggedIn = jest.fn().mockResolvedValue(true);
		common.isAdmin = jest.fn().mockResolvedValue(true);

		const testEntry = {
			pathname: "/file"
			, search: ""
			, hash: ""
			, state: null
			, key: "default"
		};

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<Navigation />
			</MemoryRouter>
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
	});

	it('render monitor menu correctly', async () => {

		// Mocking login and admin check
		common.isLoggedIn = jest.fn().mockResolvedValue(true);
		common.isAdmin = jest.fn().mockResolvedValue(true);

		const testEntry = {
			pathname: "/monitor"
			, search: ""
			, hash: ""
			, state: null
			, key: "default"
		};

		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<Navigation />
			</MemoryRouter>
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
	});
});