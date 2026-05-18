# `src/common/markdownParser.ts` — stack-based grouping 알고리즘 속성 불변식

> **위치**: `src/common/markdownParser.ts` 의 `bindListItem(parsed: ParsedNode[], tagName: string)` 진입점 (`@:394`) + `escapeHtmlAttr` 진입점 (`@:7`) + `<img>`/`<a>` emit 본문 (`@:275-277`,`@:313-315`).
> **관련 요구사항**: TSK-20260418-10, REQ-20260517-076 FR-03, REQ-20260518-018 (S1 단 escape + cross-surface defense-in-depth)
> **최종 업데이트**: 2026-05-18 (by inspector — 84차 tick / REQ-018 흡수: S1 단 escape 단일 모듈 + 호출 ≥ 5 + `<a>` emit `rel='noreferrer'` fall-back 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`893cdea`).

## 역할
markdownParser 의 **same-type nested list grouping 알고리즘 속성** + **S1 단 attribute escape (`escapeHtmlAttr` 단일 모듈 정의 + `<img>`/`<a>` emit 호출 ≥ 5) cross-surface defense-in-depth** 두 축 박제 — `bindListItem(parsed, tagName)` 가 같은 종류의 중첩 list (예: `ul` 안의 `ul`, `ol` 안의 `ol`) 를 `<li>...<ul>...</ul></li>` 중첩 구조로 재배치하는 stack-based deferred-emit 알고리즘 + `escapeHtmlAttr` 가 `<img>`/`<a>` emit 시점 attribute value (`url`/`alt`/`title`/`href`) 의 5문자 (`& < > " '`) 를 HTML entity 변환하여 single-quoted attribute context 탈출 차단 + `<a>` emit 본문 `target='_blank' rel='noreferrer'` fall-back 부여 (sanitize 미경유 raw HTML 주입 경로 보호 — sanitize hook 이 `noopener noreferrer` 로 단조 강화 upgrade 입력 baseline). 의도적으로 하지 않는 것: markdownParser 의 다른 단계 (token 화 / heading / code block 등) 의 알고리즘 박제 (필요 시 별 spec), `<li>` 본문 inline 파싱 (Markdown -> HTML 변환 별 영역), `<ul>` ↔ `<ol>` 혼합 중첩 (현 알고리즘은 same-type 한정), 알고리즘 성능 최적화 (정확성만 박제), `ParsedNode` 타입 본문 (소비자 측 영역), escape 5문자 외 추가 escape (예: `` ` ``, `=`) 도입 결정 (별 task / 정책 변경), `escapeHtmlAttr` export 노출 결정 (현재 module-private), markdownParser 다른 emit (heading / code / list) escape 도입 (별 단계).

## 공개 인터페이스
- `bindListItem(parsed: ParsedNode[], tagName: string): ParsedNode[]` — list line triple 시퀀스를 nested 구조로 재배치.
  - `parsed`: 1차 detection pass 결과. 각 list line 은 `{ <li> open, value, </li> }` triple (모두 `itemOf` + `depth` 태깅) 로 표현.
  - `tagName`: `'ul'` 또는 `'ol'` — 본 호출이 처리할 list 종류.
  - 반환: nested `<li>...<tagName>...</tagName></li>` 구조로 재배치된 `ParsedNode[]`.
- `escapeHtmlAttr(s: unknown): string` — **module-private** const (`@:7`). attribute value 의 5 문자 (`& < > " '`) 를 HTML entity (`&amp; &lt; &gt; &quot; &#39;`) 로 변환. single-quoted attribute context (markdownParser 의 `<img>`/`<a>` emit 본문이 사용하는 컨벤션) 의 탈출 문자 전부 차단. export 노출 0 — 다른 모듈에서 직접 import 금지 (단일 정의 박제). `<img>` emit `:275-277` 3 호출 (src/alt/title) + `<a>` emit `:313-315` 2 호출 (href/title) = 호출 카운트 ≥ 5 baseline.

## 동작
1. **(I1) triple emission 계약**: detection pass 는 각 list line 을 `{ <li> open, value, </li> }` triple (모두 `itemOf: tagName` + `depth: N` 태깅) 로 방출. depth 가 깊은 line 은 fully-closed `</li>` 다음에 도착 (top-down 순회).
2. **(I2) deferred `</li>` 계약**: `bindListItem` 는 각 `</li>` (item-closing) 의 즉시 emit 을 지연 — `pendingCloseLi` 변수에 보관. 다음 list line 등장 시 다음 line 의 depth 와 비교 후 emit 결정.
3. **(I3) drop on deeper depth 계약**: 다음 `<li>` open 의 depth 가 현재 pending `</li>` 보다 깊으면 (`nextDepth > top()`), pending `</li>` 를 **drop** (외부 `<li>` 가 nested list 호스팅 — 닫지 않고 유지). 새 `<ul>/<ol>` open 을 emit + `depthStack.push(nextDepth)` + 새 `<li>` open emit.
4. **(I4) flush on equal/shallower depth 계약**: 다음 `<li>` open 의 depth 가 같거나 얕으면 (`nextDepth <= top()`), pending `</li>` 를 **flush** (output 에 emit) 후 진행. 얕은 경우 (`nextDepth < top()`), `depthStack` 을 pop 하면서 outer `</tagName>` + outer `</li>` emit 연쇄.
5. **(I5) flushAll on non-list / EOF 계약**: 비-list 노드 등장 또는 입력 종료 시 `flushAll()` 호출 — pending `</li>` flush + `depthStack` 전체를 pop 하면서 `</tagName>` + outer `</li>` emit 연쇄. list 가 닫히지 않은 상태로 함수 종료 금지.
6. **(I6) same-type 한정 계약**: `bindListItem(parsed, 'ul')` 는 `itemOf: 'ul'` triple 만 처리. `itemOf: 'ol'` triple 은 무변경 통과 (또는 별 `bindListItem(_, 'ol')` 호출에서 처리). `ul ↔ ol` 혼합 중첩은 본 알고리즘 범위 밖.
7. **(I7) `itemOf` + `depth` 태깅 계약**: detection pass 가 triple 의 각 노드에 `itemOf` (소속 list type) + `depth` (들여쓰기 단계 0/1/2/...) 박제. 본 두 메타가 없으면 `bindListItem` 알고리즘 입력 미충족.
8. **(I8) S1 단 escape 단일 모듈 계약**: `escapeHtmlAttr` 정의는 `src/common/markdownParser.ts:7` 단일 — `grep -rnE "const escapeHtmlAttr\s*=\|function escapeHtmlAttr" src` = 1 hit. 정의가 별 모듈로 분산 (export 후 다른 모듈 재구현, 또는 신규 `src/common/escapeAttr.ts` 신설) 되면 본 spec 갱신 신호. 5 문자 enum (`& < > " '`) 본문 변경은 별 task / 정책 변경 — 본 spec 은 정의 단일성과 호출 카운트 박제만.
9. **(I9) S1 단 escape 호출 ≥ 5 계약**: `<img>`/`<a>` emit 본문에서 `escapeHtmlAttr` 호출 카운트 ≥ 5 — `grep -cE "escapeHtmlAttr\(" src/common/markdownParser.ts` ≥ 5. baseline = 5 (`:275` src + `:276` alt + `:277` title + `:313` href + `:314` title). raw 문자열 보간 (예: `"<img src='" + url + "'>"`) 회귀 시 호출 카운트 5 미만으로 감소 = (R-1) 회귀 신호. sanitize 단의 ALLOWED_URI_REGEXP 가 `javascript:` 차단하더라도 single-quoted attribute context 탈출 (예: `url = "x' onerror='alert(1)"`) 은 S1 부재 시 sanitize 단계 도달 전에 emit HTML 자체 손상.
10. **(I10) `<a target='_blank' rel='noreferrer'>` fall-back 부여 계약**: markdownParser 의 `<a>` emit (`:315`) 본문이 `target='_blank' rel='noreferrer'` literal 포함 — `grep -nE "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` ≥ 1 hit. sanitize 미경유 raw HTML 주입 경로 (예: 다른 모듈이 markdownParser 결과를 sanitize 우회 후 DOM 주입) 의 referrer leak fall-back 보호. sanitize 경유 시 sanitizeHtml hook 이 `noopener noreferrer` 로 단조 강화 (`rel='noreferrer'` → `rel='noopener noreferrer'`) — `noreferrer` 토큰은 양 단 모두 보존. `target='_blank'` 자체 제거 시 sanitize hook 트리거 0 + S1 단 fall-back 무력화 동시 — (R-6) 회귀 신호.

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
- `escapeHtmlAttr` 정의가 다른 모듈로 export 또는 별 모듈 신설로 복제 시 (I8) 위반 — 단일 정의 박제 깨짐, 정책 변경 시 다중 위치 동기 누락 위험.
- `<img>`/`<a>` emit 본문이 raw 문자열 보간으로 회귀하여 호출 카운트 5 미만 감소 시 (I9) 위반 — single-quoted attribute context 탈출 (XSS 진입 표면) + sanitize 우회 경로 노출.
- `<a>` emit 의 `target='_blank' rel='noreferrer'` literal 제거 또는 `rel=''` 변경 시 (I10) 위반 — sanitize 미경유 경로의 referrer leak / tabnabbing 표면 + S1 단 fall-back 무력화.

## 의존성
- 내부: `src/common/markdownParser.ts` (단일 진입점), `ParsedNode` 타입 (소비자 / 본 모듈 공유).
- 외부: 없음 (순수 함수 알고리즘).
- 역의존 (사용처): markdown 텍스트를 HTML 로 변환하는 모든 caller (`src/common/sanitizeHtml.ts` 의 input 생산자 — `sanitizeHtml.md` 의 §의존성 reverse).
- 직교: `sanitizeHtml.md` (DOM 주입 직전 sanitize 영역 — 본 spec 의 output 소비자).

## 테스트 현황
- [x] (I1)~(I7) 알고리즘 속성 7건 박제 — `src/common/markdownParser.test.ts` (또는 동급) 의 nested list 회귀 fixture 가 same-type 중첩 시나리오를 커버. HEAD=`893cdea` 실측 — `grep -nE "bindListItem" src/common/markdownParser.ts` → 3 hits (@:173 ul 호출, @:219 ol 호출, @:394 정의) PASS.
- [ ] (I6) ul ↔ ol 혼합 중첩 미정의 영역 — 회귀 fixture 가 mixed-type 케이스를 의도적으로 제외 (또는 fail-safe 동작 박제). 별 task 위임.
- [x] (I8) S1 escape 단일 모듈 박제 — `grep -rnE "const escapeHtmlAttr\s*=\|function escapeHtmlAttr" src` = 1 hit (`src/common/markdownParser.ts:7`). HEAD=`64d7432` 실측 PASS (정의 분산 0). REQ-018 흡수 시점.
- [x] (I9) S1 escape 호출 카운트 ≥ 5 박제 — `grep -cE "escapeHtmlAttr\(" src/common/markdownParser.ts` = 5 (`<img>` 3 + `<a>` 2). HEAD=`64d7432` 실측 PASS. REQ-018 흡수 시점.
- [x] (I10) `<a target='_blank' rel='noreferrer'>` fall-back literal 박제 — `grep -nE "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` ≥ 1 hit (`:315`). HEAD=`64d7432` 실측 PASS. REQ-018 흡수 시점.

## 수용 기준
- [x] (Must, FR-03-a) triple emission + `itemOf` + `depth` 태깅 계약 (§동작 I1, I7) 박제.
- [x] (Must, FR-03-b) deferred `</li>` + drop on deeper depth + flush on equal/shallower depth 계약 (§동작 I2~I4) 박제.
- [x] (Must, FR-03-c) `bindListItem(parsed, tagName)` 진입점 식별 (`src/common/markdownParser.ts:394`) — §공개 인터페이스 + §동작 박제.
- [x] (Should) flushAll on non-list / EOF 계약 (§동작 I5) 박제.
- [x] (Must, 범위 제한) ul ↔ ol 혼합 중첩 / inline 파싱 / 다른 markdown 단계는 본 게이트 범위 밖.
- [x] (Must, REQ-018 FR-01) `escapeHtmlAttr` 정의 단일 모듈 — §동작 (I8) + grep 1 hit 게이트 박제.
- [x] (Must, REQ-018 FR-02) `<img>`/`<a>` emit 본문 `escapeHtmlAttr` 호출 ≥ 5 — §동작 (I9) + grep -c ≥ 5 게이트 박제.
- [x] (Must, REQ-018 FR-06) markdownParser `<a>` emit `target='_blank' rel='noreferrer'` fall-back literal — §동작 (I10) + grep ≥ 1 hit 게이트 박제. sanitize 미경유 경로 보호 baseline.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`893cdea`, 2026-05-17):
  - `grep -nE "bindListItem|Stack-based grouping|deferred emit" src/common/markdownParser.ts` → 4 hits:
    - `:173` (`bindListItem(parsed, "ul")` 호출),
    - `:219` (`bindListItem(parsed, "ol")` 호출),
    - `:384` (주석 `// Stack-based grouping for same-type nested lists.`),
    - `:394` (정의 `const bindListItem = (parsed: ParsedNode[], tagName: string): ParsedNode[] => { ... }`).
  - `sed -n '384,395p' src/common/markdownParser.ts` → 알고리즘 의도 주석 + 진입점 박제 (`deferred emit` / `outer <li> stays open to host the nested list` / `otherwise we flush it and continue`).
