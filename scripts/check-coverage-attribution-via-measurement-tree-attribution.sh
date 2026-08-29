#!/usr/bin/env bash
# check-coverage-attribution-via-measurement-tree-attribution.sh
# Spec: foundation/measurement-tree-attribution-wrapper-adoption §수용 기준 (W-2)(W-6)
# Task: TSK-20260829-05
#
# `check:coverage-attribution` 의 진입점. 단조성 판정을 **측정 트리 귀속 래퍼로 한 겹 감싼다**.
# 그 게이트는 전수 1회 + 샤드 12회를 4~6분에 걸쳐 돌리고 두 결과를 대조하므로, 측정 창 안에서
# 트리가 변하면 산출 rc 는 **존재하지 않는 트리의 rc** 다. 2026-08-25 에 그렇게 난 오보가
# `완전성 붕괴 (등급 4)` 로 올라가 없는 결함이 carve 후보가 됐다.
#
# 이 파일이 존재하는 이유는 채택이 **실행 경유**여야 하기 때문이다 (§동작 §이름은 채널이 아니다).
# 키 값 문자열이나 파일 이름에 래퍼 식별자가 들어가는 것은 채택이 아니다 — 래퍼 호출은 아래
# **실행 라인**에 있어야 한다. 또한 `package.json` 값은 `bash scripts/<name>.sh` 단일 형태를
# 유지해야 하므로 (`check-gate-wiring.sh` FR-01 `VALUE_RE`) 인자는 이 한 겹이 흡수한다.
#
# 인자는 전량 전달한다 — 픽스처 대조 모드(`--full` / `--subset` / `--allow-empty`)가 소비자를
# 경유해도 동작해야 한다.
#
# exit: 래퍼 등급이 그대로 전파된다.
#   0 감싼 판정 rc=0 이고 측정 구간 트리 불변
#   1 측정 구간 트리 드리프트 (category: measurement-tree-drift) — 감싼 rc 와 무관
#   2 래퍼 fail-closed (지문 산출 불가)
#   그 밖 단조성 판정 자신의 rc (등급 재배정은 본 파일 소관이 아니다 —
#   소유 계약은 blue foundation/measurement-tree-attribution).

set -euo pipefail

exec bash scripts/check-measurement-tree-attribution.sh -- bash scripts/check-coverage-attribution-monotonicity.sh "$@"
