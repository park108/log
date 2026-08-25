# spec 수용 기준의 판정 명령은 문면이 선언한 대상을 잰다

> **위치**: `specs/30.spec/{blue,green}/**` §수용 기준의 판정 명령. 판정 대상은 **명령 자체**이며 각 spec 이 재는 불변식이 아니다. HEAD=`d7b08dd` 스냅샷이며 **slug·항목 식별자 우선** (라인 번호 고정 금지).
> **관련 요구사항**: REQ-20260826-027
> **최종 업데이트**: 2026-08-26 (by inspector — tick 226 최초 등록)

## 역할

§수용 기준의 판정 명령은 **문면이 선언한 대상을 잰다.** 두 성질로 갈린다.

- **도달 가능성** — 미체크 Must 항목의 판정 명령은 `rc=0` 을 낼 수 있는 트리 상태가 **존재**해야 한다. 존재하지 않으면 그 항목은 어떤 착지로도 닫히지 않으며 promote 를 영구 차단한다.
- **대상 한정** — 명령은 문면이 지목한 것만 계수한다. 실행되지 않는 텍스트(주석)를 위반으로 세지 않고(위양성), 요구된 극성과 반대인 단언을 충족으로 세지 않는다(위음성).

핵심 명제 — **판정 명령의 결함은 계약의 미충족과 구별되지 않는다.** 명령이 `rc=1` 을 낼 때 그것이 "요구가 아직 안 착지했다" 인지 "명령이 다른 것을 재고 있다" 인지는 rc 만으로 갈리지 않는다. spec 이 실측 `rc=1` 을 박제해 두면 재실행 `rc=1` 은 **박제와 일치**하므로 정합으로 읽히고, 정합성 검사가 결함을 정합으로 확인해 준다.

의도적으로 하지 **않는** 것:
- (i) **각 spec 이 재는 불변식을 변경하지 않는다.** 교정 대상은 판정 **명령**이지 계약이 아니다. 교정이 계약 완화가 아님은 §수용 기준 (C-4) 의 전후 대조 수치로 보인다.
- (ii) **판정 명령의 구현 수단을 단일 지정하지 않는다** (`awk` 강제 등). 계약하는 것은 도달 가능성과 대상 한정이라는 **성질**이다.
- (iii) **도달 가능성의 일반 판정을 주장하지 않는다.** "이 명령이 `rc=0` 을 낼 수 있는 트리가 존재하는가" 는 일반적으로 기계 판정 불가다. 본 계약이 상시 검출하는 것은 **알려진 함정 부류의 열거**이며 전칭이 아니다 (§참고).
- (iv) **`rules/**` 를 개정하지 않는다.** `RULE-06 §정밀 패턴 권고` 확장은 `RULE-01` 상 operator 전용 표면이라 파이프라인 안에서 닫히지 않는다 (§참고).

## 공개 인터페이스

- 판정 명령은 **파일에서 추출해 실행**했을 때 문면이 박제한 산출을 재현한다. 손으로 옮겨 적은 형태가 아니라 **문면 그대로**가 계약 대상이다 — 옮겨 적으면 인용 단계가 줄어 결과가 뒤집힌다.
- 판정 명령은 `RULE-02 §금지` 의 실행 금지어를 포함하지 않는다. 포함하면 어떤 에이전트도 실행할 수 없고 `RULE-07 §promote 조건 2` 를 영구히 만족시킬 수 없다.
- 측정 모집단은 seam `ACC_SPEC_ROOT` 로 주입 가능하다 (기본 `specs/30.spec`). 저장소를 바꾸지 않고 자기 민감도를 검증하기 위함이다.
- 종료 코드 3분할: `0` 충족 / `1` 위반 / `2` 무판정(도출 공허).

## 동작

### (P-1) 도달 불가는 `sed` 주소 범위 재시작으로 생긴다

`sed -n` 의 두 주소 범위는 **끝 주소를 만난 뒤 시작 주소가 다시 나타나면 범위를 다시 연다.** 식별자가 선언부와 사용부 양쪽에 있으면 사용부에서 범위가 재시작해 무관한 영역이 산출에 흘러든다.

