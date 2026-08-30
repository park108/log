# `src/common/sanitizeHtml.ts` — ALLOWED_* 단일 모듈 정책 + DOM 주입 전 sanitize 경유 불변식

> **위치**: `src/common/sanitizeHtml.ts` 의 `ALLOWED_TAGS`(`:7-15`) / `ALLOWED_ATTR`(`:17`) / `ALLOWED_URI_REGEXP`(`:31`) 정책 상수 + `sanitizeHtml` default export 진입점(`:48`) + `ensureHook` 멱등 가드 (`:36-45`) + `afterSanitizeAttributes` rel upgrade 본문(`:39-43`).
> **관련 요구사항**: REQ-20260418-001 NFR-01, REQ-20260517-076 FR-02, REQ-20260518-018 (S2 단 sanitize 단일 모듈 + hook upgrade 양방향 + 멱등 + cross-surface defense-in-depth), REQ-20260831-052 FR-02·NFR-01·NFR-02 (파이프 표 태그 등재 — §동작 (I12))
> **최종 업데이트**: 2026-08-31 (by inspector — blue→green 복사 후 문면 drift 정정 4건 + REQ-20260831-052 (I12) 흡수, HEAD=`b1cbf5c`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`b1cbf5c`).

> **본 복사의 성격**: blue 문면이 현 코드와 어긋난 지점 4건이 실측으로 확인돼 blue→green 으로 내렸다 (inspector 는 blue 를 직접 편집하지 않는다 — `RULE-01`). 어긋남의 목록과 각각의 정정은 §참고 §blue 문면 drift 정정 에 있다. **그중 둘은 게이트 자체가 현 HEAD 에서 rc≠0 이었다** — 즉 blue 에 승격된 상태로 판정 불가였다.

## 역할
`markdownParser` 산출 HTML 의 **DOM 주입 직전 sanitize 경유** + **ALLOWED_TAGS / ALLOWED_ATTR / ALLOWED_URI_REGEXP 정책 상수의 단일 모듈 (`src/common/sanitizeHtml.ts`) 박제** 두 축 시스템 불변식. 의도적으로 하지 않는 것: DOMPurify 의 다른 옵션 (예: `WHOLE_DOCUMENT`, `SANITIZE_DOM`) 정책 (필요 시 별 spec), sanitize 호출 후 추가 변환 (caller 영역), sanitize 결과의 React `dangerouslySetInnerHTML` 사용 패턴 (caller 영역), DOMPurify 라이브러리 버전 정합 (`runtime-dep-version-coherence.md` 영역), XSS 회귀 fixture 본문 (`src/common/sanitizeHtml.test.ts` 영역 — 본 spec 은 fixture pointer 만 박제).

## 공개 인터페이스
- `sanitize(input: string): string` — markdownParser 산출 HTML 을 정제. `DOMPurify.sanitize(input, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP, ... })` 호출.
- 모듈 내부:
  - `ALLOWED_TAGS: string[]` — 허용 태그 enum (**21 항목** — `p` `br` `hr` `strong` `em` `del` `code` `pre` `blockquote` `h1` `h2` `h3` `h4` `h5` `h6` `ul` `ol` `li` `a` `img` `span`). 종전 문면의 "18 항목" 은 `h1`~`h6` 을 한 항목으로 세어 생긴 오기다 (§참고 §blue 문면 drift 정정 D1).
  - `ALLOWED_ATTR: string[]` — 허용 속성 enum (7 항목 — `href` / `src` / `alt` / `title` / `target` / `rel` / `class`).
  - `ALLOWED_URI_REGEXP: RegExp` — 허용 URI scheme. 현 값은 `/^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i` (`:31`) 이며 세 갈래다: (a) `https?:`·`mailto:` 스킴, (b) 글자로 시작하지 않아 스킴일 수 없는 것(`/a` `#a` `2024/a`), (c) 글자로 시작하되 `:` 가 뒤따르지 않는 것(`about` `a/b`). `javascript:` · `data:` · `vbscript:` 는 (c) 에서 `:` 때문에 탈락한다. 종전 문면의 `/^(https?:|mailto:|\/|#)/i` 는 **이전 패턴**이며, 그것은 `/` 로 시작하는 상대경로만 통과시켜 `[상대 경로](./other)` 의 `href` 가 통째로 지워졌다 (§참고 §blue 문면 drift 정정 D2).
  - `afterSanitizeAttributes` 훅 (`:39-43`) — `<a target="_blank">` 에 `rel="noopener noreferrer"` 자동 보정 (멱등 — 모듈 로드 시 1회 등록, `hookRegistered` 가드 `:35`·`:37`·`:44`).

