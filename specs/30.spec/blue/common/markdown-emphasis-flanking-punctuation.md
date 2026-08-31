# 구분자에 붙은 문장부호는 강조를 열지도 닫지도 않는다 — flanking 조건 2

> **위치**: `src/common/markdownParser.ts` — `inlineParsing` 의 `strictFlanking` 판정 (여는 쪽 `:1040` · 닫는 쪽 `:1058`), 등록 5곳 (`:906` `**` · `:907` `~~` · `:930` `*` · `:938` `__` · `:939` `_`). 관측 표면 4 (§의존성 도출): 저장 요약 · `meta description` · 목록 본문 렌더 · 편집 미리보기.
> **관련 요구사항**: REQ-20260831-078 FR-01~FR-07 · NFR-01~NFR-04
> **최종 업데이트**: 2026-09-01 (by inspector 255차 tick — 최초 박제, HEAD=`5420677`)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷이다.

## 역할

**구분자 런의 flanking 자격은 공백만으로 정해지지 않는다.** CommonMark 는 left-flanking 을 두 조건의 곱으로 정의한다 — (1) 뒤가 공백이 아니고, (2a) 뒤가 문장부호가 아니거나 (2b) 뒤가 문장부호이면서 **앞이 공백이거나 문장부호**. 이 저장소의 `strictFlanking` 은 **조건 1 만** 구현한다. 그래서 낱말에 붙은 구분자가 문장부호를 만나도 강조를 **열고**, 대칭으로 문장부호에 붙은 구분자가 낱말을 만나도 강조를 **닫는다**.

본 계약은 **조건 2 를 양방향으로 세운다.** 판정 지점은 하나이고 구분자는 다섯이므로 (`**` `~~` `*` `__` `_`) 계약도 다섯에 대등하게 걸린다.

**독자가 보는 손상**: 한국어 늘임표기(`대박~~.` · `진짜~~,`)를 쓴 글에서 그 뒤 문장이 통째로 어긋난다. 요약 경로는 태그를 벗기므로 `대박~~. 그리고 ~~취소~~ 다` 가 `대박. 그리고 취소 다` 로 줄어 **물결 네 글자가 화면에서 사라진다.** 글쓴이는 자기 원문에서 잘못을 찾을 수 없다.

**회귀가 아니라 처음부터 없던 절이다.** `0ff9787`(겹 별표)·`854541a`(물결)이 건 조건 1 은 유효하며 본 계약이 그것을 바꾸지 않는다.

**의도적으로 하지 않는 것**:

- **여러 여는 후보 중 어느 것이 닫는 구분자와 짝이 되는가** — 짝짓기 규칙(nearest-opener) 축이며 본 계약의 요구 대상이 아니다. §참고 §짝짓기 축.
- `***셋***` 3중 구분자 중첩 · 낱말 안쪽 억제(`intrawordSuppression`) 정책 변경 · 강조의 CSS 표현 · 저장된 원문 수리 · 블록 패스 순서.
- **구분자 런 길이 판정**(조건 1 의 `runCharacter` 항) 변경.

## 공개 인터페이스

- `markdownToHtml(text: string): string` 의 산출. 새 export 는 없다 — 문장부호 술어는 모듈 내부 단일 출처다.

## 동작

1. **(I1) 여는 쪽 조건 2** (FR-01): 여는 구분자 **뒤가 문장부호**이고 **앞이 공백도 문장부호도 아니면** 강조를 열지 않는다. 줄의 시작·끝은 공백으로 센다.

2. **(I2) 닫는 쪽 조건 2** (FR-02): 닫는 구분자 **앞이 문장부호**이고 **뒤가 공백도 문장부호도 아니면** 강조를 닫지 않는다.

   > 이 방향의 기대 산출은 **글자로 남는 것**이다. 그 run 은 2a·2b 를 둘 다 실패해 닫을 자격이 없고, 여는 자격만 남아 짝이 없다.

3. **(I3) 다섯 구분자 대등** (FR-03): (I1)(I2) 는 `strictFlanking` 이 켜진 다섯 등록 **전부**에 같게 적용된다. 구분자별 예외를 두지 않는다.

4. **(I4) 판정 단일 출처** (FR-04): 문장부호 술어는 **한 곳에서 정의**되고 다섯 등록이 그것을 공유한다. `WORD_CHARACTER_PATTERN` 과 같은 형태다. 구분자별 사본을 만들지 않는다.

