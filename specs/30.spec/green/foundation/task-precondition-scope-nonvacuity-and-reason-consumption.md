# task 발행 선행 조건은 비공허한 관측 범위 위에서만 해소되고, 격리 사유서의 처방은 재발행 입력으로 소비된다

> **위치**: `specs/40.task/**` 문서의 §배경 선행 조건 주장 · `## 변경 범위` · `## 스코프 규칙`(`expansion:`), 그리고 읽기 전용 참조로서 `specs/50.blocked/task/*_reason.md` 의 `§재발행 시 필요한 것`. 게이트 배선처는 `package.json scripts.check:*`.
> **관련 요구사항**: REQ-20260828-039
> **최종 업데이트**: 2026-08-28 (by inspector — tick 240 drift reconcile: TSK-20260828-08 착지분 재측정 반영)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`0856d9b`).

## 역할

task 발행 직전에 주장되는 **선행 조건 해소**는, 그 주장을 지탱하는 **관측 범위가 비공허함**이 함께 관측될 때만 해소로 계수된다. 그리고 선행 격리가 남긴 `_reason.md` 의 처방은 **재발행 task 의 `## 변경 범위` · `expansion` 으로 흘러야** 한다.

이 계약이 겨냥하는 형태는 하나다 — **측정 범위가 측정 대상을 담지 못하는데 그 결과가 초록으로 읽힌다.**

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 `§역할` 이 요구하는 대로 **방어 대상을 명시한다**:

> **동일 결합에 대한 반복 task 격리.** `EXPECTED_GA_SELF_DIAG_COUNT` baseline 결합이 2026-08-27(`TSK-20260827-02`) · 2026-08-28(`TSK-20260828-07`) 이틀 연속 같은 자리에서 task 를 격리시켰다. 두 번째 격리는 **첫 번째 사유서가 앵커 문자열까지 처방을 이미 갖고 있는 상태**에서 발생했다 — 손실의 원인은 정보 부족이 아니라 정보 미소비다.

등록 시점(`8189a07`) 실측 — 이 회귀는 어떤 채널에서도 붉어지지 않았다. `check:*` 27종 중 `40.task/**` 의 선행 조건 주장이나 `_reason.md` 처방 반영을 보는 것은 **0종**이었다. **해소 (`0856d9b`)**: `check:task-precondition-scope` 1종이 배선됐다.

**하지 않는 것**: `specs/50.blocked/**` 에 대한 생성·편집·이동을 일절 요구하지 않는다 (`RULE-01` writer 매트릭스상 운영자 경로). **소비는 읽기다.** 또한 결합 fixture(`EXPECTED_GA_SELF_DIAG_*`) 자체의 값 갱신, `TSK-20260828-07` 의 재발행 여부, `60.done` 소급 교정은 본 계약 밖이다.

## 공개 인터페이스

- 게이트: `package.json` 의 `check:task-precondition-scope` (`:54`) + `scripts/check-task-precondition-scope.sh`.
- 모집단 루트 seam: `TASK_PRECONDITION_ROOT` (`:101`) · 사유서 루트 seam `TASK_PRECONDITION_REASON_ROOT` (`:102`). 선례 `ACC_SPEC_ROOT` — `scripts/check-acceptance-criteria.sh:85`.
- 출력: 모집단 계수 · 위반 파일 경로 열거 · `NO-JUDGEMENT` 토큰.
- 종료 등급: `0` 준수 / `1` 위반 / `2` 무판정(모집단 공집합·추출 실패).

## 동작

### FR-01 — 맨 `0 hit` 주장은 해소가 아니다 (Must)
task 문서가 선행 조건 해소를 `0 hit` 으로 주장하면 그 주장은 (a) **비공허 대조** — 같은 패턴이 hit 을 내는 범위를 함께 박제 — 또는 (b) **범위 도출** — 손 열거 대신 저장소 루트 또는 `git ls-files` 전수 — 중 하나를 동반한다. 어느 쪽도 없는 맨 `0 hit` 주장은 위반이다.

> 근거는 **오류 비용의 비대칭**이다. 범위가 좁으면 `0 hit` → 발행 → 격리(세션 1개 소모)이고, 넓으면 hit → 보류(비용 없음). 기본값이 저비용 쪽이 아니라 고비용 쪽에 놓여 있다. 손으로 열거한 경로 목록은 **항상 좁아지는 방향으로만** 틀린다 — 결합의 존재를 모르는 열거자는 그 경로를 적을 수 없기 때문이다.

