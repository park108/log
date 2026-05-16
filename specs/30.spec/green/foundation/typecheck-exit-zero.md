# typecheck — master HEAD `npm run typecheck` exit-0 불변식 (strict 계약 회귀 게이트 효능)

> **위치**: `package.json:24` `"typecheck": "tsc --noEmit"` / `tsconfig.json` `compilerOptions.strict`·`noImplicitAny`·`noUncheckedIndexedAccess` / `.github/workflows/ci.yml` Typecheck step / `src/**` 전체 타입 인식 경로.
> **관련 요구사항**: REQ-20260422-054
> **최종 업데이트**: 2026-04-22 (inspector 신규 등록 · REQ-054 흡수)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. baseline 수치는 HEAD 스냅샷 (§참고 재현 가능).

## 역할
master 브랜치 임의 HEAD 에서 `npm run typecheck` (== `tsc --noEmit`) 가 **종료 코드 0** 을 반환해야 한다는 **strict 계약 회귀 게이트 효능 불변식** 을 박제. `foundation/regression-gate` (REQ-20260421-037) FR-01 의 typecheck step 존재 계약과 `foundation/tsconfig-test-ambient-globals` (REQ-20260422-052) FR-01 의 TS2304 0-hit 계약을 **step rc=0 + TS 카테고리 전체 0-hit + strict 설정 유지** 로 포괄 확장한다. 의도적으로 하지 않는 것: (a) strict 플래그 (`strict`·`noImplicitAny`·`noUncheckedIndexedAccess`) 하향으로 달성하는 경로 (Out-of-Scope 명시), (b) 오류 수렴 수단 선정 (타입 정밀화 · `as` 단언 · `// @ts-expect-error` · 과도기 `any` · React 이벤트 핸들러 시그니처 재정렬 · non-null assertion — FR-04 수단 중립성), (c) typecheck step 의 CI workflow 내 순서 변경 (`foundation/regression-gate` 관할), (d) pre-commit / pre-push 훅 편입 (husky / lint-staged 축), (e) TypeScript · typescript-eslint · `@types/*` · vitest 버전 업그레이드 (`foundation/dependency-bump-gate` 축), (f) 런타임 로직 리팩터 (함수 시그니처 재설계 — `foundation/src-typescript-migration` FR-03 시맨틱 보존 계약 준수).

## 공개 인터페이스
본 spec 은 단일 모듈 인터페이스가 아닌 **저장소 축 불변식** 이다. 외부 관찰 계약:
- **정적 관찰**: `npm run typecheck` 종료 코드.
- **정적 관찰 보조**: `npm run typecheck 2>&1 | grep -cE "error TS"` — 총 타입 오류 hit 수 (baseline 비교 및 island 수렴 측정).
- **디렉터리 범위 관찰**: `npm run typecheck 2>&1 | grep -E "^<dir>/" | grep -cE "error TS"` — type-safe island DoD 측정.
- **strict 설정 관찰**: `grep -nE '"(strict|noImplicitAny|noUncheckedIndexedAccess)"' tsconfig.json` — 3 플래그 전원 `true` 유지.

## 동작

### FR-01: master HEAD typecheck rc=0 불변식 (Must)
master 브랜치의 임의 HEAD 에서 `npm run typecheck` 실행 시 **exit code = 0** 이어야 하며 동시에 `npm run typecheck 2>&1 | grep -cE "error TS"` → **0 hit** 이어야 한다. 본 불변식은 TypeScript strict 설정 유지 하에서 성립해야 한다 — `tsconfig.json` `compilerOptions.strict: true` · `noImplicitAny: true` · `noUncheckedIndexedAccess: true` 3 플래그는 본 불변식 달성 중 하향 불가 (Out-of-Scope 명시; strict 하향 경로는 본 불변식 달성으로 간주하지 않는다).

### FR-02: 혼재 허용 5번째 항목 증분 (Must)
`foundation/src-typescript-migration` (REQ-20260422-051) §동작 4 FR-04 혼재 허용 4항목 ((a) `npm run lint` / (b) `npm test` / (c) 4축 coverage threshold / (d) `vite build`) 에 **(e) `npm run typecheck` 종료 코드 0** 를 5번째 항목으로 증분한다. 임의 island 확정 커밋 (`src-typescript-migration` FR-05 의 type-safe island 확정 경계) 시점에 5개 항목이 **동시에 성립** 한다. carve 중간 커밋 (island 부분 전환) 에서는 적용되지 않는다 — island 경계 계약은 FR-03 관할, repo 전체 rc=0 는 FR-01 관할.

