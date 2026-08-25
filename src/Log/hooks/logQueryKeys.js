/**
 * 단건 로그 캐시 키의 **유일한 조립 지점** (REQ-20260825-015 (K-2)(K-3)(K-4)).
 *
 * 같은 로그 1건을 가리키는 키는 **생성 경로와 무관하게 동일하게 해시**돼야 한다.
 * React Query 의 키 해시는 JSON 직렬화 기반이라 원소 타입이 갈리면 다른 엔트리가 된다
 * — 읽기 경로는 `useParams()` 에서 온 **문자열**(`LogSingle.jsx` → `useLog`), 쓰기 경로는
 * `historyData.timestamp` 에서 온 **숫자**(`Writer.jsx` → `useUpdateLog` / `useDeleteLog`) 다.
 * 두 표기가 갈리면 무효화·제거가 **매칭 0건으로 조용히 성공**한다 (`invalidateQueries` 는
 * 매칭 0건에도 resolve 한다 — 실패 신호가 없다). 프로덕션은 `App.jsx:22` 가
 * `staleTime: 60_000` 이므로 사용자에게는 **수정 저장 후 상세에서 최대 60초간 옛 내용**으로
 * 나타난다.
 *
 * 그래서 타입 결정은 이 파일 **한 곳**에서만 한다. 소비처는 키 배열 리터럴을 직접 쓰지 않는다.
 *
 * 정규화는 `String()` 이다 — 라우트 파라미터는 임의 문자열일 수 있고 `Number()` 는
 * 비수치 입력을 전부 `NaN`(직렬화 시 `null`)으로 접어 서로 다른 로그를 한 엔트리로
 * 충돌시킨다. `null` / `undefined` 는 그대로 통과시킨다 (`useLog` 가 `enabled: false` 로
 * 걸러내는 미확정 상태이며 `"undefined"` 라는 가짜 식별자를 만들지 않기 위함이다).
 *
 * @param {number | string | null | undefined} timestamp
 * @returns {(string | null | undefined)[]} 단건 queryKey
 */
const normalizeDetailTimestamp = (timestamp) =>
	(timestamp === null || timestamp === undefined) ? timestamp : String(timestamp);

// 배열 리터럴은 **의도적으로 한 줄**이다 — (K-4) 게이트는 행 단위 grep 이라 여러 줄로
// 쪼개면 판정을 통과하는 게 아니라 측정에서 사라진다 (false-negative). 이 한 건이
// 게이트가 허용하는 상한 1 이며, 다른 어떤 프로덕션 파일에도 이 리터럴은 없어야 한다.
export const logDetailKey = (timestamp) => ['log', 'detail', normalizeDetailTimestamp(timestamp)];

export default logDetailKey;
