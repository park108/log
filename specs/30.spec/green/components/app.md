# App 컴포넌트 (루트 셸 / 라우팅 / 온라인 감지 / 부트 비콘)

> **위치**: `src/App.tsx`, `src/index.tsx`, `src/App.test.tsx`, `src/App.offline-state.test.tsx`, `src/index.test.tsx`
> **관련 요구사항**: REQ-20260517-094 (루트 엔트리 부트 비콘 `sendToAnalytics` / `sendCounter` 불변식 흡수 — blue→green 복사 + 본 효능 박제).
> **최종 업데이트**: 2026-05-17 (by inspector — REQ-094 hook-ack 8 marker 플립 (B1~B4 테스트 현황 + FR-01~FR-04 수용 기준) HEAD=`776846e` (TSK-28 회수)).

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 박제 시점 스냅샷 (HEAD=`e19d870`).

## 역할
애플리케이션 루트 셸. `QueryClientProvider` 로 TanStack Query 컨텍스트를 감싸고, `BrowserRouter` + `Routes` 로 `/log`, `/file`, `/monitor`, `*` 경로를 분기한다. `window` online/offline 이벤트를 구독해 오프라인 시 대체 UI 를 그리고, `resize` 이벤트로 `main` 최소 높이를 계산해 하위 페이지로 전달한다. 마운트 시 1회 `common.auth()` 를 실행해 URL fragment/query 의 `access_token` · `id_token` 을 쿠키로 흡수한다. 엔트리 모듈 `src/index.jsx` 부트 시점에 `sendToAnalytics(metric)` (reportWebVitals 콜백) 과 `sendCounter()` (모듈 즉시 호출) 2종 부트 비콘은 (REQ-094) `navigator.sendBeacon` 가드 + URL 조립 + body 직렬화 4 불변식 박제 (가드 falsy 시 silent no-op, throw 금지).

## 공개 인터페이스
- 컴포넌트: `App` (default export, props 없음).
- 엔트리 부트: `src/index.jsx` — `ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)`.
- 부트 비콘 (REQ-094, `src/index.jsx`):
  - `sendToAnalytics(metric)` — `reportWebVitals` 콜백. `navigator.sendBeacon(commonMonitor.getAPI(), JSON.stringify(metric))`.
  - `sendCounter()` — 모듈 즉시 호출. `navigator.sendBeacon(commonMonitor.getAPI() + "/useragent", JSON.stringify(userAgentParser()))`.
  - 두 함수 공히 `navigator.sendBeacon` truthy 가드 — falsy 시 silent no-op.
- 상태 설정자:
  - `setContentHeight(undefined)` — 높이는 CSS 가 정한다 (`#root` flex 컬럼 + `.main--main-contents` `flex:1`). 리스너는 재계산 훅으로 남는다. 하위 `<main>` 의 `style` 로 전달.
  - `setIsOnline(navigator.onLine)` — `online` / `offline` 이벤트 리스너가 토글.
- 라우팅 매트릭스 (`src/App.jsx`):
  - `/` → `Navigate replace to="/log"`.
  - `/log/*` → `<Log contentHeight={...} />` (ErrorBoundary 래핑).
  - `/file` → `<File contentHeight={...} />` (ErrorBoundary 래핑).
  - `/monitor` → `<Monitor contentHeight={...} />` (ErrorBoundary 래핑).
  - `*` → `PageNotFound` (`<main>` 내).

