# 명세: Suspense Skeleton fallback 동적 검증 헬퍼 (`withSuspendedModule`)

> **위치**:
> - `src/test/utils/withSuspendedModule.{js,jsx}` (신규, 도입 예정)
> - 참조 테스트: `src/Log/LogSingle.test.jsx` (Phase 1 정적 가드 `it('LogSingle source declares Skeleton variant="detail" as Suspense fallback (no empty <div>)')` 블록)
> - 참조 컴포넌트: `src/Log/LogSingle.jsx` 의 `<Suspense fallback={<Skeleton variant="detail" />}>` (보조: `:87, :128`), `src/common/Skeleton.jsx` (또는 equivalent `variant` 구현 위치)
> **유형**: Test / Utility (vitest helper)
> **최종 업데이트**: 2026-04-20 (by inspector, WIP — REQ-20260420-025 초기 반영)
> **상태**: Experimental (도입 전, 신규 명세)
> **관련 요구사항**:
> - `specs/requirements/ready/20260420-suspense-dynamic-render-helper-phase2.md` (REQ-20260420-025, Phase 2 헬퍼 도입)
> - 선행: `specs/requirements/done/2026/04/20/20260420-suspense-fallback-empty-div-to-skeleton-sweep.md` (Phase 1 정적 가드 선례)
> - 패턴 참조: `specs/spec/green/common/react-render-patterns-spec.md` (React 렌더 안티패턴 SSoT — Suspense boundary 는 §5 에서 인용), `specs/spec/green/state/server-state-spec.md` §4.3.1 (`renderWithQuery` 테스트 wrapper 선례)

> 본 문서는 React.lazy Suspense 경계에서 **lazy chunk 가 실제 suspend 중인 상태의 DOM 노출(Skeleton fallback)** 을 테스트 레벨에서 검증하기 위한 공용 헬퍼의 SSoT. 정적 fs 매칭 가드(Phase 1) 와 **공존** 가능하며, Phase 2 (LogItem + LogItemInfo + Comment 일괄 전환) 시작 시점의 블루프린트.

> 참조 코드 표기 컨벤션: 식별자 우선, 라인 번호 보조 (REQ-20260418-039 준수).

---

## 1. 역할 (Role & Responsibility)

lazy 가져오는 하위 모듈을 **영구 pending Promise** 로 흉내내 `<Suspense fallback={...}>` 의 fallback 이 DOM 에 실제로 렌더되는지를 vitest 환경에서 단일 API 로 검증 가능하게 한다.

- 주 책임:
  - `vi.doMock(modulePath, factory)` + cleanup 의 표준 래핑 제공.
  - QueryClientProvider / MSW `server` 등 기존 테스트 wrapper 와의 상호작용 순서 문서화.
  - Phase 2 에서 LogItem / LogItemInfo / Comment 등 추가 lazy boundary 전환 시 복제 없이 재사용.
- 의도적으로 하지 않는 것:
  - `LogSingle.jsx` 등 소스 수정 — 본 spec 범위 밖.
  - Playwright/E2E 도입 — 별 후보.
  - React 19 업그레이드에 따른 Suspense 시맨틱 변경 — 별 spec (`specs/spec/green/build/react-version-spec.md` 소관).
  - Phase 2 의 실제 Skeleton fallback 전환 작업 — 별 REQ 로 분리 예정.

> 관련 요구사항: REQ-20260420-025 §3 (Goals)

---

## 2. 현재 상태 (As-Is) — 2026-04-20

### 2.1 Phase 1 정적 가드 (LogSingle 단일 파일)

- `src/Log/LogSingle.test.jsx` 의 `it('LogSingle source declares Skeleton variant="detail" as Suspense fallback (no empty <div>)')` 블록은 `fs.readFileSync` 기반 정규식 매칭 (`src.match(/<Suspense fallback=\{<Skeleton variant="detail" \/>\}>/g)`) 으로 **소스 문자열 존재 여부**만 확인.
- 관측 결과: grep 회귀 차단에는 충분. 소스가 `<Suspense fallback={<div />}>` 로 회귀 시 즉시 RED.
- 한계: DOM 레벨 fallback 렌더는 검증하지 않음. 런타임에 `Skeleton` import 경로가 바뀌거나 fallback prop 이 조건부로 비워져도 정적 매칭은 PASS 로 통과.

### 2.2 App.test.jsx top-level guard

- `src/App.test.jsx:347` 의 top-level Skeleton white-screen guard 가 App shell suspension 은 커버. 그러나 LogSingle 하위 chunk (LogItem, Toaster 등) 의 개별 suspension 경로는 직접 커버하지 않는다.

### 2.3 Phase 2 대상 lazy boundary (예정)

