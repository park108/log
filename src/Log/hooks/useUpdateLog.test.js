import { renderHook, act, waitFor } from '@testing-library/react';
import { createQueryTestWrapper } from '../../test-utils/queryWrapper';
import { useUpdateLog } from './useUpdateLog';
import * as api from '../api';

vi.mock('../api', () => ({
	putLog: vi.fn(),
}));

describe('useUpdateLog', () => {

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('resolves on status 200 and invalidates both [log, list] and [log, detail, timestamp]', async () => {
		api.putLog.mockResolvedValueOnce({
			json: async () => ({ statusCode: 200 }),
		});

		const { Wrapper, queryClient } = createQueryTestWrapper();
		const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

		const { result } = renderHook(() => useUpdateLog(), { wrapper: Wrapper });

		const newItem = { timestamp: 42, logs: [{ contents: 'edited', timestamp: 42 }] };

		await act(async () => {
			await result.current.mutateAsync({ newItem, isTemporary: false, timestamp: 42 });
		});

		expect(api.putLog).toHaveBeenCalledWith(newItem, false);
		expect(invalidateSpy).toHaveBeenCalledTimes(2);
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['log', 'list'] });
		// REQ-20260825-015 (K-2) — 무효화 키는 정규화(String) 표기다. 읽기 경로가
		// `useParams()` 문자열로 만든 엔트리와 같은 해시여야 하기 때문이다.
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['log', 'detail', '42'] });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it('throws (transitions to error) on non-200 statusCode', async () => {
		api.putLog.mockResolvedValueOnce({
			json: async () => ({ statusCode: 500 }),
		});

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useUpdateLog(), { wrapper: Wrapper });

		const newItem = { timestamp: 77, logs: [{ contents: 'x', timestamp: 77 }] };

		await act(async () => {
			try {
				await result.current.mutateAsync({ newItem, isTemporary: false, timestamp: 77 });
			} catch (_err) { /* expected */ }
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBeInstanceOf(Error);
		expect(result.current.error.message).toMatch(/statusCode=500/);
	});

	it('surfaces network-level rejection as mutation error', async () => {
		api.putLog.mockRejectedValueOnce(new Error('network'));

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useUpdateLog(), { wrapper: Wrapper });

		const newItem = { timestamp: 99, logs: [{ contents: 'y', timestamp: 99 }] };

		await act(async () => {
			try {
				await result.current.mutateAsync({ newItem, isTemporary: true, timestamp: 99 });
			} catch (_err) { /* expected */ }
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error.message).toMatch(/network/);
	});
	// REQ-20260825-014 (M-1)(M-2)(M-3) — 훅 옵션 콜백은 구독 성립 시점에 종속되지 않는다.
	// (`useCreateLog.test.js` 동일 이디엄 — `unmount()` 로 구독 해제 창을 결정적으로 재현.)
	it('구독자가 없는 창에서 응답이 도착해도 훅 옵션 onSuccess 가 발화한다', async () => {
		let resolvePut;
		api.putLog.mockReturnValueOnce(new Promise((resolve) => { resolvePut = resolve; }));

		const onSuccess = vi.fn();
		const { Wrapper } = createQueryTestWrapper();
		const { result, unmount } = renderHook(() => useUpdateLog({ onSuccess }), { wrapper: Wrapper });

		act(() => {
			result.current.mutate({ newItem: { timestamp: 21 }, isTemporary: false, timestamp: 21 });
		});
		unmount();

		await act(async () => {
			resolvePut({ json: async () => ({ statusCode: 200 }) });
		});

		await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
		expect(onSuccess.mock.calls[0][1]).toEqual(
			expect.objectContaining({ timestamp: 21 }));
	});

	it('구독자가 없는 창에서 비-200 이 도착해도 훅 옵션 onError 가 발화한다', async () => {
		let resolvePut;
		api.putLog.mockReturnValueOnce(new Promise((resolve) => { resolvePut = resolve; }));

		const onError = vi.fn();
		const { Wrapper } = createQueryTestWrapper();
		const { result, unmount } = renderHook(() => useUpdateLog({ onError }), { wrapper: Wrapper });

		act(() => {
			result.current.mutate({ newItem: { timestamp: 22 }, isTemporary: false, timestamp: 22 });
		});
		unmount();

		await act(async () => {
			resolvePut({ json: async () => ({ statusCode: 500 }) });
		});

		await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
		expect(onError.mock.calls[0][0].message).toMatch(/statusCode=500/);
	});
});
