# island regression guard — `.jsx`/`.js` 재도입 PR 자동 차단 효능 불변식

> **위치**: ESLint 구성 (`eslint.config.js`) 또는 CI workflow step (`.github/workflows/**`) 또는 husky hook (`.husky/**`) 등 게이트 어디든 (수단 중립). 게이트 진입 명령 = `npm run lint` 또는 의미상 동등 명령.
> **관련 요구사항**: REQ-20260517-059
> **최종 업데이트**: 2026-05-17 (inspector 신규 등록 · REQ-059 흡수)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. baseline 수치는 HEAD 스냅샷 (§참고 재현 가능).

## 역할
type-safe island 확정 디렉터리에 `.jsx`/`.js` 런타임/테스트 파일을 **재도입** (또는 신규 도입) 하는 PR/커밋이 master 머지 전에 **자동 차단 게이트** 에 의해 fail 처리된다는 **회귀 차단 효능 불변식** 을 박제. `foundation/src-typescript-migration` (REQ-20260422-051) §동작 6 FR-05 가 "차단 대상" 평서문만 박제하고 차단 수단·차단 효능을 별도 task 위임한 결과 enforcement 부재 상태였던 갭을, 본 spec 이 **결과 효능 (게이트 rc ≠ 0)** 차원으로 신규 박제하여 보강한다. 의도적으로 하지 않는 것: (a) 차단 수단 선정 (ESLint `no-restricted-syntax` vs flat-config `files:` glob override vs CI step rc vs husky guard vs 그 외 — FR-05 수단 중립성), (b) 비-island 디렉터리 (`src/Log/`, `src/Monitor/`, src root) 의 `.jsx`/`.js` 잔존 처리 (`src-typescript-migration` FR-01/FR-02 수렴 축), (c) PR template / GitHub branch protection rule UI 설정 (운영자 축), (d) island 정의 자체 변경 (`src-typescript-migration` §동작 6 FR-05 정의 관할).

