# 종류가 다른 중첩 목록은 중첩된다 (바깥 목록을 쪼개지 않는다)

> **위치**: `src/common/markdownParser.ts` 의 `bindListItem` (보조: `:860` 정의 · `:396` ul 호출 · `:446` ol 호출 · `:863` `depthStack` · `:918` `isListNode` · `flushAll()` 4곳)
> **관련 요구사항**: REQ-20260831-069 FR-01~FR-05 · NFR-01~NFR-03
> **최종 업데이트**: 2026-08-31 (by inspector 253차 tick — 최초 박제)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷이다.

## 역할

깊게 들여쓴 목록 마커는 **종류가 달라도** 바깥 항목 안에 중첩된다. 바깥 목록은 하나로 유지되며 번호는 되감기지 않는다.

**의도적으로 하지 않는 것**:

- 3단계 이상 교대 중첩(`ul > ol > ul`)의 기대 산출을 정하지 않는다 — 2단계 계약이 착지한 뒤의 별 축이다.
- loose/tight list 구분, 체크박스(`- [ ]`, GFM 확장) 는 범위 밖이다.
- 들여쓰지 않은 이어짐은 `markdown-list-item-continuation` 소유, 인용 안 블록 문법은 `markdown-blockquote-block-recursion` 소유다. 세 축은 같은 `flushAll()` 에서 손상이 드러나지만 **트리거가 다르다** (다른 종류 마커 줄 / 마커 없는 줄 / 인용 패스의 값 노드 확정).
- `<li>` 본문 앞 한 칸 공백은 `markdown-list-item-content-start` 소유다. 아래 baseline 표의 `<li> ` 표기는 **현 산출의 전사이지 이 계약이 정한 것이 아니다**.

## 배경 — 무엇이 깨져 있는가

`bindListItem` 은 **종류마다 따로 한 번씩** 돈다 (`:396` `ul` · `:446` `ol`). 그 안에서 `:918` 의 `const isListNode = node.itemOf === tagName;` 가 소속을 판정하므로, `ul` 패스가 도는 동안 `itemOf: "ol"` 노드는 **비-list 노드**다. 그래서 `// Non-list node terminates any open lists.` / `flushAll();` 에 걸려 열린 `<ul>` 이 닫힌다. 중첩 깊이 스택(`depthStack`, `:863`)은 한 종류 안에서만 유지되므로 종류가 바뀌는 순간 무의미해진다. 반대 방향도 대칭이다.

**중첩 기계 자체는 있고 동작한다** — 같은 종류 중첩은 정상이다. 깨지는 것은 종류가 바뀔 때뿐이며, 이것이 이 축의 범위를 좁히는 근거다.

## 공개 인터페이스

- 변경 없음. `markdownToHtml(rawInput: string): string` 의 시그니처는 그대로이며 계약면은 **산출 HTML** 이다.
- `bindListItem(parsed, tagName)` 은 module-private 이다 — 호출 구조(종류별 1회씩)를 바꾸는 것도, 한 번에 도는 것으로 바꾸는 것도 구현 자유다. 계약은 산출만 잰다.

## 동작

1. **(I1) 종류가 달라도 중첩된다**: 바깥 항목보다 깊게 들여쓴 목록 마커는 종류와 무관하게 그 항목 **안에** 중첩된다. `ul > ol` 과 `ol > ul` 양방향이 성립한다 (FR-01·FR-03).
2. **(I2) 바깥 목록은 하나다**: 중첩이 일어나도 바깥 목록의 여는 태그 개수는 **1** 이다. 번호 목록이 바깥이면 `<ol>` 이 1개이고 번호는 되감기지 않는다 (FR-02).
3. **(I3) 같은 종류 중첩은 불변이다 (대조)**: `- 하나\n  - 안쪽\n- 둘` · `1. 하나\n   1. 안쪽\n2. 둘` 의 산출이 바뀌지 않는다 (FR-04). **이것이 이 축의 핵심 대조다** — 종류 판정을 통째로 없애는 구현은 (I1)(I2) 를 만족시키면서 이 축을 깬다.
4. **(I4) 모순 fixture 인계**: 혼합 중첩이 일어나지 **않는 것**을 단언하던 회귀 fixture 는 본 계약과 동시에 참일 수 없다. 그 fixture 는 남지 않는다 (FR-05).

