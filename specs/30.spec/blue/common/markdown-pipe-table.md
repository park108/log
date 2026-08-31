# 파이프 표는 표로 렌더된다 — 파이프가 문단으로 새지 않는다

> **위치**: `src/common/markdownParser.ts` — 블록 패스 `pre`(`:170`) · `hr`(`:216`) · `blockquote`(`:235`) · **이어짐**(`:281`) · `ul`(`:367`) · `ol`(`:394`) · `headers`(`:440`), 이스케이프·코드 스팬 추출 (`:532`~`:552`), 패스 순서 근거 주석 (`:519-531`). `src/common/sanitizeHtml.ts` — `ALLOWED_TAGS`(`:7-15`) · `ALLOWED_ATTR`(`:17`). `src/styles/typography.css` — 블록 요소 규칙. 게이트: `src/common/markdownParser.test.ts` · `src/common/sanitizeHtml.test.ts`.
> **관련 요구사항**: REQ-20260831-052 FR-01~FR-06 · NFR-01~NFR-04 · REQ-20260831-067 FR-01~FR-06 · NFR-01~NFR-03 (출처: developer followup `source_task: TSK-20260831-13-a` + `TSK-20260831-05-a` 격리 사유서)
> **최종 업데이트**: 2026-08-31 (by inspector — REQ-20260831-067 흡수: 정합 corpus 도출 + 대조 축 잠금, HEAD=`2e1a68d`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`1112fe2`).

> **측정 HEAD 주석**: 본 흡수 tick 중 외부 writer 가 `68ff19b`·`baa97c9` 를 커밋해 HEAD 가 `b1cbf5c` → `d4556b0` 로 이동했다. 두 커밋은 `index.html` · `src/Log/LogSingle.{tsx,test.tsx}` · 신규 `src/__tests__/link-preview-coherence.test.ts` 만 건드렸고, `git diff --name-only b1cbf5c..d4556b0 -- src/common/markdownParser.ts src/common/markdownParser.test.ts src/common/sanitizeHtml.ts src/common/sanitizeHtml.test.ts src/styles/` 는 **공집합**이다. 따라서 아래 rc 는 그대로 유효하며, 짝 spec `sanitizeHtml.md` 는 HEAD=`d4556b0` 에서 전수 재실행했다. 다른 writer 의 변경은 읽기만 했다 (`RULE-02 §교차 작업 파괴`).

## 역할

머리 행과 구분선 행으로 쓴 파이프 표는 **표 구조로 렌더된다** (GFM §4.10 *Tables (extension)*). 표기로 쓴 파이프와 구분선은 독자에게 보이지 않는다.

**방어 대상 (사용자 관측 표면)**: 표 하나가 **줄 수만큼의 문단**으로 쪼개져 파이프 문자와 구분선(`|---|---|`)까지 그대로 독자에게 보이는 상태. 표는 기술 글에서 가장 흔한 블록 구조 중 하나이며, 이 저장소의 spec·req 문서 자체가 표로 쓰여 있다.

**이 축은 한 모듈로 닫히지 않는다.** 파서가 표를 emit 해도 `sanitizeHtml` 의 `ALLOWED_TAGS` 에 표 태그가 하나도 없으면 DOM 주입 직전 정제에서 구조가 통째로 사라진다 — 실측상 머리 셀의 글자마저 남지 않는다 (§스코프 규칙 baseline). 즉 파서만 고치면 결과는 지금과 **다른 방식으로 여전히 틀리다**. 스타일 채널도 마찬가지다: 태그가 통과해도 규칙이 없으면 테두리 없는 맨 텍스트로 보여 §역할 첫 문단의 문제가 형태만 바꿔 남는다.

**그리고 이 축을 실제로 막고 있던 것은 파서도 정제도 아니라 게이트였다.** `src/__tests__/parser-sanitizer-coherence.test.ts` 는 *"파서가 내는 것을 sanitizer 가 지우면 글자가 사라진다"* 를 재는 자리이고 머리말이 그 예로 **표를 명시**한다. 그런데 그 게이트의 모집단은 두 개의 하드코딩된 열거 위에 서 있다 — corpus **13행**(표 입력 0행)과 기대 태그 **17개**(`table` 없음). **자기 머리말이 지목한 축을 자기 모집단이 담고 있지 않다.** 파서가 표를 emit 하기 시작해도 그 축에서는 아무것도 재지 않는다 (`RULE-06 §열거 고정 금지`).

**같은 파일의 음성 대조는 한 번 이 축을 실제로 막았다.** 대조의 예시 태그가 `<table>` 이었고, 표를 허용 목록에 넣는 작업(`TSK-20260831-05-a`)이 *"sanitizer 는 허용 밖 태그를 지운다"* 를 깨뜨려 격리됐다. 한 파일 안에서 머리말과 대조가 서로 반대를 전제하고 있었다. `a13de9a` 가 예시 태그를 `<iframe>`·`<script>` 로 옮겨 해소했고 **본 계약은 그 정정이 되돌려지지 않게 잠근다** — 음성 대조의 예시 태그는 **정책이 바뀔 축에서 고르지 않는다**.

**이 계약의 또 다른 절반은 표가 아닌 것을 표로 만들지 않는 것이다.** 파이프는 산문에도 흔하다 (셸 파이프라인, 논리합, 표기 구분). GFM 이 표를 **머리 행 + 구분선 행**의 쌍으로 규정하는 이유가 이것이며, 구분선 행을 요구하지 않는 구현은 파이프가 든 모든 문단을 표로 만든다.

의도적으로 하지 않는 것: 셀 안의 블록 요소 (목록·코드 블록·여러 문단 — GFM 도 셀 내용을 인라인으로 한정한다), 표의 시각 디자인 확정 (테두리 두께·색·여백 — 계약은 **구조가 표로 남는가** 이며 스타일 값은 수단이다. 다만 (I7) 이 채널의 **존재**는 요구한다), 열 병합(`colspan`)·중첩 표·캡션, 다른 마크다운 축 (강조 구분자 · 목록 이어짐 · 제목 닫는 시퀀스 — 각각 별 spec).

## 공개 인터페이스
- 변경 없음. 계약면은 **산출 HTML** 과 그 산출이 sanitize 를 통과한 뒤의 DOM 이다.

## 동작