tick 226 실측 — `monitor-render-role-class-namespace-disjointness` (N-5): 시작 패턴이 `WebVitalsItem.jsx:9`(선언)와 `:205`(사용) 두 곳에 있어 `:205`~EOF 가 두 번째 범위로 열렸고, 그 안의 막대 span 3행이 **헤더 집합으로 계수**됐다. 결과는 착지 여부와 무관하게 `shared=3` `rc=1` 이었다 — **준수 트리와 위반 픽스처가 둘 다 `rc=1`** 로 판정력이 0 이었다.

단발 범위(`awk` + `exit`)는 이 성질을 **구조적으로** 배제한다. 시작 패턴이 몇 번 더 등장해도 재시작이 없다.

### (P-2) 도달 불가는 ERE 중간의 맨 `$` 로도 생긴다

ERE 에서 `$` 는 행끝 앵커다. 겹따옴표 안의 `\$` 는 셸 단계에서 소비돼 grep 에는 **맨 `$`** 가 전달되고, 앵커 뒤에 문자가 이어지는 패턴은 **어떤 입력으로도 매치되지 않는다.**

tick 226 실측 — `derived-population-totality-judgement` (T-4): 앵커판 `0 hit` / 앵커까지만 자른 형태도 `0 hit` / `[$]` 문자 클래스판만 대상 행 1 hit. 스크립트의 판정문이 이미 상향돼 있는데도 `rc=1` 이었다.

**POSIX 는 ERE 중간 `$` 의 동작을 정의하지 않는다** — 구현에 따라 앵커이거나 리터럴이다. 그런 표기는 쓰지 않는다 (§수용 기준 NFR 축).

### (P-3) 대상 이탈은 양방향이며 위음성 쪽이 조용하다

| 방향 | 형태 | 관측 |
|---|---|---|
| 위양성 | 주석을 실행 코드로 계수 | 코드에 위반 0건인데 *제거된 함정을 설명하는 주석* 한 줄이 유일 hit |
| 위음성 | 부정형 단언을 존재로 계수 | `.not.toHaveAttribute(X)` 가 `toHaveAttribute(X)` 를 부분 문자열로 포함 |

위양성은 붉어지므로 즉시 드러나지만 **부작용의 방향이 나쁘다** — 없앤 함정을 설명하는 주석을 쓸 수 없게 되고, 그것은 회귀 재발 시 다음 사람이 맥락을 잃는 방향이다.

위음성은 **겨냥한 회귀만 구조적으로 못 본다.** 준수 트리에서 교정 전후 산출이 **완전히 동일**하므로 dry-run·Phase 1 재실행·developer 검증을 전부 `rc=0` 으로 통과한다 (`RULE-06 §게이트 실효 검증` 이 기술한 민감도 0 게이트와 같은 형상).

### (P-4) 세 채널이 구조적으로 통과시킨다

- **`scripts/check-acceptance-criteria.sh`** 의 미래형 낱말 검사는 **낱말**만 본다. 도달 불가 명령의 문면에는 그 낱말이 없다.
- **`RULE-07 §체크박스 부적격 부류`** 4부류(미래 사건 대기 · 가정 주입 요구 · 미측정 NFR · 자명 명제)에 **"도달 불가능한 판정 명령"이 없다.**
- **inspector Phase 1 `reconcile`** — 재실행 `rc=1` 이 spec 박제 `rc=1` 과 일치하므로 **정합으로 읽힌다.** ack 하지 않는 것이 정상 동작이 된다.

**방어 대상 (`RULE-07 §주제 우선순위` 축 2)** — 위 셋 어디에서도 붉어지지 않으므로 이 부류는 silent regression 이다. 실현된 비용: green 6건 중 **2건**이 도달 불가 Must 를 보유해 promote 가 영구 차단됐고, 두 spec 의 실제 요구는 이미 착지해 있었다.

### (P-5) 자기참조·자기 파일 hit 를 명령이 스스로 피해야 한다

본 계약의 판정 명령은 `specs/30.spec` 트리를 훑으므로 **자기 문서도 모집단에 든다.** 함정 부류를 산문으로 설명하면 그 산문이 자기 hit 이 되어 어떤 시정으로도 0 에 도달할 수 없는 **자기봉쇄** 기준이 된다 — tick 226 최초 측정에서 실제로 발생했고(`range-restart=1` 의 유일 hit 이 본 계약의 설명 문장이었다), 두 수단으로 끊었다.

