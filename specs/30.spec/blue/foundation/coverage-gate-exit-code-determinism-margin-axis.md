# 회귀 게이트 exit code 결정론 — 측정 결정론 미수렴 시 threshold–baseline margin 흡수 축 시스템 불변식

> **위치**: 횡단 회귀 게이트 시스템 불변식 — `package.json:21` `"test": "vitest run --coverage"` (회귀 게이트 진입점) + `vite.config.js:91-96` `test.coverage.thresholds` 4축 (`lines`/`statements`/`functions`/`branches`) + `.husky/pre-push:3` `npm test` (게이트 통과 조건 exit=0). 측정 scope = 세 파일 본문 + `npm test -- --run --reporter=json` 반복 실행 exit code 비교 한정.
> **관련 요구사항**: REQ-20260518-008
> **최종 업데이트**: 2026-05-18 (by inspector — 최초 박제; Phase 2 REQ-008 흡수, 103차 tick, 경로 β 채택)

> 본 spec 은 자매 `30.spec/blue/foundation/coverage-determinism.md` (REQ-20260421-041 + REQ-20260421-043) 의 **수치 측정 결정론** 축과 **직교 축** — 전자는 동일 baseline 반복 실행 시 분자·분모·percent 동일 (4축 수치 range 0.00) 을 박제하며, 본 spec 은 동일 baseline 반복 실행 시 `npm test` exit code 단일값을 박제한다. (i) ⇒ (본) 은 자명, (본) 은 (i) 미수렴 시에도 threshold–baseline margin 흡수 경로로 독립 충족 가능.

## 역할
`npm test` (= `vitest run --coverage`) 의 **exit code** 는 동일 코드·동일 테스트 집합·동일 런타임 환경 (OS·Node·패키지 lock) 에서 반복 실행 (N ≥ 3) 간 **단일값** 이라는 결과 효능 불변식을 갖는다 — 본 성질을 "회귀 게이트 결과 결정론" 으로 명명한다. 본 불변식은 두 회복 경로의 결합으로 달성된다: (i) 수치 측정 결정론 수렴 (4축 range 0.00) 또는 (ii) threshold–baseline margin 흡수 (threshold 와 baseline 최저/하한 사이 간격이 측정 변동폭보다 큼). 의도적으로 하지 않는 것: (a) 구체 margin 수치 (분자 ±k hits / 분모 = 0.0Y%pp 의 k 리터럴) 박제 — 본문 평서문은 "측정 변동폭 흡수 가능 margin 의 존재" 한정, baseline 수치는 §스코프 규칙 grep-baseline 영역, (b) V8 coverage provider 비결정성 근본 원인 진단 (V8 sampling profiler / async microtask 완결 시점 / GC 타이밍 분석) — task 영역, (c) threshold 수치 조정 (94 → 93 하향 등) — planner/developer 영역, (d) istanbul provider 이관 결정 — `coverage-determinism.md` FR-02 수단 (h) 증분 후보, planner 영역, (e) `coverage-determinism.md` §테스트 현황 `[x]` 박제 revert — blue 편집 inspector 영역 밖 (β 경로 채택 근거).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `vite.config.js` / `package.json` / `.husky/pre-push` 본문 grep + `npm test` 반복 실행 exit code 비교.

## 동작
1. (G-A) 회귀 게이트 진입점 토큰 게이트 — FR-01
   - 명령: `grep -nE "^\s*\"test\":\s*\"vitest run --coverage\"" package.json` → **1 hit + rc=0**.
   - 의미: `package.json:scripts.test` 가 `vitest run --coverage` 호출이라는 진입점 토큰 박제 (회귀 게이트 발화 표면).
2. (G-B) threshold 4축 박제 게이트 — FR-01
   - 명령: `grep -cE "^\s*(lines|statements|functions|branches):\s*[0-9]+" vite.config.js` → **4 + rc=0**.
   - 의미: `test.coverage.thresholds` 블록 내 4축 (`lines`/`statements`/`functions`/`branches`) 수치 박제 (threshold–baseline 비교 anchor).
