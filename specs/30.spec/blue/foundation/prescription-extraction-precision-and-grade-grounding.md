# 요구 경로 추출은 절 경계와 처방 극성을 존중하고, 무판정 등급의 근거는 게이트가 산출한 라벨이다

> **위치**: `scripts/check-task-precondition-scope.sh` 의 `PRESC_HEAD_RE`·`prescriptionOf` (`:295-322`) · `NEGATION_RE`·`TABLE_ROW_RE` (`:301-304`) · `analyze`/`requiredOf` (`:337-365`) · 정밀도 계수 발화 (`:367-377` · `:439-440`) · 무판정 라벨. 판정 입력은 `specs/50.blocked/task/*_reason.md` (읽기 전용).
> **관련 요구사항**: REQ-20260828-043
> **최종 업데이트**: 2026-08-29 (by inspector — tick 241 drift reconcile, TSK-20260829-02 착지 + AC-1 계측 표면 교정)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`0e5b39e`).

## 역할

**판정에 쓰이는 집합과 등급은 선언된 구간·극성·사유에서 도출되며, 계약 문면은 게이트가 산출한 그 사유를 그대로 인용한다.**

`check:task-precondition-scope` 의 처방 소비 축(FR-02)은 사유서의 `## 재발행 시 필요한 것` 절에서 실재 경로 토큰 전수를 요구 집합으로 삼는다. 그 추출은 두 방향으로 새지 않는다 — **(A) 절 경계**: 선택자는 제목 **선두 일치**(`/^##\s+재발행/`)이며 첫 매칭 절에서 수집을 종료하므로, 같은 키워드를 제목에 가진 다른 절이 수집 구간을 다시 열지 못한다. **(B) 극성**: 부정 서술("영향이 **없다**")과 측정표·대조군 표의 셀에 있는 경로는 요구를 낳지 않고 `polarity-excluded` 로 계수된다.

> **발단 (해소됨, TSK-20260829-02 `19d3712`)**: 선택자가 제목 부분일치였고 `^##\s` 라인마다 술어를 재평가해, 검증 기록·측정표 절이 수집을 다시 열었다. 토큰 필터는 "슬래시 또는 점 포함 + 실재 파일" 두 조건뿐이라 **"이 파일은 건드리지 않는다" 는 문장이 그 파일을 요구로 만들었다**. 실 corpus 요구 열거가 19 → 9 로 줄었다.

세 번째 축은 반대 방향의 어긋남이었다 — **(C) 등급 근거**: 계약 문면이 무판정 rc 의 근거로 게이트가 낸 라벨이 아니라 **특정 시점의 큐 적재량**을 들었다 (tick 240 `233389e` 에서 해소).

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 방어 대상을 명시한다:

> **격리 사유서의 처방 소비 판정이 잡음에 묻혀 실효를 잃는 사건.** 이 축의 유일한 산출물은 `unconsumed-prescription:` 열거다. 그 열거가 과대 계수되면 (i) 참 양성이 잡음에 섞여 읽히지 않고 (ii) 사유서에 무해한 문장 한 줄을 덧붙이는 것만으로 요구 집합이 늘어 **판정이 문서 표현에 종속**된다.

**과대 계수는 등급이 아니라 목록으로 나오므로 `rc` 로는 드러나지 않는다.** 게이트는 `rc=1` 을 내지만 그 `1` 안에서 참 양성과 과대는 구별되지 않는다. 그래서 이 계약은 `rc` 가 아니라 **계수**(`prescription-section-ambiguous` · `polarity-excluded`)와 **열거 크기**(`unconsumed-prescription`)를 관측 표면으로 삼는다.

**하지 않는 것**: `unconsumed-prescription` 참 양성의 **개별 해소**(사유서별 작업). 격리 트리 판정을 상시 채널로 승격하는 결정 — 인접 계약 `task-precondition-scope-nonvacuity-and-reason-consumption` FR-08 이 그것을 **로컬 진단으로 한정**하며 본 계약은 그 한정을 바꾸지 않는다. `specs/50.blocked/**` 문서의 이동·편집도 밖이다 (`RULE-05` 운영자 경로) — 그래서 수리는 **문서를 고치는 쪽이 아니라 추출기를 고치는 쪽**으로만 열려 있다.

## 공개 인터페이스

게이트 stdout 에 **추출 정밀도 계수**가 등급과 함께 발화된다.

