# 명세: Search 도메인 AbortController 런타임 수동 스모크 체크리스트

> **위치**:
> - `docs/testing/search-abort-runtime-smoke.md` (신규, WIP — 위치는 planner 가 조정 가능)
> - 참조 컴포넌트:
>   - `src/Search/Search.jsx` 의 `useEffect` 내부 `AbortController` 블록 (보조: `:48-117`)
>   - `src/Search/Search.jsx` 의 `AbortError` silent 분기 (보조: `:105`)
>   - `src/Search/api.js` 의 `getSearchList(string, init)` signature
>   - `src/Search/Search.test.jsx` 의 unmount 회귀 케이스 (보조: `:158-185`)
> **유형**: Test / Operational Checklist (수동 스모크, 재사용)
> **최종 업데이트**: 2026-04-20 (by inspector, drift reconcile — `search-abort-runtime-smoke.md` 문서 신설 완료 ACK)
> **상태**: Active (문서 신설 완료 / 운영자 baseline 잔여)
> **관련 요구사항**:
> - REQ-20260419-013 (`specs/requirements/done/2026/04/19/20260419-search-abort-runtime-smoke-checklist-doc.md`) — 본 체크리스트 신설
> - REQ-20260419-020 (`specs/requirements/done/2026/04/19/20260419-search-loadingdots-cleartimeout-bug-and-stale-closure.md`) — `src/Search/Search.jsx:118-125` loadingDots 타이머 cleanup + stale closure 정합 + Search 도메인 timer cleanup 패턴 SSoT
> - REQ-20260418-021 (`specs/requirements/done/2026/04/18/20260418-fetch-abortcontroller-race-condition-prevention.md`) — 검증 대상 코드 (Search abort 파일럿)
> - REQ-20260419-002 (`docs/testing/keyboard-a11y-runtime-smoke.md`, done) — 5종 → 6종 확장의 직전 모범, 자동망 사각지대 보완 패턴
> - REQ-20260418-022 (`specs/spec/blue/testing/tanstack-query-devtools-smoke-spec.md`, done) — DevTools Network 활용 사례 모범

> 본 문서는 **Search 도메인 AbortController 파일럿(REQ-021 §3.5) 의 DevTools Network `canceled` 표시 / Console "unmounted" 경고 0건** 을 브라우저 세션 1회 ≤5분 점검으로 검증하는 수동 스모크 체크리스트 SSoT.
> jsdom + vitest 자동망이 노출하지 못하는 DevTools Network request lifecycle 상태(`pending` → `canceled` / `complete` / `failed`) 를 사람의 1차 신호로 보완한다.
> 자동화(Playwright/Cypress) 도입은 REQ-20260418-031 영역, 본 명세는 수동 baseline + 후속 fetch race 정리 (Log/Comment/Image) 의 일반화 시드.

---

## 1. 역할 (Role & Responsibility)
자동 테스트(`Search.test.jsx:158-185` — "unmount 직후 React 경고 0건" 어서션) 가 박제하지 못하는 **DevTools Network 의 `canceled` (빨간색 row) 사용자 가시 신호 + Console 클린** 을 사람의 1회 점검(≤5분) 으로 검증.

- 주 책임:
  - 3 시나리오 매트릭스(SA-01 / SA-02 / SA-03) — 라우트 전환 / query 변경 / 즉시 unmount
  - 각 시나리오 (재현 절차 / 기대 / DevTools 확인 / 체크박스 / PASS·FAIL·N/A·노트 칸) 4 블록
  - 환경 매트릭스 (브라우저 × OS × DEV/PROD)
  - 적용 대상 변경 트리거 명시 (`Search.jsx`, `Search/api.js`, MSW bump, vite 변경 등)
  - 후속 fetch race 정리 (Log/Comment/Image) 시 시나리오 재사용 가이드 (치환 매트릭스)
