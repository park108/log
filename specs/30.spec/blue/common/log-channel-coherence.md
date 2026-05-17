# production `console.log` 단일 채널 정합 — `common.log` 진입점 한정 + 호출측 직접 호출 0 hit 자매 게이트 박제

> **위치**: `src/common/common.ts` (`log` 단일 진입점 정의), 호출측 `src/**/*.{ts,tsx,js,jsx}` (production — test/setup/fixture/api.mock 제외).
> **관련 요구사항**: REQ-20260517-084
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제, REQ-084 흡수)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`72f5492` 박제 시점).

## 역할
production 코드의 `console.log` 호출이 **단일 진입점 (dev-only logger 함수)** 내부 한정 + 호출측 직접 호출 0 hit + 진입점 호출 광범위 (1+ hit) 이어야 한다는 시스템 단일 채널 효능 불변식. 자매 spec `components/common.md` (d-1/d-2) 의 error 채널 자매 게이트 (`console.error` 호출측 0 hit + `reportError` 진입점 광범위) 와 **메타 패턴 동치** — 단일 진입점 정의 + 호출측 직접 호출 0 + 진입점 호출 광범위 — 의 log 채널 동치 박제. 의도적으로 하지 않는 것: 단일 채널 박제 수단 (단순 grep gate vs ESLint `no-console` rule vs wrapper export 강화) 선정 (수단 중립 — task 위임), `console.warn` / `console.info` / `console.debug` / `console.trace` 등 다른 console 메서드의 단일 채널 박제 (스코프 경계 — 별 req 후보), `console.error` ↔ `reportError` 자매 게이트의 재박제 (이미 `components/common.md` (d-1/d-2) 박제 — 본 spec 은 log 채널 직교 축), 단일 진입점 함수의 시그니처 변경 (`components/common.md` §정의 영역), 외부 logger SDK (Sentry / DataDog / OpenTelemetry) 도입 결정 (별 req 후보), 진단 script 또는 자동 채널 부착 결정 (`foundation/diagnostic-script-auto-channel-coverage.md` 메타 효능 영역 — 본 spec 박제 후 별 task 가 자동 채널 부착 결정), `eslint.config.js:linterOptions.reportUnusedDisableDirectives` 옵션 전환 (별 축 — `foundation/lint-warning-zero-gate.md` (I9) 영역), 호출측 직접 호출 0 hit 회복 시점의 호출측 정합 수단 (호출측 정합 vs rule 도입 vs wrapper — 수단 중립), 본 spec 본문에 구체 호출측 파일명 / hit count / 라인 번호 박제 (시점 비의존성 — §변경 이력 / §스코프 규칙 baseline / §참고 한정).

## 공개 인터페이스
- 측정 대상:
  - 단일 진입점 정의: `src/common/common.ts` `export const log` (또는 동등 효능 단일 export — `export function log`).
  - 호출측 표면: `src/**/*.{ts,tsx,js,jsx}` 중 (a) 단일 진입점 정의 파일 내부, (b) `*.test.{ts,tsx,js,jsx}` 파일, (c) `src/test-utils/**`, (d) `src/**/__fixtures__/**`, (e) `src/**/api.mock.{ts,js}`, (f) `src/setupTests.js`, (g) `src/index.jsx` 의 reportWebVitals 사용 예시 주석 — 7 제외 규칙 적용 후 영역.
- 측정 명령 (3 grep 단일 절차):
  - (A) 호출측 직접 호출 0 hit: `grep -rnE "console\.log" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -vE "\.test\.|/test-utils/|/__fixtures__/|api\.mock\.|setupTests\.js|common\.ts:" | grep -v "// to log results"` → 0 hit.
  - (B) 진입점 광범위 사용 1+ hit: `grep -rnE "^import\s*\{[^}]*\blog\b[^}]*\}\s*from\s*['\"].*common/common['\"]|common\.log\(" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"` → 1+ hit.
  - (C) 단일 진입점 정의 single source: `grep -rnE "^export\s+(const|function)\s+log\b" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"` → 1 hit (단일 파일 단일 export).

