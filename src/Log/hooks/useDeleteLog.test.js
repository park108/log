import { renderHook, act, waitFor } from '@testing-library/react';
import { createQueryTestWrapper } from '../../test-utils/queryWrapper';
import { useDeleteLog } from './useDeleteLog';
import * as api from '../api';

vi.mock('../api', () => ({
	deleteLog: vi.fn(),
}));

describe('useDeleteLog', () => {

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('resolves on status 200, invalidates [log, list] and removes [log, detail, timestamp]', async () => {
		api.deleteLog.mockResolvedValueOnce({
			json: async () => ({ statusCode: 200 }),
		});

		const { Wrapper, queryClient } = createQueryTestWrapper();
		const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
		const removeSpy = vi.spyOn(queryClient, 'removeQueries');

		const { result } = renderHook(() => useDeleteLog(), { wrapper: Wrapper });

		await act(async () => {
			await result.current.mutateAsync({ author: 'a@b.com', timestamp: 42 });
		});

		expect(api.deleteLog).toHaveBeenCalledWith('a@b.com', 42);
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['log', 'list'] });
		// REQ-20260825-015 (K-3) — 제거 키도 같은 정규화 지점을 경유한다.
		expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['log', 'detail', '42'] });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it('throws (transitions to error) on non-200 statusCode', async () => {
		api.deleteLog.mockResolvedValueOnce({
			json: async () => ({ statusCode: 500 }),
		});

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useDeleteLog(), { wrapper: Wrapper });

		await act(async () => {
			try {
				await result.current.mutateAsync({ author: 'b@b.com', timestamp: 1 });
			} catch (_err) { /* expected */ }
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBeInstanceOf(Error);
		expect(result.current.error.message).toMatch(/statusCode=500/);
	});

	// 회귀 방지 (CI 간헐 red / LogSingle.test.jsx `waitFor("The log is deleted.")` 5000ms timeout):
	// per-call `mutate(vars, { onSuccess })` 콜백은 MutationObserver 가 구독자를 보유할 때만
	// 발화한다 (`@tanstack/query-core` mutationObserver — `if (this.#mutateOptions && this.hasListeners())`).
	// 구독은 호출 컴포넌트의 passive effect 가 커밋될 때 생기므로, 커밋 전(또는 언마운트 후)
	// 응답이 도착하면 성공 알림이 조용히 유실된다 — 서버에서는 지워졌는데 UI 는 침묵한다.
	// 훅 옵션 콜백은 `Mutation.execute()` 가 구독 여부와 무관하게 호출하므로 그 창을 덮는다.
	it('구독자가 없는 창에서 응답이 도착해도 훅 옵션 onSuccess 가 발화한다', async () => {
		let resolveDelete;
		api.deleteLog.mockReturnValueOnce(new Promise((resolve) => { resolveDelete = resolve; }));

		const onSuccess = vi.fn();
		const { Wrapper } = createQueryTestWrapper();
		const { result, unmount } = renderHook(() => useDeleteLog({ onSuccess }), { wrapper: Wrapper });

		act(() => {
			result.current.mutate({ author: 'd@b.com', timestamp: 3 });
		});

		// 옵저버 구독 해제 = per-call 콜백이 버려지는 조건을 결정적으로 재현.
		unmount();

		await act(async () => {
			resolveDelete({ json: async () => ({ statusCode: 200 }) });
		});

		await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
		expect(onSuccess).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 200, timestamp: 3 }),
			{ author: 'd@b.com', timestamp: 3 },
		);
	});

	it('구독자가 없는 창에서 실패해도 훅 옵션 onError 가 발화한다', async () => {
		let rejectDelete;
		api.deleteLog.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectDelete = reject; }));

		const onError = vi.fn();
		const { Wrapper } = createQueryTestWrapper();
		const { result, unmount } = renderHook(() => useDeleteLog({ onError }), { wrapper: Wrapper });

		act(() => {
			result.current.mutate({ author: 'e@b.com', timestamp: 4 });
		});
		unmount();

		await act(async () => {
			rejectDelete(new Error('network'));
		});

		await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
		expect(onError.mock.calls[0][0].message).toMatch(/network/);
	});

	it('surfaces network-level rejection as mutation error', async () => {
		api.deleteLog.mockRejectedValueOnce(new Error('network'));

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useDeleteLog(), { wrapper: Wrapper });

		await act(async () => {
			try {
				await result.current.mutateAsync({ author: 'c@b.com', timestamp: 2 });
			} catch (_err) { /* expected */ }
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error.message).toMatch(/network/);
	});
});