세 상수는 **internal** (export 금지) — 정책 변경은 본 모듈에서만. 외부 모듈이 ALLOWED_* 를 import 하면 단일 모듈 정책 위반.

## 동작
1. **(I1) 단일 모듈 정책 박제**: `ALLOWED_TAGS` / `ALLOWED_ATTR` / `ALLOWED_URI_REGEXP` 3 상수는 **`src/common/sanitizeHtml.ts` 한정** 으로 정의. 다른 모듈은 이 정책을 인용·재정의·우회하지 않는다. 정책을 **정의·소비**하는 코드는 `src/common/sanitizeHtml.{ts,test.ts}` 한정이다. 다른 파일이 이 이름을 **주석에서 인용**하는 것은 위반이 아니다 — 인용은 정책 분기를 만들지 않는다. 따라서 판정은 주석 줄을 걷어낸 뒤 센다 (§테스트 현황 (I1), §참고 §blue 문면 drift 정정 D3).
2. **(I2) DOM 주입 직전 sanitize 경유 계약**: markdownParser 산출 HTML 을 DOM 에 주입하는 모든 caller (React `dangerouslySetInnerHTML` / 직접 DOM 조작 / SSR HTML 출력 등) 는 `sanitize(input)` 결과만 사용. raw markdownParser 결과를 DOM 에 직접 주입 금지.
3. **(I3) URI scheme 화이트리스트 계약**: `ALLOWED_URI_REGEXP` 는 `https?:` · `mailto:` 스킴과 **스킴이 아닌 것**(절대·상대 경로, 프래그먼트)을 허용하고, `javascript:` · `data:` · `vbscript:` 등 활성 콘텐츠 scheme 을 차단한다. 계약은 **차단 대상**이며 허용 쪽 표기의 구체 형태는 수단이다 — 상대경로를 지우는 패턴은 링크처럼 보이는데 눌러도 아무 일도 일어나지 않는 글자를 만들었고(`[상대 경로](./other)`), 그 회귀가 현 패턴의 계기다.
4. **(I4) `<a target="_blank">` rel 자동 보정**: 모듈 로드 시 1회 `afterSanitizeAttributes` 훅 등록 (멱등 — `hookRegistered` 가드). `<a target="_blank">` 발견 시 `rel="noopener noreferrer"` 자동 부여. 훅 해제 (`removeHook`) 금지.
5. **(I5) OWASP XSS Filter Evasion 회귀 fixture pointer**: 회귀 fixture 는 `src/common/sanitizeHtml.test.ts` (별 모듈) 에 박제. 본 spec 은 fixture **존재 + 10 대표 벡터 (OWASP XSS Filter Evasion Cheat Sheet) 커버** 두 사실만 박제. 벡터 본문 enumeration 은 fixture referer (테스트 spec) 위임.
6. **(I6) 정책 변경 단일 진입점**: 신규 태그 / 속성 / URI scheme 도입 시 (a) `ALLOWED_*` 본문 수정 + (b) 회귀 fixture (`sanitizeHtml.test.ts`) 갱신 동일 PR 정합. 두 파일 외부에서의 정책 우회 금지.
7. **(I7) S2 단 DOMPurify import 단일 모듈 계약**: DOMPurify import 는 `src/common/sanitizeHtml.ts:5` 한정 — `grep -rln "import DOMPurify\|from 'dompurify'" src` = 1 hit. 다른 모듈 직접 import (예: 별 sanitizer wrapper, 별 도메인의 직접 호출) 금지 — sanitize 정책 단일 진입점 박제. dompurify ↔ 다른 sanitizer (sanitize-html / xss-filters) 로 swap 결정은 본 spec 비박제 (수단 중립) — swap 시 본 게이트 baseline 변경 자체가 spec 갱신 신호.
8. **(I8) hook upgrade `<a target='_blank'>` rel 양방향 단조 강화 계약**: `afterSanitizeAttributes` hook (`:39-43`) 이 `<a target="_blank">` 매치 시 `rel='noopener noreferrer'` 로 setAttribute. markdownParser 가 emit 한 `rel='noreferrer'` (`markdownParser.ts:471`) 는 본 hook 이 `rel='noopener noreferrer'` 로 덮어쓰는 **단조 강화 경로** — `noreferrer` 토큰은 양 단 모두 보존, `noopener` 토큰은 S2 단에서만 추가. fixture (`sanitizeHtml.test.ts:66` `"adds rel=noopener noreferrer to target=_blank anchor"`) 가 효능 잠금. markdownParser 단 fall-back `rel='noreferrer'` 부재 시에도 S2 hook 이 `<a target="_blank">` 발견 즉시 양방향 정합 유지.
9. **(I9) hook 등록 멱등 + `removeHook` 부재 계약**: `ensureHook()` (`:36-45`) 가 `hookRegistered` boolean 가드로 다중 호출 시 hook 추가 등록 0 — `addHook('afterSanitizeAttributes', …)` 등록 = 1 hit (`:39`). **`removeHook` 호출 부재** — 판정은 주석을 걷어낸 뒤 센다. 현 코드의 `:34` 는 `removeHook 호출하지 않는다` 라는 **주석**이며 호출이 아니다 (§참고 §blue 문면 drift 정정 D4). 멱등 깨짐 시 (예: `hookRegistered` 가드 제거 또는 `removeHook` 후 재등록) `rel` 속성 중첩 (`"noopener noreferrer noopener noreferrer"`) 회귀 표면. 가드 수단 (`hookRegistered` boolean / Set / WeakMap) 은 수단 중립 — 멱등 효능만 박제.
10. **(I10) sanitize 멱등 계약**: `sanitizeHtml(sanitizeHtml(x))` = `sanitizeHtml(x)` — 동일 입력 반복 sanitize 시 추가 escape / strip 0. fixture (`sanitizeHtml.test.ts:88` `"is idempotent (double sanitize equals single)"`) 가 효능 잠금. 본 효능은 sanitize 가 자체 출력을 재입력 받아도 새로 escape/strip 하지 않음을 보장 — caller 측 sanitize 중복 호출 (방어 코드) 안전성 baseline.
11. **(I11) cross-surface 2단 방어 defense-in-depth 계약**: S1 단 (`markdownParser.md` (I8)~(I10)) escape + S2 단 (본 spec (I1)(I3)(I4)(I7)(I8)(I9)) sanitize 양 단이 **독립적으로** XSS 회귀를 차단 — 어느 한 단이 회피·우회 되어도 다른 단이 차단. (a) markdownParser escape 누락 → DOMPurify 가 single-quoted attribute context 손상 emit 을 fix-up + ALLOWED_URI_REGEXP 가 `javascript:` 차단; (b) sanitize 우회 raw HTML 주입 → markdownParser 단 escape 함수(`escapeHtmlText` · `escapeHtmlQuotes` — 종전 문면의 `escapeHtmlAttr` 은 현 코드에 없다) 가 entity 변환 + `<a>` `rel='noreferrer'` fall-back 가 referrer leak 방어. 양 단 동시 회귀 시에만 XSS 진입 — 단 한 단 회귀 시 fail-safe 활성.

