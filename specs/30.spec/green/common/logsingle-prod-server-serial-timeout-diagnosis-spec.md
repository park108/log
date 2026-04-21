# LogSingle prod server serial timeout — 진단 및 결정론화

> **위치**: `src/Log/LogSingle.test.jsx:56` (`LogSingle render on prod server (ok) > render LogSingle on prod server` `it`) / 참조 `src/Log/api.mock.js` (`mock.prodServerOk`), `src/Log/LogSingle.jsx`, `src/test-utils/timing.js` (`ASYNC_ASSERTION_TIMEOUT_MS`)
> **관련 요구사항**: REQ-20260421-014 (logsingle-prod-server-serial-timeout-diagnosis)
> **최종 업데이트**: 2026-04-21 (by inspector, Phase 3 신규 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=e1a9bef).

## 역할
`src/Log/LogSingle.test.jsx:56` 의 `LogSingle render on prod server (ok) > render LogSingle on prod server` 가 `npm test -- --run` (serial) 1회차에서 5006ms timeout 으로 실패 후 2회차 pass 되는 인터미턴트 flake (shuffle seed=3 에서는 재현 안 됨) 를 관측·결정론화한다. testTimeout 상향으로 덮지 않고, MSW `mock.prodServerOk` handler latency / QueryClient cache 초기화 / realTimers→fakeTimers 전환 타이밍을 좁혀 최소 침습 patch 를 제안. runtime 수정 금지 (`src/Log/LogSingle.jsx`, `src/Log/hooks/useLog.js`), testTimeout 기본값 상향 금지.

## 공개 인터페이스
관측 대상 재현 지점:
- `src/Log/LogSingle.test.jsx:56-117` — `LogSingle render on prod server (ok)` describe 내 단일 `it`.
- 시퀀스 구조 (L56-117):
  1. `stubMode('production')`.
  2. realTimers 상태에서 `await screen.findByText("To list")` — useLog fetch resolve 대기 (5006ms timeout 재현 지점).
  3. `vi.useFakeTimers({ shouldAdvanceTime: true })`.
  4. `fireEvent.click(toListButton)` → `vi.runOnlyPendingTimersAsync()`.
  5. `findByText("Delete")` → click → `runOnlyPendingTimersAsync()`.
  6. `waitFor(..., { timeout: ASYNC_ASSERTION_TIMEOUT_MS })`.

재현 상태 (followup `20260421-0212-log-single-prod-server-serial-timeout-flake.md` 관측):
- 1회차 serial: `1 failed | 374 passed (375)`, `LogSingle.test.jsx (9 tests | 1 failed) 5081ms`.
- 2회차 serial: 375/375 pass.
- shuffle seed=3: 47 files / 375 tests 모두 pass.

## 동작
1. (FR-01) 10회 serial run 스크립트 또는 반복 실행으로 `LogSingle.test.jsx:56` 실측 실패율 + 평균 duration 을 수치화. req/spec 또는 result.md 에 박제.
2. (FR-02) `src/Log/api.mock.js` 의 `mock.prodServerOk` handler resolve 경로 확인 — (a) 지연 (`setTimeout`, `await delay(...)`) 여부, (b) 비동기 chain 길이, (c) 결정론적 resolve (`await Promise.resolve(fixture)`) 인지. 결과 spec/result.md 에 박제.
3. (FR-03) 1회차 실패 · 2회차 성공 차이를 만드는 전역 상태 차감 분석:
   - QueryClient (`makeQueryClient()` 매 test 신규 인스턴스 — L20-28, 격리 확인).
   - `sessionStorage` (list / filter 상태 잔존 가능성).
   - `vi.mock` cache / module cache (vitest isolate 옵션).
   - `console.log/warn/error` vi.fn 교체 (L18-20).
   결과 1~2개 원인 단서로 좁힘.
4. (FR-04, Should) 원인 식별 시 최소 침습 patch 제안:
   - (a) `sessionStorage.clear()` 추가 (test 파일 `beforeEach`).
   - (b) `waitFor` 대체 또는 `findByText` timeout options.
   - (c) fake timer 전환 시점 재배치 (fetch resolve 이후로 명확화).
   runtime 수정 금지 — 테스트 파일 단독 수정.
5. (FR-05, Should) FR-01 에서 10회 중 0 fail 재현 실패 (= 장비 부하 가설 더 타당) 시 req 를 `50.blocked/req/` 로 격리하고 사유 박제. 본 spec 도 동시 격리.

### 대안
- **testTimeout 상향**: 기각 — flake 를 덮지만 원인 은폐. REQ Out-of-Scope.
- **runtime `src/Log/LogSingle.jsx` / `useLog.js` 수정**: 기각 — REQ Out-of-Scope, 테스트 측 결정론화로 해결 가능.
- **shuffle 전체 strict isolation 상향 (vitest `isolate: true`)**: 기각 — 전체 스위트 성능 영향, 다른 테스트 flake 가 가려질 위험.
- **관측·계측 주도 진단 (채택)**: 수정 파일 ≤ 2 (테스트 + api.mock 또는 spec), runtime 수정 0, 10회 재실측 근거.

