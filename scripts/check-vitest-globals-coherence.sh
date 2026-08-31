#!/usr/bin/env bash
# check-vitest-globals-coherence.sh
# Spec: specs/30.spec/blue/foundation/tooling.md §동작 10 (REQ-015, vitest globals 3-채널 정합)
#       + §테스트 현황 line 212 (REQ-015 FR-06) + §수용 기준 line 281 (Should, REQ-015 FR-06)
# Task: TSK-20260518-22 · TSK-20260901-10 (판정면 정상화)
#
# G-10.1: 채널 A — vite.config.js `test.globals: true` 활성 출현 1건.
# G-10.2: 채널 B — tsconfig.json `compilerOptions.types` 배열의 원소 `vitest/globals` 1건.
# G-10.3: 채널 C — eslint.config.js 9 helper readonly 등록
#         (describe/it/test/expect/vi/beforeAll/beforeEach/afterAll/afterEach) 각 1건.
#
# (I9) 활성 출현 확인 — 세 채널 모두 **주석은 판정에 들어오지 않는다**.
#   A·C 는 행 선두 앵커(`^[[:space:]]*`)라 `//` 로 시작하는 줄이 구조적으로 매치할 수
#   없다. B 는 텍스트 계수를 버리고 배열 원소 판정으로 바꿨으므로 주석은 애초에
#   원소가 아니다. 세 성질 전부 아래 §자가 확인에서 **매 실행마다** 왕복으로 잰다
#   (활성 표본 hit=1 · 주석 표본 hit=0 · 부정 표본 hit=0).
#
# (I10) 효력면 한쪽 고정 — 채널 B 의 판정면을 텍스트에서 **효력면**으로 옮겼다.
#   구 판정은 `grep -cE '"vitest/globals"' tsconfig.json` 이었고 양쪽이 텍스트라
#   반대 방향 두 결함을 동시에 갖고 있었다 (실측, TSK-20260901-10 §배경):
#     방향 A — `types` 를 `"vitest/NOTGLOBALS"` 로 죽이고 주석 `// "vitest/globals"`
#              한 줄만 남기면 hit=1 이 유지돼 **rc=0**. 등록이 사라졌는데 초록이다.
#     방향 B — 등록은 그대로 두고 주석 1줄만 더하면 hit=2 로 **rc=1**. 안티패턴을
#              문서화하는 정상 변경이 붉어진다.
#   두 방향은 반대로 보이지만 처방은 하나다 — **주석은 배열 원소가 아니다.**
#   JSONC 주석을 문자열 리터럴을 존중하며 걷어낸 뒤 `JSON.parse` 하고,
#   `compilerOptions.types` 배열에서 원소를 센다. 파싱 불가는 통과가 아니라 무판정이다.
#
# 계수 형태 — `hit == N` 은 **토큰이 자기 줄에만 살 때만** 양방향이다. 주석이 계수에
#   섞이면 "제거 + 주석 대체" 가 hit 를 유지해 감소 방향이 통째로 눈멀고, 반대로
#   정상 주석 추가가 증가 방향의 오탐이 된다 — 채널 B 가 정확히 그 상태였다.
#   A·C 는 행 선두 앵커가 그 조건을 보장하므로 `hit == N` 을 유지한다.
# 채널 C 의 기대 집합은 **열거**다 (`REQUIRED_HELPERS`). vitest 가 노출하는 전역
#   목록은 이 저장소에서 도출할 원천이 없다. 열거 고정의 위험(RULE-06)을 보조 단언
#   두 개로 막는다: (1) 표 크기 == 머리말 선언 수 9, (2) 각 헬퍼를 **이름으로** 개별
#   판정해 누락·중복을 이름으로 지목한다. 표 밖 헬퍼가 추가로 등록되는 것은
#   **위반이 아니다** — 이 게이트의 명제는 "9 개가 등록돼 있다" 이지 "9 개뿐이다" 가
#   아니며, 후자로 읽으면 vitest 전역 확장이라는 정상 변경이 붉어진다.
#
# exit 0: 3 채널 모두 PASS (ack 1 줄 stdout).
# exit 1: 어느 채널이라도 위반 (stderr 상세). 첫 위반에서 단축 종료 (fail-fast).
# exit 2: 무판정 — tsconfig.json 파싱 불가 · node 부재 · 자가 확인 실패.
#         통과가 아니다. 재려던 것을 재지 못한 상태를 초록으로 내지 않는다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

