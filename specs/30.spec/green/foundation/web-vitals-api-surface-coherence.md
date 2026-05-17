# web-vitals API surface 정합 (정적 + 런타임 dual-channel)

> **위치**: `src/reportWebVitals.{js,ts}` (부트 셸) + `src/reportWebVitals.test.{js,ts}` (런타임 채널 fixture)
> **관련 요구사항**: REQ-20260517-096 (web-vitals 메이저 API surface 정합 — 정적 grep + 런타임 spy dual-channel)
> **최종 업데이트**: 2026-05-17 (by inspector — REQ-096 신규 박제)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 박제 시점 스냅샷 (HEAD=`776846e`).

## 역할
부트 셸 `src/reportWebVitals.{js,ts}` 의 web-vitals 콜백 등록 API surface 가 활성 `package.json:dependencies.web-vitals` 메이저의 공식 selector 집합과 정합한다는 시스템 불변식을 박제한다. (a) 활성 메이저 selector 5종이 부트 셸에 1+ hit 등록되고, (b) 활성 메이저의 deprecated selector 가 비-test `src/**` 어디에도 0 hit 이며, (c) vitest `vi.mock('web-vitals')` 런타임 채널이 5 spy × 2 단언 (호출 횟수 + 콜백 인자) 으로 등록 결과를 결정적으로 단언하는 — 정적 grep + 런타임 spy **dual-channel** 박제. 메이저 bump 시점에 deprecated 잔존 / migration 미수렴 / 라이브러리 export shape 변경에 따른 부트 발화 0 회귀를 자동 검출. 의도적으로 하지 않는 것: web-vitals 라이브러리 메이저 bump 운영 자체 (REQ-035 dep-bump gate 영역), production metric value threshold 측정 (REQ-037 영역), production bundle size 측정 (별 axis), `sendBeacon` 부트 비콘 분기 (REQ-094 영역 — `components/app.md`).

## 공개 인터페이스
- 부트 셸: `src/reportWebVitals.{js,ts}` — `export default reportWebVitals` (인자: `onPerfEntry`).
  - `onPerfEntry` 인자 `instanceof Function` 가드 시 `import('web-vitals')` dynamic import 후 활성 메이저 selector 집합을 destructure 하여 각 selector 에 동일 콜백 등록.
- 런타임 채널 fixture: `src/reportWebVitals.test.{js,ts}` — vitest `vi.mock('web-vitals')` 격리 + 5 spy × 2 단언.
- 사용처: `src/index.{jsx,tsx}` — `reportWebVitals(sendToAnalytics)` 부트 호출 (1처).

## 동작
1. `reportWebVitals(onPerfEntry)` 호출 시 `onPerfEntry && onPerfEntry instanceof Function` 가드 — falsy / 비함수 인자에 silent no-op (등록 호출 0). 회귀 검증 채널 = `src/reportWebVitals.test.{js,ts}` 의 `it('does nothing when argument is not a function', ...)` 케이스.
2. 가드 통과 시 `import('web-vitals')` dynamic import — Promise resolve 후 활성 메이저 selector 집합 destructure. 라이브러리 export shape 변경 (named export → 단일 export 강제 등) 시 destructure 실패 → 부트 셸 silent fail. dual-channel 의 런타임 채널 (vitest spy `toHaveBeenCalledTimes(1)` 단언) 이 0 회 발화 surface 로 회귀 detect.
3. destructure 후 각 selector 를 동일 `onPerfEntry` 콜백으로 1회씩 등록 호출. **활성 메이저 selector 집합** 은 §스코프 규칙 baseline 박제 (메이저 숫자 + selector 식별자 집합 모두 §스코프 규칙 + §변경 이력 한정).
4. 부트 셸 + 비-test `src/**` 어디에도 활성 메이저의 deprecated selector 식별자가 0 hit — 정적 grep 채널로 lint-time 가시화. **현 baseline deprecated 집합** 도 §스코프 규칙 baseline 박제 (deprecated selector 식별자 집합은 §스코프 규칙 + §변경 이력 한정). test 파일 (`*.test.*`) 의 negative assertion regex literal 은 측정 영역 외 (정적 grep `--exclude="*.test.*"` 정밀 패턴).
5. 런타임 채널 — `vi.mock('web-vitals', () => ({ ... 5 spy 동치 ... }))` 격리 후 `reportWebVitals(cb)` 호출. 5 spy 가 정확히 1회씩 `cb` 인자로 호출됨을 단언. dynamic import microtask resolve 대기 (`await new Promise((resolve) => setTimeout(resolve, 0))`) 후 단언 진입.
6. 정적 채널 (동작 3 + 동작 4) 과 런타임 채널 (동작 5) 은 **dual-channel**: 어느 한 채널 PASS 만으로 다른 채널이 자동 충족되지 않는다. 예) 정적 grep PASS 이지만 라이브러리 export shape 변경으로 destructure fail → 런타임 spy 0 회 호출 단언 fail. 역방향) 런타임 spy 통과이지만 부트 셸에 deprecated 식별자 dead import 잔존 → 정적 grep fail.

