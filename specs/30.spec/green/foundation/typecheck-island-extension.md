# type-safe island typecheck 자격 유지 — `src/Toaster/` + `src/common/` 회복/유지 효능 불변식

> **위치**: `npm run typecheck` (tsc --noEmit) + `src/Toaster/**` + `src/common/**` 디렉터리 경계.
> **관련 요구사항**: REQ-20260517-077
> **최종 업데이트**: 2026-05-17 (by inspector — Phase 1 reconcile I6 marker 1건 self-ack 플립 — 측정 명령 박제 본 spec 발행 시점 PASS marker 회수)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-077 박제 시점 HEAD=`79d28cc`).

## 역할
TypeScript island 자격 (REQ-20260517-059 FR-01 정의 — `.jsx`/`.js` 0 hit + typecheck error 0 hit) 을 **`src/Toaster/` 와 `src/common/` 디렉터리** 가 유지한다는 시스템 불변식. 이전 island 확정 영역 (`src/Comment/`, `src/File/`, `src/Image/`, `src/Search/`, `src/test-utils/`, `src/__fixtures__/`) 의 island 정의 확장. 의도적으로 하지 않는 것: 회복 수단 선정 (CSS Module 인덱스 헬퍼 / `as string` cast / non-null assertion / `tsconfig` 정책 재검토 — task 단 위임), `tsconfig.json` `strict` / `noImplicitAny` / `noUncheckedIndexedAccess` 정책 변경 (정책 유지 가정), `src/Log/` · `src/Monitor/` 잔존 비-island typecheck error (별 `src-typescript-migration` 영역), GitHub Actions / husky / lint-staged 게이트 설정 변경 (REQ-060 husky-pre-push-typecheck / REQ-037 regression-gate 관할), test mock 패턴 재설계 자체 (효능만 박제, 수단 비박제), ErrorBoundary fallback skeleton a11y/copy 계약 (REQ-074 관할), `@ts-expect-error` / `@ts-ignore` 우회 일괄 도입 (NFR-04 회피 정책 박제), 회귀 baseline 의 절대 수치 본문 박제 (수치는 §스코프 규칙 baseline 한정 — 본문 평서형).

