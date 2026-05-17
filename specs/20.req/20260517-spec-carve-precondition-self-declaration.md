# spec carve precondition 자기 선언 — green spec 의 §carve-precondition 절 박제 + 동시 격리 chain 면역 효능

> **ID**: REQ-20260517-085
> **작성일**: 2026-05-17
> **상태**: Draft

## 개요
`30.spec/green/foundation/**` 의 메타 spec 군이 환경 회귀 + RULE-02 재시도 금지 chain + 선행 precondition spec 미해소 상태에서 planner carve 시 **동일 원인 cluster 로 동시 격리** 되는 cycle 이 반복 관찰되었다. 4 followups (`log-island-convergence`, `monitor-island-convergence`, `root-entry-island-convergence`, `vite-jsx-transform-channel-coherence` — 모두 2026-05-17T06:49:56Z 격리 박제) 가 공통적으로 `node_modules/{vite,vitest,@eslint/js} ABSENT` + `tsc --noEmit TS6046/TS2688/TS5070 3 hit` + `npm run lint ERR_MODULE_NOT_FOUND` + `island-proptypes-removal` chain 잔존을 후속 필요 사항 항목 1~4 에 박제했다. 환경 회복 후 4 spec 격리 해소됨에도 **carve precondition 자체가 green spec §본문에 평서 박제 미흡** → planner 가 매 tick 동일 fail 반복 + 동일 시계열 격리 cycle 재진입 위험. 본 req 는 결과 효능 — green foundation spec 중 (a) `src/**` 산출물 변경을 동반하는 task 를 carve precondition 으로 요구하는 spec 들이 §carve-precondition (또는 §의존성 하위 평서) 절에 환경 채널 가용성 + 선행 spec done 상태 + RULE-02 chain 비활성을 명시해야 한다는 **자기 선언 메타 효능** — 만 박제 후보로 제시한다. 수단 (절 명문화 형식 / 자동 검출 스크립트 / planner 측 진단 게이트) 선정은 inspector/planner 영역.

## 배경
- **현장 근거 (HEAD=`1628572`, 2026-05-17 실측, 동일 작업 트리)**:
  - `specs/10.followups/20260517-0649-log-island-convergence-from-blocked.md:24-28` — "후속 필요 사항: 1. 환경 회귀 회복 ... 2. RULE-02 재시도 금지 chain 해소 ... 3. precondition spec 해소 ... 4. (i)+(ii)+(iii) 동시 충족 시 carve 진입 가능".
  - `specs/10.followups/20260517-0649-monitor-island-convergence-from-blocked.md:23-26` — 동일 3 조건 박제.
  - `specs/10.followups/20260517-0649-root-entry-island-convergence-from-blocked.md:26-31` — 4 조건 박제 (환경 회귀 + chain 해소 + precondition spec 해소 + 빌드 채널 회복).
  - `specs/10.followups/20260517-0649-vite-jsx-transform-channel-coherence-from-blocked.md:21-24` — 환경 회복 + 정식 경로 (discovery → inspector → green 복귀) 2 조건 박제.
  - **공통 메타 패턴**: 4 followups 모두 carve precondition 을 followup 본문에 박제했으나 **green spec 본문에는 미박제** — 즉 spec 자기 진술이 carve 가능 시점 조건을 평서 박제 0.
