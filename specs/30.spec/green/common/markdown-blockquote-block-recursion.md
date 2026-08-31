# 인용 안에서도 블록 문법이 동작한다 (독자가 `-` `#` `>` 를 글자로 보지 않는다)

> **위치**: `src/common/markdownParser.ts` 의 인용 패스 (보조: `:235` 패스 시작 · `:266-278` 값 노드 확정 · `:249` `isQuoteLine` · `:244` 빈 줄 경계 주석) + 후속 블록 패스 (이어짐 `:281` · `ul` `:396` · `ol` `:442` · headers `:440` 이후)
> **관련 요구사항**: REQ-20260831-070 FR-01~FR-06 · NFR-01~NFR-03
> **최종 업데이트**: 2026-08-31 (by inspector 253차 tick — 최초 박제)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷이다.

## 역할

인용(`>`) 내용에도 블록 패스가 적용된다 — 목록·ATX 제목·중첩 인용이 인용 **안에서** 블록으로 렌더된다. 독자가 인용 안에서 마크업 문자를 글자로 보지 않는다.

**의도적으로 하지 않는 것**:

- 인용 안 코드 펜스·표는 기대 산출이 확정되지 않아 범위 밖이다.
- 지연 인용(`> 하나\n둘`, lazy quote continuation) 과 `>` 앞 들여쓰기는 범위 밖이다.
- 인용 내부의 **목록 경계 세부 규칙**은 정하지 않는다 — 최상위에서 `markdown-list-item-continuation`·`markdown-mixed-type-nested-list` 가 정의한 것을 상속한다. 본 계약이 요구하는 것은 *블록 패스가 적용된다* 는 것이지 그 패스의 규칙을 다시 쓰는 것이 아니다.
- 구현 방식을 정하지 않는다 (§동작 §패스 순서).

## 배경 — 무엇이 깨져 있는가

인용 패스(`:235`)는 `:266-278` 에서 인용 줄들을 **평탄한 값 노드로 확정**한다. `>` 를 떼어낸 줄이 `type: "value"` 노드가 되고 줄 사이는 `<br />` 로 고정된다. 이후의 블록 패스 — 이어짐(`:281`) · `ul`(`:396`) · `ol`(`:442`) · headers — 는 **이 패스보다 뒤에 돌지만** 이미 값 노드가 된 인용 내용을 마커로 인식하지 않는다. 중첩 인용도 같은 이유로 두 번째 `>` 가 내용 글자로 남아 escape 된다(`&gt;`).

**인라인 패스는 값 노드의 본문에 적용되므로 정상 동작한다** — 그래서 인라인만 살아 있다. 이 비대칭이 이 축의 진단이자 대조의 근거다.

## 공개 인터페이스

- 변경 없음. `markdownToHtml(rawInput: string): string` 의 시그니처는 그대로이며 계약면은 **산출 HTML** 이다.

## 동작

1. **(I1) 인용 안 목록**: 인용 내용에 목록 마커가 있으면 인용 안에서 목록으로 렌더된다. `> - 하나\n> - 둘` 의 산출은 `<blockquote>` 안에 `<ul>` 과 항목 2개를 담고 `- 하나` 라는 글자열을 포함하지 않는다 (FR-01).
2. **(I2) 인용 안 제목**: 인용 내용의 ATX 제목이 인용 안에서 제목으로 렌더된다. `> # 제목` → `<blockquote>` 안에 `<h1>` (FR-02).
3. **(I3) 중첩 인용**: `> 바깥\n> > 안쪽` 의 산출에 `&gt;` 가 **0건**이고 `<blockquote>` 가 중첩된다 (FR-03).
4. **(I4) 인라인은 한 번만 처리된다 (대조)**: `> **굵게**` → `<blockquote><strong>굵게</strong></blockquote>` 이며 산출에 `<strong><strong>` 이 없다 (FR-04). **블록 패스를 넣으면서 인용 내용이 인라인 파이프라인을 두 번 통과하면 여기서 드러난다.**
5. **(I5) 블록 없는 여러 줄 인용은 한 덩어리다 (대조)**: `> 한 줄\n> 두 줄` 은 지금처럼 `<blockquote>` **1개** 안에서 `<br />` 로 이어진다 (FR-05).
6. **(I6) sanitize 통과**: 인용에서 나온 태그(`ul` `ol` `li` `h1`~`h6` `blockquote`)가 `ALLOWED_TAGS` 를 통과한다 (FR-06). 현재 전건 등재돼 있어 **공허 참이며, 위반 시점에 구속력이 생긴다**.

