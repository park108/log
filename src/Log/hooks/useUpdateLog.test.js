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
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['log', 'detail', 42] });
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
});
