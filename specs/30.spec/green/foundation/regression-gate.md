# 회귀 게이트 — CI typecheck 포함 + Vitest coverage threshold 4축 선언 불변식

> **위치**: CI workflow (`.github/workflows/*.yml`), Vitest coverage 구성 (`vite.config.js` 또는 `vitest.config.*`).
> **관련 요구사항**: REQ-20260421-037
> **최종 업데이트**: 2026-04-21 (by inspector, REQ-037 흡수 — FR-07 택 β 신설)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=0f03547).

## 역할
CI 파이프라인의 **회귀 게이트 차원** — TypeScript 타입 오류 및 테스트 수치 회귀를 CI 단계에서 자동 검출하기 위한 2 불변식을 박제한다. 본 spec 은 (1) GitHub Actions workflow step 순열에 `typecheck` 가 생략 불가 step 으로 포함되어야 한다는 불변식, (2) Vitest coverage 구성이 4축 (lines/statements/functions/branches) 의 수치 threshold 를 선언해 임계치 이하 시 `npm test` 가 실패로 종결되어야 한다는 불변식을 다룬다. 두 불변식은 기존 `foundation/ci.md` (GitHub Actions 사용 + Node LTS + 메이저 floating — REQ-023/034) 및 `foundation/tooling.md` (ESLint·lint-staged·ambient alias·Vitest coverage include 범위 — REQ-028) 와 **회귀 게이트 차원** 에서 직교적으로 보완 관계이다. 전자 2건은 CI 환경 구성 + 도구 구성 범위를, 본 2 불변식은 **CI step 커버리지 (typecheck 포함) + 테스트 수치 회귀 방어 (coverage threshold)** 를 박제한다. 의도적으로 하지 않는 것: 구체 threshold 숫자 결정 (70/80/90/100 등), CI step 삽입 위치 (lint 이전/이후, test 이전/이후), `.github/workflows/ci.yml` / `vite.config.js` / `.husky/**` 실제 편집 (planner/developer 영역), lint-staged 대상 확장, TypeScript 소스 `.ts`/`.tsx` 이관 (REQ-028 완료 범위).

## 공개 인터페이스
- 소비 진입점 (계약 대상):
  - GitHub Actions workflow step `run: npm run typecheck` 또는 `run: npx tsc --noEmit` — CI 회귀 게이트의 타입 검사 step.
  - Vitest coverage 구성 객체 `test.coverage.thresholds = { lines, statements, functions, branches }` — 4축 수치 필드.
  - 프로젝트 scripts 엔트리 `"typecheck": "tsc --noEmit"` (`package.json:24` 현재 존재) — workflow step 이 소비.

## 동작

### FR-01: CI typecheck step 포함 불변식 (Must)
GitHub Actions CI workflow (`.github/workflows/*.yml`) 는 `npm ci` 이후 `npm run build` 이전의 step 순열 중 최소 1 step 이 `npm run typecheck` 또는 동등 커맨드 (`npx tsc --noEmit`) 를 실행하며, 해당 step 의 exit code 가 비-0 이면 전체 job 은 실패로 종결된다. typecheck step 은 lint/test/build 와 **병렬 또는 직렬 어느 순서도 허용** 하나 **생략 불가** 이다. 본 불변식은 `.github/workflows/` 하위 현존 workflow (현재 `ci.yml` 단일) 뿐 아니라 미래 추가되는 workflow 전반에 적용된다.

### FR-02: Vitest coverage threshold 4축 선언 불변식 (Must)
`vite.config.js` (또는 동급 `vitest.config.*`) 의 `test.coverage` 구성 객체는 `thresholds` 필드를 선언하며, `thresholds` 는 `lines`, `statements`, `functions`, `branches` 4개 숫자 필드를 모두 포함한다. 4축 중 어느 하나라도 설정값 미만이면 `npm test` (= `vitest run --coverage`) 는 비-0 exit 으로 종결된다. 구체 숫자는 본 spec 의 박제 대상이 아니며 프로젝트 운영 정책이 결정한다. 본 불변식의 적용 범위는 vitest config 파일 — 현재 `vite.config.js` 단일이며, 미래 `vitest.config.{js,ts}` 로 분리 시 동일 불변식이 그 파일로 이관된다.

### FR-03: 차원 분리 명시 (Must)
본 2 불변식은 기존 `foundation/ci.md` (REQ-023/034) 및 `foundation/tooling.md` (REQ-028) 와 **회귀 게이트 차원** 에서 직교적으로 보완 관계이다. 전자 2건은 CI 환경 구성 + 도구 구성 범위를, 본 2 불변식은 **CI step 커버리지 (typecheck 포함) + 테스트 수치 회귀 방어 (coverage threshold)** 를 박제한다. 기존 박제의 재박제는 수행하지 않으며 본 spec 에서는 참조만 유지한다.