### FR-02 — 재발행 task 는 선행 사유서의 지목 대상을 스코프에 담는다 (Must)
선행 격리를 가진 축의 재발행 task(`supersedes:` 또는 §배경이 선행 task ID 를 지목)는, 그 `_reason.md` 의 `§재발행 시 필요한 것` 이 **파일 경로로 지목한 대상 전수**를 `## 변경 범위` 에 포함한다. 포함하지 않으려면 `expansion: 허용` 이어야 한다. **`불허` + 미포함** 조합은 착지 불가가 발행 시점에 확정된 상태이며 위반이다.

### FR-03 — 사유서가 지목한 경로는 FR-01 의 확인 범위에 필수 포함된다 (Must)
`_reason.md` 가 전체 경로로 명시한 파일을 확인 범위에서 빼고 낸 `0 hit` 은 **비공허 대조가 없는 것으로 계수**한다.

### FR-04 — 공집합은 초록이 아니라 무판정이다 (Must)
판정 모집단(`40.task/**` 문서 수, 선행 격리 참조 수)이 공집합이면 `rc=0` 이 아니라 무판정이다. 모집단 수를 stdout 에 계수 출력하고, 하한 미달 시 `NO-JUDGEMENT` 토큰과 함께 종료한다. **위반 0 과 모집단 0 의 출력은 문자열로 달라야 한다.**

> **기본 모집단은 실 트리가 아니라 추적 fixture 다 (구현 확정 · tick 240 반영).** 등록 시점 골격은 `specs/40.task` 를 기본 모집단으로 상정했으나, 구현은 기본값을 `scripts/fixtures/task-precondition/conforming` 으로 두고 실 트리는 seam 주입 전용 로컬 진단으로 분리했다 (`scripts/check-task-precondition-scope.sh:50-56` 근거, 선례 `scripts/check-telemetry-schema.sh`). 근거가 더 강하므로 spec 을 구현 쪽으로 맞춘다 — 실 트리를 기본값으로 두면 `.gitignore` 때문에 신선한 클론·CI 에서 상시 채널이 **항상 무판정으로 붉어진다**. FR-04 가 요구하는 것은 "공집합을 초록으로 읽지 않음" 이지 "실 트리가 기본값" 이 아니다.
>
> 이것은 선택 사항이 아니라 게이트 본체다. 현 HEAD 실측 — `.gitignore:30` `specs/40.task` · `:32` `specs/50.blocked/task` 로 두 모집단이 **워킹트리 전용**이다 (`git ls-files specs/40.task` → 0 tracked / 0 disk, `git ls-files specs/50.blocked/task` → 0 tracked / 18 disk). 신선한 클론에서 두 디렉터리는 비어 있으므로, 모집단을 세지 않는 게이트는 **영구 초록**이 된다 — FR-01 이 당한 false-negative 가 한 층 위에서 그대로 재현된다.

### FR-05 — 모집단 루트는 환경변수 seam 으로 교체 가능하다 (Must)
저장소 트리를 훼손하지 않고 위반 fixture 로 민감도를 판정하기 위한 주입점이다. 선례: `scripts/check-acceptance-criteria.sh:85` (`ACC_ROOT="${ACC_SPEC_ROOT:-specs/30.spec}"`, 취지 `:49`).

### FR-06 — 위반 fixture 는 git 추적 경로에 둔다 (Must)
`scripts/fixtures/` 는 현 HEAD 에서 `git check-ignore -q scripts/fixtures` → rc=1 (미무시) 로 확인됐다. `specs/40.task/` 하위 fixture 설계는 `.gitignore:30` 때문에 **금지**한다 — 커밋되지 않고 휘발하며 게이트는 파일 부재를 통과로 읽는다 (`RULE-06 §fixture probe 경로 사전 점검`).

### FR-07 — 게이트는 자기봉쇄를 만들지 않는다 (Should)
검출 토큰(`0 hit` · `expansion:` · `supersedes:` 등)은 게이트 자신이나 본 spec 이 장래 스캔 대상에 들어갈 때 **자기 hit** 을 만들지 않는다. 선례: `scripts/check-acceptance-criteria.sh:44-47` 이 같은 이유로 토큰을 `printf` 분할 조립한다.

### FR-08 — 판정 스코프는 writer 매트릭스와 정합한다 (Must)
`40.task/**` 의 writer 는 planner 이므로 집행 대상이다. `50.blocked/**` 는 **읽기 전용 참조**로만 쓰며 blocked 문서 자체의 형식 위반을 `rc` 로 집행하지 않는다 — 고칠 writer 가 파이프라인에 없다. 선례: `scripts/check-acceptance-criteria.sh:53-54` 의 집행/ADVISORY 분리.

