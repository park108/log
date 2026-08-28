#!/usr/bin/env bash
# check-acceptance-criteria.sh
# Spec: specs/30.spec/blue/** + .claude/rules/RULE-07-SPEC-CONTENT.md
#       §수용 기준 문장 규약 + §promote 조건
#
# 두 가지를 본다.
#
#  G-1  blue 의 체크박스형 [deferred] == 0
#       [deferred] 는 green 전용 상태다. blue 는 baseline 이므로 미결 태그를 갖지 않는다.
#
#  G-2  §수용 기준의 **미체크** 체크박스에 미래형 문장 == 0
#       [x] 로 이미 충족된 줄의 "누적/대기" 는 역사 서술이지 미결이 아니다.
#       병리는 미체크 상태로 영구히 남는 것이므로 `- [ ]` 로 한정한다.
#       "차기 이벤트 후", "누적 ≥N건" 류는 어느 시점에도 [x] 가 될 수 없다.
#       그런 문장이 (Must) 로 붙어 있으면 promote 조건이 영구 미충족이 된다 —
#       2026-08-24 이전 unchecked 213건 중 약 2/3 가 이 부류였고, 그것이
#       promote 0 chain 13 / carve 0 chain 122 의 직접 원인이었다.
#
#  G-3  §수용 기준 판정 명령에 sed 주소 범위 재시작 형태 == 0
#       sed -n 의 두 주소 범위는 끝 주소를 만난 뒤 시작 주소가 다시 나타나면
#       범위를 다시 연다. 식별자가 선언부와 사용부 양쪽에 있으면 사용부에서
#       범위가 재시작해 무관한 영역이 산출에 흘러들고, 그 명령은 준수 트리와
#       위반 픽스처에서 똑같이 rc=1 을 내 판정력이 0 이 된다.
#
#  G-4  §수용 기준 판정 명령에 RULE-02 §금지 의 실행 금지어 == 0
#       금지어가 든 명령은 어떤 에이전트도 실행할 수 없으므로
#       RULE-07 §promote 조건 2 를 영구히 만족시킬 수 없다 — 결과는 도달 불가와 같다.
#
#  G-5  §수용 기준에서 **판정을 선언한** 항목 전수가 판정 명령 도출에 귀속 == 항목수
#       도출이 좁아 겨눈 표면의 일부를 애초에 보지 않는 상태를 rc=0 으로 덮지 않는다.
#       judgement-commands= 는 단조 비감소라 누락이 생겨도 줄지 않고, DERIVE_MIN 은
#       현 도출 기준 4분의 1 붕괴까지 침묵한다 — 민감도 0 형상이 판정 층이 아니라
#       **모집단 층**에서 재현되는 자리다.
#
# G-3·G-4 의 모집단은 **판정 명령**이지 산문이 아니다. 함정 부류를 설명하는
# 문장이 hit 이 되면 어떤 시정으로도 0 에 도달하지 못하는 자기봉쇄 기준이 된다
# (spec §동작 (P-5) 에 실제 발생 기록). 같은 이유로 G-4 의 검출 토큰은
# 리터럴이 아니라 printf 분할 연결로 **조립**한다 — 리터럴로 담으면 장래 이
# 스크립트가 스캔 대상에 들어갈 때 자기 hit 이 된다.
#
# 모집단 seam: ACC_SPEC_ROOT (기본 specs/30.spec). 저장소를 바꾸지 않고
# 자기 민감도를 검증하기 위한 주입점이다 (spec §공개 인터페이스).
#
# 판정 스코프 (RULE-01 writer 매트릭스 정합):
#   specs/30.spec/green/**  writer=inspector  -> rc 집행 (hard-fail 유지)
#   specs/30.spec/blue/**   writer 부재        -> ADVISORY 계수·열거만 (rc 무영향)
#
# blue 가 ADVISORY 인 이유 (게으른 미완성이 아니다 — 올리지 말 것):
#   RULE-01 writer 매트릭스상 blue 트리에는 create/edit writer 가 없다. inspector 는
#   green 만, planner 는 mv 만, developer 는 src/·scripts/ 만 쓴다. 즉 blue 본문에
#   귀속된 위반을 고칠 권한을 가진 에이전트가 파이프라인 안에 존재하지 않는다. 본
#   스크립트는 .github/workflows/ci.yml 의 step 이므로 blue 를 hard-fail 로 두면
#   rc≠0 을 0 으로 되돌릴 주체 없이 CI 가 영구 red 로 고착된다.
#
#   blue 귀속 미충족의 정상 처리 경로:
#     10.followups -> discovery -> 20.req -> inspector 의 새 green 판본 -> 승격 mv
#   blue 축 집행은 규약 변경(운영자 영역)이 선행 조건이다. 그 결정 전까지 본 게이트는
#   숫자를 숨기지 않고 매 실행마다 건수·항목·스캔 모집단 수를 출력한다 — ADVISORY 는
#   침묵이 아니며, blue 를 모집단에서 빼는 것은 이 계약의 위반이다(검출력 소멸).
#
# exit 0: 전 게이트 PASS (ack stdout)
# exit 1: 위반 (stderr 상세 후 fail-fast)
# exit 2: 무판정 — 판정 명령 도출이 공허(<100). 충족으로 읽지 않는다.
# exit 3: 항목 도출 추출 실패 — 무판정(2)과 구별한다. 빈 추출이 declared=0 으로
#         새어 무판정처럼 보이는 경로를 막는다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

