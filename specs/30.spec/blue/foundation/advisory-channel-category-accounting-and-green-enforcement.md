# ADVISORY 채널은 계수와 열거의 부류가 대응하고, green 귀속 이탈은 rc 로 집행된다

> **위치**: `scripts/check-acceptance-criteria.sh` 의 `emit_advisory` (`:121`) · `emit_bearing` (`:135`) · 계수·목록 변수 (`:99-107`) · (P-D) blue 계수 합산 (`:334-338`) · (P-D) green rc 집행 (`:344-348`). 계수+목록을 함께 올리는 대비군: G-2 (`:197-208`) · G-5 (`:351-`).
> **관련 요구사항**: REQ-20260828-044
> **최종 업데이트**: 2026-08-29 (by inspector — tick 241 drift reconcile, TSK-20260829-03 착지)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`0e5b39e`).

## 역할

**ADVISORY 는 침묵도 뭉뚱그림도 아니다 — 부류별로 계수되고, green 부류는 `rc` 를 문다.**

두 방향의 어긋남이 닫혀 있다. **(A) 계수·열거 부류 대응**: (P-D) 층의 blue 열거는 `blue_advisory` 계수에 합산되어(`:334-338`) 헤더가 열거를 포괄한다. **(B) green 축 rc 집행**: (P-D) 의 green 귀속 이탈은 `green_violations=1` 로 종료 판정에 참여한다 (`:344-348`).

> **발단 (해소됨, TSK-20260829-03 `0e5b39e`)**: (A) 는 (P-D) blue 열거가 목록에만 실리고 계수에는 실리지 않아 헤더가 `미충족 0건` 이라 말하는 바로 아래에 10줄의 항목이 붙는 상태였다 (`header=0 listed=10`). (B) 는 `pd_green_count` 가 초기화·출력·산출 세 곳에만 나타나 **정확히 계산되고 정확히 출력되며 아무것도 하지 않는** 상태였다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 방어 대상 2건을 명시한다:

> 1. **ADVISORY 계수 0 화로 검출력이 조용히 사라지는 회귀.** 상위 blue 계약이 이미 이름 붙인 회귀이며(`blue-attributed-violation-advisory-accounting:16`), 현행 출력은 그 회귀의 **부분 실현**이다 — 항목은 보이는데 계수가 0 이므로 **계수만 읽는 소비자**(요약 파서 · 후속 게이트 · 사람의 훑어보기)에게는 이미 0 이다.
> 2. **green 축이 ADVISORY 로 굳어 집행 이빨이 영구히 안 나는 회귀.** ADVISORY 는 원래 `RULE-01` writer 부재(blue)를 이유로 한 예외다. green 은 **inspector 라는 writer 가 실재**하므로 그 예외의 근거가 없다. 근거 없는 ADVISORY 가 유지되면 (P-D) 층은 green 에 대해 **민감도 0** 이다.

**하지 않는 것**: ADVISORY 정책 자체의 재검토 — blue writer 부재 근거는 유지한다. blue 189건의 개별 해소, `bearing-min`·`declare-min` 하한 수치 조정, 다른 `check:*` 로의 일괄 확장도 밖이다.

## 공개 인터페이스

- ADVISORY 헤더: `ADVISORY blue 귀속 미충족 <n>건 / blue-scanned=<m> (rc 미반영)` — `<n>` 은 같은 채널 열거 전수를 포괄하거나 부류별로 분리 표기된다.
- 열거 라인 접두: `[<부류> <귀속> …]` (예 `[G-2 blue 미래형]` · `[P-D green 선언토큰 이탈]`).
- bearing 라인: `undeclared-bearing-green=<n>` · `undeclared-bearing-blue=<n>(ADVISORY)` · `blue-scanned` · `green-scanned` 를 **같은 라인**에 유지.
- 종료 등급: green 귀속 (P-D) 이탈 ≥1 → `exit 1`.

## 동작

### FR-01 — 헤더 계수는 열거를 포괄한다 (Must)
ADVISORY 헤더의 계수는 같은 채널에 열거된 항목 전수를 포괄하거나, 부류별 계수를 헤더에 분리해 싣는다. **목록만 늘고 계수가 고정되는 상태는 위반이다.**

