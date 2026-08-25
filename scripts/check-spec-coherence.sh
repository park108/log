#!/usr/bin/env bash
# check-spec-coherence.sh
# Spec: specs/30.spec/blue/foundation/src-spec-reference-coherence.md §동작 G1·G2
# Spec(확장): foundation/spec-reference-coherence §동작 (G-4)(G-5) — slug 표기.
#   출처를 전체 경로로 적지 않는다: 본 파일의 비이스케이프 spec-path literal 은
#   위 1건뿐이어야 하고 root-config 정합 fixture 가 그 수를 박제한다.
# Task: TSK-20260517-06 · TSK-20260825-08
#
# 판정 스코프 (RULE-01 writer 매트릭스 정합):
#   src/**                writer=developer  -> G1·G2 hard-fail (기존 유지)
#   <SPEC_ROOT>/green/**  writer=inspector  -> G4 hard-fail (수리 주체 존재)
#   <SPEC_ROOT>/blue/**   writer 부재        -> ADVISORY 계수만 (rc 무영향)
#
# blue 가 ADVISORY 인 이유 (게으른 미완성이 아니다 — 올리지 말 것):
#   RULE-01 writer 매트릭스상 blue 는 create/edit writer 가 없다. inspector 는
#   green 만, planner 는 mv 만, developer 는 src/·scripts/ 만 쓴다. 즉 blue
#   본문의 위반을 고칠 권한을 가진 에이전트가 존재하지 않는다. 본 스크립트는
#   .github/workflows/ci.yml 의 step 이자 .husky/pre-commit 훅이므로, blue 를
#   hard-fail 로 올리면 spec 을 staged 하는 모든 커밋(=planner·inspector 의
#   정상 동작 전부)과 모든 PR 이 수리 경로 없이 붉어져 파이프라인이 고착된다.
#   blue 축 집행은 규약 변경(운영자 영역)이 선행 조건이다. 그 결정 전까지 본
#   게이트는 숫자를 숨기지 않고 매 실행마다 출력해 오염의 크기만 보이게 한다.
#
# G1 (RULE-01 suffix): grep -rnE 'specs/30\.spec/[^"` ]*-spec\.md' src -> 0 hit.
# G2 (디스크 실재):    src 내 specs/30.spec/{blue,green}/...md 패턴 매칭 경로 -> 전원 test -e PASS.
# G4 (spec-scope):     <SPEC_ROOT>/green/** 문서의 부재 참조 0 · 금지 suffix 표기 0.
# G5 (비공허):         스캔 md 파일 수 >= SPEC_MIN_FILES, 추출 distinct 경로 수 >= SPEC_MIN_DISTINCT.
#                      추출·열거가 어긋나 0 을 내면 전 항목이 조용히 자동 통과하므로 하한을 둔다.
#                      스캔 루트를 src 로 되돌리면 이 하한이 즉시 실패한다.
#
# 스캔 파일 제외 규칙: <SPEC_ROOT> 하위 *.md 만 본다 (--include="*.md").
#   .inspector-seen / .planner-seen 등 비-md 파일은 gitignored 라 CI 의 fresh
#   checkout 에 존재하지 않는다. 확장자 제한 없이 재면 로컬에서만 distinct 가
#   부풀어(55 -> 58) 로컬과 CI 의 판정 입력이 달라진다.
#
# 스캔 루트 override: SPEC_COHERENCE_SPEC_ROOT (기본 specs/30.spec).
#   해석된 값을 ack 라인에 출력한다 — 조용한 대상 바꿔치기 방지 표식이자 주입구.
#   CI·훅은 기본값을 쓴다.
#
# exit 0: 전 게이트 PASS (ack 출력).
# exit 1: G1·G2·G4·G5 중 1건 이상 위반 (stderr 상세).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/src"

if [ ! -d "$SRC_DIR" ]; then
  printf 'check-spec-coherence: src/ not found at %s\n' "$SRC_DIR" >&2
  exit 1
fi

cd "$ROOT" || exit 1

SPEC_ROOT="${SPEC_COHERENCE_SPEC_ROOT:-specs/30.spec}"

# G5 비공허 하한 — 열거·추출 붕괴 시의 자동 통과를 막는 유일한 장치.
SPEC_MIN_FILES=40
SPEC_MIN_DISTINCT=50

violations=0

# G1: -spec suffix 금지.
# grep exit: 0 = match (위반), 1 = no match (PASS), 2 = error.
g1_out="$(grep -rnE 'specs/30\.spec/[^"`\ ]*-spec\.md' src 2>/dev/null)"
g1_rc=$?
if [ $g1_rc -eq 0 ]; then
  printf 'G1 VIOLATION: RULE-01 -spec suffix 참조 hit (specs/30.spec/...-spec.md):\n%s\n' "$g1_out" >&2
  violations=1
elif [ $g1_rc -eq 2 ]; then
  printf 'G1 ERROR: grep exit 2 (검색 오류)\n' >&2
  violations=1
fi

# G2: src 추출 spec 경로 전원 디스크 실재.
# grep -h: 파일명 prefix 제거. -o: 매치만. sort -u: 중복 제거.
g2_paths="$(grep -rhoE 'specs/30\.spec/(blue|green)/[^"`\ ]*\.md' src 2>/dev/null | sort -u)"
if [ -n "$g2_paths" ]; then
  missing=0
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [ ! -e "$p" ]; then
      printf 'G2 VIOLATION: MISSING %s\n' "$p" >&2
      missing=1
    fi
  done <<EOF
$g2_paths
EOF
  if [ $missing -ne 0 ]; then
    violations=1
  fi
fi

