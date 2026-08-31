# 본문 이미지는 두 번째부터 지연 로드한다 — 첫 이미지는 LCP 후보라 지연하지 않는다

> **위치**: `src/common/markdownParser.ts` — `IMAGE_PATTERN` (`:586`) · `<img>` 산출 (`:592`), `src/common/sanitizeHtml.ts` — `ALLOWED_ATTR` (`:17`). 렌더 경로: `src/Log/LogItem.tsx:94` (`sanitizeHtml(parser.markdownToHtml(...))`) → `:131-132` (`dangerouslySetInnerHTML`). 게이트: `src/common/markdownParser.test.ts` + `src/__tests__/parser-sanitizer-coherence.test.ts` (**신설이 아니라 승계** — §동작 (I4)).
> **관련 요구사항**: REQ-20260831-062 FR-01~FR-06 · NFR-01~NFR-04 (출처: 운영자 결함 신고 `20260831-1330`)
> **최종 업데이트**: 2026-08-31 (by inspector — REQ-20260831-062 흡수, HEAD=`ed64fb3`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`ed64fb3`).

## 역할

글 본문의 이미지는 화면에 보이든 말든 전부 즉시 내려받힌다. 긴 글 아래쪽 이미지가 첫 화면 렌더와 대역폭을 다투고, 느린 회선에서 그 대가를 글 첫머리가 치른다. 본 계약은 본문 이미지에 **지연 로드 정책**을 세운다.

**이 축은 파서 한쪽만 고치면 화면에 아무 변화가 없다.** 파서가 `loading` 을 내보내도 `sanitizeHtml` 의 `ALLOWED_ATTR` 7항목이 그것을 지운다 (실측: `<img … loading="lazy">` → `<img src="…" alt="d">`). 계약면이 **파서 산출과 정제 정책 두 표면에 걸쳐 있다**는 것이 이 축의 성질이다.

**일괄 지연은 틀린 방향이다.** 모든 본문 이미지에 지연을 걸면 글 첫머리 이미지가 LCP 후보일 때 그것을 늦춘다 — web.dev 가 명시적으로 경고하는 부류다(*"Don't lazy-load images that are likely to be in-viewport when the page loads, especially LCP images"*). **그리고 이 앱은 자기 LCP 를 스스로 보고한다** (`src/reportWebVitals.ts:21` `onLCP`). 방향을 잘못 잡으면 그 지표에 그대로 나타난다. 그래서 본 계약은 "전부 지연" 이 아니라 **"문서의 첫 이미지만 남기고 나머지를 지연"** 으로 세운다.

**이 계약은 레이아웃 밀림(CLS)을 고치지 않는다.** 자리 예약은 치수를 아는 주체가 있어야 하는데 이 저장소에는 없다 (§참고 §자리 예약 축). 지연 로드는 오히려 레이아웃 재계산을 스크롤 시점으로 미뤄 **치수 부재의 영향을 키운다**. 본 계약을 CLS 개선으로 서술하면 거짓이 되므로, 그 사실을 문면에 남긴다.

의도적으로 하지 않는 것: **자리 예약 축**(`width`·`height` 속성 · `aspect-ratio` — 선행 조건이 이 저장소 밖에 있다, §참고), `src/common/Footer.tsx:23`·`:56` 의 `loading="lazy"` 2건 (그 축의 **대조**이므로 건드리면 대조가 사라진다), `ALLOWED_TAGS` 확장, 이미지 CDN·썸네일 파이프라인, 저장 원문 변경, `alt` 산출 (`:592` 현행 그대로).

## 공개 인터페이스
- 변경 없음. `markdownToHtml(rawInput: string): string` · `sanitizeHtml(html: string): string`. 계약면은 **정제를 지난 DOM** 이다 — 파서 산출 단독이 아니다 (I4).

## 동작

1. **(I1) 문서의 두 번째 이미지부터 지연 로드 속성을 갖는다**: `markdownToHtml` 이 내는 `<img>` 중 **문서 순서상 두 번째 이후**는 `loading="lazy"` 를 갖는다. 판정 단위는 `markdownToHtml` 호출 1회가 받는 원문 전체이며, 글 하나가 그 단위다.

