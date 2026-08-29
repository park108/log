#!/usr/bin/env bash
# check-gate-wiring.sh
# Spec: foundation/gate-wiring-execution-surface-coherence §동작 FR-01·FR-02·FR-03·FR-05 · §발화 채널
# Task: TSK-20260828-02
#
# **`package.json scripts.check:*` · `.husky/pre-commit` · `scripts/**` 3자의 배선 정합을
# 실행 표면에서 집행한다.** 이 축을 재는 상시 채널이 HEAD 에 없었다 — 판정은 spec 본문의
# 일회용 `node -e` 명령으로만 존재했고, 그래서 아래 두 부류가 로컬 커밋·CI 어디에서도
# 붉어지지 않았다.
#
#   (1) 훅의 게이트 호출 실행 라인이 삭제되고 설명 주석만 남는다. 문자열 grep 기반 배선
#       판정은 그 주석 한 줄로 초록을 유지한다. 실측 (HEAD 4014c66): pre-commit 의
#       `# npm script 동치: check:monitor-state-immutability` 주석과 그 아래 실행 라인은
#       별개 라인이고, 실행 라인만 지워도 이름은 파일에 그대로 남는다.
#   (2) 훅 호출과 npm script 의 경로 분기. 훅이 낡은 경로를 부르거나 이름이 어긋나도
#       양쪽을 개별로 보면 둘 다 정상으로 보인다.
#
# §판정 3종 (출처 spec §동작 과 1:1 — 로직을 새로 발명하지 않는다):
#   (J-1 = FR-01) `check:*` 값 전수가 `bash scripts/<name>.sh` 단일 형태이고 도출 경로가
#                 실재한다. 셸 로직이 선언 문자열 안으로 인라인되지 않는다.
#                 위반 키를 **이름으로 stderr 에 열거**한다 — 개수만 내는 실패는 미충족이다.
#   (J-2 = FR-02) 훅 실행 라인이 호출하는 `scripts/*.sh` 경로 집합 ⊆ `check:*` 도출 경로
#                 집합. 차집합 원소를 열거한다.
#   (J-3 = FR-03) **주석은 배선을 충족시키지 않는다.** 훅 파일에서 `#` 이후 구간에만
#                 등장하고 실행 구간에는 없는 `scripts/*.sh` 경로는 위반이다. 실행 라인을
#                 지우고 주석만 남긴 형태가 정확히 이 모양이다.
#
# §관측 표면 (FR-03) — (J-1)(J-2) 의 입력 라인은 `#` 이후를 **계수 전에** 절단한 것이다.
#   절단하지 않으면 이 게이트는 자기가 겨누는 결함을 자기가 재현한다. 이 저장소에서
#   주석이 판정을 충족시킨 부류가 하루에 5회 관측됐다 (배선 판정 · seam 도출 · 색상 방어 ·
#   awk 세그먼트 · 구 식별자 역사 참조). 가상의 위험이 아니다.
#
# §측정 대상은 작업 트리다 (FR-05) — `git diff --cached` 등 staged 집합을 보지 않는다.
#   게이트 자신의 변경이 staged 되지 않은 상태에서도 같은 판정을 낸다. staged 집합에
#   의존하면 훅 밖(CI · 수동 실행)에서 판정이 통째로 공허해진다.
#
# §FR-04 는 구현하지 않는다 — `.husky/pre-commit` 각 블록의 발화 조건이 그 블록이 부르는
#   스크립트 경로를 포함하는가의 축이다. 현 HEAD 에 위반 4건이 실재하며(출처 spec §관측
#   근거 표), 그 축의 수리는 `TSK-20260827-02` 로 격리돼 `REQ-20260827-029` 선행 처리
#   중이다. 본 게이트가 FR-04 를 켜면 신설 즉시 CI 가 붉어진다. 축을 지우는 것이 아니라
#   소유 task 가 따로 있다.
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   대상 키   = <root>/package.json 의 `check:` 접두 키 열거. 종수를 판정에 고정하지 않는다.
#   도출 경로 = 그 값에서 뽑은 `scripts/*.sh`.
#   훅 경로   = 훅 파일 실행 구간의 `scripts/*.sh`.
#   스크립트명·게이트 수·훅 파일명을 본문에 리터럴로 적지 않는다.
#
# §회피 경로 차단 — ack 라인에 세 모집단 수를 전부 출력하고, 같은 실행에서 그 수치가 도출
#   결과와 동일함을 단정한다. 키 수는 선언 파일 원문의 키 라인 계수와 **교차 검증**한다.
#   모집단을 몰래 줄여 위반 0 을 만드는 경로를 막는다.
#
# §ERE 는 홑따옴표로 고정한다 — 겹따옴표 안에서 `\$` 가 셸 확장을 받아 패턴 꼬리가 조용히
#   잘린 결함이 이 저장소에서 관측됐다.
#
# §서브셸 함정 — `x="$(f)"` 는 `f` 의 `exit 2` 를 삼킨다. 판정기는 명령 치환 없이 직접
#   호출하고 rc 를 `$?` 로 즉시 받는다. 파이프 뒤 `$?` 는 파이프 마지막 명령의 rc 이므로
#   rc 가 필요한 지점에 파이프를 두지 않는다.
#
# §색상 비의존 — 본 게이트는 다른 도구의 출력을 변수로 캡처해 판독하지 않는다. 판정 입력은
#   `package.json` 과 훅 파일의 **파일 내용**뿐이며 ANSI 시퀀스가 개입할 표면이 없다.
#
# §read-only — `package.json` · `.husky/**` · `scripts/**` 를 수정하지 않는다.
#
# exit 0: 판정 수행 + 위반 0 (ack 1 줄 stdout).
# exit 1: 위반 1건 이상 — 위반 키·경로를 stderr 에 열거한다.
# exit 2: 무판정. "잴 것이 없다" 를 "위반이 없다" 로 읽지 않는다. grep 가능 라벨:
#           NO-JUDGEMENT: scan-root-missing        스캔 루트 또는 그 package.json 부재
#           NO-JUDGEMENT: package-json-unreadable  선언 파일 파싱 실패
#           NO-JUDGEMENT: check-keys-empty         `check:` 접두 키 0건
#           NO-JUDGEMENT: derived-path-empty       키에서 도출된 스크립트 경로 0건
#           NO-JUDGEMENT: hook-file-missing        훅 파일 부재
#           NO-JUDGEMENT: hook-path-empty          주석 절단 후 훅 스크립트 호출 0경로
#           NO-JUDGEMENT: key-count-incoherent     키 계수 교차 검증 불일치
#           NO-JUDGEMENT: internal-error           판정기 예외
#         **본 게이트에 "빈 디렉터리 = 정상 부재 = exit 0" 부류는 없다.** 모집단이 디렉터리
#         열거가 아니라 `package.json` 키 + 훅 파일이기 때문이다. 훅이 실재하는데 거기서
#         도출된 스크립트 호출이 0 인 상태는 정상 부재가 아니라 "훅에 아무것도 안 걸려
#         있다" 이며, 그것을 위반 0 으로 읽지 않는다.

