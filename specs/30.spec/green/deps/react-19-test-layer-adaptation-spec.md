# React 19 호환 테스트 레이어 어댑테이션 (fake-timer + MSW teardown)

> **위치**: `src/**/*.test.{js,jsx}` (fake-timer 41 hits in 15 files / MSW listen-close 복수 파일), `src/setupTests.js:1-?`
> **관련 요구사항**: REQ-20260420-004
> **최종 업데이트**: 2026-04-20 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
React 19 bump(TSK-20260420-30) 를 차단한 **테스트 레이어 두 패턴** 을 React 18 현행 green 을 유지하면서 선행 해제한다:
(A) `vi.useFakeTimers()` (인자 없음/`'modern'`) + `await findByX`/`waitFor` 가 React 19 `act` 모델과 testing-library v16 의 폴링에서 멈추는 문제,
(B) MSW `setupServer()` 의 `listen()`/`close()` 가 테스트 본문 수준에서 호출되어 선행 실패 시 `close()` 미도달 → 다음 테스트의 `listen()` 이 중첩 listen Invariant 를 발생시키는 문제.
런타임 소스 변경, React 19 신규 API, `.tsx` 전환, `prop-types` 제거는 하지 않는다.

## 공개 인터페이스
변경 없음. 테스트 전용 이디엄만 조정:
- fake-timer 진입점: `vi.useFakeTimers({ shouldAdvanceTime: true })` (기본 전략) **또는** `await vi.runAllTimersAsync()` / `await vi.advanceTimersByTimeAsync(ms)` (await 전환 전략).
- MSW 수명 주기: `beforeEach(() => server.listen({ onUnhandledRequest: 'error' }))` / `afterEach(() => server.close())` 패턴 강제.
- 선택적 헬퍼: `src/test-utils/msw.js` (Should, 추출 여부는 planner 결정).

## 동작
1. 41 hits (`vi.useFakeTimers(` 현행 baseline) 전 건 중 **인자 없는 호출** 과 `'modern'` 문자열 인자 호출을 다음 중 하나로 전환:
   - `vi.useFakeTimers({ shouldAdvanceTime: true })` — `findBy*`/`waitFor` 의 real-clock 폴링 보조.
   - `await vi.runAllTimersAsync()` / `await vi.advanceTimersByTimeAsync(ms)` — 명시적 await 기반 시간 진행.
   - 기존 `{ shouldAdvanceTime: false }` 호출(예: `src/Search/Search.test.jsx:214`) 은 의도적 — 옵션 객체 형태이므로 FR-01 잔존 0 기준에서 제외 (옵션 객체 호출은 허용).
2. MSW `setupServer(...)` 를 consume 하는 모든 테스트 파일의 `listen()`/`close()` 를 `beforeEach`/`afterEach` (또는 공통 `beforeAll`/`afterAll` + `resetHandlers`) 로 이동.
   - 테스트 본문 `mock.xxxServer.listen()` 직접 호출 잔존 0.
   - 스위트당 단일 server 인스턴스 사용이 가능하면 `beforeAll`+`resetHandlers`+`afterAll` 패턴 권장.
3. React 18.x 의존성 기준 `npm run test` 360/360 green 유지. coverage 보고서 정상 생성.
4. 사용 규칙(`shouldAdvanceTime` vs `runAllTimersAsync` 선택 기준, MSW teardown 이디엄) 을 `src/setupTests.js` 헤더 주석 또는 `docs/` 1곳에 박제 (NFR-03).
5. TSK-20260420-30 재개용 단위 어서트: 관찰된 실패 패턴 2종이 재현되지 않음을 테스트로 박제 (Should).

### 대상 파일 (baseline 2026-04-20)
- fake-timer 15 files / 41 hits:
  - `src/Toaster/Toaster.test.jsx` (5건; :5, :73, :95, :146, :180)
  - `src/Monitor/VisitorMon.test.jsx` (1건; :27 `'modern'`)
  - `src/Monitor/ContentItem.test.jsx` (9건; :27, :48, :69, :92, :115, :137, :164, :192, :222 — 모두 `'modern'`)
  - `src/File/FileDrop.test.jsx` (2건; :106, :183)
  - `src/File/FileUpload.test.jsx` (2건; :80, :159)
  - `src/File/File.test.jsx` (2건; :156, :230)
  - `src/Comment/CommentItem.test.jsx` (1건; :72)
  - `src/Comment/Comment.test.jsx` (1건; :158)
  - `src/Search/Search.test.jsx` (1건; :214 — 이미 옵션 객체 `{ shouldAdvanceTime: false }`, 전환 제외)
  - `src/Search/SearchInput.test.jsx` (1건; :132)
  - `src/common/useHoverPopup.test.jsx` (4건; :23, :48, :120, :135)
  - `src/Log/Writer.test.jsx` (7건; :65, :115, :165, :232, :284, :335, :427)
  - `src/Log/LogItem.test.jsx` (3건; :70, :304, :367)
  - `src/Log/LogSingle.test.jsx` (1건; :86)
  - `src/Log/LogItemInfo.test.jsx` (1건; :65)
- MSW `setupServer` 정의: `src/Monitor/api.mock.js`, `src/File/api.mock.js`, `src/Comment/api.mock.js`, `src/Image/api.mock.js`, `src/Search/api.mock.js`, `src/Log/api.mock.js` (6 모듈). 소비 사이트는 `.listen()`/`.close()` grep baseline 참조.

