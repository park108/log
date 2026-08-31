# 판정 창은 자기를 세지 않고, 무판정은 통과가 아니며, 효력면이 서면 대리면은 은퇴한다

> **위치**: `specs/30.spec/green/**` 의 판정 항 자신과 그것을 뽑아낸 발화 채널 `scripts/check-spec-judgement-classification.sh`.
> **관련 요구사항**: REQ-20260901-088
> **최종 업데이트**: 2026-09-01 (by inspector 258차 tick — 최초 박제)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

`foundation/gate-effective-surface-and-variant-battery` 가 *"게이트는 대리 표면이 아니라 효력면을 잰다"* 를 세웠고, REQ-083(모집단 == 효력 집합)·REQ-084(토큰의 활성/비활성 출현)가 그 두 방향을 채웠다. **본 계약은 그 셋으로 잡히지 않는 세 방향을 진다** — 창의 *자기 포함* · 무판정의 *지위* · 판정면의 *유일성*.

1. **판정 창이 자기를 포함한다.** 판정 항의 명령이 자기 자신을 모집단으로 세고, 게이트를 서술하는 산문이 게이트의 계수 대상이 된다.
2. **무판정이 통과와 구별되지 않고, 무판정 조건이 정상화와 같은 방향으로 발동한다.** 계약이 지켜질수록 측정이 꺼진다.
3. **효력면이 서도 대리 판정면이 은퇴하지 않는다.** 같은 조건에 판정면이 둘이 되어 서로 반대의 rc 를 내고, 계약이 요구하는 정합적 변경이 저장소 수준에서 막힌다.

**셋 다 주입 왕복(`injection N/N`)과 `grep dry-run` 을 통과한 상태로 존재했다.** 민감도 검사는 위반을 잡는지만 재고 특이도 검사는 정상 트리 한 점에서만 재며, **둘 다 "이 게이트가 무엇을 세고 있는가" 는 재지 않는다.**

**의도적으로 하지 않는 것**:
- 물결·별표 축 효력면 게이트의 **구현** — 그 blue spec 소유이며 green 재개봉이 선행한다. 본 계약은 **은퇴·교체의 조건**만 세운다 (§참고 §등급 보고).
- 대리면이 발견된 개별 spec 의 문면 편집 자체 — 본 계약은 그 편집이 만족해야 할 조건을 정한다.
- `RULE-06` 체크리스트 개정 (운영자 영역 — §참고 에 신호만 남긴다).
- 판정면을 소스 재구성에서 런타임 등록부로 옮기는 **수단 선택**.

## 공개 인터페이스

없음. 판정면은 green 판정 항의 명령 문자열 자신과 그 실행 결과, 그리고 같은 측정을 뽑아낸 발화 채널의 출력이다.

## 동작

1. **인라인 ↔ 채널 대조** — spec 본문의 판정 명령을 **파일에서 추출해** 실행하고, 같은 측정을 뽑아낸 발화 채널을 실행해 산출 줄을 비교한다. 추출이 비면 무판정이다 (`RULE-06 §추출 실패 검출` — 빈 추출은 `bash -c ""` 로 `rc=0` 이다).
2. **자기 제외** — 판정 항을 순회하는 명령은 자기 자신과 동류 항을 모집단에서 뺀다. 제외 규칙은 **세 판정 항이 공유**한다 — 항마다 다르면 어느 항이 무엇을 세는지가 항마다 달라진다.
3. **하한의 방향** — 큐를 훑는 판정 명령은 모집단 하한을 **절대수로 고정하지 않는다.** 절대수 하한은 승격이 진행될수록(=계약이 지켜질수록) 발동해 측정을 끈다. 하한은 **도출 비공허**라는 구조적 조건으로 표현한다.
4. **무판정의 지위** — 도출 공집합·후보 평가 실패·전제 부재는 `exit 2` 로 닫고 **출력에 드러낸다.** 무판정 항은 `[x]` 가 아니다.
5. **판정면 유일성** — 효력면이 착지하면 종전 대리 판정면은 `## 참고` 로 강등하며, **green·blue 양쪽**에서 해소된다. 해소 전까지의 미해소 상태는 문면 주석이 아니라 **게이트가 들고 있는다.**

## 의존성

