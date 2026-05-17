# PWA splash → first paint background color 3극 동치 시스템 불변식 — `manifest.json.background_color` ↔ `--normal-background-color` ↔ `body { background-color }`

> **ID**: REQ-20260518-011
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요
PWA 가 standalone window 로 기동될 때 사용자가 인지하는 첫 paint 색은 두 단계 — (1) OS/브라우저가 `manifest.json.background_color` 로 splash 화면을 칠하고, (2) JS 번들 평가 + React mount 가 끝난 직후 `body { background-color }` 가 적용된 첫 frame 으로 전환된다. 두 색이 다르면 splash → app 사이에 가시적인 색 flash 가 발생하여 install UX 의 일관성이 깨진다. 본 req 는 `public/manifest.json.background_color` ↔ CSS 변수 `--normal-background-color` ↔ `body` 의 `background-color` 적용 경로의 **3극 의미 동치** 를 시스템 불변식으로 박제한다 — 토큰 형식 (REQ-20260518-009 FR-04) 이 아니라 **세 표면이 동일한 가시 색으로 수렴한다** 는 가로축.

## 배경
- baseline HEAD `af1f881` (master).
- 3 극 token baseline:
  - `public/manifest.json:21` — `"background_color": "#ffffff"` (PWA splash 색 — W3C Web App Manifest `<color>` 토큰, 6-hex form).
  - `src/styles/tokens.css:8` — `--normal-background-color: white;` (CSS named color, `#ffffff` 와 sRGB 동치).
  - `src/styles/reset.css:15-20` — `body { ... background-color: var(--normal-background-color); }` (이 단일 선언이 첫 paint 색의 cascade origin).
- `grep -cE "^\s*\"background_color\":" public/manifest.json` = **1**.
- `grep -cE "^\s*--normal-background-color:\s*white;" src/styles/tokens.css` = **1**.
- `grep -cE "background-color:\s*var\(--normal-background-color\)" src/styles/reset.css` = **1**.
- 위험: 세 표면 중 어느 하나라도 단독 변경 시 — 예) `manifest.json.background_color` 를 `"#000000"` (theme_color 와 정렬) 로 바꾸지만 CSS 토큰은 `white` 유지 — splash 가 검정 → app 첫 paint 가 흰색으로 **번쩍이는 flash** 발생. 단위 테스트로는 검출 불가 (시각 회귀); spec 차원에서 3 극 동치를 박제해야 회귀 차단 가능.
- 미박제 영역:
  - REQ-20260518-009 (`20.req/20260518-manifest-pwa-install-contract-token-typology.md`) §FR-04 — `background_color` 의 **토큰 형식** (`^#[0-9A-Fa-f]{6}$`) 한정. §OOS line 35 명시: "왜 `#ffffff` 인지의 UX 정책 정당화 (별 axis)" — 본 req 가 그 별 axis 박제.
  - REQ-099 (`30.spec/green/foundation/index-html-public-asset-reference-coherence.md`, green) — `theme_color` 양면 동치 (`index.html` ↔ `manifest.json`) 만 박제. `background_color` ↔ CSS 영역은 부재. §OOS line 10 에 본 영역이 별 axis 로 분리됨.
  - REQ-20260518-006 (`html-title-manifest-name-token-coherence`) — `short_name` / `name` / `<title>` 3극 동치 축. 본 req 와 직교.
- 인접 영역 직교성:
  - `theme_color` (`#000000`, status bar 색) — REQ-099 영역. 본 req scope 외 (splash 배경 ≠ status bar; 두 색이 항상 같아야 하는 것은 아님).
  - `background-color` 의 **하위 컴포넌트 표면 색** (Toaster / Monitor / Search / Image 등 module.css) — 본 req scope 외 (첫 paint 직후 mount 되는 컴포넌트 표면은 별 axis).
- 외부 출처: W3C Web App Manifest Recommendation — `background_color` member 정의: "The background_color member describes the expected background color of the web application. It is used by the user agent to draw the background color of a shortcut when the manifest is available before the style sheet has loaded". MDN — "The `background_color` member is used as the default background color before its stylesheet is loaded. ... For a consistent loading experience, the value of `background_color` should match the `background-color` CSS property set in the site's stylesheet."

## 목표
- In-Scope:
  - `public/manifest.json.background_color` 의 색 값이 `src/styles/tokens.css` 의 `--normal-background-color` 값과 **sRGB 동치** 임을 박제 (baseline: `"#ffffff"` ↔ `white`).
  - `src/styles/reset.css` 의 `body { background-color }` 선언이 정확히 `var(--normal-background-color)` 를 참조하며 (직접 값 하드코딩 금지) `--normal-background-color` 토큰이 첫 paint 색의 single source 임을 박제.
  - 3 극 grep count baseline (`1` / `1` / `1`) 박제 — 등록 수 변동은 spec 갱신 신호.
  - 빌드 산출물 `build/manifest.json.background_color` 가 `public/manifest.json.background_color` 와 byte-for-byte 동치 (Vite `publicDir` 정책 효능 — REQ-20260518-009 FR-05 와 효능 공유, 본 req 는 cross-surface 의미 한정).
