# 테스트 격리 강화 — cold-start race 기반 shuffle 안전성 재작성

> **위치**: `src/Log/LogItem.test.jsx` 의 DELETE 5xx / network-error 계열 test (보조: `:205, :260, :316, :377` 의 `screen.getByTestId("delete-button")`); 보조 대상 `src/test-utils/msw.test.js:29, 37, 57` (sibling-it 의존), `src/File/File.test.jsx:35` 의 `prodServerHasNoData` describe (QueryClient cache race).
> **관련 요구사항**: REQ-20260421-007 (REQ-20260421-004 재작성분)
> **최종 업데이트**: 2026-04-21 (by inspector, re-write from blocked)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=ae80e56). 이전 blocked spec 은 α-가설("vi.spyOn 12건 누수 → admin 분기 오염") 기반이었으나 developer 실측(TSK-20260421-45)에서 재현 실패의 주원인이 아님으로 확인. 본 spec 은 **cold-start race** 를 주원인으로 재정의.

## 역할
`vitest run --sequence.shuffle --sequence.seed={1,2,3}` 실행 시 `LogItem DELETE 5xx` / `network-error` 케이스가 shuffle 순서상 맨 처음 실행될 때 `screen.getByTestId("delete-button")` 의 sync query 가 React 19 concurrent commit 미반영 상태의 빈 `<body><div /></body>` 에 질의해 `Unable to find...` 로 실패한다. 본 spec 은 이 **cold-start race** 를 근거로 옵션 A(sync→async query 전환) 를 주안으로 채택하고, 옵션 B(파일-level `useFakeTimers`) / 옵션 C(`ASYNC_ASSERTION_TIMEOUT_MS` 사용) 는 대안/선결 의존 조건부로 문서화한다. 이전 blocked spec 의 FR-02 (msw.test.js sibling-it), FR-03 (File.test.jsx QueryClient cache) 는 검증된 범위에 한해 유지. runtime 소스 변경, `vite.config.js` 의 `sequence.shuffle` 기본값 변경, TSK-20260421-45(historical artefact) 재활용은 본 spec 밖.

