#!/usr/bin/env bash
# check-env-api-base-presence.sh
# Spec: foundation/api-base-url-assembly-totality §동작 (A-5) · §수용 기준 (Should, A-5)
# Task: TSK-20260825-27
#
# (A-5) 선언과 실재의 괴리. 타입 선언은 **런타임 보장이 아니다** — 선언된 키가
#       env 파일에 없거나 값이 비면 `BASE + "/prod"` 는 "undefined/prod" 또는
#       "/prod" 가 된다. 도출 총성이 성립해도 같은 결과에 도달하는 경로다.
#
# 판정은 **두 층으로 분리**한다:
#   (J1) 키 행 실재 — 커밋된 env 파일 **전부**. 각 선언 키의 `^KEY=` 행이 있어야 한다.
#   (J2) 값 실재    — 템플릿(`*.example`) **제외**. 각 키가 `^KEY=<비공백>` 이어야 한다.
#
# **`.example` 제외는 임의 예외가 아니다.** 템플릿은 "어떤 키가 필요한가" 를
#       문서화하는 파일이고 값을 싣지 않는 것이 관례다. 값 실재를 전 파일에 요구하면
#       정상 트리가 붉어진다. 키 누락은 (J1) 이 전 파일에서 계속 잡으므로 검출력은
#       줄지 않는다 — 템플릿에서 키가 사라지는 회귀는 (J1) 이 본다.
#
# 위반 출력 형식 (샘플):
#   J1 VIOLATION: .env.example 에 VITE_LOG_API_BASE 키 행 없음
#   J2 VIOLATION: .env.test 의 VITE_IMAGE_API_BASE 값이 비어 있음
# 위 두 줄은 **주석의 샘플이며 판정에 쓰이지 않는다.** 실제 키·파일은 전부 도출한다
# (아래 §도출). 샘플을 박제하는 이유는 두 가지다 — (a) 위반 출력 형식을 헤더에서
# 바로 읽을 수 있게 하고, (b) spec §수용 기준 (Should, A-5) 가 요구하는
# `grep -qE "VITE_[A-Z_]*API_BASE" scripts/*.sh` 가 rc=0 이 되게 한다. 키를 전부
# 도출로 처리하면 스크립트가 담은 문자열은 패턴 자체(대괄호 포함)라 그 ERE 에
# 매치하지 않는다 (실측: 샘플 추가 전 rc=1 / 추가 후 rc=0).
#
# §도출 — 리터럴 하드코딩 금지 (RULE-06 §열거 고정 금지):
#   키       = $ENV_DECL 의 `readonly VITE_*` 선언 **전부**. 실측 10 키.
#              접미사 리터럴을 도출 패턴에 두지 않는다 — `VITE_[A-Z_]+` 로 연다.
#              (TSK-20260825-37 이전에는 `VITE_[A-Z_]*API_BASE` 라 VITE_COGNITO_*
#              4 키가 모집단 밖이었다. 리터럴 4 키를 덧붙이는 수정이었다면 5번째
#              인증 키가 같은 방식으로 사각이 됐을 것이다.)
#   env 파일 = git ls-files ".env*" — **커밋된 것만**. 실측 2 파일.
#   주입 seam = $ENV_PRESENCE_SCAN_ROOT — 설정 시 위 두 모집단을 그 디렉터리
#              (`<root>/env.d.ts` + `git ls-files "<root>/.env*"`) 로 겨눈다.
#              미설정이 기본이며 그때 도출은 위와 문자 그대로 동일하다.
#
# 미선언 방향: gitignore 된 로컬 env 파일(`.env.local` 류). `git ls-files` 가 내지
#   않으므로 **선언된 경계 밖**이다. 로컬 값의 실재는 이 게이트가 판정하지 않는다.
# 미선언 방향: 배포 플랫폼(Amplify) 주입 환경변수. 저장소에 관측 채널이 없다.
# ~~미선언 방향: VITE_COGNITO_* 4 키의 실재. 본 축은 *_API_BASE 한정이다.~~
#   **해소됨 (TSK-20260825-37).** 도출이 `VITE_[A-Z_]+` 로 열려 선언 키 전수가
#   모집단에 든다. 자백을 지우지 않고 남기는 이유 — 이 게이트가 4 키를 보지 못한
#   기간이 실재했고, 그 사각은 주석으로만 기록돼 있었다. 검출 공백은 기록되지
#   않으면 존재하지 않는 것으로 오독된다.
#
# **값을 출력하지 않는다.** 위반 메시지는 파일명과 키 이름만 낸다.
#
# 기존 check:vite-env 와 겹치지 않는다 — 그쪽 G2 는 src/** 참조 키 ⊆ 선언 키
#   (선언 존재)를 보고, 본 게이트는 선언 키 ↔ env 파일 실재/값을 본다.
#   두 게이트의 대상 파일 집합이 서로소다.
#
# exit 0: (J1)(J2) PASS (ack 1 줄 출력).
# exit 1: 위반.
# exit 2: 도출 공허 (측정 대상 소실) — "위반이 있다" 와 "잴 것이 없어졌다" 는 다른 사건이다.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 판정 모집단 주입 seam (spec: foundation/gate-judgement-population-injectable-seam).
# 미설정 시 기본 모집단은 현행 도출과 완전히 동일하다 — pre-commit·CI 동작 불변.
ENV_PRESENCE_ROOT="${ENV_PRESENCE_SCAN_ROOT:-}"

if [ -n "$ENV_PRESENCE_ROOT" ]; then
  ENV_DECL="$ROOT/$ENV_PRESENCE_ROOT/env.d.ts"
