# 테스트 격리 강화 — cold-start race 기반 shuffle 안전성 재작성 (Layer 1 + Layer 2)

> **위치**: `src/Log/LogItem.test.jsx` 의 DELETE 5xx / network-error 계열 test (`:205, :260, :316, :377` 의 `screen.getByTestId("delete-button")` + `:271:39` 의 `findByText("Deleting log network error.")`); 보조 대상 `src/test-utils/msw.test.js:29, 37, 57` (sibling-it 의존), `src/File/File.test.jsx:35` 의 `prodServerHasNoData` describe (QueryClient cache race).
> **관련 요구사항**: REQ-20260421-007 (Layer 1, REQ-20260421-004 재작성분), REQ-20260421-010 (Layer 2, 2-레이어 서사 확장)
> **최종 업데이트**: 2026-04-21 (by inspector, Layer 2 서사 확장)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=fd38b44). 이전 blocked spec 은 α-가설("vi.spyOn 12건 누수 → admin 분기 오염") 기반이었으나 developer 실측(TSK-20260421-45)에서 재현 실패의 주원인이 아님으로 확인. Layer 1 (sync query cold-start) 은 REQ-007 기반으로 옵션 A 로 해결됐으나 TSK-20260421-49 실측에서 옵션 A/B/C 조합 적용 후에도 `findByText("Deleting log network error.")` 5062ms timeout 이 shuffle seed=1 에서 1건 잔존 — 이는 **Layer 2 (mutation + msw listen + React 19 concurrent first-in-file flush race)** 로 식별됨. 본 spec 은 Layer 1 / Layer 2 를 분리 서사화한다.

## 역할
`vitest run --sequence.shuffle --sequence.seed={1,2,3}` 실행 시 `LogItem DELETE 5xx` / `network-error` 케이스가 shuffle 순서상 맨 처음 실행될 때 2개 층에서 race 가 발생한다.

- **Layer 1 — sync query cold-start race (해결됨)**: `screen.getByTestId("delete-button")` 의 sync query 가 React 19 concurrent commit 미반영 상태의 빈 `<body><div /></body>` 에 질의해 `Unable to find...` 로 실패. 옵션 A(sync→async query 전환, `findByTestId` 치환) 로 해결 경로 확정.
- **Layer 2 — mutation flush cold-start race (미해소)**: Layer 1 해결 후 `delete-button` 발견까지는 도달하나, `fireEvent.click → window.confirm → mutation.mutate → mutationFn fetch → onError → setToasterMessage → Toaster rerender` 경로가 cold-start 상태에서 flush 되지 않음. 실측 (TSK-20260421-49, HEAD=ea9d30c):
  - `npx vitest run --sequence.shuffle --sequence.seed=1` → `Test Files 1 failed | 46 passed (47)`, `Tests 1 failed | 374 passed (375)`, `Duration ~7s`.
  - 실패 지점: `src/Log/LogItem.test.jsx:271:39` (`findByText("Deleting log network error.")` 5062ms timeout).
  - 대조: seed=2/3 0 fail, `npm test -- --run` (serial) 0 fail.
  - 진단: `window.confirm` 스파이 호출 1회 (mutation entry 도달), 같은 `it` 본문 직접 `fetch(...)` → `status=200 ok=true` 즉시 반환 (msw handler 정상). 그러나 LogItem 내부 mutation fetch 는 3000ms 후에도 `document.body.innerHTML` 에 `"Deleting log failed"` 부재 → **mutation flush 가 cold-start 에서 지연/누락**.

본 spec 은 Layer 1 의 옵션 A 채택은 유지하고, Layer 2 에 대해 후보 B1~B4(테스트층) + B5(런타임층, 조건부) 를 §대안 섹션에 열거, 1차 추천안과 fallback 순서를 §동작에 확정한다. 이전 blocked spec 의 FR-06 (msw.test.js sibling-it), FR-07 (File.test.jsx QueryClient cache) 는 검증된 범위에 한해 유지. runtime 소스 변경(B5 제외), `vite.config.js` 의 `sequence.shuffle` 기본값 변경, TSK-20260421-45(historical artefact) 재활용은 본 spec 밖.

