# 명세: 인증 (`common.auth()` / Cognito 토큰 추출) 정책

> **위치**:
> - 대상 헬퍼: `src/common/common.js:101-130` (`auth()` 본체), `:145-150` (`isAdmin()`), `:~135-145` (`parseJwt()`)
> - 호출자: `src/App.jsx` (useEffect), `src/common/Navigation.jsx`, `src/common/UserLogin.jsx`, 기타 `isAdmin()` 25+ 위치
> - 영향 테스트: `src/common/common.test.js` (`'test auth'`, `'auth() idempotent cookie result'`)
> - 연계 체크리스트: `docs/testing/app-shell-side-effects-smoke.md` 시나리오 2 (`specs/spec/green/testing/app-shell-side-effects-smoke-spec.md`)
> **유형**: Util (Token extraction + cookie setter) + Policy
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-031(auth) + REQ-20260418-032 반영)
> **상태**: Experimental (신규 spec, 도입 전 + `parseJwt`/`isAdmin` 가드 마감 단계)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260418-auth-token-extraction-url-first-param-bypass.md` (REQ-20260418-031(auth) — `URLSearchParams(href)` 결함 제거) — WIP
> - `specs/requirements/done/2026/04/18/20260418-parsejwt-isadmin-input-guard-fail-safe.md` (REQ-20260418-032 — `parseJwt` 입력 가드 + `isAdmin` fail-safe) — WIP
> - 상류: `specs/requirements/done/2026/04/18/20260418-app-shell-side-effects-runtime-smoke-and-auth-idempotency.md` (REQ-20260418-025, 멱등 계기) / `specs/requirements/done/2026/04/18/20260418-app-render-side-effects-cleanup.md` (REQ-009, useEffect 격리) / `specs/requirements/done/2026/04/18/20260418-env-helper-call-site-sweep-replace-process-env.md` (REQ-026, env 주변 컨텍스트) / `specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md` (REQ-20260418-026, ErrorBoundary 통합 — 본 가드와 보완재)
> - 하류: `specs/requirements/ready/20260418-userlogin-cognito-dev-preview-runtime-smoke-baseline.md` (REQ-035, 운영 검증 묶음)

> 본 문서는 Cognito Hosted UI 콜백 URL 에서 `access_token` / `id_token` 을 추출하여 쿠키에 저장하는 `common.auth()` 의 현재 동작 + 결함 + 목표 정책을 기술하는 SSoT.

---

## 1. 역할 (Role & Responsibility)
Cognito Hosted UI 리다이렉트 후 URL 의 토큰을 추출해 `document.cookie` 로 저장한다. 이후 `isLoggedIn()` / `isAdmin()` 분기의 전제.

- 주 책임:
  - `access_token` 추출 (`?access_token=...` 첫 파라미터 형 또는 `&access_token=...` 후속 파라미터 형)
  - `id_token` 추출 (`#id_token=...` fragment 형)
  - 토큰 cookie 저장 (`setCookie` 경유, secure / sameSite 옵션)
  - 호출 멱등성 보장 — StrictMode 더블 마운트 / 새로고침 / 라우트 전환 시 부작용 0 (REQ-025)
- 의도적으로 하지 않는 것:
  - Cognito Hosted UI 리다이렉트 URL 형태 결정 (외부 시스템)
  - 토큰 갱신 / refresh token 흐름 (별 후보)
  - 토큰 검증 (signature / exp) — `parseJwt` 영역 (별 guard 요구사항)
  - URL fragment 정리 (`history.replaceState` 등) — 별 후보 (app-shell-side-effects-smoke §8 note)
  - PKCE 흐름 — 별 후보
  - 로그인 UI 디자인 — `UserLogin.jsx` 컴포넌트 영역

> 관련 요구사항: REQ-20260418-031(auth) §3 Goals

---

## 2. 공개 인터페이스 (Public Interface)

### 2.1 Arguments
- `auth()`: 인자 없음. `window.location.href` 참조.

### 2.2 반환값
- 반환값 미사용 (void). 부수효과 = cookie set.

### 2.3 Exports
- named: `auth`, `isAdmin`, `isLoggedIn`, `parseJwt`, `setCookie`, `getCookie` (등)

