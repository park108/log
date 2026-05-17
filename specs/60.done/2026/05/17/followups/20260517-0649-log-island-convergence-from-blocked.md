---
source_blocked: specs/50.blocked/spec/foundation/log-island-convergence.md
category: blocked-revisit
severity: high
observed_at: 2026-05-17T06:49:56Z
---

# log-island-convergence — island-proptypes-removal chain + 환경 회귀로 blocked 격리

## 관찰
- 격리 시점: planner 20th tick @HEAD=`7477189` (2026-05-17).
- spec hash (SHA-1): `9d8e1b43373647dbdff5810893af964ee67af4b1` (18th/19th/20th tick 동일 — inspector 미터치 `a9529185` 이후 변경 0).
- 정체 회차: 2회차.
- ID 충돌 메타: REQ-068 = `eslint-linter-options-default-override` + `log-island-convergence` 동시 박제 (discovery 재흡수 시 ID 재배정 필요).

## 재현
- (a) **RULE-02 재시도 금지 chain** (`island-proptypes-removal` 9th-13th + TSK-20260517-{01,02,03} 환경 회귀 chain 잔존). 본 spec §동작 1 `find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit 수렴 task 발행 시 동일 chain 재진입 = 멱등 위반.
- (b) **환경 회귀 미회복**:
  - `npx tsc --noEmit` → TS6046 (`moduleResolution Bundler`, tsconfig.json:6) + TS2688 (`vitest/globals`) + TS5070 (`resolveJsonModule` + node 외, tsconfig.json:15) 3 hit. §동작 2 (FR-02) precondition 미충족.
  - `npm run lint` → ERR_MODULE_NOT_FOUND `@eslint/js` (eslint.config.js ESM import 실패). pre-commit hook chain 차단 → `src/Log/` commit 시 hook fail-fast.
  - `node_modules/{vite,vitest,@eslint/js}` ABSENT (20th tick 신규 악화 신호 — 19th 박제 `@eslint/js EXIST` 대비 사라짐).
- (c) **TSK-20260517-{01,02,03} 영구 박제** — RULE-01 ID 재사용 금지. 본 spec carve 시 TSK-20260517-04~99 신규 채번 가능하나 (a)+(b) 멱등 위반.

## 후속 필요 사항
1. **환경 회귀 회복**: `npx tsc --noEmit` exit 0 (TS6046/2688/5070 3 hit 해소) + `npm run lint` exit 0 (`@eslint/js` ESM resolve 성공) + `node_modules/{vite,vitest,eslint,@eslint/js,typescript}` 모두 존재.
2. **RULE-02 재시도 금지 chain 해소**: `island-proptypes-removal` 9th-13th 격리 시계열 + TSK-20260517-{01,02,03} 환경 회귀 chain followup 처리 완료 신호 (60.done revive 후 discovery 재흡수 → 신규 task 발행 시 동일 환경 회귀 미재발 검증).
3. **precondition spec 해소**: `devbin-install-integrity` (REQ-064) + `path-alias-resolver-coherence` (REQ-065) /revisit 처리 완료.
4. (i)+(ii)+(iii) 동시 충족 시 carve 진입 가능 (산출물 `src/Log/` developer writer 영역 정합).

## 참고
- RULE-07 정합 (§역할 line 10: "수렴 수단 (rename + tsc 통과 vs codemod vs 점진적 cohort 분할 vs strict 점진 도입) 은 본 spec 비박제 — task 계층 위임" 수단 중립 메타 spec).
- ID 재배정 필요: 본 spec → 신규 ID (REQ-068 → REQ-068a/b 등).