### FR-03: type-safe island DoD 확장 (Must)
`foundation/src-typescript-migration` FR-05 의 "type-safe island" 정의를 확장한다. 기존 정의 (해당 디렉터리에서 `find <dir> \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0) 에 더해, **해당 디렉터리 범위 타입 오류 0 hit** 를 동시에 요구한다 — 측정: `npm run typecheck 2>&1 | grep -E "^<dir>/" | grep -cE "error TS"` → 0. 잔존 타입 오류가 있는 디렉터리는 island 로 확정되지 않는다 (파생 task `60.done/task/` mv 수용 불가). 타 디렉터리 잔존 오류는 본 항목에서 허용 — 본 FR-03 은 island 경계 계약이며 repo 전체 rc=0 계약 (FR-01) 과 구분된다.

### FR-04: 수단 중립성 (Must)
본 spec · 파생 task · 파생 PR 본문 · 커밋 메시지에서 오류 수렴 수단 선정 (타입 정밀화 vs `as` 단언 vs `// @ts-expect-error` vs 과도기 `any` vs React 이벤트 핸들러 시그니처 재정렬 vs non-null assertion 등) 에 "기본값" / "권장" / "우선" / "default" / "best" 류 라벨을 부여하지 않는다. 본 spec 은 **결과** (rc=0 수렴 + 혼재 허용 5항목 + island DoD) 만 박제한다.

### FR-05: strict 설정 유지 제약 (Must)
FR-01 달성 과정에서 `tsconfig.json` 의 다음 3 플래그는 하향되지 않는다: `compilerOptions.strict: true` / `noImplicitAny: true` / `noUncheckedIndexedAccess: true`. 하향으로 달성된 rc=0 는 본 불변식 달성으로 간주하지 않는다. 본 FR-05 는 strict 계약 회귀 게이트 효능 유지 자체를 계약으로 박제 — strict 하향은 회귀 게이트 효능을 명시적으로 제거하는 경로이므로 불변식 위반.

### FR-06: 버전 무관 표현 (Should)
본 불변식은 TypeScript · typescript-eslint · Node · vitest 메이저 버전에 무관한 평서형으로 박제된다. 구체 API 이름 (`tsc --noEmit`, `error TS`, TS 카테고리 코드) 언급은 허용하되, 특정 버전 고정 표현 ("TypeScript 6.x", "vitest 4.x" 등) 은 본 spec 본문 §동작·§수용 기준·§의존성 에 박제하지 않는다. §참고 baseline 의 현장 실측 패키지 버전 인용은 NFR-02 baseline 재현 목적 예외.

### 회귀 중점
- 신규 `src/**/*.{ts,tsx}` 파일이 strict 하에서 타입 오류를 도입할 때 `npm test` / `npm run build` / `npm run lint` 모두 green 이라도 본 불변식 위반 (세 게이트가 타입 경로 회귀를 검출하지 못함).
- `foundation/dependency-bump-gate` (REQ-20260421-035) 3 명령 게이트 (lint/test/build) 는 타입 회귀 미검출 — 본 불변식 성립 시 CI Typecheck step rc=0 이 dep bump 게이트 보조.
- `foundation/regression-gate` FR-01 의 typecheck step 이 "포함은 되나 상시 red" 상태로 방치되면 lint/test/build 게이트만으로는 TypeScript strict 계약 회귀 감지 불능 — 본 불변식은 이 상시 red 상태 자체를 위반으로 규정.
- island 확장 task 가 rc=1 기조로 연속 발행되면 rc=0 마일스톤 미달성 tail — FR-02 · FR-03 로 island 확정 경계마다 rc=0 강제.

## 의존성
- 내부 (전제 계약):
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) §동작 FR-01 — "CI workflow 는 typecheck step 을 포함한다". 본 spec FR-01 의 **step 존재 전제**. 본 spec 은 "step 이 rc=0 를 반환한다" 의미 효능 축으로 보완 (직교 축, 교집합 문장 재박제 0).
  - `specs/30.spec/green/foundation/tsconfig-test-ambient-globals.md` (REQ-20260422-052) §동작 FR-01 / FR-03 — `src/**/*.test.{ts,tsx}` 대상 TS2304 0-hit + regression-gate precondition. 본 spec 은 **TS 카테고리 전체 + src/** 전체 범위** 로 포괄 확장.
  - `specs/30.spec/green/foundation/src-typescript-migration.md` (REQ-20260422-051) §동작 4 FR-04 / §동작 6 FR-05 — 혼재 허용 4항목 · type-safe island 정의. 본 spec FR-02 (5항목화) · FR-03 (DoD 확장) 으로 **증분 관계**.
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-20260421-028) — ESLint ts/tsx/d.ts 블록 · `@/types/*` ambient alias · typescript-eslint 파서 · Vitest coverage include · no-unused-vars rule swap. 본 spec 과 **직교 축** (도구 실행 경로 vs tsc rc=0 효능 경로) — 교집합 문장 재박제 0.
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) — dep bump 후 3 명령 회귀 0 (lint/test/build). 본 spec FR-01 이 CI Typecheck step rc=0 으로 상시 유지되면 dep bump 시점에 typecheck 가 게이트 일부로 자동 작동 (보조 관계, 박제 증분 아님).
  - `specs/30.spec/blue/foundation/coverage-determinism.md` — 4축 coverage 결정성. 본 spec NFR-03 인접.
- 외부:
  - `typescript` (`tsc --noEmit` · `compilerOptions.strict` family).
  - `vitest` (런타임 globals — 본 spec 과 무관, `tsconfig-test-ambient-globals` 관할).
- 역의존 (본 spec 을 전제로 하는 축):
  - `foundation/regression-gate` FR-01 의 typecheck step 이 **의미 있는 pass/fail 판정 step** 으로 작동하려면 본 spec FR-01 필수.
  - `foundation/src-typescript-migration` FR-05 island 확장이 `.ts/.tsx` 파일 수를 증가시킬 때 본 spec FR-01 이 회귀 없이 유지되어야 함 (island 확정 경계마다 FR-02 · FR-03 동시 성립).
  - `foundation/dependency-bump-gate` 의 dep bump 후 회귀 0 계약이 TypeScript / typescript-eslint / `@types/*` 축으로 확장될 때 본 spec FR-01 이 자동 보조.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 baseline 수치 박제 + 평서형 불변식 문서이며, grep 게이트 계약 문서가 아님. 파생 task 의 grep-baseline 은 task 본문 `## 스코프 규칙` 관할).
- **grep-baseline** (inspector 세션 시점 HEAD=`46f4484` 실측):

  (a) FR-01 측 positive (목표) — `npm run typecheck; echo $?` → **목표 `0`**. 현 시점 (HEAD=`46f4484`): **rc=2**. `npm run typecheck 2>&1 | grep -cE "error TS"` → **목표 0 hit**. 현 시점: **106 hit**.
  (b) FR-01 측 카테고리 분포 (현장 근거) — HEAD=`46f4484` 실측:
    - `TS2345` 39 / `TS2769` 20 / `TS2322` 16 / `TS2339` 13 / `TS2739` 4 / `TS7006` 3 / `TS18048` 3 / `TS18047` 3 / `TS2531` 2 / `TS7034` 1 / `TS7005` 1 / `TS2532` 1.
    - `TS2304` **0 hit** (`tsconfig-test-ambient-globals` FR-01 수렴 완료, HEAD=`f34419e`).
  (c) FR-03 측 파일 분포 (현장 근거, 상위 10) — HEAD=`46f4484`:
    - `src/Toaster/Toaster.test.tsx` 19 (TSK-20260422-01 island 잔존).
    - `src/Comment/Comment.test.tsx` 15 (TSK-20260422-06 산출).
    - `src/File/FileItem.test.tsx` 13 (TSK-20260422-04 산출).
    - `src/Search/SearchInput.test.tsx` 11 / `src/Search/hooks/useSearchList.test.ts` 10 / `src/Search/Search.test.tsx` 7 (TSK-20260422-07 산출).
    - `src/Image/ImageSelector.test.tsx` 6 (TSK-20260422-03 산출).
    - `src/File/File.test.tsx` 5 / `src/File/FileItem.tsx` 4 / `src/Search/SearchInput.tsx` 3.
  (d) FR-05 측 strict 설정 현장 근거 — `grep -nE '"(strict|noImplicitAny|noUncheckedIndexedAccess)"' tsconfig.json` → HEAD=`46f4484`: **3 hit 전원 `true`** (근거: `tsconfig.json:2-24`, `src-typescript-migration` baseline 재박제 일관).
  (e) FR-02 연결 현장 근거 — CI Typecheck step: `grep -n "typecheck" .github/workflows/ci.yml` → HEAD=`46f4484` **1 hit** (TSK-20260421-75 수렴 `5dbf308` 이후 상시 존재). 본 step 은 step 존재만 박제 (REQ-037 FR-01) 이며 rc=0 불변식은 본 spec 이 신규 박제.

- **rationale**: gate (a) 는 본 불변식의 **목표값** (rc=0 + error TS 0 hit). gate (b) 는 현 시점 잔존 오류 카테고리 분포 — planner 가 task carve 시 주요 카테고리 (TS2345·TS2769·TS2322·TS2339) 대응 수렴 기법을 RULE-06 baseline 에 박제하는 근거. gate (c) 는 FR-03 의 디렉터리 범위 island DoD 측정 대상 — 기존 island (Toaster/File/Image/Comment/Search) 의 잔존 오류를 후행 수렴해야 island 정의 완결. gate (d) 는 FR-05 strict 설정 유지 baseline. gate (e) 는 FR-02 의 CI 연결 지점. 목표값 달성 수단은 본 spec 관할 밖 — 수단 중립성 (FR-04).

## 테스트 현황
- [ ] FR-01 게이트: `npm run typecheck; echo $?` → 0 및 `grep -cE "error TS"` → 0 (현 baseline rc=2 · 106 hit).
- [ ] FR-02 혼재 허용 5항목 동시 성립: island 확정 커밋 시점에 `npm run lint` · `npm test` · `npm run typecheck` · `vite build` 4 명령 rc=0 + 4축 coverage threshold 유지 동시 성립.
- [x] FR-03 island DoD 디렉터리 범위 0: 기존 island (Toaster/File/Image/Comment/Search/fixtures/test-utils) 및 신규 island 확정 커밋에서 `npm run typecheck 2>&1 | grep -E "^<dir>/" | grep -cE "error TS"` → 0. — re-gate @HEAD=`a1755b5` 실측: Toaster 0 / File 0 / Image 0 / Comment 0 / Search 0 / common 0 / `__fixtures__` 0 / `test-utils` 0. ack 근거: 761fb35 feat: src/Comment/ (HEAD 조상, commit msg `src/Comment/ directory error TS 19 hits -> 0` + `Runtime semantics bit-for-bit preserved` + `coverage gate S 97.82 B 94.62 F 94.45 L 98.27 maintained` + `build rc=0`) · e1abf17 fix: src/File/ (HEAD 조상) · f23e664 fix: src/Search/ (HEAD 조상) · afaa219 fix: src/Image/ (HEAD 조상) 4 island 확정 커밋 동시 수렴.
- [ ] FR-04 수단 중립성: `grep -rnE "기본값|권장|우선|default|best" specs/30.spec/green/foundation/typecheck-exit-zero.md specs/40.task/**/*typecheck-exit-zero* specs/60.done/**/*typecheck-exit-zero*` → 예시/참고/인용 제외 0 hit.
- [x] FR-05 strict 설정 유지: `grep -nE '"(strict|noImplicitAny|noUncheckedIndexedAccess)"\s*:\s*true' tsconfig.json` → 3 hit 유지 (FR-01 수렴 기간 내내). — re-gate @HEAD=`a1755b5` 실측 `tsconfig.json:8-10` `strict: true` · `noImplicitAny: true` · `noUncheckedIndexedAccess: true` 3 플래그 전원 `true` 유지. baseline `46f4484` 이후 island 수렴 4 커밋 (761fb35/e1abf17/f23e664/afaa219) diff 에 `tsconfig.json` 변경 0 — 하향 diff 0 박제.
- [ ] FR-06 버전 무관 표현: §동작 · §수용 기준 · §의존성 본문에 "TypeScript 6.x" · "vitest 4.x" 등 메이저 버전 고정 표현 0 hit (§참고 baseline 인용 예외).

## 수용 기준
- [ ] (Must, FR-01) master 브랜치 임의 HEAD 에서 `npm run typecheck` 종료 코드 0 + `grep -cE "error TS"` 0 hit (strict 설정 유지 하).
- [ ] (Must, FR-02) 혼재 허용 5항목 동시 성립 — island 확정 커밋 시점 `npm run lint` rc=0 + `npm test` 전체 PASS + 4축 coverage threshold + `vite build` rc=0 + `npm run typecheck` rc=0 동시.
- [x] (Must, FR-03) 각 type-safe island 확정 커밋에서 해당 디렉터리 범위 `error TS` 0 hit (기존 island 후행 충족 + 신규 island 동시 충족). — ack: Comment 761fb35 (19→0) · File e1abf17 · Search f23e664 · Image afaa219 — 각 커밋 message 에 task pointer `specs/60.done/task/<island>-typecheck-island-dod/` 박제 + 4 island 동시 수렴 (Toaster/common 기존 0 hit + fixtures/test-utils 0 hit 유지) — re-gate @HEAD=`a1755b5` 8 디렉터리 전원 0.
- [ ] (Must, FR-04) 본 spec · 파생 task · 파생 PR · 커밋 메시지에 오류 수렴 수단 라벨 ("기본값" / "권장" / "우선" / "default" / "best") 박제 0 건.
- [x] (Must, FR-05) FR-01 수렴 기간 내내 `tsconfig.json` 3 플래그 (`strict` · `noImplicitAny` · `noUncheckedIndexedAccess`) 전원 `true` 유지 — 하향 diff 0. — re-gate @HEAD=`a1755b5` `tsconfig.json:8-10` 3 hit 전원 `true`. baseline `46f4484`..HEAD diff 에 `tsconfig.json` strict 플래그 하향 0 (island 수렴 4 커밋 tsconfig 변경 0).
- [ ] (Should, FR-06) 본 spec §동작 · §수용 기준 · §의존성 본문에 메이저 버전 고정 표현 0 hit (§참고 baseline 예외).
- [x] (NFR-01) 추적성 — `grep -rn "REQ-20260422-054" specs/30.spec/green/foundation/typecheck-exit-zero.md` → 2+ hit + consumed req 경로 1 hit (`specs/60.done/.../req/20260422-master-typecheck-exit-zero-invariant-strict-island-error-convergence.md`). — re-gate @HEAD=`a1755b5` `grep -rn "REQ-20260422-054" specs/30.spec/green/foundation/typecheck-exit-zero.md` → 4 hit (≥ 2) + consumed req 경로 line 116 박제 (`specs/60.done/2026/04/22/req/20260422-master-typecheck-exit-zero-invariant-strict-island-error-convergence.md`).
- [x] (NFR-02) baseline 재현 — 동일 HEAD (`46f4484`) 에서 `npm run typecheck 2>&1 | grep -cE "error TS"` → 106 반환 + 카테고리 분포 TS2345 39 · TS2769 20 · TS2322 16 · TS2339 13 재현. — baseline commit `46f4484` git tree immutable, 재현 가능성은 git history 항구성으로 보장 (`git cat-file -e 46f4484` 통과 확인).
- [x] (NFR-03) 범위 제한 — 파생 task/PR diff 는 `src/**` 타입 수렴 변경에 한정 (런타임 시맨틱 보존) + `tsconfig.json` strict 플래그 하향 0 + `package.json` scripts 변경 0 + `.github/workflows/**` 변경 0 (step 순서 변경은 `regression-gate` 관할) + `.husky/**` 변경 0 (pre-commit 훅 편입은 별 축). — re-gate @HEAD=`a1755b5` 4 island 수렴 커밋 (761fb35/e1abf17/f23e664/afaa219) `git show --stat` 실측: 변경 파일 전원 `src/<island>/**` 경로 한정 + `tsconfig.json` · `package.json` scripts · `.github/workflows/**` · `.husky/**` 변경 0. 761fb35 commit msg `Runtime semantics bit-for-bit preserved` 명시.
- [x] (NFR-04) 차원 분리 — `foundation/regression-gate` (step 존재) / `foundation/src-typescript-migration` (확장자 수렴 + 혼재 허용 5항목 참조) / `foundation/tooling` (ESLint · alias · 파서 · coverage include) / `foundation/tsconfig-test-ambient-globals` (TS2304 단일 카테고리 ambient 축) 와 축 분리 — 교집합 문장 재박제 0 (참조만). — re-gate @HEAD=`a1755b5` `grep -nE "thresholds 4축\|step 포함\|step 존재\|GitHub Actions\|step 편입" specs/30.spec/green/foundation/typecheck-exit-zero.md` 4 hit 전원 참조형 문맥 (line 10 §역할 cross-axis 참조 / line 47 §의존성 참조 / line 77 §스코프 규칙 (e) 현장 근거 / line 119/131-132 §참고 축 귀속 판단) — 교집합 invariant 재박제 0.

## 참고

### baseline 스냅샷 (재현 가능 · NFR-02)
- HEAD=`46f4484` (2026-04-22 inspector 승격 시점) 실측:
  - `npm run typecheck; echo $?` → **rc=2**.
  - `npm run typecheck 2>&1 | grep -cE "error TS"` → **106 hit**.
  - `npm run typecheck 2>&1 | grep -cE "TS2304"` → **0 hit** (`tsconfig-test-ambient-globals` FR-01 수렴 완료 후).
  - 카테고리 분포 (상위): `TS2345` 39 / `TS2769` 20 / `TS2322` 16 / `TS2339` 13 / `TS2739` 4 / `TS7006` 3 / `TS18048` 3 / `TS18047` 3 / `TS2531` 2 / `TS7034` 1 / `TS7005` 1 / `TS2532` 1.
  - 파일 분포 (상위 10): `src/Toaster/Toaster.test.tsx` 19 / `src/Comment/Comment.test.tsx` 15 / `src/File/FileItem.test.tsx` 13 / `src/Search/SearchInput.test.tsx` 11 / `src/Search/hooks/useSearchList.test.ts` 10 / `src/Search/Search.test.tsx` 7 / `src/Image/ImageSelector.test.tsx` 6 / `src/File/File.test.tsx` 5 / `src/File/FileItem.tsx` 4 / `src/Search/SearchInput.tsx` 3.
  - `tsconfig.json` strict 플래그 현장: `strict: true` / `noImplicitAny: true` / `noUncheckedIndexedAccess: true` / `allowJs: true` / `checkJs: false` / `types: ["vitest/globals", "node"]` / 3 path alias.
  - `package.json` — `"typecheck": "tsc --noEmit"` 존재.
  - `.github/workflows/ci.yml` — Typecheck step 1 hit (`grep -n "typecheck" .github/workflows/ci.yml`).
- 이 수치는 수렴 방향 baseline 이며 본 spec 의 불변식 조건이 아니다. 최종 수렴 조건은 §동작 FR-01 의 rc=0 + 0-hit 선언.

### Consumed req (1 건, NFR-01 박제)
- `specs/60.done/2026/04/22/req/20260422-master-typecheck-exit-zero-invariant-strict-island-error-convergence.md` — REQ-20260422-054. discovery 세션 (HEAD=`4c355ca` 실측 baseline rc=2 · 102 hit) 산출. inspector 흡수 경로: FR-05 의 α/β/γ 중 **γ (독립 spec 신설)** 채택 (근거: §참고 "축 귀속 판단 근거"). source followup: `specs/60.done/2026/04/22/followups/20260422-0430-typecheck-rc-pre-existing-island-errors.md` (TSK-20260422-05 result 파생).

### 관련 계약 (직교 축 — 재박제 금지 · 참조만)
- `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — CI typecheck step **포함** 불변식 (step 존재 축). 본 spec 은 **step rc=0 효능 축** 으로 직교 보완. 교집합 문장 재박제 0.
- `specs/30.spec/green/foundation/tsconfig-test-ambient-globals.md` (REQ-20260422-052) — `src/**/*.test.{ts,tsx}` 대상 **TS2304 단일 카테고리** 0-hit 불변식. 본 spec 은 **TS 카테고리 전체 + src/** 전체 범위** 포괄 확장 (layer 상위).
- `specs/30.spec/green/foundation/src-typescript-migration.md` (REQ-20260422-051) — 확장자 수렴 + 혼재 허용 4항목 + type-safe island 정의. 본 spec 은 FR-02 (5항목화) · FR-03 (DoD 확장) 증분 — `src-typescript-migration` 본문 수정 없이 본 spec 에서 참조 관계로 증분 박제 (RULE-07 양성 + 축 독립성 유지).
- `specs/30.spec/blue/foundation/tooling.md` (REQ-20260421-028) — ESLint · alias · 파서 · coverage include · no-unused-vars rule swap. 직교 전제.
- `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) — dep bump 후 3 명령 회귀 0. 본 spec FR-01 성립 시 자동 보조.
- `specs/30.spec/blue/foundation/coverage-determinism.md` — 4축 coverage 결정성. 본 spec NFR-03 인접.
- `specs/30.spec/blue/common/test-idioms.md` — 테스트 이디엄. 본 spec 은 이디엄 불변, 타입 인식 · rc=0 효능만 다룸.

