#!/usr/bin/env bash
# check-global-state-restoration.sh
# Spec: testing/test-global-state-restoration-order-independence §동작 (FR-04)(NFR-02)
# Task: TSK-20260827-04-b
#
# (FR-04) 원복 없는 전역 재정의를 정적으로 검출한다. 검출 단위는 **재정의된 프로퍼티**이며
#         파일이 아니다 — 파일 단위 판정은 무관한 훅 1건의 존재만으로 통과하므로 성기다.
#         재정의된 각 프로퍼티마다 동일 파일에 대응하는 복원 등록이 있어야 한다.
#
# (NFR-02) 복원으로 계수하는 것은 `afterEach`·`afterAll` **훅 등록 블록** 안의 등장뿐이다.
#         `it` 본문의 직렬 호출은 등록이 아니다 — 그 케이스가 중간에 던지면 원복이 실행되지
#         않고, shuffle 로 뒤 케이스가 앞으로 오면 오염된 전역을 본다. 본문 호출을 등록으로
#         계수하면 게이트가 정확히 그 결함을 통과시킨다.
#
# **테스트는 이 축의 채널이 될 수 없다.** 전역 누수는 단일 순서 1회 실행에서 초록이다.
#       현행 커버리지 게이트는 전부 단일 순서 1회 실행을 측정하므로 순서를 바꿔야만 드러나는
#       슬롯 이동을 구조적으로 보지 못한다 (spec §역할). 실측: 원복 훅 0건 트리에서
#       `base=139 / seed=138,138`, 원복 등록 후 `140/140/140` — 통과 수는 양쪽 다 동일했다.
#       그래서 정적 판정이 유일한 발화 채널이다.
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   대상 파일 = <scan-root> 하위에서 <file-glob> 에 걸리며 TARGET_ERE 를 가진 파일. 파일명
#              목록을 본문에 두지 않는다 — 신규 도입분이 모집단에 자동으로 들어와야 한다.
#   프로퍼티  = 그 파일의 `Object.defineProperty(<obj>, '<prop>'` 표기에서 추출 후 sort -u.
#              `userAgent`·`sendBeacon`·`clipboard` 를 스크립트에 박지 않는다.
#   주입 seam = $GLOBAL_RESTORE_SCAN_ROOT · $GLOBAL_RESTORE_FILE_GLOB.
#              두 seam 모두 미설정이 기본이며 그때 도출은 소유 spec §수용 기준 1 의 명령
#              (`grep -rlE ... src --include="*.test.*"`) 과 동일 집합을 낸다.
#              **파일 glob 까지 seam 인 이유**: `vite.config.js` 의 `test` 블록에 `include`
#              override 가 없어 vitest 기본 include 가 적용되므로 `*.test.js` 이름을 가진
#              픽스처는 실제 테스트로 수집돼 `npm test` 안에서 실행된다. 그래서 주입 픽스처는
#              `*.testcase.js` 로 두고 glob 을 갈아끼워 겨눈다.
#              (spec: foundation/gate-judgement-population-injectable-seam)
#
# §정규식 표기 — 소유 spec 의 명령은 `\s` 를 쓰고 여기서는 `[[:space:]]` 를 쓴다. 의미는
#   동일하며(공백류 1문자) POSIX 문자클래스 쪽이 grep 구현 의존이 없다. 도출 집합 동일성은
#   도입 task 의 DoD 에서 spec 명령과 나란히 실행해 확인했다.
#
# ── 검출 경계 (과신 금지) ──────────────────────────────────────────────────────
# 이 게이트는 훅 등록 블록 안에 **프로퍼티명이 등장하는지**만 재며, 그 등장이 실제로 원래
# descriptor 를 되돌리는지는 재지 않는다. 주석에 프로퍼티명만 적어도 충족으로 읽힌다.
#
# `Object.defineProperty(` 와 프로퍼티 문자열이 **서로 다른 줄**에 놓인 표기는 추출되지
# 않는다 (grep 은 줄 단위). 현 트리 표기는 전부 같은 줄이며, 줄을 쪼개는 표기가 도입되면
# 그 프로퍼티는 모집단에서 조용히 빠진다 — 이 문단을 미측정 표면으로 남긴다.
#
# 훅 블록 경계는 `awk` 범위 패턴(`afterEach(` … 첫 `});`)이다. 중첩 블록이 등장하면 범위가
# 이르게 닫힐 수 있다. 현 트리·픽스처에서는 관측되지 않는다.
# ──────────────────────────────────────────────────────────────────────────────
#
# exit 0: (FR-04)(NFR-02) PASS (ack 1 줄 stdout).
# exit 1: 위반 — 복원 등록 없는 프로퍼티가 1건 이상. 부분 퇴행도 위반이다.
# exit 2: 무판정 — 스캔 루트 부재 · 대상 파일 0건 · 어떤 파일의 프로퍼티 추출 0건.
#         "위반이 있다" 와 "잴 것이 없어졌다" 를 합치지 않는다. 도출 0 을 충족으로 읽는 순간
#         표기가 바뀌기만 해도 게이트가 영구 초록이 된다 (RULE-06 §추출 실패 검출).

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

