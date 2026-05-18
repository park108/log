#!/usr/bin/env bash
# check-package-manager-coherence.sh
# Spec: specs/30.spec/blue/foundation/package-manager-major-coherence.md §동작 (I1) + §수용 기준 FR-01 + FR-04
# Task: TSK-20260517-23
#
# Channels (1+ 채널 박제 효능 — FR-01):
#   (a) package.json:engines.npm   semver range
#   (b) package.json:packageManager corepack pin (e.g., "npm@<dynamic>")
#
# Exit codes:
#   0 - 1+ 채널 박제 (PASS)
#   2 - engines.npm 부재 + packageManager 부재 (FR-01 위반)
#
# Output:
#   PASS  -> stdout: 'package-manager coherence: <channels> aligned'
#   FAIL  -> stdout: 격차 카테고리 라벨 (`engines.npm 부재` / `packageManager 부재`) grep 가능

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

PKG_JSON="$ROOT/package.json"

if [ ! -f "$PKG_JSON" ]; then
  printf 'check-package-manager-coherence: package.json not found at %s\n' "$PKG_JSON" >&2
  exit 1
fi

# Channel detection via node (수단 중립 — npm 메이저 숫자 동적 측정)
engines_npm="$(node -e "const p=require('./package.json'); const v=p.engines && p.engines.npm; if(!v){process.exit(10)} process.stdout.write(String(v))" 2>/dev/null || true)"
package_manager="$(node -e "const p=require('./package.json'); const v=p.packageManager; if(!v){process.exit(10)} process.stdout.write(String(v))" 2>/dev/null || true)"

missing=0
labels=""

if [ -z "$engines_npm" ]; then
  printf 'engines.npm 부재\n'
  missing=$((missing + 1))
else
  labels="${labels}engines.npm=${engines_npm} "
fi

if [ -z "$package_manager" ]; then
  printf 'packageManager 부재\n'
  missing=$((missing + 1))
else
  labels="${labels}packageManager=${package_manager} "
fi

# FR-01: 1+ 채널이면 PASS
if [ -z "$engines_npm" ] && [ -z "$package_manager" ]; then
  printf 'package-manager coherence: FAIL (0/2 채널)\n' >&2
  exit 2
fi

printf 'package-manager coherence: %saligned\n' "$labels"
exit 0
