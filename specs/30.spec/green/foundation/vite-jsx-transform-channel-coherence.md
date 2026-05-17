# vite JSX 변환 채널 단일 책임 — `@vitejs/plugin-react` ↔ `oxc.jsx` ↔ `optimizeDeps.esbuildOptions.loader` 의 변환 진입점 명시 + 이중 변환 부재 상시 불변식

> **위치**: `vite.config.js` (`plugins[react]`, `oxc`, `optimizeDeps.esbuildOptions.loader` 3 블록), `tsconfig.json:7` `"jsx"` (직교 의미 동치 참조), `vitest` 가 흡수하는 vite config (test runtime).
> **관련 요구사항**: REQ-20260517-066
> **최종 업데이트**: 2026-05-17 (by inspector, REQ-066 흡수 — vite JSX 변환 채널 책임 분담 + 이중 변환 부재 메타 패턴 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-066 발행 시점 HEAD=`389afee`, 본 spec 박제 시점 HEAD=`b96bb5e`).

## 역할
`vite.config.js` 가 동일 JSX/TSX 소스에 대해 등록한 **세 변환 채널** — (a) `plugins: [react({ include: ... })]` (`@vitejs/plugin-react` — JSX 변환 + Fast Refresh dev 주입), (b) `oxc: { include: ..., jsx: { runtime: 'automatic' } }` (Vite 8 내장 oxc 트랜스포머 — sourcemap/SWC 대체 경로 + jsx runtime 모드 명시), (c) `optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } }` (esbuild dep prebundle — `node_modules` 의 `.js` 안 JSX 허용, src 변환 단계 외부) — 의 **책임 분담** 과 **JSX 변환 최종 진입점 단일성** 과 **JSX runtime 모드 일치** 가 spec 차원에서 박제됨을 **반복 검증 가능한 상시 불변식** 으로 박제. 본 정합이 깨지면 (1) `automatic` runtime 의 `react/jsx-runtime` import 가 둘 이상의 채널에 의해 중복 삽입되어 production bundle 의 dead code 증가, (2) `@vitejs/plugin-react` Fast Refresh 주입 ↔ oxc jsx 변환 사이 의미 모호, (3) `vitest` 가 vite config 를 흡수하므로 test runtime 변환 채널이 build runtime 과 분기, (4) `@vitejs/plugin-react-swc` 류 추가 채널 도입이 spec 차원 사전 검출 없이 잠입한다. 의도적으로 하지 않는 것: 세 채널 중 어느 채널의 제거/유지/추가 결정 (RULE-07 수단 중립 — 채널 분담 박제 + 이중 변환 부재 효능만), `optimizeDeps.esbuildOptions.loader` 의 `.js` JSX 허용 정책 자체 (`node_modules` legacy 호환 의도 진단은 별 task), `tsconfig.json:7` `"jsx": "react-jsx"` 변경 (typecheck 모드 결정 — 본 spec 은 vite 측 채널 한정), `eslint.config.js:67` `react/react-in-jsx-scope: 'off'` (classic runtime 호환성 lint — REQ-028 영역), Vite 7 → 8 migration 등 1회성 결정, `src/index.jsx` / `src/App.jsx` 의 `import React from 'react'` 명시 import 제거 (classic ↔ automatic 잔존 표면 — 별 task), Vite 메이저 bump 결정 (dependency-bump-gate / runtime-dep-version-coherence 직교), React Server Components 도입 결정.

## 공개 인터페이스
- 소비 파일:
  - `vite.config.js` `plugins` 배열 — 채널 (a) `@vitejs/plugin-react` 호출 + (옵션) Fast Refresh 자동 동작.
  - `vite.config.js` `oxc` 블록 — 채널 (b) Vite 8 내장 oxc 트랜스포머의 jsx runtime 모드 명시.
  - `vite.config.js` `optimizeDeps.esbuildOptions.loader` 블록 — 채널 (c) dep prebundle 단계의 `.js` JSX loader 허용.
  - `vite.config.js` `test` 블록 — `vitest` 가 흡수하는 test runtime 의 변환 채널 (별도 `transformMode` / `test.transform` 분기 부재 박제 대상).
  - `tsconfig.json:7` `"jsx"` — typecheck 측 의미 동치 참조 (직교 — 본 spec 비박제).
  - `build/assets/*.js` — production build 산출물 (FR-03 의 jsx-runtime import 횟수 측정 진입점).
- 검출 명령 (반복 가능, 단일 진단 단위 — NFR-02 정합):
  - `grep -cE "react\(|oxc:|esbuildOptions" vite.config.js` — 채널 등록 수 1-line.
  - `grep -nE "include:" vite.config.js` — include 매처 라인 추출.
  - `grep -nE "runtime\s*:\s*'(automatic|classic)'" vite.config.js` — jsx runtime 모드 추출.
  - `grep -nE "loader\s*:\s*\{\s*'\.js'\s*:\s*'jsx'\s*\}" vite.config.js` — esbuild loader 표면 검출.
  - `grep -nE "transformMode|test\.\s*transform" vite.config.js` — test 전용 변환 분기 부재 검증.
  - `npm run build && grep -c "react/jsx-runtime" build/assets/*.js` — production 산출물 jsx-runtime import 횟수 측정.

## 동작

### 1. 변환 채널 등록 수 명시 불변식 (REQ-066 FR-01)
`vite.config.js` 의 JSX/TSX 변환에 영향을 주는 채널은 **명시 등록** 되어야 하며, 채널 등록 수가 spec §스코프 규칙 grep-baseline 에 박제된다. 본 불변식의 결과:

- (1.1) `grep -cE "react\(|oxc:|esbuildOptions" vite.config.js` 출력값이 §스코프 규칙 grep-baseline (a) 의 박제 수치와 동일.
- (1.2) 등록 수 증가 (예: `@vitejs/plugin-react-swc` 추가 / 별도 oxc 트랜스포머 토큰 추가) 는 본 spec 갱신 신호 — 채널 책임 분담 (§ 동작 2) 도 동시 갱신 필요.
- (1.3) 등록 수 축소 (예: 채널 (b) oxc 블록 제거 / 채널 (c) esbuildOptions 블록 제거) 는 본 spec 갱신 신호 — 분담 표가 자동으로 vacuous 가 되지 않도록 § 동작 2 의 책임 매핑이 함께 축소 박제되어야 함.
- (1.4) 채널 등록 수 자체는 시점 수치 (현 baseline 3) 이지만 본문 효능 평서문은 "채널 등록 수 = N (baseline 박제)" 로 표현 — NFR-01 시점 비의존 정합.

### 2. 세 채널 책임 분담 박제 불변식 (REQ-066 FR-02)
세 채널의 책임 분담이 spec 본문에 평서형으로 박제된다 — (a) `@vitejs/plugin-react` 는 **JSX 변환 + React Fast Refresh dev 주입**, (b) `oxc.jsx` 는 **vite 8 내장 oxc 트랜스포머의 jsx runtime 모드 명시 채널 (sourcemap/SWC 대체 경로)**, (c) `optimizeDeps.esbuildOptions.loader` 는 **`node_modules` dep prebundle 단계의 `.js` JSX 허용 (src 변환 단계 외부)**. 본 불변식의 결과:

- (2.1) 세 채널 각각이 vite 변환 파이프라인의 **다른 단계** (plugin transform / 최상위 transformer / dep prebundle loader) 를 담당 — 단계 중복 0.
- (2.2) 본 분담은 vite/plugin-react 메이저 bump 자체를 강제하지 않으며 (FR-07), 메이저 bump 후 분담 의미가 변경되면 본 spec 갱신 신호.
- (2.3) 채널 (a)(b) 가 모두 `.jsx/.tsx` 표면을 매치하지만 vite 의 변환 파이프라인 (plugin transform 훅 → oxc 최상위 transformer) 의 우선순위에 의해 단일 진입점이 결정 — 본 spec 은 그 우선순위 자체를 강제하지 않으며, 최종 산출물의 jsx-runtime import 횟수가 src JSX 파일 수와 격차 0 임으로 효능 검증 (§ 동작 3).
- (2.4) 채널 (c) 는 src 의 `.js` 파일이 아닌 `node_modules` 의 `.js` 안 JSX 허용 목적 — `optimizeDeps` 의 적용 단계 자체에 의해 src 변환 단계와 자연 분리 (§ 동작 5).

### 3. 이중 변환 부재 효능 불변식 (REQ-066 FR-03)
동일 JSX 노드가 둘 이상의 채널에 의해 중복 변환되지 않는다 — production build 산출물 (`build/assets/*.js`) 의 `react/jsx-runtime` import 횟수가 src 의 JSX 사용 파일 수와 격차 0. 본 불변식의 결과:

- (3.1) `npm run build && grep -c "react/jsx-runtime" build/assets/*.js` 출력의 합계가 src JSX 사용 파일 수 (별도 측정 — `grep -rl "<[A-Z]" src --include="*.jsx" --include="*.tsx" | wc -l`) 와 격차 0.
- (3.2) 두 채널이 동일 노드를 변환하면 jsx-runtime import 가 중복 삽입되어 measure 가 격차 1 이상으로 검출 — `bundle dead code 증가` 시그널.
- (3.3) 본 측정은 build 후 1회 — 본 spec 은 measurement 절차를 박제하며, 실제 회귀 게이트 (CI / pre-push) 도입은 후행 task 책임 (수단 중립).
- (3.4) 본 불변식의 위반은 § 동작 1 의 채널 등록 수 또는 § 동작 2 의 책임 분담이 깨졌음을 시사 — 단일 진단 채널 (build 산출물 grep) 로 위반 식별.

### 4. JSX runtime 모드 vite 측 단일성 불변식 (REQ-066 FR-04)
JSX runtime 모드 (`automatic` ↔ `classic`) 의 vite 측 명시는 oxc 블록 한 곳에 단일 박제 — `oxc.jsx.runtime` 값이 §스코프 규칙 grep-baseline (b) 의 박제 값과 일치한다. `@vitejs/plugin-react` 는 자체 runtime 옵션을 명시하지 않아 plugin 기본값 (`automatic`) 을 자동 추종 — 두 채널 사이 runtime 모드 충돌 부재. 본 불변식의 결과:

- (4.1) `grep -nE "runtime\s*:\s*'(automatic|classic)'" vite.config.js` 출력이 1 hit (oxc 블록 한 곳) — 다중 채널의 runtime 모드 명시 0.
- (4.2) `@vitejs/plugin-react` 호출이 `react({ jsxRuntime: ... })` 인수 명시를 갖지 않음 — 명시 추가는 본 spec 갱신 신호 (4.1 의 1 hit 가정이 깨짐).
- (4.3) `tsconfig.json:7` `"jsx": "react-jsx"` 는 typecheck 측 의미 동치 (`react/jsx-runtime` 자동 import) — 본 spec 비박제 (별 축, REQ-028 영역).
- (4.4) plugin-react 메이저 bump 가 기본 runtime 모드를 변경하면 (예: 7.x 가 classic 기본) 본 불변식의 vacuous-coupling 위험 — `dependency-bump-gate` FR-01 의 `npm run build` exit 0 + bundle 산출 검증으로 검출.

