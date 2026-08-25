#!/usr/bin/env bash
# check-measurement-tree-attribution.sh
# Spec: foundation/measurement-tree-attribution §수용 기준 (M-6)(M-7)(M-8)(M-9)
# Task: TSK-20260825-39
#
# `rc=0` 은 **어떤 트리에서 났는가** 와 함께여야 증거가 된다. 측정 구간 동안 워킹트리가
# 변하면 그 rc 는 **존재하지 않는 트리의 rc** 이며, `RULE-07 §promote 조건 2`(promote 직전
# 전수 재실행)와 `RULE-06 §게이트 실효 검증`(주입 왕복 rc)이 요구하는 증거의 의미가
# 정의되지 않는다.
#
# **이 게이트는 작업 파괴를 막지 않는다.** 막는 것은 파괴된 트리의 rc 가 증거로 승격되는
# 것이다. 그래서 드리프트는 감싼 명령의 rc 와 **무관하게** exit 1 이다 — "게이트가 위반을
# 못 찾은 것"(감싼 명령 rc=0) 과 "그 측정을 믿을 수 없는 것"(드리프트) 은 다른 사건이며
# 같은 rc 로 표현하지 않는다.
#
# 이 축을 재는 채널이 HEAD 에 없었다. spec §동작 (M-2) 가 `scripts/*.sh` 의 git 호출 6건과
# `.husky/pre-commit` 8건을 전수 열거해 부재를 증명했고, 그 전부가 **이름 목록·커밋 이력만**
# 읽는다. 관측된 두 사고를 잡은 것은 게이트가 아니라 사람이었다 (ack 수치가 우연히 달라져서 ·
# `nothing to commit` 이 떠서) — **우연에 의존하는 검출은 계약이 아니다** (§동작 (M-4)).
#
# 사용:
#   scripts/check-measurement-tree-attribution.sh            현 트리 지문 1줄 → exit 0
#   scripts/check-measurement-tree-attribution.sh -- <cmd…>  측정을 감싸 귀속 판정
#
# §지문 — **내용을 반영한다** (§동작 (M-3)):
#   HEAD sha + 추적 파일 전량의 **내용 해시** + 미추적(비-ignore) 파일 전량의 내용 해시.
#   이름 목록 기반 지문은 관측된 사고(이름 유지 · 내용 원복)에 **완전히 침묵**하므로 부적격이다.
#   추적 파일이 워킹트리에서 사라진 경우 `MISSING` 으로 계상한다 — `git ls-files | xargs shasum`
#   류가 그 경로에서 죽는 것을 피하면서 삭제 자체는 지문 변화로 남긴다.
#   비용: 추적 360 파일 전량 해시가 0.1s 미만. 성능은 제약이 아니다.
#
# §제외 규칙 — `--exclude-standard` 로 **gitignore 된 산출물을 제외**한다. 이것이 오탐 방향
#   (빌드·커버리지 산출물이 측정 중 생기는 정상 상황)을 구조적으로 막는 실체다. `build/` ·
#   `coverage/` 가 .gitignore 에 있으므로 `npm run build` 를 감싸도 지문이 흔들리지 않는다.
#
# §read-only (M-7) — 워킹트리·인덱스·stash 를 변경하지 않는다. `git stash` 류는 **쓰지 않는다**
#   (그 자체가 본 계약이 겨누는 사고 부류다). 임시 파일은 mktemp 로 저장소 **밖**에 만든다.
#
# §값 비출력 — 지문과 **경로 이름**만 낸다. 파일 내용·환경변수 값은 어디에도 내지 않는다.
#
# exit 0: 지문 출력 (인자 없음) · 감싼 명령 rc=0 이고 트리 불변.
# exit 1: 측정 구간 트리 드리프트 (category: measurement-tree-drift) — 감싼 명령 rc 와 무관.
#         또는 트리 불변 상태에서 감싼 명령이 낸 비-0 rc 의 전파.
# exit 2: fail-closed — 지문 산출 불가 (git 저장소 아님 · 스캔 루트 부재).
#         무효를 충족으로도 위반으로도 읽지 않는다.

set -u

# 판정 모집단 주입 seam (spec: foundation/gate-judgement-population-injectable-seam).
# 미설정 기본은 현행 도출과 완전히 동일하다.
SCAN_ROOT="${MEASUREMENT_TREE_SCAN_ROOT:-.}"

if [ ! -d "$SCAN_ROOT" ]; then
  printf 'check-measurement-tree-attribution: 스캔 루트 없음 — %s\n' "$SCAN_ROOT" >&2
  printf '  지문을 산출할 수 없다. 무효를 충족으로 읽지 않는다 (fail-closed).\n' >&2
  exit 2
fi

