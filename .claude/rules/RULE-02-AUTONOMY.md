# RULE-02 독립 실행 & 공통 금지 (Autonomy & Prohibitions)

> 적용 범위: 모든 에이전트

에이전트는 **독립 세션에서 주기 트리거**로 실행된다. 사람이 옆에 앉아 있지 않다.

## 1. 독립 실행 6원칙

### 1.1 무상태
- 이전 세션의 메모리/변수 의존 금지. 모든 컨텍스트는 파일시스템.

### 1.2 큐 기반만
- 에이전트 간 통신은 `specs/**` 파일 생성/이동. 공유 메모리·직접 호출 금지.

### 1.3 No-op 종료
- 입력 큐 비었을 때 무해하게 no-op 종료. 일거리를 "만들어" 내지 않는다.

### 1.4 비대화형
- 사용자에게 질문·승인·확인 요청 금지. "사용자가 …하면" 같은 분기 금지.
- 모호함은 `**/blocked/` 격리 (해제는 `RULE-05`).

### 1.5 Fail-fast to Blocked
- 실패·충돌·의존성 미충족은 임의 결정 금지.
- `specs/<stage>/blocked/` 이동 + `_reason.md` 기록. **에이전트는 재시도 안 함**.

### 1.6 멱등
- 같은 입력 2번 실행해도 동일 결과. 처리된 항목은 출력 큐로 이동돼 재처리되지 않는다.
- 부분 상태(half-moved) 금지.

## 2. 공통 금지사항

### 2.1 경계 위반
- 에이전트 간 **직접 호출** 금지.
- 다른 에이전트의 큐 파일 **내용 수정** 금지 (`RULE-01` §2 매트릭스).
- 자기 쓰기 영역 밖 생성/수정/삭제 금지.

### 2.2 쉘 명령
- `rm -rf`, `rm -r` 금지. 삭제 필요 시 `mv` 로 대체.
- `git reset --hard`, `git clean -f`, `git checkout -- .` 금지.
- `git push --force*` 금지.
- `git config` 변경 금지.
- 훅 우회(`--no-verify`, `--no-gpg-sign`) 금지.
- `git commit --amend`(이전 커밋 덮어쓰기) 금지.

### 2.3 커밋 / 푸시
- **공유 범위**: 원격에 공유되는 것은 **`specs/spec/**`** 와 **`src/**`** 뿐이다. `specs/followups/**`, `specs/requirements/**`, `specs/task/**` 등 큐/아카이브는 `.gitignore` 로 **로컬 전용**. 레포 설정상 기본값.
- **로컬 커밋**: 각 에이전트는 `RULE-01` §2 매트릭스상 **자기 writer 영역 내 변경만** 세션 종료 직전 **단일 커밋**으로 기록한다. `.gitignore` 로 제외된 경로는 자동 생략 — 결과적으로 스테이지가 비면 **커밋 없음** (멱등).
- **원격 push**: **developer 전용**. 다른 에이전트는 로컬 커밋까지만, push 금지.
- 커밋 메시지 포맷:
  - developer 의 task 커밋: `developer.md` §5 포맷 유지 (`{type}: {task title}`).
  - **그 외 에이전트**: `{scope}({agent}): {요약}` — `{scope}` ∈ {spec, req, task, followup}, `{agent}` ∈ {discovery, inspector, planner}.
    - `spec(inspector): reflect REQ-20260418-001 on build/react-version-spec`
    - `spec(planner): promote monitor/web-vitals green→blue`
    - `spec(planner): block styles/design-tokens (3회 정체)`
  - discovery 출력(`specs/requirements/ready/**`, `specs/followups/consumed/**`)은 현 gitignore 상 전량 제외 → 실제 커밋 발생하지 않음. gitignore 가 완화되면 규칙은 자동 적용.
- 커밋은 **자기 writer 영역 밖 파일을 절대 포함하지 않는다**. `git add` 는 **파일 명시** (`-A`/`.` 금지). 민감 파일(`.env`, `*.pem`, 자격증명) 스테이징/커밋 금지.
- **사전 staged 파일 필터링 (세션 시작 시 의무)** — `git add <file>` 로 자기 writer 영역만 명시해도, 세션 시작 시 이미 index 에 staged 된 타 에이전트·타 세션 잔재 (예: 병렬 developer 가 staged 해둔 `D` 상태 파일, 미완 `A` 상태 파일) 는 `git commit` 이 자동 캡처하므로 **커밋에 혼입된다**. 방지를 위해 각 에이전트는 세션 시작 직후 아래 절차를 수행:
  1. `git status --short` 실행.
  2. 첫 컬럼이 `A`·`M`·`D`·`R`·`C` (index-staged) 이고 **자기 writer 영역 밖** 인 경로는 `git reset HEAD -- <path>` 로 언스테이지. worktree 의 실제 변경은 건드리지 않음 (`git reset --hard` 금지 §2.2).
  3. 언스테이지 후 자기 변경을 `git add <path>` 로 명시 스테이지.
- 스코프 누수가 발생한 후 발견되면 `--amend` 금지 (§2.2) 이므로 **역복원 신규 커밋** 으로 바로잡는다. 메시지 예: `chore({agent}): restore <path> (prev commit accidental include)`.
- 훅 실패 시 부분 스테이지 해제 후 원인 수정·재시도. **훅 우회 금지** (§2.2).
- `master`/`main` 직접 푸시가 정책상 금지면 작업 브랜치로 전환 후 보고 (developer 한정).
