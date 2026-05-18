---
source_task: TSK-20260518-21
category: pipeline-integrity
severity: high
observed_at: 2026-05-18T11:54:00Z
---

# developer commit 도중 planner self-commit 과 race — 메시지/콘텐츠 mismatch 박제

## 관찰
TSK-20260518-21 (eslint ignores vacuous-zero check script) 의 단일 developer commit 수행 중, `git commit` 실행 결과 commit `5639669ae7ff9866700e9c64540a981f3cc44a71` 가 생성되었으나:

- **commit author**: `Jongkil Park` (정상).
- **commit message**: `spec(planner): 161차 tick HEAD=27e8c2e ...` (planner self-commit 161차 박제 메시지).
- **commit stat** (실제 콘텐츠):
  - `package.json` (+1) — developer 영역.
  - `scripts/check-eslint-ignores-vacuous-zero.sh` (+71 신규) — developer 영역.
  - `specs/60.done/2026/05/18/task/eslint-ignores-vacuous-zero-check-script/TSK-20260518-21-...md` (+75 신규) — developer 영역.
  - `specs/60.done/2026/05/18/task/eslint-ignores-vacuous-zero-check-script/result.md` (+44 신규) — developer 영역.

→ **메시지와 콘텐츠 mismatch**. developer 가 staged 한 4 파일이 planner 의 161차 tick commit 메시지로 박제됨.

## 추정 원인
- developer 와 planner 가 동일 working tree 에서 동시 (또는 매우 인접한 시점) 에 `git commit` 호출.
- husky `pre-commit` hook 의 `lint-staged` 처리가 developer 의 `src/**` 미해당 staged set 에 대해 "could not find any staged files" 로 exit 1 → developer 의 명시적 commit 은 실패한 것으로 보이나, 그 사이 planner 가 자체 commit 트랜잭션을 진행 중이어서 developer 의 index 상태가 planner commit 에 흡수.
- planner 의 commit 메시지 본문에 "working tree clean → developer TSK-20260518-21 진행 중 신호 진입: package.json scripts.check:eslint-ignores-vacuous-zero 1줄 추가 + scripts/check-eslint-ignores-vacuous-zero.sh 미커밋 잔존" 가 박제되어 있어, planner 는 자신 영역만 박제할 의도였으나 git index race 로 developer 변경물이 함께 박제된 것으로 추정.

## 영향
- developer 영역 콘텐츠 자체는 모두 정상 박제 (4 파일 손실 0). 빌드/테스트/DoD 영향 0.
- 그러나 RULE-02 commit 메시지 규약 `{type}: {task title}` (developer) 위반 — 본 commit 메시지가 `spec(planner):` 로 박제됨.
- RULE-01 §writer 매트릭스: planner 영역 (.planner-seen / spec mv) 과 developer 영역 (src/scripts/package.json/60.done/task/) 이 단일 commit 에 혼재 박제 — writer 경계 mixing.
- git blame / `git log -- <path>` 추적 시 developer 변경 history 가 planner 메시지로 표시되어 추적성 저하.

## 후속 분석 후보 (discovery 영역 위임)
1. **husky pre-commit hook + lint-staged 의 동시 commit race 보호** — 단일 working tree 에서 다중 agent 동시 commit 진입 차단 lock (예: `git/index.lock` 명시 확인 + 재시도 큐, 또는 `flock` 기반 critical section).
2. **에이전트 commit 큐 직렬화** — `.claude/locks/` 활용한 commit critical section 진입 시점 lock 표면 (예: `.claude/locks/commit.busy` 생성/삭제 protocol).
3. **commit 메시지 vs stat mismatch 자동 검증** — post-commit hook 으로 메시지 scope (`spec(planner)`, `feat:`, ...) 와 변경 path 영역 (RULE-01 writer 매트릭스) cross-check, mismatch 시 stderr warning + 후속 추적 axis 발화.
4. **결정론 검증 fixture** — 본 race 의 재현 fixture (developer commit 진행 중 planner self-commit trigger 시 결과 분기 측정).

## 박제 사실 (불가역)
HEAD = `5639669ae7ff9866700e9c64540a981f3cc44a71` 의 메시지 정정 불가 (RULE-02 `--amend` 금지). `git revert HEAD` 시 4 file 모두 working tree 로 풀려 정합 깨짐 + 즉시 재커밋 필요 — race 재발 위험. 운영자 판단 영역 (RULE-05) 으로 위임.

## 참고
- 동일 working tree 의 이전 inspector commit (`5567cfe` → `5033593` 정정 박제) 도 유사한 hook race 박제 잔존 (102차 정정 commit 메시지 본문 직접 박제).
- 본 followup 은 discovery → spec 으로 흘러 시스템 불변식 (multi-agent commit serialization) 으로 정착 후보.
