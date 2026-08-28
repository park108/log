# blue 귀속 미충족은 ADVISORY 로 계수하고 green 귀속 미충족은 rc 로 집행한다

> **위치**: 게이트 판정 표면 — `package.json scripts.check:*` 에서 도출되는 스크립트 집합. 발화 채널은 `.github/workflows/ci.yml` step 과 `.husky/pre-commit`.
> **관련 요구사항**: REQ-20260828-036 (운영자 결정 — `RULE-05 §결함 신고` 입구)
> **최종 업데이트**: 2026-08-28 (by inspector — 최초 등록, 골격)

## 역할

**판정 모집단에 `30.spec` blue 트리 문서를 포함하는 게이트는, blue 문서 본문에 귀속된 미충족을 rc 에 반영하지 않고 계수·열거만 하며(ADVISORY), green 문서 본문에 귀속된 미충족은 rc 로 집행한다** 는 불변식.

근거는 `RULE-01` writer 매트릭스다. blue 트리에는 create/edit writer 가 없다 — inspector 는 green 만, planner 는 mv 만, developer 는 `src/`·`scripts/` 만 쓴다. blue 본문 귀속 미충족을 rc 로 집행하면 그 `rc≠0` 을 `0` 으로 되돌릴 주체가 파이프라인 안에 존재하지 않고, 게이트는 착지 즉시 영구 red 가 된다.

**방어 대상 (RULE-07 §주제 우선순위 2)** — 이 계약이 막는 silent regression 은 둘이며 **둘 다 현행 자동 게이트로 검출되지 않는다**.

1. **수리 writer 가 없는 축을 rc 로 집행해 파이프라인이 영구 red 로 고착되는 회귀.** 조용한 이유: 게이트 자신은 정상 동작으로 보이고, 실패는 "규약 위반이 있다" 로 읽힌다. 실제로는 규약이 그 위반의 수리 경로를 봉쇄한 상태다.
2. **ADVISORY 전환을 빌미로 blue 를 판정 모집단에서 빼 검출력이 조용히 0 이 되는 회귀.** 조용한 이유: rc 는 `0` 이고 출력은 초록이며, 사라진 것은 숫자뿐이다. ADVISORY 와 모집단 제외는 rc 상 구별되지 않는다.

의도적으로 하지 않는 것:

- (i) **`RULE-01` writer 매트릭스를 바꾸지 않는다.** blue 편집 writer 신설·`60.done` 추적 전환은 `rules/` 개정이며 운영자 전용 영역이다.
- (ii) **blue 문서 본문을 수정하지 않는다.** 본 계약은 blue 귀속 미충족의 **취급 등급**만 규정하고 그 해소를 요구하지 않는다.
- (iii) **게이트 실패 등급 대칭 일반을 다루지 않는다** (SIGTERM 오귀인 · 파일 부재 등급 · 출력 채널 삼켜짐). blue/green 축 분리만 다룬다. §참고 §상호 제외 참조.
- (iv) **`src/**` 축 취급을 바꾸지 않는다.** developer 라는 수리 writer 가 실재하므로 hard-fail 을 유지한다.
- (v) **적용 대상 게이트를 이름으로 열거하지 않는다.** 모집단은 도출되며, 도출 결과가 이 문서의 서술과 갈라지면 도출이 이긴다 (`RULE-06 §열거 고정 금지`).

## 공개 인터페이스

런타임 인터페이스 아님 (측정 게이트 계약). 관측 표면은 셋이다.

- `package.json` 의 `scripts.check:*` 키·값 (모집단 도출의 유일한 진입점).
- 모집단 게이트 스크립트의 **주석 절단 후 실행 라인** (`sed -E 's/#.*//'`). 주석이 판정을 충족시키는 것을 배제한다.
- 모집단 게이트의 실행 출력(stdout+stderr)과 rc.

seam: 모집단 게이트가 스캔 루트 환경변수를 노출하면(`${<NAME>:-specs/30.spec}` 형태) 그 이름은 스크립트에서 **도출**되며, 공집합 무판정((A-7))은 그 seam 으로 실측한다.

