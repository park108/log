# RULE-06 Task 스코프 & grep 게이트

작업지시서 `## 검증/DoD` 에 `grep -rn <pattern> <path> → 0 lines` 형태 게이트가 1건 이상이면 **`## 스코프 규칙` 섹션 필수**. 없으면 생략 가능.

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
- **허용**: baseline 열거 scope 밖 파일도 게이트 충족 목적으로 정상화 가능.
- **불허**: scope 밖 변경 금지. 게이트 위반 파일이 scope 밖이면 developer 는 즉시 `50.blocked/task/` 격리.
- **N/A**: grep 게이트 없음.

## 역할
- **planner / inspector**: 작성 시점에 `grep-baseline` 실제 실행 결과 박제.
- **developer**: 수행 전 섹션 읽고 `expansion` 에 따라 행동. 섹션 부재면 `## 변경 범위` 만 준수.

## 정밀 패턴 권고
- **afterEach 등록 잔존 검증**: `afterEach\s*\([^)]*<fn>\s*\(\s*\)` 형태 **등록 한정 패턴** 사용. `it` 본문 직렬 호출 오인 방지. 예: `rg -nE "afterEach\s*\([^)]*vi\.useRealTimers\s*\(\s*\)" src --glob="*.test.{js,jsx}"`. 멀티라인은 `rg --multiline -U` 또는 `-A 3` 컨텍스트 + 수동 필터.
- **블록 경계 false-positive**: `[\s\S]*?` 는 경계 미존중 — 인접 `afterAll {...}` 까지 매치. 블록 내부 한정은 `[^{}]*?`, nested 허용 시 `(?:[^{}]|\{[^{}]*\})*?`. 검증: block 1 에서 1 hit, 인접 block 2 동일 token 미매치.
- **관측 표면**: 게이트는 production 이 소비하는 표면(빌드 산출물 · 등록된 chain · 실제 로드 경로)을 측정한다. 단위 격리 import 만으로 등록·연결을 단정하지 않는다 — 함수는 살아 있는데 plugins chain 에서 빠진 회귀가 그렇게 통과했다.
- **열거 고정 금지**: 측정 대상 목록은 glob/디렉터리 열거로 산출한다. 하드코딩이 불가피하면 목록 완전성 보조 단언을 함께 박제한다 — 하드코딩된 5개 스크립트 목록이 이후 추가된 6개를 스캔 범위 밖에 숨겼다.
- **fixture 대표성**: fixture 는 실코드의 표기 변형(들여쓰기 · 컬럼 위치)을 최소 1개 포함한다 — 들여쓰기 fixture 만 있어 greedy `\s*` 가 후속 매치를 삼키는 것이 관측되지 않았다.
- **grep-count**: `grep -c` 는 구조 인식 불가. `grep -cE "^[[:space:]]*<token>\s*\("` 로 본문 호출 한정 + baseline 에 제외 규칙·수치·샘플 라인 박제.

## 체크리스트 (planner / inspector)
baseline 실제 실행·수치 복사 / multiline 은 block boundary fixture 통과 / count 는 import·주석 제외 계산법 명시.

**fixture probe 경로 사전 점검** — 신규 fixture·probe 파일 경로를 baseline 에 박제하기 전 `grep -nE "^<path-prefix>" .gitignore` → **0 hit** 확인. hit 이 있으면 그 경로의 산출물은 커밋되지 않고 조용히 휘발하며, grep 게이트는 파일 부재를 위반이 아니라 통과로 읽는다 (false-negative).

## 게이트 실효 검증 (injection)

게이트(grep 게이트 · `check:*` script · fixture)를 **신설·수정하는 task** 는 아래를 DoD 항목으로 명기한다.

> spec 이 선언한 **검출 방향별로** 위반 1건 주입 → `rc≠0` 확인 → 원복 → `rc=0` 확인. 방향별 주입 명령과 출력을 `result.md` 에 박제한다.

- **방향 수는 spec 의 검출 선언에서 계수한다.** "양방향 검출" 을 선언했으면 2방향 전부 주입한다.
- `RULE-04` notes 에 `injection: N/N detect` 박제.
- 게이트 신설·수정 task 한정 — 일반 task 에는 적용하지 않는다.

> `grep dry-run` 은 **특이도**(정상 상태에서 오탐하지 않음)만 검증하고, 주입은 **민감도**(위반을 실제로 잡음)를 검증한다. 둘은 독립이다. 민감도 0 인 게이트도 정상 트리에서는 기대 hit 수와 정확히 일치해 dry-run·Phase 1 재실행·developer 검증을 전부 `rc=0` 으로 통과한다. 2026-08-24 실측 — 그렇게 통과한 검출력 0 게이트가 5건이었고, 그중 `check-deps-coherence.sh` 는 `npm ls` 의 `UNMET DEPENDENCY` 라인을 설치된 것으로 계수해 **잡으라는 drift 만 구조적으로 못 보는** 상태였다.

발행된 `40.task/**` 는 rewrite 금지 (RULE-01). 본 규약은 차기 발행부터.
<!-- 2026-04-21: 블록 경계 false-positive + grep-count + 체크리스트 (REQ-20260421-013) -->