5. **(I5) 판정면은 유니코드 `P`+`S`** (FR-05): CommonMark §2.1 의 *"Unicode `P` (punctuation) or `S` (symbol) general categories"* 를 따라 `/[\p{P}\p{S}]/u` 다. **ASCII 문장부호 열거로 대신하지 않는다** — 한국어 본문에 오는 `…` · `·` · `？` 가 그 열거 밖에서 조용히 갈린다.

6. **(I6) 조건 1 은 바뀌지 않는다** (FR-07): 공백·런 판정의 현 동작이 보존된다. 조건 2 는 조건 1 **뒤에 붙는 추가 관문**이지 그것을 대체하지 않는다.

7. **(I7) 2b 가 살리는 셀은 살아 있다**: 뒤가 문장부호여도 **앞이 공백이거나 문장부호면** 연다. `**"굵게"** 다` · `(**굵게**) 다` · `~~"취소"~~ 다` 가 그 셀이다.

   > **이 항이 없으면 (I1) 은 과잉 구현으로 통과한다.** *"뒤가 문장부호면 열지 않는다"* 로 단순화한 구현은 `**"굵게"**` 를 깨뜨리는데, W_P 셀만 보는 게이트에는 그 파손이 보이지 않는다. 닫는 쪽의 같은 자리는 `~~"취소"~~` 다.

### `~~` 의 조건 2 는 표준 요구가 아니다 (FR-06)

CommonMark 0.31.2 의 `delimiter run` 정의는 **`*` 와 `_` 만** 다룬다 (`spec.txt:6142-6156`). `~~` 는 GFM 확장이고 원문에 flanking 조항이 없다.

그럼에도 본 계약이 `~~` 에 조건 2 를 거는 근거는 **이 저장소가 이미 내린 결정의 귀결**이다 — `854541a` 가 `~~` 를 `strictFlanking` 아래로 옮기며 조건 1 을 `*`·`_` 와 대등하게 걸었고 그 계약은 승격됐다 (`blue/common/markdown-tilde-strikethrough-space-flanking`). 대등성을 채택한 이상 조건 2 만 떼어 놓으면 **같은 판정 지점이 구분자에 따라 다르게 행동한다.**

**남의 규격에 기대는 것과 자기 결정의 귀결은 다르게 적어야 한다.** `*`·`_`·`**`·`__` 의 조건 2 는 표준 인용으로 방어되고, `~~` 의 조건 2 는 이 문단으로 방어된다. 대등성 결정이 뒤집히면 `~~` 만 이 계약에서 빠지며 나머지 넷은 영향받지 않는다.

## 회귀 중점

- **조건 2 를 조건 1 자리에 합치는 방향**은 2b 를 삼킨다. 두 조건은 곱이 아니라 *"(1) 그리고 (2a 또는 2b)"* 이며, 앞 문자를 보지 않는 단순화가 정확히 `**"굵게"**` 를 깨뜨린다.
- **여는 쪽만 고치는 방향**은 절반이다. 닫는 쪽은 대칭 조항이고 손상 실측도 5/5 로 대칭이다 — 대칭 예시 하나로 양쪽을 함께 재면 한 방향이 죽은 것을 못 본다.
- **ASCII 문장부호 열거로 좁히는 방향**은 한글 본문에서 조용히 갈린다. 예시가 `.` `,` `?` 뿐인 게이트에는 보이지 않는다 — `WORD_CHARACTER_PATTERN` 이 `[A-Za-z0-9]` 로 좁았을 때와 **같은 실패 형태**다 (`markdownParser.ts:990` 주석).
- **구분자별로 조건 2 를 켜고 끄는 방향**은 판정 지점이 하나라는 사실을 버린다. 다섯 사본은 넷이 낡을 자리를 만든다.
- **기존 게이트를 완화해 닫는 방향**은 금지다. 조건 1 게이트(`markdown-star-emphasis-space-flanking` · `markdown-tilde-strikethrough-space-flanking`)는 그대로 초록이어야 한다.

## 의존성

