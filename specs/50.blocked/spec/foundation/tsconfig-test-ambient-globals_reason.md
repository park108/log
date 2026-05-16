# tsconfig-test-ambient-globals — 2회차 정체 격리 사유

> 격리 시점: 2026-05-17 (planner @HEAD=`a1755b5`).
> 원위치: `specs/30.spec/green/foundation/tsconfig-test-ambient-globals.md` → `specs/50.blocked/spec/foundation/tsconfig-test-ambient-globals.md`.

## 정체 카운트
- 직전 tick `.planner-seen` hash: `ea238dafad524c64cf50e08b8b994dacb334c942562a202dac24873dd4e3b4af`.
- 본 tick hash: `ea238dafad524c64cf50e08b8b994dacb334c942562a202dac24873dd4e3b4af` — **동일 diff-hash 2회 정체**.

## 정체 사유
- spec FR-01 게이트: `npm run typecheck 2>&1 | grep -E "src/.*\.test\.(ts|tsx):" | grep -cE "TS2304"` → 0 목표. 본 환경 (HEAD=`a1755b5`) typescript@4.9.3 + `moduleResolution: "Bundler"` 미인식 → `tsc --noEmit` rc=2 + `TS6046`/`TS5070`/`TS2688` 3 hit (preprocessing 단계 실패). `src/**/*.test.{ts,tsx}` 까지 typecheck pass 가 도달하지 않아 TS2304 측정 시 0 hit 가 "수렴" 인지 "실패로 인한 측정 누락" 인지 식별 불능 — RULE-06 grep-baseline 박제 충족 불능.
- spec FR-03 precondition (regression-gate FR-01 의 typecheck step 상시 green) 검증: 동일 환경 회귀 영향 — CI `npm run typecheck` step 본 환경 rc=2 → 상시 green 검증 불능.
- spec FR-02 (수단 중립성) / FR-06 (버전 무관 표현) 은 grep 검증 — 환경 회귀 무관. 단독 task carve 가능하나 FR-01/FR-03 미수렴 상태에서 부분 carve 시 spec 자체 승격 불가 (4 조건 unchecked 잔존) → 본 spec 만 단독 carve 후 blocked 격리는 의미 없음. 환경 해소 시 일괄 carve 효율 더 큼.

## 해제 경로 (RULE-05)
1. typescript 환경 회귀 해소.
2. inspector 가 본 환경에서 typecheck baseline 재실측 (spec §grep-baseline 의 `error TS 0 hit @HEAD=f34419e` 와 본 환경 실측 비교, 필요 시 baseline 갱신).
3. `/revisit` 후 30.spec/green/ 복귀.

## 박제 hash
- spec sha256: `ea238dafad524c64cf50e08b8b994dacb334c942562a202dac24873dd4e3b4af`.
