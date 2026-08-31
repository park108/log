# 밑줄 강조(`_` · `__`)는 별표와 대등하다 — 의미 · 낱말 안쪽 억제 · 공백 flanking

> **위치 — 좌표는 도출한다** (`RULE-06 §열거 고정 금지`, REQ-081 FR-07). 아래 앵커 명령이 정본이고 줄 번호는 HEAD=`a1ed6c3` 스냅샷 보조다.
>
> | 앵커 | 명령 | `a1ed6c3` 실측 |
> |---|---|---|
> | 인라인 등록 5 | `grep -nE 'inlineParsing\(parsed, "' src/common/markdownParser.ts` | `:939` `**` · `:940` `~~` · `:963` `*` · `:971` `__` · `:972` `_` |
> | 밑줄 등록 2 | `grep -nE 'inlineParsing\(parsed, "_+"' src/common/markdownParser.ts` | `:971` · `:972` (겹이 홑보다 **앞**) |
> | 공백 판정 (조건 1) | `grep -nE 'runCharacter' src/common/markdownParser.ts` | `:1060` 정의 (`delimeter.charAt(0)`) · `:1086` 여는 · `:1116` 닫는 |
> | 낱말 안쪽 억제 | `grep -nE 'WORD_CHARACTER_PATTERN|isIntraword\(' src/common/markdownParser.ts` | `:1028` 패턴 · `:1046` 정의 · `:1103`·`:1133` 호출 |
> | 게이트 파일 | `grep -rl "밑줄 강조" src` | `src/common/markdownParser.test.ts` (`:1292` describe) · 부수 2 (`markdownParser.ts` 주석 · `markdown-no-character-loss.test.ts`) |
> | 교차 게이트 모집단 | `grep -rl "markdownToHtml" src/__tests__/` | **8 파일** |
>
> **줄 번호를 계약으로 쓰지 않는 이유**: 이 파일은 하루 안에 992 → **1383 줄**이 됐고 원본 spec 의 §위치 좌표 **17/17 전건**이 밀렸다. **본 tick 안에서만 두 번 더 밀렸다** — 최초 박제(`c82c629`)의 스냅샷 열이 `bd59452`·`d93506d` 착지로 전건 어긋나 같은 tick 에 재측정해 갈아 끼웠다. 좌표를 계약으로 쓰면 계약이 아니라 스냅샷이 낡는다.
>
> **낱말 안쪽 억제 행의 `|` 는 ERE 교대다.** 최초 박제는 `\|` 로 적었고 그것은 **BSD ERE 에서 리터럴 파이프**라 `rc=1 · 0 hit` 이었다 (같은 tick 에 자체 검출 — `foundation/spec-judgement-command-evaluability` (I12) 가 재는 바로 그 부류이며 그 계수가 5 → 6 으로 움직여 드러났다).

> **관련 요구사항**: REQ-20260901-081 FR-01~FR-08 · NFR-01~NFR-05 (원본 축 REQ-20260831-051 · 055 · 058 승계)
> **원본**: `specs/50.blocked/spec/common/markdown-emphasis-delimiter-parity.md` — 되찾기 대상. (I6) 은 되찾지 않는다 (§역할 §되찾지 않은 축).

## 역할

CommonMark 는 강조 구분자로 `*` 와 `_` 를 **대등하게** 규정한다 (0.31.2 §6.2). 글쓴이가 어느 구분자를 골랐는지는 렌더 결과를 바꾸지 않는다 — `_기울임_` 은 `*기울임*` 과 같은 `<em>` 을, `__굵게__` 는 `**굵게**` 와 같은 `<strong>` 을 낸다. **대등성은 여는 쪽에만 있는 것이 아니다**: 공백을 사이에 둔 구분자가 강조를 열지 않는다는 판정(**조건 1**)도 다섯 구분자에 똑같이 적용된다.

**방어 대상 (사용자 관측 표면)**: (a) 표준 표기로 쓴 글이 강조를 잃고 구분자 문자가 독자 화면에 글자로 남는 상태, (b) 강조가 아닌 자리에서 강조가 **열려** 밑줄 문자가 화면에서 **사라지는** 상태. (b) 는 요약 경로에서 특히 조용하다 — 태그를 벗기므로 `값은 a _ b _ c 이다` 가 `값은 a  b  c 이다` 로 줄고 아무 오류도 나지 않는다. 손상 표면은 넷이다 (도출: `grep -rn "markdownToHtml\|trimmedContents" src`): 저장 요약(`src/Log/api.ts`) · `meta description`(`src/Log/LogSingle.tsx`, `trimmedContents` 경유 **간접**) · 목록 본문 렌더(`src/Log/LogItem.tsx`) · 편집 미리보기(`src/Log/Writer.tsx`).

**이 계약의 나머지 절반은 무엇을 강조하지 않는가다.** `_` 는 식별자에 흔히 쓰인다 (`foo_bar_baz` · `snake_case`). CommonMark 가 밑줄에만 intraword 제한을 두는 이유가 이것이며, 그 제한 없이 `_` 를 등록하면 기술 문서가 깨진다.

### 되찾지 않은 축 — 원본 (I6)

원본 (I6) 은 *"`*`·`~~` 의 현 동작은 바뀌지 않는다"* 였다. **되찾지 않는다.** 자기가 소유하지 않은 구분자의 동작 불변을 선언하는 형태이며, `~~` 절이 `854541a` 로 거짓이 된 것이 원본 격리의 직접 사유다. 본 계약은 `_`·`__` **만** 판정한다 (REQ-081 FR-05). 다른 구분자는 (I11) 에서 **대등성의 측정 대상**으로만 등장하며, 그때조차 본 계약은 그들의 산출을 못 박지 않고 *"조건 1 판정 아래에 있다"* 만 잰다.