1. **모집단을 산문이 아니라 판정 명령으로 한정한다** — 코드 펜스 내용과, 허용 접두(`bash -c` · `npx` · `npm run` · `awk` · `test` · `grep -`)로 시작하는 인라인 코드 스팬만 계수한다. 함정을 **설명**하는 산문은 모집단 밖이다.
2. **검출 토큰을 명령 안에서 조립한다** — 실행 금지어를 리터럴로 담으면 명령 자신이 hit 이 된다. `printf` 분할 연결로 조립해 문면에 리터럴이 남지 않게 한다 (slug `foundation/spec-reference-coherence` (G-3) 이 tick 221 에 쓴 것과 같은 수단).

## 의존성

- 대상: `specs/30.spec/{blue,green}/**` (writer = inspector(green) · planner(승격 mv)). **blue 직접 편집 writer 는 없다.**
- 교정 대상 4건: slug `components/monitor-render-role-class-namespace-disjointness` (N-5)(N-6) · slug `testing/derived-population-totality-judgement` (T-4) · slug `foundation/auth-entry-failure-user-observable-surface` (S-2).
- 인접 계약 (보완, 중복 아님): slug `testing/spec-claim-measurement-surface-agreement` — 그 (S-4) 는 **본문 실측 인용의 재현 가능성**을 요구하는데 도달 불가 명령은 그 요구를 **충족한다** (인용된 `rc=1` 이 그대로 재현된다). **재현 가능한 `rc=1` 과 도달 가능한 `rc=0` 은 다른 성질이다.**
- 인접 계약: slug `foundation/spec-reference-coherence` — `:21` 이 blue 결함의 유일 처리 흐름(`10.followups → discovery → 20.req → 새 green 판본 → 승격 mv`)을 명시한다. 본 계약의 (S-2) 교정이 그 경로를 탔다.

## 발화 채널

- **inspector Phase 1 `reconcile`** — 본 계약의 §수용 기준 명령이 매 tick 재실행된다. 현재 이 축의 **유일한 상시 채널**이다.
- **`package.json scripts.check:acceptance-criteria`** — 실재하는 채널이나 현재 미래형 낱말 축만 본다. 함정 부류 검출의 부착은 (C-5) 가 요구하며 **미착지**다.

**한계를 명시한다** — (C-5) 착지 전까지 이 계약은 `npm test` · `check:*` · husky · CI 어디에서도 붉어지지 않는다. 그 사실이 곧 §동작 (P-4) 가 기술한 상태이며, 계약이 자기 자신의 발화 공백을 감추지 않기 위해 여기 박제한다.

## 테스트 현황

- [x] 판정 명령 모집단 도출 — tick 226 실측 `judgement-commands=306` (`specs/30.spec` 전역, **본 spec 자신의 3건 포함**).
- [x] 주소 범위 재시작 0 — tick 226 교정 후 `range-restart=0`. 교정 전 동일 트리 `1`.
- [x] 실행 금지어 0 — tick 226 교정 후 `unexecutable-verb=0`. 교정 전 동일 트리 `1`.
- [x] 교정 4건 도달 가능 — tick 226 `repaired-reachable=4/4`. 교정 전 동일 트리 `2/4`.
- [ ] 함정 부류 재발 채널 — HEAD 부재. (C-5) 의 부착 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (`RULE-07 §수용 기준 문장 규약`). 명령은 `specs/30.spec` 트리를 **루트로** 훑으며 **자신을 포함한 어떤 spec 의 경로 리터럴도 참조하지 않는다** — 따라서 승격으로 경로가 바뀌어도 깨지지 않는다 (`§promote 조건 2`). 대상 spec 은 **slug 로 해석**하며 green 우선·없으면 blue 다. **HEAD=`d7b08dd` (tick 226) 기준 4/5.**