BLUE="specs/30.spec/blue"
GREEN="specs/30.spec/green"

# 모집단 seam — G-3·G-4 는 이 루트를 따른다 (spec §공개 인터페이스).
ACC_ROOT="${ACC_SPEC_ROOT:-specs/30.spec}"

# 도출 비공허 하한. 추출기가 낡아 모집단이 비는 상태를 충족으로 읽지 않는다.
DERIVE_MIN=100

# 축 분리 — green 귀속만 rc 에 반영한다 (spec §동작 (A-4)(A-6)).
# blue 축이 green 축을 이완시키지 않는다: 두 변수는 서로를 참조하지 않는다.
green_violations=0
blue_advisory=0
blue_advisory_hits=""

# 모집단 비삭감 수치 (spec §동작 (A-8)). **위반 계수가 아니라 스캔 문서 수**다.
# 위반이 0 으로 떨어져도 이 값은 떨어지지 않으므로 "blue 를 모집단에서 뺐다" 와
# 구별된다.
blue_scanned="$(find "$BLUE" -name '*.md' -type f 2>/dev/null | wc -l | tr -d '[:space:]')"
green_scanned="$(find "$GREEN" -name '*.md' -type f 2>/dev/null | wc -l | tr -d '[:space:]')"

printf 'check-acceptance-criteria: blue-scanned=%s green-scanned=%s (blue 축 ADVISORY / green 축 rc 집행)\n' \
  "$blue_scanned" "$green_scanned"

# ADVISORY 발화는 실행 라인이 진다 (spec §동작 (A-5)) — 주석의 ADVISORY 는 아무것도
# 출력하지 않는다. 종료 경로 0/1/2 전부에서 호출해 계수와 목록을 낸다.
emit_advisory() {
  printf 'check-acceptance-criteria: ADVISORY blue 귀속 미충족 %s건 / blue-scanned=%s (rc 미반영)\n' \
    "$blue_advisory" "$blue_scanned"
  if [ "$blue_advisory" -ne 0 ]; then
    printf '%s' "$blue_advisory_hits" | head -20
    printf '  처리 경로: 10.followups -> discovery -> 20.req -> 새 green 판본 -> 승격 mv\n'
  fi
}

# ── G-1: blue 에 체크박스형 [deferred] 잔존 — 스캔 루트가 blue 이므로 전량
#        blue 귀속이다. 계수·열거만 하고 rc 에 반영하지 않는다.
g1_hits="$(grep -rnE '^[[:space:]]*-[[:space:]]*\[[ x]\].*\[deferred' "$BLUE" --include='*.md' 2>/dev/null || true)"
g1_count="$(printf '%s' "$g1_hits" | grep -c . || true)"

if [ "$g1_count" -ne 0 ]; then
  blue_advisory=$((blue_advisory + g1_count))
  blue_advisory_hits="${blue_advisory_hits}$(printf '%s\n' "$g1_hits" | sed 's/^/  [G-1 blue deferred] /')
