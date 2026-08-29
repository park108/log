#!/usr/bin/env bash
# check-eslint-ignores-vacuous-zero.sh
# Spec: specs/30.spec/blue/foundation/tooling.md §동작 9 (REQ-013) + §테스트 현황 line 206 (FR-07) + §수용 기준 line 268 (Should, FR-07)
# Task: TSK-20260518-21
#
# G-9.1 (배열 위치/길이): eslint.config.js 의 `{ ignores: [...] }` 객체 선언 hit=1 expected.
# G-9.2 (5 패턴 cardinality ≥ 1) — vacuous-zero 검출:
#   P-1 `build/**`         : `build` 디렉터리 cardinality ≥ 1.
#   P-2 `coverage/**`      : `coverage` 디렉터리 cardinality ≥ 1.
#   P-3 `node_modules/**`  : `node_modules` 디렉터리 cardinality ≥ 1.
#   P-4 `**/__tests__/**`  : `__tests__` 디렉터리 cardinality ≥ 1 (node_modules / build / coverage 제외).
#
# exit 0: G-9.1 + G-9.2 모두 PASS (ack 1줄 stdout).
# exit 1: 어느 게이트라도 위반 (stderr 상세 + 라벨).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ESLINT_CFG="$ROOT/eslint.config.js"

if [ ! -f "$ESLINT_CFG" ]; then
  printf 'check-eslint-ignores-vacuous-zero: %s not found\n' "$ESLINT_CFG" >&2
  exit 1
fi

cd "$ROOT" || exit 1

# G-9.1: `{ ignores: [...] }` 객체 선언 hit.
g91_lines="$(grep -nE "^[[:space:]]*\{[[:space:]]*ignores:" eslint.config.js 2>/dev/null)"
g91_hits="$(printf '%s\n' "$g91_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g91_hits" != "1" ]; then
  printf 'G-9.1 VIOLATION: ignores 배열 선언 hit=%s expected=1\n' "$g91_hits" >&2
  exit 1
fi
g91_line="$(printf '%s\n' "$g91_lines" | sed -E 's/^([0-9]+):.*/\1/')"

# G-9.2: 5 패턴 cardinality ≥ 1.
p1="$(find . -maxdepth 2 -type d -name "build" -not -path "./node_modules/*" 2>/dev/null | wc -l | tr -d ' ')"
if [ "$p1" = "0" ]; then
  printf 'G-9.2 VIOLATION: P-1 build/** cardinality=0 (vacuous-zero violation)\n' >&2
  exit 1
fi

p2="$(find . -maxdepth 2 -type d -name "coverage" -not -path "./node_modules/*" 2>/dev/null | wc -l | tr -d ' ')"
if [ "$p2" = "0" ]; then
  printf 'G-9.2 VIOLATION: P-2 coverage/** cardinality=0 (vacuous-zero violation)\n' >&2
  exit 1
fi

p3="$(find . -maxdepth 2 -type d -name "node_modules" 2>/dev/null | wc -l | tr -d ' ')"
if [ "$p3" = "0" ]; then
  printf 'G-9.2 VIOLATION: P-3 node_modules/** cardinality=0 (vacuous-zero violation)\n' >&2
  exit 1
fi

p4="$(find . -type d -name "__tests__" -not -path "./node_modules/*" -not -path "./build/*" -not -path "./coverage/*" 2>/dev/null | wc -l | tr -d ' ')"
if [ "$p4" = "0" ]; then
  printf 'G-9.2 VIOLATION: P-4 **/__tests__/** cardinality=0 (vacuous-zero violation)\n' >&2
  exit 1
fi

printf 'check-eslint-ignores-vacuous-zero: G-9.1 PASS (1 array @line=%s) + G-9.2 PASS (P-1=%s P-2=%s P-3=%s P-4=%s)\n' \
  "$g91_line" "$p1" "$p2" "$p3" "$p4"
exit 0
