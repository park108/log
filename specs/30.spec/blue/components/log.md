# Log 컴포넌트 (로그 목록 / 단건 / 작성기 서브 라우트)

> **위치**: `src/Log/` (Log.jsx, LogList.jsx, LogSingle.jsx, LogItem.jsx, LogItemInfo.jsx, Writer.jsx, api.js, api.mock.js, hooks/**, Log.css, Writer.css)
> **관련 요구사항**: REQ-20260421-027, REQ-20260421-030, REQ-20260421-042
> **최종 업데이트**: 2026-04-21 (by inspector, Phase 1 reconcile 1/1 ack — TSK-20260421-88 @c563025 REQ-042 FR-01 수렴)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=c563025).

## 역할
`/log/*` 하위 서브 라우트 셸. `isAdmin()` 분기로 글 작성 진입 (`+` 버튼 → `/log/write`) 을 노출하고, 목록(`LogList`) · 단건(`LogSingle`) · 검색 결과(`Search`) · 작성기(`Writer`) 를 lazy 로드한다. `LogList` 는 1차 페치 + `seeMoreButton` 으로 커서 기반 페이지네이션 (DynamoDB `LastEvaluatedKey.timestamp`) 을 수행하며, `sessionStorage` 를 캐시로 사용한다. `LogSingle` 은 단건 + `Comment` 스레드. `Writer` 는 새 글·편집·삭제·이미지 삽입을 담당한다. 데이터 훅은 TanStack Query v5 기반 (`useLogList`, `useLog`, `useCreateLog`, `useUpdateLog`, `useDeleteLog`).

## 공개 인터페이스
- 진입 컴포넌트: `Log` (default export).
  - props: `{ contentHeight?: object }` (상위 `App` 이 전달한 `<main>` 인라인 스타일).
- 하위 라우트 (`src/Log/Log.jsx:24-29, 38-42`):
  - `/log/` → `LogList`
  - `/log/search` → `Search`
  - `/log/:timestamp` → `LogSingle`
  - `/log/write` → `Writer` (admin 전용; non-admin 은 라우트 자체를 노출하지 않음).
- 하위 컴포넌트 기본 export: `LogList`, `LogItem`, `LogItemInfo`, `LogSingle`, `Writer`.
- API 모듈 (`src/Log/api.js`): `getLogs`, `getNextLogs`, `getLog`, `postLog`, `putLog`, `deleteLog` (fetch 기반, `api.mock.js` 는 테스트용 stub).
- 훅 모듈 (`src/Log/hooks/`): `useLogList`, `useLog`, `useCreateLog`, `useUpdateLog`, `useDeleteLog` (TanStack Query `useQuery` / `useMutation` 래퍼).

## 동작
1. `Log` 마운트 시 `isAdmin()` 판정으로 작성 진입 버튼 노출 여부 결정.
2. `LogList`
   - 마운트 직후 `sessionStorage.logList` 가 있으면 그대로 렌더 (네트워크 회피).
   - 없으면 `getLogs()` → 성공 시 `logs`, `lastTimestamp` 세팅, 실패 시 에러 섹션 + Retry 버튼.
   - `See more` 클릭 시 `getNextLogs(lastTimestamp)` 로 이어붙임.
   - 로딩 중 `Toaster` 에 "Loading logs..." 노출 (`isShowToasterCenter` 1→2 라이프사이클).
   - `isPostSuccess` prop 변경 시 목록 리페치 트리거.
   - `logs` / `lastTimestamp` 변화 시 각각 `sessionStorage` 에 박제.
3. `LogSingle`
   - `useParams().timestamp` 로 `getLog` 호출, 본문 렌더 후 `Comment` 섹션 마운트.
4. `Writer`
   - admin 전용. 새 글 작성 · 기존 글 편집 · 삭제 · 이미지 삽입 (`ImageSelector`) 을 포함.

### 회귀 중점
- `App.test.jsx:329` 근처 online/offline 토글 동안 `Log` 가 마운트·언마운트되며 TanStack Query 캐시가 일관되게 정리되는지.
- `Log.test.jsx` production 모드 (isAdmin=false) 스위트: `+` 버튼 미노출, `/log/write` 라우트 미노출.
- `LogList` 의 sessionStorage 캐시 회피 경로: 캐시 존재 시 `getLogs` 미호출.
- **LogItem DELETE shuffle 안정성** (REQ-20260421-027 FR-01): LogItem DELETE 테스트는 `vitest --sequence.shuffle --sequence.seed={1,2,3}` 에서 race 없이 pass 한다. 테스트 간 상호 의존 (module-level cache, MSW handler 잔존 등) 이 없어야 하며, 어떤 seed 조합에서도 결정적 pass 를 보장.
- **LogSingle render budget 불변식** (REQ-20260421-030 FR-01): `LogSingle` prod render 는 **cold-start** 상태 (모듈/JIT warm-up 미선행, 파일 첫 테스트로 섞인 경우 포함) 에서도 정해진 render budget 안에 mount 및 첫 어설션을 완료한다. budget 상한은 `src/test-utils/timing.js` 의 `ASYNC_ASSERTION_TIMEOUT_MS` 를 polling 상한으로 사용하는 비동기 어설션의 수렴 시간으로 정의하며, 특정 러너 버전·커맨드 플래그·재현 횟수에 귀속되지 않는 **boolean 계약** (budget 초과 여부) 으로만 환원된다. dev render 도 동일 계약을 공유한다.
- **LogSingle render budget 실효 margin 불변식** (REQ-20260421-042 FR-01): `LogSingle` prod/dev render it-scoped timeout 은 vitest 기본 `testTimeout` 과 **양의 margin** (margin > 0) 을 가진다 — 즉 it-scoped 3rd-arg override 값은 vitest 기본 `testTimeout` 과 수학적으로 동등하지 않다. render-budget 상수 값이 vitest 기본 `testTimeout` 값과 동일하면 실효 margin = 0 → "render budget 초과 → 실패" 와 "기본 testTimeout 도달 → 실패" 가 판정 구분 불가 → 본 불변식 위반이다 (boolean 판정 근거 — FR-02). 본 margin 축 불변식은 REQ-20260421-030 의 **render budget 계약 존재** 축과 축 분리된 **실효 margin** 축이며, 전자는 계약 존재 자체를, 후자는 계약이 vitest 기본 경계와 구별되는 양의 간격을 갖는지를 박제한다 (FR-03). 본 불변식은 특정 러너 버전·현재 상수 숫자값·특정 incident/TSK 에 귀속되지 않는 **수학적 boolean 계약** ("override 값 ≠ vitest 기본값") 으로만 환원된다.

## 의존성
- 외부: `react`, `react-router-dom`, `prop-types`, `@tanstack/react-query`.
- 내부: `common/common` (`log`, `getFormattedDate`, `hasValue`, `setHtmlTitle`, `isAdmin`), `Toaster/Toaster`, `Comment/Comment` (via `LogSingle`), `Image/ImageSelector` (via `Writer`), `Search/Search` (lazy).
- 역의존: `App.jsx` 가 `/log/*` 라우트로 렌더.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 grep 게이트 계약 문서가 아니며 baseline 실측만 박제).
- **grep-baseline** (inspector 발행 시점, HEAD=29d9da0 실측):
  - (REQ-20260421-027 FR-04(a)) `grep -n "sequence.shuffle.*seed" specs/30.spec/green/components/log.md` → 1+ hit (본 spec §회귀 중점). 본 spec 자체 박제 확인.
- **rationale**: `LogItem DELETE` race 는 layer2 cold-start 계열 재진단 축 (REQ-20260421-012/017 동선) 에서 드러난 회귀 surface 이며, spec 불변식은 "seed 불문 결정적 pass" 라는 계약만 유지. 실측·재현 플랜은 task 계층 담당.

## 테스트 현황
- [x] `src/Log/Log.test.jsx`, `LogList` / `LogSingle` / `LogItem` / `LogItemInfo` / `Writer` 각 `.test.jsx`.
- [x] 훅 테스트: `hooks/useLog.test.js`, `useLogList.test.js`, `useCreateLog.test.js`, `useUpdateLog.test.js`, `useDeleteLog.test.js`.
- [x] `__fixtures__/` 에 API 응답 샘플 박제.
- [x] LogItem DELETE shuffle 안정성 — seed={1,2,3} 불문 결정적 pass (TSK-20260421-63 / `261a51a`; `src/Log/LogItem.test.jsx` `beforeAll` warm-up 박제, seed=1/2/3 + 임의 seed 전부 11/11 pass, 전체 383 tests PASS 회귀 0).
- [x] LogSingle render budget 불변식 — cold-start 에서 render/assert 가 budget 상한 이내 수렴 (TSK-20260421-65 / `585d381` 실현; `src/Log/LogSingle.test.jsx:125, :155` prod/dev `it` 종결에 `}, ASYNC_ASSERTION_TIMEOUT_MS);` 박제, 9/9 it pass / 47 files 383 tests pass / lint 0 / build 0).
- [x] (Must, REQ-20260421-042 FR-01) LogSingle render budget 실효 margin — render-budget 상수 값 이 vitest 기본 `testTimeout` 값과 양의 margin (margin > 0) 을 가진다. **HEAD=c563025 수렴**: `vite.config.js:75` `testTimeout: 10000` 명시 → `src/Log/LogSingle.test.jsx:129, :159` it-scoped 3rd-arg `ASYNC_ASSERTION_TIMEOUT_MS = 5000` → margin = 10000 − 5000 = **5000 ms > 0** (boolean 계약 충족, FR-02). 수단 α 채택 (TSK-20260421-88 / `c563025`; 1 파일 편집, LogSingle 9/9 it pass / 48 files 436 tests pass / coverage threshold 4축 PASS / lint 0 / build 0).

## 수용 기준 (현재 상태)
- [x] (Must) `/log/` 접근 시 `LogList` 렌더. 세션 캐시가 있으면 네트워크 호출 0.
- [x] (Must) 에러 분기에서 Retry 버튼 클릭 시 `sessionStorage.logList` · `logListLastTimestamp` 삭제 후 리페치.
- [x] (Must) `lastTimestamp` 존재 시 `See more` 버튼 노출. 비어 있으면 null.
- [x] (Must) `isAdmin()=true` 에서만 `+` 버튼과 `/log/write` 라우트 노출.
- [x] (Must) `/log/:timestamp` 진입 시 `LogSingle` + `Comment` 렌더.
- [x] (Should) 로딩 중 중앙 `Toaster` 메시지 "Loading logs..." 노출.
- [x] (Should) `props.isPostSuccess` true 변화 시 `LogList` 재페치 트리거.
- [x] (NFR) 모든 하위 라우트는 `React.lazy` + `Suspense(fallback=<div/>)` 로 코드 스플릿.
- [x] (Must, REQ-20260421-027 FR-01) LogItem DELETE 테스트는 `vitest --sequence.shuffle --sequence.seed={1,2,3}` 에서 race 없이 pass 한다.
- [x] (Must, REQ-20260421-030 FR-01) `LogSingle` prod/dev render 는 cold-start 에서도 render budget 상한 (`src/test-utils/timing.js` `ASYNC_ASSERTION_TIMEOUT_MS` 를 polling 상한으로 하는 어설션의 수렴 시간) 이내 mount 및 첫 어설션을 완료한다. (TSK-20260421-65 / `585d381` — prod/dev `it` 3rd-arg timeout 박제로 계약 강제.)
- [x] (Must, REQ-20260421-042 FR-01) `LogSingle` prod/dev render it-scoped timeout 은 vitest 기본 `testTimeout` 과 양의 margin (margin > 0) 을 가진다. render-budget 상수 값 = vitest 기본 `testTimeout` 값 구성은 본 불변식 위반이다 (FR-02 boolean 판정). (TSK-20260421-88 / `c563025` — 수단 α 채택: `vite.config.js:75 testTimeout: 10000` 명시, it-scoped 3rd-arg `ASYNC_ASSERTION_TIMEOUT_MS = 5000` 유지, margin = 5000 ms > 0. 수단 중립성 FR-06 유지 — α/β/γ 중 어느 하나도 "기본값" / "권장" 표시 배제.)

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec, blue) | all |
| 2026-04-21 | inspector / 29d9da0 | REQ-20260421-027 FR-01 흡수 — blue `components/log.md` → green carry-over. § 회귀 중점에 "LogItem DELETE 테스트는 `vitest --sequence.shuffle --sequence.seed={1,2,3}` 에서 race 없이 pass" 불변식 1줄 추가. consumed followup: `specs/10.followups/20260421-0541-test-isolation-shuffle-safety-cold-start-spec-from-blocked.md`. 선행 done req: `20260421-test-isolation-shuffle-safety-cold-start-spec-reseed-from-followup.md` (REQ-017), `20260421-layer2-cold-start-race-root-cause-rediagnosis.md` (REQ-012), `20260420-react-19-findby-timing-stabilization.md`. | §회귀 중점, §스코프 규칙, §테스트 현황, §수용 기준 |
| 2026-04-21 | inspector / 261a51a | Phase 1 reconcile — LogItem DELETE shuffle 안정성 marker [x] 플립 (TSK-20260421-63 / `261a51a` `beforeAll` warm-up, seed=1/2/3 + 임의 seed 전부 pass, 전체 383 tests PASS 회귀 0 박제). | §테스트 현황 |
| 2026-04-21 | inspector / REQ-20260421-030 | FR-01~04 흡수 — §회귀 중점에 "LogSingle render budget 불변식" 1~2줄 추가 (cold-start 에서도 render/assert 가 budget 이내 수렴하는 boolean 계약). §테스트 현황·§수용 기준에 대응 미완료 [ ] 1행 추가. budget 수치 박제 방식은 **FR-04 택일: `src/test-utils/timing.js` 상수 참조** — 근거: 리터럴 ms 박제는 spec 이 러너 default timeout 경계 값에 귀속되어 시점 중립성 약화. 상수 참조는 단일 진입점 유지 + 러너·버전 중립. consumed followup: `specs/60.done/2026/04/21/followups/20260421-0554-logsingle-vitest4-rescope-and-spec-relayering-from-blocked.md`. | §회귀 중점, §테스트 현황, §수용 기준, §참고 |
| 2026-04-21 | inspector / 585d381 | Phase 1 reconcile — LogSingle render budget marker [x] 플립 (TSK-20260421-65 / `585d381` `src/Log/LogSingle.test.jsx:125, :155` prod/dev `it` 종결에 `}, ASYNC_ASSERTION_TIMEOUT_MS);` 박제로 budget 상한을 테스트 계층 per-test timeout 으로 강제). DoD 게이트 재실행: `it('render LogSingle on (prod\|dev) server'` 2 hits 유지, `}, ASYNC_ASSERTION_TIMEOUT_MS);` 2 hits, `timeout:\s*[0-9]+` 0 hits (리터럴 ms 박제 0 — 시점 중립성 유지). 9/9 it pass / 47 files 383 tests pass / lint 0 / build 0. | §테스트 현황, §수용 기준 |
| 2026-04-21 | inspector / a2b9119 (REQ-20260421-042) | **REQ-042 흡수** — blue `components/log.md` → green 재 carry-over 후 §회귀 중점에 "LogSingle render budget 실효 margin 불변식" 1~2줄 추가 (render-budget 상수값 과 vitest 기본 `testTimeout` 간 양의 margin 계약, boolean 판정 근거 박제). §테스트 현황·§수용 기준에 대응 미완료 [ ] 각 1행 추가 (현 HEAD 위반 상태 표식). 판단 근거 (FR-03 축 분리): REQ-030 은 "render budget 계약 존재" 축 (budget 상한 정의·cold-start 에서 이내 수렴), 본 REQ-042 는 "render budget 실효 margin" 축 (override 값이 vitest 기본 testTimeout 과 수학적으로 구별되는지) — 전자는 계약 존재 자체, 후자는 계약의 실효성 전제 조건. 두 축은 독립적으로 검증 가능 (REQ-030 만 성립해도 REQ-042 는 위반 가능 — 현 HEAD 상태). consumed followup: `specs/10.followups/20260421-1312-logsingle-flaky-timeout-repro.md` (TSK-84 3차 독립 관측), `specs/10.followups/20260421-2140-logsingle-flaky-timeout.md` (TSK-82 1차 관측) — 이미 discovery 세션에서 `60.done/followups/` 로 이동됨 (REQ 원문 §참고 기준). **FR-06 수단 중립성 유지** — 상수값 상향 / 별도 render-budget 상수 도입 / warmup pre-dispatch 중 어느 하나도 "기본값" / "권장" 표시 0 (§수용 기준 FR-01 행 "수단 중립" 평서문). **RULE-07 자기검증**: 본 증분은 "render-budget override 값 ≠ vitest 기본 testTimeout 값" 이라는 수학적 boolean 계약. 구체 ms 수치 (5000, 10000 등) / Vitest 메이저 버전 / TSK ID / incident 이름 / `npm test` 실측 수치 0회 박제. 시점 중립·반복 검증 가능. NFR-02 준수 — `components/log.md` 1 파일만 수정. | §최종 업데이트, §회귀 중점, §테스트 현황, §수용 기준, §참고, 본 이력 |
| 2026-04-21 | inspector / c563025 (TSK-20260421-88) | **Phase 1 reconcile 1/1 ack** — REQ-20260421-042 FR-01 수렴 marker 플립 (§테스트 현황 1행 [ ]→[x], §수용 기준 FR-042 1행 [ ]→[x]). c563025 ancestor-of HEAD 확인. DoD 게이트 4종 재실행 @HEAD=c563025: (a) `grep -nE "export const ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → 1 hit @`:5` (불변) / (b) `grep -nE "testTimeout\s*:" vite.config.js` → 1 hit @`:75` `testTimeout: 10000` (수단 α 채택 기대값) / (c) `grep -nE "\}\s*,\s*ASYNC_ASSERTION_TIMEOUT_MS\s*\)" src/Log/LogSingle.test.jsx` → 2 hits @`:129, :159` (수단 α 기대값 — 상수 유지) / (d) boolean 판정 — 10000 ≠ 5000, margin = 5000 ms > 0. hook-ack (TSK-88 result.md §테스트 결과): `npm run lint` PASS / `npm test` 48 files 436 tests PASS (LogSingle.test.jsx 9/9 it pass) / coverage threshold 4축 PASS (Statements 97.72 / Branches 94.21 / Functions 94.45 / Lines 98.11) / `npm run build` PASS 352ms — Must 주관 혼재 없음 → ack 채택. 스코프 준수: TSK-88 result.md 명시 편집 범위 `vite.config.js` 1 파일 (`git show --stat c563025` 1 file changed 확인). FR-06 수단 중립성 유지 — spec 본문에 "α 채택"은 변경 이력 증거로만 박제하고 §불변식 / §수용 기준 본문은 수단 열거 평서문 유지. RULE-07 자기검증: 본 증분은 수렴 marker 플립 + 현장 근거 수치 박제 (§테스트 현황 margin 수치·수단명은 감사 교차참조 — baseline·이력 수치 재서술 허용 범주). NFR-02 준수 — `components/log.md` 1 파일만 수정 + ledger 갱신. | §최종 업데이트, §테스트 현황, §수용 기준, 본 이력 |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/04/21/req/20260421-log-spec-regression-logitem-delete-shuffle-and-findby-idiom.md` (REQ-027).
  - `specs/60.done/2026/04/21/req/20260421-log-cold-start-render-budget-invariant.md` (REQ-030).
  - `specs/60.done/2026/04/21/req/20260421-logsingle-prod-render-budget-margin-effectiveness.md` (REQ-042; 본 세션 inspector mv 대상).
- **Consumed followup**:
  - `specs/10.followups/20260421-0541-test-isolation-shuffle-safety-cold-start-spec-from-blocked.md` (REQ-027 선행; 이미 `60.done/followups/` 이동).
  - `specs/60.done/2026/04/21/followups/20260421-0554-logsingle-vitest4-rescope-and-spec-relayering-from-blocked.md` (REQ-030 선행 축 A/B 분리).
  - `specs/60.done/2026/04/21/followups/20260421-2140-logsingle-flaky-timeout.md` (REQ-042 선행 — TSK-82 1차 관측; discovery 세션에서 이미 이동됨).
  - `specs/60.done/2026/04/21/followups/20260421-1312-logsingle-flaky-timeout-repro.md` (REQ-042 선행 — TSK-84 3차 독립 관측; discovery 세션에서 이미 이동됨).
- **선행 done req (render budget 진단 계보)**:
  - `specs/60.done/2026/04/21/req/20260421-logsingle-prod-server-serial-timeout-diagnosis.md` (REQ-014 원인 진단 — cold module/JIT warm-up × 기본 async assertion timeout 경계).
  - `specs/60.done/2026/04/21/req/20260421-logsingle-prod-server-serial-timeout-remediation.md` (REQ-016 1차 remediation plan).
- **관련 spec**: `specs/30.spec/blue/common/test-idioms.md` (findBy 이디엄 축 — `ASYNC_ASSERTION_TIMEOUT_MS` polling 정합).
- **관련 상수**: `src/test-utils/timing.js` `ASYNC_ASSERTION_TIMEOUT_MS` — 본 spec 의 render budget 상한 참조 지점. 수치 자체는 spec 본문에 박제하지 않음 (시점 중립성 보존).
- **축 B 위임 노트 (REQ-20260421-030 §참고 위임)**: Vitest 러너 호환 시그니처 택일 (options-as-2nd 객체 vs 3rd-arg number 등 버전별 deprecated/removed 대응) · 적용 범위 (it 단위 budget override) · supersedes 관계 등 1회성 마이그레이션 계약은 본 spec 본문에 포함하지 않는다. 해당 계약은 planner 가 후속 task 문서 (`40.task/**`) 에 박제한다. 본 spec 은 "render budget 계약" 만 유지 (RULE-07 양성 기준).
- **RULE 준수**:
  - RULE-07: 불변식 한정 — "race 없이 pass" / "budget 이내 수렴" 은 boolean 계약. 실측 seed·ms 수치·Vitest 버전·TSK ID 는 task 영역으로 위임.
  - RULE-01: inspector writer 영역만 (`30.spec/green/**`).
  - RULE-06: grep-baseline 수치 박제 (REQ-027 FR-04(a) 경로 유지).
