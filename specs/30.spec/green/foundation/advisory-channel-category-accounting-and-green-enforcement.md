# ADVISORY 채널은 계수와 열거의 부류가 대응하고, green 귀속 이탈은 rc 로 집행된다

> **위치**: `scripts/check-acceptance-criteria.sh` 의 `emit_advisory` (`:120-127`) · `emit_bearing` (`:133-142`) · 계수·목록 변수 (`:99-107`) · (P-D) 층 분기 (`:324-334`). 계수+목록을 함께 올리는 대비군: `:149-150` · `:192-193` · `:339-340` · `:374-375`.
> **관련 요구사항**: REQ-20260828-044
> **최종 업데이트**: 2026-08-28 (by inspector — tick 240 최초 등록, 골격)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`ec82e08`).

## 역할

**ADVISORY 는 침묵도 뭉뚱그림도 아니다 — 부류별로 계수되고, green 부류는 `rc` 를 문다.**

두 방향의 어긋남을 닫는다. **(A) 계수·열거 부류 불일치**: (P-D) 층의 blue 열거가 목록에만 실리고 계수에는 실리지 않아, 헤더가 `미충족 0건` 이라고 말하는 바로 아래에 10줄의 항목이 붙는다. **(B) green 축의 근거 없는 ADVISORY**: (P-D) 의 green 귀속 이탈이 집행되지 않는다.

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

> 다른 blue 부류는 전부 계수와 목록을 함께 올린다 (`:149-150` · `:192-193` · `:339-340` · `:374-375`). (P-D) 만 목록 append 가 단독이다 (`:334`). 일관성 결손이지 설계 의도가 아니다.

### FR-02 — 열거 라인은 부류 접두를 유지한다 (Must)
계수 통합이 **부류 소실로 번지지 않는다**. 헤더를 고치려고 목록을 뭉개면 관측이 오히려 준다.

### FR-03 — green 귀속 이탈은 rc 로 집행된다 (Must)
(P-D) green 귀속 이탈 계수가 **종료 판정에 참여**한다. 선례 형태는 같은 파일의 G-2 축이다 (`:197-208` — `if [ "$g2_green_count" -ne 0 ]; then … exit 1`).

### FR-04 — 집행 전환은 green 이탈 0 인 상태에서 착지한다 (Must)
전환은 **전환 시점의 green 이탈이 0** 임을 같은 실행 출력으로 보인 뒤에만 착지한다. 붉은 상태로 착지시켜 후속 작업을 막지 않는다.

> 이것은 편의가 아니라 순서 계약이다. green 이탈의 교정 권한은 `RULE-01` 상 **inspector 전용**이므로, developer 가 집행을 켠 채 붉은 트리를 남기면 그 붉음을 끌 수 있는 주체가 그 세션에 없다. 실제로 이 축의 착지가 그 이유로 한 번 보류됐다.

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
- [ ] (P-D) blue 계수의 목록 포괄 — HEAD 부재.
- [ ] (P-D) green 축 rc 집행 — HEAD 부재.

## 수용 기준

> 전 항목 **현 HEAD 에서 명령 1회로 rc 판정 가능** (`RULE-07 §수용 기준 문장 규약`).

