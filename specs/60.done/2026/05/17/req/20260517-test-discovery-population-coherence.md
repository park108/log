# vitest test discovery 모집단 단일 정책 — `src/**` 한정 도구 매트릭스 (lint·typecheck·coverage) 와 vitest test discovery 모집단 간 경계 명시 + 루트 레벨 `*.test.*` 파일의 도구 매트릭스 노출 정책 박제

> **ID**: REQ-20260517-067
> **작성일**: 2026-05-17
> **상태**: Draft

## 개요
프로젝트 도구 4축 — (a) ESLint (`eslint.config.js:35` `files: ['src/**/*.{js,jsx,ts,tsx}']`, `eslint.config.js:79` `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts']`), (b) TypeScript (`tsconfig.json:26` `"include": ["src"]`), (c) Vitest coverage (`vite.config.js:83` `coverage.include: ['src/**/*.{js,jsx,ts,tsx}']`) — 은 모두 `src/**` 모집단 한정으로 동작한다. 그러나 (d) Vitest test runner discovery 는 `vite.config.js:66-98` `test` 블록에 `test.include` / `test.exclude` 명시가 부재하여 **vitest 기본 글로브** (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) 로 동작하며, 결과적으로 `vite.config.test.js` (프로젝트 루트, `vite.config.js` plugin 단위 테스트) 가 4축 매트릭스에서 **test runner 만 픽업** 되는 비대칭 상태이다. 즉 본 파일은 (1) `npm run lint` 미실행 (eslint files 패턴 `src/**` 외), (2) `npm run typecheck` 미포함 (`tsconfig.json` include `src` 외), (3) `npm test` coverage 측정 모집단 외 (`vite.config.js:83` `coverage.include` `src/**` 한정 — coverage threshold 산정에서 본 파일의 cover/uncover 가 무시), (4) `npm test` test runner 픽업 (vitest default discovery 가 `**` 매치 — 본 테스트 6 it 이 실행되어 coverage 통계의 분모는 `src/**` 이지만 본 파일의 어설션 효과는 다른 src 파일의 coverage 에 반영). 본 비대칭은 (a) 의도된 정책 — "test infra 자체 단위 테스트는 src 모집단 외 분리" — 일 수 있으나 **spec 으로 박제되어 있지 않다**. 본 req 는 1회성 정책 결정 (분리 유지 vs `src/__tests__/vite.config/` 등으로 이관) 이 아니라 **반복 검증 가능한 상시 불변식** — 도구 4축 모집단 정책 단일성 + 루트 레벨 `*.test.*` 파일의 4축 노출 매트릭스 명시 + 신규 루트 레벨 `*.test.*` 파일 추가 시 fail 신호 작동 — 을 spec 으로 박제할 것을 요청한다.

## 배경
- **현장 근거 (HEAD=`b96bb5e`, 2026-05-17 실측, 동일 작업 트리)**:
  - `eslint.config.js:35` `files: ['src/**/*.{js,jsx,ts,tsx}']` — ESLint JS/JSX rule 블록의 모집단 = `src/**` 한정.
  - `eslint.config.js:79` `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts']` — typescript-eslint parser 블록의 모집단 = `src/**` 한정.
  - `tsconfig.json:26` `"include": ["src"]` — TypeScript 컴파일 모집단 = `src` 한정.
  - `package.json:23` `"lint": "eslint ./src"` — `npm run lint` 의 인자 자체가 `./src` 한정.
  - `package.json:24` `"typecheck": "tsc --noEmit"` — `tsc` 가 `tsconfig.json` 의 `include: ["src"]` 적용.
  - `vite.config.js:66-98` `test: { ... }` 블록에 `test.include` / `test.exclude` / `test.root` 명시 부재 → vitest 기본 글로브 활성 (vitest 4.x 기본 = `**/*.{test,spec}.?(c|m)[jt]s?(x)`).
  - `vite.config.js:83` `coverage.include: ['src/**/*.{js,jsx,ts,tsx}']` — coverage 측정 모집단 = `src/**` 한정.
  - `vite.config.js:84-90` `coverage.exclude: ['src/index.{js,jsx,ts,tsx}', 'src/reportWebVitals.{js,jsx,ts,tsx}', 'src/**/*mock.{js,jsx,ts,tsx}', 'src/**/*.test.{js,jsx,ts,tsx}', 'src/**/*.d.ts']` — src 내부에서도 entrypoint·mock·test·ambient `.d.ts` 제외 (test 파일은 분자/분모 양쪽에서 제외).
  - `vite.config.test.js` (프로젝트 루트, 76 line) — `import { stripCspMetaInDev } from './vite.config.js'` (line 5) 로 `vite.config.js:13-27` `stripCspMetaInDev` plugin 의 6 it 단위 테스트. csp-policy-spec §5.1 FR-14 / TSK-20260420-13 / REQ-20260419-040 FR-14 박제.
