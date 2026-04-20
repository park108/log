# MSW 테스트 이디엄 일원화 (scenario 래퍼 정규화 + inline handler 추출)

> **위치**: `src/test-utils/msw.js` (헬퍼), `src/Comment/api.mock.js` (scenario 팩토리), `src/Comment/Comment.test.jsx` (수동 바인딩), `src/File/api.mock.js` & `src/File/File.test.jsx` (inline handler 중복), `src/Image/api.mock.js` & `src/Image/ImageSelector.test.jsx` (inline handler 중복)
> **관련 요구사항**: REQ-20260420-010
> **최종 업데이트**: 2026-04-20 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20, HEAD=3f9e590).

## 역할
TSK-20260420-35-b 에서 도입한 공통 헬퍼 `src/test-utils/msw.js::useMockServer` 가 대부분 테스트에 적용됐으나, Comment 모듈의 `scenario()` 팩토리 시그니처 불일치 (6 export 가 `SetupServerApi` 비호환) 로 `Comment.test.jsx` 가 수동 `beforeEach(() => mock.xxx.listen())` / `afterEach(() => mock.xxx.close())` 바인딩을 유지하며 (6 describe 블록), File/Image 모듈은 mid-test inline `server.use(http.get/delete(...))` 핸들러 정의 (총 6 hits) 가 `api.mock.js` 의 `devServerFailed/devServerNetworkError/prodServerFailed/devServerNetworkError` 와 shape 중복이다. 본 spec 은 (A) Comment scenario 팩토리를 `SetupServerApi` 호환 서브셋 또는 `{ onUnhandledRequest }` 옵션 수용 형태로 정규화하고, (B) `Comment.test.jsx` 를 `useMockServer(() => mock.xxx)` 로 통일, (C) File/Image inline handler 를 `api.mock.js` 명명 export 로 추출해 테스트 fixture 이디엄을 1종으로 수렴시킨다. 런타임 소스 변경·MSW 버전 업그레이드·다른 모듈 추가 감사는 범위 밖.

## 공개 인터페이스
- **Comment scenario 래퍼 정규화 (FR-01)** — 2안 중 1안:
  - **A1 (권장)**: scenario 반환 객체가 `SetupServerApi` 호환 서브셋 (`listen(opts?)`, `close()`, `resetHandlers(...h)`, `use(...h)`) 을 노출. `listen(opts)` 의 `opts` 는 외부에서 override 가능. 기본값 `{ onUnhandledRequest: 'error' }` (useMockServer 기본과 정합) 또는 null-default.
  - **A2**: scenario 팩토리에 `{ onUnhandledRequest }` 옵션 인자 추가. `scenario(handlers, { onUnhandledRequest: 'bypass' })` 형태. 호출자(`useMockServer`) 가 호출 시 전달.
- **`Comment.test.jsx` 이디엄 통일 (FR-02)**:
  - 6 describe 블록의 `beforeEach(() => mock.xxx.listen())` / 대응 `afterEach(() => mock.xxx.close())` 바인딩을 `useMockServer(() => mock.xxx)` 호출로 치환.
  - describe 별 시나리오는 각 `useMockServer(() => mock.devServerOk)` 형태로 6회 호출 또는 describe scope 분리.
- **File/Image inline handler 추출 (FR-03, FR-04, FR-05)**:
  - `src/File/api.mock.js` 에 기존 `devServerFailed` / `devServerNetworkError` 의 내부 handler 배열을 개별 `failedHandler` / `networkErrorHandler` 등 명명 상수로 분리 export. scenario 는 해당 상수를 조합.
  - `src/Image/api.mock.js` 에 동일 원칙으로 `prodFailedHandler` / `devNetworkErrorHandler` 명명 export.
  - `File.test.jsx:230, 231` (HttpResponse.json(ERROR_500)) 및 `:264, 265` (HttpResponse.error()) 인라인 정의를 `server.use(mock.failedHandler, mock.deleteFailedHandler)` 형태 상수 참조로 치환.
  - `ImageSelector.test.jsx:54, 91` 동일 원칙.

## 동작
1. (FR-01) Comment scenario 팩토리 정규화:
   - A1 채택 시: `scenario(...handlers) => ({ listen: (opts = {}) => server.listen({ onUnhandledRequest: 'error', ...opts }), close, resetHandlers: (...h) => server.resetHandlers(...h, ...handlers), use: (...h) => server.use(...h) })` 형태. `SetupServerApi` 호환 서브셋.
   - A2 채택 시: `scenario(handlers, { onUnhandledRequest = 'error' } = {})` 로 팩토리 시그니처 확장. 기존 `listen()` 은 옵션 바인딩 후 호출.
   - 어느 안이든 기존 `onUnhandledRequest: 'bypass'` 하드코딩은 옵션 경로로 이동하거나 기본값 'error' 로 변경 + 테스트에서 필요시 override.
