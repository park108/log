# TypeScript foundation / tooling — ESLint / lint-staged / ambient alias / Vitest coverage / no-unused-vars rule swap 불변식

> **위치**: `eslint.config.js`, `package.json` (lint-staged), `tsconfig.json` (paths), `vite.config.js` (vitest coverage).
> **관련 요구사항**: REQ-20260421-028, REQ-20260422-053
> **최종 업데이트**: 2026-04-22 (by inspector, REQ-053 FR-05 추가 — `.ts/.tsx/.d.ts` 블록의 `no-unused-vars` rule swap 불변식 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-028 초기 HEAD=29d9da0 · REQ-053 반영 HEAD=ab88167).

## 역할
TypeScript 도입 후 유지되는 **tooling 계약 불변식** 5건을 박제. ESLint/lint-staged 대상, ambient type alias, typescript-eslint 파서, Vitest coverage 범위, `.ts/.tsx/.d.ts` 블록의 `no-unused-vars` rule swap (vanilla off · `@typescript-eslint/no-unused-vars` warn). 의도적으로 하지 않는 것: TypeScript 소스 재구조화 (done 배치), CI workflow 정의 (REQ-023), 런타임 env/테스트 이디엄 (REQ-021/022), typescript-eslint `recommended` 규칙 세트 전면 도입 (REQ-053 명시 out-of-scope — 본 spec 은 **한 규칙 한정 치환** 만 박제).

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

### 5. `.ts/.tsx/.d.ts` `no-unused-vars` rule swap 불변식 (REQ-053 FR-01~04)
`src/**/*.{ts,tsx,d.ts}` 대상 ESLint 설정에서 **`@typescript-eslint/no-unused-vars`** 규칙이 `warn` 수준 (`caughtErrors: 'none'` 보존) 으로 활성화되며, **동일 스코프** 의 vanilla `no-unused-vars` 는 `off` 로 중립화된다. JS/JSX 블록 (`src/**/*.{js,jsx}`) 의 vanilla `no-unused-vars: ['warn', { caughtErrors: 'none' }]` 규칙 의미는 변경되지 않는다. 본 불변식의 결과:

- (5.1) TS interface / function-type / method-signature 의 param 식별자에 대한 `no-unused-vars` 계열 경고가 `src/**/*.{ts,tsx,d.ts}` 전체에서 0 발생. 즉 `listen(options?: Partial<SharedOptions>): unknown;` 같은 메서드 시그니처 param 에 `// eslint-disable-next-line no-unused-vars` 우회가 필요 없다.
- (5.2) `src/**/*.{ts,tsx,d.ts}` 내 `// eslint-disable-next-line no-unused-vars` 주석은 (5.1) 달성 후 0 건으로 수렴. 현장 잔존 시 회귀 신호로 간주.
- (5.3) 실제 함수 본문의 미사용 param (예: `function foo(x: number) {}`) 은 여전히 `@typescript-eslint/no-unused-vars` 경고로 검출 — 규칙 치환이 TS 의도를 제거하는 것이 아닌 **서명 노드 오탐만 제거**하는 성질.
- (5.4) `typescript-eslint` devDep (`package.json`) 은 이미 설치되어 있으며 본 불변식은 **신규 의존성 도입 없이** 성립한다. 규칙 세트 전체 (`recommended` / `recommended-type-checked`) 도입은 본 spec 범위 밖 — 단일 규칙 한정 치환.

### 회귀 중점
- `eslint.config.js` 의 ts/tsx 블록 제거 또는 `files:` 패턴 축소는 즉시 CI 실패로 귀결.
- `tsconfig.json` paths alias 변경은 런타임 번들러 (Vite resolve.alias) 와 정합 확인 필요.
- Vitest coverage include 에 `.d.ts` 포함 시 coverage 보고가 부풀어 오류 소지.
- `.ts/.tsx/.d.ts` 블록에서 vanilla `no-unused-vars` 가 재활성되거나 `@typescript-eslint/no-unused-vars` 가 제거되면 (5.1) 회귀 — TS 서명 param 오탐 재발 · disable 주석 잔존 증가.
- JS/JSX 블록의 vanilla `no-unused-vars` 설정을 `off` / level 변경 / option 변경 시 FR-04 (의미 보존) 위반.

