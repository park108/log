#!/usr/bin/env bash
# check-package-manager-coherence.sh
# Spec: specs/30.spec/blue/foundation/package-manager-major-coherence.md
#       §수용 기준 (Must FR-04 / FR-08 / FR-09) + §동작 (I5)(I10)(I11)(I13)
#       — FR-08/FR-09 + (I10)(I11)(I13) 은 승격 대기 개정 축이다. 본 헤더가 blue
#         baseline 경로를 참조하는 것은 root config 의 참조 대상을 baseline 으로
#         한정하는 자매 불변식 (G-C 승격 미완 참조 0) 때문이다.
# Task: TSK-20260824-01-b (선행 TSK-20260517-23)
#
# 측정 축 (선언 vs 실측 — 선언끼리 비교하지 않는다):
#   (a) package.json:engines.npm          semver range   [선언]
#   (b) package.json:packageManager       corepack pin   [선언]
#   (c) `npm -v` (= `npm --version`)      실행 매니저     [실측 — (I10) 판정 근거의 실행성]
#   (d) package-lock.json:lockfileVersion 포맷           [실측 매니저 메이저 호환 포맷과 대조]
#
# 왜 실측인가 ((I10)):
#   (a)(b) 두 선언만 비교하는 판정은 선언과 실행이 어긋난 상태에서도 aligned + rc=0 을 낸다.
#   워크플로·설정 파일의 토큰 존재도 근거가 되지 않는다 — 액션이 정의하지 않은 입력 키는
#   실행 결과를 바꾸지 않으면서 grep hit 을 반환하므로 위반 상태와 충족 상태를 구별하지
#   못한다. 그래서 본 게이트는 실행 중인 매니저를 직접 실측한다.
#
# 메이저 ↔ lockfileVersion 매핑 (근거: npm 공식 문서 package-lock.json §lockfileVersion —
#   https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json#lockfileversion):
#     npm 6        -> 1   (hidden lockfile 도입 이전 포맷)
#     npm 7, 8     -> 2   (v1 하위호환 필드 동반 포맷)
#     npm 9,10,11  -> 3   (v1 하위호환 필드 제거 포맷)
#   매핑에 없는 메이저는 침묵 통과시키지 않는다 — 'lockfileVersion 매핑 unknown' 라벨 +
#   rc≠0 으로 전이한다. 신규 메이저 도입 시 위 표에 공식 문서 근거와 함께 행을 추가한다.
#   대조 기준은 **실측 매니저 메이저**다: lockfile 을 다시 쓰는 주체는 선언이 아니라 실행
#   중인 매니저이므로 게이트는 production 이 소비하는 표면을 측정한다 (RULE-06 §관측 표면).
#
# Exit codes:
#   0 - 격차 0 (PASS)
#   1 - 측정 불가 (package.json 부재 / `npm -v` 실측 실패)
#   2 - engines.npm 부재 + packageManager 부재 (FR-01 위반, 0/2 채널 — 기존 의미 보존)
#   3 - 격차 1+ (npm major 격차 / lockfileVersion 격차 / lockfileVersion 매핑 unknown)
#
# Output ((I13) 양측 동시 박제 — 성공·실패 어느 경로에서도 선언·실측을 함께 낸다):
#   PASS -> stdout: 'package-manager coherence: engines.npm=<r> packageManager=<p> \
#                    declared=<N> runtime=<N> lockfileVersion=<N> aligned'
#   FAIL -> stdout: 격차 카테고리 라벨 grep 가능 + 동일 선언/실측 요약 라인
#           ('engines.npm 부재' / 'packageManager 부재' / 'npm major 격차 N' /
#            'lockfileVersion 격차 N' / 'lockfileVersion 매핑 unknown (npm major=N)' /
#            'npm 런타임 실측 불가')
#
# 본 게이트는 read-only — package.json / package-lock.json 을 수정하지 않는다.
#
# 색상 방어 (판독 표면 계약 FR-01·FR-05) — 도구 캡처가 색상을 받지 않게 한다:
#   (a) 도구 호출에 'NO_COLOR=1 FORCE_COLOR=0' 행 단위 접두 — 색상화 자체를 끈다.
#   (b) 캡처 직후 strip_ansi 로 잔여 SGR 시퀀스 제거 — 상위 래퍼가 주입한 색상을 벗긴다.
#   행 단위 접두를 택한 이유: 도구 캡처 지점이 소수(node -e 2 + npm -v 1)라 오염원 옆에
#   방어를 붙이는 편이 누락 검출이 쉽다 (전역 export 는 하위 프로세스 전파가 암묵적).
#   방어가 없으면 'npm -v' 가 색상화됐을 때 grep -oE '[0-9]+' 가 버전 숫자가 아니라
#   SGR 파라미터(예: 33)를 먼저 집어 runtime_major 가 조용히 오염된다.

set -u

