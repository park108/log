# 명세: 서버 상태 관리 (TanStack Query)

> **위치**: `src/App.jsx` (Provider), `src/Log/api.js`, `src/Log/hooks/*` (신규)
> **유형**: 상태 관리 패턴 / 서버 캐싱
> **최종 업데이트**: 2026-04-19 (by inspector, WIP — REQ-20260418-013/021/027/033 + REQ-20260419-005/007/009/012/023 반영)
> **상태**: Active (파일럿 단계 + fetch cancellation 안전망 단계 + mutation 경로 마감 단계 + mutation 후속 정리 단계)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260417-adopt-tanstack-query.md`
> - `specs/requirements/done/2026/04/18/20260418-tanstack-query-test-util-renderwithquery.md` (REQ-20260418-013, 테스트 wrapper util)
> - `specs/requirements/done/2026/04/18/20260418-fetch-abortcontroller-race-condition-prevention.md` (REQ-20260418-021, `useEffect` 내 fetch 의 AbortController 안전망)
> - `specs/requirements/done/2026/04/18/20260418-log-test-flaky-listitem-msw-isolation.md` (REQ-20260418-027, Log.test flaky listitem — MSW 핸들러 / spy / NODE_ENV 격리 표준화)
> - `specs/requirements/done/2026/04/18/20260418-log-domain-mutation-hooks-usemutation-rollout.md` (REQ-20260418-033, Log 도메인 mutation 경로 `useMutation` 전환 — §3.3 마감)
> - `specs/requirements/done/2026/04/19/20260419-renderwithquery-component-test-helper-rollout.md` (REQ-20260419-005, `renderWithQuery(ui, options)` 컴포넌트 테스트 rollout — §4.3 commitment 실현)
> - `specs/requirements/done/2026/04/19/20260419-loglist-consume-uselogquery-remove-sessionstorage.md` (REQ-20260419-007, LogList `useLogList` 소비 + `sessionStorage("logList")` 트릭 제거 — §3.3 파일럿 마감)
> - `specs/requirements/done/2026/04/19/20260419-log-mutation-runtime-smoke-checklist-doc.md` (REQ-20260419-008, mutation 런타임 수동 smoke 체크리스트 문서 — §3.3.1.7 운영자 검증 Could 인프라)
> - `specs/requirements/done/2026/04/19/20260419-writer-isprocessing-derive-from-mutation-ispending.md` (REQ-20260419-009, Writer `isProcessing` 로컬 state 제거 → `isPending` 파생화 — §3.3.1.2 commitment 마감)
> - `specs/requirements/done/2026/04/19/20260419-cross-domain-msw-lifecycle-isolation-phase2.md` (REQ-20260419-012, 도메인 전반 MSW lifecycle / `NODE_ENV` 변형 격리 Phase 2 — REQ-027 Phase 1 cross-domain 확장)
> - `specs/requirements/done/2026/04/19/20260419-logsingle-consume-uselog-hook-tanstack-query-migration.md` (REQ-20260419-023, LogSingle.jsx `useLog` 소비 + 수동 fetch `useEffect` 제거 — §3.3 조회 경로 drift 해소)

> 본 문서는 서버 상태(원격 데이터) 관리 표준 SSoT.
> 클라이언트 상태(전역 UI 상태) 는 범위 밖.

---

## 1. 역할 (Role & Responsibility)
원격 데이터의 패치/캐싱/재검증/낙관적 업데이트/에러 재시도를 표준화.

- 주 책임:
  - `@tanstack/react-query` Provider 셋업 (staleTime, retry 기본값)
  - 도메인별 커스텀 훅 (`useLogList`, `useLog`, `useCreateLog` 등) 으로 캡슐화
  - Devtools 통합 (개발 환경)
  - 파일럿: Log 도메인 (목록/단건/작성/수정/삭제)
- 의도적으로 하지 않는 것:
  - 전역 클라이언트 상태(Zustand 등) — 별 spec
  - Suspense Query 패턴 — React 19 업그레이드 후 고려
  - 다른 도메인(File/Image/Comment/Search/Monitor) 적용 — 파일럿 검증 후 별건

## 2. 현재 상태 (As-Is)
- `src/*/api.js` 가 `fetch` + `useState` 조합으로 리스트/단건 로딩 수동 관리
- 캐싱, 재검증, 낙관적 업데이트, 에러 재시도 로직이 도메인마다 중복
- FRAMEWORK_DESIGN.md 기준 서버 상태는 TanStack Query / SWR 표준 명시

## 3. 도입 정책
> 관련 요구사항: 20260417-adopt-tanstack-query

### 3.1 Provider 설정 (`src/App.jsx`)
```jsx
<QueryClientProvider client={queryClient}>
  ...
  {import.meta.env.DEV && <ReactQueryDevtools />}
</QueryClientProvider>
```
`queryClient` 기본 옵션:
- `staleTime`: 60_000 (1분) — 도메인별 override 허용
- `retry`: 1 (네트워크 일시 오류만 1회 재시도)
- `refetchOnWindowFocus`: 환경에 따라 결정 (개발/운영 동일이 권장)

### 3.2 훅 명명 규약
- 조회: `useLogList`, `useLog(id)` — `useQuery`
- 변경: `useCreateLog`, `useUpdateLog`, `useDeleteLog` — `useMutation`
- 위치: `src/Log/hooks/` (신규 디렉토리)
- queryKey: `['log', 'list', params]`, `['log', 'detail', id]` 형태로 계층화

### 3.3 파일럿 적용 범위 (Log 도메인)
대상 화면:
- `LogList.jsx` — `useLogList` (조회, 훅은 `fa9424c` 에 도입됨 — **consumer 미전환** → REQ-20260419-007 에서 `LogList.jsx` 의 `useLogList` 소비 + `sessionStorage("logList"/"logListLastTimestamp")` 트릭 제거로 §3.3 파일럿 마감 예정, WIP)
- `LogSingle.jsx` — `useLog` (조회, 훅은 `fa9424c` 에 도입됨 — **consumer 미전환** → REQ-20260419-023 에서 `LogSingle.jsx` 의 `useLog` 소비 + `useEffect` 직접 fetch 제거 + `isLoading`/`data`/`itemLoadingStatus` 수동 state 3개 제거로 §3.3 조회 경로 마감 예정, WIP — 상세 §3.3.3)
- `Writer.jsx` — `useCreateLog`, `useUpdateLog` (변경, WIP — REQ-20260418-033 §3.3.1 + REQ-20260419-009 `isProcessing` 파생화)
- `LogItem.jsx` — `useDeleteLog` (메뉴/액션, WIP — REQ-20260418-033 §3.3.1)

기존 `useState` 기반 로딩/에러 처리 코드 제거.

> **2026-04-19 관측 (REQ-20260419-007)**: `useLogList` 훅이 도입됐음에도 `LogList.jsx` 가 여전히 `getLogs()` 를 `useEffect` 에서 직접 호출하며 `sessionStorage("logList", "logListLastTimestamp")` 로 캐싱 중. 결과적으로 §3.3.1 mutation 훅의 `invalidateQueries({ queryKey: ['log', 'list'] })` 가 **현재 실효 0** (캐시 상에 `['log','list',*]` 엔트리 부재). REQ-007 이 이 드리프트를 제거하여 spec §3.3.1.5 의 "새 게시 후 자동 갱신" 케이스의 정합성을 회복한다.

#### 3.3.1 [WIP] 변경 경로 마감 — mutation 훅 3종 (REQ-20260418-033)

> 관련 요구사항: REQ-20260418-033 FR-01 ~ FR-12, US-01 ~ US-05

**맥락**: 조회 경로(`useLogList`, `useLog`) 는 파일럿에서 도입됐으나 변경 경로(`postLog` / `putLog` / `deleteLog`) 는 여전히 `useEffect` + `await` + 수동 `setState` + `sessionStorage.removeItem("logList")` 트릭에 의존. 본 §은 spec §3.3 commitment 를 100% 충족시켜 Log 파일럿을 reference 사례로 마감.

**3.3.1.1 mutation 훅 3종 신설 (FR-01 ~ FR-03)**

- `src/Log/hooks/useCreateLog.js` — `useMutation({ mutationFn: postLog, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['log', 'list'] }) })`.
- `src/Log/hooks/useUpdateLog.js` — `useMutation({ mutationFn: putLog, onSuccess: (data, variables) => { queryClient.invalidateQueries({ queryKey: ['log', 'list'] }); queryClient.invalidateQueries({ queryKey: ['log', 'detail', variables.timestamp] }); } })`.
- `src/Log/hooks/useDeleteLog.js` — `useMutation({ mutationFn: deleteLog, onSuccess: (data, variables) => { queryClient.invalidateQueries({ queryKey: ['log', 'list'] }); queryClient.removeQueries({ queryKey: ['log', 'detail', variables.timestamp] }); } })`.
- queryKey 계층은 §3.2 `['log', 'list', params]` / `['log', 'detail', id]` 표준 준수.
- mutation key 명명(`['log', 'mutate', 'create' | 'update' | 'delete']`) 는 Could — planner 가 태스크 분할 시 결정 (REQ-20260418-033 §13 미결).

**3.3.1.2 Writer / LogItem 호출부 교체 (FR-04 ~ FR-06)**

- `src/Log/Writer.jsx` 의 `createLog` useEffect → `useCreateLog().mutate(...)` 콜백.
- `src/Log/Writer.jsx` 의 `editLog` useEffect → `useUpdateLog().mutate(...)` 콜백.
- `src/Log/LogItem.jsx` 의 `deleteLogItem` async → `useDeleteLog().mutate(...)` 콜백.
- `isProcessing` ad-hoc state 제거 → `useMutation` 의 `isPending` 사용 (v5 API — `isLoading` 제거됨).
- `sessionStorage.removeItem("logList")` / `sessionStorage.removeItem("logListLastTimestamp")` **4 줄 제거** — `invalidateQueries` 가 대체.
- 토스트 / `navigate` / 부모 콜백은 `onSuccess` / `onError` 콜백으로 이동 — 기존 동작 보존 (NFR-05).
- 임시저장 분기(`isTemporary`) 는 mutate variables 에 전달 (회귀 케이스 필수).

**3.3.1.2.1 [WIP] Writer `isProcessing` 로컬 state 파생화 (REQ-20260419-009)**

> 관련 요구사항: REQ-20260419-009 FR-01 ~ FR-08, US-01 ~ US-03

**맥락 (2026-04-19 관측)**: TSK-MUT-CREATE / TSK-MUT-UPDATE 머지로 `src/Log/Writer.jsx` 는 `createLogMutation.isPending` 과 `updateLogMutation.isPending` 양쪽 진행 신호를 이미 보유하지만, 동일 정보가 `useState(false)` 기반 `isProcessing` 로컬 state 로 **중복 유지** 되며 createLog 3건 + editLog 3건 = 6건의 `setIsProcessing(true/false)` 수동 호출로 동기화된다. §3.3.1.2 의 commitment ("`isProcessing` ad-hoc state 제거 → `useMutation` 의 `isPending` 사용") 가 코드상 아직 미반영.

**목표**:
- `const [isProcessing, setIsProcessing] = useState(false);` 라인 제거 (FR-01).
- `const isProcessing = createLogMutation.isPending || updateLogMutation.isPending;` (또는 동등) 파생값 도입 (FR-02).
- `setIsProcessing(true/false)` 6건 모두 제거 (FR-03).
- `disabled={ isProcessing }` 2곳(`textarea` + submit 버튼) 유지 — mutation `isPending` 의 React render cycle 내 동기 반영 전제 (FR-04, NFR-04).

**회귀 범위 (좁음)**: `disabled` prop 의 토글 타이밍만 검증. mutate 호출 즉시 `isPending` true → onSuccess/onError 동기 완료 시점에 false 복귀 (TanStack Query v5.x `UseMutationResult.isPending` 보장).

**테스트 (FR-05, FR-06)**:
- `Writer.test.jsx` 기존 케이스 100% PASS — 토스트 / navigate / 임시저장 분기 회귀 0.
- (Should) 신규 어서트 1건 — `mutate` 직후 submit 버튼 disabled / onSuccess/onError 후 enabled 복귀.

**grep 회귀 차단 (FR-07)**:
- `grep -c "setIsProcessing" src/Log/Writer.jsx` → 0.
- `grep -n "isProcessing" src/Log/Writer.jsx` → 파생 1줄 + disabled 2곳 = ≤3 매치.

**인접성**:
- REQ-20260419-005 (`renderWithQuery` rollout) 와 `Writer.test.jsx` 를 공동 수정 가능하나 상호 직교 — planner 가 머지 순서 결정. 본 §은 wrapper 변경 0 전제.
- `src/Log/LogItem.jsx` 는 이미 `isPending` 직접 사용 중 (`const isDeleting = deleteMutation.isPending;`) — 본 §의 확장 대상 밖.

**수용 기준 (REQ-20260419-009 §10)**:
- [ ] FR-01 ~ FR-08 모두 충족
- [ ] `grep -c "setIsProcessing\|useState.*isProcessing" src/Log/Writer.jsx` → 0
- [ ] `grep -n "isProcessing" src/Log/Writer.jsx` → ≤3 매치 (파생 1줄 + disabled 2곳)
- [ ] `npm test` 100% PASS, coverage ±0.5pp, `npm run lint` 0 warn/error, `npm run build` PASS
- [ ] (Should) `Writer.test.jsx` 에 disabled 동기성 신규 어서트 1건
- [ ] 본 §3.3.1.2.1 의 commitment 충족 마킹 (완료 시 "commit `<hash>`" 박제 — inspector 영역)

**범위 밖**:
- LogItem 의 `isPending` 패턴 확장 (이미 적용됨)
- `status` / `isError` / `error` 활용 확장 — 별 후속
- Writer 의 다른 `useState` (`isSubmitted`, `isShowToaster`) 정리 — 별 후속
- 다른 도메인 컴포넌트의 진행 상태 패턴 sweep — 별 spec

**3.3.1.3 status 200 비교 → throw 통일 (FR-07)**

- 현재 `createLog` / `editLog` / `deleteLog` 3곳에 중복된 `if (status.statusCode !== 200) { ... error toast ... }` 분기 → `mutationFn` 안에서 `if (status.statusCode !== 200) throw new Error(...)` 로 통일.
- 컴포넌트는 `onError` 단일 분기로 처리 — 토스트 일관성 (NFR-03).

**3.3.1.4 단위 테스트 (FR-08)**

- `src/Log/hooks/useCreateLog.test.js`, `useUpdateLog.test.js`, `useDeleteLog.test.js` 신규 (REQ-013 의 `renderWithQuery` 헬퍼 사용).
- 각 ≥3 케이스: success / error / invalidation 효과 (spy 또는 cache state 비교).
- MSW 핸들러 fixture — `Log/api.mock.js` 에 error 응답 핸들러 추가 허용 (위험 완화).

**3.3.1.5 회귀 테스트 (FR-09, FR-10)**

- `Writer.test.jsx` / `LogItem.test.jsx` 기존 케이스 100% PASS — 토스트 / `navigate` / 부모 콜백 / 임시저장 분기 회귀 0.
- `Log.test.jsx` (LogList 통합) 에 "새 게시 후 list 자동 갱신" 케이스 1건 신규 — `sessionStorage` 트릭 제거 후에도 list 가 invalidation 을 통해 자동 갱신됨을 검증 (US-01).

**3.3.1.6 grep 회귀 차단 (FR-12)**

- `grep -rn "sessionStorage.*logList\|sessionStorage.*logListLastTimestamp" src/` → **0 lines** (result.md 박제).
- `grep -rn "await postLog\|await putLog\|await deleteLog" src/` → `src/Log/hooks/use{Create|Update|Delete}Log.js` 의 `mutationFn` 정의만 매치 (다른 호출처 0).

**3.3.1.7 범위 밖**

- 낙관적 업데이트 (`onMutate` + `setQueryData`) — Could (FR-13), 별 후보 분리 가능.
- 다른 도메인 확장 (File/Image/Comment/Search/Monitor) — 본 마감 후 별 요구사항 후보.
- mutation 의 AbortController — 일반적으로 cancel 안 함 (§3.5 범위 밖).
- LogList `staleTime` override (60s → 0) — developer 측정 후 결정 (미결).
- Writer mount 시 잔존 `sessionStorage` 키 cleanup — Could, 별 후보 가능.

**3.3.1.8 [WIP] Log mutation 런타임 수동 smoke 체크리스트 문서 (REQ-20260419-008)**

> 관련 요구사항: REQ-20260419-008 FR-01 ~ FR-10, §3.3.1.7 "운영자 1회 검증" Could 항목의 인프라 실현

§3.3.1 의 MSW 기반 자동 테스트가 커버하지 못하는 dev/prod 서버 연동 mutation E2E 흐름(실 POST / navigate / 토스터 / 임시저장 DB 반영 / 404 진입 / 캐시 제거) 을 사람의 1회 점검으로 검증하는 수동 스모크 체크리스트 문서를 신설.

- 신규 파일: `docs/testing/log-mutation-runtime-smoke.md`
- spec SSoT: `specs/spec/green/testing/log-mutation-runtime-smoke-spec.md` (본 REQ 에서 inspector 가 동시 생성)
- 시나리오 매트릭스 8+ 건 (MC-01 ~ MC-06 / MD-01 ~ MD-03) + 환경 매트릭스 + 향후 `useUpdateLog` 확장 가이드.
- 본 §3.3.1.7 의 "운영자 1회 검증" Could 항목과 1:1 매핑 — 실제 실행은 별 task (본 REQ 는 문서 신설까지만).
- MC-06 ("create → list 자동 갱신") 의 PASS 조건은 REQ-20260419-007 (LogList 통합) 머지 후 충족.

상세는 `log-mutation-runtime-smoke-spec.md` 참조.

**3.3.1.9 [WIP] LogItem `deleteMutation.onError` 토스터 UX 대칭 회복 (REQ-20260419-014)**

> 관련 요구사항: REQ-20260419-014 FR-01 ~ FR-08, US-01 ~ US-04

**맥락 (2026-04-19 관측)**: `src/Log/LogItem.jsx:22-36` 의 `deleteMutation.mutate(...)` `onError` 콜백이 `log("[API DELETE] FAILED - Log", "ERROR")` + `log(err, "ERROR")` 두 줄의 `console.error` 만 수행하고, 사용자 가시 피드백(토스터 / 배너 / 모달) 이 부재. 동일 도메인의 `src/Log/Writer.jsx:149-162` `createLogMutation.onError` 는 `err.message.startsWith("POST /log failed")` 분기로 "Posting log failed." (5xx) / "Posting log network error." (network) 토스터를 노출 — Create 와 Delete 의 UX 가 비대칭. `log-mutation-runtime-smoke-spec.md` §3.2.2 MD-03 이 본 결함을 결함 발굴 트리거로 명시.

**목표**:
- **FR-01 분기 onError 토스터 추가**: `err.message.startsWith("DELETE /log failed")` → "Deleting log failed." (5xx) / 그 외 → "Deleting log network error." (network) 분기. Writer `createLogMutation.onError` 모범 1:1 복제.
- **FR-02 Toaster 마운트**: `LogItem.jsx` 에 `Toaster` import + `[isShowToaster, setIsShowToaster] = useState(0)` + `[toasterType, setToasterType] = useState("error")` + `[toasterMessage, setToasterMessage] = useState("")` 신규 3 state + JSX `</article>` 직전 `<Toaster show={...} message={...} position={"bottom"} type={...} duration={2000} completed={() => setIsShowToaster(2)} />` 마운트.
- **FR-03 console.error 유지**: 기존 `log("[API DELETE] FAILED - Log", "ERROR")` / `log(err, "ERROR")` 호출 보존 — Monitor 대시보드 신호.
- **FR-04, FR-05 회귀 테스트 2 케이스 신규**:
  - `'shows error toaster on DELETE 5xx response'` — 5xx mock → `findByText("Deleting log failed.")` 어서트.
  - `'shows network error toaster on DELETE network failure'` — fetch reject → `findByText("Deleting log network error.")` 어서트.
- **FR-06 텍스트 컨벤션**: Writer 와 동등한 동사형 (`"Deleting log failed."` / `"Deleting log network error."`).
- **FR-07 spec 갱신 트리거 (inspector)**: 본 요구사항 머지 후 `log-mutation-runtime-smoke-spec.md` §3.2.2 MD-03 의 "현재 LogItem 은 onError log 만" 메모를 정상 동작 박제로 갱신 (별 라운드).

**전제 (Preconditions)**:
- `src/Log/hooks/useDeleteLog.js:25-32` 의 `mutationFn` 이 `status.statusCode !== 200` 일 때 `throw new Error(\`DELETE /log failed: statusCode=${status.statusCode}\`)` 로 throw 메시지를 통일 — `err.message.startsWith("DELETE /log failed")` 매칭 보장 (REQ-20260418-033 FR-07 후속 유지).
- `Toaster` 컴포넌트 prop signature 변경 0.

**UX 대칭 (NFR-05)**: `Writer.jsx:149-162` ↔ `LogItem.jsx` onError 블록의 메시지 prefix / `type` / `position` / `duration` 1:1 대응.

**회귀 테스트 (FR-04/FR-05)**:
- `src/Log/LogItem.test.jsx:154` 기존 `'render log item and delete failed correctly'` 케이스는 console.error 어서트만 — 토스터 어서트를 신규 케이스로 추가하거나 기존 케이스를 확장.
- per-test mock isolation (`vi.clearAllMocks` + `renderWithQuery` — REQ-20260419-005 패턴 재사용) 으로 flake 차단.

**grep 회귀 차단**:
- `grep -n "setToasterMessage\|setIsShowToaster" src/Log/LogItem.jsx` ≥ 3 (onError 3 호출).
- `grep -n "Deleting log failed\|Deleting log network error" src/Log/LogItem.jsx` == 2.

**수용 기준 (REQ-20260419-014 §10)**:
- [ ] FR-01 ~ FR-05 모두 충족 (Must).
- [ ] (Should) FR-06 메시지 텍스트 Writer 컨벤션 일치.
- [ ] (Should) FR-07 `log-mutation-runtime-smoke-spec.md` §3.2.2 MD-03 메모 → 정상 동작 박제 (별 inspector 라운드).
- [ ] NFR-04 신규 회귀 테스트 5회 연속 PASS.
- [ ] NFR-06 `LogItem.jsx` LOC 증분 ≤ +20 (89 → ≤109).
- [ ] `npm test` PASS + `npm run lint` PASS + `npm run build` PASS.
- [ ] Writer / LogItem 정상 케이스 사용자 visible 회귀 0.

**범위 밖**:
- `useUpdateLog` 의 onError 토스터 분기 — 별 후속 (REQ-033 §10 영역).
- `useCreateLog` 토스터 — Writer 이미 완료 (본 요구사항 무관).
- `LogItem.jsx` CSS Modules 마이그레이션 — REQ-013 영역.
- `Toaster` 컴포넌트 자체 변경.
- `log-mutation-runtime-smoke-spec.md` §3.2.2 MD-03 메모 갱신 자체 — inspector 별 라운드.
- `docs/testing/log-mutation-runtime-smoke.md` MD-03 row baseline 재수행 — 별 task.
- Comment 도메인 mutation onError — Comment 도메인 server-state 통합 자체 미실행 (별 후속).

**3.3.1.10 [WIP] Log 도메인 3종 mutation onError Toaster UX 컨벤션 통합 (REQ-20260419-028)**

> 관련 요구사항: REQ-20260419-028 FR-01 ~ FR-10, US-01 ~ US-03

**맥락 (2026-04-19 관측)**: §3.3.1.9 (REQ-014) 가 `useDeleteLog` 의 onError Toaster 도입을 예약하여 Create ↔ Delete UX 대칭을 회복한다. 그러나 `useUpdateLog` (REQ-20260418-033 FR-07 머지본) 의 onError 도 현재 `Writer.jsx:149-162` 와 동일 패턴을 **복제**로 가지고 있어, 3종 mutation(Create/Update/Delete) × 각 consumer 컴포넌트(Writer/LogItem 등) 마다 동일 분기 로직이 반복되는 구조. 본 §3.3.1.10 은 3종 mutation 의 onError Toaster UX 를 **공유 helper** 또는 **훅 레벨 default onError** 로 통합하여 중복을 단일 출처로 박제한다.

**3 옵션 trade-off (planner 결정)**:
| 옵션 | 위치 | 장점 | 단점 |
|------|------|------|------|
| (a) 공유 helper | `src/Log/hooks/mutationErrorToaster.js` (신규) | consumer 변경 최소, test 격리 쉬움 | 각 consumer 가 helper 명시 호출 필요 |
| (b) 훅 레벨 default `onError` | `useCreateLog`/`useUpdateLog`/`useDeleteLog` 내부 | consumer 에서 onError 생략 가능 | Toaster state 훅 외부 소유 (2-way coupling) |
| (c) 상위 컨텍스트 (ToasterProvider) | App 레벨 Toaster context | 글로벌 1 Toaster, consumer 완전 독립 | 구조 변경 대규모, 기존 LogItem/Writer Toaster mount 재설계 |

**권장 (discovery)**: 옵션 (a) — `mutationErrorToaster(setToasterFns)` 가 prefix 매칭 분기를 내장, consumer 에서 `onError: (err) => mutationErrorToaster(err, { setIsShowToaster, setToasterType, setToasterMessage }, { verb: 'Deleting' })` 로 호출. 훅 레벨 default 는 Toaster state 를 훅이 소유하면 consumer 의 JSX 에 state 주입이 필요해져 결합 증가.

**FR 요약**:
- **FR-01 공유 helper (Must)**: `src/Log/hooks/mutationErrorToaster.js` 신설 — `(err, setters, { verb })` 시그니처. 3 verb 지원: "Posting" / "Updating" / "Deleting".
- **FR-02 Writer 마이그레이션**: `Writer.jsx:149-162` 의 createLog onError → helper 호출로 치환. 메시지 텍스트 변경 0.
- **FR-03 LogItem 마이그레이션**: §3.3.1.9 머지 후 LogItem 의 deleteMutation onError → helper 호출로 치환.
- **FR-04 update consumer 마이그레이션**: Writer 의 updateLogMutation onError (FR-07 머지본) → helper 호출.
- **FR-05 단위 테스트**: `mutationErrorToaster.test.js` 신설 — 3 verb × (5xx / network / 기타 prefix 불일치) 매트릭스 9 케이스.
- **FR-06 consumer 테스트 회귀**: Writer/LogItem 기존 onError Toaster 어서트 100% PASS 유지.
- **FR-07 grep 수용**: `grep -c "err.message.startsWith" src/Log/` → 0 (모두 helper 내부로 캡슐화).
- **FR-08 LOC 감소**: Writer.jsx / LogItem.jsx onError 블록 라인 수 각각 감소 (대략 -8 LOC / consumer, helper +25 LOC 순증 ≤ +5 LOC total).

**수용 기준 (REQ-20260419-028 §10)**:
- [ ] FR-01 ~ FR-06 모두 충족 (Must).
- [ ] (Should) FR-07 grep 통계 result.md 박제.
- [ ] (Should) FR-08 LOC diff 박제.
- [ ] `npm test` 100% PASS, `npm run lint` / `npm run build` 회귀 0.
- [ ] (Should) §3.3.1.9 REQ-014 머지 직후 본 §3.3.1.10 진입 — 2 REQ 의 순서 의존 (FR-03 의 LogItem 전제).

**범위 밖**:
- Comment 도메인 mutation (server-state 통합 미실행).
- 옵션 (c) ToasterProvider 글로벌 컨텍스트 — 별 REQ.
- Toaster 컴포넌트 자체 리팩터.
- 3 mutation hook 의 onSuccess / onSettled 공유 — 본 REQ 는 onError 한정.

### 3.3.2 [WIP] LogList `useLogList` 소비 마이그레이션 (REQ-20260419-007)

> 관련 요구사항: REQ-20260419-007 FR-01 ~ FR-10, US-01 ~ US-04

**맥락 (2026-04-19 관측)**: `useLogList` 훅이 `fa9424c` 에 도입됐으나 `src/Log/LogList.jsx` 는 **어떤 TanStack Query 훅도 소비하지 않고** `getLogs()` 를 `useEffect` 에서 직접 호출하며 `sessionStorage("logList", "logListLastTimestamp")` 로 캐싱 중이다 (`LogList.jsx` 의 `fetchFirst`/`fetchMore` 경로 + sessionStorage `setItem`/`getItem`/`removeItem` 6+ 라인). 그 결과 §3.3.1.1 의 mutation 훅 3종이 호출하는 `invalidateQueries({ queryKey: ['log', 'list'] })` 가 **현재 실효 0** — 쿼리 캐시 상에 `['log','list',*]` 엔트리가 존재하지 않기 때문. spec §3.3.1.5 의 "새 게시 후 list 자동 갱신" commitment 와 코드가 괴리.

**목표 (In-Scope)**:

**3.3.2.1 LogList.jsx 마이그레이션 (FR-01 ~ FR-04)**
- `src/Log/LogList.jsx` 가 `useLogList` (또는 신규 `useLogListInfinite`) 반환값으로 렌더.
- `useState` 기반 `logs` / `isLoading` / `isError` / `lastTimestamp` 4개 상태 제거 → 훅 반환값 사용.
- `useEffect` 기반 `fetchFirst` / `fetchMore` 제거 → 훅의 `fetchNextPage` 또는 cursor 파라미터 변경.
- `sessionStorage.setItem/getItem("logList" | "logListLastTimestamp")` 라인 전부 제거.
- `sessionStorage.removeItem` Retry 로직 → `refetch()` 로 대체.
- "See more" 버튼은 `fetchNextPage()` 또는 cursor 파라미터 변경 트리거.

**3.3.2.2 Log.jsx 정리 (FR-06)**
- `src/Log/Log.jsx` 의 미사용 `import { getLogs, getNextLogs } from './api';` 제거 (호출 0 회).

**3.3.2.3 useLogList 훅 페이지네이션 지원 (FR-05)**
- 현행 `useLogList({ limit })` 가 1페이지만 반환 — cursor 파라미터 또는 `useInfiniteQuery` 변형으로 확장.
- queryKey 계층 `['log', 'list', { limit, cursor }]` 표준 준수 (§3.2).

**3.3.2.4 테스트 (FR-07, FR-08)**
- `Log.test.jsx` 또는 `LogList.test.jsx` 에 신규 케이스 1건:
  - `useCreateLog().mutate(...)` 후 `useLogList()` 가 자동 refetch 되어 신규 항목 노출 (§3.3.1.5 commitment 실현).
  - `useDeleteLog().mutate(...)` 후 삭제 항목 부재 검증.
- 기존 `LogList.test.jsx`, `Log.test.jsx`, `Writer.test.jsx`, `LogItem.test.jsx` 케이스 100% PASS — Suspense / Toaster / pagination UX 회귀 0.

**3.3.2.5 grep 회귀 차단 (FR-09)**
- `grep -rn "sessionStorage.*logList\|sessionStorage.*logListLastTimestamp" src/` → **0 lines**.
- `grep -rn "useLogList(" src/Log/LogList.jsx` ≥ 1 line.

**범위 밖**:
- `LogSingle.jsx` 의 `useLog` 통합 — **REQ-20260419-023 에서 별 트랙으로 진행** (이전 "done (REQ-020)" 표기는 drift, §3.3.3 참조).
- 다른 도메인(Comment/File/Image/Search/Monitor) 의 `useQuery` 마이그레이션 — 별 후속.
- 낙관적 업데이트 (`onMutate` + `setQueryData`) — Could.
- `persistQueryClient` 도입 — 별 spec.
- Suspense Query 패턴 — React 19 후 별 spec.
- `react-router-dom@7` loader 패턴 — 별 spec.

**UX 가정 (Assumptions)**:
- App 레벨 `staleTime: 60_000` 이 mutation invalidate 발화와 무관하게 자동 refetch 를 trigger (invalidation 은 staleTime 과 독립).
- 기존 Toaster ("Loading logs...") UX 는 `isFetching` (또는 `isPending`) 로 동등 재현.
- sessionStorage 잔존 키는 자연 stale — 재진입 시 무해. 일회성 cleanup 은 별 후보.

### 3.3.3 [WIP] LogSingle `useLog` 소비 마이그레이션 (REQ-20260419-023)

> 관련 요구사항: REQ-20260419-023 FR-01 ~ FR-05, US-01 ~ US-02

**맥락 (2026-04-19 관측 — §3.3 "완료" 표기 drift 해소)**: §3.3 의 `LogSingle.jsx — useLog (조회, 완료 — commit fa9424c)` 행이 실태와 drift. `src/Log/hooks/useLog.js:13-23` (`useQuery({ queryKey: ['log','detail',timestamp], enabled: Boolean(timestamp) })`) 은 구현 완료 상태이지만 `src/Log/LogSingle.jsx` 가 훅을 **소비하지 않고** 여전히 `useEffect` 에서 `getLog(timestamp)` 를 직접 호출하며 `isLoading` / `data` / `itemLoadingStatus` 등 수동 state 6개를 유지한다 (`LogSingle.jsx:17-26, 37-95`). 결과적으로 (a) §3.3.1.1 의 `useUpdateLog` / `useDeleteLog` 가 발화하는 `invalidateQueries(['log','detail',timestamp])` / `removeQueries(['log','detail',timestamp])` 가 **실효 0** — 캐시 상에 `['log','detail',*]` 엔트리 부재 — 이고, (b) `useLog` 훅의 `staleTime` / `retry` / dedupe 혜택이 활용되지 못한다. §3.3 파일럿의 조회 경로 마감을 위해 본 §이 drift 를 해소.

**목표 (In-Scope)**:

**3.3.3.1 LogSingle.jsx 마이그레이션 (FR-01 ~ FR-03)**
- `src/Log/LogSingle.jsx` 가 `useLog(logTimestamp)` 를 호출하고 반환된 `{ isLoading, isError, data }` 를 렌더에 직접 사용.
- `useState(false)` `isLoading`, `useState({})` `data`, `useState("NOW_LOADING")` `itemLoadingStatus` 3개 수동 state 제거 (또는 `useLog` 반환값 + 파생 변수로 대체).
- `fetchData()` 를 호출하는 `useEffect` 블록 (`LogSingle.jsx:37-95`) 제거.
- NOT_FOUND(`data?.body?.Count === 0` 또는 `isError`) / FOUND(`data?.body?.Count > 0`) / DELETED 분기 표시 동작 유지 — 단, DELETED 는 `setIsShowToasterBottom` 콜백 기반 로컬 state 로 남길지 여부는 §13 미결.

**3.3.3.2 부수효과 보존 (FR-04)**
- `setHtmlTitle(data)` / `setMetaDescription(data)` 는 `useEffect([data])` 에서 기존과 동등하게 호출 — 서버 상태 외 UI 부수효과이므로 훅 내부 이동 금지.
- `useLog` 자체는 수정 금지 (이미 spec-aligned, `Out-of-Scope`).

**3.3.3.3 테스트 (FR-05)**
- `LogSingle.test.jsx` 의 MSW 핸들러 + QueryClient 래퍼 구성을 `renderWithQuery` (§4.3.1, REQ-20260419-005) 로 통일.
- 기존 테스트 케이스 100% PASS + `useLog` 호출 확인 어서트 신규 1건 (queryKey `['log','detail',timestamp]` 주입 검증).
- `useDeleteLog.onSuccess` 경로에서 `removeQueries(['log','detail',timestamp])` 가 `LogSingle` 재렌더 시 실효 확인 케이스 1건 (Should).

**3.3.3.4 grep 회귀 차단**
- `grep -n "useLog(" src/Log/LogSingle.jsx` ≥ 1 line.
- `grep -n "await getLog\|getLog(" src/Log/LogSingle.jsx` → 0 line (`useLog` 훅 내부 `queryFn` 제외).
- `grep -n "itemLoadingStatus" src/Log/LogSingle.jsx` → 0 line (또는 DELETED 전이용 최소 유지 시 §13 결정 기록).

**범위 밖 (REQ-023 §3.2)**:
- `useLog` 훅 자체 수정 (이미 §3.2 규약 준수).
- `LogSingle` 의 JSX-in-state (`logItem`, `toListButton`) 제거 — **REQ-20260419-024** (§ 3.3.3 와 동일 파일 편집 충돌 주의) 에서 다룸.
- 페이지네이션 / 무한 스크롤 도입.
- `isShowToasterBottom` / `isShowToasterTop` 분기 통폐합 — 별 후보.

**UX 가정 (Assumptions)**:
- `useLog` 의 `queryFn` 이 `res.ok` 기반 에러 throw 를 수행하므로 네트워크 에러는 `isError=true` 로 전달 — 기존 try/catch 분기 동등.
- `staleTime: 60_000` (§3.1) 과 `enabled: Boolean(timestamp)` (기존 훅 옵션) 조합으로 경로 진입 시 불필요 재요청 0.

**Drift 기록**: 본 §3.3.3 머지 시 §3.3 파일럿 행의 `LogSingle.jsx — useLog (조회, 완료 — commit fa9424c)` 는 "완료 — commit `<REQ-023 머지 해시>`" 로 inspector 가 갱신 (현 `fa9424c` 는 훅 구현만 반영, 소비자 전환은 REQ-023 머지 후 박제).

### 3.4 Devtools
- `@tanstack/react-query-devtools` 도입
- DEV 환경에서만 마운트

### 3.5 [WIP] `useEffect` + `fetch` 패턴의 AbortController 안전망 (REQ-20260418-021)
> 관련 요구사항: REQ-20260418-021 FR-01~05, US-01~03

**맥락**: TanStack Query 마이그레이션이 도메인별로 순차 진행되는 동안, 미마이그레이션 도메인의 `useEffect` 내부 `fetch` 패턴은 race condition / memory leak / StrictMode 더블 인보크로 인한 중복 호출 위험을 그대로 갖고 있다. Query 가 자동 관리하는 cancellation 을 수동으로 구현해 **마이그레이션 전까지 baseline 위험을 즉시 낮춘다**.

**현재 상태**: `grep -rn "AbortController\|signal" src/` → **0건**. 6개 도메인(`Log`, `File`, `Image`, `Search`, `Comment`, `Monitor`) 의 `api.js` 와 호출자 `useEffect` 모두 cancellation 미지원.

**3.5.1 api.js signature 확장 (FR-01)**
6개 도메인의 모든 fetch 헬퍼에 마지막 옵션 인자 (또는 `options` 객체) 추가:

```js
// 기존
export const getLogs = () => fetch(url, { method: 'GET' });
// 신규 (호환)
export const getLogs = ({ signal } = {}) => fetch(url, { method: 'GET', signal });
```

- 대상: `src/Log/api.js`, `src/File/api.js`, `src/Image/api.js`, `src/Search/api.js`, `src/Comment/api.js`, `src/Monitor/api.js`.
- 옵션 미지정 시 기존 동작 동일 (default `signal: undefined`) — NFR-03 호환성.
- GET 우선 적용; mutation (POST/PUT/DELETE) 은 서버 idempotency 와 결합한 별 가이드 필요 (REQ-021 §13 미결) — planner 가 도메인별 task 분할 시 결정.

**3.5.2 호출자 `useEffect` 표준 패턴 (FR-02, FR-03)**

```jsx
useEffect(() => {
  const ac = new AbortController();
  const fetchFirst = async () => {
    try {
      const res = await getLogs({ signal: ac.signal });
      const data = await res.json();
      // setState ...
    } catch (err) {
      if (err.name === 'AbortError') return; // FR-03: 정상 cancel 은 silent
      // 일반 에러 처리 ...
    }
  };
  fetchFirst();
  return () => ac.abort();
}, [deps]);
```

- **4단계 강제**: `new AC` → call with `ac.signal` → effect body → cleanup `ac.abort()`.
- `AbortError` 의 `err.name === 'AbortError'` 분기는 `console.error` 노이즈 차단용 (NFR-04 일관성).
- 적용 대상 호출 사이트:
  - `src/Log/LogList.jsx:27-126` (fetchFirst, fetchMore)
  - `src/Log/LogSingle.jsx:36-128` (fetchLog)
  - `src/Search/Search.jsx:48-100` (search — 검색어 race 가장 명확)
  - `src/Image/ImageSelector.jsx:30-105` (fetchFirst, fetchMore)
  - `src/File/File.jsx:60-130` (fetchFirst, fetchMore)
  - `src/Comment/Comment.jsx:30-100` (fetchComments 등)
  - `src/Monitor/VisitorMon.jsx:130-160`, `ContentItem.jsx:75-100`, `WebVitalsItem.jsx:75-100`, `ApiCallItem.jsx:70-95`

**3.5.3 대표 테스트 (FR-04, Should)**
- `LogList.test.jsx`, `Search.test.jsx` 에 "unmount 직후 fetch 응답 도착 시 setState 미발생" 어서션 추가.
- 테스트 패턴: `const { unmount } = render(...); unmount(); await flushPromises(); expect(setState).not.toHaveBeenCalled();`

**3.5.4 TanStack Query 마이그레이션과의 관계 (FR-05)**
- Query 가 도입된 도메인은 `useQuery` 가 cancellation 자동 관리 → 본 수동 패턴 불필요.
- 도메인 마이그레이션 전까지 본 §3.5 패턴 **필수 적용**.
- 마이그레이션 후에는 useEffect + fetch 자체가 사라지므로 자연 해체 (§3.3 파일럿 완료 후).

**3.5.5 수용 기준 grep (REQ-021 §10)**
- `grep -rn "AbortController" src/` → 모든 useEffect 내 fetch 호출 사이트 커버 (대략 10+).
- `grep -rn "signal" src/*/api.js` → 모든 fetch 헬퍼에서 옵션 수용.
- `npm test` 로그 stderr 에 "Cannot update unmounted component" 0건 (NFR-01).
- DevTools Network 에서 unmount 시 fetch cancel 표시 (수동 1회).

**3.5.6 범위 밖**
- mutation cancellation 정책 (서버 idempotency 결합) — 별 가이드 필요 (§13 미결).
- `AbortSignal.timeout` 타임아웃 도입 — 별 후보.
- Monitor 의 `setTimeout`/`setInterval` cleanup 점검 — 별건.

### 3.6 [WIP] 테스트 격리 표준화 — MSW / spy / env stub (REQ-20260418-027)

> 관련 요구사항: REQ-20260418-027 FR-01~08, US-01~03

**관찰된 flaky (2026-04-18)**:
- `npm test` 1회 실행에서 `src/Log/Log.test.jsx:46` (`await screen.findAllByRole("listitem"); expect(length).toBe(7)`) 가 타임아웃 실패 1건 관측. 단독 `npx vitest run src/Log/Log.test.jsx` 6/6 PASS. 재실행 254/254 PASS → **flaky 의심**.
- 원인 후보: MSW handler leak (test 본문에서 `listen/close` 직접 관리), `process.env.NODE_ENV` 직접 mutation 미복원, `vi.spyOn(common, "isLoggedIn"/"isAdmin")` 미복원, `setupFiles` 의 글로벌 afterEach 부재.

**현재 패턴 (결함)** — `src/Log/Log.test.jsx`:
- `console.log = vi.fn()` / `console.error = vi.fn()` 모듈 스코프 mutation (line 7-8), `afterEach`/`afterAll` 부재.
- 테스트 본문마다 `mock.prodServerOk.listen()` → body → `resetHandlers(); close();` (line 52/88-89, 94/114-115 등). **body throw 시 `close()` 미호출 → 다른 파일까지 핸들러 누설 가능**.
- `process.env.NODE_ENV = 'production'` 직접 변형 (line 54, 96), 복원 없음.
- `vi.spyOn(common, "isLoggedIn"/"isAdmin")` 매번 새로 spy, `vi.restoreAllMocks` 부재.
- `src/setupTests.js:1-5` 는 `@testing-library/jest-dom` import 만 — 글로벌 afterEach / MSW 글로벌 setupServer 부재.

**표준 패턴 (To-Be)**:

**3.6.1 글로벌 `src/setupTests.js` 강화 (FR-02)**
```js
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  cleanup(); // vitest globals 모드에서 자동이지만 명시 안전망
});
```
- 전역 `afterEach` 로 spy / env stub / DOM 정리 1회 보장.
- 적용은 setupTests 단독 변경이라 전 테스트에 영향 → 본 REQ 머지 시 전체 테스트 1회 회귀 검증 필수 (위험 1).

**3.6.2 MSW 글로벌 `setupServer` (FR-03)**
Log 도메인 파일럿 — 테스트 본문의 테스트별 `listen`/`close` → 단일 글로벌 인스턴스 + `server.use(...)` override:
```js
// src/Log/Log.test.jsx 예시
import { setupServer } from 'msw/node';
const server = setupServer(); // 글로벌 1회
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// 테스트별 핸들러 override
server.use(...mock.prodServerOk.listHandlers()); // 또는 http.get(...) 직접
```
- 핸들러 leak 0 — body throw 해도 afterEach 가 reset 보장.
- 본 REQ 는 **Log 도메인만**. 다른 도메인(Comment/File/Image/Search/Monitor) 마이그레이션은 별 태스크.

**3.6.3 `NODE_ENV` stub 패턴 (FR-04)**
`env-spec.md` §5.2 권고와 정합:
```js
// Before
process.env.NODE_ENV = 'production';
// After
vi.stubEnv('NODE_ENV', 'production');
// afterEach(vi.unstubAllEnvs) 는 §3.6.1 글로벌 afterEach 에 위임
```
- 전역 복원 보장 → 다음 테스트로의 누설 0.

**3.6.4 flaky baseline + 회귀 측정 (FR-01, FR-05)**
- Phase 1 — 변경 전 `npm test` **5회 반복** → 실패 빈도 표 박제 (result.md 또는 PR 본문).
- Phase 2 — `grep -rn "setupServer\|process.env.NODE_ENV\|vi.spyOn" src/**/*.test.{js,jsx}` 로 다른 도메인 매핑.
- Phase 3 — 본 변경 후 동일 명령 **5회 반복** → 100% PASS 박제 (NFR-01 목표 0/5 실패).

**3.6.5 TanStack Query 캐시 누설 (관련)**
- Log 도메인이 Query 로 마이그레이션 된 구간(§3.3) 에서는 `renderWithQuery` 의 per-call `QueryClient` 가 캐시 누설을 차단. MSW 격리와 결합하면 도메인 격리 완성도 상승.

**3.6.6 범위 밖**
- 다른 도메인(Comment/File/Image/Search/Monitor) 의 일괄 격리 표준화 — 별 태스크 (planner 가 Log 검증 후 결정).
- MSW v3 마이그레이션, Playwright/E2E 도입, `--threads` 병렬화 정책 변경, vitest 4 → 5 bump.
- 테스트 픽스처 분리 (`__fixtures__/*`).

**수용 기준 (REQ-20260418-027 §10)**:
- [ ] 변경 전 `npm test` 5회 반복 flaky baseline 박제
- [ ] `src/setupTests.js` 에 `afterEach(vi.restoreAllMocks + vi.unstubAllEnvs + cleanup)` 추가
- [ ] `src/Log/Log.test.jsx` 의 `process.env.NODE_ENV` mutation → `vi.stubEnv`
- [ ] `src/Log/Log.test.jsx` 의 테스트별 `listen/close` → 글로벌 `setupServer` + `afterEach(resetHandlers)` + `afterAll(close)`
- [ ] 본 변경 후 `npm test` 5회 연속 100% PASS (CI 또는 로컬)
- [ ] `npm run lint` / `npm run build` 회귀 0
- [ ] `env-spec.md` §5.2 / §5.3 정합 점검 (inspector cross-link)
- [ ] result.md 에 baseline + 변경 후 5회 결과 + 다른 도메인 매핑 표 박제

**React 19 bump (REQ-012) 와의 관계**: bump 후 RTL 16 의 act/cleanup 동작 변경으로 flaky 빈도 증가 가능성 — **본 REQ-027 을 bump 선행 권장** (NFR-04 from REQ-027).

### 3.7 [WIP] 도메인 전반 MSW lifecycle / `NODE_ENV` 변형 격리 Phase 2 (REQ-20260419-012)

> 관련 요구사항: REQ-20260419-012 FR-01 ~ FR-10, US-01 ~ US-04, NFR-01 ~ NFR-06

**맥락 (2026-04-19 관측)**: REQ-20260418-027 (Log 도메인 Phase 1, done — §3.6) 머지 직후 5회 연속 308/308 PASS 를 박제했으나, 직후 신규 작업 컨텍스트에서 `npm test` 전체 스위트 2회 연속 실행 시 각각 1건씩 서로 다른 파일이 실패 (pass-rate 5:2 ≈ 71%):
- run 1: `src/App.test.jsx > render title text "park108.net" correctly` — `findByText("park108.net")` 타임아웃 (Skeleton 만 렌더).
- run 2: `src/Log/LogSingle.test.jsx > render LogSingle on prod server` — 1건 실패.
- 이후 5회 연속 308/308 PASS. 변경 전 baseline 3회 307/307 PASS.

**원인 분석 (followup `20260418-1200-intermittent-test-flake.md` §가설 1~5)**:
1. 다른 파일의 `prodServer.listen()` 가 throw → `close()` 미도달 → 후속 파일로 핸들러 누설.
2. `process.env.NODE_ENV = 'production'` 직접 변형 미복원 → 후속 테스트가 의도와 다른 모드.
3. `vi.spyOn(common, ...)` 미복원 → 누적 spy.
4. `Search.test.jsx` REQ-021 unmount 케이스의 microtask flush 가 후속 MSW 로 leak.
5. vitest 4.x + jsdom 29 + React 18 Suspense 초기 렌더 중 macrotask 끼어듦.

**패턴 매핑 (Bash `grep -l 'setupServer\|prodServer.*listen()\|process.env.NODE_ENV =' src/**/*.test.{js,jsx}` = 17 파일)**: `App.test.jsx` (MSW 부재이나 Suspense 오염 가능), `Search.test.jsx`, `LogSingle.test.jsx`, `LogItem.test.jsx`, `Writer.test.jsx`, `ImageSelector.test.jsx`, `common/common.test.js`, `File/{File,FileDrop,FileUpload}.test.jsx`, `Monitor/{WebVitalsItem,ContentItem,ApiCallItem,VisitorMon,Monitor}.test.jsx`, `Search/SearchInput.test.jsx`, `Comment/Comment.test.jsx`, `Log/Log.test.jsx` (REQ-027 Phase 1 대상 — 동일 패턴 잔존 재확인).

**3.7.1 진단 baseline (FR-01)**

- `npm test` 5회 연속 실행 → 실패 케이스 매핑 표 (파일/케이스/메시지/순서) 박제 (result.md / PR 본문).
- 격리 실행 3종:
  - `npx vitest run --no-file-parallelism` 5회 → flake 소멸 시 cross-file leak 확정.
  - `npx vitest run src/App.test.jsx` 단독 5회 → 0 실패 시 다른 파일 leak 가설 강화.
  - `npx vitest run src/Search/Search.test.jsx src/App.test.jsx` 조합 5회 → Search leak 가설 검증.
- 5 가설 × 검증 결과 매트릭스 박제.

**3.7.2 `src/setupTests.js` 글로벌 lifecycle 강화 (FR-02)**

§3.6.1 의 `afterEach(vi.restoreAllMocks + vi.unstubAllEnvs + cleanup)` 베이스라인 위에 **MSW 단일 글로벌 인스턴스** 추가:

```js
// src/setupTests.js (Phase 2 To-Be)
import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';

