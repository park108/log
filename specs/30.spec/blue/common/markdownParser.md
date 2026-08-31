# `src/common/markdownParser.ts` — stack-based grouping 알고리즘 속성 불변식

> **위치**: `src/common/markdownParser.ts` 의 `bindListItem(parsed: ParsedNode[], tagName: string)` 진입점 (`:860`, 호출 `:396`·`:446`) + escape 함수 `escapeHtmlText`(`:7`)·`escapeHtmlQuotes`(`:17`) + `<img>`/`<a>` emit 본문 (`:600-601` · `:639` · `:665-666`).
> **관련 요구사항**: TSK-20260418-10, REQ-20260517-076 FR-03, REQ-20260518-018 (S1 단 escape + cross-surface defense-in-depth), **REQ-20260831-069 FR-05** (혼합 중첩 계약 인계)
> **최종 업데이트**: 2026-08-31 (by inspector 253차 tick — blue→green 재개봉, (I6) 혼합 중첩 인계 + (I1) 계수기 주석 제외 정정, HEAD=`8d030ce`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`25f6013`).

> **본 재개봉(253차)의 성격**: `REQ-20260831-069` 가 이 spec 이 "범위 밖·미정의" 로 비워 둔 자리(`ul ↔ ol` 혼합 중첩)를 정의한다. 두 계약은 동시에 참일 수 없으므로 (I6) 문면을 **same-type 알고리즘 한정**으로 좁히고 혼합 중첩 산출의 소유를 `markdown-mixed-type-nested-list` 로 넘긴다. 함께 (I1) 계수기의 실효 결함 1건을 고쳤다 — 상세는 §참고 §혼합 중첩 계약 인계.
>
> **247차 복사의 성격 (승계)**: blue 문면의 (I8)(I9) 가 **현 HEAD 에서 충족 불가능**했다. 두 게이트는 `escapeHtmlAttr` 이라는 식별자를 요구하는데 그 함수는 더 이상 존재하지 않는다 (`grep -rcE "const escapeHtmlAttr[[:space:]]*=|function escapeHtmlAttr" src/common/markdownParser.ts` → **0**). 이름이 남아 있는 곳은 주석 `:5`·`:15` 뿐이다. inspector 는 blue 를 직접 편집하지 않으므로 (`RULE-01`) blue→green 으로 내려 정정한다. 정정의 근거와 범위는 §참고 §blue 문면 drift 정정 에 있다.

