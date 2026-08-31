# 항목 사이의 빈 줄은 목록을 끊지 않는다

> **위치**: `src/common/markdownParser.ts` — 줄 분해 (`:156`), 이어짐 패스 (`:281`~`:365`), `ul` 검출 (`:367`) · `ol` 검출 (`:394`) · `bindListItem` (`:833`, `depthStack` `:836` · `flushAll` `:853` · `isBlankLine` `:867` · `blankRunLeadsToSameTypeItem` `:872` · "Starting a fresh list" `:904` · "Non-list node terminates" `:969`), 문단 감싸기 (`:720-724`). `src/common/sanitizeHtml.ts` — `ALLOWED_ATTR` (`:17`, 경계). 게이트: `src/common/markdownParser.test.ts` + 교차 게이트 `src/__tests__/**` 8 파일 (§의존성).
> **관련 요구사항**: REQ-20260831-057 FR-01~FR-07 · NFR-01~NFR-05 (출처: 운영자 결함 신고)
> **최종 업데이트**: 2026-08-31 (by inspector — Phase 1 drift reconcile, HEAD=`c64c946`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`c64c946`).

## 역할

번호 목록의 항목 사이를 빈 줄로 띄우면 목록이 항목 수만큼 쪼개지고, 쪼개진 자리마다 `<ol>` 이 새로 열려 **독자는 `1.` 을 세 번 본다.** 글머리 목록도 같은 식으로 갈리며, 그때는 번호가 없어 눈에 덜 띄는 대신 보조기술에 **"항목 1개짜리 목록" 이 여러 개**로 읽힌다. 본 계약은 항목 사이의 빈 줄이 **같은 종류의** 목록을 끊지 않는다는 것을 세운다.

**방어 대상 (사용자 관측 표면)**: 글쓴이가 표준 표기로 띄어 쓴 목록이 독자 화면에서 **번호를 되감고** 접근성 트리에서 **목록 여러 개로 쪼개지는** 상태. 글쓴이는 자기가 쓴 원문에서 잘못을 찾을 수 없다 — 표기는 CommonMark 그대로이기 때문이다.

**이 계약의 나머지 절반은 빈 줄이 여전히 끊어야 하는 자리다.** 빈 줄은 이 저장소에서 인용을 끊고(`blockquote-is-one-block.test.ts:35`) 문단을 가른다. 빈 줄을 **전역적으로** 투명하게 만드는 구현은 목록을 고치면서 그 축들을 함께 무너뜨린다 — 두 축은 함께 성립해야 한다.

의도적으로 하지 않는 것: loose 목록의 `<p>` 래핑 (CommonMark 는 느슨한 목록의 항목 내용을 `<p>` 로 감싸지만 본 계약은 **목록이 하나로 유지되는가**만 요구한다 — 현 tight 표기 유지로 충족), 목록 **밖** 빈 줄이 만드는 `<p></p>` (전역 동작 — (I7) 이 이것을 보존 쪽으로 잠근다), 글머리 문자 변경이 새 목록을 시작하는 규칙 (CommonMark Ex.301 — 현 파서는 `- 하나\n* 둘` 을 한 목록으로 병합하며 본 계약은 목록 **종류**(`ul`/`ol`)로만 구분한다), `1)` 계열 순서 구분자 (현 파서 미지원), 빈 목록 항목, `ALLOWED_TAGS`·`ALLOWED_ATTR` 확장, 저장 원문 변경.

## 공개 인터페이스
- 변경 없음. `markdownToHtml(rawInput: string): string` (`markdownParser.ts:134`) 의 시그니처는 그대로다. 계약면은 **산출 HTML** 이다.

## 동작

1. **(I1) 같은 종류의 목록은 빈 줄을 투과한다 — 산출이 빈 줄 없는 같은 입력과 `같다`**: 항목 사이에 빈 줄이 있는 입력의 산출은, 그 빈 줄만 걷어낸 입력의 산출과 **문자열로 동일**하다. `ul`·`ol` 양쪽에 같이 적용된다.

   > **왜 등식인가.** "`<ol>` 이 하나다" 만 재면 항목을 잃은 구현이 통과하고, "`<li>` 가 셋이다" 만 재면 목록이 셋으로 갈린 채 통과한다 (REQ-057 §회귀 중점 이 지목한 부류). 등식은 **목록 개수·항목 개수·항목 내용·중첩·빈 문단 잔존을 한 번에** 잠근다. 오른쪽 항은 기존 게이트가 이미 잠근 표기이므로(`markdownParser.test.ts:120`·`:125` 평탄 UL/OL) 새 표기를 발명하지 않는다.

