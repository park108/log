# `index.html` CSP meta 출력 비대칭 계약 (dev serve strip + prod build preserve + plugin apply 제약 + 1회 멱등 single-match strip)

> **위치**: 횡단 빌드/도구 시스템 불변식 — 저장소 root `index.html` 의 단일 `<meta http-equiv="Content-Security-Policy" ...>` 메타 태그 + `vite.config.js` 의 `stripCspMetaInDev` plugin (`vite.config.js:13-27`) + plugin 등록 chain (`vite.config.js:30-36` `plugins: [react(...), svgr(), stripCspMetaInDev()]`). 게이트 측정 대상: `build/index.html` 산출물 (prod) + `transformIndexHtml.handler` 호출 결과 (dev fixture).
> **관련 요구사항**: REQ-20260517-098
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제; Phase 2 REQ-098 흡수)

> 본 spec 은 자매 `foundation/root-config-spec-reference-coherence.md` (REQ-097) 의 §Out-of-Scope 명시 "정합 spec 신규 박제" 결과 효능 axis 보완 — REQ-097 §스코프 규칙 baseline 의 `vite.config.js:9` `csp-policy-spec` 참조 위반 hit 수렴 수단 중 하나의 결과 효능을 박제하되, REQ-097 의 참조 path 정합 axis 와 직교 (본 spec 은 CSP 동작 계약 자체 박제).

## 역할
저장소 root `index.html` 의 단일 `<meta http-equiv="Content-Security-Policy">` 메타 태그는 **출력 모드에 따라 비대칭 결과 효능 계약** 을 가진다 — (a) `vite serve` (dev) 출력에서 0 hit 으로 제거되고 (HMR `eval` 호환 보장), (b) `vite build` 산출물 (`build/index.html`) 에서 정확히 1회 보존된다 (prod 보안 baseline). 본 비대칭은 (수단 채택 시) `stripCspMetaInDev` plugin 의 4 조건 — (i) `apply: 'serve'` (dev 한정 발화), (ii) `transformIndexHtml.order: 'post'` (다른 plugin 변환 후 적용), (iii) 1회 strip + CSP meta 부재 입력 멱등 noop, (iv) 다중 hit 입력에 single regex match (첫 hit 만 제거) — 동시 만족으로 달성된다. 의도적으로 하지 않는 것: 본 게이트 발화 채널 (pre-push / CI / `package.json` 신규 `check:csp-artifact` script) 선정, CSP directive 자체 (`default-src` / `script-src` / `connect-src` / `img-src` / `style-src` 등) 값 정합, `index.html:8` 의 CSP directive 변경 (예: `'unsafe-inline'` 제거 / `script-src` nonce 도입), `vite.config.js:9` `csp-policy-spec` 참조 주석의 RULE-01 suffix 위반 자체의 수렴 수단 (REQ-097 axis A), `vite.config.test.js` 의 vitest discovery 정합 (자매 REQ test-discovery-population-coherence axis), dev strip 수단 채택 자체 (현 vite plugin 유지 vs 별도 transform 채널 vs build-time grep guard — 수단 중립).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `build/index.html` 산출물 grep + dev `transformIndexHtml.handler` 호출 결과 fixture 검증.

## 동작
1. (G-A) prod build artifact 보존 게이트 — FR-01
   - 명령: `npm run build && grep -c "Content-Security-Policy" build/index.html` → **출력 = 1 + rc=0**.
   - 의미: `vite build` 산출물은 원본 `index.html:8` 의 CSP meta 를 정확히 1회 보존한다 (보안 baseline 약화 0).
   - 보조: 원본 `index.html:8` CSP directive 문자열 (`default-src 'self'; script-src 'self'; connect-src 'self' https://*.execute-api.ap-northeast-2.amazonaws.com; img-src 'self' data: https://d0.awsstatic.com; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';`) 의 substring 동등성도 보존 (directive 8 항목 전수 유지).
