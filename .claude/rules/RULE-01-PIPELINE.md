# RULE-01 파이프라인

흐름: `req → spec.blue → spec.green → task → code`
완료: `code ok → task done → green promote→blue → req done`

## 레이아웃

```
specs/
  followups/*.md                      developer → discovery
  req/ready/*.md                      discovery → inspector
  spec/blue/**                        baseline (planner mv only)
  spec/green/**                       WIP (inspector create/edit)
  task/ready/*.md                     planner → developer
  blocked/{req,spec,task}/**          공용 격리 + {slug}_reason.md
  done/YYYY/MM/DD/                    공용 아카이브
    {followups,req,task/{slug}}/
```

## 이동 원자성 & 불변
- `mkdir -p <dst> && mv <src> <dst>`. 편집은 이동 전.
- 검증 실패 시 역이동 → `blocked/`.
- `followups/`, `req/ready/`, `task/ready/` 는 mv 만 허용 (내용 수정 금지).

## 쓰기 권한
| writer | create/edit | mv |
|---|---|---|
| developer | `followups/`, `src/` | `task/ready/*` → `done/task/{slug}/` 또는 `blocked/task/` |
| discovery | `req/ready/` | `followups/*` → `done/followups/` |
| inspector | `spec/green/**` | `req/ready/*` → `done/req/` 또는 `blocked/req/` |
| planner | `task/ready/` | `spec/green/F` → `spec/blue/F`, `spec/**` → `blocked/spec/` |

## Task ID
`TSK-YYYYMMDD-NN`. 생성 직전 `grep -rn "TSK-..." specs/task/ specs/done/ specs/blocked/` 로 중복 검증. carve 는 `-a,-b` 접미사 + 파생 지시서에 `supersedes:` 메타.