## 동작

- **(A-0) 현 HEAD 실측 (baseline · 시점 의존)**: `check:*` **27** 종 / 스크립트 경로 도출 **27**. 1차 모집단 **3**, 2차 모집단 **2**. blue 문서 80 · green 문서 6. blue 귀속 dangling 참조 **13**, green 귀속 **0**. ADVISORY 발화 보유 **1/2**, blue 모집단 수치 출력 **0/2**, 공집합 `exit 2` **1/2**, 근거 주석 보유 **1/2** (HEAD=`4708539` 측정). 이 수치는 트리와 함께 이동하므로 **체크박스가 아니라 baseline** 이다. 판정은 아래 (A-1)~(A-8) 의 구조 명제가 진다.
- **(A-1) 모집단은 도출된다**: 적용 대상은 `package.json` 의 `scripts.check:*` 키에서 도출한다. 게이트 이름·스크립트 경로의 하드코딩 열거는 금지이며, 불가피한 경우 목록 완전성 보조 단언을 함께 둔다.
- **(A-2) 1차 술어 — 판정 모집단이 `30.spec` 트리에 걸린다**: 주석 절단 후 실행 라인이 `30.spec` 트리를 참조하는 게이트가 1차 모집단이다.
- **(A-3) 2차 술어 — blue **본문** 귀속**: 1차 모집단 중, `30.spec` 트리(또는 그 트리로 초기화된 변수)를 **파일 시스템 탐색 명령(`find` · `grep -r*`)의 인자**로 삼는 게이트가 2차 모집단이다. 이것이 본 계약의 적용 대상이다.
  - **경로 리터럴 존재로 술어를 대체하지 않는다.** blue 리터럴만 찾는 술어는 스캔 루트를 변수로 두고 `case` 의 else 분기로 blue 를 가르는 게이트를 놓친다 — 실측상 리터럴 술어 **2** vs 1차 술어 **3** 이며, 놓치는 1건이 하필 이 계약의 선례 구현이다.
  - 1차에는 들되 2차에서 빠지는 게이트가 존재한다. 그 게이트의 blue 참조는 **문서 본문이 아니라 커밋 diff 경로를 writer 라벨로 사상**하는 `case` 패턴이며, 미충족의 귀속 대상은 blue 문서가 아니라 커밋이다. 커밋의 writer 는 실재하므로 rc 집행에 수리 경로가 있고 ADVISORY 대상이 아니다. 2차 술어는 변수 이름을 하드코딩하지 않고 **스크립트 내 대입문에서 루트 변수명을 추출**해 이 구분을 낸다.
- **(A-4) blue 귀속 미충족은 rc 에 반영되지 않는다**: 2차 모집단의 게이트는 blue 본문 귀속 미충족이 존재하는 상태에서 `rc=0` 이다.
- **(A-5) ADVISORY 는 침묵이 아니다**: 2차 모집단의 게이트는 blue 귀속 미충족의 **건수와 항목**을 매 실행 출력에 낸다. 계수 0 화·목록 생략·모집단 제외는 위반이다. 발화는 **주석이 아니라 실행 라인**에서 이뤄진다 — 주석에 적힌 `ADVISORY` 는 아무것도 출력하지 않는다.
- **(A-6) green 귀속 미충족은 rc 로 집행된다**: blue ADVISORY 전환이 green 축의 하향 평준화로 번지지 않는다. 두 축은 **각각 별도로 계수되어 별도 rc 취급**을 받는다.
- **(A-7) 공집합은 무판정이다**: blue 축·green 축 판정 후보가 모두 0 이면 게이트는 `exit 2` 로 끝난다. "위반 없음" 이 아니라 "측정 못 함" 이다. 스캔 루트가 비거나 추출기가 낡아 모집단이 붕괴한 상태를 충족으로 읽지 않는다.
- **(A-8) 모집단 비삭감이 수치로 단언된다**: 2차 모집단의 게이트는 **스캔한 blue 문서 수(또는 blue 귀속 판정 후보 수)** 를 0 보다 큰 값으로 출력한다. 이 수치가 없으면 (A-4) 를 "blue 를 모집단에서 뺐다" 로 충족시키는 회피 경로가 열린다.
- **(A-9) 전환 근거가 스크립트에 박제된다**: 2차 모집단의 게이트 주석에 ADVISORY 인 이유(`RULE-01` writer 부재)와 **정상 처리 경로**(`10.followups → discovery → 20.req → 새 green 판본 → 승격 mv`)를 적는다. 근거 없는 ADVISORY 는 게으른 미완성과 구별되지 않고, 다음 세션이 "올려야 할 것을 안 올렸다" 로 읽어 되돌린다.