| 토큰 | 의미 |
|---|---|
| `reason-docs` | 사유서 모집단 (열거 도출) |
| `prescription-section-ambiguous` | 처방 절 제목이 2개 이상 매칭된 사유서 수 |
| `polarity-excluded` | 부정 서술·표 셀로 판정돼 요구 집합에서 빠진 경로 토큰 수 |

무판정 등급 라벨은 사유별로 구별된다 — `root-missing` / `population-empty` / `marker-set-empty` / `judgeable-unit-empty` (`:86-90`). 넷 다 `exit 2` 이므로 **rc 로는 구별되지 않고 라벨로만 구별된다**. 그래서 라벨은 부수 정보가 아니라 등급의 일부다.

## 동작

### FR-01 — 요구 경로 수집 구간은 처방 절 1개로 확정된다 (Must)
제목에 같은 키워드를 포함한 다른 절이 구간을 **재개방하지 않는다**. 매칭 절이 2개 이상인 사유서는 통과가 아니라 **무판정**으로 계수한다.

> 구 `sectionOf` 는 `^##\s` 라인마다 `on = headRe.test(l)` 을 **재평가**했다. 제목에 키워드가 든 절이 나올 때마다 수집이 다시 켜졌다. 이것은 상태 기계의 버그가 아니라 **선택자의 의미가 "첫 매칭 절" 이 아니라 "매칭 절 전부" 로 쓰인 것**이었고, 그 차이는 문서에 절 하나가 늘어날 때마다 조용히 벌어졌다.
>
> 현행 `prescriptionOf` (`:305-322`) 는 `matches === 1` 일 때만 수집을 켜고, 이후 다른 `##` 절에서 끈다. 매칭 수는 그대로 세어 `prescription-section-ambiguous` 로 발화한다.
>
> **계수는 현재 rc 에 결합돼 있지 않다** (`:375` 는 증분만 한다). 즉 이 계약이 요구하는 "무판정으로 계수한다" 는 **발화**로 충족되고 **집행**으로는 충족되지 않는다. 선택자가 선두 일치라 실 corpus 에서 `matches ≥ 2` 가 발생하지 않아 현재는 도달 불가 경로이며, rc 결합 여부는 별도 축(`20.req` 의 선언 임계 게이트 rc 결합 요구)이 소유한다. 여기서는 **알려진 잔여**로 박제한다.

### FR-02 — 요구 경로는 처방 극성을 가진 라인에서만 도출된다 (Must)
부정 서술(`영향이 없다` · `건드리지 않는다` · `대상이 아니다`)과 측정표·대조군 표의 셀은 요구가 아니다. 배제된 토큰 수는 `polarity-excluded` 로 발화한다.

> 현행 `analyze` (`:337-365`) 는 `NEGATION_RE` (`없다|없어|없음|무영향|않는다|않았다|아니다|아니라|제외한|제외하|대상이 아니`) 와 `TABLE_ROW_RE` (`^\s*\|`) 로 라인을 먼저 거른 뒤 경로 토큰을 도출하고, 걸러진 (문서:라인, 토큰) 쌍을 `excluded` 로 모아 `polarity-excluded` 에 합산한다. 배제 단위가 토큰이 아니라 **(라인, 토큰) 쌍**인 것은 의도적이다 — 같은 경로가 다른 처방 라인에서는 요구로 남아야 한다.

### FR-03 — 무판정 등급은 라벨로 출력되고 계약 문면은 그 라벨을 인용한다 (Must)
계약이 "무판정으로 떨어지는 것이 정상" 이라고 쓸 때, 그 근거는 게이트가 실제로 낸 **라벨 문자열**이어야 한다.

### FR-04 — 수용 기준은 큐 적재량을 근거로 삼지 않는다 (Must)
근거는 게이트 라벨 또는 도출 규칙이다. 큐 적재량은 시점 의존이므로 계약 근거가 될 수 없다 (`RULE-07 §양성 기준` — 시점·사건 비의존).

> 착지 당시 실측이 이 요구의 발단이다. 계약 문면은 "`40.task` 0건이므로 무판정" 이라 적었는데 그 시점 `40.task` 는 on-disk 2건이었고 게이트가 낸 라벨은 `judgeable-unit-empty` (문서는 있으나 판정 단위·링크 0) 였다. **같은 문장이 큐 상태에 따라 참·거짓을 오간다.**

