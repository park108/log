# 명세: Log 도메인 mutation 런타임 수동 스모크 체크리스트

> **위치**:
> - `docs/testing/log-mutation-runtime-smoke.md` (신규, WIP — 위치는 planner 가 조정 가능)
> - 참조 컴포넌트:
>   - `src/Log/Writer.jsx` 의 `createLogMutation` / `updateLogMutation` 콜백
>   - `src/Log/LogItem.jsx` 의 `deleteMutation` 콜백
>   - `src/Log/hooks/useCreateLog.js`, `useDeleteLog.js`, (예정) `useUpdateLog.js`
> **유형**: Test / Operational Checklist (수동 스모크)
> **최종 업데이트**: 2026-04-20 (by inspector, drift reconcile — `log-mutation-runtime-smoke.md` 문서 신설 완료 + `useUpdateLog.js` 머지 완료 ACK)
> **상태**: Active (문서 신설 완료 / 운영자 baseline + Mut-Update 시나리오 확장 잔여)
> **관련 요구사항**:
> - REQ-20260419-008 (`specs/requirements/done/2026/04/19/20260419-log-mutation-runtime-smoke-checklist-doc.md`) — 본 체크리스트 신설
> - REQ-20260418-033 (mutation 훅 3종 도입, done) — §3.3.1.7 의 "운영자 1회 검증" Could 항목의 인프라
> - REQ-20260419-007 (LogList 통합, ready) — MC-06 ("create → list 자동 갱신") 시나리오의 PASS 조건 트리거

> 본 문서는 **Log 도메인 mutation 경로(Create/Delete/Update) 의 dev/prod 런타임 E2E 흐름을 사람 1회 점검으로 검증하는 수동 스모크 체크리스트**의 SSoT.
> MSW 기반 자동 테스트가 커버하지 못하는 **실 POST / navigate / 토스터 / 임시저장 DB 반영 / 404 진입 / 캐시 제거** 등 관찰 영역을 담당한다.
> 자동화(Playwright/Cypress) 도입은 REQ-20260418-031 영역, 본 명세는 수동 baseline.

---

## 1. 역할 (Role & Responsibility)
MSW 단위/통합 테스트가 잡지 못하는 **dev/prod 서버 연동 mutation E2E 흐름** 의 회귀를 사람의 1회 점검(≤60분) 으로 조기 발견한다.

- 주 책임:
  - Mut-Create / Mut-Delete 시나리오 매트릭스 8+ 건 제공 (Mut-Update 는 `useUpdateLog` 머지 시점에 확장)
  - 각 시나리오 (절차 / 예상 결과 / 결과 기록 칸) 표준화
  - 환경 매트릭스 (브라우저 × OS × 백엔드 환경) 기록
  - 향후 `useUpdateLog` / 추가 mutation 훅 확장 가이드
- 의도적으로 하지 않는 것:
  - 자동 E2E (Playwright/Cypress) — REQ-20260418-031 영역
  - Comment / File / Image / Search / Monitor 도메인의 mutation 흐름 — 별 spec
  - 체크리스트 1회 실행 자체(PASS 보고) — 본 spec 은 **문서 신설** 까지만; 실행은 별 task
  - 백엔드 API / DB 스키마 검증 — 운영 책임

> 관련 요구사항: REQ-20260419-008 §3 (Goals)

