# Search 도메인 loading dots 애니메이션 cleanup 회귀 게이트

> **위치**: `src/Search/Search.test.tsx:251+` (`describe('loading dots timer cleanup', ...)` 블록).
> **관련 요구사항**: REQ-20260420-004, TSK-20260420-16, REQ-20260517-076 FR-06
> **최종 업데이트**: 2026-05-17 (by inspector — Phase 1 reconcile I4 + FR-06-b marker 2건 hook-ack 플립 by TSK-20260517-12 / `3395318`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`893cdea`).

## 역할
Search 도메인의 fetch 응답 대기 중 표시되는 loading dots 애니메이션이 (a) fetch 미해결 promise stub 환경에서 `isLoading=true` 가 유지되어 애니메이션 관찰 가능 + (b) 컴포넌트 언마운트 시 setInterval / setTimeout timer leak 0건 두 회귀 보장 박제. 의도적으로 하지 않는 것: AbortController 기반 fetch 취소 정책 (별 spec — `runtime-fetch-abort` 후보), loading dots 시각 디자인 (CSS 영역), Search 도메인 다른 기능 (검색 결과 렌더링 / 페이지네이션 / 정렬 등 — 별 spec), fake timers 의 다른 사용 패턴 (별 spec — `testing/test-idioms` 영역 후보).

## 공개 인터페이스
- 없음 (테스트 fixture 계약). 본 spec 은 fixture 의 **테스트 의도 + cleanup 계약** 박제 — 직접 호출 인터페이스 없음.

## 동작
1. **(I1) `vi.useFakeTimers` + `vi.runOnlyPendingTimers` cleanup 박제**: 본 fixture 블록 `beforeEach` 에서 `vi.useFakeTimers({ shouldAdvanceTime: false })` + `afterEach` 에서 `vi.restoreAllMocks()` + `vi.unstubAllEnvs()`. fake timers 활성 동안 setInterval / setTimeout 등록이 real wall clock 진입을 막아 test isolation 유지.
2. **(I2) 미해결 fetch promise stub 계약**: `stubPendingFetch()` 헬퍼가 `vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => { /* never resolves */ }))` 형태로 fetch 를 미해결 promise 로 stub. caller (`Search` 컴포넌트) 의 `isLoading=true` 상태 유지 → loading dots 애니메이션 관찰 가능.
3. **(I3) loading dots 시각 측정 계약**: `getLoadingDotsText = () => document.getElementById('loading')?.textContent ?? ''` 헬퍼가 DOM 의 `#loading` element textContent (".", ".." 등) 측정. fake timer advance (`vi.advanceTimersByTime(300)`) 후 dots 1개씩 증가 (300ms 주기).
4. **(I4) timer leak 0건 계약**: 테스트 종료 후 `vi.restoreAllMocks()` 가 fetch spy 복원 + fake timers 가 모든 pending timer 정리. real wall clock 진입 시점에 unmount 된 컴포넌트의 setInterval 콜백이 실행되어 `act()` 경고 발생 / state 변경 시도 0 hit.
5. **(I5) `vi.stubEnv('PROD', true)` + `('DEV', false)` 환경 분기 계약**: 본 fixture 블록은 PROD 분기 동작 검증. `isDev()` / `isProd()` 헬퍼 (`common/env.md` referer) 가 본 fixture 의 환경 stub 을 lazy 평가로 읽어 분기.
6. **(I6) 범위 제한**: 본 spec 은 Search 도메인 loading dots cleanup 한정. 다른 도메인 (Log / Monitor / File 등) 의 fetch loading 상태 관리 / cleanup 은 별 spec / 별 fixture.

### 회귀 중점
- `beforeEach` 의 `vi.useFakeTimers` 제거 시 (I1) 위반 — real wall clock 진입으로 test isolation 깨짐 + flaky.
- `afterEach` 의 `vi.restoreAllMocks()` 제거 시 (I1)(I4) 위반 — fetch spy 누적 / timer leak 표면.
- `stubPendingFetch` 가 `mockResolvedValue` 또는 `mockImplementation(() => Promise.resolve(...))` 로 변경 시 (I2) 위반 — `isLoading` 즉시 false 전환으로 dots 애니메이션 관찰 불가.
- 컴포넌트 측 setInterval cleanup (useEffect return 함수) 누락 시 (I4) 위반 — fake timer 환경에서는 leak 0 외관이나 production 환경에서 메모리 leak.
- `vi.stubEnv` 미사용 시 (I5) 위반 — vitest 기본 `DEV=true` 가 분기 비결정 표면.

## 의존성
- 내부: `src/Search/Search.test.tsx` (본 fixture 박제 위치), `src/Search/Search.{tsx,jsx}` (테스트 대상 — loading dots UI), `src/common/env.ts` (분기 헬퍼).
- 외부: `vitest` (`vi.useFakeTimers` / `vi.spyOn` / `vi.stubEnv` / `vi.advanceTimersByTime`), `@testing-library/react` (render / unmount), `jsdom` (DOM 측정).
- 역의존: 없음 (테스트 영역).
- 직교: `common/env.md` (env 헬퍼 영역 — 본 fixture 의 (I5) 환경 stub 영역), `tooling.md` (Vitest coverage 영역).

