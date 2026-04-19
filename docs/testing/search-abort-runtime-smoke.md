# Search 도메인 AbortController 런타임 수동 스모크 체크리스트

> SSoT: `specs/spec/blue/testing/search-abort-runtime-smoke-spec.md`
> 기원 요구사항: `specs/requirements/done/2026/04/19/20260419-search-abort-runtime-smoke-checklist-doc.md` (REQ-20260419-013)
> 도입 태스크: TSK-20260419-SEARCH-ABORT-SMOKE-DOC
> 자매 문서: `docs/testing/markdown-render-smoke.md`, `docs/testing/web-vitals-runtime-smoke.md`, `docs/testing/tanstack-query-devtools-smoke.md`, `docs/testing/toaster-visual-smoke.md`, `docs/testing/styles-cascade-visual-smoke.md`, `docs/testing/log-mutation-runtime-smoke.md`

## 범위 (Scope)

`src/Search/Search.jsx` 의 `useEffect` + `fetch` + `AbortController` + cleanup 파일럿(REQ-20260418-021 §3.5) 에 대한 **DevTools Network `canceled` 표시 / Console `AbortError` · "Cannot update unmounted component" 클린** 을 사람 1회 점검(≤5분) 으로 검증한다. 구체적으로는 jsdom + vitest 자동망이 커버하지 못하는 다음 3 경계를 대상으로 한다.

- DevTools Network 탭의 request lifecycle 상태(`pending` → `canceled` / `complete` / `failed`) — 빨간색 row 시각 신호.
- DevTools Console 탭의 React "Cannot update unmounted component" 경고 0건 — 사용자 가시 신호.
- MSW fetch interceptor(jsdom) vs 실제 브라우저 fetch + `AbortController` signal propagation 차이.

자동 회귀 케이스는 `src/Search/Search.test.jsx:158-185` 에 박제되어 있으나 DevTools 가시 동작(row 색상/필터/Console 메시지) 은 자동으로 어서트 불가 — 본 체크리스트가 그 GAP 을 사람의 1차 신호로 보완한다. 자동화(Playwright / Cypress) 도입은 REQ-20260418-031 영역.

## 적용 대상 변경 (Triggers)

다음 중 하나라도 수정한 PR 에서 본 체크리스트를 수행한다.

- `src/Search/Search.jsx` 의 `useEffect` / `AbortController` / fetch 호출 블록 변경 (보조: `:48-117`).
- `src/Search/Search.jsx` 의 `AbortError` silent 분기 변경 (보조: `:105`).
- `src/Search/api.js` 의 `getSearchList(string, init)` signature 변경 (fetch 호출 / `signal` 전달 경로).
- MSW 메이저 bump (v2 → v3) — fetch interceptor 동작 변경 가능.
- vite / oxc 메이저 bump — fetch interceptor / bundling 변경 가능.
- React 메이저 bump (18 → 19, REQ-040 관련) — Suspense / unmount 타이밍 변경 가능.

무관한 변경(순수 문서 편집, 다른 도메인 CSS / 테스트 헬퍼 등)은 수행 대상이 아니다.

## 사전 조건 (Pre-conditions)

1. 작업 브랜치 checkout, 변경사항 반영 상태.
2. `npm install` 로 의존성 최신화.
3. 빌드 환경 선택 — **DEV** (`npm run dev`) 또는 **PROD** (`npm run build && npm run preview`) 중 1개 이상 기동. 최소 PROD 1조합 권장 (NFR-01 ≤5분 마감).
4. 관리자 / 비관리자 자격증명 — Search 경로는 공개이므로 필수는 아니나, 로그인 세션 유무에 따른 인증 분기가 있으면 각 조합에서 1회 확인(Should).
5. 커밋 해시 박제 — `git rev-parse HEAD` 출력을 §수행 로그 에 기록.
6. 브라우저 DevTools 준비:
   - **Network 패널** — `Preserve log` 체크, 필터에 `/prod?q=` 또는 `canceled` (Safari 는 `Cancelled`).
   - **Console 패널** — 검색 키워드 `unmounted`, `AbortError`.
   - **Application 패널** (선택) — `sessionStorage` 의 `searchList` / `searchQueryString` 등 키 확인 (캐시 히트 시나리오 구분용).

## 시나리오 매트릭스 (Scenarios)

각 시나리오는 (재현 절차 / 기대 결과 / DevTools 확인 / 결과 체크박스) 4 블록 형식이다. 체크박스는 `[ ]` 로 baseline 초기화 상태.

### SA-01 — 라우트 전환 시 cancel (필수)

- **재현 절차**
  1. `/log/search` 진입 (DEV 는 `http://localhost:3000/log/search`, PROD preview 는 preview 서버 URL).
  2. 검색창에 query `테스트` 입력 (Enter 또는 Search 버튼 트리거 — `src/Search/Search.jsx:48-117` 의 `useEffect` 발화).
  3. DevTools Network 탭에서 `/prod?q=테스트` row 가 `pending` 상태로 확인되는 **즉시** (응답 도착 전) `/log` 또는 `/log/:timestamp` 로 라우트 전환 (상단 네비 또는 주소창).
