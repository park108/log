# RULE-04 보고

세션 종료 직전 **세 채널 전부**에 출력. no-op·backpressure 여도 출력.

| 채널 | 대상 |
|---|---|
| stdout | 즉시 관측 (소멸 채널 — 이것만으로는 부족) |
| `.claude/reports/<agent>.ndjson` | RULE-03 정체 판정 입력 · **gitignored** · tick 당 1줄 **append** |
| 커밋 body | 감사 이력 · 커밋이 발생한 tick 한정 · **커밋 시점 확정분만** |

**커밋 body 는 커밋 시점의 기록이지 미래 측정의 저장소가 아니다.** 단위 커밋 뒤에 수행하는 injection·control 수치는 stdout + ndjson 2채널로 충족한다 (`--amend` 금지, `specs/**` gitignored).

> **`.claude/reports/**` 를 git 추적하지 말 것** — no-op tick 마다 staged diff 가 생겨 빈 커밋이 부활한다.

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

빈 배열은 `[]`. 자연어 "없음" 금지.

## ndjson
```json
{"ts":"<UTC ISO>","agent":"planner","tick":370,"no_op":true,"streak":123,"moved":0,
 "queues":{"in":20,"out":0},"thresholds":{"TASK_READY_MAX":10},"notes":["carve: 0"]}
```
`streak` 과 `moved` 는 RULE-03 (S1)(S2)(S3) 판정의 직접 입력이다.

## notes 토큰
- `orphan: 0 | N (<hash>,...)` — developer.
- `carve: TSK-A -> TSK-A-a,TSK-A-b` · `grep dry-run: N/N match` — planner.
- `reconcile: N/M ack` | `reconcile: skipped (no delta)` — inspector Phase 1 **매 세션 필수**.
- `promote-verify: N/N rc0` · `diagnostics: M run, K failed` — planner 승격 시 필수 (RULE-07).
- `injection: N/N detect` · `control: M/M pass` — 게이트 신설·수정 task 의 developer 필수, **나란히**. **기대 rc 가 0 인 방향은 `injection` 이 아니라 `control` 로 센다** — 그것은 민감도가 아니라 특이도다.
- `stall: <agent> K=<n>` — RULE-03 (S1)(S2) 발화 시.
