#!/usr/bin/env bash
# check-output-parsing-color-independence.sh
# Spec: foundation/gate-output-parsing-color-independent-fail-closed §동작 FR-01·FR-02·FR-03·FR-04·FR-06·FR-07
# Task: TSK-20260827-09-b
#
# **다른 도구의 출력을 판독하는 게이트가 색상 설정에 무너지지 않고 fail-closed 인지 집행한다.**
#
# 이 축의 위반은 어떤 상시 게이트도 붉게 만들지 못했다. 실측 (2026-08-27, 부착 전 HEAD):
#   FORCE_COLOR=1 npm run --silent check:deps
#     -> 'line 50: ESC[33m31ESC[39m: syntax error: operand expected' + '(PASS)' + rc=0
#   판정 산술이 붕괴했는데 결과는 PASS 이고 무색 실행과 rc 가 같아 CI 도 초록이었다.
#
# §모집단 도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   후보    = <scan-root>/package.json 의 'check:' 접두 키 전수. 게이트 수·스크립트명을
#             판정에 고정하지 않는다. 개수를 박제하면 판독 게이트를 모집단 밖으로 밀어내는
#             회피가 그대로 통과한다.
#   본문    = 그 값이 가리키는 scripts/*.sh (경로 부재 시 인라인 값 자체).
#   판독    = (a) 도구(npx·npm)를 명령 치환으로 캡처하고 (b) 그 캡처 변수를 grep·case·sed·awk
#             로 판정하는 키. 두 조건 동시 만족만 대상이다.
#
# §주석 절단 — 판정 전 '#' 이후를 잘라낸다. 자르지 않으면 헤더 주석에 적은 색상 방어 설명
#   한 줄이 방어 보유로 계수돼 **게이트가 자기 문서로 통과한다.** 이 파일 자신이 그 위험의
#   실례다 — 위 실측 단락에 FORCE_COLOR 토큰이 들어 있다.
#
# §판정 3종 (출처 spec §수용 기준 1·2·3항과 1:1 — 로직을 새로 발명하지 않는다):
#   (J-1 = AC-1 = FR-01·FR-06) 판독 게이트 전수가 색상 방어를 보유한다.
#                              방어 = NO_COLOR 설정 · FORCE_COLOR=0 설정 · ANSI 제거 중 1개 이상.
#   (J-2 = AC-2 = FR-03·FR-04) 판독 변수와 그 1-hop 파생 변수 중 최소 1개가 비어있음 가드
#                              또는 case fallback + 종료를 보유한다.
#   (J-3 = AC-3 = FR-02)       증인 키 1건을 색상 강제·무색으로 실행해 rc 와 판정 출력이
#                              문자열로 일치하는지 대조한다. 전수 런타임 대조는 비용상
#                              하지 않는다 (출처 spec §참고 §미측정) — 정적 축이 J-1·J-2 다.
#
# §자기 적용 (FR-07) — 본 게이트는 등재되는 순간 자기 모집단의 후보가 된다. **본 게이트는
#   판독 게이트가 아니다**: J-1·J-2 는 package.json·scripts/*.sh 를 텍스트로만 스캔하고,
#   J-3 의 증인 실행은 출력을 변수로 캡처하지 않고 파일로 리다이렉트해 diff 로 대조한다.
#   따라서 도구 캡처 변수가 0 이고 모집단에 들어오지 않는다 (출처 spec §역할 (iii)).
#   착지 시 실측으로 이것을 실증한다 — 등재 전후 모두 reading-gates=3.
#
# §서브셸 함정 — x="$(f)" 는 f 의 exit 2 를 삼킨다. 무판정 등급이 명령 치환 안에서 소멸하지
#   않도록 정적 판정은 리다이렉트 + 직접 $? 검사로 부른다. 파이프 뒤 $? 는 파이프 마지막
#   명령의 rc 이므로 rc 가 필요한 지점에 파이프를 두지 않는다.
#
# §증인 키 멤버십 — 증인이 도출된 판독 게이트 모집단의 원소가 아니면 통과도 위반도 아닌
#   무판정(2)이다. 증인이 모집단 밖으로 나간 사실이 조용한 스킵으로 흡수되는 경로를 막는다.
#
# §read-only — package.json · scripts/** · node_modules 를 수정하지 않는다.
#
# exit 0: 판정 수행 + 위반 0 (ack 2 줄 stdout).
# exit 1: 위반 1건 이상. **위반 키 이름을 열거한다** (FR-01 명시) — 열거 없는 실패는 미충족이다.
# exit 2: 무판정. "잴 것이 없다" 를 "위반이 없다" 로 읽지 않는다 (FR-04). grep 가능 라벨로 분리:
#           NO-JUDGEMENT: scan-root-missing              스캔 루트 또는 그 package.json 부재
#           NO-JUDGEMENT: package-json-unreadable        package.json 파싱 불가
#           NO-JUDGEMENT: check-keys-empty               'check:' 접두 키 0건 (모집단 상위집합 공허)
#           NO-JUDGEMENT: reading-gate-population-empty  판독 게이트 도출 0건 (FR-06 겨냥 형태)
#           NO-JUDGEMENT: witness-key-not-in-population  증인 키가 모집단 밖
#           NO-JUDGEMENT: witness-output-empty           증인 양쪽 실행 출력이 공집합
#           NO-JUDGEMENT: witness-contrast-unmeasurable  diff 라인수 판독 실패
#           NO-JUDGEMENT: internal-error                 판정기 예외
#         **본 게이트에 "빈 디렉터리 = 정상 부재 = exit 0" 부류는 없다.** 모집단이 디렉터리
#         열거가 아니라 package.json 키이기 때문이다. 루트가 실재하는데 판독 게이트가 0 인
#         상태는 정상 부재가 아니라 도출 붕괴다.

