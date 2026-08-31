#!/usr/bin/env bash
# check-summary-drift.sh
# Spec: common/stored-summary-parser-drift-measurement §동작 (I1)(I2)(I3)(I4)
# Task: TSK-20260901-04
#
# 목록(`LogList`)과 검색 미리보기(`Search`)가 그리는 것은 본문이 아니라 **저장 시점에
# 계산돼 서버에 박힌 요약**이다. 요약은 `trimmedContents` 를 거치고 그 함수는
# `markdownToHtml` 을 통과시킨다. 그래서 파서 계약을 고치면 **그날 이후 저장분만 새 규칙을
# 따르고 이미 저장된 글의 요약은 옛 규칙에 얼어 있다** — 독자는 목록에서 한 가지를,
# 본문에서 다른 것을 본다.
#
# **이 채널이 재는 것은 회복이 아니라 측정이다.** 차이가 있다는 것은 결함이 아니라 파서
# 계약이 의도대로 착지했다는 뜻이며, 재는 것은 **그 사실이 기록되는가** 이다. 침묵은
# 미측정과 구별되지 않으므로 침묵을 허용하지 않는다.
#
# (I1) 판정 대상은 단일 HEAD 의 "옳음" 이 아니라 **두 리비전 산출의 차집합**이다.
#      단일 HEAD 에서 `trimmedContents(x)` 의 옳은 값은 그 HEAD 의 파서가 내는 값이고
#      그것은 정의상 항상 일치한다 — **항진명제라 아무것도 붙들지 못한다.**
# (I2) 입력은 **도출한다.** 고정 입력 목록을 새로 박는 것은 같은 결함을 한 겹 옮기는 것이다.
# (I3) 도출이 공집합이면 통과가 아니라 **무판정 실패(`exit 2`)** 다.
# (I4) 갈라진 부류는 내부 함수명이 아니라 **독자가 보는 글자**로 출력한다.
#
# §주입 seam — SUMMARY_DRIFT_BASE · SUMMARY_DRIFT_HEAD 로 비교쌍을 갈아끼운다.
#   기본값은 HEAD~1..HEAD. 두 seam 은 판정 방식을 바꾸지 않고 **대상 리비전만** 바꾼다.
#
# read-only: 저장소 워킹트리를 수정하지 않는다. 두 리비전은 `git archive` 로 임시 경로에
#   꺼내며 `node_modules` 만 심볼릭 링크한다 (`src` 는 실사본 — 링크로 두면 도출이 어긋난다).

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || exit 2

BASE_REV="${SUMMARY_DRIFT_BASE:-HEAD~1}"
HEAD_REV="${SUMMARY_DRIFT_HEAD:-HEAD}"

BASE_SHA="$(git rev-parse --verify --quiet "$BASE_REV^{commit}")"
HEAD_SHA="$(git rev-parse --verify --quiet "$HEAD_REV^{commit}")"

if [ -z "$BASE_SHA" ] || [ -z "$HEAD_SHA" ]; then
	echo "check-summary-drift: 무판정 — 리비전을 해석할 수 없다 (base=$BASE_REV head=$HEAD_REV)" >&2
	exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# ── 두 리비전을 실사본으로 꺼낸다 (I1) ────────────────────────────────────────
for pair in "base:$BASE_SHA" "head:$HEAD_SHA"; do
	name="${pair%%:*}"
	sha="${pair##*:}"
	mkdir -p "$TMP_DIR/$name" || exit 2
	if ! git archive "$sha" | tar -x -C "$TMP_DIR/$name"; then
		echo "check-summary-drift: 무판정 — $sha 를 꺼내지 못했다" >&2
		exit 2
	fi
	ln -s "$REPO_ROOT/node_modules" "$TMP_DIR/$name/node_modules" 2>/dev/null || true
done

