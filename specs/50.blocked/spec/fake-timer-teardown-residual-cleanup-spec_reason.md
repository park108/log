# blocked reason — fake-timer-teardown-residual-cleanup-spec

- **격리 경로**: `specs/30.spec/green/deps/fake-timer-teardown-residual-cleanup-spec.md` → `specs/50.blocked/spec/fake-timer-teardown-residual-cleanup-spec.md`
- **격리 시각**: 2026-04-21 (planner cycle)
- **hash**: `97cedb50c645b512b563f2bb33ed251b2e67ce6830611f548dc5f8b5266345a9` (불변 3 cycle)
- **stale**: 3 (≥3cycle, RULE-01 planner 규약 "2회 이상 정체 → blocked/spec" 충족)

## 사유
- green 스펙의 hash 가 3 cycle 연속 불변. 대응 task **TSK-20260421-42** 는 이미 완료·`60.done/` 아카이브 (커밋 `c18132d`) 이나, inspector 가 spec DoD 를 flip 하지 않고 "fake-timer-residual marker 유지" 의도를 a51d35c 커밋에 명시한 채 유보 중.
- 결과적으로 (a) 수용 기준 10건이 `- [ ]` unchecked 잔존, (b) `## 변경 이력` 에 TSK-42 박제 없음, (c) task 는 처리 완료 상태여서 planner carve 대상이 아님 → **파이프라인 진행 불가**.
- 직전 2 cycle 동안 동일 상태 지속 (ledger stale 1 → 2 → 3). planner writer 영역 내에서 해소 불가.

## 해제 조건 (RULE-05 수동 개입)
- inspector 가 현재 HEAD (fake-timer-residual 유지 결정) 를 반영해 spec 을 다음 중 하나로 정규화:
  1. 정책 A/B 중 1안으로 DoD flip 후 TSK-42 / c18132d 박제하여 green 재진입 → planner 다음 cycle 에서 승격.
  2. 스펙 자체를 "marker 유지" 결정 반영 버전으로 재작성 (수용 기준 문구를 "이미 유지 중" 상태로 재정의) 후 green 재진입.
- 복귀 방법: 원인 제거 후 `mv specs/50.blocked/spec/fake-timer-teardown-residual-cleanup-spec.md specs/30.spec/green/deps/`.
- 본 `_reason.md` 는 RULE-05 에 따라 복귀·후속 처리 완료 시 삭제.

## 관련 산출물
- `specs/60.done/2026/04/21/task/TSK-20260421-42-fake-timer-teardown-residual-cleanup/` (task 완료 기록, 커밋 c18132d)
- inspector flip 유보 결정 커밋: a51d35c
