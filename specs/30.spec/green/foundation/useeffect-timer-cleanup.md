# useEffect 본문 setTimeout / setInterval cleanup return 불변식

> **위치**: `src/**/*.{jsx,tsx,js,ts}` 중 `useEffect` 본문에서 `setTimeout(` 또는 `setInterval(` 을 호출하는 effect 전수. 첫 적용 사례: `src/File/FileUpload.jsx` 의 `useEffect` (`:84-121`, deps `[isUploading, refreshFiles]`). 예외 박제 위치: effect 직전 또는 callback 본문 첫 줄 `// retain on unmount: <근거>` 주석 (부재 시 예외 = 빈 집합).
> **관련 요구사항**: REQ-20260422-049
> **최종 업데이트**: 2026-04-22 (by inspector, 신규 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=`57f343f`).

## 역할

`src/**` 의 컴포넌트 / 훅 이 `useEffect` 본문에서 `setTimeout` 또는 `setInterval` 로 타이머를 등록할 때, 해당 effect 는 **cleanup 함수** (`return () => clearTimeout(...)` 또는 `return () => clearInterval(...)` 또는 등가 `useRef` 매개 해제 구문) 를 반환해야 한다는 **React hooks 라이프사이클 자원 회수 계약** 시스템 불변식을 박제한다. unmount · deps 변경에 따른 effect 재실행 시 잔존 타이머가 해제되지 않으면 stale setState 경로 · 메모리 누수 · 테스트 teardown race 경로가 구조적으로 형성되며, 본 불변식은 이를 코드 레벨에서 차단하여 React StrictMode (effect 2회 실행) 및 Vitest 결정성 축 (`foundation/coverage-determinism.md` FR-02 (d)) 과 정합을 이룬다.

의도적으로 하지 않는 것: `useEffect` 밖 (컴포넌트 body, event handler, async 핸들러) 의 `setTimeout` (예: `src/File/FileItem.jsx:29` async handler 내부 `setTimeout(refreshFiles, refreshTimeout)` 는 본 spec 관할 밖), `window.addEventListener` / `document.addEventListener` cleanup (이미 관습적으로 정합, 본 spec 범위 밖이며 자매 축), `requestAnimationFrame` / `requestIdleCallback` 자원 (원리 유사이나 본 spec 은 `setTimeout` · `setInterval` 2종 한정), 테스트 파일 (`*.test.{js,jsx,ts,tsx}`) 내 `setTimeout` (테스트 이디엄 축 — `common/test-idioms.md` 관할), cleanup 기법 선정 (`useRef` vs 지역 `const timer` vs `AbortController` 등 수단 중립 — FR-04).

## 공개 인터페이스

- 소비 파일 / 엔트리:
  - `src/**/*.{jsx,tsx,js,ts}` — `useEffect` 본문에서 `setTimeout(` 또는 `setInterval(` 를 호출하는 파일 전수.
  - React `useEffect` / `useRef` hook — cleanup return 계약의 런타임 근거.
- 관찰 계약 (외부 호출자 관점):
  - `useEffect` callback 본문에서 `setTimeout(` 또는 `setInterval(` 가 호출되면, 해당 callback 은 cleanup 함수를 return 한다. cleanup 함수 본문은 동일 effect 등록 시점의 타이머 ID 를 `clearTimeout` 또는 `clearInterval` 로 해제한다.

## 동작

### 1. FR-01 — 등록 ↔ cleanup return 박제 불변식

`src/**/*.{jsx,tsx,js,ts}` 내 모든 `useEffect(() => { ... }, deps)` 의 effect callback 본문에서 `setTimeout(` 또는 `setInterval(` 를 **조건 분기 없이** 호출하는 경우, 해당 effect callback 은 cleanup 함수 (`() => clearTimeout(<id>)` 또는 `() => clearInterval(<id>)`) 를 **return** 한다. 타이머가 조건 분기 내부에 등록되는 경우 cleanup 은 다음 두 형태 중 최소 하나로 동일 분기의 타이머 ID 를 해제한다:

