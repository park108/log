# 명세: 운영자 수동 브라우저 스모크 체크리스트 통합 Index

> **위치**:
> - `specs/spec/green/testing/operator-manual-smoke-index-spec.md` (본 spec, SSoT)
> - 참조 체크리스트 (spec blue / requirements done 아카이브):
>   - `specs/spec/blue/testing/search-abort-runtime-smoke-spec.md` §3.11 (SA-05 loadingDots throttle)
>   - `specs/spec/blue/testing/logsingle-runtime-smoke-spec.md`
>   - `specs/spec/blue/testing/loglist-seemore-runtime-smoke-spec.md`
>   - `specs/spec/blue/testing/log-mutation-runtime-smoke-spec.md`
>   - `specs/spec/blue/testing/fileitem-delete-visual-smoke-spec.md`
>   - `specs/spec/blue/testing/markdown-render-smoke-spec.md`
>   - `specs/spec/blue/testing/post-merge-visual-smoke-spec.md`
>   - `specs/spec/blue/testing/app-shell-side-effects-smoke-spec.md`
>   - `specs/spec/blue/testing/styles-cascade-visual-smoke-spec.md`
>   - `specs/spec/blue/testing/tanstack-query-devtools-smoke-spec.md`
>   - `specs/spec/blue/testing/toaster-visual-smoke-spec.md`
>   - `specs/spec/blue/testing/web-vitals-runtime-smoke-spec.md`
> **유형**: Test / Operational Index (단일 진입점 문서)
> **최종 업데이트**: 2026-04-20 (by inspector, WIP — REQ-20260420-026 초기 반영)
> **상태**: Experimental (도입 전, 신규 명세)
> **관련 요구사항**:
> - `specs/requirements/ready/20260420-operator-manual-smoke-checklist-index.md` (REQ-20260420-026, 본 index 도입)
> - followup 원전 (4건, 동일 "미수행" 관측):
>   - `specs/followups/consumed/2026/04/20/20260420-0854-search-loadingdots-sa05-manual-unverified.md`
>   - `specs/followups/consumed/2026/04/20/20260420-1750-parsejwt-corrupted-cookie-manual-devtools-verification.md`
>   - `specs/followups/consumed/2026/04/20/20260420-1757-searchinput-manual-verification-unperformed.md`
>   - `specs/followups/consumed/2026/04/20/20260420-1802-manual-ui-verify-logsingle-skeleton.md`

> 본 문서는 **자동화(vitest + jsdom) 경계 밖의 운영자 수동 브라우저 스모크 체크리스트** 를 한 화면에서 순회 실행 가능하게 연결하는 단일 진입점 SSoT.
> 개별 체크리스트 본문은 수정하지 않으며, 링크·실행 트리거·마지막 실행일만 관리한다.

---

## 1. 역할 (Role & Responsibility)

릴리스 직전 / 분기말 / 환경 변경 후 운영자가 **한 번에 돌려야 할** 수동 smoke 체크리스트의 색인 역할.

- 주 책임:
  - 현존 체크리스트 8개+ 를 테이블 1개로 수렴 (영역 / 파일 / 자동화 공백 요지 / 트리거 / 마지막 실행일 / 담당 후보).
  - 최근 followup 이 "미수행(unverified)" 으로 남긴 4 항목을 초기 row 로 박제.
  - 신규 체크리스트 추가 시 row 등록 가이드 (유지보수 프로세스).
- 의도적으로 하지 않는 것:
  - 개별 체크리스트 본문 수정 (기존 문서는 그대로 참조).
  - 자동화 테스트 추가 (jsdom 한계로 불가 전제 유지).
  - 실제 운영자 수행 (후속 배포 주기에 운영자 자신이 수행).
  - Playwright/E2E 도입 (REQ-040 이후).

> 관련 요구사항: REQ-20260420-026 §3 (Goals)

---

## 2. 현재 상태 (As-Is)

- 개별 체크리스트 8개+ 가 `spec/blue/testing/` 및 `requirements/done/**` 에 분산.
- 상호 참조(related docs 링크) 는 존재하나 단일 진입점 부재 — 운영자가 "어떤 것을 돌려야 하는지" 인지 비용 높음.
- 최근 4건 followup 이 연속 "미수행" 관측 (§관련 요구사항 링크 참조).
- 결과: 누락 반복 + 자동화 공백 spec 박제는 있으나 운영자 체크 실행 증거 부재.

---

## 3. 도입 정책

> 관련 요구사항: REQ-20260420-026 FR-01 ~ FR-05

