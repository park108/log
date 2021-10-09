import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import Toaster from '../Toaster/Toaster';

it('render message text "Test message" correctly', () => {
  render(<Toaster 
    message="Test message"
  />);
  const title = screen.getByText("Test message");
  expect(title).toBeInTheDocument();
});

it('render Toaster no show', () => {
  render(<Toaster 
    message={"Test message"}
    show={0}
  />);
  const toaster = screen.getByText("Test message");
  expect(toaster).toHaveAttribute('class', 'div div--toaster-hide');
});

it('render information Toaster in center', () => {
  render(<Toaster 
    message={"Test message"}
    position={"center"}
    show={1}
  />);
  const toaster = screen.getByText("Test message");
  expect(toaster).toHaveAttribute('class', 'div div--toaster-center div--toaster-information ');
});

it('render success Toaster in bottom', () => {
  render(<Toaster 
    message={"Test message"}
    position={"bottom"}
    type={"success"}
    show={1}
  />);
  const toaster = screen.getByText("Test message");
  expect(toaster).toHaveAttribute('class', 'div div--toaster-bottom div--toaster-success ');
});

it('render success Toaster in bottom with duration', () => {
  
  jest.useFakeTimers();

  render(<Toaster 
    message={"Test message"}
    position={"center"}
    duration={1000}
    show={1}
  />);

  act(() => {
    jest.advanceTimersByTime(1000);
    const toaster = screen.getByText("Test message");
    expect(toaster).toHaveAttribute('class', 'div div--toaster-center div--toaster-information ');
  });
});

it('render success Toaster faded out', () => {
  render(<Toaster 
    message={"Test message"}
    position={"bottom"}
    type={"success"}
    show={2}
  />);
  const toaster = screen.getByText("Test message");
  expect(toaster).toHaveAttribute('class', 'div div--toaster-bottom div--toaster-success  div--toaster-fadeout');
});