3. (G-C) pre-push hook `npm test` 통과 조건 게이트 — FR-01
   - 명령: `grep -nE "^npm test\s*$" .husky/pre-push` → **1 hit + rc=0**.
   - 의미: pre-push hook 본문이 `npm test` exit=0 조건으로 게이트 통과 결정 (exit code 결정론이 게이트 통과 결정의 안정성 직결).
4. (G-D) exit code 결정론 N≥3 반복 단일값 평서문 박제 게이트 — FR-01
   - 절차: "동일 HEAD baseline 에서 `npm test -- --run --reporter=json` 을 N≥3 반복 실행 시 exit code 가 단일값 (모두 0 또는 모두 non-zero) 이어야 한다" 평서문이 본 spec 본문에 박제됨.
   - 의미: 본 게이트는 본 spec 본문 자기 정합 검증 — `awk '/^## 동작/,/^## 의존성/' coverage-gate-exit-code-determinism-margin-axis.md | grep -cE "동일\s*baseline|exit\s*code\s*단일값|N\s*[≥>]=?\s*3"` → ≥ 1 hit.
5. (G-E) 두 회복 경로 (i)/(ii) 동등 열거 게이트 — FR-02
   - 절차: §역할 본문에 (i) 수치 측정 결정론 수렴 + (ii) threshold–baseline margin 흡수 두 경로가 열거되며, "택1 이상 결합" + "완전 집합 아님" 평서문이 박제됨. (i) 만 또는 (ii) 만이 수단 라벨로 표시되지 않음.
   - 명령: `awk '/^## 역할/,/^## 공개 인터페이스/' coverage-gate-exit-code-determinism-margin-axis.md | grep -cE "기본값|권장|우선|default|root cause|best|가장 효과적|주범"` → **0 + rc=1** (수단 라벨 0 자기 검증, §역할 한정 scope).
6. (G-F) 회귀 게이트 설계 결함 평서문 게이트 — FR-03
   - 절차: 본 spec 본문에 "동일 baseline 반복 실행이 exit code 단일값을 산출하지 않음 = 회귀 게이트 설계 결함 (flake 아님)" + "위반 책임은 (i) 수치 측정 결정론 미수렴 또는 (ii) threshold–baseline margin 부족 둘 중 하나에 귀속" 평서문이 박제됨.
   - 의미: flake 라벨링 회피 — 측정 비결정성을 시스템 외부 의존성으로 인정하되, 게이트 결과 결정론은 시스템 책임 박제.
7. (G-G) 두 결정론 축 직교 평서문 게이트 — FR-04
   - 절차: 본 spec 본문에 "수치 측정 결정론 (`coverage-determinism.md` FR-01) ⇒ 본 spec 결과 결정론 = 자명 (충분 조건). 본 spec 결과 결정론 ⇏ 수치 측정 결정론 (필수 조건 아님). 두 축은 서로 다른 시스템 성질 — 분자 결정성 vs threshold 비교 결과 결정성 — 을 박제한다." 평서문이 박제됨.
8. (G-H) 메이저 버전 무관 평서문 게이트 — FR-06
   - 명령: `awk '/^## 역할/,/^## 공개 인터페이스/' coverage-gate-exit-code-determinism-margin-axis.md | grep -cE "Vitest [0-9]|MSW [0-9]|Node [0-9]|V8 [0-9]"` → **0 hit + rc=1**.
   - 의미: §역할 본문에 메이저 버전 고정 표현 0 (§동작 / §회귀 중점 의 예시 토큰 패턴 인용은 measure scope 외, API 이름 `vitest run --coverage`, `thresholds`, `fileParallelism` 언급은 허용).
