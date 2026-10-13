# 변경 이력 강조 계약

> **위치**: `src/Log/diffContents.ts` 의 `markChangedLines` · 소비처 `src/Log/Writer.tsx` (변경 이력 → `LogItem`) · 보조: `src/common/markdownParser.ts` 의 표식 복원(`HIGHLIGHT_OPEN` · `HIGHLIGHT_CLOSE`)과 펜스 판정
> **관련 요구사항**: REQ-20261013-099 FR-01~FR-04 · NFR-01 · NFR-02 (출처: developer followup `20261013-0934-diffcontents-fence-copy-diverges`, source_task TSK-20261013-01)
> **게이트**: `src/Log/diffContents.test.ts` · `src/__tests__/change-highlight-preserves-rendering.test.ts` · 신설 예정(§수용 기준 `[ ]`): `src/__tests__/change-highlight-follows-parser-code-blocks.test.ts`
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

## 의존성

- 내부: `common/markdownParser` (`HIGHLIGHT_OPEN` · `HIGHLIGHT_CLOSE` · `HIGHLIGHT_CLASS` · `THEMATIC_BREAK_PATTERN` · `stripHeadingClosingSequence` — 규칙을 파서에서 받는 선례가 이미 있다) · `common/sanitizeHtml`.
- 계약: `markdown-rendering` 21 (*"펜스 판정은 파서 안에 하나"*) · 3 · 19. 그 계약에 펜스가 놓이는 맥락이 늘면 동작 2 가 이 소비처를 함께 묶는다.
- 역의존(소비처): `grep -rn "markChangedLines" src --include="*.ts" --include="*.tsx" | grep -v "\.test\."` → `Writer.tsx` (import 와 변경 이력 호출) 1 곳.

## 수용 기준

- [x] 기존 두 게이트 (동작 4 대조 · 동작 5): `bash -c 'npx vitest run src/Log/diffContents.test.ts src/__tests__/change-highlight-preserves-rendering.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`e38a118` rc=0.
- [ ] 코드 블록 판정 정합 (동작 1~4): `bash -c 'npx vitest run src/__tests__/change-highlight-follows-parser-code-blocks.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`e38a118` rc=1 (파일 부재). 동작 1 의 세 입력 표식 문자 0 · 동작 3 의 두 입력 span 1 · 동작 4 의 대조를 잰다. 동작 2 는 맥락(최상위 · 인용 · 항목) × 펜스 문자(백틱 · 물결) × 들여쓰기(0 · 3 · 4칸) 배터리에서, 바뀐 줄마다 *span 받음* ⇔ *`newer` 단독 렌더에서 그 줄이 `pre` 밖* 을 잰다.

## 변경 이력

| 일자 | req / 커밋 | 요약 | 영향 |
|------|-----------|------|------|
| 2026-10-13 | REQ-20261013-099 / — | 최초 등록. 소비처 펜스 사본 금지를 `markdown-rendering` 21 에 넣지 않고 별도 문서로 두었다 — 소비처는 파서 밖이고 판정면이 강조 경로다. HEAD=`bea3a3b` 격리 사본에서 req 의 여섯 행을 재현했다 (누출 2 · 2 · 2, 누락 span 0 · 0, 대조 표식 0) | all |

## 참고

### 주입 이관 (`RULE-06 §게이트 실효 검증` — 동작 2 게이트를 세우는 task 의 DoD)

`RULE-07 §수용 기준 문장` 의 '가정 주입 요구' 부류라 체크박스로 두지 않는다. 이관처 task 는 미발행이다.

- **주입**: 착지 후 트리에서 코드 블록 판정을 현 사본 `/^\s*```/` 토글로 되돌린다 → rc≠0 (물결 · 인용 · 항목 안 행이 붉다). 원복 → rc=0.
- **대조**: 판정 함수의 이름이나 위치만 바꾼 변형 → rc=0. 붉으면 게이트가 텍스트를 재고 있는 것이다.

### 미측정·비판정 항목

- 이력 렌더 비용은 판본당 파싱 1회를 넘지 않아야 한다 — `Writer.tsx` 의 memo 근거(판본 30개 265ms)가 있다. 줄마다 파서를 다시 부르는 구현은 피한다. 미측정 NFR 이다.
- 표식 문자가 독자에게 어떤 글리프로 보이는지는 글꼴에 달렸고 측정하지 않았다 (`diffContents.ts` 주석: 사용자 영역은 아이콘 폰트가 쓴다). 판정면은 `textContent` 이고, 코드 복사 시 문자가 섞여 나가는 것은 그것으로 확정된다.
- 인용 안 펜스(`7ae6cbb` 이전)에서 표식이 span 으로 복원됐는지는 이전 커밋에서 재지 않았다 — 회귀 시점은 이 계약의 판정 대상이 아니다.