- 의도적으로 하지 않는 것:
  - 자동 E2E (Playwright/Cypress) — REQ-20260418-031 영역
  - Log/Comment/Image 도메인의 fetch race 자체 정리 — REQ-021 §3.5 후속 별 요구사항
  - 체크리스트 1회 실행 자체(PASS 보고) — 본 spec 은 **문서 신설** 까지만; 실행은 별 task 또는 운영자 자율
  - Web Vitals 영향 측정 — REQ-20260418-035 영역
  - ARIA 라이브 리전 / 라우팅 시 포커스 관리 — accessibility-spec 후속
  - `Search.jsx:105` silent abort (`if (err.name === 'AbortError') return;`) 의 Console 박제 동작을 시나리오화할지 — 본 PR 에 SA-04 로 추가 vs 후속 보강 (§13 미결)

> 관련 요구사항: REQ-20260419-013 §3 (Goals)

## 2. 현재 상태 (As-Is) — 2026-04-20 기준 (drift reconcile)
- [x] `docs/testing/search-abort-runtime-smoke.md` **존재** — 신설 완료 (commit `089a818`, task `20260419-search-abort-runtime-smoke-checklist-doc`; 2026-04-20 inspector drift reconcile)
- [x] 유사 패턴 6종 정착: `markdown-render-smoke.md`, `web-vitals-runtime-smoke.md`, `tanstack-query-devtools-smoke.md`, `toaster-visual-smoke.md`, `styles-cascade-visual-smoke.md`, `keyboard-a11y-runtime-smoke.md` (REQ-002, done — 자동망 사각지대 보완 모범)
- [x] Search abort 파일럿 도입 완료 — REQ-20260418-021 §3.5 (`src/Search/Search.jsx` 의 `AbortController` + cleanup, `src/Search/Search.test.jsx:158-185` 의 unmount 회귀 케이스)
- [x] 직전 task: `specs/task/done/2026/04/18/20260419-search-domain-abortcontroller-safety-net/` — DoD 의 자동 검증 모두 PASS, **DevTools 수동 확인 1건만 미수행** (followup `20260418-1200-manual-devtools-canceled-verification.md` 관찰)
- **자동화 GAP**:
  - jsdom + vitest 는 DevTools Network 의 request lifecycle 상태(`pending` → `canceled` / `complete` / `failed`) 를 노출하지 않음 — 자동 어서트 불가.
  - `Search.test.jsx:158-185` 가 React "unmounted" 경고 0건은 박제하지만, 사용자 가시 동작 (DevTools 빨간색 row, Network filter `canceled`) 의 회귀는 자동망에 무지.
  - vite/oxc/MSW 의 fetch interceptor 동작이 실제 브라우저 fetch + AbortController 와 일치하지 않을 가능성 (예: `signal.aborted` 상태가 다르게 propagate).

> 관련 요구사항: REQ-20260419-013 §2 배경

## 3. 체크리스트 구성 (To-Be, WIP)
> 관련 요구사항: REQ-20260419-013 FR-01 ~ FR-10

### 3.1 문서 위치 (FR-01)
- 기본: `docs/testing/search-abort-runtime-smoke.md` (기존 6종 smoke 문서와 동일 디렉토리)
- 대안: `docs/testing/visual-smoke/search-abort.md` — planner 결정 (REQ-013 §13 미결 1은 아니나 일관성 trade-off)

### 3.2 시나리오 매트릭스 (FR-02, FR-03)

각 시나리오는 (시나리오 ID / 재현 절차 / 기대 결과 / DevTools 확인 / 체크박스) 4 블록으로 구성.

#### 3.2.1 시나리오 개요
| ID | 시나리오 | 재현 요약 | 기대 결과 | 조건 |
|----|---------|----------|----------|------|
| SA-01 | 라우트 전환 시 cancel | `/log/search` 진입 → query string 입력 (예: "테스트") → fetch 발화 직후(응답 도착 전) `/log` 또는 `/log/:timestamp` 로 라우트 전환 | DevTools Network 의 `/prod?q=테스트` row 가 `canceled` (빨간색) + Console 클린 | 필수 |
| SA-02 | 같은 라우트 query 변경 cancel | `/log/search` 진입 → query string A 입력 → fetch 발화 → 응답 도착 전 query string B 로 변경 | A row 가 `canceled`, B row 만 `complete` | 필수 |
| SA-03 | 즉시 unmount cancel + Console 클린 | `/log/search` 진입 → query string 입력 → fetch 발화 → 응답 도착 전 즉시 라우트 전환 | DevTools Console 에 React "Cannot update unmounted component" 경고 0건 | 필수 |
| SA-04 | `AbortError` silent 분기 Console 클린 | SA-01 반복 후 Console 에 `AbortError` stack / error 박제 0건 | Console 에 `AbortError` 텍스트 0 매치 (`Search.jsx:105` silent return 검증) | Could (planner/discovery 결정 — REQ-013 §13 미결 5) |

