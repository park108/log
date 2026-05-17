# 격리 사유: test-discovery-population-coherence (REQ-067)

> **격리 시점**: 2026-05-17 (19th tick planner @HEAD=`0e961fc`)
> **원본**: `specs/30.spec/green/foundation/test-discovery-population-coherence.md` → `specs/50.blocked/spec/foundation/test-discovery-population-coherence.md`
> **원본 hash**: `84e254b87a3d91b28f95395718f563fda443c36e` (18th tick 동일)

## 1. 정체 시계열
- 17th tick (planner @HEAD=`33c71a8`): 1차 노출. hash `84e254b8` 박제. inspector commit pending (untracked working tree).
- 18th tick (planner @HEAD=`24183430`): hash 동일 + inspector untracked 잔존 → 정체 1회차 누적.
- 19th tick (planner @HEAD=`0e961fc`): hash 동일 + inspector commit 완료 (`a952918`) 후 planner 미터치 + 환경 회귀 미회복 → **정체 2회차 도달**. 18차 박제 행동지침 (1) 정합.

## 2. 격리 근거 (18차 박제 행동지침 (1) 정합)
- **(a) 수단 중립 메타 spec 패턴** — `runtime-dep-version-coherence` / `toolchain-version-coherence` / `devbin-install-integrity` / `path-alias-resolver-coherence` 와 동일 카테고리. spec 본문은 도구 4축 (ESLint files / TypeScript include / Vitest coverage.include / Vitest test discovery) 모집단 매트릭스 박제 — 정상화 task 트리거 부재 (현 시점 baseline 위반 0).
- **(b) developer writer 영역 밖 산출물** — 4축 모두 `eslint.config.js` / `tsconfig.json` / `vite.config.js` / `package.json` 의 루트 config 표면. RULE-01 writer 매트릭스 (developer 는 `src/`) 충돌.
- **(c) §동작 4 (신규 루트 `*.test.*` 추가) / §동작 5 (vitest 메이저 bump default 글로브 변경)** 은 **미래 활성 게이트** — 현 시점 baseline (루트 1 hit `vite.config.test.js`, vitest `5.x`) 정상 → 위반 baseline 0 분기. 5th tick `path-alias-resolver-coherence` 격리 사유 (c) 동일 패턴.
- **(d) RULE-05 정식 복귀 경로만 해소** — `blocked → /revisit → 10.followups → discovery 재흡수 → ...`. planner / inspector 의 직접 재흡수 금지 (RULE-02 writer 경계 + RULE-05 적용).
- **(e) 환경 회귀 미회복** — 19th tick 재실측: `npx tsc --noEmit` TS6046+2688+5070 3 hit 잔존 / `@eslint/js` MODULE_NOT_FOUND / `node_modules/vite` 부재. 본 spec 검증 게이트 (4 scripts exit 0 — `dependency-bump-gate.md` 직접 결합) 자체 실행 불가. precondition (`devbin-install-integrity` REQ-064 격리) 해소 의존.

## 3. 해소 경로 (RULE-05)
정식 경로: **본 파일 + spec → `10.followups/` 승격 → discovery 흡수 → 신규 req 발행 → inspector 재흡수 → planner carve 진입**.

해소 전제조건 (재흡수 시점):
- (i) **환경 회귀 회복** — `npx tsc --noEmit` exit 0 (TS6046/2688/5070 3 hit 해소) + `npm run lint` exit 0 (`@eslint/js` ESM resolve 성공) + `node_modules/{vite,vitest,eslint,@eslint/js,typescript}` 모두 존재.
- (ii) **본 spec 의 §동작 4/5 활성 fail 신호 발생** — 루트 레벨 `*.test.*` 신규 추가 또는 vitest 메이저 bump 로 default 글로브 변경 검출 시 정상화 task 트리거 도래.
- (iii) **`devbin-install-integrity` (REQ-064) 격리 해소** — precondition.
- (iv) **`path-alias-resolver-coherence` (REQ-065) 격리 해소** — 직교 축이나 동일 환경 회귀 chain.

본 격리는 spec 콘텐츠 자체의 RULE-07 위반이 아님 — 본 spec 은 평서형·반복 검증 가능·시점 비의존·incident 귀속 부재·수단 중립 모두 충족. 격리 사유는 **carve 트리거 부재 + 환경 회귀 미회복 + 정체 2회차 도달** 의 운영 분기.

## 4. 메타
- RULE-01: planner writer 영역 (`30.spec/green/foundation/* → 50.blocked/spec/foundation/*` mv).
- RULE-02: 단일 커밋 (`spec(planner): ...`). push 금지.
- RULE-05: blocked 해제는 `/revisit` 스킬 + 운영자 승인.
- RULE-07: 본 spec 콘텐츠 적합 — 격리 사유 운영 분기 한정.
- ID 충돌 메타: REQ-067 는 본 req 단독 (충돌 없음).
