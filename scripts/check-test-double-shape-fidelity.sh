#!/usr/bin/env bash
# check-test-double-shape-fidelity.sh
# Spec: testing/test-double-return-shape-fidelity §동작 (T-1)(T-4)(T-5) · §발화 채널
# Task: TSK-20260825-21
#
# T-1: 테스트 더블은 대체 대상의 **반환 형상**(동기 값 / Promise)을 보존한다.
#      동기 술어 `(): boolean` 을 `mockResolvedValue` 로 대체하면 `Promise.resolve(false)`
#      가 **truthy** 라 음성 케이스가 양성 분기를 실행한다. 실제 결함: 비-admin 차단
#      경로가 저장소 역사상 한 번도 실행되지 않았고, 요청 쿼리에 `[object Promise]`
#      가 직렬화됐다.
#
# **이 게이트가 유일한 발화 채널인 이유** — 위반은 테스트를 붉게 만들지 않는다.
#      오히려 단언을 무력화해 **초록을 만든다**. 그래서 "그 테스트가 통과하는가" 를
#      판정 채널로 두면 검출력이 0 이다 (spec (R-5)). `npm test` 는 이 축을 못 본다.
#
# 검출 선언 (1 방향):
#   (D-1) 한 라인이 `spyOn` · 도출된 동기 술어 이름(따옴표 포함) · `mockResolvedValue`
#         또는 `mockResolvedValueOnce` 를 **동시에** 포함.
#
#   넓은 `\.mockResolvedValue` 단독 패턴을 쓰지 않는다. HEAD 실측 `mockResolvedValue`
#   126 hit 중 다수가 실제 `Promise` 반환 대상에 대한 **정합** 사용이며, 넓은 패턴은
#   그 전부를 오탐해 특이도가 무너진다 (spec (R-4) · (T-5)). 판정은 반드시
#   **대체 대상의 선언 형상**과 짝지어야 한다.
#
# 스캔 대상·검사 술어는 **도출**한다 (RULE-06 §열거 고정 금지):
#   술어 = $DECL_SRC 의 `export function <name>(…): <non-Promise> {` 선언
#   파일 = find "$SCAN_ROOT" -name '*.test.js' -o -name '*.test.jsx'
#                            -o -name '*.test.ts' -o -name '*.test.tsx'
#   두 이름(관리자 술어·로그인 술어)을 리터럴로 박으면 이후 추가되는 세 번째 동기
#   술어가 그대로 사각으로 남는다 (spec (R-1)). 도출 결과는 현재 2개가 아니라 12개다.
#
# 미선언 방향: 멀티라인 표기 (`vi.spyOn(common, 'x')\n  .mockResolvedValue(v)`).
#   행 단위 판정이 보지 못한다. 선언하지 않았다는 사실을 여기 박제한다 — 검출 공백은
#   기록되지 않으면 존재하지 않는 것으로 오독된다. 확대하려면 별도 task 로 방향을
#   추가하고 주입 검증한다.
# 미선언 방향: `export const f = () => …` 형태의 동기 술어. 도출이 `export function`
#   선언 형태만 훑으므로 **선언된 경계 밖**이다 (현 HEAD $DECL_SRC 에는 없다).
#   반대로 이 경계 덕에 `copyToClipboard` (`export const … : Promise<boolean>`) 가
#   자연히 제외되어 (T-5) 특이도가 성립한다.
# 미선언 방향: `mockImplementation(async () => …)` 처럼 형상을 우회로 뒤집는 표기.
#
# 공허 통과 가드 (2중): 도출 술어 0건이면 exit 2, 스캔 파일 0건이면 exit 1.
#   대상 집합이 비면 "위반 0건" 은 무조건 참이 되어 게이트가 검출력 0 인 채로 정상
#   트리에서 영구히 초록을 낸다. ack 라인은 `predicates=N files=M` 수치를 반드시
#   내보낸다 — "0 hit" 만 내는 게이트는 측정과 회피를 구별시켜 주지 않는다.
#
# 이 스크립트는 read-only 다. src/** 를 수정하지 않는다.
#
# exit 0: PASS (ack 1 줄에 predicates/files 수치 출력).
# exit 1: 위반 검출 · 스캔 파일 0건 (stderr 상세).
# exit 2: 도출 술어 0건 (공허 통과).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

SCAN_ROOT="${TEST_DOUBLE_SCAN_ROOT:-src}"
DECL_SRC="${TEST_DOUBLE_DECL_SRC:-src/common/common.ts}"

if [ ! -f "$DECL_SRC" ]; then
  printf 'check-test-double-shape-fidelity: 선언 원천 없음: %s\n' "$DECL_SRC" >&2
  printf '  술어 도출의 단일 진리원이 사라지면 판정 전체가 공허해진다.\n' >&2
  exit 2
