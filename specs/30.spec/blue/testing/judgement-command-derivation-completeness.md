# 판정 명령 모집단의 도출은 자기 누락을 발화한다

> **위치**: 횡단 계약. 판정 대상은 `scripts/check-acceptance-criteria.sh` 의 판정 명령 모집단 도출부(`:113`)와 그 위에 서는 G-3·G-4(`:124` · `:139`).
> **관련 요구사항**: REQ-20260826-028 (judgement-command-derivation-completeness)
> **최종 업데이트**: 2026-08-28 (by inspector — tick 238 Phase 1: A-1 착지 반영)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`61ce5ab`).

## 역할

판정 명령 위에서 동작하는 게이트는 **자기가 도출한 모집단이 참 모집단을 대표하는지**를 스스로 발화한다. 도출이 좁아 겨눈 표면의 일부를 애초에 보지 않는 상태를, 게이트는 `rc=0` 으로 덮지 않는다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 `§역할` 이 요구하는 대로 **방어 대상을 명시한다**:

> **새 판정 명령이 허용 접두 밖 표기로 도입될 때 그 항목이 G-3·G-4 모집단에서 이탈하는 사건.**

이 이탈은 세 채널 어디에서도 붉어지지 않는다 — (a) `judgement-commands=` ack 수치는 **단조 비감소**라 누락이 생겨도 줄지 않고 오르지 않을 뿐이며, (b) `DERIVE_MIN=100` 은 현 도출 304 기준 **3분의 1 붕괴까지 침묵**하고, (c) inspector Phase 1 reconcile 은 게이트가 `rc=0` 이므로 정합으로 읽는다. `RULE-06 §게이트 실효 검증` 이 기술한 **민감도 0** 형상이 판정 층이 아니라 **모집단 층**에서 재현되는 자리다.

이 계약이 의도적으로 하지 않는 것:

- (i) **허용 접두 목록의 특정 확장을 지정하지 않는다.** 접두를 넓히면 산문 인용이 모집단에 들어와 특이도를 잃는다 — green `testing/acceptance-command-measures-declared-subject` §동작 (P-5) 가 박제한 절충이며, 그 spec 은 검출 토큰을 리터럴로 담아 **자기봉쇄**가 된 실사례를 갖고 있다. 본 계약은 누락의 **가시화**만 요구하고 수리 수단은 자유다 (접두 확장 · 문면 교정 · 명시적 면제 등재 무방).
- (ii) **`DERIVE_MIN` 의 상대화를 요구하지 않는다.** 직전 실측 대비 감소율 가드는 상태 파일이 필요해 게이트의 read-only 성질(NFR-01)을 깨고, spec 파일 수 대비 비율은 파일당 분산이 커 오탐한다. 고정 하한은 **존치**하고 그 위에 도출 대조를 세운다 — 둘은 배타 선택지가 아니라 층이 다르다.
- (iii) **모집단 밖 33 항목의 소급 명령화.** 그 항목들은 `RULE-07 §수용 기준 문장 규약`(2026-08-24 신설) 이전에 승격된 문면이다. 대조 대상은 **판정을 선언한** 항목으로 한정한다.
- (iv) **판정 명령의 내용 정합**(도달 가능성 · 대상 한정) — green `testing/acceptance-command-measures-declared-subject` 소관이다. 본 계약은 그 계약이 **무엇 위에 서는가**만 다룬다.
- (v) **모집단 루트의 주입 경로** — blue `foundation/gate-judgement-population-injectable-seam` 소관이다. 본 계약은 그 seam(`ACC_SPEC_ROOT`)을 **따르되 바꾸지 않는다**.
- (vi) `check:*` 21종 전체에 같은 형상을 일괄 적용하는 것. blue `testing/derived-population-totality-judgement` §역할 (i) 이 전수 적용을 명시 배제했고 본 계약도 그 판단을 따른다.

## 공개 인터페이스

본 계약은 공개 인터페이스를 갖지 않는다 (게이트 모집단 계약). 관측 표면은 셋이다.

- **(P-A) 상위 모집단** — `§수용 기준` 구간의 **최상위 체크박스 항목** 중 판정을 **선언한** 것. 도출 루트는 기존 seam `ACC_SPEC_ROOT` 를 따른다.
- **(P-B) 하위 모집단** — 기존 판정 명령 도출(`:113`): §수용 기준 구간의 **코드 펜스 내용 전체** + 허용 접두 6종(`bash -c` · `npx ` · `npm run ` · `awk ` · `test ` · `grep -`)으로 시작하는 **인라인 코드 스팬**.
- **(P-C) 귀속 관계** — (P-A) 의 각 항목 구간(항목 라인부터 다음 최상위 체크박스 또는 다음 `## ` 헤더 직전까지)에 (P-B) 원소가 1건 이상 떨어지는가.