## 공개 인터페이스
- **FR-01 (Must) — 서사 재작성**: spec §동작 및 배경에 "mock 누수 α-가설" 서사를 폐기하고 "React 19 concurrent commit cold-start race" 서사를 박제. 실패 스택(`src/Log/LogItem.test.jsx:210:31` 및 동일 패턴 `:265, :321, :382`) 과 seed 별 재현 결과(seed=1: 2 fail, seed=2: 3 fail, seed=3: 3 fail — HEAD=4bd67ef 실측 근거) 를 포함.
- **FR-02 (Must) — 옵션 A (권장, 채택): sync→async query 전환**: `src/Log/LogItem.test.jsx:205, :260, :316, :377` 의 `screen.getByTestId("delete-button")` 4건을 `await screen.findByTestId("delete-button")` 로 교체. `restoreAllMocks` 추가는 선택적 후속 보강으로 유지 (누수 자체는 주원인이 아니나 정합성 차원).
- **FR-03 (Should) — 옵션 B (대안): 파일-level useFakeTimers**: `src/Log/LogItem.test.jsx` 최상단에 `beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))` + `afterEach(() => vi.useRealTimers())` 추가. 첫 `it`(line 42 근방)의 중복 선언은 no-op. testing-library polling 환경 균일화로 cold-start 상태에서도 async rerender 진행 확보. 옵션 A 와 택일 (동시 적용 금지).
- **FR-04 (Could) — 옵션 C (조건부): ASYNC_ASSERTION_TIMEOUT_MS 사용**: TSK-20260421-47 (react-19-findby-β) 완료 → `src/test-utils/timing.js` 에 `ASYNC_ASSERTION_TIMEOUT_MS` 가 존재한다는 전제 하에, `findByTestId("delete-button", {}, { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` 로 타임아웃 여유 확보. TSK-47 선결 의존 명시. 옵션 A/B 가 불충분할 때만 채택.
- **FR-05 (Must) — 옵션 채택 판정 근거 박제**: spec §동작 에 옵션 A 채택 1~2문장 요약("React 19 concurrent rendering 의 initial commit 은 async flush 경로이므로 sync query 는 0 node 를 반환. findBy* 는 내부 polling 으로 commit 대기 — 최소 침습·가장 확정적") 박제.
- **FR-06 (Must) — msw.test.js sibling-it 의존 제거**: `src/test-utils/msw.test.js:29, 37, 57` 세 지점 sibling `it` 의 afterEach 호출 횟수에 의존하는 어서트를 (옵션 1) 단일 `it` 병합, (옵션 2) `describe.sequential` 블록 이동, (옵션 3) direct assertion 재작성 중 단일 적용. 메타 테스트 의도(hook 실행 횟수 검증) 는 등가 유지.
- **FR-07 (Must) — File.test.jsx cache race 해소**: `src/File/File.test.jsx:35` `prodServerHasNoData` describe 에 (옵션 1) 명시 `queryClient.clear()` 훅, (옵션 2) `findByText("Drop files here!", {}, { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` timeout 여유 중 단일 적용. REQ-20260421-008 (File.test.jsx 분할) 과 병합 수정 시 순서 명시.
- **FR-08 (Must) — shuffle seed 3회 실측**: `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail 결과를 result.md 에 박제.
- **FR-09 (Should) — TSK-45 historical artefact 명시**: spec §변경 이력 에 "TSK-20260421-45 는 α-가설 한정 historical artefact. 본 spec 기반 재carve 는 planner 에서 신규 Task ID 로 발행." 를 박제. TSK-45 자체 복귀는 RULE-05 운영자 관할 — 본 spec 범위 밖.
- **FR-10 (Should) — spec 복귀 경로**: 본 파일 위치는 `specs/30.spec/green/common/test-isolation-shuffle-safety-cold-start-spec.md`. 이전 blocked spec (`specs/50.blocked/spec/test-isolation-shuffle-safety-spec.md`) 은 운영자 정리 대상 (RULE-05) — inspector 는 동일 파일명 재이동 금지 (멱등/충돌 방지).

## 동작
1. (FR-01, FR-05) 옵션 A 채택 근거 박제 — React 19 의 concurrent initial commit 은 RootNode 마운트 → commit flush 가 microtask / scheduled task 로 분할되어 즉시 queryable 하지 않음. `getBy*` 는 1회 sync 조회 후 실패 throw. `findBy*` 는 default 1000ms polling → mount 완료 대기.
2. (FR-02) `src/Log/LogItem.test.jsx` 에서:
   - `:205` `const deleteButton = screen.getByTestId("delete-button")` → `const deleteButton = await screen.findByTestId("delete-button")`.
   - `:260, :316, :377` 동일 패턴 교체. 총 4건. 외부 `async test` / `async it` 이미 선언되어 있으므로 `await` 추가만 필요.
3. (FR-03, 대안 검토) 옵션 B 를 §대안 서술만 유지 — 옵션 A 가 FR-08 실측에서 insufficient 일 때 planner/developer 가 대안 채택.
4. (FR-04, 조건부) TSK-20260421-47 완료 확인은 `60.done/task/**/` 아래 `20260421-react-19-findby-...` 디렉토리 존재로 판단. 현재(HEAD=ae80e56) 는 TSK-47 done (`specs/60.done/2026/04/21/task/` 에 해당 슬러그 존재 예상 — result.md 참조). `ASYNC_ASSERTION_TIMEOUT_MS` 는 이미 `src/test-utils/timing.js` 에서 export. 옵션 C 선결 의존 조건은 현재 **충족**.
5. (FR-06) `src/test-utils/msw.test.js:29, 37, 57` 지점의 sibling-it 의존 어서트를 단일 `it` 로 병합하거나 `describe.sequential` 로 감싸고, 메타 테스트 assertion 을 등가 변환 (예: `expect(fakeServer.close).toHaveBeenCalledTimes(1)` → 동일 it 내 `useMockServer` 수명주기 직후 assertion).
6. (FR-07) `src/File/File.test.jsx` 의 `prodServerHasNoData` describe 의 `findByText("Drop files here!")` 호출에 `{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }` options 인자 추가 (옵션 2, 권장) 또는 `queryClient.clear()` 훅 도입 (옵션 1). REQ-008 과 동시 수정 시 REQ-007 먼저 병합 후 REQ-008 이 해당 describe 를 건드리지 않는지 확인.
7. (FR-08) 수정 후 실측:
   - `npm test -- --run` → 0 fail (serial baseline).
   - `vitest run --sequence.shuffle --sequence.seed=1` → 0 fail.
   - `vitest run --sequence.shuffle --sequence.seed=2` → 0 fail.
   - `vitest run --sequence.shuffle --sequence.seed=3` → 0 fail.
   결과 수치(files / tests) result.md 에 박제.
8. (FR-09, FR-10) TSK-45 historical 마킹 및 본 spec 경로는 고정. 이전 blocked spec 은 운영자 정리.

### Baseline (2026-04-21, HEAD=ae80e56)
- `grep -n "getByTestId.*delete-button" src/Log/LogItem.test.jsx` → 4 hits at `:205, :260, :316, :377` (FR-02 대상).
- `grep -n "findByTestId.*delete-button" src/Log/LogItem.test.jsx` → 0 hits (FR-02 후 4 hits).
- `grep -n "useMockServer\\|fakeServer.close" src/test-utils/msw.test.js` → (스냅샷) `:29, :37, :57` 주변 sibling-it 의존 (FR-06 대상).
- `grep -n "findByText.*Drop files here" src/File/File.test.jsx` → 1 hit at `:52` (FR-07 대상).
- `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → ≥1 hit (TSK-47 재도입 확인 — 옵션 C/FR-07 옵션 2 선결 충족).
- `grep -n "vi.useFakeTimers\\|vi.useRealTimers" src/Log/LogItem.test.jsx` → (스냅샷) 0 hits 가정 (옵션 B 선택 시 +2 hits).

