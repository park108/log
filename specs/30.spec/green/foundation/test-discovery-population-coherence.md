# 도구 4축 모집단 정책 단일성 — `src/**` 모집단 한정 + 루트 레벨 `*.test.*` 4축 노출 매트릭스 박제

> **위치**: `eslint.config.js` / `tsconfig.json` / `vite.config.js` / `package.json` 의 4축 모집단 결정 표면
> **관련 요구사항**: REQ-20260517-067
> **최종 업데이트**: 2026-05-17 (by inspector)

> 참조 코드는 **식별자 우선**, 라인 번호 보조 (REQ-067 발행 HEAD=`b96bb5e`, 본 spec 박제 HEAD=`64babbd`).

## 역할
프로젝트 도구 4축 — (a) ESLint flat-config `files` 패턴 / (b) TypeScript `tsconfig.json` `include` / (c) Vitest `coverage.include` / (d) Vitest test runner discovery — 의 **모집단 정책 단일성** 과 루트 레벨 `*.test.*` 파일의 **4축 노출 매트릭스** 박제. 4축이 동일 모집단을 가리키거나 비대칭이라면 비대칭 자체가 spec 본문에 enumeration 으로 명시되어야 한다. 본 spec 은 어느 정책 방향 (`src/**` 한정 유지 vs 루트 레벨 포함 확장) 도 박제하지 않으며, 4축 매트릭스와 매트릭스 변경 fail 신호만 박제 — 정책 결정은 task 계층 위임.

