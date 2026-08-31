#!/usr/bin/env bash
# check-dev-port-coherence.sh
# Spec: specs/30.spec/blue/foundation/dev-server-port-getUrl-token-coherence.md §동작 G-A·G-B·G-C·G-E + §테스트 현황 (FR-03) + §수용 기준 Must (FR-03)
# Task: TSK-20260518-19 · TSK-20260901-11 (판정면 정상화)
#
# G-A: src/common/common.ts 의 dev 분기 `return "http://localhost:<port>/";` 리터럴 hit=1 + port 토큰 capture.
# G-B: vite.config.js 의 `port: <port>,` 정수 토큰 hit=1 + port 토큰 capture (**선언**면).
# G-B': vite.config.js 를 실제로 **로드해 해석된** `server.port` (**효력**면).
# G-C: G-A · G-B · G-B' 의 port 가 전부 동치 (cross-channel + 선언↔효력).
# G-D: src/File/ REFRESH_TIMEOUT 상수 영역 (timing axis) 은 본 스크립트 측정 scope 외 — 격리.
# G-E: 위반 시 stderr 에 `G-? VIOLATION:` 라벨 출력 + rc=1 (fail-fast).
#
# (I9) 활성 출현 확인 — G-A · G-B 는 둘 다 행 선두 앵커(`^[[:space:]]*`)라 `//` 로
#   시작하는 주석 줄이 필수 토큰을 충족할 수 없다. **이 축은 이미 건전했다** —
#   왕복으로 확인했다: `vite.config.js` 에 `// 되돌림 참고: port: 5173, 이었다` 한 줄을
#   더해도 `rc=0` 이 유지되고 (주석은 계수에 안 들어옴), 실제 `port:` 줄을 지우면
#   `G-B hit=0` 으로 죽는다. 그래서 **패턴을 바꾸지 않았다** — (I4)(I9) 가 요구하는
#   것은 교체가 아니라 분류의 명시다. 정적 텍스트 판정을 전부 실행 판정으로 바꾸는
#   방향은 과잉이다 (출처 spec §회귀 중점). 이 성질은 아래 §자가 확인이 매 실행마다 잰다.
#
# (I10) 효력면 한쪽 고정 — 구 `G-C` 는 **양쪽이 다 소스 텍스트**였다. `port_a` 는
#   `common.ts` 리터럴에서, `port_b` 는 `vite.config.js` 의 `port:` 줄에서 `sed` 로
#   뽑았다. 그래서 라벨은 살고 그 라벨이 가리키는 구현만 죽는 경로가 열려 있었다 —
#   `server` 블록이 다른 곳에서 덮여도 두 문자열은 계속 `3000` 이고 `PASS (port=3000)`
#   가 찍힌다. 이제 `port_b` 를 **vite 가 실제로 쓸 값**으로 삼는다: `vite.config.js` 를
#   `import()` 로 로드하고 default export 가 함수면 dev 모드로 호출해 해석한 뒤
#   `server.port` 를 읽는다. 글자가 아니라 값이 판정면이다.
#   로드 실패 · `server.port` 부재 · 비정수는 통과가 아니라 **무판정 (exit 2)** 이다.
#
# `G-B` 의 텍스트 계수는 **남긴다.** 그것은 이제 *"선언이 한 곳뿐"* 이라는 별개 명제이며,
#   효력면과 나란히 있을 때 **선언과 효력이 갈라지는 것**까지 잡는다. 갈리면 rc=1 이고
#   stderr 에 `declared` 와 `effective` 를 **둘 다** 낸다.
#
# `port_a` 는 텍스트로 남긴다. `getUrl()` 의 dev 분기를 효력면으로 재려면 dev 모드
#   런타임을 세워야 하고 그 비용이 이 축의 값보다 크다. **정합 단언의 한쪽이 효력면이면
#   (I10) 은 충족된다** — 겨냥하는 것은 "양쪽 다 텍스트" 이지 "텍스트의 존재" 가 아니다.
#   뒤집으려면 별도 req 다 (TSK-20260901-11 §범위 밖).
#
# exit 0: G-A + G-B + G-B' + G-C 모두 PASS (ack 1 줄 stdout).
# exit 1: 어느 게이트라도 위반 (stderr 상세).
# exit 2: 무판정 — vite.config.js 로드 불가 · server.port 부재/비정수 · 자가 확인 실패.
#         통과가 아니다. 재려던 것을 재지 못한 상태를 초록으로 내지 않는다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMMON_TS="$ROOT/src/common/common.ts"
VITE_CFG="$ROOT/vite.config.js"

