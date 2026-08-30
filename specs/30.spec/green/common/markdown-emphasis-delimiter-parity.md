# 강조의 의미는 구분자에 의존하지 않는다 — 밑줄(`_` · `__`) 강조

> **위치**: `src/common/markdownParser.ts` — 인라인 패스 등록 (`:513`·`:514`·`:518`), `inlineParsing` 정의 (`:563`), `strictFlanking` 판정 (`:595` 여는 쪽 · `:608` 닫는 쪽), `ESCAPABLE` (`:380`), `THEMATIC_BREAK_PATTERN` (`:154`), 코드 스팬 선추출 (`:329`), `stashTag` (`:347`). 게이트: `src/common/markdownParser.test.ts`.
> **관련 요구사항**: REQ-20260831-051 FR-01~FR-05 · NFR-01~NFR-03
> **최종 업데이트**: 2026-08-31 (by inspector — REQ-20260831-051 흡수, HEAD=`b1cbf5c`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`b1cbf5c`).

## 역할

CommonMark 는 강조 구분자로 `*` 와 `_` 를 **대등하게** 규정한다 (0.31.2 §6.2). 따라서 글쓴이가 어느 구분자를 골랐는지는 렌더 결과를 바꾸지 않는다 — `_기울임_` 은 `*기울임*` 과 같은 `<em>` 을, `__굵게__` 는 `**굵게**` 와 같은 `<strong>` 을 낸다.

**방어 대상 (사용자 관측 표면)**: 표준 표기로 쓴 글이 강조를 잃고, 그 위에 **구분자 문자가 독자 화면에 글자로 남는** 상태. 글쓴이가 내보내려던 적이 없는 글자다. 같은 문장 안에서 `*별표* 와 _밑줄_` 중 한쪽만 동작하므로, 글쓴이는 자기 글이 왜 반만 렌더되는지 알 방법이 없다.

**이 계약의 나머지 절반은 무엇을 강조하지 **않는가** 다.** `_` 는 `*` 와 달리 식별자에 흔히 쓰인다 (`foo_bar_baz` · `snake_case`). CommonMark 가 밑줄에만 intraword 제한을 두는 이유가 이것이며, 그 제한 없이 `_` 를 등록하면 기술 문서가 깨진다. 두 축은 함께 성립해야 한다 — 한쪽만으로는 지금보다 나쁠 수 있다.

의도적으로 하지 않는 것: `***`/`___` 3중 구분자의 중첩 강조 조합 (별 축 — §참고 §미측정), 별표 구분자의 현 동작 변경 (`*` 는 CommonMark 상 단어 안에서도 강조를 연다), 강조의 **스타일**(CSS — 계약은 어떤 태그가 나오는가이지 어떻게 보이는가가 아니다), 다른 마크다운 축 (표 · 목록 이어짐 · 제목 닫는 시퀀스 — 각각 별 spec).

## 공개 인터페이스
- 변경 없음. `markdownToHtml(rawInput: string): string` (`markdownParser.ts:66`) 의 시그니처와 `inlineParsing` 의 module-private 성격은 그대로다. 계약면은 **산출 HTML** 이다.

## 동작

1. **(I1) 홑 밑줄은 `<em>`**: `_텍스트_` 는 `<em>텍스트</em>` 로 렌더된다. `*텍스트*` 와 같은 결과다.
2. **(I2) 겹 밑줄은 `<strong>`**: `__텍스트__` 는 `<strong>텍스트</strong>` 로 렌더된다. `**텍스트**` 와 같은 결과다.
3. **(I3) 단어 안의 밑줄은 강조가 아니다**: 구분자의 앞뒤 어느 한쪽이라도 영숫자면 강조를 열지도 닫지도 않는다. `foo_bar_baz` · `a__b__c` 는 글자 그대로 남는다. 이 제한은 `_` 계열에만 적용되며 `*` 계열에는 적용되지 않는다 — 그것이 CommonMark 가 두 구분자를 가르는 유일한 지점이다.
4. **(I4) 보호 축 통과**: 밑줄 강조는 아래 다섯 축을 통과한다 — 이들은 현 HEAD 에서 이미 참이며 본 계약이 성립한 뒤에도 같아야 한다.
   - 코드 스팬 안: `` `my_var_name` `` → `<p><code>my_var_name</code></p>` (코드 스팬 선추출 `:329`).
   - 백슬래시 이스케이프: `\_밑줄아님\_` → `<p>_밑줄아님_</p>` (`ESCAPABLE` `:380` 에 `_` 포함).
   - 링크 URL 안: `[문서](https://example.com/a_b_c)` 의 `href` 가 온전 (`stashTag` `:347` 의 태그 조각 격리).
   - `___` 은 수평선 (`THEMATIC_BREAK_PATTERN` `:154`).
   - `__` 는 수평선이 아니다 (대조).
