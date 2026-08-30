# 파이프 표는 표로 렌더된다 — 파이프가 문단으로 새지 않는다

> **위치**: `src/common/markdownParser.ts` — 블록 패스 `pre`(`:102`) · `hr`(`:148`) · `blockquote`(`:169`) · `ul`(`:215`) · `ol`(`:242`) · `headers`(`:288`), 이스케이프·코드 스팬 추출 (`:383`), 패스 순서 근거 주석 (`:370-379`). `src/common/sanitizeHtml.ts` — `ALLOWED_TAGS`(`:7-15`) · `ALLOWED_ATTR`(`:17`). `src/styles/typography.css` — 블록 요소 규칙. 게이트: `src/common/markdownParser.test.ts` · `src/common/sanitizeHtml.test.ts`.
> **관련 요구사항**: REQ-20260831-052 FR-01~FR-06 · NFR-01~NFR-04
> **최종 업데이트**: 2026-08-31 (by inspector — REQ-20260831-052 흡수, HEAD=`b1cbf5c`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`b1cbf5c`).

> **측정 HEAD 주석**: 본 흡수 tick 중 외부 writer 가 `68ff19b`·`baa97c9` 를 커밋해 HEAD 가 `b1cbf5c` → `d4556b0` 로 이동했다. 두 커밋은 `index.html` · `src/Log/LogSingle.{tsx,test.tsx}` · 신규 `src/__tests__/link-preview-coherence.test.ts` 만 건드렸고, `git diff --name-only b1cbf5c..d4556b0 -- src/common/markdownParser.ts src/common/markdownParser.test.ts src/common/sanitizeHtml.ts src/common/sanitizeHtml.test.ts src/styles/` 는 **공집합**이다. 따라서 아래 rc 는 그대로 유효하며, 짝 spec `sanitizeHtml.md` 는 HEAD=`d4556b0` 에서 전수 재실행했다. 다른 writer 의 변경은 읽기만 했다 (`RULE-02 §교차 작업 파괴`).

## 역할

머리 행과 구분선 행으로 쓴 파이프 표는 **표 구조로 렌더된다** (GFM §4.10 *Tables (extension)*). 표기로 쓴 파이프와 구분선은 독자에게 보이지 않는다.

**방어 대상 (사용자 관측 표면)**: 표 하나가 **줄 수만큼의 문단**으로 쪼개져 파이프 문자와 구분선(`|---|---|`)까지 그대로 독자에게 보이는 상태. 표는 기술 글에서 가장 흔한 블록 구조 중 하나이며, 이 저장소의 spec·req 문서 자체가 표로 쓰여 있다.

**이 축은 한 모듈로 닫히지 않는다.** 파서가 표를 emit 해도 `sanitizeHtml` 의 `ALLOWED_TAGS` 에 표 태그가 하나도 없으면 DOM 주입 직전 정제에서 구조가 통째로 사라진다 — 실측상 머리 셀의 글자마저 남지 않는다 (§스코프 규칙 baseline). 즉 파서만 고치면 결과는 지금과 **다른 방식으로 여전히 틀리다**. 스타일 채널도 마찬가지다: 태그가 통과해도 규칙이 없으면 테두리 없는 맨 텍스트로 보여 §역할 첫 문단의 문제가 형태만 바꿔 남는다.

**이 계약의 또 다른 절반은 표가 아닌 것을 표로 만들지 않는 것이다.** 파이프는 산문에도 흔하다 (셸 파이프라인, 논리합, 표기 구분). GFM 이 표를 **머리 행 + 구분선 행**의 쌍으로 규정하는 이유가 이것이며, 구분선 행을 요구하지 않는 구현은 파이프가 든 모든 문단을 표로 만든다.

의도적으로 하지 않는 것: 셀 안의 블록 요소 (목록·코드 블록·여러 문단 — GFM 도 셀 내용을 인라인으로 한정한다), 표의 시각 디자인 확정 (테두리 두께·색·여백 — 계약은 **구조가 표로 남는가** 이며 스타일 값은 수단이다. 다만 (I7) 이 채널의 **존재**는 요구한다), 열 병합(`colspan`)·중첩 표·캡션, 다른 마크다운 축 (강조 구분자 · 목록 이어짐 · 제목 닫는 시퀀스 — 각각 별 spec).