- **선행 done req / spec 검토 (중복 회피 grep)**:
  - `REQ-20260517-064` (`devbin-install-integrity`, done) — node_modules dev 부분 박제 (수단 — bin 무결성). **본 req 는 spec 본문 자기 선언 효능** (별 축 — meta-effect on spec content).
  - `REQ-20260517-runtime-dep-version-coherence` (done) — runtime dep version 정합 (수단 — `package.json` declared version). 본 req 와 직교.
  - `REQ-20260517-toolchain-version-coherence` (done) — toolchain version 정합 (수단). 본 req 와 직교.
  - `REQ-20260517-node-modules-extraneous-coherence` (done) — extraneous 박제 (수단). 본 req 와 직교.
  - `REQ-20260517-node-runtime-version-3axis-coherence` (done) — Node 3축 정합 (수단). 본 req 와 직교.
  - `REQ-20260517-type-safe-island-typecheck-regression-recovery` (done) — typecheck island 회복 게이트 (수단). 본 req 와 직교.
  - `REQ-20260517-{log,monitor,root-entry,vite-jsx-transform}-...` (done, 4건) — 이미 본문 spec 박제 완료. **본 req 는 그 본문에 §carve-precondition 절 신설 효능** — 즉 이전 req 들의 산출물 spec 에 메타 효능을 후가 박제 (별 축).
  - `grep -rnE "carve-precondition|§carve\b|carve\s*precondition" specs/{20.req,30.spec,60.done}` → 0 hit (메타 효능 미박제 — 본 req 는 신규 축).
  - `REQ-20260517-080` (`eslint-warning-zero-master-gate`, done) — master gate 메타 효능 (수단 — ESLint rule). 본 req 와 메타 패턴 유사 (자기 선언 게이트) 이나 채널 직교 (lint warning vs carve precondition).
  - `REQ-20260517-081` (`diagnostic-script-auto-channel-coverage`, done) — 진단 script 자동 채널 부착 메타 효능. 본 req 와 자매 메타 효능 (`diagnostic-script` 가 진단 스크립트 채널 박제 → 본 req 가 spec 본문 §carve-precondition 절 박제, 채널 직교).
- **followup cluster 관찰**:
  - 4 followups 동시 격리 + 동일 원인 (환경 회귀 + chain 잔존) → cluster 단위 메타 시그널. 개별 spec 의 본문 결함이 아니라 **green foundation spec 들의 본문 양식 자체에 §carve-precondition 절 부재** 가 공통 음영.
  - 이전 cycle 에서도 `island-proptypes-removal` (9th-13th, 5 tick 정체) / `toolchain-version-coherence` (5th-7th, 3 tick) / `devbin-install-integrity` (16th, 격리 후 revive) — 동일 patterns 반복. 메타 cluster 4건 (현재) + 시계열 누적 9 spec 동일 카테고리 격리 (followup `monitor-island-convergence:30` 박제: "9 spec 모두 동일 카테고리").
- **외부 신호**:
  - RULE-07 정합 — "시스템이 무엇이어야 하는가 평서문" — 본 req 는 green spec 본문이 자기 carve 조건을 평서 박제해야 한다는 메타 효능. 1회성 진단 아님 (반복 가능 + 시점 비의존).
  - 일반 SDD precedent — Pact / OpenAPI / TLA+ 등 spec language 의 `pre-condition` / `requires` 절 양식 — 본 req 는 그 패턴의 markdown 변형.
  - GitHub Actions workflow `if:` precondition syntax — `jobs.<job>.if: <expression>` 형태 — task carve 시점 조건 self-check 의 자연 idiom (수단 후보, 본 req 비박제).

## 목표
- **In-Scope** (req 단위):
  - green foundation spec 중 carve 시 `src/**` 또는 `package.json` / `tsconfig.json` / `vite.config.js` / `.husky/**` / `.github/workflows/**` 등 산출물 변경을 동반하는 spec (이하 "carve-active spec") 은 §carve-precondition 절 (또는 §의존성 하위 평서) 에 다음 3 차원을 평서 박제해야 한다는 **자기 선언 메타 효능**:
    - (P1) **환경 채널 가용성** — carve 직전 충족 필요한 환경 게이트 (예: `node_modules/<dep>` 존재, `npx tsc --noEmit` exit 0, `npm run lint` ESM resolve 성공). 구체 수단 (어느 dep / 어느 명령) 은 각 spec 도메인이 결정 + 본 req 는 평서 박제 자체만 요구.
    - (P2) **선행 spec done 상태** — carve 가능 시점 필요한 선행 spec 의 done 상태 (예: `devbin-install-integrity` REQ-064 done + `path-alias-resolver-coherence` REQ-065 done). spec 간 grant cross-ref 박제.
    - (P3) **RULE-02 재시도 금지 chain 비활성** — 이전 carve fail-fast chain (예: `island-proptypes-removal` 9th-13th + `TSK-20260517-{01,02,03}` 환경 회귀 chain) 의 followup 처리 완료 신호. chain 활성 시 carve 진입 금지 자가 선언.
  - 위 3 차원은 §carve-precondition 절 (선호) 또는 §의존성 하위 평서 (대안) 양식으로 박제. 절 명문화 형식 (markdown heading vs bullet vs table) 은 inspector/planner 결정 — 본 req 는 박제 자체만 요구.
