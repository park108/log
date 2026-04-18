import { renderHook, waitFor } from '@testing-library/react';
import { createQueryTestWrapper } from '../../test-utils/queryWrapper';
import { useLogList } from './useLogList';
import * as api from '../api';

vi.mock('../api', () => ({
	getLogs: vi.fn(),
	getLog: vi.fn(),
}));

describe('useLogList', () => {

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('resolves to list payload on success', async () => {
		const payload = { items: [{ timestamp: 1 }, { timestamp: 2 }], count: 2 };
		api.getLogs.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => payload,
		});

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useLogList(), { wrapper: Wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(payload);
		expect(api.getLogs).toHaveBeenCalledWith(10);
	});

	it('surfaces error state when fetch returns non-ok response', async () => {
		api.getLogs.mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({}),
		});

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useLogList(), { wrapper: Wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBeInstanceOf(Error);
		expect(result.current.error.message).toContain('500');
	});

	it('reflects custom limit parameter in queryKey and fetch call', async () => {
		const payload = { items: [], count: 0 };
		api.getLogs.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => payload,
		});

		const { Wrapper, queryClient } = createQueryTestWrapper();
		const { result } = renderHook(() => useLogList({ limit: 25 }), { wrapper: Wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(api.getLogs).toHaveBeenCalledWith(25);

		const cached = queryClient.getQueryData(['log', 'list', { limit: 25 }]);
		expect(cached).toEqual(payload);
	});
});
