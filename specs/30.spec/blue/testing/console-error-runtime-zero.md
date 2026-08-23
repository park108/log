# TS island Component runtime `console.error` 채널 0 hit — dev-mode 런타임 warning 흐름 박제

> **위치**: TS island 확정 디렉터리 (`island-proptypes-zero.md` 정의 3축 동시 충족) Component 의 test 채널 또는 e2e/smoke 채널.
> **관련 요구사항**: REQ-20260517-091 (TSK-20260517-21 followup `20260517-1830-island-proptypes-zero-manual-verify` 흡수).
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제, REQ-091 흡수 / TSK-21 DoD 마지막 항목 (수동 dev 서버 console.error 부재 확인) 자동화 부재 audit 회수).

> 참조 코드는 **식별자 우선**. 라인 번호는 박제 시점 스냅샷 (HEAD=`b76dc02`).

## 역할
TS island 확정 디렉터리 Component 가 dev-mode test 채널 또는 e2e/headless smoke 채널에서 mount + 정상 인터랙션 시 `console.error` 채널에 React dev-mode runtime warning (prop-types 위반 / missing key / concurrent update during render / hook order 위반) 발화 0 hit 라는 시스템 불변식. 본 효능은 (a) `island-proptypes-zero.md` (REQ-088, selector M-B 정적 채널) + (b) `typecheck-island-extension.md` (REQ-077, typecheck error 정적 채널) + (c) `lint-warning-zero-gate.md` (REQ-080, ESLint warning 정적 채널) + (d) `eslint-react-hooks-lint-gate.md` (REQ-087, hook 규칙 정적 채널) 4 정적 채널과 직교 — 정적 4축이 모두 PASS 여도 runtime mount 시 dev-mode 가 발화하는 console.error 흐름은 별 채널로 독립 측정된다. 의도적으로 하지 않는 것: runtime warning 측정 수단 선정 (vitest `vi.spyOn(console, 'error')` + fail-fast assertion vs e2e (playwright/cypress) headless console capture vs CI 외부 script vitest stderr capture + grep — 어느 채널이든 본 효능 충족 시 수용, 수단 중립), 현 silence 패턴 (test 파일의 `vi.spyOn(console, 'error').mockImplementation(() => {})` 자체) 제거 (legacy snapshot / 분석 영역 보존 — silence 분리 + fail-fast assertion 추가 보강만 박제 — 본 spec §스코프 규칙 G2 baseline 박제 한정), production 번들 (NODE_ENV=production) runtime warning (React 18 의 prop-types 채널은 dev-mode 한정 — 별 axis), `console.warn` / `console.log` 채널 (React dev-mode 경고는 대부분 console.error 한정 — 다른 채널은 별 axis), uncaught Promise rejection (`unhandledrejection` 이벤트 — 별 채널), 비-island 디렉터리 (`src/Log/`, `src/Monitor/` — island 정의 3축 중 1+ 축 미충족, `src-typescript-migration` 후행 영역 — island 수렴 시점 본 게이트 자동 적용), 시각 회귀 (pixel diff — 별 영역), performance budget runtime 신호 (web-vitals — 별 axis), 운영자 1회 수동 검증 (시스템 불변식 아님 — RULE-07 음성).

## 공개 인터페이스
- 측정 대상 디렉터리: TS island 확정 디렉터리 (`island-proptypes-zero.md` §공개 인터페이스 정의 3축 (확장자 0 + typecheck error 0 + selector M-B 0) 동시 충족 디렉터리).
- 측정 채널:
  - **(C-A) test 채널 — vitest spy + fail-fast assertion**: TS island Component test 파일 (`*.test.{tsx,jsx}`) 에 `vi.spyOn(console, 'error')` 등록 후 `afterEach` 또는 `afterAll` 단에서 `expect(spy).not.toHaveBeenCalledWith(stringMatching(<runtime warning pattern>))` 형태 assertion 발화 — runtime warning 발화 시 test fail-fast.
  - **(C-B) e2e/smoke 채널 — headless console capture**: playwright / cypress 등 headless browser 가 페이지 console 이벤트 capture 후 `console.error` 메시지 패턴 매칭 → fail-fast.
  - **(C-C) CI 외부 stderr capture**: CI step 이 `npm test 2>&1` 또는 동등 stream 을 capture 후 `grep -cE "Warning: (Failed prop type|Each child in a list|Cannot update.*during render|hook .*order)"` 형태로 카테고리 라벨 grep — 0 hit 검증.