VITE_CFG="$ROOT/vite.config.js"
TS_CFG="$ROOT/tsconfig.json"
ESLINT_CFG="$ROOT/eslint.config.js"

for f in "$VITE_CFG" "$TS_CFG" "$ESLINT_CFG"; do
  if [ ! -f "$f" ]; then
    printf 'check-vitest-globals-coherence: %s not found\n' "$f" >&2
    exit 1
  fi
done

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# --- 판정 원천 ----------------------------------------------------------------
RE_A="^[[:space:]]*globals:[[:space:]]*true"
RE_C_TMPL="^[[:space:]]*@H@:[[:space:]]*'readonly'"
REQUIRED_HELPERS="describe it test expect vi beforeAll beforeEach afterAll afterEach"

# --- 판정 함수 ----------------------------------------------------------------
# 자가 확인과 실판정은 **같은 함수의 서로 다른 호출**이며 사본이 아니다. 사본 둘을
# 두면 사본이 갈라지고, 실판정 경로를 들어내도 자가 확인만 초록으로 남는다.
# (참조 구현: scripts/check-summary-drift.sh 의 population_verdict)
anchored_hits() {   # $1=정규식 $2=파일 → stdout: 정수
  local re="$1" file="$2"
  grep -cE "$re" "$file" | tr -d ' '
}

helper_re() {   # $1=헬퍼 이름 → stdout: 그 헬퍼의 채널 C 정규식
  local h="$1"
  printf '%s' "$RE_C_TMPL" | sed "s/@H@/${h}/"
}

JSON_PROBE="$TMP_DIR/tsconfig-types.cjs"
cat > "$JSON_PROBE" <<'CJS'
// tsconfig.json 은 JSONC 다. 주석을 **문자열 리터럴을 존중하며** 걷어낸 뒤 파싱한다.
// 정규식 한 방으로 지우면 `"https://…"` 의 `//` 가 주석으로 오독된다.
const fs = require('node:fs');
const raw = fs.readFileSync(process.argv[2], 'utf8');
let out = '';
let i = 0;
let inStr = false;
let esc = false;
while (i < raw.length) {
	const c = raw[i];
	if (inStr) {
		out += c;
		if (esc) esc = false;
		else if (c === '\\') esc = true;
		else if (c === '"') inStr = false;
		i += 1;
		continue;
	}
	if (c === '"') { inStr = true; out += c; i += 1; continue; }
	if (c === '/' && raw[i + 1] === '/') { while (i < raw.length && raw[i] !== '\n') i += 1; continue; }
	if (c === '/' && raw[i + 1] === '*') {
		i += 2;
		while (i < raw.length && !(raw[i] === '*' && raw[i + 1] === '/')) i += 1;
		i += 2;
		continue;
	}
	out += c;
	i += 1;
}
out = out.replace(/,(\s*[}\]])/g, '$1');   // 후행 콤마는 JSONC 에서 합법이다
const cfg = JSON.parse(out);               // 실패 → 예외 → rc≠0 → 무판정
const types = cfg && cfg.compilerOptions ? cfg.compilerOptions.types : undefined;
if (types === undefined) {
	// `types` 부재는 구조 결손이 아니라 **등록 0** 이다 — 위반이지 무판정이 아니다.
	process.stdout.write('0 0');
	process.exit(0);
}
if (!Array.isArray(types)) {
	process.stderr.write('compilerOptions.types 가 배열이 아니다\n');
	process.exit(3);   // 무판정
}
const n = types.filter((t) => t === 'vitest/globals').length;
process.stdout.write(String(n) + ' ' + String(types.length));
CJS

types_probe() {   # $1=tsconfig 경로 → stdout: "<vitest/globals 원소수> <types 길이>" · rc 2 = 무판정
  local cfg="$1" out
  out="$(node "$JSON_PROBE" "$cfg" 2>/dev/null)" || return 2
  case "$out" in
    ''|*[!0-9\ ]*) return 2 ;;
  esac
  printf '%s' "$out"
  return 0
}

# --- 자가 확인 (I9)(I10) ------------------------------------------------------
# 실판정과 같은 함수로 표본을 돌려 **활성 hit=1 · 주석 hit=0 · 부정 hit=0** 을 확인한다.
# 하나라도 깨지면 무판정(exit 2)이다 — 판정면이 죽은 채로 초록을 내지 않는다.
selfcheck_fail() {
  printf 'check-vitest-globals-coherence: 무판정 — 자가 확인 실패 (%s)\n' "$1" >&2
  printf '  판정면이 자기 표본을 잡지 못하면 실트리의 "위반 0건" 은 측정이 아니다.\n' >&2
  exit 2
}