- **형태 A (동일 분기 early-return)**: `if (cond) { const id = setTimeout(...); return () => clearTimeout(id); }` — 조건 분기 내부에서 등록 · return · cleanup 을 동일 scope 에 박제.
- **형태 B (`useRef` 매개 공통 cleanup)**: `useRef` 로 타이머 참조를 외부에 보관하여 effect 본문 끝에서 공통 return (`return () => { if (ref.current) clearTimeout(ref.current); }`) — deps 변경에 따른 effect 재실행 시 이전 타이머 소거까지 포함.

어느 형태이든 등록된 타이머 ID 와 `clearTimeout` / `clearInterval` 인자가 **동일 effect scope 에서 참조 추적 가능** 해야 한다. 추적 불가한 경우 (예: 외부 전역 · 타 effect 에서 등록된 타이머에 대한 `clearTimeout` 은 본 불변식 충족으로 간주하지 않음) 본 FR-01 위반이다.

### 2. FR-02 — 첫 적용 사례 (`src/File/FileUpload.jsx:84-121`)

`src/File/FileUpload.jsx:84-121` 의 `useEffect` (deps `[isUploading, refreshFiles]`) 는 두 분기 (`"COMPLETE" === isUploading` 및 `else` 분기) 에서 `setTimeout(function() { setIsUploading("READY"); refreshFiles(); }, REFRESH_TIMEOUT)` 호출 각 1 건, 총 2 건에 대해 FR-01 을 충족한다. 수단 선정은 중립 — 이웃 `src/File/FileDrop.jsx:80-88` 형태 (`const timer = setTimeout(...); return () => clearTimeout(timer);`), `src/Toaster/Toaster.jsx:37-59` 형태 (`timerRef = useRef; timerRef.current = setTimeout(...); return () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };`), 또는 기타 등가 구조 허용. 본 spec 은 "기본값"/"권장"/"우선"/"default" 라벨을 부여하지 않는다 (FR-04 재확인).

### 3. FR-03 — `retain on unmount` 예외 주석 계약 (Should)

effect callback 이 등록하는 타이머가 **컴포넌트 수명 전체** 에 걸쳐 해제되지 않아야 하는 의도 (예: 폴링 중단이 비즈니스적으로 잘못된 경우) 인 경우, 해당 effect 직전 (또는 callback 본문 첫 줄) 에 `// retain on unmount: <근거 한 줄>` 형태 주석을 박제한다. 주석 없으면 예외 불인정 (FR-01 위반). 주석 박제 시 해당 effect 는 본 spec §수용 기준 NFR-01 gate 집합에서 제외된다. 예외 0 을 목표하되 근거 박제 시 존속 허용.

### 4. FR-04 — 수단 중립성 (Should)

FR-01 충족 기법의 "기본값"/"권장"/"우선"/"default" 라벨 부여를 금지한다 (inspector · planner · developer 승격 시점 전수에서 동일 중립성 유지). `useRef` 매개, 지역 `const timer`, `AbortController` 파생, 기타 등가 기법 중 어느 것도 본 spec 본문 / §수용 기준 / §변경 이력 에 "권장 형태" 로 명시되지 않는다. 본 spec 은 **결과 (cleanup return 존재 및 타이머 ID 해제)** 만 박제하며, 기법 선정은 task 계층 또는 개별 PR 의 설계 판단에 위임한다.

### 5. FR-05 — 재현성 (NFR 축)

본 불변식은 정적 grep · 정규식 · AST 추출만으로 재현 검증 가능하며, 런타임 상태 · 시점 · 특정 릴리스 이벤트에 의존하지 않는다. 적용 수단 (예: `ast-grep`, ESLint `react-hooks/exhaustive-deps` 확장 rule, codemod) 선정은 본 spec 관할 밖이며, 수단 부재 자체는 본 불변식 위반이 아니다. 본 spec 은 **결과 (cleanup return 존재 여부)** 만 박제한다.