1. **(I1) 머리 행 + 구분선 행이면 표다**: 머리 행 다음 줄이 구분선 행(`---` 계열을 파이프로 구분한 행)이면 그 덩어리는 표로 렌더된다. 머리 행은 머리 셀로, 이후 행은 본문 셀로 구분된다.
2. **(I2) 산출은 sanitize 를 통과해 화면에 닿는다**: `sanitizeHtml` 정책 상수에 표 태그가 등재된다. 파서만 고치고 끝내지 않는다 — 통과하지 못하는 표는 렌더된 것이 아니다.
3. **(I3) 구분선 행이 없으면 표가 아니다**: 파이프가 든 산문 문단은 그대로 문단으로 남는다. `명령은 a | b 이다` 는 `<p>명령은 a | b 이다</p>` 다.
4. **(I4) 이스케이프된 파이프는 셀 구분자가 아니다**: 셀 안의 `\|` 는 파이프 글자이며 셀을 가르지 않는다. **표 패스가 직접 처리해야 한다** — 백슬래시 이스케이프 패스는 `:532`~`:552` 에서 돌고 블록 패스는 그보다 앞(`:170`~`:465`)이므로, 표 패스는 자리표시자가 아니라 날것의 `\|` 를 본다.
5. **(I5) 정렬 표기도 구분선 행이다**: `:--` · `--:` · `:-:` 를 쓴 구분선 행도 표로 인식된다. 정렬의 **시각 반영**은 Should 이며, 반영하더라도 `ALLOWED_ATTR` 확장 없이 기존 허용 속성(`class`) 안에서 한다.
6. **(I6) 셀 안의 인라인 마크업은 동작한다**: 강조·코드 스팬·링크가 셀 안에서 종전대로 동작한다.
7. **(I7) 스타일 채널이 존재한다**: `src/styles/` 에 표 요소 규칙이 1건 이상 있다. `blockquote`(`typography.css:44`) · `pre`(`:65`) 처럼 블록 요소마다 규칙을 두는 이 저장소의 관례와 같다.
8. **(I8) 정책은 단일 출처를 지킨다 (범위 제한)**: 표 태그 등재는 `src/common/sanitizeHtml.ts` **안에서만** 이뤄진다. `blue/common/sanitizeHtml.md` (I1) 단일 모듈 정책을 깨지 않으며, 파서 쪽이나 호출처에서 표 태그를 따로 허용하는 형태는 정책 분기다. 속성 표면도 넓히지 않는다 — `style` 속성 허용은 (I3) 계열 정책 확장이라 별 축이다.

9. **(I9) 정합 게이트의 모집단은 파서 산출을 덮는다**: `parser-sanitizer-coherence` 의 corpus 와 기대 태그 목록은 **파서가 emit 하는 블록 문법에서 도출**된다. 도출이 불가능하면 **목록 완전성 보조 단언**을 함께 둔다 (`RULE-06 §열거 고정 금지`). 최소 결합으로 표현하면 — **표 태그가 `ALLOWED_TAGS` 에 오르면 corpus 에 표 입력이 1행 이상 있어야 한다.** 지금은 표 태그가 0이라 이 명제가 공허하게 참이며, **표 패스가 착지하는 순간 구속력을 얻는다.**

    > **이 결합이 없으면 (I2) 가 통과하면서 정합 게이트는 표를 재지 않는다.** 허용 목록에 6 태그를 넣어 (I2) 를 초록으로 만들어도, corpus 에 표 입력이 없으면 "파서 산출이 정제를 통과하는가" 는 표 축에서 **한 번도 측정되지 않는다.** 두 게이트가 각자 초록인데 축은 비어 있는 상태다.

10. **(I10) 음성 대조의 예시 태그는 정책이 바뀔 축에서 고르지 않는다**: `parser-sanitizer-coherence` 의 *"허용 밖 태그를 실제로 지운다"* 대조는 **앞으로도 허용되지 않을 태그**로 구성한다. `<table>`·`<input>` 은 부적격이고 `<iframe>`·`<script>` 는 적격이다 — 임베딩·스크립팅 태그는 마크다운 렌더 결과에 들어올 이유가 없다. **검출력은 태그 선택과 무관하다** ("지우는가" 를 재는 데 어떤 태그를 쓰는지는 상관없다). 예시는 **2개 이상** 둔다 — 한 종류만 특별 취급하는 구현을 거르기 위해서다.

    > **이것은 `RULE-06 §음성 대조` 가 말하는 과잉 특정의 실물이다.** 대조가 정책 축 위에 서면 **정당한 정책 확장이 대조를 붉힌다.** 그때 고쳐야 할 것은 정책이 아니라 대조인데, 격리 사유서가 그 판단에 도달하기까지 task 한 건이 통째로 격리됐다.

### 회귀 중점
- **(I1) 만 만족시키고 (I2) 를 빠뜨리는 구현**이 이 축의 대표 실패다 — 파싱은 되는데 화면에 닿지 않는다. 두 축을 분리해 재지 않으면 "표를 emit 하지만 sanitize 가 지우는" 상태가 통과한다. 그 상태는 지금보다 나쁠 수 있다: 현재는 최소한 셀 글자가 문단으로라도 보이지만, 그때는 머리 셀 글자마저 사라진다 (§스코프 규칙 baseline 실측).
- **(I3) 를 빠뜨리면 파이프가 든 모든 문단이 표가 된다.** 산문 속 파이프는 흔하므로 피해 범위가 표 표기를 쓴 글보다 넓다.
- 표 패스를 이스케이프 패스 **뒤**로 옮겨 (I4) 를 해결하려는 방향은 범위 밖이다. 코드 스팬·이스케이프의 현 계약이 그 순서에 기대고 있으며 `markdownParser.ts:370-379` 가 그 근거를 박제한다. 표 패스가 `\|` 를 스스로 처리하는 쪽을 택한다.
- `ALLOWED_TAGS` 에 표 태그를 넣으면서 회귀 fixture 를 갱신하지 않으면 `sanitizeHtml.md` (I6) "정책 변경 단일 진입점" 위반이다.
- (I7) 을 만족시키려고 인라인 `style` 속성을 쓰면 (I8) 위반 — 속성 표면 확장이다.
- **`ALLOWED_TAGS` 에 표 6 태그만 넣고 corpus 를 그대로 두는 방향은 (I9) 를 깬다.** (I2) 는 초록이 되지만 정합 게이트는 표 축을 **여전히 재지 않는다**. 두 게이트가 각자 초록인 채로 축이 비는 것이 이 부류의 대표 실패다.
- **음성 대조를 `<table>` 로 되돌리는 방향은 (I10) 을 깨고 (I2) 와 동시 참이 불가능해진다.** `a13de9a` 이전 상태이며, 그 상태에서 표를 허용하는 작업은 반드시 격리된다.
- **corpus·기대 태그를 손으로 늘려 (I9) 를 만족시키는 방향은 다음 문법에서 되풀이된다.** 열거를 늘리는 것은 이번 축만 덮으며, 완전성 보조 단언이 없으면 다음에 추가되는 블록 문법이 같은 자리에 숨는다.

