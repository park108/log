#!/usr/bin/env bash
# check-coverage-slot-order-invariance.sh
# Spec: testing/test-global-state-restoration-order-independence §동작 2 (FR-02)
# Task: TSK-20260827-05
#
# (FR-02) `src/common/common.ts` 분기 귀속은 테스트 실행 순서의 함수가 아니다. 임의 seed 의
#         `--sequence.shuffle` 실행이 기본 순서와 **동일한 covered 슬롯 집합** 을 낸다.
#
# ── 왜 개수가 아니라 집합인가 ─────────────────────────────────────────────────
# 소유 spec 은 "동일한 covered 슬롯 **집합**" 을 선언하는데 종전 수용 기준 명령은
# `total.branches.covered` 라는 **스칼라 개수** 를 쟀다. 개수는 집합의 성긴 대리물이다:
#   (a) 순서와 무관한 슬롯 1건의 **교체** 는 집합을 바꾸면서 개수를 보존한다 (거짓 통과).
#   (b) 순서와 무관한 cold-start 슬롯 1건의 **증감** 은 집합 차이가 없는데 개수를 흔든다
#       (거짓 위반). 실측 — 동일 HEAD·동일 명령 3회 호출에서 개수 판정의 rc 가 진동했다
#       (1회차 불일치 rc=1, 2·3회차 일치 rc=0). 수치는 spec §참고 에 있고 **여기 적지 않는다**:
#       게이트 본문에 절대값을 적어 두면 다음 사람이 그것을 임계로 승격시킨다.
# 집합은 개수의 상위 개념이므로 (a)(b) 를 동시에 닫는다. 별도 실행 채널이 필요 없고
# 리포터만 `json-summary` → `json` 이면 된다 (`coverage-final.json` 의 `b` = 분기 그룹 id →
# 슬롯별 히트 배열). 이는 `blue/testing/acceptance-command-measures-declared-subject` 준수다.
#
# ── 공허한 통과 차단 (이 게이트의 급소) ──────────────────────────────────────
# **빈 집합 2개는 서로 같다.** 측정이 실패하면 비교는 자동으로 성립하고 게이트는 초록이
# 된다 — 검출력 0 인 게이트가 정상 트리에서 전부 통과하는 바로 그 형태다 (RULE-06).
# 그래서 각 실행마다 슬롯 집합이 **비어있지 않음** 을 단언하고, 비었거나 산출물이 없거나
# 대상 파일 엔트리가 없으면 exit 0 이 아니라 **exit 2** (판정 불가) 로 끝낸다. 소유 spec
# §수용 기준 2 의 `[EXTRACT-FAIL] empty measure` 가 이 방향을 이미 선언하고 있다.
#
# ── cold-start 격리 ──────────────────────────────────────────────────────────
# 측정 전 **폐기용 warm-up 실행 1회** 를 수행하고 그 결과를 버린다. 이후 base·seed 실행은
# 모두 동일하게 데워진 상태이므로 순서 종속(FR-02 가 겨누는 것)은 그대로 드러나고 첫 실행
# 고유의 슬롯 이동만 제거된다 (`10.followups/20260826-1730` 축). warm-up 수행 사실은 ack
# 1행에 **반드시** 적는다 — 적지 않으면 게이트가 오염을 조용히 가리는 것과 구별되지 않는다.
#
# ── 검출 경계 (과신 금지) ────────────────────────────────────────────────────
# 이 게이트는 base 와 각 seed 실행의 슬롯 집합 **일치** 를 잰다. 세 실행이 모두 같은 방식으로
# 틀린 경우(예: 대상 파일 자체가 축소돼 슬롯이 함께 줄어든 경우)는 위반으로 보이지 않는다.
# 절대값은 의도적으로 고정하지 않는다 — 회차 간 절대값 이동은 별 축이며 (spec §참고)
# 여기에 임계로 박으면 그 축의 잡음이 이 축의 rc 로 새어 든다.
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   대상 파일 엔트리 = `coverage-final.json` 의 절대경로 키를 **접미사 매칭** 으로 찾는다.
#                      키를 본문에 박지 않는다 — 체크아웃 경로가 바뀌면 즉시 깨진다.
#   슬롯 목록       = `b` 순회로 히트>0 인 `<branchId>:<slotIndex>` 를 수집한다.
#   seed 목록       = $COVERAGE_SLOT_ORDER_SEEDS. 본문에 seed 를 고정하지 않는다.
#
# exit 0: (FR-02) PASS (ack 1 줄 stdout).
# exit 1: 위반 — base 와 seed 실행의 covered 슬롯 집합이 다르다. 차집합 슬롯 id 를
#         `branchMap` 시작 라인번호와 함께 stderr 에 열거한다.
# exit 2: 무판정 — 측정 불능 (산출물 부재 · 대상 엔트리 부재 · 슬롯 도출 0 · 스위트 실패).
#         "위반이 있다" 와 "잴 것이 없어졌다" 는 다른 사건이다. 0 을 충족으로 읽지 않는다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

