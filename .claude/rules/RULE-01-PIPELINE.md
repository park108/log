# RULE-01 파이프라인

진행 `req → spec.blue → spec.green → task → code` / 완료 `code ok → task done → green→blue → req done`.

## 레이아웃

```
specs/
  10.followups/*.md                   developer → discovery
  20.req/*.md                         discovery → inspector
  30.spec/blue/**                     baseline (planner mv only)
  30.spec/green/**                    WIP (inspector create/edit)
  40.task/*.md                        planner → developer
  50.blocked/{req,spec,task}/**       격리 + {slug}_reason.md
  50.blocked/pipeline/**              정체 격리 (RULE-03 §정체 감지)
  60.done/YYYY/MM/DD/{followups,req,task/{slug}}/
```

## 이동 원자성
- `mkdir -p <dst> && mv <src> <dst>`. 편집은 이동 전. 검증 실패 시 역이동 → `50.blocked/`.
- `10.followups/`, `20.req/`, `40.task/` 는 mv 만 (내용 수정 금지).

## 쓰기 권한
| writer | create/edit | mv |
|---|---|---|
| developer | `10.followups/`, `src/` | `40.task/*` → `60.done/task/{slug}/` 또는 `50.blocked/task/` |
| discovery | `20.req/` | `10.followups/*` → `60.done/followups/` |
| inspector | `30.spec/green/**` | `20.req/*` → `60.done/req/` 또는 `50.blocked/req/` |
| planner | `40.task/` | `30.spec/green/F` → `30.spec/blue/F`, `30.spec/**` → `50.blocked/spec/` |
| *(전 agent)* | `.claude/locks/{stall-<agent>,<agent>.pause,pipeline.pause}`, `specs/50.blocked/pipeline/`, `.claude/reports/<agent>.ndjson` | — |
| **operator** | `10.followups/` (결함 신고 — RULE-05), `rules/`, `.claude/agents/`, lock 삭제 | 전 큐 (RULE-05) |

## 파일 이름
- spec: `30.spec/{blue,green}/**/<slug>.md`, `50.blocked/spec/**/<slug>.md` — **`-spec` suffix 금지** (디렉터리 경로로 식별).
- blocked reason: `<slug>_reason.md` (동일 디렉터리).
- req: `20.req/<YYYYMMDD>-<slug>.md`. task: `40.task/TSK-<YYYYMMDD>-<NN>-<slug>.md`.

## Task ID
`TSK-YYYYMMDD-NN`. 생성 직전 `grep -rn "TSK-..." specs/{40.task,60.done,50.blocked}/` 중복 검증. carve: `-a,-b` 접미사 + `supersedes:` 메타.
## depends_on 충족 판정 (2026-08-31 신설)

`depends_on` 은 **선행 작업이 트리에 착지했는가**를 묻는다. ID 가 어딘가에 적혀 있는가를 묻지 않는다.

- **충족**: `specs/60.done/**/task/<선행 ID>/` 디렉터리가 실재한다. `60.done/**/task/` **한정**이다.
- **미충족**: 그 밖의 모든 상태. `50.blocked/`, `40.task/` 잔류, 그리고 **`60.done/**/revisit/` 종결**이 여기 속한다.

> **`revisit close` 는 완료가 아니라 폐기다** (RULE-05). 그 task 의 변경은 트리에 없다. 그런데 ID 문자열은 `60.done/` 아래 남으므로, 경로를 보지 않는 `grep -rn "<ID>" specs/60.done/` 은 hit 을 낸다 — 폐기를 완료로 읽는다.

**실측 (2026-08-31)** — `TSK-20260831-05-b` 의 `depends_on: [TSK-20260831-05-a]`:

```
$ grep -rl "TSK-20260831-05-a" specs/60.done/
specs/60.done/2026/08/31/revisit/TSK-20260831-05-a-....md        ← 폐기
specs/60.done/2026/08/31/followups/20260831-1750-....md          ← 신고서가 ID 를 인용
specs/60.done/2026/08/31/req/20260831-....md                     ← req 가 ID 를 인용
```

hit 3건 전부가 "착지" 가 아니다. 05-a 가 올리기로 한 `ALLOWED_TAGS` 표 태그는 실측 **0** 이었다.
이 상태에서 05-b 를 착수하면 파서가 표를 emit 하고 sanitize 가 통째로 지워 **머리 셀 글자마저 사라진다** — 착수 전보다 나쁘다.

### 재발행된 선행 작업
폐기된 선행 작업이 다른 ID 로 재발행되면 후행 task 의 `depends_on` 은 **낡은 ID 를 계속 가리킨다.**
발행분 rewrite 는 금지이므로 (§이동 원자성), planner 는 후행 task 도 새 ID 로 재발행하고 `supersedes:` 로 잇는다.

### 실질 조건 우선
task 본문이 선행 조건을 **측정 명령**으로 적었으면 (예: `05-a 의 G1 (table-tag-entries ≥ 6) 이 rc=0`)
그 명령이 판정의 근거다. ID 대조는 보조다. 명령과 ID 대조가 엇갈리면 **명령을 따른다** —
ID 는 의도의 기록이고 명령은 트리의 상태다.