## 의존성

- 내부: `package.json` `scripts.check:*` (도출 진입점) · 2차 모집단 게이트 스크립트 · `.github/workflows/ci.yml` · `.husky/pre-commit` (발화 채널).
- 외부: `grep` · `sed` · `find` (POSIX).
- 역의존 (사용처): `testing/judgement-command-derivation-completeness` (green — 미도출 선언 항목의 다수가 blue 원본이라 A-1 이 무판정에 묶여 있다. 본 계약이 그 축의 등급을 정한다) · `foundation/spec-reference-coherence` (green — dangling 13 전량 blue) · `foundation/developer-commit-body-report-block-presence` (green — blue `multi-agent-commit-message-writer-scope-coherence` §동작 (C4) 와의 충돌).

## 테스트 현황

- [x] (모집단 비공허 · 대조군) 도출 진입점이 실재하고 비지 않는다 — `bash -c 'k=$(grep -oE "\"check:[A-Za-z0-9:-]+\":" package.json | sort -u | grep -c .); s=$(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u | grep -c .); echo "$k $s"; [ "$k" -ge 20 ] && [ "$s" -ge 20 ]'` → HEAD=`4708539` 출력 `27 27` / rc=0. 이 대조군이 통과한다는 사실이 아래 미충족이 **도출 붕괴가 아니라 실제 게이트 미구현**임을 보인다.
- [x] (특이도 대조군) 도출된 스크립트 경로가 전부 디스크에 실재한다 — `bash -c 'n=0; m=0; for f in $(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u); do m=$((m+1)); [ -s "$f" ] && n=$((n+1)); done; echo "$n/$m"; [ "$m" -ge 20 ] || exit 2; [ "$n" = "$m" ]'` → HEAD=`4708539` 출력 `27/27` / rc=0. 도출이 실재하지 않는 경로를 내면 아래 모집단 술어는 전부 조용히 0 이 된다 — 그 붕괴를 이 대조군이 먼저 잡는다.

## 수용 기준

> 아래 각 항의 앞부분은 공통 도출이다. `P1` = 1차 모집단, `P2` = 2차 모집단. 도출은 매 항이 자기 안에서 다시 수행한다 — 게이트 이름을 항 사이에 옮겨 적지 않기 위함이다.