## 동작
1. **(I1) 호출측 직접 호출 0 hit 효능**: production 영역 (단일 진입점 정의 파일 + 7 제외 규칙 적용 후) 의 호출측에서 `console.log` 직접 호출 0 hit. 제외 규칙은 test 파일 / test-utils / `__fixtures__` / api.mock / setupTests / 단일 진입점 정의 파일 / 주석 처리된 명세 예시 7 항목. 측정 명령 §공개 인터페이스 (A) rc=0 (0 hit) 시 본 효능 PASS.
2. **(I2) 진입점 광범위 사용 1+ hit 효능**: 단일 진입점 (named import `{ log }` 또는 module 접근 `common.log(...)` 형태) 호출이 src 영역 전체에서 1+ hit. 본 효능 0 hit 으로 떨어지면 모든 도메인이 `console.log` 직접 호출로 회귀했거나 logger 호출 자체가 0 으로 떨어진 신호 — 자매 spec `components/common.md` (d-2) `reportError` 광범위성 효능과 동치 패턴. 측정 명령 §공개 인터페이스 (B) 결과 ≥ 1 시 본 효능 PASS.
3. **(I3) 단일 진입점 정의 single source**: src 영역에서 `export const log` 또는 `export function log` 정의가 단일 파일 단일 export. 측정 명령 §공개 인터페이스 (C) 결과 = 1 hit 시 본 효능 PASS. 2+ hit (다중 정의) 시 단일 채널 정합 자명 위반.
4. **(I4) 제외 규칙 명문화 의무**: 본 게이트의 제외 규칙 (7 항목 — `*.test.*` / `/test-utils/` / `/__fixtures__/` / `api.mock.{ts,js}` / `setupTests.js` / 단일 진입점 정의 파일 / 주석 처리된 명세 예시) 은 본 spec §스코프 규칙 grep-baseline 에 명문화된다. 제외 규칙 변경 (예: setupTests 영역 확장 / `__fixtures__` 디렉터리 이름 변경 / test-utils 모듈 이름 변경) 시 본 spec 갱신 의무 발생. 자매 spec `components/common.md` (d-1) 의 `errorReporter\.` + `\.test\.` 제외 규칙과 동일 패턴.
5. **(I5) 메타 패턴 정합 (자매 채널 직교)**: 본 (I1)(I2)(I3) 자매 게이트는 `components/common.md` (d-1)(d-2) + `errorReporter.ts` 단일 진입점 박제와 **메타 패턴 동치** — 단일 진입점 정의 + 호출측 직접 호출 0 + 진입점 호출 광범위. 두 채널 (log / error) 은 **직교** — 어느 한 채널 위반이 다른 채널 게이트를 자동 충족시키지 않는다. 각 채널의 단일 진입점 정의 / 호출측 / 광범위성은 독립 측정.
6. **(I6) 시점 비의존성 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 구체 호출측 파일명 / hit count / 라인 번호 박제 0. 파일명 / 수치 / 매트릭스 분포는 §변경 이력 메타 1회 부속 + §스코프 규칙 baseline + §참고 감사성 메타 한정 (자매 spec `lint-warning-zero-gate` / `diagnostic-script-auto-channel-coverage` 동일 패턴).
7. **(I7) 수단 중립**: 효능 충족 수단 — (a) 단순 grep gate 박제 (PR 단계 단일 명령 검증, husky pre-commit / CI step 부착은 별 축 — `foundation/diagnostic-script-auto-channel-coverage.md` 영역), (b) ESLint `no-console` rule 박제 (`eslint.config.js` rule level 등록, 단일 진입점 정의 파일은 `// eslint-disable-next-line no-console` 또는 파일 단위 override 로 회피), (c) wrapper export 강화 (단일 진입점 모듈이 logger 함수 외에 `console` global 재export 차단하는 lint rule 또는 ban-import 등) — 어느 쪽이든 본 효능 충족. 본 spec 은 수단 후보 라벨 부여 0 (§스코프 규칙 (G7) 게이트 박제 — `awk` + `grep` 0 hit 자기 검증).
8. **(I8) 직교 정합**: 본 효능 게이트는 (a) `components/common.md` (d-1)(d-2) error 채널 자매 게이트와 **메타 패턴 동질** (단일 채널 게이트) + 영역 직교 (error 채널 1축 vs log 채널 1축), (b) `foundation/lint-warning-zero-gate.md` FR-01 ESLint warning 자동 채널과 영역 직교 (rule level 게이트 vs grep 단일 채널 게이트) + 패턴 동질 (효능 게이트의 자동 차단), (c) `foundation/diagnostic-script-auto-channel-coverage.md` 진단 script ↔ 자동 채널 부착 메타와 보완 관계 (본 spec 박제 후 grep 검증의 자동 채널 부착은 별 task 영역 — 수단 중립 (a)), (d) `foundation/tooling.md` §동작 6 ESLint flat-config last-write-wins 와 직교 (rule 정의 의미론 vs grep 채널 검증), (e) `foundation/regression-gate.md` CI typecheck step 박제와 직교 (typecheck 1축 vs grep 채널 1축), (f) `foundation/src-spec-reference-coherence.md` G3 와 직교 (spec 참조 정합 vs 채널 정합). 어느 한 축 위반이 다른 축의 게이트를 자동 충족시키지 않는다.
9. **(I9) 스코프 경계 명시**: 본 게이트는 `console.log` 한정. `console.warn` / `console.info` / `console.debug` / `console.trace` 의 단일 채널 박제는 본 게이트 범위 밖 — 별 req 후보 (현 시점 production 사용 분포 미확인). `console.error` 는 자매 spec `components/common.md` (d-1) 기 박제 — 본 게이트 중복 박제 0. 본 (I9) 는 효능의 적용 표면 (`console.log` 1축) 명시 — 다른 console 메서드는 별 영역.

