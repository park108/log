# 컴포넌트 명세: App

> **위치**: `src/App.jsx`
> **유형**: Root Container / Routing Shell
> **최종 업데이트**: 2026-04-20 (by inspector, drift reconcile — REQ-009 useEffect 격리 + REQ-025 auth 멱등 등가성 자동 테스트 완료 ACK)
> **상태**: Active (사이드이펙트 useEffect 격리 완료 / ErrorBoundary 통합 완료 / auth() 멱등 등가성 자동 테스트 완료 / 운영자 수동 스모크 baseline 잔여)
> **관련 요구사항**:
> - REQ-20260418-009 (`specs/requirements/done/2026/04/18/20260418-app-render-side-effects-cleanup.md`)
> - REQ-20260418-005 (`specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md`) — App.jsx 통합 (참조)
> - REQ-20260418-025 (`specs/requirements/done/2026/04/18/20260418-app-shell-side-effects-runtime-smoke-and-auth-idempotency.md`) — App 셸 런타임 스모크 + `auth()` 멱등 등가성 자동 테스트 (WIP)

> 본 문서는 컴포넌트의 **현재 구현 상태 + 진행 중 변경 계획(WIP)** 을 기술하는 SSoT.
> WIP 항목은 `[WIP]` 또는 `> 관련 요구사항:` 헤더로 표시.

---

## 1. 역할 (Role & Responsibility)
앱 최상위 컨테이너. 라우팅 셸을 구성하고 viewport / 온라인 상태 / 인증 콜백 같은 글로벌 사이드이펙트를 마운트 시점에 부트스트랩한다.

- 주 책임:
  - `BrowserRouter` + lazy 라우트 트리 (`Log`, `File`, `Monitor`, `PageNotFound`, `Footer`, `Navigation`)
  - viewport 변경에 따른 main 영역 minHeight 갱신
  - 온라인/오프라인 분기 렌더
  - Cognito 콜백 URL fragment 처리 (`common.auth()`)
- 의도적으로 하지 않는 것:
  - 도메인 데이터 fetch (각 라우트 컴포넌트 책임)
  - 인증 토큰 직접 파싱/저장 (`common.auth()` / `common.parseJwt` 책임)
  - 라우트 단위 로딩 UI / 에러 격리 — REQ-20260418-005 (`error-boundary-spec.md` §4) 참조

## 2. 공개 인터페이스 (Public Interface)

### 2.1 Props / Arguments
없음 (root)

### 2.2 이벤트 / 콜백
없음

### 2.3 Exports
- default: `App`

### 2.4 라우트
| path | element | lazy |
|------|---------|------|
| `/` | Navigate → `/log` | - |
| `/log/*` | `Log` | Y |
| `/file` | `File` | Y |
| `/monitor` | `Monitor` | Y |
| `*` | `PageNotFound` | Y (간접) |

## 3. 내부 상태 (Internal State)
| 상태 | 타입 | 초기값 | 변경 트리거 |
|------|------|--------|-------------|
| `contentHeight` | `{ minHeight: string }` | `undefined` | `handleOnresize()` (resize 또는 초기 마운트) |
| `isOnline` | `boolean` | `navigator.onLine` | `online`/`offline` 이벤트 |

## 4. 의존성 (Dependencies)

### 4.1 내부 의존
- `src/common/common.js` — `getUrl`, `auth`
- `src/common/Navigation.jsx`, `src/common/Footer.jsx`, `src/common/PageNotFound.jsx` — 셸 부속
- 라우트: `src/Log/Log.jsx`, `src/File/File.jsx`, `src/Monitor/Monitor.jsx`

### 4.2 외부 의존
- 패키지: `react`, `react-router-dom@7`
- 브라우저 API: `window.innerHeight`, `window.onresize` / `addEventListener('resize')`, `navigator.onLine`, `online`/`offline` 이벤트

### 4.3 역의존 (사용처)
- `src/index.jsx` — `<React.StrictMode><App/></React.StrictMode>` 마운트

## 5. 동작 (Current Behavior)

### 5.1 As-Is — 사이드이펙트 useEffect 격리 완료 (TSK-20260418-16, commit `b07cbf5`)
> 관련 요구사항: REQ-20260418-009 §2 배경

**이전 결함 (2026-04-18 관측)**: 렌더 본문에 `window.onresize = handleOnresize;` + `common.auth();` 직접 대입/호출 → StrictMode 더블 마운트 시 side effect 중복.

**2026-04-20 현재 (src/App.jsx:39-50)**: useEffect 격리 완료 — §5.2 형태로 구현. drift reconcile.