### 두 축을 나눠 재는 이유 (설계 지점)

**중첩 여부만 재는 게이트는 번호가 틀린 채 초록이 될 수 있다.** `<li>` 안에 `<ol>` 이 들어갔는지만 보면, 바깥 `<ul>` 이 셋으로 쪼개진 산출도 "중첩됨" 으로 읽힌다. 반대로 개수만 재면 중첩 없이 한 덩어리로 뭉갠 구현이 통과한다. 그래서 (I1) 과 (I2) 를 **분리해 세우고 접속에서 함께 닫는다**.

## 의존성

- 내부: `src/common/markdownParser.ts` (단일 대상) · `src/common/markdownParser.test.ts` (게이트).
- 외부: 없음 (순수 함수).
- **역의존 (사용처) — 열거하지 않고 도출한다**: `bash -c 'grep -rn "markdownToHtml(" src --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "common/markdownParser\.ts"'` → HEAD=`8d030ce` 실측 **4 hit**. 그중 실제 호출 3건은 `src/Log/Writer.tsx:224` (작성 미리보기) · `src/Log/LogItem.tsx:94` (본문 렌더, `sanitizeHtml` 경유) · `src/Log/api.ts:79` (요약 `trimmedContents`). 나머지 1건 `src/Log/__fixtures__/logs.ts:5` 는 **fixture 본문 안의 글자열이지 호출이 아니다**. **Comment 는 이 파서를 쓰지 않는다** — `bash -c '! grep -rq "markdownToHtml" src/Comment'` → rc=0 (0 hit). 사용처를 산문으로 적으면 틀린다: 실제로 다른 spec 이 `Comment 본문` 을 사용처로 적고 승격됐고 판정 명령 10건은 전부 rc=0 이었다.
- 직교: `common/markdownParser` (승격 상태와 무관하게 같은 계약이므로 `30.spec/{blue,green}/` 접두를 붙이지 않는다 — 253차에 그 접두 때문에 배경 명령 1건이 파일 부재로 조용히 `0` 을 내는 drift 가 실제로 있었다) — `bindListItem` 의 same-type 중첩 알고리즘. **본 계약은 그 알고리즘이 "범위 밖·미정의" 로 비워 둔 자리를 정의한다** (§참고 §계약 인계).
- 소비: 산출 태그 `ul`·`ol`·`li` 는 `ALLOWED_TAGS` 에 이미 있어 sanitize 변경을 요구하지 않는다.

## 회귀 중점

- **종류 판정을 없애는 방향은 (I3) 을 깬다.** `isListNode` 를 항상 참으로 만들면 혼합 중첩은 붙지만 같은 종류 중첩의 그룹 경계가 무너진다. (I1) 게이트에는 초록으로 보인다.
- **중첩만 만들고 바깥을 닫는 방향은 (I2) 를 깬다.** `<li>` 안에 자식 목록을 넣으면서도 `flushAll()` 호출을 남겨 두면 바깥이 여전히 쪼개진다 — 독자는 번호를 두 번 본다.
- **fixture 를 지우기만 하는 방향은 (I1)(I2) 를 만족시키지 못한다.** (I4) 는 인계를 재는 것이지 그 자체가 목표가 아니며, 접속이 (I1)(I2) 와 함께 닫는 이유가 이것이다.
- **`ul > ol` 만 고치고 `ol > ul` 을 두는 방향은 (I1) 을 반쪽만 만족시킨다.** 피해가 눈에 보이는 쪽은 바깥이 `ol` 일 때(번호 되감김)이지만, 표기 빈도가 높은 쪽은 `- 준비` 아래 번호 단계다.

## 테스트 현황