---

## 3. 현재 상태 (As-Is) — 결함 분석

### 3.1 [DONE] `URLSearchParams(href)` 첫 파라미터 누락 결함 (REQ-20260418-031(auth))

> 관련 요구사항: REQ-20260418-031(auth) FR-01 ~ FR-08, US-01 ~ US-03

**결함 (`src/common/common.js:103`)**:
```js
const accessToken = new URLSearchParams(window.location.href).get("access_token");
```

**동작 (RFC URLSearchParams 생성자)**: 입력 전체를 `&` 기준으로 쪼갠다. `?` 를 분리하지 않음. 따라서:
- 입력: `http://localhost:3000/?access_token=AAA#id_token=BBB`
- 첫 키: `http://localhost:3000/?access_token` (`?` 포함 통째로 키 이름)
- `.get("access_token")` → `null` (정확한 key 매칭 실패)

**실 영향**:
- Cognito Hosted UI 가 정상 형태(`?access_token=...`) 로 리다이렉트하는 경우 **토큰 추출 실패**.
- `access_token` cookie 미설정 → `isLoggedIn()` / `isAdmin()` `false` → 운영 admin 진입 차단 가능.

**테스트의 거짓 안전감 (`src/common/common.test.js`)**:
- `'test auth'` (line 85-105) 및 `'auth() idempotent cookie result'` (line 107-159) 가 결함을 우회하려 **선행 더미 파라미터** (`?abcde=abcde&access_token=...`) 사용.
- 우회 패턴 fixture 가 통과해도 첫 파라미터 형 Cognito 리다이렉트에서 결함 감지 불가.

**`id_token` 추출 (정상)**:
- `window.location.href.indexOf("#id_token=")` + `substring` 으로 fragment 에서 추출 — `URLSearchParams` 미사용 → 동일 결함 없음.
- fragment 형 Cognito 리다이렉트 (`#id_token=X&access_token=Y`) 에서는 `access_token` 이 `URLSearchParams(href)` 에 의해 보이지 않지만 `id_token` 은 정상 동작.

### 3.2 연계 테스트
- `src/common/common.test.js:85-105` (`'test auth'`) — 우회 패턴 사용.
- `src/common/common.test.js:107-159` (`'auth() idempotent cookie result'`) — 우회 패턴 + 결함 명시 코멘트.
- `src/App.test.jsx` — `authSpy.mock.calls.length >= 1` 호출 카운트만 어서트 (부수효과 결과 미검증).

### 3.3 [DONE] `parseJwt` 입력 가드 미존재 — `isAdmin` 화이트 스크린 위험 (REQ-20260418-032)

> 관련 요구사항: REQ-20260418-032 FR-01 ~ FR-08, US-01 ~ US-03

**결함 (`src/common/common.js:43-52` `parseJwt`)**:
```js
export function parseJwt (token) {
  var base64Url = token.split('.')[1];     // token undefined → TypeError throw
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/"); // base64Url undefined → TypeError throw
  ...
}
```
- 입력 검증 0. JWT 표준 형식(`header.payload.signature`) 위배 시 즉시 TypeError.

**결함 (`src/common/common.js:137-155` `isAdmin`)**:
```js
if (!isLoggedIn()) { return false; }       // cookie 존재만 체크 — 형식 미검증
const userId = parseJwt(getCookie("access_token")).username;  // 위 throw 전파 가능
```
- `isLoggedIn` 은 `getCookie` 가 truthy 면 true — 손상된 / 비정상 cookie 에서도 `parseJwt` 호출 진입 → throw.

**실 영향**:
- 운영자가 (1) 만료된 쿠키 / (2) 손상된 쿠키 / (3) 디버그 도구로 임의 값 주입 / (4) 다른 OAuth provider 의 형식 다른 토큰을 가진 상태에서 새로고침하면 `<App />` 마운트 시 lazy 컴포넌트(`Navigation`, `SearchInput` 등) 의 `useEffect` 가 `isAdmin()` 호출 → TypeError 전파 → **화이트 스크린 위험**.
- ErrorBoundary 통합 (REQ-20260418-026, done) 은 render 단계 throw 를 잡으나 **passive effect 단계 throw 는 React 동작상 ErrorBoundary 가 잡지 못하는 경우가 있음** → 본 가드가 추가 안전망.