- [x] (Must · A-1·A-2) 1차 모집단이 도출되고 비지 않는다 — `bash -c 'n=0; for f in $(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u); do sed -E "s/#.*//" "$f" | grep -qE "specs/30\.spec" && n=$((n+1)); done; echo "$n"; [ "$n" -ge 2 ]'` → HEAD=`4708539` 출력 `3` / rc=0. 주석을 절단한 뒤 세므로 주석에만 경로가 적힌 스크립트는 모집단에 들지 않는다.
- [x] (Must · A-3) 경로 리터럴 술어가 1차 술어보다 **작다** — `bash -c 'a=0; b=0; for f in $(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u); do t=$(sed -E "s/#.*//" "$f"); printf "%s\n" "$t" | grep -qE "specs/30\.spec" && a=$((a+1)); printf "%s\n" "$t" | grep -qE "30\.spec/blue" && b=$((b+1)); done; echo "$a $b"; [ "$a" -ge 2 ] || exit 2; [ "$b" -lt "$a" ]'` → HEAD=`4708539` 출력 `3 2` / rc=0. 리터럴 술어가 놓치는 1건이 실재함을 매 실행 재확인한다. 두 수가 같아지면 리터럴 대체 금지의 근거가 사라진 것이므로 술어 정의를 다시 판정한다.
- [x] (Must · A-3) 2차 모집단이 도출되고 비지 않으며 1차의 부분집합이다 — `bash -c 'p1=""; for f in $(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u); do sed -E "s/#.*//" "$f" | grep -qE "specs/30\.spec" && p1="$p1 $f"; done; p2=""; for f in $p1; do t=$(sed -E "s/#.*//" "$f"); pat="specs/30\.spec"; for v in $(printf "%s\n" "$t" | grep -oE "^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=[^=]*specs/30\.spec" | grep -oE "[A-Za-z_][A-Za-z0-9_]*=" | tr -d "=" | sort -u); do pat="$pat|[\$]\{?$v"; done; printf "%s\n" "$t" | grep -E "(find |grep -[A-Za-z]*r[A-Za-z]*)" | grep -qE "($pat)" && p2="$p2 $f"; done; a=$(echo $p1 | wc -w); b=$(echo $p2 | wc -w); echo "$a $b"; [ "$b" -ge 2 ] && [ "$b" -le "$a" ]'` → HEAD=`4708539` 출력 `3 2` / rc=0. 루트 변수명은 스크립트의 대입문에서 추출하므로 변수 이름 하드코딩이 없다.
- [x] (Must · A-4) blue 귀속 미충족이 실재하는 트리에서 2차 모집단 전원이 `rc=0` 이다 — `bash -c 'b=0; for p in $(grep -rhoE --include="*.md" "specs/30\.spec/(blue|green)/[A-Za-z0-9._/-]+\.md" specs/30.spec/blue | sort -u); do [ -e "$p" ] || b=$((b+1)); done; echo "blue-dangling=$b"; [ "$b" -gt 0 ] || exit 2; p1=""; for f in $(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u); do sed -E "s/#.*//" "$f" | grep -qE "specs/30\.spec" && p1="$p1 $f"; done; m=0; for f in $p1; do t=$(sed -E "s/#.*//" "$f"); pat="specs/30\.spec"; for v in $(printf "%s\n" "$t" | grep -oE "^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=[^=]*specs/30\.spec" | grep -oE "[A-Za-z_][A-Za-z0-9_]*=" | tr -d "=" | sort -u); do pat="$pat|[\$]\{?$v"; done; printf "%s\n" "$t" | grep -E "(find |grep -[A-Za-z]*r[A-Za-z]*)" | grep -qE "($pat)" || continue; m=$((m+1)); bash "$f" >/dev/null 2>&1 || exit 1; done; [ "$m" -ge 2 ]'` → HEAD=`4708539` 출력 `blue-dangling=13` / rc=0. blue 미충족 실재를 **먼저 독립 probe 로 확인**(0 이면 `exit 2` 무판정)하므로 "위반이 없어서 초록" 인 공허 통과와 구별된다.
- [x] (Must · A-5) 2차 모집단 전원이 ADVISORY 계수를 **실행 라인에서** 발화한다 — `bash -c 'p1=""; for f in $(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u); do sed -E "s/#.*//" "$f" | grep -qE "specs/30\.spec" && p1="$p1 $f"; done; n=0; m=0; for f in $p1; do t=$(sed -E "s/#.*//" "$f"); pat="specs/30\.spec"; for v in $(printf "%s\n" "$t" | grep -oE "^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=[^=]*specs/30\.spec" | grep -oE "[A-Za-z_][A-Za-z0-9_]*=" | tr -d "=" | sort -u); do pat="$pat|[\$]\{?$v"; done; printf "%s\n" "$t" | grep -E "(find |grep -[A-Za-z]*r[A-Za-z]*)" | grep -qE "($pat)" || continue; m=$((m+1)); printf "%s\n" "$t" | grep -qE "(printf|echo)[^;]*ADVISORY" && n=$((n+1)); done; echo "$n/$m"; [ "$m" -ge 2 ] || exit 2; [ "$n" = "$m" ]'` → HEAD=`308ee6d` 출력 `2/2` / rc=0 (전환 커밋 `c1a7f1f`). 주석 절단 후 판정하므로 주석에 적힌 `ADVISORY` 는 계수되지 않는다. 분모는 도출된 2차 모집단이며 `[ "$m" -ge 2 ] || exit 2` 가 앞서므로 모집단 붕괴는 충족이 아니라 무판정으로 갈린다 — `2/2` 는 공허 통과가 아니다.
- [ ] (Must · A-8) 2차 모집단 전원이 **스캔한 blue 모집단 수치**를 0 보다 큰 값으로 출력한다 — `bash -c 'p1=""; for f in $(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u); do sed -E "s/#.*//" "$f" | grep -qE "specs/30\.spec" && p1="$p1 $f"; done; n=0; m=0; for f in $p1; do t=$(sed -E "s/#.*//" "$f"); pat="specs/30\.spec"; for v in $(printf "%s\n" "$t" | grep -oE "^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=[^=]*specs/30\.spec" | grep -oE "[A-Za-z_][A-Za-z0-9_]*=" | tr -d "=" | sort -u); do pat="$pat|[\$]\{?$v"; done; printf "%s\n" "$t" | grep -E "(find |grep -[A-Za-z]*r[A-Za-z]*)" | grep -qE "($pat)" || continue; m=$((m+1)); bash "$f" 2>&1 | grep -qE "blue[^0-9]{0,24}(scanned|files|docs|population|candidates)[= ]*[1-9]" && n=$((n+1)); done; echo "$n/$m"; [ "$m" -ge 2 ] || exit 2; [ "$n" = "$m" ]'` → HEAD=`4708539` 출력 `0/2` / rc=1 — 미충족. 현 출력의 `blue(missing=13 suffix=11)` 은 **위반 계수**이지 스캔 모집단 수가 아니다. 위반이 0 으로 떨어지면 그 수치는 모집단 제외와 구별되지 않는다.
- [ ] (Must · A-7) 2차 모집단 전원이 공집합 스캔 루트에서 `exit 2` 로 끝난다 — `bash -c 'd=$(mktemp -d); p1=""; for f in $(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u); do sed -E "s/#.*//" "$f" | grep -qE "specs/30\.spec" && p1="$p1 $f"; done; n=0; m=0; for f in $p1; do t=$(sed -E "s/#.*//" "$f"); pat="specs/30\.spec"; for v in $(printf "%s\n" "$t" | grep -oE "^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=[^=]*specs/30\.spec" | grep -oE "[A-Za-z_][A-Za-z0-9_]*=" | tr -d "=" | sort -u); do pat="$pat|[\$]\{?$v"; done; printf "%s\n" "$t" | grep -E "(find |grep -[A-Za-z]*r[A-Za-z]*)" | grep -qE "($pat)" || continue; m=$((m+1)); s=$(printf "%s\n" "$t" | grep -oE "[\$]\{[A-Za-z_][A-Za-z0-9_]*:-specs/30\.spec" | grep -oE "[A-Za-z_][A-Za-z0-9_]*" | head -1); [ -n "$s" ] || continue; env "$s=$d" bash "$f" >/dev/null 2>&1; [ $? -eq 2 ] && n=$((n+1)); done; echo "$n/$m"; [ "$m" -ge 2 ] || exit 2; [ "$n" = "$m" ]'` → HEAD=`4708539` 출력 `1/2` / rc=1 — 미충족. 한 게이트는 공집합을 `exit 1` (비공허 하한 위반) 로 끝낸다. 그 등급은 "측정 못 함" 이 아니라 "위반" 이라 무판정과 구별되지 않는다. seam 이름은 스크립트에서 도출하므로 환경변수 이름 하드코딩이 없다.
- [ ] (Should · A-9) 2차 모집단 전원의 주석에 전환 근거와 정상 처리 경로가 박제돼 있다 — `bash -c 'p1=""; for f in $(grep -oE "\"check:[A-Za-z0-9:-]+\": \"[^\"]*\"" package.json | grep -oE "scripts/[A-Za-z0-9._-]+\.sh" | sort -u); do sed -E "s/#.*//" "$f" | grep -qE "specs/30\.spec" && p1="$p1 $f"; done; n=0; m=0; for f in $p1; do t=$(sed -E "s/#.*//" "$f"); pat="specs/30\.spec"; for v in $(printf "%s\n" "$t" | grep -oE "^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=[^=]*specs/30\.spec" | grep -oE "[A-Za-z_][A-Za-z0-9_]*=" | tr -d "=" | sort -u); do pat="$pat|[\$]\{?$v"; done; printf "%s\n" "$t" | grep -E "(find |grep -[A-Za-z]*r[A-Za-z]*)" | grep -qE "($pat)" || continue; m=$((m+1)); c=$(grep -cE "^[[:space:]]*#.*(RULE-01|writer)" "$f"); [ "$c" -ge 2 ] && n=$((n+1)); done; echo "$n/$m"; [ "$m" -ge 2 ] || exit 2; [ "$n" = "$m" ]'` → HEAD=`4708539` 출력 `1/2` / rc=1 — 미충족. 이 항은 주석을 **대상으로** 재므로 주석 절단을 적용하지 않는다 — (A-5) 와 정반대 표면이며 둘은 서로를 대체하지 않는다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-28 | `c1a7f1f` | (A-5) 충족 확정 — 2차 모집단 전원이 실행 라인에서 ADVISORY 계수 발화 (`2/2` rc=0 @`308ee6d`) | 수용 기준 |
| 2026-08-28 | REQ-20260828-036 / `4708539`+ | 최초 등록 (inspector Phase 3 흡수 · 골격). 모집단 2단계 도출 실측 `27 → 3 → 2`, 미충족 4항 박제 | all |