2. (G-B) dev serve strip 게이트 — FR-02
   - 절차: dev 모드 출력 HTML 또는 등가의 `transformIndexHtml.handler(html)` 호출 (CSP meta 포함 입력) → 출력에서 `Content-Security-Policy` **0 hit**.
   - 의미: dev serve 는 HMR `eval` 호환 보장을 위해 CSP meta 를 제거한다.
   - 부수 조건: 다른 meta 태그 (`<meta charset>`, `<meta name="viewport">`, `<meta name="description">`, `<meta name="robots">` 등) 와 `<title>`, `<link>`, body 내용은 모두 보존된다 (CSP meta 한정 제거 — 다른 element 손실 0).
3. (G-C) plugin apply 제약 게이트 — FR-03
   - 절차: dev strip 동작 수단 (수단 채택 시 — 현 `stripCspMetaInDev` plugin 등) 은 (i) `apply: 'serve'` 로 dev 한정 발화 + (ii) `transformIndexHtml.order: 'post'` (다른 plugin 변환 후 적용) 두 조건을 동시 만족한다.
   - 의미: build 모드 발화 0 회 (G-A 보존 보장). order 'post' 로 다른 plugin (예: `@vitejs/plugin-react` HTML 변환) 변환 결과 후 적용 — 변환 순서 race 회피.
4. (G-D) 멱등 single-match 게이트 — FR-04
   - 절차: dev strip 동작 (수단 채택 시 — `transformIndexHtml.handler` 등) 은 (a) CSP meta 부재 입력에 동작 시 출력 == 입력 (noop), (b) CSP meta 1 hit 입력에 2회 연속 동작 시 1회 동작 결과와 동일 (1회 strip 후 추가 변경 0), (c) CSP meta 다중 hit 입력에 동작 시 첫 hit 만 제거 (single regex match — 정책은 meta 1개만 허용) 3 조건 동시 만족.
   - 의미: 동작은 시점·횟수 비의존 (NFR-02 멱등성). single regex match (regex flag `m` 만, `g` 비사용) 로 다중 hit 입력 시 정책 위반 (meta 2개 이상) 의 첫 hit 만 제거하고 나머지는 보존 → 정책 violation 감지 가능.
