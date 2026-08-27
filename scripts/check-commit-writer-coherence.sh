#!/usr/bin/env bash
# check-commit-writer-coherence.sh
# Spec: specs/30.spec/blue/foundation/multi-agent-commit-message-writer-scope-coherence.md §동작 (C1)+(C2)+(C3)+(C4)+(C5) + §수용 기준 Must (REQ-20260518-028 FR-03)
# Task: TSK-20260518-24
#
# G-C1 메시지 prefix → writer label (msg_label):
#   ^(feat|fix|refactor|chore|test|docs)(\(...\))?:  → developer
#   ^spec\(planner\):                                → planner
#   ^spec\(inspector\):                              → inspector
#   ^req\(discovery\):                               → discovery
#   ^followup\(developer\):                          → developer
#   매치 부재                                          → unscoped (silent skip)
#
# G-C2 변경 path → 후보 writer label 집합 (RULE-01 §쓰기 권한 매트릭스 박제 본):
#   src/**                                          → {developer}
#   10.followups/**                                 → {developer, discovery}      (developer create / discovery mv)
#   20.req/**                                       → {discovery, inspector}      (discovery create / inspector mv)
#   30.spec/green/**                                → {inspector, planner}        (inspector create/edit / planner mv → blue)
#   30.spec/blue/**                                 → {planner}
#   40.task/**                                      → {planner, developer}        (planner create / developer mv)
#   50.blocked/req/**                               → {inspector}
#   50.blocked/spec/**                              → {planner}
#   50.blocked/task/**                              → {developer, planner}
#   60.done/*/req/**                                → {inspector}
#   60.done/*/task/**                               → {developer}
#   60.done/*/followups/**                          → {discovery}
#   60.done/*/revisit/**                            → meta (제외)
#   package.json / package-lock.json / scripts/**   → {developer}
#   vite.config.js / vitest.config.js / eslint.config.js / tsconfig*.json → {developer}
#   .husky/** / index.html / public/** / .github/** / .gitignore → {developer}
#   .claude/** / CLAUDE.md / 기타                    → meta (제외)
#
# G-C3 일치 판정:
#   meta 제외 path 집합 = ∅           → meta-only commit, silent skip.
#   각 path 의 후보 라벨 집합 교집합 = ∅ → cross-writer mixing 위반.
#   msg_label ∈ 교집합                → PASS.
#   msg_label ∉ 교집합                → scope-mismatch 위반.
#   위반 시 stderr `commit <hash>: msg-scope=<X>, paths=[<p1>,<p2>,...] (<Y>)` rc=1.
#   <Y> = 교집합 라벨 (콤마 list, 빈집합이면 `cross-writer-mixing`).
#
# G-C4 인자 부재 → HEAD 단독. `<base>..HEAD` 형식 → range 평가 (K commit 위반 시 모두 박제 + rc=1).
# G-C5 본 script 자기 commit (developer 영역) self-evaluate 시 false-positive 0.
#
# G-C6 developer 라벨 commit body 의 RULE-04 보고 블록 존재 판정:
#   Spec: slug foundation/developer-commit-body-report-block-presence §동작 (B-1)~(B-5)
#         (lifecycle 경로가 아니라 slug 로 지칭한다 — 승격 mv 로 경로가 바뀌어도 참조가 끊기지 않는다.)
#   Task: TSK-20260828-03
#   모집단   = G-C1 이 developer 를 반환한 commit 한정. 라벨 도출을 재구현하지 않는다 (B-1) —
#              동일 사실의 두 번째 구현은 두 번째 진실 공급원이 된다.
#   판정토큰 = RULE-04 규약 파일 보고 블록 펜스에서 도출한 필수 필드 전수 (B-5). 임의 문자열
#              하드코딩은 규약 개정 시 게이트를 조용히 공허하게 만든다 (RULE-06 §열거 고정 금지).
#   판정입력 = commit body. 행 선두 `- <field>:` 형태를 계수한다 (B-2). RULE-04 는 열 필드를
#              전부 필수로 규정하고 빈 값도 `[]` 로 적도록 요구하므로 부분 보유는 보유가 아니다.
#   위반출력 = stderr 에 해시 열거 (B-3). 단일 commit 과 range 양면 동일.
#   적용경계 = 인자 부재 시 대상은 HEAD 단독 (B-4). 이력 전수를 붉히지 않는다 — 과거 위반이
#              모든 실행을 붉히면 게이트는 즉시 무시되거나 우회된다.
#   G-C1~G-C5 의 판정 의미는 바꾸지 않는다. body 축은 그 위에 얹는 층이다.
#
# §등급 분리 — 성질이 다른 두 모집단이 있고 공집합의 rc 등급이 서로 다르다.
#   한쪽 규칙을 다른 쪽에 기계적으로 복사하면 계약이 깨진다.
#   (a) RULE-04 필드 집합 — 도출된 **키 집합**. 공집합 → exit 2 (무판정).
#       도출기가 낡아 0 이 되면 게이트가 조용히 공허해진다. 통과로 읽지 않는다.
#   (b) 판정 대상 commit 집합 — 인자가 정한 **range 열거**. 공집합 → exit 0 (PASS).
#       blue foundation/multi-agent-commit-message-writer-scope-coherence §동작 (C4) 가
#       "K=0 일 때만 rc=0" 을 명시한다. 이 값을 2 로 바꾸면 그 계약이 깨진다.
#
# exit 0: 모든 평가 commit PASS (또는 unscoped/meta-only skip 만 존재).
# exit 1: 위반 commit ≥1 (또는 인자 해석 실패).
# exit 2: 무판정 — RULE-04 필드 도출 0건 또는 도출 완전성 붕괴 (도출원 부재 · 펜스 구조 변경).
#         "잴 토큰이 없어졌다" 를 "위반이 없다" 로 읽지 않는다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

