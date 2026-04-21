# msw.test.js sibling-it shuffle race — 독립 spec (FR-06 carve-out)

> **위치**: `src/test-utils/msw.test.js:24-70` / 헬퍼 `src/test-utils/msw.js:45-59` (`useMockServer` — 수정 대상 아님)
> **관련 요구사항**: REQ-20260421-011 (carve-out from `test-isolation-shuffle-safety-cold-start-spec.md` §FR-06)
> **최종 업데이트**: 2026-04-21 (by inspector, Phase 3 신규 carve)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=2dc4635 시점).

## 역할
`src/test-utils/msw.test.js` 의 3개 sibling `it` 어서트(`:29, :37, :57`) 가 `vi.fn()` 호출 횟수 누적/소거에 의존해 `vitest --sequence.shuffle --sequence.seed=3` 에서만 재현되는 race 를 **테스트 파일 단독 수정 (≤ 1 파일)** 로 해소한다. TSK-20260421-53 (Layer 2 B3 — `server.listen` `beforeEach` → `beforeAll` 승격) 와 **병렬 진행 가능** 하며 양 수명주기 환경에서 공존. `src/test-utils/msw.js` runtime 변경, `LogItem.test.jsx` Layer 2 race, `File.test.jsx` FR-07 race 는 범위 외.

## 공개 인터페이스
- 변경 파일: `src/test-utils/msw.test.js` 1건.
- describe 구조 유지: `hook 1: ...`, `hook 2: ...`, `hook 3: onUnhandledRequest 옵션을 override 가능`.
- 어서트 계약 축소: 특정 호출 횟수(1/2 회) 가정 금지. 다음 계약만 검증:
  - `listen` 이 최소 1회 호출되며 `{ onUnhandledRequest }` 값이 전달됨.
  - `close` 가 `afterEach` (또는 `afterAll`, 수명주기 환경에 따라) 시점에 최소 1회 호출됨.
  - `resetHandlers` 가 `afterEach` 시점에 최소 1회 호출됨.
  - `hook 3` — `listen` 이 `{ onUnhandledRequest: 'warn' }` 로 호출된 기록 관찰 (FR-03 무손실).

## 동작
1. `hook 1` / `hook 2` describe 내 두 sibling `it` 의 `fakeServer = makeFakeServer()` 공유 + mock call count 누적 가정 제거. 3안 중 1안 단일 채택:
   - (A) 두 `it` 를 단일 `it` 로 병합해 순차 어서트.
   - (B) `beforeEach(() => { listen.mockClear(); close.mockClear(); resetHandlers.mockClear(); })` 로 sibling 간 mock 상태 리셋.
   - (C) `describe.sequential` 블록 (vitest API 지원 선결 확인 필요).
