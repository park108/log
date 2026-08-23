#!/usr/bin/env bash
# check-vitest-globals-coherence.sh
# Spec: specs/30.spec/blue/foundation/tooling.md §동작 10 (REQ-015, vitest globals 3-채널 정합)
#       + §테스트 현황 line 212 (REQ-015 FR-06) + §수용 기준 line 281 (Should, REQ-015 FR-06)
# Task: TSK-20260518-22
#
# G-10.1: 채널 A — vite.config.js `test.globals: true` 토큰 hit=1.
# G-10.2: 채널 B — tsconfig.json `"vitest/globals"` 토큰 hit=1.
# G-10.3: 채널 C — eslint.config.js 9 helper readonly 등록 (describe/it/test/expect/vi/beforeAll/beforeEach/afterAll/afterEach) hit=9.
#
# exit 0: 3 채널 모두 PASS (ack 1 줄 stdout).
# exit 1: 어느 채널이라도 위반 (stderr 상세). 첫 위반에서 단축 종료 (fail-fast).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

VITE_CFG="$ROOT/vite.config.js"
TS_CFG="$ROOT/tsconfig.json"
ESLINT_CFG="$ROOT/eslint.config.js"

if [ ! -f "$VITE_CFG" ]; then
  printf 'check-vitest-globals-coherence: %s not found\n' "$VITE_CFG" >&2
  exit 1
fi
if [ ! -f "$TS_CFG" ]; then
  printf 'check-vitest-globals-coherence: %s not found\n' "$TS_CFG" >&2
  exit 1
fi
if [ ! -f "$ESLINT_CFG" ]; then
  printf 'check-vitest-globals-coherence: %s not found\n' "$ESLINT_CFG" >&2
  exit 1
fi

# G-10.1: 채널 A — vite globals: true.
g_a_hits="$(grep -cE "^[[:space:]]*globals:[[:space:]]*true" vite.config.js | tr -d ' ')"
if [ "$g_a_hits" != "1" ]; then
  printf 'G-10.1 VIOLATION: channel A (vite globals: true) hit=%s expected=1\n' "$g_a_hits" >&2
  exit 1
fi

# G-10.2: 채널 B — tsconfig types "vitest/globals".
g_b_hits="$(grep -cE "\"vitest/globals\"" tsconfig.json | tr -d ' ')"
if [ "$g_b_hits" != "1" ]; then
  printf 'G-10.2 VIOLATION: channel B (tsconfig vitest/globals) hit=%s expected=1\n' "$g_b_hits" >&2
  exit 1
fi

# G-10.3: 채널 C — eslint readonly 9 helper.
g_c_hits="$(grep -cE "^[[:space:]]*(describe|it|test|expect|vi|before(All|Each)|after(All|Each)):[[:space:]]*'readonly'" eslint.config.js | tr -d ' ')"
if [ "$g_c_hits" != "9" ]; then
  printf 'G-10.3 VIOLATION: channel C (eslint readonly helpers) hit=%s expected=9\n' "$g_c_hits" >&2
  exit 1
fi

printf 'check-vitest-globals-coherence: G-10.1 (A=vite) + G-10.2 (B=tsconfig) + G-10.3 (C=eslint 9 helpers) PASS\n'
exit 0