5. (G-E) 회귀 검출 채널 존재 게이트 — FR-05
   - G-A ∧ G-B ∧ G-C ∧ G-D 4 조건은 단위 테스트 + build artifact grep (또는 동등 fixture) 채널을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:csp-artifact` script) 선정은 수단 영역이나 "발화 채널이 존재해야 한다" 는 계약 자체는 박제.
6. (G-F) 시점 비의존 — NFR-01
   - G-A ∧ G-B ∧ G-C ∧ G-D 는 `vite.config.js` plugin 등록 chain 변경·`index.html` CSP directive 값 갱신·`vite` 메이저 bump·`@vitejs/plugin-react` 메이저 bump 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 G-A·G-B·G-C·G-D 동시 만족 회복 또는 본 spec 갱신 (수단 채택 변경 시 §동작 (수단 채택 시) 조건 표 갱신).
7. (G-G) 자체 진단 제외 — 결정론 보장
   - 본 req / 본 spec / 테스트 (`vite.config.test.js`) 의 본문 내 `Content-Security-Policy` 문자열 occurrence 는 FR-01 의 build artifact grep count 1 과 독립 — 게이트 scope 는 `build/index.html` 단일 파일로 한정된다 (NFR-03 (a) 단일 파일 grep). 동일 HEAD 상에서 본 게이트 N 회 실행 시 N 회 동일 rc + 동일 출력 (=1).

## 의존성
- 내부: `index.html` (원본 CSP meta 박제 위치 — `index.html:8`), `vite.config.js` (plugin 정의 `vite.config.js:13-27` + 등록 chain `vite.config.js:30-36`), `vite.config.test.js` (단위 fixture `vite.config.test.js:7-75` 6 it — name / apply / order / 제거 / 멱등 / single-match), `build/index.html` (prod artifact — `vite build` 산출).
- 외부: `vite` (`apply` / `transformIndexHtml.order` API surface), `@vitejs/plugin-react` (plugin chain 등록 순서 — 본 plugin 의 order 'post' 가 전제하는 react plugin 의 변환 시점), POSIX `grep` (G-A 측정 명령), `vitest` (G-B/G-C/G-D fixture 발화 채널).
- 역의존 (사용처): pre-push / CI 단계의 build artifact 검증 hook 또는 `package.json` 신규 `check:csp-artifact` script (수단 위임). `vite.config.js` plugin 등록 chain 의 변경 (예: `apply` 누락 / `apply: 'build'` 로 변경 / `order: 'pre'` / `plugins:` 배열에서 등록 삭제) 모두 본 spec 위반 회귀 후보.
- 자매 spec: `foundation/root-config-spec-reference-coherence.md` (green, REQ-097) — `vite.config.js:9` `csp-policy-spec` 참조 주석의 RULE-01 suffix 위반 + 디스크 부재 baseline 박제. 본 spec 은 그 위반 수렴 수단 중 "정합 spec 신규 박제" 의 결과 효능 axis (수단 중립적으로 본 spec 박제 자체가 REQ-097 G-B/G-C 의 1 MISSING 종속 수렴에 기여하지는 않음 — `csp-policy-spec` slug 와 본 `csp-meta-dev-strip-prod-preserve` slug 가 상이; 수렴은 별도 task 의 `vite.config.js:9` 주석 갱신/삭제 수단으로 처리).

## 테스트 현황
- [ ] (G-A) `npm run build && grep -c "Content-Security-Policy" build/index.html` → 1 + rc=0 (baseline 1 hit 박제, HEAD `7477189` 실측 — REQ-098 §배경).
- [ ] (G-B) dev `transformIndexHtml.handler(html_with_csp)` → `Content-Security-Policy` 0 hit + 다른 meta/`<title>`/`<link>` 보존 (baseline `vite.config.test.js:23-43` 5 expect 박제).
- [ ] (G-C) `stripCspMetaInDev()` returned plugin 의 `apply == 'serve'` + `transformIndexHtml.order == 'post'` (baseline `vite.config.test.js:13-21` 2 it 박제).
- [ ] (G-D) 멱등 noop (`vite.config.test.js:45-58` 1 it) + single-match (`vite.config.test.js:60-74` 1 it) — baseline 2 it 박제. 2회 연속 동작 멱등 (case (b)) 는 unit fixture 신규 박제 후보 (현 미박제 — task 영역).
- [ ] (G-E) 발화 채널 존재 — `vite.config.test.js` 6 it 은 vitest discovery 정합 (자매 REQ test-discovery-population-coherence) 으로 발화되나, build artifact grep (G-A) 의 pre-push / CI 발화 채널은 미박제 (수단 위임).
- [ ] (G-F) 시점 비의존 — `vite` / `@vitejs/plugin-react` 메이저 bump 또는 `index.html:8` CSP directive 갱신 후 1 PR 안에 G-A·G-B·G-C·G-D 동시 만족 회복 사례 누적.
- [ ] (G-G) 자체 진단 제외 — 본 spec / req / test 파일의 `Content-Security-Policy` occurrence 가 G-A grep count 영향 0 (단일 파일 scope `build/index.html`).

## 수용 기준
- [ ] (Must FR-01) `npm run build` 직후 `grep -c "Content-Security-Policy" build/index.html` → **출력 = 1 + rc=0**. 원본 `index.html:8` 의 CSP directive 8 항목 (default-src / script-src / connect-src / img-src / style-src / object-src / base-uri / frame-ancestors / form-action) substring 보존.
- [ ] (Must FR-02) `vite serve` (dev) 출력 HTML 또는 등가 `transformIndexHtml.handler(html_with_csp)` 호출 결과에 `Content-Security-Policy` 0 hit. 다른 meta 태그 (charset / viewport / description / robots 등) 와 `<title>`, `<link>` 보존 (CSP meta 한정 제거 — 다른 element 손실 0).
- [ ] (Must FR-03) dev strip 동작 수단 채택 시 (예: `stripCspMetaInDev` plugin) 그 plugin 의 (i) `apply === 'serve'` + (ii) `transformIndexHtml.order === 'post'` 동시 만족. build 모드 발화 0 회.
- [ ] (Must FR-04) dev strip 동작은 멱등이다 — (a) CSP meta 부재 입력 → 출력 == 입력 (noop), (b) CSP meta 1 hit 입력 2회 연속 동작 → 1회 동작 결과 동일, (c) CSP meta 다중 hit 입력 → 첫 hit 만 제거 (single regex match, regex flag `g` 비사용).
- [ ] (Should FR-05) FR-01·FR-02·FR-03·FR-04 4 조건의 회귀는 자동 검출 채널 (단위 테스트 + build artifact grep 또는 동등 fixture) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:csp-artifact` script) 선정 수단 영역, "발화 채널 존재" 계약 박제.
- [ ] (Must NFR-01 결정론) 동일 HEAD 상에서 `npm run build && grep -c "Content-Security-Policy" build/index.html` N 회 실행 시 N 회 동일 rc=0 + 동일 출력 (=1). dev `transformIndexHtml.handler` fixture 도 동일 입력 → 동일 출력.
- [ ] (Must NFR-02 멱등성) dev strip 자체가 idempotent (FR-04 박제). 본 게이트는 read-only — `index.html` / `vite.config.js` / build artifact 를 수정하지 않는다 (build artifact 재생성은 게이트 실행의 부수효과로 허용되나 본 spec 자체는 build 명령 강제하지 않음 — 수단 영역).
- [ ] (Should NFR-03 성능) `grep -c "Content-Security-Policy" build/index.html` < 100 ms (단일 파일). dev `transformIndexHtml.handler` fixture 단위 테스트 < 100 ms / it. 전체 게이트 < 30 s (build 시간 포함 시) / < 1 s (build artifact 존재 가정 시).
- [ ] (Must NFR-04 보안) prod build artifact 의 CSP meta 보존은 보안 baseline (XSS / data exfiltration 방어 표면). dev strip 은 HMR 호환 보장 한정 — prod 보안 baseline 약화 금지. dev artifact 외부 공개 금지 (`server.host` 기본값 localhost 의존).
- [ ] (Must NFR-05 자체 진단 제외) 본 req / spec / 테스트 (`vite.config.test.js`) 의 본문 내 `Content-Security-Policy` 문자열 occurrence 는 FR-01 의 build artifact grep count 1 과 독립 — 게이트 scope 는 `build/index.html` 단일 파일 한정 (NFR-03 (a) 단일 파일 grep).
- [ ] (Must, 회귀 가설 검출) `vite.config.js:16` `apply: 'serve'` → `apply: 'build'` 변경 가설 회귀 시 `npm run build` 후 `grep -c "Content-Security-Policy" build/index.html` = 0 + rc=1 으로 검출 (FR-03 조건 (i) 위반의 결과 효능 — FR-01 위반).
- [ ] (Must, 회귀 가설 검출) `vite.config.js:13-27` `stripCspMetaInDev` 함수 정의 또는 `vite.config.js:30-36` plugin 등록 chain 에서 삭제 가설 회귀 시 dev `transformIndexHtml.handler` 호출 결과에 CSP meta 잔존 (FR-02 위반 검출).
- [ ] (Must, 회귀 가설 검출) `vite.config.js:20-22` regex 의 flag `m` → `g` (global) 변경 가설 회귀 시 다중 CSP meta 입력 fixture 에서 첫 hit 만 제거 ≠ 전체 제거 (FR-04 (c) 위반 검출).
- [ ] (Must, 시점 비의존) `vite` 또는 `@vitejs/plugin-react` 메이저 bump 또는 `index.html:8` CSP directive 갱신 후 1 PR 안에 FR-01·FR-02·FR-03·FR-04 동시 만족 회복 사례 누적 ≥ 1건.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 빌드 시스템 횡단 게이트 박제 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`a5edd2d`, 2026-05-17 — 본 spec 박제 시점 실측, REQ-098 §배경 HEAD `7477189` 이후 src/spec/root 도입 차분: planner promote 2 + REQ-098 발행 만 — CSP 동작 영역 차분 0):
  - (G-A) `grep -c "Content-Security-Policy" build/index.html` → **1** (HEAD `a5edd2d` 시점 build artifact 실측 — REQ-098 §배경 HEAD `7477189` 실측 1 hit 과 동일 baseline 유지).
  - (G-A 보조) `grep -c "Content-Security-Policy" index.html` → **1** (원본 박제 single hit).
  - (G-B baseline) `vite.config.test.js:23-43` `removes the CSP meta tag line from HTML that contains it` 1 it — `result` 에 `Content-Security-Policy` 0 hit + `<meta charset="utf-8" />` 보존 + `<title>x</title>` 보존 expect 3개 박제.
  - (G-C baseline) `vite.config.test.js:13-21` 2 it (`applies only to serve (dev) mode` + `transformIndexHtml.order is "post"`) — `plugin.apply === 'serve'` + `plugin.transformIndexHtml.order === 'post'` expect 2개 박제.
  - (G-D baseline) `vite.config.test.js:45-58` 1 it (`is a no-op when HTML has no CSP meta tag (idempotent)`) + `vite.config.test.js:60-74` 1 it (`removes only the first match when multiple CSP meta tags are present (single regex match)`) — 2 it 박제. 2회 연속 동작 멱등 (case (b)) 신규 fixture 박제 미완 (task 영역).
  - (G-E baseline) `vite.config.test.js` 의 6 it 발화 채널 = `vitest` discovery (자매 REQ test-discovery-population-coherence). build artifact grep (G-A) 의 pre-push / CI 발화 채널 = 부재 (`grep -n "Content-Security-Policy" .husky/pre-commit .husky/pre-push scripts/*.sh` → 0 hit / `grep -n "build/index" .husky/pre-commit .husky/pre-push scripts/*.sh` → 0 hit / `grep -n "csp" .husky/pre-commit .husky/pre-push package.json` → 0 hit).
  - 합계 baseline: G-A 1 hit (보존 baseline, **회귀 0**) / G-B/G-C/G-D 5 it 박제 / G-E 발화 채널 1/2 (vitest discovery 채널 ✓, build artifact pre-push/CI 채널 ✗ — 수단 위임).