- [x] (Must, C-1) 판정 명령에 주소 범위 재시작 형태가 없다 — 판정:
  ```
  cmds=$(for f in $(find "${ACC_SPEC_ROOT:-specs/30.spec}" -name "*.md" | sort); do awk 'BEGIN{B=sprintf("%c",96);F=B B B;RE=B "[^" B "]+" B} /^## /{s=($0 ~ /수용 기준/)} !s{next} {t=$0; sub(/^[[:space:]]+/,"",t)} index(t,F)==1{fc=!fc; next} fc{print FILENAME":"FNR":"$0; next} {l=$0; while (match(l,RE)) {c=substr(l,RSTART+1,RLENGTH-2); if (c ~ /^(bash -c|npx |npm run |awk |test |grep -)/) print FILENAME":"FNR":"c; l=substr(l,RSTART+RLENGTH)}}' "$f"; done); n=$(printf '%s\n' "$cmds" | grep -c .); [ "$n" -ge 100 ] || { echo "derive=$n vacuous" >&2; exit 2; }; h=$(printf '%s\n' "$cmds" | grep -E 'sed -n .{0,3}/[^/]*/,/[^/]*/p'); k=$(printf '%s' "$h" | grep -c .); echo "judgement-commands=$n range-restart=$k"; [ -n "$h" ] && printf '%s\n' "$h" >&2; [ "$k" -eq 0 ]
  ```
  → **rc=0**. **HEAD=`d7b08dd` (tick 226) 실측 rc=0 / `judgement-commands=306 range-restart=0` → 충족.** **동일 트리 교정 전 실측 rc=1 / `judgement-commands=294 range-restart=1`** (seam `ACC_SPEC_ROOT` 로 tick 226 이전 spec 판본을 주입) — 유일 hit 이 (N-5) 의 판정 명령이었다. **공허 통과 가드 내장** — 도출이 100 미만이면 `exit 2` 로, 추출기가 낡아 모집단이 비는 상태를 충족으로 읽지 않는다. **모집단이 산문이 아니라 명령으로 한정된다** (§동작 (P-5)) — 함정을 설명하는 문장은 계수되지 않는다.
- [x] (Must, C-2) 판정 명령에 실행 금지어가 없다 — 판정:
  ```
  cmds=$(for f in $(find "${ACC_SPEC_ROOT:-specs/30.spec}" -name "*.md" | sort); do awk 'BEGIN{B=sprintf("%c",96);F=B B B;RE=B "[^" B "]+" B} /^## /{s=($0 ~ /수용 기준/)} !s{next} {t=$0; sub(/^[[:space:]]+/,"",t)} index(t,F)==1{fc=!fc; next} fc{print FILENAME":"FNR":"$0; next} {l=$0; while (match(l,RE)) {c=substr(l,RSTART+1,RLENGTH-2); if (c ~ /^(bash -c|npx |npm run |awk |test |grep -)/) print FILENAME":"FNR":"c; l=substr(l,RSTART+RLENGTH)}}' "$f"; done); n=$(printf '%s\n' "$cmds" | grep -c .); [ "$n" -ge 100 ] || { echo "derive=$n vacuous" >&2; exit 2; }; V="$(printf 'r''m -rf')|$(printf 'git re''set --hard')|$(printf 'git cl''ean -f')|$(printf -- '--no-''verify')|$(printf 'git pu''sh --force')"; h=$(printf '%s\n' "$cmds" | grep -E "$V"); k=$(printf '%s' "$h" | grep -c .); echo "judgement-commands=$n unexecutable-verb=$k"; [ -n "$h" ] && printf '%s\n' "$h" >&2; [ "$k" -eq 0 ]
  ```
  → **rc=0**. **HEAD=`d7b08dd` (tick 226) 실측 rc=0 / `judgement-commands=306 unexecutable-verb=0` → 충족.** **동일 트리 교정 전 실측 rc=1 / `unexecutable-verb=1`** — hit 은 slug `foundation/measurement-tree-attribution` (M-9) 의 판정 명령이었고, 그 명령은 `RULE-02 §금지` 어를 포함해 **inspector 도 planner 도 실행할 수 없었다.** 실행할 수 없는 명령은 `RULE-07 §promote 조건 2`("측정 명령을 실제로 실행한다")를 영구히 만족시킬 수 없으므로, 이 부류는 도달 불가와 **같은 결과**를 낳는다. **검출 토큰을 `printf` 분할로 조립하는 것이 요점** — 리터럴로 담으면 이 명령 자신이 유일 hit 이 되어 자기봉쇄가 된다 (§동작 (P-5)).