**호출처 (영향 범위)**:
- `src/common/common.js:137-155` (`isAdmin` — parseJwt 무조건 호출)
- `src/Search/SearchInput.jsx:69` / `:80` (useEffect + 렌더 isAdmin)
- `src/common/Navigation.jsx:18` (useEffect isAdmin)
- `src/Monitor/Monitor.jsx:46` (useEffect/렌더 isAdmin)
- `src/File/File.jsx:33` (useEffect isAdmin)
- `src/Comment/Comment.jsx:78` (request 인자 isAdmin)
- 총 6+ 직접 호출처, 25+ 간접/테스트 호출

**테스트 오염 계기**: REQ-025 의 cookie 등가성 테스트가 임의 fixture(`'ZZZ'`) 를 `access_token` 으로 설정 시 `<App />` 의 SearchInput 마운트 effect 가 throw → 후속 describe 까지 오염. 유효 JWT 형식 fixture 로 우회한 상태 — 본 요구사항이 우회 해소.

---

## 4. 목표 정책 (REQ-20260418-031(auth))

> 관련 요구사항: REQ-20260418-031(auth) FR-01 ~ FR-06

### 4.1 토큰 추출 표준 API

**`auth()` 교체 (FR-01)**:
```js
// 현재 (결함)
const accessToken = new URLSearchParams(window.location.href).get("access_token");

// 목표
const accessToken = new URL(window.location.href).searchParams.get("access_token");
```
또는 동등한 표준 API 사용. null 가드 동작 보존.

- `new URL()` 생성자는 `?` 를 정상 분리 → `.searchParams` 가 실제 쿼리 파라미터만 포함.
- 모든 모던 브라우저 지원 (IE 제외, 본 프로젝트 browserslist 충족).

**`id_token` 추출 일관성 (FR-05, Should)**: 현 `indexOf("#id_token=")` + `substring` 방식 유지 또는 `new URL(href).hash` 로 통일. 변경 시 별 케이스 추가 필수 (FR-05). 본 요구사항 In-Scope 는 `access_token` 결함 제거가 우선이며 `id_token` 통일은 Should.

### 4.2 테스트 fixture 정상화 (FR-02, FR-03)

**`'test auth'` fixture 정상화** (FR-02):
- 기존: `?abcde=abcde&access_token=12345#id_token=67890&abcdef=abcdef`
- 목표: `?access_token=12345#id_token=67890` (spec 예시 URL 로 단순화)

**`'auth() idempotent cookie result'` fixture 정상화** (FR-03):
- 기존: `?abcde=abcde&access_token=AAA#id_token=BBB&abcdef=abcdef` + "결함 존재" 코멘트
- 목표: `?access_token=AAA#id_token=BBB` (spec 예시), 우회 코멘트 제거

**신규 회귀 케이스 추가 (FR-04)**:
- 첫 파라미터가 `access_token` 인 URL 에서 `auth()` 호출 후 `getCookie('access_token') === 'AAA'` 어서트.
- 기존 결함이 재등장하면 즉시 red.

### 4.3 grep 회귀 차단 (FR-06, Should)

- `grep -rn "new URLSearchParams(window.location.href)" src/` → 0 lines (result.md 박제).
- (Could, FR-07) ESLint `no-restricted-syntax` — `URLSearchParams` 가 `window.location.href` 또는 유사 인자를 받는 경우 차단. 본 요구사항 In-Scope 는 아님 (별 후보).

### 4.4 운영 스모크 갱신 (FR-08, Could, REQ-025 자매)

- `docs/testing/app-shell-side-effects-smoke.md` 시나리오 2 (Cognito 콜백) URL 형태를 운영 실제 형태 (`?access_token=...&id_token=...` 또는 fragment 형) 로 명시.
- `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md` §3.4 cross-link (inspector 후속, 별 태스크 또는 본 요구사항 머지 후 동시).

