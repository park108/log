import { render, screen } from '@testing-library/react';
import ImageSelector from '../Image/ImageSelector';

it('render image selector loading text correctly', () => {
  render(<ImageSelector />);
  const loading = screen.getByText('Loading...');
  expect(loading).toBeInTheDocument();
});
