# 테스트 이디엄 (env stub / render 가드 / href intent / MSW / fake-timer / findBy / teardown / console spy) 계약

> **위치**: `src/**/*.test.{js,jsx}` 전역 이디엄 불변식. 소비 유틸: `src/common/env.js`, `src/test-utils/msw.js` (또는 동급), `src/**/api.mock.js`, `src/setupTests.js`.
> **관련 요구사항**: REQ-20260421-021, REQ-20260421-027, REQ-20260421-029, REQ-20260421-036
> **최종 업데이트**: 2026-04-21 (by inspector, REQ-036 console spy 비파괴 이디엄 흡수 — 이디엄 (9) 신설)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=0f03547; 발행 시 baseline HEAD=672a4df).

## 역할
프로젝트 전 테스트 파일이 공유하는 "**테스트 이디엄 계약**". 환경 분기 stub, env-dependent 렌더 가드, href 의도 기반 어설션, MSW 수명주기, MSW 계약 어서트, fake-timer 진입점, DOM async 쿼리(findBy), fake-timer teardown, console spy 비파괴 보존 9개 축을 불변식(invariant)으로 박제한다. 의도적으로 하지 않는 것: 특정 incident·릴리스 귀속 patch 플랜, 1회성 배치 리팩터 지시, 런타임 env 헬퍼 계약 (REQ-022 분리), React 19 런타임 변환 (REQ-024 분리), CI foundation (REQ-023 분리), 런타임 경고 0 **결과** 계약 (REQ-035 분리 — 본 이디엄 (9) 는 **측정 채널 보존** 축).

## 공개 인터페이스
- 소비 유틸 (불변식이 요구하는 계약 진입점):
  - `vi.stubEnv(key, value)` — 환경 분기 stub 의 1차 진입점.
  - `vi.mock('@/common/env', factory)` — `isDev()/isProd()/mode()` 치환 시 2차 진입점.
  - `stubMode('test' | 'dev' | 'prod')` — `describe`-scoped env 전제 박제 (test-utils 제공).
  - `useMockServer(scenario)` — MSW 수명주기 위임 훅 (`listen/resetHandlers/close` 자동 수행).
  - `api.mock.js` 명명 export — 핸들러·시나리오 재사용 모듈 (`src/**/api.mock.js`).
  - `vi.useFakeTimers(options)` — 옵션 객체 호출 진입점.

## 동작
테스트 본문에서 다음 6개 이디엄이 반복 검증 가능한 형태로 표현된다.

### 1. env stub 이디엄
테스트에서 환경 분기 stub 은 `vi.stubEnv(key, value)` 또는 `vi.mock('@/common/env', factory)` 로 표현한다. 테스트 본문에서 `process.env.NODE_ENV` 를 재할당하지 않는다. 테스트 teardown 은 `vi.unstubAllEnvs()` 또는 `vi.restoreAllMocks()` 가 수행 (setup utility 에 위임 가능).

### 2. env-dependent render 가드 이디엄
env-dependent URL 헬퍼 (`getUrl()` / `userAgentParser()`) 를 렌더 경로에서 소비하는 테스트는 `describe`-scoped `beforeEach(() => stubMode('test'))` 또는 동급 env stub 로 env 전제를 박제한다. 렌더 직전 환경 stub 이 없는 상태로 `getUrl()` 의 분기를 돌리지 않는다.

### 3. href intent 어설션 이디엄
env-dependent URL 렌더 어설션은 intent-based query (예: `expect(link.getAttribute('href')).toMatch(/^http/)` 또는 origin-match) 혹은 명시 env stub 로 표현한다. `expect(rendered).toStrictEqual(<a href="...">...</a>)` 형태의 구조 어설션(앵커 엘리먼트 동일성)은 금지.

### 4. MSW 수명주기/이디엄
MSW 기반 테스트는 `useMockServer(scenario)` 로 수명주기 위임을 우선한다. 대체 수단은 `beforeEach/afterEach` 에서 `server.listen()` / `server.close()` / `server.resetHandlers()` 쌍을 대칭적으로 호출하는 패턴만 허용한다. 핸들러는 `src/**/api.mock.js` 명명 export 로 재사용하며 테스트 파일 내부 inline 정의는 일회성 시나리오에 한정한다.

