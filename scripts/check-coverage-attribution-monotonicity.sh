#!/usr/bin/env bash
# check-coverage-attribution-monotonicity.sh
# Spec: foundation/coverage-per-file-attribution-monotonicity (slug) §동작 1 (G-A) · 2 (G-B) · 3 (G-C)
# Task: TSK-20260824-10 (supersedes TSK-20260824-02-b)
#
# 계약: 커버리지 집계는 테스트 집합에 대해 단조다 — 부분집합(샤드) 실행에서 covered 로
# 기록된 분기 슬롯은 그 부분집합을 포함하는 전수 실행에서도 covered 여야 한다.
#
# 두 모드:
#   (M1) 측정 모드 (기본)
#        bash scripts/check-coverage-attribution-monotonicity.sh
#        vitest 전수 1회 + 샤드 N회를 구동해 산출물을 만들고 전 샤드를 전수와 대조한다.
#   (M2) 대조 모드
#        bash scripts/check-coverage-attribution-monotonicity.sh --full <json> --subset <json>
#        이미 존재하는 coverage-final.json 두 개만 비교한다. 주입 왕복(DoD)의 실행 경로.
#
# exit 0 : 위반 0
# exit 1 : 단조성 위반 (소실 슬롯 ≥ 1) — 위반 파일 경로를 stdout 에 1행 이상 출력
# exit 2 : 입력·실행 오류 (산출물 부재/파싱 실패/알 수 없는 인자)
# exit 3 : 공허 산출물 — 판정이 아무것도 재지 않았다. 두 층 각각이 이 코드를 낸다:
#            (a) 전수 covered 슬롯 0 ([VACUOUS-FULL]) — --allow-empty 로 면제되지 않는다
#            (b) 부분집합 covered 슬롯 0 ([EMPTY]) — --allow-empty 시 면제된다
# exit 4 : 완전성 단언 붕괴 — 샤드 열거가 전수 수집을 재현하지 못했다
#
# **등급 체계는 두 층에 동일하게 적용된다** (전수 층 / 샤드 층). 종전에는 샤드 층만
# 선언 밖이었다 — 같은 조건 "coverage-final.json 미생성" 이 전수 층에서는 exit 2,
# 샤드 층에서는 exit 1 이었고, judge 가 구분해 돌려준 1(단조성)/3(공허)까지 한
# 플래그로 접혀 {측정 실패, 공허, 단조성 위반} 셋이 전부 exit 1 로 나왔다.
# 샤드 키는 현 HEAD 12개이고 게이트 성공률이 p^12 이라 실행 실패가 계약 위반보다
# 훨씬 자주 발화한다 — 접힘은 잡으라고 만든 신호를 실행 잡음에 묻는다.
#
# 동시 발생 우선순위 (선언 = 구현. `rc_rank()` 가 이 순서를 그대로 구현한다):
#   4 (완전성 붕괴) > 2 (측정·입력 실패) > 3 (공허) > 1 (단조성 위반) > 0
#   근거: **판정이 성립하지 않는 실패가 판정 결과보다 앞선다.** 완전성 붕괴는
#   대상 집합 자체가 틀렸다는 뜻이라 가장 앞이고, 측정 실패는 판정을 시작조차
#   못한 것, 공허는 시작했으나 아무것도 재지 못한 것, 단조성 위반은 정상적으로
#   재어서 나온 결과다.
#
# judge 반환 승계: 샤드 층은 judge 의 종료 코드(1 또는 3)를 **그대로 승계**한다.
#   judge 가 이미 구분해 반환하므로 새 판정 로직이 필요 없다 — 버리지만 않으면 된다.
#
# 세 번째 모드:
#   (M3) 자가 점검 모드 (vitest 무구동)
#        bash scripts/check-coverage-attribution-monotonicity.sh --self-test
#        bash scripts/check-coverage-attribution-monotonicity.sh --self-test-shard <조건>
#        샤드 층 등급 분류를 전수 실행 없이 왕복한다. M1 은 로컬 93초 이상이라
#        주입 방향마다 왕복하면 검증이 실용 밖으로 나간다. 읽기 전용이며 M1 과
#        **같은** 분류·집계 함수를 부른다 (판정 완화 없음).
#
# 설계 주의 (RULE-06):
#  * 샤드 열거는 `find src` 가 아니라 vitest 자신의 수집 목록에서 도출한다. `find src` 는 69 를
#    내지만 vitest 는 70 을 수집한다 (차집합 = 저장소 루트 `vite.config.test.js`).
#  * 전수 파일 수는 열거가 아니라 전수 vitest 실행의 요약 행에서 독립적으로 얻는다. 두 값을
#    같은 출처에서 뽑으면 완전성 단언이 함께 움직여 공허해진다.
#  * covered 가 전부 0 인 산출물은 subset ⊆ full 을 자동 만족한다. 샤드마다 실행 사실을
#    (i) Tests N passed · N>0, (ii) "No test files found" 부재, (iii) covered>0 로 확인한다.
#    (iii) 의 예외는 샤드명 하드코딩이 아니라 "(i)(ii) 통과 + covered=0" 조건으로 기술한다.
#  * 그 예외는 부분집합(샤드) 층 한정이다. 전수 산출물이 공허하면 모든 부분집합이 자동으로
#    포함되어 전 샤드가 초록이 되므로, 전수 층 공허는 면제 없이 항상 실패로 판정한다.
#  * 수치 상수(70 파일 / 12 샤드 / 637 테스트)를 박지 않는다 — 매 실행 산출한다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

