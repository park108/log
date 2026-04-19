# 컴포넌트 명세: Toaster

> **위치**: `src/Toaster/Toaster.jsx`
> **유형**: UI Component (알림 표시)
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-026 분기 커버리지 보강 추가)
> **상태**: Active (TSK-18 으로 className/id/cleanup 정리 완료 / 분기 커버리지 보강 WIP)
> **관련 요구사항**:
> - REQ-20260418-011 (`specs/requirements/done/2026/04/18/20260418-toaster-hide-classname-overwrite-fix.md`) — className 덮어쓰기 / id 취약성 정리 (TSK-18, commit `7f588bf`)
> - REQ-20260418-026 (`specs/requirements/done/2026/04/18/20260418-toaster-duration-completed-branch-coverage.md`) — `duration > 0` + `completed` 분기 테스트 보강, Branches ≥ 90% (WIP, 파일명으로 식별 — 동일 문서 ID 가 env-helper-call-site-sweep REQ 와 충돌하나 내용 다름)
> - 상위 스타일 정책: `specs/requirements/done/2026/04/18/20260417-css-modules-migration.md`

> 본 문서는 Toaster 컴포넌트의 **현재 구현 상태 + 목표 To-Be(WIP)** 를 기술하는 SSoT.

---

## 1. 역할 (Role & Responsibility)
사용자 동작 결과를 화면의 정해진 위치(bottom/center)에 잠깐 떠올리는 알림 UI.

- 주 책임:
  - `show` 카운터가 증가할 때마다 `position` × `type` 조합으로 alert 노출
  - 일정 시간 후 스스로 hide (페이드-아웃 / `display:none` 전환)
  - `role="alert"`, `data-position`, `data-type` 접근성/테스트 hook 제공
- 의도적으로 하지 않는 것:
  - 토스트 큐잉, 다중 동시 표시 — 별 후보
  - aria-live level 설정 등 a11y 강화 — 별 후보 (`role="alert"` 만 유지)
  - 토스트 호출 API 추상화(Provider/Context) — 현 props drilling 유지

## 2. 공개 인터페이스 (Public Interface)

### 2.1 Props / Arguments (현재)
| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `show` | number | Y | - | 카운터. 증가할 때마다 toaster 재표시 |
| `position` | `'bottom'` \| `'center'` | Y | - | 표시 위치 |
| `type` | `'success'` \| `'error'` | Y | - | 시각 종류 |
| `message` | string (or ReactNode) | Y | - | 표시 문구 |

> 관련 요구사항: REQ-20260418-011 FR-06 — **Props 시그니처 유지**, 사용처 변경 0.

### 2.2 이벤트 / 콜백
| 이름 | 시그니처 | 발화 조건 |
|------|----------|-----------|
| (없음) | - | - |

### 2.3 Exports
- default: `Toaster`
- named: (없음)

### 2.4 라우트
- 해당 없음 (공용 UI 조각)

## 3. 내부 상태 (Internal State)

### 3.1 현재 (As-Is)
| 상태 | 타입 | 초기값 | 변경 트리거 |
|------|------|--------|-------------|
| (없음, DOM 직접 조작) | - | - | `document.getElementById(id)` + `el.className = ...` |

- id 는 **함수 본문에서 `crypto.randomUUID()` 호출** 로 매 렌더마다 새로 생성 → `useEffect([show])` 클로저가 캡처
- `useEffect` 안에서 `setTimeout` 으로 `hideToaster(id)` 호출, cleanup 없음

### 3.2 목표 (To-Be, WIP)
> 관련 요구사항: REQ-20260418-011 FR-01~04

- **A. className 보존** (FR-01) — 다음 중 한 가지로 hide 직전 클래스 보존 (planner 결정):
  - (a) `el.classList.add(styles.divToasterHide)` — 기존 클래스 유지, 최소 변경
  - (b) React state `isHidden` 토글 + SHOW_STYLE 배열에 hide 케이스 포함 — React-스러움, 권장 (REQ §3.1)
  - (c) `hideToaster` 가 현재 className 을 인자로 받아 `[hide, position, type].join(' ')` 재구성
- **B. id 안정화** (FR-02) — `crypto.randomUUID()` 제거 후:
  - (a) `useId()` (React 18+) — SSR 호환
  - (b) `useRef(null)` 로 DOM 노드 직접 참조 — `document.getElementById` 완전 제거 권장 (FR-03, REQ §3.1)
