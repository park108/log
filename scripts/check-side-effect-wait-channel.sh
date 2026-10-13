#!/usr/bin/env bash
# check-side-effect-wait-channel.sh
# Spec: testing/side-effect-channel-assertion-arrival-wait §동작 (I1)(I2)(I3)(I4)(I5)(I6)
# Task: TSK-20261013-09
#
# `await waitFor(...)` 로 렌더/DOM 을 기다린 뒤 **다른 채널**(sessionStorage · localStorage ·
# document.title)을 바로 단언하면, 그 채널을 쓰는 것이 별도 effect 일 때 로컬은 초록이고
# CI 부하에서만 붉다. 렌더를 기다리는 것은 그 effect 를 기다리는 것이 아니다.
# 실물 표본: `git show 06425e7^:src/Log/LogList.test.tsx` (:336 · :394).
#
# 판정 단위 = **자리(site)**: `await waitFor(` 문 하나와 그 문 바로 뒤의 `expect(` 단언 한 쌍.
#   - 대기 본문은 여는 괄호에서 **괄호 균형(paren balance)** 으로 닫는 괄호까지 읽는다.
#     한 줄 정규식은 여러 줄 `waitFor` 를 통째로 놓친다 (spec (I5)).
#   - 균형 계수는 주석·문자열·정규식 리터럴을 공백으로 가린 사본(mask) 위에서 한다.
#     그래야 `getByText('(')` 같은 문자열 속 괄호가 경계를 어긋내지 않고,
#     대기 본문의 주석에 적힌 채널 이름이 SAME-CHANNEL 을 만들지 않는다.
#   - 단언 채널이 비-DOM 이면 자리로 센다. 저장 채널(storage)과 spy 채널 둘이다.
#   - 대기 본문이 단언과 **같은 채널**을 이미 기다렸으면 SAME-CHANNEL — 위반이 아니다 (I2).
#   - 채널 일치는 **낱말 경계(`\b`)** 로 판정한다 (I5). 부분 문자열 일치는 실측 오분류를
#     냈다 — spy 식별자 `get` 이 대기 본문의 `getByTestId` 에 붙어 불일치가 SAME 으로 뒤집혔다.
#   - 판정값은 `storage-mismatch` 하나다. spy 불일치는 출력만 하고 위반으로 세지 않는다
#     (I3 — 인과 함의라 정적 판정 대상이 아니다. 판정 방법은 지연 주입이다).
#
# 출력 (이름 있는 수치 줄 — spec 판정 명령이 이 이름을 grep 한다):
#   src-test-files=<N>        도출 모집단 파일 수. vitest 보고 수(`Test Files`)가 아니다 —
#                             루트 `vite.config.test.js` 만큼 다르다 (I4).
#   storage-assert-files=<N>  저장 채널을 `expect(` 하는 파일 수 (주석 밖 출현만)
#   sites=<N>                 대기-후-비-DOM-단언 자리 수
#   same-channel=<N>          그중 SAME-CHANNEL
#   storage-sites=<N> · storage-mismatch=<N> · spy-sites=<N> · spy-mismatch=<N>
#   site <file>:<line> <class> channel=<채널>   자리별 분류 (line = 단언 줄)
#
# 주입 seam: SIDE_EFFECT_SCAN_ROOT (기본 `src`). 판정 방식은 seam 과 무관하게 같다.
#
# 종료 코드:
#   0  storage-mismatch=0
#   1  storage-mismatch>=1 (위반)
#   2  무판정 — 스캔 루트 부재 · 모집단 0 · storage-assert-files=0 · 균형이 닫히지 않는
#      `waitFor`/`expect` (경계 추출 실패) · 자가 확인 실패. "위반 없음" 과 "잴 것이 없다" 를
#      합치지 않는다 (I4)(I6) — 도출이 비면 통과가 아니라 실패다.
#
# 자가 확인: 실판정과 **같은 분류 함수**에 내장 표본을 통과시켜 기대 분류가 나오는지 매 실행
# 확인한다 (여러 줄 대기 · 같은 채널 · 낱말 경계 · 주석 속 채널 이름 · 문자열 속 괄호).
# 분류기가 조용히 무감해지면 여기서 exit 2 로 드러난다.
#
# 검출 경계 (과신 금지):
#   - 자리는 `await waitFor(` 문 **바로 다음 문**이 `expect(` 일 때만 성립한다. 그 뒤로 이어지는
#     둘째·셋째 동기 단언은 보지 않는다. `vi.waitFor` · `findBy*` · `flushAfterResponse()` 같은
#     다른 대기 형태 뒤의 단언도 보지 않는다 (표본 :343 · :380 이 그 형태다).
#   - 채널 일치는 채널 수준이다 (`sessionStorage` 의 키는 구별하지 않는다).
#   - 정규식 리터럴 판별은 직전 유효 문자 휴리스틱이다. 나눗셈과 오인되는 표기는 마스크가
#     어긋날 수 있다 — 그때 균형이 깨지면 exit 2 로 드러난다.
#
# read-only: 워킹트리를 바꾸지 않는다. BSD/macOS 기본 perl 로 돈다 (GNU 도구 불요).

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || exit 2