SC_ACTIVE="$TMP_DIR/sc-active"
SC_COMMENT="$TMP_DIR/sc-comment"
SC_NEGATED="$TMP_DIR/sc-negated"
selfcheck_n=0

# 채널 A 표본
printf '\tglobals: true,\n' > "$SC_ACTIVE"
printf '\t// globals: true,\n' > "$SC_COMMENT"
printf '\tglobals: false,\n' > "$SC_NEGATED"
[ "$(anchored_hits "$RE_A" "$SC_ACTIVE")" = "1" ]  || selfcheck_fail "채널 A 활성 표본 미검출"
[ "$(anchored_hits "$RE_A" "$SC_COMMENT")" = "0" ] || selfcheck_fail "채널 A 주석 표본이 판정에 들어왔다"
[ "$(anchored_hits "$RE_A" "$SC_NEGATED")" = "0" ] || selfcheck_fail "채널 A 부정 표본이 활성으로 계수됐다"
selfcheck_n=$((selfcheck_n + 3))

# 채널 C 표본 — 전 헬퍼에 대해 3 표본씩. 열거가 늘어도 자동으로 따라온다.
for h in $REQUIRED_HELPERS; do
  re="$(helper_re "$h")"
  printf "        %s: 'readonly',\n" "$h" > "$SC_ACTIVE"
  printf "        // %s: 'readonly',\n" "$h" > "$SC_COMMENT"
  printf "        %s: 'writable',\n" "$h" > "$SC_NEGATED"
  [ "$(anchored_hits "$re" "$SC_ACTIVE")" = "1" ]  || selfcheck_fail "채널 C/$h 활성 표본 미검출"
  [ "$(anchored_hits "$re" "$SC_COMMENT")" = "0" ] || selfcheck_fail "채널 C/$h 주석 표본이 판정에 들어왔다"
  [ "$(anchored_hits "$re" "$SC_NEGATED")" = "0" ] || selfcheck_fail "채널 C/$h 부정 표본이 활성으로 계수됐다"
  selfcheck_n=$((selfcheck_n + 3))
done

# 교차 특이도 — 방향 X 의 정규식이 방향 Y 의 활성 표본을 삼키면 위반 보고의 이름이
# 틀리게 붙고 rc 로는 드러나지 않는다. 대각선 밖은 전부 0 이어야 한다.
printf "        describe: 'readonly',\n" > "$SC_ACTIVE"
[ "$(anchored_hits "$RE_A" "$SC_ACTIVE")" = "0" ] || selfcheck_fail "교차: 채널 A 정규식이 채널 C 표본을 삼킨다"
printf '\tglobals: true,\n' > "$SC_ACTIVE"
[ "$(anchored_hits "$(helper_re describe)" "$SC_ACTIVE")" = "0" ] || selfcheck_fail "교차: 채널 C 정규식이 채널 A 표본을 삼킨다"
selfcheck_n=$((selfcheck_n + 2))
for h in $REQUIRED_HELPERS; do
  for g in $REQUIRED_HELPERS; do
    [ "$h" = "$g" ] && continue
    printf "        %s: 'readonly',\n" "$g" > "$SC_ACTIVE"
    [ "$(anchored_hits "$(helper_re "$h")" "$SC_ACTIVE")" = "0" ] \
      || selfcheck_fail "교차: 채널 C/$h 정규식이 $g 표본을 삼킨다"
    selfcheck_n=$((selfcheck_n + 1))
  done
done

# 채널 B 표본 — 이 task 의 두 결함 방향을 그대로 표본화한다.
SC_TS_ACTIVE="$TMP_DIR/sc-ts-active.json"
SC_TS_COMMENT="$TMP_DIR/sc-ts-comment.json"
SC_TS_BROKEN="$TMP_DIR/sc-ts-broken.json"
cat > "$SC_TS_ACTIVE" <<'JSONC'
{
	/* 블록 주석과 후행 콤마와 URL 문자열을 함께 둔다 — 스트리퍼 대표성 (RULE-06) */
	"$schema": "https://json.schemastore.org/tsconfig",
	"compilerOptions": {
		// 참고: "vitest/globals" 는 전역 헬퍼 타입을 켠다  ← 주석은 원소가 아니다
		"types": ["vitest/globals", "node"],
	}
}
JSONC
cat > "$SC_TS_COMMENT" <<'JSONC'
{
	"compilerOptions": {
		// "vitest/globals"
		"types": ["vitest/NOTGLOBALS", "node"]
	}
}
JSONC
printf '{ "compilerOptions": { "types": [\n' > "$SC_TS_BROKEN"