- **C. setTimeout cleanup** (FR-04) — `useEffect` 가 타이머 핸들을 cleanup 에서 `clearTimeout`.
- 상태 표 (To-Be):

| 상태 | 타입 | 초기값 | 변경 트리거 |
|------|------|--------|-------------|
| `isHidden` (옵션 B 택1) | boolean | true | `show` 증가 시 false, setTimeout 만료 시 true |
| `ref` (useRef) | DOM node | null | JSX 의 `ref={ref}` 로 마운트 시 바인딩 |

## 4. 의존성 (Dependencies)

### 4.1 내부 의존
- `src/Toaster/Toaster.module.css` — CSS Modules (`_divToasterBottom_<hash>`, `_divToasterCenter_<hash>`, `_divToasterSuccess_<hash>`, `_divToasterError_<hash>`, `_divToasterHide_<hash>`)

### 4.2 외부 의존
- 패키지: `react` (18.x — `useId`/`useRef`/`useEffect` 활용 대상)
- 브라우저 API (현재): `document.getElementById`, `crypto.randomUUID` → 목표에서 **모두 제거** (REQ §3.1 FR-03, NFR-02)

### 4.3 역의존 (사용처, 7개)
> 관련 요구사항: REQ-20260418-011 §8 가정 — 이 사용처 중 Toaster `id` 를 외부에서 참조하는 곳은 없다고 가정 (pre-check grep 필요)

- `src/File/FileUpload.jsx`
- `src/Comment/Comment.jsx`
- `src/Log/Writer.jsx`
- `src/Log/LogList.jsx`
- `src/Log/LogSingle.jsx`
- `src/Image/ImageSelector.jsx`
- `src/Search/SearchInput.jsx`

## 5. 동작 (Behavior)

### 5.1 현재 (As-Is)
1. 렌더 시 `id = crypto.randomUUID()` 로 새 id 생성
2. `show` 변경 시 `useEffect`:
   - 루트 `<div id={id}>` 에 position/type 클래스 적용
   - `setTimeout(() => hideToaster(id), N ms)`
3. `hideToaster(id)`:
   ```js
   const el = document.getElementById(id);
   if (el !== null) el.className = styles.divToasterHide; // ← 기존 클래스 전부 덮어씀
   ```
4. 표시 종료 시점 DOM 의 `class` 속성은 `_divToasterHide_<hash>` **단일 값** — position/type 정보 소실

### 5.2 목표 (To-Be, WIP)
> 관련 요구사항: REQ-20260418-011 US-01~03

1. `useId()` 또는 `useRef()` 로 안정 참조 확보
2. `useEffect([show])` 진입 시:
   - (state 방식) `setIsHidden(false)` → SHOW_STYLE 조합으로 class 계산 → 렌더
   - (ref 방식) `ref.current.classList.add(styles.divToasterShow)` 또는 SHOW_STYLE 배열 적용
3. `timerRef = setTimeout(() => hide(), N ms)` 등록
4. cleanup 함수:
   ```js
   return () => {
     if (timerRef) clearTimeout(timerRef);
   };
   ```
5. hide 동작:
   - (a) `classList.add(styles.divToasterHide)` — position/type 유지
   - (b) state `isHidden=true` → 렌더 시 `[styles.divToasterHide, styles.position, styles.type]` 조합 class 출력
6. 결과 DOM: hide 상태에서도 `class="_divToasterBottom_<hash> _divToasterSuccess_<hash> _divToasterHide_<hash>"` 처럼 position/type **보존**.

### 5.3 에러 / 엣지 케이스
- `show` 가 빠르게 1 → 2 증가: 이전 setTimeout 을 cleanup 이 정리 (FR-04). 새로운 타이머만 활성.
- StrictMode 더블 마운트: cleanup 이 idempotent 하게 동작해 타이머 중복 등록 방지 (REQ §12 위험 4).
- ref 방식에서 unmount 직후 콜백: `timerRef` cleanup 으로 도달 불가 — `setState on unmounted` 경고 0 목표 (NFR-01).

## 6. 데이터 스키마 (Data Shape)
- (없음 — UI 조각, 전달되는 데이터는 Props 테이블 참조)