## 의존성
- 외부: `typescript`, `typescript-eslint`, `eslint`, `lint-staged`, `vitest`, `@vitest/coverage-*`.
- 내부: `eslint.config.js` → `tseslint.parser` import. `tsconfig.json` → `src/types/` alias.
- 역의존: pre-commit 훅 (`.husky/pre-commit`), CI lint 스텝, Vitest coverage 리포트.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (REQ-028 발행 시점, HEAD=29d9da0 실측):
  - (a) `grep -nE "src/\*\*/\*\.\{ts,tsx\}|src/\*\*/\*\.d\.ts" eslint.config.js` → 1 hit (`eslint.config.js:34` → `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts']`). 본 블록이 ts/tsx/d.ts 전원 커버.
  - (b) `grep -nE "lint-staged" package.json` → 2 hits (`package.json:39` 설정 블록 시작, `:57` devDependencies 엔트리). 설정 블록 실제 패턴: `"src/**/*.{js,jsx,ts,tsx}"` (`.d.ts` 미포함 — 현실 baseline; FR-01 불변식은 `.d.ts` 포함 계약이므로 현실 미달 상태. 향후 task 로 보강 대상).
  - (c) `grep -n "typescript-eslint" eslint.config.js` → 2 hits (`:7` `import tseslint from 'typescript-eslint'`, `:35` `languageOptions: { parser: tseslint.parser }`).
  - (d) `grep -nE "coverage.*include|'src/\*\*/\*\.\{js,jsx,ts,tsx\}'" vite.config.js` → 1 hit (`vite.config.js:71-74` → `coverage: { include: ['src/**/*.{js,jsx,ts,tsx}'] }`). `.d.ts` 는 미포함 → 정합 OK.
  - (e) `grep -n "@/types" tsconfig.json` → 1 hit (`tsconfig.json:20` → `"@/types/*": ["./src/types/*"]`).

- **grep-baseline** (REQ-053 반영 시점, HEAD=ab88167 실측 — §동작 5 박제용):
  - (f) `grep -nE "no-unused-vars" eslint.config.js` → 2 hits:
    - `eslint.config.js:70` 주석 (`caughtErrors: 'none'` 의미 근거 주석).
    - `eslint.config.js:74` vanilla rule 선언: `'no-unused-vars': ['warn', { caughtErrors: 'none' }]`.
    현 상태: `files: ['src/**/*.{js,jsx,ts,tsx}']` 블록 (`eslint.config.js:45`) 의 rules 에 vanilla 규칙만 존재 — ts/tsx 에도 머지 적용되어 오탐 발생 조건 성립. `.ts/.tsx/.d.ts` 전용 블록 (`eslint.config.js:33-36`) 은 `rules` 부재 (파서만).
  - (g) `grep -nE "@typescript-eslint/no-unused-vars" eslint.config.js` → **0 hit**. 치환 규칙 미도입 상태 (§동작 5 목표 0→1).
  - (h) `grep -rn "eslint-disable-next-line no-unused-vars" src` → **2 hits** (우회 주석 잔존 — §동작 5.2 목표 0):
    - `src/test-utils/msw.ts:41` (`listen(options?: Partial<SharedOptions>): unknown;` 서명 param 오탐 회피).
    - `src/Image/ImageItem.tsx:6` (`type ImageCopyHandler = (e: React.SyntheticEvent<HTMLImageElement>) => void | Promise<void>;` 함수 타입 param 오탐 회피).
  - (i) `grep -nE "\"typescript-eslint\"" package.json` → 1 hit (`package.json:60` → `"typescript-eslint": "^8.58.2"` devDep 기 설치). §동작 5.4 현장 근거.
  - (j) `npm run lint` 종료 코드 = **0**, warning 0 (현 우회 2건으로 인해 외관 green). §동작 5 치환 달성 후에도 동일 유지 필요 (§동작 5.2 후속 회수 대상 전원 제거 시점에 warning 0 유지).

- **rationale**: gate (a)/(c)/(d)/(e) 는 현실이 계약과 정합 (OK). gate (b) 는 lint-staged 패턴이 `.d.ts` 를 명시 포함하지 않음 — `src/**/*.{js,jsx,ts,tsx}` 는 ESLint 에 위임 시 ts/tsx 만 매치되어 `.d.ts` 파일은 staged 되어도 lint 트리거되지 않음. 본 spec 은 "포함되어야 한다" 를 불변식으로 박제하며, 실제 패턴 보강은 task 계층 (별도 task carve 대상). gate (f)/(g)/(h) 는 §동작 5 rule swap 의 **미달 baseline** — (g) 0→1 달성 후 (h) 2→0 회귀 없이 수렴하는 것이 §동작 5.1/5.2 달성 조건. gate (i)/(j) 는 §동작 5.4 (신규 dep 불요) 및 회귀 기준점. `src/Image/ImageItem.tsx:6` 우회는 REQ-053 §개요 에 직접 언급되지 않았으나 NFR-03 전 범위 (`grep -rn "eslint-disable-next-line no-unused-vars" src → 0`) 에 포함되므로 §동작 5.2 수렴 조건에 편입 — 파생 task 는 2건 모두 회수 대상.

