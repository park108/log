# common 모듈 (공용 유틸 / UI / 훅)

> **위치**: `src/common/` (common.js, env.js, env.d.ts, a11y.js, codeHighlighter.js, markdownParser.js, sanitizeHtml.js, errorReporter.js, useHoverPopup.js, ErrorBoundary.jsx, ErrorFallback.jsx, Footer.jsx, Navigation.jsx, PageNotFound.jsx, Skeleton.jsx, UserLogin.jsx, ErrorFallback.css, Skeleton.css, + 대응 `.test.*`)
> **관련 요구사항**: — (as-is 서술 spec)
> **최종 업데이트**: 2026-04-20 (by operator, as-is snapshot)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
전 페이지에서 공유되는 유틸리티 · UI 셸 · 훅 · 타입 정의 집합. 인증/쿠키, 날짜·시간·크기 포맷, 로깅, URL/환경 스위치, 마크다운/코드 하이라이트/HTML 살균, 접근성 헬퍼, 에러 바운더리, 네비게이션·푸터·스켈레톤·페이지 낫파운드·로그인, hover 팝업 훅을 제공한다. React 런타임 환경 분기는 `env.js` (`import.meta.env.DEV/PROD/MODE`) 를, 레거시 문자열 분기는 `process.env.NODE_ENV` 를 통해 수행 (REQ-20260418-002 기반으로 env 일원화 진행 중 — `common.js` 의 일부 잔여 분기 존재).

## 공개 인터페이스

### 유틸 (`common.js`)
- `setHtmlTitle(title)`, `setMetaDescription(desc)`.
- `hasValue(obj)` — undefined/null/문자열 "undefined"/"null"/빈문자열/0 거부.
- `log(text, type)` — dev only. type ∈ INFO/SUCCESS/ERROR.
- `parseJwt(token)` — 실패 시 null (REQ-20260418-032 FR-01).
- `getUrl()` — production vs development 기준 URL.
- `getCookie`, `setCookie`, `deleteCookie`.
- `auth()` — URL fragment `#id_token=` + query `access_token` 을 쿠키로 흡수.
- `isLoggedIn()`, `isAdmin()` — `parseJwt` null 시 비-admin (REQ-20260418-032 FR-02).
- `convertToHTML`, `decodeHTML`.
- `getFormattedDate(ts, format?)`, `getFormattedTime(ts)`, `getWeekday(ts)`, `getFormattedSize(bytes)`.
- `confirm(message, onConfirm, onCancel)` — `window.confirm` 래퍼 팩토리.
- `isMobile()` — `navigator.maxTouchPoints > 0`.
- `setFullscreen(bool)` — `#root` class 토글.
- `userAgentParser()`.
- `hoverPopup(e, popupId)` — **legacy**. 신규 코드는 `useHoverPopup` 사용 권장.
- `copyToClipboard(text)` — `navigator.clipboard.writeText` 래퍼. 성공 `true` / 실패·미지원 `false`.

### env (`env.js`, `env.d.ts`)
- `isDev()`, `isProd()`, `mode()` — `import.meta.env` 단일 경유. tree-shake 가능.

### a11y (`a11y.js`)
- `activateOnKey(handler)` — Enter/Space 에 `preventDefault` + handler 호출. 패턴 B 공통 헬퍼.

### 에러 처리
- `ErrorBoundary.jsx` — `fallback(props)` 렌더 prop + `onError(err, info)` 콜백. `App.jsx` 라우트 레벨에서 `reportError` 주입.
- `ErrorFallback.jsx` — 기본 폴백 UI. CSS `ErrorFallback.css`.
- `errorReporter.js` — `reportError(error, errorInfo)` 를 `console.error` 로 위임 (추후 Sentry 연동 spec 분리).

### 마크다운/HTML
- `markdownParser.js` — 입력 마크다운 → HTML 변환.
- `sanitizeHtml.js` — DOMPurify 기반 살균.
- `codeHighlighter.js` — 코드 블록 구문 강조.

### UI 셸
- `Navigation.jsx` — 상단 네비게이션. `SearchInput` 마운트 지점.
- `Footer.jsx` — 하단 푸터.
- `Skeleton.jsx` — `variant` 별 로딩 스켈레톤. `Skeleton.css`.
- `PageNotFound.jsx` — 404 셸.
- `UserLogin.jsx` — 로그인 UI (Cognito Hosted UI 연동).

