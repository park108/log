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
- [deferred → §참고] `src/common/common.ts` 의 branches covered 가 **기본 순서 · 두 shuffle seed** 3회 실행에서 모두 동일하다 — 판정: 아래 `bash` 펜스. 절대값이 아니라 3회 실행의 상호 일치로 판정한다. **HEAD `49793e7` 실측 — rc 가 동일 HEAD 반복 호출에서 진동한다** (`139/139/140` rc=1 → `139/139/139` rc=0 → `139/139/139` rc=0). 등록 시점의 `base−shuffle 델타 1 슬롯` 서명은 소멸했다(아래 §참고). 잔여 진동은 순서 축이 아니라 별 축 오염이므로 본 항목은 그 축이 닫히기 전까지 `[ ]` 로 둔다.

```bash
D=$(mktemp -d)
run() {
  npx vitest run src/common/common.test.ts --coverage --coverage.reporter=json-summary \
    --coverage.reportsDirectory="$D/$1" --coverage.include='src/common/common.ts' \
    --coverage.thresholds.branches=0 --coverage.thresholds.lines=0 \
    --coverage.thresholds.functions=0 --coverage.thresholds.statements=0 \
    "${@:2}" >/dev/null 2>&1
  node -p "require('$D/$1/coverage-summary.json').total.branches.covered"
}
base=$(run base)
s1=$(run s1 --sequence.shuffle.tests --sequence.seed=20260824)
s2=$(run s2 --sequence.shuffle.tests --sequence.seed=424242)
echo "base=$base seed20260824=$s1 seed424242=$s2"
test -n "$base" && test -n "$s1" && test -n "$s2" || { echo "[EXTRACT-FAIL] empty measure"; exit 2; }
test "$base" = "$s1" && test "$base" = "$s2"
```

- [deferred → §참고] 전수 커버리지 4축 수치가 기본 순서와 shuffle 실행에서 동일하다 (FR-03 전수 축). 위 명령의 파일 한정(`src/common/common.test.ts` · `--coverage.include`)을 전수로 확장해 판정한다.

## 참고

### 미측정·비판정 항목

- **수용 기준 2·3 강등 — 순서 축으로 닫히지 않음이 측정으로 확정됐다 (2026-08-29).**
  판정 명령을 spec 에서 추출해 현 HEAD 에서 재실행했다.

  | 측정 | 결과 |
  |---|---|
  | 원 판정 (base + 2 seed) 1회차 | `base=139 seed20260824=139 seed424242=138` rc=1 |
  | 원 판정 2회차 | `base=138 seed20260824=138 seed424242=138` rc=0 |
  | **순서 미변경 기본 실행 5회** | `139 · 139 · 139 · 139 · 138` |
  | 슬롯 집합 비교 8회 (reporter=json) | 전부 `138`, 집합 완전 일치 |

  결정적 증거는 세 번째 줄이다 — **shuffle 을 전혀 쓰지 않은 기본 실행만으로도
  값이 흔들린다.** 회차 간 `base` 자체가 139→138 로 이동했다. 즉 이 항목이
  재는 것은 순서 독립성이 아니라 **다른 축의 간헐적 비결정성**이며, 순서 축을
  아무리 고쳐도 "3회 상호 일치" 판정은 닫히지 않는다.

  네 번째 줄은 진동이 상시가 아님을 보인다 — 8회 연속 안정이었다. 조건은
  미규명이나 순서와 무관함은 위에서 확정됐다.

  §동작 2 가 선언한 것은 "동일한 covered 슬롯 **집합**" 인데 판정 명령은
  `total.branches.covered` 라는 **스칼라 개수**를 잰다 (§아래 측정 대상 불일치
  항목). 개수는 집합의 성긴 대리물이라 순서와 무관한 슬롯 교체까지 흡수한다.
  근본 해법은 명령을 슬롯 집합 비교로 바꾸는 것이며 그때 비로소 순서 축만
  판정된다 — **후속 task 축**. 그 전까지 체크박스로 두면 영구 미충족이 되어
  promote 를 막는 것 외에 아무 검출력이 없다 (`RULE-07 §수용 기준 문장 규약`).

  이관처: 판정 명령 교정 task (슬롯 집합 비교 + 진동 원인 규명).