export const server = setupServer(); // 빈 핸들러 — per-test `server.use(...)` override

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  cleanup();
});
afterAll(() => server.close());
```

- 각 테스트 파일은 `import { server } from '../setupTests'` 후 `server.use(http.get(...))` 로 핸들러 override.
- per-test `listen()` / `close()` 직접 호출 **제거** — afterEach 가 reset 보장 → body throw 해도 leak 0.

**3.7.3 도메인별 sweep 우선순위 (FR-03, FR-04)**

단계적 sweep. 각 단계는 독립 PR 또는 task 분할 가능 (planner 결정).

**우선 (Must, 실패 케이스 매핑)**:
1. `App.test.jsx` (실패 케이스 1) — MSW 부재이나 `console.*` mock 누설 / Suspense 오염 점검.
2. `LogSingle.test.jsx` (실패 케이스 2) — REQ-027 Phase 1 패턴 재적용 (per-test `listen`/`close` → 글로벌 `server.use`). **[carve: REQ-20260420-009 — 2026-04-20 commit `1fc05e9` 직후 flake 재현 evidence 기반 독립 carve. 3 패턴 (모듈 스코프 console mutation / per-test listen/close / NODE_ENV 직접 mutation) 로컬 해소 + `CI=true npm test` 3회 연속 PASS 검증. 본 REQ 머지 후 inspector 라운드에서 이 행 `[x]` flip + commit hash 박제.]**
3. `Search.test.jsx` (followup 가설 3 의심 source) — REQ-021 unmount 케이스의 microtask flush 효과 검증 + 필요 시 `await waitFor(...)` 보강.
4. `SearchInput.test.jsx` — 동일 도메인 일관성.

**잔여 (Should, 별 후속 분리 권장)**:
- `Comment/Comment.test.jsx`, `Image/{ImageSelector,ImageItem}.test.jsx`, `File/{File,FileDrop,FileUpload,FileItem}.test.jsx`, `Monitor/{Monitor,VisitorMon,ContentItem,ApiCallItem,WebVitalsItem,WebVitalsMon}.test.jsx`, `common/{common.test.js,UserLogin.test.jsx}`.
- 본 PR 범위 판단은 planner 영역 (REQ-012 §13 미결 1).
- carve 전략 (REQ-20260420-009 Priority 2 선례) 이 성공 시 Priority 1/3/4 및 잔여 도메인도 동형 1-파일 carve REQ 로 분기.

**3.7.4 `process.env.NODE_ENV` 직접 변형 sweep (FR-05)**

- `grep -rn 'process\.env\.NODE_ENV\s*=' src/**/*.test.{js,jsx}` → 모든 매치를 `vi.stubEnv('NODE_ENV', 'production')` 로 치환.
- 복원은 §3.7.2 의 글로벌 `afterEach(vi.unstubAllEnvs)` 에 위임.
- `env-spec.md` §5.2 정합 (이미 vitest mode 정책 박제됨).
- 목표: 매치 수 0 (NFR-04).

**3.7.5 `console.*` 모듈 스코프 mutation 정리 (FR-06, Should)**

- `console.log = vi.fn()` / `console.error = vi.fn()` 직접 할당 → `vi.spyOn(console, 'log').mockImplementation(() => {})` + `afterEach(spy.mockRestore)` 또는 file-scope `beforeAll/afterAll` 페어.
- LogSingle.test.jsx line 8-10 등 대표 케이스.

**3.7.6 회귀 방어 (FR-08, Should)**

- `vitest` 옵션 `--retry=0` 명시 (`vite.config.js` test 블록) — 무의식적 재시도 의존 차단.
- GitHub Actions CI 에 `npm test` 3회 연속 nightly/weekly cron job 검토 (FR-09, Could).
- flake 재발 시 자동 issue 생성 hook — 별 후속.

**3.7.7 진단 절차 박제 (FR-09, Could)**

- `docs/testing/test-flake-triage.md` (또는 `setupTests.js` jsdoc 코멘트) 로 §3.7.1 격리 실행 3종 + 5 가설 검증 매트릭스 박제. 향후 flake 재발 시 ≤30분 내 원인 분류 골든 패스.

**3.7.8 수용 기준 grep (REQ-012 §10)**

- `grep -rn 'process\.env\.NODE_ENV\s*=' src/**/*.test.{js,jsx}` → 0 매치 (NFR-04).
- `grep -rn 'setupServer' src/**/*.test.{js,jsx}` → import 만 매치 (테스트 본문의 per-file 인스턴스 0).
- `grep -rn 'prodServer.*\.listen()\|prodServer.*\.close()' src/**/*.test.{js,jsx}` → 0 (글로벌 위임).
- `npm test` 5회 연속 100% PASS (NFR-01).
- (Should) 30회 연속 ≥ 99% PASS (NFR-02).
- `npm run lint` 0 warn, `npm run build` PASS.

**3.7.9 범위 밖**

- vitest 4 → 5 bump, MSW v3 마이그레이션, Playwright/E2E 도입(REQ-031), 픽스처 분리(`__fixtures__/*`), 테스트 병렬화 정책(`--threads`).
- 신규 테스트 케이스 추가 (회귀 방어 전용 외).
- Comment 도메인 visual smoke (REQ-035 영역).

**3.7.10 React 19 bump (REQ-040) 와의 관계**

- React 19 strict mode double-invocation 강화 → 본 flake 빈도 ↑ 가능. **본 REQ-012 를 bump 선행 권장** (REQ-027 권장과 동일한 선행 관계).

### 3.8 [WIP] `vi.useFakeTimers()` 크로스파일 누수 방지 — LogSingle flaky timeout 수렴 (REQ-20260420-017)

> 관련 요구사항: REQ-20260420-017 FR-01 ~ FR-06, US-01 ~ US-03

**맥락 (2026-04-20 3회 재현)**: `src/Log/LogSingle.test.jsx` 의 8 케이스가 풀 스위트 실행 중 간헐적으로 5003~5007ms 타임아웃으로 FAIL. 2026-04-20 당일 1657 / 1720 / 0835 총 3회 재현 — followup 승격 임계치 충족. 단독·디렉토리 일괄 실행 시 100% PASS 이므로 **본 파일의 로직 결함이 아니라** 풀 스위트 실행 시 (a) 타 파일이 남긴 `vi.useFakeTimers()` 상태 누수 또는 (b) vitest 포크 풀 간 MSW 경합이 원인 추정. REQ-20260420-009 (MSW lifecycle carve) 와 **범위·원인이 상이** — 본 §3.8 은 fake-timer · pool 영역, REQ-009 는 MSW lifecycle · NODE_ENV · console spy 영역.

**현재 실측 (2026-04-20)**:
- `vi.useFakeTimers()` 호출 파일 14개 (Monitor/VisitorMon, Log/LogItemInfo, Comment/CommentItem, common/useHoverPopup, Log/LogItem, Search/SearchInput, Comment/Comment, File/FileUpload, File/FileDrop, File/File, Monitor/ContentItem, Log/LogSingle, Log/Writer, Toaster/Toaster).
- `src/setupTests.js` 에 `vi.useFakeTimers|vi.useRealTimers` 패턴 0 hits — **전역 방어 부재**.
- `src/Log/LogSingle.test.jsx` 내부: `:86` `useFakeTimers()` 진입 후 `:112/:185/:222` `useRealTimers()` 복원. `:148/:191` (`'get OK delete failed'` 2건) 은 `useFakeTimers()` 진입 없이 시작하지만 **파일 초입의 fake-timer 잔재** 시 MSW 핸들러의 real-timer 기반 비동기 대기가 고갈될 수 있음.

**Phase A (즉시 완화, Must — FR-01/FR-02)**:
- `src/Log/LogSingle.test.jsx` 의 모든 `it()` 종료 시 `vi.useRealTimers()` 호출 누락 없음. 특히 `:148`, `:191` 취약 케이스는 **진입 전에도** real-timer 상태를 보장 (시작부 `vi.useRealTimers()` 선제 호출 또는 per-case `{ timeout: 15000 }`).
- 취약 케이스(`'get OK delete failed'` 2건) 타임아웃 5s → 15s 상향:
  ```js
  it('get OK delete failed', async () => { /* ... */ }, { timeout: 15000 });
  ```

**Phase B (전역 방어, Should — FR-03)**:
- `src/setupTests.js` 에 전역 `afterEach` 추가 (기존 `beforeEach` clipboard stub 및 MSW/NODE_ENV 훅과 공존 확인):
  ```js
  // src/setupTests.js
  import { afterEach } from 'vitest';

  afterEach(() => {
    vi.useRealTimers();
  });
  ```
- §3.7.2 의 `afterEach(server.resetHandlers + vi.unstubAllEnvs + vi.restoreAllMocks + cleanup)` 베이스라인과 **공존** — 실행 순서는 vitest 기본(등록 순서). 필요 시 단일 `afterEach` 블록에 합치기도 허용.

**Phase C (원인 확정, Could — FR-05)**:
- `vite.config.test.js` 에 **1회 실험** `pool: 'forks', poolOptions: { forks: { singleFork: true } }` 으로 풀 스위트 10회 실행 → LogSingle 단독 포크에서 flake 재현 여부 관측. 재현 시 "포크간 경합" 이 아닌 "파일 내부 원인" 으로 재진단. **persistent 변경 금지** — 실험 후 원복.
- 결과는 `specs/followups/*.md` 1건으로 박제 (원인 확정 또는 가설 반증).

**14 파일 감사 (Should — FR-04)**:
- 각 파일이 `useFakeTimers` 에 대응하는 `useRealTimers` 복원 호출을 보유하는지 `grep` 1차 감사. 결과는 task result.md 에 표로 박제. 수정은 본 REQ 범위 밖 (별 REQ 후보).

**grep 수용 기준 (FR-06)**:
- `grep -c "vi.useRealTimers" src/Log/LogSingle.test.jsx` — expected ≥ 4 hits.
- `grep -c "vi.useRealTimers" src/setupTests.js` — expected ≥ 1 hit.
- `grep -c "timeout: 15000" src/Log/LogSingle.test.jsx` — expected ≥ 2 hits (취약 케이스 2건).

**수용 기준 (REQ-20260420-017 §10)**:
- [ ] Phase A 적용 후 `npm test` 10회 연속 실행 중 LogSingle 8 케이스 100% PASS.
- [ ] Phase B 적용 후 `src/setupTests.js` 에 `afterEach(() => { vi.useRealTimers(); })` 존재.
- [ ] FR-06 grep 쿼리 3종 충족.
- [ ] Phase C 실험 결과 followup 1건 발행 (원인 확정 또는 가설 반증).
- [ ] REQ-20260420-009 와의 범위 중복 없음 — 본 §3.8 은 fake-timer · pool, 그 REQ 는 MSW lifecycle · NODE_ENV · console spy.

**범위 밖**:
- REQ-20260420-009 범위 (MSW lifecycle + NODE_ENV mutation + console spy 복원).
- 14 파일 전반의 `useFakeTimers` 패턴 리팩토링 (Phase B 감사 후 별 REQ 후보).
- vitest 버전 업그레이드 / Node 런타임 변경.
- CI flaky-test retry 정책 (근원 수렴 우선).

**REQ-009 와의 경계**: 두 REQ 모두 LogSingle.test.jsx 공동 대상이나 스코프 상이. planner 가 LogSingle.test.jsx 수정 태스크를 1건으로 합칠지 2건으로 분할할지 carve.

## 4. 의존성

### 4.1 패키지 (신규)
- `@tanstack/react-query`
- `@tanstack/react-query-devtools`

### 4.2 spec 의존
- `specs/spec/green/build/react-version-spec.md` — Suspense Query 는 React 19 후
- `specs/spec/green/types/typescript-spec.md` — `queryFn` 안에서 Zod 검증 결합 가능

### 4.3 테스트
- MSW 와 조합 — 기존 `*.mock.js` 또는 MSW handler 로 응답 모킹
- 테스트 wrapper 에 `QueryClientProvider` 필요 — **공용 헬퍼 `src/test-utils/renderWithQuery.jsx`** (REQ-20260418-013)
  - 시그니처: `renderWithQuery(ui, options)` → `{ ...RTL render result, queryClient }`
  - **per-call 신규 `QueryClient`** (모듈 싱글톤 금지) → 테스트 간 캐시 누설 0
  - 기본 옵션: `retry: false`, `gcTime: 0`, `staleTime: 0` (실패 mock 이 무한 재시도로 번지지 않도록)
  - `options.queryClient` 주입 허용 — "캐시에 데이터 있을 때" 시나리오 테스트용 (`qc.setQueryData(...)` 사전 채우기)
  - `options.routerWrapper` 옵션 (Should) — `MemoryRouter` 동시 래핑. default off (router 미의존 훅의 과한 셋업 회피). 세부 디자인은 planner 가 첫 도메인 훅 태스크에서 확정.
  - 작성 언어: `.jsx` (TS 마이그레이션 의존 없음) + JSDoc 타입 힌트
  - 단위 테스트 `src/test-utils/renderWithQuery.test.jsx` — per-call 신규 인스턴스 / 외부 주입 / `retry:false` 동작을 각각 어서트.
  - coverage 설정: `vite.config.js` 의 coverage exclude 에 `src/test-utils/**` (헬퍼 자체 측정 제외, 헬퍼 테스트는 포함).
  - 네이밍 컨벤션: `src/test-utils/<verb>.jsx` — 향후 `renderWithRouter` 등 분리 시 같은 디렉토리.
- **기대 효과**: 도메인 훅 테스트당 Provider 보일러플레이트 ≥4줄 절감, 캐시 누설 0 (NFR-01, NFR-02 from REQ-013).

#### 4.3.1 [WIP] `renderWithQuery` 컴포넌트 테스트 rollout (REQ-20260419-005)

> 관련 요구사항: REQ-20260419-005 FR-01 ~ FR-10, US-01 ~ US-03

**맥락 (2026-04-19 관측)**: REQ-20260418-013 이 `renderWithQuery(ui, options)` 시그니처를 commit 했으나 실제 구현은 `createQueryTestWrapper()` 로 부분 충족 — 훅 테스트(`renderHook`) 4 파일이 `{ wrapper: Wrapper }` 형태로 사용 중이나 컴포넌트 테스트(`render`) 는 `renderWithQuery` 를 직접 호출하지 못한다. TSK-MUT-CREATE / TSK-MUT-DELETE 머지로 `src/Log/Writer.test.jsx`, `src/Log/LogItem.test.jsx`, `src/Log/LogSingle.test.jsx` 3 파일이 모두 **동일 inline `makeQueryClient` + `withQuery` 헬퍼** 를 복제 중(≈30 LOC × 3). TSK-MUT-UPDATE 머지 시 `Log.test.jsx` (LogList 통합) 등에도 동일 drift 가 재발될 위험.

**목표 (In-Scope)**:

**4.3.1.1 `renderWithQuery(ui, options)` 함수 신설 (FR-01 ~ FR-04)**
- 위치: `src/test-utils/queryWrapper.jsx` 내 함수 추가 또는 신규 `src/test-utils/renderWithQuery.jsx` — planner 결정 (REQ-005 §13 미결 1).
- 시그니처: `(ui, options) => ({ ...RTL render result, queryClient })`.
- per-call 신규 `QueryClient` (모듈 싱글톤 금지 — 캐시 누설 0).
- 기본 옵션: `retry: false`, `gcTime: 0`, `staleTime: 0`, `mutations: { retry: false }` — 기존 `createQueryTestWrapper` 와 동등.
- `options.queryClient` 외부 주입 허용 — 캐시 사전 채우기 시나리오.
- `options` 의 나머지는 RTL `render` 의 `RenderOptions` 로 위임 (`baseElement`, `container`, `wrapper` 충돌 방지).

**4.3.1.2 Log 도메인 컴포넌트 테스트 3 파일 치환 (FR-05 ~ FR-07)**
- `src/Log/Writer.test.jsx` 의 inline `makeQueryClient` + `withQuery` 정의 제거 + `render(withQuery(...))` 9 호출 → `renderWithQuery(...)`.
- `src/Log/LogItem.test.jsx` 의 inline 정의 제거 + 호출 사이트 치환.
- `src/Log/LogSingle.test.jsx` 의 inline 정의 제거 + 호출 사이트 치환.

**4.3.1.3 단위 테스트 (FR-08)**
- `src/test-utils/renderWithQuery.test.jsx` 신규 (또는 기존 `queryWrapper.test.jsx` 확장) — per-call 신규 인스턴스 / 외부 주입 / 기본 옵션 / mutation 시나리오(`onSuccess` 콜백 흡수) 각각 어서트.

**4.3.1.4 `createQueryTestWrapper` 와의 관계 (REQ-005 §13 미결 2)**
- 훅 테스트(`renderHook`) → `createQueryTestWrapper` (기존 4 파일 유지).
- 컴포넌트 테스트(`render`) → `renderWithQuery` (본 rollout 대상).
- 관계는 본 §4.3.1 또는 헬퍼 jsdoc 에 명시. 한쪽으로 흡수/통합은 본 REQ 범위 밖이지만 spec 명시 필수.

**4.3.1.5 grep 회귀 차단 (FR-10)**
- `grep -c "const makeQueryClient\|const withQuery" src/Log/Writer.test.jsx src/Log/LogItem.test.jsx src/Log/LogSingle.test.jsx` → 0.
- `grep -rn "QueryClient\|QueryClientProvider" src/Log/*.test.jsx` → 헬퍼 import 만 매치.

**수용 기준 (REQ-20260419-005 §10)**:
- [ ] FR-01 ~ FR-10 모두 충족
- [ ] `renderWithQuery(ui, options)` 함수 존재 + 단위 테스트 PASS
- [ ] Writer/LogItem/LogSingle 3 테스트 파일에서 inline wrapper 정의 0 (grep)
- [ ] `npm test` 100% PASS, 커버리지 ±0.5pp
- [ ] `npm run lint` 0 warn/error, `npm run build` PASS
- [ ] `createQueryTestWrapper` ↔ `renderWithQuery` 관계가 spec §4.3.1.4 또는 헬퍼 jsdoc 에 명시

**범위 밖**:
- 다른 도메인(File/Image/Comment/Search/Monitor) 컴포넌트 테스트의 wrapper 적용 — 본 REQ 는 Log 도메인 3 파일 한정.
- `MemoryRouter` / 기타 Provider 동시 래핑 옵션 (`options.routerWrapper`) — 별 후속 (§4.3 Should 에 이미 명시됨).
- TanStack Query v6 / Suspense Query 패턴 — 별 spec.
- `createQueryTestWrapper` 제거/흡수 — 훅 테스트 마이그레이션 비용 vs 병존 단순성 trade-off, 본 REQ 범위 밖.

**인접성**:
- REQ-20260419-009 (Writer `isProcessing` 파생화) 와 `Writer.test.jsx` 공동 수정 가능하나 상호 직교. planner 가 머지 순서 결정. 본 §은 어서트 변경 0 (wrapper 치환만).
- TSK-20260418-MUT-UPDATE 가 `task/ready/` — 본 rollout 이 선행되면 update 훅 도입 시 추가 wrapper 보일러플레이트 0 (REQ-005 US-03).

## 5. 수용 기준 (Acceptance)
- [ ] Log 도메인에서 수동 로딩/에러 상태 관리 코드 제거
- [ ] 동일 데이터 중복 요청 없음 (Devtools 또는 네트워크 패널 확인)
- [ ] Devtools 에서 쿼리 상태 확인 가능
- [ ] 테스트 통과 (MSW / 기존 mock 과 조합)
- [ ] 낙관적 업데이트(작성/수정/삭제) 가 사용자에게 즉시 반영
- [ ] (REQ-20260418-013) `src/test-utils/renderWithQuery.jsx` + `renderWithQuery.test.jsx` 존재 및 PASS
- [ ] (REQ-20260418-013) 기본 `retry: false` 검증 — 실패 mock 1회만 시도 후 에러 상태 안착
- [ ] (REQ-20260418-013) `vite.config.js` coverage exclude 에 `src/test-utils/**` 반영

### 5.2 REQ-20260418-033 수용 기준 (Log mutation 경로 `useMutation` 전환 — §3.3 마감)
- [ ] `src/Log/hooks/useCreateLog.js`, `useUpdateLog.js`, `useDeleteLog.js` 3 파일 신규 생성, `useMutation` 사용
- [ ] 각 훅이 `onSuccess` 에서 적절한 `invalidateQueries` 호출 (list / detail 양 또는 list 만)
- [ ] `src/Log/Writer.jsx` 의 createLog/editLog useEffect 가 mutate 콜백으로 교체, `isProcessing` 제거
- [ ] `src/Log/LogItem.jsx` 의 deleteLogItem 이 mutate 호출로 교체
- [ ] `sessionStorage.removeItem("logList" / "logListLastTimestamp")` 4 줄 제거
- [ ] mutationFn 안에서 `statusCode !== 200` 시 throw — onError 단일 처리
- [ ] `src/Log/hooks/useCreateLog.test.js`, `useUpdateLog.test.js`, `useDeleteLog.test.js` 신규, 각 ≥3 케이스 PASS (success / error / invalidation)
- [ ] `Writer.test.jsx`, `LogItem.test.jsx`, `Log.test.jsx` 기존 케이스 100% PASS + LogList "새 게시 후 자동 갱신" 케이스 1건 신규
- [ ] `npm test` 100% PASS, `npm run lint` 0 warn, `npm run build` PASS
- [ ] `grep -rn "sessionStorage.*logList\|sessionStorage.*logListLastTimestamp" src/` → 0 lines (result.md 박제)
- [ ] `grep -rn "await postLog\|await putLog\|await deleteLog" src/` → hooks/ 내 mutationFn 정의만 매치
- [ ] 본 PR 머지 후 §3.3 4 화면(LogList/LogSingle/Writer/LogItem) 모두 훅 적용 완료 표기 가능 (inspector 추가 갱신)
- [ ] (Could) 낙관적 업데이트 (onMutate + setQueryData) 별 후보 분리
- [ ] (Could) 운영자 1회 검증: 게시 → 즉시 list 진입 → 새 항목 노출 + Network 추가 fetch 0 — **REQ-20260419-008 로 인프라 실현**

### 5.3 REQ-20260419-005 수용 기준 (`renderWithQuery` 컴포넌트 테스트 rollout)
> 관련 요구사항: REQ-20260419-005 §10

- [ ] `src/test-utils/queryWrapper.jsx` 또는 신규 `src/test-utils/renderWithQuery.jsx` 에 `renderWithQuery(ui, options)` 함수 존재
- [ ] per-call 신규 `QueryClient` + `retry: false` / `gcTime: 0` / `staleTime: 0` / `mutations: { retry: false }` 기본 옵션
- [ ] `options.queryClient` 외부 주입 허용
- [ ] `src/Log/Writer.test.jsx`, `src/Log/LogItem.test.jsx`, `src/Log/LogSingle.test.jsx` 3 파일에서 inline `makeQueryClient` + `withQuery` 정의 0 (`grep -c "const makeQueryClient\|const withQuery"` → 0)
- [ ] 세 파일의 `render(withQuery(...))` 호출 사이트가 모두 `renderWithQuery(...)` 로 치환
- [ ] `src/test-utils/renderWithQuery.test.jsx` 신규 — per-call 신규 인스턴스 / 외부 주입 / 기본 옵션 / mutation 콜백 흡수 어서트
- [ ] `npm test` 100% PASS, 커버리지 ±0.5pp, `npm run lint` 0 warn, `npm run build` PASS
- [ ] `createQueryTestWrapper` ↔ `renderWithQuery` 관계가 본 spec §4.3.1.4 또는 헬퍼 jsdoc 에 명시
- [ ] `grep -rn "QueryClient\|QueryClientProvider" src/Log/*.test.jsx` → 헬퍼 import 만 매치

### 5.4 REQ-20260419-007 수용 기준 (LogList `useLogList` 소비 + sessionStorage 제거)
> 관련 요구사항: REQ-20260419-007 §10

- [ ] `src/Log/LogList.jsx` 가 `useLogList` (또는 `useLogListInfinite`) 를 소비 (`grep -rn "useLogList(" src/Log/LogList.jsx` ≥ 1)
- [ ] `useState(logs)` / `setIsLoading` / `setIsError` / `setLastTimestamp` 4 상태 제거 → 훅 반환값 사용
- [ ] `useEffect` 기반 `fetchFirst` / `fetchMore` 제거 → `fetchNextPage` 또는 cursor 파라미터 변경
- [ ] `sessionStorage.setItem/getItem/removeItem("logList" | "logListLastTimestamp")` 전부 제거
- [ ] `src/Log/Log.jsx` 의 미사용 `import { getLogs, getNextLogs }` 제거
- [ ] `src/Log/hooks/useLogList.js` 페이지네이션 지원 (cursor 또는 `useInfiniteQuery` 변형)
- [ ] `Log.test.jsx` 또는 `LogList.test.jsx` 에 "create-then-list 자동 갱신" 케이스 1건 신규 PASS (§3.3.1.5 commitment 실현)
- [ ] 기존 `LogList.test.jsx`, `Log.test.jsx`, `Writer.test.jsx`, `LogItem.test.jsx` 100% PASS
- [ ] `grep -rn "sessionStorage.*logList\|sessionStorage.*logListLastTimestamp" src/` → 0 lines
- [ ] `npm test` 100% PASS, 커버리지 ±0.5pp, `npm run lint` 0 warn, `npm run build` PASS
- [ ] §3.3 의 LogList 행 상태를 "완료 — commit `<hash>`" 로 갱신 (inspector 영역)
- [ ] (Should) `LogList.jsx` LOC 감소 측정 박제

### 5.5 REQ-20260419-008 수용 기준 (mutation 런타임 smoke 체크리스트 문서 신설)
> 관련 요구사항: REQ-20260419-008 §10 — 상세는 `specs/spec/green/testing/log-mutation-runtime-smoke-spec.md` §5

- [ ] `docs/testing/log-mutation-runtime-smoke.md` 파일 생성
- [ ] 시나리오 매트릭스 8건(MC-01~06 + MD-01~03) + 환경 매트릭스 + 결과 기록 칸 포함
- [ ] 향후 `useUpdateLog` 확장 가이드 포함 (MU-?? 추가 절차 메타)
- [ ] 본 §3.3.1.8 에서 smoke-spec 으로 링크 (완료 — inspector)
- [ ] 체크리스트 1회 실행(PASS 보고) 은 본 REQ 범위 밖 — 문서 신설까지만

### 5.7 REQ-20260419-012 수용 기준 (도메인 전반 MSW lifecycle Phase 2)
> 관련 요구사항: REQ-20260419-012 §10 — 상세는 본 spec §3.7

- [ ] FR-01 진단 baseline: `npm test` 5회 + `--no-file-parallelism` 5회 + 단독 5회 매트릭스 박제 (result.md / PR 본문)
- [ ] FR-02 `src/setupTests.js` 에 글로벌 `setupServer` 인스턴스 + `beforeAll(server.listen)` + `afterEach(server.resetHandlers)` + `afterAll(server.close)` 추가
- [ ] FR-03 우선 4 파일 sweep 완료 (`App.test.jsx`, `LogSingle.test.jsx`, `Search.test.jsx`, `SearchInput.test.jsx`)
- [ ] FR-05 `grep -rn 'process\.env\.NODE_ENV\s*=' src/**/*.test.{js,jsx}` → 0 매치 (NFR-04)
- [ ] FR-07 로컬 + CI 5회 연속 100% PASS 박제 (NFR-01)
- [ ] `grep -rn 'setupServer' src/**/*.test.{js,jsx}` → import 만 매치 (per-file 인스턴스 0)
- [ ] `grep -rn 'prodServer.*\.listen()\|prodServer.*\.close()' src/**/*.test.{js,jsx}` → 0
- [ ] `npm test` 100% PASS, 커버리지 ±0.5pp, `npm run lint` 0 warn, `npm run build` PASS
- [ ] (Should) FR-04 잔여 12+ 파일 sweep 완료 비율 박제 (본 PR 또는 별 후속)
- [ ] (Should) FR-06 `console.*` mutation 정리 (`vi.spyOn` + restore)
- [ ] (Should) FR-08 `vite.config.js` test 블록에 `retry: 0` 명시
- [ ] (Should) NFR-02: 30회 연속 ≥ 99% PASS
- [ ] (Could) FR-09 `docs/testing/test-flake-triage.md` 신설 또는 `setupTests.js` jsdoc 박제
- [ ] `env-spec.md` §5.2 정합 (inspector cross-link 확인)

### 5.6 REQ-20260419-009 수용 기준 (Writer `isProcessing` 파생화 — §3.3.1.2 commitment 마감)
> 관련 요구사항: REQ-20260419-009 §10

- [ ] `src/Log/Writer.jsx` 의 `const [isProcessing, setIsProcessing] = useState(false);` 제거
- [ ] `const isProcessing = createLogMutation.isPending || updateLogMutation.isPending;` (또는 동등) 파생식 도입
- [ ] `setIsProcessing(true/false)` 호출 6건 모두 제거
- [ ] `disabled={ isProcessing }` 2곳(`textarea` + submit 버튼) 유지 + 동기 반영
- [ ] `grep -c "setIsProcessing" src/Log/Writer.jsx` → 0
- [ ] `grep -n "isProcessing" src/Log/Writer.jsx` → ≤3 매치 (파생 1줄 + disabled 2곳)
- [ ] `Writer.test.jsx` 기존 케이스 100% PASS
- [ ] (Should) `Writer.test.jsx` 에 `mutate` 직후 disabled / onSuccess/onError 후 enabled 복귀 신규 어서트 1건
- [ ] `npm test` 100% PASS, 커버리지 ±0.5pp, `npm run lint` 0 warn, `npm run build` PASS
- [ ] 본 §3.3.1.2.1 의 commitment 충족 마킹 — 완료 시 "commit `<hash>`" 박제 (inspector)

### 5.8 REQ-20260419-023 수용 기준 (LogSingle `useLog` 소비 마이그레이션 — §3.3 조회 경로 drift 해소)

> 관련 요구사항: REQ-20260419-023 §10

- [ ] `src/Log/LogSingle.jsx` 에서 `fetchData` 또는 `getLog(` 를 직접 호출하는 `useEffect` 블록이 제거됨 (`grep -n "getLog(" src/Log/LogSingle.jsx` → 0)
- [ ] `isLoading`, `data`, `itemLoadingStatus` `useState` 선언 3개가 제거되거나 `useLog` 반환값/파생으로 대체 (DELETED 전이용 state 는 §13 결정 기록 후 유지 허용)
- [ ] `useLog(logTimestamp)` 가 `LogSingle` 내에서 ≥ 1회 호출 (`grep -n "useLog(" src/Log/LogSingle.jsx` ≥ 1)
- [ ] `useLog` 훅 파일(`src/Log/hooks/useLog.js`) 은 수정되지 않음 (Out-of-Scope)
- [ ] `setHtmlTitle(data)` / `setMetaDescription(data)` 는 `useEffect([data])` 에서 동등하게 호출 — 기존 동작 보존
- [ ] `LogSingle.test.jsx` 가 `renderWithQuery` (§4.3.1) 를 사용하며 기존 케이스 100% PASS
- [ ] `useLog` 호출 확인 어서트 1건 신규 (queryKey `['log','detail',timestamp]`)
- [ ] (Should) `useDeleteLog.mutate` → `removeQueries(['log','detail',timestamp])` 경로의 `LogSingle` 재렌더 실효 확인 1건
- [ ] `npm test` 100% PASS, 커버리지 ±0.5pp, `npm run lint` 0 warn, `npm run build` PASS
- [ ] 본 REQ 머지 후 inspector 가 §3.3 파일럿 LogSingle 행을 "완료 — commit `<hash>`" 로 박제

### 5.1 REQ-20260418-021 수용 기준 (AbortController 안전망)
- [ ] 6개 도메인 api.js (`Log`/`File`/`Image`/`Search`/`Comment`/`Monitor`) 모두 `{ signal }` 옵션 수용
- [ ] `grep -rn "AbortController" src/` → useEffect 내 fetch 호출처 10+ 사이트 커버
- [ ] `grep -rn "signal" src/*/api.js` → 모든 fetch 헬퍼 옵션 수용
- [ ] 모든 `useEffect` 내부 fetch 패턴이 4단계 (`new AC` → call → `signal` → cleanup `abort`) 준수
- [ ] catch 블록에 `err.name === 'AbortError'` silent return 분기 존재
- [ ] `LogList.test.jsx`, `Search.test.jsx` 대표 테스트에 unmount-after-unresolved-fetch 어서션 추가 (Should)
- [ ] `npm test` 로그에 "Cannot update unmounted component" 0건 (NFR-01)
- [ ] 기존 호출자 인터페이스 호환 (옵션 미지정 시 회귀 0)

## 6. 알려진 제약 / 이슈
- 캐시 무효화 전략(생성/수정 후 어떤 query 를 invalidate 할지) 을 도메인 별로 명시 필요
- React 19 의 Suspense Query 패턴이 안정화되면 훅 시그니처 변경 가능 — 파일럿 단계에서는 일반 `useQuery` 사용
- 테스트 wrapper 누락 시 무한 로딩 / 무한 재시도 위험

## 7. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending) | TanStack Query 도입 요구사항 등록 (WIP) | 3 |
| 2026-04-18 | (pending, REQ-20260418-013) | `renderWithQuery` 테스트 헬퍼 표준 명시 (WIP) | 4.3, 5 |
| 2026-04-18 | (pending, REQ-20260418-021) | `useEffect` + fetch 의 AbortController 안전망 패턴 추가 (Query 마이그레이션 전 도메인 baseline 보호) (WIP) | 3.5, 5.1 |
| 2026-04-18 | (pending, REQ-20260418-027) | Log.test flaky listitem — MSW 글로벌 `setupServer`, `vi.stubEnv`, `vi.restoreAllMocks` 격리 표준화 §3.6 신설 (WIP) | 3.6 |
| 2026-04-18 | (pending, REQ-20260418-033) | Log 도메인 mutation 경로(`useCreateLog`/`useUpdateLog`/`useDeleteLog`) 파일럿 마감 — `sessionStorage.removeItem("logList")` 트릭 제거 + `invalidateQueries` 전환 + `isProcessing` ad-hoc state 제거 (WIP) | 3.3.1, 5.2 |
| 2026-04-19 | (pending, REQ-20260419-005) | `renderWithQuery(ui, options)` 컴포넌트 테스트 rollout §4.3.1 신설 — Writer/LogItem/LogSingle 3 테스트 파일의 inline `makeQueryClient` + `withQuery` 중복 제거, `createQueryTestWrapper` 와의 역할 분리 명시 (WIP) | 4.3.1, 5.3 |
| 2026-04-19 | (pending, REQ-20260419-007) | LogList `useLogList` 소비 + `sessionStorage("logList"/"logListLastTimestamp")` 트릭 제거 §3.3.2 신설 — `invalidateQueries(['log','list'])` 실효 회복, `useInfiniteQuery` 또는 cursor 확장으로 페이지네이션 마이그레이션, §3.3.1.5 commitment 실현 (WIP) | 3.3, 3.3.2, 5.4 |
| 2026-04-19 | (pending, REQ-20260419-008) | Log mutation 런타임 수동 smoke 체크리스트 문서 §3.3.1.8 링크 + 별 spec 파일 `specs/spec/green/testing/log-mutation-runtime-smoke-spec.md` 신설 — §3.3.1.7 Could 운영자 검증 인프라 실현 (WIP) | 3.3.1.8, 5.5 |
| 2026-04-19 | (pending, REQ-20260419-009) | Writer `isProcessing` 로컬 state 제거 → `useCreateLog`/`useUpdateLog` 의 `isPending` 파생화 §3.3.1.2.1 신설 — §3.3.1.2 commitment 마감 (WIP) | 3.3.1.2.1, 5.6 |
| 2026-04-19 | (pending, REQ-20260419-012) | 도메인 전반 MSW lifecycle / `NODE_ENV` 변형 격리 Phase 2 §3.7 신설 — 17 파일 cross-domain sweep + 글로벌 `setupServer` / `vi.stubEnv` / `vi.spyOn` 표준화 + 진단 baseline 매트릭스 (REQ-027 Phase 1 후속) (WIP) | 3.7, 5.7 |
| 2026-04-19 | (pending, REQ-20260419-023) | LogSingle `useLog` 소비 마이그레이션 §3.3.3 신설 — §3.3 파일럿 "완료 (commit fa9424c)" 표기 drift 해소, 수동 state 3개(`isLoading`/`data`/`itemLoadingStatus`) 제거, `invalidateQueries(['log','detail',*])` 실효 회복 (WIP) | 3.3, 3.3.3, 5.8 |
| 2026-04-19 | (pending, REQ-20260419-034) | REQ-012 §3.7 Phase 2a 코드 실현 트리거 — `src/setupTests.js` 글로벌 setupServer + afterEach(resetHandlers + unstubAllEnvs + restoreAllMocks) + Comment.test.jsx 1 파일 PoC 마이그레이션; 머지 후 §3.7 Phase 2a 체크박스 `[x]` + Comment flake ≥99% 박제 | 3.7 |
| 2026-04-19 | (pending, REQ-20260419-028) | Log 도메인 3종 mutation(`useCreateLog`/`useUpdateLog`/`useDeleteLog`) `onError` Toaster UX 컨벤션 통합 — 공유 helper 또는 훅 레벨 default onError 도입, §3.3.1 하위 신설 예정 (WIP) | 3.3.1 |
| 2026-04-19 | (pending, REQ-20260419-031) | `useLog` 훅 `!res.ok` HTTP non-2xx 에러 브랜치 커버리지 단위 테스트 1건 추가 — `useLog.test.js` 신규 또는 확장, §4.3.1 renderWithQuery 패턴 적용 (WIP) | 4.3.1, 5.8 |
| 2026-04-20 | (pending, REQ-20260420-006) | Writer `isProcessing` 파생화 §3.3.1.2.1 코드 실현 트리거 — `setIsProcessing` 7 hits purge + `useCreateLog`/`useUpdateLog` `isPending` 파생; 머지 후 §3.3.1.2.1 `[x]` | 3.3.1.2.1 |
| 2026-04-20 | (pending, REQ-20260420-007) | LogList `sessionStorage` 트릭 제거 + `useLogList` 소비 §3.3.2 코드 실현 트리거 — REQ-007 drift 회수; 머지 후 §3.3.2 체크박스 `[x]` | 3.3.2 |
| 2026-04-20 | (pending, REQ-20260420-002) | Monitor.test.jsx unhandled error (자식 Monitor* MSW 미mock + 언마운트 후 setState) — Vitest v4 에서 "Unhandled errors" 로 승격, CI exit 1 회귀 가드 (WIP) | 3.6, 3.7 |
| 2026-04-19 | (pending, REQ-20260419-036) | `src/Log/LogList.test.jsx` 신설 트리거 — seeMoreButton 파생 4 분기 + 클릭·페이지네이션 회귀 보호 최소 5 케이스 (자매 REQ-037 수동 smoke 와 쌍). §4.3.1 renderWithQuery 패턴 적용 | 4.3.1 |
| 2026-04-19 | (pending, REQ-20260419-035) | `src/Log/Writer.test.jsx` historyData (location.state.from) 편집 진입 경로 테스트 커버리지 2 케이스 추가 — WH-01 history 패널 렌더 / WH-02 미렌더. §3.3.1 commitment 갱신은 없음 | 3.3.1 |
| 2026-04-20 | (inspector drift reconcile) | §3 헤더 rename: "(To-Be, WIP)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3 |
| 2026-04-20 | (inspector, REQ-20260420-009) | §3.7.3 Priority 2 `LogSingle.test.jsx` 행에 carve REQ-20260420-009 박제 — 2026-04-20 flake 재현 evidence 기반 독립 원자 carve (3 패턴 로컬 해소 + 3회 연속 CI PASS 검증). Priority 2 `[x]` flip 은 carve task 머지 후 별 라운드 | 3.7 |
| 2026-04-20 | (pending, REQ-20260420-017) | §3.8 신설 — `vi.useFakeTimers()` 크로스파일 누수 방지. LogSingle flaky timeout 3회 재현 수렴: Phase A per-case `useRealTimers` + 취약 케이스 15s 타임아웃, Phase B `setupTests.js` 전역 `afterEach(() => vi.useRealTimers())`, Phase C `singleFork: true` 원인 확정 실험. REQ-009 (MSW/NODE_ENV/console spy) 와 범위 분리 (WIP) | 3.8 |

## 8. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260417-adopt-tanstack-query.md`
- 관련 요구사항: `specs/requirements/done/2026/04/18/20260418-log-test-flaky-listitem-msw-isolation.md` (REQ-027, 테스트 격리 표준화)
- 관련 spec: `specs/spec/green/build/react-version-spec.md`
- 관련 spec: `specs/spec/green/types/typescript-spec.md`
- 관련 spec: `specs/spec/green/common/error-boundary-spec.md` (쿼리 에러는 ErrorBoundary 가 흡수 가능)
- 관련 spec: `specs/spec/green/common/env-spec.md` §5.2 (`vi.stubEnv` 패턴 단일 출처)
- 관련 spec: `specs/spec/green/ci/github-actions-ci-spec.md` (weekly flaky 감시 잡 검토)
