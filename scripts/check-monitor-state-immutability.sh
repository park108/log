#!/usr/bin/env bash
# check-monitor-state-immutability.sh
# Spec: components/monitor §동작 (G-1) · §발화 채널 · §회귀 중점 (R-3)(R-4)
# Task: TSK-20260825-03
#
# G-1: `useState` 로 얻은 파생 state 바인딩을 **in-place 변이** 해서는 안 된다.
#      변이한 뒤 같은 참조를 set 하면 갱신 경로가 잊은 필드가 초기값으로 살아남아
#      화면에 조용히 고착된다 (실제 결함: WebVitalsItem 헤더가 영구 `(0)`).
#      갱신은 새 객체 조립 → 교체로만 한다.
#
# 검출 선언 (6 방향) — 아래 (D-x) 목록은 본문 §검출 방향 표와 **1:1** 이다.
#   두 집합이 어긋나면 스캔 전에 exit 1 한다 (§선언·구현 정합 단언). 이번 확대의
#   근인이 "헤더가 선언한 것보다 구현이 좁았다" 이므로 그 어긋남 자체를 게이트가 본다.
#   (D-a) 점 표기 대입        `state.x = v` / `state.a.b = v` / `state.n += 1`
#                             / `state.a ||= 2` / `state.a ??= 2` / `state.n <<= 1`
#   (D-b) 대괄호 표기 대입    `state["x"] = v` / `state["x"] += 1`
#   (D-c) Object.assign 1인자 `Object.assign(state, {...})`
#   (D-d) 증감                `state.n++` / `state.n--` / `++state.n` / `--state.n`
#   (D-e) 배열 변이 메서드    `state.arr.push(v)` — Array.prototype mutator 9종
#   (D-f) delete              `delete state.x`
#
# (D-a) 의 대입 연산자는 ECMAScript 가 정한 **유한 집합**이라 열거 없이 덮인다:
#   `= += -= *= /= %= **= <<= >>= >>>= &= |= ^= &&= ||= ??=`
#   비교 연산자는 끌어들이지 않는다 — `[^=]` 가 `== ===` 를, 문자 클래스가 `!`·`<`·`>`
#   단독을 막는다. 시프트 대입만은 2자 이상 명시 대안(`<<=` `>>=` `>>>=`)으로 넣어
#   `state.a <= b` · `state.a >= b` 비교를 오탐하지 않으면서 검출한다.
# (D-e) 목록의 출처는 언어 명세다 — Array.prototype 의 in-place mutator 는
#   push pop shift unshift splice sort reverse fill copyWithin 9종으로 닫혀 있다.
#
# 미선언 방향: 멀티라인 대입(`state.x\n  = v`). 행 선두 앵커 패턴이 보지 못한다.
#   선언하지 않았다는 사실을 여기 박제한다 — 검출 공백은 기록되지 않으면 존재하지
#   않는 것으로 오독된다. 확대하려면 별도 task 로 방향을 추가하고 주입 검증한다.
# 미선언 방향: 별칭 경유 변이(`const r = state; r.x = v`). 도출 식별자와 이름이 달라
#   행 선두 앵커가 매치하지 않는다. 마찬가지로 미선언이다.
# 미선언 방향: 섀도잉된 식별자. 도출 바인딩과 **같은 이름**이 같은 파일에서 재선언되면
#   (`for (let os of osList)` · `const rate = ...`) 텍스트 판정으로는 둘을 구분할 수
#   없다. 행 선두 앵커에 의존하는 방향(D-a·D-b·D-d·D-e·D-f)에서 그 식별자를 판정
#   대상에서 제외하며, **제외한 수를 ack 라인의 `shadowed=N` 으로 낸다**. 조용한
#   skip 은 이 게이트가 없애려는 상태(기록되지 않은 공백)를 새로 만든다.
#   제외가 전체 바인딩의 과반이면 공허 통과에 준하므로 exit 1 한다.
#
# 스캔 대상·검사 식별자는 **도출**한다 (RULE-06 §열거 고정 금지):
#   파일   = find "$SCAN_ROOT" \( -name '*.jsx' -o -name '*.tsx' \) ! -name '*.test.*'
#   식별자 = 각 파일의 `const [<id>` 구조분해 첫 바인딩
# 하드코딩된 목록은 이후 추가된 파일을 스캔 범위 밖에 숨긴다.
#
# 공허 통과 가드: 스캔 파일 0건 또는 도출 바인딩 0건이면 위반으로 종료한다.
#   대상 집합이 비면 "위반 0건" 은 무조건 참이 되어 게이트가 검출력 0 인 채로
#   영구히 초록을 낸다.
#
# (I9) 활성 출현 확인 — 이 게이트의 판정 패턴 중 5 방향(D-a·D-b·D-d·D-e·D-f)은
#   행 선두 앵커(`^[[:space:]]*`)로 시작하므로 `//` 로 시작하는 주석 줄은 구조적으로
#   매치할 수 없다. 즉 금지 토큰을 주석에 적는 것만으로는 위반이 되지 않는다.
#   앵커가 없는 D-c(`free`)만은 예외다 — 주석 안의 `Object.assign(state,` 를 잡는다.
#   그 사실을 감추지 않고 여기 적는다. 두 성질 모두 주입 왕복으로 확인했다
#   (주석 1줄 추가 → rc 0 유지 · 실코드 1줄 추가 → rc 1).
# (I10) 효력면 한쪽 고정 — 라벨 집합끼리의 텍스트 비교는 양쪽이 텍스트라 라벨을
#   남긴 채 정규식만 도달 불가로 바꾸면 통과한다 (실측: `delete` →
#   `deleteZZZUNREACHABLE` 로 바꿔도 rc 0 · `directions=6`). 그래서 정합 단언의
#   한쪽을 **효력면**으로 고정한다: 방향마다 위반 표본 1줄·정상 표본 1줄을 두고
#   실판정과 **같은 함수**(`direction_hits`)로 돌려 위반 hit=1 · 정상 hit=0 을
#   확인한다. 자가 확인을 통과한 방향만 `directions=N` 에 계수되므로 이 수치는
#   "표의 행 수" 가 아니라 "효력이 확인된 방향 수" 다.
# exit 0: PASS (ack 1 줄에 root/files/bindings/shadowed/directions 수치 출력).
# exit 1: 위반 검출 · 공허 통과 · 섀도잉 과반 · 선언↔구현 불일치 (stderr 상세).

