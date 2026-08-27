# 정체 판정 계측 라인의 타입 계약과 손상 가시성

> **위치**: `scripts/pipeline-health.sh` 의 진행 판정부(`moved` 참조 지점) · `package.json scripts."pipeline:health"` · 집행 게이트 `scripts.check:telemetry-schema` (미등재 — §promote 참조) · 픽스처 `scripts/fixtures/telemetry-schema/`
> **관련 요구사항**: REQ-20260825-008
> **최종 업데이트**: 2026-08-27 (by inspector, REQ-20260825-008 흡수 — green 신규 등록)
> **측정 HEAD**: `badcfe2` (본 문서의 모든 수치는 inspector 가 이 HEAD 에서 직접 실행한 실측)

> 참조 코드는 **식별자 우선, 라인 번호 보조**.

## 역할

`RULE-03` 의 정체 감지 (S1)(S2)(S3) 는 판정을 전적으로 `.claude/reports/<agent>.ndjson` 의 `moved` · `streak` 필드에 위임한다. 이 계약은 **그 판정 입력이 타입 계약을 만족하고, 위반이 조용히 통과하지 않는다**는 것을 선언한다.

**방어 대상 (RULE-07 §주제 우선순위 2 — 명시 의무)**: 계측 라인의 타입 손상이 **"진행 0" 으로 조용히 확정되는** silent regression. 손상이 유효한 JSON 이면 파싱은 통과하고 비교만 거짓이 되므로 어떤 단계에서도 발화하지 않는다. 구체적 귀결 2건:

1. **(S1) 하드 정지의 거짓 발화** — `moved` 가 판정기에 0 으로 보이면 생산적 에이전트가 정지한 것으로 계수된다. `.claude/locks/stall-<agent>` 는 **운영자만 삭제할 수 있어 자동 복구 경로가 없다**.
2. **(S3) 강제 격리 판정의 왜곡** — 진행 계수가 같은 채널을 공유하므로 격리 의무의 발동 조건도 흔들린다.

방향이 특히 나쁘다 — 정체를 놓치는 오류(false negative)는 기존 369 tick 문제의 반복이지만, 이것은 **정상 동작을 정지시키는 오류(false positive)** 다.

### 왜 기존 자동 게이트가 못 보는가 (구조적 3중 사각)

- `.gitignore:36` 이 `.claude/reports/` 를 제외한다. **이 gitignore 자체는 옳다** — 추적하면 no-op tick 마다 staged diff 가 생겨 빈 커밋이 부활한다 (`RULE-04` 명시). 그 결과 어떤 pre-commit 훅·`check:*` 도 이 파일을 보지 않는다.
- `scripts/pipeline-health.sh` 는 스스로 `exit 0 항상 — 진단 표면이지 게이트가 아니다` 라고 선언한다. 손상을 발견해도 실패시킬 수 없다.
- 손상은 **유효한 JSON** 이므로 파싱 단계에서도 걸리지 않는다.

세 조건이 겹쳐 **게이트가 자기 계측기를 보지 않는** 구조가 된다. 따라서 판정 표면은 저장소 안의 **픽스처**를 모집단으로 삼아야 한다 (§동작 (T-3)).

## 동작

### (T-1) 계측 라인 타입 계약

`.claude/reports/<agent>.ndjson` 의 각 라인은 유효한 JSON 객체이며 다음 타입을 만족한다 (`RULE-04 §ndjson 라인 형식`).

| 필드 | 타입 | 비고 |
|---|---|---|
| `moved` | 정수 ≥ 0 | **(S1)(S3) 판정의 직접 입력.** stdout 보고 블록의 동명 필드는 배열이지만 **ndjson 은 개수**다 |
| `streak` | 정수 ≥ 0 | (S2) 판정의 직접 입력 |
| `no_op` | 불리언 | |
| `tick` | 정수 | |
| `ts` | 문자열 (UTC ISO-8601) | |
| `notes` | 문자열 배열 | |

### (T-2) 진행 판정은 타입 확인을 선행한다

`moved > 0` 형태의 진행 판정은 **타입 확인 뒤에** 수행된다. 비-숫자 `moved` 는 0 으로 침묵 강등되지 않고 **손상으로 식별**된다. 이 확인은 `streak` 과 `moved` 에 **동일하게** 적용된다 — 한 필드만 가드된 상태를 계약 위반으로 본다.

