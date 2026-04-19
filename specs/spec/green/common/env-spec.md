# 컴포넌트 명세: env

> **위치**: `src/common/env.js` (신규, WIP — §5.1.1 함수형 전환 예정)
> **유형**: Util (Module-level **함수형 getter**)
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-032 함수형 전환 + REQ-20260418-033 §4.3 row #8 정정 반영)
> **상태**: Experimental (도입 전, 신규 명세)
> **관련 요구사항**:
> - REQ-20260418-002 (`specs/requirements/done/2026/04/18/20260418-migrate-to-import-meta-env.md`)
> - REQ-20260418-101 (`specs/requirements/done/2026/04/18/20260418-env-spec-vitest-mode-default-drift.md`) — §5.3 값 단정 drift 정정
> - REQ-20260418-026 (`specs/requirements/done/2026/04/18/20260418-env-helper-call-site-sweep-replace-process-env.md`) — 런타임 21건 sweep (WIP, REQ-002 §10 grep 0건 달성)
> - REQ-20260418-027 (`specs/requirements/done/2026/04/18/20260418-log-test-flaky-listitem-msw-isolation.md`) — Log 테스트의 `process.env.NODE_ENV` 직접 mutation → `vi.stubEnv` 마이그레이션 (본 spec §5.2 테스트 환경 가이드 적용처)
> - REQ-20260418-032 (`specs/requirements/done/2026/04/18/20260418-env-helper-runtime-getter-form-migration.md`) — **함수형 getter 전환** (`boolean` → `() => boolean`), 테스트 stub 즉시 반영, TSK-36 재개 cascade (WIP)
> - REQ-20260418-033 (`specs/requirements/done/2026/04/18/20260418-log-api-js-spec-code-mismatch-correction.md`) — §4.3 row #8 `src/Log/api.js` spec/code drift 정정 + 2 hits sweep (WIP)
> - REQ-20260418-035 (`specs/requirements/done/2026/04/18/20260418-userlogin-cognito-dev-preview-runtime-smoke-baseline.md`) — §7.1 UserLogin Cognito dev/preview 수동 스모크 baseline 박제 트리거 (WIP)
> - REQ-20260419-012 (`specs/requirements/done/2026/04/19/20260419-cross-domain-msw-lifecycle-isolation-phase2.md`) — §5.2 `vi.stubEnv('NODE_ENV', ...)` 패턴의 17 파일 cross-domain sweep 목표 박제 (Phase 2 확장)

> 본 문서는 컴포넌트의 **현재 구현 상태 + 진행 중 변경 계획(WIP)** 을 기술하는 SSoT.
> WIP 항목은 `[WIP]` 또는 `> 관련 요구사항:` 헤더로 표시.

---

## 1. 역할 (Role & Responsibility)
Vite 런타임의 환경 모드(`import.meta.env`) 접근을 단일 헬퍼에 집약하여 **`process.env.NODE_ENV` 산재 참조를 제거**하고 빌드 타임 정적 치환을 보장한다.

- 주 책임:
  - `isDev`, `isProd`, `mode` 세 export 제공
  - 모든 런타임 환경 분기는 본 모듈을 경유
- 의도적으로 하지 않는 것:
  - `VITE_*` 환경 변수 노출(이미 호출부에서 직접 참조 중, 별건)
  - Node 전용 스크립트(`vite.config.js`) 사용 — 무관
  - 테스트 환경 stub 의 표준화 — Could (FR-06, 후속)

> 관련 요구사항: REQ-20260418-002 §3 (Goals)

## 2. 공개 인터페이스 (Public Interface)

### 2.1 Props / Arguments
없음 (모듈 상수만 export)

### 2.2 이벤트 / 콜백
없음

### 2.3 Exports

**[WIP] 함수형 전환 (REQ-20260418-032 FR-01, FR-13)**: 테스트 환경에서 `vi.stubEnv` 이 모듈-로드-타임 캐시를 우회하지 못하는 결함 (TSK-36 blocked 의 근본 원인) 을 제거하기 위해 boolean/string **상수** 에서 **함수 getter** 로 전환:

| 시점 | 시그니처 |
|------|---------|
| 현재 (As-Is) | `isDev: boolean`, `isProd: boolean`, `mode: string` (모듈 로드 타임 정적 치환) |
| [WIP] 목표 (To-Be, REQ-032) | `isDev: () => boolean`, `isProd: () => boolean`, `mode: () => string` |

- named (To-Be):
  - `isDev: () => boolean` — `import.meta.env.DEV` 반환. Vite 빌드 타임 정적 치환 유지 (함수 본문 내 `import.meta.env.DEV` 도 치환됨 — Phase 1 sanity check 필수, REQ-032 §12 위험 1).
  - `isProd: () => boolean` — `import.meta.env.PROD` 반환.
  - `mode: () => string` — `import.meta.env.MODE` 반환 (`'development' | 'production' | 'test' | ...`).
- default: 없음.

**naming 결정 (REQ-032 §13, planner 영역)**: `isDev` / `isProd` / `mode` 유지 (함수형) — 호출부는 `if (isDev())` 로 괄호만 추가. 대안 `getIsDev` / `getIsProd` / `getMode` 는 호출부 sweep 시 더 명확하나 20+ 호출 위치 rename 비용 증가. 권장 = 유지.

## 3. 내부 상태 (Internal State)
없음 (빌드 타임 상수).

## 4. 의존성 (Dependencies)

### 4.1 내부 의존
- 없음

### 4.2 외부 의존
- Vite 런타임의 `import.meta.env` (Vite 8 기준)

### 4.3 역의존 (사용처)
> 관련 요구사항: REQ-20260418-002 FR-02, FR-03, FR-04; REQ-20260418-026 FR-01~04

**[WIP] 마이그레이션 현황 (2026-04-18 관측, REQ-026 대상)**:

`grep -rn "process.env.NODE_ENV" src/ --include='*.js' --include='*.jsx' | grep -v '\.test\.'` → **21 hits / 8 files** (런타임 잔존):

| # | 파일 | 참조 라인 | 관련 함수 | 상태 |
|---|------|-----------|----------|------|
| 1 | `src/common/common.js` | 2, 5, 30, 55, 58, 113, 116, 145, 149 (9건) | `setHtmlTitle`, `log`, `getUrl`, `auth`, `isAdmin` | [WIP] |
| 2 | `src/common/UserLogin.jsx` | 5, 6, 10, 11 (4건) | `getLoginUrl`, `getLogoutUrl` | [WIP] |
| 3 | `src/Monitor/api.js` | 3 (1건) | URL prefix | [WIP] |
| 4 | `src/File/api.js` | 3 (1건) | URL prefix | [WIP] |
| 5 | `src/Comment/api.js` | 3 (1건) | URL prefix | [WIP] |
| 6 | `src/Image/api.js` | 3, 4 (2건) | URL prefix | [WIP] |
| 7 | `src/Search/api.js` | 3 (1건) | URL prefix | [WIP] |
| 8 | `src/Log/api.js` | 6, 7 (2건) | URL prefix (`if (NODE_ENV === 'production')` / `=== 'development'`) | **[WIP]** REQ-20260418-033 — 이전 `[x]` 표기는 drift 였음 (실 코드 `process.env.NODE_ENV` 사용 중). REQ-032 함수형 전환 후 `isProd()` / `isDev()` 치환 예정 |

원 기준선 (REQ-20260418-002 §2): 26 파일 / 112회 → 현재 8 파일 / 21회 → **목표 0건** (REQ-026 Phase 1).

**[WIP] row #8 drift 정정 (REQ-20260418-033)**: 2026-04-18 관측에서 `src/Log/api.js:6-7` 가 여전히 `process.env.NODE_ENV === 'production'` / `=== 'development'` 2건을 사용함을 확인 (followup `20260418-1752-log-api-js-spec-code-mismatch`). 이전 `[x]` 표기 + "이미 `import.meta.env.MODE` 사용" 비고는 실 코드와 불일치. 본 spec 의 row #8 상태를 `[WIP]` 로 정정하고 REQ-20260418-033 머지 시 `[x]` 로 재승격한다. 합계 갱신: 현재 8 파일 / 21회 (UserLogin 머지 후 7 파일 / 19 hits) → 본 요구사항 머지 후 6 파일 / 17 hits → 5 도메인 api.js sweep (TSK-36 재개) 후 1 파일 (common.js) / 9 hits.

