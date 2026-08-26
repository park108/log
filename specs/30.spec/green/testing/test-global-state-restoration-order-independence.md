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

- [ ] **재정의된 프로퍼티별로** 복원 등록이 존재한다 — 부재 프로퍼티 0건. 판정은 훅 등록 한정 패턴이며 `it` 본문 직렬 호출을 등록으로 계수하지 않는다.

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
- [ ] 서로 다른 두 shuffle seed 실행의 전수 branches covered 가 동일하다.
- [ ] 기본 순서 실행과 shuffle 실행의 전수 branches covered 가 동일하다.
- [ ] `src/common/common.ts` UA 3항 연쇄의 전 슬롯이 shuffle 실행에서도 covered 다.
- [ ] 전수 테스트가 통과한다.

## 참고

### 미측정·비판정 항목

- 순서 종속이 UA 외 다른 전역에도 존재하는지의 전수 확인 — 현 트리의 `Object.defineProperty(window…` 사용처는 UA 계열이 유일하며, 신규 도입분은 §동작 4 정적 검사가 담당한다.
- §동작 4 게이트의 민감도(복원 등록 제거 주입 시 `rc≠0`)와 특이도(정상 변형에서 오탐 없음)는 '가정 주입 요구' 부류이므로 체크박스로 두지 않고 **해당 게이트 도입 task 의 DoD 로 이관**한다 (`RULE-06 §게이트 실효 검증`).
- coverage provider 선택(`v8` ↔ `istanbul`) 은 본 축과 직교한다 — 양 provider 에서 동일 관측이다.

## 변경 이력

- 2026-08-26 — REQ-20260825-003 흡수, green 신규 등록 (inspector).
