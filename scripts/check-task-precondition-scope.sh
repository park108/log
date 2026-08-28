#!/usr/bin/env bash
# check-task-precondition-scope.sh
# Spec: foundation/task-precondition-scope-nonvacuity-and-reason-consumption
#       §동작 FR-01 · FR-02 · FR-03 · FR-04 · FR-05 · FR-07 · FR-08 · §발화 채널
# Task: TSK-20260828-08
#
# **task 발행 직전의 조건 해소 주장이 비공허한 관측 범위 위에 서 있는지, 그리고 앞선 격리가
# 남긴 사유서의 처방이 재발행 문서의 스코프로 흘렀는지 집행한다.**
#
# 겨누는 형태는 하나다 — 측정 범위가 측정 대상을 담지 못하는데 그 결과가 초록으로 읽힌다.
# 이 회귀는 이틀 연속 실현됐다. 같은 결합(`EXPECTED_GA_SELF_DIAG_COUNT` baseline)에서
# `TSK-20260827-02` 와 `TSK-20260828-07` 이 격리됐고, 두 번째 격리는 첫 번째 사유서가 앵커
# 문자열까지 처방을 이미 갖고 있는 상태에서 났다. 손실의 원인은 정보 부족이 아니라 미소비다.
#
# 근거는 **오류 비용의 비대칭**이다. 확인 범위가 좁으면 영 결과 -> 발행 -> 격리(세션 1개
# 소모)이고, 넓으면 적중 -> 보류(비용 없음). 기본값이 저비용 쪽이 아니라 고비용 쪽에 있었다.
# 손으로 열거한 경로 목록은 **항상 좁아지는 방향으로만** 틀린다 — 결합의 존재를 모르는
# 열거자는 그 경로를 애초에 적을 수 없기 때문이다.
#
# §판정 2축 (출처 문서 §동작 과 1:1 — 로직을 새로 발명하지 않는다):
#   (J-1 = FR-01·FR-03) 마커를 가진 판정 단위가 탐색 명령 + 영 결과를 한 라인에 담으면,
#                       그 단위는 비공허 witness 를 함께 가져야 한다.
#                         (a) 범위 도출 — 그 탐색 라인이 `git ls-files` · `git grep` 를 쓰거나
#                             저장소 루트를 경로 인자로 준다.
#                         (b) 비공허 대조 — 같은 단위의 다른 라인이 **같은 따옴표 패턴**을
#                             0 이 아닌 계수로 보고한다.
#                       어느 쪽도 없으면 위반이며 `<파일>:<라인>` 으로 열거한다. "N 건" 만으로는
#                       교정 대상을 특정할 수 없다.
#   (J-2 = FR-02)       선행 축 링크를 가진 문서는 그 사유서 §재발행 시 필요한 것 이 파일
#                       경로로 지목한 대상 전수를 `## 변경 범위` 에 담는다. 미포함이 1건이라도
#                       있고 확장 선언이 허용이 아니면 위반이다.
#
# §판정 단위는 리스트 항목까지 좁힌다 — 빈 줄로만 자른 최대 연속 구간은 번호목록 전체를 한
#   덩어리로 묶어, 마커가 다른 항에서 온 오탐을 만든다 (본 task 발행 tick 의 프로토타입 실측
#   3/241). 리스트 항목(`-` `*` `+` `N.`)은 그 자체로 단위를 연다.
#
# §링크 도출은 두 경로를 **모두** 쓴다 (FR-02):
#   (a) 문서가 지목한 앞선 `TSK-YYYYMMDD-NN` 식별자 (자기 식별자 제외).
#   (b) **출처 문서 slug 일치** — 사유서 루트의 task 문서 중 같은 slug 를 인용한 것.
#   (b) 가 없으면 이 게이트는 자기를 만든 그 사고를 못 잡는다. 실측 — `TSK-20260828-07` 본문의
#   `TSK-` 토큰은 자기 식별자 1건뿐이고 앞선 `TSK-20260827-02` 를 어디서도 지목하지 않는다.
#   두 문서를 잇는 유일한 기계적 끈은 slug 다.
#
# §요구 경로는 저장소 실재로 거른다 — `_reason.md` 본문의 자기 참조 파일명(디렉터리 없는
#   사유서 이름)은 이 필터에서 자동 배제된다.
#
# §숫자 경계 (FR-01) — 영 결과 토큰은 숫자 경계를 존중한다. 경계 없는 패턴은 두 자리 수의
#   끝자리를 영 결과로 오인한다 (프로토타입 실측: 10 건 보고를 영 결과로 계수).
#
# §모집단이 왜 픽스처인가 (FR-04·FR-06) — 실 모집단 두 곳(`specs/40.task` · 격리 트리)은
#   `.gitignore` 대상이라 신선한 클론·CI 체크아웃에 **존재조차 하지 않는다**. 그것을 기본
#   모집단으로 삼으면 상시 채널(훅·CI)이 항상 무판정으로 붉어진다. 선례가 같은 형상을 이미
#   해결했다 — `scripts/check-telemetry-schema.sh` 는 계측 트리가 무시 대상이라 기본값을 적합
#   픽스처로 두고 실 트리는 seam 으로 주입한다. 같은 근거·같은 형태를 따른다.
#   실 트리 판정은 `TASK_PRECONDITION_ROOT` 명시 주입으로만 수행하는 **로컬 진단**이다.
#
# §집행 스코프 (FR-08) — 격리 트리는 **읽기 전용 참조**다. 이 게이트는 그 트리에 쓰거나
#   옮기지 않으며(RULE-05 운영자 경로), 저장소의 어떤 상시 채널도 그 트리를 판정 루트로
#   주입하지 않는다. 그 트리의 형식 위반은 고칠 writer 가 파이프라인에 없기 때문이다.
#
# §자기봉쇄 차단 (FR-07) — 검출 토큰(영 결과 어간 · 확장 선언 키 · 대체 선언 키 · 마커)은
#   본문에 리터럴로 담지 않고 `printf` 분할로 **조립**한다. 리터럴로 담으면 장래 이 스크립트가
#   스캔 대상에 들어갈 때 자기 적중이 된다. 선례: `scripts/check-acceptance-criteria.sh` 의
#   금지어 조립. 더해 마커 매칭은 **게이트 자신의 식별자에 박힌 형태를 배제**한다 — 이 게이트
#   이름이 마커 어간을 부분문자열로 품고 있어, 배제하지 않으면 이 게이트를 **언급하는 모든
#   문서**가 자동으로 마커 보유가 된다.
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   판정 문서 = 루트 하위 `*.md` 재귀 열거. 파일명을 본문에 두지 않는다.
#   마커 집합 = 아래 MARKERS 배열 순회. 개수를 분기에 고정하지 않으며 집합이 비면 무판정이다.
#
# §공허 통과 차단 — `for f in $(...)` 형태로 모집단을 만들면 공집합에서 루프가 0회 돌고
#   `rc=0` 이 난다. 하한 검사를 루프보다 **앞**에 둔다.
#
# §서브셸 함정 — `x="$(f)"` 는 `f` 의 무판정 등급을 삼킨다. 판정기는 명령 치환 없이 직접
#   호출하고 rc 를 `$?` 로 즉시 받는다. 파이프 뒤 `$?` 는 파이프 마지막 명령의 rc 다.
#
# §색상 비의존 — 본 게이트는 다른 도구의 출력을 변수로 캡처해 판독하지 않는다. 판정 입력은
#   파일 내용뿐이며 ANSI 시퀀스가 개입할 표면이 없다.
#
# §read-only — 판정 루트·사유서 루트·저장소 어느 경로도 수정하지 않는다.
#
# exit 0: 판정 수행 + 위반 0 (ack 1 줄 stdout — 모집단 계수 포함).
# exit 1: 위반 1건 이상 — `<파일>:<라인>` 과 미포함 경로를 stderr 에 열거한다.
# exit 2: 무판정. "잴 것이 없다" 를 "위반이 없다" 로 읽지 않는다. grep 가능 라벨:
#           NO-JUDGEMENT: root-missing           판정 루트 또는 사유서 루트 부재
#           NO-JUDGEMENT: population-empty       루트 하위 문서 0건 (하한 미달)
#           NO-JUDGEMENT: marker-set-empty       마커 집합 공집합 (도출 붕괴)
#           NO-JUDGEMENT: judgeable-unit-empty   문서는 있으나 판정 단위·링크 전부 0
#           NO-JUDGEMENT: internal-error         판정기 예외
#         **위반 0 통과 출력과 무판정 출력은 문자열로 다르다** (FR-04).

