import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Monitor from '../Monitor/Monitor';
import * as common from '../common/common';

console.log = vi.fn();
console.error = vi.fn();

const testEntry = {
	pathname: "/monitor"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};

it('render monitor if it logged in', async () => {
	
	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);

	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Monitor />
		</MemoryRouter>
	);

	const text = await screen.findByText("Contents in the last 6 months");
	expect(text).toBeInTheDocument();
});

it('redirect if not admin', async () => {
	
	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);

	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(false);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Monitor />
		</MemoryRouter>
	);
});