### FR-04: REQ-035 dep bump gate 와의 관계 (Should)
`specs/20.req/20260421-dependency-bump-regression-gate-and-react-runtime-warning-invariant.md` (REQ-20260421-035) 의 dep bump 후 3 명령 회귀 0 게이트 (`npm run lint && npm test -- --run && npm run build`) 는 본 REQ 의 FR-01 typecheck step 이 CI 에 상시 포함되면 자동으로 같은 게이트의 일부로 작동한다 (`npm test` 가 coverage threshold 와 연동되므로 FR-02 도 dep bump 게이트에 간접 편입). 본 spec 은 REQ-035 의 상위 불변식이 아니라 **게이트 구성 축** 이며, 두 spec 은 병렬 박제 가능하다.

### 회귀 중점
- typecheck step 부재 시 TypeScript 오류가 CI green 을 통과해 tsconfig strict 계약 (REQ-028 FR-01~04) 회귀.
- coverage threshold 부재 시 커버리지 급락 (예: 90% → 50%) 이 CI 성공으로 위장.
- dep bump 게이트 (REQ-035) 가 `npm test` 를 포함하므로 coverage threshold 가 있으면 버전 비호환 (예: `typescript` ↔ `typescript-eslint` peer 호환) 조기 검출.

## 의존성
- 내부: `package.json` (`"typecheck"` 스크립트), `tsconfig.json` (strict/noImplicitAny/noUncheckedIndexedAccess), `vite.config.js` `test.coverage` 구성.
- 외부: TypeScript (`tsc --noEmit`), Vitest (`test.coverage.thresholds`), `@vitest/coverage-v8`, GitHub Actions runner.
- 역의존: `specs/30.spec/blue/foundation/{ci.md,tooling.md}` — 본 spec 이 회귀 게이트 차원을 보완. `specs/30.spec/green/foundation/dependency-bump-gate.md` (REQ-035) — dep bump 게이트 축에서 본 spec 의 FR-01/FR-02 가 간접 편입.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 grep 게이트 계약 문서가 아니라 baseline 수치 박제).
- **grep-baseline** (inspector 세션 시점 HEAD=0f03547 실측):

  (a) FR-01 측 positive (목표) — `grep -nE "typecheck|tsc --noEmit" .github/workflows/*.yml` → **목표 1+ hit**. 현 시점 baseline: **0 hit** (HEAD=0f03547).
  (b) FR-01 측 보조 (현장 근거) — `grep -n '"typecheck":' package.json` → `:24` 1 hit (스크립트 `"typecheck": "tsc --noEmit"` 정의 존재).
  (c) FR-02 측 positive (목표) — `grep -nE "thresholds\s*:" vite.config.js` → **목표 1+ hit**, 동시에 `grep -nE "lines\s*:|statements\s*:|functions\s*:|branches\s*:" vite.config.js` → **각 1+ hit**. 현 시점 baseline: **0 hit × 5** (HEAD=0f03547).
  (d) FR-02 측 보조 (현장 근거) — `grep -nE "coverage\s*:\s*\{" vite.config.js` → `:71` 1 hit (`test.coverage` 블록 71~82 행 존재, `thresholds` 필드 미선언).

- **rationale**: gate (a)(c) 는 본 불변식의 **목표값** (충족 시 CI 회귀 게이트가 완결). gate (b)(d) 는 **현장 근거** — 스크립트·블록 자체는 존재하나 workflow 연결·threshold 선언이 없는 상태. planner/developer 가 workflow step 삽입 + threshold 선언을 task 로 실현하면 gate (a)(c) 가 목표값으로 수렴. 수치 상한은 본 spec 관할 아님 (운영자 결정).

## 테스트 현황
- [ ] (Must, REQ-037 FR-01) `.github/workflows/*.yml` step 순열에 `npm run typecheck` (또는 `npx tsc --noEmit`) 1 step 이상 포함 — 현 baseline: 0 hit, 목표: 1+ hit. planner/developer 영역 편집.
- [ ] (Must, REQ-037 FR-02) `vite.config.js` `test.coverage.thresholds = { lines, statements, functions, branches }` 선언 — 현 baseline: 0 hit, 목표: 5 필드 (thresholds 본체 + 4축) 모두 1+ hit. planner/developer 영역 편집.
- [x] (Must, REQ-037 FR-03) 본 spec §역할 / §동작 FR-03 에 "회귀 게이트 차원 직교" 1문장 박제.
- [x] (Should, REQ-037 FR-04) 본 spec §동작 FR-04 에 REQ-20260421-035 dep bump gate 와의 관계 1문장 박제.
- [x] (Must, REQ-037 FR-05) 본 spec §스코프 규칙 grep-baseline 에 4 gate (a)(b)(c)(d) 실측 수치 박제.
- [x] (Must, REQ-037 FR-06) 본 spec §변경 이력 에 본 REQ ID + 선행 done req + 현장 수치 + HEAD 박제.
- [x] (Must, REQ-037 FR-07) 배치 위치 — FR-07 택 β `regression-gate.md` 신설 경로. 판단 근거: §변경 이력 박제 (기존 `ci.md` = CI 환경 축 / `tooling.md` = 도구 구성 축 의 의미 경계 보존 vs 회귀 게이트 차원 독립 spec). 두 경로 모두 RULE-07 정합 — 본 spec 은 독립 spec 경로 채택.

