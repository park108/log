# 명세: LogSingle `/log/:timestamp` 런타임 수동 스모크 체크리스트

> **위치**: `docs/testing/logsingle-runtime-smoke.md` (문서 SSoT — 신설 예정)
> **유형**: Runtime Manual Smoke Spec
> **최종 업데이트**: 2026-04-19 (inspector 초안 — REQ-20260419-030 Phase 3)
> **상태**: WIP — 문서 신설 대기
> **관련 요구사항**: REQ-20260419-030 FR-01 ~ FR-10, US-01 ~ US-04

> 자매: `log-mutation-runtime-smoke-spec.md`, `search-abort-runtime-smoke-spec.md`, `loglist-seemore-runtime-smoke-spec.md`, `markdown-render-smoke-spec.md`, `toaster-visual-smoke-spec.md`, `styles-cascade-visual-smoke-spec.md`.

---

## 1. 역할 (Role & Responsibility)
- `/log/:timestamp` 단건 상세 조회 경로 UX baseline 의 SSoT.
- REQ-20260419-023 (`useLog` 훅 소비 마이그레이션) 머지 후 UX 회귀 탐지 reference.
- 3 도메인 (Log read + Comment Suspense + markdown) 허브 컴포넌트의 교차 회귀 지점.

- 주 책임:
  - FOUND / NOT_FOUND / DELETED / 캐시 무효화 재진입 4 시나리오 (LS-01 ~ LS-04)
  - `removeQueries` 실효 관찰 (DevTools Network 탭 재호출 확인)
- 의도적으로 하지 않는 것:
  - 자동화 (Playwright/Cypress)
  - Comment 도메인 Suspense 에러 경계 (별 후속)
  - `useDeleteLog` 훅 자체 수정

## 2. 현재 상태 (As-Is, 2026-04-20)
- `docs/testing/logsingle-runtime-smoke.md` 부재.
- `src/Log/LogSingle.jsx:1-165` — REQ-023 마이그레이션 후 상태 (`useLog` 소비).
- `src/Log/hooks/useLog.js:13-23` — queryKey `['log','detail',timestamp]`.
- `src/Log/hooks/useDeleteLog.js` — onSuccess `removeQueries` 무효화.

## 3. 체크리스트 구성

### 3.1 문서 위치 (FR-01)
- 신규: `docs/testing/logsingle-runtime-smoke.md`.
- 자매 문서 cross-link 5종.

### 3.2 시나리오 매트릭스 (FR-02, FR-03)

| ID | 시나리오 | 재현 절차 | 기대 결과 |
|----|---------|-----------|-----------|
| LS-01 | FOUND | 존재 `/log/:timestamp` 진입 | center Toaster "Loading a log..." + 본문 렌더 + `getLog(timestamp)` 1회 |
| LS-02 | NOT_FOUND | 유효하지 않은 timestamp | `<PageNotFound />` + `document.title === "Page not found"` |
| LS-03 | DELETED | admin → 존재 `/log/:timestamp` → Delete → confirm | bottom Toaster "The log is deleted." (2000ms) + 2초 후 "Deleted" h1 전이 |
| LS-04 | 캐시 무효화 재진입 | LS-03 직후 같은 timestamp 재진입 | NOT_FOUND 렌더 + `getLog(timestamp)` **재호출** (stale hit 아님) |

### 3.3 환경 매트릭스 (FR-04)
- 브라우저: Chrome ≥134.
- OS: macOS / Windows / iOS.
- 백엔드: dev / staging / prod.
- 자격증명: admin 필수 (LS-03/04) / public (LS-01/02).
- 커밋 해시 박제.

### 3.4 결과 기록 포맷 (FR-05)
- `[ ] PASS / [ ] FAIL (메모) / [ ] N/A`.
- 운영자 / 일자 / 커밋 / 브라우저-버전 / OS 병기.

### 3.5 향후 확장 가이드 (FR-06)
- Comment Suspense 에러 경계 시나리오 추가 (별 REQ).
- markdown 본문 sanitize 회귀 (REQ-001/102 선례).
- React 19 bump 후 strict mode 이중 실행 관측 포인트.

### 3.6 spec 링크 (FR-07)
- 본 spec + `state/server-state-spec.md §3.3.3` cross-link.

### 3.7 비-목표 명시 (FR-08)
- 자동화 / Comment 도메인 Suspense / `useDeleteLog` 훅 수정.

### 3.8 형식 일관성 (FR-09)
- 자매 smoke 체크리스트 헤더/섹션 순서 1:1.

### 3.9 캐시 무효화 검증 강조 (FR-10)
- LS-04 는 `removeQueries` 실효의 실기기 관찰 — DevTools Network 탭에서 `getLog(timestamp)` 재호출 확인이 유일한 검증 수단 (훅 단위 테스트는 커버 불가).

## 4. 의존성
- 내부: `src/Log/LogSingle.jsx`, `src/Log/hooks/useLog.js`, `src/Log/hooks/useDeleteLog.js`.
- 외부: DevTools Network / Application.
- 자매: 5종 smoke spec.

## 5. 수용 기준 (Acceptance)

**[deferred: 4개 항목 전부 수동 smoke 문서 신설 후 운영자 세션에서 확인되는 rollup/LOC/형식/baseline 사인오프 — carvable 구현 단위 아님; planner 는 §3.1 문서 신설을 별 task 로 carve 하고 본 §5 는 REQ 완료 사인오프로 남겨둠]**

- [ ] FR-01 ~ FR-10 모두 충족.
- [ ] 문서 ≤300 LOC.
- [ ] 자매 체크리스트와 형식 일관성 유지.
- [ ] 운영자 1회 baseline 수행은 별 task.

## 6. 알려진 제약 / 이슈
- Comment 도메인 Suspense 에러 경계는 본 범위 밖이나 LS-01 의 "본문 렌더 성공" 기준에 암묵 포함.
- `removeQueries` vs `invalidateQueries` 차이 (REQ-023 FR 박제) — LS-04 가 재호출을 검증하므로 두 방식 모두 PASS 허용.

## 7. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-19 | (pending, REQ-20260419-030) | LogSingle 단건 상세 조회 경로 런타임 수동 스모크 체크리스트 spec 초기화 (FOUND / NOT_FOUND / DELETED / 캐시 무효화 재진입 4 시나리오) (WIP) | 전체 |
| 2026-04-20 | (inspector drift reconcile) | §3 헤더 rename: "(To-Be, WIP)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3 |
| 2026-04-20 | §5 operator UNCHK 4행 defer-tag (planner §4 Cond-2 충족 목적) | inspector |

## 8. 관련 문서
- 기원 요구사항: `specs/requirements/ready/20260419-logsingle-runtime-smoke-checklist-doc.md` (REQ-20260419-030)
- 관련 REQ:
  - REQ-20260419-023 (useLog 소비 마이그레이션)
  - REQ-20260418-033 (Log mutation 파일럿)
  - REQ-20260419-008 (log-mutation smoke 선례)
- 자매 smoke spec 5종.