## 의존성
- 내부: `src/common/markdownParser.ts` (표 블록 패스), `src/common/sanitizeHtml.ts` (허용 태그), `src/styles/` (표 규칙), `src/common/markdownParser.test.ts` · `src/common/sanitizeHtml.test.ts` · **`src/__tests__/parser-sanitizer-coherence.test.ts` (정합 게이트 — (I9)(I10) 의 대상)** (게이트).
- 외부: `dompurify` (sanitize 구현 — 버전 정합은 `dependency-bump-gate.md` 영역).
- **역의존 (사용처) — 열거하지 않고 도출한다**: `bash -c 'grep -rn "markdownToHtml(" src --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "common/markdownParser\.ts"'` → HEAD=`86ede5c` 실측 **4 hit**. 실제 호출 **3**건: `src/Log/Writer.tsx` (작성 미리보기 — 글쓴이가 저장 전 결과를 보는 유일한 화면) · `src/Log/LogItem.tsx` (본문 렌더, `sanitizeHtml` 경유) · `src/Log/api.ts` (요약 `trimmedContents`). **제외 규칙**: 나머지 1건 `src/Log/__fixtures__/logs.ts` 는 fixture 본문 안의 **글자열이지 호출이 아니다**. **Comment 는 이 파서를 쓰지 않는다** — `bash -c '! grep -rq "markdownToHtml\|markdownParser\|dangerouslySetInnerHTML" src/Comment'` → rc=0 (0 hit). 댓글 본문은 평문 렌더다 (`CommentItem.tsx` 가 `message.split("\n")` 을 `<p>` 로 그린다). **라인 번호는 인용하지 않는다** — 오늘 하루 파서 12+커밋이 이 파일들의 좌표를 전건 밀었다 (`spec-dependency-reverse-derivation` (I4)).
- 직교: `specs/30.spec/green/common/sanitizeHtml.md` — 그 spec 의 **(I12)** 가 본 축의 (I2) 를 정책 쪽에서 받으며, (I1) 단일 모듈 정책과 (I6) 정책 변경 단일 진입점이 본 축의 (I2)(I8) 을 규율한다. 본 spec 은 **무엇이 허용돼야 하는가** 를 요구하고, 그 spec 은 **어디서 어떻게 바꾸는가** 를 규율한다. `specs/30.spec/blue/common/markdownParser.md` (`bindListItem` + 속성 escape 축 — 본 축과 무관).

