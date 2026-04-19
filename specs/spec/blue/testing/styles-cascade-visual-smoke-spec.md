# 명세: 전역 styles cascade 시각 baseline 체크리스트

> **위치**:
> - `docs/testing/styles-cascade-visual-smoke.md` (신규, WIP — 위치는 planner 가 조정 가능)
> - 참조 진입점: `src/App.jsx:6`, `src/styles/{index,tokens,fonts,reset,typography,syntax,utilities}.css`
> - 참조 컴포넌트 CSS: `src/{Monitor,File,Comment,Image,Search,Log}/*.css`, `src/Log/Writer.css`, `src/Toaster/Toaster.module.css`
> **유형**: Test / Operational Checklist (수동 스모크, 재사용)
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-015)
> **상태**: Experimental (도입 전, 신규 명세)
> **관련 요구사항**: `specs/requirements/ready/20260418-styles-cascade-visual-baseline-checklist.md` (REQ-20260418-015)

> 본 문서는 **styles 분할 / 컴포넌트 CSS 진입 변경 / 토큰 재명명 등 cascade 가 흔들릴 수 있는 작업** 의 회귀 방어용 수동 시각 스모크 체크리스트의 SSoT.
> 자매 체크리스트(`toaster-visual-smoke-spec`, `markdown-render-smoke-spec`) 와 디렉토리/형식을 일치시킨다.
> 자동 시각 회귀 도구(Playwright/Storybook/Chromatic) 도입은 별 후보.

---

## 1. 역할 (Role & Responsibility)
jsdom 이 평가하지 못하는 **layout / painting / cascade 결과** 의 회귀를 1회 7분 내 점검으로 조기 발견한다. `@import` 순서 변경이나 컴포넌트 CSS 진입 정리가 기존 `App.css` 단일 파일의 cascade 결과와 시각적으로 동등함을 보장한다.

- 주 책임:
  - 5개 시각 항목 (색상 / 네비 / 반응형 / 토스트 / 폰트 로딩) 체크리스트 제공
  - 각 항목에 **DevTools 확인 포인트** (기대 CSS 변수 / computed style) 명시 — 주관 판단 최소화
  - styles 분할 직후 및 REQ-20260418-014 (컴포넌트 `@import` 정리) 의 baseline 기록
  - 향후 토큰 재명명 / 다크모드 / CSS Modules 2단계 등에서 재사용
- 의도적으로 하지 않는 것:
  - Playwright / Storybook 자동화 도입 (별 후보)
  - 실제 토큰 재명명 / 디자인 시스템 변경 (design-tokens-spec 영역)
  - 컴포넌트별 개별 시각 체크리스트 (Toaster / markdown 렌더 등 자매 spec 영역)

> 관련 요구사항: REQ-20260418-015 §3 (Goals)

## 2. 현재 상태 (As-Is)
- [ ] `docs/testing/styles-cascade-visual-smoke.md` **부재**
- styles 분할 완료: `ffb6677 refactor: split App.css into src/styles/ role-based files` — 17 파일, +370/-369 라인, 코드상 규칙/값 변경 0 (순수 파일 이동).
- 자동 검증 현황:
  - `npm test` PASS
  - `npm run build` 성공
  - jsdom 은 layout/painting 미평가 → cascade 동등성 **자동 검증 불가**
- 자매 REQ-20260418-014 (컴포넌트 CSS 의 중복 `@import` 제거) 가 곧 같은 체크리스트를 2회째 사용할 예정.

> 관련 요구사항: REQ-20260418-015 §2 배경

## 3. 체크리스트 구성 (To-Be, WIP)
> 관련 요구사항: REQ-20260418-015 FR-01~07

### 3.1 문서 위치
- 기본: `docs/testing/styles-cascade-visual-smoke.md`
- 대안: `docs/testing/visual-smoke/styles-cascade.md` (자매 체크리스트와 통합 디렉토리) — planner 결정 (REQ-015 §13 미결).

