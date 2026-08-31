# RULE-04 보고 (Report)

세션 종료 직전 **세 채널 전부**에 출력. no-op·backpressure 여도 출력. 블록 먼저, 상세는 뒤에.

| 채널 | 대상 | 비고 |
|---|---|---|
| stdout | 즉시 관측 | 소멸 채널 — 이것만으로는 부족 |
| `.claude/reports/<agent>.ndjson` | RULE-03 정체 판정 입력 | **gitignored**, tick 당 1 JSON 라인 append |
| 커밋 body | 감사 이력 | 커밋이 발생한 tick 한정 · **커밋 시점 확정분 한정** (아래) |

**커밋 body 는 커밋 시점의 기록이지 미래 측정의 저장소가 아니다.** `RULE-02 §단위 커밋` 이 구현 직후 커밋을 지시하고 `RULE-06 §게이트 실효 검증` 의 injection·control 왕복이 그 뒤에 수행되므로, 커밋 시점에 존재하지 않는 수치는 body 에 담기지 않는다. 그 토큰은 **stdout + ndjson 2채널로 충족**된다 — `--amend` 는 금지이고 (`RULE-02 §금지`) `specs/**` 는 gitignored 라 후속 커밋에 담을 변경도 없다.

> 셋을 동시에 만족시킬 방법이 없다는 것을 `TSK-20260827-01` 의 developer 가 실행 중에 발견했다 (`injection: 2/2 detect` · `control: 2/2 pass` 가 `c084b28` body 에서 누락). 단위 커밋을 게이트 task 에서 면제하면 오늘 16 세션을 날린 all-or-nothing 이 그 부류에 되살아나므로, 문면을 사실관계에 맞춘다.

> stdout 만 있던 기간에 772 tick 의 보고가 전부 증발했다. 113차 tick 의 자가 사망 진단("자율 회복 완전 정지 100% no-op")도 그렇게 사라졌고, 파이프라인은 256 tick 을 더 돌았다.

**`.claude/reports/**` 를 git 추적하지 말 것** — no-op tick 마다 staged diff 가 생겨 빈 커밋이 부활한다 (RULE-02 §커밋).

```
## <agent> @ <UTC ISO-8601>
- input-queue: <n>
- processed: <n>
- produced: [<path>, ...]
- moved: [<src> -> <dst>, ...]
- blocked: [<path>, ...]
- backpressure: <none|reason>
- no-op: <true|false>
- streak: <연속 no-op tick 수>
- last-productive: <행위>@<YYYY-MM-DD>
- notes: <정의 토큰만; 자유 서술 금지>
```

빈 배열은 `[]`. 자연어 "없음" 금지. `notes` 는 아래 관용 토큰만 — 서사·가설·체인 수치 금지.

## ndjson 라인 형식
```json
{"ts":"<UTC ISO>","agent":"planner","tick":370,"no_op":true,"streak":123,"moved":0,
 "queues":{"in":20,"out":0},"thresholds":{"TASK_READY_MAX":10},"notes":["carve: 0"]}
```
`streak` 과 `moved` 는 RULE-03 (S1)(S2)(S3) 판정의 직접 입력이다.

## notes 관용 토큰 (해당 시 박제)
- `orphan: 0` | `orphan: N (<hash1>,...)` | `orphan: unknown (fetch failed)` — developer.
- `carve: TSK-A -> TSK-A-a,TSK-A-b` — planner.
- `grep dry-run: N/N match` | `grep dry-run: K/N match (drift fixed)` — planner.
- `reconcile: N/M ack` | `reconcile: N/M ack (K stale ≥3cycle)` | `reconcile: skipped (no delta)` — inspector Phase 1 매 세션 필수. 마지막 형태는 `git diff` 가 공집합이라 게이트 재실행을 생략한 tick 에 쓰며 `stale_cycles` 를 증가시키지 않는다 (RULE-03 §(S2)).
- `promote-verify: N/N rc0` — planner 승격 시 필수 (RULE-07 §promote).
- `diagnostics: M run, K failed` — planner 승격 시 필수 (RULE-07 §promote 조건 2-bis). §수용 기준 이 참조하지 않는 §테스트 현황 판정 명령의 실행 결과. **실패는 승격을 막지 않으나 침묵은 금지**다.
- `injection: N/N detect` — 게이트 신설·수정 task 의 developer 필수 (RULE-06 §게이트 실효 검증).
- `control: M/M pass` | `control: n/a (<사유>)` — 위와 같은 task 에서 `injection` 과 **나란히** 필수 (RULE-06 §음성 대조). 주입은 민감도, 대조는 정상 변형에서의 특이도를 잰다.
- `stall: <agent> K=<n>` — RULE-03 (S1)(S2) 발화 시.