2. **(I2) 빈 줄의 개수는 결과를 바꾸지 않는다**: 항목 사이 빈 줄이 하나든 둘 이상이든 (I1) 의 등식이 성립한다 (CommonMark Ex.306 "There can be any number of blank lines between items").

3. **(I3) 빈 문단은 남지 않는다**: 목록이 하나로 유지될 때 그 빈 줄이 만들던 `<p></p>` 는 산출에 없다. 목록 요소 **사이**에 놓이면 목록이 끊긴 것이고, `<ol>` **안**에 놓이면 `<li>` 밖 내용이라 유효한 목록이 아니다. 이 명제는 (I1) 등식의 계이지, 별도 표기를 요구하는 것이 아니다.

4. **(I4) 중첩 관계도 유지된다** (Should): `- 하나` / 빈 줄 / `  - 중첩` 은 중첩 목록이다. 빈 줄이 목록을 닫으면 `depthStack` (`:836`) 도 함께 풀려 중첩까지 평탄해진다 — 목록 개수만 고치고 깊이 스택을 놓치는 구현이 이 축에서 갈린다.

5. **(I5) (대조) 빈 줄 뒤가 목록이 아니면 목록은 끝난다**: 문단·제목·인용·수평선 앞에서 현행 경계가 그대로 유지된다. `1. 첫째` / 빈 줄 / `본문` 의 산출은 `<ol><li> 첫째</li></ol><p></p><p>본문</p>` 이며 **`<p></p>` 를 포함한 현행 그대로**다 — 이 자리의 빈 문단은 (I3) 이 겨누는 대상이 아니다.

6. **(I6) (대조) 종류가 다르면 두 목록이다**: `1. 첫째` / 빈 줄 / `- 둘째` 는 `<ol>` 과 `<ul>` 두 목록이다. 빈 줄이 없을 때의 현행(`- 하나\n1. 둘` → 두 목록)과 같은 규칙이다.

7. **(I7) 빈 줄의 다른 블록 경계 의미는 바뀌지 않는다**: 인용은 빈 줄에서 끊기고 (`> 앞\n\n> 뒤` → `<blockquote>앞</blockquote><p></p><blockquote>뒤</blockquote>`), 목록 밖 문단 사이 빈 줄은 `<p></p>` 를 그대로 낸다. 빈 줄의 처리는 **열린 목록이 있고 다음 블록이 같은 종류의 목록일 때**로 한정된다. 이 축이 이 계약의 특이도 전부다.

8. **(I8) 정책 상수 우회 금지**: `sanitizeHtml` 의 `ALLOWED_ATTR` (`:17`) 은 7항목 그대로이며 `start` 가 더해지지 않는다. 목록을 셋으로 둔 채 `<ol start="2">` 로 번호만 맞추는 방향은 이 저장소에서 **작동하지 않는다** — 정제가 속성을 지워 번호가 여전히 1 로 되감기고, 보조기술에는 목록이 여러 개로 남는다 (§스코프 규칙 실측).

9. **(I9) 게이트는 네 방향을 각각 관측한다**: 계약이 같은 종류(I1·I2) · 중첩(I4) · 비-목록 대조(I5) · 다른 종류 대조(I6) 로 갈리므로, 게이트 예시는 방향마다 1건 이상이어야 한다. 한 방향만 있는 게이트는 `flushAll()` 을 무조건 늦추는 구현(대조 두 방향이 함께 깨진다)을 초록으로 통과시킨다. 이것은 게이트 표현에 대한 계약이지 구현 수단 지정이 아니다.

### 회귀 중점
- **`flushAll()` (`:853`) 을 무조건 늦추는 방향은 (I5)(I6) 을 깬다.** 늦추기는 목록을 잇는 데 성공하지만 문단·인용·다른 종류 목록 앞에서도 잇는다. 두 대조가 이 방향의 유일한 관측 채널이다.
- **빈 줄을 전역적으로 버리는 방향은 (I7) 을 깬다.** 빈 value 노드를 분해 직후 제거하면 목록은 이어지지만 `빈 줄은 인용을 끊는다` (`blockquote-is-one-block.test.ts:35`) 가 붉어지고, 목록과 무관한 문단 사이 `<p></p>` 라는 별 축까지 함께 바뀐다.
- **이어짐 패스(`:281`~`:365`)를 넓혀 빈 줄을 흡수하는 방향은 표기를 내용으로 만든다.** 이어짐은 붙일 내용이 있는 줄을 항목에 붙이지만 빈 줄은 붙일 내용이 없다. 빈 줄이 `<br />` 로 항목 안에 남으면 (I1) 등식의 오른쪽 항과 갈린다.
- **목록 개수만 고치고 `depthStack` 을 놓치면 (I4) 가 남는다.** 현 산출에서 `- 하나\n\n  - 중첩` 이 평탄한 두 목록인 것은 목록이 닫히면서 깊이 스택이 함께 풀리기 때문이다.
- **`<ol start=...>` 방향은 실패한다** — (I8).