### 4.5 `parseJwt` 입력 가드 + `isAdmin` fail-safe (REQ-20260418-032)

> 관련 요구사항: REQ-20260418-032 FR-01 ~ FR-08

**4.5.1 `parseJwt` 입력 가드 (FR-01)**

다음 비정상 입력에 대해 throw 대신 `null` sentinel 반환:

```js
export function parseJwt (token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const base64Url = parts[1];
  if (!base64Url) return null;
  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null; // atob / decodeURIComponent / JSON.parse 실패 흡수
  }
}
```

커버 케이스:
- `token === undefined` / `null` / `''` → `null`
- `token.split('.').length !== 3` (예: `'ZZZ'`, `'header.signature'`) → `null`
- `parts[1]` 이 빈 문자열 / undefined → `null`
- `atob` / `decodeURIComponent` / `JSON.parse` throw → `null` (catch)
- 정상 JWT (`header.payload.signature`) → 기존과 동등한 payload 객체

sentinel 은 `null` 고정 (REQ-032 §13 미결 — `{}` 빈 객체 대안은 기각. 호출부 명시성 선호).

**4.5.2 `isAdmin` fail-safe (FR-02)**

```js
export function isAdmin() {
  if (!isLoggedIn()) return false;
  const payload = parseJwt(getCookie("access_token"));
  if (!payload) return false; // fail-safe — 손상 토큰은 비-admin
  const userId = payload.username;
  // 기존 hard-coded user id 분기 보존 (TODO: IAM authorization)
  return userId === "..." || userId === "..."; // 기존 비교식 보존
}
```

- `parseJwt` 결과가 falsy → `false` 반환 (의심 시 권한 거부).
- 기존 `.username` 비교 분기는 **보존** — 정상 입력 회귀 0 (NFR-03).
- `isLoggedIn()` 동작 보존 — cookie 존재만 체크 (JWT 형식 무관, 기존 시맨틱 유지).

**4.5.3 회귀 단위 테스트 (FR-03, FR-04)**

`src/common/common.test.js` 신규 케이스:
- `parseJwt(undefined)` → `null`
- `parseJwt('')` → `null`
- `parseJwt('ZZZ')` → `null` (점 없음, parts.length === 1)
- `parseJwt('header.signature')` → `null` (parts.length === 2)
- `parseJwt('header.invalid_base64.signature')` → `null` (base64 디코드 실패)
- `isAdmin()` with `setCookie('access_token', 'ZZZ')` → `false` (throw 없음)
- `isAdmin()` with `setCookie('access_token', '')` → `false`
- 기존 `'test parse Jwt token'` 케이스 PASS (정상 입력 회귀 0)

**4.5.4 App 마운트 회귀 테스트 (FR-05)**

`src/App.test.jsx` (또는 `SearchInput.test.jsx`) 신규 케이스:
- `setCookie('access_token', 'ZZZ'); render(<App />)` 후 passive effect flush → 콘솔 에러 0, 빈 화면 0, isAdmin 의존 컴포넌트가 비-admin 모드로 렌더.
- `setCookie('access_token', '')` / `'header.signature'` 동일 시나리오.

**4.5.5 콘솔 noise / dev-only log (FR-06, Should)**

- 가드 발동 시 `console.error` 출력 **0** (운영 noise 금지).
- 필요 시 `process.env.NODE_ENV === 'development'` 분기로 `common.log` 사용 — 기존 패턴 준수. 본 요구사항에서는 Could — planner 가 결정 (REQ-032 §13 미결).

**4.5.6 grep 회귀 차단 (FR-07, Should)**

- `grep -rn "parseJwt(getCookie" src/` → 모든 호출이 fail-safe 흐름 (`parseJwt(...).username` 직접 접근이 남아 있으면 optional chaining 또는 가드 필수).
- 현재 grep 결과 직접 `.username` 접근은 `isAdmin` 1곳만 — 발견 시 본 PR 에서 함께 보정.

**4.5.7 범위 밖 (Out-of-Scope)**

