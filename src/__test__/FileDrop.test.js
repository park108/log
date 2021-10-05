import { render, screen } from '@testing-library/react';
import FileDrop from '../File/FileDrop';

it('render dropzone text correctly', () => {
  render(<FileDrop />);
  const title = screen.getByText("Drop files here!");
  expect(title).toBeInTheDocument();
});
