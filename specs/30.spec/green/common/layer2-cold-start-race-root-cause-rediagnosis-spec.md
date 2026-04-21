# Layer 2 cold-start mutation race — B1/B3 반증 후 root cause 재진단

> **위치**: `src/Log/LogItem.test.jsx:266` (`findByText("Deleting log network error.")` 5062ms timeout 재현 지점) / 관측 대상 파일 `src/Log/LogItem.jsx`, `src/Log/hooks/useDeleteLog.js`, `src/Toaster/**`, `src/test-utils/msw.js`
> **관련 요구사항**: REQ-20260421-012 (layer2-cold-start-race-root-cause-rediagnosis; 동일 ID 사용 req `ci-node20-deprecation-remediation` 와 id 충돌 — 원본 req 파일명으로 식별)
> **최종 업데이트**: 2026-04-21 (by inspector, Phase 3 신규 등록)
> **관련 spec (carve-out 원본)**: `specs/30.spec/green/common/test-isolation-shuffle-safety-cold-start-spec.md` §FR-11~FR-13

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=e1a9bef).

## 역할
`src/Log/LogItem.test.jsx:266` 의 `findByText("Deleting log network error.")` 5062ms timeout 이 B1 (warm-up empty render prime, TSK-20260421-52) 과 B3 (`server.listen` beforeAll 승격, TSK-20260421-53 1차·2차) 두 후보를 모두 반증한 상태에서, 관측·계측 주도로 root cause 를 재탐색하고 원본 `test-isolation-shuffle-safety-cold-start-spec.md` §FR-13 fallback 순서 (B2/B4/B5 중 유력 후보) 를 근거 기반으로 재확정한다. 본 spec 은 **re-diagnosis 결과 박제** 와 **spec 수정 지침 확정** 만 수행 — 실제 해소(patch) 는 별건 task 로 carve. runtime functional 변경 금지 (계측용 `console.log`/`performance.mark` 는 재진단 중 임시 허용, 최종 diff 에서 전량 제거).

## 공개 인터페이스
관측 대상 타임라인 4 시점 (seed=1 단독 실행):
1. `Toaster` mount 시점 (DOM 에 `<div class="_div--toaster-hide">` 부착 시각).
2. `useDeleteLog` mutation `onError` 진입 시점 (`mutationFn fetch reject` 후 callback).
3. `setToasterMessage("Deleting log network error.")` 상태 전이 시점.
4. `"Deleting log network error."` DOM 노드 삽입 시점 (`Toaster` `data-show="1"` 전이).

재진단 후보 (REQ 배경 §4):
- (a) Toaster mount latency (`_div--toaster-hide` 잔존 근거).
- (b) `findByText` polling interval (@testing-library/dom 기본 50ms) vs mutation flush 지연.
- (c) `fetch` micro-task scheduling (`onError` → `setToasterMessage` 경로 큐).
- (d) React 19 concurrent scheduler first-in-file commit 행동.
- (e) QueryClient mutation pipeline `onError` 호출 지연.

## 동작
1. (FR-01) `LogItem DELETE network-error` case 의 seed=1 단독 실행에 관측 훅 (`performance.mark` 또는 `console.log` + timestamp) 을 부착해 4 시점 타임라인을 측정. 결과를 spec §관측 섹션 (본 spec 후속 업데이트 시 추가) 또는 req/result.md 에 박제.
2. (FR-02) 관측 결과로 후보 (a)~(e) 차감 분석 — 1~2개 root cause 지목 + 배제된 후보별 배제 근거 1문장.
3. (FR-03) `test-isolation-shuffle-safety-cold-start-spec.md` §FR-13 fallback 순서 재평가:
   - 현 확정: B1 (1차, 반증) → B3 (2차, 반증) → B2 (3차) → B4 (4차) → B5 (5차 조건부).
   - 재평가 산출: B2/B4/B5 중 1차 재추천 후보 지목 + 근거 박제, 또는 신규 B6 제안.