### 회귀 중점

- `src/File/FileUpload.jsx:84-121` guard 도입 후 회귀 (cleanup return 제거 또는 `setTimeout` 을 cleanup 없이 재도입) → FR-01/FR-02 위반 재발.
- 신규 컴포넌트에서 `useEffect` 본문에 `setTimeout` · `setInterval` 을 cleanup 없이 추가 → FR-01 위반 확산.
- FR-03 예외 주석 (`// retain on unmount: ...`) 이 실제로 cleanup 으로 흡수 가능 상태인데 잔존 → 예외 최소화 원칙 위반.
- `src/Toaster/Toaster.jsx:37-59`, `src/File/FileDrop.jsx:80-88`, `src/common/useHoverPopup.js:29-70`, `src/Search/Search.jsx:55-65` 의 기존 정합 구현이 리팩터 중 cleanup return 누락으로 퇴행 → FR-01 회귀.
- `foundation/coverage-determinism.md` FR-02 (d) async cleanup 결정론과의 정합 파손 → 양 spec 동시 위반.

## 의존성

- 외부: React (`useEffect`, `useRef`, `<React.StrictMode>` 포함 — `src/index.jsx:10`), Vitest (`vi.useFakeTimers` — 회귀 테스트 수단, 선택적).
- 내부: `src/File/FileUpload.jsx` (첫 적용 사례 위반), `src/File/FileDrop.jsx` (FR-01 충족 비교군), `src/Toaster/Toaster.jsx` (`useRef` 매개 충족 비교군), `src/common/useHoverPopup.js` (이중 cleanup 박제 비교군), `src/Search/Search.jsx` (`setInterval` 충족 비교군), `src/File/FileUpload.test.jsx` (FR-02 회귀 테스트 대상).
- 역의존:
  - `foundation/coverage-determinism.md` FR-02 (d) — async cleanup 결정론. 본 spec 의 FR-01/FR-02 가 선행 충족되면 해당 축과 상호 정합.
  - `foundation/regression-gate.md` FR-01 — `npm test` 진입점 지속성. 본 spec FR-02 회귀 테스트가 게이트에 포함됨.
  - `components/file.md` — `FileUpload` / `FileDrop` 책임 분할 본문. 본 spec 첫 적용 사례가 해당 컴포넌트 범위.
  - `components/toaster.md` §불변식 — 타이머 경합 없음 계약 (Toaster 국소). 본 spec 은 이를 `src/**` 일반 계약으로 확장한 자매 축.
  - `common/router-redirect-reentry-guard.md` (REQ-048) — useEffect 재진입 guard 축. 본 spec 은 useEffect 자원 정리 축 자매 (차원 직교 — 전자 = 재진입 차단, 본 spec = 자원 회수).

## 스코프 규칙

