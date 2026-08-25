# 도출된 모집단에 대한 판정은 전항 성립을 요구한다

> **위치**: `src/common/a11y.audit.test.ts` (모집단 축) · `scripts/check-declared-branch-discrimination.sh` (임계 축). 라인은 HEAD=`5b2ed3b` 스냅샷이며 **식별자 우선**.
> **관련 요구사항**: REQ-20260825-025
> **최종 업데이트**: 2026-08-25 (by inspector — tick 225 최초 등록)

## 역할

판정기가 자기 모집단을 **도출**했다면, 그 모집단에 대한 판정은 **전항 성립**을 요구한다. 도출 수 `N` 과 충족 수 `K` 에 대해 `K == N` 이 아니면 위반이다.

핵심 명제 — **비공허 가드는 전항 요구를 대체하지 못한다.** `> 0` · `≥ 1` 이 막는 사건은 "잴 것이 사라졌다" 이고, 전항 요구가 막는 사건은 "N 중 K<N 만 충족한다" 다. **두 사건은 서로 다르며 후자가 더 흔하다** — 리팩터 중 한두 항목이 따라오지 못하는 형태가 전형이다. 따라서 둘은 배타 선택지가 아니라 **둘 다 필요**하며, 발화도 구분된다: 도출 0 은 `exit 2`(무판정), `K<N` 은 `exit 1`(위반).

의도적으로 하지 **않는** 것:
- (i) **`check:*` 전수에 전항 요구를 일괄 적용하지 않는다.** 비공허 가드가 **적절한** 판정기도 있다 — 판정 대상이 집합이 아니라 단일 명제인 경우가 그렇다. 전수 조사는 별 축이다 (§참고 §미측정·비판정 항목).
- (ii) **패턴 B 판정 규칙 자체를 규정하지 않는다.** 무엇이 키보드 활성화 위반인가는 본 계약 밖이다 — 본 계약은 **모집단과 임계**만 다룬다.
- (iii) **`PATTERN_B_EXEMPTIONS` 면제 정책을 재설계하지 않는다.**
- (iv) **판정 모집단의 입력 경로(주입 seam)를 다루지 않는다.** slug `foundation/gate-judgement-population-injectable-seam` 가 소유하며 그 계약은 §역할 (ii) 에서 "게이트가 무엇을 위반으로 판정하는지" 를 명시 제외한다. 본 계약이 정확히 그 제외된 축이다 — **두 계약은 보완 관계이고 중복이 아니다.**

## 공개 인터페이스

- 판정기의 stdout 은 **도출 수와 충족 수를 함께** 낸다 (`adminmenu=N asserted=K` 형태).
- 미충족 항목은 stderr 에 **이름으로** 열거된다 — 수치만으로는 어느 항목이 빠졌는지 관측되지 않는다.
- 종료 코드 3분할: `0` 충족 / `1` 위반(`K<N`) / `2` 무판정(도출 0).

## 동작

### (D-1) 두 사례는 서로 다른 파일이지만 같은 형상이다

| 사례 | 위치 | 도출 | 판정 | 형상 |
|---|---|---|---|---|
| (A) 모집단 | `a11y.audit.test.ts:213` | `PROD_JSX_FILES` (`:141`, `:48-53` 재귀 수집) | `expect(...).toBeGreaterThan(0)` | 비공허 가드가 **전항 요구 자리**에 |
| (B) 임계 | `check-declared-branch-discrimination.sh:99` | `name_count` (`:80`, `Navigation.tsx` 에서 도출) | `[ "$asserted" -lt 1 ]` | 동일 |

(B) 의 도출 수 `name_count` 는 **ack 라인 출력에만 쓰이고 판정에 쓰이지 않는다** (`:96-97` vs `:99`). 도출은 정확한데 그 정확함이 판정에 연결돼 있지 않다.

### (D-2) (A) 의 모집단은 확장자 하나로 절반이 새어나간다

`a11y.audit.test.ts:53` 이 `full.endsWith('.jsx')` 로 수집을 한정한다. 파일 상단 선언(`:2` "전수 검증", `:5` "전수 수집")과 어긋난다.