### 5. MSW 계약 어서트 이디엄
msw 계약 테스트의 어서트는 `vi.fn()` 호출 횟수 누적/소거 가정을 하지 않는다. 각 `it` 블록에서 "**최소 1회**" 호출 및 전달 값만 검증한다 — `toHaveBeenCalledTimes(N)` 류의 정확 횟수 어설션은 횟수 불변식이 계약인 경우(예: 디바운스 1회)에 한정하며, MSW handler 측 호출 카운트는 누적되므로 특히 금지.

### 6. fake-timer 진입점 이디엄
fake-timer 진입점은 옵션 객체 호출 (`vi.useFakeTimers({ toFake: [...] })` 또는 `vi.useFakeTimers({ shouldAdvanceTime: true })`) 형태만 허용한다. 인자 없는 호출 `vi.useFakeTimers()` 및 문자열 인자 호출 `vi.useFakeTimers('modern')` 은 금지.

### 7. findBy* 기본 이디엄 (REQ-20260421-027)
DOM 쿼리는 React 19 concurrent 환경에서 `findBy*` 계열 async query 사용을 기본 이디엄으로 한다. 렌더 직후 동기 `getBy*` 를 먼저 쓰고 실패 시 `waitFor(() => getBy*)` 로 래핑하는 관용구는 지양 — 동등 의미의 `await findBy*` 를 우선.

### 8. fake-timer teardown 전역 정책 (REQ-20260421-029)
fake-timer teardown 은 `src/setupTests.js` 전역 `afterEach(() => { ...; vi.useRealTimers(); })` 가 담당한다. 파일별 `afterEach(() => vi.useRealTimers())` 명시는 **선택** (중복 호출 허용) — 의미적으로 전역 teardown 으로 충분하며, 파일별 명시는 가독성·지역성 목적에서만 유지 가능.

### 9. console spy 비파괴 보존 (REQ-20260421-036)
테스트 파일 (`src/**/*.test.{js,jsx,ts,tsx}`) 의 **module-level** (describe/it/beforeEach/afterEach 블록 밖) 에서 `console.log`, `console.warn`, `console.error`, `console.debug`, `console.info` 중 어느 속성이든 직접 재할당 (`console.X = vi.fn()` / `console.X = () => {}` / `console.X = noop` 등) 은 **금지** 이다. 직접 재할당은 mock 레지스트리 밖으로 영구 누수되어 `vi.restoreAllMocks()` / `vi.config.restoreMocks: true` 중 어느 방식으로도 복원되지 않으며, 테스트 간 전역 변조를 일으킨다.

스위트 단위로 console 출력을 억제·검증하려면 `vi.spyOn(console, '<method>')` 를 `beforeEach` 또는 `beforeAll` 내부에서 호출하고, 같은 스위트의 `afterEach`/`afterAll` 에서 해당 spy 의 `mockRestore()` 또는 `vi.restoreAllMocks()` 를 호출한다. `vi.spyOn` 은 원본 함수 참조를 보존하므로 teardown 후 `console.X` 가 원본으로 복원됨을 보장한다. 프로젝트가 전역 정책을 택할 경우 `src/setupTests.js` 의 전역 `afterEach` 에 `vi.restoreAllMocks()` 1행을 추가 (또는 `vite.config.js` 의 `test.restoreMocks: true` 설정) 하고 테스트 파일은 `vi.spyOn` 만 사용하는 형태로 일원화한다. 두 경로는 의미상 등가이며 택1 은 프로젝트 운영 결정.

본 이디엄은 React 런타임 경고 (PropTypes validation, deprecated API 경고, strict mode 경고 등) 가 `console.error` / `console.warn` 채널로 전달됐을 때 테스트 실행 중 **관측 가능해야 한다** 는 REQ-20260421-035 FR-02 "런타임 경고 0 불변식" 의 전제를 충족한다. 즉 본 이디엄 (9) 는 REQ-035 의 결과 불변식이 실제 측정 가능하도록 **측정 채널 비파괴** 를 보장하는 축으로 상호 보완 관계이며, 결과 불변식 (경고 0) 자체는 REQ-035 가 박제한다.