if [ ! -f "$COMMON_TS" ]; then
  printf 'check-dev-port-coherence: %s not found\n' "$COMMON_TS" >&2
  exit 1
fi

if [ ! -f "$VITE_CFG" ]; then
  printf 'check-dev-port-coherence: %s not found\n' "$VITE_CFG" >&2
  exit 1
fi

cd "$ROOT" || exit 1

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# --- 판정 원천 ----------------------------------------------------------------
RE_A='^[[:space:]]*return[[:space:]]+"http://localhost:[0-9]+/";'
RE_B='^[[:space:]]*port:[[:space:]]*[0-9]+,'

# --- 판정 함수 ----------------------------------------------------------------
# 자가 확인과 실판정은 **같은 함수의 서로 다른 호출**이며 사본이 아니다.
# (참조 구현: scripts/check-summary-drift.sh 의 population_verdict)
anchored_lines() {   # $1=정규식 $2=파일 → stdout: grep -nE 결과
  local re="$1" file="$2"
  grep -nE "$re" "$file" 2>/dev/null
}

count_lines() {   # $1=문자열 → stdout: 빈 줄을 뺀 줄 수
  local s="$1"
  printf '%s\n' "$s" | sed '/^$/d' | wc -l | tr -d ' '
}

port_from_a() {   # $1=grep 결과 → stdout: 포트
  local s="$1"
  printf '%s\n' "$s" | sed -E 's/.*localhost:([0-9]+)\/.*/\1/'
}

port_from_b() {   # $1=grep 결과 → stdout: 포트
  local s="$1"
  printf '%s\n' "$s" | sed -E 's/.*port:[[:space:]]*([0-9]+),.*/\1/'
}

# --- 효력면 프로브 (I10) ------------------------------------------------------
# 텍스트가 아니라 vite 가 실제로 쓸 값을 읽는다. default export 가 함수형이면
# dev 모드(`command: serve`)로 호출해 해석한다. 어떤 실패든 rc≠0 → 무판정.
EFFECTIVE_PROBE="$TMP_DIR/vite-server-port.mjs"
cat > "$EFFECTIVE_PROBE" <<'MJS'
import { pathToFileURL } from 'node:url';

const target = pathToFileURL(process.argv[2]).href;
const mod = await import(target);
let cfg = mod.default;
if (typeof cfg === 'function') {
	cfg = await cfg({ command: 'serve', mode: 'development' });
}
const port = cfg && cfg.server ? cfg.server.port : undefined;
if (typeof port !== 'number' || !Number.isInteger(port)) {
	process.stderr.write('server.port 가 정수가 아니다: ' + String(port) + '\n');
	process.exit(3);   // 무판정 — 부재도 비정수도 통과가 아니다
}
process.stdout.write(String(port));
MJS

effective_port() {   # $1=vite.config 경로 → stdout: 포트 · rc 2 = 무판정
  local cfg="$1" out
  out="$(node "$EFFECTIVE_PROBE" "$cfg" 2>/dev/null)" || return 2
  case "$out" in
    ''|*[!0-9]*) return 2 ;;
  esac
  printf '%s' "$out"
  return 0
}

# --- 자가 확인 (I9)(I10) ------------------------------------------------------
# 실판정과 같은 함수로 표본을 돌려 활성 hit=1 · 주석 hit=0 · 교차 hit=0 을 확인하고,
# 효력면 프로브가 값을 읽는지 · 무판정 경로가 살아 있는지를 확인한다.
# 하나라도 깨지면 무판정(exit 2)이다 — 판정면이 죽은 채로 초록을 내지 않는다.
selfcheck_fail() {
  printf 'check-dev-port-coherence: 무판정 — 자가 확인 실패 (%s)\n' "$1" >&2
  printf '  판정면이 자기 표본을 잡지 못하면 실트리의 "위반 0건" 은 측정이 아니다.\n' >&2
  exit 2
}