## 동작
1. 마운트 시 `resize` 리스너 등록 → 핸들러를 즉시 1회 호출해 초기 `contentHeight` 계산. 언마운트 시 제거.
2. 마운트 시 `common.auth()` 1회 실행.
3. 마운트 시 `online` / `offline` 리스너 등록 → `navigator.onLine` 변화에 `isOnline` 동기화.
4. `isOnline=false` 분기: 고정 오프라인 안내 셸 (`<nav>` + `<main>` 2종 메시지) 을 그린다. **찬 시작**(처음부터 오프라인)이면 `BrowserRouter` 를 마운트하지 않는다. 한 번이라도 온라인이었으면 앱 트리를 **교체하지 않고** `hidden` 으로 감춘 채 마운트를 유지한다 — 네트워크가 깜빡여도 작성 중 원고 같은 하위 상태가 남는다.
5. `isOnline=true` 분기: `BrowserRouter` + `Suspense(fallback=<Skeleton variant="page" />)` + `Navigation` + `Routes` + `Footer`.
6. `isDev()` (`import.meta.env.DEV` 단일 경유) 이면 `ReactQueryDevtools` 를 `initialIsOpen={false}` 로 렌더링.
7. 라우트별 페이지는 lazy 로드 (`Navigation`, `Log`, `File`, `Monitor`, `PageNotFound`, `Footer`).
8. **(REQ-094) 엔트리 모듈 부트 비콘 불변식** (`src/index.jsx`):
   - **(B1) sendToAnalytics URL/body 계약**: `sendToAnalytics(metric)` 은 `commonMonitor.getAPI()` 반환값을 URL 로 사용하고 `JSON.stringify(metric)` 을 body 로 사용하여 `navigator.sendBeacon` 을 호출한다. URL 가공/접미사 부재.
   - **(B2) sendCounter URL/body 계약**: `sendCounter()` 는 `commonMonitor.getAPI() + "/useragent"` 를 URL 로 사용하고 `JSON.stringify(userAgentParser())` 를 body 로 사용한다.
   - **(B3) sendBeacon 가드 불변식**: 두 함수 모두 `navigator.sendBeacon` truthy 분기에서만 호출 진입. falsy/미정의 시 throw 없이 silent no-op 으로 함수 본문 종료.
   - **(B4) 모듈 로드 1회 발화 카운트**: 모듈 1회 로드 당 `sendCounter()` 정확히 1회 호출 (모듈 즉시 실행). `sendToAnalytics` 는 `reportWebVitals` 콜백으로 등록되며 web-vitals 콜백 발화 시점에만 호출 — 부트 직후 동기 호출 0.

### 회귀 중점
- StrictMode 하 effect double-invoke 하에서 `online` / `offline` 리스너 add/remove 가 누수 없이 짝이 맞는지 (`App.test.jsx` online/offline 스위트).
- `QueryClient` 기본값: `{ staleTime: 60_000, retry: 1 }` 의존하는 하위 페이지 캐시 동작.
- **(REQ-094) 부트 비콘 회귀 채널**: `src/index.jsx` 가 import 한 `commonMonitor.getAPI()` 시그니처 변경, `userAgentParser()` 반환 형태 변경, `navigator.sendBeacon` 가드 회피/누락/폴백 도입 시 회귀 — 모두 부트 단계라 `ErrorBoundary` 하류 도달 불가. 본 spec §스코프 규칙 G1~G3 grep 게이트 + 회복 task 의 vitest spy fixture 가 유일한 회귀 채널.

## 의존성
- 외부: `react ^19.2.x`, `react-dom ^19.2.x`, `react-router-dom ^7.14.1`, `@tanstack/react-query`, `@tanstack/react-query-devtools`, `prop-types` (하위 컴포넌트만 사용), `web-vitals` (reportWebVitals 채널).
- 내부: `common/common` (`auth`, `getUrl`, `userAgentParser`), `common/ErrorBoundary`, `common/ErrorFallback`, `common/Skeleton`, `common/errorReporter` (`reportError`), `common/Navigation`, `common/Footer`, `common/PageNotFound`, `Log/Log`, `File/File`, `Monitor/Monitor`, `Monitor/api` (`getAPI` — 부트 비콘 URL 조립), `reportWebVitals`, `styles/index.css`.
- 역의존: 없음 (루트).
- 직교: `30.spec/green/testing/runtime-fetch-unmount-safety.md` (REQ-093 — 도메인 fetch unmount-safety, `src/index.jsx` 부트 비콘은 unmount 개념 부재 — 별 axis 직교 평서), `30.spec/green/testing/console-error-runtime-zero.md` (REQ-091 — runtime console.error fail-fast, 부트 비콘 falsy 가드 미달성 시 throw 발화 시 본 channel detect — 보완 직교).