2. **(I2) 문서의 첫 이미지는 지연하지 않는다**: 첫 `<img>` 에는 `loading="lazy"` 가 붙지 않는다. **단독 관측**: 이미지가 둘인 원문에서 첫 산출에는 속성이 없고 둘째에는 있다 — 한쪽만 재면 "전부 지연" 구현과 "전부 즉시" 구현이 각각 통과한다.

   > **왜 첫 이미지인가.** 이 저장소에는 뷰포트를 아는 채널이 없다 (서버 렌더 없음 · 치수 없음 · 위치 계산 없음). 문서 순서 첫 이미지는 **얻을 수 있는 유일한 LCP 후보 근사**다. 근사라는 사실을 §참고 §미측정 에 남긴다 — 더 나은 채널이 생기면 이 자리가 바뀔 자리다.

3. **(I3) 정제 정책이 그 속성을 통과시킨다**: `ALLOWED_ATTR` 이 `loading` 을 포함한다. 파서만 고치면 화면은 그대로이므로 **이 축 없이는 (I1)(I2) 가 사용자에게 도달하지 않는다.**

4. **(I4) 두 표면의 동시성은 기존 게이트가 강제한다 — 새 정합 게이트를 만들지 않는다**: `src/__tests__/parser-sanitizer-coherence.test.ts` 가 "파서가 낸 속성이 sanitize 를 지나 살아남는가" 를 재고 corpus 에 이미지 행(`['이미지', '![그림](https://example.com/a.png "제목")']`)이 이미 있다. 파서만 고친 트리에서 그 게이트가 **실제로 붉어지는 것을 실측했다** (`AssertionError: sanitizer 가 지운 속성: expected [ 'loading' ] to deeply equal []`). 정합 게이트를 새로 세우는 구현은 **사본을 늘리는 것**이며 이 계약이 요구하지 않는다.

5. **(I5) 허용 속성 확장은 열거형에 한정된다**: `ALLOWED_ATTR` 에 더해지는 것은 값 집합이 정해진 열거형 속성이며, 이벤트 핸들러(`on*`)나 URL 을 싣는 속성이 아니다. `loading` 은 `lazy`·`eager` 두 값만 갖는 열거형이다. 이 축은 정책 확장이 **보안 표면을 넓히지 않는다**는 명제다.

6. **(I6) 본문 이미지의 반응형 CSS 는 유지된다**: `img { max-width: 100%; height: auto; }` 가 `src/styles/reset.css:36-37` · `src/Log/Log.css:179-180` · `src/Log/Writer.css:213-214` 세 자리에 있다. **방어 대상**: 이 조합은 `width`/`height` 속성이 도착하는 순간 브라우저가 종횡비로 상자를 미리 잡게 하는 표준 짝이다. 지금 지우면 아무 게이트도 붉어지지 않고, 자리 예약 축이 착수될 때 **원인이 CSS 에 있다는 것을 아무도 모른 채** 다시 설계하게 된다 (§참고 §자리 예약 축).

7. **(I7) 나머지 산출은 바뀌지 않는다**: `<img>` 의 `src`·`alt`·`title` 산출과 이미지가 아닌 요소의 산출이 `ed64fb3` 그대로다. `ALLOWED_ATTR` 은 `loading` 하나만 늘고 `ALLOWED_TAGS` 는 불변이다.

### 회귀 중점
- **일괄 지연이 이 축의 대표 실패다.** (I1) 만 재면 통과하고 LCP 는 나빠지며, 그 악화는 이 앱이 스스로 보고하는 지표에 나타난다. (I2) 가 유일한 관측 채널이다.
- **파서만 고치는 방향은 (I3) 을 빠뜨린다.** 화면에는 아무 변화가 없고 파서 스위트는 초록이다 — 붉어지는 것은 `parser-sanitizer-coherence` 뿐이다 (I4).
- **정제만 고치는 방향은 아무것도 하지 않는다.** 허용 목록을 넓혀도 파서가 그 속성을 내지 않으면 DOM 에 나타나지 않으며, 어떤 게이트도 붉어지지 않는다.
- **새 정합 게이트를 세우는 방향은 (I4) 를 깬다.** 사본 둘은 갈라진다. 기존 게이트가 이미 이 일을 하고 있다.
- **`ALLOWED_ATTR` 에 `width`·`height` 를 함께 더하는 방향은 범위를 넘는다.** 그 둘은 자리 예약 축에 귀속되며, 치수 공급 채널 없이 허용만 넓히면 **아무도 쓰지 않는 정책 확장**이 남는다.
- **CSS 를 건드리는 방향은 (I6) 을 깬다.** 본 축은 CSS 를 바꿀 이유가 없다.