의도적으로 하지 않는 것: **조건 2(문장부호 flanking)** — `30.spec/green/common/markdown-emphasis-flanking-punctuation` 소유 (겹치면 중복 게이트) · `***`/`___` 3중 구분자의 중첩 강조 계약 확정 (§참고 §미측정) · 짝짓기 규칙(nearest-opener) · 강조의 CSS 표현 · 저장된 원문 수리.

## 공개 인터페이스
- 변경 없음. `markdownToHtml(rawInput: string): string` 의 시그니처와 `inlineParsing` 의 module-private 성격은 그대로다. 계약면은 **산출 HTML** 이다.

## 동작

1. **(I1) 홑 밑줄은 `<em>`**: `_텍스트_` → `<em>텍스트</em>`. `*텍스트*` 와 같은 결과다.
2. **(I2) 겹 밑줄은 `<strong>`**: `__텍스트__` → `<strong>텍스트</strong>`. `**텍스트**` 와 같은 결과다.
3. **(I3) 단어 안의 밑줄은 강조가 아니다 — 억제는 `양쪽 다` 단어 글자일 때만 발동한다**: 구분자의 앞과 뒤가 **둘 다** 단어 글자면 열지도 닫지도 않는다. 한쪽만 단어 글자인 자리는 정상적으로 열고 닫는다. `foo_bar_baz` · `a__b__c` 는 글자 그대로 남고 `_italic_` · `__bold__` 는 열린다. **"단어 글자" 는 유니코드 문자·숫자이며 ASCII 로 좁히지 않는다** — `한글_강조_표기` 도 글자 그대로 남는다. 이 제한은 `_` 계열에만 적용된다.
4. **(I4) 보호 축 통과**: 코드 스팬 안 `` `my_var_name` `` → `<p><code>my_var_name</code></p>` · 백슬래시 이스케이프 `\_밑줄아님\_` → `<p>_밑줄아님_</p>` · 링크 URL 안 `[문서](https://example.com/a_b_c)` 의 `href` 온전 · `___` 은 수평선 · `__` 는 수평선이 아니다 (대조).
5. **(I5) 구분자 혼용**: `*별표* 와 _밑줄_` 의 양쪽 모두 `<em>` 이 된다.
6. **(I7) 구분자 런은 쪼개 쓰지 않는다**: 여는·닫는 구분자 **바로 바깥**에 같은 구분자 글자가 이어지면 그 자리는 열지도 닫지도 않는다. `___둘다___` 는 `<p>___둘다___</p>` 를 유지한다. **판정은 구분자 문자열 전체가 아니라 런의 한 글자 단위여야 한다** (`runCharacter` = `delimeter.charAt(0)`) — 두 글자 구분자를 통째로 비교하면 가드가 겹 구분자에서 죽는다.
7. **(I8) 계약 게이트는 비한글 예시를 포함한다**: (I1)(I2)(I3) 을 재는 게이트의 예시에 **비한글 입력이 1건 이상** 있어야 한다. 한글 예시만으로는 (I3) 을 ASCII 로 좁힌 구현이 전부 초록으로 통과한다.
8. **(I9) 여는 쪽 조건 1 — 밑줄 뒤가 공백이면 열지 않는다**: `_` · `__` 는 여는 자리 **뒤가 공백이거나 줄 끝**이면 강조를 열지 않는다. `_ 기울임 _` → `<p>_ 기울임 _</p>` · `__ 굵게 __` → `<p>__ 굵게 __</p>` · `값은 a _ b _ c 이다` → `<p>값은 a _ b _ c 이다</p>`.
9. **(I10) 닫는 쪽 조건 1 — 밑줄 앞이 공백이면 닫지 않는다**: `_` · `__` 는 닫는 자리 **앞이 공백**이면 강조를 닫지 않는다. **비대칭 입력이 각 방향의 유일한 관측 채널이다** — `_기울임 _` (여는 쪽만 정상) 과 `_ 기울임_` (닫는 쪽만 정상) 이 각각 평문으로 남아야 한다. 한 방향만 구현한 게이트는 대칭 입력만으로는 초록이다.
10. **(I11) 조건 1 대등성은 산출로 판정한다 — 등록 인자 개수로 판정하지 않는다**: 다섯 구분자(`*` · `**` · `_` · `__` · `~~`) 전부가 조건 1 판정 아래에 있다는 명제를, **효력(산출)** 으로 잰다. 같은 형태의 입력 `값은 a X b X c 이다` 가 다섯 구분자 전부에서 글자 그대로 남는다. **arity 판정은 이 명제를 재지 못한다** — §회귀 중점 에 실측이 있다.
11. **(I12) 조건 1 게이트는 공백 flanking 입력을 직접 담는다**: (I9)(I10) 을 재는 게이트는 `_ 기울임 _` · `__ 굵게 __` · `_기울임 _` · `_ 기울임_` 을 담는다. **런 가드·낱말 안쪽 입력(`a__b__c` · `___둘다___` · `__`)은 이 축의 관측 채널이 아니다** — 값 뒤집기 주입에서 붉어지는 것은 그 셋뿐이고 조건 1 은 재지 못한다. (I8) 과 같은 부류의 **게이트 표현에 대한 계약**이지 구현 수단 지정이 아니다.

### 회귀 중점

