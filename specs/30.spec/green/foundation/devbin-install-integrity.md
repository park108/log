# 개발 바이너리 install 완결성 — declared devDep ↔ `node_modules/<pkg>/` 디렉터리 존재 ↔ `node_modules/.bin/<cmd>` resolve 가능성 ↔ 메이저 격차 0 상시 불변식

> **위치**: `package.json` (`devDependencies` 22 항목 — binary 제공 / module 제공 분류), `node_modules/<pkg>/package.json` (존재 + installed `version`), `node_modules/.bin/<cmd>` (PATH symlink), `.husky/pre-commit` / `.husky/pre-push` (hook 진입).
> **관련 요구사항**: REQ-20260517-064
> **최종 업데이트**: 2026-05-17 (by inspector, REQ-064 흡수 — devbin install precondition 메타 패턴 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-064 발행 시점 HEAD=`2de68c8`, 본 spec 박제 시점 HEAD=`0305fb1`).

## 역할
`package.json` `devDependencies` 의 **개발 명령 진입점** (binary 제공: CLI / module 제공: plugin·parser·matcher) 각각이 (i) `node_modules/<pkg>/package.json` 파일로 실제 install 되어 있고, (ii) binary 제공의 경우 `node_modules/.bin/<cmd>` 가 PATH 에서 resolve 가능하며, (iii) installed `version` 의 메이저가 declared semver range 의 메이저 하한과 격차 0 임을 **반복 검증 가능한 상시 불변식** 으로 박제. 본 정합은 `dependency-bump-gate` (bump 직후 4 scripts exit 0), `coverage-determinism` (vitest 측정 결정론), REQ-061/063 (typescript / react 메이저 정합) 의 **precondition** — devbin 부재 시 그 후속 게이트의 측정 채널 자체가 비활성 (false-negative). 본 정합이 깨지면 (a) `.husky/pre-commit` (`npx lint-staged`) / `.husky/pre-push` (`npm test`) 가 hook 환경 진입 단계에서 fail 하여 src 변경의 commit/push 가 차단되고, (b) `npm run lint` / `npm run build` / `npm run typecheck` / `npm test` 4 scripts 가 PATH resolve 단계에서 즉시 종결되며, (c) declared 메이저 ↔ installed 메이저 격차로 lint-staged·eslint·vitest 의 단일 책임 (config dispatch / 검사 / 측정) 자체가 끊긴다. 의도적으로 하지 않는 것: `npm ci` / `npm install` / `pnpm` / `yarn` 등 install 수단 라벨 부여 (RULE-07 수단 중립), 특정 패키지의 특정 메이저로의 업/다운그레이드 자체 (REQ-061/063 관할), npm script 의 exit code 자체 (`dependency-bump-gate` FR-01 관할 — 본 spec 은 그 precondition), CI runner 의 `node_modules` 상태 (CI 는 매 run install — 본 spec 은 로컬 dev 환경 + 로컬 hook 영역), 운영/런타임 dep (`dependencies` 8 항목) 의 install 정합 (별 spec / REQ-063 관할), dev-only types (`@types/*`) 의 binary 축 검증 (types 는 진입점 미제공 — 디렉터리 존재 축만 적용), 환경 회복 운영 task 자체 (developer 영역).

## 공개 인터페이스
- 소비 파일:
  - `package.json` `devDependencies` — 선언 22 항목 (binary 제공 / module 제공 / types 분류).
  - `node_modules/<pkg>/package.json` `version` 필드 — installed 디렉터리 존재 + 실측 메이저.
  - `node_modules/.bin/<cmd>` symlink — PATH resolve 진입점.
  - `.husky/pre-commit:1` `npx lint-staged`, `.husky/pre-push:1` `npm test` — hook 환경 진입.
- 검출 명령 (반복 가능, 단일 진단 단위 — NFR-02 정합):
  - `[ -f node_modules/<pkg>/package.json ]` — 디렉터리 존재 1-line.
  - `command -v ./node_modules/.bin/<cmd>` — PATH resolve 1-line.
  - `./node_modules/.bin/<cmd> --version` — binary 진입 검증.
  - `node -p "require('<pkg>/package.json').version"` — installed 메이저 1-line 추출.
  - `npm ls <pkg>` — 디렉터리 + 메이저 통합 진단.
  - `node -e "Object.keys(require('./package.json').devDependencies).forEach(...)"` — devDependencies 자동 추종 진입점 (FR-07 정합).