## 테스트 현황
- [x] (I1·I5·I6) 표 렌더 계약이 게이트로 실재하고 초록이다: `bash -c 'grep -qF "파이프 표" src/common/markdownParser.test.ts && npx vitest run src/common/markdownParser.test.ts -t "파이프 표" >/dev/null 2>&1'` → HEAD=`1112fe2` 254차 재실측 **rc=1 (미충족, 불변)**. `grep -cF "파이프 표" src/common/markdownParser.test.ts` → **0**. 미착수 축이며 이관처는 `TSK-20260831-23-a` (`40.task/` 대기). → HEAD=`5420677` 255차 재실측 **rc=0** (`TSK-20260831-23-a` 착지 — `markdownParser.test.ts:509` `it("파이프 표")`, vitest `1 passed | 166 skipped` 로 필터 공집합 아님을 확인).
- [x] (I3·I4) 대조 게이트가 실재하고 초록이다 — 구분선 없는 산문 파이프와 이스케이프된 파이프: `bash -c 'grep -qF "구분선 행이 없으면 표가 아니다" src/common/markdownParser.test.ts && npx vitest run src/common/markdownParser.test.ts -t "구분선 행이 없으면 표가 아니다" >/dev/null 2>&1'` → HEAD=`1112fe2` 254차 재실측 **rc=1 (미충족, 불변)**. **이 대조가 없으면 파이프가 든 모든 문단을 표로 만드는 구현도 (I1) 을 통과한다.** → HEAD=`5420677` 255차 재실측 **rc=0** (`markdownParser.test.ts:542`).
- [x] (I2 정적 zero-point) sanitize 허용 태그에 표 태그가 등재돼 있다: `bash -c 'f=src/common/sanitizeHtml.ts; grep -q "ALLOWED_TAGS" "$f" || exit 2; n=$(grep -oE "'\''(table|thead|tbody|tr|th|td)'\''" "$f" | wc -l | tr -d " "); echo "table-tag-entries=$n"; [ "$n" -ge 6 ]'` → HEAD=`1112fe2` 254차 재실측 **rc=0 (유지)**, 출력 `table-tag-entries=6`. `TSK-20260831-17`(`d98815d`) 착지. 파일에 `ALLOWED_TAGS` 가 없으면 `exit 2` 로 무판정 처리한다 (공허 통과 차단).
- [x] (I7) 표 스타일 규칙이 실재한다: `bash -c 'n=$(grep -rhcE "^[[:space:]]*(table|thead|tbody|th|td)[[:space:],{]" src/styles/ | awk "{s+=\$0} END {print s+0}"); echo "table-style-rules=$n"; [ "$n" -ge 1 ]'` → HEAD=`1112fe2` 254차 재실측 **rc=1 (불변)**, 출력 `table-style-rules=0`. 이관처는 `TSK-20260831-23-b` (`40.task/` 대기). → HEAD=`5420677` 255차 재실측 **rc=0**, 출력 `table-style-rules=4` (`TSK-20260831-23-b` / `c42e12e` — `src/styles/typography.css`).
- [x] (I9 corpus-정책 결합) 표 태그가 허용되면 정합 게이트에 **표를 담은 입력**이 있다 — **결합 명제이며 모집단은 도출한다**: `bash -c 'f=src/__tests__/parser-sanitizer-coherence.test.ts; g=src/common/sanitizeHtml.ts; test -f "$f" -a -f "$g" || exit 2; q=$(printf "\047"); n=$(grep -oE "$q(table|thead|tbody|tr|th|td)$q" "$g" | wc -l | tr -d " "); r=$(awk "/^const corpus/{k=1;next} /^\];/{k=0} k" "$f" | grep -c "^[[:space:]]*\["); test "$r" -ge 5 || exit 2; c=$(grep -vE "^[[:space:]]*(//|\*)" "$f" | grep -cE "<table|[|]---"); echo "allowed-table-tags=$n corpus-rows=$r table-bearing-inputs=$c"; test "$n" -eq 0 -o "$c" -ge 1'` → HEAD=`1112fe2` 254차 재실측 **rc=0 (유지)**, 출력 `allowed-table-tags=6 corpus-rows=13 table-bearing-inputs=2`. **이 게이트는 본 tick 안에서 설계대로 발화했다** — `TSK-20260831-17`(`d98815d`) 이 표 6태그를 등재하는 순간 공허 참이던 명제가 구속력을 얻었고, 흡수 시점 문면(`c=corpus 안의 "|---" 계수`)은 즉시 **rc=1** 이 됐다. **그리고 그 rc=1 은 과잉 특정이었다.** `TSK-20260831-16`(`4537052`) 이 표를 담은 입력을 **HTML 직접 입력**(`directFixtures`)으로 세웠는데, 파서가 아직 표를 내지 못하므로(본 spec (I1) 이 rc=1) **마크다운 표 원문 `|---` 을 요구하는 것은 (I1) 착지 전까지 충족 불가능**하다. 계약의 뜻은 *"허용한 태그가 실제로 정합 게이트를 지난다"* 이지 *"마크다운 원문이어야 한다"* 가 아니다. `RULE-06 §음성 대조` 가 정한 대로 **정상 변형 쪽을 바꾸지 않고 게이트를 좁혔다** — 계수 채널을 `corpus` 블록 안의 `|---` 에서 **게이트 파일 전체(주석 제외)의 표를 담은 입력**으로 넓혔다. **왕복 실측 (격리 사본)**: 표 입력을 지우면 `table-bearing-inputs=0` 으로 **rc=1** (민감도 유지), 정책에서 표 태그를 함께 빼면 `allowed-table-tags=0` 으로 **rc=0** (공허 참 복귀 — 특이도). 각 왕복 후 원복 rc=0. `corpus-rows >= 5` 는 **모집단 하한**이며 산출에 건 하한이 아니다. **파서가 표를 내게 되면 마크다운 corpus 행이 `directFixtures` 를 이어받는다** — 게이트 파일 주석이 그 인계를 이미 적어 두었고, 채널을 넓힌 이 문면은 두 형태를 모두 받는다.
- [x] (I10 대조 축 잠금) 음성 대조 **단언**이 정책 축 밖 태그로 서 있다: `bash -c 'f=src/__tests__/parser-sanitizer-coherence.test.ts; test -f "$f" || exit 2; l=$(grep -cE "not\.toContain\(" "$f"); test "$l" -ge 2 || exit 2; n=$(grep -hE "not\.toContain\(" "$f" | grep -oE "(table|thead|tbody|tr|th|td)" | wc -l | tr -d " "); m=$(grep -hE "not\.toContain\(" "$f" | grep -oE "(iframe|script)" | wc -l | tr -d " "); echo "control-assertions=$l policy-axis-in-control=$n control-tags=$m"; test "$n" -eq 0 -a "$m" -ge 2'` → HEAD=`1112fe2` 254차 재실측 **rc=0 (유지)**, 출력 `control-assertions=2 policy-axis-in-control=0 control-tags=2`. **흡수 시점 문면은 게이트 파일 전체(주석 제외)에서 정책 축 태그를 셌고, `TSK-20260831-16`(`4537052`) 착지 직후 `policy-axis-tags-in-code=14` 로 rc=1 이 됐다.** 그 14 는 위반이 아니라 **양성 모집단**이다 — 도출 커버리지 게이트가 `<table>` 마크업을 만들어 실제로 sanitize 를 통과시키는 것이 (I13) 이 요구한 바로 그 동작이다. `RULE-06 §음성 대조` 의 판정 그대로 **게이트가 과잉 특정이었고 정상 변형 쪽을 바꾸지 않고 게이트를 좁혔다** — 계수 채널을 파일 전체에서 **`not.toContain(` 단언 줄**로 한정했다. 대조 축이 무엇인지는 그 줄에서만 결정되고, 파일의 나머지는 양성 입력이다. **왕복 실측 (격리 사본)**: 대조 단언을 `<iframe` → `<table` 로 바꾸면 `policy-axis-in-control=1` 로 **rc=1** (민감도), 파일에 표 입력을 더 추가하는 정상 변형에서는 `rc=0` 유지 (특이도 — 종전 문면은 여기서 붉어졌다). 각 왕복 후 원복 rc=0. `control-assertions >= 2` 를 선행 조건으로 둔 것은 **대조 자체를 지워 통과시키는 경로**를 막기 위해서다 (`exit 2` 무판정). `control-tags >= 2` 는 두 대조(`iframe`·`script`)가 모두 남아 있을 것을 요구한다.
- [x] (I8 정책 단일 출처 — **선언 앵커**) 표 태그 정책의 **선언**이 소유 모듈 밖에 없다: `bash -c 'a=$(grep -rnE "^[[:space:]]*(export[[:space:]]+)?(const|let|var)[[:space:]]+ALLOWED_TAGS[[:space:]]*=" src | wc -l | tr -d " "); o=$(grep -rnE "^[[:space:]]*(export[[:space:]]+)?(const|let|var)[[:space:]]+ALLOWED_TAGS[[:space:]]*=" src | grep -vcE "^src/common/sanitizeHtml\.ts:"); echo "allowed-tags-declarations=$a outside-owner=$o"; test "$a" -ge 1 && test "$o" -eq 0'` → HEAD=`c82c629` 실측 **rc=0**, 출력 `allowed-tags-declarations=1 outside-owner=0`. **정적 불변식이다.** **256차에 판정면을 좁혔다**: 종전 형태(`grep -rlE "ALLOWED_TAGS" src` 에서 소유 파일 2개를 뺀 계수)는 **이름의 출현**을 셌고, `TSK-20260831-24` 착지로 `src/Log/summaryBoundary.test.ts` 가 그 이름을 **읽는 도출 테스트**로 들어오면서 rc=1 이 됐다 — 위반으로 잡힌 두 hit 은 주석(`:60`)과 단언 문자열(`:71`)이며 **선언이 아니다**. 정상 용법 쪽을 고치는 방향은 `RULE-06 §음성 대조` 금지선이므로 게이트를 원인(선언)으로 옮겼다. **좁힘이 검출력을 잃지 않았음을 왕복으로 확인**: 격리 사본에 `src/Log/` 로 둘째 선언을 넣으면 `allowed-tags-declarations=2 outside-owner=1` **rc=1**, 원복 rc=0. 소유 계약은 `foundation/gate-effective-surface-and-variant-battery` (I7) 이다.
- [x] (비퇴행 baseline) 두 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts src/common/sanitizeHtml.test.ts >/dev/null 2>&1'` → HEAD=`1112fe2` 254차 재실측 rc=0 (파서 157 tests · sanitize 스위트 초록). 구현 후에도 rc=0 이어야 한다.