# ── (I1 실효) 리비전 충실성 자가 확인 ────────────────────────────────────────
# **소스 텍스트에 `git archive` 가 있다는 것은 그것이 실제로 돈다는 뜻이 아니다.**
# 주석 한 줄이 정적 게이트를 초록으로 유지하는 동안 두 트리가 같은 내용으로 채워지면
# 이 채널은 항진명제가 된다 — 갈리는 리비전쌍에서도 늘 `영향 0` 을 낸다 (실측).
# 그래서 꺼낸 트리의 파일이 `git show <sha>:<path>` 와 **바이트 단위로 같은지** 매 실행마다
# 확인한다. 한 건도 확인하지 못하면 그것도 무판정이다.
verify_tree_fidelity() {
	local tree="$1" sha="$2" verified=0 path content_hash tree_hash
	for path in src/Log/api.ts src/common/markdownParser.ts src/__tests__/markdown-no-character-loss.test.ts; do
		git show "$sha:$path" > "$TMP_DIR/expect.tmp" 2>/dev/null || continue
		[ -f "$tree/$path" ] || continue
		content_hash="$(shasum -a 256 < "$TMP_DIR/expect.tmp" | cut -d' ' -f1)"
		tree_hash="$(shasum -a 256 < "$tree/$path" | cut -d' ' -f1)"
		if [ "$content_hash" != "$tree_hash" ]; then
			echo "check-summary-drift: 무판정 — 꺼낸 트리가 $sha 의 내용이 아니다 ($path)" >&2
			echo "  두 리비전 비교가 실효 상태가 아니면 이 채널은 항진명제다." >&2
			exit 2
		fi
		verified=$((verified + 1))
	done
	if [ "$verified" -lt 1 ]; then
		echo "check-summary-drift: 무판정 — $sha 의 어떤 경로도 대조하지 못했다" >&2
		exit 2
	fi
}

verify_tree_fidelity "$TMP_DIR/base" "$BASE_SHA"
verify_tree_fidelity "$TMP_DIR/head" "$HEAD_SHA"

if [ "$BASE_SHA" = "$HEAD_SHA" ]; then
	echo "check-summary-drift: 무판정 — 같은 리비전끼리는 잴 것이 없다 (항진명제)" >&2
	exit 2
fi

# ── 입력 도출 (I2) — 열거하지 않는다 ──────────────────────────────────────────
# 원천 1: 글자 소실 채널의 `PLAIN_PROSE` (마크다운 표기가 든 산문 코퍼스)
# 원천 2: 목록/단건 픽스처의 `contents` (실제 저장된 글의 본문 형상)
# 두 리비전 **양쪽**에서 도출해 합집합을 쓴다 — 한쪽에서 사라진 입력이 조용히 모집단에서
# 빠지면 "차이 0" 이 도출 축소의 결과일 수 있다.
CORPUS="$TMP_DIR/corpus.txt"
: > "$CORPUS"

derive_from_tree() {
	local tree="$1"
	local prose="$tree/src/__tests__/markdown-no-character-loss.test.ts"
	local fixtures="$tree/src/Log/__fixtures__/logs.ts"

	if [ -f "$prose" ]; then
		# 배열 블록 안의 작은따옴표 문자열을 뽑는다. **목록 완전성 보조 단언**:
		# 뽑은 개수와 블록 안에서 따옴표로 시작하는 줄 수가 다르면 도출이 새는 것이므로
		# 무판정으로 멈춘다 (RULE-06 §열거 고정 금지).
		perl -CSD -0777 -ne '
			if (/const PLAIN_PROSE = \[(.*?)\n\];/s) {
				my $b = $1;
				my @items = ($b =~ /'"'"'((?:[^'"'"'\\]|\\.)*)'"'"'/g);
				my @lines = grep { /^\s*'"'"'/ } split(/\n/, $b);
				if (scalar(@items) != scalar(@lines)) {
					print STDERR "PROSE_DERIVATION_MISMATCH items=" . scalar(@items) . " lines=" . scalar(@lines) . "\n";
					exit 3;
				}
				for my $s (@items) {
					$s =~ s/\\n/\n/g; $s =~ s/\\t/\t/g; $s =~ s/\\'"'"'/'"'"'/g; $s =~ s/\\\\/\\/g;
					print JSONQ($s) . "\n";
				}
			}
			sub JSONQ { my $t = shift; $t =~ s/\\/\\\\/g; $t =~ s/"/\\"/g; $t =~ s/\n/\\n/g; $t =~ s/\t/\\t/g; return "\"" . $t . "\""; }
		' "$prose" >> "$CORPUS"
		local rc=$?
		if [ "$rc" -eq 3 ]; then
			echo "check-summary-drift: 무판정 — PLAIN_PROSE 도출이 새고 있다 ($prose)" >&2
			exit 2
		fi
	fi

	if [ -f "$fixtures" ]; then
		perl -CSD -0777 -ne '
			while (/contents:\s*"((?:[^"\\]|\\.)*)"/g) { print "\"" . $1 . "\"\n"; }
		' "$fixtures" >> "$CORPUS"
	fi
}