set -u

SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

SCAN_ROOT="${MONITOR_STATE_SCAN_ROOT:-src/Monitor}"

# --- 검출 방향 표 -------------------------------------------------------------
# 이 표가 **유일한 실행 원천**이다. 아래 §선언·구현 정합 단언이 헤더 (D-x) 선언과
# 이 표의 라벨 집합을 비교하므로, 한쪽만 늘리거나 줄이면 게이트가 스스로 죽는다.
# `@ID@` 는 도출 바인딩 이름으로 치환된다. 3열은 앵커 의존 여부 —
# `anchored` 방향은 섀도잉된 식별자에서 제외되고 `free` 는 그대로 판정한다.
DIRECTIONS="$(printf '%s\n' \
"D-a	^[[:space:]]*@ID@(\.[A-Za-z0-9_\$]+)+[[:space:]]*([-+*/%|&^?]*=[^=]|(>>>|<<|>>)=[^=])	anchored" \
"D-b	^[[:space:]]*@ID@\[[^]]+\][[:space:]]*([-+*/%|&^?]*=[^=]|(>>>|<<|>>)=[^=])	anchored" \
"D-c	Object\.assign\([[:space:]]*@ID@[[:space:]]*,	free" \
"D-d	^[[:space:]]*((\+\+|--)[[:space:]]*@ID@(\.[A-Za-z0-9_\$]+)+|@ID@(\.[A-Za-z0-9_\$]+)+[[:space:]]*(\+\+|--))	anchored" \
"D-e	^[[:space:]]*@ID@(\.[A-Za-z0-9_\$]+)*\.(push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin)\(	anchored" \
"D-f	^[[:space:]]*delete[[:space:]]+@ID@(\.[A-Za-z0-9_\$]+)+	anchored")"

# `@ID@` 치환과 판정을 한 곳에 둔다. **자가 확인과 실판정은 이 함수의 서로 다른
# 호출일 뿐 사본이 아니다** — 사본 둘을 두면 사본이 갈라지고, 실판정 경로를
# 들어내도 자가 확인만 초록으로 남는다 (참조 구현:
# `scripts/check-summary-drift.sh` 의 `population_verdict`).
direction_hits() {   # $1=템플릿 $2=식별자 $3=파일 → stdout: `행번호:행` (grep -nE)
  re="$(printf '%s' "$1" | sed "s/@ID@/${2}/g")"
  grep -nE "$re" "$3"
}

# --- 방향별 효력 표본 표 ------------------------------------------------------
# 1열 라벨 · 2열 **그 방향의 위반 1줄** · 3열 **잡히면 안 되는 정상 1줄**.
# 정상 표본은 같은 표면을 건드리는 near-miss 로 고른다 (비교 `===` · 새 객체 조립 ·
# 비변이 배열 메서드 · 구조분해 제외) — 과잉 특정과 과소 특정을 함께 잰다.
PROBE_ID="probeState"
SAMPLES="$(printf '%s\n' \
"D-a	  @ID@.count = 1;	  @ID@.count === 1;" \
"D-b	  @ID@[\"k\"] = 1;	  @ID@[\"k\"] === 1;" \
"D-c	  const next = Object.assign(@ID@, { k: 1 });	  const next = Object.assign({}, @ID@, { k: 1 });" \
"D-d	  @ID@.count++;	  const n = @ID@.count + 1;" \
"D-e	  @ID@.list.push(1);	  const next = @ID@.list.concat(1);" \
"D-f	  delete @ID@.k;	  const { k, ...rest } = @ID@;")"

# --- 선언·구현 정합 단언 ------------------------------------------------------
# 이번 확대의 근인은 "헤더가 (D-a) 를 점 표기 대입이라 선언하는데 구현은 `+=` 를
# 보지 못했다" 였다 — 선언과 구현이 어긋나도 아무도 죽지 않았다. 그 어긋남을
# 게이트가 직접 잡는다. 주석 문구 계수가 아니라 **실행 표의 라벨 집합**과 비교하므로
# 주석 한 줄을 늘리는 것으로는 통과할 수 없다 (헤더만 늘면 즉시 불일치다).
DECLARED_LABELS="$(grep -E '^#   \(D-[a-z]\)' "$SELF" | sed -E 's/^#   \((D-[a-z])\).*/\1/' | sort)"
IMPL_LABELS="$(printf '%s\n' "$DIRECTIONS" | cut -f1 | grep -E '^D-[a-z]$' | sort)"
declared_count="$(printf '%s\n' "$DECLARED_LABELS" | grep -c . || true)"
impl_count="$(printf '%s\n' "$IMPL_LABELS" | grep -c . || true)"

if [ "${declared_count:-0}" -eq 0 ] || [ "${impl_count:-0}" -eq 0 ]; then
  printf 'check-monitor-state-immutability: 선언·구현 정합 단언이 공허하다 (declared=%s impl=%s)\n' \
    "${declared_count:-0}" "${impl_count:-0}" >&2
  printf '  한쪽이 0 이면 두 집합 비교는 아무것도 측정하지 않는다.\n' >&2
  exit 1
fi

if [ "$DECLARED_LABELS" != "$IMPL_LABELS" ]; then
  printf 'check-monitor-state-immutability: 선언↔구현 불일치 (헤더 %s 방향 vs 실행 표 %s 방향)\n' \
    "$declared_count" "$impl_count" >&2
  printf '  헤더 선언: %s\n' "$(printf '%s' "$DECLARED_LABELS" | tr '\n' ' ')" >&2
  printf '  실행 표  : %s\n' "$(printf '%s' "$IMPL_LABELS" | tr '\n' ' ')" >&2
  printf '  검출 공백은 기록되지 않으면 없는 것으로 오독된다 — 둘을 함께 고쳐라.\n' >&2
  exit 1
fi

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

# --- 효력면 자가 확인 (I10) ---------------------------------------------------
# 라벨 집합 비교의 한쪽을 효력면으로 고정한다. 표의 각 방향에 대해 실판정과 같은
# 함수를 돌려 **위반 표본 1 hit · 정상 표본 0 hit** 를 확인한다. 하나라도 깨지면
# 어느 라벨인지 지목하고 exit 1 한다 — 라벨만 남고 정규식이 도달 불가가 된 상태는
# 여기서 죽는다. 표본이 비면 그 자체가 공허이므로 먼저 막는다.
SAMPLE_V="$TMP_DIR/sample-violation"
SAMPLE_C="$TMP_DIR/sample-clean"
verified_count=0

sample_label_count="$(printf '%s\n' "$SAMPLES" | cut -f1 | grep -c '^D-[a-z]$' || true)"
if [ "${sample_label_count:-0}" -ne "$impl_count" ]; then
  printf 'check-monitor-state-immutability: 효력 표본 누락 (samples=%s impl=%s)\n' \
    "${sample_label_count:-0}" "$impl_count" >&2
  printf '  표본 없는 방향은 효력이 확인되지 않은 방향이다 — directions 계수가 공허해진다.\n' >&2
  exit 1
fi

while IFS="$(printf '\t')" read -r label tmpl kind; do
  [ -n "$label" ] || continue
  s_row="$(printf '%s\n' "$SAMPLES" | grep "^${label}$(printf '\t')" || true)"
  if [ -z "$s_row" ]; then
    printf 'check-monitor-state-immutability: 효력 미확인 방향 %s — 표본 행이 없다\n' "$label" >&2
    exit 1
  fi
  v_line="$(printf '%s' "$s_row" | cut -f2 | sed "s/@ID@/${PROBE_ID}/g")"
  c_line="$(printf '%s' "$s_row" | cut -f3 | sed "s/@ID@/${PROBE_ID}/g")"
  if [ -z "$v_line" ] || [ -z "$c_line" ]; then
    printf 'check-monitor-state-immutability: 효력 미확인 방향 %s — 표본이 비었다\n' "$label" >&2
    exit 1
  fi
  printf '%s\n' "$v_line" > "$SAMPLE_V"
  printf '%s\n' "$c_line" > "$SAMPLE_C"

  v_hit="$(direction_hits "$tmpl" "$PROBE_ID" "$SAMPLE_V" | grep -c . || true)"
  c_hit="$(direction_hits "$tmpl" "$PROBE_ID" "$SAMPLE_C" | grep -c . || true)"
  if [ "${v_hit:-0}" -ne 1 ] || [ "${c_hit:-0}" -ne 0 ]; then
    printf 'check-monitor-state-immutability: 효력 미확인 방향 %s (위반표본 hit=%s 기대 1 · 정상표본 hit=%s 기대 0)\n' \
      "$label" "${v_hit:-0}" "${c_hit:-0}" >&2
    printf '  위반 표본: %s\n' "$v_line" >&2
    printf '  정상 표본: %s\n' "$c_line" >&2
    printf '  라벨이 남아 있어도 정규식이 자기 방향을 잡지 못하면 그 방향은 판정되지 않는다.\n' >&2
    exit 1
  fi
  verified_count=$((verified_count + 1))
done <<EOF
$DIRECTIONS
EOF

if [ "$verified_count" -ne "$impl_count" ]; then
  printf 'check-monitor-state-immutability: 효력 확인 방향 수 불일치 (verified=%s impl=%s)\n' \
    "$verified_count" "$impl_count" >&2
  exit 1
fi

# `while` 루프는 파이프 서브셸에서 돌아 카운터 대입이 소실된다 — 집계는 파일로 한다.
# `for f in $var` 형태의 비인용 변수 분할에 의존하지 않는다: zsh 는 분할하지 않아
# 파일 목록 전체가 단일 인자로 넘어가고 판정이 조용히 0 을 낸다.
find "$SCAN_ROOT" \( -name '*.jsx' -o -name '*.tsx' \) ! -name '*.test.jsx' ! -name '*.test.tsx' | sort > "$FILES"

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

# --- 섀도잉 판정 --------------------------------------------------------------
# 도출 바인딩과 **같은 이름**이 같은 파일에서 재선언되면 (`for (let os of osList)` ·
# `const rate = ...`) 행 선두 앵커 패턴은 둘을 구분할 수 없다. 실측 오탐이 그 형태다:
# `src/Monitor/VisitorMon.jsx:120` 의 `++os.count` 는 `:20` 의 useState 바인딩 `os` 가
# 아니라 `:117` 루프 변수이며, 대상은 setOs 직전에 조립되는 지역 배열이다.
# 조용히 건너뛰지 않는다 — 제외 수를 ack 에 낸다.
SHADOWED="$TMP_DIR/shadowed"
: > "$SHADOWED"

# --- 검출 6 방향 --------------------------------------------------------------
TAB="$(printf '\t')"
while IFS="$TAB" read -r f id; do
  [ -n "$f" ] || continue
  [ -n "$id" ] || continue

  is_shadowed=0
  if grep -qE "(for[[:space:]]*\([[:space:]]*(let|const|var)[[:space:]]+${id}[^A-Za-z0-9_\$]|^[[:space:]]*(let|const|var)[[:space:]]+${id}[[:space:]]*=)" "$f"; then
    is_shadowed=1
    printf '%s\t%s\n' "$f" "$id" >> "$SHADOWED"
  fi

  while IFS="$TAB" read -r label tmpl kind; do
    [ -n "$label" ] || continue
    [ "$is_shadowed" -eq 1 ] && [ "$kind" = "anchored" ] && continue
    direction_hits "$tmpl" "$id" "$f" | sed "s|^|${label}${TAB}${f}:|" >> "$VIOLATIONS"
  done <<EOF
$DIRECTIONS
EOF
done < "$BINDINGS"

shadowed_count="$(grep -c . "$SHADOWED" 2>/dev/null || true)"
shadowed_count="${shadowed_count:-0}"

# 제외가 과반이면 판정 대상이 대부분 사라진 것이라 공허 통과에 준한다.
if [ $((shadowed_count * 2)) -gt "$binding_count" ]; then
  printf 'check-monitor-state-immutability: vacuous zero: 섀도잉 제외 과반 (shadowed=%s bindings=%s)\n' \
    "$shadowed_count" "$binding_count" >&2
  printf '  판정 대상 대부분이 앵커 방향에서 빠졌다 — 남은 "위반 0건" 은 측정이 아니다.\n' >&2
  exit 1
fi

violation_count="$(grep -c . "$VIOLATIONS" 2>/dev/null || true)"
violation_count="${violation_count:-0}"

if [ "$violation_count" -ne 0 ]; then
  printf 'check-monitor-state-immutability: G-1 VIOLATION %s hit (root=%s files=%s bindings=%s shadowed=%s directions=%s)\n' \
    "$violation_count" "$SCAN_ROOT" "$file_count" "$binding_count" "$shadowed_count" "$verified_count" >&2
  printf '  파생 state 는 in-place 변이 대신 새 객체 조립 → 교체로 갱신한다.\n' >&2
  while IFS= read -r line; do
    printf '  %s\n' "$line" >&2
  done < "$VIOLATIONS"
  exit 1
fi

printf 'check-monitor-state-immutability: G-1 0 hit (root=%s files=%s bindings=%s shadowed=%s directions=%s)\n' \
  "$SCAN_ROOT" "$file_count" "$binding_count" "$shadowed_count" "$verified_count"
exit 0
