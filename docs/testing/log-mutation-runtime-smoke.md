# Log 도메인 mutation 런타임 수동 스모크 체크리스트

> SSoT: `specs/spec/blue/testing/log-mutation-runtime-smoke-spec.md`
> 기원 요구사항: `specs/requirements/done/2026/04/19/20260419-log-mutation-runtime-smoke-checklist-doc.md` (REQ-20260419-008)
> 도입 태스크: TSK-20260419-LOG-MUT-SMOKE-DOC
> 자매 문서: `docs/testing/markdown-render-smoke.md`, `docs/testing/web-vitals-runtime-smoke.md`, `docs/testing/tanstack-query-devtools-smoke.md`, `docs/testing/toaster-visual-smoke.md`, `docs/testing/styles-cascade-visual-smoke.md`

## 범위 (Scope)

`POST /log` / `DELETE /log` (향후 `PUT /log`) 의 **dev / prod 런타임 E2E 흐름**을 사람 1회 점검(≤60분)으로 검증한다. 구체적으로는 MSW 기반 자동 테스트가 커버하지 못하는 다음 6 경계를 대상으로 한다.

- 실 네트워크 POST / DELETE 의 HTTP 상태 · 응답 헤더.
- 성공 / 실패 토스터 메시지의 실제 DOM 노출.
- Submit 후 `navigate('/log/{newTimestamp}')` 등 router 전환.
- 임시저장(`temporary: true`) DB 반영 및 LogList `✍️` 마커.
- 삭제 후 `/log/{deletedTimestamp}` 직접 진입 시 404 화면.
- Create / Delete 성공 시 `/log` 목록 캐시 갱신(REQ-20260419-007 머지 후 트리거).

자동화(Playwright / Cypress) 는 REQ-20260418-031 영역, 본 문서는 수동 baseline.

## 적용 대상 변경

다음 중 하나라도 수정한 PR 에서 본 체크리스트를 수행한다.

- `src/Log/Writer.jsx` 의 `createLogMutation` 또는 `updateLogMutation` 호출 로직 변경 (성공 / 에러 / 네트워크 콜백, navigate 타이밍, 토스터 문자열 포함).
- `src/Log/LogItem.jsx` 의 `deleteMutation` 호출 로직 변경 (onSuccess / onError 콜백, `props.deleted()` 트리거, 토스터 도입 등).
- `src/Log/hooks/useCreateLog.js`, `src/Log/hooks/useDeleteLog.js`, (예정) `src/Log/hooks/useUpdateLog.js` 의 mutationFn · onSuccess · onError · invalidateQueries 동작 변경.
- `src/common/api.js` 의 POST / DELETE / PUT `/log` 엔드포인트 URL · 메서드 · 헤더 · payload 형식 변경.
- `src/common/commonMonitor.js` 의 `getAPI()` 반환 URL 변경 (전송 대상이 바뀌면 Network 필터 기준이 바뀐다).
- 위 mutation 경로에 관여하는 토스터(`src/Toaster/**`) / navigate(`react-router-dom`) / `sessionStorage` 임시저장 로직 변경.

무관한 변경(순수 문서 편집, 다른 도메인 CSS / 테스트 헬퍼 등)은 수행 대상이 아니다.

## 사전 준비 (Steps)

1. 작업 브랜치 checkout, 변경사항 반영 상태.
2. `npm install` 로 의존성 최신화.
3. `npm run dev` 기동 → 콘솔에 출력된 로컬 URL 오픈 (Vite 기본 `http://localhost:3000`).
4. 관리자 계정(admin) 로그인 자격증명 확보 — MC-01 / MC-03 / MC-04 / MC-05 / MC-06 / MD-01 / MD-02 / MD-03 수행 전제.
5. 비관리자 계정(또는 로그아웃 상태) — MC-02 수행 전제.
6. 브라우저 DevTools 준비:
   - **Network 패널** — `Preserve log` 체크, 필터에 endpoint URL 일부 또는 method `POST` / `DELETE`.
   - **Console 패널** — 에러 로그 수집.
   - **Application 패널** — `sessionStorage` / `localStorage` 확인 (MC-05 임시저장 검증).
7. 백엔드 환경 결정 — dev (`npm start` 또는 `npm run dev` 의 프록시 백엔드) / staging / prod 중 1개 이상.
8. 커밋 해시 기록 — `git rev-parse HEAD` 출력을 §수행 로그 에 박제.

## 시나리오 매트릭스 (Scenarios)