- 측정 명령 (수단 중립 — 1+ 채널 박제 시 효능 충족):
  - (M-A) `npm test 2>&1 | grep -cE "Warning: (Failed prop type|Each child in a list|Cannot update.*during render|hook .*order)"` → 0 hit (CI stderr grep 단일 진단 — FR-04 충족 채널).
  - (M-B) test 파일 단위 `expect(spy).not.toHaveBeenCalledWith(stringMatching(<pattern>))` assertion 발화 시점 → 위반 0 hit.
  - (M-C) e2e console capture log 의 `console.error` 발화 카운트 → 0 hit.

## 동작
1. **(I1) prop-types runtime warning 0 hit**: TS island Component mount + 정상 인터랙션 시 `console.error` 채널에 `Warning: Failed prop type` 메시지 발화 0 hit. (M-A) stdout 또는 (M-B) test fail 또는 (M-C) e2e console capture 어느 채널에서도 0 hit. selector M-B (REQ-088 정적 채널) 0 hit 과 별 채널 — 정적 selector 부재여도 invalid runtime value 주입 시 dev-mode 채널 발화 가능 (예: TS interface 우회 cast — runtime 시점에야 발화).
2. **(I2) React 일반 runtime warning 0 hit**: TS island Component mount + 정상 인터랙션 시 `console.error` 채널에 다음 카테고리 warning 발화 0 hit — (a) `Warning: Each child in a list should have a unique "key" prop`, (b) `Warning: Cannot update a component .* while rendering a different component`, (c) `Warning: React has detected a change in the order of Hooks`, (d) 기타 React dev-mode `printWarning` 출력 메시지. 카테고리 추가 (React major bump 시 신규 warning 메시지 도입) 시 §스코프 규칙 G3 패턴 확장 박제.
3. **(I3) silence 채널 분리 + fail-fast 보강**: 기존 test 파일의 `vi.spyOn(console, 'error').mockImplementation(() => {})` silence 패턴 (legacy snapshot / 분석 영역) 은 자체 제거되지 않으나, runtime warning 흐름이 회귀 표면이 되도록 (a) 동일 spy 에 fail-fast assertion (`expect(spy).not.toHaveBeenCalledWith(stringMatching(<pattern>))`) 보강 또는 (b) 별 채널 (C-B / C-C) 추가가 1+ 박제. silence 채널 자체 제거는 본 spec 비요구.
4. **(I4) 위반 검출 단일성**: (I1)(I2) 위반 시 단일 진단 명령 (M-A) stdout 출력에서 위반 카테고리 (`prop type 위반 N` / `key 누락 N` / `concurrent update N` / `hook order N`) 가 grep 가능 라벨로 식별 + exit code ≠ 0 — 위반 발생 시 단일 회귀 표면 채널.
5. **(I5) 직교 정합**: 본 게이트는 (a) `island-proptypes-zero.md` (REQ-088, selector M-B 정적) + (b) `typecheck-island-extension.md` (REQ-077, typecheck error 정적) + (c) `lint-warning-zero-gate.md` (REQ-080, ESLint warning 정적) + (d) `eslint-react-hooks-lint-gate.md` (REQ-087, hook 규칙 정적) 4 정적 채널과 직교 — 어느 한 정적 채널이 본 runtime 채널을 자동 충족시키지 않으며, 본 runtime 채널이 4 정적 채널을 자동 충족시키지 않는다. 4 정적 채널 PASS 상태에서도 invalid runtime value 주입 시 본 runtime 채널만 fail 가능.
6. **(I6) 자동 확장 효능 — island 정의 정합**: 본 게이트는 island 디렉터리 목록을 spec 본문에 하드코딩하지 않고, `island-proptypes-zero.md` 의 island 정의 3축 (확장자 0 + typecheck error 0 + selector M-B 0) 동시 충족 디렉터리에 추상 적용. 신규 island 확정 (예: 비-island `src/Log/` 또는 `src/Monitor/` 후행 수렴 시) 시 수동 디렉터리 목록 갱신 없이 본 게이트 자동 적용. 본문에 island 디렉터리 일괄 박제 0.
7. **(I7) 수단 중립 (RULE-07)**: 본 효능 보장 수단 — (C-A) vitest spy + fail-fast assertion, (C-B) e2e (playwright/cypress) headless console capture, (C-C) CI 외부 stderr grep — 어느 채널 조합이든 수용. 본 spec 본문 어느 곳에서도 3+ 채널 후보에 선호 라벨 (G4 자기 검증 패턴) 부여 0. silence 채널 자체 제거 / 유지도 수단 중립 — silence 분리 (silence 유지 + fail-fast 보강 추가) 만 박제.
8. **(I8) 시점 비의존 (RULE-07)**: 본 spec 본문 (§역할 ~ §의존성) 어디서도 현 시점 console.error spy 사용 절대 파일명 + 절대 라인 좌표 + 절대 hit 수치 박제 0. 절대 좌표 + 수치 + 파일명은 §스코프 규칙 grep-baseline + §변경 이력 메타 한정 (감사성 — `island-proptypes-zero.md` REQ-088 §동작 8 동일 패턴).
9. **(I9) followup → 본 spec audit 회수**: TSK-20260517-21 (`island-proptypes-zero-recovery`) DoD 마지막 항목 (수동 검증: dev 서버 + 브라우저 console.error 부재) 이 developer 자동 환경 비대화 정책 + headless browser 인스펙션 부재로 수행 불가 → followup `20260517-1830-island-proptypes-zero-manual-verify` 발신. followup 흡수 후 본 spec 박제로 audit 회수 — (a)(b) 자동 채널 흡수, (c) 운영자 수동 검증은 RULE-07 음성 (1회성 점검) 으로 미박제. 본 spec 박제로 후행 axis 회복 task 발행 가능.

