# RULE-03 주기 실행 & 백프레셔 (Schedule & Backpressure)

> 적용 범위: 모든 에이전트

## 1. 권장 주기 (참고치)

| 에이전트 | 주기 | 이유 |
|---------|------|------|
| developer | ~15분 | 큐가 들어오면 즉시 소비 |
| planner | ~1시간 | green 이 쌓여야 의미 있는 diff |
| inspector | ~1시간 | ready 요구사항이 쌓인 뒤 |
| discovery | ~1~2회/일 | 과대 생성 방지 |

에이전트는 자기 주기를 알지 못한다. 트리거는 외부(cron/스케줄러/수동).

## 2. 하류 포화 시 상류 보류 (Backpressure)

각 에이전트는 **실행 시작 시 하류 큐 크기 확인**, 임계치 초과면 no-op 종료:

| 에이전트 | 하류 큐 | 임계치 (기본) | 초과 시 |
|---------|---------|--------------|---------|
| discovery | `requirements/ready/*.md` | `REQUIREMENTS_READY_MAX=15` | 새 탐색 보류 (followup 소비는 계속) |
| inspector | `spec/green/**/*.md` (미승격) | `GREEN_PENDING_MAX=20` | 신규 반영 보류 |
| planner | `task/ready/*.md` | `TASK_READY_MAX=10` | 태스크 생성 보류 |
| developer | — | — | (없음) |

임계치 override: `.claude/pipeline.json` (자세한 건 `RULE-05` §4).

## 3. Pause Lock

- 전체 정지: `.claude/locks/pipeline.pause` 존재 시 모든 에이전트 no-op.
- 에이전트별: `.claude/locks/<agent>.pause`.
- 실행 시작 시 **가장 먼저** 확인.

## 4. 선결 점검 순서 (Precheck)

모든 에이전트가 따르는 템플릿:

1. Pause lock 확인 → 있으면 즉시 no-op 종료.
2. 입력 큐 비었는지 확인 → 비었으면 no-op 종료.
3. 하류 임계치 확인 → 초과면 no-op 종료 (discovery 는 followup 소비 계속).
4. 처리 진행.