# 판정 모집단 주입 seam. 미설정 시 기본은 소유 spec 이 지목한 (FR-02) 대상이다.
SLOT_ORDER_SCAN_ROOT="${COVERAGE_SLOT_ORDER_SCAN_ROOT:-src/common/common.ts}"
SLOT_ORDER_TEST_FILES="${COVERAGE_SLOT_ORDER_TEST_FILES:-src/common/common.test.ts}"

# seed 목록·warm-up 여부도 주입 가능하다. 본문 하드코딩 금지 (구현 지시 2).
SLOT_ORDER_SEEDS="${COVERAGE_SLOT_ORDER_SEEDS:-20260824 424242}"
SLOT_ORDER_WARMUP="${COVERAGE_SLOT_ORDER_WARMUP:-1}"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/cov-slot-XXXXXX")" || {
  printf 'check-coverage-slot-order-invariance: [EXTRACT-FAIL] 작업 디렉터리 생성 실패\n' >&2
  exit 2
}
# 삭제 대상을 자기 템플릿으로 좁힌다 — 변수가 비거나 오염된 상태의 광역 삭제를 구조적으로 막는다.
cleanup() {
  case "$WORK" in
    */cov-slot-*) [ -d "$WORK" ] && rm -rf "$WORK" ;;
  esac
}
trap cleanup EXIT

fail_unjudged() {
  printf 'check-coverage-slot-order-invariance: [EXTRACT-FAIL] %s\n' "$1" >&2
  printf '  빈 집합 2개는 서로 같다 — 측정 불능을 통과로 읽지 않는다.\n' >&2
  exit 2
}

run_coverage() {
  # $1 = label, 나머지 = 추가 vitest 인자
  _label="$1"
  shift
  # SLOT_ORDER_TEST_FILES 는 복수 파일 주입을 허용하므로 의도적으로 분할한다.
  # shellcheck disable=SC2086
  npx vitest run $SLOT_ORDER_TEST_FILES \
    --coverage --coverage.reporter=json \
    --coverage.reportsDirectory="$WORK/$_label" \
    --coverage.include="$SLOT_ORDER_SCAN_ROOT" \
    --coverage.thresholds.branches=0 --coverage.thresholds.lines=0 \
    --coverage.thresholds.functions=0 --coverage.thresholds.statements=0 \
    "$@" >"$WORK/$_label.log" 2>&1
}