- **expansion**: 불허. 본 spec 불변식 적용 범위는 `src/**/*.{jsx,tsx,js,ts}` 의 `useEffect` 본문 `setTimeout` / `setInterval` 2종 한정. 신규 자원 (예: `requestAnimationFrame`, `requestIdleCallback`, `MutationObserver`) 은 별 req 로 본 불변식 확장 또는 별 spec 으로 박제. 테스트 파일 내 `setTimeout` 은 `common/test-idioms.md` 관할로 본 spec 범위 밖.
- **grep-baseline** (inspector 발행 시점, HEAD=`57f343f` 실측):
  - (a) `grep -rnE "setTimeout\s*\(|setInterval\s*\(" src --include="*.jsx" --include="*.js" --include="*.tsx" --include="*.ts"` (테스트 파일 제외) → 8 hits in 6 files:
    - `src/Toaster/Toaster.jsx:44` — `timerRef.current = setTimeout(props.completed, duration);` (FR-01 충족 — `useRef` 매개 cleanup).
    - `src/Toaster/Toaster.jsx:47` — `timerRef.current = setTimeout(() => { ... }, 1000);` (FR-01 충족 — 동일 `useRef` 매개 cleanup).
    - `src/File/FileUpload.jsx:101` — `setTimeout(function() { setIsUploading("READY"); refreshFiles(); }, REFRESH_TIMEOUT);` (**FR-01/FR-02 위반 — cleanup return 부재**).
    - `src/File/FileUpload.jsx:115` — 동일 effect 본문 `else` 분기, cleanup 부재 (**FR-01/FR-02 위반**).
    - `src/File/FileDrop.jsx:82` — `const timer = setTimeout(() => { ... }, REFRESH_TIMEOUT); return () => clearTimeout(timer);` (FR-01 충족 — 지역 `const timer` 형태).
    - `src/File/FileItem.jsx:29` — async handler 내부 `setTimeout(refreshFiles, refreshTimeout);` (본 spec 범위 밖 — `useEffect` 밖 등록).
    - `src/Search/Search.jsx:60` — `const id = setInterval(...); return () => clearInterval(id);` (FR-01 충족 — `setInterval` 경로).
    - `src/common/useHoverPopup.js:46` — `timerRef.current = setTimeout(() => { ... }, HIDE_DELAY_MS);` (FR-01 충족 — `useRef` 매개 이중 cleanup).
  - (b) `sed -n '84,121p' src/File/FileUpload.jsx` — deps `[isUploading, refreshFiles]` + 본문 `setTimeout(..., REFRESH_TIMEOUT)` 2 건 (line 101-104, 115-118) + effect 본문 끝까지 `return () => ...` 부재 확증. FR-02 위반 상태 박제.
  - (c) `grep -nE "clearTimeout\(|clearInterval\(" src/File/FileUpload.jsx` → 0 hit. FR-01/FR-02 위반 상태 확증.
  - (d) `grep -nE "retain on unmount" src` → 0 hit. FR-03 예외 주석 = 빈 집합 baseline.
  - (e) `sed -n '80,90p' src/File/FileDrop.jsx` — `const timer = setTimeout(() => { setIsUploading("READY"); refreshFiles(); }, REFRESH_TIMEOUT); return () => clearTimeout(timer);` 확증 (FR-01 충족 비교군 패턴 기 존재 — 이관 난이도 낮음).
  - (f) `sed -n '37,60p' src/Toaster/Toaster.jsx` — `timerRef = useRef; timerRef.current = setTimeout(...); return () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };` 확증 (FR-01 충족 비교군 패턴 기 존재).
  - (g) `sed -n '25,72p' src/common/useHoverPopup.js` — `useRef` 매개 + effect cleanup + 추가 언마운트 전용 effect 의 이중 cleanup 확증 (FR-01 충족 비교군 심화 사례 — deps 변경 재실행 안전성).
  - (h) `sed -n '55,65p' src/Search/Search.jsx` — `const id = setInterval(...); return () => clearInterval(id);` 확증 (`setInterval` 경로 FR-01 충족 비교군).
- **rationale**: gate (a) 는 `useEffect` 본문 `setTimeout`/`setInterval` 등록 지점 전수 열거 → 본 spec 의 unit-of-detection 후보 집합 확정 (6 파일 / 8 hits). 이 중 1 개 파일 (FileUpload.jsx) 의 2 건이 FR-01/FR-02 위반 상태로 박제된다. gate (b)(c) 는 FR-02 위반 상태 (cleanup return 부재 + clearTimeout 부재) 박제. gate (d) 는 FR-03 예외 주석 baseline = 빈 집합. gate (e)(f)(g)(h) 는 동일 코드베이스 내 FR-01 충족 비교군이 이미 3 개 기법 (지역 `const timer` / `useRef` 매개 / `useRef` 매개 + 별도 언마운트 effect / `setInterval` 경로) 으로 정합 상태임을 박제 — **수단 중립성 (FR-04) 이 코드베이스에 이미 실재 증명** 되어 본 spec 이 특정 기법을 권장하지 않아도 task 계층이 3 개 기법 중 의미 등가 선택 가능. 후속 task (planner 관할) 는 expansion 불허로 carve 예상이며, 수정 파일은 `src/File/FileUpload.jsx`, `src/File/FileUpload.test.jsx` 한정.

