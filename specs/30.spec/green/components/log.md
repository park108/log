# Log 컴포넌트 (로그 목록 / 단건 / 작성기 서브 라우트)

> **위치**: `src/Log/` (Log.jsx, LogList.jsx, LogSingle.jsx, LogItem.jsx, LogItemInfo.jsx, Writer.jsx, api.js, api.mock.js, hooks/**, Log.css, Writer.css)
> **관련 요구사항**: REQ-20260421-027, REQ-20260421-030, REQ-20260421-042, REQ-20260422-045, **REQ-20260825-014** (뮤테이션 완료 알림 축), **REQ-20260825-015** (단건 캐시 키 동일성 축)
> **선행 판본**: 동일 slug `components/log` 의 blue 판본 (동일 상대 경로 — 승격 시 대체된다).
> **최종 업데이트**: 2026-08-25 (by inspector — tick 222. blue 판본을 green 으로 내려 **뮤테이션 완료 알림 축(M-1~M-4)** 과 **단건 캐시 키 동일성 축(K-1~K-4)** 을 흡수했다. 두 축 모두 `src/Log/**` 귀속이라 `components/` = `src/` 구현 단위 1:1 원칙에 따라 별 파일을 만들지 않았다 — `components/monitor` 병합과 같은 판단이다. 기존 네 축(REQ-027/030/042/045)의 서술은 손대지 않았다)

> **식별자 네임스페이스**: 뮤테이션 완료 알림 축은 `M-n`, 단건 캐시 키 동일성 축은 `K-n` 이다. 두 축은 같은 `onSuccess` 안에 있으나 판정 대상이 다르다 — 전자는 **콜백이 발화하는가**, 후자는 **발화한 콜백이 겨눈 캐시 엔트리가 실재하는가** 다. 하나가 성립해도 다른 하나는 위반일 수 있다.

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=c563025).

## 역할
`/log/*` 하위 서브 라우트 셸. `isAdmin()` 분기로 글 작성 진입 (`+` 버튼 → `/log/write`) 을 노출하고, 목록(`LogList`) · 단건(`LogSingle`) · 검색 결과(`Search`) · 작성기(`Writer`) 를 lazy 로드한다. `LogList` 는 1차 페치 + `seeMoreButton` 으로 커서 기반 페이지네이션 (DynamoDB `LastEvaluatedKey.timestamp`) 을 수행하며, `sessionStorage` 를 캐시로 사용한다. `LogSingle` 은 단건 + `Comment` 스레드. `Writer` 는 새 글·편집·삭제·이미지 삽입을 담당한다. 데이터 훅은 TanStack Query v5 기반 (`useLogList`, `useLog`, `useCreateLog`, `useUpdateLog`, `useDeleteLog`).

아울러 이 영역의 **뮤테이션 완료 알림은 구독 성립 시점에 종속되지 않으며**, 같은 로그 1건을 가리키는 **단건 queryKey 는 생성 경로와 무관하게 동일하게 해시된다**.

두 명제는 하나의 사슬이다. 사용자가 글을 저장하고 상세로 이동하는 한 동선에서, 앞의 것이 깨지면 **알림 자체가 오지 않고**(폼이 멈춘다) 뒤의 것이 깨지면 **알림은 왔는데 화면이 옛 내용을 보여준다**. 둘 다 예외를 던지지 않고 로그도 남기지 않는다 — 관측 가능한 흔적이 **없음** 그 자체다. 두 축 모두 `RULE-07 §주제 우선순위` **1순위 (사용자 관측 가능 동작)** 귀속이다.

두 축이 의도적으로 하지 않는 것:
- (i) 알림 전달 **수단** 지정(훅 옵션 / `mutateAsync` / `onSettled`) 과 키 정규화 **수단** 지정(키 팩토리 모듈 / 호출처 캐스팅 / 라우트 로더) — planner·developer 영역. 결과 계약만 박제한다.
- (ii) `staleTime` 값 자체의 조정. 값을 낮춰 증상을 가리는 것은 회복이 아니라 은폐다 — 프로덕션 `App.jsx:22` 의 `staleTime: 60_000` 은 정책이고, 본 계약은 그 정책 아래에서 성립해야 한다.
- (iii) `['log', 'list']` 접두 계층. 접두 매칭이라 현재 정합이며 대상이 아니다.
- (iv) `Image`·`File`·`Comment` 의 비-react-query 요청 경로.

## 공개 인터페이스
- 진입 컴포넌트: `Log` (default export).
  - props: `{ contentHeight?: object }` (상위 `App` 이 전달한 `<main>` 인라인 스타일).
- 하위 라우트 (`src/Log/Log.jsx:24-29, 38-42`):
  - `/log/` → `LogList`
  - `/log/search` → `Search`
  - `/log/:timestamp` → `LogSingle`
  - `/log/write` → `Writer` (admin 전용; non-admin 은 라우트 자체를 노출하지 않음).
- 하위 컴포넌트 기본 export: `LogList`, `LogItem`, `LogItemInfo`, `LogSingle`, `Writer`.
- API 모듈 (`src/Log/api.js`): `getLogs`, `getNextLogs`, `getLog`, `postLog`, `putLog`, `deleteLog` (fetch 기반, `api.mock.js` 는 테스트용 stub).
- 훅 모듈 (`src/Log/hooks/`): `useLogList`, `useLog`, `useCreateLog`, `useUpdateLog`, `useDeleteLog` (TanStack Query `useQuery` / `useMutation` 래퍼).

## 동작
1. `Log` 마운트 시 `isAdmin()` 판정으로 작성 진입 버튼 노출 여부 결정.
2. `LogList`
   - 마운트 직후 `sessionStorage.logList` 가 있으면 그대로 렌더 (네트워크 회피).
   - 없으면 `getLogs()` → 성공 시 `logs`, `lastTimestamp` 세팅, 실패 시 에러 섹션 + Retry 버튼.
   - `See more` 클릭 시 `getNextLogs(lastTimestamp)` 로 이어붙임.
   - 로딩 중 `Toaster` 에 "Loading logs..." 노출 (`isShowToasterCenter` 1→2 라이프사이클).
   - `isPostSuccess` prop 변경 시 목록 리페치 트리거.
   - `logs` / `lastTimestamp` 변화 시 각각 `sessionStorage` 에 박제.
3. `LogSingle`
   - `useParams().timestamp` 로 `getLog` 호출, 본문 렌더 후 `Comment` 섹션 마운트.
4. `Writer`
   - admin 전용. 새 글 작성 · 기존 글 편집 · 삭제 · 이미지 삽입 (`ImageSelector`) 을 포함.

### 뮤테이션 완료 알림 계약 (M)

**(M-1) 구독 시점 비종속** — 로그 생성·수정·삭제 뮤테이션이 성공하면 호출처의 성공 알림 동작이 **정확히 1회** 실행된다. 호출 컴포넌트의 mount effect 가 응답 도착 **이전**에 커밋됐는지 **이후**에 커밋됐는지에 무관하다.

기전은 라이브러리 소스에서 확정된다 — `@tanstack/query-core` `build/modern/mutationObserver.js:77`:

```js
if (this.#mutateOptions && this.hasListeners()) {   // per-call onSuccess/onError/onSettled 전부 이 뒤
```

`#mutateOptions` 는 `mutate(vars, options)` 의 2번째 인자다. `hasListeners()` 는 호출 컴포넌트의 **passive effect 가 커밋된 뒤**에야 참이 된다. 컴포넌트가 lazy 하위를 가진 `Suspense` 하위에 있으면 그 청크가 커밋되기 전까지 mount effect 가 돌지 않는다. **그 창 안에 응답이 도착하면 per-call 콜백은 조용히 버려진다** — 예외도 로그도 없다. 훅 옵션(`useMutation({ onSuccess })`)으로 전달된 콜백은 이 게이트 뒤에 있지 않다.

**(M-2) 실패 경로 대칭** — 비-200·네트워크 오류 경로의 호출처 알림도 (M-1) 과 동일하게 구독 시점 비종속이다.

**(M-3) 시그니처 가용성** — 호출처 알림 콜백을 받는 경로가 훅의 **공개 시그니처에 존재**한다. 호출처가 구독 종속 경로를 쓸 수밖에 없는 상태를 남기지 않는다. HEAD=`ff699f9` 실측 — `useDeleteLog.js:34` 는 `(callbacks = {}) =>` 로 경로를 갖지만 `useCreateLog.js:20` · `useUpdateLog.js:21` 은 `= () =>` 로 **인자를 아예 받지 않는다**. 즉 `Writer.jsx` 에는 per-call 말고 선택지가 없다.

**(M-4) per-call 전달 부재** — `src/**` 프로덕션 코드에 `.mutate(<vars>, { … })` 형태의 per-call 콜백 전달이 잔존하지 않는다. HEAD=`ff699f9` 실측 **2건** — `Writer.jsx:137`(생성) · `:181`(수정). `LogItem.jsx:49` 은 1인자라 대상이 아니다 (`ff699f9` 가 훅 옵션 경로로 이관 완료).

**구조 조건은 이미 성립해 있다.** `Writer.jsx:12,13` 이 `LogItem`·`ImageSelector` 를 `lazy` 로 보유하고 `:308,:392` 에 `Suspense` 경계가 있다 — 삭제 경로에서 master 를 red 로 만든 것과 **같은 기전·같은 구조 조건**이며, 생성·수정 경로는 아직 그 실측을 겪지 않았을 뿐이다.

**사용자 관측 가능 귀결.** `Writer.jsx:141-151` per-call `onSuccess` 는 `setToasterMessage("The log posted.")` · `setIsProcessing(false)` · `navigate("/log/" + newTimestamp)` 를 수행한다. 유실되면 **글은 서버에 저장됐는데 화면은 작성 폼에 `isProcessing=true` 로 멈춰 있고 아무 안내도 없다.** 사용자는 저장 실패로 읽고 재시도해 **중복 글을 만든다**. 수정 경로(`:185-193`)도 동일하다.

### 단건 캐시 키 동일성 계약 (K)

**(K-1) 경로 무관 동일 해시** — 동일 로그 1건을 가리키는 `['log', 'detail', <timestamp>]` 키는 생성 경로(라우트 파라미터 / API 응답 객체 / 뮤테이션 variables)와 무관하게 **동일한 값으로 해시**된다. react-query 의 키 해시는 JSON 직렬화 기반이라 `"1656034616036"` 과 `1656034616036` 은 **다른 엔트리**다.

HEAD=`ff699f9` 실측 — 세 지점의 실제 타입이 갈린다:

| 역할 | 경로 | `timestamp` 타입 |
|---|---|---|
| 캐시 **기록** | `LogSingle.jsx:26` `useParams()["timestamp"]` → `:28` `useLog(...)` → `hooks/useLog.js:15` `queryKey: ['log','detail',timestamp]` | **string** (`useParams` 는 URL 세그먼트를 문자열로만 준다) |
| 캐시 **무효화** | `hooks/useUpdateLog.js:34` `invalidateQueries({ queryKey: ['log','detail',variables.timestamp] })` ← `Writer.jsx:182` ← `:77` `setHistoryData(location.state.from)` (API 응답 객체) | **number** |
| 캐시 **제거** | `hooks/useDeleteLog.js:47` `removeQueries({ queryKey: ['log','detail',variables.timestamp] })` ← `LogItem.jsx:49` ← `LogSingle.jsx:91` `timestamp={latestData.timestamp}` | **number** |

무효화·제거 양쪽 모두 기록 시점과 다른 타입의 키를 쓴다. `useLogList` 의 `['log','list']` 계층은 접두 매칭이라 영향이 없다 — **단건 축만 어긋난다.**

**(K-2) 수정 후 무효화 적중** — 로그 수정이 성공하면 그 로그의 단건 캐시 엔트리가 실제로 무효화된다. 무효화 대상 엔트리 수가 0 이 아니다.

**(K-3) 삭제 후 제거 적중** — 로그 삭제가 성공하면 그 로그의 단건 캐시 엔트리가 실제로 제거된다.

**(K-4) 타입 결정의 단일 지점** — 키 원소의 타입이 한 지점에서만 결정된다. 새 호출처가 자기 나름의 타입으로 키를 조립할 수 있는 상태를 남기지 않는다.

**사용자 관측 가능 귀결.** 프로덕션 `QueryClient` 는 `App.jsx:22` `queries: { staleTime: 60_000, retry: 1 }` 다. 따라서 (1) 수정 저장 → `Writer.jsx:191` `navigate("/log/" + historyData.timestamp)` → (2) `LogSingle` 이 `useLog("1656034616036")` **문자열 키**로 조회 → (3) 그 엔트리는 수정 전 내용이고 방금의 `invalidateQueries` 는 **숫자 키**를 겨눴으므로 stale 표시가 붙지 않았다 → (4) `staleTime: 60_000` 이라 재조회가 없다 → **사용자는 방금 저장한 내용 대신 이전 내용을 최대 60초간 본다.** 삭제 경로도 같다 — `removeQueries` 가 아무 것도 제거하지 않아 60초 안에 그 URL 로 다시 들어가면 **이미 삭제된 글이 정상 렌더된다.**

**왜 지금까지 조용했는가 — 이것이 이 축의 핵심이다.** 테스트용 `QueryClient` 는 `src/test-utils/queryWrapper.tsx:19` `queries: { retry: false, staleTime: 0, gcTime: 0 }` 다. `staleTime: 0` + `gcTime: 0` 이면 **모든 마운트가 무조건 재조회**하므로 무효화가 적중했는지 여부가 결과에 전혀 나타나지 않는다. **놓친 무효화와 성공한 무효화가 테스트에서 관측적으로 동일하다.** 따라서 (K-2)(K-3) 의 판정은 반드시 `staleTime > 0` 인 `QueryClient` 에서 이뤄져야 한다 (§수용 기준 NFR 각주).

### 회귀 중점
- `App.test.jsx:329` 근처 online/offline 토글 동안 `Log` 가 마운트·언마운트되며 TanStack Query 캐시가 일관되게 정리되는지.
- `Log.test.jsx` production 모드 (isAdmin=false) 스위트: `+` 버튼 미노출, `/log/write` 라우트 미노출.
- `LogList` 의 sessionStorage 캐시 회피 경로: 캐시 존재 시 `getLogs` 미호출.
- **LogItem DELETE shuffle 안정성** (REQ-20260421-027 FR-01): LogItem DELETE 테스트는 `vitest --sequence.shuffle --sequence.seed={1,2,3}` 에서 race 없이 pass 한다. 테스트 간 상호 의존 (module-level cache, MSW handler 잔존 등) 이 없어야 하며, 어떤 seed 조합에서도 결정적 pass 를 보장.
- **LogSingle render budget 불변식** (REQ-20260421-030 FR-01): `LogSingle` prod render 는 **cold-start** 상태 (모듈/JIT warm-up 미선행, 파일 첫 테스트로 섞인 경우 포함) 에서도 정해진 render budget 안에 mount 및 첫 어설션을 완료한다. budget 상한은 `src/test-utils/timing.js` 의 `ASYNC_ASSERTION_TIMEOUT_MS` 를 polling 상한으로 사용하는 비동기 어설션의 수렴 시간으로 정의하며, 특정 러너 버전·커맨드 플래그·재현 횟수에 귀속되지 않는 **boolean 계약** (budget 초과 여부) 으로만 환원된다. dev render 도 동일 계약을 공유한다.
- **LogSingle render budget 실효 margin 불변식** (REQ-20260421-042 FR-01): `LogSingle` prod/dev render it-scoped timeout 은 vitest 기본 `testTimeout` 과 **양의 margin** (margin > 0) 을 가진다 — 즉 it-scoped 3rd-arg override 값은 vitest 기본 `testTimeout` 과 수학적으로 동등하지 않다. render-budget 상수 값이 vitest 기본 `testTimeout` 값과 동일하면 실효 margin = 0 → "render budget 초과 → 실패" 와 "기본 testTimeout 도달 → 실패" 가 판정 구분 불가 → 본 불변식 위반이다 (boolean 판정 근거 — FR-02). 본 margin 축 불변식은 REQ-20260421-030 의 **render budget 계약 존재** 축과 축 분리된 **실효 margin** 축이며, 전자는 계약 존재 자체를, 후자는 계약이 vitest 기본 경계와 구별되는 양의 간격을 갖는지를 박제한다 (FR-03). 본 불변식은 특정 러너 버전·현재 상수 숫자값·특정 incident/TSK 에 귀속되지 않는 **수학적 boolean 계약** ("override 값 ≠ vitest 기본값") 으로만 환원된다.

- **(R-M1) per-call 로의 회귀.** 훅 옵션 경로가 생긴 뒤에도 새 호출처가 `mutate(vars, { onSuccess })` 를 쓰면 같은 결함이 되돌아온다. 훅 시그니처의 존재((M-3))만으로는 막지 못하며 (M-4) 의 정적 판정이 그 자리를 지킨다.
- **(R-M2) 자연 발생 경합 의존.** (M-1) 의 판정을 자연 발생 순서에 맡기면 로컬은 항상 초록이다 — 순서를 **재현 픽스처로 강제**해야 한다. 삭제 축의 CI 대조군이 pass 18% 였다는 것이 그 증거다.
- **(R-M3) `mutateAsync` 로의 우회.** 수단은 자유지만 (M-1)(M-2) 의 효능은 동일해야 한다. 알림이 `await` 뒤로 옮겨가면 이번에는 unmount 이후 발화 축(`testing/runtime-fetch-unmount-safety`)의 대상이 된다 — 두 계약을 동시에 만족해야 한다.
- **(R-K1) `staleTime` 하향으로의 오회복.** (K-2)(K-3) 을 초록으로 만드는 최단 경로는 프로덕션 `staleTime` 을 낮추는 것이고 그것은 증상 은폐다. 판정을 `staleTime > 0` 픽스처로 고정하는 이유가 여기 있다.
- **(R-K2) 한쪽만 캐스팅.** 무효화 지점만 `String(...)` 으로 맞추면 제거 지점이 남고, 그 반대도 같다. (K-4) 가 단일 결정 지점을 요구하는 이유다.
- **(R-K3) 테스트 기본값이 판정을 삼킨다.** `queryWrapper.tsx` 의 `staleTime: 0` 은 이 축의 **관측 은폐 장치**다. 이 축의 픽스처는 그 기본값을 쓰지 않아야 하며, 기본값 자체의 단일 출처 축은 별 계약이다 (`testing/react-query-test-queryclient-default-options-single-source-coherence`).

### 접근성 (REQ-20260422-045 FR-02)
- `LogItem` / `LogItemInfo` / `LogList` 의 `div`/`span` 기반 클릭 트리거 (예: versions 토글, seeMore, retry 등) 는 키보드 활성화 경로로 공통 헬퍼 `activateOnKey` (패턴 B) 를 경유한다. 헬퍼 본체 및 Enter/Space 키 계약 박제 위치: `components/common.md` §a11y (`a11y.js`) (선행 done: REQ-20260421-033).
- `activateOnKey` 는 `<input>`/`<textarea>` (`Writer` 본문 입력 영역) 에는 사용하지 않는다 (호출부 책임; `components/common.md` §수용 기준 Should).

## 의존성
- 외부: `react`, `react-router-dom`, `prop-types`, `@tanstack/react-query`.
- 내부: `common/common` (`log`, `getFormattedDate`, `hasValue`, `setHtmlTitle`, `isAdmin`), `Toaster/Toaster`, `Comment/Comment` (via `LogSingle`), `Image/ImageSelector` (via `Writer`), `Search/Search` (lazy).
- 역의존: `App.jsx` 가 `/log/*` 라우트로 렌더.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 grep 게이트 계약 문서가 아니며 baseline 실측만 박제).
- **grep-baseline** (inspector 발행 시점, HEAD=29d9da0 실측):
  - (REQ-20260421-027 FR-04(a)) `grep -n "sequence.shuffle.*seed" specs/30.spec/blue/components/log.md` → 1+ hit (본 spec §회귀 중점). 본 spec 자체 박제 확인.
- **rationale**: `LogItem DELETE` race 는 layer2 cold-start 계열 재진단 축 (REQ-20260421-012/017 동선) 에서 드러난 회귀 surface 이며, spec 불변식은 "seed 불문 결정적 pass" 라는 계약만 유지. 실측·재현 플랜은 task 계층 담당.

## 발화 채널

**HEAD=`ff699f9` 에 두 신규 축의 발화 채널이 없다.** `check:*` 15종 · `npm test` · `tsc --noEmit` · `eslint --max-warnings=0` 어느 것도 "per-call 뮤테이션 콜백이 구독 창 밖에서 버려질 수 있는가" 나 "queryKey 원소의 타입이 생성 경로마다 갈리는가" 를 묻지 않는다. `src/Log/hooks/*.js` 는 `.js` 이고 `tsconfig.json:12` 가 `"checkJs": false` 라 타입 검사 대상 자체가 아니며, `invalidateQueries` 는 매칭 0건에도 예외를 던지지 않고 resolve 한다 — **실패 신호가 존재하지 않는다.**

| 게이트 | HEAD=`ff699f9` 채널 | 상태 |
|---|---|---|
| M-1 / M-2 (구독 시점 비종속) | 없음 | **부착 필요** |
| M-3 (시그니처 가용성) | 없음 (정적 grep 은 §수용 기준) | **부착 필요** |
| M-4 (per-call 부재) | 없음 (정적 판정은 §수용 기준) | **부착 필요** |
| K-1 (해시 동일성) | 없음 | **부착 필요** |
| K-2 / K-3 (무효화·제거 적중) | 없음 — 현행 `queryWrapper.tsx:19` 의 `staleTime: 0` 은 **관측 은폐 장치**라 채널이 아니다 | **부착 필요** |
| K-4 (단일 결정 지점) | 없음 | 계약 서술로만 |

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다.

> **관측 표면 주의** (`RULE-06 §관측 표면`) — (M-1) 의 판정은 "훅이 콜백 인자를 받는가" 가 아니라 **구독이 늦게 성립한 순서에서 알림이 실제로 1회 발화하는가** 다. 시그니처만 재면 호출처가 여전히 per-call 을 쓰는 상태를 통과시킨다. 마찬가지로 (K-2) 의 판정은 "무효화를 호출했는가" 가 아니라 **그 호출이 실제 엔트리를 건드렸는가** 다 — 매칭 0건도 resolve 하기 때문이다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** 아래는 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니며, 검출 방향을 보존한 채 **채널 부착 task 의 `## 검증/DoD`** 로 이관한다 — developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다. **이관처 task 가 발행되기 전까지 귀속처는 이 절의 명시적 지시다** (이관처 없는 강등 금지).

- (Dir-M1) 알림 전달을 per-call 경로로 되돌린다 → 구독 지연 픽스처에서 `rc≠0`. 원복 → `rc=0`.
- (Dir-M2) 구독 지연을 제거한(즉시 커밋되는) 픽스처로 바꾼다 → (Dir-M1) 의 주입이 **통과**함을 대조 박제. 픽스처가 실제로 지연을 강제하고 있음의 증명이며, 이것이 없으면 (Dir-M1) 은 다른 이유로 붉었을 수 있다.
- (Dir-K1) 무효화 키를 숫자로 되돌린다 → `staleTime > 0` 픽스처에서 `rc≠0`. 원복 → `rc=0`.
- (Dir-K2) 같은 주입을 `staleTime: 0` 픽스처에서 수행한다 → **여전히 `rc=0`** 임을 대조 박제. 테스트 기본값이 이 축을 삼킨다는 사실 자체를 게이트가 기록하게 한다.

## 테스트 현황
- [x] `src/Log/Log.test.jsx`, `LogList` / `LogSingle` / `LogItem` / `LogItemInfo` / `Writer` 각 `.test.jsx`.
- [x] 훅 테스트: `hooks/useLog.test.js`, `useLogList.test.js`, `useCreateLog.test.js`, `useUpdateLog.test.js`, `useDeleteLog.test.js`.
- [x] `__fixtures__/` 에 API 응답 샘플 박제.
- [x] LogItem DELETE shuffle 안정성 — seed={1,2,3} 불문 결정적 pass (TSK-20260421-63 / `261a51a`; `src/Log/LogItem.test.jsx` `beforeAll` warm-up 박제, seed=1/2/3 + 임의 seed 전부 11/11 pass, 전체 383 tests PASS 회귀 0).
- [x] LogSingle render budget 불변식 — cold-start 에서 render/assert 가 budget 상한 이내 수렴 (TSK-20260421-65 / `585d381` 실현; `src/Log/LogSingle.test.jsx:125, :155` prod/dev `it` 종결에 `}, ASYNC_ASSERTION_TIMEOUT_MS);` 박제, 9/9 it pass / 47 files 383 tests pass / lint 0 / build 0).
- [ ] (M-1/M-2) 구독 성립을 응답 도착 **이후**로 강제하는 재현 픽스처 — HEAD 0건. 채널 부착 대상.
- [ ] (M-3) `useCreateLog` · `useUpdateLog` 의 콜백 수용 시그니처 — HEAD **0 hit** (`useDeleteLog` 만 `(callbacks = {}) =>` 보유).
- [ ] (M-4) per-call 콜백 전달 0 — HEAD **2건** (`Writer.jsx:137`·`:181`).
- [ ] (K-2/K-3) `staleTime > 0` 으로 구성한 `QueryClient` 픽스처 — HEAD 0건. 현행 `queryWrapper.tsx:19` 는 `staleTime: 0` 이라 이 축의 판정에 쓸 수 없다.
- [x] (Must, REQ-20260421-042 FR-01) LogSingle render budget 실효 margin — render-budget 상수 값 이 vitest 기본 `testTimeout` 값과 양의 margin (margin > 0) 을 가진다. **HEAD=c563025 수렴**: `vite.config.js:75` `testTimeout: 10000` 명시 → `src/Log/LogSingle.test.jsx:129, :159` it-scoped 3rd-arg `ASYNC_ASSERTION_TIMEOUT_MS = 5000` → margin = 10000 − 5000 = **5000 ms > 0** (boolean 계약 충족, FR-02). 수단 α 채택 (TSK-20260421-88 / `c563025`; 1 파일 편집, LogSingle 9/9 it pass / 48 files 436 tests pass / coverage threshold 4축 PASS / lint 0 / build 0).

## 수용 기준 (현재 상태)
- [x] (Must) `/log/` 접근 시 `LogList` 렌더. 세션 캐시가 있으면 네트워크 호출 0.
- [x] (Must) 에러 분기에서 Retry 버튼 클릭 시 `sessionStorage.logList` · `logListLastTimestamp` 삭제 후 리페치.
- [x] (Must) `lastTimestamp` 존재 시 `See more` 버튼 노출. 비어 있으면 null.
- [x] (Must) `isAdmin()=true` 에서만 `+` 버튼과 `/log/write` 라우트 노출.
- [x] (Must) `/log/:timestamp` 진입 시 `LogSingle` + `Comment` 렌더.
- [x] (Should) 로딩 중 중앙 `Toaster` 메시지 "Loading logs..." 노출.
- [x] (Should) `props.isPostSuccess` true 변화 시 `LogList` 재페치 트리거.
- [x] (NFR) 모든 하위 라우트는 `React.lazy` + `Suspense(fallback=<div/>)` 로 코드 스플릿.
- [x] (Must, REQ-20260421-027 FR-01) LogItem DELETE 테스트는 `vitest --sequence.shuffle --sequence.seed={1,2,3}` 에서 race 없이 pass 한다.
- [x] (Must, REQ-20260421-030 FR-01) `LogSingle` prod/dev render 는 cold-start 에서도 render budget 상한 (`src/test-utils/timing.js` `ASYNC_ASSERTION_TIMEOUT_MS` 를 polling 상한으로 하는 어설션의 수렴 시간) 이내 mount 및 첫 어설션을 완료한다. (TSK-20260421-65 / `585d381` — prod/dev `it` 3rd-arg timeout 박제로 계약 강제.)
- [x] (Must, REQ-20260421-042 FR-01) `LogSingle` prod/dev render it-scoped timeout 은 vitest 기본 `testTimeout` 과 양의 margin (margin > 0) 을 가진다. render-budget 상수 값 = vitest 기본 `testTimeout` 값 구성은 본 불변식 위반이다 (FR-02 boolean 판정). (TSK-20260421-88 / `c563025` — 수단 α 채택: `vite.config.js:75 testTimeout: 10000` 명시, it-scoped 3rd-arg `ASYNC_ASSERTION_TIMEOUT_MS = 5000` 유지, margin = 5000 ms > 0. 수단 중립성 FR-06 유지 — α/β/γ 중 어느 하나도 "기본값" / "권장" 표시 배제.)

### 뮤테이션 완료 알림 (M)

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 측정 명령은 `src/**` 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2). **HEAD=`ff699f9` 기준 0/4** — 신규 등록이며 전 항목 미충족이 정상이다.

- [ ] (Must, M-4) per-call 콜백 전달 0 — `src/**` 프로덕션 코드에 2인자 이상으로 호출되는 `.mutate(` 가 없다. 판정:
  ```
  node -e "const fs=require('fs'),p=require('path');let n=0;const walk=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{const f=p.join(d,e.name);if(e.isDirectory())walk(f);else if(/\.(js|jsx|ts|tsx)\$/.test(f)&&!/\.test\./.test(f)){const s=fs.readFileSync(f,'utf8');const re=/\.mutate\(/g;let m;while((m=re.exec(s))){let i=m.index+m[0].length,d2=1,arg=1;while(i<s.length&&d2>0){const c=s[i];if(c==='('||c==='['||c==='{')d2++;else if(c===')'||c===']'||c==='}')d2--;else if(c===','&&d2===1)arg++;i++}if(arg>1){n++;console.error(f+':'+s.slice(0,m.index).split('\n').length)}}}});walk('src');process.exit(n===0?0:1)"
  ```
  → **rc=0**. **HEAD=`ff699f9` 실측 rc=1 / 2건 (`src/Log/Writer.jsx:137`·`:181`) → 미충족.** **행 단위 grep 을 쓰지 않는 이유**: 실물의 2번째 인자는 `mutate(` 다음 줄부터 시작하는 멀티라인 객체 리터럴이라 어떤 단일 행 패턴에도 걸리지 않는다. 위 판정은 괄호 깊이를 세어 **최상위 쉼표 개수**로 인자 수를 구하므로 표기(줄바꿈·들여쓰기·인자 순서)에 무관하다. 특이도 확인 — 1인자 호출 `LogItem.jsx:49` `deleteMutation.mutate({ author, timestamp })` 는 매치되지 않는다 (실측).
- [ ] (Must, M-3) 시그니처 가용성 — `bash -c 'grep -qE "export const useCreateLog = \([A-Za-z_{]" src/Log/hooks/useCreateLog.js && grep -qE "export const useUpdateLog = \([A-Za-z_{]" src/Log/hooks/useUpdateLog.js'` → **rc=0**. **HEAD=`ff699f9` 실측 rc=1 → 미충족** (양쪽 다 `= () =>`). 대조군 — `useDeleteLog.js:34` `export const useDeleteLog = (callbacks = {}) => {` 는 같은 패턴에 매치한다 (`ff699f9` 착지분). 빈 괄호를 배제하는 문자 클래스를 쓰는 이유는 `= () =>` 가 넓은 패턴 `\(.*\) =>` 에 걸려 **현 HEAD 에서 이미 통과**하기 때문이다.
- [ ] (Must, M-1) 구독 지연 순서에서의 성공 알림 1회 — 구독 성립을 응답 도착 **이후**로 강제한 렌더 픽스처가 테스트 파일로 실재하고, 생성·수정 뮤테이션이 200 으로 성공할 때 호출처 성공 알림이 각각 1회 관측된다. 판정: 그 픽스처 파일에 대해 `npx vitest run <파일>` → rc=0 **이면서** 파일이 실재. **HEAD=`ff699f9` 실측 — 픽스처 0건 → 미충족.** 파일 경로는 채널 부착 task 가 확정하며 확정 시 이 항목에 박제한다. 자연 발생 경합에 의존하는 판정은 이 항목을 충족하지 않는다 ((R-M2)).
- [ ] (Must, M-2) 같은 픽스처의 실패 경로 — 뮤테이션이 비-200 으로 실패할 때 호출처 실패 알림이 1회 관측된다. 판정은 (M-1) 과 동일 명령. **HEAD=`ff699f9` 미충족.** 성공 경로만 픽스처화하면 실패 알림이 유실되는 상태가 그대로 남는다 — 사용자에게는 "저장 실패를 알리지 않음" 이 "성공을 알리지 않음" 과 같은 무게다.

### 단건 캐시 키 동일성 (K)

> **HEAD=`ff699f9` 기준 1/4.** (K-1) 의 전제는 현 HEAD 에서 이미 판정 가능하며, 나머지 셋은 채널 부재로 미충족이다.
>
> **(K-2)(K-3) 의 판정은 반드시 `staleTime > 0` 인 `QueryClient` 에서 이뤄진다.** `staleTime: 0` 픽스처에서는 적중과 미적중이 **관측적으로 동일**하다 (§동작 (K)). 현행 `src/test-utils/queryWrapper.tsx:19` 가 정확히 그 상태이므로 이 축의 픽스처는 그것을 재사용할 수 없다.

- [x] (Must, K-1 전제) 두 표기가 서로 다른 캐시 엔트리다 — `bash -c 'test "$(node -e "console.log(JSON.stringify([1656034616036])===JSON.stringify(['\''1656034616036'\'']))")" = "false"'` → **rc=0**. **HEAD=`ff699f9` 실측 `false` → 충족.** 이 항목은 라이브러리 해시 규약(JSON 직렬화 기반)이 본 계약의 전제로 실재함을 고정한다 — 전제가 무너지면(해시가 타입 무관해지면) 나머지 세 항목의 근거가 사라지므로 함께 재판정해야 한다.
- [ ] (Must, K-2) 수정 후 무효화 적중 — `staleTime > 0` `QueryClient` 와 문자열 키로 채워진 `['log','detail','<ts>']` 엔트리를 가진 픽스처에서, 수정 뮤테이션 성공 후 그 엔트리의 `isInvalidated` 가 참이다. 판정: 그 픽스처 파일에 대해 `npx vitest run <파일>` → rc=0 **이면서** 파일이 실재. **HEAD=`ff699f9` 실측 — 픽스처 0건 → 미충족.** "무효화를 호출했는가" 가 아니라 **엔트리 상태**로 재는 이유는 `invalidateQueries` 가 매칭 0건에도 resolve 하기 때문이다.
- [ ] (Must, K-3) 삭제 후 제거 적중 — 같은 픽스처에서 삭제 뮤테이션 성공 후 `queryClient.getQueryData(['log','detail','<ts>'])` 가 `undefined` 다. 판정은 (K-2) 와 동일 명령. **HEAD=`ff699f9` 미충족.**
- [ ] (Should, K-4) 타입 결정의 단일 지점 — `['log','detail', …]` 키를 조립하는 `src/**` 프로덕션 지점이 전부 동일한 정규화 경로를 경유한다. 판정: `bash -c 'test "$(grep -rnE "\[.log., *.detail." src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -vE "^[^:]+:[0-9]+:[[:space:]]*\*" | wc -l)" -le 1'` → **rc=0**. **HEAD=`ff699f9` 실측 rc=1 / 3 지점 (`useLog.js:15` · `useUpdateLog.js:34` · `useDeleteLog.js:47`) → 미충족.** 주석 행 3건(`useLog.js:5` · `useDeleteLog.js:9` · `useUpdateLog.js:7`)은 `^<파일>:<행>:<공백>*` 제외 규칙으로 걸러진다 — tick 222 실측 필터 전 **6 line** / 후 **3 line**. 걸러내지 않으면 문서 주석이 위반으로 계수돼 판정이 흔들린다 (초안의 `^[^:]*: *\*` 는 `grep -n` 의 `<파일>:<행>:` 접두를 계산에 넣지 않아 **한 건도 걸러내지 못했다** — tick 222 가 명령을 실제로 실행해 발견하고 교정했다). 상한을 `1` 로 두는 것은 **단일 정규화 지점 그 자체**를 허용하기 위함이다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-014 · REQ-20260825-015 (inspector tick 222) | **두 축 최초 등록 — blue `components/log.md` → green carry-over 후 §동작에 `## 뮤테이션 완료 알림 계약 (M)` · `## 단건 캐시 키 동일성 계약 (K)` 신설.** `components/` = `src/` 구현 단위 1:1 원칙에 따라 별 파일을 만들지 않았다 (두 축 모두 `src/Log/**` 귀속). **req 수용 기준을 그대로 쓰지 않았다**: (a) REQ-014 의 `grep -rnE "\.mutate\("` 는 **행 단위라 멀티라인 2번째 인자를 볼 수 없다** — 실물 두 건이 정확히 그 형태다. 괄호 깊이 기반 인자 수 판정으로 교체해 실측 2건(오탐 0, 1인자 호출 미매치)을 얻었다. (b) REQ-014 의 시그니처 grep `\(.+\) =>` 는 **현 HEAD 의 `= () =>` 를 잡지 못하는 것이 아니라 반대로 통과시킨다** — `.+` 가 공백을 먹지 않으니 0 hit 이 맞으나, 착지 후 판정에서 인자 이름이 없는 형태를 구별하지 못한다. `\([A-Za-z_{]` 로 교체했다. (c) REQ-015 의 `node -e "…JSON.stringify(…)"` 자명 명제는 **전제 박제 항목**으로 살렸다 — 라이브러리 해시 규약이 전제이며 무너지면 나머지 세 항목의 근거가 사라진다는 사실을 문장에 명시했다. (d) REQ-015 의 (K-4) 열거 항목은 "전 지점이 동일 경로를 경유한다" 가 사람 판단이라 **지점 수 상한**으로 환원했고, 주석 행 오탐 2건을 제외 규칙으로 걸렀다. **신규 추가 (req 에 없던 항목)**: (R-M3) `mutateAsync` 우회 시 unmount 발화 축과의 동시 충족, (R-K3) 테스트 기본값의 관측 은폐를 회귀 중점으로 승격, (Dir-M2)(Dir-K2) **대조 주입 방향** — 픽스처가 실제로 지연/`staleTime` 을 강제하고 있음을 증명하지 않으면 (Dir-M1)(Dir-K1) 이 다른 이유로 붉었을 가능성을 배제할 수 없다. | §관련 요구사항, §역할, §동작 (M·K 신설), §회귀 중점, §발화 채널 (신설), §테스트 현황, §수용 기준, §참고, 본 이력 |
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec, blue) | all |
| 2026-04-21 | inspector / 29d9da0 | REQ-20260421-027 FR-01 흡수 — blue `components/log.md` → green carry-over. § 회귀 중점에 "LogItem DELETE 테스트는 `vitest --sequence.shuffle --sequence.seed={1,2,3}` 에서 race 없이 pass" 불변식 1줄 추가. consumed followup: `specs/10.followups/20260421-0541-test-isolation-shuffle-safety-cold-start-spec-from-blocked.md`. 선행 done req: `20260421-test-isolation-shuffle-safety-cold-start-spec-reseed-from-followup.md` (REQ-017), `20260421-layer2-cold-start-race-root-cause-rediagnosis.md` (REQ-012), `20260420-react-19-findby-timing-stabilization.md`. | §회귀 중점, §스코프 규칙, §테스트 현황, §수용 기준 |
| 2026-04-21 | inspector / 261a51a | Phase 1 reconcile — LogItem DELETE shuffle 안정성 marker [x] 플립 (TSK-20260421-63 / `261a51a` `beforeAll` warm-up, seed=1/2/3 + 임의 seed 전부 pass, 전체 383 tests PASS 회귀 0 박제). | §테스트 현황 |
| 2026-04-21 | inspector / REQ-20260421-030 | FR-01~04 흡수 — §회귀 중점에 "LogSingle render budget 불변식" 1~2줄 추가 (cold-start 에서도 render/assert 가 budget 이내 수렴하는 boolean 계약). §테스트 현황·§수용 기준에 대응 미완료 [ ] 1행 추가. budget 수치 박제 방식은 **FR-04 택일: `src/test-utils/timing.js` 상수 참조** — 근거: 리터럴 ms 박제는 spec 이 러너 default timeout 경계 값에 귀속되어 시점 중립성 약화. 상수 참조는 단일 진입점 유지 + 러너·버전 중립. consumed followup: `specs/60.done/2026/04/21/followups/20260421-0554-logsingle-vitest4-rescope-and-spec-relayering-from-blocked.md`. | §회귀 중점, §테스트 현황, §수용 기준, §참고 |
| 2026-04-21 | inspector / 585d381 | Phase 1 reconcile — LogSingle render budget marker [x] 플립 (TSK-20260421-65 / `585d381` `src/Log/LogSingle.test.jsx:125, :155` prod/dev `it` 종결에 `}, ASYNC_ASSERTION_TIMEOUT_MS);` 박제로 budget 상한을 테스트 계층 per-test timeout 으로 강제). DoD 게이트 재실행: `it('render LogSingle on (prod\|dev) server'` 2 hits 유지, `}, ASYNC_ASSERTION_TIMEOUT_MS);` 2 hits, `timeout:\s*[0-9]+` 0 hits (리터럴 ms 박제 0 — 시점 중립성 유지). 9/9 it pass / 47 files 383 tests pass / lint 0 / build 0. | §테스트 현황, §수용 기준 |
| 2026-04-21 | inspector / a2b9119 (REQ-20260421-042) | **REQ-042 흡수** — blue `components/log.md` → green 재 carry-over 후 §회귀 중점에 "LogSingle render budget 실효 margin 불변식" 1~2줄 추가 (render-budget 상수값 과 vitest 기본 `testTimeout` 간 양의 margin 계약, boolean 판정 근거 박제). §테스트 현황·§수용 기준에 대응 미완료 [ ] 각 1행 추가 (현 HEAD 위반 상태 표식). 판단 근거 (FR-03 축 분리): REQ-030 은 "render budget 계약 존재" 축 (budget 상한 정의·cold-start 에서 이내 수렴), 본 REQ-042 는 "render budget 실효 margin" 축 (override 값이 vitest 기본 testTimeout 과 수학적으로 구별되는지) — 전자는 계약 존재 자체, 후자는 계약의 실효성 전제 조건. 두 축은 독립적으로 검증 가능 (REQ-030 만 성립해도 REQ-042 는 위반 가능 — 현 HEAD 상태). consumed followup: `specs/10.followups/20260421-1312-logsingle-flaky-timeout-repro.md` (TSK-84 3차 독립 관측), `specs/10.followups/20260421-2140-logsingle-flaky-timeout.md` (TSK-82 1차 관측) — 이미 discovery 세션에서 `60.done/followups/` 로 이동됨 (REQ 원문 §참고 기준). **FR-06 수단 중립성 유지** — 상수값 상향 / 별도 render-budget 상수 도입 / warmup pre-dispatch 중 어느 하나도 "기본값" / "권장" 표시 0 (§수용 기준 FR-01 행 "수단 중립" 평서문). **RULE-07 자기검증**: 본 증분은 "render-budget override 값 ≠ vitest 기본 testTimeout 값" 이라는 수학적 boolean 계약. 구체 ms 수치 (5000, 10000 등) / Vitest 메이저 버전 / TSK ID / incident 이름 / `npm test` 실측 수치 0회 박제. 시점 중립·반복 검증 가능. NFR-02 준수 — `components/log.md` 1 파일만 수정. | §최종 업데이트, §회귀 중점, §테스트 현황, §수용 기준, §참고, 본 이력 |
| 2026-04-21 | inspector / c563025 (TSK-20260421-88) | **Phase 1 reconcile 1/1 ack** — REQ-20260421-042 FR-01 수렴 marker 플립 (§테스트 현황 1행 [ ]→[x], §수용 기준 FR-042 1행 [ ]→[x]). c563025 ancestor-of HEAD 확인. DoD 게이트 4종 재실행 @HEAD=c563025: (a) `grep -nE "export const ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → 1 hit @`:5` (불변) / (b) `grep -nE "testTimeout\s*:" vite.config.js` → 1 hit @`:75` `testTimeout: 10000` (수단 α 채택 기대값) / (c) `grep -nE "\}\s*,\s*ASYNC_ASSERTION_TIMEOUT_MS\s*\)" src/Log/LogSingle.test.jsx` → 2 hits @`:129, :159` (수단 α 기대값 — 상수 유지) / (d) boolean 판정 — 10000 ≠ 5000, margin = 5000 ms > 0. hook-ack (TSK-88 result.md §테스트 결과): `npm run lint` PASS / `npm test` 48 files 436 tests PASS (LogSingle.test.jsx 9/9 it pass) / coverage threshold 4축 PASS (Statements 97.72 / Branches 94.21 / Functions 94.45 / Lines 98.11) / `npm run build` PASS 352ms — Must 주관 혼재 없음 → ack 채택. 스코프 준수: TSK-88 result.md 명시 편집 범위 `vite.config.js` 1 파일 (`git show --stat c563025` 1 file changed 확인). FR-06 수단 중립성 유지 — spec 본문에 "α 채택"은 변경 이력 증거로만 박제하고 §불변식 / §수용 기준 본문은 수단 열거 평서문 유지. RULE-07 자기검증: 본 증분은 수렴 marker 플립 + 현장 근거 수치 박제 (§테스트 현황 margin 수치·수단명은 감사 교차참조 — baseline·이력 수치 재서술 허용 범주). NFR-02 준수 — `components/log.md` 1 파일만 수정 + ledger 갱신. | §최종 업데이트, §테스트 현황, §수용 기준, 본 이력 |
| 2026-04-21 | inspector / REQ-20260422-045 | **REQ-045 FR-02 흡수** — blue `components/log.md` → green carry-over 후 §동작 하위 §접근성 소절 신설 (2줄). `activateOnKey` / 패턴 B 식별자 + `components/common.md` §a11y 상호참조 박제. 기존 §공개 인터페이스·§동작·§회귀 중점·§의존성·§수용 기준·§변경 이력 서술 수정 0 (NFR-02 준수). 선행 done: REQ-20260421-033 FR-07 "blue 승격 시 comment/log/common/image.md §접근성 상호참조" Should 항 — writer 매트릭스상 blue 직접 편집 불가로 영구 미충족 상태였던 것을 본 green 경유 경로로 해소. RULE-07 자기검증: 상호참조 문장 존재는 `grep -c` 로 반복 검증 가능한 시스템 관찰 불변식, 1회성 incident patch 아님. | §최종 업데이트, §관련 요구사항, §동작 (§접근성 신설), 본 이력 |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/04/21/req/20260421-log-spec-regression-logitem-delete-shuffle-and-findby-idiom.md` (REQ-027).
  - `specs/60.done/2026/04/21/req/20260421-log-cold-start-render-budget-invariant.md` (REQ-030).
  - `specs/60.done/2026/04/21/req/20260421-logsingle-prod-render-budget-margin-effectiveness.md` (REQ-042; 본 세션 inspector mv 대상).
- **Consumed followup**:
  - `specs/10.followups/20260421-0541-test-isolation-shuffle-safety-cold-start-spec-from-blocked.md` (REQ-027 선행; 이미 `60.done/followups/` 이동).
  - `specs/60.done/2026/04/21/followups/20260421-0554-logsingle-vitest4-rescope-and-spec-relayering-from-blocked.md` (REQ-030 선행 축 A/B 분리).
  - `specs/60.done/2026/04/21/followups/20260421-2140-logsingle-flaky-timeout.md` (REQ-042 선행 — TSK-82 1차 관측; discovery 세션에서 이미 이동됨).
  - `specs/60.done/2026/04/21/followups/20260421-1312-logsingle-flaky-timeout-repro.md` (REQ-042 선행 — TSK-84 3차 독립 관측; discovery 세션에서 이미 이동됨).
- **선행 done req (render budget 진단 계보)**:
  - `specs/60.done/2026/04/21/req/20260421-logsingle-prod-server-serial-timeout-diagnosis.md` (REQ-014 원인 진단 — cold module/JIT warm-up × 기본 async assertion timeout 경계).
  - `specs/60.done/2026/04/21/req/20260421-logsingle-prod-server-serial-timeout-remediation.md` (REQ-016 1차 remediation plan).
- **관련 spec**: `specs/30.spec/blue/common/test-idioms.md` (findBy 이디엄 축 — `ASYNC_ASSERTION_TIMEOUT_MS` polling 정합).
- **관련 상수**: `src/test-utils/timing.js` `ASYNC_ASSERTION_TIMEOUT_MS` — 본 spec 의 render budget 상한 참조 지점. 수치 자체는 spec 본문에 박제하지 않음 (시점 중립성 보존).
- **축 B 위임 노트 (REQ-20260421-030 §참고 위임)**: Vitest 러너 호환 시그니처 택일 (options-as-2nd 객체 vs 3rd-arg number 등 버전별 deprecated/removed 대응) · 적용 범위 (it 단위 budget override) · supersedes 관계 등 1회성 마이그레이션 계약은 본 spec 본문에 포함하지 않는다. 해당 계약은 planner 가 후속 task 문서 (`40.task/**`) 에 박제한다. 본 spec 은 "render budget 계약" 만 유지 (RULE-07 양성 기준).
- **RULE 준수**:
  - RULE-07: 불변식 한정 — "race 없이 pass" / "budget 이내 수렴" 은 boolean 계약. 실측 seed·ms 수치·Vitest 버전·TSK ID 는 task 영역으로 위임.
  - RULE-01: inspector writer 영역만 (`30.spec/green/**`).
  - RULE-06: grep-baseline 수치 박제 (REQ-027 FR-04(a) 경로 유지).