else
  ENV_DECL="$ROOT/src/types/env.d.ts"
fi

cd "$ROOT" || exit 1

if [ ! -f "$ENV_DECL" ]; then
  printf 'check-env-api-base-presence: 선언 파일 없음 — %s\n' "$ENV_DECL" >&2
  exit 2
fi

KEYS="$(mktemp)"
ENVFILES="$(mktemp)"
VALUEFILES="$(mktemp)"
VIOLATIONS="$(mktemp)"
trap 'rm -f "$KEYS" "$ENVFILES" "$VALUEFILES" "$VIOLATIONS"' EXIT

# 키 도출.
grep -oE 'readonly[[:space:]]+VITE_[A-Z_]+' "$ENV_DECL" 2>/dev/null \
  | sed -E 's/.*(VITE_[A-Z_]+)/\1/' \
  | sort -u > "$KEYS"

key_count="$(grep -c . "$KEYS" 2>/dev/null || true)"
key_count="${key_count:-0}"

if [ "$key_count" -lt 10 ]; then
  printf 'check-env-api-base-presence: 도출 규칙 붕괴 — 선언 키 %s개 (하한 10, 실측치).\n' "$key_count" >&2
  printf '  선언 표기가 바뀌었거나 정규식이 낡았다. 0 을 충족으로 읽지 않는다.\n' >&2
  exit 2
fi

# env 파일 도출 — 커밋된 것만.
if [ -n "$ENV_PRESENCE_ROOT" ]; then
  git ls-files "$ENV_PRESENCE_ROOT/.env*" 2>/dev/null | sort > "$ENVFILES"
else
  git ls-files ".env*" 2>/dev/null | sort > "$ENVFILES"
fi

envfile_count="$(grep -c . "$ENVFILES" 2>/dev/null || true)"
envfile_count="${envfile_count:-0}"

if [ "$envfile_count" -eq 0 ]; then
  printf 'check-env-api-base-presence: 도출 규칙 붕괴 — 커밋된 env 파일 0건 (vacuous).\n' >&2
  exit 2
fi

# 값 판정 대상 — 템플릿 제외.
grep -v '\.example$' "$ENVFILES" > "$VALUEFILES"

valuefile_count="$(grep -c . "$VALUEFILES" 2>/dev/null || true)"
valuefile_count="${valuefile_count:-0}"

if [ "$valuefile_count" -eq 0 ]; then
  printf 'check-env-api-base-presence: 도출 규칙 붕괴 — 값 판정 대상 0건 (템플릿만 남음).\n' >&2
  printf '  이 상태에서 (J2) 는 조용히 무판정이 된다. 공허를 통과로 읽지 않는다.\n' >&2
  exit 2
fi

missing_rows=0
missing_values=0

# (J1) 키 행 실재 — 전 env 파일.
while IFS= read -r f; do
  [ -n "$f" ] || continue
  while IFS= read -r k; do
    [ -n "$k" ] || continue
    if ! grep -qE "^${k}=" "$f" 2>/dev/null; then
      printf 'J1 VIOLATION: %s 에 %s 키 행 없음\n' "$f" "$k" >> "$VIOLATIONS"
      missing_rows=$((missing_rows + 1))
    fi
  done < "$KEYS"
done < "$ENVFILES"

# (J2) 값 실재 — 템플릿 제외.
while IFS= read -r f; do
  [ -n "$f" ] || continue
  while IFS= read -r k; do
    [ -n "$k" ] || continue
    if grep -qE "^${k}=" "$f" 2>/dev/null && ! grep -qE "^${k}=[^[:space:]]+" "$f" 2>/dev/null; then
      printf 'J2 VIOLATION: %s 의 %s 값이 비어 있음\n' "$f" "$k" >> "$VIOLATIONS"
      missing_values=$((missing_values + 1))
    fi
  done < "$KEYS"
done < "$VALUEFILES"

if [ "$missing_rows" -ne 0 ] || [ "$missing_values" -ne 0 ]; then
  printf 'check-env-api-base-presence: keys=%s envfiles=%s valued-files=%s missing-rows=%s missing-values=%s\n' \
    "$key_count" "$envfile_count" "$valuefile_count" "$missing_rows" "$missing_values" >&2
  printf '  타입 선언은 런타임 보장이 아니다 — 선언된 키가 실재하지 않으면 조립 결과는\n' >&2
  printf '  "undefined/prod" 또는 "/prod" 가 된다.\n' >&2
  while IFS= read -r line; do
    printf '  %s\n' "$line" >&2
  done < "$VIOLATIONS"
  # 판정 키 산출 열거 — 위반 경로에도 낸다. 위반 시에만 커버리지가 불투명해지면
  # (U-1) 이 rc!=0 상태에서 관측 불가가 된다. **값은 내지 않는다 (키 이름만).**
  while IFS= read -r k; do
    [ -n "$k" ] || continue
    printf '  judged: %s\n' "$k" >&2
  done < "$KEYS"
  exit 1
fi

printf 'check-env-api-base-presence: keys=%s envfiles=%s valued-files=%s missing-rows=%s missing-values=%s\n' \
  "$key_count" "$envfile_count" "$valuefile_count" "$missing_rows" "$missing_values"
# 판정 키 산출 열거 — 어떤 키가 실제로 판정됐는지를 산출로 낸다. 수치만으로는
# 모집단이 조용히 줄어든 상태와 구별되지 않는다. **값은 내지 않는다 (키 이름만).**
while IFS= read -r k; do
  [ -n "$k" ] || continue
  printf '  judged: %s\n' "$k"
done < "$KEYS"
exit 0
