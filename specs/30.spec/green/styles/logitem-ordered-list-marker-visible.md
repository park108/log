# 번호 목록 표지 가시성 계약 — 본문 · 작성기 변환 보기

> **위치**: `src/styles/typography.css` (`.section--logitem-contents ol` 의 `padding-inline-start`) · `src/styles/utilities.css` (`.main--main-contents` 의 `overflow: auto` · `.article--main-item` 의 패딩) · 렌더 경로 `src/Log/LogItem.tsx` (`section.section--logitem-contents`) · `src/Log/Writer.tsx` (변환 보기 `div.div--writer-converted`) · `src/Log/Writer.css` (`.div--writer-converted` 패딩 · `.div--writer-convertedbox` 열 배치) · 파서 `src/common/markdownParser.ts` (`<ol start>` · `ol--marker-digits-N`)
> **관련 요구사항**: REQ-20261013-105 FR-01~FR-04 · NFR-01 · NFR-02 (출처: developer followup `20261013-1045-ordered-list-wide-start-marker-padding`, source_task TSK-20261013-03) · REQ-20261013-123 FR-01~FR-05 · NFR-01 · NFR-02 (출처: developer followup `20261013-1532-writer-converted-view-wide-marker`, source_task TSK-20261013-16)
> **게이트**: `npm run check:ordered-list-marker-visible` (실제 레이아웃 — `1bacc61` 등록) · `src/__tests__/ordered-list-marker-not-clipped.test.ts` (CI 정적 대리) · 신설 예정(§수용 기준 `[ ]`): 두 게이트의 작성기 변환 보기 몫
> **최종 업데이트**: 2026-10-13 (inspector — 최초 등록)
> **재개봉**: 2026-10-13 (inspector — REQ-20261013-123 흡수, §변경 이력). 동작 1~3 의 번호는 바꾸지 않는다 — 신설 항은 4 부터 붙인다. slug 는 그대로 둔다 (역참조 보존).

> 참조 코드는 식별자 우선. 줄 번호는 HEAD=`e38a118` 스냅샷이다.

## 역할

파서 산출을 그리는 두 자리 — 본문(`section.section--logitem-contents`)과 작성기 변환 보기(`div.div--writer-converted`) — 에서 번호 목록의 표지(`2024.` 등)는 첫 번호의 자릿수(1~9 — `markdown-rendering` 4)와 무관하게 **모든 글자가 보인다.**

**방어 대상**: `markdown-rendering` 20 이 착지한 뒤(`84fc6e1`) 표지 폭은 첫 번호의 자릿수가 정한다. 바깥 표지(`list-style-position` 기본값)가 그려질 자리는 article 패딩 1em + ol 패딩 1.4em = 38.4px(16px 기준)뿐이고, 그보다 넓은 표지는 `overflow: auto` 인 `main` 의 왼쪽 끝에서 잘린다. `2024. 회고` 로 시작하는 글에서 독자는 `024.` 를 본다. jsdom 에는 레이아웃이 없어 어떤 렌더 테스트도 이것을 보지 못한다. 20 의 판정면(정제된 DOM 의 `start`)은 옳게 착지했고, 깨진 것은 그 다음 층이다. 작성기 변환 보기도 같은 이유로 잘린다 — 표지 공간 규칙이 본문 section 에만 걸려 있으면 변환 보기는 전역 `ol` 패딩(1.5em)만 받는다. 같은 글이 게시 화면에서는 다 보이고 게시 전 모습을 확인하는 유일한 자리에서는 잘리면, 글쓴이는 옳은 글을 잘못 고친다.

하지 않는 것: 글 목록 요약(`trimmedContents` 는 태그를 걷으므로 표지가 없다) · 정제 정책 확장.

## 동작

1. **표지의 모든 글자가 보인다.** 본문(`section.section--logitem-contents`) 번호 목록의 표지 왼쪽 끝은 클리핑 조상 `main.main--main-contents` 의 왼쪽 끝 안에 있다. 첫 번호의 자릿수(1~9자리 — `markdown-rendering` 4)와 무관하다 — 4자리(`2024.`)와 8자리(`20241231.`)를 포함한다. 뷰포트 폭과도 무관하다 — `div#root` 가 `max-width: 800px` 로 가운데 정렬되고 `.article--main-item` 에는 가운데 정렬 여백이 없어, 표지가 쓸 공간이 어느 폭에서나 같다. 변경 이력은 `LogItem` 이므로 같다. 작성기 변환 보기는 본문 section 밖이며 4 가 정한다.

