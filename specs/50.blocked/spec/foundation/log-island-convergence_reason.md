# `log-island-convergence` 격리 사유

> **격리 tick**: 20th planner session @ HEAD=`7477189`
> **원위치**: `30.spec/green/foundation/log-island-convergence.md`
> **격리 후**: `50.blocked/spec/foundation/log-island-convergence.md`
> **spec hash (SHA-1)**: `9d8e1b43373647dbdff5810893af964ee67af4b1` (18th/19th/20th tick 동일 — inspector 미터치 `a9529185` 이후 변경 0)

## 결정 근거 (19th 행동지침 (1) 가이드 정합 + 정체 2회차 도달)

### (a) RULE-02 재시도 금지 chain (island-proptypes-removal) 미해소
`island-proptypes-removal` (REQ-20260517-062, 60.done revive 완료) 의 9th-13th tick 격리 시계열 + TSK-20260517-{01,02,03} 환경 회귀 chain 박제 잔존. 본 spec §동작 1 의 `find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit 수렴 task 발행 시 동일 환경 회귀 chain 재진입 예측 = RULE-02 멱등 위반.

### (b) 환경 회귀 미회복 (typecheck + lint pre-commit hook chain)
20th tick 재실측:
- `npx tsc --noEmit` → TS6046 (`moduleResolution Bundler` 미인식, tsconfig.json:6) + TS2688 (`vitest/globals` 미해석) + TS5070 (`resolveJsonModule` + node 외, tsconfig.json:15) 3 hit (tsconfig 경로, `src/Log/` 0 hit). 본 spec §동작 2 (FR-02 typecheck error 0 hit) precondition 미충족 — REQ-064 (`devbin-install-integrity`, 16th 격리 / 17th revive followup) 해소 의존.
- `npm run lint` → ERR_MODULE_NOT_FOUND `@eslint/js` (eslint.config.js ESM import 실패). pre-commit hook chain 차단 → developer 가 src/Log/ commit 시 hook fail-fast 발동.
- `node_modules/{vite,vitest,@eslint/js}` ABSENT (20th tick 신규 악화 신호 — 19th tick 박제 `@eslint/js EXIST` 대비 사라짐).

### (c) §island-proptypes-removal chain TSK-20260517-{01,02,03} 영구 박제 — ID 재발행 분기 차단
TSK-20260517-01 / -02 / -03 ID 는 9th tick 발행 후 50.blocked/task/ 격리 + /revisit followup → 60.done/2026/05/17/followups/ 박제 잔존. RULE-01 영구 박제 ID 재사용 금지 정합. 본 spec carve 시 TSK-20260517-04~99 신규 채번 가능하나, (a)+(b) 분기로 멱등 위반.

### (d) RULE-05 정식 복귀 경로 (`/revisit`) 만 해소 가능
본 격리 사유는 RULE-07 위반 아님 — §역할 line 10 박제 "수렴 수단 (rename + tsc 통과 vs codemod vs 점진적 cohort 분할 vs strict 점진 도입) 은 본 spec 비박제 — task 계층 위임" 수단 중립 메타 spec 정합. 격리 사유는 **RULE-01 writer 매트릭스 (developer = src/) + RULE-02 산출물 경계 충돌 + RULE-02 재시도 금지 chain (island-proptypes-removal) + 환경 회귀 의존 + hash 정체 2회차** 조합 분기.

`/revisit` 스킬 판정:
- **revive 분기**: 환경 회귀 회복 (`npx tsc --noEmit` exit 0 + `npm run lint` exit 0 + `node_modules/{vite,vitest,@eslint/js,typescript,eslint}` 모두 존재 + pre-commit hook chain 회복) + island-proptypes-removal chain TSK-20260517-{01,02,03} 환경 회귀 chain followup 처리 완료 신호 → 10.followups/ 로 승격 (revive) → discovery 재흡수 → inspector green spec 재진입 → planner carve 진입 가능.
- **close 분기**: src-typescript-migration island 정의 자체가 도구 의존 (typescript@5.x 채택 결정) 으로 spec 박제 불요 판정 시 → 60.done/2026/05/17/revisit/log-island-convergence.md 1~2줄 감사노트 후 close.

## 회복 조건 (carve 진입 회복 — 19th 행동지침 (7) 정합)
**(i) 환경 회귀 회복**: `npx tsc --noEmit` exit 0 (TS6046/2688/5070 3 hit 해소) + `npm run lint` exit 0 (`@eslint/js` ESM resolve 성공) + `node_modules/{vite,vitest,eslint,@eslint/js,typescript}` 모두 존재.
**(ii) RULE-02 재시도 금지 chain 해소**: `island-proptypes-removal` 9th-13th 격리 시계열 + TSK-20260517-{01,02,03} 환경 회귀 chain followup 처리 완료 신호 (60.done revive 후 discovery 재흡수 → 신규 task 발행 시 동일 환경 회귀 미재발 검증).
**(iii) precondition spec 해소**: `devbin-install-integrity` (REQ-064) + `path-alias-resolver-coherence` (REQ-065) /revisit 처리 완료.

(i)+(ii)+(iii) 동시 충족 시 carve 진입 가능 (산출물 `src/Log/` developer writer 영역 정합 + baseline 위반 ≥1 정합 = 16th 박제 (3) src/ 내부 carve 가능 카테고리 정합).

## 격리 시계열 누적 (19th 박제 (8) 갱신)
toolchain-version-coherence (5th-7th) → island-proptypes-removal (9th-13th, revive 완료) → runtime-dep-version-coherence (11th-13th, revive 완료) → devbin-install-integrity (16th, 17th revive followup) → path-alias-resolver-coherence (16th, 17th close) → vite-jsx-transform-channel-coherence (18th) → test-discovery-population-coherence (19th) → eslint-linter-options-default-override (19th) → **log-island-convergence (20th, 본 격리)**. 9 spec 모두 수단 중립 메타 spec + developer writer 영역 밖 또는 chain 의존 + hash 정체 + 환경 회귀 미회복 시계열.