## 의존성
- 내부: `src/common/markdownParser.ts` · `src/common/sanitizeHtml.ts` (대상 2 파일), `src/common/markdownParser.test.ts` · `src/__tests__/parser-sanitizer-coherence.test.ts` (게이트 2 파일).
- **교차 게이트 (비퇴행 모집단)**: `markdownToHtml` 을 소비하는 `src/__tests__/**`. 모집단은 `bash -c 'grep -rl "markdownToHtml" src/__tests__/'` 로 **도출**한다 (`RULE-06 §열거 고정 금지`) — HEAD=`ed64fb3` 실측 **8 파일 / 106 tests**.
- 외부: 브라우저의 `loading` 속성 지원 (열거형 · 미지원 브라우저는 무시하고 즉시 로드 — 안전 실패).
- 역의존 (사용처): `src/Log/LogItem.tsx:94`·`:131-132` (본문 렌더), Comment 본문, 검색 미리보기.
- 직교: `specs/30.spec/green/common/sanitizeHtml.md` — **`ALLOWED_ATTR` 정책의 소유처**다. 본 계약은 그 목록을 7 → 8 로 넓히므로 **그 spec 의 속성 개수 게이트와 함께 움직인다** (§참고 §인접 계약 영향). `specs/30.spec/blue/common/markdownParser.md` (`IMAGE_PATTERN` 알고리즘), `specs/30.spec/blue/components/image.md` (업로드·선택 화면 — 치수 채널 부재의 근거), `specs/30.spec/blue/foundation/web-vitals-api-surface-coherence.md` (`onLCP` 보고 표면).

## 테스트 현황

> 각 명령은 HEAD=`ed64fb3` 에서 **파일에서 추출해** 격리 사본(`git archive HEAD` + `node_modules` 심볼릭 링크)에서 실제 실행했고 rc 를 박제한다 (손 전사 0 — `RULE-06 §추출 실패 검출`). 워킹트리에 다른 writer 의 미커밋 변경이 있을 수 있으므로 이 축의 측정은 언제나 격리 사본에서 한다 (`RULE-02 §교차 작업 파괴`).