- [ ] (Must, FR-01·AC-1) **헤더 계수가 같은 채널의 열거 줄 수 이상이다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  o=$(npm run check:acceptance-criteria 2>&1)
  n=$(printf '%s' "$o" | sed -n 's/.*ADVISORY blue 귀속 미충족 \([0-9]*\)건.*/\1/p' | head -1)
  m=$(printf '%s' "$o" | grep -c 'P-D blue 선언토큰 이탈')
  echo "header=$n listed=$m"
  [ -n "$n" ] || exit 2
  [ "$n" -ge "$m" ]
  ```
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `header=0 listed=10` / rc=1 — 위반 baseline.**
  > 헤더 추출 실패(`-n "$n"` 미충족)는 `exit 2` 무판정이다. 추출기가 낡아 빈 문자열을 얻으면 `[ "" -ge "$m" ]` 가 문법 오류로 비정상 종료하거나 참으로 새는데, 어느 쪽도 충족이 아니다.

- [ ] (Must, FR-03·AC-2) **(P-D) green 이탈 계수가 종료 판정에 참여한다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  S=scripts/check-acceptance-criteria.sh
  [ -s "$S" ] || exit 2
  n=$(sed 's/#.*//' "$S" | grep -cE 'if \[ "\$pd_green_count" -ne 0 \]')
  g=$(sed 's/#.*//' "$S" | grep -cE 'if \[ "\$g2_green_count" -ne 0 \]')
  echo "pd-enforced=$n reference-form=$g"
  [ "$g" -ge 1 ] || exit 2
  [ "$n" -ge 1 ]
  ```
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `pd-enforced=0 reference-form=1` / rc=1 — 위반 baseline.**
  > **관측 표면은 주석 절단 후 실행 라인이다** (`sed 's/#.*//'`) — 주석에 등급을 적어 두면 통과하는 형태를 막는다. `reference-form` 은 **선례 형태가 그 파일에 실재함**을 단언하는 비공허 대조다 (`:197`, G-2 축): 술어가 낡아 어떤 형태도 못 잡게 되면 `pd-enforced=0` 이 나오는데 그것은 위반이 아니라 무의미이므로 `exit 2` 로 가른다.
  > 이 항목은 **구조 판정이며 민감도를 대신하지 않는다.** 집행이 실제로 붉어지는지는 §게이트 실효 검증 이관 의 주입이 판정한다.

- [ ] (Must, FR-04·AC-3) **green 귀속 이탈이 0 이다** — 판정: `bash -c 'npm run check:acceptance-criteria 2>&1 | grep -qE "undeclared-bearing-green=0"'`
  → **실측 2026-08-28 (HEAD `ec82e08`): rc=0 → 충족 — 집행 전환의 선행 조건이 이미 서 있다.**
  > 착지 보류의 유일한 근거였던 `undeclared-bearing-green=2` 는 현 HEAD 에서 0 이다 (`testing/test-global-state-restoration-order-independence` 의 두 항목이 `— 판정:` 리터럴 형태로 교정됨, tick 239). **플립은 지금 무해하다.**
  > 이 항목은 전환 후에도 **상시 유지 대상**이다 — 집행이 켜진 뒤에는 AC-4 와 판정이 겹치지만, 전환 전에는 이것만이 순서 계약(FR-04)을 잰다.