- [x] (Must, C-3) 교정된 판정 명령이 도달 가능하다 — 대상을 **slug 로 해석**해 문면 명령을 **추출 실행**한다. 판정:
  ```
  ok=0; bad=0; for e in "components/monitor-render-role-class-namespace-disjointness:N-5" "components/monitor-render-role-class-namespace-disjointness:N-6" "testing/derived-population-totality-judgement:T-4" "foundation/auth-entry-failure-user-observable-surface:S-2"; do slug=${e%:*}; lab=${e##*:}; f=""; for r in green blue; do if [ -f "${ACC_SPEC_ROOT:-specs/30.spec}/$r/$slug.md" ]; then f="${ACC_SPEC_ROOT:-specs/30.spec}/$r/$slug.md"; break; fi; done; if [ -z "$f" ]; then echo "slug 미해석: $slug" >&2; bad=$((bad+1)); continue; fi; cmd=$(awk -v L="$lab" 'BEGIN{B=sprintf("%c",96);F=B B B;RE=B "[^" B "]+" B} !hit && $0 ~ ("^- \\[[ x]\\] \\((Must|Should)[^)]*, " L "\\)") {hit=1; l=$0; while (match(l,RE)) {c=substr(l,RSTART+1,RLENGTH-2); if (c ~ /^(bash -c|npx |npm run |awk |test |grep -)/) {print c; exit} l=substr(l,RSTART+RLENGTH)} next} hit {t=$0; sub(/^[[:space:]]+/,"",t); if (index(t,F)==1) {if (fc) exit; fc=1; next} if (fc) print t}' "$f"); if [ -z "$cmd" ]; then echo "판정 명령 추출 0: $slug ($lab)" >&2; bad=$((bad+1)); continue; fi; out=$(printf '%s\n' "$cmd" | bash 2>&1); rc=$?; if [ "$rc" -eq 0 ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "UNREACHABLE $slug ($lab) rc=$rc :: $(printf '%s' "$out" | head -1)" >&2; fi; done; echo "repaired-reachable=$ok/4 failed=$bad"; [ "$ok" -eq 4 ]
  ```
  → **rc=0**. **HEAD=`d7b08dd` (tick 226) 실측 rc=0 / `repaired-reachable=4/4` → 충족.** **동일 트리 교정 전 실측 rc=1 / `repaired-reachable=2/4`** — (N-5) `header=4 bar=3 shared=3` rc=1 · (T-4) rc=1 이 도달 불가였다. **경로 리터럴이 아니라 slug 해석인 이유** — 라인 번호 고정은 편집으로 즉시 낡고, 경로 고정은 **승격 `mv` 로 깨진다.** green 우선 해석은 파이프라인 의미론(`green` 이 최신 판본)과 일치하며, 승격 후에는 blue 판본이 교정판이므로 산출이 불변이다. **추출 실행이 요점** — 손으로 옮겨 적으면 인용 단계가 줄어 결과가 뒤집힌다 (§동작 (P-2) 의 오진이 정확히 그렇게 발생했다).
- [x] (Must, C-4) 교정이 계약을 완화하지 않았다 — 교정 전후 판정식이 **준수 트리에서 같은 산출**을 낸다. 판정: slug `foundation/auth-entry-failure-user-observable-surface` (S-2) 의 교정 전후 두 판정식을 같은 트리에서 실행해 산출 문자열이 일치한다. **HEAD=`d7b08dd` (tick 226) 실측 — 교정 전 `failure-cases=3 unobserved=0` rc=0 · 교정 후 `failure-cases=3 unobserved=0` rc=0 으로 **동일** → 충족.** 실패 갈래 단언을 부재형으로 치환한 픽스처에서만 갈린다 (교정 전 `unobserved=0` rc=0 **검출 실패** / 교정 후 `unobserved=3` rc=1 **검출**). **즉 민감도를 얻으면서 특이도를 잃지 않았다** — 이것이 "측정을 바로잡았고 계약을 완화하지 않았다" 의 수치적 의미다. 본 항목은 tick 226 이 두 판정식을 spec 파일에서 각각 추출해 나란히 실행한 결과이며, 픽스처 방향은 '가정 주입 요구' 부류라 §참고로 이관한다.
- [ ] (Should, C-5) 함정 부류 재발 채널 — `check:acceptance-criteria` 가 (C-1)(C-2) 의 검출을 수행하고 그 수치를 **비공허 하한과 함께** 낸다. 판정: `bash -c 'out=$(npm run --silent check:acceptance-criteria 2>&1); echo "$out"; echo "$out" | grep -qE "judgement-commands=[0-9]+" && echo "$out" | grep -qE "range-restart=[0-9]+"'` → **rc=0**. **HEAD=`d7b08dd` (tick 226) 실측 rc=1 (해당 산출 부재) → 미충족.** 착지 전까지 이 축의 상시 채널은 inspector Phase 1 뿐이다 (§발화 채널). **검출 부류는 열거이며 전칭을 주장하지 않는다** (§역할 (iii)).

