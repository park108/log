# Vite `VITE_*` env 변수 진입점 타입 박제 + `as string` 캐스팅 0 hit 정합

> **위치**: 횡단 시스템 불변식 — `src/types/env.d.ts` 의 `ImportMetaEnv` 확장과 `src/**` 전체의 `import.meta.env.VITE_*` 참조. 단일 식별자 없음 (게이트는 grep + tsc 측정).
> **관련 요구사항**: REQ-20260517-072
> **최종 업데이트**: 2026-05-17 (by inspector — Phase 1 reconcile — G3 marker hook-ack @4b5cc1d 플립, 전반 tsc exit=0 도래 TSK-15·16 동반)

> 본 spec 은 시스템 횡단 게이트. 라인 번호 박제 없음 — 16 hit / 8 cast / 10 key baseline 은 §스코프 규칙 grep-baseline 에 박제 (시점 비의존, RULE-07 §양성 기준 정합).

## 역할
`src/**` 런타임 모듈이 사용하는 `VITE_*` 환경 변수의 **타입 박제** (`src/types/env.d.ts` 의 `interface ImportMetaEnv` 확장) 와 **캐스팅 회피** (`as string` 0 hit) 두 축을 상시 시스템 계약으로 박제. 의도적으로 하지 않는 것: `VITE_*` 값 자체의 런타임 검증 (URL 형식 / fail-fast 정책), `.env.example` 운영 정합 (운영자 영역), `import.meta.env.DEV/PROD/MODE` 진입점 (이미 `components/common.md` 박제), `VITE_ADMIN_USER_ID_*` 키 (REQ-20260421-038 제거 완료), 단일 진입점 helper 모듈 도입 여부 (수단 중립).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `src/types/env.d.ts` ↔ `src/**` 실 참조 간 타입 정합과 캐스팅 회피의 결과 효능을 grep + tsc 단일 명령으로 검증.

## 동작
1. (G1) 캐스팅 0 hit 게이트
   - 명령: `grep -rnE 'import\.meta\.env\.VITE_[A-Z_]+\s+as\s+string' src` → **0 hit**.
   - 의미: `src/**` 어떤 `.ts/.tsx` 모듈도 `VITE_*` 참조에 `as string` 캐스팅을 사용하지 않는다. 캐스팅이 0 이려면 `ImportMetaEnv` 가 해당 키를 `string` (또는 명시 nullable) 으로 박제해야 한다.
2. (G2) 키 enumerate 동치 게이트
   - 절차: `grep -rohE "import\.meta\.env\.VITE_[A-Z_]+" src | sort -u` 결과 unique 키 집합 `S_src` 와, `src/types/env.d.ts` 의 `interface ImportMetaEnv` 안에 선언된 `readonly VITE_*` 키 집합 `S_type` 가 **집합 동치** (`S_src ⊆ S_type ∧ S_type ⊆ S_src` — 누락 0 / 잉여 0).
   - 의미: src 가 실제로 참조하는 키만큼 정확히 박제. `S_type` 잉여는 죽은 선언, `S_src` 잉여는 인덱스 시그니처 우회 (typo 검출 불가) 위험.
3. (G3) 정적 안전성 게이트
   - 명령: `npm run typecheck` (또는 `npx tsc --noEmit`) exit=0 + `VITE_*` 참조 지점에서 implicit `any` 0. `tsc` 가 `S_type` 박제를 인식해 `VITE_*` 참조를 `string` 으로 정상 추론.
   - 의미: G1·G2 박제가 컴파일 타임 게이트로 강제됨 — 신규 `VITE_*` 도입 시 (a) `S_type` 미확장이면 캐스팅 강제 → G1 위반 검출, (b) `S_type` 만 확장하고 참조 없으면 G2 잉여 검출.
4. (G4) 시점 비의존
   - G1 ∧ G2 ∧ G3 는 신규 `VITE_*` 키 도입 / 제거 / rename 등 어떤 이벤트 직후에도 1 PR 안에 동시 충족. 이벤트 발생 시 `src/types/env.d.ts` 확장 행과 `src/**` 실 참조 추가/삭제를 동일 PR 정합.
