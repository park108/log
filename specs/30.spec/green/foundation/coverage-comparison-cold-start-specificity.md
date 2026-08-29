# 커버리지 대조 판정은 콜드 스타트 측정 오차를 계약 위반으로 읽지 않는다

> **위치**: `scripts/check-coverage-attribution-monotonicity.sh` (`package.json` `scripts.check:coverage-attribution` 진입, 현 HEAD 는 소비자 1겹 경유).
> **관련 요구사항**: REQ-20260827-033 (coverage-measurement-cold-start-false-positive-specificity)
> **최종 업데이트**: 2026-08-29 (by inspector — tick 243, 신규 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`5a697f8`).
> cross-ref 는 **slug 로만** 쓴다 — 전체 경로를 쓰면 참조 대상이 승격될 때 dangling 이 된다.

## 역할

**슬롯 대조 판정은 콜드 스타트 측정 오차를 판정 입력으로 삼지 않는다.** 측정 오차와 계약 위반은 **다른 사건**이며, 전자가 후자의 `rc` 로 새어 들지 않는다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 §역할 이 요구하는 대로 **방어 대상을 명시한다**:

> **위반이 없는데 게이트가 붉어지는 사건 — 게이트의 특이도(false positive).**

**이 방향은 현행 검증 체계가 구조적으로 잡지 못한다.** `RULE-06 §게이트 실효 검증` 의 주입 왕복은 **민감도**(위반을 잡는가)를 재고, 콜드 스타트 오탐은 **특이도** 축이다. 게다가 오탐이 **비결정적**(1회차에만 발현)이라 `RULE-06 §음성 대조` 의 1회 대조로도 재현되지 않는다 — 대조를 warm 상태에서 돌리면 통과한다. 즉 **주입 `N/N detect` 와 대조 `M/M pass` 를 둘 다 통과하면서 존속하는 부류**다.

조용한 손상은 두 겹이다. **직접** — CI·pre-push 가 존재하지 않는 회귀로 붉어지고 1회 오진의 비용이 전수 재실행 7~8분이다. **파생(더 위험)** — 오탐이 반복되면 그 붉음이 신뢰를 잃고, 진짜 단조성 위반이 같은 표면으로 왔을 때 잡음으로 처리된다. **게이트의 판정력이 규약이 아니라 관행으로 소멸한다.**

이 계약이 의도적으로 하지 **않는** 것:

- (i) **판정 완화·임계 하향·allowlist.** 흡수 폭을 넓히는 것이 아니라 측정 오차와 계약 위반을 **다른 사건으로 분리**하는 것이다. blue `gate-failure-classification-and-evidence-parity` §역할 (i) 도 같은 배제를 선언한다.
- (ii) **콜드 스타트의 근본 원인 규명.** vite transform 캐시 · istanbul provider 콜드 로드 · 모듈 초기화 분기 중 무엇인지는 미규명이며, **원인 규명 없이도 판정 규약은 성립한다**. 원인 축은 별건.
- (iii) **무엇을 위반으로 볼 것인가** — 샤드 열거·소실 슬롯 정의는 blue `coverage-per-file-attribution-monotonicity` 소관이다. 본 계약은 **정상 입력이 위반으로 오분류되는 축**이라 그것과 직교한다.
- (iv) **등급 체계 신설.** 흡수 사건의 등급은 기존 `RC_CLASS` / `rc_rank` 단일 코어를 재사용한다 (`:245-252`). 헤더 `:246-247` 이 *"여기가 유일한 등급 사상이다. 사본을 두면 주입은 실집행을 대변하지 못한다"* 로 이미 선언했다.
- (v) **자매 게이트 `check:coverage-slot-order-invariance`** — 같은 축을 이미 격리 완료했다 (§동작 §비대칭 실측).
- (vi) **커버리지 임계치(branches 94% 등) 조정.**

## 공개 인터페이스

본 계약은 공개 인터페이스를 갖지 않는다 (판정 규약). 관측 표면은 셋이다.

- **(C-ISO) 격리 수단** — 콜드 스타트 1회차 측정이 판정 입력에서 배제되는가. 수단은 택일이다: (a) 폐기용 warm-up 후 측정, (b) 동일 조건 N회 실행의 상호 일치.
- **(C-ACK) 격리 사실의 관측 가능성** — 무엇을 배제·흡수했는지가 **산출에 박제**되는가. 적지 않으면 게이트가 오염을 조용히 가리는 것과 구별되지 않는다.
- **(C-KEEP) 검출력 보존** — 흡수가 실제 소실 슬롯·공허 산출물의 검출을 삭감하지 않는가. **이 셋이 동시에 성립해야 계약이다.**

