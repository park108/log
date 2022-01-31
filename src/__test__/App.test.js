import { render, screen } from '@testing-library/react';
import App from '../App';

beforeAll(() => {
  delete window.location;
  window.location = {
      href: '',
  };
});

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
