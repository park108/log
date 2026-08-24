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
# exit 0: 두 게이트 PASS (ack 1줄 stdout)
# exit 1: 위반 (stderr 상세 후 fail-fast)

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

BLUE="specs/30.spec/blue"
GREEN="specs/30.spec/green"
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

printf 'check-acceptance-criteria: G-1 blue deferred=0 / G-2 미체크 미래형=0 (PASS)\n'
exit 0