## 수용 기준
- [x] (Must, REQ-037 FR-01) 본 spec §동작 FR-01 에 "CI workflow 는 typecheck step 을 포함한다" 평서문 불변식 박제.
- [x] (Must, REQ-037 FR-02) 본 spec §동작 FR-02 에 "Vitest coverage 는 thresholds 4축 (lines/statements/functions/branches) 을 선언한다" 평서문 불변식 박제.
- [x] (Must, REQ-037 FR-03) "회귀 게이트 차원 직교" 관계 1 문장 박제 (§역할 + §동작 FR-03).
- [x] (Should, REQ-037 FR-04) REQ-20260421-035 dep bump gate 와의 관계 1 문장 박제 (§동작 FR-04).
- [x] (Must, REQ-037 FR-05) §스코프 규칙 grep-baseline 에 FR-01/FR-02 각 측 positive + 보조 gate 총 4개 실측 수치 박제.
- [x] (Must, REQ-037 FR-06) §변경 이력 에 `REQ-20260421-037`, 선행 done req (`REQ-20260421-028`/`REQ-20260421-023`/`REQ-20260421-034`) + 연관 open req (`REQ-20260421-035`) + 현장 수치 (ci.yml 4 step + typecheck 0 + package.json:24 + vite.config.js:71-82) + HEAD (`0f03547`) 박제.
- [x] (Must, REQ-037 FR-07) 배치 위치 판단 근거 박제 (§테스트 현황 FR-07 & §변경 이력).
- [x] (NFR-01, REQ-037) 추적성 — `grep -rn "REQ-20260421-037" specs/30.spec/green/foundation/regression-gate.md` → 3+ hit (§관련 요구사항 / §동작 FR-01 등 본문 / §변경 이력).
- [x] (NFR-02, REQ-037) RULE-07 정합 — 구체 threshold 숫자 (70/75/80/85/90/95/100) 박제 0 hit (§변경 이력·§참고 감사 교차참조 제외). 특정 CI step 순서 "lint 전", "test 후" 등 박제 0. "TODO" 토큰 0 hit.
- [x] (NFR-03, REQ-037) 범위 제한 — inspector 세션 diff = `specs/30.spec/green/foundation/regression-gate.md` 신설 + `20.req → 60.done/req` mv. `.github/workflows/*`, `vite.config.js`, `package.json`, `tsconfig.json`, `.husky/**`, `src/**` 변경 0.
- [x] (NFR-04, REQ-037) 차원 분리 — 본 spec 어디에도 "ESLint 플랫 구성", "lint-staged 대상", "ambient type alias", "`@/common/*` 등 path alias", "Vitest coverage `include: src/**/*.{js,jsx,ts,tsx}`" 같은 REQ-028 영역 불변식 재박제 0 (참조만 허용). 본 spec 은 **회귀 게이트 차원** 만 박제.
- [x] (NFR-05, REQ-037) 적용 범위 — FR-01 "CI workflow" 범위는 `.github/workflows/*.yml` 전체, FR-02 "coverage 구성" 범위는 vitest config 파일. 특정 파일명 고정 박제 0.
- [x] (NFR-06, REQ-037) 버전 무관성 — FR-01/FR-02 본문이 TypeScript 메이저 버전, Vitest 메이저 버전, Node 메이저 버전에 무관 표현.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 0f03547 | 최초 등록 (REQ-20260421-037). FR-07 택 **β 신설 경로** — `foundation/regression-gate.md` 독립 spec. 판단 근거: 기존 `foundation/ci.md` (3 불변식, CI 환경 축 — REQ-023/034) 와 `foundation/tooling.md` (4 불변식, 도구 구성 축 — REQ-028) 는 각자 semantic 경계가 확립. REQ-037 의 2 불변식 (typecheck step 포함 + coverage threshold 4축) 은 **회귀 게이트 축** 으로 두 기존 spec 과 직교하며, 기존 spec 에 증분 추가 시 각 spec 의 주 담당 축이 흐려질 우려. 독립 spec 경로가 audit·의미 경계 유지에 유리. 현장 근거 (HEAD=0f03547): `.github/workflows/ci.yml:24-34` 4 step 순열 (`npm ci` → `lint` → `test` → `build`) typecheck 부재, `package.json:24` 스크립트 존재, `vite.config.js:71-82` `test.coverage` 블록 존재하나 `thresholds` 미선언. 선행 done req: REQ-20260421-023 (foundation/ci.md 신설), REQ-20260421-034 (ci.md 재발행), REQ-20260421-028 (foundation/tooling.md 4 불변식 박제). 연관 open req: REQ-20260421-035 (dep bump gate — 본 spec FR-04 관계). consumed: REQ-20260421-037 자체. RULE-07 자기검증 — FR-01/FR-02 는 "CI workflow 에 typecheck 포함", "Vitest coverage threshold 4축 선언" 의 평서형 불변식 (버전 무관, 반복 검증 가능), 구체 숫자·step 순서·incident 수리 계획 0. | all (신설) |

