# 마크다운 렌더링 계약

> **위치**: `src/common/markdownParser.ts` (파서) · `src/common/sanitizeHtml.ts` (정제) · 소비처 `src/Log/LogItem.tsx` · `src/Log/Writer.tsx` · `src/Log/api.ts`
> **게이트**: `src/common/markdownParser.test.ts` · `src/__tests__/markdown-render-invariants.test.ts` · `markdown-no-character-loss.test.ts` · `markdown-attribute-integrity.test.ts` · `parser-sanitizer-coherence.test.ts`
> **최종 업데이트**: 2026-09-01 (운영자 — 마크다운 계약 14건 통합)

## 역할

글쓴이가 쓴 것이 독자에게 그대로 보인다. **의도하지 않은 마크업이 글자를 삼키지 않고, 의도한 마크업이 글자로 남지 않는다.**

**방어 대상**: 파서가 조용히 내용을 바꾸는 회귀. 이 축의 실패는 게이트가 아니라 **독자가 먼저 본다** — 그리고 글쓴이는 자기 원문에서 잘못을 찾을 수 없다.

## 동작 — 블록

1. **ATX 제목의 닫는 `#` 은 내용이 아니다.** 줄 끝 `#` 런 앞에 공백이 있으면 닫는 시퀀스이며 개수는 여는 쪽과 무관하다. 앞에 공백이 없으면 내용이다 (`## C# 과 F#`). `####### 일곱` 과 `##제목` 은 여전히 문단이다.

2. **밑줄식 제목**: 문단 줄 바로 다음 줄이 `-` 만이면 `<h2>`, `=` 만이면 `<h1>` 이고 밑줄 줄은 남지 않는다. **바로 앞 한 줄만** 올라간다. 앞에 문단이 없으면 `<hr />` 이고, `*`·`_` 는 밑줄이 아니며, `- 항목\n---` 는 목록 + 가로줄이다.

3. **인용은 한 덩어리다.** 연속한 `>` 줄은 `<blockquote>` 하나이며 빈 줄에서 끊긴다. 인용 **안에서 블록 문법이 동작한다** — 목록·ATX 제목·밑줄식 제목·중첩 인용. 인용 내용의 인라인은 **한 번만** 처리된다.

4. **목록 항목의 내용은 마커 바로 뒤부터 시작한다.** 마커는 `-␣` 또는 `숫자.␣` 이며 그 전부가 표기다. 같은 내용을 두 표기로 쓰면 `<li>` 안 문자열이 같다.

5. **마커 없는 다음 줄은 그 항목의 내용이다** — 들여쓰기 유무와 무관하다. 목록은 끊기지 않고 **번호는 되감기지 않는다.** 들여쓰기로 쓴 공백·탭은 본문 앞에 남지 않는다. 열린 항목이 없는 들여쓴 줄은 그대로 문단이다 (`  hello` → `<p>  hello</p>`).

6. **빈 줄은 같은 종류의 목록을 끊지 않는다.** 산출이 그 줄을 걷어낸 입력과 문자열로 같다. 빈 줄 판정은 **공백·탭만 있는 줄을 포함**하며 그 술어는 파서 안에 하나뿐이다. 빈 줄 뒤가 목록이 아니거나 종류가 다르면 목록은 끝난다.

7. **종류가 달라도 중첩된다.** 더 깊게 들여쓴 마커는 종류와 무관하게 그 항목 안에 중첩되고 바깥 목록의 여는 태그는 1개다. **같은 종류 중첩의 현 산출은 불변이다** — 종류 판정을 통째로 없애는 구현이 여기서 갈린다.

8. **파이프 표는 표로 렌더된다.**

9. **코드 블록 안의 마크다운은 파싱되지 않는다.** 들여쓰기·빈 줄·탭이 보존되고 HTML 은 이스케이프된다.

## 동작 — 인라인

10. **다섯 구분자(`*` `**` `_` `__` `~~`) 는 공백 flanking 판정 아래 대등하다.** 여는 자리 뒤가 공백·줄끝이면 열지 않고, 닫는 자리 앞이 공백이면 닫지 않는다. `2 ** 10` · `와~~ 좋다 대박~~` · `값은 a _ b _ c 이다` 가 평문으로 남는다.

11. **문장부호 flanking**: 여는 구분자 뒤가 문장부호이고 앞이 공백도 문장부호도 아니면 열지 않는다. 닫는 쪽은 대칭이다. 판정면은 유니코드 `P`+`S` (`/[\p{P}\p{S}]/u`) 이며 ASCII 열거로 대신하지 않는다. **앞이 공백이거나 문장부호면 연다** — `**"굵게"**` · `(**굵게**)` · `~~"취소"~~`.