- 내부: `src/common/markdownParser.ts` (`inlineParsing` · `strictFlanking` · `WORD_CHARACTER_PATTERN`).
- 외부: CommonMark 0.31.2 `spec.txt` §6.2 (flanking 정의 · `Unicode punctuation character`).
- **역의존 (사용처) — 열거하지 않고 도출한다**: `bash -c 'grep -rn "markdownToHtml" src --include="*.ts" --include="*.tsx" | grep -v "test\|__fixtures__" | grep -vE "^[^:]*:[0-9]*:[[:space:]]*//"'` → HEAD=`5420677` 실측 **5 hit in 4 files** (`api.ts` 는 import 1 + 호출 1) — 정의 `src/common/markdownParser.ts` · 호출 `src/Log/api.ts:96`(요약) · `src/Log/LogItem.tsx:94`(목록 본문 렌더) · `src/Log/Writer.tsx:224`(편집 미리보기). **제외 규칙**: 주석 줄 2건(`src/Log/api.ts:64` · `src/Log/diffContents.ts:85`)은 호출이 아니다 — 주석을 세면 `diffContents.ts` 가 사용처로 오르는데 그 파일은 이 함수를 부르지 않는다. `grep -rln` 만 쓰면 그 구분이 사라져 **5 files** 가 나온다.
- **간접 표면 1건 — 도출로는 안 보인다**: `src/Log/LogSingle.tsx:81` 은 `markdownToHtml` 을 직접 부르지 않고 `api.ts` 의 `trimmedContents` 를 통해 도달하며 그 산출이 **`meta description`** 으로 나간다 (`grep -rn "trimmedContents" src` → 비-테스트 4 hit). **따라서 손상 표면은 셋이 아니라 넷이다**: 저장 요약 · meta description · 목록 본문 렌더 · 편집 미리보기.
- 직교: `blue/common/markdown-star-emphasis-space-flanking` · `blue/common/markdown-tilde-strikethrough-space-flanking` (둘 다 **조건 1** 소유 — 본 계약은 조건 2 만 진다) · `blue/common/markdownParser.md` (`inlineParsing` 알고리즘).

## 테스트 현황

> 각 명령은 HEAD=`5420677` 에서 **파일에서 추출해** 실행했고 rc 를 박제한다 (손 전사 0 — `RULE-06 §추출 실패 검출`). 산출 실측은 `git archive HEAD` 격리 사본 + `node_modules` 심볼릭 링크에서 했고 메인 워킹트리 `src` 는 읽기만 했다.