# 판정 모집단 주입 seam. 미설정 시 기본 모집단은 spec §수용 기준 1 의 도출과 동일하다
# — pre-commit·CI 동작이 spec 판정과 어긋나지 않는다.
GLOBAL_RESTORE_SCAN_ROOT="${GLOBAL_RESTORE_SCAN_ROOT:-src}"
GLOBAL_RESTORE_FILE_GLOB="${GLOBAL_RESTORE_FILE_GLOB:-*.test.*}"

TARGET_ERE='Object\.defineProperty[[:space:]]*\([[:space:]]*(window|globalThis|navigator)'
PROP_ERE='Object\.defineProperty[[:space:]]*\([^,]+,[[:space:]]*['"'"'"][A-Za-z_$]+'
HOOK_RANGE='/^[[:space:]]*(afterEach|afterAll)[[:space:]]*\(/,/^[[:space:]]*\}\);?[[:space:]]*$/'

if [ ! -d "$GLOBAL_RESTORE_SCAN_ROOT" ]; then
  printf 'check-global-state-restoration: derive=0 vacuous — 스캔 루트 없음 (%s)\n' \
    "$GLOBAL_RESTORE_SCAN_ROOT" >&2
  printf '  잴 대상이 없는 것은 충족이 아니다.\n' >&2
  exit 2
fi

files="$(grep -rlE "$TARGET_ERE" "$GLOBAL_RESTORE_SCAN_ROOT" \
  --include="$GLOBAL_RESTORE_FILE_GLOB" 2>/dev/null | sort)"

if [ -z "$files" ]; then
  printf 'check-global-state-restoration: derive=0 vacuous — 대상 파일 0건 (root=%s glob=%s)\n' \
    "$GLOBAL_RESTORE_SCAN_ROOT" "$GLOBAL_RESTORE_FILE_GLOB" >&2
  printf '  전역 재정의 표기가 사라졌거나 도출 정규식이 낡았다. 공허를 통과로 읽지 않는다.\n' >&2
  exit 2
fi

file_count="$(printf '%s\n' "$files" | grep -c .)"

prop_total=0
miss=0
missing_lines=""

while IFS= read -r f; do
  [ -n "$f" ] || continue

  props="$(grep -oE "$PROP_ERE" "$f" | sed -E "s/.*['\"]//" | sort -u)"

  # 추출 실패 검출 (RULE-06) — 빈 결과를 조건에 넘겨 rc=0 이 되게 두지 않는다.
  if [ -z "$props" ]; then
    printf 'check-global-state-restoration: derive=0 vacuous — 프로퍼티 추출 0건 (%s)\n' "$f" >&2
    printf '  파일은 전역 재정의를 갖는데 프로퍼티명이 뽑히지 않았다. 표기 변화 의심.\n' >&2
    exit 2
  fi

  hooks="$(awk "$HOOK_RANGE" "$f")"

  while IFS= read -r p; do
    [ -n "$p" ] || continue
    prop_total=$((prop_total + 1))
    if ! printf '%s\n' "$hooks" | grep -qF -- "$p"; then
      miss=$((miss + 1))
      missing_lines="$missing_lines
[MISSING] $f :: $p"
    fi
  done <<EOF
$props
EOF
done <<EOF
$files
EOF

printf 'check-global-state-restoration: root=%s glob=%s files=%s props=%s missing=%s\n' \
  "$GLOBAL_RESTORE_SCAN_ROOT" "$GLOBAL_RESTORE_FILE_GLOB" "$file_count" "$prop_total" "$miss"

if [ "$miss" -ne 0 ]; then
  printf 'FR-04 VIOLATION: 재정의 프로퍼티 %s건 중 복원 등록 부재 %s건 (category: global-state-restoration-absent)\n' \
    "$prop_total" "$miss" >&2
  printf '%s\n' "$missing_lines" | grep -v '^$' >&2
  printf '  복원은 afterEach/afterAll **훅 등록 블록** 안에서만 계수한다 (NFR-02).\n' >&2
  printf '  it 본문의 직렬 호출은 등록이 아니다 — 케이스가 던지면 실행되지 않고 뒤 케이스로 누출된다.\n' >&2
  printf '  누출된 전역은 실행 순서를 커버리지 수치의 함수로 만든다. 부분 퇴행도 위반이다.\n' >&2
  exit 1
fi

exit 0
