# 명세: React 렌더 패턴 — JSX-in-state anti-pattern 제거

> **위치**: `src/Log/LogSingle.jsx`, `src/Log/LogList.jsx`, `src/Log/Writer.jsx`, `src/Search/Search.jsx`, `src/File/File.jsx`, `src/Image/ImageSelector.jsx` 등 JSX 를 `useState` 에 저장하는 컴포넌트 전반
> **유형**: Component rendering pattern / code hygiene
> **최종 업데이트**: 2026-04-19 (by inspector, WIP — REQ-20260419-024 초안)
> **상태**: Active (패턴 정리 단계)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/19/20260419-jsx-in-state-antipattern-sweep-remaining-components.md` (REQ-20260419-024, 잔존 6개소 일괄 제거)
> - `specs/requirements/done/2026/04/19/20260419-filedrop-dropzonetext-derived-from-state.md` (동일 패턴 선례 — FileDrop `dropzoneText`)
> - `specs/requirements/done/2026/04/19/20260419-fileitem-setitemclass-declarative-refactor.md` (동일 패턴 가족 — className state → 선언적 파생)
> - `specs/requirements/ready/20260419-logitem-setitemclass-declarative-refactor.md` (REQ-20260419-019, Log 도메인 className state 마감 — 가족 패턴)

> 본 문서는 "JSX element 를 `useState` 로 저장하지 않는다" 는 React 렌더링 SSoT.
> className 등 **primitive 값을 state 로 저장하는 패턴**(명령형 `setItemClass`)은 `styles/css-modules-spec.md` §10 시리즈에서 관리하며, 본 spec 은 **JSX element 자체를 state 에 담는 패턴**을 대상으로 한다. 두 패턴은 같은 가족이나 대체 전술(파생 변수 / `useMemo` / 조건부 렌더)이 서로 다르므로 SSoT 분리.

---

## 1. 역할 (Role & Responsibility)

React 공식 권고 "Don't put JSX in state" (docs.react.dev) 의 프로젝트 단일 적용 기준점. 렌더 예측성·리콘실리에이션 정합성·`useEffect` 남용 방지를 목적으로, 렌더 시점에 계산 가능한 분기를 **state 밖** 에서 표현하도록 강제.

- 주 책임:
  - JSX 요소를 `useState` 또는 `useRef` 에 저장하는 패턴의 목록 관리 및 마감 추적
  - 각 잔존 사용처의 대체 전술(조건부 렌더 / 파생 변수 / `useMemo`) 명시
  - 패턴 재발 차단 grep 규칙 명시 (NFR-01)
- 의도적으로 하지 않는 것:
  - 컴포넌트별 구현 디테일 — 각 컴포넌트의 렌더 변경은 태스크 분할에서 처리
  - className state 패턴 — `styles/css-modules-spec.md` §10 시리즈 소관
  - 서버 상태 관리 — `state/server-state-spec.md` 소관 (TanStack Query)
  - 전역 클라이언트 상태 — 별 spec

> 관련 요구사항: REQ-20260419-024 §3 (Goals)

---

## 2. 현재 상태 (As-Is)

### 2.1 잔존 사용처 (2026-04-19, REQ-20260419-024 §2 관측)

| 위치 | state 이름 | 분기 조건 | 현재 구현 | 목표 전술 |
|------|------------|-----------|-----------|-----------|
| `src/Log/LogSingle.jsx:21` | `logItem` | `itemLoadingStatus` (NOT_FOUND / FOUND / DELETED) | `setLogItem(<...>)` + `useEffect` | 렌더 본문 조건부 (`{status === 'FOUND' && <LogItem .../>}`) |
| `src/Log/LogSingle.jsx:22` | `toListButton` | `isLoading` / `queryString.get("search")` | `setToListButton(<...>)` + `useEffect` | 렌더 본문 인라인 조건부 |
| `src/Log/LogList.jsx:18` | `seeMoreButton` | `lastTimestamp && !isLoading` | `setSeeMoreButton(<...>)` + `useEffect` | 파생 변수 또는 인라인 조건부 |
| `src/Search/Search.jsx:17` | `toListButton` | mount-time | `useEffect([])` 내 `setToListButton(<...>)` + `navigate` 클로저 | 렌더 본문 인라인 (`useNavigate()` 는 이미 최상위 호출) |
| `src/File/File.jsx:22` | `fileUploadUI` | `isMobile()` | `setFileUploadUI(<...>)` + `useEffect` | `useMemo(() => isMobile(), [])` + 삼항 인라인 렌더 |
| `src/File/File.jsx:23` | `seeMoreButton` | `lastTimestamp` | `setSeeMoreButton(<...>)` + `useEffect` | 파생 변수 또는 인라인 조건부 |
| `src/Log/Writer.jsx:27` | `changeHistory` | `historyData` truthy | `setChangeHistory(<...>)` + `useEffect` | `{historyData && <div>...</div>}` 인라인 |
| `src/Image/ImageSelector.jsx:20` | `seeMoreButton` | `lastTimestamp` | `setSeeMoreButton(<...>)` + `useEffect` | 파생 변수 (선택 포함 — REQ-024 §3.2 Out-of-Scope ambiguous) |

### 2.2 이미 마감된 선례

- `src/File/FileDrop.jsx` `dropzoneText` — `useState(<span>...</span>)` + 4분기 `useEffect` → `useMemo([isUploading])` 파생 (`specs/requirements/done/2026/04/19/20260419-filedrop-dropzonetext-derived-from-state.md`).
- `src/File/FileItem.jsx` `itemClass` — className state → 선언적 `className` + `data-deleting` (가족 패턴, `styles/css-modules-spec.md` §10.7).
- `src/Log/LogItem.jsx` `itemClass` — className state → 선언적 (REQ-20260419-019 진행 중, §10.9).

## 3. 도입 정책 (To-Be)

> 관련 요구사항: REQ-20260419-024

### 3.1 금지 패턴 (Hard Rule)

- `useState(<jsxElement>)` 또는 `useState()` 초깃값 후 `setX(<jsxElement>)` 호출을 통한 JSX 저장 금지.
- JSX element 를 담기 위한 목적만의 `useEffect` (렌더 본문 대체용 분기 세팅) 금지.
- 예외: memoization 이 실제로 필요한 고비용 트리 (현재 코드베이스 0건) 는 `useMemo` 로 전환, 단 동일 가능성 검토 필요.

### 3.2 권장 대체 전술 (선호 순)

1. **인라인 조건부 렌더**: `{condition && <Comp />}` / `{condition ? <A /> : <B />}` — 분기가 1~2 개이고 재사용 없으면 최우선.
2. **렌더 본문 변수**: `const seeMoreButton = lastTimestamp && !isLoading ? <button .../> : null;` — 이후 JSX 에서 `{seeMoreButton}` 로 참조. 동일 JSX 를 여러 곳에서 사용할 때.
3. **`useMemo`**: 계산이 실제로 비용이 있거나(거의 없음) 참조 동등성이 의미 있을 때만 사용. 기본 선택지 아님.
4. **자식 컴포넌트 추출**: 분기 갯수 ≥ 3 또는 분기 내 로직이 커질 때 별 컴포넌트로 분리.

### 3.3 `useEffect` 제거 연동

JSX 세팅 전용 `useEffect` 블록(의존성이 분기 조건과 동일하고 본문이 `setX(<...>)` 뿐) 은 본 spec 정책 이행 시 **동시 제거**. 남은 `useEffect` 는 서버 상태(`state/server-state-spec.md`) / DOM 부수효과 / 타이머 등 본연의 용도만 유지.

### 3.4 `isMobile()` 타이밍 가정 (File.jsx)

- 현재 `File.jsx` 의 `isMobile()` 은 mount 시점 `useEffect([])` 에서 1회 평가된다 (브라우저 UA 기반, 런타임 중 변경 드묾).
- To-Be 전술 A: `const isMobileEnv = useMemo(() => isMobile(), []);` — 컴포넌트 수명 동안 stable, render commit 동기 반영.
- To-Be 전술 B: 모듈 스코프 상수(`const isMobileEnv = isMobile();`) — 모듈 평가 시 1회. File 외 다른 모듈과 공유 시 선호.
- 선택은 태스크 분할 시 결정 (REQ-024 §13 미결). 기본 A 권장.

### 3.5 grep 회귀 차단 (NFR-01)

- `grep -n "setSeeMoreButton\|setToListButton\|setFileUploadUI\|setChangeHistory\|setLogItem" src/` → **0건** (REQ-024 §10 수용 기준).
- 신규 PR 에서 동일 패턴 재도입 감지용. `.eslintrc` 규칙으로 승격은 별 후보 (미결).

## 4. 의존성

### 4.1 상류 의존
- 없음. React 렌더 표준 규약에 준거하며 외부 패키지 변경 불필요.

### 4.2 하류 영향
- `state/server-state-spec.md` §3.3 — `LogSingle` / `LogList` 마이그레이션과 **동일 파일 편집 충돌 주의**. REQ-20260419-023 (`LogSingle` useLog 소비) 과 REQ-20260419-007 (`LogList` useLogList 소비) 이 인접 PR 로 진행 시 순서 조율 필요 (본 REQ 가 선행하거나 묶어 처리 권장).
- `styles/css-modules-spec.md` §10 시리즈 — className state 가족 패턴과 인접. FileDrop/FileItem/LogItem 의 className state 제거는 별 REQ.

### 4.3 테스트
- 각 컴포넌트의 기존 `*.test.jsx` 100% PASS — 사용자 가시 렌더 동작은 완전 보존(REQ-024 §3.1 제약).
- `renderWithQuery` (§4.3.1 of server-state-spec) 사용 파일은 그대로 유지 — 본 spec 은 테스트 양식 변경 없음.

## 5. 수용 기준 (Acceptance)

### 5.1 REQ-20260419-024 수용 기준 (JSX-in-state 잔존 6개소 일괄 제거)
> 관련 요구사항: REQ-20260419-024 §10

- [ ] `grep -n "setSeeMoreButton\|setToListButton\|setFileUploadUI\|setChangeHistory\|setLogItem" src/` → 0 결과
- [ ] FR-01 `src/Log/LogSingle.jsx` `logItem` state 제거 + `itemLoadingStatus` 기반 인라인 조건부 렌더
- [ ] FR-02 `src/Log/LogSingle.jsx` `toListButton` state 제거 + `isLoading` / `queryString.get("search")` 인라인 조건부
- [ ] FR-03 `src/Log/LogList.jsx` `seeMoreButton` state 제거 + `lastTimestamp && !isLoading` 파생 변수
- [ ] FR-04 `src/Search/Search.jsx` `toListButton` state 제거 + `useEffect([])` 블록 제거 + 렌더 본문 인라인
- [ ] FR-05 `src/File/File.jsx` `fileUploadUI` state 제거 + `isMobile()` 삼항 인라인 (§3.4 전술 A 또는 B)
- [ ] FR-06 `src/File/File.jsx` `seeMoreButton` state 제거 + `lastTimestamp` 파생 변수
- [ ] FR-07 `src/Log/Writer.jsx` `changeHistory` state 제거 + `{historyData && <div>...</div>}` 인라인 (Suspense 래퍼 포함)
- [ ] FR-08 JSX 전용 `useEffect` 블록 ≥ 3 개 제거
- [ ] 각 컴포넌트 테스트 100% PASS — 렌더 결과(표시 조건, 클릭 핸들러, 스타일) 완전 보존 (NFR-02)
- [ ] `npm test` 100% PASS, `npm run lint` 0 warn, `npm run build` PASS
- [ ] (Optional) `src/Image/ImageSelector.jsx:20` `seeMoreButton` 포함 여부 결정 (§13 결정 기록 후 포함 시 FR-03 패턴 재사용)

## 6. 알려진 제약 / 이슈

- `Search.jsx` 의 `toListButton` `useEffect([])` 내 `navigate` 클로저는 `useNavigate()` 가 컴포넌트 최상위에서 호출되므로 렌더 시점 인라인화 시 stale closure 없음 (REQ-024 §8 가정).
- `LogSingle.jsx` 의 `logItem` state 제거는 **REQ-20260419-023 (`useLog` 소비 마이그레이션) 과 동일 파일 편집** — 순서 조율 필수 (§4.2).
- `Writer.jsx` `changeHistory` 는 `historyData` 가 truthy 일 때만 렌더 — `{historyData && ...}` 단순화 가능 (REQ-024 §8 가정).
- ESLint 규칙 승격 (`react/no-jsx-in-state` 류) 은 공식 플러그인 부재 → 별 후보로 따로 관리.

## 7. 미결 (Open Questions)

- `src/Image/ImageSelector.jsx:20` `seeMoreButton` 의 REQ-024 범위 포함 여부 (패턴 동일, 영향도 낮음).
- `isMobile()` 평가 전술 A(`useMemo`) vs B(모듈 스코프 상수) 중 표준 선택 — 기본 A, 태스크 분할 시 확정.

## 8. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-19 | (pending, REQ-20260419-024) | 신규 spec 초안 — JSX-in-state 잔존 6개소 일괄 제거 §1~5, FileDrop/FileItem/LogItem 선례 상호참조 (WIP) | 전체 |

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/19/20260419-jsx-in-state-antipattern-sweep-remaining-components.md`
- 선례 요구사항 (done):
  - `specs/requirements/done/2026/04/19/20260419-filedrop-dropzonetext-derived-from-state.md`
  - `specs/requirements/done/2026/04/19/20260419-fileitem-setitemclass-declarative-refactor.md`
- 가족 패턴 (className state) spec: `specs/spec/green/styles/css-modules-spec.md` §10 시리즈
- 연관 spec: `specs/spec/green/state/server-state-spec.md` §3.3 (동일 파일 편집 충돌 주의)
- 외부: React 공식 문서 — "Don't put JSX in state" (docs.react.dev/learn/choosing-the-state-structure)
