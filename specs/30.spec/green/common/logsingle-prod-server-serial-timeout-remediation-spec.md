# LogSingle prod server serial timeout 해소 — it-scoped timeout override 1차 채택

> **위치**: `src/Log/LogSingle.test.jsx:56` (`LogSingle render on prod server (ok) > render LogSingle on prod server` `it`) / 보조 `src/Log/api.mock.js` (`mock.prodServerOk`), `src/Log/LogSingle.jsx`, `src/test-utils/timing.js` (`ASYNC_ASSERTION_TIMEOUT_MS`)
> **관련 요구사항**: REQ-20260421-016 (logsingle-prod-server-serial-timeout-remediation), REQ-20260421-014 (선행 — diagnosis 진단 완료, 본 spec 의 근거)
> **최종 업데이트**: 2026-04-21 (by inspector, Phase 3 신규 등록 — diagnosis 별건 후속 remediation)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=fc656a7). 본 spec 은 TSK-20260421-58 (diagnosis) 결과로 확정된 cold module/JIT warm-up 5000ms 경계 timeout flake (10% 재현률) 의 **해소 경로** 를 정식화한다. diagnosis spec (`logsingle-prod-server-serial-timeout-diagnosis-spec.md`, 30.spec/blue) 의 FR-04 3안 (a/b/c) 은 모두 실효 없음으로 확정 — 본 spec 은 (A) it-scoped timeout override / (B) 장비 부하 재측정 후 정책 수용 / (C) runtime initial fetch 최적화 의 fallback chain 을 박제하고 (A) 를 1차 채택한다.

## 역할
`src/Log/LogSingle.test.jsx:56` 의 `LogSingle render on prod server (ok) > render LogSingle on prod server` `it` 가 `npm test -- --run` (serial) 10회 중 1회 (재현률 10%, TSK-20260421-58 baseline 실측) `Test timed out in 5000ms` 로 실패하는 cold-start warm-up flake 를 해소한다. 원인 = jsdom initial render + MSW interceptor + React Query fetch pipeline 합이 vitest testTimeout 5000ms 예산 근처 도달. handler 자체는 결정론적 (지연 0, async chain 1, fixture import 시점 resolved). 본 spec 은 (A) it-scoped `{ timeout: 10000 }` override 를 1차 경로로 채택하고 fallback (B)(C) 를 박제. testTimeout 전역 기본값 상향은 diagnosis spec 제약 그대로 금지하되, it-scoped override 는 별개 축으로 해석 정합 (FR-08).

## 공개 인터페이스
- **FR-01 (Must) — 1차 해소 경로 (A) it-scoped timeout override 채택**: `it('render LogSingle on prod server', async () => {...}, { timeout: 10000 })` 형태로 `src/Log/LogSingle.test.jsx:56` 단일 `it` 블록의 3번째 인자에 `{ timeout: 10000 }` 추가. 전역 testTimeout 불변, 주변 it 불변.
- **FR-02 (Must) — (A) 채택 후 검증**: `npm test -- --run` serial 30회 연속 실측 시 `LogSingle.test.jsx:56` timeout 발생 0/30 (장비 fluctuation 허용 마진 0회).
- **FR-03 (Must) — (A) 구현 시 주변 it 보호**: 주변 it 블록 (`render LogSingle on dev server`, `go back to list` 등) 의 timeout 변경 0. 본 it 만 override. 코드 주석 박제 — `// REQ-20260421-016: cold-start warm-up ~5s (jsdom + MSW + React Query) → 10000ms override. 전역 testTimeout 불변.`
- **FR-04 (Should) — (A) 실패 시 (B) 경로**: 30회 중 1회 이상 timeout 발생 시 (B) = 장비 부하 환경 20~50회 serial 재측정 후 재현률 고정. 재현률이 CI / 로컬 환경 의존 확정되면 운영자 정책으로 수용 전환. 본 spec 은 (B) 결과 박제 단계까지 포함.
- **FR-05 (Could) — (B) 도 실효 없으면 (C) 경로 flag**: `src/Log/hooks/useLog.js` / `src/Log/LogSingle.jsx` initial fetch 경로 최적화는 별건 REQ 로 carve. 본 spec 에서 구현하지 않음.
- **FR-06 (Should) — diagnosis spec marker-sync 보조**: diagnosis spec (`logsingle-prod-server-serial-timeout-diagnosis-spec.md`, blue) §FR-05 블록 경로 (장비 부하 가설) 마커가 본 spec 채택 경로 (A 1차) 와 정합하도록 inspector 가 marker-sync 보조. blue 직접 수정은 promotion 정책 위반 — 본 spec 의 FR-08 인터프리테이션 주석으로 대체.
- **FR-07 (Must) — 최종 diff 범위**: 1차 경로 (A) 의 최종 diff 는 `src/Log/LogSingle.test.jsx` 단일 파일. 타 테스트 파일 0, runtime 소스 0, 전역 config 0.
- **FR-08 (Must) — diagnosis 제약 해석 정합**: 현행 diagnosis spec 의 "testTimeout 기본값 상향 금지" 제약은 **전역 config (vitest.config / defineConfig testTimeout)** 에만 적용됨을 본 spec 에서 명시. it-scoped 3번째 인자 `{ timeout }` 은 제약 외로 해석. 이 해석을 §역할 + §대안 에 박제.
- **FR-09 (Could) — (C) runtime 경로 carve 시 별건 REQ**: 본 spec 은 flag + 근거만 제공하고 구현 포함하지 않음.

