# Router redirect useEffect 재진입 차단 guard 불변식

> **위치**: `src/**/*.{jsx,tsx}` 중 `useEffect` 본문에서 `navigate(...)` 를 호출하는 컴포넌트 전수. 첫 적용 사례: `src/Log/Writer.jsx` 의 `useEffect` (`:48-65`, deps `[location]` + 본문 `navigate(redirectPage)`). 예외 박제 위치: `docs/router-test-migration-inventory.md` 또는 본 spec §예외 (부재 시 = 빈 집합).
> **관련 요구사항**: REQ-20260422-048
> **최종 업데이트**: 2026-04-22 (by inspector, 신규 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=`c9423d7`).

## 역할

`src/**` 의 컴포넌트가 `useEffect` 내부에서 `navigate(<path>)` 를 수행할 때, navigate 부작용 (router location 갱신) 이 동일 `useEffect` 를 재진입시키지 않아야 한다는 **재진입 차단 guard** 시스템 불변식을 박제한다. 본 불변식은 `<MemoryRouter initialEntries>` 같은 state 관리형 router 패턴에서도 redirect useEffect 가 무한 재렌더 루프를 형성하지 않게 하여 테스트 이관 안전성 (Vitest worker OOM 재발 방지) 을 선제 보장한다.

의도적으로 하지 않는 것: redirect guard 의 구체 구현 기법 선정 (`navigate(..., { replace: true })`, deps 조정, path guard 등 수단 중립 — FR-04), `history` direct dep 제거 자체 (`foundation/dependency-set-integrity.md` §FR-01 관할), `<MemoryRouter>` 의 React Router 내부 동작 변경 요청, 특정 ESLint rule · codemod 선정.

## 공개 인터페이스

- 소비 파일 / 엔트리:
  - `src/**/*.{jsx,tsx}` — `useEffect` 본문에서 `navigate(...)` 를 호출하는 파일 전수.
  - `react-router-dom` `useNavigate` / `useLocation` hook — navigate / location 소비 지점.
  - `docs/router-test-migration-inventory.md` — FR-05 예외 목록 박제 위치 (선택적, 부재 시 예외 = 빈 집합).
- 관찰 계약:
  - `useEffect` 본문이 `navigate(<path>)` 를 호출하고 deps 에 `location` 또는 `location.<key>` 를 포함하면, 해당 `useEffect` 는 `navigate` 이전에 "목표 경로와 현재 경로가 일치하면 early-return" 에 상응하는 재진입 차단 guard 를 가진다.

## 동작

### 1. FR-01 — 재진입 차단 guard 박제 불변식

`src/**/*.{jsx,tsx}` 내 모든 `useEffect` 에 대해 본문에서 `navigate(` 를 호출 하면서 deps 배열에 `location` 또는 `location.<key>` 가 포함되는 경우, 해당 `useEffect` 본문은 `navigate` 이전에 "목표 경로와 현재 경로가 일치하면 early-return" 에 상응하는 재진입 차단 guard 를 가진다. guard 가 없는 경우 해당 useEffect 는 **불변식 위반** 으로 간주한다.

- **첫 적용 사례**: `src/Log/Writer.jsx:48-65` — `useEffect(() => { if(!isAdmin()) { navigate('/log'); return; } ... }, [location])`. 현행 HEAD=`c9423d7` 기준 guard 부재 → 위반 상태.
- **대조군 (위반 후보 아님)**:
  - `src/Monitor/Monitor.jsx:44-57` — deps `[]` → 재진입 경로 자체 부재. FR-01 대상 아님.
  - `src/File/File.jsx:29-40` — deps `[]` → 재진입 경로 부재. FR-01 대상 아님.

guard 의 구체 구현 기법 (예: `location.pathname !== redirectPage` 조기 반환, `navigate(..., { replace: true })` 후 early-return, deps 조정을 통한 `[location]` 제거) 선정은 본 spec 관할 밖이다 (FR-04 참조).

### 2. FR-02 — 테스트 이관 안전성 전제

