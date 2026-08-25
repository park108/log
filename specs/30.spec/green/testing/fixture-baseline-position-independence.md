# fixture baseline 은 위치가 아니라 내용으로 대상을 지목한다

> **위치**: `src/__tests__/**` 의 자체 진단 baseline. 현 유일 대상 `src/__tests__/root-config-spec-reference-coherence.test.ts` (`EXPECTED_GA_SELF_DIAG_COUNT` · `EXPECTED_GA_SELF_DIAG_HITS`). 결합 상대는 `scripts/check-spec-coherence.sh` · `.husky/pre-commit`.
> **관련 요구사항**: REQ-20260825-011 (fixture-baseline-position-independence)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 221 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

게이트 fixture 가 측정 대상을 지목할 때 쓰는 식별자는 **위치가 아니라 내용**이다. 대상 파일에 위치만 바꾸는 편집(주석 추가·행 이동·재배열)을 가해도 판정은 바뀌지 않으며, 대상 라인이 **사라지거나 늘어나면** 판정이 바뀐다.

**방어 대상 (RULE-07 §주제 우선순위 — 명시 요건).** 이 계약이 막는 것은 silent regression 이 아니라 그 반대 방향의 결함, **false-red 와 그로 인한 task 스코프 오염**이다. 기존 자동 게이트는 이 결함을 검출할 수 없다 — fixture 는 정확히 "설계대로" red 를 내고 있고, 잘못된 것은 red 의 조건이지 red 의 발생이 아니기 때문이다. `npm test` · `tsc` · `eslint` · `check:*` 어느 것도 "이 baseline 이 불변식의 일부를 재고 있는가, 우연한 배치를 재고 있는가" 를 묻지 않는다.

**비용이 이미 두 번 실현됐다.**

1. **task 격리** — `TSK-20260825-07` (`check:spec-coherence` 스코프 확장) 이 이 결합 때문에 착지하지 못하고 `50.blocked/task/` 로 격리됐다. 그 task 의 `## 스코프 규칙` 은 `expansion: 불허` + 스크립트 1 파일이었고 fixture 는 그 스코프 밖이다. `TSK-20260825-08` 로 재발행되며 결합이 1개가 아니라 3개임이 드러났다.
2. **baseline 재박제** — followup 작성 시점 baseline 은 `COUNT = 6` · 라인 `19`·`62` 였다. HEAD=`6f58541` 은 `COUNT = 7` · 라인 `49`·`201`·`202` 다. 스크립트 내용이 바뀌자 **baseline 을 다시 박아야 했다.**

**검출력은 거의 더해지지 않는다.** 측정하려는 불변식은 "자체 진단 라인을 제외하면 `-spec` 토큰이 0 hit" 이다. 같은 내용이 다른 줄로 옮겨가는 것은 그 불변식의 위반이 아니다. 따라서 행 번호 박제는 회귀 검출력을 거의 더하지 않으면서 편집 결합만 만든다 — 비용은 있고 편익은 없는 baseline 이다.

의도적으로 하지 않는 것:
- (i) 측정 대상 불변식 자체("exclude 후 0 hit")의 변경 — **그대로 유지한다.** 본 계약은 지목 **방식**만 규정한다.
- (ii) 수치만 박은 baseline(`EXPECTED_GB_PATH_COUNT` 등)의 변경 — 위치 결합을 만들지 않으므로 대상이 아니다.
- (iii) `scripts/check-spec-coherence.sh` 의 동작 변경.
- (iv) 지목 **수단** 선택 — `{relPath, token}` 전환 · 개수 하한 완화 · 정렬된 내용 집합 비교 중 무엇이든 효능이 충족되면 된다. planner·developer 영역이다.

## 공개 인터페이스

없음 (fixture 설계 계약). 측정 채널:

- **(M-A) 행 번호 baseline 열거** — `src/__tests__/**` 에서 `line: <숫자>` 형태로 대상을 지목하는 항목 수.
  ```
  grep -rcE "(^|[^A-Za-z])line:[[:space:]]*[0-9]+" src --include="*.test.ts" --include="*.test.tsx" | grep -v ":0$"
  ```
  HEAD=`6f58541` 실측 **1 파일 / 7 항목** — `root-config-spec-reference-coherence.test.ts`. 트리 전체에서 유일하다.

  > **패턴에 단어 경계가 필요하다 (tick 221 실측 교정).** req 원안의 `grep -cE "line:[[:space:]]*[0-9]+"` 는 같은 파일에서 **9** 를 낸다 — `:15`·`:17` 의 한글 주석 `baseline: 3 MISSING` · `baseline: 3 STALE` 이 `…line: 3` 으로 매치하기 때문이다. 그 형태를 수용 기준에 두면 "0 으로 만들라" 는 요구가 **무관한 주석의 재작성까지 강요**하고, 반대로 구현자가 주석만 손봐도 수치가 내려가 진척으로 오독된다. 앞자리에 영문자가 오지 않는 `line:` 만 센다.