extract_slots() {
  # $1 = coverage-final.json 경로. stdout 1행 = "<branchId>:<slotIndex>\t<line>"
  node -e '
const fs = require("fs");
const [file, target] = process.argv.slice(1);
let json;
try { json = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { process.exit(3); }
const norm = (p) => String(p).replace(/\\/g, "/").replace(/^\.\//, "");
const want = norm(target);
const key = Object.keys(json).find((k) => norm(k) === want || norm(k).endsWith("/" + want));
if (!key) process.exit(4);
const entry = json[key] || {};
const b = entry.b || {};
const bm = entry.branchMap || {};
const out = [];
for (const id of Object.keys(b)) {
  const hits = b[id] || [];
  for (let i = 0; i < hits.length; i++) {
    if (hits[i] > 0) {
      const g = bm[id] || {};
      const loc = (g.locations && g.locations[i]) || g.loc || {};
      const line = (loc.start && loc.start.line != null) ? loc.start.line : "?";
      out.push(id + ":" + i + "\t" + line);
    }
  }
}
out.sort();
process.stdout.write(out.map((l) => l + "\n").join(""));
' "$1" "$SLOT_ORDER_SCAN_ROOT"
}

measure() {
  # $1 = label, 나머지 = 추가 vitest 인자. 산출: $WORK/$label.slots (+ .sig)
  _m_label="$1"
  shift
  if ! run_coverage "$_m_label" "$@"; then
    printf 'check-coverage-slot-order-invariance: [EXTRACT-FAIL] run=%s 스위트가 실패해 측정이 성립하지 않는다.\n' "$_m_label" >&2
    tail -n 20 "$WORK/$_m_label.log" >&2
    exit 2
  fi

  _m_json="$WORK/$_m_label/coverage-final.json"
  [ -f "$_m_json" ] || fail_unjudged "run=$_m_label coverage-final.json 부재 ($_m_json)"

  extract_slots "$_m_json" >"$WORK/$_m_label.slots"
  _m_rc=$?
  if [ "$_m_rc" -eq 4 ]; then
    fail_unjudged "run=$_m_label 대상 파일 엔트리 부재 — 접미사 '$SLOT_ORDER_SCAN_ROOT' 와 매치되는 커버리지 키가 없다."
  elif [ "$_m_rc" -ne 0 ]; then
    fail_unjudged "run=$_m_label 슬롯 추출 실패 (node rc=$_m_rc)"
  fi

  _m_count="$(grep -c . "$WORK/$_m_label.slots" || true)"
  _m_count="${_m_count:-0}"
  if [ "$_m_count" -eq 0 ]; then
    fail_unjudged "run=$_m_label covered 슬롯 0건 — 도출이 공허하다."
  fi

  LC_ALL=C sort -o "$WORK/$_m_label.slots" "$WORK/$_m_label.slots"
  cut -f1 "$WORK/$_m_label.slots" >"$WORK/$_m_label.sig"

  # 반환은 전역 변수다. `$(measure ...)` 로 감싸면 measure 가 서브셸에서 돌아 fail_unjudged 의
  # exit 2 가 서브셸만 죽이고 본체는 빈 값으로 계속 간다 — 공허한 통과가 바로 그 경로로 생긴다.
  MEASURED_COUNT="$_m_count"
}

# ── warm-up (폐기) ────────────────────────────────────────────────────────────
warmup_note="warmup=skipped(COVERAGE_SLOT_ORDER_WARMUP=$SLOT_ORDER_WARMUP)"
if [ "$SLOT_ORDER_WARMUP" != "0" ]; then
  # 결과를 판정에 쓰지 않는다. cold-start 슬롯 이동만 흡수하는 것이 목적이다.
  run_coverage warmup || true
  warmup_note="warmup=done(discarded)"
fi

# ── 측정 ─────────────────────────────────────────────────────────────────────
measure base
base_count="$MEASURED_COUNT"
summary="base=$base_count"
violated=0
seen=0

for seed in $SLOT_ORDER_SEEDS; do
  seen=$((seen + 1))
  measure "seed$seed" --sequence.shuffle.tests --sequence.seed="$seed"
  seed_count="$MEASURED_COUNT"
  summary="$summary seed$seed=$seed_count"

  if ! cmp -s "$WORK/base.sig" "$WORK/seed$seed.sig"; then
    violated=1
    printf 'FR-02 VIOLATION: covered 슬롯 집합 불일치 — base vs seed=%s (category: coverage-slot-order-dependence)\n' "$seed" >&2
    printf '  base 개수=%s / seed 개수=%s (개수 일치도 집합 일치를 뜻하지 않는다)\n' "$base_count" "$seed_count" >&2
    # 차집합 슬롯을 branchMap 시작 라인번호와 함께 열거한다 (구현 지시 6).
    # 이 출력이 cold-start 축(10.followups/20260826-1730)을 닫는 데 필요한 유일한 관측 데이터다.
    LC_ALL=C comm -23 "$WORK/base.sig" "$WORK/seed$seed.sig" | while IFS= read -r sid; do
      [ -n "$sid" ] || continue
      sline="$(awk -F"\t" -v s="$sid" '$1 == s { print $2; exit }' "$WORK/base.slots")"
      printf '  base-only slot %s  (%s:%s)\n' "$sid" "$SLOT_ORDER_SCAN_ROOT" "${sline:-?}" >&2
    done
    LC_ALL=C comm -13 "$WORK/base.sig" "$WORK/seed$seed.sig" | while IFS= read -r sid; do
      [ -n "$sid" ] || continue
      sline="$(awk -F"\t" -v s="$sid" '$1 == s { print $2; exit }' "$WORK/seed$seed.slots")"
      printf '  seed-only slot %s  (%s:%s)\n' "$sid" "$SLOT_ORDER_SCAN_ROOT" "${sline:-?}" >&2
    done
  fi
done

if [ "$seen" -eq 0 ]; then
  fail_unjudged "seed 목록이 비었다 (COVERAGE_SLOT_ORDER_SEEDS) — base 단독 비교는 항진명제다."
fi

ack="check-coverage-slot-order-invariance: target=$SLOT_ORDER_SCAN_ROOT tests=$SLOT_ORDER_TEST_FILES seeds=$seen $warmup_note slots($summary)"

if [ "$violated" -ne 0 ]; then
  printf '%s\n' "$ack" >&2
  printf '  실행 순서가 분기 귀속을 바꾼다 — 전역 상태가 케이스 경계를 넘어 누출됐다는 뜻이다.\n' >&2
  exit 1
fi

printf '%s\n' "$ack"
exit 0