- **대등성 게이트가 값 뒤집기에 눈이 먼다 — 실측**. 조건 1 대등성을 재던 유일한 게이트(`blue/common/markdown-tilde-strikethrough-space-flanking` (I5))는 **3인자 등록 형태 개수**를 센다. 격리 사본에서 `_`·`__` 등록의 `strictFlanking` 인자를 `true`→`false` 로 뒤집었을 때:

  | 트리 | (I5) arity 게이트 | 산출 (`값은 a _ b _ c 이다`) |
  |---|---|---|
  | clean `c82c629` | **rc=0** | `<p>값은 a _ b _ c 이다</p>` |
  | 값 뒤집기 주입 | **rc=0** (무감) | `<p>값은 a <em> b </em> c 이다</p>` |
  | 원복 | **rc=0** | 원상 |

  같은 주입에서 파서 스위트는 **5건** 붉어지지만 그 입력은 `a__b__c` · `___둘다___` · `__` · `끝_. 다음 _기울임_ 다` · `_가._나 다` 로 **전부 런 가드·낱말 안쪽·조건 2 축**이다. **공백 flanking 입력은 0건**이다 — "무언가 붉어진다" 가 조건 1 이 지켜진다는 증거가 아니다. (I11)(I12) 가 이 구멍을 닫는다.
- **여는 쪽만 고치는 방향은 절반이다.** 대칭 입력(`_ 기울임 _`)은 두 방향 중 하나만 살아 있어도 평문으로 보인다. (I10) 의 비대칭 입력이 없으면 죽은 방향이 보이지 않는다.
- **(I1)(I2) 만 만족시키고 (I3) 를 빠뜨리는 구현**이 이 축의 대표 실패다 — `foo_bar_baz` 가 `foo<em>bar</em>baz` 가 된다.
- **(I3) 을 ASCII 로 좁히는 방향은 게이트에 보이지 않는다** — 예시가 전부 한글이면 `한글_강조_표기` 만 깨지고 게이트는 초록이다. (I8) 이 그 방향의 유일한 관측 채널이다.
- **(I7) 은 억제 조건만 고쳐서는 성립하지 않는다** — 런 가드가 구분자 문자열과 통째로 비교되면 `___둘다___` 가 겹침 어긋난 태그로 나오고, sanitize 교정 후 **밑줄 여섯 개가 조용히 사라진다**.
- **기존 조건 1 계약을 완화해 닫는 방향은 금지다** (`markdown-star-emphasis-space-flanking` · `markdown-tilde-strikethrough-space-flanking` · `markdown-emphasis-flanking-punctuation` 전부 초록 유지).

## 의존성
- 내부: `src/common/markdownParser.ts` (단일 대상) · `src/common/markdownParser.test.ts` (게이트).
- **교차 게이트 (비퇴행 모집단) — 열거하지 않고 도출한다**: `bash -c 'grep -rl "markdownToHtml" src/__tests__/'` → HEAD=`c82c629` **8 파일** (`backslash-escape` · `blockquote-is-one-block` · `change-highlight-preserves-rendering` · `link-target-scope` · `markdown-attribute-integrity` · `markdown-no-character-loss` · `markdown-render-invariants` · `parser-sanitizer-coherence`).
- 외부: CommonMark 0.31.2 §6.2 (delimiter run · left/right-flanking · `_` 의 intraword 제한).
- **역의존 (사용처) — 열거하지 않고 도출한다**: `bash -c 'grep -rn "markdownToHtml(" src --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "common/markdownParser\.ts"'` → HEAD=`8fa6117` 실측 **4 hit** · 실제 호출 **3** (`src/Log/Writer.tsx` · `src/Log/LogItem.tsx` · `src/Log/api.ts`). **제외 규칙**: `src/Log/__fixtures__/logs.ts` 1건은 fixture 본문 안의 **글자열이지 호출이 아니다**. **Comment 는 이 파서를 쓰지 않는다** (`CommentItem.tsx` 가 `message.split("\n")` 을 `<p>` 로 그린다) — 종전 문면의 *"Log · Comment 본문 렌더"* 는 **사실이 아니었고**, 하드코딩 열거였기에 그 오류가 3 tick 동안 재측정되지 않았다 (`foundation/spec-dependency-reverse-derivation` (I1)).
- 직교/경계: `blue/common/markdown-star-emphasis-space-flanking` (`**` 조건 1 · 공백 판정 단일 출처) · `blue/common/markdown-tilde-strikethrough-space-flanking` (`~~` 조건 1) · `green/common/markdown-emphasis-flanking-punctuation` (**조건 2** — 본 계약은 조건 2 를 판정하지 않는다) · `green/common/sanitizeHtml` (`em`·`strong` 은 이미 `ALLOWED_TAGS` — 본 축은 정제 정책 변경을 요구하지 않는다).

## 테스트 현황

> 각 명령은 HEAD=`c82c629` 에서 **파일에서 추출해** 실행했고 rc 를 박제한다 (손 전사 0 — `RULE-06 §추출 실패 검출`). 실행은 `git archive c82c629` 격리 사본(`src` 실사본 · `node_modules` 심볼릭 링크)에서 했고 메인 워킹트리 `src` 는 읽기만 했다 (`RULE-02 §교차 작업 파괴` — developer 동시 작업 중). 파일·이름 부재는 `exit 2` 무판정이다.

