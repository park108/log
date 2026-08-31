#!/usr/bin/env bash
# check-declared-branch-discrimination.sh
# Spec: testing/declared-branch-discriminating-assertion §동작 (B-1)(B-3) · §수용 기준 (Must, B-1)
#       foundation/gate-effective-surface-and-variant-battery §동작 (I9)(I10)
# Task: TSK-20260825-33 · TSK-20260901-12
#
# (B-1) 더블로 분기를 선택한 케이스는 그 선택이 여는 관측 결과를 **구별하는 단언** 을 갖는다.
#       `isAdmin()` 이 여는 것은 `Navigation.tsx` 의 `ADMIN_MENU` 렌더이므로, 음성 케이스는
#       그 항목들에 대한 **부재 단언** 을 가져야 한다.
#
# **테스트는 이 축의 채널이 될 수 없다.** 위반은 테스트를 붉게 만들지 않고 오히려 초록을
#       만든다 — 단언이 구별력을 잃으면 통과 수도 분기 커버리지도 그대로다. 실측(spec §동작
#       (B-1))에서 분기 0회 실행과 1회 실행이 `677 passed` · `Branches 95.65% (1100/1150)` 로
#       완전히 동일했다. 그래서 정적 판정이 유일한 발화 채널이다.
#
# ── (I9) 활성 출현 확인 ────────────────────────────────────────────────────────
# 정합 단언의 **양쪽이 텍스트**였다. 모집단(`Navigation.tsx` 의 `name:` 출현)도 충족
# 판정(`Navigation.test.tsx` 의 단언 문자열 출현)도 줄 앵커가 없어, 주석 줄이 양쪽 모두에
# 계수됐다. 실측 (TSK-20260901-12 §배경):
#   방향 A — 구별 단언 3건을 전부 `// ` 로 주석 처리해도 `rc=0 asserted=3`.
#            게이트가 **자기가 재지 않은 것을 재었다고** 말했다.
#   방향 B — `Navigation.tsx` 에 주석 `// legacy item: name: "ghost"` 1줄을 넣으면
#            `rc=1 adminmenu=4`. 정상적인 주석 한 줄이 위반으로 계수됐다.
# 두 방향은 하나의 처방으로 닫힌다: **판정 전에 주석을 걷어낸다** (`active_text`).
# 주석 줄은 어느 쪽 모집단에도 들어오지 않는다 — 이 스크립트의 모든 수치는 활성 출현이다.
#
# ── (I10) 효력면 한쪽 고정 ─────────────────────────────────────────────────────
# 충족 판정 쪽(`asserted`)을 효력면으로 고정했다. 단언 문자열의 실재 계수는 유지하되,
# **항목명마다** 위반 표본(주석 처리된 단언)과 정상 표본(활성 단언)을 실판정과 **같은
# 함수**에 통과시켜 `hit=0` · `hit=1` 을 매 실행마다 왕복으로 확인한다 (§자가 확인).
# 그래서 정상 종료 시의 `asserted` 는 "문자열이 있더라"가 아니라 **"판정면이 그 자리를
# 실제로 보고 있음을 확인한 항목 수"** 다.
#
# 자가 확인과 실판정은 **같은 함수의 서로 다른 호출**이며 사본이 아니다. 사본 둘을 두면
# 사본이 갈라지고, 실판정 경로를 들어내도 자가 확인만 초록으로 남는다.
# (참조 구현: scripts/check-summary-drift.sh 의 population_verdict)
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   항목명   = $NAV_SRC 의 `name: "…"` **활성** 표기. 실측 3 항목 (log · file · mon).
#              `log`·`file`·`mon` 을 스크립트에 박지 않는다 — 4번째 admin 메뉴가 추가되면
#              모집단에 자동으로 들어와야 한다. 자가 확인 표본도 도출된 항목명으로 짓는다.
#   주입 seam = $BRANCH_DISCRIMINATION_SCAN_ROOT — 설정 시 판정 모집단을 그 디렉터리
#              (`<root>/Navigation.tsx` + `<root>/Navigation.test.tsx`) 로 겨눈다.
#              미설정이 기본이며 그때 도출은 `src/common` 과 문자 그대로 동일하다.
#              (spec: foundation/gate-judgement-population-injectable-seam — 본 축은 `.env*`
#              계열이 아니라 Should 이나 신설 게이트이므로 처음부터 붙인다.)
#
# ── 검출 경계 (과신 금지) ──────────────────────────────────────────────────────
# 이 게이트는 부재 단언의 **실재** 를 재며, 그 단언이 실제로 더블 뒤집기에 붉어지는지는
# 재지 않는다 (spec §수용 기준 (B-1) §검출 경계). 후자는 게이트 도입 task 의 DoD 주입
# (RULE-06 §게이트 실효 검증) 이 담당했고 그 왕복은 1회성이라 여기에 상주하지 않는다.
#
# 임계는 spec 이 정한 **전항 요구** `asserted == adminmenu` 다 (TSK-20260825-35 상향).
# 종전 임계는 `asserted >= 1` 이라 도출 3 중 1건만 있으면 통과했고, 3 중 2 를 지우는 부분
# 퇴행을 잡지 못했다 — 도출 수 `name_count` 가 ack 라인에만 쓰이고 판정에 연결되지 않았다.
# 상향은 소유 spec `testing/declared-branch-discriminating-assertion` (B-1) 이 전항 요구로
# 개정돼 blue 로 승격된 **뒤에** 적용했다. 게이트가 spec 보다 엄격해지면 판정 근거가 문서
# 밖으로 새므로 순서를 뒤집지 않는다.
#
# 항목명 매칭은 부분 문자열이다 (`[^)]*<name>[^)]*`). `name: "log"` 는 `queryByText("login")`
# 으로도 충족된다. 항목명이 서로의 접두사가 되는 표기가 도입되면 이 경계가 실제 사각이 된다.
#
# 주석 제거는 문자열·정규식 리터럴을 존중한다 — `"https://…"` 의 `//` 와 `/\/\//` 의 `//` 를
# 주석으로 오독하지 않는다 (문자열 리터럴 우선 매치 + `(?<![\\:])` 앞보기). 다만 문자열 안에
# `/*` 가 든 표기는 여기서 재지 않는다. 블록 주석은 줄 수를 보존한 채 비운다.
#
# 모집단은 `Navigation` 1 지점이다. spec §동작 (B-3) 이 도출한 `isAdmin → false` 23 지점 중
# 나머지 22 의 구별 단언 유무는 **미측정** 이며 (spec §미측정·비판정 항목) 여기서 판정하지
# 않는다. 모집단을 23 으로 넓히면 현 HEAD 가 즉시 붉어진다 — 확장은 별 task 다.
# 미측정을 정합으로 계상하지 않기 위해 이 문단을 남긴다.
# ──────────────────────────────────────────────────────────────────────────────
#
# 종료 코드 관습 — **현행 박제** (REQ-20260901-089 가 계약을 세우는 중이므로 여기서
# 새 코드를 도입하거나 의미를 옮기지 않는다):
# exit 0: (B-1) PASS (ack 1 줄 stdout).
# exit 1: 위반 — 도출 N 중 충족 K 가 N 에 미달한다 (K < N). 부분 퇴행도 위반이다.
# exit 2: 무판정 — 진리원 파일 부재 · 도출 공허 · **자가 확인 실패**.
#         "위반이 있다" 와 "잴 것이 없어졌다" 는 다른 사건이다. 0 을 충족으로 읽지 않는
#         것이 이 축의 핵심이며, 판정면이 자기 표본을 잡지 못하는 것도 잴 수 없는 상태다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 판정 모집단 주입 seam. 미설정 시 기본 모집단은 현행 도출과 완전히 동일하다 — pre-commit·CI 동작 불변.
BRANCH_DISC_ROOT="${BRANCH_DISCRIMINATION_SCAN_ROOT:-src/common}"