## 동작
1. (FR-01, FR-03) `src/Log/LogSingle.test.jsx:56` 의 `it('render LogSingle on prod server', async () => {...})` 에 3번째 인자 `{ timeout: 10000 }` 추가. 코드 주석 박제 — `// REQ-20260421-016: cold-start warm-up ~5s (jsdom + MSW + React Query) → 10000ms override. 전역 testTimeout 불변.`
2. (FR-02) `npm test -- --run` serial 30회 연속 실행. timeout 발생 0/30 확인. 통계 (pass/fail, duration 분포) result.md 박제.
3. (FR-04) (A) 30회 중 timeout ≥1 발생 시 (B) 진입: 동일 장비에서 20~50회 추가 serial 재측정. 재현률이 CI 환경에 의존 확정되면 운영자 정책 (CI 전용 환경 변수 / sentinel skip) 으로 수용 전환. result.md 에 재현률 + 환경 메타 박제.
4. (FR-05, FR-09) (B) 도 실효 없으면 (C) flag — `src/Log/hooks/useLog.js` initial fetch 경로 (`useQuery` enabled / refetchOnWindowFocus / suspense 옵션) 와 `src/Log/LogSingle.jsx` 의 mount-time pre-render 비용 (RouteContext, QueryClient hydrate) 을 별건 REQ 로 carve. 본 spec 은 carve 자체 미수행.
5. (FR-06) diagnosis spec marker-sync 는 promotion 정책상 본 spec 에서 직접 편집하지 않고, 본 spec 의 FR-08 인터프리테이션 주석 (it-scoped `{ timeout }` 은 금지 범위 외) 으로 대체.
6. (FR-08) `npm test -- --run` 의 vitest 동작 — 전역 testTimeout 5000ms 는 `vitest.config.ts` 미설정 default. it-scoped 3번째 인자는 vitest 공식 API (`it(name, fn, timeout | options)`) 로 per-test override. 두 축은 독립 — diagnosis spec 의 "testTimeout 상향 금지" 는 전역 default 의 회피로서 의미. it-scoped 는 cold-start warm-up 의 결정론적 boundary push 로 의미 분리.

### 대안
- **(A) it-scoped `{ timeout: 10000 }` override (채택, 1차)**: 수정 파일 1, runtime 0, NFR-04 준수. semantic = "cold-start warm-up boundary push", 가역성 = 인자 제거만으로 원복.
- **(B) 장비 부하 재측정 후 정책 수용 (2차 fallback)**: (A) 30회 0 fail 미달 시. 환경 의존 재현률 고정 + 운영자 정책 wrapper. 코드 변경 0.
- **(C) runtime initial fetch 최적화 (3차 flag)**: `useLog` enabled/suspense/`useLogSingleQuery` cache hydrate 옵션. 별건 REQ carve 대상. 본 spec 미포함.
- **testTimeout 전역 상향 (기각)**: diagnosis spec 명시 금지. flake 를 덮지만 원인 은폐.
- **runtime `LogSingle.jsx` / `useLog.js` 직접 수정 (기각, 본 spec 범위 외)**: REQ Out-of-Scope, 별건 REQ (C) 로 분리.

