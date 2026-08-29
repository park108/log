import { renderHook, act, waitFor } from '@testing-library/react';
import { createQueryTestWrapper } from '../../test-utils/queryWrapper';
import { useCreateLog } from './useCreateLog';
import * as api from '../api';

vi.mock('../api', () => ({
	postLog: vi.fn(),
}));

describe('useCreateLog', () => {

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('resolves on status 200 and invalidates [log, list]', async () => {
		vi.mocked(api.postLog).mockResolvedValueOnce({
			json: async () => ({ statusCode: 200 }),
		} as unknown as Response);

		const { Wrapper, queryClient } = createQueryTestWrapper();
		const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

		const { result } = renderHook(() => useCreateLog(), { wrapper: Wrapper });

		await act(async () => {
			await result.current.mutateAsync({ timestamp: 1, article: 'x', isTemporary: false });
		});

		expect(api.postLog).toHaveBeenCalledWith(1, 'x', false);
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['log', 'list'] });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it('throws (transitions to error) on non-200 statusCode', async () => {
		vi.mocked(api.postLog).mockResolvedValueOnce({
			json: async () => ({ statusCode: 500 }),
		} as unknown as Response);

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useCreateLog(), { wrapper: Wrapper });

		await act(async () => {
			try {
				await result.current.mutateAsync({ timestamp: 2, article: 'y', isTemporary: false });
			} catch (_err) { /* expected */ }
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error!).toBeInstanceOf(Error);
		expect(result.current.error!.message).toMatch(/statusCode=500/);
	});

	it('surfaces network-level rejection as mutation error', async () => {
		vi.mocked(api.postLog).mockRejectedValueOnce(new Error('network'));

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useCreateLog(), { wrapper: Wrapper });

		await act(async () => {
			try {
				await result.current.mutateAsync({ timestamp: 3, article: 'z', isTemporary: true });
			} catch (_err) { /* expected */ }
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error!.message).toMatch(/network/);
	});
	// REQ-20260825-014 (M-1)(M-2)(M-3) — 훅 옵션 콜백은 구독 성립 시점에 종속되지 않는다.
	// per-call `mutate(vars, { onSuccess })` 는 MutationObserver 가 구독자를 보유할 때만
	// 발화한다 (`@tanstack/query-core` mutationObserver —
	// `if (this.#mutateOptions && this.hasListeners())`). `unmount()` 로 그 조건을 결정적으로
	// 재현한다. 호출처 표면(`Writer`) 판정은 `mutation-notification-subscription-order.test.jsx`.
	it('구독자가 없는 창에서 응답이 도착해도 훅 옵션 onSuccess 가 발화한다', async () => {
		let resolvePost!: (value: Response | PromiseLike<Response>) => void;
		vi.mocked(api.postLog).mockReturnValueOnce(new Promise<Response>((resolve) => { resolvePost = resolve; }));

		const onSuccess = vi.fn();
		const { Wrapper } = createQueryTestWrapper();
		const { result, unmount } = renderHook(() => useCreateLog({ onSuccess }), { wrapper: Wrapper });

		act(() => {
			result.current.mutate({ timestamp: 11, article: 'a', isTemporary: false });
		});
		unmount();

		await act(async () => {
			resolvePost({ json: async () => ({ statusCode: 200 } as unknown as Response) } as unknown as Response);
		});

		await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
		expect(onSuccess.mock.calls[0]![1]).toEqual(
			expect.objectContaining({ timestamp: 11 }));
	});

	it('구독자가 없는 창에서 실패해도 훅 옵션 onError 가 발화한다', async () => {
		let rejectPost!: (reason?: unknown) => void;
		vi.mocked(api.postLog).mockReturnValueOnce(new Promise<Response>((_resolve, reject) => { rejectPost = reject; }));

		const onError = vi.fn();
		const { Wrapper } = createQueryTestWrapper();
		const { result, unmount } = renderHook(() => useCreateLog({ onError }), { wrapper: Wrapper });

		act(() => {
			result.current.mutate({ timestamp: 12, article: 'b', isTemporary: false });
		});
		unmount();

		await act(async () => {
			rejectPost(new Error('network'));
		});

		await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
		expect(onError.mock.calls[0]![0].message).toMatch(/network/);
	});
});