5. (G5) 범위 제한
   - 본 게이트는 `src/**` 한정. `.env`, `.env.example`, `vite.config.ts`, `vitest.config.ts`, `package.json`, `docs/**` 등 src 외부의 `VITE_*` 참조는 본 게이트 범위 밖. test 파일 (`*.test.{ts,tsx}`) 은 `src/**` 안이므로 게이트 포함.

## 의존성
- 내부: `src/**` (G1·G2·G3 입력 영역), `src/types/env.d.ts` (G2 박제 위치, G3 입력).
- 외부: `vite/client` 의 `interface ImportMetaEnv` 기본 (인덱스 시그니처 `[key: string]: any`) — `src/types/env.d.ts` 가 `/// <reference types="vite/client" />` 로 import 후 동일 인터페이스 declaration merge 로 확장.
- 역의존 (사용처): RULE-07 SPEC CONTENT 양성 기준, `components/common.md` §환경 분기 계약 (env.ts `isDev/isProd/mode` 단일 진입점 — 본 spec 은 동축의 `VITE_*` 진입점 확장). CI lint step / pre-commit 훅 / `npm run lint`·`npm run typecheck` 부속 스텝 (수단은 task 위임).
- 선행 조건: `REQ-20260517-061` (`toolchain-version-coherence`) 수렴 후 `npm run typecheck` 환경 회복 — G3 실측 가능.