2. (FR-02) `src/Comment/Comment.test.jsx` 6 describe 블록에서 `beforeEach(() => mock.xxx.listen()); afterEach(() => mock.xxx.close());` 제거 → `useMockServer(() => mock.xxx)` 호출 (describe 내부).
3. (FR-03, FR-04) `src/File/api.mock.js` 와 `src/Image/api.mock.js` 의 handler 상수 추출:
   - `export const failedHandler = http.get(API_URL + "/test", () => HttpResponse.json(ERROR_500))` 등 명명 export.
   - 기존 `devServerFailed` / `devServerNetworkError` scenario 는 해당 상수 참조로 재구성.
4. (FR-05) `src/File/File.test.jsx:230, 231, 264, 265`, `src/Image/ImageSelector.test.jsx:54, 91` 의 inline `http.get/delete(...)` 를 해당 상수 참조 `server.use(mock.failedHandler, mock.deleteFailedHandler)` 로 치환. 소비처 import 경로 점검.
5. (FR-06, Could) scenario 팩토리 공통화 필요성 — 다른 5개 `api.mock.js` 는 `setupServer()` 직접 export 형태로 충분. 현 범위에서는 공통화 생략 권장.
6. `npm test` — 46 files / 368 tests 전원 green + flake 0 유지.
7. `npm run lint` 0 warn / 0 error.

### Baseline (2026-04-20, HEAD=3f9e590)
- `grep -n "onUnhandledRequest" src/Comment/api.mock.js` → 1 hit at `:14` (`'bypass'` 하드코딩).
- `grep -n "scenario" src/**/api.mock.js` → Comment 전용 7 hits at `src/Comment/api.mock.js:11, 28, 33, 38, 43, 48, 53`.
- `grep -rn "beforeEach.*listen\(\)\|afterEach.*close\(\)" src --include="*.test.*"` → Comment.test.jsx 6 describe `beforeEach(() => mock.xxx.listen())`:
  - `src/Comment/Comment.test.jsx:18` (devServerOk)
  - `:101` (devServerFailed)
  - `:117` (devServerNetworkError)
  - `:140` (prodServerOk)
  - `:184` (prodServerFailed)
  - `:232` (prodServerNetworkError)
  - `src/test-utils/msw.test.js:24, 34, 56` 주석 — 예외 (헬퍼 단위 테스트).
- `grep -rn "HttpResponse\.error\(\)\|HttpResponse\.json(ERROR_500)" src --include="*.test.jsx"` → 6 hits in 2 files:
  - `src/File/File.test.jsx:230, 231, 264, 265`
  - `src/Image/ImageSelector.test.jsx:54, 91`
- REQ 본문 표기 (`File.test.jsx:212-215, 246-249`) 와 현 HEAD 라인 넘버 불일치 — 현 HEAD 기준 `:230-231` (ERROR_500 쌍), `:264-265` (error 쌍). 본 spec 은 현 HEAD 라인 기준 박제.

## 의존성
- 내부: `src/test-utils/msw.js` (`useMockServer`), `src/Comment/api.mock.js:8-26` (scenario 팩토리), `src/Comment/Comment.test.jsx:11-22, 101-240` (수동 바인딩), `src/File/api.mock.js:56-70` (handler 정의), `src/File/File.test.jsx:230-265`, `src/Image/api.mock.js:16, 21`, `src/Image/ImageSelector.test.jsx:54, 91`, `src/test-utils/msw.test.js` (`useMockServer` 메타 테스트, 변경 없음 확인용).
- 외부: `msw` (`SetupServerApi`, `http`, `HttpResponse`), `vitest` (`beforeEach`, `afterEach`).
- 역의존: REQ-20260420-004 / blue `deps/react-19-test-layer-adaptation-spec.md` §FR-02 (MSW 수명주기) — 본 spec 은 이디엄 정리 단계로, 수명주기 규약 (`beforeEach/beforeAll listen`, `afterEach/afterAll close`, `onUnhandledRequest: 'error'`) 과 정합. `src/setupTests.js` 의 MSW idiom 주석 (:22-34) 불변.

## 테스트 현황
- [x] `npm test` 46 files / 368 tests green (HEAD=3f9e590).
- [x] `useMockServer` 메타 스위트 (`src/test-utils/msw.test.js`) green.
- [x] Comment.test.jsx 수동 바인딩 상태로 현 HEAD green.
- [x] File.test.jsx / ImageSelector.test.jsx inline handler 상태로 현 HEAD green.
- [ ] FR-01 scenario 정규화 후 Comment 스위트 green (FR-02 통합 검증).
- [ ] FR-03, FR-04 명명 handler export 후 File / Image 스위트 green (FR-05 치환 검증).
- [ ] NFR-02, NFR-03 grep 게이트 0 hits 달성.
- [ ] `npm run lint` 0 warn / 0 error.