### 회귀 중점
- 신규 TS island Component 가 invalid prop type cast (TS interface 우회 — 예: `as unknown as Foo`) 후 mount 시 (I1) 위반. 정적 채널 (M-B selector + typecheck error) 은 PASS 유지하나 runtime 채널만 fail — 본 spec 의 직교 평서 실증.
- React major bump (예: React 18 → 19) 시 prop-types runtime 채널 동작 변경 — React 19 의 함수형 컴포넌트 propTypes 자체 제거 (`defaultProps` + propTypes 정적 selector 제거) — (I1) `Failed prop type` 메시지 패턴 자체가 사라질 수 있음 — §스코프 규칙 G3 패턴 갱신 + 본 spec §변경 이력 row 추가.
- 신규 React dev-mode warning 카테고리 도입 (예: React 19 의 신규 `useFormState` 관련 warning) 시 (I2) 패턴 미정합 → §스코프 규칙 G3 패턴 확장. 미확장 시 silent miss 가능 — `printWarning` 출력 메시지 패턴 변화 추적.
- silence 패턴이 무차별 mock (예: `vi.spyOn(console, 'error').mockImplementation(() => {})`) 적용된 test 파일에서 fail-fast assertion 누락 시 본 채널 silent miss — (I3) silence 분리 평서 위반 시점 — `afterEach` 또는 `afterAll` assertion 박제 동반 필요.
- e2e/smoke 채널 (C-B) 부재 + test 채널 (C-A) 만 박제 상태에서 test 환경 (`jsdom`) 과 실제 브라우저 환경 차이로 인한 dev-mode warning 격차 가능 — (I7) 수단 중립 평서로 어느 채널이든 수용하나, 단일 채널 의존 시 환경 격차 silent miss 가능.
- 비-island 디렉터리 (`src/Log/`, `src/Monitor/`) 가 island 로 수렴 시점에 본 게이트 자동 적용 — 수렴 직전 runtime warning 잔존이 본 게이트 fail 신호. 수렴 task 발행 시 본 spec 효능 동반 회수 필요.

## 의존성
- 외부: vitest (`vi.spyOn`, `expect(...).not.toHaveBeenCalledWith`, `stringMatching`), playwright / cypress (e2e console capture — 수단 후보), POSIX shell (`bash`, `grep -cE`), React (`console.error` 발화 채널 — `printWarning` 함수가 console.error 호출), Node.js (test runner).
- 내부: TS island 확정 디렉터리 (현 박제 시점 `src/Toaster/`, `src/Comment/`, `src/File/`, `src/Image/`, `src/common/`, `src/Search/` 6 디렉터리 — `island-proptypes-zero.md` 정의 3축 동시 충족), test setup 파일 (`src/setupTests.js`), test 파일 (`src/**/*.test.{tsx,jsx}`), `package.json:scripts.test` (`vitest run --coverage`).
- 역의존 (회복 후 자동 작동): TS island Component 가 invalid runtime value 주입 시 dev-mode warning 발화 → test fail 또는 e2e fail 또는 CI grep hit ≠ 0 → 회귀 표면.
- 직교: `island-proptypes-zero.md` (REQ-088, selector M-B 정적), `typecheck-island-extension.md` (REQ-077, typecheck error 정적), `lint-warning-zero-gate.md` (REQ-080, ESLint warning 정적), `eslint-react-hooks-lint-gate.md` (REQ-087, hook 규칙 정적), `search-abort-runtime-smoke.md` (testing — fetch abort runtime 채널 별 axis 인접).