### 패스 순서 — 이 축의 설계 지점 (구현 자유)

원인은 인용 패스가 목록·제목 패스보다 **앞**에 돌면서 내용을 값 노드로 확정하는 것이다. 해법은 (a) 인용 내용에 블록 파이프라인을 재귀 적용하거나 (b) 인용 패스를 뒤로 옮기는 것인데, (b) 는 `:244`(빈 줄이 인용 묶음을 끊는다)·이어짐 패스의 인용 처리와 상호작용한다.

**본 계약은 방식을 정하지 않는다.** 정하는 것은 **어느 방식에서도 (I4)(I5) 두 대조가 성립해야 한다**는 것뿐이다. 그 둘이 이 축에서 구현 선택을 가르는 유일한 계약면이다.

### 왜 인용 높이 근거가 계약인가 (FR-05 의 무게)

`:235-244` 주석은 줄마다 `<blockquote>` 를 열던 구현이 실측에서 전체 높이를 **93.56 → 144.72** 로 만들었다고 박제한다 — 세 줄짜리 인용 하나가 화면에서 서로 떨어진 인용 셋으로 보였다. **블록 재귀를 넣으면서 인용을 줄 단위로 다시 쪼개는 것은 그 회귀의 재발이다.** (I5) 는 그 방향을 잡는 채널이며 숫자 자체가 아니라 `<blockquote>` 개수를 잰다.

## 의존성

- 내부: `src/common/markdownParser.ts` (단일 대상) · `src/common/markdownParser.test.ts` (게이트).
- 외부: 없음 (순수 함수).
- **역의존 (사용처) — 열거하지 않고 도출한다**: `bash -c 'grep -rn "markdownToHtml(" src --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "common/markdownParser\.ts"'` → HEAD=`8d030ce` 실측 **4 hit**. 실제 호출 3건은 `src/Log/Writer.tsx:224` (작성 미리보기) · `src/Log/LogItem.tsx:94` (본문 렌더, `sanitizeHtml` 경유) · `src/Log/api.ts:79` (요약). 나머지 1건 `src/Log/__fixtures__/logs.ts:5` 는 **fixture 본문 안의 글자열이지 호출이 아니다**. **Comment 는 이 파서를 쓰지 않는다** — `bash -c '! grep -rq "markdownToHtml" src/Comment'` → rc=0.
- 소비: `common/sanitizeHtml` (blue·green 어느 쪽에 있든 같은 계약이다 — **승격으로 경로가 바뀌므로 `30.spec/{blue,green}/` 접두는 붙이지 않는다**) — 산출 태그가 `ALLOWED_TAGS` 를 통과해야 한다 ((I6)). 현재 전건 등재이므로 이 축은 sanitize 변경을 요구하지 않는다.
- 상속: `markdown-list-item-continuation` · `markdown-mixed-type-nested-list` — 인용 **안**의 목록도 최상위와 같은 규칙을 따른다. 본 계약은 그 규칙을 재선언하지 않는다.
- **요약 경로 주의**: `src/Log/api.ts` 의 `trimmedContents` 는 이 파서 산출에서 태그를 걷어 요약을 만든다. **요약은 저장 시점에 계산돼 서버에 박히므로, 파서 변경은 이미 저장된 글의 요약에 닿지 않는다** — 본 계약의 효과는 신규·재저장 글에 한정된다. 그 경계는 `summary-block-boundary-tag-derivation` §참고 가 소유한다.

## 회귀 중점