"
fi

# ── G-2: §수용 기준 체크박스의 미래형 문장 ─────────────────────────────────
# awk 로 §수용 기준 ~ 다음 `## ` 헤더 구간만 잘라 체크박스 라인을 검사한다.
# 판정 불가 키워드는 RULE-07 §체크박스 부적격 부류에서 가져온다.
future_re='차기|누적|대기|이벤트 후|발생 시|별 carve|추후|향후'
g2_green_hits=""
g2_blue_hits=""

for f in $(find "$GREEN" "$BLUE" -name '*.md' -type f 2>/dev/null | sort); do
  hits="$(awk '
    /^## 수용 기준/        { inblock = 1; next }
    /^## /                 { inblock = 0 }
    inblock && /^[[:space:]]*-[[:space:]]*\[ \]/ { printf "%d\t%s\n", NR, $0 }
  ' "$f" | grep -E "$future_re" || true)"

  if [ -n "$hits" ]; then
    # 귀속은 hit 이 난 **파일의 위치**로 가른다 — 수리 주체는 문서를 쓴 쪽이다.
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      case "$f" in
        */30.spec/blue/*)
          g2_blue_hits="${g2_blue_hits}${f}:${line}
"
          ;;
        *)
          g2_green_hits="${g2_green_hits}${f}:${line}
"
          ;;
      esac
    done <<EOF
$hits
EOF
  fi
done

g2_green_count="$(printf '%s' "$g2_green_hits" | grep -c . || true)"
g2_blue_count="$(printf '%s' "$g2_blue_hits" | grep -c . || true)"

if [ "$g2_blue_count" -ne 0 ]; then
  blue_advisory=$((blue_advisory + g2_blue_count))
  blue_advisory_hits="${blue_advisory_hits}$(printf '%s' "$g2_blue_hits" | sed 's/^/  [G-2 blue 미래형] /')
"
fi

if [ "$g2_green_count" -ne 0 ]; then
  printf 'G-2 VIOLATION: §수용 기준 미체크 항목에 판정 불가(미래형) 문장 %s건 (green 귀속 · 기대 0)\n' "$g2_green_count" >&2
  printf '%s' "$g2_green_hits" | head -10 >&2
  printf 'Hint: 이 부류는 ## 참고 §미측정·비판정 항목 으로 강등한다 (RULE-07 §수용 기준 문장 규약).\n' >&2
  green_violations=1
fi

if [ "$green_violations" -ne 0 ]; then
  emit_advisory
  printf 'check-acceptance-criteria: FAIL (green 귀속 위반 — blue 축은 rc 에 반영되지 않는다)\n' >&2
  exit 1
fi

# ── 판정 명령 모집단 도출 ───────────────────────────────────────────────────
# 추출기 문면은 spec §수용 기준 (C-1)(C-2) 에서 **추출해 옮겼다**. 손으로 다시
# 치면 인용 단계가 줄어 결과가 뒤집힌다 (spec §공개 인터페이스).
#   - 코드 펜스 내용 전체
#   - 허용 접두(bash -c · npx · npm run · awk · test · grep -)로 시작하는 인라인 스팬
# 그 밖의 산문은 모집단 밖이다.
cmds="$(for f in $(find "$ACC_ROOT" -name '*.md' | sort); do awk 'BEGIN{B=sprintf("%c",96);F=B B B;RE=B "[^" B "]+" B} /^## /{s=($0 ~ /수용 기준/)} !s{next} {t=$0; sub(/^[[:space:]]+/,"",t)} index(t,F)==1{fc=!fc; next} fc{print FILENAME":"FNR":"$0; next} {l=$0; while (match(l,RE)) {c=substr(l,RSTART+1,RLENGTH-2); if (c ~ /^(bash -c|npx |npm run |awk |test |grep -)/) print FILENAME":"FNR":"c; l=substr(l,RSTART+RLENGTH)}}' "$f"; done)"
derived="$(printf '%s\n' "$cmds" | grep -c . || true)"

if [ "$derived" -lt "$DERIVE_MIN" ]; then
  printf 'check-acceptance-criteria: derive=%s < %s vacuous (root=%s) — 무판정\n' \
    "$derived" "$DERIVE_MIN" "$ACC_ROOT" >&2
  printf 'Hint: 추출기가 낡았거나 모집단이 비었다. 공허 통과로 읽지 않는다.\n' >&2
  emit_advisory
  exit 2
fi

# ── G-5: 선언 항목의 도출 귀속 (P-A · P-C) ─────────────────────────────────
# spec: green testing/judgement-command-derivation-completeness §동작 1~6
#
#   (P-A) §수용 기준 구간의 **행 선두** 체크박스 항목 중 판정을 **선언한** 것.
#   (P-B) 위에서 도출한 cmds — 모집단을 넓히지도 좁히지도 않고 그대로 재사용한다.
#   (P-C) 항목 구간(항목 라인 ~ 다음 최상위 체크박스/다음 `## ` 헤더 직전)에
#         (P-B) 원소가 1건 이상 떨어지는가.
#
# 선언 판별 토큰은 임의 선택이 아니라 **재현으로 고정**했다: spec §동작 §실측 이
# 박제한 HEAD=61ce5ab 값 items=783 declared=69 covered=67 을 재현하는 토큰이다.
# 산문의 "판정" 낱말이 항목을 선언으로 만들지 않도록 판별은 §수용 기준 구간의
# 최상위 체크박스 항목 구간에 한정한다 (spec §동작 §자기 비봉쇄).
#
# 선언 항목 비공허 하한. DERIVE_MIN 과 **같은 층의 고정 하한**이며 상대 하한이
# 아니다 (spec §역할 (ii) 가 상대화를 기각). 붕괴는 충족이 아니라 무판정(exit 2)이다.
DECLARE_MIN=20

# cmds 라인 접두 `파일:라인:` 만 뽑는다. 도출기를 새로 만들지 않는다 (A-4 비감소).
cmd_locs="$(printf '%s\n' "$cmds" | sed -n 's/^\([^:]*\):\([0-9][0-9]*\):.*$/\1 \2/p')"

acc_files="$(find "$ACC_ROOT" -name '*.md' -type f 2>/dev/null | sort)"
acc_spans=""
if [ -n "$acc_files" ]; then
  # 파일당 새 프로세스를 띄우지 않는다 — 전 파일을 단일 awk 순회로 처리한다.
  # cmd_locs 는 ENVIRON 으로 넘긴다 (-v 는 백슬래시 이스케이프 처리를 한다).
  acc_spans="$(CMDLOCS="$cmd_locs" awk '
    function emit(endl,   i, cov) {
      if (!open) return
      itemc++
      if (odecl) {
        declc++
        cov = 0
        for (i = ostart; i <= endl; i++) if ((ofile SUBSEP i) in cmd) { cov = 1; break }
        if (cov) covc++; else miss[++missn] = ofile ":" ostart
      }
      open = 0
    }
    BEGIN {
      n = split(ENVIRON["CMDLOCS"], L, "\n")
      for (i = 1; i <= n; i++) { if (L[i] == "") continue; split(L[i], a, " "); cmd[a[1] SUBSEP a[2]] = 1 }
    }
    FNR == 1 { emit(lastfnr); insec = 0 }
    { lastfnr = FNR }
    /^## / { emit(FNR - 1); insec = ($0 ~ /수용 기준/); next }
    !insec { next }
    /^-[[:space:]]*\[[ x]\]/ { emit(FNR - 1); open = 1; ofile = FILENAME; ostart = FNR; odecl = 0 }
    open && /판정:/ { odecl = 1 }
    END {
      emit(lastfnr)
      printf "ITEMS %d\n", itemc
      printf "DECLARED %d\n", declc
      printf "COVERED %d\n", covc
      for (i = 1; i <= missn; i++) printf "MISS %s\n", miss[i]
    }
  ' $acc_files)"
fi

items_total="$(printf '%s\n' "$acc_spans" | awk '$1=="ITEMS"{print $2}')"
declared_count="$(printf '%s\n' "$acc_spans" | awk '$1=="DECLARED"{print $2}')"
covered_count="$(printf '%s\n' "$acc_spans" | awk '$1=="COVERED"{print $2}')"
g5_hits="$(printf '%s\n' "$acc_spans" | sed -n 's/^MISS //p')"

# 추출 실패는 명시 실패다. 빈 추출은 declared=0 을 만들고 그것은 exit 2 로 새어
# 무판정처럼 보인다 — 그 경로를 막는다 (RULE-06 §추출 실패 검출).
if [ -z "$items_total" ] || [ -z "$declared_count" ] || [ -z "$covered_count" ]; then
  printf 'check-acceptance-criteria: (P-A) 항목 도출 추출 실패 (root=%s) — 무판정 아님\n' "$ACC_ROOT" >&2
  emit_advisory
  exit 3
fi

if [ "$declared_count" -lt "$DECLARE_MIN" ]; then
  printf 'check-acceptance-criteria: declared=%s < %s vacuous (root=%s) — 무판정\n' \
    "$declared_count" "$DECLARE_MIN" "$ACC_ROOT" >&2
  printf 'Hint: 선언 항목 도출이 공허하다. 공허 통과로 읽지 않는다.\n' >&2
  emit_advisory
  exit 2
fi

# 축 분리 — G-3·G-4 와 동일 술어. 사본 루트가 30.spec 명명을 보존하지 않으면
# blue 도 green 으로 계수된다 (seam 주입은 잡혀야 하므로 의도된 동작).
g5_blue_hits="$(printf '%s' "$g5_hits" | grep -E '^[^:]*/30\.spec/blue/' || true)"
g5_green_hits="$(printf '%s' "$g5_hits" | grep -vE '^[^:]*/30\.spec/blue/' || true)"
g5_blue_count="$(printf '%s' "$g5_blue_hits" | grep -c . || true)"
g5_green_count="$(printf '%s' "$g5_green_hits" | grep -c . || true)"