### carve-precondition
- (P1) **환경 채널 가용성**: 본 spec 효능 회복 task carve 시점 (별 task 단) 에 `node_modules/` 가용성 + `npm test` exit=0 + `npm run typecheck` exit=0 + `npm run lint` exit=0 + `npm run build` exit=0 + island 3축 정합 (REQ-088 selector M-B 0 hit + REQ-077 typecheck 0 hit + island 확장자 0 hit) 5+ 환경 게이트 충족 필요. 본 spec 자체 박제는 산출물 변경 require 0 (효능 평서 박제만) — 본 spec 박제 시점 환경 게이트 N/A.
- (P2) **선행 spec done 상태**: 본 spec 효능 회복 task carve 시점에 선행 spec 4 정적 채널 (REQ-077 typecheck-island-extension blue 승격 done + REQ-080 lint-warning-zero-gate blue 승격 done + REQ-088 island-proptypes-zero green-or-blue + REQ-087 eslint-react-hooks-lint-gate green-or-blue) 의 정적 채널 충족 필요 — runtime warning 채널 박제는 정적 4축이 모두 PASS 상태에서야 runtime-only 회귀 표면이 분리 식별 가능. 박제 시점 REQ-077 + REQ-080 blue 승격 done (HEAD=`b76dc02` 누적), REQ-088 green (TSK-21 회수 후 본 tick hook-ack), REQ-087 green (carve 미진입). 본 spec 자체 박제는 효능 박제 한정 — 선행 spec 의존 없음.
- (P3) **RULE-02 chain 비활성**: 본 spec 은 신규 박제 spec — 기존 carve fail-fast chain 누적 0. chain 부재 평서 박제 — carve 진입 차단 신호 없음. 회복 task 발행 시점 (별 inspector / planner tick) 에 chain 누적 신호 발생 시 별 carve-precondition 게이트 자가 차단 적용.

