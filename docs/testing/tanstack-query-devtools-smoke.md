# TanStack Query Devtools 런타임 스모크 체크리스트

> SSoT: `specs/spec/blue/testing/tanstack-query-devtools-smoke-spec.md`
> 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-tanstack-query-devtools-smoke-checklist.md` (REQ-20260418-016, FR-01~08 / NFR-01~04)
> 도입 태스크: TSK-20260418-22
> 자매 문서: `docs/testing/markdown-render-smoke.md`, `docs/testing/styles-cascade-visual-smoke.md`, `docs/testing/toaster-visual-smoke.md` (도입 예정)

## 목적

`@tanstack/react-query-devtools` 는 `import.meta.env.DEV` 분기로 DEV 에서만 렌더되도록 구성되어 있다 (`src/App.jsx` 의 `{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}` 라인). 자동 grep(`grep -l "ReactQueryDevtools\|react-query-devtools" build/assets/*.js`) 은 PROD 번들에 식별자가 남았는지만 확인할 뿐, **실제 브라우저 런타임에서의 DEV 가시 / PROD 미노출 / 콘솔 클린** 까지 방어하지 못한다. jsdom 기반 `npm test` 도 layout / visibility / DevTools Network·Sources 검색을 재현할 수 없다. 본 체크리스트는 **사람의 1회 3분 점검** 으로 Provider 도입 직후 baseline 을 박제하고, Provider 옵션·Devtools 메이저 bump·Vite 빌드 옵션 변경 시 회귀를 조기에 발견하기 위한 표준 절차다 (spec §1). Playwright / Storybook 등 자동 시각 회귀 도입은 별 후보이며, 본 문서는 그 도입 이전의 보완재로 운용한다.

## 적용 대상 변경

다음 중 하나라도 수정한 PR 에서 수행한다 (spec §3.6, FR-06).

- `src/App.jsx` 의 `QueryClient` 기본 옵션(`defaultOptions.queries.staleTime`, `retry` 등) 또는 `<QueryClientProvider>` 마운트 구조 변경.
- `src/App.jsx` 의 `<ReactQueryDevtools initialIsOpen={...} />` 옵션 변경 (`initialIsOpen`, `buttonPosition`, `position` 등) 또는 렌더 가드(`import.meta.env.DEV`) 변경.
- `@tanstack/react-query-devtools` / `@tanstack/react-query` 메이저 bump.
- Vite 빌드 옵션 변경 — `vite.config.js` 의 `define`, `build.rollupOptions`, `mode` 처리 등 `import.meta.env.DEV` 치환 동작에 영향을 주는 변경.

무관한 변경(서버 상태 리팩터, 테스트 헬퍼 도입, 문서 편집 등) 은 수행 대상이 아니다.

## 사전 준비

1. 작업 브랜치 checkout, 변경사항 반영 상태.
2. `npm install` 로 의존성 최신화.
3. 터미널 2 개 준비.
   - 터미널 A: `npm run dev` → 기본 `http://localhost:3000` (실제 URL 은 Vite dev 서버 기동 시 출력되는 값 사용).
   - 터미널 B: `npm run build && npm run preview` → PROD 빌드 후 preview 기동 (기본 `http://localhost:4173`).
4. 브라우저: Chrome 또는 Edge. DevTools 패널 3 종 모두 사용 — Console / Network / Sources.
5. 라우트: `/log` 기준. 진입 후 발행 글 목록이 로드되면서 Query 가 최소 1회 발화하도록 한다.

## 체크리스트 4 항목

각 항목은 (재현 절차 / 기대 / DevTools 확인 / 체크박스) 4 블록으로 구성한다. 체크박스는 `[ ]` 로 초기화된 상태를 템플릿으로 보관하며, 실제 baseline 수행 기록은 §Baseline 기록 섹션에 인라인으로 남긴다.

### 항목 1. DEV 콘솔 클린 (spec §3.2, FR-01)

**재현 절차:**

1. 터미널 A 에서 `npm run dev` 기동.
2. 브라우저로 출력된 로컬 URL (`http://localhost:3000` 등) 진입 → `/log` 이동.
3. DevTools → Console 패널.

**기대:**

- React / Vite / Query 관련 에러 · 경고 0 건 (StrictMode 의도된 이중 호출 경고는 허용 — 실제 애플리케이션 코드에서 발생한 경고만 "regressed" 로 판단).
- Devtools 자체의 정보성 안내 로그는 경고/에러로 취급하지 않는다.

**DevTools 확인:**

- Console 필터를 `Default levels` → `Errors` + `Warnings` 로 제한하고 남는 항목이 있는지 확인.
- 있으면 스택 최상단 프레임을 baseline 기록에 인용 (파일:라인 또는 메시지).

**체크박스:**

- [ ] pass / [ ] regressed (메시지 또는 캡처 링크 병기)

### 항목 2. DEV Devtools 플로팅 버튼 노출 (spec §3.3, FR-02)

**재현 절차:**

1. 터미널 A `npm run dev` 세션 동일.
2. 화면 우측 하단의 React Query 로고(TanStack Query 아이콘) 확인.
3. 로고 클릭 → 패널 확장.

**기대:**

- 초기 상태는 닫힘 (`initialIsOpen={false}` 이므로 로고만 보임).
- 로고 클릭 시 Devtools 패널이 확장되고 쿼리 목록(발화한 Query 가 있으면 그 항목, 없으면 안전한 빈 상태) 이 노출.
- Devtools UI 내부에서의 React 에러 경계 트리거 0 건.

**DevTools 확인:**

- Elements 패널에서 body 하단에 Devtools 컨테이너 DOM (TanStack 내부 컴포넌트 트리) 마운트 여부 확인.
- 로고 위치가 메이저 bump 로 변경되었다면 "Devtools 위젯 노출" 로 일반화해 판정 (spec §7 위험 1).

**체크박스:**

- [ ] 로고 노출 확인
- [ ] 클릭 후 패널 확장 + 에러 0

### 항목 3. PROD 빌드 Devtools 미노출 3중 검증 (spec §3.4, FR-03 / NFR-02)

**재현 절차:**

1. 터미널 B 에서 `npm run build && npm run preview` 기동.
2. 브라우저로 preview URL (`http://localhost:4173` 등) 진입 → `/log` 이동.
3. 아래 3 단계를 순서대로 수행.

**기대:**

- **3-1. 시각**: 화면 어디에도 Devtools 로고·패널이 렌더되지 않음.
- **3-2. Network 탭**: Filter 입력에 `react-query-devtools` → 요청 0 건. PROD 코드 스플리팅 chunk 에 해당 모듈이 포함되지 않아야 한다.
- **3-3. Sources 탭**: `Ctrl/Cmd+Shift+F` (모든 소스 검색) → `react-query-devtools` 검색 → 0 hits. 동일하게 `ReactQueryDevtools` 식별자 검색 → 0 hits.

**DevTools 확인:**

- Network 필터는 초기화 후 페이지 새로고침 → 탭에 검색어 입력.
- Sources 검색은 Disable cache 상태(Network 탭 상단 체크) 에서 수행해 이전 DEV 빌드 캐시와 분리.

**체크박스 (3 포인트):**

- [ ] 3-1. 시각 — 로고/패널 미노출
- [ ] 3-2. Network — `react-query-devtools` 0 hits
- [ ] 3-3. Sources — `react-query-devtools` / `ReactQueryDevtools` 0 hits

### 항목 4. 번들 grep 자동 백업 (spec §3.5, FR-04 / FR-05 / NFR-04)

**재현 절차:**

```bash
npm run build
grep -l "ReactQueryDevtools\|react-query-devtools" build/assets/*.js
```

**기대:**

- stdout 없음.
- exit code `1` (grep "no match" 의 정상 신호).
- 위 1 줄 명령은 CI 통합을 전제로 한 형식 — `.github/workflows/ci.yml` 의 빌드 후 스텝에 `! grep -l "ReactQueryDevtools\|react-query-devtools" build/assets/*.js` 1줄로 삽입 가능 (FR-08, Could; 실제 반영은 별 태스크).

**DevTools 확인:**

- 해당 없음 — 본 항목은 터미널 기반 자동 검증.
- 다만 항목 3 과 결과가 **반드시 일치** 해야 한다. 불일치 시 시각/Network/Sources 3 중 검증 쪽을 신뢰하고 grep 패턴/빌드 산출물 경로를 재점검.

**체크박스:**

- [ ] grep 0 hits 확인 (exit code 1)

## DevTools 확인 필수 원칙 (NFR-02)

- 항목 1~3 **모두** 에 대해 DevTools Console / Elements / Network / Sources 패널 중 최소 1 종의 실측(메시지·클래스명·URL·검색 결과 0) 을 체크박스 옆에 병기한다.
- "눈으로 봤다" 만으로는 통과 불가. `[x]` 남발 방지를 위해 baseline 섹션에 실제 관찰값(스샷 링크 또는 1줄 코멘트) 을 인라인으로 기록한다 (spec §7 위험 3 완화).
- 체크박스 형식 미준수 (`[v]`, `[O]` 등) 지양. 통일해 `[x]` / `[ ]` 만 사용.
- 항목 3 과 항목 4 결과가 어긋나면 Pass 처리 금지. 불일치 사유(소스맵 설정, pre-minify chunk, 빌드 캐시 등) 를 규명한 뒤 재수행.

## 재실행 트리거 (FR-06, spec §3.6)

다음 변경 PR 마다 본 체크리스트를 재수행하고 결과를 `specs/task/done/YYYY/MM/DD/{slug}/result.md` 에 링크로 첨부한다.

- `src/App.jsx` 의 `QueryClient` 기본 옵션 (`staleTime`, `retry`, `refetchOnWindowFocus` 등) 변경.
- `src/App.jsx` 의 `<ReactQueryDevtools ... />` 옵션 변경 또는 렌더 가드 (`import.meta.env.DEV`) 변경.
- `@tanstack/react-query-devtools` 또는 `@tanstack/react-query` 메이저 bump.
- Vite 빌드 옵션 변경 — `vite.config.js` 의 `define`, `build.rollupOptions`, mode 치환 관련 변경.
- 신규 `QueryClientProvider` 중첩(예: 테스트 전용 Provider 와 공유 훅 도입) — `src/test/renderWithQuery` (REQ-013) 도입 시점 포함.

재실행 결과는 PR 의 `result.md` 에 본 문서 링크 + 4 항목 체크 결과를 인라인으로 요약한다.

## Baseline 기록 (FR-07, spec §3.7)

### baseline 양식

```
## Baseline 수행 (tanstack-query-devtools)
- 운영자: <이름/이메일>
- 일자: YYYY-MM-DD
- 커밋 해시: <7자 해시>
- 환경: <OS> / <브라우저 + 버전> / <DEV URL> / <PROD preview URL>
- 결과:
  - [ ] 항목 1. DEV 콘솔 클린
  - [ ] 항목 2. DEV Devtools 플로팅 버튼 노출 (로고 + 클릭 확장 2 포인트)
  - [ ] 항목 3. PROD 미노출 3중 (시각 / Network / Sources)
  - [ ] 항목 4. 번들 grep 자동 백업 (0 hits, exit 1)
- 비고: Console 에 남은 메시지(있을 경우), Network 검색 결과, Sources 검색 결과, grep stdout 요약 기록.
```

### baseline 1회 (2026-04-18, Provider 도입 직후)

본 문서 도입 태스크(TSK-20260418-22) 는 **런타임 코드 변경 0 / 문서 1개 신규** 이며, 자동화된 SDD 파이프라인 환경에서는 브라우저 세션(DevTools Console / Network / Sources) 을 구동할 수 없다. 따라서 항목 1·2·3 은 파이프라인 커밋 시점에 **수동 검증 불가** 로 pending 상태로 출고하고, 운영자(park108) 가 다음 로컬 세션에서 체크박스를 채운다. 항목 4(번들 grep) 는 파이프라인 내에서 자동 수행 가능하여 본 커밋 시점에 baseline 을 확정한다.

```
## Baseline 수행 (tanstack-query-devtools, 1회)
- 운영자: park108 (항목 4 는 파이프라인 자동 수행 / 항목 1~3 은 pending manual session)
- 일자: 2026-04-18
- 커밋 해시: TSK-20260418-22 도입 커밋 (본 문서 신규 추가)
- 환경:
  - DEV: (pending — 운영자 로컬 `npm run dev` 세션에서 수행)
  - PROD preview: (pending — 운영자 로컬 `npm run build && npm run preview` 세션에서 수행)
  - 번들 grep: SDD 파이프라인 실행 호스트 / macOS 14 (darwin 25.3.0) / `build/assets/*.js` 18 개 산출물
- 결과:
  - [ ] 항목 1. DEV 콘솔 클린 — pending manual session
  - [ ] 항목 2. DEV Devtools 플로팅 버튼 노출 — pending manual session
  - [ ] 항목 3. PROD 미노출 3중 (시각 / Network / Sources) — pending manual session
  - [x] 항목 4. 번들 grep 자동 백업
    - 명령: `grep -l "ReactQueryDevtools\|react-query-devtools" build/assets/*.js`
    - stdout: (empty)
    - exit code: 1 (no match, 정상)
- 비고: 본 태스크는 문서 추가만 포함하며 파이프라인 실행 환경에 브라우저 세션이 없어 항목 1~3 은 baseline 미수행 상태로 출고. 운영자 다음 로컬 세션에서 수행하고 결과를 아래 §baseline 2회 슬롯에 채움. 항목 4 는 PROD 번들에 Devtools 식별자가 남지 않았음을 확인 — `src/App.jsx` 의 `import.meta.env.DEV` 가드와 Vite PROD 치환이 의도대로 작동.
```

### baseline 2회 (운영자 로컬 세션, 예약)

```
## Baseline 수행 (tanstack-query-devtools, 2회 — 운영자 로컬 세션)
- 운영자:
- 일자:
- 커밋 해시:
- 환경:
  - DEV URL:
  - PROD preview URL:
  - 브라우저 / 버전:
- 결과:
  - [ ] 항목 1. DEV 콘솔 클린
  - [ ] 항목 2. DEV Devtools 플로팅 버튼 노출
  - [ ] 항목 3. PROD 미노출 3중 (시각 / Network / Sources)
  - [ ] 항목 4. 번들 grep 자동 백업 (재실행 또는 1회 결과 재확인)
- 비고:
```

## CI 통합 후보 (FR-08, Could)

본 태스크에서는 **문서상 제안** 까지만 수록하며, `.github/workflows/ci.yml` 실제 수정은 별 태스크로 분리한다.

**예시 스텝 (미적용, 제안):**

```yaml
- name: Verify Devtools is not in production bundle
  run: |
    npm run build
    # grep exit 0 이면 (match) 실패, 1 이면 (no match) 통과 — 부정 조건 사용.
    ! grep -l "ReactQueryDevtools\|react-query-devtools" build/assets/*.js
```

도입 시 본 문서 §항목 4 상단에 "CI 자동 수행 — 수동 단계 생략 가능" 을 링크와 함께 명시한다 (중복 수행 방지).

## 갱신 규칙 (NFR-02 / NFR-03)

- Provider 또는 Devtools 관련 PR (§재실행 트리거 목록) 에서 본 체크리스트를 함께 갱신한다.
- Devtools 메이저 bump 로 로고 위치/방식이 달라지면 §항목 2 의 "우측 하단" 표현을 "Devtools 위젯 노출" 로 일반화하고 bump 버전/링크를 병기한다 (spec §7 위험 1 완화).
- Vite 빌드 옵션 변경 (`define`, `build.rollupOptions` 등) 으로 `import.meta.env.DEV` 치환 동작이 바뀌면 §항목 4 의 grep 패턴을 재검토하고 필요 시 식별자 후보를 확장한다 (spec §7 위험 4).
- 자매 체크리스트 (`markdown-render-smoke.md`, `styles-cascade-visual-smoke.md`, 도입 예정 `toaster-visual-smoke.md`) 와 디렉토리 / 형식 일관성을 유지한다 (NFR-03). 형식이 갈라지면 먼저 머지된 쪽으로 정렬.
- CI 실 반영 시 §CI 통합 후보 섹션을 "CI 에 반영됨 (링크)" 으로 축약.

## 관련 문서

- SSoT spec: `specs/spec/blue/testing/tanstack-query-devtools-smoke-spec.md`
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-tanstack-query-devtools-smoke-checklist.md` (REQ-20260418-016, FR-01~08, NFR-01~04)
- 원 followup: `specs/followups/consumed/2026/04/18/20260418-0706-tanstack-devtools-runtime-manual-check.md`
- 직전 태스크: `specs/task/done/2026/04/18/20260418-tanstack-query-provider/` (Provider + Devtools 도입, `ee87219`)
- 자매 체크리스트:
  - `docs/testing/markdown-render-smoke.md` (TSK-20260418-15)
  - `docs/testing/styles-cascade-visual-smoke.md` (TSK-20260418-23)
  - `docs/testing/toaster-visual-smoke.md` (TSK-20260418-17, 도입 예정)
- 자매 spec:
  - `specs/spec/blue/testing/markdown-render-smoke-spec.md`
  - `specs/spec/blue/testing/styles-cascade-visual-smoke-spec.md`
  - `specs/spec/blue/testing/toaster-visual-smoke-spec.md`
- 상위 정책 spec: `specs/spec/green/state/server-state-spec.md` §3.1, §3.4
- 외부:
  - TanStack Query v5 Devtools 가이드 — https://tanstack.com/query/v5/docs/framework/react/devtools
  - Vite `import.meta.env` — https://vitejs.dev/guide/env-and-mode.html
