# TypeScript foundation / tooling — ESLint / lint-staged / ambient alias / Vitest coverage / no-unused-vars rule swap 불변식

> **위치**: `eslint.config.js`, `package.json` (lint-staged), `tsconfig.json` (paths), `vite.config.js` (vitest coverage), `.husky/pre-commit` (lint-staged 진입점).
> **관련 요구사항**: REQ-20260421-028, REQ-20260422-053, REQ-20260422-058, REQ-20260517-075
> **최종 업데이트**: 2026-05-17 (by inspector, REQ-075 FR-01~04 추가 — pre-commit lint-staged 사이클의 untracked 보존 + glob 한정 + 훅 본문 사이드이펙트 0 불변식 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-028 초기 HEAD=29d9da0 · REQ-053 반영 HEAD=ab88167 · REQ-058 반영 HEAD=4af36ee · REQ-075 반영 HEAD=`9e5f00a`).

## 역할
TypeScript 도입 후 유지되는 **tooling 계약 불변식** 7건을 박제. ESLint/lint-staged 대상, ambient type alias, typescript-eslint 파서, Vitest coverage 범위, `.ts/.tsx/.d.ts` 블록의 `no-unused-vars` rule swap (vanilla off · `@typescript-eslint/no-unused-vars` warn), ESLint flat-config 동일 rule key last-write-wins merge semantics, pre-commit lint-staged 사이클의 untracked spec 산출물 보존 (lint-staged glob 한정 + 훅 본문 사이드이펙트 0). 의도적으로 하지 않는 것: TypeScript 소스 재구조화 (done 배치), CI workflow 정의 (REQ-023), 런타임 env/테스트 이디엄 (REQ-021/022), typescript-eslint `recommended` 규칙 세트 전면 도입 (REQ-053 명시 out-of-scope — 본 spec 은 **한 규칙 한정 치환** 만 박제), ESLint 버전 다운그레이드/업그레이드 계획 (REQ-058 out-of-scope), 기타 tooling 의 merge semantics (lint-staged · Vite 등 REQ-058 out-of-scope), lint-staged 라이브러리 내부 stash 로직 패치 (REQ-075 out-of-scope), `specs/**` 에 대한 별도 lint/format 게이트 도입 (REQ-075 out-of-scope, 별 req 후보), husky / lint-staged major 버전 업그레이드 계획 (REQ-075 out-of-scope).

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

### 6. ESLint flat-config 동일 rule key last-write-wins 불변식 (REQ-058 FR-01~02)
`eslint.config.js` 는 ESLint v9+ flat-config 이며 **동일 rule key 를 복수 블록에서 선언할 경우 배열상 마지막 블록의 설정이 이긴다** (last-write-wins). 이 merge semantics 에 따라 블록 선언 순서가 규칙 지배관계를 결정한다. §동작 5 가 박제하는 `.ts/.tsx/.d.ts` 블록의 `no-unused-vars: 'off'` 치환은 **TS 블록이 JS/JSX 블록보다 배열상 뒤에 위치해야** `.ts/.tsx/.d.ts` 파일에서 vanilla `no-unused-vars` 가 중립화된다는 의미이다. 본 불변식의 결과:

- (6.1) `src/**/*.{js,jsx,ts,tsx}` 를 커버하는 JS/JSX 블록 (vanilla `no-unused-vars` 선언 보유) 과 `src/**/*.{ts,tsx}` + `src/**/*.d.ts` 를 커버하는 TS 블록 (vanilla `no-unused-vars: 'off'` 선언 보유) 이 동일 rule key 를 공유할 때, TS 블록은 배열상 JS/JSX 블록 **뒤** 에 위치한다.
- (6.2) 본 불변식은 ESLint v9+ flat-config 의 merge semantics — "If the same rule is specified in multiple configuration objects, the later configuration object wins" — 을 반영한다. 블록 rules 병합은 "더 엄격한 레벨로" 가 아니라 "마지막이 우세" 이다.
- (6.3) JS/JSX · TS 블록 외에 동일 rule key 를 선언하는 추가 블록이 도입될 경우, 해당 블록의 배열상 위치가 rule 지배관계를 결정한다. 의도된 지배관계는 블록 rules 값의 조합이 아닌 **배열 내 블록 순서** 로 표현된다.
- (6.4) `eslint.config.js:74-76` 구현부 주석 ("Flat-config resolves duplicate rule keys by taking the last occurrence, so this block must appear after the JS/JSX block to dominate") 은 본 불변식의 구현부 근거이며, 본 spec §동작 6 박제 후 spec 본문이 정식 계약, 구현부 주석은 감사 교차참조로 기능한다.

