# TypeScript foundation / tooling — ESLint / lint-staged / ambient alias / Vitest coverage 불변식

> **위치**: `eslint.config.js`, `package.json` (lint-staged), `tsconfig.json` (paths), `vite.config.js` (vitest coverage).
> **관련 요구사항**: REQ-20260421-028
> **최종 업데이트**: 2026-04-21 (by inspector, 신규 등록)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=29d9da0).

## 역할
TypeScript 도입 후 유지되는 **tooling 계약 불변식** 4건을 박제. ESLint/lint-staged 대상, ambient type alias, typescript-eslint 파서, Vitest coverage 범위. 의도적으로 하지 않는 것: TypeScript 소스 재구조화 (done 배치), CI workflow 정의 (REQ-023), 런타임 env/테스트 이디엄 (REQ-021/022).

## 공개 인터페이스
- 소비 파일:
  - `eslint.config.js` — flat config. `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts']` 블록에 typescript-eslint parser 적용.
  - `package.json` — `"lint-staged": { "src/**/*.{js,jsx,ts,tsx}": "eslint" }`.
  - `tsconfig.json` — `compilerOptions.paths` 에 `"@/types/*": ["./src/types/*"]`.
  - `vite.config.js` — `test.coverage.include: ['src/**/*.{js,jsx,ts,tsx}']`.

## 동작

### 1. ESLint / lint-staged 대상 불변식 (REQ-028 FR-01)
`src/**/*.{ts,tsx,d.ts}` 는 ESLint 및 lint-staged (`.husky` 호출) 대상에 포함된다. ESLint 는 `eslint.config.js` 의 `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts']` 블록이 커버하며, lint-staged 는 `package.json` 의 대응 glob 이 커버한다.

### 2. ambient type alias 불변식 (REQ-028 FR-02)
`@/types/*` alias 는 ambient type 진입점이며, 모든 `.d.ts` 는 `src/types/` 또는 `src/*.d.ts` 에 위치한다. 런타임 코드에서 ambient type 을 import 할 때는 `@/types/*` alias 를 사용한다.

### 3. typescript-eslint 파서 불변식 (REQ-028 FR-03)
ESLint 는 `.ts/.tsx/.d.ts` 를 `@typescript-eslint/parser` (flat config 에서는 `tseslint.parser`) 로 파싱한다. JS/JSX 는 기존 ESLint 기본 파서 또는 `@babel/eslint-parser` 경로를 유지한다.

### 4. Vitest coverage 범위 불변식 (REQ-028 FR-04)
Vitest coverage 는 `src/**/*.{js,jsx,ts,tsx}` 를 포함하며 `.d.ts` 는 제외한다. ambient 타입은 런타임 커버리지 대상이 아니므로 include 패턴에 `.d.ts` 를 넣지 않는다.

### 회귀 중점
- `eslint.config.js` 의 ts/tsx 블록 제거 또는 `files:` 패턴 축소는 즉시 CI 실패로 귀결.
- `tsconfig.json` paths alias 변경은 런타임 번들러 (Vite resolve.alias) 와 정합 확인 필요.
- Vitest coverage include 에 `.d.ts` 포함 시 coverage 보고가 부풀어 오류 소지.

## 의존성
- 외부: `typescript`, `typescript-eslint`, `eslint`, `lint-staged`, `vitest`, `@vitest/coverage-*`.
- 내부: `eslint.config.js` → `tseslint.parser` import. `tsconfig.json` → `src/types/` alias.
- 역의존: pre-commit 훅 (`.husky/pre-commit`), CI lint 스텝, Vitest coverage 리포트.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (inspector 발행 시점, HEAD=29d9da0 실측):
  - (a) `grep -nE "src/\*\*/\*\.\{ts,tsx\}|src/\*\*/\*\.d\.ts" eslint.config.js` → 1 hit (`eslint.config.js:34` → `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts']`). 본 블록이 ts/tsx/d.ts 전원 커버.
  - (b) `grep -nE "lint-staged" package.json` → 2 hits (`package.json:39` 설정 블록 시작, `:57` devDependencies 엔트리). 설정 블록 실제 패턴: `"src/**/*.{js,jsx,ts,tsx}"` (`.d.ts` 미포함 — 현실 baseline; FR-01 불변식은 `.d.ts` 포함 계약이므로 현실 미달 상태. 향후 task 로 보강 대상).
  - (c) `grep -n "typescript-eslint" eslint.config.js` → 2 hits (`:7` `import tseslint from 'typescript-eslint'`, `:35` `languageOptions: { parser: tseslint.parser }`).
  - (d) `grep -nE "coverage.*include|'src/\*\*/\*\.\{js,jsx,ts,tsx\}'" vite.config.js` → 1 hit (`vite.config.js:71-74` → `coverage: { include: ['src/**/*.{js,jsx,ts,tsx}'] }`). `.d.ts` 는 미포함 → 정합 OK.
  - (e) `grep -n "@/types" tsconfig.json` → 1 hit (`tsconfig.json:20` → `"@/types/*": ["./src/types/*"]`).