(C-ACK) 가 (C-ISO) 와 분리된 항목인 이유는, 격리가 **구현됐지만 관측되지 않는** 상태와 **구현되지 않은** 상태가 산출상 구별되지 않기 때문이다. 자매 게이트의 `warmup=done(discarded)` ack (`check-coverage-slot-order-invariance.sh:208`) 이 그 선례다.

## 동작

1. 슬롯 대조는 **전수 실행이 커버한 슬롯 집합**을 기준으로 샤드가 커버한 슬롯의 포함 관계를 본다. 따라서 전수 실행이 콜드 쪽(낮은 값)으로 잡히면 샤드에는 있고 전수에는 없는 슬롯이 생겨 **소실 슬롯 ≥ 1 = 계약 위반**으로 나간다. 구현은 아무것도 위반하지 않았다.
2. 그러므로 전수 층 측정은 **콜드 1회차를 판정 입력으로 삼지 않는다** — 폐기용 실행을 선행하거나, 동일 조건 반복의 상호 일치를 요구한다.
3. 격리 수행 사실은 **산출 1행 ack** 로 발화된다. 수단(폐기 실행 / 반복 일치)과 그 수행 여부가 함께 읽혀야 한다.
4. 격리는 **전수 층에만** 적용되고 등급 체계를 바꾸지 않는다. 흡수된 사건은 통과(`0`)가 아니라 기존 등급 사상의 **측정 실패 등급**으로 분류될 수 있다.
5. 흡수 도입 후에도 실제 소실 슬롯은 `exit 1` 로 열거되고, 공허 산출물은 `exit 3` 으로 남는다 (`--allow-empty` 는 전수 층에 적용되지 않는다).
6. 판정 경로는 covered 슬롯 **절대값을 임계로 고정하지 않는다**. 회차 간 절대값 이동은 별 축이며 그 잡음이 이 축의 `rc` 로 새어 들지 않는다.

### 절대값은 흔들리고 델타는 흔들리지 않는다

동일 트리·동일 명령의 반복 실행에서 covered 분기 슬롯 절대값이 1 슬롯 이동한다 — 1회차만 낮고 이후 안정한다. 운영자 신고 재현:

```
npx vitest run src/common/common.test.ts --coverage \
  --coverage.include="src/common/common.ts" --coverage.reporter=json-summary
  → run 1: 138 / run 2: 139 / run 3: 139 / run 4: 139
```

독립 관측 3건이 같은 축을 가리킨다 — inspector 15차 `base 139→138 · seed 20260824 138→137 · seed 424242 138→137` (**base−shuffle 델타는 두 측정에서 1 로 동일**), inspector 1차 `full-suite 1112 vs 1111`, 별건 followup 3회차 `1112 / 1111 / 1111` (statements·functions·lines 는 불변).

**델타가 안정하고 절대값만 흔들린다**는 것이 이 축의 서명이다. 그래서 판정은 절대값이 아니라 포함 관계에 걸려야 하며, 포함 관계를 재는 두 측정의 **회차 조건이 같아야** 한다. 현 판정은 전수 1회 + 샤드 N회를 서로 다른 워밍 상태에서 재고 그 차이를 위반으로 읽는다.

### 비대칭 실측 (HEAD=`5a697f8`)

| 게이트 | 콜드 격리 | 근거 |
|---|---|---|
| `check:coverage-slot-order-invariance` | **있음** | `SLOT_ORDER_WARMUP="${COVERAGE_SLOT_ORDER_WARMUP:-1}"` (`:63`), 폐기용 실행 (`:165-169`), ack `warmup=done(discarded)` (`:208`) |
| `check:coverage-attribution` | **없음** | `grep -ncE "warm|웜|폐기|cold|콜드" scripts/check-coverage-attribution-monotonicity.sh` → **0** |

**이 축은 저장소가 이미 인정하고 한 곳에서 닫은 문제이며, 슬롯 대조를 실제로 수행하는 게이트에는 적용되지 않았다.** `TSK-20260827-05`(`9eeaa29`) 가 교정한 것은 자매 게이트다. 전자의 헤더 `:29-31` 은 격리 대상을 이 신고로 명시한다.