- **Out-of-Scope**:
  - 환경 회귀 자체의 복구 수단 박제 — `devbin-install-integrity` (REQ-064 done) / `runtime-dep-version-coherence` (done) / `toolchain-version-coherence` (done) 등 별 spec 영역.
  - 자동 검출 스크립트 구현 — `scripts/check-carve-precondition.sh` 같은 진단 스크립트 자동 채널 부착은 `foundation/diagnostic-script-auto-channel-coverage.md` (REQ-081 done) 메타 효능 영역.
  - planner agent 측 진단 게이트 코드 변경 — `.claude/agents/planner.md` 본문 박제는 본 req 범위 밖. 본 req 는 spec 본문 메타 효능만 박제, agent 행동 박제는 별 축.
  - 4 followups 가 박제한 구체 spec 4건 (`log/monitor/root-entry/vite-jsx-transform`) 의 개별 본문 patch — 이미 done req 로 본문 박제 완료. 본 req 는 그 본문에 §carve-precondition 절 후가 박제 효능만 요구.
  - `30.spec/green/components/**` 또는 `30.spec/blue/**` 영역 — 본 req 는 `30.spec/green/foundation/**` 한정. blue 승격 시 효능 동일 적용 (승격 시 절 유지).
  - 본 req 파생 spec 본문에서 §carve-precondition 절 양식 후보 (heading vs bullet vs table vs cross-ref-only) 에 "기본값" / "권장" / "우선" / "default" / "best practice" 라벨 부여 (RULE-07 정합 + 수단 중립).

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | (G1) **carve-active spec 식별 게이트** — `30.spec/green/foundation/**` 하위 spec 중 §역할 또는 §동작 본문이 `src/**` 또는 `package.json` / `tsconfig.json` / `vite.config.js` / `.husky/**` / `.github/workflows/**` 등 산출물 변경을 require / imply / propose / 박제하는 spec (= carve-active spec) 은 본 효능 적용 대상. 측정: `grep -lE "src/\*\*\|package\.json\|tsconfig\.json\|vite\.config\.js\|\.husky/\|\.github/workflows/" specs/30.spec/green/foundation/*.md` → N 파일 (현 시점 N = inspector 흡수 시점 실측, 본 req 본문 비박제 — RULE-07 시점 비의존). 비-carve-active spec (예: 메타 spec 군) 은 본 효능 적용 면제 (예외 규칙 평서 박제). | Must |
| FR-02 | (G2) **§carve-precondition 절 박제 게이트** — 모든 carve-active spec 은 §carve-precondition 절 (또는 §의존성 하위 평서) 에 (P1) 환경 채널 가용성 + (P2) 선행 spec done 상태 + (P3) RULE-02 chain 비활성 3 차원을 평서 박제. 측정: `grep -lE "##\s+carve-precondition\|§carve-precondition\|carve precondition" <carve-active-spec>` → 1+ hit per spec. 절 명문화 형식 (heading vs bullet vs table) 은 spec 도메인 결정 — 본 게이트는 박제 자체 hit count 만 측정. | Must |
| FR-03 | (G3) **(P1) 환경 채널 가용성 평서 박제** — §carve-precondition 절 내부 (P1) 차원이 평서문으로 carve 직전 충족 필요 환경 게이트를 명시. 예 (수단 후보, spec 도메인 결정): `node_modules/<dep>` 존재, `npx tsc --noEmit` exit 0, `npm run lint` exit 0, `npm test -- --run` exit 0, `npm run build` exit 0. 본 req 는 평서 박제 자체만 요구 — 구체 dep / 명령 / 게이트 nullness 는 spec 도메인 결정. | Must |
| FR-04 | (G4) **(P2) 선행 spec done 상태 평서 박제** — §carve-precondition 절 내부 (P2) 차원이 선행 spec done 상태를 grant cross-ref 로 박제. 예: "선행 의존 — `devbin-install-integrity` (REQ-064) done + `path-alias-resolver-coherence` (REQ-065) done". cross-ref 형식은 `(REQ-YYYYMMDD-NNN)` ID + `done` 또는 `blue 승격` 상태 라벨. | Must |
| FR-05 | (G5) **(P3) RULE-02 chain 비활성 평서 박제** — §carve-precondition 절 내부 (P3) 차원이 carve 진입 금지 chain (예: `island-proptypes-removal` 9th-13th + `TSK-<ID>` 환경 회귀 chain) 의 followup 처리 완료 신호를 평서 박제. chain 식별자 + 처리 완료 신호 (60.done revive 완료 또는 명시 종결 신호) 박제. | Must |
| FR-06 | (G6) **비-carve-active 예외 규칙** — 메타 spec (예: `lint-warning-zero-gate.md` / `diagnostic-script-auto-channel-coverage.md` / `npm-script-prefix-coherence.md` 같이 효능 박제 전용, `src/**` 산출물 변경 require 0 spec) 은 §carve-precondition 절 박제 면제. 면제 기준 — §역할 / §동작 본문에 산출물 grep 패턴 0 hit (FR-01 식별 게이트 inverse). 본 req 파생 spec 은 예외 기준을 평서 박제. | Should |
| FR-07 | (G7) **시점 비의존 (RULE-07)** — 본 req 파생 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 구체 carve-active spec 파일명 / 차원별 구체 dep 명 / chain ID 박제 0. 수치 / 파일명 / chain 식별자는 §변경 이력 메타 1회 부속 + §스코프 규칙 baseline + §참고 감사성 메타 한정 (자매 spec `lint-warning-zero-gate` / `diagnostic-script-auto-channel-coverage` 동일 패턴). | Must |
| FR-08 | (G8) **수단 중립** — 효능 충족 수단 — (a) §carve-precondition 절 markdown heading 신설 (선호 양식), (b) §의존성 하위 평서 박제 (대안 양식), (c) 별 자매 spec carve (예: `foundation/spec-carve-precondition-meta.md` 단일 메타 spec 에 cross-ref) — 어느 쪽이든 본 효능 충족. 본 req 파생 spec 은 수단 후보 라벨 부여 0 (`awk` + `grep` 0 hit 자기 검증). | Must |
| FR-09 | (G9) **메타 패턴 정합 자매 spec** — 본 효능은 `foundation/lint-warning-zero-gate.md` (REQ-080 done, master gate 메타 효능) + `foundation/diagnostic-script-auto-channel-coverage.md` (REQ-081 done, 자동 채널 메타 효능) 자매 메타 효능. 채널 직교 — master gate 는 lint warning 채널, 자동 채널은 진단 script 채널, 본 spec 은 spec 본문 §carve-precondition 채널. 본 정합은 본 req 파생 spec §역할 또는 §의존성 에 평서 박제. | Should |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 시점 비의존 | 본 req 파생 spec 은 carve-active spec 파일명 / chain 식별자 / 4 followups 시점 박제 (`2026-05-17T06:49:56Z`) 를 본문에 하드코딩하지 않는다. baseline 매트릭스 + cluster 식별 명령은 §스코프 규칙 grep-baseline 한정 (자매 spec `lint-warning-zero-gate` / `diagnostic-script-auto-channel-coverage` 동일 패턴). FR-07 동치. |
| NFR-02 | 게이트 단일성 | 본 효능 박제는 2 grep 명령 (G1 carve-active 식별 / G2 §carve-precondition 절 박제) 단일 절차로 측정 가능. 3 차원 (P1/P2/P3) 의 평서 박제 측정은 자연어 인식 — 본 spec 은 grep 한정 게이트만 의무 박제 + 차원별 자연어 박제는 inspector 정성 판정. |
| NFR-03 | 채널 직교 | 본 §carve-precondition 채널은 `lint-warning-zero-gate` (lint warning master gate) / `diagnostic-script-auto-channel-coverage` (진단 script 자동 채널) 자매 메타 효능과 직교. 어느 한 채널 위반이 다른 채널 게이트를 자동 충족시키지 않는다. |
| NFR-04 | 자동 채널 부착 음영 | 본 req 는 효능 박제 한정 — 자동 채널 (CI step / husky hook / npm script) 부착은 `foundation/diagnostic-script-auto-channel-coverage.md` 메타 효능 게이트 영역. 본 spec 박제 후 별 task 가 자동 채널 부착 결정 (수단 중립). |
| NFR-05 | RULE-07 정합 | 본 효능은 시스템이 "무엇이어야 하는가" 평서문 — green foundation spec 은 §carve-precondition 절 박제 + carve 가능 시점 자기 선언. 1회성 진단 (4 followups 작성 시점 환경 회귀) 아님 — 반복 가능 + 시점 비의존 메타 효능. |
| NFR-06 | RULE-06 정합 | 본 req 파생 spec 의 §스코프 규칙 grep-baseline 은 (G1)(G2) 2 게이트 실측 박제 + 예외 규칙 (비-carve-active 메타 spec) 평서 박제 + `expansion` `허용` (carve-active spec 신규 추가 시 본 효능 자동 적용 — scope 확장 허용). |
| NFR-07 | 수단 라벨 0 | 본 req 파생 spec 본문에서 §carve-precondition 절 양식 후보 (heading vs bullet vs table vs cross-ref-only) 에 "기본값" / "권장" / "우선" / "default" / "best practice" 라벨 부여 0. 측정: `awk '/^## 역할/,/^## 의존성/' <spec> \| grep -cE "기본값\|권장\|우선\|default\|best practice"` → 0. |
| NFR-08 | followup cluster 흡수 | 본 req 는 4 followups (`log-island-convergence` / `monitor-island-convergence` / `root-entry-island-convergence` / `vite-jsx-transform-channel-coherence` from-blocked) 의 메타 cluster 흡수. 4 followups 의 개별 원인 (환경 회귀 + chain 잔존 + precondition spec 미해소) 은 본 req 범위 밖 (별 done req 박제 완료). 본 req 는 cluster 의 공통 음영 (spec 본문 §carve-precondition 절 부재) 만 박제. |