- [ ] (I1·I2 정책 채널) 지연 정책이 게이트로 실재하고 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF -e "본문 이미지는 두 번째부터 지연 로드한다" "$f" && grep -qF -e "첫 이미지에는 지연 속성이 붙지 않는다" "$f" && grep -qF -e "둘째 이미지부터 지연 속성이 붙는다" "$f" && npx vitest run "$f" -t "본문 이미지는 두 번째부터 지연 로드한다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`ed64fb3` 실측 **rc=1 (미충족)**. 계약 이름·단언 이름 3건 전수 0 hit. **두 방향을 한 명령에 묶은 이유**: 한쪽만 재면 "전부 지연" 과 "전부 즉시" 가 각각 통과한다.
- [ ] (I3 정제 통과) `ALLOWED_ATTR` 이 `loading` 을 포함하고 8항목이다: `bash -c 'f=src/common/sanitizeHtml.ts; test -f "$f" || exit 2; a=$(perl -0777 -ne "print \$1 if /const ALLOWED_ATTR\s*=\s*\[(.*?)\]/s" "$f"); test -n "$a" || exit 2; echo "$a" | grep -qF -e "loading" && test "$(echo "$a" | grep -oE "'\''[a-z]+'\''" | wc -l | tr -d " ")" -eq 8'` → HEAD=`ed64fb3` 실측 **rc=1** (현 7항목 · `loading` 0 hit). **`perl` 추출이 빈 문자열이면 `exit 2`** 로 무판정 실패한다 — 빈 추출이 `grep` 통과로 읽히는 경로를 막는다 (`RULE-06 §추출 실패 검출`).
- [x] (I7 정책 표면 무확장) `ALLOWED_TAGS` 는 21항목 그대로다: `bash -c 'f=src/common/sanitizeHtml.ts; t=$(perl -0777 -ne "print \$1 if /const ALLOWED_TAGS\s*=\s*\[(.*?)\]/s" "$f"); test -n "$t" || exit 2; test "$(echo "$t" | grep -oE "'\''[a-z0-9]+'\''" | wc -l | tr -d " ")" -eq 21'` → HEAD=`ed64fb3` 실측 rc=0. **(I3) 과 한 쌍으로 읽는다**: 속성만 늘고 태그는 늘지 않는 것이 계약이다. 구현 후에도 rc=0 이어야 한다.
- [ ] (I1·I2·I3·I4 접속) 정책·정제·정합이 **동시에** 성립한다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF -e "본문 이미지는 두 번째부터 지연 로드한다" "$f" && grep -qF -e "첫 이미지에는 지연 속성이 붙지 않는다" "$f" && perl -0777 -ne "print \$1 if /const ALLOWED_ATTR\s*=\s*\[(.*?)\]/s" src/common/sanitizeHtml.ts | grep -qF -e "loading" && npx vitest run "$f" src/__tests__/parser-sanitizer-coherence.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`ed64fb3` 실측 **rc=1 (grep 단계에서 탈락)**. **접속으로 닫는 이유**: `-t` 는 이름 미매치 시 단독으로 rc=0 을 내고, 두 스위트 단독 실행은 게이트가 없는 현 상태에서도 rc=0 이다. 둘 다 공허 통과 경로다.
- [x] (I4 정합 승계 — 채널 실재) 두 표면 동시성을 재는 게이트가 이미 있고 초록이다: `bash -c 'f=src/__tests__/parser-sanitizer-coherence.test.ts; test -f "$f" || exit 2; grep -qF -e "sanitizer 가 지운 속성" "$f" && grep -qF -e "![그림](https://example.com/a.png \"제목\")" "$f" && npx vitest run "$f" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`ed64fb3` 실측 rc=0 (15 tests). **구현 후에도 rc=0 이어야 한다** — 이 게이트가 붉은 채로 남으면 두 표면이 어긋난 것이다.
- [x] (I5 보안 표면) 허용 속성에 이벤트 핸들러가 없다: `bash -c 'a=$(perl -0777 -ne "print \$1 if /const ALLOWED_ATTR\s*=\s*\[(.*?)\]/s" src/common/sanitizeHtml.ts); test -n "$a" || exit 2; test "$(echo "$a" | grep -cE "'\''on[a-z]+'\''")" -eq 0'` → HEAD=`ed64fb3` 실측 rc=0 (0건). 구현 후에도 rc=0 이어야 한다.
- [x] (I6 반응형 CSS 보존) 세 자리의 `max-width`·`height:auto` 짝이 있다: `bash -c 'test "$(grep -rcE "max-width: 100%" src/styles/reset.css src/Log/Log.css src/Log/Writer.css | grep -cvE ":0$")" -eq 3 && test "$(grep -rhcE "height: auto" src/styles/reset.css src/Log/Log.css src/Log/Writer.css | awk "{s+=\$0} END {print s+0}")" -ge 3'` → HEAD=`ed64fb3` 실측 rc=0. **자리 예약 축의 절반이 이미 서 있다는 사실을 잠근다** — 지금 지우면 아무 게이트도 붉어지지 않는다.
- [x] (NFR-02 비퇴행 baseline) 파서 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`ed64fb3` 실측 rc=0 (**122 tests**).
- [x] (NFR-02 교차 비퇴행 baseline) `markdownToHtml` 소비 게이트 전수가 초록이다 — **모집단은 도출한다**: `bash -c 'set -- $(grep -rl "markdownToHtml" src/__tests__/ | sort); test "$#" -ge 8 || exit 2; echo "cross-gate-files=$#"; npx vitest run "$@" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`ed64fb3` 실측 rc=0, 출력 `cross-gate-files=8` (106 tests). **도출이 8 미만이면 `exit 2` 로 무판정 실패**한다.

## 수용 기준
- [ ] (Must, FR-01·FR-02·FR-06) 위 §테스트 현황 (I1·I2 정책 채널) 명령 → rc=0.
- [ ] (Must, FR-03) 위 §테스트 현황 (I3 정제 통과) 명령 → rc=0.
- [x] (Must, NFR-03 범위) 위 §테스트 현황 (I7 정책 표면 무확장) 명령 → rc=0. HEAD=`ed64fb3` 실측 rc=0.
- [ ] (Must, FR-01~FR-04 접속) 위 §테스트 현황 (I1·I2·I3·I4 접속) 명령 → rc=0.
- [x] (Must, FR-04·FR-05 승계) 위 §테스트 현황 (I4 정합 승계) 명령 → rc=0. HEAD=`ed64fb3` 실측 rc=0.
- [x] (Must, NFR-03 보안) 위 §테스트 현황 (I5 보안 표면) 명령 → rc=0. HEAD=`ed64fb3` 실측 rc=0.
- [x] (Must, 범위 제한 · 자리 예약 선행) 위 §테스트 현황 (I6 반응형 CSS 보존) 명령 → rc=0. HEAD=`ed64fb3` 실측 rc=0.
- [x] (Must, NFR-02 비퇴행) 위 §테스트 현황 (NFR-02 비퇴행) 명령 → rc=0. HEAD=`ed64fb3` 실측 rc=0 (122 tests).
- [x] (Must, NFR-02 교차 비퇴행) 위 §테스트 현황 (NFR-02 교차) 명령 → rc=0. HEAD=`ed64fb3` 실측 rc=0 (`cross-gate-files=8`).

## 스코프 규칙
- **expansion**: 불허 — 대상은 `src/common/markdownParser.ts` · `src/common/sanitizeHtml.ts` · `src/common/markdownParser.test.ts` **3 파일**이다. `src/__tests__/parser-sanitizer-coherence.test.ts` 는 **읽기·실행 대상**이며 본 축은 그것을 고치지 않는다 (고쳐야 한다면 승계가 성립하지 않는다는 뜻이므로 격리 대상이다). `src/styles/**` · `src/common/Footer.tsx` 는 **읽기 대상**이다.
- **grep-baseline** (HEAD=`ed64fb3`, 2026-08-31 흡수 시점 격리 사본 실측):
  - `grep -cF -e "loading" src/common/markdownParser.ts` → **0**. 구현 후 ≥1.
  - `ALLOWED_ATTR` 항목 수 → **7** (`['href','src','alt','title','target','rel','class']`, `sanitizeHtml.ts:17`). 구현 후 **8** 이 목표이며 더해지는 것은 `loading` 하나다. `ALLOWED_ATTR` 안 `loading` → **0** · `on*` 핸들러 → **0**.
  - `ALLOWED_TAGS` 항목 수 → **21**. 구현 후에도 **21** — (I7) 의 기준값이다.
  - 계약 이름·단언 이름 전수 0 hit: `grep -cF -e "본문 이미지는 두 번째부터 지연 로드한다" src/common/markdownParser.test.ts` → **0** · `"첫 이미지에는 지연 속성이 붙지 않는다"` → **0** · `"둘째 이미지부터 지연 속성이 붙는다"` → **0**.
  - 승계 대상 게이트는 이미 있다: `grep -cF -e "sanitizer 가 지운 속성" src/__tests__/parser-sanitizer-coherence.test.ts` → **1** (`:59`) · corpus 이미지 행 `['이미지', '![그림](https://example.com/a.png "제목")']` → **1** (`:26`). 스위트 **15 tests** rc=0.
  - 반응형 CSS: `max-width: 100%` 이 `reset.css:36` · `Log.css:179` · `Writer.css:213` (+`Writer.css:258` 별 규칙) · `height: auto` 가 `reset.css:37` · `Log.css:180` · `Writer.css:214`. (I6) 의 기준값이다.
  - **패턴 주의**: 예시 문자열이 `-` 로 시작하지 않더라도 **`grep` 패턴은 일관되게 `-e` 로 넘긴다** — 같은 tick 의 인접 spec 흡수에서 `-` 로 시작하는 패턴이 옵션으로 읽혀 `rc=2` 를 냈고 출력이 비어 **0 hit 으로 오독**됐다. 또 대화형 zsh 에서 `grep` 은 `ugrep` 으로 가로채이므로 **`bash -c` 로 감싼다**. 작은따옴표는 **`\x27` 로 쓰지 않는다.** 본 흡수가 실행으로 확인한 바로는 BSD grep 2.6.0 의 `-E` 는 `\x27` 을 **괄호식 밖에서는** 따옴표로 해석해 `[a-z]+` 계수가 실제 따옴표 패턴과 같은 **7** 을 냈다. 그러나 **괄호식 안(`[^\x27]`)에서는 해석되지 않아** 어떤 입력에도 매치하지 않는 영구 붉은 게이트가 된다 — 같은 저장소에서 실제로 발행됐다(`markdown-star-emphasis-space-flanking` §스코프 규칙). 두 자리의 거동이 다른 표기는 다음 사람이 잘못 옮긴다. 따라서 본 spec 의 명령은 전부 **`'\''` 로 실제 따옴표를 쓴다** — 저장소의 `sanitizeHtml.md` 가 이미 쓰는 형태이며, 교체 후 전 명령의 rc 가 교체 전과 같음을 재실행으로 확인했다.
  - **계수 명령은 파일 인자를 매번 적는다** — 인자를 빼면 `grep` 이 stdin 을 기다려 매달린다.
  - 현 산출·정책 실측 (격리 사본, repo 트리 무변경):
    | 측정 | 현 산출 (`ed64fb3`) | 계약 |
    |---|---|---|
    | `![도표](url "제목")` 파서 산출 | `<p><img src='url' alt='도표' title='제목' /></p>` | 첫 이미지면 그대로, 둘째부터 `loading='lazy'` 추가 |
    | 이미지 둘인 원문의 정제 후 DOM | `<img src="…1.png" alt="하나">` · `<img src="…2.png" alt="둘">` | 둘째에만 `loading="lazy"` |
    | `<img … loading="lazy">` 정제 | `<img src="…" alt="d">` — **삭제됨** | 통과 |
    | `<img … width="800" height="600">` 정제 | `<img src="…" alt="d">` — **삭제됨** | 삭제 유지 (**범위 밖**) |
    | `<img … decoding="async">` 정제 | `<img src="…" alt="d">` — **삭제됨** | 삭제 유지 (범위 밖) |
    | `<img … class="x">` 정제 | `<img src="…" alt="d" class="x">` — 통과 | 통과 유지 |
  - **승계 실측 (본 tick 주입)**: 파서 산출에만 `loading='lazy'` 를 더하고 `ALLOWED_ATTR` 은 그대로 둔 사본에서 `npx vitest run src/__tests__/parser-sanitizer-coherence.test.ts` → **rc=1**, `AssertionError: sanitizer 가 지운 속성: expected [ 'loading' ] to deeply equal []`, `Tests 1 failed | 14 passed (15)`. **한쪽만 고치는 구현은 기존 게이트에서 붉어진다** — (I4) 가 신설을 금지하는 근거다.
  - **음성 대조 충돌 없음 (착수 시점 재확인 필요)**: `parser-sanitizer-coherence` 의 음성 대조는 **태그 축**이다 (`:92` `<iframe>`·`<script>` · `:95-96` `not.toContain`). 본 축은 **속성 축**이라 교차하지 않는다 — HEAD=`ed64fb3` 확인.
- **rationale**: 이 축의 baseline 은 "무엇이 없는가" 와 "무엇이 이미 있는가" 를 반씩 싣는다. 계약 이름 3건은 없고, **정합 게이트와 반응형 CSS 는 이미 있다.** 후자를 baseline 에 넣은 이유는 구현자가 그것을 **다시 만들려는 것**이 이 축의 대표적인 낭비이자 사본 증식 경로이기 때문이다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector 251차 tick (Phase 3, REQ-20260831-062 흡수) / pending @ HEAD=`ed64fb3` | 최초 박제 — 본문 이미지 지연 로드 7 축 (I1~I7). **FR-06 을 "첫 이미지 예외" 로 확정한 것이 이 흡수의 판단**이다 — req 는 "첫 화면 안에 들어올 가능성이 큰 이미지의 취급이 판정된다" 만 요구하고 방향을 열어 두었다. 일괄 지연은 web.dev 가 경고하는 부류이고 **이 앱이 `onLCP` 로 그 악화를 스스로 보고**하므로, 뷰포트 채널이 없는 저장소에서 얻을 수 있는 유일한 근사인 **문서 순서 첫 이미지**를 예외로 세웠다. 근사라는 사실은 §참고 §미측정 에 남겼다. **(I2) 를 단독 관측 채널로 분리한 것이 두 번째 판단**이다 — (I1) 만 재면 "전부 지연" 과 "전부 즉시" 가 각각 통과하므로 이미지 둘인 원문의 비대칭이 유일한 채널이다. **(I4) 로 신설을 금지한 것이 세 번째 판단**이다: 파서만 고친 사본에서 `parser-sanitizer-coherence` 가 실제로 붉어지는 것을 실측했고(`expected [ 'loading' ] to deeply equal []`), 따라서 req FR-04 는 신설이 아니라 **승계**로 닫힌다. **(I6) 은 req 가 §참고 로만 남긴 사실을 계약 축으로 올린 것**이다 — 반응형 CSS 3자리는 자리 예약 축의 절반이 이미 서 있다는 뜻인데, 지금 지우면 **아무 게이트도 붉어지지 않고** 그 축이 착수될 때 CSS 를 다시 설계하게 된다. baseline: 계약 이름 3건 0 hit / `ALLOWED_ATTR` 7항목 · `loading` 0 · `on*` 0 / `ALLOWED_TAGS` 21 / 승계 게이트 1 hit · corpus 이미지 행 1 hit · 15 tests rc=0 / 반응형 CSS 3자리 / 정제 실측 6행 격리 사본. unchecked 3 · checked 6. | all |

## 참고

### 자리 예약 축 — 왜 분리했고 무엇이 선행 조건인가

req 의 분리 판정을 승계한다. 분리 이유는 난이도가 아니라 **이 저장소에 치수를 아는 주체가 없다**는 확정 사실이다:

- 마크다운 표기에 치수 자리가 없고 삽입 템플릿도 마찬가지다 — `src/Image/ImageSelector.tsx:246` `const imageForMarkdown = "![ALT_TEXT](" + url + ")";`
- 이미지 API 도 치수를 주지 않는다 — `src/Image/ImageSelector.tsx:17` 의 `size?: number` 는 **바이트 크기**이며 `src/Image/` 전체에 width/height 성격 필드가 0건이다.

**반대로 CSS 쪽 절반은 이미 올바르게 서 있다** — (I6) 이 그것을 잠근다. `max-width: 100%` + `height: auto` 는 `width`/`height` 속성이 있을 때 브라우저가 그 비율로 상자를 미리 잡는 표준 조합이다. 즉 자리 예약 축에 필요한 것은 CSS 설계가 아니라 **치수 공급 채널 하나**이며, 그것이 생기면 남는 일은 `ALLOWED_ATTR` 에 `width`·`height` 를 더하는 것뿐이다.

> **이 절이 있는 이유**는 자리 예약 축이 착수될 때 **CSS 를 다시 설계하려는 시도를 막기 위해서**다. (I6) 은 그 시도가 시작되기 전에 CSS 가 지워지는 것을 막는다.

### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. 이관처 task 가 발행되지 않으면 이 절이 곧 미이관 상태의 박제다. **검출 방향 4 · 음성 대조 2.**

- **Dir-1 (민감도, I1 지연 부재)** — 둘째 이후 이미지의 `loading` 을 뺀다 → `rc≠0`.
- **Dir-2 (민감도, I2 일괄 지연)** — 첫 이미지에도 `loading="lazy"` 를 붙인다 → `rc≠0`. **Dir-1 과 반대 방향이며 함께 주입하면 서로를 가린다 — 반드시 따로.** 이 방향이 LCP 를 늦추는 방향이고, 화면만 보고는 보이지 않는다.
- **Dir-3 (민감도, I3·I4 정제 누락)** — 파서만 고치고 `ALLOWED_ATTR` 은 7항목으로 둔다 → `rc≠0`. **본 흡수가 이미 실측했다** (`parser-sanitizer-coherence` rc=1). 구현 task 는 그 실측을 재현해 `result.md` 에 박제한다.
- **Dir-4 (민감도, I7 태그 확장)** — `ALLOWED_TAGS` 를 하나 늘린다 → `rc≠0`. 속성만 늘고 태그는 늘지 않는다는 선을 재는 방향이다.
- **Ctrl-1 (특이도)** — 본 spec 범위 밖인 **링크 축**(`[링크](url "제목")` 단언 가산)의 정상 변경 → `rc=0`. **가산형으로 수행한다** (기존 단언에 추가; 문자열 교체 금지).
- **Ctrl-2 (특이도)** — `src/common/Footer.tsx` 의 `loading="lazy"` 2건은 **범위 밖이자 대조**다. 그 파일을 정당하게 건드려도(예: 주석 추가) 본 게이트가 붉어지지 않아야 한다 → `rc=0`. **그 2건을 지우거나 옮기지 않는다** — 지우면 "본문만 빠져 있었다" 는 대조가 사라진다.

> **Dir-2 가 이 spec 의 값어치다.** 일괄 지연은 "요구를 충족한 구현" 처럼 보이고 (I1) 도 초록이며 CLS 도 겉보기에 나빠지지 않는다. 나빠지는 것은 LCP 이고, 그것은 이 앱이 나중에 스스로 보고한다.

### 인접 계약 영향 — `sanitizeHtml.md`

`ALLOWED_ATTR` 7 → 8 은 `specs/30.spec/green/common/sanitizeHtml.md` 가 소유한 정책 표면을 바꾼다. 본 흡수가 **참조 구현(`ALLOWED_ATTR` 8항목)을 만들어 그 spec 의 판정 명령 17건을 전수 재실행**해 어느 자리가 실제로 갈리는지 셌다: **정확히 1건**이다 — `(Must, REQ-052 NFR-02 속성 표면 무확장)` 이 rc=0 → **rc=1**. 나머지 16건은 불변이며, 특히 `(정책 항목 수)` 는 라벨이 속성 개수를 함께 적고 있었지만 **명령은 `ALLOWED_TAGS` 만 세므로 갈리지 않는다** (그 라벨 불일치는 본 tick 에 그 spec 에서 정정했다 — drift D5). 따라서 **구현 task 착수 시 `sanitizeHtml.md` 의 그 1건을 7 → 8 로 좁히는 편집이 같은 단위에 포함**되어야 한다 — 그러지 않으면 이웃 계약과 동시에 참일 수 없다.

> 본 흡수는 그 편집을 **하지 않았다.** `sanitizeHtml.md` 의 7항목 명제는 현 HEAD 에서 참이고, 아직 도착하지 않은 계약을 근거로 참인 명제를 미리 거짓으로 만들면 그 spec 의 마커가 근거 없이 붉어진다. **planner 가 본 계약을 태스크화하는 시점에 두 편집이 같은 단위로 묶여야 한다** — 같은 tick 의 `~~` 축 흡수에서는 이웃 (I8) 이 **이미 거짓이 될 문면**이었으므로 즉시 좁혔고, 여기는 **아직 참인 문면**이라 미룬다. 두 처리의 차이는 "지금 거짓인가" 다.

### 미측정·비판정 항목

- **브라우저 레이아웃·성능 수치는 측정하지 않았다.** 저장소에 headless 브라우저가 없다 (`node_modules` 에 playwright·puppeteer 부재). NFR-01 의 판정은 **정적 표면(속성의 존재와 정제 생존)** 뿐이며, 실제 대역폭·LCP 개선은 이 spec 이 주장하지 않는다.
- **"문서 순서 첫 이미지 = LCP 후보" 는 근사다.** 첫 이미지가 접힘선 아래에 있거나 LCP 요소가 이미지가 아닐 수 있다. 이 저장소에는 뷰포트·위치를 아는 채널이 없어 더 나은 근사를 만들 수 없다. 채널이 생기면 (I2) 가 바뀔 자리이며, **그때 바뀌는 것은 예외의 기준이지 지연 정책 자체가 아니다.**
- **레이아웃 밀림(CLS)은 본 계약으로 고쳐지지 않는다.** 지연 로드는 오히려 레이아웃 재계산을 스크롤 시점으로 미뤄 치수 부재의 영향을 키운다. 이 계약을 CLS 개선으로 서술하면 거짓이다.
- **`decoding="async"` 는 범위 밖이다.** 정제가 지우는 것을 실측했으나 본 축이 요구하지 않는다 — 허용 목록을 넓히는 것은 정책 변경이므로 요구가 있을 때만 한다.
- **원 req**: `specs/60.done/2026/08/31/req/20260831-post-image-deferred-loading-policy.md` (REQ-20260831-062). 출처 followup (운영자 결함 신고): `20260831-1330-post-images-shift-layout-and-load-eagerly.md`.
- **외부 근거**: [Browser-level image lazy loading for the web — web.dev](https://web.dev/articles/browser-level-image-lazy-loading) (*"Don't lazy-load images that are likely to be in-viewport"*) · [aspect-ratio — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) · [How Images and Media Cause Layout Shift — corewebvitals.io](https://www.corewebvitals.io/core-web-vitals/cumulative-layout-shift/images-and-media).