### 7. pre-commit lint-staged 사이클의 untracked 보존 + 훅 본문 사이드이펙트 0 불변식 (REQ-075 FR-01~04)
`.husky/pre-commit` 의 `npx lint-staged` 호출이 내부 `git stash --include-untracked` 기반 backup/restore 사이클을 수행할 때, **`package.json` `lint-staged` glob 외 untracked 파일** (특히 `specs/10.followups/*.md` 등 SDLC 큐 산출물) 은 사이클 진입 전후 동일하게 보존된다. 본 불변식은 SDLC 큐 무결성 (NFR-01) 의 도구 측 토대로 기능한다. 본 불변식의 결과:

- (7.1) **lint-staged glob 한정 계약 (FR-02)**: `package.json` 의 `"lint-staged"` 블록 glob 은 `src/**` 한정이며, `specs/**` 는 lint-staged 의 명시적 대상이 아니다. 이는 (a) lint-staged 가 `specs/**` 파일을 lint 입력으로 받지 않음, (b) `specs/**` 의 lint/format 책임은 본 spec 범위 밖 (별 도구·별 spec 후보) 두 의미를 갖는다.
- (7.2) **훅 본문 사이드이펙트 0 계약 (FR-04)**: `.husky/pre-commit` 본문은 `lint-staged` 외 추가 사이드이펙트 (예: `git add -A`, `git stash -u && git stash drop`, 명시적 untracked 파일 제거 등) 를 직접 수행하지 않는다. backup/restore 책임은 lint-staged 라이브러리 내부 (`--hide-partially-staged` 기본 + `git stash --include-untracked`) 에 위임하며, 훅 본문은 lint-staged 호출 + 후속 spec coherence gate (조건부) + vite env gate (조건부) 등 **읽기/검증 전용 스크립트** 만 추가한다.
- (7.3) **untracked 보존 결과 효능 (FR-01)**: `git status --short` 가 `??` 로 표시하는 untracked 파일이 존재하는 상태에서 `git add <staged-target>` → `git commit` 시, commit 사이클 전후 동일한 `??` 파일이 동일 경로/내용으로 잔존한다. 특히 `specs/10.followups/*.md` 가 untracked 상태로 발행되어도 첫 commit 사이클 통과 후 휘발되지 않는다.
- (7.4) **회귀 감지 채널 (FR-05 Could)**: 본 불변식 위반이 재발하면 (untracked spec 산출물 휘발), discovery 가 followups 재수신 후 본 spec §변경 이력에 hook-ack 갱신으로 회귀 박제. lint-staged 16.x → 17.x 등 메이저 업그레이드 시 (NFR-02) 본 spec 의 §변경 이력에 ack/회귀 박제 필수.
- (7.5) **수단 중립**: 본 불변식의 결과 보장은 (a) lint-staged `--hide-partially-staged` 기본 + `git stash --include-untracked` 경로, (b) 향후 lint-staged 옵션 변경 또는 패키지 매니저 전환 후의 등가 메커니즘 어느 쪽이든 수용. 본 spec 은 결과 효능 (untracked 보존) 만 계약하며 lint-staged 내부 구현 경로는 강제하지 않는다.

### 회귀 중점
- `eslint.config.js` 의 ts/tsx 블록 제거 또는 `files:` 패턴 축소는 즉시 CI 실패로 귀결.
- `tsconfig.json` paths alias 변경은 런타임 번들러 (Vite resolve.alias) 와 정합 확인 필요.
- Vitest coverage include 에 `.d.ts` 포함 시 coverage 보고가 부풀어 오류 소지.
- `.ts/.tsx/.d.ts` 블록에서 vanilla `no-unused-vars` 가 재활성되거나 `@typescript-eslint/no-unused-vars` 가 제거되면 (5.1) 회귀 — TS 서명 param 오탐 재발 · disable 주석 잔존 증가.
- JS/JSX 블록의 vanilla `no-unused-vars` 설정을 `off` / level 변경 / option 변경 시 FR-04 (의미 보존) 위반.
- TS 블록을 JS/JSX 블록 **앞** 으로 이동 시 §동작 6 (last-write-wins) 위반 — `.ts/.tsx/.d.ts` 파일에서 vanilla `no-unused-vars` 가 TS 블록의 `'off'` 를 덮어써 TS 서명 param 오탐 재발 + disable 주석 재도입 압박.
- §동작 6 의 last-write-wins 의미를 다른 블록 (예: 향후 추가되는 `.test.{ts,tsx}` 전용 블록) 에 대해 "더 엄격한 레벨로 merge" 로 오인하여 블록 순서를 임의 배치할 경우, 동일 rule key 지배관계 불예측. 블록 순서 = 지배관계 계약.
- `.husky/pre-commit` 본문에 `git add -A` / `git stash -u && git stash drop` / 명시적 untracked 제거 명령이 추가되면 §동작 7.2 위반 — untracked spec 산출물이 첫 커밋 사이클에서 휘발될 수 있다. 훅 본문은 lint-staged 호출 + 읽기/검증 전용 스크립트만 허용.
- `package.json` `lint-staged` 블록에 `specs/**` glob 이 추가되면 §동작 7.1 위반 — `specs/**` lint/format 책임은 본 spec 범위 밖이며 별 도구·별 spec 후보.
- lint-staged 16.x → 17.x 등 메이저 업그레이드 시 `--hide-partially-staged` 기본값 변동이 untracked 보존 동작에 영향 줄 수 있음 — §변경 이력 ack/회귀 박제 필수 (NFR-02).

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