if [ "$g5_blue_count" -ne 0 ]; then
  blue_advisory=$((blue_advisory + g5_blue_count))
  blue_advisory_hits="${blue_advisory_hits}$(printf '%s' "$g5_blue_hits" | sed 's/^/  [G-5 blue 선언항목 미도출] /')
"
fi

if [ "$g5_green_count" -ne 0 ]; then
  printf 'G-5 VIOLATION: 판정을 선언한 항목이 도출에 귀속되지 않음 %s건 (green 귀속 · 기대 0)\n' "$g5_green_count" >&2
  # 수치만 내면 어느 항목이 빠졌는지 관측되지 않는다 (spec §수용 기준 A-2).
  printf '%s' "$g5_green_hits" | head -10 >&2
  printf 'Hint: 판정 명령을 허용 접두(bash -c · npx · npm run · awk · test · grep -) 또는 코드 펜스로 표기한다.\n' >&2
  green_violations=1
fi

# 세 수치는 **동시에** 발화된다 — 하나만 내면 어느 층에서 새는지 갈리지 않는다
# (spec §공개 인터페이스). declared-items= · derived-covered= 토큰 문자열은
# spec §수용 기준 (A-1) 판정 명령이 sed -nE 로 긁는 계약면이다.
# 종료 경로 0/1 **양쪽**에서 낸다 — 위반 경로에서 침묵하면 (A-1) 판정이
# 위반(1)을 `ack 라인 미발화` 무판정(2)으로 오독한다 (spec §수용 기준 A-3 구분).
emit_items() {
  printf 'check-acceptance-criteria: total-items=%s declared-items=%s derived-covered=%s declared-miss-green=%s declared-miss-blue=%s(ADVISORY) declare-min=%s (root=%s)\n' \
    "$items_total" "$declared_count" "$covered_count" "$g5_green_count" "$g5_blue_count" "$DECLARE_MIN" "$ACC_ROOT"
}