- [ ] (I1 혼합 중첩) 계약이 게이트로 실재하고 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "종류가 달라도 깊게 들여쓴 목록은 중첩된다" "$f" && npx vitest run "$f" -t "종류가 달라도 깊게 들여쓴 목록은 중첩된다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`8d030ce` 본 tick 실측 **rc=1 (미충족)**. 계약 이름 0 hit.
- [ ] (I2 바깥 목록 개수) 번호 연속성 게이트가 실재한다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "종류가 바뀌어도 바깥 목록은 하나다" "$f"'` → HEAD=`8d030ce` 실측 **rc=1 (0 hit)**. **이 명령은 게이트의 실재만 잰다** — 개수 판정 자체는 그 게이트 본문과 아래 (접속) 이 닫는다.
- [ ] (I4 모순 fixture 인계) 혼합 중첩을 금지하던 fixture 가 남아 있지 않다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; ! grep -qF "does NOT nest ol child inside ul parent" "$f"'` → HEAD=`25f6013` 재실측 **rc=1 (fixture 실재, `:257`)**. 이 fixture 는 `result.not.toMatch(/<li>[^<]*<ol>/)` 로 **중첩이 일어나지 않는 것**을 단언하므로 (I1) 과 동시에 참일 수 없다.
- [ ] (I1·I2·I3·I4 접속) 네 축이 **동시에** 성립하고 파서 스위트가 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "종류가 달라도 깊게 들여쓴 목록은 중첩된다" "$f" && grep -qF "종류가 바뀌어도 바깥 목록은 하나다" "$f" && grep -qF "treats two leading spaces as equivalent to one tab for UL nesting" "$f" && grep -qF "nests a tab-indented OL child inside the parent <li>" "$f" && ! grep -qF "does NOT nest ol child inside ul parent" "$f" && npx vitest run "$f" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`8d030ce` 실측 **rc=1 (계약 이름 0 hit 으로 탈락)**. **접속으로 닫는 이유**: `-t` 는 이름 미매치 시 단독으로 rc=0 을 내고, 개별 항은 서로의 공허 통과를 막지 못한다. 같은 종류 대조 2건을 접속에 **함께** 넣은 것이 요점이다 — 종류 판정을 없애는 과잉은 (I1)(I2) 쪽만 보면 초록이다.
- [x] (I3 같은 종류 대조 현행 PASS) 같은 종류 중첩 게이트가 실재하고 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "treats two leading spaces as equivalent to one tab for UL nesting" "$f" && grep -qF "nests a tab-indented OL child inside the parent <li>" "$f" && npx vitest run "$f" -t "treats two leading spaces as equivalent to one tab for UL nesting" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`8d030ce` 실측 rc=0. **구현 후에도 rc=0 이어야 한다** — 이 대조가 (I1) 확장의 과잉 방향을 잡는 유일한 채널이며, 지우거나 완화하는 방식의 해결은 불가하다. 소유 계약은 `markdownParser` (I2)~(I5) 이고 본 항목은 그 게이트의 **실재와 초록**만 잰다 (동작 명제를 다시 세우지 않는다 — 게이트 사본 방지).
- [x] (NFR-03 비퇴행 baseline) 파서 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`25f6013` 재실측 rc=0 (**155 tests**). 구현 후에도 rc=0 — **기존 게이트를 완화하는 방식의 해결은 불가**하다. 단 (I4) 가 지목한 fixture 1건은 인계 대상이며 그 교체는 완화가 아니다.

## 수용 기준

- [ ] (Must, FR-01·FR-03) 위 §테스트 현황 (I1 혼합 중첩) 명령 → rc=0.
- [ ] (Must, FR-02) 위 §테스트 현황 (I2 바깥 목록 개수) 명령 → rc=0.
- [ ] (Must, FR-05) 위 §테스트 현황 (I4 모순 fixture 인계) 명령 → rc=0.
- [ ] (Must, FR-01~FR-05 접속) 위 §테스트 현황 (I1·I2·I3·I4 접속) 명령 → rc=0.
- [x] (Must, FR-04 같은 종류 대조) 위 §테스트 현황 (I3 같은 종류 대조 현행 PASS) 명령 → rc=0. HEAD=`8d030ce` 실측 rc=0. 구현 후에도 rc=0 — **이 대조를 지우거나 완화하는 방식의 해결은 불가**하다.
- [x] (Must, NFR-03 비퇴행) 위 §테스트 현황 (NFR-03 비퇴행 baseline) 명령 → rc=0. HEAD=`25f6013` 재실측 rc=0 (155 tests).
- [x] (Must, 범위 제한) 3단계 이상 교대 중첩 · loose/tight · 체크박스 · `<li>` 선행 공백 · 들여쓰지 않은 이어짐 · 인용 안 블록 문법은 본 계약의 요구 대상이 아니다 — §역할 · §참고 §미측정.