## 테스트 현황
- [x] (I1) `vi.useFakeTimers` + `vi.restoreAllMocks` cleanup: `grep -nE "useFakeTimers|restoreAllMocks" src/Search/Search.test.tsx` → 2+ hits @:266,272. HEAD=`893cdea` 실측 PASS.
- [x] (I2) 미해결 fetch promise stub: `grep -nE "never resolves|new Promise\(\(\) =>" src/Search/Search.test.tsx` → 1 hit @:258 (`never resolves` 주석 + stub 본문). HEAD=`893cdea` 실측 PASS.
- [x] (I3) loading dots 시각 측정: `grep -nE "getLoadingDotsText|getElementById\('loading'\)" src/Search/Search.test.tsx` → 1+ hit @:254. HEAD=`893cdea` 실측 PASS.
- [x] (I4) timer leak 0건: `npx vitest run src/Search/Search.test.tsx 2>&1 | grep -cE "act\(\)|Warning: An update.*was not wrapped|console\.error"` → **0 hit**. HEAD=`472611f` 실측 PASS (TSK-20260517-12 / `3395318` 수렴 ack — `src/Search/Search.test.tsx:270-271` `vi.runOnlyPendingTimers()` + `vi.useRealTimers()` afterEach 박제로 fake timer pending callback drain + real wall clock 복귀). result.md DoD 점검: `npm run lint` 0 issue / `npm test` 48 files 439 PASS / `npm run build` PASS / Search 도메인 12 it 회귀 보존.
- [x] (I5) `vi.stubEnv` 환경 분기: `grep -nE "stubEnv\('PROD'|stubEnv\('DEV'" src/Search/Search.test.tsx` → 2+ hits @:264,265. HEAD=`893cdea` 실측 PASS.
- [x] (I6) 범위 제한: 정의상 항상 참.

## 수용 기준
- [x] (Must, FR-06-a) fetch 미해결 promise stub 환경에서 `isLoading=true` 유지 + dots 애니메이션 관찰 가능 — §동작 (I2)(I3).
- [x] (Must, FR-06-b) 컴포넌트 언마운트 시 timer leak 0건 (vitest `vi.useFakeTimers` + `vi.runOnlyPendingTimers` 검증) — §동작 (I4). TSK-20260517-12 / `3395318` 수렴 ack — `vi.runOnlyPendingTimers()` (L270) + `vi.useRealTimers()` (L271) afterEach 박제로 fake timer drain + real wall clock 복귀, `act()` 경고 / console.error 0 hit.
- [x] (Should) `vi.stubEnv` 환경 분기 (PROD / DEV) 명시 — §동작 (I5).
- [x] (Must, 범위 제한) 다른 도메인 fetch loading 상태 / AbortController 정책 / 시각 디자인은 본 게이트 범위 밖.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`893cdea`, 2026-05-17):
  - `sed -n '248,275p' src/Search/Search.test.tsx` → fixture 블록 본문 박제 (REQ-20260420-004 / TSK-20260420-16 의도 주석 @:251 + describe @:252 + getLoadingDotsText @:254 + stubPendingFetch @:257 + never resolves 주석 @:258 + beforeEach `useFakeTimers` @:263-266 + afterEach `restoreAllMocks` @:268-272).
  - `grep -nE "loading dots timer cleanup|REQ-20260420-004|TSK-20260420-16" src/Search/Search.test.tsx` → 1+ hit @:251 (의도 주석 + REQ/TSK referer).
  - `grep -nE "useFakeTimers|restoreAllMocks|unstubAllEnvs|stubEnv\('PROD'|stubEnv\('DEV'" src/Search/Search.test.tsx` → 5+ hits (cleanup 계약 박제).
- **rationale**: (I1)(I2)(I3)(I5)(I6) 본 spec 박제 시점 PASS — 즉시 [x]. (I4) timer leak 0건 측정은 CI 회귀 실행 위임 — 본 spec 은 fixture 의 cleanup 계약 (I1) 박제로 leak 예방 보장.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — Search 도메인 loading dots cleanup fixture 의 6 축 (I1~I6) 게이트. baseline: `src/Search/Search.test.tsx:251+` describe 블록 박제 + fake timers + 미해결 fetch stub + getLoadingDotsText 헬퍼 + stubEnv PROD/DEV 분기. 원전 REQ-20260420-004 / TSK-20260420-16 보존. | all |
| 2026-05-17 | inspector (Phase 1 reconcile) / TSK-20260517-12 `3395318` | (I4) + Must FR-06-b marker 2건 `[ ]→[x]` 플립. ack: `60.done/2026/05/17/task/search-loading-dots-real-timer-cleanup/result.md` DoD 점검 (lint exit 0 / test 48 files 439 PASS / Search 도메인 12 it 회귀 보존 / build PASS) + DoD grep 게이트 `npx vitest run src/Search/Search.test.tsx 2>&1 \| grep -cE "act\\(\\)\|Warning: An update.*was not wrapped\|console\\.error"` → 0 hit. src 변경: `src/Search/Search.test.tsx:270-271` 에 `vi.runOnlyPendingTimers()` + `vi.useRealTimers()` 2 호출 prepend (loading dots timer cleanup describe afterEach 본문). HEAD=`472611f` 시점 재실측 PASS — pending callback drain + real wall clock 복귀로 test isolation 보장. | §테스트 현황 (I4) + §수용 기준 Must FR-06-b |

## 참고
- **REQ 원문 / TSK 원문**: REQ-20260420-004 (Search timer cleanup), TSK-20260420-16 (cleanup 회수 done), REQ-20260517-076 (본 세션 mv 후).
- **관련 spec**:
  - `specs/30.spec/blue/common/test-idioms.md` (vitest 사용 일반 — 본 spec 의 fake timers 영역과 인접).
  - `specs/30.spec/green/common/env.md` (env 헬퍼 영역 — 본 fixture (I5) `vi.stubEnv` 영역).
- **RULE 준수**:
  - RULE-07: 6 불변식 (I1~I6) 모두 시점 비의존 평서문 + `grep` / vitest 재현 가능.
  - RULE-06: grep-baseline 3 gate 실측 박제.
  - RULE-01: inspector writer 영역만 (`30.spec/green/testing/search-abort-runtime-smoke.md` create).