tick 225 실측 (HEAD=`5b2ed3b`): 프로덕션 `.jsx` **16** · 프로덕션 `.tsx` **20**. `role="button"` 을 실제로 보유한 프로덕션 `.tsx` 는 **6 파일 / 8 지점** — `Comment.tsx`(1) · `CommentItem.tsx`(1) · `FileItem.tsx`(2) · `ImageItem.tsx`(1) · `ImageSelector.tsx`(2) · `UserLogin.tsx`(1). **전부 감사 모집단 밖이다.**

**방어 대상 (`RULE-07 §주제 우선순위` 축 2 요구)** — 프로덕션 컴포넌트의 확장자가 `.tsx` 로 바뀌기만 하면 그 파일의 패턴 B 계약이 **아무 발화 없이** 감사에서 이탈한다. TS 이관이 진행 중이므로 이탈은 계속 일어나고, 모집단 수치는 단조 감소하며, `> 0` 은 그 감소 전 구간에서 침묵한다.

### (D-3) (B) 는 테스트가 구조적으로 채널이 될 수 없는 축이다

부재 단언을 지우는 변경은 테스트를 붉게 만들지 않는다 — **오히려 초록을 만든다.** 실측 (TSK-20260825-33): 구별 단언 3행을 **전부 삭제한 상태**에서 전체 스위트가 `74 files / 701 passed` · `Branches 95.69%` 로 **준수 트리와 완전히 동일**했다. 커버리지 수치도 이 축의 신호가 아니다.

따라서 (B) 의 유일한 잠재 채널은 게이트인데, 그 게이트의 임계가 `≥1` 이라 3 중 2 삭제를 통과시킨다. seam 주입 실측: `adminmenu=4 asserted=1` → rc=0.

### (D-4) 임계 상향은 spec 개정에 후행한다

`asserted ≥ 1` 은 스크립트의 임의 선택이 아니라 **소유 spec 이 명시 승인한 값**이다 (slug `testing/declared-branch-discriminating-assertion` §수용 기준 (B-1) 판정문 + "기준은 `≥1` 이므로 착지는 요구를 초과한다" 서술).

게이트만 상향하면 판정 근거가 문서 밖으로 샌다. **게이트가 소유 spec 보다 엄격해지는 중간 상태를 만들지 않는다.** 개정은 blue 직접 편집이 아니라 `blue → green 복사 → 개정 → planner promote` 경로로 이뤄지며, tick 225 가 그 green 판본을 함께 등록했다 (§의존성).

### (D-5) 지금이 상향 시점인 이유 — 두 사례 모두 즉시 붉어지지 않는다

- (B) 현 HEAD 는 `adminmenu=3 asserted=3` 이다. 전항 요구로 상향해도 rc=0 이다 (tick 225 재실행 확인).
- (A) 프로덕션 `.tsx` 8 지점은 육안상 전부 준수다 — 7 지점이 `tabIndex` + `onKeyDown` 을 보유하고 `ImageSelector.tsx:174` 는 native `<button>` 이라 `NATIVE_TAG_NAMES`(`:40`) 자동 제외 대상이다.

**단 (A) 의 즉시 통과는 보장이 아니다** — §참고 §미측정·비판정 항목의 opening-tag 파싱 경계를 참조한다.

## 의존성

- 대상: `src/common/a11y.audit.test.ts` · `scripts/check-declared-branch-discrimination.sh` (writer = developer, `RULE-01` 매트릭스).
- 발화 채널: vitest 수집 경로 · `package.json scripts.check:branch-discrimination` · `.husky/pre-commit` · `ci.yml`.
- 인접 계약 (보완): slug `foundation/gate-judgement-population-injectable-seam` — 입력 seam 축. (B) 의 부분 퇴행 실측이 그 seam 덕분에 가능했다.
- **동반 개정**: slug `testing/declared-branch-discriminating-assertion` 의 green 판본이 (B-1) 판정문을 전항 요구로 개정한다 (§동작 (D-4) 순서 제약).

## 발화 채널

- **(A)** vitest 수집 경로 `src/common/a11y.audit.test.ts` — `vite.config.js:63,68` 수집 범위 안이며 `npm test` · CI 에서 발화한다. 모집단 축소 자체의 발화는 **본 계약이 요구하는 도출 기반 대조가 부착된 이후에만** 생긴다.
- **(B)** `package.json scripts.check:branch-discrimination` + `.husky/pre-commit` 조건 블록 + `ci.yml` step (TSK-20260825-33 / `58f2ddf` 부착). 채널은 실재하며 본 계약이 바꾸는 것은 그 채널의 **임계**다.