- [x] (I1·I2·I5) 밑줄 강조 계약이 게이트로 실재하고 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "밑줄 강조" "$f" && npx vitest run "$f" -t "밑줄 강조" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c82c629` 재실측 **rc=0** (`grep -cF "밑줄 강조" src/common/markdownParser.test.ts` → **1**, `:1241` describe). **실행 창 확인**: `-t "밑줄 강조"` 창 안에 여는 방향 입력이 실재한다 — `_italic_` · `_기울임_` · `__bold__` · `__굵게__` · 구분자 혼용 `*별표* 와 _밑줄_`. **비한글·한글 둘 다** 있는 것이 이 창의 요점이다.
- [x] (I3·I8) intraword 억제 대조가 실재하고 **비한글 예시를 포함하며** 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "단어 안의 밑줄은 강조가 아니다" "$f" && grep -qF "_italic_" "$f" && grep -qF "__bold__" "$f" && npx vitest run "$f" -t "단어 안의 밑줄은 강조가 아니다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c82c629` 재실측 **rc=0** (`:1273` describe). **실행 창 확인**: `-t "단어 안의 밑줄은 강조가 아니다"` 창 안에 억제 방향 입력이 실재한다 — `foo_bar_baz` · `한글_강조_표기`.
- [x] (I3 유니코드 대조) 한글 단어 안 밑줄 대조가 실재한다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "한글_강조_표기" "$f"'` → HEAD=`c82c629` 재실측 **rc=0** (계수 1). 계약 산출은 `<p>한글_강조_표기</p>`. **정적 불변식이다** — 판정면이 패턴 hit 수·파일 실재이므로 정적 명령이 정확한 측정면이다 (`foundation/gate-effective-surface-and-variant-battery` (I4)).
- [x] (I7 런 대조) 3중 구분자 무변경 대조가 실재한다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "___둘다___" "$f"'` → HEAD=`c82c629` 재실측 **rc=0** (계수 3 — 주석 1 · it 이름 1 · 단언 1). **정적 불변식이다** — 판정면이 패턴 hit 수·파일 실재이므로 정적 명령이 정확한 측정면이다 (`foundation/gate-effective-surface-and-variant-battery` (I4)).
- [x] (I1~I8 접속) 네 예시가 **실재하면서 동시에** 스위트가 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "_italic_" "$f" && grep -qF "__bold__" "$f" && grep -qF "한글_강조_표기" "$f" && grep -qF "___둘다___" "$f" && npx vitest run "$f" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c82c629` 재실측 **rc=0** (170 tests). **접속으로 닫는 이유**: 스위트 단독은 게이트 부재 상태에서도 rc=0 이고 `-t` 는 이름 미매치 시 단독 rc=0 이다 — 둘 다 공허 통과 경로다.
- [x] (I1·I2 정적 zero-point) 밑줄 구분자가 인라인 패스에 등록돼 있다: `bash -c 'test "$(grep -cE "inlineParsing\(parsed, \"_+\"" src/common/markdownParser.ts)" -ge 1'` → HEAD=`c82c629` 재실측 **rc=0** (계수 **2** — `:938` `"__"` · `:939` `"_"`). 겹을 홑보다 **먼저** 등록해야 `__bold__` 가 `<em>_bold_</em>` 로 잘리지 않는다. **정적 불변식이다** — 판정면이 패턴 hit 수·파일 실재이므로 정적 명령이 정확한 측정면이다 (`foundation/gate-effective-surface-and-variant-battery` (I4)).
- [x] (I4 보호 축 실재) 세 보호 축이 게이트로 잠겨 있다: `bash -c 'grep -qE "for \(const src of \[.---., .\*\*\*., .___." src/common/markdownParser.test.ts && grep -qF "my_var_name" src/common/markdownParser.test.ts'` → HEAD=`c82c629` 재실측 **rc=0**. **정적 불변식이다** — 판정면이 패턴 hit 수·파일 실재이므로 정적 명령이 정확한 측정면이다 (`foundation/gate-effective-surface-and-variant-battery` (I4)).
- [x] (I9 여는 쪽 조건 1) 여는 쪽 조건 1 이 게이트로 실재하고 초록이다 — **파일은 이름에서 도출한다**: `bash -c 'set -- $(grep -rl "밑줄 구분자는 공백을 사이에 두면 강조를 열지 않는다" src 2>/dev/null); test "$#" -ge 1 || exit 2; npx vitest run "$@" -t "밑줄 구분자는 공백을 사이에 두면 강조를 열지 않는다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c82c629` 실측 **rc=2 (게이트 부재 — 무판정)**. 미착수이며 이관처 task 는 미발행이다. → **257차 tick 재실측 rc=0 — 착지**(`8fa6117` *test: 밑줄 조건 1(공백 flanking) 게이트를 두 이름으로 신설한다*). **실행 창 확인**: `-t` 가 여는 블록 `markdownParser.test.ts:1647` 을 잡고 그 창 안에 여는 쪽 입력 4형태(`_ 기울임 _` · `__ 굵게 __` · `_ 기울임_` · `__ 굵게__`)가 실재한다 — 창 안에 방향의 입력이 없으면 `-t` 는 통과해도 아무것도 재지 않는다 (`foundation/gate-effective-surface-and-variant-battery` (I8)).
- [x] (I10 닫는 쪽 조건 1) 닫는 쪽 조건 1 이 게이트로 실재하고 초록이다: `bash -c 'set -- $(grep -rl "밑줄 구분자는 공백을 사이에 두면 강조를 닫지 않는다" src 2>/dev/null); test "$#" -ge 1 || exit 2; npx vitest run "$@" -t "밑줄 구분자는 공백을 사이에 두면 강조를 닫지 않는다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c82c629` 실측 **rc=2**. **여는 쪽과 이름을 나눈다** — 한 이름으로 합치면 한 방향이 죽어도 붉지 않는다. → **257차 tick 재실측 rc=0 — 착지**(`8fa6117`). **실행 창 확인**: 닫는 블록 창 안에 닫는 쪽 입력 3형태(`_기울임 _` · `__굵게 __` · `와_ 좋다 정말 대박_`)가 실재한다. **여는 쪽과 이름을 나눈 판단이 여기서 값을 냈다** — 한 이름이었으면 닫는 쪽 입력 0건인 창에서도 rc=0 이 났을 것이다.
- [ ] (I11 대등성 효력면) 다섯 구분자 대등성이 **산출로** 박제돼 있고 초록이다: `bash -c 'set -- $(grep -rl "다섯 구분자의 공백 판정은 산출로 대등하다" src 2>/dev/null); test "$#" -ge 1 || exit 2; n=0; for d in "값은 a \* b \* c 이다" "값은 a \*\* b \*\* c 이다" "값은 a _ b _ c 이다" "값은 a __ b __ c 이다" "값은 a ~~ b ~~ c 이다"; do grep -qE "$d" "$@" && n=$((n+1)); done; echo "parity-battery=$n"; test "$n" -ge 5 && npx vitest run "$@" -t "다섯 구분자의 공백 판정은 산출로 대등하다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c82c629` 실측 **rc=2** (`parity-battery` 미출력 — 도출이 비어 앞에서 닫힌다). → **257차 tick 재실측 rc=2 (불변)**. **실행 창 미확인** — 이름이 현 HEAD 에 0 hit 이라 창이 부재다. `parity-battery` 는 도출이 비어 앞에서 닫히므로 출력조차 나지 않는다 ((I8) `unconfirmed` 에 남는다).
- [x] (I12 조건 1 입력 요건) 조건 1 게이트가 공백 flanking 입력 네 형태를 직접 담는다: `bash -c 'set -- $(grep -rl "밑줄 구분자는 공백을 사이에 두면 강조를 열지 않는다" src 2>/dev/null); test "$#" -ge 1 || exit 2; n=0; for d in "_ 기울임 _" "__ 굵게 __" "_기울임 _" "_ 기울임_"; do grep -qF "$d" "$@" && n=$((n+1)); done; echo "space-flanking-inputs=$n"; test "$n" -ge 4'` → HEAD=`c82c629` 실측 **rc=2**. 현 게이트 파일의 네 입력 계수는 **0/0/0/0** 이다 (계수 명령은 §스코프 규칙 baseline 에 파일 인자와 함께 박제돼 있다). **정적 불변식이다** — 판정면이 패턴 hit 수·파일 실재이므로 정적 명령이 정확한 측정면이다 (`foundation/gate-effective-surface-and-variant-battery` (I4)). → **257차 tick 재실측 rc=0** (`space-flanking-inputs=4`) — `8fa6117` 이 네 입력을 전부 게이트 파일에 세웠다. **정적 불변식이다.**
- [ ] (I9·I10·I11 접속) 세 이름이 **동시에** 실재하면서 파서 스위트가 초록이다: `bash -c 'D=""; for n in "밑줄 구분자는 공백을 사이에 두면 강조를 열지 않는다" "밑줄 구분자는 공백을 사이에 두면 강조를 닫지 않는다" "다섯 구분자의 공백 판정은 산출로 대등하다"; do h=$(grep -rl "$n" src 2>/dev/null); test -n "$h" || exit 2; D="$D $h"; done; set -- $(printf "%s\n" $D | sort -u); test "$#" -ge 1 || exit 2; npx vitest run "$@" src/common/markdownParser.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c82c629` 실측 **rc=2**.
- [x] (NFR-01 비퇴행 baseline) 파서 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c82c629` 재실측 **rc=0** (**170 tests**). **이 항목은 축 판정이 아니라 바닥이다** — 원본이 이 명령 하나로 (I6) 을 재던 것이 판정력 0 의 원인이었다 (REQ-081 FR-08). 축 판정은 (I9)(I10)(I11)(I12) 가 한다.
- [x] (NFR-02 교차 비퇴행) `markdownToHtml` 소비 게이트 전수가 초록이다 — **모집단은 도출한다**: `bash -c 'set -- $(grep -rl "markdownToHtml" src/__tests__/ | sort); test "$#" -ge 8 || exit 2; echo "cross-gate-files=$#"; npx vitest run "$@" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c82c629` 재실측 **rc=0** (`cross-gate-files=8`). 도출이 8 미만이면 `exit 2` 무판정 실패다.
- [x] (NFR-03 sanitize 무변경) 산출 태그가 이미 허용돼 있다: `bash -c 'grep -qE "'\''em'\''" src/common/sanitizeHtml.ts && grep -qE "'\''strong'\''" src/common/sanitizeHtml.ts'` → HEAD=`c82c629` 재실측 **rc=0**. **정적 불변식이다** — 판정면이 패턴 hit 수·파일 실재이므로 정적 명령이 정확한 측정면이다 (`foundation/gate-effective-surface-and-variant-battery` (I4)).