### carve-precondition
- (P1) **환경 채널 가용성**: 본 spec 효능 회복 task carve 시점에 `node_modules/` 가용성 + `npm run typecheck` exit=0 + `npm run lint` exit=0 + `npm run build` exit=0 + `npm test` 회귀 0 4+ 환경 게이트 충족 필요. 본 spec 박제 시점 환경 게이트 N/A (효능 평서 박제만 — 산출물 변경 require 0).
- (P2) **선행 spec done 상태**: 본 spec 효능 회복 task carve 시점에 선행 spec (REQ-091 `console-error-runtime-zero.md` green carve-active — 부트 시 throw 시 channel detect 보완 직교) + (`reportWebVitals.test.js` 커버 채널 — web-vitals 콜백 등록 검증 자체는 기존 박제) 정합. 박제 시점 두 채널 모두 가용 (HEAD=`e19d870`).
- (P3) **RULE-02 chain 비활성**: 본 spec 은 blue→green 복사 + 흡수 — 기존 green spec carve fail-fast chain 누적 0. chain 부재 평서 박제 — 회복 task 발행 시점 chain 누적 신호 발생 시 별 carve-precondition 게이트 자가 차단 적용.

## 테스트 현황
- [x] `src/App.test.jsx` — 오프라인/온라인 토글, 라우트 매칭, ErrorBoundary 주입, `auth` 호출 검증, `resize` 1회 동기 호출 검증.
- [x] `src/reportWebVitals.test.js` — `web-vitals` 5 콜백 (`onCLS`/`onINP`/`onFCP`/`onLCP`/`onTTFB`) 등록 + dynamic import 검증 (`reportWebVitals` 자체 동작 채널, `src/index.jsx` 의 `sendBeacon` 부트 분기는 미포함 — REQ-094 회복 task 발행 후 별 fixture 박제).
- [x] (REQ-094, B1) `sendToAnalytics(metric)` URL/body 계약 fixture 1+ 박제 — `src/index.test.jsx:102` (`it('B1/FR-01: sendToAnalytics 콜백이 getAPI() URL + JSON.stringify(metric) 로 sendBeacon 을 호출한다', ...)`) `vi.fn()` stub + `commonMonitor.getAPI` mock + URL/body 단언. hook-ack HEAD=`776846e` (TSK-28 회수). G2 `grep -rnE "sendBeacon" src --include="*.test.*"` → 34 hit (zero-point 0 → 34 회복).
- [x] (REQ-094, B2) `sendCounter()` URL/body 계약 fixture 1+ 박제 — `src/index.test.jsx:131` (`it('B2/FR-02: sendCounter 가 getAPI()+"/useragent" URL + JSON.stringify(userAgentParser()) 로 1회 호출한다', ...)`) `userAgentParser` mock + `"/useragent"` 접미 URL 단언. hook-ack HEAD=`776846e`.
- [x] (REQ-094, B3) `navigator.sendBeacon` 가드 (falsy/미정의) 시 silent no-op 검증 fixture 1+ 박제 — `src/index.test.jsx:150` (`it('B3/FR-03: navigator.sendBeacon 이 undefined 면 silent no-op — 모듈 import + reportWebVitals 콜백 발화 모두 throw 없음', ...)`) `Object.defineProperty(navigator, 'sendBeacon', { value: undefined })` stub + `await import('./index.jsx')` throw 없음 + 콜백 발화 `not.toThrow()` 단언. hook-ack HEAD=`776846e`.
- [x] (REQ-094, B4) 모듈 로드 1회 발화 카운트 검증 fixture 1+ 박제 — `src/index.test.jsx:169` (`it('B4/FR-04: 모듈 로드 1회 발화 카운트 — 두 번째 import 는 캐시 사용으로 추가 호출 0 + reportWebVitals 1회 등록', ...)`) 단일 import 후 `sendBeaconSpy.mock.calls.length` 카운트 + 두 번째 import 캐시 사용 0 추가 호출 + `reportWebVitalsMock` 1회 호출 단언. hook-ack HEAD=`776846e`.
- [x] (REQ-094, FR-05) `src/index.jsx` 부트 분기는 `src/reportWebVitals.test.js` 가 커버하지 않음을 박제 — 본 § 테스트 현황 `src/reportWebVitals.test.js` 항목에 "`src/index.jsx` 의 `sendBeacon` 부트 분기는 미포함 — REQ-094 회복 task 발행 후 별 fixture 박제" 명시 (직전 blue line :45 "reportWebVitals.test.js 에서 커버" 거짓 박제 교정).