- [ ] (Must, FR-02·FR-06·AC-4) **부류 접두와 모집단 2종이 보존된다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  o=$(npm run check:acceptance-criteria 2>&1)
  m=$(printf '%s' "$o" | grep -cE '^[[:space:]]+\[[A-Z0-9-]+ (blue|green) ')
  p=$(printf '%s' "$o" | grep -cE 'undeclared-bearing-green=[0-9]+.*blue-scanned=[0-9]+.*green-scanned=[0-9]+')
  echo "prefixed-lines=$m population-line=$p"
  [ "$m" -ge 1 ] && [ "$p" -ge 1 ]
  ```
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `prefixed-lines=10 population-line=1` / rc=0 — 보존 대상.**
  > 두 축을 한 항목에 묶은 이유는 **둘 다 "고치다가 잃기 쉬운 것"** 이기 때문이다. FR-01 을 만족시키려 목록을 뭉개면 접두가 사라지고, 계수를 0 으로 만들려 모집단을 줄이면 모집단 라인이 사라진다. 값싼 해소 두 경로를 같은 판정으로 막는다.

- [ ] (Must, NFR-02·AC-5) **ADVISORY 발화 지점 수가 줄지 않는다** — 판정: `bash -c 'n=$(sed "s/#.*//" scripts/check-acceptance-criteria.sh | grep -cE "(^|[^_[:alnum:]])emit_advisory"); echo "n=$n"; [ "$n" -ge 9 ]'`
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `n=9` / rc=0 — 보존 대상 (정의 1 + 호출 8).** 종료 경로별 발화가 통합 과정에서 누락되는 형태를 막는 래칫이며, 하한이므로 발화 지점이 늘어나는 방향은 막지 않는다.

- [ ] (Must, NFR-01·AC-6) **게이트 단독 실행 벽시계 < 20s** — 판정: `bash -c 'S=$(date +%s); npm run check:acceptance-criteria >/dev/null 2>&1; E=$(date +%s); echo "elapsed=$((E-S))s"; [ $((E-S)) -lt 20 ]'`
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `elapsed=1s` / rc=0 — 보존 대상.**

## 참고

### 비-중복 근거 (상위 blue 계약)
`foundation/blue-attributed-violation-advisory-accounting` (blue) 는 (A-5) ADVISORY 발화 · (A-6) green rc 집행을 **일반 명제**로 소유한다. **상호 제외는 판정 모집단으로 갈린다.**

| | 상위 blue 계약 | 본 계약 (044) |
|---|---|---|
| 판정 모집단 | **blue 트리를 스캔하는 게이트 전원** (구조 술어) | `check-acceptance-criteria.sh` 의 **(P-D) 층 내부** |
| 재는 것 | 게이트가 ADVISORY 채널을 갖는가 · green 을 집행하는가 | 채널 **내부의 계수↔열거 부류 대응** · (P-D) **층의 등급** |
| 겹치지 않는 이유 | 채널 존재를 재므로 **채널 안이 정합한지는 재지 않는다** | 채널 존재를 전제로 삼고 **재정의하지 않는다** |

상위 계약이 전수 참인 상태에서도 본 계약의 위반은 성립한다 — 실제로 현 HEAD 가 그 상태다 (헤더 `0건` 아래 10줄).

### 미측정·비판정 항목
- **blue 189건의 개별 해소** — §역할 out-of-scope. blue 는 `RULE-01` 상 편집 writer 가 없어 `RULE-05` 경로를 통해서만 움직인다.
- **부류별 계수 분리와 포괄 계수 중 어느 표기가 나은가** — 표기 선택은 구현 재량이며 FR-01 은 둘 다 허용한다. 판정은 표기가 아니라 **계수 ≥ 열거** 다.
- **집행 전환 후 inspector 작업 부하 증가량** — 측정 채널 부재 (미측정 NFR 부류).
- **AC-7(green 선언토큰 이탈 1건 주입) · AC-8(원복)** — **가정 주입 요구** 부류이므로 체크박스로 두지 않고 §게이트 실효 검증 이관 으로 내린다.

### 배경 실측 (HEAD `ec82e08`, tick 240)
```
ADVISORY 헤더 계수 / (P-D) blue 열거 줄 수        → header=0  listed=10
undeclared-bearing-green                          → 0          (플립 선행 조건 충족)
undeclared-bearing-blue                           → 189(ADVISORY) / bearing-min=100
pd_green_count 종료 판정 참여                      → 0회        (선례 g2_green_count 는 1회, :197)
emit_advisory 발화 지점                            → 9          (정의 1 + 호출 8)
```
`pd_green_count` 는 현재 `:99` 초기화 · `:135` 출력 포맷 · `:327` 산출 세 곳에만 나타난다. **값은 정확히 계산되고 정확히 출력되며 아무것도 하지 않는다.**

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)
검출 방향은 **2종**이며 주입 왕복은 구현 task 의 DoD 에 귀속한다.

| 방향 | 위반 주입 | 기대 |
|---|---|---|
| Dir-1 (FR-03 민감도) | green spec 1건의 수용 기준 항목을 `판정은 …` 서술형으로 변형 (선언 토큰 이탈) | `rc≠0` + `[P-D green 선언토큰 이탈]` 라인에 그 경로 |
| Dir-2 (FR-01 민감도) | (P-D) blue 열거를 1줄 늘리는 변형 | 헤더 계수가 **함께** 증가 |

Dir-1 의 주입 형태는 실측 선례가 있다 — tick 239 가 정확히 그 이탈 2건(`판정은 …` 도입부)을 교정했다. 즉 이 주입은 가상의 고장이 아니라 **6일 전까지 실재했던 상태의 복원**이다.

이관처 task DoD 는 `injection: 2/2 detect` 를 요구한다. **이관처 task 가 발행되지 않으면 그 사실을 `10.followups/` 에 남긴다** — 이관처 없는 강등은 금지다.

> **착지 순서 주의 (planner)**: 이 task 가 착지하면 (P-D) green 이탈이 즉시 커밋 차단이 된다. 착지 tick 의 트리에서 `undeclared-bearing-green=0` 을 먼저 보이는 것이 FR-04 이며, 그 확인 없이 켜면 붉음을 끌 writer 가 그 세션에 없다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-28 | inspector tick 240 | REQ-20260828-044 흡수 — 최초 등록 (골격). 상위 blue 계약과 판정 모집단으로 상호 제외 | all |
