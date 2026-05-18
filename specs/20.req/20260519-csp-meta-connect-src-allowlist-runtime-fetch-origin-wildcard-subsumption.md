# `index.html` CSP `<meta>` `connect-src` allowlist ↔ runtime `fetch` origin (`VITE_*_API_BASE` consumer 6 모듈) wildcard pattern **subsumption** 결과 효능 시스템 불변식

> **ID**: REQ-20260519-004
> **작성일**: 2026-05-19
> **상태**: Draft

## 개요
`index.html:9` `<meta http-equiv="Content-Security-Policy">` 의 `connect-src` directive 가 박제하는 origin 패턴 집합 (`'self'` 동일 origin + `https://*.execute-api.ap-northeast-2.amazonaws.com` 의 wildcard host pattern) 과, `src/**/api.{js,ts}` 6 모듈이 `import.meta.env.VITE_*_API_BASE` 를 통해 발화하는 production runtime `fetch()` 호출의 origin 집합 사이에는, **production 런타임에서 발화하는 모든 fetch origin 이 CSP allowlist 의 어느 origin 패턴 (literal 또는 wildcard) 에 의해 subsume 된다** 는 1방향 포함 (origin-subsumption) 결과 효능 계약이 성립한다. 본 req 는 이 1방향 포함을 시스템 불변식으로 박제하며, 게이트 발화 채널·정합 회복 수단·env 값 contract 정책은 inspector/planner 영역.

## 배경
- **CSP allowlist 표면** (1 hit):
  - `index.html:9` `<meta http-equiv="Content-Security-Policy" content="... connect-src 'self' https://*.execute-api.ap-northeast-2.amazonaws.com; ...">` — `connect-src` directive 의 origin pattern 2 원소 = {`'self'`, `https://*.execute-api.ap-northeast-2.amazonaws.com`}.
- **Runtime fetch origin 발화 표면** (6 모듈 × 1 BASE consumer = 6 hits, prod path):
  - `src/Log/api.js:5` `const BASE = import.meta.env.VITE_LOG_API_BASE;`
  - `src/Monitor/api.js:3` `const BASE = import.meta.env.VITE_MONITOR_API_BASE;`
  - `src/File/api.ts:3` `const BASE = import.meta.env.VITE_FILE_API_BASE;`
  - `src/Image/api.ts:3` `const BASE = import.meta.env.VITE_IMAGE_API_BASE;`
  - `src/Comment/api.ts:12` `const BASE = import.meta.env.VITE_COMMENT_API_BASE;`
  - `src/Search/api.ts:3` `const BASE = import.meta.env.VITE_SEARCH_API_BASE;`
  - 모든 모듈의 fetch 호출은 `getApiUrl()` 을 통해 `BASE` 를 prefix 로 발화 (예: `src/Log/api.js:14` `await fetch(getApiUrl() + ...)`).
- **선언 표면** (2 hits, env 토큰 단지 선언):
  - `src/types/env.d.ts:4-9` 6 키 (`VITE_LOG_API_BASE` ~ `VITE_SEARCH_API_BASE`).
  - `README.md:8-13` 6 키 동일 (dev 환경 변수 contract).