## 의존성
- 내부: `src/Log/LogItem.test.jsx` (FR-02/03 대상), `src/test-utils/msw.test.js` (FR-06 대상), `src/test-utils/msw.js` (`useMockServer` 불변), `src/File/File.test.jsx` (FR-07 대상), `src/test-utils/timing.js` (`ASYNC_ASSERTION_TIMEOUT_MS` — TSK-47 재도입 완료 확인), `src/setupTests.js` (불변).
- 외부: `vitest` (`vi.useFakeTimers`, `vi.useRealTimers`, `describe.sequential`), `@testing-library/react` (`findByTestId`, `findByText` options).
- 역의존: REQ-20260421-008 (`File.test.jsx` 시나리오 분할) — FR-07 의 `prodServerHasNoData` describe 가 REQ-008 의 out-of-scope 이므로 충돌 없음. TSK-20260421-45 (blocked, α-가설) — historical 참조만, 복귀는 RULE-05 관할. TSK-20260421-47 (react-19-findby-β, done) — `ASYNC_ASSERTION_TIMEOUT_MS` 재도입 선결 의존 (현재 충족).

## 테스트 현황
- [x] 현 HEAD `npm test` (serial) → 0 fail (ae80e56).
- [x] shuffle seed=1/2/3 에서 cold-start race 재현 (REQ 본문 수치 — HEAD=4bd67ef 기준, 현 HEAD 재검증은 FR-08 에서).
- [ ] FR-02 옵션 A 적용 후 LogItem cold-start race 해소.
- [ ] FR-06 msw.test.js sibling-it 독립.
- [ ] FR-07 File.test.jsx cache race 해소.
- [ ] FR-08 `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail.
- [ ] `npm run lint` 0 warn/error.

## 수용 기준
- [ ] (Must) FR-01 — spec §동작 1 이 cold-start race 서사로 재작성됨.
- [ ] (Must) FR-02 — `src/Log/LogItem.test.jsx` 의 `getByTestId("delete-button")` 4건이 `findByTestId(...)` 로 전환됨.
- [ ] (Must) FR-05 — 옵션 A 채택 근거가 1~2문장으로 박제됨.
- [ ] (Must) FR-06 — `src/test-utils/msw.test.js:29, 37, 57` sibling-it 의존 제거 (3안 중 1안).
- [ ] (Must) FR-07 — `src/File/File.test.jsx` `prodServerHasNoData` describe cache race 해소 (2안 중 1안).
- [ ] (Must) FR-08 — `vitest run --sequence.shuffle --sequence.seed=1`, `seed=2`, `seed=3` 3회 0 fail 결과 박제.
- [ ] (Must) `npm test -- --run` → 0 fail 유지 (NFR-02).
- [ ] (Should) FR-03 — 옵션 B §대안 서술 박제 (적용 여부는 실측 결과 의존).
- [ ] (Should) FR-09 — TSK-20260421-45 historical artefact 표기.
- [ ] (Could) FR-04 — 옵션 C 조건부 채택 시 TSK-47 선결 의존 명시 (현재 충족).
- [ ] (NFR) 수정 파일 ≤ 3 (`LogItem.test.jsx`, `msw.test.js`, `File.test.jsx`). runtime 소스(`src/Log/LogItem.jsx`, `src/File/File.jsx`) 0 변경.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=ae80e56):
  - `grep -n "getByTestId.*delete-button" src/Log/LogItem.test.jsx` → 4 hits at `:205, :260, :316, :377` (FR-02 후 0 hits).
  - `grep -n "findByTestId.*delete-button" src/Log/LogItem.test.jsx` → 0 hits (FR-02 후 4 hits).
  - `grep -n "findByText.*Drop files here" src/File/File.test.jsx` → 1 hit at `:52` (FR-07 옵션 2 후 timeout options 포함).
  - `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → ≥1 hit (TSK-47 재도입 확인).
  - `grep -rn "vi.spyOn\\|vi.restoreAllMocks" src/Log/LogItem.test.jsx` → α-가설 baseline (참조만, FR-02 에서 필수 변경 아님).
- **rationale**: 런타임 소스(`src/**/*.{js,jsx}` 중 `*.test.*` 제외) 는 본 spec 수정 범위 밖 — cold-start race 는 테스트 쪽 query 전략에서만 해결. `vite.config.js` 의 `sequence.shuffle` 설정 변경 금지. TSK-20260421-45 원본 복귀/재활용은 RULE-05 운영자 관할. 이전 blocked spec(`test-isolation-shuffle-safety-spec.md`) 은 운영자 정리 대상 — inspector 가 동일 파일명 이동 시 `50.blocked/` 잔존 파일과 충돌 발생 가능 → 본 파일명에 `-cold-start` suffix 로 충돌 회피.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-007 반영; α-가설 폐기, cold-start race 서사로 전면 재작성, 옵션 A(sync→async query 전환) 채택, 이전 blocked spec 은 운영자 정리 대상) | all |