## 수용 기준
- [ ] (Must) `src/Comment/api.mock.js::scenario()` 가 `SetupServerApi` 호환 서브셋 (`listen(opts?)`, `close()`, `resetHandlers(...)`, `use(...)`) 를 노출하거나 `{ onUnhandledRequest }` 옵션 인자를 수용 — 둘 중 1안 일관 적용.
- [ ] (Must) `src/Comment/Comment.test.jsx` 6 describe 블록 전원 `useMockServer(() => mock.xxx)` 이디엄으로 통일. 수동 `beforeEach(() => mock.xxx.listen())` 및 대응 `afterEach(() => mock.xxx.close())` 제거.
- [ ] (Must) `grep -rn "beforeEach.*listen\(\)\|afterEach.*close\(\)" src --include="*.test.*"` → 0 hits (예외: `src/test-utils/msw.test.js` 의 **주석** 및 **메타 단정 어서트** 는 허용, 실제 `beforeEach/afterEach` 호출 라인만 카운트; 허용 예외는 `result.md` 에 명시).
- [ ] (Must) `src/File/api.mock.js` 에 `failedHandler` / `deleteFailedHandler` / `networkErrorHandler` / `deleteNetworkErrorHandler` (또는 동등 명명) 상수 export 추가. `src/Image/api.mock.js` 에 `prodFailedHandler` / `devNetworkErrorHandler` 상수 export 추가.
- [ ] (Must) `src/File/File.test.jsx:230, 231, 264, 265` 및 `src/Image/ImageSelector.test.jsx:54, 91` 의 inline `http.get(...)` / `http.delete(...)` 정의를 `server.use(mock.xxxHandler, ...)` 상수 참조 형태로 치환.
- [ ] (Must) `grep -rn "HttpResponse\.error\(\)\|HttpResponse\.json(ERROR_500)" src --include="*.test.jsx"` → 0 hits (`api.mock.js` 만 정의 보유).
- [ ] (Must) `npm test` — 46 files / 368 tests 전원 green + flake 0 유지.
- [ ] (Must) `npm run lint` 0 warn / 0 error.
- [ ] (Should) 다른 `api.mock.js` (Log, Search, Monitor, Toaster, useLog) 추가 감사는 본 spec 밖 — 필요 시 별도 followup 발행.
- [ ] (Should) scenario 팩토리 공통화 (FR-06 Could) 는 본 spec 밖 — 공통화 필요 판단되면 후속 spec 으로 carve.
- [ ] (NFR) `src/**` 비-test 런타임 파일 수정 0건 — `*.test.*`, `api.mock.js`, `test-utils/` 한정.
- [ ] (NFR) `src/setupTests.js` 의 MSW idiom 주석 (`:22-34`) 불변.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `grep -n "onUnhandledRequest" src/Comment/api.mock.js` → 1 hit at `:14` (`'bypass'`).
  - `grep -rn "scenario" src --include="api.mock.js"` → 7 hits in 1 file (`src/Comment/api.mock.js:11, 28, 33, 38, 43, 48, 53`).
  - `grep -rn "beforeEach.*listen\(\)\|afterEach.*close\(\)" src --include="*.test.*"` → 6 hits in 1 file (`src/Comment/Comment.test.jsx:18, 101, 117, 140, 184, 232`) + 3 주석 hits in `src/test-utils/msw.test.js:24, 34, 56` (허용).
  - `grep -rn "HttpResponse\.error\(\)\|HttpResponse\.json(ERROR_500)" src --include="*.test.jsx"` → 6 hits in 2 files:
    - `src/File/File.test.jsx:230, 231, 264, 265`
    - `src/Image/ImageSelector.test.jsx:54, 91`
- **rationale**: 런타임 소스 (`src/**/*.jsx` 중 `*.test.*` 제외, `api.mock.js`/`test-utils/` 제외) 는 본 spec 수정 범위 밖. MSW 버전 업그레이드 · HttpResponse API 변경은 Out-of-Scope. Log/Search/Monitor/Toaster/useLog `api.mock.js` 추가 감사는 별도 followup. scenario 팩토리 공통화 (FR-06) 는 Could 로 본 spec 내 완료 대상 아님. grep 게이트 `beforeEach.*listen\(\)|afterEach.*close\(\)` 의 `src/test-utils/msw.test.js` 내 주석·메타 어서트는 허용 예외 (헬퍼 단위 테스트 특성). MSW 수명주기 규약 (`onUnhandledRequest: 'error'` 기본) 은 REQ-20260420-004 관할, 본 spec 은 그 규약을 Comment 에 확산.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-010 반영) | all |
