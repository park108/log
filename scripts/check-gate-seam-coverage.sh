#!/usr/bin/env bash
# check-gate-seam-coverage.sh
# Spec: foundation/gate-judgement-population-injectable-seam §수용 기준 (E-1)(E-3)(E-4) · §발화 채널
# Task: TSK-20260825-38
#
# 게이트 **자신의 인터페이스**를 판정한다. 이 저장소의 `check:*` 게이트들은 판정 모집단을
# 주입받는 seam 을 갖도록 계약돼 있으나, 그 계약의 위반은 어떤 상시 게이트도 붉게 만들지
# 못했다 — 누군가 `ENV_PRESENCE_SCAN_ROOT` 를 지워도 pre-commit·CI 는 전부 초록이었다.
#
# **seam 이 사라지면 잃는 것은 편의가 아니라 민감도 검증 능력 자체다.** 게이트가 잴 입력을
# 조작할 수 없으면 `RULE-06 §게이트 실효 검증` 의 주입 왕복이 불가능해진다. TSK-20260825-28 이
# 정확히 그 능력 부재로 `50.blocked/task/` 에 갔고, seam(TSK-20260825-31) 이 생긴 뒤에야
# TSK-20260825-37 로 재발행돼 착지했다.
#
# 판정 3종 (출처 spec 수용 기준과 1:1):
#   (J-1 = E-1) 전항 요구 — `.env*` 도출을 가진 게이트는 **전부** seam 선언을 가져야 한다.
#               미보유 1건이라도 있으면 exit 1 이며 파일명을 stderr 에 열거한다.
#   (J-2 = E-4) 수치 하한 — 전체 게이트 중 seam 보유 수 >= SEAM_MIN.
#   (J-3 = E-3) 픽스처 보존 — 주입용 격리 픽스처가 실재하고 git 추적 중이며 무시되지 않는다.
#
# §하한의 근거 (SEAM_MIN):
#   기존 seam 3종 보존(branch-discrimination · monitor-state-immutability · spec-coherence,
#   여기에 test-double-shape 를 더해 실제로는 4종이 선행) + env 게이트 1 = **4**.
#   **실측치로 올려 잠그지 않는다.** 현 실측은 그보다 크지만, 하한을 실측에 맞춰 올리면
#   분모(게이트 총수)와 분자(seam 보유)가 함께 증가하는 정상 구간에서 거짓 위반이 난다.
#   이 하한이 겨누는 것은 "seam 이 통째로 걷혀 나가는" 방향이지 비율의 미세 변동이 아니다.
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   게이트 목록   = <scan-root>/check-*.sh glob. 파일명 목록을 본문에 두지 않는다.
#   env-class     = 본문에 `.env` 도출을 가진 게이트 (아래 ENV_CLASS_ERE).
#   seam 보유     = 아래 SEAM_DECL_ERE 를 만족하는 선언 1행 이상.
#
# §자기 seam — 이 게이트가 강제하는 성질을 **자기 자신이 먼저 갖춘다**. 그래야 주입 검증이
#   실 `scripts/check-*.sh` 를 건드리지 않고 픽스처 안에서 끝난다. glob 은 비재귀라
#   `scripts/fixtures/**` 의 픽스처는 기본 실행 모집단에 들어오지 않는다.
#
# **ERE 는 홑따옴표로 고정한다.** 겹따옴표 안에서는 `\$` 가 셸 확장을 받아 패턴 꼬리가
#   조용히 잘린다 — 그 형태의 결함이 실제로 관측됐다 (TSK-20260825-35 result).
#
# exit 0: (J-1)(J-2)(J-3) PASS (ack 1 줄 stdout).
# exit 1: 위반 (stderr 상세 + 파일명 열거).
# exit 2: 무판정 — 도출 0 (스캔 루트 부재 · 게이트 0건 · env-class 0건).
#         "위반이 있다" 와 "잴 것이 없어졌다" 를 합치지 않는다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

# 판정 모집단 주입 seam. 미설정 시 기본은 실 게이트 디렉터리다.
SEAM_SCAN_ROOT="${GATE_SEAM_SCAN_ROOT:-scripts}"

# 픽스처 보존 판정 대상 (E-3). 스캔 루트와 독립이다 — 이것은 저장소 고정 계약이다.
SEAM_FIXTURE_DIR="${GATE_SEAM_FIXTURE_DIR:-scripts/fixtures/env-presence}"

SEAM_MIN=4

