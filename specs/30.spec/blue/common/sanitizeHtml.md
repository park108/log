# `src/common/sanitizeHtml.ts` — ALLOWED_* 단일 모듈 정책 + DOM 주입 전 sanitize 경유 불변식

> **위치**: `src/common/sanitizeHtml.ts` 의 `ALLOWED_TAGS`(`:7-15`) / `ALLOWED_ATTR`(`:17`) / `ALLOWED_URI_REGEXP`(`:31`) 정책 상수 + `sanitizeHtml` default export 진입점(`:48`) + `ensureHook` 멱등 가드 (`:36-45`) + `afterSanitizeAttributes` rel upgrade 본문(`:39-43`).
> **관련 요구사항**: REQ-20260418-001 NFR-01, REQ-20260517-076 FR-02, REQ-20260518-018 (S2 단 sanitize 단일 모듈 + hook upgrade 양방향 + 멱등 + cross-surface defense-in-depth), REQ-20260831-052 FR-02·NFR-01·NFR-02 (파이프 표 태그 등재 — §동작 (I12)), **REQ-20260831-056 FR-01~FR-05·NFR-01~NFR-03** (정책 표면 ↔ fixture 모집단 정합 — §동작 (I13) + (I6)(b) 판정 채널)
> **최종 업데이트**: 2026-08-31 (by inspector — REQ-20260831-056 흡수: (I13) 신설 + (I6) 판정 채널 부여, HEAD=`7b43fa8`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`7b43fa8`).

> **본 복사의 성격**: blue 문면이 현 코드와 어긋난 지점 4건이 실측으로 확인돼 blue→green 으로 내렸다 (inspector 는 blue 를 직접 편집하지 않는다 — `RULE-01`). 어긋남의 목록과 각각의 정정은 §참고 §blue 문면 drift 정정 에 있다. **그중 둘은 게이트 자체가 현 HEAD 에서 rc≠0 이었다** — 즉 blue 에 승격된 상태로 판정 불가였다.

## 역할
`markdownParser` 산출 HTML 의 **DOM 주입 직전 sanitize 경유** + **ALLOWED_TAGS / ALLOWED_ATTR / ALLOWED_URI_REGEXP 정책 상수의 단일 모듈 (`src/common/sanitizeHtml.ts`) 박제** 두 축 시스템 불변식. 의도적으로 하지 않는 것: DOMPurify 의 다른 옵션 (예: `WHOLE_DOCUMENT`, `SANITIZE_DOM`) 정책 (필요 시 별 spec), sanitize 호출 후 추가 변환 (caller 영역), sanitize 결과의 React `dangerouslySetInnerHTML` 사용 패턴 (caller 영역), DOMPurify 라이브러리 버전 정합 (`runtime-dep-version-coherence.md` 영역), XSS 회귀 fixture **본문** (`src/common/sanitizeHtml.test.ts` 영역 — 본 spec 은 fixture pointer 만 박제한다). **단 fixture 의 *모집단* 은 범위 안이다** — REQ-20260831-056 흡수로 (I13) 이 "정책에 등재된 태그를 fixture 가 실제로 통과시켜 보는가" 를 박제한다. 개별 벡터가 무엇인지는 여전히 fixture 소관이고, 정책 표면이 넓어질 때 모집단이 따라 넓어지는가는 본 spec 소관이다.

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
6. **(I6) 정책 변경 단일 진입점**: 신규 태그 / 속성 / URI scheme 도입 시 (a) `ALLOWED_*` 본문 수정 + (b) 회귀 fixture 갱신 동일 PR 정합. 두 파일 외부에서의 정책 우회 금지. **(a) 의 판정 채널은 (I1) 이고 (b) 의 판정 채널은 (I13) 이다** — 흡수 전에는 (b) 에 판정 채널이 아예 없었고 그 사실이 이 항목을 `[x]` 로 닫아 둔 채 방치했다 (REQ-20260831-056 (B3)).
7. **(I7) S2 단 DOMPurify import 단일 모듈 계약**: DOMPurify import 는 `src/common/sanitizeHtml.ts:5` 한정 — `grep -rln "import DOMPurify\|from 'dompurify'" src` = 1 hit. 다른 모듈 직접 import (예: 별 sanitizer wrapper, 별 도메인의 직접 호출) 금지 — sanitize 정책 단일 진입점 박제. dompurify ↔ 다른 sanitizer (sanitize-html / xss-filters) 로 swap 결정은 본 spec 비박제 (수단 중립) — swap 시 본 게이트 baseline 변경 자체가 spec 갱신 신호.
8. **(I8) hook upgrade `<a target='_blank'>` rel 양방향 단조 강화 계약**: `afterSanitizeAttributes` hook (`:39-43`) 이 `<a target="_blank">` 매치 시 `rel='noopener noreferrer'` 로 setAttribute. markdownParser 가 emit 한 `rel='noreferrer'` (`markdownParser.ts:471`) 는 본 hook 이 `rel='noopener noreferrer'` 로 덮어쓰는 **단조 강화 경로** — `noreferrer` 토큰은 양 단 모두 보존, `noopener` 토큰은 S2 단에서만 추가. fixture (`sanitizeHtml.test.ts:66` `"adds rel=noopener noreferrer to target=_blank anchor"`) 가 효능 잠금. markdownParser 단 fall-back `rel='noreferrer'` 부재 시에도 S2 hook 이 `<a target="_blank">` 발견 즉시 양방향 정합 유지.
9. **(I9) hook 등록 멱등 + `removeHook` 부재 계약**: `ensureHook()` (`:36-45`) 가 `hookRegistered` boolean 가드로 다중 호출 시 hook 추가 등록 0 — `addHook('afterSanitizeAttributes', …)` 등록 = 1 hit (`:39`). **`removeHook` 호출 부재** — 판정은 주석을 걷어낸 뒤 센다. 현 코드의 `:34` 는 `removeHook 호출하지 않는다` 라는 **주석**이며 호출이 아니다 (§참고 §blue 문면 drift 정정 D4). 멱등 깨짐 시 (예: `hookRegistered` 가드 제거 또는 `removeHook` 후 재등록) `rel` 속성 중첩 (`"noopener noreferrer noopener noreferrer"`) 회귀 표면. 가드 수단 (`hookRegistered` boolean / Set / WeakMap) 은 수단 중립 — 멱등 효능만 박제.
10. **(I10) sanitize 멱등 계약**: `sanitizeHtml(sanitizeHtml(x))` = `sanitizeHtml(x)` — 동일 입력 반복 sanitize 시 추가 escape / strip 0. fixture (`sanitizeHtml.test.ts:88` `"is idempotent (double sanitize equals single)"`) 가 효능 잠금. 본 효능은 sanitize 가 자체 출력을 재입력 받아도 새로 escape/strip 하지 않음을 보장 — caller 측 sanitize 중복 호출 (방어 코드) 안전성 baseline.
11. **(I11) cross-surface 2단 방어 defense-in-depth 계약**: S1 단 (`markdownParser.md` (I8)~(I10)) escape + S2 단 (본 spec (I1)(I3)(I4)(I7)(I8)(I9)) sanitize 양 단이 **독립적으로** XSS 회귀를 차단 — 어느 한 단이 회피·우회 되어도 다른 단이 차단. (a) markdownParser escape 누락 → DOMPurify 가 single-quoted attribute context 손상 emit 을 fix-up + ALLOWED_URI_REGEXP 가 `javascript:` 차단; (b) sanitize 우회 raw HTML 주입 → markdownParser 단 escape 함수(`escapeHtmlText` · `escapeHtmlQuotes` — 종전 문면의 `escapeHtmlAttr` 은 현 코드에 없다) 가 entity 변환 + `<a>` `rel='noreferrer'` fall-back 가 referrer leak 방어. 양 단 동시 회귀 시에만 XSS 진입 — 단 한 단 회귀 시 fail-safe 활성.