usage() {
  cat <<'USAGE'
usage:
  (M1) check-coverage-attribution-monotonicity.sh
  (M2) check-coverage-attribution-monotonicity.sh --full <json> --subset <json> [--label <s>] [--allow-empty]
  (M3) check-coverage-attribution-monotonicity.sh --self-test
       check-coverage-attribution-monotonicity.sh --self-test-shard <조건>
       조건: no-test-files | summary-missing | zero-passed | file-count-mismatch
             | coverage-json-missing | judge-monotonicity | judge-vacuous | none
USAGE
}

MODE="measure"
FULL_JSON=""
SUBSET_JSON=""
LABEL=""
ALLOW_EMPTY=""
SELF_TEST_COND=""

while [ $# -gt 0 ]; do
  case "$1" in
    --full)   [ $# -ge 2 ] || { echo "check:coverage-attribution: --full 인자 누락" >&2; exit 2; }
              FULL_JSON="$2"; MODE="compare"; shift 2 ;;
    --subset) [ $# -ge 2 ] || { echo "check:coverage-attribution: --subset 인자 누락" >&2; exit 2; }
              SUBSET_JSON="$2"; MODE="compare"; shift 2 ;;
    --label)  [ $# -ge 2 ] || { echo "check:coverage-attribution: --label 인자 누락" >&2; exit 2; }
              LABEL="$2"; shift 2 ;;
    --allow-empty) ALLOW_EMPTY="allow-empty"; shift ;;
    --self-test) MODE="self-test"; SELF_TEST_COND="__all__"; shift ;;
    --self-test-shard) [ $# -ge 2 ] || { echo "check:coverage-attribution: --self-test-shard 인자 누락" >&2; exit 2; }
              MODE="self-test"; SELF_TEST_COND="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "check:coverage-attribution: 알 수 없는 인자 [$1]" >&2; usage >&2; exit 2 ;;
  esac
done

# ── 판정 코어 (M1·M2 공용) ───────────────────────────────────────────────────
# argv: <full.json> <subset.json> <label> <allow-empty|""> <repo-root>
IFS= read -r -d '' JUDGE_JS <<'NODEJS' || true
const fs = require('fs');
const path = require('path');

const [fullPath, subsetPath, label, allowEmptyFlag, repoRoot] = process.argv.slice(1);
const allowEmpty = allowEmptyFlag === 'allow-empty';

function fail(code, msg) {
  console.error(msg);
  process.exit(code);
}

function load(p, which) {
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (e) {
    fail(2, `[FAIL] ${which} 산출물을 읽을 수 없다: ${p} (${e.message})`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    fail(2, `[FAIL] ${which} 산출물 JSON 파싱 실패: ${p} (${e.message})`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(2, `[FAIL] ${which} 산출물이 파일→커버리지 객체 형태가 아니다: ${p}`);
  }
  return parsed;
}

// 표기 정규화: 저장소 루트 하위 절대 경로는 상대 경로로 접는다. 그 밖의 키는 원형 유지
// (픽스처의 합성 절대 경로는 full/subset 양쪽이 동일 접두사를 쓰므로 그대로 정합한다).
function norm(key) {
  const prefix = repoRoot.endsWith(path.sep) ? repoRoot : repoRoot + path.sep;
  if (key.startsWith(prefix)) return key.slice(prefix.length);
  return key;
}

// 파일별 covered 분기 슬롯 집합. 슬롯 식별자는 `<branchId>.<slotIndex>`.
function coveredSlots(cov, which) {
  const map = new Map();
  let total = 0;
  let filesWithBranches = 0;
  for (const key of Object.keys(cov)) {
    const entry = cov[key];
    if (entry === null || typeof entry !== 'object') {
      fail(2, `[FAIL] ${which}: 파일 항목이 객체가 아니다 — ${key}`);
    }
    const b = entry.b;
    if (b === undefined) continue;
    if (b === null || typeof b !== 'object' || Array.isArray(b)) {
      fail(2, `[FAIL] ${which}: 'b' 맵이 객체가 아니다 — ${key}`);
    }
    filesWithBranches += 1;
    const nk = norm(key);
    if (!map.has(nk)) map.set(nk, new Set());
    const slots = map.get(nk);
    for (const branchId of Object.keys(b)) {
      const counts = b[branchId];
      if (!Array.isArray(counts)) {
        fail(2, `[FAIL] ${which}: 'b["${branchId}"]' 가 배열이 아니다 — ${key}`);
      }
      for (let i = 0; i < counts.length; i += 1) {
        const c = counts[i];
        if (typeof c !== 'number' || Number.isNaN(c)) {
          fail(2, `[FAIL] ${which}: 'b["${branchId}"][${i}]' 가 수치가 아니다 — ${key}`);
        }
        if (c > 0) {
          slots.add(`${branchId}.${i}`);
          total += 1;
        }
      }
    }
  }
  return { map, total, filesWithBranches };
}

const full = load(fullPath, 'full');
const subset = load(subsetPath, 'subset');
const F = coveredSlots(full, 'full');
const S = coveredSlots(subset, 'subset');

const tag = label ? `[${label}] ` : '';
console.log(
  `${tag}full_covered=${F.total} subset_covered=${S.total} ` +
  `full_files=${F.filesWithBranches} subset_files=${S.filesWithBranches}`
);

// 전수 공허 차단: 측정 대상이 통째로 비면 모든 부분집합이 자동으로 포함되어 전 샤드가
// 초록이 된다. 이 층은 면제 인자를 참조하지 않는다 — 면제는 부분집합 층에만 미친다.
// 부분집합 차단보다 앞에 둔다: 둘 다 공허하면 진단은 "측정 대상이 통째로 비었다" 여야 한다.
if (F.total === 0) {
  console.log(`${tag}[VACUOUS-FULL] 전수 covered 슬롯 0 — 측정 대상이 통째로 공허하다 (모든 부분집합이 자동 포함)`);
  fail(3, `[FAIL] ${tag}공허 산출물: full covered=0. 전수 실행이 실제로 코드를 실행했는지 확인하라. 면제 인자는 이 층에 적용되지 않는다.`);
}

// 공허 통과 차단: 부분집합이 아무 슬롯도 covered 로 갖지 않으면 포함 관계는 자동 참이다.
if (S.total === 0 && !allowEmpty) {
  console.log(`${tag}[EMPTY] 부분집합 covered 슬롯 0 — 판정이 아무것도 재지 않았다 (공허 통과 차단)`);
  fail(3, `[FAIL] ${tag}공허 산출물: subset covered=0. 부분집합 실행이 실제로 코드를 실행했는지 확인하라.`);
}

// 단조성: subset 의 covered 슬롯은 전부 full 에도 covered 여야 한다.
const violations = [];
for (const [file, slots] of S.map) {
  const fullSlots = F.map.get(file) || new Set();
  const missing = [];
  for (const slot of slots) {
    if (!fullSlots.has(slot)) missing.push(slot);
  }
  if (missing.length > 0) {
    missing.sort();
    violations.push({ file, missing, absent: !F.map.has(file) });
  }
}

if (violations.length > 0) {
  violations.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  let lost = 0;
  // 위반 파일 경로를 stdout 에 1행 이상 (침묵 실패 금지 — §동작 2 / G-B).
  for (const v of violations) {
    lost += v.missing.length;
    const note = v.absent ? ' (전수 산출물에 파일 자체가 부재)' : '';
    console.log(`${tag}[VIOLATION] ${v.file}${note} — 소실 슬롯 ${v.missing.length}: ${v.missing.join(',')}`);
  }
  console.log(`${tag}[VIOLATION] 위반 파일 ${violations.length} / 소실 슬롯 합 ${lost}`);
  fail(1, `[FAIL] ${tag}단조성 위반 — 부분집합에서 covered 인 슬롯이 전수에서 uncovered 다.`);
}

const emptyNote = S.total === 0 ? ' (subset covered=0 — 허용된 비-src 샤드)' : '';
console.log(`${tag}[OK] 소실 슬롯 0${emptyNote}`);
process.exit(0);
NODEJS

judge() {
  # judge <full> <subset> <label> <allow-empty|"">
  node -e "$JUDGE_JS" "$1" "$2" "$3" "${4:-}" "$ROOT"
}

# ── 등급 분류 코어 (M1 샤드 층 · M3 공용) ────────────────────────────────────
# 여기가 **유일한 등급 사상**이다. M1 샤드 루프의 실패 분기와 M3 자가 점검이 같은
# 함수를 부른다 — 사본을 두면 주입은 실집행을 대변하지 못한다.
RC_CLASS=0

# 헤더 §동시 발생 우선순위의 구현. 순위가 높을수록 앞선다.
rc_rank() {
  case "$1" in
    4) echo 4 ;;  # 완전성 붕괴 — 대상 집합 자체가 틀렸다
    2) echo 3 ;;  # 측정·입력 실패 — 판정을 시작조차 못했다
    3) echo 2 ;;  # 공허 — 시작했으나 아무것도 재지 못했다
    1) echo 1 ;;  # 단조성 위반 — 정상적으로 재어서 나온 결과다
    *) echo 0 ;;
  esac
}