12. **(I12) 렌더 계약이 요구하는 태그는 정책에 등재된다 (REQ-20260831-052)**: 파서가 emit 하도록 계약된 태그가 `ALLOWED_TAGS` 에 없으면 그 구조는 DOM 주입 직전에 통째로 사라진다 — 파서 쪽 계약만으로는 화면에 닿지 않는다. 현재 그 상태에 있는 것이 **표 태그**다 (`table` `thead` `tbody` `tr` `th` `td` — 전부 0 hit). 등재는 (I1)(I6) 을 그대로 따른다: `src/common/sanitizeHtml.ts` 안에서만 바꾸고, 같은 변경에서 회귀 fixture 를 갱신하며, `ALLOWED_ATTR` 은 넓히지 않는다 (`style` 허용은 (I3) 계열 정책 확장이라 별 축). 무엇이 표로 렌더돼야 하는가는 본 spec 이 아니라 `specs/30.spec/green/common/markdown-pipe-table.md` 소관이며, 본 축은 **정책 쪽 조건**만 진다.

### 회귀 중점
- 외부 모듈이 `ALLOWED_TAGS` 등을 `export` 추가 후 import 하면 (I1) 위반 — 정책 분기 위험.
- 파서가 표를 emit 하는데 `ALLOWED_TAGS` 등재가 없으면 (I12) 위반 — 통과하지 못하는 구조는 렌더된 것이 아니다. 실측상 머리 셀의 글자마저 남지 않는다 (§스코프 규칙).
- caller 가 `markdownParser` 결과를 sanitize 우회 후 `dangerouslySetInnerHTML` 직접 주입 시 (I2) 위반 — XSS 진입 표면.
- `ALLOWED_URI_REGEXP` 에 `javascript:` / `data:` 추가 시 (I3) 위반 — 활성 콘텐츠 진입 표면.
- `afterSanitizeAttributes` 훅 본문에서 `<a target="_blank">` rel 자동 보정 로직 제거 시 (I4) 위반 — `noopener noreferrer` 누락으로 tabnabbing 표면.
- 신규 태그 도입 시 fixture 갱신 누락 (I6) 위반 — 회귀 감지 누락.
- DOMPurify 가 `dependencies` 에서 제거되거나 다른 sanitizer 로 swap 시 (I7) 위반 — `src/common/sanitizeHtml.ts:5` import 변경 + 정책 토큰 호환성 미보장 → spec 갱신 신호 (수단 중립 박제).
- markdownParser 단 `rel='noreferrer'` 제거 → S2 hook 이 여전히 upgrade 하나, sanitize 미경유 raw HTML 주입 경로의 fall-back 무력화 시 (I8) 위반 — cross-surface 양방향 정합 깨짐.
- `hookRegistered` 가드 제거 또는 `removeHook` 호출 도입 시 (I9) 위반 — hook 중첩 등록으로 `rel` 속성 중첩 (`"noopener noreferrer noopener noreferrer"`) 회귀.
- sanitize 가 자체 출력 재입력 시 추가 escape / strip (예: DOMPurify 메이저 bump 의 정책 변경) 발생 시 (I10) 위반 — caller 측 방어 코드 (sanitize 중복 호출) 비정합.
- S1 단 (markdownParser escape) + S2 단 (sanitize 정책) 동시 회귀 시 (I11) 위반 — defense-in-depth 양 단 동시 무력화 = XSS 진입 (단 한 단 회귀 만으로는 fail-safe 활성).

