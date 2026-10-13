# 변경 이력 강조 계약

> **위치**: `src/Log/diffContents.ts` 의 `markChangedLines` · 소비처 `src/Log/Writer.tsx` (변경 이력 → `LogItem`) · 보조: `src/common/markdownParser.ts` 의 표식 복원(`HIGHLIGHT_OPEN` · `HIGHLIGHT_CLOSE`)과 펜스 판정
> **관련 요구사항**: REQ-20261013-099 FR-01~FR-04 · NFR-01 · NFR-02 (출처: developer followup `20261013-0934-diffcontents-fence-copy-diverges`, source_task TSK-20261013-01) · REQ-20261013-119 FR-01~FR-04 (출처: developer followup `20261013-1505-highlight-setext-underline-breaks-heading`, source_task TSK-20261013-15) · REQ-20261013-129 FR-03 · FR-04 · NFR-01 (출처: developer followup `20261013-1656-image-alt-render-markers-leak`, source_task TSK-20261013-20) · REQ-20261013-135 FR-05 (출처: discovery 탐색) · REQ-20261013-131 FR-01~FR-04 · NFR-01 · NFR-02 (출처: developer followup `20261013-1804-change-highlight-blockquote-thematic-break`, source_task TSK-20261013-31)
> **게이트**: `src/Log/diffContents.test.ts` · `src/__tests__/change-highlight-preserves-rendering.test.ts` · `src/__tests__/change-highlight-follows-parser-code-blocks.test.ts` · 신설 예정(§수용 기준 `[ ]`): `src/__tests__/change-highlight-setext-underline.test.ts` · `change-highlight-thematic-break.test.ts` · `change-highlight-attribute-values.test.ts` · `change-highlight-container-prefix.test.ts`
> **최종 업데이트**: 2026-10-13 (inspector — 최초 등록)

> 참조 코드는 식별자 우선. 줄 번호는 HEAD=`e38a118` 스냅샷이다.

## 역할

작성기 변경 이력은 판본마다 이전 판본에서 바뀐 줄을 강조한다. **강조는 파서가 그리는 문서의 모양을 따른다** — 파서가 코드 밖으로 그리는 바뀐 줄은 강조되고, 파서가 코드 블록으로 그리는 줄에는 표식이 들어가지 않으며, 어떤 경우에도 표식 문자가 독자의 화면에 남지 않는다.

**방어 대상**: 강조 쪽의 "이 줄은 코드 블록 안인가" 판정이 파서 판정의 사본이면, 파서가 바뀔 때마다 둘이 조용히 갈린다. 갈리면 (a) 바뀐 줄이 강조되지 않거나 (b) 코드 블록 안에 들어간 표식이 태그로 복원되지 못하고 사용자 영역 문자(U+E002 · U+E003)로 화면과 복사 텍스트에 남는다. 표식 복원은 코드 블록 밖의 값 노드에서만 일어나기 때문이다. 어느 쪽도 기존 게이트를 붉히지 않는다 — 두 게이트의 corpus 가 최상위 백틱 펜스와 산문뿐이다.

하지 않는 것: 코드 블록 안의 바뀐 줄을 강조하는 기능(신규 기능) · diff 알고리즘(LCS) 변경.

## 공개 인터페이스

- `markChangedLines(contents: string, previous?: string): string` — 바뀐 줄에 표식을 넣은 마크다운을 돌려준다. `previous` 가 없으면(가장 오래된 판본) 표식 문자를 걷은 원문이다.
- 렌더 경로: `sanitizeHtml(markdownToHtml(markChangedLines(newer, older)))` 가 바뀐 줄을 `span.span--logitem-changed` 로 감싼다.

## 동작

판정면은 모두 위 렌더 경로의 DOM 이다.

1. **표식 문자는 렌더 결과에 남지 않는다.** 어떤 `(newer, older)` 에 대해서도 `textContent` 의 U+E002 · U+E003 개수가 0 이다. 예 — 물결 펜스 `~~~\nconst y = 2;\n~~~` / `~~~\nconst x = 1;\n~~~`, 인용 안 펜스 `> ```\n> const y = 2;\n> ```` / `> ```\n> const x = 1;\n> ````, 항목 안 펜스 `1. a\n   ~~~\n   const y = 2;\n   ~~~` / `1. a\n   ~~~\n   const x = 1;\n   ~~~`. HEAD=`bea3a3b` 에서는 셋 다 2 다.