## 참고

### 선례 구현 (본 계약이 확대하는 패턴)

- `scripts/check-spec-coherence.sh:9-12` — 판정 스코프를 writer 매트릭스에 정합시켜 선언 (`src/**` hard-fail / green hard-fail / blue ADVISORY).
- `scripts/check-spec-coherence.sh:14-22` — 전환 근거 박제. *"blue 가 ADVISORY 인 이유 (게으른 미완성이 아니다 — 올리지 말 것)"*.
- `scripts/check-spec-coherence.sh:171-182` — green 축 즉시 집행 (하향 평준화 없음).
- `scripts/check-spec-coherence.sh:184-195` — 비공허 하한.
- `scripts/check-spec-coherence.sh:202-206` — ADVISORY 출력 형식.
- 전환 대상: `scripts/check-acceptance-criteria.sh:47`(blue 루트) · `:59`(blue 스캔) · `:63`(위반 출력) · `:104`(`exit 1`) · `:120`(`exit 2` 무판정 선례 — 이미 (A-7) 을 충족하는 유일한 축).

### 비-중복 근거 (인접 spec 열거)

- `foundation/gate-failure-classification-and-evidence-parity` (blue) — 게이트 실패의 **등급 체계**를 다루나 §범위가 *"다른 `check:*` 로의 일괄 확장은 범위 밖 — 본 계약은 스크립트 1개 대상"* 으로 자기 제한한다. 본 계약은 도출된 모집단 전체를 대상으로 하며 축은 blue/green 귀속 분리다.
- `foundation/declared-gate-firing-channel-totality` (blue) — 선언된 게이트의 **채널 실재**를 판정한다. 본 계약은 채널 보유가 아니라 **판정 결과의 등급**을 규정하므로 층이 다르다.
- `foundation/spec-reference-coherence` (green) — 참조 실재라는 **개별 명제**를 진다. 본 계약은 그 명제의 미충족을 어느 등급으로 계수할지를 정한다. 두 문서는 층이 다르고, 그 spec 의 미충족 6항이 blue 귀속으로 묶여 있는 상태가 본 계약의 직접 동기다.
- 표기: 위 인접 spec 은 lifecycle 경로가 아니라 **slug** 로 지칭한다 — 승격으로 경로가 바뀌어도 참조가 끊기지 않아야 하기 때문이다 (`RULE-01 §파일 이름`).