## 테스트 현황

- [ ] (a)(b)(c) FR-01/FR-02 첫 적용 사례 (`src/File/FileUpload.jsx:84-121` cleanup return 도입) 미충족 — 후속 task 완료 전까지 위반 상태.
- [ ] FR-02 회귀 테스트 (`src/File/FileUpload.test.jsx` 에 `vi.useFakeTimers()` + unmount 후 `advanceTimersByTime(REFRESH_TIMEOUT + 1)` + setState 호출 수 0 검증 케이스) 추가 대기.
- [x] (d) FR-03 예외 주석 현황 = 빈 집합 (`grep -nE "retain on unmount" src` → 0 hit) baseline.
- [x] (e) FR-01 충족 비교군 `src/File/FileDrop.jsx:80-88` (지역 `const timer` 형태) 확증.
- [x] (f) FR-01 충족 비교군 `src/Toaster/Toaster.jsx:37-59` (`useRef` 매개 형태) 확증.
- [x] (g) FR-01 충족 비교군 `src/common/useHoverPopup.js:29-70` (`useRef` 매개 + 별도 언마운트 effect 이중 cleanup 형태) 확증.
- [x] (h) FR-01 충족 비교군 `src/Search/Search.jsx:55-65` (`setInterval` + `clearInterval` 경로) 확증.
- [x] `foundation/coverage-determinism.md` FR-02 (d) async cleanup 결정론과 상호 정합 — 본 spec FR-01 충족이 해당 축 동시 충족 경로.

## 수용 기준