- **기대 결과**
  - DevTools Network 의 `/prod?q=테스트` row 가 `canceled` (Chrome 기준 빨간색 row, Safari 는 `Cancelled`).
  - DevTools Console 에 경고/에러 0건 (특히 "Cannot update unmounted component" / `AbortError` stack 미노출).
- **DevTools 확인**
  - Network 탭 filter `canceled` (Chrome/Edge/Firefox) 또는 `Cancelled` (Safari) 로 상태 전환 확인.
  - Console 탭 검색 `unmounted` / `AbortError` — 모두 0 매치.
  - 보조 라인 매핑: `src/Search/Search.jsx:115` 의 cleanup `return () => ac.abort();` 가 호출돼야 row 가 `canceled` 로 전이.
- **결과**: [ ] PASS / [ ] FAIL / [ ] N/A (조건 미충족) — 노트: ___

### SA-02 — 같은 라우트 query 변경 cancel (필수)

- **재현 절차**
  1. `/log/search` 진입.
  2. query A (예: `리액트`) 입력 → fetch 발화 (Network row A 가 `pending`).
  3. **응답 도착 전** 즉시 query B (예: `바이트`) 로 입력 변경 → 새 fetch 발화.
- **기대 결과**
  - row A 가 `canceled`, row B 만 `complete` (200 OK).
  - 화면 상 검색 결과는 B 기준 목록만 렌더.
  - Console 클린.
- **DevTools 확인**
  - Network 탭 row 정렬 순서(시작 시각) + 각 status 칼럼. filter 는 `/prod?q=` 로 두고 row 2건 상태 비교.
  - 보조 라인 매핑: `src/Search/Search.jsx:48-117` 의 useEffect deps `[queryString]` 가 B 로 바뀌며 cleanup → 신규 effect 순서 보장.
- **결과**: [ ] PASS / [ ] FAIL / [ ] N/A (조건 미충족) — 노트: ___

### SA-03 — 즉시 unmount + Console 클린 (필수)

- **재현 절차**
  1. `/log/search` 진입.
  2. query 입력 → fetch 발화 확인 (Network row `pending`).
  3. 응답 도착 전 즉시 다른 라우트로 전환(`/log`, `/log/:timestamp`, `/comment`, `/image` 등) → Search 컴포넌트 unmount 유도.
- **기대 결과**
  - DevTools Console 에 React 의 "Cannot update unmounted component" / "Can't perform a React state update on an unmounted component" 경고가 **0건**.
  - Network row 는 `canceled`.
- **DevTools 확인**
  - Console 탭 검색 `unmounted` → 0 매치.
  - 보조 라인 매핑: `src/Search/Search.test.jsx:158-185` 의 unmount 회귀 케이스가 jsdom 에서 0 warning 을 박제하지만, 실제 브라우저 경고 억제까지 확인하는 것이 본 시나리오 책임.
- **결과**: [ ] PASS / [ ] FAIL / [ ] N/A (조건 미충족) — 노트: ___

### SA-04 — `AbortError` silent 분기 Console 클린 (Could)

- **재현 절차**
  1. SA-01 을 반복 수행 (라우트 전환으로 cancel 유도).
  2. DevTools Console 탭에서 `AbortError` 문자열 검색.
- **기대 결과**
  - Console 에 `AbortError` 텍스트 0 매치.
  - `src/Search/Search.jsx:105` 의 `if (err.name === 'AbortError') return;` silent return 이 실제 브라우저에서도 stack 노출 없이 흡수됨을 검증.
- **DevTools 확인**
  - Console 탭 filter `AbortError` → 0 매치 (log / error / warn 모두).
  - 보조 라인 매핑: `src/Search/Search.jsx:104-108` 의 `catch(err)` 블록.
- **결과**: [ ] PASS / [ ] FAIL / [ ] N/A (조건 미충족) — 노트: ___

> SA-04 는 Could 로 박제 (spec §3.2.1 / §13 미결 5). SA-01 ~ SA-03 (필수) 만 수행해도 수용 기준은 충족하지만, silent 분기 회귀 민감도를 높이려면 함께 수행 권장.

## 환경 매트릭스 (Environment)

각 세션에 다음 필드를 표로 기록.

| 필드 | 값 | 메모 |
|------|----|------|
| 브라우저 + 버전 |  | ≥1 필수 (권장 Chrome, 예: Chrome 134, Edge 134, Firefox 126, Safari 18) |
| OS |  | ≥1 필수 (예: macOS 14, Windows 11, iOS 17) |
| 빌드 환경 |  | DEV (`npm run dev`) / PROD (`npm run build && npm run preview`) — 시나리오별 개별 표기 가능 |
| MSW 상태 |  | 활성(DEV) / 비활성(PROD) — DEV 는 MSW fetch interceptor 경유, PROD 는 실제 브라우저 fetch |
| 커밋 해시 |  | `git rev-parse HEAD` 출력 박제 필수 |