## 의존성
- 내부: `src/common/markdownParser.ts` (단일 대상), `src/common/markdownParser.test.ts` (게이트).
- **교차 게이트 (비퇴행 모집단)**: `markdownToHtml` 을 소비하는 `src/__tests__/**`. 모집단은 열거가 아니라 `bash -c 'grep -rl "markdownToHtml" src/__tests__/'` 로 **도출**한다 (`RULE-06 §열거 고정 금지`) — HEAD=`0aa049e` 실측 **8 파일**. 이 중 빈 줄 입력을 가진 것은 `blockquote-is-one-block`(1) · `markdown-render-invariants`(1) · `parser-sanitizer-coherence`(2) 뿐이며 **목록과 빈 줄을 함께 쓴 것은 0건**이다 (§스코프 규칙).
- 외부: 없음 (순수 함수).
- 역의존 (사용처): `markdownToHtml` 산출을 소비하는 모든 화면 (Log · Comment 본문 렌더).
- 직교: `specs/30.spec/blue/common/markdown-list-item-continuation.md` — §역할 과 §참고 §미측정 이 "목록 항목 사이 빈 줄의 의미" 를 명시적 범위 밖(**별 축**)으로 선언했고 **본 spec 이 그 별 축이다**. 그 spec 의 이어짐 알고리즘은 **마커 없는 들여쓴 줄**만 흡수하므로 코드 경로가 갈린다 (비퇴행 대상 — NFR-01). `specs/30.spec/blue/common/markdownParser.md` (`bindListItem` 중첩 스택 알고리즘 — 본 계약은 그 알고리즘을 **대체하지 않고 입력을 넓힌다**). `specs/30.spec/green/common/sanitizeHtml.md` (`ALLOWED_ATTR` 정책 — (I8) 이 경계).

## 테스트 현황

> 각 명령은 HEAD=`c64c946` 에서 (흡수 시점 측정은 HEAD=`0aa049e`) **파일에서 추출해** 격리 사본(`git archive HEAD` + `node_modules` 심볼릭 링크)에서 실제 실행했고 rc 를 박제한다 (손 전사 0 — `RULE-06 §추출 실패 검출`). 워킹트리에 다른 writer 의 미커밋 변경이 있을 수 있으므로 이 축의 측정은 언제나 격리 사본에서 한다 (`RULE-02 §교차 작업 파괴`).

