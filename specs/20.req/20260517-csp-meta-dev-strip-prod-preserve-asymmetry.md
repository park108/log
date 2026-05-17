# `index.html` CSP meta 출력 비대칭 계약 (dev serve strip + prod build preserve + plugin apply 제약 + 1회 멱등 strip) 시스템 불변식

> **ID**: REQ-20260517-098
> **작성일**: 2026-05-17
> **상태**: Draft

## 개요
저장소 root `index.html` 의 `<meta http-equiv="Content-Security-Policy" ...>` 메타 태그는 출력 모드에 따라 비대칭 동작 계약을 가진다 — (a) `vite serve` (dev) 출력에서는 제거되고, (b) `vite build` 산출물 (`build/index.html`) 에서는 원본 그대로 보존된다. 본 비대칭은 `vite.config.js` 의 `stripCspMetaInDev` 플러그인이 (i) `apply: 'serve'` 로 dev 한정 발화, (ii) `transformIndexHtml.order: 'post'`, (iii) single-match regex 1회 strip + CSP meta 부재 입력에 대한 멱등 noop 라는 4 조건 동시 만족으로 달성된다. 본 req 는 결과 효능 (출력 모드 × CSP meta 존재 여부 정합 + plugin 4 조건) 만 박제하며, 수단 (현 vite plugin 유지 vs 별도 transform 채널 vs build-time grep guard) 선정은 inspector/planner 영역.

## 배경
- HEAD=`7477189` 실측 — CSP meta 출력 동작이 코드와 테스트에는 정착되어 있으나 `30.spec/**` 박제 부재 (`-097` §A 가 `vite.config.js:9` 의 `csp-policy-spec §3.2` 참조를 dead-link 로 박제, RULE-01 suffix 위반 + 디스크 부재 동시 판정):
  - 원본 `index.html:8` — 단일 `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; connect-src 'self' https://*.execute-api.ap-northeast-2.amazonaws.com; img-src 'self' data: https://d0.awsstatic.com https://brand.linkedin.com; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';">` 박제 1 hit.
  - prod build 산출물 `build/index.html` — `grep -c "Content-Security-Policy" build/index.html` = **1 hit** (보존 확인, HEAD `7477189` 시점 build artifact 실측).
  - dev 동작 플러그인 `vite.config.js:13-27` — `stripCspMetaInDev()` 함수 정의:
    - L15 `name: 'strip-csp-meta-in-dev'`
    - L16 `apply: 'serve'` (build 발화 차단)
    - L17-18 `transformIndexHtml.order: 'post'`
    - L19-23 single regex `/^\s*<meta\s+http-equiv="Content-Security-Policy"[^>]*>\s*\n?/m` + `html.replace(...)` (1회 strip).
  - 플러그인 등록 `vite.config.js:35` — `plugins: [react(...), svgr(), stripCspMetaInDev()]` 진입.
  - 현 행동 단위 테스트 `vite.config.test.js:7-75` — 6 it 박제 (name / apply / order / 제거 / 멱등 / single-match), 그러나 spec 부재.
- spec/req tree 누락 (중복 회피 grep):
  - `grep -rln -iE "csp|content.security.policy|stripCspMetaInDev|csp-policy" specs/30.spec/{blue,green}/` → **1 hit 만** (`30.spec/green/foundation/root-config-spec-reference-coherence.md` — REQ-097 의 root-level 참조 path coherence 자매, CSP 자체 계약 박제 아님).
  - `grep -rln -iE "csp|content.security.policy|stripCspMetaInDev" specs/20.req specs/60.done/**/req 2>/dev/null` → 3 hit (REQ-097 root-config-spec-reference / REQ test-discovery-population-coherence / REQ vite-jsx-transform-channel-coherence) 모두 CSP 메타 자체 계약이 아닌 (a) root-level 참조 path coherence (b) vitest test 파일 discovery (c) vite jsx transform 채널 정합 — 본 axis 와 직교.