# 최대값 갱신이 아니라 우선순위 규칙으로 누적한다 (2 > 3 이므로 수치 최대값과 다르다).
record_rc_class() {
  if [ "$(rc_rank "$1")" -gt "$(rc_rank "$RC_CLASS")" ]; then
    RC_CLASS="$1"
  fi
}

# 샤드 실패 조건 → 등급. 조건 토큰은 M1 분기와 M3 조건 인자가 공유한다.
shard_failure_class() {
  case "$1" in
    no-test-files)         echo 2 ;;  # 측정 실패 — 수집 0
    summary-missing)       echo 2 ;;  # 측정 실패 — 리포터 형식 변동
    zero-passed)           echo 2 ;;  # 측정 실패 — 통과 테스트 0
    file-count-mismatch)   echo 4 ;;  # 완전성 붕괴 — 전수 층 사후 재확인과 같은 성격
    coverage-json-missing) echo 2 ;;  # 측정 실패 — 전수 층 exit 2 와 대칭
    *) echo 2 ;;                      # 미상 조건도 측정 실패로 읽는다 (통과로 읽지 않는다)
  esac
}

# 집계 종료 — M1 과 M3 가 같은 이 경로로 끝난다. 등급을 문장으로 밝힌다.
# 종전 메시지 "단조성/실행 사실 판정이 실패했다" 의 `/` 가 곧 등급 혼입의 자백이었다.
finish_with_class() {
  case "$RC_CLASS" in
    0) : ;;
    1) echo "[FAIL] check:coverage-attribution — 단조성 위반 (등급 1): 부분집합에서 covered 인 슬롯이 전수에서 uncovered 다" >&2 ;;
    2) echo "[FAIL] check:coverage-attribution — 측정·입력 실패 (등급 2): 판정이 성립하지 않았다. 계약 위반이 아니라 실행 실패다" >&2 ;;
    3) echo "[FAIL] check:coverage-attribution — 공허 산출물 (등급 3): 판정이 아무것도 재지 않았다" >&2 ;;
    4) echo "[FAIL] check:coverage-attribution — 완전성 붕괴 (등급 4): 샤드 열거가 전수 수집을 재현하지 못했다" >&2 ;;
    *) echo "[FAIL] check:coverage-attribution — 선언 밖 등급 [$RC_CLASS]" >&2 ;;
  esac
  exit "$RC_CLASS"
}