2. **코드 블록 판정은 파서의 것이다.** 강조가 "이 줄은 코드 블록 안인가" 를 정할 때 쓰는 판정은 파서의 펜스 판정(`markdown-rendering` 21)과 한 벌이다. 최상위 · 인용 안(3) · 목록 항목 안(19), 백틱 · 물결, 0~3칸 들여쓰기가 모두 해당한다. `diffContents` 에 펜스 규칙 사본을 두지 않는다. **판정은 텍스트가 아니라 동작으로 한다** — 바뀐 줄마다 *강조 span 을 받았다* ⇔ *파서가 그 줄을 코드 블록 밖으로 그렸다*. 식별자·주석 grep 은 판정면이 아니다 (`RULE-06 §게이트를 쓸 때 겪은 것` — 주석이 게이트를 충족시킨다).

3. **파서가 코드 밖으로 그리는 바뀐 줄은 강조된다.** `` ```인라인``` 문장\n새 문단 `` / `` ```인라인``` 문장\n옛 문단 `` → `span.span--logitem-changed` 1 · 텍스트 `새 문단` (정보 문자열에 백틱이 든 줄은 펜스가 아니다 — 21). `    ```\n새 줄\n    ```` / `    ```\n옛 줄\n    ```` → span 1 · 텍스트 `새 줄` (4칸 들여쓴 줄은 펜스가 아니다 — 21). HEAD=`bea3a3b` 에서는 둘 다 0 이다.
    - **바뀐 줄의 표식이 링크·이미지 표기 안에 떨어지면 강조는 그 요소를 감싼다.** 표식은 속성값에서 걷히고(`markdown-rendering-links` 27 구조 표식 하위 항목) 요소의 경계로 옮겨진다 — 한 줄 이미지가 바뀐 꼴(`![a](…x.png)` / `![b](…x.png)` → `img` 를 감싼 span 1)과 같다. 설명·제목이 두 줄에 걸친 링크·이미지의 한 줄이 바뀌면 span 1 이 그 `img` · `a` 를 감싼다: `- ![a\n  b](…x.png)` / `- ![a\n  c](…x.png)` · `1. ![a\n   b](…x.png)` / `1. ![a\n   c](…x.png)` · `- ![x](…x.png "a\n  b")` / `…"a\n  c")` · `- [x](https://example.com/u "t\n  b")` / `…"t\n  c")` · `- ![x\n  b](…x.png)` / `- ![a\n  b](…x.png)`. **강조 span 은 그 요소 밖의 바뀌지 않은 글자로 번지지 않는다** — `- ![x\n  b](…x.png) 뒤 글자\n  다음 줄\n- 둘` / 첫 줄만 `![a` → span 텍스트에 `뒤 글자` · `다음 줄` 0. HEAD=`4784051` 에서는 앞 넷이 span 0 (표식이 속성 안팎에 갈려 사라진다)이고, 다섯째는 닫는 표식이 `alt` 안에 떨어져 span 이 항목 끝까지 열린다.

4. **파서가 코드 블록으로 그리는 줄은 맥락과 무관하게 표식하지 않는다.** 동작 1 의 세 입력 → span 0 · `pre` 텍스트는 원문 그대로. 최상위 백틱 펜스 `` ```\nconst y = 2;\n``` `` / `…x = 1…` 의 현 산출(표식 0 · `pre` 1)은 바뀌지 않는다 (`diffContents.test.ts` *"코드 블록 안은 표식하지 않는다"*).

5. **강조는 렌더 결과를 바꾸지 않는다** (기존 명제, `change-highlight-preserves-rendering.test.ts`) — 강조본에서 강조 span 만 걷어낸 것이 평소 렌더와 같다. 동작 1 의 세 입력은 이 명제의 위반이기도 하다. 그 게이트의 corpus 에 그 입력이 없을 뿐이다.
    - **속성값도 렌더 결과다.** 강조본의 `img@alt` · `img@title` · `a@title` 는 같은 `newer` 를 평소 렌더한 값과 같다. **판정면은 DOM 이다** — 강조 span 요소를 풀어낸(자식으로 갈음한) DOM 이 평소 렌더 DOM 과 같다. 직렬화 문자열에서 `<span …>` · `</span>` 을 텍스트 정규식으로 걷는 판정(`change-highlight-preserves-rendering.test.ts` 의 형태)은 속성값 안의 `</span>` 까지 걷어 `- ![x\n  b](…x.png)` / `- ![a\n  b](…x.png)` 를 같다고 본다 (REQ-20261013-129 실측 — DOM 판정은 다르다).

