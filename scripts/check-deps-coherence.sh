#!/usr/bin/env bash
# check-deps-coherence.sh
# Spec: specs/30.spec/blue/foundation/node-modules-extraneous-coherence.md §동작 G1·G2 + §G4 자동 게이트
# Task: TSK-20260517-09
#
# G1 (extraneous 0):     npm ls --depth=0 출력의 ' extraneous$' 라인 카운트 -> 0.
# G2 (선언↔설치 등식):  N (declared = dependencies + devDependencies 키 수) == M (installed top-level 라인 수 '^[├└]').
# 범위 (수단 중립):       npm script + hook + CI workflow 중 1개 이상 부착 (spec §역할 line 10 정합).
#
# 출력:
#   PASS -> stdout 1 줄: '[deps] extraneous=0 declared=N installed=M (PASS)'
#   FAIL -> stderr 진단 + exit 1.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_JSON="$ROOT/package.json"

if [ ! -f "$PKG_JSON" ]; then
  printf 'check-deps-coherence: package.json not found at %s\n' "$PKG_JSON" >&2
  exit 1
fi

cd "$ROOT" || exit 1

# npm ls --depth=0 출력 캡처. extraneous 가 있어도 exit≠0 일 수 있으므로 || true 로 흡수.
ls_out="$(npm ls --depth=0 2>&1 || true)"

# G1: extraneous 라인 카운트.
extraneous_count="$(printf '%s\n' "$ls_out" | grep -cE ' extraneous$' || true)"

# G2-M: installed top-level entry 카운트 (├ 또는 └ 시작 라인).
# UNMET DEPENDENCY / invalid 라인은 제외한다 — 선언만 있고 실제로 설치되지 않은
# 항목도 트리 라인으로 출력되므로, 그대로 세면 declared 와 항상 같아져 G2 가
# 잡으라는 drift (선언 O / 설치 X) 를 정확히 놓친다.
installed_m="$(printf '%s\n' "$ls_out" | grep -E '^[├└]' | grep -cvE 'UNMET DEPENDENCY|invalid' || true)"

# G2-N: declared (dependencies + devDependencies) 키 수.
declared_n="$(node -e "const p=require('./package.json'); console.log(Object.keys({...(p.dependencies||{}), ...(p.devDependencies||{})}).length)")"

violations=0

if [ "$extraneous_count" -ne 0 ]; then
  printf 'G1 VIOLATION: extraneous=%s (expected 0)\n' "$extraneous_count" >&2
  printf '%s\n' "$ls_out" | grep -E ' extraneous$' >&2
  violations=1
fi

if [ "$declared_n" != "$installed_m" ]; then
  printf 'G2 VIOLATION: declared N=%s != installed M=%s (diff=%s)\n' \
    "$declared_n" "$installed_m" "$((declared_n - installed_m))" >&2
  printf 'Hint: run "npm install" (or "npm ci") to reconcile.\n' >&2
  violations=1
fi

if [ $violations -ne 0 ]; then
  exit 1
fi

printf '[deps] extraneous=%s declared=%s installed=%s (PASS)\n' \
  "$extraneous_count" "$declared_n" "$installed_m"
exit 0
