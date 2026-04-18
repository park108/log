import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postLog } from '../api';

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
 * @returns {import('@tanstack/react-query').UseMutationResult<
 *   unknown,
 *   Error,
 *   { timestamp: number, article: string, isTemporary: boolean }
 * >}
 */
export const useCreateLog = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ timestamp, article, isTemporary }) => {
			const res = await postLog(timestamp, article, isTemporary);
			const status = await res.json();
			if (status.statusCode !== 200) {
				throw new Error(`POST /log failed: statusCode=${status.statusCode}`);
			}
			return status;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['log', 'list'] });
		},
	});
};

export default useCreateLog;