### 회귀 중점
- production 호출측에서 `console.log` 직접 호출 1+ hit 발생 (제외 규칙 적용 후) — (I1) 위반. 단일 채널 메타 패턴 무력화 — logger 함수 외부 채널 활성.
- 단일 진입점 함수가 2+ 파일에서 `export const log` / `export function log` 정의 — (I3) 위반. 단일 채널 정합 자명 위반 (channel split).
- 진입점 광범위 사용이 0 hit 으로 떨어짐 — (I2) 위반. 모든 도메인이 `console.log` 직접 호출로 회귀했거나 logger 호출 자체가 0 으로 떨어진 신호.
- 제외 규칙 (7 항목) 의 명문화가 §스코프 규칙 grep-baseline 에서 누락 / 갱신 결락 — (I4) 위반. 후속 측정의 reproducibility 무력화.
- 본 spec 본문에 구체 호출측 파일명 / hit count / 라인 번호 박제 — (I6) 위반. 시점 비의존성 무력화 (호출측 변경 이벤트 시 spec 본문 갱신 의무 발생).
- 본 spec 본문에 수단 후보 라벨 박제 — (I7) 위반. RULE-07 정합 무력화.
- `console.warn` / `console.info` / `console.debug` / `console.trace` / `console.error` 의 단일 채널 위반이 본 spec 위반으로 카운트됨 — (I9) 위반. 본 효능의 적용 표면 (`console.log` 1축) 벗어남 (별 영역).
- 자매 spec `components/common.md` (d-1)(d-2) 의 error 채널 자매 게이트 위반이 본 spec 위반으로 자동 카운트됨 — (I5)(I8) 위반. 두 채널 직교 위반.

## 의존성
- 외부: `console.log` (Web Platform / Node.js global), ESLint `no-console` rule (수단 중립 옵션 — 도입 결정은 별 영역).
- 내부: `src/common/common.ts` (`export const log` 단일 진입점 정의), 호출측 `src/**/*.{ts,tsx,js,jsx}` (제외 규칙 적용 후 production 영역).
- 역의존 (보완 / 직교): `components/common.md` (d-1/d-2) error 채널 자매 게이트 (메타 패턴 동질 + 영역 직교), `foundation/lint-warning-zero-gate.md` (자동 차단 패턴 동질 + rule level 영역 직교), `foundation/diagnostic-script-auto-channel-coverage.md` (자동 채널 부착 메타 — 본 게이트의 grep 검증 자동 채널 부착은 별 task), `foundation/tooling.md` (rule 정의 의미론, 직교), `foundation/regression-gate.md` (typecheck 1축, 직교).