### 3.2 항목 1: 배경 / 텍스트 / 보더 색상
| 확인 지점 | 기대 변수 / computed style | DevTools 확인 |
|-----------|----------------------------|---------------|
| Log 목록 카드 배경 | `var(--color-bg-primary)` (또는 pre-rename: `--normal-background-color`) | Elements → Computed → `background-color` |
| 본문 텍스트 | `var(--color-text-primary)` | Computed → `color` |
| 단락 보더 | `var(--color-border-primary)` | Computed → `border-color` |
| Writer 입력 영역 배경 / placeholder | `var(--color-bg-primary)` / `var(--color-text-muted)` | textarea inspect |
| Footer 텍스트색 + 배경 | `var(--color-text-sub)` / `var(--color-bg-primary)` | footer inspect |

### 3.3 항목 2: 네비게이션 상태 (active / hover / inactive)
- 관리자 메뉴 + 일반 메뉴 3 상태 각각 확인
- Search 입력창 포커스 상태: 포커스 링 가시 + `var(--color-border-active)`
- `.li--nav-active` / `.li--nav-inactive` 적용 색 확인

### 3.4 항목 3: 반응형 브레이크포인트 (350 / 400 / 640 px)
- DevTools Device Toolbar 로 각 너비 전환
- Navigation 좁아짐 / 일부 항목 `hidden--width-*` 적용 확인
- 본문 영역 좌우 패딩 변화 확인
- `utilities.css` 의 `@media` 와 design-tokens-spec §5 의 브레이크포인트가 일치함을 검증

### 3.5 항목 4: 토스트 상태 색
- bottom-success / bottom-error / center-success / center-information 4 변형
- 기대 변수: `var(--color-status-success-bg)`, `var(--color-status-error-bg)`, 각 text 변형
- 토스트 페이드인/아웃 시각 보존 (자매 `toaster-visual-smoke-spec` 과 중복 검증 가능)

### 3.6 항목 5: 폰트 로딩 (FOUT 인식)
- `@font-face` 선언이 첫 페인트 후 적용되는지 — 새로고침 직후 플리커 허용되는 범위 내 확인
- Network 패널에서 웹폰트 다운로드 확인
- fallback 폰트로의 전환이 `font-display` 정책대로 작동

### 3.7 재사용 안내 (FR-04)
- 문서 말미에 "재실행 트리거" 섹션:
  - `src/styles/*.css` 변경 (파일 추가/삭제/순서 변경)
  - 컴포넌트 CSS 의 전역 진입 변경 (`@import` 추가/제거)
  - 토큰 재명명 / 다크모드 도입 / CSS Modules 2단계
  - 새 브레이크포인트 추가
- 재실행 결과는 해당 PR 에 링크로 첨부.

### 3.8 baseline 기록 (FR-05)
- 운영자(park108) 가 styles 분할 baseline 을 먼저 [x] 로 마감.
- 자매 REQ-20260418-014 (컴포넌트 `@import` 정리) 머지 시 2회째 체크 — 모든 항목 [x] 또는 회귀 코멘트.
- 기록 항목: 날짜, 브라우저/버전, 환경, 해상도.

### 3.9 자동화 후속 후보 (FR-07, Could)
- 문서 하단에 Playwright / Storybook visual / Chromatic 비교표 — 미래 ROI 재검토 진입점.

## 4. 의존성

### 4.1 내부 의존
- 관찰 대상 진입점: `src/App.jsx:6`, `src/styles/index.css` 및 6 파일
- 관찰 대상 컴포넌트 CSS: Monitor, File, Comment, ImageSelector, Search, Log, Writer, Toaster
- 상위 정책 spec:
  - `specs/spec/green/styles/design-tokens-spec.md` §5, §5.1, §9
  - `specs/spec/green/styles/css-modules-spec.md` §7
- 자매 체크리스트 spec:
  - `specs/spec/blue/testing/toaster-visual-smoke-spec.md`
  - `specs/spec/blue/testing/markdown-render-smoke-spec.md`