- **시스템 불변식 진술**: 어느 `VITE_*_API_BASE` (6 키) 가 production build 시점에 평가되어 runtime `fetch()` 의 origin 으로 발화되든, 그 origin 의 host part 는 `connect-src` allowlist 의 wildcard pattern `https://*.execute-api.ap-northeast-2.amazonaws.com` (또는 `'self'`) 에 매치된다. 즉 **`origin(VITE_*_API_BASE) ∈ ⋃ pattern-match(connect-src allowlist) for all 6 keys`** (1방향 포함, set equality 가 아님 — allowlist 는 wildcard 로 더 넓을 수 있음).
- **위반 시 발화**:
  - (a) **CSP 미동기 회귀**: 신규 API 도메인 도입 (예: 별 region migration `*.execute-api.us-east-1.amazonaws.com`) 시 `connect-src` 갱신 누락 → production 첫 fetch 부터 **`Refused to connect to 'https://...' because it violates the following Content Security Policy directive: "connect-src ..."`** 차단 → 모든 API 호출 silent fail (`AbortError` / `TypeError: NetworkError`).
  - (b) **Wildcard pattern drift**: `connect-src` 의 wildcard pattern 이 `*.execute-api.ap-northeast-2.amazonaws.com` → `*.execute-api.amazonaws.com` (region wildcard 확장) 또는 그 반대로 변경되면, 변경 직후엔 통과하지만 향후 BASE 값 변경 시 silently break (test-time MSW 가 fetch 가로채므로 CI 검출 불가).
  - (c) **신규 `VITE_*_API_BASE` 추가**: `src/types/env.d.ts:4-9` 에 7번째 키 추가 + `src/**/api.{js,ts}` 신규 consumer 추가 시, 새 키의 origin 이 기존 wildcard 에 매치되지 않으면 production 차단. 토큰 추가 시 CSP 동기 갱신 의무 부재.
- **본 req 는 결과 효능 (1방향 origin-subsumption + 자체 진단 가능) 만 박제** 하며, 발화 채널 (CI / pre-push / `package.json` `check:*` script / build-time HTML parse + env consumer scan 게이트), 정합 회복 수단 (CSP wildcard 확장 vs BASE 값 마이그레이션 vs CSP enforcement 채널 변경 — meta vs HTTP header), `.env.production` 의 BASE 값 자체 contract (값 무결성 / region pin) 는 inspector/planner 영역.

## 목표
- **In-Scope**:
  - `index.html:9` `connect-src` directive 의 origin pattern 집합 (literal + wildcard 양식 모두) 추출 + `src/**/api.{js,ts}` 의 `VITE_*_API_BASE` consumer 6 모듈 식별 + 두 표면 사이의 1방향 origin-subsumption 결과 효능 계약 박제.
  - baseline hit 분포: CSP `connect-src` directive 1 hit (`index.html:9`) + `VITE_*_API_BASE` consumer 6 hits (`src/{Log,Monitor,File,Image,Comment,Search}/api.{js,ts}` 각 1) + env 선언 6 hits (`src/types/env.d.ts:4-9`) + README 박제 6 hits (`README.md:8-13`).
  - 회귀 분기 3종 (FR-05): (a) CSP 미동기 회귀, (b) wildcard pattern drift, (c) 신규 `VITE_*_API_BASE` 키 추가 시 동기 의무.
  - counting rule 박제: `connect-src` directive 의 origin pattern 만 대상 (다른 directive 의 origin 은 별 axis — img-src 는 REQ-20260518-023, script-src/style-src/font-src/frame-src 는 미박제); runtime fetch origin 은 `import.meta.env.VITE_*_API_BASE` 통한 환경 변수 기반 BASE 만 대상 (hardcoded fetch URL 또는 외부 SDK 의 내부 fetch 는 본 req scope 외).