> 다른 blue 부류는 전부 계수와 목록을 함께 올리며, (P-D) 도 이제 같은 형태다 (`:334-338` — `blue_advisory=$((blue_advisory + pd_blue_count))` 와 목록 append 가 같은 분기 안에 있다). 구현은 **포괄 계수** 쪽을 택했다: 헤더 계수는 전수(189)이고 열거는 `head -10` 으로 자른다. 따라서 `header ≥ listed` 는 절단 때문에 자동으로 성립하는 것이 아니라 **계수가 전수이기 때문에** 성립한다 — 계수를 절단분(10)으로 맞췄다면 AC-1 은 통과하되 채널은 다시 어긋난다.

### FR-02 — 열거 라인은 부류 접두를 유지한다 (Must)
계수 통합이 **부류 소실로 번지지 않는다**. 헤더를 고치려고 목록을 뭉개면 관측이 오히려 준다.

### FR-03 — green 귀속 이탈은 rc 로 집행된다 (Must)
(P-D) green 귀속 이탈 계수가 **종료 판정에 참여**한다. 선례 형태는 같은 파일의 G-2 축이다 (`:197-208` — `if [ "$g2_green_count" -ne 0 ]; then … exit 1`).

### FR-04 — 집행 전환은 green 이탈 0 인 상태에서 착지한다 (Must)
전환은 **전환 시점의 green 이탈이 0** 임을 같은 실행 출력으로 보인 뒤에만 착지한다. 붉은 상태로 착지시켜 후속 작업을 막지 않는다.

> 이것은 편의가 아니라 순서 계약이다. green 이탈의 교정 권한은 `RULE-01` 상 **inspector 전용**이므로, developer 가 집행을 켠 채 붉은 트리를 남기면 그 붉음을 끌 수 있는 주체가 그 세션에 없다. 실제로 이 축의 착지가 그 이유로 한 번 보류됐다.
>
> **착지는 이 순서를 지켰다** — `0e5b39e` 시점 `undeclared-bearing-green=0` 이 같은 실행 출력에 있었고, 집행이 켜진 뒤 tick 241 의 green 편집 3건이 전부 rc=0 으로 통과했다. 즉 집행은 켜졌고 이빨은 아직 아무도 물지 않았다 — 그것이 FR-04 가 요구한 상태다.

### FR-05 — 전환 후 민감도는 주입으로 증명한다 (Must)
`RULE-06 §게이트 실효 검증`. 주입 왕복은 구현 task 의 DoD 에 귀속한다 (§게이트 실효 검증 이관).

### FR-06 — 모집단은 계수와 같은 라인에 유지된다 (Must)
`blue-scanned` · `green-scanned` 를 계수와 함께 읽게 유지한다 — **모집단 축소로 계수를 0 으로 만드는 값싼 해소**를 구별하기 위함이다.

### 발화 채널 (RULE-07 §promote 조건 4)
`package.json` `scripts.check:acceptance-criteria` · `.github/workflows/ci.yml:61` · `.husky/pre-commit` — **현 HEAD 실재**. 본 계약은 기존 채널의 등급·계수를 바꿀 뿐 새 채널을 요구하지 않는다.

## 의존성
- 내부: `scripts/check-acceptance-criteria.sh` · `specs/30.spec/{blue,green}/**` (판정 대상).
- 외부: POSIX sh · awk · grep.
- 인접 계약: `foundation/blue-attributed-violation-advisory-accounting` (blue — **상위 일반 명제**).
- 역의존: inspector 의 green spec 작성 (집행 전환 후 (P-D) 이탈이 커밋을 막는다).

## 테스트 현황
- [x] ADVISORY 채널과 부류 접두가 실재한다 (`emit_advisory` · `emit_bearing`).
- [x] (P-D) blue 계수의 목록 포괄 (`:334-338` — `blue_advisory + pd_blue_count`, 실측 `header=189 listed=10`).
- [x] (P-D) green 축 rc 집행 (`:344-348` — `green_violations=1`, G-2 선례와 동형).

## 수용 기준

