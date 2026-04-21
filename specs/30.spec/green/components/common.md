# common 모듈 (공용 유틸 / UI / 훅)

> **위치**: `src/common/` (common.js, env.js, env.d.ts, a11y.js, codeHighlighter.js, markdownParser.js, sanitizeHtml.js, errorReporter.js, useHoverPopup.js, ErrorBoundary.jsx, ErrorFallback.jsx, Footer.jsx, Navigation.jsx, PageNotFound.jsx, Skeleton.jsx, UserLogin.jsx, ErrorFallback.css, Skeleton.css, + 대응 `.test.*`)
> **관련 요구사항**: REQ-20260421-022, REQ-20260421-025, REQ-20260421-032
> **최종 업데이트**: 2026-04-21 (by inspector, REQ-032 admin-gate 잔존 결함 흡수 — auth() 토큰 추출 + 쿠키 지속 속성명 + env 미주입 회귀 계약)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=29d9da0).

## 역할
전 페이지에서 공유되는 유틸리티 · UI 셸 · 훅 · 타입 정의 집합. 인증/쿠키, 날짜·시간·크기 포맷, 로깅, URL/환경 스위치, 마크다운/코드 하이라이트/HTML 살균, 접근성 헬퍼, 에러 바운더리, 네비게이션·푸터·스켈레톤·페이지 낫파운드·로그인, hover 팝업 훅을 제공한다. React 런타임 환경 분기는 `env.js` (`import.meta.env.DEV/PROD/MODE`) 를 단일 진입점으로 하며, 런타임 소스에서 `process.env.NODE_ENV` 직접 참조는 제거 완료 — 런타임 0 hit (REQ-20260421-022 FR-07).

## 공개 인터페이스

### 유틸 (`common.js`)
- `setHtmlTitle(title)`, `setMetaDescription(desc)`.
- `hasValue(obj)` — undefined/null/문자열 "undefined"/"null"/빈문자열/0 거부.
- `log(text, type)` — dev only. type ∈ INFO/SUCCESS/ERROR.
- `parseJwt(token)` — 실패 시 null (REQ-20260418-032 FR-01).
- `getUrl()` — production vs development 기준 URL.
- `getCookie`, `setCookie`, `deleteCookie`.
- `auth()` — URL **해시 프래그먼트** (`#access_token=...&id_token=...&...`) 를 우선 파싱하여 `access_token` / `id_token` 을 추출하고, 부재 시 query string 경로로 fallback (하위 호환 보존). 추출된 토큰을 보안 쿠키로 흡수 (REQ-20260421-032 FR-01/03).
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

## 환경 분기 계약 (REQ-20260421-022)

- **단일 진입점 불변식**: 환경 분기의 단일 진입점은 `src/common/env.js` 의 `isDev()` / `isProd()` / `mode` 이다. 런타임 소스 (`src/**` except `*.test.*`, `src/test-utils/**`) 에서 `process.env.NODE_ENV` 직접 참조는 금지.
- **문자열 분기 잔여 제거 완료**: 과거 `common.js` 등에 있던 `process.env.NODE_ENV === 'development'` 류 문자열 분기는 `isDev()/isProd()` 로 치환 완료 — 런타임 0 hit 유지 (REQ-20260421-022 FR-07).
- **예외 허용 영역**: `*.test.*` 테스트 파일 및 `src/test-utils/**` 은 vitest 환경 구성 목적의 `process.env` 참조를 허용 (RULE-07 spec 본문 불변식은 런타임 소스 한정).

## admin gate 계약 (REQ-20260421-022)

### isAdmin() 6 케이스 매트릭스
| # | cookie | parseJwt | username | 환경 | 기대 반환 |
|---|--------|---------|----------|------|----------|
| 1 | 무 | — | — | any | `false` |
| 2 | 유 | `null` (손상) | — | any | `false` |
| 3 | 유 | ok | mismatch | any | `false` |
| 4 | 유 | ok | match | `isProd()` → `VITE_ADMIN_USER_ID_PROD` | `true` |
| 5 | 유 | ok | match | `isDev()` → `VITE_ADMIN_USER_ID_DEV` | `true` |
| 6 | 유 | ok | match | isProd·isDev 둘 다 `false` | `false` |

