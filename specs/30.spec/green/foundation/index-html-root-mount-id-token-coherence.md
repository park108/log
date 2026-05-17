# `index.html` `<div id="root">` ↔ `src/index.jsx` `getElementById("root")` ↔ `src/common/common.ts` `getElementById("root")` 마운트 노드 ID 토큰 3극 정합 시스템 불변식

> **위치**: 횡단 부트 진입점 토큰 정합 — `index.html:16` `<div class="div" id="root">` (HTML DOM 마운트 노드 선언) + `src/index.jsx:8` `ReactDOM.createRoot(document.getElementById("root"))` (React 트리 마운트 진입) + `src/common/common.ts:320` `let root = document.getElementById("root")` (`setFullscreen` 함수의 fullscreen class 토글 대상 노드 조회). 3 곳의 ID 토큰 `"root"` byte-for-byte 동치.
> **관련 요구사항**: REQ-20260518-002
> **최종 업데이트**: 2026-05-18 (by inspector — 최초 박제; Phase 2 REQ-20260518-002 흡수)

> 본 spec 은 자매 `components/app.md` (blue, REQ-094) 의 `src/index.jsx` 부트 비콘 4 불변식 axis 와 직교한다 (REQ-094 = `sendToAnalytics`/`sendCounter` URL/body 비콘 / 본 spec = mount selector 토큰 동치). 자매 `foundation/index-html-public-asset-reference-coherence.md` (green, REQ-099) 의 정적 자원 참조 4-axis 와도 직교한다 (REQ-099 = `<link>`/`<meta>` href 정합 / 본 spec = `<div id="root">` DOM 노드 ID).

## 역할
React 트리의 마운트 진입점을 가리키는 ID 토큰 `"root"` 는 **3 곳에서 동시에 사용되며 byte-for-byte 동치** 가 결과 효능 계약이다 — (H) `index.html` 의 `id` 속성 값, (R) `src/index.jsx` 의 `ReactDOM.createRoot` 인자 selector, (C) `src/common/common.ts:setFullscreen` 의 toggle 대상 selector. 3 곳 중 하나라도 토큰이 분기하면 (H≠R) 부트 단계 `createRoot(null)` throw (React 19 argument validation), (H≠C) `setFullscreen` 토글 silent no-op (null guard 진입). 의도적으로 하지 않는 것: 발화 채널 (pre-commit / pre-push / CI / 신규 `check:mount-id-token-coherence` script) 선정, 토큰 일관 갱신 수단 (단일 상수 추출 vs literal 동치 유지) 선택, selector 표현 다양화 (`getElementById` ↔ `querySelector("#root")` ↔ `querySelector("div#root")`), mount 노드의 `class` 속성 토큰 동치 (별 axis — `setFullscreen` DOM mutation contract), React 19 `createRoot(null)` 동작 자체의 의존성 axis (`dependency-bump-gate.md` 영역), 테스트 fixture mock `<div id="root">` (production 진입 토큰 한정 — `*.test.*` 제외).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `index.html` 단일 파일 grep + `src/index.jsx` 단일 파일 grep + `src/common/common.ts` 단일 파일 grep + 3 토큰 추출 + byte-for-byte 동치 비교 fixture.

## 동작
1. (G-A) `index.html` 마운트 노드 등록 hit — FR-01
   - 명령: `grep -cE 'id="root"' index.html` → **출력 = 1 + rc=0**.
   - 의미: HTML DOM 마운트 노드가 1 hit 으로 등록되어 있다. hit ≥ 2 는 W3C HTML Living Standard §3.2.6.1 `id` unique identifier 위반 동시 발생 (DOM 표준 위반).
2. (G-B) `src/index.jsx` React 트리 마운트 selector hit — FR-02
   - 명령: `grep -cE 'getElementById\("root"\)' src/index.jsx` → **출력 = 1 + rc=0**.
   - 의미: React 트리 마운트 진입점 selector 가 1 hit 박제. hit 0 시 `createRoot(undefined)` throw (React 19 argument validation) → 부트 자체 실패 → ErrorBoundary 도달 불가.
3. (G-C) `src/common/common.ts` fullscreen toggle selector hit — FR-03
   - 명령: `grep -cE 'getElementById\("root"\)' src/common/common.ts` → **출력 = 1 + rc=0**.
   - 의미: `setFullscreen` 함수의 toggle 대상 selector 가 1 hit 박제. hit 0 시 fullscreen 토글 무력화 (null guard 진입 silent no-op, 정적 검출 불가).
