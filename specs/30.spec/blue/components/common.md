# common 모듈 (공용 유틸 / UI / 훅)

> **위치**: `src/common/` (common.js, env.js, env.d.ts, a11y.js, codeHighlighter.js, markdownParser.js, sanitizeHtml.js, errorReporter.js, useHoverPopup.js, ErrorBoundary.jsx, ErrorFallback.jsx, Footer.jsx, Navigation.jsx, PageNotFound.jsx, Skeleton.jsx, UserLogin.jsx, ErrorFallback.css, Skeleton.css, + 대응 `.test.*`)
> **관련 요구사항**: REQ-20260421-022, REQ-20260421-025, REQ-20260421-032, REQ-20260421-038, REQ-20260422-045
> **최종 업데이트**: 2026-04-21 (by inspector, REQ-20260422-045 흡수 — §에러 처리 호출측 경유 계약 상호참조 신설)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=0f03547).

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
- **호출측 경유 계약 (REQ-20260422-045 FR-03, 선행 REQ-20260421-039 FR-06)**: 런타임 도메인 에러 지점 (`Search`, `ImageSelector`, `File`, `FileItem`, `FileDrop`, `FileUpload`, `Comment`) 은 `console.error` 직접 호출 대신 `reportError` 경유 — 예: `src/Comment/Comment.jsx`. 단일 채널 계약 세부는 선행 done REQ-20260421-039 참조.

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

## admin gate 계약 (REQ-20260421-038)

본 계약은 REQ-20260421-017/022/032 의 `VITE_ADMIN_USER_ID_*` env 경로 계약을 **교체** 하며 병행 박제가 아니다. 세 선행 req 의 done 상태는 감사성 보존 차원에서 변경하지 않으나, 본 섹션의 불변식은 REQ-20260421-038 을 단일 공급원으로 한다.

### isAdmin() cognito:groups 매트릭스 (REQ-20260421-038 FR-01)
| # | cookie | parseJwt | `cognito:groups` 필드 | admin group 포함 | 기대 반환 |
|---|--------|---------|------------------------|--------------------|----------|
| 1 | 무 | — | — | — | `false` |
| 2 | 유 | `null` (손상) | — | — | `false` |
| 3 | 유 | ok | 필드 부재 | — | `false` |
| 4 | 유 | ok | `[]` 빈 배열 | — | `false` |
| 5 | 유 | ok | `['user']` (또는 admin 미포함 임의 배열) | 미포함 | `false` |
| 6 | 유 | ok | `['admin']` | 포함 | `true` |
| 7 | 유 | ok | `['admin', 'editor']` (복합 멤버십) | 포함 | `true` |

- **admin group 멤버십 불변식**: `isAdmin()` 은 다음 4 조건 AND 로 `true` 를 귀결한다 — (a) `isLoggedIn() === true`, (b) `parseJwt(getCookie('access_token'))` 이 non-null, (c) payload 에 `cognito:groups` 배열 필드 존재, (d) 그 배열이 **admin group 이름** 을 포함. 네 조건 중 어느 하나라도 false 면 `false` 귀결. payload 의 `username` 필드 및 `import.meta.env.VITE_ADMIN_USER_ID_*` 비교 경로는 **존재하지 않는다**.
- **group claim 부재 안전 기본값 불변식 (REQ-20260421-038 FR-02)**: JWT payload 에 `cognito:groups` 필드 자체가 없거나 `undefined` · 빈 배열 `[]` · `null` · 비-배열 (문자열·객체 등) 인 경우 `isAdmin()` 은 항상 `false` 를 귀결한다 (REQ-20260421-032 FR-08 의 "env 미주입 안전 기본값" 을 계승·교체). 운영자가 Cognito group 설정을 누락하거나 토큰에 groups claim 이 발급되지 않으면 admin 기능은 영구 비활성화되며, 이는 보안상 안전한 기본값이다.
- **env 경로 완전 제거 불변식 (REQ-20260421-038 FR-03)**: 런타임 소스 (`src/**` except `*.test.*`, `src/test-utils/**`) 에서 `import.meta.env.VITE_ADMIN_USER_ID_PROD` / `VITE_ADMIN_USER_ID_DEV` 참조 0 hit. `.env.example`, `.env.development.local`, `.env.production.local`, Amplify 콘솔 env 변수에서 동일 2 키 제거. `.env.example` 의 "임시 조치 — REQ-20260421-017" 주석 제거. `src/common/common.js` 의 `// TODO: change user id hard coding to IAM authorization` 주석 제거.
- **admin group 이름 간접 참조 계약 (REQ-20260421-038 FR-04)**: `isAdmin()` 구현이 admin group 이름을 식별하는 경로는 다음 중 택1 이며, 선택된 경로를 본 섹션 또는 task 영역에 1회 박제한다 — (α) 리터럴 상수 (`const ADMIN_GROUP = 'admin'`), (β) env 변수 (`import.meta.env.VITE_ADMIN_GROUP_NAME` 또는 유사), (γ) 함수 인자. 세 선택지 모두 RULE-07 정합 (본 spec 은 택1 결과의 결정만 요구, 결정 자체는 spec 박제 + 코드 구현 일관). 주의: (β) 경로를 택하면 FR-03 의 "env 경로 완전 제거" 는 `VITE_ADMIN_USER_ID_*` 2 키 한정 범위로 국한되며, 새 env 키 `VITE_ADMIN_GROUP_NAME` 은 별 계약. **택1 결정 (TSK-20260421-74 @08bfe52)**: **(α) 리터럴 상수** — `src/common/common.js:161` `const ADMIN_GROUP = 'admin';` 박제. FR-03 의 env 경로 완전 제거 범위는 `VITE_ADMIN_USER_ID_*` 2 키 한정이며, `VITE_ADMIN_GROUP_NAME` 신규 키는 도입하지 않는다.
- **코드 위치**: `src/common/common.js` `isAdmin()` (현 HEAD=0f03547 기준 `:161-185`, 교체 대상). `parseJwt()` (`:45-82`) 는 base64url → UTF-8 → JSON.parse 경로로 `cognito:groups` claim 추출에 재활용.

