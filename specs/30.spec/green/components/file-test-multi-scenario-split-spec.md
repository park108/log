# File.test.jsx 시나리오 분할 & Delete→refresh 커버리지 복원

> **위치**: `src/File/File.test.jsx` 의 `describe("File render files, next, delete on prod server")` (보조: `:57-130`), 보조 대상 `src/File/FileItem.jsx:28` `setTimeout(refreshFiles, refreshTimeout)`.
> **관련 요구사항**: REQ-20260421-008
> **최종 업데이트**: 2026-04-21 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=ae80e56).

## 역할
`src/File/File.test.jsx` 의 `prodServerOk` describe 하위 단일 `test("render files, next files, delete file and confirm on prod server")` 블록이 네 개의 상이한 시나리오(list 확장 → empty flush → Copy URL toaster → Delete click)를 일괄 실행한다. TSK-20260421-47 의 β 하이브리드 재편 이후 Delete click 은 assertion 없이 "fire-and-forget" 로 남아 `FileItem.deleteFileItem` → `setTimeout(refreshFiles, 3000)` → files 재조회 경로가 실질적으로 커버되지 않는다. 본 spec 은 단일 `test` 블록을 시나리오별로 분할하고, Delete 시점의 API 호출 및 3000ms 후 refresh 경로를 검증하는 테스트를 독립 `test` 로 복원한다. 런타임 소스(`src/File/File.jsx`, `src/File/FileItem.jsx`) 수정, Toaster conditional mount 도입(REQ-20260421-009 관할), 다른 test 파일의 유사 패턴 전수 조사는 본 spec 밖.

## 공개 인터페이스
- **FR-01 (Must) — 목록 확장 시나리오 분리**: `prodServerOk` describe 내부에 `test("See more expands the list to 10 items")` 를 추가. 기존 `findAllByRole("listitem")` 초기 7건 → `seeMoreButton` click → `findByText("308142rg.jpg")` → `findAllByRole("listitem")` 10건 검증으로 구성.
- **FR-02 (Must) — Empty flush 시나리오 분리**: `test("See more → empty next page keeps current list")` 를 추가. `prodServerOk` 핸들러가 두 번째 `getNextFiles` 호출에서 empty body 를 반환하는 흐름을 유지하되, assertion 은 "10 items 유지" 또는 "seeMoreButton 사라짐(`queryByTestId("seeMoreButton") == null`)" 중 하나로 명시.
- **FR-03 (Must) — Copy URL toaster 시나리오 분리**: `test("Copy URL shows success toaster")` 를 추가. `navigator.clipboard.writeText` mock + 첫 listitem button click → `findByText(/URL copied\.$/)` assertion. Toaster 셀렉터 우회(`document.querySelector('[data-type="information"]...')`) 는 유지 가능 (REQ-009 이 해결할 때까지 임시).
- **FR-04 (Must) — Delete handler 호출 검증**: `test("Delete triggers delete API")` 를 추가. Delete button click 경로에서 `src/File/api` 의 `deleteFile` 을 `vi.spyOn(api, "deleteFile")` 또는 MSW `onRequest`/핸들러 호출 카운트로 감시 → 호출 횟수 ≥ 1 assertion. `window.confirm` 은 true 반환 mock.
- **FR-05 (Must) — Delete → 3000ms refresh 검증**: `test("Delete triggers refresh after 3s timeout")` 를 추가. `vi.useFakeTimers({ shouldAdvanceTime: true })` 또는 `vi.useFakeTimers()` + `vi.advanceTimersByTime(3000)` 조합으로 `FileItem.jsx:28` 의 `setTimeout(refreshFiles, 3000)` 발화 → files 재조회(두 번째 `getFiles` 호출) 발생을 MSW 핸들러 카운트 또는 `vi.spyOn(api, "getFiles")` 로 검증.
- **FR-06 (Should) — 리셀렉션 일관성**: 분할된 각 `test` 는 stale button 참조를 쓰지 않도록 `await screen.findByRole(...)` / `findByTestId(...)` 로 재질의. 기존 `const buttonsBeforeSeeMore2 = screen.getAllByRole("button")` 후 배열 인덱스 click 패턴은 분리된 시나리오 내에서만 허용.
- **FR-07 (Must) — 기존 혼합 test 제거**: `describe("File render files, next, delete on prod server")` 에서 기존 단일 `test("render files, next files, delete file and confirm on prod server")` 본문을 제거하고 위 FR-01~05 의 test 들로 대체. `test` 헤더 제목은 NFR-03 에 맞춰 서술형.
- **FR-08 (Must) — 전체 테스트 수 증가 박제**: spec `§Baseline` 및 result.md 에 `-1 test + 5 test = +4 test` (`File.test.jsx` 기준; 기존 서두의 `'redirect to log when user is not admin'` test + `prodServerHasNoData` describe 1건 + `prodServerOk` 내부 5건) 증가 수치를 박제.
- **FR-09 (Should) — shuffle seed 안정성**: 분할 후 `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail. serial(`npm test -- --run`) 도 0 fail.

## 동작
1. (FR-01) 기존 `prodServerOk` describe 의 `beforeEach` 또는 공통 세팅(env stub, `common.isAdmin` mock, `render` 호출)을 describe-level `beforeEach` 로 추출(또는 각 `test` 내부 중복 선언). 첫 `test` 는 7 items → `seeMoreButton` click → 8th file text → 10 items 확인.
2. (FR-02) 두 번째 `test` 는 10 items 상태에서 `seeMoreButton` 재클릭 → 다음 페이지 empty response 후 "10 items 유지" 또는 "`seeMoreButton` 사라짐" 중 택일 assertion.
3. (FR-03) 세 번째 `test` 는 `Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })` 세팅 후 listitem 내부 첫 button click → `findByText(/URL copied\.$/)` 만 assertion. Loading toaster 숨김 확인은 옵션 (REQ-009 해소 전까지 현재 우회 방식 유지 가능).
4. (FR-04) 네 번째 `test` 는 `vi.spyOn(window, "confirm").mockReturnValue(true)` + `vi.spyOn(api, "deleteFile")` (혹은 MSW `onRequest` 카운트) → listitem 내 2번째 button(Delete) 에 해당하는 요소를 `findByRole("button", { name: /delete/i })` 또는 확정 셀렉터로 선택 → click → `expect(deleteFile).toHaveBeenCalledTimes(1)` (또는 동등). 기존 `queryAllByRole("button")[1]` 인덱스 패턴은 fallback 으로만 허용 (첫 시도는 이름/testid).
5. (FR-05) 다섯 번째 `test` 는 `vi.useFakeTimers()` 로 fake timer 설치, `render` 후 delete 흐름을 FR-04 와 동일하게 수행, 단 이 경우 `vi.advanceTimersByTime(3000)` 호출 + `vi.runOnlyPendingTimersAsync()` (또는 `await act` 아래에서 timer advance) → 두 번째 `getFiles` 호출 여부를 `vi.spyOn(api, "getFiles")` 의 call count 로 검증. afterEach 에서 `vi.useRealTimers()` 복원 (RULE setupTests LIFO 관례와 정합).
6. (FR-07) 기존 `prodServerOk` describe 내부의 단일 혼합 `test` 블록은 삭제. 상단 두 개 다른 `test`(`redirect to log...`, `prodServerHasNoData` describe 내부 1건) 는 불변.
7. (FR-08, FR-09) `npm test -- --run` → `test files 46`, `tests` = 현재 총합 + 4 (수치는 result.md 에서 실측 박제). `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail.