세 수치는 **동시에** 발화된다 — 하나만 내면 어느 층에서 새는지 갈리지 않는다.

## 동작

1. `ACC_SPEC_ROOT` 아래 `*.md` 를 정렬 순회해 (P-A) 를 도출한다. 항목 판별은 `§수용 기준` 구간의 **행 선두** `- [ ]` / `- [x]` 다.
2. 각 항목의 구간에 판정 선언 토큰이 있으면 **선언 항목**으로 계수한다.
3. 같은 구간에 (P-B) 원소가 1건 이상 귀속되면 **도출 귀속 항목**으로 계수한다.
4. 선언 항목 수 ≠ 도출 귀속 항목 수 이면 차집합을 **`파일:라인` 으로 stderr 에 열거**하고 `exit 1`.
5. 선언 항목 도출이 0 이면 `exit 2` (무판정). 기존 `DERIVE_MIN` 하한도 그대로 `exit 2` 를 유지한다.
6. ack 라인은 전체 항목 수 · 선언 항목 수 · 도출 귀속 항목 수를 함께 낸다.

### (P-5 계승) 자기 비봉쇄

본 계약을 서술하는 문서 자신이 상위 모집단에 들어와 미도출로 계수되면 어떤 시정으로도 0 에 도달하지 못한다. 따라서 **산문의 "판정" 낱말이 항목을 선언으로 만들지 않아야 한다** — 판별은 `§수용 기준` 구간의 **최상위 체크박스 항목 구간**에 한정되며, 본문 산문·§참고·§동작 의 낱말은 계수되지 않는다. 같은 함정이 `acceptance-command-measures-declared-subject` 에서 G-4 검출 토큰을 리터럴로 담았을 때 실제로 발생했다.

### 실측 — 누락은 이미 실현돼 있다 (HEAD=`61ce5ab`, tick 227 재현)

게이트의 도출기 문면(`:113`)을 **손으로 옮기지 않고 스크립트에서 추출해** 실행했다.

| 층 | 수치 |
|---|---|
| `§수용 기준` 최상위 체크박스 항목 | **783** |
| 판정 선언 항목 | **69** |
| 도출이 1건 이상 귀속된 항목 | **226** |
| 선언 항목 중 도출 **0** | **2** |
| 판정 명령 모집단 (`judgement-commands`) | **303** (서로 다른 `파일:라인` 247) |

도출 0 인 2건은 tick 227 이 **양쪽 다 해소했다**.

- `green/testing/acceptance-command-measures-declared-subject:114` (Must, C-4) — 판정이 절차 서술이었다. 같은 tick 에 펜스 명령으로 교체.
- `blue/testing/runtime-fetch-unmount-safety:191` (Must, FR-08) — 판정이 산문("확장 술어 대상 수 ≥ 선행 술어 대상 수")이었다. 같은 tick 에 **green 재판본**으로 명령화 (`RULE-01` writer 경계상 blue 직접 편집 불가 — `foundation/spec-reference-coherence:21` 이 명시한 경로). 승격 mv 전까지 blue 원본이 남으므로 최초 발화는 미도출 **1** 이다.

### 실측 — 지금 살아 있는 함정 유실은 없다 (열거로 확인, `0 hit` 근거 아님)

G-3·G-4 판정문을 스크립트에서 추출해 모집단 **밖** 스팬 2412건에 적용한 결과 `range-restart=1 unexecutable-verb=3` 이었고, **4건을 개별로 읽어** 전부 함정을 **설명하는 산문**임을 확인했다 (`monitor-render-role-class-namespace-disjointness:81` · `husky-pre-push-typecheck:67` · `measurement-tree-attribution:94` ×2). 넷 다 **모집단 밖인 것이 옳다.**

따라서 **실현된 비용은 "함정을 놓쳤다" 가 아니라 "겨눈 표면의 일부를 애초에 보지 않는다" 이며, 그 크기가 위 33 + 2 로 측정됐다.** 이 구분을 지우면 본 계약은 존재하지 않는 손실을 근거로 삼게 된다.

## 의존성