## 동작

1. **(P-1) 위치 비종속 지목** — fixture baseline 은 대상 라인을 행 번호로 지목하지 않는다. 지목은 파일 경로 + 라인 내용 토큰 등 **위치 비종속 식별자**로 한다.
   - **HEAD 실측: 위반.** `EXPECTED_GA_SELF_DIAG_HITS` 7 항목이 `{ relPath, line }` 쌍이며, 비교도 `` `${h.relPath}:${h.line}` `` 문자열 집합으로 이뤄진다.
2. **(P-2) 위치 편집에 대한 둔감** — 대상 파일에 주석 추가·행 이동·재배열을 가해도 fixture 판정이 바뀌지 않는다.
   - 이것이 (P-1) 의 관측 가능한 귀결이며, 결합 실현 2건이 모두 이 성질의 부재로 발생했다.
3. **(P-3) 내용 변화에 대한 민감 보존** — 자체 진단 라인이 사라지거나 늘어나면 fixture 가 red 가 된다. **위치 둔감이 내용 둔감으로 번지지 않는다.**
   - 이 항목이 (P-1) 의 오답 방향을 차단한다. 가장 쉬운 "해결" 은 baseline 을 통째로 지우는 것이고 그러면 (P-1)(P-2) 는 즉시 충족되면서 검출력이 0 이 된다.
4. **(P-4) hard 조건의 보존** — "exclude 후 `-spec` 토큰 0 hit" 단언은 유일한 hard 조건으로 남는다. baseline 형태 변경이 이 단언을 약화시키지 않는다.
5. **(P-5) 스코프 폐쇄** — 게이트 스크립트를 수정하는 task 가 fixture 를 함께 수정하지 않고도 착지 가능하다. 즉 스크립트 편집의 스코프가 1 파일로 닫힌다.
   - `RULE-06 §스코프 규칙` 과의 접점이다. 결합이 남아 있는 한 `expansion: 불허` task 는 구조적으로 격리되며, 그 격리는 developer 의 판단 착오가 아니라 **규약의 정상 동작**이다.

## 의존성

- 내부: `src/__tests__/root-config-spec-reference-coherence.test.ts` (계약 대상), `scripts/check-spec-coherence.sh` · `.husky/pre-commit` (baseline 이 지목하는 결합 상대).
- 외부: `vitest` 수집 경로 (`npm test`).
- 직교 spec: `spec-reference-coherence` (foundation, slug 식별) — **무엇을 측정하는가**의 축. 본 계약은 **어떻게 지목하는가**의 축이라 직교한다. 두 축이 같은 fixture 파일을 공유하므로 변경 시 순서 의존이 생긴다 (§참고).

## 회귀 중점

1. (R-1) 신규 fixture 가 같은 형태로 행 번호를 박음 — (M-A) 가 트리 전체를 훑으므로 신규 파일도 자동 포함된다.
2. (R-2) **baseline 삭제로의 오회복** — (P-1)(P-2) 만 보면 통째로 지우는 것이 최단 경로다. (P-3) 이 유일한 방어다.
3. (R-3) 다른 표기로의 이동 — 배열 튜플 `["file", 12]` · 문자열 `"file:12"` 등. 현 트리에 사례가 없어 (M-A) 가 아직 겨누지 않는다 (§미측정·비판정 항목).
4. (R-4) 패턴 과잉으로 인한 무관 편집 유발 — 단어 경계 없는 `line:` 패턴이 `baseline: 3` 을 잡는 부류. §공개 인터페이스 (M-A) 가 경계를 고정한다.

## 발화 채널

**HEAD=`6f58541` 에 이 축의 발화 채널이 없다.** baseline 형태를 판정하는 게이트는 없으며, `check:*` 15종 중 fixture 설계를 재는 것은 0 이다.

| 게이트 | HEAD 채널 | 상태 |
|---|---|---|
| P-1 (형태) | 없음 | **부착 필요** — (M-A) grep 을 게이트로 등재 |
| P-2 (위치 둔감) | 없음 | **부착 필요** — 주입 방향 (Dir-1) |
| P-3 (내용 민감) | `root-config-spec-reference-coherence.test.ts:276` (`toHaveLength(EXPECTED_GA_SELF_DIAG_COUNT)`) | 존재 — 형태 전환 후에도 보존돼야 한다 |
| P-4 (hard 조건) | 같은 파일 `:261` (`exclude 후 match === 0 hit`) | 존재 |

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)

