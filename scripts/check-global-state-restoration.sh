#!/usr/bin/env bash
# check-global-state-restoration.sh
# Spec: testing/test-global-state-restoration-order-independence §동작 (FR-04)(NFR-02)
#       foundation/gate-effective-surface-and-variant-battery §동작 (I9)(I10)
# Task: TSK-20260827-04-b · TSK-20260901-13
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
# ── (I9) 활성 출현 확인 ────────────────────────────────────────────────────────
# 병이 두 겹이었다 (TSK-20260901-13 §배경 실측).
#
#   (1) 정합 단언의 양쪽이 텍스트였다. 충족 판정이 `grep -qF -- "$p"` 였으므로 훅 블록 안에
#       **프로퍼티 이름의 글자**만 있으면 복원으로 계수됐다 — 주석에 적힌 이름도 포함이다.
#   (2) 훅 블록 창이 경계를 넘었다. 종전 범위 패턴은 여는 줄만 앵커돼 있고 닫는 줄이
#       **단독 `});` 줄**이라, `afterEach(() => vi.unstubAllEnvs());` 처럼 한 줄로 끝나는
#       훅이 범위를 열어둔 채 흘러 다음 단독 `});` 까지의 주석과 이웃 훅을 통째로 삼켰다.
#
# 합쳐진 결과가 이것이다: **복원 호출을 통째로 지워도 게이트가 초록이었다.** 초록을 지탱한
# 것은 복원 코드가 아니라 삼켜진 주석 안의 글자 `navigator.onLine` 이었고, 그 글자만 바꾸면
# 붉어졌다 — 게이트가 실제 결함은 못 보고 주석은 봤다.
#
# 두 겹을 각각 닫는다:
#   (1) 충족 판정을 **복원 호출의 활성 출현**으로 한정한다 (§복원 형태 A~D). 판정 정규식은
#       `^([^/]|/[^/])*` 접두로 **그 줄에서 `//` 보다 앞선 위치**만 인정한다 — 주석 처리된
#       복원은 매치하지 않는다. (행 선두 앵커 계열 · 참조 구현:
#       scripts/check-vitest-globals-coherence.sh)
#   (2) 훅 블록 창을 **괄호 균형**으로 닫는다. 한 줄 완결형은 그 줄에서 닫히고, 여는 줄과
#       다른 줄에서 닫히는 형태는 균형이 맞는 줄까지만 창에 들어온다.
#
# 새 주석 제거 구현을 만들지 않았다. 판정면은 위 (1) 의 grep 접두 앵커이며, 블록 주석
# (`/* … */`) 은 훅 창 추출기가 상태 플래그로 건너뛴다. 현 모집단 7 파일의 `/*` 출현은
# **실측 0건**이다.
#
# ── (I10) 효력면 한쪽 고정 ─────────────────────────────────────────────────────
# 충족 판정 쪽을 효력면으로 고정했다. 프로퍼티마다 **정상 표본**(활성 복원) · **주석 표본**
# (복원이 주석 처리됨) · **경계 표본**(한 줄 훅 뒤에 복원 텍스트가 훅 밖에 있음) 셋을
# 실판정과 **같은 함수**에 통과시켜 `hit=1 / 0 / 0` 을 매 실행마다 확인한다 (§자가 확인).
# 정상 종료 시의 판정은 "이름의 글자가 있더라" 가 아니라 **"판정면이 그 자리를 실제로 보고
# 있음을 확인한 뒤 내린 것"** 이다.
#
# 자가 확인과 실판정은 **같은 함수의 서로 다른 호출**이며 사본이 아니다. 사본 둘을 두면
# 사본이 갈라지고, 실판정 경로를 들어내도 자가 확인만 초록으로 남는다.
# (참조 구현: scripts/check-summary-drift.sh 의 population_verdict)
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   대상 파일 = <scan-root> 하위에서 <file-glob> 에 걸리며 TARGET_ERE 를 가진 파일. 파일명
#              목록을 본문에 두지 않는다 — 신규 도입분이 모집단에 자동으로 들어와야 한다.
#   프로퍼티  = 그 파일의 `Object.defineProperty(<obj>, '<prop>'` **활성** 표기에서 추출 후
#              sort -u. `userAgent`·`sendBeacon`·`clipboard` 를 스크립트에 박지 않는다.
#              자가 확인 표본도 도출된 프로퍼티명으로 짓는다.
#   주입 seam = $GLOBAL_RESTORE_SCAN_ROOT · $GLOBAL_RESTORE_FILE_GLOB.
#              두 seam 모두 미설정이 기본이며 그때 도출은 소유 spec §수용 기준 1 의 명령
#              (`grep -rlE ... src --include="*.test.*"`) 과 동일 집합을 낸다.
#              **파일 glob 까지 seam 인 이유**: `vite.config.js` 의 `test` 블록에 `include`
#              override 가 없어 vitest 기본 include 가 적용되므로 `*.test.js` 이름을 가진
#              픽스처는 실제 테스트로 수집돼 `npm test` 안에서 실행된다. 그래서 주입 픽스처는
#              `*.testcase.js` 로 두고 glob 을 갈아끼워 겨눈다.
#              (spec: foundation/gate-judgement-population-injectable-seam)
#
# §복원 형태 — 훅 블록 안에서 복원으로 인정하는 표기. 현 트리 실측에서 도출했다:
#   A) `Object.defineProperty(<obj>, '<prop>', <descriptor>)`  — descriptor 재정의
#   B) `delete …).<prop>` / `delete <obj>.<prop>`              — 삭제로 원복
#      (`Writer.test.tsx` 의 `scrollHeight` 는 A 가 아니라 B 로만 원복한다)
#   C) `vi.stubGlobal('<prop>', …)`                            — vitest 전역 stub 경로
#   D) `<obj>.<prop> = …`                                      — 직접 대입
#   형태를 늘릴 때는 자가 확인 표본도 함께 늘린다 — 인정 형태가 표본보다 넓어지면 그 차이는
#   측정되지 않는다.
#
# §정규식 표기 — 소유 spec 의 명령은 `\s` 를 쓰고 여기서는 `[[:space:]]` 를 쓴다. 의미는
#   동일하며(공백류 1문자) POSIX 문자클래스 쪽이 grep 구현 의존이 없다. 도출 집합 동일성은
#   도입 task 의 DoD 에서 spec 명령과 나란히 실행해 확인했다.
#
# ── 검출 경계 (과신 금지) ──────────────────────────────────────────────────────
# 이 게이트는 §복원 형태의 **활성 출현**을 재며, 그 호출이 실제로 원래 descriptor 를
# 되돌리는지(값의 정합)는 재지 않는다. 형태가 맞으면 값이 틀려도 충족으로 읽힌다.
#
# `Object.defineProperty(` 와 프로퍼티 문자열이 **서로 다른 줄**에 놓인 표기는 추출되지
# 않는다 (grep 은 줄 단위). 현 트리 표기는 전부 같은 줄이며, 줄을 쪼개는 표기가 도입되면
# 그 프로퍼티는 모집단에서 조용히 빠진다 — 이 문단을 미측정 표면으로 남긴다.
#
# `//` 앞보기는 문자열 리터럴을 해석하지 않는다. 복원 호출과 같은 줄 **앞쪽**에 `://` 를
# 담은 문자열이 있으면 그 줄은 판정에서 빠진다 (거짓 음성 아닌 거짓 위반 방향). 현 트리
# 훅 블록에 해당 표기는 없다. 블록 주석 상태 추적도 문자열 안의 `/*` 는 해석하지 않는다 —
# scripts/check-declared-branch-discrimination.sh 가 선언한 것과 같은 경계다.
#
# 괄호 균형은 주석·문자열 안의 괄호를 구별하지 않는다. 훅 블록 안 주석에 짝이 맞지 않는
# 괄호가 들어오면 창이 어긋날 수 있다. 자가 확인 §경계 표본이 이 축의 회귀를 잡는다.
# ──────────────────────────────────────────────────────────────────────────────
#
# 종료 코드 관습 — **현행 박제** (REQ-20260901-089 가 계약을 세우는 중이므로 여기서
# 새 코드를 도입하거나 의미를 옮기지 않는다):
# exit 0: (FR-04)(NFR-02) PASS (ack 1 줄 stdout).
# exit 1: 위반 — 복원 등록 없는 프로퍼티가 1건 이상. 부분 퇴행도 위반이다.
# exit 2: 무판정 — 스캔 루트 부재 · 대상 파일 0건 · 어떤 파일의 프로퍼티 추출 0건 ·
#         **자가 확인 실패**. "위반이 있다" 와 "잴 것이 없어졌다" 를 합치지 않는다.
#         도출 0 을 충족으로 읽는 순간 표기가 바뀌기만 해도 게이트가 영구 초록이 된다
#         (RULE-06 §추출 실패 검출). 판정면이 자기 표본을 못 잡는 것도 잴 수 없는 상태다.

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