- 내부: `scripts/check-acceptance-criteria.sh` (G-1~G-4 + 도출부 + `ACC_SPEC_ROOT` seam + `DERIVE_MIN`), `specs/30.spec/**`.
- 외부: `npm run check:acceptance-criteria`, POSIX `awk` · `grep` · `sed`.
- 역의존: green `testing/acceptance-command-measures-declared-subject` (C-1·C-2 가 이 모집단 위에 선다), blue `testing/derived-population-totality-judgement`, blue `foundation/gate-judgement-population-injectable-seam`.

## 발화 채널

`package.json` `scripts.check:acceptance-criteria` → `scripts/check-acceptance-criteria.sh`. 현 HEAD 에서 실재하며 rc=0.

## 테스트 현황

- [x] 판정 명령 모집단 도출 (P-B) — HEAD=`61ce5ab` `judgement-commands=324` (tick 227 착수 시점 동일 트리 `303`).
- [x] 모집단 루트 seam 실재 — `ACC_SPEC_ROOT` 주입 시 도출 루트가 따라 움직임을 tick 227 이 사본 루트로 확인 (`derive=303` 동일).
- [x] 비공허 하한 실재 — `DERIVE_MIN=100` · 빈 루트 주입 시 `exit 2`.
- [x] G-3·G-4 민감도 — tick 227 이 사본 루트에 위반 1건씩 주입해 각각 `rc=1` + `파일:라인` 발화 확인, 원복 후 `shasum` 일치.
- [x] 상위 모집단 (P-A) 도출 — `TSK-20260828-05`(`37f6285`) 착지. HEAD=`37f6285` `total-items=838 declared-items=75 derived-covered=75` 발화. 도출 귀속 관계(P-C)가 `declared-miss-green` / `declared-miss-blue` 로 축 분리돼 나온다.

## 수용 기준

> 전 항목 **명령 1회로 rc 판정 가능** (`RULE-07 §수용 기준 문장 규약`). 명령은 `scripts/**` 와 게이트 산출만 참조하며 **어떤 spec 의 green/blue 경로 리터럴도 참조하지 않는다** (`§promote 조건 2`). **HEAD=`37f6285` 기준 5/5 rc=0** (파일에서 추출해 실행 — 인용 아님). 착지 전 `61ce5ab` 기준은 4/5 + (A-1) 무판정이었다.

- [x] (Must, A-1) 선언 항목 전수가 도출에 귀속된다 — 판정: `bash -c 'out=$(npm run --silent check:acceptance-criteria 2>&1); d=$(echo "$out" | sed -nE "s/.*declared-items=([0-9]+).*/\1/p" | head -1); k=$(echo "$out" | sed -nE "s/.*derived-covered=([0-9]+).*/\1/p" | head -1); [ -n "$d" ] && [ -n "$k" ] || { echo "ack 라인 미발화" >&2; exit 2; }; [ "$d" -gt 0 ] || exit 2; [ "$d" = "$k" ]'` → **rc=0**. **HEAD=`37f6285` 실측 rc=0** — `TSK-20260828-05` 착지로 두 수치가 발화되고 일치한다 (`declared-items=75 derived-covered=75 declared-miss-green=0`). 착지 전 `61ce5ab` 는 `ack 라인 미발화` **rc=2**(무판정)였다 — **무판정을 미충족으로 적지 않는다**, 둘은 다른 사건이며 이 구분이 (A-3) 의 존재 이유다. tick 227 이 예고한 "착지 직후 최초 발화 rc=1"(blue 원본 1건 미승격)은 실현되지 않았다: 착지 시점에 그 blue 원본이 이미 승격돼 미도출이 0 이었다. **따라서 이 초록은 검출력의 증거가 아니다** — 검출력은 §참고 §검출 방향 실측 의 주입에서만 나온다.
- [x] (Must, A-2) 미도출 항목이 **이름으로** 발화된다 — 판정: `bash -c 'e=$(npm run --silent check:acceptance-criteria 2>&1 1>/dev/null); [ -z "$e" ] || printf "%s" "$e" | grep -qE "specs/30\.spec/[^:]+\.md:[0-9]+"'` → **rc=0**. **HEAD=`61ce5ab` 실측 rc=0** (현 stderr 공란). 이 항목은 (A-1) 이 `rc=1` 을 내는 트리에서만 판정력을 갖는 **동반 조건**이다 — 단독으로는 "아직 아무것도 재지 않는다" 도 통과시킨다. 명시해 두지 않으면 이 초록이 수리 완료로 오독된다. 겨누는 것은 **수치만 내고 이름을 감추는 판본**이다: `declared-items=71 derived-covered=70` 만으로는 71 항목 중 어느 하나가 빠졌는지 관측되지 않는다.
- [x] (Must, A-3) 무판정과 위반이 갈린다 — 판정: `bash -c 'ACC_SPEC_ROOT=$(mktemp -d) npm run --silent check:acceptance-criteria >/dev/null 2>&1; test $? -eq 2'` → **rc=0**. **HEAD=`61ce5ab` 실측 rc=0.** "위반이 있다"(1) 와 "잴 것이 없어졌다"(2) 를 합치면 도출기가 낡아 모집단이 빈 상태가 **위반으로도 충족으로도** 읽히며, 어느 쪽이든 오독이다.
- [x] (Must, A-4) 기존 모집단이 줄지 않는다 — 판정: `bash -c 'npm run --silent check:acceptance-criteria 2>&1 | grep -qE "judgement-commands=[0-9]+ range-restart=0 unexecutable-verb=0"'` → **rc=0**. **HEAD=`61ce5ab` 실측 rc=0 / `judgement-commands=324`** (tick 227 착수 시점 동일 트리 `303` — 본 tick 편집이 도출을 **늘렸다**. 이 항목이 겨누는 것은 **감소**이며, 증가는 위반이 아니다). 본 계약은 모집단을 **넓히지도 좁히지도 않으며** 그 위에 층을 하나 얹을 뿐이다 — G-1·G-2 판정과 기존 4 수치는 보존된다.
- [x] (Must, A-5) 무부작용 — 판정: `bash -c 'a=$(git status --porcelain | shasum); npm run --silent check:acceptance-criteria >/dev/null 2>&1; b=$(git status --porcelain | shasum); [ "$a" = "$b" ]'` → **rc=0**. **HEAD=`61ce5ab` 실측 rc=0.** 게이트는 판정 대상에 쓰지 않는다 — 상태 파일을 두는 순간 (ii) 가 기각한 상대 하한과 같은 문제가 생긴다.