## 스코프 규칙

- **expansion**: 불허 — 대상은 `src/common/markdownParser.ts` 와 `src/common/markdownParser.test.ts` 2 파일이다. 게이트 위반이 이 밖에서 나오면 격리 대상이다.
- **grep-baseline** (HEAD=`8d030ce`, `git archive` 격리 사본 실측):
  - `grep -cF "종류가 달라도 깊게 들여쓴 목록은 중첩된다" src/common/markdownParser.test.ts` → **0** (신설 대상). `grep -cF "종류가 바뀌어도 바깥 목록은 하나다" …` → **0**.
  - `grep -cF "does NOT nest ol child inside ul parent" src/common/markdownParser.test.ts` → **1** (`:257`). **인계 대상이며 삭제가 아니라 교체다** — 그 fixture 가 지키던 명제(같은 종류 그룹 경계가 무너지지 않는다)는 (I3) 대조가 이어받는다.
  - `grep -cF "treats two leading spaces as equivalent to one tab for UL nesting" src/common/markdownParser.test.ts` → **1** · `grep -cF "nests a tab-indented OL child inside the parent <li>" …` → **1**. 두 건이 (I3) 대조의 실물이며 소유 계약은 `markdownParser` 다.
  - `grep -cE "isListNode" src/common/markdownParser.ts` → **4** (`:918` 정의 + 사용 3). `grep -cE "flushAll\(\)" src/common/markdownParser.ts` → **4**.
- **현 산출 (격리 사본 실측 — repo 트리 무변경)**. 왼쪽이 결함이고 오른쪽이 계약이다:

| 입력 | 현 산출 (결함) | 바깥 목록 수 | 계약 |
|---|---|---|---|
| `- 준비\n  1. 설치\n  2. 설정\n- 실행` | `<ul><li>준비</li></ul><ol><li>설치</li><li>설정</li></ol><ul><li>실행</li></ul>` | `<ul>` **2** | `<ul>` 1 · `<ol>` 이 첫 항목 안 |
| `1. 준비\n   - 설치\n   - 설정\n2. 실행` | `<ol><li>준비</li></ol><ul><li>설치</li><li>설정</li></ul><ol><li>실행</li></ol>` | `<ol>` **2** | `<ol>` 1 · `<ul>` 이 첫 항목 안 |
| `- a\n\t1. b` (현 fixture 입력) | `<ul><li>a</li></ul><ol><li>b</li></ol>` | `<ul>` 1 · `<ol>` 1 (형제) | `<ul>` 1 · `<ol>` 이 `<li>` 안 |
| `- 하나\n  - 안쪽\n- 둘` (대조) | `<ul><li>하나<ul><li>안쪽</li></ul></li><li>둘</li></ul>` | `<ul>` 2 (중첩) | **무변경** |
| `1. 하나\n   1. 안쪽\n2. 둘` (대조) | `<ol><li>하나<ol><li>안쪽</li></ol></li><li>둘</li></ol>` | `<ol>` 2 (중첩) | **무변경** |

  - **계수 단위 주의**: 판정면은 **바깥** 목록의 여는 태그 개수다. 대조 2행은 중첩 때문에 같은 태그가 2개이므로, 전체 개수를 세는 게이트는 결함 행과 대조 행을 구분하지 못한다. 게이트는 중첩 구조(`<li>` 안쪽)와 바깥 개수를 **함께** 단언해야 한다.
