# App 컴포넌트 (루트 셸 / 라우팅 / 온라인 감지)

> **위치**: `src/App.jsx`, `src/index.jsx`, `src/App.test.jsx`
> **관련 요구사항**: — (as-is 서술 spec, REQ 무관)
> **최종 업데이트**: 2026-04-20 (by operator, as-is snapshot)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
애플리케이션 루트 셸. `QueryClientProvider` 로 TanStack Query 컨텍스트를 감싸고, `BrowserRouter` + `Routes` 로 `/log`, `/file`, `/monitor`, `*` 경로를 분기한다. `window` online/offline 이벤트를 구독해 오프라인 시 대체 UI 를 그리고, `resize` 이벤트로 `main` 최소 높이를 계산해 하위 페이지로 전달한다. 마운트 시 1회 `common.auth()` 를 실행해 URL fragment/query 의 `access_token` · `id_token` 을 쿠키로 흡수한다.

## 공개 인터페이스
- 컴포넌트: `App` (default export, props 없음).
- 엔트리 부트: `src/index.jsx:8` — `ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)`.
- 상태 설정자:
  - `setContentHeight({ minHeight: <px> })` — `window.innerHeight - 57 - 80`. 하위 `<main>` 의 `style` 로 전달.
  - `setIsOnline(navigator.onLine)` — `online` / `offline` 이벤트 리스너가 토글.
- 라우팅 매트릭스 (`src/App.jsx:94-120`):
  - `/` → `Navigate replace to="/log"`.
  - `/log/*` → `<Log contentHeight={...} />` (ErrorBoundary 래핑).
  - `/file` → `<File contentHeight={...} />` (ErrorBoundary 래핑).
  - `/monitor` → `<Monitor contentHeight={...} />` (ErrorBoundary 래핑).
  - `*` → `PageNotFound` (`<main>` 내).

## 동작
1. 마운트 시 `resize` 리스너 등록 → 핸들러를 즉시 1회 호출해 초기 `contentHeight` 계산. 언마운트 시 제거.
2. 마운트 시 `common.auth()` 1회 실행.
3. 마운트 시 `online` / `offline` 리스너 등록 → `navigator.onLine` 변화에 `isOnline` 동기화.
4. `isOnline=false` 분기: `BrowserRouter` 를 렌더링하지 않고 고정 오프라인 안내 셸 (`<nav>` + `<main>` 2종 메시지) 을 그린다.
5. `isOnline=true` 분기: `BrowserRouter` + `Suspense(fallback=<Skeleton variant="page" />)` + `Navigation` + `Routes` + `Footer`.
6. `import.meta.env.DEV` 이면 `ReactQueryDevtools` 를 `initialIsOpen={false}` 로 렌더링.
7. 라우트별 페이지는 lazy 로드 (`Navigation`, `Log`, `File`, `Monitor`, `PageNotFound`, `Footer`).

### 회귀 중점
- StrictMode 하 effect double-invoke 하에서 `online` / `offline` 리스너 add/remove 가 누수 없이 짝이 맞는지 (`App.test.jsx` online/offline 스위트).
- `QueryClient` 기본값: `{ staleTime: 60_000, retry: 1 }` 의존하는 하위 페이지 캐시 동작.

## 의존성
- 외부: `react ^19.2.x`, `react-dom ^19.2.x`, `react-router-dom ^7.14.1`, `@tanstack/react-query`, `@tanstack/react-query-devtools`, `prop-types` (하위 컴포넌트만 사용).
- 내부: `common/common` (`auth`, `getUrl`), `common/ErrorBoundary`, `common/ErrorFallback`, `common/Skeleton`, `common/errorReporter` (`reportError`), `common/Navigation`, `common/Footer`, `common/PageNotFound`, `Log/Log`, `File/File`, `Monitor/Monitor`, `styles/index.css`.
- 역의존: 없음 (루트).

## 테스트 현황
- [x] `src/App.test.jsx` — 오프라인/온라인 토글, 라우트 매칭, ErrorBoundary 주입, `auth` 호출 검증, `resize` 1회 동기 호출 검증.
- [x] `src/index.jsx` 경로의 `reportWebVitals` / `sendBeacon` 부트는 `src/reportWebVitals.test.js` 에서 커버.

## 수용 기준 (현재 상태)
- [x] (Must) 기본 진입 `/` 접근 시 `/log` 로 `Navigate replace` 된다.
- [x] (Must) `navigator.onLine === false` 이면 라우터가 마운트되지 않고 오프라인 메시지가 노출된다.
- [x] (Must) 마운트 시 `common.auth()` 가 정확히 1회 호출된다 (StrictMode 환경의 React 19 기준).
- [x] (Must) `window.resize` 핸들러는 add/remove 짝이 맞고, 초기 1회 동기 호출로 `contentHeight` 를 세팅한다.
- [x] (Should) 라우트 `/log` · `/file` · `/monitor` 는 `ErrorBoundary(fallback=ErrorFallback, onError=reportError)` 로 감싸진다.
- [x] (Should) `import.meta.env.DEV` 조건에서만 `ReactQueryDevtools` 를 렌더링한다.
- [x] (Should) `Navigation` / `Footer` / 페이지들은 lazy 로드되며 `Suspense fallback` 이 `Skeleton variant="page"` 이다.
- [x] (NFR) 번들: 최상위 shell 유지, 하위 페이지는 code-split.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