# 판정 토큰 도출원 주입 seam. 미설정 시 기본은 저장소의 규약 파일이다.
REPORT_FIELD_SOURCE_FILES="${COMMIT_BODY_REPORT_SOURCE:-.claude/rules/RULE-04-REPORT.md}"

# 도출 완전성 보조 단언 토큰 (콜론 포함 표기). 열거 고정이 아니라 도출 붕괴 검출용 역방향
# 단언이다 — 펜스는 살아 있는데 필드가 일부만 나오는 형상을 전수 도출로 읽지 않는다.
REQUIRED_FIELD_TOKENS='no-op: last-productive:'

RULE04_FIELDS=""
if [ -f "$REPORT_FIELD_SOURCE_FILES" ]; then
  RULE04_FIELDS="$(awk 'BEGIN{B=sprintf("%c",96);F=B B B} index($0,F)==1{fc=!fc; next} fc && /^- [a-z-]+:/ {sub(/^- /,""); sub(/:.*/,""); print}' "$REPORT_FIELD_SOURCE_FILES" | sort -u)"
fi

RULE04_FIELD_COUNT=0
if [ -n "$RULE04_FIELDS" ]; then
  RULE04_FIELD_COUNT="$(printf '%s\n' "$RULE04_FIELDS" | grep -c . || true)"
  RULE04_FIELD_COUNT="${RULE04_FIELD_COUNT:-0}"
fi

if [ "$RULE04_FIELD_COUNT" -eq 0 ]; then
  printf 'check-commit-writer-coherence: NO-JUDGEMENT rule04-field-derivation-empty (source=%s)\n' \
    "$REPORT_FIELD_SOURCE_FILES" >&2
  printf '  도출원 RULE-04-REPORT 펜스에서 필드가 0건 나왔다. 잴 토큰이 없어진 것을 통과로 읽지 않는다.\n' >&2
  exit 2
fi