## 공개 인터페이스
본 spec 은 단일 모듈 인터페이스가 아닌 **저장소 축 불변식** 이다. 외부 관찰 계약:
- **정적 관찰 (positive)**: 임의 island 확정 디렉터리 `<dir>` 에 신규 `<dir>/<name>.jsx` 또는 `<dir>/<name>.js` 파일이 staged 된 워크트리에서 `npm run lint` (또는 의미상 동등 명령) 의 종료 코드 ≠ 0.
- **정적 관찰 (negative)**: 동일 명령이 비-island 디렉터리의 `.jsx`/`.js` 신규 파일에 대해서는 본 게이트 사유로 fail 하지 않는다 (다른 게이트 사유 별개).
- **island 정의 (참조)**: `foundation/typecheck-exit-zero` FR-03 + `foundation/src-typescript-migration` §동작 6 FR-05 — `find <dir> \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit + 해당 디렉터리 범위 `error TS` 0 hit 인 디렉터리.

## 동작

### FR-01: island 정의 참조 (Must)
본 spec 은 island 확정 디렉터리의 정의 자체를 재박제하지 않는다 — 정의는 `foundation/src-typescript-migration` §동작 6 FR-05 + `foundation/typecheck-exit-zero` FR-03 의 합성 정의를 참조한다 ("확장자 0 hit + 디렉터리 범위 error TS 0 hit"). 본 spec 의 모든 후속 평서문은 "island 확정 디렉터리" 라는 참조 어휘를 그 정의로 해석한다 — 교집합 문장 재박제 0.

### FR-02: 재도입 차단 효능 불변식 (Must)
임의 island 확정 디렉터리 `<dir>` 에 신규 `<dir>/<name>.jsx` 또는 `<dir>/<name>.js` (단, `*.d.ts` 제외) 런타임/테스트 파일을 도입하는 변경 (워크트리 상태) 에 대해, `npm run lint` (또는 의미상 동등한 단일 게이트 명령) 의 종료 코드는 비-0 이어야 한다. 본 효능은 island 정의의 부정형 (re-introduction) 에 대한 **자동 차단 게이트 존재** 자체를 시스템 불변식으로 박제한다 — 게이트 실체 (ESLint rule id · CI step · husky hook · flat-config glob override · 기타) 는 본 spec 박제 대상 아님 (수단 중립 — FR-05).

### FR-03: false-positive 차단 (Should)
본 차단 효능 게이트는 비-island 디렉터리 (`src/Log/`, `src/Monitor/`, src root 등) 의 `.jsx`/`.js` 신규 파일에 대해 본 게이트 사유로 fail 하지 않는다 — 비-island 잔존은 `src-typescript-migration` FR-01/FR-02 의 수렴 축이며 본 spec 의 차단 대상 아니다. 본 게이트가 비-island 신규 도입을 차단하면 false-positive 위반.

### FR-04: island 확장 자동 적용 (Should)
`src-typescript-migration` FR-05 정의에 따른 신규 island 확정 시점 (예: `src/Log/`, `src/Monitor/` 후행 수렴 + typecheck error TS 0 hit 동시 달성) 에 본 차단 효능 게이트는 **수동 패턴 갱신 없이** 자동 적용되어야 한다. 즉, 차단 수단은 island 디렉터리 목록을 하드코딩하지 않고 island 정의 (확장자 + typecheck 0 hit) 와 정합한 패턴 기반 게이트여야 한다. 신규 island 확정 PR 머지 후 별도 ESLint/CI 설정 변경 없이 본 게이트 효능 유효.

### FR-05: 수단 중립성 (Must)
본 spec · 파생 task · 파생 PR 본문 · 커밋 메시지에서 차단 수단 (`no-restricted-syntax` vs flat-config `files:` glob override vs CI step rc vs husky guard 등) 에 "기본값" / "권장" / "우선" / "default" / "best" 류 라벨을 부여하지 않는다 (`foundation/src-typescript-migration` FR-06 · `foundation/typecheck-exit-zero` FR-04 와 동일 원리).

### FR-06: 게이트 단일성 (Should)
본 효능 박제는 단일 게이트 명령 (예: `npm run lint`) 의 rc 또는 단일 ESLint rule id 의 fire 로 측정 가능해야 한다. 복수 게이트 AND/OR 조합으로만 측정 가능하면 본 spec 본문에 분기 명시 (예: "`npm run lint` rc ≠ 0 OR CI workflow step `<name>` rc ≠ 0"). 측정 단일화 목적은 audit 단순성 — game-day 픽스처에서 단일 명령으로 fire/silence 판정 가능.

### 회귀 중점
- 차단 수단이 hardcoded directory 리스트 기반이면 island 확장 시 수동 갱신 누락 → FR-04 위반 (silent regression 회귀).
- 차단 수단이 lint 외 게이트 (CI guard / husky) 단독이면 로컬 dev 워크트리에서 즉시 피드백 부재 → FR-06 단일 명령 측정 보존 (CI 만으로도 OK 이나 측정 명령 1건 박제 필요).
- false-positive 발생 시 (비-island 신규 `.jsx` 도입 차단) 비-island 수렴 작업 자체가 차단됨 → FR-03 negative 검증 필수.
- ESLint `no-restricted-syntax` 는 AST selector 기반이며 **파일 자체 도입** 검출에는 부적합 (실체 수단은 별 축, 본 spec 은 효능 박제만).

## 의존성
- 내부 (전제 계약):
  - `specs/30.spec/green/foundation/typecheck-exit-zero.md` (REQ-20260422-054) FR-03 — island DoD `error TS` 0 hit. 본 spec FR-01 island 정의 참조.
  - `specs/50.blocked/spec/foundation/src-typescript-migration.md` (REQ-20260422-051) §동작 6 FR-05 — island 회귀 차단 평서문 (수단 위임). 본 spec 이 효능 차원 박제로 보강. (현재 blocked 상태 — typescript 환경 회귀 해소 후 green 복귀 예정, 본 spec FR-01 의 정의 참조는 blocked 상태에서도 의미 유지.)
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028 + REQ-053 + REQ-058) §동작 1~5 — ESLint flat-config `files:` 패턴 · `.ts/.tsx/.d.ts` 블록 · lint-staged glob · rule merge last-write-wins. 본 spec 의 ESLint 게이트 후보 수단 (수단 중립 박제).
- 외부:
  - ESLint (`eslint.config.js` flat-config · rule severity · `npm run lint` rc).
  - git (workrtree staged 파일 enumeration).
- 역의존 (본 spec 을 전제로 하는 축):
  - `foundation/src-typescript-migration` FR-05 의 enforcement 부재 갭이 본 spec 박제로 보강됨 (FR-05 평서문 + 본 spec 효능 = full contract).

## 스코프 규칙
- **expansion**: N/A (본 spec 은 결과 효능 평서형 불변식 박제 + baseline 수치 박제 문서이며, grep 게이트 계약 문서가 아님).
- **grep-baseline** (inspector 세션 시점 HEAD=`a1755b5` 실측):

  (a) island 확정 디렉터리 baseline — `find src/Comment src/File src/Image src/Search src/Toaster src/common src/test-utils src/__fixtures__ \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` → **0**. 8 island 디렉터리 전원 `.jsx`/`.js` 0 hit.
  (b) island typecheck baseline — `npm run typecheck 2>&1 | grep -E "^src/(Comment|File|Image|Search|Toaster|common|test-utils|__fixtures__)/" | grep -cE "error TS"` → **0** (`typecheck-exit-zero` FR-03 8 island 0 hit 박제와 정합).
  (c) 차단 수단 부재 현황 — `grep -nE "no-restricted-syntax|no-restricted-imports" eslint.config.js` → **0 hit** / `grep -nE "island\|restricted" .github/workflows/ci.yml` → **0 hit** / `.husky/pre-commit:4` `npx lint-staged` (island 경계 검사 0) / `.husky/pre-push:4` `npm test` (island 경계 검사 0). 현 시점 본 spec FR-02 효능 게이트 미도입 baseline.
  (d) 차단 효능 negative baseline (FR-02 미수렴 증거) — `grep -nE "files\s*:\s*\['src/\*\*/\*\.\{js" eslint.config.js` 1 hit @`eslint.config.js:35` `files: ['src/**/*.{js,jsx,ts,tsx}']` — island 디렉터리도 `.jsx`/`.js` lint 대상에 포함되어 재도입 PR 이 lint 통과 가능 (현 시점 임의 PR `src/Comment/Foo.jsx` 신규 도입 시 `npm run lint` rc = 0).
  (e) 비-island 잔존 baseline — `find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` → **24** / `find src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` → **17** / src root `App.jsx App.test.jsx index.jsx setupTests.timer-idiom.test.jsx setupTests.js reportWebVitals.js reportWebVitals.test.js` 등 7건. 본 spec FR-03 false-positive 차단 대상 베이스라인.

- **rationale**: gate (a)(b) 는 본 spec FR-01 의 island 정의 참조 baseline (8 디렉터리 동시 0 hit 박제). gate (c) 는 FR-02 효능 게이트 부재 현장 — 본 spec 박제 후에도 수단 미도입 시 효능 0. gate (d) 는 FR-02 미수렴 negative 증거 — 현 시점 `npm run lint` 가 island 재도입 차단 효능 부재. gate (e) 는 FR-03 false-positive 차단 대상 베이스라인 — 비-island 잔존 파일이 본 게이트 차단 대상 아님을 명시. 본 spec 의 효능 게이트 도입 후 (a)(b) 유지 + (c) 1+ hit 전환 + (d) `npm run lint` rc ≠ 0 효능 fire + (e) 비-island 신규 `.jsx`/`.js` 도입 PR 본 게이트 silence 가 수렴 baseline.

## 테스트 현황
- [ ] (Must, FR-02) island 확정 디렉터리 `src/Comment/` 에 `src/Comment/Probe.jsx` (런타임 또는 테스트 파일) 신규 도입 워크트리에서 `npm run lint` 또는 동등 게이트 명령 종료 코드 ≠ 0 — 현 baseline `npm run lint` 가 본 사유로 fail 하지 않음 (gate (d) negative 증거).
- [ ] (Must, FR-02) 동일 시나리오에서 `src/Comment/Probe.js` 신규 도입 시에도 동등 게이트 fire.
- [ ] (Should, FR-03) 비-island 디렉터리 `src/Log/` 에 `src/Log/Probe.jsx` 신규 도입 시 본 게이트 silence (false-positive 0) — FR-02 게이트 도입 후 검증.
- [ ] (Should, FR-04) 신규 island 확정 (예: `src/Log/` 후행 island 진입) 시점에 별도 ESLint/CI 설정 변경 없이 본 게이트 효능 자동 적용 — `src-typescript-migration` 본격 수렴 후 검증.
- [ ] (Should, FR-06) 본 효능 게이트가 단일 명령 (`npm run lint` 또는 CI step 1건) 의 rc 또는 단일 ESLint rule id fire 로 측정 가능 — 측정 명령 1건 박제.
- [ ] (Must, FR-05) `grep -rnE "기본값|권장|우선|default|best" specs/30.spec/green/foundation/island-regression-guard.md specs/40.task/**/*island-regression-guard* specs/60.done/**/*island-regression-guard*` → 예시/참고/인용 제외 0 hit.

## 수용 기준
- [ ] (Must, FR-01) 본 spec §동작 FR-01 에 island 정의를 `src-typescript-migration` §동작 6 FR-05 + `typecheck-exit-zero` FR-03 합성 정의 참조 평서문 1건 박제 — 교집합 문장 재박제 0.
- [ ] (Must, FR-02) 본 spec §동작 FR-02 에 차단 효능 평서문 박제 + §스코프 규칙 (a)(d) baseline 박제 — 게이트 실체는 task 위임 (수단 중립).
- [ ] (Should, FR-03) 본 spec §동작 FR-03 에 false-positive 차단 평서문 박제 + §스코프 규칙 (e) baseline 박제.
- [ ] (Should, FR-04) 본 spec §동작 FR-04 에 island 확장 자동 적용 평서문 박제 — 하드코딩 금지 결과 효능.
- [ ] (Must, FR-05) 본 spec · 파생 task · 파생 PR 에서 수단 라벨 박제 0 건.
- [ ] (Should, FR-06) 본 spec §동작 FR-06 에 측정 단일성 평서문 박제 + 측정 명령 후보 1건 인용.
- [x] (NFR-01) 시점 비의존성 — 본 spec 은 island 디렉터리 목록을 하드코딩하지 않고 island 정의 (확장자 0 hit + error TS 0 hit) 의 부정형 (`.jsx`/`.js` 재도입) 으로 평서화 — 본 spec §스코프 규칙 (a) 의 8 디렉터리 열거는 baseline 감사 픽스처이며 본문 §동작 FR-01~06 의 island 어휘는 참조 정의로 해석 (RULE-07 NFR-01 정합).
- [x] (NFR-02) 게이트 단일성 — 본 spec FR-06 이 단일 게이트 명령 측정 요구. 복수 AND 필요 시 분기 명시 평서문.
- [x] (NFR-03) 회귀 게이트 정합 — `foundation/regression-gate` FR-01 (CI typecheck step) + `foundation/coverage-determinism` 4축 threshold + `foundation/dependency-bump-gate` 3 명령 회귀 0 와 직교 (본 spec 은 island guard 축).
- [x] (NFR-04) RULE-07 정합 — "차단된다" 의 결과 효능만 박제. 1회성 진단·릴리스 귀속 patch 배제. "ESLint rule X 추가하라" / "husky hook 갱신하라" 등 수단 지시 박제 0. 시점 비의존 (island 정의 + 부정형 양수 박제).
- [x] (NFR-05) 추적성 — `grep -rn "REQ-20260517-059" specs/30.spec/green/foundation/island-regression-guard.md` → 2+ hit + consumed req 경로 1 hit (`specs/60.done/2026/05/17/req/20260517-island-regression-guard-lint-block.md`).
- [x] (NFR-06) baseline 재현 — 동일 HEAD (`a1755b5`) 에서 §스코프 규칙 gate (a)~(e) 실측 수치 재현 가능 — git tree immutable.
- [x] (NFR-07) 범위 제한 — inspector 세션 diff = `specs/30.spec/green/foundation/island-regression-guard.md` 신설 + `20.req → 60.done/req` mv. `.github/workflows/*`, `vite.config.js`, `package.json`, `tsconfig.json`, `.husky/**`, `eslint.config.js`, `src/**` 변경 0.
- [x] (NFR-08) 차원 분리 — `foundation/regression-gate` (회귀 게이트 존재) / `foundation/coverage-determinism` (측정 결정론) / `foundation/dependency-bump-gate` (dep bump 회귀 0) / `foundation/typecheck-exit-zero` (typecheck rc=0 효능) / `foundation/src-typescript-migration` (확장자 수렴 + 혼재 허용) / `foundation/tooling` (ESLint·alias·파서·coverage include) 와 축 분리 — 교집합 문장 재박제 0 (참조만).

## 참고

### baseline 스냅샷 (재현 가능 · NFR-06)
- HEAD=`a1755b5` (2026-05-17 inspector 신규 등록 시점) 실측:
  - 8 island 확정 디렉터리 `find` → **0 hit** (8 디렉터리 동시 수렴).
  - island typecheck `npm run typecheck 2>&1 | grep -E "^src/(Comment|...)/" | grep -cE "error TS"` → **0 hit** (`typecheck-exit-zero` FR-03 박제와 정합).
  - 차단 수단 부재 — `eslint.config.js` `no-restricted-*` 0 hit / `.github/workflows/ci.yml` island guard step 0 / husky hooks island guard 0.
  - 효능 부재 negative — `eslint.config.js:35` `files: ['src/**/*.{js,jsx,ts,tsx}']` 가 island 디렉터리 `.jsx`/`.js` 도 lint 대상에 포함 (재도입 시 `npm run lint` rc = 0).
  - 비-island 잔존 — `src/Log/` 24 / `src/Monitor/` 17 / src root 7건.
  - `package.json:21` `"lint": "eslint . --max-warnings=0"` (예측).