## 참고

### 게이트 실효 검증 이관 (`RULE-06 §게이트 실효 검증` · `RULE-07 §처리`)

아래는 **'가정 주입 요구' 부류**라 체크박스로 두지 않으며, 검출 방향을 보존한 채 **수리 task 의 `## 검증/DoD`** 로 이관한다. developer 는 `RULE-04` notes 에 `injection: 4/4 detect` 를 박제한다. **이관처 task 발행 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

- **(Dir-1) 접두 이탈 민감도** — 판정을 선언한 항목 1건의 판정 명령 접두를 허용 밖 표기(예: `node -e …`)로 바꾼다 → `rc≠0` + 그 `파일:라인` 이 stderr 에 나온다 → 원복 → `rc=0`. **이 방향이 본 계약의 존재 이유다.** 주입은 `ACC_SPEC_ROOT` 사본 루트에서 하고 저장소 트리를 건드리지 않는다.
- **(Dir-2) 특이도** — 판정을 선언하지 **않는** 산문 항목을 1건 추가 → `rc=0` 유지. 산문의 "판정" 낱말이 항목을 상위 모집단에 넣으면 §동작 §자기 비봉쇄 위반이다.
- **(Dir-3) 무판정 보존** — 빈 루트를 seam 으로 주입 → `rc=2` 가 `rc=1` 과 **구분**됨을 확인 → 원복.
- **(Dir-4) 이름 발화 실효** — (Dir-1) 주입 상태에서 stderr 열거를 수치만 남기도록 축소하면 어느 항목이 빠졌는지 관측 불가함을 대조로 보인다. 열거가 있는 판본에서만 주입 항목의 `파일:라인` 이 나온다.
- **(Dir-5) 축 분리 실효** — blue 문서에 (Dir-1) 과 **같은** 주입 → `rc=0` 유지 + ADVISORY 계수 `0 → 1` + 그 `파일:라인` 열거. green 주입이 `rc=1`, blue 주입이 `rc=0` 인 **대조쌍**이어야 축 분리가 실효다. 한쪽만 재면 "blue 를 아예 안 본다" 와 구별되지 않는다.

> **이관 상태 (tick 238)** — (Dir-1) · (Dir-3) · (Dir-5) 는 본 tick 이 사본 루트에서 실측했고 결과를 §검출 방향 실측 에 박제했다. 실측했다는 사실이 이 항목들을 체크박스로 만들지는 않는다 — 주입은 게이트 도입·수정 시점의 1회 판정이지 반복 검증이 아니다 (`RULE-07 §처리`). (Dir-2) · (Dir-4) 는 아직 미실측이며 차기 게이트 수정 task 의 DoD 로 이관된 상태를 유지한다.