**[WIP] TSK-36 본문 §2 정정 트리거 (REQ-20260418-033 FR-06)**: `specs/task/blocked/20260418-env-migrate-api-js-sweep.md:19` 의 잘못된 가정 인용 ("이미 `import.meta.env.MODE` 기준으로 치환 완료") 는 RULE-01 §4 (내용 불변) 에 의해 직접 수정 불가. TSK-36 재개 시 신규 태스크에 정정 사항 반영 (planner 영역).

테스트 파일(`*.test.*`)의 `process.env.NODE_ENV = '...'` stub 은 본 REQ 범위 밖 (테스트 stub 표준화 — REQ-002 FR-06 Could, 별 후보).

## 5. 동작 (Current Behavior)

### 5.1 [WIP] 모듈 본문
> 관련 요구사항: REQ-20260418-002 FR-01

**현재 (As-Is)**:
```js
// src/common/env.js
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;
export const mode = import.meta.env.MODE;
```
Vite 가 빌드 타임에 위 식을 boolean / string 리터럴로 치환 → tree-shake 가능. 단, 모듈 로드 타임 캐시로 인해 `vi.stubEnv` 로 런타임 변경 불가 — TSK-36 blocked 의 근본 원인.

### 5.1.1 [WIP] 함수형 전환 (REQ-20260418-032)
> 관련 요구사항: REQ-20260418-032 FR-01

**목표 (To-Be)**:
```js
// src/common/env.js
export const isDev = () => import.meta.env.DEV;
export const isProd = () => import.meta.env.PROD;
export const mode = () => import.meta.env.MODE;
```

**Phase 1 sanity check (REQ-032 §12 위험 1)**:
- 함수 본문 내 `import.meta.env.DEV` 를 Vite 가 빌드 타임에 boolean 으로 정적 치환하는지 확인 (`npm run build && grep -r "import.meta.env" dist/`).
- 정적 치환 미적용 시 tree-shake 효과 일부 상실 — REQ-032 §3.3 옵션 C (태스크 재분할) 로 fallback.
- 일반적으로 Vite 8.x 는 함수 본문의 `import.meta.env.*` 도 치환한다 (docs/guide/build.html — 2026-04 기준).

**호출부 sweep (REQ-032 FR-02, FR-03)**:
- 현 호출부 (UserLogin.jsx 4 hits, TSK-31 머지본) → `isDev()` / `isProd()` 로 갱신.
- 5 도메인 api.js 6 hits (Monitor/File/Comment/Search/Image) — `process.env.NODE_ENV === 'production'` → `isProd()` (TSK-36 재개).
- common.js 9 hits / Log/api.js 2 hits (REQ-033) 는 별 후속 (planner 분할).

**호출부 부분 머지 회피 (REQ-032 §12 위험 2)**: 단일 PR 에 env.js + 모든 호출부 + 테스트 동시 변경 (atomic). 부분 머지 시 빌드 실패.

### 5.1.2 [WIP] TSK-36 재개 (REQ-20260418-032 §3.1 Phase 4)
> 관련 요구사항: REQ-20260418-032 FR-10

`specs/task/blocked/20260418-env-migrate-api-js-sweep.md` (TSK-36) 는 5 도메인 api.js 치환 후 34/85 회귀로 blocked 됨. 원인: 도메인 테스트가 `process.env.NODE_ENV = 'production'` 직접 mutation 으로 prod 분기를 켜는데, 정적 치환된 `isProd=false` 가 mutation 을 반영하지 않아 MSW `/prod` 핸들러 미매칭.

