#!/usr/bin/env bash
# 격리 픽스처 — 실행 대상 아님 / TSK-20260825-38
# **env-class 더미 게이트** — 본문에 `.env*` 도출을 가지므로 (J-1) 전항 요구의 대상이다.
set -u
ENV_SCAN_ROOT="${FIXTURE_ENV_SCAN_ROOT:-.}"
ENVFILES="$(git ls-files ".env*" 2>/dev/null | sort)"
printf 'fixture env gate: %s\n' "$ENVFILES"
exit 0