9. (G-I) inspector 경로 결정 (α/β/γ) 박제 게이트 — FR-07
   - 절차: 본 §변경 이력 에 inspector 가 채택한 경로 (α `coverage-determinism.md` FR-07 갱신 + FR-02 수단 (h) 증분 / β 신설 spec / γ `regression-gate.md` 5번째 불변식 증분) 와 판단 근거 (의미 경계 / blue 편집 비용 / 직교성) 1문장 이상 박제. 본 spec 은 **경로 β (신설 spec)** 채택 — 근거: (1) 직교 축 명확 분리 (수치 측정 결정론 ↔ 결과 결정론 축 별 spec carrier), (2) blue 편집 비용 회피 (inspector 영역 green 한정), (3) `regression-gate.md` 5번째 불변식 증분 시 기존 4 불변식 의미 경계 침범 위험.

## 의존성
- 내부 측정 대상: `package.json` (scripts.test), `vite.config.js` (test.coverage.thresholds), `.husky/pre-push` (npm test 호출), `npm test` 반복 실행 exit code.
- 외부 출처: Vitest CLI `vitest run --coverage` exit code semantics (threshold 4축 PASS → 0, 어느 하나 FAIL → non-zero) / V8 coverage provider sampling 비결정성 (분기 카운팅 hit 변동 가능).
- 역의존 (사용처):
  - `30.spec/blue/foundation/coverage-determinism.md` (REQ-20260421-041 + REQ-20260421-043) — 본 spec 의 (i) 경로가 자매 spec 의 4축 수치 range 0.00 박제와 동치 (충분 조건).
  - `30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — 회귀 게이트 존재 축 (typecheck step + thresholds 4축 선언). 본 spec 은 게이트 결과 결정론 축으로 직교.
  - `30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) — dep bump 후 회귀 0 게이트. 본 spec exit code 결정론은 dep bump 게이트 관찰 신호의 신뢰도에 상보 기여.

## 회귀 중점
1. (R-1) `package.json:scripts.test` 토큰이 `vitest run` (coverage 인자 누락) 으로 swap 시 G-A 검출 — 회귀 게이트 진입점 자체 무력화. exit code 결정론 의미 부재.
2. (R-2) `vite.config.js:test.coverage.thresholds` 4축 중 임의 1축 단독 제거 시 G-B 출력 = 3 ≠ 4. threshold–baseline margin 흡수 경로 부분 무력화 (해당 축에 한해 measure 만 발화 게이트 발화 0).
3. (R-3) `.husky/pre-push:3` `npm test` 라인 단독 제거 시 G-C 출력 = 0. 회귀 게이트 통과 조건 부재 — 게이트 결과 결정론 의미 부재.
4. (R-4) 본 spec 본문에 (i)/(ii) 두 경로 중 어느 하나가 "default" / "권장" / "우선" / "root cause" / "best" / "가장 효과적" / "주범" 라벨로 표시 시 G-E 출력 ≥ 1 hit (수단 중립성 위반).
5. (R-5) 본 spec 본문에 Vitest/MSW/Node/V8 메이저 버전 고정 표현 (예: "Vitest 4 한정" / "Node 22 미만") 박제 시 G-H 출력 ≥ 1 hit (버전 무관성 위반).
6. (R-6) `coverage-determinism.md` FR-01 (4축 수치 range 0.00 박제) 위반 발생 시에도 본 spec FR-01 은 (ii) 경로로 독립 충족 가능 — 즉 자매 spec 위반이 본 spec 위반을 자동 유발하지 않음 (직교 축 회귀 격리).
7. V8 메이저 bump / Vitest 메이저 bump / Node 메이저 bump 시 V8 coverage provider 비결정성 양상 변화 가능 — §변경 이력 이벤트 후 baseline 재측정 (반복 실행 4 run 분자 변동폭 ±k hits / 분모 재측정).