NAV_SRC="$ROOT/$BRANCH_DISC_ROOT/Navigation.tsx"
NAV_TEST="$ROOT/$BRANCH_DISC_ROOT/Navigation.test.tsx"

cd "$ROOT" || exit 1

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# --- 판정 함수 (실판정·자가 확인 공용) ----------------------------------------
# (I9) 활성 출현 확인 — 주석을 걷어낸 뒤에 판정한다. 줄 번호는 보존한다.
active_text() {   # $1=파일 → stdout: 주석을 걷어낸 원문
  perl -0777 -pe 's{("(?:[^"\\]|\\.)*"|\x27(?:[^\x27\\]|\\.)*\x27|`(?:[^`\\]|\\.)*`)|(/\*.*?\*/)|(?<![\\:])//[^\n]*}{ defined $1 ? $1 : defined $2 ? ($2 =~ s/[^\n]//gr) : "" }gse' "$1"
}

derive_names() {   # $1=파일 → stdout: 활성 항목명 (정렬·중복 제거)
  active_text "$1" | sed -nE 's/.*name:[[:space:]]*"([A-Za-z0-9_-]+)".*/\1/p' | sort -u
}

assertion_hit() {   # $1=항목명 $2=파일 → stdout: 1|0
  local m="$1" f="$2"
  if active_text "$f" | grep -qE "query(ByText|AllByText)\([^)]*$m[^)]*\)[^;]*(toBeNull|not\.toBeInTheDocument|toHaveLength\(0\))"; then
    printf '1'
  else
    printf '0'
  fi
}

selfcheck_fail() {
  printf 'check-declared-branch-discrimination: 무판정 — 자가 확인 실패 (%s)\n' "$1" >&2
  printf '  판정면이 자기 표본을 잡지 못하면 실트리의 수치는 측정이 아니다.\n' >&2
  exit 2
}