### FR-05 — 추출 정밀도는 양방향 주입으로 증명한다 (Must)
부정 서술 라인에 실재 경로를 추가해도 요구 집합이 늘지 않고, 처방 라인에 추가하면 늘어난다. 주입 왕복은 구현 task 의 DoD 에 귀속한다 (§게이트 실효 검증 이관).

### FR-06 — 모집단은 루트 열거로 도출한다 (Must)
사유서 목록을 하드코딩하지 않는다. 열거가 공집합이면 무판정이다 (`RULE-06 §열거 고정 금지`). 현행 도출 근거: `scripts/check-task-precondition-scope.sh:158-184` (`walk`) · `:186-190` (`DOCS_MIN` 하한).

### 발화 채널 (RULE-07 §promote 조건 4)
`package.json` `scripts.check:task-precondition-scope` (`:54`) · `.husky/pre-commit` (`:155-156`) · `.github/workflows/ci.yml` (`:213`) — **현 HEAD 실재**. 본 계약은 기존 채널의 **출력 계수를 늘릴 뿐** 새 채널을 요구하지 않는다.

## 의존성
- 내부: `scripts/check-task-precondition-scope.sh` · `scripts/fixtures/task-precondition/**` · `specs/50.blocked/task/*_reason.md` (읽기 전용).
- 외부: POSIX sh · node · `git ls-files`.
- 인접 계약: `foundation/task-precondition-scope-nonvacuity-and-reason-consumption` (**같은 게이트의 상위 계약** — 본 계약은 그 FR-02 축의 **정밀도**를 다루며 판정 축 자체를 재정의하지 않는다) · `foundation/derived-population-totality-judgement` (blue).
- 역의존: planner 의 재발행 task 스코프 작성.

## 테스트 현황
- [x] 절 경계 확정 (`PRESC_HEAD_RE` 선두 일치 + `matches === 1` 수집 종료 — `scripts/check-task-precondition-scope.sh:298`·`:311-315`).
- [x] 극성 구분 (`NEGATION_RE`·`TABLE_ROW_RE` — `:301-304`, 실 corpus `polarity-excluded=3`).
- [x] 정밀도 계수 발화 (`reason-docs` · `prescription-section-ambiguous` · `polarity-excluded` — `:438-440`).
- [ ] 극성 fixture (부정 서술 / 표 셀 각 1건) — **HEAD 부재 · 잔여.** 착지는 실 corpus 실측으로 증명됐고 추적 fixture 는 추가되지 않았다. 실 corpus 는 `RULE-05` 경로로 해소되면 사라지므로 이 축의 witness 는 영구적이지 않다 (§참고 — AC-1 공허화 조건).

## 수용 기준

> 전 항목 **현 HEAD 에서 명령 1회로 rc 판정 가능** (`RULE-07 §수용 기준 문장 규약`). 펜스 항목은 본문을 추출해 `bash -c "$(추출)"` 로 실행한다.
>
> **모집단은 전부 열거 도출이다** (FR-06). 특정 사유서 파일명을 수용 기준에 박지 않는다 — req 원문은 단일 파일을 지목했으나, 그렇게 두면 그 파일이 `RULE-05` 경로로 해소되는 순간 판정이 사라진다. 아래 AC-1 은 같은 현상을 **루트 전수**로 잰다.