### 발화 채널 (RULE-07 §promote 조건 4)
**현 HEAD 실재 · 3채널** — `package.json` `scripts.check:task-precondition-scope` (`:54`) · `.husky/pre-commit` (`:155-156`, 게이트·fixture 변경 시 조건 발화) · `.github/workflows/ci.yml` (`:213`). 채널 부착 선행 조건은 `0856d9b` 로 해소됐다.

## 의존성
- 내부: `specs/40.task/**` (판정 대상) · `specs/50.blocked/task/*_reason.md` (읽기 전용 입력) · `scripts/fixtures/**`.
- 외부: `git ls-files` · `git check-ignore` · POSIX sh · node.
- 인접 계약: `foundation/gate-judgement-population-injectable-seam` (seam 축) · `foundation/blue-attributed-violation-advisory-accounting` (집행/ADVISORY 분리 축).
- 역의존: planner 의 task 발행 절차.

## 테스트 현황
- [x] 게이트 스크립트 — `scripts/check-task-precondition-scope.sh` (TSK-20260828-08, `0856d9b`).
- [x] fixture (위반/준수 각 2방향) — 준수 `conforming/` 4건 + `control-reason-consumption/` 1건, 위반 `violation-nonvacuity/` 2건 + `violation-reason-consumption/` 1건, 무판정 `empty/`, 사유서 `reason/` 2건.

## 수용 기준