#### 3.2.2 시나리오 4 블록 형식 (FR-03)
각 SA-XX row 는 다음 순서 블록을 포함:

1. **재현 절차** — 번호 매김 단계별. 환경 조건(라우트, query, 자격증명 유무) 명시.
2. **기대 결과** — 서술형 1~3줄.
3. **DevTools 확인** — (Network 탭 filter / Console 탭 검색 / Sources 탭 식별자 검색 등) 정확한 확인 포인트. Chrome DevTools 기본 경로 명시.
4. **체크박스 + 결과 기록** — `[ ] PASS / [ ] FAIL / [ ] N/A / 노트: ___` 형식 (FR-05).

### 3.3 환경 매트릭스 (FR-04)

각 세션에 다음 필드를 표로 기록:

| 필드 | 예시 | 메모 |
|------|------|------|
| 브라우저 + 버전 | Chrome 134, Edge 134, Firefox 126, Safari 18 | ≥1 필수 (권장 Chrome) |
| OS | macOS 14, Windows 11, iOS 17 | ≥1 필수 |
| 빌드 환경 | DEV (`npm run dev`) / PROD (`npm run build && npm run preview`) | 시나리오별 개별 표기 |
| MSW 상태 | 활성(개발 모드) / 비활성 (PROD 빌드) | 시나리오 조건 |
| 커밋 해시 | `git rev-parse HEAD` 출력 | 박제 필수 |

- 권장 최소 조합: **Chrome + macOS + PROD 1조합** (≤5분 마감 전제).
- DEV 환경 추가는 Should. Firefox/Safari 추가는 Should.
- Safari DevTools 는 Network filter 명명이 다를 수 있음 (`Cancelled` 대문자 C) — 문서 §환경 alias 매핑 표 박제.

### 3.4 결과 기록 포맷 (FR-05)

각 시나리오 row 에:
- `[x] PASS` / `[x] FAIL (메모)` / `[x] N/A (조건 미충족)` 중 1개 체크.
- FAIL 시 Network 탭 스크린샷 / 응답 헤더 / Console 메시지 첨부 권장 (Should).
- 체크리스트 마감 시 문서 하단 "수행 로그" 섹션에 운영자 / 일자 / 환경 / 커밋 해시 기록.

### 3.5 적용 대상 변경 명시 (FR-06)

재실행 트리거:
- `src/Search/Search.jsx` 의 `useEffect` / `AbortController` / fetch 호출 블록 변경
- `src/Search/api.js` 의 `getSearchList(string, init)` signature 변경
- MSW 메이저 bump (v2 → v3) — fetch interceptor 동작 변경 가능
- vite / oxc 메이저 bump — fetch interceptor / bundling 변경 가능
- React 메이저 bump (18 → 19, REQ-040) — Suspense / unmount 타이밍 변경 가능

재실행 결과는 해당 PR `result.md` 에 링크 첨부.

### 3.6 후속 fetch race 정리 시 일반화 가이드 (FR-07)

본 체크리스트의 시나리오 패턴(라우트 전환 / query 변경 / 즉시 unmount) 을 다른 도메인(Log / Comment / Image) 의 fetch race 정리 시 재사용하기 위한 **치환 매트릭스**:

| 현 도메인 (Search, SA-XX) | 다른 도메인 적용 예 | prefix 제안 |
|--------------------------|---------------------|-------------|
| `/log/search` 라우트 | `/log`, `/comment/:id`, `/image` | LA-XX (Log abort), CA-XX (Comment abort), IA-XX (Image abort) |
| `Search.jsx` 의 `useEffect` | `LogList.jsx`, `LogSingle.jsx`, `Comment.jsx`, `ImageSelector.jsx` | 적용 범위 명시 |
| `getSearchList` 호출 | `getLogs`, `getLog`, `getComments`, `getImages` | fetch 함수명 매핑 |
| `/prod?q=테스트` DevTools row | `/prod/log`, `/prod/comment/:id` 등 | request path 치환 |