## 테스트 현황

- [x] (B) 게이트 채널 실재 — `check:branch-discrimination` 이 `package.json` 에 등재돼 있고 tick 225 재실행 `adminmenu=3 asserted=3` rc=0.
- [x] (B) 전항 요구로 상향해도 현 HEAD 가 충족 — tick 225 재실행 `test "$n" -eq "$tot"` rc=0.
- [ ] (A) 감사 모집단의 `.tsx` 포함 — tick 225 실측 0 hit. (T-1) 의 부착 대상.
- [ ] (A) inventory 도출 기반 대조 — tick 225 실측 `toBeGreaterThan(0)` 단독 가드 잔존. (T-2) 의 부착 대상.
- [ ] (B) 게이트 임계 전항 요구 — tick 225 실측 `:99` `-lt 1` 잔존. (T-4) 의 부착 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (`RULE-07 §수용 기준 문장 규약`). 명령은 `src/**` · `scripts/**` 만 참조하며 **spec 경로를 어느 것도 참조하지 않는다** (`§promote 조건 2`). **HEAD=`5b2ed3b` (tick 225 등록) 기준 1/5.**

- [ ] (Must, T-1) (A) 수집 모집단이 프로덕션 컴포넌트 확장자 전체를 포함한다 — 판정: `bash -c 'test "$(grep -cE "tsx" src/common/a11y.audit.test.ts)" -ge 1'` → **rc=0**. **HEAD=`5b2ed3b` (tick 225) 실측 rc=1 / 0 hit → 미충족.** **단독 판정력 없음 (과신 금지)** — 문자열 `tsx` 는 주석으로도 들어간다. 이 항목은 (T-2)(T-3) 과 **동반해야만** 의미를 가지며, 실제 수집 확장 여부를 재는 것은 (T-2) 의 도출 대조다.
- [ ] (Must, T-2) (A) inventory 회귀 방어가 도출 기반 대조다 — 비공허 가드 단독 잔존 0. 판정: `bash -c 'test "$(grep -cE "PROD_[A-Z_]*FILES\.length\)\.toBeGreaterThan\(0\)" src/common/a11y.audit.test.ts)" -eq 0'` → **rc=0**. **HEAD=`5b2ed3b` (tick 225) 실측 rc=1 → 미충족.** **`> 0` 가드의 삭제를 요구하는 것이 아니다** — §역할 핵심 명제대로 비공허와 전항은 둘 다 필요하다. 요구하는 것은 **비공허 가드가 유일한 inventory 방어인 상태의 해소**이며, 도출 대조가 부착되면 이 패턴은 자연히 사라지거나 보조 위치로 내려간다.
- [ ] (Must, T-3) (A) 감사 자체가 초록 — 판정: `npx vitest run src/common/a11y.audit.test.ts` → **rc=0**. **HEAD=`5b2ed3b` (tick 225) 실측 rc=0 이나, 이는 확장 *전* 모집단에 대한 통과다.** 본 항목의 판정 의미는 (T-1)(T-2) 착지 **후** 에 발생한다 — 확장된 모집단에서도 초록이어야 한다는 요구이며, 신규 위반이 드러나면 수정하거나 `PATTERN_B_EXEMPTIONS` 에 **`rationale` 동반** 등재해야 한다. 등재 없는 통과는 허용하지 않는다.
- [ ] (Must, T-4) (B) 게이트 임계가 전항 요구다 — 판정: `bash -c 'test "$(grep -c "asserted\" -lt 1" scripts/check-declared-branch-discrimination.sh)" -eq 0 && grep -qE "asserted\"[[:space:]]*(-ne|!=)[[:space:]]*\"\$name_count" scripts/check-declared-branch-discrimination.sh'` → **rc=0**. **HEAD=`5b2ed3b` (tick 225) 실측 rc=1 / `:99` `-lt 1` 잔존 → 미충족.** 두 조건의 논리곱인 이유 — 잔존 0 만 재면 판정문을 **삭제**해도 통과하고, 신규 패턴만 재면 구 판정문이 남은 채 병존해도 통과한다.
- [x] (Must, T-5) (B) 도출·충족 수치의 동시 발화 + 현 트리 정합 — 판정: `bash -c 'out=$(npm run --silent check:branch-discrimination 2>&1); echo "$out"; a=$(echo "$out" | sed -nE "s/.*adminmenu=([0-9]+).*/\1/p" | head -1); k=$(echo "$out" | sed -nE "s/.*asserted=([0-9]+).*/\1/p" | head -1); [ -n "$a" ] && [ -n "$k" ] || { echo "ack 라인 미발화" >&2; exit 2; }; [ "$a" -gt 0 ] || exit 2; [ "$a" = "$k" ]'` → **rc=0**. **HEAD=`5b2ed3b` (tick 225 재실행) 실측 rc=0 / `adminmenu=3 asserted=3` → 충족.** **공허 통과 가드 내장** — ack 라인이 없거나 도출이 0 이면 `exit 2` 로 무판정과 충족을 분리한다. 이 항목은 상향 **전에도 참**이지만 `RULE-07 §반려 시그널` 의 중복 게이트 부류가 아니다: 두 수치의 **동시 발화**가 사라지는 회귀(ack 라인에서 `adminmenu` 를 빼는 변경)를 붉게 만드는 게이트가 현재 존재하지 않으며, 그 수치가 없으면 (T-4) 의 전항 요구는 관측 불가능해진다.

