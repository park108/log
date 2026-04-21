# Dependency 집합 정합성 — 미사용 direct dep 금지 불변식

> **위치**: `package.json` (`dependencies`, `devDependencies`), `src/**`, 빌드·테스트·툴링 진입점 설정 파일 (`vite.config.*`, `vitest.config.*`, `tsconfig*.json`, `eslint.config.*`, `.husky/**`, `setupTests*.js`, `src/test-utils/**`), `docs/dependency-inventory.md` (예외 목록 박제 위치).
> **관련 요구사항**: REQ-20260422-046, REQ-20260422-048 (FR-01 이관 수단 안전성 상호참조)
> **최종 업데이트**: 2026-04-22 (by inspector, REQ-048 상호참조 추가)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=`06a8fb9`).

## 역할

`package.json` 의 `dependencies` + `devDependencies` 각 항목이 **저장소 내 실제 소비 지점 (정적 import · CLI 진입점 · 설정 파일 참조 · 타입 meta · 피어 요구)** 중 최소 하나와 1:1 대응해야 한다는 **bump 전 집합 정합성** 시스템 불변식을 박제한다. 공격 표면 · supply-chain surface 최소화를 목표한다. 의도적으로 하지 않는 것: 의존성 버전 bump 자체의 결과 게이트 (`foundation/dependency-bump-gate.md` 관할), `node_modules` 전이적 의존성 정리 (npm 해결 책임), `package-lock.json` 포맷·락 정책, deprecated API 가 런타임에 경고를 내는 현상 (`foundation/dependency-bump-gate.md` FR-02 관할). 본 spec 은 **bump 후 결과** 축과 차원 분리된 **bump 전 집합 정합성** 축이다.

## 공개 인터페이스

- 소비 파일 / 엔트리:
  - `package.json` `"dependencies"` / `"devDependencies"` — 검증 대상 key 집합.
  - `src/**/*.{js,jsx,ts,tsx,d.ts,css}` — 정적 import / `require` 그래프의 원천.
  - `package.json` `"scripts"`, `"browserslist"`, `"lint-staged"` — CLI 및 구성 참조 지점.
  - 설정 파일 화이트리스트: `vite.config.*`, `vitest.config.*`, `tsconfig*.json`, `eslint.config.*`, `.husky/**`, `setupTests*.js`, `src/test-utils/**`.
  - `docs/dependency-inventory.md` — 예외 목록 (FR-04) 박제 위치. 부재 시 예외 = 빈 집합.
- 관찰 계약:
  - `package.json` 의 모든 direct dep key 는 위 소비 경로 중 최소 하나에 매치된다. 매치 실패 시 해당 key 는 제거 대상.

## 기능 불변식

### FR-01 — 미사용 direct dep 제거 (REQ-046 FR-01, 첫 적용 사례: `history`)

`package.json` 의 `dependencies` + `devDependencies` 에 나열된 각 key 에 대해, 본 spec §FR-02 의 4 축 매치 규칙을 적용했을 때 어느 축에도 매치되지 않으면 해당 key 는 `package.json` 에서 제거된다. 본 불변식의 **첫 적용 사례**는 `history` (v5.3.0) — react-router-dom v7 자체 내장 history 구현으로 대체된 후 저장소 내 단일 사용 지점 (`src/Log/Writer.test.jsx:2` 의 `createMemoryHistory` import) 이 남은 레거시 direct dep — 의 제거이며, 해당 제거 직전에 소비 지점은 react-router-dom `MemoryRouter initialEntries={[...]}` 패턴으로 의미 등가 이관된다 (동 파일 내 이관 참조 패턴 `src/Log/Writer.test.jsx:80-81` 기 존재).

**이관 수단 안전성 전제 조건**: 본 FR-01 의 첫 적용 사례 이관 (`createMemoryHistory` → `<MemoryRouter initialEntries={[...]}>`) 은 `common/router-redirect-reentry-guard.md` (REQ-20260422-048) §FR-01 / §FR-02 의 재진입 차단 guard 불변식이 이관 대상 컴포넌트 (`src/Log/Writer.jsx:48-65`) 에 **사전 충족** 된 상태에서만 수행 가능하다. guard 미충족 상태에서의 이관은 Vitest worker 무한 재렌더 루프 경로 재발 (OOM 크래시) 로 FR-01 의 DoD (`npm test` PASS + 4축 coverage threshold) 를 위반한다. 두 축은 차원 직교 — 본 spec 은 **집합 정합성**, router-redirect-reentry-guard 는 **redirect useEffect 재진입 안전성** — 이며, 후자가 선행 충족되어야 본 spec FR-01 의 이관이 성립한다.

