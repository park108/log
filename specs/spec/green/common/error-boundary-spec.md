# 명세: Error Boundary + Suspense 패턴

> **위치**: `src/common/ErrorBoundary.jsx`, `src/common/Skeleton.jsx`, `src/common/ErrorFallback.jsx`, `src/App.jsx`
> **유형**: 공통 컴포넌트 / 라우팅 패턴
> **최종 업데이트**: 2026-04-18 (by inspector, WIP)
> **상태**: Active (부분 도입 — ErrorBoundary 클래스 완료, 통합 잔여)
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

## 2. 현재 상태 (As-Is) — 2026-04-18 기준
- [x] `src/common/ErrorBoundary.jsx` **존재** (클래스 컴포넌트, `:4-29`) — `task/done/2026/04/18/20260418-error-boundary-component/` 에서 추가 완료.
- [ ] `src/common/Skeleton.jsx` **부재**
- [ ] `src/common/ErrorFallback.jsx` **부재**
- [ ] `src/App.jsx:80` 의 최상위 Suspense fallback 이 여전히 `<Suspense fallback={<div></div>}>` — 빈 div.
- [ ] `src/App.jsx` 어디에도 ErrorBoundary import/사용 없음 (`grep -rn ErrorBoundary src/App.jsx src/index.jsx` → 0 hits) → 트리 에러 시 white screen 위험 미해소.
- FRAMEWORK_DESIGN.md 의 Suspense + ErrorBoundary 기본 패턴 — 부분 구현.

> 관련 요구사항: REQ-20260418-005 §2 배경, §3.1 In-Scope (Skeleton/ErrorFallback/App.jsx 통합)

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

### 3.2 `src/common/Skeleton.jsx` — **[WIP]** REQ-20260418-005
> 관련 요구사항: REQ-20260418-005 FR-01
- 라우트별 lazy 로딩 시 표시할 스켈레톤 UI
- Props:
  | 이름 | 타입 | 필수 | 설명 |
  |------|------|------|------|
  | `variant` | `'page' \| 'list' \| 'detail'` | N (기본 `page`) | 레이아웃 종류 |
- 시각적 충격 최소화 — 본문이 들어올 위치를 회색 블록으로 미리 보여줌

### 3.3 `src/common/ErrorFallback.jsx` — **[WIP]** REQ-20260418-005
> 관련 요구사항: REQ-20260418-005 FR-02
- 기본 에러 표시 UI (ErrorBoundary 의 기본 fallback)
- Props:
  | 이름 | 타입 | 필수 | 설명 |
  |------|------|------|------|
  | `error` | `Error` | Y | 에러 객체 |
  | `reset` | `() => void` | N | 재시도 콜백 |
- 네트워크 에러(`error.name === 'NetworkError'` 또는 fetch 실패) 와 렌더 에러를 구분 표시
  - 네트워크: "연결을 확인하고 다시 시도하세요" + reset 버튼
  - 렌더: "예기치 않은 오류가 발생했습니다" + 새로고침 안내 + reset 버튼

## 4. 적용 (App.jsx 통합) — **[WIP]** REQ-20260418-005
> 관련 요구사항: REQ-20260418-005 FR-03, FR-04, FR-05

### 4.1 최상위 Suspense — [WIP] FR-03
```jsx
<Suspense fallback={<Skeleton variant="page" />}>
  ...
</Suspense>
```
기존 `<div></div>` fallback 제거.

### 4.2 라우트 단위 Error Boundary — [WIP] FR-04
각 라우트 컴포넌트(또는 라우트 그룹)를 ErrorBoundary 로 래핑:
```jsx
<ErrorBoundary fallback={(props) => <ErrorFallback {...props} />} onError={reportError}>
  <Suspense fallback={<Skeleton />}>
    <RouteComponent />
  </Suspense>
</ErrorBoundary>
```
적용 대상: `src/App.jsx:82-88` 의 5개 lazy 라우트(`Log`, `File`, `Monitor`, `PageNotFound`, `Footer`). 라우트 단위 vs 라우트 그룹 단위는 planner 결정 (REQ-20260418-005 §13 미결).

### 4.3 reportError 훅 — [WIP] FR-05
- `src/common/errorReporter.js` (선택 위치) — `reportError(error, errorInfo)` 인터페이스만 정의
- 본 단계 구현은 `console.error` 로 위임. 실제 Sentry 연결은 별 spec.

