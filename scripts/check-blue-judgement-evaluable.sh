#!/usr/bin/env bash
# check-blue-judgement-evaluable.sh
# Spec: foundation/blue-spec-judgement-command-evaluability §동작 (I3)(I4)(I5)(I6)(I7)
# Task: TSK-20260831-12
#
# 승격된 계약이 자기 판정 명령을 잃어도 아무 신호가 나지 않는 상태를 닫는다.
#
# `30.spec/blue/**` 의 판정 명령이 `rc=2` 를 내면 grep 이 **대상을 열지 못했다**는 뜻이며,
# 명제가 참인지 거짓인지가 아니라 **평가되지 않았다**는 뜻이다. `rc=2` 는 조용하다 —
# 게이트 다수가 "0 hits 여야 한다" 형태라 `rc=1` 을 기대하는데 `rc=2` 도 "0 이 아닌 rc"
# 이므로 `! grep` 이나 `|| true` 로 감싸면 **통과로 읽힌다.**
#
# 실물: `components/log.md` 의 `bash -c 'grep -qF "..." src/Log/LogList.jsx'` 는 파일이
# 없어 rc=2 이고, 부정 게이트 안에서 `!` 가 그것을 뒤집어 rc=0(통과)이 된다. 위반이
# 없어서가 아니라 **볼 파일이 없어서** 통과한다.
#
# 기원은 단일 사건이다 — `b793703` (2026-08-29, src 전면 TS 전환) 하나가 판정 명령
# 54건을 한꺼번에 무효화했고 그 뒤 190 커밋과 7 promote 가 감지 없이 지나갔다.
#
# ── (I3) 분류는 최소 세 갈래다 — 이것이 계약의 핵심이다 ────────────────────────
#   충족   rc=0  명제가 참
#   위반   rc=1  명제가 거짓 — **각 spec 소관이며 본 채널의 위반이 아니다**
#   무판정 rc=2  평가되지 않음 (unevaluable) — **본 채널이 겨누는 유일한 위반**
#
#   `rc≠0` 으로 뭉뚱그리면 무판정이 각 spec 의 진짜 위반과 섞여 판별 불가가 된다.
#   `rc≠1` 로 뭉뚱그리면 무판정이 통과로 읽힌다 — 지금 상태 그대로다.
#
# ── §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지) ────────────────────
#   기본 도출 명령 = find specs/30.spec/blue -name "*.md" -type f
#   (seam 미설정 시 아래 find 가 정확히 이 집합을 낸다.)
#   모집단 = `find <scan-root> -name "*.md"`. 파일 목록을 본문에 두지 않는다 —
#            신규 승격분이 모집단에 자동으로 들어와야 한다. 이 저장소는 하드코딩된
#            5개 스크립트 목록이 이후 추가된 6개를 스캔 밖에 숨긴 실측을 이미 갖고 있다.
#   도출이 **공집합이면 무판정 실패**한다 (population-empty). 빈 목록을 돌고 rc=0 을
#   내는 채널은 검출력이 0 이며, 그것이 정확히 본 채널이 겨누는 결함의 부류다.
#   주입 seam = $BLUE_JUDGEMENT_SCAN_ROOT (미설정 기본 = specs/30.spec/blue).
#
# ── (I6) 스팬 추출 — 백틱 런 길이를 맞춘다 ────────────────────────────────────
#   여는 백틱 런과 **같은 길이의 닫는 런**까지가 한 스팬이다. 닫히지 않은 스팬은
#   **실행하지 않고 위반으로 판정**한다 (empty-extraction).
#   `bash -c ""` 는 rc=0 이므로, 빈 추출을 실행해 버리면 **미실행이 통과로 읽힌다** —
#   채널 자신이 겨누는 결함과 같은 부류다. 그래서 추출 직후 비어 있지 않음을 단언한다.
#
# ── (I5) 산문 오탐 제외 (prose-excluded) ──────────────────────────────────────
#   **제외 규칙**: grep 계열 명령에서 플래그(`-`로 시작)를 걷어낸 뒤 **피연산자가 0개**인
#   스팬만 제외한다. 본문이 grep 플래그 표기를 *설명만* 하고 패턴·파일 인자가 없는
#   자리이며, grep 이 사용법 오류로 rc=2 를 내므로 결함이 아니라 오탐이다.
#   **근거 수치 (spec 흡수 시점 실측)**: 고유 10건 / 출현 31곳.
#   피연산자가 1개 이상이면 제외하지 않는다 — 파일 인자가 실재하지 않아 나는 rc=2 는
#   오탐이 아니라 **정확히 본 채널이 찾는 결함**이기 때문이다.
#
# ── (I7) 읽기 전용이고 반드시 끝난다 ──────────────────────────────────────────
#   (a) write-screened: 실행 **전에** 쓰기·삭제 연산(`>` 리다이렉트 · rm · mv · cp ·
#       `sed -i`)을 선별하고, 포함된 명령은 **실행하지 않고 별도로 보고**한다.
#       **`>/dev/null`·`2>&1` 은 쓰기가 아니다.** 이 구분을 놓친 1차 선별이 80건을
#       통째로 제외해 rc=2 를 65건으로 **과소 보고**했다. 선별 전에 그 형태를 걷어낸다.
#   (b) 각 명령을 stdin=/dev/null 과 유한 타임아웃 아래 실행한다. **인자 없는 grep 은
#       stdin 을 기다려 매달린다** — spec 흡수 측정이 실제로 겪었다.
#       이 플랫폼에는 `timeout`(GNU coreutils) 이 없다. `perl -e 'alarm'` 로 대신하며
#       alarm 타이머는 exec 를 건너 살아남는다 (POSIX). 타임아웃은 142(128+SIGALRM).
#
# ── 검출 경계 (과신 금지) ─────────────────────────────────────────────────────
#   * 본 채널은 명령이 **평가되는가**만 잰다. 평가된 뒤의 참/거짓은 각 spec 소관이다.
#   * 후보 선별은 명령 접두사로 하며 줄 문맥을 보지 않는다 — 판정 결과가 다른 줄에
#     적힌 명령을 놓치지 않기 위해서다. 그 대가로 산문 안의 명령 모양 표기도 후보가
#     되며, 그중 피연산자 없는 flag 언급만 (I5) 로 걸러진다.
#   * 펜스 코드 블록(``` 또는 ~~~) 안은 인라인 스팬 문법이 적용되지 않으므로 건너뛴다.
#   * `specs/30.spec/blue/**` 는 이 채널에게 **읽기 전용**이다. 채널은 그 아래를
#     수정하지 않는다.
#
# 종료 코드: 0 = 무판정 0건 / 1 = 무판정·빈추출·공집합 중 하나라도 있음.
# 현 HEAD 에서 rc=1 이 **정상이다** — blue 문면 정정은 별 단위이며 developer 영역이
# 아니다 (RULE-01 writer 매트릭스: 30.spec/blue 에 create/edit 권한을 가진 agent 없음).