## 수용 기준

- [x] (Must, I1·I2·I5) 위 §테스트 현황 (I1·I2·I5) 명령 → rc=0. HEAD=`c82c629` 실측 rc=0.
- [x] (Must, I3·I8) 위 §테스트 현황 (I3·I8) 명령 → rc=0. HEAD=`c82c629` 실측 rc=0.
- [x] (Must, I3 유니코드) 위 §테스트 현황 (I3 유니코드 대조) 명령 → rc=0. HEAD=`c82c629` 실측 rc=0.
- [x] (Must, I7) 위 §테스트 현황 (I7 런 대조) 명령 → rc=0. HEAD=`c82c629` 실측 rc=0.
- [x] (Must, I1~I8 접속) 위 §테스트 현황 (I1~I8 접속) 명령 → rc=0. HEAD=`c82c629` 실측 rc=0.
- [x] (Must, I1·I2 정적) 위 §테스트 현황 정적 zero-point 명령 → rc=0 (계수 2). HEAD=`c82c629` 실측 rc=0.
- [x] (Must, I4) 위 §테스트 현황 (I4 보호 축 실재) 명령 → rc=0. HEAD=`c82c629` 실측 rc=0.
- [x] (Must, REQ-081 FR-01) 위 §테스트 현황 (I9 여는 쪽 조건 1) 명령 → rc=0. HEAD=`8fa6117` 실측 rc=0.
- [x] (Must, REQ-081 FR-02) 위 §테스트 현황 (I10 닫는 쪽 조건 1) 명령 → rc=0. HEAD=`8fa6117` 실측 rc=0.
- [ ] (Must, REQ-081 FR-03) 위 §테스트 현황 (I11 대등성 효력면) 명령 → rc=0 (`parity-battery` = 5).
- [x] (Must, REQ-081 FR-04) 위 §테스트 현황 (I12 조건 1 입력 요건) 명령 → rc=0 (`space-flanking-inputs` = 4). HEAD=`8fa6117` 실측 rc=0.
- [ ] (Must, REQ-081 FR-01~FR-04 접속) 위 §테스트 현황 (I9·I10·I11 접속) 명령 → rc=0.
- [x] (Must, NFR-01 비퇴행) 위 §테스트 현황 (NFR-01) 명령 → rc=0. HEAD=`c82c629` 실측 rc=0 (170 tests). 구현 후에도 rc=0 — **기존 게이트를 완화하는 해결은 불가**하다.
- [x] (Must, NFR-02 교차 비퇴행) 위 §테스트 현황 (NFR-02) 명령 → rc=0 (`cross-gate-files=8`). HEAD=`c82c629` 실측 rc=0.
- [x] (Must, NFR-03 sanitize 무변경) 위 §테스트 현황 (NFR-03) 명령 → rc=0. HEAD=`c82c629` 실측 rc=0.
- [x] (Must, 범위 제한) 조건 2(문장부호 flanking) · 3중 구분자의 **중첩 강조 계약 확정** · 짝짓기 규칙 · 강조의 CSS 표현 · 저장된 원문 수리는 본 계약의 요구 대상이 아니다 — §역할 · §참고 §미측정. 본 계약은 `_`·`__` 밖 구분자의 **동작 불변을 선언하지 않는다** ((I11) 은 조건 1 판정 소속만 잰다).

