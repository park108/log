import { render, screen } from '@testing-library/react';
import App from '../App';

beforeAll(() => {
  delete window.location;
  window.location = {
      href: '',
  };
});

it('render title text "park108.net" correctly', () => {
  render(<App />);
  const title = screen.getByText(/park108.net/i);
  expect(title).toBeInTheDocument();
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