## 참고

### 게이트 실효 검증 이관 (RULE-07 §처리 · RULE-06 §게이트 실효 검증)

아래는 **'가정 주입 요구' 부류**라 체크박스로 두지 않으며, 검출 방향을 보존한 채 **(C-5) 수리 task 의 `## 검증/DoD`** 로 이관한다. developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다. **이관처 task 가 발행되기 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

- **(Dir-1) 범위 재시작 민감도** — 임의 spec 의 §수용 기준 판정 명령에 주소 범위 형태를 1건 주입 → (C-1) `rc≠0` 이며 **파일:라인이 stderr 에 열거**된다 → 원복 → `rc=0`.
- **(Dir-2) 산문 면역 (특이도)** — 같은 형태를 §수용 기준의 **산문**(코드 펜스 밖 · 허용 접두 없는 인라인 스팬)에 넣으면 (C-1) 이 `rc=0` 을 유지한다. **이 방향이 없으면 (Dir-1) 만으로는 §동작 (P-3) 의 위양성 재발을 구별하지 못한다.**
- **(Dir-3) 실행 금지어 민감도** — 판정 명령에 `RULE-02 §금지` 어 1건 주입 → (C-2) `rc≠0` → 원복 → `rc=0`. **주입은 문자열 삽입이며 실행하지 않는다.**
- **(Dir-4) 자기 hit 회귀** — (C-2) 의 검출 토큰을 조립이 아닌 **리터럴**로 되돌리면 명령 자신이 hit 이 되어 `rc≠0` 이 된다. 자기봉쇄가 재발했음을 이 방향이 드러낸다.
- **(Dir-5) 모집단 seam** — `ACC_SPEC_ROOT` 를 빈 디렉터리로 주입 → `rc=2`(무판정)이며 위반의 `rc=1` 과 **구분**된다 → 원복.
- **(Dir-6) 극성 구별 민감도** — 실패 갈래 케이스의 양성 단언을 부재형으로 치환 → (S-2) 교정판 `rc≠0` → 원복 → `rc=0`. 교정 전 판정식은 같은 픽스처에서 `rc=0` 이다.

### 미실현 잠재 지점 (선제 개편하지 않음 — 관측만 박제)

현 HEAD 실측 오탐 0건이고 실패 방향이 안전한 쪽이라 수리 대상에 넣지 않는다.

- **게이트 seam 커버리지의 비재귀 glob** — 픽스처가 기본 모집단 밖이다. 재귀로 바꾸면 의도적으로 seam 없는 픽스처가 실 모집단에 들어와 붉어진다. 그 변경은 pre-commit 발화 경로에 걸려 **커밋 시점에 즉시 드러나므로 조용한 사각이 아니다.**
- **a11y 감사 `carriers` 의 내용 기반 도출** — `role="button"` 문자열 보유로 판정하므로 CSS 속성 선택자·주석·문자열 리터럴이 carrier 로 계수될 수 있다. 현 실측 13건 전량이 실제 JSX 속성이다. 확장자를 열거하면 오탐은 사라지나 **모집단과 도출이 같은 목록을 공유해 대조가 공허해지므로** 내용 기반은 의도된 선택이다.

### 미측정·비판정 항목