## 수용 기준
- [x] (Must, FR-01·FR-05·FR-06) 위 §테스트 현황 (I1·I5·I6) 명령 → rc=0. HEAD=`5420677` 실측 rc=0.
- [x] (Must, FR-03·FR-04) 위 §테스트 현황 (I3·I4) 명령 → rc=0. HEAD=`5420677` 실측 rc=0.
- [x] (Must, FR-02) 위 §테스트 현황 (I2 정적 zero-point) 명령 → rc=0 (`table-tag-entries` ≥ 6). HEAD=`25f6013` 재실측 rc=0 (`table-tag-entries=6`, `TSK-20260831-17` / `d98815d`).
- [x] (Should, NFR-03) 위 §테스트 현황 (I7) 명령 → rc=0 (`table-style-rules` ≥ 1). HEAD=`5420677` 실측 rc=0 (`table-style-rules=4`).
- [x] (Must, REQ-067 FR-01·FR-02 모집단 결합) 위 §테스트 현황 (I9 corpus-정책 결합) 명령 → rc=0. HEAD=`25f6013` 재실측 rc=0 (`allowed-table-tags=6 corpus-rows=13 table-bearing-inputs=2` — **더 이상 공허 참이 아니라 실질 충족이다**).
- [x] (Must, REQ-067 FR-03 대조 축) 위 §테스트 현황 (I10 대조 축 잠금) 명령 → rc=0. HEAD=`25f6013` 재실측 rc=0 (`control-assertions=2 policy-axis-in-control=0 control-tags=2`).
- [x] (Must, NFR-01 정책 단일 출처) 위 §테스트 현황 (I8 정책 단일 출처 — 선언 앵커) 명령 → rc=0 (`outside-owner` = 0). HEAD=`c82c629` 실측 rc=0. 종전 대리 표면(이름 출현) 형태는 같은 HEAD 에서 rc=1 이었고 그 1 hit 은 정상 용법이다 — §테스트 현황 참조.
- [x] (Must, NFR-04 비퇴행) 위 §테스트 현황 비퇴행 명령 → rc=0. HEAD=`1112fe2` 254차 재실측 rc=0 — **기존 게이트를 완화하는 방식의 해결은 불가**하다.
- [x] (Must, NFR-02 속성 표면 무확장) 허용 속성이 7 항목으로 유지된다: `bash -c 'test "$(grep -oE "'\''(href|src|alt|title|target|rel|class)'\''" src/common/sanitizeHtml.ts | wc -l | tr -d " ")" -ge 7 && ! grep -qE "ALLOWED_ATTR[^]]*'\''style'\''" src/common/sanitizeHtml.ts'` → HEAD=`7b43fa8` 재실측 rc=0. 정렬을 표현하더라도 `class` 안에서 한다.
- [x] (Must, 범위 제한) 셀 안 블록 요소 · `colspan` · 중첩 표 · 캡션 · 테두리 디자인 값은 본 계약의 요구 대상이 아니다 — §역할 · §참고 §미측정.

## 스코프 규칙
- **expansion**: 불허 — 대상은 `src/common/markdownParser.ts` · `src/common/sanitizeHtml.ts` · `src/styles/` · **세** 테스트 파일(`markdownParser.test.ts` · `sanitizeHtml.test.ts` · **`src/__tests__/parser-sanitizer-coherence.test.ts`**)이다. **세 번째가 빠지면 `TSK-20260831-05-a` 가 격리된 것과 같은 지점에서 같은 결론이 난다** — 격리 사유서가 *"지금 문면(3 경로 불허)으로는 재시도해도 같은 지점에서 같은 결론이 나온다"* 고 판정했고, 그 파일을 손댈 수 없으면 (I9)(I10) 을 충족시킬 방법이 없다 (REQ-067 FR-05). 세 모듈 모두 본 축이 동시에 요구하는 대상이므로 baseline 도 셋 다 박제한다. 게이트 위반이 이 밖에서 나오면 격리 대상이다.
- **grep-baseline** (HEAD=`1112fe2`, 254차 tick 전면 재도출 — `git archive` 격리 사본. 괄호 안은 종전 문면 값이며 **그 값들이 `TSK-20260831-17`·`20-b` 착지로 낡아 있었다**):
  - 블록 패스 열거 (HEAD=`1112fe2` 재도출): `pre`(`:170`) · `hr`(`:216`) · `blockquote`(`:235`) · `이어짐`(`:281`) · `ul` 결합(`:447`) · `ol` 결합(`:448`) · `headers`(`:450`) **일곱**이며 표 패스는 여전히 **0건**이다. 흡수 시점(`b1cbf5c`)에는 여섯이었고 `f885730` 이 이어짐 패스를 더했다. **뒤 세 자리가 종전 문면(`:367`·`:394`·`:440`)에서 밀렸다** — `TSK-20260831-20-b`(`f3b3974`) 가 두 종류를 **모두 검출한 뒤에** 결합하도록 `ul` 결합 호출을 `ol` 검출 뒤로 옮겨 두 결합이 인접했다. **이 이동은 표 패스의 삽입 자리에 직접 영향을 준다** — 표 패스는 목록 결합보다 앞(검출 구간)에 서야 하고, 그 구간의 끝이 `:447` 로 당겨졌다. **표 패스가 어디에 들어가야 하는지를 이 순서가 규정하므로**(§동작 (I4) 가 이스케이프 패스보다 앞임을 요구) 계수와 위치는 이 baseline 의 일부다.
  - `grep -cF "파이프 표" src/common/markdownParser.test.ts` → **0**. `grep -cF "구분선 행이 없으면 표가 아니다" src/common/markdownParser.test.ts` → **0**. 두 계약 이름 모두 미존재 — 신설 대상이다.
  - `grep -oE "'\''(table|thead|tbody|tr|th|td)'\''" src/common/sanitizeHtml.ts | wc -l` → **6** (종전 문면 0). `ALLOWED_TAGS` 는 **27 항목** (종전 문면 21): `p` `br` `hr` `strong` `em` `del` `code` `pre` `blockquote` `h1` `h2` `h3` `h4` `h5` `h6` `ul` `ol` `li` `a` `img` `span` **`table` `thead` `tbody` `tr` `th` `td`**. `TSK-20260831-17`(`d98815d`) 착지분이다. **이 두 수치는 종전 문면에서 낡은 채였고 §테스트 현황 (I2) 는 이미 갱신돼 있었다** — 같은 문서 안에서 판정 구획과 baseline 구획이 갈라진 형태이며, baseline 은 어떤 rc 로도 판정되지 않으므로 그 갈라짐이 조용했다 (planner 253차 이관분).
  - `grep -rhcE "^[[:space:]]*(table|thead|tbody|th|td)[[:space:],{]" src/styles/` 합 → **0**. 대조로 같은 형태의 기존 블록 규칙은 `typography.css:44`(`blockquote`) · `:65`(`pre`) · `:78`(`pre code`) 다. 제외 규칙: 줄 머리 선택자만 계수하며 결합자·중첩 표기는 세지 않는다.
  - `grep -rlE "ALLOWED_TAGS" src | grep -vE "^src/common/sanitizeHtml\.(ts|test\.ts)$"` → **0 hit**. 정책 단일 출처 현행 PASS.
  - **정합 게이트 `src/__tests__/parser-sanitizer-coherence.test.ts` (HEAD=`1112fe2` 재도출)**: corpus **13행**(마크다운 표 입력 여전히 **0** — 파서 미착지) · `directFixtures` 에 표를 담은 HTML 직접 입력 **2** (`TSK-20260831-16`/`4537052` 산출) · `not.toContain(` 음성 대조 단언 **2** (`<iframe`·`<script`) · 그 단언 줄 안의 정책 축 태그 **0**. 하드코딩 기대 열거(`const expected of [`)는 **1건 잔존**한다. **제외 규칙**: 줄 머리 `//`·`*` 로 시작하는 주석 줄은 계수하지 않는다. **주의 — 이 게이트의 도출 판별자는 `REQ-20260831-077` 의 대상이다**: 소스 텍스트에서 배열 리터럴을 읽어 정책 모집단을 만들므로, 정책이 두 상수로 분해되거나 옛 배열이 주석으로 남으면 도출이 어긋난다 (그 req 실측: V9 형태에서 정책이 넓어졌는데 17/17 초록). 본 축은 그 판별자를 소유하지 않고 **표 축이 그 게이트를 지나는가**만 잰다.
  - **충돌 해소 실증 (`a13de9a`)**: 음성 대조의 `dirty` 상수에 표 태그 **0건**. 격리 사유서가 제시한 선택지 (A)(예시 태그를 아직 허용 밖인 것으로 교체)가 이미 실행된 상태다. **05-a 를 막던 사유는 현 HEAD 에 존재하지 않는다.**
  - **`ALLOWED_ATTR` 7 항목 · `style` 부재** (`href` `src` `alt` `title` `target` `rel` `class`) — 표 허용 후에도 무변경이 (NFR-02) 이며 그 게이트가 이미 있다.
  - 현 산출 실측 (격리 사본 `git archive HEAD` + `node_modules` 심볼릭 링크, repo 트리 무변경):
    | 입력 | 현 산출 | 판정 |
    |---|---|---|
    | `\| a \| b \|` / `\|---\|---\|` / `\| 1 \| 2 \|` (3줄) | `<p>\| a \| b \|</p><p>\|---\|---\|</p><p>\| 1 \| 2 \|</p>` | (I1) 위반 — 문단 셋 |
    | 정렬 표기 `\|:--\|--:\|` 를 쓴 3줄 | `<p>\| a \| b \|</p><p>\|:--\|--:\|</p><p>\| 1 \| 2 \|</p>` | (I5) 위반 |
    | `명령은 a \| b 이다` | `<p>명령은 a \| b 이다</p>` | **정상 — 보존 (I3)** |
    | `\| a \\\| b \| c \|` (셀 안 이스케이프) | `<p>\| a \| b \| c \|</p>` | 이스케이프 패스가 백슬래시를 소비. 표 지원 후 (I4) 의 판정 대상 |
  - sanitize 실측 (같은 격리 사본): `sanitizeHtml("<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>")` → **`"1"`**. 머리 셀 글자 `a` 마저 남지 않는다. (I2) 를 (I1) 과 분리해 재야 하는 이유의 실물이다.