### 5. esbuild loader 적용 단계 분리 불변식 (REQ-066 FR-05)
`optimizeDeps.esbuildOptions.loader: { '.js': 'jsx' }` 의 적용 범위는 **dep prebundle 단계 한정** — `src/**/*.js` 의 JSX 파일은 본 loader 의 의도 대상 외 (별 변환 채널 (a) 가 처리). 본 분리는 vite 의 `optimizeDeps` 적용 단계 (esbuild) 와 src 변환 단계 (`transform` 훅) 의 분리 자체에 의해 박제. 본 불변식의 결과:

- (5.1) `grep -nE "loader\s*:\s*\{\s*'\.js'\s*:\s*'jsx'\s*\}" vite.config.js` 출력이 1 hit (`optimizeDeps.esbuildOptions.loader` 한 곳) — src 변환 단계로 누출 0.
- (5.2) `src/**/*.js` 의 JSX 파일이 존재한다면 채널 (a) `@vitejs/plugin-react` 의 `include: /\.(js|jsx|ts|tsx)$/` 매처가 그 파일을 처리 — 채널 (c) 가 src 단계로 침투 0.
- (5.3) `node_modules` legacy 패키지가 `.js` 안에 JSX 를 보유한 경우에만 채널 (c) 의 의도 활성 — 본 spec 은 그 의도 활성 자체를 강제하지 않으며 (수단 중립), 분리 자체만 박제.
- (5.4) 본 분리는 `dependencies` 8 항목 중 실제 `.js` JSX 보유 패키지가 0 이어도 vacuous — 분리 효능은 채널 (c) 가 src 단계로 침투하지 않음 자체.

### 6. build runtime ↔ test runtime 변환 채널 동일성 불변식 (REQ-066 FR-06)
`vitest` 가 vite config 를 그대로 흡수하므로 본 spec 의 채널 분담 박제는 **build runtime ↔ test runtime 양쪽에 동일 적용**. test 시점에 별도 채널이 추가되거나 (예: `test.transformMode` / `test.transform` 등) 채널 우선순위가 분기되지 않는다. 본 불변식의 결과:

- (6.1) `grep -nE "transformMode|test\.\s*transform" vite.config.js` 출력 0 hit — test 전용 변환 채널 분기 부재.
- (6.2) `vitest` 의 jsx-runtime import 동작이 build 산출물의 jsx-runtime import 패턴과 동일 — 분기 검출 시 본 spec 갱신 신호.
- (6.3) `test` 블록 내부에 `setupFiles` / `environment` / `coverage` 등 test-only 옵션은 본 불변식의 음영 외 — 변환 채널 자체에 영향 0.

### 7. 채널 분담 자동 추종 불변식 (REQ-066 FR-07)
본 spec 의 채널 분담 박제는 `@vitejs/plugin-react` / `vite` 의 메이저 bump 자체를 강제하지 않는다 — 메이저 bump 후 채널 분담 의미가 변경되면 본 spec 갱신 신호 (§ 동작 1 의 채널 등록 수 또는 § 동작 2 의 책임 매핑 변경). 본 불변식의 결과:

- (7.1) vite 8 → 9 bump 후 oxc 트랜스포머의 jsx runtime 옵션 키가 변경되면 § 동작 4 의 1 hit baseline 이 깨져 본 spec 갱신 필요.
- (7.2) `@vitejs/plugin-react` 6 → 7 bump 후 Fast Refresh ↔ oxc 협업 인터페이스가 변경되면 § 동작 2 의 책임 분담 평서문 갱신 필요.
- (7.3) 본 spec 은 메이저 bump 의 시점·결정을 박제하지 않으며 (`dependency-bump-gate` / `runtime-dep-version-coherence` 직교), bump 후의 채널 분담 갱신 의무만 박제.

### 8. 변환 채널 선언 단일성 vs 산출 동등성 직교 불변식 (REQ-066 FR-08)
본 spec 은 변환 채널 **선언 단일성** (등록 수 + 책임 분담 + runtime 모드 단일성) 만 박제하며, 산출 (build artifact) 의 실제 변환 동등성은 별 게이트 (`dependency-bump-gate` FR-01 의 `npm run build` exit 0 + bundle 크기 회귀 검출 — 본 spec 외부) 가 부담. 본 불변식의 결과:

- (8.1) 본 spec § 동작 3 의 jsx-runtime import 횟수 측정은 선언 단일성의 **사후 검증 진입점** 으로 박제 — 실제 회귀 게이트 (CI / pre-push) 화는 별 task.
- (8.2) build 산출 동등성 (전 채널 적용 후의 bundle 크기 / hash 안정성) 은 `dependency-bump-gate` 의 4 scripts exit 0 + bundle 회귀 검출 게이트가 부담 — 본 spec 비박제.
- (8.3) 본 spec 의 박제 범위는 vite.config.js 정적 read + 1회 build 산출물 grep 으로 검증 가능 — 외부 네트워크 의존 0 (NFR-01 정합).

### 9. 수단 중립 불변식 (RULE-07 정합)
본 spec § 동작 1~8 의 효능 도달 **수단** (세 채널 중 어느 채널을 제거/유지/추가 / plugin-react-swc 도입 / oxc 비활성 / esbuildOptions 제거 / Vite 메이저 bump 시점 등) 에 "기본값" / "권장" / "우선" / "default" / "best practice" / "root cause" / "가장 효과적" 라벨이 박제되지 않는다. 본 spec 은 **결과 효능** 만 박제하며, 수단 선정은 task 계층 (planner / developer) 결정.

