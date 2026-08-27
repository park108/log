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
# 색상 방어 3겹 — FORCE_COLOR 하에서 node 가 숫자에 util.inspect 색상을 입혀 판독이 붕괴한 실측 회귀 차단:
#   (a) 호출에 NO_COLOR=1 FORCE_COLOR=0 접두 — 색상화 자체를 끈다.
#   (b) console.log(<number>) 대신 process.stdout.write(String(...)) — 숫자 inspect 경로를 우회한다.
#   (c) 캡처 직후 ANSI 이스케이프 제거 — 상위 래퍼가 주입한 잔여 시퀀스를 벗긴다.
# 행 단위 접두 형태를 택한 이유: 이 스크립트의 도구 캡처 지점이 소수라 오염원별 방어를
# 캡처 라인 옆에 붙이는 편이 누락 검출이 쉽다 (전역 export 는 하위 프로세스 전파가 암묵적).
declared_n="$(NO_COLOR=1 FORCE_COLOR=0 node -e "const p=require('./package.json'); process.stdout.write(String(Object.keys({...(p.dependencies||{}), ...(p.devDependencies||{})}).length) + '\n')")"
declared_n="$(printf '%s' "$declared_n" | LC_ALL=C sed "s/$(printf '\033')\[[0-9;]*m//g")"

violations=0

if [ "$extraneous_count" -ne 0 ]; then
  printf 'G1 VIOLATION: extraneous=%s (expected 0)\n' "$extraneous_count" >&2
  printf '%s\n' "$ls_out" | grep -E ' extraneous$' >&2
  violations=1
fi

# 측정 실패(무판정) 가드 — 판독값이 정수가 아니면 등식 비교도 산술도 무의미하다.
# 위반(exit 1) 과 구별해 exit 2 로 낸다. $((declared_n - installed_m)) 은 이 단언 뒤에서만 실행된다.
if ! [[ "$declared_n" =~ ^[0-9]+$ ]]; then
  printf 'MEASUREMENT FAILURE: declared_n is not an integer (got: %q)\n' "$declared_n" >&2
  exit 2
fi

if ! [[ "$installed_m" =~ ^[0-9]+$ ]]; then
  printf 'MEASUREMENT FAILURE: installed_m is not an integer (got: %q)\n' "$installed_m" >&2
  exit 2
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