### 상호 제외 (중복 오인 방지)

REQ-031 §Out-of-Scope 는 등급 대칭을 `gate-failure-classification-and-evidence-parity` 소관으로 넘기고, 그 spec 은 일괄 확장을 범위 밖으로 자기 제한한다. **두 문서가 서로에게 넘기며 아무도 소유하지 않는 공백**이 있고, 본 계약은 그 공백의 *일부*(blue/green 축 분리)만 가져간다. 등급 대칭 일반(SIGTERM 오귀인 · `package.json` 부재 등급 · 출력 채널 삼켜짐)은 별건으로 남는다.

### 미측정·비판정 항목

- **NFR-02 (전환 전후 계수 동일성).** "전환 전" 은 이미 지나간 트리 상태이므로 현 HEAD 에서 재현할 수 없다. 계수 보존은 (A-8) 의 모집단 수치 출력이 대신 방어한다.
- **모집단 자동 편입 (NFR-01).** 신규 `check:*` 가 추가되어 2차 술어를 만족하면 도출이 자동으로 잡는다는 명제는 그 신규 게이트가 존재해야 판정된다. 도출 구조 자체는 (A-1)(A-3) 이 매 실행 재확인한다.
- **(A-0) 의 27/3/2/80/6/13/0 수치.** 트리와 함께 이동하므로 어느 값도 안정적으로 `[x]` 가 되지 않는다 — 평서 baseline 으로만 박제한다.
- **1차에서 2차로 빠지는 게이트의 판정 근거.** 그 게이트의 blue 참조가 커밋 diff 경로 사상임은 (A-3) 의 도출이 구조적으로 가르나, "그 사상이 blue 문서 본문 귀속이 아니다" 라는 의미 판정 자체는 명령 1회로 재지 않는다. 술어의 출력 수치(1차 3 / 2차 2)가 그 구분의 유일한 기계 흔적이다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)

