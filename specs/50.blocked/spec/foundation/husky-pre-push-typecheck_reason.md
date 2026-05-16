# Blocked reason — husky-pre-push-typecheck

## 격리 사유
환경 회귀 (typescript + ESLint) 미회복 상태에서 본 spec FR-07 의 task 발행 전제 (`foundation/typecheck-exit-zero` FR-01 수렴: `npm run typecheck` rc=0 + `error TS` 0 hit) 미충족 정체가 2 회차 연속 누적.

## 정체 경과
- **1st tick (3rd planner @HEAD=4c84b86)**: 본 spec 1차 노출. carve 유보 (FR-07 게이트 미충족 + 환경 회귀). spec hash `32abb51f...` 박제.
- **2nd tick (4th planner @HEAD=ffaa752)**: 환경 미회복 1회차 재카운트. spec hash 동일 `32abb51f...` 유지 (inspector 미터치). carve 0건.
- **3rd tick (5th planner @HEAD=946dca1)**: 환경 미회복 2회차 — 본 격리 시점. spec hash 동일 `32abb51f...` 유지.

## 환경 회귀 baseline (HEAD=946dca1 실측, 5th tick)
- `npx tsc --noEmit`: TS2688 vitest/globals + TS6046 moduleResolution + TS5070 resolveJsonModule 3 hit 잔존 (3rd / 4th tick 박제와 동일 — 전원 tsconfig 경로 / `src/**` 0 hit).
- `npm run lint`: ERR_MODULE_NOT_FOUND `@eslint/js` 잔존 (3rd / 4th tick 박제와 동일).
- 본 환경 회귀의 root cause 는 본 세션 신규 등록된 `30.spec/green/foundation/toolchain-version-coherence.md` (REQ-20260517-061) §동작 1·2 위반 baseline (devDep `typescript: ^6.0.3` ↔ installed `4.9.3` 메이저 격차 2 + `tsconfig.json:6` `moduleResolution: Bundler` enum 부적합) 으로 박제됨.

## 정식 복귀 경로 (RULE-05)
1. 운영자가 환경 회귀 해소 — `toolchain-version-coherence` §동작 1~5 정합 수렴 (devDep 다운그레이드 vs installed 업그레이드 vs lockfile 재정합 — 수단 중립).
2. `npm run typecheck` rc=0 + `grep -cE "error TS"` 0 hit 검증 (`typecheck-exit-zero` FR-01 수렴 — 현재 followup 승격 완료 후 본 ID 복귀 절차는 discovery 단계).
3. 본 spec 의 정식 복귀: `50.blocked/spec/foundation/husky-pre-push-typecheck.md` → `/revisit` 스킬로 `10.followups/` 승격 (RULE-05). 원본 + `_reason.md` 삭제.
4. discovery 가 followup 흡수 → inspector 가 spec 재발행 (`30.spec/green/foundation/husky-pre-push-typecheck.md`) → planner 가 환경 회복 + FR-07 충족 검증 후 carve.

## 미접촉 영역
- 본 spec 내용 (FR-01~07) 평서문 자체는 **불변식 자체로 유효** — RULE-07 정합 (시점 비의존 평서형 효능 박제). 격리 사유는 spec 콘텐츠 결함이 아닌 **task 발행 전제 (환경 회귀) 의 정체** 이며, 본 spec 박제 내용은 재진입 시 그대로 활용 가능.
- writer 경계: planner 는 본 spec 의 hash 박제 (`32abb51f...`) 검증만 수행하고 spec 본문 미터치. inspector 가 재발행 시 동일 본문 또는 보강 가능.

## 박제 시점
- 격리 일자: 2026-05-17 (planner 5th tick @HEAD=946dca1).
- 격리 mv: `30.spec/green/foundation/husky-pre-push-typecheck.md` → `50.blocked/spec/foundation/husky-pre-push-typecheck.md`.