6. **밑줄식 제목의 밑줄 줄은 감싸지 않는다 — 밑줄 판정은 파서의 것이다** (`markdown-rendering` 2 · 3). 감싼 줄은 밑줄 꼴이 아니어서 파서가 제목을 세우지 않는다. 바뀐 줄이 *강조 span 을 받지 않았다* ⇔ *파서가 그 줄을 밑줄로 썼다* — 동작 2 와 같은 방식이며 `diffContents` 에 밑줄 규칙 사본(정규식 + 앞 줄 조건)을 두지 않는다. `제목\n===` / `제목\n---` · `제목\n--` / `제목` · `제목\n-` / `제목` · `제목\n=` / `제목\n==` · `제목\n==\n본문` / `제목\n===\n본문` · `제목\n  ===` / `제목\n===` · `> 제목\n> ===` / `> 제목\n> ---` → 강조본에서 span 만 걷은 것이 평소 렌더와 같다 (동작 5). 바뀌지 않는 것: 제목 **글자**가 바뀐 줄은 강조된다 (`새 제목\n===` / `제목\n===` → `<h1>` 안 span) · 밑줄 꼴이 아닌 줄(`제목\n= =`) · 앞 줄이 문단이 아니어서 밑줄이 아닌 같은 꼴(`==\n본문` · `본문\n\n==` · `- a\n  ==`)은 강조된다 · `---` 이상은 지금처럼 가로줄 꼴로 감싸지 않는다 (7).

7. **가로줄 줄은 감싸지 않는다 — 가로줄 판정도 파서의 것이다** (`markdown-rendering` 2 · 3 넷째 하위 항목). 감싼 줄은 가로줄 꼴이 아니어서 선 대신 표기 글자가 보인다. 바뀐 줄이 *강조 span 을 받지 않았다* ⇔ *파서가 그 줄을 `<hr>` 로 그렸다* — 동작 2 · 6 과 같은 방식이다. 원문 한 줄에 `THEMATIC_BREAK_PATTERN` 을 거는 판정은 인용 접두(`> `)와 항목 안 인용 접두를 보지 못하는 사본이다: 3 넷째 하위 항목(인용 안 가로줄)이 TSK-20261013-31 (`b63a383`) 로 착지한 뒤 `> ***` / `> 글` · `- a\n  > ---` / `- a\n  > b` · `> > ---` / `> > b` · `> ___` / `> 글` · `> 앞\n>\n> ***\n>\n> 뒤` / 가운데 `> 글` · `> - a\n> ---` / `> - a\n> b` 의 강조본은 `<blockquote><span …>***</span></blockquote>` 꼴이고 평소 렌더는 `<blockquote><hr></blockquote>` 꼴이다 (동작 5 위반 — planner tick 396 시제품 · TSK-31 result.md · REQ-20261013-131 재현). `> > ---` 는 안쪽 인용까지 잃는다 — 원인은 동작 8 의 접두 한 겹이다. 문자 사이에 공백을 둔 가로줄(`markdown-rendering` 29)도 같다 — `* * *` / `글` 의 강조본은 원문 줄에서 `* ` 를 목록 접두로 떼고 `* *` 를 감싼다. 29 가 착지하면 평소 렌더는 `<hr>` 이고 강조본은 글머리표 + 글자다 (동작 5 위반 — HEAD=`d4b8ef0` 에서는 둘 다 `<ul><li>* *</li></ul>` 꼴이라 등식이 참이다, inspector probe). 바뀌지 않는 것: 최상위 `---` · `***` · `___` 는 감싸지 않는다 · 가로줄 꼴이 아닌 인용 줄(`> --` / `> -`)은 강조된다.

