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