### 회귀 중점
- web-vitals 메이저 bump 시점에 deprecated 식별자 잔존 → 정적 grep 채널 fail.
- 라이브러리 ESM export shape 변경 (named export → 단일 export 강제 등) → 부트 셸 destructure 실패 → 런타임 spy 단언 fail.
- bundle bloat (deprecated 식별자 dead import 잔존 — tree-shaking 의존 회귀) → 정적 grep 채널 fail.
- `reportWebVitals(cb)` 가 `instanceof Function` 가드 우회 시 (예: 임의 값 forwarding) → fixture `it('does nothing when argument is not a function', ...)` 케이스 fail.

## 의존성
- 외부: `web-vitals` (활성 메이저는 `package.json:dependencies.web-vitals` 박제 — 본 spec 본문 메이저 숫자 박제 0, baseline 표만 매핑 박제).
- 내부: `src/index.{jsx,tsx}` (부트 호출 1처 — `reportWebVitals(sendToAnalytics)`).
- 역의존: 없음 (부트 셸 단일 진입점).
- 직교 / 보완:
  - `30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — dep bump 후 회귀 0 + React deprecated runtime warning 0. 본 spec 의 web-vitals 라이브러리 메이저 surface 와 React 런타임 console 채널 직교 (다른 라이브러리 + 다른 layer).
  - `30.spec/green/foundation/runtime-dep-version-coherence.md` (REQ-066) — declared ↔ installed deps coherence. 본 spec 은 declared major ↔ src 사용 API surface 정합 (다른 layer — version 매칭 vs API surface 매칭).
  - `30.spec/blue/foundation/regression-gate.md` (REQ-037) — CI typecheck + coverage threshold. 본 spec 은 API surface 정적 grep + 런타임 spy (다른 axis).
  - `30.spec/green/components/app.md` (REQ-094) — 부트 비콘 `sendBeacon` 4 불변식. web-vitals 콜백 surface 자체는 별 axis — 본 spec 진입 근거 (REQ-094 §Out-of-Scope 명시).
  - `30.spec/blue/foundation/husky-pre-push-typecheck.md` (REQ-089) — dual-channel 직교 패턴 (시점 분리 보완 관계) 동질 모델.

### carve-precondition
- (P1) **환경 채널 가용성**: 본 spec 효능 회복 task carve 시점에 `node_modules/web-vitals` 가용성 + `npm run lint` rc=0 + `npm run typecheck` rc=0 + `npm test` 회귀 0 + `npm run build` rc=0 4+ 환경 게이트 충족 필요. 본 spec 박제 시점 환경 게이트 N/A (효능 평서 박제만 — 산출물 변경 require 0). 본 박제 시점 baseline 4 gate (G1~G4) 전수 PASS — 회복 task 발행 자체가 멱등 위반 (zero-point 없음) — 후속 carve 는 baseline 회귀 발생 시점에만 진입 적합.
- (P2) **선행 spec done 상태**: 본 spec 진입 근거 = `30.spec/green/components/app.md` §의존성 line 49 (`web-vitals` 외부 dep snapshot) + REQ-094 §Out-of-Scope pointer. 두 채널 모두 가용 (HEAD=`776846e`).
- (P3) **RULE-02 chain 비활성**: 본 spec 은 신규 박제 — 기존 green spec carve fail-fast chain 누적 0. chain 부재 평서 박제 — 회복 task 발행 시점 chain 누적 신호 발생 시 별 carve-precondition 게이트 자가 차단 적용.

## 테스트 현황
- [x] `src/reportWebVitals.test.{js,ts}` — `vi.mock('web-vitals')` 격리 + 5 spy 단언 (4 it 케이스 PASS: `registers all 5 v5 web-vitals callbacks when a function is provided` + `does nothing when argument is not a function` + `invokes the performance callback when a web-vital handler fires` + `source code contains no deprecated v3 get*/onFID references`).
- [x] 정적 grep 채널 (G1 부트 셸 활성 selector 1+ hit + G2 비-test 영역 deprecated selector 0 hit) — fixture `source code contains no deprecated ...` 케이스가 정적 grep 결과를 fs read + regex 단언으로 자기 검증 박제.
- [x] 런타임 spy 채널 (G3 `vi.mock` 1 hit + G4 5 spy × 2 단언 10 hit) — fixture `registers all 5 v5 ...` 케이스가 5 spy × `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith(cb)` 박제.
- [x] dual-channel 직교 정합 — 정적 채널 + 런타임 채널 분리 fixture 케이스 박제 (정적 = `source code contains no deprecated ...`, 런타임 = `registers all 5 v5 ...` + `invokes the performance callback ...`). 한 채널 fail 시 다른 채널 자동 충족 0.
- [x] RULE-07 시점 비의존 / 수단 중립 자기 검증 (FR-06 + FR-07) — 본 spec 본문 §역할 ~ §의존성 어디서도 메이저 숫자 박제 0 + 수단 라벨 박제 0 (§스코프 규칙 G5 + G6 자기 검증 게이트).

## 수용 기준
- [x] (Must, FR-01) 부트 셸 활성 selector 1+ hit 박제 — baseline (G1) `grep -nE "onCLS\|onINP\|onFCP\|onLCP\|onTTFB" src/reportWebVitals.js` → 6 hit (HEAD `776846e` 실측 PASS).
- [x] (Must, FR-02) 비-test `src/**` deprecated selector 0 hit 박제 — baseline (G2) `grep -rnE "getCLS\|getFID\|getFCP\|getLCP\|getTTFB\|onFID" src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --exclude="*.test.*"` → 0 hit (HEAD `776846e` 실측 PASS).
- [x] (Must, FR-03) 런타임 5 spy 1회 단언 dual-channel 박제 — baseline (G3) `vi.mock('web-vitals')` 1 hit + (G4) 5 spy × 2 단언 10 hit (HEAD `776846e` 실측 PASS).
- [x] (Must, FR-04) dual-channel 직교 평서 박제 — §동작 6 + §회귀 중점 박제. 한 채널 PASS 만으로 다른 채널 자동 충족 0.
- [x] (Should, FR-05) 본 spec 박제 시점 4 채널 (`npm run lint` + `npm test` + `npm run typecheck` + `npm run build`) rc=0 보존 — HEAD `776846e` 시점 직전 task (TSK-28) result.md DoD 박제 `npm run lint rc=0 / npm run typecheck rc=0 / npm test 49 files 453 tests PASS / npm run build 314ms` 4 채널 ack 정합.
- [x] (Must, FR-06) 본 spec 본문 메이저 숫자 박제 0 hit — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/web-vitals-api-surface-coherence.md | grep -cE "v[0-9]|5\.x|6\.x"` → §스코프 규칙 G5 자기 검증 게이트 박제.
- [x] (Must, FR-07) 수단 라벨 0 hit 자기 검증 — §스코프 규칙 G6 자기 검증 게이트 박제.
- [x] (NFR-01) RULE-07 정합 5 축 (평서 + 반복 + 시점 비의존 + incident 부재 + 수단 중립) 자기 검증 PASS.
- [x] (NFR-02) RULE-06 정합 — §스코프 규칙 grep-baseline 6 gate (G1~G6) 실측 박제.
- [x] (NFR-03) RULE-01 정합 — inspector writer 영역만 (`30.spec/green/foundation/web-vitals-api-surface-coherence.md` create — blue 영역 0 touch).
- [x] (NFR-04) spec 분리 vs 흡수 판단 — 본 spec 은 (α) 신규 박제 채택 — 자매 메타 spec (`runtime-dep-version-coherence` REQ-066 + `dependency-bump-gate` REQ-035) 동질 패턴. (β) `components/app.md` 흡수 부적합 — REQ-094 §Out-of-Scope 가 본 axis 를 별 spec 후보로 명시 + `reportWebVitals.test.js` 채널이 `src/index.test.jsx` 부트 비콘 채널과 별 fixture.
- [x] (NFR-05) §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제.
- [x] (NFR-06) dual-channel 직교 정합 평서 박제 — §동작 6 + §회귀 중점.
- [x] (NFR-07) web-vitals 메이저 무관성 — 본문 메이저 숫자 박제 0 + §스코프 규칙 baseline 표만 매핑 박제.

## 스코프 규칙
- **expansion**: 허용 — web-vitals 메이저 bump 시점 baseline 표 업데이트 (deprecated 집합 / 활성 selector 집합) 는 본 spec §스코프 규칙 baseline + §변경 이력 한정. 부트 셸 (`src/reportWebVitals.{js,ts}`) 및 fixture (`src/reportWebVitals.test.{js,ts}`) scope. helper 추가 시 `src/__test-helpers/` 또는 `src/common/` 진입 가능 (RULE-07 수단 중립 — 본 spec 비박제).
- **grep-baseline** (HEAD=`776846e`, 2026-05-17 실측):
  - (G1) **[활성 메이저 selector 부트 셸 등장 baseline]** `grep -nE "onCLS|onINP|onFCP|onLCP|onTTFB" src/reportWebVitals.js` → **6 hit** (`:3` destructure 1 hit + `:4-8` 등록 5 hit). 활성 메이저 selector 5종 — `onCLS` / `onINP` / `onFCP` / `onLCP` / `onTTFB` (현 baseline v5).
  - (G2) **[비-test 영역 deprecated selector 0 hit baseline]** `grep -rnE "getCLS|getFID|getFCP|getLCP|getTTFB|onFID" src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --exclude="*.test.*"` → **0 hit**. 활성 메이저 deprecated 집합 — `getCLS` / `getFID` / `getFCP` / `getLCP` / `getTTFB` / `onFID` (현 baseline v3 deprecated).
  - (G3) **[런타임 채널 mock 격리 baseline]** `grep -nE "vi\.mock\('web-vitals'" src/reportWebVitals.test.js` → **1 hit** (`:9`).
  - (G4) **[런타임 spy × 단언 baseline]** `grep -cE "expect\((onCLS|onINP|onFCP|onLCP|onTTFB)\)\.toHaveBeenCalled" src/reportWebVitals.test.js` → **10 hit** (5 selector × 2 단언 `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith(cb)` 박제).
  - (G5) **[RULE-07 시점 비의존 자기 검증 — 메이저 숫자 0 hit]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/web-vitals-api-surface-coherence.md | grep -cE "v[0-9]|5\.x|6\.x"` → **0 hit** (본 spec §역할 + §공개 인터페이스 + §동작 + §회귀 중점 + §의존성 어디서도 메이저 숫자 박제 0 — 메이저 숫자는 §스코프 규칙 baseline + §변경 이력 한정).
  - (G6) **[RULE-07 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/web-vitals-api-surface-coherence.md | grep -vE '\`[^\`]*default[^\`]*\`' | grep -vE 'export default' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (fixture 수단 후보 라벨 (vitest spy vs e2e capture vs CI grep step 등) 부여 0. `` `export default reportWebVitals` `` 은 ESM 표준 API 식별자 면제 — components/app.md G5 동질 면제 패턴 적용).
- **rationale**: (G1) 부트 셸 활성 selector 1+ hit baseline — 메이저 bump 시 selector rename / 삭제 시점 회귀 surface. (G2) deprecated 0 hit baseline — dead import 잔존 / migration 미수렴 회귀 surface. (G3)(G4) 런타임 채널 baseline — 라이브러리 export shape 변경 / destructure 실패 회귀 surface. (G5)(G6) RULE-07 자기 검증 — 시점 비의존 + 수단 중립 자기 점검. 매트릭스: 6 baseline 채널 (G1+G2 정적 + G3+G4 런타임 + G5+G6 자기 검증) — 메이저 bump 시 G1+G2 baseline 표만 업데이트 (활성/deprecated selector 집합) + spec 본문 평서 무변동.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-096 신규 박제) / HEAD=`776846e` | web-vitals 메이저 API surface 정합 (정적 + 런타임 dual-channel) 시스템 불변식 평서 박제. consumed req: `specs/20.req/20260517-web-vitals-v5-api-surface-coherence.md` (REQ-096) → `60.done/2026/05/17/req/` mv. NFR-04 판단 결과: (α) 신규 spec carve 채택. 근거 — (i) `runtime-dep-version-coherence.md` (REQ-066) + `dependency-bump-gate.md` (REQ-035) 자매 메타 spec 동질 패턴, (ii) REQ-094 §Out-of-Scope 가 본 axis 를 별 후보로 명시 분리, (iii) `reportWebVitals.test.js` 채널이 `src/index.test.jsx` 부트 비콘 채널 (REQ-094) 과 별 fixture — 단일 spec 흡수 시 응집도 저하. baseline 4 gate (G1~G4) 전수 PASS (현 HEAD 시점 부트 셸 + fixture 모두 정합 박제 완료) + 자기 검증 2 gate (G5+G6) 0 hit 박제. RULE-07 자기 검증 — (FR-01)~(FR-07) 평서·반복 검증 가능 (`grep` extended regex 단일 명령 G1~G6 + vitest spy 5 × 2 단언 결정적 검증)·시점 비의존 (G5 0 hit)·incident 귀속 부재 (현 HEAD 시점 미수렴 격차 0, 회귀 차단 채널 박제)·수단 중립 (G6 0 hit). RULE-06 §스코프 규칙 grep-baseline 6 gate 실측 박제 + `expansion` `허용`. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/` create — blue 영역 0 touch). spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제. | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-web-vitals-v5-api-surface-coherence.md` (REQ-096 — 본 세션 mv).
- **현장 근거 (HEAD `776846e`, 2026-05-17 실측)**:
  - `package.json:14` — `"web-vitals": "^5.2.0"`.
  - `src/reportWebVitals.js:3` — `import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => { ... })` (활성 메이저 5종 destructure).
  - `src/reportWebVitals.js:4-8` — 5 콜백 등록.
  - `src/reportWebVitals.test.js:9-15` — `vi.mock('web-vitals', () => ({ ... 5 spy 동치 ... }))` 격리.
  - `src/reportWebVitals.test.js:25-45` — `it('registers all 5 v5 web-vitals callbacks ...', ...)` 5 spy × 2 단언.
  - `src/reportWebVitals.test.js:47-61` — `it('does nothing when argument is not a function', ...)` 가드 검증.
  - `src/reportWebVitals.test.js:63-74` — `it('invokes the performance callback when a web-vital handler fires', ...)` 콜백 forwarding 검증.
  - `src/reportWebVitals.test.js:76-91` — `it('source code contains no deprecated v3 get*/onFID references', ...)` 정적 grep 자기 검증.
  - `src/index.jsx` — `reportWebVitals(sendToAnalytics)` 부트 호출 1처.