- **인용 패스를 뒤로 옮기면서 여러 줄 묶음을 잃는 방향은 (I5) 를 깬다.** 줄마다 `<blockquote>` 를 여는 산출은 (I1)(I2)(I3) 을 전부 만족시키면서 화면 높이를 1.5배로 만든다 — 게이트가 개수를 재지 않으면 초록이다.
- **인용 내용을 인라인 파이프라인에 다시 태우는 방향은 (I4) 를 깬다.** `<strong><strong>굵게</strong></strong>` 는 렌더 결과가 굵은 글씨라 눈으로는 구분되지 않는다.
- **`&gt;` 만 걷어내는 방향은 (I3) 을 반쪽만 만족시킨다.** escape 를 푸는 것과 인용을 여는 것은 다른 일이며, 전자만 하면 독자는 `>` 를 글자로 본다.
- **인용 안에서만 도는 축소판 블록 파서를 따로 만드는 방향**은 (I1) 을 만족시키지만 최상위 목록 규칙과 갈라진다 — 이어짐·혼합 중첩 계약이 인용 안에서 다르게 동작하게 된다 (§역할 §상속).

## 테스트 현황

- [ ] (I1 인용 안 목록) 계약이 게이트로 실재하고 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "인용 안에서도 목록은 목록이다" "$f" && npx vitest run "$f" -t "인용 안에서도 목록은 목록이다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`8d030ce` 본 tick 실측 **rc=1 (미충족)**. 계약 이름 0 hit.
- [ ] (I2 인용 안 제목) 계약이 게이트로 실재한다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "인용 안에서도 제목은 제목이다" "$f"'` → HEAD=`8d030ce` 실측 **rc=1 (0 hit)**.
- [ ] (I3 중첩 인용) 계약이 게이트로 실재한다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "인용은 인용 안에서 다시 열린다" "$f"'` → HEAD=`8d030ce` 실측 **rc=1 (0 hit)**.
- [ ] (I4·I5 대조 신설) 인라인 이중 처리 부재와 여러 줄 묶음 보존이 게이트로 실재한다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "인용 안 인라인은 한 번만 처리된다" "$f" && grep -qF "블록이 없는 여러 줄 인용은 한 덩어리다" "$f"'` → HEAD=`8d030ce` 실측 **rc=1 (2건 전수 0 hit)**. **두 대조는 신설 대상이다** — 현 스위트의 인용 게이트(`test parsing BLOCKQUOTE`)는 `>BLOCKQUOTE` 한 줄만 재므로 이중 처리도 줄 단위 쪼개짐도 보지 못한다.
- [ ] (I1·I2·I3·I4·I5 접속) 다섯 축이 **동시에** 성립하고 파서 스위트가 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "인용 안에서도 목록은 목록이다" "$f" && grep -qF "인용 안에서도 제목은 제목이다" "$f" && grep -qF "인용은 인용 안에서 다시 열린다" "$f" && grep -qF "인용 안 인라인은 한 번만 처리된다" "$f" && grep -qF "블록이 없는 여러 줄 인용은 한 덩어리다" "$f" && grep -qF "연달아 붙은 이어짐 인용은 한 덩어리다" "$f" && npx vitest run "$f" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`8d030ce` 실측 **rc=1 (계약 이름 0 hit 으로 탈락)**. **접속으로 닫는 이유**: `-t` 는 이름 미매치 시 단독으로 rc=0 을 내고, 손상 축 3건만 재는 게이트는 대조 2건을 깨뜨린 구현에도 초록이다. 대조를 접속에 **함께** 넣은 것이 요점이며, 이 축에서 구현 선택을 가르는 것이 바로 그 둘이다.
- [x] (I6 sanitize 통과 baseline) 인용에서 나올 태그가 `ALLOWED_TAGS` 에 전건 등재돼 있다: `bash -c 'f=src/common/sanitizeHtml.ts; grep -q "ALLOWED_TAGS" "$f" || exit 2; for t in blockquote ul ol li h1 h2 h3 h4 h5 h6; do grep -qE "'\''$t'\''" "$f" || exit 1; done'` → HEAD=`8d030ce` 실측 rc=0 (10/10 등재). **현재 공허 참이며 착지 순간 구속력이 생긴다** — 인용이 새 태그를 내기 시작하는데 정책이 따라오지 않으면 여기서 붉어진다. 파일에 `ALLOWED_TAGS` 가 없으면 `exit 2` 로 무판정 처리한다 (공허 통과 차단).
- [x] (I5 높이 근거 실재 baseline) 여러 줄 묶음의 근거가 코드에 박제돼 있다: `bash -c 'f=src/common/markdownParser.ts; test -f "$f" || exit 2; grep -qF "연달아 붙은 인용 줄은 한 덩어리다" "$f" && grep -qF "93.56" "$f"'` → HEAD=`8d030ce` 실측 rc=0 (`:235`·`:242`). **이 항목은 근거 주석의 실재만 잰다** — 산출 판정은 (I4·I5 대조 신설) 과 (접속) 이 닫는다. 근거가 지워지면 다음 구현자가 같은 회귀를 반복한다.
- [x] (이어짐 인용 대조 현행 PASS) 항목 안 이어짐 인용 게이트가 실재하고 초록이다: `bash -c 'f=src/common/markdownParser.test.ts; test -f "$f" || exit 2; grep -qF "연달아 붙은 이어짐 인용은 한 덩어리다" "$f" && npx vitest run "$f" -t "연달아 붙은 이어짐 인용은 한 덩어리다" --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`25f6013` 재실측 rc=0 (`:742`). 소유 계약은 `markdown-list-item-continuation` 이며 본 항목은 그 게이트의 **실재와 초록**만 잰다 (게이트 사본 방지). 구현 후에도 rc=0 이어야 한다.
- [x] (NFR-03 비퇴행 baseline) 파서 스위트가 초록이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts --coverage.enabled=false >/dev/null 2>&1'` → HEAD=`25f6013` 재실측 rc=0 (**155 tests**). 구현 후에도 rc=0 — **기존 게이트를 완화하는 방식의 해결은 불가**하다.

