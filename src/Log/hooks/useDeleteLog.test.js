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
		expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['log', 'detail', 42] });
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
