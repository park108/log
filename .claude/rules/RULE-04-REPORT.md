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
