# ESLint warning ↛ master 진입 자동 게이트 — warn level rule 위반 시 master 진입 차단 효능 불변식

> **위치**: `eslint.config.js` (`warn` level rule 정의 영역), `package.json` (`scripts.lint`), `.github/workflows/ci.yml` (Lint step), `.husky/pre-commit` (lint-staged 진입점).
> **관련 요구사항**: REQ-20260517-080
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제, REQ-080 흡수)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`3910ba8` 박제 시점).

## 역할
ESLint `warn` level rule 위반이 master branch 진입을 차단하지 못하는 회귀 시나리오를 자동 게이트 채널 (`npm run lint` / CI Lint step / pre-commit lint-staged / 동등 효능 채널) 중 1+ 에서 차단해야 한다는 시스템 불변식. `foundation/tooling.md` gate (j) (`npm run lint` exit 0 + warning 0) 의 **측정 시점 결과 박제** 를 **상시 강제 게이트** 로 강화하는 별 축. 의도적으로 하지 않는 것: 게이트 수단 (`--max-warnings=0` flag vs error 승격 vs custom wrapper vs env var) 선정 (수단 중립 — task 위임), `eslint.config.js` 의 `warn` level rule 자체의 error 승격 운영 결정 (별 req 후보), `reportUnusedDisableDirectives` 옵션 전환 (별 축), lint-staged `--fix` 옵션 도입 (별 축 — 자동 수정 vs 게이트), 다른 자동 게이트 (`check-spec-coherence.sh` / `check-deps-coherence.sh` / `check-vite-env-coherence.sh` / `check-node-version-coherence.sh`) 의 옵션 정합 (각 spec 영역), `tooling.md` §동작 5 의 `.ts/.tsx/.d.ts` rule swap 효능 박제 (직교 — 측정 시점 vs 상시 게이트), 특정 rule 식별자 본문 박제 (시점 비의존성 — §변경 이력 / §스코프 규칙 한정).

## 공개 인터페이스
- 측정 대상 파일:
  - `eslint.config.js` — `warn` level rule 정의 영역 (블록별 `rules` 객체).
  - `package.json` — `scripts.lint` 호출 형태, `lint-staged` 블록 옵션.
  - `.github/workflows/ci.yml` — Lint step 호출 형태.
  - `.husky/pre-commit` — `npx lint-staged` 호출 (lint-staged 의 ESLint 옵션 전파 채널).
- 측정 명령 (효능 zero-point):
  - (A) baseline 효능: `npx eslint ./src --max-warnings=0` rc=0 (회귀 0 상태에서 통과 — FR-03 zero-point).
  - (B) 회귀 fixture: 임시 `src/__warn_probe__.{ts,tsx,js,jsx}` 에 미사용 import 1건 추가 → `npx eslint ./src --max-warnings=0` rc ≠ 0 + warning 1+ stdout (FR-02 검증).
  - (C) 자동 채널 충족: `package.json:scripts.lint` 또는 `.github/workflows/ci.yml:Lint step` 또는 `package.json:lint-staged` 또는 `.husky/pre-commit` 중 1+ 가 `--max-warnings=0` 또는 동등 효능 채널을 호출 (FR-01).

