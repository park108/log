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
