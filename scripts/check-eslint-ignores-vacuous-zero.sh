#!/usr/bin/env bash
# check-eslint-ignores-vacuous-zero.sh
# Spec: specs/30.spec/blue/foundation/tooling.md §동작 9 (REQ-013) + §테스트 현황 line 206 (FR-07) + §수용 기준 line 268 (Should, FR-07)
# Task: TSK-20260518-21
#
# G-9.1 (배열 위치/길이): eslint.config.js 의 `{ ignores: [...] }` 객체 선언 hit=1 expected.
# G-9.2 (패턴 cardinality ≥ 1) — vacuous-zero 검출:
#   ignores 배열의 **각 패턴** 이 실재하는 디렉터리를 가리켜야 한다. 아무것도
#   가리키지 않는 패턴은 있으나 마나이고, 있으나 마나인 줄 모른 채 남는다.
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   판정 대상은 `eslint.config.js` 의 ignores 배열에서 **읽어 낸다**. 예전에는
#   네 패턴을 스크립트에 박아 두었고, 그래서 **새로 추가된 패턴은 판정 밖** 이었다.
#   실측: 배열에 `'does-not-exist-xyz/**'` 를 넣어도 exit 0 이었다 — 이 게이트가
#   막으라는 것이 정확히 그것이다. (헤더는 "5 패턴" 이라 적고 넷만 열거하고 있었다.)
#
# 판정 범위 — 디렉터리 형태 패턴(`<name>/**` · `**/<name>/**`) 한정이다.
#   그 밖의 표기(파일 glob 등)는 **무판정** 으로 stderr 에 이름을 내고 exit 2 한다.
#   조용히 통과시키면 "판정했다" 로 오독된다 (RULE-06 §추출 실패 검출).
#
# exit 0: G-9.1 + G-9.2 모두 PASS (ack 1줄 stdout).
# exit 1: 어느 게이트라도 위반 (stderr 상세 + 라벨).
# exit 2: 무판정 — 패턴 추출 0건이거나 디렉터리 형태가 아닌 패턴이 있다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ESLINT_CFG="$ROOT/eslint.config.js"

if [ ! -f "$ESLINT_CFG" ]; then
  printf 'check-eslint-ignores-vacuous-zero: %s not found\n' "$ESLINT_CFG" >&2
  exit 1
fi

cd "$ROOT" || exit 1

# G-9.1: `{ ignores: [...] }` 객체 선언 hit.
g91_lines="$(grep -nE "^[[:space:]]*\{[[:space:]]*ignores:" eslint.config.js 2>/dev/null)"
g91_hits="$(printf '%s\n' "$g91_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$g91_hits" != "1" ]; then
  printf 'G-9.1 VIOLATION: ignores 배열 선언 hit=%s expected=1\n' "$g91_hits" >&2
  exit 1
fi
g91_line="$(printf '%s\n' "$g91_lines" | sed -E 's/^([0-9]+):.*/\1/')"

# G-9.2: 배열에서 패턴을 읽어 각각의 cardinality 를 잰다.
patterns="$(sed -n "${g91_line}p" eslint.config.js \
  | grep -oE "'[^']+'" \
  | tr -d "'")"

if [ -z "$patterns" ]; then
  printf 'check-eslint-ignores-vacuous-zero: 무판정 — ignores 배열에서 패턴 추출 0건 (@line=%s)\n' "$g91_line" >&2
  exit 2
fi

acks=""
while IFS= read -r pattern; do
  [ -n "$pattern" ] || continue

  # 디렉터리 형태만 판정한다: `<name>/**` 또는 `**/<name>/**`.
  case "$pattern" in
    */\*\*) ;;
    *)
      printf 'check-eslint-ignores-vacuous-zero: 무판정 — 디렉터리 형태가 아닌 패턴: %s\n' "$pattern" >&2
      exit 2
      ;;
  esac

  name="${pattern%/\*\*}"
  name="${name#\*\*/}"

  case "$name" in
    */*|'')
      printf 'check-eslint-ignores-vacuous-zero: 무판정 — 중첩 경로 패턴: %s\n' "$pattern" >&2
      exit 2
      ;;
  esac

  # node_modules 자신을 잴 때만 그 안을 들여다본다.
  if [ "$name" = "node_modules" ]; then
    count="$(find . -maxdepth 2 -type d -name "$name" 2>/dev/null | wc -l | tr -d ' ')"
  else
    count="$(find . -type d -name "$name" \
      -not -path "./node_modules/*" -not -path "./build/*" -not -path "./coverage/*" \
      2>/dev/null | wc -l | tr -d ' ')"
  fi

  if [ "$count" = "0" ]; then
    printf 'G-9.2 VIOLATION: %s cardinality=0 (vacuous-zero violation)\n' "$pattern" >&2
    exit 1
  fi

  acks="$acks $pattern=$count"
done <<EOF
$patterns
EOF

printf 'check-eslint-ignores-vacuous-zero: G-9.1 PASS (1 array @line=%s) + G-9.2 PASS (%s)\n' \
  "$g91_line" "$(printf '%s' "$acks" | sed 's/^ //')"
exit 0
