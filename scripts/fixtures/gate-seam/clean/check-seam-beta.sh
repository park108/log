#!/usr/bin/env bash
# 격리 픽스처 — 실행 대상 아님 / TSK-20260825-38
# check-gate-seam-coverage.sh 가 **텍스트로만** 판정한다 (실행하지 않으므로 chmod +x 불요).
# 이 파일이 존재하는 이유: seam 커버리지 게이트의 민감도를 실 scripts/check-*.sh 를
# 건드리지 않고 왕복 측정하기 위해서다.
set -u
SCAN_ROOT="${FIXTURE_BETA_SCAN_ROOT:-src}"
printf 'fixture gate (%s) root=%s\n' "beta" "$SCAN_ROOT"
exit 0