- [x] (I1 여는 쪽) 여는 쪽 조건 2 가 게이트로 실재하고 초록이다: `bash -c 'set -- $(grep -rl "구분자 뒤에 문장부호가 오면 강조를 열지 않는다" src 2>/dev/null); test "$#" -ge 1 || exit 2; npx vitest run "$@" -t "구분자 뒤에 문장부호가 오면 강조를 열지 않는다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`5420677` 실측 **rc=2 (게이트 부재 — 무판정)**. 미착수 축이며 이관처는 미발행이다. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (I2 닫는 쪽) 닫는 쪽 조건 2 가 게이트로 실재하고 초록이다: `bash -c 'set -- $(grep -rl "구분자 앞에 문장부호가 오면 강조를 닫지 않는다" src 2>/dev/null); test "$#" -ge 1 || exit 2; npx vitest run "$@" -t "구분자 앞에 문장부호가 오면 강조를 닫지 않는다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`5420677` 실측 **rc=2 (게이트 부재 — 무판정)**. **(I1) 과 반드시 별개 이름이어야 한다** — 한 이름으로 합치면 한 방향이 죽어도 붉지 않는다. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (I3 다섯 구분자 대등) 손상 표 13 행이 다섯 구분자 전부에서 게이트에 박제돼 있다: `bash -c 'set -- $(grep -rl "구분자 뒤에 문장부호가 오면 강조를 열지 않는다" src 2>/dev/null); test "$#" -ge 1 || exit 2; n=0; for d in "끝\*\. 다음" "끝_\. 다음" "대박~~\. 그리고" "끝\*\*\. 다음" "끝__\. 다음"; do grep -qE "$d" "$@" && n=$((n+1)); done; echo "delimiters-covered=$n"; test "$n" -ge 5'` → HEAD=`5420677` 실측 **rc=2 (게이트 부재)**. **정적 불변식이자 계수 항이다** — 이 수치가 통과시키는 것은 *"게이트 파일에 다섯 구분자의 손상 입력이 각각 열거돼 있다"* 뿐이고, **그 입력들이 옳은 산출을 내는가는 (I1)(I2) 의 동작 게이트가 잰다.** 다섯을 세는 것으로 대등성이 성립했다고 읽으면 안 된다 (`foundation/gate-effective-surface-and-variant-battery` (I4) §계수 항). · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (I4 판정 단일 출처) 문장부호 술어가 한 곳에서 정의된다: `bash -c 'f=src/common/markdownParser.ts; test -f "$f" || exit 2; d=$(grep -cE "^const [A-Z_]*PUNCTUATION[A-Z_]*_PATTERN = " "$f"); echo "punctuation-pattern-definitions=$d"; test "$d" -eq 1'` → HEAD=`5420677` 실측 **rc=1**, 출력 `punctuation-pattern-definitions=0` (미착수). **정적 불변식이다** — 판정면이 정의의 개수이므로 정적 명령이 정확한 측정면이며, 그 정의가 실제로 판정을 지배하는가는 (I1)(I2) 의 동작 게이트가 잰다. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (I5 유니코드 카테고리) 문장부호 판정면이 `P`+`S` 유니코드 카테고리다: `bash -c 'f=src/common/markdownParser.ts; test -f "$f" || exit 2; grep -qE "\\\\p\{P\}" "$f" && grep -qE "\\\\p\{S\}" "$f"'` → HEAD=`5420677` 실측 **rc=1** (미착수). **정적 불변식이다.** · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (I6·I7 대조 배터리) 조건 1 셀과 2b 셀이 대조로 박제돼 있다: `bash -c 'set -- $(grep -rl "문장부호에 인접한 정상 강조는 그대로다" src 2>/dev/null); test "$#" -ge 1 || exit 2; npx vitest run "$@" -t "문장부호에 인접한 정상 강조는 그대로다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`5420677` 실측 **rc=2 (게이트 부재)**. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (NFR-04 손상 채널) 늘임표기+문장부호 산문이 글자 소실 채널에 실재한다: `bash -c 'f=src/__tests__/markdown-no-character-loss.test.ts; test -f "$f" || exit 2; perl -0777 -ne '"'"'BEGIN{$n=0} if(/const PLAIN_PROSE = \[(.*?)\];/s){ my $b=$1; $n++ while $b=~/~~[.,?!]/g } print "prose-tilde-punctuation=$n\n"; exit($n>=1?0:1)'"'"' "$f"'` → HEAD=`5420677` 실측 **rc=1**, 출력 `prose-tilde-punctuation=0` (미착수). **요약 경로에서 글자가 사라지는 방향의 유일한 관측 채널이다.** **정적 불변식이자 계수 항이다** — 이 수치가 통과시키는 것은 *"늘임표기 뒤 문장부호 산문이 `PLAIN_PROSE` 에 최소 1건 있다"* 이며, 그 산문이 **실제로 글자를 보존하는가**는 같은 파일의 `it.each(PLAIN_PROSE)` 본문이 잰다. 항목 수를 늘리는 것으로 보존이 성립하지 않는다. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (I1~I7 접속) 조건 2 양방향이 성립하면서 파서·정제 스위트가 초록이다: `bash -c 'D=""; for n in "구분자 뒤에 문장부호가 오면 강조를 열지 않는다" "구분자 앞에 문장부호가 오면 강조를 닫지 않는다" "문장부호에 인접한 정상 강조는 그대로다"; do h=$(grep -rl "$n" src 2>/dev/null); test -n "$h" || exit 2; D="$D $h"; done; set -- $(printf "%s\n" $D | sort -u); test "$#" -ge 1 || exit 2; npx vitest run "$@" src/common/markdownParser.test.ts src/common/sanitizeHtml.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`5420677` 실측 **rc=2 (게이트 부재)**. **실행 인자를 이름에서 도출한다** — 이름을 확인하고 다른 스위트를 도는 접속 항은 민감도가 0 이다 (`foundation/gate-effective-surface-and-variant-battery` (I6)). · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (비퇴행 baseline) 파서·정제 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts src/common/sanitizeHtml.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`5420677` 실측 **rc=0** (184 tests). **조건 2 시제품 트리에서도 rc=0** 이고 전체 스위트도 `1384 passed | 12 skipped` (118 파일) 로 초록이다 — 즉 **현행 게이트 중 어느 것도 이 축을 재지 않는다.**

## 수용 기준

- [x] (Must, FR-01·FR-03) 위 §테스트 현황 (I1 여는 쪽) 명령 → rc=0. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (Must, FR-02·FR-03) 위 §테스트 현황 (I2 닫는 쪽) 명령 → rc=0. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (Must, FR-03) 위 §테스트 현황 (I3 다섯 구분자 대등) 명령 → rc=0 (`delimiters-covered` = 5). · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (Must, FR-04) 위 §테스트 현황 (I4 판정 단일 출처) 명령 → rc=0 (`punctuation-pattern-definitions` = 1). · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (Must, FR-05) 위 §테스트 현황 (I5 유니코드 카테고리) 명령 → rc=0. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (Must, FR-07·NFR-02) 위 §테스트 현황 (I6·I7 대조 배터리) 명령 → rc=0. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (Should, NFR-04) 위 §테스트 현황 (NFR-04 손상 채널) 명령 → rc=0 (`prose-tilde-punctuation` ≥ 1). · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (Must, FR-01~FR-07 접속) 위 §테스트 현황 (I1~I7 접속) 명령 → rc=0. · HEAD=`c82c629` 재측정 **rc=0** (fd62f3a 착지).
- [x] (Must, NFR-03 비퇴행 baseline) 위 §테스트 현황 (비퇴행 baseline) 명령 → rc=0. HEAD=`5420677` 실측 rc=0.
- [x] (Must, 범위 제한) 짝짓기 규칙(nearest-opener) · `***셋***` 중첩 · 낱말 안쪽 억제 정책 · 강조의 CSS 표현 · 저장된 원문 수리 · 구분자 런 길이 판정은 본 계약의 요구 대상이 아니다 — §역할 · §참고 §짝짓기 축.