2. **대부분의 글은 바뀌지 않는다.** 첫 번호가 1~2자리인 목록의 표지 위치와 본문 들여쓰기(`li` 의 왼쪽 끝 — `main` 기준 38.4px, 16px)는 HEAD=`bea3a3b` 와 같다. 바꿔야 한다면 그 이유를 이 문면에 먼저 적는다.

3. **정제 정책을 넓히지 않는다.** 파서는 `style` 을 내지 않는다 (`sanitizeHtml` (I15)). 표지 공간을 첫 번호에 따라 달리해야 한다면 `class` 를 쓴다 (`markdown-rendering` 22 의 정렬 표지 선례).

4. **작성기 변환 보기에서도 표지의 모든 글자가 보인다.** 변환 보기(`div.div--writer-converted` — `Writer.tsx` 가 `sanitizeHtml(markdownToHtml(article))` 을 넣는 자리)의 번호 목록 표지는 첫 번호의 자릿수(1~9)와 무관하게, 375px(쌓인 배치)에서 클리핑 조상 `main.main--main-contents` 의 왼쪽 끝 안에 있고 데스크톱 두 열 배치에서 변환 상자(`div.div--writer-convertedbox`)의 왼쪽 테두리를 넘지 않는다 — 열 구분선이 표지 글자를 가르지 않는다. `2024.` · `20241231.` 을 포함한다. 첫 번호가 1~2자리인 목록의 변환 보기 `li` 왼쪽 끝은 HEAD=`ad8e798` 과 같다 (REQ-123 실측: 375px `main` 기준 +40.00px · 1280px +682.52px) — 바꿔야 한다면 그 이유를 이 문면에 먼저 적는다. 수단은 3 을 따른다 — 파서가 이미 싣는 `ol--marker-digits-N` class 를 변환 보기도 받으면 되고 정제 정책은 넓히지 않는다. 본문의 판정(1·2)은 바뀌지 않는다. HTML 원본 보기(`<pre>` 갈래)는 목록을 그리지 않으므로 대상이 아니다.

## 의존성

- 내부: `markdown-rendering` 4 (표지 1~9자리) · 20 (`start`) · `sanitizeHtml` (I15) · `src/styles/*.css` · `src/Log/Writer.css` · `src/Log/Writer.tsx` (변환 보기 마크업 체인 `div.div--writer > form > div.div--writer-editbox > div.div--writer-convertedbox > div.div--writer-converted`).
- 측정 도구: `scripts/check-ordered-list-marker-visible.mjs` — `scripts/measure-layout.mjs` 와 같이 시스템 Chrome 을 CDP 로 몬다. 의존성을 더하지 않고, Chrome 이 없으면 rc=2 다. 변환 보기 체인은 `Writer.tsx` 마크업과 갈리면 안 된다 — 하네스가 컴포넌트 마크업과 어긋나면 측정이 엉뚱한 면을 잰다 (REQ-123 NFR-01).
- 발화 채널 등록: `package.json` `check:ordered-list-marker-visible` 는 operator 쓰기 영역이다 (`RULE-01 §쓰기 권한`). 스크립트 착지 뒤 등록이 있어야 §수용 기준 1 이 판정된다 — `b018cd7` (부수효과 채널) 이 같은 순서를 밟았다.
- 역의존: `markdown-rendering` 4 · 20 (첫 번호를 독자에게 보이게 한 계약의 다음 층).

## 수용 기준

