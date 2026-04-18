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
		api.postLog.mockResolvedValueOnce({
			json: async () => ({ statusCode: 200 }),
		});

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
		api.postLog.mockResolvedValueOnce({
			json: async () => ({ statusCode: 500 }),
		});

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useCreateLog(), { wrapper: Wrapper });

		await act(async () => {
			try {
				await result.current.mutateAsync({ timestamp: 2, article: 'y', isTemporary: false });
			} catch (_err) { /* expected */ }
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBeInstanceOf(Error);
		expect(result.current.error.message).toMatch(/statusCode=500/);
	});

	it('surfaces network-level rejection as mutation error', async () => {
		api.postLog.mockRejectedValueOnce(new Error('network'));

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useCreateLog(), { wrapper: Wrapper });

		await act(async () => {
			try {
				await result.current.mutateAsync({ timestamp: 3, article: 'z', isTemporary: true });
			} catch (_err) { /* expected */ }
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error.message).toMatch(/network/);
	});
});
