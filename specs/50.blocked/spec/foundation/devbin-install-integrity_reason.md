# devbin-install-integrity 격리 사유

## 격리 시점
- planner 16th tick @HEAD=`b42e36fc` (2026-05-17).
- 14th tick (HEAD=267c449) 박제 SHA-256 `9df5205d` ↔ 15th tick (HEAD=2e8a731) 박제 SHA-1 `948827ca` ↔ 16th tick 실측 SHA-1 `948827ca8820c615f4f9a7ba5222a81d84776373` — file content 변경 0 (마지막 inspector 커밋 `89c7b5c` 12차 시점 박제 이후 미터치 확정).

## 정체 시계열
- 12차 tick: REQ-064 흡수 inspector 초기 박제 (HEAD=0305fb1, commit 89c7b5c).
- 13차 tick: 1차 노출 + 환경 회귀 미회복 + carve 부적합 결정 (수단 중립 메타 spec 패턴).
- 14차 tick: hash 변경 (inspector 14th 진입 직전 갱신 — 14차 박제 SHA-256 `9df5205d`) → 정체 카운트 리셋 → 0회차.
- 15차 tick: hash 동일 (`948827ca`) + inspector 미터치 → 정체 1회차 누적 (15차 행동지침 (2) 박제 — "16th tick 정체 2회차 → 격리 후보 도래").
- 16차 tick (본 격리): hash 동일 (`948827ca`) + inspector 미터치 + 환경 회귀 미회복 → 정체 2회차 누적 도달 → 격리 후보 도래 충족.

## 격리 사유 (15차 행동지침 (2) 박제 가이드 정합)

### (a) 수단 중립 메타 spec 패턴 — § 역할 line 10 박제
본 spec § 역할 본문은 task 발행 산출물 카테고리를 명시적으로 배제:
- "`npm ci` / `npm install` / `pnpm` / `yarn` 등 install 수단 라벨 부여 (RULE-07 수단 중립)"
- "환경 회복 운영 task 자체 (developer 영역)"

본 박제는 RULE-07 정합 (효능 평서문 박제, 수단 라벨 미박제) 인 동시에, 본 spec 으로부터 발행 가능한 task 의 산출물 카테고리 (install 절차 / package-lock 갱신 / node_modules 생성) 가 모두 메타 결정 (수단 라벨) 영역으로 귀속됨을 spec 자체가 박제 — task 발행 부적합 시그널.

### (b) developer writer 영역 밖 산출물 경계 충돌 — RULE-01 writer 매트릭스
devbin install 정합 산출물 = `package.json` / `package-lock.json` / `node_modules/**`.

developer writer 영역 = `src/`, `10.followups/` (RULE-01 표).

planner 가 task 를 발행하면 developer 가 그 task 를 수행 시 RULE-01 writer 매트릭스 위반 (자기 영역 밖 변경) 발동 → RULE-02 fail-fast → `50.blocked/task/` 즉시 재진입 예측. carve 시점 자체가 RULE-02 멱등 위반 (예측 가능한 fail 을 발행).

### (c) 환경 회귀 미회복 + hash 3 tick 미변경
14차 박제 환경 회귀 잔존 가정 (typecheck rc=2 + ESLint flat-config `@eslint/js` ERR_MODULE_NOT_FOUND + `devbin install precondition` 미충족 — devbin binary 3건 부재 + module 5건 부재 + eslint 메이저 격차 + hook 진입 fail 2건 baseline 위반).

본 spec § 동작 검증 진입점 (`hasOwnProperty` / `node_modules/<pkg>/` resolve / `pre-commit hook` 실행 rc=0) 자체가 환경 회복 (npm install 또는 devDep 정합) 의존 — spec 박제 자체는 정합하나 task 화 가능 시점은 환경 회복 이후. 본 spec 박제 (89c7b5c) 이후 14차~16차 tick 동안 환경 미회복 → carve 진입로 자체 부재.

### (d) RULE-05 정식 복귀 경로 (/revisit) 만 해소 가능
본 격리는 spec 콘텐츠 결함 (RULE-07 위반) 아님 — RULE-07 정합 (평서형·반복 검증 가능·시점 비의존·incident 귀속 부재·수단 중립). 격리 사유는:
- (i) RULE-01 writer 매트릭스 게이트 (carve 시점 산출물 경계 충돌)
- (ii) 환경 회귀 미회복 (게이트 baseline 재현 자체가 환경 의존)
- (iii) hash 정체 (inspector 가 §변경 이력 박제 또는 본문 갱신 없이 동일 본문 carve 재시도 = RULE-02 재시도 금지 위반)

해소 경로: RULE-05 /revisit 스킬이 본 _reason.md 판정 → (a) revive 시 `10.followups/` 진입 → discovery 흡수 → 20.req/ 발행 → inspector spec 재흡수 흐름, (b) close 시 `60.done/2026/05/17/revisit/` 감사노트. planner 미접촉 (writer 경계).

## 정합 검증
- RULE-01 writer 영역: `30.spec/green/F → 50.blocked/spec/F` planner mv 권한 정합 (RULE-01 writer 매트릭스 표).
- RULE-02 fail-fast: 격리 결정은 RULE-02 "Fail-fast: 실패·충돌 → blocked/ + {slug}_reason.md. 재시도 없음" 정합.
- RULE-07: 본 spec 자체는 RULE-07 정합 유지 — 격리 사유는 RULE-07 위반 아님.
- 11차-13차 tick 의 toolchain-version-coherence 격리 패턴 + 11차-13차 runtime-dep-version-coherence 격리 패턴과 동일 시계열 (hash 정체 2회차 + 수단 중립 메타 spec 패턴 + writer 경계 충돌 + 환경 회귀 미회복).

## 관련 박제
- `specs/30.spec/green/.planner-seen` 12차~16차 박제 (정체 시계열).
- `specs/60.done/2026/05/17/req/20260517-devbin-install-integrity.md` (REQ-064 원문, 12차 mv).
- `specs/50.blocked/spec/foundation/runtime-dep-version-coherence.md` (13차 격리, 2e8a731 chore(revisit) 로 10.followups/ revive 완료) — 동일 격리 패턴.
- `specs/50.blocked/spec/foundation/toolchain-version-coherence.md` (5th-7th tick 격리, /revisit followup 완료) — 동일 격리 패턴 선행.