- **rationale**: 계약 이름 2건이 0 hit 이고 인계 대상 fixture 가 1 hit 으로 확정돼 baseline 은 열거로 닫힌다. 결함 3행과 대조 2행을 같은 표에 둔 이유는, 이 축의 실패가 "중첩이 안 된다" 가 아니라 **"중첩시키면서 바깥을 쪼갠다"** 또는 **"종류 판정을 없애 같은 종류까지 뭉갠다"** 쪽이기 때문이다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector 253차 tick (Phase 3, REQ-20260831-069 흡수) / pending @ HEAD=`8d030ce` | 최초 박제 — 혼합 종류 중첩 목록 4 축 (I1~I4). **신규 spec 으로 세운 근거**: `markdownParser.md:74` 가 이 자리를 *"본 알고리즘 범위 밖 — 동작 미정의 (별 spec 후보)"* 로 **명시적으로 비워 두었다**. 재개봉해 그 spec 을 넓히는 것이 아니라, 그 spec 이 예고한 별 계약을 세우는 것이 문면대로다. **(I2) 를 (I1) 과 분리해 세운 것이 이 흡수의 판단이다** — 중첩 여부만 재는 게이트는 바깥 목록이 쪼개진 채로도 초록이고, 독자가 실제로 겪는 피해(번호 되감김)는 그 축에 있다. **(I4) 인계 축을 세운 것이 두 번째 판단이다**: 현 fixture(`:211`)가 중첩 부재를 단언하므로 조용히 양립시키면 승격된 두 계약이 서로를 부정한다 (REQ-069 FR-05). baseline: 계약 이름 2건 0 hit · 인계 fixture 1 hit · 같은 종류 대조 2 hit · 결함 3행/대조 2행 격리 사본 실측 · 파서 스위트 150 tests. unchecked 4 · checked 3. | all |

## 참고

### 계약 인계 — `markdownParser.md` (판정과 그 근거)

REQ-069 FR-05 는 *"두 계약이 동시에 참일 수 없으니 인계를 명시하라"* 고 요구한다. **본 tick 의 판정: `markdownParser.md` 를 blue→green 으로 재개봉해 (I6) 문면을 same-type 한정으로 좁힌다.** 근거는 셋이다.

1. **선언만으로는 닫히지 않는다.** blue 는 세 자리에서 혼합 중첩 부재를 잠근다 — `:31` (I6) 동작 명제 · `:87` §테스트 현황 `[x]` · `:98` §수용 기준 (범위 제한) · `:114` §스코프 규칙 grep-baseline. 본 계약이 착지하는 순간 이 네 자리가 전부 거짓이 되며, developer 는 스코프 밖 문서를 고칠 수 없어 task 를 격리한다. `TSK-20260831-05-a` 가 정확히 그 지점에서 멈췄다.
2. **재개봉 비용을 실측했다** (tick 252 가 continuation 에 적용한 것과 같은 기준). `markdownParser.md` 는 **152줄** · §수용 기준 **10/10 `[x]`** 이고, 판정 명령 6건을 격리 사본에서 전수 재실행해 **rc≠0 은 1건**이다. rc=2 무판정 rot 은 없다 — 즉 재개봉이 다른 축의 미해결 부채를 함께 떠안지 않는다.
3. **그 rc≠0 1건은 재개봉하지 않으면 고칠 사람이 없다.** (I1) 의 `test "$(grep -cE "bindListItem" src/common/markdownParser.ts)" -eq 3` 은 HEAD=`8d030ce` 에서 **5** 를 세어 rc=1 이다 — `TSK-20260831-15` 가 `:126`·`:288` 에 **주석으로** `bindListItem` 을 언급하면서 늘었다. 호출 3건(정의 `:856` · ul `:396` · ol `:442`)은 그대로다. **정합은 유지되는데 게이트만 거짓이며, 그 거짓이 승격된 `[x]` 아래에 있었다.** 주석을 제외하지 않는 계수기의 전형적 실패다.