for token in $REQUIRED_FIELD_TOKENS; do
  field="${token%:}"
  if ! printf '%s\n' "$RULE04_FIELDS" | grep -qx -- "$field"; then
    printf 'check-commit-writer-coherence: NO-JUDGEMENT rule04-field-derivation-degraded (missing=%s source=%s)\n' \
      "$token" "$REPORT_FIELD_SOURCE_FILES" >&2
    printf '  도출 완전성 보조 단언 실패. 부분 도출을 전수 도출로 읽지 않는다.\n' >&2
    exit 2
  fi
done

ARG="${1:-HEAD}"

case "$ARG" in
  *..*)
    HASHES="$(git log --format=%H "$ARG" 2>/dev/null || true)"
    if [ -z "$HASHES" ]; then
      # §등급 분리 (b) — commit 집합 공집합은 무판정이 아니라 PASS 다 (blue §동작 (C4)).
      printf 'check-commit-writer-coherence: range=%s commits=0 violations=0 PASS rule04-fields=%s\n' \
        "$ARG" "$RULE04_FIELD_COUNT"
      exit 0
    fi
    ;;
  *)
    HASHES="$(git rev-parse "$ARG" 2>/dev/null || true)"
    if [ -z "$HASHES" ]; then
      printf 'check-commit-writer-coherence: cannot resolve %s\n' "$ARG" >&2
      exit 1
    fi
    ;;
esac

msg_to_label() {
  subject="$1"
  case "$subject" in
    feat:*|"feat("*"):"*|fix:*|"fix("*"):"*|refactor:*|"refactor("*"):"*|chore:*|"chore("*"):"*|test:*|"test("*"):"*|docs:*|"docs("*"):"*)
      printf 'developer'
      ;;
    "spec(planner):"*)
      printf 'planner'
      ;;
    "spec(inspector):"*)
      printf 'inspector'
      ;;
    "req(discovery):"*)
      printf 'discovery'
      ;;
    "followup(developer):"*)
      printf 'developer'
      ;;
    *)
      printf 'unscoped'
      ;;
  esac
}