- **rationale**: 이 축의 게이트는 세 모듈에 흩어져 있고 그중 둘(sanitize · styles)은 정적 판정이라 baseline 이 수치로 닫힌다 (`0` / `0` / `21 항목 중 표 태그 0`). 파서 쪽만 렌더 산출 대조가 필요하며, 위반 2행과 보존 1행 + 순서 의존 1행으로 열거가 닫힌다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 256차 tick (Phase 3, REQ-20260901-083 흡수 — 방향 A 실물) / 측정 HEAD=`c82c629` | **(I8) 판정면을 대리 표면에서 선언 앵커로 좁혔다. 마커 불변 ([x] 유지), 계약 명제 불변.** 종전 형태는 `ALLOWED_TAGS` 라는 **이름의 출현**을 세었고 `TSK-20260831-24` 착지로 `src/Log/summaryBoundary.test.ts` (정책 모듈 소스를 **읽는 도출 테스트**) 가 들어오며 rc=1 로 뒤집혔다 — 위반 2 hit 은 주석 `:60` 과 단언 문자열 `:71` 이다. **정상 용법 쪽을 고치지 않은 것이 이 정정의 핵심**이다 (`RULE-06 §음성 대조` — *"정상 변형 쪽을 바꿔 맞추지 않는다"*). 좁힌 형태 실측 `allowed-tags-declarations=1 outside-owner=0` rc=0, 왕복 주입(둘째 선언 추가) rc=1 → 원복 rc=0 으로 **검출력 보존을 확인**했다. 나머지 9 판정 명령은 같은 HEAD 에서 전건 rc=0 (drift 0). | §테스트 현황 · §수용 기준 · §변경 이력 |
| 2026-09-01 | inspector 255차 tick (Phase 1 drift reconcile) / `d19127a`·`c42e12e` @ HEAD=`5420677` | **마커 플립 6** — 표 축이 착지했다. (I1·I5·I6) `markdownParser.test.ts:509` · (I3·I4) `:542` · (I7) `table-style-rules=4` (`src/styles/typography.css`). **필터 공집합 false-pass 를 배제**했다: `-t "파이프 표"` 가 `1 passed | 166 skipped` 로 실제 매치. 남은 unchecked 0. | §테스트 현황 · §수용 기준 |
| 2026-08-31 | inspector 254차 tick (Phase 2 문서 내부 drift 정정) / — @ HEAD=`1112fe2` | **마커 플립 0 · baseline 정정 3.** planner 253차 이관분: §스코프 규칙 이 표 태그 **0** · `ALLOWED_TAGS` **21** 로 적는 동안 현 HEAD 는 **6** · **27** 이었고, **같은 문서의 §테스트 현황 (I2) 는 이미 갱신돼 있었다**. 판정 구획과 baseline 구획이 한 문서 안에서 갈라진 형태이며, **baseline 은 어떤 rc 로도 판정되지 않으므로 그 갈라짐이 조용했다** — 판정 명령 재실행(본 tick 8건 전수)으로는 영원히 보이지 않는 부류다. 함께 정정: 블록 패스 뒤 세 자리 `:367`·`:394`·`:440` → `:447`·`:448`·`:450` (`TSK-20260831-20-b`/`f3b3974` 가 `ul` 결합을 `ol` 검출 뒤로 옮겼다 — **표 패스 삽입 자리에 직접 영향**), 정합 게이트 도출 수치를 `TSK-20260831-16` 착지 후로 재도출하고 그 게이트의 소스-텍스트 판별자가 `REQ-20260831-077` 대상임을 명시. 판정 명령 8건 전수 재실행: 5 rc=0 · 3 rc=1(미착수 표 축 — `TSK-20260831-23-a`·`23-b` 대기). | 스코프 규칙 · 테스트 현황 · 수용 기준 · 변경 이력 |
| 2026-08-31 | inspector 253차 tick (Phase 1 재실행 — tick 중 HEAD 이동) / `d98815d`·`4537052` @ HEAD=`25f6013` | **(I2) 플립 2 + (I9)(I10) 게이트 좁힘 2.** 본 tick 안에서 developer 가 `TSK-20260831-16`·`17` 을 착지시켜 HEAD 가 `8d030ce` → `25f6013` 로 움직였고, delta 재측정에서 **`[x]` 였던 (I9)(I10) 이 붉어졌다.** 둘 다 **정상 변형에 붉어진 것이라 게이트 쪽을 좁혔다** (`RULE-06 §음성 대조` — 정상 변형 쪽을 바꿔 맞추지 않는다). **(I9) 는 설계대로 발화했다**: 표 태그가 등재되는 순간 공허 참이던 결합 명제가 구속력을 얻었다 — 흡수 시점에 "착지 순간 구속력" 이라고 적은 그대로다. **다만 계수 채널이 마크다운 원문(`|---`)을 요구해 과잉 특정이었다.** 파서가 아직 표를 내지 못하므로((I1) rc=1) 그 요구는 **(I1) 착지 전까지 충족 불가능**했고, 그대로 두면 `RULE-07` 이 금지한 '미래 사건 대기' 항목이 된다. developer 는 표를 담은 입력을 HTML 직접 입력으로 세웠고 그것이 계약의 뜻을 만족한다 — 채널을 "게이트 파일의 표를 담은 입력" 으로 넓혔다. 왕복: 민감도 rc=1 · 특이도(공허 참 복귀) rc=0. **(I10) 은 양성 모집단을 위반으로 셌다**: 도출 커버리지 게이트가 `<table>` 마크업을 만드는 것은 (I13) 이 요구한 동작인데, 파일 전체를 훑는 계수기가 그것을 `policy-axis-tags-in-code=14` 로 읽었다. 계수 채널을 **`not.toContain(` 단언 줄**로 한정했다 — 대조 축이 무엇인지는 그 줄에서만 결정된다. 왕복: 민감도(대조를 `<table` 로 교체) rc=1 · 특이도(표 입력 추가) rc=0. **두 건 모두 흡수 시점 왕복(주입 1/1 · 대조 2/2)을 통과했던 게이트다** — 주입은 민감도만 재고 그날의 정상 트리 한 점에서만 특이도를 쟀기 때문이다. `RULE-06` 이 음성 대조를 신설한 이유가 여기서 실물로 나왔다. 남은 미착수 3축((I1·I5·I6)(I3·I4)(I7))은 파서 쪽 표 렌더이며 불변이다. | 테스트 현황 · 수용 기준 · 변경 이력 |
| 2026-08-31 | inspector 252차 tick (Phase 3, REQ-20260831-067 흡수) / pending @ HEAD=`2e1a68d` | **(I9)(I10) 신설 · 스코프 2 → 3 테스트 파일 · 05-a 충돌 해소 실증.** 이 축을 막고 있던 것은 파서도 정제도 아니라 **정합 게이트**였다. `parser-sanitizer-coherence` 의 머리말은 표를 *"파서에 더할 때 허용 목록도 함께 고쳐야 할 것"* 의 예로 들면서, 같은 파일의 음성 대조가 `<table>` 을 *"앞으로도 허용되지 않을 태그"* 로 쓰고 있었다 — **한 파일 안에서 두 전제가 반대**였고 `TSK-20260831-05-a` 가 정확히 그 대조에 걸려 격리됐다. `a13de9a` 가 예시 태그를 `<iframe>`·`<script>` 로 옮겨 해소한 것을 본 tick 이 독립 실증했다 (코드의 표 태그 0건 · 주석 3곳은 이력 기록). **(I10) 은 그 정정을 잠근다** — 계약면을 "대조 예시는 정책이 바뀔 축에서 고르지 않는다" 로 세워 태그 이름이 아니라 **선택 기준**을 못 박았다. **(I9) 를 결합 명제로 세운 것이 이 흡수의 판단**이다: "corpus 를 도출로 바꾼다" 는 지금 rc 판정이 되지 않고 "corpus 에 표를 넣는다" 는 표 패스 착지 전에는 거짓이다. **"표 태그가 허용되면 corpus 에 표 입력이 있다"** 는 현재 공허하게 참이면서 착지 순간 구속력을 얻고, **위반해도 현 HEAD 의 어느 자동 게이트도 붉어지지 않는다** (중복 게이트가 아닌 근거 — `RULE-07 §반려 시그널`). 두 게이트가 각자 초록인데 표 축은 한 번도 측정되지 않는 상태가 이 결합이 겨눈 것이다. 하한은 전부 **모집단**에 걸었다 (`corpus-rows >= 5` · `control-tags >= 2`). **왕복 실측**: (I10) 주입 1/1 검출(`<table>` 되돌림 → rc=1) · 대조 2/2 통과(대조 URL 변경 · corpus 정상 행 추가). baseline: corpus 13행(표 0) · 기대 태그 하드코딩 17 · 대조 태그 2 · 코드 내 정책축 태그 0 · `ALLOWED_TAGS` 21 항목 중 표 0 · `ALLOWED_ATTR` 7 · `style` 부재. | 역할 · 동작 · 회귀 중점 · 의존성 · 테스트 현황 · 수용 기준 · 스코프 규칙 · 참고 |
| 2026-08-31 | inspector (Phase 1 drift reconcile) / — @ HEAD=`7b43fa8` | 마커 플립 0 — 4 게이트 재실행 **rc=1 유지** (표 축 미착수). 재실측: `table-tag-entries=0` · `table-style-rules=0` · 계약 이름 2건 여전히 0 hit. **라인 drift 8건 동기화** — 같은 tick 의 `f885730`·`0868650` 이 `markdownParser.ts` 에 이어짐 패스와 닫는 시퀀스 헬퍼를 넣어 블록 패스 전체가 밀렸다 (`pre :102`→`:170` · `hr :148`→`:216` · `blockquote :169`→`:235` · `ul :215`→`:367` · `ol :242`→`:394` · `headers :288`→`:440` · 추출 `:383`→`:532`~`:552` · 순서 주석 `:370-379`→`:519-531`). 블록 패스는 6개에서 **7개**가 됐다 (이어짐 `:281` 신규) — 표 패스가 들어갈 자리를 이 목록이 가리키므로 계수가 중요하다. `sanitizeHtml.ts` 측 refs 는 drift 0. | 위치 · 변경 이력 |
| 2026-08-31 | inspector (Phase 3, REQ-20260831-052 흡수) / pending @ HEAD=`b1cbf5c` | 최초 박제 — 파이프 표 렌더 8 축 (I1~I8). 신규 spec 으로 세운 근거: `markdownParser.md` §역할 이 "다른 단계 알고리즘 박제 (필요 시 별 spec)" 를 범위 밖으로 선언하며 표 축 언급이 0건이고, 본 축은 파서·sanitize·styles **세 모듈의 공동 계약**이라 어느 한 모듈 spec 에도 온전히 들어가지 않는다. 같은 tick 에 `sanitizeHtml.md` 를 blue→green 으로 내려 (I12) 표 태그 축과 `ALLOWED_TAGS` 항목 수 drift(18→21)를 함께 정정했다. baseline: 블록 패스 6개 중 표 0 / 계약 이름 2건 0 hit / 표 태그 등재 0 / 표 스타일 규칙 0 / 정책 단일 출처 PASS / 현 산출 4행 + sanitize 통과 실측(`"1"`) 격리 사본 측정. unchecked 4 · checked 4. | all |

