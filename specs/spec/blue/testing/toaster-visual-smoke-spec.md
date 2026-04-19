# 명세: Toaster CSS Modules 시각 스모크 체크리스트

> **위치**:
> - `docs/testing/toaster-visual-smoke.md` (신규, WIP — 위치는 planner 가 조정 가능)
> - 참조 컴포넌트: `src/Toaster/Toaster.jsx`, `src/Toaster/Toaster.module.css`
> **유형**: Test / Operational Checklist (수동 스모크)
> **최종 업데이트**: 2026-04-18 (by inspector, WIP)
> **상태**: Experimental (도입 전, 신규 명세)
> **관련 요구사항**: REQ-20260418-010 (`specs/requirements/done/2026/04/18/20260418-css-modules-pilot-visual-checklist.md`)

> 본 문서는 **CSS Modules 이행(Toaster 파일럿 및 후속 컴포넌트) 에 대한 시각 회귀 방어용 수동 스모크 체크리스트**의 SSoT.
> 자동 시각 회귀 도구(Playwright/Storybook) 도입은 별건, 본 명세는 그 전 단계의 baseline 역할.
> 자매 명세 `markdown-render-smoke-spec.md` 와 디렉토리/형식을 일치시킨다.

---

## 1. 역할 (Role & Responsibility)
jsdom 자동 검증이 도달할 수 없는 **layout/color/fadeout 시각 회귀** 를 1분 점검으로 조기 발견한다. CSS Modules 해시 적용 여부를 DevTools 에서 강제 확인해 "DevTools 봤는지" 가 주관 판단이 아닌 항목이 되게 한다.

- 주 책임:
  - Toaster 골든 패스 4종 (File 성공/실패, Comment 성공, Writer 저장 등) 체크리스트 제공
  - 케이스별 기대 클래스 hash 형식 및 data 속성 명시
  - 다른 컴포넌트 CSS Modules 이행 시 재사용 가능한 템플릿 제공
- 의도적으로 하지 않는 것:
  - Playwright/Storybook visual regression 자동화 도입 (별 후보)
  - Toaster 자체 코드 변경 (별 REQ-20260418-011 영역)
  - 다른 컴포넌트의 CSS Modules 이행 작업 자체

> 관련 요구사항: REQ-20260418-010 §3 (Goals)

## 2. 현재 상태 (As-Is)
- [ ] `docs/testing/toaster-visual-smoke.md` **부재**
- 자동 검증 현황 (요구사항 §2 인용):
  - `npm test` 25 파일 / 185 PASS, `npm run build` 성공
  - `grep _div--toaster build/assets/*.css` 8건 일치 → 빌드 산출물의 해시 클래스 확인 완료
- 공백:
  - jsdom 은 CSS Modules 식별자(`_divToasterBottom_xyz`) 만 노출, layout/painting 미검증
  - `specs/spec/green/styles/css-modules-spec.md` §7 의 "DevTools 확인" 항목이 수동 의존이지만 실행 형식 미정
  - Toaster 사용처 7개 (File, Comment, Writer, LogList, LogSingle, ImageSelector, SearchInput) 의 동작 경로마다 체크 수단 부재

> 관련 요구사항: REQ-20260418-010 §2 배경

## 3. 체크리스트 구성 (To-Be, WIP)
> 관련 요구사항: REQ-20260418-010 FR-01~06

### 3.1 문서 위치
- 기본: `docs/testing/toaster-visual-smoke.md`
- 대안: 컴포넌트 디렉토리(`src/Toaster/VISUAL_SMOKE.md`), 또는 `docs/testing/visual-smoke/toaster.md` (markdown 체크리스트와 통합) — planner 결정 (REQ-010 §13 미결)

### 3.2 골든 패스 4종 (FR-02)
각 항목은 (재현 절차 / 기대 시각 / DevTools 확인 / 체크박스) 4 블록으로 구성:

