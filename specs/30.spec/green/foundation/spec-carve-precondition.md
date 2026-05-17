# spec carve-precondition 자기 선언 — green foundation spec 본문 §carve-precondition 절 박제 효능 불변식

> **위치**: `specs/30.spec/green/foundation/**` (메타 spec 군), `specs/30.spec/blue/foundation/**` (승격 후 효능 유지 영역).
> **관련 요구사항**: REQ-20260517-085
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제, REQ-085 흡수)

> 본 spec 은 메타 효능 (다른 green foundation spec 본문 양식 박제) 게이트. 라인 번호 박제 없음 — baseline 은 §스코프 규칙 grep-baseline (작성 시 inspector 책임).

## 역할
`30.spec/green/foundation/**` 하위 spec 중 carve 가 산출물 (`src/**` 또는 `package.json` / `tsconfig.json` / `vite.config.js` / `.husky/**` / `.github/workflows/**` 등) 변경을 동반하는 spec (= carve-active spec) 은 본문에 **자기 carve 가능 시점 조건을 평서 박제** 해야 한다는 시스템 횡단 메타 효능 불변식. carve-active spec 의 §carve-precondition 절 (또는 §의존성 하위 평서) 에 (P1) 환경 채널 가용성 + (P2) 선행 spec done 상태 + (P3) RULE-02 재시도 금지 chain 비활성 3 차원이 평서 박제되면, planner carve 가 동일 원인 cluster 로 동시 격리되는 cycle 이 spec 자기 진술로 자가 차단된다. 본 효능 도입으로 carve 가능 시점 조건이 followup 본문에만 박제되고 spec 본문에는 부재한 시계열 음영 — 동일 carve 진입 fail 반복 + 동일 cluster 동시 격리 cycle — 이 spec 본문 자기 선언으로 수렴. 의도적으로 하지 않는 것: §carve-precondition 절 명문화 양식 (markdown heading vs bullet list vs table vs cross-ref-only) 선정 (수단 영역 — spec 도메인 결정), 자동 검출 스크립트 (`scripts/check-carve-precondition.sh` 가설명) 구현 (`diagnostic-script-auto-channel-coverage.md` 메타 효능 영역), planner agent 본문 행동 박제 (`.claude/agents/planner.md` 별 축), 환경 회귀 자체의 복구 수단 (`devbin-install-integrity` / `runtime-dep-version-coherence` / `toolchain-version-coherence` 별 spec 영역), carve-active 식별 grep 패턴의 추가 토큰 (`eslint.config.js` / `.prettierrc` / `scripts/**` 등) 의무 박제 결정 (현 6 토큰 baseline 한정), (P1)(P2)(P3) 3 차원 평서 박제 의무 정도 (전수 vs 도메인 결정 — spec 도메인이 chain 비활성 적용 여부 자율 결정 — 본 spec 은 박제 가능 양식만 평서), `30.spec/green/components/**` 또는 `30.spec/blue/**` 영역 (본 spec 은 `30.spec/green/foundation/**` 한정, blue 승격 시 효능 자동 유지), 비-carve-active 메타 spec (산출물 변경 require 0 spec — 본 spec 자체 포함) 의 §carve-precondition 절 박제 의무 (예외 평서로 면제).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 spec 본문 양식 게이트 박제만 — `specs/30.spec/green/foundation/**` ↔ 본문 §carve-precondition 절 정합의 결과 효능을 grep 단일 명령으로 검증.