### 회귀 중점
- (1) 과 (2) 의 합성: env stub 없이 렌더 경로를 돌리면 prod URL 분기를 타며 assertion 이 환경에 의존.
- (3) 은 React 19 의 auto-merging fragment 변화에 대해 회귀 방어.
- (4) 의 수명주기 대칭성 결여는 sibling-it shuffle 시 서버 리크로 귀결.
- (5) 의 누적 카운트 가정은 shuffle 또는 parallel 실행 시 flaky.
- (6) 의 옵션 없는/문자열 호출은 Vitest 4 에서 경고·동작 불일치.
- (9) 의 module-level 재할당은 mock 레지스트리 밖 누수이므로 `restoreAllMocks`/`restoreMocks: true` 로 복원 불가. React 런타임 경고·PropTypes validation 경로가 상수 함수로 매몰되어 REQ-035 FR-02 측정 채널을 무력화.

## 의존성
- 내부: `src/common/env.js` (`isDev/isProd/mode`), `src/test-utils/msw.js` 또는 동급 (`useMockServer`, `stubMode`), `src/**/api.mock.js` 7개 모듈 (`Image/Log/File/Comment/Monitor/Search/setupTests`).
- 외부: `vitest` (`vi.stubEnv`, `vi.mock`, `vi.useFakeTimers`, `vi.fn`), `msw` (`setupServer`), `@testing-library/react` (렌더 경로).
- 역의존: 모든 `src/**/*.test.{js,jsx}` 파일이 위 9개 이디엄 중 해당 축을 준수한다.