## 수용 기준
- [ ] (Must, FR-01) `grep -lE "src/\*\*\|package\.json\|tsconfig\.json\|vite\.config\.js\|\.husky/\|\.github/workflows/" specs/30.spec/green/foundation/*.md` → N 파일 (inspector 흡수 시점 실측, 본 req 본문 비박제). carve-active spec 식별 게이트 실행 가능.
- [ ] (Must, FR-02) carve-active spec N 개 각각에 `grep -lE "##\s+carve-precondition\|§carve-precondition\|carve precondition" <spec>` → 1+ hit. baseline 0 hit → 목표 1+ hit per spec.
- [ ] (Must, FR-03) §carve-precondition 절 내부 (P1) 환경 채널 가용성 평서 박제 — spec 도메인 결정 (구체 dep / 명령 / nullness).
- [ ] (Must, FR-04) §carve-precondition 절 내부 (P2) 선행 spec done 상태 grant cross-ref 박제 — `(REQ-YYYYMMDD-NNN)` ID + 상태 라벨.
- [ ] (Must, FR-05) §carve-precondition 절 내부 (P3) RULE-02 chain 비활성 chain 식별자 + 처리 완료 신호 평서 박제.
- [ ] (Should, FR-06) 비-carve-active 메타 spec 예외 기준 평서 박제 — §역할 / §동작 본문 산출물 grep 패턴 0 hit inverse.
- [ ] (Must, FR-07) 시점 비의존 자기 검증 — 본 req 파생 spec 본문에서 carve-active spec 파일명 / chain 식별자 / 4 followups 시점 박제 0. `awk` + `grep` 0 hit 자기 검증 게이트.
- [ ] (Must, FR-08) 수단 라벨 0. `awk '/^## 역할/,/^## 의존성/' <spec> \| grep -cE "기본값\|권장\|우선\|default\|best practice"` → 0.
- [ ] (Should, FR-09) 자매 메타 spec (lint-warning-zero-gate / diagnostic-script-auto-channel-coverage) 와 채널 직교 평서 박제.
- [ ] (NFR-01) FR-07 동치.
- [ ] (NFR-02) 2 grep 명령 단일 절차 박제. 3 차원 (P1/P2/P3) 자연어 박제는 inspector 정성 판정.
- [ ] (NFR-03) 채널 직교 — §carve-precondition vs lint-warning-zero-gate vs diagnostic-script-auto-channel-coverage 독립.
- [ ] (NFR-04) 자동 채널 부착은 `foundation/diagnostic-script-auto-channel-coverage.md` 메타 효능 영역 (음영 명시).
- [ ] (NFR-05) RULE-07 정합 — 평서문 + 반복 검증 가능 + 시점 비의존 메타 효능.
- [ ] (NFR-06) RULE-06 정합 — §스코프 규칙 grep-baseline 2 게이트 + 예외 규칙 평서 박제 + `expansion` `허용`.
- [ ] (NFR-07) FR-08 동치.
- [ ] (NFR-08) 4 followups cluster 흡수 박제.