- JWT 서명 검증 (signature verification — 클라이언트 측 검증 의미 약함, 서버 책임).
- 토큰 만료 처리 (`exp` claim 체크 + 자동 갱신 / 자동 정리).
- Cognito refresh_token 흐름.
- ErrorBoundary 가 passive effect throw 를 잡도록 React 19 마이그레이션 (별 트랙).
- `isAdmin` 의 hard-coded user id (`// TODO: change user id hard coding to IAM authorization`) 리팩터 — 별 후보.

---

## 5. 의존성

### 5.1 내부 의존
- `src/common/common.js` — `setCookie`, `getCookie`, `log`
- `src/App.jsx` — useEffect 호출자 (REQ-009)

### 5.2 외부 의존
- 브라우저 `URL` 생성자 / `URLSearchParams` API (WHATWG URL spec)
- `document.cookie` (jsdom + 브라우저)
- AWS Cognito Hosted UI — 리다이렉트 URL 형태 (`?access_token=...&id_token=...` 또는 `?access_token=...#id_token=...`) — 변경 불가

### 5.3 역의존 (사용처)
- `src/App.jsx` (useEffect → `common.auth()`)
- `src/common/Navigation.jsx`, `src/common/UserLogin.jsx`, 기타 `isAdmin()` 25+ 위치

---

## 6. 수용 기준 (Acceptance — REQ-20260418-031(auth))

- [x] `src/common/common.js` `auth()` 가 `new URL(href).searchParams.get('access_token')` (또는 동등 API) 로 교체됨 — `1fc05e9` (TSK `20260420-auth-url-api-fix-req-031`)
- [x] `src/common/common.test.js` 의 `'test auth'` fixture URL 이 spec 예시 형태 (`?access_token=12345#id_token=67890`) 로 정상화 — `1fc05e9`
- [x] `src/common/common.test.js` 의 `'auth() idempotent cookie result'` fixture URL 이 spec 예시 (`?access_token=AAA#id_token=BBB`) 로 정상화 + 우회 코멘트 제거 — `1fc05e9`
- [x] 신규 회귀 케이스 1건 — 첫 파라미터가 `access_token` 인 URL 에서 `getCookie('access_token')` 이 정상 값 반환 — `1fc05e9`
- [x] `grep -rn "new URLSearchParams(window.location.href)" src/` → 0 lines (result.md 박제) — 재실행 확인 (HEAD `5a39ca1`)
- [x] `grep -rn "abcde=abcde" src/` → 0 lines (우회 fixture 패턴 제거) — 재실행 확인 (HEAD `5a39ca1`)
- [x] `npm test` 100% PASS, `npm run lint` 0 warn, `npm run build` PASS — `1fc05e9` pre-commit hook 통과 (hook-ack, `RULE-02` §2.2 `--no-verify` 금지 근거)
- [ ] (Should) `id_token` 추출 일관성 결정 — 변경 시 별 케이스 추가, 미변경 시 사유 코멘트 1줄
- [ ] (Could) 운영자 1회 Cognito Hosted UI 로그인 → 첫 화면 admin 진입 정상 — `docs/testing/cognito-hosted-ui-manual-smoke.md` 참조 (REQ-20260420-008, S-01 / S-02 시나리오 + Baseline 테이블 박제; REQ-035 자매 묶음 또는 별 PR)
- [ ] (Could) `docs/testing/app-shell-side-effects-smoke.md` 시나리오 2 URL 형태 명시 (inspector 후속)

### 6.1 수용 기준 (REQ-20260418-032 — `parseJwt` 가드 + `isAdmin` fail-safe)