- **Out-of-Scope**:
  - 발화 채널 (CI / pre-push / 신규 `check:csp-connect-src-fetch-coherence` script / vite plugin build-time guard) 선정.
  - 정합 회복 수단 — CSP allowlist 의 wildcard pattern 확장 vs BASE 값 마이그레이션 (region pin / origin 통합) vs CSP 발화 채널 자체 변경 (HTML `<meta>` → HTTP `Content-Security-Policy` 헤더 — Cloudfront/S3 deploy 채널 contract).
  - `.env.production` / `.env.development` 의 실제 BASE URL **값** contract (region pin / staging vs prod 분리 / 빈 값 dev fallback 정책) — 본 req 는 BASE 값 표면 자체가 아니라 origin 형식 정합만 다룸.
  - 다른 CSP directive — `img-src` cross-surface 정합은 REQ-20260518-023 (pending), `script-src` ↔ `<script src>`, `style-src` ↔ `<style>` / `<link rel="stylesheet">`, `frame-ancestors`, `font-src`, `form-action` 등은 별 axis (동일 패턴 carve 후보).
  - test-time fetch origin (`*.test.local` — `.env.test:4-9`) ↔ CSP 정합 — production CSP enforcement 채널과 무관 (test 환경은 MSW 가 가로채고 CSP meta 자체가 `npm run build` 산출물에만 보존 (REQ-20260518-013 = `csp-meta-dev-strip-prod-preserve`) 되므로 dev/test 발화 표면 부재).
  - `connect-src` directive 의 다른 의미 채널 (WebSocket / Server-Sent Events / `<a ping>` / `navigator.sendBeacon`) — 본 코드베이스는 `fetch()` 만 사용 (baseline 확인됨).
  - vite alias / tsconfig paths 정합 (REQ-20260519-003 영역), env boundary 타입 정합 (`30.spec/blue/foundation/vite-env-boundary-typing.md` 영역) — env 값의 origin 의미 표면과 직교.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | (origin-pattern 집합 추출) `index.html:9` `<meta http-equiv="Content-Security-Policy">` 의 `connect-src` directive 의 origin pattern 토큰 집합 `S_csp` = {`'self'`, `https://*.execute-api.ap-northeast-2.amazonaws.com`} (현 baseline 2 원소). pattern 매칭 의미는 [CSP §6.7.2.8 host-source matching algorithm](https://www.w3.org/TR/CSP3/#host-source-match) 을 따른다 (wildcard label `*.` 는 host part 의 leftmost label 1 회 매치). | Must |
| FR-02 | (runtime fetch origin 식별) `src/**/api.{js,ts}` 6 모듈 (`Log/api.js`, `Monitor/api.js`, `File/api.ts`, `Image/api.ts`, `Comment/api.ts`, `Search/api.ts`) 의 `BASE = import.meta.env.VITE_*_API_BASE` consumer 6 hits 가 production build 시점에 평가되어 발화하는 fetch origin 집합 `S_fetch` 를 식별 가능해야 한다 (build-time 평가는 `vite build` 의 `define` 치환 + `.env.production` 의 BASE 값 결합으로 결정). | Must |
| FR-03 | (1방향 origin-subsumption 계약) **for all** `o ∈ S_fetch`, **exists** `p ∈ S_csp` such that `p` matches `o` per CSP §6.7.2.8 host-source matching algorithm. set equality 가 아니라 1방향 포함 — `S_csp` 는 wildcard 로 더 넓을 수 있음 (vacuous allowlist 위험은 별 axis 로 분리). | Must |
| FR-04 | (env 키 typology 동치) `src/types/env.d.ts:4-9` 의 6 키 = {`VITE_LOG_API_BASE`, `VITE_MONITOR_API_BASE`, `VITE_FILE_API_BASE`, `VITE_IMAGE_API_BASE`, `VITE_COMMENT_API_BASE`, `VITE_SEARCH_API_BASE`} 와 `src/**/api.{js,ts}` 의 BASE consumer 6 hits 의 키 집합은 byte-equal 동치 (env 선언 ↔ consumer 발화 1:1 mapping). 본 axis 는 vite env boundary typing (`30.spec/blue/foundation/vite-env-boundary-typing.md`) 과 직교 (그 spec 은 타입 boundary 만, 본 req 는 키 집합 동치). | Should |
| FR-05 | (회귀 분기 박제) 다음 3 분기 각각에서 본 게이트가 회귀를 검출해야 한다: (a) **CSP 미동기 회귀** — `VITE_*_API_BASE` 의 BASE 값을 `*.execute-api.ap-northeast-2.amazonaws.com` 패턴에서 벗어난 origin (예: `*.execute-api.us-east-1.amazonaws.com`) 으로 변경 시 검출, (b) **wildcard pattern drift** — `connect-src` 의 wildcard pattern 을 임의 변형 (예: region label 제거 / 추가) 시 fetch origin pattern 매칭 결과가 변동되면 검출, (c) **신규 키 추가 시 동기 의무** — `src/types/env.d.ts` 에 7번째 `VITE_*_API_BASE` 키 추가 + 신규 consumer 시 그 origin 이 `S_csp` 어느 패턴에도 매치 안 되면 검출. | Must |
| FR-06 | (counting rule 박제) `connect-src` directive 의 origin pattern 만 대상; `<img src>` / `<script src>` / `<link href>` / CSS `url(...)` / `<form action>` 등 다른 directive 의 origin 은 별 axis. runtime fetch origin 은 `import.meta.env.VITE_*_API_BASE` 통한 BASE prefix 만 대상; hardcoded fetch URL (`fetch("https://...")`) 또는 외부 SDK 의 내부 fetch (`@tanstack/react-query` core fetch 등) 는 별 axis. baseline 측정 시 `.mock.{js,ts}` 6 hits (`*/api.mock.*:6` 또는 `:17`) 는 별 axis — test-time MSW handler 의 BASE prefix 일치 검증은 본 req scope 외. | Must |
| FR-07 | (자체 진단 가능) 본 게이트는 외부 네트워크 호출 없이 정적 표면 (HTML meta parse + AST/regex 기반 BASE consumer 식별 + env 선언 list) 만으로 1방향 포함 판정이 가능해야 한다. `.env.production` BASE 값은 시크릿이므로 게이트 입력 contract 에 포함되지 않을 수 있으며, 그 경우 게이트는 "**production BASE 값이 충족시켜야 할 origin pattern**" (= `S_csp`) 만 박제하고, 실제 BASE 값 검증은 별 axis (deploy 시점 / runtime smoke). | Should |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 결정성 | 동일 입력 (`index.html` + `src/**/api.{js,ts}` + `src/types/env.d.ts` snapshot) 에 대해 게이트 결과가 항상 동일 (외부 네트워크 / 시간 의존성 0). |
| NFR-02 | 가독성 | 회귀 메시지에 위반 origin pattern + 위반 consumer 파일:line + 매치 시도된 CSP pattern 후보가 박제되어 inspector/planner 가 단독 진단 가능. |
| NFR-03 | 직교성 | 본 req 의 게이트 발화는 (a) REQ-20260518-023 (`csp-img-src-allowlist-src-external-domain-token-coherence`, pending) — `img-src` directive 한정, (b) `30.spec/green/foundation/csp-meta-dev-strip-prod-preserve.md` (REQ-20260517-098, green) — CSP meta 의 dev/prod 비대칭 보존, (c) `30.spec/blue/foundation/vite-env-boundary-typing.md` — env 타입 boundary, (d) REQ-20260519-003 (`vite-alias-tsconfig-paths-module-resolution-tri-axis-coherence`, pending) — alias 정합과 각각 직교 영역. 게이트 변경은 위 4 영역과 충돌하지 않는다. |
| NFR-04 | 시점 의존성 0 | 본 req 는 특정 incident / 릴리스 / 날짜에 귀속된 patch 가 아니라, **반복 검증 가능한 시스템 불변식** (origin-subsumption 1방향 포함) 만 박제. RULE-07 양성 기준 충족. |

## 수용 기준
- [ ] **Given** baseline (`index.html:9` `connect-src 'self' https://*.execute-api.ap-northeast-2.amazonaws.com` + `src/**/api.{js,ts}` 6 BASE consumer + `.env.production` 의 BASE 값들이 `*.execute-api.ap-northeast-2.amazonaws.com` 패턴 매치), **When** 1방향 origin-subsumption 게이트 실행, **Then** 6 consumer 의 origin 모두 CSP wildcard pattern 에 의해 subsume 되어 게이트 통과 (rc=0).
- [ ] **Given** 가설 회귀 (FR-05 case a) — `.env.production` 의 임의 1 BASE 값을 `https://api.us-east-1.example.com` 으로 변경, **When** 게이트 실행, **Then** 해당 BASE consumer 의 origin 이 어느 CSP pattern 에도 매치 안 됨을 검출 + 위반 위치 (`src/<X>/api.{js,ts}:<line>` + 위반 origin + 매치 시도된 CSP pattern 후보) 박제 + rc≠0.
- [ ] **Given** 가설 회귀 (FR-05 case b) — `index.html:9` 의 `connect-src` directive 에서 `*.execute-api.ap-northeast-2.amazonaws.com` 패턴을 제거, **When** 게이트 실행, **Then** 6 consumer 모두 (BASE 값이 ap-northeast-2 패턴 매치를 전제하므로) 어느 CSP pattern 에도 매치 안 됨을 검출 + rc≠0.
- [ ] **Given** 가설 회귀 (FR-05 case c) — `src/types/env.d.ts` 에 7번째 `VITE_NEW_API_BASE` 추가 + `src/New/api.ts` 신규 consumer 추가 + 그 BASE 값이 `https://new-api.different-host.com` 으로 설정, **When** 게이트 실행, **Then** 신규 consumer 의 origin 이 어느 CSP pattern 에도 매치 안 됨을 검출 + rc≠0.
- [ ] **Given** baseline + counting rule (FR-06) — `.mock.{js,ts}` 6 hits 는 test-time 만 발화, **When** 게이트 실행 시 mock 표면이 baseline 에서 제외됨을 확인, **Then** mock BASE consumer 6 hits 가 게이트 입력에서 OOS 처리되어 rc=0 (mock 표면 변경이 본 게이트를 가짜 발화시키지 않음).

## 참고
- **코드 표면**:
  - `index.html:9` — CSP meta + `connect-src 'self' https://*.execute-api.ap-northeast-2.amazonaws.com` (1 hit).
  - `src/types/env.d.ts:4-9` — 6 `VITE_*_API_BASE` 키 선언 (`readonly ...: string`).
  - `src/Log/api.js:5`, `src/Monitor/api.js:3`, `src/File/api.ts:3`, `src/Image/api.ts:3`, `src/Comment/api.ts:12`, `src/Search/api.ts:3` — 6 `BASE = import.meta.env.VITE_*_API_BASE` consumer.
  - `src/Log/api.js:14,18,22,33,55,65`, `src/File/api.ts:10,14,18,22,30`, `src/Image/api.ts:11,15`, `src/Comment/api.ts:19,23`, `src/Search/api.ts:13`, `src/Monitor/api.js:14,18,22,26` — `await fetch(getApiUrl() + ...)` 발화 사이트.
  - `README.md:8-13` — 6 키 README 박제.
- **관련 spec / req (직교)**:
  - `specs/20.req/20260518-csp-meta-img-src-allowlist-src-external-domain-token-coherence.md` (REQ-20260518-023, pending) — `img-src` directive 한정, `:37,43` 에 `connect-src` 별 axis 박제됨 (본 req 의 사전 carve 근거).
  - `specs/30.spec/green/foundation/csp-meta-dev-strip-prod-preserve.md` (REQ-20260517-098, green) — CSP meta 의 dev strip / prod preserve 비대칭. 본 req 는 prod path 만 다루므로 dev strip 의존성 부재.
  - `specs/30.spec/blue/foundation/vite-env-boundary-typing.md` — env 키 타입 boundary 박제 (`:55-60` 6 키). 본 req 는 키 값의 origin 의미 정합으로 직교.
  - `specs/20.req/20260519-vite-alias-tsconfig-paths-module-resolution-tri-axis-coherence.md` (REQ-20260519-003, pending) — alias 정합. env origin 정합과 직교.
- **외부 사양**:
  - [W3C Content Security Policy Level 3, §6.7.2.8 host-source matching algorithm](https://www.w3.org/TR/CSP3/#host-source-match) — wildcard label (`*.`) 매칭 규칙 (leftmost label 1 회 매치 + 다른 label 정확 일치).
  - [MDN: CSP `connect-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/connect-src) — `fetch()` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `<a ping>` / `Navigator.sendBeacon()` 발화 채널.