12. **(I12) 렌더 계약이 요구하는 태그는 정책에 등재된다 (REQ-20260831-052)**: 파서가 emit 하도록 계약된 태그가 `ALLOWED_TAGS` 에 없으면 그 구조는 DOM 주입 직전에 통째로 사라진다 — 파서 쪽 계약만으로는 화면에 닿지 않는다. 현재 그 상태에 있는 것이 **표 태그**다 (`table` `thead` `tbody` `tr` `th` `td` — 전부 0 hit). 등재는 (I1)(I6) 을 그대로 따른다: `src/common/sanitizeHtml.ts` 안에서만 바꾸고, 같은 변경에서 회귀 fixture 를 갱신하며, `ALLOWED_ATTR` 은 넓히지 않는다 (`style` 허용은 (I3) 계열 정책 확장이라 별 축). 무엇이 표로 렌더돼야 하는가는 본 spec 이 아니라 `specs/30.spec/green/common/markdown-pipe-table.md` 소관이며, 본 축은 **정책 쪽 조건**만 진다.

13. **(I13) 정책에 등재된 모든 태그는 fixture 가 실제로 통과시켜 본다 (REQ-20260831-056)**: `ALLOWED_TAGS` 의 각 항목에 대해, 그 태그를 담은 입력이 sanitize 를 지난 뒤에도 남는다는 것을 재는 단언이 **1건 이상** 존재한다. **판정 대상 태그 목록은 손으로 적은 열거가 아니라 정책 정의로부터 도출된다** (`RULE-06 §열거 고정 금지`). 도출이 공집합이면 게이트는 통과가 아니라 **무판정으로 실패**한다 — 정책 상수 이름이 바뀌어 도출이 비면 "위반 0" 과 "측정 0" 이 구별되지 않기 때문이다.

    **방어 대상**: `ALLOWED_TAGS` 가 넓어졌는데 그 태그를 실제로 통과시켜 보는 fixture 가 하나도 늘지 않아, "파서가 낸 태그가 sanitize 를 지나 살아남는가" 가 그 축에서 **무측정**으로 남는 상태. 무측정이 감추는 회귀의 사용자 관측 결과는 **글자 소실**이다 — (I12) 의 실측(`"1"`, 머리 셀 글자마저 소멸)이 그 실물이다. 이 축이 필요한 이유는 현재 그 검출력이 **0** 이라는 실측이다: 격리 사본에서 `ALLOWED_TAGS` 에 표 6 태그를 한 줄로 더하고 전체 스위트를 돌린 결과 붉어진 게이트가 **0건**이었다 (`Test Files 116 passed / Tests 1277 passed | 12 skipped`). 정책 표면이 6 태그만큼 넓어졌는데 그것을 관측하는 채널이 저장소에 하나도 없다.

    **현재 참이지만 아무것도 붙들고 있지 않다**: corpus 가 내는 태그 집합과 `ALLOWED_TAGS` 21항목을 대조하면 `ALLOWED_TAGS-not-emitted-by-corpus` 는 **0** 이다. 정합이 **지금 참인 것**과 **위반이 검출되는 것**은 다르며, 이 항목이 재는 것은 후자다.

    **(I12) 와의 관계**: (I12) 는 **무엇이 등재돼야 하는가**, (I13) 은 **등재가 측정되는가** 다. 표 태그 6건 등재가 곧 이 경로를 지나므로 (I13) 의 첫 소비자는 (I12) 이며, 그 시점에 표 6 태그는 **corpus 에 손으로 행을 추가하는 것에 의존하지 않고** 자동으로 판정 모집단에 들어와야 한다.

    **(I1) 과의 경계**: (I13) 의 도출은 (I1) 을 위반하지 않는다. 정책 상수를 다른 모듈에서 **재정의**하는 형태는 불가하며, 참조가 필요하면 (I1) 문면과 그 게이트를 함께 조정한다 — 현 (I1) 판정 명령이 `src/common/sanitizeHtml.*` 밖의 **정의·소비**를 0 으로 막고 있으므로, export 경로를 택하면 그 조정이 선행 조건이다. 도출 수단(상수 export · 소스 파싱 · 게이트 배치 파일)은 지정하지 않는다.

### 회귀 중점
- 외부 모듈이 `ALLOWED_TAGS` 등을 `export` 추가 후 import 하면 (I1) 위반 — 정책 분기 위험.
- 파서가 표를 emit 하는데 `ALLOWED_TAGS` 등재가 없으면 (I12) 위반 — 통과하지 못하는 구조는 렌더된 것이 아니다. 실측상 머리 셀의 글자마저 남지 않는다 (§스코프 규칙).
- caller 가 `markdownParser` 결과를 sanitize 우회 후 `dangerouslySetInnerHTML` 직접 주입 시 (I2) 위반 — XSS 진입 표면.
- `ALLOWED_URI_REGEXP` 에 `javascript:` / `data:` 추가 시 (I3) 위반 — 활성 콘텐츠 진입 표면.
- `afterSanitizeAttributes` 훅 본문에서 `<a target="_blank">` rel 자동 보정 로직 제거 시 (I4) 위반 — `noopener noreferrer` 누락으로 tabnabbing 표면.
- 신규 태그 도입 시 fixture 갱신 누락 (I6)(b)·(I13) 위반 — 회귀 감지 누락. **흡수 전에는 이 위반이 어떤 게이트도 붉히지 않았다** (실측: 표 6 태그 추가 시 전체 스위트 116 파일 전수 초록). (I13) 이 그 채널이다.
- (I13) 의 모집단 도출이 **공집합이 되는 방향**이 이 축의 조용한 실패다 — 정책 상수 이름 변경·게이트 이동으로 도출이 비면 단언이 0건 실행되고 게이트는 초록을 낸다. 공집합은 통과가 아니라 무판정 실패여야 한다.
- (I13) 을 손으로 적은 태그 목록으로 구현하면 (I12) 등재 시점에 그 목록이 따라오지 않아 다시 무측정이 된다 — 현 `parser-sanitizer-coherence.test.ts` 의 하드코딩 열거 1건이 정확히 그 형태다 (baseline).
- DOMPurify 가 `dependencies` 에서 제거되거나 다른 sanitizer 로 swap 시 (I7) 위반 — `src/common/sanitizeHtml.ts:5` import 변경 + 정책 토큰 호환성 미보장 → spec 갱신 신호 (수단 중립 박제).
- markdownParser 단 `rel='noreferrer'` 제거 → S2 hook 이 여전히 upgrade 하나, sanitize 미경유 raw HTML 주입 경로의 fall-back 무력화 시 (I8) 위반 — cross-surface 양방향 정합 깨짐.
- `hookRegistered` 가드 제거 또는 `removeHook` 호출 도입 시 (I9) 위반 — hook 중첩 등록으로 `rel` 속성 중첩 (`"noopener noreferrer noopener noreferrer"`) 회귀.
- sanitize 가 자체 출력 재입력 시 추가 escape / strip (예: DOMPurify 메이저 bump 의 정책 변경) 발생 시 (I10) 위반 — caller 측 방어 코드 (sanitize 중복 호출) 비정합.
- S1 단 (markdownParser escape) + S2 단 (sanitize 정책) 동시 회귀 시 (I11) 위반 — defense-in-depth 양 단 동시 무력화 = XSS 진입 (단 한 단 회귀 만으로는 fail-safe 활성).