fi

if [ ! -d "$SCAN_ROOT" ]; then
  printf 'check-test-double-shape-fidelity: scan root not found: %s\n' "$SCAN_ROOT" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PREDICATES="$TMP_DIR/predicates"
FILES="$TMP_DIR/files"
VIOLATIONS="$TMP_DIR/violations"
: > "$PREDICATES"
: > "$VIOLATIONS"

# --- 술어 도출 ----------------------------------------------------------------
# `export function <name>(<단일행 파라미터>): <반환형> {` 에서 이름과 반환형을 뽑고
# 반환형이 `Promise` 로 시작하면 제외한다 (그쪽은 `mockResolvedValue` 가 정합이다).
# grep -E 에는 부정 전방탐색이 없으므로 추출 후 필터로 같은 판정을 만든다.
while IFS= read -r decl; do
  name="$(printf '%s' "$decl" | sed -E 's/^[[:space:]]*export function ([A-Za-z0-9_]+).*/\1/')"
  rtype="$(printf '%s' "$decl" \
    | sed -E 's/^[[:space:]]*export function [A-Za-z0-9_]+[[:space:]]*\([^)]*\)[[:space:]]*:[[:space:]]*//' \
    | sed -E 's/[[:space:]]*\{.*$//' \
    | sed -E 's/[[:space:]]+$//')"
  case "$rtype" in
    Promise|Promise\<*) continue ;;
  esac
  [ -n "$name" ] && printf '%s\n' "$name" >> "$PREDICATES"
done <<EOF
$(grep -E '^[[:space:]]*export function [A-Za-z0-9_]+[[:space:]]*\([^)]*\)[[:space:]]*:[[:space:]]*[^{]*\{' "$DECL_SRC")
EOF

sort -u -o "$PREDICATES" "$PREDICATES"
predicate_count="$(grep -c . "$PREDICATES" 2>/dev/null || true)"
predicate_count="${predicate_count:-0}"

if [ "$predicate_count" -eq 0 ]; then
  printf 'check-test-double-shape-fidelity: derive=0 vacuous (decl=%s)\n' "$DECL_SRC" >&2
  printf '  동기 술어 도출이 0 이면 "위반 0건" 은 무조건 참이 된다 — 측정이 아니다.\n' >&2
  exit 2
fi

# --- 스캔 파일 열거 -----------------------------------------------------------
# `for f in $var` 형태의 비인용 변수 분할에 의존하지 않는다: zsh 는 분할하지 않아
# 파일 목록 전체가 단일 인자로 넘어가고 판정이 조용히 0 을 낸다.
find "$SCAN_ROOT" \( -name '*.test.js' -o -name '*.test.jsx' \
  -o -name '*.test.ts' -o -name '*.test.tsx' \) | sort > "$FILES"

file_count="$(grep -c . "$FILES" 2>/dev/null || true)"
file_count="${file_count:-0}"

if [ "$file_count" -eq 0 ]; then
  printf 'check-test-double-shape-fidelity: vacuous zero: 스캔 파일 0건 (root=%s)\n' "$SCAN_ROOT" >&2
  printf '  대상이 비면 "위반 0건" 은 측정 결과가 아니다.\n' >&2
  exit 1
fi

# --- (D-1) 판정 ---------------------------------------------------------------
# 3자 동시 성립: spyOn · 따옴표로 감싼 도출 술어 이름 · mockResolvedValue(Once)?
while IFS= read -r f; do
  while IFS= read -r name; do
    grep -nE "spyOn.*['\"]${name}['\"].*\.mockResolvedValue(Once)?[[:space:]]*\(" "$f" \
      | sed "s|^|${f}:|" >> "$VIOLATIONS"
  done < "$PREDICATES"
done < "$FILES"

violation_count="$(grep -c . "$VIOLATIONS" 2>/dev/null || true)"
violation_count="${violation_count:-0}"

if [ "$violation_count" -ne 0 ]; then
  printf 'check-test-double-shape-fidelity: T-1 VIOLATION %s hit (root=%s predicates=%s files=%s)\n' \
    "$violation_count" "$SCAN_ROOT" "$predicate_count" "$file_count" >&2
  printf '  동기 술어는 mockReturnValue 로 대체한다 — Promise.resolve(false) 는 truthy 라\n' >&2
  printf '  음성 케이스가 양성 분기를 실행하고, 테스트는 초록인 채로 남는다.\n' >&2
  while IFS= read -r line; do
    printf '  %s\n' "$line" >&2
  done < "$VIOLATIONS"
  exit 1
fi

printf 'check-test-double-shape-fidelity: T-1 0 hit (root=%s predicates=%s files=%s)\n' \
  "$SCAN_ROOT" "$predicate_count" "$file_count"
exit 0