- [x] (I1·I2·I3) 빈 줄 투과 계약이 게이트로 실재하고 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "빈 줄은 같은 종류의 목록을 끊지 않는다" "$f" && grep -qF "1. 첫째\n\n2. 둘째\n\n3. 셋째" "$f" && grep -qF -e "- 첫째\n\n- 둘째" "$f" && grep -qF "1. 첫째\n\n\n2. 둘째" "$f" && npx vitest run "$f" -t "빈 줄은 같은 종류의 목록을 끊지 않는다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c64c946` 실측 **rc=0**. `TSK-20260831-09-b` (`c64c946`) 로 충족 — 흡수 시점 HEAD=`0aa049e` 는 rc=1 (계약 이름 0 hit · 예시 3건 0 hit).
- [x] (I5·I6) 대조 두 방향이 게이트로 실재하고 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "빈 줄이 목록을 끝내는 자리" "$f" && grep -qF "1. 첫째\n\n본문" "$f" && grep -qF "1. 첫째\n\n- 둘째" "$f" && npx vitest run "$f" -t "빈 줄이 목록을 끝내는 자리" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c64c946` 실측 **rc=0**. `TSK-20260831-09-a` (`d762727`) 로 충족 — 흡수 시점 rc=1. **이 대조가 없으면 `flushAll()` 을 무조건 늦추는 구현이 (I1) 을 통과한다.**
- [x] (I4 중첩) 중첩 보존 대조가 게이트에 실재한다: `bash -c 'grep -qF -e "- 하나\n\n  - 중첩" src/common/markdownParser.test.ts'` → HEAD=`c64c946` 실측 **rc=0** (`09-b`, `c64c946`) — 흡수 시점 rc=1 (0 hit). 계약 산출은 빈 줄 없는 `- 하나\n  - 중첩` 의 산출과 같은 `<ul><li>하나<ul><li>중첩</li></ul></li></ul>` 이다.
- [x] (I9 접속) 네 방향 예시가 **실재하면서 동시에** 파서 스위트가 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "1. 첫째\n\n2. 둘째\n\n3. 셋째" "$f" && grep -qF -e "- 하나\n\n  - 중첩" "$f" && grep -qF "1. 첫째\n\n본문" "$f" && grep -qF "1. 첫째\n\n- 둘째" "$f" && npx vitest run "$f" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c64c946` 실측 **rc=0** (09-a 예시 2건 + 09-b 예시 2건이 동시 실재하고 파서 스위트 115 tests 초록) — 흡수 시점 rc=1 (grep 단계 탈락). **접속으로 닫는 이유**: 스위트 단독 실행은 게이트가 없는 현 상태에서도 rc=0 이고, `-t` 는 이름 미매치 시 단독으로 rc=0 을 낸다. 둘 다 공허 통과 경로다.
- [x] (I1 정적 zero-point) 파서 단위 게이트에 빈 줄 입력이 실재한다: `bash -c 'test "$(grep -cF "\n\n" src/common/markdownParser.test.ts)" -ge 1'` → HEAD=`c64c946` 실측 **rc=0** (`\n\n` 9 hit · 선언 `it(` **101**). 흡수 시점 HEAD=`0aa049e` 는 **rc=1 (0 hit)** 이었고 선언 95 건 전체에 빈 줄 입력이 없었다 — **이 0 이 결함을 스위트가 초록인 채로 유지시킨 원인이다.**
- [x] (I7 특이도 — 인용) 빈 줄이 인용을 끊는 축이 게이트로 잠겨 있고 초록이다: `bash -c 'f=src/__tests__/blockquote-is-one-block.test.ts; test -f "$f" || exit 2; grep -qF "빈 줄은 인용을 끊는다" "$f" && npx vitest run "$f" -t "빈 줄은 인용을 끊는다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c64c946` 실측 rc=0 (`:35`) — 구현 후 재실행 유지 (09-b Dir-3 주입 시 rc=1 로 검출됨). **구현 후에도 rc=0 이어야 한다 — 빈 줄을 전역적으로 투명하게 만드는 구현은 정확히 여기서 붉어진다.**
- [x] (I8 정책 경계) `ALLOWED_ATTR` 이 7항목이고 `start` 가 없다: `bash -c 'test "$(perl -0777 -ne "print \$1 if /const ALLOWED_ATTR\s*=\s*\[(.*?)\]/s" src/common/sanitizeHtml.ts | grep -oE "'\''[a-z]+'\''" | wc -l | tr -d " ")" -eq 7 && ! grep -qE "'\''start'\''" src/common/sanitizeHtml.ts'` → HEAD=`c64c946` 실측 rc=0 (구현 후 재실행 유지). 구현 후에도 rc=0 이어야 한다.
- [x] (NFR-01 비퇴행 baseline) 파서 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c64c946` 실측 rc=0 (**115 tests**; 흡수 시점 109). 구현 후에도 rc=0 — **기존 게이트를 완화하는 방식의 해결은 불가**하다.
- [x] (NFR-02 교차 비퇴행 baseline) `markdownToHtml` 소비 게이트 전수가 초록이다 — **모집단은 도출한다**: `bash -c 'set -- $(grep -rl "markdownToHtml" src/__tests__/ | sort); test "$#" -ge 8 || exit 2; echo "cross-gate-files=$#"; npx vitest run "$@" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`c64c946` 실측 rc=0, 출력 `cross-gate-files=8` (105 tests 불변). **도출이 8 미만이면 `exit 2` 로 무판정 실패**한다 (공허 통과 차단).