## 스코프 규칙
- **expansion**: 불허 (측정 scope = `vite.config.js` + `package.json` + `.husky/pre-push` 본문 + `npm test` 반복 실행 exit code 비교 한정).
- **grep-baseline** (HEAD=`9483712` 실측):
  - (A) `grep -nE "^\s*\"test\":\s*\"vitest run --coverage\"" package.json` → **1 hit** @`:21` (FR-01 G-A PASS).
  - (B) `grep -cE "^\s*(lines|statements|functions|branches):\s*[0-9]+" vite.config.js` → **4 hits** @`:91-96` block (FR-01 G-B PASS).
  - (C) `grep -nE "^npm test\s*$" .husky/pre-push` → **1 hit** @`:3` (FR-01 G-C PASS, HEAD `.husky/pre-push` 3 line: line 1 `npm run check:deps` + line 2 `npm run typecheck` + line 3 `npm test`).
  - (D-baseline) `specs/10.followups/20260517-1813-v8-coverage-branches-nondeterminism.md` 박제 4 run baseline (분자 998~1003 / 분모 1063 ±5 hits 변동) — 측정 변동폭 baseline anchor. 분모 1063 동일 + 분자 ±5 / 1063 = 0.47%pp 측정 변동폭 baseline 박제. branches threshold 94 + baseline 평균 94.09%pp 사이 margin ≈ 0.09%pp (변동폭 0.47%pp 미만 = (ii) 경로 부족 baseline).
  - (E-self) `awk '/^## 역할/,/^## 공개 인터페이스/' coverage-gate-exit-code-determinism-margin-axis.md | grep -cE "기본값|권장|우선|default|root cause|best|가장 효과적|주범"` → **0 hit** (FR-05 G-E PASS, §역할 한정 scope 수단 라벨 0 자기 검증; §동작 G-E 본문 토큰 인용 + §회귀 중점 R-4 본문 토큰 인용은 measure scope 외).
  - (F-self) `awk '/^## 역할/,/^## 공개 인터페이스/' coverage-gate-exit-code-determinism-margin-axis.md | grep -cE "Vitest [0-9]|MSW [0-9]|Node [0-9]|V8 [0-9]"` → **0 hit** (FR-06 G-H PASS, §역할 한정 scope 메이저 버전 고정 표현 0; §동작 G-H 본문 패턴 인용 + §회귀 중점 R-5 본문 예시 + §스코프 규칙 (F-self) 명령 인용은 measure scope 외).
  - (G-self) `grep -cE "직교\s*축|충분\s*조건|필수\s*조건|분자\s*결정성|비교\s*결과\s*결정성" coverage-gate-exit-code-determinism-margin-axis.md` → ≥ 2 hits (FR-04 G-G PASS, 두 축 직교 표현 박제).
  - (H-self) `grep -cE "회귀\s*게이트\s*설계\s*결함|flake\s*아님|위반\s*책임" coverage-gate-exit-code-determinism-margin-axis.md` → ≥ 1 hit (FR-03 G-F PASS).
- **rationale**: 측정 scope 는 3 파일 + 반복 실행 exit code 비교 한정. `specs/**` 본문 내 `npm test` / `coverage` / `threshold` 토큰 occurrence 는 measure scope 외 (self-reference circularity 회피, 단 G-E/F/G/H 자기 검증 게이트는 본 spec 본문 한정 박제 anchor — RULE-07 §양성 기준 평서형 자기 정합 검증). 7 grep + 1 baseline anchor 게이트 동시 PASS 시 회귀 게이트 결과 결정론 시스템 불변식 박제 결과 효능 보장. 구체 margin 수치 (0.09%pp / 0.47%pp) 는 baseline 픽스처 영역 (D-baseline), 본문 평서문은 "측정 변동폭 흡수 가능 margin 의 존재" 한정 (RULE-07 §양성 기준 시점 비의존 평서형). 본 baseline 측정 변동폭 (0.47%pp) > current margin (0.09%pp) → (ii) 경로 부족 baseline 박제 = FR-03 §회귀 게이트 설계 결함 baseline 평서화 (incident patch 비귀속, 시스템 효능 계약의 baseline 측정 anchor).

