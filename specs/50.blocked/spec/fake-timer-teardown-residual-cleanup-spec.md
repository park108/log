# Fake-timer teardown 잔존 afterEach 정리 + 메타 어서트 순서 의존 보강

> **위치**: `src/setupTests.timer-idiom.test.jsx` (`:26-28`, `:53-61`), `src/Toaster/Toaster.test.jsx` (`:7-9`), `src/Comment/CommentItem.test.jsx` (`:16-18`), `src/Search/Search.test.jsx` (`:219-221`), `src/common/useHoverPopup.test.jsx` (`:6-8`), `src/Log/LogItemInfo.test.jsx` (`:56-58`), `src/setupTests.js` (`:38-41` fake-timer idiom 문단)
> **관련 요구사항**: REQ-20260421-001
> **최종 업데이트**: 2026-04-21 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=afe109e).

## 역할
TSK-20260420-38 (전역 `afterEach(() => vi.useRealTimers())` 박제, 커밋 504bee9) 적용 이후 `src/**/*.test.{js,jsx}` 내 파일별 `afterEach(() => vi.useRealTimers())` 재등록이 6건 잔존한다. 전역 단일 teardown 지점과 기능상 중복이므로 (A) 전원 제거 또는 (B) "중복이지만 가시성 유지" 주석 박제 중 단일 정책을 채택해 규약 일관성을 확보한다. 추가로 `src/setupTests.timer-idiom.test.jsx` 의 메타 어서트 `[A]→[B]` (파일 내 서로 다른 `it` 분리 + 순차 실행 의존) 를 같은 `it` 블록 내부 직렬화 또는 `afterEach` 기반 검증으로 재작성해 `vitest --sequence.shuffle` 등 순서 셔플 상황에서 false positive 를 차단한다. 런타임 소스 수정, MSW 수명주기 / env stub 이디엄 변경, 메타 어서트의 fake-timer 유출 감지 범위 확대는 본 spec 밖.

## 공개 인터페이스
- **정책 선택 1종** (planner 가 spec 승격 시점에 고정; 혼용 금지):
  - **A (권장)**: 6건 파일별 `afterEach(() => vi.useRealTimers())` 전원 제거. 전역 `afterEach` (setupTests.js) 가 단일 책임. 제거 후 grep 코드 hits 0 (주석 제외).
  - **B**: 각 블록 위/옆에 주석 1줄 박제 ("전역 `afterEach` 와 중복이지만 파일 로컬 가시성 유지 — REQ-20260421-001"). 기능 중복 허용.
- **메타 어서트 재구성** (Must, FR-03):
  - 옵션 1: 같은 `it` 내부 직렬화 — `[A]` 의 `useFakeTimers({ shouldAdvanceTime: true })` + `expect(vi.isFakeTimers()).toBe(true)` 후 **동일 `it` 마지막에** `afterEach` 가 실행될 것이라는 주석만 남기고 별도 `it` `[B]` 제거. 또는 `afterEach(() => expect(vi.isFakeTimers()).toBe(false))` 훅으로 assertion 이전.
  - 옵션 2: `[B]` 를 `describe` 내부 `afterEach` 에서 기대값 단정 (assertion in teardown hook) — `[A]` 직후 전역 afterEach teardown 이 끝난 뒤의 상태를 검증. 순서 셔플과 무관.
- **`src/setupTests.js` 문구 정합** (Should, FR-04): 기존 헤더 주석 `:38-41` fake-timer idiom 문단을 선택된 정책 (A/B) 과 일관되게 갱신.

## 동작
1. (FR-01) 정책 A 또는 B 단일 채택:
   - A: 6건 파일별 `afterEach(() => vi.useRealTimers())` 전원 제거. 코드 편집 후 `grep -rn "vi\.useRealTimers\(\)" src --include="*.test.js" --include="*.test.jsx"` → 코드 라인 0 hits (주석 `src/setupTests.timer-idiom.test.jsx:56` 등 2건 유지).
   - B: 각 블록 `afterEach(() => {  ` 다음 줄 또는 인접 위치에 `// 전역 afterEach 와 중복 — 파일 로컬 가시성 유지 (REQ-20260421-001)` 1줄 박제.
2. (FR-03) 메타 어서트 재구성 — 현 HEAD `src/setupTests.timer-idiom.test.jsx:53-61` `[A]` (it: enables fake timers) → `[B]` (it: next test starts with real timers) 분리 구조를 제거. 같은 `it` 내부에서 enable → advance → `afterEach` 훅이 실행되어 teardown 을 검증하도록 재작성. 파일 내 `it` 실행 순서가 셔플돼도 영향 없는 구조.
3. (FR-04) `src/setupTests.js:37-41` 전역 teardown 주석 갱신:
   - A 채택 시: "추가 teardown 불필요 — 파일별 afterEach 삭제 규약 (REQ-20260421-001)"
   - B 채택 시: "중복 afterEach 허용 — 파일 로컬 가시성 (REQ-20260421-001)"
4. (FR-05) 정책 결정 근거 1~2줄을 task result 또는 본 spec `변경 이력` 섹션에 박제.
5. `npm test` — 46 files / 370 tests 전원 green + flake 0 유지.
6. `for i in {1..10}; do npm test; done` 10회 전원 green (shuffle 미활성 기본).
7. `npm run lint` 0 warn / 0 error.