- **자매 메타 spec (직교 — 채널 분리 보완)**:
  - `30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035 blue 승격) — dep bump 후 회귀 0 + React deprecated runtime warning 0.
  - `30.spec/green/foundation/runtime-dep-version-coherence.md` (REQ-066) — declared ↔ installed deps coherence.
  - `30.spec/blue/foundation/regression-gate.md` (REQ-037 blue 승격) — CI typecheck + coverage threshold.
  - `30.spec/blue/foundation/husky-pre-push-typecheck.md` (REQ-089) — dual-channel 직교 패턴 (시점 분리 보완 관계) 동질 모델.
- **선행 spec (cross-ref)**:
  - `30.spec/green/components/app.md` (REQ-094) — 부트 비콘 `sendBeacon` 4 불변식. 본 spec 진입 근거 (REQ-094 §Out-of-Scope 명시 — `reportWebVitals.js` 자체 동작 변경 별 axis 후보).
- **외부 레퍼런스**:
  - web-vitals 공식 (Google Chrome team) — 메이저 migration history (FID → INP rename, get* → on* rename): `https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md`. deprecated 집합 baseline 근거.
- **신호 (별 req 후보, 본 spec 비박제)**:
  - (a) web-vitals 메이저 bump 자동화 (`renovate` / `dependabot` 채널 dep bump gate REQ-035 영역).
  - (b) production metric value threshold 박제 (별 axis — `regression-gate.md` REQ-037 coverage threshold 와 다른 layer).
  - (c) production bundle size 측정 (별 영역 — bundle analyzer task).