> 전 항목 **현 HEAD 에서 명령 1회로 rc 판정 가능** (`RULE-07 §수용 기준 문장 규약`).

- [x] (Must, FR-01·AC-1) **헤더 계수가 같은 채널의 열거 줄 수 이상이다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  o=$(npm run check:acceptance-criteria 2>&1)
  n=$(printf '%s' "$o" | sed -n 's/.*ADVISORY blue 귀속 미충족 \([0-9]*\)건.*/\1/p' | head -1)
  m=$(printf '%s' "$o" | grep -c 'P-D blue 선언토큰 이탈')
  echo "header=$n listed=$m"
  [ -n "$n" ] || exit 2
  [ "$n" -ge "$m" ]
  ```
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `header=189 listed=10` / rc=0 — 충족.** (직전 `ec82e08`: `header=0 listed=10` / rc=1 — 위반 baseline.) 계수는 전수 189, 열거는 `head -10` 절단분이다.
  > 헤더 추출 실패(`-n "$n"` 미충족)는 `exit 2` 무판정이다. 추출기가 낡아 빈 문자열을 얻으면 `[ "" -ge "$m" ]` 가 문법 오류로 비정상 종료하거나 참으로 새는데, 어느 쪽도 충족이 아니다.

- [x] (Must, FR-03·AC-2) **(P-D) green 이탈 계수가 종료 판정에 참여한다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  S=scripts/check-acceptance-criteria.sh
  [ -s "$S" ] || exit 2
  n=$(sed 's/#.*//' "$S" | grep -cE 'if \[ "\$pd_green_count" -ne 0 \]')
  g=$(sed 's/#.*//' "$S" | grep -cE 'if \[ "\$g2_green_count" -ne 0 \]')
  echo "pd-enforced=$n reference-form=$g"
  [ "$g" -ge 1 ] || exit 2
  [ "$n" -ge 1 ]
  ```
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `pd-enforced=1 reference-form=1` / rc=0 — 충족** (`:344`). (직전 `ec82e08`: `pd-enforced=0 reference-form=1` / rc=1 — 위반 baseline.)
  > **관측 표면은 주석 절단 후 실행 라인이다** (`sed 's/#.*//'`) — 주석에 등급을 적어 두면 통과하는 형태를 막는다. `reference-form` 은 **선례 형태가 그 파일에 실재함**을 단언하는 비공허 대조다 (`:197`, G-2 축): 술어가 낡아 어떤 형태도 못 잡게 되면 `pd-enforced=0` 이 나오는데 그것은 위반이 아니라 무의미이므로 `exit 2` 로 가른다.
  > 이 항목은 **구조 판정이며 민감도를 대신하지 않는다.** 집행이 실제로 붉어지는지는 §게이트 실효 검증 이관 의 주입이 판정한다.

- [x] (Must, FR-04·AC-3) **green 귀속 이탈이 0 이다** — 판정: `bash -c 'npm run check:acceptance-criteria 2>&1 | grep -qE "undeclared-bearing-green=0"'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): rc=0 → 충족 — 전환 후에도 유지됨.** (직전 `ec82e08`: rc=0 — 전환 선행 조건.)
  > 착지 보류의 유일한 근거였던 `undeclared-bearing-green=2` 는 tick 239 에서 0 이 됐고(`testing/test-global-state-restoration-order-independence` 의 두 항목이 `— 판정:` 리터럴 형태로 교정됨), 그 상태에서 `0e5b39e` 가 집행을 켰다.
  > 이 항목은 전환 후에도 **상시 유지 대상**이다 — 전환 전에는 이것만이 순서 계약(FR-04)을 쟀고, 전환 후에는 green spec 편집이 스스로 어긋나지 않았음을 잰다. 집행이 켜진 지금 이 값이 0 이 아니면 커밋 자체가 막힌다.

- [x] (Must, FR-02·FR-06·AC-4) **부류 접두와 모집단 2종이 보존된다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  o=$(npm run check:acceptance-criteria 2>&1)
  m=$(printf '%s' "$o" | grep -cE '^[[:space:]]+\[[A-Z0-9-]+ (blue|green) ')
  p=$(printf '%s' "$o" | grep -cE 'undeclared-bearing-green=[0-9]+.*blue-scanned=[0-9]+.*green-scanned=[0-9]+')
  echo "prefixed-lines=$m population-line=$p"
  [ "$m" -ge 1 ] && [ "$p" -ge 1 ]
  ```
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `prefixed-lines=10 population-line=1` / rc=0 — 보존됨.** 계수 통합이 부류 접두를 지우지 않았다 (FR-02 가 겨눈 값싼 해소가 발생하지 않음).
  > 두 축을 한 항목에 묶은 이유는 **둘 다 "고치다가 잃기 쉬운 것"** 이기 때문이다. FR-01 을 만족시키려 목록을 뭉개면 접두가 사라지고, 계수를 0 으로 만들려 모집단을 줄이면 모집단 라인이 사라진다. 값싼 해소 두 경로를 같은 판정으로 막는다.

