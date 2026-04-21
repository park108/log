# error-reporter-channel.md blocked — FR-06 구조적 blocker

## 요약
`30.spec/green/common/error-reporter-channel.md` 가 `planner-seen` ledger 기준 **3 연속 사이클 diff-hash 불변** (stale_cycles=3 @sha256 `5aca4213..`) 상태로 정체. 잔존 unchecked marker **1건** — `## 수용 기준` L213 `(Should, REQ-039 FR-06)` — 이 구조적 blocker 이므로 본 세션에서 `50.blocked/spec/common/` 으로 격리. RULE-05 경로 (수동 `/revisit`) 진입. `a11y.md` 선례 (31st cycle 격리) 와 동형.

## 잔존 unchecked
```
L213: - [ ] (Should, REQ-039 FR-06) blue 승격 시 `30.spec/blue/components/common.md` §에러 처리 절에 "런타임 도메인 에러 지점은 `reportError` 경유 (REQ-20260421-039)" 1~2 문장 상호참조 추가 — promote 단계 (planner 영역).
```

## 구조적 blocker 분석
FR-06 는 "**blue 승격 시** 추가" 로 조건부 작업이 박제되어 있어 다음 순환 조건에 막힘:
- (a) green 의 승격 조건 = 잔존 `[ ]` == 0.
- (b) 해당 `[ ]` 를 해소하려면 `30.spec/blue/components/common.md` §에러 처리 절에 1~2 문장을 **증분 편집** 해야 함.
- (c) RULE-01 writer 매트릭스상:
  - planner 의 create/edit 영역 = `40.task/` 만 (blue 는 **mv only**).
  - inspector 의 create/edit 영역 = `30.spec/green/**` 만 (blue 편집 불가).
  - → **blue 파일 내용 편집은 어떤 에이전트도 단독 수행 불가** — blue→green 복사 후 edit → 재승격 경로만 존재.
- 결과: planner 단독 mv 로는 (b) 를 충족할 수 없고, mv 로도 `[ ]` 를 해소할 수 없으므로 (a) 의 승격 조건이 영원히 미충족.

## ledger 추적
- 32nd cycle (전): stale=1 (hash `5aca4213..`) — 본 hash 가 TSK-86 ack 반영된 최신 값.
- 33rd cycle (전): stale=2. blocked 미처리 (파이프라인 active 관찰하에 보류 — TSK-86 D7 Comment ack 직후 근접).
- 34th cycle (본 세션): hash 불변 — stale=3 도달. RULE-03 "같은 diff-hash 2회 이상 정체" 문자 해석 기준 + `a11y.md` 선례 일관성 (31st cycle 격리) 근거 격리 타당.

## 해소 경로 (RULE-05)
운영자 (`/revisit` 스킬) 가 본 `_reason.md` 를 근거로 판정:
- **revive (권장)**: `10.followups/` 로 승격 → discovery 가 새 req 발행 — "blue `components/common.md` §에러 처리 절에 `reportError` 경유 상호참조 1~2 문장 박제 (REQ-20260421-039 FR-06 수렴)" 를 inspector 가 blue→green 복사 편집 후 재승격으로 처리. 동시에 green `error-reporter-channel.md` 는 FR-06 `[x]` 로 플립 + 승격 조건 성숙.
- **close**: FR-06 Should 요구를 감사노트로 기록 후 원본+reason 삭제 (Should 등급이므로 close 가능). 단, REQ-039 FR-06 요구를 포기하는 의미 — 운영자 의사 결정 필요.

## 관련 사실 (HEAD=f3d53f2 실측)
- §drift 정상화 표: D1~D7 전 지점 정상화 완료 ("잔존 @HEAD=a2b9119: 0 hits / 0 files" 박제).
- §테스트 현황: 전원 `[x]` (11행).
- §수용 기준: FR-06 1건만 `[ ]`. 나머지 전 마커 `[x]` (24+행).
- 불변식 본문 (§공개 인터페이스, §불변식 FR-01~08, §허용 예외, §drift 정상화, §차원 분리, §의존성, §스코프 규칙, §회귀 방어 단위 테스트 계약, §테스트 현황, §회귀 중점, §변경 이력) 모두 반복 검증 가능한 시스템 계약 — RULE-07 정합.
- §변경 이력: TSK-20260421-80~86 전 태스크 커밋 해시 박제 (1661242, 9734e27, 337d694, 690aa74, 602a7bc, c5eed40, 9fe3e05) + inspector Phase 1 reconcile 커밋 (e8287bd, 0596869, 995471a, a2b9119) 전수 박제.
- `a11y.md` (31st cycle) 와 동형 구조: Should 등급 FR-xx 가 "blue 승격 시 추가" 조건부로 박제 → 구조적 blocker.

## RULE 준수 (본 blocked 처리)
- RULE-01: planner 가 `30.spec/**` → `50.blocked/spec/` mv 수행 (matrix 허용).
- RULE-02: 파일 삭제 없음 — `mv` 로 격리 + `_reason.md` 신설 (자기 writer 영역).
- RULE-03: stale_cycles ≥ 3 도달 후 격리 (선결 점검 통과 — pause lock 부재 + 입력 큐 존재 + 임계치 여유).
- RULE-05: 본 `_reason.md` 는 운영자 `/revisit` 입력 큐. planner 는 재시도 없음.
- RULE-07: 격리 판정 근거는 spec 콘텐츠 품질 아닌 **writer 매트릭스 구조 제약**. spec 본문은 시스템 불변식 정합 (반복 검증 가능·시점 비의존). 1회성 incident patch 아님.

## 연관 블록 (a11y.md 선례 교차참조)
- `specs/50.blocked/spec/common/a11y.md` (31st cycle 격리, FR-07 동형 구조적 blocker).
- `specs/50.blocked/spec/common/a11y_reason.md` — 동일 분석 프레임 (writer 매트릭스 순환 불가).
- 두 건 모두 `/revisit` 경로로 "blue 상호참조 추가" req 신설 시 순환 해소.