함수형 전환 후 `vi.stubEnv('PROD', true)` 단독으로 `isProd()` 즉시 반영 → TSK-36 재개 가능. 복귀 방식:
- RULE-05 §1 절차로 blocked/ → ready/ mv (수동 / 운영자), 또는
- 신규 태스크 생성 (planner).

### 5.2 [WIP] 마이그레이션 패턴
> 관련 요구사항: REQ-20260418-002 FR-02, FR-04; REQ-20260418-101 FR-03

**[WIP] 함수형 전환 후 마이그레이션 패턴 (REQ-20260418-032 FR-01, FR-02)**:

| 기존 코드 | 과도기 (boolean 형) | [WIP] 신규 코드 (함수형) |
|-----------|--------------------|-------------------------|
| `if (process.env.NODE_ENV === 'production') { ... }` | `if (isProd) { ... }` | `if (isProd()) { ... }` |
| `if (process.env.NODE_ENV === 'development') { ... }` | `if (isDev) { ... }` | `if (isDev()) { ... }` |
| `'production' === process.env.NODE_ENV && cond` | `isProd && cond` | `isProd() && cond` |
| (도메인 api.js) `/test` vs `/prod` prefix 분기 | `isProd ? '/prod' : '/test'` | `isProd() ? '/prod' : '/test'` 또는 헬퍼 분리 |

**테스트 환경 가이드 (REQ-20260418-101 FR-03)**: vitest 기본 실행(`npm test`, `mode='test'`) 에서 `import.meta.env.DEV === true`, `import.meta.env.PROD === false` 다. 즉 **`if (isDev())` 로 감싼 dev 전용 로그/디버그 블록은 테스트에서도 활성화되어 실행**된다. 테스트가 dev 분기를 실수로 가리거나 prod 분기를 활성 가정하면 회귀 마스킹이 발생하므로, 분기 의존 테스트는 명시적 stub(예: `vi.stubEnv('DEV', false)`) 또는 상호배타 불변식(`isProd() === !isDev()`) 기반 단언을 사용한다.

**`process.env.NODE_ENV` 직접 mutation 금지 (REQ-20260418-027, REQ-20260419-012 Phase 2 확장)**: 테스트 파일이 `process.env.NODE_ENV = 'production'` 를 직접 할당하고 복원하지 않으면 다음 테스트로 누설되어 flaky 원인이 된다. 표준 패턴은 `vi.stubEnv('NODE_ENV', 'production')` + 글로벌 `afterEach(vi.unstubAllEnvs)` (`src/setupTests.js` 에 1회 등록). 상세는 `state/server-state-spec.md` §3.6.3 + §3.7.4 (Phase 2 cross-domain sweep 시 `grep -rn 'process\.env\.NODE_ENV\s*=' src/**/*.test.{js,jsx}` → 0 매치 달성).

**[WIP] 함수형 전환 후 테스트 stub 패턴 (REQ-20260418-032 FR-04, FR-05)**:

함수형 전환 머지 후 `vi.stubEnv('PROD', true)` / `vi.stubEnv('NODE_ENV', 'production')` 단독으로 `isProd()` 가 즉시 `true` 반환. `vi.resetModules() + dynamic import` 우회 불필요.

```js
// 함수형 전환 후 권장 패턴 (간결)
import { isProd } from '@/common/env';

it('dev stage url', () => {
  expect(isProd()).toBe(false); // vitest 기본 MODE='test'
  // ... expect URL === DEV_URL
});

it('prod stage url', () => {
  vi.stubEnv('PROD', true);
  expect(isProd()).toBe(true);
  // ... expect URL === PROD_URL
});
```

**5 도메인 api.js 테스트 표준화 (REQ-20260418-032 FR-04)**:
- `src/Comment/Comment.test.jsx:17, 92, 104, 119` 및 Monitor/File/Search/Image 도메인 테스트의 `process.env.NODE_ENV = '...'` 직접 mutation → `vi.stubEnv('PROD', true)` 또는 `vi.stubEnv('NODE_ENV', 'production')` 로 치환.
- `src/setupTests.js` 에 글로벌 `afterEach(() => vi.unstubAllEnvs())` 등록 (REQ-027 표준 인용).

