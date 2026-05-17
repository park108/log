# `monitor-island-convergence` 격리 사유

> **격리 tick**: 20th planner session @ HEAD=`7477189`
> **원위치**: `30.spec/green/foundation/monitor-island-convergence.md`
> **격리 후**: `50.blocked/spec/foundation/monitor-island-convergence.md`
> **spec hash (SHA-1)**: `01acbefd9ddfc60215d321823342f2bc2f636933` (18th/19th/20th tick 동일 — inspector 미터치 `a9529185` 이후 변경 0)

## 결정 근거 (19th 행동지침 (2) 가이드 정합 + 정체 2회차 도달)

### (a) RULE-02 재시도 금지 chain (island-proptypes-removal) 미해소
`island-proptypes-removal` (REQ-20260517-062, 60.done revive 완료) 의 9th-13th tick 격리 시계열 + TSK-20260517-{01,02,03} 환경 회귀 chain 박제 잔존. 본 spec §동작 1 의 `find src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit 수렴 task 발행 시 동일 환경 회귀 chain 재진입 예측 = RULE-02 멱등 위반.

### (b) 환경 회귀 미회복 (typecheck + lint pre-commit hook chain)
20th tick 재실측:
- `npx tsc --noEmit` → TS6046 + TS2688 + TS5070 3 hit (tsconfig 경로, `src/Monitor/` 0 hit). 본 spec §동작 2 (FR-02 typecheck error 0 hit) precondition 미충족 — REQ-064 (`devbin-install-integrity`) 해소 의존.
- `npm run lint` → ERR_MODULE_NOT_FOUND `@eslint/js`. pre-commit hook chain 차단.
- `node_modules/{vite,vitest,@eslint/js}` ABSENT.

### (c) 산출물 `src/Monitor/` baseline + chain 의존
17 hit (find src/Monitor .jsx/.js) + PropTypes 20 hit (19th 박제 재실측 동일). developer writer 영역 내부 정합이나 (a)+(b) chain 으로 carve 시 50.blocked/task/ 재진입 멱등 위반.

### (d) RULE-05 정식 복귀 경로 (`/revisit`) 만 해소 가능
본 격리 사유는 RULE-07 위반 아님 — §역할 line 10 박제 "수렴 수단 (rename / codemod / cohort 분할 / 변환 순서 — Mon 집약 컴포넌트 먼저 vs Item 요소 컴포넌트 먼저 vs api 먼저) 은 본 spec 비박제 — task 계층 위임" 수단 중립 메타 spec 정합. 격리 사유는 **RULE-02 재시도 금지 chain + 환경 회귀 의존 + hash 정체 2회차** 조합 분기.

`/revisit` 스킬 판정:
- **revive 분기**: 환경 회귀 회복 + island-proptypes-removal chain followup 처리 완료 신호 → 10.followups/ 승격 → discovery 재흡수.
- **close 분기**: src-typescript-migration island 정의 자체 도구 의존 spec 박제 불요 판정 시 → 60.done/2026/05/17/revisit/monitor-island-convergence.md 감사노트 후 close.

## 회복 조건 (log-island-convergence_reason.md 와 동일 — 19th 행동지침 (7))
**(i) 환경 회귀 회복** + **(ii) RULE-02 재시도 금지 chain 해소** + **(iii) precondition spec 해소**. 3 조건 동시 충족 시 carve 진입 가능 (산출물 `src/Monitor/` developer writer 영역 정합).