- **grep-baseline** (REQ-058 반영 시점, HEAD=`4af36ee` 실측 — §동작 6 박제용):
  - (k) `grep -nE "files:\s*\[" eslint.config.js` → 2 hits:
    - `eslint.config.js:35` → `files: ['src/**/*.{js,jsx,ts,tsx}'],` (JS/JSX 블록).
    - `eslint.config.js:79` → `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts'],` (TS 블록).
    JS/JSX 블록 라인 (35) < TS 블록 라인 (79) — 배열상 JS/JSX 블록이 선행, TS 블록이 후행. §동작 6.1 계약 정합 OK.
  - (l) `grep -nE "Flat-config|last occurrence|last.write.wins" eslint.config.js` → 2 hits:
    - `eslint.config.js:74` → 주석 시작 "Flat-config resolves duplicate rule keys by taking the last occurrence".
    - `eslint.config.js:75` → 주석 연속 "so this block must appear after the JS/JSX block to dominate".
    §동작 6.4 구현부 근거 정합 OK.

- **grep-baseline** (REQ-075 반영 시점, HEAD=`9e5f00a` 실측 — §동작 7 박제용):
  - (m) **[REQ-075 FR-02 lint-staged glob 한정]** `grep -nE '"specs' package.json | grep -E "lint-staged|jsx|tsx"` → **0 hit**. 현 시점 `package.json:41-43` lint-staged 블록 `"src/**/*.{js,jsx,ts,tsx,d.ts}": "eslint"` 단일 항목 — `specs/**` 미포함. §동작 7.1 계약 정합 OK.
  - (n) **[REQ-075 FR-04 훅 본문 사이드이펙트 0]** `grep -nE "git add -A|git stash" .husky/pre-commit` → **0 hit**. 현 시점 `.husky/pre-commit` 본문은 `npx lint-staged` + 조건부 `bash scripts/check-spec-coherence.sh` + 조건부 `bash scripts/check-vite-env-coherence.sh` 3 호출만 — `git add -A` / `git stash` 호출 0. §동작 7.2 계약 정합 OK.
  - (o) **[REQ-075 FR-03 재현 fixture]** 박제 위치: TSK 발행 후 `60.done/task/**/result.md` 에 (1) `specs/10.followups/<slug>.md` untracked 1건 + `src/**` staged 변경 1건 준비 → (2) `git commit` → (3) 직후 `git status --short` 가 untracked 파일을 동일 경로/내용으로 표시하는 시나리오 재현 박제. 본 spec 은 hook-ack pointer 만 박제 (planner/developer 영역 위임).
  - (p) **[lint-staged 의존성 baseline]** `grep -nE "\"lint-staged\"" package.json` → 2 hits @`:41` (블록 시작) + @ devDependencies (`"lint-staged": "^16.4.0"`). lint-staged 16.x `--hide-partially-staged` 기본 + `git stash --include-untracked` 기반 backup. NFR-02 회귀 감지 baseline.

- **rationale**: gate (a)/(c)/(d)/(e) 는 현실이 계약과 정합 (OK). gate (b) 는 lint-staged 패턴이 `.d.ts` 를 명시 포함하지 않음 — `src/**/*.{js,jsx,ts,tsx}` 는 ESLint 에 위임 시 ts/tsx 만 매치되어 `.d.ts` 파일은 staged 되어도 lint 트리거되지 않음. 본 spec 은 "포함되어야 한다" 를 불변식으로 박제하며, 실제 패턴 보강은 task 계층 (별도 task carve 대상). gate (f)/(g)/(h) 는 §동작 5 rule swap 의 **미달 baseline** — (g) 0→1 달성 후 (h) 2→0 회귀 없이 수렴하는 것이 §동작 5.1/5.2 달성 조건. gate (i)/(j) 는 §동작 5.4 (신규 dep 불요) 및 회귀 기준점. `src/Image/ImageItem.tsx:6` 우회는 REQ-053 §개요 에 직접 언급되지 않았으나 NFR-03 전 범위 (`grep -rn "eslint-disable-next-line no-unused-vars" src → 0`) 에 포함되므로 §동작 5.2 수렴 조건에 편입 — 파생 task 는 2건 모두 회수 대상.