### 검출 방향 실측 (HEAD=`37f6285`, tick 238) — 초록은 검출력의 증거가 아니다

(A-1)~(A-5) 가 전수 `rc=0` 인 것은 **현 트리에 미도출이 0 이기 때문**이지 게이트가 무언가를 잡기 때문이 아니다. `RULE-06 §게이트 실효 검증` 이 기술한 대로 **특이도와 민감도는 독립**이며, 민감도는 주입에서만 관측된다. 아래는 저장소 트리를 건드리지 않고 `ACC_SPEC_ROOT` 사본 루트에 주입해 실측한 결과다. 사본 루트는 `30.spec` 명명을 보존해야 blue/green 축 분리 술어(`^[^:]*/30\.spec/blue/`)가 살아 있다 — 보존하지 않으면 blue 가 green 으로 계수된다.

| 방향 | 주입 | rc | 발화 |
|---|---|---|---|
| (Dir-1) green 축 이탈 | 선언 항목 1건의 접두를 `bash -c` → `node -e` | **1** | `G-5 VIOLATION … 1건` + `declared-miss-green=1` + 그 `파일:라인` |
| (Dir-5) blue 축 동일 이탈 | blue 문서 1건에 같은 주입 | **0** | ADVISORY `0건 → 1건` + `declared-miss-blue=1` (rc 미반영) |
| (Dir-3) 무판정 보존 | 빈 루트를 seam 으로 주입 | **2** | `derive=0 < 100 vacuous` — `rc=1` 과 등급 분리 |

세 방향 모두 주입 원복 후 `rc=0` 으로 복귀했다. 사본 루트 baseline 은 저장소와 동일 수치(`838 / 75 / 75`)를 재현했으므로 주입 전후 차이가 주입에 귀속된다.

**(Dir-5) 가 `rc=0` 인 것은 이완이 아니라 축 분리다.** blue 는 `RULE-01` 상 writer 가 없어 green 편집으로 고칠 수 없다 — rc 로 집행하면 파이프라인이 영구 적색이 된다. 대신 계수·열거·처리 경로가 ADVISORY 로 전량 발화된다. 이 절충의 계약은 blue `foundation/blue-attributed-violation-advisory-accounting` 이 소유한다.

**모집단 은닉 방어**: `blue-scanned` · `green-scanned` 는 **위반 계수가 아니라 스캔 문서 수**이며 seam 을 따르지 않고 저장소 고정 경로에서 센다. 그래서 빈 루트 주입(Dir-3)에서도 `blue-scanned=82` 가 불변이다. 이것이 의도다 — 위반을 0 으로 만드는 방법이 "고치기" 말고 "모집단에서 빼기" 로도 가능한데, 후자를 하면 이 수치가 떨어져 드러난다.

**고정 하한은 두 층에서 산다**: 사본 루트에서 `판정:` 토큰만 무력화하니 `declared=0 < 20 vacuous` **rc=2** 가 났고, 이때 `DERIVE_MIN` 층은 **발화하지 않았다**(도출 모집단이 하한 위로 유지). 즉 `DERIVE_MIN=100`(하위 모집단 P-B)과 `DECLARE_MIN=20`(상위 모집단 P-A)은 서로를 대체하지 않는 별개 층이며, 각자 다른 붕괴를 무판정으로 잡는다. §역할 (ii) 가 상대화를 기각한 자리에 이 이중 하한이 서 있다.

**토큰 재현 앵커** — `git archive 61ce5ab` 사본 루트에 현 게이트를 적용하면 `total-items=783 declared-items=69 derived-covered=67` 이 **정확히 재현**되고 rc=1 이며, 미도출 2건의 `파일:라인` 이 §동작 박제와 일치한다 (`green/testing/acceptance-command-measures-declared-subject.md:114` · `blue/testing/runtime-fetch-unmount-safety.md:191`). 게이트가 과거 판본에 대해서도 같은 수치를 낸다는 것은 도출기가 **트리의 함수**이지 실행 시점의 함수가 아님을 뜻한다.

### 자매 이탈 경로 — 선언 토큰 층 (tick 238 발견 · 실측)

§역할 이 명시한 방어 대상은 **명령 접두** 층의 이탈이다 (`bash -c` 등 허용 접두 밖 표기로 판정 명령이 도입되는 사건). tick 238 이 같은 형상의 **두 번째 이탈 경로**를 실측했다 — **선언 토큰** 층이다.

