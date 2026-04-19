# 명세: TypeScript 도입

> **위치**: `tsconfig.json`, `src/**/*.ts*`, `src/types/api.ts`
> **유형**: Build / 타입 체계
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-019 baseline followups 반영)
> **상태**: Active (baseline 도입 완료 / 후속 정리 + 점진 마이그레이션 단계)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260417-migrate-to-typescript.md`
> - REQ-20260418-019 (`specs/requirements/done/2026/04/18/20260418-typescript-baseline-followups-consolidation.md`) — `@types/react` v19 sync / `baseUrl` deprecation / alias e2e 검증
> - 자매 REQ-20260418-012 (React 19 bump) — `@types/react` 핀 동기화 대상

> 본 문서는 TypeScript 점진 도입 정책의 SSoT.
> 컴포넌트별 마이그레이션 디테일은 task 단위로 분해 (planner 영역).

---

## 1. 역할 (Role & Responsibility)
프로젝트 전체에 정적 타입 체계를 도입하고, API 경계에서 런타임 검증(Zod)을 결합.

- 주 책임:
  - `tsconfig.json` (strict) 설정
  - 점진 전환 정책 (`allowJs: true` → 점진 `.ts`/`.tsx` 변환)
  - API 응답 스키마 Zod 정의 (`src/types/api.ts`)
  - Path alias (`@/common`, `@/types`)
- 의도적으로 하지 않는 것:
  - 런타임 폼 검증 라이브러리(React Hook Form 등) 도입
  - 상태 관리 리팩토링
  - 타입 생성 자동화 (OpenAPI codegen 등)

## 2. 현재 상태 (As-Is)
- 모든 파일 `.js` / `.jsx`
- API 응답 타입 추론 불가 → 리팩토링 위험
- `prop-types` 사용 (런타임 prop 검증)
- FRAMEWORK_DESIGN.md 의 "타입 & 검증" 섹션은 TS 기본 전제로 명시

## 3. 도입 정책 (To-Be, WIP)
> 관련 요구사항: 20260417-migrate-to-typescript

### 3.1 tsconfig 베이스라인
- `strict: true`
- `allowJs: true` (점진 전환 기간)
- `noImplicitAny: true`
- `noUncheckedIndexedAccess: true` (권장)
- `paths`: `@/common/*`, `@/types/*`, `@/log/*` 등

### 3.1.1 [WIP] `baseUrl` deprecation 사전 정리 (REQ-20260418-019 B)
> 관련 요구사항: REQ-20260418-019 FR-03, FR-04, FR-05, US-02

현재 상태: `tsconfig.json:18` `baseUrl: "."` 은 TypeScript 6.0 에서 **deprecated (TS5101)**. 현재 `tsconfig.json:17` `ignoreDeprecations: "6.0"` 으로 silence 처리 중이지만, **TS 7.0 에서는 `ignoreDeprecations` 자체가 제거 예정** 이므로 사전 정리 필요.

- **FR-03**: `tsconfig.json:18` `baseUrl: "."` 라인 **제거**.
- **FR-04**: `tsconfig.json:17` `ignoreDeprecations: "6.0"` 라인 **제거**.
- **FR-05**: `paths` 항목은 절대 경로 형식 (또는 TS 7 신규 문법 확정 후) 으로 재작성. 단순화 위해 `paths` 자체를 제거하고 Vite alias 만 사용하는 대안은 **IDE TypeScript 서버의 alias 인식을 잃으므로 비권장**.
- 변경 즉시 수행 가능 (TS 6.x 에서도 `baseUrl` 없이 절대경로 `paths` 동작). TS 7.0 GA 일정 독립.
- 검증: `npx tsc --noEmit` 통과 + `npm test` / `npm run build` 통과.

### 3.1.2 [WIP] Vite alias ↔ tsconfig `paths` 일관성 (REQ-20260418-019 FR-09)
> 관련 요구사항: REQ-20260418-019 FR-09

- `vite.config.js:15-20` 의 `resolve.alias` 와 `tsconfig.json` 의 `paths` 는 **항상 두 곳 동시 갱신** (alias 추가 / 변경 시 둘 다).
- 현재 정의된 alias: `@/common`, `@/types`, `@/log` 3 종.
- 추가 alias 도입 시 책임자 / 절차는 미결 (REQ-019 §13) — 본 spec 의 후속 갱신 대상.

### 3.1.3 [WIP] `@types/react` v19 동기 bump (REQ-20260418-019 A)
> 관련 요구사항: REQ-20260418-019 FR-01, FR-02, US-01; 자매 REQ-012 (React 19 bump)

- 현재 `package.json:44-45` 의 `@types/react@^18`, `@types/react-dom@^18` 은 React 18 peer 충돌로 v18 로 다운핀.
- **자매 REQ-20260418-012 의 React 19 bump PR 안에서 또는 직후 PR 에서** `^18` → `^19` 로 동기 bump.
- 검증: `npm install` 후 peer warn 0 + `npx tsc --noEmit` 통과.
- 제약: React 19 미반영 상태로 `@types/react@19` 만 단독 올리면 런타임/타입 비정합 → **반드시 묶음 처리** (planner 조율, REQ-019 §12 위험 5).

### 3.2 전환 우선순위
1. `src/common/*` — 의존성이 높고 변경 영향 큼
2. 컴포넌트 (`src/{Comment,File,Image,Log,Monitor,Search,Toaster}/*`)
3. 페이지 / 진입점 (`src/App.jsx`, `src/index.jsx`)

각 단계마다:
- `.js` → `.ts`, `.jsx` → `.tsx` 이름 변경
- 함수 시그니처 / 반환 타입 명시
- props interface 정의
- import 경로 path alias 로 정리

### 3.2.1 [WIP] 첫 TS 마이그레이션 태스크의 alias e2e 검증 의무 (REQ-20260418-019 C)
> 관련 요구사항: REQ-20260418-019 FR-06, FR-07, FR-08, US-03

현재 `grep -rn "from '@/" src/` → 0건. alias 가 정의만 되어 있고 실사용 0. **첫 TS 마이그레이션 태스크**(예: `src/common/common.ts`) 에서 import 경로 1곳을 `@/common/...` alias 로 변경하고 아래 **4 경로 검증 매트릭스** 를 `result.md` 에 기록한다.

| # | 경로 | 검증 명령 | 기대 결과 |
|---|------|-----------|----------|
| 1 | Vitest resolve | `npm test` | PASS (alias 경로 해석) |
| 2 | Vite build | `npm run build` | SUCCESS (alias 경로 해석) |
| 3 | Vite dev 서버 | `npm run dev` 운영자 수동 1회 진입 | 라우트 정상 렌더 |
| 4 | IDE TypeScript 서버 | VSCode 의 `import { ... } from '@/common/...'` 빨간 줄 부재 | 운영자 수동 (스크린샷/메모) |

- **결과 4 항목 모두 `[x]` 를 `task/done/.../result.md` 에 첨부** (FR-07).
- **의무 명시 위치 (FR-08, Should)**: 첫 TS 마이그레이션 태스크의 `task/ready/{slug}.md` 지시서 본문에 "본 태스크는 alias 검증 4 항목 필수" 문구 포함 — planner 가 태스크 작성 시 강제.
- IDE 검증은 자동 수단 부재 → 수동 스크린샷 또는 메모로 대체 (REQ-019 §12 위험 4).

### 3.3 API 경계 (`src/types/api.ts`)
- Zod 스키마로 응답 형태 정의
- `z.infer<typeof Schema>` 로 타입 도출
- 각 도메인 `api.js` 의 fetch 응답을 `Schema.parse(data)` 로 검증
- 검증 실패 시 ErrorBoundary 가 잡는 예외 발생 (관련 spec: `error-boundary-spec.md`)

### 3.4 prop-types 정책
- TS 전환 완료된 컴포넌트는 `prop-types` import 제거
- 전체 전환 완료 시 `prop-types` 의존성 제거 (별 task)

## 4. 의존성

### 4.1 상류 (선행)
- 빌드 도구: Vite (TS 기본 지원) — 본 저장소 기적용
- 테스트 환경: Vitest (TS 기본 지원) — 별 요구사항으로 처리되어야 함
  - 현재 테스트는 Jest 기반 (`*.test.js`/`*.test.jsx`) — Vitest 미마이그레이션 시 `ts-jest` 필요

### 4.2 하류 (후속 영향)
- `prop-types` 제거 (React 19 spec 과 연계)
- API 응답 검증 통합 (TanStack Query spec 의 `queryFn` 안에 `Schema.parse` 삽입)

## 5. 수용 기준 (Acceptance)
- [ ] 모든 파일 TS 전환 완료
- [ ] `tsc --noEmit` strict 모드 통과
- [ ] 빌드 / 테스트 통과
- [ ] API 응답 타입이 Zod 스키마로 보장됨
- [ ] `prop-types` 의존성 제거

### 5.1 REQ-20260418-019 수용 기준 (baseline 후속 정리)
- [ ] (A) `package.json` 의 `@types/react` / `@types/react-dom` 이 `^19.x` (자매 REQ-012 와 묶음 PR)
- [ ] (A) `npx tsc --noEmit` 통과
- [ ] (B) `tsconfig.json` 에서 `baseUrl` 라인 제거
- [ ] (B) `tsconfig.json` 에서 `ignoreDeprecations` 라인 제거
- [ ] (B) `paths` 가 TS 7.0 호환 형식 (또는 그대로 유지하되 경로 형식 점검)
- [ ] (B) `npx tsc --noEmit` 통과 + `npm test` / `npm run build` 통과
- [ ] (C) 첫 TS 마이그레이션 태스크 result.md 에 alias 검증 4 항목 `[x]`
- [ ] (C) `grep -rn "from '@/" src/` ≥1 (alias 사용처 존재)
- [ ] (FR-08 Should) 첫 TS 마이그레이션 태스크 지시서에 alias 검증 의무 명시

## 6. 알려진 제약 / 이슈
- 점진 전환 기간 동안 `.js` ↔ `.ts` 혼재 → import 경로/확장자 혼동 주의
- 외부 라이브러리 타입 정의 부재 시 `@types/*` 추가 또는 `declare module` 보강 필요
- 테스트 러너 마이그레이션 (Jest → Vitest) 가 의존 — 그 사이 `ts-jest` 임시 도입 가능

## 7. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending) | TypeScript 도입 요구사항 등록 (WIP) | 3 |
| 2026-04-18 | (pending, REQ-20260418-019) | baseline 후속 정리: `@types/react` v19 sync (A), `baseUrl` deprecation 제거 (B), 첫 TS 태스크의 alias 4경로 e2e 검증 의무 (C) (WIP) | 3.1.1, 3.1.2, 3.1.3, 3.2.1, 5.1 |

## 8. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260417-migrate-to-typescript.md`
- 관련 spec: `specs/spec/green/build/react-version-spec.md` (prop-types 제거 의존)
- 관련 spec: `specs/spec/green/state/server-state-spec.md` (API 스키마 통합 지점)
