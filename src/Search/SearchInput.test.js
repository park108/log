import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as common from "../common/common";
import SearchInput from './SearchInput';

console.log = jest.fn();
console.error = jest.fn();

describe('test key up events', () => {

	let inputElement = null;
	let searchButton = null;
	let mobileSearchButton = null;

	it('firing keyUp event', async () => {

		common.isAdmin = jest.fn().mockReturnValue(true);

		process.env.NODE_ENV = 'development';

		const testEntry = {
			pathname: "/log"
			, search: ""
			, hash: ""
			, state: null
			, key: "default"
		};
	
		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		inputElement = screen.getAllByPlaceholderText("Input search string...")[0];
		searchButton = screen.getByText("go");
		mobileSearchButton = screen.getByText("search");

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
	});

	it('firing search when the search string is null', async () => {

		common.isAdmin = jest.fn().mockReturnValue(false);

		process.env.NODE_ENV = 'production';

		const testEntry = {
			pathname: "/log"
			, search: ""
			, hash: ""
			, state: null
			, key: "default"
		};
	
		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		inputElement = screen.getAllByPlaceholderText("Input search string...")[0];
		
		jest.useFakeTimers();

		inputElement.value = "";
		fireEvent.keyUp(inputElement, { keyCode: 13 });
	
		act(() => {
			jest.runOnlyPendingTimers();
		});
		jest.useRealTimers();

		const nullStringAlert = screen.getByText("Enter the keyword to search for");
		expect(nullStringAlert).toBeDefined();
	});
});