### FR-02 — 집합 정합성 4 축 매치 규칙 (REQ-046 FR-03)

`package.json` `dependencies` + `devDependencies` 의 각 key `<pkg>` 는 다음 4 축 중 **최소 하나** 에 매치될 때에만 허용된다.

- **(a) 정적 import 축** — `src/**/*.{js,jsx,ts,tsx,d.ts,css}` 중 어느 한 파일에서 `from '<pkg>'` 또는 `from "<pkg>"` 또는 `require('<pkg>')` 또는 `require("<pkg>")` 또는 scoped subpath (`from '<pkg>/<sub>'`) 형태로 정적 import 된다.
- **(b) CLI · 설정 참조 축** — `package.json` `"scripts"` / `"browserslist"` / `"lint-staged"` 값, 또는 설정 파일 화이트리스트 (`vite.config.*`, `vitest.config.*`, `tsconfig*.json`, `eslint.config.*`, `.husky/**`, `setupTests*.js`, `src/test-utils/**`) 본문에서 CLI 이름 또는 모듈 import 형태로 참조된다.
- **(c) 타입 meta 축** — `<pkg>` 가 `@types/<name>` 형태이며 대응 런타임 패키지 `<name>` 이 (a) 또는 (b) 에 매치되거나, `<name>` 이 Node.js 표준 모듈 (`@types/node` 처럼 런타임 런처 전반에 타입 제공 목적) 인 경우.
- **(d) peer 충족 축** — `<pkg>` 가 (a)(b) 에 직접 매치되지는 않으나, (a)(b) 에 매치된 다른 패키지의 **peer dependency 제약 만족** 을 위해 필요한 경우 (예: `@testing-library/react` v16+ peer 로 요구되는 `@testing-library/dom` 등). 본 축 사용 시 근거를 `docs/dependency-inventory.md` 에 박제 (FR-04 와 중첩).

위 4 축 중 어느 것에도 매치되지 않으면 **불변식 위반** 이며, 제거 대상이다.

### FR-03 — 예외 목록 박제 위치 (REQ-046 FR-04, Should)

FR-02 의 (a)(b)(c)(d) 4 축 어디에도 자연스럽게 매치되지 않지만 의도적으로 유지해야 하는 패키지 (예: 임시 compat shim, type-only meta, peer-only) 는 `docs/dependency-inventory.md` 에 `<pkg> — <유지 근거 1~2 줄>` 형태로 1:1 박제한다. 해당 문서가 부재하거나 key 가 박제되지 않으면 예외 = 빈 집합으로 간주되며 본 spec §FR-01 에 따라 제거 대상이다. 예외 0 을 목표하되 근거 박제 시 존속 허용.

### FR-04 — 차원 분리 명시 (REQ-046 FR-05, Should)

본 spec 의 불변식은 `foundation/dependency-bump-gate.md` (REQ-20260421-035) 의 "bump 후 결과 게이트" 축과 **차원 분리** 된다. 본 spec 은 **bump 전 집합 정합성** (어떤 dep 가 허용 집합에 속하는가) 을 박제하며, `dependency-bump-gate.md` 는 허용 집합이 주어진 뒤 해당 집합을 bump 했을 때 회귀 0 + 런타임 경고 0 을 박제한다. 두 축은 선후 관계 (본 spec 이 먼저 충족, bump-gate 가 뒤이어 충족) 이며 교차 중복 박제하지 않는다.

### FR-05 — 재현성 (REQ-046 NFR-03)

본 불변식은 정적 grep · 정규식 · import 그래프 추출만으로 재현 검증 가능하며, 런타임 상태 · 시점 · 특정 릴리스 이벤트에 의존하지 않는다. 적용 수단 (예: `depcheck` 또는 동등 정적 분석 도구 도입) 의 선택은 본 spec 의 관할 밖이며, 수단 부재 자체는 본 불변식 위반이 아니다. 본 불변식은 **결과 (집합 정합성 만족 여부)** 만 박제한다.

### 회귀 중점

