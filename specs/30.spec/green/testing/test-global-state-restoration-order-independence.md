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

- [x] **재정의된 프로퍼티별로** 복원 등록이 존재한다 — 부재 프로퍼티 0건. 판정은 훅 등록 한정 패턴이며 `it` 본문 직렬 호출을 등록으로 계수하지 않는다.

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
- [ ] `src/common/common.ts` 의 branches covered 가 **기본 순서 · 두 shuffle seed** 3회 실행에서 모두 동일하다. 현 HEAD 실측 rc=1 — 두 차례 측정에서 `base=139 / seed=138,138` 과 `base=138 / seed=137,137`. **절대값은 호출간 이동하나 base−shuffle 델타 1 슬롯은 양쪽에서 동일**하므로 판정은 절대값이 아니라 3회 실행의 상호 일치로 한다.

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

- [ ] 전수 커버리지 4축 수치가 기본 순서와 shuffle 실행에서 동일하다 (FR-03 전수 축). 위 명령의 파일 한정(`src/common/common.test.ts` · `--coverage.include`)을 전수로 확장해 판정한다.
- [ ] 전수 테스트가 통과한다 — `npm test` → rc=0.

## 참고

### 미측정·비판정 항목

- 순서 종속이 UA 외 다른 전역에도 존재하는지의 전수 확인 — 현 트리의 `Object.defineProperty(window…` 사용처는 UA 계열이 유일하며, 신규 도입분은 §동작 4 정적 검사가 담당한다.
- §동작 4 게이트의 민감도(복원 등록 제거 주입 시 `rc≠0`)와 특이도(정상 변형에서 오탐 없음)는 '가정 주입 요구' 부류이므로 체크박스로 두지 않고 **해당 게이트 도입 task 의 DoD 로 이관**한다 (`RULE-06 §게이트 실효 검증`).
- coverage provider 선택(`v8` ↔ `istanbul`) 은 본 축과 직교한다 — 양 provider 에서 동일 관측이다.
- `src/common/common.ts` 의 branches covered **절대값**이 동일 플래그·동일 트리의 반복 호출에서 1 슬롯 이동하는 것이 본 계약 등록 시점에 관측됐다 (139 ↔ 138). 원인 미규명이며 §수용 기준은 절대값을 고정하지 않고 동일 세션 3회 실행의 상호 일치만 요구한다. 순서 축과 별개의 잔여 비결정성일 수 있으므로 원인 규명은 후속 과제다.

## 변경 이력

- 2026-08-26 — REQ-20260825-003 흡수, green 신규 등록 (inspector).
- 2026-08-27 inspector: §수용 기준 1 `[x]` — HEAD `49793e7` 재실행 rc=0 (`missing=0`, 4 파일 4 프로퍼티 전수 복원 등록).
