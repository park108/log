# 선언된 분기·방어 축은 구별 단언을 갖거나 미발화로 박제된다

> **위치**: 횡단 테스트 계약. 현 판정 대상은 `src/**/*.test.{js,jsx,ts,tsx}` 의 분기 선택 더블과 그 케이스의 단언, 그리고 소유 spec 의 `## 참고 > ### 미측정·비판정 항목` 절.
> **관련 요구사항**: REQ-20260825-020 (declared-branch-discriminating-assertion)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 223 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`139cd78`).

## 역할

테스트가 더블로 **특정 분기를 선택**했으면 그 선택이 여는 관측 결과를 **구별하는 단언**을 갖는다. 구별 단언을 붙일 수 없는 축 — 어떤 주입으로도 발화하지 않는 잔여 방어 — 은 **삭제하지 않고 미발화 사실을 박제**한다.

**이 둘은 하나의 이분법이며 한쪽만으로는 성립하지 않는다.** (b) 박제 경로가 없으면 (a) 는 "모든 축은 발화 가능해야 한다" 는 **거짓 전칭**이 되어 정당한 잔여 방어를 삭제하게 만든다. (a) 구별 단언 요구가 없으면 (b) 는 **만능 면제구**가 되어 게으른 단언 전부가 "미발화 축" 으로 분류된다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 `§역할` 이 요구하는 대로 **방어 대상을 명시한다**: 이 계약이 막는 것은 **더블 값을 뒤집어도 초록인 케이스**다. 그 케이스는 자기가 선언한 분기를 지키지 않으면서 커버리지·통과 수에는 정상으로 계상된다.

**이 축이 기존 자동 게이트로 검출되지 않는 이유**는 `RULE-06 §게이트 실효 검증` 의 주입 요구가 `check:*` 게이트·픽스처에만 걸려 있고 **개별 단위 테스트가 설치한 더블·단언**에는 걸리지 않기 때문이다. 실측(§동작 (B-1))으로 전체 스위트의 통과 수·분기 커버리지가 **분기 실행 0회와 1회 사이에서 완전히 동일**했다.

이 계약이 의도적으로 하지 않는 것:
- (i) 더블의 **형상** 정합 (`mockReturnValue` vs `mockResolvedValue`). `testing/test-double-return-shape-fidelity` 가 덮으며 그 §역할 (ii) 가 "단언 민감도 자체 — 별 축" 으로 본 축을 자기 범위 밖에 둔다.
- (ii) 커버리지 **수치 목표**. 본 계약은 수치가 아니라 단언의 구별력을 판정한다.
- (iii) `check:*` 게이트의 주입 검증 — `RULE-06` 이 이미 덮는다.
- (iv) 다중 가드 표면에서 개별 가드의 분해능 — REQ-20260825-013 의 별 축.
- (v) 구별 단언의 **수단** 지정 (`queryBy*` / `getAllBy*` / 요청 인자 관측 등). planner·developer 영역.

## 공개 인터페이스

본 계약은 공개 인터페이스를 갖지 않는다. 관측 표면은 (a) 분기 선택 더블이 설치된 케이스의 단언 집합, (b) 그 선택을 뒤집었을 때의 케이스 결과다.

## 동작

### (B-1) 구별 단언 — 뒤집으면 붉어진다

더블로 분기를 선택한 케이스는 그 선택이 여는 관측 결과를 단언한다. **더블 값을 뒤집으면 그 케이스가 red 가 된다.**

HEAD=`139cd78` 확정 위반 1건 — `src/common/Navigation.test.tsx`:

```ts
// :35-36  음성 더블 설치
vi.spyOn(common, "isLoggedIn").mockReturnValue(false);
vi.spyOn(common, "isAdmin").mockReturnValue(false);
// :53-55  유일한 결과 단언
const href = link!.getAttribute('href');
expect(href === null || /^https?:\/\//.test(href)).toBe(true);
```

`isAdmin()` 이 여는 것은 `src/common/Navigation.tsx:24` `if(isAdmin())` → `ADMIN_MENU`(`:12-16`, `log`·`file`·`mon` 3항) 렌더다. 위 단언은 그 메뉴의 유무를 보지 않으므로 더블을 `false` → `true` 로 뒤집어도 초록이다.