set -u

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || {
  printf 'NO-JUDGEMENT: scan-root-missing — 저장소 루트로 이동 불가\n' >&2
  exit 2
}

WIRING_SCAN_ROOT="${GATE_WIRING_SCAN_ROOT:-.}"
WIRING_HOOK_FILES="${GATE_WIRING_HOOK_FILES:-.husky/pre-commit}"

node - "$WIRING_SCAN_ROOT" "$WIRING_HOOK_FILES" <<'JS'
const fs = require("fs");
const path = require("path");

const root = process.argv[2];
const hookRel = process.argv[3];
const ID = "check-gate-wiring";
const err = (s) => process.stderr.write(s + "\n");

const no = (label, detail) => {
  err("NO-JUDGEMENT: " + label + (detail ? " — " + detail : ""));
  err("  잴 것이 없다를 위반이 없다로 읽지 않는다 (fail-closed).");
  process.exit(2);
};

try {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    no("scan-root-missing", "root=" + root);
  }
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) no("scan-root-missing", "package.json 부재 (root=" + root + ")");

  const pkgRaw = fs.readFileSync(pkgPath, "utf8");
  let scripts;
  try {
    scripts = JSON.parse(pkgRaw).scripts || {};
  } catch (e) {
    no("package-json-unreadable", "root=" + root + " (" + e.message + ")");
  }

  // §도출 (1) 대상 키.
  const keys = Object.keys(scripts).filter((k) => k.startsWith("check:"));

  // FR-03 — `#` 이후 절단은 계수보다 앞이다.
  const cut = (line) => {
    const i = line.indexOf("#");
    return i < 0 ? line : line.slice(0, i);
  };
  const commentOf = (line) => {
    const i = line.indexOf("#");
    return i < 0 ? "" : line.slice(i);
  };

  const PATH_RE = /scripts\/[A-Za-z0-9._/-]+\.sh/g;
  const VALUE_RE = /^bash scripts\/[A-Za-z0-9._-]+\.sh$/;
  const grab = (s) => s.match(PATH_RE) || [];

  // §도출 (2) 키 값에서 스크립트 경로. 값 자체도 실행 표면이므로 주석 절단을 적용한다.
  const derived = [];
  const badForm = [];
  const missing = [];
  for (const k of keys) {
    const raw = String(scripts[k] || "");
    const v = cut(raw).trim();
    if (!VALUE_RE.test(v)) {
      badForm.push(k);
      continue;
    }
    const p = grab(v)[0];
    if (!fs.existsSync(path.join(root, p))) {
      missing.push(k + " -> " + p);
      continue;
    }
    if (!derived.includes(p)) derived.push(p);
  }

  // §회피 경로 차단 — 선언 파일 원문의 키 **선언 토큰** 계수와 교차 검증한다.
  // 라인 단위가 아니라 전문 전역 토큰 매치다 — 줄바꿈·들여쓰기·탭·CRLF 어느 것에도
  // 의존하지 않는다 (1줄 직렬화·4-space 재직렬화 모두 동일 계수).
  // 여는 따옴표에 바로 이어지는 `check:` + 콜론만 매치하므로 `"npm run check:deps"`
  // 같은 값 문자열 안의 부분문자열은 매치하지 않는다. JSON 에 주석 문법이 없으므로
  // 여기에는 `#` 절단(FR-03)을 적용하지 않는다 — 그것은 훅 원문 전용이다.
  const rawKeyDecls = (pkgRaw.match(/"check:[^"]*"\s*:/g) || []).length;

  // §도출 (3) 훅 실행 구간 / 주석 구간의 스크립트 경로.
  const hookPath = path.join(root, hookRel);
  const hookExists = fs.existsSync(hookPath) && fs.statSync(hookPath).isFile();
  const hookExec = [];
  const hookComment = [];
  if (hookExists) {
    for (const line of fs.readFileSync(hookPath, "utf8").split("\n")) {
      for (const p of grab(cut(line))) if (!hookExec.includes(p)) hookExec.push(p);
      for (const p of grab(commentOf(line))) if (!hookComment.includes(p)) hookComment.push(p);
    }
  }

  // §도출 비공허 단언 (RULE-06 §추출 실패 검출) — 판정보다 앞이다.
  if (keys.length === 0) no("check-keys-empty", "root=" + root);
  if (rawKeyDecls !== keys.length) {
    no(
      "key-count-incoherent",
      "parsed=" + keys.length + " raw-decls=" + rawKeyDecls + " (root=" + root + ")"
    );
  }
  if (derived.length === 0 && badForm.length === 0 && missing.length === 0) {
    no("derived-path-empty", "check-keys=" + keys.length + " root=" + root);
  }
  if (!hookExists) no("hook-file-missing", hookPath);
  if (hookExec.length === 0) {
    no("hook-path-empty", "hook=" + hookRel + " (주석 절단 후 스크립트 호출 0경로)");
  }

  const setD = new Set(derived);
  const orphan = hookExec.filter((p) => !setD.has(p));
  const commentOnly = hookComment.filter((p) => !hookExec.includes(p));

  const stat =
    "check-keys=" + keys.length +
    " derived-paths=" + derived.length +
    " hook-paths=" + hookExec.length +
    " hook-comment-paths=" + hookComment.length +
    " (root=" + root + " hook=" + hookRel + ")";

  // §회피 경로 차단 — 출력 수치가 도출 배열 길이와 동일함을 같은 실행에서 단정한다.
  if (
    !/check-keys=(\d+)/.test(stat) ||
    Number(stat.match(/check-keys=(\d+)/)[1]) !== keys.length ||
    Number(stat.match(/derived-paths=(\d+)/)[1]) !== derived.length ||
    Number(stat.match(/hook-paths=(\d+)/)[1]) !== hookExec.length
  ) {
    no("internal-error", "ack 수치와 도출 결과 불일치");
  }

  if (process.env.GATE_WIRING_LIST === "1") {
    process.stdout.write("[gate-wiring] keys=" + keys.join(",") + "\n");
    process.stdout.write("[gate-wiring] derived=" + derived.join(",") + "\n");
    process.stdout.write("[gate-wiring] hook-exec=" + hookExec.join(",") + "\n");
    process.stdout.write("[gate-wiring] hook-comment=" + hookComment.join(",") + "\n");
  }

  let violated = false;

  if (badForm.length || missing.length) {
    violated = true;
    err("FR-01 VIOLATION: check:* 진입점이 파일 호출 단일 형태가 아니다 " +
      (badForm.length + missing.length) + "건");
    badForm.forEach((k) => err("  inline-or-malformed: " + k + " -> " + scripts[k]));
    missing.forEach((m) => err("  missing-script: " + m));
    err("  셸 로직이 선언 문자열 안에 있으면 seam·주입·재사용이 전부 불가능해진다.");
  }

  if (orphan.length) {
    violated = true;
    err("FR-02 VIOLATION: 훅 호출 경로가 check:* 도출 집합 밖 " + orphan.length + "건");
    orphan.forEach((p) => err("  hook-only: " + p));
    err("  훅과 npm script 가 갈라지면 양쪽을 개별로 볼 때 둘 다 정상으로 보인다.");
  }

  if (commentOnly.length) {
    violated = true;
    err("FR-03 VIOLATION: 주석에만 남은 스크립트 경로 " + commentOnly.length + "건");
    commentOnly.forEach((p) => err("  comment-only: " + p));
    err("  실행 라인이 사라지고 주석만 남은 형태다. 주석은 배선을 충족시키지 않는다.");
  }

  if (violated) {
    err(ID + ": " + stat);
    process.exit(1);
  }

  process.stdout.write(ID + ": " + stat + " (PASS)\n");
  process.exit(0);
} catch (e) {
  err("NO-JUDGEMENT: internal-error — " + e.message);
  process.exit(2);
}
JS
rc=$?
exit "$rc"
