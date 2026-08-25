import { useQuery } from '@tanstack/react-query';
import { getLog } from '../api';
import { logDetailKey } from './logQueryKeys';

/**
 * Log 단건 조회 훅. spec `server-state-spec.md` §3.2 queryKey 계층 `['log', 'detail', timestamp]`.
 *
 * `timestamp` 가 falsy 일 때는 `enabled: false` 로 queryFn 을 호출하지 않아
 * 라우트 파라미터 미확정 상태의 불필요 요청을 방지한다.
 *
 * @param {number | string | null | undefined} timestamp
 * @returns {import('@tanstack/react-query').UseQueryResult<unknown, Error>}
 */
export const useLog = (timestamp) => {
	return useQuery({
		// 키 조립은 단일 지점 경유 (REQ-20260825-015 (K-4)). `getLog` 인자와
		// `enabled` 판정은 정규화 전 원값을 그대로 쓴다 — API 경로 표기는 별 축이다.
		queryKey: logDetailKey(timestamp),
		queryFn: async () => {
			const res = await getLog(timestamp);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		},
		enabled: Boolean(timestamp),
	});
};

export default useLog;