테스트에서 `<Router location={history.location} navigator={history}>` (history-controlled) 또는 `createMemoryHistory` 기반 controlled router 패턴을 `<MemoryRouter initialEntries={[...]}>` 패턴으로 이관할 때, **이관 대상 컴포넌트는 FR-01 을 사전에 만족해야 한다**. FR-01 미충족 컴포넌트의 이관은 불변식 위반 (Vitest worker 를 OOM 으로 크래시시키는 무한 재렌더 루프 경로 재발) 으로 간주하며, 해당 이관 task 는 fail-fast 로 `50.blocked/task/` 격리 대상이다.

본 FR-02 는 `foundation/dependency-set-integrity.md` §FR-01 (REQ-20260422-046, `history` 제거 + `createMemoryHistory` → `MemoryRouter initialEntries` 이관) 의 **이관 수단 안전성 전제 조건** 이다.

### 3. FR-03 — 차원 상호참조 계약

본 spec (REQ-20260422-048) 의 FR-01/FR-02 는 `foundation/dependency-set-integrity.md` §FR-01 (REQ-20260422-046) 의 "첫 적용 사례: `history` 제거 + `createMemoryHistory` → `MemoryRouter initialEntries` 이관" 본문에서 **이관 수단 안전성 전제 조건** 으로 상호참조된다 (역방향도 본 spec §의존성 에서 dependency-set-integrity 를 참조). 두 축은 차원 분리 — dependency-set-integrity 는 **집합 정합성** (어떤 dep 가 허용되는가) 축, 본 spec 은 **redirect useEffect 재진입 안전성** 축.

### 4. FR-04 — 수단 중립성 (Should)

본 불변식의 재현 검증 수단은 **정적 grep · 정규식 추출** 만으로 충분해야 한다 (런타임·시점 의존 없음). 수단 (예: ESLint custom rule, `react-hooks/exhaustive-deps` 확장, codemod) 선정은 본 spec 관할 밖이며, 수단 부재 자체는 위반이 아니다. 본 spec 은 **결과 (재진입 차단 guard 존재 여부)** 만 박제한다.

### 5. FR-05 — 예외 목록 박제 위치 (Could)

FR-01 위반 예외 (어떤 사유로 guard 없이 redirect `useEffect` 를 유지해야 하는 경우) 는 `docs/dependency-inventory.md` 와 **동일 박제 정신** 으로 별도 박제 위치 (`docs/router-test-migration-inventory.md` 또는 본 spec §예외) 에 `<파일:라인> — <근거>` 형태로 박제한다. 부재 시 예외 = 빈 집합. 예외 0 을 목표하되 근거 박제 시 존속 허용.

### 회귀 중점

- `src/Log/Writer.jsx:48-65` guard 도입 후 회귀 (guard 제거 또는 deps `[location]` + 본문 navigate 재도입) → FR-01 위반 재발.
- 신규 컴포넌트에서 redirect useEffect 를 guard 없이 deps `[location]` 로 추가 → FR-01 위반 확산.
- FR-01 위반 컴포넌트를 `<MemoryRouter initialEntries>` 로 이관 → FR-02 위반 (Vitest worker OOM 무한 재렌더 루프 경로 재발).
- `docs/router-test-migration-inventory.md` 의 예외 엔트리가 실제로 guard 로 흡수 가능 상태인데 잔존 → FR-05 박제 정합성 drift (예외 최소화 원칙 위반).
- dependency-set-integrity §FR-01 상호참조 (REQ-048 문자열) 제거 시 FR-03 차원 상호참조 계약 위반.

## 의존성

- 외부: `react-router-dom` v7+ (`useNavigate` / `useLocation` / `<MemoryRouter initialEntries>` hook · 컴포넌트 제공), React (`useEffect` 런타임).
- 내부: `src/Log/Writer.jsx` (첫 적용 사례), `src/Monitor/Monitor.jsx` (대조군, deps `[]`), `src/File/File.jsx` (대조군, deps `[]`), `src/Log/Writer.test.jsx` (FR-02 이관 대상), `docs/router-test-migration-inventory.md` (FR-05 예외 박제 위치, 선택적).
- 역의존:
  - `foundation/dependency-set-integrity.md` §FR-01 — 본 spec FR-01/FR-02 를 이관 수단 안전성 전제 조건으로 상호참조 (FR-03 박제).
  - `common/test-idioms.md` §4 (MSW 수명주기/이디엄) — 테스트 이디엄 경계. 본 spec 은 이관 수단 안전성 계약이지 테스트 이디엄 자체가 아니므로 차원 직교.
  - `components/log.md` (있을 시) — Writer 컴포넌트 동작 spec. 본 spec 은 Writer 의 redirect useEffect 재진입 안전성만 박제.