## 7. 테스트 현황 (Current Coverage)
- 테스트 파일: `src/Toaster/Toaster.test.jsx`
- 현재 커버 시나리오 (11 케이스 PASS, TSK-18 머지 후 기준):
  - [x] bottom + success 렌더
  - [x] bottom + error 렌더
  - [x] center + success 렌더
  - [x] `show` 증가 시 재표시
  - [x] 일정 시간 후 hide 클래스 적용
  - [x] message 문자열 출력
  - [x] hide 후 position / type 클래스 **보존** (TSK-18)
  - [x] `useRef` 안정성 (TSK-18)
  - [x] `show` 전환 시 이전 timer cleanup (TSK-18) — 단, 호출 어서트 없음 (§7.1 신규 보강 대상)
  - [x] `document.getElementById` 호출 0건 grep (TSK-18)
- 커버리지 기준선 (TSK-18 result):
  - `src/Toaster/Toaster.jsx` Lines 92.85% / Branches **72.22%** / 미커버 라인 **47-48** (`duration > 0` 블록의 `setTimeout(props.completed, duration)`)
- 미커버 / 취약 (REQ-20260418-026 대상):
  - [ ] [WIP] `show=1 + duration>0` 경로에서 `setTimeout(props.completed, duration)` 호출 + `completed` spy 1회 호출 어서트 (FR-01, US-01)
  - [ ] [WIP] `show=1 + duration=0` 경로에서 `completed` 호출 0건 어서트 (FR-02, US-02)
  - [ ] [WIP] `show=1 + duration=5000` mount → unmount → timer 해제로 `completed` 미호출 어서트 (FR-03, US-03)
  - [ ] [WIP] Branches ≥ 90% (목표 95%) 로 회복 (FR-04)

> 관련 요구사항: REQ-20260418-011 FR-05, §10 수용 기준 (완료); REQ-20260418-026 FR-01~04, §10 (WIP)

### 7.1 [WIP] REQ-20260418-026 분기 커버리지 보강
> 관련 요구사항: REQ-20260418-026 FR-01~04, US-01~03

TSK-18 (commit `7f588bf`) 이후 커버리지 리포트 기준 `Toaster.jsx` Branches 72.22% 로 낙후. 미커버 경로는 `src/Toaster/Toaster.jsx:42-45` 의 `if (duration > 0) { timerRef.current = setTimeout(props.completed, duration); }` — `show=1` + `duration>0` + `completed` spy 조합 테스트 부재. 본 요구사항은 신규 테스트 ≥3건으로 Branches ≥ 90% (목표 95%) 회복.

**신규 테스트 케이스 (≥3건)**:

1. **A. `duration > 0` + `completed` 호출 (FR-01, US-01)**
   ```js
   it('invokes props.completed exactly once after duration ms', () => {
     vi.useFakeTimers();
     const completed = vi.fn();
     render(<Toaster show={1} position="bottom" type="success" message="x" duration={2000} completed={completed} />);
     vi.advanceTimersByTime(2000);
     expect(completed).toHaveBeenCalledTimes(1);
     vi.advanceTimersByTime(1); // 추가 진행
     expect(completed).toHaveBeenCalledTimes(1); // 재호출 없음
     vi.useRealTimers();
   });
   ```

2. **B. `duration === 0` false 분기 (FR-02, US-02)**
   ```js
   it('never invokes props.completed when duration is 0', () => {
     vi.useFakeTimers();
     const completed = vi.fn();
     render(<Toaster show={1} duration={0} completed={completed} />);
     vi.advanceTimersByTime(60000);
     expect(completed).not.toHaveBeenCalled();
     vi.useRealTimers();
   });
   ```

3. **C. unmount cleanup (FR-03, US-03, Should)**
   ```js
   it('clears timer on unmount so completed is not invoked', () => {
     vi.useFakeTimers();
     const completed = vi.fn();
     const { unmount } = render(<Toaster show={1} duration={5000} completed={completed} />);
     unmount();
     vi.advanceTimersByTime(5000);
     expect(completed).not.toHaveBeenCalled();
     vi.useRealTimers();
   });
   ```

**제약**:
- `src/Toaster/Toaster.jsx` 코드 변경 **0줄** (NFR-04, `git diff src/Toaster/Toaster.jsx` 빈 출력).
- 기존 11 케이스 PASS 유지 (NFR-02).
- fake timer 패턴은 기존 케이스(`clears the previous timeout when show transitions 1 -> 2`) 답습 — flaky 0 (NFR-01).