- [ ] (Must, FR-01) `grep -rnE "useEffect\s*\(" src --include="*.jsx" --include="*.js" --include="*.tsx" --include="*.ts"` 로 열거된 effect block 집합 중 본문에서 `setTimeout(` 또는 `setInterval(` 를 호출하는 effect block 집합 K 개에 대해, 각 block 이 cleanup return (`return () => clearTimeout(...)` 또는 `return () => clearInterval(...)` 또는 `useRef` 매개 공통 cleanup 구조) 를 포함하거나 FR-03 예외 주석 (`// retain on unmount: ...`) 을 갖는다. 매치율 100%.
- [ ] (Must, FR-02) `src/File/FileUpload.jsx:84-121` 의 useEffect 는 `setTimeout` 호출 2 건 (line 101-104, 115-118) 모두에 대해 FR-01 을 충족한다.
- [ ] (Must, FR-02) `grep -nE "clearTimeout\(" src/File/FileUpload.jsx` → 최소 1 hit (cleanup 본문 증빙).
- [ ] (Must, FR-02) `grep -nE "return\s*\(\s*\)\s*=>" src/File/FileUpload.jsx` 또는 `return\s+\(\s*\)\s*=>\s*\{[^{}]*?clearTimeout` → 매치 발생 (cleanup 반환 증빙).
- [ ] (Must, FR-02) `src/File/FileUpload.test.jsx` 의 신규 회귀 케이스 (`vi.useFakeTimers` + unmount 후 `advanceTimersByTime(REFRESH_TIMEOUT + 1)` + setState 호출 수 0 검증) PASS. `npx vitest run --no-coverage src/File/FileUpload.test.jsx` 단독 실행 시 기존 assert 동일 + 신규 케이스 PASS.
- [ ] (Must, NFR) `npm test` 전체 실행 시 기존 assert 결과 동일 + 4축 coverage threshold (`foundation/regression-gate.md` / `foundation/coverage-determinism.md` 기준) 충족. cleanup 경로 추가로 branches 커버 요건 변화 시 테스트 보강.
- [ ] (Should, FR-03) 예외 목록은 effect 직전 또는 callback 본문 첫 줄 `// retain on unmount: <근거>` 주석으로 박제. 본 spec 발행 시점 예외 = 빈 집합 (`grep -nE "retain on unmount" src` → 0 hit).
- [ ] (Should, FR-04) 본 spec 본문 / §수용 기준 / §변경 이력 / 후속 task 본문에 "기본값"/"권장"/"우선"/"default" 등 특정 기법 선호 라벨 0 건. `useRef` vs 지역 `const timer` vs `AbortController` 등 어느 것도 "권장 형태" 로 명시되지 않는다.
- [ ] (Must, 재현성 FR-05) 동일 HEAD · 동일 Node 환경에서 FR-01 grep 게이트 결과 결정론적 (`grep -rnE` 재실행 결과 동일).
- [ ] (Must, 스코프) 후속 task 수정 대상은 `src/File/FileUpload.jsx` + `src/File/FileUpload.test.jsx` 한정. `src/File/FileDrop.jsx`, `src/File/FileItem.jsx`, `src/Toaster/Toaster.jsx`, `src/common/useHoverPopup.js`, `src/Search/Search.jsx`, `package.json`, `.github/workflows/**`, `.husky/**` 변경 0.
- [ ] (Must, 경계 보존) `src/File/FileItem.jsx:29` (async handler 내부 `setTimeout`) 은 본 spec 범위 밖으로 변경 없이 유지. 본 spec 후속 task 수행 후에도 해당 파일의 grep 게이트 매치 결과 불변.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-22 | inspector / HEAD=57f343f | 최초 등록 (REQ-20260422-049 흡수). `src/**/*.{jsx,tsx,js,ts}` 내 `useEffect` 본문 `setTimeout` / `setInterval` 등록 effect 는 cleanup 함수 (`return () => clearTimeout(...)` / `return () => clearInterval(...)` / `useRef` 매개 등가) 를 반환해야 한다는 React hooks 라이프사이클 자원 회수 계약 시스템 불변식 박제. 첫 적용 사례 = `src/File/FileUpload.jsx:84-121` (deps `[isUploading, refreshFiles]` + 본문 `setTimeout(...)` 2 건 + cleanup return 부재). 비교군 3 기법 (지역 `const timer` / `useRef` 매개 / `useRef` 매개 + 별도 언마운트 effect) + `setInterval` 경로 1 기법이 동일 코드베이스에 이미 정합 상태로 실재하여 수단 중립성 (FR-04) 증명. baseline 실측 (HEAD=57f343f): (a) 8 hits in 6 files (2 위반 / 6 충족 / 1 범위 밖), (b)(c) FileUpload.jsx 위반 상태 (cleanup return 부재 + `clearTimeout` 0 hit), (d) `retain on unmount` 예외 주석 0 hit (빈 집합), (e)(f)(g)(h) 비교군 4 패턴 확증. RULE-07 자기검증: FR-01~05 전원 평서형 · 반복 검증 가능 · 시점 비의존 — 첫 적용 사례 (FileUpload.jsx:84-121) 는 "불변식 적용 경계의 증거 박제" 로 본문 기재하되 계약 범위는 임의 `useEffect` 본문 `setTimeout` / `setInterval` 등록에 재적용. 특정 incident · 릴리스 · 날짜 귀속 문구 부재 — `coverage-determinism.md` FR-02 (d) 와의 관계는 "자매 축 정합" 으로만 언급. 1회성 진단/incident patch 플랜 부재. RULE-06: grep-baseline 8 gate 실측 수치 + `파일:라인` 박제 (6 파일 8 hits). RULE-01: inspector writer 영역만 (green/foundation 신규 + 20.req → 60.done/req mv). `src/**`, `package.json`, `.husky/**`, `docs/**` 편집 부재. | 신규 전 섹션 |