SCAN_ROOT="${SIDE_EFFECT_SCAN_ROOT:-src}"

if [ ! -d "$SCAN_ROOT" ]; then
	echo "src-test-files=0"
	echo "storage-assert-files=0"
	echo "verdict: NO-JUDGEMENT (scan root missing: $SCAN_ROOT)"
	exit 2
fi

files=()
while IFS= read -r -d '' f; do
	files+=("$f")
done < <(find "$SCAN_ROOT" \( -name "*.test.ts" -o -name "*.test.tsx" \) -type f -print0 | LC_ALL=C sort -z)

if [ "${#files[@]}" -eq 0 ]; then
	echo "src-test-files=0"
	echo "storage-assert-files=0"
	echo "verdict: NO-JUDGEMENT (empty population under $SCAN_ROOT)"
	exit 2
fi

perl -w - "${files[@]}" <<'PERL'
use strict;

# 주석·문자열·정규식 리터럴의 내용을 공백으로 가린다. 길이와 줄바꿈은 보존한다
# (오프셋 → 줄 번호 환산이 원본과 같아야 한다). 따옴표 자체는 남긴다.
sub mask {
	my ($s) = @_;
	my @c = split //, $s;
	my $n = scalar @c;
	my $out = '';
	my $state = 'code';
	my $prev = '';    # 직전 유효(공백 아님) 코드 문자 — 정규식 리터럴 판별용
	my $in_class = 0;
	for (my $i = 0; $i < $n; $i++) {
		my $ch = $c[$i];
		my $nx = $i + 1 < $n ? $c[$i + 1] : '';
		my $blank = $ch eq "\n" ? "\n" : ' ';
		if ($state eq 'code') {
			if ($ch eq '/' && $nx eq '/') { $state = 'line'; $out .= '  '; $i++; next; }
			if ($ch eq '/' && $nx eq '*') { $state = 'block'; $out .= '  '; $i++; next; }
			if ($ch eq "'") { $state = 'sq'; $out .= $ch; next; }
			if ($ch eq '"') { $state = 'dq'; $out .= $ch; next; }
			if ($ch eq '`') { $state = 'tpl'; $out .= $ch; next; }
			if ($ch eq '/' && ($prev eq '' || $prev =~ /[(,=:\[!&|?{};]/)) {
				$state = 're'; $in_class = 0; $out .= $ch; next;
			}
			$out .= $ch;
			$prev = $ch if $ch !~ /\s/;
			next;
		}
		if ($state eq 'line') {
			if ($ch eq "\n") { $state = 'code'; $out .= "\n"; } else { $out .= ' '; }
			next;
		}
		if ($state eq 'block') {
			if ($ch eq '*' && $nx eq '/') { $state = 'code'; $out .= '  '; $i++; next; }
			$out .= $blank;
			next;
		}
		# sq · dq · tpl · re — 이스케이프는 다음 문자까지 함께 가린다
		if ($ch eq '\\') {
			$out .= ' ';
			if ($i + 1 < $n) { $out .= ($c[$i + 1] eq "\n" ? "\n" : ' '); $i++; }
			next;
		}
		if ($state eq 're') {
			if ($ch eq '[') { $in_class = 1; }
			elsif ($ch eq ']') { $in_class = 0; }
			elsif ($ch eq '/' && !$in_class) { $state = 'code'; $prev = '/'; $out .= $ch; next; }
			elsif ($ch eq "\n") { $state = 'code'; $out .= "\n"; next; }
			$out .= ' ';
			next;
		}
		my $q = $state eq 'sq' ? "'" : $state eq 'dq' ? '"' : '`';
		if ($ch eq $q) { $state = 'code'; $prev = $q; $out .= $ch; next; }
		$out .= $blank;
	}
	return $out;
}

# 여는 괄호 위치에서 짝이 맞는 닫는 괄호 위치를 괄호 균형으로 찾는다. 못 찾으면 undef.
sub balance_close {
	my ($m, $open) = @_;
	my $depth = 0;
	my $len = length $m;
	for (my $i = $open; $i < $len; $i++) {
		my $ch = substr($m, $i, 1);
		if ($ch eq '(') { $depth++; }
		elsif ($ch eq ')') { $depth--; return $i if $depth == 0; }
	}
	return undef;
}

sub word_re {
	my ($id) = @_;
	my $re = join '\s*\.\s*', map { quotemeta } split /\s*\.\s*/, $id;
	return qr/\b$re\b/;
}

# 단언 인자의 채널. 저장 채널이 우선이고, 그다음 spy. 둘 다 아니면 DOM/기타 (undef).
sub channel_of {
	my ($arg, $matcher) = @_;
	return ('storage', $1) if $arg =~ /\b(sessionStorage|localStorage)\b/;
	return ('storage', 'document.title') if $arg =~ /\bdocument\s*\.\s*title\b/;
	my $is_spy = ($arg =~ /\.\s*mock\b/)
		|| (defined $matcher && $matcher =~ /^(?:toHaveBeenCalled\w*|toBeCalled\w*|toHaveBeenLastCalledWith|lastCalledWith|toHaveBeenNthCalledWith|nthCalledWith|toHaveReturned\w*|toReturn\w*|toHaveLastReturnedWith|toHaveNthReturnedWith)$/);
	return () unless $is_spy;
	(my $id = $arg) =~ s/^\s+|\s+$//g;
	$id =~ s/\s*\.\s*mock\b.*\z//s;
	# vi.mocked(x) · jest.mocked(x) 는 감싼 대상을 채널로 본다
	$id = $1 while $id =~ /^(?:vi|jest)\s*\.\s*mocked\s*\(\s*(.*?)\s*\)\s*\z/s;
	return ('spy', $id);
}

# 가려진 사본 하나를 분류한다. 자리 목록과 균형 실패 수를 돌려준다.
sub classify {
	my ($m) = @_;
	my @sites;
	my $unbalanced = 0;
	while ($m =~ /\bawait\s+waitFor\s*\(/g) {
		my $resume = pos($m);
		my $open = $resume - 1;
		my $close = balance_close($m, $open);
		if (!defined $close) { $unbalanced++; pos($m) = $resume; next; }
		my $body = substr($m, $open + 1, $close - $open - 1);
		my $after = substr($m, $close + 1);
		if ($after =~ /\A\s*;?\s*expect\s*\(/) {
			my $eopen = $close + 1 + $+[0] - 1;
			my $eclose = balance_close($m, $eopen);
			if (!defined $eclose) { $unbalanced++; pos($m) = $resume; next; }
			my $arg = substr($m, $eopen + 1, $eclose - $eopen - 1);
			my $tail = substr($m, $eclose + 1, 200);
			my ($matcher) = $tail =~ /\A\s*(?:\.\s*(?:not|resolves|rejects)\s*)*\.\s*(\w+)/;
			my ($kind, $chan) = channel_of($arg, $matcher);
			if (defined $kind) {
				my $line = 1 + (substr($m, 0, $eopen) =~ tr/\n//);
				my $same = $body =~ word_re($chan) ? 1 : 0;
				my $cls = $same ? 'SAME-CHANNEL' : ($kind eq 'storage' ? 'STORAGE-MISMATCH' : 'SPY-MISMATCH');
				push @sites, { kind => $kind, chan => $chan, line => $line, cls => $cls };
			}
		}
		pos($m) = $resume;
	}
	return (\@sites, $unbalanced);
}

sub storage_asserts {
	my ($m) = @_;
	return $m =~ /expect\(\s*(?:sessionStorage|localStorage|document\.title)/ ? 1 : 0;
}

# ── 자가 확인 — 실판정과 같은 mask·classify 를 통과시킨다 ──
my @self = (
	[ 'multi-line wait, storage assert', 'STORAGE-MISMATCH',
	  "await waitFor(() => {\n\texpect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);\n});\n\nexpect(sessionStorage.getItem('k')).not.toBeNull();\n" ],
	[ 'same channel', 'SAME-CHANNEL',
	  "await waitFor(() => expect(document.title).toContain('x'));\nexpect(document.title).toBe('xy');\n" ],
	[ 'word boundary get/getByTestId', 'SPY-MISMATCH',
	  "await waitFor(() => expect(screen.getByTestId('t')).toHaveTextContent('1'));\nexpect(get.mock.calls.length).toBe(1);\n" ],
	[ 'channel name in comment', 'STORAGE-MISMATCH',
	  "await waitFor(() => expect(screen.getByText('a')).toBeTruthy() /* localStorage */);\n// localStorage\nexpect(localStorage.getItem('k')).toBe('v');\n" ],
	[ 'paren in string', 'STORAGE-MISMATCH',
	  "await waitFor(() => expect(screen.getByText(')')).toBeTruthy());\nexpect(sessionStorage.getItem('k')).toBe('v');\n" ],
);
my $self_fail = 0;
for my $t (@self) {
	my ($name, $want, $src) = @$t;
	my ($s, $u) = classify(mask($src));
	my $got = (@$s == 1 && $u == 0) ? $s->[0]{cls} : sprintf('sites=%d unbalanced=%d', scalar @$s, $u);
	if ($got ne $want) { print "self-check FAIL [$name] want=$want got=$got\n"; $self_fail++; }
}

# ── 실판정 ──
my %n = map { $_ => 0 } qw(files storage_files sites same storage_sites storage_mismatch spy_sites spy_mismatch unbalanced unreadable);
my @lines;
for my $f (@ARGV) {
	my $fh;
	if (!open($fh, '<', $f)) { $n{unreadable}++; next; }
	my $raw = do { local $/; <$fh> };
	close $fh;
	$n{files}++;
	my $m = mask($raw);
	$n{storage_files} += storage_asserts($m);
	my ($sites, $u) = classify($m);
	$n{unbalanced} += $u;
	push @lines, "unbalanced $f count=$u" if $u;
	for my $s (@$sites) {
		$n{sites}++;
		$n{same}++ if $s->{cls} eq 'SAME-CHANNEL';
		if ($s->{kind} eq 'storage') {
			$n{storage_sites}++;
			$n{storage_mismatch}++ if $s->{cls} ne 'SAME-CHANNEL';
		} else {
			$n{spy_sites}++;
			$n{spy_mismatch}++ if $s->{cls} ne 'SAME-CHANNEL';
		}
		push @lines, "site $f:$s->{line} $s->{cls} channel=$s->{chan}";
	}
}

print "$_\n" for @lines;
print "src-test-files=$n{files}\n";
print "storage-assert-files=$n{storage_files}\n";
print "sites=$n{sites}\n";
print "same-channel=$n{same}\n";
print "storage-sites=$n{storage_sites}\n";
print "storage-mismatch=$n{storage_mismatch}\n";
print "spy-sites=$n{spy_sites}\n";
print "spy-mismatch=$n{spy_mismatch}\n";
print "unbalanced=$n{unbalanced}\n";
print "self-check=" . (scalar(@self) - $self_fail) . "/" . scalar(@self) . "\n";

my @why;
push @why, "self-check failed" if $self_fail;
push @why, "unreadable files=$n{unreadable}" if $n{unreadable};
push @why, "empty population" if $n{files} == 0;
push @why, "storage-assert-files=0" if $n{storage_files} == 0;
push @why, "unbalanced=$n{unbalanced}" if $n{unbalanced};
if (@why) { print "verdict: NO-JUDGEMENT (" . join('; ', @why) . ")\n"; exit 2; }
if ($n{storage_mismatch}) { print "verdict: FAIL (storage channel asserted without waiting on it)\n"; exit 1; }
print "verdict: PASS\n";
exit 0;
PERL
rc=$?
case "$rc" in
	0|1|2) exit "$rc" ;;
	*) echo "verdict: NO-JUDGEMENT (judge exited rc=$rc)"; exit 2 ;;
esac
