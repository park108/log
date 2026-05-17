# `index.html` `<meta name="description" content="...">` ↔ `src/common/common.ts` `DEFAULT_META_DESCRIPTION` ↔ `setMetaDescription()` default 인자 fallback 양면 토큰 동치 시스템 불변식

> **ID**: REQ-20260518-003
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요
SPA 초기 진입 시 `index.html:7` `<meta name="description" content="park108.net is a personal journal of Jongkil Park the developer" />` 가 SEO/소셜 크롤러에 노출되는 페이지 description 의 정적 baseline 이고, runtime 단계에서 `src/Log/LogSingle.jsx:39` 가 unmount cleanup 으로 `setMetaDescription()` 무인자 호출 → `src/common/common.ts:14` `setMetaDescription(desc: string = DEFAULT_META_DESCRIPTION)` default 인자 fallback → `src/common/common.ts:12` `const DEFAULT_META_DESCRIPTION = "park108.net is a personal journal of Jongkil Park the developer"` 상수로 `<meta name="description">` content 를 복원한다. **양면 (정적 HTML baseline ↔ runtime default fallback 상수) 의 description 텍스트가 byte-for-byte 동치** 가 아니면 LogSingle 페이지 → 다른 페이지 navigate 시 description 이 silently 다른 값으로 set 되어 SEO 크롤러 / 소셜 카드 / 브라우저 북마크 description 일관성 위반 (Google Search Central — meta description 은 search snippet 후보, Firefox/Opera 는 default bookmark description 으로 사용). 본 req 는 (a) `index.html:7` content 토큰 = `src/common/common.ts:12` `DEFAULT_META_DESCRIPTION` 상수 값의 byte-for-byte 동치, (b) baseline hit 분포 (`index.html` 정적 1 + `src/common/common.ts` 정의 1 + default 인자 사용 1), (c) selector 형태 정합 (`<meta name="description" content="...">` ↔ string literal) 의 **결과 효능 계약** 을 시스템 불변식으로 박제할 것을 요청한다. 본 req 는 결과 효능 (양면 토큰 동치 + 자체 진단 가능) 만 박제하며, 발화 채널 (CI / pre-push / `package.json` `check:*` script) 선정 및 토큰 일관 갱신 수단 (단일 상수 추출 vs literal 동치 유지) 선택은 inspector/planner 영역.

## 배경
- HEAD `1fc3873` 실측:
  - 채널 H (HTML 정적 baseline): `index.html:7` `<meta name="description" content="park108.net is a personal journal of Jongkil Park the developer" />` — 1 hit.
  - 채널 D (runtime default 상수 정의): `src/common/common.ts:12` `const DEFAULT_META_DESCRIPTION = "park108.net is a personal journal of Jongkil Park the developer";` — 1 hit.
  - 채널 U (default 인자 사용): `src/common/common.ts:14` `export const setMetaDescription = (desc: string = DEFAULT_META_DESCRIPTION): void => {...}` — 1 hit (default parameter binding).
  - 양면 토큰 동치 baseline 상태: 채널 H 토큰 = `"park108.net is a personal journal of Jongkil Park the developer"` (HTML attribute literal, 67 byte ASCII), 채널 D 토큰 = 동일 67 byte literal. **양면 byte-for-byte 동치 PASS**.
- 토큰 별 의미 매핑:
  - 채널 H (`index.html:7`, HTML metadata scope): 정적 HTML 의 `<meta name="description">` content — 초기 진입 시 SEO 크롤러 / 소셜 unfurl / 북마크 description 의 초기값. WHATWG HTML Living Standard §4.2.5.1 standard metadata names (`name="description"`) — "describes the page" semantic.
  - 채널 D (`src/common/common.ts:12`, JS module-level constant scope): runtime default fallback 의 진실 공급원. ES module module-level binding (top-level `const`, immutable).
  - 채널 U (`src/common/common.ts:14`, function default parameter scope): `setMetaDescription(desc: string = DEFAULT_META_DESCRIPTION)` 의 default parameter binding — 인자 미전달 호출 시 채널 D 값 substitute. ECMAScript default parameter evaluation 은 호출 시점에 closure 안의 `DEFAULT_META_DESCRIPTION` resolve.