- **rationale**: gate (a)/(c)/(d)/(e) 는 현실이 계약과 정합 (OK). gate (b) 는 lint-staged 패턴이 `.d.ts` 를 명시 포함하지 않음 — `src/**/*.{js,jsx,ts,tsx}` 는 ESLint 에 위임 시 ts/tsx 만 매치되어 `.d.ts` 파일은 staged 되어도 lint 트리거되지 않음. 본 spec 은 "포함되어야 한다" 를 불변식으로 박제하며, 실제 패턴 보강은 task 계층 (별도 task carve 대상).

## 테스트 현황
- [x] CI lint step 이 PR 마다 실행되어 (a)(c) 의 ts/tsx 파서 구성 회귀 시 즉시 실패.
- [x] Vitest coverage 리포트가 `.d.ts` 를 포함하지 않음을 보고서 자체 확인.
- [ ] lint-staged `.d.ts` 포함 보강 (FR-01 불변식 현실 정합; 향후 task).

## 수용 기준
- [x] (Must, FR-01) ESLint / lint-staged 대상 불변식 문장 박제.
- [x] (Must, FR-02) ambient type alias 불변식 문장 박제.
- [x] (Must, FR-03) typescript-eslint 파서 불변식 문장 박제.
- [x] (Must, FR-04) Vitest coverage 범위 불변식 문장 박제.
- [x] (Must, FR-05) §스코프 규칙 grep-baseline 에 4+ gate 실제 수치 박제.
- [x] (Must, FR-06) §변경 이력 에 `REQ-20260421-028` + followup 2건 경로 참조.
- [x] (Must, FR-07) inspector 세션 diff = 1파일 신규 create.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 29d9da0 | 최초 등록 (REQ-20260421-028). 2건 blocked spec followup 의 4개 tooling 불변식을 하나의 green spec 으로 통합. consumed followups (2건): `specs/10.followups/20260421-0541-typescript-bootstrap-spec-from-blocked.md`, `specs/10.followups/20260421-0541-typescript-tooling-completion-spec-from-blocked.md`. 선행 done req (2건): `specs/60.done/2026/04/20/req/20260420-typescript-foundation-bootstrap.md` (TSK-20260420-32), `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` (TSK-20260420-33). baseline 실측: `eslint.config.js:34,7,35`, `package.json:39` (`.d.ts` 미포함 — 현실 미달), `tsconfig.json:20`, `vite.config.js:71-74`. | 신규 전 섹션 |

## 참고
- **REQ 원문 (완료 처리)**: `specs/60.done/2026/04/21/req/20260421-typescript-foundation-tooling-spec-consolidation.md`.
- **Consumed followups (2건)**:
  - `specs/10.followups/20260421-0541-typescript-bootstrap-spec-from-blocked.md`
  - `specs/10.followups/20260421-0541-typescript-tooling-completion-spec-from-blocked.md`
- **선행 done req**:
  - `specs/60.done/2026/04/20/req/20260420-typescript-foundation-bootstrap.md`
  - `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md`
- **관련 spec**: `specs/30.spec/green/foundation/ci-spec.md` (REQ-023 CI foundation — 동일 디렉터리 별 파일).
- **RULE 준수**:
  - RULE-07: 4개 불변식은 시점 비의존·평서형·반복 검증 가능.
  - RULE-06: grep-baseline 5개 gate 실측 수치 박제.
  - RULE-01: inspector writer 영역만.
