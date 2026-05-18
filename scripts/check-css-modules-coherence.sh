#!/usr/bin/env bash
# check-css-modules-coherence.sh
# Spec: specs/30.spec/green/styles/css-modules.md §동작 (I1)+(I2)+(I6)+(I8) + §수용 기준 Must (REQ-016 FR-05)
# Task: TSK-20260518-23
#
# G-I1: src/**/*.module.css cardinality = 4 (stage-1 enum: Toaster / Comment / ImageSelector / Search).
#        4 미만 → stage-1-enum-shrink VIOLATION rc=1.
#        4 초과 → enum expansion NOTICE rc=0 (spec update signal, 본 script scope 외 warning).
# G-I2: src/common/Skeleton.css 글로벌 의도 박제 주석 hit ≥1.
# G-I6: vite.config.js `localsConvention: 'camelCaseOnly'` 단방향 변환 토큰 hit = 1.
# G-I8: src/** 의 `styles["…"]` / `styles['…']` bracket access 합산 = 0 (dot-property 강제).
#
# exit 0: 모든 게이트 PASS (ack 1 줄 stdout).
# exit 1: 어느 게이트라도 위반 (stderr 상세 + 격차 카테고리 라벨).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

VITE_CFG="$ROOT/vite.config.js"
SKELETON_CSS="$ROOT/src/common/Skeleton.css"

if [ ! -f "$VITE_CFG" ]; then
  printf 'check-css-modules-coherence: %s not found\n' "$VITE_CFG" >&2
  exit 1
fi

if [ ! -f "$SKELETON_CSS" ]; then
  printf 'check-css-modules-coherence: %s not found\n' "$SKELETON_CSS" >&2
  exit 1
fi

# G-I1: stage-1 enum cardinality.
g_i1_hits="$(find src -name "*.module.css" 2>/dev/null | wc -l | tr -d ' ')"
if [ "$g_i1_hits" -lt 4 ]; then
  printf 'G-I1 VIOLATION: stage-1 enum cardinality=%s expected=4 (category: stage-1-enum-shrink)\n' "$g_i1_hits" >&2
  exit 1
fi
if [ "$g_i1_hits" -gt 4 ]; then
  printf 'G-I1 NOTICE: stage-1 enum expanded cardinality=%s (spec update signal)\n' "$g_i1_hits" >&2
fi

# G-I2: Skeleton.css 글로벌 의도 박제.
g_i2_hits="$(grep -cE "Intentionally not a CSS Module|stage-1 modules targets" "$SKELETON_CSS" 2>/dev/null || true)"
if [ "$g_i2_hits" = "0" ]; then
  printf 'G-I2 VIOLATION: Skeleton.css intent comment hit=0 (category: skeleton-global-intent-loss)\n' >&2
  exit 1
fi

# G-I6: localsConvention 토큰.
g_i6_hits="$(grep -cE "localsConvention[[:space:]]*:[[:space:]]*'camelCaseOnly'" "$VITE_CFG" 2>/dev/null || true)"
if [ "$g_i6_hits" != "1" ]; then
  printf 'G-I6 VIOLATION: localsConvention token hit=%s expected=1 (category: convention-token-drift)\n' "$g_i6_hits" >&2
  exit 1
fi

# G-I8: caller bracket access count = 0.
g_i8_hits="$(grep -rcE "styles\[\"[^\"]+\"\]|styles\['[^']+'\]" src 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')"
if [ "$g_i8_hits" != "0" ]; then
  printf 'G-I8 VIOLATION: bracket access count=%s expected=0 (category: bracket-access-leak)\n' "$g_i8_hits" >&2
  exit 1
fi

printf 'check-css-modules-coherence: G-I1 (stage1=%s) + G-I2 (intent=%s) + G-I6 (convention=%s) + G-I8 (bracket=%s) PASS\n' \
  "$g_i1_hits" "$g_i2_hits" "$g_i6_hits" "$g_i8_hits"
exit 0