## 역할
markdownParser 의 **same-type nested list grouping 알고리즘 속성** + **S1 단 escape (module-private 정의 + `<img>`/`<a>` emit 의 속성 문맥 호출) cross-surface defense-in-depth** 두 축 박제 — `bindListItem(parsed, tagName)` 가 같은 종류의 중첩 list (예: `ul` 안의 `ul`, `ol` 안의 `ol`) 를 `<li>...<ul>...</ul></li>` 중첩 구조로 재배치하는 stack-based deferred-emit 알고리즘 + escape 함수가 `<img>`/`<a>` emit 시점 attribute value (`url`/`alt`/`title`/`href`) 를 HTML entity 로 변환하여 single-quoted attribute context 탈출 차단 + `<a>` emit 본문 `target='_blank' rel='noreferrer'` fall-back 부여 (sanitize 미경유 raw HTML 주입 경로 보호 — sanitize hook 이 `noopener noreferrer` 로 단조 강화 upgrade 입력 baseline). 의도적으로 하지 않는 것: markdownParser 의 다른 단계 (token 화 / heading / code block 등) 의 알고리즘 박제 (필요 시 별 spec), `<li>` 본문 inline 파싱 (Markdown -> HTML 변환 별 영역), `<ul>` ↔ `<ol>` 혼합 중첩 (현 알고리즘은 same-type 한정), 알고리즘 성능 최적화 (정확성만 박제), `ParsedNode` 타입 본문 (소비자 측 영역), escape 5문자 외 추가 escape (예: `` ` ``, `=`) 도입 결정 (별 task / 정책 변경), escape 함수의 export 노출 결정 (현재 둘 다 module-private), markdownParser 다른 emit (heading / code / list) escape 도입 (별 단계).

## 공개 인터페이스
- `bindListItem(parsed: ParsedNode[], tagName: string): ParsedNode[]` — list line triple 시퀀스를 nested 구조로 재배치.
  - `parsed`: 1차 detection pass 결과. 각 list line 은 `{ <li> open, value, </li> }` triple (모두 `itemOf` + `depth` 태깅) 로 표현.
  - `tagName`: `'ul'` 또는 `'ol'` — 본 호출이 처리할 list 종류.
  - 반환: nested `<li>...<tagName>...</tagName></li>` 구조로 재배치된 `ParsedNode[]`.
- `escapeHtmlText(s: unknown): string` — **module-private** const (`:7`). 표시 텍스트의 `& < >` 를 entity 로 변환. 본문 전체가 이 함수를 지난다.
- `escapeHtmlQuotes(s: unknown): string` — **module-private** const (`:17`). 이미 `& < >` 가 처리된 문자열을 **속성값**에 넣을 때 따옴표(`"` `'`)만 추가로 변환. single-quoted attribute context (markdownParser 의 `<img>`/`<a>` emit 컨벤션) 의 탈출 문자를 닫는 것이 이 함수의 역할이다.
- 두 함수 모두 export 노출 0 (`grep -cE "export (const|function) escapeHtml" …` → 0) — 다른 모듈에서 직접 import 금지 (단일 정의 박제).

> **역할 분리의 이유** (코드 주석 `:3-6`·`:15-16`): 종전에는 속성 전용 `escapeHtmlAttr` 하나가 `& < > " '` 5 문자를 한꺼번에 처리했다. 본문 escape 가 생기면서 같은 문자열이 두 번 지나 `&amp;` → `&amp;amp;` 가 됐고, 그래서 **텍스트 축(`& < >`)과 속성 축(`" '`)으로 갈랐다**. 즉 이 변경은 escape 를 **약화한 것이 아니라** 이중 escape 를 없앤 것이며, 속성 문맥에서는 두 함수가 합쳐 종전 5 문자를 그대로 덮는다.

## 동작
1. **(I1) triple emission 계약**: detection pass 는 각 list line 을 `{ <li> open, value, </li> }` triple (모두 `itemOf: tagName` + `depth: N` 태깅) 로 방출. depth 가 깊은 line 은 fully-closed `</li>` 다음에 도착 (top-down 순회).
2. **(I2) deferred `</li>` 계약**: `bindListItem` 는 각 `</li>` (item-closing) 의 즉시 emit 을 지연 — `pendingCloseLi` 변수에 보관. 다음 list line 등장 시 다음 line 의 depth 와 비교 후 emit 결정.
3. **(I3) drop on deeper depth 계약**: 다음 `<li>` open 의 depth 가 현재 pending `</li>` 보다 깊으면 (`nextDepth > top()`), pending `</li>` 를 **drop** (외부 `<li>` 가 nested list 호스팅 — 닫지 않고 유지). 새 `<ul>/<ol>` open 을 emit + `depthStack.push(nextDepth)` + 새 `<li>` open emit.
4. **(I4) flush on equal/shallower depth 계약**: 다음 `<li>` open 의 depth 가 같거나 얕으면 (`nextDepth <= top()`), pending `</li>` 를 **flush** (output 에 emit) 후 진행. 얕은 경우 (`nextDepth < top()`), `depthStack` 을 pop 하면서 outer `</tagName>` + outer `</li>` emit 연쇄.
5. **(I5) flushAll on non-list / EOF 계약**: 비-list 노드 등장 또는 입력 종료 시 `flushAll()` 호출 — pending `</li>` flush + `depthStack` 전체를 pop 하면서 `</tagName>` + outer `</li>` emit 연쇄. list 가 닫히지 않은 상태로 함수 종료 금지.
6. **(I6) same-type 한정 계약**: `bindListItem(parsed, 'ul')` 는 `itemOf: 'ul'` triple 만 처리. `itemOf: 'ol'` triple 은 무변경 통과 (또는 별 `bindListItem(_, 'ol')` 호출에서 처리). **본 계약이 재는 것은 same-type 중첩의 그룹 경계가 보존된다는 것뿐이다** — `ul ↔ ol` 혼합 중첩의 **산출은 `markdown-mixed-type-nested-list` 가 소유하며 본 spec 은 그것을 정하지도, 금지하지도 않는다** (REQ-069 FR-05 인계). 종전 문면의 "범위 밖" 은 *미정의* 를 뜻했고 회귀 fixture 로 **중첩 부재를 잠그고** 있었다 — 그 잠금이 인계 대상이었다.
7. **(I7) `itemOf` + `depth` 태깅 계약**: detection pass 가 triple 의 각 노드에 `itemOf` (소속 list type) + `depth` (들여쓰기 단계 0/1/2/...) 박제. 본 두 메타가 없으면 `bindListItem` 알고리즘 입력 미충족.
8. **(I8) S1 단 escape 단일 모듈 계약**: escape 함수의 정의는 `src/common/markdownParser.ts` 안에 있고 export 되지 않는다. 정의가 별 모듈로 분산 (export 후 다른 모듈 재구현, 또는 신규 `src/common/escapeAttr.ts` 신설) 되면 본 spec 갱신 신호다. **판정은 함수 이름이 아니라 성질로 한다** — 이름을 못 박은 종전 문면이 `escapeHtmlAttr` → `escapeHtmlText`/`escapeHtmlQuotes` rename 후 충족 불가가 됐다 (§참고 §blue 문면 drift 정정). escape 문자 집합의 본문 변경은 별 task / 정책 변경이며 본 spec 은 **정의 단일성과 속성 문맥 적용**만 박제한다.
9. **(I9) 속성값은 보간 전에 escape 를 거친다**: `<img>`/`<a>` emit 본문이 속성값을 **날것으로 보간하지 않는다**. 현 구현에서 그 역할은 `escapeHtmlQuotes` 가 지며 호출은 5 줄 6 지점이다 (`:600` src·alt 2 지점 + `:601` title + `:639` href + `:665` href + `:666` title). raw 문자열 보간 (예: `"<img src='" + url + "'>"`) 회귀 시 이 호출이 사라지는 것이 (R-1) 회귀 신호다. sanitize 단의 ALLOWED_URI_REGEXP 가 `javascript:` 차단하더라도 single-quoted attribute context 탈출 (예: `url = "x' onerror='alert(1)"`) 은 S1 부재 시 sanitize 단계 도달 전에 emit HTML 자체 손상.
10. **(I10) `<a target='_blank' rel='noreferrer'>` fall-back 부여 계약**: markdownParser 의 `<a>` emit (`:631`, `linkTarget`) 본문이 `target='_blank' rel='noreferrer'` literal 포함 — `grep -cF "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` ≥ 1 hit. sanitize 미경유 raw HTML 주입 경로 (예: 다른 모듈이 markdownParser 결과를 sanitize 우회 후 DOM 주입) 의 referrer leak fall-back 보호. sanitize 경유 시 sanitizeHtml hook 이 `noopener noreferrer` 로 단조 강화 (`rel='noreferrer'` → `rel='noopener noreferrer'`) — `noreferrer` 토큰은 양 단 모두 보존. `target='_blank'` 자체 제거 시 sanitize hook 트리거 0 + S1 단 fall-back 무력화 동시 — (R-6) 회귀 신호.

### 호출 시퀀스 (정상 경로 예시)
```
입력 markdown:
- a
- b
  - b1
  - b2
- c

triple 시퀀스 (depth 표기):
[<li d0>, "a", </li d0>, <li d0>, "b", </li d0>,
 <li d1>, "b1", </li d1>, <li d1>, "b2", </li d1>,
 <li d0>, "c", </li d0>]

bindListItem(_, 'ul') 결과:
<ul>
  <li>a</li>
  <li>b
    <ul>
      <li>b1</li>
      <li>b2</li>
    </ul>
  </li>
  <li>c</li>
</ul>

알고리즘 핵심:
- "b" 후 </li d0> 도착 → pendingCloseLi 보관.
- 다음 <li d1> 도착 → d1 > d0 → drop pending </li> (외부 <li b> 유지) + <ul> open + depthStack.push(d1).
- "b2" 후 </li d1> 도착 → pendingCloseLi 보관.
- 다음 <li d0> 도착 → d0 < d1 → flush pending </li d1> + depthStack.pop() + </ul> emit + 외부 <li b> 의 </li> emit.
```

### 회귀 중점
- `bindListItem` 본문에서 `pendingCloseLi` 변수 제거 시 (I2)(I3) 위반 — drop on deeper depth 불가, nested 구조 평탄화.
- `depthStack` 제거 시 (I4)(I5) 위반 — 닫힘 시점 추적 불가, dangling `<ul>` / `<li>` 표면.
- detection pass 가 `itemOf` 또는 `depth` 메타 누락 시 (I7) 위반 — `bindListItem` 입력 미충족.
- `ul ↔ ol` 혼합 중첩 (`- a\n  1. b`) 의 산출은 **`markdown-mixed-type-nested-list` 소유** (REQ-069 흡수로 인계 완료 — 더 이상 "미정의" 가 아니다). 본 알고리즘에 대한 회귀 신호는 **혼합 중첩을 지원하면서 same-type 그룹 경계를 무너뜨리는 방향**이며, 그것은 (I2)~(I5) 가 잡는다.
- escape 함수 정의가 다른 모듈로 export 또는 별 모듈 신설로 복제 시 (I8) 위반 — 단일 정의 박제 깨짐, 정책 변경 시 다중 위치 동기 누락 위험.
- `<img>`/`<a>` emit 본문이 속성값을 raw 문자열로 보간하도록 회귀하면 (I9) 위반 — single-quoted attribute context 탈출 (XSS 진입 표면) + sanitize 우회 경로 노출.
- `<a>` emit 의 `target='_blank' rel='noreferrer'` literal 제거 또는 `rel=''` 변경 시 (I10) 위반 — sanitize 미경유 경로의 referrer leak / tabnabbing 표면 + S1 단 fall-back 무력화.

## 의존성
- 내부: `src/common/markdownParser.ts` (단일 진입점), `ParsedNode` 타입 (소비자 / 본 모듈 공유).
- 외부: 없음 (순수 함수 알고리즘).
- 역의존 (사용처): markdown 텍스트를 HTML 로 변환하는 모든 caller (`src/common/sanitizeHtml.ts` 의 input 생산자 — `sanitizeHtml.md` 의 §의존성 reverse).
- 직교: `sanitizeHtml.md` (DOM 주입 직전 sanitize 영역 — 본 spec 의 output 소비자).

## 테스트 현황
- [x] (I1)~(I7) 알고리즘 속성 7건 박제 — `src/common/markdownParser.test.ts` 의 nested list 회귀 fixture 가 same-type 중첩 시나리오를 커버. **판정은 주석을 제외하고 센다**: `bash -c 'test "$(sed "s://.*::" src/common/markdownParser.ts | grep -cE "bindListItem")" -eq 3'` → HEAD=`25f6013` 재실측 rc=0 (`:396` ul 호출 · `:446` ol 호출 · `:860` 정의). **종전 문면의 명령(주석 미제외)은 현 HEAD 에서 5 를 세어 rc=1 이었다** — `TSK-20260831-15`(`92820ab`) 가 `:126`·`:288` 에 주석으로 `bindListItem` 을 언급하면서 늘었다. 호출 구조는 그대로이므로 **정합은 유지되는데 게이트만 거짓이었고, 그 거짓이 승격된 `[x]` 아래에 있었다** (drift D6, 253차 발견). 계수 단위가 줄이므로 한 줄에 두 지점이 있으면 1 로 세는 것에 주의한다.
- [x] (I6 same-type 그룹 경계) 같은 종류 중첩 게이트가 실재하고 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "treats two leading spaces as equivalent to one tab for UL nesting" "$f" && grep -qF "nests a tab-indented OL child inside the parent <li>" "$f" && npx vitest run "$f" -t "treats two leading spaces as equivalent to one tab for UL nesting" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`8d030ce` 본 tick 실측 rc=0. **종전 이 항목은 혼합 중첩이 일어나지 *않는 것*을 단언하는 fixture(`does NOT nest ol child inside ul parent`)를 판정면으로 삼았다.** `REQ-20260831-069` 이 그 자리를 정의하면서 그 fixture 는 인계 대상이 됐고, 본 항목의 판정면을 **이 spec 이 실제로 소유하는 명제 — same-type 중첩의 그룹 경계 보존 — 로 옮겼다**. 혼합 중첩 fixture 의 존재/부재는 이제 `markdown-mixed-type-nested-list` (I4) 가 잰다. **본 spec 은 그 fixture 를 요구하지도 금지하지도 않는다** — 한 표면을 두 계약이 반대 방향으로 잠그는 상태를 만들지 않기 위해서다.
- [x] (I8) S1 escape 단일 모듈 박제 — `bash -c 'test "$(grep -rlE "const escapeHtml(Text|Quotes)[[:space:]]*=" src | wc -l | tr -d " ")" -eq 1 && test "$(grep -cE "export (const|function) escapeHtml" src/common/markdownParser.ts)" -eq 0'` → HEAD=`d4556b0` 재실측 rc=0 (정의 파일 1 · export 0). **종전 문면의 명령은 `escapeHtmlAttr` 을 요구해 0 hit → rc≠0 이었다** (drift D1).
- [x] (I9) 속성 문맥 escape 호출 박제 — `bash -c 'test "$(grep -cE "escapeHtmlQuotes\(" src/common/markdownParser.ts)" -ge 5'` → HEAD=`25f6013` 재실측 rc=0 (**5 줄 / 6 지점**: `:600` src·alt · `:601` title · `:639` href · `:665` href · `:666` title). **253차에 두 번 재도출했다** — `92820ab` 로 `:440`… → `:596`…, 다시 `f7d78f0` 로 `:600`… (한 tick 안에 두 커밋이 같은 파일을 늘렸다). 명령은 계수만 재므로 rc 는 내내 0 이었고 **드리프트는 `[x]` 아래에 숨어 있었다**. **종전 문면의 명령은 `escapeHtmlAttr\(` 을 세어 0 → rc≠0 이었다** (drift D2). 참고로 텍스트 축 `escapeHtmlText(` 는 4 줄 (`:203` `:577` `:714` `:720`).
- [x] (I10) `<a target='_blank' rel='noreferrer'>` fall-back literal 박제 — `bash -c 'test "$(grep -cF "target='\''_blank'\'' rel='\''noreferrer'\''" src/common/markdownParser.ts)" -ge 1'` → HEAD=`25f6013` 재실측 rc=0 (`:631`). 종전 문면의 `:315` 는 라인 drift 였고 (D3), 247차의 `:471`·253차 중간의 `:627` 도 차례로 밀렸다.
- [x] (비퇴행) 파서 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts >/dev/null 2>&1'` → HEAD=`25f6013` 재실측 rc=0 (**155 tests**, 정적 `it(` 선언 **141** — 차이는 루프 안에서 선언되는 `it` 이다. 정적 계수를 실행 수로 쓰지 않는다).

## 수용 기준
- [x] (Must, FR-03-a) triple emission + `itemOf` + `depth` 태깅 계약 (§동작 I1, I7) 박제.
- [x] (Must, FR-03-b) deferred `</li>` + drop on deeper depth + flush on equal/shallower depth 계약 (§동작 I2~I4) 박제.
- [x] (Must, FR-03-c) `bindListItem(parsed, tagName)` 진입점 식별 (`src/common/markdownParser.ts:860`) — §공개 인터페이스 + §동작 박제. HEAD=`25f6013` 재실측 rc=0.
- [x] (Should) flushAll on non-list / EOF 계약 (§동작 I5) 박제.
- [x] (Must, 범위 제한) inline 파싱 / 다른 markdown 단계는 본 게이트 범위 밖이다. **`ul ↔ ol` 혼합 중첩은 범위 밖이 아니라 인계됐다** — 산출을 `markdown-mixed-type-nested-list` 가 소유하며, 본 spec 은 그 축에서 same-type 그룹 경계 보존만 요구한다 (§동작 (I6)).
- [x] (Must, REQ-018 FR-01) escape 함수 정의 단일 모듈 + export 0 — §동작 (I8). 판정: 위 §테스트 현황 (I8) 명령 → HEAD=`d4556b0` 실측 rc=0.
- [x] (Must, REQ-018 FR-02) `<img>`/`<a>` emit 의 속성값이 escape 를 거친다 — §동작 (I9). 판정: 위 §테스트 현황 (I9) 명령 → HEAD=`d4556b0` 실측 rc=0 (5 줄 / 6 지점).
- [x] (Must, REQ-018 FR-06) markdownParser `<a>` emit `target='_blank' rel='noreferrer'` fall-back literal — §동작 (I10). 판정: 위 §테스트 현황 (I10) 명령 → HEAD=`25f6013` 재실측 rc=0 (`:631`). sanitize 미경유 경로 보호 baseline.
- [x] (Must, 비퇴행) 파서 스위트 rc=0 — 위 §테스트 현황 비퇴행 명령. HEAD=`25f6013` 재실측 rc=0 (155 tests).
- [x] (Must, 문면 정합) 본 spec 이 인용하는 식별자·라인·게이트 명령이 현 HEAD 에서 참이다 — §참고 §blue 문면 drift 정정 3건이 정정됐고 §테스트 현황 전수 재실행 rc 가 그 근거다.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`d4556b0`, 2026-08-31 재실측):
  - `bash -c 'sed "s://.*::" src/common/markdownParser.ts | grep -cE "bindListItem"'` → **3** (주석 제외). 주석 미제외 계수는 **5** 다 — `:126`·`:288` 이 주석 언급이며 이것이 D6 의 실물이다. 코드 3 hit: `:396` (`bindListItem(parsed, "ul")` 호출) · `:446` (`bindListItem(parsed, "ol")` 호출) · `:860` (정의). 알고리즘 의도 주석은 `:850-859` (`Stack-based grouping for same-type nested lists.` / `we defer emitting the item-closing </li>` / `the outer <li> stays open to host the nested list` / `otherwise we flush it and continue`).
  - `grep -rlE "const escapeHtml(Text|Quotes)[[:space:]]*=" src` → **1 file** (`src/common/markdownParser.ts` — `escapeHtmlText:7` · `escapeHtmlQuotes:17`). `grep -cE "export (const|function) escapeHtml" src/common/markdownParser.ts` → **0**. (I8) PASS.
  - `grep -cE "escapeHtmlQuotes\(" src/common/markdownParser.ts` → **5 줄** / `grep -oE` 기준 **6 지점**: `:600` (src·alt 2 지점) · `:601` (title) · `:639` (href) · `:665` (href) · `:666` (title). (I9) PASS. 텍스트 축 `escapeHtmlText(` → 4 줄 (`:203` `:577` `:714` `:720`). **계수 단위가 줄이므로 `:600` 의 두 지점 중 하나만 없애는 주입은 이 게이트에 보이지 않는다** — 게이트의 실제 해상도이며 `sanitizeHtml` (I11) 왕복에서 실측됐다.
  - `grep -cE "escapeHtmlAttr\(" src/common/markdownParser.ts` → **0**. 이름이 남은 곳은 주석 `:5`·`:15` 뿐이며, 이것이 blue (I8)(I9) 를 충족 불가로 만든 사실이다.
  - `grep -nF "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` → 1 hit `:631`. (I10) PASS.
  - 스위트: `npx vitest run src/common/markdownParser.test.ts` → **155 tests** rc=0. 정적 `it(` 선언은 **141** 이며 차이는 루프 안 선언이다 — 정적 계수를 실행 수로 쓰지 않는다 (`RULE-06 §열거 고정 금지`).
  - (I6) same-type 그룹 경계 대조: `grep -cF "treats two leading spaces as equivalent to one tab for UL nesting" src/common/markdownParser.test.ts` → **1** · `grep -cF "nests a tab-indented OL child inside the parent <li>" …` → **1**. **종전 이 자리는 혼합 중첩 금지 fixture(`does NOT nest ol child inside ul parent`, 현 `:257`)를 baseline 으로 잠갔다** — REQ-069 인계로 그 fixture 의 소유는 `markdown-mixed-type-nested-list` (I4) 로 넘어갔고 본 spec 의 baseline 에서 뺀다. **양쪽이 같은 fixture 를 반대 방향으로 박제한 채로 두면 어느 task 도 통과할 수 없다.**
