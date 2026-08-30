# `src/common/markdownParser.ts` — stack-based grouping 알고리즘 속성 불변식

> **위치**: `src/common/markdownParser.ts` 의 `bindListItem(parsed: ParsedNode[], tagName: string)` 진입점 (`:638`, 호출 `:240`·`:286`, 의도 주석 `:628-637`) + escape 함수 `escapeHtmlText`(`:7`)·`escapeHtmlQuotes`(`:17`) + `<img>`/`<a>` emit 본문 (`:440-441` · `:479` · `:505-506`).
> **관련 요구사항**: TSK-20260418-10, REQ-20260517-076 FR-03, REQ-20260518-018 (S1 단 escape + cross-surface defense-in-depth)
> **최종 업데이트**: 2026-08-31 (by inspector 247차 tick — blue→green 복사 후 (I8)(I9)(I10) 문면 drift 정정, HEAD=`d4556b0`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`d4556b0`).

> **본 복사의 성격**: blue 문면의 (I8)(I9) 가 **현 HEAD 에서 충족 불가능**했다. 두 게이트는 `escapeHtmlAttr` 이라는 식별자를 요구하는데 그 함수는 더 이상 존재하지 않는다 (`grep -rcE "const escapeHtmlAttr[[:space:]]*=|function escapeHtmlAttr" src/common/markdownParser.ts` → **0**). 이름이 남아 있는 곳은 주석 `:5`·`:15` 뿐이다. inspector 는 blue 를 직접 편집하지 않으므로 (`RULE-01`) blue→green 으로 내려 정정한다. 정정의 근거와 범위는 §참고 §blue 문면 drift 정정 에 있다.

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
6. **(I6) same-type 한정 계약**: `bindListItem(parsed, 'ul')` 는 `itemOf: 'ul'` triple 만 처리. `itemOf: 'ol'` triple 은 무변경 통과 (또는 별 `bindListItem(_, 'ol')` 호출에서 처리). `ul ↔ ol` 혼합 중첩은 본 알고리즘 범위 밖.
7. **(I7) `itemOf` + `depth` 태깅 계약**: detection pass 가 triple 의 각 노드에 `itemOf` (소속 list type) + `depth` (들여쓰기 단계 0/1/2/...) 박제. 본 두 메타가 없으면 `bindListItem` 알고리즘 입력 미충족.
8. **(I8) S1 단 escape 단일 모듈 계약**: escape 함수의 정의는 `src/common/markdownParser.ts` 안에 있고 export 되지 않는다. 정의가 별 모듈로 분산 (export 후 다른 모듈 재구현, 또는 신규 `src/common/escapeAttr.ts` 신설) 되면 본 spec 갱신 신호다. **판정은 함수 이름이 아니라 성질로 한다** — 이름을 못 박은 종전 문면이 `escapeHtmlAttr` → `escapeHtmlText`/`escapeHtmlQuotes` rename 후 충족 불가가 됐다 (§참고 §blue 문면 drift 정정). escape 문자 집합의 본문 변경은 별 task / 정책 변경이며 본 spec 은 **정의 단일성과 속성 문맥 적용**만 박제한다.
9. **(I9) 속성값은 보간 전에 escape 를 거친다**: `<img>`/`<a>` emit 본문이 속성값을 **날것으로 보간하지 않는다**. 현 구현에서 그 역할은 `escapeHtmlQuotes` 가 지며 호출은 5 줄 6 지점이다 (`:440` src·alt 2 지점 + `:441` title + `:479` href + `:505` href + `:506` title). raw 문자열 보간 (예: `"<img src='" + url + "'>"`) 회귀 시 이 호출이 사라지는 것이 (R-1) 회귀 신호다. sanitize 단의 ALLOWED_URI_REGEXP 가 `javascript:` 차단하더라도 single-quoted attribute context 탈출 (예: `url = "x' onerror='alert(1)"`) 은 S1 부재 시 sanitize 단계 도달 전에 emit HTML 자체 손상.
10. **(I10) `<a target='_blank' rel='noreferrer'>` fall-back 부여 계약**: markdownParser 의 `<a>` emit (`:471`, `linkTarget`) 본문이 `target='_blank' rel='noreferrer'` literal 포함 — `grep -cF "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` ≥ 1 hit. sanitize 미경유 raw HTML 주입 경로 (예: 다른 모듈이 markdownParser 결과를 sanitize 우회 후 DOM 주입) 의 referrer leak fall-back 보호. sanitize 경유 시 sanitizeHtml hook 이 `noopener noreferrer` 로 단조 강화 (`rel='noreferrer'` → `rel='noopener noreferrer'`) — `noreferrer` 토큰은 양 단 모두 보존. `target='_blank'` 자체 제거 시 sanitize hook 트리거 0 + S1 단 fall-back 무력화 동시 — (R-6) 회귀 신호.

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
- `ul ↔ ol` 혼합 중첩 (`- a\n  1. b`) 시 본 알고리즘 범위 밖 — 동작 미정의 (별 spec 후보).
- escape 함수 정의가 다른 모듈로 export 또는 별 모듈 신설로 복제 시 (I8) 위반 — 단일 정의 박제 깨짐, 정책 변경 시 다중 위치 동기 누락 위험.
- `<img>`/`<a>` emit 본문이 속성값을 raw 문자열로 보간하도록 회귀하면 (I9) 위반 — single-quoted attribute context 탈출 (XSS 진입 표면) + sanitize 우회 경로 노출.
- `<a>` emit 의 `target='_blank' rel='noreferrer'` literal 제거 또는 `rel=''` 변경 시 (I10) 위반 — sanitize 미경유 경로의 referrer leak / tabnabbing 표면 + S1 단 fall-back 무력화.