- 본 수치는 baseline 박제이며 본 spec 의 불변식 조건이 아니다. 최종 수렴 조건은 §동작 FR-02 의 게이트 rc ≠ 0 효능 + FR-03 의 false-positive 차단.

### Consumed req (1 건, NFR-05 박제)
- `specs/60.done/2026/05/17/req/20260517-island-regression-guard-lint-block.md` — REQ-20260517-059. discovery 세션 (HEAD=`a1755b5` 실측 baseline 8 island 0 hit + 차단 수단 부재) 산출. inspector 흡수 경로: **신규 spec 신설 (`foundation/island-regression-guard.md`)** (근거: §참고 "축 귀속 판단 근거").

### 관련 계약 (직교 축 — 재박제 금지 · 참조만)
- `specs/50.blocked/spec/foundation/src-typescript-migration.md` (REQ-20260422-051) §동작 6 FR-05 — island 회귀 차단 평서문 (수단 위임 · enforcement 부재). 본 spec 이 효능 차원 박제로 보강 — FR-05 평서문은 unchanged (참조 관계만, 본 spec 이 보강 spec). 현재 blocked 상태 — typescript 환경 회귀 해소 후 green 복귀 예정.
- `specs/30.spec/green/foundation/typecheck-exit-zero.md` (REQ-20260422-054) FR-03 — island DoD `error TS` 0 hit. 본 spec FR-01 island 정의 합성 참조.
- `specs/30.spec/blue/foundation/tooling.md` (REQ-028 + REQ-053 + REQ-058) — ESLint flat-config 운영. 본 spec 의 차단 수단 후보 (수단 중립 박제) 의 인프라 축 — 본 spec 이 ESLint 게이트 사용 시 tooling 규칙 cluster 의 일부 운용. 교집합 문장 재박제 0.
- `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — CI typecheck step + coverage threshold 회귀 게이트. 본 spec 과 게이트 축 직교 (island guard 축).
- `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) — dep bump 후 3 명령 회귀 0. 본 spec 과 직교.