**실측이 이것을 이미 보여줬다.** TSK-20260825-20 이 `mockResolvedValue(false)` → `mockReturnValue(false)` 로 교정해 그 음성 분기가 **처음으로** 실행됐을 때:

| 상태 | admin 갈래 | 비-admin 갈래 | BRH | 케이스 결과 |
|---|---|---|---|---|
| 교정 전 (`Promise` = truthy) | 3 | **0** | 3/4 | 3 passed |
| 교정 후 (동기 `false`) | 2 | **1** | 4/4 | 3 passed |

전체 스위트도 교정 전후 `677 passed` · `Branches 95.65% (1100/1150)` 로 동일했다. **분기가 0회 실행이든 1회 실행이든 관측 가능한 차이가 없다** — 그 케이스가 지키고 있던 것이 없다는 뜻이다.

> `expect(link).not.toBeNull()` 같은 인접 단언은 구별 단언이 아니다. 두 갈래 모두에서 참이므로 선택을 뒤집어도 붉어지지 않는다. **판정은 "부재 단언이 파일 어딘가에 있는가" 가 아니라 "선택이 여는 대상에 대한 부재 단언인가" 여야 한다** — 전자는 현 HEAD 에서 이미 1 hit 이라 아무것도 요구하지 않는 기준이 된다 (실측, §수용 기준 (N-1)).

### (B-2) 미발화 잔여 방어의 박제

(B-1) 을 충족시킬 수 없는 축 — 어떤 주입으로도 발화시킬 수 없는 잔여 방어 — 은 **삭제하지 않고** 소유 spec `## 참고 > ### 미측정·비판정 항목` 에 평서문으로 박제한다. 박제 문장은 셋을 포함한다.

1. 축의 **위치** (파일·식별자).
2. **미발화 사유** — 왜 현 상태에서 주입이 그 축에 도달하지 않는가.
3. 어떤 **회귀에서 다시 의미**를 갖는가.

HEAD=`139cd78` 대상 1건 — `src/__tests__/api-base-url-assembly-totality.test.ts:105` `expect(() => new URL(arg)).not.toThrow()`. 축은 `?? ""` 우회로 만들어지는 **상대 URL** 을 겨누는데, TSK-20260825-26 의 injection 왕복에서 발화한 것은 음성 2 갈래였고 이 축은 어느 방향으로도 발화하지 않았다. 사유는 도출 총성이 거절 가드로 닫혀 `?? ""` 의 우변이 평가될 상태에 도달하지 않기 때문이다.

**tick 223 이 이 박제를 소유 spec `foundation/api-base-url-assembly-totality` §참고에 기입해 이 건은 닫혔다.** 계약으로 남기는 것은 재발 방지다.

> **왜 삭제가 아닌가.** 그 축은 `not.toContain('undefined')` 가 잡지 못하는 형태(`"?limit=10"` — 증상 문자열 없는 상대 URL)를 유일하게 겨눈다. 지금 발화하지 않는 이유는 축이 무의미해서가 아니라 **상류 계약이 그 상태를 봉쇄하고 있어서**다. 상류가 회귀하면 이 축이 첫 검출자다.

### (B-3) 모집단의 도출성

판정 대상 지점은 열거 고정이 아니라 **더블 설치 표기로부터 도출**한다 (`RULE-06 §열거 고정 금지`).

HEAD=`139cd78` 실측 도출:

| 도출 | 수 |
|---|---|
| `mockReturnValue(false)` 전체 | 28 |
| 그중 `isAdmin` 대상 | 23 (10 파일) |
| `mockResolvedValue(false)` (형상 위반 잔여) | **0** |

23 지점 중 tick 223 시점 확정 위반은 **`Navigation.test.tsx:36` 1건**이며 나머지 22 의 구별 단언 유무는 **미측정**이다 (§미측정·비판정 항목). 미측정을 "정합" 으로 계상하지 않는다.

## 의존성