## 동작

### 1. binary 제공 devDep 의 `node_modules/.bin/<cmd>` PATH resolve 가능성 불변식 (REQ-064 FR-01)
`package.json` `devDependencies` 중 **개발 명령 진입점** 을 제공하는 부분집합 (binary 제공) 각각에 대해 `node_modules/.bin/<cmd>` 가 PATH 에서 resolve 가능하며 `<cmd> --version` exit code = 0. 본 불변식의 결과:

- (1.1) `for cmd in <binary-list>; do command -v ./node_modules/.bin/$cmd >/dev/null 2>&1 || echo MISSING:$cmd; done` 출력 빈 줄.
- (1.2) 각 binary 의 `--version` 또는 `--help` invocation 이 exit code 0 — PATH resolve 단계 부재 0.
- (1.3) binary 부재 검출 시 단일 진단 명령 (`ls -la node_modules/.bin/<cmd>`) 으로 부재 카테고리 식별 가능.
- (1.4) binary 제공 devDep 목록은 `package.json` `devDependencies` 의 현 상태에 추종 — 특정 패키지 이름 하드코딩 부재 (FR-07 정합).

### 2. module 제공 devDep 의 `node_modules/<pkg>/` 디렉터리 존재 불변식 (REQ-064 FR-02)
`package.json` `devDependencies` 중 **module 제공** (plugin, parser, matcher, test env, eslint 공유 config 등) 패키지 각각에 대해 `node_modules/<pkg>/package.json` 파일이 존재한다. 본 불변식의 결과:

- (2.1) `for p in <module-list>; do [ -f node_modules/$p/package.json ] || echo MISSING:$p; done` 출력 빈 줄.
- (2.2) 모듈 부재 검출 시 단일 진단 명령 (`ls node_modules/<pkg>/`) 으로 부재 카테고리 식별 가능.
- (2.3) module 제공 devDep 목록 또한 `devDependencies` 의 현 상태에 추종 — 하드코딩 부재.

### 3. installed 메이저 ↔ declared 메이저 격차 0 불변식 (REQ-064 FR-03)
§ 동작 1·2 대상 devDep 의 installed `version` 메이저가 declared semver range 의 메이저 하한과 격차 0. 본 불변식의 결과:

- (3.1) `node -p "require('<pkg>/package.json').version"` 추출 메이저 = `package.json` declared semver range 메이저 하한 (예: `^9.39.4` → 9).
- (3.2) 격차 1 이상 검출 시 본 불변식 위반 — `npm ci` 무결성 검증 단계의 lockfile 재정합 또는 peer 경고 채널로 신호 가능.
- (3.3) 본 불변식의 적용 대상은 REQ-061 (typescript) / REQ-063 (react·react-dom·react-router-dom·@testing-library/react) 의 정합 대상과 **중복 시 그 req 우선** — 본 spec 은 그 외 devDep 한정으로 메이저 격차 0 박제. 중복 분기는 § 동작 5 의 직교 정합으로 명시.
- (3.4) 특정 패키지의 특정 메이저 숫자는 본문 효능 평서문에 하드코딩되지 않는다 — baseline 수치는 §스코프 규칙 grep-baseline 에만 박제 (NFR-01 시점 비의존 정합).

### 4. hook 환경 진입 가능성 불변식 (REQ-064 FR-04)
`.husky/pre-commit` (`npx lint-staged`) 와 `.husky/pre-push` (`npm test`) 의 환경 진입 단계 (PATH resolve + ESM module import) 에서 실패하지 않는다 — hook 본문 명령의 첫 frame (lint-staged 의 config load / vitest 의 binary 호출) 이 도달 가능. 본 불변식의 결과:

- (4.1) `.husky/pre-commit` 실행 시 `npx lint-staged` 의 binary resolve + config load frame 도달 — staged 파일 0 시점에도 본 frame 통과 검증.
- (4.2) `.husky/pre-push` 실행 시 `npm test` → `vitest` binary resolve + Node ESM import frame 도달.
- (4.3) hook 본문 명령의 **코드 검사 결과** 자체로 실패하는 것은 본 spec 의 음영 외 — 정상 동작. 본 spec 은 환경 단계 도달성만 박제.
- (4.4) 본 불변식은 § 동작 1·2·3 의 결과 — 환경 단계 도달 부재는 § 동작 1/2/3 중 하나 이상의 위반 신호.

### 5. 위반 검출 단일성 불변식 (REQ-064 FR-05)
§ 동작 1~3 위반 시 단일 진단 명령 (`npm ls <pkg>` 또는 `ls node_modules/.bin/<cmd>` 또는 1-line `node -p`) 의 출력으로 위반 카테고리 (디렉터리 부재 / binary 부재 / 메이저 격차) 가 식별 가능하다. 복수 카테고리 동시 위반 시도 단일 명령으로 보고 가능. 본 불변식의 결과:

- (5.1) `npm ls <pkg>` 출력 — 디렉터리 부재 (UNMET) / 메이저 격차 (peer warning) 동시 표시.
- (5.2) `ls -la node_modules/.bin/<cmd>` 출력 — symlink 존재·target·mtime 단일 줄.
- (5.3) `node -p "require('<pkg>/package.json').version"` 출력 — 디렉터리 부재 시 throw (`Cannot find module`), 존재 시 메이저 추출.
- (5.4) 본 spec 의 직교 정합 (REQ-061 typescript / REQ-063 react 계열) 위반은 본 spec § 동작 3 위반과 동일 채널로 검출되며, 진단 출력으로 어느 req 의 관할인지 분류 가능.

### 6. 수단 중립 불변식 (REQ-064 FR-06, RULE-07 정합)
본 spec § 동작 1~3 의 효능 도달 **수단** (`npm ci` vs `npm install` vs `pnpm install` vs `yarn install` vs 수동 캐시 정리 vs lockfile 재생성 등) 에 "기본값" / "권장" / "우선" / "default" / "best practice" / "root cause" / "가장 효과적" 라벨이 박제되지 않는다. 본 spec 은 **결과 효능** 만 박제하며, 수단 선정은 task 계층 (planner / developer) 결정.