- **rationale**: 알고리즘 본문은 `bindListItem` 함수 내부 (`:860+`). 본 spec 은 함수 본문 코드 복제가 아닌 **알고리즘 속성** (I1~I7) 만 박제 — 함수 본문 변경 시에도 속성 보존 여부로 회귀 검출. detection pass 의 triple emission 시퀀스 (I1, I7) 는 본 함수의 입력 계약 — 호출자 측 박제. (I8)(I9)(I10) S1 단 escape cross-surface 효능 — 정의 단일성 / 호출 카운트 / fall-back literal 3 게이트로 함수 본문 정책 변경 없이도 회귀 검출. S2 단 sanitize 정책 (DOMPurify hook upgrade) 은 `sanitizeHtml.md` 영역 — 본 spec 은 S1 단 + S1↔S2 baseline literal 한정.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector 253차 tick (Phase 3, REQ-20260831-069 흡수 — **blue 재개봉**) / pending @ HEAD=`8d030ce` | **(I6) 혼합 중첩 인계 + (I1) 계수기 실효 결함 정정 + 좌표 drift 전수 재도출. 마커 수 불변 ([x]=10 [ ]=0).** **재개봉을 택한 근거**: `REQ-20260831-069` 가 이 spec 이 `:74` 에서 *"본 알고리즘 범위 밖 — 동작 미정의 (별 spec 후보)"* 로 비워 둔 자리를 정의한다. 그 자리는 비어 있기만 한 것이 아니라 **회귀 fixture 로 중첩 부재가 잠겨 있었다** (`does NOT nest ol child inside ul parent`, §테스트 현황 (I6) · §수용 기준 범위 제한 · §스코프 규칙 baseline 세 자리). 선언만 새 spec 에 적고 이 문서를 두면 착지 순간 네 자리가 거짓이 되고, developer 는 스코프 밖 문서를 고칠 수 없어 task 를 격리한다 — `TSK-20260831-05-a` 가 정확히 그 지점에서 멈췄다. **재개봉 비용 실측** (252차가 continuation 에 쓴 기준): 152줄 · §수용 기준 10/10 · 판정 명령 6건 격리 사본 전수 재실행 → **rc≠0 1건**, rc=2 무판정 rot 0. 다른 축의 부채를 함께 떠안지 않는다. **그 rc≠0 1건이 재개봉의 두 번째 근거다 (drift D6)**: (I1) 의 `grep -cE "bindListItem" … -eq 3` 이 HEAD 에서 **5** 를 세어 rc=1 이었다 — `92820ab` 가 `:126`·`:288` 에 **주석으로** 그 이름을 언급하면서 늘었다. 호출 구조(정의 1 + 호출 2)는 그대로이므로 **정합은 유지되는데 게이트만 거짓**이고, 그 거짓이 승격된 `[x]` 아래에 있었다. 주석을 제외하는 계수기로 교체해 rc=0 회복. **(I6) 의 판정면을 옮긴 것이 이 흡수의 판단이다**: 종전 (I6) 은 자기가 소유하지 않는 명제(혼합 중첩이 일어나지 *않는다*)를 fixture 로 잠갔다. 새 문면은 이 spec 이 실제로 소유하는 명제 — **same-type 중첩의 그룹 경계 보존** — 만 재고, 혼합 중첩 산출의 소유는 `markdown-mixed-type-nested-list` 로 넘긴다. **본 spec 은 그 fixture 를 요구하지도 금지하지도 않는다** — 한 표면을 두 계약이 반대 방향으로 잠그면 어느 task 도 통과할 수 없기 때문이다. **좌표 drift 전수 재도출**: `bindListItem` `:638`→`:856` · 호출 `:240`·`:286`→`:396`·`:442` · `escapeHtmlQuotes` 5줄 `:440`·`:441`·`:479`·`:505`·`:506`→`:596`·`:597`·`:635`·`:661`·`:662` · `escapeHtmlText` 4줄 `:135`·`:417`·`:526`·`:532`→`:203`·`:573`·`:710`·`:716` · fall-back literal `:471`→`:627` · 의도 주석 `:628-637`→`:846-855` · 스위트 80→**150 tests** · 정적 `it(` 66→**136**. **전부 계수·존재 판정이라 rc 는 내내 0 이었다** — 좌표만 틀린 채 승격돼 있었고, 이 부류는 게이트가 잡지 못한다. **같은 tick 안에서 좌표를 두 번 재도출했다**: `92820ab` 착지 후 한 번, HEAD 가 `25f6013` 로 다시 움직인 뒤(`f7d78f0`) 또 한 번 (`bindListItem` `:856`→`:860` · 호출 `:442`→`:446` · `escapeHtmlQuotes` `:596`…→`:600`… · fall-back `:627`→`:631` · 스위트 150→**155** · 정적 `it(` 136→**141**). 한 tick 두 번은 이 좌표들의 수명이 얼마나 짧은지의 실측이며, **식별자 우선·라인 보조** 원칙이 문면에 있는 이유다. | 위치 · 동작 · 회귀 중점 · 테스트 현황 · 수용 기준 · 스코프 규칙 · 변경 이력 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — `src/common/markdownParser.ts` `bindListItem` 진입점의 stack-based grouping 알고리즘 7 속성 (I1~I7) 박제. baseline: 진입점 @:394 / 호출 2 hit (@:173 ul, @:219 ol) / 의도 주석 @:384. 원전 TSK-20260418-10 done 의 알고리즘 본문 인용 (속성만 박제, 본문 복제 회피). | all |
| 2026-05-18 | inspector 84차 tick (Phase 2, REQ-20260518-018 흡수) / pending | S1 단 escape cross-surface 효능 3 축 흡수 — (I8) `escapeHtmlAttr` 정의 단일 모듈 + (I9) `<img>`/`<a>` emit 호출 ≥ 5 + (I10) `<a target='_blank' rel='noreferrer'>` fall-back literal. 양 spec 분담: 본 spec = S1 + S1↔S2 baseline literal / `sanitizeHtml.md` = S2 + hook upgrade + 멱등. baseline (HEAD=`64d7432`): `grep -rnE "const escapeHtmlAttr" src` = 1 hit + `grep -cE "escapeHtmlAttr\("` = 5 + `grep -nE "target='_blank' rel='noreferrer'"` = 1 hit. §역할 / §공개 인터페이스 / §동작 (I8~I10) / §회귀 중점 3건 / §테스트 현황 3건 / §수용 기준 3건 / §스코프 규칙 grep-baseline 3 추가. | §역할 §공개 인터페이스 §동작 §회귀 중점 §테스트 현황 §수용 기준 §스코프 규칙 |
| 2026-05-19 | inspector 120차 tick (Phase 1 ack 단독 도래) / HEAD=`b7d52ba` baseline | §테스트 현황 line 81 (I6) marker `[ ]→[x]` flip 단독 — ul↔ol 혼합 중첩 mixed-type out-of-scope fixture 이미 박제 ack. ack 근거: `src/common/markdownParser.test.ts:184-192` (`it("does NOT nest ol child inside ul parent (mixed-type out-of-scope, REQ-076 FR-03 I6)")`) + `npx vitest run src/common/markdownParser.test.ts` 33 tests PASS (HEAD=`b7d52ba` 시점 실측 — file 1 passed / tests 33 passed / duration 865ms). fixture 평서: (a) `expect(result).not.toMatch(/<li>[^<]*<ol>/)` (same-type nested 결과 부재), (b) `expect(result).toContain("<ul>")` + `.toContain("<ol>")` (mixed 입력의 평탄 출력). 본 ack 는 외부 commit hook-ack 가 아닌 inspector 자가 grep + vitest 측정 박제 — fixture 가 spec carve 이전 시점부터 src 영역에 박제되어 있었으나 marker reconcile 누락분 회수. 본 spec unchecked 0 도래 — planner 차기 tick promote 후보 (green→blue) 진입. | §테스트 현황 + 본 이력 |
| 2026-08-31 | inspector 247차 tick (Phase 1 drift 정정 · blue→green 복사) / pending @ HEAD=`d4556b0` | **(I8)(I9) 가 현 HEAD 에서 충족 불가였다** — 두 게이트가 요구한 `escapeHtmlAttr` 은 존재하지 않고 주석 `:5`·`:15` 에만 남아 있다 (`grep -c` → 0). 정정 3건: D1 (I8) 을 이름 못 박기에서 **성질 판정**(정의 파일 1 · export 0)으로, D2 (I9) 를 `escapeHtmlAttr` 호출 수에서 **속성 문맥 escape 적용**(`escapeHtmlQuotes` 5 줄 / 6 지점)으로, D3 (I10) 라인 `:315`→`:471`. 라인 스냅샷 갱신: `bindListItem` 정의 `:394`→`:638`, 호출 `:173`·`:219`→`:240`·`:286`, 의도 주석 `:384`→`:628-637`, emit 본문 `:275-277`·`:313-315`→`:440-441`·`:479`·`:505-506`. §공개 인터페이스에 escape 2 함수와 **역할 분리의 이유**(이중 escape `&amp;amp;` 회피) 박제. §테스트 현황 전수 HEAD=`d4556b0` 재실행 rc=0 (스위트 80 tests) + 비퇴행·문면 정합 항목 2 신설. | all |