- [x] (Must, FR-01·AC-1) 게이트가 `check:*` 키로 배선돼 있다 — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  node -e 'const s=require(process.cwd()+"/package.json").scripts;const ks=Object.keys(s);if(ks.length<20)process.exit(2);process.exit(ks.some(k=>/^check:/.test(k)&&/precondition/.test(k))?0:1)'
  ```
  → **실측 2026-08-28 (HEAD `ec82e08`, tick 240 재실행): rc=0 → 충족** (`check:task-precondition-scope`. 등록 시점 `8189a07` 에서는 rc=1 / 채널 미부착이었다). 키 총수 하한 20 미달은 `rc=2` 로 분기해 추출기 노후를 통과와 구분한다.
- [x] (Must, FR-01·AC-3) 준수 fixture(비공허 대조 동반 1건 + `git ls-files` 전수 범위 1건)를 seam 으로 지정해 실행 시 `rc=0` — 특이도. 판정: `bash -c 'TASK_PRECONDITION_ROOT=scripts/fixtures/task-precondition/conforming bash scripts/check-task-precondition-scope.sh'` → **실측 2026-08-28 (HEAD `ec82e08`): rc=0 / `docs=4 reasons=2 claims=2 linked=1 violations=0 (PASS)`.** `claims=2 ≥ 1` 이 특이도 판정의 비공허 조건이다 — 주장이 0건이면 위반 0 은 아무것도 뜻하지 않는다. 대조 fixture 는 `TSK-20260101-01-nonvacuous-contrast.md`(비공허 대조) · `TSK-20260101-02-derived-scope.md`(범위 도출).
- [x] (Must, FR-02·AC-5) `expansion: 허용` 준수 변형에서 `rc=0` — 특이도. 위반 변형과 **한 축만** 다르다. 판정: `bash -c 'TASK_PRECONDITION_ROOT=scripts/fixtures/task-precondition/control-reason-consumption bash scripts/check-task-precondition-scope.sh'` → **실측 2026-08-28 (HEAD `ec82e08`): rc=0 / `docs=1 reasons=2 claims=0 linked=1 violations=0 (PASS)`.** 한 축 대조는 실측으로 확인했다 — `diff control-reason-consumption/TSK-20260103-01-unconsumed-prescription.md violation-reason-consumption/TSK-20260103-01-unconsumed-prescription.md` 가 **`20c20` 1줄** (`- **expansion**: 허용` ↔ `불허`) 만 낸다. 위반 변형은 같은 명령에서 `rc=1`.
- [x] (Must, FR-04·AC-6) 빈 디렉터리를 모집단 루트로 지정하면 `NO-JUDGEMENT` 와 모집단 계수가 나오고, 그 출력이 위반 0 통과 출력과 **문자열로 다르다**. 판정: `bash -c 'TASK_PRECONDITION_ROOT=scripts/fixtures/task-precondition/empty bash scripts/check-task-precondition-scope.sh'` → **실측 2026-08-28 (HEAD `ec82e08`): rc=2 / `NO-JUDGEMENT: population-empty — docs=0 (하한 1) root=scripts/fixtures/task-precondition/empty`.** 통과 출력(`… violations=0 … (PASS)`)과 문자열이 겹치지 않고 rc 도 `0`/`2` 로 갈린다 — 두 축 모두에서 구분된다.
- [x] (Must, FR-04·AC-7) **실 트리(`specs/40.task`)를 seam 으로 주입하면 무판정으로 떨어지고, 기본 모집단은 추적 fixture 라 상시 채널이 판정을 낸다.** 판정: `bash -c 'TASK_PRECONDITION_ROOT=specs/40.task bash scripts/check-task-precondition-scope.sh; [ $? -eq 2 ]'` → **실측 2026-08-28 (HEAD `ec82e08`): rc=0 (게이트 자체는 `rc=2` / `population-empty — docs=0 (하한 1) root=specs/40.task`).**
  > **골격에서 재정식화 (tick 240).** 원문은 기본 모집단을 `specs/40.task` 로 상정했으나 구현은 기본값을 fixture 로 두었다 (§FR-04 주). 원문대로 두면 이 항목은 CI·훅에서 영구 `rc=2` 를 요구하게 되어 **상시 채널을 상시 무판정으로 만든다** — FR-04 가 막으려던 영구 초록의 거울상이다. 실 트리 무판정은 여전히 판정 대상이므로 seam 주입 형태로 보존했다.
- [x] (Must, FR-06·AC-8) fixture 경로 전수가 미무시다 — 판정: `bash -c 'n=$(git ls-files scripts/fixtures | wc -l); [ "$n" -ge 1 ] || exit 2; for f in $(git ls-files scripts/fixtures); do git check-ignore -q "$f" && exit 1; done; exit 0'` → **실측 2026-08-28 (HEAD `ec82e08`, tick 240 재실행): rc=0 / 추적 fixture 71건** (등록 시점 60건 — `0856d9b` 이 11건 추가). 하한 `n ≥ 1` 이 없으면 `git ls-files` 가 공집합을 낼 때 루프가 0회 돌고 `rc=0` 이 나온다 — 본 계약이 FR-04 에서 금지하는 바로 그 공허 통과이므로 자기 수용 기준에도 동일 하한을 적용한다.
- [x] (Should, FR-07·AC-9) 게이트 자신과 본 계약 문서를 모집단에 넣어 실행해도 자기 hit 0 — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  SLUG=task-precondition-scope-nonvacuity-and-reason-consumption
  SELF=$(git ls-files "specs/30.spec/*/$SLUG.md" | head -1)
  [ -n "$SELF" ] || exit 2
  D=$(mktemp -d)
  cp scripts/check-task-precondition-scope.sh "$D/TSK-20260104-01-gate-self.md"
  cp "$SELF" "$D/TSK-20260104-02-spec-self.md"
  O=$(TASK_PRECONDITION_ROOT="$D" bash scripts/check-task-precondition-scope.sh 2>&1)
  printf '%s\n' "$O" | grep -q 'docs=2' || exit 2
  printf '%s\n' "$O" | grep -q 'VIOLATION' && exit 1
  exit 0
  ```
  → **실측 2026-08-28 (HEAD `ec82e08`): rc=0 / `docs=2 reasons=2 claims=0 linked=0` · VIOLATION 0건.**
  > 설계 주의 3건이 이 명령에 박혀 있다. (1) **자기 경로를 slug 로 찾는다** — `specs/30.spec/*/<slug>.md` glob 은 green·blue 양쪽에 맞으므로 승격으로 경로가 바뀌어도 깨지지 않는다 (`RULE-07 §promote 조건 2`). (2) **`docs=2` 하한이 없으면 공허 통과다** — 복사가 실패해 모집단이 비어도 VIOLATION 이 안 나오므로 `rc=0` 이 된다. 본 계약이 FR-04 로 금지하는 형태를 자기 수용 기준에 재현하지 않는다. (3) **`exit 0` 을 무조건 두지 않는다** — 초안이 그렇게 짜여 어떤 입력에도 `rc=0` 이었다.
- [x] (Must, NFR-01·AC-10) 게이트 단독 실행 벽시계 **< 20s** (단일 명령 60초 상한의 1/3) — 판정: `bash -c 'S=$(date +%s); bash scripts/check-task-precondition-scope.sh >/dev/null 2>&1; E=$(date +%s); [ $((E-S)) -lt 20 ]'` → **실측 2026-08-28 (HEAD `ec82e08`): rc=0 / 벽시계 0s (`time` 상 0.05s total).**

## 참고