(P-A) 판별은 항목 구간의 `판정:` 토큰으로 한다 (§동작 2). 그런데 판정 명령을 **가진** 항목이 그 명령을 `판정:` 이 아닌 다른 문구로 도입하면 — `판정 (펜스):` · `… 한다: <명령>` · `— <명령>` — 그 항목은 **선언 항목으로 계수되지 않고**, 따라서 (P-C) 귀속 대조의 대상이 아예 되지 않는다. `derived-covered` 는 오르지도 내리지도 않으며 `declared-miss` 도 0 을 유지한다. **접두 층 이탈과 정확히 같은 침묵**이다.

**실측 (HEAD=`89ef3c6`)** — `§수용 기준` 최상위 항목 **843** 중, 판정 명령을 보유(허용 접두 인라인 스팬 또는 코드 펜스)하면서 `판정:` 선언이 없는 항목이 **191** 이었다. 같은 시점 `declared-items` 는 **81** 이다. 즉 대조가 실제로 도는 모집단은 명령 보유 항목의 **약 30%** 였다.

축 분리 (green 집행 / blue ADVISORY — blue `foundation/blue-attributed-violation-advisory-accounting`):

| 귀속 | 건수 | 처리 |
|---|---|---|
| green | **2** | tick 238 이 **양쪽 다 해소** — `foundation/spec-reference-coherence` 의 (G-2)(G-5). 해소 후 `declared-items` 81 → **83**, `derived-covered` 83, `declared-miss-green=0` 유지. |
| blue | **189** | `RULE-01` writer 부재 — ADVISORY. 파이프라인 안에서 닫히지 않는다. |

**이것이 §역할 (a)(b)(c) 세 채널 침묵의 실사례다.** 본 계약이 예측한 형상이 예측한 대로 실현돼 있었고, 그 규모는 접두 층이 아니라 선언 층에서 컸다.

**모집단 확장을 본 계약이 지금 지정하지 않는 이유** — 선언 토큰을 넓히면(예: 항목 구간의 허용 접두 스팬 존재 자체를 선언으로 간주) 모집단이 843 항목 전체 쪽으로 열리고, §역할 (iii) 이 배제한 **`RULE-07 §수용 기준 문장 규약` 이전에 승격된 문면 33건**이 소급 대상이 된다. 그 절충은 §역할 (i) 이 접두 확장에 대해 내린 판단과 같은 부류이며, 본 계약은 누락의 **가시화**만 요구하고 수단은 자유로 둔다. 다만 **가시화가 현재는 없다** — `declared-items` 만으로는 이 191 이 관측되지 않는다. 이 축의 계수 발화는 §미측정·비판정 항목 에 미측정으로 박제한다.

### 미측정·비판정 항목

- **(미측정 — tick 238 실측) 선언 토큰 층 이탈의 계수 발화.** 명령을 보유하면서 `판정:` 선언이 없는 항목 수(현 HEAD **191**, 그중 green **0** · blue **189**)는 게이트 산출 어디에도 나오지 않는다. `declared-items` 는 **선언한 것**만 세므로 **선언하지 않아서 빠진 것**을 구조적으로 볼 수 없다 — 접두 층에서 `judgement-commands=` 가 단조 비감소라 침묵하는 것과 같은 형상이다. 이 수치를 ack 라인에 얹는 것은 모집단 확장 결정(§자매 이탈 경로)과 묶여 있어 본 tick 에서 지정하지 않는다.