## 테스트 현황
- [x] CI lint step 이 PR 마다 실행되어 (a)(c) 의 ts/tsx 파서 구성 회귀 시 즉시 실패.
- [x] Vitest coverage 리포트가 `.d.ts` 를 포함하지 않음을 보고서 자체 확인.
- [x] lint-staged `.d.ts` 포함 보강 (FR-01 불변식 현실 정합; TSK-20260421-64 / `dcecda0` 실현, `package.json:40` `"src/**/*.{js,jsx,ts,tsx,d.ts}"` 박제).
- [ ] §동작 5.1 TS 서명 param 오탐 0: `.ts/.tsx/.d.ts` 블록에 `@typescript-eslint/no-unused-vars` 활성 + vanilla `no-unused-vars: off` 치환 후 `npm run lint` warning 0.
- [ ] §동작 5.2 disable 회수: `grep -rn "eslint-disable-next-line no-unused-vars" src` → 2→0 (`src/test-utils/msw.ts:41`, `src/Image/ImageItem.tsx:6` 전원 제거 후 lint PASS).
- [ ] §동작 5.3 TS 의도 보존: 임시 `function foo(x: number) {}` 구문 도입 시 `@typescript-eslint/no-unused-vars` warning 1건 재현 후 삭제 (PR diff 에 남기지 않음).
- [ ] §동작 5.4 신규 dep 불요: `grep -nE "@typescript-eslint|typescript-eslint" package.json` → 1 hit 유지 (기존 `typescript-eslint` 외 신규 엔트리 0).
- [ ] JS/JSX 의미 보존: `src/**/*.{js,jsx}` 블록의 vanilla `no-unused-vars` level / option (`caughtErrors: 'none'`) 무변경 — `grep -nE "'no-unused-vars'" eslint.config.js` 에서 JS 블록 rule line bit-for-bit 동일.