## 스코프 규칙

- **expansion**: 불허. 본 spec 불변식 적용 범위는 `src/**/*.{jsx,tsx}` 의 redirect useEffect (본문 `navigate(` 호출 + deps `[location]` 포함) 한정. 신규 redirect 수단 (예: `<Navigate>` 컴포넌트, router v8 신규 API) 발생 시 별 req 로 본 불변식 확장을 박제하며, 그때까지는 현 범위 엄수.
- **grep-baseline** (inspector 발행 시점, HEAD=`c9423d7` 실측):
  - (a) `grep -rnE "useEffect\s*\(" src --include="*.jsx"` → 다수 hits (프로젝트 전반 useEffect 등록 지점). 본 spec 의 1차 매치 후보 집합.
  - (b) `grep -rn "navigate(redirectPage)" src --include="*.jsx"` → 3 hits in 3 files:
    - `src/Monitor/Monitor.jsx:49` — deps `[]` (대조군, FR-01 후보 아님).
    - `src/File/File.jsx:34` — deps `[]` (대조군, FR-01 후보 아님).
    - `src/Log/Writer.jsx:53` — deps `[location]` (**FR-01 첫 적용 사례, 위반 상태**).
  - (c) `sed -n '48,65p' src/Log/Writer.jsx` — deps `[location]` (65 라인) 확증 + 본문 `navigate(redirectPage)` (53 라인) 확증. FR-01 guard 부재 상태 박제.
  - (d) `sed -n '44,57p' src/Monitor/Monitor.jsx` — deps `[]` (57 라인) 확증. FR-01 후보 제외 (대조군).
  - (e) `sed -n '29,40p' src/File/File.jsx` — deps `[]` (40 라인) 확증. FR-01 후보 제외 (대조군).
  - (f) `grep -n "from 'history'\|createMemoryHistory" src/Log/Writer.test.jsx` → 2 hits (`:2`, `:51`). FR-02 이관 대기 상태 (dependency-set-integrity §FR-01 과 상호참조).
  - (g) `ls docs/router-test-migration-inventory.md` → 0 hit (파일 부재). FR-05 예외 목록 = 빈 집합 baseline.
- **rationale**: gate (b) 는 `navigate(redirectPage)` 호출 지점 전수 열거 → FR-01 후보 집합 확정 (3 건). gate (c) 는 FR-01 첫 적용 사례 위반 상태 (deps `[location]` + 본문 navigate + guard 부재) 박제. gate (d)(e) 는 대조군 (deps `[]`) 이 FR-01 후보에서 제외됨을 확증 — 본 spec 의 unit-of-detection 는 "본문 navigate + deps 에 location" 이며, 다른 경로 (deps `[]` / deps 에 location 미포함) 는 재진입 경로 자체 부재로 양성 기준 충족. gate (f) 는 FR-02 이관 수단 안전성 전제의 검증 대상 (이관 후 0 hit 도달 시 FR-02 역시 충족 → dependency-set-integrity FR-01 진행 가능). gate (g) 는 FR-05 baseline. 후속 task (planner 관할) 는 expansion 불허로 carve 예상이며, 수정 파일은 `src/Log/Writer.jsx` (guard 도입) 한정 (Writer.test.jsx 이관은 REQ-046 축 별 task).

## 테스트 현황