## 참고
- 흡수 followups (4건, 모두 2026-05-17T06:49:56Z 작성):
  - `specs/10.followups/20260517-0649-log-island-convergence-from-blocked.md` (격리 시점 planner 20th tick @HEAD=7477189, 정체 회차 2회차).
  - `specs/10.followups/20260517-0649-monitor-island-convergence-from-blocked.md` (격리 시점 planner 20th tick @HEAD=7477189, 정체 회차 2회차).
  - `specs/10.followups/20260517-0649-root-entry-island-convergence-from-blocked.md` (격리 시점 planner 20th tick @HEAD=7477189, 정체 회차 2회차, src-typescript-migration island 종착 카테고리).
  - `specs/10.followups/20260517-0649-vite-jsx-transform-channel-coherence-from-blocked.md` (격리 시점 planner 18th tick @HEAD=24183430, 정체 회차 2회차, 6번째 동일 카테고리).
- cluster 공통 음영: 4 followups 모두 후속 필요 사항 (1) 환경 회귀 회복 + (2) RULE-02 chain 해소 + (3) precondition spec 해소 3 조건 박제 — green spec 본문에는 미박제.
- 자매 메타 효능 spec (이미 박제):
  - `30.spec/green/foundation/lint-warning-zero-gate.md` (REQ-080 done, master gate 메타 효능, lint warning 채널).
  - `30.spec/green/foundation/diagnostic-script-auto-channel-coverage.md` (REQ-081 done, 자동 채널 메타 효능, 진단 script 채널).
  - `30.spec/green/foundation/npm-script-prefix-coherence.md` (npm script prefix 메타 효능).
