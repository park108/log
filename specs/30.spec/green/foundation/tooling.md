# TypeScript foundation / tooling — ESLint / lint-staged / ambient alias / Vitest coverage / no-unused-vars rule swap 불변식

> **위치**: `eslint.config.js`, `package.json` (lint-staged), `tsconfig.json` (paths), `vite.config.js` (vitest coverage), `.husky/pre-commit` (lint-staged 진입점).
> **관련 요구사항**: REQ-20260421-028, REQ-20260422-053, REQ-20260422-058, REQ-20260517-075, REQ-20260517-078, REQ-20260517-095, REQ-20260518-013
> **최종 업데이트**: 2026-05-18 (by inspector, REQ-013 FR-01~07 흡수 — §동작 9 신규 박제 (eslint.config.js:15 `ignores` 5 패턴 vacuous-zero 결과 효능 axis), 85차 tick)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-028 초기 HEAD=29d9da0 · REQ-053 반영 HEAD=ab88167 · REQ-058 반영 HEAD=4af36ee · REQ-075 반영 HEAD=`9e5f00a` · REQ-078 반영 HEAD=`79d28cc` · REQ-095 반영 HEAD=`e19d870`).

## 역할
TypeScript 도입 후 유지되는 **tooling 계약 불변식** 9건을 박제. ESLint/lint-staged 대상, ambient type alias, typescript-eslint 파서, Vitest coverage 범위, `.ts/.tsx/.d.ts` 블록의 `no-unused-vars` rule swap (vanilla off · `@typescript-eslint/no-unused-vars` warn), ESLint flat-config 동일 rule key last-write-wins merge semantics, pre-commit lint-staged 사이클의 untracked spec 산출물 보존 (lint-staged glob 한정 + 훅 본문 사이드이펙트 0), lint-staged backup/restore 사이클의 cross-writer stage-back 차단 (unstage 보존 + glob 외 자동 승격 0), `eslint.config.js:15` flat-config `ignores` 5 패턴 ↔ repo root 트리 매치 cardinality vacuous-zero 결과 효능 (각 박제 패턴 hit ≥ 1). 의도적으로 하지 않는 것: TypeScript 소스 재구조화 (done 배치), CI workflow 정의 (REQ-023), 런타임 env/테스트 이디엄 (REQ-021/022), typescript-eslint `recommended` 규칙 세트 전면 도입 (REQ-053 명시 out-of-scope — 본 spec 은 **한 규칙 한정 치환** 만 박제), ESLint 버전 다운그레이드/업그레이드 계획 (REQ-058 out-of-scope), 기타 tooling 의 merge semantics (lint-staged · Vite 등 REQ-058 out-of-scope), lint-staged 라이브러리 내부 stash 로직 패치 (REQ-075 + REQ-095 out-of-scope), `specs/**` 에 대한 별도 lint/format 게이트 도입 (REQ-075 out-of-scope, 별 req 후보), husky / lint-staged major 버전 업그레이드 계획 (REQ-075 out-of-scope), `.husky/pre-commit` 본문에 cross-writer 차단 가드 스크립트 추가 (REQ-095 out-of-scope — 본 spec 은 시스템 계약 박제, 가드 구현은 task 계층 별도 carve), `eslint.config.js:15` 의 `ignores` **이외 영역** (`files:` 패턴 / `rules:` 본문 / `linterOptions:` / `languageOptions.globals:` — REQ-013 out-of-scope, 별 req 신호 시 분리), vacuous 발생 시 해소 수단 (패턴 제거 vs 패턴 정정 vs 실재 경로 도입 — REQ-013 out-of-scope, planner 영역 위임), 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `package.json` `check:eslint-ignores-vacuous-zero` script 선정 — REQ-013 out-of-scope, 수단 영역).

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
- (7.3) **untracked 보존 결과 효능 (FR-01)**: `git status --short` 가 `??` 로 표시하는 untracked 파일이 존재하는 상태에서 `git add <staged-target>` → `git commit` 시, commit 사이클 전후 동일한 `??` 파일이 동일 경로/내용으로 잔존한다. 단, `??` 표시 발생 자체는 fixture 파일이 **`.gitignore` 미매칭 경로** 에 배치된 경우에 한정 — 예: `specs/30.spec/green/foundation/<probe>` (tracked 디렉터리 안 untracked 파일) 은 적합, `specs/10.followups/<probe>` 는 `.gitignore:28` (`specs/10.followups` 매칭) 으로 git 시야 밖이라 `??` 노출 자체가 발생하지 않아 본 효능 측정 사이트로 부적합 (REQ-20260517-078 FR-01·FR-02). 본 불변식의 의도 (lint-staged 사이클 외 untracked 산출물 보존) 자체는 `.gitignore` 미매칭/매칭 무관하게 성립하나, 효능 **측정 fixture 의 재현 사이트** 는 `.gitignore` 미매칭 위치여야 한다.
- (7.4) **회귀 감지 채널 (FR-05 Could)**: 본 불변식 위반이 재발하면 (untracked spec 산출물 휘발), discovery 가 followups 재수신 후 본 spec §변경 이력에 hook-ack 갱신으로 회귀 박제. lint-staged 16.x → 17.x 등 메이저 업그레이드 시 (NFR-02) 본 spec 의 §변경 이력에 ack/회귀 박제 필수.
- (7.5) **수단 중립**: 본 불변식의 결과 보장은 (a) lint-staged `--hide-partially-staged` 기본 + `git stash --include-untracked` 경로, (b) 향후 lint-staged 옵션 변경 또는 패키지 매니저 전환 후의 등가 메커니즘 어느 쪽이든 수용. 본 spec 은 결과 효능 (untracked 보존) 만 계약하며 lint-staged 내부 구현 경로는 강제하지 않는다.

### 8. lint-staged backup/restore 사이클의 cross-writer stage-back 차단 + glob 외 자동 승격 0 불변식 (REQ-095 FR-01·FR-02)
`.husky/pre-commit` 의 `npx lint-staged` 호출이 내부 backup/restore 사이클을 수행할 때, **사이클 진입 직전 staged 영역에 존재하지 않은 working-tree 변경 (cross-writer 영역 포함) 은 사이클 종료 시점에도 staged 영역으로 자동 승격되지 않는다**. 본 불변식은 §동작 7 의 untracked 보존 계약과 직교 — untracked drop 방지 (§동작 7) vs unstage 보존 (§동작 8). 본 불변식의 결과:

- (8.1) **cross-writer stage-back 차단 계약 (FR-01)**: `git reset HEAD -- <cross-writer-path>` 로 unstage 한 working-tree 변경은 동일 `git commit` 의 결과 (`git log -1 --name-only HEAD`) 에 포함되지 않는다. 즉 RULE-02 §커밋 의 "자기 writer 영역 밖 staged 항목은 unstage" 행동 규약의 효과가 lint-staged 사이클 경유에도 보존된다.
- (8.2) **glob 외 자동 승격 0 계약 (FR-02)**: `npx lint-staged` 호출은 `package.json` `lint-staged` 블록 glob (`src/**/*.{js,jsx,ts,tsx,d.ts}`) 매칭 staged 파일의 lint/format 만 책임지며, glob 외 working-tree 변경 (특히 `specs/30.spec/green/.planner-seen`, `specs/30.spec/green/.inspector-seen` 등 cross-writer marker) 을 `git add` 또는 동등 명령으로 staged 영역에 자동 승격하지 않는다.
- (8.3) **§동작 7 와의 surface 분리**: §동작 7 (REQ-075) 는 **untracked 파일** (`??` 표시) 이 backup/restore 사이클을 통과해 사라지지 않아야 함을 박제 (drop 방지). §동작 8 (REQ-095) 는 **unstaged 파일** (`!! M` 또는 ` M` 표시 — working-tree 만 변경) 이 동일 사이클을 통과해 자동 staged 되지 않아야 함을 박제 (stage-back 방지). 두 계약은 lint-staged 사이클의 양방향 무결성 (input 보존 + output 무침범) 을 각각 보장.
- (8.4) **SDLC writer 무결성 효능 (NFR-01)**: 본 불변식 충족 시 cross-writer marker (`.planner-seen`, `.inspector-seen`) 의 git history author 가 자기 writer (planner / inspector) commit 만 포함하며 developer commit (`fix:` / `feat:` / `chore:` 등) 부재. RULE-01 writer 매트릭스의 도구 측 토대.
- (8.5) **수단 중립**: 본 불변식의 결과 보장은 (a) lint-staged 의 `git stash --include-untracked` + `git stash pop` 경로의 working-tree restore 시점에 unstaged 변경을 staged 로 끌어올리지 않는 동작, (b) 향후 lint-staged 옵션 변경 또는 패키지 매니저 전환 후의 등가 메커니즘 어느 쪽이든 수용. 본 spec 은 결과 효능 (unstage 보존) 만 계약.

