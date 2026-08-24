#!/usr/bin/env bash
# pipeline-health.sh — SDD 파이프라인 건강도 1화면 요약.
# Rule: .claude/rules/RULE-04-REPORT.md (보고 영속화) + RULE-03 (정체 감지)
#
# 369 tick 무음 스톨의 직접 원인 중 하나는 "지금 파이프라인이 살아 있는가" 를
# 한눈에 볼 표면이 없었다는 것이다. 보고는 stdout 으로 증발했고, 유일하게
# 영속된 채널은 20,633줄짜리 seen 파일이었다.
#
# 사용: npm run pipeline:health  (또는 bash scripts/pipeline-health.sh)
# 출력: 큐 깊이/임계치, 에이전트별 no-op streak, 마지막 생산 행위, lock, blocked.
# exit 0 항상 — 진단 표면이지 게이트가 아니다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

REPORTS=".claude/reports"
LOCKS=".claude/locks"

# 임계치 (RULE-03 기본값; .claude/pipeline.json 이 있으면 override)
REQ_MAX=15; GREEN_MAX=20; TASK_MAX=10
if [ -f .claude/pipeline.json ]; then
  REQ_MAX="$(node -e "const c=require('./.claude/pipeline.json');console.log(c.REQUIREMENTS_READY_MAX??15)" 2>/dev/null || echo 15)"
  GREEN_MAX="$(node -e "const c=require('./.claude/pipeline.json');console.log(c.GREEN_PENDING_MAX??20)" 2>/dev/null || echo 20)"
  TASK_MAX="$(node -e "const c=require('./.claude/pipeline.json');console.log(c.TASK_READY_MAX??10)" 2>/dev/null || echo 10)"
fi

count() { find "$1" -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' '; }

# 큐 깊이 대비 임계치 — 만수위는 상류 no-op 을 뜻하므로 눈에 띄어야 한다.
bar() {
  n="$1"; max="$2"
  if [ "$max" = "-" ]; then printf '%s' "$n"; return; fi
  if [ "$n" -ge "$max" ]; then printf '%s/%s  ** 만수위 → 상류 no-op **' "$n" "$max"
  else printf '%s/%s' "$n" "$max"; fi
}

printf '\n== 큐 ==\n'
printf '  %-16s %s\n' '10.followups' "$(bar "$(count specs/10.followups)" -)"
printf '  %-16s %s\n' '20.req'       "$(bar "$(count specs/20.req)" "$REQ_MAX")"
printf '  %-16s %s\n' '30.spec/green' "$(bar "$(count specs/30.spec/green)" "$GREEN_MAX")"
printf '  %-16s %s\n' '30.spec/blue' "$(count specs/30.spec/blue)"
printf '  %-16s %s\n' '40.task'      "$(bar "$(count specs/40.task)" "$TASK_MAX")"
printf '  %-16s %s\n' '50.blocked'   "$(find specs/50.blocked -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"

printf '\n== 에이전트 ==\n'
for a in discovery inspector planner developer; do
  f="$REPORTS/$a.ndjson"
  if [ ! -f "$f" ]; then
    printf '  %-10s 보고 없음 (한 번도 tick 하지 않았거나 RULE-04 미이행)\n' "$a"
    continue
  fi
  # 마지막 라인 = 최신 tick. streak 과 마지막 생산 행위를 뽑는다.
  node -e '
    const fs = require("fs"), a = process.argv[1], f = process.argv[2];
    const lines = fs.readFileSync(f, "utf8").split("\n").filter(Boolean);
    let last = null;
    try { last = JSON.parse(lines[lines.length - 1]); } catch { }
    if (!last) { console.log(`  ${a.padEnd(10)} ndjson 파싱 실패`); process.exit(0); }
    // 마지막으로 moved > 0 이었던 tick = 실질 진행 (RULE-03 정의).
    let prod = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      try { const e = JSON.parse(lines[i]); if (e.moved > 0) { prod = e; break; } } catch { }
    }
    const streak = last.streak ?? "?";
    const warn = typeof streak === "number" && streak >= 12 ? "  ** streak 임계 초과 **" : "";
    const ago = prod ? `${prod.ts?.slice(0, 10)} (tick ${prod.tick})` : "기록 내 없음";
    console.log(`  ${a.padEnd(10)} tick ${String(last.tick ?? "?").padEnd(5)} streak ${String(streak).padEnd(4)} 마지막 진행 ${ago}${warn}`);
  ' "$a" "$f"
done

printf '\n== lock ==\n'
if [ -d "$LOCKS" ] && [ -n "$(ls -A "$LOCKS" 2>/dev/null)" ]; then
  for l in "$LOCKS"/*; do
    printf '  %-24s %s\n' "$(basename "$l")" "$(head -1 "$l" 2>/dev/null | cut -c1-52)"
  done
  printf '  → 해제는 운영자 전용 (RULE-05). 50.blocked/pipeline/*_reason.md 확인.\n'
else
  printf '  없음 (파이프라인 가동 가능 상태)\n'
fi

printf '\n== push ==\n'
if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  ahead="$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo '?')"
  lastpush="$(git log -1 --format=%cd --date=short '@{u}' 2>/dev/null || echo '?')"
  printf '  origin 미반영 %s commit / origin 최종 %s\n' "$ahead" "$lastpush"
  [ "$ahead" != "0" ] && [ "$ahead" != "?" ] && printf '  → 미푸시 = CI 미실행. 7일 초과 시 developer 기아 신호.\n'
else
  printf '  upstream 미설정\n'
fi
printf '\n'
exit 0