## 의존성
- 내부: `src/common/sanitizeHtml.ts` (단일 진입점), `src/common/markdownParser.ts` (입력), `src/common/sanitizeHtml.test.ts` (회귀 fixture).
- **소유 게이트 (REQ-056 흡수로 확정)**: `src/__tests__/parser-sanitizer-coherence.test.ts` — 파서 산출과 sanitize 정책의 정합을 재는 교차 게이트다. 흡수 전까지 **어떤 spec 에도 소유되지 않았다** (`grep -rln "parser-sanitizer-coherence" specs/30.spec/` → 0 hit). 소유자가 없으면 그 게이트의 하드코딩 열거·검출력 0 을 아무도 재지 않으므로 본 spec 이 (I13) 과 함께 소유를 진다. 다만 **(I13) 의 게이트를 이 파일에 두어야 한다는 뜻은 아니다** — 배치는 수단이다.
- 외부: `dompurify` (devDep / dep — `runtime-dep-version-coherence.md` 영역).
- 역의존 (사용처): markdownParser 결과를 DOM 에 주입하는 모든 caller (Log / Comment 등 도메인 모듈 — caller 측은 sanitize 호출 의무).
- 직교: `markdownParser.md` (파싱 알고리즘 영역), `runtime-dep-version-coherence.md` (dompurify 버전 정합).

## 테스트 현황

> 아래 rc 는 전부 HEAD=`7b43fa8` 에서 **파일에서 추출해** 재실행한 결과다 (손 전사 0 — `RULE-06 §추출 실패 검출`). 종전 문면의 `893cdea`/`64d7432` 스탬프와 갈리는 지점은 §참고 §blue 문면 drift 정정 에 사유를 적었다.

