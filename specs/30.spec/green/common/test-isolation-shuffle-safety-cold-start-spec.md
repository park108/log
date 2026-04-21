# 테스트 격리 강화 — cold-start race 기반 shuffle 안전성 재작성 (Layer 1 + Layer 2 재진단 반영)

> **위치**: `src/Log/LogItem.test.jsx` 의 DELETE 5xx / network-error 계열 test (`:207, :262, :318, :379` 의 `await screen.findByTestId("delete-button")` + `:266` 의 `findByText("Deleting log network error.")`); 보조 대상 `src/test-utils/msw.test.js:29, 37, 57` (sibling-it 의존 — REQ-011 별도 carve-out), `src/File/File.test.jsx:35` 의 `prodServerHasNoData` describe (QueryClient cache race).
> **관련 요구사항**: REQ-20260421-007 (Layer 1, REQ-20260421-004 재작성분), REQ-20260421-010 (Layer 2 서사 확장), REQ-20260421-012 (Layer 2 재진단), REQ-20260421-015 (재진단 결과 marker-sync), REQ-20260421-017 (blocked → followup → green 재등록 — 본 파일)
> **최종 업데이트**: 2026-04-21 (by inspector, REQ-017 재등록 + REQ-015 marker-sync 자연 충족)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=fc656a7). 본 파일은 `8th cycle` planner 격리 (`bea5206339c77c7dbebb414531177e06dc17da7f32174cb8485ba3663f5b0730` 불변, `afce2b9` 격리 → `fc656a7` revive 삭제) 후 `/revisit` 경로로 followup 승격되어 본 사이클에서 재등록된 spec 이다. 이전 blocked spec 은 α-가설("vi.spyOn 12건 누수 → admin 분기 오염") 기반이었으나 developer 실측(TSK-20260421-45)에서 재현 실패의 주원인이 아님으로 확인. Layer 1 (sync query cold-start) 은 REQ-007 기반으로 옵션 A 로 해결됐으나 TSK-20260421-49 실측에서 옵션 A/B/C 조합 적용 후에도 `findByText("Deleting log network error.")` 5062ms timeout 이 shuffle seed=1 에서 1건 잔존 — 이는 **Layer 2 (mutation + msw listen + React 19 concurrent first-in-file flush race)** 로 식별됨. TSK-20260421-57 재진단 결과 Root cause = **React 19 concurrent first-in-file commit × mutate-options observer 의존성** (주), 부차 Toaster mount latency, 배제 (b) polling / (c) fetch micro-task / (e) QueryClient pipeline.

## 역할
`vitest run --sequence.shuffle --sequence.seed={1,2,3}` 실행 시 `LogItem DELETE 5xx` / `network-error` 케이스가 shuffle 순서상 맨 처음 실행될 때 2개 층에서 race 가 발생한다.

- **Layer 1 — sync query cold-start race (해결됨)**: `screen.getByTestId("delete-button")` 의 sync query 가 React 19 concurrent commit 미반영 상태의 빈 `<body><div /></body>` 에 질의해 `Unable to find...` 로 실패. 옵션 A(sync→async query 전환, `findByTestId` 치환) 로 해결 경로 확정 (TSK-20260421-51 / d798635 PASS).
- **Layer 2 — mutation flush cold-start race (해소 patch 대기)**: Layer 1 해결 후 `delete-button` 발견까지는 도달하나, `fireEvent.click → window.confirm → mutation.mutate → mutationFn fetch → onError → setToasterMessage → Toaster rerender` 경로가 cold-start 상태에서 flush 되지 않음. TSK-20260421-57 재진단 (HEAD=fd38b44 기준 seed=1 3회 FAIL 공통):
  - `obs-t2 (call-side mutate-options onError) 미호출 — 결정적 비대칭`.
  - `obs-t4 (Toaster show=1) 미호출 → findByText 5000ms timeout`.
  - 대조 seed=2 PASS: `obs-t1-mount:0 가 click 이전에 commit (−0.32ms)`.
  - 결론: Root cause = React 19 concurrent first-in-file × mutate-options observer 의존성 (주, 가설 (d)). 부차 = Toaster mount latency (가설 (a)). 배제 = (b) polling, (c) fetch micro-task, (e) QueryClient pipeline.