4. (G-D) **3 극 토큰 동치 게이트** — FR-04
   - 절차: G-A (`index.html` `id` attribute value) ∧ G-B (`src/index.jsx` selector 인자) ∧ G-C (`src/common/common.ts` selector 인자) 의 토큰 추출 + quote 제거 → 3 토큰이 **byte-for-byte 동치** (`"root"` ≡ `"root"` ≡ `"root"`). baseline 측정: 3 극 모두 4 byte ASCII literal `"root"` → **3 극 토큰 동치 PASS**.
   - 의미: H ≠ R 분기 → 부트 자체 실패. H ≠ C 분기 → fullscreen toggle silent no-op 회귀. R ≠ C 분기는 production code 내 일관성 위반 신호.
5. (G-E) src/ production hit 분포 보존 — FR-05
   - 절차: `grep -rEc 'getElementById\("root"\)' src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"` 의 production scope (`*.test.*` 파일 제외) 총합 = **2** (`src/index.jsx:1` + `src/common/common.ts:1`).
   - 의미: 4 번째 production 호출 도입 시 본 spec 갱신 신호 (3 극 분포 한정 박제). 테스트 fixture mock (`src/Log/Writer.test.jsx` 의 `<div id="root">` 다수 + `src/index.test.jsx:74` 의 selector 스텁) 은 game scope 외.
6. (G-F) build artifact mount 노드 보존 — FR-06
   - 절차: `npm run build` 후 `grep -cE 'id="root"' build/index.html` → **출력 = 1**.
   - 의미: Vite build 가 mount 노드 ID 토큰을 변형하지 않는다. `build/**/*.js` 의 selector 토큰은 minify/mangle 영향으로 grep 게이트 부적합 → 본 spec 은 production HTML artifact 단일 측정 한정.