2. 어서트는 "최소 1회 호출" / 값 전달만 확인 — 횟수 가정 배제 (NFR-05).
3. `hook 3` 의 override 검증 (`listen` 이 `'warn'` 값으로 호출됐음) 은 보존 (FR-03).
4. `npx vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3-seed 모두 해당 파일 0 fail.
5. `npm test -- --run` (serial) 도 0 fail 유지 — 47 파일 전체 회귀 0.
6. TSK-20260421-53 머지 전/후 양쪽 환경에서 0 fail — 어서트가 `beforeEach`/`afterEach` ↔ `beforeAll`/`afterAll` 수명주기에 비종속.

## 의존성
- 내부: `src/test-utils/msw.test.js` (FR-01/02/03 대상), `src/test-utils/msw.js` (`useMockServer` — 수정 대상 아님, 계약 원천 `:45-59`).
- 외부: `vitest` (`vi.fn`, `beforeEach`, `afterEach`, `describe.sequential` 조건부), `msw` (간접 — `setupServer` 계약만 유지).
- 역의존: 없음 — 테스트 파일 단독 수정.
- 병렬 진행 task: `TSK-20260421-53` (Layer 2 B3, `src/test-utils/msw.js` runtime 변경). 파일 비중첩.
- 카브아웃 원본: `specs/30.spec/green/common/test-isolation-shuffle-safety-cold-start-spec.md` §FR-06 (L97, `[deferred: TSK-20260421-49 blocked]`), §수용 기준 L109. 태깅 전환은 planner 가 신규 Task 발행 시점에 `[pending: REQ-20260421-011 TSK-<new>]` 로 수행 (FR-06 Should).

## 테스트 현황
- [x] 현 HEAD `npm test` (serial, d798635) → 47 files / 377 tests pass.
- [x] shuffle seed=3 재현 박제 (TSK-20260421-51 result.md, followup `20260421-0955-msw-test-sibling-it-shuffle-race.md`):
  - `src/test-utils/msw.test.js:29:30` — `expected "vi.fn()" to be called 1 times, but got 2 times`.
  - `src/test-utils/msw.test.js:37:29` — `expected ... 1 times, but got 0 times`.
  - `src/test-utils/msw.test.js:57:29` — `expected ... 1 times, but got 0 times`.
  - 결과: 1 file failed / 3 tests failed.
- [x] shuffle seed=1, seed=2 → 5/5 pass (shuffle 순서 의존 확인).
- [ ] FR-01 해소 후 seed=1 0 fail.
- [ ] FR-01 해소 후 seed=2 0 fail.
- [ ] FR-01 해소 후 seed=3 0 fail (followup 재현 3 fail 0 건).
- [ ] TSK-20260421-53 머지 후 재실측 (계약 공존 검증) — `beforeAll`/`afterAll` 환경에서도 어서트 유효.

## 수용 기준
- [ ] (Must) FR-01 — `src/test-utils/msw.test.js` 의 `hook 1` / `hook 2` describe 에서 두 sibling `it` 가 같은 `fakeServer` 스파이 상태를 누적 의존하는 패턴 제거 (3안 중 1안 단일 채택, 채택 근거 1~2문장 박제).
- [ ] (Must) FR-02 — 계약 어서트 축소 (특정 호출 횟수 가정 배제). `beforeEach`/`afterEach` 및 `beforeAll`/`afterAll` 두 환경 모두 PASS.
- [ ] (Must) FR-03 — `hook 3` override 검증 (`listen` 이 `{ onUnhandledRequest: 'warn' }` 로 호출됨) 무손실 유지.
- [ ] (Must) FR-04 — `npx vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3-seed 실측 모두 `src/test-utils/msw.test.js` 0 fail. result.md 에 수치 (files / tests) 박제.
- [ ] (Must) FR-05 — `npm test -- --run` (serial) 0 fail 유지, 47 파일 전체 회귀 0.
- [ ] (Should) FR-06 — planner 가 본 spec 기반 신규 Task 발행 시점에 원본 green spec `test-isolation-shuffle-safety-cold-start-spec.md` §FR-06 (L97) + §수용 기준 L109 의 `[deferred: TSK-20260421-49 blocked]` 태깅을 `[pending: REQ-20260421-011 TSK-<new>]` 로 전환 (FR-06 Should, planner 담당).
- [ ] (Should) FR-07 — 신규 Task ID 는 `TSK-YYYYMMDD-NN` 로 발행, TSK-20260421-49/50/52 와 supersede 관계 없음.
- [ ] (NFR) NFR-01 — `vitest --sequence.shuffle --sequence.seed={1,2,3}` 3-seed 모두 해당 파일 0 fail.
- [ ] (NFR) NFR-02 — serial 및 shuffle 3-seed 모두 결정적 0 fail.
- [ ] (NFR) NFR-03 — 수정 파일 ≤ 1 (`src/test-utils/msw.test.js`). `src/test-utils/msw.js` / runtime 소스 / 다른 `*.test.*` 0 수정.
- [ ] (NFR) NFR-04 — TSK-20260421-53 머지 전/후 양쪽 환경에서 0 fail.
- [ ] (NFR) NFR-05 — 축소 어서트는 `useMockServer` 계약 ("호출 시점 `listen({ onUnhandledRequest })`", "afterEach 시점 `resetHandlers`/`close`", "override 옵션 전달") 만 검증. 횟수 가정 금지.
- [ ] (NFR) NFR-06 — 본 spec 및 신규 task 변경 이력에 REQ-20260421-011 + followup 원본 (`specs/60.done/2026/04/21/followups/20260421-0955-msw-test-sibling-it-shuffle-race.md`) 경로 참조.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `grep -n "it(" src/test-utils/msw.test.js` → 5 hits (3 describe 내 5 `it`, HEAD=2dc4635 스냅샷).
  - `grep -n "fakeServer" src/test-utils/msw.test.js` → 다수 hits (hook 1/hook 2 공유 패턴 재현 지점).
  - `grep -n "toHaveBeenCalledTimes" src/test-utils/msw.test.js` → 지점 박제 (FR-02 축소 대상 — 카운트 기반 어서트 전량 교체).
  - `grep -n "listen\|close\|resetHandlers" src/test-utils/msw.js` → `useMockServer :45-59` (계약 원천, 수정 대상 아님).
- **rationale**: 본 spec 은 `src/test-utils/msw.test.js` **단일 파일** 수정만 허용. `src/test-utils/msw.js` runtime 변경은 TSK-20260421-53 소관. `vite.config.js` `sequence.shuffle` 기본값 변경 금지. runtime 소스 (`src/**/*.{js,jsx}` 중 `*.test.*` / `test-utils` 제외) 0 수정. 원본 green spec (`test-isolation-shuffle-safety-cold-start-spec.md`) 의 §FR-06 블록 갱신은 planner 의 Task 발행 시점 수행 (본 spec 의 FR-06 Should 참조).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-011 반영, `test-isolation-shuffle-safety-cold-start-spec.md` §FR-06 carve-out) | all |
