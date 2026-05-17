# vite-jsx-transform-channel-coherence — 정체 2회차 격리 사유 (18th tick planner)

- **격리 시점**: 2026-05-17 (18th planner tick @HEAD=`24183430`)
- **원 위치**: `specs/30.spec/green/foundation/vite-jsx-transform-channel-coherence.md`
- **spec hash (SHA-1 git hash-object)**: `a1f681de9463abd2fc8ec837556badc1321fd28f` (16th-17th-18th tick 동일 — 마지막 inspector 커밋 `64babbd` 이후 미터치 3 tick 누적)
- **정체 회차**: 2회차 (16th 1차 노출 → 17th 1차 정체 → 18th 2차 정체 = 격리 후보 도래)
- **선행 박제 시계열**:
  - 16th tick (`b42e36f`) — REQ-066 흡수 신규 박제, 1차 노출, 격리 부적합 (정체 0회차)
  - 17th tick (`24183430` 직전 `2418343` 시점 기준): hash `a1f681de` 동일 + inspector 미터치 → 정체 1회차 누적 (17차 행동지침 (1) 박제: "18th tick 진입 시 정체 2회차 도달 → 격리 후보 도래")
  - 18th tick (`24183430`): hash `a1f681de` 동일 + inspector 미터치 + 환경 회귀 (`node_modules/vite` ABSENT) 잔존 실측 → 정체 2회차 도달 → 격리 결정

## 격리 사유 (5축)

### (a) 수단 중립 메타 spec 패턴 — RULE-07 정합 유지 (위반 아님)
본 spec §역할 line 10 자기 박제: "의도적으로 하지 않는 것: 세 채널 중 어느 채널의 제거/유지/추가 결정 (RULE-07 수단 중립 — 채널 분담 박제 + 이중 변환 부재 효능만)". devbin-install-integrity / path-alias-resolver-coherence (16th 격리 시계열, 16c724f) 와 동일 카테고리 — 채널 분담 + 효능 박제만 평서화하고 구현 수단은 task 계층 위임. RULE-07 §양성 기준 (시스템 무엇이어야 하는가 평서·반복 검증 가능·시점 비의존·incident 비귀속) 정합 유지. 격리 사유는 RULE-07 위반이 아님.

### (b) developer writer 영역 밖 산출물 경계 충돌 (RULE-01 + RULE-02)
정상화 산출물 = `vite.config.js` (3 블록: `plugins[react]`, `oxc`, `optimizeDeps.esbuildOptions.loader`) 변경. developer writer 영역 (RULE-01: `src/`, `10.followups/`) 밖. planner 가 carve 발행 시 developer 는 RULE-01 writer 매트릭스 충돌로 작업 진입로 부재 → RULE-02 fail-fast 발동 (예측 가능한 fail 을 발행하는 자체가 RULE-02 멱등 위반). devbin-install-integrity (`package.json` / `package-lock.json` / `node_modules/**`) + path-alias-resolver-coherence (`vite.config.js` / `tsconfig.json` / `eslint.config.js`) 와 동일 매트릭스 충돌 패턴 (16th tick 박제).

### (c) §동작 3 (jsx-runtime import 횟수 측정 baseline) 활성 precondition 미충족
본 spec §동작 3 (production build 산출물 jsx-runtime import 횟수 측정 — `grep -rn "react/jsx-runtime" build/assets/*.js` 형태) 은 REQ-064 (devbin-install-integrity, 16th 격리 / 17th /revisit revive followup) 충족 후에야 활성. 18th tick 실측 (HEAD=`24183430`):
- `node_modules/vite` ABSENT (vite 모듈 디스크 부재 — 17th tick 박제 동일 잔존)
- `node_modules/typescript` 존재 (typescript 측 부분 회복은 잔존)
- `npm run build` 채널 비활성 (vite 부재 → build 산출물 생성 불가)
- 따라서 §동작 3 grep dry-run 실측 박제 (RULE-06 grep-baseline 의무) 불가능

### (d) RULE-02 재시도 금지 분기 (멱등 + fail-fast)
본 spec 의 정상화 task 를 발행하면 RULE-01 (b) + RULE-06 (c) 분기에 의해 발행 즉시 `50.blocked/task/` 재진입 예측. 16th 격리 2 spec (devbin / path-alias) 과 동일 멱등 위반 분기. RULE-02 §원칙 "같은 입력 2회 = 같은 결과" + "실패·충돌 → blocked/. 재시도 없음" 정합.

### (e) RULE-05 정식 복귀 경로만 해소 가능
본 격리 spec 의 정식 복귀 경로: `50.blocked/spec/foundation/vite-jsx-transform-channel-coherence.md` → `/revisit` 스킬 판정 (revive: `10.followups/` 승격 → discovery 재흡수 → inspector 재박제 / close: `60.done/2026/05/17/revisit/`). 운영자 영역 (RULE-05 §Blocked 해제). planner 미접촉.

## 회복 신호 (다음 tick 진입 시 격리 해제 게이트)

본 격리 spec 의 carve 가능 회복 조건은 다음 중 (i)+(ii) 동시 충족:
- (i) **운영자가 환경 회귀 회복** — `node_modules/vite` 존재 + `npm run build` exit 0 + production build 산출물 (`build/assets/*.js`) 생성 가능. 회복 신호 검출 게이트: `test -d node_modules/vite && npm run build && ls build/assets/*.js`.
- (ii) **운영자가 /revisit 처리** — `50.blocked/spec/foundation/vite-jsx-transform-channel-coherence.md` revive (`10.followups/` 진입 후 discovery 재흡수) 또는 close (`60.done/.../revisit/` 박제).

(i) 단독 충족 시: 본 spec 박제 자체는 정합 (RULE-07 위반 아님) 이나 planner 가 본 격리 spec 을 자동 green 복귀시킬 수 없음 (RULE-01 writer 경계 + RULE-02 재시도 금지). 정식 경로 (ii) 필수.

(ii) 단독 충족 (환경 회귀 잔존) 시: revive 결과 followups 가 discovery → inspector 통해 신규 green 박제되어도 동일 (b)(c)(d) 분기 재발 — carve 재보류 예측.

## 시계열 참조 (동일 패턴 누적)

수단 중립 메타 spec + developer writer 영역 밖 + hash 정체 누적 + 환경 회귀 미회복 패턴의 격리 카테고리 시계열 (16th 박제 (8) 정합):
1. `toolchain-version-coherence` (5th-7th 격리, /revisit followup 완료)
2. `island-proptypes-removal` (9th-13th 격리, 2e8a731 chore(revisit) revive 완료)
3. `runtime-dep-version-coherence` (11th-13th 격리, 2e8a731 revive 완료)
4. `devbin-install-integrity` (16th 격리, 17th 33c71a8 revive followup)
5. `path-alias-resolver-coherence` (16th 격리, 17th 33c71a8 close)
6. **`vite-jsx-transform-channel-coherence` (18th 격리, 본 tick)**

본 spec 은 6번째 동일 카테고리. RULE-07 정합 spec 이지만 RULE-01 writer 경계 + RULE-02 재시도 금지 + 환경 회귀 의존 분기의 누적 패턴.