| 위치 (식별자) | 현재 fallback | Phase 2 목표 | 상태 |
|----|----|----|----|
| `src/Log/LogSingle.jsx` `<Suspense fallback={<Skeleton variant="detail" />}>` × 2 | Phase 1 완료 | 동적 가드 추가 | **대상** (FR-02) |
| `src/Log/LogItem.jsx` `<Suspense ...>` | TBD | 전환 | Phase 2 별 REQ |
| `src/Log/LogItemInfo.jsx` `<Suspense ...>` | TBD | 전환 | Phase 2 별 REQ |
| `src/Comment/Comment.jsx` `<Suspense ...>` | TBD | 전환 | Phase 2 별 REQ |

> Phase 2 개별 컴포넌트 전환 작업은 본 spec 범위 밖 — 본 spec 은 헬퍼 + LogSingle 적용 1건만 담당.

---

## 3. 도입 정책

> 관련 요구사항: REQ-20260420-025

### 3.1 헬퍼 파일 위치 및 시그니처 (FR-01)

- 위치: `src/test/utils/withSuspendedModule.{js,jsx}` (단일 파일, ≤ 80 라인 / NFR-03).
- 시그니처 (권장):

```js
// 형태 A: cleanup 반환 함수
export const withSuspendedModule = (modulePath) => {
  vi.doMock(modulePath, () => ({ default: () => new Promise(() => {}) }));
  return () => {
    vi.doUnmock(modulePath);
    vi.resetModules();
  };
};

// 형태 B: render wrapper
export const renderWithSuspendedModule = (modulePath, ui, options = {}) => {
  const cleanup = withSuspendedModule(modulePath);
  const result = render(ui, options);
  return { ...result, cleanup };
};
```

- 채택은 developer 가 태스크 수행 시 결정 (형태 A 권장 — `afterEach` 에 cleanup 반환값을 연결).
- JSDoc 필수: 파라미터, 반환값, cleanup 의무, 기존 wrapper 와의 상호작용 순서.

### 3.2 Cleanup 원자성 (FR-03)

- 다음 테스트에서 원본 모듈이 원상 복원돼야 함 (`vi.doUnmock` + `vi.resetModules()`).
- MSW `server` handler 는 `setupTests.js` 의 `afterEach(server.resetHandlers)` 에 의해 자동 재초기화 — 헬퍼는 **server 인스턴스를 건드리지 않음**.
- QueryClient 는 테스트별 독립 인스턴스(`renderWithQuery` / `createQueryTestWrapper`) 를 사용 — 헬퍼는 QueryClient 를 건드리지 않음.
- `vi.resetModules()` 호출 순서: cleanup 시 `vi.doUnmock` → `vi.resetModules()` → 테스트 종료. `afterEach` 등록 순서에 의존하지 않도록 헬퍼 내부에서 원자적으로 처리.

### 3.3 기존 wrapper 와의 상호작용 순서 문서화

- 외부 래핑 순서 (안쪽 → 바깥쪽):
  1. `vi.doMock(modulePath, ...)` ← **가장 먼저** (import resolution 전).
  2. `render(<Provider>...{ui}</Provider>)` — QueryClientProvider / MSW / RouterProvider 등.
  3. 어서션 (`findByTestId('skeleton-detail')` 등).
  4. `cleanup()` (헬퍼 반환 함수) — `afterEach` 에 위임.
- `vi.doMock` 은 render 이전 호출 필수 — 이후 호출 시 모듈 캐시가 이미 resolved 되어 pending Promise 주입 불가.

### 3.4 Skeleton `data-testid` 규약 (FR-04)

- `src/common/Skeleton.jsx` (또는 variant 구현 위치) 가 `<div data-testid={\`skeleton-${variant}\`}>...</div>` 를 노출하도록 최소 수정 (이미 존재 시 재사용).
- `findByTestId('skeleton-detail')` / `findByTestId('skeleton-list')` / `findByTestId('skeleton-item')` 패턴으로 variant 별 검증.
- 기존 a11y / role 속성 회귀 0 (NFR-01 연동).

### 3.5 LogSingle 동적 가드 (FR-02)

- `src/Log/LogSingle.test.jsx` 에 신규 `it('LogSingle renders <Skeleton variant="detail" /> while LogItem lazy chunk suspends')` 1건 추가.
- 기존 Phase 1 정적 가드와 **병행 유지** (빠른 grep 차단 가치 보존 — FR-02 "대체 또는 병행" 옵션 중 병행을 권장 default).
- 어서트:
  - `await screen.findByTestId('skeleton-detail')` — fallback DOM 노출 확인.
  - cleanup 후 다음 `it` 에서 원본 `LogItem` 로드 복원 (`vi.resetModules()` 효과 검증 — Should).