### 4.2 외부 의존
- 패키지: 없음 (수동 절차)
- 브라우저: 운영자 로컬 (Chrome / Edge DevTools, Device Toolbar)

### 4.3 역의존 (사용처)
- REQ-20260418-014 (컴포넌트 `@import` 정리) — 본 체크리스트로 회귀 방어
- 향후 토큰 재명명 / 다크모드 / CSS Modules 2단계 / App.css 추가 분할

## 5. 수용 기준 (Acceptance — REQ-20260418-015)
- [ ] `docs/testing/styles-cascade-visual-smoke.md` (또는 planner 가 정한 위치) 존재
- [ ] 5개 항목 (색상 / 네비 / 반응형 / 토스트 / 폰트) 각각 절차 + DevTools 확인 + 체크박스 구비
- [ ] baseline 1회 운영자 수행 (styles 분할 + 자매 REQ-014 또는 단독 styles 분할)
- [ ] 자매 체크리스트(Toaster, markdown) 와 디렉토리 / 형식 일관
- [ ] DevTools 확인 항목에 기대 CSS 변수 / computed style ≥1개 명시 (NFR-04 from REQ-015)
- [ ] 재실행 트리거 섹션 존재 ("styles/*, 컴포넌트 CSS 진입 변경, 토큰 재명명 시 재실행")
- [ ] 문서 라인 수 ≥100 (NFR: 재사용 가능한 세부도)

## 6. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 실행 시간 | N/A | ≤7분/회 | NFR-01 |
| 유지보수성 | N/A | 재실행 트리거 명시 | NFR-02 |
| 일관성 | N/A | 자매 체크리스트와 동일 디렉토리/형식 | NFR-03 |
| 신뢰성 | N/A | 항목당 기대 변수 ≥1 | NFR-04 |

## 7. 알려진 제약 / 이슈
- 수동 체크 형식화로 `[x]` 남발 위험 — DevTools 변수 비교를 강제 항목으로 (REQ §12 위험 1).
- 350/400/640 px 외 새 브레이크포인트 추가 시 체크리스트 미갱신 — `utilities.css` 변경 PR 에 체크리스트 갱신 의무 (REQ §12 위험 2).
- Toaster / markdown 체크리스트와 디렉토리 컨벤션 충돌 가능 — planner 조율 (REQ §13 미결).
- baseline 시점이 변경 직후가 아니라 시간 경과 후면 회귀 추적 어려움 — 머지 PR 안에서 [x] 강제.
- `PageNotFound.jsx` 단독 진입 시나리오가 있다면 항목 추가 (자매 REQ-014 §13 와 연동, 현재 미결).

## 8. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-015) | styles cascade 시각 baseline 체크리스트 spec 초기화 (WIP) | all |

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-styles-cascade-visual-baseline-checklist.md` (이동 후)
- 원 followup: `specs/followups/consumed/2026/04/18/20260417-2153-visual-regression-manual-check-pending.md`
- 관련 spec:
  - `specs/spec/green/styles/design-tokens-spec.md` §5, §5.1, §9
  - `specs/spec/green/styles/css-modules-spec.md` §7
- 자매 spec:
  - `specs/spec/blue/testing/toaster-visual-smoke-spec.md`
  - `specs/spec/blue/testing/markdown-render-smoke-spec.md`
- 자매 REQ:
  - `specs/requirements/ready/20260418-component-css-redundant-global-imports-removal.md` (REQ-014)
  - `specs/requirements/ready/20260418-tanstack-query-devtools-smoke-checklist.md` (REQ-016, 동일 형식)
- 직전 태스크: `specs/task/done/2026/04/18/20260418-styles-directory-split/`
- 외부:
  - Playwright snapshots: https://playwright.dev/docs/test-snapshots
  - Storybook visual testing: https://storybook.js.org/docs/writing-tests/visual-testing
