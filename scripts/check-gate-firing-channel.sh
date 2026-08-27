#!/usr/bin/env bash
# check-gate-firing-channel.sh
# Spec: foundation/declared-gate-firing-channel-totality §동작 (FR-01)…(FR-07)
# Task: TSK-20260827-06
#
# **선언된 게이트는 전부 자동 발화 채널을 최소 1개 갖는다.** 선언·파일 실재와 **실행 여부**를
# 분리해 판정한다 — 종수가 늘어도 아무도 부르지 않으면 그 게이트는 존재하지 않는 것과 같다.
#
# 이 축을 재는 채널이 HEAD 에 없었다. npm script 와 스크립트 파일만 추가한 커밋이
# 워크플로·훅을 건드리지 않은 채 착지했고, 그 뒤 54 커밋 동안 그 게이트는 **한 번도 실행되지
# 않았다**. 그 사이 어떤 기존 게이트도 붉어지지 않았다 — 파일은 실재하고 seam 도 있고 npm
# 진입점도 정상이라, 배선만 없는 형태는 모든 정합 게이트를 통과한다. 하필 그 무발화 게이트가
# 측정 귀속 래퍼여서, 거짓 양성 오보를 막았어야 할 채널이 잠든 채로 사고가 났다.
#
# 판정 (출처 spec 수용 기준 1항과 동치, 채널 수집만 전역 매치 상위집합):
#   (J-1 = FR-01) 채널 0 인 `check:` 키가 1건이라도 있으면 exit 1. **이름을 stderr 에 열거**한다.
#   (J-2 = FR-05) 대상 키 · 훅 파일 · 훅 라인 · 워크플로 라인 중 하나라도 0 이면 exit 2.
#                 "잴 것이 없다" 를 "위반이 없다" 로 읽지 않는다 (RULE-06 §추출 실패 검출).
#
# §채널의 정의 (FR-02 합집합) — 아래 셋 중 1건이면 충족이며 수단은 지정하지 않는다.
#   (a) 워크플로의 `run:` 실행 라인에 있는 `npm run <key>`.
#   (b) 훅 파일 실행 라인에 있는 `npm run <key>`.
#   (c) 같은 실행 라인이 그 키가 가리키는 `scripts/*.sh` 경로를 직접 호출.
#   한 라인에 호출이 여러 개일 수 있으므로 **전역 매치**로 전부 수집한다.
#
# §관측 표면은 실행 라인이다 (FR-03) — 각 라인의 `#` 이후 구간을 계수 **전에** 잘라낸다.
#   주석에 적힌 게이트 이름은 채널이 아니다. 이 절단이 없으면 본 게이트는 자기가 겨누는
#   결함(주석 한 줄이 배선 판정을 충족)을 자기가 재현한다. 워크플로에는 게이트 이름이
#   주석으로만 등장하는 라인이 실재하므로 이것은 가상의 위험이 아니다.
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   대상 키   = <root>/package.json 의 scripts 중 `check:` 접두 키 열거.
#   훅 파일   = <root>/.husky/ **디렉터리 열거** 중 일반 파일 (하위 디렉터리 제외).
#   워크플로  = <root>/.github/workflows/ci.yml 전 라인.
#   게이트 개수·스크립트명·훅 파일명을 본문에 리터럴로 적지 않는다. 신규 도입분이 모집단에
#   자동으로 들어와야 하고, 종수의 절대값은 계약이 아니다 (FR-07).
#
# §자기 적용 (FR-06) — 이 게이트도 등재되는 순간 모집단에 들어온다. 채널을 붙이지 않으면
#   **자기 자신을 위반 키로 연다**. 집행자가 자기 계약의 예외가 되지 않는다.
#
# §주입 seam — 판정 모집단 루트를 통째로 주입받는다 (spec: gate-judgement-population-injectable-seam).
#   package.json · 워크플로 · 훅 디렉터리를 전부 이 루트 하위 상대경로로 연다. 저장소 루트를
#   고정 참조하면 주입이 전부 무의미해지고, 민감도 검증은 실 트리를 훼손하는 방식밖에 남지
#   않는다 (RULE-02 §교차 작업 파괴). 미설정 기본은 저장소 루트다.
#
# exit 0: 채널 0 키 없음 (ack 1 줄 stdout — 도출 수치 + 추출 키 표본).
# exit 1: 위반 (stderr 에 채널 0 키 이름 열거).
# exit 2: 무판정 — 루트 부재 · 선언 파일 부재/파손 · 도출 공집합.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

# 판정 모집단 주입 seam. 미설정 시 기본은 저장소 루트다.
GATE_FIRING_SCAN_ROOT="${GATE_FIRING_SCAN_ROOT:-.}"

if [ ! -d "$GATE_FIRING_SCAN_ROOT" ]; then
  printf 'check-gate-firing-channel: 스캔 루트 없음 — %s\n' "$GATE_FIRING_SCAN_ROOT" >&2
  printf '  잴 대상이 없는 것은 충족이 아니다 (fail-closed).\n' >&2
  exit 2
fi

JUDGE="$(cat <<'NODEJS'
const fs = require("fs");
const path = require("path");

const root = process.argv[1];
const ID = "check-gate-firing-channel";
const err = (...a) => process.stderr.write(a.join(" ") + "\n");