## 참고

### 게이트 실효 검증 이관 (RULE-07 §처리 · RULE-06 §게이트 실효 검증)

아래는 **'가정 주입 요구' 부류**라 체크박스로 두지 않으며, 검출 방향을 보존한 채 **수리 task 의 `## 검증/DoD`** 로 이관한다. developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다. **이관처 task 가 발행되기 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

- **(Dir-A1) (A) 판정 민감도** — 프로덕션 `.tsx` 1건에서 `tabIndex={0}` 제거 → `npx vitest run src/common/a11y.audit.test.ts` `rc≠0` → 원복 → `rc=0`.
- **(Dir-A2) (A) 모집단 민감도** — 수집 확장자에서 `.tsx` 를 다시 빼거나 프로덕션 컴포넌트 1개를 수집 경로 밖으로 옮김 → inventory 대조 `rc≠0` → 원복 → `rc=0`. **확장자만 늘리고 수집 경로가 여전히 비면 `0 hit` 이 통과로 읽힌다.**
- **(Dir-B1) (B) 부분 퇴행 — 생략 불가** — `src/common/Navigation.test.tsx` 의 부재 단언 3행 중 **1행만** 삭제 → `adminmenu=3 asserted=2` → `rc≠0` → 원복 → `rc=0`.

  > **전체 삭제 방향으로 대체할 수 없다.** 3행 전부 삭제는 상향 **전에도 이미 `rc≠0`** 이었으므로(`asserted=0 < 1`) 재주입해도 상향의 실효를 전혀 검증하지 못한다. **상향이 새로 요구하게 된 강도를 겨누는 방향만이 실효 검증이다.**

- **(Dir-B2) (B) 무판정 보존** — 도출을 0 으로 만들어 `rc=2` 가 `rc=1` 과 **구분됨**을 확인 → 원복. "위반이 있다" 와 "잴 것이 없어졌다" 를 합치지 않는다.
- **(Dir-0) 특이도** — 주입 없이 현 트리 실행 → `npm test` rc=0 · `check:*` 19종 전수 rc=0.

### 미측정·비판정 항목