### 4.3.1 [WIP] reporter 호출부 매트릭스 — Monitor 도메인 sweep (REQ-20260419-004)

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

**수용 기준 (REQ-20260419-004 §10)**:
- [ ] FR-01 ~ FR-09 모두 충족
- [ ] `grep -rn "console\.error" src/Monitor/ | grep -v "\.test\.jsx"` → **0 hits**
- [ ] `grep -rn "reportError" src/Monitor/` → **≥7 hits** (호출) + **≥4 hits** (import, 파일당 1회)
- [ ] 4 파일 상단에 `import { reportError } from '../common/errorReporter';` 존재
- [ ] `npm test` 전부 PASS, 커버리지 ±0.5pp
- [ ] 테스트 spy 가 `reportError` 로 갱신 (4 Monitor 테스트 파일)
- [ ] `errorReporter.reportError` 시그니처 변경 없음
- [ ] 번들 영향 ≤ +0.5KB gzip (import 1개 추가, 호출부 동등) — NFR-05
- [ ] reporter 정책 변경 영향 파일 수: 1 (`errorReporter.js`) — NFR-02
- [ ] Monitor 도메인 fetch 실패 reporter 도달률: 100% (NFR-01)
- [ ] `npm run lint` / `npm run build` 회귀 0

**범위 밖**:
- Sentry / DataDog 등 외부 reporter wiring — 별 spec (§4.3 forward placeholder 유지).
- `console.log` (디버깅용) 일반 sweep — Monitor 도메인의 fetch error 분기에 한정.
- `console.error` 가 테스트 spy 로 사용되는 코드(`*.test.jsx`) — FR-07 의 spy 갱신만 대상, 직접 호출 교체 아님.
- error 메시지 포맷/카테고리 표준화 — 별 spec.
- 다른 도메인(`Log`, `Comment`, `File`, `Image`, `Search`) 의 `console.error` 직접 호출 — 별 후속 후보 (§13 미결 이슈).
- `reportError(err, { source, data })` 메타 첨부 형태 채택 — planner 결정 또는 별 spec.

### 4.4 통합 회귀 테스트 — [WIP] FR-06
- 의도 throw 컴포넌트로 fallback 표시 확인 (라우트 격리)
- Navigation/Footer 가 라우트 에러에 영향받지 않는지 검증

## 5. 의존성

### 5.1 내부 의존
- `src/App.jsx` — 통합 지점

### 5.2 외부 의존
- 패키지: 없음 (React 표준 Error Boundary)
- 선택 패키지: `react-error-boundary` 도입 검토 가능 (단, 본 spec 은 자체 구현 전제)

## 6. 수용 기준 (Acceptance)
- [x] ErrorBoundary 클래스 컴포넌트 구현 (`task/done/.../20260418-error-boundary-component/`)
- [ ] [WIP] 의도적으로 에러 throw 시 ErrorFallback UI 표시 확인 (REQ-005 FR-06)
- [ ] [WIP] Lazy 컴포넌트 로딩 중 Skeleton 노출 (REQ-005 FR-03)
- [ ] [WIP] 네트워크 에러와 렌더 에러 구분 표시 확인 (REQ-005 FR-02, US-03)
- [ ] [WIP] 기존 기능 회귀 없음 (REQ-005 FR-07)
- [ ] [WIP] reset 버튼으로 트리 복구 가능
- [ ] [WIP] `grep -rn "<ErrorBoundary" src/` ≥ 1 (REQ-005 §11 성공 지표)
- [ ] [WIP] `<Suspense fallback={<div></div>}>` 잔존 0 (REQ-005 §11)

## 7. 알려진 제약 / 이슈
- React 의 Error Boundary 는 **이벤트 핸들러 / 비동기 코드 / SSR 의 에러를 잡지 못함** — 호출부에서 try/catch 또는 Promise.catch 필요
- React 19 의 변화된 에러 핸들링과 호환성 검증 필요 (별 spec 의존)
- **테스트 stderr 노이즈** (jsdom 29 + React 18) — `ErrorBoundary.test.jsx` 실행 시 `vi.spyOn(console, 'error')` 로 mock 해도 jsdom 의 `callTheUserObjectsOperation` 경로가 에러 스택을 직접 `process.stderr` 로 6회 출력. 테스트 PASS 4/4 지만 CI 로그에 무해 트레이스가 섞여 진짜 실패와 구분 어려움.
  > 관련 요구사항: REQ-20260418-007 (`20260418-errorboundary-test-stderr-suppression.md`)