**UserLogin.test.jsx 우회 단순화 (REQ-20260418-032 FR-11, Could)**:
- 현 `importUserLogin = async () => { vi.resetModules(); const mod = await import('./UserLogin'); ... }` 18라인 우회 (`src/common/UserLogin.test.jsx:1-18`) 를 함수형 전환 후 단순 `vi.stubEnv` + 정적 import 로 단순화.
- 회귀 0 보장 시 적용. 회귀 발견 시 우회 유지.

### 5.3 에러 / 엣지 케이스
> 관련 요구사항: REQ-20260418-101 FR-01, FR-02, FR-04

- **`MODE === 'test'` (vitest 기본)**: Vite 규약 `DEV === !PROD` 를 따른다. `vite.config.js` 에 `mode` override 가 없을 때의 실측치는 `isDev=true`, `isProd=false`, `mode='test'`. (이전 명세의 `isDev=false, isProd=false` 는 drift 였음 — REQ-20260418-101 로 정정.)
- **테스트 단언 패턴 권고 (FR-04, Could)**: 절대값 단언 (`expect(isDev).toBe(false)`) 보다 **상호배타 불변식** (`expect(isProd).toBe(!isDev)`) 을 우선 사용. Vite / Vitest 기본 동작이 바뀌어도 명세-구현 drift 방지.
- **`vite.config.js` 가 `mode` override 시 재평가 필요 (FR-02)**: 예를 들어 `vite --mode staging` 또는 `vitest --mode integration` 등으로 실행하면 `MODE` 값이 달라지고 `DEV`/`PROD` 매핑도 영향 받을 수 있다. 해당 시점에 본 명세 §5.3 값 단정을 재검토한다.
- **jsdom 환경 참고**: `import.meta.env` 접근은 Vite 정적 치환으로 빌드 타임에 해결된다. 테스트 파일이 Node 런타임 (`process.env.NODE_ENV`) 과 혼동되지 않도록 주의.

## 6. 데이터 스키마 (Data Shape)
N/A (boolean / string).

## 7. 테스트 현황 (Current Coverage)
- 테스트 파일: `src/common/env.test.js` (신규 예정, 단순 import smoke)
- 커버될 시나리오:
  - [ ] [WIP] vitest 환경에서 `mode === 'test'` 확인
  - [ ] [WIP] `isDev`, `isProd` 가 boolean 타입
- 통합 검증:
  - [ ] [WIP] `grep -rn "process.env.NODE_ENV" src/` (테스트 제외) 결과 0건 — REQ-026 Phase 1 마감 후 달성
  - [ ] [WIP] `grep -rn "import.meta.env" src/` 외 환경 접근 없음

### 7.1 [WIP] REQ-20260418-026 Phase 2 회귀 검증
> 관련 요구사항: REQ-20260418-026 FR-07~09, NFR-01~04

- [ ] `npm test` 100% PASS (테스트 stub `process.env.NODE_ENV = '...'` 는 범위 밖 — 유지)
- [ ] `npm run build` 성공 + 번들 크기 변화 ≤ ±2%
- [ ] `npm run lint` 통과
- [ ] 주요 라우트 수동 스모크: `/log`, `/log/:timestamp`, `/file`, `/monitor` 진입 시 브라우저 콘솔 에러 0건
- [ ] `auth()` 의 `secure` 쿠키 분기 (production-only) 가 치환 후 동일 동작 (NFR-03 호환성)
- [ ] API URL prefix 분기(`/prod` vs `/test`) 가 치환 후 동일 URL 생성

> 관련 요구사항: REQ-20260418-002 §10 수용 기준, §11 성공 지표; REQ-20260418-026 §10

### 7.1.1 [WIP] UserLogin Cognito dev/preview 수동 스모크 baseline (REQ-20260418-035)
> 관련 요구사항: REQ-20260418-035 FR-01 ~ FR-10, US-01 ~ US-04

