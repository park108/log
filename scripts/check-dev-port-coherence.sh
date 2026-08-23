#!/usr/bin/env bash
# check-dev-port-coherence.sh
# Spec: specs/30.spec/blue/foundation/dev-server-port-getUrl-token-coherence.md §동작 G-A·G-B·G-C·G-E + §테스트 현황 (FR-03) + §수용 기준 Must (FR-03)
# Task: TSK-20260518-19
#
# G-A: src/common/common.ts:74 의 dev 분기 `return "http://localhost:<port>/";` 리터럴 hit=1 + port 토큰 capture.
# G-B: vite.config.js:45 의 `port: <port>,` 정수 토큰 hit=1 + port 토큰 capture.
# G-C: G-A 와 G-B 의 port 토큰 byte-equal (cross-channel 동치).
# G-D: src/File/ REFRESH_TIMEOUT 상수 영역 (timing axis) 은 본 스크립트 측정 scope 외 — 격리.
# G-E: 위반 시 stderr 에 `G-? VIOLATION:` 라벨 출력 + rc=1 (fail-fast).
#
# exit 0: G-A + G-B + G-C 모두 PASS (ack 1 줄 stdout).
# exit 1: 어느 게이트라도 위반 (stderr 상세).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMMON_TS="$ROOT/src/common/common.ts"
VITE_CFG="$ROOT/vite.config.js"

if [ ! -f "$COMMON_TS" ]; then
  printf 'check-dev-port-coherence: %s not found\n' "$COMMON_TS" >&2
  exit 1
fi

if [ ! -f "$VITE_CFG" ]; then
  printf 'check-dev-port-coherence: %s not found\n' "$VITE_CFG" >&2
  exit 1
fi

cd "$ROOT" || exit 1

# G-A: getUrl dev 분기 literal hit + port 추출.
g_a_lines="$(grep -nE '^[[:space:]]*return[[:space:]]+"http://localhost:[0-9]+/";' src/common/common.ts 2>/dev/null)"
g_a_hits="$(printf '%s\n' "$g_a_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_a_hits" != "1" ]; then
  printf 'G-A VIOLATION: getUrl literal hit=%s expected=1\n' "$g_a_hits" >&2
  exit 1
fi
port_a="$(printf '%s\n' "$g_a_lines" | sed -E 's/.*localhost:([0-9]+)\/.*/\1/')"

# G-B: vite.config.js server.port 정수 hit + port 추출.
g_b_lines="$(grep -nE '^[[:space:]]*port:[[:space:]]*[0-9]+,' vite.config.js 2>/dev/null)"
g_b_hits="$(printf '%s\n' "$g_b_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_b_hits" != "1" ]; then
  printf 'G-B VIOLATION: vite port hit=%s expected=1\n' "$g_b_hits" >&2
  exit 1
fi
port_b="$(printf '%s\n' "$g_b_lines" | sed -E 's/.*port:[[:space:]]*([0-9]+),.*/\1/')"

# G-C: cross-channel byte-equal.
if [ "$port_a" != "$port_b" ]; then
  printf 'G-C VIOLATION: dev port drift (getUrl=%s vite=%s)\n' "$port_a" "$port_b" >&2
  exit 1
fi

printf 'check-dev-port-coherence: G-A+G-B+G-C PASS (port=%s)\n' "$port_a"
exit 0