## 테스트 현황
- [x] (I1) 호출측 직접 호출 0 hit 효능. §스코프 규칙 (G1) 박제 — HEAD=`72f5492` 실측 PASS (제외 규칙 7 항목 적용 후 0 hit, zero-point baseline 확보).
- [x] (I2) 진입점 광범위 사용 1+ hit 효능. §스코프 규칙 (G2) 박제 — HEAD=`72f5492` 실측 PASS (1+ hit, 도메인 횡단 광범위 사용).
- [x] (I3) 단일 진입점 정의 single source. §스코프 규칙 (G3) 박제 — HEAD=`72f5492` 실측 PASS (1 hit @`src/common/common.ts`).
- [x] (I4) 제외 규칙 명문화 의무. §스코프 규칙 (G1) 의 7 항목 제외 규칙 명문화 박제 — 본 spec 박제 자체로 정합 박제.
- [x] (I5) 메타 패턴 정합 (자매 채널 직교). §역할 + §동작 5 에 components/common.md (d-1/d-2) error 채널 자매 게이트와의 메타 패턴 동치 + 영역 직교 평서 박제. 본 spec 박제 자체로 정합 박제.
- [x] (I6) 시점 비의존성. §스코프 규칙 (G6) `awk` + `grep` 0 hit 자기 검증 박제. 본 spec 박제 시점 PASS.
- [x] (I7) 수단 중립. §스코프 규칙 (G7) `awk` + `grep` 0 hit 자기 검증 박제. 본 spec 박제 시점 PASS.
- [x] (I8) 직교 정합. §역할 + §동작 8 에 6개 관련 spec 과의 보완/직교 평서 박제. 본 spec 박제 자체로 정합 박제.
- [x] (I9) 스코프 경계 명시. §역할 + §동작 9 + §회귀 중점 마지막 평서 박제. 본 spec 박제 자체로 정합 박제.

## 수용 기준
- [x] (Must, FR-01) §공개 인터페이스 (A) 호출측 직접 호출 0 hit — HEAD=`72f5492` 실측 PASS (제외 규칙 7 항목 적용 후 0 hit). 본 baseline 은 회귀 detection 의 zero-point.
- [x] (Must, FR-02) §공개 인터페이스 (B) 진입점 광범위 사용 1+ hit — HEAD=`72f5492` 실측 PASS (1+ hit, 도메인 횡단).
- [x] (Must, FR-03) §공개 인터페이스 (C) 단일 진입점 정의 single source — HEAD=`72f5492` 실측 PASS (1 hit @`src/common/common.ts`).
- [x] (Must, FR-04) 제외 규칙 7 항목 §스코프 규칙 grep-baseline 명문화 박제. 제외 규칙 변경 이벤트 시 본 spec 갱신 의무 발생 평서 박제.
- [x] (Should, FR-05) 메타 패턴 정합 — error 채널 자매 게이트와 메타 패턴 동치 + 영역 직교 평서 박제 (§역할 + §동작 5).
- [x] (Must, FR-06) 시점 비의존 자기 검증 — 본 spec 본문 §역할 + §동작 + §회귀 중점 + §의존성 어디서도 구체 호출측 파일명 / hit count / 라인 번호 박제 0. §스코프 규칙 (G6) `awk` + `grep` 0 hit.
- [x] (Must, FR-07) 수단 라벨 0. §스코프 규칙 (G7) `awk` + `grep` 0 hit.
- [x] (Should, FR-08) 스코프 경계 명시 — `console.log` 한정. 다른 console 메서드 (`warn` / `info` / `debug` / `trace`) 의 단일 채널 박제는 별 req 후보 평서 박제. `console.error` 는 자매 spec `components/common.md` (d-1) 기 박제.
- [x] (NFR-01) 시점 비의존. FR-06 동치. 본문 박제 0 + 감사성 메타 1회 부속 (§변경 이력 / §스코프 규칙 / §참고) 정합.
- [x] (NFR-02) 게이트 단일성 — §공개 인터페이스 (A)(B)(C) 3 grep 명령 단일 절차. 복수 게이트 AND 분기 명시 (3 게이트 모두 PASS 시 본 효능 PASS).
- [x] (NFR-03) 채널 직교. §동작 5 + §동작 8 에 log 채널 ↔ error 채널 독립 측정 평서 박제.
- [x] (NFR-04) 자동 채널 부착 음영. §역할 + §동작 7 + §동작 8 에 `foundation/diagnostic-script-auto-channel-coverage.md` 메타 효능 영역 평서 박제 — 본 spec 박제 후 별 task 가 자동 채널 부착 결정 (수단 중립).
- [x] (NFR-05) RULE-07 정합 — 결과 효능 (호출측 직접 호출 0 + 진입점 광범위 + 단일 정의) 만 박제. 1회성 진단 / 릴리스 귀속 patch / TODO 나열 0.
- [x] (NFR-06) RULE-06 정합 — §스코프 규칙 grep-baseline 7 gate (G1~G7) 실측 박제 + 제외 규칙 7 항목 + `expansion` 박제.
- [x] (NFR-07) 수단 라벨 0. FR-07 동치.

