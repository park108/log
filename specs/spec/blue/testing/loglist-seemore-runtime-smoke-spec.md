# 명세: LogList "See more" 페이지네이션 런타임 수동 스모크 체크리스트

> **위치**: `docs/testing/loglist-seemore-runtime-smoke.md` (문서 SSoT — 신설 예정)
> **유형**: Runtime Manual Smoke Spec
> **최종 업데이트**: 2026-04-19 (inspector 초안 — REQ-20260419-037 Phase 3)
> **상태**: WIP — 문서 신설 대기
> **관련 요구사항**: REQ-20260419-037 FR-01 ~ FR-10, US-01 ~ US-04

> 자매: `log-mutation-runtime-smoke-spec.md`, `search-abort-runtime-smoke-spec.md`, `fileitem-delete-visual-smoke-spec.md`, `markdown-render-smoke-spec.md`, `toaster-visual-smoke-spec.md`, `styles-cascade-visual-smoke-spec.md`, `tanstack-query-devtools-smoke-spec.md`.

---

## 1. 역할 (Role & Responsibility)
- `/log` 페이지네이션 + "See more" 버튼 UX baseline 의 SSoT.
- REQ-20260419-036 (LogList 자동 테스트) 이 커버 불가한 실기기 네트워크 관찰 / 시각 fade / sessionStorage 분기를 운영자 육안 baseline 으로 박제.
- REQ-20260419-007 (`useLogList` + sessionStorage 제거) 머지 후 UX 등가 확인 reference.

- 주 책임:
  - 버튼 렌더/비렌더 분기 4 시나리오 (LL-01 ~ LL-04) + Should 1건 (LL-05) + Could 1건 (LL-06)
  - DevTools Network 탭 / Application 탭 관찰 절차
  - 환경 매트릭스 + 결과 기록 포맷
- 의도적으로 하지 않는 것:
  - 자동화 (Playwright/Cypress)
  - `useInfiniteQuery` 도입 자체 (별 REQ)
  - Toaster 메시지 문자열 수정

## 2. 현재 상태 (As-Is, 2026-04-20)
- `docs/testing/loglist-seemore-runtime-smoke.md` 부재.
- `src/Log/LogList.jsx:173-187` — `seeMoreButton` 파생 (REQ-020 TSK-311a016 머지 후).
- `src/Log/LogList.jsx:29-44` — sessionStorage cache 분기 (REQ-007 drift 영역, 20260420 REQ-007 ready).
- REQ-036 (자동 테스트) 의 §3.2 Out-of-Scope 에 본 REQ 쌍 REQ 로 명시.

## 3. 체크리스트 구성

### 3.1 문서 위치 (FR-01)
- 신규: `docs/testing/loglist-seemore-runtime-smoke.md`.
- 자매 문서 cross-link 7종.

### 3.2 시나리오 매트릭스 (FR-02, FR-03)

| ID | 시나리오 | 재현 절차 | 기대 결과 |
|----|---------|-----------|-----------|
| LL-01 | 버튼 비렌더 (Must) | 마지막 페이지 / no data 상태 `/log` 진입 | `data-testid="seeMoreButton"` 미존재 |
| LL-02 | 기본 렌더 baseline (Must) | 중간 페이지 `/log` 진입 | 버튼 존재 + class `button--loglist-seemore` + text "See more" |
| LL-03 | 클릭 → loading 전이 (Must) | LL-02 상태 → 버튼 클릭 | `/prod` pending + class `button--loglist-seemoreloading` + text "Loading..." |
| LL-04 | 응답 수신 후 concat + 전이 (Must) | LL-03 `/prod` 응답 완료 | listitem N → N+M + 버튼 상태 전이 (다음 있음: 기본 / 없음: 소멸) + sessionStorage 갱신 |
| LL-05 | isError 분기 (Should) | fetchFirst/fetchMore 5xx | 버튼 소멸 + `section--message-box` + Retry 동작 |
| LL-06 | sessionStorage cache hit (Could) | 첫 fetch 후 `/log` 재진입 | Network `/prod` 0건 + 즉시 렌더 |

### 3.3 환경 매트릭스 (FR-04)
- 브라우저: Chrome ≥134 / Edge / Firefox / Safari.
- OS: macOS / Windows / iOS.
- 빌드: DEV (`npm run dev`) / PROD (`npm run build && npm run preview`).
- 자격증명: public (admin 로그인 시 temporary 표시 관찰은 Should).
- 커밋 해시 박제.

### 3.4 결과 기록 포맷 (FR-05)
- `[ ] PASS / [ ] FAIL (메모) / [ ] N/A`.
- 운영자 / 일자 / 커밋 / 브라우저-버전 / OS 병기.

### 3.5 향후 확장 가이드 (FR-06)
- REQ-007 (sessionStorage 제거 + `useInfiniteQuery`) 머지 후: sessionStorage 섹션 삭제 + `fetchNextPage` 로 시나리오 재박제.
- CSS Modules Log 도메인 이관 완료 시 class 박제 갱신.

### 3.6 spec 링크 (FR-07)
- 본 spec + `state/server-state-spec.md §3.3.2` (REQ-007) cross-link.

### 3.7 비-목표 명시 (FR-08)
- 자동화 / `useInfiniteQuery` 도입 / Toaster 메시지 수정.

### 3.8 형식 일관성 (FR-09)
- 자매 smoke 체크리스트 헤더/섹션 순서 1:1.

### 3.9 cross-link REQ-036 (FR-10)
- 본 spec §2 에 REQ-036 자동화 범위 대비 수동 범위 구분 박제.

## 4. 의존성
- 내부: `src/Log/LogList.jsx`, `src/Log/api.js`.
- 외부: DevTools Network / Application.
- 자매: 7종 smoke spec.

## 5. 수용 기준 (Acceptance)

**[deferred: 4개 항목 전부 수동 smoke 문서 신설 후 운영자 세션에서 확인되는 rollup/LOC/형식/baseline 사인오프 — carvable 구현 단위 아님; planner 는 §3.1 문서 신설을 별 task 로 carve 하고 본 §5 는 REQ 완료 사인오프로 남겨둠]**

- [ ] FR-01 ~ FR-10 모두 충족.
- [ ] 문서 ≤350 LOC.
- [ ] 자매 체크리스트와 형식 일관성 유지.
- [ ] 운영자 1회 baseline 수행은 별 task.

## 6. 알려진 제약 / 이슈
- sessionStorage cache 분기는 브라우저별 storage quota / service worker 영향 받음 — 환경 표 반영.
- DevTools Network 탭 관찰은 육안 — 스크린샷 권장.

## 7. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-19 | (pending, REQ-20260419-037) | LogList "See more" 페이지네이션 런타임 수동 스모크 체크리스트 spec 초기화 (4 Must + 1 Should + 1 Could 시나리오) (WIP) | 전체 |
| 2026-04-20 | (inspector drift reconcile) | §3 헤더 rename: "(To-Be, WIP)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3 |
| 2026-04-20 | §5 operator UNCHK 4행 defer-tag (planner §4 Cond-2 충족 목적) | inspector |

## 8. 관련 문서
- 기원 요구사항: `specs/requirements/ready/20260419-loglist-seemore-runtime-smoke-checklist-doc.md` (REQ-20260419-037)
- 자매 자동 테스트 REQ: REQ-20260419-036
- 관련: REQ-20260419-007 (sessionStorage 제거 + useInfiniteQuery)
- 자매 smoke spec 7종.
