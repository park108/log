# 변경 이력 강조 계약

> **위치**: `src/Log/diffContents.ts` 의 `markChangedLines` · 소비처 `src/Log/Writer.tsx` (변경 이력 → `LogItem`) · 보조: `src/common/markdownParser.ts` 의 표식 복원(`HIGHLIGHT_OPEN` · `HIGHLIGHT_CLOSE`)과 펜스 판정
> **관련 요구사항**: REQ-20261013-099 FR-01~FR-04 · NFR-01 · NFR-02 (출처: developer followup `20261013-0934-diffcontents-fence-copy-diverges`, source_task TSK-20261013-01) · REQ-20261013-119 FR-01~FR-04 (출처: developer followup `20261013-1505-highlight-setext-underline-breaks-heading`, source_task TSK-20261013-15)
> **게이트**: `src/Log/diffContents.test.ts` · `src/__tests__/change-highlight-preserves-rendering.test.ts` · `src/__tests__/change-highlight-follows-parser-code-blocks.test.ts` · 신설 예정(§수용 기준 `[ ]`): `src/__tests__/change-highlight-setext-underline.test.ts` · `change-highlight-thematic-break.test.ts`
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

4. **파서가 코드 블록으로 그리는 줄은 맥락과 무관하게 표식하지 않는다.** 동작 1 의 세 입력 → span 0 · `pre` 텍스트는 원문 그대로. 최상위 백틱 펜스 `` ```\nconst y = 2;\n``` `` / `…x = 1…` 의 현 산출(표식 0 · `pre` 1)은 바뀌지 않는다 (`diffContents.test.ts` *"코드 블록 안은 표식하지 않는다"*).

5. **강조는 렌더 결과를 바꾸지 않는다** (기존 명제, `change-highlight-preserves-rendering.test.ts`) — 강조본에서 강조 span 만 걷어낸 것이 평소 렌더와 같다. 동작 1 의 세 입력은 이 명제의 위반이기도 하다. 그 게이트의 corpus 에 그 입력이 없을 뿐이다.

6. **밑줄식 제목의 밑줄 줄은 감싸지 않는다 — 밑줄 판정은 파서의 것이다** (`markdown-rendering` 2 · 3). 감싼 줄은 밑줄 꼴이 아니어서 파서가 제목을 세우지 않는다. 바뀐 줄이 *강조 span 을 받지 않았다* ⇔ *파서가 그 줄을 밑줄로 썼다* — 동작 2 와 같은 방식이며 `diffContents` 에 밑줄 규칙 사본(정규식 + 앞 줄 조건)을 두지 않는다. `제목\n===` / `제목\n---` · `제목\n--` / `제목` · `제목\n-` / `제목` · `제목\n=` / `제목\n==` · `제목\n==\n본문` / `제목\n===\n본문` · `제목\n  ===` / `제목\n===` · `> 제목\n> ===` / `> 제목\n> ---` → 강조본에서 span 만 걷은 것이 평소 렌더와 같다 (동작 5). 바뀌지 않는 것: 제목 **글자**가 바뀐 줄은 강조된다 (`새 제목\n===` / `제목\n===` → `<h1>` 안 span) · 밑줄 꼴이 아닌 줄(`제목\n= =`) · 앞 줄이 문단이 아니어서 밑줄이 아닌 같은 꼴(`==\n본문` · `본문\n\n==` · `- a\n  ==`)은 강조된다 · `---` 이상은 지금처럼 가로줄 꼴로 감싸지 않는다 (7).

7. **가로줄 줄은 감싸지 않는다 — 가로줄 판정도 파서의 것이다** (`markdown-rendering` 2 · 3 넷째 하위 항목). 감싼 줄은 가로줄 꼴이 아니어서 선 대신 표기 글자가 보인다. 바뀐 줄이 *강조 span 을 받지 않았다* ⇔ *파서가 그 줄을 `<hr>` 로 그렸다* — 동작 2 · 6 과 같은 방식이다. 원문 한 줄에 `THEMATIC_BREAK_PATTERN` 을 거는 판정은 인용 접두(`> `)와 항목 안 인용 접두를 보지 못하는 사본이다: 3 넷째 하위 항목(인용 안 가로줄)이 착지하면 `> ***` / `> 글` · `- a\n  > ---` / `- a\n  > b` · `> > ---` / `> > b` 의 강조본은 `<blockquote><span …>***</span></blockquote>` 꼴이고 평소 렌더는 `<blockquote><hr></blockquote>` 다 (동작 5 위반 — planner tick 396 시제품 실측). 바뀌지 않는 것: 최상위 `---` · `***` · `___` 는 감싸지 않는다 · 가로줄 꼴이 아닌 인용 줄(`> --` / `> -`)은 강조된다.

## 의존성

- 내부: `common/markdownParser` (`HIGHLIGHT_OPEN` · `HIGHLIGHT_CLOSE` · `HIGHLIGHT_CLASS` · `THEMATIC_BREAK_PATTERN` · `stripHeadingClosingSequence` · 코드 블록 줄 판정 — 규칙을 파서에서 받는 선례. 밑줄 판정(동작 6)도 같은 길로 받는다. `SETEXT_UNDERLINE_PATTERN` 정규식만 가져오면 앞 줄 조건이 빠진 사본이 된다. 가로줄(동작 7)도 같다 — `THEMATIC_BREAK_PATTERN` 정규식만 가져오면 컨테이너 접두를 못 보는 사본이다) · `common/sanitizeHtml`.
- 계약: `markdown-rendering` 21 (*"펜스 판정은 파서 안에 하나"*) · 3 · 19. 그 계약에 펜스가 놓이는 맥락이 늘면 동작 2 가 이 소비처를 함께 묶는다.
- 역의존(소비처): `grep -rn "markChangedLines" src --include="*.ts" --include="*.tsx" | grep -v "\.test\."` → `Writer.tsx` (import 와 변경 이력 호출) 1 곳.