# ---- spec-scope 측정 (G4 hard-fail / ADVISORY 계수 / G5 비공허) ----
#
# 추출·suffix 패턴의 이스케이프 형태(30\.spec)는 반드시 유지한다. 비이스케이프
# 형태로 쓰면 본 파일의 spec-path literal 이 늘어 root-config 정합 fixture 의
# 파일당 1 hit 단언이 깨진다.
#
# 참조가 가리키는 경로가 아니라 참조를 **적은 파일의 위치**로 green/blue 를
# 가른다 — 수리 주체는 문서를 쓴 쪽이기 때문이다.
SPEC_REF_RE='specs/30\.spec/(blue|green)/[A-Za-z0-9_./-]+\.md'
SPEC_SUFFIX_RE='specs/30\.spec/[^"`\ ]*-spec\.md'

spec_md_files=0
spec_refs=""
spec_suffix_out=""

if [ -d "$SPEC_ROOT" ]; then
  spec_md_files="$(find "$SPEC_ROOT" -type f -name '*.md' 2>/dev/null | wc -l | tr -d '[:space:]')"
  # -n: 파일:라인:매치 (소유 파일 판정용). sort -u: 동일 라인 중복 제거.
  spec_refs="$(grep -rnoE --include='*.md' "$SPEC_REF_RE" "$SPEC_ROOT" 2>/dev/null | sort -u)"
  spec_suffix_out="$(grep -rnE --include='*.md' "$SPEC_SUFFIX_RE" "$SPEC_ROOT" 2>/dev/null)"
fi

# distinct 경로 수 (파일:라인 접두 제거 후 중복 제거).
spec_distinct="$(printf '%s' "$spec_refs" | sed -n 's/^[^:]*:[0-9][0-9]*://p' | sort -u | grep -c . | tr -d '[:space:]')"

green_missing_paths=""
green_missing_detail=""
blue_missing_paths=""

# 서브셸 카운터 소실을 피해 here-doc 리다이렉트로 현재 셸에서 순회한다
# (파이프 while 금지). 비인용 변수 분할(for p in $var)에도 의존하지 않는다.
while IFS= read -r hit; do
  [ -z "$hit" ] && continue
  hit_file="${hit%%:*}"
  hit_path="${hit#*:}"
  hit_path="${hit_path#*:}"
  [ -e "$hit_path" ] && continue
  case "$hit_file" in
    "$SPEC_ROOT"/green/*)
      green_missing_paths="${green_missing_paths}${hit_path}
"
      green_missing_detail="${green_missing_detail}  ${hit} (MISSING)
"
      ;;
    *)
      blue_missing_paths="${blue_missing_paths}${hit_path}
"
      ;;
  esac
done <<EOF
$spec_refs
EOF

green_missing="$(printf '%s' "$green_missing_paths" | sort -u | grep -c . | tr -d '[:space:]')"
blue_missing="$(printf '%s' "$blue_missing_paths" | sort -u | grep -c . | tr -d '[:space:]')"

green_suffix=0
blue_suffix=0
green_suffix_detail=""

while IFS= read -r sline; do
  [ -z "$sline" ] && continue
  sfile="${sline%%:*}"
  case "$sfile" in
    "$SPEC_ROOT"/green/*)
      green_suffix=$((green_suffix + 1))
      green_suffix_detail="${green_suffix_detail}  ${sline}
"
      ;;
    *)
      blue_suffix=$((blue_suffix + 1))
      ;;
  esac
done <<EOF
$spec_suffix_out
EOF

# G4 hard-fail — green 은 inspector 가 수리할 수 있으므로 즉시 집행한다.
if [ "$green_missing" -gt 0 ]; then
  printf 'G4 VIOLATION: green 문서가 부재 경로를 참조한다 (%s건)\n%s' \
    "$green_missing" "$green_missing_detail" >&2
  violations=1
fi

if [ "$green_suffix" -gt 0 ]; then
  printf 'G4 VIOLATION: green 문서에 RULE-01 금지 -spec.md 표기 (%s line)\n%s' \
    "$green_suffix" "$green_suffix_detail" >&2
  violations=1
fi

# G5 비공허 — 측정면 자체가 붕괴하면(스코프 회귀·열거 실패) 여기서 잡는다.
if [ "$spec_md_files" -lt "$SPEC_MIN_FILES" ]; then
  printf 'G5 VIOLATION (vacuous): spec-scope md 파일 %s개 < 하한 %s (root=%s)\n' \
    "$spec_md_files" "$SPEC_MIN_FILES" "$SPEC_ROOT" >&2
  violations=1
fi

if [ "$spec_distinct" -lt "$SPEC_MIN_DISTINCT" ]; then
  printf 'G5 VIOLATION (vacuous): spec-scope 추출 distinct %s개 < 하한 %s (root=%s)\n' \
    "$spec_distinct" "$SPEC_MIN_DISTINCT" "$SPEC_ROOT" >&2
  violations=1
fi

if [ $violations -ne 0 ]; then
  exit 1
fi

printf 'check-spec-coherence: G1 0 hit / G2 0 MISSING (src/** ↔ specs/30.spec/**)\n'
printf 'check-spec-coherence: spec-scope root=%s files=%s distinct=%s green(missing=%s suffix=%s) blue(missing=%s suffix=%s · ADVISORY)\n' \
  "$SPEC_ROOT" "$spec_md_files" "$spec_distinct" \
  "$green_missing" "$green_suffix" "$blue_missing" "$blue_suffix"
printf '  ADVISORY (blue 는 RULE-01 상 편집 writer 부재 — 집행은 규약 변경 선행): 부재 참조 %s / suffix %s line. rc 에 반영하지 않는다.\n' \
  "$blue_missing" "$blue_suffix"
exit 0