## 의존성
- 내부: `src/common/markdownParser.ts` (단일 진입점), `ParsedNode` 타입 (소비자 / 본 모듈 공유).
- 외부: 없음 (순수 함수 알고리즘).
- 역의존 (사용처): markdown 텍스트를 HTML 로 변환하는 모든 caller (`src/common/sanitizeHtml.ts` 의 input 생산자 — `sanitizeHtml.md` 의 §의존성 reverse).
- 직교: `sanitizeHtml.md` (DOM 주입 직전 sanitize 영역 — 본 spec 의 output 소비자).

## 테스트 현황
- [x] (I1)~(I7) 알고리즘 속성 7건 박제 — `src/common/markdownParser.test.ts` 의 nested list 회귀 fixture 가 same-type 중첩 시나리오를 커버. HEAD=`d4556b0` 재실측: `bash -c 'test "$(grep -cE "bindListItem" src/common/markdownParser.ts)" -eq 3'` → rc=0 (`:240` ul 호출 · `:286` ol 호출 · `:638` 정의). 의도 주석은 `:628-637`.
- [x] (I6) ul ↔ ol 혼합 중첩 미정의 영역 — 회귀 fixture mixed-type 케이스 박제 PASS. HEAD=`b7d52ba` 재실측: `src/common/markdownParser.test.ts:184-192` (`it("does NOT nest ol child inside ul parent (mixed-type out-of-scope, REQ-076 FR-03 I6)")`) → `npx vitest run src/common/markdownParser.test.ts` 33/33 PASS (Tests 33 passed). fixture 평서 박제: (a) `expect(result).not.toMatch(/<li>[^<]*<ol>/)` — same-type nested 결과 부재 박제, (b) `expect(result).toContain("<ul>")` + `expect(result).toContain("<ol>")` — mixed 입력의 평탄 출력 박제. (I6) "same-type 한정 계약" 의 out-of-scope 사례 fail-safe 동작 자동 박제 — bindListItem 알고리즘 범위 밖 사례를 평탄 출력으로 wrap.
- [x] (I8) S1 escape 단일 모듈 박제 — `bash -c 'test "$(grep -rlE "const escapeHtml(Text|Quotes)[[:space:]]*=" src | wc -l | tr -d " ")" -eq 1 && test "$(grep -cE "export (const|function) escapeHtml" src/common/markdownParser.ts)" -eq 0'` → HEAD=`d4556b0` 재실측 rc=0 (정의 파일 1 · export 0). **종전 문면의 명령은 `escapeHtmlAttr` 을 요구해 0 hit → rc≠0 이었다** (drift D1).
- [x] (I9) 속성 문맥 escape 호출 박제 — `bash -c 'test "$(grep -cE "escapeHtmlQuotes\(" src/common/markdownParser.ts)" -ge 5'` → HEAD=`d4556b0` 재실측 rc=0 (**5 줄 / 6 지점**: `:440` src·alt · `:441` title · `:479` href · `:505` href · `:506` title). **종전 문면의 명령은 `escapeHtmlAttr\(` 을 세어 0 → rc≠0 이었다** (drift D2). 참고로 텍스트 축 `escapeHtmlText(` 는 4 줄 (`:135` `:417` `:526` `:532`).
- [x] (I10) `<a target='_blank' rel='noreferrer'>` fall-back literal 박제 — `bash -c 'test "$(grep -cF "target='\''_blank'\'' rel='\''noreferrer'\''" src/common/markdownParser.ts)" -ge 1'` → HEAD=`d4556b0` 재실측 rc=0 (`:471`). 종전 문면의 `:315` 는 라인 drift다 (D3).
- [x] (비퇴행) 파서 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts >/dev/null 2>&1'` → HEAD=`d4556b0` 재실측 rc=0 (**80 tests**, 정적 `it(` 선언 66 — 차이는 루프 안에서 선언되는 `it` 이다).

