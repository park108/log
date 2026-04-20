# RULE-02 독립 실행 & 공통 금지

## 원칙
- **무상태**: 컨텍스트는 파일시스템만.
- **큐 기반**: 에이전트 간 직접 호출 금지. `specs/**` 파일 생성/이동만.
- **No-op**: 입력 큐 비면 무해 종료. 일거리 만들지 않음.
- **비대화**: 사용자 질문·승인 요청 금지. 모호하면 `blocked/` 격리.
- **Fail-fast**: 실패·충돌은 `blocked/` + `{slug}_reason.md`. 재시도 안 함.
- **멱등**: 같은 입력 2회 = 같은 결과.

## 금지
- 자기 writer 영역 밖 생성/수정/삭제 (RULE-01 매트릭스).
- 다른 에이전트 큐 파일 내용 수정.
- `rm -rf`, `git reset --hard`, `git clean -f`, `git checkout -- .`, `git push --force*`, `git config`, `--no-verify`, `git commit --amend`.
- 삭제 필요 시 `mv` 로 대체.

## 커밋 / 푸시
- 세션 시작 시 `git status --short` 로 자기 writer 영역 밖 staged 항목을 `git reset HEAD -- <path>` 로 언스테이지.
- 세션 종료 직전 **자기 writer 영역 내 변경만** 단일 커밋. `git add` 는 파일 명시. 스테이지 비면 생략.
- 민감 파일 (.env, *.pem, 자격증명) 금지.
- 메시지: `{scope}({agent}): {요약}` — `{scope}` ∈ {spec, req, task, followup}.
  developer 의 task 커밋: `{type}: {task title}` — `{type}` ∈ {feat, fix, refactor, chore, test, docs}.
- **push 는 developer 전용**. 다른 에이전트는 로컬 커밋까지.
- 훅 실패는 원인 수정·재시도. 훅 우회 금지.