## 동작
1. **모집단 4축 단일성 (FR-01)**: 4축 모집단 패턴이 명시 박제 — baseline = (a) ESLint `src/**/*.{js,jsx,ts,tsx}` (`eslint.config.js:35` JS/JSX rule 블록) + `src/**/*.{ts,tsx}` + `src/**/*.d.ts` (`eslint.config.js:79` typescript-eslint 파서 블록) / (b) TypeScript `src` (`tsconfig.json:26` `include`) / (c) Vitest coverage `src/**/*.{js,jsx,ts,tsx}` (`vite.config.js:83` `coverage.include`) / (d) Vitest test discovery `default` (`vite.config.js:66-98` `test` 블록에 `test.include` / `test.exclude` / `test.root` 키 부재 → vitest 메이저 기본 글로브 활성). 4축 모집단 패턴 변경 (신규 추가, 패턴 확장, 명시 키 도입) 은 본 spec 갱신 신호.
2. **루트 레벨 인벤토리 (FR-02)**: 프로젝트 루트 (`-maxdepth 1`) `*.test.*` 파일 인벤토리 수치가 §스코프 규칙 grep-baseline 에 박제 — 현 baseline = **1 hit** (`vite.config.test.js`). 본 1 파일의 4축 노출 매트릭스가 동시 박제 — (a) ESLint 미노출 (files 패턴 매칭 외) / (b) TypeScript 미노출 (include 매칭 외) / (c) Vitest coverage 측정 모집단 외 (coverage.include 매칭 외, 분자·분모 양쪽 미진입) / (d) Vitest test runner discovery 픽업 (default 글로브 매치). 인벤토리 수치 또는 4축 노출 매트릭스 변경은 본 spec 갱신 신호.
3. **정책 비대칭 명시 (FR-03)**: 현 시점 4축 비대칭은 (d) test runner discovery 의 default 글로브와 (a)(b)(c) 의 `src/**` 한정 사이 존재. 본 비대칭의 의도 — "test infra 자체 단위 테스트 (`vite.config.test.js`) 는 `src/**` 모집단 외 분리되어 src 의 lint/typecheck/coverage 매트릭스에 노출되지 않으나, test runner 가 직접 실행 + 어설션 효과가 다른 src 파일의 coverage 에 반영" — 이 평서문으로 spec 본문에 박제. 향후 정책 변경 (분리 유지 vs `src/__tests__/vite.config/` 이관 vs 4축 전 노출) 은 본 spec 갱신.
4. **신규 루트 레벨 `*.test.*` 추가 fail 신호 (FR-04)**: 본 spec §스코프 규칙 grep-baseline 의 루트 레벨 인벤토리 수치 (= 1) 가 fail 신호로 작동. baseline 수치 변경 = 본 spec 갱신 의무. 신규 파일 (예: `eslint.config.test.js`, `vitest.config.test.js`, `playwright.config.test.ts`) 추가 시 매트릭스 박제 재실측.
5. **vitest 메이저 bump fail-safe (FR-05)**: 본 spec 의 4축 매트릭스 박제는 vitest 메이저 bump 의 default discovery 글로브 변경에 fail-safe — vitest bump 후 baseline 의 (d) 노출 상태 (= 1 hit) 변동 시 본 spec 갱신 신호. 본 spec 본문은 vitest default 글로브 자체의 구체 표현 (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) 을 박제하지 않으며, baseline grep 결과 (`vite.config.test.js` 픽업 여부) 만 박제.
6. **도구 매처 표현 fail-safe (FR-06)**: 각 도구의 모집단 패턴 표현 변경 (예: `eslint.config.js:35` `files` 패턴이 `src/**/*.{js,jsx,ts,tsx,mjs,cjs}` 등 확장) 시 본 spec 갱신 신호. baseline 패턴 자체는 §스코프 규칙 grep-baseline 에만 박제되며, §동작 본문 효능 평서문은 "`src/**` 한정" / "루트 1 hit" 등 의미 표현 한정.
7. **scripts 인자 vs config 우선순위 (FR-07)**: `package.json` scripts (`"lint": "eslint ./src"`, `"typecheck": "tsc --noEmit"`, `"test": "vitest run --coverage"`) 의 명령 인자 변경에 fail-safe — `eslint` 의 경우 CLI 인자 (`./src`) 와 flat-config `files` 패턴이 동시 적용되어 양쪽 교집합으로 결정되므로 (a) 모집단 표현은 `eslint.config.js:35` `files` 가 결정. 본 spec 은 scripts 인자 자체를 박제하지 않으며, config 측 모집단 박제만 박제.
8. **선언 단일성 ↔ 게이트 효과 분리 (FR-08)**: 본 spec 은 4축 **모집단 선언 단일성** 만 박제하며, 모집단 외부 파일의 실제 lint/type/coverage 수치 영향은 별 게이트 — `dependency-bump-gate.md` (REQ-035, bump 직후 4 scripts exit 0) / `regression-gate.md` (REQ-037, CI typecheck step + coverage threshold) / `coverage-determinism.md` (REQ-041/043, vitest 측정 결정론) — 가 부담. 본 spec 위반은 위 게이트의 vacuous 통과 가능성을 함의.
9. **수단 중립 자기 검증 (RULE-07)**: 본 spec 본문에 `vite.config.test.js` 위치 결정 (루트 유지 vs `src/__tests__/` 이관 vs `tests/` 신설) / `vite.config.js` `test.include` 구체 패턴 결정 / 4축 정책 방향 (`src/**` 한정 vs 전체 글로브) 에 라벨 ("기본값" / "권장" / "우선" / "default" / "best" / "root cause" / "가장 효과적") 박제 부재 — 본 spec §스코프 규칙 자기 grep 으로 검증.
   - (9.1) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/test-discovery-population-coherence.md` 매치는 다음 카테고리 한정 — (i) 본 § 동작 9 의 정의 본문 (수단 라벨 셋 박제), (ii) 자기 검증 게이트 본문 (수용 기준 / 회귀 중점 / 변경 이력 정책 명시), (iii) 외부 라이브러리 API 동작 인용 (예: vitest default 글로브 표현, ESLint flat config `files` 우선순위, TypeScript `include` default), (iv) 템플릿 메타 텍스트 ("식별자 우선"). 본 카테고리 외 매치 (예: § 동작 본문 효능 평서문이 "권장 위치" / "default 정책" 등으로 위치/정책을 라벨링) 는 § 동작 9.1 위반으로 차기 inspector 가 격리 식별.

## 의존성
- 내부 (직교 축 spec):
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028 / REQ-053 / REQ-058) — ESLint flat-config 각 축 (files / 파서 / rule swap / last-write-wins) 의 **단일 설정 단일성** 박제. 본 spec 은 4축 **매트릭스 간 정합성** 축으로 직교 (각 축 내부 단일성은 tooling.md, 4축 간 정합은 본 spec).
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-037) — CI typecheck step + coverage threshold 4축. 본 spec 위반 시 회귀 게이트의 vacuous 통과 가능성.
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (REQ-041 / REQ-043) — vitest 측정 결정론 (pool · fileParallelism). 본 spec 의 모집단 정책 축과 직교.
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — bump 직후 4 scripts exit 0. 본 spec 의 vitest 메이저 bump fail-safe (§ 동작 5) 가 간접 결합 — bump 시 default 글로브 변경 시 본 spec 갱신 신호.
  - `specs/30.spec/blue/foundation/ci.md` (REQ-023 / REQ-034) — CI Node LTS + 메이저 floating. CI 환경 축으로 직교.
  - `specs/30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` (REQ-066) — vite JSX 변환 채널 단일성. 본 spec 의 도구 모집단 매트릭스 축과 직교, 본 spec 은 REQ-066 §Out-of-Scope 인계 (test 파일 discovery 정합).
  - `specs/50.blocked/spec/foundation/path-alias-resolver-coherence.md` (REQ-065 격리) — resolver 동치 축. 본 spec 의 모집단 매트릭스 축과 직교.
  - `specs/50.blocked/spec/foundation/devbin-install-integrity.md` (REQ-064 격리) — devbin install 존재. 본 spec 의 모집단 매트릭스 축과 직교 (단, `node_modules/{eslint,typescript,vitest}` 부재 시 4축 게이트 자체 실행 불가 — precondition 관계).
- 외부 (도구):
  - ESLint flat config — `files` 패턴이 rule 블록 적용 모집단 결정. CLI 인자와 동시 적용 시 교집합.
  - TypeScript — `tsconfig.json` `include` 배열이 컴파일 모집단 결정. `--noEmit` 모드에서도 동일.
  - Vitest — `test.include` / `test.exclude` / `test.root` 옵션. 키 부재 시 메이저 default 글로브 (현 4.x = `**/*.{test,spec}.?(c|m)[jt]s?(x)`) 활성.
- 역의존: 본 spec 위반 시 영향 — `dependency-bump-gate.md` (bump 후 신규 메이저의 default 글로브 변경 무감지), `regression-gate.md` (typecheck/coverage 측정 모집단 외 파일의 회귀 무감지), `coverage-determinism.md` (분모 변경에 따른 threshold 수치 급변).

## 테스트 현황
- [x] `eslint.config.js:35` JS/JSX rule 블록 files 패턴 `src/**/*.{js,jsx,ts,tsx}` 박제 (REQ-028).
- [x] `eslint.config.js:79` typescript-eslint 파서 블록 files 패턴 `src/**/*.{ts,tsx}` + `src/**/*.d.ts` 박제 (REQ-053).
- [x] `tsconfig.json:26` `"include": ["src"]` 박제.
- [x] `vite.config.js:83` `coverage.include: ['src/**/*.{js,jsx,ts,tsx}']` 박제 (REQ-028 영역).
- [x] `vite.config.js:84-90` `coverage.exclude` entrypoint·mock·test·ambient `.d.ts` 박제 (REQ-028 영역).
- [x] `vite.config.js:66-98` `test` 블록 `test.include` / `test.exclude` / `test.root` 부재 — default 글로브 활성.
- [x] 루트 레벨 `*.test.*` 인벤토리 = 1 hit (`vite.config.test.js`).
- [x] 본 spec § 동작 9.1 수단 라벨 매치 § 동작 9 카테고리 (i)~(iv) 내부 한정.
- [ ] vitest 메이저 bump 후 default 글로브 변경 fail-safe 효능 (§ 동작 5 — 미래 bump 시 활성).
- [ ] 신규 루트 레벨 `*.test.*` 추가 시 인벤토리 수치 변경 fail 신호 (§ 동작 4 — 미래 추가 시 활성).

## 스코프 규칙
- **expansion**: N/A (본 spec 은 grep 게이트 측정 baseline 박제 spec — task 발행 시 본 baseline 을 §스코프 규칙 grep-baseline 으로 복제).
- **grep-baseline**:
  - `grep -nE "files:\s*\[.*src/" eslint.config.js` → **2 hits in 1 file**:
    - `eslint.config.js:35` `files: ['src/**/*.{js,jsx,ts,tsx}']`
    - `eslint.config.js:79` `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts']`
  - `grep -nE '"include":' tsconfig.json` → **1 hit in 1 file**:
    - `tsconfig.json:26` `"include": ["src"]`
  - `grep -nE "coverage\.include|^[[:space:]]+include:[[:space:]]*\['src" vite.config.js` → **1 hit in 1 file**:
    - `vite.config.js:83` `include: ['src/**/*.{js,jsx,ts,tsx}']`
  - `grep -nE "test\.include|test\.exclude|test\.root|^[[:space:]]+include:[[:space:]]*\[" vite.config.js` → **2 hits in 1 file** (모두 `coverage.include` / `coverage.exclude` 의 sub-key, `test.*` 자체 키 부재):
    - `vite.config.js:83` `include: ['src/**/*.{js,jsx,ts,tsx}']` (coverage.include sub-key)
    - `vite.config.js:84` `exclude: [` (coverage.exclude sub-key)
    - 본 baseline 의 핵심: `test.include` / `test.exclude` / `test.root` **자체 키 부재** (= default 글로브 활성).
  - `find /Users/park108/Dev/log -maxdepth 1 -name "*.test.*" -not -path "*/node_modules/*"` → **1 hit**:
    - `/Users/park108/Dev/log/vite.config.test.js`
  - `find /Users/park108/Dev/log/src -name "*.test.*"` 카운트 → **47** (참조 baseline — `src/**` 내부 test 파일 수, 본 spec 직접 박제 외 — 분포 비대칭 비교용).
  - `grep -nE "^\s*\"lint\"|^\s*\"typecheck\"|^\s*\"test\"" package.json` → 3 hits:
    - `package.json:21` `"test": "vitest run --coverage"`
    - `package.json:23` `"lint": "eslint ./src"`
    - `package.json:24` `"typecheck": "tsc --noEmit"`
  - 4축 노출 매트릭스 (루트 `vite.config.test.js` 1 파일 기준):
    - (a) ESLint: **미노출** — `eslint.config.js:35` `files: ['src/**/*.{js,jsx,ts,tsx}']` 매처가 루트 파일 미매치.
    - (b) TypeScript: **미노출** — `tsconfig.json:26` `include: ["src"]` 매처가 루트 파일 미매치.
    - (c) Vitest coverage 측정 모집단: **외부** — `vite.config.js:83` `coverage.include: ['src/**/*.{js,jsx,ts,tsx}']` 매처 외 (분자·분모 양쪽 미진입).
    - (d) Vitest test runner discovery: **픽업** — `vite.config.js` `test.include` 부재 → vitest default 글로브 (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) 매치 → 6 it (line 7-75) 실행 + 어설션 효과가 `src/**/*.{js,jsx,ts,tsx}` coverage 모집단 내 다른 파일의 측정에 반영.
  - `grep -nE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/test-discovery-population-coherence.md` — 본 spec 박제 시점 매치는 § 동작 9 정의 본문 / 자기 검증 게이트 본문 / 외부 라이브러리 API 인용 (vitest default 글로브, ESLint files 우선순위 등) / 템플릿 메타 텍스트 카테고리 한정 — § 동작 9.1 자기 검증 baseline.