아래 왕복 검증은 **'가정 주입 요구' 부류**이므로 spec 체크박스가 아니라 **본 계약을 구현하는 task 의 `## 검증/DoD`** 로 이관한다. 이관처 task 는 다음 2방향을 DoD 에 명기하고 developer 는 `RULE-04` notes 에 `injection: 2/2 detect` 를 박제한다.

1. **위치 이동 방향** — `scripts/check-spec-coherence.sh` 에 주석 1줄 추가 → fixture **rc=0 유지** → 원복. (현 HEAD 에서는 이 방향이 **rc≠0** 이 되며 그것이 위반의 실물이다.)
2. **내용 소실 방향** — 자체 진단 라인 1개 삭제 → fixture **rc≠0** → 원복 → rc=0. (P-3) 의 직접 검증이며 (R-2) 오회복을 잡는다.

> 두 방향은 **독립이며 반대 부호**다. 한 방향만 검증하면 "전부 통과시키는 fixture" 또는 "전부 red 를 내는 fixture" 가 그 방향을 만족시킨다.

## 테스트 현황

- [x] "exclude 후 0 hit" hard 단언 실재 — `root-config-spec-reference-coherence.test.ts:261`.
- [x] 자체 진단 개수 단언 실재 — `:276` `toHaveLength(EXPECTED_GA_SELF_DIAG_COUNT)`.
- [ ] 위치 비종속 지목 — HEAD **7 항목이 행 번호 박제**. (P-1) 의 부착 대상.
- [ ] 위치 편집 둔감성의 판정 채널 — HEAD 0건. (P-2) 의 부착 대상 (주입 방향으로 이관).

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 측정 명령은 `src/**` · `scripts/**` 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2). **HEAD=`6f58541` 기준 2/4** — (P-3)(P-4) 는 현행 fixture 가 이미 보유하며, 형태 전환 후에도 유지돼야 하는 **보존 항목**이다.

- [ ] (Must, P-1) 행 번호 baseline 소멸 — `bash -c 'test "$(grep -rcE "(^|[^A-Za-z])line:[[:space:]]*[0-9]+" src --include="*.test.ts" --include="*.test.tsx" | grep -v ":0$" | wc -l)" -eq 0'` → **rc=0**. **HEAD 실측 rc=1 / 1 파일 (7 항목) → 미충족.** 단어 경계 없는 패턴을 쓰지 않는 이유는 §공개 인터페이스 (M-A) 참조 — 그 형태는 같은 파일에서 **9** 를 내고 그중 2는 한글 주석의 `baseline: 3` 이다.
- [ ] (Must, P-2/P-5) 전환 후에도 대상 fixture 가 통과 — `bash -c 'npx vitest run src/__tests__/root-config-spec-reference-coherence.test.ts >/dev/null 2>&1 && bash scripts/check-spec-coherence.sh >/dev/null 2>&1'` → rc=0. **HEAD 실측 rc=0 이나 (P-1) 미충족 상태의 통과이므로 단독으로는 판정력이 없다** — 본 항목은 (P-1) 과 **함께** `[x]` 일 때만 의미를 갖는 동반 조건이며, 형태 전환이 fixture 를 깨뜨리지 않았음을 고정한다. 그래서 `[ ]` 로 둔다.
- [x] (Must, P-3) 내용 민감도 보존 — 자체 진단 라인 **개수**를 단언하는 상수 비교가 실재한다: `grep -c "EXPECTED_GA_SELF_DIAG_COUNT" src/__tests__/root-config-spec-reference-coherence.test.ts` → **1 이상**. **HEAD 실측 2 → 충족.** 형태 전환 task 는 이 항목을 `[x]` 로 **유지**해야 한다 — 값이 내려가면 (R-2) 오회복이다.
- [x] (Must, P-4) hard 조건 보존 — "exclude 후 0 hit" 단언이 실재하고 통과한다: `bash -c 'grep -qE "exclude 후 match === 0 hit|exclude 후 잔존" src/__tests__/root-config-spec-reference-coherence.test.ts && npx vitest run src/__tests__/root-config-spec-reference-coherence.test.ts >/dev/null 2>&1'` → rc=0. **HEAD 실측 rc=0 → 충족** (`:261` it 제목 + `:266` 실패 메시지).

## 참고