> **현 위반의 형태 (HEAD `badcfe2` 실측)** — 같은 함수 안에서 두 필드가 다르게 취급된다. `moved` 비교 지점은 1곳이고 그중 타입 가드를 가진 것은 **0곳**이며, `streak` 은 `typeof streak === "number"` 가드를 **1곳** 갖는다. 판단이 내려져 있었으나 옆 필드로 전파되지 않은 형태다. JS 에서 `["…"] > 0` 은 배열 → 문자열 → `NaN` 비교로 **false** 이므로 진행이 사라진다.

### (T-3) 손상은 조용하지 않다

손상 라인(타입 위반 · JSON 파싱 실패)이 발견되면 진단 표면은 그 사실을 **출력에 드러낸다** — 최소한 몇 번째 tick 의 어느 필드인지. `exit 0` 유지는 그대로다: 요구되는 것은 종료 코드가 아니라 **가시성**이다. 파싱 실패 라인 역시 빈 `catch` 로 침묵 소거하지 않고 계수·표시한다.

판정 가능성을 위해 진단 표면과 집행 게이트는 **모집단 루트를 주입 가능한 seam 으로 노출**한다. seam 의 **이름은 본 계약이 규정하지 않는다** — 형태(기본값을 가진 환경변수)만 요구하며, 이름·형태의 소유처는 blue `foundation/gate-judgement-population-injectable-seam` 이다. 본 계약의 판정 명령은 seam 이름을 스크립트 본문에서 **도출**한다.

### (T-4) 부재는 오류가 아니다

계측 파일이 하나도 없는 상태에서 판정 표면은 **오류 없이 정상 종료**한다. `.claude/reports/**` 는 git 추적 대상이 아니므로 클린 클론·CI 에서 부재가 정상이다. 본 계약은 그 추적 전환을 요구하지 **않는다**.

## 의존성

- `RULE-04 §ndjson 라인 형식` (타입의 출처) · `RULE-03 §실질 진행의 정의` · `(S1)(S2)(S3)`.
- blue `foundation/gate-judgement-population-injectable-seam` — seam 형태의 소유 계약.
- `package.json scripts."pipeline:health"` · `scripts/pipeline-health.sh`.

## 수용 기준

> 전 항목 HEAD `badcfe2` 에서 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 명령은 `package.json` · `scripts/**` 만 참조하며 **spec 자신의 green/blue 경로를 참조하지 않는다** (promote 조건 2). 대상 경로·seam 이름·픽스처 목록은 전부 **도출**하며 하드코딩하지 않는다 (RULE-06 §열거 고정 금지).

- [ ] **(Must, T-2) 진행 판정의 타입 가드 — `moved`/`streak` 대칭**
  ```
  bash -c '
  f=$(node -e "var s=(require(\"./package.json\").scripts||{})[\"pipeline:health\"]||\"\";var m=s.match(/scripts\/[A-Za-z0-9._\/-]+\.sh/);process.stdout.write(m?m[0]:\"\")")
  if [ -z "$f" ] || [ ! -f "$f" ]; then echo "derive-failed: pipeline:health 미등재"; exit 2; fi
  body=$(sed -E "s#^[[:space:]]*(//|\#).*##" "$f")
  mref=$(printf "%s\n" "$body" | grep -cE "[.[]\"?moved")
  mcmp=$(printf "%s\n" "$body" | grep -E "[.[]\"?moved" | grep -cE "[<>]")
  mbad=$(printf "%s\n" "$body" | grep -E "[.[]\"?moved" | grep -E "[<>]" | grep -vc "typeof")
  sgd=$(printf "%s\n" "$body" | grep -cE "typeof.*streak")
  echo "path=$f moved-refs=$mref moved-compares=$mcmp unguarded=$mbad streak-guards=$sgd"
  if [ "$mref" -eq 0 ] || [ "$sgd" -eq 0 ]; then echo "population-empty"; exit 2; fi
  test "$mbad" -eq 0'
  ```
  → **rc=0**. **HEAD `badcfe2` 실측: `path=scripts/pipeline-health.sh moved-refs=1 moved-compares=1 unguarded=1 streak-guards=1` / rc=1 → 미충족.**
  `streak-guards=1` 과 `unguarded=1` 이 나란히 출력되는 것이 **비대칭의 수치 증거**다. 주석 라인(`#` · `//`)은 계수 전 절단한다 — `moved` 를 언급만 하는 설명 주석이 모집단에 들어오지 않는다.

  **판정 상태 3종 실측 (inspector, probe 사본)**

  | probe | 출력 | rc |
  |---|---|---|
  | 무주입 (현 트리) | `unguarded=1 streak-guards=1` | **1** (특이도) |
  | 비교 지점에 `typeof e.moved === "number"` 주입 | `unguarded=0 streak-guards=1` | **0** (민감도) |
  | `moved` 참조가 없는 스크립트 | `moved-refs=0` → `population-empty` | **2** (공집합 무판정) |

