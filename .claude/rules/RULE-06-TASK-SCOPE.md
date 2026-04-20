# RULE-06 Task 스코프 & grep 게이트 정합성 (Task Scope & Grep Gate Alignment)

> 적용 범위: planner, inspector, developer

작업지시서 `## 변경 범위` 와 `## 검증/DoD` grep 게이트가 불일치할 때 에이전트는 비결정적 판단을 하게 된다. 본 규약은 작성 시점에 이 모호성을 100% 해소한다.

## 1. 배경

`## 검증/DoD` 의 `grep -rn <pattern> src/ → 0 lines` 형태 게이트는 `src/` 전체에 적용된다. 반면 `## 변경 범위` 는 파일을 선별 열거한다. baseline 에서 해당 pattern 이 `## 변경 범위` 밖 파일에도 존재하면:

- developer 는 scope 확장 (게이트 충족 목적) 또는 blocked 격리 (`RULE-02` §1.5) 중 하나를 **비대화 조건**(`RULE-02` §1.4)에서 선택해야 한다.
- `task/ready/*.md` 는 Immutable Handoff (`RULE-01` §4) — developer 가 재해석하면 상류 계약 훼손.

→ **작성 시점 해소**: planner/inspector 가 `## 스코프 규칙` 섹션으로 명시.

## 2. `## 스코프 규칙` 섹션 (필수)

작업지시서에 `grep -rn <pattern> <path> → 0 lines` 형태 DoD 게이트가 **1건 이상** 포함되면, 아래 섹션을 작성:

```markdown
## 스코프 규칙

- **expansion**: 허용 | 불허 | N/A
- **grep-baseline**:
  - `grep -rn "<pattern>" <path>` → N hits in M files:
    - `src/foo.js:12`
    - `src/bar.test.js:34, 56`
- **rationale**: <선택 사유 1~2줄>
```

필드 의미:
- **expansion: 허용** — baseline hit 가 `## 변경 범위` 밖 파일에 있어도 동일 task 에서 정상화 가능. DoD 게이트 충족이 목적일 때 권장 기본값.
- **expansion: 불허** — scope 밖 파일은 건드리지 않는다. 게이트 위반 파일이 scope 밖이면 developer 가 즉시 `task/blocked/` 격리 + `_reason.md`. 분리 task 로 후속 처리.
- **expansion: N/A** — grep 게이트 없음 (본 섹션 자체 생략 가능).
- **grep-baseline** — planner/inspector 가 작성 시점에 실제 `grep` 을 실행한 결과. 파일·라인을 1:1 열거.

## 3. 역할별 의무

### 3.1 planner (`.claude/agents/planner.md` §3, §3a)
- 지시서 작성 시 grep 게이트가 있으면 `## 스코프 규칙` 섹션 작성.
- `grep-baseline` 은 실제 실행 결과 박제 (`RULE-01` §6 과는 별개 의무 — `RULE-01` §6 은 Task ID 중복 검증, 본 규약은 DoD 게이트 baseline).

### 3.2 inspector (`.claude/agents/inspector.md`)
- spec DoD 에 grep 게이트 정의 시 baseline 실행 의무 (planner 로 전파되어 지시서 작성 시점에도 재확인).

### 3.3 developer (`.claude/agents/developer.md`)
- 수행 전 `## 스코프 규칙` 섹션 읽기.
- `expansion: 허용` → baseline 에 열거된 scope 밖 파일도 게이트 충족 목적으로 정상화.
- `expansion: 불허` → scope 밖 파일 변경 금지. 게이트 위반 파일이 scope 밖이면 즉시 blocked.
- `expansion: N/A` 또는 섹션 부재 → 기존 `## 변경 범위` 만 준수 (grep 게이트 없음 전제).

## 4. 예시 (REQ-031 anonymized)

```markdown
## 검증/DoD
- [ ] `grep -rn "abcde=abcde" src/` → 0 lines

## 스코프 규칙
- **expansion**: 허용
- **grep-baseline**:
  - `grep -rn "abcde=abcde" src/` → 3 hits in 2 files:
    - `src/common/common.test.js:91, 127`
    - `src/App.test.jsx:151`
- **rationale**: 전역 문자열 잔재 sweep — scope 밖 `src/App.test.jsx` 도 동반 정상화해야 게이트 충족. fixture cleanup 성격.
```

## 5. 적용 범위 & 제한

- 본 규약은 **grep 게이트**에만 적용. 다른 게이트 형태(`npm test` exit code, coverage %)는 별 REQ 로 분리.
- 기존 `task/done/**` 문서 retrospective 갱신 금지 (`RULE-02` §2.2).
- `task/ready/**` 이미 발행된 지시서는 rewrite 금지 (`RULE-01` §4). 본 규약은 **차기 발행부터 적용**.
- `## 스코프 규칙` 섹션은 **선택적** — grep 게이트 없으면 생략 가능 (하지만 게이트 있으면 필수).