SC="$TMP_DIR/sc"
selfcheck_n=0

# G-A 표본 — 활성 / 주석 / 부정(포트 없는 URL)
printf '\t\treturn "http://localhost:4321/";\n' > "$SC"
[ "$(count_lines "$(anchored_lines "$RE_A" "$SC")")" = "1" ] || selfcheck_fail "G-A 활성 표본 미검출"
[ "$(port_from_a "$(anchored_lines "$RE_A" "$SC")")" = "4321" ] || selfcheck_fail "G-A 포트 추출 오류"
printf '\t\t// return "http://localhost:4321/";\n' > "$SC"
[ "$(count_lines "$(anchored_lines "$RE_A" "$SC")")" = "0" ] || selfcheck_fail "G-A 주석 표본이 판정에 들어왔다"
printf '\t\treturn "http://localhost/";\n' > "$SC"
[ "$(count_lines "$(anchored_lines "$RE_A" "$SC")")" = "0" ] || selfcheck_fail "G-A 부정 표본이 활성으로 계수됐다"
selfcheck_n=$((selfcheck_n + 4))

# G-B 표본 — 활성 / 주석 / 부정(문자열 포트)
printf '\t\tport: 4322,\n' > "$SC"
[ "$(count_lines "$(anchored_lines "$RE_B" "$SC")")" = "1" ] || selfcheck_fail "G-B 활성 표본 미검출"
[ "$(port_from_b "$(anchored_lines "$RE_B" "$SC")")" = "4322" ] || selfcheck_fail "G-B 포트 추출 오류"
printf '\t\t// 되돌림 참고: port: 5173, 이었다\n' > "$SC"
[ "$(count_lines "$(anchored_lines "$RE_B" "$SC")")" = "0" ] || selfcheck_fail "G-B 주석 표본이 판정에 들어왔다"
printf "\t\tport: '4322',\n" > "$SC"
[ "$(count_lines "$(anchored_lines "$RE_B" "$SC")")" = "0" ] || selfcheck_fail "G-B 부정 표본이 활성으로 계수됐다"
selfcheck_n=$((selfcheck_n + 4))

# 교차 특이도 — A 의 정규식이 B 의 활성 표본을, B 의 정규식이 A 의 활성 표본을
# 삼키면 위반 보고의 라벨이 틀리게 붙고 rc 로는 드러나지 않는다.
printf '\t\tport: 4322,\n' > "$SC"
[ "$(count_lines "$(anchored_lines "$RE_A" "$SC")")" = "0" ] || selfcheck_fail "교차: G-A 정규식이 G-B 표본을 삼킨다"
printf '\t\treturn "http://localhost:4321/";\n' > "$SC"
[ "$(count_lines "$(anchored_lines "$RE_B" "$SC")")" = "0" ] || selfcheck_fail "교차: G-B 정규식이 G-A 표본을 삼킨다"
selfcheck_n=$((selfcheck_n + 2))

# 효력면 프로브 표본 — 객체형 / 함수형 / 로드 불가 / server.port 부재
SC_OBJ="$TMP_DIR/sc-obj.mjs"
SC_FN="$TMP_DIR/sc-fn.mjs"
SC_BROKEN="$TMP_DIR/sc-broken.mjs"
SC_NOPORT="$TMP_DIR/sc-noport.mjs"
printf 'export default { server: { port: 4331, open: true } };\n' > "$SC_OBJ"
printf 'export default () => ({ server: { port: 4332 } });\n' > "$SC_FN"
printf 'export default {\n' > "$SC_BROKEN"
printf 'export default { server: { open: true } };\n' > "$SC_NOPORT"
[ "$(effective_port "$SC_OBJ")" = "4331" ] || selfcheck_fail "효력면 프로브가 객체형 설정을 못 읽는다"
[ "$(effective_port "$SC_FN")" = "4332" ]  || selfcheck_fail "효력면 프로브가 함수형 설정을 못 읽는다"
effective_port "$SC_BROKEN" >/dev/null 2>&1
[ "$?" -eq 2 ] || selfcheck_fail "효력면 무판정 경로가 살아 있지 않다 (로드 불가를 통과로 읽었다)"
effective_port "$SC_NOPORT" >/dev/null 2>&1
[ "$?" -eq 2 ] || selfcheck_fail "효력면 무판정 경로가 살아 있지 않다 (server.port 부재를 통과로 읽었다)"
selfcheck_n=$((selfcheck_n + 4))