- [x] (Must, FR-01·FR-06·AC-1) **게이트 자신의 처방 절 선택자로 잰 절 모호 사유서가 0** 이다 — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  o=$(TASK_PRECONDITION_ROOT=specs/50.blocked/task \
      TASK_PRECONDITION_REASON_ROOT=specs/50.blocked/task \
      bash scripts/check-task-precondition-scope.sh 2>&1)
  d=$(printf '%s\n' "$o" | sed -n 's/.*reason-docs=\([0-9][0-9]*\).*/\1/p' | head -1)
  a=$(printf '%s\n' "$o" | sed -n 's/.*prescription-section-ambiguous=\([0-9][0-9]*\).*/\1/p' | head -1)
  w=0
  for f in $(find specs/50.blocked/task -name '*_reason.md' | sort); do
    n=$(grep -cE '^##[[:space:]].*재발행' "$f")
    [ "$n" -ge 2 ] && w=$((w+1))
  done
  echo "reason-docs=$d prescription-section-ambiguous=$a loose-selector-witness=$w"
  [ -n "$d" ] && [ -n "$a" ] || exit 2
  [ "$d" -ge 1 ] || exit 2
  [ "$a" -eq 0 ]
  ```
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `reason-docs=9 prescription-section-ambiguous=0 loose-selector-witness=4` / rc=0 — 충족.**
  > **계측 표면 교정 (tick 241).** 구 문면은 `grep -cE '^##[[:space:]].*재발행'` 로 **사유서 제목 수**를 직접 셌다. 그것은 추출기의 속성이 아니라 **문서의 속성**이며, 이 계약이 소유하지 않고 소유할 수도 없는 표면이다 — `specs/50.blocked/**` 는 편집 금지(§역할)이므로 추출기를 아무리 고쳐도 그 수치는 움직이지 않는다. 실제로 `19d3712` 착지 후에도 구 문면은 `reason-docs=9 ambiguous-section=4` / rc=1 로 **불변**이었고, 유일한 해소 경로가 금지된 편집이었다. `RULE-07 §수용 기준 문장 규약` 에 따라 **판정 대상을 게이트가 실제로 움직이는 표면**(게이트 자신이 발화하는 `prescription-section-ambiguous`)으로 교정한다.
  >
  > **자명 명제가 아니다 — witness 가 구분을 살아 있게 유지한다.** `loose-selector-witness` 는 구 선택자(제목 부분일치)로 재면 모호했을 사유서 수이며 현재 `4` 다. 즉 corpus 안에 **선택자를 되돌리면 즉시 붉어질 문서가 4건 상존**한다. 실측으로 확인했다 — `PRESC_HEAD_RE` 를 `/^##\s+재발행/` → `/재발행/` 로 되돌린 사본을 저장소 밖에서 실행하니 `prescription-section-ambiguous=4 polarity-excluded=10 unconsumed=19` 로 정확히 회귀 전 값이 재현됐다. 이 항목은 그 회귀를 잡는다.
  >
  > **분모 `reason-docs ≥ 1` 은 무판정 하한이다.** 격리 트리는 `.gitignore:32` 로 워킹트리 전용이라 신선한 클론에서 공집합이며, 그 상태의 `a=0` 은 충족이 아니라 무의미다. `witness` 는 출력만 하고 rc 에 결합하지 않는다 — corpus 가 `RULE-05` 경로로 해소되면 witness 가 0 으로 떨어지지만 그것은 위반이 아니라 **이 항목의 공허화**이며, 그때의 항구적 대응은 추적 fixture 다 (§테스트 현황 잔여 · §참고 AC-1 공허화 조건).

- [x] (Must, FR-02·AC-2) **극성 배제 계수가 발화되고 실 corpus 에서 ≥1 이다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  o=$(TASK_PRECONDITION_ROOT=specs/50.blocked/task \
      TASK_PRECONDITION_REASON_ROOT=specs/50.blocked/task \
      bash scripts/check-task-precondition-scope.sh 2>&1)
  printf '%s\n' "$o" | grep -qE 'polarity-excluded=[0-9]+' || exit 1
  n=$(printf '%s\n' "$o" | sed -n 's/.*polarity-excluded=\([0-9][0-9]*\).*/\1/p' | head -1)
  echo "polarity-excluded=$n"
  [ -n "$n" ] || exit 2
  [ "$n" -ge 1 ]
  ```
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `polarity-excluded=3` / rc=0 — 충족.** (직전 `ec82e08`: 토큰 부재 / rc=1 — 위반 baseline.)
  > `≥1` 하한을 두는 이유는 **필터가 실제로 무언가를 걸렀음**을 요구하기 위함이다. 토큰만 출력하고 항상 `0` 인 구현은 계약을 문자로만 만족한다 — 상대 대조 없이 절대 하한을 두는 형태다. 하한의 근거는 아래 §배경 실측의 부정 서술 실측이다.

- [x] (Must, FR-02·AC-3) **부정 서술 라인의 경로가 요구 집합에 들어가지 않는다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  o=$(TASK_PRECONDITION_ROOT=specs/50.blocked/task \
      TASK_PRECONDITION_REASON_ROOT=specs/50.blocked/task \
      bash scripts/check-task-precondition-scope.sh 2>&1)
  u=$(printf '%s\n' "$o" | grep -c 'unconsumed-prescription:')
  echo "unconsumed=$u"
  [ "$u" -ge 1 ] || exit 2
  printf '%s\n' "$o" | grep 'unconsumed-prescription:' | grep -qE '\-> (src/App\.jsx|src/Monitor/Monitor\.jsx|scripts/check-vite-env-coherence\.sh)$' && exit 1
  exit 0
  ```
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `unconsumed=9` / rc=0 — 충족.** 지목 3경로 전수 소거 (3/3). (직전 `ec82e08`: `unconsumed=19` / rc=1 — `scripts/check-vite-env-coherence.sh` 가 열거에 있었다. 그 경로는 사유서 `:86` 의 "영향이 **없다**" 서술과 `:106` 이하 측정표에서만 나타난다.) 열거 19 → 9 는 참 양성 잔여이며, 이 계약은 그 잔여의 개별 해소를 요구하지 않는다 (§역할 out-of-scope).
  > 지목 3경로는 하드코딩이 아니라 **부정 서술·표 셀에서만 유래한 것으로 확인된 표본**이다 (§배경 실측). `unconsumed ≥ 1` 하한이 없으면 열거가 통째로 비었을 때 `rc=0` 이 되어 **추출기가 죽은 상태가 충족으로 읽힌다**.