### 5.2 완료 — useEffect 격리 (REQ-20260418-009)
> 관련 요구사항: REQ-20260418-009 FR-01, FR-02, FR-03

**구현 (src/App.jsx:39-50, commit `b07cbf5`, task `20260418-app-render-side-effects-useeffect`)**:
```jsx
// resize listener (FR-01, FR-02) — src/App.jsx:39-45
useEffect(() => {
  const handler = () => handleOnresize();
  window.addEventListener('resize', handler);
  handler(); // 초기 1회 (기존 initial-size useEffect 통합)
  return () => window.removeEventListener('resize', handler);
}, []);

// auth (FR-03) — src/App.jsx:46-48
useEffect(() => {
  common.auth();
}, []);
```

**핵심 (달성)**:
- 함수 본문에 사이드이펙트 0건 — `window.onresize=` / `common.auth()` 직접 호출 제거.
- cleanup 으로 listener 누수 방지 (NFR-01) — `removeEventListener` 동봉.
- StrictMode 더블 effect 시에도 idempotent (NFR-02) — REQ-20260418-025 `auth() idempotent cookie result` 자동 테스트 PASS (commit `b5b2ae5`, §5.2.1 참조).
- 기존 initial-size useEffect 는 새 listener useEffect 의 `handler()` 초기 1회 호출로 통합됨 (REQ-009 §13 결정).

### 5.2.1 `auth()` 멱등 결과 등가성 자동 검증 — 완료 (REQ-20260418-025)
> 관련 요구사항: REQ-20260418-025 FR-01, FR-02, US-01

**완료 (2026-04-20 drift reconcile)**: `common.auth()` idempotent cookie 등가성 자동 테스트 1건이 `src/common/common.test.js` 에 `'auth() idempotent cookie result'` describe 블록(line 107-159) 으로 추가됨 — commit `b5b2ae5`, task `20260418-auth-cookie-idempotent-equivalence-test`. 1회 호출 후 cookie 와 2회 호출 후 cookie 가 동등함을 어서트 (`expect(cookieAfter1).toBe(cookieAfter2)`). StrictMode 이중 마운트 시점의 cookie 상태 회귀 차단 완료.

**테스트 패턴 (FR-01, FR-02)**:
```js
// src/common/common.test.js 신규 케이스 (예시)
describe('auth() idempotent cookie result', () => {
  beforeEach(() => {
    // URL fragment stub
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/#id_token=X&access_token=Y'),
      writable: true,
    });
    document.cookie.split(';').forEach((c) => { /* clear */ });
  });

  it('returns equivalent document.cookie after 1 or 2 calls', () => {
    auth();
    const cookieAfter1 = document.cookie;
    auth();
    const cookieAfter2 = document.cookie;
    expect(cookieAfter1).toBe(cookieAfter2);
  });
});
```

**StrictMode 이중 마운트 어서트 (FR-02, Should)**:
- `App.test.jsx` 의 기존 `'render body has no direct side effects'` describe 블록에 `authSpy.mock.calls.length === 2` 인 경우 cookie 결과가 1회 마운트 시점과 동등한지 비교 어서트 추가.

**jsdom 한계 완화 메모**:
- `document.cookie` 의 `secure` / `site` 속성은 jsdom 에서 부분만 반영 가능 → 비교를 cookie **본체 (`name=value`)** 문자열 또는 파싱된 객체 기준으로 제한. 사유 코멘트 inline 기록.

### 5.3 ErrorBoundary + Skeleton 통합 — 완료 (REQ-20260418-005)
> 관련 요구사항: REQ-20260418-005 FR-03, FR-04 (상세는 `error-boundary-spec.md` §4)

**완료 (2026-04-20 drift reconcile)**: `src/App.jsx:92` 의 최상위 Suspense fallback 이 `<Skeleton variant="page" />` 로 전환 완료. 3 lazy 라우트(`/log/*`, `/file/*`, `/monitor/*`)가 `<ErrorBoundary fallback={(p) => <ErrorFallback {...p} />} onError={reportError}>` 패턴으로 래핑 완료 (src/App.jsx:97-118). 라우트 단위 래핑 채택 (Navigation / Footer 는 최상위 Suspense 경로). 상세 매트릭스는 `error-boundary-spec.md` §4.1~§4.3 및 §6 수용 기준에 박제.

```jsx
// src/App.jsx:92-118 (현재 구현)
<Suspense fallback={<Skeleton variant="page" />}>
  <Navigation />
  <Routes>
    <Route path="/log/*" element={
      <ErrorBoundary fallback={(p) => <ErrorFallback {...p} />} onError={reportError}>
        <Log contentHeight={contentHeight} />
      </ErrorBoundary>
    } />
    {/* File / Monitor 동일 패턴 */}
    <Route path="*" element={pageNotFound} />
  </Routes>
  <Footer />
</Suspense>
```