## 테스트 현황
- [x] (G1) `grep -rnE 'import\.meta\.env\.VITE_[A-Z_]+\s+as\s+string' src` → 0 hit 게이트 — HEAD=`cb47bd2` 실측 0 hit (baseline 8 → 0 회수, TSK-07 수렴 ack).
- [x] (G2) `S_src == S_type` 집합 동치 — HEAD=`cb47bd2` 실측 `S_src=10 / S_type=10 / diff=0` (baseline `S_src=10 / S_type=0 / diff=10` → 회수, TSK-07 수렴 ack).
- [x] (G3) `npm run typecheck` exit=0 + `VITE_*` 참조 지점 implicit `any` 0 — hook-ack: TSK-20260517-15 `964f294` (HEAD 조상 — src/common/ 109 → 0) + TSK-20260517-16 `689b87b` (HEAD 조상 — src/Toaster/ 19 → 0) 동반 머지로 전반 `tsc` exit=0 도래. HEAD=`4b5cc1d` 재실측: `npx tsc --noEmit` rc=0 + `npx tsc --noEmit 2>&1 | grep -E "VITE_" | wc -l` → 0 hit PASS (baseline 128 → 0 전반 수렴). `typecheck-island-extension.md` (I3) hook-ack 와 동시 도래 — 직교 축 정합 (VITE_* 타입 정합 + island 자격) 동시 충족.
- [x] (G4) CI / pre-commit 훅 / `npm run lint` 부속 스텝 박제 — TSK-20260517-08 / `cb47bd2` 수렴 ack: `scripts/check-vite-env-coherence.sh` (α 수단) + `package.json scripts.check:vite-env` + `.husky/pre-commit` 조건부 호출 (src/** staged 시) + `.github/workflows/ci.yml` step 박제. 회귀 시뮬레이션 양방향 검증 (G1·G2 재삽입 → exit=1 → 원복 → exit=0).

## 수용 기준
- [x] (Must) `grep -rnE 'import\.meta\.env\.VITE_[A-Z_]+\s+as\s+string' src` → 0 hit. baseline 8 hits in 8 files → HEAD=`cb47bd2` 실측 0 hit (TSK-07 수렴 ack).
- [x] (Must) `S_src == S_type` 동치 — `grep -rohE "import\.meta\.env\.VITE_[A-Z_]+" src | sort -u` 와 `src/types/env.d.ts` 의 `readonly VITE_*` 선언 집합이 동일. baseline `S_src=10 / S_type=0` → HEAD=`cb47bd2` 실측 `S_src=10 / S_type=10 / diff=0` (TSK-07 수렴 ack).
- [x] (Must) `npm run typecheck` (REQ-061 수렴 후) exit=0 + `VITE_*` 참조 지점 implicit `any` 0. hook-ack: HEAD=`4b5cc1d` 재실측 `npx tsc --noEmit` rc=0 + VITE_* 관련 에러 0 hit PASS — TSK-15·16 (`964f294`+`689b87b`) 회수로 전반 `tsc` exit=2 → exit=0 도래.
- [x] (Must) 본 세 게이트는 신규 `VITE_*` 키 도입·제거·rename 등 이벤트 후 1 PR 안에 동시 충족 (시점 비의존) — TSK-07 + TSK-08 통합 단일 PR `cb47bd2` 가 `src/{File,Image,Comment,Search}/api{,.mock}.ts` 8 hit 회수 (G1) + `src/types/env.d.ts` `ImportMetaEnv` 확장 10 키 (G2) + CI/pre-commit 박제 (G4) 동시 충족 사례로 ack.
- [x] (Should) 본 게이트는 CI lint step 또는 pre-commit 훅 또는 `npm run lint`/`npm run typecheck` 부속 스텝으로 자동 실행 — PR 단계 회귀 검출. 수단 (custom ESLint rule / npm script / husky hook) 선정은 task 위임 — TSK-08 / `cb47bd2` 수렴 ack (수단 α + γ 복합: `scripts/check-vite-env-coherence.sh` + `npm run check:vite-env` + `.husky/pre-commit` 조건부 호출 + `.github/workflows/ci.yml` step).
- [x] (Should) FR-04 수단 택1 (α: 확장만 + 직접 참조 유지, β: helper 모듈 경유 단일화, γ: 혼합) — task 단계 planner / developer 가 본 spec §변경 이력에 박제. 어느 경로든 G1·G2·G3 동시 충족 — TSK-07 / `cb47bd2` 수단 α 채택 (확장만 + 직접 참조 유지, helper 모듈 도입 0 hit).
- [x] (Must, 범위 제한) `.env`, `.env.example`, `vite.config.ts`, `vitest.config.ts`, `package.json`, `docs/**` 등 src 외부 `VITE_*` 참조는 본 게이트 위반으로 카운트되지 않음 (필요 시 별도 spec) — 정의상 항상 참, marker 플립.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 시스템 횡단 게이트 박제 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`7154b8e`, 2026-05-17):
  - `grep -rnE "import\.meta\.env\.VITE_[A-Z_]+" src` → **16 hits in 12 files** (10 unique keys):
    - `VITE_LOG_API_BASE` — `src/Log/api.js:5`, `src/Log/api.mock.js:6` (`.js`, 캐스팅 없음).
    - `VITE_MONITOR_API_BASE` — `src/Monitor/api.js:3`, `src/Monitor/api.mock.js:17` (`.js`, 캐스팅 없음).
    - `VITE_FILE_API_BASE` — `src/File/api.ts:3`, `src/File/api.mock.ts:6` (`as string`).
    - `VITE_IMAGE_API_BASE` — `src/Image/api.ts:3`, `src/Image/api.mock.ts:6` (`as string`).
    - `VITE_COMMENT_API_BASE` — `src/Comment/api.ts:12`, `src/Comment/api.mock.ts:6` (`as string`).
    - `VITE_SEARCH_API_BASE` — `src/Search/api.ts:3`, `src/Search/api.mock.ts:6` (`as string`).
    - `VITE_COGNITO_LOGIN_URL_PROD` — `src/common/UserLogin.tsx:7`.
    - `VITE_COGNITO_LOGIN_URL_DEV` — `src/common/UserLogin.tsx:8`.
    - `VITE_COGNITO_LOGOUT_URL_PROD` — `src/common/UserLogin.tsx:13`.
    - `VITE_COGNITO_LOGOUT_URL_DEV` — `src/common/UserLogin.tsx:14`.
  - `grep -rnE 'import\.meta\.env\.VITE_[A-Z_]+\s+as\s+string' src` → **8 hits in 8 files** (TS 4 island api + 4 mock).
  - `src/types/env.d.ts:1-5` — `export {};` 만 박제. `interface ImportMetaEnv` 확장 0 hit. `S_type = ∅`.
  - `S_src \ S_type = {VITE_LOG_API_BASE, VITE_MONITOR_API_BASE, VITE_FILE_API_BASE, VITE_IMAGE_API_BASE, VITE_COMMENT_API_BASE, VITE_SEARCH_API_BASE, VITE_COGNITO_LOGIN_URL_PROD, VITE_COGNITO_LOGIN_URL_DEV, VITE_COGNITO_LOGOUT_URL_PROD, VITE_COGNITO_LOGOUT_URL_DEV}` (10 키 미박제).
  - `S_type \ S_src = ∅` (잉여 0).
- **rationale**: G1·G2·G3 baseline 은 본 spec 발행 시점 박제 — 향후 회귀 분석 시 위반 hit 수 변화 추적 기준. 16 hit / 8 cast / 10 key / `S_type=∅` 는 §배경 측정값 기록일 뿐, 본 spec 의 §수용 기준은 hit 수 비의존 (RULE-07 정합). G2 의 unique 키 enumerate 는 task 발행 시점 planner 가 재측정 (10 → N 변동 가능).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-072 흡수) / pending | 최초 박제 — `VITE_*` 진입점 타입 박제 + `as string` 캐스팅 0 hit + 키 enumerate 동치 + tsc 정적 안전성 4 축 게이트. baseline 16 hit / 8 cast / 10 key / S_type=∅. | all |
| 2026-05-17 | inspector (Phase 1 ack) / `cb47bd2` (TSK-07 + TSK-08 통합) | G1·G2·G4 marker 플립. G1: `grep -rnE 'import\.meta\.env\.VITE_[A-Z_]+\s+as\s+string' src` → 0 hit (baseline 8 → 0). G2: `S_src=10 / S_type=10 / diff=0` (baseline `S_type=∅ / diff=10` → 회수). G4: `scripts/check-vite-env-coherence.sh` (α) + `package.json scripts.check:vite-env` + `.husky/pre-commit` 조건부 호출 + `.github/workflows/ci.yml` step 4축 박제 (수단 α + γ 복합, β 미채택 — flat-config last-write-wins 회피). Must 시점비의존 (1 PR 동시 충족 단일 사례 ack) + Must 범위 제한 + Should 자동 게이트 + Should FR-04 수단 택1 (α) 동시 플립. G3 marker 보류 — VITE_* 한정 implicit any 0 hit PASS (`tsc --noEmit` 출력 grep) 이나 전반 `tsc` exit=2 (`src/**` 40+ hit 다른 영역 에러 — Toaster / common.ts 등, `src-typescript-migration` 영역). 회귀 시뮬레이션 양방향 검증 (G1 `src/File/api.ts:3` 재삽입 → exit=1 → 원복 → exit=0 / G2 env.d.ts 키 제거 → exit=1 → 원복 → exit=0). 회귀 0 hook-ack: `npm run lint` exit=0 / `npm test` 48 files / 439 tests / `npm run build` exit=0 (`cb47bd2` 시점 task result.md 박제). | 테스트 현황 G1·G2·G4, 수용 기준 Must G1·G2·시점비의존·범위제한 + Should 자동게이트·FR-04 수단 |
| 2026-05-17 | inspector (Phase 1 reconcile, hook-ack) / HEAD=`4b5cc1d` | (G3) marker 1건 + (Must G3) marker 1건 총 2건 `[ ]→[x]` 플립. hook-ack 근거: TSK-20260517-15 `964f294` (HEAD 조상 — src/common/ 109 → 0) + TSK-20260517-16 `689b87b` (HEAD 조상 — src/Toaster/ 19 → 0) 동반 머지로 전반 `tsc` exit=2 → exit=0 도래. HEAD=`4b5cc1d` 재실측: `npx tsc --noEmit` rc=0 + `npx tsc --noEmit 2>&1 \| grep -E "VITE_" \| wc -l` → 0 hit PASS — G3 게이트 본문 "전반 exit=0" 조건 충족 (직전 보류 사유 해소). `typecheck-island-extension.md` (I3) 와 동시 도래 — 직교 축 정합 (VITE_* 타입 박제 + island 자격 회복) 동시 충족. 본 spec 전 marker `[x]` 수렴 (green→blue 승격 후보 — planner 영역). | 테스트 현황 G3, 수용 기준 Must G3, 본 이력 |