## 참고

- **REQ 원문 (완료 이동)**: `specs/60.done/2026/04/22/req/20260422-useeffect-setTimeout-cleanup-invariant.md`.
- **관련 spec**:
  - `specs/30.spec/blue/foundation/coverage-determinism.md` FR-02 (d) — async cleanup 결정론 축. 본 spec FR-01 충족 경로가 해당 축 동시 충족.
  - `specs/30.spec/blue/foundation/regression-gate.md` FR-01 — `npm test` 진입점 지속성 축. 본 spec FR-02 회귀 테스트가 게이트에 포함.
  - `specs/30.spec/blue/components/file.md` — `FileUpload` / `FileDrop` 책임 분할. 첫 적용 사례가 해당 컴포넌트 범위.
  - `specs/30.spec/blue/components/toaster.md` §불변식 — 타이머 경합 없음 계약 (Toaster 국소). 본 spec 은 이를 `src/**` 일반 계약으로 확장한 자매 축.
  - `specs/30.spec/green/common/router-redirect-reentry-guard.md` (REQ-048) — `useEffect` 재진입 guard 축 자매 (차원 직교 — 전자 = 재진입 차단, 본 spec = 자원 회수).
- **비교군 소스** (FR-04 수단 중립성 실재 증명):
  - `src/File/FileDrop.jsx:80-88` — 지역 `const timer` 형태 충족.
  - `src/Toaster/Toaster.jsx:37-59` — `useRef` 매개 형태 충족.
  - `src/common/useHoverPopup.js:29-70` — `useRef` 매개 + 별도 언마운트 effect 이중 cleanup 형태 충족.
  - `src/Search/Search.jsx:55-65` — `setInterval` + `clearInterval` 경로 충족.
- **위반 소스**:
  - `src/File/FileUpload.jsx:84-121` — 첫 적용 사례, 위반 상태 (cleanup return 부재 2 건).
- **범위 밖** (본 spec 경계 보존):
  - `src/File/FileItem.jsx:29` — async handler 내부 `setTimeout`, `useEffect` 밖 등록 → 본 spec 관할 밖. 후속 task 수행 후에도 변경 없이 유지.
- **선행 done req**:
  - `specs/60.done/2026/04/21/req/20260421-test-idioms-spec-consolidation.md` (REQ-038) — 테스트 afterEach cleanup 축 (테스트 관점). 본 spec 과 관점 상호보완 (테스트 ↔ 런타임 축).
- **외부 출처** (REQ 참조):
  - [React 공식 문서 — Synchronizing with Effects, How to handle the Effect firing twice in development](https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development) — `useEffect` cleanup 계약 정식 문서화 + React StrictMode 2회 실행 시 cleanup 미반환 타이머 중복 등록 문제.
- **RULE 준수**:
  - RULE-07: FR-01~05 는 평서형 불변식 (정적 grep · AST 추출로 재현 검증 가능, 특정 릴리스 · incident 귀속 부재). `src/File/FileUpload.jsx:84-121` 위반은 "첫 적용 사례" 로 본문 기재하되 계약 범위는 임의 `useEffect` 본문 `setTimeout` / `setInterval` 등록에 재적용. 비교군 소스 열거는 "수단 중립성 실재 증명" 목적으로 박제.
  - RULE-06: §스코프 규칙 grep-baseline 8 gate 실측 수치 + `파일:라인` 박제 (6 파일 8 hits: 2 위반 / 6 충족 / 1 범위 밖).
  - RULE-01: inspector writer 영역만 (green/foundation 신규 + 20.req → 60.done/req mv). `src/**`, `package.json`, `.husky/**`, `docs/**` 편집 부재.
  - RULE-02: 세션 diff 는 `30.spec/green/foundation/useeffect-timer-cleanup.md` 신설 + `20.req/*` → `60.done/2026/04/22/req/` mv + `.inspector-seen` 갱신 한정.