## 동작
1. **(I1) warn level rule 정의 상시 박제**: `eslint.config.js` 가 1+ `warn` level rule 을 정의하는 동안, ESLint warning 출력은 자동 게이트 채널 (lint script / CI Lint step / pre-commit lint-staged / 동등 효능 채널) 중 **최소 1+** 에서 rc ≠ 0 을 발생시킨다. 본 효능은 `warn` level rule 의 존재 자체가 게이트 활성 조건 — `warn` level rule 0건이면 본 게이트는 자명 충족 (warning 출력 자체가 0).
2. **(I2) 측정 단일성**: 본 효능은 단일 명령 (`npx eslint ./src --max-warnings=0` 또는 동등 효능 wrapper / env var / npm script) 의 rc 로 측정 가능. 자동 채널이 동일 명령을 호출하면 채널 충족.
3. **(I3) 자동 채널 1+ 의존성**: `npm run lint` 단독 / CI Lint step 단독 / pre-commit lint-staged 단독 / 다중 채널 동시 — 어느 조합이든 채널 1+ 가 효능 활성 시 본 불변식 충족. 다중 채널 동시 충족은 보호 표면 누적이며 필수 조건 아님.
4. **(I4) zero-point baseline 박제**: 본 spec 발행 시점 (또는 task 회수 시점) 의 `npx eslint ./src --max-warnings=0` rc=0 + error=0 + warning=0 박제. 본 baseline 은 회귀 detection 의 zero-point — 회귀 발생 시 baseline 위반 즉시 surface.
5. **(I5) 회귀 fixture 재현성**: 임시 fixture (예: `src/__warn_probe__.ts` 의 미사용 import 1건) 도입 시 자동 채널 (I3 의 1+) 가 rc ≠ 0 으로 fail. fixture 제거 시 rc=0 회복. 본 fixture 는 PR diff 에 남기지 않는다 (`tooling.md` §동작 5.3 패턴 정합 + REQ-078 FR-04 fixture 경로 sanity 게이트 정합).
6. **(I6) 시점 비의존성 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 구체 ESLint rule 식별자 또는 hit count 박제 0. rule 식별자 / count 는 §변경 이력 메타 1회 부속 + §스코프 규칙 baseline 한정 (감사성 — `node-version-3axis-coherence.md` G7 동일 패턴).
7. **(I7) 수단 중립**: 효능 충족 수단 — (a) `package.json:scripts.lint` 가 `eslint ./src --max-warnings=0` 또는 동등 wrapper 호출 + CI Lint step 이 동 스크립트 호출, (b) `.github/workflows/ci.yml` Lint step 이 `--max-warnings=0` 옵션 직접 주입, (c) pre-commit lint-staged 가 동 옵션 주입, (d) 모든 `warn` level rule 을 `error` 로 승격 (warning 출력 자체가 0) — 어느 쪽이든 본 효능 충족. 본 spec 은 수단 후보 라벨 부여 0 (§스코프 규칙 (G8) 게이트 박제 — `awk` + `grep` 0 hit 자기 검증).
8. **(I8) 직교 정합**: 본 효능 게이트는 (a) `foundation/tooling.md` §동작 5 (`.ts/.tsx/.d.ts` rule swap) + gate (j) (`npm run lint` warning 0 측정 시점) 와 **보완** 관계 (측정 시점 + 상시 강제), (b) `regression-gate.md` 의 CI typecheck step 존재 박제와 **직교** (step 존재 vs 옵션), (c) `src-spec-reference-coherence.md` G3 (`scripts/check-spec-coherence.sh` + pre-commit) 와 직교 (spec coherence vs lint warning), (d) `typecheck-island-extension.md` `tsc` error TS 0 게이트와 직교 (`tsc` vs `eslint`), (e) `node-modules-extraneous-coherence.md` (`check-deps-coherence.sh`) 와 직교 (deps vs lint), (f) `vite-env-boundary-typing.md` (`check-vite-env-coherence.sh`) 와 직교 (env typing vs lint), (g) `node-version-3axis-coherence.md` (`check-node-version-coherence.sh`) 와 직교 (Node 메이저 vs lint). 어느 한 축 위반이 다른 축의 게이트를 자동 충족시키지 않는다.
9. **(I9) 부수 보호 표면 (`reportUnusedDisableDirectives`)**: 본 효능 게이트가 활성된 상태에서 향후 `eslint.config.js:linterOptions.reportUnusedDisableDirectives` 가 `'off' → 'warn'` 으로 전환되어 dead disable directive 가 warning 으로 surface 될 경우, 별도 게이트 추가 없이 동일 채널에서 차단된다. 본 (I9) 는 미래 변경 시점의 자동 보호 표면을 박제하며 현 시점 직접 효능 측정 대상 아님.