- **rationale**: 4축 모집단 정책 단일성은 도구 매처 표현의 baseline 박제로 표현되며, 도구 추가/제거 또는 패턴 변경 시 baseline 변경 자체가 fail 신호. 정밀 패턴 `^[[:space:]]+include:[[:space:]]*\[` 은 coverage.include 와 test.include 의 구문 모호 회피 — `coverage.include` 는 `coverage:` 블록 내부, `test.include` 는 `test:` 블록 직속. baseline 측정 시 두 위치 분리 박제 필수.

## 수용 기준
- [ ] (Must, FR-01) 4축 모집단 패턴이 명시 박제 — §스코프 규칙 grep-baseline 의 4 패턴이 동일 수치/위치 유지 — § 동작 1.
- [ ] (Must, FR-02) 루트 레벨 `*.test.*` 인벤토리 = 1 hit (`vite.config.test.js`) + 4축 노출 매트릭스 박제 (a) 미노출 / (b) 미노출 / (c) 외부 / (d) 픽업 — § 동작 2.
- [ ] (Must, FR-03) 4축 비대칭의 의도 ("test infra 자체 단위 테스트는 `src/**` 모집단 외 분리") 가 평서문 박제 — § 동작 3.
- [ ] (Must, FR-04) 신규 루트 레벨 `*.test.*` 추가 시 인벤토리 수치 변경 = 본 spec 갱신 신호 — § 동작 4.
- [ ] (Should, FR-05) vitest 메이저 bump 후 default 글로브 변경 fail-safe — baseline 의 (d) 노출 상태 변동 시 본 spec 갱신 — § 동작 5.
- [ ] (Should, FR-06) 각 도구 매처 표현 변경 시 fail-safe — baseline 패턴 변경 자체가 fail 신호 — § 동작 6.
- [ ] (Should, FR-07) `package.json` scripts 인자 변경 fail-safe — config 측 모집단 박제가 우선 — § 동작 7.
- [ ] (Should, FR-08) 본 spec 위반 시 `dependency-bump-gate` / `regression-gate` / `coverage-determinism` 의 vacuous 통과 가능성 함의 — § 동작 8.
- [ ] (Must, RULE-07) § 동작 9.1 자기 grep — § 동작 9 카테고리 (i)~(iv) 내부 한정 매치 — § 동작 9.
- [ ] (NFR-01) 본 spec 본문에 특정 vitest 메이저 default 글로브 표현, 특정 ESLint/TypeScript 메이저 시그니처가 효능 평서문에 하드코딩되지 않음 — baseline 수치는 §스코프 규칙 grep-baseline 에만 박제.
- [ ] (NFR-02) 본 효능 박제는 단일 진단 명령 (`grep` 1-line + `find` 1-line) 으로 위반 카테고리 식별 가능.
- [ ] (NFR-03) 결과 효능 (4축 모집단 단일성 + 루트 인벤토리 박제 + 매트릭스 노출 enumeration + 정책 비대칭 평서문 동시 성립) 만 박제. 1회성 정책 결정 (분리 유지 vs 이관) 운영 task 배제.
- [ ] (NFR-04) `tooling.md` (각 축 단일성 / REQ-028/053/058) / `regression-gate.md` (회귀 게이트 / REQ-037) / `coverage-determinism.md` (결정론 / REQ-041/043) / `dependency-bump-gate.md` (bump 직후 / REQ-035) / `ci.md` (CI 환경 / REQ-023/034) / `vite-jsx-transform-channel-coherence.md` (변환 채널 / REQ-066) 와 모두 직교 축.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-067 흡수). 도구 4축 (ESLint files / TypeScript include / Vitest coverage.include / Vitest test discovery) 의 모집단 정책 단일성 + 루트 레벨 `*.test.*` 인벤토리 1 hit 박제 + 4축 노출 매트릭스 enumeration ((a) 미노출 / (b) 미노출 / (c) 외부 / (d) 픽업) + 신규 루트 파일 추가 fail 신호 + vitest 메이저 bump default 글로브 변경 fail-safe + 도구 매처 표현 변경 fail-safe + scripts 인자 변경 fail-safe + 선언 단일성 ↔ 게이트 효과 분리 + 수단 중립 자기 검증 (§ 동작 1~9). REQ-066 (vite-jsx-transform-channel) §Out-of-Scope 인계 흡수. baseline 실측 @HEAD=`64babbd` (REQ-067 발행 HEAD=`b96bb5e` 와 eslint.config.js / tsconfig.json / vite.config.js / package.json 영향 0): ESLint files 2 hits (`:35` JS/JSX + `:79` typescript-eslint) / TypeScript include 1 hit (`tsconfig.json:26` `["src"]`) / Vitest coverage.include 1 hit (`vite.config.js:83` `['src/**/*.{js,jsx,ts,tsx}']`) / Vitest test.include 키 자체 부재 (default 글로브 활성) / 루트 `*.test.*` 1 hit (`vite.config.test.js`) / src 내부 `*.test.*` 47 (참조). consumed req: `specs/20.req/20260517-test-discovery-population-coherence.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `tooling.md` (REQ-028/053/058, 각 축 단일성 — 본 spec 매트릭스 정합 직교), `regression-gate.md` (REQ-037, 본 spec 위반 시 vacuous 통과 함의), `coverage-determinism.md` (REQ-041/043, 분모 변경 시 threshold 급변), `dependency-bump-gate.md` (REQ-035, vitest bump fail-safe 간접 결합), `ci.md` (REQ-023/034, 직교), `vite-jsx-transform-channel-coherence.md` (REQ-066, 직교 + §Out-of-Scope 인계 출처), `50.blocked/spec/foundation/{devbin-install-integrity,path-alias-resolver-coherence}.md` (격리, precondition 관계). RULE-07 자기검증 — § 동작 1~9 모두 평서형·반복 검증 가능 (`grep` + `find` 1-line)·시점 비의존 (특정 vitest 메이저 default 글로브 표현은 §스코프 규칙 baseline 에만 박제, 효능 평서문은 "4축 모집단 단일성" / "루트 인벤토리 = N" 자체)·incident 귀속 부재 (도구 4축 모집단 매트릭스는 build/test 파이프라인의 상시 성질)·수단 중립 (`vite.config.test.js` 위치 결정 / `test.include` 구체 패턴 / 4축 정책 방향 어느 수단도 라벨 미박제). RULE-06 §스코프 규칙 gate 8건 (ESLint files 2 + TypeScript include 1 + Vitest coverage 1 + Vitest test 부재 1 + 루트 인벤토리 1 + src 내부 참조 1 + scripts 3축 1 + 4축 매트릭스 enumeration 1) 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/test-discovery-population-coherence.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. ID 충돌 주의: REQ-067 은 본 req 단독, 동일 세션 처리 `log-island-convergence` 와 `eslint-linter-options-default-override` 가 모두 메타에서 `REQ-20260517-068` 박제 — discovery 측 ID 발행 충돌 (본 spec 직접 영향 0, 차기 discovery 세션에서 ID 재배정 또는 메타 정정 신호). | 전 섹션 (신규) |