## 참고

### blue 문면 drift 정정 (본 복사의 사유)

blue 에 승격돼 있던 (I8)(I9) 는 **어느 시점에도 통과할 수 없는 상태**였다. 두 게이트가 이름으로 못 박은 `escapeHtmlAttr` 이 rename 으로 사라졌기 때문이다. 전부 HEAD=`d4556b0` 실측:

| ID | 종전 문면 | 실측 | 정정 |
|---|---|---|---|
| **D1** | (I8) `grep -rnE "const escapeHtmlAttr…" src` = **1 hit** | **0 hit** → rc≠0 | 이름 대신 **성질**로 판정한다: escape 함수 정의 파일이 1개이고 export 가 0. 이름이 바뀌어도 계약은 살아 있어야 한다 |
| **D2** | (I9) `grep -cE "escapeHtmlAttr\("` **≥ 5** | **0** → rc≠0 | 속성 문맥 escape 적용으로 판정한다: `escapeHtmlQuotes(` 5 줄 / 6 지점 (`:440` ×2 · `:441` · `:479` · `:505` · `:506`) |
| **D3** | (I10) fall-back literal `@:315` | 실제 `:471` | 라인 갱신 (계약 자체는 충족 상태였다) |

**rename 은 escape 의 약화가 아니라 이중 escape 의 제거였다.** 코드 주석(`:3-6`·`:15-16`)이 그 근거를 박제한다 — 속성 전용 `escapeHtmlAttr` 하나가 `& < > " '` 5 문자를 처리하던 때, 본문 escape 가 생기면서 같은 문자열이 두 번 지나 `&amp;` → `&amp;amp;` 가 됐다. 그래서 텍스트 축(`& < >` — `escapeHtmlText`)과 속성 축(`" '` — `escapeHtmlQuotes`)으로 갈랐고, **속성 문맥에서는 두 함수가 합쳐 종전 5 문자를 그대로 덮는다.** 따라서 정정은 계약을 느슨하게 한 것이 아니라 **같은 계약을 현 구조에 맞는 판정으로 옮긴 것**이다.

