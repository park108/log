# `index.html` `<title>` ↔ `public/manifest.json` `short_name` ↔ `public/manifest.json` `name` PWA 사이트 타이틀 토큰 3극 정합 시스템 불변식

> **ID**: REQ-20260518-004
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요
PWA 의 사이트 타이틀 토큰 `"park108.net"` 은 **3 곳** 에서 동시에 사용된다 — (a) `index.html:13` `<title>park108.net</title>` (HTML document title — 브라우저 탭/창 제목 + 검색 결과 페이지 타이틀 + 북마크 기본 라벨), (b) `public/manifest.json:2` `"short_name": "park108.net"` (W3C Web App Manifest `short_name` — PWA 설치 시 홈스크린/앱 아이콘 short label), (c) `public/manifest.json:3` `"name": "park108.net"` (W3C Web App Manifest `name` — PWA 설치 prompt + 설치 후 application chooser/list 의 full label). 3 곳의 타이틀 토큰이 **byte-for-byte 동치 (`"park108.net"`)** 가 아니면 — (a) ↔ (b/c) 불일치 시 브라우저 탭과 PWA 홈스크린 라벨이 silently 다른 텍스트로 노출, (b) ↔ (c) 불일치 시 manifest `name`/`short_name` 의 length-based 채널 분기 정책 (W3C Web App Manifest §6.6 — UA 가 표시 공간에 따라 short_name 선호) 이 의도와 다른 타이틀 분기를 발화. 본 req 는 3 극 토큰 동치 + baseline hit 분포 (`index.html` `<title>` 1 + `manifest.json` `short_name` 1 + `manifest.json` `name` 1) + selector 형태 정합 (`<title>...</title>` element / JSON 문자열 키 값) 의 **결과 효능 계약** 을 시스템 불변식으로 박제할 것을 요청한다. 본 req 는 결과 효능 (3 극 토큰 동치 + 자체 진단 가능) 만 박제하며, 발화 채널 (CI / pre-push / `package.json` `check:*` script) 선정 및 토큰 일관 갱신 수단 (단일 상수 추출 vs literal 동치 유지) 선택은 inspector/planner 영역.

## 배경
- HEAD `f0eee82` 실측 — `index.html:13` `<title>park108.net</title>` (1 hit) + `public/manifest.json:2` `"short_name": "park108.net"` (1 hit) + `public/manifest.json:3` `"name": "park108.net"` (1 hit) 3 hit 분포가 동일 사이트 타이틀 토큰 `park108.net` 으로 정착되어 있으나 3 극 토큰 동치 박제 부재.
- 토큰 별 의미 매핑:
  - 채널 H (`index.html:13`, HTML element scope): `<title>park108.net</title>` — HTML Living Standard §4.2.2 `<title>` element 의 text content. 브라우저 탭/창 제목 + 검색엔진 SERP 페이지 타이틀 + browser default 북마크 라벨로 노출.
  - 채널 S (`public/manifest.json:2`, JSON key scope): `"short_name": "park108.net"` — W3C Web App Manifest §6.7 `short_name` 키. PWA 설치 시 홈스크린/launcher 의 short label (UA 가 짧은 표시 공간에서 선호하는 후보).
  - 채널 N (`public/manifest.json:3`, JSON key scope): `"name": "park108.net"` — W3C Web App Manifest §6.6 `name` 키. PWA 설치 prompt + 설치 후 application chooser/task switcher 의 full label.
- 3 극 토큰 동치 baseline 상태 (HEAD `f0eee82`):
  - 채널 H 토큰 = `park108.net` (HTML text content, `index.html:13` `<title>...</title>` 내부 text node, 11 byte ASCII literal).
  - 채널 S 토큰 = `park108.net` (JSON string value, `public/manifest.json:2` `"short_name"` 의 value, 11 byte ASCII literal).
  - 채널 N 토큰 = `park108.net` (JSON string value, `public/manifest.json:3` `"name"` 의 value, 11 byte ASCII literal).
  - **3 극 토큰 동치 PASS** (`park108.net` ≡ `park108.net` ≡ `park108.net`) — 의미적 분기 없음.
