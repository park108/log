import { render, screen } from '@testing-library/react';
import FileItem from '../File/FileItem';

it('render file item name "TestKey.zip" correctly', () => {
  render(<FileItem 
    key={"TestKey.zip"}
    fileName={"TestKey.zip"}
  />);
  const title = screen.getByText("TestKey.zip");
  expect(title).toBeInTheDocument();
});