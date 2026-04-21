# Blocked reason: test-isolation-shuffle-safety-cold-start-spec

> **격리 일시**: 2026-04-21 (UTC, planner 10th cycle)
> **에이전트**: planner
> **원본 경로**: `specs/30.spec/green/common/test-isolation-shuffle-safety-cold-start-spec.md`
> **hash**: `bea5206339c77c7dbebb414531177e06dc17da7f32174cb8485ba3663f5b0730` (8th cycle 등록 이래 불변)

## 원인

RULE-01 planner 규약 "`.planner-seen` 기준 같은 diff-hash 2회 이상 정체 → `50.blocked/spec/` + `_reason.md`" 를 **3회 연속 불변** 상태에서 발동. 9th cycle 에서 한 차례 유예를 부여했으나 10th cycle 에서도 hash 불변 → 기준 충족.

- **8th cycle 진입 당시**: stale=1 (hash 최초 등록 후 1회 경과).
- **9th cycle**: stale=2. 유예 근거 — TSK-20260421-57 (layer2-cold-start-race-root-cause-rediagnosis) 가 ready 큐 active 상태. "TSK-57 소비 후 inspector 가 FR-13 fallback 재작성 marker-sync 수행" 기대 경로 제시.
- **10th cycle (본 사이클)**: stale=3. TSK-20260421-57 소비·완료 (60.done 아카이브). 그러나 green spec hash 불변 = inspector 후속 marker-sync 미수행. 유예 근거가 이행되지 않음.

## 진행을 막는 의존 관계

1. `specs/60.done/2026/04/21/task/20260421-layer2-cold-start-root-cause-rediagnosis/result.md` 에 §FR-13 fallback 재평가 결과 박제됨 — 1차 추천안이 `B1 (empty render prime)` 에서 **`B1' (LogItem+Provider+Toaster 통합 warm-up)`** 로 교체되어야 하며, §대안 에 `B6 (mutate-options 제거 + options-level onError 주입)` 신설 필요.
2. `specs/10.followups/20260421-1230-layer2-rediag-spec-marker-sync.md` 에 inspector 수행 지침 박제되어 있으나 discovery → inspector 경로가 아직 소비하지 않음.
3. inspector writer 영역 (`30.spec/green/**`) 수정이 필수 — planner/developer 는 RULE-01 writer 매트릭스상 해당 파일을 수정할 수 없음.

## 해제 절차 (RULE-05 수동 개입 가이드)

**옵션 A — inspector 마커 싱크 트리거 후 원복 (권장)**:
1. discovery 또는 inspector 세션을 수동 트리거해 followup `20260421-1230-layer2-rediag-spec-marker-sync.md` 를 소비하게 한다.
2. inspector 가 followup §제안 §2 지침을 수행:
   - §FR-13 L38 1차 추천안 `B1` → `B1'` 교체.
   - §FR-11 L33 B1 항목에 TSK-20260421-52/57 반증 주석 append.
   - §FR-11 L35 B3 항목에 TSK-20260421-53 1·2차 반증 주석 append.
   - §대안 섹션에 `Layer 2 B6` 항목 신설.
   - §테스트 현황 L99~L102 `[pending: TSK-20260421-53]` 마커를 TSK-20260421-57 참조로 전환.
   - §변경 이력 에 TSK-20260421-57 entry append.
3. spec hash 변경 확인 후 `mv specs/50.blocked/spec/test-isolation-shuffle-safety-cold-start-spec.md specs/30.spec/green/common/` 로 원복.
4. 본 `_reason.md` 파일 삭제 (RULE-05 §4 — 후속 처리 후 _reason.md 잔존 금지).
5. 다음 planner 사이클에서 .planner-seen stale=0 재설정 (hash 변경 감지).

**옵션 B — 즉시 진전 (운영자가 inspector 역할 수동 수행)**:
1. 운영자가 직접 `test-isolation-shuffle-safety-cold-start-spec.md` 를 편집해 §FR-13 재작성 + §대안 B6 추가.
2. 동일하게 green 으로 원복 + _reason.md 삭제.

## 파이프라인 영향

- **downstream**: `test-isolation-shuffle-safety-cold-start-spec.md` 의 B1'/B2/B4/B5/B6 fallback 이 spec 에 박제되어야 planner 가 해소 patch task 를 carve 할 수 있음 (RULE-01 planner 입력 = `30.spec/green|blue/**`).
- **upstream**: TSK-20260421-57 result.md 는 이미 B1' 권고를 박제. followup 경로만 풀리면 24h 내 자연 회복 가능.
- **관련 green specs**:
  - `specs/30.spec/green/common/layer2-cold-start-race-root-cause-rediagnosis-spec.md` — 동일 followup 의 §제안 §1 대상. 본 격리와 연동 (inspector 마커 싱크 시점에 같이 업데이트 예상).
  - `specs/30.spec/green/common/msw-test-sibling-it-shuffle-race-dedicated-spec.md` — NFR-04 pending 은 TSK-57 소비로 해소 가능, 차기 inspector 마커 싱크 대상.
  - `specs/30.spec/green/common/logsingle-prod-server-serial-timeout-diagnosis-spec.md` — TSK-58 ready 큐 대기. 본 격리와 무관.

## 감사 근거

- 9th cycle ledger 유예 결정: `specs/30.spec/green/.planner-seen` L42~L45 (9th cycle 블록 참조).
- TSK-20260421-57 완료 결과: `specs/60.done/2026/04/21/task/20260421-layer2-cold-start-root-cause-rediagnosis/result.md`.
- 이행 지침 followup: `specs/10.followups/20260421-1230-layer2-rediag-spec-marker-sync.md`.
- inspector 최근 세션 c4bd6ac: `.inspector-seen` 만 수정, green 스펙 미수정 (0/13 ack no-op).