## 의존성
- 내부:
  - `src/Log/LogSingle.test.jsx:40-117` — 재현 대상.
  - `src/Log/api.mock.js` — `mock.prodServerOk` handler (FR-02 관측 대상, runtime 변경 0).
  - `src/Log/LogSingle.jsx` — 본문 (관측 대상, 수정 금지).
  - `src/Log/hooks/useLog.js` — fetch pipeline (관측 대상, 수정 금지).
  - `src/test-utils/timing.js` — `ASYNC_ASSERTION_TIMEOUT_MS` (이미 import, 추가 사용 가능).
  - `src/test-utils/msw.js` — `useMockServer` (수정 대상 아님).
- 외부: `vitest` (`vi.useFakeTimers`, `vi.useRealTimers`, `runOnlyPendingTimersAsync`), `@testing-library/react` (`findByText`, `waitFor`), `msw` (interceptor), `@tanstack/react-query` (QueryClient).
- 역의존: REQ-20260421-010 (Layer 2 cold-start race — 다른 파일이지만 유사 mutation/fetch race 패밀리). REQ-20260421-012 (Layer 2 재진단) 과 병렬 진행 가능 (파일 비중첩).
- 병렬 진행 가능: TSK-20260421-53 (Layer 2 B3, `src/test-utils/msw.js` runtime). 본 spec 수정 범위 비중첩.
- 참조 followup: `specs/60.done/2026/04/21/followups/20260421-0212-log-single-prod-server-serial-timeout-flake.md`.

## 테스트 현황
- [x] 1회차 serial run 5006ms timeout 재현 박제 (followup `20260421-0212-log-single-prod-server-serial-timeout-flake.md`).
- [x] 2회차 serial run 375/375 pass 박제 (동일 followup).
- [x] shuffle seed=3 47 files / 375 tests pass 박제 (동일 followup).
- [ ] FR-01 10회 serial run 실측 실패율/평균 duration 수치 박제.
- [ ] FR-02 `mock.prodServerOk` resolve 경로 결정론성 판정 박제.
- [ ] FR-03 1회차 vs 2회차 차이 상태 1~2개 원인 단서 박제.
- [ ] FR-04 (조건부) 최소 침습 patch 적용 후 10회 serial 0 fail.
- [ ] NFR-04 수정 후 `npm test -- --run` 47 files / 375 tests 0 fail, coverage 회귀 0.

## 수용 기준
- [ ] (Must) FR-01 — `LogSingle.test.jsx:56` 10회 serial 실측 실패율 + 평균 duration 수치 박제.
- [ ] (Must) FR-02 — `mock.prodServerOk` resolve latency + 결정론성 판정 박제 (`await Promise.resolve(fixture)` 여부).
- [ ] (Must) FR-03 — 1회차 실패 · 2회차 성공 차이 원인 단서 1~2개 박제 (QueryClient / sessionStorage / vi.mock cache 중).
- [ ] (Should) FR-04 — 원인 식별 시 테스트 측 최소 침습 patch 제안 (runtime 수정 0). 10회 serial 0 fail 달성.
- [ ] (Should) FR-05 — FR-01 재현 실패 시 장비 부하 가설 채택, req + spec `50.blocked/` 격리, 사유 박제.
- [ ] (NFR-01) FR-04 patch 적용 후 10회 연속 serial run 에서 `LogSingle.test.jsx:56` 0 fail.
- [ ] (NFR-02) FR-01 10회 실측 수치 (pass/fail, duration 분포) spec / result.md 박제.
- [ ] (NFR-03) 최종 변경 파일 ≤ 2. `src/Log/LogSingle.jsx` / `src/Log/hooks/**` runtime 수정 0.
- [ ] (NFR-04) 수정 후 `npm test -- --run` 47 files / 375 tests 0 fail, coverage 회귀 0.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=e1a9bef):
  - `grep -n "render LogSingle on prod server" src/Log/LogSingle.test.jsx` → 1 hit (재현 지점 `:56` 부근 it 본문).
  - `grep -n "prodServerOk" src/Log/api.mock.js` → handler 정의 (FR-02 관측 대상).
  - `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/Log/LogSingle.test.jsx` → ≥1 hit (이미 import, FR-04 재사용 검토).
  - `grep -n "sessionStorage" src/Log/LogSingle.test.jsx` → 현재 사용 지점 박제 (FR-04 (a) 옵션 후보 baseline).
  - `grep -n "vi.useFakeTimers\|vi.useRealTimers" src/Log/LogSingle.test.jsx` → (스냅샷) 본문 시퀀스 전환 지점.
- **rationale**: 본 spec 은 `src/Log/LogSingle.test.jsx` + (선택) `src/Log/api.mock.js` 2 파일 이내 수정만 허용. runtime (`src/Log/LogSingle.jsx`, `src/Log/hooks/useLog.js`, `src/Log/hooks/useDeleteLog.js`, `src/Toaster/**`) 수정 금지. testTimeout 기본값 상향 금지. 다른 prod server 테스트 (`File.test.jsx:35 prodServerHasNoData`) 재평가는 범위 외. FR-05 블록 경로는 운영자 개입 대상 (RULE-05).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-014 logsingle-prod-server-serial-timeout-diagnosis 반영). `LogSingle.test.jsx:56` 1회차 serial timeout flake 관측·결정론화, runtime 수정 0 강제, testTimeout 상향 금지. FR-05 블록 경로 명시 (장비 부하 가설). | all |
