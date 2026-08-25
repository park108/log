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
# G-3·G-4 의 모집단은 **판정 명령**이지 산문이 아니다. 함정 부류를 설명하는
# 문장이 hit 이 되면 어떤 시정으로도 0 에 도달하지 못하는 자기봉쇄 기준이 된다
# (spec §동작 (P-5) 에 실제 발생 기록). 같은 이유로 G-4 의 검출 토큰은
# 리터럴이 아니라 printf 분할 연결로 **조립**한다 — 리터럴로 담으면 장래 이
# 스크립트가 스캔 대상에 들어갈 때 자기 hit 이 된다.
#
# 모집단 seam: ACC_SPEC_ROOT (기본 specs/30.spec). 저장소를 바꾸지 않고
# 자기 민감도를 검증하기 위한 주입점이다 (spec §공개 인터페이스).
#
# exit 0: 전 게이트 PASS (ack stdout)
# exit 1: 위반 (stderr 상세 후 fail-fast)
# exit 2: 무판정 — 판정 명령 도출이 공허(<100). 충족으로 읽지 않는다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

BLUE="specs/30.spec/blue"
GREEN="specs/30.spec/green"

# 모집단 seam — G-3·G-4 는 이 루트를 따른다 (spec §공개 인터페이스).
ACC_ROOT="${ACC_SPEC_ROOT:-specs/30.spec}"

# 도출 비공허 하한. 추출기가 낡아 모집단이 비는 상태를 충족으로 읽지 않는다.
DERIVE_MIN=100

violations=0

# ── G-1: blue 에 체크박스형 [deferred] 잔존 ─────────────────────────────────
g1_hits="$(grep -rnE '^[[:space:]]*-[[:space:]]*\[[ x]\].*\[deferred' "$BLUE" --include='*.md' 2>/dev/null || true)"
g1_count="$(printf '%s' "$g1_hits" | grep -c . || true)"

if [ "$g1_count" -ne 0 ]; then
  printf 'G-1 VIOLATION: blue 에 체크박스형 [deferred] %s건 (기대 0)\n' "$g1_count" >&2
  printf '%s\n' "$g1_hits" | head -10 >&2
  printf 'Hint: [deferred] 는 green 전용. blue 승격 시 ## 참고 로 강등한다 (RULE-07 §promote).\n' >&2
  violations=1
fi

# ── G-2: §수용 기준 체크박스의 미래형 문장 ─────────────────────────────────
# awk 로 §수용 기준 ~ 다음 `## ` 헤더 구간만 잘라 체크박스 라인을 검사한다.
# 판정 불가 키워드는 RULE-07 §체크박스 부적격 부류에서 가져온다.
future_re='차기|누적|대기|이벤트 후|발생 시|별 carve|추후|향후'
g2_hits=""

for f in $(find "$GREEN" "$BLUE" -name '*.md' -type f 2>/dev/null | sort); do
  hits="$(awk '
    /^## 수용 기준/        { inblock = 1; next }
    /^## /                 { inblock = 0 }
    inblock && /^[[:space:]]*-[[:space:]]*\[ \]/ { printf "%d\t%s\n", NR, $0 }
  ' "$f" | grep -E "$future_re" || true)"

  if [ -n "$hits" ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      g2_hits="${g2_hits}${f}:${line}
"
    done <<EOF
$hits
EOF
  fi
done

g2_count="$(printf '%s' "$g2_hits" | grep -c . || true)"

if [ "$g2_count" -ne 0 ]; then
  printf 'G-2 VIOLATION: §수용 기준 미체크 항목에 판정 불가(미래형) 문장 %s건 (기대 0)\n' "$g2_count" >&2
  printf '%s' "$g2_hits" | head -10 >&2
  printf 'Hint: 이 부류는 ## 참고 §미측정·비판정 항목 으로 강등한다 (RULE-07 §수용 기준 문장 규약).\n' >&2
  violations=1
fi

if [ "$violations" -ne 0 ]; then
  printf 'check-acceptance-criteria: FAIL\n' >&2
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
  exit 2
fi

# ── G-3: 판정 명령의 sed 주소 범위 재시작 ──────────────────────────────────
g3_hits="$(printf '%s\n' "$cmds" | grep -E 'sed -n .{0,3}/[^/]*/,/[^/]*/p' || true)"
g3_count="$(printf '%s' "$g3_hits" | grep -c . || true)"

if [ "$g3_count" -ne 0 ]; then
  printf 'G-3 VIOLATION: 판정 명령에 주소 범위 재시작 형태 %s건 (기대 0)\n' "$g3_count" >&2
  printf '%s\n' "$g3_hits" | head -10 >&2
  printf 'Hint: 단발 범위(awk + exit)로 바꾼다 — 시작 패턴 재등장에도 재시작이 없다.\n' >&2
  violations=1
fi

# ── G-4: 판정 명령의 실행 금지어 ───────────────────────────────────────────
# 검출 토큰은 리터럴이 아니라 조립이다 (자기 hit 회귀 방지 — spec §동작 (P-5)).
V="$(printf 'r''m -rf')|$(printf 'git re''set --hard')|$(printf 'git cl''ean -f')|$(printf -- '--no-''verify')|$(printf 'git pu''sh --force')"
forbidden_verbs="$(printf '%s' "$V" | awk -F'|' '{ print NF }')"

g4_hits="$(printf '%s\n' "$cmds" | grep -E "$V" || true)"
g4_count="$(printf '%s' "$g4_hits" | grep -c . || true)"

if [ "$g4_count" -ne 0 ]; then
  printf 'G-4 VIOLATION: 판정 명령에 실행 금지어 %s건 (기대 0)\n' "$g4_count" >&2
  printf '%s\n' "$g4_hits" | head -10 >&2
  printf 'Hint: 금지어가 든 명령은 실행 불가라 promote 조건 2 를 영구 미충족으로 만든다.\n' >&2
  violations=1
fi

if [ "$violations" -ne 0 ]; then
  printf 'check-acceptance-criteria: FAIL\n' >&2
  exit 1
fi

printf 'check-acceptance-criteria: G-1 blue deferred=0 / G-2 미체크 미래형=0 (PASS)\n'
printf 'check-acceptance-criteria: judgement-commands=%s range-restart=%s unexecutable-verb=%s forbidden-verbs=%s (root=%s)\n' \
  "$derived" "$g3_count" "$g4_count" "$forbidden_verbs" "$ACC_ROOT"
exit 0