## 2. 현재 상태 (As-Is) — 2026-04-20 기준 (drift reconcile)
- [x] `docs/testing/log-mutation-runtime-smoke.md` **존재** — 신설 완료 (commit `bba167b`, task `20260419-log-mutation-runtime-smoke-checklist-doc`; 2026-04-20 inspector drift reconcile)
- [x] 유사 패턴 5종 정착: `markdown-render-smoke.md`, `web-vitals-runtime-smoke.md`, `tanstack-query-devtools-smoke.md`, `toaster-visual-smoke.md`, `styles-cascade-visual-smoke.md`
- [x] mutation 훅 3종 도입 — `src/Log/hooks/useCreateLog.js`, `useDeleteLog.js`, `useUpdateLog.js` (REQ-20260418-033 §3.3.1.1; `useUpdateLog.js` 머지 완료 — 2026-04-20 src 실측 확인)
- [ ] Mut-Update (MU-01~) 시나리오 확장 — 본 spec §3.2.3 범위 내 예정 (별 라운드)
- 직전 followup 2건(동일 패턴):
  - `specs/followups/consumed/2026/04/19/20260419-0223-writer-create-manual-smoke-unverified.md` (Writer create 5 시나리오 unverified)
  - `specs/followups/consumed/2026/04/19/20260418-1811-logitem-delete-manual-smoke-unverified.md` (LogItem delete 2 경로 unverified)

> 관련 요구사항: REQ-20260419-008 §2 배경

## 3. 체크리스트 구성 (To-Be, WIP)
> 관련 요구사항: REQ-20260419-008 FR-01 ~ FR-10

### 3.1 문서 위치
- 기본: `docs/testing/log-mutation-runtime-smoke.md` (기존 5종 smoke 문서와 동일 디렉토리)
- 대안: `specs/` 하위 또는 `docs/operations/` — planner 결정 (REQ-008 §13 미결)

### 3.2 시나리오 매트릭스 (FR-02, FR-03, FR-10)

각 시나리오는 (시나리오 ID / 절차 / 예상 결과 / 결과 기록 칸 / 조건부 적용 플래그) 로 구성.

#### 3.2.1 Mut-Create (MC-01 ~ MC-06)
| ID | 시나리오 | 절차 요약 | 예상 결과 | 조건 |
|----|---------|----------|----------|------|
| MC-01 | 관리자 create 성공 | 관리자 로그인 → `/log/write` → 5자 이상 입력 → Submit | POST 200 → "The log posted." 토스터 → `/log/{newTimestamp}` navigate → 단건 뷰 진입 | 필수 |
| MC-02 | 비관리자 리다이렉트 | 비관리자 → `/log/write` 진입 | `/log` 로 리디렉션 | 필수 (자동 테스트 보조) |
| MC-03 | POST 5xx 실패 | 백엔드 5xx 응답 유도 | "Posting log failed." 토스터 | 필수 |
| MC-04 | 네트워크 오프라인 | 브라우저 오프라인 모드 | "Posting log network error." 토스터 | 필수 |
| MC-05 | 임시저장 (temporary) | 임시저장 체크박스 on → 저장 | DB `temporary: true` 저장 → LogList 의 `✍️` 마커 노출 | 필수 |
| MC-06 | create → list 자동 갱신 | Create 성공 후 `/log` 진입 | 신규 항목 즉시 목록 상단 노출 | **조건부** — REQ-20260419-007 (LogList useLogList 통합) 머지 전: N/A / 머지 후: PASS 조건 X |

#### 3.2.2 Mut-Delete (MD-01 ~ MD-03)
| ID | 시나리오 | 절차 요약 | 예상 결과 | 조건 |
|----|---------|----------|----------|------|
| MD-01 | LogItem 삭제 → list 갱신 | LogItem 삭제 액션 호출 → DELETE 200 | 항목이 list 에서 자연 제거 (REQ-007 머지 후) 또는 `props.deleted()` 콜백으로 부모 갱신 | 필수 |
| MD-02 | 삭제 후 단건 진입 | 삭제 후 `/log/{deletedTimestamp}` URL 직접 진입 | 404 화면 또는 빈 응답 처리 | 필수 |
| MD-03 | DELETE 실패 | DELETE 5xx 또는 네트워크 실패 | 에러 토스터 노출 — **현재 LogItem 은 `onError` log 만** → 본 체크리스트가 결함 발굴 트리거. **REQ-20260419-014 로 후속 정리 예약(ready, WIP)** — 머지 후 `"Deleting log failed."` (5xx) / `"Deleting log network error."` (network) 토스터 노출이 PASS 조건. 상세는 `server-state-spec.md` §3.3.1.9. | 조건부 (현 회귀 baseline 박제용) |