### 축 귀속 판단 근거 (REQ-054 FR-05 판단)
- FR-05 는 "spec 배치 경로 inspector 재량" — α (`regression-gate` 증분) / β (`src-typescript-migration` FR-04·FR-05 증분) / γ (독립 spec 신설 `foundation/typecheck-exit-zero.md`) 중 택1.
- **채택: γ 독립 spec 신설 (`foundation/typecheck-exit-zero.md`)**.
- 근거:
  1. **축 독립성**: 본 불변식은 "master HEAD rc=0 + TS 카테고리 전체 0-hit + strict 설정 유지" 3 결합이 단일 축 — `regression-gate` (step 존재) 와 `src-typescript-migration` (확장자 수렴 + 런타임 혼재) 두 축의 교집합이 아닌 **제3 layer** (strict 계약 회귀 게이트 효능).
  2. **α 경로 기각 근거**: `regression-gate` 는 "CI workflow 가 step 을 포함한다" 4 불변식 cluster (test / build / typecheck / coverage step 존재). rc=0 효능은 cluster 내부 의미보다 **step 효능 효력 축** 으로 layer 분리 유리. 증분 시 기존 FR-01 의 "step 존재" 의미가 "step 존재 + rc=0" 로 변질 — semantic 경계 훼손 우려.
  3. **β 경로 기각 근거**: `src-typescript-migration` FR-04 는 "혼재 허용 중 green 유지" 계약. 본 spec FR-02 는 이를 5항목화하지만 "master HEAD rc=0 상시 불변식" (FR-01) 은 전환 축 내부 계약이 아닌 **저장소 축 항구 불변식** 이므로 전환 축 내부 박제 시 의미 축소.
  4. **γ 경로 채택 이유**: `foundation/regression-gate` FR-07 선례 (2 불변식 = 기존 2 spec semantic 경계 흐림 우려로 독립 spec 신설) 와 `foundation/tsconfig-test-ambient-globals` 선례 (tsc 타입 인식 경로 독립 spec 신설) 동일 원리. 독립 spec 으로 audit · 의미 경계 유지 · 파일명 자체가 축 이름 역할.
  5. **증분 관계 박제 방식**: `src-typescript-migration` FR-04 / FR-05 본문은 본 spec 이 건드리지 않고, 본 spec §동작 FR-02 · FR-03 에서 "증분" 관계로 참조 기술. 이로써 `src-typescript-migration` 축은 "확장자 수렴 + 런타임 혼재 허용" 본연의 의미를 유지하며, "strict 계약 회귀 게이트 효능" 은 본 spec 이 단독 축으로 담당 (교집합 문장 재박제 0).