아래 두 방향은 **위반을 주입해야만** 판정되므로 체크박스로 두지 않는다. 2차 모집단 게이트를 **수정하는 task** 의 DoD 로 이관하며, `result.md` 에 방향별 주입 명령과 출력을 박제한다 (`RULE-04` notes `injection: N/N detect`).

1. **green 축 rc 집행 방향 (A-6)** — green 트리에 부재 참조 1건을 주입 → `rc≠0` → 원복 → `rc=0`. blue ADVISORY 전환이 green 축을 함께 이완시키지 않았음을 이 방향이 유일하게 잰다. §수용 기준의 (A-4) 는 blue 축만 재므로 이 방향을 대체하지 못한다.
2. **blue 축 비집행 방향 (A-4) 의 민감도** — blue 트리에 부재 참조 1건을 **추가** → 출력 계수가 증가하고 `rc=0` 이 유지 → 원복. 계수가 증가하지 않으면 모집단에서 blue 가 빠진 것이다.

이관처 task 가 발행되지 않은 상태에서 본 spec 이 승격되면 위 두 방향은 파이프라인에서 소멸한다. 이관처 부재 시 `10.followups/` 에 이관처 발행 요청을 남긴다.

### 운영자 판단 필요 (파이프라인 writer 경계 밖)

- **blue 귀속 미충족의 실제 해소.** 본 계약은 등급만 정하고 해소를 요구하지 않는다. 해소하려면 blue 편집 writer 신설(`RULE-01` 개정) 또는 blue 문서의 green 재판본 발행 후 승격 mv 가 필요하며, 전자는 운영자 전용이다.
