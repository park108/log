import { render, screen } from '@testing-library/react';
import App from '../App';

// beforeAll(() => {
// 	delete window.location;
// 	window.location = {
// 		href: '/log',
// 	};
// });

it('render title text "park108.net" correctly', async () => {
	render(<App />);
	expect(await screen.findByText("park108.net", {}, { timeout: 0 })).toBeInTheDocument();
});

it('render linkedin link correctly', () => { 
	render(<App />);
	const anchor = screen.getByText('[in]').closest('a');
	expect(anchor).toHaveAttribute('href', 'https://www.linkedin.com/in/jongkil-park-48019576/');
});

it('render github link correctly', () => {
	render(<App />);
	const anchor = screen.getByText('[git]').closest('a');
	expect(anchor).toHaveAttribute('href', 'https://github.com/park108');
});

it('render after resize', () => {

	const spyFunction = jest.fn();
	window.addEventListener('resize', spyFunction);

	const testHeight = 400;
	window.innerHeight = testHeight;
	window.dispatchEvent(new Event('resize'));
	render(<App />);

	expect(spyFunction).toHaveBeenCalled();
	expect(window.innerHeight).toBe(testHeight);
});

it('reload page', () => {

	const spyFunction = jest.fn();
	window.addEventListener('beforeunload', spyFunction);

	window.dispatchEvent(new Event('beforeunload'));
	render(<App />);

	expect(spyFunction).toHaveBeenCalled();
});

it('redirect page', () => {

	render(<App />);
});