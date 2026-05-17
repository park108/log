#!/usr/bin/env bash
# check-vite-env-coherence.sh
# Spec: specs/30.spec/green/foundation/vite-env-boundary-typing.md §동작 G1·G2 + §수용 기준 Should (G4)
# Task: TSK-20260517-08
#
# G1 (cast 금지): grep -rnE 'import\.meta\.env\.VITE_[A-Z_]+\s+as\s+string' src -> 0 hit.
# G2 (선언 동치): src/** 의 unique VITE_ key 집합 ⊆ src/types/env.d.ts 의 declared key 집합.
#                 (typecheck=tsc --noEmit 가 implicit any 로 G2 위반 동시 검출 — 본 스크립트는
#                  명시 측정으로 회귀 시점 즉시 진단 가능 박제.)
# 범위 (G5): src/** 한정. .env / vite.config.ts / .js 파일은 본 게이트 영역 밖.
#
# exit 0: 두 게이트 PASS (ack 1 줄 출력).
# exit 1: G1 또는 G2 위반 (stderr 상세).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/src"
ENV_DECL="$SRC_DIR/types/env.d.ts"

if [ ! -d "$SRC_DIR" ]; then
  printf 'check-vite-env-coherence: src/ not found at %s\n' "$SRC_DIR" >&2
  exit 1
fi

if [ ! -f "$ENV_DECL" ]; then
  printf 'check-vite-env-coherence: %s not found\n' "$ENV_DECL" >&2
  exit 1
fi

cd "$ROOT" || exit 1

violations=0

# G1: as string 캐스팅 금지 (TS 파일 한정).
# grep exit: 0 = match (위반), 1 = no match (PASS), 2 = error.
g1_out="$(grep -rnE 'import\.meta\.env\.VITE_[A-Z_]+[[:space:]]+as[[:space:]]+string' src 2>/dev/null)"
g1_rc=$?
if [ $g1_rc -eq 0 ]; then
  printf 'G1 VIOLATION: import.meta.env.VITE_* as string 캐스팅 hit:\n%s\n' "$g1_out" >&2
  violations=1
elif [ $g1_rc -eq 2 ]; then
  printf 'G1 ERROR: grep exit 2 (검색 오류)\n' >&2
  violations=1
fi

# G2: src 참조 VITE_ key 집합 ⊆ env.d.ts 선언 키 집합.
used_keys="$(grep -rhoE 'import\.meta\.env\.VITE_[A-Z_]+' src 2>/dev/null \
  | sed -E 's/.*\.(VITE_[A-Z_]+).*/\1/' \
  | sort -u)"
declared_keys="$(grep -oE '^[[:space:]]+readonly[[:space:]]+VITE_[A-Z_]+' "$ENV_DECL" 2>/dev/null \
  | sed -E 's/.*(VITE_[A-Z_]+).*/\1/' \
  | sort -u)"

if [ -z "$declared_keys" ]; then
  printf 'G2 VIOLATION: %s 에 readonly VITE_* 선언 0건\n' "$ENV_DECL" >&2
  violations=1
elif [ -n "$used_keys" ]; then
  missing="$(comm -23 <(printf '%s\n' "$used_keys") <(printf '%s\n' "$declared_keys"))"
  if [ -n "$missing" ]; then
    printf 'G2 VIOLATION: src 참조 키 중 env.d.ts 미선언:\n%s\n' "$missing" >&2
    violations=1
  fi
fi

if [ $violations -ne 0 ]; then
  exit 1
fi

used_count="$(printf '%s\n' "$used_keys" | sed '/^$/d' | wc -l | tr -d ' ')"
decl_count="$(printf '%s\n' "$declared_keys" | sed '/^$/d' | wc -l | tr -d ' ')"
printf 'check-vite-env-coherence: G1 0 cast / G2 %s used ⊆ %s declared (src/** ↔ src/types/env.d.ts)\n' \
  "$used_count" "$decl_count"
exit 0
