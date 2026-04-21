# a11y.md blocked — FR-07 구조적 blocker

## 요약
`30.spec/green/common/a11y.md` 가 `planner-seen` ledger 기준 **3 연속 사이클 diff-hash 불변** (stale_cycles=3 @sha256 `e1d6de48..`) 상태로 정체. 잔존 unchecked marker **1건** — `## 수용 기준` L180 `(Should, REQ-033 FR-07)` — 이 구조적 blocker 이므로 본 세션에서 `50.blocked/spec/common/` 로 격리. RULE-05 경로 (수동 `/revisit`) 진입.

## 잔존 unchecked
```
L180: - [ ] (Should, REQ-033 FR-07) blue 승격 시 `30.spec/blue/components/{common,comment,log,image}.md` §접근성 1~2 문장 상호참조 추가. promote 단계 (planner 영역).
```

## 구조적 blocker 분석
FR-07 는 "**blue 승격 시** 추가" 로 조건부 작업이 박제되어 있어 다음 순환 조건에 막힘:
- (a) green 의 승격 조건 = 잔존 `[ ]` == 0.
- (b) 해당 `[ ]` 를 해소하려면 `30.spec/blue/components/{common,comment,log,image}.md` §접근성 절에 1~2 문장을 **증분 편집** 해야 함.
- (c) RULE-01 writer 매트릭스상:
  - planner 의 create/edit 영역 = `40.task/` 만 (blue 는 **mv only**).
  - inspector 의 create/edit 영역 = `30.spec/green/**` 만 (blue 편집 불가).
  - → **blue 파일 내용 편집은 어떤 에이전트도 단독 수행 불가** — blue→green 복사 후 edit → 재승격 경로만 존재.
- 결과: planner 단독 mv 로는 (b) 를 충족할 수 없고, mv 로도 `[ ]` 를 해소할 수 없으므로 (a) 의 승격 조건이 영원히 미충족.

## ledger 추적
- 29th cycle (전): stale=1 (hash `e1d6de48..`).
- 30th cycle (전): stale=2. blocked 미처리 (전례).
- 31st cycle (본 세션): hash 불변 — stale=3 도달. RULE-03 "같은 diff-hash 2회 이상 정체" 문자 해석 기준 격리 타당.
- inspector `.inspector-seen` 도 동 파일 stale_cycles=3 진입을 별도 박제 (`reconcile: 2/2 ack (1 stale >=3cycle)` 토큰).

## 해소 경로 (RULE-05)
운영자 (`/revisit` 스킬) 가 본 `_reason.md` 를 근거로 판정:
- **revive (권장)**: `10.followups/` 로 승격 → discovery 가 새 req 발행 — "blue `components/{common,comment,log,image}.md` §접근성 절에 a11y 패턴 B 상호참조 1~2 문장 박제" 를 inspector 가 blue→green 복사 편집 후 재승격으로 처리. 동시에 green `a11y.md` 는 FR-07 `[x]` 로 플립 + 승격 조건 성숙.
- **close**: FR-07 Should 요구를 감사노트로 기록 후 원본+reason 삭제 (Should 등급이므로 close 가능). 단, REQ-033 FR-07 요구를 포기하는 의미 — 운영자 의사 결정 필요.

## 관련 사실 (HEAD=c5eed40 실측)
- §drift 정상화 표: 전원 취소선 (M1~M10 전 지점 정상화 완료 또는 §예외 확정). 잔존 [ ] 0.
- §테스트 현황: 전원 `[x]`. 잔존 [ ] 0.
- §수용 기준: FR-07 1건만 `[ ]`. 나머지 10건 `[x]`.
- 불변식 본문 (§패턴 B 불변식, §예외, §drift, §스코프 규칙, §회귀 방어, §audit 테스트, §테스트 현황, §변경 이력) 모두 반복 검증 가능한 시스템 계약 — RULE-07 정합.
- §변경 이력: TSK-20260421-69/70/71/72/76/77/78/79 전 태스크 커밋 해시 박제 (28bbf26, 36b4ba5, 0f03547, 1414eae, bdc3964, 3971a46, 6b083b7, d9d026b).

## RULE 준수 (본 blocked 처리)
- RULE-01: planner 가 `30.spec/**` → `50.blocked/spec/` mv 수행 (matrix 허용).
- RULE-02: staged 자기 영역 밖 항목 unstage 불요. 본 세션 변경 = `50.blocked/spec/common/a11y.md` (mv) + `50.blocked/spec/common/a11y_reason.md` (create) + `30.spec/green/.planner-seen` (ledger 갱신). 전부 planner 영역.
- RULE-03: `same diff-hash 2회 이상 정체` 기준. stale=3 도달 시점에서 격리.
- RULE-05: 정식 경로 `blocked → 10.followups/ → discovery → ...` 준수. 원 큐 복귀 금지.

## blocked 시점
- UTC: 2026-04-21T13:38Z (본 세션).
- HEAD: `c5eed40` (`feat: errorReporter 채널 단일화 — D6 FileUpload.jsx` — TSK-85).
- planner: 31st cycle.
