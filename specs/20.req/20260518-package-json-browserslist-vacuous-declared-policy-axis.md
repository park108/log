# `package.json` `browserslist` 박제 토큰 ↔ build pipeline 측 실재 소비 채널 표면 vacuous-declared-policy 결과 효능 시스템 불변식

> **ID**: REQ-20260518-024
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요

`package.json:37-48` 의 `browserslist` 키는 2 env (`production`, `development`) × 각각 3 쿼리 (총 6 쿼리 토큰) 로 박제된 **build target 정책 선언** 이다. 본 토큰은 표준 browserslist consumer (예: `@babel/preset-env` / `autoprefixer` / `postcss-preset-env` / `eslint-plugin-compat` / 일부 Vite 플러그인의 `targets` 옵션) 가 자동으로 읽어 build artifact 의 syntax/feature lowering 또는 polyfill 주입 결정에 사용되는 단일 진실 공급원으로 동작하도록 설계된 메타 토큰이다. 본 req 는 (a) `package.json` 의 `browserslist` 박제가 **소비자 채널 ≥ 1 hit** 인지 (= 실재 build 측 토큰 결정에 영향) — vacuous-declared-policy 가 아닌지의 결과 효능 계약을 평서문 시스템 불변식으로 박제할 것을 요청한다. 박제된 정책 토큰이 build/lint/test 어느 표면에서도 소비되지 않으면 (a) 신규 기여자/agent 가 보고 "browserslist 정책이 active 하다" 고 가정 시 진단·계획 오류 surface 누적, (b) 토큰을 갱신해도 build artifact·polyfill 표면 0 변화 (silent policy drift), (c) consumer 도입 직전에 토큰을 검토하지 않으면 stale 쿼리가 곧바로 active 정책으로 전환되며 회귀. 본 req 는 결과 효능 (정책 토큰 ↔ 소비 채널 ≥ 1 hit + 자체 진단 가능) 만 박제하며, 해소 수단 (소비자 도입 vs `browserslist` 키 제거 vs `.browserslistrc` 외부화) 선택 및 발화 채널 (CI / pre-push / `package.json` `check:*` script) 선정은 inspector/planner 영역.

## 배경

- `package.json:37-48` 박제 표면:
  - `"browserslist": { "production": [">0.2%", "not dead", "not op_mini all"], "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"] }` — 2 env × 3 쿼리 = 6 쿼리 토큰.
- 실재 소비 채널 hit 분포 (현 baseline):
  - `vite.config.js` 전수 grep `browserslist` → 0 hit (`grep -n "browserslist" /Users/park108/Dev/log/vite.config.js` → no match).
  - `vite.config.js:48-51` `build` 블록 `target` 키 미선언 (`grep -n "target:" /Users/park108/Dev/log/vite.config.js` → no match — vite 8 기본값 `'baseline-widely-available'` 으로 결정).
  - `tsconfig.json:3` `"target": "ES2020"` — TypeScript 의 자체 ECMAScript 출력 타깃 (browserslist 비참조, 별 axis).
  - `package.json:52-74` `devDependencies` 전수 — `@babel/preset-env` / `autoprefixer` / `postcss-preset-env` / `eslint-plugin-compat` 등 표준 browserslist consumer 0 hit (`grep -nE "babel|autoprefixer|postcss-preset|eslint-plugin-compat" /Users/park108/Dev/log/package.json` → 0 match).
  - `/Users/park108/Dev/log/.browserslistrc` 부재 (외부화된 정책 파일 없음 — `package.json:37` 단일 표면).
