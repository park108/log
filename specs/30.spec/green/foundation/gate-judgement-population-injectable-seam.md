# 상시 게이트의 판정 모집단 주입 seam

> **위치**: `scripts/check-*.sh` — 판정 모집단 루트를 도출하는 지점 (기준 사례: `scripts/check-env-api-base-presence.sh:84`)
> **관련 요구사항**: REQ-20260825-024
> **최종 업데이트**: 2026-08-25 (by inspector — tick 224 최초 등록)

## 역할

상시 게이트(`scripts/check-*.sh`)는 **자기가 판정할 모집단의 루트를 주입 가능한 seam 으로 노출한다**. seam 미설정 시 기본 모집단은 현행 도출과 동일하므로 pre-commit·CI 의 동작은 변하지 않는다.

의도적으로 하지 **않는** 것:
- (i) **seam 환경변수의 이름을 규정하지 않는다.** 현행 3 게이트가 이미 게이트별 이름을 쓴다 (`SPEC_COHERENCE_SPEC_ROOT` · `MONITOR_STATE_SCAN_ROOT` · `TEST_DOUBLE_SCAN_ROOT`). 계약하는 것은 이름이 아니라 **기본값을 가진 환경변수로 모집단 루트를 받는 형태**다.
- (ii) **게이트가 무엇을 위반으로 판정하는지를 규정하지 않는다.** 그것은 각 게이트의 소유 spec 이 갖는다 — 본 계약은 판정의 **입력 경로**만 다룬다.
- (iii) **17 게이트 전수 seam 부착을 Must 로 요구하지 않는다.** `.env*` 계열에서 Must, 나머지에서 Should 다 (§동작 (P-3)).

## 공개 인터페이스

- 환경변수 seam: `<GATE>_<ROOT|GLOB|FILES>` 형태. 미설정 시 기본값은 현행 도출과 동일.
- seam 은 **읽기 경로만** 바꾼다. 게이트는 판정 대상에 쓰지 않는다.
- 산출은 값이 아니라 **파일명·키 이름·수치**만 낸다 (기존 계약 보존).

## 동작

### (P-1) 민감도는 특이도와 독립이며, 별도의 능력을 요구한다

`grep dry-run` 과 정상 트리 실행은 **특이도**(정상 상태에서 오탐하지 않음)만 검증한다. **민감도**(위반을 실제로 잡음)는 위반을 주입해야만 관측된다. 검출력 0 인 게이트도 정상 트리에서는 기대 수치와 정확히 일치해 dry-run · Phase 1 재실행 · developer 검증을 **전부 rc=0 으로 통과**한다.

따라서 게이트에 민감도를 측정할 능력이 **구조적으로 없으면**, 그 게이트가 검출력 0 인지 여부는 파이프라인 안에서 영원히 미결로 남는다.

### (P-2) 모집단 하드코딩은 그 능력을 제거한다

판정 모집단이 스크립트 본문에 고정돼 있으면 민감도 검증의 유일한 수단은 **실제 판정 대상 파일의 변형**이다. 판정 대상이 정책·권한으로 잠기는 순간 게이트는 **확장도 검증도 불가능한 동결 상태**가 된다.

### (P-3) `.env*` 계열이 Must 인 근거 — 복원 보장의 비대칭

| 판정 대상 | 주입 후 복원 | seam 요구 |
|---|---|---|
| `src/**` · `package.json` · `vite.config.js` | git 추적 대상 → 복원 **보장** | Should |
| `.env*` | (a) 시크릿 계열이라 권한·정책의 잠금 대상, (b) `.env.local` 류는 `.gitignore` 로 추적 밖 → git 복원 **미보장**. 원복 실패가 곧 로컬 환경 오염 | **Must** |

### (P-4) seam 은 소유 계약의 판정을 깨지 않는다

seam 은 **기본값 방식**이라 호출 라인을 바꾸지 않는다. 따라서 게이트의 호출 형태를 앵커로 판정하는 소유 계약들 — slug `foundation/auth-redirect-url-totality-and-observable-failure` (U-4) 와 slug `foundation/api-base-url-assembly-totality` (A-5) — 은 seam 도입 전후로 동일하게 참이다.

**본 계약이 필요한 이유는 문자열 파손이 아니라 계약 소유권이다.** 위 두 spec 이 그 게이트의 식별자·호출 라인·산출 형식을 계약으로 소유하는데 그 계약 어디에도 seam 요구가 없었다. 그 상태에서 구현자가 인터페이스를 추가하면 **spec 이 승인하지 않은 표면**이 된다. 본 spec 이 그 표면의 소유처다.