5. **(I5) 구분자 혼용**: 밑줄 강조와 별표 강조는 한 문장 안에서 함께 동작한다 — `*별표* 와 _밑줄_` 의 양쪽 모두 `<em>` 이 된다.
6. **(I6) 별표 축 불변 (범위 제한)**: `*`·`**`·`~~` 의 현 동작은 바뀌지 않는다. 본 계약은 `_` 계열을 **더하는** 것이지 기존 구분자의 판정을 옮기는 것이 아니다.

### 회귀 중점
- **(I1)(I2) 만 만족시키고 (I3) 를 빠뜨리는 구현**이 이 축의 대표 실패다. `_` 를 기존 `inlineParsing` 에 그대로 등록하면 `foo_bar_baz` 가 `foo<em>bar</em>baz` 가 된다 — 현재 정상인 것을 깨뜨리는 방향이다. 현 `strictFlanking` (`:595`·`:608`) 은 **공백과 같은 구분자의 연속**만 보고 영숫자 인접은 보지 않으므로, 그 상태로의 등록이 정확히 이 회귀다.
- (I3) 만 만족시키고 (I1)(I2) 가 없으면 아무것도 달라지지 않는다 — 현 HEAD 가 그 상태다.
- `___` 을 수평선에서 강조로 넘기면 (I4) 위반. 수평선 판정은 인라인 패스보다 앞(블록 패스)에 있으므로, 인라인 쪽 변경이 이 순서를 뒤집지 않아야 한다.
- 코드 스팬·이스케이프·링크 URL 의 보호는 **인라인 패스보다 앞선 선추출**에 기대고 있다. `_` 등록을 그 선추출보다 앞으로 옮기면 세 축이 동시에 깨진다.

## 의존성
- 내부: `src/common/markdownParser.ts` (단일 대상), `src/common/markdownParser.test.ts` (게이트).
- 외부: 없음 (순수 함수).
- 역의존 (사용처): `markdownToHtml` 산출을 소비하는 모든 화면 (Log · Comment 본문 렌더).
- 직교: `specs/30.spec/blue/common/sanitizeHtml.md` — 산출 태그 `em` · `strong` 은 `ALLOWED_TAGS` 에 이미 있으므로 본 축은 sanitize 정책 변경을 요구하지 않는다 (REQ-051 NFR-03, HEAD=`b1cbf5c` 실측 확인). `specs/30.spec/green/common/markdownParser.md` (`bindListItem` 알고리즘 + 속성 escape 축 — 본 축과 무관).

## 테스트 현황
- [ ] (I1·I2·I5) 밑줄 강조 계약이 게이트로 실재하고 초록이다: `bash -c 'grep -qF "밑줄 강조" src/common/markdownParser.test.ts && npx vitest run src/common/markdownParser.test.ts -t "밑줄 강조" >/dev/null 2>&1'` → HEAD=`b1cbf5c` 실측 **rc=1 (미충족)**. `grep -cF "밑줄 강조" src/common/markdownParser.test.ts` → **0**.
- [ ] (I3) intraword 억제 대조가 게이트로 실재하고 초록이다: `bash -c 'grep -qF "단어 안의 밑줄은 강조가 아니다" src/common/markdownParser.test.ts && npx vitest run src/common/markdownParser.test.ts -t "단어 안의 밑줄은 강조가 아니다" >/dev/null 2>&1'` → HEAD=`b1cbf5c` 실측 **rc=1 (미충족)**. **이 대조가 없으면 `foo_bar_baz` 를 깨뜨리는 구현도 (I1) 을 통과한다.**
- [ ] (I1·I2 정적 zero-point) 밑줄 구분자가 인라인 패스에 등록돼 있다: `bash -c 'test "$(grep -cE "inlineParsing\(parsed, \"_+\"" src/common/markdownParser.ts)" -ge 1'` → HEAD=`b1cbf5c` 실측 **rc=1 (0 hit)**. 현 등록은 셋뿐이며 전부 `*`·`~` 계열이다 (`:513` `"**"` · `:514` `"~~"` · `:518` `"*"`). **등록 형태가 달라지면(예: 구분자 표를 순회) 이 항목은 그 형태에 맞춰 재작성한다** — 수단을 지정하지 않는다.
- [x] (I4 보호 축 게이트 실재) 세 보호 축이 이미 게이트로 잠겨 있다: `bash -c 'grep -qE "for \(const src of \[.---., .\*\*\*., .___." src/common/markdownParser.test.ts && grep -qF "my_var_name" src/common/markdownParser.test.ts'` → HEAD=`b1cbf5c` 실측 rc=0 (`:266` 루프가 `___` 포함, `:273` 이 `__` 대조, `:316` 이 코드 스팬).
- [x] (I6·비퇴행 baseline) 현 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts >/dev/null 2>&1'` → HEAD=`b1cbf5c` 실측 rc=0 (**66 it**). 구현 후에도 rc=0 이어야 한다.