#### 3.2.3 Mut-Update (MU-??, 향후 확장)
- `useUpdateLog` (TSK-20260418-MUT-UPDATE) 머지 시점에 MU-01 ~ MU-NN 추가.
- 최소 제안 시나리오: 기존 항목 수정 성공 / 5xx 실패 토스터 / 네트워크 오프라인 토스터 / detail 캐시 갱신 검증.
- 본 spec §3.5 "향후 확장 가이드" 에 메타(파일:식별자, 시나리오 ID) 안내.

### 3.3 환경 매트릭스 (FR-04)
각 세션에 다음 필드를 표로 기록:

| 필드 | 예시 | 메모 |
|------|------|------|
| 브라우저 + 버전 | Chrome 134, Firefox 126, Safari 18, ... | ≥1 필수 |
| OS | macOS 14, Windows 11, iOS 17, ... | ≥1 필수 |
| 백엔드 환경 | dev (`npm start`) / staging / prod | 시나리오별 개별 표기 |
| 자격증명 | admin (MC-01/02/05/MD-??) / 비관리자 (MC-02) | 시나리오 prefix 로 표시 |
| 커밋 해시 | `git rev-parse HEAD` 출력 | 박제 필수 |

- 권장 최소 조합: **Chrome + macOS + dev 1조합** (60분 내 마감 전제).
- 운영 부담에 따라 Firefox/Safari 추가는 Should.

### 3.4 결과 기록 포맷 (FR-05)
각 시나리오 row 에:
- `[x] PASS` / `[x] FAIL (메모)` / `[x] N/A (조건 미충족)` 중 1개 체크.
- Network 탭 스크린샷/응답 헤더는 FAIL 시 첨부 권장 (Should).
- 체크리스트 마감 시 문서 하단 "수행 로그" 섹션에 운영자/일자/환경/커밋 해시 기록.

### 3.5 향후 확장 가이드 (FR-06)
- **`useUpdateLog` 도입 시 체크리스트 갱신 절차**:
  1. §3.2.3 에 MU-01 ~ MU-NN 테이블 row 추가.
  2. 각 row 의 "절차 요약" 에 Writer edit 경로의 `updateLogMutation.mutate(...)` 콜백 진입 조건 명시.
  3. 시나리오 ID prefix 는 `MU-`.
  4. TSK-20260418-MUT-UPDATE 의 DoD 에 본 체크리스트 갱신을 명시 (planner 가 task 생성 시 강제 — REQ-008 §12 위험 완화).
- 신규 mutation 훅(예: bulk delete) 추가 시 동일 패턴.

### 3.6 spec 링크 (FR-07)
- `server-state-spec.md` §3.3 또는 새 §3.3.1.8 에서 본 문서로 링크 (inspector 영역).
- 본 spec 은 `server-state-spec.md` §3.3.1.5 ("Log.test.jsx 신규 케이스") 가 자동 커버 못 하는 운영 환경 검증 슬롯 역할.

### 3.7 비-목표 명시 (FR-08)
- 자동화(Playwright/Cypress) 는 REQ-20260418-031 영역. 본 문서는 수동만.
- 본 체크리스트는 **실행(PASS 보고) 자체는 범위 밖** — 문서 신설까지만. 실행은 별 task.

### 3.8 형식 일관성 (FR-09)
기존 5종 smoke 문서와 헤더 ≥80% 일치 권장:
- `## 범위 (Scope)`
- `## 절차 (Steps)`
- `## 시나리오 매트릭스 (Scenarios)`
- `## 환경 매트릭스 (Environment)`
- `## 결과 기록 (Results)`
- `## 향후 확장 가이드 (Future Extension)`
- `## 수행 로그 (Execution Log)` — 박제용 하단 섹션