## 수용 기준
- [x] (Must, FR-01) ESLint / lint-staged 대상 불변식 문장 박제.
- [x] (Must, FR-02) ambient type alias 불변식 문장 박제.
- [x] (Must, FR-03) typescript-eslint 파서 불변식 문장 박제.
- [x] (Must, FR-04) Vitest coverage 범위 불변식 문장 박제.
- [x] (Must, FR-05) §스코프 규칙 grep-baseline 에 4+ gate 실제 수치 박제 (REQ-028 시점 5 gate + REQ-053 시점 5 gate = 총 10).
- [x] (Must, FR-06) §변경 이력 에 `REQ-20260421-028` + followup 2건 경로 참조.
- [x] (Must, FR-07) inspector 세션 diff = 1파일 신규 create (REQ-028) / 1파일 edit (REQ-053).
- [ ] (Must, REQ-053 FR-01) `.ts/.tsx/.d.ts` 블록에 `@typescript-eslint/no-unused-vars: ['warn', { caughtErrors: 'none' }]` + `'no-unused-vars': 'off'` 박제.
- [ ] (Must, REQ-053 FR-02) `npm run lint` exit 0 + warning 0 (특히 `src/test-utils/msw.ts` 내 no-unused-vars 경고 0).
- [ ] (Must, REQ-053 FR-03) `src/test-utils/msw.ts:41` + `src/Image/ImageItem.tsx:6` disable 주석 2건 회수 후 FR-02 성립.
- [ ] (Must, REQ-053 FR-04) JS/JSX 블록 (`eslint.config.js:45-77`) 4 user rule 의미 변경 0 — 기존 `.js/.jsx` lint 결과 bit-for-bit 동일.
- [ ] (Should, REQ-053 FR-05) 실제 미사용 param 이 여전히 `@typescript-eslint/no-unused-vars` 로 검출됨 (TS 의도 보존 검증).
- [ ] (Should, REQ-053 FR-06) pre-commit 훅 (`.husky/pre-commit`) 가 `.ts/.tsx` staged 파일에 치환된 규칙을 실제로 적용 (lint-staged 경유).
- [ ] (NFR, REQ-053 NFR-03) `grep -rn "eslint-disable-next-line no-unused-vars" src` → 0 hits (전 영역 회귀 방지).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 29d9da0 | 최초 등록 (REQ-20260421-028). 2건 blocked spec followup 의 4개 tooling 불변식을 하나의 green spec 으로 통합. consumed followups (2건): `specs/10.followups/20260421-0541-typescript-bootstrap-spec-from-blocked.md`, `specs/10.followups/20260421-0541-typescript-tooling-completion-spec-from-blocked.md`. 선행 done req (2건): `specs/60.done/2026/04/20/req/20260420-typescript-foundation-bootstrap.md` (TSK-20260420-32), `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` (TSK-20260420-33). baseline 실측: `eslint.config.js:34,7,35`, `package.json:39` (`.d.ts` 미포함 — 현실 미달), `tsconfig.json:20`, `vite.config.js:71-74`. | 신규 전 섹션 |
| 2026-04-21 | TSK-20260421-64 / dcecda0 | lint-staged 패턴 `.d.ts` 포함 보강 (FR-01 불변식 현실 정합 달성). `package.json:40` `"src/**/*.{js,jsx,ts,tsx}"` → `"src/**/*.{js,jsx,ts,tsx,d.ts}"` 단일 키 변경. DoD 게이트 재실행 시 `grep -nE "d\.ts" package.json` → 1 hit (`:40`), `lint-staged` 블록 출력 정합 OK. § 스코프 규칙 (b) "현실 미달 상태" 표현은 baseline 박제로 보존하되 본 § 테스트 현황 / § 변경 이력 에 ack 박제. | §테스트 현황 |
| 2026-04-22 | inspector / (this commit) | REQ-20260422-053 흡수 — **blue → green 복사 후 편집**. §동작 5 "`.ts/.tsx/.d.ts` `no-unused-vars` rule swap 불변식" 신규 박제 (5.1~5.4). 스코프 규칙에 REQ-053 baseline gate (f)~(j) 실측 수치 추가 (HEAD=ab88167): `eslint.config.js:70,74` vanilla rule 2 hit, `@typescript-eslint/no-unused-vars` 0 hit, 우회 주석 `src/test-utils/msw.ts:41` + `src/Image/ImageItem.tsx:6` 2건, `package.json:60` `typescript-eslint@^8.58.2` 기 설치, `npm run lint` exit 0. §테스트 현황 / §수용 기준 에 REQ-053 FR-01~06 · NFR-03 체크항목 추가. 관련 계약: `src-typescript-migration.md` FR-05 island 전환 맥락. consumed followup: `specs/10.followups/20260422-0057-eslint-no-unused-vars-ts-method-signature.md` (source: TSK-20260422-02). 선행 done req: `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` FR-09 "규칙 세트 미적용" 결정을 **한 규칙 한정 치환** 으로 범위 제한 완화. RULE-07 자기검증 — 5.1~5.4 모두 평서형·반복 검증 가능 (`npm run lint` · `grep`)·시점 비의존·incident 귀속 부재. RULE-06 §스코프 규칙 gate (f)~(j) 5건 실측 박제. RULE-01 inspector writer 영역만 (green tooling.md edit). | §제목, §역할, §동작 5, §회귀 중점, §스코프 규칙, §테스트 현황, §수용 기준, §참고 |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/04/21/req/20260421-typescript-foundation-tooling-spec-consolidation.md` (REQ-028).
  - `specs/60.done/2026/04/22/req/20260422-eslint-no-unused-vars-typescript-eslint-rule-swap.md` (REQ-053 — 본 세션 mv).
- **Consumed followups**:
  - `specs/10.followups/20260421-0541-typescript-bootstrap-spec-from-blocked.md` (REQ-028).
  - `specs/10.followups/20260421-0541-typescript-tooling-completion-spec-from-blocked.md` (REQ-028).
  - `specs/10.followups/20260422-0057-eslint-no-unused-vars-ts-method-signature.md` (REQ-053, source: TSK-20260422-02).
- **선행 done req**:
  - `specs/60.done/2026/04/20/req/20260420-typescript-foundation-bootstrap.md`.
  - `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` (FR-09 "규칙 세트 미적용" — REQ-053 로 **한 규칙 한정 치환** 범위 완화).
- **관련 spec**:
  - `specs/30.spec/green/foundation/ci.md` (REQ-023 CI foundation — 동일 디렉터리 별 파일).
  - `specs/30.spec/green/foundation/src-typescript-migration.md` (REQ-051 FR-05 — `.ts/.tsx` island 전환 축. §동작 5 rule swap 은 island 확장 시 disable 주석 반복 삽입 필요성 제거).
  - `specs/30.spec/green/foundation/tsconfig-test-ambient-globals.md` (REQ-052 — tsc 타입 인식 경로 독립 축; 본 spec §동작 5 는 ESLint 경로이므로 직교).
- **RULE 준수**:
  - RULE-07: 5개 불변식 (REQ-028 4개 + REQ-053 1개) 모두 시점 비의존·평서형·반복 검증 가능 (`eslint`·`grep`·`npm run lint` 재현).
  - RULE-06: grep-baseline 10개 gate (REQ-028 시점 5 + REQ-053 시점 5) 실측 수치 박제.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/tooling.md` edit).
