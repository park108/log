# tsconfig — `src/**/*.test.{ts,tsx}` 에서 vitest ambient globals 가용 (typecheck 게이트 정합)

> **위치**: `tsconfig.json` `compilerOptions.types` 혹은 `src/**/*.d.ts` ambient 진입점 (수단 중립).
> **관련 요구사항**: REQ-20260422-052
> **최종 업데이트**: 2026-04-22 (inspector 신규 등록 · REQ-052 흡수)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. baseline 수치는 HEAD 스냅샷 (§참고 재현 가능).

## 역할
`src/**/*.test.{ts,tsx}` 가 `tsc --noEmit` (typecheck 게이트) 에서 vitest ambient globals 계열 이름 (`vi`, `it`, `describe`, `expect`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`, `test`, `suite`) 을 **타입 수준에서 resolve** 할 수 있어야 한다는 **tsc 타입 인식 경로 불변식** 을 박제. `foundation/regression-gate` (REQ-037) 의 CI typecheck step 과 `foundation/src-typescript-migration` (REQ-051) 의 FR-05 island 확장이 동시에 성립하기 위한 **전제 조건** 축. 의도적으로 하지 않는 것: 달성 수단의 특정 조합 강제 (tsconfig `types` 리스트 내용 · triple-slash reference · 파일별 `import` 해제 · 별도 `vitest.d.ts` 중 **어느 단일 수단도 강제하지 않음**), lint-staged/pre-commit/pre-push 훅에 typecheck 편입 여부 (`foundation/regression-gate` 관할), vitest·TypeScript 버전 업그레이드 (`foundation/dependency-bump-gate` 관할), vitest 런타임 globals 주입 경로 (`vite.config.js` `test.globals: true` — `foundation/src-typescript-migration` 런타임 경로).

## 공개 인터페이스
본 spec 은 단일 모듈 인터페이스가 아닌 **저장소 축 불변식** 이다. 외부 관찰 계약:
- **정적 관찰**: `npm run typecheck` (== `tsc --noEmit`) 종료 코드 및 출력의 TS2304 라인 수.
- **정적 관찰 보조**: `grep -cE "TS2304" <typecheck-output>` (baseline 비교용).
- **파일 범위**: `find src -name "*.test.ts" -o -name "*.test.tsx"` 로 열거되는 전 파일.

## 동작

### FR-01: vitest globals ambient 타입 인식 불변식 (Must)
`src/**/*.test.{ts,tsx}` 전체 파일에 대해 `npm run typecheck` (== `tsc --noEmit`) 를 실행할 때, 다음 식별자에 대한 TypeScript 컴파일러의 `TS2304 Cannot find name` 보고가 **0 hit** 이어야 한다:
`vi`, `it`, `describe`, `expect`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`, `test`, `suite`.

### FR-02: 수단 중립성 (Must)
본 불변식은 다음 수단 중 **어느 단일 수단에도 귀속되지 않는다**: (a) `tsconfig.json` `compilerOptions.types` 에 `"vitest/globals"` 또는 동급 엔트리 추가, (b) `src/**/*.d.ts` ambient 진입점에서 `/// <reference types="vitest/globals" />` triple-slash reference 추가, (c) 테스트 파일별 상단 `import { vi, it, expect, ... } from 'vitest'` 명시, (d) 별도 `vitest.d.ts` 작성. 본 spec 은 결과 (FR-01) 만 박제하며 수단 선정은 planner / task 위임.

### FR-03: CI typecheck step 의미 유지 전제 (Must)
본 불변식은 `foundation/regression-gate` FR-01 (CI typecheck step 포함) 이 **의미 있는 pass/fail 판정 step** 으로 유지되기 위한 필요 조건이다. FR-01 미충족 상태 (TS2304 > 0 hit) 에서는 typecheck step 이 상시 red 이거나 강제 무시 경로로 위장되며, 두 상태 모두 회귀 게이트 효능을 제거한다.

### FR-04: 런타임 경로와의 직교성 (Must)
본 불변식은 `foundation/src-typescript-migration` FR-04 (b) "혼재 허용 중 `npm test` 전체 PASS" (vitest 런타임 globals 주입 경로) 와 **직교**한다. 본 불변식은 tsc 의 타입 인식 경로를, FR-04 (b) 는 vitest 런타임 실행 경로를 각각 담당하며, 두 경로가 **동시에 성립** 해야 src/** TS 전환 축이 완결된다.

### FR-05: 수단 라벨 금지 (Must)
본 spec · 파생 task · 파생 PR 본문에서 전환 수단 선정에 "기본값" / "권장" / "우선" / "default" / "best" 류 라벨을 부여하지 않는다 (`foundation/src-typescript-migration` FR-06 과 동일 원리).

### FR-06: 버전 무관 표현 (Should)
본 불변식은 vitest 메이저 버전 · TypeScript 메이저 버전 · Node 메이저 버전에 무관한 평서형으로 박제된다. 구체 API 이름 (`vitest/globals`, `vi`, `expect`) 언급은 허용하되 버전 고정 표현 (예: "vitest 4.x", "TypeScript 6.x") 은 박제하지 않는다.

### 회귀 중점
- `tsconfig.json` `compilerOptions.types` 필드에 vitest ambient 진입점 누락 시 (또는 대체 수단 부재 시) FS2304 급증.
- island 확장으로 `.test.tsx` 파일 수가 증가할수록 동일 오류 수가 선형 증가 — 전체 47 테스트 전환 시 천 단위 예상.
- lint-staged / pre-commit 이 typecheck 미연동이므로 로컬 훅 통과 후 CI 에서만 실패하는 비대칭 상태 재발 위험 (별도 축 `foundation/regression-gate`).

## 의존성
- 내부 (전제 계약):
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028) — ESLint ts/tsx/d.ts 블록 · `@/types/*` ambient alias · typescript-eslint 파서 · Vitest coverage include. 본 spec 은 동일 tooling cluster 에 편입되지 않고 **tsc 타입 인식 경로** 라는 독립 축으로 박제 (req `NFR-04 차원 분리` 명시 준수).
  - `specs/30.spec/green/foundation/regression-gate.md` (REQ-037) — CI typecheck step 포함 불변식. 본 spec FR-03 의 precondition 관계.
  - `specs/30.spec/green/foundation/src-typescript-migration.md` (REQ-051) — src/** 런타임 확장자 수렴 + 혼재 허용 중 green CI. 본 spec FR-04 의 직교 관계 (tsc 타입 경로 vs vitest 런타임 경로).
- 외부:
  - `typescript` (`tsc --noEmit`, `compilerOptions.types`).
  - `vitest` (`vitest/globals` ambient 진입점 제공).
- 역의존 (본 spec 을 전제로 하는 축):
  - `foundation/regression-gate` FR-01 의 typecheck step 이 의미 있는 pass/fail 판정 step 으로 작동하려면 본 spec FR-01 성립 필요.
  - `foundation/src-typescript-migration` FR-05 island 확장이 `.test.tsx` 파일 수를 증가시킬 때 본 spec FR-01 이 회귀 없이 유지되어야 함.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 baseline 수치 박제 + 평서형 불변식 문서이며, grep 게이트 계약 문서가 아님).
- **grep-baseline** (inspector 세션 시점 HEAD=`5bf5d6a` 실측):

  (a) FR-01 측 positive (목표) — `npm run typecheck 2>&1 | grep -cE "TS2304"` → **목표 0 hit**. 현 시점 (HEAD=`5bf5d6a`): **43 hit** — 대상 파일 `src/Toaster/Toaster.test.tsx` 1건 (TSK-20260422-01 산출, island 첫 타일).
  (b) FR-01 측 보조 (누락 이름 분포) — HEAD=`5bf5d6a` 실측 `src/Toaster/Toaster.test.tsx` 내: `vi` 다수 hit, `it` 3 hit (TS2593 로 보고되나 의미 동일 — `Cannot find name 'it'`), `expect` 다수 hit, `global` 1 hit (`vi.spyOn(global, ...)` 패턴 — `globalThis` 로 대체 권고 별도 축).
  (c) FR-01 측 파일 범위 — `find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l` → HEAD=`5bf5d6a`: **1** (island 첫 타일만 전환 완료). `foundation/src-typescript-migration` FR-05 island 확장 진행에 따라 증가.
  (d) FR-02 측 수단 부재 (현장 근거) — `grep -nE '"types"\s*:' tsconfig.json` → HEAD=`5bf5d6a`: **0 hit** (compilerOptions.types 필드 부재). `grep -rn 'reference types="vitest' src/**/*.d.ts` → **0 hit**. `grep -rn "from 'vitest'" src/**/*.test.tsx` → **0 hit**. 3 수단 전원 부재 상태 — FR-02 중립성이 현재 "부재" 로 모두 통과 (아직 수단 선정 전).
  (e) FR-03 연결 현장 근거 — `grep -n "typecheck" .github/workflows/ci.yml` → HEAD=`5bf5d6a`: **1 hit** @`ci.yml:31` (`run: npm run typecheck` — `foundation/regression-gate` FR-01 실현 상태). 본 spec FR-01 이 달성되어야 step 이 의미 있게 작동.

- **rationale**: gate (a) 는 본 불변식의 **목표값** (충족 시 tsc 인식 경로 완결). gate (b)(c) 는 **현장 근거** — 현 시점 대상 파일 1건에서 43 hit 집중. gate (d) 는 **수단 중립성 상태 확인** — 3 수단 (types 필드 / triple-slash / 파일 import) 중 어느 것도 아직 선정되지 않은 상태로 baseline 박제. gate (e) 는 FR-03 전제 관계 검증. 목표값 달성 수치 상한·방법은 본 spec 관할 밖 (planner/developer task 영역, `foundation/src-typescript-migration` 파생 task 편입 가능).

## 테스트 현황
- [x] FR-01 게이트: `npm run typecheck 2>&1 | grep -cE "TS2304"` → 0 (현 baseline 43, 대상 파일 1건).
- [ ] FR-02 수단 중립성: 달성 수단이 단일 수단에 귀속되지 않음 — 수단 선정 후 본 spec 본문·파생 task·파생 PR 에서 "기본값/권장/우선/default/best" 라벨 0 hit.
- [ ] FR-03 precondition 검증: FR-01 달성 후 CI typecheck step (`ci.yml:31`) 이 green 유지 · TS2304 0 hit 유지.
- [x] FR-04 직교성 검증: FR-01 달성 시점에 `npm test` 전체 PASS 유지 (런타임 경로 회귀 0).
- [x] FR-05 수단 라벨 0: `grep -rnE "기본값|권장|우선|default|best" specs/30.spec/green/foundation/tsconfig-test-ambient-globals.md specs/40.task/**/*tsconfig-test-ambient* specs/60.done/**/*tsconfig-test-ambient*` 결과가 예시/참고/인용 제외 0.
- [ ] FR-06 버전 무관 표현: 본 spec 본문에 "vitest 4.x", "TypeScript 6.x" 등 버전 고정 표현 0 hit.

## 수용 기준
- [x] (Must, FR-01) `npm run typecheck` 실행 시 `src/**/*.test.{ts,tsx}` 대상 TS2304 vitest globals 계열 0 hit.
- [ ] (Must, FR-02) 달성 수단이 tsconfig `types` / triple-slash / 파일 import / 별도 `vitest.d.ts` 중 어느 단일 수단에도 귀속되지 않는다 (결과 박제만, 수단 선정은 task 위임).
- [ ] (Must, FR-03) `foundation/regression-gate` FR-01 의 typecheck step 이 본 불변식 달성 후 상시 green 유지.
- [x] (Must, FR-04) `foundation/src-typescript-migration` FR-04 (b) 와 FR-01 이 동시 성립 (tsc 경로 + vitest 런타임 경로 직교 동시 동작).
- [x] (Must, FR-05) 본 spec · 파생 task · 파생 PR 에서 수단 라벨 박제 0 건.
- [ ] (Should, FR-06) 본 spec 본문은 vitest/TypeScript/Node 버전 고정 표현을 포함하지 않는다.
- [x] (NFR-01) 추적성 — `grep -rn "REQ-20260422-052" specs/30.spec/green/foundation/tsconfig-test-ambient-globals.md` → 2+ hit + consumed followup 경로 1 hit.
- [x] (NFR-02) baseline 재현 — 동일 HEAD (`5bf5d6a`) 에서 `npm run typecheck 2>&1 | grep -cE "TS2304"` → 43 반환 (박제 재현 가능).
- [x] (NFR-03) 범위 제한 — 파생 task/PR 의 diff 가 `src/**` 런타임 로직 변경 0, `vite.config.js` · `package.json` scripts 변경 0, `.github/workflows/**` 변경 0 (tsconfig.json 또는 ambient `.d.ts` 에 한정).
- [x] (NFR-04) 차원 분리 — `foundation/regression-gate` (step 존재) / `foundation/src-typescript-migration` (확장자 수렴 + 런타임 혼재 허용) / `foundation/tooling` (ESLint·alias·파서·coverage include) 와 축 분리 — 교집합 문장 재박제 0 (참조만).

## 참고

### baseline 스냅샷 (재현 가능 · NFR-02)
- HEAD=`5bf5d6a` (2026-04-22 inspector 승격 시점) 실측:
  - `npm run typecheck 2>&1 | grep -cE "TS2304"` → **43**.
  - 대상 파일 (TS2304 집중): `src/Toaster/Toaster.test.tsx` — TSK-20260422-01 산출 island 첫 타일. 타 파일에서 TS2304 hit 없음 (대상 파일 1건).
  - 누락 이름 분포 (대상 파일 내): `vi` 다수 + `expect` 다수 + `it` 3건 (`TS2593` 코드로 보고되나 의미 동일) + `global` 1건 (`vi.spyOn(global, ...)` — 별도 축 `globalThis` 권고).
  - `tsconfig.json` 현장: `compilerOptions.types` 필드 **부재** (자동 `@types/*` inclusion). vitest ambient 진입점 (`node_modules/vitest/globals.d.ts`) 은 `types` 명시 경로에 없으므로 미노출.
  - `package.json:24` — `"typecheck": "tsc --noEmit"` 존재.
  - `.github/workflows/ci.yml:31` — `run: npm run typecheck` step 편입 (REQ-037 FR-01 실현 완료, TSK-20260421-75 @`5dbf308`).
  - `vite.config.js:66-89` — `test.globals: true` · `setupFiles: './src/setupTests.js'` (vitest 런타임 globals 주입 — tsc 와 무관).
- 이 수치는 수렴 방향 baseline 이며 본 spec 의 불변식 조건이 아니다. 최종 수렴 조건은 §동작 FR-01 의 0-hit 선언.

### Consumed followup (1 건, req NFR-01 박제)
- `specs/10.followups/20260422-0042-vitest-globals-tsconfig-types.md` — TSK-20260422-01 result 파생. source_task: TSK-20260422-01 / category: tooling / severity: minor / observed_at: 2026-04-22. (discovery 세션이 이미 REQ-052 로 소비하여 `60.done/` 로 이동시킨 상태이면 본 경로는 역사 참조만.)

### 관련 계약 (직교 축 — 재박제 금지 · 참조만)
- `specs/30.spec/blue/foundation/tooling.md` (REQ-20260421-028) — ESLint ts/tsx/d.ts 블록 · `@/types/*` ambient alias · typescript-eslint 파서 · Vitest coverage include. 본 spec 과 **축 분리** (REQ-052 `NFR-04` 명시 준수) — 동일 tooling 파일 cluster (`tsconfig.json` · ambient `.d.ts`) 를 건드리나 기능 축 (ESLint·lint-staged·coverage include vs tsc 타입 인식 경로) 이 다르므로 독립 spec 으로 분리.
- `specs/30.spec/green/foundation/regression-gate.md` (REQ-20260421-037) — CI typecheck step 포함 불변식. 본 spec 의 **FR-03 precondition 관계** (typecheck step 이 의미 있는 pass/fail 판정 step 으로 유지되기 위한 전제).
- `specs/30.spec/green/foundation/src-typescript-migration.md` (REQ-20260422-051) — src/** 런타임 확장자 수렴 + 혼재 허용 중 green CI 유지. 본 spec 의 **FR-04 직교 관계** (tsc 타입 인식 경로 vs vitest 런타임 경로).
- `specs/30.spec/blue/foundation/coverage-determinism.md` (REQ-041/043) — coverage 측정 결정론. 본 spec 과 교집합 없음.
- `specs/30.spec/blue/common/test-idioms.md` — 테스트 작성 이디엄. 본 spec 은 이디엄 변경 없이 타입 인식 경로만 다룸.

### 현장 근거 (HEAD=`5bf5d6a`, 2026-04-22 실측)
- `tsconfig.json:1-26` — `compilerOptions.types` 필드 부재 (`strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `allowJs: true`, `checkJs: false` 존재).
- `package.json:24` — `"typecheck": "tsc --noEmit"`.
- `package.json:53-54` — `"typescript": "^6.0.3"`, `"vitest": "^4.1.4"` devDep.
- `node_modules/vitest/globals.d.ts` — ambient 진입점 파일 존재 (`types` 필드 명시 시 포함 경로).
- `.github/workflows/ci.yml:31` — `run: npm run typecheck` step (TSK-20260421-75 수렴).
- `vite.config.js:66-89` — `test.globals: true` · `setupFiles: './src/setupTests.js'` (런타임 globals 주입 경로 — tsc 와 무관).
- `src/Toaster/Toaster.test.tsx` — island 첫 타일 (TSK-20260422-01). 현 시점 43 TS2304 hit 의 유일 대상 파일.

### 외부 근거
- Vitest 공식 — "Configuring Vitest" / "TypeScript" 섹션. `tsconfig.json` `compilerOptions.types` 에 `"vitest/globals"` 추가가 globals 타입 노출의 표준 경로 (`globals: true` vitest 런타임 설정과 짝).
- TypeScript 공식 Handbook — "Compiler Options" `types` 필드. 미지정 시 자동 `@types/*` inclusion, 지정 시 지정 패키지만 inclusion. ambient globals 가 `@types/*` 외 경로 (예: `vitest/globals.d.ts`) 에 있을 때 `types` 명시 필요.
- `@types/vitest` 패키지는 레지스트리 부재 — vitest 자체 `globals.d.ts` 를 사용하는 것이 일반.

### RULE 준수
- **RULE-07**: FR-01 은 "`src/**/*.test.{ts,tsx}` 에서 `tsc --noEmit` 시 vitest globals 계열 `TS2304` 보고 0 hit" 평서형 불변식. 반복 검증 가능 (`npm run typecheck`). 시점 비의존. 구체 수단·incident patch·릴리스 귀속 부재 — tooling 축의 구조적 불변식.
- **RULE-06**: 본 spec 은 baseline 수치 박제 + 평서형 불변식 문서. `## 스코프 규칙` `expansion: N/A` + 현장 근거 실측 수치 5 gate 박제. 파생 task 생성 시 planner 는 확장자 + 식별자 조합 gate 필수 (req `§수용 기준` 4번째 항목).
- **RULE-01**: inspector writer 영역 (`30.spec/green/**`) 만 신설. `20.req/*` → `60.done/2026/04/22/req/` mv.
- **RULE-02**: 단일 커밋 `spec(inspector): ...`. push 금지.

### 축 귀속 판단 근거 (REQ-052 FR-07 판단)
- FR-07 은 "축 귀속 판단 영역 — `foundation/tooling` 확장 vs 신규 spec 신설" 두 경로 모두 RULE-07 정합으로 위임.
- **채택: 신규 spec 신설 (`foundation/tsconfig-test-ambient-globals.md`)**.
- 근거:
  1. req `NFR-04 차원 분리` 가 `foundation/tooling` 과 "축 분리" 를 명시 — 교집합 문장 재박제 0.
  2. `foundation/tooling` 은 ESLint · lint-staged · ambient alias (`@/types/*`) · Vitest coverage include 의 4 불변식 cluster — 도구 실행 경로 축. 본 req 의 "tsc 타입 인식 경로 ambient globals 가용" 은 **tsc 단독 실행 경로** 로 layer 가 다름.
  3. `foundation/regression-gate` FR-07 선례 — 2 불변식이 기존 2 spec (`ci.md`/`tooling.md`) 의 semantic 경계를 흐릴 우려로 독립 spec `regression-gate.md` 신설 경로 채택. 본 spec 도 동일 원리.
  4. 독립 spec 으로 audit·의미 경계 유지가 유리 — "왜 이 불변식이 여기 있는가" 를 spec 파일명 자체로 답함.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-22 | inspector / (this commit) | 최초 등록 — REQ-20260422-052 흡수. FR-07 판단으로 **신규 spec 신설** 경로 채택 (근거: §참고 "축 귀속 판단 근거"). FR-01~05 Must + FR-06 Should 박제. baseline HEAD=`5bf5d6a` 실측 — `npm run typecheck 2>&1 \| grep -cE "TS2304"` **43 hit**, 대상 파일 `src/Toaster/Toaster.test.tsx` 1건. 수단 중립성 (tsconfig `types` / triple-slash / 파일 import / `vitest.d.ts`) 박제 — 수단 선정은 planner/task 위임. `foundation/regression-gate` FR-01 (typecheck step) 의 precondition 관계 + `foundation/src-typescript-migration` FR-04 (b) (런타임 경로) 직교 관계 명시. consumed followup: `specs/10.followups/20260422-0042-vitest-globals-tsconfig-types.md` (TSK-20260422-01 result 파생). RULE-07 자기검증 — 평서형·반복 검증 가능·시점 비의존·incident 귀속 부재. RULE-06 §스코프 규칙 `expansion: N/A` + 5 gate (a~e) 실측 수치 박제. | all (신설) |
| 2026-04-22 | inspector reconcile / `f34419e` | Phase 1 drift reconcile — TSK-20260422-05 (`f34419e`, HEAD 조상) 산출 이후 HEAD=`46f4484` 재실측. `npm run typecheck 2>&1 \| grep -cE "TS2304"` **0 hit** (43→0 수렴). §테스트 현황 FR-01/FR-04/FR-05 + §수용 기준 FR-01/FR-04/FR-05/NFR-01/NFR-02/NFR-03/NFR-04 총 10 체크박스 flip. FR-02 (단일 수단 귀속 여부 해석 여지)·FR-03 (CI typecheck step rc=1 잔존, FR-01 범위 밖 island TS2769/TS2345 계열) · FR-06 (§참고 현장 근거 line 114 `^4.1.4`·`^6.0.3` 실측 인용을 버전 고정 표현으로 간주할지 해석 여지) 3건은 보수적 marker 유지. reconcile ack: 10. | §테스트 현황 / §수용 기준 / 본 §변경 이력 |
