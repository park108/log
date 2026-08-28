# 요구 경로 추출은 절 경계와 처방 극성을 존중하고, 무판정 등급의 근거는 게이트가 산출한 라벨이다

> **위치**: `scripts/check-task-precondition-scope.sh` 의 `sectionOf` (`:271-283`) · `requiredOf` (`:296-311`) · 무판정 라벨 발화 (`:151-155` · `:189` · `:361-366`). 판정 입력은 `specs/50.blocked/task/*_reason.md` (읽기 전용).
> **관련 요구사항**: REQ-20260828-043
> **최종 업데이트**: 2026-08-28 (by inspector — tick 240 최초 등록, 골격)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`ec82e08`).

## 역할

**판정에 쓰이는 집합과 등급은 선언된 구간·극성·사유에서 도출되며, 계약 문면은 게이트가 산출한 그 사유를 그대로 인용한다.**

`check:task-precondition-scope` 의 처방 소비 축(FR-02)은 사유서의 `## 재발행 시 필요한 것` 절에서 실재 경로 토큰 전수를 요구 집합으로 삼는다. 그 추출이 두 방향으로 샌다 — **(A) 절 경계**: 선택자가 제목 부분일치라 같은 키워드를 제목에 가진 다른 절이 수집 구간을 다시 연다. **(B) 극성**: 부정 서술("영향이 **없다**")과 측정표·대조군 표의 셀에 있는 경로가 처방과 구별되지 않는다.

세 번째 축은 반대 방향의 어긋남이다 — **(C) 등급 근거**: 계약 문면이 무판정 rc 의 근거로 게이트가 낸 라벨이 아니라 **특정 시점의 큐 적재량**을 들었다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 방어 대상을 명시한다:

> **격리 사유서의 처방 소비 판정이 잡음에 묻혀 실효를 잃는 사건.** 이 축의 유일한 산출물은 `unconsumed-prescription:` 열거다. 그 열거가 과대 계수되면 (i) 참 양성이 잡음에 섞여 읽히지 않고 (ii) 사유서에 무해한 문장 한 줄을 덧붙이는 것만으로 요구 집합이 늘어 **판정이 문서 표현에 종속**된다.

**이 과대 계수는 현행 어떤 게이트도 재지 않는다 — 출력이 등급이 아니라 목록이라 `rc` 로 드러나지 않는다.** 게이트는 정확히 `rc=1` 을 내고 있고, 그 `1` 안에 참 양성과 과대가 구별 없이 섞여 있다.

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

> 현행 `sectionOf` (`:271-283`) 은 `^##\s` 라인마다 `on = headRe.test(l)` 을 **재평가**한다. 따라서 제목에 키워드가 든 절이 나올 때마다 수집이 다시 켜진다. 이것은 상태 기계의 버그가 아니라 **선택자의 의미가 "첫 매칭 절" 이 아니라 "매칭 절 전부" 로 쓰인 것**이며, 그 차이가 문서에 절 하나가 늘어날 때마다 조용히 벌어진다.

### FR-02 — 요구 경로는 처방 극성을 가진 라인에서만 도출된다 (Must)
부정 서술(`영향이 없다` · `건드리지 않는다` · `대상이 아니다`)과 측정표·대조군 표의 셀은 요구가 아니다. 배제된 토큰 수는 `polarity-excluded` 로 발화한다.

> 현행 `requiredOf` 의 토큰 필터는 조건이 둘뿐이다 — "슬래시 또는 점을 포함" + "실재 파일" (`:301-308`). 문장 극성도, 목록/표 여부도 보지 않는다. **"이 파일은 건드리지 않는다" 는 문장이 그 파일을 요구로 만든다.**

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
- [ ] 절 경계 확정 — HEAD 부재 (`sectionOf` 가 매칭 절 전부를 수집).
- [ ] 극성 구분 — HEAD 부재 (`requiredOf` 필터에 극성 조건 없음).
- [ ] 정밀도 계수 발화 — HEAD 부재.
- [ ] 극성 fixture (부정 서술 / 표 셀 각 1건) — HEAD 부재.