## 수용 기준 (현재 상태)

> **inspector tick 263 명령 부착** (`RULE-07 §수용 기준 문장` · `§promote 조건 2`). 종전 16항은 판정 명령 없이 `[x]` 였다 (planner tick 394 승격 거부). 13항에 명령을 붙이고 (명령 12종 — NFR 번들은 lazy 항목과 같은 명령), 판정면이 문서 자신이거나 테스트 작성 제약인 3항(REQ-094 FR-05 · NFR-01 · NFR-03)은 §참고 §미측정·비판정 항목으로 내렸다. 전 명령은 `src/**` 만 참조한다. HEAD=`94dc94e` `git archive` 사본 12/12 rc=0.
>
> **명명 실행 형식** — `vitest run <file> -t "<이름>"` 은 이름이 아무 테스트에도 맞지 않으면 전부 skip 하고 rc=0 이다 (tick 263 실측 — 테스트 소멸에 민감도 0). 그래서 vitest rc=0 **과** 요약 줄 `Tests N passed` 의 N ≥ K 를 함께 요구한다. 실패가 하나라도 있으면 요약 줄이 `N failed` 로 시작해 N 을 읽지 못하고 rc=1 이다. 없는 이름으로 같은 형식을 돌리면 rc=1 이다 (실측).