## 공개 인터페이스
- **FR-01 (Must) — Layer 1/Layer 2 구분 서사 박제**: spec §역할 / §동작 에 Layer 1 (sync query cold-start, 옵션 A 해결) 과 Layer 2 (mutation + msw listen + React 19 concurrent first-in-file flush, 미해소) 구분 서사 확정. 실패 스택(`src/Log/LogItem.test.jsx:210:31, :265, :321, :382` Layer 1; `:271:39` Layer 2) 및 seed 별 재현 결과(seed=1: 1 fail Layer 2, seed=2/3: 0 fail — HEAD=ea9d30c 실측 근거) 포함.
- **FR-02 (Must) — Layer 1 옵션 A: sync→async query 전환**: `src/Log/LogItem.test.jsx:205, :260, :316, :377` 의 `screen.getByTestId("delete-button")` 4건을 `await screen.findByTestId("delete-button")` 로 교체. `restoreAllMocks` 추가는 선택적 후속 보강으로 유지 (누수 자체는 주원인이 아니나 정합성 차원).
- **FR-03 (Should) — Layer 1 옵션 B (대안): 파일-level useFakeTimers**: `src/Log/LogItem.test.jsx` 최상단에 `beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))` + `afterEach(() => vi.useRealTimers())` 추가. testing-library polling 환경 균일화. Layer 1 용 — FR-02 와 택일 (동시 적용 금지).
- **FR-04 (Could) — Layer 1 옵션 C (조건부): ASYNC_ASSERTION_TIMEOUT_MS 사용**: TSK-20260421-47 완료 확인 후 `findByTestId("delete-button", {}, { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` 로 타임아웃 여유 확보. 현재 `src/test-utils/timing.js` 에 `ASYNC_ASSERTION_TIMEOUT_MS` 존재 — 선결 조건 충족.
- **FR-05 (Must) — Layer 1 채택 근거 박제**: spec §동작 에 옵션 A 채택 1~2문장 요약("React 19 concurrent rendering 의 initial commit 은 async flush 경로이므로 sync query 는 0 node 를 반환. findBy* 는 내부 polling 으로 commit 대기 — 최소 침습·가장 확정적") 박제.
- **FR-06 (Must) — msw.test.js sibling-it 의존 제거**: `src/test-utils/msw.test.js:29, 37, 57` 세 지점 sibling `it` 의 afterEach 호출 횟수에 의존하는 어서트를 (옵션 1) 단일 `it` 병합, (옵션 2) `describe.sequential` 블록 이동, (옵션 3) direct assertion 재작성 중 단일 적용.
- **FR-07 (Must) — File.test.jsx cache race 해소**: `src/File/File.test.jsx:35` `prodServerHasNoData` describe 에 (옵션 1) 명시 `queryClient.clear()` 훅, (옵션 2) `findByText("Drop files here!", {}, { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` timeout 여유 중 단일 적용.
- **FR-08 (Must) — shuffle seed 3회 실측**: `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail 결과를 result.md 에 박제.
- **FR-09 (Should) — TSK-45 historical artefact 명시**: spec §변경 이력 에 "TSK-20260421-45 는 α-가설 한정 historical artefact" 명시. TSK-45 자체 복귀는 RULE-05 운영자 관할.
- **FR-10 (Should) — spec 복귀 경로**: 본 파일 위치는 `specs/30.spec/green/common/test-isolation-shuffle-safety-cold-start-spec.md`. 이전 blocked spec (`specs/50.blocked/spec/test-isolation-shuffle-safety-spec.md`) 은 운영자 정리 대상 (RULE-05).
- **FR-11 (Must, REQ-010) — Layer 2 후보 B1~B4 열거**: §대안 섹션에 다음 후보를 각 1~2문장 판정 근거와 함께 박제:
  - **B1**: warm-up `beforeAll(async () => { render(<div />); await tick(); cleanup(); })` 또는 empty render prime — React 19 concurrent scheduler 를 미리 warm 시켜 first-in-file mutation flush 지연을 회피. 장점: 테스트 1 파일 수정 (`LogItem.test.jsx`). 단점: warm-up 의 semantic 불투명. 판정: 3 seed 0 fail 시 채택.
  - **B2**: `describe.sequential` 로 `LogItem DELETE` describe 를 직렬화 — shuffle 순서 영향 차단. 장점: 의미 명확. 단점: vitest 현 버전의 `describe.sequential` API 지원 여부 선결 확인 필요, 부분 shuffle 로 일관성 저하.
  - **B3**: `useMockServer` 의 `server.listen` 을 `beforeAll` 로 승격 (현 `beforeEach` → `beforeAll` + request handler reset 전략) — MSW listen 지연 제거. 장점: root cause 에 접근. 단점: `src/test-utils/msw.js:45-59` 수명주기 변경이 다른 test 파일에 영향 가능 — 전체 회귀 실측 필수.
  - **B4**: `describe.configure({ shuffle: false })` 로 특정 describe shuffle 제외 — 최후 수단. 장점: 최소 침습. 단점: shuffle 격리 의도와 상충, 숨은 의존 은폐 위험.
- **FR-12 (Must, REQ-010) — Layer 2 후보 B5 (런타임, 조건부) 열거 및 rationale 충돌 판정**: `src/Log/hooks/useDeleteLog.js:22-38` mutationFn 에 `await Promise.resolve()` 선행 microtask 를 검토 대상으로 §대안 에 박제. 기존 rationale ("runtime 소스 변경 금지") 과의 충돌은 **조건부 허용** — B1~B4 전부 seed 0 fail 달성 실패 시에 한해 확장 허용. 확장 허용 조건: (1) B1~B4 의 실측 결과 result.md 박제, (2) 확장 근거(defensive microtask 가 단일 경로로 설명 가능함) spec 에 1문단 박제, (3) 수정 파일 수 ≤ 3 (NFR-04 준수).
- **FR-13 (Must, REQ-010) — 1차 추천안 + fallback 순서 확정**: §동작 에 1차 추천안 = **B1 (warm-up `beforeAll` empty render prime)** 확정 — 사유: 수정 파일 수 최소 (LogItem.test.jsx 1건), `useMockServer` 수명주기 불변 (다른 test 파일 영향 0), semantic 은 "concurrent scheduler warm-up" 으로 주석 박제 시 충분. 2차 fallback = **B3 (msw listen beforeAll 승격)**, 3차 fallback = **B2 (describe.sequential)**, 4차 = **B4 (describe shuffle:false)**, 5차 (최후) = **B5 (runtime microtask, 조건부)**. 각 단계 실측 결과 seed=1/2/3 0 fail 달성 시 상위 단계 선택 종결.
- **FR-14 (Should, REQ-010) — [deferred] 태깅 전환 지침**: 현 spec §테스트 현황 의 `[deferred: TSK-20260421-49 blocked]` 태깅은 본 spec 확장 반영 후 planner 재carve 시점에 **[pending: Layer 2 신규 TSK-ID 발행]** 으로 전환. 본 spec 자체는 태깅 전환을 수행하지 않음 (carve 시점에 planner 가 갱신).
- **FR-15 (Could, REQ-010) — 신규 Task ID 발행 지침**: 후속 Task 는 `TSK-YYYYMMDD-NN` 신규 ID 로 발행. TSK-20260421-49 는 historical artefact 참조만 (`supersedes: TSK-20260421-49` 메타 선택적). TSK-49 원본 복귀는 RULE-05 운영자 관할 — 본 spec 범위 외.

## 동작
1. (FR-01, FR-05) Layer 1 옵션 A 채택 근거 박제 — React 19 concurrent initial commit 은 RootNode 마운트 → commit flush 가 microtask / scheduled task 로 분할되어 즉시 queryable 하지 않음. `getBy*` 는 1회 sync 조회 후 실패 throw. `findBy*` 는 default 1000ms polling → mount 완료 대기.
2. (FR-02) `src/Log/LogItem.test.jsx` 에서 `:205, :260, :316, :377` 의 `screen.getByTestId("delete-button")` 4건을 `await screen.findByTestId("delete-button")` 로 교체.
3. (FR-03, 대안 검토) Layer 1 옵션 B 를 §대안 서술만 유지.
4. (FR-04, 조건부) TSK-20260421-47 완료 확인 — `ASYNC_ASSERTION_TIMEOUT_MS` 는 이미 `src/test-utils/timing.js` 에서 export. 옵션 C 선결 의존 조건 **충족**.
5. (FR-06) `src/test-utils/msw.test.js:29, 37, 57` sibling-it 의존 어서트 재작성.
6. (FR-07) `src/File/File.test.jsx` 의 `prodServerHasNoData` describe 의 `findByText("Drop files here!")` 호출에 `{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }` options 인자 추가 또는 `queryClient.clear()` 훅 도입.
7. (FR-08) Layer 1 수정 후 실측:
   - `npm test -- --run` → 0 fail (serial baseline).
   - `vitest run --sequence.shuffle --sequence.seed=1` → 0 fail.
   - `vitest run --sequence.shuffle --sequence.seed=2` → 0 fail.
   - `vitest run --sequence.shuffle --sequence.seed=3` → 0 fail.
   결과 수치(files / tests) result.md 에 박제.
8. (FR-11, FR-13) **Layer 2 1차 추천안 B1 (warm-up render prime) 적용 절차**:
   - `src/Log/LogItem.test.jsx` 파일 최상단 `describe` 이전 (또는 파일-level) 에 `beforeAll(async () => { const { unmount } = render(<div data-testid="warm-up" />); await Promise.resolve(); unmount(); })` 추가.
   - 주석 박제: `// Warm React 19 concurrent scheduler for first-in-file cold-start mutation flush (REQ-20260421-010, Layer 2 B1).`
   - 실측: `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail 확인. 달성 실패 시 B3(2차) fallback.
9. (FR-11, FR-13) **Layer 2 2차 fallback B3 (msw listen beforeAll 승격) 절차**:
   - `src/test-utils/msw.js:45-59` 의 `useMockServer` beforeEach `server.listen` 을 module-level `beforeAll` 로 승격 + `afterEach(() => server.resetHandlers())` 유지.
   - 전체 test 회귀 (serial + shuffle 3 seed) 실측 필수 — 다른 test 파일(File.test.jsx, Comment.test.jsx, etc.) 의 useMockServer 호출 부작용 0 확인.
   - 실패 시 B2 fallback.
10. (FR-11) B2/B4 는 §대안 보존만 수행, 채택은 상위 단계 실패 시.
11. (FR-12) **B5 (runtime microtask) 확장 허용 조건**: B1~B4 전부 seed 0 fail 달성 실패 시에 한해, `src/Log/hooks/useDeleteLog.js:22-38` mutationFn 최상단에 `await Promise.resolve();` 추가. 단, (1) B1~B4 실측 결과 result.md 박제, (2) "runtime 소스 변경 금지" 기존 rationale 예외 승인 근거(B5 가 defensive microtask 로 단일 경로 설명 가능) spec 1문단 박제, (3) NFR-04 수정 파일 ≤ 3 준수.
12. (FR-09, FR-10) TSK-45 historical 마킹 및 본 spec 경로 고정.
13. (FR-14, FR-15) [deferred] 태깅 전환 및 신규 Task ID 발행은 planner/operator 영역.

### 대안 (§Layer 1 옵션 B, Layer 2 후보 B1~B5)
- **Layer 1 옵션 B (대안)**: 파일-level `useFakeTimers` — FR-03 참조. 옵션 A 가 실측 insufficient 일 때 채택.
- **Layer 2 B1 — warm-up empty render prime**: 1차 추천안. 수정 파일 1 (`LogItem.test.jsx`). Semantic 주석으로 보강.
- **Layer 2 B2 — describe.sequential**: vitest API 지원 선결 확인 필요. 부분 shuffle 로 일관성 저하 위험.
- **Layer 2 B3 — msw listen beforeAll 승격**: root cause 접근. `src/test-utils/msw.js` 수명주기 변경이 전역 영향.
- **Layer 2 B4 — describe shuffle:false**: 최후 테스트층 수단. shuffle 격리 의도와 상충.
- **Layer 2 B5 — runtime microtask (조건부)**: `src/Log/hooks/useDeleteLog.js:22-38` mutationFn 최상단 `await Promise.resolve()`. B1~B4 전원 실패 시에만 확장 허용 (FR-12).
- **Layer 1 conditional mount 옵션 (이전 blocked 서사)**: 폐기 — cold-start race 는 query 시점 문제이지 mount 조건 문제 아님.

### Baseline (2026-04-21, HEAD=fd38b44)
- `grep -n "getByTestId.*delete-button" src/Log/LogItem.test.jsx` → 4 hits at `:205, :260, :316, :377` (FR-02 대상 유지).
- `grep -n "findByTestId.*delete-button" src/Log/LogItem.test.jsx` → 0 hits (FR-02 후 4 hits 예상).
- `grep -n "useMockServer\|fakeServer.close" src/test-utils/msw.test.js` → (스냅샷) `:29, :37, :57` 주변 sibling-it 의존 (FR-06 대상).
- `grep -n "findByText.*Drop files here" src/File/File.test.jsx` → 1 hit (FR-07 대상).
- `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → ≥1 hit (TSK-47 재도입 확인 — 옵션 C/FR-07 옵션 2 선결 충족).
- `grep -n "vi.useFakeTimers\|vi.useRealTimers" src/Log/LogItem.test.jsx` → (스냅샷) 0 hits (옵션 B 선택 시 +2 hits).
- `grep -n "beforeAll.*render" src/Log/LogItem.test.jsx` → 0 hits (B1 채택 시 +1 hits).
- `grep -n "server.listen" src/test-utils/msw.js` → 현재 `beforeEach` 내 (스냅샷 `:45-59`). B3 채택 시 `beforeAll` 로 이동.
- `grep -n "await Promise.resolve" src/Log/hooks/useDeleteLog.js` → 0 hits (B5 채택 시 +1 hits, 조건부).

