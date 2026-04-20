# RULE-04 보고 포맷 (Report Format)

> 적용 범위: 모든 에이전트

각 세션 종료 시 **stdout 에 아래 블록을 반드시 1회 출력**한다. 외부 스케줄러/모니터링이 주기 결과를 파싱할 수 있어야 한다.

## 블록 스펙

```
## <agent> @ YYYY-MM-DDTHH:MM:SSZ
- input-queue: <count>
- processed: <count>
- produced: [<path>, ...]
- moved: [<src> -> <dst>, ...]
- blocked: [<path>, ...]
- backpressure: <none|reason>
- no-op: <true|false>
- notes: <one-line summary>
```

## 필드

| 필드 | 의미 |
|------|------|
| `agent` | `discovery` / `inspector` / `planner` / `developer` |
| 타임스탬프 | UTC ISO-8601 (`Z` 접미사) |
| `input-queue` | 시작 시점 입력 큐 파일 수 |
| `processed` | 실제 처리한 항목 수 (no-op 은 0) |
| `produced` | 신규 생성된 파일 경로 배열 |
| `moved` | 이동된 파일 `"src -> dst"` 배열 |
| `blocked` | 이번 실행에서 blocked/ 로 격리한 파일 |
| `backpressure` | 임계치 초과 이유; 없으면 `none` |
| `no-op` | 아무것도 안 하고 종료했는가 |
| `notes` | 한 줄 요약 (자유 텍스트) |

## 규칙

- 이 블록을 **먼저** 출력. 상세는 뒤에 자유 양식.
- no-op 종료(pause, 빈 큐, backpressure)여도 **반드시 출력**. 침묵 금지.
- 빈 배열은 `[]` 로. 자연어 "없음" 금지.

## notes 필드 관용 형식

`notes` 는 자유 텍스트지만 아래 토큰은 외부 집계를 위해 관용 형식으로 박제:

- **developer orphan 가드** (`RULE-01` §6, `.claude/agents/developer.md` §1):
  - `notes: "...; orphan: 0"` — 선행 orphan 없음.
  - `notes: "...; orphan: 1 (4c56103)"` — orphan 1건 + 해시.
  - `notes: "...; orphan: unknown (fetch failed)"` — origin 미도달.
- **planner carve** (`RULE-01` §6.5):
  - `notes: "...; carve: TSK-20260420-11 -> TSK-20260420-11-a,TSK-20260420-11-b"`.
- **planner grep dry-run** (`.claude/agents/planner.md`):
  - `notes: "...; grep dry-run: N/N match"` — 박제 쿼리 N개 전수 일치.
  - `notes: "...; grep dry-run: K/N match (drift fixed)"` — 불일치 K건 보완 후 재확인.
- **inspector reconcile** (`.claude/agents/inspector.md` Phase 1):
  - `notes: "...; reconcile: 3/5 ack"` — 5개 green 스캔 중 3건 ack · 2건 유지.
  - `notes: "...; reconcile: 0/0 ack"` — 스캔 대상 0건 (green 비거나 WIP marker 없음).
  - `notes: "...; reconcile: 0/5 ack (2 stale ≥3cycle)"` — 0 ack + stale 경고 (`.inspector-seen` 상 3 사이클 이상 ack 불가 지속).
  - Phase 1 이 빈 큐·임계치 초과·ack 0건으로 무변경이더라도 **본 토큰은 항상 박제** (`RULE-03` §4.1).