### 비-중복 근거 (인접 spec)
- `foundation/gate-judgement-population-injectable-seam` (blue) — seam **일반 계약**. 본 계약은 그 seam 을 **소비**하며 모집단 정의(`40.task/**` + `_reason.md` 참조)는 겹치지 않는다.
- `foundation/blue-attributed-violation-advisory-accounting` (blue) — 집행/ADVISORY **회계** 축. 본 계약의 FR-08 은 그 분리를 `50.blocked/**` 에 적용할 뿐 회계를 재정의하지 않는다.
- `RULE-06 §열거 고정 금지` · `§관측 표면` 은 **게이트 스크립트의 스캔 범위**를 모집단으로 삼는다. 본 계약의 모집단은 **task 발행 전 선행 조건 확인 grep** 이며 후자에는 범위 규약이 없다.

### 미측정·비판정 항목
- **재격리 발생률 0 유지** — 미래 사건 대기 부류 (`RULE-07 §체크박스 부적격`). 효과는 게이트 민감도로 대리 판정하며 발생률 자체는 체크박스로 두지 않는다.
- **선행 조건 확인이 "충분히 넓었는가" 의 일반 판정** — 결합의 존재를 모르는 상태에서 범위 충분성은 판정 불가다. 본 계약은 그것을 판정하는 대신 **대조 없는 `0` 주장을 금지**하는 형태로 우회한다. 검출되는 것은 "좁은 범위" 가 아니라 "대조 없는 주장" 이다.
- **`60.done/task/**` 소급 스캔** — gitignored(`.gitignore:33`) + 규모 과대로 모집단 부적합.
- **NFR-02 판정력(민감도)** · **NFR-03 이식성** — 아래 §게이트 실효 검증 이관 참조.

### 배경 실측 (등록 시점 HEAD `8189a07`, tick 239)
```
grep -rn 'EXPECTED_GA_SELF_DIAG_COUNT' scripts/ .github/   → 0 hit   (발행 시 실행 범위)
grep -rn 'EXPECTED_GA_SELF_DIAG_COUNT' src/                → 4 hit   (실제 결합 위치)
```
이 비대칭이 근거다 — 그 심볼은 `scripts/` · `.github/` 에 **한 번도 존재한 적이 없다**. `0 hit` 은 해소의 증거가 아니라 범위 이탈의 증거였다. 결합 자체는 버그가 아니다 (`src/__tests__/root-config-spec-reference-coherence.test.ts:152` 가 개수 단언을 삭제 금지로 명문화). 실패한 것은 결합이 아니라 **처방이 다음 시도로 흐르는 경로**다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)
본 계약은 게이트 **신설**을 유발한다. 주입 왕복(방향별 위반 주입 → `rc≠0` → 원복 → `rc=0`)은 spec 체크박스가 아니라 **구현 task 의 DoD** 에 귀속한다. 검출 방향은 **2종**이다.

| 방향 | 위반 형태 | 기대 |
|---|---|---|
| Dir-1 (FR-01) | 대조·전수 범위 없는 맨 `0` 주장 1건 | `rc≠0` + 위반 파일 경로 열거 |
| Dir-2 (FR-02) | `_reason.md` 지목 파일이 `## 변경 범위` 에 없고 `expansion: 불허` | `rc≠0` |

이관처 task DoD 는 `injection: 2/2 detect` 를 요구한다. 준수 fixture 항목(AC-3·AC-5)은 두 방향을 **fixture 상주 형태로 재판정 가능하게** 남긴 것이며 주입 왕복을 대체하지 않는다.

**이관 완료 (tick 240 확인)**: 이관처는 `TSK-20260828-08` 이며 `0856d9b` 로 착지했다. 두 방향 모두 상주 fixture 로 보존됐고 tick 240 재실행에서 `violation-nonvacuity` → `rc=1` (2건 열거) · `violation-reason-consumption` → `rc=1` (1건 열거) 로 **민감도가 실측됐다**. 특이도는 `conforming` · `control-reason-consumption` → `rc=0` 로 같은 tick 에 확인했다. 방향별 주입 왕복 원문·출력의 박제처는 그 task 의 `result.md` 다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-28 | inspector tick 239 | REQ-20260828-039 흡수 — 최초 등록 (골격) | all |
| 2026-08-28 | `0856d9b` (TSK-20260828-08) / inspector tick 240 | drift reconcile — AC-1·3·5·6·8·9·10 재측정 후 `[x]` 플립 (7/7 ack). AC-7 은 기본 모집단이 fixture 로 확정된 구현에 맞춰 재정식화, AC-9 는 공허 통과·자기 경로 참조를 제거 | 발화 채널 · 테스트 현황 · 수용 기준 · FR-04 주 · 게이트 실효 검증 |