8. **표식은 파서가 그 줄의 내용(인라인)이 시작한다고 본 자리에 들어간다 — 줄 머리 컨테이너 접두가 몇 겹이든.** 바뀐 줄 머리에 인용 · 목록 · 번호 목록 · ATX 제목 표지가 겹쳐 있으면(`> - 새 항목` · `> 1. 새 항목` · `> # 새 제목` · `> > 새 글` · `> > > 새 글` · `- a\n  > - 새`) 강조본에서 span 을 푼 DOM 은 평소 렌더 DOM 과 같고 (동작 5), span 은 1 이며 그 텍스트는 바뀐 내용이다 — `> - 새 항목` / `> - 옛 항목` → `blockquote > ul > li > span` · 텍스트 `새 항목`. 지금은 접두를 한 겹만 떼어 둘째 접두부터 표식 안에 들어가고, 파서는 표식 뒤의 `-` · `1.` · `#` · `>` 를 줄 머리로 보지 않아 목록 · 제목 · 중첩 인용이 강조 화면에서만 사라지고 표기가 글자로 남는다. **접두 판정은 파서와 한 벌이다** — `diffContents` 에 줄 머리 접두 규칙의 사본(정규식)을 늘려 맞추지 않는다 (동작 2 · 6 · 7 과 같은 원칙). 판정은 동작으로 한다 — span 을 푼 DOM 등식과 평소 렌더의 구조(`blockquote ul` · `blockquote ol` · `blockquote h1` · `blockquote blockquote`)를 함께 잰다. 파서가 인용 표지로 보는 1–3칸 들여 쓴 `>` (`markdown-rendering` 3 다섯째 하위 항목 — ` > 새 글` / ` > 옛 글`)와 인용 줄 뒤 밑줄 꼴 줄(`markdown-rendering` 2 둘째 하위 항목 — `> 새 인용\n---` / `> 옛 인용\n---`)도 같은 등식을 받는다. 바뀌지 않는 것: 접두 한 겹 줄 — `> 새 글` · `- 새 항목` · `- a\n  > 새 인용` · `- a\n  - 새` · `# 새 제목` — 의 강조 렌더 (span 이 내용만 감싼다) · 최상위 `***` · `---` (span 0) · `> --` / `> -` (span 1 · `--`). 평소 렌더가 블록으로 보지 않는 꼴(`- > 인용` · `- # 제목` · `1. - x` — 지금 `li` 안 글자)은 이 항의 대상이 아니다 (§미측정).

## 의존성

- 내부: `common/markdownParser` (`HIGHLIGHT_OPEN` · `HIGHLIGHT_CLOSE` · `HIGHLIGHT_CLASS` · `THEMATIC_BREAK_PATTERN` · `stripHeadingClosingSequence` · 코드 블록 줄 판정 — 규칙을 파서에서 받는 선례. 밑줄 판정(동작 6)도 같은 길로 받는다. `SETEXT_UNDERLINE_PATTERN` 정규식만 가져오면 앞 줄 조건이 빠진 사본이 된다. 가로줄(동작 7)도 같다 — `THEMATIC_BREAK_PATTERN` 정규식만 가져오면 컨테이너 접두를 못 보는 사본이다. 줄 머리 접두(동작 8)는 그 셋의 공통 바탕이다 — 표식 자리를 원문 정규식으로 다시 고르면 같은 부류의 사본이 하나 더 생긴다) · `common/sanitizeHtml`.
- 계약: `markdown-rendering` 21 (*"펜스 판정은 파서 안에 하나"*) · 3 · 19. 그 계약에 펜스가 놓이는 맥락이 늘면 동작 2 가 이 소비처를 함께 묶는다.
- 역의존(소비처): `grep -rn "markChangedLines" src --include="*.ts" --include="*.tsx" | grep -v "\.test\."` → `Writer.tsx` (import 와 변경 이력 호출) 1 곳.

## 수용 기준

