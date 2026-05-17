import { renderHook, waitFor } from '@testing-library/react';
import { createQueryTestWrapper } from '../../test-utils/queryWrapper';
// TSK-20260517-19 / REQ-20260517-082 — `mock.calls[N]` strict narrow 단일 출처.
import { firstCall } from '../../test-utils/mockCalls';
import { useSearchList } from './useSearchList';
import * as api from '../api';

vi.mock('../api', () => ({
	getSearchList: vi.fn(),
}));

const mockedGetSearchList = vi.mocked(api.getSearchList);

describe('useSearchList', () => {

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('resolves to payload on success and forwards AbortSignal to api', async () => {
		const payload = { body: { QueryString: 'foo', TotalCount: 1, ProcessingTime: 10, Items: [{ timestamp: 1, contents: 'foo', author: 'u' }] } };
		mockedGetSearchList.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => payload,
		} as Response);

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useSearchList('foo'), { wrapper: Wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(payload);
		expect(mockedGetSearchList).toHaveBeenCalledTimes(1);
		const [calledQ, calledOpts] = firstCall(mockedGetSearchList);
		expect(calledQ).toBe('foo');
		expect(calledOpts?.signal).toBeInstanceOf(AbortSignal);
	});

	it('surfaces error state when fetch returns non-ok response', async () => {
		mockedGetSearchList.mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({}),
		} as Response);

		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useSearchList('foo'), { wrapper: Wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBeInstanceOf(Error);
		expect(result.current.error!.message).toContain('500');
	});

	it('stays idle when enabled=false and does not call api', async () => {
		const { Wrapper } = createQueryTestWrapper();
		const { result } = renderHook(() => useSearchList('x', { enabled: false }), { wrapper: Wrapper });

		// fetchStatus must be 'idle' when disabled.
		expect(result.current.fetchStatus).toBe('idle');
		expect(result.current.isLoading).toBe(false);
		expect(mockedGetSearchList).not.toHaveBeenCalled();
	});

	it('aborts in-flight AbortSignal on unmount', async () => {
		let capturedSignal: AbortSignal | undefined;
		mockedGetSearchList.mockImplementationOnce((_q: string, { signal }: { signal?: AbortSignal } = {}) => {
			capturedSignal = signal;
			// never-resolving promise to keep fetch in-flight
			return new Promise<Response>(() => {});
		});

		const { Wrapper } = createQueryTestWrapper();
		const { unmount } = renderHook(() => useSearchList('bar'), { wrapper: Wrapper });

		await waitFor(() => expect(mockedGetSearchList).toHaveBeenCalledTimes(1));
		expect(capturedSignal).toBeInstanceOf(AbortSignal);
		expect(capturedSignal!.aborted).toBe(false);

		unmount();

		// queryClient.gcTime=0 triggers cancellation on unmount per TanStack Query internals.
		await waitFor(() => expect(capturedSignal!.aborted).toBe(true));
	});
});