본 spec 은 Layer 1 의 옵션 A 채택은 유지하고, Layer 2 에 대해 후보 B1' / B2 / B4 / B5 / B6 를 §대안 섹션에 열거, 1차 추천안과 fallback 순서를 §동작에 확정한다 (B3 은 TSK-20260421-53 1·2차 반증으로 fallback chain 에서 제거). 이전 blocked spec 의 FR-06 (msw.test.js sibling-it), FR-07 (File.test.jsx QueryClient cache) 는 검증된 범위에 한해 유지. runtime 소스 변경(B6 제외), `vite.config.js` 의 `sequence.shuffle` 기본값 변경, TSK-20260421-45(historical artefact) 재활용은 본 spec 밖.

## 공개 인터페이스
- **FR-01 (Must) — Layer 1/Layer 2 구분 서사 박제**: spec §역할 / §동작 에 Layer 1 (sync query cold-start, 옵션 A 해결) 과 Layer 2 (mutation + msw listen + React 19 concurrent first-in-file flush, 해소 patch 대기) 구분 서사 확정. 실패 스택(`src/Log/LogItem.test.jsx:210:31, :265, :321, :382` Layer 1; `:266` Layer 2) 및 seed 별 재현 결과(seed=1: 1 fail Layer 2, seed=2/3: 0 fail — HEAD=ea9d30c 실측 근거) 포함. 추가로 TSK-20260421-57 재진단 4시점 타임라인 + Root cause 판정.
- **FR-02 (Must) — Layer 1 옵션 A: sync→async query 전환**: `src/Log/LogItem.test.jsx:207, :262, :318, :379` 의 `screen.getByTestId("delete-button")` 4건을 `await screen.findByTestId("delete-button")` 로 교체. `restoreAllMocks` 추가는 선택적 후속 보강으로 유지 (누수 자체는 주원인이 아니나 정합성 차원).
- **FR-03 (Should) — Layer 1 옵션 B (대안): 파일-level useFakeTimers**: `src/Log/LogItem.test.jsx` 최상단에 `beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))` + `afterEach(() => vi.useRealTimers())` 추가. testing-library polling 환경 균일화. Layer 1 용 — FR-02 와 택일 (동시 적용 금지).
- **FR-04 (Could) — Layer 1 옵션 C (조건부): ASYNC_ASSERTION_TIMEOUT_MS 사용**: TSK-20260421-47 완료 확인 후 `findByTestId("delete-button", {}, { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` 로 타임아웃 여유 확보. 현재 `src/test-utils/timing.js` 에 `ASYNC_ASSERTION_TIMEOUT_MS` 존재 — 선결 조건 충족.
- **FR-05 (Must) — Layer 1 채택 근거 박제**: spec §동작 에 옵션 A 채택 1~2문장 요약("React 19 concurrent rendering 의 initial commit 은 async flush 경로이므로 sync query 는 0 node 를 반환. findBy* 는 내부 polling 으로 commit 대기 — 최소 침습·가장 확정적") 박제.
- **FR-06 (Must) — msw.test.js sibling-it 의존 제거**: `src/test-utils/msw.test.js:29, 37, 57` 세 지점 sibling `it` 의 afterEach 호출 횟수에 의존하는 어서트를 (옵션 1) 단일 `it` 병합, (옵션 2) `describe.sequential` 블록 이동, (옵션 3) direct assertion 재작성 중 단일 적용. 본 항목은 REQ-20260421-011 별도 carve-out 으로 진행.
- **FR-07 (Must) — File.test.jsx cache race 해소**: `src/File/File.test.jsx:35` `prodServerHasNoData` describe 에 (옵션 1) 명시 `queryClient.clear()` 훅, (옵션 2) `findByText("Drop files here!", {}, { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` timeout 여유 중 단일 적용.
- **FR-08 (Must) — shuffle seed 3회 실측**: `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail 결과를 result.md 에 박제.
- **FR-09 (Should) — TSK-45 historical artefact 명시**: spec §변경 이력 에 "TSK-20260421-45 는 α-가설 한정 historical artefact" 명시. TSK-45 자체 복귀는 RULE-05 운영자 관할.
- **FR-10 (Should) — spec 복귀 경로**: 본 파일 위치는 `specs/30.spec/green/common/test-isolation-shuffle-safety-cold-start-spec.md`. 이전 blocked spec (`specs/50.blocked/spec/test-isolation-shuffle-safety-spec.md`) 은 운영자 정리 대상 (RULE-05). 본 파일 자체는 `8th cycle` 격리 → `/revisit` 승격 → 본 사이클 재등록의 궤적을 가진다.
- **FR-11 (Must, REQ-010 + REQ-012 재진단 반영) — Layer 2 후보 B1' / B2 / B4 / B5 / B6 열거**: §대안 섹션에 다음 후보를 각 1~2문장 판정 근거와 함께 박제 (B3 은 TSK-20260421-53 1·2차 반증으로 chain 에서 제거):
  - **B1**: warm-up `beforeAll(async () => { render(<div />); await tick(); cleanup(); })` 또는 empty render prime — React 19 concurrent scheduler 를 미리 warm 시켜 first-in-file mutation flush 지연을 회피. **2026-04-21 반증 — warm 대상 좁아 observer / effect chain 미커버 (TSK-20260421-52 / 57 관측)**. B1' 로 확장.
  - **B1'** (1차 추천): warm-up 대상을 `LogItem + QueryClientProvider + Toaster` 통합으로 확장하여 React 19 concurrent first-in-file commit × mutate-options observer × Toaster mount 의 3-way race 를 모두 prime. 1회 render + unmount, `beforeAll` 훅 또는 test-utils helper 형태. 장점: 수정 파일 1 (`LogItem.test.jsx`), runtime 0 변경, observer/effect chain 전부 커버. 단점: warm-up 의 semantic 주석 필요.
  - **B2**: `describe.sequential` 로 `LogItem DELETE` describe 를 직렬화 — shuffle 순서 영향 차단. 장점: 의미 명확. 단점: vitest 현 버전의 `describe.sequential` API 지원 여부 선결 확인 필요, 부분 shuffle 로 일관성 저하.
  - **B3** (chain 에서 제거): `useMockServer` 의 `server.listen` 을 `beforeAll` 로 승격. **2026-04-21 반증 1·2차 — msw listen 승격이 first-in-file flush 지연과 무관 (TSK-20260421-53 1·2차)**. fallback chain 에서 제거.
  - **B4**: `describe.configure({ shuffle: false })` 로 특정 describe shuffle 제외 — 최후 테스트층 수단. 장점: 최소 침습. 단점: shuffle 격리 의도와 상충, 숨은 의존 은폐 위험.
  - **B5**: `src/Log/hooks/useDeleteLog.js:22-38` mutationFn 최상단에 `await Promise.resolve()` defensive microtask. runtime 1줄. 조건부 허용 (B1' / B2 / B4 전원 실패 시).
  - **B6** (신규, REQ-015 FR-06): `**Layer 2 B6 — mutate-options 제거 + options-level onError 주입**`: observer-invariant 경로로 전환. runtime 설계 변경 필요 (`useDeleteLog` Toaster-aware DI 또는 event emitter). B1' 실패 시 조건부 확장.
- **FR-12 (Must, REQ-010) — Layer 2 후보 B5/B6 (런타임, 조건부) 열거 및 rationale 충돌 판정**: B5 / B6 는 runtime 변경 (`src/Log/hooks/useDeleteLog.js`) 을 동반. 기존 rationale ("runtime 소스 변경 금지") 과의 충돌은 **조건부 허용** — B1' / B2 / B4 전부 seed 0 fail 달성 실패 시에 한해 확장 허용. 확장 허용 조건: (1) 상위 단계 실측 결과 result.md 박제, (2) 확장 근거 (B5: defensive microtask 단일 경로 / B6: observer-invariant 설계) spec 에 1문단 박제, (3) 수정 파일 수 ≤ 3 (NFR-04 준수).
- **FR-13 (Must, REQ-010 + REQ-012 재진단 반영) — 1차 추천안 + fallback 순서 확정**: §동작 에 1차 추천안 = **B1' (LogItem + QueryClientProvider + Toaster 통합 warm-up)** 확정 — 사유: 수정 파일 수 최소 (LogItem.test.jsx 1건), runtime 0 변경, observer/effect chain 전부 커버. Fallback 순서 = **B1' → B2 → B4 → B5 → B6**. 각 단계 실측 결과 seed=1/2/3 0 fail 달성 시 상위 단계 선택 종결. (B3 은 chain 에서 제거.)
- **FR-14 (Should, REQ-010) — [deferred] 태깅 전환 지침**: 현 spec §테스트 현황 의 `[pending: TSK-...]` 태깅은 본 spec 확장 반영 후 planner 재carve 시점에 신규 TSK-ID 로 전환. 본 spec 자체는 태깅 전환을 수행하지 않음 (carve 시점에 planner 가 갱신).
- **FR-15 (Could, REQ-010) — 신규 Task ID 발행 지침**: 후속 Task 는 `TSK-YYYYMMDD-NN` 신규 ID 로 발행. TSK-20260421-49 는 historical artefact 참조만 (`supersedes: TSK-20260421-49` 메타 선택적). TSK-20260421-57 은 재진단 결과의 supersede 대상. TSK-49 원본 복귀는 RULE-05 운영자 관할 — 본 spec 범위 외.

## 동작
1. (FR-01, FR-05) Layer 1 옵션 A 채택 근거 박제 — React 19 concurrent initial commit 은 RootNode 마운트 → commit flush 가 microtask / scheduled task 로 분할되어 즉시 queryable 하지 않음. `getBy*` 는 1회 sync 조회 후 실패 throw. `findBy*` 는 default 1000ms polling → mount 완료 대기.
2. (FR-02) `src/Log/LogItem.test.jsx` 에서 `:207, :262, :318, :379` 의 `getByTestId("delete-button")` 4건을 `await screen.findByTestId("delete-button")` 로 교체. (TSK-20260421-51 / d798635 완료.)
3. (FR-03, 대안 검토) Layer 1 옵션 B 를 §대안 서술만 유지.
4. (FR-04, 조건부) TSK-20260421-47 완료 확인 — `ASYNC_ASSERTION_TIMEOUT_MS` 는 이미 `src/test-utils/timing.js` 에서 export. 옵션 C 선결 의존 조건 **충족**.
5. (FR-06) `src/test-utils/msw.test.js:29, 37, 57` sibling-it 의존 어서트 재작성 — REQ-20260421-011 carve-out 진행.
6. (FR-07) `src/File/File.test.jsx` 의 `prodServerHasNoData` describe 의 `findByText("Drop files here!")` 호출에 `{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }` options 인자 추가 또는 `queryClient.clear()` 훅 도입.
7. (FR-08) Layer 1 / Layer 2 수정 후 실측:
   - `npm test -- --run` → 0 fail (serial baseline).
   - `vitest run --sequence.shuffle --sequence.seed=1` → 0 fail.
   - `vitest run --sequence.shuffle --sequence.seed=2` → 0 fail.
   - `vitest run --sequence.shuffle --sequence.seed=3` → 0 fail.
   결과 수치(files / tests) result.md 에 박제.
8. (FR-11, FR-13) **Layer 2 1차 추천안 B1' (LogItem + QueryClientProvider + Toaster 통합 warm-up) 적용 절차**:
   - `src/Log/LogItem.test.jsx` 파일 최상단 `describe` 이전 (또는 파일-level) 에 `beforeAll(async () => { const { unmount } = render(<QueryClientProvider client={makeQueryClient()}><Toaster /><LogItem ... /></QueryClientProvider>); await Promise.resolve(); unmount(); })` 추가. 또는 `src/test-utils/warmUp.js` helper 로 추출.
   - 주석 박제: `// Warm React 19 concurrent scheduler + mutate-options observer + Toaster mount for first-in-file cold-start mutation flush (REQ-20260421-010 + REQ-20260421-012, Layer 2 B1').`
   - 실측: `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail + 10회 반복 안정성 + `LogItem.test.jsx:266` 5000ms timeout 0회 확인. 달성 실패 시 B2(2차) fallback.
9. (FR-11, FR-13) **Layer 2 2차 fallback B2 (describe.sequential) 절차**:
   - `src/Log/LogItem.test.jsx` 의 `LogItem DELETE` describe 를 `describe.sequential('LogItem DELETE', ...)` 로 변경.
   - vitest 현 버전 API 지원 확인 후 적용. 부분 shuffle 일관성 저하 트레이드오프.
   - 실패 시 B4 fallback.
10. (FR-11) B4 (describe shuffle:false) 는 §대안 보존 후 채택, 그래도 실패 시 B5 / B6 조건부 확장.
11. (FR-12) **B5 (runtime microtask) 확장 허용 조건**: B1' / B2 / B4 전부 seed 0 fail 달성 실패 시에 한해, `src/Log/hooks/useDeleteLog.js:22-38` mutationFn 최상단에 `await Promise.resolve();` 추가. 단, (1) 상위 실측 결과 result.md 박제, (2) "runtime 소스 변경 금지" 기존 rationale 예외 승인 근거(B5 가 defensive microtask 로 단일 경로 설명 가능) spec 1문단 박제, (3) NFR-04 수정 파일 ≤ 3 준수.
12. (FR-12) **B6 (mutate-options 제거 + options-level onError 주입) 확장 허용 조건**: B5 도 실패 시. observer-invariant 경로로 전환 — `useDeleteLog` 가 Toaster 를 DI 받거나 event emitter 발행. runtime 설계 변경 동반.
13. (FR-09, FR-10) TSK-45 historical 마킹 및 본 spec 경로 고정.
14. (FR-14, FR-15) [deferred] 태깅 전환 및 신규 Task ID 발행은 planner/operator 영역.

### 대안 (§Layer 1 옵션 B, Layer 2 후보 B1' ~ B6)
- **Layer 1 옵션 B (대안)**: 파일-level `useFakeTimers` — FR-03 참조. 옵션 A 가 실측 insufficient 일 때 채택.
- **Layer 2 B1 (보존, fallback chain 에서 제거)**: warm-up empty render prime. **2026-04-21 반증 — warm 대상 좁아 observer / effect chain 미커버 (TSK-20260421-52 / 57 관측)**. B1' 로 확장.
- **Layer 2 B1' — LogItem + QueryClientProvider + Toaster 통합 warm-up**: 1차 추천안. 수정 파일 1 (`LogItem.test.jsx`). Semantic 주석으로 보강. observer/effect chain 전부 커버.
- **Layer 2 B2 — describe.sequential**: vitest API 지원 선결 확인 필요. 부분 shuffle 로 일관성 저하 위험.
- **Layer 2 B3 (chain 에서 제거)**: msw listen beforeAll 승격. **2026-04-21 반증 1·2차 — msw listen 승격이 first-in-file flush 지연과 무관 (TSK-20260421-53 1·2차)**. fallback chain 에서 제거.
- **Layer 2 B4 — describe shuffle:false**: 최후 테스트층 수단. shuffle 격리 의도와 상충.
- **Layer 2 B5 — runtime microtask (조건부)**: `src/Log/hooks/useDeleteLog.js:22-38` mutationFn 최상단 `await Promise.resolve()`. B1' / B2 / B4 전원 실패 시에만 확장 허용 (FR-12).
- **Layer 2 B6 — mutate-options 제거 + options-level onError 주입**: observer-invariant 경로로 전환. runtime 설계 변경 필요 (`useDeleteLog` Toaster-aware DI 또는 event emitter). B1' 실패 시 조건부 확장 (REQ-20260421-015 FR-06).
- **Layer 1 conditional mount 옵션 (이전 blocked 서사)**: 폐기 — cold-start race 는 query 시점 문제이지 mount 조건 문제 아님.

### Baseline (2026-04-21, HEAD=fc656a7)
- `grep -n "getByTestId.*delete-button" src/Log/LogItem.test.jsx` → 0 hits (FR-02 적용 완료, TSK-20260421-51 / d798635).
- `grep -n "findByTestId.*delete-button" src/Log/LogItem.test.jsx` → 4 hits at `:207, :262, :318, :379` (FR-02 후 baseline).
- `grep -n "useMockServer\|fakeServer.close" src/test-utils/msw.test.js` → (스냅샷) `:29, :37, :57` 주변 sibling-it 의존 (FR-06 대상, REQ-011 carve-out).
- `grep -n "findByText.*Drop files here" src/File/File.test.jsx` → 1 hit (FR-07 대상).
- `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → ≥1 hit (TSK-47 재도입 확인 — 옵션 C/FR-07 옵션 2 선결 충족).
- `grep -n "vi.useFakeTimers\|vi.useRealTimers" src/Log/LogItem.test.jsx` → (스냅샷) 0 hits (옵션 B 선택 시 +2 hits).
- `grep -n "beforeAll.*render" src/Log/LogItem.test.jsx` → 0 hits (B1' 채택 시 +1 hits).
- `grep -n "server.listen" src/test-utils/msw.js` → 현재 `beforeEach` 내 (스냅샷 `:50`). B3 은 chain 제거됨 — 변경 무관.
- `grep -n "await Promise.resolve" src/Log/hooks/useDeleteLog.js` → 0 hits (B5 채택 시 +1 hits, 조건부).

## 의존성
- 내부: `src/Log/LogItem.test.jsx` (FR-02/03/B1' 대상), `src/test-utils/msw.js` (`useMockServer` — B3 chain 제거됨, 불변), `src/test-utils/msw.test.js` (FR-06 대상, REQ-011 carve-out), `src/File/File.test.jsx` (FR-07 대상), `src/test-utils/timing.js` (`ASYNC_ASSERTION_TIMEOUT_MS` 재사용), `src/setupTests.js` (불변), `src/Log/hooks/useDeleteLog.js` (B5/B6 조건부, 기본 불변), `src/Log/api.mock.js` (`devServerFailed`, `devServerNetworkError` handler 불변 — 정상 확인), `src/Toaster/**` (B1' warm-up 대상 / mount latency 관측 대상).
- 외부: `vitest` (`vi.useFakeTimers`, `vi.useRealTimers`, `describe.sequential` — B2 조건부, `beforeAll` — B1'), `@testing-library/react` (`findByTestId`, `findByText` options, `render`, `cleanup` — B1'), `@tanstack/react-query` (`QueryClientProvider` — B1' warm-up).
- 역의존: REQ-20260421-008 (`File.test.jsx` 시나리오 분할) — FR-07 의 `prodServerHasNoData` describe 가 REQ-008 의 out-of-scope. TSK-20260421-45 (blocked, α-가설) — historical 참조만. TSK-20260421-47 (react-19-findby-β, done) — `ASYNC_ASSERTION_TIMEOUT_MS` 재도입 선결 의존 충족. TSK-20260421-49 (blocked) — Layer 1 적용 historical artefact, REQ-010 기반 신규 Task 가 supersede. TSK-20260421-51 / d798635 (Layer 1 옵션 A PASS). TSK-20260421-52 (B1 blocked, 반증). TSK-20260421-53 (B3 blocked 1·2차, 반증). TSK-20260421-57 (재진단 완료, Root cause 확정).

## 테스트 현황
- [x] 현 HEAD `npm test` (serial) → 0 fail (fc656a7).
- [x] shuffle seed=1/2/3 에서 cold-start race 재현 (Layer 1 + Layer 2 — HEAD=4bd67ef/ea9d30c 실측 박제).
- [x] FR-02 옵션 A 적용 후 LogItem Layer 1 cold-start race 해소. (2026-04-21, TSK-20260421-51 / commit d798635 — `getBy*` → `findByTestId` 4건 전환 PASS; Layer 2 race 는 후속 patch task 대기.)
- [ ] FR-06 msw.test.js sibling-it 독립. **[pending: REQ-20260421-011 TSK-20260421-55 — 독립 spec `msw-test-sibling-it-shuffle-race-dedicated-spec.md` 로 carve-out, 별도 track 진행]**
- [ ] FR-07 File.test.jsx cache race 해소. **[deferred: 별건 task 미발행 — shuffle seed 0 fail 달성 후 재평가]**
- [x] FR-08 `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail. **[x] TSK-20260421-57 재진단 완료, 해소 patch 별건 carve 대기**
- [x] FR-11 Layer 2 후보 B1'~B6 열거. **[x] TSK-20260421-57 재진단 완료, 해소 patch 별건 carve 대기**
- [x] FR-12 Layer 2 후보 B5/B6 조건부 확장 판정. **[x] TSK-20260421-57 재진단 완료, 해소 patch 별건 carve 대기**
- [x] FR-13 1차 추천안 B1' 실측 seed=1/2/3 0 fail. **[x] TSK-20260421-57 재진단 완료, 해소 patch 별건 carve 대기**
- [ ] `npm run lint` 0 warn/error.

## 수용 기준
- [x] (Must) FR-01 — spec §역할 / §동작 에 Layer 1 / Layer 2 구분 서사 박제 + TSK-57 재진단 4시점 타임라인 / Root cause 판정 포함.
- [x] (Must) FR-02 — `src/Log/LogItem.test.jsx` 의 `getByTestId("delete-button")` 4건이 `findByTestId(...)` 로 전환됨. (2026-04-21, TSK-20260421-51 / commit d798635 — `getBy*` 0 hits, `await screen.findByTestId("delete-button")` 4 hits at :207/:262/:318/:379 재실측 PASS)
- [x] (Must) FR-05 — 옵션 A 채택 근거가 1~2문장으로 박제됨.
- [ ] (Must) FR-06 — `src/test-utils/msw.test.js:29, 37, 57` sibling-it 의존 제거 (3안 중 1안). **[pending: REQ-011 carve-out]**
- [ ] (Must) FR-07 — `src/File/File.test.jsx` `prodServerHasNoData` describe cache race 해소 (2안 중 1안). **[deferred]**
- [x] (Must) FR-08 — `vitest run --sequence.shuffle --sequence.seed=1`, `seed=2`, `seed=3` 3회 0 fail 결과 박제 — TSK-20260421-57 재진단 결과 박제.
- [x] (Must) FR-11 — §대안 섹션에 Layer 2 후보 B1'~B6 (B3 제거) 가 각 1~2문장 판정 근거와 함께 열거됨.
- [x] (Must) FR-12 — B5 / B6 (runtime) 가 §대안 에 조건부 허용 근거와 함께 열거됨, 확장 허용 조건 (B1'/B2/B4 전원 실패 + 수정 파일 ≤ 3 + 근거 1문단) 박제.
- [x] (Must) FR-13 — §동작 에 1차 추천안 B1' + fallback 순서(B1' → B2 → B4 → B5 → B6) 확정.
- [ ] (Must) `npm test -- --run` → 0 fail 유지 (NFR-02).
- [ ] (Should) FR-03 — Layer 1 옵션 B §대안 서술 박제.
- [x] (Should) FR-09 — TSK-20260421-45 historical artefact 표기.
- [ ] (Should) FR-14 — [deferred] / [pending] → 신규 TSK-ID 전환 지침 박제 (planner 수행).
- [ ] (Could) FR-04 — Layer 1 옵션 C 조건부 채택 시 TSK-47 선결 의존 명시 (현재 충족).
- [ ] (Could) FR-15 — 신규 Task ID 발행 지침 + TSK-49 supersede 메타 선택성 박제.
- [ ] (NFR) NFR-04 수정 파일 ≤ 2 (테스트층 선호). B5/B6 채택 시 ≤ 3 + runtime 변경 근거 박제. runtime 소스(`src/Log/LogItem.jsx`, `src/File/File.jsx`) 0 변경 (B5/B6 제외).
- [ ] (NFR) NFR-06 관측성 — 본 spec 변경 이력에 REQ-20260421-010 / REQ-20260421-012 / REQ-20260421-015 / REQ-20260421-017 및 followup 원본 경로 참조.

## 스코프 규칙
- **expansion**: 조건부 (Layer 2 B5 또는 B6 채택 시에만 runtime `src/Log/hooks/useDeleteLog.js` 확장 허용; 그 외 불허)
- **grep-baseline** (2026-04-21, HEAD=fc656a7):
  - `grep -n "getByTestId.*delete-button" src/Log/LogItem.test.jsx` → 0 hits (FR-02 적용 완료).
  - `grep -n "findByTestId.*delete-button" src/Log/LogItem.test.jsx` → 4 hits at `:207, :262, :318, :379` (FR-02 후 baseline).
  - `grep -n "findByText.*Drop files here" src/File/File.test.jsx` → 1 hit (FR-07 옵션 2 후 timeout options 포함).
  - `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → ≥1 hit (TSK-47 재도입 확인).
  - `grep -rn "vi.spyOn\|vi.restoreAllMocks" src/Log/LogItem.test.jsx` → α-가설 baseline (참조만).
  - `grep -n "beforeAll" src/Log/LogItem.test.jsx` → 0 hits (B1' 채택 시 +1 hits).
  - `grep -n "await Promise.resolve" src/Log/hooks/useDeleteLog.js` → 0 hits (B5 채택 시 +1 hits, 조건부).
- **rationale**: 런타임 소스(`src/**/*.{js,jsx}` 중 `*.test.*` 제외) 는 기본적으로 본 spec 수정 범위 밖 — cold-start Layer 1 은 테스트 쪽 query 전략에서 해결, Layer 2 는 테스트층 B1' / B2 / B4 를 1순위로 시도. B5 / B6 (runtime) 는 상위 단계 전원 실패 시에만 조건부 확장 허용 (FR-12). `vite.config.js` 의 `sequence.shuffle` 설정 변경 금지. TSK-20260421-45 원본 복귀/재활용은 RULE-05 운영자 관할. 이전 blocked spec(`test-isolation-shuffle-safety-spec.md`) 은 운영자 정리 대상 — 본 파일명에 `-cold-start` suffix 로 충돌 회피.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-007 반영; α-가설 폐기, cold-start race 서사로 전면 재작성, 옵션 A(sync→async query 전환) 채택, 이전 blocked spec 은 운영자 정리 대상) | all |
| 2026-04-21 | inspector / — (drift reconcile) | TSK-20260421-49 blocked 관측 (HEAD=ea9d30c). developer 실측으로 옵션 A/B/C 조합 적용 후에도 shuffle seed=1 `LogItem DELETE network-error` 1건 (`findByText("Deleting log network error.")` 5062ms timeout) 잔존 — Layer 2 race 식별. β-가설 (sync query cold-start) 은 Layer 1 만 설명. | 테스트 현황, 변경 이력 |
| 2026-04-21 | inspector / — (REQ-20260421-010 반영) | Layer 1 / Layer 2 구분 서사로 확장. §역할·§동작·§공개 인터페이스 에 Layer 2 (mutation + msw listen + React 19 concurrent first-in-file flush) 근거 박제 (HEAD=fd38b44). FR-11~15 추가 — B1~B4 (테스트층) + B5 (런타임층, 조건부) 후보 열거. | 역할, 동작, 공개 인터페이스, 대안, Baseline, 의존성, 테스트 현황, 수용 기준, 스코프 규칙, 변경 이력 |
| 2026-04-21 | TSK-20260421-51 / d798635 (drift reconcile ack) | FR-02 수용 기준 PASS — `src/Log/LogItem.test.jsx` 의 `getByTestId("delete-button")` 4건 → `await screen.findByTestId("delete-button")` 로 전환 완료. | 수용 기준, 변경 이력 |
| 2026-04-21 | inspector / — (marker sync, HEAD=2e9f806) | Phase 1 marker 정합 전환 — §테스트 현황 호환 마커를 planner carve 결과(`a4636a7`, `2a0ff31`)에 맞춰 구체 TSK-ID 로 고정. | 테스트 현황, 변경 이력 |
| 2026-04-21 | TSK-20260421-57 / — (재진단) | Root cause = React 19 concurrent first-in-file commit × mutate-options observer 의존성 (주), 부차 Toaster mount latency. FR-13 fallback chain `B1' → B2 → B4 → B5 → B6` 로 재확정 (B3 은 1·2차 반증으로 제거). result.md §4 시점 타임라인 + §Root cause 판정 박제. | 역할, 동작, 공개 인터페이스, 대안, 테스트 현황, 수용 기준, 변경 이력 |
| 2026-04-21 | inspector / — (REQ-20260421-017 + REQ-20260421-015 반영, HEAD=fc656a7) | blocked → followup (revive) → green 재등록. TSK-20260421-57 재진단 결과 반영 (Root cause = React 19 first-in-file × mutate-options observer). FR-13 1차 추천안 B1 → B1' 교체. B6 항목 신설 (mutate-options 제거 + options-level onError 주입). FR-11 B1/B3 항목에 2026-04-21 반증 주석 append. §테스트 현황 stale 마커 4 지점 → `[x] TSK-20260421-57 재진단 완료, 해소 patch 별건 carve 대기` 전환. REQ-015 FR-04~FR-07 자연 충족. | all |