## 수용 기준

- [ ] (Must, FR-01) 위 §테스트 현황 (I1 인용 안 목록) 명령 → rc=0.
- [ ] (Must, FR-02) 위 §테스트 현황 (I2 인용 안 제목) 명령 → rc=0.
- [ ] (Must, FR-03) 위 §테스트 현황 (I3 중첩 인용) 명령 → rc=0.
- [ ] (Must, FR-04·FR-05) 위 §테스트 현황 (I4·I5 대조 신설) 명령 → rc=0.
- [ ] (Must, FR-01~FR-05 접속) 위 §테스트 현황 (I1·I2·I3·I4·I5 접속) 명령 → rc=0.
- [x] (Should, FR-06) 위 §테스트 현황 (I6 sanitize 통과 baseline) 명령 → rc=0. HEAD=`8d030ce` 실측 rc=0.
- [x] (Must, FR-05 근거 보존) 위 §테스트 현황 (I5 높이 근거 실재 baseline) 명령 → rc=0. HEAD=`8d030ce` 실측 rc=0.
- [x] (Must, NFR-03 비퇴행) 위 §테스트 현황 (NFR-03 비퇴행 baseline) 명령 → rc=0. HEAD=`25f6013` 재실측 rc=0 (155 tests).
- [x] (Must, 범위 제한) 인용 안 코드 펜스·표 · 지연 인용 · `>` 앞 들여쓰기 · 인용 내부 목록 경계 세부 규칙은 본 계약의 요구 대상이 아니다 — §역할 · §참고 §미측정.

## 스코프 규칙

- **expansion**: 불허 — 대상은 `src/common/markdownParser.ts` 와 `src/common/markdownParser.test.ts` 2 파일이다. 게이트 위반이 이 밖에서 나오면 격리 대상이다.
- **grep-baseline** (HEAD=`8d030ce`, `git archive` 격리 사본 실측):
  - 계약 이름 5건 전수 **0 hit** (신설 대상): `인용 안에서도 목록은 목록이다` · `인용 안에서도 제목은 제목이다` · `인용은 인용 안에서 다시 열린다` · `인용 안 인라인은 한 번만 처리된다` · `블록이 없는 여러 줄 인용은 한 덩어리다`.
  - `grep -cF "연달아 붙은 이어짐 인용은 한 덩어리다" src/common/markdownParser.test.ts` → **1** (`:742`) — 소유 계약은 `markdown-list-item-continuation`.
  - `grep -cF "test parsing BLOCKQUOTE" src/common/markdownParser.test.ts` → **1** (`:32`). **이 게이트는 `>BLOCKQUOTE` 한 줄만 잰다** — 인용 축의 현행 커버리지가 그것뿐이라는 것이 (I4)(I5) 를 신설하는 근거다.
  - `grep -cF "93.56" src/common/markdownParser.ts` → **1** (`:242`) · `grep -cF "연달아 붙은 인용 줄은 한 덩어리다" …` → **1** (`:235`).
  - `grep -cE "closure: \"blockquote\"" src/common/markdownParser.ts` → **1** (`:272`) — 값 노드 확정 지점이며 이 축의 원인이다.