## 의존성
- 내부: `src/common/sanitizeHtml.ts` (단일 진입점), `src/common/markdownParser.ts` (입력), `src/common/sanitizeHtml.test.ts` (회귀 fixture).
- 외부: `dompurify` (devDep / dep — `runtime-dep-version-coherence.md` 영역).
- 역의존 (사용처): markdownParser 결과를 DOM 에 주입하는 모든 caller (Log / Comment 등 도메인 모듈 — caller 측은 sanitize 호출 의무).
- 직교: `markdownParser.md` (파싱 알고리즘 영역), `runtime-dep-version-coherence.md` (dompurify 버전 정합).

## 테스트 현황

> 아래 rc 는 전부 HEAD=`d4556b0` 에서 재실행한 결과다. 종전 문면의 `893cdea`/`64d7432` 스탬프와 갈리는 지점은 §참고 §blue 문면 drift 정정 에 사유를 적었다.

- [x] (I1) 단일 모듈 정책: `bash -c 'test "$(grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\." | grep -vcE "^[^:]+:[0-9]+:[[:space:]]*(//|\*)")" -eq 0'` → HEAD=`d4556b0` 재실측 rc=0. **종전 문면의 명령(주석 미제외)은 현 HEAD 에서 2 hit 이라 rc≠0 이었다** — 두 hit 은 `markdownParser.ts:455` 와 `markdownParser.test.ts:296` 의 주석 인용이며 정책 분기가 아니다 (drift D3).
- [x] (I3) 활성 콘텐츠 scheme 차단: `bash -c '! grep -nE "ALLOWED_URI_REGEXP[^;]*(javascript|vbscript)" src/common/sanitizeHtml.ts'` → HEAD=`d4556b0` 재실측 rc=0. 현 패턴은 `:31` 이며 값은 §공개 인터페이스 참조 (drift D2).
- [x] (I4) `<a target="_blank">` rel 자동 보정: `bash -c 'test "$(grep -cE "afterSanitizeAttributes|noopener noreferrer" src/common/sanitizeHtml.ts)" -ge 2'` → HEAD=`d4556b0` 재실측 rc=0 (훅 등록 `:39` + rel 부여 `:41`).
- [x] (I5) OWASP XSS Filter Evasion fixture: `src/common/sanitizeHtml.test.ts` 실재 + 대표 벡터 박제. **측정**: `bash -c 'npx vitest run src/common/sanitizeHtml.test.ts >/dev/null 2>&1'` → HEAD=`d4556b0` 재실측 rc=0 (**17 tests**). fixture 본문 검증은 그 파일 소관 — 본 spec 은 pointer 만 박제한다.
- [x] (I6) 정책 변경 단일 진입점: 본 spec 박제로 PR 정합 계약 명시. 판정 채널은 (I1) 과 (I12) 의 등재 위치이며, 등재가 `src/common/sanitizeHtml.ts` 밖에서 일어나면 (I1) 이 즉시 붉어진다.
- [x] (I7) DOMPurify import 단일 모듈: `bash -c 'test "$(grep -rlE "import DOMPurify|from .dompurify." src | wc -l | tr -d " ")" -eq 1'` → HEAD=`d4556b0` 재실측 rc=0 (`src/common/sanitizeHtml.ts:5`).
- [x] (I8) hook upgrade `<a target='_blank'>` rel 양방향: `bash -c 'grep -qF "adds rel=noopener noreferrer to target=_blank anchor" src/common/sanitizeHtml.test.ts'` → HEAD=`d4556b0` 재실측 rc=0 (`:66`). S1 단 fall-back 실재도 확인: `bash -c 'grep -qF "target='\''_blank'\'' rel='\''noreferrer'\''" src/common/markdownParser.ts'` → rc=0 (`markdownParser.ts:471`).
- [x] (I9) hook 멱등 + `removeHook` 부재: `bash -c 'test "$(grep -cE "addHook\(.afterSanitizeAttributes." src/common/sanitizeHtml.ts)" -eq 1 && test "$(sed "s://.*::" src/common/sanitizeHtml.ts | grep -cE "removeHook")" -eq 0 && test "$(grep -cE "hookRegistered" src/common/sanitizeHtml.ts)" -ge 2'` → HEAD=`d4556b0` 재실측 rc=0 (addHook `:39` · removeHook 호출 0 · 가드 `:35`·`:37`·`:44`). **종전 문면의 `removeHook` 0 hit 명령은 현 HEAD 에서 1 hit 이라 rc≠0 이었다** — 그 hit 은 `:34` 의 주석 `removeHook 호출하지 않는다` 이며 호출이 아니다 (drift D4).
- [x] (I10) sanitize 멱등: `bash -c 'grep -qF "is idempotent (double sanitize equals single)" src/common/sanitizeHtml.test.ts'` → HEAD=`d4556b0` 재실측 rc=0 (`:88`), 스위트 rc=0.
- [x] (I11) cross-surface 2단 방어 baseline: S1 단 (`markdownParser.md` (I8)~(I10)) + S2 단 (본 spec (I1)(I3)(I4)(I7)(I8)(I9)) 양 단 baseline 이 동시에 활성이다. HEAD=`d4556b0` 재실측 — 양 단 게이트 전수 rc=0.
- [x] (정책 항목 수) `ALLOWED_TAGS` 21 · `ALLOWED_ATTR` 7: `bash -c 'test "$(perl -0777 -ne "print \$1 if /const ALLOWED_TAGS\s*=\s*\[(.*?)\]/s" src/common/sanitizeHtml.ts | grep -oE "'\''[a-z0-9]+'\''" | wc -l | tr -d " ")" -eq 21'` → HEAD=`d4556b0` 재실측 rc=0. 종전 문면의 "18 항목" 은 오기였다 (drift D1).
- [ ] (I12) 표 태그 등재: `bash -c 'f=src/common/sanitizeHtml.ts; grep -q "ALLOWED_TAGS" "$f" || exit 2; n=$(grep -oE "'\''(table|thead|tbody|tr|th|td)'\''" "$f" | wc -l | tr -d " "); echo "table-tag-entries=$n"; [ "$n" -ge 6 ]'` → HEAD=`d4556b0` 재실측 **rc=1 (미충족)**, 출력 `table-tag-entries=0`. 파일에 `ALLOWED_TAGS` 가 없으면 `exit 2` 로 무판정 (공허 통과 차단).

