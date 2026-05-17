# `public/manifest.json` PWA install contract — `start_url` / `display` / `background_color` 3 키 token-typology 정합 시스템 불변식

> **ID**: REQ-20260518-009
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요
`public/manifest.json` 의 PWA install behavior 를 결정하는 3 키 (`start_url`, `display`, `background_color`) 가 각각 W3C Web App Manifest 사양이 정의한 **토큰 형식 분류 (typology)** 를 따른다는 불변식을 박제한다 — (a) `start_url` 은 `string` 타입 + manifest 위치 기준 상대 URL 또는 동일 origin 절대 URL, (b) `display` 는 `string` 타입 + W3C 정의 enum 집합 `{"fullscreen","standalone","minimal-ui","browser"}` 의 한 원소, (c) `background_color` 는 `string` 타입 + CSS `<color>` 문법 (3/4/6/8 hex digit `#` prefix 또는 색명/`rgb()`/`rgba()`). 본 req 는 토큰 분류 게이트 (key 존재 + JSON 타입 + enum/regex 형식) 만 다루며, 값의 **콘텐츠 결정** (예: 왜 `"standalone"` 인지, 왜 `"#ffffff"` 인지) 은 별 axis (UX 정책).

## 배경
- 현재 baseline (HEAD `07151f6`):
  - `public/manifest.json:18` `"start_url": ".",`
  - `public/manifest.json:19` `"display": "standalone",`
  - `public/manifest.json:21` `"background_color": "#ffffff"`
  - `build/manifest.json:18-21` 동일 3 키 byte-for-byte 보존 (Vite `publicDir` 정책).
  - `index.html` 본문에는 본 3 키와 동치 또는 참조 관계가 부재 — `<meta name="theme-color">` 만 manifest `theme_color` 와 양면 동치 (REQ-099 영역).
- 위험: 3 키 모두 **silent fallback 경로**를 가짐 — 브라우저가 enum/형식 위반 값을 만나면 spec-defined default (`display: "browser"`, `background_color: 미적용`, `start_url: manifest 위치`) 로 조용히 fallback 한다. 사용자 / 개발자 모두 install UX 의 미세한 차이 (PWA 가 "standalone" 윈도우 대신 브라우저 탭으로 열림 등) 를 즉시 인지하기 어려워 회귀가 지연 발견된다.
- 미박제 영역:
  - REQ-099 (`30.spec/green/foundation/index-html-public-asset-reference-coherence.md`, green) — `index.html` 정적 자원 참조 4종 + `public/**` 디스크 실재 + `build/**` 보존 + `manifest.json.icons[*].src` 디스크 실재 + `theme_color` 의미 동치 (4 axis). §역할 Out-of-Scope 명시 (line 10): "`manifest.json` 본문의 `short_name` / `name` / `start_url` / `display` / `background_color` 키 값 정합 (별 axis — 본 spec 은 `icons[*].src` + `theme_color` 2 키 한정)" — 본 req 가 정확히 그 별 axis 중 3 키 박제.
  - REQ-20260518-006 (`20.req/20260518-html-title-manifest-name-token-coherence.md`) §목표 Out-of-Scope (line 58): "`manifest.json` 의 다른 키 값 (`start_url` / `display` / `background_color` / `theme_color` / `icons`) — `theme_color` + `icons` 는 REQ-099 영역. `start_url` / `display` / `background_color` 는 본 req scope 외 (별 axis — PWA install behavior contract)." — 본 req 가 그 별 axis 박제.
- 인접 영역 직교성:
  - `theme_color` (`#000000`) — REQ-099 FR-04 양면 동치 (`index.html:6` ↔ `manifest.json:20`) 로 박제 완료. 본 req scope 외.
  - `short_name` / `name` — REQ-20260518-006 (`html-title-manifest-name-token-coherence`) 영역. 본 req scope 외.
  - `icons` — REQ-099 + REQ-20260517-100 (`manifest-icons-sizes-token-disk-coherence`, done) 영역. 본 req scope 외.
- 참고 외부 출처: W3C Web App Manifest Recommendation — `display` enum 집합, `start_url` 정의, `background_color` = CSS `<color>` 문법.

