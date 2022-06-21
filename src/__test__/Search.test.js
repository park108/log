import { render, screen, fireEvent } from '@testing-library/react';
import Search from '../Search/Search';

it('Did not open production yet', () => {
	process.env.NODE_ENV = 'production';
	render(<Search />);
	expect(screen.queryByPlaceholderText("Search log...")).toBe(null);
});

describe('Searching test', () => {

	let inputElement = null;

	beforeEach(() => {
		process.env.NODE_ENV = 'development';
		render(<Search />);

		inputElement = screen.getByPlaceholderText("Search log...");
		inputElement.innerHTML = "SEARCH TEXT";
	});

	it('Test firing search', () => {
		fireEvent.keyUp(inputElement, { keyCode: 13 });
	});

	it('Test another key in', () => {
		fireEvent.keyUp(inputElement, { keyCode: 12 });
	});
});