- **(operator 귀속) `RULE-06 §정밀 패턴 권고` 확장.** "`sed` 주소 범위 재시작" · "겹따옴표 안 변수 참조는 빈 문자열로 확장돼 패턴 꼬리가 잘린다" 두 항의 추가는 `rules/**` 편집이며 `RULE-01` 상 **operator 전용**이다. 본 계약은 같은 내용을 §동작 (P-1)(P-2) 에 박제하는 데서 멈춘다.
- **(미측정) 도달 가능성의 일반 판정.** 일반적으로 기계 판정 불가다. (C-1)(C-2) 가 겨누는 것은 **알려진 함정 부류의 열거 검출**이며 전칭 판정이 아니다 — 이 한계를 감추지 않는다.
- **(미측정) 허용 접두 목록의 완전성.** 판정 명령 추출은 `bash -c` · `npx` · `npm run` · `awk` · `test` · `grep -` 로 시작하는 스팬과 코드 펜스를 모집단으로 삼는다. 다른 접두로 시작하는 판정 명령이 신설되면 모집단 밖이 된다. 접두를 넓히면 산문 인용이 딸려 들어와 (Dir-2) 특이도를 잃으므로 **의도된 절충**이며, 도출 수(`judgement-commands=`)를 매 실행 발화해 모집단 급감이 관측되게 했다.
- **(중복 게이트 — 체크박스 제외) `npm test` · `check:*` 전수 rc=0.** 위반 시 husky·CI 가 즉시 실패하므로 `RULE-07 §반려 시그널` 의 중복 게이트 부류다. 전제로만 남긴다.
- **(별 축) 측정 트리 귀속 래퍼의 채택.** 채택 후보가 전부 에이전트 절차 지점이라 수리 표면이 `rules/**` · `.claude/agents/**` 이며 operator 전용이다. 소유 spec 이 §역할에서 같은 이유로 그 축을 명시 제외한다.

### 관련

- **REQ 원문**: REQ-20260826-027 (slug `acceptance-command-measures-declared-subject`).
- 소비한 followup (req 가 10건 처리): 채택 4 (`0040-monitor-n5-judgement-range-restart` · `0100-t4-judgement-ere-anchor` · `0040-n6-gate-comment-false-positive` · `0300-auth-entry-s2-negation-blindness`) · 병합 2 · 기각 4.
- 교정 산출 커밋: TSK-20260826-34 `627d8e6` · TSK-20260826-35 `f73dfbd` (요구 착지분).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-26 | REQ-20260826-027 (inspector tick 226) | 최초 등록. **req 수용 기준 9항을 그대로 쓰지 않았다.** (a) req 의 A-1·A-3·A-6 은 개별 spec 의 **경로 리터럴**을 명령에 담아 `RULE-07 §promote 조건 2` 에 저촉했고 승격 `mv` 로 깨진다 — **slug 해석**(green 우선·없으면 blue)으로 재작성해 (C-3) 하나로 묶었다. (b) req 의 A-2 는 **라인 번호 고정**(`sed -n "72,77p"`)이라 편집으로 즉시 낡는다 — req 자신이 그 위험을 경고했으므로 트리 전역 스캔으로 일반화했다. (c) req 의 A-4·A-5 는 개별 픽스처 주입 요구라 **'가정 주입 요구' 부류**이므로 체크박스에서 내리고 (Dir-1)~(Dir-6) 으로 이관했다. (d) req 의 A-9(회귀 없음)는 **중복 게이트 부류**라 §참고 전제로 강등했다. (e) **(C-2) 신규 추가** (req 에 없던 항목) — tick 226 이 (M-9) 에서 **판정 명령 본문에 `RULE-02` 실행 금지어가 들어 있어 어떤 에이전트도 실행할 수 없는** 사례를 발견했다. 이는 req 가 열거한 두 방향과 다른 제3의 도달 불가 기전이며, 결과(promote 영구 차단)는 같다. (f) **§동작 (P-5) 신규** — 최초 측정에서 본 계약의 **설명 산문이 자기 hit** 이 되어 자기봉쇄가 실제로 발생했다. 모집단을 판정 명령으로 한정하고 검출 토큰을 조립하는 두 수단으로 끊었고, 그 사실을 감추지 않고 박제했다. **전 판정 명령은 spec 파일에서 재추출해 실행 검증했으며, 교정 전후를 seam `ACC_SPEC_ROOT` 로 **같은 트리에서** 나란히 측정했다 (req NFR-03). | all |