- [x] (Must, NFR-02·AC-5) **ADVISORY 발화 지점 수가 줄지 않는다** — 판정: `bash -c 'n=$(sed "s/#.*//" scripts/check-acceptance-criteria.sh | grep -cE "(^|[^_[:alnum:]])emit_advisory"); echo "n=$n"; [ "$n" -ge 9 ]'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `n=9` / rc=0 — 보존됨 (정의 1 + 호출 8).** 종료 경로별 발화가 통합 과정에서 누락되는 형태를 막는 래칫이며, 하한이므로 발화 지점이 늘어나는 방향은 막지 않는다.

- [x] (Must, NFR-01·AC-6) **게이트 단독 실행 벽시계 < 20s** — 판정: `bash -c 'S=$(date +%s); npm run check:acceptance-criteria >/dev/null 2>&1; E=$(date +%s); echo "elapsed=$((E-S))s"; [ $((E-S)) -lt 20 ]'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `elapsed=1s` / rc=0 — 보존됨.**

## 참고

### 비-중복 근거 (상위 blue 계약)
`foundation/blue-attributed-violation-advisory-accounting` (blue) 는 (A-5) ADVISORY 발화 · (A-6) green rc 집행을 **일반 명제**로 소유한다. **상호 제외는 판정 모집단으로 갈린다.**

| | 상위 blue 계약 | 본 계약 (044) |
|---|---|---|
| 판정 모집단 | **blue 트리를 스캔하는 게이트 전원** (구조 술어) | `check-acceptance-criteria.sh` 의 **(P-D) 층 내부** |
| 재는 것 | 게이트가 ADVISORY 채널을 갖는가 · green 을 집행하는가 | 채널 **내부의 계수↔열거 부류 대응** · (P-D) **층의 등급** |
| 겹치지 않는 이유 | 채널 존재를 재므로 **채널 안이 정합한지는 재지 않는다** | 채널 존재를 전제로 삼고 **재정의하지 않는다** |

상위 계약이 전수 참인 상태에서도 본 계약의 위반은 성립한다 — 착지 전 HEAD(`ec82e08`) 가 정확히 그 상태였다 (헤더 `0건` 아래 10줄).

### 미측정·비판정 항목
- **blue 189건의 개별 해소** — §역할 out-of-scope. blue 는 `RULE-01` 상 편집 writer 가 없어 `RULE-05` 경로를 통해서만 움직인다.
- **부류별 계수 분리와 포괄 계수 중 어느 표기가 나은가** — 표기 선택은 구현 재량이며 FR-01 은 둘 다 허용한다. 판정은 표기가 아니라 **계수 ≥ 열거** 다.
- **집행 전환 후 inspector 작업 부하 증가량** — 측정 채널 부재 (미측정 NFR 부류).
- **AC-7(green 선언토큰 이탈 1건 주입) · AC-8(원복)** — **가정 주입 요구** 부류이므로 체크박스로 두지 않고 §게이트 실효 검증 이관 으로 내린다.

