# RULE-02 독립 실행 & 공통 금지

## 원칙
- **무상태**: 컨텍스트는 파일시스템만.
- **큐 기반**: 에이전트 간 직접 호출 금지. `specs/**` 생성/이동만.
- **No-op**: 입력 큐 비면 무해 종료.
- **비대화**: 사용자 질문·승인 요청 금지. 모호하면 `blocked/`.
- **Fail-fast**: 실패·충돌 → `blocked/` + `{slug}_reason.md`. 재시도 없음.
- **멱등**: 같은 입력 2회 = 같은 결과.

## 금지
- 자기 writer 영역 밖 생성/수정/삭제 (RULE-01 매트릭스).
- 다른 에이전트 큐 파일 내용 수정.
- `rm -rf`, `git reset --hard`, `git clean -f`, `git checkout -- .`, `git push --force*`, `git config`, `--no-verify`, `git commit --amend`.
- 삭제 필요 시 `mv` 로 대체.
- **예외**: `RULE-03 §정체 감지` 가 정한 lock 자가 생성(`.claude/locks/**`)·`50.blocked/pipeline/` 쓰기·`.claude/reports/<agent>.ndjson` append 는 자기 writer 영역으로 간주한다. **lock 삭제는 운영자 전용.**

## 커밋 / 푸시
- 세션 시작: 자기 영역 밖 staged 항목은 `git reset HEAD -- <path>` 로 언스테이지.
- **큐 진행 1단위마다 커밋한다** (§단위 커밋). 단위가 1개뿐이면 결과적으로 단일 커밋이다. `git add` 는 파일 명시. 스테이지 비면 생략.
- 민감 파일 (.env, *.pem, 자격증명) 금지.
- **subject ≤ 72자.** tick 카운터·체인 수치·소인수분해 서사 금지 — 상세는 body 로. (`.husky/commit-msg` 강제)
- 메시지: `{scope}({agent}): {요약}` — `{scope}` ∈ {spec, req, task, followup}. developer task 커밋은 `{type}: {task title}` — `{type}` ∈ {feat, fix, refactor, chore, test, docs}.
- **운영자 커밋은 `operator: {요약}`** (agent 괄호 없음). 에이전트는 이 형식을 쓰지 않는다. 범위는 `rules/` · `.claude/agents/` · `.gitignore` 등 `check-commit-writer-coherence` 가 `meta` 로 분류하는 경로에 한정하며, **`meta` 경로와 에이전트 소유 경로(`src/**` · `specs/**` · `scripts/**`)를 한 커밋에 섞지 않는다** — 섞으면 어떤 단일 writer 도 생성할 수 없는 커밋이 되어 cross-writer 판정에 걸린다 (2026-08-24 실제 발생).
- **push 는 developer 전용**. 그 외는 로컬 커밋까지.
- 훅 실패는 원인 수정·재시도. 우회 금지.

### 단위 커밋 (2026-08-26 신설)

> **계기**: inspector 가 4연속으로 산출 0 을 냈다 (watchdog 2 · 절전 2). 네 세션 모두 실질 분석을 수행했고 모두 **커밋 직전에** 죽었다. 구 문면("세션 종료 직전 … 단일 커밋")은 세션을 all-or-nothing 으로 만들어, 재시도가 누적되지 않고 매번 0 에서 다시 시작하게 했다.

**커밋 단위는 세션이 아니라 큐 진행 1단위다.** 1단위 = 큐 경계 `mv` 1건 + 그 이동이 요구한 자기 영역 편집. 단위가 끝나면 **다음 단위로 넘어가기 전에** 커밋한다.

- 단위가 끝나지 않았으면 커밋하지 않는다. 부분 편집 상태는 커밋 대상이 아니다.
- `mv` 없이 자기 영역 편집만 발생한 tick (drift 동기화·마커 재배치 등) 은 그 편집 전체가 1단위다.
- **no-op tick 은 여전히 커밋하지 않는다.** 스테이지가 비면 생략한다 — 빈 커밋 금지는 그대로다.
- 커밋 수가 늘어도 `RULE-04` 보고는 tick 당 1회다. ndjson 1줄·stdout 블록 1개는 불변이며, `moved` 는 그 tick 의 전 단위를 합산한다.

> 이 규칙이 겨냥하는 것은 커밋 빈도가 아니라 **손실 단위**다. 세션이 죽는 시점은 고를 수 없지만, 죽었을 때 무엇이 남는지는 고를 수 있다.