# ── (M3) 자가 점검 모드 ───────────────────────────────────────────────────────
# 합성 산출물은 임시 디렉터리에만 만든다 — 저장소 트리에 픽스처를 남기지 않는다.
self_test_write_json() {
  # <경로> <슬롯 배열 리터럴>
  printf '{ "%s/self-test-fixture.js": { "b": { "0": %s } } }\n' "$ROOT" "$2" > "$1"
}

self_test_shard() {
  # 샤드 1건이 <조건> 으로 실패했을 때의 등급을 산출한다.
  # judge-* 는 **실제 판정 코어**(judge)를 구동한다 — 등급 사상을 흉내내지 않는다.
  cond="$1"
  case "$cond" in
    judge-monotonicity|judge-vacuous)
      STDIR="$(mktemp -d)"
      if [ "$cond" = "judge-vacuous" ]; then
        self_test_write_json "$STDIR/full.json" "[0, 0]"
        self_test_write_json "$STDIR/subset.json" "[0, 0]"
      else
        self_test_write_json "$STDIR/full.json" "[1, 0]"
        self_test_write_json "$STDIR/subset.json" "[0, 1]"
      fi
      # M1 샤드 루프와 **같은 호출 형태** — allow-empty 를 포함해 동일하다.
      JOUT="$(judge "$STDIR/full.json" "$STDIR/subset.json" "self-test-$cond" "allow-empty" 2>&1)"
      JRC=$?
      printf '%s\n' "$JOUT"
      rm -r "$STDIR"
      if [ "$JRC" != "0" ]; then
        record_rc_class "$JRC"
      fi
      ;;
    none)
      : ;;
    *)
      record_rc_class "$(shard_failure_class "$cond")"
      ;;
  esac
}