set -u

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || {
  printf 'NO-JUDGEMENT: root-missing — 저장소 루트로 이동 불가\n' >&2
  exit 2
}

TASK_PRECONDITION_ROOT="${TASK_PRECONDITION_ROOT:-scripts/fixtures/task-precondition/conforming}"
TASK_PRECONDITION_REASON_ROOT="${TASK_PRECONDITION_REASON_ROOT:-scripts/fixtures/task-precondition/reason}"

# ── 검출 토큰 조립 (FR-07) ──────────────────────────────────────────────────
# 아래 어느 것도 소스에 완성형 리터럴로 등장하지 않는다.
HIT_STEM="$(printf '%s' 'hit')"
ZERO_ERE="$(printf '(^|[^0-9])0 %ss?([^0-9]|$)' "$HIT_STEM")"
NONZERO_ERE="$(printf '(^|[^0-9])[1-9][0-9]* %ss?([^0-9]|$)' "$HIT_STEM")"
EXPANSION_KEY="$(printf '%s%s' 'expansion' ':')"
SUPERSEDE_KEY="$(printf '%s%s' 'supersedes' ':')"

# 마커 집합 (§도출). 개수를 분기에 고정하지 않는다.
MARKERS=()
MARKERS+=("$(printf '%s %s' '선행' '조건')")
MARKERS+=("$(printf '%s%s' '선행' '조건')")
MARKERS+=("$(printf '%s%s' 'pre' 'condition')")

