#!/usr/bin/env bash
# check-spec-judgement-classification.sh
# Spec: foundation/gate-effective-surface-and-variant-battery §동작 (I3)(I4)(I6)(I8)
# Task: TSK-20260901-08
#
# 세 판정 항의 분류 측정을 **발화 채널**로 뽑아낸다.
#
# 이 세 측정은 지금까지 spec 본문 안의 900자짜리 인라인 perl 한 줄로만 존재했다.
# 자동 발화 채널이 없으면 **누가 언제 재는지가 정해져 있지 않고**, 그 결과 수치가
# tick 마다 손으로 재측정된다. 손 재측정은 모집단이 바뀔 때 조용히 어긋난다 —
# 실제로 승격 한 번에 judgement-items 가 135 → 91 → 60 으로 움직였고,
# 그때마다 앞 tick 의 값은 같은 것을 세지 않게 됐다.
#
# ── §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지) ────────────────────
#   기본 도출 명령 = find specs/30.spec/green -name "*.md" -type f
#   주입 seam = $SPEC_CLASSIFICATION_SCAN_ROOT (미설정 기본 = specs/30.spec/green).
#   파일 목록을 본문에 두지 않는다 — 신설·승격분이 모집단에 자동으로 들어와야 한다.
#   도출이 **공집합이면 exit 2** (무판정 실패). 빈 목록을 돌고 rc=0 을 내는 채널은
#   검출력이 0 이며, 그것이 정확히 이 채널이 겨누는 결함의 부류다.
#
# ── 판정 구획 한정 ───────────────────────────────────────────────────────────
#   `## 테스트 현황` · `## 수용 기준` 두 절의 `- [ ]` / `- [x]` 줄만 본다.
#   계수는 그 줄의 **인라인 백틱 span 에서 뽑은 명령 문자열**에 대해서만 한다.
#   산문 언급은 세지 않는다.
#
#   **텍스트 grep 게이트는 자기 문서화로 충족된다** — 이 저장소에서 실측된 부류다.
#   스크립트 머리말 주석에 게이트가 찾는 글자가 있어 항진명제가 됐고 주입해도
#   초록이었다. 판정 대상 줄에서 주석·산문을 걷어내는 것이 이 스크립트의 전제다.
#
# ── 자기참조 차단 ────────────────────────────────────────────────────────────
#   명령 문자열에 `static-undeclared` · `name-exec-mismatch` · `block-window-items`
#   가 들어 있는 span 은 **세 측정 모두에서** 모집단에서 뺀다. 이 스크립트 자신의
#   텍스트나 그것을 인용한 판정 항이 모집단에 들면 계수가 자기 자신을 센다.
#
# ── exit code ────────────────────────────────────────────────────────────────
#   2  도출 공집합 (무판정 실패)
#   1  세 산출(static-undeclared · name-exec-mismatch · unconfirmed) 중 하나라도 != 0
#   0  세 산출 전부 0
#
#   **현 green 모집단에서 rc=1 인 것이 정상이다.** static-undeclared 와 unconfirmed
#   는 결함 수가 아니라 **미분류·미확인 수**이며 그 정상화는 inspector 소관이다.
#   이 채널의 임무는 그 수치를 **매 실행마다 같은 방법으로** 내는 것이다.
#   그래서 .husky/* 와 ci.yml 에는 등재하지 않는다 — check:blue-judgement ·
#   check:summary-drift 와 같은 위상이다.

set -u

SCAN_ROOT="${SPEC_CLASSIFICATION_SCAN_ROOT:-specs/30.spec/green}"

echo "check-spec-judgement-classification: scan-root=${SCAN_ROOT}"

if [ ! -d "$SCAN_ROOT" ]; then
	echo "population-empty: scan-root 이 디렉터리가 아니다 — ${SCAN_ROOT}"
	echo "RESULT: rc=2 (population-empty)"
	exit 2
fi

POP_FILE="$(mktemp -t specclass-pop)"
trap 'rm -f "$POP_FILE" 2>/dev/null || true' EXIT
find "$SCAN_ROOT" -name "*.md" -type f | LC_ALL=C sort > "$POP_FILE"
POP_COUNT="$(wc -l < "$POP_FILE" | tr -d ' ')"

if [ "$POP_COUNT" -eq 0 ]; then
	echo "population-empty: ${SCAN_ROOT} 아래 *.md 가 0건 — 도출이 공집합이다."
	echo "  빈 목록을 돌고 rc=0 을 내는 채널은 검출력이 0 이므로 무판정 실패로 처리한다."
	echo "RESULT: rc=2 (population-empty)"
	exit 2
fi

echo "population: ${POP_COUNT} files (도출 — find, 하드코딩 아님)"