set -u

SCAN_ROOT="${BLUE_JUDGEMENT_SCAN_ROOT:-specs/30.spec/blue}"
CMD_TIMEOUT="${BLUE_JUDGEMENT_TIMEOUT:-25}"

echo "check-blue-judgement-evaluable: scan-root=${SCAN_ROOT} timeout=${CMD_TIMEOUT}s"

if [ ! -d "$SCAN_ROOT" ]; then
	echo "population-empty: scan-root 이 디렉터리가 아니다 — ${SCAN_ROOT}"
	echo "RESULT: rc=1 (population-empty)"
	exit 1
fi

# ── 모집단 도출 (하드코딩 금지) ───────────────────────────────────────────────
POP_FILE="$(mktemp -t bjeval-pop)"
FIND_ROOT="$SCAN_ROOT"
find "$FIND_ROOT" -name "*.md" -type f | LC_ALL=C sort > "$POP_FILE"
POP_COUNT="$(wc -l < "$POP_FILE" | tr -d ' ')"

if [ "$POP_COUNT" -eq 0 ]; then
	echo "population-empty: ${SCAN_ROOT} 아래 *.md 가 0건 — 도출이 공집합이다."
	echo "  빈 목록을 돌고 rc=0 을 내는 채널은 검출력이 0 이므로 무판정 실패로 처리한다."
	rm -f "$POP_FILE" 2>/dev/null || true
	echo "RESULT: rc=1 (population-empty)"
	exit 1