- [x] 기존 두 게이트 (동작 4 대조 · 동작 5): `bash -c 'npx vitest run src/Log/diffContents.test.ts src/__tests__/change-highlight-preserves-rendering.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`e38a118` rc=0.
- [x] 코드 블록 판정 정합 (동작 1~4): `bash -c 'npx vitest run src/__tests__/change-highlight-follows-parser-code-blocks.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`b1d1e4c` rc=0 (TSK-20261013-15 `b1d1e4c` — `injection: 1/1 detect` · `control: 1/1 pass`). HEAD=`e38a118` rc=1 (파일 부재). 동작 1 의 세 입력 표식 문자 0 · 동작 3 의 두 입력 span 1 · 동작 4 의 대조를 잰다. 동작 2 는 맥락(최상위 · 인용 · 항목) × 펜스 문자(백틱 · 물결) × 들여쓰기(0 · 3 · 4칸) 배터리에서, 바뀐 줄마다 *span 받음* ⇔ *`newer` 단독 렌더에서 그 줄이 `pre` 밖* 을 잰다.
- [ ] 밑줄식 제목 보존 (동작 6): `bash -c 'npx vitest run src/__tests__/change-highlight-setext-underline.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`58775e1` rc=1 (파일 부재). REQ-20261013-119 의 결함 7행(U1·U2·U4·U5·U8·U11·U7 — span 걷은 강조본 === 평소 렌더), 대조 4행(U3·U6·U9·U10 — 강조 렌더 불변)과 앞 줄이 문단이 아닌 밑줄 꼴 3행(`==\n본문` / `=\n본문` · `본문\n\n==` / `본문\n\n=` · `- a\n  ==` / `- a\n  =` — span 1 · 보존)을 잰다. 판정면은 `change-highlight-preserves-rendering.test.ts` 와 같다. req FR-04 의 *"그 게이트 corpus 에 행"* 은 판정 명령이 한 파일을 지목해야 하므로 같은 판정면의 전용 파일로 재정식화했다 — 기존 corpus 에 같은 행을 더하는 것도 막지 않는다. HEAD=`58775e1` 실측(`b1d1e4c` 와 바이트 동일): 결함 7/7 다름 · 대조 4/4 기대값 · 밑줄 꼴 3행 span 1 · 보존.
- [ ] 링크·이미지 표기 안의 표식 (동작 3 · 5 하위 항목): `bash -c 'npx vitest run src/__tests__/change-highlight-attribute-values.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`4784051` rc=1 (파일 부재). 동작 3 하위 항목의 다섯 쌍(REQ-20261013-129 H1 · H9 · H4 · H5 · H2)에서 강조본 속성값 === 평소 렌더 속성값 · span 요소를 풀어낸 강조 DOM === 평소 렌더 DOM · span 1 이 `img`/`a` 를 감쌈, H2b 의 span 텍스트에 `뒤 글자` · `다음 줄` 0, 대조 H6 (`- ![a\n  b](…)\n- 둘` / `…\n- 하나` — span 1 텍스트 `둘`) · H7 (한 줄 이미지 — span 1 이 `img` 를 감쌈)의 강조 렌더 불변을 잰다. 판정면은 동작 5 하위 항목의 DOM 이다. 강조본과 평소 렌더의 속성값 동치는 `markdown-rendering-links` 27 구조 표식 하위 항목이 착지해야 평소 렌더 쪽도 `<br />` 를 잃는다 — 두 계약을 한 task 로 묶을지는 planner 몫이다. HEAD=`4784051` 실측(inspector probe, `b5e0112` · `71f68e4` 와 같은 산출): H1 · H9 · H4 · H5 속성값에 `<span class="span--logitem-changed">` 글자 · span 0 · H2 `alt` `x</span><br />b` · DOM 동치 0/6 (H2 · H2b 는 텍스트 정규식 동치가 참이다 — 그 판정면이 놓친다) · H2b span 텍스트 ` 뒤 글자다음 줄` · 대조 2/2 기대값.
- [ ] 가로줄 줄 보존 (동작 7): `bash -c 'npx vitest run src/__tests__/change-highlight-thematic-break.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`d4b8ef0` rc=1 (파일 부재). 동작 7 의 인용 여섯 쌍(REQ-20261013-131 신고 두 행 · Q3 · Q4 · Q5 · Q6)과 최상위 `***` / `글` 에서 span 요소를 풀어낸 강조 DOM === 평소 렌더 DOM **이고** 평소 렌더에 `hr` 1 (가로줄이 서지 않은 트리에서 보존 판정이 무판정으로 초록이 되지 않게), 대조 `> --` / `> -` 의 span 1 · 텍스트 `--` 를 잰다. 공백 낀 가로줄 쌍 `* * *` / `글` 도 같은 판정(강조 DOM === 평소 렌더 · 평소 렌더 `hr` 1)을 받는다 — 그 `hr` 1 은 `markdown-rendering` 29 가 착지해야 참이다 (REQ-20261013-135 FR-05). 인용 쌍의 `hr` 1 은 `markdown-rendering` 3 넷째 하위 항목이 TSK-20261013-31 (`b63a383`) 로 착지해 참이다. HEAD=`d4b8ef0` 실측 (inspector probe — req 표와 같은 산출): 인용 여섯 쌍 모두 평소 렌더 `blockquote hr` 1 · span 을 푼 DOM ≠ 평소 렌더 6/6 (span 텍스트 `***` · `---` · `> ---` · `___` · `***` · `---`) · 최상위 `***` span 0 · 대조 기대값 · `* * *` 쌍은 둘 다 `<ul><li>* *</li></ul>` 꼴(29 미착지 — 등식 참). HEAD=`4784051` 에서는 인용 쌍이 둘 다 글자였다 (가로줄 미착지).
- [ ] 겹친 컨테이너 접두 (동작 8): `bash -c 'npx vitest run src/__tests__/change-highlight-container-prefix.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`d4b8ef0` rc=1 (파일 부재). REQ-20261013-131 의 M1 · M2 · M3 · M7 · M8 · M9 에서 span 요소를 풀어낸 강조 DOM === 평소 렌더 DOM · span 1 · 그 텍스트가 바뀐 내용(`새 항목` · `새 제목` · `새 글` · `새`) **이고** 평소 렌더에 `blockquote ul` · `blockquote ol` · `blockquote h1` · `blockquote blockquote` 가 선다 (req NFR-02 — 파서가 블록을 세우지 않는 트리에서 등식이 무판정으로 초록이 되지 않게), 대조 K1–K5 · C1 의 강조 렌더 불변과 ` > 새 글` / ` > 옛 글` · `> 새 인용\n---` / `> 옛 인용\n---` 의 등식을 잰다. 대조 두 쌍의 평소 렌더 `blockquote` 는 `markdown-rendering` 3 다섯째 · 2 둘째 하위 항목이 착지해야 선다 — 그 전에도 등식은 참이므로 이 게이트는 그 둘을 기다리지 않고 등식만 잰다. 판정면은 동작 5 하위 항목의 DOM 이다. HEAD=`d4b8ef0` 실측 (inspector probe — req 표와 같은 산출): M 6행 등식 0/6 (M1 span 텍스트 `- 새 항목` · M7 `> 새 글` · M8 `> > 새 글` — 중첩 인용 소실) · 대조 K 5행 · C1 등식 참 · ` > 새 글` · `> 새 인용\n---` 등식 참 (평소 렌더가 아직 `p` · `h2`).

