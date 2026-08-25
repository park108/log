import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteLog } from '../api';
import { logDetailKey } from './logQueryKeys';

/**
 * Log 삭제 변경 훅. spec `server-state-spec.md` §3.3.1.1 항목 3 참조.
 *
 * 성공 시:
 * - `['log', 'list']` 계층을 invalidate → LogList 가 자동 재조회.
 * - `['log', 'detail', timestamp]` 를 removeQueries → 삭제된 단건 캐시 제거
 *   (다시 navigate 시 stale 데이터로 덮이지 않게 함; spec §3.3.1.1 항목 3).
 *
 * `mutationFn` 안에서 `status.statusCode !== 200` 을 throw 로 통일하여
 * non-200 응답과 네트워크 레벨 실패가 동일하게 `onError` 경로로 흐르게 한다
 * (REQ-20260418-033 FR-07).
 *
 * 호출처 알림 콜백(`onSuccess` / `onError`)은 **훅 옵션으로 받는다**. `mutate(vars, { onSuccess })`
 * 형태의 per-call 콜백은 `MutationObserver` 가 구독자를 보유할 때만 발화한다
 * (`@tanstack/query-core` `mutationObserver.js` — `if (this.#mutateOptions && this.hasListeners())`).
 * 구독은 컴포넌트의 passive effect 가 커밋될 때 생기므로, Suspense 하위에서 lazy 청크가
 * 아직 커밋되지 않은 창(window) 안에 삭제 요청이 완료되면 성공 알림이 조용히 유실된다
 * — 서버에서는 지워졌는데 UI 는 아무 것도 알리지 않는 상태가 된다.
 * 훅 옵션 콜백은 `Mutation.execute()` 가 구독 여부와 무관하게 호출하므로 그 창에서도 발화한다.
 *
 * @param {{
 *   onSuccess?: (data: unknown, variables: { author: string, timestamp: number }) => void,
 *   onError?: (error: Error, variables: { author: string, timestamp: number }) => void,
 * }} [callbacks]
 * @returns {import('@tanstack/react-query').UseMutationResult<
 *   unknown,
 *   Error,
 *   { author: string, timestamp: number }
 * >}
 */
export const useDeleteLog = (callbacks = {}) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ author, timestamp }) => {
			const res = await deleteLog(author, timestamp);
			const status = await res.json();
			if (status.statusCode !== 200) {
				throw new Error(`DELETE /log failed: statusCode=${status.statusCode}`);
			}
			return { ...status, timestamp };
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['log', 'list'] });
			queryClient.removeQueries({ queryKey: logDetailKey(variables.timestamp) });
			callbacks.onSuccess?.(data, variables);
		},
		onError: (error, variables) => {
			callbacks.onError?.(error, variables);
		},
	});
};

export default useDeleteLog;