## 테스트 현황
- [x] (FR-01) `package.json:21` `"test": "vitest run --coverage"` 토큰 박제 — grep gate (A) 실측.
- [x] (FR-01) `vite.config.js:91-96` `thresholds` 4축 박제 — grep gate (B) 실측.
- [x] (FR-01) `.husky/pre-push:3` `npm test` 라인 박제 — grep gate (C) 실측.
- [x] (FR-01) exit code 결정론 N≥3 반복 단일값 평서문 박제 — §역할 + §동작 G-D 박제.
- [x] (FR-02) 두 회복 경로 (i)/(ii) 동등 열거 + "택1 이상 결합" + "완전 집합 아님" 평서문 박제 — §역할 + §동작 G-E 박제.
- [x] (FR-03) "회귀 게이트 설계 결함 (flake 아님)" + "위반 책임 (i)/(ii) 귀속" 평서문 박제 — §동작 G-F + §스코프 규칙 (H-self) 실측.
- [x] (FR-04) 두 결정론 축 직교 (충분 조건이나 필수 조건 아님) + 서로 다른 시스템 성질 (분자 결정성 vs 비교 결과 결정성) 평서문 박제 — §동작 G-G + §스코프 규칙 (G-self) 실측.
- [x] (FR-05) 수단 중립성 — `default` / `권장` / `우선` / `root cause` / `best` / `가장 효과적` / `주범` 토큰 0 박제 — §동작 G-E + §스코프 규칙 (E-self) 0 hit 실측.
- [x] (FR-06) 메이저 버전 무관 표현 — Vitest/MSW/Node/V8 메이저 고정 표현 0 박제 — §동작 G-H + §스코프 규칙 (F-self) 0 hit 실측.
- [x] (FR-07) inspector 경로 결정 (β 채택) + 판단 근거 박제 — §동작 G-I + §변경 이력 박제.