### (P-5) 격리 픽스처 경로는 `.gitignore` 에 매치되지 않아야 한다

매치되면 픽스처가 커밋되지 않고 조용히 휘발하며, 게이트는 **파일 부재를 위반이 아니라 통과로 읽는다** (false-negative). `RULE-06 §fixture probe 경로 사전 점검`.

## 의존성

- 대상: `scripts/check-*.sh` (writer = developer, `RULE-01` 매트릭스).
- 발화 채널: `.husky/pre-commit` · `.github/workflows/ci.yml` · `package.json scripts.check:*`.
- 선례: slug `components/monitor` — `MONITOR_STATE_SCAN_ROOT` 로 저장소 트리 무변경 주입 검증이 실제로 수행됐다.

## 발화 채널

본 계약의 위반(seam 부재)은 **어떤 기존 게이트도 붉게 만들지 않는다.** `check:*` 18종 중 게이트 자신의 인터페이스를 판정하는 것은 0건이며, `check:acceptance-criteria` 는 spec 문서를 본다. 따라서 §수용 기준의 명령이 현재 유일한 판정 채널이며, 상시 채널 부착은 **후속 task 의 선행 조건**이다 (`RULE-07 §promote 조건 4` — 채널 부재는 promote 차단이 아니라 채널 부착 task 발행을 선행 조건으로 한다).

## 테스트 현황

- [x] 기존 seam 3건의 실재 — `SPEC_COHERENCE_SPEC_ROOT`(`check-spec-coherence.sh:55`) · `MONITOR_STATE_SCAN_ROOT`(`check-monitor-state-immutability.sh:60`) · `TEST_DOUBLE_SCAN_ROOT`(`check-test-double-shape-fidelity.sh:58`). tick 224 실측 `gates=17 seam=3`.
- [x] seam 을 통한 저장소 무변경 주입이 실제로 가능함의 증인 — tick 224 가 `SPEC_COHERENCE_SPEC_ROOT` 로 격리 트리를 판정시켜 G4 검출을 재현했다 (`green(missing=1)`, rc=1). 저장소 `specs/30.spec` 는 건드리지 않았다.
- [ ] `.env*` 계열 게이트의 seam — HEAD `eb5019b` 실측 `env-gates=1 no-seam=1`. (E-1) 의 부착 대상.
- [ ] 격리 픽스처 디렉터리 — HEAD 부재. (E-3) 의 부착 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (`RULE-07 §수용 기준 문장 규약`). 명령은 `scripts/**` · `.gitignore` · git 인덱스 · `package.json` 만 참조하며 **spec 경로를 참조하지 않는다** (`§promote 조건 2`). **HEAD=`eb5019b` (tick 224 등록) 기준 1/4.**
>
> **패턴 인용 주의** — `\$\{` 를 담은 ERE 는 반드시 **홑따옴표**로 감싼다. 겹따옴표 안에서는 셸이 `\$` 를 `$` 로 바꿔 ERE 가 앵커로 읽고 무조건 0 hit 이 된다 (거짓 음성).

- [ ] (Must, E-1) `.env*` 계열 게이트 전수 seam 보유 — 모집단을 게이트 본문에서 **도출**한다 (`RULE-06 §열거 고정 금지`). 판정:
  ```
  bash -c 'tot=0; miss=0; for f in scripts/check-*.sh; do grep -qE '"'"'ls-files "?\.env'"'"' "$f" || continue; tot=$((tot+1)); grep -qE '"'"'^[A-Z_]*(ROOT|GLOB|FILES)="\$\{[A-Z_]+:-'"'"' "$f" || { echo "no-seam: $f" >&2; miss=$((miss+1)); }; done; printf "env-gates=%d no-seam=%d\n" "$tot" "$miss"; [ "$tot" -gt 0 ] || exit 2; test "$miss" -eq 0'
  ```
  → **rc=0**. **HEAD=`eb5019b` (tick 224) 실측 rc=1 / `env-gates=1 no-seam=1` (`scripts/check-env-api-base-presence.sh`) → 미충족.** **공허 통과 가드 내장** — 모집단 도출이 0 이면 `exit 2` 로, 대상이 사라져 조용히 참이 되는 상태를 충족으로 읽지 않는다.