### 5.4 에러 / 엣지 케이스
- 오프라인(`!isOnline`): Navigation 만 있는 축약 트리 렌더 — 기존 동작 유지.
- `setContentHeight` 첫 마운트 전: inline style `undefined` → React 가 무시.

## 6. 데이터 스키마 (Data Shape)
N/A.

## 7. 테스트 현황 (Current Coverage)
- 테스트 파일: `src/App.test.jsx`, `src/common/common.test.js`
- 커버된 시나리오:
  - [x] 기본 렌더, 온라인/오프라인 분기
  - [x] `authSpy.mock.calls.length >= 1` 호출 카운트 어서트 (TSK-16)
- 미커버 / [WIP]:
  - [x] resize 핸들러 cleanup (mount/unmount 시 listener 카운트) — REQ-009 NFR-01: `return () => window.removeEventListener('resize', handler)` cleanup 구현 (commit `b07cbf5`, src/App.jsx:44)
  - [x] StrictMode 더블 마운트 시 `auth()` idempotent 검증 — REQ-009 FR-05: `useEffect(() => { common.auth(); }, [])` (commit `b07cbf5`)
  - [x] `auth()` 결과 등가성 (`cookieAfter1 === cookieAfter2`) 자동 테스트 1건 — REQ-20260418-025 FR-01: commit `b5b2ae5` (`common.test.js` `'auth() idempotent cookie result'` describe)
  - [~] App.test StrictMode 이중 마운트 시 cookie 등가성 어서트 (Should) — REQ-20260418-025 FR-02: `common.test.js` 단에서 등가성 PASS 달성; App.test.jsx 추가 어서트는 Should, 별 라운드
  **[deferred: REQ-20260418-025 FR-03~07 운영자 수동 baseline 대기 — 선행으로 `docs/testing/app-shell-side-effects-smoke.md` 체크리스트 신설 task 필요 (2026-04-20 현재 파일 부재). 본 항목은 `testing/app-shell-side-effects-smoke-spec.md` 소비 아티팩트, 문서 신설 후 operator 수행. planner 는 본 unchecked 를 승격 게이트 계산에서 제외.]**
  - [ ] [WIP] 운영자 수동 스모크 baseline 4 시나리오 (`docs/testing/app-shell-side-effects-smoke.md`) — REQ-20260418-025 FR-03~07: 체크리스트 문서 아직 부재, 운영자 영역
  - [x] ErrorBoundary 적용 후 라우트 격리 회귀 테스트 — REQ-005 FR-06: `src/App.test.jsx:250` "white-screen regression guard" 테스트 + `ErrorBoundary.test.jsx` 4/4 PASS (상세는 `error-boundary-spec.md` §6)

## 8. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 신뢰성 | listener cleanup 구현 (commit `b07cbf5`) | 마운트 N회 시 unmount 후 listener=0 | REQ-009 NFR-01 — 달성 |
| 호환성 | idempotent 자동 어서트 PASS (commit `b5b2ae5`) | 더블 마운트 = 1회분과 동등 (idempotent) | REQ-009 NFR-02 + REQ-025 FR-01 — 달성 |
| 유지보수성 | 본문 사이드이펙트 0건 (commit `b07cbf5`) | 본문 0건, useEffect 안 모두 | REQ-009 NFR-03 — 달성 |
| 성능 | re-render 시 listener 재등록 없음 (deps `[]`) | re-render 시 listener 재등록 없음 | REQ-009 NFR-04 — 달성 |
| 신뢰성(렌더 격리) | 라우트 단위 ErrorBoundary 적용 완료 (src/App.jsx:97-118) | 라우트 단위 ErrorBoundary | REQ-005 NFR-01 — 달성 (상세: `error-boundary-spec.md`) |

## 9. 알려진 제약 / 이슈
- React 18.x 기반. React 19 전환은 별 spec.
- 기존 라우트 구조/컴포넌트 시그니처 유지 (REQ-009 §8 제약).
- `auth()` 의 location 변경마다 재호출 필요 여부는 미결 (REQ-009 §13). 현재는 마운트 1회 가정 — URL fragment 의 `id_token` 처리는 첫 진입에서만 의미.
- REQ-005(ErrorBoundary 통합) 와 REQ-009 가 같은 파일을 변경 → planner 가 PR 순서 제어 (REQ-009 §12 위험 4).