### 회귀 중점
- `eslint.config.js` 가 1+ `warn` level rule 을 정의하나 자동 채널 (lint script / CI Lint step / pre-commit lint-staged) 중 어느 것도 `--max-warnings=0` 또는 동등 효능을 호출하지 않으면 (I1)(I3) 위반 — warning 누적이 master 진입을 차단하지 못함.
- `package.json:scripts.lint` 의 `--max-warnings=0` 옵션 또는 동등 효능 wrapper 가 제거되면 (단, CI step / lint-staged 등 다른 채널이 보전되는 경우 제외) 채널 1+ 조건 약화 — 다른 채널 부재 시 (I3) 위반.
- `.github/workflows/ci.yml` 의 Lint step 이 `npm run lint` 대신 `npx eslint` 직접 호출로 전환되며 `--max-warnings=0` 옵션을 옮기지 않으면 (I3) 위반.
- 다른 `warn` level rule 이 신규 도입되며 자동 채널의 게이트 옵션 충족이 보장되지 않으면 (I1) 위반 — 신규 rule 의 warning 출력이 자동 채널에서 무시될 가능성.
- `eslint.config.js:linterOptions.reportUnusedDisableDirectives` 가 향후 `'warn'` 으로 전환될 때 본 게이트가 비활성이면 dead disable directive 누적 — (I9) 부수 보호 표면 미작동.
- 본 spec 본문에 구체 ESLint rule 식별자 박제 시 (I6) 위반 — 시점 비의존성 무력화 (rule 식별자 변경 / 추가 / 제거 이벤트 시 spec 본문 갱신 의무 발생).
- 본 spec 본문에 수단 후보 라벨 박제 시 (I7) 위반 — RULE-07 정합 무력화.

## 의존성
- 외부: ESLint (v9+ flat-config), `--max-warnings` CLI flag, `linterOptions.reportUnusedDisableDirectives` option.
- 내부: `eslint.config.js` (`warn` level rule 정의), `package.json` (`scripts.lint` 호출 형태, `lint-staged` 블록), `.github/workflows/ci.yml` (Lint step), `.husky/pre-commit` (lint-staged 진입점).
- 역의존: `foundation/tooling.md` §동작 5 + gate (j) (보완 관계 — 측정 시점 + 상시 강제), `regression-gate.md` (CI workflow 회귀 게이트 차원), `src-spec-reference-coherence.md` G3 (자동 게이트 패턴 공유 메타), `node-modules-extraneous-coherence.md` / `vite-env-boundary-typing.md` / `node-version-3axis-coherence.md` (자동 게이트 메타 패턴 공유).

## 테스트 현황
- [ ] (I1) warn level rule 정의 상시 박제: `eslint.config.js` 가 1+ `warn` level rule 을 정의하는 동안 자동 채널 1+ 가 `--max-warnings=0` 또는 동등 효능 호출. 현재 baseline: 자동 채널 0건 (HEAD=`3910ba8` 실측 — `package.json:scripts.lint`, `.github/workflows/ci.yml:30-31`, `.husky/pre-commit`, `package.json:lint-staged` 모두 `--max-warnings` 옵션 부재). task 수행 후 marker 플립.
- [x] (I2) 측정 단일성: 본 효능은 `npx eslint ./src --max-warnings=0` 단일 명령 rc 로 측정 가능 — 본 spec §공개 인터페이스 (A) 평서 박제. HEAD=`3910ba8` 박제 시점 PASS.
- [ ] (I3) 자동 채널 1+ 의존성: 현재 baseline 0 채널 (HEAD=`3910ba8` 실측 MISS — (I1) 와 동치). task 수행 후 marker 플립.
- [x] (I4) zero-point baseline: `npx eslint ./src --max-warnings=0` → rc=0 + error=0 + warning=0 (HEAD=`3910ba8` 실측 PASS — §스코프 규칙 (G1)).
- [ ] (I5) 회귀 fixture 재현성: 임시 fixture 도입 시 자동 채널 rc ≠ 0 + 제거 시 rc=0 회복. task 단 fixture 도입/제거 사이클 실증 후 marker 플립.
- [x] (I6) 시점 비의존성: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 구체 `warn` level rule 이름 (`no-unused-vars` / `@typescript-eslint/no-unused-vars`) 박제 0 — `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/foundation/lint-warning-zero-gate.md | grep -cE "no-unused-vars|@typescript-eslint/no-unused-vars"` → 0 hit (§스코프 규칙 (G7) 박제). HEAD=`3910ba8` 박제 시점 PASS.
- [x] (I7) 수단 중립: §역할 + §동작 7 에 수단 후보 4 카테고리 박제, 라벨 0. `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/lint-warning-zero-gate.md | grep -cE "기본값|권장|우선|default|best practice"` → 0 hit (§스코프 규칙 (G8) 박제). HEAD=`3910ba8` 박제 시점 PASS.
- [x] (I8) 직교 정합: §역할 + §동작 8 에 7개 관련 spec 과의 직교/보완 평서 박제. 본 spec 박제 자체로 정합 박제.
- [ ] (I9) 부수 보호 표면: 미래 `reportUnusedDisableDirectives: 'off' → 'warn'` 전환 시점에 dead disable 차단 효능 surface — 차기 이벤트 발생 후 marker 플립.