## 수용 기준
- [ ] (Must, FR-01·FR-02·FR-05) 위 §테스트 현황 (I1·I2·I5) 명령 → rc=0.
- [ ] (Must, FR-03) 위 §테스트 현황 (I3) 명령 → rc=0.
- [ ] (Must, FR-01·FR-02 정적) 위 §테스트 현황 정적 zero-point 명령 → rc=0.
- [x] (Must, FR-04 보호 축 실재) 위 §테스트 현황 (I4) 명령 → rc=0. HEAD=`b1cbf5c` 실측 rc=0.
- [x] (Must, NFR-01 비퇴행) `bash -c 'npx vitest run src/common/markdownParser.test.ts >/dev/null 2>&1'` → rc=0. HEAD=`b1cbf5c` 실측 rc=0 (66 it). 구현 후에도 rc=0 — **기존 게이트를 완화하는 방식의 해결은 불가**하다.
- [x] (Must, NFR-03 sanitize 무변경) 산출 태그가 이미 허용돼 있다: `bash -c 'grep -qE "'\''em'\''" src/common/sanitizeHtml.ts && grep -qE "'\''strong'\''" src/common/sanitizeHtml.ts'` → HEAD=`b1cbf5c` 실측 rc=0. 본 축은 `ALLOWED_TAGS` 변경을 요구하지 않는다.
- [x] (Must, 범위 제한) `*` 계열의 현 동작과 `***`/`___` 3중 구분자는 본 계약의 요구 대상이 아니다 — §역할 · §참고 §미측정.

## 스코프 규칙
- **expansion**: 불허 — 대상은 `src/common/markdownParser.ts` 와 `src/common/markdownParser.test.ts` 2 파일이다. sanitize 정책(`src/common/sanitizeHtml.ts`)은 **읽기 대상**이며 본 축은 그것을 바꾸지 않는다 (NFR-03). 게이트 위반이 이 밖에서 나오면 격리 대상이다.
- **grep-baseline** (HEAD=`b1cbf5c`, 2026-08-31 실측):
  - `grep -nE "inlineParsing\(parsed" src/common/markdownParser.ts` → 3 hits in 1 file: `:513` (`"**"`, strong) · `:514` (`"~~"`, del) · `:518` (`"*"`, em, `strictFlanking=true`). 밑줄 구분자 등록 **0 hit**.
  - `grep -cF "밑줄 강조" src/common/markdownParser.test.ts` → **0**. `grep -cF "단어 안의 밑줄은 강조가 아니다" …` → **0**. 두 계약 이름 모두 미존재 — 신설 대상이다.
  - `grep -cE "^[[:space:]]*it\(" src/common/markdownParser.test.ts` → **66**. 제외 규칙: `it(` 로 시작하는 줄만 계수하며 `describe`·주석·중첩 표기는 세지 않는다. 이 66건 중 밑줄 강조를 다루는 것은 0건이고, `_` 가 등장하는 곳은 전부 §동작 (I4) 의 보호 축이다.
  - 현 산출 실측 (격리 사본 `git archive HEAD` + `node_modules` 심볼릭 링크, repo 트리 무변경):
    | 입력 | 현 산출 | 계약 |
    |---|---|---|
    | `_기울임_` | `<p>_기울임_</p>` | `<p><em>기울임</em></p>` |
    | `__굵게__` | `<p>__굵게__</p>` | `<p><strong>굵게</strong></p>` |
    | `*별표* 와 _밑줄_` | `<p><em>별표</em> 와 _밑줄_</p>` | 양쪽 모두 `<em>` |
    | `foo_bar_baz` | `<p>foo_bar_baz</p>` | **동일 (보존)** |
    | `a__b__c` | `<p>a__b__c</p>` | **동일 (보존)** |
    | `` `my_var_name` `` | `<p><code>my_var_name</code></p>` | **동일 (보존)** |
    | `\_밑줄아님\_` | `<p>_밑줄아님_</p>` | **동일 (보존)** |
    | `___` | `<hr />` | **동일 (보존)** |
    | `__` | `<p>__</p>` | **동일 (보존)** |
