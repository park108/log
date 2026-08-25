#!/usr/bin/env bash
# check-api-base-url-totality.sh
# Spec: foundation/api-base-url-assembly-totality §동작 (A-1)(A-3)(A-4) · §발화 채널
# Task: TSK-20260825-25
#
# A-1/A-3: base URL 도출은 **총함수**다 — 본문의 마지막 실행문이 무조건 `return` 이고
#          그 `return` 이 미정의가 아니다. 미정의 가능성을 반환 타입으로 선언하는
#          모듈도 0 이 된다 (총성이 전수 성립하면 `string | undefined` 는 근거를 잃는다).
#
#          방어 대상: 미정의 base 가 `undefined + "?limit=10"` → 문자열
#          `"undefined?limit=10"` 이라는 **상대 URL** 로 조립돼 자기 origin 으로 요청이
#          나가고, SPA 폴백이 index.html 을 200 으로 돌려주면 뒤따르는 `res.json()` 이
#          파싱 오류로 깨지는 silent regression. **요청 실패가 아니라 잘못된 성공이 된다.**
#
# **이 게이트가 발화 채널인 이유** — `tsc --noEmit` 은 `checkJs: false` 라 `.js` 도출
#          모듈을 보지 않고, 호출부가 `fetch` rejection 을 삼키므로 테스트도 붉어지지
#          않는다 (실측 4회 발생하고도 초록). 정적 판정 외에 신호가 없다.
#
# 검출 선언 (3 방향 — spec §발화 채널 (Dir-1)(Dir-2)(Dir-3)):
#   (Dir-1) 총함수 → 부분함수. 마지막 실행문이 조건부 return 이거나 `return undefined`.
#   (Dir-2) 도출 결과에 대한 타입 단언 — `getApiUrl() as X` / `getAPI() as X`.
#   (Dir-3) 부분함수를 `?? ""` · `!` 로 감싼 우회. 빈 base 는 `"?limit=10"` 이 되어
#           **여전히 상대 URL** 이므로 (Dir-2) 취지 안이다 (spec (R-3)).
#
# 판정 방식 — 순진한 tail-return 패턴(`\breturn\b[^\n]*\n\}`)을 쓰지 않는다.
#          조건부 tail return(`if (isDev()) return …`)을 무조건 반환으로 **오판**해
#          부분함수를 총함수로 통과시킨다 (spec (R-5)). 도출부는 중괄호 균형으로
#          본문을 잘라 **주석·공백을 뺀 마지막 실행문**만 본다.
#
# 캐스팅 패턴은 **도출부 한정**이다. 넓은 `as[[:space:]]+string\)` 은 무관한 5건을
#          함께 잡아 특이도가 무너진다 (spec (R-4)). 대상 타입을 `string` 리터럴로
#          고정하지 않은 것은 `as unknown as string` 류 우회를 함께 덮기 위함이다.
#
# 스캔 대상은 **도출**한다 (RULE-06 §열거 고정 금지):
#          find "$SCAN_ROOT" -name 'api.js' -o -name 'api.ts'
#          모듈 리터럴로 박으면 7번째 도메인이 추가될 때 그대로 사각이 된다 (spec (R-1)).
#
# 미선언 방향: `function getApiUrl() {` 선언문 형태. 도출이 `const <name> = (…) => {`
#          화살표 형태만 훑으므로 **선언된 경계 밖**이다 (현 HEAD 에 해당 표기 0건).
#          확대하려면 별도 task 로 방향을 추가하고 주입 검증한다 — 검출 공백은
#          기록되지 않으면 존재하지 않는 것으로 오독된다.
# 미선언 방향: 도출 함수 이름이 `getApiUrl`·`getAPI` 가 아닌 신규 표기.
# 미선언 방향: 멀티라인 캐스팅 (`getApiUrl()\n  as string`). 행 단위 판정 밖이다.
#
# 공허 통과 가드 — 스캔 파일 0 이면 exit 1, 도출 지점 0 이면 exit 2.
#          ack 라인은 `api-derivations=<N> partial=<M> casts=<K>` 수치를 반드시 낸다.
#          "0 hit" 만 내는 출력은 **충족**과 **측정 회피**를 구별시켜 주지 않는다.
#
# exit 0: 세 방향 전부 PASS (ack 1 줄 출력).
# exit 1: 위반 또는 스캔 대상 0.
# exit 2: 도출 지점 0 (vacuous).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCAN_ROOT="$ROOT/src"

if [ ! -d "$SCAN_ROOT" ]; then
  printf 'check-api-base-url-totality: 스캔 루트 없음 — %s\n' "$SCAN_ROOT" >&2
  exit 1
fi

cd "$ROOT" || exit 1

# 스캔 대상 도출 (열거 고정 금지). zsh 비인용 변수 무분할 회피를 위해 파일 목록은
# 임시 파일 경유 + `while IFS= read -r` 로 순회한다.
FILES="$(mktemp)"
DERIVATIONS="$(mktemp)"
trap 'rm -f "$FILES" "$DERIVATIONS"' EXIT

find "$SCAN_ROOT" \( -name 'api.js' -o -name 'api.ts' \) -type f \
  | grep -v '\.mock\.' \
  | sort > "$FILES"

file_count="$(grep -c . "$FILES" 2>/dev/null || true)"
file_count="${file_count:-0}"

if [ "$file_count" -eq 0 ]; then
  printf 'check-api-base-url-totality: 스캔 대상 0건 — 도출 규칙이 공집합을 냈다 (vacuous zero)\n' >&2
  exit 1
fi