- 폐해 (시스템 효능 기준):
  - (a) 코드 + 테스트 + prod artifact 가 4 조건을 만족하지만, "왜 dev 에서만 strip 되어야 하는가 + 왜 prod build artifact 에 CSP meta 1 hit 이 유지되어야 하는가" 의 시스템 계약이 spec 으로 박제되지 않음 → 회귀 차단 채널 부재. 누군가 `vite.config.js` plugin 의 `apply` 를 누락하거나 `'build'` 로 바꾸어 prod artifact 에서 CSP meta 가 사라져도 (또는 dev 에서 strip 이 비활성화되어 HMR `eval` 차단으로 dev 환경이 망가져도) 자동 검출 불가.
  - (b) `vite.config.js:9` 의 `csp-policy-spec §3.2 / §5.1 FR-14` 참조 주석 — RULE-01 `-spec` suffix 위반 + 디스크 부재 (REQ-097 축 A·B 박제). REQ-097 은 참조 path 정합만 다루며 §43 Out-of-Scope 에 "축 A 위반 hit 의 수렴 방안 (정합 spec 신규 박제 vs 참조 주석 삭제 vs 참조 경로 갱신) 선정 — 모두 수단 영역" 명시. 본 req 는 그 수단 중 "정합 spec 신규 박제" 가 가능하기 위한 **결과 효능 계약** (수단 중립적으로 — 본 req 가 발행되어도 inspector/planner 가 spec 신규 박제 vs 참조 주석 삭제 중 어느 수단을 선택하든 결과 효능 자체는 본 req 의 FR-01~05 게이트로 박제).
  - (c) prod artifact `build/index.html` 의 CSP meta 보존 여부는 build pipeline (`npm run build`) 실행 직후에만 관측 가능 — pre-push/CI 단계에서 build artifact 의 CSP meta 1 hit 자동 검증 채널 부재 (`pre-push:1-3` 에 build artifact CSP grep gate 0 hit; `package.json:24-28` `check:*` scripts 5개 모두 build artifact CSP scan 미수행).
- RULE-07 양성 기준 자기 검증:
  - (1) 평서문 시점 비의존: "dev serve 출력은 CSP meta 가 제거되고, prod build 산출물은 CSP meta 가 보존된다" — 특정 incident/날짜/릴리스 귀속 부재. plugin 의 `apply` 제약과 1회 멱등 strip 도 시점 비의존 계약.
  - (2) 반복 검증 가능: build artifact grep (`grep -c "Content-Security-Policy" build/index.html` = 1) + dev transformIndexHtml fixture (`vite.config.test.js:7-75` 와 동등 형식) 으로 매 빌드/매 테스트 반복 검증 가능.
  - (3) incident 비의존: 현 HEAD `7477189` 의 행동은 안정 정착 (테스트 6 it PASS 가정). 본 req 는 회귀 차단 채널 신규 박제 — 1회성 진단/마이그레이션/release patch 귀속 부재.
- 기 등록 req 와의 직교성 (중복 회피 grep):
  - **REQ-20260517-097 (root-config-spec-reference-path-coherence)** — root-level 파일군의 spec 참조 path 정합 (`-spec` suffix + 디스크 실재 + promote 동기화 3 축). 본 req 의 §A `vite.config.js:9` 참조 주석 자체는 -097 §A 의 위반 baseline 에 포함되어 있으나, -097 §43 Out-of-Scope 명시로 본 req 는 **CSP 동작 계약** axis 만 다루는 별 axis (수단 중립적으로 -097 의 위반 수렴 방안 중 하나의 결과 효능 박제 가능성을 제공).
  - **REQ-20260517-073 (vite-jsx-transform-channel-coherence)** — vite jsx transform 채널 (`react()` plugin `include` 정합) — 본 req 의 plugin 등록 chain (`plugins: [react(...), svgr(), stripCspMetaInDev()]`) 의 react/svgr/csp plugin 3종 중 react plugin 만 다룸. 본 req 와 직교.
  - **REQ-20260517-test-discovery-population-coherence** — vitest 의 test 파일 (`vite.config.test.js` 포함) discovery 정합. 본 req 의 동작 계약 자체와 직교 (test 파일 존재성만 다루며 그 내용/동작 계약은 별 axis).

## 목표
- **In-Scope** (req 단위):
  - 저장소 root `index.html` 의 단일 `<meta http-equiv="Content-Security-Policy">` 메타 태그가 (a) `vite serve` (dev) 출력에서 제거 + (b) `vite build` 산출물 (`build/index.html`) 에서 보존 의 비대칭 출력 계약을 가져야 한다는 결과 효능 게이트 박제 후보 신호.
  - `stripCspMetaInDev` 플러그인 (수단 채택 시) 의 4 조건: (i) `apply: 'serve'` (dev 한정 발화), (ii) `transformIndexHtml.order: 'post'` (다른 plugin 변환 후 적용), (iii) 1회 strip + CSP meta 부재 입력에 대한 멱등 noop, (iv) 다중 CSP meta 입력 시 첫 번째만 제거 (single regex match) — 본 4 조건은 수단 채택 시 만족해야 하는 행동 계약.
  - 본 게이트 측정 단일 명령 후보 박제:
    - (g-A) `npm run build && grep -c "Content-Security-Policy" build/index.html` = **1** (prod 보존).
    - (g-B) dev mode 의 `transformIndexHtml` 등가 호출 — CSP meta 포함 입력 → CSP meta 0 hit 출력 (dev strip), CSP meta 부재 입력 → 동일 출력 (멱등 noop).
