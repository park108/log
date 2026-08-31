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
  50.blocked/pipeline/**              정체 격리 (RULE-03)
  60.done/YYYY/MM/DD/{followups,req,task/{slug}}/
```

## 이동 원자성
- `mkdir -p <dst> && mv <src> <dst>`. 편집은 이동 전. 검증 실패 시 역이동 → `50.blocked/`.
- `10.followups/`, `20.req/`, `40.task/` 는 **mv 만** — 발행된 뒤에는 내용을 고치지 않는다.

## 쓰기 권한
| writer | create/edit | mv |
|---|---|---|
| developer | `10.followups/`, `src/`, `scripts/`, `public/`, `index.html` | `40.task/*` → `60.done/task/{slug}/` 또는 `50.blocked/task/` |
| discovery | `20.req/` | `10.followups/*` → `60.done/followups/` |
| inspector | `30.spec/green/**` | `20.req/*` → `60.done/req/` 또는 `50.blocked/req/` |
| planner | `40.task/` | `30.spec/green/F` → `30.spec/blue/F`, `30.spec/**` → `50.blocked/spec/` |
| *(전 agent)* | `.claude/locks/**`, `50.blocked/pipeline/`, `.claude/reports/<agent>.ndjson` | — |
| **operator** | `10.followups/`, `rules/`, `.claude/agents/`, lock 삭제 | 전 큐 |

## 파일 이름
- spec: `30.spec/{blue,green}/**/<slug>.md` — **`-spec` suffix 금지**.
- blocked reason: `<slug>_reason.md` (동일 디렉터리).
- req: `20.req/<YYYYMMDD>-<slug>.md` · task: `40.task/TSK-<YYYYMMDD>-<NN>-<slug>.md`.

## Task ID
`TSK-YYYYMMDD-NN`. 생성 직전 `grep -rn "TSK-..." specs/{40.task,60.done,50.blocked}/` 중복 검증. carve 는 `-a,-b` 접미사 + `supersedes:`.

## depends_on

선행 작업이 **트리에 착지했는가**를 묻는다. 충족은 `60.done/**/task/<ID>/` 실재 **한정**이다 — `revisit` 종결은 폐기이지 완료가 아니다.

task 본문이 선행 조건을 **측정 명령**으로 적었으면 그 명령이 판정 근거다. ID 대조와 엇갈리면 명령을 따른다.

폐기된 선행 작업이 새 ID 로 재발행되면 후행 task 도 새 ID 로 재발행하고 `supersedes:` 로 잇는다 (발행분은 고치지 않는다).

## 발행분 정정

명령이 **실행 불가능할 때만** (빈 추출 · 대상 없음 · 자리표시자 · 인용 사멸) 말미에 `## 정정` 절을 **덧붙인다.** 본문은 고치지 않는다. 판정 기준이 바뀌면 정정이 아니라 재발행이다.

- 쓰기 직전 `ls specs/40.task/<ID>*` 로 실재 확인 — 이미 소비됐으면 정정하지 말고 `10.followups/` 로 남긴다. **원본 이름으로 큐에 파일을 다시 만들면 developer 가 미착수 task 로 집어간다.**
- 소비자는 옮긴 뒤 같은 이름이 다시 나타나면 내용을 고치지 말고 `60.done/` 의 해당 디렉터리로 함께 옮긴다.

덮어쓰지 않는 이유: developer 가 이미 착수했을 수 있고 에이전트끼리는 호출할 수 없다. 덮어쓰면 어긋남이 `rc` 로 드러나지 않는다.

## 규약 참조

task 문서는 규약 문면을 **베끼지 말고 참조한다** (`RULE-06 §<절>`). 베끼면 그 판본이 얼어붙고 발행분은 고칠 수 없다.