## 의존성
- 내부: `src/Log/LogItem.test.jsx` (FR-02/03/B1 대상), `src/test-utils/msw.js` (`useMockServer` — B3 후보, 기본 불변), `src/test-utils/msw.test.js` (FR-06 대상), `src/File/File.test.jsx` (FR-07 대상), `src/test-utils/timing.js` (`ASYNC_ASSERTION_TIMEOUT_MS` 재사용), `src/setupTests.js` (불변), `src/Log/hooks/useDeleteLog.js` (B5 조건부, 기본 불변), `src/Log/api.mock.js` (`devServerFailed`, `devServerNetworkError` handler 불변 — 정상 확인).
- 외부: `vitest` (`vi.useFakeTimers`, `vi.useRealTimers`, `describe.sequential` — B2 조건부, `beforeAll` — B1/B3), `@testing-library/react` (`findByTestId`, `findByText` options, `render`, `cleanup` — B1).
- 역의존: REQ-20260421-008 (`File.test.jsx` 시나리오 분할) — FR-07 의 `prodServerHasNoData` describe 가 REQ-008 의 out-of-scope. TSK-20260421-45 (blocked, α-가설) — historical 참조만. TSK-20260421-47 (react-19-findby-β, done) — `ASYNC_ASSERTION_TIMEOUT_MS` 재도입 선결 의존 충족. TSK-20260421-49 (blocked) — Layer 1 적용 historical artefact, REQ-010 기반 신규 Task 가 supersede.