SEAM_DECL_ERE='^[A-Z_]*(ROOT|GLOB|FILES)="\$\{[A-Z_]+:-'
ENV_CLASS_ERE='ls-files "?\.env'

if [ ! -d "$SEAM_SCAN_ROOT" ]; then
  printf 'check-gate-seam-coverage: 스캔 루트 없음 — %s\n' "$SEAM_SCAN_ROOT" >&2
  printf '  잴 대상이 없는 것은 충족이 아니다.\n' >&2
  exit 2
fi

gates=0
env_gates=0
seam=0
no_seam_env=""

for f in "$SEAM_SCAN_ROOT"/check-*.sh; do
  [ -f "$f" ] || continue
  gates=$((gates + 1))

  has_seam=0
  if grep -qE "$SEAM_DECL_ERE" "$f" 2>/dev/null; then
    has_seam=1
    seam=$((seam + 1))
  fi

  if grep -qE "$ENV_CLASS_ERE" "$f" 2>/dev/null; then
    env_gates=$((env_gates + 1))
    if [ "$has_seam" -eq 0 ]; then
      no_seam_env="$no_seam_env $f"
    fi
  fi
done

if [ "$gates" -eq 0 ]; then
  printf 'check-gate-seam-coverage: 도출 규칙 붕괴 — 게이트 0건 (root=%s).\n' "$SEAM_SCAN_ROOT" >&2
  printf '  glob 이 공집합을 냈다. 0 을 충족으로 읽지 않는다.\n' >&2
  exit 2
fi

if [ "$env_gates" -eq 0 ]; then
  printf 'check-gate-seam-coverage: 도출 규칙 붕괴 — env-class 게이트 0건 (root=%s).\n' "$SEAM_SCAN_ROOT" >&2
  printf '  (J-1) 이 조용히 무판정이 된다. 공허를 통과로 읽지 않는다.\n' >&2
  exit 2
fi

violated=0

# (J-1 = E-1) 전항 요구.
if [ -n "$no_seam_env" ]; then
  violated=1
  printf 'E-1 VIOLATION: seam 없는 env-class 게이트 실재 (전항 요구 미충족)\n' >&2
  for f in $no_seam_env; do
    printf '  no-seam: %s\n' "$f" >&2
  done
  printf '  seam 이 없으면 이 게이트가 잴 입력을 주입할 수 없다 — 민감도 검증이 불가능해진다.\n' >&2
fi

# (J-2 = E-4) 수치 하한.
if [ "$seam" -lt "$SEAM_MIN" ]; then
  violated=1
  printf 'E-4 VIOLATION: seam 보유 게이트 %s개 (하한 %s)\n' "$seam" "$SEAM_MIN" >&2
  printf '  seam 이 통째로 걷혀 나가는 방향이다. 하한은 실측치가 아니라 계약 최소치다.\n' >&2
fi

# (J-3 = E-3) 픽스처 보존.
if [ ! -d "$SEAM_FIXTURE_DIR" ]; then
  violated=1
  printf 'E-3 VIOLATION: 주입 픽스처 디렉터리 부재 — %s\n' "$SEAM_FIXTURE_DIR" >&2
else
  tracked="$(git ls-files "$SEAM_FIXTURE_DIR" 2>/dev/null | grep -c . || true)"
  tracked="${tracked:-0}"
  if [ "$tracked" -eq 0 ]; then
    violated=1
    printf 'E-3 VIOLATION: 주입 픽스처가 git 추적 중이 아님 — %s (tracked=0)\n' "$SEAM_FIXTURE_DIR" >&2
    printf '  추적되지 않으면 산출물이 조용히 휘발하고, 부재가 위반이 아니라 통과로 읽힌다.\n' >&2
  fi
  if git check-ignore -q "$SEAM_FIXTURE_DIR" 2>/dev/null; then
    violated=1
    printf 'E-3 VIOLATION: 주입 픽스처 경로가 .gitignore 와 매치 — %s\n' "$SEAM_FIXTURE_DIR" >&2
  fi
fi

if [ "$violated" -ne 0 ]; then
  printf 'check-gate-seam-coverage: gates=%s env-gates=%s seam=%s (root=%s)\n' \
    "$gates" "$env_gates" "$seam" "$SEAM_SCAN_ROOT" >&2
  exit 1
fi

printf 'check-gate-seam-coverage: gates=%s env-gates=%s seam=%s (root=%s)\n' \
  "$gates" "$env_gates" "$seam" "$SEAM_SCAN_ROOT"
exit 0