## 스코프 규칙

- **expansion**: 불허 — 대상은 `src/common/markdownParser.ts` 와 파서 게이트 파일(`src/common/markdownParser.test.ts` 또는 신설 스위트), 그리고 글자 소실 채널 `src/__tests__/markdown-no-character-loss.test.ts` 다. **소비 표면 넷(`src/Log/api.ts` 요약 · `src/Log/LogSingle.tsx` meta description · `src/Log/LogItem.tsx` 목록 렌더 · `src/Log/Writer.tsx` 미리보기)은 읽기 대상이며 고치지 않는다** — 손상은 그 넷에 나타나지만 원인은 파서 한 곳이고, 소비 쪽을 고치면 표면마다 사본이 생긴다.
- **grep-baseline** (HEAD=`5420677`, 저장소 루트 read-only 실측):
  - `grep -cE "strictFlanking" src/common/markdownParser.ts` → **3 hits** (`:1003` 시그니처 · `:1040` 여는 쪽 · `:1058` 닫는 쪽). **판정 지점은 둘, 시그니처가 하나다.**
  - `grep -nE "inlineParsing\(" src/common/markdownParser.ts` → **5 hits in 1 file**: `:906` `**` · `:907` `~~` · `:930` `*` · `:938` `__` · `:939` `_`. **등록 5 전부 `strictFlanking=true`.** 정의(`:1003`)는 `inlineParsing = (` 라 이 패턴에 걸리지 않는다 — **호출만 세는 것이 의도이며 그 사실을 여기 박제한다.**
  - `grep -cE "WORD_CHARACTER_PATTERN" src/common/markdownParser.ts` → **2 hits** (정의 1 · 사용 1). 문장부호 술어가 따라야 할 형태다.
  - `grep -cE "^const [A-Z_]*PUNCTUATION[A-Z_]*_PATTERN = " src/common/markdownParser.ts` → **0 hits** (현 baseline — 착지 후 1).
  - `grep -rn "markdownToHtml" src --include="*.ts" --include="*.tsx" | grep -v "test\|__fixtures__" | grep -vE "^[^:]*:[0-9]*:[[:space:]]*//"` → **5 hits in 4 files** (§의존성 역의존과 같은 도출 · 주석 2 제외 · `api.ts` import 1 포함). 주석을 세지 않으면 5 files 가 나오고 그중 `diffContents.ts` 는 호출자가 아니다.