## 테스트 현황
- [x] (I1) prop-types runtime warning 0 hit — TSK-20260517-24 회수 (커밋 `0ff5280`) 후 `src/setupTests.js` (line 61-86) 글로벌 `vi.spyOn(console, 'error')` + `RUNTIME_WARNING_PATTERN` (4 카테고리 정규식) `afterEach` fail-fast assertion 박제. `npm test` rc=0 (440/440 PASS — fail-fast 발화 0) → prop-types 위반 미발생 surface 박제 (HEAD=`0ff5280` 재실측 PASS).
- [x] (I2) React 일반 runtime warning 0 hit — TSK-20260517-24 회수 (커밋 `0ff5280`) — 본 (I1) 동일 fail-fast assertion 가 `Warning: Each child in a list` + `Warning: Cannot update.*during render` + `Warning: React has detected a change in the order of Hooks` 4 카테고리 동시 매칭. `npm test` rc=0 (440/440 PASS) → 4 카테고리 위반 미발생 surface 박제.
- [x] (I3) silence 채널 분리 + fail-fast 보강 — TSK-20260517-24 회수 (커밋 `0ff5280`) — `grep -nP "expect\([^)]*\)\.not\.toHaveBeenCalledWith\(" src/setupTests.js` → **1 hit** + `grep -nP "vi\.spyOn\(console,\s*['\"]error['\"]\)" src/setupTests.js` → **2 hit** (글로벌 spy + assertion 박제). silence legacy 패턴 보존 — `rg -nP "vi\.spyOn\(console,\s*['\"]error['\"]\)\.mockImplementation\(\s*\(\)\s*=>\s*\{\s*\}\s*\)" src/Toaster src/Comment src/File src/Image src/common src/Search` → **15 hit** (REQ-091 §스코프 규칙 G2 baseline 동치 보존). HEAD=`0ff5280` 재실측 PASS.
- [x] (I4) 위반 검출 단일성 — TSK-20260517-24 회수 (커밋 `0ff5280`) 후 (M-B) `vi.spyOn + expect.not.toHaveBeenCalledWith` 단일 채널 박제 — 임시 fixture (invalid prop type 직접 호출) 로 `AssertionError` + `RUNTIME_WARNING_PATTERN` 매칭 + 호출 인자 표시 검증 PASS (result.md 수동 검증 박제) → 1+ 채널 + 단일 진단 grep 라벨 효능 surface 회복.
- [x] (I5) 직교 정합 — 본 spec §동작 5 + §의존성 §직교 박제. 4 정적 채널 (REQ-088 selector + REQ-077 typecheck + REQ-080 lint + REQ-087 hook rule) 와 직교 평서.
- [x] (I6) 자동 확장 효능 — §동작 6 + §공개 인터페이스 평서. 본 spec 본문 island 디렉터리 일괄 박제 0 — "TS island 확정 디렉터리" 추상 평서로 신규 island 수렴 시 자동 적용.
- [x] (I7) 수단 중립 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/blue/testing/console-error-runtime-zero.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit (§스코프 규칙 G4 박제).
- [x] (I8) 시점 비의존 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/blue/testing/console-error-runtime-zero.md | grep -cE "App\.test\.jsx|setupTests\.js|:27|:354|:368|:69"` → 0 hit (§스코프 규칙 G5 박제).
- [x] (I9) followup → 본 spec audit 회수 — 본 spec §동작 9 + §변경 이력 + §참고 박제로 정합. TSK-21 followup `20260517-1830-island-proptypes-zero-manual-verify` 흡수 + RULE-07 음성 운영자 수동 미박제.

## 수용 기준
- [x] (Must, FR-01) prop-types runtime warning 0 hit — TSK-20260517-24 회수 (커밋 `0ff5280`) 후 (M-B) `vi.spyOn(console, 'error') + expect.not.toHaveBeenCalledWith(stringMatching(...))` 채널 박제. `npm test` rc=0 (440/440 PASS) — `Warning: Failed prop type` 매칭 발화 0 surface (HEAD=`0ff5280` 재실측 PASS).
- [x] (Must, FR-02) React 일반 runtime warning 0 hit — TSK-20260517-24 회수 (커밋 `0ff5280`) — (M-B) 채널 동일 fail-fast assertion 가 `Warning: Each child in a list` + `Warning: Cannot update a component .* while rendering` + `Warning: React has detected a change in the order of Hooks` 4 카테고리 통합 정규식 매칭. `npm test` rc=0 (440/440 PASS) → 4 카테고리 발화 0 surface.
- [x] (Must, FR-03) silence 채널 분리 — TSK-20260517-24 회수 (커밋 `0ff5280`) — silence 패턴 자체 제거 0 + (M-B) `expect(spy).not.toHaveBeenCalledWith(expect.stringMatching(RUNTIME_WARNING_PATTERN))` fail-fast assertion 1+ 추가 박제 (`src/setupTests.js:61-86`). silence 패턴 15 hit 보존 (REQ-091 §스코프 규칙 G2 baseline 동치).
- [x] (Must, FR-04) 위반 검출 단일성 — TSK-20260517-24 회수 (커밋 `0ff5280`) — (M-B) `afterEach` 의 `expect.not.toHaveBeenCalledWith` 단일 channel 발화 시 `AssertionError` + 매칭 메시지 + 호출 인자 출력 (fixture 검증 PASS — result.md 박제). 위반 발생 시 vitest exit code ≠ 0 동반.
- [x] (Must, FR-05) 직교 정합 박제 — §동작 5 + §의존성 §직교 평서 박제. 본 spec runtime 채널은 REQ-088 (selector M-B) + REQ-077 (typecheck) + REQ-080 (lint) + REQ-087 (hook rule) 4 정적 채널과 직교 — 자동 충족 관계 부재.
- [x] (Should, FR-06) 자동 확장 — §동작 6 + §공개 인터페이스 평서. island 디렉터리 일괄 박제 0 — "TS island 확정 디렉터리" 추상 평서로 신규 island 수렴 시 자동 적용.
- [x] (Should, FR-07) 시점 비의존 — 본문 (§역할 ~ §의존성) 에 현 시점 console.error spy 절대 파일명 / 라인 박제 0. 좌표는 §스코프 규칙 + §변경 이력 한정. §스코프 규칙 G5 자기 검증.
- [x] (Should, FR-08) 수단 중립 — 본문 어디서도 3+ 수단 채널 (C-A / C-B / C-C) 후보에 선호 라벨 부여 0. §스코프 규칙 G4 자기 검증.
- [x] (NFR-01) 정합성 — 본 spec §역할 ~ §의존성 어디서도 절대 파일명 (`App.test.jsx` / `setupTests.js`) + 절대 라인 (`:27` / `:354` / `:368` / `:69`) 박제 0 (§스코프 규칙 G5 PASS). 좌표는 §스코프 규칙 grep-baseline + §변경 이력 한정.
- [x] (NFR-02) 박제 위치 결정 근거 — 본 spec §변경 이력 + §carve-precondition 에 흡수 위치 결정 (`30.spec/green/testing/` 신규 carve, vs REQ-088 spec 확장 / `search-abort-runtime-smoke.md` 인접 흡수) 근거 박제. 결정 근거: REQ-088 정적 channel 과 직교 메타 모델 + `search-abort-runtime-smoke.md` 인접 spec 은 fetch abort 단일 axis (별 runtime 채널) + 자매 메타 spec 양식 정합 (각 axis 별 spec 박제).
- [x] (NFR-03) 시점 비의존성 (RULE-07) — 본 spec 본문 어디서도 1회성 진단·incident·릴리스·날짜 귀속 patch 플랜 부재. 본 spec 박제 효능 ("runtime warning 0 hit + 단일 진단 명령 카테고리 라벨") 은 반복 검증 가능 + 시점 비의존.
- [x] (NFR-04) 직교 박제 — 본 spec runtime 채널은 REQ-088 (selector M-B 정적) + REQ-077 (typecheck 정적) + REQ-080 (lint 정적) + REQ-087 (hook rule 정적) 4 정적 채널과 직교 — 직교 평서 §동작 5 + §의존성 §직교 박제.
- [x] (NFR-05) followup 회수 정합 — 본 req 발행 후 `specs/10.followups/20260517-1830-island-proptypes-zero-manual-verify.md` 가 `specs/60.done/2026/05/17/followups/` mv 완료 (discovery 영역 — 본 inspector tick 시점 mv 누적 PASS, `ls specs/60.done/2026/05/17/followups/` → 1 hit 확인). followup §잠재 후행 축 (a)(b) 자동 채널 흡수 + (c) 운영자 수동 검증 RULE-07 음성으로 §역할 + §목표 Out-of-Scope 박제.
- [x] (NFR-06) RULE-01 정합 — 본 spec `specs/30.spec/green/testing/` create only (inspector writer 영역). blue 흡수는 planner 영역 (별 tick promote 후보).
- [x] (NFR-07) RULE-06 정합 — §스코프 규칙 grep-baseline 5 gate (G1~G5) 실측 박제 (HEAD=`b76dc02`) + `expansion` `허용` (runtime warning 회복 task 가 test 파일 다수 + setup 파일 + 신규 e2e 채널 또는 신규 CI step 동반 — scope 확장 허용).
- [x] (NFR-08) spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합).

## 스코프 규칙
- **expansion**: 허용 — runtime warning 회복 task 가 test 파일 다수 (`*.test.{tsx,jsx}`) + `src/setupTests.js` + 신규 e2e 채널 디렉터리 (`e2e/` / `tests/e2e/` — 가상) + 신규 CI workflow step + `package.json:scripts` 신규 진단 명령 동반 — scope 확장 허용. 신규 React major bump 시 (I2) warning 카테고리 패턴 갱신 + §스코프 규칙 G3 baseline 재실측.
- **grep-baseline** (HEAD=`b76dc02`, 2026-05-17 — REQ-091 흡수 시점 실측):
  - (G1) **[runtime warning 채널 baseline — M-A]** `npm test 2>&1 | grep -cE "Warning: (Failed prop type|Each child in a list|Cannot update.*during render|hook .*order)"` — 측정 환경 부재 (silence 패턴이 console.error 흐름 차단 — test 실행 시 stderr 에 흐르지 않음). HEAD=`b76dc02` 박제 시점 zero-point — silence 분리 + fail-fast assertion 또는 별 채널 박제 후 (M-A) 측정 가능.
  - (G2) **[silence 패턴 baseline]** `grep -rnE "vi\.spyOn\(console,\s*['\"]error['\"]\)\.mockImplementation\(\s*\(\)\s*=>\s*\{\s*\}\s*\)" src/` → **28 hit / 23 파일** (실측 HEAD=`b76dc02`). 분포: App.test.jsx + Monitor/* (6 파일) + File/* (4 파일) + Image/* + Comment/* + Search/* (3 파일 — 다중 spy 포함) + common/* (5 파일 — errorReporter / common.test / Navigation / ErrorBoundary) + Log/* (4 파일). island 디렉터리 + 비-island 디렉터리 혼합 — 본 spec 회복 대상은 island 정의 3축 충족 디렉터리 한정. 본 spec 회복 대상 = silence 분리 + fail-fast assertion 또는 별 채널 1+ 추가 — silence 자체 제거 0 (legacy snapshot / 분석 영역 보존). 비-island 디렉터리 (`src/Log/`, `src/Monitor/`) silence 패턴은 본 게이트 적용 외 (island 수렴 시점 자동 적용).
  - (G3) **[runtime warning 메시지 패턴 baseline — React 18 영역]** `Warning: Failed prop type` (prop-types runtime 채널) + `Warning: Each child in a list should have a unique "key" prop` (missing key) + `Warning: Cannot update a component .* while rendering a different component` (concurrent update) + `Warning: React has detected a change in the order of Hooks` (hook order) — 4 카테고리 패턴 박제. React major bump (예: React 19) 시 일부 패턴 사라짐 (defaultProps + propTypes 정적 selector 제거 → `Failed prop type` 메시지 자체 사라짐 가능) + 신규 패턴 추가 — §변경 이력 row 동반 갱신 필요.
  - (G4) **[FR-08 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/blue/testing/console-error-runtime-zero.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 3+ 수단 채널 후보 라벨 부여 0 — 백틱 코드 식별자 면제 정밀 패턴). HEAD=`b76dc02` 박제 시점 PASS.
  - (G5) **[FR-07 / NFR-01 시점 비의존 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/blue/testing/console-error-runtime-zero.md | grep -cE "App\.test\.jsx|setupTests\.js|:27|:354|:368|:69"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 절대 파일명 / 라인 박제 0 — 좌표는 §스코프 규칙 grep-baseline + §변경 이력 한정). HEAD=`b76dc02` 박제 시점 PASS.
- **rationale**: (G1) runtime warning 채널 baseline — silence 차단으로 측정 환경 부재 zero-point. (G2) silence 패턴 baseline — 3 hit / 1 파일 (정밀 패턴 — silence implementation 매칭 한정). (G3) runtime warning 메시지 패턴 baseline — 4 카테고리 (React 18 영역). (G4) RULE-07 수단 중립 자기 검증. (G5) RULE-07 시점 비의존 자기 검증. 매트릭스: 5 baseline 채널 (G1 측정 채널 + G2 silence 패턴 + G3 메시지 패턴 + G4/G5 본 spec 본문 자기 검증) — 회복 후 G1 0 hit + G2 silence 유지 + fail-fast 보강 + G3 4 카테고리 grep 0 hit + G4/G5 박제 시점 PASS.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 1 hook-ack, TSK-20260517-24 회수) / `0ff5280` (verify HEAD=`0ff5280`) | hook-ack 8 marker 플립 — (I1)(I2)(I3)(I4) + (FR-01)(FR-02)(FR-03)(FR-04) — `src/setupTests.js` (line 61-86) 글로벌 `vi.spyOn(console, 'error')` + `RUNTIME_WARNING_PATTERN` 4 카테고리 통합 정규식 + `afterEach` fail-fast assertion 박제. 객관 grep 재실측 3 채널 (G1 `expect.not.toHaveBeenCalledWith` 1 hit + G2 spy 2 hit + G3 silence legacy 15 hit 동치 보존). `npm test` rc=0 (440/440 PASS — fail-fast 발화 0 — 본 박제 시점 위반 미발생 surface). 잔여 (I5)~(I9) + (FR-05)~(NFR-08) 0 marker — 모두 직전 박제 시점 [x] 수렴. **본 spec 전수 marker [x] 수렴** — green→blue promote 후보. RULE-07 정합 — 객관 grep surface 박제, Must 주관 혼재 0. 보조 ack notes — TSK-24 result.md G6 [~] (수단 라벨 사전-existing 주석 2 hit) 는 본 spec marker (I7 수단 중립) 별 spec 자기 검증 영역 — 본 (I1)~(I4) marker 의 객관 grep surface 와 직교. | §테스트 현황 + §수용 기준 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-091 흡수) / pending (HEAD=`b76dc02`) | 최초 박제 — TS island Component runtime `console.error` 채널 0 hit 효능 9 축 (I1~I9) 게이트. baseline 매트릭스: runtime warning 채널 baseline (G1 — silence 차단 zero-point) + silence 패턴 baseline (G2 — 3 hit / 1 파일 `src/App.test.jsx:27,354,368` 정밀 패턴 매칭) + runtime warning 메시지 패턴 baseline (G3 — 4 카테고리 prop-types / missing key / concurrent update / hook order React 18 영역) + 본 spec 본문 자기 검증 (G4 수단 중립 0 hit + G5 시점 비의존 0 hit). 본 spec 분리 결정 근거: (a) REQ-088 `island-proptypes-zero.md` 확장 부적합 — 정적 selector M-B 채널과 본 runtime `console.error` 채널은 직교 메타 모델 (다른 도메인 — 정적 selector 부재 vs runtime 발화 0 hit) → 단일 spec 확장은 RULE-07 단일 효능 박제 원칙 위반 + spec 본문 양식 분산. (b) `search-abort-runtime-smoke.md` 인접 흡수 부적합 — `search-abort-runtime-smoke.md` 는 fetch abort 단일 axis (별 runtime 채널) + 본 spec 의 console.error 채널과 직교 — 인접 spec 흡수 시 RULE-07 단일 효능 위반 + spec 본문 양식 분산. (c) **신규 spec carve 결정** — `30.spec/green/testing/` 디렉터리 박제 (자매 spec `search-abort-runtime-smoke.md` 동일 영역 — testing/ runtime 채널 메타 spec 자매 양식 정합). 자매 메타 spec 양식 정합: 각 runtime axis 별 spec 박제 — REQ-091 console.error + REQ-?? fetch abort (search-abort-runtime-smoke) + 미래 신규 runtime axis (uncaught Promise rejection / web-vitals long task / 시각 회귀) 별 spec carve 패턴. consumed req: `specs/20.req/20260517-component-runtime-warning-zero-channel.md` (REQ-091) → `60.done/2026/05/17/req/` mv. **followup 흡수**: `specs/10.followups/20260517-1830-island-proptypes-zero-manual-verify.md` (TSK-20260517-21 DoD 마지막 항목 수동 검증 자동화 부재 audit) → discovery 영역 mv 완료 (`60.done/2026/05/17/followups/`). followup §잠재 후행 축 (a) e2e console capture + (b) vitest spy + fail-fast assertion 자동 채널 흡수 + (c) 운영자 1회 수동 검증 RULE-07 음성 (1회성 점검) 으로 §역할 + §목표 Out-of-Scope 박제. RULE-07 자기검증 — (I1)~(I9) 모두 평서형·반복 검증 가능 (`npm test 2>&1 \| grep -cE` 단일 진단 G1 + `grep -rnE` G2/G3)·시점 비의존 (G5 0 hit — 본문에 절대 파일명 / 라인 박제 0)·incident 귀속 부재 (REQ-091 §배경 followup audit 는 §변경 이력 / §참고 한정)·수단 중립 (G4 0 hit — 3+ 수단 채널 후보 라벨 0). RULE-06 §스코프 규칙 5 gate (G1~G5) 실측 박제 + `expansion` `허용`. RULE-01 inspector writer 영역만 (`30.spec/green/testing/console-error-runtime-zero.md` create). spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제. | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-component-runtime-warning-zero-channel.md` (REQ-091 — 본 세션 mv).
- **followup 원전 (audit pointer)**:
  - `specs/60.done/2026/05/17/followups/20260517-1830-island-proptypes-zero-manual-verify.md` (discovery 영역 mv 완료) — TSK-20260517-21 (`island-proptypes-zero-recovery`) DoD 마지막 항목 (수동 dev 서버 + 브라우저 console.error 부재 확인) 자동화 부재 audit. 잠재 후행 축 (a)(b) 본 spec 흡수, (c) 운영자 수동 RULE-07 음성 미박제.
