# 격리 사유: eslint-linter-options-default-override (REQ-068)

> **격리 시점**: 2026-05-17 (19th tick planner @HEAD=`0e961fc`)
> **원본**: `specs/30.spec/green/foundation/eslint-linter-options-default-override.md` → `specs/50.blocked/spec/foundation/eslint-linter-options-default-override.md`
> **원본 hash**: `5dbfa413e74bef3cc7183aeb006f916499ff375b` (18th tick 동일)

## 1. 정체 시계열
- 17th tick (planner @HEAD=`33c71a8`): 1차 노출. hash `5dbfa413` 박제. inspector commit pending (untracked working tree). REQ-068 ID 충돌 (`log-island-convergence` 동시 박제).
- 18th tick (planner @HEAD=`24183430`): hash 동일 + inspector untracked 잔존 → 정체 1회차 누적.
- 19th tick (planner @HEAD=`0e961fc`): hash 동일 + inspector commit 완료 (`a952918`) 후 planner 미터치 + 환경 회귀 미회복 → **정체 2회차 도달**. 18차 박제 행동지침 (2) 정합.

## 2. 격리 근거 (18차 박제 행동지침 (2) 정합)
- **(a) 수단 중립 메타 spec 패턴** — `tooling.md` (REQ-028/053/058) 의 `rules` 키 의미 박제와 동일 카테고리. spec 본문은 `eslint.config.js:20` `{ linterOptions: { reportUnusedDisableDirectives: 'off' } }` 단일 블록 명시 박제 — 현 시점 baseline 위반 0 (블록 등록 1건, 옵션 값 `'off'` 명시, v8/v9 default 차이 주석 박제 완료, src `eslint-disable` 1 hit 활성 사용).
- **(b) developer writer 영역 밖 산출물** — 산출물 `eslint.config.js` (루트 config). RULE-01 writer 매트릭스 (developer 는 `src/`) 충돌.
- **(c) 환경 회귀 미회복** — 19th tick 재실측: `npm run lint` Error [ERR_MODULE_NOT_FOUND] `Cannot find package '@eslint/js'` → `node -e "require.resolve('@eslint/js')"` MODULE_NOT_FOUND. RULE-06 grep dry-run 측정 baseline 비활성 (게이트 실행 불가). 본 spec §동작 6 `npm run lint` unused directive 출력 0 hit 실측 precondition 미충족.
- **(d) ID 충돌 분기 잔존** — REQ-068 = `eslint-linter-options-default-override` + `log-island-convergence` 동시 박제. 차기 discovery 세션에서 ID 재배정 또는 메타 정정 신호 — 본 spec 직접 영향 0 (각 spec 영역 직교) 이나 운영 메타 정합성 미해소.
- **(e) RULE-05 정식 복귀 경로만 해소** — planner / inspector 의 직접 재흡수 금지.

## 3. 해소 경로 (RULE-05)
정식 경로: **본 파일 + spec → `10.followups/` 승격 → discovery 흡수 (ID 재배정) → 신규 req 발행 → inspector 재흡수 → planner carve 진입**.

해소 전제조건 (재흡수 시점):
- (i) **환경 회귀 회복** — `@eslint/js` ESM resolve 성공 (`node_modules/@eslint/js/package.json` exists exports field 유효) + `npm run lint` exit 0.
- (ii) **본 spec 활성 fail 신호 발생** — ESLint 메이저/마이너 bump 로 `reportUnusedDisableDirectives` default 추가 변경 검출 (예: `'warn'` → `'error'`) 또는 baseline 값 변경 의도 시 정상화 task 트리거 도래.
- (iii) **`devbin-install-integrity` (REQ-064) 격리 해소** — precondition (`node_modules/eslint` 부재 시 `npm run lint` 실행 불가).
- (iv) **ID 충돌 해소** — discovery 재흡수 시 REQ ID 재배정 (예: REQ-068 → REQ-068a / REQ-068b 또는 신규 ID).

본 격리는 spec 콘텐츠 자체의 RULE-07 위반이 아님 — 본 spec 은 평서형·반복 검증 가능·시점 비의존·incident 귀속 부재·수단 중립 모두 충족. 격리 사유는 **carve 트리거 부재 + 환경 회귀 미회복 + 정체 2회차 도달 + ID 충돌 메타** 의 운영 분기.

## 4. 메타
- RULE-01: planner writer 영역 (`30.spec/green/foundation/* → 50.blocked/spec/foundation/*` mv).
- RULE-02: 단일 커밋 (`spec(planner): ...`). push 금지.
- RULE-05: blocked 해제는 `/revisit` 스킬 + 운영자 승인.
- RULE-07: 본 spec 콘텐츠 적합 — 격리 사유 운영 분기 한정.
- ID 충돌 메타: REQ-068 = `eslint-linter-options-default-override` + `log-island-convergence` 동시 박제 (차기 discovery 세션 재배정 신호).