- 잠재 회귀 시나리오 (현재 baseline 위반 0 이나 미래 변경에서 발생 가능):
  - (R-1) `index.html:13` `<title>park108.net</title>` → `<title>park108 blog</title>` 변경 + `manifest.json` 미변경 → 채널 H ≠ 채널 S = 채널 N → 브라우저 탭 = "park108 blog" / PWA 홈스크린 라벨 = "park108.net" → SEO 크롤러 / 소셜 카드 / 북마크 라벨 분기 (Google Search Central — `<title>` 은 SERP page title 후보).
  - (R-2) `public/manifest.json:2` `"short_name": "park108.net"` → `"short_name": "p108"` 변경 + `<title>` / `name` 미변경 → 채널 S ≠ 채널 H = 채널 N → PWA 홈스크린 short label 만 silently 다른 텍스트 노출 → installed PWA UX 분기.
  - (R-3) `public/manifest.json:3` `"name": "park108.net"` → `"name": "park108.net Journal"` 변경 + `<title>` / `short_name` 미변경 → 채널 N ≠ 채널 H = 채널 S → PWA 설치 prompt + application chooser 만 silently 다른 텍스트 노출 → 설치 시점 UX 분기 (사용자가 설치 후 short_name 과 name 의 분기 인식).
  - (R-4) `index.html:13` `<title>` 노드 자체 삭제 → 채널 H hit 0 → 브라우저 탭 = URL fallback 노출 / SEO SERP page title = URL fallback → SEO 회귀 (HTML Living Standard §4.2.2 — `<title>` element required for non-iframe documents).
  - (R-5) `public/manifest.json` 의 `short_name` 또는 `name` 키 자체 삭제 → 채널 S 또는 채널 N hit 0 → W3C Web App Manifest §6.6/§6.7 — `name` 부재 시 UA fallback (`short_name` 우선 → 없으면 URL host) / `short_name` 부재 시 UA fallback (`name` 우선 → 없으면 URL host) → PWA 설치 UX 회귀.
  - (R-6) JSON key 형태 변경 (예: `"short_name": "park108.net"` → `'short_name': 'park108.net'` single quote literal — JSON spec 위반) → JSON parse 실패 → manifest 전체 무효 (REQ-099 G-F JSON parse 게이트 위반).
- 자매 spec 격리:
  - REQ-099 `foundation/index-html-public-asset-reference-coherence.md` (green) — `index.html` 의 4종 정적 자원 참조 (`<meta name="theme-color">` + 3종 `<link>`) ↔ `public/**` ↔ `build/**` 3-축 정합 + `manifest.json` `icons[*].src` + `theme_color` 2 키 양면 동치. §역할 Out-of-Scope 명시: "`manifest.json` 본문의 `short_name` / `name` / `start_url` / `display` / `background_color` 키 값 정합 (별 axis — 본 spec 은 `icons[*].src` + `theme_color` 2 키 한정)" — 본 req 가 정확히 그 별 axis (`short_name` + `name` 2 키 + `<title>` 양면 동치) 박제.
  - REQ-100 `foundation/manifest-icons-sizes-token-disk-coherence.md` (blue) — manifest `icons[*].sizes` 토큰 ↔ 자원 픽셀 axis. `icons` 배열 영역으로 본 req (`short_name` + `name` top-level 키) 와 직교.
  - REQ-098 `foundation/csp-meta-dev-strip-prod-preserve.md` (green) — `index.html:9` CSP meta dev/prod 비대칭 axis. `<meta http-equiv="Content-Security-Policy">` element 영역으로 본 req (`<title>` element) 와 직교.
  - REQ-20260518-001 `foundation/meta-robots-robotstxt-policy-semantic-coherence.md` (60.done) — meta robots ↔ robots.txt 양면 의미 동치 axis. `<meta name="robots">` element 영역으로 본 req 와 직교.
  - REQ-20260518-002 `20.req/20260518-index-html-root-mount-id-token-coherence.md` — `<div id="root">` 3 극 정합 axis. mount node ID 토큰 영역으로 본 req (사이트 타이틀 토큰) 와 직교.
  - REQ-20260518-003 `20.req/20260518-meta-description-default-fallback-token-coherence.md` — `<meta name="description">` ↔ `DEFAULT_META_DESCRIPTION` 양면 axis. description text content 영역으로 본 req 와 직교.
  - REQ-094 `components/app.md` (blue) — `src/index.jsx` 부트 비콘 4 불변식. `src/index.jsx` 영역으로 본 req (`index.html` `<title>` element + `public/manifest.json`) 와 직교.
