#!/usr/bin/env bash
# check-monitor-state-immutability.sh
# Spec: components/monitor-derived-state-immutability §동작 (G-1) · §발화 채널 · §회귀 중점 (R-3)(R-4)
# Task: TSK-20260825-03
#
# G-1: `useState` 로 얻은 파생 state 바인딩을 **in-place 변이** 해서는 안 된다.
#      변이한 뒤 같은 참조를 set 하면 갱신 경로가 잊은 필드가 초기값으로 살아남아
#      화면에 조용히 고착된다 (실제 결함: WebVitalsItem 헤더가 영구 `(0)`).
#      갱신은 새 객체 조립 → 교체로만 한다.
#
# 검출 선언 (3 방향):
#   (D-a) 점 표기 대입        `state.x = v` / `state.a.b = v`
#   (D-b) 대괄호 표기 대입    `state["x"] = v`
#   (D-c) Object.assign 1인자 `Object.assign(state, {...})`
#
# 미선언 방향: 멀티라인 대입(`state.x\n  = v`). 행 선두 앵커 패턴이 보지 못한다.
#   선언하지 않았다는 사실을 여기 박제한다 — 검출 공백은 기록되지 않으면 존재하지
#   않는 것으로 오독된다. 확대하려면 별도 task 로 방향을 추가하고 주입 검증한다.
# 미선언 방향: 별칭 경유 변이(`const r = state; r.x = v`). 도출 식별자와 이름이 달라
#   행 선두 앵커가 매치하지 않는다. 마찬가지로 미선언이다.
#
# 스캔 대상·검사 식별자는 **도출**한다 (RULE-06 §열거 고정 금지):
#   파일   = find "$SCAN_ROOT" -name '*.jsx' ! -name '*.test.jsx'
#   식별자 = 각 파일의 `const [<id>` 구조분해 첫 바인딩
# 하드코딩된 목록은 이후 추가된 파일을 스캔 범위 밖에 숨긴다.
#
# 공허 통과 가드: 스캔 파일 0건 또는 도출 바인딩 0건이면 위반으로 종료한다.
#   대상 집합이 비면 "위반 0건" 은 무조건 참이 되어 게이트가 검출력 0 인 채로
#   영구히 초록을 낸다.
#
# exit 0: PASS (ack 1 줄에 root/files/bindings 수치 출력).
# exit 1: 위반 검출 또는 공허 통과 (stderr 상세).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

SCAN_ROOT="${MONITOR_STATE_SCAN_ROOT:-src/Monitor}"

if [ ! -d "$SCAN_ROOT" ]; then
  printf 'check-monitor-state-immutability: scan root not found: %s\n' "$SCAN_ROOT" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

FILES="$TMP_DIR/files"
BINDINGS="$TMP_DIR/bindings"
VIOLATIONS="$TMP_DIR/violations"
: > "$BINDINGS"
: > "$VIOLATIONS"

# `while` 루프는 파이프 서브셸에서 돌아 카운터 대입이 소실된다 — 집계는 파일로 한다.
# `for f in $var` 형태의 비인용 변수 분할에 의존하지 않는다: zsh 는 분할하지 않아
# 파일 목록 전체가 단일 인자로 넘어가고 판정이 조용히 0 을 낸다.
find "$SCAN_ROOT" -name '*.jsx' ! -name '*.test.jsx' | sort > "$FILES"

file_count="$(wc -l < "$FILES" | tr -d ' ')"

while IFS= read -r f; do
  [ -n "$f" ] || continue
  grep -oE 'const \[[A-Za-z_$][A-Za-z0-9_$]*' "$f" \
    | sed 's/const \[//' \
    | sort -u \
    | while IFS= read -r id; do
        [ -n "$id" ] && printf '%s\t%s\n' "$f" "$id"
      done
done < "$FILES" >> "$BINDINGS"

binding_count="$(wc -l < "$BINDINGS" | tr -d ' ')"

# --- 공허 통과 가드 -----------------------------------------------------------
if [ "$file_count" -eq 0 ]; then
  printf 'check-monitor-state-immutability: vacuous zero: 스캔 대상 0건 (root=%s)\n' "$SCAN_ROOT" >&2
  printf '  대상 집합이 공집합이면 "위반 0건" 은 무조건 참이 된다 — 검출력 0.\n' >&2
  exit 1
fi

if [ "$binding_count" -eq 0 ]; then
  printf 'check-monitor-state-immutability: vacuous zero: 도출 바인딩 0건 (root=%s files=%s)\n' "$SCAN_ROOT" "$file_count" >&2
  printf '  검사할 식별자가 없으면 판정은 아무것도 측정하지 않는다.\n' >&2
  exit 1
fi

# --- 검출 3 방향 --------------------------------------------------------------
while IFS="$(printf '\t')" read -r f id; do
  [ -n "$f" ] || continue
  [ -n "$id" ] || continue

  # (D-a) 점 표기 대입 — `=` 뒤 `=` 를 제외해 비교(==/===)를 걸러낸다.
  grep -nE "^[[:space:]]*${id}(\.[A-Za-z0-9_\$]+)+[[:space:]]*=[^=]" "$f" \
    | sed "s|^|D-a\t${f}:|" >> "$VIOLATIONS"

  # (D-b) 대괄호 표기 대입.
  grep -nE "^[[:space:]]*${id}\[[^]]+\][[:space:]]*=[^=]" "$f" \
    | sed "s|^|D-b\t${f}:|" >> "$VIOLATIONS"

  # (D-c) Object.assign 1인자 변이 — 행 선두 앵커 없이 검색한다.
  grep -nE "Object\.assign\([[:space:]]*${id}[[:space:]]*," "$f" \
    | sed "s|^|D-c\t${f}:|" >> "$VIOLATIONS"
done < "$BINDINGS"

violation_count="$(grep -c . "$VIOLATIONS" 2>/dev/null || true)"
violation_count="${violation_count:-0}"

if [ "$violation_count" -ne 0 ]; then
  printf 'check-monitor-state-immutability: G-1 VIOLATION %s hit (root=%s files=%s bindings=%s)\n' \
    "$violation_count" "$SCAN_ROOT" "$file_count" "$binding_count" >&2
  printf '  파생 state 는 in-place 변이 대신 새 객체 조립 → 교체로 갱신한다.\n' >&2
  while IFS= read -r line; do
    printf '  %s\n' "$line" >&2
  done < "$VIOLATIONS"
  exit 1
fi

printf 'check-monitor-state-immutability: G-1 0 hit (root=%s files=%s bindings=%s)\n' \
  "$SCAN_ROOT" "$file_count" "$binding_count"
exit 0
