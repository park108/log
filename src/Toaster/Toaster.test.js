import { render, screen } from '@testing-library/react';
import Toaster from './Toaster';

jest.useFakeTimers();

it('render message text "Test message" correctly', () => {
	render(<Toaster 
		message="Test message"
		type={"warning"}
	/>);
	const title = screen.getByText("Test message");
	expect(title).toBeInTheDocument();
});

it('render Toaster no show', () => {
	render(<Toaster 
		message={"Test message"}
		type={"error"}
		show={0}
	/>);
	const toaster = screen.getByText("Test message");
	expect(toaster).toHaveAttribute('class', 'div div--toaster-center div--toaster-error div--toaster-hide');
});

it('render information Toaster in center', () => {
	render(<Toaster 
		message={"Test message"}
		position={"center"}
		type={"information"}
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

it('render error Toaster in bottom', () => {
  render(<Toaster 
    message={"Test message"}
    position={"bottom"}
    type={"error"}
    show={1}
  />);
  const toaster = screen.getByText("Test message");
  expect(toaster).toHaveAttribute('class', 'div div--toaster-bottom div--toaster-error ');
});

it('render success Toaster faded out', async () => {

	jest.useFakeTimers();

	render(<Toaster 
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		show={2}
	/>);

	const toaster = await screen.findByText("Test message");
	document.getElementById = jest.fn().mockReturnValue(null);

	jest.advanceTimersByTime(2000);

	expect(toaster).toHaveAttribute('class', 'div div--toaster-bottom div--toaster-success div--toaster-fadeout');
	
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
});