## 테스트 현황
- [x] 현 HEAD `npm test` (serial) → 0 fail (fd38b44).
- [x] shuffle seed=1/2/3 에서 cold-start race 재현 (Layer 1 + Layer 2 — HEAD=4bd67ef/ea9d30c 실측 박제).
- [ ] FR-02 옵션 A 적용 후 LogItem Layer 1 cold-start race 해소. **[deferred: TSK-20260421-49 blocked — Layer 1 옵션 A 적용 완료했으나 Layer 2 race 로 seed=1 1건 잔존; 50.blocked/task/TSK-20260421-49 _reason.md 참조]**
- [ ] FR-06 msw.test.js sibling-it 독립. **[deferred: TSK-49 blocked; Layer 2 해소 후 재시도 권장]**
- [ ] FR-07 File.test.jsx cache race 해소. **[deferred: TSK-49 blocked]**
- [ ] FR-08 `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail. **[deferred: TSK-49 blocked — Layer 2 race 미해소]**
- [ ] FR-11 Layer 2 후보 B1~B4 열거. **[pending: Layer 2 신규 TSK-ID 발행 시 B1~B4 실측 수행]**
- [ ] FR-12 Layer 2 후보 B5 조건부 확장 판정. **[pending: B1~B4 실측 결과 의존]**
- [ ] FR-13 1차 추천안 B1 실측 seed=1/2/3 0 fail. **[pending: Layer 2 신규 TSK-ID 발행 후 실측]**
- [ ] `npm run lint` 0 warn/error.

## 수용 기준
- [ ] (Must) FR-01 — spec §역할 / §동작 에 Layer 1 / Layer 2 구분 서사 박제.
- [x] (Must) FR-02 — `src/Log/LogItem.test.jsx` 의 `getByTestId("delete-button")` 4건이 `findByTestId(...)` 로 전환됨. (2026-04-21, TSK-20260421-51 / commit d798635 — `getBy*` 0 hits, `await screen.findByTestId("delete-button")` 4 hits at :207/:262/:318/:379 재실측 PASS)
- [ ] (Must) FR-05 — 옵션 A 채택 근거가 1~2문장으로 박제됨.
- [ ] (Must) FR-06 — `src/test-utils/msw.test.js:29, 37, 57` sibling-it 의존 제거 (3안 중 1안).
- [ ] (Must) FR-07 — `src/File/File.test.jsx` `prodServerHasNoData` describe cache race 해소 (2안 중 1안).
- [ ] (Must) FR-08 — `vitest run --sequence.shuffle --sequence.seed=1`, `seed=2`, `seed=3` 3회 0 fail 결과 박제.
- [ ] (Must) FR-11 — §대안 섹션에 Layer 2 후보 B1~B4 가 각 1~2문장 판정 근거와 함께 열거됨.
- [ ] (Must) FR-12 — B5 (runtime microtask) 가 §대안 에 조건부 허용 근거와 함께 열거됨, 확장 허용 조건 (B1~B4 전원 실패 + 수정 파일 ≤ 3 + 근거 1문단) 박제.
- [ ] (Must) FR-13 — §동작 에 1차 추천안 B1 + fallback 순서(B3→B2→B4→B5) 확정.
- [ ] (Must) `npm test -- --run` → 0 fail 유지 (NFR-02).
- [ ] (Should) FR-03 — Layer 1 옵션 B §대안 서술 박제.
- [ ] (Should) FR-09 — TSK-20260421-45 historical artefact 표기.
- [ ] (Should) FR-14 — [deferred] → [pending: Layer 2 신규 TSK-ID] 전환 지침 박제 (planner 수행).
- [ ] (Could) FR-04 — Layer 1 옵션 C 조건부 채택 시 TSK-47 선결 의존 명시 (현재 충족).
- [ ] (Could) FR-15 — 신규 Task ID 발행 지침 + TSK-49 supersede 메타 선택성 박제.
- [ ] (NFR) NFR-04 수정 파일 ≤ 2 (테스트층 선호). B5 채택 시 ≤ 3 + runtime 변경 근거 박제. runtime 소스(`src/Log/LogItem.jsx`, `src/File/File.jsx`) 0 변경 (B5 제외).
- [ ] (NFR) NFR-06 관측성 — 본 spec 변경 이력에 REQ-20260421-010 및 followup 원본 경로 참조.

## 스코프 규칙
- **expansion**: 조건부 (Layer 2 B5 채택 시에만 runtime `src/Log/hooks/useDeleteLog.js` 확장 허용; 그 외 불허)
- **grep-baseline** (2026-04-21, HEAD=fd38b44):
  - `grep -n "getByTestId.*delete-button" src/Log/LogItem.test.jsx` → 4 hits at `:205, :260, :316, :377` (FR-02 후 0 hits).
  - `grep -n "findByTestId.*delete-button" src/Log/LogItem.test.jsx` → 0 hits (FR-02 후 4 hits).
  - `grep -n "findByText.*Drop files here" src/File/File.test.jsx` → 1 hit (FR-07 옵션 2 후 timeout options 포함).
  - `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → ≥1 hit (TSK-47 재도입 확인).
  - `grep -rn "vi.spyOn\|vi.restoreAllMocks" src/Log/LogItem.test.jsx` → α-가설 baseline (참조만).
  - `grep -n "beforeAll" src/Log/LogItem.test.jsx` → 0 hits (B1 채택 시 +1 hits).
  - `grep -n "await Promise.resolve" src/Log/hooks/useDeleteLog.js` → 0 hits (B5 채택 시 +1 hits, 조건부).
