#!/usr/bin/env bash
# 순서 독립성 판정 — covered branch 슬롯 **집합** 비교 (TSK-20260829-07).
#
# `total.branches.covered` 스칼라는 집합의 성긴 대리물이라 순서와 무관한
# 슬롯 교체를 흡수한다. 여기서는 coverage-final.json 의 b(hit 배열) +
# branchMap 을 읽어 covered 슬롯을 `line:branchId.index` 로 열거하고,
# base 와 두 seed 의 집합이 동일한지 비교한다.
#
# 갈리면 rc=1 과 함께 **어느 슬롯이** 갈렸는지 이름으로 지목한다 —
# 개수 비교가 줄 수 없는 진단이다.
#
# 검증 (2026-08-29):
#   injection 1/1 — userAgent 복원 훅 1건 제거 → rc=1, `349:70.1` 지목
#   control   1/1 — 정상 복원을 갖춘 UA 케이스 추가 → rc=0
#   결정성    5/5 — base·seed1·seed2 전부 137, 15 측정 동일
set -uo pipefail
D=$(mktemp -d)
slots() {  # $1=label, rest=flags → covered 슬롯 집합을 파일로
  local L=$1; shift
  npx vitest run src/common/common.test.ts --coverage --coverage.reporter=json \
    --coverage.reportsDirectory="$D/$L" --coverage.include='src/common/common.ts' \
    --coverage.thresholds.branches=0 --coverage.thresholds.lines=0 \
    --coverage.thresholds.functions=0 --coverage.thresholds.statements=0 \
    "$@" >/dev/null 2>&1
  node -e "
    const p='$D/$L/coverage-final.json';
    const fs=require('fs');
    if(!fs.existsSync(p)){ console.error('[EXTRACT-FAIL] no coverage output'); process.exit(2); }
    const j=require(p);
    const k=Object.keys(j).find(x=>x.endsWith('common.ts'));
    if(!k){ console.error('[EXTRACT-FAIL] target file absent'); process.exit(2); }
    const f=j[k], out=[];
    for(const [id,arr] of Object.entries(f.b))
      arr.forEach((hit,i)=>{ if(hit>0) out.push(f.branchMap[id].loc.start.line+':'+id+'.'+i); });
    if(out.length===0){ console.error('[EXTRACT-FAIL] empty slot set'); process.exit(2); }
    console.log(out.sort().join('\n'));
  " > "$D/$L.txt" || exit 2
  echo "$D/$L.txt"
}
B=$(slots base) || exit 2
S1=$(slots s1 --sequence.shuffle.tests --sequence.seed=20260824) || exit 2
S2=$(slots s2 --sequence.shuffle.tests --sequence.seed=424242) || exit 2
echo "slots base=$(wc -l <"$B"|tr -d ' ') seed20260824=$(wc -l <"$S1"|tr -d ' ') seed424242=$(wc -l <"$S2"|tr -d ' ')"
rc=0
for pair in "s1:$S1" "s2:$S2"; do
  n=${pair%%:*}; f=${pair#*:}
  if ! diff -q "$B" "$f" >/dev/null; then
    rc=1
    echo "MISMATCH base vs $n — 갈린 슬롯:"
    diff "$B" "$f" | grep -E '^[<>]' | head -10
  fi
done
test $rc -eq 0 && echo "order-independent: slot sets identical"
exit $rc