- 신규 direct dep 추가 시 FR-02 4 축 매치 검증 없이 merge → 미사용 dep 재진입 → 공격 표면 확대.
- `history` 제거 후 재도입 (코드 리뷰 누락) → FR-01 첫 적용 사례 회귀.
- `docs/dependency-inventory.md` 의 예외 엔트리가 실 축 매치로 흡수 가능 상태에도 잔존 → FR-03 박제 정합성 drift (예외 최소화 원칙 위반).
- `foundation/dependency-bump-gate.md` 와 중복 박제 시 본 spec §FR-04 위반.

## 의존성

- 외부: npm (패키지 매니저), `package.json` 스펙, react-router-dom v7 `MemoryRouter` (FR-01 첫 적용 사례 이관 대상), 정적 분석 툴 (예: `depcheck` — 수단 중립).
- 내부: `package.json` (`dependencies`, `devDependencies`, `scripts`, `browserslist`, `lint-staged`), `src/**`, 설정 파일 화이트리스트 (공개 인터페이스 절 열거), `docs/dependency-inventory.md` (선택적).
- 역의존:
  - `foundation/dependency-bump-gate.md` — bump 후 결과 게이트. 본 spec 의 "bump 전 집합 정합성" 이 선행 충족된 상태를 전제.
  - `foundation/tooling.md` — 툴링 CLI 진입점 집합 정의. FR-02 (b) 축의 설정 파일 화이트리스트 근거.
  - `foundation/husky-hook-entrypoint.md` — `.husky/**` 이 FR-02 (b) 축 설정 파일 화이트리스트 내 참조 지점.
  - `common/test-idioms.md` §4 — FR-01 첫 적용 사례 (`history` 이관) 시 테스트 이디엄 준수 경계.
  - `common/router-redirect-reentry-guard.md` (REQ-20260422-048) — FR-01 첫 적용 사례 이관의 **수단 안전성 전제 조건** (redirect useEffect 재진입 차단 guard 선행 충족). 본 spec FR-01 DoD 성립 조건.

## 스코프 규칙

- **expansion**: 불허. 본 spec 불변식 적용 범위는 `package.json` direct dep key + `src/**` + 설정 파일 화이트리스트 한정. 신규 소비 경로 (예: 새 설정 파일 추가) 발생 시 별 req 로 화이트리스트 확장을 박제 하며, 그때까지는 기존 화이트리스트 엄수.
- **grep-baseline** (inspector 발행 시점, HEAD=`06a8fb9` 실측):
  - (a) `grep -nE "\"dependencies\":\|\"devDependencies\":" package.json` → 2 hits in 1 file:
    - `package.json:6` — `"dependencies": {`
    - `package.json:42` — `"devDependencies": {`
  - (b) `grep -n '"history"' package.json` → 1 hit (`package.json:54` — `"history": "^5.3.0",`). FR-01 **첫 적용 사례 위반 상태** (현 시점 미사용 direct dep 1 건).
  - (c) `grep -rnE "from 'history'|from \"history\"|createMemoryHistory" src` → 2 hits in 1 file:
    - `src/Log/Writer.test.jsx:2` — `import { createMemoryHistory } from 'history'`
    - `src/Log/Writer.test.jsx:51` — `const history = createMemoryHistory({ initialEntries: ["/log/write"]});`
    (이관 후 양 hits 모두 0 이어야 한다 — react-router-dom `MemoryRouter` 로 의미 등가 흡수.)
  - (d) `grep -nE "MemoryRouter initialEntries" src/Log/Writer.test.jsx` → 1 hit (`src/Log/Writer.test.jsx:80` — `<MemoryRouter initialEntries={[testEntry]}>`). FR-01 이관 참조 패턴 **기 존재** 확증 (동 파일 내 이미 동일 패턴 사용 중 → 이관 난이도 낮음).
  - (e) `ls docs/dependency-inventory.md` → 0 hit (파일 부재). FR-03 예외 목록 = 빈 집합으로 간주 (spec 박제 시점).
  - (f) `grep -rnE "from 'history/'|from \"history/\"" src` → 0 hit (subpath import 부재). FR-02 (a) 축에서 `history` 의 subpath 매치도 없음 재확인.