- **rationale**: 판정 지점이 2 · 등록이 5 · 술어 정의가 0 → 1 로 정수로 닫히므로 baseline 이 열거로 닫힌다. expansion 을 불허로 잡은 이유는 **가장 싼 통과 경로가 소비 쪽(요약·렌더)에서 증상을 지우는 것**이기 때문이다 — 그 경로는 게이트를 초록으로 만들면서 원인을 남긴다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 255차 tick (Phase 3, REQ-20260831-078 흡수) / pending @ HEAD=`5420677` | 최초 박제 — flanking 조건 2 양방향 7 축 (I1~I7). **신설 계약으로 세운 근거**: 판정 지점은 하나(`:1040`·`:1058`)인데 구분자 소유가 넷으로 흩어져 있고 그중 `*` 는 소유 계약이 아예 없으며 `_`·`__` 소유는 `50.blocked/spec/` 에 있다 — **blue 둘을 재개봉해 조건 2 를 나눠 넣으면 같은 두 줄을 두 문서가 나눠 갖는다.** 조건 2 는 조건 1 과 다른 축이므로 blue 두 계약은 거짓이 되지 않는다 (시제품 트리 `npx vitest run markdownParser sanitizeHtml` → **rc=0 · 184 tests**, 전체 스위트 **1384 passed / 12 skipped**). **`*` 의 소유 공백을 이 계약이 함께 닫는다.** 손상·대조 35 행 전건 격리 사본 실측 후 조건 2 시제품으로 재측정 — 손상 13 행이 기대 산출로 바뀌고 나머지 22 행이 **문자열 단위 불변**. **S_P·P_P 두 셀은 범위 밖으로 두되 "유지된다" 로 못 박지 않았다** (§참고 §짝짓기 축) — `markdown-emphasis-delimiter-parity` (I6) 이 정확히 그 형태로 거짓이 돼 격리됐다. **`~~` 의 조건 2 가 표준 요구가 아니라 저장소 대등성 결정의 귀결임을 §역할 하위 절로 갈라 적었다** (FR-06). **선행 문면 정정 1건**: `markdown-tilde-strikethrough-space-flanking.md:13` 이 손상 표면을 *"본문 렌더 · 목록 요약 · 검색 미리보기"* 셋으로 적었는데 도출 결과는 **넷**이고 구성도 다르다 — 저장 요약(`api.ts:96`) · `meta description`(`LogSingle.tsx:81`, `trimmedContents` 경유 **간접**이라 `markdownToHtml` 도출에 안 잡힌다) · 목록 본문 렌더(`LogItem.tsx:94`) · 편집 미리보기(`Writer.tsx:224`). *"검색 미리보기"* 는 현 HEAD 도출에 없다. 그 문서는 blue 라 본 tick 에 고치지 않았고 본 계약은 자기 도출을 쓴다. **본 문서 초안의 자체 오기 2건도 도출로 잡혔다**: `inlineParsing\(` 를 6 hits 로 적었으나 정의 줄은 `inlineParsing = (` 라 패턴에 걸리지 않아 **5** 이고, 역의존을 `grep -rln` 으로 세어 주석만 있는 `diffContents.ts` 가 사용처로 올라 **5 files** 가 나왔다 (주석 제외 후 4 files). unchecked 8 · checked 2. | all |
| 2026-09-01 | inspector 256차 tick (Phase 1 drift reconcile) / 측정 HEAD=`c82c629` | **[ ] → [x] 16** (§테스트 현황 8 + §수용 기준 8) — 조건 2 양방향이 `fd62f3a` (`fix: flanking 조건 2 를 양방향으로 구현한다`) 로 착지했다. 8 명령 전건을 이 문서에서 **추출**해 `git archive c82c629` 격리 사본(`src` 실사본 · `node_modules` 심볼릭 링크)에서 실행: I1 rc=0 · I2 rc=0 · I3 `delimiters-covered=5` rc=0 · I4 `punctuation-pattern-definitions=1` rc=0 · I5 rc=0 · I6·I7 rc=0 · NFR-04 `prose-tilde-punctuation=3` rc=0 · 접속 rc=0. **§수용 기준 10/10 promote 후보** (§테스트 현황 9/9) | §테스트 현황 · §수용 기준 |

## 참고

### 손상·대조 35 행 실측 (HEAD=`5420677` 격리 사본 · 조건 2 시제품 대비)

시제품은 `strictFlanking` 조건 1 블록 **뒤에** 조건 2 관문을 여는 쪽·닫는 쪽 각 1개씩 더한 것이며, 문장부호 술어는 `/[\p{P}\p{S}]/u` 단일 정의다. **시제품은 격리 사본에만 있고 메인 워킹트리 `src` 는 읽기만 했다** (`RULE-02 §교차 작업 파괴`).

**여는 쪽 — 조건 2 부재로 열면 안 되는데 여는 8 행 (전건 시제품에서 기대 산출로 이동)**

| 입력 | 현 산출 | 기대 산출 |
|---|---|---|
| `끝*. 다음 *기울임* 다` | `<p>끝<em>. 다음 *기울임</em> 다</p>` | `<p>끝*. 다음 <em>기울임</em> 다</p>` |
| `끝_. 다음 _기울임_ 다` | `<p>끝<em>. 다음 _기울임</em> 다</p>` | `<p>끝_. 다음 <em>기울임</em> 다</p>` |
| `대박~~. 그리고 ~~취소~~ 다` | `<p>대박<del>. 그리고 ~~취소</del> 다</p>` | `<p>대박~~. 그리고 <del>취소</del> 다</p>` |
| `끝**. 다음 **굵게** 다` | `<p>끝<strong>. 다음 **굵게</strong> 다</p>` | `<p>끝**. 다음 <strong>굵게</strong> 다</p>` |
| `끝__. 다음 __굵게__ 다` | `<p>끝<strong>. 다음 __굵게</strong> 다</p>` | `<p>끝__. 다음 <strong>굵게</strong> 다</p>` |
| `진짜~~, 그리고 ~~취소~~ 다` | `<p>진짜<del>, 그리고 ~~취소</del> 다</p>` | `<p>진짜~~, 그리고 <del>취소</del> 다</p>` |
| `진짜~~? 그리고 ~~취소~~ 다` | `<p>진짜<del>? 그리고 ~~취소</del> 다</p>` | `<p>진짜~~? 그리고 <del>취소</del> 다</p>` |
| `대박~~. 진짜~~. 좋다` | `<p>대박<del>. 진짜</del>. 좋다</p>` | `<p>대박~~. 진짜~~. 좋다</p>` |

