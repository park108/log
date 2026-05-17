# `src/common/env.ts` — Vite env 헬퍼 단일 경유 + 빌드타임 리터럴 치환 불변식

> **위치**: `src/common/env.ts` 의 `isDev` / `isProd` / `mode` 3 헬퍼.
> **관련 요구사항**: REQ-20260418-002 FR-01, REQ-20260517-076 FR-01
> **최종 업데이트**: 2026-05-17 (by inspector — REQ-076 흡수 최초 박제; Phase 1 reconcile I1 + FR-01-b marker 2건 hook-ack 플립 by TSK-20260517-11 / `79d28cc`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`893cdea` 박제 시점).

## 역할
`src/**` 런타임 모듈이 사용하는 `import.meta.env.{DEV,PROD,MODE}` 환경 분기는 **`src/common/env.ts` 의 `isDev()` / `isProd()` / `mode()` 단일 헬퍼만 경유**한다는 시스템 불변식. Vite 가 빌드 타임에 boolean / 문자열 리터럴로 치환 → tree-shake 가능. 의도적으로 하지 않는 것: `VITE_*` 키 자체 진입점 (REQ-20260517-072 `vite-env-boundary-typing.md` 영역), env 값 fail-fast 검증 (URL 형식 / 런타임 throw), `.env.example` 운영 정합 (운영자 영역), 헬퍼 API surface 확장 (현재 3 헬퍼 고정).

## 공개 인터페이스
- `isDev(): boolean` — `import.meta.env.DEV` 의 typed wrapper. 호출 시점마다 lazy 평가 (테스트 환경 `vi.stubEnv('DEV', true/false)` 정합).
- `isProd(): boolean` — `import.meta.env.PROD` 의 typed wrapper. lazy 평가.
- `mode(): string` — `import.meta.env.MODE` 의 typed wrapper. lazy 평가.

세 헬퍼는 모두 함수형 (값 직접 export 금지). 이유: Vite 의 빌드 타임 리터럴 치환은 `import.meta.env.X` 표현식에 대해 일어나며 함수 본문 안에 위치해야 호출 시점 환경 (`vi.stubEnv` 포함) 이 반영된다.

## 동작
1. **(I1) 단일 경유 계약**: `src/**` (non-test 영역) 의 `import.meta.env.{DEV,PROD,MODE}` 직접 참조는 `src/common/env.ts` 한정. 다른 모듈은 `isDev()` / `isProd()` / `mode()` import 후 호출. test 영역 (`*.test.{ts,tsx,js,jsx}` / `setupTests.{js,ts}`) 은 `vi.stubEnv` 의도 주석으로 `import.meta.env.DEV/PROD` 표현식 인용 가능 (게이트 범위 밖).
2. **(I2) lazy 평가 계약**: 세 헬퍼 본문은 모듈 로드 시점이 아닌 호출 시점에 `import.meta.env` 를 읽는다. 모듈 최상단 `const cached = import.meta.env.DEV` 같은 캡처 금지 — 테스트의 `vi.stubEnv` 가 무력화된다.
3. **(I3) tree-shake 가능 계약**: 헬퍼 본문은 `import.meta.env.X` 단일 표현 (boolean / string 리터럴 치환 가능 형태) 만 포함. 부수 계산 / branch 금지 — Vite 빌드 산출물에서 `isDev()` 호출처는 `if (false)` 또는 `if (true)` 로 치환되어 dead branch 가 제거된다.
4. **(I4) API surface 고정**: `src/common/env.ts` 의 export 는 3 헬퍼 (`isDev`, `isProd`, `mode`) 만. 추가 export (`VITE_*` 키 wrapper / fail-fast helper / cached value) 도입은 본 spec 범위 밖 — 별 spec / 별 req 후보.
5. **(I5) 범위 제한**: 본 게이트는 `src/**` 한정. `vite.config.{js,ts}` / `vitest.config.{js,ts}` / 빌드 스크립트의 `import.meta.env` 참조는 본 게이트 범위 밖. test 영역은 의도 주석 / `vi.stubEnv` 정합 영역으로 별 spec.