set -u

OUTPUT_PARSING_SCAN_ROOT="${OUTPUT_PARSING_SCAN_ROOT:-.}"
OUTPUT_PARSING_WITNESS_KEY="${OUTPUT_PARSING_WITNESS_KEY:-check:deps}"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || {
  printf 'NO-JUDGEMENT: scan-root-missing — 저장소 루트로 이동 불가\n' >&2
  exit 2
}

scan_root="$OUTPUT_PARSING_SCAN_ROOT"
witness="$OUTPUT_PARSING_WITNESS_KEY"

node - "$scan_root" "$witness" <<'JS'
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const witness = process.argv[3];

function no(label, detail) {
  process.stderr.write("NO-JUDGEMENT: " + label + (detail ? " — " + detail : "") + "\n");
  process.exit(2);
}

try {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) no("scan-root-missing", "root=" + root);
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) no("scan-root-missing", "package.json 부재 (root=" + root + ")");

  let s;
  try {
    s = JSON.parse(fs.readFileSync(pkgPath, "utf8")).scripts || {};
  } catch (e) {
    no("package-json-unreadable", "root=" + root + " (" + e.message + ")");
  }

  const keys = Object.keys(s).filter((x) => x.startsWith("check:"));
  if (!keys.length) no("check-keys-empty", "root=" + root);

  const R = /scripts\/[A-Za-z0-9._\/-]+\.sh/;
  const CUT = (t) => t.split("\n").map((l) => l.replace(/#.*/, ""));
  const TOOL = /\b(npx|npm)\s+\S/;
  const J = /\b(grep|case|sed|awk)\b/;
  const DEF = /NO_COLOR|FORCE_COLOR=0|\[0-9;\]\*m|\[\[:cntrl:\]\]/;

  const reading = [];
  const noDef = [];
  const noGuard = [];

  for (const k of keys) {
    const m = s[k].match(R);
    const rel = m ? path.join(root, m[0]) : null;
    const f = rel && fs.existsSync(rel) ? rel : null;
    const L = CUT(f ? fs.readFileSync(f, "utf8") : s[k]);

    const V = [];
    L.forEach((l) => {
      const a = l.match(/([A-Za-z_][A-Za-z0-9_]*)="?\$\(/);
      if (a && TOOL.test(l)) V.push(a[1]);
    });
    const read = V.filter((v) => L.some((l) => l.includes("$" + v) && J.test(l)));
    if (!read.length) continue;
    reading.push(k);

    if (!L.some((l) => DEF.test(l))) noDef.push(k);

    const fam = new Set(read);
    read.forEach((v) =>
      L.forEach((l) => {
        const a = l.match(/([A-Za-z_][A-Za-z0-9_]*)="?\$\(/);
        if (a && l.includes("$" + v)) fam.add(a[1]);
      })
    );
    const ok = [...fam].some(
      (w) =>
        L.some((l) => new RegExp("-[zn][ \\t]+\\x22\\$\\{?" + w + "(\\}|\\x22)").test(l)) ||
        L.some(
          (l, i) =>
            new RegExp("case[ \\t]+\\x22\\$\\{?" + w + "(\\}|\\x22)").test(l) &&
            L.slice(i, i + 8).some((x) => /\*\)/.test(x) && /exit/.test(x))
        )
    );
    if (!ok) noGuard.push(k);
  }

  if (!reading.length) no("reading-gate-population-empty", "check-keys=" + keys.length + " root=" + root);
  if (!reading.includes(witness)) {
    no("witness-key-not-in-population", "witness=" + witness + " population=[" + reading.join(",") + "]");
  }

  process.stdout.write(
    "[output-parsing] check-keys=" + keys.length + " reading-gates=" + reading.length +
      " keys=[" + reading.join(",") + "]" +
      " no-color-defense=" + noDef.length + " no-fail-closed=" + noGuard.length +
      " (root=" + root + ")\n"
  );

  if (noDef.length || noGuard.length) {
    if (noDef.length) {
      process.stderr.write("FR-01 VIOLATION: 색상 방어 미보유 " + noDef.length + "건 — " + noDef.join(",") + "\n");
    }
    if (noGuard.length) {
      process.stderr.write("FR-03 VIOLATION: 부재 가드·fallback 종료 미보유 " + noGuard.length + "건 — " + noGuard.join(",") + "\n");
    }
    process.exit(1);
  }
  process.exit(0);
} catch (e) {
  process.stderr.write("NO-JUDGEMENT: internal-error — " + e.message + "\n");
  process.exit(2);
}
JS
static_rc=$?

if [ "$static_rc" -ne 0 ]; then
  exit "$static_rc"
fi

c_out="$(mktemp "${TMPDIR:-/tmp}/opci-c.XXXXXX")"
n_out="$(mktemp "${TMPDIR:-/tmp}/opci-n.XXXXXX")"
trap 'rm -f "$c_out" "$n_out"' EXIT

( cd "$scan_root" && FORCE_COLOR=1 npm run --silent "$witness" ) >"$c_out" 2>&1
rc_c=$?
( cd "$scan_root" && NO_COLOR=1 npm run --silent "$witness" ) >"$n_out" 2>&1
rc_n=$?

if [ ! -s "$c_out" ] && [ ! -s "$n_out" ]; then
  printf 'NO-JUDGEMENT: witness-output-empty — witness=%s (색상·무색 양쪽 출력이 공집합)\n' "$witness" >&2
  exit 2
fi

diff_lines="$(diff "$c_out" "$n_out" | wc -l | tr -d '[:space:]')"
case "$diff_lines" in
  '' | *[!0-9]*)
    printf 'NO-JUDGEMENT: witness-contrast-unmeasurable — diff 라인수 판독 실패 [%s]\n' "$diff_lines" >&2
    exit 2
    ;;
esac

if [ "$rc_c" != "$rc_n" ] || [ "$diff_lines" != "0" ]; then
  printf 'FR-02 VIOLATION: %s — color-rc=%s nocolor-rc=%s diff-lines=%s (색상 설정이 판정을 바꿨다)\n' \
    "$witness" "$rc_c" "$rc_n" "$diff_lines" >&2
  diff "$c_out" "$n_out" >&2
  exit 1
fi

printf '[output-parsing] witness=%s color-rc=%s nocolor-rc=%s diff-lines=%s (PASS)\n' \
  "$witness" "$rc_c" "$rc_n" "$diff_lines"
exit 0
