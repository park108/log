import { act, render, renderHook } from '@testing-library/react';
import { useHoverPopup } from './useHoverPopup';
// TSK-20260517-19 / REQ-20260517-082 — `mock.calls[N]` strict narrow 단일 출처.
import { firstCall } from '../test-utils/mockCalls';

describe('useHoverPopup', () => {

	it('initial state: isVisible=false, contentProps carries id and aria-hidden=true, triggerProps.aria-describedby=undefined', () => {
		const { result } = renderHook(() => useHoverPopup());

		expect(result.current.isVisible).toBe(false);
		expect(typeof result.current.id).toBe('string');
		expect(result.current.id.length).toBeGreaterThan(0);
		expect(result.current.contentProps.id).toBe(result.current.id);
		expect(result.current.contentProps.role).toBe('tooltip');
		expect(result.current.contentProps['aria-hidden']).toBe(true);
		expect(result.current.triggerProps['aria-describedby']).toBeUndefined();
	});

	it('onMouseEnter shows popup immediately and onMouseLeave hides after 100ms', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { result } = renderHook(() => useHoverPopup());

		act(() => {
			result.current.triggerProps.onMouseEnter();
		});
		expect(result.current.isVisible).toBe(true);
		expect(result.current.contentProps['aria-hidden']).toBe(false);
		expect(result.current.triggerProps['aria-describedby']).toBe(result.current.id);

		act(() => {
			result.current.triggerProps.onMouseLeave();
		});
		// hide 는 100ms 딜레이 — 직후에는 여전히 true
		expect(result.current.isVisible).toBe(true);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(result.current.isVisible).toBe(false);
		expect(result.current.contentProps['aria-hidden']).toBe(true);
		expect(result.current.triggerProps['aria-describedby']).toBeUndefined();
	});

	it('onFocus shows and onBlur hides (keyboard accessibility, WCAG 2.1 SC 1.4.13)', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { result } = renderHook(() => useHoverPopup());

		act(() => {
			result.current.triggerProps.onFocus();
		});
		expect(result.current.isVisible).toBe(true);

		await act(async () => {
			result.current.triggerProps.onBlur();
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(result.current.isVisible).toBe(false);
	});

	it('onTouchStart shows popup (touch device fallback, FR-05)', () => {
		const { result } = renderHook(() => useHoverPopup());

		act(() => {
			result.current.triggerProps.onTouchStart();
		});
		expect(result.current.isVisible).toBe(true);
	});

	it('Escape key hides the popup when visible (dismissible)', () => {
		const { result } = renderHook(() => useHoverPopup());

		act(() => {
			result.current.triggerProps.onMouseEnter();
		});
		expect(result.current.isVisible).toBe(true);

		act(() => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		});
		expect(result.current.isVisible).toBe(false);
	});

	it('closeOnEscape=false disables Escape handler', () => {
		const { result } = renderHook(() => useHoverPopup({ closeOnEscape: false }));

		act(() => {
			result.current.triggerProps.onMouseEnter();
		});
		expect(result.current.isVisible).toBe(true);

		act(() => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		});
		expect(result.current.isVisible).toBe(true);
	});

	it('two hook instances receive distinct ids (useId() uniqueness, FR-06)', () => {
		// 각 훅 인스턴스가 서로 다른 id 를 받는지 확인 — `getElementById` 첫 매칭 버그 (LogList 내
		// row 중복 ID) 의 재발 방지.
		const probe = vi.fn();
		function Probe() {
			const a = useHoverPopup();
			const b = useHoverPopup();
			probe(a.id, b.id);
			return null;
		}
		render(<Probe />);

		expect(probe).toHaveBeenCalled();
		const [idA, idB] = firstCall(probe);
		expect(typeof idA).toBe('string');
		expect(typeof idB).toBe('string');
		expect(idA).not.toBe(idB);
	});

	it('pending hide timer is cleared on unmount (no memory leak)', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { result, unmount } = renderHook(() => useHoverPopup());

		act(() => {
			result.current.triggerProps.onMouseEnter();
			result.current.triggerProps.onMouseLeave();
		});
		// hide 타이머가 큐에 있어야 정상 — 언마운트 후 advance 해도 setState 경고 없음.
		unmount();
		await expect(
			vi.advanceTimersByTimeAsync(500),
		).resolves.not.toThrow();
	});

	it('contentProps.onMouseEnter cancels the pending hide (hover bridge trigger → content)', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { result } = renderHook(() => useHoverPopup());

		act(() => {
			result.current.triggerProps.onMouseEnter();
		});
		expect(result.current.isVisible).toBe(true);

		act(() => {
			result.current.triggerProps.onMouseLeave();
		});
		// 보류 타이머 존재 — content 로 hover 가 브릿지되면 취소.
		await act(async () => {
			result.current.contentProps.onMouseEnter();
			await vi.advanceTimersByTimeAsync(200);
		});
		expect(result.current.isVisible).toBe(true);
	});

});