- **grep-baseline (REQ-018 흡수)** (HEAD=`64d7432`, 2026-05-18):
  - `grep -rnE "const escapeHtmlAttr\s*=\|function escapeHtmlAttr" src` → 1 hit (`src/common/markdownParser.ts:7`). (I8) 단일 모듈 정의 박제 PASS.
  - `grep -cE "escapeHtmlAttr\(" src/common/markdownParser.ts` → 5 (`:275` src + `:276` alt + `:277` title + `:313` href + `:314` title). (I9) 호출 ≥ 5 PASS.
  - `grep -nE "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` → 1 hit (`:315`). (I10) fall-back literal PASS.
- **rationale**: 알고리즘 본문은 `bindListItem` 함수 내부 (`@:394+`). 본 spec 은 함수 본문 코드 복제가 아닌 **알고리즘 속성** (I1~I7) 만 박제 — 함수 본문 변경 시에도 속성 보존 여부로 회귀 검출. detection pass 의 triple emission 시퀀스 (I1, I7) 는 본 함수의 입력 계약 — 호출자 측 박제. (I8)(I9)(I10) S1 단 escape cross-surface 효능 — 정의 단일성 / 호출 카운트 / fall-back literal 3 게이트로 함수 본문 정책 변경 없이도 회귀 검출. S2 단 sanitize 정책 (DOMPurify hook upgrade) 은 `sanitizeHtml.md` 영역 — 본 spec 은 S1 단 + S1↔S2 baseline literal 한정.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — `src/common/markdownParser.ts` `bindListItem` 진입점의 stack-based grouping 알고리즘 7 속성 (I1~I7) 박제. baseline: 진입점 @:394 / 호출 2 hit (@:173 ul, @:219 ol) / 의도 주석 @:384. 원전 TSK-20260418-10 done 의 알고리즘 본문 인용 (속성만 박제, 본문 복제 회피). | all |
| 2026-05-18 | inspector 84차 tick (Phase 2, REQ-20260518-018 흡수) / pending | S1 단 escape cross-surface 효능 3 축 흡수 — (I8) `escapeHtmlAttr` 정의 단일 모듈 + (I9) `<img>`/`<a>` emit 호출 ≥ 5 + (I10) `<a target='_blank' rel='noreferrer'>` fall-back literal. 양 spec 분담: 본 spec = S1 + S1↔S2 baseline literal / `sanitizeHtml.md` = S2 + hook upgrade + 멱등. baseline (HEAD=`64d7432`): `grep -rnE "const escapeHtmlAttr" src` = 1 hit + `grep -cE "escapeHtmlAttr\("` = 5 + `grep -nE "target='_blank' rel='noreferrer'"` = 1 hit. §역할 / §공개 인터페이스 / §동작 (I8~I10) / §회귀 중점 3건 / §테스트 현황 3건 / §수용 기준 3건 / §스코프 규칙 grep-baseline 3 추가. | §역할 §공개 인터페이스 §동작 §회귀 중점 §테스트 현황 §수용 기준 §스코프 규칙 |

## 참고
- **REQ 원문 / TSK 원문**: TSK-20260418-10 (알고리즘 done), REQ-20260517-076 (본 세션 mv 후).
- **선행 done task**: `specs/60.done/2026/04/18/task/markdownparser-nested-list/` (TSK-20260418-10, 알고리즘 본문 박제처).
- **관련 spec**:
  - `specs/30.spec/green/common/sanitizeHtml.md` (본 spec 의 output 소비자 — DOM 주입 직전 sanitize).
- **RULE 준수**:
  - RULE-07: 7 불변식 (I1~I7) 모두 시점 비의존 평서문 + `grep` / 알고리즘 회귀 fixture 로 반복 검증 가능.
  - RULE-06: grep-baseline 2 gate 실측 박제.
  - RULE-01: inspector writer 영역만.
