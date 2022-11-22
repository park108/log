import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Monitor from '../Monitor/Monitor';
import * as common from '../common/common';

console.log = jest.fn();
console.error = jest.fn();

const testEntry = {
	pathname: "/monitor"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};

it('render monitor if it logged in', async () => {
	
	process.env.NODE_ENV = 'development';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Monitor />
		</MemoryRouter>
	);

	const text = await screen.findByText("Contents in the last 6 months");
	expect(text).toBeInTheDocument();
});

it('redirect if not admin', async () => {
	
	process.env.NODE_ENV = 'development';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(false);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Monitor />
		</MemoryRouter>
	);
});