sc_b="$(types_probe "$SC_TS_ACTIVE")" || selfcheck_fail "채널 B 활성 표본 파싱 불가"
[ "${sc_b%% *}" = "1" ] || selfcheck_fail "채널 B 활성 표본 미검출 (원소수=${sc_b%% *})"
sc_b="$(types_probe "$SC_TS_COMMENT")" || selfcheck_fail "채널 B 주석 표본 파싱 불가"
[ "${sc_b%% *}" = "0" ] || selfcheck_fail "채널 B 주석 표본이 판정에 들어왔다 (원소수=${sc_b%% *})"
types_probe "$SC_TS_BROKEN" >/dev/null 2>&1
[ "$?" -eq 2 ] || selfcheck_fail "채널 B 무판정 경로가 살아 있지 않다 (파싱 불가를 통과로 읽었다)"
selfcheck_n=$((selfcheck_n + 3))

# --- G-10.1: 채널 A — vite globals: true --------------------------------------
g_a_hits="$(anchored_hits "$RE_A" "$VITE_CFG")"
if [ "$g_a_hits" != "1" ]; then
  printf 'G-10.1 VIOLATION: channel A (vite globals: true) hit=%s expected=1\n' "$g_a_hits" >&2
  printf '  주석 줄은 계수되지 않는다 — 이 수치는 활성 출현이다.\n' >&2
  exit 1
fi

# --- G-10.2: 채널 B — tsconfig compilerOptions.types 원소 ---------------------
if ! g_b_out="$(types_probe "$TS_CFG")"; then
  printf 'check-vitest-globals-coherence: 무판정 — tsconfig.json 파싱 불가 (%s)\n' "$TS_CFG" >&2
  printf '  파싱 실패는 통과가 아니다. node 부재 · JSONC 문법 오류 · types 비배열을 확인하라.\n' >&2
  exit 2
fi
g_b_hits="${g_b_out%% *}"
types_len="${g_b_out##* }"
if [ "$g_b_hits" != "1" ]; then
  printf 'G-10.2 VIOLATION: channel B (tsconfig compilerOptions.types) element=%s expected=1 (types_len=%s)\n' \
    "$g_b_hits" "$types_len" >&2
  printf '  주석은 배열 원소가 아니다 — `// "vitest/globals"` 로는 이 판정을 충족할 수 없다.\n' >&2
  exit 1
fi

# --- G-10.3: 채널 C — eslint readonly 9 helper (이름별 판정) ------------------
helper_total=0
for h in $REQUIRED_HELPERS; do
  helper_total=$((helper_total + 1))
done
if [ "$helper_total" -ne 9 ]; then
  printf 'check-vitest-globals-coherence: 무판정 — 헬퍼 표(%s)가 머리말 선언(9)과 어긋난다\n' "$helper_total" >&2
  exit 2
fi

g_c_ok=0
MISSING=""
DUPLICATED=""
for h in $REQUIRED_HELPERS; do
  n="$(anchored_hits "$(helper_re "$h")" "$ESLINT_CFG")"
  case "$n" in
    1) g_c_ok=$((g_c_ok + 1)) ;;
    0) MISSING="$MISSING $h" ;;
    *) DUPLICATED="$DUPLICATED ${h}(x${n})" ;;
  esac
done

if [ -n "$MISSING" ] || [ -n "$DUPLICATED" ]; then
  printf 'G-10.3 VIOLATION: channel C (eslint readonly helpers) ok=%s/%s\n' "$g_c_ok" "$helper_total" >&2
  [ -n "$MISSING" ]    && printf '  미등록:%s\n' "$MISSING" >&2
  [ -n "$DUPLICATED" ] && printf '  중복 등록:%s\n' "$DUPLICATED" >&2
  printf '  주석 처리한 등록은 미등록이다 — 판정은 행 선두 앵커의 활성 출현이다.\n' >&2
  exit 1
fi

printf 'check-vitest-globals-coherence: G-10.1 (A=vite) + G-10.2 (B=tsconfig) + G-10.3 (C=eslint 9 helpers) PASS'
printf ' (A=%s B=%s types_len=%s C=%s/%s selfcheck=%s)\n' \
  "$g_a_hits" "$g_b_hits" "$types_len" "$g_c_ok" "$helper_total" "$selfcheck_n"
exit 0
