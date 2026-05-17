# `package.json:scripts` prefix 카테고리 단일성 — `check:` (진단 게이트) vs `lint:` (코드 스타일) 효능 1:1 매핑 불변식

> **위치**: `package.json` (`scripts` 블록), 호출부 — `.husky/**`, `.github/workflows/**`, `specs/30.spec/**`, `specs/40.task/**`.
> **관련 요구사항**: REQ-20260517-083
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제, REQ-083 흡수; Phase 1 reconcile (I2) + FR-01·FR-02 + NFR-05 marker 4건 hook-ack 플립 by TSK-20260517-20 / `985c76e`)

> 본 spec 은 시스템 횡단 명명 계약. 라인 번호는 §스코프 규칙 grep-baseline 박제 (작성 시 inspector 책임).

## 역할
`package.json:scripts` 의 prefix 명명 단일성 — `check:<name>` 진입점은 효능이 **진단 게이트 / coherence 검증** (`bash scripts/check-*-coherence.sh` 또는 동등 효능 — 사실 측정 + rc ≠ 0 fail) 카테고리 한정, `lint:<name>` 진입점은 효능이 **코드 스타일 / 정적 분석** (eslint / prettier / stylelint / 동등 효능 — AST/문법 분석 + 위반 검출) 카테고리 한정. 두 카테고리는 효능상 직교 — 어느 한 카테고리의 script 가 다른 카테고리의 효능을 동시에 박제하면 본 계약 위반. 의도적으로 하지 않는 것: 현 anomaly 해소 수단 선정 (rename vs alias vs reverse 통일), `lint:*` sub-script 카테고리 박제 결정 (별 req 후보), 다른 prefix 카테고리 (`test:*` / `build:*` / `dev:*`) 정합 (별 req), `pretest` / `prepublishOnly` 등 npm lifecycle hook 진입점 박제 (npm 공식 lifecycle 영역), `npm-run-all` / `concurrently` aggregator 도입 (수단 영역), `package.json:scripts.lint` (top-level, prefix 없음) 자체의 효능, `make` / `just` / `Taskfile.yml` 등 외부 진입점 관리 도구 명명 (도구 영역 제외).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `package.json:scripts` ↔ 호출부 간 명명 정합의 결과 효능을 grep / node 1-liner 로 검증.