- **선행 spec (정적 채널 — 본 spec 박제 시점 cross-ref)**:
  - `specs/30.spec/blue/foundation/island-proptypes-zero.md` (REQ-088) — selector M-B 0 hit 정적 채널. 본 spec 의 runtime 채널과 직교 — 어느 한 채널이 다른 채널을 자동 충족 부재.
  - `specs/30.spec/blue/foundation/typecheck-island-extension.md` (REQ-077) — typecheck error 0 정적 채널. 본 spec 과 직교.
  - `specs/30.spec/blue/foundation/lint-warning-zero-gate.md` (REQ-080) — ESLint warning 0 정적 채널. 본 spec 과 직교 (정적 vs 런타임).
  - `specs/30.spec/blue/foundation/eslint-react-hooks-lint-gate.md` (REQ-087) — hook 규칙 정적 채널. 본 spec 과 직교 — runtime hook order 위반의 dev-mode console.error 흐름은 별 채널.
- **자매 메타 spec (testing/ 영역 runtime 채널)**:
  - `30.spec/blue/testing/search-abort-runtime-smoke.md` — fetch abort runtime 채널 (별 runtime axis). 자매 메타 spec 양식 정합 — 각 runtime axis 별 spec 박제 패턴.
- **선행 done req**:
  - `specs/60.done/2026/05/17/req/20260517-island-proptypes-spec-absorption.md` (REQ-088) — selector M-B 정적 채널 박제.
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062) — TS Props 단일 출처 정적 박제.
  - `specs/60.done/2026/05/17/task/island-proptypes-zero-recovery/result.md` (TSK-20260517-21 `efe55e8`) — selector M-B 57→0 hit 회수. DoD 마지막 항목 (수동 검증) 자동화 부재 — followup `20260517-1830` 발신 + 본 spec 흡수.