### 운영 전제 (REQ-20260421-038 FR-11)
본 계약은 앱이 판정에 사용하는 JWT (현 `access_token` 쿠키) 의 payload 에 `cognito:groups` claim 이 발급된다는 운영 전제 하에 성립한다. Cognito 설정상 `cognito:groups` 가 access_token 에 미포함인 환경이라면 (a) App client scope 설정으로 포함하거나 (b) 판정 경로를 `id_token` 기반으로 전환하거나 (c) custom attribute 로 우회한다. 세 선택지 중 택1 은 운영자 결정이며 본 spec 의 불변식은 "판정에 사용하는 토큰에 `cognito:groups` claim 이 존재한다" 는 상위 전제만 박제한다.

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

**(d) group claim 부재 안전 기본값 — REQ-20260421-038 FR-02/08**
`src/common/common.test.js` 는 `describe('isAdmin cognito:groups matrix (REQ-20260421-038 FR-01)')` (또는 동급) 블록을 포함하며 다음 케이스 행을 최소 포함한다: (1) 쿠키 무 → false, (2) 쿠키 유 + parseJwt null → false, (3) 쿠키 유 + parseJwt ok + `cognito:groups` 필드 부재 → false, (4) 쿠키 유 + parseJwt ok + `cognito:groups === []` → false, (5) 쿠키 유 + parseJwt ok + `cognito:groups === ['user']` (admin 미포함) → false, (6) 쿠키 유 + parseJwt ok + `cognito:groups === ['admin']` → true, (7) 쿠키 유 + parseJwt ok + `cognito:groups === ['admin', 'editor']` (복합) → true. 추가로 `describe('isAdmin() group claim 부재 안전 기본값 (REQ-20260421-038 FR-02)')` 블록에서 (a) groups 필드 null → false, (b) groups 필드 비-배열 (문자열·객체 등) → false 2 행을 포함한다. REQ-20260421-032 FR-08 의 env 미주입 describe 는 본 REQ 시점에 group claim 기반 테스트로 **교체** 되며 `VITE_ADMIN_USER_ID` 토큰 참조 0 hit 을 만족한다.