## 수용 기준
- [x] (Must, FR-02-a) ALLOWED_TAGS / ALLOWED_ATTR / ALLOWED_URI_REGEXP 3 상수 단일 모듈 박제 — §동작 (I1) + grep 0 hit 게이트.
- [x] (Must, FR-02-c) OWASP XSS Filter Evasion 10 대표 벡터 회귀 fixture pointer — `src/common/sanitizeHtml.test.ts` referer 박제 (본 spec §동작 I5). — **측정**: fixture pointer 박제 완료.
- [x] (Should) URI scheme 화이트리스트 + `<a target="_blank">` rel 자동 보정 — §동작 (I3)(I4) 박제.
- [x] (Must, 범위 제한) DOMPurify 다른 옵션 / 라이브러리 버전 / caller 측 사용 패턴은 본 게이트 범위 밖.
- [x] (Must, REQ-018 FR-03) DOMPurify import 단일 모듈 — §동작 (I7) + grep 1 hit 게이트 박제.
- [x] (Must, REQ-018 FR-04) hook upgrade `<a target='_blank'>` rel='noopener noreferrer' — §동작 (I8) + fixture `sanitizeHtml.test.ts:66-71` referer 박제.
- [x] (Must, REQ-018 FR-05) hook 멱등 + `removeHook` 부재 — §동작 (I9) + grep 1 hit (addHook) + 0 hit (removeHook) 게이트 박제.
- [x] (Should, REQ-018 FR-07) sanitize 멱등 — §동작 (I10) + fixture `sanitizeHtml.test.ts:88-93` referer 박제.
- [x] (Must, REQ-018 cross-surface) S1 단 (markdownParser) + S2 단 (본 spec) 2단 defense-in-depth — §동작 (I11) + 양 spec baseline 정합 박제. HEAD=`d4556b0` 재실측 양 단 rc=0.
- [ ] (Must, REQ-052 FR-02) 표 태그가 `ALLOWED_TAGS` 에 등재된다 — §동작 (I12). 판정: 위 §테스트 현황 (I12) 명령 → rc=0 (`table-tag-entries` ≥ 6). HEAD=`d4556b0` 실측 rc=1 (`table-tag-entries=0`).
- [x] (Must, REQ-052 NFR-01 정책 단일 출처) 표 태그 등재가 본 모듈 안에서만 이뤄진다 — 판정은 §테스트 현황 (I1) 명령이며 등재 후에도 rc=0 이어야 한다. HEAD=`d4556b0` 실측 rc=0.
- [x] (Must, REQ-052 NFR-02 속성 표면 무확장) `ALLOWED_ATTR` 7 항목이 유지되고 `style` 이 들어오지 않는다: `bash -c 'test "$(perl -0777 -ne "print \$1 if /const ALLOWED_ATTR\s*=\s*\[(.*?)\]/s" src/common/sanitizeHtml.ts | grep -oE "'\''[a-z]+'\''" | wc -l | tr -d " ")" -eq 7'` → HEAD=`d4556b0` 실측 rc=0.
- [x] (Must, 문면 정합) 본 spec 이 인용하는 정책 값·라인·게이트 명령이 현 HEAD 에서 참이다 — §참고 §blue 문면 drift 정정 의 4건이 전부 정정됐고 §테스트 현황 전수 재실행 rc 가 그 근거다.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`d4556b0`, 2026-08-31 재실측):
  - `perl -0777` 로 뽑은 `ALLOWED_TAGS`(`:7-15`) 항목 수 → **21**: `p` `br` `hr` `strong` `em` `del` `code` `pre` `blockquote` `h1` `h2` `h3` `h4` `h5` `h6` `ul` `ol` `li` `a` `img` `span`. `ALLOWED_ATTR`(`:17`) → **7**: `href` `src` `alt` `title` `target` `rel` `class`.
  - `grep -oE "'(table|thead|tbody|tr|th|td)'" src/common/sanitizeHtml.ts | wc -l` → **0**. (I12) 미충족 — 표 태그 하나도 없다.
  - `grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\."` → **2 hits**, 둘 다 주석 인용: `src/common/markdownParser.ts:455` (`// 스킴을 http/https/mailto 로 한정한다 — sanitize 의 ALLOWED_URI_REGEXP 와 …`) · `src/common/markdownParser.test.ts:296` (`// sanitize 의 ALLOWED_URI_REGEXP 와 정책을 맞춘다 …`). 주석 줄(`^<파일>:<번호>:<공백>*//`)을 걷어내면 **0 hit** 이며 그것이 (I1) 의 판정이다. 제외 규칙: 주석 인용은 정책을 정의·소비하지 않으므로 분기를 만들지 않는다.
  - `grep -nE "addHook\(.afterSanitizeAttributes." src/common/sanitizeHtml.ts` → 1 hit `:39`. `sed 's://.*::' … | grep -cE "removeHook"` → **0**. 주석 미제외 시 1 hit (`:34`).
  - `grep -nE "hookRegistered" src/common/sanitizeHtml.ts` → 3 hits (`:35` 선언 · `:37` 가드 · `:44` 설정).
  - `grep -rlE "import DOMPurify|from 'dompurify'" src` → 1 hit (`src/common/sanitizeHtml.ts:5`).
  - fixture pointer: `src/common/sanitizeHtml.test.ts:66` (rel upgrade) · `:88` (sanitize 멱등). 스위트 **17 tests** rc=0.
  - S1 단 fall-back: `grep -nF "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` → 1 hit `:471`.
  - **표 태그 미등재의 관측 결과** (격리 사본 `git archive` + `node_modules` 심볼릭 링크, repo 트리 무변경): `sanitizeHtml("<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>")` → **`"1"`**. 머리 셀 글자 `a` 마저 남지 않는다 — (I12) 가 왜 파서 쪽 계약과 분리돼야 하는지의 실물이다.