- **admin user ID 외부화 불변식**: admin user ID 는 `import.meta.env.VITE_ADMIN_USER_ID_PROD` / `VITE_ADMIN_USER_ID_DEV` 로 외부 주입한다. 두 값 모두 빈 문자열이면 `isAdmin()` 은 항상 `false` (6 매트릭스의 전 행이 빈 env 에서 `false` 로 귀결).
- **env 미주입 안전 기본값 (REQ-20260421-032 FR-08)**: `.env.*.local` 에 `VITE_ADMIN_USER_ID_PROD` / `VITE_ADMIN_USER_ID_DEV` 키 자체가 없을 때도 `isAdmin()` 은 항상 `false` 를 귀결한다 (`undefined || ''` → 빈 문자열 비교). 운영자가 env 주입을 누락하면 admin 기능은 영구 비활성화되며, 이는 보안상 안전한 기본값이다.
- **코드 위치**: `src/common/common.js` `isAdmin()` (현 HEAD 기준 `:155-179`).

## auth() 쿠키 속성 계약 (REQ-20260421-022 / REQ-20260421-025 / REQ-20260421-032)

### auth() 토큰 추출 계약 (REQ-20260421-032 FR-01/03)
`auth()` 는 Cognito Hosted UI 의 OAuth 2.0 implicit flow (`response_type=token`) 응답 형식 — 모든 토큰이 **URL 해시 프래그먼트** 단일 구역에 `&` 로 연결 (`https://<host>/#access_token=<v>&id_token=<v>&expires_in=<n>&token_type=Bearer`) — 을 1차 추출 경로로 한다. 다음 순서로 시도하고 처음 성공한 값을 채택한다:
1. `new URL(href).hash` 의 leading `#` 제거 후 `URLSearchParams` 로 파싱 → `.get('access_token')` / `.get('id_token')`.
2. (fallback) `new URL(href).searchParams.get('access_token')` / `.get('id_token')` — 기존 `?access_token=...#id_token=...` 혼합 형식 픽스처 호환을 위한 하위 호환 경로.
두 경로 모두 `null` 이면 쿠키는 설정되지 않는다 (안전 fallthrough). `id_token` 도 동일 이중 경로 (프래그먼트 우선) 로 추출하며, `indexOf('#id_token=')` + 수동 `substring` 패턴은 사용하지 않는다.

### setCookie 속성 불변식 (REQ-022 FR-04 / REQ-032 FR-04)
`setCookie(name, value, opts?)` 는 다음 속성 계약을 만족한다:
- `secure: true` — HTTPS only.
- `sameSite` — RFC 6265bis 유효값 `Strict | Lax | None` 중 하나.
- **지속 속성명 정합**: cookie string 직렬화 결과가 RFC 6265 §5.2.2 표준 속성명 `Max-Age` (대소문자 무관, 단 하이픈 필수) 또는 `Expires` 를 포함한다. camelCase 오타 (`maxAge=...`) 는 브라우저가 알 수 없는 속성으로 무시되어 쿠키가 세션 쿠키로 강등되므로 금지. `auth()` 가 박는 `access_token` / `id_token` 쿠키는 Cognito access_token TTL (기본 3600s) 과 정합하는 `Max-Age=3600` 직렬화를 보장한다.

### auth() SameSite 계약 (REQ-20260421-025 FR-01)
`auth()` 가 `setCookie` 로 박는 `access_token` / `id_token` 쿠키의 `SameSite` 속성은 RFC 6265bis 유효값 (`Strict` | `Lax` | `None`) 중 하나만 사용한다. 비표준값 (`'strict'` 소문자, `'false'`, 도메인 문자열 주입, 속성 누락 등) 은 금지.

### 회귀 방어 단위 테스트 계약 (REQ-20260421-025 FR-02 / REQ-20260421-032 FR-06/07/08)
`src/common/common.test.js` (또는 동급) 는 다음 어설션을 모두 포함한다:

