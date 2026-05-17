---
source_blocked: specs/50.blocked/spec/foundation/monitor-island-convergence.md
category: blocked-revisit
severity: high
observed_at: 2026-05-17T06:49:56Z
---

# monitor-island-convergence — island-proptypes-removal chain 미해소로 blocked 격리

## 관찰
- 격리 시점: planner 20th tick @HEAD=`7477189` (2026-05-17).
- spec hash (SHA-1): `01acbefd9ddfc60215d321823342f2bc2f636933` (18th/19th/20th tick 동일 — inspector 미터치 `a9529185` 이후 변경 0).
- 정체 회차: 2회차.

## 재현
- (a) **RULE-02 재시도 금지 chain** (`island-proptypes-removal`, REQ-20260517-062, 60.done revive 완료) 의 9th-13th tick 격리 시계열 + TSK-20260517-{01,02,03} 환경 회귀 chain 박제 잔존. 본 spec §동작 1 `find src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit 수렴 task 발행 시 동일 chain 재진입 예측 = 멱등 위반.
- (b) **환경 회귀 미회복**:
  - `npx tsc --noEmit` → TS6046 + TS2688 + TS5070 3 hit (tsconfig 경로, `src/Monitor/` 0 hit). §동작 2 (FR-02) precondition 미충족.
  - `npm run lint` → ERR_MODULE_NOT_FOUND `@eslint/js`. pre-commit hook chain 차단.
  - `node_modules/{vite,vitest,@eslint/js}` ABSENT.
- (c) **산출물 baseline**: 17 hit (`find src/Monitor .jsx/.js`) + PropTypes 20 hit (19th 박제 재실측 동일). developer writer 영역 내부 정합이나 (a)+(b) chain 으로 carve 시 `50.blocked/task/` 재진입.

## 후속 필요 사항
1. **환경 회귀 회복** + **island-proptypes-removal chain 해소 신호** (TSK-20260517-01 후속 followup 처리 완료).
2. discovery 흡수 → 재흡수 → inspector → `30.spec/green/foundation/monitor-island-convergence.md` 복귀.
3. carve 진입 전제 3 조건 동시 충족 필요: (i) 환경 회귀 회복 + (ii) RULE-02 재시도 금지 chain 해소 + (iii) precondition spec 해소.

## 참고
- RULE-07 정합 (§역할 line 10: "수렴 수단 (rename / codemod / cohort 분할 / 변환 순서) 은 본 spec 비박제 — task 계층 위임" 수단 중립 메타 spec).
- 격리 시계열 누적 (20th tick 박제): 9 spec 모두 동일 카테고리 — `toolchain-version-coherence` → `island-proptypes-removal` (revive) → `runtime-dep-version-coherence` (revive) → `devbin-install-integrity` → `path-alias-resolver-coherence` (close) → `vite-jsx-transform-channel-coherence` → `test-discovery-population-coherence` → `eslint-linter-options-default-override` → **본 spec 외 동시 4건**.