if [ "$MODE" = "self-test" ]; then
  if [ "$SELF_TEST_COND" != "__all__" ]; then
    echo "[self-test] 샤드 조건 [$SELF_TEST_COND] 분류"
    self_test_shard "$SELF_TEST_COND"
    echo "[self-test] RC_CLASS=$RC_CLASS"
    finish_with_class
  fi

  # 전수 표 + 우선순위 검사. 선언과 구현이 어긋나면 실행 오류(등급 2)로 종료한다.
  ST_FAIL=0
  st_expect() {
    RC_CLASS=0
    self_test_shard "$1" >/dev/null 2>&1
    if [ "$RC_CLASS" != "$2" ]; then
      echo "[self-test][FAIL] 조건 [$1] 기대 등급 $2 != 실제 $RC_CLASS" >&2
      ST_FAIL=1
    else
      echo "[self-test][OK] 조건 [$1] → 등급 $2"
    fi
  }
  st_expect no-test-files 2
  st_expect summary-missing 2
  st_expect zero-passed 2
  st_expect file-count-mismatch 4
  st_expect coverage-json-missing 2
  st_expect judge-monotonicity 1
  st_expect judge-vacuous 3
  st_expect none 0

  # 우선순위 — 헤더 선언 4 > 2 > 3 > 1 > 0 과 일치해야 한다.
  st_priority() {
    RC_CLASS=0
    record_rc_class "$1"
    record_rc_class "$2"
    if [ "$RC_CLASS" != "$3" ]; then
      echo "[self-test][FAIL] 우선순위 $1 vs $2 기대 $3 != 실제 $RC_CLASS" >&2
      ST_FAIL=1
    else
      echo "[self-test][OK] 우선순위 $1 vs $2 → $3"
    fi
  }
  st_priority 1 3 3
  st_priority 3 2 2
  st_priority 2 4 4
  st_priority 4 2 4
  st_priority 3 1 3
  st_priority 0 1 1

  # 루프 부착 단언 — 자가 점검이 분류 함수만 부르고 끝나면 **루프 쪽에서 부착이
  # 빠지는 회귀**를 놓친다 (자가 점검은 호출 지점이 아니라 사상을 검증한다).
  # 실패 `continue` 분기 수 + judge 승계 1 만큼의 `record_rc_class` 호출이 샤드
  # 루프 안에 실재하는지 정적으로 확인한다. 이 단언이 없으면 등급 부착을 통째로
  # 지워도 자가 점검은 초록을 낸다.
  LOOP_CONTINUE="$(awk '/^  SRC_RC=/{s=1} s&&/^    continue$/{n++} END{print n+0}' "$SELF")"
  LOOP_RECORD="$(awk '/^  SRC_RC=/{s=1} s&&/record_rc_class/{n++} END{print n+0}' "$SELF")"
  LOOP_NEED=$((LOOP_CONTINUE + 1))
  if [ "$LOOP_CONTINUE" -lt 5 ]; then
    echo "[self-test][FAIL] 샤드 루프 실패 분기가 $LOOP_CONTINUE 건 — 5 미만이면 부착 단언이 공허하다" >&2
    ST_FAIL=1
  fi
  if [ "$LOOP_RECORD" -lt "$LOOP_NEED" ]; then
    echo "[self-test][FAIL] 샤드 루프 등급 부착 $LOOP_RECORD < 필요 $LOOP_NEED (분기 $LOOP_CONTINUE + judge 승계 1)" >&2
    echo "         등급을 기록하지 않는 실패 분기가 있다 — 그 분기는 집계에서 등급 0 으로 사라진다." >&2
    ST_FAIL=1
  else
    echo "[self-test][OK] 샤드 루프 등급 부착 $LOOP_RECORD ≥ 필요 $LOOP_NEED"
  fi

  if [ "$ST_FAIL" != "0" ]; then
    echo "[self-test][FAIL] 등급 분류가 헤더 선언 또는 루프 부착과 어긋난다" >&2
    exit 2
  fi
  echo "[self-test] OK — 조건 8종 · 우선순위 6쌍 · 루프 부착 전부 선언과 일치"
  exit 0
fi

# ── (M2) 대조 모드 ────────────────────────────────────────────────────────────
if [ "$MODE" = "compare" ]; then
  if [ -z "$FULL_JSON" ] || [ -z "$SUBSET_JSON" ]; then
    echo "check:coverage-attribution: 대조 모드는 --full 과 --subset 을 모두 요구한다" >&2
    usage >&2
    exit 2
  fi
  judge "$FULL_JSON" "$SUBSET_JSON" "${LABEL:-compare}" "$ALLOW_EMPTY"
  exit $?
fi

# ── (M1) 측정 모드 ────────────────────────────────────────────────────────────
cd "$ROOT" || exit 2

ESC="$(printf '\033')"
strip_ansi() { sed "s/${ESC}\[[0-9;]*m//g"; }

TMPROOT="$(mktemp -d "${TMPDIR:-/tmp}/cov-attr-XXXXXX")" || {
  echo "check:coverage-attribution: 임시 디렉터리 생성 실패" >&2; exit 2; }
cleanup() {
  case "$TMPROOT" in
    */cov-attr-*) [ -d "$TMPROOT" ] && rm -rf "$TMPROOT" ;;
    *) : ;;
  esac
}
trap cleanup EXIT INT TERM

# 산출물은 /coverage · /build (둘 다 gitignored) 밖의 임시 경로에 쓴다.
echo "[check:coverage-attribution] 산출 경로: $TMPROOT"

# ── 1. 샤드 열거 — vitest 자신의 수집 목록에서 도출 (RULE-06 §열거 고정 금지) ──
enumerate_test_files() {
  NO_COLOR=1 npx vitest list --filesOnly 2>/dev/null | sed '/^[[:space:]]*$/d' | sort
}

