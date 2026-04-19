# 명세: TanStack Query Devtools 런타임 스모크 체크리스트

> **위치**:
> - `docs/testing/tanstack-query-devtools-smoke.md` (신규, WIP — 위치는 planner 가 조정 가능)
> - 참조 코드: `src/App.jsx:3-4, 15-19, 98-103`
> **유형**: Test / Operational Checklist (수동 스모크, 재사용)
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-016)
> **상태**: Experimental (도입 전, 신규 명세)
> **관련 요구사항**: `specs/requirements/ready/20260418-tanstack-query-devtools-smoke-checklist.md` (REQ-20260418-016)

> 본 문서는 **TanStack Query Devtools 의 DEV 가시성 + PROD 미노출** 회귀 방어용 수동 스모크 체크리스트 SSoT.
> 자매 체크리스트(`toaster-visual-smoke-spec`, `markdown-render-smoke-spec`, `styles-cascade-visual-smoke-spec`) 와 디렉토리/형식을 일치시킨다.

---

## 1. 역할 (Role & Responsibility)
자동 grep 만으로는 보장되지 않는 **실제 브라우저 런타임에서 Devtools 플로팅 패널의 DEV 가시 / PROD 미노출** 을 1회 3분 내 점검.

- 주 책임:
  - 4개 항목 (DEV 콘솔 클린 / DEV Devtools 가시 / PROD 미노출 3중 / 번들 grep) 제공
  - 각 항목의 DevTools 확인 포인트 (좌표 / Network / Sources) 명시
  - Provider 도입 직후 baseline 기록 + 향후 Provider/Devtools 변경 시 재사용
- 의도적으로 하지 않는 것:
  - Devtools 자체 기능 검증 (TanStack 책임 영역)
  - 프로덕션 번들 사이즈 측정 자동화 (별 후보)
  - Devtools 대체 도구 도입

> 관련 요구사항: REQ-20260418-016 §3 (Goals)

## 2. 현재 상태 (As-Is)
- [ ] `docs/testing/tanstack-query-devtools-smoke.md` **부재**
- Provider 도입 완료: `task/done/2026/04/18/20260418-tanstack-query-provider/` (커밋 `ee87219`).
- 자동 검증 결과:
  - `npm test` 25 파일 / 185 PASS — Provider 마운트 어서션 포함.
  - `npm run build` 성공.
  - `grep -l "ReactQueryDevtools\|react-query-devtools" build/assets/*.js` → 0 (PROD 미포함).
- 자동 검증 불가 항목:
  - DEV 화면 우측 하단 React Query 로고 노출 여부
  - DEV 콘솔 에러 / 경고 0
  - `npm run preview` 의 실제 PROD 경험

> 관련 요구사항: REQ-20260418-016 §2 배경

## 3. 체크리스트 구성 (To-Be, WIP)
> 관련 요구사항: REQ-20260418-016 FR-01~08

### 3.1 문서 위치
- 기본: `docs/testing/tanstack-query-devtools-smoke.md`
- 대안: `docs/testing/visual-smoke/tanstack-query-devtools.md` — planner 결정 (REQ-016 §13 미결).

### 3.2 항목 1: DEV 콘솔 클린
- 절차: `npm run dev` → `/log` 진입 → DevTools Console 패널.
- 기대: React / Vite / Query 관련 에러 / 경고 0 건.
- 체크박스: `[ ] pass / [ ] regressed (캡처 + 코멘트)`.

### 3.3 항목 2: DEV Devtools 플로팅 버튼 노출
- 절차: 동일 `npm run dev` 세션에서 화면 우측 하단 확인 → React Query 로고 클릭.
- 기대: 로고 노출 (`initialIsOpen=false` 이므로 닫힌 상태), 클릭 시 패널 확장 → 쿼리 목록 또는 안전한 빈 상태.
- 체크박스.

### 3.4 항목 3: PROD 빌드 Devtools 미노출 (3중 검증)
- 절차: `npm run build && npm run preview` 기동 → 브라우저 진입.
- 3중 검증:
  1. **시각**: 화면에 Devtools 로고 없음.
  2. **Network 탭**: `react-query-devtools` 로 검색 → 0 hits.
  3. **Sources 탭**: `react-query-devtools` / `ReactQueryDevtools` 식별자 검색 → 0 hits.
- 체크박스 3개.