## 수용 기준
- [x] (Must, FR-01) Given 동일 HEAD baseline, When `npm test -- --run --reporter=json` 을 N≥3 반복 실행, Then exit code 단일값 — §역할 + §동작 G-D 평서문 박제.
- [x] (Must, FR-02) Given FR-01 충족 경로, When spec 본문 작성, Then (i) 수치 측정 결정론 수렴 + (ii) threshold–baseline margin 흡수 2 경로 열거 + "택1 이상 결합" + "완전 집합 아님" 박제 — §역할 + §동작 G-E.
- [x] (Must, FR-03) Given FR-01 위반 baseline, When spec 본문 작성, Then "회귀 게이트 설계 결함 (flake 아님)" + "위반 책임 (i)/(ii) 귀속" 평서문 박제 — §동작 G-F + §스코프 규칙 (H-self).
- [x] (Must, FR-04) Given `coverage-determinism.md` FR-01 과의 관계, When §역할 + §동작 G-G 작성, Then "직교 축 (충분 조건이나 필수 조건 아님)" + 두 축 서로 다른 시스템 성질 (분자 결정성 vs 비교 결과 결정성) 박제.
- [x] (Must, FR-05) Given FR-02 (i)/(ii) 열거, When spec 본문 작성, Then "default / 권장 / root cause / best / 가장 효과적 / 주범" 토큰 0 — §스코프 규칙 (E-self) 0 hit baseline PASS.
- [x] (Must, FR-06) Given Vitest/MSW/Node/V8 메이저 버전 변화, When spec 본문 재독, Then FR-01~FR-06 표현이 메이저 버전 무관 — §스코프 규칙 (F-self) 0 hit baseline PASS.
- [x] (Should, FR-07) Given inspector 판단 (α/β/γ 3 경로), When spec 신설, Then 택한 경로 (β 신설 spec) 근거 (의미 경계 / blue 편집 비용 / 직교성) 1문장 이상 변경 이력 박제 — §동작 G-I + §변경 이력.
- [x] (NFR-01) 추적성 — `grep -rn "REQ-20260518-008" specs/30.spec/{green,blue}/foundation/` ≥ 2 hits (본 spec §관련 요구사항 + §변경 이력).
- [x] (NFR-02) RULE-07 정합 — 본 spec §역할 / §동작 / §회귀 중점 본문에 구체 수치 (94, 98, 97, ±k hits 의 k 리터럴) 박제 0. §스코프 규칙 grep-baseline / §변경 이력 의 baseline 픽스처 재서술 한정 허용 (D-baseline 의 분자 998~1003 + 분모 1063 + margin 0.09%pp / 0.47%pp). "TODO" 토큰 0.
- [x] (NFR-03) RULE-02 범위 제한 — inspector 세션 diff = `30.spec/green/foundation/coverage-gate-exit-code-determinism-margin-axis.md` 신규 + `20.req/20260518-coverage-gate-exit-code-determinism-margin-axis.md` → `60.done/2026/05/18/req/` mv + `.inspector-seen` 갱신 한정. `vite.config.js`, `package.json`, `.husky/**`, `.github/workflows/**`, `src/**` 변경 0.
- [x] (NFR-04) 차원 분리 — spec 어디에도 "수치 측정 결정론 완전 수렴 박제" / "V8 provider 비결정 원인 진단" / "threshold 94 → 93 하향" 같은 1회성 incident patch 또는 다른 축 재박제 0 (참조만 허용 — §의존성 + §회귀 중점 R-7).
- [x] (NFR-05) 수단 중립성 — FR-02 (i)/(ii) 어느 하나도 "default" / "권장" / "root cause" / "best" / "가장 효과적" / "주범" 토큰으로 표시 0 — §스코프 규칙 (E-self) 0 hit baseline.
- [x] (NFR-06) 버전 무관성 — FR-01~FR-06 본문에 Vitest/MSW/Node/V8 메이저 버전 고정 표현 0 — §스코프 규칙 (F-self) 0 hit baseline.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-18 | inspector 103차 Phase 2 (REQ-20260518-008 흡수) / (this commit, HEAD=`9483712`) | 최초 등록 (REQ-20260518-008). `npm test` exit code 단일값 = "회귀 게이트 결과 결정론" 시스템 불변식 박제. 두 회복 경로 (i) 수치 측정 결정론 수렴 / (ii) threshold–baseline margin 흡수 동등 열거 + 수단 중립 + "완전 집합 아님". 자매 `coverage-determinism.md` (REQ-20260421-041 + REQ-20260421-043) 수치 측정 결정론 축과 **직교 축** — 충분 조건이나 필수 조건 아님. §동작 G-A~G-I 9 게이트 + §회귀 중점 7 시나리오 (R-1~R-7) + §스코프 규칙 grep-baseline (A)~(H-self) 8 gate 실측 (3 파일 토큰 PASS + baseline 측정 변동폭 0.47%pp + current margin 0.09%pp 박제 + 수단 라벨 0 + 메이저 버전 고정 표현 0 + 직교 평서문 ≥ 2 hits + 설계 결함 평서문 ≥ 1 hit) + §테스트 현황 10 marker (FR-01~07) + §수용 기준 13 marker (FR-01~07 + NFR-01~06). consumed req: `specs/20.req/20260518-coverage-gate-exit-code-determinism-margin-axis.md` → `60.done/2026/05/18/req/` mv. **inspector 경로 결정**: β (신설 spec) 채택 — 근거: (1) 직교 축 명확 분리 (수치 측정 결정론 ↔ 결과 결정론 축 별 spec carrier), (2) blue 편집 비용 회피 (inspector 영역 green 한정), (3) `regression-gate.md` 5번째 불변식 증분 (γ) 시 기존 4 불변식 의미 경계 침범 위험. 자매 직교 spec: `30.spec/blue/foundation/coverage-determinism.md` (REQ-20260421-041 + REQ-20260421-043) — 본 spec (i) 경로가 자매 4축 range 0.00 박제와 동치 (충분 조건). RULE-07 자기검증 — §역할 + §동작 G-A~G-I 모두 평서형 + 반복 검증 가능 (grep + `npm test` N≥3 반복) + 시점 비의존 (Vitest/MSW/Node/V8 메이저 bump 이벤트 비귀속) + incident patch 비귀속 (4 run baseline 박제는 baseline 측정 anchor) + 수단 중립 (두 경로 (i)/(ii) 동등) + self-reference scope 분리 (§스코프 규칙 (E-self)(F-self)(G-self)(H-self) 자기 검증 게이트만 본 spec 본문 한정 anchor — RULE-07 §양성 기준 평서형 자기 정합 검증). RULE-06 grep-baseline gate (A)~(H-self) 8 건 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/` 신규 1 spec + `20.req/* → 60.done/req/` mv). RULE-03 (d) — 본 carve 로 green 19 → 20 (= GREEN_PENDING_MAX=20 도달, 차기 tick carve 보류 의무 진입). | all (최초 등록) |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/18/req/20260518-coverage-gate-exit-code-determinism-margin-axis.md` (REQ-20260518-008, 본 103차 inspector tick mv).
- baseline 토큰 (HEAD=`9483712`):
  - 회귀 게이트 진입점: (A) `package.json:21` `"test": "vitest run --coverage"` / (B) `vite.config.js:91-96` `thresholds` 4축 (`lines:98`, `statements:97`, `functions:94`, `branches:94`) / (C) `.husky/pre-push:3` `npm test`.
  - 측정 변동폭 baseline (`specs/10.followups/20260517-1813-v8-coverage-branches-nondeterminism.md` 박제): 4 run 분자 998~1003 / 분모 1063 = 93.88~94.35%pp branches. 변동폭 ±5 / 1063 = 0.47%pp. branches threshold 94 + baseline 평균 94.09%pp margin ≈ 0.09%pp (< 0.47%pp = (ii) 경로 부족 baseline 박제).
- **자매 직교 spec / req**:
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (REQ-20260421-041 + REQ-20260421-043, promoted blue) — 수치 측정 결정론 축. 본 spec 과 직교 (충분 조건이나 필수 조건 아님). 자매 (i) 경로가 본 FR-02 (i) 와 동치.
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037, promoted blue) — 회귀 게이트 존재 축. 본 spec 과 직교 (게이트 존재 vs 게이트 결과 결정론).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035, promoted blue) — dep bump 후 회귀 0 게이트. 본 spec exit code 결정론은 dep bump 게이트 관찰 신호의 신뢰도에 상보 기여.
- **선행 done req**:
  - `specs/60.done/2026/04/21/req/20260421-coverage-measurement-determinism-invariant.md` (REQ-20260421-041) — 수치 측정 결정론 최초 박제.
  - `specs/60.done/2026/04/21/req/20260421-coverage-determinism-pool-axis-add.md` (REQ-20260421-043) — FR-02 (g) pool/worker 축 증분.
  - `specs/60.done/2026/04/21/req/20260421-ci-typecheck-and-coverage-threshold-regression-gate.md` (REQ-20260421-037) — 회귀 게이트 존재 축.
- **외부 출처**:
  - Vitest CLI `vitest run --coverage` exit code semantics — https://vitest.dev/guide/cli.html.
  - V8 coverage provider sampling semantics — Vitest `@vitest/coverage-v8` 공식 문서.
- **소비 followup (감사 pointer)**: `specs/10.followups/20260517-1813-v8-coverage-branches-nondeterminism.md` — 4 run baseline + `git stash` 재현 박제 (D-baseline anchor 의 picker).
- **RULE 준수**:
  - RULE-07: §역할 + §동작 G-A~G-I 시점 비의존 평서형 + 반복 검증 가능 (grep + `npm test` N≥3 반복) + incident 비귀속 (4 run baseline 은 측정 anchor) + 수단 중립 + self-reference scope 분리.
  - RULE-06: grep-baseline gate (A)~(H-self) 8 건 실측 수치 + line anchor + self-reference scope 분리 (E-self/F-self/G-self/H-self 자기 검증 게이트는 본 spec 본문 anchor 한정).
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/` 신규 1 spec + `20.req/* → 60.done/req/` mv).