- **rationale**: gate (a) 는 FR-01/FR-02 의 검증 대상 key 집합 경계 확인. gate (b)(c) 는 FR-01 의 첫 적용 사례 (`history`) 베이스라인 — 본 spec 발행 시점 위반 상태를 박제하여 차기 task 가 green→blue 승격 조건으로 양 게이트 0 hit 달성을 목표. gate (d) 는 이관 난이도·참조 패턴 기 존재 증빙. gate (e) 는 FR-03 예외 목록 현황 (빈 집합). gate (f) 는 `history` subpath 미사용 확증 — 제거 후 전이적으로도 소스 레벨 참조가 잔존하지 않음 재확인. 전환 task (planner 관할) 는 expansion 불허로 carve 예상이며, 수정 파일은 `package.json`, `src/Log/Writer.test.jsx`, `package-lock.json` (npm 재해결 결과물) 한정.

## 테스트 현황

- [ ] (b)(c) FR-01 첫 적용 사례 (`history` 제거 + Writer.test.jsx 이관) 미충족 — 전환 task 완료 전까지 위반 상태.
- [x] (a) FR-02 검증 대상 key 집합 경계 (2 hits `dependencies`/`devDependencies`) 확증.
- [x] (d) 이관 참조 패턴 (`MemoryRouter initialEntries`) 기 존재 확증 — FR-01 이관 수단 존재.
- [x] (e) FR-03 예외 목록 현황 = 빈 집합 — `docs/dependency-inventory.md` 부재 (예외 0 baseline).
- [x] (f) `history` subpath 정적 import 부재 확증.
- [x] `foundation/dependency-bump-gate.md` FR-01/02 와 차원 분리 명시 (§FR-04).

## 수용 기준

- [ ] (Must, FR-01) `grep -n '"history"' package.json` → 0 hit.
- [ ] (Must, FR-01) `grep -rnE "from 'history'|from \"history\"|createMemoryHistory" src` → 0 hit. "redirect if not admin" it block 의 의도 (admin 아닌 사용자 `/log/write` 진입 시 redirect) 는 이관 후에도 동등 어설션으로 유지.
- [ ] (Must, FR-02) `package.json` 의 `dependencies` + `devDependencies` 각 key 에 대해 (a)(b)(c)(d) 4 축 매치 검증 수행 시, 예외 목록 (FR-03) 에 박제되지 않은 unmatched key 수 = 0.
- [ ] (Must, FR-04) 본 spec §FR-04 본문에 `foundation/dependency-bump-gate.md` (REQ-035) 와 "bump 전 집합 정합성 vs bump 후 결과" 차원 분리 명시 유지.
- [ ] (Must, 재현성 NFR) FR-05 가 박제하는 "정적 grep·정규식·import 그래프 추출" 수단 외 런타임·시점 의존 검증 수단 부재 (본 spec 본문 내 "특정 릴리스·특정 bump 이벤트" 귀속 문구 0 건).
- [ ] (Should, FR-03) 예외 목록은 `docs/dependency-inventory.md` 에 `<pkg> — <유지 근거>` 형태로 박제. 본 spec 발행 시점 예외 = 빈 집합.
- [ ] (Must, 스코프) 전환 task 수정 대상은 `package.json`, `src/Log/Writer.test.jsx`, `package-lock.json` 한정. 그 외 `src/**`, `vite.config.js`, `.github/workflows/**` 변경 0.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-22 | inspector / HEAD=06a8fb9 | 최초 등록 (REQ-20260422-046 흡수). `package.json` 의 `dependencies`/`devDependencies` 각 key 가 `src/**` 정적 import · CLI/설정 참조 · 타입 meta · peer 충족 4 축 중 최소 하나에 매치돼야 한다는 "bump 전 집합 정합성" 시스템 불변식 박제. `dependency-bump-gate.md` (REQ-035) 와 차원 분리 (전자 = bump 후 결과, 본 spec = bump 전 집합). 첫 적용 사례 = `history` (v5.3.0) direct dep 제거 + `src/Log/Writer.test.jsx` 의 `createMemoryHistory` → `MemoryRouter initialEntries` 이관. baseline 실측: `package.json:54` (`history ^5.3.0`), `src/Log/Writer.test.jsx:2,51` (2 hits), 이관 참조 패턴 `src/Log/Writer.test.jsx:80` 기 존재, `docs/dependency-inventory.md` 부재 (예외 빈 집합), `history` subpath 0 hit. RULE-07 자기검증: (i) FR-01~05 평서형 계약, (ii) 반복 검증 가능 (정적 grep·정규식 재현), (iii) 시점·이벤트 귀속 없음 (특정 릴리스 번호 본문 부재, §변경 이력 의 HEAD 해시는 baseline 스냅샷 용도), (iv) `foundation/dependency-bump-gate.md` 와 명시적 차원 분리. 1회성 진단/incident patch 플랜 부재. | 신규 전 섹션 |
| 2026-04-22 | inspector / HEAD=c9423d7 | REQ-20260422-048 흡수 상호참조 반영. §FR-01 본문에 `common/router-redirect-reentry-guard.md` (REQ-048) §FR-01/§FR-02 의 "이관 수단 안전성 전제 조건" 박제 추가 (첫 적용 사례 이관은 redirect useEffect 재진입 차단 guard 가 `src/Log/Writer.jsx:48-65` 에 선행 충족된 상태에서만 성립). §의존성 역의존 목록에 `common/router-redirect-reentry-guard.md` 추가. 두 축 차원 직교 명시 (본 spec = 집합 정합성, router-redirect-reentry-guard = redirect useEffect 재진입 안전성). TSK-20260421-91 blocked 사실 (OOM 394s 크래시) 은 REQ-048 §역할 · §변경 이력 에 배경으로만 언급되고 본 spec FR-01 본문에서는 "이관 수단 안전성 전제 조건" 이라는 수단 중립 평서형 표현으로만 박제 — 특정 incident 귀속 문구 배제. RULE-07 자기검증 유지 (시점 비의존 · 반복 검증 가능). RULE-06: 본 세션 grep-baseline 재측정 불요 (§FR-02 4 축 매치 규칙 변경 없음, 본 세션은 상호참조 박제 한정). RULE-01: inspector writer 영역만 (green/foundation 상호참조 편집 + green/common 신규 + 20.req → 60.done/req mv). | §역할, §FR-01, §의존성 역의존, §변경 이력 |