- 직교 영역 (본 req 외):
  - 환경 회귀 자체 회복 수단 — `devbin-install-integrity` (REQ-064 done), `runtime-dep-version-coherence` (done), `toolchain-version-coherence` (done), `node-modules-extraneous-coherence` (done), `node-runtime-version-3axis-coherence` (done), `type-safe-island-typecheck-regression-recovery` (done).
  - 자동 검출 스크립트 — `scripts/check-carve-precondition.sh` (가설명) 같은 진단 channel 부착은 별 task 후보 (`diagnostic-script-auto-channel-coverage` 영역).
  - planner agent 본문 행동 박제 — `.claude/agents/planner.md` 변경은 별 축 (본 req 는 spec 본문 메타 효능만).
- 흡수 시 inspector 결정 사항:
  - §carve-precondition 절 양식 — markdown heading (`## carve-precondition`) vs §의존성 하위 평서 vs 별 자매 메타 spec carve (예: `foundation/spec-carve-precondition-meta.md` 단일 메타 spec 에 cross-ref).
  - carve-active spec 식별 grep 패턴 정밀화 — `src/**` / `package.json` / `tsconfig.json` / `vite.config.js` / `.husky/**` / `.github/workflows/**` 6 토큰 외 추가 (예: `eslint.config.js` / `.prettierrc` / `scripts/**`).
  - 비-carve-active 메타 spec 예외 기준 — `§역할 + §동작` 본문 grep 0 hit inverse 외 추가 기준 (예: spec 도메인 라벨 frontmatter, `meta-effect: true` 라벨).
  - (P1)(P2)(P3) 3 차원 평서 박제 의무 vs 선택 — 3 차원 모두 박제 필수 vs 도메인 결정 (예: P3 chain 비활성은 chain 활성 spec 한정).