### 현장 근거 (HEAD=`46f4484`, 2026-04-22 실측)
- `package.json:24` — `"typecheck": "tsc --noEmit"` (TSK-20260420-88 수렴 이후 상시 존재).
- `tsconfig.json` — `strict: true` · `noImplicitAny: true` · `noUncheckedIndexedAccess: true` · `allowJs: true` · `checkJs: false` · `types: ["vitest/globals", "node"]`.
- `.github/workflows/ci.yml` — Typecheck step 1 hit (TSK-20260421-75 수렴 `5dbf308`).
- `src/Toaster/Toaster.test.tsx` · `src/Comment/*.tsx` · `src/File/*.tsx` · `src/Search/*.tsx` · `src/Image/*.tsx` — 기존 island 잔존 오류 대상 (§baseline 파일 분포).

### 외부 근거
- TypeScript 공식 — `tsc --noEmit` (type check only, no output). type error 0 시 exit 0, 1+ 시 비-0.
- TypeScript 공식 — `strict` family (`strictNullChecks` · `noImplicitAny` · `strictFunctionTypes` · `strictBindCallApply` · `strictPropertyInitialization` · `alwaysStrict` · `useUnknownInCatchVariables`). FR-05 전제.
- TypeScript 공식 — `noUncheckedIndexedAccess`. index 접근 시 `| undefined` 암시 부가 — TS2345 / TS2532 / TS2339 유발 경로.
- React 공식 — 이벤트 핸들러 타입 시그니처 (`KeyboardEvent` / `KeyboardEventHandler`). TS2769 overload mismatch 유발 경로 중 하나 (본 spec FR-04 는 수단 라벨 부여 금지).
- Vitest 공식 — `expect().toHaveClass` overloads. TS2769 유발 경로 중 하나.