- **전수 테스트 (`npm test`) rc** — 중복 게이트 부류 (RULE-07 §반려 시그널). 위반 시 `.husky/pre-push:3` (`npm test` 가 스크립트 마지막 행이므로 그 rc 가 훅 rc 이며 실패 시 push 차단) 과 `.github/workflows/ci.yml:84` (`- name: Test`) 가 즉시 실패하므로 체크박스가 더하는 검출력이 0 이다. §동작 6(회귀 없음)의 발화 채널은 그 두 실경로로 유지된다 (RULE-07 §promote 조건 4).
- 순서 종속이 UA 외 다른 전역에도 존재하는지의 전수 확인 — 현 트리의 `Object.defineProperty(window…` 사용처는 UA 계열이 유일하며, 신규 도입분은 §동작 4 정적 검사가 담당한다.
- §동작 4 게이트의 민감도(복원 등록 제거 주입 시 `rc≠0`)와 특이도(정상 변형에서 오탐 없음)는 '가정 주입 요구' 부류이므로 체크박스로 두지 않고 **해당 게이트 도입 task 의 DoD 로 이관**한다 (`RULE-06 §게이트 실효 검증`).
- coverage provider 선택(`v8` ↔ `istanbul`) 은 본 축과 직교한다 — 양 provider 에서 동일 관측이다.
- **순서 종속 채널의 실재·폐쇄 직접 증거** (developer 실측, DoD 밖 추가 측정). 변경 전 커밋 `42c48e7`(원복 훅 0건)를 저장소 밖 워크트리에 체크아웃해 동일 명령을 실행하니 `base=139 / seed=138,138` — 본 계약 등록 시점 기록 수치까지 정확히 재현됐다. `49793e7`(프로퍼티별 원복 훅 등록)에서는 `base=140 / seed=140,140` 로 일치했고 2회차는 `139/139/139` 로 역시 상호 일치했다. 즉 델타 1 슬롯은 원복 훅 등록만으로 소멸했다 — 순서 종속 채널이 실재했고 닫혔다는 직접 증거다. **회차 간 절대값 140↔139 이동은 별 축이며 수용 기준은 절대값을 고정하지 않는다.**
- **수용 기준 2 의 rc 진동** (inspector 실측, HEAD `49793e7` 3회). 동일 HEAD·동일 명령에서 `139/139/140`(rc=1) · `139/139/139`(rc=0) · `139/139/139`(rc=0). 상호 일치 판정이 `10.followups/20260826-1730-coverage-slot-cold-start-nondeterminism` 축의 cold-start 슬롯 이동에 오염되어 결정적 rc 판정이 되지 못한다.
- **측정 대상 불일치** — §동작 2 는 "동일한 covered 슬롯 **집합**" 을 선언하는데 수용 기준 2 의 명령은 `total.branches.covered` 라는 **스칼라 개수**를 측정한다. 개수는 집합의 성긴 대리물이며, 순서와 무관한 슬롯 1건의 교체가 개수를 흔들어 위 진동이 새어 든다. `blue/testing/acceptance-command-measures-declared-subject` 위반에 해당하므로 명령을 슬롯 집합 비교로 교정하는 것이 위 오염의 근본 해법이다 — 후속 task 축.
- `src/common/common.ts` 의 branches covered **절대값**이 동일 플래그·동일 트리의 반복 호출에서 1 슬롯 이동하는 것이 본 계약 등록 시점에 관측됐다 (139 ↔ 138). 원인 미규명이며 §수용 기준은 절대값을 고정하지 않고 동일 세션 3회 실행의 상호 일치만 요구한다. 순서 축과 별개의 잔여 비결정성일 수 있으므로 원인 규명은 후속 과제다.

## 변경 이력

- 2026-08-26 — REQ-20260825-003 흡수, green 신규 등록 (inspector).
- 2026-08-27 inspector: §수용 기준 1 `[x]` — HEAD `49793e7` 재실행 rc=0 (`missing=0`, 4 파일 4 프로퍼티 전수 복원 등록).
- 2026-08-27 inspector: §수용 기준 2 재실행 3회 rc 진동 확인 → `[ ]` 유지. 등록 시점 델타 서명 소멸 반영, 순서 채널 폐쇄 증거·측정 대상 불일치 §참고 박제.
- 2026-08-27 inspector: `npm test` 항목을 중복 게이트로 §참고 강등 + 발화 채널 실경로 박제.
- 2026-08-29 operator: 수용 기준 2·3 §참고 강등 — 순서 미변경 기본 실행 5회에서 진동을 재현해 순서 축이 아님을 확정. 이관처(판정 명령 슬롯 집합 교정) 표기.
