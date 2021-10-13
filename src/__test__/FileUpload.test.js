import { render, screen } from '@testing-library/react';
import FileUpload from '../File/FileUpload';

it('render upload input correctly', () => {
  render(<FileUpload />);
  const input = screen.getByLabelText('file-upload');
  expect(input).toBeInTheDocument();
});