- 시나리오 식별자 prefix 는 도메인 별 2문자 (`SA`, `LA`, `CA`, `IA`) — REQ-013 §13 미결 1의 권장 답.
- 신규 도메인 체크리스트 작성 비용 ≤ 30분 (치환 매트릭스 활용, FR-07 목표).

### 3.7 비-목표 명시 (FR-08)

- Search 외 도메인 (Log / Comment / Image) 의 fetch race 자체 정리 — REQ-021 §3.5 후속 별 요구사항.
- 자동화(Playwright/Cypress) — REQ-20260418-031 영역.
- Web Vitals 영향 측정 — REQ-20260418-035 영역.
- ARIA 라이브 리전 / 라우팅 시 포커스 관리 — accessibility-spec 후속.
- 체크리스트 1차 실행 (PASS 보고) — 본 요구사항은 **문서 신설** 까지만.
- `Search.jsx:105` silent abort 의 Console 박제를 시나리오화 (SA-04) 할지는 §13 미결 — 본 spec 은 SA-04 를 **Could 로 박제**, 실행 결정은 planner/discovery.

### 3.8 형식 일관성 (FR-04, FR-09 cross)

기존 6종 smoke 문서와 헤더 ≥80% 일치 권장 (NFR-02):
- `## 범위 (Scope)`
- `## 적용 대상 변경 (Triggers)`
- `## 사전 조건 (Pre-conditions)` — DEV 서버 또는 PROD preview 기동, admin 자격증명 유무
- `## 시나리오 매트릭스 (Scenarios)` — SA-01 ~ SA-03 (+ Could SA-04)
- `## 환경 매트릭스 (Environment)`
- `## 결과 기록 (Results)` — PASS/FAIL/N/A/노트
- `## 후속 확장 가이드 (Future Extension)` — 치환 매트릭스
- `## 수행 로그 (Execution Log)` — 박제용 하단 섹션

### 3.9 NFR 목표값 박제 (FR-10)

- 1회 수행 ≤ 5분 (3 시나리오 × 1.5분 + 환경 setup 0.5분) — NFR-01.
- 기존 6종 구조와 헤더 ≥ 80% 일치 — NFR-02.
- 시나리오 ↔ `Search.jsx` 라인 매핑 100% — NFR-03.
- 일반화성: 치환 매트릭스 1+ 행 — NFR-04.
- 유지보수성: `Search.jsx` 변경 시 체크리스트 갱신 ≤ 5분 / 1 PR — NFR-05.

### 3.10 inspector 인덱스 갱신 (FR-09, Could)

- `docs/testing/` 6종 → 7종 인덱스 박제 위치 선택 (§13 미결 3):
  - 옵션 A: `docs/testing/README.md` 신설 (0 파일 → 1 파일).
  - 옵션 B: `specs/spec/green/testing/manual-smoke-index.md` 신설.
  - 옵션 C: 기존 `accessibility-spec.md` 또는 유사 spec 본문에 박제.
- inspector 후속 라운드에서 결정. 본 REQ 는 직접 의존 0.

### 3.11 [WIP] Search `loadingDots` 타이머 cleanup + stale closure 정합 (REQ-20260419-020)

> 관련 요구사항: REQ-20260419-020 FR-01 ~ FR-08, US-01 ~ US-04

**맥락 (2026-04-19 관측)**: `src/Search/Search.jsx:118-125` 의 "loading dots" 애니메이션 useEffect 에 **2 결함 동시 존재**:
1. `return () => clearTimeout(tick);` — **`tick` 은 함수 객체** (setTimeout 호출 후 id 반환). `clearTimeout` 의 인자는 timeout id 여야 하므로 함수 reference 를 받으면 **silent noop**. 검색 종료(`isLoading=false`) 시 마지막 예약된 setTimeout 이 취소되지 않고 300ms 후 실행 → `setLoadingDots(loadingDots + ".")` → 다음 검색 진입 시 dots 누설.
2. 의존성 `[loadingDots, isLoading]` + 비-functional `setLoadingDots(loadingDots + ".")` — stale closure 로 잘못된 snapshot 참조. 운영자 연속 검색 trigger 시 ".." 박제 잠재.