- [ ] (c) FR-01 첫 적용 사례 (`src/Log/Writer.jsx:48-65` redirect guard 도입) 미충족 — 후속 task 완료 전까지 위반 상태.
- [ ] (f) FR-02 이관 수단 안전성 (Writer.test.jsx 의 `history` 제거 + `<MemoryRouter initialEntries>` 이관) 미충족 — REQ-046 축 task (supersedes TSK-20260421-91) 재carve 대기.
- [x] (d) Monitor.jsx deps `[]` → FR-01 후보 제외 확증 (대조군). `src/Monitor/Monitor.test.jsx` 의 `redirect if not admin` 케이스가 `<MemoryRouter>` 패턴만으로 PASS 중 (직접 실증).
- [x] (e) File.jsx deps `[]` → FR-01 후보 제외 확증 (대조군). `src/File/File.test.jsx` 는 `<MemoryRouter>` 로 pass 중.
- [x] (g) FR-05 예외 목록 현황 = 빈 집합 — `docs/router-test-migration-inventory.md` 부재 (예외 0 baseline).
- [x] `foundation/dependency-set-integrity.md` §FR-01 상호참조 반영 (FR-03 박제 — 본 세션 동반 편집).

## 수용 기준

- [ ] (Must, FR-01) `src/Log/Writer.jsx:48-65` 의 redirect `useEffect` 는 `navigate(redirectPage)` 호출 이전에 "목표 경로와 현재 경로가 일치하면 early-return" 에 상응하는 재진입 차단 guard 를 가진다. 기법 선정은 수단 중립 (예: `if (location.pathname === redirectPage) return;`, `navigate(redirectPage, { replace: true })` 후 후속 동기화 guard, deps 조정 등).
- [ ] (Must, FR-01) `grep -rnE "navigate\([^)]*\)" src --include="*.jsx"` 결과 전수 중 동일 `useEffect` 본문에 포함되며 해당 `useEffect` 의 deps 배열이 `location` 또는 `location.<key>` 를 포함하는 경우 = FR-05 예외 박제 수 (기본 0).
- [ ] (Must, FR-02) `<MemoryRouter initialEntries={[{pathname:"/log/write",state:null}]}><Writer/></MemoryRouter>` 렌더가 무한 재렌더 없이 종료한다 (벤치: Vitest worker 메모리 플래토, 5s 내 unmount). `npx vitest run --no-coverage src/Log/Writer.test.jsx` 단독 실행이 SIGABRT · OOM · 10s 이상 타임아웃 없이 종료.
- [ ] (Must, FR-02) `npm test` 전체 실행 시 `src/Log/Writer.jsx` line/branch/function/statement coverage 가 4축 threshold (lines ≥ 98%, functions ≥ 94%, statements ≥ 97%, branches ≥ 94%) 를 충족한다.
- [x] (Must, FR-03) 본 spec 의 §의존성 / §변경 이력 에 `foundation/dependency-set-integrity.md` (REQ-046) 상호참조 문자열 존재. 역방향 `foundation/dependency-set-integrity.md` §FR-01 본문에 `REQ-20260422-048` 상호참조 문자열 존재 (본 세션 동반 편집으로 박제).
- [ ] (Should, FR-04) 본 spec 본문에 특정 ESLint rule · codemod · 정적 분석 도구 귀속 문구 0 건. "정적 grep · 정규식 · import 그래프 추출" 수단 외 런타임·시점 의존 검증 수단 부재.
- [ ] (Could, FR-05) 예외 목록은 `docs/router-test-migration-inventory.md` 에 `<파일:라인> — <근거>` 형태로 박제. 본 spec 발행 시점 예외 = 빈 집합.
- [ ] (Must, 재현성) 동일 HEAD · 동일 Node 환경에서 FR-01 grep 게이트 결과 결정론적 (`grep -rnE` 재실행 결과 동일).
- [ ] (Must, 스코프) 후속 task 수정 대상은 `src/Log/Writer.jsx` 한정. `src/Monitor/Monitor.jsx`, `src/File/File.jsx`, `src/**/*.test.jsx`, `package.json`, `.github/workflows/**` 변경 0 (단 Writer.test.jsx 는 별 task - REQ-046 축 - 에서 이관; 본 spec 의 후속 task 범위 밖).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-22 | inspector / HEAD=c9423d7 | 최초 등록 (REQ-20260422-048 흡수). `src/**/*.{jsx,tsx}` 내 redirect `useEffect` (본문 `navigate(` + deps `[location]` 포함) 는 재진입 차단 guard 를 가져야 한다는 시스템 불변식 박제. `foundation/dependency-set-integrity.md` §FR-01 (REQ-046) 과 FR-03 상호참조 (이관 수단 안전성 전제 조건). 첫 적용 사례 = `src/Log/Writer.jsx:48-65` (deps `[location]` + 본문 `navigate(redirectPage)` + guard 부재). 대조군 = `src/Monitor/Monitor.jsx:44-57` (deps `[]`), `src/File/File.jsx:29-40` (deps `[]`) — FR-01 후보 제외. baseline 실측 (HEAD=c9423d7): (b) `navigate(redirectPage)` 3 hits, (c) Writer.jsx deps `[location]` 확증 + guard 부재, (d)(e) 대조군 deps `[]` 확증, (f) Writer.test.jsx `history` import 2 hits (FR-02 이관 대기, REQ-046 축과 상호참조), (g) `docs/router-test-migration-inventory.md` 부재 (FR-05 예외 빈 집합). RULE-07 자기검증: FR-01~05 전원 평서형 · 반복 검증 가능 · 시점 비의존 — 첫 적용 사례 (Writer.jsx:48-65) 는 "불변식 적용 경계의 증거 박제" 로 본문 기재하되 계약 범위는 임의 redirect useEffect 에 재적용. TSK-20260421-91 blocked 사실은 §역할 · §의존성 에 배경으로만 언급, FR 본문에 특정 incident 귀속 문구 부재. RULE-06: grep-baseline 7 gate 실측 수치 박제. RULE-01: inspector writer 영역만 (green/common 신규 + green/foundation 상호참조 편집 + 20.req → 60.done/req mv). `src/**`, `package.json`, `.husky/**`, `docs/**` 편집 부재. | 신규 전 섹션 |

