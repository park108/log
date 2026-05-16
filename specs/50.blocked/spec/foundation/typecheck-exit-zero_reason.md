# typecheck-exit-zero.md blocked reason

## 격리 일자
2026-05-17 (planner 3차 tick)

## 격리 사유
**정체 2회차** (`.planner-seen` hash 동일 유지) + **typescript 환경 회귀 미해소 지속**.

## 정체 추적
- planner 2차 tick (2026-05-17 06:55): hash `fe3f184...` → `b682e83a...` 로 변경 (inspector reconcile [x] re-gate 박제 8건 flip 으로 hash 변화) — 정체 1회차 재카운트.
- planner 3차 tick (2026-05-17 본 세션): hash `b682e83ab5c7ab0b21db5e8e24ac0c5e05d556a17081677cdabb60dabe17d644` **동일 유지** — 정체 2회차 진입.
- 직전 tick `.planner-seen` 의 명시 행동지침: "typecheck-exit-zero 정체 2회차 진입 시 (다음 tick 에서 동일 hash b682e83 유지면) 50.blocked/spec/ 격리" — 조건 충족.

## 환경 회귀 (carve 차단 근본 원인)
HEAD=`4c84b86` 실측 `npm run typecheck` rc=**2** + `error TS` **3 hit** (`src/**` 0 hit):
- `TS2688: Cannot find type definition file for 'vitest/globals'` — `tsconfig.json` types 경로.
- `tsconfig.json(6,23): error TS6046` — `--moduleResolution` 값 `"Bundler"` 미인식 (`typescript@4.9.3` installed devDep 정합 회귀 — `tsc --version` 가 `Bundler` 옵션 미지원 버전 반환).
- `tsconfig.json(15,3): error TS5070` — `--resolveJsonModule` 의 `node` moduleResolution 의존 (위 TS6046 의 부수 효과).

3 hit 모두 `tsconfig.json` 경로 잔존이며 `src/**` 0 hit — typescript 설치/구성 환경 회귀가 본 spec 의 FR-01 (`npm run typecheck` rc=0 + `error TS` 0 hit) 수렴을 차단. 본 환경에서 `error TS` baseline 재현 자체 불가 — RULE-06 grep dry-run 실측 박제 불가능.

## 격리 후 처리 (RULE-05 수동 경로)
1. 운영자가 typescript 환경 회귀 해소: `typescript` devDep 정합 (`tsconfig.json` 의 `"moduleResolution": "Bundler"` 인식 버전 설치 — TypeScript 5.0+) 또는 `tsconfig.json` `moduleResolution` 값 정합 (`"node16"` / `"nodenext"` 등 현 설치 버전 호환 값으로 교정).
2. `npm run typecheck` rc=0 + `error TS` 0 hit (또는 적어도 `tsconfig.json` 경로 0 hit) 확인 후 RULE-05 `/revisit` 스킬로 `10.followups/` 승격.
3. inspector 가 `.followups → 20.req` 변환 (필요 시) → green 복귀 → planner 가 carve 가능.

## RULE-07 자기검증
본 spec 자체는 RULE-07 양성 (평서형 시스템 불변식 · 시점 비의존 · 반복 검증 가능). 격리 사유는 **외부 환경 회귀로 인한 carve 차단** 이며 spec 내용 결함 아님. 본 격리는 환경 회복 후 정상 복귀 예정.

## 관련 직전 blocked 3건 (동일 환경 회귀 사유)
- `coverage-determinism` (planner 2차 tick 격리 후 4c84b86 revisit followup 승격 + 삭제).
- `src-typescript-migration` (동일).
- `tsconfig-test-ambient-globals` (동일).

본 spec 은 그 3건의 후행 격리 — 동일 환경 회귀 근본 원인 + 정체 2회차 조건 동시 충족. 환경 회복 후 4건 모두 동시 복귀 예정.