## 스코프 규칙

- **expansion**: 불허 — 대상은 `src/common/markdownParser.ts` 와 `src/common/markdownParser.test.ts` 2 파일이다. `src/common/sanitizeHtml.ts` 는 **읽기 대상**이며 본 축은 그것을 바꾸지 않는다 (NFR-03). 게이트 위반이 이 밖에서 나오면 격리 대상이다.
- **grep-baseline** (HEAD=`c82c629` 격리 사본 실측):
  - `grep -nE "inlineParsing\(parsed" src/common/markdownParser.ts` → **5 hits** in 1 file: `:906` (`"**"`) · `:907` (`"~~"`) · `:930` (`"*"`) · `:938` (`"__"`) · `:939` (`"_"`). 밑줄 등록 **2 hit**, 겹이 홑보다 앞.
  - 계약 이름·예시 계수 — **파일 인자를 매번 적는다** (줄임표는 파일 이름으로 읽혀 `rc=2`, 인자를 빼면 `grep` 이 stdin 에 매달린다):
    - `grep -cF "밑줄 강조" src/common/markdownParser.test.ts` → **1** (`:1241`)
    - `grep -cF "단어 안의 밑줄은 강조가 아니다" src/common/markdownParser.test.ts` → **1** (`:1273`)
    - `grep -cF "_italic_" src/common/markdownParser.test.ts` → **1**
    - `grep -cF "__bold__" src/common/markdownParser.test.ts` → **1**
    - `grep -cF "한글_강조_표기" src/common/markdownParser.test.ts` → **1**
    - `grep -cF "___둘다___" src/common/markdownParser.test.ts` → **3** (주석 · it 이름 · 단언)
  - **신설 축의 zero-point (I9~I12)** — 전부 0 이다: `grep -cF "_ 기울임 _" src/common/markdownParser.test.ts` → **0** · `grep -cF "__ 굵게 __" src/common/markdownParser.test.ts` → **0** · `grep -cF "_기울임 _" src/common/markdownParser.test.ts` → **0** · `grep -cF "_ 기울임_" src/common/markdownParser.test.ts` → **0** · `grep -cF "값은 a _ b _ c 이다" src/common/markdownParser.test.ts` → **0**. 조건 1 의 밑줄 관측 채널이 **하나도 없다**는 것이 이 축의 zero-point 다.
  - **구조 실재** (계약이 아니라 구조를 재므로 체크박스로 두지 않는다): `grep -cE "runCharacter" src/common/markdownParser.ts` → **3** · `grep -cE "isIntraword\(" src/common/markdownParser.ts` → **2** · `grep -nE "^const WORD_CHARACTER_PATTERN" src/common/markdownParser.ts` → `:995` `/[\p{L}\p{N}]/u`.
  - `grep -cE "^[[:space:]]*it\(" src/common/markdownParser.test.ts` → **156** (선언 모집단). 제외 규칙: `it(` 로 시작하는 줄만 계수하며 `describe`·주석·중첩 표기는 세지 않는다. **선언 156 과 실행 170 은 서로 다른 것을 잰다** — 루프 안 선언 1줄이 여러 테스트를 만든다. 비퇴행 판정의 대상은 **실행 170** 이다.
  - **산출 실측 17행** (격리 사본 `git archive c82c629` + `node_modules` 심볼릭 링크. 메인 트리 `src` 쓰기 0):

    | 입력 | 산출 (`c82c629`) | 계약 | 값 뒤집기 주입 |
    |---|---|---|---|
    | `_ 기울임 _` | `<p>_ 기울임 _</p>` | 동일 (I9) ✓ | `<p><em> 기울임 </em></p>` ✗ |
    | `__ 굵게 __` | `<p>__ 굵게 __</p>` | 동일 (I9) ✓ | `<p><strong> 굵게 </strong></p>` ✗ |
    | `_기울임 _` | `<p>_기울임 _</p>` | 동일 (I10) ✓ | `<p><em>기울임 </em></p>` ✗ |
    | `_ 기울임_` | `<p>_ 기울임_</p>` | 동일 (I9) ✓ | `<p><em> 기울임</em></p>` ✗ |
    | `__굵게 __` | `<p>__굵게 __</p>` | 동일 (I10) ✓ | `<p><strong>굵게 </strong></p>` ✗ |
    | `__ 굵게__` | `<p>__ 굵게__</p>` | 동일 (I9) ✓ | `<p><strong> 굵게</strong></p>` ✗ |
    | `값은 a _ b _ c 이다` | `<p>값은 a _ b _ c 이다</p>` | 동일 (I11) ✓ | `<p>값은 a <em> b </em> c 이다</p>` ✗ |
    | `값은 a __ b __ c 이다` | `<p>값은 a __ b __ c 이다</p>` | 동일 (I11) ✓ | `<p>값은 a <strong> b </strong> c 이다</p>` ✗ |
    | `와_ 좋다 정말 대박_` | `<p>와_ 좋다 정말 대박_</p>` | 동일 (I9·I10) ✓ | `<p>와<em> 좋다 정말 대박</em></p>` ✗ |
    | `값은 a * b * c 이다` | `<p>값은 a * b * c 이다</p>` | 동일 (I11 대조) ✓ | 불변 (대조) |
    | `값은 a ** b ** c 이다` | `<p>값은 a ** b ** c 이다</p>` | 동일 (I11 대조) ✓ | 불변 (대조) |
    | `값은 a ~~ b ~~ c 이다` | `<p>값은 a ~~ b ~~ c 이다</p>` | 동일 (I11 대조) ✓ | 불변 (대조) |
    | `_기울임_` | `<p><em>기울임</em></p>` | 동일 (I1) ✓ | 불변 (대조) |
    | `__굵게__` | `<p><strong>굵게</strong></p>` | 동일 (I2) ✓ | 불변 (대조) |
    | `foo_bar_baz` | `<p>foo_bar_baz</p>` | 동일 (I3) ✓ | 불변 (대조) |
    | `한글_강조_표기` | `<p>한글_강조_표기</p>` | 동일 (I3 유니코드) ✓ | 불변 (대조) |
    | `___둘다___` | `<p>___둘다___</p>` | 동일 (I7) ✓ | `<p><strong><em>둘다</strong></em></p>` ✗ |