- **REQ 원문**: `20.req/20260825-fixture-baseline-position-independence.md` (REQ-20260825-011, slug 식별).
- 소비한 followup: `20260825-0940-line-number-pinned-baseline-coupling` (source_task `TSK-20260825-07`, gate-design/high).
- 관련 격리: `TSK-20260825-07` → `50.blocked/task/`, 재발행 `TSK-20260825-08` (`f2bd538` 착지).
- **순서 의존 (중요).** 같은 fixture 파일이 직교 spec `spec-reference-coherence` (foundation) 의 판정 채널이기도 하다. 그 축의 잔여(blue 부재 참조 14 · suffix 11)는 **blue 편집 writer 부재**로 파이프라인 안에서 닫히지 않으므로, 본 계약의 형태 전환을 그 축의 해소 이후로 미루면 영원히 미루게 된다. **본 계약은 선행 조건 없이 착수 가능하다** — 지목 방식만 바꾸고 측정 대상은 건드리지 않기 때문이다.
- 대안 후보 (구현 판단은 planner·developer 영역): (A) `{ relPath, token }` 전환 — 예 `{ relPath: "scripts/check-spec-coherence.sh", token: "check-spec-coherence:" }`. (B) 개수 상수를 하한으로 완화하고 "exclude 후 0 hit" 를 유일 hard 조건으로 남김. **(B) 단독은 (P-3) 을 약화시키므로 (A) 와 병행하거나 개수 단언을 보존해야 한다.**

### 미측정·비판정 항목

- **(가정 주입 요구 — 이관 완료) 위치 이동·내용 소실 2방향 왕복.** §발화 채널 §게이트 실효 검증 이관으로 task DoD 에 이관했다. 이관처 task 가 발행되기 전까지 귀속처는 그 절의 명시적 지시다.
- **(미측정) 다른 표기의 행 번호 박제.** (M-A) 는 TS 객체 리터럴 `line: <숫자>` 표기만 겨냥한다. 배열 튜플·문자열 `"file:12"` 형태로 위치를 박은 baseline 이 있는지는 미측정이며, 현 트리에서 그런 사례는 관측되지 않았다. 표기를 기계적으로 일반화할 수단이 없으므로 하한 1표기로 시작하고 확장은 별 task 로 둔다 (`RULE-06 §열거 고정 금지` 상 이 한정은 **완전성 보조 단언을 함께 두지 못한 상태**임을 자백한다).
- **(NFR-01, 미측정) 2 파일 staged 커밋의 전 게이트 rc=0.** 커밋 시점 staged 집합을 재현하는 채널이 없어 명령 1회로 rc 판정할 수 없다. (P-5) 의 판정은 (P-1)(P-2) 충족으로 대체한다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-011 (inspector tick 221) | 최초 등록. followup 1건을 흡수한 req 를 불변식으로 반영. **req 의 측정 패턴을 교정했다** — 원안 `grep -cE "line:[[:space:]]*[0-9]+"` 는 대상 파일에서 **9** 를 내며 그중 2는 한글 주석의 `baseline: 3 MISSING` · `baseline: 3 STALE` 이 `…line: 3` 으로 걸린 오탐이다 (inspector tick 221 실측). 그 패턴을 수용 기준에 두면 "0 으로 만들라" 가 무관한 주석 재작성을 강요하고, 반대로 주석만 손봐도 수치가 내려가 진척으로 오독된다. 앞자리 영문자를 배제한 `(^|[^A-Za-z])line:` 로 교정해 실측을 **7** 로 확정했다. **req 수용 기준 6항 중 2항은 그대로 쓰지 않았다** — `npm test → rc=0` 은 본 계약의 위반과 무관하게 항상 참일 수 있어 판정력이 없고(자명 명제 부류), `npx vitest … rc=0` + `bash scripts/… rc=0` 은 (P-1) 미충족 상태에서도 통과하므로 **동반 조건**임을 명시해 `[ ]` 로 두었다. **신규 추가 (req 에 없던 항목)**: (a) (P-3) 을 `[x]` **보존 항목**으로 세워 (R-2) "baseline 삭제로의 오회복" 을 차단했다 — (P-1)(P-2) 만 보면 통째로 지우는 것이 최단 경로다. (b) (R-4) 패턴 과잉 회귀 — 위 교정 자체가 회귀 중점이 된다. (c) §참고 순서 의존 — 같은 fixture 를 공유하는 직교 축의 잔여가 blue writer 부재로 닫히지 않으므로 본 계약을 그 뒤로 미루지 말 것을 명시했다. | all |