# 판독 전 ANSI SGR 제거 (FR-01·FR-05). '^'/'$' 앵커와 grep -oE 판독은 이 필터를 거친
# 입력에 대해서만 수행한다 — 색상이 켜지면 행두는 ESC, 행말은 리셋 시퀀스다.
strip_ansi() { LC_ALL=C sed "s/$(printf '\033')\[[0-9;]*m//g"; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

PKG_JSON="$ROOT/package.json"
LOCK_JSON="$ROOT/package-lock.json"

if [ ! -f "$PKG_JSON" ]; then
  printf 'check-package-manager-coherence: package.json not found at %s\n' "$PKG_JSON" >&2
  exit 1
fi

# 선언 채널 (a)(b) — node 로 추출 (수단 중립, 구체 메이저 숫자 비박제)
engines_npm="$(NO_COLOR=1 FORCE_COLOR=0 node -e "const p=require('./package.json'); const v=p.engines && p.engines.npm; if(!v){process.exit(10)} process.stdout.write(String(v))" 2>/dev/null || true)"
engines_npm="$(printf '%s' "$engines_npm" | strip_ansi)"
package_manager="$(NO_COLOR=1 FORCE_COLOR=0 node -e "const p=require('./package.json'); const v=p.packageManager; if(!v){process.exit(10)} process.stdout.write(String(v))" 2>/dev/null || true)"
package_manager="$(printf '%s' "$package_manager" | strip_ansi)"

labels=""

if [ -z "$engines_npm" ]; then
  printf 'engines.npm 부재\n'
else
  labels="${labels}engines.npm=${engines_npm} "
fi

if [ -z "$package_manager" ]; then
  printf 'packageManager 부재\n'
else
  labels="${labels}packageManager=${package_manager} "
fi

# FR-01: 0/2 채널이면 즉시 실패 (기존 exit 2 의미 보존)
if [ -z "$engines_npm" ] && [ -z "$package_manager" ]; then
  printf 'package-manager coherence: FAIL (0/2 채널)\n' >&2
  exit 2
fi

# 선언 메이저 — packageManager 우선, 부재 시 engines.npm (§공개 인터페이스 측정 명령 (D) 와 동일 우선순위)
declared_src="${package_manager:-$engines_npm}"
declared_major="$(printf '%s' "$declared_src" | grep -oE '[0-9]+' | head -n1 || true)"

# 실측 축 (c) — 실행 중인 매니저 버전. 토큰 존재가 아니라 실행 출력이 근거다 ((I10)).
runtime_version="$(NO_COLOR=1 FORCE_COLOR=0 npm -v 2>/dev/null | head -n1 || true)"
runtime_version="$(printf '%s' "$runtime_version" | strip_ansi)"
runtime_major="$(printf '%s' "$runtime_version" | grep -oE '[0-9]+' | head -n1 || true)"

# lockfile 축 (d)
lock_version=""
if [ -f "$LOCK_JSON" ]; then
  lock_version="$(grep -oE '"lockfileVersion"[[:space:]]*:[[:space:]]*[0-9]+' "$LOCK_JSON" | head -n1 | grep -oE '[0-9]+' | tail -n1 || true)"
fi

summary="${labels}declared=${declared_major:-unknown} runtime=${runtime_major:-unknown} lockfileVersion=${lock_version:-none}"

if [ -z "$runtime_major" ]; then
  printf 'npm 런타임 실측 불가\n'
  printf 'package-manager coherence: %s FAIL (실측 축 부재)\n' "$summary"
  exit 1
fi

gaps=0

# (I2)/(I10): 선언 메이저 ↔ 실측 메이저
if [ -z "$declared_major" ]; then
  printf 'npm major 격차 unknown (선언 메이저 파싱 불가: %s)\n' "$declared_src"
  gaps=$((gaps + 1))
elif [ "$declared_major" != "$runtime_major" ]; then
  if [ "$declared_major" -gt "$runtime_major" ]; then
    major_gap=$((declared_major - runtime_major))
  else
    major_gap=$((runtime_major - declared_major))
  fi
  printf 'npm major 격차 %d\n' "$major_gap"
  gaps=$((gaps + 1))
fi

# (I3): lockfileVersion ↔ 실측 매니저 메이저 호환 포맷 (매핑표는 헤더 주석 박제)
case "$runtime_major" in
  6) expected_lock=1 ;;
  7 | 8) expected_lock=2 ;;
  9 | 10 | 11) expected_lock=3 ;;
  *) expected_lock="" ;;
esac

if [ -z "$lock_version" ]; then
  printf 'lockfileVersion 격차 1 (package-lock.json 부재 또는 lockfileVersion 키 부재)\n'
  gaps=$((gaps + 1))
elif [ -z "$expected_lock" ]; then
  # 매핑 미등재 메이저 — 침묵 통과 금지
  printf 'lockfileVersion 매핑 unknown (npm major=%s)\n' "$runtime_major"
  gaps=$((gaps + 1))
elif [ "$lock_version" != "$expected_lock" ]; then
  if [ "$lock_version" -gt "$expected_lock" ]; then
    lock_gap=$((lock_version - expected_lock))
  else
    lock_gap=$((expected_lock - lock_version))
  fi
  printf 'lockfileVersion 격차 %d (expected %s for npm major %s)\n' "$lock_gap" "$expected_lock" "$runtime_major"
  gaps=$((gaps + 1))
fi

# (I11): 격차 1+ 는 반드시 rc≠0 으로 전이 — 경고만 남기고 성공하는 경로 없음
if [ "$gaps" -gt 0 ]; then
  printf 'package-manager coherence: %s FAIL (격차 %d)\n' "$summary" "$gaps"
  exit 3
fi

printf 'package-manager coherence: %s aligned\n' "$summary"
exit 0