if [ ! -f "$NAV_SRC" ]; then
  printf 'check-declared-branch-discrimination: derive=0 vacuous — 분기 진리원 없음 (%s)\n' "$NAV_SRC" >&2
  exit 2
fi

if [ ! -f "$NAV_TEST" ]; then
  printf 'check-declared-branch-discrimination: derive=0 vacuous — 판정 대상 테스트 없음 (%s)\n' "$NAV_TEST" >&2
  exit 2
fi

# 항목명 도출 (활성 출현 한정).
names="$(derive_names "$NAV_SRC")"

if [ -z "$names" ]; then
  printf 'check-declared-branch-discrimination: derive=0 vacuous — %s 에서 항목명 도출 0건.\n' "$NAV_SRC" >&2
  printf '  표기가 바뀌었거나 정규식이 낡았다. 공허를 통과로 읽지 않는다.\n' >&2
  exit 2
fi

name_count="$(printf '%s\n' "$names" | grep -c .)"

# --- 자가 확인 (I9)(I10) ------------------------------------------------------
# 항목명마다 **정상 표본**과 **위반 표본**을 실판정과 같은 함수에 통과시킨다.
# 모집단 쪽(방향 B)과 충족 판정 쪽(방향 A)을 각각 왕복으로 잰다.
SC_SRC="$TMP_DIR/sc-src.tsx"
SC_TEST="$TMP_DIR/sc-test.tsx"
selfcheck_n=0

while IFS= read -r m; do
  [ -n "$m" ] || continue

  # 방향 B — 모집단: 활성 배열 원소는 도출되고, 주석 줄은 도출되지 않는다.
  printf '\t{ path: "/%s", name: "%s" },\n' "$m" "$m" > "$SC_SRC"
  [ "$(derive_names "$SC_SRC")" = "$m" ] || selfcheck_fail "모집단/$m 활성 표본 미도출"
  printf '\t// legacy item: name: "%s"\n' "$m" > "$SC_SRC"
  [ -z "$(derive_names "$SC_SRC")" ] || selfcheck_fail "모집단/$m 주석 표본이 도출에 들어왔다"

  # 방향 A — 충족 판정: 활성 단언은 hit=1, 주석 처리된 단언은 hit=0.
  printf '\t\texpect(screen.queryByText("%s")).toBeNull();\n' "$m" > "$SC_TEST"
  [ "$(assertion_hit "$m" "$SC_TEST")" = "1" ] || selfcheck_fail "충족판정/$m 활성 표본 미검출"
  printf '\t\t// expect(screen.queryByText("%s")).toBeNull();\n' "$m" > "$SC_TEST"
  [ "$(assertion_hit "$m" "$SC_TEST")" = "0" ] || selfcheck_fail "충족판정/$m 주석 표본이 판정에 들어왔다"

  selfcheck_n=$((selfcheck_n + 4))
done <<EOF
$names
EOF

if [ "$selfcheck_n" -ne "$((name_count * 4))" ]; then
  selfcheck_fail "자가 확인 왕복 수 불일치 (기대 $((name_count * 4)) 실측 $selfcheck_n)"
fi

# --- 실판정 -------------------------------------------------------------------
# 위 자가 확인을 통과하지 못하면 여기 오지 못하므로, 아래 `asserted` 는 판정면이
# 그 자리를 보고 있음을 확인한 항목만 센다 (FR-05).
asserted=0
missing=""
while IFS= read -r m; do
  [ -n "$m" ] || continue
  if [ "$(assertion_hit "$m" "$NAV_TEST")" = "1" ]; then
    asserted=$((asserted + 1))
  else
    missing="$missing $m"
  fi
done <<EOF
$names
EOF

printf 'check-declared-branch-discrimination: root=%s adminmenu=%s asserted=%s selfcheck=%s\n' \
  "$BRANCH_DISC_ROOT" "$name_count" "$asserted" "$selfcheck_n"

if [ "$asserted" -ne "$name_count" ]; then
  printf 'B-1 VIOLATION: 도출된 admin 항목 %s개 중 부재 단언 %s건 (미충족 %s건) (category: discriminating-assertion-absent)\n' \
    "$name_count" "$asserted" "$((name_count - asserted))" >&2
  printf '  미충족 항목:%s\n' "$missing" >&2
  printf '  음성 더블(isAdmin -> false)이 여는 갈래를 구별하는 단언이 도출 전항을 덮지 못한다.\n' >&2
  printf '  미충족 항목은 더블을 뒤집어도 초록이다 — 부분 퇴행도 위반이다.\n' >&2
  printf '  주석 처리한 단언은 미충족이다 — 판정은 활성 출현 한정이다.\n' >&2
  printf '  대상: %s\n' "$NAV_TEST" >&2
  exit 1
fi

exit 0