- **현 산출 (격리 사본 실측 — repo 트리 무변경)**. 왼쪽이 결함이고 오른쪽이 계약이다:

| 입력 | 현 산출 (결함) | 독자가 보는 것 | 계약 |
|---|---|---|---|
| `> - 하나\n> - 둘` | `<blockquote>- 하나<br />- 둘</blockquote>` | `- 하나` / `- 둘` | `<blockquote>` 안 `<ul>` 2항목 |
| `> 1. 하나\n> 2. 둘` | `<blockquote>1. 하나<br />2. 둘</blockquote>` | `1. 하나` / `2. 둘` | `<blockquote>` 안 `<ol>` 2항목 |
| `> # 제목` | `<blockquote># 제목</blockquote>` | `# 제목` | `<blockquote>` 안 `<h1>제목</h1>` |
| `> 바깥\n> > 안쪽` | `<blockquote>바깥<br />&gt; 안쪽</blockquote>` | `> 안쪽` | `&gt;` 0건 · `<blockquote>` 2개 |
| `> **굵게**` (대조) | `<blockquote><strong>굵게</strong></blockquote>` | 굵게 | **무변경** · `<strong><strong>` 부재 |
| `` > `코드` `` (대조) | `<blockquote><code>코드</code></blockquote>` | 코드 | **무변경** |
| `> 한 줄\n> 두 줄` (대조) | `<blockquote>한 줄<br />두 줄</blockquote>` | 한 덩어리 | **무변경** · `<blockquote>` 1개 |

  - **계수 단위 주의**: (I5) 의 판정면은 `<blockquote>` **개수**이지 `<br />` 의 유무가 아니다. `<br />` 를 다른 것으로 바꾸면서 한 덩어리를 유지하는 구현도 계약을 만족한다.
  - **(I3) 의 판정면은 `&gt;` **0건**과 `<blockquote>` 2개를 **함께** 재는 것이다. escape 만 풀면 앞의 조건은 충족되고 뒤는 아니다.
- **rationale**: 계약 이름 5건이 전수 0 hit 이라 baseline 은 열거로 닫힌다. 손상 4행과 대조 3행을 같은 표에 둔 이유는, 이 축의 실패가 "블록이 안 된다" 가 아니라 **"블록을 넣으면서 인라인을 두 번 태운다"** 또는 **"인용을 줄 단위로 쪼갠다"** 쪽이기 때문이다. 후자는 화면 높이 1.5배라는 실측 회귀 이력이 있다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector 253차 tick (Phase 3, REQ-20260831-070 흡수) / pending @ HEAD=`8d030ce` | 최초 박제 — 인용 안 블록 재귀 6 축 (I1~I6). **신규 spec 으로 세운 근거**: 손상 표면(인용 내용)과 대조 축(인라인 이중 처리 · 여러 줄 묶음)이 형제 축들과 전혀 다르고 독립 carve 가 가능하다. 신고서는 REQ-069·070 의 공통 뿌리를 *"블록 파싱이 최상위에서 한 번만 돌고 재귀하지 않는 것"* 으로 진단했고 discovery 가 나눠 등록했는데, **본 tick 도 나눈 채 흡수한다** — 한 계약으로 묶으면 인용 축의 두 대조(이중 처리 · 줄 쪼개짐)가 목록 축의 대조와 섞여 어느 주입이 어느 방향을 재는지 흐려진다. **(I4)(I5) 를 신설 대조로 세운 것이 이 흡수의 판단이다**: 현 스위트의 인용 커버리지는 `test parsing BLOCKQUOTE` 의 `>BLOCKQUOTE` 한 줄뿐이라 이중 처리도 줄 쪼개짐도 **관측 채널이 없다**. 그 둘이 이 축에서 구현 선택(재귀 적용 / 패스 순서 이동)을 가르는 유일한 계약면이므로 접속에 함께 넣었다. **(I5) 에 무게를 실은 근거는 실측 회귀 이력이다** — `:235-244` 주석이 줄마다 인용을 열던 구현의 화면 높이를 93.56 → 144.72 로 박제하고 있고, 블록 재귀는 그 회귀를 되살리기 쉬운 변경이다. baseline: 계약 이름 5건 0 hit · 이어짐 인용 대조 1 hit · 높이 근거 2 hit · 값 노드 확정 1 hit · 손상 4행/대조 3행 격리 사본 실측 · 파서 스위트 155 tests (HEAD=`25f6013` 재도출). unchecked 5 · checked 4. | all |