- [x] `src/common/common.js` 의 `parseJwt` 가 비정상 입력 (undefined / '' / 'ZZZ' / 'header.signature' / base64 디코드 실패) 에 대해 throw 대신 `null` 반환 — `7daa83a` (TSK `20260420-parsejwt-isadmin-guard-req-032`)
- [x] `src/common/common.js` 의 `isAdmin` 이 `parseJwt` 결과 falsy 시 `false` 반환 (fail-safe) — `7daa83a` (`common.js:159-160` fail-safe 분기 src 실측)
- [x] 기존 `'test parse Jwt token'` 케이스 PASS (정상 입력 회귀 0) — `7daa83a` pre-commit hook PASS (hook-ack)
- [x] `src/common/common.test.js` 에 비정상 토큰 5종 + `isAdmin` 비정상 cookie 2종 회귀 케이스 추가, 모두 PASS — `7daa83a`
- [x] `src/App.test.jsx` (또는 동등 위치) 에 `setCookie('access_token', 'ZZZ'); render(<App />)` 후 throw 0 회귀 케이스 추가, PASS — `7daa83a`
- [x] `npm test` 100% PASS, `npm run lint` 0 warn, `npm run build` PASS — `7daa83a` pre-commit hook 통과 (hook-ack)
- [x] (Should) `grep -rn "parseJwt(getCookie" src/` → 모든 호출이 fail-safe 흐름 (직접 `.username` 접근 시 optional chaining 또는 가드) — 재실행 1 hit `common.js:159` (fail-safe 분기 안쪽, HEAD `5a39ca1`)
- [ ] (Should) 가드 발동 시 `console.error` 출력 0 (운영 noise 금지) — **[deferred: 간접 관측 수단 부재]** grep·hook-ack 4종 패턴 미해당, 주관적 런타임 관찰 필요
- [ ] (Could) 가드 발동 시 dev-only log (`process.env.NODE_ENV === 'development'` 분기)
- [ ] (Could) 운영자 1회 손상 쿠키 시뮬레이션 (DevTools Application → Cookies 수정 → 새로고침) → 화이트 스크린 0 baseline 박제

---

## 7. 비기능 특성 (NFR Status)

| 항목 | 현재 | 목표 | 출처 |
|------|------|------|------|
| 신뢰성 (Cognito 콜백 토큰 추출) | 결함 (첫 파라미터 누락) | 100% (정상 형태 URL 한정) | REQ-031(auth) NFR-01 |
| 보안 (표준 URL API 사용) | 비표준 `URLSearchParams(href)` | `URL().searchParams` | REQ-031(auth) NFR-02 |
| 호환성 (null 가드) | 동작 | 동등 유지 | REQ-031(auth) NFR-03 |
| 유지보수성 (fixture ↔ spec 정합) | drift (우회 패턴) | 정합 (spec 예시 ↔ fixture) | REQ-031(auth) NFR-04 |
| 성능 | 호출당 micros | ±0 (`URL()` vs `URLSearchParams` 차 無시) | REQ-031(auth) NFR-05 |
| 신뢰성 (비정상 토큰 throw 방지) | 5/5 throw | 0/5 throw | REQ-032 NFR-01 |
| 보안 (fail-safe 정책) | `isAdmin` throw 시 미정의 분기 | 의심 시 `false` (권한 거부) | REQ-032 NFR-02 |
| 호환성 (정상 JWT 처리 회귀 0) | baseline | 동등 유지 | REQ-032 NFR-03 |
| 관측가능성 (가드 발동 dev-only log) | 0 | 옵션 (dev 환경 `common.log` 분기) | REQ-032 NFR-04 |
| 유지보수성 (가드 분기 명시) | 암묵적 가정 | 함수 doc 코멘트 + null sentinel 명시 | REQ-032 NFR-06 |

---

## 8. 위험 / 알려진 제약

- `id_token` 추출 일관성 변경 (Should) 시 fragment 처리 회귀 — 별 케이스 추가 (FR-05) 또는 미변경 (사유 코멘트).
- Cognito 운영 URL 형태 가정 오류 가능성 (실제로 fragment 형이 아닐 수 있음) — 운영자 1회 검증 (REQ-035 묶음).
- `?` 가 없는 URL (fragment-only) 입력 시 `new URL().searchParams` 가 빈 객체 반환 → null 가드 동작 (회귀 케이스 추가 권장).
- jsdom 의 `mockLocation = new URL(...)` 패턴 정합 — 기존 fixture 패턴 보존.
- `setCookie` 의 `site` 옵션 표준 attribute 미존재 의심 — 별 후보 (범위 밖).

---

## 9. 변경 이력 (Changelog — via Task)

| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-031(auth)) | `URLSearchParams(window.location.href)` 결함 제거 + 테스트 fixture 정상화 + 신규 회귀 케이스 추가 (WIP) | 3.1, 4, 6 |
| 2026-04-18 | (pending, REQ-20260418-032) | `parseJwt` 입력 가드 (비정상 입력 → `null` sentinel) + `isAdmin` fail-safe (falsy → `false`) + 회귀 케이스 7종 + App 마운트 화이트 스크린 회귀 테스트 (WIP) | 3.3, 4.5, 6.1, 7 |
| 2026-04-20 | (inspector drift reconcile) | §4 헤더 rename: "(To-Be, WIP — REQ-20260418-031(auth))" → "(REQ-20260418-031(auth))" (planner §4 Cond-3 충족, d0d49c6 선례) | 4 |
| 2026-04-20 | (inspector, REQ-20260420-008) | §6 L288 텍스트에 `docs/testing/cognito-hosted-ui-manual-smoke.md` 참조 추가 (Cognito Hosted UI 운영자 수동 스모크 S-01/S-02 baseline 예정). 체크박스 flip 은 운영자 수행 후 별 라운드. | 6 |
| 2026-04-20 | `1fc05e9` (REQ-20260418-031(auth), TSK `20260420-auth-url-api-fix-req-031`) | §3.1 `[WIP]`→`[DONE]` — `new URL(href).searchParams.get('access_token')` 교체 + fixture 정상화 + 회귀 케이스 추가. grep 2종 재실행 0 hits (`URLSearchParams(window.location.href)`, `abcde=abcde`). hook-ack via pre-commit PASS. | 3.1, 6 |
| 2026-04-20 | `7daa83a` (REQ-20260418-032, TSK `20260420-parsejwt-isadmin-guard-req-032`) | §3.3 `[WIP]`→`[DONE]` — `parseJwt` 가드 + `isAdmin` fail-safe (`common.js:157-160` 실측). 회귀 케이스 7종 + App 마운트 throw 0 회귀 PASS. grep 재실행 1 hit `common.js:159` (fail-safe 분기 안쪽). hook-ack via pre-commit PASS. §6.1 L300 "console.error 0" 은 `[deferred: 간접 관측 수단 부재]`. | 3.3, 6.1 |
| 2026-04-20 | (inspector Phase 1 reconcile @ HEAD `5a39ca1`) | §6 수용 기준 7/10 ACK (REQ-031 7/7 Must + hook-ack 1건), §6.1 6/10 ACK (REQ-032 6/7 Must + Should grep 1건). 나머지 3건은 Should(`id_token` 결정) / Could(운영자 baseline) / deferred(console.error 관측 불가). `.inspector-seen` 신규 생성. | 6, 6.1 |

---

## 10. 관련 문서

- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-auth-token-extraction-url-first-param-bypass.md` (REQ-20260418-031(auth))
  - `specs/requirements/done/2026/04/18/20260418-parsejwt-isadmin-input-guard-fail-safe.md` (REQ-20260418-032, parseJwt 가드 + isAdmin fail-safe)
- 상류:
  - `specs/requirements/done/2026/04/18/20260418-app-shell-side-effects-runtime-smoke-and-auth-idempotency.md` (REQ-20260418-025, 결함 표면화 계기)
  - `specs/requirements/done/2026/04/18/20260418-app-render-side-effects-cleanup.md` (REQ-20260418-009, useEffect 격리)
  - `specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md` (REQ-20260418-026, ErrorBoundary 통합 — passive effect 안전망 중복)
- 관련 spec:
  - `specs/spec/green/app/App-spec.md` §5.2.1 (`auth()` 멱등 cookie 등가성)
  - `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md` §3.4 (시나리오 2 Cognito 콜백)
  - `specs/spec/green/common/env-spec.md` (env 주변 컨텍스트 — REQ-032 auth 영역 영향)
- 외부:
  - URL 표준: https://url.spec.whatwg.org/
  - `URLSearchParams` 생성자 동작: https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams
  - Cognito Hosted UI 콜백: https://docs.aws.amazon.com/cognito/latest/developerguide/login-endpoint.html
- 원 followup (이동 후):
  - `specs/followups/consumed/2026/04/18/20260418-2107-auth-url-first-param-bypass.md`
