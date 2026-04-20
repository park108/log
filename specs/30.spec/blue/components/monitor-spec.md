# Monitor 컴포넌트 (관리자 대시보드)

> **위치**: `src/Monitor/` (Monitor.jsx, ContentMon.jsx, ContentItem.jsx, ApiCallMon.jsx, ApiCallItem.jsx, WebVitalsMon.jsx, WebVitalsItem.jsx, VisitorMon.jsx, api.js, api.mock.js, Monitor.css)
> **관련 요구사항**: — (as-is 서술 spec)
> **최종 업데이트**: 2026-04-20 (by operator, as-is snapshot)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
`/monitor` 페이지. 관리자 전용 지표 대시보드 셸. 마운트 시 `setHtmlTitle("monitor")`, `setFullscreen(true)` 를 실행하고, 언마운트 시 `setFullscreen(false)` 로 원복한다. 4개 패널을 순서대로 렌더: `ContentMon` (콘텐츠 통계), `ApiCallMon` (API 호출 히트맵), `WebVitalsMon` (CLS/FID/LCP/INP/FCP/TTFB), `VisitorMon` (방문자 추이). 각 패널은 lazy 로드되며 `Suspense` 로 감싸져 있다. 히트맵 색상은 모듈 상수 `CHART_PALLETS` (Red-to-Green / Olive) 를 패널별로 주입.

## 공개 인터페이스
- `Monitor` (default export).
  - props: `{ contentHeight?: object }`.
- 하위 패널 기본 export: `ContentMon`, `ApiCallMon`, `WebVitalsMon`, `VisitorMon`.
  - 모두 `{ stackPallet?: Array<{color, backgroundColor}> }` 를 받을 수 있으며, `WebVitalsMon` 만 props 없이 렌더.
- 하위 아이템 기본 export: `ContentItem`, `ApiCallItem`, `WebVitalsItem`.
- API 모듈 (`src/Monitor/api.js`): 패널별 GET 엔드포인트 (`getVisitors`, `getApiCalls`, `getContents`, `getWebVitals` 등 — 구현 파일 기준).

## 동작
1. 마운트 시 `isAdmin()=false` 이면 즉시 `/log` 로 리다이렉트하고 타이틀·fullscreen 설정을 스킵.
2. admin 이면 `setHtmlTitle("monitor")`, `setFullscreen(true)` 후 4개 패널을 렌더.
3. 언마운트 시 `setFullscreen(false)` 를 호출하여 루트 class 를 기본으로 복원.
4. `CHART_PALLETS[0]` (Red to Green) 은 `ApiCallMon` 에, `CHART_PALLETS[1]` (Olive) 은 `ContentMon` · `VisitorMon` 에 주입. `WebVitalsMon` 은 자체 색을 사용.
5. 각 패널은 내부적으로 자체 페치/집계/차트 렌더 루프 (CSS 그리드 + 숫자 타일) 를 보유.

### 회귀 중점
- 라우트 진입/이탈 시 `setFullscreen` 의 true→false 짝이 React 19 StrictMode 하에서 리스너 누수 없이 수행되는지.
- `navigate("/log")` 후에도 언마운트 cleanup 이 예상대로 동작 (fullscreen off).
- lazy 패널의 `Suspense fallback` 이 각 패널마다 독립되어, 느린 패널 하나가 전체를 막지 않음.

## 의존성
- 외부: `react`, `react-router-dom`, `prop-types`.
- 내부: `common/common` (`log`, `isAdmin`, `setFullscreen`, `setHtmlTitle`), `./ContentMon`, `./ApiCallMon`, `./WebVitalsMon`, `./VisitorMon`, `./api`, `Monitor.css`.
- 역의존: `App.jsx` 의 `/monitor` 라우트.

## 테스트 현황
- [x] `src/Monitor/Monitor.test.jsx` — non-admin 리다이렉트, fullscreen on/off, 4 패널 마운트.
- [x] 각 패널 / 아이템 `.test.jsx` (ApiCallMon/Item, ContentMon/Item, WebVitalsMon/Item, VisitorMon).
- [x] `src/Monitor/__fixtures__/` 지표 응답 박제.

## 수용 기준 (현재 상태)
- [x] (Must) non-admin 진입 시 `/log` 로 리다이렉트하고 fullscreen · title 미설정.
- [x] (Must) admin 진입 시 `setFullscreen(true)` 적용, 라우트 이탈 시 `setFullscreen(false)` 로 복원.
- [x] (Must) 4 패널 순서: ContentMon → ApiCallMon → WebVitalsMon → VisitorMon.
- [x] (Must) 각 패널은 독립 `Suspense fallback=<div/>` 로 감싼 lazy 로드.
- [x] (Should) 패널별 색 팔레트 주입은 `CHART_PALLETS` 모듈 상수에서 참조.
- [x] (NFR) 페이지 레이아웃은 `main--main-contents` + 상위 `<main style={contentHeight}>` 로 오프라인/온라인 공용 셸과 높이 계산 일관성 유지.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