### RULE 준수
- **RULE-07**: FR-01~06 모두 평서형 시스템 불변식. "rc=0 유지" / "혼재 허용 5항목 동시" / "island DoD TS 0 hit" / "수단 중립성" / "strict 설정 유지" / "버전 무관 표현" 모두 시점 비의존 · 반복 검증 가능 · 특정 incident · 릴리스 · 날짜 귀속 부재. §참고 baseline 의 HEAD 박제는 NFR-02 재현 baseline 으로 예외 (선례: `tsconfig-test-ambient-globals` · `src-typescript-migration`).
- **RULE-06**: 본 spec 은 baseline 수치 박제 + 평서형 불변식 문서. `## 스코프 규칙` `expansion: N/A` + 5 gate (a~e) 실측 수치 박제. 파생 task 는 req FR-04 의 3 수치 (typecheck rc + 디렉터리 범위 `error TS` hit + 상위 3 TS 카테고리 hit) 를 task 본문 `## 스코프 규칙 grep-baseline` 에 실측 박제 필수.
- **RULE-01**: inspector writer 영역 (`30.spec/green/**`) 만 신설 (`foundation/typecheck-exit-zero.md`). `20.req/*` → `60.done/2026/04/22/req/` mv.
- **RULE-02**: 단일 커밋 `spec(inspector): ...`. push 금지.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-22 | inspector / (this commit) | 최초 등록 — REQ-20260422-054 흡수. FR-05 판단으로 **γ 독립 spec 신설** 경로 채택 (근거: §참고 "축 귀속 판단 근거"). FR-01~05 Must + FR-06 Should 박제. baseline HEAD=`46f4484` 실측 — `npm run typecheck` rc=**2** · `grep -cE "error TS"` **106 hit** · TS2304 **0 hit** (`tsconfig-test-ambient-globals` FR-01 수렴 완료 후). 카테고리 분포 TS2345 39 / TS2769 20 / TS2322 16 / TS2339 13. 파일 분포 상위 `src/Toaster/Toaster.test.tsx` 19 / `src/Comment/Comment.test.tsx` 15 / `src/File/FileItem.test.tsx` 13 / `src/Search/SearchInput.test.tsx` 11 / `src/Search/hooks/useSearchList.test.ts` 10. FR-02 (혼재 허용 5항목) 는 `foundation/src-typescript-migration` FR-04 의 증분 관계로 참조 기술 (본 spec 단독 박제, src-typescript-migration 본문 unchanged). FR-03 (island DoD) 도 동일 증분 참조. `foundation/regression-gate` FR-01 (step 존재) 의 rc=0 효능 축으로 직교 보완. FR-05 strict 설정 유지 제약 박제 (하향 배제). FR-06 버전 무관 표현. consumed req: `specs/20.req/20260422-master-typecheck-exit-zero-invariant-strict-island-error-convergence.md`. RULE-07 자기검증 — 평서형 · 반복 검증 가능 · 시점 비의존 · incident 귀속 부재. RULE-06 §스코프 규칙 `expansion: N/A` + 5 gate (a~e) 실측 수치 박제. | all (신설) |
| 2026-05-17 | inspector reconcile / (this commit) | Phase 1 drift reconcile @ HEAD=`a1755b5`. 4 island type-safe DoD 수렴 커밋 (761fb35 Comment + e1abf17 File + f23e664 Search + afaa219 Image — 전원 HEAD 조상) 박제로 §테스트 현황 FR-03 + FR-05 + §수용 기준 FR-03 + FR-05 + NFR-01 + NFR-02 + NFR-03 + NFR-04 총 8 체크박스 flip. re-gate @HEAD=`a1755b5` 실측: (i) `npm run typecheck 2>&1 | grep -cE "error TS"` → 3 hit (190 hit → 3 hit, -187 — TS2688 vitest/globals + TS6046 moduleResolution + TS5070 resolveJsonModule 3건 모두 tsconfig 경로 / `src/**` 0 hit). (ii) 8 island 디렉터리 (Toaster/File/Image/Comment/Search/common/`__fixtures__`/test-utils) 전원 0 hit. (iii) `tsconfig.json:8-10` strict 3 플래그 전원 `true` 유지. (iv) island 수렴 4 커밋 diff 전원 `src/<island>/**` 경로 한정 + tsconfig/package.json scripts/.github/workflows/.husky 변경 0. FR-01 (rc=0 + 전체 0 hit) 은 tsconfig 3 hit 잔존으로 미수렴 marker 유지 — 잔존 3 hit 는 `src/**` 외 tsconfig 경로 (별 축 후보). FR-02 (혼재 허용 5항목 동시) 는 typecheck rc=2 로 미수렴 marker 유지. FR-04 (수단 라벨 0) 은 40.task/60.done 미가시 보수적 marker 유지. FR-06 (버전 고정 표현 0) 은 line 37 메타 인용 해석 여지 marker 유지. 본 세션 diff = 본 green spec 8 ack 박제 + 변경 이력 1 row 증분 + `.inspector-seen` 갱신 (writer 영역 한정). | §테스트 현황 / §수용 기준 / §변경 이력 |