- **rationale**: (I1)(I3)(I4)(I6) 본 spec 박제 시점 PASS — 즉시 [x]. (I2) caller 측 게이트는 별 task 위임 (lint rule / 정적 분석 후보). (I5) fixture pointer 박제 — fixture 본문 검증은 별 spec (`src/common/sanitizeHtml.test.ts` referer). (I7)(I8)(I9)(I10) REQ-018 흡수 — S2 단 import 단일 모듈 + hook upgrade 양방향 + 멱등 + sanitize 멱등 4 게이트. (I11) cross-surface 2단 방어 baseline — `markdownParser.md` (I8)~(I10) S1 단 + 본 spec (I1)(I3)(I4)(I7)(I8)(I9) S2 단 양방향 정합 박제 (양 spec baseline 동시 활성 = defense-in-depth 활성).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — `src/common/sanitizeHtml.ts` 단일 모듈 정책 + DOM 주입 직전 sanitize 경유 + URI scheme 화이트리스트 + `<a target="_blank">` rel 자동 보정 + OWASP fixture pointer + 정책 변경 단일 진입점 6 축 (I1~I6) 게이트. baseline: ALLOWED_* 단일 모듈 정합 0 hit (외부 사용) / 18 ALLOWED_TAGS / 7 ALLOWED_ATTR / URI scheme 4 enum. 원전 REQ-20260418-001 NFR-01 보존. | all |
| 2026-05-18 | inspector 84차 tick (Phase 2, REQ-20260518-018 흡수) / pending | S2 단 sanitize cross-surface 효능 5 축 흡수 — (I7) DOMPurify import 단일 모듈 + (I8) hook upgrade 양방향 단조 강화 + (I9) hook 멱등 + `removeHook` 부재 + (I10) sanitize 멱등 + (I11) cross-surface 2단 방어 baseline. 양 spec 분담: `markdownParser.md` = S1 단 escape + S1↔S2 baseline literal / 본 spec = S2 단 + hook upgrade + 멱등. baseline (HEAD=`64d7432`): `grep -rln "import DOMPurify" src` = 1 hit + `grep -nE "addHook" sanitizeHtml.ts` = 1 hit + `grep -nE "removeHook"` = 0 hit + fixture 2 PASS (rel upgrade + idempotence). §역할 / §동작 (I7~I11) 5건 / §회귀 중점 5건 / §테스트 현황 5건 / §수용 기준 5건 / §스코프 규칙 grep-baseline (REQ-018) 5 추가. RULE-07 자기 검증 PASS — 평서형 + 반복 검증 가능 + 시점 비의존 + incident 비귀속. | §역할 §동작 §회귀 중점 §테스트 현황 §수용 기준 §스코프 규칙 |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | C단계 마커 회수 — RULE-07 §수용 기준 문장 규약 적용. 판정 가능한 항목은 실측·주입 근거와 함께 flip, 미래 사건·미측정 NFR·자명 명제·별 축 위임 항목은 §참고 §미측정·비판정 항목 으로 강등. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |
| 2026-08-31 | inspector 247차 tick (Phase 3, REQ-20260831-052 흡수 + blue 문면 drift 정정) / pending @ HEAD=`d4556b0` | blue→green 복사. (a) **drift 정정 4건** — D1 `ALLOWED_TAGS` 18→**21**, D2 `ALLOWED_URI_REGEXP` 값 갱신(상대경로 갈래 확장), D3 (I1) 판정을 주석 제외 형태로, D4 (I9) `removeHook` 판정을 주석 제외 형태로. **D3·D4 는 종전 명령이 현 HEAD 에서 rc≠0 이었다** — blue 에 승격된 채 판정 불가 상태였다. (b) **(I12) 표 태그 등재 축 흡수** (REQ-052 FR-02·NFR-01·NFR-02) — 짝 spec `markdown-pipe-table.md` 의 (I2) 가 이 축을 요구한다. §테스트 현황 전수 HEAD=`d4556b0` 재실행 (11 checked rc=0 · 1 unchecked rc=1) + §스코프 규칙 baseline 전면 재측정 + 라인 스냅샷 갱신(hook `:24-34`→`:36-45`, addHook `:30`→`:39`, rel fallback `markdownParser.ts:315`→`:471`, fixture `:66-71`→`:66`·`:88-93`→`:88`) + `## 참고` 중복 절 병합. | all |

