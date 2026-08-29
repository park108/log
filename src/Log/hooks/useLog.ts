import { useQuery } from '@tanstack/react-query';
import { getLog } from '../api';
import { logDetailKey, type LogTimestamp } from './logQueryKeys';

/**
 * Log 단건 조회 훅. spec `server-state-spec.md` §3.2 queryKey 계층 `['log', 'detail', timestamp]`.
 *
 * `timestamp` 가 falsy 일 때는 `enabled: false` 로 queryFn 을 호출하지 않아
 * 라우트 파라미터 미확정 상태의 불필요 요청을 방지한다.
 *
 * @param {number | string | null | undefined} timestamp
 * @returns {import('@tanstack/react-query').UseQueryResult<unknown, Error>}
 */
export const useLog = (timestamp: LogTimestamp) => {
	return useQuery({
		// 키 조립은 단일 지점 경유 (REQ-20260825-015 (K-4)). `getLog` 인자와
		// `enabled` 판정은 정규화 전 원값을 그대로 쓴다 — API 경로 표기는 별 축이다.
		queryKey: logDetailKey(timestamp),
		queryFn: async () => {
			// `enabled` 가 falsy 를 걸러내므로 여기 도달하면 확정값이다.
			// 타입 시스템은 그 연결을 모르므로 명시적으로 좁힌다 — cast 대신
			// 실제 검사를 두어 enabled 조건이 바뀌면 조용히 통과하지 않게 한다.
			if (timestamp === null || timestamp === undefined) {
				throw new Error("useLog: timestamp 미확정 상태에서 queryFn 이 호출됐다");
			}
			const res = await getLog(timestamp);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		},
		enabled: Boolean(timestamp),
	});
};

export default useLog;
