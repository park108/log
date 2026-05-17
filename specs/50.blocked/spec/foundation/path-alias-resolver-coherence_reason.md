# path-alias-resolver-coherence 격리 사유

## 격리 시점
- planner 16th tick @HEAD=`b42e36fc` (2026-05-17).
- 14th tick (HEAD=267c449) 박제 SHA-256 `f7ece98e` ↔ 15th tick (HEAD=2e8a731) 박제 SHA-1 `3a7a98c7` ↔ 16th tick 실측 SHA-1 `3a7a98c7ee4af262895defccf75b84f64563d525` — file content 변경 0 (마지막 inspector 커밋 `35ba9d4` 13차 시점 박제 이후 미터치 확정).

## 정체 시계열
- 13차 tick: REQ-065 흡수 inspector 초기 박제 (commit 35ba9d4) + carve 부적합 결정 (수단 중립 메타 spec 패턴 + baseline 격차 0 정합 = 위반 자체 부재).
- 14차 tick: hash 변경 (inspector 14th 진입 직전 갱신 — 14차 박제 SHA-256 `f7ece98e`) → 정체 카운트 리셋 → 0회차.
- 15차 tick: hash 동일 (`3a7a98c7`) + inspector 미터치 → 정체 1회차 누적 (15차 행동지침 (3) 박제 — "16th tick 정체 2회차 → 격리 후보 도래").
- 16차 tick (본 격리): hash 동일 (`3a7a98c7`) + inspector 미터치 + 환경 회귀 미회복 → 정체 2회차 누적 도달 → 격리 후보 도래 충족.

## 격리 사유 (15차 행동지침 (3) 박제 가이드 정합)

### (a) 수단 중립 메타 spec 패턴 — § 역할 line 10 박제
본 spec § 역할 본문은 task 발행 산출물 카테고리를 명시적으로 배제:
- "특정 alias 의 추가/삭제 자체 (RULE-07 수단 중립)"
- "alias prefix 컨벤션 결정"
- "`eslint-plugin-import` resolver / `jsconfig.json` 도입 등 alias resolver 의 추가 채널 확장"

본 박제는 RULE-07 정합 (효능 평서문 박제, 수단 라벨 미박제) 인 동시에, 본 spec 으로부터 발행 가능한 task 의 산출물 카테고리 (alias 추가/삭제 / prefix 변경 / resolver 채널 확장) 가 모두 메타 결정 (수단 라벨) 영역으로 귀속됨을 spec 자체가 박제 — task 발행 부적합 시그널.

### (b) developer writer 영역 밖 산출물 경계 충돌 — RULE-01 writer 매트릭스
path-alias 정합 산출물 = `vite.config.js` / `tsconfig.json` / `eslint.config.js`.

developer writer 영역 = `src/`, `10.followups/` (RULE-01 표).

planner 가 task 를 발행하면 developer 가 그 task 를 수행 시 RULE-01 writer 매트릭스 위반 (자기 영역 밖 변경) 발동 → RULE-02 fail-fast → `50.blocked/task/` 즉시 재진입 예측. carve 시점 자체가 RULE-02 멱등 위반.

### (c) 현 baseline 위반 0 — 상시 정합 효능 유지 신호 재해석 (15차 행동지침 (3) 박제 분기)
본 spec §스코프 규칙 gate (c)(d)(e) 모두 격차 0 정합 (대칭차 0, 타깃 동치, case 일치 — 사용자 메시지 컨텍스트 (3) 박제 "baseline 격차 0 정합 (위반 자체 부재)" 와 일치).

현 시점 위반 없음 → 정상화 task 자체 부재 (위반 baseline 존재해야 정상화 task 발행 가능). 본 분기는 **정체 자체가 spec 의 "상시 정합" 효능 유지 신호** 로 재해석 가능 — hash 정체는 spec 본문 갱신 의무 부재 (위반 검출 시그널 부재) 의 정상 시그널.

