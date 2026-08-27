#!/usr/bin/env bash
# check-telemetry-schema.sh
# Spec: foundation/stall-telemetry-schema-contract §동작 (T-1)(T-3)(T-4) · §수용 기준 2항
# Task: TSK-20260827-07
#
# **정체 판정의 계측 라인이 타입 계약을 만족하는지 집행한다.**
#
# `RULE-03` (S1)(S2)(S3) 는 판정을 전적으로 `.claude/reports/<agent>.ndjson` 의 `moved`·`streak`
# 에 위임하는데, 그 타입을 보는 게이트가 HEAD 에 하나도 없었다. 손상은 **유효한 JSON** 이라
# 파싱도 통과한다 — 실측 114 라인 중 스키마 위반 7건 / 파싱 실패 0건. JS 에서 `["a -> b"] > 0`
# 은 배열 → 문자열 → NaN 비교로 **false** 이므로 생산적 tick 이 조용히 "진행 0" 이 된다.
# 귀결은 정상 동작 에이전트의 **거짓 정지**이고, `.claude/locks/stall-<agent>` 는 운영자만
# 지울 수 있어 자동 복구 경로가 없다. 정체를 놓치는 방향(false negative)이 아니라 정상을
# 멈추는 방향(false positive)이라 더 나쁘다.
#
# §모집단이 왜 픽스처인가 — `.gitignore` 가 `.claude/reports/` 를 제외한다. 그 gitignore 자체는
#   옳다 (추적하면 no-op tick 마다 staged diff 가 생겨 빈 커밋이 부활한다 — RULE-04 명시).
#   그래서 실 계측 파일을 모집단으로 삼는 게이트는 **파일 부재를 위반이 아니라 통과로 읽는다**
#   (false-negative). 판정 모집단은 저장소 안 픽스처이고, 실 계측 트리는 seam 으로 주입한다.
#
# §주입 seam — 모집단 루트를 통째로 주입받는다 (spec: gate-judgement-population-injectable-seam).
#   **아래 TELEMETRY_SCHEMA_ROOT 선언이 이 파일의 첫 번째 기본값 치환 표기여야 한다.** 출처 spec
#   §수용 기준 2항의 seam 도출은 대문자 변수 기본값 표기의 출현 중 `head -1` 을 취하므로, 앞에
#   보조 기본값을 하나라도 두면 판정이 엉뚱한 변수를 seam 으로 잡아 조용히 어긋난다.
#   **주석에 그 표기를 예시로 적는 것만으로도 같은 사고가 난다** — 실제로 이 파일의 초안에서
#   설명용 예시 2건이 seam 도출을 가로채 `seam=[VAR]` 이 나왔다. 그래서 예시를 여기 두지 않는다.
#
# §대상 형태 2종 — 주입된 루트가 **디렉터리면 그 안 `*.ndjson` 전수**, **파일이면 그 1건**이다.
#   §수용 기준 2항이 개별 픽스처 파일을 직접 주입하고(`env "$V=$x"`) 부재 판정에는 빈
#   디렉터리를 주입하므로 두 형태를 모두 받아야 한다.
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   판정 대상 파일 = 루트 glob 열거. 파일명을 본문에 두지 않는다.
#   판정 필드      = 아래 SCHEMA 표 순회. **개수를 판정 로직에 고정하지 않는다** — 계약에
#                    필드가 추가되면 표에만 넣으면 되고 어떤 분기도 함께 고치지 않는다.
#
# §계약 밖 필드는 위반이 아니다 (특이도) — 선언되지 않은 키(`agent`·`queues`·`moved_detail` 등)
#   는 판정하지 않는다. 현 계측 이력에 `moved_detail` 을 쓰는 라인이 실재하므로, 미선언 필드를
#   전부 위반으로 읽는 과잉 게이트는 정상 기록을 붉게 만든다.
#
# §파싱 실패는 침묵 소거하지 않는다 (T-3) — 빈 catch 금지. 계수하고 파일:라인과 함께 표시한다.
#
# exit 0: 위반 0 (ack 1 줄 stdout — 도출 수치). **루트가 실재하는 빈 디렉터리도 0** 이다 (T-4):
#         계측 파일 부재는 클린 클론·CI 의 정상 상태이지 오류가 아니다.
# exit 1: 위반 >= 1 (stderr 에 `<파일>:<라인> <필드>: <실제타입>` 열거 — 필드명 필수).
# exit 2: 무판정 — 주입 루트가 존재하지 않음. "잴 것이 없다" 를 "위반이 없다" 로 읽지 않는다.
#         루트 **부재**(2)와 루트 **실재·파일 0**(0)은 다른 사건이다.

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

# 판정 모집단 주입 seam. 미설정 시 기본은 적합 픽스처만 담긴 `conforming/` 디렉터리다.
#
# **기본값이 왜 부적합 픽스처와 같은 디렉터리가 아닌가** — 무주입 실행은 상시 채널(훅·CI)에서
# 돌므로 적합 모집단을 봐야 한다. 부적합 픽스처는 §수용 기준 2항이 `env "$V=$x"` 로 **1건씩**
# 주입해 민감도를 재는 대상이지 상시 판정 모집단이 아니다. 디렉터리 glob 은 비재귀라
# `conforming/` 은 부모의 `*.ndjson` 열거에 들어가지 않고, 그 반대도 성립한다.
#
# **기본값이 왜 `.claude/reports` 가 아닌가** — 두 방향으로 다 틀린다. 클린 클론·CI 에는 그
# 디렉터리가 아예 없어 무판정(2)으로 붉어지고, 로컬에는 이 계약이 겨냥하는 손상 7건이 이미
# 실재해 위반(1)로 붉어진다. 과거 라인의 소급 정정은 운영자 판단 항목이라 이 게이트가
# 강요할 수 없다. 실 계측 트리는 seam 으로 주입해서 본다.
TELEMETRY_SCHEMA_ROOT="${TELEMETRY_SCHEMA_ROOT:-scripts/fixtures/telemetry-schema/conforming}"