- **Out-of-Scope**:
  - 본 게이트의 발화 채널 선정 (pre-push 에 `npm run build && grep ...` 추가 vs CI 단계 부착 vs `package.json` 신규 `check:csp-artifact` script) — 모두 수단 영역.
  - CSP `directive` 자체 (default-src / script-src / connect-src / img-src / style-src 등) 의 값 정합 — fixture host 와 `connect-src`/`img-src` whitelist 비교는 별 axis (`-097` §A 의 또 다른 axis).
  - `index.html:8` 의 CSP directive 변경 (예: `'unsafe-inline'` 제거, `script-src` nonce 도입) — 본 req 와 별 axis (CSP 정책 강화는 별도 req).
  - `vite.config.js:9` 의 RULE-01 `-spec` suffix 위반 주석 자체의 수렴 — REQ-097 의 위반 baseline 이며 본 req 의 결과 효능은 그 위반 수렴 수단 중 하나의 박제 가능성만 제공 (수단 선정은 inspector/planner).
  - `vite.config.test.js` 의 test 파일 자체의 discovery 정합 — REQ test-discovery-population-coherence 자매 axis.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `vite build` 직후 `build/index.html` 에 `Content-Security-Policy` 문자열이 정확히 1회 보존된다 (`grep -c "Content-Security-Policy" build/index.html` = 1). 원본 `index.html:8` 의 CSP directive 문자열 일치도 보존되어야 한다 (substring 보존). | Must |
| FR-02 | `vite serve` (dev) 출력 HTML 또는 등가의 `transformIndexHtml` 호출 결과에는 `Content-Security-Policy` 문자열이 0 hit 으로 제거된다 (HMR `eval` 호환 보장). 다른 meta 태그 (charset, viewport, description, robots 등) 와 `<title>`, `<link>` 는 보존된다 (CSP meta 한정 제거). | Must |
| FR-03 | dev strip 동작 수단 채택 시 (예: vite plugin), 그 플러그인은 (i) `apply: 'serve'` 로 dev 한정 발화 + (ii) `transformIndexHtml.order: 'post'` (다른 plugin 변환 후 적용) 두 조건을 동시 만족한다. build 모드 발화는 0 회 (FR-01 보존 보장). | Must |
| FR-04 | dev strip 동작은 멱등이다 — (a) CSP meta 부재 입력에 동작 시 출력 = 입력 (noop), (b) CSP meta 1 hit 입력에 2회 연속 동작 시 1회 동작 결과와 동일 (1회 strip 후 추가 변경 0), (c) CSP meta 다중 hit 입력에 동작 시 첫 번째 hit 만 제거 (single regex match — 정책은 meta 1개만 허용). | Must |
| FR-05 | FR-01·FR-02·FR-03·FR-04 4 조건의 회귀는 자동 검출 채널 (단위 테스트 + build artifact grep 또는 동등 fixture) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit/pre-push/CI) 선정은 수단 영역이나 "발화 채널이 존재해야 한다" 는 계약 자체는 Must. | Should |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 결정론 | 동일 HEAD 상에서 `npm run build && grep -c "Content-Security-Policy" build/index.html` N 회 실행 시 N 회 동일 rc=0 + 동일 출력 (=1). dev transformIndexHtml fixture 도 동일 입력 → 동일 출력. |
| NFR-02 | 멱등성 | dev strip 자체가 idempotent (FR-04 박제). 본 게이트는 read-only — `index.html` / `vite.config.js` / build artifact 를 수정하지 않는다 (build artifact 재생성은 게이트 실행의 부수효과로 허용되나 본 req 자체는 build 명령 강제하지 않음 — 수단 영역). |
| NFR-03 | 성능 | (a) `grep -c "Content-Security-Policy" build/index.html` < 100 ms (단일 파일). (b) dev transformIndexHtml fixture 단위 테스트 < 100 ms / it. (c) 전체 게이트 < 30 s (build 시간 포함 시) / < 1 s (build artifact 존재 가정 시). |
| NFR-04 | 보안 | prod build artifact 의 CSP meta 보존은 보안 baseline (XSS / data exfiltration 방어 표면). dev strip 은 HMR 호환 보장 한정 — prod 보안 baseline 약화 금지. dev artifact 는 외부 공개 금지 (`server.host` 기본값 localhost). |
| NFR-05 | 자체 진단 제외 | 본 req / spec / 테스트 (`vite.config.test.js`) 의 본문 내 `Content-Security-Policy` 문자열 occurrence 는 FR-01 의 build artifact grep count 1 과 독립 — 게이트 scope 는 `build/index.html` 단일 파일로 한정된다 (NFR-03 (a) 단일 파일 grep). |

