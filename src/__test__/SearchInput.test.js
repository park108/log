import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import * as common from "../common/common";
import SearchInput from '../Search/SearchInput';

console.log = jest.fn();
console.error = jest.fn();

describe('test key up events', () => {

	let inputElement = null;
	let searchButton = null;
	let mobileSearchButton = null;

	beforeEach(async () => {

		common.isAdmin = jest.fn().mockResolvedValue(true);

		process.env.NODE_ENV = 'development';

		const history = createMemoryHistory();
		history.push({location: {pathname: "/log"}});
		render(
			<Router location={history.location} navigator={history}>
				<SearchInput />
			</Router>
		);

		inputElement = screen.getAllByPlaceholderText("Search logs...")[0];
		searchButton = screen.getByText("go");
		mobileSearchButton = screen.getByText("search");
	});

	it('firing keyUp event', async () => {

		fireEvent.keyUp(inputElement, { keyCode: 97 });
		fireEvent.keyUp(inputElement, { keyCode: 98 });
		fireEvent.keyUp(inputElement, { keyCode: 99 });

		inputElement.value = "테스트";
		fireEvent.keyUp(inputElement, { keyCode: 13 });
		
		expect(searchButton).toBeDefined();
		userEvent.click(searchButton);
		
		expect(mobileSearchButton).toBeDefined();
		userEvent.click(mobileSearchButton);
		userEvent.click(mobileSearchButton);

		common.isAdmin = jest.fn().mockResolvedValue(false);
		fireEvent.keyUp(inputElement, { keyCode: 13 });
	});

	it('firing search when the search string is null', async () => {

		jest.useFakeTimers();

		inputElement.value = "";
		fireEvent.keyUp(inputElement, { keyCode: 13 });
	
		act(() => {
			jest.runOnlyPendingTimers();
		});
		jest.useRealTimers();
	});
});