- **rationale**: 등록 5 hit · 계약 이름 6건이 전수 실재하므로 되찾은 축의 baseline 은 열거로 닫힌다. 신설 축은 **zero-point 가 0** 이라 baseline 이 부재의 열거다. 산출 표에 대조 열(주입)을 나란히 둔 이유는, 이 축의 실패가 "동작하지 않는다" 가 아니라 **"동작하는데 아무도 재지 않는다"** 쪽이기 때문이다 — 값 뒤집기에서 산출 9행이 무너지는데 정적 대등성 게이트는 rc=0 을 유지한다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 257차 tick (Phase 1·2) / `8fa6117` @ HEAD=`8fa6117` | **플립 6 — 조건 1 게이트 착지.** `8fa6117`(*test: 밑줄 조건 1(공백 flanking) 게이트를 두 이름으로 신설한다*) 이 (I9)(I10)(I12) 를 닫았다 (§테스트 현황 3 + §수용 기준 3). **여는 쪽과 닫는 쪽을 다른 이름으로 나눈 256차 판단이 여기서 값을 냈다** — 한 이름이었으면 닫는 쪽 입력 0건인 창에서도 rc=0 이 났다. 두 창의 입력 실재를 직접 확인해 (I8) `실행 창 확인` 토큰 4건을 달았다. **§역의존 을 도출형으로 전환**: 종전 하드코딩 열거(*"Log · Comment 본문 렌더"*)는 **사실이 아니었고**(Comment 는 이 파서를 쓰지 않는다 — `CommentItem` 이 평문 렌더다) 열거였기에 그 오류가 재측정되지 않았다. (I11) 은 rc=2 불변(대등성 이름 미착지) — 창 부재라 토큰을 달지 않았다. | 테스트 현황 · 수용 기준 · 의존성 · 변경 이력 |
| 2026-09-01 | inspector 256차 tick (같은 tick 자체 정정) / 측정 HEAD=`a1ed6c3` | **§위치 앵커 1건의 ERE 오표기 정정 + 스냅샷 좌표 전건 갱신.** 낱말 안쪽 억제 앵커를 `\|` 로 적었고 그것은 **BSD ERE 에서 리터럴 파이프**라 `rc=1 · 0 hit` 이었다 — 교대로 고쳐 4 hit rc=0. `foundation/spec-judgement-command-evaluability` (I12) 가 재는 부류이며(본 문서의 그 span 은 §위치 구획이라 (I12) 모집단 밖이다) 같은 tick 재측정에서 자체 검출했다. **스냅샷 좌표는 최초 박제(`c82c629`) 이후 `bd59452`·`d93506d` 착지로 전건 어긋났고**(파일 1350 → 1383 줄) `a1ed6c3` 값으로 갈아 끼웠다 — 앵커 명령이 정본이라는 §위치 선언이 같은 tick 안에서 실측으로 확인된 셈이다. **판정 15 건 전건 재실행**: 되찾은 축 8 + NFR 3 = **rc=0 불변**, 신설 축 5 = **rc=2 불변**. | §위치 · §변경 이력 |
| 2026-09-01 | inspector 256차 tick (Phase 3, REQ-20260901-081 흡수 — `50.blocked/spec` 되찾기) / pending @ HEAD=`c82c629` | **최초 박제 — 11 축.** 원본 `markdown-emphasis-delimiter-parity` 의 (I1)(I2)(I3)(I4)(I5)(I7)(I8) 을 **번호 보존**으로 되찾고 (I6) 은 **되찾지 않았다** (자기 소유 밖 구분자의 동작 불변 선언 — 원본 격리의 직접 사유). 신설 (I9)(I10)(I11)(I12) 가 조건 1 소유와 **효력면 대등성**을 세운다. 되찾은 축 8 게이트를 격리 사본에서 전수 재실행해 **8 rc=0** (원본이 `c64c946` 에서 남긴 값과 일치), 신설 축 5 게이트 **전건 rc=2 (부재 무판정)**. 값 뒤집기 주입으로 arity 게이트 무감(rc=0 불변)과 산출 9행 붕괴를 직접 재현했고, 그 주입에서 붉어지는 기존 5 테스트에 **공백 flanking 입력이 0건**임을 확인했다. 좌표는 §위치 도출 앵커로 전환 (원본 17 좌표 전건 밀림). | all |