## 의존성
- 내부: `src/setupTests.js` (공통 setup), 각 테스트 파일의 `api.mock.js` import, `vitest` 설정 (`vite.config.js:66-81`).
- 외부: `vitest ^3.x` (fake-timer `shouldAdvanceTime`, `runAllTimersAsync`), `@testing-library/react` (현행 v13, post-bump v16), `msw` (`setupServer().listen/close`).
- 역의존: TSK-20260420-30 (`specs/50.blocked/task/TSK-20260420-30-react-19-upgrade_reason.md`) — 본 spec 완료 후 bump 재실행 가능.

## 테스트 현황
- [x] React 18.x 환경 `npm run test` 360/360 green (baseline 2026-04-20).
- [x] bump 시도 시 53 failed / 307 passed — 패턴 A/B 재현 (reason.md 관찰).
- [ ] 어댑테이션 후 React 18.x 기준 360/360 green 유지.
- [ ] `npm run test` 3회 연속 flake 0 (NFR-01).
- [ ] `npm run lint` 경고·오류 증감 0 (FR-05).
- [ ] 재발 방지 단위 어서트 1건 이상 (FR-07, Should).

## 수용 기준
- [ ] (Must) `grep -rn "vi\.useFakeTimers(\s*)" src/ --include="*.test.js" --include="*.test.jsx"` → **인자 없는** 호출 0 매칭 (옵션 객체 또는 async API 형태만 잔존).
- [ ] (Must) `grep -rn "vi\.useFakeTimers('modern')" src/ --include="*.test.js" --include="*.test.jsx"` → 0 매칭 (`'modern'` 문자열 인자 제거).
- [ ] (Must) `grep -rn "\.listen(" src/ --include="*.test.js" --include="*.test.jsx"` 결과의 모든 호출이 `beforeEach`/`beforeAll` 블록 내부 (테스트 본문 직접 호출 0). planner 가 발행 시점 재스캔하여 박제.
- [ ] (Must) `npm run test` exit 0 + 360/360 green + coverage 보고서 생성.
- [ ] (Must) `npm run test` 3회 연속 실행 — 매회 green + flake 0.
- [ ] (Must) `npm run lint` 경고·오류 증감 0.
- [ ] (Must) `src/Toaster/Toaster.test.jsx`, `src/Log/Writer.test.jsx`, `src/Log/LogSingle.test.jsx`, `src/Log/LogItem.test.jsx`, `src/Monitor/VisitorMon.test.jsx`, `src/Monitor/ContentItem.test.jsx`, `src/File/File.test.jsx`, `src/File/FileUpload.test.jsx`, `src/File/FileDrop.test.jsx`, `src/Comment/Comment.test.jsx` 10개 파일의 case 수·assert 수 회귀 0 (삭제 0, 감소 0).
- [ ] (Should) 공통 MSW 헬퍼 `src/test-utils/msw.js` 추출 — 중복 제거.
- [ ] (Should) fake-timer + await 이디엄 규칙을 `src/setupTests.js` 헤더 주석 또는 `docs/` 1곳에 박제.
- [ ] (Should) 패턴 A/B 재현 방지 단위 어서트 1건 이상 추가.
- [ ] (NFR) `npm run test` wall-clock 회귀 ±10% 내.
- [ ] (NFR) coverage line/statement 비율 회귀 ±0.5% 내.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `grep -rn "vi\.useFakeTimers(" src/ --include="*.test.js" --include="*.test.jsx"` → 41 hits in 15 files (전량 나열: 본문 "대상 파일" 섹션). `src/Search/Search.test.jsx:214` 는 이미 옵션 객체 형태 → 전환 대상 제외.
  - `grep -rn "setupServer" src/ --include="*.js" --include="*.jsx"` → 정의 6 files (`*/api.mock.js`). 소비 사이트의 `.listen(` / `.close(` 호출은 `src/Monitor/*.test.jsx`, `src/File/*.test.jsx`, `src/Comment/Comment*.test.jsx`, `src/Search/*.test.jsx` 등에 분포 (planner 발행 시 재스캔).
  - `grep -rn "process\.env\.NODE_ENV" src --include="*.test.*"` → 44 hits in 6 files (본 spec 과 무관, REQ-20260420-005 영역이므로 건드리지 않음).
- **rationale**: 테스트 레이어 이디엄만 조정. 런타임 소스 `src/**/*.{js,jsx}` 본문 변경 금지. React 19 bump(`package.json` 필드) 도 본 scope 밖 — 별도 TSK-20260420-30 담당. `src/Search/Search.test.jsx:214` 의 의도적 `{ shouldAdvanceTime: false }` 는 보존. `.test.*` 에서의 `process.env.NODE_ENV` stub 은 REQ-20260420-005 와 중복 — 본 spec 은 그 영역을 수정하지 않음.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-004 반영) | all |
| 2026-04-20 | TSK-20260420-35-a / e4a470b | fake-timer 이디엄 carve 완료 — Must §수용 기준 1/2 (`vi.useFakeTimers()` / `'modern'` grep 0) 실증. MSW lifecycle 은 pair TSK-20260420-35-b 대기 → DoD 체크박스는 pair 완료 시 일괄 플립. | §수용 기준 (부분), §테스트 현황 |