## 발행분 정정 (2026-08-31 신설)

`40.task/**` 는 발행 후 **내용 수정 금지**다 (§이동 원자성). 그러나 **실행 불가능한 DoD 명령**을 그대로 두면 developer 는 그 task 를 수행할 수 없고, 오타 부류의 결함이 `50.blocked/task/` → revisit 왕복 전체를 요구하게 된다.

### 허용되는 정정 — 추가만, 덮어쓰기 금지

발행분 말미에 `## 정정` 절을 **덧붙인다.** 본문은 한 글자도 고치지 않는다.

```markdown
## 정정
> <UTC ISO> · <발행자>
- **(I3) 명령**: 본문 형태는 `bash -c` 밖에서 `'''` 이 사멸해 6→0 hit 이 된다.
  아래를 대신 실행한다: `<정정된 명령>`
- **사유**: 실행 불가 (rc=127). 스코프·지시·수용 의미 불변.
```

정정 자격은 **명령이 실행 불가능한 경우로 한정**한다 — 빈 추출·`rc=2`(대상 없음)·`rc=127`·자리표시자 잔존·인용 사멸. **판정 기준을 바꾸는 정정은 정정이 아니라 재발행**이며 새 ID + `supersedes:` 로 한다.

### 왜 덮어쓰지 않는가

developer 가 **이미 착수했을 수 있고, 에이전트는 서로 호출할 수 없다** (`RULE-02 §큐 기반`). 발행자는 착수 여부를 알 방법이 없다. 덮어쓰면 developer 가 추출한 명령과 문서가 조용히 어긋나고, 그 어긋남은 `rc` 로 드러나지 않는다.

덧붙이면 두 판본이 함께 남아 **무엇을 실행했는지 사후에 판정할 수 있다.** developer 는 추출한 문자열과 길이를 `result.md` 에 박제하므로 (`RULE-06 §추출 실패 검출`), 그 기록과 대조하면 어느 판본을 읽었는지 확정된다.

> **실측 (2026-08-31)** — planner 가 dry-run 정정 pass 로 발행분 9건을 덮어썼고 그중 `TSK-20260831-20-a` 는 그 시점에 developer 가 착수 중이었다. planner 가 자진 신고했고 실제 피해는 없었다 — developer 가 박제한 명령 길이 3건이 현 문서와 **정확히 일정한 차이(+9 = 추출 규약 차)** 라 같은 판본임이 확정됐다. **판정이 가능했던 것은 developer 가 길이를 박제했기 때문이다.** 박제가 없었으면 무해했는지조차 알 수 없었다.

### 대상이 이미 이동한 경우 (2026-09-01 추가)

정정을 쓰려는 순간 그 task 가 **이미 `60.done/` 이나 `50.blocked/` 로 옮겨졌을 수 있다.** 발행자는 소비 여부를 알 수 없으므로 이 경합은 구조적이다.

- **`40.task/` 에 원본 이름의 파일을 새로 만들지 마라.** developer 가 그것을 미착수 task 로 읽고 다시 집어간다. 실제로 발생했다 — 정정이 이동 뒤에 도착해 **680 B 스텁**이 큐에 남았다.
- 쓰기 직전에 `ls specs/40.task/<ID>*` 로 실재를 확인한다. 없으면 **정정하지 않는다.**
- 이미 소비된 task 의 명령이 실행 불가능했다면 그것은 정정 사안이 아니라 **관측**이다. `10.followups/` 로 남긴다 — 소비자가 그 명령으로 무엇을 했는지는 `result.md` 에 있고, 거기에 없으면 애초에 실행되지 않은 것이다.

> 소비자 쪽 대응: `40.task/` 에서 옮긴 뒤 같은 이름의 파일이 다시 나타나면 **내용을 고치지 말고** `60.done/` 의 해당 디렉터리로 함께 옮긴다 (`_정정.md`). 큐에 남기면 재소비된다.

### 규약은 복사하지 말고 참조한다 (2026-09-01 추가)

task 문서에 규약 문면을 **베껴 넣지 마라.** `RULE-06 §<절 이름>` 처럼 **참조로** 쓴다.

- 베끼면 그 순간의 판본이 얼어붙는다. 규약이 뒤에 다듬어져도 발행분은 낡은 문장을 들고 있고, **발행분 rewrite 는 금지**라 고칠 수도 없다.
- 참조하면 **정정이 자동으로 전파된다.** 실측 — 목격자 조항의 보완(`3ec2648`)이 planner tick 도중 착지했는데, 그 tick 이 발행한 task 6건이 참조로 썼기에 rewrite 없이 보완을 물려받았다.

**단, 규약 변경이 그 task 의 판정 기준을 바꾸는 경우는 다르다.** 그때는 발행분이 조용히 다른 것을 요구하게 되므로 §발행분 정정 의 판단대로 **재발행**한다 (새 ID + `supersedes:`). 기법의 보완은 전파해도 되고, 요구의 변경은 안 된다.

### 정정 이력
정정 사실은 `RULE-04` notes 에 `amend: <ID> (<사유>)` 로 박제한다.