derive_from_tree "$TMP_DIR/base"
derive_from_tree "$TMP_DIR/head"

sort -u "$CORPUS" -o "$CORPUS"
CORPUS_N="$(grep -c . "$CORPUS")"

# ── (I3 실효) 무판정 경로 자가 확인 ──────────────────────────────────────────
# 공집합 판정을 **0 을 넣어 실제로 돌려 본다.** 살아 있으면 rc=2 여야 한다. 이 확인이
# 없으면 `exit 2` 라는 **글자만** 남기고 경로를 들어내도 정적 게이트가 초록이다.
# **판정은 한 곳에서만 내린다.** 자가 확인이 판정의 *사본*을 재면 사본 둘이 갈라져,
# 실제 경로를 들어내도 자가 확인은 초록이다. 그래서 아래 함수가 유일한 공집합 판정이고
# 자가 확인과 실제 판정이 **같은 함수를 부른다**.
population_verdict() {   # rc 2 = 무판정(공집합) · rc 0 = 판정 가능
	if [ "$1" -lt 1 ]; then
		return 2
	fi
	return 0
}

population_verdict 0
if [ "$?" -ne 2 ]; then
	echo "check-summary-drift: 무판정 — 공집합 무판정 경로가 살아 있지 않다 (0 을 넣었는데 통과했다)" >&2
	exit 2
fi
population_verdict 1
if [ "$?" -ne 0 ]; then
	echo "check-summary-drift: 무판정 — 공집합 판정이 과잉이다 (1 을 넣었는데 막았다)" >&2
	exit 2
fi

# ── (I3) 모집단 비공허 단언 — 공집합은 통과가 아니라 무판정이다 ───────────────
population_verdict "$CORPUS_N"
if [ "$?" -ne 0 ]; then
	echo "check-summary-drift: 무판정 — 입력 도출이 공집합이다 (base=$BASE_SHA head=$HEAD_SHA)" >&2
	echo "  도출 원천: src/__tests__/markdown-no-character-loss.test.ts (PLAIN_PROSE) · src/Log/__fixtures__/logs.ts (contents)" >&2
	exit 2
fi

# ── 각 리비전에서 trimmedContents 를 돌린다 ───────────────────────────────────
RUNNER="$TMP_DIR/run-summary.mjs"
cat > "$RUNNER" <<'MJS'
import { readFileSync } from 'node:fs';
const corpus = readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => l.length > 0).map((l) => JSON.parse(l));
const { trimmedContents } = await import('./src/Log/api.ts');
for (const input of corpus) {
	process.stdout.write(JSON.stringify([input, trimmedContents(input)]) + '\n');
}
MJS

run_tree() {
	local tree="$1"
	local out="$2"
	cp "$RUNNER" "$tree/run-summary.mjs" || return 1
	( cd "$tree" && npx vite-node ./run-summary.mjs "$CORPUS" ) > "$out" 2>"$out.err"
	return $?
}