- **모집단 매트릭스 (HEAD=`b96bb5e` 실측)**:
  - 루트 레벨 `*.test.*` 파일 인벤토리: `find /Users/park108/Dev/log -maxdepth 1 -name "*.test.*" 2>/dev/null` → 1 hit (`vite.config.test.js`).
  - src 내부 `*.test.*` 파일 수: `find /Users/park108/Dev/log/src -name "*.test.*" 2>/dev/null | wc -l` → 47.
  - 도구 4축 vs 본 1 루트 레벨 테스트 파일 노출:
    - (a) ESLint: 미노출 (`eslint.config.js:35` `files: src/**` 매칭 외).
    - (b) TypeScript: 미노출 (`tsconfig.json:26` `include: src` 매칭 외).
    - (c) Vitest coverage 측정 모집단: 미노출 (`vite.config.js:83` `coverage.include: src/**` 매칭 외).
    - (d) Vitest test runner discovery: **노출** (`vite.config.js:66-98` `test.include` 부재 → 기본 글로브 매치).
- **다른 spec 의 모집단 박제 현황**:
  - `30.spec/blue/foundation/tooling.md:17` — `vite.config.js` `test.coverage.include: ['src/**/*.{js,jsx,ts,tsx}']` 박제. REQ-028 영역.
  - `30.spec/blue/foundation/tooling.md:31` — "Vitest coverage 는 `src/**/*.{js,jsx,ts,tsx}` 를 포함하며 `.d.ts` 는 제외한다. ambient 타입은 런타임 커버리지 대상이 아니므로 include 패턴에 `.d.ts` 를 넣지 않는다." 평서문 — coverage 모집단 단일성 박제. 그러나 본 박제는 **(c) coverage 축만** 박제하며, 본 req 의 (a)(b)(d) 4축 매트릭스 단일성은 미박제.
  - `30.spec/blue/foundation/regression-gate.md:73` (REQ-037) — "ESLint 플랫 구성", "lint-staged 대상", "Vitest coverage `include: src/**/*.{js,jsx,ts,tsx}`" 같은 REQ-028 영역 불변식 재박제 0 — 본 req 는 회귀 게이트 축 외부.
  - `30.spec/blue/foundation/coverage-determinism.md` (REQ-041/043) — coverage 측정 결정론. 본 req 의 모집단 정책 축과 직교.
  - `30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — bump 직후 4 scripts exit 0. 본 req 의 매트릭스 노출 축과 직교 (단, 본 req 의 모집단 불일치가 bump 시 신규 vitest 메이저의 default discovery 글로브 변경에 노출됨 — 간접 결합).
- **선행 req §Out-of-Scope 인계**:
  - `20.req/20260517-vite-jsx-transform-channel-coherence.md:60` (REQ-066) §Out-of-Scope — `vite.config.test.js` (root level `vite.config.test.js` 의 `vite.config.js` plugin 단위 테스트) 의 테스트 발견 정합 (별 spec / vitest test include 패턴 축). **본 req 가 인계 대상**.
- **선행 spec 과의 차별 (직교 축)**:
  - `30.spec/blue/foundation/tooling.md` (REQ-028 / REQ-053 / REQ-058) — ESLint flat-config / lint-staged / ambient alias / Vitest coverage include / no-unused-vars rule swap / flat-config last-write-wins. **각 축의 단일 설정 단일성** 박제. 본 req 는 **4축 매트릭스 간 정합성 + 루트 레벨 test 파일 노출 정책** 축으로 직교.
  - `30.spec/blue/foundation/ci.md` (REQ-023 / REQ-034) — CI action + Node LTS + 메이저 floating. **CI 환경 축**. 본 req 의 매트릭스 정책 축과 직교.
  - `30.spec/blue/foundation/regression-gate.md` (REQ-037) — typecheck step + coverage threshold 4축. **회귀 게이트 축**. 본 req 의 모집단 매트릭스 축과 직교 (단, `npm run typecheck` 의 모집단 결정 = tsconfig include 가 본 req 의 (b) 축).
  - `30.spec/blue/foundation/coverage-determinism.md` (REQ-041 / REQ-043) — Vitest 측정 결정론 (pool·fileParallelism). **결정론 수단 축**. 본 req 의 모집단 정책 축과 직교.
  - `30.spec/green/foundation/devbin-install-integrity.md` (REQ-064) — devbin install 존재. 본 req 의 모집단 매트릭스 축과 직교.
  - `20.req/20260517-path-alias-resolver-coherence.md` (REQ-065) — vite alias ↔ tsconfig paths 동치. **resolver 동치 축**. 본 req 의 도구 모집단 매트릭스 축과 직교.
  - `20.req/20260517-vite-jsx-transform-channel-coherence.md` (REQ-066) — vite JSX 변환 채널 단일성. **변환 채널 축**. 본 req 의 도구 모집단 매트릭스 축과 직교, 본 req 는 REQ-066 §Out-of-Scope 인계 (test 파일 discovery 정합).
- **본 req 가 박제하지 않는 것 (RULE-07 정합)**:
  - `vite.config.test.js` 의 위치 결정 (루트 유지 vs `src/__tests__/vite.config/` 이관 vs `tests/` 디렉터리 신설 — 수단 중립). 본 req 는 어느 정책을 선택해도 4축 노출 매트릭스가 spec 박제와 일치하면 충족.
  - `vite.config.js` `test.include` / `test.exclude` 의 구체 패턴 결정 (`['**/*.test.*']` 유지 vs `['src/**/*.test.*', 'vite.config.test.js']` 명시 vs `['src/**/*.test.*']` + 루트 파일 이관 — 수단 중립).
  - 신규 도구 (예: Knip, dependency-cruiser) 추가 시 본 도구의 모집단 정책 박제 (별 req).
  - `package.json:23` `"lint": "eslint ./src"` 의 인자 변경 (별 task / REQ-028 영역).
  - vitest 메이저 bump 결정 (4.x → 5.x — `dependency-bump-gate` 직교).
  - `tsconfig.json:26` `include: ["src"]` 의 변경 (typecheck 모집단 축 — 별 spec).
- **drift 발생 가능 시나리오 (구체)**:
  - (a) 신규 루트 레벨 테스트 파일 추가 (예: `vitest.config.test.js`, `eslint.config.test.js`, `playwright.config.test.ts`) 시 본 req 의 매트릭스 단일성 박제 부재 → 새 파일이 (d) test runner 만 픽업 / (a)(b)(c) 미노출 상태로 git 에 진입.
  - (b) vitest 메이저 bump 가 default discovery 글로브 변경 (예: 5.x 가 `tests/**/*.test.*` 만 default — 미래 가정) 시 본 req 박제 부재면 `vite.config.test.js` 가 (d) 에서도 누락되어 0 it 실행 — 회귀 무감지.
  - (c) `vite.config.js:83` `coverage.include` 가 `src/**` → `**/*` 확장되는 향후 변경 시 본 req 박제 부재면 `vite.config.js` / `eslint.config.js` 자체가 coverage 모집단 진입 → threshold 4축 수치 급변.
  - (d) `tsconfig.json:26` `include: ["src"]` → `include: ["src", "vite.config.test.js"]` 확장 시 typecheck 측면에서만 노출되어 (a)(c)(d) 와 다시 비대칭 — drift 의 다른 형태.

## 목표
- In-Scope:
  - 도구 4축 (ESLint / TypeScript / Vitest coverage 측정 / Vitest test runner discovery) 의 모집단 정책이 **명시 박제** + 루트 레벨 `*.test.*` 파일의 4축 노출 매트릭스 spec 으로 박제.
  - 현 시점 루트 레벨 `*.test.*` 파일 인벤토리 (= 1 파일, `vite.config.test.js`) 의 4축 노출 상태 baseline 박제 — 신규 추가 시 fail 신호.
  - 4축 간 모집단 정합 — "src/** 한정 정책 + 루트 레벨 예외 명시 enumeration" 또는 "전체 글로브 정책" 중 어느 방향이든 4축 일치 박제.
  - `vite.config.js:66-98` `test` 블록에 `test.include` / `test.exclude` 가 박제될 경우 (a)(b)(c) 와 정합 ↔ 박제되지 않은 현 상태도 baseline grep 으로 검증.
- Out-of-Scope:
  - `vite.config.test.js` 의 위치 결정 (루트 유지 vs `src/__tests__/` 이관 — 수단 중립).
  - `vite.config.js` `test.include` 의 구체 패턴 결정 (수단 중립).
  - 신규 루트 레벨 테스트 파일 추가 정책 (예: `eslint.config.test.js` 도입 — 별 task).
  - `package.json:23` `"lint": "eslint ./src"` 인자 변경 (REQ-028 영역).
  - vitest / TypeScript / ESLint 메이저 bump 결정 (`dependency-bump-gate` / `runtime-dep-version-coherence` 직교).
  - `coverage.exclude` 의 entrypoint·mock·test·ambient `.d.ts` 항목 변경 (REQ-028 영역).

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | 도구 4축 (ESLint files / TypeScript include / Vitest coverage.include / Vitest test discovery) 의 모집단 패턴이 **명시 박제** — 현 시점 baseline = ESLint `src/**/*.{js,jsx,ts,tsx}` + TypeScript `src` + Vitest coverage `src/**/*.{js,jsx,ts,tsx}` + Vitest test discovery `default (test.include 부재)`. 4축 모집단 패턴 변경 (예: ESLint files 패턴 추가, tsconfig include 확장) 은 spec 갱신 필요 신호. | Must |
| FR-02 | 루트 레벨 `*.test.*` 파일 인벤토리 (= 1 파일, `vite.config.test.js`) 의 4축 노출 매트릭스가 spec §스코프 규칙 grep-baseline 에 박제 — (a) ESLint 미노출, (b) TypeScript 미노출, (c) Vitest coverage 측정 모집단 외, (d) Vitest test runner discovery 픽업. 본 매트릭스 변경 (예: 신규 루트 레벨 `*.test.*` 추가 또는 본 파일 이관) 은 spec 갱신 필요 신호. | Must |
| FR-03 | 본 spec 은 4축 매트릭스의 **정책 단일성** (모든 축이 동일 모집단을 가리키거나, 비대칭이라면 비대칭이 spec 으로 명시 enumeration) 을 박제 — 현 시점 비대칭은 (d) test runner discovery 의 default 글로브와 (a)(b)(c) 의 `src/**` 한정 간 발생하며, 본 비대칭의 의도 (= "test infra 자체 단위 테스트는 src 모집단 외 분리") 가 spec 평서문으로 박제. | Must |
| FR-04 | 신규 루트 레벨 `*.test.*` 파일 추가 시 — 본 spec 의 §스코프 규칙 grep-baseline 의 루트 레벨 인벤토리 수치 (= 1) 가 fail 신호로 작동. baseline 수치 변경 = spec 갱신 필요. | Must |
| FR-05 | 본 spec 의 4축 매트릭스 박제는 `vitest` 메이저 bump 의 default discovery 글로브 변경에 fail-safe — vitest 메이저 bump 후 baseline 의 (d) 노출 상태 (= 1 hit) 변동 시 본 spec 갱신 신호. 본 spec 은 vitest default 글로브 자체의 구체 표현 (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) 을 본문에 박제하지 않으며, baseline grep 결과 (= `vite.config.test.js` 1 hit) 만 박제. | Should |
| FR-06 | 본 spec 의 4축 매트릭스 박제는 **각 도구의 모집단 패턴 표현 변경에 fail-safe** — 예: `eslint.config.js:35` `files` 패턴이 `src/**/*.{js,jsx,ts,tsx,mjs,cjs}` 등 확장될 경우 본 spec 갱신 신호. baseline 패턴 자체는 §스코프 규칙 grep-baseline 에만 박제, 본문 §불변식 본문은 "src 한정" 등 의미 표현 한정. | Should |
| FR-07 | 본 spec 의 박제는 `package.json` scripts (`"lint": "eslint ./src"`, `"typecheck": "tsc --noEmit"`, `"test": "vitest run --coverage"`) 의 명령 인자 변경에 fail-safe — 예: `"lint": "eslint ."` 변경 시 (a) 모집단 표현이 `eslint.config.js:35` `files` 패턴으로만 결정되므로 동일 baseline 유지 (eslint files 패턴이 우선). 본 spec 은 scripts 인자 자체를 박제하지 않는다. | Should |
| FR-08 | 본 spec 은 도구 모집단 **선언 단일성** 만 박제하며, 모집단 외부 파일의 실제 lint/type/coverage 수치 영향은 별 게이트 (`dependency-bump-gate` / `regression-gate` / `coverage-determinism`) 가 부담. | Should |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 검증 가능성 | 본 req 의 모든 FR 은 `eslint.config.js` / `tsconfig.json` / `vite.config.js` / `package.json` 의 정적 read + `find` / `grep` 단일 명령으로 검증 가능. CI/로컬 어디서든 외부 네트워크 의존 없음. |
| NFR-02 | 시점 비의존 | 본 req 의 효능 평서문은 특정 vitest 메이저 (4) / typescript 메이저 (6) / eslint 메이저 (9) 에 무관 — baseline 수치·패턴은 §스코프 규칙 grep-baseline 에만 박제. 효능 표현은 "4축 모집단 정책 단일성" / "루트 레벨 인벤토리 = N" 등 시점 비의존 형식. |
| NFR-03 | 수단 중립 | 본 req 는 `vite.config.test.js` 의 위치 결정 / `test.include` 의 구체 패턴 결정 / 신규 디렉터리 (`tests/`) 도입 결정에 라벨 ("기본값" / "권장" / "우선" / "default" / "best practice" / "root cause" / "가장 효과적") 을 박제하지 않는다 — 4축 매트릭스 박제 + 정책 단일성 효능만. |
| NFR-04 | 차원 분리 | 본 req 는 도구 모집단 매트릭스 단일성 만 박제하며, (a) ESLint flat-config 의 rule 의미 (REQ-028 / REQ-053 / REQ-058 — `tooling.md`), (b) tsconfig path alias 동치 (REQ-065 — `path-alias-resolver-coherence`), (c) coverage threshold 수치 (REQ-037 — `regression-gate.md`), (d) coverage 측정 결정론 (REQ-041 / REQ-043 — `coverage-determinism.md`), (e) vite JSX 변환 채널 단일성 (REQ-066 — `vite-jsx-transform-channel-coherence`) 의 축에 비박제. |
| NFR-05 | 멱등성 | 본 req 의 게이트는 `eslint.config.js` / `tsconfig.json` / `vite.config.js` 내용 동일 상태에서 반복 적용 시 동일 결과 (RULE-02 멱등 정합). |
| NFR-06 | 자동 추종 | 본 spec 의 매트릭스 박제는 도구 패턴의 baseline 박제로 표현되며, 도구 추가/제거 또는 매트릭스 변경 시 baseline 변경 자체가 fail 신호. 특정 매처 정규식 / 특정 vitest 메이저 default 글로브 표현의 본문 효능 평서문 하드코딩 부재. |

## 수용 기준
- [ ] Given `eslint.config.js:35`, `eslint.config.js:79`, When `grep -nE "files:\s*\[.*src/" eslint.config.js` 실행, Then 2 hit (JS/JSX rule 블록 + typescript-eslint parser 블록 — 4축 (a) `src/**` 한정 박제).
- [ ] Given `tsconfig.json:26`, When `grep -nE "\"include\":" tsconfig.json` 실행, Then 1 hit + 값이 `["src"]` (4축 (b) `src` 한정 박제).
- [ ] Given `vite.config.js:83`, When `grep -nE "coverage.*include|'src/\*\*/\*\.\{js,jsx,ts,tsx\}'" vite.config.js` 실행, Then 1 hit (4축 (c) `src/**` 한정 박제 — REQ-028 박제 재참조).
- [ ] Given `vite.config.js:66-98` `test` 블록, When `grep -nE "test\.include|test\.exclude|test\.root|^\s+include\s*:|^\s+exclude\s*:" vite.config.js` 실행, Then `test.include` / `test.exclude` / `test.root` 키 부재 (line 83-90 의 `coverage.include` / `coverage.exclude` 는 coverage 모집단 — 본 게이트 외) — 4축 (d) default 글로브 박제.
- [ ] Given 프로젝트 루트, When `find /Users/park108/Dev/log -maxdepth 1 -name "*.test.*" -not -path "*/node_modules/*" 2>/dev/null | wc -l` 실행, Then 1 hit (`vite.config.test.js`) — 루트 레벨 인벤토리 baseline.
- [ ] Given `vite.config.test.js` 의 4축 노출 매트릭스, When 본 spec §스코프 규칙 grep-baseline 의 4 라인 매트릭스 검증, Then (a) ESLint 미노출 / (b) TypeScript 미노출 / (c) Vitest coverage 측정 모집단 외 / (d) Vitest test runner discovery 픽업 박제.
- [ ] Given 미래 PR (예: 신규 루트 레벨 `eslint.config.test.js` 추가), When 동일 `find` 명령 실행, Then 2 hit (인벤토리 변경) — 본 spec 갱신 신호로 fail.
- [ ] Given vitest 메이저 bump (예: 4.x → 5.x) 후 `vite.config.test.js` 실행, When `npm test -- --run --reporter=verbose 2>&1 | grep -c "vite.config.test.js"` 실행, Then ≥ 1 hit (test runner 픽업 보존). 0 hit 은 default 글로브 변경 신호.