# 마커 집합 비공허 단언 — 조립이 깨지면 (J-1) 이 조용히 무판정이 된다.
if [ "${#MARKERS[@]}" -eq 0 ]; then
  printf 'NO-JUDGEMENT: marker-set-empty — 마커 집합 공집합 (조립 붕괴)\n' >&2
  exit 2
fi
for m in "${MARKERS[@]}"; do
  if [ -z "$m" ]; then
    printf 'NO-JUDGEMENT: marker-set-empty — 빈 마커 원소 (조립 붕괴)\n' >&2
    exit 2
  fi
done

node - "$TASK_PRECONDITION_ROOT" "$TASK_PRECONDITION_REASON_ROOT" \
  "$ZERO_ERE" "$NONZERO_ERE" "$EXPANSION_KEY" "$SUPERSEDE_KEY" "${MARKERS[@]}" <<'JS'
const fs = require("fs");
const path = require("path");

const ID = "check-task-precondition-scope";
const err = (s) => process.stderr.write(s + "\n");

const root = process.argv[2];
const reasonRoot = process.argv[3];
const zeroEre = process.argv[4];
const nonzeroEre = process.argv[5];
const expKey = process.argv[6];
const supKey = process.argv[7];
const markers = process.argv.slice(8).filter((x) => x.length > 0);

  // 선언 키는 마크다운 강조를 사이에 끼운 형태로 나타난다 (`**key**:`). 리터럴 대조는
  // 그 형태를 통째로 놓치고 선언 부재로 읽는다 — 실측에서 확장 선언을 보유한 문서가
  // 미선언으로 계수됐다. 키 어간과 콜론 사이의 강조·공백을 허용해 대조한다.
  const declRe = (k) => new RegExp(k.replace(/:$/, "") + "[\\s*_`]*:");

const no = (label, detail) => {
  err("NO-JUDGEMENT: " + label + (detail ? " — " + detail : ""));
  err("  잴 것이 없다를 위반이 없다로 읽지 않는다 (fail-closed).");
  process.exit(2);
};