- [x] (Must, FR-03·AC-4) **무판정 라벨이 사유와 함께 출력된다** — 판정: `bash -c 'o=$(TASK_PRECONDITION_ROOT=specs/40.task bash scripts/check-task-precondition-scope.sh 2>&1); printf "%s" "$o" | grep -qE "NO-JUDGEMENT: (root-missing|population-empty|marker-set-empty|judgeable-unit-empty)"'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): rc=0 — 보존됨** (`NO-JUDGEMENT: population-empty — docs=0 (하한 1) root=specs/40.task`).

- [x] (Must, FR-04·AC-5) **상위 계약의 수용 기준에 큐 적재량 근거 문장이 0** 이다 — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  S=$(git ls-files 'specs/30.spec/*/task-precondition-scope-nonvacuity-and-reason-consumption.md' | head -1)
  [ -n "$S" ] || exit 2
  n=$(grep -cE '40\.task.{0,3} 0건' "$S")
  echo "queue-grounded=$n"
  [ "$n" -eq 0 ]
  ```
  → **실측 2026-08-28 (HEAD `ec82e08` + tick 240 커밋 `233389e`): 출력 `queue-grounded=0` / rc=0 → 충족.**
  > **본 계약 등록과 같은 tick 에 해소됐다.** tick 240 Phase 1 이 상위 계약의 AC-7 을 재정식화하면서 큐 적재량 근거를 게이트 라벨 인용(`population-empty — docs=0 (하한 1) root=specs/40.task`)으로 교체했다. 두 작업은 서로를 모른 채 같은 지점에 도달했다 — req 가 지목한 위반 문면과 drift reconcile 이 고친 문면이 같은 라인이다.
  > 대상 경로를 **slug glob 으로 찾는다** (`specs/30.spec/*/<slug>.md`). 상위 계약은 승격 대기 상태이므로 green 경로를 리터럴로 적으면 승격 순간 판정이 사라진다 (`RULE-07 §promote 조건 2`).