### 현장 근거 (HEAD=`a1755b5`, 2026-05-17 실측)
- `eslint.config.js:35` — `files: ['src/**/*.{js,jsx,ts,tsx}']` (island 디렉터리도 lint 대상 — 재도입 차단 효능 부재 현장 근거).
- `eslint.config.js` — `no-restricted-syntax` / `no-restricted-imports` 0 hit.
- `.husky/pre-commit:4` — `npx lint-staged` (island guard 0).
- `.husky/pre-push:4` — `npm test` (island guard 0).
- `.github/workflows/ci.yml` — `island` / `restricted` token 0 hit.
- `src/Comment/`, `src/File/`, `src/Image/`, `src/Search/`, `src/Toaster/`, `src/common/`, `src/test-utils/`, `src/__fixtures__/` — `.jsx`/`.js` 각 0 hit 실측.
- `src/Log/` 24 + `src/Monitor/` 17 + src root 7 — 비-island 잔존 (FR-03 false-positive 차단 대상 baseline).

### 외부 근거
- ESLint 공식 — `no-restricted-syntax` rule 은 AST selector 기반이며 파일 자체 도입 검출에는 부적합 (파일 글로브 게이트 별 축). 본 spec 은 수단 박제하지 않음.
- ESLint flat-config `files` 글로브 — 디렉터리별 lint 패턴 분기 가능 (수단 후보).
- Git 공식 — `git diff --cached --name-only --diff-filter=A` 로 신규 staged 파일 enumeration (수단 후보).