## 테스트 현황
- [x] CI lint step 이 PR 마다 실행되어 (a)(c) 의 ts/tsx 파서 구성 회귀 시 즉시 실패.
- [x] Vitest coverage 리포트가 `.d.ts` 를 포함하지 않음을 보고서 자체 확인.
- [x] lint-staged `.d.ts` 포함 보강 (FR-01 불변식 현실 정합; TSK-20260421-64 / `dcecda0` 실현, `package.json:40` `"src/**/*.{js,jsx,ts,tsx,d.ts}"` 박제).
- [x] §동작 5.1 TS 서명 param 오탐 0: `.ts/.tsx/.d.ts` 블록에 `@typescript-eslint/no-unused-vars` 활성 + vanilla `no-unused-vars: off` 치환 후 `npm run lint` warning 0. — TSK-20260422-12 / `fddacb0` 수렴 ack (task result.md `npm run lint` exit 0 warning 0, `@typescript-eslint/no-unused-vars` @eslint.config.js:83, vanilla `no-unused-vars: 'off'` @:84).
- [x] §동작 5.2 disable 회수: `grep -rn "eslint-disable-next-line no-unused-vars" src` → 2→0. — TSK-20260422-12 / `fddacb0` 수렴 ack (실측 0 hit — `src/test-utils/msw.ts:41` + `src/Image/ImageItem.tsx:6` 외 추가 6건 [Comment/api.mock.ts:9,11,13, Comment/CommentItem.tsx:28,30, Comment/CommentForm.tsx:19] 전원 회수).
- [x] §동작 5.3 TS 의도 보존: 임시 `function foo(x: number) {}` 구문 도입 시 `@typescript-eslint/no-unused-vars` warning 1건 재현 후 삭제 (PR diff 에 남기지 않음). — TSK-20260422-12 / `fddacb0` 수렴 ack (task result.md 프로브 `src/__tsk12_probe__.ts` 로 warn 1건 재현 후 삭제, PR diff 0).
- [x] §동작 5.4 신규 dep 불요: `grep -nE "@typescript-eslint|typescript-eslint" package.json` → 1 hit 유지 (기존 `typescript-eslint` 외 신규 엔트리 0). — TSK-20260422-12 / `fddacb0` 수렴 ack (task result.md `git diff package.json tsconfig.json` 변경 없음 박제).
- [x] JS/JSX 의미 보존: `src/**/*.{js,jsx}` 블록의 vanilla `no-unused-vars` level / option (`caughtErrors: 'none'`) 무변경 — `grep -nE "'no-unused-vars'" eslint.config.js` 에서 JS 블록 rule line bit-for-bit 동일. — TSK-20260422-12 / `fddacb0` 수렴 ack (JS/JSX 블록 `'no-unused-vars': ['warn', { caughtErrors: 'none' }]` @eslint.config.js:64 유지, task result.md "JS/JSX 블록 rules 4건 bit-for-bit 보존" 박제).
- [x] (Must, REQ-075 FR-02) lint-staged glob 한정 — `grep -nE '"specs' package.json | grep -E "lint-staged|jsx|tsx"` → 0 hit. HEAD=`9e5f00a` 실측 PASS.
- [x] (Must, REQ-075 FR-04) 훅 본문 사이드이펙트 0 — `grep -nE "git add -A|git stash" .husky/pre-commit` → 0 hit. HEAD=`9e5f00a` 실측 PASS.
- [ ] (Should, REQ-075 FR-03) 재현 fixture 박제 — TSK 발행 후 `60.done/task/**/result.md` 에 untracked 보존 시나리오 (untracked 1건 + staged src 1건 → commit → 직후 untracked 잔존 확인) 재현 박제. 현재 task 미발행 — `[ ]` 유보.