### 회귀 중점
- `src/App.jsx:130` 등 non-test 모듈의 `import.meta.env.DEV/PROD/MODE` 직접 참조는 (I1) 미달 baseline — 본 spec 발행 시점 11 hit 박제 (§스코프 규칙 baseline). 수렴은 task 위임 (별 task carve 대상).
- `src/common/env.ts` 본문이 `const cached = import.meta.env.DEV` 형태로 변경되면 (I2) 위반 — 테스트 `vi.stubEnv` 가 무력화되어 회귀 표면.
- `src/common/env.ts` export 에 4번째 항목 추가 시 (I4) 위반 — API surface 확장 영향 검토 후 별 spec 박제.

## 의존성
- 내부: `src/common/env.ts` (단일 진입점), `src/**` (사용처).
- 외부: Vite `import.meta.env` (런타임 / 빌드타임 치환), Vitest `vi.stubEnv` (테스트 분기).
- 역의존 (사용처): `src/App.jsx` (DEV 분기 — ReactQueryDevtools), `src/App.test.jsx`, `src/common/Navigation.test.tsx`, `src/common/common.test.ts`, `src/common/UserLogin.test.tsx`, `src/setupTests.js` 등 (test 영역은 (I1) 게이트 범위 밖).
- 직교: `vite-env-boundary-typing.md` (`VITE_*` 키 진입점), `tooling.md` (ESLint flat-config).

## 테스트 현황
- [x] (I1) 단일 경유 게이트: `grep -rnE "import\.meta\.env\.(DEV|PROD|MODE)" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "\.test\." | grep -v "setupTests\." | grep -v "common/env\." | wc -l` → 0. HEAD=`79d28cc` 실측 PASS (TSK-20260517-11 / `79d28cc` 수렴 ack — `src/App.jsx:130` `import.meta.env.DEV` → `isDev()` 호출 회수, baseline 1 → 0 hit). result.md DoD 점검: `npm run lint` exit 0 / `npm test` 48 files 439 PASS / `npm run build` PASS (Vite tree-shake 보존).
- [x] (I2) lazy 평가: `src/common/env.ts:5-7` 본문이 모두 화살표 함수 형태 (`(): boolean => import.meta.env.X`) — 모듈 최상단 캡처 0. HEAD=`893cdea` 실측 PASS.
- [x] (I3) tree-shake 가능: 헬퍼 본문이 `import.meta.env.X` 단일 표현 (부수 계산 / branch 0). HEAD=`893cdea` 실측 PASS.
- [x] (I4) API surface: `grep -nE "^export " src/common/env.ts` → 3 hits (isDev, isProd, mode). HEAD=`893cdea` 실측 PASS.
- [ ] (I5) 범위 제한: 정의상 항상 참 — task 발행 시 게이트 baseline 재측정.

## 수용 기준
- [x] (Must, FR-01-a) `isDev()` / `isProd()` / `mode()` 3 헬퍼가 `src/common/env.ts` 에서 export 되며 lazy 평가. 본 spec §공개 인터페이스 + §동작 (I2) 박제. HEAD=`79d28cc` 실측 PASS (`grep -nE "isDev|isProd|^export.*mode" src/common/env.ts` → 3 hits @:5-7 — 함수형 export 박제).
- [x] (Must, FR-01-b) `src/**` non-test 모듈의 `import.meta.env.{DEV,PROD,MODE}` 직접 참조 0 hit (본 모듈 외) — TSK-20260517-11 / `79d28cc` 수렴 ack (baseline 1 hit `src/App.jsx:130` → `isDev()` 호출 회수, 재실측 0 hit). result.md 박제: `import { isDev } from './common/env';` (`src/App.jsx:6`) + `{isDev() && <ReactQueryDevtools .../>}` (`src/App.jsx:131`).
- [x] (Must, FR-01-c) Vite 빌드타임 리터럴 치환 → tree-shake 가능 — 헬퍼 본문 단일 표현 박제 (§동작 I3). HEAD=`893cdea` 실측 PASS.
- [x] (Must, API 고정) `src/common/env.ts` export 3건 (isDev, isProd, mode) 한정. HEAD=`893cdea` 실측 PASS.
- [x] (Must, 범위 제한) `vite.config.*` / `vitest.config.*` / 빌드 스크립트 / test 영역의 `import.meta.env` 참조는 본 게이트 위반으로 카운트되지 않음.