## 참고
- **현장 근거 (HEAD=`b96bb5e`, 2026-05-17 실측)**:
  - `eslint.config.js:35` `files: ['src/**/*.{js,jsx,ts,tsx}']` — ESLint JS/JSX rule 블록 모집단.
  - `eslint.config.js:79` `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts']` — typescript-eslint parser 블록 모집단.
  - `tsconfig.json:26` `"include": ["src"]` — TypeScript 컴파일 모집단.
  - `vite.config.js:66-98` `test` 블록 — `test.include` / `test.exclude` / `test.root` 부재.
  - `vite.config.js:83` `coverage.include: ['src/**/*.{js,jsx,ts,tsx}']` — coverage 측정 모집단.
  - `vite.config.js:84-90` `coverage.exclude` — entrypoint·mock·test·ambient `.d.ts` 제외 (REQ-028 영역).
  - `vite.config.test.js:5` `import { stripCspMetaInDev } from './vite.config.js'` — 루트 레벨 plugin 단위 테스트.
  - `vite.config.test.js:7-75` — 6 it (plugin name / apply: 'serve' / transformIndexHtml.order / removes CSP meta / idempotent no-op / first match only).
  - `package.json:21` `"test": "vitest run --coverage"`, `package.json:23` `"lint": "eslint ./src"`, `package.json:24` `"typecheck": "tsc --noEmit"`.
