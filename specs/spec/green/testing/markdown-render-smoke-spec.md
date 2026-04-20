# 명세: 마크다운 렌더 시각 스모크 체크리스트

> **위치**:
> - `docs/testing/markdown-render-smoke.md` (신규, WIP — 위치는 planner 가 조정 가능)
> - 참조 컴포넌트: `src/Log/Writer.jsx:258-275`, `src/Log/LogItem.jsx:91-94`
> **유형**: Test / Operational Checklist (수동 스모크)
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-024 baseline 수행 추가)
> **상태**: Active (TSK-15 으로 문서 생성 완료, commit `8d30b12` / baseline 박제 WIP)
> **관련 요구사항**:
> - REQ-20260418-008 (`specs/requirements/done/2026/04/18/20260418-markdown-render-visual-smoke-checklist.md`) — 체크리스트 신설 (완료)
> - REQ-20260418-024 (`specs/requirements/done/2026/04/18/20260418-markdown-render-smoke-baseline-execution.md`) — baseline 1차 운영자 수행 + 결과 박제 (WIP)

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
- [x] `docs/testing/markdown-render-smoke.md` **존재** (TSK-20260418-15, commit `8d30b12`) — 6 픽스처 + "Baseline 수행 예시" 섹션 구조 완성
- [ ] "Baseline 수행 예시" 섹션의 6 픽스처 모두 `[ ]` **미체크** — 1차 baseline 박제되지 않음
- 자동 검증: `src/common/markdownParser.test.js` 185 PASS — HTML 문자열 레벨만 방어
- 시각 검증 공백:
  - `src/App.css`, `src/Log/Log.css`, `src/Log/Writer.css`, `src/Toaster/Toaster.css` 의 cascade 후 결과 미커버
  - Storybook/Playwright/percy 등 도구 부재 (`package.json` 확인)
- 원 followup: "블로커 아님, 수동 체크 혹은 후속 태스크로 시각 회귀 테스트 도입 범위 검토" 명시

> 관련 요구사항: REQ-20260418-008 §2 배경; REQ-20260418-024 §2 배경

## 3. 체크리스트 구성
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

### 3.6.1 [WIP] §LogItem 통합 섹션 후보 (REQ-20260418-027)
> 관련 요구사항: REQ-20260418-027 §13 미결 1

REQ-20260418-027 가 TSK-23 (sanitize 통합) 후속 운영자 수동 스모크 4 픽스처(F1~F4, 상세는 `sanitizeHtml-spec.md` §7.1.1) 를 본 체크리스트의 §LogItem 섹션으로 통합할지 vs `docs/testing/logitem-sanitize-runtime-smoke.md` 단독 파일로 분리할지 — planner 결정. 권장: **본 체크리스트에 §LogItem 신설** (세션 통합 + markdown 렌더 스모크와 같은 세션에 자연스럽게 처리).

**통합 박제 (2026-04-19, commit `cd8a1fe`)**: `docs/testing/markdown-render-smoke.md` §LogItem sanitize runtime smoke 섹션이 신설되어 F1~F4 4 픽스처 + Baseline 수행 기록 테이블이 추가됨. §13 미결 해소 (통합 옵션 채택). F1~F4 운영자 1회 수행은 **REQ-20260419-017 로 이관** — 3 체크리스트 묶음 60분 세션 (log-mutation MC-01~06 + MD-01~03 / LogItem sanitize F1~F4 / FileDrop 시각 회귀 3 관찰점). 상세는 `specs/spec/green/styles/css-modules-spec.md` §10.8 및 `sanitizeHtml-spec.md` §9.1.6.

### 3.7 [WIP] Baseline 1차 운영자 수행 (REQ-20260418-024)
**[deferred: REQ-20260418-024 FR-01~06 운영자 1회 baseline 수행 대기 — `docs/testing/markdown-render-smoke.md` 6 픽스처 `[x]` 0/6 상태 (2026-04-20). 자동 테스트 영역 밖 operator. 세션 통합 권장(§3.7 아래 "세션 통합 기회" 4 REQ 묶음). planner 는 본 §3.7 을 승격 게이트 계산에서 제외.]**
> 관련 요구사항: REQ-20260418-024 FR-01~06, US-01~03

