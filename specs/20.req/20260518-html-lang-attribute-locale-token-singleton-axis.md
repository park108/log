# `index.html` `<html lang>` 속성 ↔ build 보존 ↔ locale 토큰 singleton 결과 효능 시스템 불변식

> **ID**: REQ-20260518-025
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요

`index.html:2` `<html lang="en">` 속성은 문서의 자연어 locale 토큰을 박제하는 단일 entry-point 다. 본 토큰은 (a) `index.html` 디스크 표면, (b) `vite build` 산출물 `build/index.html` 의 byte-for-byte 보존 표면, (c) `<html>` 요소 instance cardinality (정확히 1) — 3 측 결과 효능을 갖는다. `lang` 속성이 없거나 빈 문자열이면 — (i) 스크린리더가 TTS 발음 규칙 결정 실패 (WCAG 2.1 SC 3.1.1 Language of Page 위반), (ii) 검색엔진 / 자동 번역 / hreflang 추론 시 휴리스틱 폴백 (silent locale guess), (iii) CSS `:lang()` selector·`<q>` element 의 quote glyph 분기·`hyphens: auto` 알고리즘 선택 실패. 본 req 는 (1) `index.html` 에 `<html lang="...">` 정확히 1 hit 박제 + 값이 BCP 47 형식 (RFC 5646 — `^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$`) 비어있지 않은 토큰, (2) `vite build` 산출물 `build/index.html` 도 동일 토큰 byte-equal 보존, (3) `<html>` element instance 가 디스크/build 양면에서 정확히 1 hit — 3 측 cross-surface 동치를 평서문 시스템 불변식으로 박제할 것을 요청한다. 본 req 는 결과 효능 (3 측 동치 + 자체 진단 가능) 만 박제하며, locale 토큰 콘텐츠 결정 (왜 `en` 인지, 다국어 분기 도입 여부) 은 별 axis (i18n 정책) — out-of-scope, 발화 채널 (CI / pre-push / `check:*` script / build-time HTML parse) 선정은 inspector/planner 영역.

## 배경

- `index.html:2` 박제 표면:
  - `<html lang="en">` — locale 토큰 `"en"` (BCP 47 primary subtag, ISO 639-1 영어).
- 자매 표면 hit 분포 (현 baseline):
  - `grep -nE "<html\s+lang" /Users/park108/Dev/log/index.html` → 1 hit (line 2).
  - `build/index.html` 산출 여부 (현 시점 `build/` 존재) — `vite build` 직후 `<html lang="en">` byte-equal 보존되어야 함.
  - `public/manifest.json` `lang` key — 부재 (W3C Web App Manifest §6.4 `lang` 은 optional, 본 req 와 직교 — manifest 측 locale 토큰은 별 axis).
  - `src/**/*.{ts,tsx,jsx,js}` 에서 `document.documentElement.lang` runtime 조작 → 0 hit (`grep -rn "documentElement.lang\|document.lang" /Users/park108/Dev/log/src` 시 0 hit 가정 검증).
- 다른 viewport-class meta 와의 직교 관계:
  - REQ-20260518-022 (`viewport-meta-mobile-pwa-standalone-axis-coherence`) — viewport content 토큰 3 극 (디스크/build/PWA 의도). `<html lang>` 은 viewport-meta 와 다른 axis (locale vs layout viewport) — 명시적으로 별 axis 박제.
  - REQ-20260518-009 (`manifest-pwa-install-contract-token-typology`) — `lang` 을 manifest schema 의 별 axis (추가 키 추후 도입 가능 영역) 로 명시.
  - REQ-20260518-004 (`html-title-manifest-name-token-coherence`) — `<title>` 3 극 동치 (`<html lang="en">` 단일 locale 가정 박제).
- 박제 토큰 표면이 단일 (`index.html:2`) 이며 build 보존 표면 1 / 인스턴스 cardinality 1 — 박제된 단일 진입점이 손상되면 silent 회귀 (브라우저/스크린리더가 fallback 휴리스틱으로 진입, 명시 경고 0).
- 자매 spec: `specs/30.spec/blue/components/common.md` — `<head>` / DOM 진입점 운영 박제. `<html>` element 자체의 locale 속성 미박제 (별 axis).
- 자매 done: `specs/60.done/2026/05/18/req/20260518-index-html-root-mount-id-token-coherence.md` (REQ-20260518-002) — `<div id="root">` 3 극 정합. mount node ID 토큰 영역, 본 req (`<html>` locale 속성) 와 직교.
- 자매 ready: `specs/20.req/20260518-viewport-meta-mobile-pwa-standalone-axis-coherence.md` (REQ-20260518-022) — viewport meta 3 극. 같은 axis 패턴 (디스크 ↔ build ↔ 의도) 이나 다른 토큰 (layout viewport vs document locale) — 직교.

## 목표

- In-Scope:
  - `index.html` 에 `<html lang="...">` 정확히 1 hit + 값이 BCP 47 (RFC 5646) primary subtag 시작 + 빈 문자열 아님.
  - `vite build` 산출물 `build/index.html` 의 `<html lang>` 토큰 byte-for-byte 보존.
  - `<html>` element instance cardinality = 1 (디스크 / build 양면).
- Out-of-Scope:
  - locale 토큰 콘텐츠 결정 (왜 `en` 인지) — 별 axis (i18n 정책).
  - 다국어 분기 도입 (예: `en` ↔ `ko` 동적 전환) — 별 axis. 도입 시 본 spec 의 단일 locale 가정 갱신 신호.
  - `public/manifest.json` `lang` key 도입/생략 — 별 axis (manifest schema 영역).
  - `<html dir>` (RTL/LTR 방향) — 별 axis.
  - 스크린리더 / TTS 동작 자체 검증 — 별 axis (외부 도구 contract).
  - CSS `:lang()` / `<q>` / `hyphens` 동작 검증 — 별 axis (CSS 사양 영역).
  - 발화 채널 (CI / pre-push / `check:*` script / build-time HTML parse) — inspector/planner 영역.

