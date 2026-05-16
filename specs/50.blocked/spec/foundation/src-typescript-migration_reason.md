# src-typescript-migration — 2회차 정체 격리 사유

> 격리 시점: 2026-05-17 (planner @HEAD=`a1755b5`).
> 원위치: `specs/30.spec/green/foundation/src-typescript-migration.md` → `specs/50.blocked/spec/foundation/src-typescript-migration.md`.

## 정체 카운트
- 직전 tick (2026-05-17 planner) `.planner-seen` hash: `d0e06374ff321e0a50e2f7e2c6fc5941424a5d5e36fc4ea5bfb97b2902bb961f`.
- 본 tick hash: `d0e06374ff321e0a50e2f7e2c6fc5941424a5d5e36fc4ea5bfb97b2902bb961f` — **동일 diff-hash 2회 정체**.

## 정체 사유
- spec FR-01/FR-02 게이트: `find src -name "*.jsx" | wc -l` / `find src -name "*.js" ! -name "*.test.js" ! -name "*.d.ts"` → 0 목표. 현 환경 실측 (HEAD=`a1755b5`):
  - `find src -name "*.jsx"` → `src/index.jsx` 1건 잔존.
  - `find src -name "*.js" ! -name "*.test.js" ! -name "*.d.ts"` → `src/reportWebVitals.js` + `src/setupTests.js` 잔존.
  - `find src -name "*.test.jsx"` → 0. `find src -name "*.test.js"` → `src/reportWebVitals.test.js` 1건 잔존.
- spec FR-04 게이트 (혼재 허용 중 lint/test/build/coverage 4축 동시 성립): `npm run typecheck` 차원 부가 (FR-04 의 typecheck-exit-zero FR-02 5항목 증분 관계) — 본 환경 typescript@4.9.3 + `moduleResolution: "Bundler"` 미인식 → `tsc --noEmit` rc=2 + `TS6046`/`TS5070`/`TS2688` 3 hit. `error TS` 카테고리 정상 측정 불능 → island 확정 baseline 박제 불가.
- spec FR-05 island DoD: typecheck-exit-zero FR-03 증분 관계 — 동일 환경 회귀 영향.
- carve 가능 잔여 단일 task 후보: 
  - `src/index.jsx → src/index.tsx` 확장자 스위칭 (Toaster·File·Search·Image·Comment island 패턴 동등). 단, 본 환경에서 typecheck rc=0 검증 불가 → task FR-04 5항목 동시 성립 ack 박제 불가.
  - `src/reportWebVitals.{js→ts}` + `src/reportWebVitals.test.{js→ts}` 동시 스위칭. 동일 사유.
  - `src/setupTests.{js→ts}` 단독 스위칭. 동일 사유.

## 해제 경로 (RULE-05)
1. typescript 환경 회귀 해소 (devDep installed 정합 또는 tsconfig `moduleResolution` 표기 정합).
2. inspector 가 본 환경에서 typecheck baseline 재실측 (spec §baseline 의 `error TS` 카테고리 분포가 본 환경에서 재현 가능해야 함).
3. `/revisit` 후 inspector 가 본 spec 갱신 → 30.spec/green/ 복귀.

## 박제 hash
- spec sha256: `d0e06374ff321e0a50e2f7e2c6fc5941424a5d5e36fc4ea5bfb97b2902bb961f`.