### 3.5 항목 4: 번들 grep 자동 백업
- 명령: `grep -l "ReactQueryDevtools\|react-query-devtools" build/assets/*.js`
- 기대: 0 hits (stdout 없음, exit code 1).
- CI 통합 후보: `.github/workflows/ci.yml` 의 빌드 후 스텝에 같은 명령을 `! grep -l ... ` 형태로 추가 (FR-08, Could).

### 3.6 재사용 안내 (FR-06)
- 재실행 트리거:
  - Provider 옵션 변경 (`queryClient` 기본 옵션, `initialIsOpen` 등)
  - `@tanstack/react-query-devtools` 메이저 bump
  - Vite 빌드 옵션 변경 (`define`, `build.rollupOptions` 등)
- 재실행 결과는 해당 PR `result.md` 에 링크 첨부.

### 3.7 baseline 기록 (Must)
- 운영자(park108) 가 4 항목 모두 [x] 로 마감한 상태를 문서에 포함해 PR 머지.
- 기록: 날짜, 브라우저/버전, 환경.

## 4. 의존성

### 4.1 내부 의존
- 관찰 대상: `src/App.jsx:3-4, 15-19, 98-103`
- 빌드 산출물: `build/assets/*.js`
- 상위 spec: `specs/spec/green/state/server-state-spec.md` §3.1, §3.4

### 4.2 외부 의존
- 패키지: `@tanstack/react-query-devtools` (현재 `^5.99.0`)
- 브라우저: 운영자 로컬 Chrome/Edge DevTools (Console / Network / Sources)

### 4.3 역의존 (사용처)
- 향후 Provider 변경 PR
- Devtools 메이저 bump
- 도메인 훅 도입 후 Devtools 사용 빈도 증가

## 5. 수용 기준 (Acceptance — REQ-20260418-016)
- [ ] `docs/testing/tanstack-query-devtools-smoke.md` (또는 planner 가 정한 위치) 존재
- [ ] 4 항목 (DEV 콘솔 / DEV 로고 / PROD 미노출 3중 / grep 백업) 각각 절차 + 체크박스 구비
- [ ] baseline 1회 운영자 수행 — 모든 체크박스 [x]
- [ ] 자매 체크리스트와 디렉토리 / 형식 일관
- [ ] 문서 라인 수 ≥60
- [ ] grep 명령이 CI 화 가능 형태로 명시 (FR-05, NFR-04)

## 6. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 실행 시간 | N/A | ≤3분/회 | NFR-01 |
| 신뢰성 | N/A | 3중 검증 (시각+Network+Sources+grep) | NFR-02 |
| 일관성 | N/A | 자매 체크리스트와 동일 디렉토리/형식 | NFR-03 |
| 자동화 친화성 | N/A | grep 명령 1줄로 PROD 미노출 검증 | NFR-04 |

## 7. 알려진 제약 / 이슈
- Devtools 메이저 bump 시 노출 위치/방식 변경 가능 — 좌표 항목을 "Devtools 위젯 노출" 로 일반화 (REQ §12 위험 1).
- `import.meta.env.DEV` 가 환경 외부 요인으로 잘못 평가될 가능성 — grep 자동 백업으로 즉시 감지 (REQ §12 위험 2).
- 운영자가 grep 단계 스킵 위험 — 4 항목 모두 마감 강제 (리뷰 체크리스트 또는 PR 템플릿에 명시).
- Vite 빌드 옵션 변경 (`define` 추가 등) 으로 치환 동작 변화 가능 — 빌드 단위 grep 으로 회귀 즉시 감지.

## 8. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-016) | Devtools 런타임 스모크 체크리스트 spec 초기화 (WIP) | all |

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-tanstack-query-devtools-smoke-checklist.md` (이동 후)
- 원 followup: `specs/followups/consumed/2026/04/18/20260418-0706-tanstack-devtools-runtime-manual-check.md`
- 직전 태스크: `specs/task/done/2026/04/18/20260418-tanstack-query-provider/`
- 관련 spec: `specs/spec/green/state/server-state-spec.md` §3.1, §3.4
- 자매 spec:
  - `specs/spec/blue/testing/toaster-visual-smoke-spec.md`
  - `specs/spec/blue/testing/markdown-render-smoke-spec.md`
  - `specs/spec/green/testing/styles-cascade-visual-smoke-spec.md`
- 자매 REQ:
  - `specs/requirements/ready/20260418-styles-cascade-visual-baseline-checklist.md` (REQ-015)
  - `specs/requirements/ready/20260418-tanstack-query-test-util-renderwithquery.md` (REQ-013, 테스트 환경 별도)
- 외부: https://tanstack.com/query/v5/docs/framework/react/devtools
