# 전역 상태 원복 · 커버리지 순서 무관성

> 출처 req: REQ-20260825-003 (`60.done/2026/08/26/req/20260825-test-global-state-restoration-order-independence.md`)

## 역할

테스트가 `window` · `navigator` · `globalThis` 프로퍼티를 재정의하고 원복하지 않으면, 그 상태는 뒤 케이스로 누출되어 **실행 순서가 커버리지 수치를 바꾸는 채널**을 만든다. 본 계약은 (i) 전역 재정의의 케이스 경계 원복과 (ii) 커버리지 귀속의 실행 순서 무관성을 불변식으로 세운다.

방어 대상은 기존 게이트가 구조적으로 볼 수 없는 silent regression 이다 — 현행 커버리지 게이트는 전부 **단일 순서 1회 실행**을 측정하므로, 순서를 바꿔야만 드러나는 슬롯 이동을 검출하지 못한다.

## 동작

1. **전역 원복** — 테스트가 `Object.defineProperty` 등으로 전역 객체(`window` · `navigator` · `globalThis`)의 프로퍼티를 재정의하면, 그 케이스가 끝나는 시점에 원래 값 또는 원래 descriptor 로 복원된다. (FR-01)
2. **순서 무관 귀속** — `src/common/common.ts` `userAgentParser` 의 분기 귀속은 테스트 실행 순서의 함수가 아니다. 임의 seed 의 `--sequence.shuffle` 실행이 기본 순서와 동일한 covered 슬롯 집합을 낸다. (FR-02)
3. **총계 불변** — 전수 커버리지 4축 수치는 서로 다른 두 실행 순서에서 동일하다. (FR-03)
4. **정적 검출** — 원복 없는 전역 재정의는 정적 검사로 검출된다. 검출 단위는 **재정의된 프로퍼티**이며 파일이 아니다 — 파일 단위 판정은 무관한 훅 1건의 존재만으로 통과하므로 성기다. 재정의된 각 프로퍼티에 대해 대응하는 복원 등록이 동일 파일에 존재해야 한다. (FR-04)
5. **등록 한정 패턴** — (4) 의 정적 패턴은 `afterEach` · `afterAll` 등 **훅 등록 형태**만 복원으로 계수하며, `it` 본문의 직렬 호출을 복원 등록으로 오인하지 않는다. (NFR-02)
6. **회귀 없음** — (1) 의 원복 도입은 기존 UA 파싱 케이스의 단정을 깨지 않는다.

## 수용 기준

- [x] **재정의된 프로퍼티별로** 복원 등록이 존재한다 — 부재 프로퍼티 0건 — 판정: 아래 `bash` 펜스. 훅 등록 한정 패턴이며 `it` 본문 직렬 호출을 등록으로 계수하지 않는다.