## 동작
- `auth()` 는 URL 의 **해시 프래그먼트 우선** 경로 (Cognito Hosted UI implicit flow 응답 형식) → query string fallback 순서로 토큰을 추출하고, 추출 성공 시 보안 쿠키로 기록. `App.jsx` 마운트 시 1회 호출. 쿠키 속성은 위 § auth() 쿠키 속성 계약 을 준수.
- `isAdmin()` 은 `isLoggedIn()` + `parseJwt(getCookie('access_token'))` + payload 의 `cognito:groups` 배열 내 admin group 이름 포함 여부 판정 (REQ-20260421-038 FR-01/02). 손상 토큰은 null → 비-admin 귀결 (매트릭스 #2). `cognito:groups` 필드 부재·빈 배열·null·비-배열 → 매트릭스 #3~#5 전 행 `false` (안전 기본값).
- `log()` 는 `isDev()` 에서만 `console.log` 출력 — 프로덕션 빌드에서는 무해.
- `copyToClipboard()` 실패 경로는 false 반환 + ERROR 로그. 호출부는 Toaster 로 사용자 피드백.
- `useHoverPopup` 은 `HIDE_DELAY_MS=100` 로 hide 지연을 두어 hover drift 를 흡수.

### 회귀 중점
- `parseJwt` 의 null sentinel 경로가 admin 판정, App 마운트 throw 차단에 직접 기여.
- `isMobile` 의 `navigator.maxTouchPoints` 판정이 데스크탑 Safari/Chrome 에서 0 유지.
- `setFullscreen` 의 `#root` class 토글이 Monitor unmount 시 cleanup 짝이 맞는지.
- `copyToClipboard` 가 `navigator.clipboard?.writeText` 가드로 미지원 브라우저에서도 throw 하지 않음.
- `isAdmin()` `cognito:groups` 매트릭스 전 행 회귀 (특히 group claim 부재·빈 배열·비-배열 → false).
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

  (REQ-022 FR-05 / REQ-038 FR-07 교체)
  - (a) `grep -rnE "process\.env\.NODE_ENV" src --include="*.js" --include="*.jsx" --exclude="*.test.*" --exclude-dir=test-utils` → 0 hit.
  - (b-1) **[REQ-038 FR-07 positive]** `grep -nE "cognito:groups" src/common/common.js` → **목표 1+ hit**. 현 시점 (HEAD=08bfe52): **2 hits** (주석 1 + 코드 1) — TSK-20260421-74 migration 완료, 목표 수렴.
  - (b-2) **[REQ-038 FR-07 negative]** `grep -nE "VITE_ADMIN_USER_ID" src/common/common.js` → **목표 0 hit**. 현 시점 (HEAD=08bfe52): **0 hit** — TSK-20260421-74 migration 완료, 목표 수렴. (baseline HEAD=0f03547 3 hits → 교체 후 0.)
  - (c) `grep -nE "sameSite|SameSite" src/common/common.js` → 2 hits (`:138`, `:144`; 구 baseline 수치 보존 — REQ-025 관할 축).

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
- [x] (Must, REQ-20260421-038 FR-08) `isAdmin()` `cognito:groups` 7 케이스 매트릭스 회귀 테스트 — `common.test.js:861` `describe('isAdmin cognito:groups matrix (REQ-20260421-038 FR-01)')` 7 케이스 박제 (쿠키 무 / parseJwt null / groups 필드 부재 / `[]` / `['user']` / `['admin']` / `['admin','editor']`) — `08bfe52` / TSK-20260421-74 PASS.
- [~] (감사성) 구 `isAdmin()` 6 매트릭스 회귀 테스트 (REQ-022 FR-02; `common.test.js:670` `describe('isAdmin matrix (REQ-20260421-017)')` 6 케이스 박제 — `572009f` / TSK-20260421-61 PASS) — REQ-038 migration task 완료 시점에 본 describe 블록 교체·제거 예정. 현 HEAD=0f03547 시점 구 테스트는 env 경로 기반으로 여전히 동작하나 REQ-038 계약 교체 후 `VITE_ADMIN_USER_ID` 토큰 0 hit 수렴 필요.
- [x] `auth()` SameSite 회귀 방어 테스트 (REQ-025 FR-02; `common.test.js:202` `describe('auth() SameSite RFC 6265bis (REQ-20260421-025 FR-02)')` — positive `/SameSite=(Strict|Lax|None)/` + negative `/SameSite=[a-z]|SameSite=false/` 어설션 박제 — `9d08c59` / TSK-20260421-62 PASS).
- [x] `auth()` Cognito-실형 토큰 추출 회귀 방어 테스트 (REQ-032 FR-06; `common.test.js:202` `describe('auth() Cognito-실형 토큰 추출 (REQ-20260421-032 FR-06)')` 케이스 A·B 박제 — `c5ad57d` / TSK-20260421-66 PASS).
- [x] `auth()` 쿠키 지속 속성명 회귀 방어 테스트 (REQ-032 FR-07; `common.test.js:329` `describe('auth() cookie persistence attr name (REQ-20260421-032 FR-07)')` positive `max-age=3600` + negative `maxAge=` 어설션 박제 — `0fb0ca1` / TSK-20260421-67 PASS).
- [x] (Must, REQ-20260421-038 FR-02/08) `isAdmin()` group claim 부재 안전 기본값 회귀 테스트 — `common.test.js:929` `describe('isAdmin() group claim 부재 안전 기본값 (REQ-20260421-038 FR-02)')` 2 케이스 (groups 필드 null / groups 필드 비-배열 — 문자열·객체) 박제 — `08bfe52` / TSK-20260421-74 PASS.
- [~] (감사성) 구 `isAdmin()` env 미주입 분리 회귀 테스트 (REQ-032 FR-08; `common.test.js:923` `describe('isAdmin() env 미주입 안전 기본값 (REQ-20260421-032 FR-08)')` 2 케이스 박제 — `8b2cb30` / TSK-20260421-68 PASS) — REQ-038 계약 교체 후 group claim 기반 describe 로 **교체** 예정. 현 HEAD=0f03547 시점 구 테스트는 env 기반으로 동작.

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
- [~] (구 계약 — REQ-022 FR-02/03 교체됨) ~~`isAdmin()` 6 매트릭스 + env 외부화 불변식 박제.~~ REQ-20260421-038 흡수 시점에 본 섹션의 불변식은 cognito:groups 기반으로 교체 — 아래 REQ-038 수용 기준 참조.
- [x] (Must, REQ-20260421-038 FR-01) § admin gate 계약 의 `isAdmin()` `cognito:groups` 7 케이스 매트릭스 박제 (쿠키 × parseJwt × groups 필드 존재 × admin group 포함 축).
- [x] (Must, REQ-20260421-038 FR-02) § admin gate 계약 의 group claim 부재 안전 기본값 불변식 박제 (부재 / `undefined` / `[]` / null / 비-배열 → false).
- [x] (Must, REQ-20260421-038 FR-03) 런타임 소스 `src/**` (except test) 에서 `VITE_ADMIN_USER_ID_PROD|VITE_ADMIN_USER_ID_DEV` 0 hit + `.env.example` 2 키 + 주석 2 행 = 4 행 제거 + TODO 주석 제거 — `08bfe52` / TSK-20260421-74 PASS (DoD grep `VITE_ADMIN_USER_ID` in `src/common/common.js` 0 hit / `src` 재귀 0 hit / `.env.example` 0 hit / `TODO: change user id` 0 hit). Amplify 콘솔 env 변수 제거는 운영자 수동 (spec §운영 전제 범위 밖).
- [x] (Must, REQ-20260421-038 FR-04) admin group 이름 간접 참조 경로 (α/β/γ) 택1 계약 박제 (§admin gate 계약 에 명시, 실제 택1 결정은 task 단계).
- [x] (Must, REQ-20260421-038 FR-05) § admin gate 계약 섹션 전면 재작성 (매트릭스 / 불변식 / 안전 기본값 / 코드 위치 4 하위 요소 교체).
- [x] (Must, REQ-20260421-038 FR-07) § 스코프 규칙 grep-baseline (b) 를 cognito:groups (positive 목표 1+) + VITE_ADMIN_USER_ID (negative 목표 0) 2 gate 로 교체 박제. 현 baseline 실측값 (0 / 3) 분리 박제.
- [x] (Must, REQ-20260421-038 FR-08) `src/common/common.test.js` 의 구 `isAdmin matrix` + `env 미주입` 2 describe 블록을 `isAdmin cognito:groups matrix (REQ-20260421-038 FR-01)` (`:861`) + `isAdmin() group claim 부재 안전 기본값 (REQ-20260421-038 FR-02)` (`:929`) 2 describe 로 교체 — `08bfe52` / TSK-20260421-74 PASS.
- [x] (Must, REQ-20260421-038 FR-09) `.env.example` 4 행 제거 — `08bfe52` / TSK-20260421-74 PASS. FR-04 (α) 택으로 신규 env 키 없음 — `VITE_ADMIN_GROUP_NAME=` 추가 없음.
- [x] (Must, REQ-20260421-038 FR-10) § 변경 이력 에 REQ-038 흡수 행 박제 (현장 수치 + HEAD + 선행 done req 3건 + FR-04 택1 귀결 대기 명시).
- [x] (Should, REQ-20260421-038 FR-11) § admin gate 계약 말미에 운영 전제 (cognito:groups claim 발급 전제 + access_token vs id_token 분기) 1 문단 박제.
- [x] (Must, REQ-20260421-038 FR-12) § admin gate 계약 서두에 "REQ-017/022/032 env 경로 계약을 교체하며 병행 박제가 아니다" 1 문장 박제.
- [x] (Must, REQ-022 FR-04) `setCookie` SameSite + expires/maxAge 속성 불변식 박제.
- [x] (Must, REQ-025 FR-01) `auth()` 쿠키 SameSite = RFC 6265bis 유효값 불변식 박제.
- [x] (Must, REQ-025 FR-02) `auth()` SameSite 회귀 방어 단위 테스트 계약 박제.
- [x] (Must, REQ-025 FR-02 실현) `common.test.js` 에 positive/negative 어설션 실제 추가 — `9d08c59` / TSK-20260421-62 완료 (`src/common/common.js:133,139` `SameSite: "Lax"` + 단위 테스트 직렬화 캡처 spy 로 검증).
- [x] (Must, REQ-032 FR-01) `auth()` 토큰 추출 계약 — Cognito Hosted UI implicit flow 의 hash fragment 단일 구역 형식을 1차 추출 경로로 보장 (해시 우선 → query fallback). `c5ad57d` / TSK-20260421-66 — `src/common/common.js:124` `new URL(...).hash` → `URLSearchParams` 우선 + searchParams fallback 구조로 재작성. `grep -nE "indexOf\(['\"]#id_token=" src/common/common.js` → 0 hits, `grep -nE "\.hash\b" src/common/common.js` → 1 hit.
- [x] (Must, REQ-032 FR-04) `setCookie` 지속 속성명 정합 — cookie string 직렬화 결과가 `Max-Age=` (또는 `Expires=`) 표준 속성명을 포함. camelCase `maxAge=` 직렬화 0. `0fb0ca1` / TSK-20260421-67 — `src/common/common.js:141,150` `'max-age': 3600` 2회. `grep -nE "maxAge:\s*[0-9]+" src/common/common.js` → 0 hits.
- [x] (Must, REQ-032 FR-06) `auth()` Cognito-실형 토큰 추출 회귀 방어 단위 테스트 케이스 A·B 박제. `c5ad57d` / TSK-20260421-66 — `common.test.js:202` describe + 케이스 A (trailing params) / 케이스 B (bare) it 2건.
- [x] (Must, REQ-032 FR-07) `auth()` 쿠키 지속 속성 회귀 방어 단위 테스트 (positive `max-age=3600` 2 회 + negative camelCase 0) 박제. `0fb0ca1` / TSK-20260421-67 — `common.test.js:329` describe + positive/negative 어설션.
- [~] (구 계약 — REQ-032 FR-08 교체됨) ~~(Should, REQ-032 FR-08) `isAdmin()` env 미주입 분리 회귀 테스트 박제.~~ REQ-20260421-038 FR-02 계약 교체로 group claim 부재 describe 로 전환. 구 describe 의 PASS 기록 (`8b2cb30` / TSK-20260421-68 — `common.test.js:923` + prod/dev 2 it, `npm test -- --run → 47 files / 388 tests PASS`) 은 감사성 보존 — migration task 완료 시점에 교체.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec, blue) | all |
| 2026-04-21 | inspector / 29d9da0 | REQ-20260421-022 흡수 — blue `components/common.md` → green carry-over + § 환경 분기 계약 / § admin gate 계약 2개 섹션 신설. `isAdmin()` 6 매트릭스 표 박제. `VITE_ADMIN_USER_ID_{PROD,DEV}` 외부화 + `setCookie` SameSite/expires/maxAge 계약 박제. `process.env.NODE_ENV` 런타임 0 hit 확인 (baseline). consumed followups: `20260421-0541-admin-gate-recovery-and-env-config-spec-from-blocked.md`, `20260421-0541-node-env-helper-migration-spec-from-blocked.md`. 선행 done req: REQ-20260421-017, `20260420-migrate-node-env-to-env-helper`. | §역할, §공개 인터페이스, §환경 분기 계약 (신설), §admin gate 계약 (신설), §동작, §회귀 중점, §수용 기준, §테스트 현황 |
| 2026-04-21 | inspector / 29d9da0 | REQ-20260421-025 흡수 — § auth() 쿠키 속성 계약 서브섹션 신설. `auth()` SameSite RFC 6265bis 유효값 (`Strict|Lax|None`) 불변식 + 회귀 방어 단위 테스트 계약 박제. consumed followup: `20260421-0541-auth-cookie-samesite-correctness-and-operator-verification-from-blocked.md`. 원 blocked req (축소 대상): `specs/50.blocked/req/20260421-auth-cookie-samesite-correctness-and-operator-verification.md`. RULE-07 정합 — DevTools 실측·분기형 patch 제안 배제. baseline 실측: gate (a) 0 hit — 현 `src/common/common.js:138,144` 은 `sameSite: site` 도메인 문자열 주입 상태 (계약 미준수). 향후 task 로 정상화 대상. | §auth() 쿠키 속성 계약 (신설), §회귀 중점, §수용 기준, §테스트 현황 |
| 2026-04-21 | inspector / reconcile | Phase 1 ack — §테스트 현황 `isAdmin()` 6 매트릭스 항목 `[ ]` → `[x]` 플립. 근거: `572009f` / TSK-20260421-61 (HEAD 조상) — `src/common/common.test.js:670` `describe('isAdmin matrix (REQ-20260421-017)')` 6 케이스 박제, result DoD 에 `npm test -- --run → 47 files / 381 tests passed (기존 375 + 신규 6)` + `grep "describe.*isAdmin" → 3 hits` 박제. SameSite 2 항목 (테스트 현황 line 138, 수용 기준 REQ-025 FR-02 실현) 는 현 `common.js:138,144` 가 `sameSite: site` 도메인 문자열 상태로 계약 미준수 유지 — `[ ]` 보존. | §테스트 현황 |
| 2026-04-21 | inspector / reconcile | Phase 1 ack — §테스트 현황 `auth() SameSite 회귀 방어 테스트` + §수용 기준 `(Must, REQ-025 FR-02 실현)` 2 항목 `[ ]` → `[x]` 플립. 근거: `9d08c59` / TSK-20260421-62 (HEAD 조상) — `src/common/common.js:133,139` `SameSite: "Lax"` 고정 (`grep -nE "SameSite=(Strict\|Lax\|None)" → 1 hit`, `grep -nE "sameSite:\s*site" → 0 hit`) + `src/common/common.test.js:202` `describe('auth() SameSite RFC 6265bis (REQ-20260421-025 FR-02)')` positive `/SameSite=(Strict\|Lax\|None)/` (line 257) + negative `/SameSite=[a-z]\|SameSite=false/` (line 273-274) 어설션 박제. result DoD: `npm run lint` PASS / `npm test -- --run → 47 files / 383 tests PASS (기존 381 + 신규 2, 회귀 0)` / `npm run build` PASS. Must 주관 혼재 없음. | §테스트 현황, §수용 기준 |
| 2026-04-21 | inspector / reconcile | Phase 1 ack — §테스트 현황 3 marker (FR-06/07/08) + §수용 기준 5 marker (FR-01/04/06/07/08) `[ ]` → `[x]` 일괄 플립. 근거: `c5ad57d` / TSK-20260421-66 (FR-01/06, `src/common/common.js:124` hash 우선 파싱 + `common.test.js:202` describe 박제, DoD grep (a) 0 hit / (b) 1 hit / (c) 2 hit / (d) 1 hit 재실행 PASS), `0fb0ca1` / TSK-20260421-67 (FR-04/07, `common.js:141,150` `'max-age': 3600` 2회 + `common.test.js:329` describe 박제, DoD grep (a) 0 hit / (b) 2 hit / (c) 1 hit / (d) 2 hit / (e) 2 hit 재실행 PASS), `8b2cb30` / TSK-20260421-68 (FR-08, `common.test.js:923` describe 박제, DoD grep (a) 1 hit / (b) 5 hit / (c) 8 hit / (d) 1 hit / (e) 3 hit 재실행 PASS). 3 커밋 모두 HEAD(`8b2cb30`) 조상. 잔존 [ ] marker 0 — planner promote 후보. | §테스트 현황, §수용 기준 |
| 2026-04-21 | inspector / REQ-20260421-032 | REQ-032 흡수 — admin 게이트 잔존 결함 (D1 auth() 프래그먼트 미추출 + D2 cookie maxAge 오타 + D3 env 미주입) 의 결과 FR 만 시스템 불변식 형태로 박제. 신설/확장: § 공개 인터페이스 `auth()` 한 줄 (해시 우선 + query fallback), § auth() 쿠키 속성 계약 → § auth() 토큰 추출 계약 (FR-01/03) 서브섹션 신설 + § setCookie 속성 불변식 에 지속 속성명 정합 항목 보강 (FR-04), § admin gate 계약 에 env 미주입 안전 기본값 항목 보강 (FR-08), § 회귀 방어 단위 테스트 계약 에 (b) Cognito-실형 (FR-06) / (c) 쿠키 지속 속성명 (FR-07) / (d) env 미주입 분리 (FR-08) 3 절 추가, § 회귀 중점 2 항목 추가 (토큰 추출 / 지속 속성명), § 동작 갱신, § 테스트 현황 + § 수용 기준 에 미실현 [ ] 5 marker 추가. RULE-07 자기검증: incident 진단·DevTools 실측·1회성 patch 플랜은 본 spec 본문에 포함하지 않고 결과 계약만 박제 — req §개요/§배경/§근본원인 D1~D3 진단 산문은 60.done/req/ 원문에 보존. 차기 task carve 대상 (planner 영역): code 정상화 (`auth()` hash 파싱 + `setCookie` 지속 속성명 정정) + 회귀 테스트 케이스 A/B/지속속성/env 미주입. NFR-01 (3 파일 변경 상한) 은 task 영역 metric. consumed: REQ-20260421-032 자체. | §역할 헤더, §공개 인터페이스, §auth() 토큰 추출 계약 (신설), §setCookie 속성 불변식 (보강), §admin gate 계약 (보강), §회귀 방어 단위 테스트 계약 (확장), §회귀 중점, §동작, §테스트 현황, §수용 기준, §변경 이력, §참고 |
| 2026-04-21 | inspector / 08bfe52 (TSK-20260421-74) | **Phase 1 reconcile 1/1 ack** — TSK-74 `isadmin-cognito-groups-migration` result.md 의 10 grep 게이트 전원 PASS @HEAD=08bfe52 재실행 확인: `VITE_ADMIN_USER_ID` in `src/common/common.js` **0 hits** (baseline 3 → 0), 재귀 `src` **0 hits** (baseline 15 → 0), `cognito:groups` in `src/common/common.js` **2 hits** (주석 1 + 코드 1 ≥ 1+), `cognito:groups` in `src/common/common.test.js` **21 hits** (≥ 7), `.env.example` `VITE_ADMIN_USER_ID` **0 hits** (baseline 2 → 0), `TODO: change user id` in `src/common/common.js` **0 hits** (baseline 1 → 0), `describe('isAdmin cognito:groups matrix` **1 hit** @`:861`, `describe('isAdmin() group claim 부재` **1 hit** @`:929`, `const ADMIN_GROUP` **1 hit** @`:161` (FR-04 (α) 택 박제). hook-ack (result.md): `npm run lint` PASS, `npm test -- --run` PASS 47 files / **410 tests** (409→410 +1, 회귀 0), `npm run build` PASS 349ms, coverage Stmts 97.58% / Branches 94.21% / Fn 93.66% / Lines 98.02% 하락 없음. Must 주관 혼재 없음 → ack 채택. §admin gate 계약 FR-04 택1 박제 (**(α) 리터럴 상수** — `src/common/common.js:161` `const ADMIN_GROUP = 'admin'`). §테스트 현황 2 marker ([ ] FR-08 신 matrix + [ ] FR-02/08 신 안전 기본값) [x] 플립. §수용 기준 3 marker ([ ] FR-03 env 경로 완전 제거 + [ ] FR-08 describe 교체 + [ ] FR-09 .env.example 제거) [x] 플립. §스코프 규칙 grep-baseline (b-1/b-2) 현 수치 갱신 (0→2 / 3→0). 잔존 [ ] marker: 0 — REQ-038 전체 실현 완결 (FR-11 운영 전제는 Cognito App Client scope 확인 = 운영자 수동, spec 범위 밖). planner promote 후보 (§수용 기준 잔존 [ ] 0 + [~] 감사성 marker 3건 — 구 REQ-022 FR-02/03 + REQ-032 FR-08 계약 교체 감사 기록으로 보존). 부수 관찰 (result.md §관찰 이슈): `test isAdmin` 기존 describe 내부 dev JWT 를 `cognito:groups=['admin']` 포함하도록 재인코딩 — 구 dev JWT 는 group claim 미포함이라 새 구현에서 false 귀결이므로 회귀 방지 목적. task 변경 범위 `src/common/common.test.js` 수정 내 부수 편집 — followup 불요. | §최종 업데이트 / §admin gate 계약 (FR-04 택1 박제) / §스코프 규칙 grep-baseline (b-1/b-2) / §테스트 현황 / §수용 기준 / 본 이력 |
| 2026-04-21 | inspector / REQ-20260422-045 | **REQ-045 FR-03 흡수** — blue `components/common.md` → green carry-over 후 §에러 처리 절에 호출측 경유 계약 상호참조 1행 신설 (`reportError` 경유 + REQ-20260421-039 식별자 + 도메인 지점 목록 + `src/Comment/Comment.jsx` 예시). 기존 `ErrorBoundary.jsx` / `ErrorFallback.jsx` / `errorReporter.js` 3행 수정 0 (NFR-02 준수, FR-04 정합). 선행 done: REQ-20260421-039 FR-06 "blue 승격 시 common.md §에러 처리 상호참조" Should 항 — writer 매트릭스상 blue 직접 편집 불가로 영구 미충족 상태였던 것을 본 green 경유 경로로 해소. 단일 채널 계약 세부 (호출측 `console.error` 금지·`reportError` 단일 경유) 는 REQ-039 본문에 이미 박제됨 — 본 행은 상호참조만. RULE-07 자기검증: 상호참조 문장 존재는 `grep -c` 로 반복 검증 가능한 시스템 관찰 불변식, 1회성 incident patch 아님. | §최종 업데이트, §관련 요구사항, §에러 처리 (1행 추가), 본 이력 |
| 2026-04-21 | inspector / 0f03547 (REQ-20260421-038) | **REQ-038 흡수** — `isAdmin()` 권한 판정 진실 공급원을 `VITE_ADMIN_USER_ID_*` env → Cognito User Pool Groups (`cognito:groups` claim) 으로 이관하는 계약 교체. § admin gate 계약 섹션 전면 재작성 — (1) 기존 `isAdmin() 6 케이스 매트릭스` (쿠키 × parseJwt × username × 환경) 를 **7 케이스 matrix (쿠키 × parseJwt × cognito:groups 필드 × admin group 포함)** 로 교체. (2) `admin user ID 외부화 불변식` → `admin group 멤버십 불변식` + `group claim 부재 안전 기본값 불변식` + `env 경로 완전 제거 불변식` + `admin group 이름 간접 참조 계약 (α/β/γ 택1)` 로 교체. (3) `env 미주입 안전 기본값 (REQ-032 FR-08)` → `group claim 부재 안전 기본값 (REQ-038 FR-02)` 으로 계승·교체. (4) §운영 전제 (FR-11) 1 문단 추가 — access_token 에 `cognito:groups` claim 발급 전제 + id_token / custom attribute 분기 명시. (5) § 회귀 방어 단위 테스트 계약 (d) 절을 env 미주입 → group claim 부재로 교체 (7 케이스 + 2 케이스 describe 박제 요구). (6) § 스코프 규칙 grep-baseline (b) 를 (b-1) `cognito:groups` positive 목표 1+ / (b-2) `VITE_ADMIN_USER_ID` negative 목표 0 2 gate 로 교체, 현 baseline (0 / 3 hits @ common.js:160,176,180) 분리 박제. (7) § 동작 의 `isAdmin()` 설명 갱신. (8) § 회귀 중점 matrix 설명 갱신. (9) § 테스트 현황 구 `isAdmin matrix` / `env 미주입` 2 항목을 REQ-038 신 2 항목 [ ] 로 교체 (migration task 미발행 상태), 구 항목은 `[~]` 감사성 마커로 보존. (10) § 수용 기준 구 REQ-022 FR-02/03 + REQ-032 FR-08 2 항목을 `[~]` 로 전환 + REQ-038 FR-01~12 신 9 항목 추가. 현장 근거 (HEAD=0f03547): `src/common/common.js:160` TODO 주석, `:161-185` isAdmin() 25행, `:176,180` env 비교 2 지점, `src/common/common.test.js` `VITE_ADMIN_USER_ID` 12 hits (`common.test.js` 단일 파일), `.env.example:18-21` 4 행, 기존 REQ-017/022/032 done req 3건. 선행 done req 3건의 done 상태는 감사성 보존 — rename/move/delete 0 (FR-12). FR-04 의 admin group 이름 경로 (α/β/γ) 택1 은 본 inspector 세션에서 미결 — planner/developer task 단계에서 결정 후 § admin gate 계약 또는 §변경 이력 에 추가 박제. consumed followup: `specs/10.followups/20260421-0846-isadmin-cognito-groups-migration.md` (discovery mv by REQ-038 발행 세션). consumed: REQ-20260421-038 자체. 차기 task carve 대상 (planner 영역): code 재작성 (`isAdmin()` groups claim 판정 + env 경로 제거 + TODO 주석 제거) + `.env.example` 4 행 제거 + 테스트 describe 2 블록 교체 + FR-04 (α/β/γ) 택1 박제. RULE-07 자기검증: 본 교체 불변식은 (a) `cognito:groups` 배열 멤버십 판정, (b) claim 부재 안전 기본값, (c) env 경로 완전 제거, (d) group 이름 간접 참조, (e) 운영 전제 — 모두 평서형, 시점 비의존, 반복 검증 가능. 특정 user pool ID / 특정 username / 특정 group 이름 리터럴 / 전환 전략 (빅뱅 vs 과도기 이중 판정) 배제. | §역할 헤더, §admin gate 계약 (전면 재작성), §회귀 방어 단위 테스트 계약 (d) 교체, §동작, §회귀 중점, §스코프 규칙 (b-1/b-2 교체), §테스트 현황, §수용 기준, §변경 이력, §참고 |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/04/21/req/20260421-common-env-admin-contracts-absorption.md` (REQ-20260421-022).
  - `specs/60.done/2026/04/21/req/20260421-auth-cookie-samesite-rfc6265bis-invariant.md` (REQ-20260421-025).
  - `specs/60.done/2026/04/21/req/20260421-admin-gate-residual-defects-auth-fragment-cookie-maxage-env-empty.md` (REQ-20260421-032).
  - `specs/60.done/2026/04/21/req/20260421-isadmin-cognito-groups-migration.md` (REQ-20260421-038).
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