## 10. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-18 | (pending, REQ-20260418-009) | 렌더 본문 사이드이펙트 (`window.onresize=`, `common.auth()`) useEffect 격리 (WIP) | 5.1, 5.2, 7, 8 |
| 2026-04-18 | (pending, REQ-20260418-005) | Suspense fallback Skeleton + 라우트 단위 ErrorBoundary (WIP) | 5.3, 7, 8 |
| 2026-04-18 | (pending, REQ-20260418-025) | `auth()` 멱등 cookie 등가성 자동 테스트 + 수동 스모크 baseline 4 시나리오 (WIP) | 5.2.1, 7, 11 |
| 2026-04-18 | TSK-20260418-16 (merged, commit `b07cbf5`) | REQ-009 useEffect 격리 완료 — `window.onresize=` + `common.auth()` 렌더 본문 사이드이펙트 제거, `addEventListener('resize', handler)` + cleanup, `useEffect(() => common.auth(), [])` 마운트 1회 | 5.1, 5.2 |
| 2026-04-18 | TSK-20260418-auth-cookie-idempotent-equivalence-test (merged, commit `b5b2ae5`) | REQ-025 FR-01 `auth() idempotent cookie result` 자동 테스트 (`src/common/common.test.js`) — StrictMode 이중 마운트 cookie 등가성 어서트 | 5.2.1, 7 |
| 2026-04-18 | (REQ-20260418-005, merged) | Skeleton / ErrorFallback 신설 + App.jsx 최상위 Suspense fallback Skeleton 전환 + 3 라우트 ErrorBoundary 래핑 + reportError onError 훅 (상세는 `error-boundary-spec.md` §4) | 5.3, 7, 8 |
| 2026-04-20 | (inspector drift reconcile) | §5.1/5.2/5.2.1/5.3 "[WIP]" → "완료" ACK: REQ-009 useEffect 격리 (commit `b07cbf5`) + REQ-025 auth 멱등 등가성 자동 테스트 (commit `b5b2ae5`) + REQ-005 ErrorBoundary/Skeleton App.jsx 통합 (src/App.jsx:92-118). §7 체크박스 4 항목 [x] 전환 (resize cleanup / StrictMode idempotent / auth cookie 등가성 자동 / ErrorBoundary 라우트 격리). §8 NFR Status 5 행 "달성" 갱신. 잔여: §7 운영자 수동 스모크 baseline (`docs/testing/app-shell-side-effects-smoke.md` 체크리스트 문서 부재 + REQ-025 FR-03~07 operator). 커밋 영향: 본 spec 단독. | 5.1, 5.2, 5.2.1, 5.3, 7, 8 |
| 2026-04-20 | (inspector Phase 2 defer-tag) | §7 운영자 수동 스모크 baseline unchecked 1 건에 `[deferred: operator baseline + 선행 docs/testing/app-shell-side-effects-smoke.md 체크리스트 신설 task 대기]` 태깅 — REQ-025 FR-03~07 자동 테스트 영역 밖 operator. §7.1 "Should" App.test StrictMode cookie 등가성 어서트는 `[~]` 유지(active/carveable). 나머지 §1~6/§8/§9 모두 "완료" 또는 active 유지. planner 승격 게이트 계산은 본 unchecked deferred 제외로 본 spec 승격권 진입. 커밋 영향: 본 spec 단독. | 7, 10 |
| 2026-04-20 | (inspector Phase 1 drift reconcile) | §5.2 header rename: `### 5.2 To-Be → 완료 — useEffect 격리 (REQ-20260418-009)` → `### 5.2 완료 — useEffect 격리 (REQ-20260418-009)` — "To-Be → " 리터럴 제거 (planner §4 Cond-3 `^#+ .*To-Be` 매칭 해소). 헤더는 이미 "완료" 표기가 있었으므로 현재 상태와 일관 (TSK-20260418-16 merged, commit `b07cbf5`). 섹션 본문·구현 박제·REQ 참조 전부 유지, 헤더 문자열만 정리. 커밋 영향: 본 spec 단독. | 5.2, 10 |

## 11. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-app-render-side-effects-cleanup.md`
  - `specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md`
  - `specs/requirements/done/2026/04/18/20260418-app-shell-side-effects-runtime-smoke-and-auth-idempotency.md` (REQ-025)
- 관련 컴포넌트 명세:
  - `specs/spec/green/common/error-boundary-spec.md` §4 (App.jsx 통합 상세)
  - `specs/spec/green/build/react-version-spec.md` (React 19 전환 시 동시성 영향)
  - `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md` (App 셸 수동 스모크 체크리스트 정책, REQ-025 연계)
- 진행 중/예정 task: (planner 가 생성 예정)
- 외부 참고:
  - React StrictMode: https://react.dev/reference/react/StrictMode
  - You Might Not Need an Effect: https://react.dev/learn/you-might-not-need-an-effect
