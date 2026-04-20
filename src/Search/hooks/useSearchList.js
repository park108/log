import { useQuery } from '@tanstack/react-query';
import { getSearchList } from '../api';

/**
 * Search 결과 조회 훅. spec `server-state-spec.md` §3.2 queryKey 계층 `['search', 'list', { q }]` 준수.
 *
 * 현재 App 레벨 QueryClient 기본값(staleTime 60s, retry 1) 을 그대로 사용한다 (spec §3.1, override 금지).
 * `enabled: q.length > 0` 로 빈 쿼리/초기 진입은 idle 분기.
 *
 * @param {string} q 검색어.
 * @param {{ enabled?: boolean }} [options]
 * @returns {import('@tanstack/react-query').UseQueryResult<unknown, Error>}
 */
export const useSearchList = (q, { enabled } = {}) => {
	return useQuery({
		queryKey: ['search', 'list', { q }],
		queryFn: async ({ signal }) => {
			const res = await getSearchList(q, { signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		},
		enabled: enabled ?? q.length > 0,
	});
};

export default useSearchList;