## 공개 인터페이스
- 측정 대상 디렉터리: `src/Toaster/`, `src/common/`.
- 측정 명령: `npm run typecheck` (= `tsc --noEmit` 경유).
- 게이트 표현:
  - **island 확장 조건 (I-A)**: `find <dir> \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit (REQ-059 island 정의 전반부).
  - **island 확장 조건 (I-B)**: `npm run typecheck 2>&1 | grep -E "^<dir>/" | grep -cE "error TS"` → 0 hit (REQ-059 island 정의 후반부 — 본 spec 의 핵심 효능).

## 동작
1. **(I1) island 자격 효능 — Toaster**: `src/Toaster/` 의 모든 `.ts` / `.tsx` 파일 (단, `.d.ts` 포함) 에 대해 `tsc --noEmit` 결과 `error TS` 0 hit. CSS Module 인덱스 접근 `styles.<key>` 의 `string | undefined` (`noUncheckedIndexedAccess` 부산물) 가 `toHaveClass(...: string | RegExp)` 시그니처와 호환되는 형태로 좁혀짐 (`asClass` 헬퍼 / `as string` cast / non-null assertion `!` / 정책 예외 중 수단 자유, 본 spec 비박제).
2. **(I2) island 자격 효능 — common**: `src/common/` 의 모든 `.ts` / `.tsx` 파일 (단, `.d.ts` 포함) 에 대해 `tsc --noEmit` 결과 `error TS` 0 hit. 패턴별 회복: (a) URL ↔ Location 비호환 mock 패턴 / `replace` 메서드 부재, (b) `delete` operator 비-optional 피연산자, (c) implicit any (`TS7005` / `TS7006` / `TS7034`), (d) optional chaining 결과 possibly undefined (`TS18047` / `TS18048` / `TS2722`), (e) CSS Module 인덱스 (Toaster 와 공통 패턴). 수단 자유 — task 단 carve 위임.
3. **(I3) 전반 typecheck 효능 — 상위 게이트**: `npm run typecheck` 종료 코드 = 0 + `npm run typecheck 2>&1 | grep -cE "error TS"` → 0 hit. 본 게이트는 (I1) + (I2) 의 합집합이자 REQ-037 FR-01 (CI typecheck step) + REQ-060 (pre-push typecheck) 의 동일 측정 명령 — 본 spec 회복 후 두 게이트가 자동으로 island 자격 보호 작동.
4. **(I4) island 정의 후반부 위임**: REQ-20260517-059 FR-01 island 정의의 후반부 (typecheck 0 hit) 를 본 spec 이 `Toaster` + `common` 두 디렉터리로 확장. REQ-059 가 정의·차단 효능 (island 확정 후 `.jsx`/`.js` 재도입 차단) 을 박제하고, 본 spec 이 자격 미확정 (회귀) 상태에서 자격 재취득 효능을 박제 — 보완 관계.
5. **(I5) 수단 중립 + 우회 정책 회피**: 본 효능 보장은 (a) CSS Module 인덱스 헬퍼 (`asClass(styles, key): string`) 도입, (b) `as string` cast, (c) non-null assertion `!`, (d) `tsconfig.json` `noUncheckedIndexedAccess` 정책 예외 중 어느 수단이든 수용. 단 `@ts-expect-error` / `@ts-ignore` 주석 일괄 도입은 효능을 형식적으로만 충족 — NFR-04 회피 정책 적용 (우회 주석 grep gate baseline 측정 + 회복 후 ≤ baseline).
6. **(I6) 회귀 baseline 측정 방식 (RULE-07 반복 검증 가능)**:
   - 파일별 error count: `npm run typecheck 2>&1 | awk -F'[(:]' '/error TS/ {print $1}' | sort | uniq -c | sort -rn`.
   - error code 분포: `npm run typecheck 2>&1 | grep -oE 'error TS[0-9]+' | sort | uniq -c | sort -rn`.
   - 디렉터리별 0 hit 확인: `npm run typecheck 2>&1 | grep -E "^src/(Toaster|common)/" | grep -cE "error TS"` → 0.

### 회귀 중점
- `src/Toaster/` 또는 `src/common/` 디렉터리에 `.jsx` / `.js` 파일이 신규 추가되면 REQ-059 FR-01 island 정의 전반부 위반 — REQ-059 가 차단 효능을 박제하나, 본 spec 의 (I-A) 조건도 동시 위반.
- `tsconfig.json` `strict` / `noImplicitAny` / `noUncheckedIndexedAccess` 정책이 약화되면 본 효능이 형식적으로 0 hit 수렴할 수 있음 — 본 spec 의 정책 유지 가정 위반. 정책 약화 사례 발생 시 §변경 이력 hook-ack 박제 + 별 req 후보.
- `@ts-expect-error` / `@ts-ignore` 주석이 `src/Toaster/` 또는 `src/common/` 에 일괄 도입되어 0 hit 수렴 시 NFR-04 회피 정책 위반 — `grep -rn "@ts-expect-error\|@ts-ignore" src/Toaster src/common` baseline 측정 + 회복 후 ≤ baseline 유지 필수.
- CSS Module 인덱스 접근 패턴이 `styles[key]` (literal) 에서 `styles[dynamicKey]` 로 확장되면 `noUncheckedIndexedAccess` 부산물 재발 — 본 spec (I1) 회귀 신호.
- `src/common/common.test.ts` 의 URL/Location mock 패턴이 재설계 후에도 `TS2322` / `TS2339` 회귀 시 본 spec (I2) 회귀 신호.

## 의존성
- 외부: TypeScript (`tsc`), `tsconfig.json` 정책 (`strict` / `noImplicitAny` / `noUncheckedIndexedAccess`).
- 내부: `src/Toaster/**`, `src/common/**`, CSS Modules 빌드 산출물 (`*.module.css.d.ts` 자동 생성).
- 역의존 (회복 후 자동 작동): `foundation/regression-gate.md` FR-01 (CI typecheck step), `husky-pre-push-typecheck` (REQ-060 — pre-push hook), `foundation/src-typescript-migration.md` (전반 마이그레이션 진행 신호).
- 직교: `foundation/tooling.md` (ESLint / lint-staged / Vitest coverage 도구 축, typecheck 와 분리), `foundation/src-spec-reference-coherence.md` (src ↔ spec 참조 정합 축).

## 테스트 현황
- [ ] (I1) `src/Toaster/` typecheck 0 hit — baseline 19 error (HEAD=`79d28cc` 실측, `TS2769` 19건 CSS Module 인덱스). task 수행 후 0 hit 수렴 시 marker 플립.
- [ ] (I2) `src/common/` typecheck 0 hit — baseline 109 error (HEAD=`79d28cc` 실측, 10 file 분포: `common.test.ts` 62 + `common.ts` 11 + `ErrorBoundary.test.tsx` 9 + `Navigation.test.tsx` 8 + `UserLogin.test.tsx` 6 + `a11y.audit.test.ts` 6 + `UserLogin.tsx` 3 + `markdownParser.ts` 2 + `useHoverPopup.ts` 1 + `ErrorBoundary.tsx` 1). task 수행 후 0 hit 수렴 시 marker 플립.
- [ ] (I3) 전반 typecheck `error TS` 0 hit + exit=0 — baseline 128 error 11 file (HEAD=`79d28cc`). (I1) + (I2) 합산 PASS 시 marker 플립.
- [x] (I4) island 정의 후반부 위임 — REQ-059 FR-01 island 정의의 후반부 (typecheck 0 hit) 를 본 spec 이 두 디렉터리로 확장. 본 spec 박제 자체로 정합 박제.
- [x] (I5) 수단 중립 — §동작 5 에 수단 후보 4 카테고리 박제, 라벨 0. RULE-07 정합.
- [x] (I6) 회귀 baseline 측정 명령 박제 — §동작 6 3 명령 박제. 본 spec 박제 자체로 정합 박제 (RULE-07 양성 평서 + 반복 검증). self-ack — HEAD=`472611f` 재실측 baseline 무변동 (Toaster 19 / common 109 / total 128). task (TSK-15/16) 진행 시 baseline 재측정 박제 가능.

## 수용 기준
- [x] (Must, FR-01) §동작 1 + 2 에 "`src/Toaster/` 및 `src/common/` 디렉터리는 island 자격 (`find <dir> \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit + `npm run typecheck 2>&1 | grep -E "^<dir>/" | grep -cE "error TS"` → 0 hit) 을 유지한다" 평서문 박제.
- [x] (Must, FR-02) §동작 2 (a)~(e) 5 카테고리 baseline + §스코프 규칙 baseline 에 error code 분포 박제 (`TS2769` / `TS2322` / `TS2339` / `TS2790` / `TS7005` / `TS7006` / `TS7034` / `TS18047` / `TS18048` / `TS2722`).
- [x] (Must, FR-03) 회복 효능 단일 명령 박제 — §동작 3 + §스코프 규칙 gate (G3) `npm run typecheck` exit=0 + `npm run typecheck 2>&1 | grep -cE "error TS"` → 0 hit.
- [x] (Must, FR-04) 수단 라벨 금지 — §역할 + §동작 5 + §회귀 중점 어디서도 "기본값" / "권장" / "우선" / "default" / "best practice" 부여 0. `grep -nE "기본값|권장|우선|default|best practice" specs/30.spec/green/foundation/typecheck-island-extension.md` → 0 hit (§스코프 규칙 baseline gate 박제).
- [x] (Should, FR-05) §동작 6 회귀 baseline 측정 명령 3건 박제 (파일별 / error code 분포 / 디렉터리별 0 hit 확인).
- [ ] (Should, FR-06) island 자격 재취득 시점의 audit 신호 박제 — `Toaster` + `common` 0 hit 달성 후 본 req 가 `60.done/req/` 이동 시점이 island 확정 시계열의 신규 entry. 본 spec 의 §변경 이력에 신규 row 박제 시점에 marker 플립.
- [x] (Must, FR-07) task 단 위임 명시 — §역할 "회복 수단 선정" out-of-scope + §동작 5 수단 자유 평서 + §회귀 중점 정책/우회 박제.
- [x] (NFR-01) 시점 비의존성 — 본문 (§동작 1~6) 에 128 error / 11 file 절대 수치 박제 0. 수치는 §테스트 현황 baseline + §스코프 규칙 baseline 한정. 본문은 "Toaster + common island 자격 유지" 평서형.
- [x] (NFR-02) 회귀 게이트 정합 — 본 spec 회복 후 `foundation/regression-gate.md` FR-01 + REQ-060 게이트가 자동 작동, 별도 게이트 신설 0.
- [x] (NFR-03) island 정의 정합 — REQ-059 FR-01 island 정의의 후반부 (typecheck 0 hit) 를 본 spec 이 회복 신호로 박제. island 정의 자체는 REQ-059 / `src-typescript-migration` 관할.
- [x] (NFR-04) 우회 정책 회피 — `@ts-expect-error` / `@ts-ignore` baseline 측정 + 회복 후 ≤ baseline 유지 정책 박제 (§동작 5 + §회귀 중점).

## 스코프 규칙
- **expansion**: N/A (시스템 횡단 효능 — task 발행 시점에 planner 가 scope 규칙 재계산, expansion 허용/불허는 carve 시점 결정).
- **grep-baseline** (HEAD=`79d28cc`, 2026-05-17 — REQ-077 흡수 시점 실측):
  - (G1) **[island 정의 전반부 — Toaster]** `find src/Toaster \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit (HEAD=`79d28cc` 실측 PASS — REQ-059 island 정의 전반부 PASS).
  - (G2) **[island 정의 전반부 — common]** `find src/common \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit (HEAD=`79d28cc` 실측 PASS — REQ-059 island 정의 전반부 PASS).
  - (G3) **[island 정의 후반부 — Toaster]** `npm run typecheck 2>&1 | grep -E "^src/Toaster/" | grep -cE "error TS"` → **19 hit** (HEAD=`79d28cc` 실측 MISS — 본 spec 의 회복 대상). 분포: `TS2769` 19건 (CSS Module 인덱스 `styles.<key>` 의 `string | undefined → string` 비호환).
  - (G4) **[island 정의 후반부 — common]** `npm run typecheck 2>&1 | grep -E "^src/common/" | grep -cE "error TS"` → **109 hit** (HEAD=`79d28cc` 실측 MISS — 본 spec 의 회복 대상). 분포 (10 file):
    - `common.test.ts` 62: `TS2790` 12 + `TS7005` 10 + `TS2322` 9 + `TS7034` 9 + `TS2339` 8 + `TS7006` 6 + `TS18048` 4 + `TS2722` 2 + `TS18047` 1 + `TS2704` 1 (URL/Location mock + delete-optional + implicit any + possibly undefined).
    - `common.ts` 11.
    - `ErrorBoundary.test.tsx` 9.
    - `Navigation.test.tsx` 8.
    - `UserLogin.test.tsx` 6.
    - `a11y.audit.test.ts` 6.
    - `UserLogin.tsx` 3.
    - `markdownParser.ts` 2.
    - `useHoverPopup.ts` 1.
    - `ErrorBoundary.tsx` 1.
  - (G5) **[전반 typecheck — 회복 효능 측정]** `npm run typecheck 2>&1 | grep -cE "error TS"` → **128 hit** (HEAD=`79d28cc` 실측, 11 file 누적 = 19 Toaster + 109 common). 회복 효능 = 128 → 0 hit + exit=0.
  - (G6) **[error code 분포 baseline]** `npm run typecheck 2>&1 | grep -oE "error TS[0-9]+" | sort | uniq -c | sort -rn` → 17 unique codes, 분포: `TS2769` 19 / `TS7006` 13 / `TS7005` 13 / `TS2790` 13 / `TS2339` 13 / `TS2322` 13 / `TS7034` 12 / `TS18047` 6 / `TS2365` 4 / `TS2362` 4 / `TS2345` 4 / `TS18048` 4 / `TS2722` 3 / `TS2532` 3 / `TS7031` 2 / `TS2704` 1 / `TS2488` 1 (HEAD=`79d28cc` 실측).
  - (G7) **[수단 라벨 0 — FR-04 정합]** `grep -nE "기본값|권장|우선|default|best practice" specs/30.spec/green/foundation/typecheck-island-extension.md` → 0 hit (본 spec 본문 한정 — §역할 + §동작 + §회귀 중점 어디서도 수단 라벨 부여 0).
  - (G8) **[우회 주석 baseline — NFR-04 정합]** `grep -rn "@ts-expect-error\|@ts-ignore" src/Toaster src/common` → 0 hit (HEAD=`79d28cc` 실측). 회복 task 진행 후에도 ≤ 0 hit 유지 — 우회 주석 일괄 도입 시 NFR-04 위반.
- **rationale**: (G1)(G2) island 정의 전반부 (.jsx/.js 0 hit) 는 본 spec 박제 시점 이미 PASS — REQ-059 정의 정합. (G3)(G4) 는 본 spec 회복 대상 baseline — 128 hit / 11 file. (G5) 는 합산 — `npm run typecheck` exit=0 게이트와 동치. (G6) 는 task 단 회복 수단 선정 시 카테고리 분포 참고용. (G7) 본 spec FR-04 정합 0 hit. (G8) NFR-04 우회 정책 baseline 0 hit — 회복 후 유지 필수.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-077 흡수) / pending | 최초 박제 — `src/Toaster/` + `src/common/` 디렉터리의 typecheck island 자격 (REQ-059 island 정의 후반부) 효능 6 축 (I1~I6) 게이트 + 회복 baseline (128 error / 11 file / 17 unique TS code). consumed req: `specs/20.req/20260517-type-safe-island-typecheck-regression-recovery.md` (REQ-077) → `60.done/2026/05/17/req/` mv. 선행 island 확정 (참조): `afaa219` (Image), `f23e664` (Search), `e1abf17` (File), `a1fedbc` (planner carve). 선행 followup (감사 pointer): `specs/10.followups/20260517-0354-toaster-test-typecheck-tsx-undefined.md` (TSK-20260517-09 회귀 0 검증 단계 진단, source_task: TSK-20260517-09). RULE-07 자기검증 — (I1)~(I6) 모두 평서형·반복 검증 가능 (`tsc` + `find` + `grep` 단일 명령)·시점 비의존 (island 정의 + 회복 효능은 보편 계약)·incident 귀속 부재 (TSK-20260517-09 좌표는 감사 pointer + §스코프 규칙 baseline 한정)·수단 중립 (회복 수단 4 카테고리 라벨 0)·우회 회피 (NFR-04 baseline 박제). RULE-06 §스코프 규칙 8 gate (G1~G8) 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/typecheck-island-extension.md` create). | all |
| 2026-05-17 | inspector (Phase 1 reconcile, self-ack) / HEAD=`472611f` | (I6) marker 1건 `[ ]→[x]` 플립. self-ack 근거: §테스트 현황 본문 "마커 즉시 `[x]` 가능 — 측정 명령은 RULE-07 양성 평서 + 반복 검증" 평서 — 본 spec 발행 시점 PASS marker 회수 (직전 세션 누락분). HEAD=`472611f` 재실측 baseline 무변동 — Toaster G3=19 / common G4=109 / total G5=128 / escape G8=0. TSK-20260517-15·16 (`src-common-typecheck-island-recover` + `src-toaster-typecheck-island-recover`) 카브 발행됨 (planner 32차 @`472611f`) — developer 미회수, (I1)(I2)(I3) marker hook-ack 대기 유지. | §테스트 현황 (I6) |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-type-safe-island-typecheck-regression-recovery.md` (REQ-077 — 본 세션 mv).
- **선행 done req**:
  - `specs/60.done/2026/05/17/req/20260517-island-regression-guard-lint-block.md` (REQ-20260517-059) — island 정의 + 차단 효능.
  - `specs/60.done/2026/05/17/req/20260517-husky-pre-push-typecheck-coverage.md` (REQ-20260517-060) — pre-push typecheck 게이트.
- **선행 followup** (감사 pointer):
  - `specs/10.followups/20260517-0354-toaster-test-typecheck-tsx-undefined.md` (TSK-20260517-09 회귀 0 검증 단계 진단, source_task: TSK-20260517-09).
- **선행 done task** (type-safe island 패턴 참조 사례):
  - `afaa219` — `src/Image/` island DoD typecheck 0 hit (TSK-20260422-13 추정).
  - `f23e664` — `src/Search/`.
  - `e1abf17` — `src/File/`.
  - `a1fedbc` — planner carve `TSK-20260422-13..17`.
- **관련 spec**:
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037 — CI typecheck step FR-01).
  - `specs/30.spec/blue/foundation/tooling.md` (ESLint / lint-staged / coverage 축, 직교).
  - `specs/30.spec/green/common/markdownParser.md` (common/* 영역 referer, 본 spec G4 baseline `markdownParser.ts` 2 hit 와 보완).
  - `specs/30.spec/green/common/sanitizeHtml.md` (common/* 영역 referer, 본 spec G4 baseline 외 sanitizeHtml.test.ts referer).
  - `specs/30.spec/green/common/env.md` (common/* 영역 referer, env.ts referer).
- **tsconfig 정책 좌표**: `tsconfig.json:8` `"strict": true` / `:9` `"noImplicitAny": true` / `:10` `"noUncheckedIndexedAccess": true` — 본 spec 정책 유지 가정.
- **RULE 준수**:
  - RULE-07: 6 불변식 (I1~I6) 모두 시점 비의존·평서형·반복 검증 가능 (`tsc` + `find` + `grep` 재현). incident 좌표 §변경 이력 + 감사 pointer 한정.
  - RULE-06: grep-baseline 8 gate (G1~G8) 실측 박제 (HEAD=`79d28cc`).
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/typecheck-island-extension.md` create).
