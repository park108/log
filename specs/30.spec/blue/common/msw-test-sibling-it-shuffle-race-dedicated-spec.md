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
- [x] FR-01 해소 후 seed=1 0 fail. (TSK-20260421-55 / 1bbdbb0 — 1 file / 3 tests pass)
- [x] FR-01 해소 후 seed=2 0 fail. (TSK-20260421-55 / 1bbdbb0 — 1 file / 3 tests pass)
- [x] FR-01 해소 후 seed=3 0 fail (followup 재현 3 fail 0 건). (TSK-20260421-55 / 1bbdbb0 — baseline 3 fail 확인 후 0 fail)
- [ ] TSK-20260421-53 머지 후 재실측 (계약 공존 검증) — `beforeAll`/`afterAll` 환경에서도 어서트 유효. **[superseded: TSK-20260421-57 재진단 결과 `server.listen` beforeAll 승격(B3)이 Layer 2 race 해소에 무관함이 확정되어 FR-13 fallback 4차로 강등, B3 머지 미예정. 현 baseline `src/test-utils/msw.js` `beforeEach(server.listen)` 유지. 본 항목의 `beforeAll` 환경 재실측 전제 소멸 — 해소 patch 별건 carve 시 B1' 우선, B3 는 조건부. 근거: TSK-20260421-57 result.md §FR-13 fallback 재평가 + §후속 5]**

## 수용 기준
- [x] (Must) FR-01 — `src/test-utils/msw.test.js` 의 `hook 1` / `hook 2` describe 에서 두 sibling `it` 가 같은 `fakeServer` 스파이 상태를 누적 의존하는 패턴 제거 (3안 중 (A) 단일 `it` 병합 채택 — vitest 기본 API 만 사용, 수명주기 공존). (TSK-20260421-55 / 1bbdbb0)
- [x] (Must) FR-02 — 계약 어서트 축소 (특정 호출 횟수 가정 배제). `toHaveBeenCalledTimes` 0건. `beforeEach`/`afterEach` 환경 PASS, `beforeAll`/`afterAll` 환경은 TSK-53 머지 후 재실측 예정 (NFR-04 참조). (TSK-20260421-55 / 1bbdbb0)
- [x] (Must) FR-03 — `hook 3` override 검증 (`listen` 이 `{ onUnhandledRequest: 'warn' }` 로 호출됨) 무손실 유지 — `toHaveBeenCalledWith` 2건 (hook 1 'error' + hook 3 'warn'). (TSK-20260421-55 / 1bbdbb0)
- [x] (Must) FR-04 — `npx vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3-seed 실측 모두 `src/test-utils/msw.test.js` 0 fail, 각 1 file / 3 tests pass. (TSK-20260421-55 / 1bbdbb0)
- [x] (Must) FR-05 — `npm test -- --run` (serial) 0 fail 유지, 47 files / 375 tests pass. (TSK-20260421-55 / 1bbdbb0)
- [x] (Should) FR-06 — 원본 green spec `test-isolation-shuffle-safety-cold-start-spec.md` §FR-06 L97 태깅 `[pending: REQ-20260421-011 TSK-20260421-55]` 전환 완료 (inspector marker-sync, 1d89844).
- [x] (Should) FR-07 — 신규 Task ID `TSK-20260421-55` 발행 (planner a4636a7, TSK-49/50/52 와 supersede 관계 없음).
- [x] (NFR) NFR-01 — `vitest --sequence.shuffle --sequence.seed={1,2,3}` 3-seed 모두 해당 파일 0 fail. (TSK-20260421-55 / 1bbdbb0)
- [x] (NFR) NFR-02 — serial 및 shuffle 3-seed 모두 결정적 0 fail. (TSK-20260421-55 / 1bbdbb0)
- [x] (NFR) NFR-03 — 수정 파일 ≤ 1 (`src/test-utils/msw.test.js`). `src/test-utils/msw.js` / runtime 소스 / 다른 `*.test.*` 0 수정. (TSK-20260421-55 / 1bbdbb0)
- [ ] (NFR) NFR-04 — TSK-20260421-53 머지 전/후 양쪽 환경에서 0 fail. **[superseded: TSK-20260421-57 재진단으로 B3 fallback 이 4차로 강등, `server.listen` beforeAll 승격 미예정. 현 baseline `beforeEach` 유지 — `beforeAll`/`afterAll` 환경 도래 시 재평가하되 차기 Layer 2 해소 patch (B1' 우선) 에서 자연스럽게 판정 예정. 근거: TSK-20260421-57 result.md §FR-13 fallback 재평가]**
- [x] (NFR) NFR-05 — 축소 어서트는 `useMockServer` 계약 만 검증. 횟수 가정 0건. (TSK-20260421-55 / 1bbdbb0)
- [x] (NFR) NFR-06 — result.md 및 본 spec 변경 이력에 REQ-20260421-011 + followup 원본 (`20260421-0955-msw-test-sibling-it-shuffle-race.md`) 경로 참조 박제. (TSK-20260421-55 / 1bbdbb0)

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
| 2026-04-21 | inspector / — (marker sync, HEAD=2e9f806) | planner carve 완료 확인 — TSK-20260421-55 가 40.task/ready/ 에 발행됨 (`a4636a7`). 원본 spec `test-isolation-shuffle-safety-cold-start-spec.md` §테스트 현황 L97 의 FR-06 marker 를 `[pending: REQ-20260421-011 TSK-20260421-55]` 로 전환 완료 (본 spec 의 FR-06 Should 이행, planner 미수행분 inspector 보조 처리). 본 spec 자체 WIP 전원 불변 (TSK-55 developer 실측 대기) — stale_cycles 유지. | 변경 이력 |
| 2026-04-21 | TSK-20260421-55 / 1bbdbb0 (drift reconcile ack) | Must FR-01~05 + Should FR-06/07 + NFR-01/02/03/05/06 전원 PASS 박제 — `src/test-utils/msw.test.js` (A) 단일 `it` 병합 채택, `hook 1`/`hook 2` 두 sibling `it` 를 단일 `it` 로 통합, `hook 3` 무손실. 현 HEAD=e1a9bef 재검증: `grep -c "toHaveBeenCalledTimes" src/test-utils/msw.test.js` = 0, `grep -c "toHaveBeenCalledWith" ...` = 2, `it(` 본문 호출 3 (5→3 감축 확인). hook-ack: `npm run lint` 0 warn/error, `npm test -- --run` 47 files / 375 tests pass, shuffle seed=1/2/3 각 1 file / 3 tests pass (baseline seed=3 3 fail → 0 fail), `npm run build` OK. NFR-04 만 WIP — TSK-20260421-53 머지 후 `beforeAll`/`afterAll` 재실측 필요 (현재 어서트는 수명주기 무관 계약으로 축소되어 공존 예상). | 테스트 현황, 수용 기준, 변경 이력 |
| 2026-04-21 | TSK-20260421-57 / — (관련 재진단 완료, 본 spec src 변경 0) | **NFR-04 [pending] → [superseded] 태깅 전환** — TSK-20260421-57 (Layer 2 root cause 재진단) 결과 B3 (`server.listen` beforeAll 승격) fallback 이 4차로 강등, 머지 미예정으로 확정. 본 spec 의 "TSK-53 머지 전/후" 전제 소멸. 현 baseline `beforeEach` 하에서 Must FR-01~05 + Should FR-06/07 + NFR-01/02/03/05/06 PASS 상태 유지 (1bbdbb0). 차기 Layer 2 해소 patch (B1' 우선) 진행 시 자연 재평가 — 본 spec 자체 추가 작업 불요. 근거: TSK-20260421-57 result.md §FR-13 fallback 재평가 + §후속 5. | 테스트 현황, 수용 기준, 변경 이력 |