- **(미측정) `check:*` 19종 중 같은 형상이 몇 건인지.** 확인된 것은 (B) 1건 + 테스트 측 (A) 1건이다. 비공허 가드가 적절한 판정기도 있으므로 일괄 상향은 요구하지 않는다 (§역할 (i)).
- **(미측정) (A) 확장 시 드러날 신규 위반 수.** 육안으로 8 지점은 전부 준수로 보이나, 감사의 opening-tag 범위 추출(`findOpeningTagRange`)이 `.tsx` 문법(제네릭 · `as` 캐스트 · `{...spread}`)에서 `.jsx` 와 동일하게 동작하는지는 **실행해야 안다**. 경계 식별 실패는 위반 후보로 박제되므로 확장 직후 `rc≠0` 이 날 수 있으며, **그것은 결함이 아니라 미측정이던 표면이 처음 측정된 것**이다.
- **(별 축) 항목명 부분 문자열 매칭 경계.** `check-declared-branch-discrimination.sh:88` 의 `[^)]*$m[^)]*` 는 부분 문자열 매칭이라 `name: "log"` 가 `queryByText("login")` 으로도 충족된다. 현 항목명(`log`·`file`·`mon`)에 서로의 접두사 관계가 없어 **현재 실사각은 아니다**. 전항 요구와 직교하는 축이라 In-Scope 가 아니다. 수정 시 스크립트 §검출 경계 주석도 함께 갱신한다.
- **(소유 공백 — 미해소) `src/common/a11y.audit.test.ts` 의 판정 규칙 축에는 소유 spec 이 없다.** blue `common/accessibility.md` 는 `:10` `:33` 에서 그 감사를 **명시적으로 범위 밖**(WCAG 전반 audit — 별 spec 영역)으로 둔다. **본 계약은 그 공백을 메우지 않는다** — 소유하는 것은 감사의 **모집단 전수성**뿐이고, "무엇이 패턴 B 위반인가" 는 §역할 (ii) 로 명시 제외했다. 감사 전체를 소유하는 spec 의 신설은 본 req 가 Out-of-Scope 로 둔 판정 규칙 축까지 끌어와야 성립하므로 별 req 로 세운다 — tick 225 는 그 공백을 **감추지 않고 여기 박제**하는 데서 멈춘다.
- **(중복 게이트 — 체크박스 제외) `npm test` · `check:*` 19종 전수 rc=0.** 위반 시 husky·CI 가 즉시 실패하므로 `RULE-07 §반려 시그널` 의 중복 게이트 부류다. 단 본 계약의 (T-3) 이 그 위에 서므로 **전제**로서 평서문으로 남긴다.

### 관련

- **REQ 원문**: REQ-20260825-025 (slug `derived-population-totality-judgement`).
- 소비한 followup (req 가 2건 병합): `20260825-2246-a11y-audit-tsx-blind` (TSK-20260825-32 산출) · `20260825-2255-branch-discrimination-threshold-partial-regression` (TSK-20260825-33 산출).
- 인접 계약 (보완, 중복 아님): slug `foundation/gate-judgement-population-injectable-seam`.
- 동반 개정: slug `testing/declared-branch-discriminating-assertion`.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-025 (inspector tick 225) | 최초 등록. **req 수용 기준 8항을 그대로 쓰지 않았다.** (a) req 판본의 FR-05 선행 판정이 slug `testing/declared-branch-discriminating-assertion` 의 **blue 경로 리터럴을 측정 명령 안에서 직접 참조**해 `RULE-07 §promote 조건 2` 를 위반했다 — 측정 명령에서 제거하고, 순서 제약은 §동작 (D-4) 평서문 + **동반 green 판본 등록**이라는 구조적 수단으로 대체했다. (b) req 의 `npm test` · `check:*` 2항은 **중복 게이트 부류**라 체크박스에서 제외하고 §참고에 전제로 남겼다. (c) req 의 게이트 판정문 기준이 `-lt 1` 잔존 0 **단독**이었는데 그것만으로는 판정문을 통째로 지워도 통과하므로 신규 전항 패턴 실재와의 **논리곱**((T-4))으로 교체했다. (d) **(T-5) 신규 추가** (req 에 없던 항목) — 두 수치의 동시 발화가 사라지는 회귀를 잡는 게이트가 없고, 그 수치가 없으면 (T-4) 의 전항 요구 자체가 관측 불가능해진다. (e) (T-1) 은 문자열 `tsx` grep 이라 주석으로 통과 가능함을 **과신 금지 형태로 항목 안에 박제**하고 (T-2) 동반 필수를 명시했다. **§동작 (D-2) 수치를 독립 재측정** — req 는 `.jsx 33 / .tsx 39` (테스트 파일 포함)를 실었으나 감사의 실제 모집단은 프로덕션 한정이므로 `프로덕션 .jsx 16 / .tsx 20` 으로 재측정해 박제했다. `role="button"` 보유 프로덕션 `.tsx` 6 파일 8 지점은 req 박제와 일치 확인. **§참고 소유 공백 항목 신설** — req 가 inspector 판단에 위임한 "a11y.audit 소유 spec 신설 여부" 에 대해 **신설하지 않는다**는 판정과 그 근거(신설은 req 가 Out-of-Scope 로 둔 판정 규칙 축을 끌어와야 성립)를 박제하고, 공백이 남아 있다는 사실 자체를 감추지 않았다. | all |