### 판정 채널 — 전수 측정을 구동하지 않고 잰다

본 계약의 수용 기준은 **`check:coverage-attribution` 의 측정 모드(M1, 4~6분)를 구동하지 않는다.** 두 경량 채널을 쓴다.

- **대조 모드 (M2)** — `--full <json> --subset <json>` 으로 이미 존재하는 산출물 2개만 비교한다. `mktemp -d` 픽스처로 즉시 판정되며 등급 `0/1/3` 이 전부 재현된다.
- **자기 검사 (`--self-test`)** — 조건 8종·우선순위 6쌍을 **실제 판정 코어(`judge`)를 구동해** 확인한다. 등급 사상을 흉내내지 않는다 (스크립트 헤더 선언).

격리 사실을 (C-ACK) 로 요구할 때 그 관측처를 `--self-test` 로 두는 이유가 여기에 있다. 격리를 M1 안에만 두면 **그 격리가 실제로 동작하는지 재는 데 매번 4~6분이 들고**, 그 비용은 검증을 생략시킨다 — `RULE-06 §게이트 실효 검증` 이 요구하는 주입 왕복이 수행되지 않는 상태로 굳는다. 자기 검사 채널에 조건으로 등재되면 격리는 매 실행에서 0초에 재현된다.

## 의존성

- 내부: `scripts/check-coverage-attribution-monotonicity.sh` (판정 코어 · `RC_CLASS`/`rc_rank` `:245-252`), `scripts/check-coverage-slot-order-invariance.sh` (선례 구현), `package.json` `scripts.check:coverage-attribution`.
- 외부: `node` · `npx vitest` (측정 모드) · POSIX `grep`.
- 역의존: blue `coverage-per-file-attribution-monotonicity` (무엇을 위반으로 볼 것인가), blue `gate-failure-classification-and-evidence-parity` (판정 실패의 보고 형식), green `measurement-tree-attribution-wrapper-adoption` (같은 게이트의 **트리 귀속** 축 — 별 결함이다).

## 발화 채널

`package.json` `scripts.check:coverage-attribution` → `.github/workflows/ci.yml` step. 현 HEAD 에 실재하며 **신규 채널 부착은 불필요**하다 (`RULE-07 §promote 조건 4` 충족). 본 계약이 요구하는 것은 새 채널이 아니라 **기존 채널의 특이도**다.

## 테스트 현황

- [x] 민감도 — 소실 슬롯 주입 시 `exit 1` + 슬롯 열거 (M2 픽스처).
- [x] 공허 검출 — 전수 covered 0 시 `exit 3`, `--allow-empty` 로 면제되지 않음.
- [x] 등급 사상 단일 코어 — `--self-test` 조건 8종·우선순위 6쌍 전수 일치.
- [ ] 콜드 격리 — HEAD 부재 (`grep` 0 hit). (S-1) 의 부착 대상.

## 수용 기준

> 전 항목 **명령 1회로 rc 판정 가능** (`RULE-07 §수용 기준 문장 규약`). 명령은 `scripts/**` 산출만 참조하며 **어떤 spec 의 green/blue 경로 리터럴도 참조하지 않는다** (`§promote 조건 2`). **측정 모드(M1, 4~6분)를 구동하지 않는다** (§동작 §판정 채널). 픽스처는 전부 `mktemp -d` 아래에 만들고 저장소 트리를 건드리지 않는다.
>
> **HEAD=`5a697f8` (tick 243) 기준 4/5** — 미충족 1건은 (S-1) 이며 **이것이 본 계약의 판정량**이다. 나머지 4항은 흡수가 도입될 때 **깎이면 안 되는 것**을 고정한다 — 판정량 없이 보존 항목만 있으면 계약이 공허하고, 보존 항목 없이 판정량만 있으면 흡수가 검출력을 먹는 방향으로 닫힌다.
>
> **(S-1) 은 green 편집으로 닫히지 않는다.** `scripts/**` 는 `RULE-01` 상 inspector writer 영역이 아니다. **게이트 수정 task 발행이 유일한 경로이며 그 주체는 planner 다.**