- [ ] **(Must, T-1·T-3·T-4) 집행 게이트가 픽스처를 방향별로 판정한다**
  ```
  bash -c '
  v=$(node -e "var s=(require(\"./package.json\").scripts||{})[\"check:telemetry-schema\"]||\"\";process.stdout.write(s)")
  if [ -z "$v" ]; then echo "derive-failed: scripts[check:telemetry-schema] 미등재"; exit 2; fi
  g=$(printf "%s" "$v" | grep -oE "scripts/[A-Za-z0-9._/-]+\.sh" | head -1)
  if [ -z "$g" ] || [ ! -f "$g" ]; then echo "derive-failed: 게이트 스크립트 부재 [$g]"; exit 2; fi
  V=$(grep -oE "\\$\{[A-Z][A-Z0-9_]*:-" "$g" | sed -E "s/^\\$\{//; s/:-$//" | head -1)
  if [ -z "$V" ]; then echo "derive-failed: $g 에 모집단 주입 seam 부재"; exit 2; fi
  F=scripts/fixtures/telemetry-schema
  ok=$(ls "$F"/valid-*.ndjson 2>/dev/null | wc -l | tr -d " ")
  ng=$(ls "$F"/invalid-*.ndjson 2>/dev/null | wc -l | tr -d " ")
  echo "gate=$g seam=$V valid-fixtures=$ok invalid-fixtures=$ng"
  if [ "$ok" -eq 0 ] || [ "$ng" -eq 0 ]; then echo "fixture-population-empty"; exit 2; fi
  p=0; f=0
  for x in "$F"/valid-*.ndjson; do
    if env "$V=$x" bash "$g" >/dev/null 2>&1; then p=$((p+1)); else f=$((f+1)); echo "  MISS valid $x"; fi
  done
  for x in "$F"/invalid-*.ndjson; do
    out=$(env "$V=$x" bash "$g" 2>&1); rc=$?
    fld=$(basename "$x" .ndjson | sed -E "s/^invalid-//; s/-.*$//")
    if [ "$rc" -ne 0 ] && printf "%s" "$out" | grep -q "$fld"; then p=$((p+1)); else f=$((f+1)); echo "  MISS invalid $x (rc=$rc field=$fld)"; fi
  done
  T=$(mktemp -d)
  if env "$V=$T" bash "$g" >/dev/null 2>&1; then p=$((p+1)); else f=$((f+1)); echo "  MISS absent-target"; fi
  echo "fixture-judgements pass=$p fail=$f"
  test "$f" -eq 0'
  ```
  → **rc=0**. **HEAD `badcfe2` 실측: `derive-failed: scripts[check:telemetry-schema] 미등재` / rc=2 → 무판정(fail-closed).**
  - **픽스처 목록을 하드코딩하지 않는다** — `valid-*` / `invalid-*` glob 으로 열거하고 각 클래스 모집단이 0 이면 `exit 2`. 위반 필드명은 **파일명에서 도출**(`invalid-<field>-*.ndjson`)하므로 픽스처를 추가하면 판정 방향이 자동으로 늘어난다.
  - **양방향을 한 명령에 내장했다** — 적합 픽스처는 `rc=0` 을(특이도), 부적합 픽스처는 `rc≠0` **이면서 출력에 해당 필드명 포함**을(민감도) 요구한다. 부재 대상 1건이 (T-4) 를 판정한다.
  - **판정 상태 5종 실측 (inspector, probe 사본)**

    | probe | 출력 | rc |
    |---|---|---|
    | 현 트리 (게이트 미등재) | `derive-failed: … 미등재` | **2** (fail-closed) |
    | 게이트에 seam 없음 | `derive-failed: … 주입 seam 부재` | **2** (fail-closed) |
    | 계약대로 구현한 게이트 | `pass=5 fail=0` | **0** (민감도) |
    | **검출력 0 게이트** (seam 보유, 항상 `exit 0`) | `pass=2 fail=3` — 부적합 3종 전부 MISS | **1** |
    | **항상 실패 게이트** (seam 보유, 항상 `exit 1`) | `pass=3 fail=2` — 적합 · 부재 대상 MISS | **1** |

    마지막 두 행이 본 항목의 핵심이다. `RULE-06 §게이트 실효 검증` 이 경고하는 **민감도 0 게이트**와, 그 반대인 **특이도 0 게이트**가 둘 다 `rc=1` 로 걸린다.

