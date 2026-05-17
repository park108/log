---
source_blocked: specs/50.blocked/spec/foundation/root-entry-island-convergence.md
category: blocked-revisit
severity: high
observed_at: 2026-05-17T06:49:56Z
---

# root-entry-island-convergence — src-typescript-migration island 종착 카테고리, 환경 회귀로 격리

## 관찰
- 격리 시점: planner 20th tick @HEAD=`7477189` (2026-05-17).
- spec hash (SHA-1): `389ef8eea9d2fdeda164a96fa1a6a0e1b291a6e2` (18th/19th/20th tick 동일 — inspector 미터치 `a9529185` 이후 변경 0).
- 정체 회차: 2회차.

## 재현
- (a) **RULE-02 재시도 금지 chain** (`src-typescript-migration` island 정의 마지막 잔존 카테고리): §역할 line 10 박제 "src/ 직계 (maxdepth=1) 7 비-TS 파일 ... `src-typescript-migration` (구 REQ-051) 의 island 정의 (`find src -name "*.jsx" | wc -l` 단축형이 0 으로 수렴하는 종착 조건) 의 **마지막 잔존 카테고리**". `island-proptypes-removal` (9th-13th, revive 완료) chain 의 종착 박제.
- (b) **환경 회귀 미회복**:
  - `npx tsc --noEmit` → TS6046 + TS2688 + TS5070 3 hit (tsconfig 경로, src/ 직계 0 hit). §동작 2 (FR-02) precondition 미충족.
  - `npm run lint` → ERR_MODULE_NOT_FOUND `@eslint/js`. pre-commit hook chain 차단 → `App.jsx` / `index.jsx` 등 root entry 파일 commit 시 hook fail-fast.
  - `node_modules/{vite,vitest,@eslint/js}` ABSENT.
- (c) **산출물 7 파일 root entry 영향**:
  - `App.jsx` (root 컴포넌트) / `index.jsx` (createRoot entry) 변경 = 빌드 entry + JSX runtime + tsconfig include 동시 영향. `node_modules/vite` ABSENT 으로 `npm run build` 비활성 (vite-jsx-transform-channel-coherence 18th 격리 chain 동일 precondition).
  - `setupTests.js` / `setupTests.timer-idiom.test.jsx` — vitest setup 의존. `node_modules/vitest` ABSENT 으로 검증 채널 비활성.
  - `reportWebVitals.js` / `reportWebVitals.test.js` — web-vitals 모듈 의존 + tsc strict 통과 검증 의존.

## 후속 필요 사항
1. **환경 회귀 회복** (typecheck + lint + 3 채널 — vitest + vite + eslint 동시 의존).
2. **RULE-02 재시도 금지 chain 해소** (island-proptypes-removal + TSK-20260517-{01,02,03} 후속).
3. **precondition spec 해소** (`devbin-install-integrity` REQ-064 + `path-alias-resolver-coherence` REQ-065 /revisit 완료).
4. **빌드 채널 전체 회복** (vite-jsx-transform-channel-coherence 18th 격리 spec 의 revive 선행 의존): `node_modules/vite` 존재 + `npm run build` exit 0 + `npm run dev` 채널 부팅 검증.
5. 4 조건 동시 충족 시 carve 진입 가능.

## 참고
- RULE-07 정합 (§역할 line 10: "수렴 수단 (rename / codemod / 부분 분할 / 단일 PR 일괄 / 변환 순서) 은 본 spec 비박제 — task 계층 위임" 수단 중립 메타 spec).
- close 분기 대안: src-typescript-migration 자체 폐기 결정 (예: CRA 기반 jsx 영구 유지) 시 close 가능 — 본 followup 은 revive 경로 기본.