- **(미측정) 모집단 밖 33 항목의 접두 이탈이 장래에 함정을 실제로 유실시킬 확률.** 현 HEAD 에서는 유실 0 건임을 **열거로** 확인했다 (§동작). 본 계약은 그 확률을 다루지 않고 모집단이 좁다는 **사실의 가시화**만 요구한다.
- **(미측정 — tick 227 실측) 모집단 원소의 *실행 가능성*.** 본 계약은 선언 항목이 도출에 **귀속되는가**만 재고, 귀속된 원소가 **온전한 명령인가**는 재지 않는다. tick 227 이 인라인 스팬 원소 288건 전수에 `bash -n` 구문 검사를 돌려 **6건**이 구문 무효임을 확인했다 (두 부류).
  - **(부류 1) 백틱 절단 — 3건.** 명령이 문자 클래스나 정규식에 **리터럴 백틱**을 포함하면 홑백틱 인라인 스팬이 그 지점에서 조기 종료돼 **잘린 조각**이 모집단에 들어간다. 실행하면 `unexpected EOF while looking for matching quote` 로 **rc=2** — 위반도 충족도 아닌 **도달 불가**다. 실측: `blue/foundation/husky-pre-push-typecheck.md:70` · `blue/foundation/island-proptypes-zero.md:66` (둘 다 `` grep -vE '`[^`]*default[^`]*`' ``) · `blue/foundation/src-spec-reference-coherence.md:38` (`[^\"\` ]`). **네 번째 사례는 green `foundation/spec-reference-coherence` (G-2) 였고 tick 227 이 펜스로 옮겨 해소했다** — 펜스는 행 선두 ``` 로만 토글되므로 본문 백틱이 경계를 깨지 않는다. 셋은 전량 blue 라 `RULE-01` writer 부재 제약을 받는다.
  - **(부류 2) 자리표시자 오계수 — 3건.** `npm run lint:<name>` · `npm run check:<name>` (`blue/foundation/npm-script-prefix-coherence.md:54`) · `npm run <식별자>` (`green/foundation/auth-redirect-url-totality-and-observable-failure.md:172`) 는 **호출 형태를 설명하는 산문**인데 허용 접두와 일치해 명령으로 계수됐다. 셋 다 판정 선언 항목의 **진짜 판정 명령을 대체하지 않으므로** 현 HEAD 의 (A-1) 산출을 왜곡하지 않는다 — `auth-redirect:172` 의 실제 판정은 같은 줄 첫 스팬(`bash -c 'grep -qE …'`, tick 227 재실행 rc=0)이고, `npm-script-prefix-coherence:54` 는 판정 선언 항목이 아니다.
  - **함의** — 이 두 부류가 **판정 선언 항목의 유일한 도출 원소**가 되는 트리에서는 `derived-covered` 가 **거짓 양성**이 된다 (산문이 항목을 덮은 것으로 계수). 현 HEAD 에서 그런 항목은 **0건**임을 위 6건 개별 확인으로 확정했다. 이 축은 명령의 **도달 가능성**이라 green `testing/acceptance-command-measures-declared-subject` (C-3) 소관이며, 그 spec 의 C-3 는 대상을 **4건 열거**로 고정하고 있어 위 6건을 보지 않는다. 두 계약 어느 쪽도 아직 전수화하지 않았다.
- **(미측정) `check:*` 21종 중 같은 형상(모집단 도출 완전성 미관측)이 몇 건인지.** 확인된 것은 `check:acceptance-criteria` 1건이다.
- **(중복 게이트 — 체크박스 제외) `npm test` · `check:*` 21종 전수 rc=0.** 위반 시 husky·CI 가 즉시 실패하므로 `RULE-07 §반려 시그널` 의 중복 게이트 부류다. 전제로만 남긴다.

### 인접 계약 — 중복이 아닌 근거

- **blue `testing/derived-population-totality-judgement` (REQ-20260825-025)** — "도출한 모집단에 대한 판정은 전항 성립을 요구한다(`K==N`)". `check-acceptance-criteria.sh` 는 **이미 그 형상을 만족한다** — G-3·G-4 는 전건 위에서 `count==0` 을 요구하고, `DERIVE_MIN` 은 `exit 2` 로 분리된 **제자리의** 비공허 가드다. 즉 그 spec §역할 이 겨눈 "비공허 가드가 전항 요구 **자리**에" 형상이 **아니다**. 본 계약이 다루는 것은 `N` 이 참 모집단을 대표하는가 — **도출의 완전성**이며, 그 spec §역할 (i) 이 전수 적용을 명시 배제한 자리다.
- **green `testing/acceptance-command-measures-declared-subject` (REQ-20260826-027)** — 판정 명령의 **도달 가능성·대상 한정**을 소유한다. 본 계약은 그 판정이 서는 **모집단**을 소유한다. 상하 관계이며 겹치지 않는다: 열거(그 spec)가 아무리 늘어도 모집단 밖이면 무의미하다.
- **blue `foundation/gate-judgement-population-injectable-seam` (REQ-20260825-024)** — 모집단 **루트의 주입 경로**를 소유하고 §역할 (ii) 에서 판정 내용을 명시 제외한다. 본 계약은 그 seam 을 소비할 뿐 바꾸지 않는다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-26 | REQ-20260826-028 (inspector tick 227) | 최초 등록. **req 수용 기준 6항을 그대로 쓰지 않았다**: (a) req 의 (A-5) "게이트 전체가 초록" 은 `npm test`·`check:*` 와 같은 **중복 게이트 부류**(위반 시 husky·CI 즉시 실패)라 `RULE-07 §반려 시그널` 에 따라 체크박스에서 제외하고 §참고 전제로 내렸다 — 남은 5항으로 재번호. (b) req (A-2) 를 **동반 조건**으로 명시했다: 현 트리 stderr 가 공란이라 단독 rc=0 은 판정력이 0 이며, 그 사실을 적지 않으면 초록이 수리 완료로 오독된다. (c) (A-1) 의 실측을 req 의 `declared=69 covered=67` 이 아니라 **tick 227 재측정값 `71/70`** 으로 박제했다 — 같은 tick 의 C-4·FR-08 교정이 모집단을 움직였기 때문이며, req 수치는 tick 227 착수 시점 트리에서 **독립 probe 로 재현해 783/69/226/67 정확 일치**를 확인했다 (받아쓰지 않았다). (d) §동작 에 **자기 비봉쇄** 절을 신설했다 — req NFR-03 이 문장으로만 있었고, `acceptance-command-measures-declared-subject` 가 검출 토큰 리터럴로 실제 자기봉쇄를 겪은 선례가 있다. (e) §동작 에 **"살아 있는 함정 유실 0"** 실측을 박제했다 — 이 구분을 지우면 본 계약이 존재하지 않는 손실을 근거로 삼게 된다. | all |
- 2026-08-27 inspector: Phase 1 재실행 (HEAD `9cf62a4`) — (A-1) 명령 추출(len=324) 후 실행 → `ack 라인 미발화` rc=2 = **무판정** 지속으로 `[ ]` 유지 (미충족 아님, A-3 구분). (A-4) 게이트 재실행 rc=0, `judgement-commands=324 → 351` 증가로 모집단 비축소 유지. 증가분에는 본 tick 신설 spec `foundation/declared-gate-firing-channel-totality` 의 판정 명령 3건이 포함된다.
- 2026-08-28 inspector tick 238: Phase 1 — **(A-1) 무판정(rc=2) → 충족(rc=0) 플립**. 근거 커밋 `37f6285`(`TSK-20260828-05`, `git merge-base --is-ancestor` 로 HEAD 조상 확인). §수용 기준 5항의 판정 명령을 **파일에서 추출**(len 324·152·110·132·161, 전부 비공란)해 실행 → **5/5 rc=0**. 게이트 산출 `total-items=838 declared-items=75 derived-covered=75 declared-miss-green=0 declared-miss-blue=0 judgement-commands=457`. §테스트 현황 (P-A) 도출 항목도 착지로 플립. **초록 자체는 검출력의 증거가 아니므로** §참고 에 §검출 방향 실측 을 신설해 사본 루트 주입 3방향(green rc=1 / blue rc=0 ADVISORY / 빈 루트 rc=2)과 이중 고정 하한(`DERIVE_MIN` · `DECLARE_MIN` 별개 층), `61ce5ab` 재현 앵커(`783/69/67` + 미도출 2건 파일:라인 일치)를 박제했다. (Dir-5) 를 이관 목록에 추가. **A-4 모집단 비감소 유지** — `324 → 351 → 457` 단조 증가.
- 2026-08-28 inspector tick 238 (2차 편집): **자매 이탈 경로 발견 — 선언 토큰 층.** §역할 이 겨눈 것은 명령 **접두** 층 이탈인데, 판정 명령을 보유하면서 `판정:` 선언 토큰을 쓰지 않아 (P-A) 에 애초에 들어오지 않는 항목이 실측 **191** 건이었다 (전체 843 항목 · 같은 시점 `declared-items=81`). 즉 대조가 도는 모집단은 명령 보유 항목의 약 30% 였다. 축 분리 실측 green **2** / blue **189**. green 2건(`foundation/spec-reference-coherence` (G-2)(G-5))은 본 tick 이 **양쪽 다 해소** — `declared-items` 81 → **83**, `derived-covered` 83, `declared-miss-green=0` 유지. blue 189 는 writer 부재로 ADVISORY. 모집단 확장은 §역할 (iii) 이 배제한 소급 33건과 묶여 있어 본 tick 에서 지정하지 않고, **계수 발화 부재**를 §미측정·비판정 항목 에 박제했다. 이 발견의 계기는 본 tick 이 신설한 green `foundation/measurement-tree-attribution-wrapper-adoption` 의 항목 3건이 `판정 (펜스):` 표기 때문에 조용히 모집단 밖에 있던 것을 `declared-items` 증분(+1 예상 대비 실측)으로 알아챈 것이다.