fi

echo "population: ${POP_COUNT} files (도출 — find, 하드코딩 아님)"

# ── 스팬 추출 (백틱 런 길이 매칭) ─────────────────────────────────────────────
# 출력 레코드: <file>\t<line>\t<KIND>\t<span>
#   KIND = SPAN (정상 추출) | UNCLOSED (닫히지 않음 → empty-extraction)
SPAN_FILE="$(mktemp -t bjeval-span)"
perl -e '
	use strict; use warnings;
	while (my $path = shift @ARGV) {
		open(my $fh, "<", $path) or next;
		my $in_fence = 0;
		my $lineno = 0;
		while (my $line = <$fh>) {
			$lineno++;
			chomp $line;
			# 펜스 코드 블록은 인라인 스팬 문법이 적용되지 않는다.
			if ($line =~ /^\s*(```|~~~)/) { $in_fence = !$in_fence; next; }
			next if $in_fence;
			next unless $line =~ /`/;

			my $pos = 0;
			my $len = length($line);
			while ($pos < $len) {
				# 여는 백틱 런을 찾는다.
				my $open = index($line, "`", $pos);
				last if $open < 0;
				my $run = 0;
				$run++ while ($open + $run < $len) && substr($line, $open + $run, 1) eq "`";

				# 같은 길이의 닫는 런을 찾는다 (더 긴 런의 일부는 닫지 않는다).
				my $search = $open + $run;
				my $found = -1;
				while ($search < $len) {
					my $c = index($line, "`", $search);
					last if $c < 0;
					my $r = 0;
					$r++ while ($c + $r < $len) && substr($line, $c + $r, 1) eq "`";
					if ($r == $run) { $found = $c; last; }
					$search = $c + $r;
				}

				if ($found < 0) {
					# 닫는 런이 없다. CommonMark 에서 이 백틱 런은 **리터럴 글자**이며
					# 스팬을 열지 않는다 — 그러므로 같은 줄의 뒤쪽 스팬은 계속 산다.
					# 여기서 줄을 버리면(구 구현) 뒤 스팬을 통째로 잃어 **과소 보고**가 된다.
					#
					# 다만 닫히지 않은 런 뒤가 **명령처럼 생겼으면** 그것이 (I6) 이 겨누는
					# 자리다 — 판정 명령으로 적었으나 스팬이 닫히지 않아 어떤 추출기도
					# 집어내지 못하고, 따라서 영영 평가되지 않는다. 산문 표(`` 가 짝 없이
					# 섞인 표 행 등)는 명령처럼 생기지 않았으므로 여기서 걸러진다.
					my $rest = substr($line, $open + $run);
					if ($rest =~ /^(?:! )?(?:grep|perl|test|bash -c|npx|node|find) /) {
						my $r = $rest; $r =~ s/\t/ /g;
						print join("\t", $path, $lineno, "UNCLOSED", $r), "\n";
					}
					$pos = $open + $run;
					next;
				}

				my $content = substr($line, $open + $run, $found - ($open + $run));
				$content =~ s/\t/ /g;
				print join("\t", $path, $lineno, "SPAN", $content), "\n";
				$pos = $found + $run;
			}
		}
		close($fh);
	}
' $(cat "$POP_FILE") > "$SPAN_FILE" 2>/dev/null

# ── 분류 ──────────────────────────────────────────────────────────────────────
n_candidate=0
n_ok=0            # rc=0  충족
n_false=0         # rc=1  위반 (각 spec 소관 — 본 채널의 위반이 아니다)
n_unevaluable=0   # rc=2  무판정 — 본 채널의 위반
n_timeout=0
n_other=0
n_prose=0         # prose-excluded
n_write=0         # write-screened
n_unclosed=0      # empty-extraction
n_empty=0         # empty-extraction (빈 추출)

UNEVAL_FILE="$(mktemp -t bjeval-uneval)"
WRITE_FILE="$(mktemp -t bjeval-write)"
UNCLOSED_FILE="$(mktemp -t bjeval-unclosed)"
: > "$UNEVAL_FILE"; : > "$WRITE_FILE"; : > "$UNCLOSED_FILE"

while IFS="$(printf '\t')" read -r f ln kind span; do

	if [ "$kind" = "UNCLOSED" ]; then
		# (I6) 닫히지 않은 스팬 — 추출 결과를 실행하지 않는다.
		n_unclosed=$((n_unclosed + 1))
		printf '%s:%s\tempty-extraction (unclosed span)\t%s\n' "$f" "$ln" "$span" >> "$UNCLOSED_FILE"
		continue
	fi

	# 후보 선별 — 명령 접두사. 줄 문맥을 보지 않는다.
	case "$span" in
		"grep "*|"! grep "*|"perl "*|"test "*|"bash -c "*|"npx "*|"node "*|"find "*) ;;
		*) continue ;;
	esac

	n_candidate=$((n_candidate + 1))

	# (I6) 빈 추출은 실행하지 않는다 — `bash -c ""` 는 rc=0 이다.
	trimmed="$(printf '%s' "$span" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
	if [ -z "$trimmed" ]; then
		n_empty=$((n_empty + 1))
		printf '%s:%s\tempty-extraction (blank span)\n' "$f" "$ln" >> "$UNCLOSED_FILE"
		continue
	fi

	# (I5) 산문 오탐 제외 — grep 계열에서 피연산자 0개인 flag 언급.
	probe="$(printf '%s' "$trimmed" | sed 's/^![[:space:]]*//')"
	case "$probe" in
		"grep "*)
			operands=0
			# shellcheck disable=SC2086
			set -- $probe
			shift  # grep
			while [ "$#" -gt 0 ]; do
				case "$1" in
					-*) ;;
					*) operands=$((operands + 1)) ;;
				esac
				shift
			done
			if [ "$operands" -eq 0 ]; then
				n_prose=$((n_prose + 1))
				continue
			fi
			;;
	esac

	# (I7)(a) 쓰기·삭제 선별.
	#   1) `>/dev/null` · `2>&1` 은 쓰기가 아니므로 먼저 걷는다. 이 구분을 놓친 1차
	#      선별이 80건을 통째로 제외해 rc=2 를 65건으로 과소 보고한 실측이 있다.
	#   2) **따옴표 안은 리다이렉트가 아니다.** 걷지 않으면 grep 패턴 안의 `=>` ·
	#      `->` · `<Generic>` 이 전부 쓰기로 오분류돼 같은 부류의 과소 보고가 난다
	#      (실측: 이 단계를 넣기 전 write-screened 가 60건이었다).
	screen="$(printf '%s' "$trimmed" \
		| sed 's|2>&1||g; s|2>/dev/null||g; s|>/dev/null||g; s|> */dev/null||g' \
		| sed "s/'[^']*'/QQ/g; s/\"[^\"]*\"/QQ/g")"
	case "$screen" in
		*">"*|*"rm "*|*"mv "*|*"cp "*|*"sed -i"*)
			n_write=$((n_write + 1))
			printf '%s:%s\twrite-screened (미실행)\t%s\n' "$f" "$ln" "$trimmed" >> "$WRITE_FILE"
			continue
			;;
	esac

	# (I7)(b) stdin=/dev/null + 유한 타임아웃. alarm 은 exec 를 건너 살아남는다.
	# perl 이 fork 한 자식을 alarm 으로 거두고 **자기 종료 코드로** 되돌린다.
	# `alarm; exec` 형태(더 짧다)는 perl 자신이 SIGALRM 으로 죽으므로 호출한 셸이
	# "Alarm clock" 작업 보고를 stdout/stderr 에 낸다 — 서브셸 리다이렉트로도 막히지
	# 않는다(보고 주체가 자식이 아니라 셸이다). 타임아웃은 142(128+SIGALRM) 로 옮긴다.
	rc=0
	perl -e '
		my $t = shift @ARGV;
		my $pid = fork();
		defined $pid or exit 127;
		if ($pid == 0) { exec @ARGV; exit 127; }
		my $rc = 142;
		eval {
			local $SIG{ALRM} = sub { die "timeout\n" };
			alarm $t;
			waitpid($pid, 0);
			alarm 0;
			$rc = ($? & 127) ? 128 + ($? & 127) : ($? >> 8);
		};
		if ($@) { kill "KILL", $pid; waitpid($pid, 0); $rc = 142; }
		exit $rc;
	' "$CMD_TIMEOUT" bash -c "$trimmed" >/dev/null 2>&1 </dev/null || rc=$?

	# (I3) 최소 세 갈래 분류.
	case "$rc" in
		0) n_ok=$((n_ok + 1)) ;;
		1) n_false=$((n_false + 1)) ;;
		2)
			n_unevaluable=$((n_unevaluable + 1))
			printf '%s:%s\tunevaluable (rc=2)\t%s\n' "$f" "$ln" "$trimmed" >> "$UNEVAL_FILE"
			;;
		142) n_timeout=$((n_timeout + 1)) ;;
		*) n_other=$((n_other + 1)) ;;
	esac