## 수용 기준
- [x] (Must, FR-01·FR-02·FR-03·FR-04) 위 §테스트 현황 (I1·I2·I3) 명령 → rc=0. HEAD=`c64c946` 실측 rc=0.
- [x] (Must, FR-05·FR-06) 위 §테스트 현황 (I5·I6) 명령 → rc=0. HEAD=`c64c946` 실측 rc=0.
- [x] (Should, FR-07) 위 §테스트 현황 (I4 중첩) 명령 → rc=0. HEAD=`c64c946` 실측 rc=0.
- [x] (Must, FR-01~FR-07 접속) 위 §테스트 현황 (I9 접속) 명령 → rc=0. HEAD=`c64c946` 실측 rc=0.
- [x] (Must, 정적 zero-point) 위 §테스트 현황 (I1 정적) 명령 → rc=0. HEAD=`c64c946` 실측 rc=0.
- [x] (Must, NFR-02 특이도) 위 §테스트 현황 (I7 특이도) 명령 → rc=0. HEAD=`c64c946` 실측 rc=0.
- [x] (Must, NFR-04 정책 경계) 위 §테스트 현황 (I8) 명령 → rc=0. HEAD=`c64c946` 실측 rc=0.
- [x] (Must, NFR-01 비퇴행) 위 §테스트 현황 (NFR-01) 명령 → rc=0. HEAD=`c64c946` 실측 rc=0 (115 tests).
- [x] (Must, NFR-02 교차 비퇴행) 위 §테스트 현황 (NFR-02) 명령 → rc=0. HEAD=`c64c946` 실측 rc=0 (`cross-gate-files=8`, 105 tests).
- [x] (Must, 범위 제한) loose 목록의 `<p>` 래핑 · 목록 밖 `<p></p>` · 글머리 문자 변경 규칙 · `1)` 계열은 본 계약의 요구 대상이 아니다 — §역할 · §참고 §미측정.

## 스코프 규칙
- **expansion**: 불허 — 대상은 `src/common/markdownParser.ts` 와 `src/common/markdownParser.test.ts` 2 파일이다 (NFR-04 단일 모듈). `src/common/sanitizeHtml.ts` 는 **읽기 대상**이며 본 축은 그것을 바꾸지 않는다. 게이트 위반이 이 밖에서 나오면 격리 대상이다.
- **grep-baseline** (HEAD=`0aa049e`, 2026-08-31 흡수 시점 격리 사본 실측):
  - `grep -cF "\n\n" src/common/markdownParser.test.ts` → **0**. 빈 줄이 든 입력이 파서 단위 스위트에 한 건도 없다. 제외 규칙: 소스에 문자 그대로 나타난 `\n\n` 만 계수하며 실제 개행은 세지 않는다.
  - `grep -cE "^[[:space:]]*it\(" src/common/markdownParser.test.ts` → **95** (선언 모집단; 실행은 **109 tests** — 차이 14 는 루프 안 선언이다). 이 95 건 중 목록과 빈 줄을 함께 쓴 것은 **0건**이다.
  - 계약 이름·예시 전수 0 hit — 전부 신설 대상이다. `grep -cF "빈 줄은 같은 종류의 목록을 끊지 않는다" src/common/markdownParser.test.ts` → **0** · `grep -cF "빈 줄이 목록을 끝내는 자리" src/common/markdownParser.test.ts` → **0**. **패턴이 `-` 로 시작하면 `-e` 로 넘긴다** — `grep -qF "- 첫째…"` 는 패턴을 옵션으로 읽어 `rc=2` 를 내며, 접속(`&&`) 안에서는 앞 항이 통과한 뒤에야 그 자리에 닿으므로 **게이트가 생긴 순간부터 영구히 rc≠0 이 된다** (흡수 시점 자기검증에서 실제로 잡았다). **계수 명령은 파일 인자를 매번 적는다** — 인자를 빼면 `grep` 이 stdin 을 읽어 매달리고, 줄임표로 줄이면 그것을 파일 이름으로 읽어 `rc=2` 를 낸다 (`RULE-06 §추출 실패 검출`).
  - 교차 게이트 8 파일의 빈 줄 입력 분포: `blockquote-is-one-block` **1** · `markdown-render-invariants` **1** · `parser-sanitizer-coherence` **2** · 나머지 5 파일 **0**. 목록 마커와 빈 줄이 같은 입력에 함께 나타난 것은 **9 파일 전체에서 0건** (`perl -0777` 동시 매치 도출).
  - `grep -nE "ALLOWED_ATTR" src/common/sanitizeHtml.ts` → `:17` (7항목: `href`·`src`·`alt`·`title`·`target`·`rel`·`class`) · `:57` (전달). `grep -cE "'start'" src/common/sanitizeHtml.ts` → **0**. `<ol start="2">` 우회가 막혀 있다는 (I8) 의 근거다 — 격리 사본 실측으로 `IN <ol start="2"><li>둘째</li></ol>` → `SAN <ol><li>둘째</li></ol>`.
  - 흡수 시점(`0aa049e`) 산출 실측 (격리 사본, repo 트리 무변경). **이 표의 왼쪽 열은 `c64c946` 이후 더 이상 재현되지 않는다** — 구현 후 산출은 오른쪽 열과 일치하며 `TSK-20260831-09-b` result.md 가 10행 전건 재측정을 박제한다. 왼쪽 열이 결함이고 오른쪽 열이 계약이다 — **계약 열은 세 번째 열의 실측값과 문자열로 같다**:
    | 입력 (`\n` 구분) | 흡수 시점 산출 (`0aa049e`, 결함) | 빈 줄 없는 같은 입력의 산출 = 계약 |
    |---|---|---|
    | `1. 첫째` `` `2. 둘째` `` `3. 셋째` | `<ol><li> 첫째</li></ol><p></p><ol><li> 둘째</li></ol><p></p><ol><li> 셋째</li></ol>` | `<ol><li> 첫째</li><li> 둘째</li><li> 셋째</li></ol>` |
    | `- 첫째` `` `- 둘째` | `<ul><li>첫째</li></ul><p></p><ul><li>둘째</li></ul>` | `<ul><li>첫째</li><li>둘째</li></ul>` |
    | `- a` `- b` `` `- c` `- d` | `<ul><li>a</li><li>b</li></ul><p></p><ul><li>c</li><li>d</li></ul>` | `<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>` |
    | `1. 첫째` `` `` `2. 둘째` (빈 줄 2) | `<ol><li> 첫째</li></ol><p></p><p></p><ol><li> 둘째</li></ol>` | `<ol><li> 첫째</li><li> 둘째</li></ol>` (빈 줄 1 과 동일 — I2) |
    | `1. 첫째` `   이어짐` `` `2. 둘째` | `<ol><li> 첫째<br />이어짐</li></ol><p></p><ol><li> 둘째</li></ol>` | `<ol><li> 첫째<br />이어짐</li><li> 둘째</li></ol>` |
    | `- 하나` `` `  - 중첩` | `<ul><li>하나</li></ul><p></p><ul><li>중첩</li></ul>` (**중첩도 잃는다**) | `<ul><li>하나<ul><li>중첩</li></ul></li></ul>` |
  - 대조 축 산출 (`0aa049e` · `c64c946` 동일) — **이 넷은 바뀌지 않는 것이 계약이다**:
    | 입력 | 현 산출 = 계약 | 축 |
    |---|---|---|
    | `1. 첫째` `` `본문` | `<ol><li> 첫째</li></ol><p></p><p>본문</p>` | (I5) |
    | `1. 첫째` `` `- 둘째` | `<ol><li> 첫째</li></ol><p></p><ul><li>둘째</li></ul>` | (I6) |
    | `> 앞` `` `> 뒤` | `<blockquote>앞</blockquote><p></p><blockquote>뒤</blockquote>` | (I7) |
    | `첫 문단` `` `둘째 문단` | `<p>첫 문단</p><p></p><p>둘째 문단</p>` | (I7) |