## 수용 기준
- [ ] **Given** HEAD `7477189` (또는 동일 baseline 재현 HEAD), **When** `npm run build` 실행 후 `grep -c "Content-Security-Policy" build/index.html`, **Then** 출력 = **1** + rc=0 (FR-01 baseline 박제).
- [ ] **Given** 동일 HEAD, **When** `vite.config.test.js` 의 6 it 실행, **Then** 전수 PASS (FR-02·FR-03·FR-04 의 unit fixture 충족 — name / apply / order / 제거 / 멱등 / single-match).
- [ ] **Given** 가설 회귀 — `vite.config.js:16` 의 `apply: 'serve'` 를 `apply: 'build'` 로 변경, **When** `npm run build` 후 동일 grep, **Then** 출력 = **0** + rc=1 (FR-01 위반 검출 — FR-03 조건 (i) 위반의 결과 효능).
- [ ] **Given** 가설 회귀 — `vite.config.js:13-27` `stripCspMetaInDev` 함수 또는 `plugins:` 배열에서 등록 삭제, **When** dev serve 또는 등가 transformIndexHtml 호출, **Then** CSP meta 가 출력에 잔존 (FR-02 위반 검출).
- [ ] **Given** 가설 회귀 — `vite.config.js:20-22` 의 regex 가 `^...m` 단일 match flag 를 `g` (global) 로 변경, **When** 다중 CSP meta 입력에 대한 fixture, **Then** 첫 번째만 제거 ≠ 전체 제거 (FR-04 (c) 위반 검출).
- [ ] **Given** 본 req 수렴 후 HEAD, **When** FR-05 의 발화 채널 (pre-push / CI 등) 에서 build artifact grep + unit fixture 실행, **Then** 두 채널 모두 rc=0 + FR-01~04 4 조건 동시 만족 (수단 중립 — 어떤 발화 채널을 채택하든 결과 효능 동일).

## 참고
- 원본 코드:
  - `index.html:8` — CSP meta 단일 박제 (HEAD `7477189`).
  - `vite.config.js:9-27` — `stripCspMetaInDev` 함수 정의 (`/Users/park108/Dev/log/vite.config.js`).
  - `vite.config.js:31-37` — plugin 등록 chain (`plugins: [react(...), svgr(), stripCspMetaInDev()]`).
- 현 행동 단위 테스트: `vite.config.test.js:7-75` (6 it — name / apply / order / 제거 / 멱등 / single-match).
- 현 baseline 실측:
  - `build/index.html` 의 `Content-Security-Policy` count = 1 (HEAD `7477189`).
  - `index.html:8` 의 CSP directive 8 항목 (default-src / script-src / connect-src / img-src / style-src / object-src / base-uri / frame-ancestors / form-action).
- 인접 req:
  - `specs/60.done/2026/05/17/req/20260517-root-config-spec-reference-path-coherence.md` (REQ-097) — `vite.config.js:9` 의 `-spec` suffix 위반 baseline + 디스크 부재 박제. 본 req 와 보완 axis (수단 중립적으로 -097 의 위반 수렴 수단 중 "정합 spec 신규 박제" 가능성 제공).
  - `specs/60.done/2026/05/17/req/20260517-vite-jsx-transform-channel-coherence.md` — vite plugin chain 의 react plugin 채널만 박제, 본 req 는 동일 plugin chain 의 csp plugin 채널 박제 — 자매 axis.
  - `specs/60.done/2026/05/17/req/20260517-test-discovery-population-coherence.md` — `vite.config.test.js` 의 vitest discovery 박제, 본 req 의 unit test 발화 채널 의존성 (FR-05) 의 인접 axis.
- RULE-01 §파일 이름: `specs/30.spec/{blue,green}/**/<slug>.md` — `-spec` suffix 금지 (`/Users/park108/Dev/log/.claude/rules/RULE-01-PIPELINE.md:25`). 본 req 의 향후 spec 박제 시 RULE-01 준수 필수.
- RULE-07 §양성 기준: 본 req 는 (1) 평서문 시점 비의존 + (2) 반복 검증 가능 (build artifact grep + unit fixture) + (3) incident 비의존 3 조건 자기 검증 완료 (§배경 RULE-07 양성 기준 자기 검증).