**(a) SameSite — REQ-025 FR-02**
`auth()` 호출 후 `document.cookie` 문자열에 대해:
- positive: `/SameSite=(Strict|Lax|None)/` 정규식 1+ 매치.
- negative: `/SameSite=[a-z]|SameSite=false|SameSite=\"/` 0 매치 (비표준값 금지).

**(b) Cognito-실형 토큰 추출 — REQ-032 FR-06**
Cognito Hosted UI implicit flow 의 실제 redirect 형식 픽스처에 대해 `auth()` 호출 후 쿠키 추출 결과를 어서트한다:
- 케이스 A: `mock.href = 'https://<host>/#access_token=AAA&id_token=BBB&expires_in=3600&token_type=Bearer'` → `getCookie('access_token') === 'AAA'` + `getCookie('id_token') === 'BBB'`.
- 케이스 B: `mock.href = 'https://<host>/#access_token=AAA&id_token=BBB'` (trailing 파라미터 없음) → 동일 어설션.
기존 `?access_token=...#id_token=...` 혼합 형식 픽스처는 fallback 경로 호환 보장 차원에서 보존한다.

**(c) Cookie 지속 속성명 — REQ-032 FR-07**
`auth()` 실행 후 수집한 cookie 문자열 직렬화 결과에 대해:
- positive: `/(?:^|;\s*)max-age=3600\b/i` 2 회 매치 (access_token + id_token).
- negative: `/(?:^|;\s*)maxAge=/.test(cookieString)` false (camelCase 오타 재도입 차단).

**(d) env 미주입 → admin false — REQ-032 FR-08**
`isAdmin()` 매트릭스에 "쿠키 유효 + JWT ok + env 빈 값" 행을 명시적으로 분리해 스텁 (`{ VITE_ADMIN_USER_ID_PROD: '', VITE_ADMIN_USER_ID_DEV: '' }`) → `isAdmin() === false` 를 어서트한다. 매트릭스 #6 과 의미상 중첩되더라도 "env 누락 = admin 박탈" 가독성을 위해 독립 `describe` 블록으로 분리.