1. **File 업로드 성공 → bottom-success toaster**
   - 재현: `/` 진입 → File 업로드 영역에 유효 파일 드롭/선택 → 업로드 성공
   - 기대 시각: 화면 하단 중앙에 성공색 toaster 가 페이드-인, 약 5s 후 페이드-아웃
   - DevTools: `<div class="_divToasterBottom_<hash> _divToasterSuccess_<hash>" data-position="bottom" data-type="success" role="alert">`
2. **File 업로드 실패 → bottom-error toaster**
   - 재현: 잘못된/과대 파일 업로드 시도 → 업로드 실패
   - 기대 시각: 화면 하단 중앙에 에러색 toaster, 약 5s 후 페이드-아웃
   - DevTools: `_divToasterBottom_<hash> _divToasterError_<hash>`, `data-position="bottom"`, `data-type="error"`
3. **Comment 등록 → center-success toaster**
   - 재현: LogSingle 진입 → 본문 하단 Comment 입력 → 등록 버튼
   - 기대 시각: 화면 중앙에 성공색 toaster
   - DevTools: `_divToasterCenter_<hash> _divToasterSuccess_<hash>`, `data-position="center"`, `data-type="success"`
4. **Writer 저장 → bottom-success/error toaster (또는 LogList/ImageSelector/SearchInput 중 1 케이스)**
   - 재현: Writer 라우트에서 본문 작성 → 저장 (성공/실패 중 재현 가능한 경로)
   - 기대 시각: 해당 position + type 조합의 toaster 페이드-인/아웃
   - DevTools: 기대 클래스 조합을 재현 결과에 맞게 기록

### 3.3 DevTools 확인 항목 (FR-03)
- Elements 패널에서 toaster 루트 `<div>` 의 `class` 속성이 다음 형식을 만족:
  - 해시 접미사가 존재 (`_<6자 이상 영숫자>`)
  - position 클래스(`_divToasterBottom_...` / `_divToasterCenter_...`) 와 type 클래스(`_divToasterSuccess_...` / `_divToasterError_...`) 가 **공존**
  - `role="alert"`, `data-position`, `data-type` 속성이 케이스 기대값과 일치
- hide 직전 → 직후 전환에서 DOM 클래스의 변화 패턴 기록(REQ-20260418-011 변경 전후로 baseline 갱신 대상)

### 3.4 재사용 안내 (FR-04)
- 문서 말미 "다른 컴포넌트 이행 시 템플릿 복제 방법" 섹션:
  - 파일명 규칙: `docs/testing/{component}-visual-smoke.md`
  - 4 블록 구조 유지 (재현 / 기대 시각 / DevTools / 체크박스)
  - 기대 클래스 형식은 `_{camelCaseClass}_<hash>` 로 교체
- 첫 재사용 시 형식 회고 항목 1줄 유지 (REQ §12 위험 3)

### 3.5 baseline 기록 (FR-05)
- 운영자(park108) 가 모든 체크박스 `[x]` 로 마감한 상태를 문서에 포함해 PR 머지
- 기록 항목: 날짜, 브라우저/버전, 환경(`npm run dev` 또는 배포 환경), 스크린 해상도
- 자매 REQ-20260418-011 (Toaster hideToaster className 정리) 머지 후 baseline 1회 재기록 가능 — 변경 PR 순서는 planner 조율

### 3.6 자동화 후보 (FR-06, Could)
- 문서 하단 Playwright / Storybook visual / Chromatic 링크 비교표로 ROI 재검토 시 진입점 제공
- 본 체크리스트는 자동화 도입 시 시나리오 소스로 흡수

## 4. 의존성

