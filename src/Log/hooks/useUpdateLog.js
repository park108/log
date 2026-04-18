import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putLog } from '../api';

/**
 * Log 수정 변경 훅. spec `server-state-spec.md` §3.3.1.1 참조.
 *
 * 성공 시 `['log', 'list']` 와 해당 `['log', 'detail', timestamp]` 양쪽을
 * invalidate 하여 목록 / 단건 뷰가 자동 갱신되도록 한다
 * (기존 `sessionStorage.removeItem("logList" | "logListLastTimestamp")` 트릭을 대체).
 *
 * `mutationFn` 안에서 `status.statusCode !== 200` 을 throw 로 통일하여
 * non-200 응답과 네트워크 레벨 실패가 동일하게 `onError` 경로로 흐르게 한다
 * (REQ-20260418-033 FR-07).
 *
 * @returns {import('@tanstack/react-query').UseMutationResult<
 *   unknown,
 *   Error,
 *   { newItem: object, isTemporary: boolean, timestamp: number }
 * >}
 */
export const useUpdateLog = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ newItem, isTemporary }) => {
			const res = await putLog(newItem, isTemporary);
			const status = await res.json();
			if (status.statusCode !== 200) {
				throw new Error(`PUT /log failed: statusCode=${status.statusCode}`);
			}
			return status;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['log', 'list'] });
			queryClient.invalidateQueries({ queryKey: ['log', 'detail', variables.timestamp] });
		},
	});
};

export default useUpdateLog;
