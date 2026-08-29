import { renderHook, act, waitFor } from '@testing-library/react';
import { createQueryTestWrapper } from '../../test-utils/queryWrapper';
import { logDetailKey } from './logQueryKeys';
import { useLog } from './useLog';
import { useUpdateLog } from './useUpdateLog';
import { useDeleteLog } from './useDeleteLog';
import * as api from '../api';

vi.mock('../api', () => ({
	getLog: vi.fn(),
	putLog: vi.fn(),
	deleteLog: vi.fn(),
}));

/**
 * REQ-20260825-015 / spec `components/log` §단건 캐시 키 동일성 계약 (K-2)(K-3) **발화 채널**.
 *
 * 읽기 경로는 `useParams()` 에서 온 **문자열**로 엔트리를 만들고(`LogSingle` → `useLog`),
 * 쓰기 경로는 `historyData.timestamp` 에서 온 **숫자**로 무효화·제거한다
 * (`Writer` → `useUpdateLog` / `useDeleteLog`). 두 표기가 갈리면 키 해시가 달라 무효화가
 * **매칭 0건으로 조용히 성공**한다 — `invalidateQueries` 는 매칭 0건에도 resolve 하므로
 * 실패 신호가 없다. 그래서 이 채널은 두 경로의 **입력 표기를 실제로 갈라서** 쓴다
 * (읽기 = 문자열 `TS_STRING`, 쓰기 = 숫자 `TS_NUMBER`).
 *
 * **fresh 창(`staleTime > 0`)이 필수다** ((R-K3)). 테스트 helper 기본값 `staleTime: 0` 에서는
 * 모든 마운트가 무조건 재조회하므로 무효화 적중과 미적중이 **관측적으로 동일**해진다 —
 * 이 축이 넉 달간 조용했던 이유는 게이트 부재가 아니라 관측 표면의 부재였다.
 * 프로덕션(`src/App.jsx`) 은 분 단위 fresh 창을 쓰므로 그 조건에서만 증상이 드러난다.
 *
 * fresh 창은 `queryClient.setQueryDefaults` 로 **이 키 계층에만** 얹는다. 세 가지 제약을
 * 동시에 지키기 위해서다 (blue spec
 * `react-query-test-queryclient-default-options-single-source-coherence`):
 * (a) 테스트 파일에서 `new QueryClient({ ... })` 를 직접 호출하지 않는다 (D-1),
 * (b) helper 의 전역 기본 옵션 토큰은 유일 출처로 남는다 (D-2) — 전역 기본값을 갈아끼우지
 *     않고 키 계층 default 만 얹으므로 helper 의 단일 출처성이 유지된다,
 * (c) prod 채널 토큰(`60_000`)을 테스트 파일에 복제하지 않는다 (FR-03 — prod/test 토큰 분리).
 *     계약이 요구하는 것은 특정 값이 아니라 **fresh 창의 존재**다.
 */

const TS_NUMBER = 1656034616036;
const TS_STRING = '1656034616036';

const FRESH_WINDOW_MS = 30_000;   // > 0 이면 족하다 — prod 토큰 값 복제는 (c) 위반.
const RETAIN_MS = 5 * 60_000;     // 관찰자가 사라져도 엔트리가 남아야 적중을 잴 수 있다.

const OLD_PAYLOAD = { body: { Count: 1, Items: [{ contents: 'old contents' }] } };
const NEW_PAYLOAD = { body: { Count: 1, Items: [{ contents: 'new contents' }] } };

// 프로덕션과 같은 "재조회 없이 캐시가 그대로 그려지는" 조건을 단건 키 계층에만 재현한다.
const prodLikeWrapper = () => {
	const { Wrapper, queryClient } = createQueryTestWrapper();
	queryClient.setQueryDefaults(['log', 'detail'], {
		staleTime: FRESH_WINDOW_MS,
		gcTime: RETAIN_MS,
	});
	return { Wrapper, queryClient };
};