# path_to_labels: 변경 path → 후보 writer label 공백 구분 list (또는 'meta').
path_to_labels() {
  p="$1"
  case "$p" in
    src/*)                                           printf 'developer';;
    10.followups/*|specs/10.followups/*)             printf 'developer discovery';;
    20.req/*|specs/20.req/*)                         printf 'discovery inspector';;
    30.spec/blue/*|specs/30.spec/blue/*)             printf 'planner';;
    30.spec/green/*|specs/30.spec/green/*)           printf 'inspector planner';;
    40.task/*|specs/40.task/*)                       printf 'planner developer';;
    50.blocked/req/*|specs/50.blocked/req/*)         printf 'inspector';;
    50.blocked/spec/*|specs/50.blocked/spec/*)       printf 'planner';;
    50.blocked/task/*|specs/50.blocked/task/*)       printf 'developer planner';;
    60.done/*/req/*|specs/60.done/*/req/*)           printf 'inspector';;
    60.done/*/task/*|specs/60.done/*/task/*)         printf 'developer';;
    60.done/*/followups/*|specs/60.done/*/followups/*)
                                                     printf 'discovery';;
    60.done/*/revisit/*|specs/60.done/*/revisit/*)   printf 'meta';;
    package.json|package-lock.json)                  printf 'developer';;
    scripts/*)                                       printf 'developer';;
    vite.config.js|vitest.config.js|eslint.config.js|tsconfig.json|tsconfig.*.json)
                                                     printf 'developer';;
    .husky/*|index.html|public/*|.github/*|.gitignore)
                                                     printf 'developer';;
    .claude/*|CLAUDE.md)                             printf 'meta';;
    *)                                               printf 'meta';;
  esac
}

# intersect_labels: 두 공백 구분 라벨 list 의 교집합 (공백 구분) 출력.
intersect_labels() {
  a="$1"
  b="$2"
  result=""
  for x in $a; do
    for y in $b; do
      if [ "$x" = "$y" ]; then
        if [ -z "$result" ]; then
          result="$x"
        else
          result="$result $x"
        fi
        break
      fi
    done
  done
  printf '%s' "$result"
}

violations=0
body_violations=0
commits=0

while IFS= read -r hash; do
  [ -z "$hash" ] && continue
  commits=$((commits + 1))

  subject="$(git log -1 --format=%s "$hash" 2>/dev/null || true)"
  msg_label="$(msg_to_label "$subject")"

  if [ "$msg_label" = "unscoped" ]; then
    continue
  fi

  # G-C6 body 축. 모집단은 msg_label 이 정한다 (B-1) — path 축과 독립으로 얹는 층이므로
  # meta-only skip 보다 앞에서 판정한다.
  if [ "$msg_label" = "developer" ]; then
    body="$(git log -1 --format=%b "$hash" 2>/dev/null || true)"
    present=0
    for field in $RULE04_FIELDS; do
      if printf '%s\n' "$body" | grep -qE "^- ${field}:"; then
        present=$((present + 1))
      fi
    done
    if [ "$present" -lt "$RULE04_FIELD_COUNT" ]; then
      short_hash="$(printf '%s' "$hash" | cut -c1-7)"
      printf 'commit %s: msg-scope=developer, rule04-block=absent (fields=%s/%s)\n' \
        "$short_hash" "$present" "$RULE04_FIELD_COUNT" >&2
      body_violations=$((body_violations + 1))
    fi
  fi

  paths="$(git log -1 --name-only --format= "$hash" 2>/dev/null | awk 'NF')"

  path_list=""
  intersection=""
  intersection_init=0
  any_non_meta=0

  # 입력을 임시 파일 우회로 안전하게 순회 (here-doc + 함수 호출 호환).
  tmpfile="$(mktemp)"
  printf '%s\n' "$paths" > "$tmpfile"
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [ -z "$path_list" ]; then
      path_list="$p"
    else
      path_list="$path_list,$p"
    fi
    labels="$(path_to_labels "$p")"
    if [ "$labels" = "meta" ]; then
      continue
    fi
    any_non_meta=1
    if [ "$intersection_init" -eq 0 ]; then
      intersection="$labels"
      intersection_init=1
    else
      intersection="$(intersect_labels "$intersection" "$labels")"
    fi
  done < "$tmpfile"
  rm -f "$tmpfile"

  if [ "$any_non_meta" -eq 0 ]; then
    continue
  fi

  # 교집합 set membership 검사.
  violated=0
  display_labels=""
  if [ -z "$intersection" ]; then
    violated=1
    display_labels="cross-writer-mixing"
  else
    found=0
    for lbl in $intersection; do
      if [ "$lbl" = "$msg_label" ]; then
        found=1
        break
      fi
    done
    if [ "$found" -eq 0 ]; then
      violated=1
    fi
    # 표시용: 교집합 라벨 콤마 list.
    display_labels="$(printf '%s' "$intersection" | tr ' ' ',')"
  fi

  if [ "$violated" -eq 1 ]; then
    short_hash="$(printf '%s' "$hash" | cut -c1-7)"
    printf 'commit %s: msg-scope=%s, paths=[%s] (%s)\n' \
      "$short_hash" "$msg_label" "$path_list" "$display_labels" >&2
    violations=$((violations + 1))
  fi
done <<EOF
$HASHES
EOF

total_violations=$((violations + body_violations))

if [ "$total_violations" -gt 0 ]; then
  printf 'check-commit-writer-coherence: range=%s commits=%s violations=%s FAIL rule04-fields=%s body-violations=%s\n' \
    "$ARG" "$commits" "$total_violations" "$RULE04_FIELD_COUNT" "$body_violations" >&2
  exit 1
fi

printf 'check-commit-writer-coherence: range=%s commits=%s violations=0 PASS rule04-fields=%s\n' \
  "$ARG" "$commits" "$RULE04_FIELD_COUNT"
exit 0