TSK-15 으로 `docs/testing/markdown-render-smoke.md` 가 생성됐으나 6 픽스처 모두 `[ ]` 미체크 상태이고, 본 spec §5 의 마지막 수용 기준 "baseline 1회 운영자 수행 — 모든 체크박스 [x] 마감 예시 기록" 도 `[ ]`. REQ-024 가 본 baseline 수행 + 결과 박제를 전담 한다.

**Phase 1 — Pre-flight**:
- `npm run dev` 기동
- 체크리스트 6 픽스처의 입력 위치(Writer / LogSingle 등) 와 기대 시각 매핑 사전 확인
- 환경 정보 수집: 브라우저 + 버전, OS, 디스플레이 / 다크 모드 여부, 커밋 해시 (`git rev-parse HEAD`)

**Phase 2 — Baseline 수행**:
- 6 픽스처 각각:
  - 입력 → 미리보기/공개 페이지 양쪽 렌더 확인
  - spec/체크리스트의 기대 결과와 일치 시 `[x]`, 불일치 시 `[ ]` 유지 + 관찰 메모
- **한 세션 내 마감 원칙** — 분할 시 환경 일관성 깨짐

**Phase 3 — 박제**:
- `docs/testing/markdown-render-smoke.md` 하단 "Baseline 수행 예시" 섹션에 운영자 / 일자(YYYY-MM-DD) / 커밋 해시 / 브라우저+버전 / 다크/라이트 / 결과 요약 기록.
- REQ-024 result.md 에 baseline 수행 사실 + 박제 위치 reference.

**Phase 4 — spec 동기화**:
- 본 spec §5 의 마지막 `[WIP]` 체크박스 `[x]` 로 전환 (green → planner 가 blue 승격 시점에 반영).
- 변경 이력에 REQ-024 기록.
- 불일치 픽스처 발견 시 별 followup 으로 분기 (본 REQ 범위 외).

**제약**:
- 런타임 코드 변경 0 (`git diff -- src/` → 0).
- 한 세션에서 6 픽스처 모두 마감.

**세션 통합 기회**:
- REQ-20260418-021 (anchor escape 수동 스모크), REQ-20260418-022 (web-vitals INP runtime smoke — spec `specs/spec/green/testing/web-vitals-runtime-smoke-spec.md` 참조), REQ-20260418-023 (focus-visible 시각 검증), REQ-20260418-025 (app 셸 사이드이펙트 스모크) 와 같은 운영자 세션으로 묶음 권장.

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
- [x] `docs/testing/markdown-render-smoke.md` 존재 (TSK-15, commit `8d30b12`)
- [x] 픽스처 6종 각각 (입력 / 기대 시각 / 체크박스 / 접근성 메모) 구비 (TSK-15)
- [x] 실행 절차 3단계 명확 기술 (TSK-15)
- [x] "향후 자동화 후보" 섹션에 Playwright/Storybook 비교표 또는 링크 (TSK-15)
**[deferred: REQ-20260418-024 운영자 baseline (§3.7 defer 참조). planner 승격 게이트 제외.]**
- [ ] [WIP] baseline 1회 운영자 수행 — 모든 체크박스 [x] 마감 예시 기록 (**REQ-20260418-024 로 이관**)

### 5.1 [WIP] REQ-20260418-024 수용 기준
**[deferred: REQ-20260418-024 operator baseline 수행 session 산출물. §3.7 defer 와 동일 차단. 자동 영역(런타임 코드 변경 0 / npm 영향 0)은 baseline PR 에서 검증. planner 는 본 §5.1 unchecked 7 행을 승격 게이트 계산에서 제외.]**
> 관련 요구사항: REQ-20260418-024 §10