## 공개 인터페이스
- 변경 없음. 계약면은 **산출 HTML** 과 그 산출이 sanitize 를 통과한 뒤의 DOM 이다.

## 동작

1. **(I1) 머리 행 + 구분선 행이면 표다**: 머리 행 다음 줄이 구분선 행(`---` 계열을 파이프로 구분한 행)이면 그 덩어리는 표로 렌더된다. 머리 행은 머리 셀로, 이후 행은 본문 셀로 구분된다.
2. **(I2) 산출은 sanitize 를 통과해 화면에 닿는다**: `sanitizeHtml` 정책 상수에 표 태그가 등재된다. 파서만 고치고 끝내지 않는다 — 통과하지 못하는 표는 렌더된 것이 아니다.
3. **(I3) 구분선 행이 없으면 표가 아니다**: 파이프가 든 산문 문단은 그대로 문단으로 남는다. `명령은 a | b 이다` 는 `<p>명령은 a | b 이다</p>` 다.
4. **(I4) 이스케이프된 파이프는 셀 구분자가 아니다**: 셀 안의 `\|` 는 파이프 글자이며 셀을 가르지 않는다. **표 패스가 직접 처리해야 한다** — 백슬래시 이스케이프 패스는 `:383` 에서 돌고 블록 패스는 그보다 앞(`:102`~`:315`)이므로, 표 패스는 자리표시자가 아니라 날것의 `\|` 를 본다.
5. **(I5) 정렬 표기도 구분선 행이다**: `:--` · `--:` · `:-:` 를 쓴 구분선 행도 표로 인식된다. 정렬의 **시각 반영**은 Should 이며, 반영하더라도 `ALLOWED_ATTR` 확장 없이 기존 허용 속성(`class`) 안에서 한다.
6. **(I6) 셀 안의 인라인 마크업은 동작한다**: 강조·코드 스팬·링크가 셀 안에서 종전대로 동작한다.
7. **(I7) 스타일 채널이 존재한다**: `src/styles/` 에 표 요소 규칙이 1건 이상 있다. `blockquote`(`typography.css:44`) · `pre`(`:65`) 처럼 블록 요소마다 규칙을 두는 이 저장소의 관례와 같다.
8. **(I8) 정책은 단일 출처를 지킨다 (범위 제한)**: 표 태그 등재는 `src/common/sanitizeHtml.ts` **안에서만** 이뤄진다. `blue/common/sanitizeHtml.md` (I1) 단일 모듈 정책을 깨지 않으며, 파서 쪽이나 호출처에서 표 태그를 따로 허용하는 형태는 정책 분기다. 속성 표면도 넓히지 않는다 — `style` 속성 허용은 (I3) 계열 정책 확장이라 별 축이다.

### 회귀 중점
- **(I1) 만 만족시키고 (I2) 를 빠뜨리는 구현**이 이 축의 대표 실패다 — 파싱은 되는데 화면에 닿지 않는다. 두 축을 분리해 재지 않으면 "표를 emit 하지만 sanitize 가 지우는" 상태가 통과한다. 그 상태는 지금보다 나쁠 수 있다: 현재는 최소한 셀 글자가 문단으로라도 보이지만, 그때는 머리 셀 글자마저 사라진다 (§스코프 규칙 baseline 실측).
- **(I3) 를 빠뜨리면 파이프가 든 모든 문단이 표가 된다.** 산문 속 파이프는 흔하므로 피해 범위가 표 표기를 쓴 글보다 넓다.
- 표 패스를 이스케이프 패스 **뒤**로 옮겨 (I4) 를 해결하려는 방향은 범위 밖이다. 코드 스팬·이스케이프의 현 계약이 그 순서에 기대고 있으며 `markdownParser.ts:370-379` 가 그 근거를 박제한다. 표 패스가 `\|` 를 스스로 처리하는 쪽을 택한다.
- `ALLOWED_TAGS` 에 표 태그를 넣으면서 회귀 fixture 를 갱신하지 않으면 `sanitizeHtml.md` (I6) "정책 변경 단일 진입점" 위반이다.
- (I7) 을 만족시키려고 인라인 `style` 속성을 쓰면 (I8) 위반 — 속성 표면 확장이다.