**닫는 쪽 — 5 행 (전건 시제품에서 기대 산출로 이동)**

| 입력 | 현 산출 | 기대 산출 |
|---|---|---|
| `*가.*나 다` | `<p><em>가.</em>나 다</p>` | `<p>*가.*나 다</p>` |
| `**가.**나 다` | `<p><strong>가.</strong>나 다</p>` | `<p>**가.**나 다</p>` |
| `~~가.~~나 다` | `<p><del>가.</del>나 다</p>` | `<p>~~가.~~나 다</p>` |
| `_가._나 다` | `<p><em>가.</em>나 다</p>` | `<p>_가._나 다</p>` |
| `__가.__나 다` | `<p><strong>가.</strong>나 다</p>` | `<p>__가.__나 다</p>` |

**대조 배터리 — 구분자 앞/뒤 = {공백 S, 문장부호 P, 낱말문자 W} 9 셀**

| 셀 | 입력 | 현 산출 | 시제품 | 판정 |
|---|---|---|---|---|
| S_S | `가 ** 나 ** 다` | `<p>가 ** 나 ** 다</p>` | 불변 | 대조 (조건 1) |
| S_P | `가 **. 나 **굵게** 다` | `<p>가 <strong>. 나 **굵게</strong> 다</p>` | 불변 | **범위 밖 — §짝짓기 축** |
| S_W | `가 **굵게** 다` | `<p>가 <strong>굵게</strong> 다</p>` | 불변 | 대조 (정상 강조) |
| P_S | `가.** 나 ** 다` | `<p>가.** 나 ** 다</p>` | 불변 | 대조 (조건 1) |
| P_P | `가.**. 나 **굵게** 다` | `<p>가.<strong>. 나 **굵게</strong> 다</p>` | 불변 | **범위 밖 — §짝짓기 축** |
| P_W | `(**굵게**) 다` | `<p>(<strong>굵게</strong>) 다</p>` | 불변 | 대조 — **2b 가 살리는 셀** |
| W_S | `가** 나 ** 다` | `<p>가** 나 ** 다</p>` | 불변 | 대조 (조건 1) |
| **W_P** | `가**. 나 **굵게** 다` | `<p>가<strong>. 나 **굵게</strong> 다</p>` | `<p>가**. 나 <strong>굵게</strong> 다</p>` | **본 계약이 고치는 셀** |
| W_W | `가**나** 다` | `<p>가<strong>나</strong> 다</p>` | 불변 | 대조 (낱말 안쪽 현 정책) |

**문장부호 인접 정상 강조 11 행 + 조건 1 대조 2 행 — 시제품 전후 문자열 단위 동일 (실측)**

`**"굵게"** 다` · `(*기울임*) 다` · `정말 **굵게**? 그렇다` · `그리고 (**굵게**) 다` · `~~"취소"~~ 다` · `앞 -**굵게**- 뒤` · `정말! **굵게** 다` · `2 ** 10 은 1024 이고 2 ** 20 은 1048576 이다` · `와~~ 좋다 정말 대박~~` · `foo*bar*baz` · `no emphasis: foo_bar_baz` · `끝** . 다음 **굵게** 다` · `끝~~ . 그리고 ~~취소~~ 다`

### 짝짓기 축 (S_P·P_P — 본 계약의 요구 대상이 아니다)

S_P·P_P 의 첫 run 은 **정당하게 left-flanking 이다** — 뒤가 문장부호이고 앞이 공백/문장부호이므로 조건 2b 로 열 자격이 남는다. 따라서 이 두 셀의 잔여 어긋남은 flanking 조건이 아니라 **닫는 구분자에서 가장 가까운 여는 구분자를 되짚는 짝짓기 규칙**(CommonMark `spec.txt` §6.2 "process emphasis") 축이며 별 계약 사안이다.

