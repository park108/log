#!/usr/bin/env bash
# check-spec-coherence.sh
# Spec: specs/30.spec/green/foundation/src-spec-reference-coherence.md §동작 G1·G2
# Task: TSK-20260517-06
#
# G1 (RULE-01 suffix): grep -rnE 'specs/30\.spec/[^"` ]*-spec\.md' src -> 0 hit.
# G2 (디스크 실재):    src 내 specs/30.spec/{blue,green}/...md 패턴 매칭 경로 -> 전원 test -e PASS.
# 범위 (G4): src/** 한정. docs/**, README.md, *.config.{ts,js}, package.json 미포함.
#
# exit 0: 두 게이트 PASS (ack 1 줄 출력).
# exit 1: G1 또는 G2 위반 (stderr 상세).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/src"

if [ ! -d "$SRC_DIR" ]; then
  printf 'check-spec-coherence: src/ not found at %s\n' "$SRC_DIR" >&2
  exit 1
fi

cd "$ROOT" || exit 1

violations=0

# G1: -spec suffix 금지.
# grep exit: 0 = match (위반), 1 = no match (PASS), 2 = error.
g1_out="$(grep -rnE 'specs/30\.spec/[^"`\ ]*-spec\.md' src 2>/dev/null)"
g1_rc=$?
if [ $g1_rc -eq 0 ]; then
  printf 'G1 VIOLATION: RULE-01 -spec suffix 참조 hit (specs/30.spec/...-spec.md):\n%s\n' "$g1_out" >&2
  violations=1
elif [ $g1_rc -eq 2 ]; then
  printf 'G1 ERROR: grep exit 2 (검색 오류)\n' >&2
  violations=1
fi

# G2: src 추출 spec 경로 전원 디스크 실재.
# grep -h: 파일명 prefix 제거. -o: 매치만. sort -u: 중복 제거.
g2_paths="$(grep -rhoE 'specs/30\.spec/(blue|green)/[^"`\ ]*\.md' src 2>/dev/null | sort -u)"
if [ -n "$g2_paths" ]; then
  missing=0
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [ ! -e "$p" ]; then
      printf 'G2 VIOLATION: MISSING %s\n' "$p" >&2
      missing=1
    fi
  done <<EOF
$g2_paths
EOF
  if [ $missing -ne 0 ]; then
    violations=1
  fi
fi

if [ $violations -ne 0 ]; then
  exit 1
fi

printf 'check-spec-coherence: G1 0 hit / G2 0 MISSING (src/** ↔ specs/30.spec/**)\n'
exit 0