## 동작
- `auth()` 는 URL 의 **해시 프래그먼트 우선** 경로 (Cognito Hosted UI implicit flow 응답 형식) → query string fallback 순서로 토큰을 추출하고, 추출 성공 시 보안 쿠키로 기록. `App.jsx` 마운트 시 1회 호출. 쿠키 속성은 위 § auth() 쿠키 속성 계약 을 준수.
- `isAdmin()` 은 `isLoggedIn()` + `parseJwt` + 환경별 외부 주입 userId 비교. 손상 토큰은 null → 비-admin 귀결 (매트릭스 #2). env 미주입 시 매트릭스 전 행 `false`.
- `log()` 는 `isDev()` 에서만 `console.log` 출력 — 프로덕션 빌드에서는 무해.
- `copyToClipboard()` 실패 경로는 false 반환 + ERROR 로그. 호출부는 Toaster 로 사용자 피드백.
- `useHoverPopup` 은 `HIDE_DELAY_MS=100` 로 hide 지연을 두어 hover drift 를 흡수.

### 회귀 중점
- `parseJwt` 의 null sentinel 경로가 admin 판정, App 마운트 throw 차단에 직접 기여.
- `isMobile` 의 `navigator.maxTouchPoints` 판정이 데스크탑 Safari/Chrome 에서 0 유지.
- `setFullscreen` 의 `#root` class 토글이 Monitor unmount 시 cleanup 짝이 맞는지.
- `copyToClipboard` 가 `navigator.clipboard?.writeText` 가드로 미지원 브라우저에서도 throw 하지 않음.
- `isAdmin()` 6 매트릭스 전 행 회귀 (특히 env 빈 값 → false).
- `auth()` SameSite 정합 — 비표준값 주입 시 브라우저가 쿠키를 거부할 수 있음.
- `auth()` 토큰 추출 — Cognito Hosted UI 응답이 hash fragment 단일 구역에 모든 토큰을 담는 형식이므로, `searchParams.get('access_token')` 단독 의존 시 쿠키가 영구 미설정. 해시 프래그먼트 우선 경로 보존이 회귀 핵심.
- `setCookie` 지속 속성명 — camelCase (`maxAge=...`) 직렬화는 브라우저가 무시 → 쿠키가 세션 쿠키로 강등. `Max-Age=` (또는 `Expires=`) 표준 속성명 직렬화 보존이 회귀 핵심.

## 의존성
- 외부: `react`, `prop-types`, `dompurify`, `marked` 또는 상응 마크다운 파서, `highlight.js` 또는 상응 (구현 파일 기준).
- 내부: 서로 간 참조는 단방향 (공용은 상위로 역의존 없음). env 분기 단일 진입점은 `env.js`.
- 역의존: 거의 전 컴포넌트가 `common/common` · `env` · `a11y` · `Navigation` · `ErrorBoundary` · `Skeleton` 등을 사용.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 grep 게이트 계약 문서가 아니며 baseline 실측만 박제).
- **grep-baseline** (inspector 발행 시점, HEAD=29d9da0 실측):

  (REQ-022 FR-05)
  - (a) `grep -rnE "process\.env\.NODE_ENV" src --include="*.js" --include="*.jsx" --exclude="*.test.*" --exclude-dir=test-utils` → 0 hit.
  - (b) `grep -nE "VITE_ADMIN_USER_ID_PROD|VITE_ADMIN_USER_ID_DEV" src/common/common.js` → 2 hits (`:170`, `:174`).
  - (c) `grep -nE "sameSite|SameSite" src/common/common.js` → 2 hits (`:138`, `:144`).

  (REQ-025 FR-03)
  - (a) `grep -nE "SameSite=(Strict|Lax|None)" src/common/common.js` → 0 hit (현 구현은 `sameSite: site` 로 도메인 문자열 주입 — 본 계약 미준수 상태. 별도 task 로 해소 대상; 본 spec 은 불변식만 박제).
  - (b) `grep -nE "SameSite=[a-z]|SameSite=false|SameSite=\"" src/common/common.js` → 0 hit.

- **rationale**: REQ-022 gate (a) 는 문자열 NODE_ENV 분기 제거 완료 상태 확인 (0 hit = OK). gate (b)(c) 는 env 외부화·setCookie 속성 정의 존재 확인 (1+ hit = OK). REQ-025 gate (a) 는 현실이 계약 미준수 (0 hit) 이나 spec 불변식은 유지 — 향후 task carve 대상. gate (b) 는 비표준값 0 hit = OK.

## 테스트 현황
- [x] `common.test.js` — 포맷 유틸, `parseJwt`, `isAdmin` 분기, 쿠키, `copyToClipboard` 성공/실패 경로.
- [x] `env.test.js` — `import.meta.env` 스위치.
- [x] `a11y.test.js`, `codeHighlighter.test.js`, `markdownParser.test.js`, `sanitizeHtml.test.js`.
- [x] `ErrorBoundary.test.jsx`, `ErrorFallback.test.jsx`, `Navigation.test.jsx`, `Skeleton.test.jsx`, `UserLogin.test.jsx`.
- [x] `useHoverPopup.test.jsx` — Enter/Blur/Touch/Escape 분기.
- [x] `errorReporter.test.js` — `console.error` 위임.
- [x] `isAdmin()` 6 매트릭스 전 행 회귀 테스트 (REQ-022 FR-02; `common.test.js:670` `describe('isAdmin matrix (REQ-20260421-017)')` 6 케이스 박제 — `572009f` / TSK-20260421-61 PASS).
- [x] `auth()` SameSite 회귀 방어 테스트 (REQ-025 FR-02; `common.test.js:202` `describe('auth() SameSite RFC 6265bis (REQ-20260421-025 FR-02)')` — positive `/SameSite=(Strict|Lax|None)/` + negative `/SameSite=[a-z]|SameSite=false/` 어설션 박제 — `9d08c59` / TSK-20260421-62 PASS).
- [ ] `auth()` Cognito-실형 토큰 추출 회귀 방어 테스트 (REQ-032 FR-06; 케이스 A·B 픽스처 `#access_token=AAA&id_token=BBB[&...]` → `getCookie('access_token')` / `getCookie('id_token')` 어설션. 향후 task 로 실현).
- [ ] `auth()` 쿠키 지속 속성명 회귀 방어 테스트 (REQ-032 FR-07; positive `/(?:^|;\s*)max-age=3600\b/i` 2 회 + negative camelCase `/maxAge=/` false. 향후 task).
- [ ] `isAdmin()` env 미주입 분리 회귀 테스트 (REQ-032 FR-08; `{ VITE_ADMIN_USER_ID_PROD: '', VITE_ADMIN_USER_ID_DEV: '' }` 스텁 → false. 향후 task).