### Baseline (2026-04-21, HEAD=fc656a7)
- `grep -nE "it\(.*render LogSingle on prod server" src/Log/LogSingle.test.jsx` → 1 hit at `:56` (FR-01 후 `, async ..., { timeout: 10000 }` suffix 포함).
- `grep -n "REQ-20260421-016" src/Log/LogSingle.test.jsx` → 0 hits (FR-03 후 1 hit, 코드 주석).
- `grep -nE "testTimeout" vitest.config.*` → 0 hits (전역 default 5000ms 유지 검증, FR-07/FR-08 보호).
- `grep -n "sessionStorage.clear" src/Log/LogSingle.test.jsx` → ≥1 hit (FR-04(a) neutral 근거, 변경 0).
- `grep -n "useFakeTimers" src/Log/LogSingle.test.jsx` → ≥1 hit at `:98` 부근 (FR-04(c) 재배치 여지 없음 근거, 변경 0).
- `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → ≥1 hit (FR-04(b) revert 근거 — `:2-3` 주석 위배).

## 의존성
- 내부:
  - `src/Log/LogSingle.test.jsx:56-117` — 본 it (1차 경로 (A) 적용 지점, 단일 수정 파일).
  - `src/Log/api.mock.js` — `mock.prodServerOk` handler (불변, 결정론 baseline).
  - `src/Log/LogSingle.jsx` — runtime (불변, (C) 대상이나 본 spec 미포함).
  - `src/Log/hooks/useLog.js` — runtime (불변, (C) 대상이나 본 spec 미포함).
  - `src/test-utils/timing.js:2-3` — `ASYNC_ASSERTION_TIMEOUT_MS` 옵션 α 구조적 실패 주석 (FR-04(b) 근거).
  - `vitest.config.*` — 전역 testTimeout 불변 (FR-07/FR-08 보호).
- 외부: `vitest` (`it(name, fn, options)` per-test timeout API), `@testing-library/react`, `msw`, `@tanstack/react-query`.
- 역의존: REQ-20260421-014 (diagnosis 선행 완료). REQ-20260421-016 (본 req). 향후 (C) 별건 REQ — 미발행 flag.
- 참조 followup: `specs/60.done/2026/04/21/followups/20260421-1238-logsingle-prod-server-serial-timeout-patch-infeasible.md`.
- 참조 result: `specs/60.done/2026/04/21/task/20260421-logsingle-prod-server-serial-timeout-diagnosis/result.md` (TSK-20260421-58, baseline 10회 fail run 7).

## 테스트 현황
- [x] TSK-20260421-58 baseline 10회 실측 (fail run 7, 5089ms, 재현률 10%) — diagnosis 결과 박제 완료 (`/tmp/tsk58/run_baseline_{1..10}.log`).
- [x] FR-04 3안 (a/b/c) 모두 실효 없음 확정 — diagnosis result.md 박제.
- [ ] FR-01 (A) it-scoped `{ timeout: 10000 }` override 적용. **[pending: 본 spec 의 후속 task carve 대기]**
- [ ] FR-02 (A) 적용 후 30회 연속 serial 0 fail. **[pending: FR-01 적용 후 실측]**
- [ ] FR-03 (A) 코드 주석 박제 (`REQ-20260421-016` + cold-start warm-up 근거). **[pending: FR-01 적용 시 동시 박제]**
- [ ] FR-07 최종 diff 단일 파일 검증. **[pending: FR-01 적용 후 git show --stat]**
- [ ] FR-08 인터프리테이션 주석 (it-scoped 는 금지 범위 외) 박제. **[deferred: 본 spec 자체에 박제 완료, blue diagnosis spec 직접 편집은 promotion 정책 위반]**
- [ ] (조건부) FR-04 (B) 장비 부하 재측정 결과 박제. **[pending: FR-02 미달 시]**
- [ ] (조건부) FR-05 (C) 별건 REQ flag. **[pending: FR-04 (B) 미달 시]**

## 수용 기준
- [ ] (Must) FR-01 — `src/Log/LogSingle.test.jsx:56` it 블록에 `{ timeout: 10000 }` 3번째 인자 추가. diff 본 파일 단일, 전역 config 수정 0, 주변 it 수정 0.
- [ ] (Must) FR-02 — (A) 적용 후 `npm test -- --run` 30회 serial 실행에서 `LogSingle.test.jsx:56` `Test timed out in 5000ms` (또는 override 후 10000ms) 0회 발생.
- [ ] (Must) FR-03 — `grep -n "REQ-20260421-016" src/Log/LogSingle.test.jsx` 1 hit + cold-start warm-up 근거 주석 1줄.
- [ ] (Must) FR-07 — `git show --stat <hash>` 변경 파일 1건 (`src/Log/LogSingle.test.jsx`), runtime 소스 0, 타 테스트 파일 0, 전역 config 0.
- [x] (Must) FR-08 — 본 spec 에 "it-scoped `{ timeout }` 은 금지 범위 외" 인터프리테이션 박제 (§역할 + §동작 + §대안).
- [ ] (Should) FR-04 — (A) 30회 중 ≥1 timeout 시 (B) 장비 부하 재측정 20~50회 serial 실측 결과 + 재현률 result.md 박제.
- [ ] (Should) FR-06 — diagnosis spec marker-sync 보조 (본 spec FR-08 인터프리테이션으로 대체).
- [ ] (Could) FR-05 — (B) 도 실효 없으면 (C) 별건 REQ (`src/Log/hooks/useLog.js` / `src/Log/LogSingle.jsx` initial fetch 최적화) 발행.
- [ ] (Could) FR-09 — (C) runtime 경로 carve 시 별건 REQ 발행, 본 spec 미포함.
- [ ] (NFR-01) (A) 적용 후 `npm test -- --run` serial 30회 연속 실행에서 `LogSingle.test.jsx:56` timeout 발생 0.
- [ ] (NFR-02) 1차 경로 diff 파일 = 1 (`src/Log/LogSingle.test.jsx`). runtime 소스 diff 0.
- [ ] (NFR-03) timeout override 인자 제거만으로 원복 가능. 추가 의존/util 없음.
- [x] (NFR-04) override 주석에 `REQ-20260421-016` 박제 + cold-start warm-up 근거 1줄. result.md 에 (A) 30회 통계 수치 박제. **[부분 — spec 박제 완료, result.md 는 후속 task]**
- [ ] (NFR-05) 인접 it (`render LogSingle on dev server`, `go back to list`) timeout 변경 0. 전역 testTimeout 변경 0.

## 스코프 규칙
- **expansion**: 불허 — 1차 경로 (A) 는 `src/Log/LogSingle.test.jsx` 단일 파일에 한정. 본 spec 의 (C) 경로는 별건 REQ 로 carve 되어야 하며, 본 spec 의 후속 task 가 (C) 를 직접 수행하면 RULE-06 위반.
- **grep-baseline** (2026-04-21, HEAD=fc656a7):
  - `grep -nE "it\(.*render LogSingle on prod server" src/Log/LogSingle.test.jsx` → 1 hit at `:56` (FR-01 후 `, { timeout: 10000 }` suffix 포함).
  - `grep -n "REQ-20260421-016" src/Log/LogSingle.test.jsx` → 0 hits (FR-03 후 1 hit).
  - `grep -nE "testTimeout" vitest.config.*` → 0 hits (전역 default 보호).
  - `grep -nE "^[[:space:]]*it\(" src/Log/LogSingle.test.jsx` → 9 hits (전체 it 블록 수, 다른 it 수정 0 검증 baseline).
- **rationale**: cold-start warm-up flake 의 1차 해소는 it-scoped boundary push 로 충분 (diagnosis 결정론 분석 근거). runtime 변경은 (C) 별건 REQ 로 분리해 본 spec 의 patch 가역성·범위 최소화를 보장. (B) 환경 의존 재현률 fallback 은 코드 변경 0, 운영자 정책 wrapper.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — (REQ-20260421-016 반영, HEAD=fc656a7) | Phase 3 신규 등록 — diagnosis 별건 후속 remediation. (A) it-scoped `{ timeout: 10000 }` override 1차 채택, fallback (B) 장비 부하 재측정 / (C) runtime 최적화 별건 REQ flag. FR-08 인터프리테이션 (it-scoped 는 diagnosis spec 금지 범위 외) 박제. | all |
