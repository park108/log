# `root-entry-island-convergence` 격리 사유

> **격리 tick**: 20th planner session @ HEAD=`7477189`
> **원위치**: `30.spec/green/foundation/root-entry-island-convergence.md`
> **격리 후**: `50.blocked/spec/foundation/root-entry-island-convergence.md`
> **spec hash (SHA-1)**: `389ef8eea9d2fdeda164a96fa1a6a0e1b291a6e2` (18th/19th/20th tick 동일 — inspector 미터치 `a9529185` 이후 변경 0)

## 결정 근거 (19th 행동지침 (3) 가이드 정합 + 정체 2회차 도달)

### (a) RULE-02 재시도 금지 chain (`src-typescript-migration` island 정의 마지막 잔존 카테고리)
본 spec §역할 line 10 박제: "src/ 직계 (maxdepth=1) 7 비-TS 파일 ... `src-typescript-migration` (구 REQ-051) 의 island 정의 (`find src -name "*.jsx" | wc -l` 단축형이 0 으로 수렴하는 종착 조건) 의 **마지막 잔존 카테고리**". `island-proptypes-removal` (9th-13th 격리, revive 완료) chain 의 종착 박제 — 본 spec carve 시 동일 환경 회귀 chain 재진입 예측 = RULE-02 멱등 위반.

### (b) 환경 회귀 미회복 (typecheck + lint pre-commit hook chain)
20th tick 재실측:
- `npx tsc --noEmit` → TS6046 + TS2688 + TS5070 3 hit (tsconfig 경로, src/ 직계 0 hit). 본 spec §동작 2 (FR-02 typecheck error 0 hit) precondition 미충족 — REQ-064 해소 의존.
- `npm run lint` → ERR_MODULE_NOT_FOUND `@eslint/js`. pre-commit hook chain 차단 → developer 가 `App.jsx` / `index.jsx` 등 root entry 파일 commit 시 hook fail-fast 발동.
- `node_modules/{vite,vitest,@eslint/js}` ABSENT.

### (c) 산출물 7 파일 root entry — App.jsx / index.jsx 변경 시 빌드 채널 전체 영향
- `App.jsx` (root 컴포넌트) / `index.jsx` (createRoot entry) 변경 = 빌드 entry point + JSX runtime + tsconfig include 동시 영향. `node_modules/vite` ABSENT 으로 `npm run build` 채널 비활성 잔존 (vite-jsx-transform-channel-coherence 18th 격리 chain 도 동일 precondition).
- `setupTests.js` / `setupTests.timer-idiom.test.jsx` = vitest setup file 의존. `node_modules/vitest` ABSENT 으로 검증 채널 비활성.
- `reportWebVitals.js` / `reportWebVitals.test.js` = web-vitals 모듈 의존. tsc strict 통과 검증 의존.

### (d) RULE-05 정식 복귀 경로 (`/revisit`) 만 해소 가능
본 격리 사유는 RULE-07 위반 아님 — §역할 line 10 박제 "수렴 수단 (rename / codemod / 부분 분할 / 단일 PR 일괄 / 변환 순서) 은 본 spec 비박제 — task 계층 위임" 수단 중립 메타 spec 정합. 격리 사유는 **RULE-02 재시도 금지 chain (src-typescript-migration island 종착) + 환경 회귀 의존 (vitest + vite + eslint 3 채널 동시 의존) + hash 정체 2회차** 조합 분기.

`/revisit` 스킬 판정:
- **revive 분기**: 환경 회귀 회복 + island-proptypes-removal chain + REQ-064 / REQ-065 /revisit 처리 완료 신호 → 10.followups/ 승격.
- **close 분기**: src-typescript-migration 자체 폐기 결정 (예: CRA 기반 jsx 영구 유지 결정) 시 → 60.done/2026/05/17/revisit/root-entry-island-convergence.md 감사노트 후 close.

## 회복 조건 (log-island-convergence_reason.md 와 동일 — 19th 행동지침 (7))
**(i) 환경 회귀 회복** + **(ii) RULE-02 재시도 금지 chain 해소** + **(iii) precondition spec 해소**. 3 조건 동시 충족 시 carve 진입 가능. 단, 본 spec 은 root entry 영향으로 **(iv) 빌드 채널 전체 회복 신호** 추가 — `node_modules/vite` 존재 + `npm run build` exit 0 + `npm run dev` 채널 부팅 검증 (vite-jsx-transform-channel-coherence 18th 격리 spec 의 revive 가 선행 의존).