## 동작
1. **(I1) carve-active spec 식별 게이트**: `30.spec/green/foundation/**` 하위 spec 중 §역할 또는 §동작 또는 §공개 인터페이스 본문이 산출물 변경 토큰 (`src/**`, `package.json`, `tsconfig.json`, `vite.config.js`, `.husky/**`, `.github/workflows/**`) 1+ 박제한 spec = carve-active spec. 측정: `grep -lE 'src/\*\*|package\.json|tsconfig\.json|vite\.config\.js|\.husky/|\.github/workflows/' specs/30.spec/green/foundation/*.md` → N 파일 (N 은 시점 의존 — §스코프 규칙 G1 baseline 한정).
2. **(I2) §carve-precondition 절 박제 게이트**: 모든 carve-active spec 은 본문 (§역할 ~ §의존성 범위) 에 §carve-precondition 절 또는 §의존성 하위 평서 형태로 (P1) 환경 채널 가용성 + (P2) 선행 spec done 상태 + (P3) RULE-02 chain 비활성 3 차원을 박제. 측정: `grep -lE '##\s+carve-precondition|§carve-precondition|carve precondition' <carve-active-spec>` → 1+ hit per spec. 절 명문화 양식 (heading vs bullet vs table vs cross-ref-only) 은 spec 도메인 결정 — 본 게이트는 박제 hit count 만 측정.
3. **(I3) (P1) 환경 채널 가용성 평서 박제**: §carve-precondition 절 내부 (P1) 차원이 carve 직전 충족 필요한 환경 게이트를 평서문으로 명시. 구체 dep / 명령 / nullness (예: `node_modules/<dep>` 존재 신호, `npx tsc --noEmit` exit 0, `npm run lint` exit 0, `npm run build` exit 0) 는 spec 도메인 결정 — 본 게이트는 평서 박제 자체만 요구.
4. **(I4) (P2) 선행 spec done 상태 평서 박제**: §carve-precondition 절 내부 (P2) 차원이 선행 의존 spec 의 done 상태 (또는 blue 승격 상태) 를 grant cross-ref 로 박제. cross-ref 형식 — `(REQ-YYYYMMDD-NNN)` ID + `done` 또는 `blue 승격` 상태 라벨. 선행 spec 부재 (의존 없음) 시 평서 박제 가능 ("선행 spec 의존 없음" 명시).
5. **(I5) (P3) RULE-02 chain 비활성 평서 박제**: §carve-precondition 절 내부 (P3) 차원이 carve 진입 금지 chain (이전 carve fail-fast 누적 chain 식별자 — followup slug 또는 task ID set) 의 followup 처리 완료 신호를 평서 박제. chain 활성 시 carve 진입 금지 자가 선언. chain 부재 spec (신규 spec / chain 누적 0 spec) 은 "chain 부재" 명시로 평서 박제 가능.
6. **(I6) 비-carve-active 예외 규칙**: §역할 / §동작 / §공개 인터페이스 본문에 산출물 변경 토큰 0 hit 인 spec (= 비-carve-active spec — 효능 박제 전용 메타 spec) 은 §carve-precondition 절 박제 면제. 면제 기준은 (I1) 식별 게이트 inverse — `grep -lE '<산출물 토큰>' <spec>` → 0 hit. 단 본 spec 은 자기 효능 박제 차원에서 산출물 토큰 (`src/**` / `package.json` / `tsconfig.json` / `vite.config.js` / `.husky/**` / `.github/workflows/**`) 을 평서 박제하므로 (I1) 식별 게이트에 자기 포함됨 — 따라서 본 spec 은 자기 §carve-precondition 절 시범 박제로 (I2) 정합 자기-적용 (산출물 변경 require 부재에도 자기 시범 박제 정합 — 자가 차단 신호 확립).
7. **(I7) 자매 메타 spec 정합**: 본 효능은 (a) `lint-warning-zero-gate.md` (REQ-080, master gate 메타 효능, lint warning 채널), (b) `diagnostic-script-auto-channel-coverage.md` (REQ-081, 자동 채널 메타 효능, 진단 script 채널), (c) `npm-script-prefix-coherence.md` (REQ-083, 명명 카테고리 메타 효능, npm script naming 채널) 와 자매 메타 효능. 채널 직교 — 어느 한 채널 위반이 다른 채널 게이트를 자동 충족시키지 않는다. 본 spec 은 spec 본문 §carve-precondition 채널.
8. **(I8) 수단 중립 (RULE-07)**: 본 spec 본문 어느 곳에서도 §carve-precondition 절 양식 후보 (markdown heading vs bullet list vs table vs cross-ref-only vs 별 자매 메타 spec carve) 또는 자동 검출 수단 후보 (grep wrapper vs shell script vs CI step) 에 선호 라벨 부여 0. 효능 박제는 "spec 본문 자기 선언 + 3 차원 평서" 평서 한정. 라벨 hit 자기 검증은 §스코프 규칙 게이트 박제.
9. **(I9) 시점 비의존 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 현 시점 carve-active spec 파일명 / 차원별 구체 dep 명 / chain ID / followup slug / 4 followups 격리 시점 박제 0. baseline 매트릭스 (현 시점 carve-active spec 분포 + §carve-precondition 절 박제 hit count) 는 §스코프 규칙 grep-baseline 한정 (감사성).

