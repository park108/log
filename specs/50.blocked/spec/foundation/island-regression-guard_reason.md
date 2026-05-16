# Blocked reason — island-regression-guard

## 격리 사유
환경 회귀 (ESLint flat-config `@eslint/js` `ERR_MODULE_NOT_FOUND`) 미회복 상태에서 본 spec FR-02 차단 효능 게이트 task 발행 시 필수 baseline 실측 의무 (RULE-06 grep-baseline + game-day fire/silence 픽스처 박제) 가 충족 불능 정체 2 회차 연속 누적.

## 정체 경과
- **1st tick (3rd planner @HEAD=4c84b86)**: 본 spec 1차 노출. carve 유보 (`npm run lint` ERR_MODULE_NOT_FOUND → baseline 재현 불가). spec hash `0c2adb1f...` 박제.
- **2nd tick (4th planner @HEAD=ffaa752)**: 환경 미회복 1회차 재카운트. spec hash 동일 `0c2adb1f...` 유지 (inspector 미터치). carve 0건.
- **3rd tick (5th planner @HEAD=946dca1)**: 환경 미회복 2회차 — 본 격리 시점. spec hash 동일 `0c2adb1f...` 유지.

## 환경 회귀 baseline (HEAD=946dca1 실측, 5th tick)
- `npm run lint`: `ERR_MODULE_NOT_FOUND` `@eslint/js` 잔존 (3rd / 4th tick 박제와 동일 — `eslint.config.js` 의 `@eslint/js` import 미해석).
- 본 spec §스코프 규칙 (d) gate 의 negative baseline (`eslint.config.js:35` `files: ['src/**/*.{js,jsx,ts,tsx}']` 가 island `.jsx`/`.js` lint 대상 포함) 정적 박제 자체는 유효하나, task 발행 시 game-day 픽스처 (`src/Comment/Probe.jsx` 신규 도입 시 `npm run lint` rc 측정) 실행 불능.
- 본 환경 회귀의 root cause 는 별 축 (`@eslint/js` 모듈 미설치 또는 devDep 누락) — `toolchain-version-coherence` 의 typescript 정합 축과 직교하나 동일 환경 회복 의존.

## 정식 복귀 경로 (RULE-05)
1. 운영자가 ESLint 환경 회복 — `@eslint/js` 모듈 설치 또는 devDep 추가 + `npm install`.
2. `npm run lint` rc 정상화 (master HEAD 0 hit) 검증.
3. 본 spec 의 정식 복귀: `50.blocked/spec/foundation/island-regression-guard.md` → `/revisit` 스킬로 `10.followups/` 승격 (RULE-05). 원본 + `_reason.md` 삭제.
4. discovery 가 followup 흡수 → inspector 가 spec 재발행 → planner 가 환경 회복 + game-day 픽스처 실행 가능 검증 후 carve.

## 미접촉 영역
- 본 spec FR-01~06 평서문 자체는 **불변식 자체로 유효** — RULE-07 정합 (island 정의 부정형 + 결과 효능 평서형 박제). 격리 사유는 spec 콘텐츠 결함이 아닌 **baseline 실측 불능 (환경 회귀)** 이며, 본 spec 박제 내용은 재진입 시 그대로 활용 가능.
- 본 spec FR-01 의 island 정의 참조 (`src-typescript-migration` §동작 6 FR-05 + `typecheck-exit-zero` FR-03 합성) 는 `src-typescript-migration` 이 현재 `50.blocked/spec/foundation/` 잔존 상태로, 본 spec 복귀 시점에 `src-typescript-migration` 도 함께 복귀 (RULE-05) 가 자연스러운 의존 — 본 spec 단독 복귀도 정의 합성 측 평서문 자체는 blocked 상태에서도 의미 유지 (본 spec §의존성 박제 정합).
- writer 경계: planner 는 본 spec hash (`0c2adb1f...`) 검증만 수행하고 spec 본문 미터치. inspector 가 재발행 시 동일 본문 또는 보강 가능.

## 박제 시점
- 격리 일자: 2026-05-17 (planner 5th tick @HEAD=946dca1).
- 격리 mv: `30.spec/green/foundation/island-regression-guard.md` → `50.blocked/spec/foundation/island-regression-guard.md`.