- 별 channel 박제 (본 req scope 외):
  - `src/common/common.ts:5,8` `document.title = title + " - park108.net"` — runtime `document.title` suffix (사이트 타이틀의 후미 토큰). 본 req 의 정적 metadata 3 극 동치 axis 와 별 axis (runtime `document.title` 의 page-prefix + suffix 합성 contract). `park108.net` 토큰이 suffix 로 등장하나 본 req 는 production HTML static `<title>` element 의 text content + manifest 의 `short_name`/`name` 키 값 3 극 동치 한정.
  - `src/App.jsx:78` `<a href={common.getUrl()}>park108.net</a>` + `src/common/Navigation.tsx:45` 동일 — UI footer/navigation 의 anchor text. 본 req scope 외 (별 axis — Navigation anchor text).
  - `src/common/common.ts:12` `DEFAULT_META_DESCRIPTION = "park108.net is a personal journal of Jongkil Park the developer"` — meta description literal 의 prefix 토큰. REQ-20260518-003 영역.
  - `src/common/common.ts:71` `return "https://www.park108.net/"` — URL host. 별 axis (production URL host token).
- 외부 출처:
  - W3C HTML Living Standard §4.2.2 `<title>` element (https://html.spec.whatwg.org/multipage/semantics.html#the-title-element) — non-iframe documents require `<title>`, text content used as browser tab/window title + SERP page title default.
  - W3C Web App Manifest §6.6 `name` member (https://www.w3.org/TR/appmanifest/#name-member) — primary identifier of the web application; UA preference: install prompt, application chooser, task switcher.
  - W3C Web App Manifest §6.7 `short_name` member (https://www.w3.org/TR/appmanifest/#short_name-member) — directory of applications, where space for the name might be limited; UA preference: home screen, launcher.
  - Google Search Central — Control your title links in search results (https://developers.google.com/search/docs/appearance/title-link) — `<title>` content 가 SERP page title 의 primary 후보.

## 목표
- In-Scope:
  - `index.html` `<title>park108.net</title>` ↔ `public/manifest.json` `"short_name": "park108.net"` ↔ `public/manifest.json` `"name": "park108.net"` 3 극 사이트 타이틀 토큰 동치 (`park108.net` byte-for-byte) 의 결과 효능 계약 spec 박제.
  - 자체 진단 채널 (HTML `<title>` text content 추출 + manifest JSON parse + `short_name`/`name` 값 추출 + 3 극 동치 비교 fixture 또는 동등) 의 존재 계약 박제.
  - HEAD `f0eee82` baseline 측정: 채널 H = 1 hit (`index.html:13`) / 채널 S = 1 hit (`manifest.json:2`) / 채널 N = 1 hit (`manifest.json:3`) → 3 극 토큰 동치 만족.
  - build artifact 보존 (`build/index.html` `<title>` 보존 + `build/manifest.json` byte-equal — REQ-099 G-C / G-F 와 동치 보존).
  - 시점 비의존 (HTML5 spec 갱신 · Web App Manifest spec 갱신 · `index.html` 리팩토링 · `public/manifest.json` 키 갱신 등 이벤트 직후에도 동일 측정 결과 효능 유지).
- Out-of-Scope:
  - 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `package.json` `check:site-title-token-coherence` script) 선정 — 수단 위임 (inspector/planner 영역).
  - 토큰 일관 갱신 수단 선택 — 단일 상수 추출 (예: `public/manifest.json` 을 SSOT 로 두고 `<title>` 을 build-time 주입) vs literal 동치 유지 / 어느 채널을 진실 공급원으로 둘지 — 수단 중립, inspector/planner 영역.
  - `<title>` 의 dynamic page-prefix 합성 (`src/common/common.ts:5,8` `document.title = title + " - park108.net"`) — runtime `document.title` 의 suffix 합성 contract 는 별 axis. 본 req 는 production HTML static `<title>` element 의 초기 text content + manifest 의 `short_name`/`name` 키 값 한정.
  - `manifest.json` 의 다른 키 값 (`start_url` / `display` / `background_color` / `theme_color` / `icons`) — `theme_color` + `icons` 는 REQ-099 영역. `start_url` / `display` / `background_color` 는 본 req scope 외 (별 axis — PWA install behavior contract).
  - `<meta property="og:title">` / `<meta name="twitter:title">` 등 social card title meta — 현 baseline 부재. 도입 시 본 spec 갱신 신호 (4번째 채널).
  - SEO content 자체의 정합성 (예: `<title>` 텍스트의 길이 제한 / 검색엔진 가독성) — 본 req 는 토큰 동치만 박제, 콘텐츠 품질은 외부 결정.
  - 다국어/locale 별 `<title>` 분기 — 현 baseline 단일 locale (`<html lang="en">`). 도입 시 본 spec 갱신 신호.
  - 테스트 fixture 의 `park108.net` 토큰 (`src/App.test.jsx`, `src/common/Navigation.test.tsx`, `src/common/common.test.ts`, `src/common/UserLogin.test.tsx`, `src/Log/LogItem*.test.jsx`) — 테스트 영역의 occurrence 는 production `<title>` / `manifest.json` 과 별 scope. 본 req 의 게이트 scope 는 `index.html` 단일 파일 + `public/manifest.json` 단일 파일 (production 정적 metadata 한정).

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `index.html` 의 `<title>...</title>` 등록 hit 수 baseline = **1** (`grep -cE '<title>.*</title>' index.html` → 1). 등록 hit 수 변경 (0 또는 2 이상) 은 본 spec 갱신 신호 — HTML Living Standard §4.2.2 에 의해 `<title>` element 는 document head 에 single occurrence (non-iframe documents required, 추가 occurrence 는 무효). | Must |
| FR-02 | `public/manifest.json` 의 `"short_name"` 키 등록 hit 수 baseline = **1** (`grep -cE '"short_name"\s*:' public/manifest.json` → 1). W3C Web App Manifest §6.7 — `short_name` 은 manifest 의 top-level optional key (단일 occurrence). | Must |
| FR-03 | `public/manifest.json` 의 `"name"` 키 등록 hit 수 baseline = **1** (`grep -cE '"name"\s*:' public/manifest.json` → 1). W3C Web App Manifest §6.6 — `name` 은 manifest 의 top-level optional key (단일 occurrence). 단, `icons[*]` 객체 내부의 다른 `"name"` 키가 도입되면 grep hit 가 증가하여 본 spec 갱신 신호 (현 baseline `icons` 배열은 `src` / `sizes` / `type` / `purpose` 키만 사용 — `name` 키 부재). | Must |
| FR-04 | **3 극 사이트 타이틀 토큰 동치 게이트** — FR-01 (`<title>` text content), FR-02 (`manifest.json.short_name` value), FR-03 (`manifest.json.name` value) 의 토큰이 **byte-for-byte 동치** (`park108.net` ≡ `park108.net` ≡ `park108.net`). baseline HEAD `f0eee82` 측정: 3 극 모두 `park108.net` (11 byte ASCII literal) → **3 극 토큰 동치 PASS**. 단방향 분기 (예: H="park108.net" ∧ S="park108.net" ∧ N="park108.net Journal" 등) 는 본 spec 위반. 추출 방법: HTML `<title>` text node value (HTML parser 또는 `sed -nE 's/.*<title>(.*)<\/title>.*/\1/p'`) + JSON parse `manifest.json` 후 `.short_name` + `.name` 키 값 → 3 토큰 byte-for-byte 비교. | Must |
| FR-05 | `npm run build` 후 `build/index.html` 의 `<title>` text content 보존 = `park108.net` (`grep -cE '<title>park108\.net</title>' build/index.html` → 1) + `build/manifest.json` 의 `short_name`/`name` 보존 = `park108.net` (`diff public/manifest.json build/manifest.json` → 0 lines, REQ-099 G-F 와 동치 보존). Vite build 가 사이트 타이틀 토큰을 변형하지 않는다는 build artifact 보존 axis. | Should |
| FR-06 | `public/manifest.json` 의 `"short_name"` value 와 `"name"` value 가 등치하지 않은 경우 (예: 의도된 `short_name` = "p108" / `name` = "park108.net") 도 W3C Web App Manifest spec 상 허용되나, 본 spec 의 baseline 은 등치 (`park108.net` ≡ `park108.net`) 박제. 분기 도입 시 본 spec 갱신 신호 (3 극 동치 → 2+1 분기 axis 로 spec 재정의 필요). | Should |
| FR-07 | FR-01·FR-02·FR-03·FR-04·FR-05 5 조건의 회귀는 자동 검출 채널 (HTML parse + JSON parse + 토큰 추출 + 동치 비교 fixture 또는 동등) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 선정은 수단 영역, "발화 채널이 존재해야 한다" 는 계약 자체는 박제. | Should |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 결정론 | 동일 HEAD 상에서 FR-01·FR-02·FR-03·FR-04 의 grep + JSON parse + 토큰 추출 + 동치 비교 결과가 N 회 반복 시 N 회 동일 rc + 동일 출력. build artifact 측정 (FR-05) 은 `npm run build` 1 회 후 N 회 read-only 측정. |
| NFR-02 | 멱등성 | 본 게이트는 read-only — `index.html` / `public/manifest.json` / `build/**` 파일을 수정하지 않는다. `build/**` 재생성은 게이트 실행의 부수효과로 허용되나 본 spec 자체는 build 명령 강제하지 않음 (수단 영역). |
| NFR-03 | 성능 | (a) FR-01 grep < 50 ms. (b) FR-02 + FR-03 grep < 50 ms. (c) FR-04 토큰 추출 + 동치 비교 < 200 ms (JSON parse 포함). (d) 전체 게이트 < 30 s (build 시간 포함 시) / < 1 s (build artifact 존재 가정 시). |
| NFR-04 | 자체 진단 제외 | 본 req / 본 spec / 테스트 문서의 본문 내 `park108.net`, `<title>`, `short_name`, `name` 등 문자열 occurrence 는 FR-01 의 `index.html` grep count 1 + FR-02·FR-03 의 `manifest.json` grep count 1+1 과 독립 — 게이트 scope 는 `index.html` 단일 파일 + `public/manifest.json` 단일 파일 + `build/index.html` + `build/manifest.json` 으로 한정. 테스트 fixture (`src/App.test.jsx` 등의 `park108.net` 토큰) 는 게이트 scope 외 (`*.test.*` 파일 제외 패턴, `src/**` 영역 외). |
| NFR-05 | 외부 비파괴 | 본 효능 도입은 `index.html` / `public/manifest.json` 의 src 외 변경 동반 없음 — 단, FR-07 의 발화 채널 부착 수단 (예: `package.json` 의 `check:*` script 추가 또는 husky hook 부착) 은 본 spec 의 In-Scope 가 아닌 수단 영역. |
| NFR-06 | 채널 의미 분리 | 채널 H (HTML element scope, 브라우저 탭/SERP/북마크 라벨) ↔ 채널 S (manifest `short_name`, PWA 홈스크린/launcher) ↔ 채널 N (manifest `name`, PWA 설치 prompt/application chooser) 의 의미 분리는 본 spec 의 행동 평서문에 포함되되 어느 채널의 우선순위 라벨 ("기본" / "권장" / "진실 공급원") 박제 금지 — 수단 중립. 3 채널은 발화 단계 (HTML 파싱 / PWA 설치 / PWA 설치 후 chooser) 가 독립이나 본 spec 은 **사이트 타이틀 토큰 동치** axis 만 박제. |
| NFR-07 | 시점 비의존 | FR-01·FR-02·FR-03·FR-04 는 HTML5 spec 갱신 · Web App Manifest spec 갱신 · `index.html` 마크업 정렬 변경 · `public/manifest.json` 키 재정렬 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 4 조건 동시 만족 회복 또는 본 spec 갱신. |

## 수용 기준
- [ ] Given HEAD `f0eee82` baseline, When `grep -cE '<title>.*</title>' index.html` 실행, Then **출력 = 1 + rc=0** (FR-01).
- [ ] Given HEAD `f0eee82` baseline, When `grep -cE '"short_name"\s*:' public/manifest.json` 실행, Then **출력 = 1 + rc=0** (FR-02).
- [ ] Given HEAD `f0eee82` baseline, When `grep -cE '"name"\s*:' public/manifest.json` 실행, Then **출력 = 1 + rc=0** (FR-03).
- [ ] Given `index.html:13` `<title>park108.net</title>` ∧ `public/manifest.json:2` `"short_name": "park108.net"` ∧ `public/manifest.json:3` `"name": "park108.net"`, When HTML `<title>` text content 추출 + JSON parse `.short_name` + JSON parse `.name` → 3 토큰 byte-for-byte 비교, Then **3 토큰 모두 `park108.net` 동치 + 동치 비교 PASS** (FR-04).
- [ ] Given `npm run build` 산출, When `grep -cE '<title>park108\.net</title>' build/index.html`, Then **출력 = 1** 그리고 `diff public/manifest.json build/manifest.json` → **0 lines** (FR-05, REQ-099 G-F 와 동치 보존).
- [ ] Given 회귀 가설 (R-1): `index.html:13` `<title>park108.net</title>` → `<title>park108 blog</title>` 변경, When 본 게이트 실행, Then **채널 H 토큰 = `park108 blog` ∧ 채널 S/N 토큰 = `park108.net` → 3 극 동치 분기 검출 (FR-04 위반, rc=1)**.
- [ ] Given 회귀 가설 (R-2): `public/manifest.json:2` `"short_name": "park108.net"` → `"short_name": "p108"` 변경, When 본 게이트 실행, Then **채널 S 토큰 = `p108` ∧ 채널 H/N 토큰 = `park108.net` → 3 극 동치 분기 검출 (FR-04 위반, rc=1)**.
- [ ] Given 회귀 가설 (R-3): `public/manifest.json:3` `"name": "park108.net"` → `"name": "park108.net Journal"` 변경, When 본 게이트 실행, Then **채널 N 토큰 = `park108.net Journal` ∧ 채널 H/S 토큰 = `park108.net` → 3 극 동치 분기 검출 (FR-04 위반, rc=1)**.
- [ ] Given 회귀 가설 (R-4): `index.html:13` `<title>` 노드 삭제, When 본 게이트 실행, Then **FR-01 grep count = 0 (감소 검출, rc=1)**.
- [ ] Given 회귀 가설 (R-5): `public/manifest.json` 의 `"short_name"` 키 삭제, When 본 게이트 실행, Then **FR-02 grep count = 0 (감소 검출, rc=1)**.
- [ ] Given 회귀 가설 (R-6): `public/manifest.json` 의 JSON quote 형태 변경 (`"short_name"` → `'short_name'`), When 본 게이트 실행 + JSON parse, Then **JSON parse 실패 (rc=1)** — REQ-099 G-F 게이트와 동치 (manifest 자체가 무효화).
- [ ] Given 동일 HEAD `f0eee82`, When 본 게이트 N 회 실행, Then **N 회 동일 rc + 동일 출력** (NFR-01 결정론).
- [ ] Given 본 게이트 실행, When `index.html` / `public/manifest.json` / `build/**` 파일 mtime 측정, Then **mtime 변경 없음** (NFR-02 멱등성).

## 참고
- 자매 spec: `specs/30.spec/green/foundation/index-html-public-asset-reference-coherence.md` (REQ-099, green) — `index.html` 정적 자원 참조 4 hit + `manifest.json.icons[*].src` + `theme_color` 2 키 양면 동치. **§역할 Out-of-Scope 명시: "`manifest.json` 본문의 `short_name` / `name` / `start_url` / `display` / `background_color` 키 값 정합 (별 axis — 본 spec 은 `icons[*].src` + `theme_color` 2 키 한정)"** — 본 req 가 그 별 axis (`short_name` + `name` + `<title>` 3 극 동치) 박제. REQ-099 G-F 의 JSON parse + byte-equal 게이트와 본 req 의 build artifact 보존 (FR-05) 은 동일 효능 공유 (manifest valid + byte-equal).
- 자매 spec: `specs/30.spec/blue/foundation/manifest-icons-sizes-token-disk-coherence.md` (REQ-100, blue) — manifest `icons[*].sizes` 토큰 axis. `icons` 배열 영역으로 본 req (`short_name` + `name` top-level 키) 와 직교.
- 자매 spec: `specs/30.spec/green/foundation/csp-meta-dev-strip-prod-preserve.md` (REQ-098, green) — `index.html:9` CSP meta dev/prod 비대칭. `<meta http-equiv="Content-Security-Policy">` element 영역으로 본 req (`<title>` element + manifest top-level 키) 와 직교.
- 자매 spec: `specs/60.done/2026/05/18/req/20260518-meta-robots-robotstxt-policy-semantic-coherence.md` (REQ-20260518-001) — meta robots ↔ robots.txt 양면 의미 동치. `<meta name="robots">` element 영역으로 본 req 와 직교.
- 자매 spec: `specs/20.req/20260518-index-html-root-mount-id-token-coherence.md` (REQ-20260518-002) — mount node `<div id="root">` 3 극 정합. mount ID 토큰 영역으로 본 req (사이트 타이틀 토큰) 와 직교.
- 자매 spec: `specs/20.req/20260518-meta-description-default-fallback-token-coherence.md` (REQ-20260518-003) — `<meta name="description">` ↔ `DEFAULT_META_DESCRIPTION` 양면 동치. description text content 영역으로 본 req 와 직교.
- 자매 spec: `specs/30.spec/blue/components/app.md` (REQ-094, blue) — `src/index.jsx` 부트 비콘. `src/index.jsx` 영역으로 본 req (`index.html` `<title>` + `public/manifest.json`) 와 직교.
- 별 axis 박제 (본 req scope 외):
  - `src/common/common.ts:5,8` `document.title = title + " - park108.net"` — runtime `document.title` 의 page-prefix + suffix 합성 contract (별 axis). `park108.net` 토큰이 suffix 로 등장하나 본 req 는 정적 HTML `<title>` element + manifest static metadata 한정.
  - `src/App.jsx:78`, `src/common/Navigation.tsx:45` `<a href={getUrl()}>park108.net</a>` — UI navigation anchor text (별 axis).
  - `src/common/common.ts:71` `https://www.park108.net/` — production URL host token (별 axis — URL host).
- 외부 출처:
  - W3C HTML Living Standard §4.2.2 `<title>` element (https://html.spec.whatwg.org/multipage/semantics.html#the-title-element) — non-iframe documents require `<title>`, text content 가 브라우저 탭/SERP page title default.
  - W3C Web App Manifest §6.6 `name` member (https://www.w3.org/TR/appmanifest/#name-member) — primary identifier, UA preference: install prompt + application chooser.
  - W3C Web App Manifest §6.7 `short_name` member (https://www.w3.org/TR/appmanifest/#short_name-member) — directory where space for name might be limited, UA preference: home screen + launcher.
  - Google Search Central — Control your title links in search results (https://developers.google.com/search/docs/appearance/title-link) — `<title>` content 가 SERP page title primary 후보.
- 측정 출처: HEAD `f0eee82` 실측 — `grep -cE '<title>.*</title>' index.html` = 1 / `grep -cE '"short_name"\s*:' public/manifest.json` = 1 / `grep -cE '"name"\s*:' public/manifest.json` = 1 / `index.html:13` text content = `park108.net` / `public/manifest.json:2` `short_name` value = `park108.net` / `public/manifest.json:3` `name` value = `park108.net`.
- RULE-07 양성 근거: 본 req 는 incident / 일회성 진단이 아니라 production 정적 metadata (HTML `<title>` element + W3C Web App Manifest `short_name` + `name` 키) 의 PWA 사이트 타이틀 토큰 3 극 정합 **시스템 불변식** 을 요구. HTML parser + JSON parser + 문자열 동치 비교로 반복 검증 가능하며 시점·릴리스 의존 없음. baseline 측정값은 HEAD `f0eee82` 스냅샷 박제이나 효능 평서 자체는 시점 비의존 (NFR-07).
