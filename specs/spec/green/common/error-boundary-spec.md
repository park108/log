# 명세: Error Boundary + Suspense 패턴

> **위치**: `src/common/ErrorBoundary.jsx`, `src/common/Skeleton.jsx`, `src/common/ErrorFallback.jsx`, `src/App.jsx`
> **유형**: 공통 컴포넌트 / 라우팅 패턴
> **최종 업데이트**: 2026-04-20 (by inspector, drift reconcile — Monitor reporter sweep + runtime smoke doc 완료 ACK post `caadd10`/`94de1fa`)
> **상태**: Active (통합 + Monitor reporter sweep + runtime smoke 문서 신설 완료; 테스트 stderr 억제 완료; 하위 17 Suspense fallback Skeleton 전환 및 운영자 baseline 박제만 잔여)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260417-add-error-boundaries.md` (원 4종 묶음)
> - `specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md` (Skeleton/ErrorFallback/App.jsx 통합 잔여)
> - `specs/requirements/done/2026/04/18/20260418-error-boundary-runtime-smoke-checklist-doc.md` (REQ-20260418-037, 런타임 수동 스모크 체크리스트 신설)
> - `specs/requirements/done/2026/04/19/20260419-monitor-domain-console-error-to-reporterror-consolidation.md` (REQ-20260419-004, Monitor 도메인 `console.error` → `reportError` 일원화 sweep)

> 본 문서는 라우트 / 컴포넌트 트리 단위의 에러 격리와 로딩 fallback 패턴 SSoT.
> 에러 리포팅 도구(Sentry 등) 의 실제 연결은 별 spec.

---

## 1. 역할 (Role & Responsibility)
컴포넌트 트리에서 발생하는 렌더 에러를 격리하고, lazy 로딩 시 의미 있는 로딩 UI 를 제공.

- 주 책임:
  - 라우트 단위 Error Boundary 로 white screen 방지
  - 최상위 Suspense fallback 을 Skeleton 으로 대체
  - 네트워크 에러와 렌더 에러 구분 처리
  - 에러 리포팅(Sentry) 연결 훅 마련 (실제 연결은 별건)
- 의도적으로 하지 않는 것:
  - 실제 Sentry 도입 / 계정 연결
  - 전체 페이지 디자인 시스템화
  - 로깅 백엔드 구축

## 2. 현재 상태 (As-Is) — 2026-04-20 기준 (drift reconcile)
- [x] `src/common/ErrorBoundary.jsx` **존재** (클래스 컴포넌트) — `task/done/2026/04/18/20260418-error-boundary-component/` 에서 추가 완료.
- [x] `src/common/Skeleton.jsx` **존재** (`variant: 'page' | 'list' | 'detail'`, role="status", data-testid). `src/common/Skeleton.test.jsx` 동반 — `src/common/Skeleton.css` 포함.
- [x] `src/common/ErrorFallback.jsx` **존재** (`isNetworkError(error)` 분기 + `error` / `reset` prop). `src/common/ErrorFallback.test.jsx` 동반 — `src/common/ErrorFallback.css` 포함.
- [x] `src/App.jsx:92` 의 최상위 Suspense fallback 이 `<Suspense fallback={<Skeleton variant="page" />}>` 로 전환 완료.
- [x] `src/App.jsx` 에 `ErrorBoundary` / `ErrorFallback` / `Skeleton` / `reportError` import 및 3개 라우트(`/log/*`, `/file/*`, `/monitor/*`) 를 `<ErrorBoundary fallback={(p) => <ErrorFallback {...p} />} onError={reportError}>` 로 래핑 완료 (`:6-9, :97-118`).
- [x] `src/common/errorReporter.js` **존재** + `reportError(error, errorInfo)` 인터페이스 구현 (`src/common/errorReporter.test.js` 동반).
- [ ] `src/App.jsx` 외 **하위 컴포넌트 내부** 17건 `<Suspense fallback={<div></div>}>` 잔존 (`LogSingle:110,139`, `LogItem:62`, `Writer:276,358`, `Monitor:61,64,67,70`, `ContentMon:17`, `ApiCallMon:17`, `WebVitalsMon:18`, `Log:23,37`, `LogItemInfo:107`, `Comment:128,159`, `SearchInput:55`) — REQ-005 §11 "빈 div fallback 0" 수용 기준 관점에서 최상위는 해소됐으나, 하위 라우트 내부 fallback 은 미전환.
- [x] Monitor 도메인 4 파일 fetch 실패 분기 `console.error(...)` → `reportError(...)` 일원화 완료 (REQ-20260419-004, commit `caadd10` refactor: consolidate Monitor console.error to reportError; 2026-04-20 drift reconcile, `grep -rn "console\.error" src/Monitor/*.jsx` → 0 hits, `reportError` import 4 파일 + 호출 7건 확인).
- FRAMEWORK_DESIGN.md 의 Suspense + ErrorBoundary 기본 패턴 — **최상위 구현 완료**, 하위 컴포넌트 전파는 잔여.

> 관련 요구사항: REQ-20260418-005 (완료로 재분류 가능, planner 승격 판단 영역). 본 §2 정정은 inspector drift reconcile — 2026-04-18 당시 "Skeleton/ErrorFallback 부재 + App.jsx 미통합" 표기가 실 코드 관측과 불일치. 실제 통합 작업은 REQ-20260418-005 처리 과정에서 반영 완료됐으나 본 spec 의 As-Is 표가 미갱신 상태로 유지되어 있었음.

## 3. 신규 컴포넌트 (To-Be, WIP)
> 관련 요구사항: 20260417-add-error-boundaries

### 3.1 `src/common/ErrorBoundary.jsx` — **완료**
- 클래스 컴포넌트 (React 표준 Error Boundary 인터페이스)
- 구현 완료 — `task/done/2026/04/18/20260418-error-boundary-component/`
- Props:
  | 이름 | 타입 | 필수 | 설명 |
  |------|------|------|------|
  | `fallback` | `ReactNode \| ({error, reset}) => ReactNode` | Y | 에러 발생 시 표시할 UI |
  | `onError` | `(error, errorInfo) => void` | N | 리포팅 훅 (Sentry 등) |
  | `children` | `ReactNode` | Y | 보호 대상 트리 |
- 메서드:
  - `static getDerivedStateFromError(error)` → `{hasError: true, error}`
  - `componentDidCatch(error, errorInfo)` → `onError?.(error, errorInfo)` 호출
- 상태: `{hasError: boolean, error: Error|null}`
- `reset` 콜백으로 사용자가 재시도 가능

### 3.2 `src/common/Skeleton.jsx` — **완료** (REQ-20260418-005 FR-01)
> 관련 요구사항: REQ-20260418-005 FR-01
- 라우트별 lazy 로딩 시 표시할 스켈레톤 UI
- 구현 완료 (`src/common/Skeleton.jsx`, `Skeleton.css`, `Skeleton.test.jsx`)
- Props:
  | 이름 | 타입 | 필수 | 설명 |
  |------|------|------|------|
  | `variant` | `'page' \| 'list' \| 'detail'` | N (기본 `page`) | 레이아웃 종류. 무효값은 `page` 로 폴백 |
- 시각적 충격 최소화 — 본문이 들어올 위치를 회색 블록으로 미리 보여줌
- 접근성: `role="status"` + `aria-label="로딩 중"` + `data-testid="skeleton-{variant}"`
- variant 별 블록 수: `page=4`, `list=5`, `detail=5`

### 3.3 `src/common/ErrorFallback.jsx` — **완료** (REQ-20260418-005 FR-02)
> 관련 요구사항: REQ-20260418-005 FR-02
- 기본 에러 표시 UI (ErrorBoundary 의 기본 fallback)
- 구현 완료 (`src/common/ErrorFallback.jsx`, `ErrorFallback.css`, `ErrorFallback.test.jsx`)
- Props:
  | 이름 | 타입 | 필수 | 설명 |
  |------|------|------|------|
  | `error` | `Error` | N | 에러 객체 |
  | `reset` | `() => void` | N | 재시도 콜백; 존재 시 "다시 시도" 버튼 렌더 |
- 네트워크 에러(`error.name === 'NetworkError'` 또는 `/failed to fetch|network/i` 매칭) 와 렌더 에러를 구분 표시
  - 네트워크: "연결을 확인하고 다시 시도하세요" + reset 버튼
  - 렌더: "예기치 않은 오류가 발생했습니다" + reset 버튼
- 접근성: `role="alert"`

## 4. 적용 (App.jsx 통합) — **완료** (REQ-20260418-005)
> 관련 요구사항: REQ-20260418-005 FR-03, FR-04, FR-05

### 4.1 최상위 Suspense — **완료** (FR-03)
`src/App.jsx:92`:
```jsx
<Suspense fallback={<Skeleton variant="page" />}>
  ...
</Suspense>
```
기존 `<div></div>` fallback 제거 완료.

### 4.2 라우트 단위 Error Boundary — **완료** (FR-04)
`src/App.jsx:97-118` 에서 3개 lazy 라우트(`/log/*`, `/file/*`, `/monitor/*`) 를 아래 패턴으로 래핑:
```jsx
<ErrorBoundary
  fallback={(p) => <ErrorFallback {...p} />}
  onError={reportError}
>
  <RouteComponent />
</ErrorBoundary>
```
적용 범위:
- 라우트 단위 래핑 (그룹 단위 아님) — planner 가 **라우트 단위** 로 결정.
- `Navigation`, `Footer` 는 현재 래핑 밖 — 이들의 렌더 에러는 최상위 Suspense/React 기본 경로로 처리. 별 라운드에서 범위 확장 가능성 (§13 미결 이슈 후속).
- `PageNotFound` 는 별도 `ErrorBoundary` 래핑 없음 (단순 정적 페이지).

### 4.3 reportError 훅 — **완료** (FR-05)
- `src/common/errorReporter.js` 존재 — `reportError(error, errorInfo)` 인터페이스 정의 완료 (`src/common/errorReporter.test.js` 동반).
- 본 단계 구현은 `console.error` 로 위임. 실제 Sentry 연결은 별 spec.
- 3개 `ErrorBoundary` 의 `onError` prop 이 모두 `reportError` 로 연결됨.

### 4.3.1 reporter 호출부 매트릭스 — Monitor 도메인 sweep 완료 (REQ-20260419-004, commit `caadd10`)

> 관련 요구사항: REQ-20260419-004 FR-01 ~ FR-09, US-01 ~ US-03

**배경 (2026-04-19 관측)**: `reportError` (in `src/common/errorReporter.js`) 는 향후 Sentry 등 외부 관측 서비스 연동의 **단일 진입점(SSoT)** 으로 도입되었으나, 현재 사용처는 `src/App.jsx:9, 99, 107, 115` 의 3개 ErrorBoundary `onError` prop 뿐. Monitor 도메인 4 파일의 fetch 실패/응답 검증 분기는 여전히 **직접 `console.error(...)` 호출** — 향후 외부 reporter wiring 시점에 Monitor 도메인 실패율(외부 API 의존 → 가장 자주 발생할 가능성 높음) 이 누락된다.

**참조 (식별자 기반, 라인 번호 보조 — §참고: 라인 번호는 작성 시점 스냅샷)**:
| # | 파일 | 식별자 / 분기 | 보조 라인 | 인자 형태 |
|---|------|---------------|-----------|-----------|
| 1 | `src/Monitor/VisitorMon.jsx` | fetch 응답 비정상 (`console.error(data)`) | `:157` | `(data)` |
| 2 | `src/Monitor/VisitorMon.jsx` | fetch reject catch (`console.error(err)`) | `:163` | `(err)` |
| 3 | `src/Monitor/ContentItem.jsx` | fetch 응답 비정상 | `:102` | `(data)` |
| 4 | `src/Monitor/ContentItem.jsx` | fetch reject catch | `:108` | `(err)` |
| 5 | `src/Monitor/WebVitalsItem.jsx` | fetch 응답 비정상 | `:100` | `(data)` |
| 6 | `src/Monitor/WebVitalsItem.jsx` | fetch reject catch | `:106` | `(err)` |
| 7 | `src/Monitor/ApiCallItem.jsx` | fetch 응답 비정상 | `:97` | `(data)` |

> 테스트 파일(`*.test.jsx`) 의 `console.error = vi.fn()` spy 는 sweep 대상 아님 (spec §9 미결 이슈 + 테스트 spy 갱신 FR-07 영역).

**문제 / 기회**:
- **관측 사각지대**: Monitor 도메인 fetch 실패는 사용자 페이지에 ErrorFallback 으로 surface 되지 않음(자체 Retry UI) → ErrorBoundary 미발동 → **외부 reporter 도달 0**. 향후 Sentry 연결 시점에 Monitor 실패율 누락.
- **단일 출처 정책 위반**: reporter 정책 변경(로그 prefix, sampling, 민감 정보 필터링) 시 4 파일 동시 수정 필요. NFR-02 기준 "수정 파일 수 1" 미달성.
- **보안 감사**: 민감 정보 로깅 검토 지점이 분산 → reporter 단일 진입으로 검증 단순화 필요.

**목표 (To-Be, FR-01 ~ FR-09)**:
- 위 7건의 `console.error(...)` 호출을 `reportError(...)` 로 교체.
- 각 파일 상단에 `import { reportError } from '../common/errorReporter';` 추가 (FR-05).
- **호출 시그니처 매핑 정책 (FR-06, planner 영역)**:
  - 단순 형태: `reportError(err)` — 현 인자 형태(`console.error(data)`, `console.error(err)`) 를 그대로 위임.
  - 메타 첨부 형태: `reportError(err, { source: 'VisitorMon.fetch', data })` — 향후 Sentry 의 context 필드 활용.
  - **inspector 권장**: 단순 형태로 시작, 후속 메타데이터 추가는 별 spec (Monitor 도메인 외 sweep 포함).
  - 본 요구사항은 **정책 제시** 만 하고 정확 형태는 spec/task 단계에서 결정.
- `errorReporter.js` 의 현 시그니처(`reportError(error, errorInfo)`) 유지 — 본 sweep 가 시그니처 미변경.

**테스트 spy 갱신 (FR-07)**:
- 기존 `console.error = vi.fn()` 기반 테스트가 fetch 실패 분기 검증을 한다면 spy 대상을 `reportError` 로 갱신 — `vi.spyOn(errorReporter, 'reportError')` 패턴.
- spy 갱신 누락 시 테스트 false positive/negative (fetch 실패 어서트 실효성 0 → 회귀 감지 실패) 위험.
- 대상 테스트 (추정, planner 가 grep 으로 정확 목록 확정):
  - `src/Monitor/VisitorMon.test.jsx`
  - `src/Monitor/ContentItem.test.jsx`
  - `src/Monitor/WebVitalsItem.test.jsx`
  - `src/Monitor/ApiCallItem.test.jsx`

**§7.1 (ErrorBoundary 테스트 stderr 억제, REQ-007) 와의 관계**:
- REQ-007 은 ErrorBoundary 테스트의 jsdom stderr 노이즈 억제 — **본 sweep 와 직접 충돌 없음**.
- 단, REQ-007 의 `vi.spyOn(console, 'error').mockImplementation(() => {})` 패턴이 Monitor 테스트에도 파일 scope 으로 적용돼 있다면, reporter 교체 후 spy 대상을 `reportError` 로 갱신해야 fetch 실패 분기 어서트 유효.

**분할 / 순서 (planner 영역)**:
- 권장: **단일 PR / 단일 커밋** — 7 호출부 동시 교체 + 4 테스트 파일 spy 갱신. 중간 상태 (`console.error` 잔존 + `reportError` 혼재) 에서 grep 수용 기준 불일치 최소화.
- 분할: 4 파일별 4 서브태스크 가능 (각 서브태스크 내부 완결). FR-09 의 "sweep 후 잔존 0" 수용 기준은 **마지막 서브태스크 머지 후** 검증.
- REQ-20260418-038 (CI bundle grep) 이 PROD 번들 회귀 자동 차단 가드를 마감하므로, 본 sweep 가 번들 사이즈 회귀(import 1개 추가) 를 ≤+0.5KB 로 유지하는지 CI 에서 자연 모니터링.

**§2 As-Is 정정 트리거**:
- 본 §4.3.1 머지 후 §2 "현재 상태 (As-Is)" 표에 "Monitor 도메인 fetch 실패 reporter 도달률 0% → 100%" 항목 추가 (별 라운드, inspector 후속).

**수용 기준 (REQ-20260419-004 §10) — 완료 (commit `caadd10`, 2026-04-20 inspector drift reconcile)**:
- [x] FR-01 ~ FR-09 모두 충족 (task commit `caadd10`)
- [x] `grep -rn "console\.error" src/Monitor/ | grep -v "\.test\.jsx"` → **0 hits** (2026-04-20 실측)
- [x] `grep -rn "reportError" src/Monitor/` → **7 hits** (호출) + **4 hits** (import) — 2026-04-20 실측 확인
- [x] 4 파일 상단에 `import { reportError } from '../common/errorReporter';` 존재 (ApiCallItem/ContentItem/WebVitalsItem/VisitorMon L3 기준)
- [x] `npm test` 전부 PASS — task commit 기준
- [x] 테스트 spy 가 `reportError` 로 갱신 (4 Monitor 테스트 파일)
- [x] `errorReporter.reportError` 시그니처 변경 없음
- [x] 번들 영향 ≤ +0.5KB gzip — task result 박제
- [x] reporter 정책 변경 영향 파일 수: 1 (`errorReporter.js`) — NFR-02 달성
- [x] Monitor 도메인 fetch 실패 reporter 도달률: 100% (NFR-01 달성)
- [x] `npm run lint` / `npm run build` 회귀 0

**범위 밖**:
- Sentry / DataDog 등 외부 reporter wiring — 별 spec (§4.3 forward placeholder 유지).
- `console.log` (디버깅용) 일반 sweep — Monitor 도메인의 fetch error 분기에 한정.
- `console.error` 가 테스트 spy 로 사용되는 코드(`*.test.jsx`) — FR-07 의 spy 갱신만 대상, 직접 호출 교체 아님.
- error 메시지 포맷/카테고리 표준화 — 별 spec.
- 다른 도메인(`Log`, `Comment`, `File`, `Image`, `Search`) 의 `console.error` 직접 호출 — 별 후속 후보 (§13 미결 이슈).
- `reportError(err, { source, data })` 메타 첨부 형태 채택 — planner 결정 또는 별 spec.

### 4.4 통합 회귀 테스트 — 부분 완료 (FR-06)
- `src/App.test.jsx:250` 에 "renders Skeleton as top-level Suspense fallback without error (white-screen regression guard)" 테스트 존재.
- `src/common/ErrorBoundary.test.jsx` (4/4 PASS), `Skeleton.test.jsx`, `ErrorFallback.test.jsx` 단위 테스트 커버 완료.
- 라우트 격리 통합 테스트 (의도 throw → fallback 노출, 이웃 라우트 무영향) 는 **수동 스모크** 로 커버 예정 (§7.2, 미완).

## 5. 의존성

### 5.1 내부 의존
- `src/App.jsx` — 통합 지점

### 5.2 외부 의존
- 패키지: 없음 (React 표준 Error Boundary)
- 선택 패키지: `react-error-boundary` 도입 검토 가능 (단, 본 spec 은 자체 구현 전제)

## 6. 수용 기준 (Acceptance)
- [x] ErrorBoundary 클래스 컴포넌트 구현 (`task/done/.../20260418-error-boundary-component/`)
- [x] 의도적으로 에러 throw 시 ErrorFallback UI 표시 확인 — 단위 테스트 `ErrorBoundary.test.jsx` (4/4 PASS) + `ErrorFallback.test.jsx` 로 커버. 라우트 격리 수동 검증은 §7.2 미완.
- [x] Lazy 컴포넌트 로딩 중 Skeleton 노출 — `src/App.jsx:92` 적용 + `src/App.test.jsx:250` "white-screen regression guard" 테스트.
- [x] 네트워크 에러와 렌더 에러 구분 표시 — `ErrorFallback.jsx` `isNetworkError(error)` 분기 구현 + 단위 테스트 커버.
- [x] 기존 기능 회귀 없음 — 전체 테스트 스위트 PASS 유지 (별 CI 라운드에서 지속 검증).
- [x] reset 버튼으로 트리 복구 가능 — `ErrorBoundary` `reset` 콜백 + `ErrorFallback` "다시 시도" 버튼.
- [x] `grep -rn "<ErrorBoundary" src/` ≥ 1 (REQ-005 §11 성공 지표) — 실측 10 hits (`src/App.jsx` 3 라우트 래핑 + 테스트 참조).
- [ ] `<Suspense fallback={<div></div>}>` 잔존 0 (REQ-005 §11) — **최상위 App.jsx 해소** but 하위 컴포넌트 내부 17건 잔존 (`LogSingle`, `LogItem`, `Writer`, `Monitor`, `ContentMon`, `ApiCallMon`, `WebVitalsMon`, `Log`, `LogItemInfo`, `Comment`, `SearchInput`). 전역 0 달성은 별 요구사항/후속 라운드 필요.

## 7. 알려진 제약 / 이슈
- React 의 Error Boundary 는 **이벤트 핸들러 / 비동기 코드 / SSR 의 에러를 잡지 못함** — 호출부에서 try/catch 또는 Promise.catch 필요
- React 19 의 변화된 에러 핸들링과 호환성 검증 필요 (별 spec 의존)
- **테스트 stderr 노이즈** (jsdom 29 + React 18) — `ErrorBoundary.test.jsx` 실행 시 `vi.spyOn(console, 'error')` 로 mock 해도 jsdom 의 `callTheUserObjectsOperation` 경로가 에러 스택을 직접 `process.stderr` 로 6회 출력. 테스트 PASS 4/4 지만 CI 로그에 무해 트레이스가 섞여 진짜 실패와 구분 어려움.
  > 관련 요구사항: REQ-20260418-007 (`20260418-errorboundary-test-stderr-suppression.md`)

## 7.1 테스트 stderr 억제 — **완료** (REQ-20260418-007)
> 관련 요구사항: REQ-20260418-007 §3.1 In-Scope, FR-01~04

- 대상 파일: `src/common/ErrorBoundary.test.jsx` (파일 scope 적용)
- 채택: **(a)+(c) 조합** — `beforeAll` 에서 `console.error` spy + `process.stderr.write` spy 동시 mock, `afterAll` restore.
- 구현 (`ErrorBoundary.test.jsx:16-32`):
  ```js
  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  afterAll(() => {
    consoleErrorSpy.mockRestore();
    stderrWriteSpy.mockRestore();
  });
  ```
- 파일 scope 한정 — `setupFiles` 로 이동하지 않음 (다른 테스트의 진짜 `console.error` 캡처를 sink 시키지 않기 위해, FR-02).
- 결과: jsdom 29 + React 18 의 `callTheUserObjectsOperation` 경로 stderr 누수 차단 완료. CI 로그 노이즈 0.

## 7.2 런타임 수동 스모크 체크리스트 cross-link — 문서 신설 완료 (REQ-20260418-037, commit `94de1fa`)

> 관련 요구사항: REQ-20260418-037 FR-01 ~ FR-08

§4 (App.jsx 통합) 의 런타임 동작은 jsdom 범위 밖 — 운영자 수동 스모크 필수. 체크리스트는 `post-merge-visual-smoke-spec.md` §3.C.3 (배치 3) 에 구조 박제 + `docs/testing/error-boundary-runtime-smoke.md` 신설 (REQ-037 FR-01).

**픽스처 5종** (상세는 `post-merge-visual-smoke-spec.md` §3.C.3 참조):
1. Skeleton 가시 (라우트 전환) — `<Skeleton variant="page" />` 노출.
2. 의도 throw 시 ErrorFallback 노출 + Navigation/Footer 유지.
3. 이웃 라우트 정상 동작 — 라우트 격리 검증.
4. Reset 버튼 후 재마운트.
5. `reportError` (onError 훅) 호출 가시.

**baseline 슬롯**: 1회 (본 통합 머지 직후, park108) + 2회 (REQ-012 React 19 bump 후 회귀 0) + 향후 (Sentry 연결 / Suspense Query).

**수용 기준 (본 §7.2 범위)**:
- [x] `docs/testing/error-boundary-runtime-smoke.md` 존재 (REQ-037 FR-01) — commit `94de1fa` (task `docs: add ErrorBoundary runtime smoke checklist (REQ-20260418-037)`; 2026-04-20 inspector drift reconcile, 파일 실측 확인)
- [x] 5 픽스처 커버 (Skeleton / ErrorFallback / 이웃 라우트 / Reset / reportError) — commit `94de1fa` 문서 구조로 충족 (상세는 commit 본문)
- [x] 자매 체크리스트와 형식 동등 (`## Pre-conditions` / `## Golden Path Checklist` / `## Failure Notes`) — commit `94de1fa`
- [ ] (Should) 운영자 1회 baseline 박제 — 문서 하단 Baseline 섹션 pending manual session
- [ ] (Should) REQ-012 (React 19 bump) 머지 후 2회 baseline (회귀 0) — REQ-012 대기

**범위 밖**: Sentry 연결, Playwright, React 19 동작 변경 검증, Suspense Query — 각 별 트랙 / 별 REQ.

## 8. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | TSK-20260418-02 | Error Boundary 클래스 컴포넌트 추가 (완료) | 3.1 |
| 2026-04-18 | (REQ-20260418-005, 통합 완료) | Skeleton / ErrorFallback 신설 + App.jsx 최상위 Suspense fallback Skeleton 전환 + 3 라우트 `ErrorBoundary` 래핑 + `reportError` onError 훅 | 3.2, 3.3, 4 |
| 2026-04-18 | (REQ-20260418-007, 완료) | ErrorBoundary 테스트 stderr 노이즈 억제 (`beforeAll`/`afterAll` + `console.error` + `process.stderr.write` 파일 scope mock) | 7, 7.1 |
| 2026-04-18 | (pending, REQ-20260418-037) | 런타임 수동 스모크 체크리스트 cross-link §7.2 신설 (post-merge-visual-smoke-spec §3.C.3 참조, `docs/testing/error-boundary-runtime-smoke.md` 신설) (WIP) | 7.2 |
| 2026-04-19 | (pending, REQ-20260419-004) | Monitor 도메인 `console.error` → `reportError` 일원화 sweep §4.3.1 신설 — 7 호출부 식별자 매트릭스, 호출 시그니처 매핑 정책 단순 형태 권장, 테스트 spy 갱신 가이드, Sentry wiring 전제 조건 (WIP, 미구현) | 4.3.1 |
| 2026-04-20 | (inspector drift reconcile) | §2 As-Is 정정 (Skeleton/ErrorFallback "부재" → 실 코드 "존재" + App.jsx 통합 완료 반영), §3.2/3.3/4.1~4.3 "[WIP]" 마커 → "완료", §6 수용 기준 7/8 항목 [x] 전환, §7.1 테스트 stderr 억제 "완료" 마킹. 커밋 영향: `specs/spec/green/common/error-boundary-spec.md` 단독. 잔여: 하위 컴포넌트 17 `<Suspense fallback={<div></div>}>`, Monitor reporter sweep (§4.3.1), 런타임 수동 스모크 문서 (§7.2). | 2, 3.2, 3.3, 4.1~4.4, 6, 7.1 |
| 2026-04-20 | (inspector drift reconcile — second pass post `caadd10`/`94de1fa`) | §2 Monitor `console.error` 7건 잔존 → reportError 일원화 완료 ACK (commit `caadd10` REQ-20260419-004 TSK-20260420-01), §4.3.1 헤더 "[WIP]" → "완료" + REQ-004 수용 기준 11 항목 전부 [x] 전환 (2026-04-20 grep 실측 `console.error` 0 hits / `reportError` 4 import + 7 호출 확인). §7.2 헤더 "[WIP]" → "문서 신설 완료" (commit `94de1fa` REQ-20260418-037 TSK-20260420-02) + 수용 3 항목 [x] 전환 (operator baseline 2 항목만 pending). 커밋 영향: 본 spec 단독. 잔여: 하위 17 `<Suspense fallback={<div></div>}>`, §7.2 operator baseline 박제, §7.2 REQ-012 후속 2회 baseline. | 2, 4.3.1, 7.2 |

## 9. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260417-add-error-boundaries.md` (원 묶음)
  - `specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md` (통합 잔여)
  - `specs/requirements/done/2026/04/18/20260418-errorboundary-test-stderr-suppression.md` (테스트 노이즈)
- 관련 spec: `specs/spec/green/build/react-version-spec.md` (React 19 호환)
- 직전 태스크: `specs/task/done/2026/04/18/20260418-error-boundary-component/`
- 관련 followup: `specs/followups/consumed/2026/04/18/20260418-0554-error-boundary-test-log-noise.md`
- 외부 참고: vitest spy/setup https://vitest.dev/api/vi.html#vi-spyon