- [x] (Must, NFR-01·AC-6) **격리 트리 진단 포함 단독 실행 벽시계 < 20s** — 판정: `bash -c 'S=$(date +%s); TASK_PRECONDITION_ROOT=specs/50.blocked/task TASK_PRECONDITION_REASON_ROOT=specs/50.blocked/task bash scripts/check-task-precondition-scope.sh >/dev/null 2>&1; E=$(date +%s); echo "elapsed=$((E-S))s"; [ $((E-S)) -lt 20 ]'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `elapsed=0s` / rc=0 — 보존됨.** 극성 판정 추가가 이 예산을 넘기지 않았다.

## 참고

### 비-중복 근거 (인접 계약)
- `foundation/task-precondition-scope-nonvacuity-and-reason-consumption` — **같은 게이트의 상위 계약**. 그것은 "처방이 스코프로 흘렀는가" 라는 **판정 축**을 소유하고, 본 계약은 그 축이 쓰는 **요구 집합의 도출 정밀도**를 소유한다. 상위 계약이 참이어도 요구 집합이 과대하면 열거는 읽을 수 없는 목록이 된다 — 축과 정밀도는 독립이다.
- `testing/derived-population-totality-judgement` (blue) — 모집단 **전수성**. 본 계약은 전수인 모집단 안에서 **어느 라인이 요구를 낳는가** 를 다룬다. 전수성은 본 계약의 전제이지 중복이 아니다.

### 미측정·비판정 항목
- **과대 계수의 정확한 정밀도(참 양성 / 전체) 비율** — 참 양성의 판정에 사람 판단이 들어가므로 상시 측정 채널이 없다. 계약은 비율 대신 **극성 배제가 작동함**(AC-2)과 **표본 경로가 열거에서 빠짐**(AC-3)으로 대리한다.
- **`unconsumed-prescription` 참 양성의 개별 해소** — §역할 out-of-scope. 이 계약이 닫혀도 참 양성 열거는 남으며, 그것이 정상이다.
- **부정 서술 어휘 목록의 완전성** — 자연어 부정 표현은 열거로 닫히지 않는다. 게이트는 열거된 표지에 대해서만 배제하며, 미포함 표현이 요구로 새는 것은 위반이 아니라 **알려진 잔여**다.
- **AC-7(부정 서술 라인 경로 추가 주입) · AC-8(처방 라인 경로 추가 주입)** — **가정 주입 요구** 부류이므로 체크박스로 두지 않고 §게이트 실효 검증 이관 으로 내린다. 검출 방향은 보존된다.
- **`prescription-section-ambiguous` 의 rc 결합** — 현행은 발화만 하고 rc 에 결합하지 않는다 (`:375`). 선택자가 선두 일치라 실 corpus 에서 `matches ≥ 2` 가 발생하지 않아 결합해도 현 HEAD 에서는 판정이 바뀌지 않으며, 결합 여부는 별도 축(선언 임계 게이트의 rc 결합)이 소유한다. 여기서는 **알려진 잔여**로 박제한다 (FR-01 주).
- **AC-1 공허화 조건** — `loose-selector-witness` 가 0 이 되면(격리 사유서 4건이 `RULE-05` 경로로 전부 해소되면) AC-1 은 위반 없음이 아니라 **판정할 것이 없음**이 된다. rc 는 여전히 0 이지만 검출력은 사라진다. 항구적 대응은 같은 재개방 형태를 담은 **추적 fixture**(`scripts/fixtures/task-precondition/**`)이며 HEAD 에 부재다 (§테스트 현황 잔여). 이 전이는 시점 의존이라 체크박스로 두지 않는다.

### 착지 실측 (HEAD `0e5b39e`, tick 241)
```
AC-1 게이트 계수      → reason-docs=9 prescription-section-ambiguous=0 loose-selector-witness=4   rc=0
AC-2 극성 배제        → polarity-excluded=3                                                        rc=0
AC-3 요구 열거        → unconsumed=9 (지목 3경로 0/3)                                              rc=0
AC-4 무판정 라벨      → NO-JUDGEMENT: population-empty — docs=0 (하한 1) root=specs/40.task       rc=0
AC-6 벽시계           → elapsed=0s                                                                 rc=0
게이트 요약           → docs=18 reasons=18 reason-docs=9 ambiguous=0 polarity-excluded=3 claims=2 linked=5 violations=7
```

**선택자 회귀 대조 (저장소 밖 사본, tick 241).** `PRESC_HEAD_RE` 를 `/^##\s+재발행/` → `/재발행/` 로 되돌린 사본을 실행:
```
prescription-section-ambiguous=4  polarity-excluded=10  linked=4  violations=5   (unconsumed 열거 19줄)
```
`4` 는 AC-1 이 출력하는 `loose-selector-witness` 와 정확히 일치한다 — witness 는 예측값이 아니라 **회귀 시 실제로 나오는 값**이다. 이 대조는 저장소 밖 사본에서 수행했고 워킹트리는 건드리지 않았다 (`RULE-02 §금지` — 메인 트리 프로토타이핑).

### 배경 실측 (HEAD `ec82e08`, tick 240 — 착지 전)
```
find specs/50.blocked/task -name '*_reason.md' | wc -l              → 9    (사유서 모집단)
그중 ^## .*재발행 매칭 ≥2                                            → 4    (44%)
격리 트리 진단 unconsumed-prescription 열거                          → 19 lines / 5 docs / rc=1
게이트 요약 라인                                                     → docs=18 reasons=18 claims=2 linked=5 violations=7
```
지목 사유서 `TSK-20260827-02-…_reason.md` 의 두 매칭 절:
```
:70  ## 재발행 시 필요한 것 (planner)
:90  ## 수행된 검증 (구현은 정상이었다 — 재발행 시 재사용 가능)
```
둘째 절은 **처방이 아니라 검증 기록**이며, 그 절의 대조군 표 셀(`src/App.jsx` · `src/Monitor/Monitor.jsx`)과 `:86` 의 부정 서술(`영향이 **없다**` — `check-vite-env-coherence`), `:106` 이하 측정표의 경로가 전부 요구 집합에 들어온다.

> **게이트는 정확히 붉었다.** `rc=1` 은 옳았고 참 양성도 그 안에 있었다. 틀린 것은 **붉은 이유의 구성**이었다 — `RULE-06 §게이트 실효 검증` 이 겨냥하는 민감도 결손의 거울상, 즉 특이도 결손이다. 착지 후 열거는 19 → 9 로 줄었고 남은 9 는 참 양성이다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)
검출 방향은 **2종**이며 주입 왕복은 구현 task 의 DoD 에 귀속한다. 주입 대상은 **`scripts/fixtures/task-precondition/` 하위 추적 fixture** 다 — `specs/50.blocked/**` 는 편집 금지이므로 실 corpus 에 주입하지 않는다.

| 방향 | 위반 주입 | 기대 |
|---|---|---|
| Dir-1 (FR-02 특이도) | 처방 절의 **부정 서술 라인**에 실재 경로 1건 추가 | 요구 집합 **불변** · `polarity-excluded` +1 |
| Dir-2 (FR-02 민감도) | 처방 절의 **처방 라인**에 실재 경로 1건 추가 | 요구 집합 **+1** · 미포함 시 `rc≠0` |

Dir-1 은 특이도, Dir-2 는 민감도이며 **둘 다 필요하다** — Dir-1 만 통과하는 구현은 모든 라인을 배제해 요구 집합을 비우는 것으로도 만족되고, 그 상태는 처방 소비 축을 통째로 무력화한다.

이관처 task DoD 는 `injection: 2/2 detect` 를 요구한다. **이관처 task 가 발행되지 않으면 그 사실을 `10.followups/` 에 남긴다** — 이관처 없는 강등은 금지다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-28 | inspector tick 240 | REQ-20260828-043 흡수 — 최초 등록 (골격). AC-5(FR-04)는 같은 tick 의 상위 계약 reconcile(`233389e`)로 이미 충족 | all |
| 2026-08-28 | inspector tick 240 | 펜스 전수 추출·실행 검증에서 `unconsumed` 실측을 15 → 19 로 교정 (최초 기록이 `sed -n '1,20p'` 로 잘린 출력이었다) | 수용 기준 AC-3 · 배경 실측 |
| 2026-08-29 | TSK-20260829-02 (`19d3712`) / inspector tick 241 | **drift reconcile — 수용 기준 6/6 ack.** 선택자 선두 일치 + 첫 매칭 절 종료 · 극성/표 셀 배제 착지. AC-2 토큰부재→`polarity-excluded=3` · AC-3 `unconsumed` 19→9 (지목 3경로 3/3 소거) · AC-4·AC-6 보존. 역할·FR-01·FR-02 의 "현행" 서술을 착지 후 사실로 교정 | 위치 · 역할 · FR-01 · FR-02 · 테스트 현황 · 수용 기준 · 참고 |
| 2026-08-29 | inspector tick 241 | **AC-1 계측 표면 교정.** 구 문면은 `grep -cE '^##.*재발행'` 로 편집 금지 트리(`50.blocked/**`)의 **문서 제목 수**를 세어, 추출기를 고쳐도 `4` 로 불변이었고 해소 경로가 금지된 편집뿐이었다. 판정 대상을 게이트 자신이 발화하는 `prescription-section-ambiguous` 로 옮기고, 구 선택자 계수를 `loose-selector-witness` (현재 4) 로 **출력 전용** 보존해 자명화를 막았다. 선택자 되돌린 사본 실행으로 witness=회귀 실측값 일치 확인 (`RULE-07 §수용 기준 문장 규약`) | 수용 기준 AC-1 · 참고 |
