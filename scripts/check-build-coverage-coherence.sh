#!/usr/bin/env bash
# check-build-coverage-coherence.sh
# Spec: specs/30.spec/blue/foundation/build-coverage-output-dir-tri-surface-coherence.md §동작 G-A~G-I + §테스트 현황 (FR-12) + §수용 기준 Should (FR-12)
# Task: TSK-20260518-25 (의미 (B) value-agnostic capture-then-compare rework; 본체 TSK-20260518-20 / d32ced0 재작업)
#
# G-A: vite.config.js `outDir: '<X>',` capture (value-agnostic) — tok_a = <X>.
# G-B: .gitignore anchored `^/<Y>$` line 모두 capture (value-agnostic) — build dir 후보 선택 = coverage/node_modules 제외 후 남는 첫 토큰.
# G-C: eslint.config.js ignores 배열의 `'<Z>/**'` 모든 토큰 capture (value-agnostic) — build dir 후보 선택 동형.
# G-D: tok_a, tok_b, tok_c byte-equal (build axis, 절대값 무관).
# G-E: vite.config.js `reportsDirectory` 키 hit=0 (vitest default `./coverage` 의존 baseline).
# G-F: .gitignore set 에 `coverage` 포함 — tok_f = coverage.
# G-G: eslint.config.js set 에 `coverage` 포함 — tok_g = coverage.
# G-H: tok_f, tok_g + vitest default `coverage` cross-surface byte-equal (coverage axis).
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

# build axis sibling 토큰 — 후보 선택 시 제외 (coverage axis + ESLint flat config 컨벤션 한정).
SIBLING_COVERAGE="coverage"
SIBLING_NODE_MODULES="node_modules"

# G-A: vite outDir capture (value-agnostic, capture group 1 = tok_a).
g_a_lines="$(grep -nE "^[[:space:]]*outDir:[[:space:]]*'([^']+)',[[:space:]]*$" vite.config.js 2>/dev/null || true)"
g_a_hits="$(printf '%s\n' "$g_a_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_a_hits" != "1" ]; then
  printf 'G-A VIOLATION: vite outDir capture hit=%s expected=1\n' "$g_a_hits" >&2
  exit 1
fi
tok_a="$(printf '%s\n' "$g_a_lines" | sed -E "s/.*outDir:[[:space:]]*'([^']+)'.*/\1/")"

# G-B: gitignore anchored `^/<Y>$` 모든 토큰 capture (value-agnostic). build dir 후보 선택 = sibling 제외 후 첫 토큰.
g_b_lines="$(grep -nE "^/([a-zA-Z0-9_-]+)$" .gitignore 2>/dev/null || true)"
g_b_hits="$(printf '%s\n' "$g_b_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_b_hits" = "0" ]; then
  printf 'G-B VIOLATION: gitignore anchored line capture hit=%s expected>=1\n' "$g_b_hits" >&2
  exit 1
fi
g_b_tokens="$(printf '%s\n' "$g_b_lines" | sed -E 's@.*:/([^/]+)$@\1@')"
tok_b="$(printf '%s\n' "$g_b_tokens" | awk -v s1="$SIBLING_COVERAGE" -v s2="$SIBLING_NODE_MODULES" '$0 != s1 && $0 != s2 { print; exit }')"
if [ -z "$tok_b" ]; then
  tok_b="<null>"
fi

# G-C: eslint ignores `'<Z>/**'` 모든 토큰 capture (value-agnostic). build dir 후보 선택 동형.
g_c_matches="$(grep -oE "'([a-zA-Z0-9_-]+)/\*\*'" eslint.config.js 2>/dev/null || true)"
g_c_hits="$(printf '%s\n' "$g_c_matches" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g_c_hits" = "0" ]; then
  printf 'G-C VIOLATION: eslint ignores dir/** capture hit=%s expected>=1\n' "$g_c_hits" >&2
  exit 1
fi
g_c_tokens="$(printf '%s\n' "$g_c_matches" | sed -E "s/'([^']+)\/\*\*'/\1/")"
tok_c="$(printf '%s\n' "$g_c_tokens" | awk -v s1="$SIBLING_COVERAGE" -v s2="$SIBLING_NODE_MODULES" '$0 != s1 && $0 != s2 { print; exit }')"
if [ -z "$tok_c" ]; then
  tok_c="<null>"
fi

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

# G-F: gitignore set 에 coverage 포함.
tok_f="$(printf '%s\n' "$g_b_tokens" | awk -v c="coverage" '$0 == c { print; exit }')"
if [ "$tok_f" != "coverage" ]; then
  printf 'G-F VIOLATION: gitignore coverage anchored line absent (expected /coverage)\n' >&2
  exit 1
fi

# G-G: eslint set 에 coverage 포함.
tok_g="$(printf '%s\n' "$g_c_tokens" | awk -v c="coverage" '$0 == c { print; exit }')"
if [ "$tok_g" != "coverage" ]; then
  printf 'G-G VIOLATION: eslint ignores '\''coverage/**'\'' absent\n' >&2
  exit 1
fi

# G-H: coverage axis cross-surface byte-equal (vitest default = 'coverage').
if [ "$tok_f" != "coverage" ] || [ "$tok_g" != "coverage" ]; then
  printf 'G-H VIOLATION: coverage dir drift (vitest_default=coverage gitignore=%s eslint=%s)\n' "$tok_f" "$tok_g" >&2
  exit 1
fi

printf 'check-build-coverage-coherence: G-A+G-B+G-C+G-D (build) + G-E+G-F+G-G+G-H (coverage) PASS (build=%s coverage=%s)\n' "$tok_a" "$tok_f"
exit 0