- [ ] (Must, S-1) 콜드 스타트 격리가 **전수 측정을 구동하지 않는 채널에서 관측**된다 — 판정: (펜스)
  ```
  o=$(bash scripts/check-coverage-attribution-monotonicity.sh --self-test 2>&1) || exit 1
  [ -n "$o" ] || exit 2
  printf '%s\n' "$o" | grep -qiE 'cold|콜드|warm|웜' || exit 1
  ```
  → **rc=0**. **HEAD=`5a697f8` (tick 243) 실측 rc=1 → 미충족.** 자기 검사 채널은 `rc=0` 으로 정상 발화하나(`조건 8종 · 우선순위 6쌍 · 루프 부착 6`) 산출에 격리 조건이 **0건**이다. 판정 입력을 **스크립트 본문 `grep` 이 아니라 산출**로 둔 것이 요지다 — 본문 `grep` 은 주석에 단어를 적어 두면 통과하는 공허 기준이며(`RULE-06 §관측 표면`), 실제로 §비대칭 실측 의 본문 `grep` 0 hit 은 **baseline 관측**이지 판정이 아니다. 빈 산출은 `exit 2` 무판정으로 가른다.
- [x] (Must, S-2) **민감도 보존** — 실제 소실 슬롯이 있는 입력은 여전히 `exit 1` 이고 슬롯이 **열거**된다 — 판정: (펜스)
  ```
  D=$(mktemp -d) || exit 2
  [ -n "$D" ] || exit 2
  R=$(pwd)
  printf '{ "%s/src/probe.js": { "b": { "0": [1, 0] } } }\n' "$R" > "$D/full.json" || exit 2
  printf '{ "%s/src/probe.js": { "b": { "0": [0, 1] } } }\n' "$R" > "$D/sub.json" || exit 2
  o=$(bash scripts/check-coverage-attribution-monotonicity.sh --full "$D/full.json" --subset "$D/sub.json" --label probe 2>&1); r=$?
  [ "$r" -eq 1 ] || exit 1
  printf '%s\n' "$o" | grep -qE '\[VIOLATION\].*소실 슬롯 1: 0\.1' || exit 1
  ```
  → **rc=0**. **HEAD=`5a697f8` (tick 243) 실측 rc=0.** 산출 `[probe] [VIOLATION] src/probe.js — 소실 슬롯 1: 0.1` · `[FAIL] [probe] 단조성 위반`. 수치만이 아니라 **슬롯 좌표 열거**를 요구한다 — 흡수를 도입하며 열거를 잃으면 수리 주체가 대상을 특정할 수 없고, 그것은 검출력이 남아 있어도 판정이 쓸모를 잃은 상태다.
- [x] (Must, S-3) **공허가 통과로 읽히지 않는다** — 전수 covered 0 은 `exit 3` 이며 `--allow-empty` 로 면제되지 않는다 — 판정: (펜스)
  ```
  D=$(mktemp -d) || exit 2
  [ -n "$D" ] || exit 2
  R=$(pwd)
  printf '{ "%s/src/probe.js": { "b": { "0": [0, 0] } } }\n' "$R" > "$D/e.json" || exit 2
  o=$(bash scripts/check-coverage-attribution-monotonicity.sh --full "$D/e.json" --subset "$D/e.json" --label probe --allow-empty 2>&1); r=$?
  [ "$r" -eq 3 ] || exit 1
  printf '%s\n' "$o" | grep -q 'VACUOUS-FULL' || exit 1
  ```
  → **rc=0**. **HEAD=`5a697f8` (tick 243) 실측 rc=0** (`[VACUOUS-FULL] 전수 covered 슬롯 0 … 면제 인자는 이 층에 적용되지 않는다`). 콜드 흡수의 가장 값싼 오구현은 **전수 측정을 통째로 신뢰하지 않는 것**이고 그 끝은 공허 산출물의 묵인이다. 이 항목이 그 방향을 막는다.