### 회귀 중점
- 새 carve-active spec 신규 박제 (REQ 흡수 시점) 또는 기존 비-carve-active spec 이 본문 갱신으로 산출물 토큰 1+ 박제 (I1 식별 게이트 진입) 시 §carve-precondition 절 박제 미동기화 → (I2) 위반 누적.
- 기존 carve-active spec 의 §carve-precondition 절이 (P1)(P2)(P3) 3 차원 중 1+ 차원 누락 (예: (P3) chain 비활성 평서 부재) → (I3)(I4)(I5) 위반 — 자기 선언 결손.
- followup cluster 패턴 반복 (개별 slug 박제는 §참고 한정) — planner carve fail-fast chain 누적 → 동일 cluster 동시 격리 cycle 재진입 — spec 본문 §carve-precondition 절 부재 시 자가 차단 실패.
- 본 spec 본문에 구체 carve-active spec 파일명 / chain ID / 4 followups slug 박제 시 (I9) 위반 — 시점 비의존성 무력화 (carve-active spec 신규 추가/삭제 / chain 해소 이벤트 시 spec 본문 갱신 의무 발생).
- 본 spec 본문에 §carve-precondition 절 양식 후보 또는 자동 검출 수단 후보에 선호 라벨 박제 시 (I8) 위반 — RULE-07 정합 무력화.
- §carve-precondition 절 박제 양식이 spec 도메인별 임의 변형 (heading / bullet / table 혼재) 으로 (I2) 게이트 grep 패턴 표면이 변동되며 자동 측정 비용 누적 → 별 followup 후보 (양식 표준화 — 본 spec 외부 별 req).

## 의존성
- 외부: POSIX shell (`bash`), `grep`, markdown 양식 (heading / bullet / table 인식).
- 내부: `specs/30.spec/green/foundation/**` (메타 효능 적용 대상 영역 — 본 효능의 입력 측면), `specs/30.spec/blue/foundation/**` (승격 후 효능 유지 영역 — 본 효능의 유지 측면).
- 역의존 (사용처): planner agent (carve 진입 시점 자가 선언 신호 소비), inspector agent (REQ 흡수 시 본 효능 평서 박제 의무).

### carve-precondition
- (P1) **환경 채널 가용성**: 본 spec 은 메타 효능 박제 한정 — 산출물 변경 require 0 (I6 면제 기준 inverse 정합). 본 spec 자체 carve 시점 환경 게이트 (예: `node_modules` 가용성, `tsc --noEmit` exit) 의존 없음.
- (P2) **선행 spec done 상태**: 본 spec 효능은 자매 메타 spec (REQ-080 `lint-warning-zero-gate.md` done / REQ-081 `diagnostic-script-auto-channel-coverage.md` done / REQ-083 `npm-script-prefix-coherence.md` done) 의 메타 효능 패턴 동질. 선행 spec 의존 없음 — 자매 메타 효능과 직교 (각 채널 독립 박제).
- (P3) **RULE-02 chain 비활성**: 본 spec 은 신규 박제 spec — 기존 carve fail-fast chain 누적 0. chain 부재 평서 박제 — carve 진입 차단 신호 없음.