- Out-of-Scope:
  - `background_color` 의 **토큰 형식** (`^#[0-9A-Fa-f]{6}$`) — REQ-20260518-009 FR-04 영역.
  - `theme_color` ↔ status bar / `<meta name="theme-color">` 양면 동치 — REQ-099 FR-04 영역.
  - 색 값 자체의 **UX 결정 정당화** (왜 흰색인지 — 가독성/브랜드 정책) — 별 axis: UX 정책.
  - `body` 외 다른 표면 (`div#root`, 하위 컴포넌트 module.css 의 `background-color`) — 본 req 는 첫 paint 의 단일 origin (`body`) 한정.
  - 색명 ↔ hex 변환 알고리즘 일반화 — 본 baseline 은 `"#ffffff"` ↔ `white` 의 **단일 쌍** 박제. 다른 쌍 (예: `#ff0000` ↔ `red`) 도입은 spec 갱신 신호.
  - `prefers-color-scheme` 다크모드 분기 — 현 baseline 부재. 다크모드 도입은 별 req (3 극 동치 축이 light/dark 2 세트로 확장됨).
  - 게이트 발화 채널 (pre-commit / pre-push / CI) — 효능 단정만 박제.
  - PWA splash 의 사용자 가시 시간 / 폰트 / 아이콘 위치 — 본 req 는 색 한정.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `public/manifest.json.background_color` 의 색 값이 `src/styles/tokens.css.--normal-background-color` 의 색 값과 **sRGB 동치** — baseline 박제 쌍: `"#ffffff"` ↔ `white`. `grep -cE "^\s*\"background_color\":\s*\"#ffffff\"" public/manifest.json` = **1**, `grep -cE "^\s*--normal-background-color:\s*white;" src/styles/tokens.css` = **1**. | Must |
| FR-02 | `src/styles/reset.css` 의 `body` selector 본문이 정확히 `background-color: var(--normal-background-color);` 1 회 선언 — `grep -cE "background-color:\s*var\(--normal-background-color\)" src/styles/reset.css` = **1**. `body` 본문에 색 값 직접 하드코딩 (예: `background-color: white;` / `background-color: #ffffff;`) 금지 — single source 보장. | Must |
| FR-03 | `--normal-background-color` 토큰이 첫 paint 색의 **single source** — 본 토큰이 정의되는 파일은 `src/styles/tokens.css` 단일 (`grep -rn "^\s*--normal-background-color:" src/styles/` = `src/styles/tokens.css:8` 1 hit). 여러 정의 (`:root` override 등) 도입은 spec 갱신 신호. | Must |
| FR-04 | `build/manifest.json.background_color` 가 `public/manifest.json.background_color` 와 byte-for-byte 일치 — Vite `publicDir` 정책 효능 박제 (`vite build` 후 비교). | Must |
| FR-05 | 가설 회귀 차단 — 3 극 중 한 표면만 변경 시 게이트 미달: (a) `manifest.json.background_color` 단독 변경, (b) `tokens.css.--normal-background-color` 단독 변경, (c) `reset.css.body` 가 토큰 참조 대신 hard-coded 값 사용. 모두 splash→first-paint flash 회귀 신호. | Must |
| FR-06 | 본 3 극 동치가 깨지면 (FR-01 sRGB 동치 위반 / FR-02 토큰 참조 위반 / FR-04 build 보존 위반) 게이트 미달로 판정 — 효능 단정 (불변식). | Must |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 멱등성 | 3 극 grep + sRGB 비교 N 회 반복 시 N 회 동일 verdict — 입력 (manifest + tokens.css + reset.css + build/manifest) 동일하면 결과 결정론. |
| NFR-02 | 결과 효능 중립 | 게이트 발화 채널 (pre-commit / pre-push / CI / npm script) 선정은 본 req 비대상. 효능 (3 극 grep count + sRGB 동치 + byte-equal) 만 박제. |
| NFR-03 | 자체 진단 제외 | 본 req / spec / 테스트 본문에 등장하는 `background_color` / `--normal-background-color` 문자열 occurrence 는 FR-01..FR-03 의 3 파일 (`public/manifest.json` + `src/styles/tokens.css` + `src/styles/reset.css`) grep count 와 독립 — 게이트 scope 는 본 3 파일 + `build/manifest.json` 으로 한정. |
| NFR-04 | 직교성 | 본 req 는 첫 paint 단일 origin (`body` background) 한정. 하위 컴포넌트 module.css 의 `background-color`, `prefers-color-scheme` 분기, `theme_color` (status bar), `display` enum 은 본 req 영역 외. REQ-099 / REQ-20260518-006 / REQ-20260518-009 와 cross-cut 부재. |