describe('단건 캐시 키는 생성 경로와 무관하게 동일 엔트리를 가리킨다 (K-2)(K-3)', () => {

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('(K-2) 문자열 경로로 채운 엔트리를 숫자 timestamp 수정이 무효화한다 — 재마운트가 새 내용을 본다', async () => {
		// 1) 읽기 경로(useParams 문자열)로 상세를 조회해 캐시를 채운다.
		vi.mocked(api.getLog).mockResolvedValueOnce({ ok: true, status: 200, json: async () => OLD_PAYLOAD } as unknown as Response);

		const { Wrapper, queryClient } = prodLikeWrapper();
		const read1 = renderHook(() => useLog(TS_STRING), { wrapper: Wrapper });
		await waitFor(() => expect(read1.result.current.data).toEqual(OLD_PAYLOAD));

		// 상세를 떠난다. fresh 창이 열려 있으므로 엔트리는 남고 재조회 대상도 아니다.
		read1.unmount();
		expect(queryClient.getQueryData(logDetailKey(TS_STRING))).toEqual(OLD_PAYLOAD);

		// 2) 수정 저장 — 쓰기 경로는 숫자 timestamp 를 싣는다.
		vi.mocked(api.putLog).mockResolvedValueOnce({ json: async () => ({ statusCode: 200 }) } as unknown as Response);
		vi.mocked(api.getLog).mockResolvedValue({ ok: true, status: 200, json: async () => NEW_PAYLOAD } as unknown as Response);

		const update = renderHook(() => useUpdateLog(), { wrapper: Wrapper });
		await act(async () => {
			await update.result.current.mutateAsync({
				newItem: { timestamp: TS_NUMBER, logs: [{ contents: 'new contents', timestamp: TS_NUMBER }] },
				isTemporary: false,
				timestamp: TS_NUMBER,
			});
		});

		// 3) 상세로 이동 = 같은 문자열 파라미터로 재마운트.
		//    무효화가 적중했으면 엔트리가 stale 이라 재조회 → 새 내용.
		//    빗나갔으면 fresh 창 동안 옛 내용이 그대로 보인다 — 사용자 관측 결함 그 자체다.
		const read2 = renderHook(() => useLog(TS_STRING), { wrapper: Wrapper });
		await waitFor(() => expect(read2.result.current.data).toEqual(NEW_PAYLOAD));
	});

	it('(K-3) 문자열 경로로 채운 엔트리를 숫자 timestamp 삭제가 제거한다', async () => {
		vi.mocked(api.getLog).mockResolvedValueOnce({ ok: true, status: 200, json: async () => OLD_PAYLOAD } as unknown as Response);

		const { Wrapper, queryClient } = prodLikeWrapper();
		const read = renderHook(() => useLog(TS_STRING), { wrapper: Wrapper });
		await waitFor(() => expect(read.result.current.data).toEqual(OLD_PAYLOAD));
		read.unmount();
		expect(queryClient.getQueryData(logDetailKey(TS_STRING))).toEqual(OLD_PAYLOAD);

		vi.mocked(api.deleteLog).mockResolvedValueOnce({ json: async () => ({ statusCode: 200 }) } as unknown as Response);
		const remove = renderHook(() => useDeleteLog(), { wrapper: Wrapper });
		await act(async () => {
			await remove.result.current.mutateAsync({ author: 'a@b.com', timestamp: TS_NUMBER });
		});

		// 엔트리 자체가 사라져야 한다 — 남아 있으면 삭제된 글로 다시 navigate 했을 때
		// 캐시가 옛 내용을 그대로 그린다.
		expect(queryClient.getQueryData(logDetailKey(TS_STRING))).toBeUndefined();
		expect(queryClient.getQueryCache().find({ queryKey: logDetailKey(TS_STRING) })).toBeUndefined();
	});
});