## 참고

### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. **이관처 task 는 미발행이며, 신설 축 (I9)~(I12) 의 게이트를 세우는 task 의 DoD 가 이 방향들을 왕복해야 한다.** 되찾은 축 (I1)~(I8) 의 방향(Dir-1~Dir-6)은 원본 §주입 이관 에 박제돼 있고 `TSK-20260831-08-a`·`-b` 가 이미 왕복했다 — 재실행 대상이 아니다.

- **Dir-7 (민감도, I9·I10 — 외과적)** — `strictFlanking` 판정에서 **밑줄 런에 한해 공백 절반만** 무력화한다 (런 가드 `after === runCharacter` · `beforeOpen === runCharacter` 와 낱말 안쪽 억제는 유지) → `rc≠0`. **이 주입이 현 HEAD 에서 전 스위트 초록을 통과한다**는 것이 본 축의 존재 근거다.
- **Dir-8 (민감도, I11 — 값 뒤집기)** — `_`·`__` 등록의 `strictFlanking` 인자를 `true`→`false` 로 뒤집는다 → (I11) 게이트가 `rc≠0`. **현 대등성 게이트(arity)는 이 방향에서 rc=0 이다** (§회귀 중점 실측).
- **Dir-9 (민감도, I10 단독)** — 닫는 쪽 조건 1 만 제거한다 → `rc≠0`. 대칭 입력만 있는 게이트는 이 방향에 침묵한다 — `_기울임 _` 이 유일한 관측 채널이다.
- **Ctrl-3 (특이도)** — `*`·`**`·`~~` 축의 정상 변경(가산형: 기존 단언에 예시 추가) → `rc=0`. 본 계약은 그들의 산출을 못 박지 않으므로 붉어지면 (I11) 이 과잉 특정된 것이다.
- **Ctrl-4 (특이도)** — 본 계약이 범위 밖으로 선언한 축(3중 구분자의 **중첩 강조 계약 확정** · 짝짓기 규칙)의 정상 변경 → `rc=0`.

### 미측정·비판정 항목

- **3중 구분자의 중첩 강조 계약은 확정하지 않는다.** (I7) 이 요구하는 것은 "현 산출을 바꾸지 않는다" 이지 "CommonMark 대로 `<em><strong>` 을 낸다" 가 아니다. 후자를 열려면 `___` 수평선 판정과의 우선순위를 함께 다뤄야 한다.
- **조건 2 와의 동시 성립은 두 계약이 각자 잰다** (REQ-081 NFR-04). 조건 2 는 `fd62f3a` 로 착지했고 조건 1 뒤에 붙는 **별도 관문**이다 — 본 계약은 조건 2 의 산출을 판정하지 않으며 "조건 2 가 유지된다" 고도 적지 않는다. 그 형태의 선언이 원본 (I6) 을 거짓으로 만든 부류다.
- **실제 게시글에서 밑줄 표기의 빈도는 세지 않았다** — 저장소에 글 코퍼스가 없다. 근거는 빈도가 아니라 표기가 표준이고 산출이 갈린다는 것이다.
- **구현 수단은 지정하지 않는다.** 조건 1 을 등록 인자로 켤지 판정을 분리할지는 developer 영역이다. 계약 판정은 (I9)~(I12) 의 산출이 한다.
- **저장 원문은 바뀌지 않는다.** 수리는 읽을 때 적용되므로 이미 게시된 글에도 파서 변경만으로 반영된다. 구현 방식 제약이지 판정 명제가 아니라 체크박스로 두지 않는다.
- **원본·사유서**: `specs/50.blocked/spec/common/markdown-emphasis-delimiter-parity.md` · `..._reason.md` (참조용 잔존 — 본 계약이 되찾은 뒤에도 원본 이동은 inspector 권한 밖이다).