### 3.1 Index 파일 신설 (FR-01)

- 신규 파일 (본 spec 머지 후 planner/developer 가 실제 index 문서 생성):
  - 경로: `docs/testing/operator-manual-smoke-index.md` (권장 — docs 카테고리) **또는** `specs/spec/green/testing/operator-manual-smoke-index.md` (spec 카테고리).
  - inspector 판단: **docs/testing/ 권장** — 운영자 시각으로 "문서" 성격이며 spec/** 는 개발자 SSoT 중심. 최종 선택은 planner 가 태스크 분할 시 확정.
- 본 spec (본 파일) 은 SSoT 로 index 문서의 **표 스키마 + 등록 프로세스** 만 정의. 실제 index 문서 자체는 별 아티팩트.

### 3.2 테이블 스키마 (FR-01, FR-02)

| 영역 | 체크리스트 파일 | 자동화 공백 요지 | 실행 트리거 | 마지막 실행일 | 담당 후보 | 출처 REQ/followup |
|------|----------------|-------------------|-------------|--------------|-----------|-------------------|

**컬럼 의미**:
- **영역**: Search / Log / File / CSP / Auth / Monitor 등 도메인 1 단어.
- **체크리스트 파일**: 상대 경로 링크 (`specs/spec/blue/testing/...` 또는 `specs/requirements/done/YYYY/MM/DD/...`).
- **자동화 공백 요지**: 왜 jsdom 으로 커버 불가인지 1줄 (예: "matchMedia 모바일 폼", "setInterval drift", "Cognito redirect").
- **실행 트리거**: "릴리스 직전" / "분기말" / "환경 변경 후" / "보안 정책 변경" 등.
- **마지막 실행일**: `YYYY-MM-DD` 또는 `unverified` (초기값, 운영자 수동 실행 전).
- **담당 후보**: "운영자" / "릴리스 담당" / "보안 담당" 등 역할 태그.
- **출처 REQ/followup**: followup ID 또는 REQ ID 1건 이상.

### 3.3 최소 초기 row 8건 (FR-02)

본 spec 머지 후 index 문서 생성 시 아래 8 영역을 **최소** row 로 포함. 실제 row 수는 8 이상 (신규 체크리스트 발견 시 누적).

| # | 영역 | 체크리스트 파일 (절대경로 기준) |
|---|------|-------------------------------|
| 1 | Search (SA-05 loadingDots) | `specs/spec/blue/testing/search-abort-runtime-smoke-spec.md` |
| 2 | LogSingle 라우팅 | `specs/requirements/done/2026/04/20/20260419-logsingle-runtime-smoke-checklist-doc.md` 또는 `specs/spec/blue/testing/logsingle-runtime-smoke-spec.md` |
| 3 | LogList SeeMore | `specs/requirements/done/2026/04/20/20260419-loglist-seemore-runtime-smoke-checklist-doc.md` 또는 `specs/spec/blue/testing/loglist-seemore-runtime-smoke-spec.md` |
| 4 | FileItem 삭제 | `specs/requirements/done/2026/04/20/20260419-fileitem-delete-visual-smoke-checklist-doc.md` 또는 `specs/spec/blue/testing/fileitem-delete-visual-smoke-spec.md` |
| 5 | Cognito Hosted UI | `specs/requirements/done/2026/04/20/20260420-cognito-hosted-ui-manual-verify-smoke-doc.md` |
| 6 | CSP Dev HMR | `specs/requirements/done/2026/04/20/20260420-csp-dev-hmr-runtime-smoke-doc.md` |
| 7 | Comment 도메인 | `specs/requirements/done/2026/04/18/20260418-comment-domain-visual-smoke-checklist.md` |
| 8 | Markdown 렌더 | `specs/requirements/done/2026/04/18/20260418-markdown-render-smoke-baseline-execution.md` 또는 `specs/spec/blue/testing/markdown-render-smoke-spec.md` |

> developer 가 태스크 수행 시 실제 파일 존재 검증 + 최종 경로 확정 (아카이브 이동 가능성 주의 — `specs/requirements/done/**` 은 gitignore 상 로컬 전용, 링크는 spec/blue 쪽을 우선).

### 3.4 미수행(unverified) 우선순위 row (FR-03)

다음 4건은 "마지막 실행일 = `unverified`" + 코멘트 `"REQ-20260420-026 시점 followup 지적"` 으로 표기 (출처 followup 경로 박제):

1. **Search SA-05 loadingDots throttle** — `specs/followups/consumed/2026/04/20/20260420-0854-search-loadingdots-sa05-manual-unverified.md`
2. **parseJwt 손상 쿠키 DevTools 검증** — `specs/followups/consumed/2026/04/20/20260420-1750-parsejwt-corrupted-cookie-manual-devtools-verification.md`
3. **SearchInput 모바일/matchMedia UX** — `specs/followups/consumed/2026/04/20/20260420-1757-searchinput-manual-verification-unperformed.md`
4. **LogSingle Skeleton 수동 UI 검증** — `specs/followups/consumed/2026/04/20/20260420-1802-manual-ui-verify-logsingle-skeleton.md`

### 3.5 실행 트리거 분류 (FR-04)

각 row 의 "실행 트리거" 컬럼은 아래 토큰 중 선택:
- **릴리스 직전** (기본) — 모든 row 에 최소 1회 권장.
- **분기말** — 누적 drift 점검용.
- **환경 변경 후** — Vite / Node / React 메이저 버전 bump 시.
- **보안 정책 변경 후** — CSP / Cognito / Auth 정책 수정 시.
- **기능 변경 직후** — 해당 영역 REQ 머지 시 1회.

### 3.6 유지보수 프로세스 (FR-05)

본 spec 머지 후 index 문서 하단에 **"신규 체크리스트 추가 시 이 표에 row 추가"** 1줄 박제. 구체 절차:
1. 새 스모크 체크리스트 아티팩트 머지 후 (spec 또는 requirements done 아카이브).
2. `docs/testing/operator-manual-smoke-index.md` 에 row 1개 append.
3. 출처 REQ / followup ID 박제.
4. 초기 "마지막 실행일 = unverified".

### 3.7 Index 위치 선택 (§13 미결 해소)

REQ §13 의 "green/testing vs blue/testing" 미결은 본 spec 에서 아래로 해소:
- **Index 문서 아티팩트** 는 `docs/testing/operator-manual-smoke-index.md` — `docs/` 경로 (운영자 소비 중심, gitignore 상 push 대상 여부는 planner 재확인).
- **Index SSoT spec** 은 본 파일 `specs/spec/green/testing/operator-manual-smoke-index-spec.md` — 테이블 스키마 / 등록 프로세스만 관리.
- 링크는 `specs/spec/blue/...` (승격된 spec) 우선, 아카이브 경로(`requirements/done/**`) 는 fallback (아카이브는 gitignore 상 로컬 전용 — 링크 안정성 낮음).

### 3.7a [WIP] 이중 뷰 규약 — 원격/로컬 링크 가시성 (REQ-20260420-033)

> 관련 요구사항: REQ-20260420-033 FR-01 ~ FR-05, US-01 ~ US-02

**맥락 (2026-04-20 관측)**: 본 spec 의 index 문서 (`docs/testing/operator-manual-smoke-index.md`) 는 `docs/` 하 tracked 원격 공유 파일이지만, §4 unverified 4 row 및 §2 본문이 `specs/followups/consumed/**` / `specs/requirements/done/**` 경로 (`.gitignore` 로컬 전용) 링크 를 다수 포함한다. GitHub 웹 뷰어에서 index 를 여는 운영자에게는 해당 링크 전량 404 — 탐색 단절 / SSoT 혼동. REQ-20260420-032 의 markdown-link-check CI 는 ignored 경로 skip 이지만 운영자 UX 문제는 독립.

**정책 (이중 뷰 규약)**:

- **원칙 1 — 상단 고지 (FR-01, Must)**: index 상단 (`§0` 또는 header 바로 아래) 에 1~2줄 안내 박제:
  > 본 index 일부 링크 (`specs/followups/consumed/**`, `specs/requirements/done/**`) 는 로컬 전용 (`.gitignore`). 원격 웹 뷰어에서는 404 — **로컬 체크아웃 후 IDE Markdown 뷰어** 사용 권장.
- **원칙 2 — 앵커 대체 우선 (FR-02/FR-03, Should)**: 각 404 가능 링크는 가능한 `specs/spec/blue/testing/*-spec.md` 섹션 앵커로 대체. 대체 불가 (원문 근거 보존 필요) 시 `(로컬 전용)` 접미사 명시 + 상단 고지에 fallback.
- **원칙 3 — 대체 불가 Rationale (FR-02)**: `specs/spec/blue/**` 에 동등 내용이 없는 경우 rationale 1줄 본 spec 하단 또는 row 주석에 박제. inspector 가 green→blue 승격 시 대체 앵커 재검토.
- **원칙 4 — 원격 렌더 smoke (FR-05, Should)**: index 수정 PR 에서 GitHub 웹 뷰어 렌더 확인 1회 — 안내 문구 가시 + 대체 앵커 동작.
- **원칙 5 — `.gitignore` 완화 금지**: 로컬 전용 경로 유지 (본 규약의 근본 전제). 완화는 별 프로세스 REQ.

**적용 범위**: 본 규약은 `docs/testing/operator-manual-smoke-index.md` 전용. 다른 `docs/**/*.md` 로의 확산은 별 REQ (FR Out-of-Scope).

**CI 조화 (REQ-20260420-032 연동)**:
- markdown-link-check 의 `ignorePatterns` 에 `specs/followups/`, `specs/requirements/`, `specs/task/` 포함 → 로컬 전용 링크는 CI skip (warning 없음).
- 원격 접근 사용자 UX 는 원칙 1/2 안내로 흡수 (CI 독립).

### 3.8 (Optional) Playwright 도입 후 관계 — §13 open

- `docs/testing/playwright-*` 도입 시 본 index 는 "수동 소분율" 축소 → 일부 row 는 자동화로 승격 후 제거 (별 REQ).
- React 19 bump (REQ-040) 이후의 과도기 운영 프로세스 — Playwright 도입 전까지 본 index 가 유일한 통합 진입점.

---

## 4. 의존성

### 4.1 상류 의존
- 개별 체크리스트 REQ 들 (모두 done) — §3.3 리스트.
- 4개 unverified followup — §3.4 리스트.

### 4.2 하류 영향
- Playwright/E2E 도입 REQ (미래, React 19 bump 후).

### 4.3 인접 spec
- `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md` — 패턴 참조.
- `specs/spec/blue/testing/*-smoke-spec.md` — index 참조 대상.

---

## 5. 수용 기준 (Acceptance)

### 5.1 REQ-20260420-026 수용 기준

> 관련 요구사항: REQ-20260420-026 §10

- [ ] FR-01: index 문서 경로 확정 (`docs/testing/operator-manual-smoke-index.md` 권장) + 테이블 헤더 박제.
- [ ] FR-02: 현존 체크리스트 최소 8 row 등재.
- [ ] FR-03: 4 followup 관련 row "마지막 실행일 = unverified" + 주석.
- [ ] FR-04: 각 row "실행 트리거" 컬럼 분류 토큰 적용.
- [ ] FR-05: 본문 하단 유지보수 프로세스 1줄 박제.
- [ ] 링크 무결성 수동 확인 — 모든 상대경로 열림 (운영자 수동).
- [ ] 경로는 `specs/spec/blue/...` 또는 `specs/requirements/done/YYYY/MM/DD/...` 기준.

### 5.2 NFR 박제 (REQ §7)

- [ ] NFR-01 유지보수성: row 1개 추가 git diff ≤ 5 라인.
- [ ] NFR-02 발견성: 파일명 `operator-manual-smoke-index.md` — `specs/spec/green/testing/` 진입 시 알파벳 정렬 상위.
- [ ] NFR-03 추적성: 모든 unverified row 에 source followup / REQ ID 박제.

### 5.3 grep 회귀 차단

- `grep -rn "operator-manual-smoke-index" specs/` ≥ 1 (본 spec + index 문서).
- index 문서 삭제 또는 링크 끊김 회귀 시 운영자 followup 재발화 (§5.1 성공 지표 연동).

### 5.4a REQ-20260420-033 수용 기준 (원격 404 링크 표기 이중 뷰 규약)

> 관련 요구사항: REQ-20260420-033 FR-01 ~ FR-05, US-01 ~ US-02

- [ ] **FR-01 (Must)**: `docs/testing/operator-manual-smoke-index.md` 상단에 "로컬 전용 링크" 안내 1~2줄 박제
- [ ] **FR-02 (Should)**: §4 unverified 4 row 중 최소 1건이 `specs/spec/blue/testing/*-spec.md` 섹션 앵커로 대체 (또는 rationale 기록 후 유지)
- [ ] **FR-03 (Should)**: §2 본문 `specs/requirements/done/**` 참조 중 원격 접근 필요분 앵커 대체
- [ ] **FR-04 (Must)**: inspector 가 본 spec §3.7a 이중 뷰 규약 박제 (본 세션 기 완료)
- [ ] **FR-05 (Should)**: PR 시 GitHub 웹 뷰어 렌더링 1회 smoke 확인
- [ ] REQ-20260420-032 CI 도입 후 본 index CI PASS (ignore 패턴 정합)

### 5.4 REQ-20260420-034 수용 기준 ("마지막 실행일" 갱신 강제 프로세스 + 미수행 smoke 수행)

> 관련 요구사항: REQ-20260420-034 FR-01 ~ FR-08, US-01 ~ US-04

- [ ] **축 A (FR-01/FR-02)**: 릴리스 runbook (`docs/releases/`, 없으면 신설 최소 scope) 또는 PR 템플릿에 "`operator-manual-smoke-index.md §2` 의 해당 도메인 row `마지막 실행일` 갱신 확인" 1줄 체크 항목 박제
- [ ] **축 B (FR-08 Should)**: inspector agent 규약 갱신 — unverified row 수 주기 집계 (별 REQ carve 권장)
- [ ] **축 C (FR-03/FR-04)**: Search TanStack Query 5항목 운영자 수행 + `docs/testing/operator-manual-smoke-index.md` §2 Search row `마지막 실행일` 에 ISO-8601 갱신
- [ ] **축 C (FR-05/FR-06)**: 링크 무결성 수동 smoke 운영자 수행 + 해당 row 갱신 + 발견 문제는 followup 생성
- [ ] **축 C (Monitor)**: Monitor focus-visible smoke 운영자 수행 + 해당 row 갱신 (followup `20260420-1048-monitor-focus-visible-manual-smoke-unverified.md` 해소)
- [ ] §6 High 위험 항목에 완화 기전 3-축 박제 완료 (inspector — 본 세션 기에 완료)
- [ ] 전체 13 row 중 `unverified` row 수가 base 대비 ≥3건 감소

---

## 6. 알려진 제약 / 이슈

- index 가 유지되지 않으면 stale link 발생 위험 (REQ §12) — 완화: FR-05 등록 가이드 + inspector 사이클에서 link 무결성 grep.
- 운영자가 "마지막 실행일" 갱신을 잊을 위험 (High) — 완화 기전 (REQ-20260420-034 §3 3-축):
  - **축 A (릴리스 게이트)**: 릴리스 runbook (또는 PR 템플릿) 에 "본 릴리스 변경 범위 도메인 row 의 `마지막 실행일` 갱신 확인" 1줄 체크 항목 (FR-01/FR-02). 스코프는 릴리스 대상 도메인 row 만 (전체 13 row 매회 강요 아님).
  - **축 B (주기 집계)**: inspector 주기 실행 시 `grep -c "unverified\|(미수행)"` 로 미갱신 row 수 집계, 50% 초과 또는 30일 미갱신 임계치 초과 시 followup 재발화 (inspector agent 규약 갱신은 별 REQ, FR-08 Should).
  - **축 C (미수행 smoke 수행)**: Search TanStack Query 5항목 (cache hit / staleTime / race / HTTP 500 UX / loadingDots) + 링크 무결성 수동 검증 + Monitor focus-visible smoke 운영자 수행 후 해당 row 갱신 (FR-03/FR-05).
- 아카이브 경로 안정성: `specs/requirements/done/**` 이동 가능성 주의 — 가급적 `spec/blue/testing/` 쪽을 우선 링크.

---

## 7. 변경 이력

| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-20 | (pending, REQ-20260420-026) | 본 spec 초안 신설 — 4 followup 병합, 운영자 수동 smoke index SSoT 박제 (WIP) | all |
| 2026-04-20 | (pending, REQ-20260420-034) | §6 High 위험 항목에 3-축 완화 기전 박제 (축 A 릴리스 게이트 / 축 B inspector 주기 집계 / 축 C 미수행 smoke 수행). §5.4 신설 — Search TanStack 5항목 + 링크 무결성 + Monitor focus-visible 운영자 smoke 수행 수용 기준. (WIP) | 5.4, 6 |
| 2026-04-20 | (pending, REQ-20260420-033) | §3.7a 신설 — 이중 뷰 규약 (원격/로컬 링크 가시성). 원칙 5종 (상단 고지 / 앵커 대체 우선 / rationale / 원격 렌더 smoke / `.gitignore` 완화 금지). §5.4a 신설 — 수용 기준 5항목. `specs/followups/consumed/**` / `specs/requirements/done/**` 로컬 전용 경로 404 문제 완화. REQ-032 CI 와 조화 (ignore 패턴 정합). (WIP) | 3.7a, 5.4a |

## 8. 관련 문서
- 기원 요구사항: `specs/requirements/ready/20260420-operator-manual-smoke-checklist-index.md`
- 관련 spec: `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md`, `specs/spec/blue/testing/*-smoke-spec.md` (총 12+ 파일)
- 관련 followup: §3.4 unverified 4건
