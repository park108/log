# ErrorBoundary 런타임 수동 스모크 체크리스트

> SSoT: `specs/spec/green/common/error-boundary-spec.md` §7.2 (blue 승격 예정)
> 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-error-boundary-runtime-smoke-checklist-doc.md` (REQ-20260418-037, FR-01~08 / US-01~05 / NFR-01~06) + `specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md` (REQ-20260418-005) + `specs/requirements/done/2026/04/18/20260418-errorboundary-test-stderr-suppression.md` (REQ-20260418-007)
> 도입 태스크: TSK-20260420-02
> 자매 문서: `docs/testing/web-vitals-runtime-smoke.md`, `docs/testing/styles-cascade-visual-smoke.md`, `docs/testing/toaster-visual-smoke.md`, `docs/testing/markdown-render-smoke.md`, `docs/testing/tanstack-query-devtools-smoke.md`, `docs/testing/log-mutation-runtime-smoke.md`, `docs/testing/search-abort-runtime-smoke.md`

## 목적

App 최상위 Suspense fallback 을 `<Skeleton variant="page" />` 로 대체하고, 3개 lazy 라우트(`/log/*`, `/file`, `/monitor`) 를 `<ErrorBoundary fallback={(p) => <ErrorFallback {...p} />} onError={reportError}>` 로 래핑한 REQ-20260418-005 통합(및 REQ-007 stderr 억제) 의 런타임 동작은 다음 이유로 **jsdom 자동 테스트 범위 밖** 이다:

- `src/common/ErrorBoundary.test.jsx` (4/4 PASS) 는 `console.error` / `process.stderr.write` spy 로 catch / fallback / `onError` 분기는 보장하지만, 실제 Skeleton 플리커 / ErrorFallback UI 레이아웃 / Navigation·Footer 유지 / reset 재마운트 / DevTools Console 의 `[reportError]` 가시성은 재현하지 않는다.
- `src/App.test.jsx:250` 의 "white-screen regression guard" 는 최상위 Suspense fallback 으로 Skeleton 이 마운트되는지까지만 확인하고, React Router lazy chunk 의 실제 네트워크 지연·paint 타이밍·ErrorFallback 버튼 UX 는 브라우저에서만 검증 가능하다.
- jsdom 29 + React 18 의 `callTheUserObjectsOperation` 경로에서 의도 throw 가 발생하면 stderr 트레이스가 노출되며, REQ-007 억제는 테스트 파일 scope 에만 적용된다. 실사용 DevTools Console 의 `[reportError]` prefix 출력은 억제 대상이 아니므로 브라우저 수동 확인이 표준이다.

본 체크리스트는 **운영자 Chrome/Edge DevTools 1회 baseline + React 19 bump(REQ-012) 후 회귀 baseline** 으로 5 픽스처를 박제하여, §회귀 시나리오 트리거 발생 시 재수행하는 표준 절차다 (spec §7.2 수용 기준, REQ-20260418-037 FR-01~08, NFR-01 "≤7분/회").

Playwright / `react-error-boundary` 자동화, Sentry 연결, React 19 동작 변경 검증은 **범위 밖** 이며 본 문서는 그 도입 이전의 보완재로 운용한다 (spec §7.2 범위 밖).

## 적용 대상 변경

다음 중 하나라도 수정한 PR 에서 수행한다 (spec §7.2, REQ-037 FR-04 회귀 시나리오).

- `src/App.jsx:92` — 최상위 Suspense fallback 변경 (`<Skeleton variant="page" />` → 다른 컴포넌트 / variant 인자 변경 / 위치 이동).
- `src/App.jsx:96-119` — 3 lazy 라우트(`/log/*`, `/file`, `/monitor`) `ErrorBoundary` 래핑 구조 변경 (라우트 추가 / 삭제 / 그룹핑 / `fallback` prop 변경 / `onError` prop 변경).
- `src/common/ErrorBoundary.jsx` — 클래스 구현 변경 (`getDerivedStateFromError` / `componentDidCatch` / `reset` 콜백 / state shape).
- `src/common/Skeleton.jsx` 또는 `src/common/Skeleton.css` — variant 분기, `role="status"`, `data-testid="skeleton-{variant}"` 구조·block 수 변경.
- `src/common/ErrorFallback.jsx` 또는 `src/common/ErrorFallback.css` — `isNetworkError(error)` 분기, `role="alert"`, "다시 시도" 버튼, 네트워크/렌더 에러 메시지 변경.
- `src/common/errorReporter.js` — `reportError(error, errorInfo)` 시그니처 변경, prefix 문자열 변경, Sentry 등 외부 reporter wiring.
- React 18 → 19 bump (REQ-012) — ErrorBoundary + Suspense 동작 / StrictMode effect 더블 invocation 영향 가능성.
- `react-router-dom` bump — 라우트 전환 + lazy 상호작용 변화 가능성.
- `package.json` 의 React / react-dom / react-router-dom bump 전반.

무관한 변경(서버 상태 리팩터, 백엔드 env 이관, 테스트 헬퍼 추가, 다른 도메인 CSS 이행, 문서 편집 등) 은 수행 대상이 아니다.

## 사전 준비

1. 작업 브랜치 checkout, 변경사항 반영 상태.
2. `npm install` 로 의존성 최신화.
3. `npm run dev` 기동 → 기본 `http://localhost:3000` (Vite dev 서버 기동 시 출력되는 URL 기준).
4. 브라우저:
   - **Chrome 또는 Edge (권장)** — ErrorBoundary + Suspense 동작이 Chromium 기반에서 안정.
   - Firefox / Safari — 권장 수준(운영자 재현 시 OK). 시각 차이 관찰되면 비고에 명기.
   - 권장 **private / incognito window** — 브라우저 확장의 `console.error` 후킹 / Service Worker 캐시 오염 방지.
5. DevTools 준비:
   - **Console 패널** (reportError 캡처) — `Preserve log` 체크. Level 필터 `Errors` 포함. `[reportError]` prefix 로 grep.
   - **Elements 패널** (ErrorFallback / Skeleton 마운트 확인) — `role="alert"` / `role="status"` 검색 가능.
   - **Network 패널** — Throttling `Slow 3G` 로 Skeleton 플리커 가시. lazy chunk 로드 시간 확보.
6. 기록 준비 (spec §7.2 baseline 슬롯):
   - 운영자 (이름 / 이메일)
   - 일자 (YYYY-MM-DD)
   - 커밋 해시 (`git rev-parse HEAD` 의 앞 7자)
   - 브라우저 + 버전 (예: Chrome 131.0.6778.85)
   - OS (예: macOS 14.5)
   - 라우트 (예: `/log`, `/file`, `/monitor`)

## 의도 throw 트리거 가이드

픽스처 2~5 는 **의도적으로 렌더 에러를 발생시켜야** ErrorFallback / reset / reportError 경로가 재현된다. 아래 **(b) 임시 코드 변경** 을 기본 권장 (FR-05, REQ §13 미결 이슈 해소) 한다. (a) / (c) 는 보조.

### (b) 임시 코드 변경 — 권장

1. `src/Log/LogList.jsx` (또는 lazy target 컴포넌트) 함수 본문 첫 줄에 **임시로** 아래 라인을 삽입한다:
   ```jsx
   throw new Error('manual smoke test');
   ```
2. Vite HMR 이 반영하면 `/log` 라우트 진입 즉시 `Log` 래퍼의 `ErrorBoundary` 가 catch → ErrorFallback 노출.
3. 픽스처 2~5 수행 완료 후 **즉시 라인 제거** 및 git 상태 확인(`git status` 에 본 임시 변경이 남지 않도록).

**장점**: 외부 도구 의존 0. 환경 독립. React DevTools 버전 제약 없음.
**주의**: 라인 제거 누락 시 `git status` 가 catch → 커밋 금지. `git diff` 로 최종 확인.

### (a) React DevTools — 보조

- React DevTools 8.x Components 탭 → Log 하위 노드 선택 → 우측 🐞 "Force this component to throw" 버튼 (버전 지원 시).
- 버전에 따라 메뉴 위치·라벨이 다르며, 18/19 간 동작 차이 있어 재현성 낮을 수 있음. 운영자 확인 시 보조 사용 OK.

### (c) `?throw=true` query string `__DEV__` 토글 — 비권장

- REQ-037 §10 Could / §13 미결. 본 체크리스트 범위 밖. 별 후보로 남김.

## 체크리스트 5 픽스처

각 픽스처는 (절차 / 기대 동작 / DevTools 확인 / 체크박스) 4 블록. 체크박스는 `[ ]` 로 초기화된 상태를 템플릿으로 보관하며, 실제 baseline 수행 기록은 §Baseline 수행 섹션에 인라인으로 남긴다.

spec §7.2 픽스처 5종 + REQ-037 §3.1 5 항목 1:1 대응.

### 픽스처 1. Skeleton 가시 (라우트 전환) — spec §7.2-1, US-01

**절차:**

1. DevTools Network 패널 Throttling 을 `Slow 3G` 로 설정 (lazy chunk 지연 확보).
2. 기본 라우트 `/` 진입 (→ `/log` 리다이렉트).
3. 상단 네비게이션에서 `File` 또는 `Monitor` 링크 클릭 → lazy 라우트 전환.
4. 전환 순간 몇백 ms 동안 화면 본문 영역에 **회색 블록 4개가 세로로 배치된 Skeleton** 이 노출되는지 관찰.

**기대 동작:**

- 최상위 Suspense fallback 으로 `<Skeleton variant="page" />` 가 마운트.
- Navigation 상단바 / Footer 하단은 Skeleton 위/아래에 정상 위치(최상위 Suspense 내부이므로 route lazy 완료 전까지는 동일 Suspense 가 일괄 대기 — `src/App.jsx:91-123` 구조 참조).
- chunk 로드 완료 시 Skeleton 자연스럽게 사라지고 실제 라우트 UI 마운트.

**DevTools 확인:**

- Elements 탭에서 Skeleton 루트 inspect:
  ```html
  <div role="status" aria-label="로딩 중" data-testid="skeleton-page" class="...">
    <div class="skeleton-block skeleton-block--bar"></div>
    ...
  </div>
  ```
- Network 패널에서 `File.*.js` / `Monitor.*.js` 같은 lazy chunk 요청이 `Pending` → `200` 으로 바뀌는 동안 Skeleton 가시 구간 확인.
- Console 에러 0.

**체크박스:**

- [ ] `data-testid="skeleton-page"` 가 라우트 전환 중 **가시**
- [ ] `role="status"` + `aria-label="로딩 중"` 속성 존재
- [ ] chunk 로드 완료 후 Skeleton 이 사라지고 실제 라우트 UI 마운트
- [ ] Console 에러 0 (Skeleton 내부 `[reportError]` 발화 없음)

### 픽스처 2. 의도 throw 시 ErrorFallback + Navigation/Footer 유지 — spec §7.2-2, US-02

**절차:**

1. §의도 throw 트리거 가이드 (b) 의 임시 라인을 `src/Log/LogList.jsx` 함수 본문 첫 줄에 삽입. Vite HMR 반영 대기.
2. 브라우저 `/log` 라우트로 진입 (또는 새로고침).
3. 렌더 에러 발생 → `<Route path="/log/*">` 의 `ErrorBoundary` 가 catch → ErrorFallback 노출.

**기대 동작:**

- 본문 영역에 `role="alert"` 인 ErrorFallback UI 노출.
- 렌더 에러 분기(네트워크 에러 아님) 이므로 메시지 "예기치 않은 오류가 발생했습니다" (또는 spec §3.3 의 최신 문구) + "다시 시도" 버튼 표시.
- **Navigation 상단바** (상단 `Park108 / Log / File / Monitor` 등) 와 **Footer** 는 여전히 정상 위치에 가시 — `ErrorBoundary` 가 라우트 단위라서 이웃 컴포넌트 영향 0.
- `/file` / `/monitor` 라우트는 영향 없음(픽스처 3 에서 확인).

**DevTools 확인:**

- Elements 탭에서 ErrorFallback 루트 inspect:
  ```html
  <div role="alert" class="...">
    <h2>예기치 않은 오류가 발생했습니다</h2>
    ...
    <button type="button">다시 시도</button>
  </div>
  ```
- Navigation `<nav>` 상단, Footer `<footer>` 하단이 ErrorFallback 주변에 그대로 존재하는지 확인.
- Console 에 `[reportError]` 라인 1건 이상 출력 (픽스처 5 에서 상세 확인).

**체크박스:**

- [ ] `role="alert"` 요소 마운트 확인
- [ ] ErrorFallback 메시지 "예기치 않은 오류가 발생했습니다" (렌더 에러 분기) 가시
- [ ] "다시 시도" 버튼 존재
- [ ] Navigation 상단바 + Footer 하단 여전히 가시 (라우트 격리)

### 픽스처 3. 이웃 라우트 정상 동작 — spec §7.2-3, US-03

**절차:**

1. 픽스처 2 의 throw 상태를 유지한 채 (HMR 라인 제거 금지).
2. Navigation 상단바의 `File` 링크 클릭 → `/file` 라우트 전환.
3. File 라우트 UI 가 정상 렌더되는지 확인.
4. `Monitor` 링크 클릭 → `/monitor` 라우트 전환 → 정상 렌더.
5. 다시 `Log` 링크 클릭 → `/log` 라우트 → 재차 ErrorFallback 노출 (throw 가 여전히 있으므로 정상).

**기대 동작:**

- `/file`, `/monitor` 라우트는 **ErrorBoundary 영향 0** — 독립 래핑이므로 `/log` 의 throw 가 이웃 라우트로 전파되지 않음.
- 각 라우트의 실제 UI(File 목록, Monitor 대시보드) 가 정상 마운트.
- Navigation / Footer 는 계속 정상 위치.

**DevTools 확인:**

- Elements 탭에서 `/file` 진입 시 `<div role="alert">` 가 사라지고 File 라우트 루트(예: `<main class="...">` + File 컴포넌트 트리) 로 교체됨.
- Console 에 `/file` / `/monitor` 진입 후 새로운 `[reportError]` 추가 발화 없음.

**체크박스:**

- [ ] `/file` 라우트 정상 렌더 (ErrorFallback 없음)
- [ ] `/monitor` 라우트 정상 렌더 (ErrorFallback 없음)
- [ ] 다시 `/log` 로 돌아오면 ErrorFallback 재노출 (격리 재현성)
- [ ] Navigation / Footer 지속 가시

### 픽스처 4. Reset 버튼 재마운트 — spec §7.2-4, US-04

**절차:**

1. 픽스처 2 의 throw 라인을 **`src/Log/LogList.jsx` 에서 제거** (`git diff` 로 제거 확인). Vite HMR 반영 대기.
2. 브라우저의 `/log` 라우트에 여전히 ErrorFallback 이 남아 있는지 확인 (HMR 가 ErrorBoundary 의 `hasError` state 를 리셋하지 않으면 남아 있음).
3. ErrorFallback "다시 시도" 버튼 클릭.
4. `Log` 라우트가 **재마운트** 되어 정상 UI(LogList) 로 전환되는지 확인.

**기대 동작:**

- `reset` 콜백이 `ErrorBoundary` state 를 `{hasError: false, error: null}` 로 복구 → children 재시도.
- throw 라인이 제거된 상태이므로 이번에는 에러 없이 정상 렌더.
- Navigation / Footer 는 계속 정상 위치.

**DevTools 확인:**

- Elements 탭에서 `role="alert"` 가 사라지고 `Log` 라우트의 실제 루트(예: `<main class="main main--main-contents" role="application">` + LogList) 로 교체.
- Console 에 "다시 시도" 클릭 후 새로운 `[reportError]` 발화 없음 (정상 렌더이므로).

**체크박스:**

- [ ] 임시 throw 라인 제거 후 `git diff src/Log/LogList.jsx` → clean 상태 확인
- [ ] "다시 시도" 버튼 클릭 후 ErrorFallback 사라짐
- [ ] `/log` 정상 UI(LogList) 렌더
- [ ] Console 에러 0

### 픽스처 5. `reportError` (onError 훅) 호출 가시 — spec §7.2-5, US-05

**절차:**

1. 픽스처 2 와 동일하게 throw 라인 삽입 + HMR 반영 + `/log` 진입.
2. throw 발생 직후 DevTools **Console 패널** 에서 `[reportError]` prefix 출력 확인.
3. 출력 형태(`[reportError]` + Error 객체 + errorInfo 객체 with `componentStack`) 를 육안 확인.

**기대 동작:**

- `src/common/errorReporter.js` 의 `reportError(error, errorInfo)` 가 `console.error('[reportError]', error, errorInfo)` 로 출력.
- Error 객체는 `Error: manual smoke test` 스택, `errorInfo.componentStack` 은 `at Log` → `at ErrorBoundary` → `at Route` 등 React 스택 라인.
- 본 호출 1건당 DevTools Console 에 라인 1개 (React 18 prod/dev 모두 1회; React 19 bump 후 더블 invocation 영향은 §회귀 시나리오 4 에서 재검증).

**DevTools 확인:**

- Console 패널 필터에 `[reportError]` 입력 → 라인 1건 이상 매칭.
- 매칭 라인 확장하여 `componentStack` 필드에 `at ErrorBoundary` 가 포함되는지 확인.
- 스택에 `manual smoke test` 문자열 포함 확인.

**체크박스:**

- [ ] Console 에 `[reportError]` prefix 1건 이상 출력
- [ ] Error 메시지 `manual smoke test` 포함
- [ ] `errorInfo.componentStack` 에 `at ErrorBoundary` 포함
- [ ] 완료 후 `src/Log/LogList.jsx` 임시 라인 제거 + `git status` clean 재확인

## Baseline 수행 (FR-03, FR-07, spec §7.2 Should)

### baseline 양식

```
## Baseline 수행 (error-boundary-runtime)
- 운영자: <이름/이메일>
- 일자: YYYY-MM-DD
- 커밋 해시: <7자 해시>
- 브라우저 + 버전: <Chrome/Edge + version>
- OS: <OS + 버전>
- 라우트: /log (기본), 필요 시 /file, /monitor 추가
- 결과:
  - 픽스처 1 (Skeleton 가시): [x]
  - 픽스처 2 (ErrorFallback + Nav/Footer): [x]
  - 픽스처 3 (이웃 라우트 격리): [x]
  - 픽스처 4 (Reset 재마운트): [x]
  - 픽스처 5 (reportError 호출): [x] / Console 라인 발췌 (민감 필드 redact)
- 노트: private window 사용, Slow 3G throttle, React DevTools 버전, 관찰된 이상.
```

### baseline 1회 (2026-04-20, TSK-20260420-02 — 본 문서 도입)

본 문서 도입 태스크(TSK-20260420-02) 는 **런타임 코드 변경 0 / 문서 1개 신규** 이며, 실제 `npm run dev` 기동 + Chrome/Edge 브라우저 세션 + DevTools Console / Elements / Network 수집은 운영자(park108) 의 로컬 세션에서만 수행 가능하다. 본 커밋 시점(자동화된 SDD 파이프라인 내) 에서는 해당 브라우저 세션이 **수동 검증 불가** 이므로, 아래 양식을 1 슬롯으로 비워두고 운영자가 다음 로컬 세션에서 5 픽스처를 수행하여 `[x]` 로 마감하도록 예약한다. 자매 체크리스트(TSK-17 / TSK-22 / TSK-23 / TSK-35) 와 동일한 처리 패턴.

```
## Baseline 수행 (error-boundary-runtime, 1회 — 본 문서 도입 기준)
- 운영자: (park108, pending manual session)
- 일자: 2026-04-20
- 커밋 해시: (본 커밋 기준, 커밋 직후 추가 기록)
- 브라우저 + 버전: (pending)
- OS: (pending)
- 라우트: /log, /file, /monitor
- 결과:
  - 픽스처 1 (Skeleton 가시): [ ] — pending manual session
  - 픽스처 2 (ErrorFallback + Nav/Footer): [ ] — pending manual session
  - 픽스처 3 (이웃 라우트 격리): [ ] — pending manual session
  - 픽스처 4 (Reset 재마운트): [ ] — pending manual session
  - 픽스처 5 (reportError 호출): [ ] — pending manual session
- 노트: 본 태스크는 문서 신규 추가만 포함하며 파이프라인 실행 환경에 브라우저 세션이 없어 baseline 이 미수행 상태로 출고. 운영자 다음 로컬 세션에서 5 픽스처를 Chrome/Edge DevTools Console + Elements + Network 패널에서 재현 후 체크박스 [x] 로 마감. 자매 체크리스트(`web-vitals-runtime-smoke` / `markdown-render-smoke` / `toaster-visual-smoke` / `styles-cascade-visual-smoke`) 운영자 세션과 통합 권장 (spec §7.2 Should).
```

### baseline 2회 (React 19 bump / REQ-012 머지 후, 예약)

아래 §회귀 시나리오 중 React 18 → 19 bump(REQ-012) 가 머지되는 시점에 재수행. 5 픽스처 재검증 + StrictMode effect 더블 invocation 영향 확인(픽스처 5 의 `[reportError]` 라인 수가 2배로 증가할 수 있음 — 프로덕션 빌드 영향 없음이 기대값).

```
## Baseline 수행 (error-boundary-runtime, 2회 — React 19 bump 후)
- 운영자:
- 일자:
- 커밋 해시:
- 브라우저 + 버전:
- OS:
- 라우트: /log, /file, /monitor
- 결과:
  - 픽스처 1 (Skeleton 가시): [ ]
  - 픽스처 2 (ErrorFallback + Nav/Footer): [ ]
  - 픽스처 3 (이웃 라우트 격리): [ ]
  - 픽스처 4 (Reset 재마운트): [ ]
  - 픽스처 5 (reportError 호출): [ ] / Console 라인 수(dev vs prod) 비교 발췌
- 노트: 트리거된 회귀 시나리오(React 19 bump) 명기. StrictMode 더블 invocation 영향(dev 에서 `[reportError]` 2배 출력 여부) 기록.
```

### baseline 향후 슬롯

- **Sentry 연결 시** — `src/common/errorReporter.js` 의 `console.error` 가 실제 Sentry SDK 로 교체된 시점. 픽스처 5 의 Console 출력 대신 Sentry 대시보드 이벤트 1건 확인으로 치환.
- **Suspense Query 도입 시** — React Query `useSuspenseQuery` / `useSuspenseInfiniteQuery` 로 데이터 fetch 를 Suspense 로 끌어올리는 시점. 기존 ErrorBoundary 경로에 `NetworkError` 분기가 자동 매칭되는지 재검증.
- **`react-error-boundary` 도입 시** — 자체 구현 `ErrorBoundary` 를 라이브러리로 교체한다면 `onReset` 콜백 / `FallbackComponent` prop 구조 변경 → 5 픽스처 재수행.

## 회귀 시나리오 (spec §7.2, REQ-037 FR-04)

본 체크리스트를 **재수행** 해야 하는 트리거:

1. **`src/App.jsx:92` 최상위 Suspense fallback 변경** — `<Skeleton variant="page" />` → 다른 컴포넌트 / variant 변경.
2. **`src/App.jsx:96-119` 3 라우트 `ErrorBoundary` 래핑 변경** — 라우트 추가 / 삭제 / 그룹핑 / `fallback` / `onError` prop 변경.
3. **`src/common/ErrorBoundary.jsx` / `Skeleton.jsx` / `ErrorFallback.jsx` 구현 변경** — props / state / 메서드 / 접근성 속성 변경.
4. **React 18 → 19 bump (REQ-012)** — StrictMode effect 더블 invocation 영향, 새 `onError` 시그니처 / ErrorBoundary API 변경 여부.
5. **`react-router-dom` bump** — lazy 라우트 + Suspense 상호작용 / 전환 애니메이션 / `errorElement` 도입(v6.4+) 가능성.
6. **`src/common/errorReporter.js` 변경** — `reportError` 시그니처 / prefix / Sentry wiring.
7. **브라우저 정책 변경** — Chrome `dev-only` Error stack 포맷 변경, React DevTools "Force throw" UX 변경 등.
8. **자매 체크리스트 `web-vitals-runtime-smoke` / `toaster-visual-smoke` 가 baseline 갱신을 트리거** 하는 `package.json` dependency bump PR — 본 체크리스트도 세션 통합 권장 (운영자 1회로 일괄 처리).

## 다른 픽스처 추가 시 템플릿 확장 방법

향후 `ErrorBoundary` 에 새 기능(예: `NetworkError` 특화 분기, offline 상태 fallback, i18n 메시지) 이 추가되는 경우:

1. §체크리스트 5 픽스처 아래에 **새 픽스처** `### 픽스처 N. <이름>` 추가. (절차 / 기대 동작 / DevTools 확인 / 체크박스) 4 블록 구조 유지.
2. §Baseline 양식의 `결과:` 블록에 해당 픽스처 체크박스 1줄 추가.
3. spec `common/error-boundary-spec.md` §7.2 의 픽스처 열거에 새 항목 1:1 대응 추가 (inspector 영역).
4. 새 픽스처가 `reportError` 호출 경로를 확장한다면 §회귀 시나리오 6 의 대상 파일 목록 갱신.

## Deprecation 조건

- Playwright + `react-error-boundary` e2e 자동화 도입 PR 머지 시 본 문서를 `docs/testing/deprecated/` 로 이동 — 자동화 커버리지 확인 후 inspector 트리거.
- Sentry 연결 시 픽스처 5 의 Console 가시 검증이 Sentry 대시보드 검증으로 완전 치환된다면 §Deprecation 조건 에 해당 라인 추가 후 본 문서 반감기.

## 관련 문서

- SSoT spec (green → blue 승격 예정): `specs/spec/green/common/error-boundary-spec.md` §7.2
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-error-boundary-runtime-smoke-checklist-doc.md` (REQ-20260418-037, FR-01~08 / US-01~05 / NFR-01~06) — 본 문서 직접 기원
  - `specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md` (REQ-20260418-005) — §4 통합 전제
  - `specs/requirements/done/2026/04/18/20260418-errorboundary-test-stderr-suppression.md` (REQ-20260418-007) — §7.1 jsdom stderr 억제
- 도입 태스크: TSK-20260420-02 (본 문서)
- 병렬 태스크: TSK-20260420-01 (`monitor-reporterror-sweep`) — Monitor 도메인 `console.error` → `reportError` 일원화
- 자매 체크리스트 (디렉토리/형식 일관 — NFR-03):
  - `docs/testing/web-vitals-runtime-smoke.md` (TSK-20260418-35)
  - `docs/testing/styles-cascade-visual-smoke.md` (TSK-20260418-23)
  - `docs/testing/toaster-visual-smoke.md` (TSK-20260418-17)
  - `docs/testing/markdown-render-smoke.md` (TSK-20260418-15)
  - `docs/testing/tanstack-query-devtools-smoke.md` (TSK-20260418-22)
  - `docs/testing/log-mutation-runtime-smoke.md`
  - `docs/testing/search-abort-runtime-smoke.md`
- 참조 코드: `src/App.jsx:91-123`, `src/common/ErrorBoundary.jsx`, `src/common/Skeleton.jsx`, `src/common/ErrorFallback.jsx`, `src/common/errorReporter.js`
- 참조 테스트: `src/common/ErrorBoundary.test.jsx` (4/4 PASS), `src/common/Skeleton.test.jsx`, `src/common/ErrorFallback.test.jsx`, `src/App.test.jsx:250` (white-screen regression guard)
- 외부 참고:
  - React Error Boundary 공식 문서: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
  - React Suspense 공식 문서: https://react.dev/reference/react/Suspense
  - `react-error-boundary` (라이브러리 도입 후보, 현 repo 미도입): https://github.com/bvaughn/react-error-boundary
  - ARIA `role=alert`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/alert_role
  - ARIA `role=status`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role