```bash
miss=0
files=$(grep -rlE "Object\.defineProperty\s*\(\s*(window|globalThis|navigator)" src --include="*.test.*")
test -n "$files" || { echo "[EXTRACT-FAIL] no candidate file"; exit 2; }
for f in $files; do
  props=$(grep -oE "Object\.defineProperty\s*\([^,]+,\s*['\"][A-Za-z_$]+" "$f" | sed -E "s/.*['\"]//" | sort -u)
  test -n "$props" || { echo "[EXTRACT-FAIL] $f"; exit 2; }
  echo "props($f): $(echo $props)"
  hooks=$(awk '/^[[:space:]]*(afterEach|afterAll)[[:space:]]*\(/,/^[[:space:]]*\}\);?[[:space:]]*$/' "$f")
  for p in $props; do
    echo "$hooks" | grep -q "$p" || { echo "[MISSING] $f :: $p"; miss=$((miss+1)); }
  done
done
echo "missing=$miss"
test "$miss" -eq 0
```
- [x] **`src/common/common.ts` 의 covered 슬롯 집합이 기본 순서·두 shuffle seed 에서 동일하다** (FR-02) — 판정: `bash scripts/coverage-slot-set-compare.sh`
  → **실측 2026-08-29: rc=0.** 5회 재실행 전건 rc=0, 15 측정 전부 `137` 로 동일.

  §동작 2 가 선언한 것은 개수가 아니라 **슬롯 집합**이므로, 판정도 집합 비교로 한다.
  `coverage-final.json` 의 `b`(hit 배열) + `branchMap` 에서 covered 슬롯을
  `line:branchId.index` 로 열거해 base·seed1·seed2 를 `diff` 하며, 갈리면 rc=1 과 함께
  **갈린 슬롯을 이름으로** 출력한다. 리포트 부재·대상 부재·빈 집합은 전부 `exit 2` 로
  단언해 추출 실패가 통과로 읽히지 않게 한다 (`RULE-06 §추출 실패 검출`).

  검출력 검증 (`TSK-20260829-07`): `injection: 1/1 detect` — `userAgent` 복원 훅 1건을
  제거하니 rc=1 과 함께 갈린 슬롯 `349:70.1` 을 지목했다 (해당 슬롯은
  `uaText.indexOf("; MSIE ")` 분기 — UA 누수가 정확히 그 분기를 뒤집었다).
  `control: 1/1 pass` — 정상 복원을 갖춘 UA 케이스를 추가한 변형에서 rc=0.

- [x] **전수 커버리지의 covered 슬롯 집합이 기본 순서와 shuffle 실행에서 동일하다** (FR-03 전수 축) — 판정: `bash scripts/coverage-order-independence-full.sh`
  → **실측 2026-08-29: rc=0 / `slots=4247 mismatched=0`.**

  개수가 아니라 집합을 비교한다. 개수 비교는 "몇 개 다르다" 까지만 말하지만 집합 비교는
  **어느 슬롯인지** 이름으로 낸다 — 실제로 그 출력이 전수 진동의 원인을 단일 지점으로
  특정했다 (아래 §참고).

  모집단 하한(`slots ≥ 1000`)을 둔다. 측정 대상이 무너진 상태의 `mismatched=0` 은
  충족이 아니라 무판정이므로 `exit 2` 로 가른다 (실측: 1파일로 축소하면 `slots=370` →
  `exit 2`). 이 명령은 전수 커버리지 실행 2회(≈2분)라, `RULE-07 §promote 조건 2` 가
  요구하는 승격 시마다의 전건 재실행에 그 비용이 실린다.

## 참고

### 미측정·비판정 항목

- **수용 기준 2 는 복귀했다 (2026-08-29).** 강등 사유는 "순서 축으로 닫히지 않는다" 였고
  그 판정은 옳았다 — 그러나 원인은 순서가 아니라 **테스트의 벽시계 의존**이었다.

  `common.log()` 가 `common.ts:37` 에서 현재 시각으로 타임스탬프를 만들고
  `getFormattedTime` 의 `ss < 10` 삼항(`common.ts:229`)을 탄다. 실행이 초 00–09 구간에
  걸치면 그 분기가 덮이고 아니면 안 덮인다 (≈1/6). 동일 트리 8회 연속 측정에서
  r1–r3 이 `139`, r4–r8 이 `138` 이었고 집합 차이는 슬롯 `229:38.0` **단 1건**,
  원본 hit 배열은 `[21,1] ↔ [0,22]` 였다 — 같은 22회 호출 중 참 분기 적중 수만 바뀌었다.

  개수 비교로는 "1 차이" 까지만 보이던 것을 **슬롯 집합 비교가 이름으로 특정**했고,
  그 이름이 곧바로 소스 라인을 가리켰다. `770ae37` 에서 테스트 시각을 고정해 제거했다
  (setupTests 이디엄대로 `vi.useFakeTimers({shouldAdvanceTime:true})` + `setSystemTime`,
  해제는 전역 `afterEach`). 고정 후 15 측정 전부 `137`.

  진동이 상수가 아니라 결함이었으므로 강등의 전제가 소멸했다. 이관처
  `TSK-20260829-07` 의 산출물(`scripts/coverage-slot-set-compare.sh`)을 판정 명령으로
  삼아 복귀시킨다.