- 권장 최소 조합: **Chrome + macOS + PROD 1조합** (NFR-01 ≤5분 마감 전제).
- DEV 환경 추가는 Should (MSW interceptor 동작 회귀 흡수). Firefox / Safari 추가는 Should (브라우저별 `canceled` alias 회귀).

### DevTools `canceled` alias 매핑

브라우저별 Network 패널의 request 취소 상태 표기가 다르므로 필터 키워드 주의.

| DevTools alias | Chrome / Edge | Firefox | Safari |
|----------------|---------------|---------|--------|
| canceled row 상태 문자열 | `canceled` (소문자) | `NS_BINDING_ABORTED` 또는 `aborted` | `Cancelled` (대문자 C) |
| 기본 row 색상 | 빨간색 (status 칼럼) | 빨간색 / 회색 | 빨간색 |
| filter 입력 권장 | `canceled` | `aborted` | `Cancelled` |

## 결과 기록 (Results)

각 시나리오 row 에 `[ ] PASS` / `[ ] FAIL (메모)` / `[ ] N/A (조건 미충족)` 중 하나에 체크한다.

- FAIL 시 DevTools Network 탭 스크린샷 / 응답 헤더 / Console 메시지 첨부 권장 (Should).
- 체크리스트 마감 시 문서 하단 §수행 로그 섹션에 운영자 / 일자 / 환경 / 커밋 해시를 기록한다.
- 체크박스 형식 미준수 (대문자 `X`, `v` 등) 는 지양. 운영자 / 해시 / 날짜를 반드시 병기하여 형식적 체크 남발을 방지한다 (spec §7 위험 완화).

## 후속 확장 가이드 (Future Extension)

본 체크리스트의 시나리오 패턴(라우트 전환 / query 변경 / 즉시 unmount / silent abort) 을 다른 도메인(Log / Comment / Image) 의 fetch race 정리 시 재사용하기 위한 **치환 매트릭스**:

| 현 (Search, SA-XX) | 다른 도메인 적용 예 | prefix 제안 |
|--------------------|---------------------|-------------|
| `/log/search` 라우트 | `/log`, `/comment/:id`, `/image` | LA-XX (Log abort), CA-XX (Comment abort), IA-XX (Image abort) |
| `Search.jsx` 의 `useEffect` + `AbortController` 블록 | `LogList.jsx`, `LogSingle.jsx`, `Comment.jsx`, `ImageSelector.jsx` 의 fetch useEffect | 적용 범위 명시 |
| `getSearchList(string, init)` | `getLogs`, `getLog`, `getComments`, `getImages` | fetch 함수명 매핑 (init 로 `signal` 전달) |
| `/prod?q=테스트` DevTools row | `/prod/log`, `/prod/comment/:id`, `/prod/image/:id` 등 | request path 치환 |
| `Search.jsx:105` `AbortError` silent 분기 | 각 도메인 fetch catch 블록의 `AbortError` 분기 | silent return 라인 보조 매핑 |

- 시나리오 식별자 prefix 는 도메인별 2문자 (`SA`, `LA`, `CA`, `IA`) — spec §3.6 권장.
- 신규 도메인 체크리스트 작성 비용 ≤ 30분 (치환 매트릭스 활용, NFR 기준 FR-07).
- 1 PR 내에서 섹션 추가 · row append 가 ≤ 5분 안에 가능해야 한다 (NFR-05).

후속 fetch race 정리(Log / Comment / Image) 는 REQ-20260418-021 §3.5 후속 별 요구사항이며, 본 문서 치환 매트릭스는 해당 작업의 가속용 시드다.

## 비-목표 (Non-Goals)

- Search 외 도메인(Log / Comment / Image) 의 fetch race 자체 정리 — REQ-20260418-021 §3.5 후속 별 요구사항.
- 자동화(Playwright / Cypress / Storybook) 기반 E2E — REQ-20260418-031 영역.
- Web Vitals (LCP / CLS / INP) 영향 측정 — REQ-20260418-035 영역.
- ARIA 라이브 리전 / 라우팅 시 포커스 관리 — accessibility-spec 후속.
- 본 체크리스트는 **실행(PASS 보고) 자체가 범위 밖** — 문서 신설까지이며, 운영자 1회 baseline 수행 / 결과 박제는 별 task.
- `docs/testing/` 6종 → 7종 인덱스 박제 (옵션 A/B/C, spec §3.10 / FR-09 Could) — inspector 영역, 본 문서 범위 밖.

## 수행 로그 (Execution Log)

| 일자 | 운영자 | 환경 | 커밋 | 결과 요약 |
|------|--------|------|------|-----------|

## 변경 이력

| 일자 | 태스크 | 요약 |
|------|--------|------|
| 2026-04-19 | TSK-20260419-SEARCH-ABORT-SMOKE-DOC | 문서 신설 (시나리오 4건 SA-01 ~ SA-03 필수 + SA-04 Could, 환경 매트릭스, Safari `Cancelled` alias 표, 치환 매트릭스 5행, 적용 대상 변경 6종, 수행 로그 빈 슬롯) |