4. (FR-04) 계측용 코드 (`console.log`, `performance.mark`, debug helper) 는 재진단 후 전량 제거. 최종 diff 에 runtime 소스 functional 수정 0.
5. (FR-05, Should) 후속 task 발행 시 본 req 를 `supersedes:` 또는 `related:` 메타로 참조. `test-isolation-shuffle-safety-cold-start-spec.md` §테스트 현황 L99 의 `[pending: TSK-20260421-53 실측]` 마커는 본 spec 진행 완료 시 inspector marker-sync 에서 신규 TSK-ID 로 재전환.
6. (FR-06, Could) 재진단 중 TSK-20260421-53 구현 (`server.listen` beforeAll) 의 부작용 (FR-06 sibling-it race 와 상호작용) 이 관찰되면 별건 followup 으로 분리.

### 대안
- **현 상태 유지 (B1/B3 재시도)**: 기각 — 반증 2회로 근거 고갈, 동일 시도 3차는 비용 대비 수익 0.
- **`describe.sequential` / `describe.configure({shuffle:false})` 즉시 채택 (B2/B4 skip 진단)**: 기각 — shuffle 격리 의도 상충 위험이 남고, root cause 미식별 상태에서 숨은 의존 은폐.
- **runtime microtask (B5) 즉시 확장**: 기각 — "runtime 소스 변경 금지" 기존 rationale 충돌, B2/B4 미시도 상태.
- **관측·계측 주도 재진단 (채택)**: 수정 파일 ≤ 2 (테스트 파일 또는 spec), runtime 소스 수정 0, 근거 기반 fallback 재확정 — 본 spec 의 동작 1~6 과 일치.

## 의존성
- 내부:
  - `src/Log/LogItem.test.jsx:266` — 관측 대상 재현 지점.
  - `src/Log/LogItem.jsx` — Toaster mount 경로 (관측 대상, functional 수정 0).
  - `src/Log/hooks/useDeleteLog.js:22-38` — mutation pipeline (관측 대상, functional 수정 0).
  - `src/Toaster/**` — Toaster 컴포넌트 (관측 대상, functional 수정 0).
  - `src/test-utils/msw.js` — `useMockServer` (현 baseline: `beforeEach(server.listen)` + `afterEach(server.close)`, B3 이전 상태).
  - `src/test-utils/msw.test.js` — TSK-20260421-55 lifecycle-mode-agnostic 재작성 완료 (e1a9bef).
- 외부: `vitest` (`performance.mark` / `console.log` 관측), `@testing-library/react` (`findByText`, polling).
- 역의존:
  - `specs/30.spec/green/common/test-isolation-shuffle-safety-cold-start-spec.md` §FR-11~FR-13 — 본 spec 의 재진단 결과가 원본 spec 의 fallback 순서 재확정 근거가 됨.
  - REQ-20260421-010 (Layer 2 서사 확장) — 선행 req.
  - REQ-20260421-007 (Layer 1) — Layer 1 는 해결 완료 (TSK-20260421-51 / d798635).
  - 후속 task: 본 spec 완료 후 planner 가 재추천 후보 기반 신규 TSK-ID 로 carve.
- historical artefact: TSK-20260421-49 (blocked), TSK-20260421-52 (B1 blocked), TSK-20260421-53 (B3 blocked 1차·2차).