if ! git -C "$SCAN_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  printf 'check-measurement-tree-attribution: git 저장소가 아님 — %s\n' "$SCAN_ROOT" >&2
  printf '  지문 산출 불가. 위반(1)이 아니라 무판정(2)이다 (fail-closed).\n' >&2
  exit 2
fi

BEFORE="$(mktemp)"
AFTER="$(mktemp)"
trap 'rm -f "$BEFORE" "$AFTER"' EXIT

# 트리 매니페스트 산출. 경로 이름 + 내용 해시만 담는다.
build_manifest() {
  _out="$1"
  : > "$_out"
  printf 'HEAD %s\n' "$(git -C "$SCAN_ROOT" rev-parse HEAD 2>/dev/null || printf 'NO-HEAD')" >> "$_out"

  git -C "$SCAN_ROOT" ls-files -z 2>/dev/null | LC_ALL=C sort -z \
    | while IFS= read -r -d '' _f; do
        if [ -f "$SCAN_ROOT/$_f" ]; then
          _h="$(shasum "$SCAN_ROOT/$_f" 2>/dev/null | awk '{print $1}')"
          printf 'T %s %s\n' "${_h:-UNREADABLE}" "$_f" >> "$_out"
        else
          # 인덱스에 있으나 워킹트리에 없다 — 삭제도 드리프트다.
          printf 'T MISSING %s\n' "$_f" >> "$_out"
        fi
      done

  git -C "$SCAN_ROOT" ls-files --others --exclude-standard -z 2>/dev/null | LC_ALL=C sort -z \
    | while IFS= read -r -d '' _f; do
        if [ -f "$SCAN_ROOT/$_f" ]; then
          _h="$(shasum "$SCAN_ROOT/$_f" 2>/dev/null | awk '{print $1}')"
          printf 'U %s %s\n' "${_h:-UNREADABLE}" "$_f" >> "$_out"
        fi
      done
}

fingerprint_of() {
  shasum "$1" 2>/dev/null | awk '{print $1}'
}

build_manifest "$BEFORE"
fp_before="$(fingerprint_of "$BEFORE")"

if [ -z "$fp_before" ]; then
  printf 'check-measurement-tree-attribution: 지문 산출 실패 (root=%s).\n' "$SCAN_ROOT" >&2
  exit 2
fi

tracked_n="$(grep -c '^T ' "$BEFORE" 2>/dev/null || true)"
untracked_n="$(grep -c '^U ' "$BEFORE" 2>/dev/null || true)"

# ── 모드 1: 지문 출력 ────────────────────────────────────────────────────────
if [ "$#" -eq 0 ]; then
  printf 'check-measurement-tree-attribution: fingerprint=%s tracked=%s untracked=%s (root=%s)\n' \
    "$fp_before" "${tracked_n:-0}" "${untracked_n:-0}" "$SCAN_ROOT"
  exit 0
fi

if [ "$1" != "--" ]; then
  printf 'check-measurement-tree-attribution: 사용법 — %s [-- <command…>]\n' "$0" >&2
  exit 2
fi
shift

if [ "$#" -eq 0 ]; then
  printf 'check-measurement-tree-attribution: `--` 뒤에 명령이 없다.\n' >&2
  exit 2
fi

# ── 모드 2: 측정 감싸기 ──────────────────────────────────────────────────────
"$@"
cmd_rc=$?

build_manifest "$AFTER"
fp_after="$(fingerprint_of "$AFTER")"

if [ -z "$fp_after" ]; then
  printf 'check-measurement-tree-attribution: 측정 후 지문 산출 실패 (root=%s).\n' "$SCAN_ROOT" >&2
  exit 2
fi

if [ "$fp_before" != "$fp_after" ]; then
  printf 'MEASUREMENT TREE DRIFT: 측정 구간 동안 트리가 변했다 (category: measurement-tree-drift)\n' >&2
  printf '  before=%s\n  after =%s\n' "$fp_before" "$fp_after" >&2
  printf '  감싼 명령의 rc=%s 는 **이 트리의 rc 가 아니다.** 증거로 승격하지 않는다.\n' "$cmd_rc" >&2
  printf '  변한 경로:\n' >&2
  diff "$BEFORE" "$AFTER" 2>/dev/null \
    | grep -E '^[<>]' \
    | sed -E 's/^[<>] //' \
    | awk '{ if ($1 == "HEAD") print "HEAD"; else { $1=""; $2=""; sub(/^  /, ""); print } }' \
    | LC_ALL=C sort -u \
    | while IFS= read -r _p; do
        [ -n "$_p" ] || continue
        printf '    drift: %s\n' "$_p" >&2
      done
  exit 1
fi

printf 'check-measurement-tree-attribution: fingerprint=%s tracked=%s untracked=%s stable — cmd rc=%s (root=%s)\n' \
  "$fp_before" "${tracked_n:-0}" "${untracked_n:-0}" "$cmd_rc" "$SCAN_ROOT"
exit "$cmd_rc"