12. **낱말 안쪽 억제는 `_` 계열만이고, 앞뒤가 둘 다 단어 글자일 때만 발동한다.** `foo_bar_baz` · `a__b__c` 는 글자로 남고 `앞a~~b~~c뒤` 는 취소선이다.

13. **구분자 런은 쪼개 쓰지 않는다.** 여닫이 구분자 바로 바깥에 같은 글자가 이어지면 열지도 닫지도 않는다 (`___둘다___` · `아~~~ 그렇구나`).

14. **10~13 의 판정은 한 벌뿐이다.** 구분자별 사본을 만들지 않는다. 대등성은 **등록 인자가 아니라 산출로** 판정한다 — 같은 형태의 입력이 다섯 구분자 전부에서 같게 동작한다.

15. **보호 축**: 코드 스팬 안(`` `my_var_name` ``) · 백슬래시 이스케이프(`\_밑줄아님\_`) · 링크 URL 안(`/a_b_c`) 의 구분자는 강조가 아니다.

16. **링크 타깃**: 외부 URL 만 `target='_blank' rel='noreferrer'` 를 받는다. 내부·상대 링크는 같은 탭에서 연다.

## 동작 — 안전

17. **속성값은 보간 전에 escape 를 거친다.** `<img>`·`<a>` 의 속성값이 날것으로 들어가지 않는다. escape 함수의 정의는 `markdownParser.ts` 안에 있고 export 되지 않는다 — 사본이 갈라지지 않게.

18. **파서가 내는 태그는 정제를 통과한다.** `sanitizeHtml` 의 `ALLOWED_TAGS` 에 없는 태그를 파서가 emit 하면 글자가 통째로 사라진다. 두 목록은 함께 움직인다.

## 의존성

- 소비처 도출: `grep -rn "markdownToHtml(" src --include="*.ts" --include="*.tsx" | grep -v "\.test\."` → `Writer.tsx`(편집 미리보기) · `api.ts`(저장 요약) · `LogItem.tsx`(본문 렌더). **댓글은 파서를 쓰지 않는다.**
- 요약 경로는 `trimmedContents` 가 태그를 걷으므로 파서 산출의 변화가 목록·검색 미리보기에 전파된다 — 단, **저장된 요약은 저장 시점 파서에 고정된다.**

## 수용 기준

- [x] 파서 스위트 통과: `bash -c 'npx vitest run src/common/markdownParser.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 교차 게이트 통과: `bash -c 'npx vitest run src/__tests__/ --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 다섯 구분자 대등 등록: `bash -c 'test "$(grep -cE "inlineParsing\(parsed, \"[^\"]+\", \"[^\"]+\"\)" src/common/markdownParser.ts)" -eq 0'` → rc=0 (3인자 형태 0건 = 전부 `strictFlanking`)
- [x] escape 단일 출처: `bash -c 'test "$(grep -c "export const escapeHtmlQuotes" src/common/markdownParser.ts)" -eq 0'` → rc=0

## 참고

### 통합 이력 (2026-09-01)

아래 14건을 본 문서로 합쳤다. 축마다 문서를 두던 방식은 같은 함수의 계약을 열네 곳에 흩어 놓았고, 한 축을 고칠 때 다른 축의 문서가 거짓이 되는 일이 반복됐다 (`(I6)` 거짓 승격 · 물결 의존성 오기 · 줄 참조 17곳 밀림).

`markdown-atx-heading-closing-sequence` · `markdown-blank-line-list-continuity` · `markdown-blank-line-predicate` · `markdown-blockquote-block-recursion` · `markdown-emphasis-flanking-punctuation` · `markdown-list-item-content-start` · `markdown-list-item-continuation` · `markdown-mixed-type-nested-list` · `markdown-pipe-table` · `markdown-setext-heading-underline` · `markdown-star-emphasis-space-flanking` · `markdown-tilde-strikethrough-space-flanking` · `markdown-underscore-emphasis-space-flanking` · `markdownParser`

**게이트는 하나도 삭제하지 않았다.** 위 문서들이 참조하던 테스트 파일과 단언은 그대로 남아 돈다.

### 걷어낸 것

`markdownParser` 의 `bindListItem` 알고리즘 내부 계약(triple emission · deferred `</li>` · depth stack)은 옮기지 않았다. **깨지면 렌더링 테스트가 즉시 붉어지므로** 계약으로 박제할 필요가 없다 (`RULE-07 §반려 시그널`).

### 미측정·비판정 항목

- 저장된 요약과 현 파서 산출의 불일치 — 회복은 저장소 밖(재저장·서버 일괄 재계산)이며 `stored-summary-parser-drift-measurement` 가 측정 채널을 소유한다.
- 참조 링크·들여쓴 코드 블록·각주는 미구현이다. 고장이 아니라 기능 부재이며 사용 빈도를 주장할 근거가 없다.