## 테스트 현황
- [x] B1 (TSK-20260421-52) 반증 박제 — seed=1 FAIL 재현, followup `20260420-2224-logitem-delete-mutation-cold-start-layer2.md` 참조.
- [x] B3 1차 (TSK-20260421-53) 반증 박제 — followup `20260421-0125-tsk-53-msw-listen-beforeall-promotion-from-blocked.md`.
- [x] B3 2차 (TSK-20260421-53 재발행) 반증 박제 — followup `20260421-0201-tsk-53-msw-listen-beforeall-layer2-b3-from-blocked.md`.
- [x] FR-01 4 시점 타임라인 수치 박제. (TSK-20260421-57 / result.md §4시점 타임라인 — seed=1 3회 + seed=2 참조)
- [x] FR-02 root cause 1~2개 지목 + 배제 근거 박제. (TSK-20260421-57 / result.md §Root cause 판정 — 주 (d) React 19 × mutate-options observer 의존성, 부 (a), 배제 (b)(c)(e))
- [x] FR-03 §FR-13 fallback 재평가 결과 박제 (재추천 후보 또는 신규 B6). (TSK-20260421-57 / result.md §FR-13 fallback 재평가 — B1'→B2→B4→B5→B6)
- [x] FR-04 계측 제거 후 최종 diff runtime functional 수정 0 확인. (TSK-20260421-57; HEAD=afce2b9 재검증: `grep -rn "performance.mark" src/Log src/Toaster src/test-utils/msw.js` → 0 hits, `git diff c4bd6ac..HEAD -- src` → 0 bytes, `grep -rn "await Promise\\.resolve" src/Log/hooks/useDeleteLog.js` → 0 hits)
- [x] FR-05 후속 task 의 `supersedes:` 메타 + 원본 spec marker-sync 지침 반영. (TSK-20260421-57 / result.md §관련 `supersedes: TSK-49/52/53` + §후속 1~3 + followup `specs/10.followups/20260421-1230-layer2-rediag-spec-marker-sync.md`)
- [x] NFR-02 `npm test -- --run` 및 shuffle 3-seed baseline 대비 회귀 0. (TSK-20260421-57 / result.md §테스트 결과 — 47 files / 375 tests pass, shuffle seed=1 FAIL 은 baseline 동일 재현 전용, seed=2/3 11 pass)

## 수용 기준
- [x] (Must) FR-01 — seed=1 단독 실행에서 4 시점 (Toaster mount / mutation onError / setToasterMessage / DOM 삽입) 타임라인이 수치로 spec §관측 또는 result.md 에 박제됨. (TSK-20260421-57 / result.md §4시점 타임라인)
- [x] (Must) FR-02 — 후보 (a)~(e) 차감 분석 결과 1~2 root cause 지목 + 배제 근거 각 1문장 박제. (TSK-20260421-57 / result.md §Root cause 판정)
- [x] (Must) FR-03 — 원본 `test-isolation-shuffle-safety-cold-start-spec.md` §FR-13 fallback 순서 재평가 결과 (재추천 후보 / 신규 B6) 박제. (TSK-20260421-57 / result.md §FR-13 fallback 재평가 — B1'→B2→B4→B5→B6; 원본 spec 반영은 `50.blocked/spec/` 격리 상태, 해제는 RULE-05 경로)
- [x] (Must) FR-04 — 최종 diff 에 계측 코드 0건 (`console.log` 임시 추가분 전량 제거), runtime 소스 functional 수정 0. (TSK-20260421-57; HEAD=afce2b9 grep 재검증 PASS)
- [x] (Should) FR-05 — 후속 task 에 `supersedes: REQ-20260421-012` 또는 `related:` 메타 기록. 원본 spec marker-sync 는 inspector 재carve 시점 수행. (TSK-20260421-57 / result.md §관련 + followup `20260421-1230-...`)
- [x] (Could) FR-06 — TSK-53 부작용 (sibling-it race 상호작용) 관찰 시 별건 followup 분리. (TSK-20260421-57 / result.md §후속 5 "본 재진단 중 관찰되지 않음, 별건 followup 불필요" 확정)
- [x] (NFR-01) 재진단 관측 결과가 수치로 박제되어 후속 개발자가 재현 조건 없이 판정 근거 확인 가능. (TSK-20260421-57 / result.md §4시점 타임라인 + §계측 구성 — `performance.mark` 9종 재현 가능)
- [x] (NFR-02) `npm test -- --run` 및 `vitest run --sequence.shuffle --sequence.seed={1,2,3}` baseline (TSK-55 머지 상태 = e1a9bef) 대비 회귀 0. (TSK-20260421-57)
- [x] (NFR-03) 최종 변경 파일 ≤ 2 (테스트 파일 또는 spec). runtime 소스 수정 0. (TSK-20260421-57 / result.md §변경 파일 — runtime/test diff 0, result.md + followup 2 파일은 writer 영역 분리)
- [x] (NFR-04) 본 spec 채택 계측은 모두 commit 단위 revert 가능. 계측 전용 utility 추가 시 재진단 완료 후 제거. (TSK-20260421-57; HEAD 에 계측 잔존 0)

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=e1a9bef):
  - `grep -n "findByText.*Deleting log network error" src/Log/LogItem.test.jsx` → 1 hit (재현 지점 `:266` 부근).
  - `grep -n "server.listen" src/test-utils/msw.js` → 현재 `beforeEach` 내 (B3 반증 2차 롤백 후 상태 재확인 필요).
  - `grep -rn "performance.mark\|console.log" src/Log src/Toaster src/test-utils/msw.js` → baseline 스냅샷. 계측 도입 후 증가, 최종 제거 후 baseline 로 복귀 확인.
  - `grep -rn "await Promise.resolve" src/Log/hooks/useDeleteLog.js` → 0 hits (B5 미채택 확인용).
- **rationale**: 본 spec 은 **재진단·관측 결과 박제** 만 수행. runtime 소스 (`src/Log/**/*.jsx`, `src/Log/hooks/**/*.js`, `src/Toaster/**`) functional 수정 금지. 계측 (`console.log`, `performance.mark`) 은 진행 중 임시 허용, 최종 diff 에서 전량 제거. `vite.config.js` `sequence.shuffle` 기본값 변경 금지. 다른 파일 race (File.test.jsx FR-07, msw.test.js FR-06) 재평가는 범위 외. 해소 patch 는 별건 task carve — 본 spec 에서 수정 확장 금지.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-012 layer2-cold-start-race-root-cause-rediagnosis 반영). B1/B3 반증 2회 후 root cause 관측·계측 주도 재탐색, 원본 `test-isolation-shuffle-safety-cold-start-spec.md` §FR-13 fallback (B2/B4/B5) 근거 기반 재확정. runtime functional 수정 0 강제, 해소 patch 는 별건 task carve. | all |
| 2026-04-21 | TSK-20260421-57 / — (no src commit; diagnosis-only task, result.md + followup 박제) | **drift reconcile 16/16 ack** — Must FR-01~04 + Should FR-05 + Could FR-06 + NFR-01~04 전원 PASS. Root cause 확정: **React 19 concurrent scheduler first-in-file commit × TanStack Query v5 mutate-options side-channel observer 의존성** (주 (d)) + Toaster effect chain first-in-file 지연 (부 (a)). 배제: (b) polling / (c) fetch microtask / (e) pipeline onError delay. FR-13 재확정 fallback 순서: **B1' → B2 → B4 → B5 → B6 (신규)**. 계측 전량 제거 (`performance.mark` grep HEAD=afce2b9 0 hits), runtime/test functional diff 0. hook-ack: `npm run lint` 0 warn/error, `npm test -- --run` 47/375 pass, `npm run build` OK, shuffle seed=1 baseline 동일 재현(1 fail) / seed=2·3 11 pass. 원본 spec `test-isolation-shuffle-safety-cold-start-spec.md` marker-sync 는 해당 spec 이 `50.blocked/spec/` 에 격리된 상태 (afce2b9) — RULE-05 해제 경로로 위임, 본 spec 관할 밖. | 테스트 현황, 수용 기준, 변경 이력 |
