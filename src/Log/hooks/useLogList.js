import { useQuery } from '@tanstack/react-query';
import { getLogs } from '../api';

const DEFAULT_LIMIT = 10;

/**
 * Log 목록 조회 훅. spec `server-state-spec.md` §3.2 queryKey 계층 `['log', 'list', params]` 준수.
 *
 * 현재 App 레벨 QueryClient 기본값(staleTime 60s, retry 1) 을 그대로 사용한다 (spec §3.1).
 *
 * @param {{ limit?: number }} [options]
 * @returns {import('@tanstack/react-query').UseQueryResult<unknown, Error>}
 */
export const useLogList = ({ limit = DEFAULT_LIMIT } = {}) => {
	return useQuery({
		queryKey: ['log', 'list', { limit }],
		queryFn: async () => {
			const res = await getLogs(limit);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		},
	});
};

export default useLogList;