**배경**: TSK-20260418-31 (UserLogin.jsx env 헬퍼 마이그레이션, commit `865d86f`) 의 §5.2 수동 검증 2건이 자동 헤드리스 세션 한계로 미수행 상태. 단위 테스트 8/8 PASS (`src/common/UserLogin.test.jsx`) 는 `isDev` / `isProd` stub 기반 URL 문자열 매칭만 검증하며, 실 Cognito Hosted UI 진입 / 리다이렉트 URI 허용목록 정합 / `.env.*.local` 4 키 (`VITE_COGNITO_LOGIN_URL_*` / `VITE_COGNITO_LOGOUT_URL_*`) 의 실 동작은 미커버. REQ-032 (env.js 함수형 전환) / common.js 후속 마이그레이션의 회귀 검증 reference 로 즉시 재사용 필요.

**체크리스트 문서 (REQ-035 FR-01)**: `docs/testing/userlogin-cognito-runtime-smoke.md` 신설 — 자매 `docs/testing/markdown-render-smoke.md` 동일 형식.

**구성 섹션 (FR-02~FR-06, FR-09)**:
- **헤더**: 목적 / 범위 / baseline 일자.
- **사전 조건 (FR-05)**: `.env.development.local` + `.env.production.local` 의 4 키 존재 확인 (키 이름만, 값 미노출 — NFR-05), Cognito 콘솔 redirect URI 등록 확인.
- **검증 절차 — dev stage (FR-02)**:
  1. `npm run dev` 기동.
  2. `http://localhost:3000` 진입 → 로그인 버튼 클릭.
  3. DevTools Network 탭 → 호출 URL 이 `VITE_COGNITO_LOGIN_URL_TEST` 도메인 + `redirect_uri=http://localhost:3000` 포함.
  4. Cognito Hosted UI 로그인 → 콜백 → admin 메뉴 노출 확인.
  5. 로그아웃 버튼 → `VITE_COGNITO_LOGOUT_URL_TEST` 도메인 진입 → 세션 정리 확인.
- **검증 절차 — prod stage (FR-03)**:
  1. `npm run build && npm run preview` 기동.
  2. `http://localhost:4173` (또는 preview 포트) 진입 → 로그인 버튼 클릭.
  3. DevTools Network 탭 → `VITE_COGNITO_LOGIN_URL_PROD` 도메인 + `redirect_uri=...4173` 포함.
  4. Cognito Hosted UI 로그인 → 콜백 → admin 메뉴 노출.
  5. 로그아웃 버튼 → `VITE_COGNITO_LOGOUT_URL_PROD` 도메인 진입 → 세션 정리.
- **로그아웃 절차 (FR-04)**: dev / preview 양쪽에서 로그아웃 버튼 → `VITE_COGNITO_LOGOUT_URL_*` 도메인 진입 + sessionStorage / 쿠키 정리.
- **baseline 데이터 표 (FR-06)**: 일자 / 환경 (Chrome 버전) / 결과 PASS/FAIL / 메모.
- **회귀 트리거 (FR-09)**: env.js 변경 (REQ-032 등), UserLogin.jsx 변경, `.env.*.local` 변경 시 재실행.

**baseline 수행 (FR-07, Must)**: 운영자 1회 dev + preview 양쪽 절차 수행 → baseline 행 1개 작성 → commit. PR 본문에 검증 결과 박제.

**E2E 자동화 시드 후보 (FR-10, Could)**: REQ-031 (Playwright 도입 평가, accessibility-spec §2.2.3) 가 Phase 2 로 진행 시 본 체크리스트 절차를 `e2e/userlogin-cognito.spec.ts` 1차 시드로 재사용.

**NFR (REQ-035 §7)**:
- 운영자 1회 baseline 수행: ≤5분 (dev + preview).
- 후속 회귀 검증: ≤3분 / 회.
- `.env.*.local` 값 노출 0 — 체크리스트 본문에 4 키 이름만.
- 운영 번들 영향: 0 (doc only).