- [x] (I1) 단일 모듈 정책: `bash -c 'test "$(grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\." | grep -vcE "^[^:]+:[0-9]+:[[:space:]]*(//|\*)")" -eq 0'` → HEAD=`7b43fa8` 재실측 rc=0. **종전 문면의 명령(주석 미제외)은 현 HEAD 에서 2 hit 이라 rc≠0 이었다** — 두 hit 은 `markdownParser.ts:455` 와 `markdownParser.test.ts:298` 의 주석 인용이며 정책 분기가 아니다 (drift D3).
- [x] (I3) 활성 콘텐츠 scheme 차단: `bash -c '! grep -nE "ALLOWED_URI_REGEXP[^;]*(javascript|vbscript)" src/common/sanitizeHtml.ts'` → HEAD=`7b43fa8` 재실측 rc=0. 현 패턴은 `:31` 이며 값은 §공개 인터페이스 참조 (drift D2).
- [x] (I4) `<a target="_blank">` rel 자동 보정: `bash -c 'test "$(grep -cE "afterSanitizeAttributes|noopener noreferrer" src/common/sanitizeHtml.ts)" -ge 2'` → HEAD=`7b43fa8` 재실측 rc=0 (훅 등록 `:39` + rel 부여 `:41`).
- [x] (I5) OWASP XSS Filter Evasion fixture: `src/common/sanitizeHtml.test.ts` 실재 + 대표 벡터 박제. **측정**: `bash -c 'npx vitest run src/common/sanitizeHtml.test.ts >/dev/null 2>&1'` → HEAD=`7b43fa8` 재실측 rc=0 (**17 tests**). fixture 본문 검증은 그 파일 소관 — 본 spec 은 pointer 만 박제한다.
- [x] (I6) 정책 변경 단일 진입점 — **(a) 와 (b) 를 모두 재는 접속**: `bash -c 'test "$(grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\." | grep -vcE "^[^:]+:[0-9]+:[[:space:]]*(//|\*)")" -eq 0 && set -- $(grep -rl "허용 목록의 모든 태그가 sanitize 를 통과한다" src 2>/dev/null) && test "$#" -ge 1'` → HEAD=`25f6013` 재실측 **rc=0 (충족)**. `TSK-20260831-16`(`4537052`) 이 (b) 채널을 `src/__tests__/parser-sanitizer-coherence.test.ts` 에 세웠다. (a) 등재 위치는 (I1) 이 재고 rc=0 이다. **(b) 회귀 fixture 동반 갱신을 재는 실행 가능한 명령이 흡수 전까지 이 줄에 없었고, 그럼에도 항목은 `[x]` 였다** — `RULE-07 §promote 조건` 이 겨누는 "형식 조건만으로 통과한 항목" 이 정확히 이 줄이었다 (REQ-056 (B3) 가 명령 부재를 실측했다).
- [x] (I7) DOMPurify import 단일 모듈: `bash -c 'test "$(grep -rlE "import DOMPurify|from .dompurify." src | wc -l | tr -d " ")" -eq 1'` → HEAD=`7b43fa8` 재실측 rc=0 (`src/common/sanitizeHtml.ts:5`).
- [x] (I8) hook upgrade `<a target='_blank'>` rel 양방향: `bash -c 'grep -qF "adds rel=noopener noreferrer to target=_blank anchor" src/common/sanitizeHtml.test.ts'` → HEAD=`7b43fa8` 재실측 rc=0 (`:66`). S1 단 fall-back 실재도 확인: `bash -c 'grep -qF "target='\''_blank'\'' rel='\''noreferrer'\''" src/common/markdownParser.ts'` → rc=0 (`markdownParser.ts:471`).
- [x] (I9) hook 멱등 + `removeHook` 부재: `bash -c 'test "$(grep -cE "addHook\(.afterSanitizeAttributes." src/common/sanitizeHtml.ts)" -eq 1 && test "$(sed "s://.*::" src/common/sanitizeHtml.ts | grep -cE "removeHook")" -eq 0 && test "$(grep -cE "hookRegistered" src/common/sanitizeHtml.ts)" -ge 2'` → HEAD=`7b43fa8` 재실측 rc=0 (addHook `:39` · removeHook 호출 0 · 가드 `:35`·`:37`·`:44`). **종전 문면의 `removeHook` 0 hit 명령은 현 HEAD 에서 1 hit 이라 rc≠0 이었다** — 그 hit 은 `:34` 의 주석 `removeHook 호출하지 않는다` 이며 호출이 아니다 (drift D4).
- [x] (I10) sanitize 멱등: `bash -c 'grep -qF "is idempotent (double sanitize equals single)" src/common/sanitizeHtml.test.ts'` → HEAD=`7b43fa8` 재실측 rc=0 (`:88`), 스위트 rc=0.
- [x] (I11) cross-surface 2단 방어 baseline — **양 단이 동시에 활성이라는 것이 명제이므로 하나의 접속 명령으로 닫는다**: `bash -c 'p=src/common/markdownParser.ts; s=src/common/sanitizeHtml.ts; test -f "$p" -a -f "$s" || exit 2; test "$(grep -rlE "const escapeHtml(Text|Quotes)[[:space:]]*=" src | wc -l | tr -d " ")" -eq 1 && test "$(grep -cE "escapeHtmlQuotes\(" "$p")" -ge 5 && test "$(grep -cF "target='"'"'_blank'"'"' rel='"'"'noreferrer'"'"'" "$p")" -ge 1 && test "$(grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\." | grep -vcE "^[^:]+:[0-9]+:[[:space:]]*(//|\*)")" -eq 0 && ! grep -qE "ALLOWED_URI_REGEXP[^;]*(javascript|vbscript)" "$s" && test "$(grep -cE "afterSanitizeAttributes|noopener noreferrer" "$s")" -ge 2 && test "$(grep -rlE "import DOMPurify|from .dompurify." src | wc -l | tr -d " ")" -eq 1 && test "$(grep -cE "addHook\(.afterSanitizeAttributes." "$s")" -eq 1 && test "$(sed "s://.*::" "$s" | grep -cE "removeHook")" -eq 0'` → HEAD=`8d030ce` 본 tick 실측 **rc=0**. S1 단 3항(escape 단일 모듈 · `escapeHtmlQuotes` 호출 ≥5줄 · `rel='noreferrer'` fall-back 리터럴)과 S2 단 6항((I1) 정책 단일 출처 · (I3) 활성 scheme 차단 · (I4) rel 자동 보정 · (I7) DOMPurify import 단일 모듈 · (I8)(I9) hook 등록 1회 + `removeHook` 호출 0)을 한 사슬에 둔다. **흡수 전까지 이 항목에는 명령이 없었고 그럼에도 `[x]` 였다** — 개별 항이 각각 rc=0 이라는 관찰을 사람이 이어 붙인 산문이었으며, `RULE-07 §promote 조건 2`(측정 명령 전수 재실행)를 채울 수 없어 promote 시점에 거부됐을 항목이다. **접속으로 닫는 이유**: 두 단은 서로를 대체하지 않는다 — S1 이 escape 로 막고 S2 가 sanitize 로 막는 2단 방어에서 한 단만 살아 있어도 개별 항목은 전부 초록으로 보인다. **판정면은 두 단의 동시 활성이지 정책 항목 수가 아니다** — `ALLOWED_TAGS` 에 항목이 늘거나 주는 것은 이 항목이 재는 축이 아니며 (`정책 항목 수 — 태그`)·(`REQ-052 NFR-02`) 소관이다. **왕복 실측 (본 tick, 격리 사본 `git archive 8d030ce` + `node_modules` 심볼릭 링크; 메인 트리 `src` 쓰기 0)**: 주입 3방향 전건 `rc≠0` 검출 — Dir-1 `escapeHtmlQuotes` 호출 줄 `:597` 제거(5→4줄) · Dir-2 `ALLOWED_TAGS` 정책 토큰을 `markdownParser.ts` 로 유출 · Dir-3 `addHook('afterSanitizeAttributes')` 중복 등록(1→2). 음성 대조 2건 전건 `rc=0` 유지 — Ctrl-1 `ALLOWED_TAGS` 에 항목 1개 추가(범위 밖 축) · Ctrl-2 `markdownParser.ts` 주석에 정책 토큰 인용(분기 아님). 각 왕복 후 원복 `rc=0` 확인. **Dir-1 이 처음 두 번 검출되지 않은 것이 이 왕복의 산출이다** — 게이트가 세는 단위는 호출 **지점**이 아니라 **줄**이고 `:596` 에는 지점이 2개라, 한 지점만 지우면 줄 계수가 줄지 않는다. 지점 단위 주입은 이 게이트에 보이지 않는다.
- [x] (정책 항목 수 — 태그) `ALLOWED_TAGS` **27**: `bash -c 'test "$(perl -0777 -ne "print \$1 if /const ALLOWED_TAGS\s*=\s*\[(.*?)\]/s" src/common/sanitizeHtml.ts | grep -oE "'\''[a-z0-9]+'\''" | wc -l | tr -d " ")" -eq 27'` → HEAD=`25f6013` 재실측 rc=0. **본 tick 안에서 21 → 27 로 늘었다** — `TSK-20260831-17`(`d98815d`) 이 표 6태그를 등재했고, `-eq 21` 이던 종전 명령은 착지 직후 **rc=1** 이 됐다 (재실행으로 검출). 정합이 깨진 것이 아니라 **계약이 의도대로 착지한 결과 고정 기대값이 낡은 것**이며, 이 부류는 매 착지마다 재실행 없이는 보이지 않는다. 종전 문면의 "18 항목" 은 오기였다 (drift D1). **종전 라벨은 `ALLOWED_ATTR` 7 도 함께 잰다고 적었으나 명령은 `ALLOWED_TAGS` 만 센다** — 라벨을 명령에 맞춰 좁혔다 (drift D5, 2026-08-31 발견). 속성 개수는 아래 `(Must, REQ-052 NFR-02 속성 표면 무확장)` 이 잰다.
- [x] (I12) 표 태그 등재: `bash -c 'f=src/common/sanitizeHtml.ts; grep -q "ALLOWED_TAGS" "$f" || exit 2; n=$(grep -oE "'\''(table|thead|tbody|tr|th|td)'\''" "$f" | wc -l | tr -d " "); echo "table-tag-entries=$n"; [ "$n" -ge 6 ]'` → HEAD=`25f6013` 재실측 **rc=0**, 출력 `table-tag-entries=6`. `TSK-20260831-17`(`d98815d`) 착지. 파일에 `ALLOWED_TAGS` 가 없으면 `exit 2` 로 무판정 (공허 통과 차단).
- [x] (I13) 정책 커버리지 계약이 게이트로 실재하고 **초록이다** — 게이트 배치 파일은 도출한다: `bash -c 'set -- $(grep -rl "허용 목록의 모든 태그가 sanitize 를 통과한다" src 2>/dev/null); test "$#" -ge 1 || exit 2; echo "gate-files=$#"; npx vitest run "$@" -t "허용 목록의 모든 태그가 sanitize 를 통과한다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`25f6013` 재실측 **rc=0**, 출력 `gate-files=1` (`src/__tests__/parser-sanitizer-coherence.test.ts`). **경로를 못 박지 않고 도출한 판단이 값을 냈다** — developer 가 게이트를 `sanitizeHtml.test.ts` 가 아니라 정합 스위트에 두었고, 경로를 고정했다면 이 항목은 착지했는데도 붉었을 것이다. **`exit 2` 로 닫는 이유**: `-t` 는 이름 미매치 시 단독으로 rc=0 을 내므로, 파일 도출을 선행 조건으로 두지 않으면 "게이트가 없다" 가 "통과" 로 읽힌다. 계약 이름은 본 spec 이 확정한 식별자이며 **어느 파일에 두는지는 수단이다** — 그래서 경로를 못 박지 않고 도출한다.
- [x] (I13 모집단 비공허 baseline) 현 corpus 가 13행 이상으로 실재한다 — 도출이 이 모집단을 대체하더라도 공집합이 되면 안 된다: `bash -c 'f=src/__tests__/parser-sanitizer-coherence.test.ts; n=$(perl -0777 -ne "print \$1 if /const corpus[^=]*=\s*\[(.*?)\n\];/s" "$f" | grep -cE "^\s*\["); echo "corpus-rows=$n"; [ "$n" -ge 13 ]'` → HEAD=`7b43fa8` 실측 rc=0, 출력 `corpus-rows=13`.
- [x] (I13 NFR-02 대조 보존) 허용 밖 태그 대조의 예시가 **정책이 바뀔 축 밖**에 있다: `bash -c 'f=src/__tests__/parser-sanitizer-coherence.test.ts; g=src/common/sanitizeHtml.ts; grep -qF "not.toContain(" "$f" || exit 2; grep -qF "iframe" "$f" && ! grep -qE "'\''iframe'\''" "$g"'` → HEAD=`7b43fa8` 실측 rc=0. 운영자 커밋 `a13de9a` 가 이 예시를 `<table>` → `<iframe>` 으로 옮겼다 — (I12) 가 표를 등재하는 순간 `<table>` 예시는 "허용 밖" 이기를 그치기 때문이다. **되돌리지 않는다.**
- [x] (I13 비퇴행 baseline) 정합 게이트 두 파일이 초록이다: `bash -c 'npx vitest run src/__tests__/parser-sanitizer-coherence.test.ts src/common/sanitizeHtml.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`7b43fa8` 실측 rc=0 (15 + 17 tests). 기존 단언 완화로 (I13) 을 해결하지 않는다.

## 수용 기준
- [x] (Must, FR-02-a) ALLOWED_TAGS / ALLOWED_ATTR / ALLOWED_URI_REGEXP 3 상수 단일 모듈 박제 — §동작 (I1) + grep 0 hit 게이트.
- [x] (Must, FR-02-c) OWASP XSS Filter Evasion 10 대표 벡터 회귀 fixture pointer — `src/common/sanitizeHtml.test.ts` referer 박제 (본 spec §동작 I5). — **측정**: fixture pointer 박제 완료.
- [x] (Should) URI scheme 화이트리스트 + `<a target="_blank">` rel 자동 보정 — §동작 (I3)(I4) 박제.
- [x] (Must, 범위 제한) DOMPurify 다른 옵션 / 라이브러리 버전 / caller 측 사용 패턴은 본 게이트 범위 밖.
- [x] (Must, REQ-018 FR-03) DOMPurify import 단일 모듈 — §동작 (I7) + grep 1 hit 게이트 박제.
- [x] (Must, REQ-018 FR-04) hook upgrade `<a target='_blank'>` rel='noopener noreferrer' — §동작 (I8) + fixture `sanitizeHtml.test.ts:66-71` referer 박제.
- [x] (Must, REQ-018 FR-05) hook 멱등 + `removeHook` 부재 — §동작 (I9) + grep 1 hit (addHook) + 0 hit (removeHook) 게이트 박제.
- [x] (Should, REQ-018 FR-07) sanitize 멱등 — §동작 (I10) + fixture `sanitizeHtml.test.ts:88-93` referer 박제.
- [x] (Must, REQ-018 cross-surface) S1 단 (markdownParser) + S2 단 (본 spec) 2단 defense-in-depth — 위 §테스트 현황 (I11) 명령 → rc=0. HEAD=`8d030ce` 본 tick 실측 rc=0. **흡수 전 이 항목은 판정 명령 없이 `[x]` 였다** — (I11) 접속 명령을 세워 `RULE-07 §promote 조건 2` 를 채웠다.
- [x] (Must, REQ-052 FR-02) 표 태그가 `ALLOWED_TAGS` 에 등재된다 — §동작 (I12). 판정: 위 §테스트 현황 (I12) 명령 → rc=0 (`table-tag-entries` ≥ 6). HEAD=`25f6013` 재실측 rc=0 (`table-tag-entries=6`, `TSK-20260831-17` / `d98815d`).
- [x] (Must, REQ-052 NFR-01 정책 단일 출처) 표 태그 등재가 본 모듈 안에서만 이뤄진다 — 판정은 §테스트 현황 (I1) 명령이며 등재 후에도 rc=0 이어야 한다. HEAD=`7b43fa8` 재실측 rc=0.
- [x] (Must, REQ-052 NFR-02 속성 표면 무확장) `ALLOWED_ATTR` 7 항목이 유지되고 `style` 이 들어오지 않는다: `bash -c 'test "$(perl -0777 -ne "print \$1 if /const ALLOWED_ATTR\s*=\s*\[(.*?)\]/s" src/common/sanitizeHtml.ts | grep -oE "'\''[a-z]+'\''" | wc -l | tr -d " ")" -eq 7'` → HEAD=`7b43fa8` 재실측 rc=0.
- [x] (Must, REQ-056 FR-01·FR-02) 정책 커버리지 계약이 게이트로 실재하고 초록이다 — 위 §테스트 현황 (I13) 명령 → rc=0. HEAD=`25f6013` 재실측 rc=0 (`gate-files=1`, `TSK-20260831-16` / `4537052`).
- [x] (Must, REQ-056 FR-03) §동작 (I6) 의 (a)(b) 두 조건이 하나의 명령으로 판정된다 — 위 §테스트 현황 (I6) 명령 → rc=0. HEAD=`25f6013` 재실측 rc=0. **이 항목은 REQ-056 흡수로 `[x]` → `[ ]` 로 되돌아갔다가 채널 착지로 다시 `[x]` 가 됐다** — 되돌린 판단이 옳았다는 것이 여기서 확인된다. 명령 없이 `[x]` 로 두었다면 채널 부재가 통과로 읽힌 채 승격됐을 것이다.
- [x] (Must, REQ-056 FR-04 현행 PASS) (I13) 의 도출이 정책 단일 출처를 깨지 않는다 — 판정은 위 §테스트 현황 (I1) 명령이며 도출 도입 후에도 rc=0 이어야 한다. HEAD=`7b43fa8` 실측 rc=0. 정책 상수를 다른 모듈에서 **재정의**하는 형태는 불가하고, export 경로를 택하면 (I1) 문면과 그 게이트를 함께 조정해야 한다.
- [x] (Must, REQ-056 NFR-01 비퇴행) 위 §테스트 현황 (I13 비퇴행 baseline) 명령 → rc=0. HEAD=`7b43fa8` 실측 rc=0 (15 + 17 tests). 기존 단언 완화로 해결하지 않는다.
- [x] (Must, REQ-056 NFR-02 보존) 위 §테스트 현황 (I13 NFR-02 대조 보존) 명령 → rc=0. HEAD=`7b43fa8` 실측 rc=0.
- [x] (Must, REQ-056 NFR-03 범위 제한) `ALLOWED_ATTR`(7항목) · `ALLOWED_URI_REGEXP` 무변경 — 판정은 위 §수용 기준 REQ-052 NFR-02 명령과 §테스트 현황 (I3) 명령이며 둘 다 HEAD=`7b43fa8` 실측 rc=0. **속성·스킴 축의 같은 부류 구멍은 재지 않았다** — 본 흡수는 태그 축 한정이며 두 축은 별 req 로 분리한다 (§참고 §미측정).
- [x] (Must, 문면 정합) 본 spec 이 인용하는 정책 값·라인·게이트 명령이 현 HEAD 에서 참이다 — §참고 §blue 문면 drift 정정 의 4건이 전부 정정됐고 §테스트 현황 전수 재실행 rc 가 그 근거다.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`7b43fa8`, 2026-08-31 재실측):
  - `perl -0777` 로 뽑은 `ALLOWED_TAGS`(`:7-15`) 항목 수 → **21**: `p` `br` `hr` `strong` `em` `del` `code` `pre` `blockquote` `h1` `h2` `h3` `h4` `h5` `h6` `ul` `ol` `li` `a` `img` `span`. `ALLOWED_ATTR`(`:17`) → **7**: `href` `src` `alt` `title` `target` `rel` `class`.
  - `grep -oE "'(table|thead|tbody|tr|th|td)'" src/common/sanitizeHtml.ts | wc -l` → **0**. (I12) 미충족 — 표 태그 하나도 없다.
  - `grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\."` → **2 hits**, 둘 다 주석 인용: `src/common/markdownParser.ts:455` (`// 스킴을 http/https/mailto 로 한정한다 — sanitize 의 ALLOWED_URI_REGEXP 와 …`) · `src/common/markdownParser.test.ts:298` (`// sanitize 의 ALLOWED_URI_REGEXP 와 정책을 맞춘다 …`). 주석 줄(`^<파일>:<번호>:<공백>*//`)을 걷어내면 **0 hit** 이며 그것이 (I1) 의 판정이다. 제외 규칙: 주석 인용은 정책을 정의·소비하지 않으므로 분기를 만들지 않는다.
  - `grep -nE "addHook\(.afterSanitizeAttributes." src/common/sanitizeHtml.ts` → 1 hit `:39`. `sed 's://.*::' … | grep -cE "removeHook"` → **0**. 주석 미제외 시 1 hit (`:34`).
  - `grep -nE "hookRegistered" src/common/sanitizeHtml.ts` → 3 hits (`:35` 선언 · `:37` 가드 · `:44` 설정).
  - `grep -rlE "import DOMPurify|from 'dompurify'" src` → 1 hit (`src/common/sanitizeHtml.ts:5`).
  - fixture pointer: `src/common/sanitizeHtml.test.ts:66` (rel upgrade) · `:88` (sanitize 멱등). 스위트 **17 tests** rc=0.
  - S1 단 fall-back: `grep -nF "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` → 1 hit `:471`.
  - **(I13) 검출력 0 실측** (격리 사본, repo 트리 무변경): `ALLOWED_TAGS` 에 표 6 태그(`table` `thead` `tbody` `tr` `th` `td`)를 **한 줄로 추가**하고 전체 스위트를 돌린 결과 → `Test Files 116 passed (116) / Tests 1277 passed | 12 skipped (1289)`. **붉어진 게이트 0건.** 개별로도 `parser-sanitizer-coherence.test.ts` · `sanitizeHtml.test.ts` · `markdown-no-character-loss.test.ts` 전부 rc=0. 정책 표면이 6 태그만큼 넓어졌는데 그 사실을 관측하는 채널이 저장소에 하나도 없다.
  - **하드코딩 열거 실재**: `grep -cE "const expected of \[" src/__tests__/parser-sanitizer-coherence.test.ts` → **1** (완전성 보조 단언 **0**). 이 열거는 손으로 적은 17 태그를 기대값으로 쓰므로 정책이 21에서 27로 늘어도 계속 17만 확인한다 — `RULE-06 §열거 고정 금지` 가 겨누는 형태다. (I13) 의 도출은 이 열거를 대체하거나 완전성 보조 단언을 덧붙여야 한다.
  - **현 정합은 참이다** (그러나 아무것도 붙들고 있지 않다): corpus 가 내는 태그 집합 21건이 `ALLOWED_TAGS` 21항목을 정확히 덮으며 `ALLOWED_TAGS-not-emitted-by-corpus` 는 **0**. `corpus-rows=13`. 정합이 **지금 참인 것**과 **위반이 검출되는 것**은 다르고, 바로 위 검출력 0 실측이 후자가 없음을 보인다.
  - **계약 이름 부재**: `grep -rl "허용 목록의 모든 태그가 sanitize 를 통과한다" src` → **0 파일**. 신설 대상이다. **이 이름은 원 req 가 제시한 `허용 목록의 모든 태그를 corpus 가 낸다` 와 다르다** — 후자는 "corpus 행" 이라는 수단을 이름에 박아 넣는데, 같은 req 의 §미측정 이 "fixture 가 통과시켜 본다 의 최소 형태는 정하지 않는다" 고 선언했다. 이름은 계약의 손잡이이므로 수단 중립으로 확정한다.
  - **게이트 소유 부재**: `grep -rln "parser-sanitizer-coherence" specs/30.spec/` → 흡수 전 **0 hit**. 본 spec 이 §의존성 에서 소유를 진다.
  - **표 태그 미등재의 관측 결과** (격리 사본 `git archive` + `node_modules` 심볼릭 링크, repo 트리 무변경): `sanitizeHtml("<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>")` → **`"1"`**. 머리 셀 글자 `a` 마저 남지 않는다 — (I12) 가 왜 파서 쪽 계약과 분리돼야 하는지의 실물이다.