- [x] (Must, S-4) **covered 절대값을 임계로 고정하지 않는다** — 규모가 세 자릿수 배 달라도 포함 관계만으로 판정한다 — 판정: (펜스)
  ```
  D=$(mktemp -d) || exit 2
  [ -n "$D" ] || exit 2
  R=$(pwd)
  mk() { node -e 'const fs=require("fs");const p=process.argv[1],n=+process.argv[2],c=+process.argv[3],root=process.argv[4];const a=[];for(let i=0;i<n;i++)a.push(i<c?1:0);fs.writeFileSync(p,JSON.stringify({[root+"/src/probe.js"]:{b:{"0":a}}}))' "$1" "$2" "$3" "$R"; }
  mk "$D/f-small.json" 4 3 || exit 2
  mk "$D/s-small.json" 4 2 || exit 2
  mk "$D/f-big.json" 4000 3000 || exit 2
  mk "$D/s-big.json" 4000 2000 || exit 2
  for f in f-small s-small f-big s-big; do [ -s "$D/$f.json" ] || exit 2; done
  a=$(bash scripts/check-coverage-attribution-monotonicity.sh --full "$D/f-small.json" --subset "$D/s-small.json" --label small 2>&1); ra=$?
  b=$(bash scripts/check-coverage-attribution-monotonicity.sh --full "$D/f-big.json" --subset "$D/s-big.json" --label big 2>&1); rb=$?
  printf '%s\n' "$a" | grep -qE 'full_covered=3 subset_covered=2' || exit 1
  printf '%s\n' "$b" | grep -qE 'full_covered=3000 subset_covered=2000' || exit 1
  [ "$ra" -eq 0 ] && [ "$rb" -eq 0 ] || exit 1
  ```
  → **rc=0**. **HEAD=`5a697f8` (tick 243) 실측 rc=0** (`small: full_covered=3 subset_covered=2` rc=0 · `big: full_covered=3000 subset_covered=2000` rc=0). 두 산출 수치를 **함께 단언**하는 것이 요지다 — `rc=0` 만 보면 판정이 입력을 읽지 않고 통과한 상태와 구별되지 않는다. 절대 규모는 고정하지 않고 **규모 무관성**만 요구한다. 픽스처 생성 직후 `$D` 안에 실제로 착지했는지 `[ -s ]` 로 단언한다 — `node -e` 의 `process.argv[1]` 은 스크립트 경로가 아니라 **첫 사용자 인자**이므로 인덱스를 하나 밀면 픽스처가 `mktemp` 밖(작업 트리)에 쓰이고 판정은 `산출물 부재`(`rc=2`)로 흐른다. 이 spec 을 쓰는 동안 실제로 그렇게 됐고 저장소 루트에 JSON 4건이 생겼다 — 착지 단언은 그 실패를 **오염이 아니라 무판정**으로 만든다 (`RULE-06 §추출 실패 검출`).
- [x] (Must, S-5) **등급 사상은 단일 코어이며 흡수가 사본을 만들지 않는다** — 판정: (펜스)
  ```
  o=$(bash scripts/check-coverage-attribution-monotonicity.sh --self-test 2>&1) || exit 1
  printf '%s\n' "$o" | grep -qE '^\[self-test\] OK — 조건 [0-9]+종 · 우선순위 [0-9]+쌍' || exit 1
  ```
  → **rc=0**. **HEAD=`5a697f8` (tick 243) 실측 rc=0** (`조건 8종 · 우선순위 6쌍 · 루프 부착 전부 선언과 일치`). 조건·쌍의 절대 개수는 고정하지 않는다 — 흡수 도입이 조건을 **늘리는** 것은 정상이고 (S-1) 이 그것을 요구한다. 이 항목이 고정하는 것은 **사상이 한 곳에 있다는 사실**이다. `--self-test` 가 `judge` 를 실제로 구동하므로 등급 선언과 실집행의 괴리는 여기서 발화한다.

## 참고

### 미측정·비판정 항목

- **(중복 게이트 — 체크박스 제외) 정상 트리에서 `npm run check:coverage-attribution` 이 `rc=0`.** req FR-06 이 요구했으나, 위반 시 CI·pre-push 가 즉시 실패하므로 `RULE-07 §반려 시그널` 의 중복 게이트 부류다. 또한 측정 4~6분이라 §판정 채널 이 정한 경량 원칙과도 충돌한다. 전제로만 남긴다.
- **(가정 주입 요구 — 이관) 콜드 스타트를 강제한 조건에서 계약 위반으로 보고되지 않는다.** req 수용 기준 5항의 특이도 방향이다. 콜드 조건을 만들려면 캐시를 비우고 1회차를 잡아야 하므로 **고장을 내야 검증되는** 부류이며 `RULE-07 §체크박스 부적격` 에 해당한다. 검출 방향을 보존해 이관한다 — **(민감도) 콜드 1회차를 판정 입력으로 강제 주입한 트리에서 게이트는 소실 슬롯을 보고하지 않아야 한다. (특이도) 격리를 끈 대조 트리에서는 기존 판정이 그대로 재현돼야 한다.** 이관처는 **본 계약의 게이트 수정 task** 이며 그 `## 검증/DoD` 에 `injection: 2/2 detect` · `control: M/M pass` 로 박제한다 (`RULE-06 §게이트 실효 검증` · `§음성 대조`). **이관처 task 는 현 HEAD 에 없다** — (S-1) 의 부착 task 가 곧 이관처다.
- **(미측정) 콜드 스타트의 근본 원인.** vite transform 캐시 · istanbul provider 콜드 로드 경로 · 모듈 초기화 분기 중 어느 것인지 미규명이다. §역할 (ii) 가 배제하며, 원인 규명 없이 판정 규약이 성립한다는 것이 본 계약의 입장이다.
- **(미측정) NFR-01 추가 구동 상한.** 격리 수단이 (a) warm-up 이면 전수 측정이 1회 늘고 (b) N회 상호 일치면 N배가 된다. 상한 선택은 부착 task 의 설계 사항이며 본 계약은 **무제한 반복을 채택하지 않는다**는 방향만 고정한다. 현 HEAD 에 격리가 없어 증가분을 측정할 대상 자체가 없다.