- **rationale**: 계약 이름·예시가 전수 0 hit 이고 빈 줄 입력 자체가 파서 스위트에 0 이므로 baseline 은 열거로 닫힌다. 결함 축 6행과 대조 축 4행을 같은 자리에 둔 이유는, 이 축의 실패가 "목록이 이어지지 않는다" 가 아니라 **"이으려다 빈 줄의 다른 의미를 함께 무너뜨린다"** 쪽이기 때문이다 — 그리고 그 무너짐은 현재 선언된 게이트 중 `blockquote-is-one-block.test.ts:35` **하나에서만** 보인다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector (Phase 3, REQ-20260831-057 흡수) / pending @ HEAD=`0aa049e` | 최초 박제 — 빈 줄 목록 연속성 9 축 (I1~I9). **신규 spec 으로 세운 근거**: 소유 후보였던 `markdown-list-item-continuation.md` 가 §역할 · §참고 §미측정 에서 이 축을 명시적 범위 밖("별 축")으로 선언했고, 그 spec 은 `9dcd80e` 로 blue 승격돼 inspector 의 쓰기 대상이 아니다. 그 선언은 여전히 참이므로 blue 를 되받아 고칠 이유도 없다. **(I1) 을 등식으로 세운 것이 이 흡수의 판단**이다 — req 가 지목한 "`<ol>` 개수만 재면 항목을 잃은 구현이 통과한다" 를 개수 두 개를 나란히 재는 대신 오른쪽 항(빈 줄 없는 같은 입력)으로 닫았다. baseline: 계약 이름 2건 0 hit / 빈 줄 입력 파서 스위트 0건 / 선언 95 it(실행 109 tests) / 결함 축 6행 · 대조 축 4행 격리 사본 실측 / `ALLOWED_ATTR` 7항목에 `start` 0 hit. unchecked 5 · checked 5. | all |
| 2026-08-31 | inspector (Phase 1 drift reconcile) / `d762727`·`c64c946` @ HEAD=`c64c946` | **unchecked 5 → 0 · §수용 기준 10/10 `[x]`** — 판정 명령 9건을 spec 파일에서 추출해 격리 사본(HEAD=`c64c946`)에서 전수 재실행, 전건 rc=0. 플립: (I1·I2·I3) · (I5·I6) · (I4 중첩) · (I9 접속) · (I1 정적 zero-point). 근거 커밋 둘 다 HEAD 조상 — `d762727` (TSK-09-a 대조 net) · `c64c946` (TSK-09-b 등식 구현). 라인 drift 2: "Starting a fresh list" `:881`→`:904` · "Non-list node terminates" `:924`→`:969` (두 hunk 가 `:863` 이후라 `:156`·`:281~:365`·`:367`·`:394`·`:720-724`·`:833`·`:836`·`:853` 및 test 파일 `:120`·`:125`·`blockquote:35` 는 전부 불변). 신규 식별자 `isBlankLine` `:867` · `blankRunLeadsToSameTypeItem` `:872` 를 §위치 에 추가. 계수 drift: 선언 `it(` 95→**101** · 파서 실행 109→**115** tests · `\n\n` 정적 hit **0→9** · 교차 게이트 8 파일 105 tests 불변. §스코프 규칙 결함 표를 "현 산출"→"흡수 시점 산출(결함)" 로 재라벨 — 왼쪽 열은 `c64c946` 이후 재현되지 않는다. 주입 이관 4방향·대조 2건 **전건 이관 완료**. | 테스트 현황 · 수용 기준 · 위치 · 스코프 규칙 · 참고 |