## 수용 기준
- [ ] (Must, FR-01) `eslint.config.js` 가 1+ `warn` level rule 을 정의하는 동안 자동 게이트 채널 (lint script / CI Lint step / pre-commit lint-staged / 동등 효능 채널) 중 **최소 1+** 가 warning 1+ → rc ≠ 0 효능 활성. 현재 baseline 자동 채널 0건. task 수행 후 marker 플립.
- [ ] (Must, FR-02) 회귀 검증 — 임시 fixture (예: `src/__warn_probe__.ts` 미사용 import 1건) 도입 시 자동 채널 rc ≠ 0 fail + 제거 시 rc=0 회복. task 단 fixture 사이클 실증 후 marker 플립.
- [x] (Must, FR-03) zero-point baseline — HEAD=`3910ba8` 실측 `npx eslint ./src --max-warnings=0` rc=0 + error=0 + warning=0 박제 (§스코프 규칙 (G1)).
- [x] (Must, FR-04) 시점 비의존 — 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 구체 `warn` level rule 이름 박제 0. `awk` + `grep` 0 hit (§스코프 규칙 (G7)).
- [ ] (Should, FR-05) 직교 정합 — 본 효능 게이트는 7개 관련 spec 과 직교/보완 관계 (§동작 8 평서). 본 spec 박제 자체로 정합 박제 가능하나, task 수행 후 자동 채널이 다른 게이트 (typecheck / spec coherence / deps / env / Node 메이저) 와 동시 활성 시 cross-gate 정합 hook-ack — 차기 이벤트 발생 후 marker 플립.
- [ ] (Could, FR-06) `reportUnusedDisableDirectives` 부수 보호 — 미래 `'off' → 'warn'` 전환 시점에 dead disable 차단 효능 surface. 차기 이벤트 발생 후 marker 플립.
- [x] (Must, FR-07) 수단 라벨 0 — 본 spec 본문에 `기본값|권장|우선|default|best practice` 0 hit. `awk` + `grep` 0 hit (§스코프 규칙 (G8)).
- [x] (NFR-01) 시점 비의존 — FR-04 동치. 본문 박제 0 + 감사성 메타 1회 부속 (§변경 이력) 정합.
- [x] (NFR-02) 게이트 단일성 — §공개 인터페이스 (A) `npx eslint ./src --max-warnings=0` 단일 명령 rc 박제. 복수 게이트 AND 필수 분기 명시 부재 (단일 명령 충분).
- [x] (NFR-03) RULE-07 정합 — 결과 효능 (warning ↛ master 진입) 만 박제. 1회성 진단 / 릴리스 귀속 patch / TODO 나열 0.
- [x] (NFR-04) RULE-06 정합 — §스코프 규칙 grep-baseline 8 gate (G1~G8) 실측 박제 (HEAD=`3910ba8`).
- [ ] (NFR-05) RULE-02 정합 — task 회수 시 변경 표면 = `.github/workflows/ci.yml` 1+ 또는 `package.json:scripts` 1+ 또는 `eslint.config.js` 1+ 또는 `.husky/*` 1+ (수단 중립). `src/**` 변경 0 (fixture 도입/제거는 PR diff 외부). task 회수 후 marker 플립.