- 외부: `vitest` (`vi.spyOn` · `mockReturnValue`), `@testing-library/react` (`queryBy*` · `getAllBy*`).
- 내부: `src/common/Navigation.tsx` (`ADMIN_MENU` — 구별 대상의 진리원), `src/common/common.ts` (`isAdmin`).
- 인접 계약:
  - `testing/test-double-return-shape-fidelity` — **선행 축**. 형상이 정합해야 분기가 비로소 실행되고, 그 다음에야 구별 단언 유무가 의미를 갖는다. 그 spec §역할 (ii) 가 본 축을 명시 위임한다.
  - `foundation/api-base-url-assembly-totality` — (B-2) 박제의 첫 소유처.
  - `testing/spec-claim-measurement-surface-agreement` — (S-5) 특이도·민감도 대칭. 본 계약은 그 대칭을 **단위 테스트 층**에 적용한 것이다.

## 회귀 중점

- **(R-1) 부재 단언의 위치만 맞추는 오회복.** 파일 어딘가에 `queryBy*`·`toBeNull` 이 있으면 통과하는 판정은 현 HEAD 에서 이미 참이다 (`Navigation.test.tsx:52` `expect(link).not.toBeNull()`). 판정은 **선택이 여는 대상**에 묶여야 한다.
- **(R-2) 만능 면제구로의 회귀.** (B-2) 박제 경로가 게으른 단언의 도피처가 되면 이 계약은 역효과를 낸다. 박제는 **주입 시도 후**의 결론이어야 하고 세 요소(위치·사유·회귀 조건)를 전부 담아야 한다.
- **(R-3) 잔여 방어 삭제로의 오회복.** "발화하지 않으니 죽은 코드" 라는 판단은 상류 계약이 그 상태를 봉쇄하고 있다는 사실을 놓친다. (B-2) 가 명시 배제한다.
- **(R-4) 커버리지 수치로의 대리.** BRH 4/4 는 분기가 **실행**됐음만 말하고 단언이 **구별**함을 말하지 않는다. 실측에서 교정 전후 전체 Branches 수치가 동일했다 — 수치는 이 축의 신호가 아니다.
- **(R-5) 형상 축으로의 되돌림.** `mockResolvedValue(false)` 재도입은 분기를 다시 실행 불가로 만들어 본 계약을 **공허하게** 참으로 만든다. 인접 계약이 0 을 유지해야 본 축이 의미를 갖는다.
- **(R-6) 열거 고정.** 23 지점을 리터럴 목록으로 박으면 24번째 더블이 사각이 된다. 모집단은 표기 도출로 산출한다.

## 발화 채널

**HEAD=`139cd78` 에 (B-1) 의 발화 채널이 없다.** 위반은 테스트를 붉게 만들지 않는다 — 오히려 초록을 만든다. 따라서 **테스트 자신이 이 축의 판정자가 될 수 없다** (`testing/test-double-return-shape-fidelity §역할` 과 같은 구조).

| 게이트 | HEAD=`139cd78` 채널 | 상태 |
|---|---|---|
| B-1 (구별 단언) | 없음 — 정적 판정은 §수용 기준 (N-1) | **부착 필요** |
| B-2 (미발화 박제) | inspector 절차 — 소유 spec §미측정·비판정 항목 | 절차 계약 (첫 건 tick 223 기입 완료) |
| B-3 (모집단 도출) | 없음 — 도출 명령은 §수용 기준 | 계약 서술 |

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** 아래는 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니며, 검출 방향을 보존한 채 **수리 task 의 `## 검증/DoD`** 로 이관한다. `RULE-04` notes 에 `injection: N/N detect` 박제. **이관처 task 가 발행되기 전까지 귀속처는 이 절의 명시적 지시다** (이관처 없는 강등 금지).

- (Dir-1) 구별 단언을 추가한 각 지점에서 **더블 값을 뒤집는다**(`false` → `true`) → 그 케이스 `rc≠0` → 원복 → `rc=0`. 지점 수만큼 왕복하며 `N/N` 의 N 은 수리한 지점 수다.
- (Dir-2) **특이도** — 뒤집기 없이 그대로 실행 → `rc=0`. 추가한 단언이 정상 상태를 붉게 만들지 않음의 확인이며, 이 방향이 없으면 "항상 실패하는 단언" 도 (Dir-1) 을 통과한다.