BASE_OUT="$TMP_DIR/base.out"
HEAD_OUT="$TMP_DIR/head.out"

if ! run_tree "$TMP_DIR/base" "$BASE_OUT" || [ ! -s "$BASE_OUT" ]; then
	echo "check-summary-drift: 무판정 — base($BASE_SHA) 에서 trimmedContents 를 돌리지 못했다" >&2
	tail -3 "$BASE_OUT.err" >&2 2>/dev/null
	exit 2
fi
if ! run_tree "$TMP_DIR/head" "$HEAD_OUT" || [ ! -s "$HEAD_OUT" ]; then
	echo "check-summary-drift: 무판정 — head($HEAD_SHA) 에서 trimmedContents 를 돌리지 못했다" >&2
	tail -3 "$HEAD_OUT.err" >&2 2>/dev/null
	exit 2
fi

BASE_N="$(grep -c . "$BASE_OUT")"
HEAD_N="$(grep -c . "$HEAD_OUT")"
if [ "$BASE_N" -ne "$CORPUS_N" ] || [ "$HEAD_N" -ne "$CORPUS_N" ]; then
	echo "check-summary-drift: 무판정 — 산출 줄 수가 모집단과 다르다 (corpus=$CORPUS_N base=$BASE_N head=$HEAD_N)" >&2
	exit 2
fi

# ── (I4) 갈라진 부류를 독자의 언어로 출력한다 ─────────────────────────────────
DIFF_REPORT="$TMP_DIR/diff.txt"
node -e '
	const fs = require("node:fs");
	const [basePath, headPath] = process.argv.slice(1);
	const rd = (p) => fs.readFileSync(p, "utf8").split("\n").filter((l) => l.length > 0).map((l) => JSON.parse(l));
	const base = new Map(rd(basePath));
	const head = new Map(rd(headPath));
	const diverged = [];
	for (const [input, headOut] of head) {
		const baseOut = base.get(input);
		if (baseOut !== headOut) diverged.push([input, baseOut, headOut]);
	}
	for (const [input, b, h] of diverged) {
		process.stdout.write("  원문        : " + JSON.stringify(input) + "\n");
		process.stdout.write("  기존 저장분 : " + JSON.stringify(b) + "   ← 목록·검색 미리보기에 이렇게 남아 있다\n");
		process.stdout.write("  현재 파서   : " + JSON.stringify(h) + "   ← 본문은 이렇게 보인다\n\n");
	}
	process.stderr.write(String(diverged.length));
' "$BASE_OUT" "$HEAD_OUT" > "$DIFF_REPORT" 2>"$TMP_DIR/diff.count"
DIVERGED="$(cat "$TMP_DIR/diff.count" 2>/dev/null)"
[ -n "$DIVERGED" ] || DIVERGED="?"

if [ "$DIVERGED" = "?" ]; then
	echo "check-summary-drift: 무판정 — 비교를 완료하지 못했다" >&2
	exit 2
fi

echo "check-summary-drift: base=${BASE_SHA:0:7} head=${HEAD_SHA:0:7} corpus=$CORPUS_N diverged=$DIVERGED"

if [ "$DIVERGED" -eq 0 ]; then
	# 침묵과 구별되는 **명시적 영향 0**. 모집단 수가 함께 찍히므로 "잴 것이 없어서 0" 과
	# "재봤더니 0" 이 출력에서 갈린다.
	echo "  영향 0 — 이 리비전쌍은 저장된 요약을 낡게 만들지 않는다 (corpus=$CORPUS_N 건 전수 일치)"
	exit 0
fi

echo "  갈라진 부류 $DIVERGED 건 — 목록·검색에서 기존 글이 본문과 다르게 보인다:"
cat "$DIFF_REPORT"
echo "  차이는 결함이 아니라 파서 계약이 의도대로 착지한 결과다. 이 채널은 회복이 아니라"
echo "  그 사실이 기록되는가를 잰다 (회복·재저장은 운영 결정이며 계약 범위 밖이다)."
exit 0