**수용 기준 (REQ-20260418-035 §10)**:
- [ ] `docs/testing/userlogin-cognito-runtime-smoke.md` 신설 (헤더 + 사전 조건 + dev 절차 + prod 절차 + 로그아웃 + baseline 표 + 회귀 트리거)
- [ ] 운영자 1회 dev + preview baseline 행 1개 작성 + commit
- [ ] PR 본문에 검증 결과 박제 (스크린샷 또는 서술)
- [ ] `npm test` 100% PASS (UserLogin.test.jsx 8/8 유지)
- [ ] `npm run lint`, `npm run build` 통과 (운영 번들 영향 0)
- [ ] 본 §7.1.1 반영 (inspector 완료) — 체크리스트 SSoT 인용
- [ ] `.env.*.local` 4 키 이름만 명시 (값 미노출)
- [ ] result.md 에 baseline 데이터 + 회귀 트리거 명시

**spec promote 후속 (FR-10, Could)**: `specs/spec/blue/testing/userlogin-cognito-runtime-smoke-spec.md` 신설은 planner 영역 (자매 REQ-028 체크리스트와 일괄 promote 권장).

**범위 밖**: Cognito 콘솔 redirect URI 등록 자체, `.env.*.local` 키 회전, E2E 자동화 (REQ-031), 로그인 실패 케이스 (잘못된 비밀번호), multi-tab 동시 로그인, 모바일 viewport / iOS Safari OAuth 콜백, TanStack Query devtools.

## 8. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 유지보수성 | 분산(112 hits) | 단일 헬퍼 경유 | NFR-01 |
| 호환성 | N/A | 기존 `npm test` 100% 통과 | NFR-02 |
| 번들 크기 | 현행 | ±0 또는 감소 (dev 분기 제거) | NFR-03 |
| 관측가능성 | dev 로그가 prod 번들에 잔존 가능 | prod 번들 `[DEV]` 0회 | NFR-04 |

## 9. 알려진 제약 / 이슈
- TS 미도입이라 타입은 JSDoc 한정. TS 마이그레이션(별건) 후 `vite-env.d.ts` 로 통합 가능.
- ESLint `no-restricted-syntax` (또는 `no-restricted-globals: ["process"]`) 룰 추가 필요 — FR-05 (Should). 룰 선택은 §13 미결. REQ-026 머지 후 곧바로 룰 도입 권장 (회귀 차단).
- Test 파일은 본 마이그레이션 범위 밖 (REQ §3.1). 테스트가 `process.env.NODE_ENV` 를 사용하면 Node 컨텍스트라 무관하지만 일관성 위해 후속 작업 가능.
- **REQ-026 미결**:
  - `isAdmin` (`src/common/common.js:145, :149`) 분기의 정확한 의미 (production-only vs admin role) — Phase 1 전 사전 확인 필요.
  - `import.meta.env.MODE === 'test'` 에서 `isDev === true, isProd === false` (§5.3 드리프트 정정 후 재검증) → 단순 `production`/`development` 이분 분기만 사용하므로 테스트 환경에서 dev 분기 채택. 의도대로인지 파일별 시각 검증 필수 (REQ-026 §12 위험 1).
  - API URL prefix 분기를 단순 치환할지 별 모듈로 분리할지 — 본 REQ-026 은 단순 치환만, 모듈화는 별 후보.

- **[CLOSED] REQ-032 함수형 전환 결정 (§9 미결 1)**:
  - "env.js 가 모듈 로드 시 고정되어 `vi.stubEnv` 로는 안 바뀌는 경우" 의 정책 결정 — **함수형 전환 (`isDev = () => import.meta.env.DEV`)** 을 채택 (REQ-032 §3.3 옵션 A).
  - 근거: (a) 테스트 stub 즉시 반영 / 보일러플레이트 0 / 모든 호출부 1회 sweep 으로 종결. (b) 옵션 B (MSW URL prefix 와일드카드) 는 mock 인프라 부담. (c) 옵션 C (태스크 재분할) 는 매 sweep 마다 반복 비용.
  - naming: `isDev` / `isProd` / `mode` 유지 (함수형, 호출부는 괄호 추가).