본 §은 REQ-021 (AbortController) §3.5 후속으로 Search 도메인의 **timer cleanup 패턴 SSoT** 를 박제. `AbortController` 의 `ac.abort()` cleanup 정합(REQ-021)과 `clearTimeout(timeoutId)` / `clearInterval(intervalId)` cleanup 정합이 같은 Search 파일 안에 공존하는 표준이 된다.

**결함 패턴 (As-Is)**:
```jsx
useEffect(() => {
    const tick = () => {
        return setTimeout(() => setLoadingDots(loadingDots + "."), 300);
    }
    isLoading ? tick() : setLoadingDots("");
    return () => clearTimeout(tick);  // ← BUG 1: tick is a function, not a timeout id
}, [loadingDots, isLoading]);  // ← BUG 2: stale closure + rebind churn
```

**정합 패턴 (To-Be, 권장 안 — `setInterval` + functional updater + 단일 의존)**:
```jsx
useEffect(() => {
    if (!isLoading) {
        setLoadingDots("");
        return;
    }
    const id = setInterval(
        () => setLoadingDots(prev => prev.length >= 3 ? "" : prev + "."),
        300
    );
    return () => clearInterval(id);
}, [isLoading]);
```

**대안 (허용 — `setTimeout` 재예약 보존 형태)**:
```jsx
useEffect(() => {
    if (!isLoading) {
        setLoadingDots("");
        return;
    }
    const id = setTimeout(
        () => setLoadingDots(prev => prev.length >= 3 ? "" : prev + "."),
        300
    );
    return () => clearTimeout(id);
}, [isLoading, loadingDots]);
```

**핵심 변경 3건 (FR-01 ~ FR-03)**:
1. **FR-01**: `clearTimeout(tick)` (함수 인자) → `clearTimeout(id)` 또는 `clearInterval(id)` (timeout id 변수 보관).
2. **FR-02**: `setLoadingDots(loadingDots + ".")` → `setLoadingDots(prev => ...)` functional updater (stale closure 0).
3. **FR-03**: 의존성 배열 `[loadingDots, isLoading]` → `[isLoading]` (functional updater 도입 시 `loadingDots` 의존 불필요).

**안티패턴 인식 체크 (timer cleanup 정합 SSoT)**:
- [ ] `clearTimeout` / `clearInterval` 인자는 **항상 `setTimeout` / `setInterval` 이 반환한 정수 id**. 함수 reference 전달 시 silent noop — `grep -n "clearTimeout\|clearInterval" src/` 점검.
- [ ] `setState(currentValue + X)` 패턴은 **stale closure 위험**. `setState(prev => prev + X)` functional updater 로 자동 회피.
- [ ] timer 를 재예약하기 위해 state 를 의존성에 넣는 패턴은 **rebind churn** — `setInterval` + functional updater 로 의존성 1개로 축소 가능.
- [ ] `useEffect` cleanup 은 **unmount + 의존성 변경 직전** 실행 — React 18 strict mode 에서 double-invocation 시 cleanup 정합이 유지돼야 최종 상태 정상.

**회귀 테스트 (FR-05, FR-06)**:
- `src/Search/Search.test.jsx` 신규 ≥ 1 케이스 (Must):
  - `'loading dots increment every 300ms while isLoading'` — `vi.useFakeTimers()` + `vi.advanceTimersByTime(300)` 반복 후 dots 증가 어서트.
- (Should) `'loading dots reset to empty when isLoading=false'` — isLoading false 전이 시 즉시 `""`.
- (Should) unmount 후 `setLoadingDots` 호출 0 — React "state update on unmounted component" 경고 0.
- per-test `vi.useFakeTimers` / `vi.useRealTimers` 호출 cleanup 로 다른 useEffect timer 와 충돌 차단.

**grep 수용 기준 (FR-01 ~ FR-03)**:
- `grep -n "clearTimeout(tick)" src/Search/Search.jsx` → 0.
- `grep -n "setLoadingDots(loadingDots" src/Search/Search.jsx` → 0.
- `grep -n "setLoadingDots(prev" src/Search/Search.jsx` → ≥ 1 (또는 `setLoadingDots("")` 외).
- `grep -n "\[loadingDots, isLoading\]" src/Search/Search.jsx` → 0.
- `grep -n "useEffect.*\[isLoading\]" src/Search/Search.jsx` → 1 (loading dots).