# ── G-3: 판정 명령의 sed 주소 범위 재시작 ──────────────────────────────────
g3_hits="$(printf '%s\n' "$cmds" | grep -E 'sed -n .{0,3}/[^/]*/,/[^/]*/p' || true)"
# cmds 라인은 FILENAME:FNR: 접두를 가지므로 그 접두로 귀속을 가른다.
# ACC_SPEC_ROOT 로 루트가 치환되면 blue 접두에 걸리지 않아 green 취급(=집행)이 된다.
# 이는 의도다 — seam 은 자기 민감도 주입점이고 주입한 위반은 잡혀야 한다.
g3_blue_hits="$(printf '%s' "$g3_hits" | grep -E '^[^:]*/30\.spec/blue/' || true)"
g3_green_hits="$(printf '%s' "$g3_hits" | grep -vE '^[^:]*/30\.spec/blue/' || true)"
g3_count="$(printf '%s' "$g3_hits" | grep -c . || true)"
g3_blue_count="$(printf '%s' "$g3_blue_hits" | grep -c . || true)"
g3_green_count="$(printf '%s' "$g3_green_hits" | grep -c . || true)"

if [ "$g3_blue_count" -ne 0 ]; then
  blue_advisory=$((blue_advisory + g3_blue_count))
  blue_advisory_hits="${blue_advisory_hits}$(printf '%s' "$g3_blue_hits" | sed 's/^/  [G-3 blue 범위재시작] /')