## 스코프 규칙
- **expansion**: N/A (자동 게이트 채널 박제 — task 발행 시점에 planner 가 scope 규칙 재계산).
- **grep-baseline** (HEAD=`3910ba8`, 2026-05-17 — REQ-080 흡수 시점 실측):
  - (G1) **[zero-point baseline]** `npx eslint ./src --max-warnings=0` → **rc=0 + error=0 + warning=0** (HEAD=`3910ba8` 실측 PASS — FR-03 zero-point).
  - (G2) **[현 lint script 옵션 부재]** `grep -nE "\"lint\":" package.json` → 1 hit @`package.json:23` (`"lint": "eslint ./src"` — `--max-warnings` 옵션 부재). FR-01 baseline MISS — 자동 채널 0 (lint script 축).
  - (G3) **[CI Lint step 옵션 부재]** `grep -nE "npm run lint" .github/workflows/ci.yml` → 1 hit @`:31` (CI Lint step 이 `npm run lint` 만 호출 — 옵션 직접 주입 0). FR-01 baseline MISS — 자동 채널 0 (CI step 축).
  - (G4) **[lint-staged 옵션 부재]** `grep -nE "\"src/\*\*" package.json` → 1 hit @`:43` (`"src/**/*.{js,jsx,ts,tsx,d.ts}": "eslint"` — `--max-warnings` 옵션 부재). FR-01 baseline MISS — 자동 채널 0 (lint-staged 축).
  - (G5) **[warn level rule 존재 baseline]** `grep -cE "'warn'" eslint.config.js` → **3 hit** (HEAD=`3910ba8` 실측 — 본 spec 본문 박제 0 효능 보장하기 위해 hit 수치만 박제, 구체 rule 이름은 §변경 이력 메타 1회 부속 한정). 본 spec 의 자동 게이트 활성 조건 충족 (1+ `warn` level rule 존재).
  - (G6) **[reportUnusedDisableDirectives 현 상태]** `grep -nE "reportUnusedDisableDirectives" eslint.config.js` → 1 hit @`:21` (`reportUnusedDisableDirectives: 'off'`). FR-06 부수 보호 표면 비활성 baseline. 향후 `'warn'` 전환 시 본 게이트 효능 활성 시 자동 차단.
  - (G7) **[FR-04 시점 비의존성 자기 검증]** `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/foundation/lint-warning-zero-gate.md | grep -cE "no-unused-vars|@typescript-eslint/no-unused-vars"` → **0 hit** (본 spec 본문 §역할 + §동작 + §회귀 중점 + §의존성 어디서도 구체 rule 이름 박제 0). HEAD=`3910ba8` 박제 시점 실측 PASS.
  - (G8) **[FR-07 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/lint-warning-zero-gate.md | grep -cE "기본값|권장|우선|default|best practice"` → **0 hit** (본 spec 본문 §역할 + §동작 + §회귀 중점 한정 — 수단 후보 라벨 부여 0). HEAD=`3910ba8` 박제 시점 실측 PASS.
- **rationale**: (G1)(G2)(G3)(G4) 본 spec 핵심 회복 대상 baseline — zero-point PASS 이나 자동 채널 0 (FR-01·FR-02 MISS). (G5) 자동 게이트 활성 조건 충족 박제 (`warn` rule 1+ 존재). (G6) 부수 보호 표면 baseline (현재 비활성). (G7)(G8) RULE-07 정합 자기 검증.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-080 흡수) / pending (HEAD=`3910ba8`) | 최초 박제 — ESLint warning ↛ master 진입 자동 게이트 9 축 (I1~I9) 게이트. baseline: zero-point PASS (G1 rc=0/err=0/warn=0) 이나 자동 채널 0 (G2 `package.json:23` lint script 옵션 부재 / G3 `.github/workflows/ci.yml:31` CI Lint step 옵션 부재 / G4 `package.json:43` lint-staged 옵션 부재). `warn` level rule 존재 박제 (G5 3 hit — JS/JSX `'no-unused-vars'` + TS `'@typescript-eslint/no-unused-vars'` + `linterOptions.reportUnusedDisableDirectives` 명시 `'off'` 우회로 추가 `'warn'` default 회피 1건). 본 spec 분리 결정 근거: `foundation/tooling.md` 가 211 줄 + 7건 불변식 누적 + §동작 5 (rule swap 측정 시점) 와 본 효능 (상시 강제 게이트) 이 별 축 (RULE-07 spec 단일성) — 별 spec 분리가 게이트 단일성 + 변경 영향 분리 효능. consumed req: `specs/20.req/20260517-eslint-warning-zero-master-gate.md` (REQ-080) → `60.done/2026/05/17/req/` mv. 선행 자매 spec (자동 게이트 메타 패턴 공유): `foundation/src-spec-reference-coherence.md` (REQ-071) G3 / `foundation/node-modules-extraneous-coherence.md` (REQ-073) / `foundation/vite-env-boundary-typing.md` (REQ-072) / `foundation/node-version-3axis-coherence.md` (REQ-079 + TSK-14 회수 `3910ba8`). RULE-07 자기검증 — (I1)~(I9) 모두 평서형·반복 검증 가능 (`npx eslint` + `grep` 단일 명령)·시점 비의존 (G7 0 hit — 구체 rule 이름 본문 박제 0)·incident 귀속 부재 (REQ-080 §배경 의 회귀 가설은 시점 비의존 시나리오)·수단 중립 (G8 0 hit — 수단 후보 4 카테고리 라벨 0). RULE-06 §스코프 규칙 8 gate (G1~G8) 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/lint-warning-zero-gate.md` create). | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-eslint-warning-zero-master-gate.md` (REQ-080 — 본 세션 mv).
- **선행 자매 spec (자동 게이트 메타 패턴 공유)**:
  - `specs/30.spec/green/foundation/src-spec-reference-coherence.md` (REQ-20260517-071) G3 — `scripts/check-spec-coherence.sh` + `.husky/pre-commit` 자동 게이트 패턴. 본 spec 의 game plan 참조.
  - `specs/30.spec/green/foundation/node-modules-extraneous-coherence.md` (REQ-20260517-073) — `scripts/check-deps-coherence.sh` 자동 게이트. 본 spec 과 직교.
  - `specs/30.spec/green/foundation/vite-env-boundary-typing.md` (REQ-20260517-072) — `scripts/check-vite-env-coherence.sh` 자동 게이트. 본 spec 과 직교.
  - `specs/30.spec/green/foundation/node-version-3axis-coherence.md` (REQ-20260517-079, TSK-14 회수 `3910ba8`) — `scripts/check-node-version-coherence.sh` 자동 게이트. 본 spec 과 직교.
- **관련 spec (보완 / 직교)**:
  - `specs/30.spec/green/foundation/tooling.md` (REQ-028 + REQ-053 + REQ-058 + REQ-075 + REQ-078) — §동작 5 (`.ts/.tsx/.d.ts` no-unused-vars rule swap) + gate (j) (`npm run lint` warning 0 측정 시점) 와 **보완** 관계. 본 spec 은 측정 시점 결과 박제를 상시 강제 게이트로 강화하는 별 축.
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — CI typecheck step 존재 박제. 본 spec 과 **직교** (step 존재 vs 옵션).
  - `specs/30.spec/green/foundation/typecheck-island-extension.md` (REQ-077 등) — `tsc` error TS 0 게이트. 본 spec 과 직교 (`tsc` vs `eslint`).
- **외부 레퍼런스**:
  - ESLint 공식 — `--max-warnings <Int>` CLI flag (`https://eslint.org/docs/latest/use/command-line-interface#--max-warnings`). default `-1` (검사 비활성) — 본 spec FR-01 게이트 부착 효능 근거.
  - ESLint 공식 — `linterOptions.reportUnusedDisableDirectives` (`https://eslint.org/docs/latest/use/configure/configuration-files#configuring-linter-options`). FR-06 부수 보호 표면 근거.
- **감사성 메타 (1회 부속, NFR-01 정합)**: HEAD=`3910ba8` 실측 시점 `warn` level rule = JS/JSX `'no-unused-vars'` (eslint.config.js:64) + TS `'@typescript-eslint/no-unused-vars'` (eslint.config.js:83) 총 2건 rule 정의 + `linterOptions.reportUnusedDisableDirectives: 'off'` (eslint.config.js:21) 명시 우회 1건 — 본문 박제 0 (본 §참고 한정).
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G7 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`npx eslint` + `grep` 1-line) · incident 귀속 부재. 수단 박제 0 (G8 0 hit 자기 검증).
  - RULE-06: grep-baseline 8 gate (G1~G8) 실측 박제 (HEAD=`3910ba8`).
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/lint-warning-zero-gate.md` create).