# ── (I3·I4) 분류 전수 ─────────────────────────────────────────────────────────
R34="$(perl -ne '
	BEGIN{$B=chr(96)}
	if(/^## (테스트 현황|수용 기준)\s*$/){$k=1;next}
	if(/^## /){$k=0;next}
	if($k && /^- \[[ x]\]/){
		my $line=$_;
		my $cmd=q();
		while(/$B([^$B]+)$B/g){
			my $c=$1;
			if($c=~/^(bash -c|npx|node|perl|grep|test )/){ $cmd=$c; last }
		}
		if(length $cmd){
			unless($cmd=~/static-undeclared|name-exec-mismatch|block-window-items/){
				my $exec = ($cmd=~/npx vitest|npm run|npx tsc|npx eslint|node |eval /) ? 1 : 0;
				my $dec = ($line=~/정적 불변식/) ? 1 : 0;
				print(($exec? q(E) : ($dec? q(S) : q(X))), qq(\n));
			}
		}
	}
	if(eof){$k=0; close ARGV}
' $(cat "$POP_FILE"))"

TOT34="$(printf '%s\n' "$R34" | grep -c '.' || true)"
E34="$(printf '%s\n' "$R34" | grep -c '^E' || true)"
S34="$(printf '%s\n' "$R34" | grep -c '^S' || true)"
X34="$(printf '%s\n' "$R34" | grep -c '^X' || true)"

echo "judgement-items=${TOT34} exec=${E34} static-declared=${S34} static-undeclared=${X34}"

# ── (I6) 이름-실행 정합 ───────────────────────────────────────────────────────
R6="$(perl -ne '
	BEGIN{$B=chr(96);$T=0;$D=0}
	if(/^## (테스트 현황|수용 기준)\s*$/){$k=1;next}
	if(/^## /){$k=0;next}
	if($k && /^- \[[ x]\]/){
		while(/$B([^$B]+)$B/g){
			my $c=$1;
			next if $c=~/static-undeclared|name-exec-mismatch|block-window-items/;
			next unless $c=~/npx vitest run/;
			next unless $c=~/grep/;
			$T++;
			if($c=~/"\$\@"/){ $D++; next }
			my %p=map{($_,1)} ($c=~m{(src/[A-Za-z0-9_./-]+\.(?:test|spec)\.[a-z]+)}g);
			for my $n ($c=~/"([^"]*)"/g){
				next if $n=~m{^src/};
				next unless $n=~/[\x80-\xFF]/;
				my @h=split /\n/, qx{grep -rl -- "$n" src 2>/dev/null};
				next unless @h;
				my $ok=0;
				for my $x (@h){ $ok=1 if $p{$x} }
				print qq(M $ARGV:$.\n) unless $ok;
			}
		}
	}
	if(eof){$k=0; close ARGV}
	END{print qq(T $T D $D\n)}
' $(cat "$POP_FILE"))"

T6="$(printf '%s\n' "$R6" | sed -n 's/^T \([0-9]*\) D .*/\1/p')"
D6="$(printf '%s\n' "$R6" | sed -n 's/^T [0-9]* D //p')"
M6="$(printf '%s\n' "$R6" | grep -c '^M ' || true)"

echo "name-exec-items=${T6} derived=${D6} name-exec-mismatch=${M6}"

# ── (I8) 실행 창 분류 전수 ────────────────────────────────────────────────────
R8="$(perl -ne '
	BEGIN{$B=chr(96)}
	if(/^## (테스트 현황|수용 기준)\s*$/){$k=1;next}
	if(/^## /){$k=0;next}
	if($k && /^- \[[ x]\]/){
		my $line=$_;
		while(/$B([^$B]+)$B/g){
			my $c=$1;
			next if $c=~/static-undeclared|name-exec-mismatch|block-window-items/;
			next unless $c=~/npx vitest run/;
			next unless $c=~/ -t /;
			print(($line=~/실행 창 확인/) ? qq(C\n) : qq(U\n));
			last;
		}
	}
	if(eof){$k=0; close ARGV}
' $(cat "$POP_FILE"))"

TOT8="$(printf '%s\n' "$R8" | grep -c '.' || true)"
U8="$(printf '%s\n' "$R8" | grep -c '^U' || true)"

echo "block-window-items=${TOT8} unconfirmed=${U8}"

# ── 판정 ──────────────────────────────────────────────────────────────────────
if [ "$X34" -ne 0 ] || [ "$M6" -ne 0 ] || [ "$U8" -ne 0 ]; then
	echo "RESULT: rc=1 (미분류·불일치·미확인이 남아 있다 — 정상화는 각 spec 소관)"
	exit 1
fi

echo "RESULT: rc=0"
exit 0