- runtime 호출 분포 (`src/Log/LogSingle.jsx`):
  - `LogSingle.jsx:39` `return () => { setMetaDescription(); }` — useEffect cleanup 에서 무인자 호출 → 채널 U 발화 → 채널 D fallback → `<meta name="description">` content 를 default 로 복원. **LogSingle unmount 시점에 정적 HTML baseline (채널 H) 로 자연 복귀해야 SEO 일관성 보존**.
  - `LogSingle.jsx:57` `setMetaDescription(summary + ellipsis)` — log 본문 요약을 description 으로 인자 전달 (default 미사용).
  - `LogSingle.jsx:63` `setMetaDescription(PAGE_NOT_FOUND)` — 404 분기 인자 전달.
- 잠재 회귀 시나리오 (현재 baseline 위반 0 이나 미래 변경에서 발생 가능):
  - (R-1) `index.html:7` content `"park108.net is a personal journal of Jongkil Park the developer"` → 다른 텍스트 (예: "park108.net blog") 변경 + `src/common/common.ts:12` 미변경 → 채널 H ≠ 채널 D → LogSingle navigate-away 시 description 이 silently `DEFAULT_META_DESCRIPTION` (구 텍스트) 로 set 됨 → 초기 HTML 의 새 텍스트와 어긋남 → SEO 크롤러 / 소셜 카드 fetch 시점에 따라 다른 description 노출.
  - (R-2) `src/common/common.ts:12` `DEFAULT_META_DESCRIPTION` literal 값 → 다른 문자열 변경 + `index.html` 미변경 → 채널 D ≠ 채널 H → LogSingle navigate-away 시 description 이 새 default 로 set 됨 → 초기 HTML 과 어긋남 (R-1 mirror).
  - (R-3) `src/common/common.ts:14` `setMetaDescription` signature 에서 default 인자 제거 (`desc: string`) → 채널 U hit 0 → `LogSingle.jsx:39` `setMetaDescription()` 무인자 호출 → TypeScript compile 오류 또는 runtime `desc === undefined` 으로 `metaEl.content = undefined` 분기 → `<meta name="description">` content 가 `"undefined"` 문자열로 손상 → SEO 페이로드 회귀.
  - (R-4) `src/common/common.ts:12` `DEFAULT_META_DESCRIPTION` 상수 자체 삭제 → 채널 D hit 0 → 채널 U default 인자 binding TypeScript compile 오류 (`Cannot find name 'DEFAULT_META_DESCRIPTION'`) → 즉시 lint/typecheck 검출 (R-3 와 다르게 정적 분기).
  - (R-5) `src/common/common.ts:14` default 인자 binding 을 다른 literal 로 inline 화 (`desc: string = "park108.net blog"`) → 채널 U 발화는 보존되나 채널 D 와의 의미 분리 → 미래 변경 시 inline literal 만 갱신되고 채널 H/D 미동기화 회귀 가능 → grep 게이트 (literal 동치) 만으로는 검출되나 의미 정합 (단일 진실 공급원 채널 D) 위반 신호.
- 자매 spec 격리:
  - REQ-099 (`30.spec/green/foundation/index-html-public-asset-reference-coherence.md`) — `index.html` 정적 자원 참조 4종 + `theme-color` 양면 동치 axis. OOS 박제 (line 75) "`<meta name="description">` 의 description 텍스트 자체 정합 (SEO 정책 — 별 axis)" 명시 — 본 req 가 그 별 axis 박제.
  - REQ-098 (`30.spec/green/foundation/csp-meta-dev-strip-prod-preserve.md`) — `index.html:9` CSP meta dev/prod 비대칭 axis. 부수 조건 평서 (`<meta name="description">` 보존) 만 박제, content 토큰 자체 동치는 미박제. 본 req 와 직교.
  - REQ-20260518-001 (`60.done/2026/05/18/req/20260518-meta-robots-robotstxt-policy-semantic-coherence.md`) — `<meta name="robots">` ↔ `public/robots.txt` 양면 의미 동치 axis. `<meta name="robots">` element 영역으로 본 req (description) 와 직교.
  - REQ-20260518-002 (`20.req/20260518-index-html-root-mount-id-token-coherence.md`) — `<div id="root">` ↔ `getElementById("root")` 3 극 mount ID 토큰 axis. mount selector 영역으로 본 req (meta description content) 와 직교.
  - `30.spec/blue/components/common.md:15` — `setHtmlTitle(title)`, `setMetaDescription(desc)` API 박제. 함수 signature 및 부작용 (document.title / meta.content 갱신) 만 박제, default fallback 값 자체의 양면 동치는 미박제. 본 req 가 그 default 값 양면 동치 axis 박제.