done < "$SPAN_FILE"

# ── 보고 ──────────────────────────────────────────────────────────────────────
uneval_files=0
if [ -s "$UNEVAL_FILE" ]; then
	uneval_files="$(cut -d: -f1 < "$UNEVAL_FILE" | LC_ALL=C sort -u | wc -l | tr -d ' ')"
fi
uneval_unique=0
if [ -s "$UNEVAL_FILE" ]; then
	uneval_unique="$(cut -f3 < "$UNEVAL_FILE" | LC_ALL=C sort -u | wc -l | tr -d ' ')"
fi

echo "candidates: ${n_candidate}"
echo "  ok(rc=0)=${n_ok}  false(rc=1)=${n_false}  unevaluable(rc=2)=${n_unevaluable}"
echo "  timeout=${n_timeout}  other=${n_other}"
echo "  prose-excluded=${n_prose}  write-screened=${n_write}  empty-extraction=$((n_unclosed + n_empty))"
echo "unevaluable: unique=${uneval_unique} occurrences=${n_unevaluable} files=${uneval_files}"

if [ -s "$UNCLOSED_FILE" ]; then
	echo ""
	echo "── empty-extraction (실행하지 않음) ──"
	cat "$UNCLOSED_FILE"
fi

if [ -s "$WRITE_FILE" ]; then
	echo ""
	echo "── write-screened (실행하지 않음) ──"
	cat "$WRITE_FILE"
fi

if [ -s "$UNEVAL_FILE" ]; then
	echo ""
	echo "── unevaluable (rc=2 — 평가되지 않음) ──"
	LC_ALL=C sort "$UNEVAL_FILE"
fi

violations=$((n_unevaluable + n_unclosed + n_empty))

rm -f "$POP_FILE" "$SPAN_FILE" "$UNEVAL_FILE" "$WRITE_FILE" "$UNCLOSED_FILE" 2>/dev/null || true

echo ""
if [ "$violations" -gt 0 ]; then
	echo "RESULT: rc=1 (unevaluable=${n_unevaluable} empty-extraction=$((n_unclosed + n_empty)))"
	exit 1
fi

echo "RESULT: rc=0 (판정 명령 전건이 평가 가능하다)"
exit 0