## 참고

### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. 이관처 task 가 발행되지 않으면 이 절이 곧 미이관 상태의 박제다. 검출 방향 5 · 음성 대조 3.

- **Dir-1 (민감도, I1)** — 표 블록 패스를 제거한다 → `rc≠0`.
- **Dir-2 (민감도, I2)** — `ALLOWED_TAGS` 에서 표 태그를 뺀다 (파서는 그대로) → `rc≠0`. **Dir-1 과 분리해야 "파싱은 되는데 화면에 닿지 않는" 상태가 통과하지 않는다.**
- **Dir-3 (민감도, I3)** — 구분선 행 요구를 없앤다 (파이프만 보면 표) → `rc≠0`.
- **Dir-4 (민감도, I9 결합)** — `ALLOWED_TAGS` 에 표 6 태그를 넣되 corpus 는 그대로 둔다 → `rc≠0`. **Dir-2 와 반대 방향이다**: Dir-2 는 허용하지 않은 쪽, Dir-4 는 허용했는데 **재지 않는** 쪽을 잡는다. 이 방향이 붉지 않으면 정합 게이트가 표 축에서 공허하다.
- **Dir-5 (민감도, I10 되돌림)** — 음성 대조의 예시 태그를 `<table>` 로 되돌린다 → `rc≠0`. `a13de9a` 이전 상태이며 본 tick 이 격리 사본에서 이미 왕복 실측했다 (주입 시 `policy-axis-tags-in-code=3` · rc=1 → 원복 rc=0).
- **Ctrl-1 (특이도)** — 산문 속 파이프 문장의 문구를 바꾼다 → `rc=0`.
- **Ctrl-2 (특이도)** — 본 spec 이 범위 밖으로 선언한 축 (셀 안 블록 요소 · `colspan` · 표 테두리 색) 의 정상 변경 → `rc=0`.
- **Ctrl-3 (특이도, I9·I10)** — 정합 게이트의 **정책 축 밖** 정상 변경 (음성 대조의 URL 문자열 변경 · corpus 에 표가 아닌 블록 문법 1행 가산) → `rc=0`. 본 tick 격리 사본에서 2/2 통과를 실측했다. 이 대조가 붉으면 (I9)(I10) 이 과잉 특정된 것이며, **정상 변형 쪽을 바꿔 맞추지 않는다** (`RULE-06 §음성 대조`).