### Baseline (2026-04-21, HEAD=afe109e)
- `grep -rn "vi\.useRealTimers\(\)" src --include="*.test.js" --include="*.test.jsx"` → 8 hits in 7 files:
  - 코드 6 hits:
    - `src/Comment/CommentItem.test.jsx:17`
    - `src/Toaster/Toaster.test.jsx:8`
    - `src/Search/Search.test.jsx:220`
    - `src/setupTests.timer-idiom.test.jsx:27`
    - `src/Log/LogItemInfo.test.jsx:57`
    - `src/common/useHoverPopup.test.jsx:7`
  - 주석 2 hits:
    - `src/setupTests.timer-idiom.test.jsx:51` (문단 주석)
    - `src/setupTests.timer-idiom.test.jsx:56` ("의도적으로 vi.useRealTimers() 를 호출하지 않는다" 인라인 주석)
- 현 HEAD `npm test` 46 files / 370 tests green (TSK-38/40 반영, afe109e).
- 전역 teardown 지점: `src/setupTests.js` 내 `afterEach(() => vi.useRealTimers())` — TSK-38 (504bee9) 에서 박제.

## 의존성
- 내부: `src/setupTests.js` (전역 `afterEach`), `src/setupTests.timer-idiom.test.jsx` (메타 어서트), `src/Toaster/Toaster.test.jsx`, `src/Comment/CommentItem.test.jsx`, `src/Search/Search.test.jsx`, `src/common/useHoverPopup.test.jsx`, `src/Log/LogItemInfo.test.jsx`.
- 외부: `vitest` (`vi.useFakeTimers`, `vi.useRealTimers`, `vi.isFakeTimers`), `@testing-library/react` (영향 없음).
- 역의존: REQ-20260421-004 (shuffle 안전성) — 본 spec 의 `[A]→[B]` 메타 어서트 재구성이 shuffle seed 에서의 flake 제거와 교차. `specs/30.spec/blue/deps/uniform-fake-timer-teardown-policy-spec.md` §"보존 (afterEach 인자 위치)" — 본 REQ 는 보존 판정을 재개정. TSK-20260420-38 (커밋 504bee9) 결과 승계.

## 테스트 현황
- [x] 현 HEAD `npm test` — 46 files / 370 tests green (afe109e, TSK-38/40 반영).
- [x] 전역 `afterEach(() => vi.useRealTimers())` 박제 검증 (TSK-38 완료, 메타 어서트 `[A]→[B]` 현재 green).
- [ ] 정책 (A/B) 적용 후 46/370 green 유지.
- [ ] `for i in {1..10}; do npm test; done` 10회 전원 green.
- [ ] 메타 어서트 재구성 후 같은 파일 내 `it` 순서 셔플 가정에서도 false positive 0.
- [ ] `npm run lint` 0 warn / 0 error.

## 수용 기준
- [ ] (Must) 6건 파일별 `afterEach(() => vi.useRealTimers())` 에 대한 정책 (A: 전원 제거 / B: 주석 박제) 단일 채택.
- [ ] (Must) 선택 A 시 `grep -rn "vi\.useRealTimers\(\)" src --include="*.test.js" --include="*.test.jsx"` → 코드 라인 0 hits (주석 2건 허용). 선택 B 시 각 블록 위/옆에 REQ-20260421-001 참조 주석 1줄 박제 (grep 은 6 + 6 = 12 hits 로 증가 허용).
- [ ] (Must) `src/setupTests.timer-idiom.test.jsx` 메타 어서트 재구성 — 같은 `it` 내부 직렬화 또는 `afterEach` 훅 내부 assertion. `[A]→[B]` 분리 구조 제거.
- [ ] (Must) `npm test` → 46 files / 370 tests 전원 green + flake 0.
- [ ] (Must) `for i in {1..10}; do npm test; done` 10회 전원 green (shuffle 미활성 기본).
- [ ] (Should) `src/setupTests.js:37-41` 헤더 주석 문구를 선택 정책과 일관되게 갱신.
- [ ] (Should) 정책 결정 근거 1~2줄을 task result 또는 본 spec 변경 이력에 박제.
- [ ] (Should) `npm run lint` 0 warn / 0 error.
- [ ] (NFR) 수정 파일 ≤ 7 (6 test 파일 + 선택 `src/setupTests.js` 주석). `src/**/*.{js,jsx}` 중 `*.test.*` 제외 런타임 0건 수정.
- [ ] (NFR) `vi.useFakeTimers({ shouldAdvanceTime: true })` 사용처 변경 0 — 본 spec 은 teardown / 메타 어서트 한정.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=afe109e):
  - `grep -rn "vi\.useRealTimers\(\)" src --include="*.test.js" --include="*.test.jsx"` → 8 hits in 7 files (코드 6 + 주석 2). 코드 라인 6건은 위 Baseline 섹션 열거대로.
  - `grep -rn "useFakeTimers" src --include="*.test.*"` → 감사용. 변경 금지 — 본 spec 은 enable 경로 수정 아님.
  - `grep -n "vi\.isFakeTimers" src/setupTests.timer-idiom.test.jsx` → 3 hits at `:55, :60` 등 (메타 어서트). 재구성 시 hits 위치 변경 허용.
- **rationale**: 런타임 소스 (`src/**/*.{js,jsx}` 중 `*.test.*` 제외) 는 본 spec 범위 밖. `vi.useFakeTimers({ shouldAdvanceTime: true })` enable 경로는 TSK-35-a/35-b 관할이라 변경 금지. env stub 이디엄 (REQ-005 / REQ-009) · MSW 수명주기 (REQ-004) 와 독립. 전역 `afterEach` 박제 자체는 TSK-38 완료로 불변. 본 spec 은 잔존 재등록 정책 + 메타 어서트 순서 의존 제거 2축만.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-001 반영; TSK-20260420-38 result.md §"보존 (afterEach 인자 위치)" 재개정 + 메타 어서트 `[A]→[B]` 순서 의존 보강 요구) | all |