## 기능 요구사항

| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `index.html` 에 `<html lang="...">` 정확히 1 hit — `grep -cE "<html\\s+lang=\"[^\"]+\"" /Users/park108/Dev/log/index.html` → 1. | Must |
| FR-02 | `<html lang>` 값이 BCP 47 (RFC 5646) 형식 — primary subtag 정규식 `^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$` 매치 + 빈 문자열 아님. | Must |
| FR-03 | `<html>` element instance cardinality = 1 — `grep -cE "<html(\\s|>)" /Users/park108/Dev/log/index.html` → 1. | Must |
| FR-04 | `vite build` 직후 `build/index.html` 의 `<html lang>` 토큰이 `index.html:2` 와 byte-for-byte 동치 (값 자체 + selector 형태 + 인스턴스 cardinality). | Must |
| FR-05 | locale 토큰 콘텐츠 변경 (예: `en` → `ko`) 시 `index.html` 단일 표면 갱신만으로 build 양면 (디스크 / build/) 결과 효능 동시 갱신 — `build/` 측 별도 수동 갱신 0 hit. | Should |

## 비기능 요구사항

| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 자체 진단 | 정합 위반 시 stdout/stderr 에 (a) 박제 표면 (`index.html:2`), (b) 측정 hit (개수 + 값), (c) BCP 47 매치 여부 — 3 정보 모두 노출. |
| NFR-02 | 측정 결정론 | 동일 코드·동일 toolchain 환경 반복 실행 시 측정 결과 동일 (range 0). |
| NFR-03 | 접근성 근거 박제 | `<html lang>` 의 결과 효능 근거를 WCAG 2.1 SC 3.1.1 (Level A — Language of Page) 외부 사양 링크로 박제. 본 req 는 자체 효능 게이트만 박제하며 WCAG 준수 자체 검증은 별 axis. |
| NFR-04 | 직교성 | 본 req 는 `<html lang>` 단일 axis 한정. `<meta name="viewport">` (REQ-20260518-022), `<title>` 3 극 (REQ-20260518-004), `<meta name="description">` (REQ-20260518-003 done), `<meta name="robots">` (REQ-20260518-001 done), `<meta charset>` (별 axis), `<html dir>` (별 axis), manifest `lang` key (별 axis) 모두 직교. |
| NFR-05 | 추적성 | spec 박제 후 `grep -rn "REQ-20260518-025" specs/30.spec/{green,blue}/foundation/` → 2 hit 이상 (§관련 요구사항 + §변경 이력). |
| NFR-06 | 진단 자체-포함 | 본 req 의 fixture 자체가 `<html lang>` 문자열을 박제 카운트에 포함하지 않도록 자체 진단 제외 규약 박제. |

## 수용 기준

- [ ] (FR-01) `index.html` 에 `<html lang="...">` 정확히 1 hit.
- [ ] (FR-02) `<html lang>` 값이 BCP 47 (RFC 5646) primary subtag 매치 + 빈 문자열 아님.
- [ ] (FR-03) `<html>` element instance cardinality = 1 (디스크).
- [ ] (FR-04) `vite build` 직후 `build/index.html` 의 `<html lang>` 토큰 byte-equal 보존 + FR-01/02/03 동일 적용.
- [ ] (FR-05) locale 토큰 콘텐츠 변경 시 build 양면 결과 효능 동시 갱신 (수동 추가 작업 0 hit).
- [ ] (NFR-01) 정합 위반 진단 출력에 박제 표면 / 측정 hit / BCP 47 매치 여부 3 정보 모두 노출.
- [ ] (NFR-05) 박제 후 `grep -rn "REQ-20260518-025" specs/30.spec/{green,blue}/foundation/` → 2 hit 이상.

## 참고

- `index.html:2` — 본 req 의 진실 공급원 (`<html lang="en">` 박제 표면).
- `build/index.html` — `vite build` 산출 보존 표면 (build 직후 byte-equal 검증 대상).
- `public/manifest.json` — `lang` key 부재 (별 axis — manifest schema 영역).
- `specs/30.spec/blue/components/common.md` — `<head>` / DOM 진입점 운영 박제 (별 axis — `<html>` 요소의 locale 속성 미박제).
- `specs/20.req/20260518-viewport-meta-mobile-pwa-standalone-axis-coherence.md` (REQ-20260518-022) — viewport content 토큰 3 극 (직교 axis, 동일 패턴).
- `specs/20.req/20260518-html-title-manifest-name-token-coherence.md` (REQ-20260518-004) — `<title>` 3 극 동치 (`<html lang="en">` 단일 locale 가정 박제).
- `specs/60.done/2026/05/18/req/20260518-index-html-root-mount-id-token-coherence.md` (REQ-20260518-002, done) — `<div id="root">` 3 극 정합 (직교 axis, 동일 패턴).
- 외부 사양: [W3C WCAG 2.1 SC 3.1.1 Language of Page (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html) — `<html lang>` 의 접근성 결과 효능 근거.
- 외부 사양: [RFC 5646 — Tags for Identifying Languages (BCP 47)](https://www.rfc-editor.org/rfc/rfc5646) — `lang` 속성 값 형식 정규식 근거.
- 외부 사양: [HTML Living Standard §4.2.2 `lang` attribute](https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes) — element 의 `lang` 속성 의미.