### 착지 실측 (HEAD `0e5b39e`, tick 241)
```
AC-1 헤더 포괄        → header=189 listed=10                        rc=0
AC-2 rc 집행 구조     → pd-enforced=1 reference-form=1              rc=0
AC-3 green 이탈       → undeclared-bearing-green=0                  rc=0
AC-4 접두·모집단      → prefixed-lines=10 population-line=1         rc=0
AC-5 발화 지점        → n=9                                          rc=0
AC-6 벽시계           → elapsed=1s                                   rc=0
```
`pd_green_count` 는 이제 `:99` 초기화 · `:135` 출력 · `:327` 산출 · **`:344` 종료 판정 참여** 네 곳에 나타난다. 계산·출력에 더해 **집행**이 붙었다.

### 배경 실측 (HEAD `ec82e08`, tick 240 — 착지 전)
```
ADVISORY 헤더 계수 / (P-D) blue 열거 줄 수        → header=0  listed=10
undeclared-bearing-green                          → 0          (플립 선행 조건 충족)
undeclared-bearing-blue                           → 189(ADVISORY) / bearing-min=100
pd_green_count 종료 판정 참여                      → 0회        (선례 g2_green_count 는 1회, :197)
emit_advisory 발화 지점                            → 9          (정의 1 + 호출 8)
```
`pd_green_count` 는 당시 `:99` 초기화 · `:135` 출력 포맷 · `:327` 산출 세 곳에만 나타났다. **값은 정확히 계산되고 정확히 출력되며 아무것도 하지 않았다.**

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)
검출 방향은 **2종**이며 주입 왕복은 구현 task 의 DoD 에 귀속한다.

| 방향 | 위반 주입 | 기대 |
|---|---|---|
| Dir-1 (FR-03 민감도) | green spec 1건의 수용 기준 항목을 `판정은 …` 서술형으로 변형 (선언 토큰 이탈) | `rc≠0` + `[P-D green 선언토큰 이탈]` 라인에 그 경로 |
| Dir-2 (FR-01 민감도) | (P-D) blue 열거를 1줄 늘리는 변형 | 헤더 계수가 **함께** 증가 |

Dir-1 의 주입 형태는 실측 선례가 있다 — tick 239 가 정확히 그 이탈 2건(`판정은 …` 도입부)을 교정했다. 즉 이 주입은 가상의 고장이 아니라 **6일 전까지 실재했던 상태의 복원**이다.

> **집행은 tick 241 에 실사용으로도 관측됐다.** 이 계약을 포함한 green 편집 3건이 전부 (P-D) green 축 rc 집행이 켜진 상태에서 커밋됐고 `undeclared-bearing-green=0` 을 유지했다. 이것은 특이도(정상 편집을 막지 않음) 쪽 관측이며, 민감도는 여전히 Dir-1 주입이 판정한다.

이관처 task DoD 는 `injection: 2/2 detect` 를 요구한다. **이관처 task 가 발행되지 않으면 그 사실을 `10.followups/` 에 남긴다** — 이관처 없는 강등은 금지다.

> **착지 순서 주의 (planner)**: 이 task 가 착지하면 (P-D) green 이탈이 즉시 커밋 차단이 된다. 착지 tick 의 트리에서 `undeclared-bearing-green=0` 을 먼저 보이는 것이 FR-04 이며, 그 확인 없이 켜면 붉음을 끌 writer 가 그 세션에 없다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-28 | inspector tick 240 | REQ-20260828-044 흡수 — 최초 등록 (골격). 상위 blue 계약과 판정 모집단으로 상호 제외 | all |
| 2026-08-29 | TSK-20260829-03 (`0e5b39e`) / inspector tick 241 | **drift reconcile — 수용 기준 6/6 ack.** (P-D) blue 계수 합산 착지로 AC-1 `header` 0→189 · (P-D) green rc 집행 착지로 AC-2 `pd-enforced` 0→1. AC-3·AC-4·AC-5·AC-6 보존. FR-01 주에 **포괄 계수 선택**을 박제 — 헤더는 전수 189, 열거는 `head -10` 절단분이라 `header ≥ listed` 는 절단이 아니라 전수 계수로 성립한다. FR-04 순서 계약 준수 확인 (착지 시점 green 이탈 0, 전환 후 green 편집 3건 rc=0). **미충족 0 — promote 후보** | 위치 · 역할 · FR-01 · FR-04 · 테스트 현황 · 수용 기준 · 참고 |