- **수용 기준 3 (전수 4축) 은 복귀했다 (2026-08-29).** 같은 날 오전 실측에서는 거짓이었다 —
  base `2458·1173·423·2293` vs shuffle `2459·1173·424·2294` 로 statements·functions·lines 가
  각 1 씩 갈렸다. 원인을 규명해 제거했다.

  개수만으로는 "1 다르다" 까지가 한계라 슬롯 집합을 비교했고, 갈린 슬롯이
  **`f[17]` · `s[110]` 둘뿐이며 둘 다 같은 줄**임이 드러났다 —
  `src/Comment/Comment.tsx:261` 의 `completed={() => setIsShowToaster(2)}`.

  이 콜백은 Toaster 가 duration(2000ms) 뒤에 부르는 실타이머 콜백이다. 그 줄의 커버리지는
  **어떤 테스트도 의도하지 않은 우발적 발화**에 달려 있었다 — 실타이머로 토스터를 띄운
  테스트가 언마운트 전까지 2초를 넘기면 덮이고 아니면 안 덮인다. `434efe7` 에서
  자동 닫힘을 시간 고정 계약으로 세워 항상 덮이게 했다.

  수정 후 base 와 shuffle(seed=424242) 의 슬롯 집합 차이 0건, s/b/f 전부
  `2477/1183/430` 으로 동일. 판정 명령은 `scripts/coverage-order-independence-full.sh`.

  > 이 축의 두 진동(본 항목의 `Comment.tsx:261`, 수용 기준 2 의 `common.ts:229`)은
  > 원인이 같은 부류였다 — **테스트가 벽시계에 결박된 코드 경로**. 개수 비교로는 둘 다
  > "1 차이" 로만 보였고, 슬롯 집합 비교가 양쪽 모두 이름으로 특정했다.

- **전수 테스트 (`npm test`) rc** — 중복 게이트 부류 (RULE-07 §반려 시그널). 위반 시 `.husky/pre-push:3` (`npm test` 가 스크립트 마지막 행이므로 그 rc 가 훅 rc 이며 실패 시 push 차단) 과 `.github/workflows/ci.yml:70-71` (`- name: Test`) 가 즉시 실패하므로 체크박스가 더하는 검출력이 0 이다. §동작 6(회귀 없음)의 발화 채널은 그 두 실경로로 유지된다 (RULE-07 §promote 조건 4).
- 순서 종속이 UA 외 다른 전역에도 존재하는지의 전수 확인 — 현 트리의 `Object.defineProperty(window…` 사용처는 UA 계열이 유일하며, 신규 도입분은 §동작 4 정적 검사가 담당한다.
- §동작 4 게이트의 민감도(복원 등록 제거 주입 시 `rc≠0`)와 특이도(정상 변형에서 오탐 없음)는 '가정 주입 요구' 부류이므로 체크박스로 두지 않고 **해당 게이트 도입 task 의 DoD 로 이관**한다 (`RULE-06 §게이트 실효 검증`).
- coverage provider 선택(`v8` ↔ `istanbul`) 은 본 축과 직교한다 — 양 provider 에서 동일 관측이다.
- **순서 종속 채널의 실재·폐쇄 직접 증거** (developer 실측, DoD 밖 추가 측정). 변경 전 커밋 `42c48e7`(원복 훅 0건)를 저장소 밖 워크트리에 체크아웃해 동일 명령을 실행하니 `base=139 / seed=138,138` — 본 계약 등록 시점 기록 수치까지 정확히 재현됐다. `49793e7`(프로퍼티별 원복 훅 등록)에서는 `base=140 / seed=140,140` 로 일치했고 2회차는 `139/139/139` 로 역시 상호 일치했다. 즉 델타 1 슬롯은 원복 훅 등록만으로 소멸했다 — 순서 종속 채널이 실재했고 닫혔다는 직접 증거다. **회차 간 절대값 140↔139 이동은 별 축이며 수용 기준은 절대값을 고정하지 않는다.**
- **수용 기준 2 의 rc 진동** (inspector 실측, HEAD `49793e7` 3회). 동일 HEAD·동일 명령에서 `139/139/140`(rc=1) · `139/139/139`(rc=0) · `139/139/139`(rc=0). 상호 일치 판정이 `10.followups/20260826-1730-coverage-slot-cold-start-nondeterminism` 축의 cold-start 슬롯 이동에 오염되어 결정적 rc 판정이 되지 못한다.
- **측정 대상 불일치** — §동작 2 는 "동일한 covered 슬롯 **집합**" 을 선언하는데 수용 기준 2 의 명령은 `total.branches.covered` 라는 **스칼라 개수**를 측정한다. 개수는 집합의 성긴 대리물이며, 순서와 무관한 슬롯 1건의 교체가 개수를 흔들어 위 진동이 새어 든다. `blue/testing/acceptance-command-measures-declared-subject` 위반에 해당하므로 명령을 슬롯 집합 비교로 교정하는 것이 위 오염의 근본 해법이다 — 후속 task 축.
- `src/common/common.ts` 의 branches covered **절대값**이 동일 플래그·동일 트리의 반복 호출에서 1 슬롯 이동하는 것이 본 계약 등록 시점에 관측됐다 (139 ↔ 138). 원인 미규명이며 §수용 기준은 절대값을 고정하지 않고 동일 세션 3회 실행의 상호 일치만 요구한다. 순서 축과 별개의 잔여 비결정성일 수 있으므로 원인 규명은 후속 과제다.