- **rationale**: 등록 지점이 3 hit 으로 닫히고 계약 이름 2건이 0 hit 이므로 baseline 은 열거로 닫힌다. 보존 축 6건을 같은 표에 둔 이유는, 이 축의 실패가 "동작하지 않는다" 가 아니라 **"동작시키다가 보존 축을 깨뜨린다"** 쪽이기 때문이다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector (Phase 3, REQ-20260831-051 흡수) / pending @ HEAD=`b1cbf5c` | 최초 박제 — 강조 구분자 대등성 6 축 (I1~I6). 신규 spec 으로 세운 근거: `markdownParser.md` 는 §역할 에서 "markdownParser 의 다른 단계 알고리즘 박제 (필요 시 별 spec)" 를 명시적 범위 밖으로 선언하며, 강조 구분자 축 언급이 0건이다. baseline: 등록 3 hit 전부 `*`·`~` 계열 / `_` 등록 0 hit / 계약 이름 2건 0 hit / 66 it 중 밑줄 강조 0건 / 현 산출·보존 축 9건 격리 사본 실측. unchecked 3 · checked 4. | all |

## 참고

### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. 이관처 task 가 발행되지 않으면 이 절이 곧 미이관 상태의 박제다. 검출 방향 3 · 음성 대조 2.

- **Dir-1 (민감도, I1)** — `_` 등록을 제거한다 → `rc≠0`.
- **Dir-2 (민감도, I2)** — `__` 등록을 제거한다 → `rc≠0`.
- **Dir-3 (민감도, I3)** — intraword 억제를 끈다 (영숫자 인접 검사 제거) → `rc≠0`. **Dir-1·2 와 분리해야 "동작은 하지만 식별자를 깨뜨리는" 구현이 통과하지 않는다.**
- **Ctrl-1 (특이도)** — 별표 강조 축(`*`)의 정상 변경 (예: 기존 테스트 문구 재서술) → `rc=0`.
- **Ctrl-2 (특이도)** — 본 spec 이 범위 밖으로 선언한 축 (코드 강조기 · 표 · 목록) 의 정상 변경 → `rc=0`.

### 미측정·비판정 항목

- **`___둘다___` (3중 구분자) 는 요구하지 않는다.** 현 산출은 `<p>___둘다___</p>` 이며 중첩 강조 조합(`<em><strong>`)은 별 축이라 기대값을 확정하지 않았다. 구현이 이 입력의 동작을 **바꾸지 않는 것**이 기본이다.
- **실제 게시글에서 밑줄 표기의 빈도는 세지 않았다.** 저장소에 글 코퍼스가 없다. 근거는 빈도가 아니라 **표기가 표준이고 결과가 틀리다는 것**이다.
- **저장 원문은 바뀌지 않는다** (REQ-051 NFR-02). 수리는 읽을 때 적용되므로 이미 게시된 글에도 파서 변경만으로 반영된다 — `markdownParser.ts:414` 가 같은 원칙을 박제한다. 이 항목은 구현 방식에 대한 제약이지 판정 가능한 명제가 아니라 체크박스로 두지 않는다.
- **원 req**: `specs/60.done/2026/08/31/req/20260831-underscore-emphasis-delimiter-parity.md`.
- **외부 근거**: CommonMark 0.31.2 §6.2 *Emphasis and strong emphasis* — left/right-flanking delimiter run 규칙과 `_` 에만 적용되는 intraword 제한 (`foo_bar_baz` 가 규격의 예시 그대로다).