### RULE 준수
- **RULE-07**: FR-01~06 모두 평서형 효능 / 시점 비의존 / 반복 검증 가능 (`npm run lint` rc 측정 + 재현 픽스처 / 디렉터리 0-hit 측정) / incident 귀속 부재. 수단 박제 0 (호출 위치/순서/명령 형태 박제 안 함).
- **RULE-06**: 본 spec 은 baseline 수치 박제 + 평서형 불변식 문서. `## 스코프 규칙` `expansion: N/A` + 5 gate (a~e) 실측 수치 박제. 파생 task 생성 시 planner 는 island 디렉터리 baseline + lint rc baseline 박제 필수.
- **RULE-01**: inspector writer 영역 (`30.spec/green/**`) 만 신설 (`foundation/island-regression-guard.md`). `20.req/*` → `60.done/2026/05/17/req/` mv.
- **RULE-02**: 단일 커밋 `spec(inspector): ...`. push 금지.

### 축 귀속 판단 근거 (REQ-059 흡수 경로)
- 후보 경로: α (`src-typescript-migration` §동작 6 FR-05 증분 — 효능 평서문 추가) / β (`regression-gate` 회귀 게이트 cluster 5번째 불변식 증분) / γ (독립 spec 신설 — `foundation/island-regression-guard.md`).
- **채택: γ 독립 spec 신설**.
- 근거:
  1. **축 독립성**: 본 효능은 "island 부정형 (재도입) 자동 차단" 단일 축 — `src-typescript-migration` 의 "확장자 수렴 + 혼재 허용" cluster 와 의미 layer 다름 (수렴 vs 회귀 차단). cluster 내부 박제 시 의미 경계 흐림.
  2. **α 경로 기각**: `src-typescript-migration` 현재 blocked 상태 (50.blocked/spec/). blocked spec 내부 증분 박제 불가 (RULE-05 inspector 영역 밖).
  3. **β 경로 기각**: `regression-gate` 는 CI workflow step 존재 + coverage threshold 회귀 0 cluster. island guard 는 ESLint/lint 게이트 축으로 layer 다름 (workflow step 존재 vs ESLint 게이트 효능). cluster 내부 박제 시 4 불변식 (test/build/typecheck/coverage) 의 의미 경계 변질 우려.
  4. **γ 경로 채택 이유**: `foundation/typecheck-exit-zero` 선례 (rc=0 효능 축 독립 spec) · `foundation/coverage-determinism` 선례 (측정 결정론 축 독립 spec) 와 동일 원리. 독립 spec 으로 audit · 의미 경계 유지 · 파일명 자체가 축 이름 역할.
  5. **증분 관계 박제 방식**: `src-typescript-migration` §동작 6 FR-05 평서문 본문은 본 spec 이 건드리지 않고 (blocked 상태 + writer 영역 밖), 본 spec 이 결과 효능 차원으로 보강 spec. `src-typescript-migration` green 복귀 후에도 두 spec 은 평서문 + 효능 관계로 직교 유지.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 — REQ-20260517-059 흡수. 흡수 경로 **γ 독립 spec 신설** 채택 (근거: §참고 "축 귀속 판단 근거" — α 경로는 `src-typescript-migration` blocked 상태로 기각, β 경로는 `regression-gate` 의미 경계 흐림 우려로 기각, γ 채택은 `typecheck-exit-zero` · `coverage-determinism` 선례 정합). FR-01~02 + FR-05 Must + FR-03/04/06 Should 박제. baseline HEAD=`a1755b5` 실측 — 8 island 확정 디렉터리 (Comment/File/Image/Search/Toaster/common/test-utils/`__fixtures__`) 동시 `.jsx`/`.js` 0 hit + island typecheck `error TS` 0 hit (`typecheck-exit-zero` FR-03 박제 정합). 차단 수단 부재 baseline — `eslint.config.js` `no-restricted-*` 0 hit + CI/husky island guard 0 + `eslint.config.js:35` `files: ['src/**/*.{js,jsx,ts,tsx}']` 가 island 도 lint 대상 포함 (재도입 PR 차단 효능 부재 현장 근거). 비-island 잔존 baseline — `src/Log/` 24 / `src/Monitor/` 17 / src root 7건 (FR-03 false-positive 차단 대상). FR-01 island 정의는 `src-typescript-migration` §동작 6 FR-05 + `typecheck-exit-zero` FR-03 합성 참조 (재박제 0). consumed req: `specs/20.req/20260517-island-regression-guard-lint-block.md`. RULE-07 자기검증 — 결과 효능 평서형 · 반복 검증 가능 (`npm run lint` rc + 재현 픽스처) · 시점 비의존 (island 디렉터리 목록 비-하드코딩 · 부정형 박제) · incident 귀속 부재 · 수단 라벨 박제 0. RULE-06 §스코프 규칙 `expansion: N/A` + 5 gate (a~e) 실측 수치 박제. | all (신설) |