- 외부 출처:
  - WHATWG HTML Living Standard §4.2.5.1 standard metadata names (https://html.spec.whatwg.org/multipage/semantics.html#standard-metadata-names) — `name="description"` 의 의미 "describes the page", content attribute 필수.
  - Google Search Central — "How to Write Meta Descriptions" (https://developers.google.com/search/docs/appearance/snippet) — meta description 은 search snippet 후보, Google 이 60-70% case 에서 rewrite 하나 unique descriptive content 가 권장.
  - MDN — Standard metadata names (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name) — `description` 는 Firefox / Opera 의 default bookmark description 으로 사용.
  - ECMAScript Language Specification §15.2.4 FunctionDeclaration — function default parameter 의 evaluation 은 호출 시점에 closure scope 의 binding 을 resolve.

## 목표
- In-Scope:
  - `index.html:7` `<meta name="description">` content 토큰 ↔ `src/common/common.ts:12` `DEFAULT_META_DESCRIPTION` literal 값의 byte-for-byte 양면 동치 결과 효능 계약 spec 박제.
  - `src/common/common.ts:14` `setMetaDescription(desc: string = DEFAULT_META_DESCRIPTION)` default 인자 binding 의 존재 계약 박제 (default 인자 제거 시 무인자 호출 회귀 차단).
  - 자체 진단 채널 (grep + content 속성 추출 + 상수 literal 추출 + byte-for-byte 비교 fixture 또는 동등) 의 존재 계약 박제.
  - HEAD `1fc3873` baseline 측정: 채널 H = 1 hit (`index.html:7`) / 채널 D = 1 hit (`src/common/common.ts:12`) / 채널 U = 1 hit (`src/common/common.ts:14`) → 양면 토큰 동치 만족.
  - 시점 비의존 (`src/common/common.ts` 리팩토링 · `index.html` 마크업 정렬 변경 · `setMetaDescription` API 재설계 등 이벤트 직후에도 동일 측정 결과 효능 유지).
- Out-of-Scope:
  - 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `package.json` `check:meta-description-coherence` script) 선정 — 수단 위임 (inspector/planner 영역).
  - 토큰 일관 갱신 수단 선택 — 단일 상수 추출 (예: `src/common/constants.ts` `META_DESCRIPTION_DEFAULT` + `index.html` 의 build-time injection) vs literal byte-for-byte 동치 유지 / 어느 채널을 진실 공급원으로 둘지 — 수단 중립, inspector/planner 영역.
  - description 텍스트 자체의 SEO 품질 평가 (예: 길이 150-160 자 권장 / 키워드 배치 / CTA 포함) — 본 req 는 양면 토큰 동치 axis 만 박제, 텍스트 의미 품질 별 axis.
  - `setMetaDescription` 의 인자 전달 호출 (`LogSingle.jsx:57` summary + ellipsis, `LogSingle.jsx:63` PAGE_NOT_FOUND) 의 인자 값 정합 — 본 req 는 default 인자 fallback 한정.
  - `setHtmlTitle` 의 `" - park108.net"` suffix 토큰 ↔ `index.html:13` `<title>park108.net</title>` ↔ `manifest.json` `name/short_name "park108.net"` 양면 동치 (별 axis — title brand suffix coherence).
  - `<meta name="description">` 의 `[DEV]` prefix asymmetry (`setHtmlTitle` 만 isDev() 분기 / `setMetaDescription` 은 분기 없음 — 별 axis).
  - 테스트 fixture / mock 의 description 문자열 occurrence — 게이트 scope 는 `index.html` 단일 파일 + `src/common/common.ts` 단일 파일 (production 코드 한정).
  - WHATWG HTML Living Standard 의 `<meta>` content attribute encoding (HTML entity / Unicode escape) — 본 req 는 ASCII literal baseline 한정.
  - Build artifact (`build/index.html`) 의 description content 보존 — REQ-099 G-B (build 보존 영역) 와 중복. 본 req 는 source 양면 (`index.html` ↔ `src/common/common.ts`) 한정.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `index.html` 의 `<meta name="description" content="...">` 등록 hit 수 baseline = **1** (`grep -cE 'name="description"' index.html` → 1). 등록 hit 수 변경 (0 또는 2 이상) 은 본 spec 갱신 신호 — WHATWG HTML Living Standard §4.2.5.1 의 `name="description"` 은 unique semantic (per-page 단일). | Must |
| FR-02 | `src/common/common.ts` 의 `DEFAULT_META_DESCRIPTION` 상수 정의 hit 수 baseline = **1** (`grep -cE '^const DEFAULT_META_DESCRIPTION' src/common/common.ts` 또는 `grep -cE 'const DEFAULT_META_DESCRIPTION\s*=' src/common/common.ts` → 1). 정의 hit 0 시 채널 U default 인자 binding TypeScript compile 오류 (R-4) → 즉시 lint/typecheck 검출. | Must |
| FR-03 | `src/common/common.ts` 의 `setMetaDescription` default 인자 binding hit 수 baseline = **1** (`grep -cE 'setMetaDescription\s*=\s*\([^)]*=\s*DEFAULT_META_DESCRIPTION' src/common/common.ts` → 1). default 인자 제거 시 (R-3) `LogSingle.jsx:39` `setMetaDescription()` 무인자 호출이 `desc === undefined` 분기 발화 → `<meta name="description">` content 손상 회귀. | Must |
| FR-04 | **양면 description 토큰 동치 게이트** — FR-01 (`index.html` content 속성 값), FR-02 (`src/common/common.ts` 상수 literal 값) 의 토큰이 **byte-for-byte 동치** (`"park108.net is a personal journal of Jongkil Park the developer"` ≡ 동일 literal). baseline HEAD `1fc3873` 측정: 양면 모두 67 byte ASCII literal → **양면 토큰 동치 PASS**. 추출 방법: `index.html` 의 `<meta name="description" content="...">` 속성 값 + `src/common/common.ts` 의 `DEFAULT_META_DESCRIPTION = "..."` literal → quote 제거 + byte-for-byte 비교. | Must |
| FR-05 | 전체 src 영역 (`src/**` production 코드, 테스트 제외) 에서 `DEFAULT_META_DESCRIPTION` 토큰 grep 분포 baseline = **2** (`grep -cE 'DEFAULT_META_DESCRIPTION' src/common/common.ts` → 2 = 정의 1 + default 인자 사용 1). 3 이상 사용처 도입 시 본 spec 갱신 신호 (정의 1 + 사용 1 한정 분포 박제). | Should |
| FR-06 | `index.html:7` 의 description content 속성 값 추출 정규식 `name="description"\s+content="([^"]*)"` 가 baseline 1 match 를 산출. content 속성 형태 변경 (single quote / 다중 라인 / HTML entity escape) 시 본 spec 갱신 신호 — 본 req 는 double quote ASCII literal 형태 한정. | Should |
| FR-07 | FR-01·FR-02·FR-03·FR-04·FR-05·FR-06 6 조건의 회귀는 자동 검출 채널 (grep + content 속성 추출 + 상수 literal 추출 + 동치 비교 fixture 또는 동등) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 선정은 수단 영역, "발화 채널이 존재해야 한다" 는 계약 자체는 박제. | Should |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 결정론 | 동일 HEAD 상에서 FR-01·FR-02·FR-03·FR-04·FR-05·FR-06 의 grep + 토큰 추출 + 동치 비교 결과가 N 회 반복 시 N 회 동일 rc + 동일 출력. |
| NFR-02 | 멱등성 | 본 게이트는 read-only — `index.html` / `src/common/common.ts` 파일을 수정하지 않는다. |
| NFR-03 | 성능 | (a) FR-01 grep < 50 ms. (b) FR-02 + FR-03 grep < 100 ms. (c) FR-04 토큰 추출 + 동치 비교 < 100 ms. (d) FR-05 + FR-06 추가 측정 < 200 ms. (e) 전체 게이트 < 1 s. |
| NFR-04 | 자체 진단 제외 | 본 req / 본 spec / 테스트 문서의 본문 내 `name="description"`, `DEFAULT_META_DESCRIPTION`, `park108.net is a personal journal of Jongkil Park the developer` 등 문자열 occurrence 는 FR-01 의 `index.html` grep count 1 + FR-02 의 `src/common/common.ts` count 1 + FR-05 의 src/** count 2 와 독립 — 게이트 scope 는 `index.html` 단일 파일 + `src/common/common.ts` 단일 파일로 한정. 테스트 fixture (`src/common/common.test.ts` 또는 동등) 의 description 문자열 occurrence 는 게이트 scope 외 (`*.test.*` 파일 제외 패턴). |
| NFR-05 | 외부 비파괴 | 본 효능 도입은 `index.html` / `src/common/common.ts` 의 production 외 변경 동반 없음 — 단, FR-07 의 발화 채널 부착 수단 (예: `package.json` 의 `check:*` script 추가 또는 husky hook 부착) 은 본 spec 의 In-Scope 가 아닌 수단 영역. |
| NFR-06 | 채널 의미 분리 | 채널 H (HTML 정적 baseline, SEO/소셜 크롤러 초기 노출) ↔ 채널 D (JS module-level 상수, runtime fallback 진실 공급원) ↔ 채널 U (function default parameter binding, 무인자 호출 fallback 발화 지점) 의 의미 분리는 본 spec 의 행동 평서문에 포함되되 어느 채널의 우선순위 라벨 ("기본" / "권장" / "진실 공급원") 박제 금지 — 수단 중립. 3 채널은 실행 단계 (HTML 파싱 / module 로드 / 함수 호출) 가 독립이나 본 spec 은 **양면 토큰 동치** axis 만 박제. |
| NFR-07 | 시점 비의존 | FR-01·FR-02·FR-03·FR-04·FR-05·FR-06 은 `src/common/common.ts` 리팩토링 · `index.html` 마크업 정렬 변경 · `setMetaDescription` API 재설계 · TypeScript 메이저 bump 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 6 조건 동시 만족 회복 또는 본 spec 갱신. |

## 수용 기준
- [ ] Given HEAD `1fc3873` baseline, When `grep -cE 'name="description"' index.html` 실행, Then **출력 = 1 + rc=0** (FR-01).
- [ ] Given HEAD `1fc3873` baseline, When `grep -cE 'const DEFAULT_META_DESCRIPTION\s*=' src/common/common.ts` 실행, Then **출력 = 1 + rc=0** (FR-02).
- [ ] Given HEAD `1fc3873` baseline, When `grep -cE 'setMetaDescription\s*=\s*\([^)]*=\s*DEFAULT_META_DESCRIPTION' src/common/common.ts` 실행, Then **출력 = 1 + rc=0** (FR-03).
- [ ] Given `index.html:7` `<meta name="description" content="park108.net is a personal journal of Jongkil Park the developer" />` ∧ `src/common/common.ts:12` `const DEFAULT_META_DESCRIPTION = "park108.net is a personal journal of Jongkil Park the developer";`, When 양면 토큰 추출 + quote 제거 + byte-for-byte 비교, Then **양면 모두 동일 67 byte ASCII literal + 동치 비교 PASS** (FR-04).
- [ ] Given HEAD `1fc3873` baseline, When `grep -cE 'DEFAULT_META_DESCRIPTION' src/common/common.ts` 실행, Then **출력 = 2** (정의 1 + 사용 1) (FR-05).
- [ ] Given `index.html:7`, When `grep -oE 'name="description"\s+content="[^"]*"' index.html` 실행, Then **1 match + 추출된 content 값이 67 byte ASCII** (FR-06).
- [ ] Given 회귀 가설 (R-1): `index.html:7` content 텍스트를 다른 문자열로 변경, When 본 게이트 실행, Then **채널 H 토큰 ≠ 채널 D 토큰 → FR-04 동치 비교 FAIL, rc=1**.
- [ ] Given 회귀 가설 (R-2): `src/common/common.ts:12` `DEFAULT_META_DESCRIPTION` literal 값 변경, When 본 게이트 실행, Then **채널 D 토큰 ≠ 채널 H 토큰 → FR-04 동치 비교 FAIL, rc=1**.
- [ ] Given 회귀 가설 (R-3): `src/common/common.ts:14` default 인자 binding 제거 (`desc: string` 만), When 본 게이트 실행, Then **FR-03 grep count = 0 → rc=1**.
- [ ] Given 회귀 가설 (R-4): `src/common/common.ts:12` 상수 정의 자체 삭제, When 본 게이트 실행, Then **FR-02 grep count = 0 → rc=1** (병행: TypeScript compile error `Cannot find name 'DEFAULT_META_DESCRIPTION'` lint/typecheck 채널 검출).
- [ ] Given 회귀 가설 (R-5): `src/common/common.ts:14` default 인자 binding 을 inline literal 로 변경 (`desc: string = "park108.net blog"`), When 본 게이트 실행, Then **FR-03 grep count = 0 (DEFAULT_META_DESCRIPTION token 미사용) → rc=1** — 단일 진실 공급원 위반 검출.
- [ ] Given 동일 HEAD `1fc3873`, When 본 게이트 N 회 실행, Then **N 회 동일 rc + 동일 출력** (NFR-01 결정론).
- [ ] Given 본 게이트 실행, When `index.html` / `src/common/common.ts` 파일 mtime 측정, Then **mtime 변경 없음** (NFR-02 멱등성).

## 참고
- 자매 spec: `specs/30.spec/green/foundation/index-html-public-asset-reference-coherence.md` (REQ-099, green) — `index.html` 정적 자원 참조 4종 + `theme-color` 양면 동치 axis. OOS 박제 (line 75) "`<meta name="description">` 의 description 텍스트 자체 정합 (SEO 정책 — 별 axis)" 명시 — 본 req 가 그 별 axis 박제.
- 자매 spec: `specs/30.spec/green/foundation/csp-meta-dev-strip-prod-preserve.md` (REQ-098, green) — `index.html:9` CSP meta dev/prod 비대칭 axis. 부수 조건 평서 (`<meta name="description">` 보존) 만 박제, content 토큰 자체 양면 동치는 미박제. 본 req 와 직교.
- 자매 spec: `specs/30.spec/blue/components/common.md` (REQ-? `setHtmlTitle/setMetaDescription` API 박제) — line 15 함수 signature 박제. default fallback 값 자체의 양면 동치는 미박제. 본 req 가 그 axis 박제.
- 자매 spec: `specs/60.done/2026/05/18/req/20260518-meta-robots-robotstxt-policy-semantic-coherence.md` (REQ-20260518-001) — `<meta name="robots">` ↔ `public/robots.txt` 양면 의미 동치 axis. `<meta name="robots">` element 영역으로 본 req 와 직교.
- 자매 spec: `specs/20.req/20260518-index-html-root-mount-id-token-coherence.md` (REQ-20260518-002) — `<div id="root">` mount ID 토큰 3극 axis. mount selector 영역으로 본 req 와 직교.
- 외부 출처:
  - WHATWG HTML Living Standard §4.2.5.1 standard metadata names (https://html.spec.whatwg.org/multipage/semantics.html#standard-metadata-names) — `name="description"` 은 "describes the page" semantic, content attribute 필수.
  - Google Search Central — "How to Write Meta Descriptions" (https://developers.google.com/search/docs/appearance/snippet) — meta description 은 search snippet 후보, unique descriptive content 권장.
  - MDN — Standard metadata names (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name) — Firefox/Opera default bookmark description.
  - ECMAScript Language Specification §15.2.4 — function default parameter evaluation 은 호출 시점 closure scope binding resolve.
- 측정 출처: HEAD `1fc3873` 실측 — `grep -cE 'name="description"' index.html` = 1 / `grep -cE 'const DEFAULT_META_DESCRIPTION\s*=' src/common/common.ts` = 1 / `grep -cE 'setMetaDescription\s*=\s*\([^)]*=\s*DEFAULT_META_DESCRIPTION' src/common/common.ts` = 1 / `grep -cE 'DEFAULT_META_DESCRIPTION' src/common/common.ts` = 2 / `index.html:7` content 값 = `"park108.net is a personal journal of Jongkil Park the developer"` (67 byte ASCII) / `src/common/common.ts:12` literal 값 = 동일 67 byte ASCII.
- 사용처 (production 코드): `src/Log/LogSingle.jsx:4` `import ... setMetaDescription ... from '../common/common'` / `:39` `return () => { setMetaDescription(); }` (default 무인자, fallback 발화) / `:57` `setMetaDescription(summary + ellipsis)` (인자 전달) / `:63` `setMetaDescription(PAGE_NOT_FOUND)` (인자 전달).
- RULE-07 양성 근거: 본 req 는 incident / 일회성 진단이 아니라 production 코드의 SEO meta description default fallback 양면 토큰 **시스템 불변식** 을 요구. 테스트 / grep 으로 반복 검증 가능하며 시점·릴리스 의존 없음. baseline 측정값은 HEAD `1fc3873` 스냅샷 박제이나 효능 평서 자체는 시점 비의존 (NFR-07).