## 참고

- **REQ 원문 (완료 이동)**: `specs/60.done/2026/04/22/req/20260422-router-test-migration-redirect-reentry-invariant.md`.
- **관련 spec**:
  - `specs/30.spec/green/foundation/dependency-set-integrity.md` — REQ-046 (집합 정합성 축). 본 spec §FR-03 상호참조 대상.
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` — REQ-035 (bump 후 결과 게이트 축). 차원 분리.
  - `specs/30.spec/blue/common/test-idioms.md` §4 — 테스트 이디엄 경계. 본 spec 은 이관 수단 안전성 계약 축.
- **선행 followup / blocked / task**:
  - `specs/60.done/2026/04/22/followups/20260421-2003-writer-redirect-loop-blocks-history-migration.md` (본 req 의 입력).
  - `specs/50.blocked/task/TSK-20260421-91-remove-history-direct-dep-and-migrate-writer-test_reason.md` (실측 재현 증거 — OOM 394s 크래시).
  - `specs/50.blocked/task/TSK-20260421-91-remove-history-direct-dep-and-migrate-writer-test.md` (carve 원본, REQ-046 축 재carve 대상).
- **외부 출처** (REQ 참조):
  - [React `useEffect` dependency array 재진입 주의](https://react.dev/reference/react/useEffect#my-effect-runs-after-every-re-render) — Effect 가 자기 deps 를 상태 변경시키면 무한 루프 유발 원칙 (React 공식 문서).
  - [React Router v7 `<MemoryRouter>` — controlled-less stateful routing](https://reactrouter.com/start/library/routing#memoryrouter).
  - [React Router v6→v7 Migration — history direct dep removal](https://reactrouter.com/upgrading/v6).
- **RULE 준수**:
  - RULE-07: FR-01~05 는 평서형 불변식 (정적 grep 으로 재현 검증 가능, 특정 릴리스·incident 귀속 부재). `history` / TSK-20260421-91 은 배경 증거로만 언급되고 계약 범위는 임의 redirect useEffect 에 재적용.
  - RULE-06: §스코프 규칙 grep-baseline 7 gate 실측 수치 + `파일:라인` 박제.
  - RULE-01: inspector writer 영역만 (green/common 신규 + green/foundation 상호참조 편집 + 20.req → 60.done/req mv).
  - RULE-02: `src/**` / `package.json` / `.husky/**` / `docs/**` 편집 부재 — 세션 diff 는 `30.spec/green/common/router-redirect-reentry-guard.md` 신설 + `30.spec/green/foundation/dependency-set-integrity.md` 상호참조 편집 + `20.req/*` → `60.done/2026/04/22/req/` mv + `.inspector-seen` 갱신 한정.
