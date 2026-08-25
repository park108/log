#!/usr/bin/env bash
# check-declared-branch-discrimination.sh
# Spec: testing/declared-branch-discriminating-assertion §동작 (B-1)(B-3) · §수용 기준 (Must, B-1)
# Task: TSK-20260825-33
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
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   항목명   = $NAV_SRC 의 `name: "…"` 표기. 실측 3 항목 (log · file · mon).
#              `log`·`file`·`mon` 을 스크립트에 박지 않는다 — 4번째 admin 메뉴가 추가되면
#              모집단에 자동으로 들어와야 한다.
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
# 임계는 spec 이 정한 `asserted >= 1` 이다. 도출 항목이 3 이어도 **1건만 있으면 통과**하므로
# 3 중 2 를 지우는 부분 퇴행은 이 게이트가 잡지 않는다 (도입 시 실측 확인). spec §수용 기준이
# "기준은 ≥1 이므로 착지는 요구를 초과한다" 로 그 여유를 명시 승인한 상태다. 임계 상향은
# spec 개정이 선행해야 한다 — 게이트가 spec 보다 엄격해지면 판정 근거가 문서 밖으로 샌다.
#
# 항목명 매칭은 부분 문자열이다 (`[^)]*<name>[^)]*`). `name: "log"` 는 `queryByText("login")`
# 으로도 충족된다. 항목명이 서로의 접두사가 되는 표기가 도입되면 이 경계가 실제 사각이 된다.
#
# 모집단은 `Navigation` 1 지점이다. spec §동작 (B-3) 이 도출한 `isAdmin → false` 23 지점 중
# 나머지 22 의 구별 단언 유무는 **미측정** 이며 (spec §미측정·비판정 항목) 여기서 판정하지
# 않는다. 모집단을 23 으로 넓히면 현 HEAD 가 즉시 붉어진다 — 확장은 별 task 다.
# 미측정을 정합으로 계상하지 않기 위해 이 문단을 남긴다.
# ──────────────────────────────────────────────────────────────────────────────
#
# exit 0: (B-1) PASS (ack 1 줄 stdout).
# exit 1: 위반 — 도출된 항목 중 어느 것도 부재 단언을 갖지 않는다.
# exit 2: 도출 공허 (측정 대상 소실) — "위반이 있다" 와 "잴 것이 없어졌다" 는 다른 사건이다.
#         0 을 충족으로 읽지 않는 것이 이 축의 핵심이다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 판정 모집단 주입 seam. 미설정 시 기본 모집단은 현행 도출과 완전히 동일하다 — pre-commit·CI 동작 불변.
BRANCH_DISC_ROOT="${BRANCH_DISCRIMINATION_SCAN_ROOT:-src/common}"

NAV_SRC="$ROOT/$BRANCH_DISC_ROOT/Navigation.tsx"
NAV_TEST="$ROOT/$BRANCH_DISC_ROOT/Navigation.test.tsx"

cd "$ROOT" || exit 1

if [ ! -f "$NAV_SRC" ]; then
  printf 'check-declared-branch-discrimination: derive=0 vacuous — 분기 진리원 없음 (%s)\n' "$NAV_SRC" >&2
  exit 2
fi

if [ ! -f "$NAV_TEST" ]; then
  printf 'check-declared-branch-discrimination: derive=0 vacuous — 판정 대상 테스트 없음 (%s)\n' "$NAV_TEST" >&2
  exit 2
fi

# 항목명 도출.
names="$(sed -nE 's/.*name:[[:space:]]*"([A-Za-z0-9_-]+)".*/\1/p' "$NAV_SRC" | sort -u)"

if [ -z "$names" ]; then
  printf 'check-declared-branch-discrimination: derive=0 vacuous — %s 에서 항목명 도출 0건.\n' "$NAV_SRC" >&2
  printf '  표기가 바뀌었거나 정규식이 낡았다. 공허를 통과로 읽지 않는다.\n' >&2
  exit 2
fi

name_count="$(printf '%s\n' "$names" | grep -c .)"

# 각 항목명에 대한 부재 단언 실재 검사.
asserted=0
missing=""
while IFS= read -r m; do
  [ -n "$m" ] || continue
  if grep -qE "query(ByText|AllByText)\([^)]*$m[^)]*\)[^;]*(toBeNull|not\.toBeInTheDocument|toHaveLength\(0\))" "$NAV_TEST"; then
    asserted=$((asserted + 1))
  else
    missing="$missing $m"
  fi
done <<EOF
$names
EOF

printf 'check-declared-branch-discrimination: root=%s adminmenu=%s asserted=%s\n' \
  "$BRANCH_DISC_ROOT" "$name_count" "$asserted"

if [ "$asserted" -lt 1 ]; then
  printf 'B-1 VIOLATION: 도출된 admin 항목 %s개 중 부재 단언 0건 (category: discriminating-assertion-absent)\n' "$name_count" >&2
  printf '  미충족 항목:%s\n' "$missing" >&2
  printf '  음성 더블(isAdmin -> false)이 여는 갈래를 구별하는 단언이 없다. 더블을 뒤집어도 초록이다.\n' >&2
  printf '  대상: %s\n' "$NAV_TEST" >&2
  exit 1
fi

exit 0