ENUM_LIST="$TMPROOT/enumerated.txt"
enumerate_test_files > "$ENUM_LIST"
ENUM_COUNT="$(wc -l < "$ENUM_LIST" | tr -d ' ')"
if [ "$ENUM_COUNT" = "0" ]; then
  echo "[FAIL] 테스트 파일 열거가 공집합을 냈다 (vacuous zero) — vitest 수집 경로를 확인하라" >&2
  exit 2
fi
echo "[check:coverage-attribution] vitest 수집 테스트 파일 $ENUM_COUNT 건"

# 샤드 키 도출: src/<dir>/... → src/<dir> · src 직하 → src · src/ 밖 → root.
# 디렉터리명을 스크립트에 나열하지 않는다.
SHARD_KEYS="$TMPROOT/shard-keys.txt"
KEYED="$TMPROOT/keyed.txt"
awk '{
  p = $0
  if (substr(p, 1, 4) == "src/") {
    rest = substr(p, 5)
    if (index(rest, "/") > 0) { split(rest, a, "/"); key = "src/" a[1] } else { key = "src" }
  } else { key = "root" }
  print key "\t" p
}' "$ENUM_LIST" > "$KEYED"
cut -f1 "$KEYED" | sort -u > "$SHARD_KEYS"
SHARD_COUNT="$(wc -l < "$SHARD_KEYS" | tr -d ' ')"
echo "[check:coverage-attribution] 도출 샤드 $SHARD_COUNT 개"

# ── 2. 전수 실행 1회 (모든 샤드 대조에 재사용) ────────────────────────────────
FULL_DIR="$TMPROOT/full"
echo "[check:coverage-attribution] 전수 실행 중 ..."
FULL_OUT="$(NO_COLOR=1 npx vitest run --coverage --coverage.reporter=json --coverage.reportsDirectory="$FULL_DIR" 2>&1)"
FULL_RC=$?
FULL_CLEAN="$(printf '%s\n' "$FULL_OUT" | strip_ansi)"

if printf '%s\n' "$FULL_CLEAN" | grep -q "No test files found"; then
  printf '%s\n' "$FULL_CLEAN" | tail -20
  echo "[FAIL] 전수 실행이 테스트를 0건 수집했다 (No test files found)" >&2
  exit 2
fi
if [ "$FULL_RC" != "0" ]; then
  printf '%s\n' "$FULL_CLEAN" | tail -30
  echo "[FAIL] 전수 실행 rc=$FULL_RC — 단조성 판정 이전에 전수 실행이 실패했다" >&2
  exit 2
fi

summary_line() { printf '%s\n' "$1" | grep -E "^[[:space:]]*$2[[:space:]]" | tail -1; }
paren_total() { printf '%s\n' "$1" | sed -E 's/.*\(([0-9]+)\)[[:space:]]*$/\1/'; }
passed_count() {
  printf '%s\n' "$1" | grep -oE '[0-9]+ passed' | head -1 | sed -E 's/ passed//'
}

FULL_FILES_LINE="$(summary_line "$FULL_CLEAN" 'Test Files')"
FULL_TESTS_LINE="$(summary_line "$FULL_CLEAN" 'Tests')"
if [ -z "$FULL_FILES_LINE" ] || [ -z "$FULL_TESTS_LINE" ]; then
  printf '%s\n' "$FULL_CLEAN" | tail -20
  echo "[FAIL] 전수 실행 요약 행 미검출 (리포터 형식 변동?)" >&2
  exit 2
fi
FULL_FILES="$(paren_total "$FULL_FILES_LINE")"
FULL_TESTS="$(paren_total "$FULL_TESTS_LINE")"
echo "[check:coverage-attribution] 전수 —$FULL_FILES_LINE /$FULL_TESTS_LINE"

if [ ! -f "$FULL_DIR/coverage-final.json" ]; then
  echo "[FAIL] 전수 coverage-final.json 미생성: $FULL_DIR" >&2
  exit 2
fi

# ── 2b. 전수 층 공허 조기 차단 ────────────────────────────────────────────────
# 전수 자기 대조로 전수 covered 총합만 확인한다 (판정 코어 재사용 — 별도 계산 로직 없음).
# 전수가 공허하면 이후 전 샤드가 자동 통과하므로 첫 샤드 이전에 끊는다.
# (M2) 대조 모드는 이 경로를 거치지 않는다 — 동일 차단이 판정 코어에도 있다.
PREFLIGHT="$(judge "$FULL_DIR/coverage-final.json" "$FULL_DIR/coverage-final.json" "full-preflight" "" 2>&1)"
PRE_RC=$?
if [ "$PRE_RC" != "0" ]; then
  printf '%s\n' "$PREFLIGHT"
  echo "[FAIL] 전수 산출물이 공허하다 — 부분집합 대조를 시작하지 않는다 (rc=$PRE_RC)" >&2
  exit "$PRE_RC"
