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
# exit 0: 모든 평가 commit PASS (또는 unscoped/meta-only skip 만 존재).
# exit 1: 위반 commit ≥1 (또는 인자 해석 실패).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

ARG="${1:-HEAD}"

case "$ARG" in
  *..*)
    HASHES="$(git log --format=%H "$ARG" 2>/dev/null || true)"
    if [ -z "$HASHES" ]; then
      printf 'check-commit-writer-coherence: range=%s commits=0 violations=0 PASS\n' "$ARG"
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
commits=0

while IFS= read -r hash; do
  [ -z "$hash" ] && continue
  commits=$((commits + 1))

  subject="$(git log -1 --format=%s "$hash" 2>/dev/null || true)"
  msg_label="$(msg_to_label "$subject")"

  if [ "$msg_label" = "unscoped" ]; then
    continue
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

if [ "$violations" -gt 0 ]; then
  printf 'check-commit-writer-coherence: range=%s commits=%s violations=%s FAIL\n' \
    "$ARG" "$commits" "$violations" >&2
  exit 1
fi

printf 'check-commit-writer-coherence: range=%s commits=%s violations=0 PASS\n' \
  "$ARG" "$commits"
exit 0