## 스코프 규칙
- **expansion**: N/A (시스템 횡단 게이트 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`893cdea`, 2026-05-17 — REQ-076 흡수 시점 실측):
  - `grep -nE "isDev|isProd|^export.*mode" src/common/env.ts` → 3 hits @:5-7 (`isDev` / `isProd` / `mode` 3 헬퍼 export).
  - `grep -rnE "import\.meta\.env\.(DEV|PROD|MODE)" src` → 11 hits in 7 files:
    - **non-test 영역 (I1 위반 baseline)**: `src/App.jsx:130` (1 hit — `import.meta.env.DEV && <ReactQueryDevtools .../>`).
    - **test / setupTests 영역 (게이트 범위 밖)**: `src/setupTests.js:8,19` / `src/App.test.jsx:10` / `src/common/Navigation.test.tsx:18` / `src/common/common.test.ts:4` / `src/common/UserLogin.test.tsx:6` (모두 `vi.stubEnv` 의도 주석 / 인용).
    - **본 모듈 (I1 면제)**: `src/common/env.ts:5-7` (3 hits — 헬퍼 본문).
  - `grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\."` → 0 hit (참고 — sanitizeHtml 단일 모듈 정합).
- **rationale**: (I1) 게이트 baseline 11 hit 중 10 hit 은 test / setupTests / 본 모듈 (게이트 면제) 이고 실 위반은 1 hit (`src/App.jsx:130`) — task 1건 회수로 0 hit 수렴 가능. (I2)(I3)(I4) 는 본 spec 박제 시점 PASS — 마커 즉시 `[x]`. (I5) 범위 제한은 정의상 항상 참.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — `src/common/env.ts` 단일 헬퍼 경유 + lazy 평가 + tree-shake 가능 + API surface 고정 5 축 (I1~I5) 게이트. baseline: env.ts 3 헬퍼 export / non-test 영역 직접 참조 1 hit (`src/App.jsx:130`) / test 영역 6 hit (게이트 면제). 원전 REQ-20260418-002 FR-01 보존. | all |
| 2026-05-17 | inspector (Phase 1 reconcile) / TSK-20260517-11 `79d28cc` | (I1) + FR-01-a + FR-01-b marker 3건 `[ ]→[x]` 플립. ack: `60.done/2026/05/17/task/env-helper-app-jsx-converge/result.md` DoD 점검 (lint exit 0 / test 48 files 439 PASS / build PASS) + grep 게이트 `src/App.jsx:130` `import.meta.env.DEV` → `isDev()` 호출 회수로 baseline 1 → 0 hit 수렴. src 변경: `src/App.jsx` import 1줄 + 표현식 1건 치환. | §테스트 현황 (I1) + §수용 기준 FR-01-a/FR-01-b |

## 참고
- **REQ 원문**: `specs/60.done/2026/04/18/req/` (REQ-20260418-002 — 단일 진입점 정책), `specs/60.done/2026/05/17/req/20260517-deleted-spec-restore-batch-2-7.md` (REQ-076, 본 세션 mv 후).
- **선행 done req**: REQ-20260418-002 — env 헬퍼 단일 경유 최초 정의.
- **관련 spec**:
  - `specs/30.spec/green/foundation/vite-env-boundary-typing.md` (REQ-072 — `VITE_*` 키 진입점 영역, 본 spec 과 직교 — `DEV/PROD/MODE` 분기 영역만 본 spec 박제).
  - `specs/30.spec/blue/components/common.md` (Skeleton / ErrorFallback 영역, 본 spec 과 직교).
- **RULE 준수**:
  - RULE-07: 5 불변식 (I1~I5) 모두 시점 비의존 평서문 + `grep` 단일 명령 재현 가능.
  - RULE-06: grep-baseline 3 gate 실측 박제.
  - RULE-01: inspector writer 영역만 (`30.spec/green/common/env.md` create).
