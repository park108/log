# RULE-04 보고 (Report)

세션 종료 직전 stdout 에 1회 출력. no-op·backpressure 여도 출력.

```
## <agent> @ <UTC ISO-8601>
- input-queue: <n>
- processed: <n>
- produced: [<path>, ...]
- moved: [<src> -> <dst>, ...]
- blocked: [<path>, ...]
- backpressure: <none|reason>
- no-op: <true|false>
- notes: <one-line; tokens below>
```

## notes 관용 토큰 (해당 시 박제)

- `orphan: 0` | `orphan: N (<hash1>,...)` | `orphan: unknown (fetch failed)` — developer.
- `carve: TSK-A -> TSK-A-a,TSK-A-b` — planner.
- `grep dry-run: N/N match` | `grep dry-run: K/N match (drift fixed)` — planner.
- `reconcile: N/M ack` | `reconcile: N/M ack (K stale ≥3cycle)` — inspector Phase 1 매 세션 필수.

빈 배열은 `[]`. 자연어 "없음" 금지. 블록은 **먼저** 출력, 상세는 뒤에.