## 참고

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- **인용 안 코드 펜스·표**의 기대 산출은 확정되지 않았다. 표는 파서에 아직 없고(`markdown-pipe-table` 미착지), 코드 펜스는 인용과의 상호작용이 실측되지 않았다.
- **지연 인용**(`> 하나\n둘`)은 CommonMark 가 인정하는 표기이나 본 계약은 요구하지 않는다. 최상위 lazy continuation 과 규칙이 겹쳐 별 축으로 다뤄야 한다.
- **화면 높이 수치**(93.56 / 144.72)는 특정 브라우저·뷰포트·CSS 에서의 1회 실측이며 **재현 측정 채널이 없다**. (I5) 는 그 숫자가 아니라 `<blockquote>` 개수를 판정면으로 삼는다. 숫자는 근거의 출처로만 박제한다.
- **3단계 이상 중첩 인용**(`> > > 셋`)의 기대 산출은 정하지 않는다.

### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. **검출 방향 3 · 음성 대조 3 이며 이관처 task 는 아직 발행되지 않았다** — 발행 전까지 이 절이 그 박제다.

- **Dir-1 (민감도, 목록 축)**: 인용 안 목록 재귀를 되돌린다 → `rc≠0`.
- **Dir-2 (민감도, 제목 축)**: 인용 안 제목 재귀만 되돌린다 → `rc≠0`. **REQ-070 NFR-01 이 세 방향을 각각 주입하라고 요구한다** — 한 방향만 재면 나머지 회귀가 통과한다.
- **Dir-3 (민감도, 중첩 인용 축)**: 두 번째 `>` 를 다시 escape 한다 → `rc≠0`.
- **Ctrl-1 (특이도, 인라인 이중 처리)**: 인용 안 인라인을 건드리지 않는 정상 변경 → `rc=0`. 게이트가 `<strong>` 표기에 못 박혀 있으면 여기서 붉어진다.
- **Ctrl-2 (특이도, 여러 줄 묶음)**: `> 한 줄\n> 두 줄` 의 `<blockquote>` 개수를 유지하는 정상 변경(예: `<br />` 표기 교체) → `rc=0`.
- **Ctrl-3 (특이도, 범위 밖 축)**: 지연 인용(`> 하나\n둘`) 산출을 바꾸는 변경 — 본 계약이 §역할 에서 범위 밖으로 선언한 축 → `rc=0`.

### 관련

- **원 req**: `specs/60.done/2026/08/31/req/20260831-blockquote-content-block-recursion.md` (REQ-20260831-070). 출처: 운영자 결함 신고 `20260831-0910-block-structure-does-not-recurse.md` 축 B + 중첩 인용 추가 관측.
- **형제 계약**: `markdown-mixed-type-nested-list` (REQ-069, 본 tick 흡수) · `markdown-list-item-continuation` (REQ-068, 착지 완료).
- **같은 계열의 선례**: `0868650` (*"제목 닫는 `#` 이 독자에게 보였다"*) — 마크업 문자가 독자에게 글자로 새는 부류이며, 그 축은 `markdown-atx-heading-closing-sequence` 가 소유한다.
- **체크박스**(`- [ ] 할 일`)는 GFM 확장이며 결함이 아니다 (신고서 판정). 범위 밖.
- **외부 근거**: CommonMark 0.31.2 §5.1 *Block quotes* — 인용 표지를 걷어낸 나머지에 블록 파싱을 **재귀 적용**한다.