### 9. `eslint.config.js:15` flat-config `ignores` 5 패턴 vacuous-zero 결과 효능 불변식 (REQ-013 FR-01~07)
`eslint.config.js:15` 의 flat-config `ignores` 배열은 **5 종 glob 패턴** 으로 ESLint scan 대상에서 제외할 경로 집합을 박제한다 — `'build/**'` (P-1, build 산출물), `'coverage/**'` (P-2, vitest coverage 산출물), `'node_modules/**'` (P-3, deps), `'**/__test__/*.js'` (P-4, 단수형 `__test__` 하위 `.js`), `'**/api.js'` (P-5, `api.js` 파일). 각 박제 패턴은 그 자체가 박제된 명목 (= "이 경로는 ESLint scan 에서 제외한다") 과 repo root 트리에서 매치되는 경로 집합 (= 명목이 가리키는 실재 구현) 사이에 **양면 정합 (vacuous-zero) 결과 효능** 을 요한다 — 박제된 패턴 중 어느 하나라도 매치 cardinality = 0 으로 떨어지면 (i) 진단 명목으로는 박제되어 있으나 실재 구현 0 표면 = 명목 ↔ 실재 격차, (ii) 신규 기여자/agent 가 그 패턴을 보고 같은 종류 경로 도입 가능성 미박제, (iii) `npm run lint` 의 ignore 적용 결정론에 미세 균열 (vacuous ignore 가 lint scope 회귀 시 회귀 신호 산란). 본 불변식의 결과:

- (9.1) **5 패턴 박제 cardinality 계약 (FR-01)**: `eslint.config.js:15` 의 `ignores` 배열 길이는 **5** 이다. 배열 길이 변경 (4 또는 6+) 은 본 spec 갱신 신호 — 패턴 추가/제거 시 §변경 이력 ack 박제 필수. 본 5 패턴 의미 분리 (P-1 build / P-2 coverage / P-3 deps / P-4 `__test__` `.js` / P-5 `api.js`) 는 평서문에 박제되되 어느 패턴의 우선순위/대표성 라벨 ("기본 ignore 패턴" / "권장" 등) 박제 0.
- (9.2) **각 패턴 hit ≥ 1 결과 효능 계약 (FR-02~FR-06)**: 5 박제 패턴 각각이 HEAD 의 repo root 트리에서 매치 hit ≥ 1 (vacuous-zero 만족) 결과 효능. baseline HEAD `e8af0fd` 실측: P-1=1 (`./build`), P-2=1 (`./coverage`), P-3=1 (`./node_modules`), **P-4=0 (vacuous, FAIL — 실재는 `./src/__tests__/*.ts` 복수형 + `.ts`)**, P-5=2 (`./src/Monitor/api.js`, `./src/Log/api.js`). **5/5 axis 중 P-4 1 FAIL baseline 박제** — 본 §동작 9 박제 시점에 이미 위반 상태, 해소 수단 (패턴 제거 vs 패턴 정정 vs 실재 경로 도입) 은 planner 영역.
- (9.3) **자동 검출 채널 계약 (FR-07)**: (9.1)(9.2) 6 조건의 회귀는 자동 검출 채널 (단위 테스트 + glob 매처 또는 `find` + cardinality count fixture 또는 동등) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `package.json` `check:eslint-ignores-vacuous-zero` script) 선정은 수단 영역 — "발화 채널이 존재해야 한다" 는 계약 자체는 박제. 본 spec 박제 시점 발화 채널 부재는 후속 task carve 대상 (planner 영역).
- (9.4) **자체 진단 scope 분리 계약**: 본 게이트의 측정 scope 는 `eslint.config.js` + repo root 디렉터리 (`./build`, `./coverage`, `./node_modules` 등 maxdepth=2) + `src/**` 한정. **specs/** 및 본 req·spec 본문 내 `__test__`, `api.js`, `build/`, `coverage/`, `node_modules/` 문자열 occurrence 는 FR-02~FR-06 의 repo root 트리 매치 cardinality 와 독립** — 게이트 자기 참조 circularity 회피. 본 spec 본문이 `**/__test__/*.js` 라는 패턴 토큰을 인용한다고 해서 P-4 hit 가 증가하지 않는다 (specs/** 는 measure scope 외).
- (9.5) **수단 중립**: vacuous 발생 시 해소 수단 — (a) 해당 패턴 자체 제거 (실재 의도 부재 시), (b) 패턴 정정 (예: `**/__test__/*.js` → `**/__tests__/**` 으로 실재 디렉터리/확장자 정합), (c) 신규 실재 경로 도입 (의도 명확 시) — 어느 쪽이든 수용. 본 spec 은 결과 효능 (각 박제 패턴 hit ≥ 1) 만 계약하며 해소 수단 선택은 강제하지 않는다 (planner/discovery 영역). 또한 새 build/coverage 산출 디렉터리 (예: `./dist`, `./out`) 가 P-1 패턴 (`build/**` 고정 박제) 에 매치되지 않는 역축은 본 §동작 9 scope 외 — 본 §동작 9 는 박제된 패턴의 vacuous-zero 한정.

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
- §동작 7.3 효능 측정 fixture 가 `.gitignore` 매칭 경로 (예: `specs/10.followups/`) 에 배치되면 `??` 노출 자체가 발생하지 않아 fixture 가 trivial 0-line 으로 수렴 — 효능 측정 무력화. fixture 도입 PR 의 task §검증/DoD 에 `grep -nE "^<fixture-path-prefix>" .gitignore` → 0 hit 사전 점검 게이트 박제 필수 (REQ-078 FR-04).
- developer 가 `git reset HEAD -- <cross-writer-path>` 로 unstage 한 working-tree 변경이 동일 `git commit` 결과에 자동 stage-back 되면 §동작 8.1 위반 — cross-writer marker (`.planner-seen` / `.inspector-seen` / 향후 cross-writer 산출물 일반) 의 git history author 비정합 발생 → SDLC writer 무결성 (NFR-01) 침해. 재발 시 followup 발행 + 본 §변경 이력 ack 박제 (RULE-04 hook-ack 절차).
- `.husky/pre-commit` 본문에 `git add -A` / `git add .` / `git stash drop` / `git stash pop` 등 staged 영역 직접 변경 명령이 추가되면 §동작 8.2 위반 — lint-staged 위임 외 사이드이펙트 도입은 backup/restore 사이클의 무결성 보증 surface 를 무력화. 훅 본문은 lint-staged 호출 + 읽기/검증 전용 스크립트만 허용 (§동작 7.2 와 동등).
- `eslint.config.js:15` 의 `ignores` 배열 길이가 5 가 아닌 값 (4 또는 6+) 으로 변경되면 §동작 9.1 위반 — 5 패턴 박제 계약 무효화, §변경 이력 ack 박제 없이 패턴 추가/제거 금지.
- `eslint.config.js:15` 박제된 5 패턴 중 어느 하나라도 repo root 트리 매치 cardinality = 0 으로 떨어지면 §동작 9.2 위반 — 명목 ↔ 실재 격차 발생. baseline HEAD `e8af0fd` 에서 이미 P-4 (`**/__test__/*.js`) vacuous (hit 0) 잔존 — 해소 수단 (패턴 제거/정정/실재 경로 도입) 은 planner 영역 task carve 대기, §변경 이력 hook-ack 박제 시점에 surface 갱신.
- `eslint.config.js:15` 의 `ignores` 외 영역 (`files:` 패턴 / `rules:` 본문 / `linterOptions:` / `languageOptions.globals:`) 에 vacuous-zero axis 가 신규 도입되어도 §동작 9 의 scope (ignores 5 패턴 한정) 에 자동 편입 금지 — 별 req 신호 시 분리 carve 대상.
- vite `build.outDir` 가 `'dist'` 로 swap 후 `./build` 디렉터리 정리 (R-1) / coverage 산출 위치 변경 (R-2) / `node_modules` 위치 변경 (R-3) / `api.js` → `api.ts` 전면 swap (R-5) 시 각각 P-1 / P-2 / P-3 / P-5 vacuous 진입 — §동작 9.2 위반, 1 PR 안에 패턴 정정 (또는 제거 + §동작 9.1 갱신) 동반 박제 필수.

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

- **grep-baseline** (REQ-078 반영 시점, HEAD=`79d28cc` 실측 — §동작 7.3 보강 박제용):
  - (q) **[REQ-078 FR-01·FR-02 자기 모순 해소 정합]** `grep -nE "specs/10\.followups" specs/30.spec/green/foundation/tooling.md` ↔ `grep -nE "^specs/10\.followups" .gitignore` 1-1 정합 점검:
    - 전자 (spec 내 `specs/10.followups` 언급): 본 보강 후 §동작 7.3 평서문에 `.gitignore:28` 매칭 단서 + 효능 측정 사이트 부적합 사유 박제 — 자기 모순 해소.
    - 후자 (`.gitignore` 의 `specs/10.followups` 매칭): 1 hit @`.gitignore:28` (실측 `grep -nE "^specs/10\.followups" .gitignore` → `28:specs/10.followups`).
    의미: §동작 7.3 평서문이 `.gitignore` 매칭 예시를 인용하면서도 효능 측정 부적합 사유를 명시 — fixture 재현 시점 모호성 해소 (REQ-078 NFR-02 자기 모순 해소 정합).
  - (r) **[REQ-078 FR-04 fixture 경로 sanity 게이트]** fixture probe 도입 PR 의 task §검증/DoD 에 `grep -nE "^<fixture-path-prefix>" .gitignore` → 0 hit 게이트 박제 필수. 현 시점 적용 사례: TSK-20260517-10 result.md Step 1 박제 — fixture 경로 `specs/30.spec/green/foundation/<probe>` 가 `.gitignore` 미매칭 (`grep -nE "^specs/30\.spec" .gitignore` → 0 hit) 사후 검증 박제. 차기 fixture 도입 task 부터는 사전 점검으로 박제.
  - (s) **[REQ-078 FR-05 수단 라벨 0]** `sed -n '54p;68p;111,118p' specs/30.spec/green/foundation/tooling.md | grep -E "기본값|권장|우선|default|best practice"` → 0 hit (본 보강 영역 한정 — §동작 7.3 + §회귀 중점 신규 1줄 + §스코프 규칙 gate (q)(r)(s)). 본 보강은 효능 조건만 평서화, 수단 라벨 박제 0.

- **grep-baseline** (REQ-095 반영 시점, HEAD=`e19d870` 실측 — §동작 8 박제용):
  - (t) **[REQ-095 FR-02 lint-staged glob 한정 재확인]** `grep -nE "lint-staged" package.json` → 2 hits @`:41` (블록 시작) + @ devDependencies. 실측 lint-staged 블록 패턴: `"src/**/*.{js,jsx,ts,tsx,d.ts}": "eslint"` — `src/**` 한정, cross-writer marker 경로 (`specs/30.spec/green/.planner-seen` 등) 미매칭. §동작 8.2 계약 정합 OK.
  - (u) **[REQ-095 FR-04 훅 본문 사이드이펙트 0 재확인]** `grep -nE "git add -A|git add \.|git stash drop|git stash pop" .husky/pre-commit` → **0 hit** (HEAD=`e19d870` 실측 PASS — `.husky/pre-commit` 본문은 `npx lint-staged` + 조건부 `bash scripts/check-spec-coherence.sh` + 조건부 `bash scripts/check-vite-env-coherence.sh` 3 호출만, staged 영역 직접 변경 명령 0). §동작 8.2 + §동작 7.2 계약 정합 OK.
  - (v) **[REQ-095 NFR-01 cross-writer marker author 정합]** `git log --pretty=format:"%H %an %s" --since="2026-05-17" -- specs/30.spec/green/.planner-seen specs/30.spec/green/.inspector-seen` → 본 spec 박제 시점 cross-writer 침범 incident 1건 노출 (commit `7b15126` `fix: FileUpload setTimeout cleanup 불변식 회복` — `.planner-seen +73 insertions` developer commit 침범, `.inspector-seen` 비침범). 본 §동작 8 박제 후 cycle 부터는 developer commit prefix (`fix:`/`feat:`/`chore:`) 부재 검증 채널로 운영 (회귀 감지 baseline). 1건 incident 는 §변경 이력 hook-ack 박제로 surface (RULE-04 보고 절차) — 본 spec 박제 자체가 회귀 0 보장 surface (lint-staged 라이브러리 내부 stash 사이클 비결정성 노출 단서).
  - (w) **[REQ-095 RULE-07 수단 라벨 0]** `awk '/^### 8\./,/^### 회귀 중점/' specs/30.spec/green/foundation/tooling.md | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (HEAD=`e19d870` 실측 PASS — §동작 8.1~8.5 본문에 stage-back 차단 수단 (a) 사이클 내부 patch (b) 훅 본문 추가 가드 (c) 외부 wrapper 등 후보 라벨 부여 0).

- **grep-baseline** (REQ-013 반영 시점, HEAD=`e8af0fd` 실측 — §동작 9 박제용):
  - (x) **[REQ-013 FR-01 ignores 배열 길이 5 박제]** `grep -nE "^\s*\{\s*ignores:" eslint.config.js` → **1 hit** @`:15` (`{ ignores: ['build/**', 'coverage/**', 'node_modules/**', '**/__test__/*.js', '**/api.js'] }` — 단일 라인 5 entries). 배열 길이 5 == FR-01 계약 정합 OK.
  - (y) **[REQ-013 FR-02~FR-06 5 패턴 cardinality]** 각 P 패턴별 repo root 트리 매치 실측 (HEAD=`e8af0fd`):
    - (y-1) **P-1** `find . -maxdepth 2 -type d -name "build"` → **1 hit** (`./build`) — FR-02 PASS.
    - (y-2) **P-2** `find . -maxdepth 2 -type d -name "coverage"` → **1 hit** (`./coverage`) — FR-03 PASS.
    - (y-3) **P-3** `find . -maxdepth 2 -type d -name "node_modules"` → **1 hit** (`./node_modules`) — FR-04 PASS.
    - (y-4) **P-4** `find . -type f -path "*/__test__/*.js" -not -path "./node_modules/*"` → **0 hit** — FR-05 **FAIL (vacuous baseline)**. 실재 디렉터리는 `./src/__tests__` (복수형 `s` 트레일링) + 확장자 `.ts` (`meta-description-token-coherence.test.ts`, `csp-meta-build-artifact-preservation.test.ts`, `mount-id-token-coherence.test.ts`, `public-asset-reference-coherence.test.ts`). 해소 수단은 planner 영역 task carve 대기.
    - (y-5) **P-5** `find ./src -type f -name "api.js"` → **2 hits** (`./src/Monitor/api.js`, `./src/Log/api.js`) — FR-06 PASS.
    - 종합: 5/5 axis 중 4 PASS / **1 FAIL (P-4 vacuous)**.
  - (z) **[REQ-013 NFR-04 자체 진단 scope 분리 + FR-07 수단 라벨 0]** `awk '/^### 9\./,/^### 회귀 중점/' specs/30.spec/green/foundation/tooling.md | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (HEAD=`e8af0fd` 실측 PASS — §동작 9.1~9.5 본문에 vacuous 해소 수단 후보 (a)(b)(c) 라벨 0 + 발화 채널 후보 (pre-commit / pre-push / CI / `check:eslint-ignores-vacuous-zero` script) 의 우선순위 0 + 5 패턴 의미 분리 표현에 "대표성" 라벨 0).