## 테스트 현황
- [x] (I1) carve-active spec 식별 게이트 — 본 spec §동작 1 박제로 정합 (§스코프 규칙 G1 baseline 5 파일 실측).
- [x] (I2) §carve-precondition 절 박제 게이트 zero-point — 본 spec §동작 2 박제 + baseline 박제 (§스코프 규칙 G2 0 hit baseline MISS — 본 spec 회복 대상 zero-point). 본 spec 자체 §carve-precondition 절 박제로 자기 정합 시범 박제 (1 hit / 1 spec — 본 spec). carve-active spec 5 파일 §carve-precondition 절 박제는 차기 inspector tick / 별 followup 후 marker 플립.
- [x] (I3) (P1) 환경 채널 가용성 평서 박제 — 본 spec §동작 3 + §carve-precondition (P1) 평서 박제로 자기 정합.
- [x] (I4) (P2) 선행 spec done 상태 평서 박제 — 본 spec §동작 4 + §carve-precondition (P2) 평서 박제로 자기 정합.
- [x] (I5) (P3) RULE-02 chain 비활성 평서 박제 — 본 spec §동작 5 + §carve-precondition (P3) 평서 박제로 자기 정합.
- [x] (I6) 비-carve-active 예외 규칙 — 본 spec §동작 6 박제로 정합 + 본 spec 자체 면제 평서 (산출물 변경 require 0 — 메타 효능 박제 전용).
- [x] (I7) 자매 메타 spec 정합 — 본 spec §동작 7 박제로 정합 (3 자매 메타 spec 채널 직교 평서).
- [x] (I8) 수단 중립 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/spec-carve-precondition.md | grep -cE "기본값|권장|우선|default|best practice"` → 0 hit (§스코프 규칙 G5 박제).
- [x] (I9) 시점 비의존 (RULE-07) — 본 spec §동작 9 박제 + §스코프 규칙 G6 자기 검증 0 hit (본문 carve-active spec 파일명 / chain ID / 4 followups slug 박제 0).

## 수용 기준
- [x] (Must, FR-01) carve-active spec 식별 게이트 박제 — §동작 1 평서 + §스코프 규칙 G1 baseline 실측.
- [ ] (Must, FR-02) §carve-precondition 절 박제 게이트 — carve-active spec 5 파일 각각 1+ hit. 현 baseline 0 hit (§스코프 규칙 G2 MISS — 본 spec 회복 대상 zero-point). 차기 inspector tick / 별 followup 회수 후 marker 플립.
- [ ] (Must, FR-03) §carve-precondition 절 내부 (P1) 환경 채널 가용성 평서 박제 — 5 carve-active spec 각각. spec 도메인 결정 (구체 dep / 명령 / nullness). 차기 회수 후 marker 플립.
- [ ] (Must, FR-04) §carve-precondition 절 내부 (P2) 선행 spec done 상태 grant cross-ref 박제 — 5 carve-active spec 각각. cross-ref 형식 `(REQ-YYYYMMDD-NNN)` ID + 상태 라벨. 차기 회수 후 marker 플립.
- [ ] (Must, FR-05) §carve-precondition 절 내부 (P3) RULE-02 chain 비활성 chain 식별자 + 처리 완료 신호 평서 박제 — 5 carve-active spec 각각. chain 부재 spec 은 "chain 부재" 명시 가능. 차기 회수 후 marker 플립.
- [x] (Should, FR-06) 비-carve-active 메타 spec 예외 기준 평서 박제 — §동작 6 박제 + 본 spec 자체 면제 평서.
- [x] (Must, FR-07) 시점 비의존 자기 검증 — 본 spec 본문에서 carve-active spec 파일명 / chain 식별자 / 4 followups slug / 격리 시점 박제 0 (§스코프 규칙 G6 자기 검증).
- [x] (Must, FR-08) 수단 라벨 0 — `awk` + `grep` 0 hit (§스코프 규칙 G5 자기 검증).
- [x] (Should, FR-09) 자매 메타 spec (lint-warning-zero-gate / diagnostic-script-auto-channel-coverage / npm-script-prefix-coherence) 와 채널 직교 평서 박제 — §동작 7 박제.
- [x] (NFR-01) 시점 비의존 — FR-07 동치.
- [x] (NFR-02) 게이트 단일성 — §동작 1·2 박제 (2 grep 명령 단일 절차 — G1 carve-active 식별 / G2 §carve-precondition 절 박제). 3 차원 (P1/P2/P3) 자연어 박제는 inspector 정성 판정.
- [x] (NFR-03) 채널 직교 — §동작 7 박제 (§carve-precondition vs lint-warning-zero-gate vs diagnostic-script-auto-channel-coverage vs npm-script-prefix-coherence 독립).
- [x] (NFR-04) 자동 채널 부착 음영 — 본 spec §역할 의도적으로 하지 않는 것 평서 박제 (자동 검출 스크립트는 `diagnostic-script-auto-channel-coverage.md` 메타 효능 영역).
- [x] (NFR-05) RULE-07 정합 — 본 효능은 시스템이 "무엇이어야 하는가" 평서문 (green foundation spec 은 §carve-precondition 절 박제 + carve 가능 시점 자기 선언). 1회성 진단 (4 followups 시점 환경 회귀) 아님 — 반복 가능 + 시점 비의존 메타 효능.
- [x] (NFR-06) RULE-06 정합 — §스코프 규칙 grep-baseline 6 gate (G1~G6) 실측 박제 (HEAD=`985c76e`) + 예외 규칙 (비-carve-active 메타 spec) 평서 박제 + `expansion` `허용` (carve-active spec 신규 추가 시 본 효능 자동 적용 — scope 확장 허용).
- [x] (NFR-07) 수단 라벨 0 — FR-08 동치.
- [x] (NFR-08) followup cluster 흡수 — 본 spec §변경 이력 + §참고 영역에 4 followups cluster 흡수 감사성 박제 (본문 §역할 ~ §의존성 영역에는 미박제 — G6 자기 검증 정합).

## 스코프 규칙
- **expansion**: 허용 — carve-active spec 신규 추가 또는 비-carve-active spec 의 본문 갱신으로 carve-active 진입 시 본 효능 자동 적용. scope 확장 시 §스코프 규칙 grep-baseline G1·G2 재실측 + carve-active spec 추가 시 §carve-precondition 절 박제 의무 surface.
- **grep-baseline** (HEAD=`985c76e`, 2026-05-17 — REQ-085 흡수 시점 실측):
  - (G1) **[carve-active spec 식별 baseline]** `grep -lE 'src/\*\*|package\.json|tsconfig\.json|vite\.config\.js|\.husky/|\.github/workflows/' specs/30.spec/green/foundation/*.md` → **6 파일 hit** (`diagnostic-script-auto-channel-coverage.md` + `lint-warning-zero-gate.md` + `npm-script-prefix-coherence.md` + `node-modules-extraneous-coherence.md` + `tooling.md` + 본 spec 자기 포함). 본 spec 은 효능 박제 차원에서 산출물 토큰 6개 평서 박제 → (I1) 식별 게이트 자기 포함 → 본 spec 은 자기 §carve-precondition 절 시범 박제로 (I2) 정합 자기-적용. 5 외부 carve-active spec 은 차기 inspector tick / 별 followup 회수 후 §carve-precondition 절 박제 의무.
  - (G2) **[§carve-precondition 절 박제 baseline]** `grep -lE '##\s+carve-precondition|§carve-precondition|carve precondition' specs/30.spec/green/foundation/*.md` → 본 spec 작성 후 재실측 **1 hit** — 본 spec (`spec-carve-precondition.md`) 자기 §carve-precondition 절 시범 박제 정합. 5 외부 carve-active spec 은 baseline 0 hit (MISS — 본 spec 효능의 회복 대상 zero-point). 매트릭스: 6 carve-active spec (자기 포함) / §carve-precondition 절 박제 1 (자기) → 차기 inspector tick / 별 followup 회수 후 6 (전수).
  - (G3) **[자기-적용 정합 검증]** 본 spec 본문 §역할 / §동작 1 / §6 효능 박제 차원에서 산출물 토큰 (`src/**` / `package.json` / `tsconfig.json` / `vite.config.js` / `.husky/**` / `.github/workflows/**`) 6 토큰을 평서 박제 → (I1) 식별 게이트에 자기 포함됨 (G1 결과 6 hit 중 1 hit). 따라서 본 spec 은 자기 §carve-precondition 절 시범 박제로 (I2) 정합 — 산출물 변경 require 부재에도 자기-적용 정합. (I6) 면제 평서는 다른 메타 spec (산출물 토큰 박제 0 hit 인 자매 메타 spec) 대상으로 일반 평서 박제.
  - (G4) **[자매 메타 spec 정합 baseline]** `ls specs/30.spec/green/foundation/{lint-warning-zero-gate,diagnostic-script-auto-channel-coverage,npm-script-prefix-coherence,spec-carve-precondition}.md` → 4 메타 spec 박제 (3 기존 + 1 신규). 본 spec 신규 박제로 메타 spec 군 4건 확립.
  - (G5) **[FR-08 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/spec-carve-precondition.md | grep -cE "기본값|권장|우선|default|best practice"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 §carve-precondition 절 양식 후보 또는 자동 검출 수단 후보 라벨 부여 0). HEAD=`985c76e` 박제 시점 PASS.
  - (G6) **[FR-07 시점 비의존성 자기 검증]** `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/foundation/spec-carve-precondition.md | grep -cE "log-island-convergence|monitor-island-convergence|root-entry-island-convergence|vite-jsx-transform-channel-coherence|island-proptypes-removal|2026-05-17T06:49:56Z"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 4 followups slug / chain ID / 격리 시점 박제 0). HEAD=`985c76e` 박제 시점 PASS.
- **rationale**: (G1) 본 spec 효능 적용 대상 — 6 carve-active spec 식별 (5 외부 + 1 자기 포함). (G2) 본 spec 효능 회복 대상 — baseline 0 hit (MISS), 본 spec 박제 후 1 hit (자기 시범 박제 — 자기-적용 정합). (G3) 본 spec 자기-적용 정합 검증 — 산출물 토큰 평서 박제로 (I1) 자기 포함 + 자기 §carve-precondition 절 시범 박제. (G4) 자매 메타 spec 군 4건 확립 (3 기존 + 1 신규). (G5)(G6) RULE-07 정합 자기 검증. 매트릭스: 6 carve-active spec (자기 포함) / §carve-precondition 절 박제 1 (자기) → 차기 회수 후 6 (전수). 회귀 detection 의 zero-point — 본 baseline 박제로 (I2) 게이트 측정 가능.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-085 흡수) / pending (HEAD=`985c76e`) | 최초 박제 — spec carve-precondition 자기 선언 9 축 (I1~I9) 게이트. baseline 매트릭스: 6 carve-active spec — 5 외부 (`diagnostic-script-auto-channel-coverage.md` + `lint-warning-zero-gate.md` + `npm-script-prefix-coherence.md` + `node-modules-extraneous-coherence.md` + `tooling.md`) + 1 자기 포함 (효능 박제 차원 산출물 토큰 평서) / §carve-precondition 절 박제 1 hit (자기 시범 박제 정합 — 자기-적용) / 5 외부 carve-active spec MISS (G2 회복 대상 zero-point). 본 spec 분리 결정 근거: 자매 메타 spec (`lint-warning-zero-gate.md` REQ-080 / `diagnostic-script-auto-channel-coverage.md` REQ-081 / `npm-script-prefix-coherence.md` REQ-083) 와 패턴 동질 (자동 게이트 횡단 메타) + 영역 직교 (warning rule level / 자동 채널 부착 / npm script naming / spec 본문 §carve-precondition 4 채널 직교). 별 spec 박제 결정 vs 자매 spec 흡수 vs `tooling.md` 내부 흡수 trade-off — 별 spec 박제 결정 근거: 4 자매 메타 spec 일관성 (각 메타 효능 별 spec 박제 패턴) + spec 본문 양식 박제 (다른 spec 본문 형태 메타) 의 변경 영향 분리 효능 + 자동 게이트 측정 표면 단일성 (G2 단일 grep). consumed req: `specs/20.req/20260517-spec-carve-precondition-self-declaration.md` (REQ-085) → `60.done/2026/05/17/req/` mv. consumed followup cluster (감사 pointer, 본문 미박제 — G6 자기 검증 정합): `specs/60.done/2026/05/17/followups/20260517-0649-log-island-convergence-from-blocked.md` + `monitor-island-convergence-from-blocked.md` + `root-entry-island-convergence-from-blocked.md` + `vite-jsx-transform-channel-coherence-from-blocked.md` (4 followups, 2026-05-17T06:49:56Z 동시 격리, planner 18th-20th tick chain). RULE-07 자기검증 — (I1)~(I9) 모두 평서형·반복 검증 가능 (`grep` 단일 명령 G1/G2)·시점 비의존 (G6 0 hit — 본 spec 본문에 구체 carve-active spec 파일명 / chain ID / 4 followups slug / 격리 시점 박제 0)·incident 귀속 부재 (REQ-085 §배경 의 4 followups 격리 incident 는 §변경 이력 / §참고 한정 박제 — 본문 §역할 ~ §의존성 영역 비박제)·수단 중립 (G5 0 hit — §carve-precondition 절 양식 후보 / 자동 검출 수단 후보 라벨 0). RULE-06 §스코프 규칙 6 gate (G1~G6) 실측 박제 + `expansion` `허용` (carve-active spec 신규 추가 자동 적용). RULE-01 inspector writer 영역만 (`30.spec/green/foundation/spec-carve-precondition.md` create). | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-spec-carve-precondition-self-declaration.md` (REQ-085 — 본 세션 mv).
- **followup cluster 흡수 (본 spec 의 트리거, 4건 — 2026-05-17T06:49:56Z 동시 격리)**:
  - `specs/60.done/2026/05/17/followups/20260517-0649-log-island-convergence-from-blocked.md` (planner 20th tick, 정체 회차 2회차).
  - `specs/60.done/2026/05/17/followups/20260517-0649-monitor-island-convergence-from-blocked.md` (planner 20th tick, 정체 회차 2회차).
  - `specs/60.done/2026/05/17/followups/20260517-0649-root-entry-island-convergence-from-blocked.md` (planner 20th tick, 정체 회차 2회차, src-typescript-migration island 종착 카테고리).
  - `specs/60.done/2026/05/17/followups/20260517-0649-vite-jsx-transform-channel-coherence-from-blocked.md` (planner 18th tick, 정체 회차 2회차, 6번째 동일 카테고리).
- **cluster 공통 음영 (본 spec 메타 효능의 회복 대상)**: 4 followups 모두 후속 필요 사항 (1) 환경 회귀 회복 + (2) RULE-02 chain 해소 + (3) precondition spec 해소 3 조건을 followup 본문에 박제했으나 — green spec 본문에는 미박제. 본 효능 도입으로 spec 본문 §carve-precondition 절 박제 → 자가 차단 신호 확립.
- **자매 메타 spec (이미 박제, 본 spec 직교)**:
  - `30.spec/green/foundation/lint-warning-zero-gate.md` (REQ-20260517-080, master gate 메타 효능, lint warning 채널).
  - `30.spec/green/foundation/diagnostic-script-auto-channel-coverage.md` (REQ-20260517-081, 자동 채널 메타 효능, 진단 script 채널).
  - `30.spec/green/foundation/npm-script-prefix-coherence.md` (REQ-20260517-083, 명명 카테고리 메타 효능, npm script naming 채널).
- **carve-active spec (G1 식별 baseline 5건, 본 효능 적용 대상)**:
  - `30.spec/green/foundation/diagnostic-script-auto-channel-coverage.md` — 진단 script 자동 채널 부착 (carve 시 `.github/workflows/**` + `.husky/**` 변경).
  - `30.spec/green/foundation/lint-warning-zero-gate.md` — ESLint warning 게이트 (carve 시 `eslint.config.js` + `package.json` 변경).
  - `30.spec/green/foundation/npm-script-prefix-coherence.md` — npm script naming (carve 시 `package.json:scripts` 변경).
  - `30.spec/green/foundation/node-modules-extraneous-coherence.md` — extraneous dep (carve 시 `package.json` + `package-lock.json` 변경).
  - `30.spec/green/foundation/tooling.md` — tooling 통합 (carve 시 `eslint.config.js` + `package.json` + `.husky/**` 변경).
- **직교 영역 (본 spec 외)**:
  - 환경 회귀 자체 회복 수단 — `devbin-install-integrity` (REQ-20260517-064 done), `runtime-dep-version-coherence` (done), `toolchain-version-coherence` (done), `node-modules-extraneous-coherence` (done), `node-runtime-version-3axis-coherence` (REQ-079 done), `type-safe-island-typecheck-regression-recovery` (done).
  - 자동 검출 스크립트 — `scripts/check-carve-precondition.sh` (가설명) 같은 진단 channel 부착은 `diagnostic-script-auto-channel-coverage.md` 메타 효능 영역 별 task 후보.
  - planner agent 본문 행동 박제 — `.claude/agents/planner.md` 변경은 별 축 (본 spec 은 spec 본문 메타 효능만).
  - 4 followups 가 박제한 개별 spec 4건 (`log/monitor/root-entry/vite-jsx-transform` from-blocked) 본문 patch — 이미 done req 로 본문 박제 완료. 본 spec 은 그 본문에 §carve-precondition 절 후가 박제 효능만 요구.
- **외부 레퍼런스**:
  - Pact / OpenAPI / TLA+ spec language `pre-condition` / `requires` 절 양식 — 본 효능의 markdown 변형 idiom.
  - GitHub Actions workflow `jobs.<job>.if: <expression>` precondition syntax — task carve 시점 조건 self-check 자연 idiom (수단 후보, 본 spec 비박제 — 수단 중립).
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G6 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`grep` 단일 명령 G1/G2) · incident 귀속 부재 (4 followups 격리 incident 는 §변경 이력 / §참고 한정). 수단 박제 0 (G5 0 hit 자기 검증).
  - RULE-06: grep-baseline 6 gate (G1~G6) 실측 박제 (HEAD=`985c76e`) + `expansion` `허용`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/spec-carve-precondition.md` create).
