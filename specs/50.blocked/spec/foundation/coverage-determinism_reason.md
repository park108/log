# coverage-determinism — 2회차 정체 격리 사유

> 격리 시점: 2026-05-17 (planner @HEAD=`a1755b5`).
> 원위치: `specs/30.spec/green/foundation/coverage-determinism.md` → `specs/50.blocked/spec/foundation/coverage-determinism.md`.

## 정체 카운트
- 직전 tick (2026-05-17 planner) `.planner-seen` hash: `1c515c89cc0a1a90305fa9ebaf10da1491e8b67ebde4bfa486fbf9792cd7b377`.
- 본 tick (2026-05-17 planner 동일자 후속) hash: `1c515c89cc0a1a90305fa9ebaf10da1491e8b67ebde4bfa486fbf9792cd7b377` — **동일 diff-hash 2회 정체**.

## 정체 사유 (직전 tick 노트 + 본 tick 재확인)
- spec baseline 박제 HEAD: REQ-056 측 `a1fedbc` / REQ-057 측 `a2717fb` (§스코프 규칙 (d)(g) 박제).
- 현 환경 HEAD: `a1755b5`. typescript@4.9.3 installed (package.json `^6.0.3` 와 격차) + `tsconfig.json` `moduleResolution: "Bundler"` 미인식 (`tsc --noEmit` → `TS6046: Argument for '--moduleResolution' option must be: 'node', 'classic', 'node16', 'nodenext'` + `TS5070` + `TS2688`).
- 직접 영향 항목:
  - FR-08/FR-09/FR-10 (REQ-056 intermediate ENOENT race + non-0 exit 귀인 + pre-push 독립성) — 본 환경에서 `npm test` 거동이 typescript 환경 회귀에 영향받지 않는다는 보장 없음. coverage provider race 재현 fixture (HEAD=`a1fedbc` 박제) 와 다른 거동이 관측될 수 있어 RULE-06 grep-baseline 박제 충족 불능.
  - FR-11 (REQ-057 extension-glob) — 본 환경 `vite.config.js:85-86` 이미 `src/index.{js,jsx,ts,tsx}` + `src/reportWebVitals.{js,jsx,ts,tsx}` 수렴 완료 (re-gate @HEAD=`a1755b5` 실측 `grep -nE "^\s*'src/[a-zA-Z_][a-zA-Z0-9_]*\.(js|jsx|ts|tsx)',?$" vite.config.js` → 0 hit). spec 본문 `[x]` 박제와 일치 — 단독 수렴 항목.
- carve 가능 잔여 항목: FR-08/FR-09/FR-10 (REQ-056) — typescript 환경 회귀 선행 해소 필요.

## 해제 경로 (RULE-05 — 운영자 영역)
1. typescript 환경 회귀 해소 (devDep `^6.0.3` 명시와 installed `4.9.3` 정합, 또는 `moduleResolution` 표기 정합 — `node16`/`nodenext`/lower-case `bundler` 표기 등).
2. 해소 후 inspector 가 본 환경에서 `npm test` 거동 + `coverage/.tmp/` race 재현 baseline 재실측 (`REQ-056 §재검증 증거` 와 동등 수치 또는 신규 baseline 박제).
3. `/revisit` → `specs/10.followups/` 로 reanimate, discovery → inspector 가 baseline 재박제 후 본 spec 30.spec/green/ 으로 복귀시킴.

## 박제 시점 hash
- spec sha256: `1c515c89cc0a1a90305fa9ebaf10da1491e8b67ebde4bfa486fbf9792cd7b377`.
- planner-seen 이전 tick 일자: 2026-05-17 (`a1755b5` 직전 동일자 세션).