- **rationale**: gate (a)/(c)/(d)/(e) 는 현실이 계약과 정합 (OK). gate (b) 는 lint-staged 패턴이 `.d.ts` 를 명시 포함하지 않음 — `src/**/*.{js,jsx,ts,tsx}` 는 ESLint 에 위임 시 ts/tsx 만 매치되어 `.d.ts` 파일은 staged 되어도 lint 트리거되지 않음. 본 spec 은 "포함되어야 한다" 를 불변식으로 박제하며, 실제 패턴 보강은 task 계층 (별도 task carve 대상). gate (f)/(g)/(h) 는 §동작 5 rule swap 의 **미달 baseline** — (g) 0→1 달성 후 (h) 2→0 회귀 없이 수렴하는 것이 §동작 5.1/5.2 달성 조건. gate (i)/(j) 는 §동작 5.4 (신규 dep 불요) 및 회귀 기준점. `src/Image/ImageItem.tsx:6` 우회는 REQ-053 §개요 에 직접 언급되지 않았으나 NFR-03 전 범위 (`grep -rn "eslint-disable-next-line no-unused-vars" src → 0`) 에 포함되므로 §동작 5.2 수렴 조건에 편입 — 파생 task 는 2건 모두 회수 대상. gate (x)/(y)/(z) 는 §동작 9 vacuous-zero axis 의 **부분 미달 baseline** — gate (y-4) P-4 vacuous (hit 0) 잔존이 §동작 9.2 FR-05 위반 baseline 박제, 해소 수단 선택 (패턴 제거 vs `**/__tests__/**` 정정 vs 신규 경로 도입) 은 planner 영역 task carve 대기. 본 spec 박제 자체는 inspector 영역 — 위반 baseline 의 평서화 + 자동 검출 채널 계약 박제 + 해소 후 PASS 수렴 가능성 surface 만 제공.

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
- [x] (Should, REQ-075 FR-03) 재현 fixture 박제 — TSK-20260517-10 / `94f362a` (revert `ca5035c`) 수렴 ack (`60.done/2026/05/17/task/lint-staged-untracked-preserve-fixture/result.md` Step 1~5 박제: 사이클 진입 전 `git status --short` 2 line / pre-commit 3 호출 PASS / 사이클 후 `??` 잔존 1 line + `git log -1 --stat` `src/common/common.ts` 1 file 1 insertion only — untracked spec 산출물 휘발 0).
- [x] (Must, REQ-095 FR-02) lint-staged glob 외 cross-writer 경로 미매칭 — `grep -nE "lint-staged" package.json` 블록 패턴 `"src/**/*.{js,jsx,ts,tsx,d.ts}": "eslint"` (HEAD=`e19d870` 실측, §스코프 규칙 gate (t) PASS).
- [x] (Must, REQ-095 FR-04) 훅 본문 staged 영역 직접 변경 명령 0 — `grep -nE "git add -A|git add \.|git stash drop|git stash pop" .husky/pre-commit` → 0 hit (HEAD=`e19d870` 실측, §스코프 규칙 gate (u) PASS).
- [ ] (Should, REQ-095 FR-03) cross-writer stage-back 차단 재현 fixture 박제 — `60.done/task/**/result.md` 1회 박제 후 spec 본문은 pointer 인용 위임 (TSK 발행 + 회수 시점 hook-ack). 본 spec §변경 이력 hook-ack 박제 마커.
- [x] (Must, REQ-013 FR-01) `eslint.config.js:15` `ignores` 배열 길이 5 박제 — `grep -nE "^\s*\{\s*ignores:" eslint.config.js` 1 hit @`:15` (5 entries). HEAD=`e8af0fd` 실측 PASS (§스코프 규칙 gate (x)).
- [x] (Must, REQ-013 FR-02) P-1 `'build/**'` hit ≥ 1 — `find . -maxdepth 2 -type d -name "build"` 1 hit (`./build`). HEAD=`e8af0fd` 실측 PASS (§스코프 규칙 gate (y-1)).
- [x] (Must, REQ-013 FR-03) P-2 `'coverage/**'` hit ≥ 1 — `find . -maxdepth 2 -type d -name "coverage"` 1 hit (`./coverage`). HEAD=`e8af0fd` 실측 PASS (§스코프 규칙 gate (y-2)).
- [x] (Must, REQ-013 FR-04) P-3 `'node_modules/**'` hit ≥ 1 — `find . -maxdepth 2 -type d -name "node_modules"` 1 hit (`./node_modules`). HEAD=`e8af0fd` 실측 PASS (§스코프 규칙 gate (y-3)).
- [ ] (Must, REQ-013 FR-05) P-4 `'**/__test__/*.js'` hit ≥ 1 — `find . -type f -path "*/__test__/*.js" -not -path "./node_modules/*"` 0 hit. HEAD=`e8af0fd` 실측 **FAIL (vacuous baseline)** — 해소 수단 (패턴 제거 vs `**/__tests__/**` 정정 vs 신규 경로 도입) planner 영역 task carve 대기 (§스코프 규칙 gate (y-4) baseline 박제).
- [x] (Must, REQ-013 FR-06) P-5 `'**/api.js'` hit ≥ 1 — `find ./src -type f -name "api.js"` 2 hits (`./src/Monitor/api.js`, `./src/Log/api.js`). HEAD=`e8af0fd` 실측 PASS (§스코프 규칙 gate (y-5)).
- [ ] (Should, REQ-013 FR-07) 자동 검출 채널 (단위 테스트 + glob 매처 또는 `find` + cardinality count fixture) 부착 — 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `package.json` `check:eslint-ignores-vacuous-zero` script) 선정은 planner 영역 task carve 대기. 본 spec §동작 9.3 계약 박제 + §변경 이력 hook-ack 박제 마커.

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
- [x] (Should, REQ-075 FR-03) 재현 fixture (untracked 1건 + staged src 1건 → commit → untracked 잔존) — TSK-20260517-10 / `94f362a` (revert `ca5035c`) 수렴 ack (task result.md 5 step 박제 + 사이클 누적 src net diff 0 + lint-staged glob 한정 untracked 미포함 검증 + `.gitignore` 매칭 영향 회피 fixture 경로 `specs/30.spec/green/foundation/` 사후 검증 PASS — REQ-078 FR-04 사례).
- [ ] (Could, REQ-075 FR-05) 회귀 감지 채널 — untracked spec 산출물 휘발 재발 시 inspector §변경 이력 hook-ack 갱신. 보편 운영 계약 — 차기 이벤트 발생 후 marker 플립 누적.
- [x] (NFR-01, REQ-075) SDLC 큐 무결성 — §동작 7.3 결과 효능 박제 (untracked spec 산출물 첫 commit 사이클 통과 후 휘발 0건). discovery 입력 큐 손실 0건이 결과 효능으로 spec 박제.
- [ ] (NFR-02, REQ-075) lint-staged 메이저 업그레이드 시 §변경 이력 ack/회귀 박제 — 차기 업그레이드 이벤트 후 marker 플립. 현 시점 baseline `lint-staged@^16.4.0` 박제 (§스코프 규칙 gate (p)).
- [x] (NFR-03, REQ-075) RULE-07 정합 — §동작 7.1~7.5 모두 시점 비의존 평서문 + grep 게이트로 반복 검증 가능. TSK-20260517-05 incident 는 §개요 발견 경로로만 언급, 본문 불변식은 보편 계약.
- [x] (Must, REQ-078 FR-01) §동작 7.3 평서문 보강 — "`.gitignore` 미매칭 경로에 한정" 단서 1줄 + 적합/부적합 예시 (`specs/30.spec/green/foundation/<probe>` 적합 / `specs/10.followups/<probe>` 부적합) 박제. — 본 세션 inspector edit.
- [x] (Must, REQ-078 FR-02) §동작 7.3 의 `specs/10.followups/*.md` 예시 표현 보강 — `.gitignore:28` 매칭 사유 1줄 박제 + 효능 측정 사이트 vs 효능 자체 의도 분리 평서. — 본 세션 inspector edit.
- [ ] (Should, REQ-078 FR-03) fixture probe 위치 결정 가이드 박제 — `grep -nE "^<path-prefix>" .gitignore` 0 hit 사전 점검 평서. 본 spec §회귀 중점 1줄 + §스코프 규칙 gate (r) 박제 (사후 검증 케이스), RULE-06 §체크리스트 보강 (planner/inspector grep-baseline 작성 시점) 은 운영자 축 — 본 spec 의 §회귀 중점 박제로 inspector/planner 차기 fixture task 발행 시 사전 점검 가이드 제공. RULE-06 본문 운영자 회수 대기 `[ ]` 유보.
- [x] (Should, REQ-078 FR-04) fixture 경로 sanity 게이트 단일 명령 박제 — §스코프 규칙 gate (r) 에 `grep -nE "^<fixture-path-prefix>" .gitignore` → 0 hit 게이트 박제 + TSK-20260517-10 사후 검증 사례 박제. 차기 fixture 도입 task 부터 사전 점검.
- [x] (Must, REQ-078 FR-05) 수단 라벨 0 — 본 보강 영역 (§동작 7.3 line 54 + §회귀 중점 신규 1줄 + §스코프 규칙 gate (q)(r)(s)) 에 `기본값|권장|우선|default|best practice` 0 hit (§스코프 규칙 gate (s) 박제). — 본 세션 inspector edit.
- [x] (Must, REQ-078 FR-06) 시점 비의존성 — 본 보강은 TSK-20260517-10 의 사건 (step 1.2 예시 경로 진단) 에 귀속되지 않는다. 본문 (§동작 7.3 + §회귀 중점 신규 1줄) 은 "fixture probe 는 `.gitignore` 미매칭 위치에 배치된다" 평서형 불변식, TSK-20260517-10 좌표는 §변경 이력 + §스코프 규칙 gate (r) 감사 pointer 한정.
- [x] (NFR-01, REQ-078) RULE-07 정합 — 본 보강은 "fixture 는 `.gitignore` 미매칭 위치에 배치된다" 평서형 불변식. incident 좌표 §변경 이력 한정.
- [x] (NFR-02, REQ-078) 자기 모순 해소 — §스코프 규칙 gate (q) 1-1 정합 점검 박제 (전자 spec 내 `specs/10.followups` 언급 ↔ 후자 `.gitignore:28` 매칭). 본 보강 평서문이 모순을 해소.
- [x] (NFR-03, REQ-078) RULE-06 직교 — 본 spec 은 spec 박제 (§동작 7.3 보강) 만 신호. RULE-06 §체크리스트 보강은 운영자 축 — 본 spec 이 단정하지 않는다 (§수용 기준 FR-03 `[ ]` 유보).
- [x] (Must, REQ-095 FR-01) §동작 8.1 평서문 박제 — "developer `git reset HEAD --` unstage 결과는 동일 commit 결과에 포함되지 않는다". 본 세션 inspector edit.
- [x] (Must, REQ-095 FR-02) §동작 8.2 평서문 박제 — "`npx lint-staged` 호출은 lint-staged glob 외 working-tree 변경을 staged 영역으로 자동 승격하지 않는다" + §스코프 규칙 gate (t) 실측.
- [ ] (Should, REQ-095 FR-03) 재현 fixture 박제 — task 발행/회수 후 hook-ack pointer 박제 (§테스트 현황 marker 와 짝).
- [x] (Should, REQ-095 FR-04) `.husky/pre-commit` 본문 staged 영역 직접 변경 명령 0 — §스코프 규칙 gate (u) 0 hit 실측.
- [ ] (Could, REQ-095 FR-05) 회귀 감지 채널 — cross-writer 침범 재발 시 inspector §변경 이력 hook-ack 갱신 + developer followup 발행 절차. 보편 운영 계약 — 차기 이벤트 발생 후 marker 플립 누적.
- [x] (Must, REQ-095 NFR-01) SDLC writer 무결성 — §스코프 규칙 gate (v) 에 cross-writer marker (`.planner-seen`, `.inspector-seen`) git history author 정합 채널 박제 (현 시점 incident 1건 `7b15126` 노출, 본 §동작 8 박제 후 cycle 부터 회귀 감지).
- [x] (Must, REQ-095 NFR-02) 회귀 안정성 — §동작 8.1~8.2 결과 효능 박제 (cross-writer stage-back 0건 결정적 일관). 사이클 내부 비결정성 (incident 의 `.planner-seen` 침범 vs `.inspector-seen` 비침범 동시 관찰) 노출은 §스코프 규칙 gate (v) 감사 pointer 한정.
- [x] (Must, REQ-095 NFR-03) RULE-07 정합 — §동작 8.1~8.5 모두 시점 비의존 평서문 + grep 게이트로 반복 검증 가능. TSK-25 / commit `7b15126` 은 §변경 이력 + §스코프 규칙 gate (v) 발견 경로로만 언급, 본문 불변식은 보편 계약. §스코프 규칙 gate (w) 수단 라벨 0 hit 자기 검증 PASS.
- [x] (Must, REQ-013 FR-01) §동작 9.1 평서문 박제 — "eslint.config.js:15 의 `ignores` 배열 길이는 5 이다" + §스코프 규칙 gate (x) 실측 박제 (HEAD=`e8af0fd` 1 hit @`:15`).
- [x] (Must, REQ-013 FR-02) §동작 9.2 평서문 박제 + §스코프 규칙 gate (y-1) 실측 박제 (P-1 1 hit).
- [x] (Must, REQ-013 FR-03) §동작 9.2 평서문 박제 + §스코프 규칙 gate (y-2) 실측 박제 (P-2 1 hit).
- [x] (Must, REQ-013 FR-04) §동작 9.2 평서문 박제 + §스코프 규칙 gate (y-3) 실측 박제 (P-3 1 hit).
- [ ] (Must, REQ-013 FR-05) §동작 9.2 + §회귀 중점 + §스코프 규칙 gate (y-4) 평서문 박제 (P-4 vacuous baseline). baseline 위반 박제 — 해소 수단 (패턴 제거 / 정정 / 실재 경로 도입) planner 영역 task carve 대기, 회복 시점에 marker flip.
- [x] (Must, REQ-013 FR-06) §동작 9.2 평서문 박제 + §스코프 규칙 gate (y-5) 실측 박제 (P-5 2 hits).
- [ ] (Should, REQ-013 FR-07) §동작 9.3 평서문 박제 (자동 검출 채널 계약). 발화 시점 채널 (pre-commit / pre-push / CI / 신규 script) 선정 planner 영역 task carve 대기.
- [x] (NFR-01, REQ-013) 결정론 — §동작 9.2 의 `grep` + `find` cardinality count 는 동일 HEAD 상 N 회 반복 시 N 회 동일 rc + 동일 출력 보장 (`find` walk + maxdepth 한정 + sort 비의존). §스코프 규칙 gate (y) 5건 모두 단일 명령 측정.
- [x] (NFR-02, REQ-013) 멱등성 — 본 게이트는 read-only (§동작 9.5). `eslint.config.js`, 빌드/커버리지 산출물, `src/**` 파일 mtime 변경 0.
- [x] (NFR-04, REQ-013) 자체 진단 scope 분리 — §동작 9.4 + §스코프 규칙 gate (z) 평서문 박제. specs/** 및 본 spec 본문 내 패턴 토큰 occurrence (예: 본 §동작 9 본문이 `**/__test__/*.js` 인용) 가 P-4 hit cardinality 에 영향 주지 않는다는 scope 분리 계약 명시.
- [x] (NFR-06, REQ-013) 패턴 의미 분리 + 우선순위 라벨 0 — §동작 9.1 평서문에 5 패턴 의미 분리 (P-1 build / P-2 coverage / P-3 deps / P-4 `__test__` `.js` / P-5 `api.js`) 박제하되 어느 패턴의 "기본" / "권장" 등 라벨 0. §스코프 규칙 gate (z) 0 hit 자기 검증 PASS.
- [x] (NFR-07, REQ-013) 시점 비의존 — §동작 9.1~9.5 모두 평서형, 특정 ESLint 메이저 bump / vite `build.outDir` 변경 / `__tests__` ↔ `__test__` 명명 변경 등 이벤트 비귀속. baseline HEAD `e8af0fd` 좌표는 §스코프 규칙 gate (x)(y)(z) 측정 시점 anchor + §변경 이력 감사 pointer 한정.
- [x] (NFR-03, REQ-013) RULE-07 정합 — §동작 9.1~9.5 모두 시점 비의존 평서문 + grep 게이트로 반복 검증 가능. baseline P-4 vacuous FAIL 박제는 위반 사실의 평서화 (시스템 효능 계약의 baseline 측정 anchor), incident patch 비귀속. §스코프 규칙 gate (z) 수단 라벨 0 hit 자기 검증 PASS.
- [x] (Must, REQ-013 NFR-05) 외부 비파괴 — 본 §동작 9 흡수는 `eslint.config.js` / 디스크 트리 / `src/**` 변경 동반 0. FR-07 의 발화 채널 부착 수단은 본 spec 의 In-Scope 가 아닌 후속 task 영역 (planner carve 대기).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 29d9da0 | 최초 등록 (REQ-20260421-028). 2건 blocked spec followup 의 4개 tooling 불변식을 하나의 green spec 으로 통합. consumed followups (2건): `specs/10.followups/20260421-0541-typescript-bootstrap-spec-from-blocked.md`, `specs/10.followups/20260421-0541-typescript-tooling-completion-spec-from-blocked.md`. 선행 done req (2건): `specs/60.done/2026/04/20/req/20260420-typescript-foundation-bootstrap.md` (TSK-20260420-32), `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` (TSK-20260420-33). baseline 실측: `eslint.config.js:34,7,35`, `package.json:39` (`.d.ts` 미포함 — 현실 미달), `tsconfig.json:20`, `vite.config.js:71-74`. | 신규 전 섹션 |
| 2026-04-21 | TSK-20260421-64 / dcecda0 | lint-staged 패턴 `.d.ts` 포함 보강 (FR-01 불변식 현실 정합 달성). `package.json:40` `"src/**/*.{js,jsx,ts,tsx}"` → `"src/**/*.{js,jsx,ts,tsx,d.ts}"` 단일 키 변경. DoD 게이트 재실행 시 `grep -nE "d\.ts" package.json` → 1 hit (`:40`), `lint-staged` 블록 출력 정합 OK. § 스코프 규칙 (b) "현실 미달 상태" 표현은 baseline 박제로 보존하되 본 § 테스트 현황 / § 변경 이력 에 ack 박제. | §테스트 현황 |
| 2026-04-22 | inspector / (this commit) | REQ-20260422-058 흡수 — §동작 6 "ESLint flat-config 동일 rule key last-write-wins 불변식" 신규 박제 (6.1~6.4). §역할 "6건" 으로 갱신 + out-of-scope 에 "ESLint 버전 변경 계획" · "기타 tooling merge semantics" 추가. §회귀 중점 2건 증분 (TS 블록 선행 이동 금지 · 블록 순서 = 지배관계 계약). §스코프 규칙 grep-baseline gate (k)(l) 2건 실측 수치 박제 (HEAD=`4af36ee`): (k) `grep -nE "files:\s*\[" eslint.config.js` → 2 hits @:35 (JS/JSX) + @:79 (TS) · 라인 35 < 79 계약 정합, (l) `grep -nE "Flat-config\|last occurrence\|last.write.wins" eslint.config.js` → 2 hits @:74-75 주석 근거. §수용 기준 REQ-058 FR-01~05 + NFR-01~02 총 7 항목 증분 + 즉시 `[x]` 박제 (본 세션 편집만으로 수렴). consumed req: `specs/20.req/20260422-eslint-flat-config-rule-merge-last-write-wins-invariant.md` → `60.done/2026/04/22/req/` mv. consumed followup (감사 pointer, 본 세션은 req 단독 소비): `specs/60.done/2026/04/22/followups/20260422-0525-flat-config-rule-merge-semantics.md` (source_task: TSK-20260422-12, category: doc/spec-accuracy, severity: low). 선행 task 사후 기록: `specs/60.done/2026/04/22/task/eslint-ts-no-unused-vars-swap/` (TSK-20260422-12, REQ-20260422-053). 외부 레퍼런스: ESLint 공식 "If the same rule is specified in multiple configuration objects, the later configuration object wins" (`configuration-files` 문서). REQ-058 은 TSK-20260422-12 작업 지시서 1단계 서술 "각 규칙이 더 엄격한 레벨로 merge" 가 사실 오류 였음을 followup 이 근거로 제시 (last-write-wins 실측 재현) — 본 spec 은 해당 오류를 시스템 불변식 차원 박제로 예방. 타깃 spec 은 REQ-058 원문에서 `30.spec/blue/foundation/tooling.md` 지정이나 green 이 inspector 편집 영역이므로 본 green spec 에 직접 흡수. RULE-07 자기검증 — §동작 6.1~6.4 모두 평서형·반복 검증 가능 (`grep -nE` 단일 명령 + ESLint 공식 문서 교차 정합)·시점 비의존 (ESLint v9+ flat-config 전반에 적용)·incident patch 아님 (merge semantics 는 ESLint 런타임 자체 성질, 특정 릴리스 귀속 부재)·수단 중립 (블록 순서 표현 방식 특정 안 함, JS/JSX 블록을 앞에 두는 것이 지배관계 표현이라는 "계약" 만 박제). RULE-06 §스코프 규칙 gate (k)(l) 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/**`) 편집만 + `20.req/* → 60.done/req/` mv. RULE-02 단일 커밋. | 헤더 · §역할 · §동작 6 · §회귀 중점 · §스코프 규칙 · §수용 기준 · §변경 이력 · §참고 |
| 2026-04-22 | inspector / (this commit) | Phase 1 drift reconcile — REQ-053 FR-01~06 + NFR-03 + §동작 5.1~5.4 + JS/JSX 의미 보존 총 7 WIP [ ]→[x] 플립. ack 근거: TSK-20260422-12 @`fddacb0` (현 HEAD=`4af36ee` 조상). 재게이트 실측 @HEAD=`4af36ee`: `grep -nE "@typescript-eslint/no-unused-vars" eslint.config.js` → 1 hit @:83 · `grep -nE "'no-unused-vars'" eslint.config.js` → 2 hits (@:64 JS/JSX vanilla `['warn', { caughtErrors: 'none' }]` + @:84 TS 블록 `'off'`) · `grep -rn "eslint-disable-next-line no-unused-vars" src` → 0 hits (NFR-03 수렴) · task result.md 박제 (`npm run lint` exit 0 warning 0 / `npm test` 48 files 439 PASS / `npm run build` exit 0 / 임시 프로브 warn 1건 재현 후 삭제 / JS/JSX 블록 rules 4건 bit-for-bit 보존 / `git diff package.json tsconfig.json` 0). FR-05/FR-06 Should 항목 hook-ack: FR-05 는 task result.md §테스트 결과 "spec 지시 2 (TS 의도 보존 검증)" 박제, FR-06 는 task result.md "pre-commit lint-staged 동작" 박제 (커밋 훅 통과로 확인). scope 준수: 본 세션 diff = 본 green spec §테스트 현황 7건 ack 박제 + §수용 기준 7건 ack 박제 + §변경 이력 라인 1건 증분 + `20.req/* → 60.done/req/` mv + `.inspector-seen` 갱신. `src/**` · `eslint.config.js` · `package.json` · `tsconfig.json` · `.husky/**` · `.github/workflows/**` 변경 0. RULE-07 정합 — 불변식 본문 (§동작 1~5) 수정 없음, §테스트 현황 / §수용 기준 박제 전환과 §변경 이력 감사 pointer 추가만. | §테스트 현황, §수용 기준, §변경 이력 |
| 2026-04-22 | inspector / 1addbfe | REQ-20260422-053 흡수 — **blue → green 복사 후 편집**. §동작 5 "`.ts/.tsx/.d.ts` `no-unused-vars` rule swap 불변식" 신규 박제 (5.1~5.4). 스코프 규칙에 REQ-053 baseline gate (f)~(j) 실측 수치 추가 (HEAD=ab88167): `eslint.config.js:70,74` vanilla rule 2 hit, `@typescript-eslint/no-unused-vars` 0 hit, 우회 주석 `src/test-utils/msw.ts:41` + `src/Image/ImageItem.tsx:6` 2건, `package.json:60` `typescript-eslint@^8.58.2` 기 설치, `npm run lint` exit 0. §테스트 현황 / §수용 기준 에 REQ-053 FR-01~06 · NFR-03 체크항목 추가. 관련 계약: `src-typescript-migration.md` FR-05 island 전환 맥락. consumed followup: `specs/10.followups/20260422-0057-eslint-no-unused-vars-ts-method-signature.md` (source: TSK-20260422-02). 선행 done req: `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` FR-09 "규칙 세트 미적용" 결정을 **한 규칙 한정 치환** 으로 범위 제한 완화. RULE-07 자기검증 — 5.1~5.4 모두 평서형·반복 검증 가능 (`npm run lint` · `grep`)·시점 비의존·incident 귀속 부재. RULE-06 §스코프 규칙 gate (f)~(j) 5건 실측 박제. RULE-01 inspector writer 영역만 (green tooling.md edit). | §제목, §역할, §동작 5, §회귀 중점, §스코프 규칙, §테스트 현황, §수용 기준, §참고 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-095 흡수) / pending (HEAD=`e19d870`) | REQ-095 흡수 — §동작 8 "lint-staged backup/restore 사이클의 cross-writer stage-back 차단 + glob 외 자동 승격 0 불변식" 신규 박제 (8.1~8.5). §역할 "8건" 으로 갱신 + out-of-scope 1건 추가 (`.husky/pre-commit` 본문 가드 스크립트 — task 계층 별도 carve). §회귀 중점 2건 증분 (cross-writer stage-back 재발 시 followup + ack / 훅 본문 staged 영역 직접 변경 명령 추가 금지). §스코프 규칙 grep-baseline gate (t)(u)(v)(w) 4건 실측 박제 (HEAD=`e19d870`): (t) lint-staged 블록 `src/**` 한정 재확인, (u) `grep -nE "git add -A\|git add \.\|git stash drop\|git stash pop" .husky/pre-commit` → 0 hit, (v) cross-writer marker git history author 정합 채널 (`7b15126` incident 1건 감사 pointer — `.planner-seen +73 insertions` developer commit 침범, `.inspector-seen` 비침범 비결정성 노출), (w) `awk '/^### 8\./,/^### 회귀 중점/' tooling.md | grep -cE "기본값\|권장\|우선\|default\|best practice\|먼저"` → 0 hit (수단 라벨 0). §테스트 현황 3 marker (FR-02 `[x]`/FR-04 `[x]`/FR-03 `[ ]` 유보) + §수용 기준 8 marker (FR-01/02/04 + NFR-01/02/03 즉시 `[x]`, FR-03/FR-05 `[ ]` 유보) 증분. consumed req: `specs/20.req/20260517-developer-commit-cross-writer-stage-back-block.md` (REQ-095) → `60.done/2026/05/17/req/` mv. consumed followup (감사 pointer): `specs/10.followups/20260517-2041-lint-staged-hook-cross-writer-stage.md` (source_task: TSK-20260517-25, category: tooling, severity: low). 트리거 incident: commit `7b15126` `fix: FileUpload setTimeout cleanup 불변식 회복` 의 `.planner-seen +73 insertions` cross-writer 침범 (감사 단서, 본 §동작 8 박제로 회귀 0 계약 surface). RULE-07 자기검증 — §동작 8.1~8.5 모두 시점 비의존 평서문 + grep 게이트로 반복 검증 가능. TSK-25 / commit `7b15126` 은 §변경 이력 + §스코프 규칙 gate (v) 발견 경로로만 언급, 본문 불변식은 보편 계약 (lint-staged 16.x / husky 9.x 마이너 업그레이드 시에도 동일 계약 유지). §스코프 규칙 gate (w) 수단 라벨 0 hit 자기 검증 PASS (stage-back 차단 수단 후보 라벨 0 — lint-staged 라이브러리 내부 stash 사이클 책임 위임). RULE-06 §스코프 규칙 gate (t)(u)(v)(w) 4건 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/tooling.md` edit + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. RULE-07 §양성 평서 정합 — 본 req 는 SDLC writer 무결성 시스템 계약 박제 (incident 1건 단서 + 보편 계약). | 헤더 · §역할 · §동작 8 · §회귀 중점 · §스코프 규칙 · §테스트 현황 · §수용 기준 · 본 이력 · §참고 |
| 2026-05-17 | inspector (Phase 1 + Phase 2) / REQ-20260517-078 (HEAD=`79d28cc`) | **Phase 1 reconcile** — §테스트 현황 line 125 + §수용 기준 line 152 의 FR-03 marker 2건 `[ ]→[x]` 플립. ack 근거: TSK-20260517-10 / `94f362a` (revert `ca5035c`, 양 commit 모두 HEAD 조상). hook-ack: `60.done/2026/05/17/task/lint-staged-untracked-preserve-fixture/result.md` Step 1~5 박제 (사이클 진입 전 `git status --short` 2 line `M ` + `??` / pre-commit 3 호출 PASS `npx lint-staged` + `check-spec-coherence` G1·G2 + `check-vite-env-coherence` G1·G2 / commit `94f362a` exit 0 / 사이클 후 `??` 잔존 1 line + untracked fixture 파일 SHA 보존 / `git revert HEAD --no-edit` 으로 `ca5035c` 회수 후 src net diff 0). 회귀 0 검증: result.md DoD 점검 박제 (`npm run lint` exit 0 / `npm test` 변경 없음 src net 0 / `npm run build` 변경 없음). **Phase 2 REQ-078 흡수** — `foundation/tooling.md` §동작 7.3 평서문에 `.gitignore` 미매칭 위치 한정 단서 1줄 + 적합/부적합 예시 박제 (FR-01·FR-02), §회귀 중점 신규 1줄 추가 (fixture 경로 sanity 게이트 — REQ-078 FR-04), §스코프 규칙 grep-baseline gate (q)(r)(s) 3건 실측 박제 (HEAD=`79d28cc`): (q) `grep -nE "specs/10\.followups" specs/30.spec/green/foundation/tooling.md` ↔ `grep -nE "^specs/10\.followups" .gitignore` 1-1 정합 점검 — 후자 1 hit @`.gitignore:28`, 전자 본 보강 후 자기 모순 해소; (r) `grep -nE "^<fixture-path-prefix>" .gitignore` 0 hit 사전 점검 게이트 + TSK-20260517-10 사후 검증 사례 (`grep -nE "^specs/30\.spec" .gitignore` → 0 hit PASS); (s) `sed -n '54p;68p;111,118p' tooling.md | grep -E "기본값|권장|우선|default|best practice"` → 0 hit (수단 라벨 0). §수용 기준 REQ-078 FR-01~06 + NFR-01~03 총 9 marker 신규 — FR-01/02/04/05/06 + NFR-01/02/03 즉시 `[x]` (본 세션 편집만으로 수렴), FR-03 (RULE-06 §체크리스트 보강 운영자 축) `[ ]` 유보. consumed req: `specs/20.req/20260517-fixture-probe-gitignore-coherence.md` (REQ-078) → `60.done/2026/05/17/req/` mv. consumed followup (감사 pointer): `specs/10.followups/20260517-1310-fixture-path-guidance.md` (source_task: TSK-20260517-10, severity: low). RULE-07 자기검증 — §동작 7.3 보강 + §회귀 중점 신규 1줄 모두 평서형·반복 검증 가능 (`grep -nE` 단일 명령)·시점 비의존 (fixture 위치 결정 가이드는 보편 계약)·incident 귀속 부재 (TSK-20260517-10 좌표는 감사 pointer 한정)·수단 중립 (fixture 경로 후보 라벨 0). RULE-06 §스코프 규칙 gate (q)(r)(s) 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/tooling.md` edit + `20.req/* → 60.done/req/` mv). | 헤더 · §동작 7.3 · §회귀 중점 · §스코프 규칙 · §테스트 현황 · §수용 기준 · 본 이력 · §참고 |
| 2026-05-18 | inspector (Phase 2, REQ-20260518-013 흡수) / (this commit, HEAD=`e8af0fd`) | REQ-013 흡수 — §동작 9 "eslint.config.js:15 flat-config `ignores` 5 패턴 vacuous-zero 결과 효능 불변식" 신규 박제 (9.1~9.5). §역할 "9건" 으로 갱신 + out-of-scope 3건 추가 (`ignores` 이외 영역 / vacuous 해소 수단 / 발화 시점 채널 선정). §회귀 중점 5건 증분 (배열 길이 5 변경 / 5 패턴 vacuous 진입 / `ignores` 외 영역 axis 자동 편입 금지 / R-1~R-5 회귀 시나리오). §스코프 규칙 grep-baseline gate (x)(y)(z) 3건 실측 박제 (HEAD=`e8af0fd`): (x) `grep -nE "^\s*\{\s*ignores:" eslint.config.js` → 1 hit @`:15` (5 entries 배열), (y) 5 패턴 cardinality 5/5 axis 중 **4 PASS / 1 FAIL** — y-1 P-1 1 hit / y-2 P-2 1 hit / y-3 P-3 1 hit / **y-4 P-4 0 hit (vacuous baseline FAIL)** / y-5 P-5 2 hits, (z) `awk '/^### 9\./,/^### 회귀 중점/' tooling.md | grep -cE "기본값\|권장\|우선\|default\|best practice\|먼저"` → 0 hit (수단 라벨 0). §테스트 현황 7 marker (FR-01~07) 증분 — FR-01/02/03/04/06 즉시 `[x]`, **FR-05 `[ ]` (P-4 vacuous baseline 위반 박제, 해소 수단 planner 영역 task carve 대기)**, FR-07 `[ ]` (발화 채널 선정 planner 영역 대기). §수용 기준 12 marker (FR-01~07 + NFR-01/02/04/06/07/03/05) 증분 — FR-01/02/03/04/06 + NFR-01/02/04/06/07/03/05 즉시 `[x]`, FR-05/07 `[ ]` 유보. consumed req: `specs/20.req/20260518-eslint-flat-config-ignores-pattern-vacuous-zero-axis.md` (REQ-013) → `60.done/2026/05/18/req/` mv. 트리거: REQ-013 §자매 spec 격리 명시 — `30.spec/{blue,green}/foundation/tooling.md` 의 `ignores:` 배열 (`eslint.config.js:15`) 박제된 패턴 vacuous-zero axis 가 미박제 영역, 본 req 가 그 별 axis 박제 요청. RULE-07 자기검증 — §동작 9.1~9.5 모두 평서형·반복 검증 가능 (`grep -nE` + `find -maxdepth` 단일 명령)·시점 비의존 (ESLint 메이저 bump · `build.outDir` 변경 등 어떤 이벤트 직후에도 동일 측정)·incident 비귀속 (P-4 vacuous baseline 박제는 위반 사실의 평서화 = 시스템 효능 계약의 baseline 측정 anchor, 특정 incident patch 비귀속)·수단 중립 (vacuous 해소 (a) 패턴 제거 (b) 패턴 정정 (c) 신규 경로 도입 / 발화 채널 (pre-commit / pre-push / CI / 신규 script) 어느 쪽이든 수용). 특히 §동작 9.4 self-reference circularity 회피 계약 명시 — specs/** 본문 내 패턴 토큰 occurrence 가 measure scope 외. RULE-06 §스코프 규칙 gate (x)(y)(z) 실측 박제 (P-4 baseline FAIL 평서화). RULE-01 inspector writer 영역만 (`30.spec/green/foundation/tooling.md` edit + `20.req/* → 60.done/req/` mv). RULE-03 (d) 정합 — green 카운트 변동 0 (20 → 20, 본문 갱신 경로 흡수 — sibling carve 아닌 흡수). | 헤더 · §역할 · §동작 9 · §회귀 중점 · §스코프 규칙 · §테스트 현황 · §수용 기준 · 본 이력 · §참고 |
| 2026-05-17 | inspector / REQ-20260517-075 (HEAD=`9e5f00a`) | REQ-075 흡수 — **blue `foundation/tooling.md` → green 복사 후 편집**. §동작 7 "pre-commit lint-staged 사이클의 untracked 보존 + 훅 본문 사이드이펙트 0 불변식" 신규 박제 (7.1~7.5). §역할 "7건" 으로 갱신 + out-of-scope 3건 추가 (lint-staged 내부 stash 패치 / `specs/**` 별도 lint 게이트 / husky·lint-staged major 업그레이드). §회귀 중점 3건 증분 (훅 본문 사이드이펙트 / lint-staged glob `specs/**` 진입 / lint-staged 메이저 업그레이드). §스코프 규칙 grep-baseline gate (m)(n)(o)(p) 4건 실측 박제 (HEAD=`9e5f00a`): (m) `grep -nE '"specs' package.json | grep -E "lint-staged|jsx|tsx"` → 0 hit, (n) `grep -nE "git add -A|git stash" .husky/pre-commit` → 0 hit, (o) 재현 fixture hook-ack pointer, (p) `lint-staged@^16.4.0` baseline. §테스트 현황 3 marker + §수용 기준 8 marker (FR-01~05 + NFR-01~03) 증분 — FR-01/02/04 + NFR-01/03 즉시 `[x]`, FR-03/05 + NFR-02 는 task 발행/이벤트 대기로 `[ ]` 유보. 위치 변경: 헤더 §위치 에 `.husky/pre-commit` 추가, §관련 요구사항 에 REQ-20260517-075 추가, §최종 업데이트 갱신. consumed: REQ-20260517-075. consumed followup (감사 pointer): `specs/10.followups/20260517-0308-dev-env-deps-not-installed.md:34` (§행동 제안 4) + `specs/10.followups/20260517-0308-restore-deleted-specs.md:30-31` (§비고) — 두 followup 의 신규 차분 흡수. RULE-07 자기검증 — §동작 7.1~7.5 모두 평서형·반복 검증 가능 (`grep -nE` 단일 명령 + `git status --short` 재현)·시점 비의존·incident 귀속 부재 (TSK-20260517-05 incident 는 req §개요 발견 경로만 언급, 본문 불변식은 보편 계약)·수단 중립 (lint-staged 내부 stash 경로 / 등가 메커니즘 어느 쪽이든 수용). RULE-06 §스코프 규칙 gate (m)(n) 0 hit 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/tooling.md` edit, blue 직접 편집 불가로 green carry-over 경로). | 헤더 · §역할 · §동작 7 · §회귀 중점 · §스코프 규칙 · §테스트 현황 · §수용 기준 · 본 이력 · §참고 |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/04/21/req/20260421-typescript-foundation-tooling-spec-consolidation.md` (REQ-028).
  - `specs/60.done/2026/04/22/req/20260422-eslint-no-unused-vars-typescript-eslint-rule-swap.md` (REQ-053).
  - `specs/60.done/2026/04/22/req/20260422-eslint-flat-config-rule-merge-last-write-wins-invariant.md` (REQ-058 — 본 세션 mv).
  - `specs/60.done/2026/05/17/req/20260517-lint-staged-untracked-preservation.md` (REQ-075 — 본 세션 mv).
  - `specs/60.done/2026/05/17/req/20260517-fixture-probe-gitignore-coherence.md` (REQ-078 — 본 세션 mv).
  - `specs/60.done/2026/05/17/req/20260517-developer-commit-cross-writer-stage-back-block.md` (REQ-095 — 본 세션 mv).
  - `specs/60.done/2026/05/18/req/20260518-eslint-flat-config-ignores-pattern-vacuous-zero-axis.md` (REQ-013 — 본 세션 mv).
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
