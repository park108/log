#!/usr/bin/env bash
# 전수 커버리지 순서 무관성 — covered 슬롯 **집합** 비교 (FR-03 전수 축).
#
# scripts/coverage-slot-set-compare.sh 가 src/common/common.ts 한 파일에 대해
# 하는 일을 트리 전체로 확장한다. 개수 비교는 "몇 개 다르다" 까지만 말하지만
# 집합 비교는 **어느 슬롯인지** 이름으로 낸다 — 실제로 그 출력이 전수 진동의
# 원인을 Comment.tsx:261 단일 지점으로 특정했다.
#
# 비용: 전수 커버리지 실행 2회 (≈2분). 수용 기준에 두면 승격마다 이 비용이
# 강제되므로(RULE-07 §promote 조건 2) 소유 spec 이 그 점을 명시한다.
set -uo pipefail

D=$(mktemp -d)

run() {
  npx vitest run --coverage --coverage.reporter=json \
    --coverage.reportsDirectory="$D/$1" "${@:2}" >/dev/null 2>&1
  test -s "$D/$1/coverage-final.json" || { echo "[EXTRACT-FAIL] no report: $1"; exit 2; }
}

run base
run shuf --sequence.shuffle.tests --sequence.seed="${SEED:-424242}"

node -e '
const D=process.argv[1];
const a=require(D+"/base/coverage-final.json"), b=require(D+"/shuf/coverage-final.json");
const keys=new Set([...Object.keys(a),...Object.keys(b)]);
if(keys.size===0){ console.error("[EXTRACT-FAIL] empty coverage map"); process.exit(2); }
let slots=0, diffs=[];
for(const k of keys){
  const fa=a[k], fb=b[k];
  if(!fa||!fb){ diffs.push("FILE-ONLY: "+k); continue; }
  for(const [kind,mapName] of [["f","fnMap"],["s","statementMap"],["b","branchMap"]]){
    for(const id of Object.keys(fa[kind])){
      const av=fa[kind][id], bv=fb[kind][id];
      if(Array.isArray(av)){
        av.forEach((h,i)=>{ slots++;
          if((h>0)!==((bv?.[i]??0)>0))
            diffs.push(`${kind}[${id}.${i}] ${k}:${fa[mapName][id]?.loc?.start?.line}`); });
      } else { slots++;
        if((av>0)!==((bv??0)>0)){ const m=fa[mapName][id];
          diffs.push(`${kind}[${id}] ${k}:${m?.decl?.start?.line ?? m?.start?.line} ${m?.name??""}`); }
      }
    }
  }
}
// 공허 통과 방지 — 측정 모집단이 무너지면 통과가 아니라 무판정이다.
if(slots < 1000){ console.error("[EXTRACT-FAIL] slot population too small: "+slots); process.exit(2); }
console.log("slots="+slots+" mismatched="+diffs.length);
diffs.slice(0,20).forEach(d=>console.log("  "+d));
process.exit(diffs.length===0 ? 0 : 1);
' "$D"