> (B-2) 부류는 **정의상 주입 불가**이므로 이관 대상에서 제외하고 §동작 (B-2) 의 박제로 대체한다. 이 제외를 명시하지 않으면 `injection: N/N` 의 분모가 흔들린다.

## 테스트 현황

- [x] 형상 정합 잔여 0 — `mockResolvedValue(false)` HEAD **0 hit** (선행 축 `test-double-return-shape-fidelity` 착지분).
- [x] `new URL()` 잔여 방어 축 보존 — `src/__tests__/api-base-url-assembly-totality.test.ts` **2 hit**.
- [x] (B-2) 첫 박제 — 소유 spec `foundation/api-base-url-assembly-totality` §미측정·비판정 항목에 위치·사유·회귀 조건 3요소 기입 (tick 223).
- [x] `Navigation` 음성 케이스의 admin 메뉴 부재 단언 — **tick 224 ack (`eb5019b`)** `Navigation.test.tsx:58-60` 이 `log`·`file`·`mon` 3 항목 전부에 `queryByText(...).toBeNull()` 을 부착했다. tick 223 실측 0건이었다 (TSK-20260825-30 / `eb5019b`).
- [ ] 나머지 22 지점의 구별 단언 유무 — **미측정**. (B-3) 분류의 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 측정 명령은 `src/**` 만 참조한다 — **spec 파일 경로는 어느 것도 참조하지 않는다** (RULE-07 §promote 조건 2). **HEAD=`eb5019b` (tick 224 재실행) 기준 3/3.**

- [x] (Must, B-1) `Navigation` 음성 케이스의 구별 단언 — `ADMIN_MENU` 항목명을 **`Navigation.tsx` 에서 도출**해, 그중 최소 1개에 대한 **부재 단언**이 음성 케이스에 실재한다. 판정:
  ```
  bash -c 'names=$(sed -nE "s/.*name:[[:space:]]*\"([A-Za-z0-9_-]+)\".*/\1/p" src/common/Navigation.tsx | sort -u); [ -n "$names" ] || { echo "derive=0 vacuous" >&2; exit 2; }; n=0; for m in $names; do grep -qE "query(ByText|AllByText)\([^)]*$m[^)]*\)[^;]*(toBeNull|not\.toBeInTheDocument|toHaveLength\(0\))" src/common/Navigation.test.tsx && n=$((n+1)); done; echo "adminmenu=$(echo $names | wc -w | tr -d " ") asserted=$n"; test "$n" -ge 1'
  ```
  → **rc=0**. **HEAD=`eb5019b` (tick 224 재실행) 실측 rc=0 / `adminmenu=3 asserted=3` → 충족** (TSK-20260825-30 / `eb5019b`). tick 223 실측은 rc=1 / `adminmenu=3 asserted=0` 이었다. 도출된 3 항목 **전부**가 부재 단언을 얻었다 — 기준은 `≥1` 이므로 착지는 요구를 초과한다. **원안(`grep -nE "queryBy|not\.toBeInTheDocument|toBeNull" … → ≥1 hit`)을 쓰지 않은 이유** — 현 HEAD 가 이미 1 hit 이다 (`:52` `expect(link).not.toBeNull()`). 그 단언은 두 갈래 모두에서 참이라 구별력이 0 이므로, 원안은 **아무것도 고치지 않은 상태에서 통과하는 공허 기준**이었다 (실측 확인). **공허 통과 가드 내장** — 항목명 도출이 0 이면 `exit 2`. ack 라인이 `adminmenu=3` 으로 비공허임을 수치로 낸다. **검출 경계 (과신 금지)**: 이 명령은 단언의 *실재*를 재며 그 단언이 실제로 뒤집기에 붉어지는지는 재지 않는다 — 그것은 (Dir-1) 로 이관돼 있다.
