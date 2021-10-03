import { render, screen } from '@testing-library/react';
import Toaster from '../Toaster/Toaster';

it('render message text correctly', () => {
  render(<Toaster 
    message="Test message"
  />);
  const title = screen.getByText("Test message");
  expect(title).toBeInTheDocument();
});

it('render no show', () => {
  render(<Toaster 
    message={"Test message"}
    show={0}
  />);
  const toaster = screen.getByText("Test message");
  expect(toaster).toHaveAttribute('class', 'div div--toaster-hide');
});

it('render information in center', () => {
  render(<Toaster 
    message={"Test message"}
    position={"center"}
    show={1}
  />);
  const toaster = screen.getByText("Test message");
  expect(toaster).toHaveAttribute('class', 'div div--toaster-center div--toaster-information ');
});

it('render success in bottom', () => {
  render(<Toaster 
    message={"Test message"}
    position={"bottom"}
    type={"success"}
    show={1}
  />);
  const toaster = screen.getByText("Test message");
  expect(toaster).toHaveAttribute('class', 'div div--toaster-bottom div--toaster-success ');
});