**본 계약은 이 두 셀의 산출을 정하지 않는다.** 시제품에서 바뀌지 않았다는 것은 **관측이지 계약이 아니며**, 여기에 "유지된다" 를 적으면 짝짓기 계약이 도착하는 순간 승격된 문면이 거짓이 된다. 같은 형태가 `specs/50.blocked/spec/common/markdown-emphasis-delimiter-parity_reason.md §4` 로 이미 한 번 격리됐다.

같은 이유로 **이 두 셀을 음성 대조로 쓰지 않는다** — 계약이 지배하지 않는 자리를 대조로 쓰면 그 축에 계약이 도착할 때 대조가 대조이기를 그만둔다 (`RULE-06 §음성 대조` 과잉 특정).

### 소유 계약 — planner 로 넘기는 판단 (`50.blocked/**` 는 inspector 입력이 아니다)

판정 지점은 하나인데 구분자 소유는 넷으로 흩어져 있다. HEAD 실측:

| 구분자 | 조건 1 소유 | 상태 | 본 계약(조건 2) |
|---|---|---|---|
| `**` | `blue/common/markdown-star-emphasis-space-flanking` | blue | 소유 |
| `~~` | `blue/common/markdown-tilde-strikethrough-space-flanking` | blue | 소유 (대등성 귀결 — §역할) |
| `_` · `__` | `markdown-emphasis-delimiter-parity` | **`50.blocked/spec/`** (`32cbcd1`) | 소유 |
| `*` | **없음** | — | 소유 — **공백을 함께 닫는다** |

**본 계약은 조건 2 만 지므로 blue 재개봉도 격리 해제도 필요로 하지 않는다.** 근거: (a) 조건 2 는 조건 1 과 다른 관문이고, (b) 시제품에서 blue 두 계약의 게이트가 전건 초록이며(184 tests), (c) 두 blue 문서의 문면은 공백·런 판정을 말할 뿐 문장부호를 언급하지 않아 착지 후에도 참으로 남는다.

**그러나 `_`·`__` 는 조건 1·대등성 축이 격리 중이라는 사실이 남는다.** 격리 사유서는 *"`*` 소유 계약을 세우는 것이 (I6) 을 없애는 선행 조건"* 이라고 적었고 본 계약이 그 선행 조건을 만족시킨다. **격리 해제 판단은 `RULE-05 §Blocked 해제`(운영자) 소관이며 inspector 의 입력이 아니다** — 이 문단은 planner·운영자가 읽도록 남기는 재료이지 요청이 아니다.

### 미측정·비판정 항목 (`RULE-07 §수용 기준 문장 규약`)

- **기존 게시 글에서 `**.` · `~~.` 표기의 실제 빈도.** 원격 API 에 있고 저장소 픽스처(`src/Log/__fixtures__/logs.ts`)에는 없다. 방향의 비대칭은 분명하다 — 지금은 문장부호를 찍은 글이 통째로 어긋나고, 고친 뒤에는 강조를 의도한 표기가 글자로 보일 뿐 **내용이 남는다.**
- **S_P·P_P 셀의 기대 산출** — §짝짓기 축. 짝짓기 계약이 도착하기 전까지 정하지 않는다.
- **성능** — 문자 하나당 정규식 1~2회 추가. 측정 채널이 없다.
- **`\p{S}`(기호 카테고리)를 포함하는 선택의 실효 범위.** CommonMark §2.1 문면을 따랐고 시제품 35 행에서 차이가 관측되지 않았다 — 35 행 중 `+` `=` `$` 같은 순수 기호가 구분자에 인접한 입력이 없다. **문면은 표준을 따르되 그 선택이 무엇을 바꾸는지는 측정되지 않았다.**
- **양방향 주입은 task DoD 소관이다** (`RULE-06 §게이트 실효 검증`). 여는 쪽 조건 2 만 무력화 → `rc≠0`, 닫는 쪽만 무력화 → `rc≠0` 을 **따로** 확인한다. 함께 끄면 대칭 예시 하나로 둘 다 붉어져 한 방향이 죽은 것을 못 본다.

### 관련

- **원 req**: `specs/60.done/2026/09/01/req/20260831-emphasis-flanking-punctuation-clause.md` (REQ-20260831-078). 출처: 운영자 결함 신고 `specs/10.followups/20260831-1308-flanking-punctuation-clause-missing.md` (`RULE-05 §결함 신고`).
- **관련 커밋**: `0ff9787`(겹 별표 조건 1) · `854541a`(물결 조건 1) · `08756f9`(`*` 에 `strictFlanking` 부착).
- **외부 출처**: CommonMark 0.31.2 `spec.txt:6142-6156` (flanking 정의) · §2.1 (`Unicode punctuation character` = `P`+`S`).