## 스코프 규칙
- **expansion**: N/A (spec 문서는 grep 게이트가 아닌 positive/negative baseline 만 박제; 본 spec 자체는 grep 게이트를 실행하지 않음).
- **grep-baseline** (inspector 발행 시점, HEAD=672a4df 실측):

  (1) env stub 이디엄
  - positive: `rg -nE "vi\.stubEnv\(" src --glob="*.test.{js,jsx}"` → 22 files hit (예: `src/App.test.jsx`, `src/Log/LogSingle.test.jsx`, `src/common/common.test.js`).
  - negative: `rg -nE "process\.env\.NODE_ENV\s*=" src --glob="*.test.{js,jsx}"` → 0 hit.

  (2) env-dependent render 가드 이디엄
  - positive: `rg -nE "beforeEach\(\(\) => stubMode" src --glob="*.test.{js,jsx}"` → 2 files hit (`src/App.test.jsx`, `src/common/Navigation.test.jsx`).
  - negative: `rg -nE "stubMode\(" src --glob="*.test.{js,jsx}"` → 9 files hit 중 env-dependent render 경로 (Navigation/App/Writer 등) 전원 포함 확인; 비 render-path 누락 시 본 negative 는 "getUrl 호출 테스트에서 stubMode 부재" 수동 감사로 대체.

  (3) href intent 어설션 이디엄
  - positive: `rg -nE "getAttribute\(['\"]href['\"]\)" src --glob="*.test.{js,jsx}"` → 1 hit (`src/common/Navigation.test.jsx:1`).
  - negative: `rg -nE "toStrictEqual\s*\(\s*<a\s" src --glob="*.test.{js,jsx}"` → 0 hit.

  (4) MSW 수명주기 이디엄
  - positive: `rg -nE "useMockServer\s*\(" src --glob="*.test.{js,jsx}"` → 17 files hit (예: `src/Log/Log.test.jsx`, `src/Image/ImageSelector.test.jsx`, `src/Search/Search.test.jsx`).
  - negative: `rg -nE "setupServer\s*\(" src --glob="*.test.{js,jsx}"` → 0 hit (setupServer 소비는 `src/test-utils/msw.js` 1 파일만 허용; test 파일 내 직접 호출 0).

  (5) MSW 계약 어서트 이디엄
  - positive: `rg -nE "toHaveBeenCalledTimes\(1\)" src --glob="*.test.{js,jsx}"` → 1회 계약 한정 호출만 존재 (9 files / 23 hits 중 디바운스/useEffect 1회 계약 축만; 누적 카운트 가정 0). 자세한 정밀 패턴은 감사 시 `rg -nE "toHaveBeenCalledTimes\([2-9]"` 로 0 hit 유지 검증.
  - negative: `rg -nE "toHaveBeenCalledTimes\([2-9]\)" src --glob="*.test.{js,jsx}"` → 0 hit (누적 정확 횟수 가정 금지; 향후 회귀 감시 패턴).

  (6) fake-timer 진입점 이디엄
  - positive: `rg -nE "vi\.useFakeTimers\s*\(\s*\{" src --glob="*.test.{js,jsx}"` → 17 files / 46 occurrences (옵션 객체 호출).
  - negative (A): `rg -nE "vi\.useFakeTimers\s*\(\s*\)" src --glob="*.test.{js,jsx}"` → 0 hit (주석·문서 행 제외; `src/setupTests.js:36` 은 주석 라인이므로 실 호출 0).
  - negative (B): `rg -nE "vi\.useFakeTimers\s*\(\s*['\"]modern['\"]" src --glob="*.test.{js,jsx}"` → 0 hit.

  (7) findBy* 기본 이디엄 (REQ-20260421-027 FR-04(b))
  - positive: `grep -rnE "findBy" src --include="*.test.js" --include="*.test.jsx" | wc -l` → 202 hits (다수 파일 async query 채택 확인).
  - 권장 정밀 패턴: `rg -nE "await\s+(screen|within\([^)]+\))\.findBy" src --glob="*.test.{js,jsx}"` — async 사용 확인. `rg -nE "waitFor\s*\(\s*\(\s*\)\s*=>\s*(screen|within\([^)]+\))\.getBy" src --glob="*.test.{js,jsx}"` → 지양 관용구 (수치는 감사 시 측정).

  (8) fake-timer teardown 전역 정책 (REQ-20260421-029 FR-02)
  - positive (a): `rg -nE "afterEach\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?vi\.useRealTimers" src/setupTests.js --multiline` → 1 block hit (`src/setupTests.js:68-71` — 전역 teardown 에 `vi.useRealTimers()` 포함). 단일 화살표 표현 `afterEach(() => vi.useRealTimers())` 축자 매치는 현 구현이 복합 함수이므로 0 hit; 의미 동등 확인으로 대체.
  - 정보성 (b): `rg -nE "vi\.useRealTimers" src --glob="*.test.{js,jsx}" | wc -l` → 2 hits (파일별 명시는 **선택** — 전역 teardown 충분. 수치 상한 없음).

  (9) console spy 비파괴 이디엄 (REQ-20260421-036 FR-05)
  - positive: `rg -nE "vi\.spyOn\s*\(\s*console\s*," src --glob="*.test.{js,jsx}"` → **7 hits in 6 files** (HEAD=0f03547 실측):
    - `src/Search/Search.test.jsx:161, 249`
    - `src/common/errorReporter.test.js:5`
    - `src/common/common.test.js:85`
    - `src/common/ErrorBoundary.test.jsx:25`
    - `src/App.test.jsx:349, 363`
  - negative (본): `rg -nE "^console\.(log|warn|error|debug|info)\s*=\s*vi\.fn" src --glob="*.test.{js,jsx}"` → **43 hits / 21 files** (HEAD=0f03547 baseline — **목표 0 hit**; 21 파일 전수 (`App.test.jsx:9-10`, `Comment/Comment.test.jsx:8-9`, `common/common.test.js:13-14`, `common/Navigation.test.jsx:6-7`, `File/{File,FileDrop,FileItem,FileUpload}.test.jsx:*`, `Image/ImageSelector.test.jsx:6-7`, `Log/{Log,LogItem,LogSingle,Writer}.test.jsx:*` — LogSingle 3 hits (log/warn/error), `Monitor/{ApiCallItem,ContentItem,Monitor,VisitorMon,WebVitalsItem,WebVitalsMon}.test.jsx:*`, `Search/{Search,SearchInput}.test.jsx:*`) — 마이그레이션 planner/developer task 영역. **본 spec 은 불변식 목표값 (0 hit) 만 박제**, baseline 은 현상 기록으로 분리.
  - negative (보조): `rg -nE "^console\.(log|warn|error|debug|info)\s*=\s*(\(\s*\)|function)" src --glob="*.test.{js,jsx}"` → **0 hit** (HEAD=0f03547 실측 — 대체 구현체 재할당도 동등 금지, 현재 0 유지 필요).

- **rationale**: 9 개 이디엄 축 중 (1)–(8) 은 `50.blocked/spec/` 에서 격리된 followup 이 공통으로 요구한 "반복 검증 가능 불변식", (9) 는 REQ-036 자율 탐색 발견 — 21 파일 × 43 hits 의 현상을 근거로 **측정 채널 비파괴 불변식** 을 추가 박제. 1회성 배치 리팩터 지시는 별 task 경로 (본 spec 은 불변식만 박제). baseline 수치는 HEAD=0f03547 시점 실측이며, 시점·incident 귀속 patch 플랜은 포함하지 않는다.

## 테스트 현황
- [x] 이디엄 (1) env stub: 22 files 적용, `process.env.NODE_ENV` 재할당 0 hit.
- [x] 이디엄 (2) render 가드: App/Navigation 주요 render 경로 `beforeEach(stubMode)` 박제.
- [x] 이디엄 (3) href intent: `toStrictEqual(<a>)` 0 hit, `getAttribute('href')` intent 어설션 1+ hit.
- [x] 이디엄 (4) MSW 수명주기: 17 파일 `useMockServer` 위임, test 파일 내 직접 `setupServer` 호출 0.
- [x] 이디엄 (5) MSW 계약 어서트: 정확-횟수 누적 가정 0 hit.
- [x] 이디엄 (6) fake-timer 진입점: 옵션 객체 46 occurrences, 인자 없는·문자열 호출 0 hit.
- [x] 이디엄 (7) findBy* 기본: 202 hits 다수 파일 async query 채택.
- [x] 이디엄 (8) fake-timer teardown: `src/setupTests.js:68-71` 전역 `afterEach` 에 `vi.useRealTimers()` 포함. 파일별 명시 2 hits (선택).
- [ ] 이디엄 (9) console spy 비파괴 보존 (REQ-036): positive `vi.spyOn(console, ...)` 7 hits / 6 files 존재. negative 본 `console.X = vi.fn()` 43 hits / 21 files 잔존 (현 baseline, 목표 0). 마이그레이션 별 task (planner 영역 carve 대상).

## 수용 기준
- [x] (Must, FR-01) 테스트에서 환경 분기 stub 은 `vi.stubEnv` 또는 `vi.mock('@/common/env', ...)` 로 표현된다. `process.env.NODE_ENV` 재할당 0.
- [x] (Must, FR-02) env-dependent URL 헬퍼를 렌더 경로에서 소비하는 테스트는 `describe`-scoped `beforeEach(() => stubMode('test'))` 또는 동급 env stub 로 env 전제를 박제한다.
- [x] (Must, FR-03) env-dependent URL 렌더 어설션은 intent-based query 또는 명시 env stub 로 표현되며 `toStrictEqual(<a>...)` 형태의 구조 어설션 0.
- [x] (Must, FR-04) MSW 기반 테스트는 `useMockServer(scenario)` 로 수명주기를 위임하며, 대체 수단은 `beforeEach/afterEach listen/close` 대칭만 허용. 핸들러는 `api.mock.js` 명명 export 로 재사용.
- [x] (Must, FR-05) msw 계약 테스트의 어서트는 `vi.fn()` 호출 횟수 누적/소거 가정 금지; `it` 블록에서 **최소 1회** 호출 및 값 전달 검증.
- [x] (Must, FR-06) fake-timer 진입점은 옵션 객체 호출 (`vi.useFakeTimers({ ... })`) 만 허용; 인자 없는 호출 및 `'modern'` 문자열 인자 호출 금지.
- [x] (Must, REQ-027 FR-02) DOM 쿼리는 React 19 concurrent 환경에서 `findBy*` 계열 async query 사용을 기본 이디엄으로 한다.
- [x] (Must, REQ-029 FR-01) fake-timer teardown 은 `src/setupTests.js` 전역 `afterEach(() => { ...; vi.useRealTimers(); })` 가 담당. 파일별 명시는 선택 (중복 허용).
- [x] (Must, FR-07) 각 이디엄마다 §스코프 규칙 grep-baseline 에 positive + negative 1쌍 실측 수치 박제.
- [x] (Must, FR-08) 출력 경로 `specs/30.spec/green/common/test-idioms.md` (가) 채택. 채택 사유는 §변경 이력 박제 (테스트 인프라 축이 컴포넌트 스코프와 응집도 구분 우선). (2026-04-21 `-spec` suffix 제거 — RULE-01 `29d9da0` 규약 정합.)
- [x] (Must, FR-09) `grep -rn "REQ-20260421-021" specs/30.spec/green/` → 1+ hit (본 spec). consumed followup 6건 경로 §변경 이력·§참고 에 박제.
- [x] (Should, FR-10) 본 spec 은 테스트 이디엄 계약만 다루며 REQ-022 (runtime env), REQ-023 (CI foundation), REQ-024 (React 19 runtime) 축은 독립 유지.
- [x] (NFR-01) 6 불변식 전원 positive/negative grep 재현 가능.
- [x] (NFR-02) `grep -rn "REQ-20260421-021" specs/30.spec/green/` → 1+ hit.
- [x] (NFR-03) inspector 세션 내 생성 파일 = 본 spec 1건 (+ req mv 1건).
- [x] (NFR-04) 본 spec §동작/§공개 인터페이스/§수용 기준 본문에 "진단"·"TODO"·"실측"·"incident"·"blocked" 키워드 0 hit (§변경 이력·§참고 baseline 수치 표기 제외).
- [x] (NFR-05) 특정 릴리스/incident/날짜 귀속 patch 제안 0 hit. TSK 번호 귀속 patch 0.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 29d9da0 | 최초 등록 (REQ-20260421-021). 6건 followup (2026-04-21T05:41:49Z, category=blocked-revisit) 의 잔존 이디엄 계약 흡수. FR-08 (가) `30.spec/green/common/test-idioms.md` 신설 경로 채택 — 테스트 인프라 축은 특정 컴포넌트 스코프(`components/common.md`) 와 응집도를 분리하여 별 파일로 박제하는 편이 audit 용이. consumed followups (6건): `20260421-0541-env-test-stub-adaptation-spec-from-blocked.md`, `20260421-0541-geturl-render-path-test-audit-spec-from-blocked.md`, `20260421-0541-href-intent-assertions-spec-from-blocked.md`, `20260421-0541-msw-test-idioms-unification-spec-from-blocked.md`, `20260421-0541-msw-test-sibling-it-shuffle-race-dedicated-spec-from-blocked.md`, `20260421-0541-react-19-test-layer-adaptation-spec-from-blocked.md`. RULE-07 양성 기준 충족 (평서형 불변식·시점 비의존·반복 검증 가능). | all |
| 2026-04-21 | inspector / 29d9da0 | REQ-20260421-027 FR-02 흡수 — §동작 이디엄 (7) findBy* 기본 이디엄 섹션 신설. consumed followup: `specs/10.followups/20260421-0541-test-isolation-shuffle-safety-cold-start-spec-from-blocked.md`. 선행 done req: `20260421-test-isolation-shuffle-safety-cold-start-spec-reseed-from-followup.md` (REQ-017). baseline: 202 hits `findBy` 다수 파일 채택. | §역할, §공개 인터페이스, §동작, §스코프 규칙, §테스트 현황, §수용 기준 |
| 2026-04-21 | inspector / 29d9da0 | REQ-20260421-029 FR-01 흡수 — §동작 이디엄 (8) fake-timer teardown 전역 정책 섹션 신설. consumed followup: `specs/10.followups/20260421-0541-uniform-fake-timer-teardown-policy-spec-from-blocked.md`. 선행 done req: `specs/60.done/2026/04/20/req/20260420-uniform-fake-timer-teardown-policy.md` (TSK-20260420-38), `specs/60.done/2026/04/21/req/20260421-fake-timer-teardown-residual-cleanup.md`. baseline: `src/setupTests.js:68-71` 복합 afterEach 1 block hit (의미 동등 `vi.useRealTimers()` 포함). RULE-07 정합 — 인프라 계약 한정, 수치 타겟·TSK ID 귀속 plan 배제. | §역할, §공개 인터페이스, §동작, §스코프 규칙, §테스트 현황, §수용 기준 |
| 2026-04-21 | inspector / 0f03547 | REQ-20260421-036 흡수 — §동작 이디엄 (9) console spy 비파괴 보존 신설. FR-07 택 (a) 확장 경로 — 기존 8 이디엄 bank 에 9번째 이디엄 1건 추가 박제 (신설 spec 보다 기존 test-idioms bank 응집도 유지가 유리; 별 `test-console-policy.md` 신설 시 동일 주제 spec 2개로 분산되어 audit 비효율). 3 gate grep-baseline (positive 7/6, negative 본 43/21, negative 보조 0) 실측 박제 (HEAD=0f03547). REQ-20260421-035 FR-02 "런타임 경고 0" 과 **측정 채널 보존 축 vs 결과 불변식 축** 으로 직교 관계 명시. 21 파일 × 43 hits 마이그레이션은 별 task 경로 (본 spec 은 불변식만 박제). consumed: REQ-20260421-036 자율 탐색 (followup 부재). RULE-07 자기검증 — 평서형 "module-level 재할당 금지" + "vi.spyOn + teardown 형태 허용" 불변식, React/Vitest 버전 무관, 특정 파일·incident 귀속 patch 0. | §역할, §동작, §회귀 중점, §스코프 규칙, §테스트 현황, §수용 기준 |

## 참고
- **REQ**: `specs/60.done/2026/04/21/req/20260421-test-idioms-spec-consolidation.md` (본 spec 반영 후 이동).
- **REQ-036 (본 세션 흡수)**: `specs/60.done/2026/04/21/req/20260421-test-console-channel-nondestructive-spy-invariant.md` — discovery 자율 탐색 (followup 부재). 연관 open req: REQ-20260421-035 (dep bump regression-gate + React 런타임 경고 0 불변식).
- **Consumed followups (6건, 2026-04-21T05:41:49Z, category=blocked-revisit)**:
  - `specs/10.followups/20260421-0541-env-test-stub-adaptation-spec-from-blocked.md`
  - `specs/10.followups/20260421-0541-geturl-render-path-test-audit-spec-from-blocked.md`
  - `specs/10.followups/20260421-0541-href-intent-assertions-spec-from-blocked.md`
  - `specs/10.followups/20260421-0541-msw-test-idioms-unification-spec-from-blocked.md`
  - `specs/10.followups/20260421-0541-msw-test-sibling-it-shuffle-race-dedicated-spec-from-blocked.md`
  - `specs/10.followups/20260421-0541-react-19-test-layer-adaptation-spec-from-blocked.md`
- **RULE 준수**:
  - RULE-01: 자기 writer 영역 (`30.spec/green/**`) 만 생성. `20.req/*` 는 mv 로 `60.done/2026/04/21/req/` 이동.
  - RULE-02: inspector writer 영역 외 수정 0.
  - RULE-06: 본 spec 은 grep 게이트 계약 문서가 아니므로 `## 스코프 규칙` 은 N/A 기재 + baseline 수치 박제에 한정.
  - RULE-07: 불변식·계약 한정, 1회성 진단 배제. positive 기준 (평서형/반복 검증/시점 비의존) 충족.