## 동작
1. **(I1) prefix ↔ 효능 카테고리 1:1 매핑**: `package.json:scripts.<prefix>:<name>` 진입점의 효능 카테고리 (진단 게이트 vs 코드 스타일) 와 prefix (`check:` vs `lint:`) 는 1:1 정합. `bash scripts/check-*-coherence.sh` 또는 동등 효능 (사실 측정 + rc ≠ 0 fail) 을 호출하는 진입점은 `check:` prefix 박제. `eslint` / `prettier` / `stylelint` 또는 동등 효능 (AST/문법 분석 + 위반 검출) 을 호출하는 진입점은 `lint:` prefix 박제.
2. **(I2) anomaly 검출 단일 게이트**: `scripts/check-*-coherence.sh` 또는 `scripts/check-*.sh` 를 호출하는 npm script 가 `lint:` prefix 박제된 hit 0 — 단일 grep (`grep -nE "\"lint:[^\"]+\":\s*\"bash\s+scripts/check-" package.json`) 으로 측정. 동등 검증: node 1-liner (`node -e "const p=require('./package.json'); for (const [k,v] of Object.entries(p.scripts)) { if (k.startsWith('lint:') && /scripts\/check-/.test(v)) { console.error(k); process.exit(1); } }"`).
3. **(I3) 호출부 정합**: 호출부 (spec / task / docs / `.husky/**` / `.github/workflows/**`) 에서 `npm run lint:<name>` 또는 `npm run check:<name>` 형태 호출 시, 호출자가 박제한 명칭이 `package.json:scripts` 의 키에 실재한다 — `grep -rnE "npm run (lint|check):" .husky .github/workflows specs/30.spec specs/40.task` 의 각 hit 명칭이 `package.json:scripts` 키 set 에 포함.
4. **(I4) 신규 `scripts/check-*.sh` 도입 시 자동 정합**: 새 `scripts/check-<new>.sh` 진단 게이트 추가 PR 시 `package.json:scripts` 진입점은 `check:<short>` prefix 로 박제 (I1 정합). 신규 도입 PR 의 회귀 검출은 (I2) 게이트가 자동 surface.
5. **(I5) 카테고리 경계 평서**: (a) 진단 게이트 / coherence 검증 = `scripts/check-*-coherence.sh` 또는 효능상 "사실 측정 + rc ≠ 0 fail" 형태, (b) 코드 스타일 / 정적 분석 = `eslint` / `prettier` / `stylelint` / `tsc --noEmit` 또는 효능상 "AST/문법 분석 + 위반 검출" 형태. 두 카테고리 직교 — 어느 한 진입점이 두 효능을 동시 박제하면 본 spec 적용 모호 (경계 모호 사례는 별도 평서 필요).
6. **(I6) 자매 spec 직교 정합**: 본 카테고리 단일성은 (a) 단일 게이트 spec (`src-spec-reference-coherence.md` G3, `node-modules-extraneous-coherence.md`, `vite-env-boundary-typing.md`, `node-version-3axis-coherence.md`) 의 단일 진입점 박제 효능과 직교 (단일 진입점 박제 vs 카테고리 정합), (b) 진단 script 자동 채널 부착 메타 spec (`diagnostic-script-auto-channel-coverage.md`) 의 채널 매트릭스 효능과 직교 (명명 vs 채널 부착), (c) `lint-warning-zero-gate.md` 의 rule level 효능과 직교 (명명 vs warning level). 어느 한 축 위반이 다른 축 게이트를 자동 충족시키지 않는다.
7. **(I7) 수단 중립 (RULE-07)**: 본 spec 본문 어느 곳에서도 anomaly 해소 수단 후보 (rename vs alias vs reverse 통일 vs 양방향 alias) 에 선호 라벨 부여 0. 효능 박제는 "카테고리 ↔ prefix 1:1 매핑" 평서 한정. 라벨 hit 자기 검증은 §스코프 규칙 게이트 박제.
8. **(I8) 시점 비의존 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 현 시점 구체 진입점 명칭 또는 anomaly count 박제 0. baseline 매트릭스 (현 시점 진단 게이트 진입점 분포) 는 §스코프 규칙 grep-baseline 한정 (감사성).
9. **(I9) 스코프 경계**: 본 효능은 `package.json:scripts` 키 prefix 한정. `package.json` 외부 (예: `.husky/<hook>` 내부 직접 명령) 또는 다른 도구 (`make`, `just`, `Taskfile.yml`) 의 진입점 명명은 본 spec 외부 — 필요 시 별 spec.

### 회귀 중점
- 새 `scripts/check-<new>.sh` 진단 게이트 추가 PR 시 `package.json:scripts` 진입점이 `lint:<short>` 로 박제되면 (I2) 위반 — anomaly 누적.
- 기존 `lint:` prefix 진입점의 효능이 `eslint` 또는 동등 정적 분석 → `scripts/check-*-coherence.sh` 로 전환되면 (I2) 위반 — 효능 카테고리 분류 변경 시 prefix rename 의무 surface.
- `check:` prefix 진입점의 효능이 `bash scripts/check-*-coherence.sh` → `eslint --rule ...` 으로 전환되면 (I1) 위반 (반대 방향).
- 호출부 (spec / task / `.husky/**` / `.github/workflows/**`) 가 `package.json:scripts` 키에 실재하지 않는 명칭을 호출하면 (I3) 위반 — script rename 또는 alias 추가 후 호출부 미동기화 detection.
- `npm-run-all` 또는 `npm run check:*` glob aggregator 도입 시 `lint:<name>` (진단 게이트 카테고리) 누락 — (I1) 위반 누적이 aggregator 효능 분리로 표면.
- 본 spec 본문에 구체 npm script 이름 박제 시 (I8) 위반 — 시점 비의존성 무력화 (script rename / 추가 / 제거 이벤트 시 spec 본문 갱신 의무 발생).
- 본 spec 본문에 수단 후보 라벨 박제 시 (I7) 위반 — RULE-07 정합 무력화.