## 7.1 [WIP] 테스트 stderr 억제 — REQ-20260418-007
> 관련 요구사항: REQ-20260418-007 §3.1 In-Scope, FR-01~04

- 대상 파일: `src/common/ErrorBoundary.test.jsx` (또는 `src/setupTests.js` 파일 scope)
- 채택 후보 (planner 결정, REQ-007 §13 미결):
  - (a) `vi.spyOn(console, 'error').mockImplementation(() => {})` 를 `beforeAll` 로 이동 + `afterAll` restore — 가장 작은 변경, 우선 권장
  - (b) `setupFiles` 에서 globalThis 레벨 적용 — 다른 테스트 영향 위험 (NFR-02)
  - (c) `vi.spyOn(process.stderr, 'write')` mock 으로 jsdom 우회 경로까지 차단 (Could)
- 제약: **파일 scope** 으로 한정해 다른 테스트의 진짜 console.error 캡처를 sink 시키지 않음 (FR-02).
- 검증:
  - `npx vitest run src/common/ErrorBoundary.test.jsx 2>&1 | grep -c "Error: boom"` → `0`
  - 전체 스위트 PASS 수 변동 없음 (현재 185, NFR-02)
- 후속 영향: REQ-20260418-005 의 통합 테스트도 동일 패턴을 채택해 노이즈 0 유지.

## 7.2 [WIP] 런타임 수동 스모크 체크리스트 cross-link (REQ-20260418-037)

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
- [ ] `docs/testing/error-boundary-runtime-smoke.md` 존재 (REQ-037 FR-01)
- [ ] 5 픽스처 커버 (Skeleton / ErrorFallback / 이웃 라우트 / Reset / reportError)
- [ ] 자매 체크리스트와 형식 동등 (`## Pre-conditions` / `## Golden Path Checklist` / `## Failure Notes`)
- [ ] (Should) 운영자 1회 baseline 박제
- [ ] (Should) REQ-012 (React 19 bump) 머지 후 2회 baseline (회귀 0)

**범위 밖**: Sentry 연결, Playwright, React 19 동작 변경 검증, Suspense Query — 각 별 트랙 / 별 REQ.

## 8. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | TSK-20260418-02 | Error Boundary 클래스 컴포넌트 추가 (완료) | 3.1 |
| 2026-04-18 | (pending, REQ-20260418-005) | Skeleton/ErrorFallback + App.jsx 통합 (WIP) | 3.2, 3.3, 4 |
| 2026-04-18 | (pending, REQ-20260418-007) | ErrorBoundary 테스트 stderr 노이즈 억제 (WIP) | 7, 7.1 |
| 2026-04-18 | (pending, REQ-20260418-037) | 런타임 수동 스모크 체크리스트 cross-link §7.2 신설 (post-merge-visual-smoke-spec §3.C.3 참조, `docs/testing/error-boundary-runtime-smoke.md` 신설) (WIP) | 7.2 |
| 2026-04-19 | (pending, REQ-20260419-004) | Monitor 도메인 `console.error` → `reportError` 일원화 sweep §4.3.1 신설 — 7 호출부 식별자 매트릭스, 호출 시그니처 매핑 정책 단순 형태 권장, 테스트 spy 갱신 가이드, Sentry wiring 전제 조건 (WIP) | 4.3.1 |

## 9. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260417-add-error-boundaries.md` (원 묶음)
  - `specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md` (통합 잔여)
  - `specs/requirements/done/2026/04/18/20260418-errorboundary-test-stderr-suppression.md` (테스트 노이즈)
- 관련 spec: `specs/spec/green/build/react-version-spec.md` (React 19 호환)
- 직전 태스크: `specs/task/done/2026/04/18/20260418-error-boundary-component/`
- 관련 followup: `specs/followups/consumed/2026/04/18/20260418-0554-error-boundary-test-log-noise.md`
- 외부 참고: vitest spy/setup https://vitest.dev/api/vi.html#vi-spyon