7. (G-G) 회귀 검출 채널 존재 — FR-07
   - G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E ∧ G-F 6 조건은 grep + selector 토큰 추출 + byte-for-byte 비교 fixture (또는 동등) 채널을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:mount-id-token-coherence` script) 선정은 수단 영역이나 "발화 채널이 존재해야 한다" 는 계약 자체는 박제.
8. (G-H) 시점 비의존 — NFR-07
   - 6 조건은 React 메이저 bump · `src/index.jsx` 리팩토링 · `src/common/common.ts` 리팩토링 · `index.html` 마크업 정렬 변경 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 6 조건 동시 만족 회복 또는 본 spec 갱신.
9. (G-I) 자체 진단 제외 — 결정론 보장
   - 본 req / 본 spec / 테스트 문서 본문의 `id="root"`, `getElementById("root")`, `<div id="root">` 등 문자열 occurrence 는 G-A의 `index.html` grep count 1 + G-B의 `src/index.jsx` count 1 + G-C의 `src/common/common.ts` count 1 과 독립 — 게이트 scope 는 `index.html` 단일 파일 + `src/index.jsx` 단일 파일 + `src/common/common.ts` 단일 파일 + `build/index.html` 로 한정. 동일 HEAD 상에서 본 게이트 N 회 실행 시 N 회 동일 rc + 동일 출력.

## 의존성
- 내부: `index.html` (DOM mount node 선언 — `index.html:16`), `src/index.jsx` (React 트리 마운트 진입점 — `src/index.jsx:8`), `src/common/common.ts` (fullscreen toggle 대상 노드 조회 — `src/common/common.ts:320`), `build/index.html` (prod artifact mount 노드 보존 — `vite build` 산출).
- 외부: `react-dom/client` (`ReactDOM.createRoot(null)` throw 동작 — React 19 argument validation), `vite` (`index.html` 보존 + `outDir` 산출), POSIX `grep` (G-A / G-B / G-C / G-E / G-F 측정 명령), W3C HTML Living Standard §3.2.6.1 `id` content attribute (case-sensitive unique identifier), W3C DOM Standard §4.2.6 `Document.getElementById(elementId)` (case-sensitive ID 매칭).
- 역의존 (사용처): pre-push / CI 단계의 토큰 정합 검증 hook 또는 `package.json` 신규 `check:mount-id-token-coherence` script (수단 위임). `index.html:16` `<div id="root">` 변경 (`id` 속성 토큰 갱신 또는 노드 자체 삭제) 또는 `src/index.jsx:8` / `src/common/common.ts:320` 의 selector 토큰 갱신 또는 selector 표현 변경 (`getElementById` → `querySelector`) 모두 본 spec 위반 회귀 후보.
- 자매 spec: `components/app.md` (blue, REQ-094) — `src/index.jsx` 부트 비콘 4 불변식 (`sendToAnalytics` / `sendCounter` URL/body/가드/카운트). 동일 파일 (`src/index.jsx`) 별 axis (mount selector 토큰 동치). REQ-094 NFR-03 ("부트 부수효과 봉인 — `document.getElementById('root')` 스텁") 은 테스트 격리 수단 평서로 mount 토큰 자체 동치는 미박제. `foundation/index-html-public-asset-reference-coherence.md` (green, REQ-099) — `index.html` 정적 자원 참조 4-axis. `<div id="root">` 는 정적 자원 참조 (URL) 가 아닌 DOM 노드 선언 → 별 axis 직교. `foundation/csp-meta-dev-strip-prod-preserve.md` (green, REQ-098) — `index.html:8` CSP meta dev/prod 비대칭 axis. `<meta>` element 영역으로 본 spec 과 직교.

## 테스트 현황
- [ ] (G-A) `grep -cE 'id="root"' index.html` → **1 + rc=0** (baseline 1 hit 박제, HEAD `a932c8a` 실측 — `index.html:16` `<div class="div" id="root">`).
- [ ] (G-B) `grep -cE 'getElementById\("root"\)' src/index.jsx` → **1 + rc=0** (baseline 1 hit 박제, HEAD `a932c8a` 실측 — `src/index.jsx:8`).
- [ ] (G-C) `grep -cE 'getElementById\("root"\)' src/common/common.ts` → **1 + rc=0** (baseline 1 hit 박제, HEAD `a932c8a` 실측 — `src/common/common.ts:320`).
- [ ] (G-D) 3 토큰 추출 + quote 제거 + byte-for-byte 비교 → 3 토큰 모두 `"root"` (4 byte ASCII literal) 동치 PASS.
- [ ] (G-E) `grep -rEc 'getElementById\("root"\)' src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"` 의 production scope 총합 → **2** (`src/index.jsx:1` + `src/common/common.ts:1`, test 파일 제외).
- [ ] (G-F) `npm run build` 후 `grep -cE 'id="root"' build/index.html` → **1** (baseline build artifact 보존 박제).
- [ ] (G-G) 발화 채널 존재 — grep + selector 토큰 추출 + byte-for-byte 비교 fixture (또는 동등) 채널 rc=0/1 결정론. 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:mount-id-token-coherence` script) 부착 미박제 (수단 위임).
- [ ] (G-H) 시점 비의존 — React 메이저 bump · `src/index.jsx` 리팩토링 · `src/common/common.ts` 리팩토링 · `index.html` 마크업 정렬 변경 후 1 PR 안에 G-A·G-B·G-C·G-D·G-E·G-F 동시 만족 회복 사례 누적.
- [ ] (G-I) 자체 진단 제외 — 본 spec / req / test 파일의 `id="root"` / `getElementById("root")` occurrence 가 G-A·G-B·G-C grep count 영향 0 (단일 파일 scope 한정).

## 수용 기준
- [ ] (Must FR-01) `grep -cE 'id="root"' index.html` → **출력 = 1 + rc=0**. hit ≥ 2 는 W3C HTML Living Standard §3.2.6.1 unique identifier 위반 (DOM 표준 위반 동시 발생).
- [ ] (Must FR-02) `grep -cE 'getElementById\("root"\)' src/index.jsx` → **출력 = 1 + rc=0**. hit 0 시 `createRoot(undefined)` throw (React 19 argument validation) → 부트 자체 실패.
- [ ] (Must FR-03) `grep -cE 'getElementById\("root"\)' src/common/common.ts` → **출력 = 1 + rc=0**. hit 0 시 `setFullscreen` toggle silent no-op 회귀 (null guard 진입, 정적 검출 불가).
- [ ] (Must FR-04) **3 극 토큰 동치 게이트** — FR-01 (`index.html` `id` attribute value) ∧ FR-02 (`src/index.jsx` selector 인자) ∧ FR-03 (`src/common/common.ts` selector 인자) 의 토큰이 **byte-for-byte 동치** (`"root"` ≡ `"root"` ≡ `"root"`). 추출 + quote 제거 + 토큰 비교 PASS.
- [ ] (Should FR-05) 전체 src 영역 (`src/**` production 코드, `*.test.*` 제외) 에서 `getElementById("root")` 호출 분포 = **2** (`src/index.jsx:1` + `src/common/common.ts:1`). 4 번째 production 호출 도입 시 본 spec 갱신 신호.
- [ ] (Should FR-06) `npm run build` 후 `grep -cE 'id="root"' build/index.html` → **1** (Vite build 가 mount 노드 ID 토큰을 변형하지 않음).
- [ ] (Should FR-07) FR-01·FR-02·FR-03·FR-04·FR-05·FR-06 6 조건의 회귀는 자동 검출 채널 (grep + selector 토큰 추출 + byte-for-byte 비교 fixture 또는 동등) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 선정은 수단 영역, "발화 채널 존재" 계약 박제.
- [ ] (Must NFR-01 결정론) 동일 HEAD 상에서 FR-01·FR-02·FR-03·FR-04·FR-05 의 grep + 토큰 추출 + 동치 비교 결과가 N 회 반복 시 N 회 동일 rc + 동일 출력. build artifact 측정 (FR-06) 은 `npm run build` 1 회 후 N 회 read-only 측정.
- [ ] (Must NFR-02 멱등성) 본 게이트는 read-only — `index.html` / `src/index.jsx` / `src/common/common.ts` / `build/**` 파일을 수정하지 않는다. `build/**` 재생성은 게이트 실행의 부수효과로 허용되나 본 spec 자체는 build 명령 강제하지 않음 (수단 영역).
- [ ] (Should NFR-03 성능) (a) FR-01 grep < 50 ms. (b) FR-02 + FR-03 grep < 100 ms. (c) FR-04 토큰 추출 + 동치 비교 < 100 ms. (d) FR-05 src/** 전체 grep < 500 ms. (e) 전체 게이트 < 30 s (build 시간 포함 시) / < 1 s (build artifact 존재 가정 시).
- [ ] (Must NFR-04 자체 진단 제외) 본 req / 본 spec / 테스트 문서 본문 내 `id="root"`, `getElementById("root")`, `<div id="root">` 문자열 occurrence 는 FR-01 / FR-02 / FR-03 grep count 와 독립 — 게이트 scope 는 `index.html` 단일 파일 + `src/index.jsx` 단일 파일 + `src/common/common.ts` 단일 파일 + `build/index.html` 로 한정. 테스트 fixture (`src/index.test.jsx:74` selector 스텁 + `src/Log/Writer.test.jsx` mock `<div id="root">`) 는 게이트 scope 외 (`*.test.*` 제외 패턴).
- [ ] (Must NFR-05 외부 비파괴) 본 효능 도입은 `index.html` / `src/index.jsx` / `src/common/common.ts` 의 production 외 변경 동반 없음 — 단, FR-07 의 발화 채널 부착 수단 (예: `package.json` 의 `check:*` script 추가 또는 husky hook 부착) 은 본 spec 의 In-Scope 가 아닌 수단 영역.
- [ ] (Must NFR-06 채널 의미 분리) 채널 H (HTML attribute scope, DOM 노드 선언) ↔ 채널 R (React entry scope, fiber tree 마운트 진입) ↔ 채널 C (fullscreen toggle scope, DOM mutation 대상 조회) 의 의미 분리는 본 spec 의 행동 평서문에 포함되되 어느 채널의 우선순위 라벨 ("기본" / "권장" / "진실 공급원") 박제 금지 — 수단 중립. 3 채널은 실행 단계 (HTML 파싱 / React 부트 / fullscreen 토글 호출) 가 독립이나 본 spec 은 **ID 토큰 동치** axis 만 박제.
- [ ] (Must NFR-07 시점 비의존) FR-01·FR-02·FR-03·FR-04·FR-05 는 React 메이저 bump · `src/index.jsx` 리팩토링 · `src/common/common.ts` 리팩토링 · `index.html` 마크업 정렬 변경 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 5 조건 동시 만족 회복 또는 본 spec 갱신.
- [ ] (Must, 회귀 가설 검출) `index.html:16` `id="root"` → `id="app"` 변경 + `src/**` 미변경 가설 회귀 시 G-D 토큰 비교 → 3 극 분기 검출 (FR-04 위반, rc=1).
- [ ] (Must, 회귀 가설 검출) `src/index.jsx:8` `getElementById("root")` → `getElementById("app")` 변경 가설 회귀 시 G-D 토큰 비교 → 채널 R 분기 검출 (R ≠ H = C, FR-04 위반).
- [ ] (Must, 회귀 가설 검출) `src/common/common.ts:320` `getElementById("root")` → `getElementById("app")` 변경 가설 회귀 시 G-D 토큰 비교 → 채널 C 분기 검출 (C ≠ H = R, FR-04 위반).
- [ ] (Must, 회귀 가설 검출) `index.html:16` `<div id="root">` 노드 자체 삭제 가설 회귀 시 G-A grep count = 0 (감소 검출, FR-01 위반).
- [ ] (Must, 회귀 가설 검출) `src/index.jsx:8` selector 표현을 `querySelector("#root")` 로 변경 가설 회귀 시 G-B grep count = 0 (literal 토큰 형태 게이트 위반, FR-02 위반) — selector 표현 도입 시 본 spec 갱신 신호.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 부트 진입점 횡단 게이트 박제 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`a932c8a`, 2026-05-18 — 본 spec 박제 시점 실측):
  - (G-A) `grep -cE 'id="root"' index.html` → **1** (HEAD `a932c8a` 시점 실측):
    - `index.html:16` `<div class="div" id="root"></div>`
  - (G-B) `grep -cE 'getElementById\("root"\)' src/index.jsx` → **1** (HEAD `a932c8a` 시점 실측):
    - `src/index.jsx:8` `const root = ReactDOM.createRoot(document.getElementById("root"));`
  - (G-C) `grep -cE 'getElementById\("root"\)' src/common/common.ts` → **1** (HEAD `a932c8a` 시점 실측):
    - `src/common/common.ts:320` `let root = document.getElementById("root");`
  - (G-D) 3 토큰 baseline: H = `"root"` (4 byte ASCII) / R = `"root"` (4 byte ASCII) / C = `"root"` (4 byte ASCII). **3 극 byte-for-byte 동치 PASS**.
  - (G-E) `grep -rEc 'getElementById\("root"\)' src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"` 의 production scope 총합 = **2** (`src/index.jsx:1` + `src/common/common.ts:1`, test 파일 제외 가정). 테스트 hit 분포: `src/Log/Writer.test.jsx` 10 hits + `src/index.test.jsx:74` 1 hit (게이트 scope 외).
  - (G-F baseline) `build/index.html` 의 `id="root"` hit 보존 = **1** (build artifact 측정 시점 의존 — `npm run build` 1회 후 측정).
  - (G-G baseline) 발화 채널 = `grep -rn 'mount-id\|getElementById.*root' .husky/pre-commit .husky/pre-push scripts/*.sh package.json 2>/dev/null | grep -v "Binary"` → **0 hit** (현 pre-push / CI / package.json `check:*` script 부재 — 수단 위임).
  - 합계 baseline: G-A 1 hit / G-B 1 hit / G-C 1 hit / G-D 3 극 토큰 동치 PASS / G-E production 분포 2 / G-F build artifact 1 보존 / G-G 발화 채널 0 hit (수단 위임).
- **rationale**: G-A~G-F baseline 은 본 spec 박제 시점 실측 박제 — 향후 회귀 분석 시 위반 검출 기준 (FR-01 회귀 시 1 ≠ N / FR-02 회귀 시 1 ≠ N / FR-03 회귀 시 1 ≠ N / FR-04 회귀 시 3 극 토큰 분기 / FR-05 회귀 시 4 번째 production 호출 도입 / FR-06 회귀 시 build artifact 0 hit). 발화 채널 baseline 0 hit (G-G) 는 §배경 측정값 기록 — task 위임으로 발화 채널 신설 (pre-push / CI / `check:mount-id-token-coherence` script) 시 본 spec 의 §수용 기준은 hit/채널 수 비의존 (RULE-07 정합 — "발화 채널 존재" 계약 자체만 박제).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-18 | inspector 69차 / (this commit) | 최초 박제 — REQ-20260518-002 흡수 (mount 노드 ID 토큰 3 극 정합 시스템 불변식, baseline HEAD `a932c8a` 3 극 동치 PASS) | all |
