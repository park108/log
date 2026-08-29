import { renderHook, waitFor } from '@testing-library/react';
import { createQueryTestWrapper } from '../../test-utils/queryWrapper';
import { useLog } from './useLog';
import * as api from '../api';

vi.mock('../api', () => ({
	getLogs: vi.fn(),
	getLog: vi.fn(),
}));

describe('useLog', () => {

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('resolves to single log payload on success', async () => {
		const payload = { timestamp: 1655737033793, summary: 's', logs: [] };
		vi.mocked(api.getLog).mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => payload,
		} as unknown as Response);

		const { Wrapper, queryClient } = createQueryTestWrapper();
		const { result } = renderHook(() => useLog(1655737033793), { wrapper: Wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(payload);
		expect(api.getLog).toHaveBeenCalledWith(1655737033793);

		// 숫자 인자로 읽어도 캐시 엔트리는 정규화된 문자열 키에 놓인다 (K-4 단일 지점).
		const cached = queryClient.getQueryData(['log', 'detail', '1655737033793']);
		expect(cached).toEqual(payload);
	});

	it('does not call getLog when timestamp is falsy (enabled=false)', async () => {
		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useLog(undefined), { wrapper: Wrapper });

		// Let any microtasks flush; the query must remain idle.
		await Promise.resolve();
		expect(api.getLog).not.toHaveBeenCalled();
		expect(result.current.fetchStatus).toBe('idle');
		expect(result.current.isSuccess).toBe(false);
		expect(result.current.isError).toBe(false);
	});

	it('surfaces error state when getLog returns a non-ok response', async () => {
		vi.mocked(api.getLog).mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({}),
		} as unknown as Response);

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useLog(1655737033793), { wrapper: Wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error!).toBeInstanceOf(Error);
		expect(result.current.error!.message).toContain('500');
	});
});