- [x] (Must, E-2) 기본값 동치 — seam 미설정 산출의 모집단 수가 추적 파일 수와 일치한다. 판정: `bash -c 'exp=$(git ls-files ".env*" | grep -c .); [ "$exp" -gt 0 ] || { echo "derive=0 vacuous" >&2; exit 2; }; got=$(npm run --silent check:env-api-base 2>&1 | sed -nE "s/.*envfiles=([0-9]+).*/\1/p" | head -1); printf "tracked=%s reported=%s\n" "$exp" "$got"; [ "$got" = "$exp" ]'` → **rc=0**. **HEAD=`eb5019b` (tick 224) 실측 rc=0 / `tracked=2 reported=2` → 충족.** 이 항목은 seam 도입 **후에도** 참이어야 하는 보존 명제다. **`RULE-07 §반려 시그널` 의 중복 게이트 부류가 아닌 경계** — `check-env-api-base-presence.sh:89-92` 가 이미 `envfile_count -eq 0` 을 `exit 2` 로 잡으므로 **0 방향은 중복**이다. 본 항목이 유일하게 덮는 것은 **0 이 아닌 다른 집합**을 가리키는 방향(seam 기본값이 픽스처 디렉터리로 굳는 회귀)이며 그 상태에서 기존 게이트는 rc=0 이다. **이 명령이 `.env*` 를 읽지 않는 점에 유의** — git 인덱스의 파일 **이름 수**와 게이트 **산출 수치**만 비교하므로 `.env*` 접근이 금지된 세션에서도 판정 가능하다.
- [ ] (Must, E-3) 격리 픽스처 실재 + `.gitignore` 미매치 — 판정: `bash -c 'grep -qE "^scripts/fixtures" .gitignore && { echo "fixture root is gitignored" >&2; exit 1; }; test -d scripts/fixtures/env-presence'` → **rc=0**. **HEAD=`eb5019b` (tick 224) 실측 rc=1 (gitignore 매치 0 · 디렉터리 부재) → 미충족.** 경로 근거: `scripts/fixtures/` 는 이미 `coverage-attribution/` 픽스처를 담고 있고 `.gitignore` 어느 행과도 매치되지 않는다 (tick 224 사전 점검 완료). 디렉터리명은 구현자 재량이며 변경 시 본 항목의 경로를 함께 갱신한다.
- [ ] (Should, E-4) seam 커버리지 관측 + 기존 3건 보존 — 판정: `bash -c 'tot=0; seam=0; for f in scripts/check-*.sh; do tot=$((tot+1)); grep -qE '"'"'^[A-Z_]*(ROOT|GLOB|FILES)="\$\{[A-Z_]+:-'"'"' "$f" && seam=$((seam+1)); done; printf "gates=%d seam=%d\n" "$tot" "$seam"; [ "$tot" -gt 0 ] || exit 2; test "$seam" -ge 4'` → **rc=0**. **HEAD=`eb5019b` (tick 224) 실측 rc=1 / `gates=17 seam=3` → 미충족.** 하한 4 = 기존 3 보존 + env 게이트 1. **기존 3 중 하나가 제거되면 본 항목이 유일한 검출자다** — 현재 그 제거는 어떤 게이트도 붉게 만들지 않으며 무변경 주입 검증만 조용히 불능이 된다.

## 참고

### 게이트 실효 검증 이관 (RULE-07 §처리 · RULE-06 §게이트 실효 검증)

아래는 **'가정 주입 요구' 부류**라 체크박스로 두지 않으며, 검출 방향을 보존한 채 **수리 task 의 `## 검증/DoD`** 로 이관한다. developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다. **이관처 task 가 발행되기 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

- **(Dir-1) 키 행 누락 민감도** — 픽스처 env 파일에서 선언 키 1행 삭제 → seam 지정 실행 `rc≠0` → 원복 → `rc=0`.
- **(Dir-2) 값 공란 민감도** — 픽스처의 값 계열 파일에 `KEY=` 형태(값 공란) 1건 생성 → `rc≠0` → 원복 → `rc=0`.
- **(Dir-3) 도출 붕괴 민감도** — 선언 파일 표기를 바꿔 키 도출을 하한 미만으로 만든다 → `exit 2` (충족으로 읽지 않음) → 원복.
- **(Dir-4) 특이도** — 주입 없이 정상 픽스처 + 정상 트리 양쪽 실행 → `rc=0`.
- **(Dir-5) 기본값 불변** — seam 환경변수 **미설정** 실행 산출이 seam 도입 전과 동일. 도입 전 기준선: `check-env-api-base-presence: keys=6 envfiles=2 valued-files=1 missing-rows=0 missing-values=0` (HEAD `eb5019b` 실측, rc=0).

> **(Dir-1)~(Dir-4) 전부가 실 `.env*` 를 건드리지 않고 수행 가능해야 한다** — 그것이 본 계약의 목적이다. 이관처 task 가 여전히 실 파일 조작을 요구하는 형태로 쓰이면 TSK-20260825-28 과 같은 자리에서 다시 막힌다.

