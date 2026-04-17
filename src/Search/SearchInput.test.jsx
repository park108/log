import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as common from "../common/common";
import SearchInput from './SearchInput';

console.log = vi.fn();
console.error = vi.fn();

const testEntry = {
	pathname: "/log"
	, search: ""
	, hash: ""
	, state: null
	, key: "default"
};

describe('test key up events', () => {

	let inputElement = null;
	let searchButton = null;
	let mobileSearchButton = null;

	it('firing keyUp event', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		process.env.NODE_ENV = 'development';
	
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
		fireEvent.click(searchButton);
		
		expect(mobileSearchButton).toBeDefined();
		fireEvent.click(mobileSearchButton);
		fireEvent.click(mobileSearchButton);
	});

	it('firing search when the search string is null', async () => {

		vi.spyOn(common, "isAdmin").mockReturnValue(false);

		process.env.NODE_ENV = 'production';
	
		render(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<SearchInput />
			</MemoryRouter>
		);

		inputElement = screen.getAllByPlaceholderText("Input search string...")[0];
		
		vi.useFakeTimers();

		inputElement.value = "";
		fireEvent.keyUp(inputElement, { keyCode: 13 });
	
		act(() => {
			vi.runOnlyPendingTimers();
		});
		vi.useRealTimers();

		const nullStringAlert = await screen.findByText("Enter the keyword to search for");
		expect(nullStringAlert).toBeDefined();
	});
});