## 참고

### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. **검출 방향 4 · 음성 대조 2.** **이관 완료 (HEAD=`c64c946`)** — `TSK-20260831-09-a` (`d762727`) 가 Dir-2 · Ctrl-1 을, `TSK-20260831-09-b` (`c64c946`) 가 Dir-1 · Dir-3 · Dir-4 · Ctrl-2 를 왕복 판정했다 (`injection: 1/1 detect` + `3/3 detect` = 4/4 · `control: 1/1 pass` ×2 = 2/2). 각 방향의 주입 명령·실패 출력·원복 후 rc 는 두 task 의 `result.md` 에 박제돼 있다. 아래 방향 목록은 게이트 설계 근거로 남긴다.

- **Dir-1 (민감도, I1·I2·I3)** — 빈 줄 투과를 끈다 (빈 줄 앞에서 목록을 다시 닫는다) → `rc≠0`. 이 방향이 붉지 않으면 계약이 게이트에 닿지 않은 것이다.
- **Dir-2 (민감도, I5·I6 — 과잉 방향)** — 빈 줄 뒤 블록의 종류 판정을 없애고 **무조건** 목록을 잇는다 (`flushAll()` 을 조건 없이 늦춘다) → `rc≠0`. **Dir-1 과 반대 방향이다**: Dir-1 은 잇지 못하는 쪽, Dir-2 는 끊어야 할 자리까지 잇는 쪽을 잡는다.
- **Dir-3 (민감도, I7 특이도)** — 빈 줄을 전역적으로 버린다 (빈 value 노드를 분해 직후 제거) → `rc≠0`. **`빈 줄은 인용을 끊는다` (`blockquote-is-one-block.test.ts:35`) 가 붉어지는지를 명시적으로 확인한다** — 이 방향의 주 관측 채널이 그것이다.
- **Dir-4 (민감도, I4 중첩)** — 목록은 잇되 빈 줄에서 `depthStack` (`:836`) 을 푼다 → `rc≠0`. 중첩 대조가 이 방향의 유일한 관측 채널이며, 목록 개수만 재는 게이트에는 보이지 않는다.
- **Ctrl-1 (특이도)** — 목록 **밖** 문단 사이 빈 줄 축(`첫 문단\n\n둘째 문단` → `<p>첫 문단</p><p></p><p>둘째 문단</p>`)의 정상 변경 → `rc=0`. **가산형으로 수행한다** (기존 단언에 추가; 문자열 교체 금지) — `TSK-20260831-07` 에서 교체형 Ctrl 이 같은 task 의 정적 문자열 핀 DoD 와 상충해 `rc=1` 을 낸 실측이 있다.
- **Ctrl-2 (특이도)** — 본 spec 이 범위 밖으로 선언한 축 (글머리 문자 변경 규칙 · loose `<p>` 래핑 · 강조 · 제목) 의 정상 가산 변경 → `rc=0`.

> **Dir-2 와 Dir-3 이 이 spec 의 값어치다.** Dir-1 만 잡는 게이트는 "빈 줄을 통째로 없애 목록을 이었다" 를 통과시키고, 그 구현은 인용과 문단의 경계를 함께 지운다. 목록이 고쳐진 화면만 보고는 그것이 보이지 않는다.