**SA-04 (Could) 와의 관계**:
- §3.2.1 의 Could 시나리오 SA-04 (`Search.jsx:105` silent `AbortError` 분기 Console 클린) 와 **독립** — 본 §3.11 은 `AbortError` 분기와 무관한 별도 timer 결함.
- 운영자 매뉴얼 스모크 세션에 SA-05 (`loadingDots` 누설 검증) 로 확장 검토 (Could, 본 spec 범위 밖 — 별 REQ 또는 §3.11 머지 후 inspector 라운드).

**추가 시나리오 SA-05 (Could, 별 라운드 후보)**:
- 재현 절차: `/log/search` 진입 → query "테스트" 입력 → fetch 발화 직후 즉시 `/log` 로 라우트 전환 → 재진입 → DevTools Console 에서 `<span id="loading">` 텍스트 관찰.
- 기대 결과: 재진입 시 `loadingDots=""` 로 시작 (누설 0) → "." → ".." → "..." → "" 사이클.
- 자동망 GAP: jsdom + vitest 가 `vi.advanceTimersByTime(300)` 으로 fake timer 대체 가능하므로 **자동 검증 우선** (FR-05 회귀 테스트). 본 SA-05 는 fake timer 로 잡히지 않는 실 브라우저 타이밍 race (예: `setInterval` drift, tab background throttle) 만 보조 관찰.
- 식별자 prefix: SA (Search abort 와 동일 도메인) — §3.2.1 에 Could 행 추가 여부는 planner / inspector 결정.

**spec 박제 위치 결정 (FR-07, Could)**:
- 본 §3.11 가 search-abort-runtime-smoke-spec.md (Search 도메인 런타임 smoke SSoT) 에 박제 — timer cleanup + abort cleanup 이 **같은 파일의 같은 도메인 정합 정책** 으로 공존.
- 대안 위치 (검토 후 기각): common section 별 spec, App-spec.md — Search 외 도메인으로 일반화되면 별 spec (`common-timer-cleanup-spec.md` 등) 승격 검토 (본 §머지 후 별 라운드).

**REQ-021 (AbortController) 와의 시너지**:
- Search.jsx 안에 **2 개의 cleanup 정합** 공존 — (a) `AbortController.abort()` (REQ-021 §3.5), (b) `clearTimeout(id)` / `clearInterval(id)` (본 §3.11).
- 두 패턴 모두 "effect 안에서 리소스 생성 → cleanup 함수가 정확한 핸들로 해제" 원칙 동등.
- 후속 fetch race 정리 (Log / Comment / Image) 시 timer 사용처도 같이 점검 — §3.6 치환 매트릭스 (fetch race) 와 timer cleanup 점검이 함께 수행.

**수용 기준 (REQ-20260419-020 §10)**:
- [ ] FR-01 `clearTimeout(id)` 또는 `clearInterval(id)` (timeout id 변수 보관).
- [ ] FR-02 `setLoadingDots(prev => ...)` functional updater 사용.
- [ ] FR-03 `[isLoading]` 단일 의존 (또는 정당화된 추가 의존).
- [ ] FR-04 `isLoading=false` 시 즉시 `""` 으로 reset.
- [ ] FR-05 회귀 테스트 dots 증가 PASS.
- [ ] (Should) FR-06 회귀 테스트 dots 초기화 PASS.
- [ ] (Could) FR-07 본 §3.11 박제 (본 반영으로 완료).
- [ ] NFR-02 LOC 변경 ±5 이내 (현재 187).
- [ ] NFR-04 unmount 후 setState 호출 0 (React 경고 0).
- [ ] `npm run lint` clean.
- [ ] `npm run test -- Search` 5회 연속 PASS (fake timer 결정성).
- [ ] 사용자 visible 회귀 0 (시각 사이클 동등 또는 더 깔끔).