- **REQ 원문**: REQ-20260418-001 (sanitize 단일 모듈 정책), REQ-20260517-076 (본 세션 mv 후 `60.done/2026/05/17/req/`).
- **관련 spec**:
  - `specs/30.spec/blue/common/markdownParser.md` (REQ-076 — 파싱 알고리즘 영역, 본 spec 의 input 생산자).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (DOMPurify 버전 정합 — 본 spec 과 직교).
- **외부 레퍼런스**: OWASP XSS Filter Evasion Cheat Sheet — 회귀 fixture 출처.
- **RULE 준수**:
  - RULE-07: 6 불변식 (I1~I6) 모두 시점 비의존 평서문 + `grep` 단일 명령 재현 가능.
  - RULE-06: grep-baseline 4 gate 실측 박제.
  - RULE-01: inspector writer 영역만.

## 참고

### blue 문면 drift 정정 (본 복사의 사유)

blue 에 승격돼 있던 문면 4곳이 현 코드와 어긋났다. 전부 HEAD=`d4556b0` 실측이며, **D3·D4 는 문면이 실은 명령 자체가 rc≠0 이라 판정 불가 상태였다** — 형식 조건만으로 승격이 결정되던 시기의 잔재다 (`RULE-07 §promote 조건` 말미의 지적과 같은 부류).

