# 명세: FileItem 삭제 UX 시각/런타임 수동 스모크 체크리스트

> **위치**: `docs/testing/fileitem-delete-visual-smoke.md` (문서 SSoT — 신설 예정)
> **유형**: Runtime Manual Smoke Spec
> **최종 업데이트**: 2026-04-19 (inspector 초안 — REQ-20260419-026 Phase 3)
> **상태**: WIP — 문서 신설 대기
> **관련 요구사항**: REQ-20260419-026 FR-01 ~ FR-08, US-01 ~ US-04

> 본 spec 은 `specs/spec/blue/testing/log-mutation-runtime-smoke-spec.md` 선례와 동일 형식.
> 자매: `toaster-visual-smoke-spec.md`, `styles-cascade-visual-smoke-spec.md`, `markdown-render-smoke-spec.md`, `search-abort-runtime-smoke-spec.md`.

---

## 1. 역할 (Role & Responsibility)
- REQ-20260419-015 (FileItem `setItemClass` 선언적 React 전환, done) 후속 baseline 의 SSoT.
- `div--fileitem-delete` 클래스 / `data-deleting="Y"` 속성 전환, 3초 refresh 대기, DELETE 5xx/네트워크 Toaster 박제.
- 향후 `useDeleteFile` TanStack Query 훅 도입 / CSS Modules 2단계 이관 / design-tokens 재명명 등에서 회귀 탐지 보조재.

- 주 책임:
  - 4 시나리오 (FI-01 ~ FI-04) 매트릭스 명시
  - 운영자 1회 baseline 결과 포맷 (운영자/일자/커밋/브라우저/OS)
  - 자매 문서 cross-link
- 의도적으로 하지 않는 것:
  - 자동화 (Playwright/Cypress, REQ-031 영역)
  - `useDeleteFile` 훅 도입 자체 (별 REQ 후보)
  - Toaster 메시지 문자열 수정 (별 followup)
  - Upload/Drop 경로 (별 baseline 후보)

## 2. 현재 상태 (As-Is, 2026-04-20)
- `docs/testing/fileitem-delete-visual-smoke.md` **부재** — `ls docs/testing/` 확인.
- `src/File/FileItem.jsx:10, 18-45, 62-67, 101-108` — 삭제 확인 + `div--fileitem-delete` className + 3초 setTimeout + `useDeleteFile` 없이 직접 fetch 구조.
- `src/File/FileItem.test.jsx:166-254` — 단위 테스트 존재 (delete 성공/실패 분기).

## 3. 체크리스트 구성

### 3.1 문서 위치 (FR-01)
- 신규: `docs/testing/fileitem-delete-visual-smoke.md`.
- 헤더: SSoT 링크 (본 spec 파일), 자매 문서 cross-link 5종 (`log-mutation-runtime-smoke.md` / `toaster-visual-smoke.md` / `styles-cascade-visual-smoke.md` / `markdown-render-smoke.md` / `search-abort-runtime-smoke.md`).

### 3.2 시나리오 매트릭스 (FR-02, FR-03)

| ID | 시나리오 | 재현 절차 | 기대 결과 |
|----|---------|-----------|-----------|
| FI-01 | 삭제 확인 시각 전환 | admin → `/file` → delete 확인 클릭 | `div--fileitem-delete` 적용 + `data-deleting="Y"` |
| FI-02 | 3초 후 list refresh | FI-01 직후 3000ms 대기 | 해당 파일 자연 제거 |
| FI-03 | DELETE 5xx Toaster | admin → `/file` → DevTools Network 5xx → 삭제 | Toaster 노출 (메시지/position/type/duration/색상 박제) |
| FI-04 | DELETE 네트워크 오프라인 Toaster | admin → `/file` → DevTools Offline → 삭제 | catch 블록 Toaster 노출 박제 |

### 3.3 환경 매트릭스 (FR-04)
- 브라우저: Chrome ≥134 (기본), Firefox/Safari (옵션).
- OS: macOS / Windows / iOS.
- 백엔드: dev / staging / prod.
- 자격증명: admin 필수.
- 커밋 해시 박제.

### 3.4 결과 기록 포맷 (FR-05)
- 체크박스: `[ ] PASS / [ ] FAIL (메모) / [ ] N/A`.
- 병기: 운영자 / 일자 / 커밋 해시 / 브라우저-버전 / OS.
- REQ-008 §12 위험 1 (추적성) 완화 패턴 준용.

### 3.5 향후 확장 가이드 (FR-06)
- `useDeleteFile` TanStack Query 훅 도입 시 시나리오 FI-05 (optimistic/invalidate) 추가.
- CSS Modules 2단계 (File 도메인 미마이그레이션) 완료 시 className 박제 갱신.

### 3.6 비-목표 명시 (FR-07)
- 자동화 / Toaster 메시지 수정 / Upload/Drop / `confirm()` 구현 변경 자체 — 본 spec 범위 밖.

### 3.7 형식 일관성 (FR-08)
- 자매 smoke 체크리스트 헤더/섹션 순서 1:1.

## 4. 의존성
- 내부: `src/File/FileItem.jsx`, `src/File/FileItem.test.jsx`, `src/common/common.js` (`confirm`).
- 외부: DevTools Network (throttling / offline).
- 자매: `specs/spec/blue/testing/log-mutation-runtime-smoke-spec.md` (형식 reference).

## 5. 수용 기준 (Acceptance)
- [ ] FR-01 ~ FR-08 모두 충족.
- [ ] 문서 ≤300 LOC (헤더 + 4 시나리오 + 환경 매트릭스 + 결과 표).
- [ ] 자매 체크리스트와 형식 일관성 유지.
- [ ] 운영자 1회 baseline 수행은 별 task (본 REQ 는 문서 신설 한정).

## 6. 알려진 제약 / 이슈
- `confirm()` 브라우저 alert 의 자동 캡처 한계 — 운영자 수동.
- `useDeleteFile` 훅 부재 상태에서는 직접 fetch 구조 박제 — 훅 도입 시 재박제 필요.

## 7. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-19 | (pending, REQ-20260419-026) | FileItem 삭제 UX 시각/런타임 수동 스모크 체크리스트 spec 초기화 (4 시나리오 FI-01~04, 자매 형식 준수) (WIP) | 전체 |
| 2026-04-20 | (inspector drift reconcile) | §3 헤더 rename: "(To-Be, WIP)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3 |

## 8. 관련 문서
- 기원 요구사항: `specs/requirements/ready/20260419-fileitem-delete-visual-smoke-checklist-doc.md` (REQ-20260419-026)
- 관련 REQ:
  - REQ-20260419-015 (FileItem refactor, done) — baseline 대상
  - REQ-20260419-008 (log-mutation runtime smoke, done) — 형식 선례
- 자매 spec (blue): `log-mutation-runtime-smoke-spec.md`, `toaster-visual-smoke-spec.md`, `styles-cascade-visual-smoke-spec.md`, `markdown-render-smoke-spec.md`
- 자매 spec (green): `search-abort-runtime-smoke-spec.md`