## 스코프 규칙
- **expansion**: 불허 (단일 진입점 정의 외 src 파일에서 `console.log` 추가 금지 — 호출측 직접 호출 0 hit 게이트 회복 위해 호출측 정합만 허용).
- **grep-baseline** (HEAD=`72f5492`, 2026-05-17 — REQ-084 흡수 시점 실측):
  - (G1) **[호출측 직접 호출 0 hit + 제외 규칙 7 항목]** `grep -rnE "console\.log" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -vE "\.test\.|/test-utils/|/__fixtures__/|api\.mock\.|setupTests\.js|common\.ts:" | grep -v "// to log results"` → **0 hit** (HEAD=`72f5492` 실측 PASS). 제외 규칙 7 항목: (a) `*.test.{ts,tsx,js,jsx}` 파일, (b) `src/test-utils/**`, (c) `src/**/__fixtures__/**`, (d) `src/**/api.mock.{ts,js}`, (e) `src/setupTests.js`, (f) `src/common/common.ts` (단일 진입점 정의 — 본 파일 내부의 호출은 단일 진입점 정의 내부로 본 게이트 제외 대상), (g) `src/index.jsx` 의 reportWebVitals 사용 예시 주석 (`// to log results`).
  - (G2) **[진입점 광범위 사용 1+ hit]** `grep -rnE "^import\s*\{[^}]*\blog\b[^}]*\}\s*from\s*['\"].*common/common['\"]|common\.log\(" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"` → **18+ hit** (HEAD=`72f5492` 실측 PASS — 도메인 횡단 named import + 단일 진입점 모듈 자체 테스트 호출). 광범위 사용 효능 활성.
  - (G3) **[단일 진입점 정의 single source]** `grep -rnE "^export\s+(const|function)\s+log\b" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"` → **1 hit** @`src/common/common.ts` (HEAD=`72f5492` 실측 PASS). 다른 src 파일에서 `export const log` / `export function log` 정의 0 hit.
  - (G4) **[총 console.log hit 분포 (감사성)]** `grep -rnE "console\.log" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l` → **14 hit** (HEAD=`72f5492` 실측). 단일 진입점 정의 내부 3 hit (`src/common/common.ts:40-42`) + 주석 1 hit (`src/index.jsx:26`) + test 영역 10 hit. 제외 규칙 적용 후 (G1) 0 hit 으로 수렴.
  - (G5) **[ESLint `no-console` rule 현 상태]** `grep -nE "no-console" eslint.config.js` → 0 hit (rule level 미박제 baseline). 본 spec FR-07 수단 중립 — 효능 충족 수단으로 rule 박제 / wrapper / grep gate 어느 쪽이든 허용. 현 시점 grep gate 단일 절차로 효능 측정.
  - (G6) **[FR-06 시점 비의존성 자기 검증]** `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/common/log-channel-coherence.md | grep -cE "Monitor\.jsx|FileItem\.tsx|VisitorMon\.jsx|ContentItem\.jsx|WebVitalsItem\.jsx|FileDrop\.tsx|FileUpload\.tsx|File\.tsx|ApiCallItem\.jsx|ImageSelector\.tsx|Comment\.tsx|Search\.tsx|LogItemInfo\.jsx|LogList\.jsx|LogItem\.jsx|Writer\.jsx|common\.test\.ts"` → **0 hit** (본문 §역할 + §동작 + §회귀 중점 + §의존성 어디서도 구체 호출측 파일명 박제 0). HEAD=`72f5492` 박제 시점 실측 PASS.
  - (G7) **[FR-07 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/common/log-channel-coherence.md | grep -cE "기본값|권장|우선|default|best practice"` → **0 hit** (본문 §역할 + §동작 + §회귀 중점 한정 — 수단 후보 라벨 부여 0). HEAD=`72f5492` 박제 시점 실측 PASS.
- **rationale**: (G1)(G2)(G3) 본 spec 핵심 효능 baseline — 3 게이트 모두 zero-point PASS (호출측 직접 호출 0 + 진입점 광범위 1+ + 단일 정의 1). (G4) 감사성 — 총 hit 분포 (단일 진입점 내부 + 주석 + test) 제외 규칙 적용 후 0 hit 수렴 증거. (G5) ESLint `no-console` rule 현 baseline (미박제) — FR-07 수단 중립 박제 (도입 결정은 별 영역). (G6)(G7) RULE-07 정합 자기 검증.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-084 흡수) / pending (HEAD=`72f5492`) | 최초 박제 — production `console.log` 단일 채널 정합 9 축 (I1~I9) 효능 불변식. baseline (HEAD=`72f5492` 실측): zero-point PASS — (G1) 호출측 직접 호출 0 hit (제외 규칙 7 항목 적용 후) / (G2) 진입점 광범위 사용 18+ hit (named import: `Monitor.jsx`, `VisitorMon.jsx`, `ContentItem.jsx`, `WebVitalsItem.jsx`, `ApiCallItem.jsx`, `FileItem.tsx`, `File.tsx`, `FileDrop.tsx`, `FileUpload.tsx`, `Search.tsx`, `Comment.tsx`, `ImageSelector.tsx`, `Writer.jsx`, `LogList.jsx`, `LogItem.jsx`, `LogItemInfo.jsx` 16 파일 + 단일 진입점 모듈 자체 테스트 `common.test.ts` 호출 6 hit — 도메인 횡단 Monitor / File / Search / Comment / Image / Log 6 도메인) / (G3) 단일 정의 1 hit @`src/common/common.ts:33` `export const log` (dev-only logger, `isDev()` 분기 안에서 `console.log` 3 호출 — switch type ∈ INFO/SUCCESS/ERROR). 총 console.log 14 hit 분포 (감사성, G4): 단일 진입점 정의 내부 3 + 주석 1 (`src/index.jsx:26` reportWebVitals 예시) + test 영역 10 — 제외 규칙 적용 후 (G1) 0 hit 수렴. ESLint `no-console` rule 미박제 (G5 0 hit) — 본 spec FR-07 수단 중립 (rule 박제 / wrapper / grep gate 어느 쪽이든 효능 충족). 본 spec 분리 결정 근거: `components/common.md` (d-1/d-2) 의 error 채널 자매 게이트와 메타 패턴 동치 + 영역 직교 (error / log 채널) — components/common.md 단일 spec 내 흡수 vs 별 spec carve trade-off 에서 별 spec 박제 결정 (자매 메타 패턴 spec `lint-warning-zero-gate.md` 와 `diagnostic-script-auto-channel-coverage.md` 의 단일 채널 게이트 / 자동 채널 메타 spec 일관성 + components/common.md 296+ 줄 spec 확장 비용 + 변경 영향 분리 효능). 영역 결정: `30.spec/green/common/` (단일 채널 효능은 common 영역의 메타 — `sanitizeHtml.md` / `markdownParser.md` / `accessibility.md` / `test-helpers.md` 자매 영역). consumed req: `specs/20.req/20260517-console-log-single-channel-coherence.md` (REQ-084) → `60.done/2026/05/17/req/` mv. 선행 자매 spec (메타 패턴 동치 — 단일 채널 게이트): `components/common.md` (d-1)(d-2) (REQ-074 + 선행 REQ-039 / 본 spec 의 직접 motivating 사례). 선행 자매 spec (메타 패턴 동질 — 자동 차단 게이트): `foundation/lint-warning-zero-gate.md` (REQ-080) / `foundation/diagnostic-script-auto-channel-coverage.md` (REQ-081). RULE-07 자기검증 — (I1)~(I9) 모두 평서형·반복 검증 가능 (3 grep 단일 절차)·시점 비의존 (G6 0 hit — 구체 호출측 파일명 본문 박제 0)·incident 귀속 부재 (REQ-084 §배경 의 회귀 가설은 시점 비의존 시나리오)·수단 중립 (G7 0 hit — 수단 후보 3 카테고리 라벨 0)·스코프 경계 명시 (§동작 9 — `console.log` 1축 한정). RULE-06 §스코프 규칙 7 gate (G1~G7) 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/common/log-channel-coherence.md` create). | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-console-log-single-channel-coherence.md` (REQ-084 — 본 세션 mv).
- **선행 자매 spec (메타 패턴 동치 — 단일 채널 게이트 직접 motivating 사례)**:
  - `specs/30.spec/blue/components/common.md:175` (d-1) `console.error` 호출측 0 hit (제외 규칙 `errorReporter\.` + `\.test\.`) + `:176` (d-2) `reportError` 호출 50 hit (REQ-074 + 선행 REQ-039). 본 spec 의 log 채널 자매 게이트와 메타 패턴 동치 + 영역 직교 (error / log 채널).
  - `src/common/errorReporter.ts:7` `export function reportError` — error 채널 단일 진입점. 본 spec 의 log 채널 단일 진입점 (`src/common/common.ts:33` `export const log`) 과 자매 사례.
- **선행 자매 spec (메타 패턴 동질 — 자동 차단 게이트)**:
  - `specs/30.spec/green/foundation/lint-warning-zero-gate.md` (REQ-080) — ESLint warning 자동 차단 게이트. 본 spec 과 패턴 동질 (효능 게이트의 자동 차단) + 영역 직교 (rule level vs grep 단일 채널).
  - `specs/30.spec/green/foundation/diagnostic-script-auto-channel-coverage.md` (REQ-081) — 진단 script ↔ 자동 채널 부착 메타. 본 spec 박제 후 grep 검증 자동 채널 부착은 별 task 영역 (수단 중립).
- **관련 spec (보완 / 직교)**:
  - `specs/30.spec/green/foundation/tooling.md` (REQ-028 외) §동작 6 ESLint flat-config last-write-wins — 본 spec 과 직교 (rule 정의 의미론 vs grep 채널 검증).
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — CI typecheck step 박제. 본 spec 과 직교 (typecheck 1축 vs grep 채널 1축).
  - `specs/30.spec/green/foundation/src-spec-reference-coherence.md` (REQ-20260517-071) G3 — `scripts/check-spec-coherence.sh` 자동 게이트. 본 spec 과 직교 (spec 참조 정합 vs 채널 정합) + 메타 패턴 동질 (단일 절차 grep).
- **외부 레퍼런스**:
  - ESLint `no-console` rule — `https://eslint.org/docs/latest/rules/no-console`. 본 spec FR-07 수단 중립 옵션 (rule 박제 도입은 별 영역).
  - 단일 채널 진입점 패턴 — Sentry / DataDog / OpenTelemetry SDK 일반 (application code 가 SDK 단일 진입점만 호출, native `console.*` 직접 호출 금지). 본 repo 의 `common.ts:33` `export const log` 는 그 패턴의 단순화 형태 (dev-only logger).