## 참고
- **REQ**: `specs/60.done/2026/04/21/req/20260421-ci-typecheck-and-coverage-threshold-regression-gate.md` (본 spec 반영 후 이동).
- **현장 근거 (HEAD=0f03547, 2026-04-21 실측)**:
  - `.github/workflows/ci.yml:24-34` — 4 step 순열 (`Install dependencies: npm ci` @ L24-25, `Lint: npm run lint` @ L27-28, `Test: npm test` @ L30-31, `Build: npm run build` @ L33-34). `grep -n "typecheck" .github/workflows/ci.yml` → 0 hit.
  - `package.json:24` — `"typecheck": "tsc --noEmit"` 스크립트 존재.
  - `package.json:21` — `"test": "vitest run --coverage"` (coverage 무조건 활성).
  - `.husky/pre-commit:4` — `npx lint-staged` 단일 명령 (typecheck 미연동).
  - `.husky/pre-push:4` — `npm test` 단일 명령 (typecheck 미연동).
  - `vite.config.js:71-82` — `test.coverage = { provider: 'v8', reporter: ['text','html','lcov'], include: [...], exclude: [...] }`, `thresholds` 미선언.
  - `tsconfig.json:2-24` — `strict: true` + `noImplicitAny: true` + `noUncheckedIndexedAccess: true` + `allowJs: true` + `checkJs: false` + paths 3 alias + `noEmit: true`.
  - `.d.ts` ambient 2건: `src/types/env.d.ts`, `src/common/env.d.ts`.
- **직교 축 spec**:
  - `specs/30.spec/blue/foundation/ci.md` — CI 환경 축 (GitHub Actions 사용 + Node LTS + 메이저 floating 태그). 본 spec 과 step 커버리지 축 직교.
  - `specs/30.spec/blue/foundation/tooling.md` — 도구 구성 축 (ESLint·lint-staged·ambient alias·Vitest coverage include 범위). 본 spec 과 threshold 축 직교.
  - `specs/30.spec/green/foundation/dependency-bump-gate.md` (REQ-20260421-035) — dep bump 후 회귀 0 + React 런타임 경고 0. 본 spec 의 FR-04 에서 상호 관계 명시.
- **외부 근거**:
  - TypeScript 공식 — `tsc --noEmit` 은 타입 검사만 수행하며 `allowJs`/`checkJs` 설정에 따라 `.js` 포함 여부 분기. CI green 조건으로 관례적 채택.
  - Vitest 공식 — `test.coverage.thresholds`: `{ lines, statements, functions, branches }` 4축 또는 단일 숫자 (모든 축 동일 적용). 임계 미달 시 비-0 exit.
  - `@vitest/coverage-v8` README — provider='v8' 사용 시 동일 thresholds 필드 지원.
  - GitHub Actions — step fail on exit code ≠ 0 기본 동작 (continue-on-error 미지정 시).
- **기존 박제 재활용 (중복 박제 금지)**:
  - `foundation/tooling.md` FR-04 (REQ-028) `coverage.include: ['src/**/*.{js,jsx,ts,tsx}']` + `.d.ts` exclude — 본 spec 은 참조만.
  - `foundation/ci.md` 3 불변식 (REQ-023/034) — 본 spec 은 4번째 불변식 증분 후보가 아니라 독립 spec 박제 (FR-07 택 β).
- **RULE 준수**:
  - RULE-01: inspector writer 영역 (`30.spec/green/**`) 만 신설. `20.req/*` → `60.done/2026/04/21/req/` mv.
  - RULE-06: 본 spec 은 grep 게이트 계약 문서가 아니므로 `## 스코프 규칙` 은 N/A 기재 + baseline 수치 박제에 한정.
  - RULE-07: 시스템 불변식 한정 — "CI workflow 는 typecheck step 을 포함한다", "Vitest coverage 는 thresholds 4축 를 선언한다" 평서형. 시점 비의존·반복 검증 가능·특정 incident/릴리스 귀속 patch 배제. 구체 threshold 숫자·CI step 삽입 위치는 Out-of-Scope 로 명시.