# (Dir-1) 총성 판정 — 중괄호 균형으로 본문을 잘라 마지막 실행문을 본다.
# 판정 대상은 **마지막** 실행문뿐이다. 선두에 미정의 거절 가드(`if (!BASE) throw …`)가
# 있는 것은 위반이 아니다.
node -e '
const fs = require("fs");
const files = fs.readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean);
const out = [];
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const re = /(?:export\s+)?const\s+(getApiUrl|getAPI)\s*=\s*\([^)]*\)\s*(?::[^=]*)?=>\s*\{/g;
  let m;
  while ((m = re.exec(s))) {
    let i = re.lastIndex, d = 1;
    while (i < s.length && d > 0) {
      const c = s[i];
      if (c === "{") d++;
      else if (c === "}") d--;
      i++;
    }
    const body = s.slice(re.lastIndex, i - 1);
    const st = body.split("\n").map(t => t.trim()).filter(Boolean).filter(t => !t.startsWith("//"));
    const last = st[st.length - 1] || "";
    const total = /^return\b/.test(last) && !/^return\s+undefined\s*;?$/.test(last);
    const line = s.slice(0, m.index).split("\n").length;
    out.push([total ? "TOTAL" : "PARTIAL", f + ":" + line + ":" + m[1], last].join("\t"));
  }
}
fs.writeFileSync(process.argv[2], out.map(x => x + "\n").join(""));
' "$FILES" "$DERIVATIONS"

node_rc=$?
if [ $node_rc -ne 0 ]; then
  printf 'check-api-base-url-totality: 도출부 파싱 실패 (rc=%s)\n' "$node_rc" >&2
  exit 1
fi

derive_count="$(grep -c . "$DERIVATIONS" 2>/dev/null || true)"
derive_count="${derive_count:-0}"

if [ "$derive_count" -eq 0 ]; then
  printf 'check-api-base-url-totality: derive=0 vacuous — 스캔 %s 파일에서 도출 지점 0건.\n' "$file_count" >&2
  printf '  도출 표기가 바뀌었거나 정규식이 낡았다. 0 hit 을 충족으로 읽지 않는다.\n' >&2
  exit 2
fi

partial_count="$(grep -c '^PARTIAL' "$DERIVATIONS" 2>/dev/null || true)"
partial_count="${partial_count:-0}"

# (Dir-2) 도출 결과 캐스팅 소거 금지.
casts="$(grep -rnE 'get(ApiUrl|API)\(\)[[:space:]]+as[[:space:]]+[A-Za-z]' src 2>/dev/null)"
casts_rc=$?
if [ $casts_rc -eq 2 ]; then
  printf 'check-api-base-url-totality: grep exit 2 (캐스팅 검색 오류)\n' >&2
  exit 1
fi
cast_count="$(printf '%s' "$casts" | grep -c . 2>/dev/null || true)"
cast_count="${cast_count:-0}"

# (Dir-3) `?? ""` · `!` 우회.
bypass="$(grep -rnE 'get(ApiUrl|API)\(\)[[:space:]]*(\?\?|!)' src 2>/dev/null)"
bypass_rc=$?
if [ $bypass_rc -eq 2 ]; then
  printf 'check-api-base-url-totality: grep exit 2 (우회 검색 오류)\n' >&2
  exit 1
fi
bypass_count="$(printf '%s' "$bypass" | grep -c . 2>/dev/null || true)"
bypass_count="${bypass_count:-0}"

violations=0

if [ "$partial_count" -ne 0 ]; then
  printf 'check-api-base-url-totality: A-1 VIOLATION — 부분함수 도출 %s건 (api-derivations=%s partial=%s)\n' \
    "$partial_count" "$derive_count" "$partial_count" >&2
  printf '  도출부의 마지막 실행문이 무조건 return 이어야 한다. 조건부 tail return 은\n' >&2
  printf '  함수 끝에서 떨어져 undefined 를 낸다 — 그 값이 문자열 연결로 URL 에 승격된다.\n' >&2
  while IFS="$(printf '\t')" read -r verdict loc last; do
    case "$verdict" in
      PARTIAL) printf '  %s  last=%s\n' "$loc" "$last" >&2 ;;
    esac
  done < "$DERIVATIONS"
  violations=1
fi

if [ "$cast_count" -ne 0 ]; then
  printf 'check-api-base-url-totality: A-4 VIOLATION — 도출부 캐스팅 %s hit (casts=%s)\n' \
    "$cast_count" "$cast_count" >&2
  printf '  위험을 타입으로 표현한 자리에서 그 표현을 단언으로 지우면, 총성이 깨져도\n' >&2
  printf '  컴파일러가 침묵한다. 캐스팅이 아니라 총성으로 해소한다.\n' >&2
  printf '%s\n' "$casts" | sed 's/^/  /' >&2
  violations=1
fi

if [ "$bypass_count" -ne 0 ]; then
  printf "check-api-base-url-totality: A-4' VIOLATION — 도출부 ?? · ! 우회 %s hit\n" \
    "$bypass_count" >&2
  printf '  ?? "" 는 빈 base 를 만들어 "?limit=10" 이 된다 — 여전히 상대 URL 이다.\n' >&2
  printf '%s\n' "$bypass" | sed 's/^/  /' >&2
  violations=1
fi

if [ $violations -ne 0 ]; then
  exit 1
fi

printf 'check-api-base-url-totality: api-derivations=%s partial=%s casts=%s bypass=%s (root=%s files=%s)\n' \
  "$derive_count" "$partial_count" "$cast_count" "$bypass_count" "$SCAN_ROOT" "$file_count"
exit 0