> 재개봉은 이 tick 에서 함께 수행했다. 그 문서의 변경은 그쪽 §변경 이력 에 있다.

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- **3단계 이상 교대 중첩**(`- a\n  1. b\n    - c`)의 기대 산출은 정하지 않는다. 2단계 계약이 착지한 뒤 실측해 별 축으로 세운다. 지금 정하면 구현이 아직 없는 상태에서 기대값을 발명하게 된다.
- **loose/tight list** (항목 사이 빈 줄에 따른 `<p>` 감쌈)는 어느 계약도 소유하지 않는다.
- **`<li>` 본문 앞 한 칸 공백**은 `markdown-list-item-content-start` 소유이며 **본 tick 안에 착지했다** (`TSK-20260831-18` / `f7d78f0`). 위 baseline 표는 착지 후 산출로 재도출했다 — 초안은 `<li> 설치` 였고 지금은 `<li>설치` 다. **spec 이 인접 계약의 미착지 산출을 baseline 에 적으면 그 계약이 착지하는 순간 낡으며, 그 낡음은 계수·존재 판정 게이트에 보이지 않는다.**
- **성능** (중첩 깊이에 따른 파싱 시간)은 측정 채널이 없다.

### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. **검출 방향 4 · 음성 대조 3 이며 이관처 task 는 아직 발행되지 않았다** — 발행 전까지 이 절이 그 박제다 (`RULE-07` 은 이관처 없는 강등을 금지하므로, 이관처가 발행되지 않은 채 승격이 시도되면 그 사실이 여기서 보여야 한다).

- **Dir-1 (민감도, 구조 축 — `ul > ol`)**: 중첩을 되돌려 `- 준비\n  1. 설치` 가 형제 목록을 내게 한다 → `rc≠0`.
- **Dir-2 (민감도, 구조 축 — `ol > ul`)**: 반대 방향만 되돌린다 → `rc≠0`. **한 방향만 주입하면 대칭 회귀가 통과한다** (REQ-069 FR-03).
- **Dir-3 (민감도, 번호 축)**: 중첩은 유지한 채 바깥 목록을 쪼갠다(`flushAll()` 호출 복원) → `rc≠0`. **구조 축과 별개로 주입하라는 것이 REQ-069 NFR-01 이며, 이 방향이 (I2) 를 (I1) 에서 분리한 존재 이유다.**
- **Dir-4 (민감도, 인계 축)**: `does NOT nest ol child inside ul parent` fixture 를 되살린다 → `rc≠0`.
- **Ctrl-1 (특이도, 같은 종류 `ul`)**: `- 하나\n  - 안쪽\n- 둘` 산출을 건드리지 않는 정상 변경 → `rc=0`.
- **Ctrl-2 (특이도, 같은 종류 `ol`)**: `1. 하나\n   1. 안쪽\n2. 둘` 산출 무변경 → `rc=0`.
- **Ctrl-3 (특이도, 범위 밖 축)**: `<li>` 선행 공백 표기를 바꾸는 변경(본 계약이 §역할 에서 범위 밖으로 선언한 축) → `rc=0`. **이 방향은 가설이 아니라 실제로 일어났다** — `TSK-20260831-18` 이 본 tick 안에 그 표기를 바꿨고 baseline 표를 재도출해야 했다.

### 관련

- **원 req**: `specs/60.done/2026/08/31/req/20260831-mixed-type-nested-list-structure.md` (REQ-20260831-069). 출처: 운영자 결함 신고 `20260831-0910-block-structure-does-not-recurse.md` 축 A.
- **형제 계약**: `markdown-list-item-continuation` (REQ-068, 착지 완료) · `markdown-blockquote-block-recursion` (REQ-070, 본 tick 흡수). 신고서는 세 축의 공통 뿌리를 *"블록 파싱이 최상위에서 한 번만 돌고 중첩된 내용에 재귀하지 않는 것"* 으로 진단했으나, **discovery 가 나눠 등록했고 본 tick 도 나눈 채 흡수했다** — 손상 표면과 대조 축이 다르고 독립 carve 가 가능하기 때문이다.
- **외부 근거**: CommonMark 0.31.2 §5.2 *List items* — 자식 블록은 marker width 만큼 들여쓰이면 항목의 내용이 되며, 그 블록이 다른 종류의 목록이어도 마찬가지다.