## 의존성
- 외부: npm CLI (`scripts` 진입점 호출 규약), POSIX shell (`bash`), `grep`.
- 내부: `package.json:scripts` 블록, `scripts/check-*-coherence.sh` (효능 카테고리 (a) 입력), `eslint.config.js` / 동등 정적 분석 도구 설정 (효능 카테고리 (b) 입력).
- 역의존 (사용처): `.husky/**` (`pre-commit` / `pre-push` 진입점 호출), `.github/workflows/**` (CI job step 호출), `specs/30.spec/**` (게이트 박제 spec 의 자동 채널 진입점 노출), `specs/40.task/**` (DoD 게이트 호출).

## 테스트 현황
- [x] (I1) prefix ↔ 효능 카테고리 1:1 매핑 평서 박제 — 본 spec §동작 1·5 박제로 정합.
- [x] (I2) anomaly 검출 단일 게이트 PASS — TSK-20260517-20 (`985c76e`) 회수: `lint:spec-coherence` → `check:spec-coherence` rename. HEAD=`985c76e` 재실측: `grep -nE "\"lint:[^\"]+\":\s*\"bash\s+scripts/check-" package.json` → **0 hit** (baseline 1 hit @`:24` → 회수 PASS).
- [x] (I3) 호출부 정합 baseline PASS — 호출부 4 hit 전원 `package.json:scripts` 키에 실재 (`grep -rnE "npm run (lint\|check):" .husky .github/workflows` → 4 hit / 모두 키 set 포함).
- [ ] (I4) 신규 `scripts/check-*.sh` 도입 시 자동 정합 — 차기 신규 진단 script 도입 PR 후 marker 플립 (재현 사례 누적).
- [x] (I5) 카테고리 경계 평서 박제 — 본 spec §동작 5 박제로 정합.
- [x] (I6) 자매 spec 직교 정합 — 본 spec §동작 6 박제로 정합.
- [x] (I7) 수단 중립 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/npm-script-prefix-coherence.md | grep -cE "기본값|권장|우선|default|best practice"` → 0 hit (§스코프 규칙 G5 박제).
- [x] (I8) 시점 비의존 (RULE-07) — `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/foundation/npm-script-prefix-coherence.md | grep -cE "(lint|check):[a-z-]+(\s|$|\b)"` → 0 hit 본문 박제 (§스코프 규칙 G6 박제).
- [x] (I9) 스코프 경계 박제 — 본 spec §동작 9 박제로 정합.

## 수용 기준
- [x] (Must, FR-03) zero-point baseline — HEAD=`49f3f93` 실측 매트릭스 박제 (§스코프 규칙 G1·G2·G3·G4).
- [x] (Must, FR-01) `package.json:scripts` prefix 카테고리 단일성 — `check:<name>` ↔ 진단 게이트 / `lint:<name>` ↔ 코드 스타일 1:1 정합. TSK-20260517-20 (`985c76e`) 회수: `lint:spec-coherence` → `check:spec-coherence` rename → 4 진단 게이트 모두 `check:` prefix 정합 (`check:spec-coherence` + `check:vite-env` + `check:deps` + `check:node-coherence`) / `lint:*` script 키 0건 (top-level `lint` + lint-staged 블록은 본 spec 외부 — FR-10 스코프 경계 정합).
- [x] (Must, FR-02) anomaly 검출 게이트 — HEAD=`985c76e` 재실측: `grep -nE "\"lint:[^\"]+\":\s*\"bash\s+scripts/check-" package.json` → **0 hit** (baseline 1 hit @`:24` → 회수 PASS). TSK-20260517-20 (`985c76e`).
- [x] (Should, FR-03) 호출부 정합 — `npm run lint:<name>` 또는 `npm run check:<name>` 호출이 `package.json:scripts` 키에 실재. HEAD=`49f3f93` 실측 PASS (§스코프 규칙 G4 4 hit / 모두 키 실재).
- [ ] (Could, FR-04) 신규 `scripts/check-*.sh` 추가 시 자동 정합 — 차기 진단 script 도입 PR 의 진입점 prefix 자동 `check:<short>` 박제. 회귀 시 (I2) 게이트 자동 surface. 차기 이벤트 후 marker 플립.
- [x] (Must, FR-05) baseline 박제 — §스코프 규칙 grep-baseline G1·G2·G3·G4 4 gate 실측 매트릭스 (HEAD=`49f3f93`).
- [x] (Must, FR-06) 시점 비의존성 — 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 현 anomaly 구체 npm script 이름 / count / 매트릭스 cell 분포 박제 0 (§스코프 규칙 G6 자기 검증).
- [x] (Should, FR-07) 효능 카테고리 경계 평서 — §동작 5 (a)(b) 효능 형태 평서 박제. 경계 모호 사례 (`tsc --noEmit` 정적 분석 vs `node scripts/check-tsconfig-strict.sh` 진단 게이트) 별도 명시 가능.
- [x] (Should, FR-08) 직교 정합 — §동작 6 자매 spec 3축 직교 평서 박제.
- [x] (Must, FR-09) 수단 라벨 0 — `awk` + `grep` 0 hit (§스코프 규칙 G5 자기 검증).
- [x] (Must, FR-10) 스코프 경계 — §동작 9 박제 (`package.json:scripts` 키 prefix 한정, 외부 도구 영역 명시).
- [x] (NFR-01) 시점 비의존 — FR-06 동치.
- [x] (NFR-02) 게이트 단일성 — §동작 2 단일 grep 또는 node 1-liner 측정 박제.
- [x] (NFR-03) RULE-07 정합 — 결과 효능 (카테고리 ↔ prefix 1:1 매핑) 만 박제. 1회성 진단 (현 anomaly 1건) 은 §스코프 규칙 한정.
- [x] (NFR-04) RULE-06 정합 — §스코프 규칙 grep-baseline 6 gate (G1~G6) 실측 박제 (HEAD=`49f3f93`).
- [x] (NFR-05) RULE-02 정합 — TSK-20260517-20 (`985c76e`) 회수: 변경 표면 = `package.json:24` 1줄 key rename (`lint:spec-coherence` → `check:spec-coherence`, 값 변경 0). `src/**` 변경 0 + `scripts/check-spec-coherence.sh` 자체 변경 0 + `.husky/**` 변경 0 + workflows 변경 0. TSK-20 result.md DoD 박제 (`npm run lint` rc=0 + `npm test` 48 file / 440 test PASS / 회귀 0 + `npm run build` rc=0 + `npm run check:spec-coherence` rc=0).
- [x] (NFR-06) 도구 영역 제외 — §동작 9 박제 (`make` / `just` / `Taskfile.yml` 영역 명시).

## 스코프 규칙
- **expansion**: N/A (시스템 횡단 명명 게이트 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`49f3f93`, 2026-05-17 — REQ-083 흡수 시점 실측):
  - (G1) **[anomaly 검출 baseline]** `grep -nE "\"lint:[^\"]+\":\s*\"bash\s+scripts/check-" package.json` → **1 hit** @`package.json:24` (효능 카테고리 (a) 진단 게이트 + prefix `lint:` — (I1)·(I2) baseline MISS). 본 hit 은 본 spec 의 회복 대상 zero-point.
  - (G2) **[`lint:*` 전수 baseline]** `grep -nE "^\s*\"lint[^\"]*\":" package.json` → 4 hit (`package.json:23` `lint` top-level + `:24` `lint:spec-coherence` + `:46` `lint-staged` 블록 키 (script 아님) + `:64` `lint-staged` devDep 키 (script 아님)). script 키만 카운트 시 2건 — top-level (FR-10 본 spec 외부) + `lint:<name>` 1건 (anomaly).
  - (G3) **[`check:*` 전수 baseline]** `grep -nE "^\s*\"check[^\"]*\":" package.json` → 3 hit (`:25` `check:vite-env` + `:26` `check:deps` + `:27` `check:node-coherence` — 전원 효능 카테고리 (a) 진단 게이트 + prefix `check:` 정합). FR-01 정합 baseline.
  - (G4) **[호출부 정합 baseline]** `grep -rnE "npm run (lint|check):" .husky .github/workflows` → 4 hit (`.husky/pre-push:1` `npm run check:deps` + `.github/workflows/ci.yml:28` `npm run check:deps` + `:31` `npm run check:node-coherence` + `:37` `npm run check:vite-env`). 모두 `package.json:scripts` 키 실재 — (I3) PASS. `lint:spec-coherence` 자동 채널 호출 0 (직접 `bash scripts/check-spec-coherence.sh` `.husky/pre-commit` 직접 호출 — npm script 명칭 우회 — 무영향).
  - (G5) **[FR-09 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/npm-script-prefix-coherence.md | grep -cE "기본값|권장|우선|default|best practice"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 anomaly 해소 수단 후보 라벨 부여 0). HEAD=`49f3f93` 박제 시점 PASS.
  - (G6) **[FR-06 시점 비의존성 자기 검증]** `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/foundation/npm-script-prefix-coherence.md | grep -cE "lint:spec-coherence|check:vite-env|check:deps|check:node-coherence"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 현 구체 npm script 이름 박제 0). HEAD=`49f3f93` 박제 시점 PASS.
- **rationale**: (G1)(G2)(G3) 본 spec 핵심 baseline — anomaly 1건 박제 + 정합 3건 박제. (G4) 호출부 정합 PASS (4 hit 모두 키 실재). (G5)(G6) RULE-07 정합 자기 검증. 매트릭스 cell 분포: 4 진단 게이트 (`lint:spec-coherence` + `check:vite-env` + `check:deps` + `check:node-coherence`) 중 1 anomaly + 3 정합 — 본 baseline 은 회귀 detection 의 zero-point.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 1 reconcile) / `985c76e` (TSK-20260517-20) | (I2) + FR-01·FR-02 + NFR-05 marker 4건 hook-ack 플립. HEAD=`985c76e` 재실측 전수 PASS — G1 0 hit (was 1) / G3 4 hit (was 3, `check:spec-coherence` 신규) / G4 4 hit (모두 키 실재). `package.json:24` 1줄 키 rename (`lint:spec-coherence` → `check:spec-coherence`). runtime 변경 0 + script 자체 변경 0. | 테스트 현황 + 수용 기준 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-083 흡수) / pending (HEAD=`49f3f93`) | 최초 박제 — `package.json:scripts` prefix 카테고리 단일성 9 축 (I1~I9) 게이트. baseline 매트릭스: 4 진단 게이트 (`scripts/check-*-coherence.sh` 호출) 중 1 anomaly (`lint:` prefix 1 hit `:24`) + 3 정합 (`check:` prefix 3 hit `:25/:26/:27`). 호출부 baseline PASS (4 hit / 모두 키 실재). 본 spec 분리 결정 근거: 자매 spec (`src-spec-reference-coherence.md` G3, `node-modules-extraneous-coherence.md`, `vite-env-boundary-typing.md`, `node-version-3axis-coherence.md` — 단일 진입점 박제) 와 본 효능 (횡단 명명 카테고리 단일성) 이 별 축 (단일 게이트 박제 vs 명명 단일성) — 별 spec 분리가 게이트 단일성 + 변경 영향 분리 효능. `lint-warning-zero-gate.md` 와 패턴 동질 (자동 게이트 횡단 메타) + 영역 직교 (warning rule level vs script naming). `diagnostic-script-auto-channel-coverage.md` 와 패턴 동질 + 영역 직교 (자동 채널 부착 vs 명명 카테고리). consumed req: `specs/20.req/20260517-npm-script-prefix-category-coherence.md` (REQ-083) → `60.done/2026/05/17/req/` mv. consumed followup (감사 pointer): `specs/60.done/2026/05/17/followups/20260517-0608-lint-script-naming-convention.md` (source_task: TSK-20260517-17, category: naming-convention, severity: low). RULE-07 자기검증 — (I1)~(I9) 모두 평서형·반복 검증 가능 (`grep` 또는 node 1-liner 단일 명령)·시점 비의존 (G6 0 hit — 구체 npm script 이름 본문 박제 0)·incident 귀속 부재 (REQ-083 §배경 의 회귀 가설은 시점 비의존 시나리오)·수단 중립 (G5 0 hit — anomaly 해소 수단 후보 라벨 0). RULE-06 §스코프 규칙 6 gate (G1~G6) 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/npm-script-prefix-coherence.md` create). | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-npm-script-prefix-category-coherence.md` (REQ-083 — 본 세션 mv).
- **followup 흡수 (본 spec 의 트리거)**:
  - `specs/60.done/2026/05/17/followups/20260517-0608-lint-script-naming-convention.md` (source_task: TSK-20260517-17, category: naming-convention, severity: low).
- **선행 자매 spec (단일 진입점 박제 — 본 spec 직교)**:
  - `specs/30.spec/green/foundation/src-spec-reference-coherence.md` (REQ-20260517-071) G3 — `scripts/check-spec-coherence.sh` + `.husky/pre-commit` + `package.json scripts.lint:spec-coherence` 단일 진입점 박제. 본 spec 효능 도입 시 G3 박제의 npm script 명칭 갱신 필요 (수단 라벨 0).
  - `specs/30.spec/green/foundation/node-modules-extraneous-coherence.md` (REQ-20260517-073) — `scripts/check-deps-coherence.sh` 단일 진입점 + `check:deps` 박제 (정합).
  - `specs/30.spec/blue/foundation/vite-env-boundary-typing.md` (REQ-20260517-072) — `scripts/check-vite-env-coherence.sh` 단일 진입점 + `check:vite-env` 박제 (정합).
  - `specs/30.spec/blue/foundation/node-version-3axis-coherence.md` (REQ-20260517-079) — `scripts/check-node-version-coherence.sh` 단일 진입점 + `check:node-coherence` 박제 (정합).
- **관련 spec (보완 / 직교)**:
  - `specs/30.spec/green/foundation/lint-warning-zero-gate.md` (REQ-20260517-080) — ESLint warning ↛ master 자동 게이트. 본 spec 과 직교 (rule level vs naming).
  - `specs/30.spec/green/foundation/diagnostic-script-auto-channel-coverage.md` (REQ-20260517-081) — 진단 script 자동 채널 부착 매트릭스. 본 spec 과 직교 (채널 부착 vs 명명).
  - `specs/30.spec/green/foundation/tooling.md` (REQ-028 + REQ-053 + REQ-058 + REQ-075 + REQ-078) — ESLint / lint-staged / `.husky/pre-commit` 진입점 박제. 본 spec 과 직교 (도구 측 계약 vs 명명 단일성).
- **외부 레퍼런스**:
  - npm 공식 — `scripts` 진입점 규약 (`https://docs.npmjs.com/cli/v10/using-npm/scripts`). `:` 콜론 기반 카테고리화 관례 + `npm run check:*` glob 호출 가능.
  - `npm-run-all` 공식 — `run-p check:*` / `run-s check:*` glob 호출 패턴 (`https://github.com/mysticatea/npm-run-all`).
  - Node.js Best Practices community — `npm scripts` naming convention (`https://github.com/goldbergyoni/nodebestpractices`).
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G6 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`grep` 또는 node 1-liner) · incident 귀속 부재. 수단 박제 0 (G5 0 hit 자기 검증).
  - RULE-06: grep-baseline 6 gate (G1~G6) 실측 박제 (HEAD=`49f3f93`).
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/npm-script-prefix-coherence.md` create).