**범위 밖**:
- Search 도메인 다른 useEffect 리팩터 — 본 §범위 밖.
- `loadingDots` UI 디자인 변경 (색상, 위치, 개수) — 시각 디자인 변경 0.
- Search 의 sessionStorage cache 트릭 제거 (LogList REQ-007 패턴 동일 적용) — 별 후속 후보.
- `setInterval` vs `setTimeout` 아키텍처 결정 — 본 §은 권장/대안 둘 다 허용.
- React 19 bump (REQ-040) 자체 — 본 §은 bump 전 사전 정리 효과.
- TypeScript 변환.
- SA-05 매뉴얼 스모크 시나리오 추가 — Could, 별 라운드.

## 4. 의존성

### 4.1 내부 의존
- 본 체크리스트는 `Search.jsx`, `Search/api.js`, MSW 핸들러(`Search/api.mock.js`) 런타임 동작을 관찰 대상으로 함.
- spec 의존:
  - `server-state-spec.md` §3.5 (REQ-021 AbortController 안전망 정책)
  - `tanstack-query-devtools-smoke-spec.md` (DevTools Network 활용 모범)
  - `markdown-render-smoke-spec.md` / `web-vitals-runtime-smoke-spec.md` (smoke 문서 형식 모범)

### 4.2 외부 의존
- 패키지: 없음 (수동 절차, 브라우저 DevTools)
- 환경: DEV 서버(`npm run dev`) 또는 PROD preview(`npm run build && npm run preview`), Chrome/Edge DevTools
- 브라우저 API: Network 패널 filter `canceled` / Console 패널 search `unmounted`

### 4.3 역의존 (사용처)
- REQ-20260418-021 §3.5 DoD 의 "DevTools canceled 수동 확인" 항목 — 본 체크리스트가 흡수
- 장래 REQ-021 §3.5 후속 (Log/Comment/Image fetch race 정리) — §3.6 치환 매트릭스 활용
- inspector 의 manual smoke 인덱스 박제 (별 spec, Could)

## 5. 수용 기준 (Acceptance — REQ-20260419-013 §10)

- [ ] FR-01 `docs/testing/search-abort-runtime-smoke.md` 파일 생성
- [ ] FR-02 3 시나리오(SA-01 ~ SA-03) 정의 + (Could) SA-04
- [ ] FR-03 4 블록 형식 (재현 절차 / 기대 / DevTools 확인 / 체크박스) 준수
- [ ] FR-04 환경 매트릭스 (브라우저 × OS × DEV/PROD) 입력 칸
- [ ] FR-05 PASS / FAIL / N/A / 노트 칸 제공
- [ ] FR-06 적용 대상 변경 (Search.jsx / api.js / MSW / vite / React bump) 트리거 명시
- [ ] FR-07 일반화 가이드 — 치환 매트릭스 1+ 행 (다른 도메인 fetch race 적용 시)
- [ ] FR-10 1회 수행 ≤ 5분 NFR 명시
- [ ] NFR-02: 기존 6종 smoke 문서 구조와 헤더 ≥80% 일치
- [ ] NFR-03: 시나리오 ↔ `Search.jsx` 라인 매핑 100%
- [ ] (Should) FR-04 환경 매트릭스 Safari Cancelled alias 매핑
- [ ] (Should) 체크리스트 1회 baseline 실행 — 별 후속 또는 운영자 자율 (본 spec 범위 밖)
- [ ] (Could) FR-09 inspector 인덱스 갱신 (별 spec 영역, §3.10)

## 6. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 실행 시간 | N/A | ≤5분/회 | NFR-01 (3 시나리오 × 1.5분 + setup 0.5분) |
| 일관성 | N/A | 기존 6종 문서 구조와 ≥80% 일치 | NFR-02 |
| 추적성 | N/A | 시나리오 ↔ `Search.jsx` 라인 매핑 100% | NFR-03 |
| 일반화성 | N/A | 치환 매트릭스 1+ 행 | NFR-04 |
| 유지보수성 | N/A | Search.jsx 변경 시 ≤5분 갱신 | NFR-05 |