## 목표
- In-Scope:
  - `public/manifest.json` 3 키 (`start_url` / `display` / `background_color`) 의 **존재 + JSON 타입 + 토큰 형식 분류** 게이트 박제.
  - `display` enum 집합 W3C-정의 부분집합 `{"fullscreen","standalone","minimal-ui","browser"}` 의 한 원소 박제.
  - `background_color` 의 CSS `<color>` 문법 부분집합 (`#` + 3/4/6/8 hex digit, 또는 W3C 색명 키워드) 박제. **본 baseline 은 `#` + 6 hex digit 형식 한정** (확장은 spec 갱신 신호).
  - `start_url` 의 JSON 타입 `string` + 비어있지 않음 + manifest scope 호환 형식 (`"."` 또는 `/` prefix 절대 path 또는 동일 origin absolute URL).
  - `build/manifest.json` 의 3 키 값이 `public/manifest.json` 과 byte-for-byte 동치 (Vite `publicDir` 정책 효능).
- Out-of-Scope:
  - 3 키 값의 **콘텐츠 결정** — 왜 `"."` / `"standalone"` / `"#ffffff"` 인지의 UX 정책 정당화 (별 axis: PWA UX 정책).
  - `theme_color` / `short_name` / `name` / `icons` — REQ-099 / REQ-20260518-006 / REQ-20260517-100 기존 영역.
  - W3C Web App Manifest 의 추가 키 (`scope`, `orientation`, `lang`, `dir`, `prefer_related_applications`, `categories`, `screenshots`, `shortcuts`, `id`, `protocol_handlers`, `share_target`, `file_handlers`, `launch_handler` 등) — 현 baseline 에 부재 (별 axis — manifest schema 완전성은 별도 req).
  - Manifest 본문의 **JSON 유효성 자체** — REQ-099 G-F (JSON.parse) 와 효능 공유, 본 req 는 키 단위 typology 한정.
  - 게이트 발화 채널 (pre-commit / pre-push / CI) 선정 — 효능 단정 (불변식) 만 박제.
  - `index.html` ↔ 본 3 키 간 동치/참조 — baseline 에 부재 (`index.html` 은 본 3 키와 무관).
  - 브라우저별 PWA install UI 차이 (Chrome / Safari / Firefox) — 본 req 는 manifest 입력 토큰 한정.
  - `manifest.json` 파일의 위치 / 파일명 / `<link rel="manifest" href="...">` 참조 — REQ-099 FR-01/02 영역.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `public/manifest.json` 본문에 키 `start_url`, `display`, `background_color` 가 모두 존재 (1 hit 씩) — `grep -cE "^\s*\"(start_url\|display\|background_color)\":" public/manifest.json` = **3**. baseline (HEAD `07151f6`) 박제. 등록 수 변동은 spec 갱신 신호. | Must |
| FR-02 | `public/manifest.json.start_url` 은 JSON 타입 `string` + 비어있지 않음 + 다음 형식 중 하나: (a) 정확히 `"."` (manifest 위치 self-relative), (b) `/` prefix 절대 path, (c) 동일 origin absolute URL. baseline 값 = `"."` (case a). | Must |
| FR-03 | `public/manifest.json.display` 은 JSON 타입 `string` + W3C Web App Manifest enum 집합 `{"fullscreen","standalone","minimal-ui","browser"}` 의 정확히 한 원소. baseline 값 = `"standalone"`. enum 외 값은 브라우저가 `"browser"` 로 silent fallback 하므로 형식 게이트 필수. | Must |
| FR-04 | `public/manifest.json.background_color` 은 JSON 타입 `string` + CSS `<color>` 문법 부분집합 — baseline 박제 형식 = `^#[0-9A-Fa-f]{6}$` (`#` + 6 hex digit). baseline 값 = `"#ffffff"`. 본 baseline 은 6-digit hex 한정 (3/4/8 digit 또는 색명/`rgb()` 도입은 spec 갱신 신호). | Must |
| FR-05 | `build/manifest.json` 의 3 키 값이 `public/manifest.json` 의 동일 키 값과 byte-for-byte 일치 — Vite `publicDir` 정책의 효능 박제. baseline 박제 시점 두 파일 line 18/19/21 동일. | Must |
| FR-06 | 본 3 키 중 어느 하나라도 **JSON parse 실패** / **타입 위반** / **enum-or-regex 위반** 이면 게이트 미달로 판정 — 효능 단정 (불변식). | Must |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 멱등성 | 게이트 N 회 반복 실행 시 N 회 동일 verdict — `public/manifest.json` 와 `build/manifest.json` 입력이 동일하면 결과 결정론. |
| NFR-02 | 결과 효능 중립 | 게이트 발화 채널 (pre-commit / pre-push / CI / npm script) 선정은 본 req 비대상. 효능 (`grep` 카운트 + JSON typology + 양면 byte-equal) 만 박제. |
| NFR-03 | 자체 진단 제외 | 본 req / spec / 테스트 본문에 등장하는 `start_url` / `display` / `background_color` 문자열 occurrence 는 FR-01 의 `public/manifest.json` 단일 파일 grep count 와 독립 — 게이트 scope 는 `public/manifest.json` + `build/manifest.json` 2 파일로 한정. |
| NFR-04 | 직교성 | 본 req 의 `theme_color` / `short_name` / `name` / `icons` 미언급 키는 REQ-099 / REQ-20260518-006 / REQ-20260517-100 영역. 본 req 의 게이트 변경은 그 3 req 영역과 충돌하지 않는다. |