- [x] (Must, B-1 전제) 형상 회귀 부재 — `bash -c 'test "$(grep -rnE "mockResolvedValue\(false\)" src --include="*.test.js" --include="*.test.jsx" --include="*.test.ts" --include="*.test.tsx" | wc -l)" -eq 0'` → rc=0. **HEAD=`139cd78` 실측 rc=0 / 0 hit → 충족.** 이 항목은 선행 축의 결과를 재확인하는 **전제**다 — 형상이 되돌아가면 분기가 다시 실행 불가가 되고 (B-1) 은 공허하게 참이 된다 ((R-5)). 인접 계약이 이미 게이트를 가지므로 중복처럼 보이나, 본 계약의 판정이 **그 게이트의 결과에 의존한다**는 사실을 문서 안에서 함께 재판정할 수 있게 박제한다.
- [x] (Must, B-2) 잔여 방어 축의 보존 — `bash -c 'test "$(grep -cE "new URL\(arg\)" src/__tests__/api-base-url-assembly-totality.test.ts)" -ge 1'` → rc=0. **HEAD=`139cd78` 실측 rc=0 / 2 hit → 충족.** 이 항목이 막는 것은 (R-3) 오회복이다 — 미발화 축을 "죽은 단언" 으로 판단해 지우는 변경은 **어떤 기존 게이트도 붉게 만들지 않는다**. 그래서 보존 명제이면서도 `RULE-07 §반려 시그널` 의 중복 게이트 부류가 아니다.

## 참고

- **REQ 원문**: `20.req/20260825-declared-branch-discriminating-assertion.md` (REQ-20260825-020, slug 식별).
- 소비한 followup: `20260825-1806-negative-branch-assertion-sensitivity`, `20260825-2200-absolute-url-assertion-axis-unexercised`.
- 확정 위반: `src/common/Navigation.test.tsx:35-36`(더블) ↔ `:53-55`(단언) / `src/common/Navigation.tsx:24`(분기) · `:12-16`(`ADMIN_MENU`).
- 미발화 축: `src/__tests__/api-base-url-assembly-totality.test.ts:105`.
- 명시 위임 근거: slug `testing/test-double-return-shape-fidelity` §역할 (ii) — "단언 민감도 자체 — 별 축이다".

### 미측정·비판정 항목