fi
printf '%s\n' "$PREFLIGHT" | head -1

# ── 3. 완전성 단언: 샤드 열거 합 == 전수 실행이 실제로 돌린 파일 수 ───────────
# 두 값의 출처가 다르다 (열거 vs 전수 실행 요약). 같은 출처면 이 단언은 공허하다.
if [ "$ENUM_COUNT" != "$FULL_FILES" ]; then
  echo "[FAIL] 완전성 단언 붕괴 — 샤드 열거 합 $ENUM_COUNT != 전수 수집 $FULL_FILES." >&2
  echo "       샤드 도출 규칙이 전수 실행 대상의 일부를 놓쳤다. 누락분은 어떤 샤드에서도" >&2
  echo "       측정되지 않으므로 그 파일의 단조성 위반은 영구히 보이지 않는다." >&2
  exit 4
fi
echo "[check:coverage-attribution] 완전성 단언 OK — 열거 $ENUM_COUNT == 전수 수집 $FULL_FILES"

# ── 4. 샤드별 실행 + 대조 ─────────────────────────────────────────────────────
SHARD_IDX=0
SUM_SHARD_FILES=0
SUM_SHARD_TESTS=0
SUM_COVERED=0
FAILED=0
EMPTY_SHARDS=""

while IFS= read -r key; do
  SHARD_IDX=$((SHARD_IDX + 1))
  LIST="$TMPROOT/shard-$SHARD_IDX.txt"
  awk -F'\t' -v k="$key" '$1 == k { print $2 }' "$KEYED" > "$LIST"
  EXPECT_FILES="$(wc -l < "$LIST" | tr -d ' ')"

  # 개행 포함 변수를 그대로 넘기면 셸이 단어 분할하지 않아 vitest 가 단일 인자로 받고
  # "No test files found" 로 끝난다. 그럼에도 산출물은 생성되며 covered=0 이라
  # 포함 판정이 자동 통과한다. 배열로 넘겨 그 경로를 원천 차단한다.
  ARGS=()
  while IFS= read -r f; do
    [ -n "$f" ] && ARGS+=("$f")
  done < "$LIST"
  if [ "${#ARGS[@]}" -eq 0 ]; then
    echo "[FAIL] 샤드 [$key] 파일 목록이 비었다 — 도출 규칙 붕괴" >&2
    exit 4
  fi

  SDIR="$TMPROOT/shard-$SHARD_IDX"
  # 샤드는 전역 threshold 를 반드시 미달한다 (부분집합이므로). threshold 판정은 이 게이트의
  # 관심사가 아니므로 CLI 로만 0 으로 낮춘다 — vite.config.js 의 threshold 값은 건드리지 않는다.
  SOUT="$(NO_COLOR=1 npx vitest run "${ARGS[@]}" --coverage --coverage.reporter=json \
      --coverage.reportsDirectory="$SDIR" \
      --coverage.thresholds.lines=0 --coverage.thresholds.statements=0 \
      --coverage.thresholds.functions=0 --coverage.thresholds.branches=0 2>&1)"
  SRC_RC=$?
  SCLEAN="$(printf '%s\n' "$SOUT" | strip_ansi)"

  # (ii) 수집 0 검출.
  if printf '%s\n' "$SCLEAN" | grep -q "No test files found"; then
    echo "[FAIL] 샤드 [$key] 수집 0 / 공허 산출물 (rc=$SRC_RC) — vitest 가 테스트 파일을 찾지 못했다." >&2
    echo "       '위반 없음' 이 아니라 '아무것도 실행되지 않음' 이다. 게이트는 이를 통과로 읽지 않는다." >&2
    printf '%s\n' "$SCLEAN" | tail -10 >&2
    record_rc_class "$(shard_failure_class no-test-files)"
    FAILED=1
    continue
  fi

  SFILES_LINE="$(summary_line "$SCLEAN" 'Test Files')"
  STESTS_LINE="$(summary_line "$SCLEAN" 'Tests')"
  if [ -z "$SFILES_LINE" ] || [ -z "$STESTS_LINE" ]; then
    echo "[FAIL] 샤드 [$key] 요약 행 미검출 (rc=$SRC_RC · 리포터 형식 변동?)" >&2
    printf '%s\n' "$SCLEAN" | tail -10 >&2
    record_rc_class "$(shard_failure_class summary-missing)"
    FAILED=1
    continue
  fi
  SFILES="$(paren_total "$SFILES_LINE")"
  STESTS="$(paren_total "$STESTS_LINE")"
  SPASSED="$(passed_count "$STESTS_LINE")"

  # (i) 실제로 통과한 테스트가 있어야 한다 (수집은 됐으나 전량 skip 인 경우 배제).
  if [ -z "$SPASSED" ] || [ "$SPASSED" = "0" ]; then
    echo "[FAIL] 샤드 [$key] 통과 테스트 0 (rc=$SRC_RC) —$STESTS_LINE — 미측정을 초록으로 읽지 않는다." >&2
    printf '%s\n' "$SCLEAN" | tail -10 >&2
    record_rc_class "$(shard_failure_class zero-passed)"
    FAILED=1
    continue
  fi
  # 열거와 실제 수집의 샤드 단위 정합 (필터 과수집/과소수집 차단).
  if [ "$SFILES" != "$EXPECT_FILES" ]; then
    echo "[FAIL] 샤드 [$key] 수집 파일 $SFILES != 열거 $EXPECT_FILES (rc=$SRC_RC) — 필터가 대상 집합을 왜곡했다" >&2
    printf '%s\n' "$SCLEAN" | tail -10 >&2
    record_rc_class "$(shard_failure_class file-count-mismatch)"
    FAILED=1
    continue
  fi
  if [ ! -f "$SDIR/coverage-final.json" ]; then
    echo "[FAIL] 샤드 [$key] coverage-final.json 미생성 (rc=$SRC_RC · 측정 실패 → RC=2, 전수 층 exit 2 와 대칭)" >&2
    printf '%s\n' "$SCLEAN" | tail -10 >&2
    record_rc_class "$(shard_failure_class coverage-json-missing)"
    FAILED=1
    continue
  fi

  # (iii) covered>0. 예외는 (i)(ii) 통과 + covered=0 인 경우로만 기술한다 (샤드명 하드코딩 금지).
  # 아래 "allow-empty" 는 부분집합(샤드) 층 면제만 켠다. 전수 층 공허 차단([VACUOUS-FULL])은
  # 이 인자를 참조하지 않으므로 전수 산출물이 비면 면제 여부와 무관하게 여기서 실패한다.
  JOUT="$(judge "$FULL_DIR/coverage-final.json" "$SDIR/coverage-final.json" "$key" "allow-empty" 2>&1)"
  JRC=$?
  printf '%s\n' "$JOUT"
  if [ "$JRC" != "0" ]; then
    # judge 는 단조성 위반(1)과 공허 산출물(3)을 **구분해** 돌려준다. 여기서
    # 평탄화하지 않고 그대로 승계한다 — 3등급 접힘의 실제 지점이 이 한 줄이었다.
    record_rc_class "$JRC"
    FAILED=1
  fi
  COVERED="$(printf '%s\n' "$JOUT" | sed -nE 's/.*subset_covered=([0-9]+).*/\1/p' | head -1)"
  [ -n "$COVERED" ] || COVERED=0
  if [ "$COVERED" = "0" ]; then
    # (i)(ii) 는 통과했는데 covered=0 — 측정은 됐고 src/** 를 실행하지 않은 샤드다.
    # '미측정' 과 '측정했으나 0' 의 구별을 출력에 명시한다.
    echo "[NOTE] 샤드 [$key] 는 측정됐으나 src/** covered 슬롯 0 — 실행 사실은 확인됨" \
         "(Test Files $SFILES · 통과 $SPASSED). 미측정이 아니다."
    EMPTY_SHARDS="$EMPTY_SHARDS $key"
  fi

  SUM_SHARD_FILES=$((SUM_SHARD_FILES + SFILES))
  SUM_SHARD_TESTS=$((SUM_SHARD_TESTS + STESTS))
  SUM_COVERED=$((SUM_COVERED + COVERED))