> 이 drift 가 남긴 교훈은 게이트가 **이름**을 못 박으면 rename 이 계약을 조용히 무력화한다는 것이다. D1·D2 의 새 판정은 이름이 아니라 성질(정의 단일성 · 속성 문맥 적용)을 재므로 다음 rename 에서도 살아남는다.

- **짝 spec**: `specs/30.spec/green/common/sanitizeHtml.md` — S2 단. 그 spec 의 (I11) 도 같은 이유로 `escapeHtmlAttr` 인용을 정정했다 (같은 tick).
- **본 spec 이 다루지 않는 마크다운 축** (전부 별 green spec — 본 spec §역할 이 "다른 단계 알고리즘 박제 (필요 시 별 spec)" 로 범위 밖에 둔 것들이다):
  `markdown-emphasis-delimiter-parity.md` (강조 구분자) · `markdown-pipe-table.md` (파이프 표) · `markdown-list-item-continuation.md` (목록 항목 이어짐 — 본 spec (I1)~(I7) 의 **입력을 넓히는** 축) · `markdown-atx-heading-closing-sequence.md` (제목 닫는 시퀀스).

- **REQ 원문 / TSK 원문**: TSK-20260418-10 (알고리즘 done), REQ-20260517-076 (본 세션 mv 후).
- **선행 done task**: `specs/60.done/2026/04/18/task/markdownparser-nested-list/` (TSK-20260418-10, 알고리즘 본문 박제처).
- **관련 spec**:
  - `specs/30.spec/blue/common/sanitizeHtml.md` (본 spec 의 output 소비자 — DOM 주입 직전 sanitize).
- **RULE 준수**:
  - RULE-07: 7 불변식 (I1~I7) 모두 시점 비의존 평서문 + `grep` / 알고리즘 회귀 fixture 로 반복 검증 가능.
  - RULE-06: grep-baseline 2 gate 실측 박제.
  - RULE-01: inspector writer 영역만.