본 격리는 RULE-07 정합 spec 의 "상시 정합 효능 유지" 상태를 인정하면서도, planner 가 동일 carve 부적합 결정을 다음 tick 마다 반복 평가하는 패턴 자체를 fail-fast 처리하는 의도. /revisit 정식 복귀 경로 (RULE-05) 가 본 spec 의 정체 상태를 어떻게 다룰지 결정 (revive 시 따로 task 화 불가 = close 처리가 자연스러움 — 위반 baseline 부재로 정상화 task 발행 진입로 부재).

### (d) 환경 회귀 미회복 + hash 3 tick 미변경
14차 박제 환경 회귀 잔존 가정 (`@eslint/js` ERR_MODULE_NOT_FOUND + `node_modules/vite` 부재 — devbin REQ-064 baseline 위반).

본 spec § 동작 검증 진입점 (`vite.config.js` resolve.alias dynamic load + `tsconfig.json` paths 키/타깃 동치 grep + `eslint.config.js` settings.import resolver alias grep) 자체가 환경 회복 (npm install) 의존 — spec 박제 자체는 정합 (gate (c)(d)(e) 격차 0) 하나 차기 inspector 가 §변경 이력 박제 (예: REQ-066 의 `vite.config.js` 채널 (a)(b) 변경 의도 검출 시 path-alias 영향 분석) 수행 시점은 환경 회복 + 신규 inspector 신호 의존.

### (e) RULE-05 정식 복귀 경로 (/revisit) 만 해소 가능
본 격리는 spec 콘텐츠 결함 (RULE-07 위반) 아님 — RULE-07 정합 (평서형·반복 검증 가능·시점 비의존·incident 귀속 부재·수단 중립). 격리 사유는:
- (i) RULE-01 writer 매트릭스 게이트 (carve 시점 산출물 경계 충돌)
- (ii) baseline 위반 0 정합 (정상화 task 진입로 부재)
- (iii) hash 정체 (inspector 가 §변경 이력 박제 또는 본문 갱신 없이 동일 본문 carve 재시도 = RULE-02 재시도 금지 위반)

해소 경로: RULE-05 /revisit 스킬이 본 _reason.md 판정 → (a) revive 시 `10.followups/` 진입 → discovery 흡수 → 20.req/ 발행 → inspector spec 재흡수 흐름 (예: alias 추가/축소 의도 입수 시), (b) close 시 `60.done/2026/05/17/revisit/` 감사노트 — **본 spec 의 상시 정합 효능 유지** 를 인정하는 close 결정이 자연스러움 (위반 baseline 부재).

## 정합 검증
- RULE-01 writer 영역: `30.spec/green/F → 50.blocked/spec/F` planner mv 권한 정합 (RULE-01 writer 매트릭스 표).
- RULE-02 fail-fast: 격리 결정은 RULE-02 "Fail-fast: 실패·충돌 → blocked/ + {slug}_reason.md. 재시도 없음" 정합.
- RULE-07: 본 spec 자체는 RULE-07 정합 유지 — 격리 사유는 RULE-07 위반 아님.
- devbin-install-integrity 13차-14차 격리 패턴 + toolchain-version-coherence 5차-7차 격리 패턴 + runtime-dep-version-coherence 11차-13차 격리 패턴과 동일 시계열 (hash 정체 2회차 + 수단 중립 메타 spec 패턴 + writer 경계 충돌).
- 본 격리는 추가로 (c) 분기 (baseline 위반 0 = 상시 정합 효능 유지) 박제 — 15차 행동지침 (3) "위반 baseline 부재 분기 명시 권고" 정합.

## 관련 박제
- `specs/30.spec/green/.planner-seen` 13차~16차 박제 (정체 시계열).
- `specs/60.done/2026/05/17/req/20260517-path-alias-resolver-coherence.md` (REQ-065 원문, 13차 mv).
- `specs/50.blocked/spec/foundation/devbin-install-integrity.md` (16차 tick 동일 격리 — 동일 사유 패턴).
- `specs/30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` (REQ-066 인접 박제 — 본 spec 의 §의존성 직교 축 명시 — vite 파이프라인의 resolve (path-alias) vs transform (vite-jsx) 다른 단계).
