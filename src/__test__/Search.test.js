import { render, screen, fireEvent, act } from '@testing-library/react';
import Search from '../Search/Search';

console.log = jest.fn();

it('Did not open production yet', () => {
	process.env.NODE_ENV = 'production';
	render(<Search />);
	expect(screen.queryByPlaceholderText("Search log...")).toBe(null);
});

describe('Searching test', () => {

	let inputElement = null;

	beforeEach(async () => {
		process.env.NODE_ENV = 'development';
		render(<Search />);
		inputElement = screen.getByPlaceholderText("Search log...");
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

	it('firing search when the search string is not null', async () => {

		inputElement.value = "abcd";
		fireEvent.keyUp(inputElement, { keyCode: 13 });
	});

	it('firing keyUp event', async () => {

		fireEvent.keyUp(inputElement, { keyCode: 97 });
		fireEvent.keyUp(inputElement, { keyCode: 98 });
		fireEvent.keyUp(inputElement, { keyCode: 99 });
	});
});