- **REQ-032 미결**:
  - common.js 9 hits 마이그레이션을 REQ-032 에 포함할지 별 후속 (planner) — 권장 = 분리 (5 함수 시그니처 민감).
  - Log/api.js 2 hits 를 REQ-032 에 포함할지 REQ-033 영역 유지 (planner) — 권장 = REQ-033 영역.
  - UserLogin.test.jsx 우회 단순화 (FR-11) REQ-032 vs 별 후속 (planner).
  - TSK-36 재개 방식: blocked → ready 복귀 (수동 mv) vs 신규 태스크 (planner) — RULE-05 §1.

## 10. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-18 | (pending) | 신규 env 헬퍼 도입 + 런타임 마이그레이션 (WIP) | all |
| 2026-04-18 | TSK-20260418-13 (merged) | `src/common/env.js` 헬퍼 모듈 도입 (isDev/isProd/mode export) | 5.1 |
| 2026-04-18 | (pending, REQ-20260418-101) | §5.3 vitest MODE 기본값 drift 정정 (`isDev=false` → `isDev=true`), 상호배타 불변식 권장 메모 추가 (WIP) | 5.2, 5.3 |
| 2026-04-18 | (pending, REQ-20260418-026) | 런타임 21건 sweep — 8 파일 `isDev`/`isProd` 치환 + §4.3 상태 테이블 현행화 (WIP) | 4.3, 7.1, 9 |
| 2026-04-18 | (pending, REQ-20260418-027) | §5.2 에 `vi.stubEnv('NODE_ENV', ...)` + 글로벌 `afterEach(vi.unstubAllEnvs)` 가이드 추가 (WIP, Log 테스트 flaky 격리) | 5.2 |
| 2026-04-18 | (pending, REQ-20260418-032) | §2.3 Exports 시그니처 `boolean` → `() => boolean` 함수형 전환 / §5.1.1 모듈 본문 / §5.1.2 TSK-36 재개 / §5.2 마이그레이션 패턴 함수형 / §9 미결 1 닫힘 (WIP) | 2.3, 5.1, 5.1.1, 5.1.2, 5.2, 9 |
| 2026-04-18 | (pending, REQ-20260418-033) | §4.3 row #8 `src/Log/api.js` drift 정정 — `[x]` → `[WIP]` + 2 hits 사실 박제 + TSK-36 본문 정정 트리거 (WIP) | 4.3 |
| 2026-04-18 | (pending, REQ-20260418-035) | §7.1.1 UserLogin Cognito dev/preview 수동 스모크 baseline 체크리스트 (`docs/testing/userlogin-cognito-runtime-smoke.md`) 신설 트리거 (WIP) | 7.1.1 |
| 2026-04-19 | (pending, REQ-20260419-012) | §5.2 `vi.stubEnv('NODE_ENV', ...)` 패턴의 17 파일 cross-domain sweep 목표 cross-link (Phase 2 확장 — 상세는 `server-state-spec.md` §3.7) (WIP) | 5.2 |

## 11. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-migrate-to-import-meta-env.md` (REQ-002)
  - `specs/requirements/done/2026/04/18/20260418-env-spec-vitest-mode-default-drift.md` (REQ-101)
  - `specs/requirements/done/2026/04/18/20260418-env-helper-call-site-sweep-replace-process-env.md` (REQ-026)
  - `specs/requirements/done/2026/04/18/20260418-log-test-flaky-listitem-msw-isolation.md` (REQ-027, 테스트 stub 가이드 적용처)
- 관련 컴포넌트 명세: 없음 (consumer 들은 spec 미작성. 본 헬퍼 도입 시 함께 갱신)
- 1차 task: `specs/task/done/2026/04/18/20260418-env-helper-module-introduction/` (TSK-13)
- 진행 중/예정 task: (planner 가 생성 예정)
- 외부 참고:
  - Vite Env: https://vitejs.dev/guide/env-and-mode
  - Vitest mode: https://vitest.dev/config/#mode
