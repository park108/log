#!/usr/bin/env bash
# check-node-version-coherence.sh
# Spec: specs/30.spec/green/foundation/node-version-3axis-coherence.md §동작 1·3·4·5 + §수용 기준 FR-01~05 + §테스트 현황 I1·I3·I4·I5
# Task: TSK-20260517-14
#
# 3-axis coherence:
#   (a) package.json:engines.node  major
#   (b) .github/workflows/ci.yml   node-version major
#   (c) .nvmrc / .node-version / .tool-versions  major (local dev pin)
#
# Exit codes:
#   0 - 3-axis aligned
#   2 - engines.node 부재 (FR-01 위반)
#   3 - ci.yml node-version 부재 (foundation/ci.md §2 위반)
#   4 - local-pin 부재 (FR-03 위반)
#   5 - major 격차 N (3 축 메이저 불일치)
#
# Output:
#   PASS  -> stdout: 'node-version coherence: 3-axis aligned at major <N>'
#   FAIL  -> stderr 진단 + 라벨 grep 가능 ('engines.node 부재' / 'ci.yml node-version 부재' / 'local-pin 부재' / 'major 격차 N')

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

PKG_JSON="$ROOT/package.json"
CI_YML="$ROOT/.github/workflows/ci.yml"

if [ ! -f "$PKG_JSON" ]; then
  printf 'check-node-version-coherence: package.json not found at %s\n' "$PKG_JSON" >&2
  exit 1
fi

# axis (a): engines.node major
engines_node="$(node -e "const p=require('./package.json'); const v=p.engines && p.engines.node; if(!v){process.exit(10)} const m=String(v).match(/(\d+)/); if(!m){process.exit(11)} process.stdout.write(m[1])" 2>/dev/null || true)"
engines_rc=$?
if [ -z "$engines_node" ]; then
  printf 'engines.node 부재\n' >&2
  printf 'engines.node 부재\n'
  exit 2
fi
axis_a="$engines_node"

# axis (b): ci.yml node-version major
if [ ! -f "$CI_YML" ]; then
  printf 'ci.yml node-version 부재 (file missing)\n' >&2
  printf 'ci.yml node-version 부재\n'
  exit 3
fi
ci_line="$(grep -oE "node-version:[[:space:]]*['\"]?([0-9]+)" "$CI_YML" | head -n1 || true)"
ci_major="$(printf '%s' "$ci_line" | grep -oE '[0-9]+' | head -n1 || true)"
if [ -z "$ci_major" ]; then
  printf 'ci.yml node-version 부재\n' >&2
  printf 'ci.yml node-version 부재\n'
  exit 3
fi
axis_b="$ci_major"

# axis (c): local dev pin (.nvmrc -> .node-version -> .tool-versions)
local_major=""
if [ -f "$ROOT/.nvmrc" ]; then
  local_major="$(grep -oE '^[0-9]+' "$ROOT/.nvmrc" | head -n1 || true)"
fi
if [ -z "$local_major" ] && [ -f "$ROOT/.node-version" ]; then
  local_major="$(grep -oE '^[0-9]+' "$ROOT/.node-version" | head -n1 || true)"
fi
if [ -z "$local_major" ] && [ -f "$ROOT/.tool-versions" ]; then
  local_major="$(grep -E '^nodejs[[:space:]]+' "$ROOT/.tool-versions" | grep -oE '[0-9]+' | head -n1 || true)"
fi
if [ -z "$local_major" ]; then
  printf 'local-pin 부재\n' >&2
  printf 'local-pin 부재\n'
  exit 4
fi
axis_c="$local_major"

# Compare 3 axes
min_v="$axis_a"
max_v="$axis_a"
for v in "$axis_b" "$axis_c"; do
  if [ "$v" -lt "$min_v" ]; then min_v="$v"; fi
  if [ "$v" -gt "$max_v" ]; then max_v="$v"; fi
done
gap=$((max_v - min_v))

if [ "$gap" -ne 0 ]; then
  printf 'major 격차 %s (engines.node=%s, ci.yml=%s, local-pin=%s)\n' \
    "$gap" "$axis_a" "$axis_b" "$axis_c" >&2
  printf 'major 격차 %s\n' "$gap"
  exit 5
fi

printf 'node-version coherence: 3-axis aligned at major %s\n' "$axis_a"
exit 0