// 도출 실패는 무판정이다 — 공집합을 충족으로 읽지 않는다 (FR-05).
const nojudge = (msg) => {
  err(ID + ": 무판정 — " + msg + " (root=" + root + ")");
  err("  도출이 비면 위반 0 이 되어 초록으로 읽힌다. 그 형태를 자기 차단한다.");
  process.exit(2);
};

const pkgPath = path.join(root, "package.json");
if (!fs.existsSync(pkgPath)) nojudge("선언 파일 부재 " + pkgPath);

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
} catch (e) {
  nojudge("선언 파일 파싱 실패 " + pkgPath);
}

// §도출 (1) 대상 키 — `check:` 접두 열거. 개수·이름을 고정하지 않는다.
const scripts = (pkg && pkg.scripts) || {};
const keys = Object.keys(scripts).filter((k) => k.startsWith("check:"));

// §도출 (2) 훅 파일 — 디렉터리 열거 중 일반 파일. 파일명을 고정하지 않는다.
const hookDir = path.join(root, ".husky");
const hookFiles = fs.existsSync(hookDir)
  ? fs
      .readdirSync(hookDir)
      .filter((f) => fs.statSync(path.join(hookDir, f)).isFile())
      .sort()
  : [];

// §도출 (3) 워크플로 라인.
const ciPath = path.join(root, ".github", "workflows", "ci.yml");
const ciRaw = fs.existsSync(ciPath) ? fs.readFileSync(ciPath, "utf8") : "";

// FR-03 — `#` 이후 절단 후 공백 라인 제외. 주석은 실행 라인이 아니다.
const cut = (text) =>
  text
    .split("\n")
    .map((l) => l.replace(/#.*/, ""))
    .filter((l) => l.trim().length > 0);

const ciLines = cut(ciRaw);
const hookLines = hookFiles
  .map((f) => cut(fs.readFileSync(path.join(hookDir, f), "utf8")))
  .reduce((a, b) => a.concat(b), []);

// (J-2 = FR-05) 도출 비공허 단언. 넷 중 하나라도 0 이면 무판정이다.
if (keys.length === 0) nojudge("대상 키 0건");
if (hookFiles.length === 0) nojudge("훅 파일 0건");
if (hookLines.length === 0) nojudge("훅 실행 라인 0건");
if (ciLines.length === 0) nojudge("워크플로 실행 라인 0건");

// §채널 수집 (FR-02) — 전역 매치로 한 라인의 호출을 전부 거둔다.
const KEY_RE = /npm run (check:[A-Za-z0-9:._-]+)/g;
const PATH_RE = /scripts\/[A-Za-z0-9._/-]+\.sh/g;

const wiredKeys = new Set();
const wiredPaths = new Set();

const harvest = (line) => {
  let m;
  KEY_RE.lastIndex = 0;
  while ((m = KEY_RE.exec(line)) !== null) wiredKeys.add(m[1]);
  const p = line.match(PATH_RE) || [];
  p.forEach((x) => wiredPaths.add(x));
};

// (a) 워크플로는 `run:` 실행 라인 한정 — step 이름·설명 라인을 배선으로 세지 않는다.
ciLines.filter((l) => /(^|\s)run:/.test(l)).forEach(harvest);
// (b)(c) 훅은 실행 라인 전량.
hookLines.forEach(harvest);

// (J-1 = FR-01) 채널 0 키 열거. 개수만 내지 않는다.
const dead = keys.filter((k) => {
  if (wiredKeys.has(k)) return false;
  const own = String(scripts[k] || "").match(PATH_RE) || [];
  return !own.some((x) => wiredPaths.has(x));
});

const stat =
  "keys=" + keys.length +
  " hooks=" + hookFiles.length +
  " hook-lines=" + hookLines.length +
  " ci-lines=" + ciLines.length +
  " wired-keys=" + wiredKeys.size +
  " wired-paths=" + wiredPaths.size +
  " dead=" + dead.length +
  " (root=" + root + ")";

// 추출 표본 — 도출이 실제로 무엇을 집었는지 ack 에 남긴다 (RULE-06 §추출 실패 검출).
const sample =
  " sample-key=" + keys[0] +
  " sample-key-last=" + keys[keys.length - 1] +
  " sample-hook=" + hookFiles[0];

if (dead.length > 0) {
  err("FR-01 VIOLATION: 자동 발화 채널 0 인 게이트 실재 (총성 미충족)");
  dead.forEach((k) => err("  no-channel: " + k + " -> " + scripts[k]));
  err("  선언만 있고 아무도 부르지 않는 게이트는 종수만 키운다. 워크플로 `run:` 실행 라인");
  err("  또는 훅 실행 라인에 호출 1건을 부착하라. 주석은 채널이 아니다 (FR-03).");
  err(ID + ": " + stat + sample);
  process.exit(1);
}

process.stdout.write(ID + ": " + stat + sample + "\n");
process.exit(0);
NODEJS
)"

if [ -z "$JUDGE" ]; then
  printf 'check-gate-firing-channel: 판정 본문 추출 실패 (길이 0)\n' >&2
  printf '  빈 프로그램은 rc=0 을 낸다. 그 공허한 초록을 차단한다.\n' >&2
  exit 2
fi

node -e "$JUDGE" "$GATE_FIRING_SCAN_ROOT"
exit $?