### 3.6 문서 (FR-05)

- 본 spec 파일 자체가 SSoT. 별도 README 생성은 Optional.
- Phase 2 개별 REQ 작성 시 "Skeleton fallback 동적 가드는 `withSuspendedModule` 사용" 을 참조 링크로 박제.

---

## 4. 의존성

### 4.1 상류 의존
- Phase 1 (`20260420-suspense-fallback-empty-div-to-skeleton-sweep`, done) — LogSingle 정적 가드 + `Skeleton variant="detail"` 도입.
- vitest + jsdom 환경 (`vi.doMock`, `vi.resetModules` 지원 전제).
- React.lazy + `<Suspense>` (React 18.2 현재, 19 업그레이드 후에도 시맨틱 호환 전제).

### 4.2 하류 영향
- Phase 2 LogItem / LogItemInfo / Comment Skeleton fallback 전환 REQ 들이 본 헬퍼 재사용.
- E2E(Playwright) 도입 시 본 헬퍼와 별도 레이어 — 대체 아님.

### 4.3 인접 spec
- `specs/spec/green/common/react-render-patterns-spec.md` — Suspense 경계 배치 및 JSX-in-state 안티패턴 SSoT. 본 spec 은 테스트 레이어 전용.
- `specs/spec/green/state/server-state-spec.md` §4.3.1 — `renderWithQuery` 테스트 wrapper. 병행 사용 시 §3.3 순서 준수.

---

## 5. 수용 기준 (Acceptance)

### 5.1 REQ-20260420-025 수용 기준

> 관련 요구사항: REQ-20260420-025 §10

- [ ] FR-01: `src/test/utils/withSuspendedModule.{js,jsx}` 파일 생성, JSDoc 포함, ≤ 80 라인 (NFR-03).
- [ ] FR-02: `src/Log/LogSingle.test.jsx` 에 동적 가드 `it` 1건 추가 (정적 가드와 병행 또는 대체). `await findByTestId('skeleton-detail')` PASS.
- [ ] FR-03: cleanup 원자성 — 헬퍼 사용 후 다음 `it` 에서 원본 모듈 로드 복원 (`vi.doUnmock` + `vi.resetModules()`).
- [ ] FR-04: `src/common/Skeleton.jsx` (또는 variant 구현 위치) 에 `data-testid="skeleton-detail"` 부여 (이미 존재 시 재사용).
- [ ] FR-05: 본 spec 에 헬퍼 JSDoc + 사용 예시 명시 (또는 spec §3.1 에 인라인).
- [ ] `npm test -- --run` 전체 PASS, LogSingle 도메인 동적 가드 포함.
- [ ] NFR-01: 헬퍼 기반 테스트 10회 반복 PASS (flaky 율 0).
- [ ] NFR-02: 전체 vitest runtime 증가 ≤ +1s (기준선 대비).

### 5.2 grep 회귀 차단 (FR-03 연동)

- `grep -rn "withSuspendedModule" src/` → 정의 1파일 + 사용처 ≥ 1 파일.
- `grep -n "vi.doMock.*LogItem\|vi.doMock.*LogItemInfo\|vi.doMock.*Comment" src/Log/LogSingle.test.jsx` — Phase 2 전환 시점에 ≥ 1 (LogSingle 한정).

---

## 6. 알려진 제약 / 이슈

- `vi.doMock` 은 module path 기반이며 상대/절대 경로 일치 필요. 헬퍼에 절대 alias (`@/Log/LogItem`) 지원 고려 (REQ §12 risks — Low).
- `vi.resetModules()` 가 MSW `server` handler 영향 시 flake 가능성 — setupTests.js afterEach 에서 `server.resetHandlers()` 재호출 확인 (REQ §12 risks — Med).
- React 19 업그레이드 시 Suspense 시맨틱 변화 가능성 — 업그레이드 후 재검증 필요 (별 spec `build/react-version-spec.md`).

---

## 7. 변경 이력

| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-20 | (pending, REQ-20260420-025) | 본 spec 초안 신설 — `withSuspendedModule` 헬퍼 + LogSingle 동적 가드 도입 블루프린트 (WIP) | all |

## 8. 관련 문서
- 기원 요구사항: `specs/requirements/ready/20260420-suspense-dynamic-render-helper-phase2.md`
- Phase 1 선행: `specs/requirements/done/2026/04/20/20260420-suspense-fallback-empty-div-to-skeleton-sweep.md`
- 관련 spec: `specs/spec/green/common/react-render-patterns-spec.md`, `specs/spec/green/state/server-state-spec.md` §4.3.1
- followup 원전: `specs/followups/consumed/2026/04/20/20260420-1802-logsingle-skeleton-render-dynamic-test.md`