- [ ] **(Must, T-3) 손상 라인이 진단 출력에 드러난다**
  ```
  bash -c '
  f=$(node -e "var s=(require(\"./package.json\").scripts||{})[\"pipeline:health\"]||\"\";var m=s.match(/scripts\/[A-Za-z0-9._\/-]+\.sh/);process.stdout.write(m?m[0]:\"\")")
  if [ -z "$f" ] || [ ! -f "$f" ]; then echo "derive-failed: pipeline:health 미등재"; exit 2; fi
  V=$(grep -oE "\\$\{[A-Z][A-Z0-9_]*:-" "$f" | sed -E "s/^\\$\{//; s/:-$//" | grep -iE "REPORT|NDJSON|TELEMETRY" | head -1)
  if [ -z "$V" ]; then echo "derive-failed: $f 에 보고 루트 주입 seam 부재"; exit 2; fi
  T=$(mktemp -d); mkdir -p "$T/r"
  printf "%s\n" "{\"ts\":\"2026-08-27T00:00:00Z\",\"agent\":\"developer\",\"tick\":90001,\"no_op\":false,\"streak\":0,\"moved\":[\"a -> b\"],\"notes\":[]}" > "$T/r/developer.ndjson"
  out=$(env "$V=$T/r" bash "$f" 2>&1)
  echo "seam=$V"
  printf "%s" "$out" | grep -q "90001" && printf "%s" "$out" | grep -q "moved"'
  ```
  → **rc=0**. **HEAD `badcfe2` 실측: `derive-failed: scripts/pipeline-health.sh 에 보고 루트 주입 seam 부재` / rc=2 → 무판정(fail-closed).**
  - tick 번호 `90001` 은 실제 계측 이력에 없는 값이라, seam 이 실제로 주입 트리를 읽었을 때만 출력에 나타난다. seam 미구현이면 저장소의 실제 보고를 읽어 `90001` 이 나오지 않으므로 **오통과가 구조적으로 막힌다**.
  - **판정 상태 3종 실측 (inspector, probe 사본)**

    | probe | 출력 | rc |
    |---|---|---|
    | 현 트리 (seam 부재) | `derive-failed: … 보고 루트 주입 seam 부재` | **2** (fail-closed) |
    | seam + 손상 가시화 구현 | `seam=PIPELINE_REPORTS_ROOT`, 출력에 `tick 90001 moved: object` | **0** (민감도) |
    | **seam 은 있으나 손상이 여전히 조용한 구현** | `seam=…`, 출력에 `90001` 없음 | **1** |

    마지막 행이 결정적이다 — "seam 만 붙이고 가시성은 그대로" 라는 **형식 통과 경로**를 배제한다.

## 게이트 실효 검증 이관 (RULE-07 §처리 · RULE-06 §게이트 실효 검증)

§수용 기준 3항은 픽스처·probe 를 명령 **안에** 내장했으므로 주입 검증이 이미 상설이다. 아래는 그 밖의 '가정 주입 요구' 부류라 체크박스로 두지 않으며, 검출 방향을 보존한 채 **수리 task 의 `## 검증/DoD`** 로 이관한다. `RULE-04` notes 에 `injection: 2/2 detect` · `control: 1/1 pass` 를 박제한다. **이관처 task 발행 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