- **rationale**: (I1)(I3)(I4) 본 spec 박제 시점 PASS — 즉시 [x]. **(I6) 은 흡수로 `[x]` → `[ ]` 로 되돌아갔다** — (b) 를 재는 채널이 없었는데 `[x]` 였기 때문이며, 마커를 되돌리는 방향의 정정이라 promote 를 늦춘다. 그것이 옳은 방향이다: 판정되지 않는 항목을 통과로 세면 promote 조건이 형식 조건으로 되돌아간다. (I2) caller 측 게이트는 별 task 위임 (lint rule / 정적 분석 후보). (I5) fixture pointer 박제 — fixture 본문 검증은 별 spec (`src/common/sanitizeHtml.test.ts` referer). (I7)(I8)(I9)(I10) REQ-018 흡수 — S2 단 import 단일 모듈 + hook upgrade 양방향 + 멱등 + sanitize 멱등 4 게이트. (I11) cross-surface 2단 방어 baseline — `markdownParser.md` (I8)~(I10) S1 단 + 본 spec (I1)(I3)(I4)(I7)(I8)(I9) S2 단 양방향 정합 박제 (양 spec baseline 동시 활성 = defense-in-depth 활성).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector 253차 tick (Phase 2 판정 가능성 정정) / — @ HEAD=`8d030ce` | **(I11) 에 판정 명령 신설 — 마커 플립 0, 판정 가능성 +2 항목.** (I11) 과 §수용 기준 `(Must, REQ-018 cross-surface)` 는 **명령 없이 `[x]`** 였다. "양 단 게이트 전수 rc=0" 이라는 산문은 사람이 개별 항목의 관찰을 이어 붙인 것이지 재실행 가능한 판정이 아니며, `RULE-07 §promote 조건 2` 가 요구하는 전수 재실행에서 이 두 줄은 실행할 명령이 없어 promote 를 거부시켰을 자리다 (planner 가 252차 산출에서 지목). **개별 항목이 이미 rc=0 인데 왜 중복 게이트가 아닌가**: (I11) 의 명제는 각 항의 참이 아니라 **두 단의 동시 활성**이다. 2단 방어에서 한 단이 통째로 죽어도 살아 있는 단의 항목들은 전부 초록으로 보이며, 그 상태를 붉히는 것은 접속뿐이다. 그래서 개별 항 9개를 한 사슬로 묶었다. **왕복 실측 (격리 사본)**: 주입 **3/3 detect** (Dir-1 `escapeHtmlQuotes` 호출 줄 제거 · Dir-2 정책 토큰 유출 · Dir-3 hook 중복 등록) · 음성 대조 **2/2 pass** (Ctrl-1 `ALLOWED_TAGS` 항목 수 변경 · Ctrl-2 주석 안 정책 토큰 인용). **Dir-1 이 두 번 미검출된 것을 기록한다** — 게이트의 계수 단위가 호출 **지점**이 아니라 **줄**이라 지점 2개가 한 줄에 있는 `:596` 에서 한 지점만 지우면 계수가 줄지 않는다. 게이트의 실제 해상도이며 (I11) 문면에 박제했다. **외부 관측 (본 문서 소관 아님)**: blue `markdownParser.md` (I9) 의 호출 줄 박제 `:440`·`:441`·`:479`·`:505`·`:506` 은 현 HEAD 에서 `:596`·`:597`·`:635`·`:661`·`:662` 로 전건 밀렸다. 그 문서의 명령은 계수만 재므로 rc 는 여전히 0 이고 **드리프트는 `[x]` 아래에 숨어 있다** — blue 는 inspector 쓰기 영역 밖이라 여기 관측만 남긴다. 미착수 3축((I6)(I12)(I13))은 불변이며 `TSK-20260831-16`·`17` 이 `40.task/` 에 대기 중이다. | 테스트 현황 · 수용 기준 · 변경 이력 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — `src/common/sanitizeHtml.ts` 단일 모듈 정책 + DOM 주입 직전 sanitize 경유 + URI scheme 화이트리스트 + `<a target="_blank">` rel 자동 보정 + OWASP fixture pointer + 정책 변경 단일 진입점 6 축 (I1~I6) 게이트. baseline: ALLOWED_* 단일 모듈 정합 0 hit (외부 사용) / 18 ALLOWED_TAGS / 7 ALLOWED_ATTR / URI scheme 4 enum. 원전 REQ-20260418-001 NFR-01 보존. | all |
| 2026-05-18 | inspector 84차 tick (Phase 2, REQ-20260518-018 흡수) / pending | S2 단 sanitize cross-surface 효능 5 축 흡수 — (I7) DOMPurify import 단일 모듈 + (I8) hook upgrade 양방향 단조 강화 + (I9) hook 멱등 + `removeHook` 부재 + (I10) sanitize 멱등 + (I11) cross-surface 2단 방어 baseline. 양 spec 분담: `markdownParser.md` = S1 단 escape + S1↔S2 baseline literal / 본 spec = S2 단 + hook upgrade + 멱등. baseline (HEAD=`64d7432`): `grep -rln "import DOMPurify" src` = 1 hit + `grep -nE "addHook" src/common/sanitizeHtml.ts` = 1 hit + `grep -nE "removeHook"` = 0 hit + fixture 2 PASS (rel upgrade + idempotence). §역할 / §동작 (I7~I11) 5건 / §회귀 중점 5건 / §테스트 현황 5건 / §수용 기준 5건 / §스코프 규칙 grep-baseline (REQ-018) 5 추가. RULE-07 자기 검증 PASS — 평서형 + 반복 검증 가능 + 시점 비의존 + incident 비귀속. | §역할 §동작 §회귀 중점 §테스트 현황 §수용 기준 §스코프 규칙 |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | C단계 마커 회수 — RULE-07 §수용 기준 문장 규약 적용. 판정 가능한 항목은 실측·주입 근거와 함께 flip, 미래 사건·미측정 NFR·자명 명제·별 축 위임 항목은 §참고 §미측정·비판정 항목 으로 강등. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |
| 2026-08-31 | inspector (Phase 3, REQ-20260831-056 흡수) / — @ HEAD=`7b43fa8` | **(I13) 신설 + (I6) 판정 채널 부여.** (I13): 정책에 등재된 모든 태그를 fixture 가 실제로 통과시켜 보고, 그 태그 목록은 **도출**하며(하드코딩 금지), 도출이 공집합이면 통과가 아니라 무판정 실패다. 근거는 검출력 **0** 실측 — 격리 사본에서 `ALLOWED_TAGS` 에 표 6 태그를 더하고 전체 스위트를 돌려 붉어진 게이트 0건(116 파일 전수 초록). **(I6) 은 `[x]` → `[ ]` 로 되돌렸다**: (a)(불법 등재 위치)는 (I1) 이 재고 있었으나 (b)(fixture 동반 갱신)를 재는 명령이 그 줄에 아예 없었는데도 항목이 닫혀 있었다 — `RULE-07 §promote 조건` 이 겨누는 형식 통과 항목이다. 계약 이름을 원 req 의 `…corpus 가 낸다` 대신 **`허용 목록의 모든 태그가 sanitize 를 통과한다`** 로 확정 — 같은 req 가 fixture 형태를 범위 밖으로 선언했으므로 이름에 수단을 박지 않는다. 게이트 배치 파일도 못 박지 않고 `grep -rl` 로 도출한다. `parser-sanitizer-coherence.test.ts` 의 **소유를 본 spec 이 진다** (흡수 전 0 hit — 소유자가 없어 하드코딩 열거 1건과 검출력 0 을 아무도 재지 않았다). §테스트 현황 17 항목 전수 HEAD=`7b43fa8` 재실행 (추출 실행, 손 전사 0): 13 rc=0 · 2 rc=1 · 1 rc=2(무판정). **자기 검증 중 추출 함정 1건 자체 발견** — 산문에 인라인 코드로 적은 `bash·-c` 토큰이 추출기에 두 번째 명령으로 잡혀 빈 실행이 됐다 (`RULE-06 §추출 실패 검출` 의 그 부류). 해당 문구를 서술형으로 바꾸고 6 green spec 전수를 재스캔해 25자 미만 추출 0 확인. | all |
| 2026-08-31 | inspector 247차 tick (Phase 3, REQ-20260831-052 흡수 + blue 문면 drift 정정) / pending @ HEAD=`d4556b0` | blue→green 복사. (a) **drift 정정 4건** — D1 `ALLOWED_TAGS` 18→**21**, D2 `ALLOWED_URI_REGEXP` 값 갱신(상대경로 갈래 확장), D3 (I1) 판정을 주석 제외 형태로, D4 (I9) `removeHook` 판정을 주석 제외 형태로. **D3·D4 는 종전 명령이 현 HEAD 에서 rc≠0 이었다** — blue 에 승격된 채 판정 불가 상태였다. (b) **(I12) 표 태그 등재 축 흡수** (REQ-052 FR-02·NFR-01·NFR-02) — 짝 spec `markdown-pipe-table.md` 의 (I2) 가 이 축을 요구한다. §테스트 현황 전수 HEAD=`d4556b0` 재실행 (11 checked rc=0 · 1 unchecked rc=1) + §스코프 규칙 baseline 전면 재측정 + 라인 스냅샷 갱신(hook `:24-34`→`:36-45`, addHook `:30`→`:39`, rel fallback `markdownParser.ts:315`→`:471`, fixture `:66-71`→`:66`·`:88-93`→`:88`) + `## 참고` 중복 절 병합. | all |
| 2026-08-31 | inspector 251차 tick (Phase 1 reconcile) / — @ HEAD=`ed64fb3` | 플립 0. 판정 명령 16건 추출 후 격리 사본 전수 재실행 — tick 250 과 동일 ((I6) rc=1 · (I12) rc=1 `table-tag-entries=0` · (I13) rc=2 무판정, 나머지 rc=0). `sanitizeHtml.ts` 는 `c64c946..ed64fb3` 무변경이라 그 파일 라인 drift 0. **라인 drift 정정 3**: 인용 `markdownParser.test.ts:296` → `:298` ((I1) 판정문 · §스코프 규칙 baseline · D3 행) — `0ff9787` 이 `markdownParser.test.ts:76`·`:399` 에 `+2` 를 넣어 `:296` 이하가 밀렸다. 인용 대상 주석 문면은 불변이며 (I1) 의 rc=0 도 불변이다. | 테스트 현황 · 스코프 규칙 · 참고 |
| 2026-08-31 | inspector 251차 tick (Phase 2, 라벨·명령 불일치 정정) / — @ HEAD=`ed64fb3` | **drift D5**: §테스트 현황 `(정책 항목 수)` 의 라벨이 *"`ALLOWED_TAGS` 21 · `ALLOWED_ATTR` 7"* 이라고 적었으나 **명령은 `ALLOWED_TAGS` 만 센다.** 라벨이 약속한 측정 하나가 실제로는 수행되지 않았고, 그 항목의 rc=0 이 속성 개수의 증거로 읽힐 수 있었다. 라벨을 명령에 맞춰 좁히고 속성 개수의 판정처를 명시했다 (`(Must, REQ-052 NFR-02 속성 표면 무확장)` 이 `ALLOWED_ATTR` 7 을 잰다 — 그 항목은 실제로 민감하다: 참조 구현에서 8항목이 되자 rc=0 → rc=1 로 갈렸다). 발견 경로는 REQ-20260831-062(본문 이미지 지연 로드) 흡수 중 인접 계약 영향 측정이다 — 그 계약이 착지하면 `ALLOWED_ATTR` 이 7 → 8 이 되므로 어느 항목이 실제로 붉어지는지 세어야 했다. 마커 변동 0. | 테스트 현황 |

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
| **D3** | (I1) `grep -rnE "ALLOWED_*" src \| grep -v "common/sanitizeHtml\."` → 0 hit | **2 hit** → 명령 rc≠0 | 주석 줄을 걷어내고 센다. 두 hit 은 `markdownParser.ts:455` · `markdownParser.test.ts:298` 의 **주석 인용**이며 정책을 정의·소비하지 않는다 |
| **D4** | (I9) `grep -nE "removeHook" src/common/sanitizeHtml.ts` → 0 hit | **1 hit** → 명령 rc≠0 | 주석을 걷어내고 센다. 그 hit 은 `:34` 의 `removeHook 호출하지 않는다` 라는 주석이다 |