# 판정 모집단 주입 seam. 미설정 시 기본 모집단은 spec §수용 기준 1 의 도출과 동일하다
# — pre-commit·CI 동작이 spec 판정과 어긋나지 않는다.
GLOBAL_RESTORE_SCAN_ROOT="${GLOBAL_RESTORE_SCAN_ROOT:-src}"
GLOBAL_RESTORE_FILE_GLOB="${GLOBAL_RESTORE_FILE_GLOB:-*.test.*}"

TARGET_ERE='Object\.defineProperty[[:space:]]*\([[:space:]]*(window|globalThis|navigator)'
PROP_ERE='Object\.defineProperty[[:space:]]*\([^,]+,[[:space:]]*['"'"'"][A-Za-z_$]+'

# 활성 위치 접두 — 그 줄에서 `//` 보다 앞선 위치만 인정한다.
ACTIVE_PREFIX='^([^/]|/[^/])*'

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# --- 훅 창 추출기 (실판정·자가 확인 공용) --------------------------------------
# 괄호 균형으로 닫는다. 한 줄 완결형은 그 줄에서 닫힌다 (종전 병 (2) 의 정정).
# 블록 주석 안의 줄은 창에 넣지 않는다.
HOOK_AWK='
function cnt(s, pat,   t) { t = s; return gsub(pat, "", t) }
{
  bc_start = bc
  bc += cnt($0, "/\\*") - cnt($0, "\\*/")
  if (bc < 0) bc = 0
  if (!inhook && bc_start == 0 && $0 ~ /^[[:space:]]*(afterEach|afterAll)[[:space:]]*\(/) { inhook = 1; depth = 0 }
  if (inhook) {
    depth += cnt($0, "\\(") - cnt($0, "\\)")
    if (bc_start == 0) print
    if (depth <= 0) inhook = 0
  }
}
'

hook_window() {   # $1=파일 → stdout: 훅 등록 블록의 활성 줄
  awk "$HOOK_AWK" "$1"
}

restore_ere() {   # $1=프로퍼티명 → stdout: 그 프로퍼티의 복원 정규식 (§복원 형태 A~D)
  local p="$1"
  printf '%s(Object\\.defineProperty[[:space:]]*\\([^,]+,[[:space:]]*['"'"'"]%s['"'"'"]|delete[[:space:]][^;]*\\.%s[[:space:]]*;|vi\\.stubGlobal[[:space:]]*\\([[:space:]]*['"'"'"]%s['"'"'"]|\\.%s[[:space:]]*=[^=])' \
    "$ACTIVE_PREFIX" "$p" "$p" "$p" "$p"
}

restore_hit() {   # $1=프로퍼티명 $2=파일 → stdout: 1|0
  local p="$1" f="$2"
  if hook_window "$f" | grep -qE "$(restore_ere "$p")"; then
    printf '1'
  else
    printf '0'
  fi
}

derive_props() {   # $1=파일 → stdout: 활성 재정의 프로퍼티명 (정렬·중복 제거)
  grep -oE "${ACTIVE_PREFIX}${PROP_ERE}" "$1" | sed -E "s/.*['\"]//" | sort -u
}

selfcheck_fail() {
  printf 'check-global-state-restoration: 무판정 — 자가 확인 실패 (%s)\n' "$1" >&2
  printf '  판정면이 자기 표본을 잡지 못하면 실트리의 missing=0 은 측정이 아니다.\n' >&2
  exit 2
}

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
selfcheck_n=0
missing_lines=""

SC_OK="$TMP_DIR/sc-ok.tsx"
SC_COMMENT="$TMP_DIR/sc-comment.tsx"
SC_BOUNDARY="$TMP_DIR/sc-boundary.tsx"

while IFS= read -r f; do
  [ -n "$f" ] || continue

  props="$(derive_props "$f")"

  # 추출 실패 검출 (RULE-06) — 빈 결과를 조건에 넘겨 rc=0 이 되게 두지 않는다.
  if [ -z "$props" ]; then
    printf 'check-global-state-restoration: derive=0 vacuous — 프로퍼티 추출 0건 (%s)\n' "$f" >&2
    printf '  파일은 전역 재정의를 갖는데 프로퍼티명이 뽑히지 않았다. 표기 변화 의심.\n' >&2
    exit 2
  fi

  while IFS= read -r p; do
    [ -n "$p" ] || continue
    prop_total=$((prop_total + 1))

    # --- 자가 확인 (I9)(I10) — 실판정과 같은 함수에 표본 3종을 통과시킨다 -------
    # 정상 표본: 훅 블록 안의 활성 복원 → hit=1
    printf 'afterAll(() => {\n\tObject.defineProperty(navigator, %s%s%s, { value: true, configurable: true });\n});\n' \
      "'" "$p" "'" > "$SC_OK"
    [ "$(restore_hit "$p" "$SC_OK")" = "1" ] || selfcheck_fail "$f/$p 정상 표본 미검출"

    # 주석 표본: 같은 복원이 주석 처리됨 → hit=0 (종전 병 (1))
    printf 'afterAll(() => {\n\t// Object.defineProperty(navigator, %s%s%s, { value: true, configurable: true });\n});\n' \
      "'" "$p" "'" > "$SC_COMMENT"
    [ "$(restore_hit "$p" "$SC_COMMENT")" = "0" ] || selfcheck_fail "$f/$p 주석 표본이 복원으로 계수됐다"

    # 경계 표본: 한 줄 완결 훅 뒤, **훅 밖** 에 복원 텍스트 → hit=0 (종전 병 (2))
    printf 'afterEach(() => vi.unstubAllEnvs());\n\n// Object.defineProperty(navigator, %s%s%s, { value: true });\nconst probe = 1;\nafterAll(() => {\n\tnoop();\n});\n' \
      "'" "$p" "'" > "$SC_BOUNDARY"
    [ "$(restore_hit "$p" "$SC_BOUNDARY")" = "0" ] || selfcheck_fail "$f/$p 훅 밖 텍스트가 창에 들어왔다"

    selfcheck_n=$((selfcheck_n + 3))

    # --- 실판정 ---------------------------------------------------------------
    if [ "$(restore_hit "$p" "$f")" = "0" ]; then
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

if [ "$selfcheck_n" -ne "$((prop_total * 3))" ]; then
  selfcheck_fail "자가 확인 왕복 수 불일치 (기대 $((prop_total * 3)) 실측 $selfcheck_n)"
fi

printf 'check-global-state-restoration: root=%s glob=%s files=%s props=%s missing=%s selfcheck=%s\n' \
  "$GLOBAL_RESTORE_SCAN_ROOT" "$GLOBAL_RESTORE_FILE_GLOB" "$file_count" "$prop_total" "$miss" "$selfcheck_n"

if [ "$miss" -ne 0 ]; then
  printf 'FR-04 VIOLATION: 재정의 프로퍼티 %s건 중 복원 등록 부재 %s건 (category: global-state-restoration-absent)\n' \
    "$prop_total" "$miss" >&2
  printf '%s\n' "$missing_lines" | grep -v '^$' >&2
  printf '  복원은 afterEach/afterAll **훅 등록 블록** 안에서만 계수한다 (NFR-02).\n' >&2
  printf '  it 본문의 직렬 호출은 등록이 아니다 — 케이스가 던지면 실행되지 않고 뒤 케이스로 누출된다.\n' >&2
  printf '  주석 처리한 복원은 미복원이다 — 판정은 §복원 형태의 활성 출현 한정이다.\n' >&2
  printf '  누출된 전역은 실행 순서를 커버리지 수치의 함수로 만든다. 부분 퇴행도 위반이다.\n' >&2
  exit 1
fi

exit 0