### 미측정·비판정 항목

- **loose 목록의 `<p>` 래핑은 확정하지 않는다.** CommonMark 는 항목 사이에 빈 줄이 있는 목록을 loose 로 규정하고 항목 내용을 `<p>` 로 감싸지만, 본 계약이 요구하는 것은 **목록이 하나로 유지되는가**뿐이다. 현 tight 표기 유지로 충족이며, 래핑을 여는 것은 별 축이다 — 열려면 `<li>` 본문 앞 한 칸 공백(`<li> 첫째</li>`)을 잠근 기존 게이트와 함께 다뤄야 한다.
- **접근성 트리 노출은 명령으로 재지 않는다** (REQ-057 NFR-03). 산출이 `<ul>`/`<ol>` 하나이면 list semantics 는 HTML 표준이 보장하므로 (I1) 의 등식이 이 명제를 함의한다. 별도 측정 채널을 만들지 않는다.
- **실제 게시글에서 띄어 쓴 목록의 빈도는 세지 않았다.** 저장소에 글 코퍼스가 없다. 근거는 빈도가 아니라 **표기가 CommonMark 표준이고 결과가 틀리다는 것**이며, 이 신고가 운영자에게서 직접 왔다는 사실이다 (RULE-05 §결함 신고).
- **구현 수단은 지정하지 않는다.** 빈 줄을 검출 전에 걷을지, `bindListItem` 의 비-list 분기에서 앞뒤를 볼지, 별 패스를 둘지는 developer 영역이다. (I1) 의 등식과 (I5)(I6)(I7) 의 대조가 판정한다 — 단 NFR-05 대로 `bindListItem` 의 중첩 스택 알고리즘을 **대체하지 않고 입력을 넓히는** 쪽이며, 이는 이어짐 축(`f885730`)이 택한 것과 같은 방향이다.
- **빈 줄 술어의 공백만 있는 줄 포함 여부는 이 계약이 명시하지 않는다.** 계약 문면은 `\n\n` 만 말한다. 구현(`isBlankLine` `:867`)은 `text.trim() === ""` 라 `- a\n  \n- b` 도 투과시키며 이는 CommonMark 의 blank line 정의와 같으나, **본 spec 이 요구한 바는 아니다** — 계약면을 넓힐지는 별 축이다. `TSK-20260831-09-b` §관찰 이슈 2 가 후속 스텁 `specs/10.followups/20260831-1303-blank-line-predicate-includes-whitespace-only-line.md` 로 남겼고 discovery 소관이다.
- **본 spec 의 `<li> ` 표기 18곳은 `markdown-list-item-content-start` 착지 시 함께 움직인다.** §동작 (I5)(I6) 문면과 §스코프 규칙 baseline 표가 `<ol><li> 첫째</li>` 를 현행으로 적고 있는데, REQ-20260831-059 가 그 선행 공백을 결함으로 판정하고 별 계약이 인수했다 (`specs/30.spec/green/common/markdown-list-item-content-start.md`). **본 spec 의 판정 명령은 입력 리터럴만 재므로 그 착지에 붉어지지 않는다** — 즉 게이트가 이 문면 drift 를 잡지 못하며, 동기화는 inspector Phase 1 의 몫이다. 구조 명제(목록이 하나로 유지되는가)는 그대로이고 `<li>` 직후 한 글자만 바뀐다.
- **저장 원문은 바뀌지 않는다.** 수리는 읽을 때 적용되므로 이미 게시된 글에도 파서 변경만으로 반영된다 (`markdownParser.ts:566` 이 같은 원칙을 박제한다).
- **원 req**: `specs/60.done/2026/08/31/req/20260831-blank-line-between-list-items-does-not-split-the-list.md` (REQ-057). 출처 결함 신고: `specs/10.followups/20260831-1110-blank-line-between-list-items-restarts-numbering.md`.
- **외부 근거**: CommonMark 0.31.2 §5.3 *Lists* — Ex.306 ("There can be any number of blank lines between items") · Ex.311 (`1. a` / `` / `2. b` / `` / `3. c` → `<ol>` 하나) · Ex.314 (loose 여도 목록은 하나) · Ex.308 ("To separate consecutive lists of the same type … you can insert a blank HTML comment" — 같은 종류의 목록을 **나누려면 빈 줄로는 부족하다**는 반대편 증거) · Ex.301·302 (글머리 문자 변경 — 본 계약이 범위 밖으로 둔 축).
