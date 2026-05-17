---
source_blocked: specs/50.blocked/spec/foundation/vite-jsx-transform-channel-coherence.md
category: blocked-revisit
severity: high
observed_at: 2026-05-17T06:49:56Z
---

# vite-jsx-transform-channel-coherence — 6번째 동일 카테고리 격리 (수단 중립 메타 spec)

## 관찰
- 격리 시점: planner 18th tick @HEAD=`24183430` (2026-05-17).
- spec hash (SHA-1): `a1f681de9463abd2fc8ec837556badc1321fd28f` (16th-17th-18th tick 동일 — 마지막 inspector 커밋 `64babbd` 이후 미터치 3 tick).
- 정체 회차: 2회차 (16th 1차 노출 → 17th 1차 정체 → 18th 2차 정체 = 격리 후보 도래).

## 재현
- (a) **수단 중립 메타 spec 패턴**: §역할 line 10 자기 박제 "의도적으로 하지 않는 것: 세 채널 중 어느 채널의 제거/유지/추가 결정 (RULE-07 수단 중립 — 채널 분담 박제 + 이중 변환 부재 효능만)".
- (b) **developer writer 영역 밖 산출물**: `vite.config.js` 3 블록 (`plugins[react]`, `oxc`, `optimizeDeps.esbuildOptions.loader`) — developer writer 영역 `src/`, `10.followups/` 밖. carve 시 RULE-01 writer 매트릭스 충돌 + RULE-02 fail-fast.
- (c) **§동작 3 (production build jsx-runtime import 횟수 측정 baseline) precondition 미충족**: 18th tick 실측 `node_modules/vite` ABSENT + `npm run build` 채널 비활성 → §동작 3 grep dry-run 박제 (RULE-06 grep-baseline 의무) 불가능.
- (d) **RULE-02 재시도 금지**: carve 즉시 `50.blocked/task/` 재진입 예측.

## 후속 필요 사항
1. **운영자 환경 회귀 회복** — `node_modules/vite` 존재 + `npm run build` exit 0 + production build 산출물 (`build/assets/*.js`) 생성 가능. 회복 검출 게이트: `test -d node_modules/vite && npm run build && ls build/assets/*.js`.
2. 회복 후 discovery 가 본 followup 흡수 → `20.req/` 발행 → inspector 재박제 → `30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` 복귀.
3. (i) 단독 충족 (환경 회복만) 시 planner 자동 green 복귀 불가 (RULE-01 writer 경계 + RULE-02 재시도 금지) — 정식 경로 (ii) 필수.

## 참고
- RULE-07 정합 (평서형·반복 검증 가능·시점 비의존·incident 비귀속·수단 중립).
- 6번째 동일 카테고리 spec — 시계열: `toolchain-version-coherence` (5th-7th) → `island-proptypes-removal` (9th-13th) → `runtime-dep-version-coherence` (11th-13th) → `devbin-install-integrity` (16th) → `path-alias-resolver-coherence` (16th, close) → **본 spec (18th)**.