- 내부: `specs/30.spec/green/**` (판정 모집단 — 도출), `specs/30.spec/blue/**` ((I5) 양쪽 해소 판정), `scripts/check-spec-judgement-classification.sh` (발화 채널), `package.json` `scripts.check:spec-classification`.
- 외부: POSIX `find`/`grep`/`sort`, `perl` (판정 구획 파싱), `bash` (`eval` — 추출 명령 실행).
- 역의존 (사용처): 본 계약을 참조하는 spec 은 아래로 도출한다 — `bash -c 'set -- $(grep -rl "judgement-surface-uniqueness-and-no-judgement-status" specs/30.spec/green specs/30.spec/blue --include="*.md"); echo "revdep-docs=$#"; test "$#" -ge 1'` (자기 언급 포함).

## 테스트 현황

- [x] (I1 인라인 ↔ 채널 동치 — FR-09) 인라인 판정 항과 그것을 뽑아낸 발화 채널이 같은 입력에서 같은 산출을 낸다: `bash -c 'd=$(find specs/30.spec/green specs/30.spec/blue -name "gate-effective-surface-and-variant-battery.md" | head -1); test -n "$d" || exit 2; s=scripts/check-spec-judgement-classification.sh; test -f "$s" || exit 2; C=$(perl -ne "BEGIN{\$B=chr(96)} next unless /judgement-items=/; while(/\$B(bash -c [^\$B]+)\$B/g){ print \$1; exit }" "$d"); test -n "$C" || exit 2; A=$(eval "$C" 2>/dev/null | grep -E "^judgement-items="); B=$(bash "$s" 2>/dev/null | grep -E "^judgement-items="); test -n "$A" -a -n "$B" || exit 2; echo "inline=[$A] channel=[$B]"; test "$A" = "$B"'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `inline=[judgement-items=94 exec=10 static-declared=56 static-undeclared=28] channel=[judgement-items=94 exec=10 static-declared=56 static-undeclared=28]`. **명령을 손으로 옮겨 적지 않고 파일에서 추출해 실행하며, 추출이 비면 `exit 2` 무판정으로 닫는다.** **흡수 전에는 인라인 `97/13` vs 채널 `94/10` 으로 정확히 3 이 갈렸고 그 3 이 판정 항 자신들이었다** — 결론(rc=1)은 같아서 이 격차는 tick 마다 §참고 에 박제되면서도 아무도 붉히지 않았다. **음성 대조 + 목격자 왕복 실측** (`RULE-06 §음성 대조` 2026-09-01 추가분): 정상 변형으로 **판정 구획 밖 산문을 추가**했더니 rc 와 출력 수치가 **둘 다 불변**이라 *"정상이라 판정했다"* 와 *"아예 안 봤다"* 가 겹쳤다. 그래서 대조 변형을 **유지한 채** 목격자(인라인 명령의 자기 제외를 통째로 제거)를 얹었다 → **rc=1**, `inline=[judgement-items=101 exec=14 …]` vs `channel=[judgement-items=98 exec=11 …]` 로 **정확히 3 이 벌어졌다**(그 3 이 자기 자신들이다). 목격자만 걷어내자 **rc=0** 으로 복귀 — 즉 그 `rc=0` 은 침묵이 아니라 대조 변형에 대한 **판정**이다. **첫 목격자는 실패했고 그 실패가 정보였다**: 제외 토큰을 하나만 빼는 목격자는 세 명령이 전부 같은 합집합을 담고 있어 **다른 토큰이 대신 매치해 가려졌다** — 과잉 결정된 술어에서는 부분 제거가 목격자가 되지 못한다. 전체 제거로 바꿔서야 창이 그 자리를 보고 있음이 드러났다.
- [ ] (I2 자기 제외 전수 — FR-02·FR-03) 판정 항을 순회하는 명령이 전건 자기 제외 규칙을 갖는다: `bash -c 'set -- $(find specs/30.spec/green -name "*.md"); test "$#" -ge 1 || exit 2; R=$(perl -ne "BEGIN{\$B=chr(96)} if(/^## (테스트 현황|수용 기준)\s*\$/){\$k=1;next} if(/^## /){\$k=0;next} if(\$k && /^- \[[ x]\]/){ while(/\$B([^\$B]+)\$B/g){ my \$c=\$1; next unless \$c=~/^bash -c/; next unless \$c=~/테스트 현황/; next if \$c=~/without-self-exclusion|absolute-queue-floors|marked-satisfied|name-counting-judgement-items/; print((\$c=~/next if/) ? qq{C \$ARGV:\$.\n} : qq{U \$ARGV:\$.\n}); last } } if(eof){close ARGV}" "$@"); tot=$(printf "%s\n" "$R" | grep -c .); test "$tot" -ge 1 || exit 2; u=$(printf "%s\n" "$R" | grep -c "^U"); echo "item-iterating-commands=$tot without-self-exclusion=$u [$(printf "%s\n" "$R" | grep "^U" | tr "\n" " ")]"; test "$u" -eq 0'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `item-iterating-commands=5 without-self-exclusion=2` (`spec-judgement-command-evaluability` (I11 판정 구획 한정) · (I12 모드 정합)). **정적 불변식이다.** **하한은 모집단(`tot>=1`)에, 0 은 산출(`u`)에 건다.** **주입 왕복 실측**: `gate-effective` (I3·I4) 의 자기 제외를 지우자 `without-self-exclusion` 2 → **3**, 원복 시 2. **구조로 보장하고 규율에 기대지 않는다** — 종전 조치는 산문 쪽 토큰을 서술어로 바꾸는 것이었고 그것을 수행한 developer 자신이 *"이것은 규율이지 구조가 아니다"* 라고 적었다. 다음 사람이 산문에 그 토큰을 쓰는 순간 되돌아간다. **본 항을 포함한 네 판정 항(I2·I3·I4·I5)도 같은 규칙으로 자기를 뺀다** — 자기 산출 토큰(`without-self-exclusion`·`absolute-queue-floors`·`marked-satisfied`·`name-counting-judgement-items`) 합집합 제외이며, **넣기 전 실측이 `item-iterating-commands=9 without-self-exclusion=5` 였다**: 새로 세운 네 항이 전부 자기를 세고 자기를 위반으로 신고했다. 자기 제외 후 `5/2` 로, 남은 2 가 실제 미해소분이다. **이 계약을 세우면서 그 계약을 어긴 것을 그 계약의 게이트가 잡았다** — 규율이 아니라 구조로 보장한다는 말의 실물이다.
- [x] (I3 큐 하한의 방향 — FR-05) 큐를 훑는 판정 명령에 절대수 모집단 하한이 없다: `bash -c 'set -- $(find specs/30.spec/green -name "*.md"); test "$#" -ge 1 || exit 2; R=$(perl -ne "BEGIN{\$B=chr(96)} if(/^## (테스트 현황|수용 기준)\s*\$/){\$k=1;next} if(/^## /){\$k=0;next} if(\$k && /^- \[[ x]\]/){ while(/\$B([^\$B]+)\$B/g){ my \$c=\$1; next unless \$c=~/^bash -c/; next unless \$c=~/specs\/30\.spec\//; next if \$c=~/without-self-exclusion|absolute-queue-floors|marked-satisfied|name-counting-judgement-items/; print qq{\$ARGV:\$.\n} if \$c=~/-ge [0-9][0-9]+[^;]*\|\| exit 2/ } } if(eof){close ARGV}" "$@"); n=$(printf "%s\n" "$R" | grep -c .); tot=$(perl -ne "BEGIN{\$B=chr(96)} if(/^## (테스트 현황|수용 기준)\s*\$/){\$k=1;next} if(/^## /){\$k=0;next} if(\$k && /^- \[[ x]\]/){ while(/\$B([^\$B]+)\$B/g){ my \$c=\$1; next unless \$c=~/^bash -c/; next unless \$c=~/specs\/30\.spec\//; next if \$c=~/without-self-exclusion|absolute-queue-floors|marked-satisfied|name-counting-judgement-items/; print qq{.\n}; last } } if(eof){close ARGV}" "$@" | grep -c .); test "$tot" -ge 1 || exit 2; echo "queue-scanning-judgement-commands=$tot absolute-queue-floors=$n"; test "$n" -eq 0'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `queue-scanning-judgement-commands=20 absolute-queue-floors=0`. **정적 불변식이다.** **`specs/30.spec/` 를 훑는 명령으로 창을 좁힌 것이 핵심이다** — `src` 의 비공허 하한(`git ls-files src` ≥ 100)은 정상 용법이며 정상화가 진행돼도 줄지 않는다. **음성 대조 실측**: 그 `-ge 100` 항은 좁힌 뒤 잡히지 않는다(rc=0). **주입 왕복 실측**: `gate-effective` (I3·I4) 의 하한을 `-ge 1` → `-ge 50` 으로 되돌리자 `absolute-queue-floors` 0 → **1**, rc=1.
- [x] (I4 무판정은 통과가 아니다 — FR-04) 마지막 측정이 `rc=2` 인 판정 항이 `[x]` 로 표시돼 있지 않다: `bash -c 'set -- $(find specs/30.spec/green -name "*.md"); test "$#" -ge 1 || exit 2; R=$(perl -ne "if(/^## (테스트 현황|수용 기준)\s*\$/){\$k=1;next} if(/^## /){\$k=0;next} if(\$k && /^- \[([ x])\]/){ my \$m=\$1; next if /without-self-exclusion|absolute-queue-floors|marked-satisfied|name-counting-judgement-items/; my @r=/rc=([0-9])/g; next unless @r; next unless \$r[-1] eq q(2); print((\$m eq q(x)) ? qq{V \$ARGV:\$.\n} : qq{K \$ARGV:\$.\n}) } if(eof){close ARGV}" "$@"); tot=$(printf "%s\n" "$R" | grep -c .); test "$tot" -ge 1 || exit 2; v=$(printf "%s\n" "$R" | grep -c "^V"); echo "latest-no-judgement-items=$tot marked-satisfied=$v [$(printf "%s\n" "$R" | grep "^V" | tr "\n" " ")]"; test "$v" -eq 0'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `latest-no-judgement-items=12 marked-satisfied=0`. **정적 불변식이다.** **`rc=` 출현 중 마지막 것을 현재 측정으로 읽는다** — 그러지 않으면 *"rc=2 → rc=0 으로 회복"* 이라는 정상 이력을 담은 항이 위반으로 잡힌다. **음성 대조 실측**: `gate-effective` (I7 좁힘) 항은 `rc=0 rc=1 rc=0 rc=2 rc=2 rc=0` 을 담고 마지막이 0 이라 잡히지 않는다(rc=0). **주입 왕복 실측**: 무판정 항 1 건을 `[x]` 로 뒤집자 `marked-satisfied` 0 → **1**, rc=1.
- [ ] (I5 판정면 유일성 — FR-07·FR-10) 효력면이 선 조건에 이름 계수 판정면이 남아 있지 않다: `bash -c 'set -- $(find specs/30.spec/green specs/30.spec/blue -name "markdown-blank-line-predicate.md"); test "$#" -ge 1 || exit 2; n=0; for f in "$@"; do c=$(perl -ne "if(/^## (테스트 현황|수용 기준)\s*\$/){\$k=1;next} if(/^## /){\$k=0;next} next if /without-self-exclusion|absolute-queue-floors|marked-satisfied|name-counting-judgement-items/; print if \$k && /^- \[[ x]\]/ && /const isBlankLine/" "$f" | grep -c .); n=$((n+c)); done; echo "docs=$# name-counting-judgement-items=$n"; test "$n" -eq 0'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `docs=2 name-counting-judgement-items=1`. **정적 불변식이다.** **green 은 본 tick 에 해소했고(1 → 0) blue 1 건이 남는다.** blue 는 inspector writer 영역이 아니므로(`RULE-01`) **green 승격이 blue 를 갈아끼울 때 해소된다** — 그때까지 REQ-076 FR-02(*"정합적 개명이 통과해야 한다"*)는 저장소 수준에서 미충족이다. **이 항의 존재 이유가 그 미충족을 문면 주석이 아니라 게이트가 들고 있게 하는 것이다**: 주석은 승격 시 아무도 다시 읽지 않지만 rc=1 은 읽힌다.

## 수용 기준

- [x] (Must, FR-09) 위 §테스트 현황 (I1 인라인 ↔ 채널 동치) 명령 → rc=0. HEAD=`eb62529` 실측 rc=0 (`94/10/56/28` 양측 일치).
- [ ] (Must, FR-02·FR-03) 위 §테스트 현황 (I2 자기 제외 전수) 명령 → rc=0 (`without-self-exclusion` = 0).
- [x] (Must, FR-05) 위 §테스트 현황 (I3 큐 하한의 방향) 명령 → rc=0 (`absolute-queue-floors` = 0). HEAD=`eb62529` 실측 rc=0.
- [x] (Must, FR-04) 위 §테스트 현황 (I4 무판정은 통과가 아니다) 명령 → rc=0 (`marked-satisfied` = 0). HEAD=`eb62529` 실측 rc=0.
- [ ] (Must, FR-07·FR-10) 위 §테스트 현황 (I5 판정면 유일성) 명령 → rc=0 (`name-counting-judgement-items` = 0). **blue 1 건 잔존 — green 승격이 선행 조건이다.**
- [x] (Must, 범위 제한) 물결·별표 축 효력면 게이트의 구현 · 개별 spec 의 문면 편집 · `RULE-06` 체크리스트 개정 · 판정면 이전의 수단 선택은 본 계약의 요구 대상이 아니다 — §역할 · §참고.

## 스코프 규칙

- **expansion**: 불허 — 판정 대상은 `specs/30.spec/{green,blue}/**` 의 판정 구획과 `scripts/check-spec-judgement-classification.sh` 로 한정한다.
- **grep-baseline**: HEAD=`eb62529` 실측 (격리 사본 `git clone --local`)
  - 인라인 (I3·I4) 산출 → `judgement-items=94 exec=10 static-declared=56 static-undeclared=28` · 채널 산출 → **동일**
  - 판정 항 순회 명령 → **5** · 자기 제외 없음 → **2**
  - 큐 훑는 판정 명령 → **19** · 절대수 큐 하한 → **0**
  - 마지막 측정이 `rc=2` 인 판정 항 → **12** · 그중 `[x]` → **0**
  - `markdown-blank-line-predicate` 이름 계수 판정 항 → green **0** / blue **1**
- **rationale**: 본 계약의 판정면은 spec 문서 자신과 그 발화 채널이다. 그 밖의 파일을 정상화 목적으로 바꿀 이유가 없으며, `src/**` 는 판정 대상이 아니다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 258차 tick (Phase 3, REQ-20260901-088 흡수) / — @ HEAD=`eb62529` | 최초 박제 — 판정 창·무판정·유일성 5 축 (I1~I5). **새 문서를 세운 것이 첫 판단**: req 는 흡수처를 inspector 판단에 남겼다. `gate-effective-surface-and-variant-battery` 는 이미 10 축 259 줄이고 세 방향을 더하면 300 줄 분할 임계에 닿는데, **분할은 green 증가 방향이라 `RULE-03 §Phase 1·2 예외` 에서 명시 제외**돼 있어 backpressure 를 통과해야 한다. 더 중요하게는 세 방향이 083·084 의 명제로 잡히지 않는 별 명제다 — 083 은 창의 *경계*, 084 는 토큰의 *상태*, 본 건은 창의 *자기 포함* · 무판정의 *지위* · 판정면의 *유일성* 이다. **적용은 소유 spec 이 지게 한 것이 둘째**: 본 tick 에 `gate-effective` (I3·I4)(I6)(I8) 의 자기 제외를 세 토큰 합집합으로 통일하고 `-ge 50` 절대 하한을 `-ge 1` 구조적 하한으로 바꿨으며 (I7 좁힘) 을 도출형으로 교체했다 — 그것들은 그 문서의 항이고 여기서는 일반 명제만 진다. **다섯 항 전건에 주입 왕복을 돌린 것이 셋째**이며 그 과정에서 **(I3)·(I4) 두 항이 처음에 과잉 특정이었다**: (I3) 은 `src` 비공허 하한이라는 정상 용법을 잡았고 (I4) 는 *"rc=2 → rc=0 회복"* 이력을 담은 정상 항을 잡았다. **정상 변형 쪽을 바꾸지 않고 게이트를 좁혔다** (`RULE-06 §음성 대조`) — 창을 `specs/30.spec/` 훑는 명령으로, 판정을 마지막 `rc=` 출현으로. | all |

## 참고

- 요구사항: `specs/60.done/2026/09/01/req/20260901-judgement-window-self-exclusion-and-no-judgement-is-not-pass.md` (REQ-20260901-088).
- 기존 계약 (확장 대상): `foundation/gate-effective-surface-and-variant-battery` (§테스트 현황 (I3·I4)(I6)(I7)(I8)).
- 발화 채널: `scripts/check-spec-judgement-classification.sh` (`09d6ee5`) · `package.json` `scripts.check:spec-classification`.
- 은퇴한 대리면: `common/markdown-blank-line-predicate` §참고 §(I5) 이름 채널 은퇴.

### 등급 보고 — 본 tick 에 고치지 못한 것 (blue · writer 영역 밖)

- **물결 축 arity 판정면은 검출력 0 이다.** `blue/common/markdown-tilde-strikethrough-space-flanking` 의 (I5) 는 등록의 **arity(3인자 형태 수)** 를 세는데, 뒤집히는 것은 **4번째 인자의 값**이다 — 재려던 성질과 재고 있는 성질이 다르다. `~~` 등록의 4번째 인자를 `false` 로 뒤집어도 깨끗함·주입·원복 세 상태의 rc 와 출력이 완전히 같다. **정정 경로**: 그 blue spec 을 green 으로 재개봉해 밑줄 축 (I9)(여는 쪽)·(I10)(닫는 쪽)과 같은 **동작 판정면**으로 교체하고, 종전 arity 항을 §참고 로 강등한다. 재개봉은 inspector 소관이며 본 tick 은 SEO 3 건과 본 건으로 단위가 찼다.
- **다만 제품은 무방비가 아니다.** 같은 주입에서 기존 파서 단언 10 건이 붉는다. 손상된 것은 제품이 아니라 **판정의 신뢰성**이며, 그래서 이 항목은 우선순위 1 이 아니라 2 다.
- **`blue/common/markdown-blank-line-predicate:66`** — (I5) 이름 계수 판정 항. 위 (I5) 가 rc=1 로 들고 있다.

### 규약 신호 (운영자 영역)

- **축별 비자명성 실측 요구.** *"이 축은 아무도 안 재고 있다"* 는 배경 서술이 축별로 검증되지 않은 채 일반화된 사례가 있었다 (밑줄 축은 실제로 미검출이었으나 물결 축은 기존 단언이 잡고 있었다). `RULE-06` planner 체크리스트에 축별 비자명성 실측을 요구하는 항이 들어갈 만하다. **규약 개정은 운영자 영역이므로 신호만 남긴다.**

### 미측정·비판정 항목

- **평가 실패 후보 계수 (FR-06)** — `markdown-blank-line-predicate` (I8) 은 후보 함수 본문을 재구성해 진리표로 분류하며, 본문이 바깥 상태를 참조하면 평가가 던지고 **그 후보는 조용히 탈락한다.** 현 트리의 술어는 순수해서 판정에 문제가 없고 오히려 그 탈락이 무관 헬퍼를 걸러 준다. 그러나 **클로저로 감싼 두 번째 술어는 이 게이트에 보이지 않는다.** 계수 도입은 그 게이트 파일 소관이며, 주입 재현은 **판정면 교체 task 의 DoD** 로 귀속된다 (`RULE-06 §게이트 실효 검증` — 이관처 없는 강등 금지).
- **대리면·효력면 공존 시 상충 부재 (FR-08)** — 정합적 개명을 실제로 주입해야 판정되는 `가정 주입 요구` 부류다. 검출 방향(*"두 판정면이 같은 입력에 반대 rc 를 내면 계약 위반"*)을 보존해 **(I5) 를 해소하는 task 의 DoD** 로 이관한다. 현 시점의 관측: 신 게이트 rc=0 · 종전 (I5) rc=1 · `tsc` rc=0.
- **저장소의 다른 spec DoD 에 `토큰 존재 ≥ N` 형태가 몇 건 더 있는지** — 방향 A(9 개)는 REQ-084 가 조사했고 **spec DoD 쪽 모집단은 미측정**이다.
- **(I2) 가 남긴 2 건** — `spec-judgement-command-evaluability` (I11)(I12) 는 판정 항을 순회하면서 자기 제외가 없다. 그 문서의 항이므로 정정도 그 문서 소관이며, 본 계약은 미해소를 rc=1 로 들고 있는다.