## 의존성
- 내부: `src/common/markdownParser.ts` (표 블록 패스), `src/common/sanitizeHtml.ts` (허용 태그), `src/styles/` (표 규칙), `src/common/markdownParser.test.ts` · `src/common/sanitizeHtml.test.ts` (게이트).
- 외부: `dompurify` (sanitize 구현 — 버전 정합은 `dependency-bump-gate.md` 영역).
- 역의존 (사용처): `markdownToHtml` 산출을 소비하는 모든 화면 (Log · Comment 본문 렌더).
- 직교: `specs/30.spec/green/common/sanitizeHtml.md` — 그 spec 의 **(I12)** 가 본 축의 (I2) 를 정책 쪽에서 받으며, (I1) 단일 모듈 정책과 (I6) 정책 변경 단일 진입점이 본 축의 (I2)(I8) 을 규율한다. 본 spec 은 **무엇이 허용돼야 하는가** 를 요구하고, 그 spec 은 **어디서 어떻게 바꾸는가** 를 규율한다. `specs/30.spec/green/common/markdownParser.md` (`bindListItem` + 속성 escape 축 — 본 축과 무관).

## 테스트 현황
- [ ] (I1·I5·I6) 표 렌더 계약이 게이트로 실재하고 초록이다: `bash -c 'grep -qF "파이프 표" src/common/markdownParser.test.ts && npx vitest run src/common/markdownParser.test.ts -t "파이프 표" >/dev/null 2>&1'` → HEAD=`b1cbf5c` 실측 **rc=1 (미충족)**. `grep -cF "파이프 표" src/common/markdownParser.test.ts` → **0**.
- [ ] (I3·I4) 대조 게이트가 실재하고 초록이다 — 구분선 없는 산문 파이프와 이스케이프된 파이프: `bash -c 'grep -qF "구분선 행이 없으면 표가 아니다" src/common/markdownParser.test.ts && npx vitest run src/common/markdownParser.test.ts -t "구분선 행이 없으면 표가 아니다" >/dev/null 2>&1'` → HEAD=`b1cbf5c` 실측 **rc=1 (미충족)**. **이 대조가 없으면 파이프가 든 모든 문단을 표로 만드는 구현도 (I1) 을 통과한다.**
- [ ] (I2 정적 zero-point) sanitize 허용 태그에 표 태그가 등재돼 있다: `bash -c 'f=src/common/sanitizeHtml.ts; grep -q "ALLOWED_TAGS" "$f" || exit 2; n=$(grep -oE "'\''(table|thead|tbody|tr|th|td)'\''" "$f" | wc -l | tr -d " "); echo "table-tag-entries=$n"; [ "$n" -ge 6 ]'` → HEAD=`b1cbf5c` 실측 **rc=1**, 출력 `table-tag-entries=0`. 파일에 `ALLOWED_TAGS` 가 없으면 `exit 2` 로 무판정 처리한다 (공허 통과 차단).
- [ ] (I7) 표 스타일 규칙이 실재한다: `bash -c 'n=$(grep -rhcE "^[[:space:]]*(table|thead|tbody|th|td)[[:space:],{]" src/styles/ | awk "{s+=\$0} END {print s+0}"); echo "table-style-rules=$n"; [ "$n" -ge 1 ]'` → HEAD=`b1cbf5c` 실측 **rc=1**, 출력 `table-style-rules=0`.
- [x] (I8 정책 단일 출처 현행 PASS) `bash -c 'test "$(grep -rlE "ALLOWED_TAGS" src | grep -vcE "^src/common/sanitizeHtml\.(ts|test\.ts)$")" -eq 0'` → HEAD=`b1cbf5c` 실측 rc=0. 구현 후에도 rc=0 이어야 한다.
- [x] (비퇴행 baseline) 두 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts src/common/sanitizeHtml.test.ts >/dev/null 2>&1'` → HEAD=`b1cbf5c` 실측 rc=0. 구현 후에도 rc=0 이어야 한다.

