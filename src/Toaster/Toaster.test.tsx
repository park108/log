import { useState } from 'react';
import type { ComponentProps } from 'react';
import { render, screen, act } from '@testing-library/react';
import Toaster from './Toaster';
import type { ToasterShow } from './Toaster';
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

// `duration` 과 `completed` 는 짝이다. 타입이 그 조합을 막지만, 런타임에도
// 던지지 않아야 한다 — 라우트가 ErrorBoundary 로 감싸여 있어 예외 하나가
// 페이지 전체를 오류 화면으로 바꾼다.
// 실측(수정 전): setTimeout(undefined, ms) → "Callback must be provided to timer calls".
describe('Toaster duration·completed 짝', () => {

	it('completed 없이 duration 만 와도 던지지 않는다', () => {

		vi.useFakeTimers();

		// 타입이 막는 조합이라 테스트에서만 우회한다 — 런타임 견고성을 재는 것이 목적이다.
		const props = { show: 1, message: '테스트', duration: 1000 } as unknown as ComponentProps<typeof Toaster>;

		expect(() => {
			render(<Toaster {...props} />);
			vi.advanceTimersByTime(1500);
		}).not.toThrow();

		vi.useRealTimers();
	});

	// 대조 — 짝이 갖춰지면 실제로 불려야 한다. 없으면 "타이머를 아예 안 거는"
	// 구현도 통과한다.
	it('짝이 갖춰지면 duration 뒤에 completed 가 불린다', () => {

		vi.useFakeTimers();

		const completed = vi.fn();
		render(<Toaster show={1} message="테스트" duration={1000} completed={completed} />);

		expect(completed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1500);
		expect(completed).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});
});

// 알림이 연달아 뜰 때 호출처는 message 만 바꾸고 show 는 1 그대로 둔다.
// 타이머 효과의 deps 가 `[show]` 뿐이던 동안 두 번째 알림은 첫 알림의 남은
// 시간만 표시됐다 — 실측: duration 2000ms 인데 600ms 만에 사라졌다.
describe('Toaster 연속 알림', () => {

	const Host = () => {
		const [message, setMessage] = useState('첫 번째');
		const [show, setShow] = useState<ToasterShow>(1);
		return (
			<>
				<button data-testid="second" onClick={() => { setMessage('두 번째'); setShow(1); }}>다시</button>
				<Toaster show={show} message={message} duration={2000} completed={() => setShow(2)} />
			</>
		);
	};

	const fadingOut = (container: HTMLElement): boolean => {
		const el = container.querySelector('[role="alert"]');
		return /fadeout|hide/i.test(el?.className ?? '');
	};

	it('두 번째 알림도 제 시간을 받는다', () => {

		vi.useFakeTimers();

		const { container, getByTestId } = render(<Host />);

		act(() => { vi.advanceTimersByTime(1500); });
		act(() => { getByTestId('second').click(); });

		expect(container.querySelector('[role="alert"]')?.textContent).toBe('두 번째');

		// 첫 알림 기준으로는 이미 2100ms — 이전에는 여기서 사라졌다.
		act(() => { vi.advanceTimersByTime(600); });
		expect(fadingOut(container)).toBe(false);

		vi.useRealTimers();
	});

	// 대조 — 제 시간이 지나면 사라져야 한다. 없으면 "영영 안 닫힘" 구현도 통과한다.
	it('제 시간이 지나면 사라진다', () => {

		vi.useFakeTimers();

		const { container, getByTestId } = render(<Host />);
		act(() => { getByTestId('second').click(); });
		act(() => { vi.advanceTimersByTime(2500); });

		expect(fadingOut(container)).toBe(true);

		vi.useRealTimers();
	});
});