### 훅
- `useHoverPopup({ closeOnEscape? })` — REQ-20260420-001 FR-01/04/05 선언적 팝업. 반환: `triggerProps`, `contentProps`, `isVisible`, `id`. Touch (`onTouchStart`), Focus/Blur, Escape 닫힘 포함.

## 동작
- `auth()` 는 URL 에서 토큰 추출 후 보안 쿠키로 기록. `App.jsx` 마운트 시 1회 호출.
- `isAdmin()` 은 `isLoggedIn()` + `parseJwt` + 환경별 고정 userId 비교. 손상 토큰은 null → 비-admin 귀결.
- `log()` 는 `process.env.NODE_ENV === 'development'` 에서만 `console.log` 출력 — 프로덕션 빌드에서는 무해.
- `copyToClipboard()` 실패 경로는 false 반환 + ERROR 로그. 호출부는 Toaster 로 사용자 피드백.
- `useHoverPopup` 은 `HIDE_DELAY_MS=100` 로 hide 지연을 두어 hover drift 를 흡수.

### 회귀 중점
- `parseJwt` 의 null sentinel 경로가 admin 판정, App 마운트 throw 차단에 직접 기여.
- `isMobile` 의 `navigator.maxTouchPoints` 판정이 데스크탑 Safari/Chrome 에서 0 유지.
- `setFullscreen` 의 `#root` class 토글이 Monitor unmount 시 cleanup 짝이 맞는지.
- `copyToClipboard` 가 `navigator.clipboard?.writeText` 가드로 미지원 브라우저에서도 throw 하지 않음.

## 의존성
- 외부: `react`, `prop-types`, `dompurify`, `marked` 또는 상응 마크다운 파서, `highlight.js` 또는 상응 (구현 파일 기준).
- 내부: 서로 간 참조는 단방향 (공용은 상위로 역의존 없음).
- 역의존: 거의 전 컴포넌트가 `common/common` · `env` · `a11y` · `Navigation` · `ErrorBoundary` · `Skeleton` 등을 사용.

## 테스트 현황
- [x] `common.test.js` — 포맷 유틸, `parseJwt`, `isAdmin` 분기, 쿠키, `copyToClipboard` 성공/실패 경로.
- [x] `env.test.js` — `import.meta.env` 스위치.
- [x] `a11y.test.js`, `codeHighlighter.test.js`, `markdownParser.test.js`, `sanitizeHtml.test.js`.
- [x] `ErrorBoundary.test.jsx`, `ErrorFallback.test.jsx`, `Navigation.test.jsx`, `Skeleton.test.jsx`, `UserLogin.test.jsx`.
- [x] `useHoverPopup.test.jsx` — Enter/Blur/Touch/Escape 분기.
- [x] `errorReporter.test.js` — `console.error` 위임.

## 수용 기준 (현재 상태)
- [x] (Must) `parseJwt` 는 손상 입력에 null 반환, `isAdmin` 은 그 경로에서 false 귀결.
- [x] (Must) `auth()` 는 URL 토큰 존재 시에만 쿠키를 설정 (secure, site 옵션).
- [x] (Must) `log()` 는 production 빌드에서 노출되지 않는다 (`process.env.NODE_ENV==='development'` 가드).
- [x] (Must) `ErrorBoundary` 는 `fallback(props)` 렌더 prop 과 `onError` 콜백 계약을 지킨다.
- [x] (Must) `copyToClipboard` 는 미지원/거부 상황에서 throw 대신 false 반환 + ERROR 로그.
- [x] (Should) `useHoverPopup` 은 Escape 키로 닫히고, 터치 이벤트를 hover 대체로 수용.
- [x] (Should) `a11y.activateOnKey` 는 `<input>`/`<textarea>` 에서 사용 금지 (호출부 책임; 문서화됨).
- [x] (NFR) `env.js` 경로는 Vite 가 빌드 타임 리터럴로 치환 가능해 dead-code 제거 대상이 된다.
- [x] (NFR) React 19 deprecated API (`findDOMNode`, 문자열 ref, `defaultProps` on functional component 등) 미사용.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