try {
  if (!markers.length) no("marker-set-empty", "판정기 인자에 마커 0건");

  const isDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();
  if (!isDir(root)) no("root-missing", "root=" + root);
  if (!isDir(reasonRoot)) no("root-missing", "reason-root=" + reasonRoot);

  // §도출 — 디렉터리 재귀 열거. 파일명 하드코딩 금지.
  const walk = (dir, out) => {
    let ents = [];
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return out;
    }
    ents
      .slice()
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .forEach((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.isFile() && e.name.endsWith(".md")) out.push(p);
      });
    return out;
  };

  const docs = walk(root, []);
  const reasonDocs = walk(reasonRoot, []);

  // §공허 통과 차단 — 하한 검사는 루프보다 앞이다.
  const DOCS_MIN = 1;
  if (docs.length < DOCS_MIN) {
    no("population-empty", "docs=" + docs.length + " (하한 " + DOCS_MIN + ") root=" + root);
  }

  const read = (p) => fs.readFileSync(p, "utf8");
  const rel = (p) => path.relative(process.cwd(), p) || p;

  // ── 판정 단위 분해 (리스트 항목까지 좁힌다) ──
  const unitsOf = (text) => {
    const out = [];
    let cur = null;
    text.split("\n").forEach((line, i) => {
      const n = i + 1;
      if (/^\s*$/.test(line)) {
        cur = null;
        return;
      }
      if (/^\s*([-*+]|\d+\.)\s/.test(line) || !cur) {
        cur = { lines: [] };
        out.push(cur);
      }
      cur.lines.push({ n, t: line });
    });
    return out;
  };

  const zeroRe = new RegExp(zeroEre);
  const nonzeroRe = new RegExp(nonzeroEre);
  const SEARCH_RE = /(^|[^A-Za-z0-9_-])(grep|rg)([^A-Za-z0-9_-]|$)/;
  const GIT_SCOPE_RE = /git\s+(ls-files|grep)/;
  // 저장소 루트를 경로 인자로 준 형태 (` .` / ` ./`).
  const REPO_ROOT_ARG_RE = /\s\.\/?([\s'"`)]|$)/;

  // §자기봉쇄 차단 — 게이트 자신의 식별자에 박힌 어간은 마커로 계수하지 않는다.
  // 앞이 영숫자·`_`·`:`·`/`·`-` 이거나 뒤가 영숫자·`_`·`-` 면 식별자의 일부다.
  const asciiMarkerRe = (m) =>
    new RegExp("(^|[^A-Za-z0-9_:/-])" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^A-Za-z0-9_-]|$)");
  const markerHit = (line) =>
    markers.some((m) => (/^[\x20-\x7e]+$/.test(m) ? asciiMarkerRe(m).test(line) : line.includes(m)));

  // 탐색 라인에서 따옴표 패턴을 뽑는다 (witness (b) 대조 키).
  const quotedPattern = (line) => {
    const m = line.match(/(?:grep|rg)[^\n]*?(['"])([^'"]{2,})\1/);
    return m ? m[2] : null;
  };

  let claimUnits = 0;
  const fr01 = [];

  docs.forEach((p) => {
    unitsOf(read(p)).forEach((u) => {
      if (!u.lines.some((x) => markerHit(x.t))) return;
      u.lines.forEach((x) => {
        if (!SEARCH_RE.test(x.t) || !zeroRe.test(x.t)) return;
        claimUnits += 1;
        const wideScope = GIT_SCOPE_RE.test(x.t) || REPO_ROOT_ARG_RE.test(x.t);
        const pat = quotedPattern(x.t);
        const contrast =
          pat !== null &&
          u.lines.some((y) => y.n !== x.n && y.t.includes(pat) && nonzeroRe.test(y.t));
        if (!wideScope && !contrast) fr01.push(rel(p) + ":" + x.n);
      });
    });
  });

  // ── 선행 축 링크 + 사유서 처방 소비 (J-2) ──
  const REASON_SUFFIX = "_reason.md";
  const idOf = (text, file) => {
    const fromBody = text.match(/TSK-\d{8}-\d{2}(?:-[a-z])?/);
    const fromName = path.basename(file).match(/TSK-\d{8}-\d{2}(?:-[a-z])?/);
    return (fromName && fromName[0]) || (fromBody && fromBody[0]) || null;
  };
  // 출처 문서 지칭은 lifecycle 경로형과 slug 형이 섞여 나타난다. 둘을 같은 것으로 읽지
  // 않으면 slug 링크가 통째로 끊긴다 — 실측에서 앞선 격리와 재발행이 각각 경로형·slug 형을
  // 써서 두 문서를 잇는 유일한 끈이 사라졌다. 확장자와 상위 경로를 걷어 마지막 마디로
  // 정규화한다 (RULE-01 §파일 이름 — 식별은 경로가 아니라 slug 다).
  const normSlug = (s) => s.replace(/\.md$/, "").split("/").filter(Boolean).pop() || null;
  const slugOf = (text) => {
    const line = text.split("\n").find((l) => l.includes("출처") && l.includes("spec"));
    if (!line) return null;
    const m = line.match(/`([^`]+)`/);
    return m ? normSlug(m[1]) : null;
  };
  const sectionOf = (text, headRe) => {
    const lines = text.split("\n");
    const out = [];
    let on = false;
    for (const l of lines) {
      if (/^##\s/.test(l)) {
        on = headRe.test(l);
        continue;
      }
      if (on) out.push(l);
    }
    return out.join("\n");
  };

  const reasonById = new Map();
  const priorSlug = new Map();
  reasonDocs.forEach((p) => {
    const base = path.basename(p);
    const text = read(p);
    const id = idOf(text, p);
    if (!id) return;
    if (base.endsWith(REASON_SUFFIX)) reasonById.set(id, p);
    else if (!priorSlug.has(id)) priorSlug.set(id, slugOf(text));
  });

  // ── 처방 절 추출 정밀도 (FR-01 절 경계 · FR-02 극성) ──────────────────────
  // 선택자는 "제목이 처방 키워드로 시작하는 절" 이며 첫 매칭 절에서 수집을 종료한다.
  // 제목 부분일치 + 절마다 술어 재평가는 같은 키워드를 제목에 품은 검증 기록·측정표 절이
  // 수집 구간을 다시 열게 했고, 그 절의 표 셀이 요구 경로로 계수됐다.
  const PRESC_HEAD_RE = /^##\s+재발행/;
  // 부정 서술 표지. 자연어 부정은 열거로 닫히지 않으므로 미포함 표현이 요구로 남는 것은
  // 위반이 아니라 알려진 잔여다.
  const NEGATION_RE = /없다|없어|없음|무영향|않는다|않았다|아니다|아니라|제외한|제외하|대상이 아니/;
  // 측정표·대조군 표의 셀은 처방이 아니다.
  const TABLE_ROW_RE = /^\s*\|/;

  const prescriptionOf = (text) => {
    const picked = [];
    let matches = 0;
    let on = false;
    text.split("\n").forEach((l, i) => {
      if (/^##\s/.test(l)) {
        if (PRESC_HEAD_RE.test(l)) {
          matches += 1;
          on = matches === 1;
        } else if (on) {
          on = false;
        }
        return;
      }
      if (on) picked.push({ n: i + 1, t: l });
    });
    return { lines: picked, matches };
  };

  const PATH_TOKEN_RE = /[A-Za-z0-9_.][A-Za-z0-9_./-]*/g;
  const isRealFile = (t) => {
    try {
      return fs.existsSync(t) && fs.statSync(t).isFile();
    } catch (e) {
      /* 존재 판정 실패는 미실재와 같다 */
      return false;
    }
  };

  // 사유서 1건당 1회만 분석한다. `excluded` 는 극성·표 셀로 요구 도출이 막힌
  // (문서:라인, 토큰) 단위 계수다 — 같은 토큰이 다른 처방 라인에서 요구로 남을 수 있다.
  const analysisCache = new Map();
  const analyze = (reasonPath) => {
    const cached = analysisCache.get(reasonPath);
    if (cached) return cached;
    const sec = prescriptionOf(read(reasonPath));
    const required = [];
    const excluded = [];
    sec.lines.forEach((x) => {
      const prescriptive = !NEGATION_RE.test(x.t) && !TABLE_ROW_RE.test(x.t);
      const seen = new Set();
      (x.t.match(PATH_TOKEN_RE) || []).forEach((tok) => {
        const t = tok.replace(/[.]+$/, "");
        if (!/[./]/.test(t)) return;
        if (seen.has(t)) return;
        seen.add(t);
        if (!isRealFile(t)) return;
        if (prescriptive) {
          if (!required.includes(t)) required.push(t);
        } else {
          excluded.push(rel(reasonPath) + ":" + x.n + " " + t);
        }
      });
    });
    const res = { required: required, excluded: excluded, matches: sec.matches };
    analysisCache.set(reasonPath, res);
    return res;
  };
  const requiredOf = (reasonPath) => analyze(reasonPath).required;

  // 추출 정밀도 계수는 링크 그래프가 아니라 사유서 모집단 전수에서 도출한다.
  let reasonDocCount = 0;
  let ambiguousDocs = 0;
  let polarityExcluded = 0;
  reasonDocs.forEach((p) => {
    if (!path.basename(p).endsWith(REASON_SUFFIX)) return;
    reasonDocCount += 1;
    const a = analyze(p);
    if (a.matches >= 2) ambiguousDocs += 1;
    polarityExcluded += a.excluded.length;
  });

  let linked = 0;
  const fr02 = [];

  docs.forEach((p) => {
    const base = path.basename(p);
    if (base.endsWith(REASON_SUFFIX)) return;
    const text = read(p);
    const selfId = idOf(text, p);
    const slug = slugOf(text);

    const priors = new Set();
    (text.match(/TSK-\d{8}-\d{2}(?:-[a-z])?/g) || []).forEach((t) => {
      if (t !== selfId) priors.add(t);
    });
    const supLine = text.split("\n").find((l) => declRe(supKey).test(l));
    if (supLine) {
      (supLine.match(/TSK-\d{8}-\d{2}(?:-[a-z])?/g) || []).forEach((t) => {
        if (t !== selfId) priors.add(t);
      });
    }
    if (slug) {
      priorSlug.forEach((s, id) => {
        if (s === slug && id !== selfId) priors.add(id);
      });
    }

    const required = [];
    priors.forEach((id) => {
      const rp = reasonById.get(id);
      if (!rp) return;
      requiredOf(rp).forEach((q) => {
        if (!required.includes(q)) required.push(q);
      });
    });
    if (!required.length) return;
    linked += 1;

    const scopeSec = sectionOf(text, /변경\s*범위/);
    const missing = required.filter((q) => !scopeSec.includes(q));
    if (!missing.length) return;

    const expLine = text.split("\n").find((l) => declRe(expKey).test(l));
    const allowed = !!expLine && expLine.includes("허용");
    if (allowed) return;
    fr02.push({ doc: rel(p), missing });
  });

  // §무판정 — 문서는 있으나 판정 단위도 링크도 0 이면 아무것도 재지 않은 것이다.
  if (claimUnits === 0 && linked === 0) {
    no(
      "judgeable-unit-empty",
      "docs=" + docs.length + " reasons=" + reasonDocs.length +
        " claims=0 linked=0 root=" + root
    );
  }

  const stat =
    "docs=" + docs.length +
    " reasons=" + reasonDocs.length +
    " reason-docs=" + reasonDocCount +
    " prescription-section-ambiguous=" + ambiguousDocs +
    " polarity-excluded=" + polarityExcluded +
    " claims=" + claimUnits +
    " linked=" + linked +
    " violations=" + (fr01.length + fr02.length) +
    " (root=" + root + " reason-root=" + reasonRoot + ")";

  if (fr01.length || fr02.length) {
    if (fr01.length) {
      err("FR-01 VIOLATION: 대조도 범위 도출도 없는 영 결과 주장 " + fr01.length + "건");
      fr01.forEach((x) => err("  bare-zero-claim: " + x));
      err("  범위가 좁으면 영 결과는 해소의 증거가 아니라 범위 이탈의 증거다.");
    }
    if (fr02.length) {
      err("FR-02 VIOLATION: 사유서 지목 경로가 변경 범위에 없다 " + fr02.length + "건");
      fr02.forEach((x) => x.missing.forEach((q) => err("  unconsumed-prescription: " + x.doc + " -> " + q)));
      err("  착지 불가가 발행 시점에 확정된 상태다. 확장 선언이 허용이 아니면 위반이다.");
    }
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