## 4. 의존성

### 4.1 내부 의존
- 본 체크리스트는 `Writer.jsx`, `LogItem.jsx`, `useCreateLog`, `useDeleteLog` (향후 `useUpdateLog`) 런타임 동작을 관찰 대상으로 함.
- spec 의존: `server-state-spec.md` §3.3 (파일럿 commitment)

### 4.2 외부 의존
- 패키지: 없음 (수동 절차)
- 환경: dev 서버(`npm start`) + admin 로그인 자격증명 / staging / prod
- 백엔드 API: POST /log, DELETE /log (향후 PUT /log)

### 4.3 역의존 (사용처)
- REQ-20260418-033 §3.3.1.7 "운영자 1회 검증" Could 항목 — 본 체크리스트가 인프라 제공
- REQ-20260419-007 (LogList 통합) — MC-06 PASS 조건 트리거
- 장래 TSK-20260418-MUT-UPDATE — MU-?? 시나리오 확장 트리거

## 5. 수용 기준 (Acceptance)
- [ ] `docs/testing/log-mutation-runtime-smoke.md` 파일이 생성됨
- [ ] FR-01 ~ FR-10 모두 충족 (본 spec §3 의 모든 섹션 반영)
- [ ] 시나리오 8건(MC-01~06 + MD-01~03) + 환경 매트릭스 + 결과 기록 칸이 빈 baseline 상태로 생성 가능
- [ ] `server-state-spec.md` §3.3 에서 본 문서로 링크 추가 (inspector 영역)
- [ ] 향후 확장 가이드(FR-06) 가 `useUpdateLog` 추가 절차 메타를 1줄씩 안내
- [ ] (Should) 기존 5종 smoke 문서와 헤더 ≥80% 일치 (FR-09)
- [ ] **[WIP] baseline 1차 운영자 수행 — §수행 로그 테이블 ≥ 1 행 박제** (REQ-20260419-017 로 이관, 60분 3 체크리스트 묶음 세션)

### 5.1 [WIP] REQ-20260419-017 수용 기준 (묶음 baseline 1차 운영자 수행)
> 관련 요구사항: REQ-20260419-017 §10; 상세는 `specs/spec/green/styles/css-modules-spec.md` §10.8

- [ ] `docs/testing/log-mutation-runtime-smoke.md` §수행 로그 테이블 1행 박제 (MC-01 ~ MC-06 + MD-01 ~ MD-03 8 시나리오 PASS/FAIL count 포함).
- [ ] 환경 매트릭스 = Chrome 130+ + macOS 14 + `npm run dev` 1조합 (FR-09).
- [ ] 박제 형식 = 일자 / 운영자 (park108) / 환경 / 커밋 해시 / 결과 요약 / 노트 6칸 (FR-07).
- [ ] MD-03 결과가 FAIL 인 경우 REQ-20260419-014 의 우선순위 baseline 으로 reference (FR-05).
- [ ] FAIL 시나리오마다 1 followup 파일 생성 (`specs/followups/{date}-{slug}.md`, FR-06).
- [ ] MC-06 (create → list 자동 갱신) 은 REQ-20260419-007 머지 후 PASS 조건 충족. 미머지 시 `[x] N/A` 로 기록 가능 (§3.2.1 조건부).
- [ ] 본 spec §5 마지막 체크박스 `[x]` 로 전환 (별 inspector 라운드).

## 6. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 실행 시간 | N/A | ≤60분/회 | NFR-01 (8 시나리오 × 평균 7분) |
| 일관성 | N/A | 기존 5종 문서 구조와 ≥80% 일치 | NFR-02 |
| 추적성 | N/A | 시나리오 ID ↔ task ID 1:N 매핑 | NFR-03 |
| 유지보수성 | N/A | 신규 mutation 훅 추가 시 1 PR 내 ≤5분 갱신 | NFR-04 |