### Baseline (2026-04-21, HEAD=ae80e56)
- `grep -n "^describe\\|^test\\|^it(" src/File/File.test.jsx` → 예상: `test('redirect to log when user is not admin')` 1건 + `describe('File render files but no data on prod server')` 내 `test(...)` 1건 + `describe('File render files, next, delete on prod server')` 내 `test(...)` 1건 = 총 3 `test`. (※ 분할 후 기대값 총 7 `test` — +4 증가.)
- `grep -n "screen.queryAllByRole\\|fireEvent.click(buttonsForDelete" src/File/File.test.jsx` → `:126, :128` (FR-04 리셀렉션 대상).
- `grep -n "setTimeout(refreshFiles" src/File/FileItem.jsx` → `:28` (FR-05 검증 대상, runtime 불변).
- `grep -n "vi.useFakeTimers\\|vi.useRealTimers" src/File/File.test.jsx` → 0 hits (fake timer 미사용 상태 — FR-05 이후 ≥2 hits 예상).
- `grep -n "vi.spyOn(api" src/File/File.test.jsx` → 0 hits (FR-04/05 이후 ≥1 hits).
- `grep -n "document.querySelector.*data-type=" src/File/File.test.jsx` → `:99` (REQ-009 해결 전까지 유지 허용).

## 의존성
- 내부: `src/File/File.test.jsx` (수정 대상), `src/File/api.js` (`getFiles`, `getNextFiles`, `deleteFile` — spy 대상), `src/File/api.mock.js` (`prodServerOk`, `prodServerHasNoData`), `src/File/FileItem.jsx` (runtime 불변 — `setTimeout(refreshFiles, 3000)` 경로), `src/File/File.jsx` (runtime 불변), `src/test-utils/msw.js` (`useMockServer`), `src/test-utils/timing.js` (`ASYNC_ASSERTION_TIMEOUT_MS` 사용 가능).
- 외부: `vitest` (`vi.useFakeTimers`, `vi.advanceTimersByTime`, `vi.spyOn`, `vi.runOnlyPendingTimersAsync`), `@testing-library/react` (`findByRole`, `findByText`, `findByTestId`, `waitFor`).
- 역의존: REQ-20260421-009 (Toaster conditional mount 또는 헬퍼) — FR-03 의 Loading toaster 셀렉터 우회는 해당 REQ 해소 후 헬퍼로 치환 가능. REQ-20260421-007 (shuffle-safety) — 독립이나 FR-09 shuffle 실측 결과가 공통 대시보드 역할.