각 시나리오는 (시나리오 ID / 절차 요약 / 예상 결과 / 조건 / 결과) 5 블록. 체크박스는 `[ ]` 로 baseline 초기화 상태.

### Mut-Create (MC-01 ~ MC-06)

| ID | 시나리오 | 절차 요약 | 예상 결과 | 조건 | 결과 |
|----|---------|----------|----------|------|------|
| MC-01 | 관리자 create 성공 | admin 로그인 → `/log/write` → 5자 이상 본문 입력 → Submit | POST 200 → "The log posted." 토스터 → `/log/{newTimestamp}` navigate → 단건 뷰 진입 | 필수 | [ ] PASS / [ ] FAIL / [ ] N/A |
| MC-02 | 비관리자 리다이렉트 | 비관리자(또는 로그아웃) → `/log/write` 직접 진입 | `/log` 로 리디렉션 (Writer 렌더 안 됨) | 필수 (자동 테스트 보조) | [ ] PASS / [ ] FAIL / [ ] N/A |
| MC-03 | POST 5xx 실패 | admin → `/log/write` → 본문 입력 → 백엔드 5xx 응답 유도 (DevTools Network throttling 의 Force 5xx, 서버 측 고의 실패, 또는 staging 비정상 경로) → Submit | "Posting log failed." 토스터 노출, URL 변경 없음, 입력 본문 유지 | 필수 | [ ] PASS / [ ] FAIL / [ ] N/A |
| MC-04 | 네트워크 오프라인 | admin → `/log/write` → 본문 입력 → DevTools Network 패널 "Offline" 토글 → Submit | "Posting log network error." 토스터 노출, URL 변경 없음, 입력 본문 유지 | 필수 | [ ] PASS / [ ] FAIL / [ ] N/A |
| MC-05 | 임시저장 (temporary) | admin → `/log/write` → 본문 입력 → `temporary` 체크박스 on → Submit | POST 200 → 응답 DB 에 `temporary: true` 저장 → `/log` 진입 시 해당 항목 좌측에 `✍️` 마커 노출 | 필수 | [ ] PASS / [ ] FAIL / [ ] N/A |
| MC-06 | create → list 자동 갱신 | MC-01 성공 직후 `/log` 진입 (수동 새로고침 없이) | 신규 항목이 목록 상단에 즉시 노출 | **조건부** (아래 2줄 중 적용 행 체크) | |
|    |    |    | REQ-20260419-007 머지 전 → [ ] N/A (조건 미충족) |    |    |
|    |    |    | REQ-20260419-007 머지 후 → [ ] PASS / [ ] FAIL |    |    |

### Mut-Delete (MD-01 ~ MD-03)

| ID | 시나리오 | 절차 요약 | 예상 결과 | 조건 | 결과 |
|----|---------|----------|----------|------|------|
| MD-01 | LogItem 삭제 → list 갱신 | admin → `/log` 항목 진입 → 삭제 액션 호출 | DELETE 200 → REQ-20260419-007 머지 후: 목록에서 자연 제거 / 머지 전: `props.deleted()` 콜백으로 부모 state 갱신 | 필수 | [ ] PASS / [ ] FAIL / [ ] N/A |
| MD-02 | 삭제 후 단건 진입 | MD-01 직후 `/log/{deletedTimestamp}` URL 직접 진입(주소창) | 404 화면 또는 빈 응답 처리(에러 경계 / 리다이렉트) | 필수 | [ ] PASS / [ ] FAIL / [ ] N/A |
| MD-03 | DELETE 실패 | admin → `/log` 항목 진입 → DevTools Network 5xx 유도 또는 Offline → 삭제 | 에러 토스터 노출 — **현재 LogItem `deleteMutation` 은 `onError` 에 console.log 만 있어 토스터 부재 관찰 시 결함 발굴 트리거** (별 후속 후보) | 조건부 (현 회귀 baseline 박제용) | [ ] PASS / [ ] FAIL / [ ] N/A |

> MD-03 주석: 현 구현에서 토스터가 노출되지 않는 관찰은 결함이다. 본 체크리스트가 발굴 트리거 역할을 하고, 후속 followup (category: `defect`) 으로 큐잉한다 (spec §7).

### Mut-Update (향후 확장 — useUpdateLog 머지 시)