## 변경 이력

| 일자 | req / 커밋 | 요약 | 영향 |
|------|-----------|------|------|
| 2026-10-13 | REQ-20261013-131 / — | 동작 7 이 기다리던 신고를 흡수했다 (FR-01 Must — 동작 7 그대로, 인용 쌍을 Q4 · Q5 · Q6 까지 넓혔다). **범위를 넓힌 req 를 따라** 동작 8 신설 — 표식은 파서가 본 내용 시작 자리에 들어가고 접두가 몇 겹이든 span 을 푼 DOM 이 평소 렌더와 같다 (FR-02 Must) · 접두 판정은 파서와 한 벌 (FR-03 Should 채택 — 동작 2 · 6 · 7 과 같은 원칙). 판정면은 DOM 등식 + 평소 렌더 구조 단언 (NFR-01 · NFR-02). 동작 8 게이트는 동작 7 게이트와 따로 두었다 — 동작 7 은 `hr` 1 이 서야 참이고 동작 8 은 그렇지 않다. 같은 tick 의 `markdown-rendering` 3 다섯째 (REQ-137 FR-04) · 2 둘째 (REQ-136 NFR-02) 하위 항목의 강조 쪽 행을 동작 8 대조로 받았다. 바깥이 목록 표지인 꼴은 req 의 §미측정 그대로 옮겼다. HEAD=`d4b8ef0` 격리 사본에서 req 표 20행 + 위 두 행 + 목록 바깥 꼴 3행을 재현했다 (M 등식 0/6 · Q 0/6 · K · C1 · T 기대값) | 동작 7·8 · 수용 기준 · 참고 · 머리 |
| 2026-10-13 | REQ-20261013-135 / — | 동작 7 에 공백 낀 가로줄 — 강조는 파서의 가로줄 판정(`markdown-rendering` 29)을 따른다 (FR-05 Should 채택). 동작 7 게이트의 corpus 에 `* * *` / `글` 쌍을 더했다 — 그 행의 `hr` 1 은 29 착지 뒤에 참이다. HEAD=`d4b8ef0` 격리 사본에서 강조본 `<ul><li><span …>* *</span></li></ul>` · 평소 렌더 `<ul><li>* *</li></ul>` (등식 참 — 29 미착지)를 확인했다 | 동작 7 · 수용 기준 · 머리 |
| 2026-10-13 | REQ-20261013-129 / — | 동작 3 하위 항목 — 바뀐 줄의 표식이 링크·이미지 표기 안에 떨어지면 강조는 그 요소를 감싸고 요소 밖으로 번지지 않는다 (FR-04 Should — 감싸기 채택: 생략을 고르면 동작 3 에 예외가 생기고, 한 줄 이미지가 바뀐 꼴이 이미 `img` 를 감싼다). 동작 5 하위 항목 — 속성값도 렌더 결과이고 판정면은 span 요소를 풀어낸 DOM (FR-03 Must · NFR-01). 속성값 쪽 파서 계약(FR-01 · 02 · 05)은 `markdown-rendering` 27 이 받는다. HEAD=`b5e0112` · `71f68e4` · `4784051` 격리 사본에서 req 의 H 8행을 재현했다 (DOM 동치 0/6 · 텍스트 정규식 동치는 H2 · H2b 에서 참) | 동작 3·5 · 수용 기준 · 참고 · 머리 |
| 2026-10-13 | planner tick 396 실측 (req 없음) / — | 동작 7 신설 — 가로줄 줄은 감싸지 않고 그 판정은 파서의 것이다. TSK-20261013-31 (인용 안 가로줄)이 착지하면 원문 줄 정규식 판정이 인용 접두를 못 봐 동작 5 가 깨진다는 planner 시제품 실측을 운영자 지시로 반영했다 — 동작 6 의 *"`---` 이상은 가로줄 꼴로 감싸지 않는다"* 가 같은 사본을 안고 있었다. TSK-31 이 남길 followup 이 req 로 오면 이 항으로 흡수한다. HEAD=`4784051` 격리 사본에서 두 쌍의 현 산출(가로줄 미착지 — 강조 DOM === 평소 렌더)을 확인했다 | 동작 6·7 · 의존성 · 수용 기준 · 참고 · 머리 |
| 2026-10-13 | REQ-20261013-119 / — | 동작 6 신설 — 밑줄식 제목의 밑줄 줄은 감싸지 않고 그 판정은 파서의 것이다 (FR-02 Should 채택, 동작 2 와 같은 방식). 대조에 앞 줄이 문단이 아닌 밑줄 꼴 3행을 더했다 — 정규식 사본으로 고친 구현을 가르는 행이며 HEAD 에서 이미 span 1 · 보존이다 (inspector 실측). FR-04 는 전용 게이트 파일로 재정식화. `markdown-rendering` §의존성 역의존에 2 의 밑줄 판정을 더했다. HEAD=`b1d1e4c` · `58775e1` 격리 사본에서 req 표 11행을 재현했다 | 동작 6 · 의존성 · 수용 기준 · 참고 · 머리 |
| 2026-10-13 | inspector reconcile / `b1d1e4c` | 동작 1~4 `[x]` — HEAD=`b1d1e4c` `git archive` 사본에서 두 명령 재실행 rc=0 2/2 (TSK-20261013-15 result.md 실재). 머리 게이트 목록 갱신 | 수용 기준 · 머리 |
| 2026-10-13 | inspector reconcile / — @ HEAD=`cb354da` | `[x]` 1 rc=0 · `[ ]` 1 rc=1 불변 (게이트 파일 부재 — TSK-20261013-15 미착지). 주입 이관처 "미발행" 문면을 발행된 TSK-20261013-15 로 정정 | 참고 |
| 2026-10-13 | REQ-20261013-099 / — | 최초 등록. 소비처 펜스 사본 금지를 `markdown-rendering` 21 에 넣지 않고 별도 문서로 두었다 — 소비처는 파서 밖이고 판정면이 강조 경로다. HEAD=`bea3a3b` 격리 사본에서 req 의 여섯 행을 재현했다 (누출 2 · 2 · 2, 누락 span 0 · 0, 대조 표식 0) | all |

