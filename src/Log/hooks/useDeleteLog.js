import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteLog } from '../api';

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
 * @returns {import('@tanstack/react-query').UseMutationResult<
 *   unknown,
 *   Error,
 *   { author: string, timestamp: number }
 * >}
 */
export const useDeleteLog = () => {
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
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['log', 'list'] });
			queryClient.removeQueries({ queryKey: ['log', 'detail', variables.timestamp] });
		},
	});
};

export default useDeleteLog;
