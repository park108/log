# 명세: 마크다운 렌더 시각 스모크 체크리스트

> **위치**:
> - `docs/testing/markdown-render-smoke.md` (신규, WIP — 위치는 planner 가 조정 가능)
> - 참조 컴포넌트: `src/Log/Writer.jsx:258-275`, `src/Log/LogItem.jsx:91-94`
> **유형**: Test / Operational Checklist (수동 스모크)
> **최종 업데이트**: 2026-04-18 (by inspector, WIP)
> **상태**: Experimental (도입 전, 신규 명세)
> **관련 요구사항**: REQ-20260418-008 (`specs/requirements/done/2026/04/18/20260418-markdown-render-visual-smoke-checklist.md`)

> 본 문서는 **렌더 경로 변경(파서/마크다운/CSS) 작업의 회귀 방어를 위한 수동 스모크 체크리스트**의 SSoT.
> 자동 시각 회귀 도구(Playwright/Storybook) 도입은 별 spec, 본 명세는 보완재로 출발한다.

---

## 1. 역할 (Role & Responsibility)
파서 단위 테스트가 잡지 못하는 **CSS 적용 후 시각 회귀**를 사람의 1분 점검으로 조기 발견한다.

- 주 책임:
  - Markdown 픽스처 6종에 대한 입력/기대 시각/체크박스 제공
  - Writer 미리보기 ↔ LogSingle 실제 렌더 비교 절차 표준화
  - 렌더 경로 태스크의 result.md 에 결과를 첨부하는 관행 정착
- 의도적으로 하지 않는 것:
  - 자동 시각 회귀 (Playwright/Storybook/percy) 도입 — 별건
  - CI 게이트화 (사람 판단 영역)
  - 스크린샷 baseline LFS 파이프라인

> 관련 요구사항: REQ-20260418-008 §3 (Goals)

## 2. 현재 상태 (As-Is)
- [ ] `docs/testing/markdown-render-smoke.md` **부재**
- 자동 검증: `src/common/markdownParser.test.js` 185 PASS — HTML 문자열 레벨만 방어
- 시각 검증 공백:
  - `src/App.css`, `src/Log/Log.css`, `src/Log/Writer.css`, `src/Toaster/Toaster.css` 의 cascade 후 결과 미커버
  - Storybook/Playwright/percy 등 도구 부재 (`package.json` 확인)
- 원 followup: "블로커 아님, 수동 체크 혹은 후속 태스크로 시각 회귀 테스트 도입 범위 검토" 명시

> 관련 요구사항: REQ-20260418-008 §2 배경

## 3. 체크리스트 구성 (To-Be, WIP)
> 관련 요구사항: REQ-20260418-008 FR-01~04

### 3.1 문서 위치
- 기본: `docs/testing/markdown-render-smoke.md`
- 대안: `specs/` 하위 — planner 결정 (REQ-008 §13 미결)

### 3.2 픽스처 6종 (FR-02)
각 항목은 (입력 Markdown / 기대 시각 서술 2~3개 / 체크박스 / 접근성 메모 1줄) 4 블록으로 구성:

1. **평탄 UL** — `- a\n- b\n- c`
   - 기대: 동일 들여쓰기 3개 디스크 마커, 줄간격 일정
2. **평탄 OL** — `1. a\n2. b\n3. c`
   - 기대: 1./2./3. 마커, 텍스트 좌측 정렬
3. **중첩 UL** — `- a\n\t- b\n- c`
   - 기대: `b` 가 `a` 안쪽으로 한 단계 들여쓰기, 자식 마커 디스크/원 등 CSS 정책에 맞게 차별
4. **중첩 OL** — `1. a\n\t1. b\n2. c`
   - 기대: 자식 OL 의 카운터가 1 부터 재시작 (CSS `counter-reset` 의도와 일치)
5. **이미지 + 링크 조합** — `[alt](https://example.com) ![cap](https://placehold.co/100)`
   - 기대: 외부 링크가 새 창, 이미지 placeholder 가 100×100 으로 표시
6. **코드 블록 + 인용문 조합** — `\`\`\`js\nconsole.log(1);\n\`\`\`\n> note`
   - 기대: 코드 블록 등폭 폰트 + syntax highlight, 인용문 좌측 보더