- `src/Log/hooks/useUpdateLog.js` (TSK-20260418-MUT-UPDATE) 머지 시점에 본 절을 확장한다. 현재는 플레이스홀더.
- 최소 제안 시나리오:
  - MU-?? — 기존 항목 수정 성공 (PUT 200 → "The log updated." 토스터 → detail 캐시 갱신).
  - MU-?? — 수정 5xx 실패 토스터.
  - MU-?? — 수정 네트워크 오프라인 토스터.
  - MU-?? — detail 캐시 갱신 (invalidateQueries) 재진입 시 최신 값 노출 검증.
- 확장 절차는 §향후 확장 가이드 참조.

## 환경 매트릭스 (Environment)

각 세션에 다음 필드를 표로 기록.

| 필드 | 값 | 메모 |
|------|----|------|
| 브라우저 + 버전 |  | ≥1 필수 (예: Chrome 134, Firefox 126, Safari 18) |
| OS |  | ≥1 필수 (예: macOS 14, Windows 11, iOS 17) |
| 백엔드 환경 |  | dev (`npm start`) / staging / prod 중 택 1, 시나리오별 개별 표기 가능 |
| 자격증명 |  | admin (MC-01/03/04/05/MD-??) / 비관리자 (MC-02) — 시나리오 prefix 로 표시 |
| 커밋 해시 |  | `git rev-parse HEAD` 출력 박제 필수 |

- 권장 최소 조합: **Chrome + macOS + dev 1조합** (60분 내 마감 전제).
- Firefox / Safari 추가 조합은 Should.

## 결과 기록 (Results)

각 시나리오 row 에 `[ ] PASS` / `[ ] FAIL (메모)` / `[ ] N/A (조건 미충족)` 중 하나에 체크한다.

- FAIL 시 DevTools Network 탭 스크린샷 / 응답 헤더 / payload 를 첨부 권장 (Should).
- 체크리스트 마감 시 문서 하단 §수행 로그 섹션에 운영자 / 일자 / 환경 / 커밋 해시를 기록한다.
- 체크박스 형식 미준수 (대문자 `X`, `v` 등) 는 지양. 운영자 / 해시 / 날짜를 반드시 병기하여 형식적 체크 남발을 방지한다 (REQ §12 위험 1 완화).

## 향후 확장 가이드 (Future Extension)

`useUpdateLog` 도입 시(TSK-20260418-MUT-UPDATE 머지) 본 문서 갱신 절차:

1. §시나리오 매트릭스 "Mut-Update (향후 확장)" 절에 MU-01 ~ MU-NN 테이블 row 를 추가한다.
2. 각 row 의 "절차 요약" 에 `src/Log/Writer.jsx` edit 경로의 `updateLogMutation.mutate(...)` 진입 조건을 명시한다 (예: 기존 항목의 edit 버튼 → 본문 수정 → Submit).
3. 시나리오 ID prefix 는 `MU-` 로 고정한다.
4. TSK-20260418-MUT-UPDATE 의 DoD 에 본 체크리스트 갱신을 1줄로 명시한다. planner 가 task 를 생성할 때 강제한다 (REQ-008 §12 위험 1 완화).

신규 mutation 훅(예: bulk delete)을 추가할 때도 동일 패턴을 따른다. 1 PR 내에서 ≤5분 안에 섹션 추가·row append 가 가능해야 한다 (NFR-04).

## 비-목표 (Non-Goals)

- 자동화(Playwright / Cypress / Storybook) 기반 E2E 는 REQ-20260418-031 영역. 본 문서는 수동 baseline 만 담당한다.
- 본 체크리스트는 **실행(PASS 보고) 자체가 범위 밖** — 문서 신설까지이며, 운영자 1회 baseline 수행 / 결과 박제는 별 task 로 수행한다.
- 백엔드 API / DB 스키마 검증 — 운영 책임.
- Comment / File / Image / Search / Monitor 도메인의 mutation 경로 — 별 spec / 별 체크리스트.

> 본 체크리스트는 REQ-20260418-033 §3.3.1.7 "운영자 1회 검증" Could 항목의 인프라를 제공한다. 실제 1회 수행은 별 task 로 §수행 로그 를 채운다 (REQ-20260419-008 §10 3번 항).

## 수행 로그 (Execution Log)

| 일자 | 운영자 | 환경 | 커밋 | 결과 요약 |
|------|--------|------|------|-----------|

## 변경 이력

| 일자 | 태스크 | 요약 |
|------|--------|------|
| 2026-04-19 | TSK-20260419-LOG-MUT-SMOKE-DOC | 문서 신설 (시나리오 8건 MC-01~06 + MD-01~03, MU 플레이스홀더, 환경 매트릭스, 결과 기록, 향후 확장 가이드, 비-목표, 수행 로그 빈 슬롯) |