### 미측정·비판정 항목

- **(미측정) 현행 게이트 17종의 실제 검출력.** 본 계약은 민감도를 **측정 가능하게 만드는 능력**의 실재만 판정하며, 각 게이트가 실제로 검출력을 갖는지는 판정하지 않는다. 그 판정은 게이트별 소유 spec 과 `RULE-06 §게이트 실효 검증` 의 task DoD 에 귀속된다.
- **(미판정 — 권한 경계) `.env*` 파일의 내용.** tick 224 세션은 `.env*` 읽기·쓰기가 금지돼 있어 그 파일들의 실제 키 구성을 관측하지 않았고 우회도 시도하지 않았다. (E-2) 를 git 인덱스의 **파일 수**로만 판정하도록 세운 것이 그 제약의 직접 결과이며, 동시에 본 계약이 요구하는 능력이 왜 필요한지의 실물 증거다.
- **(별 축) 게이트 산출 파싱의 색상 비의존성 · 배선 실행 표면 정합.** 각각 REQ-20260825-008 · REQ-20260825-009 축이며 본 계약은 입력 seam 만 다룬다.

### 4 사례를 하나의 불변식으로 묶지 않은 판정 근거 (승계)

REQ-20260825-024 §참고의 판정을 승계한다. 오늘 관측된 "측정 장치가 측정 대상과 얽혀 자기를 못 고치는" 4 사례 중 앞 3(라인 박제 · 빈 괄호 고정 · 자기 매치)은 **거짓 양성 계열**로 정상 트리에서 즉시 붉어지거나 정상 변경을 막아 **관측되자마자 수리 압력이 생긴다**. 본 건은 **거짓 음성 계열**로 정상 트리에서 조용히 초록이며 압력이 생기지 않는다 — 검출 방향이 반대다. 넷을 묶으면 "게이트는 자기 판정 대상과 얽히지 않는다" 는 **명령 1회 rc 판정 불가능한 메타 명제**가 되고, 넷의 수리 명령은 공유되는 것이 하나도 없다. 앞 3 은 각 소유처(blue `testing/fixture-baseline-position-independence` · blue `testing/react-query-test-queryclient-default-options-single-source-coherence` + green `testing/spec-claim-measurement-surface-agreement` · TSK-20260825-27 해소)에 남긴다.

### 관련

- **REQ 원문**: REQ-20260825-024 (slug `gate-judgement-population-injectable-seam`).
- 소비한 followup: `20260825-2125-env-gate-injection-fixture-isolation` (TSK-20260825-28 격리 신고).
- 소유 계약 (seam 승인 절 추가됨): slug `foundation/auth-redirect-url-totality-and-observable-failure` · slug `foundation/api-base-url-assembly-totality`.
- 후속: TSK-20260825-28 재발행(선언 키 6 → 10 확장)은 본 계약 착지 후 **픽스처 기준 주입 방향**으로 재기술한다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-024 (inspector tick 224) | 최초 등록. **req 수용 기준 4항을 형태 보존해 흡수**하되 (E-2) 의 판정 근거를 다시 세웠다 — req 판본은 `npm run check:env-api-base` 산출과 `git ls-files` 를 비교하는데, tick 224 세션은 `.env*` 접근이 금지돼 있어 **그 명령이 세션 권한 안에서 실행 가능한지 자체가 쟁점**이었다. 실행해 보니 게이트 산출은 파일명·수치만 내므로 판정이 성립했고, 그 사실을 항목 안에 박제했다 — 본 계약이 요구하는 능력의 필요성을 스스로 예시하는 자리다. **§동작 (P-3) 신설** (req 의 "왜 `.env*` 가 특별한가" 를 복원 보장 비대칭 표로 재구성 — Must/Should 경계의 근거). **§동작 (P-4) 신설**: seam 이 소유 계약을 깨지 않음을 명시하고, 순서 제약의 원인이 **문자열 파손이 아니라 계약 소유권**임을 계약 본문에 고정했다. **§테스트 현황에 증인 1건 추가** — tick 224 가 `SPEC_COHERENCE_SPEC_ROOT` 로 격리 트리를 판정시켜 G4 검출을 실제로 재현했다(저장소 무변경). 요구되는 능력이 이미 3 게이트에서 작동함의 실측 증거다. **§발화 채널**: 위반이 어떤 기존 게이트도 붉게 만들지 않음을 명시하고 상시 채널 부착을 후속 task 선행 조건으로 뒀다. | all |