| ID | 종전 문면 | 실측 | 정정 |
|---|---|---|---|
| **D1** | `ALLOWED_TAGS` "18 항목" | **21 항목** | §공개 인터페이스 에 21개 전수 열거. 18 은 `h1`~`h6` 을 한 항목으로 센 오기이며 태그 집합 자체는 바뀌지 않았다 |
| **D2** | `ALLOWED_URI_REGEXP` = `/^(https?:\|mailto:\|\/\|#)/i` (`@:20`) | `/^(?:(?:https?\|mailto):\|[^a-z]\|[a-z+.-]+(?:[^a-z+.:-]\|$))/i` (`:31`) | §공개 인터페이스·(I3) 를 현 값과 세 갈래 해설로 교체. 종전 패턴은 `/` 로 시작하는 상대경로만 통과시켜 `[상대 경로](./other)` 의 `href` 를 통째로 지웠다 — 링크처럼 보이는데 눌러도 아무 일도 일어나지 않는 글자를 만들었고 그것이 교체의 계기다 |
| **D3** | (I1) `grep -rnE "ALLOWED_*" src \| grep -v "common/sanitizeHtml\."` → 0 hit | **2 hit** → 명령 rc≠0 | 주석 줄을 걷어내고 센다. 두 hit 은 `markdownParser.ts:455` · `markdownParser.test.ts:296` 의 **주석 인용**이며 정책을 정의·소비하지 않는다 |
| **D4** | (I9) `grep -nE "removeHook" src/common/sanitizeHtml.ts` → 0 hit | **1 hit** → 명령 rc≠0 | 주석을 걷어내고 센다. 그 hit 은 `:34` 의 `removeHook 호출하지 않는다` 라는 주석이다 |

**D3·D4 는 같은 부류다** — 식별자가 주석에 등장한다는 이유로 게이트가 붉어졌다. 이 저장소는 이미 그 판정을 내린 적이 있다: `handbuilt-control-rationale-truth.md` §(C-1) 이 "열거 고정 금지가 재려는 것은 도출 로직의 하드코딩이지 주석의 예시 언급이 아니다" 라고 적고, 판정 전에 주석을 걷어내는 형태(`sed 's://.*::'`)를 선례로 지목한다. 본 정정은 그 판정을 따른 것이며 **계약을 느슨하게 한 것이 아니다** — 정책 분기를 만드는 코드는 여전히 0 이어야 하고, 그 사실이 바뀌면 (I1)(I9) 은 그대로 붉어진다.

**정정하지 않은 것**: 라인 번호 스냅샷은 사실 갱신이라 drift 표에 넣지 않고 §변경 이력에만 적었다. 태그·속성 **집합**과 hook 의 동작은 어느 것도 바뀌지 않았다 — 바뀐 것은 문면과 판정 명령의 형태다.


### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- (I2) DOM 주입 직전 sanitize 경유: caller 측 게이트 (별 task 위임 — 정적 분석 / lint rule 후보).
- (Must, FR-02-b) markdownParser 산출 HTML 의 DOM 주입 직전 sanitize 경유 — caller 측 게이트 (별 task 위임 — lint rule / 정적 분석).