**측정 명령**: `npm run test -- --coverage` 또는 `vitest --coverage`. `package.json` 의 `test:coverage` 스크립트 추가 여부는 §13 미결 (REQ-026).

**세션 통합 가능성**: 기능 회귀가 아니라 테스트 보강이므로 별건 처리 가능. 커버리지 CI 게이트 도입(별 후보) 이전 선결 권장.

## 8. 비기능 특성 (NFR Status)

| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 신뢰성 | setTimeout cleanup 있음 (TSK-18) | 콘솔 setState-on-unmounted 경고 0 | NFR-01 |
| 유지보수성 | `document.getElementById` 0건 (TSK-18) | `grep "document.getElementById" src/Toaster/` = 0 | NFR-02 |
| 일관성 | `useRef` 안정 (TSK-18) | re-render 간 ref 동일성 유지 | NFR-03 |
| 회귀 안전 | 사용처 7개 / props 시그니처 유지 | props 시그니처 동일, 호출처 변경 0 | NFR-04 |
| 스타일 식별자 | `_divToaster*_<hash>` 형식 | 유지 | REQ §8 제약 |
| 분기 커버리지 (REQ-20260418-026) | 72.22% (미커버 L47-48) | ≥ 90% (목표 95%) | REQ-026 FR-04 |
| 라인 커버리지 | 92.85% | ≥ 98% | REQ-026 §11 |
| 테스트 flaky | N/A | 동일 commit 10회 PASS | REQ-026 NFR-01 |
| Toaster.jsx 코드 변경 (REQ-026) | N/A | 0줄 (테스트 전용) | REQ-026 NFR-04 |

## 9. 알려진 제약 / 이슈
- `hideToaster` 의 `el.className = ...` 패턴은 직전 position/type 클래스를 잃어 DOM 검사·a11y tree 일관성·향후 transition 도입 시 충돌 (REQ §1, §2).
- `crypto.randomUUID()` 를 함수 본문에서 호출해 매 렌더 신규 id — `getElementById` 의존 전체가 fragile.
- `useEffect` cleanup 부재로 unmount/show-변경 직후 stale setTimeout 이 동작할 수 있음.
- 사용처 7개가 Toaster `id` 를 외부에서 참조할 가능성 — 변경 전 `grep "Toaster.*id" src/` 확인 필요 (REQ §12 위험 1, §8 가정).

## 10. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-011) | className 보존 / id 안정화 / setTimeout cleanup (WIP) | 2, 3, 4, 5, 7, 8 |
| 2026-04-18 | TSK-20260418-18 (merged, commit `7f588bf`) | className 덮어쓰기 / id / cleanup 완료 + 11 케이스 PASS (Branches 72.22%) | 3.2, 5.2, 7, 8 |
| 2026-04-18 | (pending, REQ-20260418-026) | `duration > 0` + `completed` 분기 테스트 ≥3건 신규 + Branches ≥ 90% 목표 (WIP, Toaster 코드 변경 0줄) | 7, 7.1, 8 |

## 11. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-toaster-hide-classname-overwrite-fix.md` (REQ-011)
  - `specs/requirements/done/2026/04/18/20260418-toaster-duration-completed-branch-coverage.md` (REQ-026 — Toaster 커버리지. 문서 ID 는 REQ-20260418-026 이나 동일 ID 의 env-helper-call-site-sweep REQ 와 공존 — 파일명으로 식별)
- 상위 스타일 정책: `specs/spec/green/styles/css-modules-spec.md` §3, §4, §7
- 자매 spec: `specs/spec/green/testing/toaster-visual-smoke-spec.md` (hide 후 클래스 보존 시각 검증)
- 원 followup: `specs/followups/consumed/2026/04/18/20260418-1423-toaster-hide-classname-overwrite.md`
- 직전 태스크: `specs/task/done/2026/04/18/20260418-css-modules-toaster-pilot/`, `specs/task/done/2026/04/18/20260418-toaster-id-stabilise-classname-preserve-cleanup/` (TSK-18)
- 외부 참고:
  - https://react.dev/reference/react/useId
  - https://react.dev/reference/react/useRef
  - https://react.dev/reference/react/useEffect#caveats (cleanup)
  - https://vitest.dev/api/vi.html#vi-usefaketimers