# 효력면이 텍스트와 갈릴 때 그것을 본다는 것 — 표본으로 확인한다.
# 이 표본은 `port: 4341,` 이라는 **글자**를 갖고 있지만 해석값은 4342 다.
SC_DRIFT="$TMP_DIR/sc-drift.mjs"
printf 'const base = {\n\tserver: {\n\t\tport: 4341,\n\t},\n};\nexport default { ...base, server: { ...base.server, port: 4342 } };\n' > "$SC_DRIFT"
[ "$(count_lines "$(anchored_lines "$RE_B" "$SC_DRIFT")")" = "1" ] || selfcheck_fail "drift 표본의 선언면 계수가 1이 아니다"
[ "$(port_from_b "$(anchored_lines "$RE_B" "$SC_DRIFT")")" = "4341" ] || selfcheck_fail "drift 표본의 선언면 추출 오류"
[ "$(effective_port "$SC_DRIFT")" = "4342" ] || selfcheck_fail "효력면이 선언면과 갈린 값을 보지 못한다"
selfcheck_n=$((selfcheck_n + 3))

# --- G-A: getUrl dev 분기 literal hit + port 추출 -----------------------------
g_a_lines="$(anchored_lines "$RE_A" src/common/common.ts)"
g_a_hits="$(count_lines "$g_a_lines")"
if [ "$g_a_hits" != "1" ]; then
  printf 'G-A VIOLATION: getUrl literal hit=%s expected=1\n' "$g_a_hits" >&2
  printf '  주석 줄은 계수되지 않는다 — 이 수치는 활성 출현이다.\n' >&2
  exit 1
fi
port_a="$(port_from_a "$g_a_lines")"

# --- G-B: vite.config.js 의 선언면 (`port:` 줄이 한 곳뿐인가) -----------------
g_b_lines="$(anchored_lines "$RE_B" vite.config.js)"
g_b_hits="$(count_lines "$g_b_lines")"
if [ "$g_b_hits" != "1" ]; then
  printf 'G-B VIOLATION: vite port hit=%s expected=1\n' "$g_b_hits" >&2
  printf '  주석 줄은 계수되지 않는다 — 이 수치는 활성 출현이다.\n' >&2
  exit 1
fi
port_declared="$(port_from_b "$g_b_lines")"

# --- G-B': vite.config.js 의 효력면 (vite 가 실제로 쓸 값) --------------------
if ! port_effective="$(effective_port "$VITE_CFG")"; then
  printf "check-dev-port-coherence: 무판정 — vite.config.js 의 server.port 를 해석하지 못했다 (%s)\n" "$VITE_CFG" >&2
  printf '  로드 실패 · server.port 부재 · 비정수는 통과가 아니다. 선언면은 declared=%s 였다.\n' "$port_declared" >&2
  exit 2
fi

# --- G-C: 선언↔효력 + cross-channel 동치 --------------------------------------
if [ "$port_declared" != "$port_effective" ]; then
  printf 'G-C VIOLATION: vite 선언↔효력 분리 (declared=%s effective=%s)\n' \
    "$port_declared" "$port_effective" >&2
  printf '  `port:` 라는 글자는 살아 있는데 vite 가 쓸 값이 다르다 — 텍스트 판정만으로는 보이지 않는다.\n' >&2
  exit 1
fi

if [ "$port_a" != "$port_effective" ]; then
  printf 'G-C VIOLATION: dev port drift (getUrl=%s declared=%s effective=%s)\n' \
    "$port_a" "$port_declared" "$port_effective" >&2
  exit 1
fi

printf 'check-dev-port-coherence: G-A+G-B+G-C PASS (getUrl=%s declared=%s effective=%s selfcheck=%s)\n' \
  "$port_a" "$port_declared" "$port_effective" "$selfcheck_n"
exit 0