## 7. 알려진 제약 / 이슈
- DevTools 표기가 브라우저별 / 버전별 상이 (`canceled` vs `Cancelled` — Safari) — 문서 §환경에 1회 검증 가이드 + alias 매핑 표 박제 (REQ-013 §12 위험 1).
- 시나리오 SA-01 ~ SA-03 가 실제 race 표현으로 부족할 가능성 (응답 도착 직전/직후 타이밍 미세 차이) — 운영자 1차 baseline 후 보강 슬롯 명시 (REQ-013 §12 위험 2).
- `vite preview` 의 fetch + AbortController 동작이 production 빌드와 미세 차이 — DEV/PROD 양쪽 환경 매트릭스 제공 (REQ-013 §12 위험 3).
- 일반화 가이드 (FR-07) 가 추측에 그쳐 후속 도메인에서 부적합 — 1차 본 PR 은 Search 한정, FR-07 은 후속 fetch race 정리 시 보강 (REQ-013 §12 위험 4).
- 자동화(REQ-031) 도입 시 본 문서 중복 — 도입 시 수동-only baseline 으로 격리 (REQ-013 §12 위험 6).

## 8. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-19 | (pending, REQ-20260419-013) | Search 도메인 AbortController 런타임 수동 smoke 체크리스트 문서 spec 신설 — 5종 → 7종 확장, REQ-021 §3.5 DoD DevTools 항목 흡수, 후속 fetch race 정리(Log/Comment/Image) 일반화 시드 (WIP) | all |
| 2026-04-19 | (pending, REQ-20260419-020) | Search `loadingDots` 타이머 cleanup + stale closure 정합 §3.11 신설 — `clearTimeout(tick)` 함수 인자 버그 수정 + functional updater + `[isLoading]` 단일 의존, Search 도메인 timer cleanup 패턴 SSoT 박제, REQ-021 AbortController 정합과 공존, SA-05 Could 매뉴얼 시나리오 예약 (WIP) | 3.11 |
| 2026-04-20 | (inspector drift reconcile) | §2 As-Is 정정: `docs/testing/search-abort-runtime-smoke.md` 부재 → 존재 (commit `089a818`, task `20260419-search-abort-runtime-smoke-checklist-doc`). 커밋 영향: 본 spec 단독. | 2 |
| 2026-04-20 | (pending, REQ-20260420-004) | REQ-020 §3.11 To-Be 코드 실현 트리거 — `src/Search/Search.jsx:98-104` `loadingDots` 타이머 cleanup + `clearTimeout(tick)` 함수 인자 버그 수정 + functional updater + `[isLoading]` 단일 의존; 머지 후 §3.11 WIP 마감 + 수용 기준 체크박스 `[x]` | 3.11 |

## 9. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/19/20260419-search-abort-runtime-smoke-checklist-doc.md` (REQ-013)
- 관련 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-fetch-abortcontroller-race-condition-prevention.md` (REQ-20260418-021, 검증 대상 코드)
- 관련 spec:
  - `specs/spec/green/state/server-state-spec.md` §3.5 (AbortController 안전망 정책 SSoT)
  - `specs/spec/blue/testing/tanstack-query-devtools-smoke-spec.md` (DevTools Network 활용 모범)
  - `specs/spec/blue/testing/markdown-render-smoke-spec.md` (smoke 형식 모범)
  - `specs/spec/green/testing/web-vitals-runtime-smoke-spec.md` (smoke 형식 모범)
  - `specs/spec/green/testing/log-mutation-runtime-smoke-spec.md` (직전 smoke 모범)
- 모범 (docs/testing/):
  - `docs/testing/markdown-render-smoke.md`, `docs/testing/web-vitals-runtime-smoke.md`, `docs/testing/tanstack-query-devtools-smoke.md`, `docs/testing/styles-cascade-visual-smoke.md`, `docs/testing/toaster-visual-smoke.md`, `docs/testing/log-mutation-runtime-smoke.md`
  - `docs/testing/keyboard-a11y-runtime-smoke.md` (REQ-002, done — 자동망 사각지대 보완 직전 모범)
- 원 followup: `specs/followups/consumed/2026/04/19/20260418-1200-manual-devtools-canceled-verification.md`
- 직전 task: `specs/task/done/2026/04/18/20260419-search-domain-abortcontroller-safety-net/`
  - task result: `specs/task/done/2026/04/18/20260419-search-domain-abortcontroller-safety-net/result.md` (DevTools 항목 미체크)
- 외부 참고:
  - MDN AbortController: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
  - Chrome DevTools Network status: https://developer.chrome.com/docs/devtools/network/reference/#status
  - MSW v2 fetch interceptor: https://mswjs.io/docs/integrations/node