- [ ] `docs/testing/markdown-render-smoke.md` 의 6 픽스처 모두 baseline 세션에서 `[x]` (또는 `[ ]` + 사유)
- [ ] 같은 문서 "Baseline 수행 예시" 섹션에 운영자/일자/해시/브라우저+버전/OS/다크 모드 여부 기록
- [ ] 본 spec §5 최종 체크박스 `[x]` (또는 planner 승격 시 blue 에서 반영)
- [ ] 불일치 픽스처 발견 시 `specs/followups/` 에 분기 항목 신규 생성
- [ ] REQ-024 result.md 에 baseline 수행 사실 + 박제 위치 reference
- [ ] 런타임 코드 변경 0 (`git diff -- src/` → 0)
- [ ] `npm test`, `npm run lint`, `npm run build` 영향 0

> 관련 요구사항: REQ-20260418-008 §10; REQ-20260418-024 §10

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
| 2026-04-18 | TSK-20260418-15 (merged, commit `8d30b12`) | `docs/testing/markdown-render-smoke.md` 문서 생성 + 6 픽스처 + Baseline 예시 섹션 구조 완성 | 2, 3, 5 |
| 2026-04-18 | (pending, REQ-20260418-024) | baseline 1차 운영자 수행 + 결과 박제 + spec §5 체크박스 마감 계획 (WIP) | 2, 3.7, 5.1 |
| 2026-04-19 | TSK-20260418-27 (merged, commit `cd8a1fe`) | §LogItem sanitize runtime smoke F1~F4 섹션 신설 — §3.6.1 통합 옵션 채택 박제 | 3.6.1 |
| 2026-04-19 | (pending, REQ-20260419-017) | §3.6.1 에 3 체크리스트 묶음 운영자 baseline 이관 박제 (F1~F4 1행 박제, 60분 1회 세션) (WIP) | 3.6.1 |
| 2026-04-20 | (inspector Phase 2 defer-tag) | §3.7 Baseline 1차 운영자 수행 + §5 체크박스 1 행 + §5.1 REQ-024 수용 기준 7 행에 `[deferred: operator baseline 대기 — 현 baseline 0/6]` 태깅 — 자동 테스트 영역 밖 operator session. 과태깅 방지: §1~3.6/§3.6.1(이미 해소)/§4/§5 완료 4 행(문서 신설·픽스처·절차·자동화 후보)은 active/완료 유지. planner 승격 게이트는 deferred 섹션 제외로 본 spec 승격권 진입. 커밋 영향: 본 spec 단독. | 3.7, 5, 5.1, 8 |
| 2026-04-20 | (inspector Phase 1 drift reconcile) | §3 header rename: `## 3. 체크리스트 구성 (To-Be, WIP)` → `## 3. 체크리스트 구성` — "To-Be, WIP" 리터럴 제거 (planner §4 Cond-3 `^#+ .*To-Be` 매칭 해소). §3.7/§5/§5.1 deferred 태깅은 직전 cycle(87fc1e3) 반영 완료 상태이므로 의미 동일. "WIP" 리터럴은 Cond-1 `[WIP]` tag form 과 다르지만 혼란 방지 차원에서 동시 정리. 섹션 본문·픽스처·체크박스·REQ 참조 전부 유지. 커밋 영향: 본 spec 단독. | 3, 8 |

## 9. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-markdown-render-visual-smoke-checklist.md` (REQ-008)
  - `specs/requirements/done/2026/04/18/20260418-markdown-render-smoke-baseline-execution.md` (REQ-024)
- 관련 spec:
  - `specs/spec/green/common/markdownParser-spec.md` §7 미커버 리스트
  - `specs/spec/green/common/sanitizeHtml-spec.md` (sanitize 후 시각 회귀)
  - `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md` (REQ-025, 세션 통합 후보)
  - `specs/spec/green/testing/web-vitals-runtime-smoke-spec.md` (REQ-022, 세션 통합 후보)
- 원 followup: `specs/followups/consumed/2026/04/18/20260417-2110-markdown-list-visual-regression-unverified.md`
- 자매 REQ: `specs/requirements/ready/20260418-markdown-anchor-text-escape-and-manual-smoke.md` (REQ-021)
- 관련 태스크: `specs/task/done/2026/04/18/20260418-markdown-render-smoke-checklist-doc/` (TSK-15)
- 외부 참고:
  - Playwright snapshots: https://playwright.dev/docs/test-snapshots
  - Storybook visual testing: https://storybook.js.org/docs/writing-tests/visual-testing