- **외부 레퍼런스**:
  - React 공식 — dev-mode warning 채널 (`console.error` 사용): `https://github.com/facebook/react/blob/main/packages/shared/consoleWithStackDev.js` (`printWarning` 함수가 console.error 호출).
  - React 공식 — `Warning: Failed prop type` 메시지 패턴: `https://react.dev/reference/react/Component#static-proptypes` (React 18 영역).
  - React 공식 — `Warning: Each child in a list should have a unique "key" prop`: `https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key`.
  - vitest 공식 — `vi.spyOn` 동작 + `toHaveBeenCalledWith` assertion: `https://vitest.dev/api/vi.html#vi-spyon` + `https://vitest.dev/api/expect.html#tohavebeencalledwith`.
  - playwright 공식 — page console capture: `https://playwright.dev/docs/api/class-page#page-event-console`.
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G5 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`npm test 2>&1 \| grep -cE` + `grep -rnE`) · incident 귀속 부재 (REQ-091 §배경 followup audit 는 §변경 이력 / §참고 한정). 수단 박제 0 (G4 0 hit 자기 검증).
  - RULE-06: grep-baseline 5 gate (G1~G5) 실측 박제 (HEAD=`b76dc02`) + `expansion` `허용`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/testing/console-error-runtime-zero.md` create).
  - spec-carve-precondition (REQ-085): §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 정합.