## 수용 기준
- [ ] **Given** HEAD `af1f881` (또는 동일 baseline 재현 HEAD), **When** `grep -cE "^\s*\"background_color\":\s*\"#ffffff\"" public/manifest.json` 실행, **Then** 출력 = **1** + rc=0 (FR-01 manifest 박제).
- [ ] **Given** 동일 HEAD, **When** `grep -cE "^\s*--normal-background-color:\s*white;" src/styles/tokens.css` 실행, **Then** 출력 = **1** + rc=0 (FR-01 tokens 박제).
- [ ] **Given** 동일 HEAD, **When** `"#ffffff"` 와 `white` 의 sRGB 좌표를 비교, **Then** 두 값 모두 `(255, 255, 255)` 로 동치 (FR-01 sRGB 동치).
- [ ] **Given** 동일 HEAD, **When** `grep -cE "background-color:\s*var\(--normal-background-color\)" src/styles/reset.css` 실행, **Then** 출력 = **1** (FR-02 토큰 참조).
- [ ] **Given** 동일 HEAD, **When** `grep -n "body\s*{" src/styles/reset.css` 로 식별한 body 블록 본문에서 `background-color:\s*(white|#[0-9A-Fa-f]+|rgb\()` 매치, **Then** 매치 0 hits (FR-02 hard-coded 색 금지).
- [ ] **Given** 동일 HEAD, **When** `grep -rnE "^\s*--normal-background-color:" src/styles/` 실행, **Then** 출력 1 라인 (`src/styles/tokens.css:8`) — single source (FR-03 baseline).
- [ ] **Given** 동일 HEAD + `vite build` 산출물 `build/manifest.json` 존재, **When** `public/manifest.json:21` 와 `build/manifest.json:21` 비교, **Then** byte-for-byte 일치 (FR-04 baseline).
- [ ] **Given** 가설 회귀 — `public/manifest.json.background_color` 를 `"#000000"` 으로 변경 (theme_color 와 정렬 시도), **When** FR-01 sRGB 동치 비교 실행, **Then** 게이트 미달 (`#000000` ≠ `white` sRGB) — splash→first-paint flash 회귀 검출 (FR-05 case a).
- [ ] **Given** 가설 회귀 — `tokens.css` 의 `--normal-background-color` 를 `black` 으로 변경, **When** FR-01 비교 실행, **Then** 게이트 미달 (`#ffffff` ≠ `black`) — first paint 와 splash 가 어긋남 (FR-05 case b).
- [ ] **Given** 가설 회귀 — `reset.css` body 본문을 `background-color: white;` 로 직접 하드코딩, **When** FR-02 토큰 참조 grep 실행, **Then** 출력 = **0** ≠ 1 — single source 깨짐 (FR-05 case c).

## 참고
- baseline HEAD: `af1f881` (master).
- baseline 토큰 (3 극):
  - **manifest 극**: `public/manifest.json:21` — `"background_color": "#ffffff"`.
  - **CSS 토큰 극**: `src/styles/tokens.css:8` — `--normal-background-color: white;`.
  - **적용 극**: `src/styles/reset.css:15-20` — `body { ... background-color: var(--normal-background-color); }`.
  - 빌드 보존 극: `build/manifest.json:21` — `public/manifest.json:21` 과 byte-equal (Vite `publicDir`).
- 자매 spec / req:
  - `specs/20.req/20260518-manifest-pwa-install-contract-token-typology.md` (REQ-20260518-009) — `background_color` 의 **형식** (`^#[0-9A-Fa-f]{6}$`) 박제. §OOS line 35 가 본 req (의미 동치) 를 별 axis 로 분리.
  - `specs/30.spec/green/foundation/index-html-public-asset-reference-coherence.md` (REQ-099) — `theme_color` 양면 동치 (`index.html` ↔ `manifest.json`). 본 req 는 `background_color` ↔ CSS 동치로 직교.
  - `specs/20.req/20260518-html-title-manifest-name-token-coherence.md` (REQ-20260518-006) — `short_name` / `name` / `<title>` 3극 동치. 본 req 와 동일 paradigm (3극 cross-surface 동치), 다른 토큰 axis.
- 외부 출처:
  - W3C Web App Manifest Recommendation, §`background_color` member: "It is used by the user agent to draw the background color of a shortcut when the manifest is available before the style sheet has loaded".
  - MDN Web Docs, "Web app manifests — `background_color`": "For a consistent loading experience, the value of `background_color` should match the `background-color` CSS property set in the site's stylesheet."
  - CSS Color Module Level 4, §`<named-color>`: `white` is defined as sRGB `(255, 255, 255)`, equivalent to `#ffffff`.