## 변경 이력
- 2026-08-29 operator: **수용 기준 3 복귀** — 전수 진동의 원인을 슬롯 집합 비교로 `Comment.tsx:261`(Toaster 자동 닫힘 콜백) 단일 지점으로 특정하고 `434efe7` 에서 시간 고정 계약으로 세워 제거. 판정 명령 `scripts/coverage-order-independence-full.sh` 신설 (모집단 하한 1000 슬롯 — 축소 시 통과가 아니라 exit 2). §수용 기준 전수 `[x]` 3건. promote-verify: 3/3 rc0.
- 2026-08-29 operator: **수용 기준 2 복귀** — 진동 원인이 순서가 아니라 테스트의 벽시계 의존(`common.ts:37` 로거 → `:229` `ss<10` 삼항)임을 슬롯 집합 비교로 특정하고 `770ae37` 에서 제거. 판정 명령을 `scripts/coverage-slot-set-compare.sh` (슬롯 **집합** 비교, `TSK-20260829-07` 산출)로 교체하고 `[x]`. 수용 기준 3(전수 4축)은 base 와 shuffle 이 statements·functions·lines 에서 각 1 씩 갈리는 것을 실측해 강등 유지 + §참고로 실제 이관 (마커만 단 채 수용 기준에 두지 않는다). 발화 채널 라인 번호 현 HEAD 로 갱신. promote-verify: 2/2 rc0.

- 2026-08-26 — REQ-20260825-003 흡수, green 신규 등록 (inspector).
- 2026-08-27 inspector: §수용 기준 1 `[x]` — HEAD `49793e7` 재실행 rc=0 (`missing=0`, 4 파일 4 프로퍼티 전수 복원 등록).
- 2026-08-27 inspector: §수용 기준 2 재실행 3회 rc 진동 확인 → `[ ]` 유지. 등록 시점 델타 서명 소멸 반영, 순서 채널 폐쇄 증거·측정 대상 불일치 §참고 박제.
- 2026-08-27 inspector: `npm test` 항목을 중복 게이트로 §참고 강등 + 발화 채널 실경로 박제.
- 2026-08-29 operator: 수용 기준 2·3 §참고 강등 — 순서 미변경 기본 실행 5회에서 진동을 재현해 순서 축이 아님을 확정. 이관처(판정 명령 슬롯 집합 교정) 표기.
