# RULE-03 주기 & 백프레셔

## 주기 & 임계치 (외부 트리거)

| agent | 주기 | 하류 임계치 (기본) |
|---|---|---|
| discovery | 1h | `REQUIREMENTS_READY_MAX=15` (`20.req/`) |
| inspector | 30m | `GREEN_PENDING_MAX=20` (미승격 `30.spec/green/**`) |
| planner | 30m | `TASK_READY_MAX=10` (`40.task/`) |
| developer | 15m | — |

override: `.claude/pipeline.json` (RULE-05).

## 선결 점검 (순서 고정)
1. `.claude/locks/pipeline.pause` 또는 `.claude/locks/<agent>.pause` → 즉시 no-op.
2. 입력 큐 비면 → no-op.
3. 하류 임계치 초과 → no-op (discovery 는 followups 소비 계속).
4. 처리.

## inspector Phase 1 예외
`drift reconcile` 은 (2)(3) 무관 항상 수행 (green 감소 방향). pause lock (1) 만 차단. `RULE-04` notes `reconcile: N/M ack` 토큰 매 세션 필수 (ack 0·빈 큐여도).