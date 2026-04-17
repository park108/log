import { render, screen } from '@testing-library/react';
import Toaster from './Toaster';
import styles from './Toaster.module.css';

vi.useFakeTimers();

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
	expect(toaster).toHaveClass(styles.divToasterCenter);
	expect(toaster).toHaveClass(styles.divToasterError);
	expect(toaster).toHaveClass(styles.divToasterHide);
	expect(toaster).toHaveAttribute('data-show', '0');
});

it('render information Toaster in center', () => {
	render(<Toaster
		message={"Test message"}
		position={"center"}
		type={"information"}
		show={1}
	/>);
	const toaster = screen.getByText("Test message");
	expect(toaster).toHaveClass(styles.divToasterCenter);
	expect(toaster).toHaveClass(styles.divToasterInformation);
	expect(toaster).not.toHaveClass(styles.divToasterHide);
	expect(toaster).not.toHaveClass(styles.divToasterFadeout);
	expect(toaster).toHaveAttribute('data-position', 'center');
	expect(toaster).toHaveAttribute('data-type', 'information');
});

it('render success Toaster in bottom', () => {
  render(<Toaster
    message={"Test message"}
    position={"bottom"}
    type={"success"}
    show={1}
  />);
	const toaster = screen.getByText("Test message");
	expect(toaster).toHaveClass(styles.divToasterBottom);
	expect(toaster).toHaveClass(styles.divToasterSuccess);
	expect(toaster).not.toHaveClass(styles.divToasterHide);
	expect(toaster).not.toHaveClass(styles.divToasterFadeout);
});

it('render error Toaster in bottom', () => {
  render(<Toaster
    message={"Test message"}
    position={"bottom"}
    type={"error"}
    show={1}
  />);
	const toaster = screen.getByText("Test message");
	expect(toaster).toHaveClass(styles.divToasterBottom);
	expect(toaster).toHaveClass(styles.divToasterError);
});

it('render success Toaster faded out', async () => {

	vi.useFakeTimers();

	render(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		show={2}
	/>);

	const toaster = await screen.findByText("Test message");
	document.getElementById = vi.fn().mockReturnValue(null);

	vi.advanceTimersByTime(2000);

	expect(toaster).toHaveClass(styles.divToasterBottom);
	expect(toaster).toHaveClass(styles.divToasterSuccess);
	expect(toaster).toHaveClass(styles.divToasterFadeout);

	vi.runOnlyPendingTimers();
	vi.useRealTimers();
});