- [x] (동작 1·2 — 판정면: 실제 레이아웃) `bash -c 'npm run --silent check:ordered-list-marker-visible'` → rc=0. HEAD=`94dc94e` rc=0 (`clipped=0 moved=0 measured=16/16` — TSK-20261013-16 `ca4b334` · 등록 `1bacc61`). HEAD=`e38a118` rc=1 (스크립트 부재). 입력 `2024. 회고\n2025. 계획` · `20241231. x` · `1. 하나\n2. 둘` · `10. 열\n11. 열하나` 를 `sanitizeHtml(markdownToHtml(x))` 로 만들어 실제 CSS(`src/styles/index.css`)와 래퍼 체인 `main.main--main-contents > div > article.article--main-item > section.section--logitem-contents` 에 싣고 375px · 데스크톱 폭에서 잰다. Chrome 이 없으면 rc=2 다 — 통과가 아니라 무판정이다. 재개봉 재실행 HEAD=`b00db12` rc=0 (`clipped=0 moved=0 measured=16/16`). 동작 4 착지 뒤에도 이 명령은 본문 회귀 판정으로 남는다 (REQ-123 FR-04).
- [x] (CI 대리 — 동작 1 의 수단 고정) `bash -c 'npx vitest run src/__tests__/ordered-list-marker-not-clipped.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`94dc94e` rc=0 (TSK-20261013-16 `ca4b334`). HEAD=`e38a118` rc=1 (파일 부재). 착지한 수단의 CSS 규칙 실재를 정적으로 못 박는다 (`toaster-message-not-clipped.test.ts` 선례). 수치 근거는 위 레이아웃 판정이며 그 출력을 파일 머리말에 박제한다. 재개봉 재실행 HEAD=`b00db12` rc=0.
- [ ] (동작 4 — 판정면: 실제 레이아웃, 변환 보기 체인) `bash -c 'out=$(npm run --silent check:ordered-list-marker-visible 2>&1); rc=$?; for w in 375 1280; do for n in 2024 20241231 1 10; do echo "$out" | grep -E "chain=writer( |$)" | grep -E "width=$w( |$)" | grep -qE "start=$n( |$)" || exit 1; done; done; exit $rc'` → rc=0. HEAD=`b00db12` rc=1 (`chain=writer` 줄 0 — 스크립트가 본문 체인만 싣는다). 스크립트는 같은 네 입력을 `Writer.tsx` 의 변환 보기 체인(`Writer.css` 를 실어)에도 싣고 그 측정 줄에 `chain=writer` 를 적는다. 그 줄의 `clipped` 경계는 375px 에서 `main` 왼쪽 끝, 데스크톱에서 `div.div--writer-convertedbox` 왼쪽 끝이고, 좁은 둘은 `li` 왼쪽 끝이 HEAD=`ad8e798` 값(375 +40.00 · 1280 +682.52, `main` 기준)에서 TOL 넘게 벗어나면 `moved` 다. 스크립트 rc 는 두 체인을 함께 판정하므로 본문 회귀(동작 1·2)도 이 명령을 붉힌다.
- [ ] (Should, CI 대리 — 동작 4 의 수단 고정) `bash -c 'out=$(npx vitest run src/__tests__/ordered-list-marker-not-clipped.test.ts -t "변환 보기" --coverage.enabled=false 2>&1); rc=$?; echo "$out" | grep -qE "Tests +[1-9][0-9]* passed" || exit 1; exit $rc'` → rc=0. HEAD=`b00db12` rc=1 (이름에 `변환 보기` 가 든 테스트 0 — 명명 실행이 공허하다). 대리 게이트 파일 안에서 이름에 `변환 보기` 가 든 테스트가 변환 보기 쪽 표지 공간 규칙의 실재를 못 박는다 (REQ-123 NFR-02). `-t` 가 아무것도 고르지 않으면 vitest 는 rc=0 이므로 `passed` 수를 단언한다.

## 변경 이력

| 일자 | req / 커밋 | 요약 | 영향 |
|------|-----------|------|------|
| 2026-10-13 | REQ-20261013-123 / — | blue→green 재개봉. 동작 4 신설 — 작성기 변환 보기에서도 표지의 모든 글자가 보인다 (375px `main` 안 · 데스크톱 변환 상자 테두리 안 · 1~2자리 `li` 위치 불변 · 정제 정책 불변). 동작 1 의 *"편집 미리보기도 같은 CSS 를 쓰므로 같다"* 는 거짓이었다 — 변경 이력(`LogItem`)만 참이고 변환 보기는 본문 section 밖이다. 동작 1 의 자릿수를 1~9 로 닫았다 (`markdown-rendering` 4, REQ-122). 제목을 두 자리로 넓혔고 slug 는 그대로 둔다. 측정 도구 문면을 실제 게이트 스크립트로 정정. FR-02 · FR-03 (Should) 채택 · NFR-02 의 대리 확장을 Should 항목으로 세웠다 (명명 실행 공허 가드 양방향 실측: `-t "변환 보기"` raw rc=0 · 6 skipped → rc=1, `-t "W4"` → `1 passed` → rc=0). 레이아웃 수치는 req 의 Chrome 실측을 옮겼다. inspector 는 HEAD=`b00db12` 에서 표지 공간 규칙이 `.section--logitem-contents` 한정임(`typography.css` `ol--marker-digits-{3..9}`)과 `Writer.tsx` 체인을 정적으로, 기존 두 명령 rc=0 (`clipped=0 moved=0 measured=16/16`)을 격리 사본에서 재확인했다. req 의 `/write` 인용 줄은 `Log.tsx:47` 이다 (discovery 정정) | 역할 · 동작 1·4 · 의존성 · 수용 기준 · 참고 · 머리 |
| 2026-10-13 | inspector reconcile / `ca4b334` `1bacc61` | 동작 1·2 레이아웃 · CI 대리 `[x]` — HEAD=`94dc94e` `git archive` 사본에서 두 명령 재실행 rc=0 2/2 (TSK-20261013-16 result.md 실재 · 운영자 `check:*` 등록). 머리 게이트 갱신 | 수용 기준 · 머리 · 참고 |
| 2026-10-13 | inspector reconcile / — @ HEAD=`cb354da` | `[ ]` 2 rc=1 불변 (스크립트 · 대리 게이트 부재 — TSK-20261013-16 미착지). 주입 이관처 "미발행" 문면을 발행된 TSK-20261013-16 으로 정정. §수용 기준 1 의 `package.json` `check:*` 등록은 operator 쓰기 영역이다 (`RULE-01 §쓰기 권한`) — TSK-16 이 §범위 밖으로 두고 스크립트 직접 실행을 DoD 로 삼았다 | 참고 · 의존성 |
| 2026-10-13 | REQ-20261013-105 / — | 최초 등록. 판정면은 실제 레이아웃(로컬 `check:*` 채널), CI 방어는 정적 대리 게이트 — req NFR-02 가 위임한 채널 결정이다 (§참고). 8자리 표지(req FR-02 Should)도 동작 1 에 넣었다. inspector 는 DOM(`<ol start="2024">`)만 격리 사본에서 재확인했고 레이아웃 수치는 req 의 실측을 옮겼다 | all |

## 참고

### 실측 (REQ-105, HEAD=`bea3a3b`, Chrome headless, 16px, 실제 CSS · 래퍼 체인)

| 첫 번호 | 표지 문자열 폭 (`N. `) | 표지 왼쪽 끝 (`main` 기준) | 결과 |
|---|---|---|---|
| 1 | 14.4px | +24.0px | 보인다 |
| 10 | 24.2px | +14.2px | 보인다 |
| 100 | 33.7px | +4.7px | 보인다 |
| 2024 | 45.6px | −7.2px | 잘린다 (`024.`) |
| 20241231 | 78.6px | −40.2px | 잘린다 (`231.`) |

### 실측 (REQ-123, HEAD=`ad8e798`, Chrome headless, 16px, 웹폰트 실림 — 작성기 변환 보기 체인 · `Writer.css`)

| 입력 | 375px 표지 왼쪽 끝 (`main` 기준) | 1280px 표지 왼쪽 끝 − 변환 상자 테두리 |
|---|---|---|
| `1. 하나\n2. 둘` | +22.09 | — |
| `10. 열\n11. 열하나` | +12.27 | — |
| `100. x` | +2.44 | +5.43 |
| `2024. 회고\n2025. 계획` | −7.39 (첫 글자 `2` 가 잘린다) | −4.39 (구분선이 `2` 를 가른다) |
| `20241231. x` | −46.70 (`231. x`) | −43.71 |

- 같은 하네스의 본문 체인에서 `2024.` 는 두 폭 모두 +14.73px (`ol--marker-digits-4`). 변환 보기는 전역 `ol` 패딩 24px 만 받는다. 클리핑 조상은 `main` 하나다 — 변환 상자와 그 사이 조상은 `overflow` 를 걸지 않는다 (계산 스타일). Pretendard 를 걷은 조건의 값은 0.5px 안에서 같다.

### 판정면의 한계 (REQ-105 NFR-01)

- 표지 박스는 DOM API 로 직접 잴 수 없다. REQ-105 는 `li.getBoundingClientRect().left` 에서 같은 계산 글꼴로 잰 `"N. "` 폭을 빼서 근사했고, 잘림은 스크린샷으로 확정했다. 게이트가 근사를 쓰면 그 한계와 오차 여유를 스크립트 머리말에 적는다. 표지를 안쪽에 두는 수단이면 근사식이 달라진다 — 수단에 맞는 식을 쓴다.
- 글꼴: `fonts.css` 는 Pretendard 를 CDN 에서 `@import` 한다. 로드 여부에 따라 숫자 폭이 달라지지만, `2024. ` 이 38.4px 에 들어가려면 숫자 폭이 약 0.45em 미만이어야 하므로 HEAD 의 잘림 판정은 뒤집히지 않는다.

### 채널 결정 (REQ-105 NFR-02)

- 레이아웃 판정은 로컬 `check:*` 채널로 둔다. CI 에 헤드리스 브라우저를 넣지 않는다 — `scripts/measure-layout.mjs` 머리말의 기존 결정(설치 시간 · 버전 드리프트)을 따른다. CI 쪽 회귀 방어는 정적 대리 게이트가 진다.
- 대리 게이트는 같은 결과를 내는 다른 CSS 를 붉게 볼 수 있다. 그때는 레이아웃 판정을 다시 돌리고 대리 게이트를 갱신한다 — 판정면은 레이아웃이다.

### 주입 이관 (`RULE-06 §게이트 실효 검증` — 두 게이트를 세우는 task 의 DoD)

`RULE-07 §수용 기준 문장` 의 '가정 주입 요구' 부류라 체크박스로 두지 않는다. 이관처 task 는 `TSK-20261013-16` — DoD 에 아래 두 주입 · 대조와 무판정 경로(Chrome 부재 → rc=2)가 실렸고 `ca4b334` 로 착지했다 (`injection: 3/3 detect` · `control: 1/1 pass`).

- **주입 (레이아웃)**: 착지한 수단의 파일(CSS · 파서 class 중 바꾼 쪽)을 `bea3a3b` 판본으로 되돌린 트리 → rc=1 (`2024` · `20241231` 잘림). 원복 → rc=0.
- **주입 (대리)**: 착지한 표지 공간 규칙을 지운 트리 → rc≠0. 원복 → rc=0.
- **대조**: 표지와 무관한 본문 CSS 변경(예: 글자색) → 두 게이트 모두 rc=0.

동작 4 (변환 보기 몫) — 이관처는 두 게이트의 변환 보기 몫을 세우는 task (미발행).

- **주입 (레이아웃)**: 착지한 수단을 되돌린 트리 → 동작 4 명령 rc=1 (`chain=writer` 의 `2024` · `20241231` 이 375 · 1280 에서 `clipped`). 본문 체인 줄은 그 트리에서 `ok` 로 남아야 한다 — 남지 않으면 수단이 본문 규칙을 함께 건드린 것이다.
- **주입 (체인)**: 하네스의 변환 보기 체인에서 `div--writer-converted` class 를 뺀 트리 → rc≠0 이어야 한다. 초록이면 하네스가 컴포넌트 마크업이 아니라 전역 규칙만 재고 있다.
- **주입 (대리)**: 변환 보기 쪽 표지 공간 규칙을 지운 트리 → `-t "변환 보기"` 명령 rc≠0.
- **대조**: 변환 보기의 글자색만 바꾼 변형 → 두 명령 rc=0.

### 미측정·비판정 항목

- 1 로 시작해 항목 수가 네 자리에 닿는 목록(항목 1000개)도 같은 이유로 잘린다. 동작 1 의 문면은 그 경우를 포함하지만 위 입력은 첫 번호 쪽만 잰다.
- 뷰포트 폭 무관 주장은 `div#root` 의 `max-width` 구조에서 나온 것이다 (`src/styles/reset.css`). headless 창의 최소 폭 때문에 REQ-105 실측의 `innerWidth` 는 500 이었다.
- 변환 보기는 800px 에서 쌓인 배치와 두 열 배치가 갈린다 (`Writer.css`). 동작 4 는 375 · 1280 두 폭만 잰다 — 경계 근처 폭은 재지 않는다.
- 변환 보기와 본문의 다른 조판 차이(줄 간격 · 문단 여백)는 계약하지 않는다 (REQ-123 범위 밖). Writer 는 관리자 경로(`/write`)에만 있어 독자가 아니라 글쓴이가 보는 화면이다.
