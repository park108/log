#!/usr/bin/env bash
# check-build-coverage-coherence.sh
# Spec: specs/30.spec/green/foundation/build-coverage-output-dir-tri-surface-coherence.md §동작 G-A~G-I + §테스트 현황 (FR-12) + §수용 기준 Should (FR-12)
# Task: TSK-20260518-20
#
# G-A: vite.config.js `outDir: 'build',` literal hit=1 + build dir 토큰 capture.
# G-B: .gitignore 의 `/build` anchored line hit=1 + build dir 토큰 capture.
# G-C: eslint.config.js ignores 배열의 `'build/**'` token hit=1 + dir 토큰 capture.
# G-D: G-A, G-B, G-C 토큰 cross-surface byte-equal (build axis).
# G-E: vite.config.js `reportsDirectory` 키 hit=0 (vitest default `./coverage` 의존 baseline).
# G-F: .gitignore 의 `/coverage` anchored line hit=1 + coverage dir 토큰 capture.
# G-G: eslint.config.js ignores 배열의 `'coverage/**'` token hit=1 + dir 토큰 capture.
# G-H: G-F, G-G 토큰 + vitest default `coverage` cross-surface byte-equal (coverage axis).
#
# exit 0: G-A~G-H 모두 PASS (ack 1 줄 stdout).
# exit 1: 어느 게이트라도 위반 (stderr 상세 라벨 출력 후 fail-fast).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VITE_CFG="$ROOT/vite.config.js"
GITIGNORE="$ROOT/.gitignore"
ESLINT_CFG="$ROOT/eslint.config.js"

if [ ! -f "$VITE_CFG" ]; then
  printf 'check-build-coverage-coherence: %s not found\n' "$VITE_CFG" >&2
  exit 1
fi

if [ ! -f "$GITIGNORE" ]; then
  printf 'check-build-coverage-coherence: %s not found\n' "$GITIGNORE" >&2
  exit 1
fi

if [ ! -f "$ESLINT_CFG" ]; then
  printf 'check-build-coverage-coherence: %s not found\n' "$ESLINT_CFG" >&2
  exit 1
fi

cd "$ROOT" || exit 1

# G-A: vite outDir 'build' literal + dir 토큰 추출 (§구현 지시 verbatim — literal-pinned 'build').
g_a_lines="$(grep -nE "^[[:space:]]*outDir:[[:space:]]*'build',[[:space:]]*$" vite.config.js 2>/dev/null || true)"
g_a_hits="$(printf '%s\n' "$g_a_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_a_hits" != "1" ]; then
  printf 'G-A VIOLATION: vite outDir literal hit=%s expected=1\n' "$g_a_hits" >&2
  exit 1
fi
tok_a="$(printf '%s\n' "$g_a_lines" | sed -E "s/.*outDir:[[:space:]]*'([^']+)'.*/\1/")"

# G-B: gitignore '/build' anchored + dir 토큰 추출 (§구현 지시 verbatim — literal-pinned '/build').
g_b_lines="$(grep -nE "^/build$" .gitignore 2>/dev/null || true)"
g_b_hits="$(printf '%s\n' "$g_b_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_b_hits" != "1" ]; then
  printf 'G-B VIOLATION: gitignore /build hit=%s expected=1\n' "$g_b_hits" >&2
  exit 1
fi
tok_b="$(printf '%s\n' "$g_b_lines" | sed -E 's@.*:/([^/]+)$@\1@')"

# G-C: eslint ignores 'build/**' + dir 토큰 추출 (§구현 지시 verbatim — literal-pinned 'build/**').
g_c_lines="$(grep -nE "'build/\*\*'" eslint.config.js 2>/dev/null || true)"
g_c_hits="$(printf '%s\n' "$g_c_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_c_hits" != "1" ]; then
  printf 'G-C VIOLATION: eslint ignores '\''build/**'\'' hit=%s expected=1\n' "$g_c_hits" >&2
  exit 1
fi
tok_c="$(printf '%s\n' "$g_c_lines" | grep -oE "'build/\*\*'" | sed -E "s/'([^']+)\/\*\*'/\1/" | head -n1)"

# G-D: build axis cross-surface byte-equal.
if [ "$tok_a" != "$tok_b" ] || [ "$tok_b" != "$tok_c" ]; then
  printf 'G-D VIOLATION: build dir drift (vite=%s gitignore=%s eslint=%s)\n' "$tok_a" "$tok_b" "$tok_c" >&2
  exit 1
fi

# G-E: vitest reportsDirectory 부재 (default 의존 baseline).
g_e_hits="$(grep -cE "reportsDirectory" vite.config.js 2>/dev/null || true)"
if [ "$g_e_hits" != "0" ]; then
  printf 'G-E VIOLATION: vitest reportsDirectory unexpected hit=%s expected=0 (default depends)\n' "$g_e_hits" >&2
  exit 1
fi

# G-F: gitignore /coverage anchored + dir 토큰 추출.
g_f_lines="$(grep -nE "^/coverage$" .gitignore 2>/dev/null || true)"
g_f_hits="$(printf '%s\n' "$g_f_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_f_hits" != "1" ]; then
  printf 'G-F VIOLATION: gitignore /coverage hit=%s expected=1\n' "$g_f_hits" >&2
  exit 1
fi
tok_f="$(printf '%s\n' "$g_f_lines" | sed -E 's@.*:/([^/]+)$@\1@')"

# G-G: eslint ignores 'coverage/**' + dir 토큰 추출.
g_g_lines="$(grep -nE "'coverage/\*\*'" eslint.config.js 2>/dev/null || true)"
g_g_hits="$(printf '%s\n' "$g_g_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_g_hits" != "1" ]; then
  printf 'G-G VIOLATION: eslint ignores '\''coverage/**'\'' hit=%s expected=1\n' "$g_g_hits" >&2
  exit 1
fi
tok_g="$(printf '%s\n' "$g_g_lines" | grep -oE "'coverage/\*\*'" | sed -E "s/'([^']+)\/\*\*'/\1/" | head -n1)"

# G-H: coverage axis cross-surface byte-equal (vitest default = 'coverage').
if [ "$tok_f" != "coverage" ] || [ "$tok_g" != "coverage" ]; then
  printf 'G-H VIOLATION: coverage dir drift (vitest_default=coverage gitignore=%s eslint=%s)\n' "$tok_f" "$tok_g" >&2
  exit 1
fi

printf 'check-build-coverage-coherence: G-A+G-B+G-C+G-D (build) + G-E+G-F+G-G+G-H (coverage) PASS (build=%s coverage=%s)\n' "$tok_a" "$tok_f"
exit 0