- [x] (Must) 기본 진입 `/` 접근 시 `/log` 로 `Navigate replace` 된다. 판정 (소스 표면 한정 — 이 리다이렉트를 단언하는 테스트는 없다. `App.test.tsx` *"redirect page"* 는 단언이 없다): `bash -c 'grep -qE "path=\"/\" element=\{<Navigate replace to=\"/log\"" src/App.tsx'` → rc=0.
- [x] (Must) 찬 시작이 오프라인이면 라우터를 마운트하지 않고 오프라인 안내를 그린다. 마운트 뒤 오프라인이 되면 안내가 보이고 앱은 감춰지되 언마운트되지 않는다 (§동작 4). 판정: `bash -c 'out=$(npx vitest run src/App.offline-state.test.tsx -t "오프라인 알림은 앱 트리를 교체하지 않는다" --coverage.enabled=false 2>&1) || exit 1; n=$(echo "$out" | sed -nE "s/^ +Tests +([0-9]+) passed.*/\1/p"); test "${n:-0}" -ge 3'` → rc=0 (원고 보존 · 알림 표시와 앱 감춤 · 찬 시작 미마운트 3건). **문면 정정** — 종전 문면 *"`navigator.onLine === false` 이면 라우터가 마운트되지 않고"* 는 찬 시작에만 참이다.
- [x] (Must) 마운트 시 `common.auth()` 가 정확히 1회 호출된다 (StrictMode 환경의 React 19 기준). 판정: `bash -c 'out=$(npx vitest run src/App.test.tsx -t "common.auth once per mount|common.auth idempotent under StrictMode" --coverage.enabled=false 2>&1) || exit 1; n=$(echo "$out" | sed -nE "s/^ +Tests +([0-9]+) passed.*/\1/p"); test "${n:-0}" -ge 2'` → rc=0.
- [x] (Must) `window.resize` 핸들러는 add/remove 짝이 맞고, 마운트 시 1회 동기 호출된다. 판정: `bash -c 'out=$(npx vitest run src/App.test.tsx -t "removes the resize listener on unmount|render after resize" --coverage.enabled=false 2>&1) || exit 1; n=$(echo "$out" | sed -nE "s/^ +Tests +([0-9]+) passed.*/\1/p"); test "${n:-0}" -ge 2'` → rc=0. **문면 정정** — 종전 *"`contentHeight` 를 세팅한다"* 의 값은 이제 `undefined` 다 (높이는 CSS, §공개 인터페이스).
- [x] (Should) 라우트 `/log` · `/file` · `/monitor` 는 `ErrorBoundary(fallback=ErrorFallback, onError=reportError)` 로 감싸진다. 판정 (라우트 모듈을 터뜨려 App 의 배선을 태운다 — 라우트별 3건): `bash -c 'out=$(npx vitest run src/App.test.tsx -t "라우트가 throw 하면 App 의 ErrorFallback" --coverage.enabled=false 2>&1) || exit 1; n=$(echo "$out" | sed -nE "s/^ +Tests +([0-9]+) passed.*/\1/p"); test "${n:-0}" -ge 3'` → rc=0.
- [x] (Should) `isDev()` 조건에서만 `ReactQueryDevtools` 를 렌더링한다. 판정 (소스 표면 한정 — 단언하는 테스트는 없다): `bash -c 'grep -qF "isDev() && <ReactQueryDevtools initialIsOpen={false} />" src/App.tsx'` → rc=0.
- [x] (Should) `Navigation` / `Footer` / 페이지들은 lazy 로드되며 `Suspense fallback` 이 `Skeleton variant="page"` 이다. 판정 (소스 표면 한정): `bash -c 'test "$(grep -cE "^const [A-Za-z]+ = lazy\(" src/App.tsx)" -ge 6 && grep -qF "<Suspense fallback={<Skeleton variant=\"page\" />}>" src/App.tsx'` → rc=0 (`lazy` 6).
- [x] (NFR) 번들: 최상위 shell 유지, 하위 페이지는 code-split. 판정은 위 lazy 항목과 같은 명령이다 — 분할 수단(`lazy`)의 실재만 재고, 빌드 산출물의 청크 분할은 재지 않는다.
- [x] (REQ-094, Must, FR-01) `sendToAnalytics(metric)` 은 `commonMonitor.getAPI()` 가 반환한 URL 과 `JSON.stringify(metric)` 으로 `navigator.sendBeacon` 을 호출한다. 판정: `bash -c 'out=$(npx vitest run src/index.test.tsx -t "B1/FR-01" --coverage.enabled=false 2>&1) || exit 1; n=$(echo "$out" | sed -nE "s/^ +Tests +([0-9]+) passed.*/\1/p"); test "${n:-0}" -ge 1'` → rc=0. hook-ack HEAD=`776846e` (TSK-28 회수).
- [x] (REQ-094, Must, FR-02) `sendCounter()` 는 `commonMonitor.getAPI() + "/useragent"` URL 과 `JSON.stringify(userAgentParser())` 로 `navigator.sendBeacon` 을 호출한다. 판정: `bash -c 'out=$(npx vitest run src/index.test.tsx -t "B2/FR-02" --coverage.enabled=false 2>&1) || exit 1; n=$(echo "$out" | sed -nE "s/^ +Tests +([0-9]+) passed.*/\1/p"); test "${n:-0}" -ge 1'` → rc=0.
- [x] (REQ-094, Must, FR-03) `navigator.sendBeacon` 이 falsy / 미정의일 때 `sendToAnalytics` / `sendCounter` 모두 throw 없이 no-op 으로 종료한다. 판정: `bash -c 'out=$(npx vitest run src/index.test.tsx -t "B3/FR-03" --coverage.enabled=false 2>&1) || exit 1; n=$(echo "$out" | sed -nE "s/^ +Tests +([0-9]+) passed.*/\1/p"); test "${n:-0}" -ge 1'` → rc=0.
- [x] (REQ-094, Must, FR-04) 모듈 로드 1회당 `sendCounter()` 가 정확히 1회 즉시 호출되며, `reportWebVitals` 콜백으로 등록된 `sendToAnalytics` 는 web-vitals 콜백 발화 시에만 호출된다. 판정: `bash -c 'out=$(npx vitest run src/index.test.tsx -t "B4/FR-04" --coverage.enabled=false 2>&1) || exit 1; n=$(echo "$out" | sed -nE "s/^ +Tests +([0-9]+) passed.*/\1/p"); test "${n:-0}" -ge 1'` → rc=0.
- [x] (REQ-094, NFR-02) 회귀 안정성 — jsdom 환경에서 `navigator.sendBeacon` 미정의/정의 케이스 모두 결정적으로 통과한다. 판정: `bash -c 'out=$(npx vitest run src/index.test.tsx -t "부트 비콘 4 불변식" --coverage.enabled=false 2>&1) || exit 1; n=$(echo "$out" | sed -nE "s/^ +Tests +([0-9]+) passed.*/\1/p"); test "${n:-0}" -ge 4'` → rc=0 (블록 6건).