- 박제 토큰이 build artifact 결정 채널 0 hit = **vacuous declared policy** 상태. 정책 갱신/제거/유지 어느 방향에도 build/lint/test 표면 0 변화 (silent policy island).
- 자매 spec: `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421 계열) — 의존성 bump 직후 lint/test/build 회귀 0 + React deprecated runtime warning 0 한정. browserslist 표면 미박제 (별 axis — bump 게이트 vs 박제 토큰 active 보장).
- 자매 spec: `specs/30.spec/blue/foundation/tooling.md` — Vite/oxc/esbuild/eslint 도구 채널 박제. `browserslist` 미박제 (별 axis — 도구 식별 vs 도구 입력 정책).
- 자매 req: `specs/20.req/20260518-vitest-coverage-exclude-pattern-vacuous-zero-axis.md` (REQ-20260518-012) — vitest coverage exclude 5 glob 패턴 vacuous-zero 결과 효능 axis. 같은 "박제 정책 ↔ 실재 매치/소비 표면" 패턴이나 다른 영역 (test coverage exclude vs build target policy) — 직교.
- 자매 done: `specs/60.done/2026/05/17/req/20260517-node-runtime-version-3axis-coherence.md` (REQ-20260517) — Node 런타임 버전 3축 정합. 같은 "정책 토큰 cross-surface" 패턴이나 다른 토큰 (Node 런타임 vs 브라우저 타깃) — 직교.

## 목표

- In-Scope:
  - `package.json` 의 `browserslist` 박제 토큰이 build/lint/test 표면 중 **≥ 1 채널에서 실재 소비** 된다는 결과 효능 게이트.
  - vacuous-declared-policy 상태 (모든 소비 채널 0 hit) 의 자체 진단 가능성.
  - 박제 토큰이 6 쿼리 (2 env × 3 쿼리) baseline cardinality 보존.
- Out-of-Scope:
  - 소비 채널 선택 (어느 consumer 를 도입할지 — `@babel/preset-env` / `autoprefixer` / Vite `build.target` `'modules'` 등 중 택일) — inspector/planner 영역.
  - browserslist 쿼리 콘텐츠 결정 (왜 `>0.2%` 인지, 왜 `not op_mini all` 인지) — 별 axis (UX 정책 / 지원 정책).
  - `.browserslistrc` 외부화 vs `package.json` inline 선택 — 별 axis (정책 표면 위치).
  - 발화 채널 (CI / pre-push / `check:*` script / build-time runtime parse) — inspector/planner 영역.
  - `tsconfig.json:3` `target: "ES2020"` ↔ `browserslist` 의미 동치 — 별 axis (TypeScript 출력 타깃은 browserslist 비참조 — 독립 toolchain).
  - 의존성 bump 직후 회귀 게이트 — REQ-20260421 계열 (`dependency-bump-gate.md`) 영역.

## 기능 요구사항

| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `package.json:37` `browserslist` 키 존재 + JSON 객체 타입 + `production` / `development` 양 env 키 (각각 배열 타입) — 박제 표면 cardinality 보존. | Must |
| FR-02 | `package.json:37-48` 박제 토큰의 **실재 소비 채널 hit 합 ≥ 1** — build/lint/test/CI 어느 한 표면에서 토큰이 실제로 읽히고 build artifact·polyfill·lint rule·runtime 동작에 영향을 미친다는 결과 효능 (vacuous-declared-policy 부재). | Must |
| FR-03 | FR-02 의 소비 채널 hit ≥ 1 상태가 **자체 진단 가능** — 진단 명령 (예: `npx browserslist` 출력 비교, build artifact target ECMAScript 버전 측정, `vite build` `--debug` 출력에 browserslist 입력 흔적 ≥ 1 hit, postcss-preset-env / babel-preset-env / autoprefixer 등 consumer 모듈의 import resolution ≥ 1 hit 중 택일) 으로 발화 채널에서 확인 가능. | Must |
| FR-04 | vacuous-declared-policy 진입 (모든 소비 채널 0 hit) 시 fail-fast 또는 명시적 reporting — silent policy island 진입 차단. | Should |
| FR-05 | 박제 토큰 cardinality 변화 (env 추가/제거, 쿼리 수 변동) 시 소비 채널 hit 재검증 — drift 발생 시 fail-fast. | Should |

## 비기능 요구사항

| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 자체 진단 | 정합 위반 시 stdout/stderr 에 (a) 박제 토큰 표면 (`package.json:browserslist`), (b) 측정한 소비 채널 hit 수, (c) vacuous-zero 여부 — 3 정보 모두 노출. |
| NFR-02 | 측정 결정론 | 동일 코드·동일 toolchain 환경 반복 실행 시 소비 채널 hit 측정 결과 동일 (range 0). |
| NFR-03 | 직교성 | 본 req 는 정책 토큰 active 보장 한정. `tsconfig.json:3` `target` (별 axis), Vite `build.target` 콘텐츠 결정 (별 axis), browserslist 쿼리 의미 (별 axis), 의존성 bump 회귀 (REQ-20260421 계열), test coverage exclude vacuous-zero (REQ-20260518-012) 모두 직교. |
| NFR-04 | 추적성 | spec 박제 후 `grep -rn "REQ-20260518-024" specs/30.spec/{green,blue}/foundation/` → 2 hit 이상 (§관련 요구사항 + §변경 이력). |
| NFR-05 | 진단 자체-포함 | 본 req 의 fixture 자체가 `browserslist` 문자열을 박제 카운트에 포함하지 않도록 자체 진단 제외 규약 박제. |

## 수용 기준

- [ ] (FR-01) `package.json:37` `browserslist` 키 존재 + JSON 객체 + `production` / `development` 양 env 배열 박제 유지.
- [ ] (FR-02) `package.json` `browserslist` 박제 토큰의 실재 소비 채널 hit 합 ≥ 1 (현 baseline 에서 0 hit 임 — vacuous declared policy 상태 자체 진단).
- [ ] (FR-03) FR-02 hit 측정 명령이 발화 채널 (CI / pre-push / `check:*` script) 에 ≥ 1 회 부착 + 결정론 (NFR-02) 만족.
- [ ] (FR-04) 소비 채널 0 hit 진입 시 fail-fast 또는 명시적 warn — silent 진행 차단.
- [ ] (FR-05) 박제 토큰 cardinality drift 시 FR-02/FR-03 재검증 자동 트리거.
- [ ] (NFR-01) 정합 위반 진단 출력에 박제 토큰 표면 / 소비 채널 hit 수 / vacuous 여부 3 정보 모두 노출.
- [ ] (NFR-04) 박제 후 `grep -rn "REQ-20260518-024" specs/30.spec/{green,blue}/foundation/` → 2 hit 이상.

## 참고

- `package.json:37-48` — 본 req 의 진실 공급원 (`browserslist` 박제 표면).
- `vite.config.js:48-51` — Vite `build` 블록 `target` 미선언 (browserslist 비참조 baseline).
- `tsconfig.json:3` — TypeScript `target: "ES2020"` (browserslist 비참조 — 별 toolchain).
- `package.json:52-74` — `devDependencies` 전수 (표준 browserslist consumer 0 hit).
- `specs/30.spec/blue/foundation/dependency-bump-gate.md` — 의존성 bump 회귀 게이트 (별 axis).
- `specs/30.spec/blue/foundation/tooling.md` — Vite/oxc/esbuild/eslint 도구 채널 박제 (별 axis — 도구 식별).
- `specs/20.req/20260518-vitest-coverage-exclude-pattern-vacuous-zero-axis.md` (REQ-20260518-012) — coverage exclude vacuous-zero (직교 영역, 동일 패턴).
- W3C / [browserslist 공식 README](https://github.com/browserslist/browserslist#queries) — env 키 / 쿼리 문법 / 소비자 자동 발견 규약.
- 외부 사양: [Vite Config — `build.target`](https://vitejs.dev/config/build-options.html#build-target) — Vite 8 의 `target` 기본값은 `'baseline-widely-available'` 이며 `browserslist` 자동 참조 아님 (Vite 별 toolchain).