done < "$SHARD_KEYS"

# ── 5. 사후 완전성 재확인 (실제 실행 기준) ────────────────────────────────────
if [ "$FAILED" = "0" ]; then
  if [ "$SUM_SHARD_FILES" != "$FULL_FILES" ]; then
    echo "[FAIL] 샤드 실행 파일 합 $SUM_SHARD_FILES != 전수 $FULL_FILES" >&2
    exit 4
  fi
  if [ "$SUM_SHARD_TESTS" != "$FULL_TESTS" ]; then
    echo "[FAIL] 샤드 실행 테스트 합 $SUM_SHARD_TESTS != 전수 $FULL_TESTS" >&2
    exit 4
  fi
fi

echo "[check:coverage-attribution] 샤드 $SHARD_COUNT / 파일 합 $SUM_SHARD_FILES (전수 $FULL_FILES)" \
     "/ 테스트 합 $SUM_SHARD_TESTS (전수 $FULL_TESTS) / 샤드 covered 슬롯 합 $SUM_COVERED"
if [ -n "$EMPTY_SHARDS" ]; then
  echo "[check:coverage-attribution] src/** covered 0 샤드 (측정 확인됨):$EMPTY_SHARDS"
fi

if [ "$FAILED" != "0" ]; then
  # 등급별 문구로 나눈다 — 종전 "단조성/실행 사실" 의 `/` 가 등급 혼입의 자백이었다.
  finish_with_class
fi

echo "[check:coverage-attribution] OK — 전 샤드 소실 슬롯 0"
exit 0