### 4.1 내부 의존
- 관찰 대상: `src/Toaster/Toaster.jsx`, `src/Toaster/Toaster.module.css`
- 사용처(시나리오 재현 경로): `src/File/FileUpload.jsx`, `src/Comment/Comment.jsx`, `src/Log/Writer.jsx`, `src/Log/LogList.jsx`, `src/Log/LogSingle.jsx`, `src/Image/ImageSelector.jsx`, `src/Search/SearchInput.jsx`
- 상위 스타일 정책 spec: `specs/spec/green/styles/css-modules-spec.md` §7

### 4.2 외부 의존
- 패키지: 없음 (수동 절차)
- 브라우저: 운영자 로컬 환경 (Chrome / Edge DevTools)

### 4.3 역의존 (사용처)
- REQ-20260418-011 (`Toaster.hideToaster` className 덮어쓰기 / `crypto.randomUUID()` 정리) — 본 체크리스트로 회귀 방어
- 후속 CSS Modules 2단계 (다른 컴포넌트 이행) — 본 템플릿 복제 대상

## 5. 수용 기준 (Acceptance)
- [ ] [WIP] `docs/testing/toaster-visual-smoke.md` (또는 planner 가 정한 위치) 존재
- [ ] [WIP] 골든 패스 4종 각각 (재현 / 기대 시각 / DevTools / 체크박스) 구비
- [ ] [WIP] DevTools 기대 클래스 형식(`_divToasterBottom_<hash> _divToasterSuccess_<hash>` 등) 명시
- [ ] [WIP] 재사용 안내 섹션 (다른 컴포넌트 이행 시 템플릿 복제 방법) 포함
- [ ] [WIP] baseline 1회 운영자 수행 — 모든 체크박스 `[x]` 마감 예시 기록
- [ ] [WIP] 자동화 후보(Playwright/Storybook/Chromatic) 링크 또는 비교표
- [ ] [WIP] markdown 시각 체크리스트(`markdown-render-smoke-spec.md`) 와 디렉토리/형식 일관

> 관련 요구사항: REQ-20260418-010 §10

## 6. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 실행 시간 | N/A | ≤5분/회 | NFR-01 |
| 유지보수성 | N/A | 다른 컴포넌트 이행 시 템플릿 재사용 가능 | NFR-02 ("복제 후 수정" 가이드 존재) |
| 일관성 | N/A | markdown 시각 체크리스트와 같은 디렉토리/형식 | NFR-03 |

## 7. 알려진 제약 / 이슈
- 수동 체크 의존 — 형식적 `[x]` 남발 위험. DevTools 클래스 형식 비교를 강제 항목으로 완화 (REQ §12 위험 1).
- Toaster 코드 변경(REQ-20260418-011) 과 baseline 갱신이 비동기로 진행될 수 있음. 두 작업 PR 순서는 planner 가 조율 (REQ §12 위험 2).
- 다른 컴포넌트 이행 시 4 블록 구조가 부적합할 가능성 — 첫 재사용 시 형식 회고 1회 (REQ §12 위험 3).
- 자동화(Playwright) 도입 시 중복 비용 — 도입 시 본 문서를 시나리오 소스로 흡수.

## 8. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-010) | Toaster CSS Modules 수동 시각 스모크 체크리스트 도입 (WIP) | all |

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-css-modules-pilot-visual-checklist.md`
- 관련 spec:
  - `specs/spec/green/styles/css-modules-spec.md` §7 (DevTools 확인 항목)
  - `specs/spec/green/testing/markdown-render-smoke-spec.md` (자매 체크리스트, 형식 정렬 대상)
  - (예정) `specs/spec/green/components/Toaster-spec.md` (REQ-20260418-011)
- 원 followup: `specs/followups/consumed/2026/04/18/20260418-1422-toaster-modules-visual-verify.md`
- 직전 태스크: `specs/task/done/2026/04/18/20260418-css-modules-toaster-pilot/`
- 외부 참고:
  - Playwright snapshots: https://playwright.dev/docs/test-snapshots
  - Storybook visual testing: https://storybook.js.org/docs/writing-tests/visual-testing