## 수용 기준

- [x] 기존 두 게이트 (동작 4 대조 · 동작 5): `bash -c 'npx vitest run src/Log/diffContents.test.ts src/__tests__/change-highlight-preserves-rendering.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`e38a118` rc=0.
- [x] 코드 블록 판정 정합 (동작 1~4): `bash -c 'npx vitest run src/__tests__/change-highlight-follows-parser-code-blocks.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`b1d1e4c` rc=0 (TSK-20261013-15 `b1d1e4c` — `injection: 1/1 detect` · `control: 1/1 pass`). HEAD=`e38a118` rc=1 (파일 부재). 동작 1 의 세 입력 표식 문자 0 · 동작 3 의 두 입력 span 1 · 동작 4 의 대조를 잰다. 동작 2 는 맥락(최상위 · 인용 · 항목) × 펜스 문자(백틱 · 물결) × 들여쓰기(0 · 3 · 4칸) 배터리에서, 바뀐 줄마다 *span 받음* ⇔ *`newer` 단독 렌더에서 그 줄이 `pre` 밖* 을 잰다.
- [ ] 밑줄식 제목 보존 (동작 6): `bash -c 'npx vitest run src/__tests__/change-highlight-setext-underline.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`58775e1` rc=1 (파일 부재). REQ-20261013-119 의 결함 7행(U1·U2·U4·U5·U8·U11·U7 — span 걷은 강조본 === 평소 렌더), 대조 4행(U3·U6·U9·U10 — 강조 렌더 불변)과 앞 줄이 문단이 아닌 밑줄 꼴 3행(`==\n본문` / `=\n본문` · `본문\n\n==` / `본문\n\n=` · `- a\n  ==` / `- a\n  =` — span 1 · 보존)을 잰다. 판정면은 `change-highlight-preserves-rendering.test.ts` 와 같다. req FR-04 의 *"그 게이트 corpus 에 행"* 은 판정 명령이 한 파일을 지목해야 하므로 같은 판정면의 전용 파일로 재정식화했다 — 기존 corpus 에 같은 행을 더하는 것도 막지 않는다. HEAD=`58775e1` 실측(`b1d1e4c` 와 바이트 동일): 결함 7/7 다름 · 대조 4/4 기대값 · 밑줄 꼴 3행 span 1 · 보존.
- [ ] 가로줄 줄 보존 (동작 7): `bash -c 'npx vitest run src/__tests__/change-highlight-thematic-break.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`4784051` rc=1 (파일 부재). 동작 7 의 인용 세 쌍과 최상위 `***` / `글` 에서 span 요소를 풀어낸 강조 DOM === 평소 렌더 DOM **이고** 평소 렌더에 `hr` 1 (가로줄이 서지 않은 트리에서 보존 판정이 무판정으로 초록이 되지 않게), 대조 `> --` / `> -` 의 span 1 · 텍스트 `--` 를 잰다. 인용 세 쌍의 `hr` 1 은 `markdown-rendering` 3 넷째 하위 항목(TSK-20261013-31)이 착지해야 참이다 — 이 게이트는 그 게이트 뒤에 선다. HEAD=`4784051` 실측(inspector probe, `b5e0112` · `71f68e4` 와 같은 산출): `> ***` / `> 글` · `- a\n  > ---` / `- a\n  > b` 두 쌍 모두 강조 DOM === 평소 렌더(둘 다 글자 — 가로줄 미착지) · `blockquote hr` 0.

## 변경 이력

| 일자 | req / 커밋 | 요약 | 영향 |
|------|-----------|------|------|
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

### 주입 이관 (동작 7 게이트를 세우는 task 의 DoD)

이관처는 `change-highlight-thematic-break` 게이트를 세우는 task (미발행 — TSK-20261013-31 뒤). **주입**: 착지 후 트리에서 가로줄 제외를 원문 한 줄 정규식(`THEMATIC_BREAK_PATTERN.test(line.trim())`, 지금의 형태)으로 되돌린다 → rc≠0 (인용 세 쌍). 가로줄 제외를 지운 트리 → rc≠0 (최상위 `***`). **대조**: 판정 함수의 이름·위치만 바꾼 변형 → rc=0.

### 미측정·비판정 항목

- 이력 렌더 비용은 판본당 파싱 1회를 넘지 않아야 한다 — `Writer.tsx` 의 memo 근거(판본 30개 265ms)가 있다. 줄마다 파서를 다시 부르는 구현은 피한다. 미측정 NFR 이다.
- 표식 문자가 독자에게 어떤 글리프로 보이는지는 글꼴에 달렸고 측정하지 않았다 (`diffContents.ts` 주석: 사용자 영역은 아이콘 폰트가 쓴다). 판정면은 `textContent` 이고, 코드 복사 시 문자가 섞여 나가는 것은 그것으로 확정된다.
- 인용 안 펜스(`7ae6cbb` 이전)에서 표식이 span 으로 복원됐는지는 이전 커밋에서 재지 않았다 — 회귀 시점은 이 계약의 판정 대상이 아니다.