- **rationale**: G-A/G-B/G-C/G-D baseline 은 본 spec 박제 시점 실측 박제 — 향후 회귀 분석 시 위반 검출 기준 (FR-01 회귀 시 0 hit / FR-02 회귀 시 N hit / FR-03 회귀 시 plugin.apply ≠ 'serve' or order ≠ 'post' / FR-04 회귀 시 multi-match). 발화 채널 baseline 1/2 (G-E) 는 §배경 측정값 기록 — task 위임으로 build artifact 발화 채널 신설 (pre-push / CI / `check:csp-artifact` script) 시 본 spec 의 §수용 기준은 hit/채널 수 비의존 (RULE-07 정합 — "발화 채널 존재" 계약 자체만 박제).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-098 흡수) / `a5edd2d` | 최초 박제 — `index.html` CSP meta 출력 비대칭 결과 효능 계약 4 조건 게이트 (G-A prod build artifact 보존 + G-B dev serve strip + G-C plugin apply/order 제약 + G-D 멱등 single-match). baseline G-A 1 hit (회귀 0) / G-B/C/D unit fixture 5 it 박제 / G-E 발화 채널 1/2 (vitest ✓ / build artifact pre-push/CI ✗ — 수단 위임). 자매 axis: `foundation/root-config-spec-reference-coherence.md` (REQ-097) — 두 spec 직교 axis (REQ-097 참조 path 정합 vs 본 spec CSP 동작 계약). | all |