TARGETS=()

if [ -d "$TELEMETRY_SCHEMA_ROOT" ]; then
  for f in "$TELEMETRY_SCHEMA_ROOT"/*.ndjson; do
    [ -f "$f" ] || continue
    TARGETS+=("$f")
  done
elif [ -f "$TELEMETRY_SCHEMA_ROOT" ]; then
  TARGETS+=("$TELEMETRY_SCHEMA_ROOT")
else
  printf 'check-telemetry-schema: 판정 루트 없음 — %s\n' "$TELEMETRY_SCHEMA_ROOT" >&2
  printf '  잴 대상이 없는 것은 충족이 아니다 (fail-closed). 루트 부재(2)와 파일 0(0)은 다르다.\n' >&2
  exit 2
fi

JUDGE="$(cat <<'NODEJS'
const fs = require("fs");

const ID = "check-telemetry-schema";
const root = process.argv[1];
const files = process.argv.slice(2).filter((x) => x.length > 0);
const err = (...a) => process.stderr.write(a.join(" ") + "\n");

const isInt = (v) => typeof v === "number" && Number.isInteger(v);
const isNonNegInt = (v) => isInt(v) && v >= 0;

// (T-1) 계측 라인 타입 계약. 출처는 `RULE-04 §ndjson 라인 형식`.
// 아래 표만이 계약의 소재지다 — 개수·이름을 분기에 복제하지 않는다.
const SCHEMA = [
  { field: "ts", ok: (v) => typeof v === "string" && v.length > 0, want: "문자열(UTC ISO-8601)" },
  { field: "tick", ok: isInt, want: "정수" },
  { field: "no_op", ok: (v) => typeof v === "boolean", want: "불리언" },
  { field: "streak", ok: isNonNegInt, want: "정수 >= 0" },
  { field: "moved", ok: isNonNegInt, want: "정수 >= 0" },
  {
    field: "notes",
    ok: (v) => Array.isArray(v) && v.every((x) => typeof x === "string"),
    want: "문자열 배열",
  },
];

// 실제 타입 표기 — 손상 이력의 표기(`moved: object` · `streak: undefined`)와 같은 어휘를 쓴다.
const actual = (obj, field) => {
  if (!Object.prototype.hasOwnProperty.call(obj, field)) return "undefined";
  const v = obj[field];
  if (v === null) return "null";
  if (Array.isArray(v)) return "object(array)";
  if (typeof v === "number" && !Number.isInteger(v)) return "number(non-integer)";
  if (typeof v === "number" && v < 0) return "number(negative)";
  return typeof v;
};

let lines = 0;
let violations = 0;
let parseFailures = 0;

for (const file of files) {
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (e) {
    err(ID + ": 읽기 실패 " + file + " — " + e.message);
    process.exit(2);
  }

  const rows = raw.split("\n");
  for (let i = 0; i < rows.length; i++) {
    const text = rows[i];
    if (text.trim().length === 0) continue; // 후행 개행은 라인이 아니다
    lines++;
    const at = file + ":" + (i + 1);

    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      // (T-3) 파싱 실패도 계수·표시한다. 빈 catch 로 침묵 소거하지 않는다.
      parseFailures++;
      violations++;
      err(at + " parse-failure: " + e.message);
      continue;
    }

    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
      parseFailures++;
      violations++;
      err(at + " parse-failure: JSON 객체가 아님 (" + (Array.isArray(obj) ? "array" : typeof obj) + ")");
      continue;
    }

    for (const s of SCHEMA) {
      if (s.ok(obj[s.field])) continue;
      violations++;
      err(at + " " + s.field + ": " + actual(obj, s.field) + " (기대: " + s.want + ")");
    }
  }
}

const stat =
  ID + ": files=" + files.length +
  " lines=" + lines +
  " violations=" + violations +
  " parse-failures=" + parseFailures +
  " fields=" + SCHEMA.length +
  " (root=" + root + ")";

if (violations > 0) {
  err("T-1 VIOLATION: 정체 판정 계측 라인이 타입 계약을 위반한다");
  err("  이 손상은 유효한 JSON 이라 파싱에서 걸리지 않고, 비교만 거짓이 되어 생산적 tick 이");
  err("  '진행 0' 으로 확정된다. 귀결은 (S1) 거짓 정지이며 lock 삭제는 운영자 전용이다.");
  err(stat);
  process.exit(1);
}

// (T-4) 파일 0건도 정상 종료다 — 부재는 오류가 아니다.
process.stdout.write(stat + "\n");
process.exit(0);
NODEJS
)"

if [ -z "$JUDGE" ]; then
  printf 'check-telemetry-schema: 판정 본문 추출 실패 (길이 0)\n' >&2
  printf '  빈 프로그램은 rc=0 을 낸다. 그 공허한 초록을 차단한다 (RULE-06 §추출 실패 검출).\n' >&2
  exit 2
fi

node -e "$JUDGE" "$TELEMETRY_SCHEMA_ROOT" ${TARGETS+"${TARGETS[@]}"}
exit $?