## 수용 기준
- [x] (Must, FR-01) ESLint / lint-staged 대상 불변식 문장 박제.
- [x] (Must, FR-02) ambient type alias 불변식 문장 박제.
- [x] (Must, FR-03) typescript-eslint 파서 불변식 문장 박제.
- [x] (Must, FR-04) Vitest coverage 범위 불변식 문장 박제.
- [x] (Must, FR-05) §스코프 규칙 grep-baseline 에 4+ gate 실제 수치 박제 (REQ-028 시점 5 gate + REQ-053 시점 5 gate = 총 10).
- [x] (Must, FR-06) §변경 이력 에 `REQ-20260421-028` + followup 2건 경로 참조.
- [x] (Must, FR-07) inspector 세션 diff = 1파일 신규 create (REQ-028) / 1파일 edit (REQ-053).
- [x] (Must, REQ-053 FR-01) `.ts/.tsx/.d.ts` 블록에 `@typescript-eslint/no-unused-vars: ['warn', { caughtErrors: 'none' }]` + `'no-unused-vars': 'off'` 박제. — TSK-20260422-12 / `fddacb0` 수렴 ack (eslint.config.js:83 + :84 실측).
- [x] (Must, REQ-053 FR-02) `npm run lint` exit 0 + warning 0 (특히 `src/test-utils/msw.ts` 내 no-unused-vars 경고 0). — TSK-20260422-12 / `fddacb0` 수렴 ack (task result.md `npm run lint` exit 0 warning 0).
- [x] (Must, REQ-053 FR-03) `src/test-utils/msw.ts:41` + `src/Image/ImageItem.tsx:6` disable 주석 2건 회수 후 FR-02 성립. — TSK-20260422-12 / `fddacb0` 수렴 ack (8 disable 주석 전원 회수, 재현 실측 0 hit).
- [x] (Must, REQ-053 FR-04) JS/JSX 블록 (`eslint.config.js:45-77`) 4 user rule 의미 변경 0 — 기존 `.js/.jsx` lint 결과 bit-for-bit 동일. — TSK-20260422-12 / `fddacb0` 수렴 ack (task result.md JS/JSX 블록 diff 0 박제).
- [x] (Should, REQ-053 FR-05) 실제 미사용 param 이 여전히 `@typescript-eslint/no-unused-vars` 로 검출됨 (TS 의도 보존 검증). — TSK-20260422-12 / `fddacb0` 수렴 ack (task result.md 임시 프로브 warn 1건 재현 박제).
- [x] (Should, REQ-053 FR-06) pre-commit 훅 (`.husky/pre-commit`) 가 `.ts/.tsx` staged 파일에 치환된 규칙을 실제로 적용 (lint-staged 경유). — TSK-20260422-12 / `fddacb0` 수렴 ack (task result.md pre-commit lint-staged 경로 커밋 통과 박제).
- [x] (NFR, REQ-053 NFR-03) `grep -rn "eslint-disable-next-line no-unused-vars" src` → 0 hits (전 영역 회귀 방지). — TSK-20260422-12 / `fddacb0` 수렴 ack (재현 실측 0 hit).
- [x] (Must, REQ-058 FR-01) §동작 6 에 "ESLint flat-config 동일 rule key 복수 블록 선언 시 배열 마지막 블록 이김 (last-write-wins)" 불변식 문장 1+ 박제.
- [x] (Must, REQ-058 FR-02) §동작 6.1 + §회귀 중점 에 "JS/JSX 블록과 `.ts/.tsx/.d.ts` 블록이 `no-unused-vars` 동일 키 공유 시 TS 블록이 배열상 JS/JSX 블록 뒤" 계약 명시.
- [x] (Must, REQ-058 FR-03) §스코프 규칙 grep-baseline gate (k) 에 `eslint.config.js` 의 JS/JSX 블록 라인 35 < TS 블록 라인 79 수치 박제.
- [x] (Must, REQ-058 FR-04) §변경 이력 에 REQ-20260422-058 + consumed followup 경로 `specs/60.done/2026/04/22/followups/20260422-0525-flat-config-rule-merge-semantics.md` 참조 (followup 현위치는 본 세션 시점 별도 discovery 경로).
- [x] (Should, REQ-058 FR-05) §참고 에 ESLint 공식 문서 레퍼런스 URL 1건 박제 (`https://eslint.org/docs/latest/use/configure/configuration-files`).
- [x] (NFR-01, REQ-058) 문서 정확도 — §동작 6 서술이 ESLint flat-config 실제 merge semantics 와 정합. `eslint.config.js:74-76` 구현부 주석과 교차 정합.
- [x] (NFR-02, REQ-058) 시점 비의존 — §동작 6.1~6.4 모두 평서형·특정 릴리스/날짜 귀속 0. "TSK-20260422-12 단계 1 서술 오류" 같은 incident 귀속 표현 §동작 본문 0 (감사 pointer 는 §변경 이력/§참고 한정).
- [x] (Must, REQ-075 FR-01) §동작 7 에 "pre-commit lint-staged 사이클은 lint-staged glob 외 untracked 파일을 사이클 진입 전후 동일하게 보존한다" 평서문 1+ 박제 (§동작 7 헤더 + 7.3).
- [x] (Must, REQ-075 FR-02) §동작 7.1 + §스코프 규칙 grep-baseline (m) 에 "lint-staged glob 은 `src/**` 한정, `specs/**` 미포함" 계약 명시 + grep 0 hit 게이트 박제.
- [x] (Must, REQ-075 FR-04) §동작 7.2 + §스코프 규칙 grep-baseline (n) 에 "pre-commit 본문은 lint-staged 외 사이드이펙트 0" 계약 명시 + grep 0 hit 게이트 박제.
- [ ] (Should, REQ-075 FR-03) 재현 fixture (untracked 1건 + staged src 1건 → commit → untracked 잔존) — TSK 발행 후 task result.md 박제. 현재 미발행 — `[ ]` 유보.
- [ ] (Could, REQ-075 FR-05) 회귀 감지 채널 — untracked spec 산출물 휘발 재발 시 inspector §변경 이력 hook-ack 갱신. 보편 운영 계약 — 차기 이벤트 발생 후 marker 플립 누적.
- [x] (NFR-01, REQ-075) SDLC 큐 무결성 — §동작 7.3 결과 효능 박제 (untracked spec 산출물 첫 commit 사이클 통과 후 휘발 0건). discovery 입력 큐 손실 0건이 결과 효능으로 spec 박제.
- [ ] (NFR-02, REQ-075) lint-staged 메이저 업그레이드 시 §변경 이력 ack/회귀 박제 — 차기 업그레이드 이벤트 후 marker 플립. 현 시점 baseline `lint-staged@^16.4.0` 박제 (§스코프 규칙 gate (p)).
- [x] (NFR-03, REQ-075) RULE-07 정합 — §동작 7.1~7.5 모두 시점 비의존 평서문 + grep 게이트로 반복 검증 가능. TSK-20260517-05 incident 는 §개요 발견 경로로만 언급, 본문 불변식은 보편 계약.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 29d9da0 | 최초 등록 (REQ-20260421-028). 2건 blocked spec followup 의 4개 tooling 불변식을 하나의 green spec 으로 통합. consumed followups (2건): `specs/10.followups/20260421-0541-typescript-bootstrap-spec-from-blocked.md`, `specs/10.followups/20260421-0541-typescript-tooling-completion-spec-from-blocked.md`. 선행 done req (2건): `specs/60.done/2026/04/20/req/20260420-typescript-foundation-bootstrap.md` (TSK-20260420-32), `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` (TSK-20260420-33). baseline 실측: `eslint.config.js:34,7,35`, `package.json:39` (`.d.ts` 미포함 — 현실 미달), `tsconfig.json:20`, `vite.config.js:71-74`. | 신규 전 섹션 |
| 2026-04-21 | TSK-20260421-64 / dcecda0 | lint-staged 패턴 `.d.ts` 포함 보강 (FR-01 불변식 현실 정합 달성). `package.json:40` `"src/**/*.{js,jsx,ts,tsx}"` → `"src/**/*.{js,jsx,ts,tsx,d.ts}"` 단일 키 변경. DoD 게이트 재실행 시 `grep -nE "d\.ts" package.json` → 1 hit (`:40`), `lint-staged` 블록 출력 정합 OK. § 스코프 규칙 (b) "현실 미달 상태" 표현은 baseline 박제로 보존하되 본 § 테스트 현황 / § 변경 이력 에 ack 박제. | §테스트 현황 |
| 2026-04-22 | inspector / (this commit) | REQ-20260422-058 흡수 — §동작 6 "ESLint flat-config 동일 rule key last-write-wins 불변식" 신규 박제 (6.1~6.4). §역할 "6건" 으로 갱신 + out-of-scope 에 "ESLint 버전 변경 계획" · "기타 tooling merge semantics" 추가. §회귀 중점 2건 증분 (TS 블록 선행 이동 금지 · 블록 순서 = 지배관계 계약). §스코프 규칙 grep-baseline gate (k)(l) 2건 실측 수치 박제 (HEAD=`4af36ee`): (k) `grep -nE "files:\s*\[" eslint.config.js` → 2 hits @:35 (JS/JSX) + @:79 (TS) · 라인 35 < 79 계약 정합, (l) `grep -nE "Flat-config\|last occurrence\|last.write.wins" eslint.config.js` → 2 hits @:74-75 주석 근거. §수용 기준 REQ-058 FR-01~05 + NFR-01~02 총 7 항목 증분 + 즉시 `[x]` 박제 (본 세션 편집만으로 수렴). consumed req: `specs/20.req/20260422-eslint-flat-config-rule-merge-last-write-wins-invariant.md` → `60.done/2026/04/22/req/` mv. consumed followup (감사 pointer, 본 세션은 req 단독 소비): `specs/60.done/2026/04/22/followups/20260422-0525-flat-config-rule-merge-semantics.md` (source_task: TSK-20260422-12, category: doc/spec-accuracy, severity: low). 선행 task 사후 기록: `specs/60.done/2026/04/22/task/eslint-ts-no-unused-vars-swap/` (TSK-20260422-12, REQ-20260422-053). 외부 레퍼런스: ESLint 공식 "If the same rule is specified in multiple configuration objects, the later configuration object wins" (`configuration-files` 문서). REQ-058 은 TSK-20260422-12 작업 지시서 1단계 서술 "각 규칙이 더 엄격한 레벨로 merge" 가 사실 오류 였음을 followup 이 근거로 제시 (last-write-wins 실측 재현) — 본 spec 은 해당 오류를 시스템 불변식 차원 박제로 예방. 타깃 spec 은 REQ-058 원문에서 `30.spec/blue/foundation/tooling.md` 지정이나 green 이 inspector 편집 영역이므로 본 green spec 에 직접 흡수. RULE-07 자기검증 — §동작 6.1~6.4 모두 평서형·반복 검증 가능 (`grep -nE` 단일 명령 + ESLint 공식 문서 교차 정합)·시점 비의존 (ESLint v9+ flat-config 전반에 적용)·incident patch 아님 (merge semantics 는 ESLint 런타임 자체 성질, 특정 릴리스 귀속 부재)·수단 중립 (블록 순서 표현 방식 특정 안 함, JS/JSX 블록을 앞에 두는 것이 지배관계 표현이라는 "계약" 만 박제). RULE-06 §스코프 규칙 gate (k)(l) 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/**`) 편집만 + `20.req/* → 60.done/req/` mv. RULE-02 단일 커밋. | 헤더 · §역할 · §동작 6 · §회귀 중점 · §스코프 규칙 · §수용 기준 · §변경 이력 · §참고 |
| 2026-04-22 | inspector / (this commit) | Phase 1 drift reconcile — REQ-053 FR-01~06 + NFR-03 + §동작 5.1~5.4 + JS/JSX 의미 보존 총 7 WIP [ ]→[x] 플립. ack 근거: TSK-20260422-12 @`fddacb0` (현 HEAD=`4af36ee` 조상). 재게이트 실측 @HEAD=`4af36ee`: `grep -nE "@typescript-eslint/no-unused-vars" eslint.config.js` → 1 hit @:83 · `grep -nE "'no-unused-vars'" eslint.config.js` → 2 hits (@:64 JS/JSX vanilla `['warn', { caughtErrors: 'none' }]` + @:84 TS 블록 `'off'`) · `grep -rn "eslint-disable-next-line no-unused-vars" src` → 0 hits (NFR-03 수렴) · task result.md 박제 (`npm run lint` exit 0 warning 0 / `npm test` 48 files 439 PASS / `npm run build` exit 0 / 임시 프로브 warn 1건 재현 후 삭제 / JS/JSX 블록 rules 4건 bit-for-bit 보존 / `git diff package.json tsconfig.json` 0). FR-05/FR-06 Should 항목 hook-ack: FR-05 는 task result.md §테스트 결과 "spec 지시 2 (TS 의도 보존 검증)" 박제, FR-06 는 task result.md "pre-commit lint-staged 동작" 박제 (커밋 훅 통과로 확인). scope 준수: 본 세션 diff = 본 green spec §테스트 현황 7건 ack 박제 + §수용 기준 7건 ack 박제 + §변경 이력 라인 1건 증분 + `20.req/* → 60.done/req/` mv + `.inspector-seen` 갱신. `src/**` · `eslint.config.js` · `package.json` · `tsconfig.json` · `.husky/**` · `.github/workflows/**` 변경 0. RULE-07 정합 — 불변식 본문 (§동작 1~5) 수정 없음, §테스트 현황 / §수용 기준 박제 전환과 §변경 이력 감사 pointer 추가만. | §테스트 현황, §수용 기준, §변경 이력 |
| 2026-04-22 | inspector / 1addbfe | REQ-20260422-053 흡수 — **blue → green 복사 후 편집**. §동작 5 "`.ts/.tsx/.d.ts` `no-unused-vars` rule swap 불변식" 신규 박제 (5.1~5.4). 스코프 규칙에 REQ-053 baseline gate (f)~(j) 실측 수치 추가 (HEAD=ab88167): `eslint.config.js:70,74` vanilla rule 2 hit, `@typescript-eslint/no-unused-vars` 0 hit, 우회 주석 `src/test-utils/msw.ts:41` + `src/Image/ImageItem.tsx:6` 2건, `package.json:60` `typescript-eslint@^8.58.2` 기 설치, `npm run lint` exit 0. §테스트 현황 / §수용 기준 에 REQ-053 FR-01~06 · NFR-03 체크항목 추가. 관련 계약: `src-typescript-migration.md` FR-05 island 전환 맥락. consumed followup: `specs/10.followups/20260422-0057-eslint-no-unused-vars-ts-method-signature.md` (source: TSK-20260422-02). 선행 done req: `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` FR-09 "규칙 세트 미적용" 결정을 **한 규칙 한정 치환** 으로 범위 제한 완화. RULE-07 자기검증 — 5.1~5.4 모두 평서형·반복 검증 가능 (`npm run lint` · `grep`)·시점 비의존·incident 귀속 부재. RULE-06 §스코프 규칙 gate (f)~(j) 5건 실측 박제. RULE-01 inspector writer 영역만 (green tooling.md edit). | §제목, §역할, §동작 5, §회귀 중점, §스코프 규칙, §테스트 현황, §수용 기준, §참고 |
| 2026-05-17 | inspector / REQ-20260517-075 (HEAD=`9e5f00a`) | REQ-075 흡수 — **blue `foundation/tooling.md` → green 복사 후 편집**. §동작 7 "pre-commit lint-staged 사이클의 untracked 보존 + 훅 본문 사이드이펙트 0 불변식" 신규 박제 (7.1~7.5). §역할 "7건" 으로 갱신 + out-of-scope 3건 추가 (lint-staged 내부 stash 패치 / `specs/**` 별도 lint 게이트 / husky·lint-staged major 업그레이드). §회귀 중점 3건 증분 (훅 본문 사이드이펙트 / lint-staged glob `specs/**` 진입 / lint-staged 메이저 업그레이드). §스코프 규칙 grep-baseline gate (m)(n)(o)(p) 4건 실측 박제 (HEAD=`9e5f00a`): (m) `grep -nE '"specs' package.json | grep -E "lint-staged|jsx|tsx"` → 0 hit, (n) `grep -nE "git add -A|git stash" .husky/pre-commit` → 0 hit, (o) 재현 fixture hook-ack pointer, (p) `lint-staged@^16.4.0` baseline. §테스트 현황 3 marker + §수용 기준 8 marker (FR-01~05 + NFR-01~03) 증분 — FR-01/02/04 + NFR-01/03 즉시 `[x]`, FR-03/05 + NFR-02 는 task 발행/이벤트 대기로 `[ ]` 유보. 위치 변경: 헤더 §위치 에 `.husky/pre-commit` 추가, §관련 요구사항 에 REQ-20260517-075 추가, §최종 업데이트 갱신. consumed: REQ-20260517-075. consumed followup (감사 pointer): `specs/10.followups/20260517-0308-dev-env-deps-not-installed.md:34` (§행동 제안 4) + `specs/10.followups/20260517-0308-restore-deleted-specs.md:30-31` (§비고) — 두 followup 의 신규 차분 흡수. RULE-07 자기검증 — §동작 7.1~7.5 모두 평서형·반복 검증 가능 (`grep -nE` 단일 명령 + `git status --short` 재현)·시점 비의존·incident 귀속 부재 (TSK-20260517-05 incident 는 req §개요 발견 경로만 언급, 본문 불변식은 보편 계약)·수단 중립 (lint-staged 내부 stash 경로 / 등가 메커니즘 어느 쪽이든 수용). RULE-06 §스코프 규칙 gate (m)(n) 0 hit 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/tooling.md` edit, blue 직접 편집 불가로 green carry-over 경로). | 헤더 · §역할 · §동작 7 · §회귀 중점 · §스코프 규칙 · §테스트 현황 · §수용 기준 · 본 이력 · §참고 |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/04/21/req/20260421-typescript-foundation-tooling-spec-consolidation.md` (REQ-028).
  - `specs/60.done/2026/04/22/req/20260422-eslint-no-unused-vars-typescript-eslint-rule-swap.md` (REQ-053).
  - `specs/60.done/2026/04/22/req/20260422-eslint-flat-config-rule-merge-last-write-wins-invariant.md` (REQ-058 — 본 세션 mv).
  - `specs/60.done/2026/05/17/req/20260517-lint-staged-untracked-preservation.md` (REQ-075 — 본 세션 mv).
- **Consumed followups**:
  - `specs/10.followups/20260421-0541-typescript-bootstrap-spec-from-blocked.md` (REQ-028).
  - `specs/10.followups/20260421-0541-typescript-tooling-completion-spec-from-blocked.md` (REQ-028).
  - `specs/10.followups/20260422-0057-eslint-no-unused-vars-ts-method-signature.md` (REQ-053, source: TSK-20260422-02).
  - `specs/60.done/2026/04/22/followups/20260422-0525-flat-config-rule-merge-semantics.md` (REQ-058, source: TSK-20260422-12, category: doc/spec-accuracy, severity: low).
- **선행 done req**:
  - `specs/60.done/2026/04/20/req/20260420-typescript-foundation-bootstrap.md`.
  - `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` (FR-09 "규칙 세트 미적용" — REQ-053 로 **한 규칙 한정 치환** 범위 완화).
- **관련 spec**:
  - `specs/30.spec/green/foundation/ci.md` (REQ-023 CI foundation — 동일 디렉터리 별 파일).
  - `specs/30.spec/green/foundation/src-typescript-migration.md` (REQ-051 FR-05 — `.ts/.tsx` island 전환 축. §동작 5 rule swap 은 island 확장 시 disable 주석 반복 삽입 필요성 제거).
  - `specs/30.spec/green/foundation/tsconfig-test-ambient-globals.md` (REQ-052 — tsc 타입 인식 경로 독립 축; 본 spec §동작 5 는 ESLint 경로이므로 직교).
- **외부 레퍼런스**:
  - ESLint 공식 — "If the same rule is specified in multiple configuration objects, the later configuration object wins." (`https://eslint.org/docs/latest/use/configure/configuration-files`). §동작 6 last-write-wins 불변식 외부 근거.
- **RULE 준수**:
  - RULE-07: 6개 불변식 (REQ-028 4개 + REQ-053 1개 + REQ-058 1개) 모두 시점 비의존·평서형·반복 검증 가능 (`eslint`·`grep`·`npm run lint` 재현).
  - RULE-06: grep-baseline 12개 gate (REQ-028 시점 5 + REQ-053 시점 5 + REQ-058 시점 2) 실측 수치 박제.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/tooling.md` edit).