## 7. 알려진 제약 / 이슈
- 사람 판단 의존 — PASS 남발 위험. "수행 로그" 섹션에 환경/해시 강제로 완화.
- MC-06 의 "조건부 N/A" 표기 가 혼선 유발 가능 — REQ-007 머지 전/후 두 줄 명시 완화 (REQ-008 §12 위험 1).
- MD-03 (DELETE 실패 토스터 부재) 는 현 LogItem 의 UX 결함 — 본 체크리스트가 결함 발굴 트리거 (별 후속 후보, REQ-008 §13 미결).
- 자동화(REQ-031) 도입 시 본 문서 중복 — 도입 시 수동-only baseline 으로 격리 (REQ-008 §12 위험 5).

## 8. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-19 | (pending, REQ-20260419-008) | Log 도메인 mutation 런타임 스모크 체크리스트 문서 spec 신설 (WIP) | all |
| 2026-04-19 | (pending, REQ-20260419-014) | MD-03 시나리오 메모에 REQ-014 후속 정리 예약 cross-link (Deleting log failed./Deleting log network error. 토스터 노출이 PASS 조건) (WIP) | 3.2.2 |
| 2026-04-19 | (pending, REQ-20260419-017) | §5.1 묶음 baseline 1차 운영자 수행 수용 기준 이관 (60분 3 체크리스트 묶음 세션) (WIP) | 5, 5.1 |
| 2026-04-20 | (inspector drift reconcile) | §2 As-Is 정정: `docs/testing/log-mutation-runtime-smoke.md` 부재 → 존재 (commit `bba167b`, task `20260419-log-mutation-runtime-smoke-checklist-doc`); mutation 훅 2종 → 3종 (useUpdateLog.js 머지 완료, src 실측). Mut-Update 시나리오 확장은 별 라운드로 이관. 커밋 영향: 본 spec 단독. | 2 |
| 2026-04-19 | (pending, REQ-20260419-027) | §3.2.2 MD-03 row 비고 갱신 + Toaster 도입 후 baseline 재수행 트리거 — REQ-014 의 `useDeleteLog.onError` Toaster 머지 후 MD-03 의 "조건부" 표기 → "PASS 조건" 명시, 운영자 baseline 1행 재박제 + 문서 버전 표기(v?) (WIP) | 3.2.2, 5.1 |
| 2026-04-20 | (pending, REQ-20260420-007) | LogList sessionStorage 트릭 purge 코드 실현이 mutation smoke 시나리오 MC-* refresh 동작에 영향 없음 확인 (REQ-20260419-007 drift 회수, 본 spec §3.2.1 invalidateQueries 의존 경로) | 3.2.1 |

## 9. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/19/20260419-log-mutation-runtime-smoke-checklist-doc.md` (REQ-008)
- 관련 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-log-domain-mutation-hooks-usemutation-rollout.md` (REQ-033)
  - `specs/requirements/ready/20260419-loglist-consume-uselogquery-remove-sessionstorage.md` (REQ-007, MC-06 트리거)
- 관련 spec:
  - `specs/spec/green/state/server-state-spec.md` §3.3 (파일럿 commitment)
  - `specs/spec/green/testing/markdown-render-smoke-spec.md` (유사 문서 패턴)
  - `specs/spec/green/testing/web-vitals-runtime-smoke-spec.md` (유사 문서 패턴)
  - `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md` (유사 문서 패턴)
- 원 followup:
  - `specs/followups/consumed/2026/04/19/20260419-0223-writer-create-manual-smoke-unverified.md`
  - `specs/followups/consumed/2026/04/19/20260418-1811-logitem-delete-manual-smoke-unverified.md`
- 외부 참고:
  - TanStack Query `useMutation` docs: https://tanstack.com/query/latest/docs/framework/react/reference/useMutation