### 인접 계약 — 중복이 아닌 근거

- **blue `coverage-per-file-attribution-monotonicity`** — *무엇을 위반으로 볼 것인가*(샤드 열거 · 소실 슬롯 · 등급 0~4)를 소유한다. 본 계약은 그 판정이 **정상 입력을 위반으로 오분류하는 축**이라 직교한다. 그 spec 이 4/4 충족인 상태에서 이 오탐은 존속한다.
- **blue `gate-failure-classification-and-evidence-parity`** — 판정이 실패했을 때 *어떻게 보고할 것인가*(등급 체계)를 소유한다. 본 계약은 흡수 사건을 그 체계에 **사상할 뿐 새 등급을 만들지 않는다** (§역할 (iv)).
- **green `measurement-tree-attribution-wrapper-adoption`** — 같은 게이트를 다루지만 축이 다르다. 그쪽은 **트리가 변해서** 오보되는 축이고, 본 계약은 **트리가 그대로인데 값이 변하는** 축이다. 신고 원문 §참고 가 두 결함의 혼동을 명시적으로 경계한다. 래퍼 채택(`c7ed263`)은 이 오탐을 **줄이지 않는다** — 지문이 안정(`stable`)해도 covered 절대값은 흔들린다.
- **`check:coverage-slot-order-invariance`** — 같은 콜드 축을 자매 게이트에서 이미 닫았다. 본 계약은 그 선례를 **슬롯 대조 게이트로 이전**하는 것이며, 두 게이트가 같은 격리를 각자 소유하는 것은 중복이 아니다 (측정 대상이 다르다).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-29 | REQ-20260827-033 (inspector tick 243) | 최초 등록. **req 수용 기준 6항을 그대로 쓰지 않았다**: (a) req 1항(`npm run check:coverage-attribution` rc=0)은 **중복 게이트**라 §미측정 으로 내렸다 — CI 가 이미 집행하고 측정 4~6분이라 경량 판정 원칙과도 충돌한다. (b) req 2항(ack 존재)과 3항(절대값 임계 부재)을 **본문 `grep` 이 아니라 산출 기반**으로 재정식화했다 — 본문 `grep` 은 주석으로 충족되는 공허 기준이다(`RULE-06 §관측 표면`). 특히 3항은 "임계 상수 탐색" 이라는 **부재 증명**을 규모 무관성 대조(S-4)라는 **양성 관측**으로 바꿨다. (c) req 5항(콜드 강제 조건 특이도)은 **가정 주입 요구** 부류라 §미측정 으로 강등하되 검출 2방향을 보존해 게이트 수정 task DoD 로 **이관 표기**했다 (`RULE-07 §처리` — 이관처 없는 강등 금지). (d) req 4항을 (S-2) 로, FR-05 를 (S-5) 로 흡수하고 **(S-3) 공허 비-묵인을 신설**했다 — req 에 없으나 콜드 흡수의 가장 값싼 오구현이 전수 측정 불신임이고 그 끝이 공허 묵인이라, 판정량만 있고 보존 항목이 없으면 흡수가 검출력을 먹는 방향으로 닫힌다. (e) §동작 에 **§판정 채널** 절을 신설해 M2 대조 모드·`--self-test` 를 경량 판정 채널로 고정했다 — 실측 `--self-test` 0초 · M2 픽스처 즉시. 이로써 본 계약의 전 판정이 4~6분 측정 없이 재현된다 | all |