## 참고

### 주입 이관 (`RULE-06 §게이트 실효 검증` — 동작 2 게이트를 세우는 task 의 DoD)

`RULE-07 §수용 기준 문장` 의 '가정 주입 요구' 부류라 체크박스로 두지 않는다. 이관처 task 는 `TSK-20261013-15` — DoD 에 아래 주입 1 · 대조 1 이 실렸고 `b1d1e4c` 로 착지했다 (`injection: 1/1 detect` · `control: 1/1 pass`).

- **주입**: 착지 후 트리에서 코드 블록 판정을 현 사본 `/^\s*```/` 토글로 되돌린다 → rc≠0 (물결 · 인용 · 항목 안 행이 붉다). 원복 → rc=0.
- **대조**: 판정 함수의 이름이나 위치만 바꾼 변형 → rc=0. 붉으면 게이트가 텍스트를 재고 있는 것이다.

### 주입 이관 (동작 6 게이트를 세우는 task 의 DoD)

이관처는 `change-highlight-setext-underline` 게이트를 세우는 task (미발행). **주입**: 착지 후 트리에서 밑줄 판정을 `SETEXT_UNDERLINE_PATTERN` 정규식 사본으로 바꾼다 → rc≠0 (앞 줄이 문단이 아닌 밑줄 꼴 3행이 span 을 잃는다). 밑줄 제외를 지운 트리 → rc≠0 (결함 7행). **대조**: 판정 함수의 이름·위치만 바꾼 변형 → rc=0.

### 주입 이관 (동작 3 · 5 하위 항목 게이트를 세우는 task 의 DoD)

이관처는 `change-highlight-attribute-values` 게이트를 세우는 task (미발행). **주입**: 고친 트리에서 표식을 요소 경계로 옮기는 처리를 지운다(속성값에서 걷기만 한다) → rc≠0 (H1 · H4 · H5 · H9 span 0 · H2b 번짐). 걷기도 지운 트리 → rc≠0 (속성값 동치). **대조**: 한 줄 설명·제목만 바뀐 행(H7 꼴) → rc=0. 판정을 텍스트 정규식으로 바꾼 게이트 사본은 H2 주입을 놓쳐야 한다 — 판정면이 DOM 인 근거로 `result.md` 에 남긴다.

### 주입 이관 (동작 7 게이트를 세우는 task 의 DoD)

이관처는 `change-highlight-thematic-break` 게이트를 세우는 task (미발행 — 선행 TSK-20261013-31 `b63a383` 착지). **주입**: 착지 후 트리에서 가로줄 제외를 원문 한 줄 정규식(`THEMATIC_BREAK_PATTERN.test(line.trim())`, 지금의 형태)으로 되돌린다 → rc≠0 (인용 세 쌍). 가로줄 제외를 지운 트리 → rc≠0 (최상위 `***`). **대조**: 판정 함수의 이름·위치만 바꾼 변형 → rc=0.

### 주입 이관 (동작 8 게이트를 세우는 task 의 DoD)

이관처는 `change-highlight-container-prefix` 게이트를 세우는 task (미발행). **주입**: 고친 트리에서 접두 판정을 지금의 한 겹 정규식(`diffContents` 의 `LINE_PREFIX`)으로 되돌린다 → rc≠0 (M 6행). **대조**: 접두 판정 함수의 이름·위치만 바꾼 변형 → rc=0. 정규식을 여러 겹(`(…)+`)으로 늘린 사본은 M 행을 통과할 수 있다 — 그 사본이 갈리는 행(`* * *` / `글` — 29 착지 뒤 · 들여 쓴 `>` 행)을 동작 7 · 8 게이트가 함께 가진다.

### 미측정·비판정 항목

- 바깥 컨테이너가 목록 표지인 꼴(`- > 인용` · `- # 제목` · `1. - x`)은 평소 렌더부터 CommonMark 과 다르다 — 지금 `li` 안 글자이고 commonmark.js 0.31.2 는 `li > blockquote` · `li > h1` · `li > ul` 이다. 강조 = 평소 등식은 HEAD=`d4b8ef0` 에서 셋 다 참이라 이 계약의 위반이 아니다 (inspector probe). 평소 렌더의 결함 여부는 `markdown-rendering` 이 정하고 지금 계약하지 않는다.

- 이력 렌더 비용은 판본당 파싱 1회를 넘지 않아야 한다 — `Writer.tsx` 의 memo 근거(판본 30개 265ms)가 있다. 줄마다 파서를 다시 부르는 구현은 피한다. 미측정 NFR 이다.
- 표식 문자가 독자에게 어떤 글리프로 보이는지는 글꼴에 달렸고 측정하지 않았다 (`diffContents.ts` 주석: 사용자 영역은 아이콘 폰트가 쓴다). 판정면은 `textContent` 이고, 코드 복사 시 문자가 섞여 나가는 것은 그것으로 확정된다.
- 인용 안 펜스(`7ae6cbb` 이전)에서 표식이 span 으로 복원됐는지는 이전 커밋에서 재지 않았다 — 회귀 시점은 이 계약의 판정 대상이 아니다.
