# RULE-03 주기 & 백프레셔 & 정체 감지

## 주기 & 임계치 (외부 트리거)

| agent | 주기 | 하류 임계치 (기본) |
|---|---|---|
| discovery | 1h | `REQUIREMENTS_READY_MAX=15` (`20.req/`) |
| inspector | 30m | `GREEN_PENDING_MAX=20` (미승격 `30.spec/green/**`) |
| planner | 30m | `TASK_READY_MAX=10` (`40.task/`) |
| developer | 15m | — |

override: `.claude/pipeline.json` (RULE-05).

## 선결 점검 (순서 고정)
0. `.claude/locks/stall-<agent>` 존재 → **즉시 hard no-op**. 운영자가 삭제하기 전에는 어떤 처리도 하지 않는다 (§정체 감지).
1. `.claude/locks/pipeline.pause` 또는 `.claude/locks/<agent>.pause` → 즉시 no-op.
2. 입력 큐 비면 → no-op.
3. 하류 임계치 초과 → no-op (discovery 는 followups 소비 계속).
4. 처리.

## inspector Phase 1·2 예외
`drift reconcile` (Phase 1) 과 deferred 태깅·마커 재배치 (Phase 2) 는 (2)(3) 무관 항상 수행 — green 감소 방향이기 때문이다. pause/stall lock (0)(1) 만 차단.

**sub-spec 분할은 이 면제에서 명시 제외** — 분할은 green 증가 방향이라 면제 취지와 역행한다. 분할은 (3) 통과 시에만.

Phase 1 은 `git diff <직전 seen 기록 HEAD>..HEAD -- src/ <게이트 경로>` 가 비면 게이트 재실행을 생략하고 `reconcile: skipped (no delta)` 토큰을 박제한다 (동일 입력 재측정 반복 방지).

`RULE-04` notes `reconcile: N/M ack` 토큰은 매 세션 필수 (ack 0·빈 큐여도).

---

## 정체 감지 (2026-08-24 신설)

> **배경**: 이 절이 없던 기간에 planner 는 369 tick, inspector 는 212 tick 을 돌며 실질 진행 0 을 유지했다. 정체는 정확히 **감지되고 있었다** (`전수 stale` 235회 기록, diff-hash 정체 20/20 정확 산정). 실패한 것은 **집행**이다 — 유일한 탈출 밸브가 에이전트 재량이었고, planner 는 규약에 없는 "운영자 정합 유지 정책"을 발명해 213회 집행을 거부했다. 따라서 아래는 전부 **의무**이며 재량 여지를 두지 않는다.

### 실질 진행의 정의
**큐 경계 `mv` ≥ 1건.** `RULE-04` 보고 블록의 `moved` 가 비어있지 않은 tick 만 진행으로 계수한다. spec 본문 편집·마커 재배치·seen 갱신·커밋 발생은 진행이 **아니다**.

### (S1) 하드 정지 — 운영자 개입 요구
입력 큐가 비어있지 않은데 실질 진행 0 이 **K tick 연속**이면, 에이전트는 `.claude/locks/stall-<agent>` 를 생성하고 `specs/50.blocked/pipeline/stall-<YYYYMMDD>-<agent>_reason.md` 에 사유를 박제한 뒤 종료한다.

| agent | K |
|---|---|
| planner | 16 (≈8h) |
| inspector | 16 |
| discovery | 8 |
| developer | 8 |

이후 tick 은 선결 점검 (0) 에서 hard no-op 한다. **lock 삭제는 운영자 전용** (RULE-05).

### (S2) 자가 일시정지
자기 no-op streak ≥ 12 또는 `reconcile` 전수 stale ≥ 3 cycle 이면 `.claude/locks/<agent>.pause` 를 자가 생성하고 (S1) 과 동일한 `_reason.md` 를 남긴 뒤 종료한다.

전 큐 hash 불변 + `60.done` 증가 0 이 24h 지속되면 `.claude/locks/pipeline.pause` 를 자가 생성한다.

### (S3) 정체 spec 강제 격리 — planner 의무
**연속 5 tick 동안 promote 와 carve 가 모두 0** 이면, planner 는 최고령 green spec **1건**을 `50.blocked/spec/` 으로 `mv` 하고 `_reason.md` 를 남긴다.

이 이동은 **의무다. 보류·재량·정합 유지 명분으로 미루지 않는다.** 규약이 정한 조건이 충족되면 실행하고, 실행 결과를 `RULE-04` 보고에 박제한다. 판정 근거가 미심쩍으면 이동한 뒤 `_reason.md` 에 의문을 적는다 — 이동하지 않는 선택지는 없다.

> 구 기준(`diff-hash 2회 이상 정체`)은 문면상 충족된 상태에서 122 tick 간 불발했으므로 위 기준으로 **교체**한다.

### (S4) 큐 TTL
소비자 기준 N tick 을 넘겨 소비되지 않은 큐 항목은 흡수 또는 `50.blocked/` 이동이 의무다.

| 큐 | 소비자 | N |
|---|---|---|
| `20.req/` | inspector | 14 |
| `10.followups/` | discovery | 14 |
| `40.task/` | developer | 28 |

**TTL 판정은 (2)(3) backpressure no-op 시에도 수행한다.** 그러지 않으면 큐가 만수위로 동결된 상태에서 TTL 이 영구히 발동하지 않는다 — head-of-line blocking 이 정확히 그렇게 발생했다.

### 권한 정합
lock 자가 생성과 `50.blocked/pipeline/` 쓰기는 `RULE-02` 금지 조항의 예외이며 `RULE-01` 매트릭스에 등재돼 있다. 삭제 권한은 운영자 전용이다 (`RULE-05`).