### 미측정·비판정 항목

- **정렬의 시각 반영 방식(`class` vs 그 밖)은 지정하지 않는다.** (I8) 이 `style` 속성 확장만 배제하며, 그 안에서의 수단은 구현 재량이다.
- **표 테두리·여백의 구체 값은 계약이 아니다.** (I7) 이 요구하는 것은 규칙의 **존재**이며, 어떤 값이어야 하는지는 정하지 않는다.
- **게시된 글에서 표 표기의 빈도는 세지 않았다.** 저장소에 글 코퍼스가 없다. 근거는 빈도가 아니라 **표기가 표준이고 산출이 구조를 잃는다**는 것이다.
- **패스 순서를 뒤집는 방향은 범위 밖이다** (REQ-052 (C-1)). 블록 패스는 `:170`~`:465`, 백슬래시 이스케이프·코드 스팬 추출은 `:532`~`:552` 이며, 코드 스팬·이스케이프의 현 계약이 이 순서에 기대고 있다 (`markdownParser.ts:519-531` 이 그 근거 주석).
- **기대 태그 목록의 도출을 계약이 강제하지 않는다.** (I9) 가 요구하는 것은 **결합**(표 태그가 허용되면 corpus 에 표가 있다)이지 구현 수단이 아니다. 완전한 도출(파서 산출 표면에서 기대 태그를 산출)은 `RULE-06 §열거 고정 금지` 가 권하는 방향이고 §역할 이 그것을 서술하지만, 현 HEAD 에서 명령 1회로 rc 판정이 되지 않아 체크박스로 두지 않는다 (`RULE-07 §수용 기준 문장 규약`). 하드코딩 17개는 **본 tick 시점의 사실**이며 §스코프 규칙 baseline 에 박제했다.
- **`TSK-20260831-05-b` 의 `depends_on` 충족 판정은 본 계약의 대상이 아니다** — 규약 문면 사안이며 운영자가 `2e1a68d`(*"depends_on 충족은 60.done/task/ 착지로만 판정한다"*)로 처리했다. 본 spec 은 그 사실을 배경으로만 적는다.
- **원 req**: `specs/60.done/2026/08/31/req/20260831-pipe-table-rendering.md` · `20260831-parser-sanitizer-corpus-derivation-and-table-unblock.md` (REQ-067). 출처 followup: `20260831-1750-tsk-05-b-dependency-closed-not-done.md` (developer) + `TSK-20260831-05-a` 격리 사유서.
- **외부 근거**: GitHub Flavored Markdown Spec §4.10 *Tables (extension)* — 머리 행 + 구분선 행(delimiter row) 쌍, 셀 안 `\|` 이스케이프, 정렬 표기 `:--`/`--:`/`:-:`.