## 수용 기준

> 전 항목 **현 HEAD 에서 명령 1회로 rc 판정 가능** (`RULE-07 §수용 기준 문장 규약`). 펜스 항목은 본문을 추출해 `bash -c "$(추출)"` 로 실행한다.
>
> **모집단은 전부 열거 도출이다** (FR-06). 특정 사유서 파일명을 수용 기준에 박지 않는다 — req 원문은 단일 파일을 지목했으나, 그렇게 두면 그 파일이 `RULE-05` 경로로 해소되는 순간 판정이 사라진다. 아래 AC-1 은 같은 현상을 **루트 전수**로 잰다.

- [ ] (Must, FR-01·FR-06·AC-1) **처방 절 제목이 2개 이상 매칭되는 사유서가 0** 이다 — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  t=0; a=0
  for f in $(find specs/50.blocked/task -name '*_reason.md' | sort); do
    t=$((t+1))
    n=$(grep -cE '^##[[:space:]].*재발행' "$f")
    [ "$n" -ge 2 ] && a=$((a+1))
  done
  echo "reason-docs=$t ambiguous-section=$a"
  [ "$t" -ge 1 ] || exit 2
  [ "$a" -eq 0 ]
  ```
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `reason-docs=9 ambiguous-section=4` / rc=1 — 위반 baseline.** 지목 4건 — `TSK-20260825-07-spec-coherence-scope-extension` · `TSK-20260825-22-api-base-url-derivation-totality-and-cast-gate` · `TSK-20260825-24-env-api-base-presence-channel` · `TSK-20260827-02-precommit-trigger-includes-own-gate-script`.
  > **모집단의 44% 다 — 단발 사고가 아니다.** 분모(`reason-docs`)를 함께 출력하는 이유는 이 축이 **모집단이 위반과 함께 줄어드는 형태**이기 때문이다: 사유서가 `RULE-05` 경로로 해소되면 위반도 함께 사라져 `ambiguous-section=0` 이 되지만, 그것은 추출기가 고쳐진 것이 아니다. `t` 를 함께 읽어야 그 구분이 관측된다. `t < 1` 은 `exit 2` 무판정 — 격리 트리는 `.gitignore:32` 로 워킹트리 전용이라 신선한 클론에서 공집합이 되며, 그 상태의 `a=0` 은 충족이 아니라 무의미다.
  >
  > **수리 방향은 문서가 아니라 추출기다.** `50.blocked/**` 는 편집 금지(§역할)이므로 이 항목을 문서 제목 수정으로 닫을 수 없다. 닫는 길은 `sectionOf` 가 **첫 매칭 절에서 수집을 종료**하거나, 매칭 ≥2 를 무판정으로 계수하는 것뿐이다.

- [ ] (Must, FR-02·AC-2) **극성 배제 계수가 발화되고 실 corpus 에서 ≥1 이다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
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
  → **실측 2026-08-28 (HEAD `ec82e08`): 토큰 부재 / rc=1 — 위반 baseline.**
  > `≥1` 하한을 두는 이유는 **필터가 실제로 무언가를 걸렀음**을 요구하기 위함이다. 토큰만 출력하고 항상 `0` 인 구현은 계약을 문자로만 만족한다 — 상대 대조 없이 절대 하한을 두는 형태다. 하한의 근거는 아래 §배경 실측의 부정 서술 실측이다.

- [ ] (Must, FR-02·AC-3) **부정 서술 라인의 경로가 요구 집합에 들어가지 않는다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
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
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `unconsumed=19` / rc=1 — 위반 baseline** (`scripts/check-vite-env-coherence.sh` 가 열거에 있다. 그 경로는 사유서 `:86` 의 "영향이 **없다**" 서술과 `:106` 이하 측정표에서만 나타난다).
  > 지목 3경로는 하드코딩이 아니라 **부정 서술·표 셀에서만 유래한 것으로 확인된 표본**이다 (§배경 실측). `unconsumed ≥ 1` 하한이 없으면 열거가 통째로 비었을 때 `rc=0` 이 되어 **추출기가 죽은 상태가 충족으로 읽힌다**.

- [ ] (Must, FR-03·AC-4) **무판정 라벨이 사유와 함께 출력된다** — 판정: `bash -c 'o=$(TASK_PRECONDITION_ROOT=specs/40.task bash scripts/check-task-precondition-scope.sh 2>&1); printf "%s" "$o" | grep -qE "NO-JUDGEMENT: (root-missing|population-empty|marker-set-empty|judgeable-unit-empty)"'`
  → **실측 2026-08-28 (HEAD `ec82e08`): rc=0 — 보존 대상** (`NO-JUDGEMENT: population-empty — docs=0 (하한 1) root=specs/40.task`).

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

- [ ] (Must, NFR-01·AC-6) **격리 트리 진단 포함 단독 실행 벽시계 < 20s** — 판정: `bash -c 'S=$(date +%s); TASK_PRECONDITION_ROOT=specs/50.blocked/task TASK_PRECONDITION_REASON_ROOT=specs/50.blocked/task bash scripts/check-task-precondition-scope.sh >/dev/null 2>&1; E=$(date +%s); echo "elapsed=$((E-S))s"; [ $((E-S)) -lt 20 ]'`
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `elapsed=0s` / rc=0 — 보존 대상.** 극성 판정 추가가 이 예산을 넘기지 않는다.

## 참고

### 비-중복 근거 (인접 계약)
- `foundation/task-precondition-scope-nonvacuity-and-reason-consumption` — **같은 게이트의 상위 계약**. 그것은 "처방이 스코프로 흘렀는가" 라는 **판정 축**을 소유하고, 본 계약은 그 축이 쓰는 **요구 집합의 도출 정밀도**를 소유한다. 상위 계약이 참이어도 요구 집합이 과대하면 열거는 읽을 수 없는 목록이 된다 — 축과 정밀도는 독립이다.
- `testing/derived-population-totality-judgement` (blue) — 모집단 **전수성**. 본 계약은 전수인 모집단 안에서 **어느 라인이 요구를 낳는가** 를 다룬다. 전수성은 본 계약의 전제이지 중복이 아니다.

### 미측정·비판정 항목
- **과대 계수의 정확한 정밀도(참 양성 / 전체) 비율** — 참 양성의 판정에 사람 판단이 들어가므로 상시 측정 채널이 없다. 계약은 비율 대신 **극성 배제가 작동함**(AC-2)과 **표본 경로가 열거에서 빠짐**(AC-3)으로 대리한다.
- **`unconsumed-prescription` 참 양성의 개별 해소** — §역할 out-of-scope. 이 계약이 닫혀도 참 양성 열거는 남으며, 그것이 정상이다.
- **부정 서술 어휘 목록의 완전성** — 자연어 부정 표현은 열거로 닫히지 않는다. 게이트는 열거된 표지에 대해서만 배제하며, 미포함 표현이 요구로 새는 것은 위반이 아니라 **알려진 잔여**다.
- **AC-7(부정 서술 라인 경로 추가 주입) · AC-8(처방 라인 경로 추가 주입)** — **가정 주입 요구** 부류이므로 체크박스로 두지 않고 §게이트 실효 검증 이관 으로 내린다. 검출 방향은 보존된다.

### 배경 실측 (HEAD `ec82e08`, tick 240)
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

> **게이트는 정확히 붉다.** `rc=1` 은 옳고, 참 양성도 그 안에 있다. 틀린 것은 **붉은 이유의 구성**이다 — 오늘 다른 축에서 관측된 것과 같은 형태다 (`RULE-06 §게이트 실효 검증` 이 겨냥하는 민감도 결손의 거울상: 여기서는 특이도 결손이다).

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