- **(Dir-1) 민감도 — 게이트 자신의 무력화** — 신설 `check:telemetry-schema` 의 판정 로직을 `exit 0` 고정으로 바꾼 변형 → §수용 기준 2항 `rc≠0` (`pass=2 fail=3`) → 원복 → `rc=0`.
- **(Dir-2) 민감도 — 진단 표면의 침묵 복귀** — `pipeline-health.sh` 의 손상 표시 라인을 제거한 변형 → §수용 기준 3항 `rc≠0` → 원복 → `rc=0`.
- **(Dir-3) 특이도 — 정상 변형 대조** — 계측 라인에 **계약 밖 필드**를 1개 추가한 픽스처(예: `moved_detail` 배열)와 주석만 추가한 스크립트 변형 → 양쪽 `rc=0`. 이 방향이 없으면 "미선언 필드를 전부 위반으로 읽는" 과잉 게이트가 통과한다. **현 계측 이력에 `moved_detail` 을 쓰는 라인이 실재하므로(inspector tick 230·232) 이 대조는 가상이 아니다.**
- **격리 수행** — 주입·대조는 저장소 밖 격리 사본에서 수행한다. probe setup 은 멱등해야 한다 (`10.followups/20260827-0340-agent-probe-node-modules-symlink-hazard.md`).

## 참고

### 관측 근거 (HEAD `badcfe2`, inspector 직접 실측)

전 계측 파일에 (T-1) 스키마를 적용한 결과:

```
developer.ndjson: lines=53 bad=7
discovery.ndjson: lines=15 bad=0
inspector.ndjson: lines=20 bad=0
planner.ndjson:   lines=26 bad=0
TOTAL lines=114 schema-violations=7 parse-failures=0
```

| 라인 | tick | 위반 |
|---|---|---|
| developer:12 | 12 | `moved: object` · `streak: undefined` · `notes: string` |
| developer:13~17 | 13·14·15·16·17 | `moved: object` |
| developer:29 | `"master-red-repair"` | `tick: string` |

- **파싱 실패 0건** — 손상은 전부 **유효한 JSON** 이다. §역할이 말한 "파싱은 통과하고 비교만 거짓이 된다" 가 수치로 확인된다.
- **원 req 는 6건(tick 12~17)을 보고했으나 실측은 7건**이다. 7번째(`developer:29`, `tick` 이 문자열 `"master-red-repair"`)는 req 작성 시점 측정에 잡히지 않은 **별 부류의 위반**이다 — `moved` 축만 보면 놓친다. (T-1) 이 필드 전수를 계약하는 이유가 이것이다.
- developer 의 `K = 8` 이고 배열 기록이 **6 tick 연속**이었으므로 (S1) 거짓 발화까지 **2 tick** 남아 있었다.
- 세 에이전트(discovery·inspector·planner)는 위반 0 이다. 규약이 못 읽힐 정도는 아니며, 본 계약이 겨냥하는 것은 기록 습관이 아니라 **손상을 조용하지 않게 만드는 표면**이다.

### 중복 회피 근거

- blue `foundation/gate-judgement-population-injectable-seam` — seam 의 **형태**를 소유한다. 본 계약은 seam 을 **요구하지 않고 도출해 사용**하며 이름을 규정하지 않는다. 그 spec 의 §제외 (i) 와 정합한다.
- blue `foundation/measurement-tree-attribution` — 커버리지 측정 트리 귀속 축이며 계측 라인 스키마와 무관하다.
- green `foundation/declared-gate-firing-channel-totality` — 게이트의 **발화 채널 유무**를 판정한다. 본 계약은 계측 라인의 **타입**이며 축이 다르다. 다만 `check:telemetry-schema` 신설 시 그 계약의 모집단에 들어오므로 채널 부착이 동반돼야 한다 (§promote).

### promote 선행 조건 (RULE-07 §promote 조건 4)

Must 측정 게이트 `check:telemetry-schema` 가 현 HEAD 에 **미등재**다. 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다. 부착 시 `package.json scripts` 등재 + `.husky/*` 또는 `ci.yml` 실행 라인 ≥1 이 함께 필요하다 — 그러지 않으면 green `declared-gate-firing-channel-totality` 1항이 이 키를 dead 로 열거해 즉시 붉어진다.

### 픽스처 경로 사전 점검 (RULE-06)