- (9.1) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` 의 매치는 다음 카테고리에 한정된다 — (i) 본 § 동작 9 의 정의 본문 (수단 라벨 셋 박제), (ii) 자기 검증 게이트 본문 (수용 기준 / 테스트 현황 / 회귀 중점 / 변경 이력 정책 명시), (iii) 외부 라이브러리 API 동작 인용 (예: `@vitejs/plugin-react` 의 기본 jsx runtime `automatic`, vite oxc 트랜스포머 default 동작), (iv) 템플릿 메타 텍스트 ("식별자 우선"). 본 카테고리 외 매치 (예: § 동작 본문 효능 평서문이 "권장 트랜스포머" / "best practice 채널" 등으로 수단을 라벨링) 는 § 동작 9.1 위반으로 inspector 가 차기 세션에서 격리 식별.
- (9.2) 수단 라벨이 효능 평서문에 박제된 spec 은 RULE-07 위반으로 inspector 가 차기 세션에서 `50.blocked/spec/` 격리 대상으로 식별. 본 spec 박제 시점 grep 매치는 (i)~(iv) 카테고리 내부 한정으로 분류 — 카테고리 분류 자체가 § 동작 9 의 효능 박제와 직교.

### 회귀 중점
- `vite.config.js:30-36` `plugins` 배열에 `@vitejs/plugin-react-swc` 또는 별도 oxc 토큰 추가 → § 동작 1.2 위반 (채널 등록 수 = 4) → § 동작 2 책임 분담 갱신 필요 신호.
- `vite.config.js:62-65` `oxc` 블록 제거 → § 동작 1.3 위반 (채널 등록 수 = 2) → § 동작 4 의 1 hit baseline 도 동시에 깨짐.
- `vite.config.js:62-65` `oxc.jsx.runtime` 값이 `'classic'` 으로 변경 → § 동작 4 위반 (runtime 모드 박제 값 ≠).
- `vite.config.js:30-36` `react({ jsxRuntime: 'classic' })` 명시 추가 → § 동작 4.2 위반 (다중 runtime 명시 — `grep -nE "runtime\s*:\s*'(automatic|classic)'" vite.config.js` 가 2 hit).
- `vite.config.js:57-61` `optimizeDeps.esbuildOptions.loader` 외부에 `.js: jsx` loader 박제 (예: `plugins[esbuild]` 추가) → § 동작 5.1 위반 (src 단계 누출).
- `vite.config.js` `test` 블록에 `test.transformMode: { web: ['\.[jt]sx?$'] }` 추가 → § 동작 6.1 위반 (test 전용 변환 분기).
- `npm run build` 후 `grep -c "react/jsx-runtime" build/assets/*.js` 합계가 src JSX 파일 수 + 1 이상 → § 동작 3.1 위반 (이중 변환).
- 본 spec 본문에 채널 선정 수단 라벨 박제 (수단 라벨 토큰 셋 § 동작 9 정의 참조) → § 동작 9.1 위반.

## 의존성
- 외부: Vite 8+ (oxc 트랜스포머 내장), `@vitejs/plugin-react` 6+ (Fast Refresh + JSX 변환 plugin), esbuild (dep prebundle), Vitest (vite config 흡수), Node.js (`node -p`), POSIX `grep`.
- 내부: `vite.config.js` (§ 동작 1·2·3·4·5·6 좌변), `tsconfig.json:7` `"jsx"` (직교 의미 동치 참조 — § 동작 4.3), `src/**/*.{js,jsx,ts,tsx}` (채널 (a) 의 `include` 매치 표면 — § 동작 3 의 src JSX 파일 수 측정 진입점), `build/assets/*.js` (§ 동작 3 의 production 산출물 측정 진입점).
- 역의존:
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028 / REQ-053 / REQ-058) — ESLint flat-config / lint-staged / coverage include / no-unused-vars / flat-config last-write-wins. 본 spec 의 변환 채널 축과 직교 (lint/coverage 축).
  - `specs/30.spec/blue/foundation/ci.md` (REQ-023 / REQ-034) — CI action + Node LTS + 메이저 floating. 본 spec 의 변환 채널 축과 직교 (CI 환경 축).
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-037) — CI typecheck step + coverage threshold. 본 spec 의 변환 채널 축과 직교 (회귀 게이트 축 — 변환 채널 drift 발생 시 typecheck 가 정합하더라도 build 산출이 분기).
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (REQ-041 / REQ-043) — vitest 측정 결정론 (pool · fileParallelism). 본 spec 의 변환 진입점 축과 직교 (결정론 수단 축).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — bump 직후 4 scripts exit 0 + React 런타임 경고 0. 본 spec 의 채널 분담 박제 부재 시 React 메이저 bump 직후 jsx-runtime import 중복이 deprecated 경고 채널로 노출될 수 있어 dep-bump-gate 와 간접 결합 (본 spec 은 bump 미수행 정상 상태의 채널 단일성 박제).
  - `specs/30.spec/green/foundation/runtime-dep-version-coherence.md` (REQ-063, 격리) — React 런타임 메이저 정합. 본 spec 의 변환 채널 축과 직교.
  - `specs/30.spec/green/foundation/devbin-install-integrity.md` (REQ-064) — devbin install 존재. 본 spec 의 채널 (a) `@vitejs/plugin-react` install 부재 시 채널 (a) 자체가 비활성 — **precondition** 관계.
  - `specs/30.spec/green/foundation/path-alias-resolver-coherence.md` (REQ-065) — vite alias key/target ↔ tsconfig paths 동치. 본 spec 의 transform 채널 축과 직교 (resolve 와 transform 은 vite 파이프라인의 다른 단계).
  - `specs/50.blocked/spec/foundation/{toolchain-version-coherence,island-proptypes-removal,runtime-dep-version-coherence}.md` (격리) — 본 spec 과 직교 축. /revisit 정식 복귀 경로 의존.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 task 발행이 아니라 불변식 박제 — grep / build 산출물 측정 게이트는 baseline 실측 박제 목적. 효능 도입 task 발행 시점에 task 의 §스코프 규칙 expansion 결정).
- **grep-baseline** (REQ-066 발행 시점 HEAD=`389afee` + 본 spec 박제 시점 HEAD=`b96bb5e` 실측 — 두 HEAD 사이 `vite.config.js` / `tsconfig.json` / `package.json` 변경 0):
  - (a) `grep -cE "react\(|oxc:|esbuildOptions" vite.config.js` → **3** (`vite.config.js:31` plugin-react 호출 + `vite.config.js:58` esbuildOptions + `vite.config.js:62` oxc 블록 — § 동작 1.1 정합 baseline).
  - (b) `grep -nE "runtime\s*:\s*'(automatic|classic)'" vite.config.js` → **1 hit in 1 file**:
    - `vite.config.js:64` `jsx: { runtime: 'automatic' },` — § 동작 4.1 정합 baseline (oxc 단일 박제).
  - (c) `grep -nE "include:" vite.config.js` → **3 hits in 1 file** (include 매처 표면 — § 동작 2 채널 (a)(b) 의 매처 + coverage include):
    - `vite.config.js:32` `include: /\.(js|jsx|ts|tsx)$/,` — 채널 (a) `@vitejs/plugin-react` include 매처.
    - `vite.config.js:63` `include: /\.([mc]?[jt]sx?)$/,` — 채널 (b) oxc include 매처.
    - `vite.config.js:83` `include: ['src/**/*.{js,jsx,ts,tsx}'],` — `test.coverage.include` (변환 채널과 무관 — `coverage-determinism` 영역).
    - § 동작 2.3 분석: 채널 (a)(b) 가 모두 `.jsx/.tsx` 표면을 매치하지만 vite 변환 파이프라인의 plugin transform 훅 → oxc 최상위 transformer 우선순위에 의해 단일 진입점이 결정됨 — 본 spec 은 우선순위 자체를 강제하지 않으며 § 동작 3 jsx-runtime import 횟수 측정으로 효능 검증.
  - (d) `grep -nE "loader\s*:\s*\{\s*'\.js'\s*:\s*'jsx'\s*\}" vite.config.js` → **1 hit in 1 file**:
    - `vite.config.js:59` `loader: { '.js': 'jsx' },` — § 동작 5.1 정합 baseline (`optimizeDeps.esbuildOptions.loader` 한 곳, src 단계 누출 0).
  - (e) `grep -nE "transformMode|test\.\s*transform" vite.config.js` → **0 hits** — § 동작 6.1 정합 baseline (test 전용 변환 채널 분기 부재).
  - (f) `grep -nE "jsxRuntime" vite.config.js` → **0 hits** — § 동작 4.2 정합 baseline (`@vitejs/plugin-react` 호출이 `jsxRuntime` 명시 인수 없음 — plugin 기본값 `automatic` 자동 추종).
  - (g) `grep -n "jsx" tsconfig.json` → **1 hit**:
    - `tsconfig.json:7` `"jsx": "react-jsx",` — 직교 의미 동치 참조 baseline (§ 동작 4.3, 본 spec 비박제 — REQ-028 영역).
  - (h) `package.json` 변환 채널 관련 devDep 표면:
    - `package.json:39` `"@vitejs/plugin-react": "^6.0.1"` — 채널 (a) install precondition (REQ-064 baseline 에 module 부재 표기).
    - `package.json:51` `"vite": "^8.0.8"` — 채널 (b) oxc 트랜스포머 내장 메이저 (Vite 8+).
    - 본 baseline 은 § 동작 7 의 메이저 bump 신호 진입점 — 본 spec 비박제 (REQ-063 / REQ-064 / dependency-bump-gate 직교).
  - (i) production build 산출 측정 baseline (§ 동작 3.1 진입점 — 현 시점 `npm run build` 채널 비활성 — `node_modules/vite` 부재 (REQ-064 baseline 의 binary 부재 3건 중 하나)):
    - `npm run build` 채널 비활성 → § 동작 3.1 측정 baseline 은 REQ-064 충족 (`node_modules/vite` 디렉터리 존재 + binary resolve) 이후 1회 실측 박제 가능 — 본 spec 박제 시점 baseline 은 측정 진입점만 박제, 수치 baseline 은 REQ-064 충족 후 차기 inspector 세션에서 갱신.
  - (j) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` — 본 spec 박제 시점 매치는 § 동작 9 정의 본문 / 자기 검증 게이트 본문 / 외부 라이브러리 API 인용 / 템플릿 메타 텍스트 카테고리에 한정 — § 동작 9.1 자기 검증 baseline.
- **rationale**: gate (a) 는 § 동작 1 의 채널 등록 수 baseline (현 시점 3). gate (b) 는 § 동작 4 의 vite 측 runtime 모드 단일성 baseline (`automatic` 1 hit). gate (c) 는 § 동작 2 의 채널 책임 분담 진입점 baseline + 채널 (a)(b) 의 매처 중첩 분석. gate (d) 는 § 동작 5 의 esbuild loader 적용 단계 분리 baseline. gate (e) 는 § 동작 6 의 build runtime ↔ test runtime 변환 채널 동일성 baseline (test 전용 분기 부재). gate (f) 는 § 동작 4.2 의 plugin-react jsxRuntime 명시 부재 baseline. gate (g) 는 § 동작 4.3 의 typecheck 측 의미 동치 참조 (본 spec 비박제). gate (h) 는 § 동작 7 의 메이저 bump 신호 진입점 (REQ-063/064/dep-bump-gate 직교). gate (i) 는 § 동작 3 의 production build 산출 측정 진입점 (REQ-064 충족 후 측정 baseline 갱신 — 본 시점 측정 채널 비활성). gate (j) 는 § 동작 9.1 수단 중립 자기 검증 baseline. 모든 baseline 은 시점 의존 수치 (3 채널 / 1 runtime hit / 1 loader hit / 0 transformMode) 가 아닌 **세 채널 책임 분담 + 이중 변환 부재 효능 동시 성립 자체** 가 본 spec 의 박제 대상이며, baseline 수치는 위반 상태 식별 보조 — NFR-01 시점 비의존 정합.

## 테스트 현황
- [ ] § 동작 1.1 채널 등록 수 grep-baseline (a) 와 동일.
- [ ] § 동작 1.2 등록 수 증가 시 본 spec 갱신 신호.
- [ ] § 동작 1.3 등록 수 축소 시 본 spec 갱신 신호.
- [ ] § 동작 1.4 채널 등록 수 본문 효능 평서문은 baseline 박제로 표현 (수치 하드코딩 부재).
- [ ] § 동작 2.1 세 채널이 vite 변환 파이프라인의 다른 단계 담당.
- [ ] § 동작 2.2 vite/plugin-react 메이저 bump 미강제 + bump 후 분담 의미 변경은 갱신 신호.
- [ ] § 동작 2.3 채널 (a)(b) 매처 중첩 표면 (`.jsx/.tsx`) 의 vite 우선순위 미강제 + jsx-runtime import 측정으로 효능 검증.
- [ ] § 동작 2.4 채널 (c) 는 dep prebundle 한정 (src 단계 외부).
- [ ] § 동작 3.1 jsx-runtime import 횟수 = src JSX 파일 수 (격차 0).
- [ ] § 동작 3.2 격차 1 이상 검출 시 bundle dead code 시그널.
- [ ] § 동작 3.3 측정 절차 박제 + 회귀 게이트 도입은 후행 task.
- [ ] § 동작 3.4 위반은 § 동작 1 / 2 위반 시사.
- [ ] § 동작 4.1 vite 측 runtime 모드 명시 1 hit (oxc 단일).
- [ ] § 동작 4.2 plugin-react 호출의 jsxRuntime 명시 부재.
- [ ] § 동작 4.3 tsconfig jsx 직교 (본 spec 비박제).
- [ ] § 동작 4.4 plugin-react 메이저 bump 의 기본 runtime 변경은 dependency-bump-gate 채널 검출.
- [ ] § 동작 5.1 esbuild loader 1 hit (optimizeDeps.esbuildOptions.loader 한 곳).
- [ ] § 동작 5.2 src/**/*.js JSX 는 채널 (a) 가 처리.
- [ ] § 동작 5.3 node_modules legacy 패키지 활성 의도 미강제.
- [ ] § 동작 5.4 분리 효능은 채널 (c) 침투 0 자체.
- [ ] § 동작 6.1 test 전용 변환 분기 0 hit.
- [ ] § 동작 6.2 vitest jsx-runtime import 패턴 build 와 동일.
- [ ] § 동작 6.3 test-only 옵션 (setupFiles 등) 은 음영 외.
- [ ] § 동작 7.1~7.3 메이저 bump 후 분담 갱신 의무 박제.
- [ ] § 동작 8.1~8.3 선언 단일성 ↔ 산출 동등성 직교 박제.
- [ ] § 동작 9.1 `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` 매치가 § 동작 9 카테고리 (i)~(iv) 내부 한정.
- [ ] § 동작 9.2 수단 라벨 박제 spec 은 `50.blocked/spec/` 격리 대상.

## 수용 기준
- [ ] (Must, FR-01) `vite.config.js` 의 변환 채널 등록 수가 §스코프 규칙 grep-baseline (a) 박제 수치와 일치 — § 동작 1.
- [ ] (Must, FR-02) 세 채널의 책임 분담이 spec 본문 평서형 박제 — § 동작 2.
- [ ] (Must, FR-03) production build 산출물의 jsx-runtime import 횟수 = src JSX 파일 수 (격차 0) — § 동작 3.
- [ ] (Must, FR-04) vite 측 jsx runtime 모드 명시 단일성 (1 hit, oxc 박제) — § 동작 4.
- [ ] (Must, FR-05) esbuild loader 적용 단계 분리 (`optimizeDeps` 한정, src 단계 누출 0) — § 동작 5.
- [ ] (Should, FR-06) build runtime ↔ test runtime 변환 채널 동일성 (test 전용 분기 0) — § 동작 6.
- [ ] (Should, FR-07) 메이저 bump 후 채널 분담 갱신 의무 박제 (bump 강제 0) — § 동작 7.
- [ ] (Should, FR-08) 선언 단일성 ↔ 산출 동등성 직교 (산출 동등성은 dependency-bump-gate 부담) — § 동작 8.
- [ ] (Must, FR-09 / RULE-07) 본 spec 본문에 수단 라벨 ("기본값" / "권장" / "우선" / "default" / "best" / "root cause" / "가장 효과적") 매치가 § 동작 9 카테고리 (i)~(iv) 내부 한정 — § 동작 9.1 자기 검증.
- [ ] (NFR-01) 본 spec 본문에 특정 채널 등록 수 / 특정 메이저 숫자가 효능 평서문에 하드코딩되지 않음 — baseline 수치는 §스코프 규칙 grep-baseline 에만 박제.
- [ ] (NFR-02) 본 효능 박제는 단일 진단 명령 (`grep` 1-line + `npm run build` 1회 + bundle grep 1-line) 으로 위반 카테고리 식별 가능.
- [ ] (NFR-03) 결과 효능 (채널 분담 + 이중 변환 부재 + runtime 모드 단일성 + 단계 분리 동시 성립) 만 박제. 1회성 채널 제거/추가 운영 task 배제.
- [ ] (NFR-04) `tooling.md` (lint/coverage 축) / `ci.md` (CI 환경) / `regression-gate.md` (회귀 게이트) / `coverage-determinism.md` (결정론 수단) / `dependency-bump-gate.md` (bump 직후 결과) / `runtime-dep-version-coherence.md` (REQ-063 메이저 정합) / `devbin-install-integrity.md` (REQ-064 install 존재 precondition) / `path-alias-resolver-coherence.md` (REQ-065 resolve 동치) 와 모두 직교 축.
- [ ] (NFR-05) `vite.config.js` 내용 동일 상태에서 본 게이트 반복 적용 시 동일 결과 (RULE-02 멱등 정합).
- [ ] (NFR-06) 본 spec 의 채널 분담 박제는 채널 이름·include 패턴의 baseline 박제로 표현되며, plugin 추가/제거 시 baseline 변경 자체가 fail 신호 — 특정 매처 정규식 / 특정 패키지 메이저 번호의 본문 효능 평서문 하드코딩 부재.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-066 흡수). `vite.config.js` 의 세 변환 채널 (a) `@vitejs/plugin-react` (b) `oxc.jsx` (c) `optimizeDeps.esbuildOptions.loader` 의 책임 분담 + 이중 변환 부재 + jsx runtime 모드 vite 측 단일성 + esbuild loader 단계 분리 + build/test runtime 변환 채널 동일성 + 메이저 bump 후 분담 갱신 의무 상시 불변식 박제 (§ 동작 1~9). REQ-061 (toolchain, 격리) / REQ-063 (runtime dep 메이저, 격리) / REQ-064 (devbin install 존재) / REQ-065 (path alias resolver 동치) 와 직교하는 **vite 변환 채널 선언 단일성 + 이중 변환 부재** 메타 패턴. baseline 실측 @HEAD=`b96bb5e` (REQ-066 발행 HEAD=`389afee` 와 vite.config.js / tsconfig.json / package.json 영향 0): (a) 채널 등록 수 = 3 (`react(`, `oxc:`, `esbuildOptions` 매치) / (b) jsx runtime 모드 명시 1 hit (`vite.config.js:64` `runtime: 'automatic'` — oxc 단일 박제) / (c) include 매처 3 hits in 1 file (채널 (a) `vite.config.js:32` `.jsx/.tsx` 매처 + 채널 (b) `vite.config.js:63` `[jt]sx?` 매처 + `vite.config.js:83` test.coverage.include 매처 — 변환 채널 무관) / (d) esbuild loader 1 hit (`vite.config.js:59` `loader: { '.js': 'jsx' }` — optimizeDeps 한 곳 박제) / (e) test 전용 변환 분기 0 hit (`transformMode|test\.\s*transform` 매치 부재) / (f) plugin-react jsxRuntime 명시 0 hit (기본값 `automatic` 자동 추종) / (g) `tsconfig.json:7` `"jsx": "react-jsx"` 직교 의미 동치 참조 (본 spec 비박제) / (h) package.json 채널 관련 devDep (`@vitejs/plugin-react` ^6.0.1, `vite` ^8.0.8 — REQ-064 baseline 에 `@vitejs/plugin-react` 부재 표기) / (i) production build 측정 채널 비활성 (REQ-064 의 `node_modules/vite` 디렉터리 부재로 `npm run build` 채널 비활성 — REQ-064 충족 후 측정 baseline 갱신) / (j) § 동작 9.1 수단 라벨 매치는 § 동작 9 카테고리 (i)~(iv) 내부 한정. 수단 중립 정책 (§ 동작 9.1 자기 검증 — `기본값|권장|우선|default|best|root cause|가장 효과적` 매치 카테고리 분류). consumed req: `specs/20.req/20260517-vite-jsx-transform-channel-coherence.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `tooling.md` (REQ-028/053/058, lint/coverage 축 직교), `ci.md` (REQ-023/034, CI 환경 축 직교), `regression-gate.md` (REQ-037, 회귀 게이트 축 직교), `coverage-determinism.md` (REQ-041/043, 결정론 수단 축 직교), `dependency-bump-gate.md` (REQ-035, bump 직후 결과 — 본 spec § 동작 4.4 plugin-react 메이저 bump 의 기본 runtime 변경 검출 채널), `runtime-dep-version-coherence.md` (REQ-063, 격리, 메이저 정합 축 직교), `devbin-install-integrity.md` (REQ-064, 채널 (a) `@vitejs/plugin-react` install precondition), `path-alias-resolver-coherence.md` (REQ-065, vite 파이프라인 다른 단계 — resolve vs transform 축 직교), `50.blocked/spec/foundation/{toolchain-version-coherence,island-proptypes-removal,runtime-dep-version-coherence}.md` (격리, 직교 축). RULE-07 자기검증 — § 동작 1~9 모두 평서형·반복 검증 가능 (`grep -nE` + `npm run build` 1회 + bundle grep 1-line)·시점 비의존 (특정 채널 등록 수 / 특정 메이저 숫자는 §스코프 규칙 baseline 에만 박제, 효능 평서문은 "채널 등록 수 = baseline" / "이중 변환 부재" / "runtime 모드 단일성" 자체)·incident 귀속 부재 (vite 변환 채널 선언 단일성은 build/test 파이프라인의 상시 성질)·수단 중립 (세 채널 중 어느 채널의 제거/유지/추가 / plugin-react-swc 도입 / oxc 비활성 / esbuildOptions 제거 / Vite 메이저 bump 시점 어느 수단도 라벨 미박제). RULE-06 §스코프 규칙 gate (a)~(j) 10건 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. | 전 섹션 (신규) |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/05/17/req/20260517-vite-jsx-transform-channel-coherence.md` (REQ-066 — 본 세션 mv).
- **선행 req (메타 패턴 직교 축)**:
  - `specs/60.done/2026/05/17/req/20260517-toolchain-version-coherence.md` (REQ-061, 격리) — typescript devDep / installed / tsconfig 정합 (버전·enum 축).
  - `specs/60.done/2026/05/17/req/20260517-runtime-dep-version-coherence.md` (REQ-063, 격리) — React 런타임 메이저 정합 (버전 일치 축).
  - `specs/60.done/2026/05/17/req/20260517-devbin-install-integrity.md` (REQ-064) — devbin install 존재 축.
  - `specs/60.done/2026/05/17/req/20260517-path-alias-resolver-coherence.md` (REQ-065) — vite alias ↔ tsconfig paths 동치 축.
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062) — TS island PropTypes 콘텐츠 축.
- **관련 spec (역의존 — 모두 직교 축)**:
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028/053/058) — lint / coverage / flat-config 축. 본 spec 의 변환 채널 축과 직교.
  - `specs/30.spec/blue/foundation/ci.md` (REQ-023/034) — CI action + Node LTS. 직교.
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-037) — CI typecheck + coverage threshold. 직교.
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (REQ-041/043) — vitest 측정 결정론. 직교.
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — bump 직후 4 scripts exit 0. § 동작 4.4 / § 동작 8.2 의 산출 동등성 검출 채널.
  - `specs/30.spec/green/foundation/runtime-dep-version-coherence.md` (REQ-063, 격리) — React 메이저 정합. 직교.
  - `specs/30.spec/green/foundation/devbin-install-integrity.md` (REQ-064) — devbin install 존재. 채널 (a) install precondition.
  - `specs/30.spec/green/foundation/path-alias-resolver-coherence.md` (REQ-065) — vite alias ↔ tsconfig paths 동치. vite 파이프라인 다른 단계 (resolve vs transform) 축 직교.
  - `specs/50.blocked/spec/foundation/{toolchain-version-coherence,island-proptypes-removal,runtime-dep-version-coherence}.md` (격리) — 직교 축.
- **외부 레퍼런스**:
  - Vite 8 oxc 트랜스포머 — `https://vitejs.dev/config/shared-options.html#oxc` — Vite 8.0 부터 SWC 대체 경로로 내장. `oxc.jsx.runtime` 옵션은 React jsx-runtime 자동 import 모드 결정.
  - `@vitejs/plugin-react` 6.x — `https://github.com/vitejs/vite-plugin-react` — Fast Refresh + JSX 변환 plugin. 기본 jsx runtime `automatic` (React 17+ 호환).
  - React 18+ `react/jsx-runtime` automatic import — `tsconfig.json:7` `"jsx": "react-jsx"` 및 oxc `jsx.runtime: 'automatic'` 이 동일 의미.
  - esbuild `loader` 옵션 — `https://esbuild.github.io/api/#loader` — dep prebundle 단계의 파일 확장자별 loader 매핑.
- **현장 근거 (HEAD=`389afee` REQ 발행 + `b96bb5e` spec 박제, vite.config.js / tsconfig.json / package.json 영향 0)**:
  - `vite.config.js:31-33` `react({ include: /\.(js|jsx|ts|tsx)$/ })` — 채널 (a).
  - `vite.config.js:57-61` `optimizeDeps.esbuildOptions.loader: { '.js': 'jsx' }` — 채널 (c).
  - `vite.config.js:62-65` `oxc: { include: /\.([mc]?[jt]sx?)$/, jsx: { runtime: 'automatic' } }` — 채널 (b).
  - `tsconfig.json:7` `"jsx": "react-jsx"` — typecheck 측 의미 동치 (직교).
  - `package.json:39` `"@vitejs/plugin-react": "^6.0.1"` (devDep, REQ-064 baseline 부재 표기).
  - `package.json:51` `"vite": "^8.0.8"` (vite 메이저 8 — oxc 트랜스포머 내장).
- **RULE 준수**:
  - RULE-07: 9개 불변식 (§ 동작 1~9) 모두 시점 비의존·평서형·반복 검증 가능 (`grep -nE` + `npm run build` 1회 + bundle grep 1-line)·incident 귀속 부재·수단 중립. § 동작 9.1 자기 검증 — 매치는 카테고리 (i)~(iv) 내부 한정.
  - RULE-06: §스코프 규칙 grep-baseline 10개 gate (a)~(j) 실측 박제 @HEAD=`b96bb5e`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` 신규 create + req mv `20.req/* → 60.done/req/`).
