# 테스트 격리 강화 — sequence.shuffle 안전성 (mock 누수 / sibling-it 의존 / cache race)

> **위치**: `src/Log/LogItem.test.jsx` (spyOn 6군데: `:53-54, 113-114, 180-181, 235-236, 290-291, 351-352`), `src/test-utils/msw.test.js` (`:29, :37, :57` sibling-it 의존), `src/File/File.test.jsx:55` (QueryClient cache race), `src/setupTests.timer-idiom.test.jsx` (REQ-20260421-001 교차 영향 — `[A]→[B]`)
> **관련 요구사항**: REQ-20260421-004
> **최종 업데이트**: 2026-04-21 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=afe109e).

## 역할
`vitest run --sequence.shuffle` 아래에서 여러 테스트가 실행 순서에 의존해 flaky 하게 실패한다 (동일 seed 에서 mine = baseline 으로 pre-existing 구조적 문제). 원인은 3축: (A) sibling `it` afterEach 의존 (`src/test-utils/msw.test.js` 3 hits), (B) `vi.spyOn` mock 누수 (`src/Log/LogItem.test.jsx` 6 describe, `restoreAllMocks` 미설치), (C) QueryClient cache race (`src/File/File.test.jsx:55` "no data on prod server" 케이스). 본 spec 은 3 축을 테스트 측에서 직접 제거해 순서 독립성을 확보하고, `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 green 을 성립시킨다. 런타임 소스 수정, vitest 설정의 `sequence.shuffle` 기본값 변경, 3 지점 외 flake 원인 전수 감사는 본 spec 밖. `setupTests.timer-idiom.test.jsx` 의 `[A]→[B]` 순서 의존은 REQ-20260421-001 에서 주관 — 본 spec 은 교차 영향만 조정.

## 공개 인터페이스
- **FR-01 (Must) — LogItem.test.jsx mock 누수 제거**: `src/Log/LogItem.test.jsx` 최상단 또는 각 describe 에 `beforeEach(() => vi.restoreAllMocks())` 추가. 기존 `vi.spyOn(...)` 호출은 각 `it`/`beforeEach` 내부에서 재선언되므로 재배치 불필요. 호출 지점 6 describe (`:53-54, 113-114, 180-181, 235-236, 290-291, 351-352`) 불변.
- **FR-02 (Must) — msw.test.js sibling-it 의존 제거**: `src/test-utils/msw.test.js:29, 37, 57` 에서 sibling `it` 의 afterEach 호출 횟수에 의존하는 어서트 (`expect(fakeServer.close).toHaveBeenCalledTimes(1)` 등) 를 (옵션 1) 같은 `it` 병합, (옵션 2) `describe.sequential` 블록 내부 이동, (옵션 3) direct assertion 구조 재작성 중 단일 적용. 메타 테스트 의도 (hook execution ordering) 는 유지.
- **FR-03 (Must) — File.test.jsx cache race 해소**: `src/File/File.test.jsx:55` "File render files but no data on prod server" 케이스에 (옵션 1) 명시 `queryClient.clear()` 훅 도입, (옵션 2) `findByText("Drop files here!", {}, { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` 여유 추가 중 단일 적용.
- **FR-04 (Must) — shuffle seed 3회 실측**: `vitest run --sequence.shuffle --sequence.seed=1`, `seed=2`, `seed=3` 3회 green 결과를 result.md 에 박제.
- **FR-05 (Should) — spyOn 추가 감사**: `grep -rn "vi\.spyOn" src --include="*.test.jsx"` 결과에서 `restoreAllMocks` 없이 spyOn 하는 파일 열거. 본 spec 외 추가 보강 필요 파일은 followup 로 분기.
- **FR-06 (Should) — REQ-001 교차 영향 조정**: `src/setupTests.timer-idiom.test.jsx` 수정은 REQ-20260421-001 관할. 본 spec 은 shuffle 실측 단계에서 해당 파일 재구성 완료 후 실행 권장 — 동시 수정 시 수정 순서 명시 또는 병합 커밋.

## 동작
1. (FR-01) `src/Log/LogItem.test.jsx` 최상단 `beforeEach(() => vi.restoreAllMocks())` 추가. 기존 6 describe 의 `vi.spyOn(...)` 은 그대로 유지 (각 describe `beforeEach` 내부 재선언이므로). shuffle 시 `vi.spyOn(common, "isAdmin").mockResolvedValue(true)` 직후 다른 테스트가 이 mock 을 상속받아 admin 분기로 잘못 마운트되는 race 제거.
2. (FR-02) `src/test-utils/msw.test.js:29, 37, 57` 세 지점 sibling 의존 제거:
   - `:29` (`hook first-cycle`) 와 `:37` (`hook second-cycle: 직전 afterEach 가 close() 를 1회 호출했다`) — 2 sibling `it` 을 단일 `it` 병합 or `describe.sequential` 로 감싸 실행 순서 고정.
   - `:57` — 동일 패턴. 단일 `it` 병합 권장.
   - 메타 테스트 의도 (hook 실행 횟수 검증) 는 assertion 변환으로 등가 유지.
3. (FR-03) `src/File/File.test.jsx:55` "no data on prod server" 케이스 수정:
   - 옵션 1: 해당 describe 의 `beforeEach` 에 `queryClient.clear()` 추가 (QueryClient 인스턴스 접근 가능 여부 점검).
   - 옵션 2: `findByText("Drop files here!", {}, { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` 로 2번째 options 인자에 timeout 여유. 단, REQ-20260421-002 의 `ASYNC_ASSERTION_TIMEOUT_MS` 재선정과 정합 필요.
4. (FR-04) 수정 후 실측:
   - `npm test -- --run --sequence.shuffle --sequence.seed=1` → 46/370 green
   - `--sequence.seed=2` → 46/370 green
   - `--sequence.seed=3` → 46/370 green
   결과 수치 result.md 에 박제.
5. (FR-05) `grep -rn "vi\.spyOn" src --include="*.test.jsx"` 전수 감사 후 `restoreAllMocks` 누락 파일 열거. 본 spec 범위 초과 건은 result.md 에 "후속 감사 필요" 로 1줄 박제 후 followup 분기.
6. (FR-06) `setupTests.timer-idiom.test.jsx` 수정은 REQ-001 관할 — 병렬 TSK 발행 시 수정 순서 명시 또는 REQ-001 선행 후 본 spec 실시.
7. `npm test` (기본 serial) → 46 files / 370 tests green 유지, `npm run lint` 0 warn/error.

### Baseline (2026-04-21, HEAD=afe109e)
- `grep -rn "vi\.restoreAllMocks" src --include="*.test.*"` → 9 hits in 5 files: `src/Search/Search.test.jsx:221`, `src/Log/LogItemInfo.test.jsx:58`, `src/File/FileItem.test.jsx:116, 132, 148, 163, 207, 236`, `src/Comment/CommentItem.test.jsx:18`, `src/common/UserLogin.test.jsx:18`. **부재**: `src/Log/LogItem.test.jsx` (0 hits, FR-01 대상), `src/Log/Writer.test.jsx`, `src/Log/Log.test.jsx`, `src/Log/LogSingle.test.jsx`, `src/File/FileDrop.test.jsx`, `src/File/FileUpload.test.jsx`, `src/File/File.test.jsx`, `src/Search/SearchInput.test.jsx`, `src/App.test.jsx`, `src/Monitor/Monitor.test.jsx`, `src/common/Navigation.test.jsx`, `src/Comment/Comment.test.jsx` (FR-05 감사 후보).
- `grep -rn "vi\.spyOn" src --include="*.test.jsx"` → 총 hits 다수 (100+). LogItem.test.jsx 는 6 describe × 2 spyOn = 12 hits.
- `src/test-utils/msw.test.js:29, 37, 57` — sibling-it 의존 3 hits.
- `src/File/File.test.jsx:55` — `no data on prod server` describe.
- 현 HEAD `npm test` (기본 serial) → 46 files / 370 tests green.
- `vitest run --sequence.shuffle` seed=1: 2 failed (baseline vs mine 동등), seed=2: 3 failed (동등). pre-existing 구조 문제 확인 (REQ 본문 수치 승계).

## 의존성
- 내부: `src/Log/LogItem.test.jsx`, `src/test-utils/msw.test.js`, `src/File/File.test.jsx`, `src/test-utils/msw.js` (`useMockServer`), `src/test-utils/timing.js` (옵션 2 채택 시 `ASYNC_ASSERTION_TIMEOUT_MS` 참조), `src/setupTests.js` (불변).
- 외부: `vitest` (`vi.spyOn`, `vi.restoreAllMocks`, `describe.sequential`), `@testing-library/react` (`findByText` options), `@tanstack/react-query` (`QueryClient.clear`).
- 역의존: REQ-20260421-001 (`setupTests.timer-idiom.test.jsx` 의 `[A]→[B]` 메타 어서트) — 교차 영향 조정 (FR-06). REQ-20260421-002 (`ASYNC_ASSERTION_TIMEOUT_MS` 재선정) — FR-03 옵션 2 채택 시 정합 필요. `vite.config.js:66+` (vitest `sequence.shuffle` 설정 — 수정 대상 아님).

## 테스트 현황
- [x] 현 HEAD `npm test` (기본 serial) → 46 files / 370 tests green (afe109e).
- [x] shuffle seed 1/2 에서 2/3 failed 재현 (REQ 본문 실측 수치).
- [ ] FR-01 적용 후 LogItem mock 누수 제거.
- [ ] FR-02 적용 후 msw.test.js sibling-it 독립.
- [ ] FR-03 적용 후 File.test.jsx cache race 해소.
- [ ] `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 전원 green (NFR-02).
- [ ] `for i in {1..10}; do npm test; done` 10회 green (NFR-05).
- [ ] `npm run lint` 0 warn / 0 error.

## 수용 기준
- [ ] (Must) FR-01 — `src/Log/LogItem.test.jsx` 최상단 또는 각 describe 에 `beforeEach(() => vi.restoreAllMocks())` 추가.
- [ ] (Must) FR-02 — `src/test-utils/msw.test.js:29, 37, 57` sibling-it 의존 3건 제거 (단일 `it` 병합 / `describe.sequential` / direct assertion 중 1안).
- [ ] (Must) FR-03 — `src/File/File.test.jsx:55` QueryClient cache race 해소 (`queryClient.clear()` 훅 또는 `findByText` timeout 여유 중 1안).
- [ ] (Must) FR-04 — `vitest run --sequence.shuffle --sequence.seed=1`, `seed=2`, `seed=3` 3회 실측 → 전원 46/370 green. 결과 수치 result.md 박제.
- [ ] (Must) `npm test` (기본 serial) → 46 files / 370 tests green 유지 (NFR-01).
- [ ] (Should) FR-05 — `grep -rn "vi\.spyOn" src --include="*.test.jsx"` 감사. 본 3 파일 외 `restoreAllMocks` 누락 파일 열거; 없으면 "감사 완료 — 추가 대상 0" 박제.
- [ ] (Should) FR-06 — REQ-20260421-001 (`setupTests.timer-idiom.test.jsx`) 수정 순서 명시 또는 병합 커밋.
- [ ] (Should) `for i in {1..10}; do npm test; done` 10회 전원 green (NFR-05).
- [ ] (Should) `npm run lint` 0 warn / 0 error (NFR-04).
- [ ] (NFR) `src/**/*.{js,jsx}` 중 `*.test.*` 제외 런타임 0건 수정. 수정 파일 ≤ 4 (3 test + 선택 `test-utils`) — NFR-03.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=afe109e):
  - `grep -n "vi\.spyOn" src/Log/LogItem.test.jsx` → 12 hits at `:53, :54, :113, :114, :180, :181, :235, :236, :290, :291, :351, :352`.
  - `grep -n "vi\.restoreAllMocks" src/Log/LogItem.test.jsx` → 0 hits (FR-01 대상).
  - `grep -n "beforeEach.*listen\(\)\|afterEach.*close\(\)" src/test-utils/msw.test.js` → 0 hits 라인 (주석 3건 `:24, :34, :56` 은 허용 예외).
  - `grep -n "sibling\|order-dependent\|sequential" src/test-utils/msw.test.js` → 분류 참고.
  - `grep -n "queryClient\|QueryClient" src/File/File.test.jsx` → FR-03 옵션 1 선택 시 도입 대상.
  - `grep -rn "vi\.restoreAllMocks" src --include="*.test.*"` → 9 hits in 5 files (FR-05 감사 baseline).
- **rationale**: 런타임 소스 (`src/**/*.{js,jsx}` 중 `*.test.*` 제외) 는 본 spec 수정 범위 밖 — cache/mock 누수는 테스트 유틸/테스트 파일에서만 해결. `vite.config.js` 의 `sequence.shuffle` 기본값 변경 금지 (본 spec 은 테스트 쪽 안전성만). `setupTests.timer-idiom.test.jsx` 수정은 REQ-20260421-001 관할 — 중복 금지. MSW 수명주기 (REQ-004) 및 env stub 이디엄 (REQ-005) 과 독립. FR-05 감사 결과 초과 파일은 followup 로만 분기 (본 spec 내 처리 금지).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-004 반영; shuffle flake 3축 — LogItem mock 누수 / msw.test.js sibling-it 의존 / File.test.jsx QueryClient cache race — 을 단일 spec 으로 집약) | all |
