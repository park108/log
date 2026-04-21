# RULE-06 Task 스코프 & grep 게이트

작업지시서 `## 검증/DoD` 에 `grep -rn <pattern> <path> → 0 lines` 형태 게이트가 1건 이상이면 **`## 스코프 규칙` 섹션 필수**. 없으면 섹션 생략 가능.

## 섹션 스펙

```markdown
## 스코프 규칙
- **expansion**: 허용 | 불허 | N/A
- **grep-baseline**:
  - `grep -rn "<pattern>" <path>` → N hits in M files:
    - `src/foo.js:12`
    - `src/bar.test.js:34, 56`
- **rationale**: <1~2줄>
```

## expansion 의미
- **허용**: baseline 에 열거된 scope 밖 파일도 게이트 충족 목적으로 정상화 가능.
- **불허**: scope 밖 변경 금지. 게이트 위반 파일이 scope 밖이면 developer 는 즉시 `50.blocked/task/` 격리.
- **N/A**: grep 게이트 없음.

## 역할
- **planner / inspector**: 작성 시점에 `grep-baseline` 실제 실행 결과 박제.
- **developer**: 수행 전 섹션 읽고 `expansion` 에 따라 행동. 섹션 부재면 `## 변경 범위` 만 준수.

## 정밀 패턴 권고 (afterEach vs 본문 호출)
grep 게이트가 `afterEach` 등록 잔존을 검증할 때는 `afterEach\s*\([^)]*<fn>\s*\(\s*\)` 형태의 **등록 한정 패턴** 을 우선 사용한다. `it` 본문의 직렬화 호출을 잘못 잡지 않도록 한다.
예: `rg -nE "afterEach\s*\([^)]*vi\.useRealTimers\s*\(\s*\)" src --glob="*.test.{js,jsx}"`
멀티라인 블록은 `rg --multiline -U` 또는 `-A 3` 컨텍스트 + 수동 필터.

발행된 `40.task/**` 는 rewrite 금지 (RULE-01). 본 규약은 차기 발행부터.