- **감사성 메타 (1회 부속, NFR-01 정합)**: HEAD=`72f5492` 실측 시점 호출측 광범위 사용 분포 — Monitor 도메인 5 파일 (`Monitor.jsx` / `VisitorMon.jsx` / `ContentItem.jsx` / `WebVitalsItem.jsx` / `ApiCallItem.jsx`) + File 도메인 4 파일 (`FileItem.tsx` / `File.tsx` / `FileDrop.tsx` / `FileUpload.tsx`) + Log 도메인 4 파일 (`LogList.jsx` / `LogItem.jsx` / `LogItemInfo.jsx` / `Writer.jsx`) + Search 도메인 1 파일 (`Search.tsx`) + Comment 도메인 1 파일 (`Comment.tsx`) + Image 도메인 1 파일 (`ImageSelector.tsx`) = 16 production 파일 + 단일 진입점 모듈 자체 테스트 `common.test.ts` 6 hit. 본문 박제 0 (본 §참고 한정 + §스코프 규칙 (G2)(G4) 한정).
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G6 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (3 grep 단일 절차) · incident 귀속 부재 · 수단 박제 0 (G7 0 hit 자기 검증) · 스코프 경계 명시 (§동작 9).
  - RULE-06: grep-baseline 7 gate (G1~G7) 실측 박제 (HEAD=`72f5492`).
  - RULE-01: inspector writer 영역만 (`30.spec/green/common/log-channel-coherence.md` create).