## 수용 기준
- [x] (Must, FR-03-a) triple emission + `itemOf` + `depth` 태깅 계약 (§동작 I1, I7) 박제.
- [x] (Must, FR-03-b) deferred `</li>` + drop on deeper depth + flush on equal/shallower depth 계약 (§동작 I2~I4) 박제.
- [x] (Must, FR-03-c) `bindListItem(parsed, tagName)` 진입점 식별 (`src/common/markdownParser.ts:638`) — §공개 인터페이스 + §동작 박제. HEAD=`d4556b0` 재실측 rc=0.
- [x] (Should) flushAll on non-list / EOF 계약 (§동작 I5) 박제.
- [x] (Must, 범위 제한) ul ↔ ol 혼합 중첩 / inline 파싱 / 다른 markdown 단계는 본 게이트 범위 밖.
- [x] (Must, REQ-018 FR-01) escape 함수 정의 단일 모듈 + export 0 — §동작 (I8). 판정: 위 §테스트 현황 (I8) 명령 → HEAD=`d4556b0` 실측 rc=0.
- [x] (Must, REQ-018 FR-02) `<img>`/`<a>` emit 의 속성값이 escape 를 거친다 — §동작 (I9). 판정: 위 §테스트 현황 (I9) 명령 → HEAD=`d4556b0` 실측 rc=0 (5 줄 / 6 지점).
- [x] (Must, REQ-018 FR-06) markdownParser `<a>` emit `target='_blank' rel='noreferrer'` fall-back literal — §동작 (I10). 판정: 위 §테스트 현황 (I10) 명령 → HEAD=`d4556b0` 실측 rc=0 (`:471`). sanitize 미경유 경로 보호 baseline.
- [x] (Must, 비퇴행) 파서 스위트 rc=0 — 위 §테스트 현황 비퇴행 명령. HEAD=`d4556b0` 실측 rc=0 (80 tests).
- [x] (Must, 문면 정합) 본 spec 이 인용하는 식별자·라인·게이트 명령이 현 HEAD 에서 참이다 — §참고 §blue 문면 drift 정정 3건이 정정됐고 §테스트 현황 전수 재실행 rc 가 그 근거다.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`d4556b0`, 2026-08-31 재실측):
  - `grep -nE "bindListItem" src/common/markdownParser.ts` → 3 hits: `:240` (`bindListItem(parsed, "ul")` 호출) · `:286` (`bindListItem(parsed, "ol")` 호출) · `:638` (정의). 알고리즘 의도 주석은 `:628-637` (`Stack-based grouping for same-type nested lists.` / `we defer emitting the item-closing </li>` / `the outer <li> stays open to host the nested list` / `otherwise we flush it and continue`).
  - `grep -rlE "const escapeHtml(Text|Quotes)[[:space:]]*=" src` → **1 file** (`src/common/markdownParser.ts` — `escapeHtmlText:7` · `escapeHtmlQuotes:17`). `grep -cE "export (const|function) escapeHtml" src/common/markdownParser.ts` → **0**. (I8) PASS.
  - `grep -cE "escapeHtmlQuotes\(" src/common/markdownParser.ts` → **5 줄** / `grep -oE` 기준 **6 지점**: `:440` (src·alt 2 지점) · `:441` (title) · `:479` (href) · `:505` (href) · `:506` (title). (I9) PASS. 텍스트 축 `escapeHtmlText(` → 4 줄 (`:135` `:417` `:526` `:532`).
  - `grep -cE "escapeHtmlAttr\(" src/common/markdownParser.ts` → **0**. 이름이 남은 곳은 주석 `:5`·`:15` 뿐이며, 이것이 blue (I8)(I9) 를 충족 불가로 만든 사실이다.
  - `grep -nF "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` → 1 hit `:471`. (I10) PASS.
  - 스위트: `npx vitest run src/common/markdownParser.test.ts` → **80 tests** rc=0. 정적 `it(` 선언은 66 이며 차이는 루프 안 선언이다 — 정적 계수를 실행 수로 쓰지 않는다 (`RULE-06 §열거 고정 금지`).
  - (I6) mixed-type out-of-scope fixture: `grep -qF "does NOT nest ol child inside ul parent" src/common/markdownParser.test.ts` → rc=0 (`:185`).
- **rationale**: 알고리즘 본문은 `bindListItem` 함수 내부 (`@:394+`). 본 spec 은 함수 본문 코드 복제가 아닌 **알고리즘 속성** (I1~I7) 만 박제 — 함수 본문 변경 시에도 속성 보존 여부로 회귀 검출. detection pass 의 triple emission 시퀀스 (I1, I7) 는 본 함수의 입력 계약 — 호출자 측 박제. (I8)(I9)(I10) S1 단 escape cross-surface 효능 — 정의 단일성 / 호출 카운트 / fall-back literal 3 게이트로 함수 본문 정책 변경 없이도 회귀 검출. S2 단 sanitize 정책 (DOMPurify hook upgrade) 은 `sanitizeHtml.md` 영역 — 본 spec 은 S1 단 + S1↔S2 baseline literal 한정.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
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