- **(미측정) 23 지점 중 22 의 구별 단언 유무.** `isAdmin → false` 도출 23 지점 중 확정 위반은 `Navigation.test.tsx:36` 1건이고 나머지는 미측정이다. 분류는 수리 task 의 산출물이며 그 결과가 나오기 전까지 **미측정을 정합으로 계상하지 않는다**. 후보 파일 — `Comment/CommentForm.test.tsx`(5) · `Comment/CommentItem.test.tsx`(5) · `Log/LogItemInfo.test.jsx`(6) · `Comment/Comment.test.tsx`(1) · `File/File.test.tsx`(1) · `Log/Log.test.jsx`(1) · `Log/LogItem.test.jsx`(1) · `Log/Writer.test.jsx`(1) · `Search/SearchInput.test.tsx`(1) · `common/Navigation.test.tsx`(1).
- **(가정 주입 요구 — 이관) 구별 단언의 실효성.** (Dir-1)(Dir-2) 로 수리 task DoD 에 이관했다 (§발화 채널). 이관처 task 가 발행되기 전까지 귀속처는 그 절의 명시적 지시다.
- **(미측정 NFR) 추가 단언의 결정성.** 개수 단언을 쓰는 경우 도달 대기가 필요하다 (REQ-20260825-019 축). 본 계약은 단언의 구별력만 판정하며 대기 이디엄은 그 별 축이 규정한다.
- **(별 축) 다중 가드 표면의 분해능.** REQ-20260825-013 이 다룬다. 본 계약은 **단일 분기 선택**에 구별 단언이 0 인 경우만 판정한다.
- **(관측 — 미판정) `RULE-06` 의 주입 요구가 단위 테스트에 미치지 않는다.** 규약 개정은 운영자 영역이라 spec 이 판정 대상으로 삼을 수 없다. 본 계약은 그 공백을 spec 층에서 보상한다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | TSK-20260825-30 / `eb5019b` (inspector tick 224) | **Phase 1 reconcile ack — (B-1) 플립, 수용 기준 2/3 → 3/3.** `Navigation.test.tsx:58-60` 이 `Navigation.tsx` 에서 도출되는 admin 항목 `log`·`file`·`mon` **3개 전부**에 `queryByText(...).toBeNull()` 을 부착했다 (tick 224 재실행 실측 `adminmenu=3 asserted=3`, rc=0; tick 223 은 `asserted=0` rc=1). 기준이 `≥1` 이므로 착지는 요구를 초과하며, 도출 기반 판정이라 항목이 추가돼도 모집단이 자동으로 따라온다. **아울러 tick 223 이 남긴 자기모순 1건을 정정했다** — 본 §변경 이력 행이 `RULE-07 §promote 조건 2` 위반(경로 직접 참조)을 *설명하면서 그 위반을 스스로 저지르고 있었고*, 그 리터럴이 `check:spec-coherence` 의 G4 에서 인접 spec 승격을 실제로 차단했다 (planner tick 17 의 승격 역이동 원인). slug 표기로 교체했다. | 수용 기준, 테스트 현황, 변경 이력 |
| 2026-08-25 | REQ-20260825-020 (inspector tick 223) | 최초 등록. followup 2건을 흡수한 req 를 불변식으로 반영하며 **(a) 구별 단언 / (b) 미발화 박제의 이분법 구조를 §역할에 명시 보존**했다 — 한쪽만 남기면 (a) 는 거짓 전칭이 되고 (b) 는 만능 면제구가 된다. **req 수용 기준 7항을 그대로 쓰지 않았다**: (a) FR-02 판정 `grep -nE "queryBy\|not\.toBeInTheDocument\|toBeNull" Navigation.test.tsx → ≥1 hit` 은 **현 HEAD 에서 이미 1 hit** 이다 (`:52` `expect(link).not.toBeNull()`). 그 단언은 양 갈래에서 참이라 구별력이 0 이므로 원안은 아무것도 고치지 않은 상태에서 통과한다 — `ADMIN_MENU` 항목명을 `Navigation.tsx` 에서 **도출**해 그 대상에 대한 부재 단언을 요구하는 판정으로 교체했고 실측 `adminmenu=3 asserted=0` 을 얻었다. (b) FR-03/FR-04 의 "소유 spec §미측정·비판정 항목에 사유 포함" 판정이 slug `foundation/api-base-url-assembly-totality` 를 **경로 리터럴로 직접 참조**했다 (본 tick 224 에서 slug 표기로 정정) — `RULE-07 §promote 조건 2` 위반이며 그 spec 은 tick 223 에 promote 후보가 됐다. **박제 자체는 tick 223 이 그 spec §참고에 3요소(위치·사유·회귀 조건)로 기입해 이행**했고, 체크박스는 경로 무관한 **축 보존** 판정으로 대체했다. (c) `npm test` · `check:test-double-shape` 2항은 **중복 게이트 부류**(위반 시 husky·CI 즉시 실패)라 체크박스로 두지 않았다 — 단 형상 회귀는 본 계약의 **전제**라 별도 항목으로 남겼다. (d) FR-05 23 지점 분류는 수리 task 산출물이라 §미측정 항목으로 강등하되 **미측정을 정합으로 계상하지 않는다**를 명시했다. (e) FR-06(Log/LogItemInfo) 은 FR-01 의 사례이므로 별 체크박스로 중복시키지 않고 (B-3) 모집단에 포함했다. **신규 추가 (req 에 없던 항목)**: (R-1) 부재 단언의 위치만 맞추는 오회복 — 원안 판정이 정확히 그 형태였다, (R-4) 커버리지 수치로의 대리 — 실측에서 교정 전후 Branches 수치가 동일했으므로 수치는 이 축의 신호가 아니다, (R-5) 형상 축 되돌림이 본 계약을 **공허하게 참**으로 만드는 경로, (Dir-2) 특이도 방향 — 이 방향이 없으면 "항상 실패하는 단언" 이 (Dir-1) 을 통과한다. | all |