## 수용 기준
- [ ] **Given** HEAD `07151f6` (또는 동일 baseline 재현 HEAD), **When** `grep -cE "^\s*\"(start_url\|display\|background_color)\":" public/manifest.json` 실행, **Then** 출력 = **3** + rc=0 (FR-01 baseline 박제).
- [ ] **Given** 동일 HEAD, **When** `public/manifest.json` 를 JSON parse 후 `start_url` 값 추출, **Then** 타입 `string` + 값 = `"."` (FR-02 case a baseline).
- [ ] **Given** 동일 HEAD, **When** `display` 값 추출, **Then** 타입 `string` + `{"fullscreen","standalone","minimal-ui","browser"}` 의 원소 + baseline = `"standalone"` (FR-03 baseline).
- [ ] **Given** 동일 HEAD, **When** `background_color` 값 추출, **Then** 타입 `string` + `^#[0-9A-Fa-f]{6}$` 매치 + baseline = `"#ffffff"` (FR-04 baseline).
- [ ] **Given** 동일 HEAD + `vite build` 산출물 `build/manifest.json` 존재, **When** `public/manifest.json` 와 `build/manifest.json` 의 line 18/19/21 추출 후 비교, **Then** 3 라인 모두 byte-for-byte 일치 (FR-05 baseline).
- [ ] **Given** 가설 회귀 — `display` 를 `"app"` (enum 외) 로 변경, **When** FR-03 enum 게이트 실행, **Then** 게이트 미달 (`"app"` ∉ enum) — silent browser fallback 이 검출됨.
- [ ] **Given** 가설 회귀 — `background_color` 를 `"white"` (CSS 색명, 6-hex 외) 로 변경, **When** FR-04 regex 게이트 실행, **Then** 게이트 미달 (`"white"` ∉ `^#[0-9A-Fa-f]{6}$`) — baseline 형식 확장 신호.
- [ ] **Given** 가설 회귀 — `start_url` 키 삭제, **When** FR-01 grep count 실행, **Then** 출력 = **2** ≠ 3 (FR-01 / FR-06 위반).

## 참고
- baseline HEAD: `07151f6` (master).
- baseline 토큰:
  - `public/manifest.json:18` — `"start_url": "."`.
  - `public/manifest.json:19` — `"display": "standalone"`.
  - `public/manifest.json:21` — `"background_color": "#ffffff"`.
  - `build/manifest.json:18-21` — 동일 3 키 byte-for-byte 보존.
  - `public/manifest.json` 의 `start_url|display|background_color` 키 등록 grep count = **3**.
- 자매 spec / req:
  - `specs/30.spec/green/foundation/index-html-public-asset-reference-coherence.md` (REQ-099, green) — `index.html` 정적 자원 참조 4종 + manifest `icons[*].src` 디스크 실재 + `theme_color` 양면 동치 (4 axis). §역할 OOS 박제 (line 10) 에 본 req 의 3 키가 **별 axis (PWA install behavior contract)** 로 명시적 분리됨.
  - `specs/20.req/20260518-html-title-manifest-name-token-coherence.md` (REQ-20260518-006) — `manifest.json.short_name` + `name` + `<title>` 3 극 동치 axis. §목표 OOS 박제 (line 58) 에 본 req 의 3 키가 **별 axis (PWA install behavior contract)** 로 명시적 분리됨.
  - `specs/60.done/2026/05/18/req/20260517-manifest-icons-sizes-token-disk-coherence.md` (REQ-20260517-100, done) — `manifest.json.icons[*].sizes` 토큰 ↔ `public/**` 픽셀 실재 axis. 본 req 의 3 키 (install contract) 와 axis 분리.
- 외부 출처: W3C Web App Manifest Recommendation — `display` member 의 enum 집합 정의 (`"fullscreen"`, `"standalone"`, `"minimal-ui"`, `"browser"`), `start_url` member 정의 (manifest URL 기준 상대 또는 동일 origin), `background_color` member = CSS `<color>` 문법. 브라우저 (Chrome / Safari / Firefox) 는 enum/형식 위반 시 silent fallback (`display: "browser"`, `background_color: 미적용`, `start_url: manifest 위치`) 한다.