`bash -c 'git check-ignore -q scripts/fixtures/telemetry-schema/valid.ndjson; echo $?'` → **1 (미무시)**. 반면 `.claude/reports/inspector.ndjson` 은 **0 (무시)** 이다. 따라서 판정 모집단은 `scripts/fixtures/` 여야 하며, `.claude/reports/**` 를 직접 모집단으로 삼는 게이트는 **파일 부재를 위반이 아니라 통과로 읽는다** (false-negative). 이것이 (T-3) 이 seam 을 요구하는 이유다.

### 판정 명령 추출·이스케이프 (편집자 주의 — 실측 기반)

본 절의 수치는 **spec 파일에서 기계 추출한 명령**을 실행해 얻었다 (`RULE-06 §추출 실패 검출`). 추출 길이는 각각 798 / 1521 / 836 bytes 로 **비공집합**이며, 빈 문자열 추출 시 `bash -c ""` 가 `rc=0` 으로 오통과하는 경로를 차단한다.

**seam 도출 정규식의 `\\$\{` 는 이중 백슬래시가 필수다. 단일 `\$\{` 로 "정리" 하지 말 것.** 본 spec 작성 중 실제로 발생한 오류다 — 큰따옴표 안에서 `\$` 는 이스케이프가 소비되어 `$` 하나가 되고, ERE 에서 그 `$` 는 리터럴 달러가 아니라 **행말 앵커**로 읽혀 어떤 입력과도 매치하지 않는다. 결과는 조용하다: seam 이 올바로 구현된 트리에서도 `derive-failed … seam 부재` 를 내며 `rc=2` 를 유지하므로, **미구현 상태와 문자 단위로 구별되지 않는다.** 게이트가 영원히 초록이 되지 않는데 그 사실이 "아직 구현 전" 으로 읽히는 형태다.

검출 방법도 함께 박제한다 — 현 트리에서 `rc≠0` 인 것만으로는 알 수 없고, **seam 을 갖춘 probe 사본에서 `rc=0` 이 나오는지**(민감도)를 확인해야 잡힌다. 아래 판정 상태 표의 "민감도" 행이 그 역할을 한다.

### 미측정·비판정 항목 (RULE-07 §처리)

- **에이전트가 향후 적합한 라인만 기록하는가** — 미래 사건 대기 부류. 본 계약이 세우는 것은 기록 습관이 아니라 손상을 조용하지 않게 만드는 표면이다.
- **`p(손상 재발)` 의 감소량** — 측정 채널이 없다.
- **과거 라인(developer tick 12~17 · 29)의 소급 정정 여부** — 원 신고가 요구하지 않았고, 정정 자체가 기록 신뢰성을 흐릴 수 있다. 운영자 판단 항목이다.
- **`RULE-04` 의 stdout `moved`(배열) ↔ ndjson `moved`(개수) 이름 충돌** — 이 결함의 구조적 원인이지만 `rules/**` 는 `RULE-01` 상 **operator 전용** 쓰기 영역이라 본 계약으로 발주할 수 없다. 개명(예: `moved_count`) 여부는 운영자 결정이며, **그 결정과 무관하게 (T-1)~(T-4) 는 성립한다** — 판정 표면은 현행 규약이 선언한 타입을 그대로 강제한다.
- **`.claude/reports/**` 의 git 추적 전환** — 요구하지 않는다. 빈 커밋 부활 회귀를 부른다 (`RULE-04` 명시).
- **`npm test` rc=0 유지** — 중복 게이트 부류라 체크박스로 두지 않는다 (위반 시 husky·CI 즉시 실패).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-27 | inspector / REQ-20260825-008 | **green 신규 등록.** 원 req 의 Given/When/Then 8항을 판정 가능한 3항으로 재정식화 — 대상 경로·seam 이름·픽스처 목록을 전부 도출형으로 바꾸고(RULE-06 §열거 고정 금지) 공집합·미등재를 `exit 2` 무판정으로 fail-closed 화했다. 3항 전부 HEAD `badcfe2` 에서 inspector 가 직접 실행(rc=1 / rc=2 / rc=2)했고, 판정 상태 3·5·3종 probe 를 실측해 박제했다. 원 req 의 `npm test rc=0` 항은 중복 게이트라 §미측정으로 강등, `향후 적합 기록`·`p(재발)`·`소급 정정`·`rules 개명` 은 부적격 부류로 §미측정 존치. 실측 중 원 req 미보고 위반 1건(`developer:29` `tick: string`) 추가 발견. | 전체 (신설) | |
