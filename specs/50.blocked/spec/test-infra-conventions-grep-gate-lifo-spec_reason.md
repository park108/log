# blocked reason — test-infra-conventions-grep-gate-lifo-spec

- **격리 경로**: `specs/30.spec/green/foundation/test-infra-conventions-grep-gate-lifo-spec.md` → `specs/50.blocked/spec/test-infra-conventions-grep-gate-lifo-spec.md`
- **격리 시각**: 2026-04-21 (planner cycle, session+7)
- **hash**: `54f35c1425ae04a122de9356f075a8d7ce4cae667a5c18ac54b39b467aa78ed5` (불변 3 cycle)
- **stale**: 3 (≥3cycle, RULE-01 planner 절차 5 "2회 이상 정체 → blocked/spec" 충족)

## 사유
- green 스펙 hash 가 3 cycle 연속 불변 (ledger: stale 1 → 2 → 3).
- 대응 task **TSK-20260421-46-test-infra-conventions-grep-gate-lifo** 는 `40.task/ready/` 에 발행 완료 (2 cycle 전 carve) 하였으나 developer 미소진 → spec DoD 의 수용 기준 `- [ ]`=15 건이 unchecked 잔존, `## 변경 이력` 에 TSK 박제 없음.
- planner 관점에서 이번 cycle 에 취할 수 있는 액션 없음:
  - carve: TSK-46 이 이미 발행됨 → RULE-01 멱등 재carve 금지.
  - 승격: 4조건 미충족 (unchecked `[ ]`=15).
- 정체 사유 자체는 downstream (developer queue) 에 있으나 planner 절차 5 문면상 blocked 이동 의무 발생.

## 해제 조건 (RULE-05 수동 개입)
다음 중 하나로 해소:
1. developer 가 TSK-20260421-46 을 완료하고 inspector 가 spec DoD flip (수용 기준 체크 + `## 변경 이력` 박제) 하여 green 재진입 → planner 다음 cycle 에서 승격.
2. spec 을 폐기하고 대응 task (TSK-46) 를 `50.blocked/task/` 로 이동.
- 복귀 방법: 원인 제거 후 `mv specs/50.blocked/spec/test-infra-conventions-grep-gate-lifo-spec.md specs/30.spec/green/foundation/`.
- 본 `_reason.md` 는 RULE-05 에 따라 복귀·후속 처리 완료 시 삭제.

## 관련 산출물
- `specs/40.task/ready/TSK-20260421-46-test-infra-conventions-grep-gate-lifo.md` (발행된 task, developer 대기)
- 연관 REQ: REQ-20260421-006 (TSK-42 수행 중 관측된 followup 2건 병합)
- 연관 완료 task: TSK-20260421-42 (커밋 `c18132d`)