## 테스트 현황
- [x] 현 HEAD `npm test` (serial) → 0 fail (ae80e56).
- [ ] FR-01 목록 확장 단독 test.
- [ ] FR-02 empty flush 단독 test.
- [ ] FR-03 Copy URL toaster 단독 test.
- [ ] FR-04 Delete API 호출 assertion.
- [ ] FR-05 Delete → 3000ms refresh assertion (fake timer).
- [ ] FR-07 기존 혼합 test 제거.
- [ ] FR-09 `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail.

## 수용 기준
- [ ] (Must) FR-01 — `test("See more expands the list to 10 items")` 가 독립 `test` 로 존재.
- [ ] (Must) FR-02 — `test(...empty next page...)` 가 독립 `test` 로 존재.
- [ ] (Must) FR-03 — `test(...Copy URL...)` 가 독립 `test` 로 존재. `expect(...)` 로 toaster 메시지 검증.
- [ ] (Must) FR-04 — Delete test 에서 `deleteFile` spy 또는 MSW 핸들러 카운트 ≥ 1 assertion 통과.
- [ ] (Must) FR-05 — `vi.useFakeTimers` + `vi.advanceTimersByTime(3000)` 또는 동등 방식으로 refresh 경로(`getFiles` 재호출) 호출 ≥ 1 assertion 통과.
- [ ] (Must) FR-07 — `src/File/File.test.jsx` 에서 단일 혼합 `test("render files, next files, delete file and confirm on prod server")` 제거.
- [ ] (Must) FR-08 — result.md 에 `File.test.jsx` 의 `test` 개수 증가분(`+4`) 및 전체 test 합계 전/후 수치 박제.
- [ ] (Must) `npm test -- --run` → 0 fail 유지 (NFR-04).
- [ ] (Should) FR-06 — 분할 후 `screen.getByTestId("seeMoreButton")` 등 sync query 가 stale 참조를 포함하지 않음. 필요 시 `findByTestId` 사용.
- [ ] (Should) FR-09 — `vitest run --sequence.shuffle --sequence.seed={1,2,3}` 3회 0 fail. 결과 수치 result.md 박제.
- [ ] (NFR) `git diff src/File/File.jsx src/File/FileItem.jsx` 변경 0 라인 (NFR-04).
- [ ] (NFR) `vi.useFakeTimers()` 사용 test 는 afterEach 에서 `vi.useRealTimers()` 복원 (setupTests LIFO 관례 정합).

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=ae80e56):
  - `grep -n "^test\\|^describe\\|	test(\\|	it(" src/File/File.test.jsx` → (스냅샷) top-level `test(...)` 1건 + `describe(...)` 2건, 각 describe 내부 `test(...)` 1건 = 총 3 `test`.
  - `grep -n "screen.queryAllByRole" src/File/File.test.jsx` → 1 hit at `:126` (FR-04 대상 재구성).
  - `grep -n "setTimeout(refreshFiles" src/File/FileItem.jsx` → 1 hit at `:28` (runtime 불변 기준).
  - `grep -n "vi.useFakeTimers\\|vi.useRealTimers" src/File/File.test.jsx` → 0 hits (FR-05 후 ≥2 hits).
  - `grep -n "vi.spyOn(api\\|vi.spyOn(mock\\|vi.spyOn(.*, *\"deleteFile\"\\|vi.spyOn(.*, *\"getFiles\"" src/File/File.test.jsx` → 0 hits (FR-04/05 후 ≥1 hits).
- **rationale**: 수정 범위는 `src/File/File.test.jsx` 한 파일. runtime 소스(`src/File/File.jsx`, `src/File/FileItem.jsx`) 는 변경 금지 — FR-05 의 `setTimeout(refreshFiles, 3000)` 은 현 runtime 경로 그대로 fake timer 로 검증. Toaster conditional mount 는 REQ-009 관할이므로 본 spec 에서 Loading toaster 셀렉터 우회 제거는 목표 아님 (FR-03 에서 단지 test 분리만).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-008 반영; File.test.jsx 단일 혼합 test 를 5개 test 로 분할, Delete→refresh 커버리지 fake timer 로 복원) | all |