## 수용 기준 (현재 상태)
- [x] (Must) `parseJwt` 는 손상 입력에 null 반환, `isAdmin` 은 그 경로에서 false 귀결.
- [x] (Must) `auth()` 는 URL 토큰 존재 시에만 쿠키를 설정 (secure, site 옵션).
- [x] (Must) `log()` 는 production 빌드에서 노출되지 않는다 (`isDev()` 가드).
- [x] (Must) `ErrorBoundary` 는 `fallback(props)` 렌더 prop 과 `onError` 콜백 계약을 지킨다.
- [x] (Must) `copyToClipboard` 는 미지원/거부 상황에서 throw 대신 false 반환 + ERROR 로그.
- [x] (Should) `useHoverPopup` 은 Escape 키로 닫히고, 터치 이벤트를 hover 대체로 수용.
- [x] (Should) `a11y.activateOnKey` 는 `<input>`/`<textarea>` 에서 사용 금지 (호출부 책임; 문서화됨).
- [x] (NFR) `env.js` 경로는 Vite 가 빌드 타임 리터럴로 치환 가능해 dead-code 제거 대상이 된다.
- [x] (NFR) React 19 deprecated API (`findDOMNode`, 문자열 ref, `defaultProps` on functional component 등) 미사용.
- [x] (Must, REQ-022 FR-01) 런타임 소스에서 `process.env.NODE_ENV` 직접 참조 0.
- [x] (Must, REQ-022 FR-02/03) `isAdmin()` 6 매트릭스 + env 외부화 불변식 박제.
- [x] (Must, REQ-022 FR-04) `setCookie` SameSite + expires/maxAge 속성 불변식 박제.
- [x] (Must, REQ-025 FR-01) `auth()` 쿠키 SameSite = RFC 6265bis 유효값 불변식 박제.
- [x] (Must, REQ-025 FR-02) `auth()` SameSite 회귀 방어 단위 테스트 계약 박제.
- [x] (Must, REQ-025 FR-02 실현) `common.test.js` 에 positive/negative 어설션 실제 추가 — `9d08c59` / TSK-20260421-62 완료 (`src/common/common.js:133,139` `SameSite: "Lax"` + 단위 테스트 직렬화 캡처 spy 로 검증).
- [ ] (Must, REQ-032 FR-01) `auth()` 토큰 추출 계약 — Cognito Hosted UI implicit flow 의 hash fragment 단일 구역 형식을 1차 추출 경로로 보장 (해시 우선 → query fallback). 본 spec 박제 후 task 계층에서 코드 정상화 실현 대상.
- [ ] (Must, REQ-032 FR-04) `setCookie` 지속 속성명 정합 — cookie string 직렬화 결과가 `Max-Age=` (또는 `Expires=`) 표준 속성명을 포함. camelCase `maxAge=` 직렬화 0. task 계층 실현 대상.
- [ ] (Must, REQ-032 FR-06) `auth()` Cognito-실형 토큰 추출 회귀 방어 단위 테스트 케이스 A·B 박제. task 계층 실현 대상.
- [ ] (Must, REQ-032 FR-07) `auth()` 쿠키 지속 속성 회귀 방어 단위 테스트 (positive `max-age=3600` 2 회 + negative camelCase 0) 박제. task 계층 실현 대상.
- [ ] (Should, REQ-032 FR-08) `isAdmin()` env 미주입 분리 회귀 테스트 박제. task 계층 실현 대상.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec, blue) | all |
| 2026-04-21 | inspector / 29d9da0 | REQ-20260421-022 흡수 — blue `components/common.md` → green carry-over + § 환경 분기 계약 / § admin gate 계약 2개 섹션 신설. `isAdmin()` 6 매트릭스 표 박제. `VITE_ADMIN_USER_ID_{PROD,DEV}` 외부화 + `setCookie` SameSite/expires/maxAge 계약 박제. `process.env.NODE_ENV` 런타임 0 hit 확인 (baseline). consumed followups: `20260421-0541-admin-gate-recovery-and-env-config-spec-from-blocked.md`, `20260421-0541-node-env-helper-migration-spec-from-blocked.md`. 선행 done req: REQ-20260421-017, `20260420-migrate-node-env-to-env-helper`. | §역할, §공개 인터페이스, §환경 분기 계약 (신설), §admin gate 계약 (신설), §동작, §회귀 중점, §수용 기준, §테스트 현황 |
| 2026-04-21 | inspector / 29d9da0 | REQ-20260421-025 흡수 — § auth() 쿠키 속성 계약 서브섹션 신설. `auth()` SameSite RFC 6265bis 유효값 (`Strict|Lax|None`) 불변식 + 회귀 방어 단위 테스트 계약 박제. consumed followup: `20260421-0541-auth-cookie-samesite-correctness-and-operator-verification-from-blocked.md`. 원 blocked req (축소 대상): `specs/50.blocked/req/20260421-auth-cookie-samesite-correctness-and-operator-verification.md`. RULE-07 정합 — DevTools 실측·분기형 patch 제안 배제. baseline 실측: gate (a) 0 hit — 현 `src/common/common.js:138,144` 은 `sameSite: site` 도메인 문자열 주입 상태 (계약 미준수). 향후 task 로 정상화 대상. | §auth() 쿠키 속성 계약 (신설), §회귀 중점, §수용 기준, §테스트 현황 |
| 2026-04-21 | inspector / reconcile | Phase 1 ack — §테스트 현황 `isAdmin()` 6 매트릭스 항목 `[ ]` → `[x]` 플립. 근거: `572009f` / TSK-20260421-61 (HEAD 조상) — `src/common/common.test.js:670` `describe('isAdmin matrix (REQ-20260421-017)')` 6 케이스 박제, result DoD 에 `npm test -- --run → 47 files / 381 tests passed (기존 375 + 신규 6)` + `grep "describe.*isAdmin" → 3 hits` 박제. SameSite 2 항목 (테스트 현황 line 138, 수용 기준 REQ-025 FR-02 실현) 는 현 `common.js:138,144` 가 `sameSite: site` 도메인 문자열 상태로 계약 미준수 유지 — `[ ]` 보존. | §테스트 현황 |
| 2026-04-21 | inspector / reconcile | Phase 1 ack — §테스트 현황 `auth() SameSite 회귀 방어 테스트` + §수용 기준 `(Must, REQ-025 FR-02 실현)` 2 항목 `[ ]` → `[x]` 플립. 근거: `9d08c59` / TSK-20260421-62 (HEAD 조상) — `src/common/common.js:133,139` `SameSite: "Lax"` 고정 (`grep -nE "SameSite=(Strict\|Lax\|None)" → 1 hit`, `grep -nE "sameSite:\s*site" → 0 hit`) + `src/common/common.test.js:202` `describe('auth() SameSite RFC 6265bis (REQ-20260421-025 FR-02)')` positive `/SameSite=(Strict\|Lax\|None)/` (line 257) + negative `/SameSite=[a-z]\|SameSite=false/` (line 273-274) 어설션 박제. result DoD: `npm run lint` PASS / `npm test -- --run → 47 files / 383 tests PASS (기존 381 + 신규 2, 회귀 0)` / `npm run build` PASS. Must 주관 혼재 없음. | §테스트 현황, §수용 기준 |
| 2026-04-21 | inspector / REQ-20260421-032 | REQ-032 흡수 — admin 게이트 잔존 결함 (D1 auth() 프래그먼트 미추출 + D2 cookie maxAge 오타 + D3 env 미주입) 의 결과 FR 만 시스템 불변식 형태로 박제. 신설/확장: § 공개 인터페이스 `auth()` 한 줄 (해시 우선 + query fallback), § auth() 쿠키 속성 계약 → § auth() 토큰 추출 계약 (FR-01/03) 서브섹션 신설 + § setCookie 속성 불변식 에 지속 속성명 정합 항목 보강 (FR-04), § admin gate 계약 에 env 미주입 안전 기본값 항목 보강 (FR-08), § 회귀 방어 단위 테스트 계약 에 (b) Cognito-실형 (FR-06) / (c) 쿠키 지속 속성명 (FR-07) / (d) env 미주입 분리 (FR-08) 3 절 추가, § 회귀 중점 2 항목 추가 (토큰 추출 / 지속 속성명), § 동작 갱신, § 테스트 현황 + § 수용 기준 에 미실현 [ ] 5 marker 추가. RULE-07 자기검증: incident 진단·DevTools 실측·1회성 patch 플랜은 본 spec 본문에 포함하지 않고 결과 계약만 박제 — req §개요/§배경/§근본원인 D1~D3 진단 산문은 60.done/req/ 원문에 보존. 차기 task carve 대상 (planner 영역): code 정상화 (`auth()` hash 파싱 + `setCookie` 지속 속성명 정정) + 회귀 테스트 케이스 A/B/지속속성/env 미주입. NFR-01 (3 파일 변경 상한) 은 task 영역 metric. consumed: REQ-20260421-032 자체. | §역할 헤더, §공개 인터페이스, §auth() 토큰 추출 계약 (신설), §setCookie 속성 불변식 (보강), §admin gate 계약 (보강), §회귀 방어 단위 테스트 계약 (확장), §회귀 중점, §동작, §테스트 현황, §수용 기준, §변경 이력, §참고 |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/04/21/req/20260421-common-env-admin-contracts-absorption.md` (REQ-20260421-022).
  - `specs/60.done/2026/04/21/req/20260421-auth-cookie-samesite-rfc6265bis-invariant.md` (REQ-20260421-025).
  - `specs/60.done/2026/04/21/req/20260421-admin-gate-residual-defects-auth-fragment-cookie-maxage-env-empty.md` (REQ-20260421-032).
- **Consumed followups (3건)**:
  - `specs/10.followups/20260421-0541-admin-gate-recovery-and-env-config-spec-from-blocked.md`
  - `specs/10.followups/20260421-0541-node-env-helper-migration-spec-from-blocked.md`
  - `specs/10.followups/20260421-0541-auth-cookie-samesite-correctness-and-operator-verification-from-blocked.md`
- **원 blocked req (REQ-025 축소 대상)**:
  - `specs/50.blocked/req/20260421-auth-cookie-samesite-correctness-and-operator-verification.md`
- **선행 done req**:
  - `specs/60.done/2026/04/21/req/20260421-admin-gate-recovery-diagnostic-and-env-config.md` (REQ-20260421-017)
  - `specs/60.done/2026/04/20/req/20260420-migrate-node-env-to-env-helper.md`
- **코드 위치**:
  - `src/common/env.js` — `isDev()/isProd()/mode()`.
  - `src/common/common.js` — `isAdmin()` / `setCookie()` / `auth()`.
- **외부 근거**:
  - RFC 6265bis (draft) — SameSite 속성 값 집합 `{Strict, Lax, None}` 정의.
  - RFC 6265 §5.2.2 — cookie 지속 속성명 `Max-Age` (대소문자 무관, 하이픈 필수) 정의. 알 수 없는 속성은 무시되어 cookie 가 세션 쿠키로 강등.
  - AWS Cognito Hosted UI — `response_type=token` (OAuth 2.0 implicit grant) 응답 시 모든 토큰을 URL hash fragment 단일 구역에 `&` 로 연결한 형식으로 반환.