## 스코프 규칙
- **expansion**: 허용 — REQ-094 회복 task 가 신설 fixture (`src/index.test.{js,jsx}` 또는 동등 위치) + 본 spec 업데이트 (fixture 경로/식별자 박제 갱신) 동시 박제. 신규 helper (예: `setupBootBeaconFixture`) 추가 시 `src/__test-helpers/` 또는 `src/common/` 진입 가능 — scope 확장 허용 (단 helper 추가는 RULE-07 수단 중립 — 본 spec 비박제).
- **grep-baseline** (HEAD=`e19d870`, 2026-05-17 — REQ-094 흡수 시점 실측):
  - (G1) **[부트 비콘 토큰 등장 위치 baseline]** `grep -rnE "sendBeacon|sendToAnalytics|sendCounter" src` → **6 hit** 전수 `src/index.jsx`(:15-41 영역 — sendToAnalytics 선언/호출 + sendCounter 선언/호출 + 가드 2 분기). 본 spec 회복 대상 = 부트 비콘 토큰이 fixture (`*.test.*`) 영역에서도 ≥1 hit (B1~B4 spy/assert 박제 채널).
  - (G2) **[fixture sendBeacon spy/assert baseline]** `grep -rnE "sendBeacon" src --include="*.test.*"` → **0 hit** (HEAD=`e19d870` 실측 MISS — 본 spec 회복 대상 zero-point). 회복 효능 = 1+ hit (FR-01~FR-04 fixture 박제 후).
  - (G3) **[reportWebVitals 커버 범위 baseline]** `grep -nE "index\.jsx|sendBeacon|sendToAnalytics|sendCounter|navigator\.sendBeacon" src/reportWebVitals.test.ts` → **0 hit** (현 fixture 가 `src/index.jsx` / sendBeacon 분기를 import/spy/assert 0 — 거짓 박제 교정 근거). 본 spec 박제 자체로 거짓 박제 surface 차단.
  - (G4) **[RULE-07 시점 비의존 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/blue/components/app.md | grep -cE ":15-23|:28|:31-39|:41|:45\b|HEAD\s*="` → **0 hit** (HEAD=`e19d870` 실측 PASS — 본 spec §역할 + §공개 인터페이스 + §동작 + §회귀 중점 + §의존성 어디서도 절대 라인 좌표 박제 0 — 좌표는 §스코프 규칙 grep-baseline + §변경 이력 한정).
  - (G5) **[RULE-07 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/blue/components/app.md | grep -vE '\`[^\`]*default[^\`]*\`' | grep -vE 'default export' | grep -vE 'QueryClient\` 기본값' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (HEAD=`e19d870` 실측 PASS — `default export` 는 React 표준 API 식별자 면제, `` `QueryClient` 기본값 `` 은 `@tanstack/react-query` 라이브러리 사실 박제 (`staleTime`/`retry` 값 reference) — fixture 수단 (vi.fn vs vi.spyOn vs MockBeacon class 등) 후보 라벨 부여 0).
- **rationale**: (G1) 부트 비콘 토큰 등장 위치 baseline — 6 hit 전수 `src/index.jsx` (REQ-094 §배경 실측 정합). (G2) fixture spy/assert zero-point — 본 spec 회복 대상 ≥1 hit. (G3) reportWebVitals 커버 범위 zero-point — 거짓 박제 교정 근거. (G4) RULE-07 시점 비의존 자기 검증. (G5) RULE-07 수단 중립 자기 검증. 매트릭스: 5 baseline 채널 (G1 src 등장 + G2 fixture 부재 + G3 reportWebVitals 부재 + G4/G5 본 spec 자기 검증) — 회복 후 G2 1+ hit + G3 0 hit 유지 + G4/G5 박제 시점 PASS.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-10-13 | inspector tick 263 (Phase 1 — planner tick 394 승격 거부 회수) / — @ HEAD=`94dc94e` | **판정 명령 부착 + src drift 정정.** 수용 기준 16항이 명령 없이 `[x]` 였다. 13항에 명령(명명 실행 — vitest rc=0 ∧ `Tests N passed` N≥K, 또는 소스 표면 grep)을 붙이고 3항을 §참고 §미측정·비판정 항목으로 내렸다. 재개봉본 문면 중 현 `src/` 와 어긋난 셋을 고쳤다: §동작 4 오프라인 (찬 시작만 미마운트, 이후는 `hidden` 유지 — `App.offline-state.test.tsx`), §공개 인터페이스 `setContentHeight` (`innerHeight - 57 - 80` → `undefined`, 높이는 CSS), §동작 6 `isDev()`. §위치 `.jsx` → `.tsx`. `git archive` 사본 12/12 rc=0, 없는 이름으로 같은 형식 rc=1 | 위치 · 공개 인터페이스 · 동작 4·6 · 수용 기준 · 참고 |
| 2026-10-13 | REQ-20261013-112 방향 1 (inspector — blue 재개봉) / — @ HEAD=`0b5d9cf` | **판정 명령 평가 가능성 정정.** TS 전환(`b793703`) 전 경로 1건을 현 이름으로 고쳤다 (blue `:91` `src/reportWebVitals.test.js` → `.ts`). 바꾼 것은 경로뿐이고 명령의 의미·선언된 기대는 그대로다. `git archive` 사본에서 재실행 rc=1 — 선언(`0 hit`)과 같은 방향 1/1. `check-blue-judgement-evaluable.sh` (scan root = 이 판본) `unevaluable(rc=2)=0` | 스코프 규칙 |
| 2026-05-17 | inspector (Phase 1 hook-ack, TSK-20260517-28 회수 회수) / HEAD=`776846e` | REQ-094 회복 fixture `src/index.test.jsx` (4 it B1~B4) 박제 hook-ack — §테스트 현황 (B1)(B2)(B3)(B4) 4 marker [x] 플립 + §수용 기준 (Must FR-01)(Must FR-02)(Must FR-03)(Must FR-04) 4 marker [x] 플립. G2 grep `sendBeacon` test fixture zero-point (0 hit) → 34 hit 회복. G1 src/index.jsx 6→8 hit (commit chain 자체 무변동, baseline 박제 시점 정정). G3 `reportWebVitals.test.js` token 0 hit 무변동 — 거짓 박제 surface 차단 유지. RULE-07 자기검증 유지 (G4 0 hit + G5 0 hit). 잔여 marker — `src/reportWebVitals.test.js` 5 callback 등록 검증 (FR-05 §테스트 현황 한정) + 8 [x] NFR. | §테스트 현황 + §수용 기준 + §최종 업데이트 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-094 흡수) / pending (HEAD=`e19d870`) | blue→green 복사 + 루트 엔트리 부트 비콘 `sendToAnalytics` / `sendCounter` 4 불변식 (B1~B4) + 거짓 박제 교정 (직전 blue line :45 "reportWebVitals.test.js 에서 커버" → 실측 미커버 명시) 흡수. 박제 추가: §역할 (부트 비콘 4 불변식 평서) + §공개 인터페이스 (부트 비콘 2 함수 시그니처) + §동작 8 (B1~B4 불변식) + §회귀 중점 (REQ-094 회귀 채널) + §의존성 (`Monitor/api`+`web-vitals`+`reportWebVitals`+`userAgentParser` 추가) + §의존성 §직교 (REQ-091 + REQ-093 cross-ref) + §carve-precondition (P1)(P2)(P3) + §테스트 현황 (B1)(B2)(B3)(B4)(FR-05) 5 marker (FR-05 만 [x]) + §수용 기준 (Must FR-01~04)(Must FR-05)(NFR-01~03) 8 marker + §스코프 규칙 5 gate (G1~G5) 실측 baseline. 본 spec 분리 결정 근거: (a) blue 직접 편집 inspector writer 영역 외 (RULE-01) — blue→green 복사 후 흡수 경로 (req §수용 기준 마지막 항목 "거짓 박제 제거/교정" 명시). (b) 신규 spec carve 부적합 — `src/index.jsx` 부트 비콘은 `App` 컴포넌트 엔트리 셸 — `components/app.md` 단일 spec 단위 흡수 정합 (자매 `components/file.md` REQ-092 흡수 패턴 정합). (c) `30.spec/green/testing/runtime-fetch-unmount-safety.md` (REQ-093) 흡수 부적합 — REQ-093 §역할 명시 "`src/index.{jsx,tsx}` `sendBeacon` 분기 측정 (별 후보)" — 직교 axis (도메인 fetch unmount-safety vs 루트 엔트리 부트). consumed req: `specs/20.req/20260517-root-entry-beacon-boot-contract.md` (REQ-094) → `60.done/2026/05/17/req/` mv. RULE-07 자기검증 — (B1)~(B4)(FR-01)~(FR-05)(NFR-01)~(NFR-03) 모두 평서형·반복 검증 가능 (`grep -rnE "sendBeacon" src --include="*.test.*"` G2 단일 명령 + `vi.fn()` spy + `vi.mock` 모듈 격리 결정적 검증)·시점 비의존 (G4 0 hit — 본문에 절대 라인 좌표 박제 0)·incident 귀속 부재 (REQ-094 §배경 의 baseline audit 는 §변경 이력 / §스코프 규칙 한정 박제)·수단 중립 (G5 0 hit — fixture 수단 후보 라벨 0). RULE-06 §스코프 규칙 5 gate (G1~G5) 실측 박제 + `expansion` `허용` (신설 fixture 파일 + 본 spec 업데이트 + 선택 helper 추가 — scope 확장 허용). RULE-01 inspector writer 영역만 (`30.spec/green/components/app.md` create — blue→green 복사 후 흡수, blue 영역 0 touch). spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제. | all |
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-root-entry-beacon-boot-contract.md` (REQ-094 — 본 세션 mv).
- **blue 원본**: `specs/30.spec/blue/components/app.md` (2026-04-20 operator 최초 등록 — 본 spec 의 blue 기준).
- **직교 채널 spec**:
  - `30.spec/green/testing/runtime-fetch-unmount-safety.md` (REQ-093) — 도메인 fetch unmount-safety (Image/File/Monitor). 본 spec 의 부트 비콘은 unmount 개념 부재 — 별 axis 직교.
  - `30.spec/green/testing/console-error-runtime-zero.md` (REQ-091) — runtime console.error fail-fast. 부트 비콘 throw 발화 시 본 channel detect — 보완 직교.
- **선행 done req**:
  - `specs/60.done/2026/05/17/req/20260517-fileupload-settimeout-cleanup.md` (REQ-092) — `components/file.md` 흡수 패턴 정합 reference (별 컴포넌트 spec 흡수 양식).
  - `specs/60.done/2026/05/17/req/20260517-domain-fetch-unmount-race-coherence.md` (REQ-093) — `src/index.jsx` `sendBeacon` 분기 별 후보 명시 박제 (본 spec 진입 근거).
- **신호 (별 req 후보, 본 spec 비박제)**:
  - (a) `sendBeacon` 미지원 브라우저용 fetch keepalive / XHR 폴백 도입 (가드 falsy 분기 confluent 확장 — 별 req 후보).
  - (b) analytics 엔드포인트 스키마/페이로드 변경 (URL/body 계약 별 axis — 별 req 후보).

### 미측정·비판정 항목

`RULE-07 §수용 기준 문장` 에 따라 체크박스에서 내린 항목 (inspector tick 263, 종전 `[x]`).

- (REQ-094 FR-05) 이 문서가 네 불변식과 테스트 위치를 박제하고 구 blue 의 *"reportWebVitals.test.js 에서 커버"* 거짓 박제를 교정했다 — 판정 대상이 시스템이 아니라 문서다. 교정은 §테스트 현황 `src/reportWebVitals.test.js` 항목에 남아 있다.
- (REQ-094 NFR-01) 부트 비콘 fixture 는 `navigator.sendBeacon` 을 `vi.fn()` 으로 갈아끼우고 `afterEach` 로 원복하며 `commonMonitor.getAPI` · `userAgentParser` 를 `vi.mock` 으로 격리한다 — 테스트 작성 제약이다. 격리가 깨지면 위 B1~B4 명명 실행이 붉어지는지는 재지 않았다.
- (REQ-094 NFR-03) `src/index.tsx` 를 import 하는 fixture 는 `document.getElementById('root')` 와 `ReactDOM.createRoot` 를 대체해 App 마운트 부수효과를 남기지 않는다 — 테스트 작성 제약이다.