## 참고

- **REQ 원문 (완료 이동)**: `specs/60.done/2026/04/22/req/20260422-unused-legacy-dep-removal-history-and-surface-minimization.md`.
- **관련 spec**:
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035 — bump 후 결과 게이트 축. 본 spec 과 차원 직교).
  - `specs/30.spec/blue/foundation/tooling.md` — FR-02 (b) 축 설정 파일 화이트리스트 근거.
  - `specs/30.spec/blue/common/test-idioms.md` §4 — FR-01 첫 적용 사례 이관 시 테스트 이디엄 경계.
  - `specs/30.spec/green/foundation/husky-hook-entrypoint.md` — `.husky/**` 이 FR-02 (b) 축 화이트리스트 내 참조 지점으로 포함.
- **외부 출처 (REQ 참조)**:
  - [React Router v7 Migration — history removal](https://reactrouter.com/upgrading/v6).
  - [history npm package](https://www.npmjs.com/package/history) — v5 유지보수 상태 확인용.
- **선행 done req**:
  - `specs/60.done/2026/04/21/req/20260421-dependency-bump-regression-gate-and-react-runtime-warning-invariant.md` — REQ-035 (결과 게이트 축 선행 박제).
  - `specs/60.done/2026/04/20/req/20260420-upgrade-react-19.md` — archive (런타임 이관 별 축).
- **RULE 준수**:
  - RULE-07: FR-01~05 는 특정 릴리스·날짜·이벤트에 귀속되지 않는 평서형 불변식. `history` 은 "첫 적용 사례" 로 §변경 이력 에 박제하되 본 spec 의 계약 범위는 임의 direct dep 에 재적용 가능.
  - RULE-06: §스코프 규칙 grep-baseline 6 gate 실측 수치 + `파일:라인` 박제 (2 hits / 1 hit / 2 hits / 1 hit / 0 hit / 0 hit).
  - RULE-01: inspector writer 영역만 (green/foundation 신규 + 20.req → 60.done/req mv). `.husky/*`, `package.json`, `src/**` 변경 0.
  - RULE-02: `src/**` / `package.json` / `docs/**` / `.github/**` 편집 부재 — 세션 diff 는 `30.spec/green/foundation/dependency-set-integrity.md` 신설 + `20.req/*` → `60.done/2026/04/22/req/` mv + `.inspector-seen` 갱신 한정.