## 수용 기준
- [ ] (Must, FR-01·FR-05·FR-06) 위 §테스트 현황 (I1·I5·I6) 명령 → rc=0.
- [ ] (Must, FR-03·FR-04) 위 §테스트 현황 (I3·I4) 명령 → rc=0.
- [ ] (Must, FR-02) 위 §테스트 현황 (I2) 명령 → rc=0 (`table-tag-entries` ≥ 6).
- [ ] (Should, NFR-03) 위 §테스트 현황 (I7) 명령 → rc=0 (`table-style-rules` ≥ 1).
- [x] (Must, NFR-01 정책 단일 출처) 위 §테스트 현황 (I8) 명령 → rc=0. HEAD=`b1cbf5c` 실측 rc=0.
- [x] (Must, NFR-04 비퇴행) 위 §테스트 현황 비퇴행 명령 → rc=0. HEAD=`b1cbf5c` 실측 rc=0 — **기존 게이트를 완화하는 방식의 해결은 불가**하다.
- [x] (Must, NFR-02 속성 표면 무확장) 허용 속성이 7 항목으로 유지된다: `bash -c 'test "$(grep -oE "'\''(href|src|alt|title|target|rel|class)'\''" src/common/sanitizeHtml.ts | wc -l | tr -d " ")" -ge 7 && ! grep -qE "ALLOWED_ATTR[^]]*'\''style'\''" src/common/sanitizeHtml.ts'` → HEAD=`b1cbf5c` 실측 rc=0. 정렬을 표현하더라도 `class` 안에서 한다.
- [x] (Must, 범위 제한) 셀 안 블록 요소 · `colspan` · 중첩 표 · 캡션 · 테두리 디자인 값은 본 계약의 요구 대상이 아니다 — §역할 · §참고 §미측정.

## 스코프 규칙
- **expansion**: 불허 — 대상은 `src/common/markdownParser.ts` · `src/common/sanitizeHtml.ts` · `src/styles/` · 두 테스트 파일이다. 세 모듈 모두 본 축이 동시에 요구하는 대상이므로 baseline 도 셋 다 박제한다. 게이트 위반이 이 밖에서 나오면 격리 대상이다.
- **grep-baseline** (HEAD=`b1cbf5c`, 2026-08-31 실측):
  - 블록 패스 열거: `grep -nE "^[[:space:]]*(const|let)? ?parsed = " src/common/markdownParser.ts` 계열로 확인한 현 블록 패스는 `pre`(`:102`) · `hr`(`:148`) · `blockquote`(`:169`) · `ul`(`:215`) · `ol`(`:242`) · `headers`(`:288`) **여섯**이며 표 패스는 **0건**이다.
  - `grep -cF "파이프 표" src/common/markdownParser.test.ts` → **0**. `grep -cF "구분선 행이 없으면 표가 아니다" …` → **0**. 두 계약 이름 모두 미존재 — 신설 대상이다.
  - `grep -oE "'\''(table|thead|tbody|tr|th|td)'\''" src/common/sanitizeHtml.ts | wc -l` → **0**. `ALLOWED_TAGS`(`:7-15`) 는 **21 항목**이며 표 태그는 하나도 없다: `p` `br` `hr` `strong` `em` `del` `code` `pre` `blockquote` `h1` `h2` `h3` `h4` `h5` `h6` `ul` `ol` `li` `a` `img` `span`.
  - `grep -rhcE "^[[:space:]]*(table|thead|tbody|th|td)[[:space:],{]" src/styles/` 합 → **0**. 대조로 같은 형태의 기존 블록 규칙은 `typography.css:44`(`blockquote`) · `:65`(`pre`) · `:78`(`pre code`) 다. 제외 규칙: 줄 머리 선택자만 계수하며 결합자·중첩 표기는 세지 않는다.
  - `grep -rlE "ALLOWED_TAGS" src | grep -vE "^src/common/sanitizeHtml\.(ts|test\.ts)$"` → **0 hit**. 정책 단일 출처 현행 PASS.
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
| 2026-08-31 | inspector (Phase 3, REQ-20260831-052 흡수) / pending @ HEAD=`b1cbf5c` | 최초 박제 — 파이프 표 렌더 8 축 (I1~I8). 신규 spec 으로 세운 근거: `markdownParser.md` §역할 이 "다른 단계 알고리즘 박제 (필요 시 별 spec)" 를 범위 밖으로 선언하며 표 축 언급이 0건이고, 본 축은 파서·sanitize·styles **세 모듈의 공동 계약**이라 어느 한 모듈 spec 에도 온전히 들어가지 않는다. 같은 tick 에 `sanitizeHtml.md` 를 blue→green 으로 내려 (I12) 표 태그 축과 `ALLOWED_TAGS` 항목 수 drift(18→21)를 함께 정정했다. baseline: 블록 패스 6개 중 표 0 / 계약 이름 2건 0 hit / 표 태그 등재 0 / 표 스타일 규칙 0 / 정책 단일 출처 PASS / 현 산출 4행 + sanitize 통과 실측(`"1"`) 격리 사본 측정. unchecked 4 · checked 4. | all |

