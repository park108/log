import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postLog } from '../api';

export interface CreateLogVars {
	timestamp: number;
	article: string;
	isTemporary: boolean;
}

export interface MutationCallbacks<V> {
	onSuccess?: (data: unknown, variables: V) => void;
	onError?: (error: Error, variables: V) => void;
}

/**
 * Log 생성 변경 훅. spec `server-state-spec.md` §3.3.1.1 참조.
 *
 * 성공 시 `['log', 'list']` 계층을 invalidate 하여 LogList 가 자동 갱신되도록 한다
 * (기존 `sessionStorage.removeItem("logList")` 트릭을 대체).
 *
 * `mutationFn` 안에서 `status.statusCode !== 200` 을 throw 로 통일하여
 * non-200 응답과 네트워크 레벨 실패가 동일하게 `onError` 경로로 흐르게 한다
 * (REQ-20260418-033 FR-07).
 *
 * 호출처 알림 콜백(`onSuccess` / `onError`)은 **훅 옵션으로 받는다**. `mutate(vars, { onSuccess })`
 * 형태의 per-call 콜백은 `MutationObserver` 가 구독자를 보유할 때만 발화한다
 * (`@tanstack/query-core` `mutationObserver.js` — `if (this.#mutateOptions && this.hasListeners())`).
 * 구독은 컴포넌트의 passive effect 가 커밋될 때 생기므로, Suspense 하위에서 lazy 청크가
 * 아직 커밋되지 않은 창(window) 안에 생성 요청이 완료되면 성공 알림이 조용히 유실된다
 * — 글은 저장됐는데 폼은 `isProcessing` 으로 멈춘 상태가 되고, 사용자는 재시도해 중복 글을 만든다.
 * 훅 옵션 콜백은 `Mutation.execute()` 가 구독 여부와 무관하게 호출하므로 그 창에서도 발화한다
 * (REQ-20260825-014 (M-1)(M-2)(M-3)).
 *
 * @param {{
 *   onSuccess?: (data: unknown, variables: { timestamp: number, article: string, isTemporary: boolean }) => void,
 *   onError?: (error: Error, variables: { timestamp: number, article: string, isTemporary: boolean }) => void,
 * }} [callbacks]
 * @returns {import('@tanstack/react-query').UseMutationResult<
 *   unknown,
 *   Error,
 *   { timestamp: number, article: string, isTemporary: boolean }
 * >}
 */
export const useCreateLog = (callbacks: MutationCallbacks<CreateLogVars> = {}) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ timestamp, article, isTemporary }: CreateLogVars) => {
			const res = await postLog(timestamp, article, isTemporary);
			const status = await res.json();
			if (status.statusCode !== 200) {
				throw new Error(`POST /log failed: statusCode=${status.statusCode}`);
			}
			return status;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['log', 'list'] });
			callbacks.onSuccess?.(data, variables);
		},
		onError: (error, variables) => {
			callbacks.onError?.(error, variables);
		},
	});
};

export default useCreateLog;