- (6.1) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/devbin-install-integrity.md` 의 매치는 다음 카테고리에 한정된다 — (i) 본 § 동작 6 의 정의 본문 (수단 라벨 셋 박제), (ii) 자기 검증 게이트 본문 (수용 기준 / 테스트 현황 / 회귀 중점 / 변경 이력 정책 명시), (iii) 외부 라이브러리 API 동작 인용 (예: `npm ci` 의 lockfile 무결성 default 동작, lint-staged v16 ESM default), (iv) 템플릿 메타 텍스트 ("식별자 우선"). 본 카테고리 외 매치 (예: § 동작 본문 효능 평서문이 "권장 install 수단" / "best practice 명령" 등으로 수단을 라벨링) 는 § 동작 6.1 위반으로 inspector 가 차기 세션에서 격리 식별.
- (6.2) 수단 라벨이 효능 평서문에 박제된 spec 은 RULE-07 위반으로 inspector 가 차기 세션에서 `50.blocked/spec/` 격리 대상으로 식별. 본 spec 박제 시점 grep 매치는 (i)~(iv) 카테고리 내부로 분류된다 — 카테고리 분류 자체가 § 동작 6 의 효능 박제와 직교.

### 7. devDep 변경 자동 추종 불변식 (REQ-064 FR-07)
본 효능은 `package.json` `devDependencies` 의 항목이 추가·제거·메이저 변경되어도 **자동 추종**. 본 spec 파생 task / 검증 명령은 `devDependencies` 의 현 상태를 reflect 하는 표현 (예: `node -e "Object.keys(require('./package.json').devDependencies).forEach(...)"`) 을 사용하며, 특정 패키지 이름의 본문 효능 평서문 하드코딩은 부재. 본 불변식의 결과:

- (7.1) `devDependencies` 에 신규 패키지 (예: 가상의 `@vitest/ui`) 추가 시 본 게이트의 검증 대상도 자동 포함 — 본 spec 본문 수정 없이.
- (7.2) 본 spec 본문은 특정 패키지 이름 (vite, vitest 등) 을 효능 평서문에 하드코딩하지 않는다 — 패키지 이름·메이저 수치는 §스코프 규칙 grep-baseline 에만 박제 (NFR-01 시점 비의존 정합).
- (7.3) types 패키지 (`@types/*`) 는 진입점 미제공 — 본 게이트의 binary 축 (§ 동작 1) 적용 0, 디렉터리 존재 축 (§ 동작 2) 만 적용. 본 분기는 본문 박제 (FR-07 정합).

### 회귀 중점
- `package.json:63` `"vitest": "^4.1.4"` ↔ `node_modules/vitest/` 부재 → § 동작 2.1 위반 baseline (module dir 부재).
- `package.json:61` `"vite": "^8.0.8"` ↔ `node_modules/.bin/vite` 부재 → § 동작 1.1 위반 baseline (binary 부재).
- `package.json:51` `"eslint": "^9.39.4"` ↔ `node_modules/eslint/package.json:version "8.28.0"` 메이저 격차 1 → § 동작 3.1 위반 baseline.
- `.husky/pre-commit` 실행 시 `npx lint-staged` 가 `lint-staged` binary 부재로 fail → § 동작 4.1 위반 (§ 동작 1.1 의 결과).
- 본 spec 본문에 install 수단 라벨 박제 (수단 라벨 토큰 셋 § 동작 6 정의 참조) → § 동작 6.1 위반.
- devDep 신규 추가 시 본 게이트 검증 명령이 특정 패키지 이름 하드코딩으로 자동 추종 실패 → § 동작 7.1 위반.

## 의존성
- 외부: `npm` (CLI — lockfile 무결성 검증), Node.js (`node -p` / `node -e`), POSIX shell (`command -v`, `[ -f ... ]`), `.husky/` (git hook 등록).
- 내부: `package.json`, `package-lock.json`, `node_modules/<pkg>/package.json` (existence + version 측정 매개), `node_modules/.bin/<cmd>` symlink, `.husky/pre-commit`, `.husky/pre-push`.
- 역의존:
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) FR-01 — `npm ci` 직후 4 scripts (`lint`/`test`/`build`/`typecheck`) exit 0. 본 spec 은 그 **precondition** — 본 spec 미충족 시 4 scripts 가 PATH resolve 단계에서 즉시 종결되어 측정 채널 비활성. 직교.
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (REQ-20260421-041) FR-01/FR-03 — vitest coverage 수치 결정론. 본 spec 의 § 동작 1 (`vitest` binary 존재) 가 그 precondition. 직교.
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) FR-01 — CI workflow `typecheck` step. 본 spec 과 직교 (본 spec 은 로컬 hook 영역).
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028/053/058) — ESLint flat-config 6 불변식. 본 spec 은 그 설정이 의존하는 binary (`eslint`, `@eslint/js`, `typescript-eslint`) 의 존재 축. 직교.
  - `specs/30.spec/green/foundation/runtime-dep-version-coherence.md` (REQ-063) — React 런타임 계열 dep 의 3축 메이저 격차 0. 본 spec § 동작 3 의 React 계열 (`@testing-library/react`) 은 REQ-063 의 관할 — 본 spec 은 그 외 devDep 한정 (§ 동작 3.3 분기).
  - `specs/50.blocked/spec/foundation/toolchain-version-coherence.md` (REQ-061, 격리) — typescript devDep / installed / tsconfig 정합. 본 spec § 동작 3 의 typescript 메이저는 REQ-061 의 관할 — 본 spec 은 그 외 devDep 한정.
  - `.husky/pre-commit`, `.husky/pre-push` — § 동작 4 의 측정 진입점. 본 spec § 동작 1·2·3 의 실재 검증 채널.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 task 발행이 아니라 불변식 박제 — grep / `node -p` / `ls` 게이트는 baseline 실측 박제 목적. 효능 도입 task 발행 시점에 task 의 §스코프 규칙 expansion 결정).
- **grep-baseline** (REQ-064 발행 시점 HEAD=`2de68c8` + 본 spec 박제 시점 HEAD=`0305fb1` 실측 — 두 HEAD 사이 `package.json` / `node_modules` 변경 0):
  - (a) `package.json:42-63` `devDependencies` 22 항목 분류:
    - **binary 제공** (8): `vite` ^8.0.8, `vitest` ^4.1.4, `eslint` ^9.39.4, `lint-staged` ^16.4.0, `husky` ^9.0.0, `typescript` ^6.0.3 (`tsc`), `msw` ^2.13.4, (`@vitest/coverage-v8` 은 module 분류 — `vitest` CLI 의 plugin 모듈).
    - **module 제공** (11): `@eslint/js` ^9.39.4, `@vitejs/plugin-react` ^6.0.1, `@vitest/coverage-v8` ^4.1.4, `typescript-eslint` ^8.58.2, `eslint-plugin-react` ^7.37.5, `vite-plugin-svgr` ^5.2.0, `globals` ^17.5.0, `jsdom` ^29.0.2, `@testing-library/jest-dom` ^6.9.1, `@testing-library/react` ^13.4.0, `history` ^5.3.0.
    - **types 제공** (3, 본 게이트 binary 축 적용 0): `@types/node` ^25.6.0, `@types/react` ^18.3.28, `@types/react-dom` ^18.3.7.
  - (b) `node_modules/.bin/<cmd>` 실측 (binary 제공 8건):
    - `vite` → **부재** (§ 동작 1.1 위반 baseline).
    - `vitest` → **부재** (§ 동작 1.1 위반 baseline).
    - `eslint` → 존재 (symlink → `../eslint/bin/eslint.js`, mtime 2022-11-19).
    - `lint-staged` → **부재** (§ 동작 1.1 위반 baseline).
    - `husky` → 존재.
    - `tsc` (typescript) → `node_modules/typescript/bin/tsc` 존재.
    - `msw` → 존재.
  - (c) `node_modules/<pkg>/package.json` 실측 (module 제공 11건):
    - `@eslint/js` → **부재** (§ 동작 2.1 위반 baseline).
    - `@vitejs/plugin-react` → **부재** (§ 동작 2.1 위반 baseline).
    - `@vitest/coverage-v8` → **부재** (§ 동작 2.1 위반 baseline).
    - `typescript-eslint` → **부재** (§ 동작 2.1 위반 baseline).
    - `eslint-plugin-react` → 존재.
    - `vite-plugin-svgr` → **부재** (§ 동작 2.1 위반 baseline).
    - `globals` → 존재.
    - `jsdom` → 존재.
    - `@testing-library/jest-dom` → 존재.
    - `@testing-library/react` → 존재.
    - `history` → 존재.
  - (d) `node_modules/<pkg>/package.json` 실측 (binary 제공 디렉터리 — 디렉터리 축 차원):
    - `node_modules/vite/` → 부재.
    - `node_modules/vitest/` → 부재.
    - `node_modules/lint-staged/` → 부재.
    - `node_modules/eslint/` → 존재 (version `8.28.0` — § 동작 3 검증 진입점).
    - `node_modules/husky/` → 존재.
    - `node_modules/typescript/` → 존재.
    - `node_modules/msw/` → 존재.
  - (e) `node -p "require('eslint/package.json').version"` → `8.28.0` ↔ declared `^9.39.4` 메이저 하한 9 → **§ 동작 3.1 격차 1 위반 baseline** (REQ-061/063 관할 외 devDep 의 본 spec 직접 박제 사례).
  - (f) `.husky/pre-commit:1` `npx lint-staged` — § 동작 4.1 진입점. 현 baseline: `lint-staged` binary 부재로 hook 환경 진입 단계 fail → § 동작 4.1 위반 baseline.
  - (g) `.husky/pre-push:1` `npm test` — § 동작 4.2 진입점. 현 baseline: `vitest` binary 부재로 `npm test` 즉시 종결 → § 동작 4.2 위반 baseline.
  - (h) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/devbin-install-integrity.md` — 본 spec 박제 시점 매치는 § 동작 6 정의 본문 / 자기 검증 게이트 본문 / 외부 라이브러리 API 인용 / 템플릿 메타 텍스트 카테고리에 한정 — § 동작 6.1 자기 검증 baseline.
- **rationale**: gate (a) 는 § 동작 1·2·3 의 분모 분류 (binary 8 / module 11 / types 3). gate (b)(c)(d) 는 § 동작 1·2 의 위반 baseline (binary 3건 부재 / module 5건 부재 / 디렉터리 7건 중 3건 부재). gate (e) 는 § 동작 3 의 메이저 격차 1 위반 baseline (REQ-061/063 관할 외 devDep — eslint). gate (f)(g) 는 § 동작 4 의 위반 baseline (hook 환경 진입 단계 fail — § 동작 1.1 의 결과). gate (h) 는 § 동작 6.1 자기 검증 baseline. 모든 baseline 은 시점 의존 수치 (부재 8건 / 격차 1) 가 아닌 **존재 + 격차 0 동시 성립 효능 자체** 가 본 spec 의 박제 대상이며, baseline 수치는 위반 상태 식별 보조 — NFR-01 시점 비의존 정합.

## 테스트 현황
- [ ] § 동작 1.1 binary 제공 devDep 의 `node_modules/.bin/<cmd>` PATH resolve 가능성 — 출력 빈 줄.
- [ ] § 동작 1.2 각 binary `--version` exit 0.
- [ ] § 동작 1.3 binary 부재 시 `ls -la node_modules/.bin/<cmd>` 단일 진단 식별.
- [ ] § 동작 1.4 binary 목록 `devDependencies` 추종.
- [ ] § 동작 2.1 module 제공 devDep 의 `node_modules/<pkg>/package.json` 존재 — 출력 빈 줄.
- [ ] § 동작 2.2 module 부재 시 `ls node_modules/<pkg>/` 단일 진단 식별.
- [ ] § 동작 2.3 module 목록 `devDependencies` 추종.
- [ ] § 동작 3.1 installed 메이저 = declared 메이저 하한 (REQ-061/063 관할 외 devDep).
- [ ] § 동작 3.2 격차 1 이상 검출 시 `npm ci` 채널 검출.
- [ ] § 동작 3.3 REQ-061/063 중복 시 그 req 우선.
- [ ] § 동작 3.4 특정 메이저 숫자 본문 효능 평서문 하드코딩 부재.
- [ ] § 동작 4.1 `.husky/pre-commit` 의 `npx lint-staged` 환경 진입 frame 도달.
- [ ] § 동작 4.2 `.husky/pre-push` 의 `npm test` → `vitest` 환경 진입 frame 도달.
- [ ] § 동작 4.3 hook 본문 코드 검사 결과 자체 실패는 본 spec 음영 외.
- [ ] § 동작 4.4 환경 단계 도달 부재는 § 동작 1/2/3 위반 신호.
- [ ] § 동작 5.1~5.4 단일 진단 명령으로 위반 카테고리 식별.
- [ ] § 동작 6.1 `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/devbin-install-integrity.md` 매치가 § 동작 6 카테고리 (i)~(iv) 내부에 한정.
- [ ] § 동작 6.2 수단 라벨이 효능 평서문에 박제된 spec 은 `50.blocked/spec/` 격리 대상.
- [ ] § 동작 7.1 devDep 신규 추가 시 본 게이트 자동 추종.
- [ ] § 동작 7.2 특정 패키지 이름 본문 효능 평서문 하드코딩 부재.
- [ ] § 동작 7.3 `@types/*` 는 디렉터리 존재 축만 적용 (binary 축 0).

## 수용 기준
- [ ] (Must, FR-01) binary 제공 devDep 각각의 `node_modules/.bin/<cmd>` PATH resolve 가능성 + `<cmd> --version` exit 0 — § 동작 1.
- [ ] (Must, FR-02) module 제공 devDep 각각의 `node_modules/<pkg>/package.json` 존재 — § 동작 2.
- [ ] (Must, FR-03) installed 메이저 = declared 메이저 하한 (REQ-061/063 관할 외 devDep) — § 동작 3.
- [ ] (Must, FR-06) 본 spec 본문에 수단 라벨 ("기본값" / "권장" / "우선" / "default" / "best" / "root cause" / "가장 효과적") 매치가 § 동작 6 카테고리 (i)~(iv) 내부에 한정 — § 동작 6.1 자기 검증.
- [ ] (Should, FR-04) `.husky/pre-commit` / `.husky/pre-push` 환경 진입 단계 도달 — § 동작 4.
- [ ] (Should, FR-05) 단일 진단 명령으로 위반 카테고리 식별 — § 동작 5.
- [ ] (Should, FR-07) devDep 변경 시 본 게이트 자동 추종 — § 동작 7.
- [ ] (NFR-01) 본 spec 본문에 특정 패키지 이름 / 메이저 숫자가 효능 평서문에 하드코딩되지 않음 — baseline 수치는 §스코프 규칙 grep-baseline 에만 박제 (위반 상태 식별 보조).
- [ ] (NFR-02) 본 효능 박제는 단일 진단 명령 (`ls` / `node -p` / `command -v` / `npm ls` 1-line) 으로 위반 카테고리 식별 가능 — 복수 게이트 AND 필수 시 spec 박제 분기 명시.
- [ ] (NFR-03) 결과 효능 (devbin 존재 + binary resolve + 메이저 격차 0) 만 박제. 1회성 install 진단·릴리스·incident 귀속 patch 배제.
- [ ] (NFR-04) `dependency-bump-gate` (bump 직후 4 scripts exit 0) / `coverage-determinism` (vitest 측정 결정론) / REQ-061/063 (typescript / react 메이저 정합) 의 **precondition**. 본 spec 미충족 시 그 후속 게이트는 measurement-impossible 상태.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-064 흡수). `package.json` `devDependencies` 22 항목의 (i) `node_modules/<pkg>/` 디렉터리 존재 + (ii) `node_modules/.bin/<cmd>` PATH resolve 가능성 + (iii) installed 메이저 ↔ declared 메이저 격차 0 + (iv) hook 환경 진입 가능성 상시 불변식 박제 (§ 동작 1~7). REQ-061 (toolchain-version-coherence, 격리) / REQ-063 (runtime-dep-version-coherence, 본 세션 직전 흡수) 의 **버전 일치** 축과 직교하는 **존재 + binary resolve** 축. `dependency-bump-gate` (bump 직후 결과) / `coverage-determinism` (vitest 결정론) 의 precondition 박제. baseline 실측 @HEAD=`0305fb1` (REQ-064 발행 HEAD=`2de68c8` 와 package.json / node_modules 영향 0): (a) devDependencies 22 항목 분류 binary 8 / module 11 / types 3 / (b) binary 부재 3건 (vite, vitest, lint-staged), 존재 4건 (eslint, husky, tsc, msw) / (c) module 부재 5건 (@eslint/js, @vitejs/plugin-react, @vitest/coverage-v8, typescript-eslint, vite-plugin-svgr), 존재 6건 / (d) 디렉터리 부재 3건 (vite, vitest, lint-staged) / (e) eslint installed 8.28.0 ↔ declared ^9.39.4 메이저 격차 1 (REQ-061/063 관할 외 devDep) / (f)(g) .husky/pre-commit·pre-push 환경 진입 단계 fail (§ 동작 1.1 의 결과) / (h) § 동작 6.1 수단 라벨 매치는 § 동작 6 카테고리 (i)~(iv) 내부 한정. 수단 중립 정책 (§ 동작 6.1 자기 검증 — `기본값|권장|우선|default|best|root cause|가장 효과적` 매치 카테고리 분류). consumed req: `specs/20.req/20260517-devbin-install-integrity.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `dependency-bump-gate.md` (bump 직후 4 scripts exit 0 precondition), `coverage-determinism.md` (vitest 측정 채널 precondition), `regression-gate.md` (CI typecheck step 직교 — 본 spec 은 로컬 hook 영역), `tooling.md` (eslint 설정의 binary 의존 precondition), `runtime-dep-version-coherence.md` (REQ-063, React 계열 메이저 정합과 § 동작 3.3 직교 분기), `toolchain-version-coherence` (REQ-061 격리, typescript 메이저 정합과 § 동작 3.3 직교 분기), `.husky/pre-commit`·`.husky/pre-push` (§ 동작 4 측정 진입점). RULE-07 자기검증 — § 동작 1~7 모두 평서형·반복 검증 가능 (`ls` + `node -p` + `command -v` 1-line)·시점 비의존 (특정 패키지 이름 / 메이저 숫자는 §스코프 규칙 baseline 에만 박제, 효능 평서문은 "존재" + "격차 0" 자체)·incident 귀속 부재 (devbin install 정합은 dev 환경의 상시 성질). RULE-06 §스코프 규칙 gate (a)~(h) 8건 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/devbin-install-integrity.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. | 전 섹션 (신규) |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/05/17/req/20260517-devbin-install-integrity.md` (REQ-064 — 본 세션 mv).
- **선행 req (메타 패턴 공유, 직교 축)**:
  - `specs/60.done/2026/05/17/req/20260517-toolchain-version-coherence.md` (REQ-061) — typescript devDep 버전 정합. 본 spec 은 그 음영지대 (디렉터리·binary 존재) 축 확장.
  - `specs/60.done/2026/05/17/req/20260517-runtime-dep-version-coherence.md` (REQ-063) — React 런타임 버전 정합. 본 spec 은 그 precondition (devbin 존재).
- **관련 spec (역의존 — 모두 직교 축)**:
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) FR-01 — `npm ci` 직후 4 scripts exit 0. 본 spec 은 그 **precondition**.
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (REQ-20260421-041) FR-01 — `vitest` 측정 결정론. 본 spec § 동작 1 (`vitest` binary 존재) 가 precondition.
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) FR-01 — CI workflow `typecheck` step. 직교 (본 spec 은 로컬 hook 영역).
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028/053/058) — ESLint 설정 6 불변식. 본 spec 은 그 설정이 의존하는 binary 의 존재 축. 직교.
  - `specs/30.spec/green/foundation/runtime-dep-version-coherence.md` (REQ-063) — React 런타임 3축 메이저 정합. § 동작 3.3 직교 분기 (React 계열 메이저는 REQ-063 관할, 본 spec 은 그 외 devDep 한정).
  - `specs/50.blocked/spec/foundation/toolchain-version-coherence.md` (REQ-061, 격리) — typescript devDep 정합. § 동작 3.3 직교 분기 (typescript 메이저는 REQ-061 관할).
- **외부 레퍼런스**:
  - npm CLI 동작 — `https://docs.npmjs.com/cli/v10/commands/npm-ci` — lockfile 무결성 검증.
  - lint-staged v16 ESM 전환 — `https://github.com/lint-staged/lint-staged/blob/main/CHANGELOG.md` — v16 부터 ESM-only.
  - husky v9 — `https://typicode.github.io/husky/` — `prepare: husky` 가 npm install 의존.
- **현장 근거 (HEAD=`2de68c8` REQ 발행 + `0305fb1` spec 박제, package.json / node_modules 영향 0)**:
  - `package.json:42-63` `devDependencies` 22 항목.
  - `node_modules/.bin/vite` / `vitest` / `lint-staged` → 부재.
  - `node_modules/.bin/eslint` / `husky` / `msw` → 존재.
  - `node_modules/typescript/bin/tsc` → 존재.
  - `node_modules/@eslint/js` / `@vitejs/plugin-react` / `@vitest/coverage-v8` / `typescript-eslint` / `vite-plugin-svgr` → 부재.
  - `node_modules/eslint-plugin-react` / `globals` / `jsdom` / `@testing-library/jest-dom` / `@testing-library/react` / `history` → 존재.
  - `node -p "require('eslint/package.json').version"` → `8.28.0` (declared `^9.39.4`, 메이저 격차 1).
  - `.husky/pre-commit:1` `npx lint-staged`, `.husky/pre-push:1` `npm test`.
- **RULE 준수**:
  - RULE-07: 7개 불변식 (§ 동작 1~7) 모두 시점 비의존·평서형·반복 검증 가능 (`ls` + `node -p` + `command -v` + `npm ls` 1-line)·incident 귀속 부재. 수단 라벨 박제 0 (§ 동작 6.1 자기 검증 — 매치는 카테고리 (i)~(iv) 내부 한정).
  - RULE-06: §스코프 규칙 grep-baseline 8개 gate (a)~(h) 실측 박제 @HEAD=`0305fb1`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/devbin-install-integrity.md` 신규 create + req mv `20.req/* → 60.done/req/`).
