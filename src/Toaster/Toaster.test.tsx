import { render, screen } from '@testing-library/react';
import Toaster from './Toaster';
import styles from './Toaster.module.css';

vi.useFakeTimers({ shouldAdvanceTime: true });

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
	expect(toaster).toHaveClass(styles.divToasterCenter!);
	expect(toaster).toHaveClass(styles.divToasterError!);
	expect(toaster).toHaveClass(styles.divToasterHide!);
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
	expect(toaster).toHaveClass(styles.divToasterCenter!);
	expect(toaster).toHaveClass(styles.divToasterInformation!);
	expect(toaster).not.toHaveClass(styles.divToasterHide!);
	expect(toaster).not.toHaveClass(styles.divToasterFadeout!);
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
	expect(toaster).toHaveClass(styles.divToasterBottom!);
	expect(toaster).toHaveClass(styles.divToasterSuccess!);
	expect(toaster).not.toHaveClass(styles.divToasterHide!);
	expect(toaster).not.toHaveClass(styles.divToasterFadeout!);
});

it('render error Toaster in bottom', () => {
  render(<Toaster
    message={"Test message"}
    position={"bottom"}
    type={"error"}
    show={1}
  />);
	const toaster = screen.getByText("Test message");
	expect(toaster).toHaveClass(styles.divToasterBottom!);
	expect(toaster).toHaveClass(styles.divToasterError!);
});

it('render success Toaster faded out', async () => {

	vi.useFakeTimers({ shouldAdvanceTime: true });

	render(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		show={2}
	/>);

	const toaster = await screen.findByText("Test message");

	await vi.advanceTimersByTimeAsync(2000);

	expect(toaster).toHaveClass(styles.divToasterBottom!);
	expect(toaster).toHaveClass(styles.divToasterSuccess!);
	expect(toaster).toHaveClass(styles.divToasterFadeout!);

	await vi.runOnlyPendingTimersAsync();
});

it('preserves position/type classes after hide (show=2 + timeout)', async () => {
	vi.useFakeTimers({ shouldAdvanceTime: true });

	render(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		show={2}
	/>);

	const toaster = screen.getByRole('alert');
	await vi.advanceTimersByTimeAsync(1000);

	expect(toaster).toHaveClass(styles.divToasterBottom!);
	expect(toaster).toHaveClass(styles.divToasterSuccess!);
	expect(toaster).toHaveClass(styles.divToasterHide!);

	await vi.runOnlyPendingTimersAsync();
});

it('keeps the same DOM node across rerenders (ref stability)', () => {
	const { rerender } = render(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		show={1}
	/>);

	const first = screen.getByRole('alert');

	rerender(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		show={2}
	/>);
	const second = screen.getByRole('alert');

	rerender(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		show={1}
	/>);
	const third = screen.getByRole('alert');

	expect(second).toBe(first);
	expect(third).toBe(first);
});

it('clears the previous timeout when show transitions 1 -> 2', async () => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	const clearSpy = vi.spyOn(global, 'clearTimeout');

	const completed = vi.fn();
	const { rerender } = render(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		duration={5000}
		show={1}
		completed={completed}
	/>);

	const callsAfterShow1 = clearSpy.mock.calls.length;

	rerender(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		duration={5000}
		show={2}
		completed={completed}
	/>);

	// 해제는 effect cleanup **단일 지점**이 진다. 본문 첫머리의 방어적 clear 는
	// 도달 불가라 제거했다 — cleanup 이 항상 먼저 돌며 timerRef 를 null 로 만들기
	// 때문이다. 따라서 show 전이 1회당 clearTimeout 은 정확히 1회 늘어난다.
	// (기존 단언은 `> callsAfterShow1` 이라 해제가 두 곳에서 나도, 한 곳에서 나도
	//  통과했다 — 어느 쪽인지 구별하지 못했다.)
	expect(clearSpy.mock.calls.length).toBe(callsAfterShow1 + 1);

	clearSpy.mockRestore();
	await vi.runOnlyPendingTimersAsync();
});

it('does not call document.getElementById', async () => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	const getByIdSpy = vi.spyOn(document, 'getElementById');

	const { rerender, unmount } = render(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		show={1}
		duration={500}
		completed={() => {}}
	/>);

	rerender(<Toaster
		message={"Test message"}
		position={"bottom"}
		type={"success"}
		show={2}
	/>);

	await vi.advanceTimersByTimeAsync(2000);

	expect(getByIdSpy).toHaveBeenCalledTimes(0);

	unmount();
	getByIdSpy.mockRestore();
	await vi.runOnlyPendingTimersAsync();
});