### 3.3 기대 시각 서술 형식 (FR-03)
- "어떤 모양이어야 한다" 문장 2~3개 + 보는 포인트 명시
- 선택적 스크린샷 파일 링크 슬롯 (필수 아님 — REQ-008 §13)

### 3.4 실행 절차 (FR-04)
1. `npm run dev` 기동
2. Writer 라우트로 픽스처 입력 → Markdown Converted 미리보기 시각 확인
3. 발행 시뮬 또는 LogSingle 라우트 새로고침 → 동일 픽스처 시각 확인
4. 각 픽스처에 `[ ] pass / [ ] regressed (코멘트)` 기록

### 3.5 result.md 연동 (FR-05, Should)
- 렌더 경로 태스크(파서/마크다운/CSS 변경) 의 result.md 에 본 체크리스트 결과 링크 또는 인라인 체크박스 6종 포함
- task 템플릿 업데이트 여부는 planner 결정

### 3.6 향후 자동화 후보 (FR-06, Could)
- 문서 하단에 Playwright / Storybook visual / Chromatic 비교표 또는 링크 — 도입 ROI 재검토 시 진입점 역할

## 4. 의존성

### 4.1 내부 의존
- 본 체크리스트는 `Writer.jsx`, `LogItem.jsx`, `markdownParser.js` 의 렌더 결과를 관찰 대상으로 함

### 4.2 외부 의존
- 패키지: 없음 (수동 절차)
- 브라우저: 운영자 로컬 환경

### 4.3 역의존 (사용처)
- `REQ-20260418-004` (`bindListItem` 스택 재작성) — 중첩 UL/OL 픽스처 검증
- `REQ-20260418-001` (sanitize markdown HTML output) — 이미지/링크/코드 픽스처 검증
- `REQ-20260418-005` (ErrorBoundary App 통합) — Skeleton/ErrorFallback 시각은 본 체크리스트 범위 밖이지만 같은 result.md 패턴 채택 가능

## 5. 수용 기준 (Acceptance)
- [ ] [WIP] `docs/testing/markdown-render-smoke.md` (또는 정한 위치) 존재
- [ ] [WIP] 픽스처 6종 각각 (입력 / 기대 시각 / 체크박스 / 접근성 메모) 구비
- [ ] [WIP] 실행 절차 3단계 명확 기술
- [ ] [WIP] "향후 자동화 후보" 섹션에 Playwright/Storybook 비교표 또는 링크
- [ ] [WIP] baseline 1회 운영자 수행 — 모든 체크박스 [x] 마감 예시 기록

> 관련 요구사항: REQ-20260418-008 §10

## 6. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 실행 시간 | N/A | ≤10분/회 | NFR-01 |
| 유지보수성 | N/A | 파서/CSS 메이저 변경 시에만 갱신 | NFR-02 |
| 접근성 | N/A | 픽스처마다 접근성 메모 1줄 | NFR-03 |

## 7. 알려진 제약 / 이슈
- 사람 판단 의존 — 형식적 [x] 남발 위험. result.md 에 날짜/환경 기록 강제로 완화 (REQ §12 위험 1).
- 체크리스트가 CSS 메이저 변경 후 갱신 누락될 수 있음 — spec 변경 PR 에서 같이 수정 관례 (REQ §12 위험 2).
- 자동화(Playwright) 도입 시 중복 비용 — 도입 시 본 문서를 부가 시나리오로 흡수 (REQ §12 위험 3).

## 8. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-008) | 마크다운 렌더 수동 스모크 체크리스트 도입 (WIP) | all |

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-markdown-render-visual-smoke-checklist.md`
- 관련 spec:
  - `specs/spec/green/common/markdownParser-spec.md` §7 미커버 리스트
  - `specs/spec/green/common/sanitizeHtml-spec.md` (sanitize 후 시각 회귀)
- 원 followup: `specs/followups/consumed/2026/04/18/20260417-2110-markdown-list-visual-regression-unverified.md`
- 외부 참고:
  - Playwright snapshots: https://playwright.dev/docs/test-snapshots
  - Storybook visual testing: https://storybook.js.org/docs/writing-tests/visual-testing