## 참고

### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. 이관처 task 가 발행되지 않으면 이 절이 곧 미이관 상태의 박제다. 검출 방향 3 · 음성 대조 2.

- **Dir-1 (민감도, I1)** — 표 블록 패스를 제거한다 → `rc≠0`.
- **Dir-2 (민감도, I2)** — `ALLOWED_TAGS` 에서 표 태그를 뺀다 (파서는 그대로) → `rc≠0`. **Dir-1 과 분리해야 "파싱은 되는데 화면에 닿지 않는" 상태가 통과하지 않는다.**
- **Dir-3 (민감도, I3)** — 구분선 행 요구를 없앤다 (파이프만 보면 표) → `rc≠0`.
- **Ctrl-1 (특이도)** — 산문 속 파이프 문장의 문구를 바꾼다 → `rc=0`.
- **Ctrl-2 (특이도)** — 본 spec 이 범위 밖으로 선언한 축 (셀 안 블록 요소 · `colspan` · 표 테두리 색) 의 정상 변경 → `rc=0`.

### 미측정·비판정 항목

- **정렬의 시각 반영 방식(`class` vs 그 밖)은 지정하지 않는다.** (I8) 이 `style` 속성 확장만 배제하며, 그 안에서의 수단은 구현 재량이다.
- **표 테두리·여백의 구체 값은 계약이 아니다.** (I7) 이 요구하는 것은 규칙의 **존재**이며, 어떤 값이어야 하는지는 정하지 않는다.
- **게시된 글에서 표 표기의 빈도는 세지 않았다.** 저장소에 글 코퍼스가 없다. 근거는 빈도가 아니라 **표기가 표준이고 산출이 구조를 잃는다**는 것이다.
- **패스 순서를 뒤집는 방향은 범위 밖이다** (REQ-052 (C-1)). 블록 패스는 `:102`~`:315`, 백슬래시 이스케이프·코드 스팬 추출은 `:383` 이며, 코드 스팬·이스케이프의 현 계약이 이 순서에 기대고 있다 (`markdownParser.ts:370-379`).
- **원 req**: `specs/60.done/2026/08/31/req/20260831-pipe-table-rendering.md`.
- **외부 근거**: GitHub Flavored Markdown Spec §4.10 *Tables (extension)* — 머리 행 + 구분선 행(delimiter row) 쌍, 셀 안 `\|` 이스케이프, 정렬 표기 `:--`/`--:`/`:-:`.
