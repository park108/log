#!/usr/bin/env bash
# check-build-artifact.sh
# Spec: foundation/build-artifact-gate-measurement-contract §발화 채널 · foundation/gate-wiring-execution-surface-coherence §동작 FR-01
# Task: TSK-20260827-01
set -eu
esc=$(printf '\033')
outdir=$(sed -n "s/.*outDir:[[:space:]]*'\([^']*\)'.*/\1/p" vite.config.js | head -1)
[ -n "$outdir" ] || { echo "check:build-artifact: vite.config.js 의 outDir 미검출 — 도출 규칙 붕괴" >&2; exit 1; }
files=$(grep -rlE "buildArtifactGate|outDir|join\([[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*,[[:space:]]*[\"']$outdir[\"']" src --include='*.test.ts' --include='*.test.tsx' --include='*.test.js' --include='*.test.jsx' | sort)
[ -n "$files" ] || { echo "check:build-artifact: 대상 0건 — 도출 규칙이 공집합을 냈다 (vacuous zero)" >&2; exit 1; }
echo "[check:build-artifact] outDir=$outdir · 도출 대상:"
echo "$files" | sed 's/^/  /'
out=$(NO_COLOR=1 npx vitest run $files 2>&1) || { echo "$out"; echo "check:build-artifact: 산출물 대상 픽스처 FAIL" >&2; exit 1; }
echo "$out"
summary=$(echo "$out" | sed "s/${esc}\[[0-9;]*m//g" | grep -E "^[[:space:]]*Tests[[:space:]]" | tail -1)
case "$summary" in *skipped*|*todo*) echo "check:build-artifact: 미측정 잔존 —$summary — 산출물이 있어야 할 시점의 skip 은 초록이 아니다" >&2; exit 1;; esac
case "$summary" in *passed*) : ;; *) echo "check:build-artifact: 요약 미검출 (리포터 형식 변동?) — [$summary]" >&2; exit 1;; esac
echo "[check:build-artifact] 산출물 실측 완료 —$summary"