- 인계 출처:
  - `20.req/20260517-vite-jsx-transform-channel-coherence.md:60` (REQ-066) §Out-of-Scope — "별 spec / vitest test include 패턴 축" 명시 인계.
- 직교 참조:
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028 / REQ-053 / REQ-058) — 도구 4축 각 축의 단일 설정 단일성 박제. 본 req 와 매트릭스 정합성 축 직교 (본 req 가 매트릭스 간 정합을 박제, tooling.md 가 각 축 내부의 단일성을 박제).
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-037) — typecheck step + coverage threshold. 본 req 와 회귀 게이트 축 직교 (단, `tsc` 의 모집단 = tsconfig include 가 본 req 의 (b) 축 — 참조만).
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (REQ-041 / REQ-043) — vitest 측정 결정론. 본 req 와 모집단 정책 축 직교.
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — bump 직후 4 scripts exit 0. 본 req 와 매트릭스 정합 축 직교 (단, vitest bump 시 default 글로브 변경에 본 req 의 fail 신호 작동).
  - `specs/30.spec/blue/foundation/ci.md` (REQ-023 / REQ-034) — CI Node LTS + 메이저 floating. 본 req 와 CI 환경 축 직교.
  - `specs/20.req/20260517-vite-jsx-transform-channel-coherence.md` (REQ-066) — vite JSX 변환 채널 단일성. 본 req §Out-of-Scope 인계 출처.
  - `specs/20.req/20260517-path-alias-resolver-coherence.md` (REQ-065) — vite alias ↔ tsconfig paths 동치. 본 req 와 resolver 동치 축 직교.
  - `specs/30.spec/green/foundation/devbin-install-integrity.md` (REQ-064) — devbin install 존재. 본 req 와 모집단 매트릭스 축 직교.
- 외부 레퍼런스:
  - Vitest 공식 — `test.include` / `test.exclude` / `test.root` 옵션. 기본값은 vitest 메이저별 변경 가능 (현 4.x default = `**/*.{test,spec}.?(c|m)[jt]s?(x)`).
  - ESLint flat config — `files` 패턴이 rule 블록의 적용 모집단을 결정. CLI 인자 (`eslint ./src`) 와 `files` 패턴이 동시 적용 시 양쪽 교집합.
  - TypeScript — `tsconfig.json` `include` 배열이 컴파일 모집단 결정. `--noEmit` 모드에서도 동일 적용.
- HEAD: `b96bb5e` (실측 시점, 2026-05-17).