- **rationale**: 런타임 소스(`src/**/*.{js,jsx}` 중 `*.test.*` 제외) 는 기본적으로 본 spec 수정 범위 밖 — cold-start Layer 1 은 테스트 쪽 query 전략에서 해결, Layer 2 는 테스트층 B1~B4 를 1순위로 시도. B5 (runtime microtask) 는 B1~B4 전원 실패 시에만 조건부 확장 허용 (FR-12). `vite.config.js` 의 `sequence.shuffle` 설정 변경 금지. TSK-20260421-45 원본 복귀/재활용은 RULE-05 운영자 관할. 이전 blocked spec(`test-isolation-shuffle-safety-spec.md`) 은 운영자 정리 대상 — 본 파일명에 `-cold-start` suffix 로 충돌 회피.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-007 반영; α-가설 폐기, cold-start race 서사로 전면 재작성, 옵션 A(sync→async query 전환) 채택, 이전 blocked spec 은 운영자 정리 대상) | all |
| 2026-04-21 | inspector / — (drift reconcile) | TSK-20260421-49 blocked 관측 (HEAD=ea9d30c). developer 실측으로 옵션 A/B/C 조합 적용 후에도 shuffle seed=1 `LogItem DELETE network-error` 1건 (`findByText("Deleting log network error.")` 5062ms timeout) 잔존 — **Layer 2 (mutation fetch → onError → setState → rerender) race** 가 cold-start race 와 별개로 존재. 본 spec 의 β-가설(sync query cold-start) 은 Layer 1 만 설명. 운영자 해제 시 spec 재개정 (Layer 2 서사 추가, 해결 후보 B1~B4 열거) 필요 — `50.blocked/task/TSK-20260421-49-test-isolation-shuffle-safety-cold-start_reason.md` 참조. FR-02/06/07/08 deferred 태깅. ack 0/5 (테스트 현황). | 테스트 현황, 변경 이력 |
| 2026-04-21 | inspector / — (REQ-20260421-010 반영) | Layer 1 / Layer 2 구분 서사로 확장. §역할·§동작·§공개 인터페이스 에 Layer 2 (mutation + msw listen + React 19 concurrent first-in-file flush) 근거 박제 (HEAD=fd38b44). FR-11~15 추가 — B1~B4 (테스트층) + B5 (런타임층, 조건부) 후보 열거, 1차 추천안 B1 (warm-up empty render prime) + fallback 순서 (B3→B2→B4→B5) 확정. `src/Log/hooks/useDeleteLog.js:22-38` 확장 조건부 허용 rationale 박제. followup 원본: `specs/60.done/2026/04/21/followups/20260420-2224-logitem-delete-mutation-cold-start-layer2.md`. | 역할, 동작, 공개 인터페이스, 대안, Baseline, 의존성, 테스트 현황, 수용 기준, 스코프 규칙, 변경 이력 |
| 2026-04-21 | TSK-20260421-51 / d798635 (drift reconcile ack) | FR-02 수용 기준 PASS — `src/Log/LogItem.test.jsx` 의 `getByTestId("delete-button")` 4건 → `await screen.findByTestId("delete-button")` 로 전환 완료. HEAD=d798635 재실측: `getBy*` 0 hits, `findByTestId(...)` 4 hits at :207/:262/:318/:379, `await screen.findByTestId(...)` 4 hits (await 누락 없음). hook-ack: `npm run lint` 0 warn/error, `npm test -- --run` 47 files / 377 tests pass (회귀 0, coverage 97.54% stmts 유지), `npm run build` OK. Layer 1 cold-start `Unable to find [data-testid="delete-button"]` 는 seed 1/2/3 전원 소거됨. Layer 2 (seed=1 `findByText("Deleting log network error.")` timeout) 는 TSK-20260421-52 (ready queue) 로 이관. `## 테스트 현황` 의 FR-02 체크는 "TSK-49 blocked" 호환 마커로 혼재 — `애매하면 marker 유지` 방침 적용, planner 재carve 시 FR-14 에 따라 전환. | 수용 기준, 변경 이력 |