"
fi

if [ "$g3_green_count" -ne 0 ]; then
  printf 'G-3 VIOLATION: 판정 명령에 주소 범위 재시작 형태 %s건 (green 귀속 · 기대 0)\n' "$g3_green_count" >&2
  printf '%s' "$g3_green_hits" | head -10 >&2
  printf 'Hint: 단발 범위(awk + exit)로 바꾼다 — 시작 패턴 재등장에도 재시작이 없다.\n' >&2
  green_violations=1
fi

# ── G-4: 판정 명령의 실행 금지어 ───────────────────────────────────────────
# 검출 토큰은 리터럴이 아니라 조립이다 (자기 hit 회귀 방지 — spec §동작 (P-5)).
V="$(printf 'r''m -rf')|$(printf 'git re''set --hard')|$(printf 'git cl''ean -f')|$(printf -- '--no-''verify')|$(printf 'git pu''sh --force')"
forbidden_verbs="$(printf '%s' "$V" | awk -F'|' '{ print NF }')"

g4_hits="$(printf '%s\n' "$cmds" | grep -E "$V" || true)"
g4_blue_hits="$(printf '%s' "$g4_hits" | grep -E '^[^:]*/30\.spec/blue/' || true)"
g4_green_hits="$(printf '%s' "$g4_hits" | grep -vE '^[^:]*/30\.spec/blue/' || true)"
g4_count="$(printf '%s' "$g4_hits" | grep -c . || true)"
g4_blue_count="$(printf '%s' "$g4_blue_hits" | grep -c . || true)"
g4_green_count="$(printf '%s' "$g4_green_hits" | grep -c . || true)"

if [ "$g4_blue_count" -ne 0 ]; then
  blue_advisory=$((blue_advisory + g4_blue_count))
  blue_advisory_hits="${blue_advisory_hits}$(printf '%s' "$g4_blue_hits" | sed 's/^/  [G-4 blue 금지어] /')
"
fi

if [ "$g4_green_count" -ne 0 ]; then
  printf 'G-4 VIOLATION: 판정 명령에 실행 금지어 %s건 (green 귀속 · 기대 0)\n' "$g4_green_count" >&2
  printf '%s' "$g4_green_hits" | head -10 >&2
  printf 'Hint: 금지어가 든 명령은 실행 불가라 promote 조건 2 를 영구 미충족으로 만든다.\n' >&2
  green_violations=1
fi

if [ "$green_violations" -ne 0 ]; then
  emit_advisory
  emit_items
  printf 'check-acceptance-criteria: FAIL (green 귀속 위반 — blue 축은 rc 에 반영되지 않는다)\n' >&2
  exit 1
fi

emit_advisory
printf 'check-acceptance-criteria: G-1 blue deferred=%s(ADVISORY) / G-2 미체크 미래형 green=%s blue=%s(ADVISORY) (PASS)\n' \
  "$g1_count" "$g2_green_count" "$g2_blue_count"
printf 'check-acceptance-criteria: judgement-commands=%s range-restart=%s unexecutable-verb=%s forbidden-verbs=%s (root=%s)\n' \
  "$derived" "$g3_green_count" "$g4_green_count" "$forbidden_verbs" "$ACC_ROOT"
emit_items
exit 0