**D3·D4 는 같은 부류다** — 식별자가 주석에 등장한다는 이유로 게이트가 붉어졌다. 이 저장소는 이미 그 판정을 내린 적이 있다: `handbuilt-control-rationale-truth.md` §(C-1) 이 "열거 고정 금지가 재려는 것은 도출 로직의 하드코딩이지 주석의 예시 언급이 아니다" 라고 적고, 판정 전에 주석을 걷어내는 형태(`sed 's://.*::'`)를 선례로 지목한다. 본 정정은 그 판정을 따른 것이며 **계약을 느슨하게 한 것이 아니다** — 정책 분기를 만드는 코드는 여전히 0 이어야 하고, 그 사실이 바뀌면 (I1)(I9) 은 그대로 붉어진다.

**정정하지 않은 것**: 라인 번호 스냅샷은 사실 갱신이라 drift 표에 넣지 않고 §변경 이력에만 적었다. 태그·속성 **집합**과 hook 의 동작은 어느 것도 바뀌지 않았다 — 바뀐 것은 문면과 판정 명령의 형태다.


### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

(I13) 게이트 신설 task 에 이관한다. `RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않는다. 검출 방향 3 · 음성 대조 2. 이관처 task 가 발행되지 않으면 이 절이 곧 미이관 상태의 박제다.

- **Dir-1 (민감도, I13 — 정책 확장 방향)** — `ALLOWED_TAGS` 에 corpus 가 내지 않는 태그를 1건 더한다 (예: `section`) → `rc≠0`. **현 HEAD 에서 이 주입은 검출되지 않는다** — 표 6 태그 추가 시 전체 스위트 전수 초록이 그 실측이다. **이 방향이 (I13) 의 존재 이유이며, 이것이 붉지 않으면 게이트를 새로 만든 의미가 없다.**
- **Dir-2 (민감도, I13 — 공허 차단 방향)** — 도출을 공집합으로 만든다 (정책 상수 이름 변경 · 도출 경로 차단) → 통과가 아니라 `rc≠0`. 이 방향이 침묵하면 게이트는 "측정 0" 을 "위반 0" 으로 보고한다.
- **Dir-3 (민감도, I13 — 정책 축소 방향)** — corpus 가 내던 태그를 `ALLOWED_TAGS` 에서 뺀다 → `rc≠0`. 기존 단언이 이미 잡을 가능성이 높다 — **중복이면 그 사실을 `result.md` 에 박제**한다 (중복 자체는 결함이 아니지만, 신설 게이트의 고유 검출력을 Dir-1·2 로만 계산해야 하기 때문이다).
- **Ctrl-1 (특이도)** — corpus 행 하나의 **이름표**만 바꾼다 (마크다운 본문 동일) → `rc=0`. **가산형·비파괴형으로 수행한다** — `TSK-20260831-07` 에서 교체형 대조가 같은 task 의 정적 문자열 핀 DoD 와 상충해 `rc=1` 을 낸 실측이 있다 (`specs/10.followups/20260831-1005-dod-static-string-pin-contradicts-its-own-control.md`).
- **Ctrl-2 (특이도)** — 본 spec 이 범위 밖으로 선언한 축(`ALLOWED_ATTR` 항목 **순서** 재배열 · 허용 밖 태그 대조의 산문 주석)의 정상 변경 → `rc=0`. `ALLOWED_ATTR` 순서 재배열은 §수용 기준 REQ-052 NFR-02 의 항목 **수** 판정과 충돌하지 않는다 (수는 7 로 불변).

> **Ctrl-2 를 고를 때 `iframe` 대조를 건드리지 않는다.** 그 예시는 `a13de9a` 가 `<table>` 에서 옮겨 온 것이고, (I12) 가 표를 등재하는 순간 `<table>` 은 "허용 밖" 이기를 그친다. 정상 변형으로 이 자리를 고르면 대조가 겨누는 축 자체를 흔든다.

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- **(I13 검출력) 정책을 넓히면 게이트가 붉어지는가 는 체크박스로 두지 않는다** (`RULE-07 §수용 기준 문장 규약` — '가정 주입 요구' 부류). 현 HEAD 실측 검출력 **0** (표 6 태그를 추가해도 전체 스위트 116 파일이 전수 초록). 검출 방향은 §주입 이관 **Dir-1** 로 보존돼 있으며 이관처 task DoD 에서 왕복 판정한다 — 강등이지 소멸이 아니다. 이관처 task 가 발행되지 않으면 이 문장이 곧 미이관 상태의 박제다.
- **속성(`ALLOWED_ATTR`)·스킴(`ALLOWED_URI_REGEXP`) 축은 같은 부류의 구멍을 가질 수 있으나 재지 않았다** (REQ-056 §미측정). (I13) 은 **태그 축 한정**이다. 두 축의 실측은 별 req 로 분리한다 — 여기 적어 두는 이유는, 태그 축만 닫고 나면 같은 구멍이 남아 있다는 사실이 보이지 않게 되기 때문이다.
- **(I13) 의 도출 수단·게이트 배치는 지정하지 않는다.** 정책 상수를 export 할지, 소스를 파싱할지, 게이트를 `sanitizeHtml.test.ts` 쪽에 둘지는 구현 재량이다. 다만 (I1) 의 판정 명령이 `src/common/sanitizeHtml.*` 밖의 **정의·소비**를 0 으로 막고 있으므로, export 경로를 택하면 (I1) 문면과 그 게이트를 함께 조정해야 한다 (§수용 기준 REQ-056 FR-04).
- **fixture 가 "통과시켜 본다" 의 최소 형태는 정하지 않는다.** corpus 행 추가든 태그 단위 단언이든 (I13) 의 명제를 재면 충족이다.
- **REQ-056 FR-05(Should) 는 (I12) 와 (I13) 이 함께 충족되는 시점에 자동으로 판정된다** — 표 6 태그가 등재되는 순간 도출된 모집단이 그 6 태그를 포함하므로 별도 항목을 두지 않는다. 손으로 corpus 행을 추가해야 충족된다면 그것은 (I13) 의 도출 요구를 만족하지 못한 것이다.
- (I2) DOM 주입 직전 sanitize 경유: caller 측 게이트 (별 task 위임 — 정적 분석 / lint rule 후보). **REQ-056 흡수로 이 공백의 무게가 커졌다** — (I13) 이 "정책에 등재된 태그가 sanitize 를 통과하는가" 를 닫아도, caller 가 sanitize 를 우회하면 그 측정 전체가 관측하지 않는 경로가 된다.
- (Must, REQ-076 FR-02-b) markdownParser 산출 HTML 의 DOM 주입 직전 sanitize 경유 — caller 측 게이트 (별 task 위임 — lint rule / 정적 분석).
