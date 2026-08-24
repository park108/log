# `vite.config.js` `vitest.coverage.exclude` 5 박제 glob 패턴 ↔ `src/**` 디스크 매치 집합 vacuous-zero 효능 시스템 불변식

> **위치**: `vite.config.js` (`vitest.coverage.exclude` 5 박제 글로브 패턴 P-1 ~ P-5) ↔ `src/**` 디스크 트리
> **관련 요구사항**: REQ-20260518-012
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: C단계 마커 회수 + green→blue promote)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD `0887a06` baseline).

## 역할
`vite.config.js` `vitest.coverage.exclude` 의 5 박제 glob 패턴 (P-1 root entry-point / P-2 web-vitals reporter / P-3 mock api / P-4 테스트 파일 / P-5 ambient declaration) 각각이 `src/**` 디스크 트리에서 매치 hit ≥ 1 을 유지한다는 **양면 정합 (vacuous-zero) 결과 효능 계약** 을 박제한다 — 박제된 명목 (= coverage 측정 제외 패턴) ↔ 실재 구현 (= 디스크 매치 파일 집합) 의 명목·실재 격차가 0 으로 유지됨을 5 패턴 직교 sweep grep + find 양면 게이트로 회귀 보호. 의도적으로 하지 않는 것: (i) vacuous 발생 시 해소 수단 선정 (패턴 제거 vs 새 파일 추가 vs 패턴 일반화) — 수단 위임 (inspector/planner 영역), (ii) 발화 채널 (CI step / pre-commit / pre-push hook / 신규 `package.json` `check:coverage-exclude-vacuous-zero` script) 선정 — 수단 위임 (FR-07 의 "발화 채널 존재" 계약 박제, 수단 중립), (iii) `vitest.coverage.include` 단일 패턴 (`src/**/*.{js,jsx,ts,tsx}`) 의 매치 집합 정합 — 별 axis (본 spec 은 `exclude` 5 패턴 한정), (iv) `vitest.coverage.thresholds` 4 키 (`lines: 98 / statements: 97 / functions: 94 / branches: 94`) 결정론 / baseline 측정 정합 — REQ-002 영역, (v) `coverage.provider: 'v8'` ↔ `@vitest/coverage-v8` devDep 정합 — 의존성 정합 axis 분리, (vi) `coverage.reporter: ['text', 'html', 'lcov']` 3 reporter ↔ `coverage/**` 산출물 정합 — 별 axis, (vii) 신규 root-level entry-point (예: `src/Toaster/index.jsx`) 가 P-1 (`src/index.{js,jsx,ts,tsx}` 한정) 에 매치되지 않는 역축 (R-6) — 본 spec 은 박제된 패턴의 vacuous-zero 한정, (viii) `src/setupTests*.js` (vitest `setupFiles`) ↔ `exclude` 매치 정합 — 본 spec scope 외 (별 axis 신호), (ix) test 파일 discovery population coherence (REQ-066) 와 동축이나 본 spec 은 5 패턴 직교 sweep 한정, (x) 1회성 incident patch.

## 공개 인터페이스
- 입력 surface: `vite.config.js` 의 `test.coverage.exclude` 배열 (5 박제 패턴 P-1 ~ P-5).
- 출력 surface: `src/**` 디스크 트리에서 5 패턴 각각의 매치 파일 집합 cardinality.
- 측정 surface: 정책 측 채널 (`grep -cE "^[[:space:]]*'src/" vite.config.js` → 5) + 5 패턴별 매치 cardinality 채널 (`ls src/index.{js,jsx,ts,tsx}` / `ls src/reportWebVitals.{js,jsx,ts,tsx}` / `find src -name "*mock.*"` / `find src -name "*.test.*"` / `find src -name "*.d.ts"`) + 자동 발화 채널 (CI step / pre-commit/pre-push hook / 진단 script 어느 쪽이든) 1+ 부착 surface.
- 결과 효능 형식: 정책 배열 길이 = 5 + 5 패턴 각각의 매치 cardinality ≥ 1 → 5/5 vacuous-zero PASS. 어느 1+ 패턴의 cardinality = 0 → vacuous 회귀 surface FAIL.

## 동작
1. `vite.config.js` 의 `test.coverage.exclude` 배열은 정확히 **5 개** 의 박제 패턴을 가진다 — 변경 (4 또는 6) 은 본 spec 갱신 신호.
2. 각 P-i 패턴은 `src/**` 디스크 트리에서 hit ≥ 1 매치 파일을 가진다:
   - **P-1** `'src/index.{js,jsx,ts,tsx}'` (root entry-point) — baseline 1 hit (`src/index.jsx`).
   - **P-2** `'src/reportWebVitals.{js,jsx,ts,tsx}'` (web-vitals reporter) — baseline 1 hit (`src/reportWebVitals.js`).
   - **P-3** `'src/**/*mock.{js,jsx,ts,tsx}'` (mock api) — baseline 6 hits (`Monitor/api.mock.js`, `File/api.mock.ts`, `Comment/api.mock.ts`, `Image/api.mock.ts`, `Search/api.mock.ts`, `Log/api.mock.js`).
   - **P-4** `'src/**/*.test.{js,jsx,ts,tsx}'` (테스트 파일) — baseline ≥ 1 hit (HEAD `0887a06` 실측 56 hit, REQ 원본 baseline HEAD `41e26e0` 시점 51 hit; 본 spec 의 vacuous-zero 계약은 ≥ 1 한정, 정확 cardinality 는 시점 의존).
   - **P-5** `'src/**/*.d.ts'` (ambient declaration) — baseline 2 hits (`src/types/env.d.ts`, `src/common/env.d.ts`).
3. 5 패턴 각각의 vacuous (hit 0) 는 명목 (coverage 측정 제외 선언) ↔ 실재 (디스크 트리) 격차 surface — 본 spec 위반.
4. 회귀 시나리오:
   - (R-1) `src/index.jsx` 가 `src/main.jsx` 또는 `src/entry.jsx` 로 rename → P-1 vacuous + coverage 측정 대상에 신규 진입점 침투.
   - (R-2) `src/reportWebVitals.js` 가 island 흡수/삭제 → P-2 vacuous + web-vitals 측정 코드가 coverage 대상 침투 또는 패턴 dead code.
   - (R-3) 모든 `*mock.*` 파일이 MSW handlers 로 흡수되어 6/6 삭제 → P-3 vacuous + 신규 mock 도입 시 위치 박제 미존재 (스타일 표류).
   - (R-4) 모든 `*.test.*` 가 `__tests__/*.test.*` 로 이주 → P-4 vacuous + 테스트 파일이 coverage 측정 대상 침투 (자체 측정 자기참조 위험).
   - (R-5) 모든 `.d.ts` 가 `.ts` 로 합쳐짐 → P-5 vacuous + ambient declaration 0 표면 (또는 신규 `.d.ts` 추가 시 자동 제외 미작동).
5. 발화 채널: 본 결과 효능 게이트는 자동 채널 (CI step / pre-commit/pre-push hook / 진단 script 어느 쪽이든) 1+ 에 부착되어 (R-1)~(R-5) 회귀 시점에 vacuous 검출 fail-fast (FR-07 의 "발화 채널 존재" 계약). 수단 선정 위임.

## 의존성
- 내부: `vite.config.js` (`test.coverage.exclude` 배열 5 패턴 = 본 spec 의 정책 surface), `src/**` (5 패턴 매치 대상 디스크 트리 = 본 spec 의 효능 surface), `package.json` (`build` / `test:coverage` script 진입점).
- 외부: Vitest `coverage.exclude` glob 의미 (`https://vitest.dev/config/#coverage-exclude`), `@vitest/coverage-v8` `include`/`exclude` 평가 순서 (include 매치 → exclude 매치 제외), micromatch glob 매처 (`{a,b}` brace expansion / `**` recursive / `*` non-recursive 의미).
- 역의존 (사용처): coverage thresholds 측정 결정론 (`lines: 98 / statements: 97 / functions: 94 / branches: 94`) 이 본 spec 의 5 패턴 vacuous-zero 박제에 부분 의존 (vacuous exclude 가 threshold 통과/미통과 가설 회귀 시 회귀 신호 산란).
- 직교 spec:
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-053 / REQ-058 / REQ-076) — TypeScript foundation tooling 불변식. `vitest.coverage` 범위 박제는 §동작 4 에 포함되나 **각 exclude 패턴의 vacuous-zero axis** 는 미박제 — 본 spec 이 그 별 axis 박제.
  - `specs/30.spec/blue/foundation/test-discovery-population-coherence.md` (REQ-20260517-066) — vitest 가 실행하는 test 파일 집합 axis. 본 spec 의 P-4 매치 집합과 동축이지만 본 spec 은 5 패턴 직교 sweep (P-4 단독 아님).
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (REQ-041 또는 동등) — coverage gate 결정론 (`fileParallelism: false`) axis. 본 spec 과 직교 (결정론 = 측정 회수 동일성 vs 본 spec = exclude 매치 vacuous-zero).
  - 자매 req `20260518-coverage-gate-exit-code-determinism-margin-axis.md` (REQ-002) — coverage gate exit-code 결정론 margin axis. 본 spec 과 직교.
  - `specs/30.spec/blue/foundation/vitest-setupfiles-token-disk-coherence.md` (REQ-20260519-001) — `setupFiles` 토큰 ↔ 디스크 실재 coherence axis. 본 spec 과 결과 효능 형식 동질 (config token ↔ 디스크 양면 정합), 측정 surface 직교 (`setupFiles` 단일 토큰 vs `coverage.exclude` 5 패턴 sweep).
- 자매 패턴 (config token ↔ disk reality 양면 정합 axis): `vitest-setupfiles-token-disk-coherence.md` (REQ-001) 과 형식 동질 (config 선언 ↔ 디스크 실재의 양면 정합 결과 효능), 본 spec 은 5 패턴 균등 sweep axis 로 1 차원 추가.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 measurement 채널 baseline 박제 — 본 spec 자체에는 grep 게이트 외 직접 작업 지시 없음. 본 spec 파생 task 가 grep + find 게이트 작성 시 별도 `## 스코프 규칙` 작성 영역).
- **grep-baseline** (현 시점 PASS surface 박제 — HEAD `0887a06` 실측):
  - `grep -cE "^[[:space:]]*'src/" vite.config.js` → **5** (FR-01, `test.coverage.exclude` 배열 길이 baseline):
    - `vite.config.js:85` `'src/index.{js,jsx,ts,tsx}',` (P-1)
    - `vite.config.js:86` `'src/reportWebVitals.{js,jsx,ts,tsx}',` (P-2)
    - `vite.config.js:87` `'src/**/*mock.{js,jsx,ts,tsx}',` (P-3)
    - `vite.config.js:88` `'src/**/*.test.{js,jsx,ts,tsx}',` (P-4)
    - `vite.config.js:89` `'src/**/*.d.ts',` (P-5)
  - `ls src/index.{js,jsx,ts,tsx} 2>/dev/null | wc -l` → **1** (FR-02 P-1 vacuous-zero PASS): `src/index.jsx`.
  - `ls src/reportWebVitals.{js,jsx,ts,tsx} 2>/dev/null | wc -l` → **1** (FR-03 P-2 vacuous-zero PASS): `src/reportWebVitals.js`.
  - `find src -type f \( -name "*mock.js" -o -name "*mock.jsx" -o -name "*mock.ts" -o -name "*mock.tsx" \) | wc -l` → **6** (FR-04 P-3 vacuous-zero PASS): `Monitor/api.mock.js`, `File/api.mock.ts`, `Comment/api.mock.ts`, `Image/api.mock.ts`, `Search/api.mock.ts`, `Log/api.mock.js`.
  - `find src -type f \( -name "*.test.js" -o -name "*.test.jsx" -o -name "*.test.ts" -o -name "*.test.tsx" \) | wc -l` → **56** (FR-05 P-4 vacuous-zero PASS — req 원본 baseline HEAD `41e26e0` 시점 51 → 본 spec 진입 시점 HEAD `0887a06` 56; 본 spec 계약은 ≥ 1, 정확 cardinality 는 시점 의존, REQ-066 test discovery population coherence 와 결합).
  - `find src -type f -name "*.d.ts" | wc -l` → **2** (FR-06 P-5 vacuous-zero PASS): `src/types/env.d.ts`, `src/common/env.d.ts`.
  - 발화 채널 0 baseline: `grep -rnE "coverage-exclude|vacuous-zero" .github/workflows/ .husky/ scripts/ 2>/dev/null` → 0 hit (FR-07 의 1+ 부착 미발화 — 수단 위임 deferred 영역).
- **rationale**: 정책 배열 길이 측정 (`grep -cE "^[[:space:]]*'src/" vite.config.js`) 은 line-anchored 정규식 — 주석 내 우연 매칭 / 다른 키 내 substring 매칭 회피. 각 패턴별 매치 측정은 brace expansion (`ls src/X.{js,jsx,ts,tsx}`) 또는 `find` + `-name` 다중 OR (`-name "*X.js" -o -name "*X.jsx" ...`) 로 micromatch glob 의미를 shell-level 등가로 재현. 본 spec / 본 fixture / 본 req 본문 내 `coverage.exclude`, `*mock.`, `*.test.`, `.d.ts` 등 문자열 occurrence 는 `src/**` 매치 측정 scope 외 (specs/** 측정 scope 분리, NFR-04 정합).

## 동작 (결과 효능 게이트)
- (I1) `vite.config.js` 의 `test.coverage.exclude` 배열 길이는 정확히 **5** 박제 (현 baseline 5 hit, FR-01).
- (I2) **P-1** `'src/index.{js,jsx,ts,tsx}'` 매치 cardinality ≥ 1 (현 baseline 1 hit @ `src/index.jsx`, FR-02).
- (I3) **P-2** `'src/reportWebVitals.{js,jsx,ts,tsx}'` 매치 cardinality ≥ 1 (현 baseline 1 hit @ `src/reportWebVitals.js`, FR-03).
- (I4) **P-3** `'src/**/*mock.{js,jsx,ts,tsx}'` 매치 cardinality ≥ 1 (현 baseline 6 hit, FR-04).
- (I5) **P-4** `'src/**/*.test.{js,jsx,ts,tsx}'` 매치 cardinality ≥ 1 (현 baseline 56 hit, FR-05; REQ-066 test discovery population coherence 와 결합 검출 영역).
- (I6) **P-5** `'src/**/*.d.ts'` 매치 cardinality ≥ 1 (현 baseline 2 hit, FR-06).
- (I7) (I1) ~ (I6) 6-측정 게이트는 자동 채널 (CI step / pre-commit/pre-push hook / `package.json check:*` script + `npm run` wrapper 어느 쪽이든 동등 효능) 중 **최소 1+** 에 부착되어 (R-1)~(R-5) 회귀 시 5 패턴 직교 측정으로 fail-fast 한다. 수단 중립 — 발화 채널 선정 위임 (현 baseline 미부착 deferred, FR-07).
- (I8) 본 spec / 본 fixture / 본 req 본문 내 `coverage.exclude`, `*mock.`, `*.test.`, `.d.ts` 등 문자열 occurrence 는 (I2)~(I6) 의 `src/**` 매치 cardinality 와 독립 — 측정 scope 는 `vite.config.js` + `src/**` 한정 (specs/** 측정 scope 외, NFR-04).
- (I9) 5 패턴 (P-1 root entry-point / P-2 web-vitals reporter / P-3 mock api / P-4 테스트 / P-5 ambient declaration) 은 의미 분리되되 어느 패턴의 우선순위/대표성 라벨 ("기본 제외 패턴" / "권장" 등) 박제 0 — 5 패턴 모두 동등 의미 carrier (NFR-06).

## 테스트 현황
- [x] HEAD `0887a06` 실측 — `grep -cE "^[[:space:]]*'src/" vite.config.js` → 5 (FR-01 배열 길이 PASS).
- [x] HEAD `0887a06` 실측 — `ls src/index.{js,jsx,ts,tsx} 2>/dev/null | wc -l` → 1 (FR-02 P-1 PASS).
- [x] HEAD `0887a06` 실측 — `ls src/reportWebVitals.{js,jsx,ts,tsx} 2>/dev/null | wc -l` → 1 (FR-03 P-2 PASS).
- [x] HEAD `0887a06` 실측 — `find src -type f \( -name "*mock.js" -o -name "*mock.jsx" -o -name "*mock.ts" -o -name "*mock.tsx" \) | wc -l` → 6 (FR-04 P-3 PASS).
- [x] HEAD `0887a06` 실측 — `find src -type f \( -name "*.test.js" -o -name "*.test.jsx" -o -name "*.test.ts" -o -name "*.test.tsx" \) | wc -l` → 56 (FR-05 P-4 PASS — req 원본 baseline 51 → 진입 시점 56, vacuous-zero ≥ 1 계약 유지).
- [x] HEAD `0887a06` 실측 — `find src -type f -name "*.d.ts" | wc -l` → 2 (FR-06 P-5 PASS).
- [x] FR-07 자동 채널 1+ 부착 — 현 baseline 0 hit (CI step / pre-commit/pre-push hook / 진단 script 어느 채널에도 본 효능 게이트 미부착). 발화 채널 도입은 수단 위임 영역. — **회수**: `src/__tests__/build-policy-and-vitest-config-coherence.test.ts`, CI `Test` step 발화.

## 수용 기준
- [x] (Must / FR-01) Given HEAD `0887a06` baseline, When `grep -cE "^[[:space:]]*'src/" vite.config.js` 실행, Then 출력 = **5** + rc=0 (배열 길이 박제). 4 또는 6 은 본 spec 갱신 신호.
- [x] (Must / FR-02) Given HEAD `0887a06` baseline, When `ls src/index.{js,jsx,ts,tsx} 2>/dev/null | wc -l` 실행, Then 출력 ≥ **1** (P-1 vacuous-zero PASS — baseline 1 hit @ `src/index.jsx`). 출력 = 0 시 P-1 vacuous 회귀.
- [x] (Must / FR-03) Given HEAD `0887a06` baseline, When `ls src/reportWebVitals.{js,jsx,ts,tsx} 2>/dev/null | wc -l` 실행, Then 출력 ≥ **1** (P-2 vacuous-zero PASS — baseline 1 hit @ `src/reportWebVitals.js`). 출력 = 0 시 P-2 vacuous 회귀.
- [x] (Must / FR-04) Given HEAD `0887a06` baseline, When `find src -type f \( -name "*mock.js" -o -name "*mock.jsx" -o -name "*mock.ts" -o -name "*mock.tsx" \) | wc -l` 실행, Then 출력 ≥ **1** (P-3 vacuous-zero PASS — baseline 6 hit). 출력 = 0 시 P-3 vacuous 회귀.
- [x] (Must / FR-05) Given HEAD `0887a06` baseline, When `find src -type f \( -name "*.test.js" -o -name "*.test.jsx" -o -name "*.test.ts" -o -name "*.test.tsx" \) | wc -l` 실행, Then 출력 ≥ **1** (P-4 vacuous-zero PASS — req 원본 baseline 51, 본 spec 진입 시점 56; ≥ 1 계약 유지, 정확 cardinality 시점 의존, REQ-066 test discovery population coherence 와 결합 검출).
- [x] (Must / FR-06) Given HEAD `0887a06` baseline, When `find src -type f -name "*.d.ts" | wc -l` 실행, Then 출력 ≥ **1** (P-5 vacuous-zero PASS — baseline 2 hit). 출력 = 0 시 P-5 vacuous 회귀.
- [x] (회귀 가설 (R-1)) Given `src/index.jsx` 를 `src/main.jsx` 로 rename fixture staged, When 본 게이트 실행, Then FR-02 출력 = **0** (P-1 vacuous 검출, rc=1).
- [x] (회귀 가설 (R-2)) Given `src/reportWebVitals.js` 삭제 fixture staged, When 본 게이트 실행, Then FR-03 출력 = **0** (P-2 vacuous 검출, rc=1).
- [x] (회귀 가설 (R-3)) Given 6 `*mock.*` 파일 전수 삭제 fixture staged, When 본 게이트 실행, Then FR-04 출력 = **0** (P-3 vacuous 검출, rc=1).
- [x] (회귀 가설 (R-4)) Given 56 `*.test.*` 파일 전수 `__tests__/` 디렉터리 이주 + 확장자 변경 fixture staged, When 본 게이트 실행, Then FR-05 출력 = **0** (P-4 vacuous 검출, rc=1) + REQ-066 test discovery population coherence 와 결합 검출.
- [x] (회귀 가설 (R-5)) Given 2 `.d.ts` 파일 전수 `.ts` 합병 fixture staged, When 본 게이트 실행, Then FR-06 출력 = **0** (P-5 vacuous 검출, rc=1).
- [x] (NFR-01 결정론) Given 동일 HEAD `0887a06`, When 본 게이트 N 회 실행, Then N 회 동일 rc + 동일 출력.
- [x] (NFR-02 멱등성) Given 본 게이트 실행, When `vite.config.js` / `src/**` / `coverage/**` 파일 mtime 측정, Then mtime 변경 없음 (read-only 게이트).
- [x] (NFR-04 자체 진단 제외) 본 spec / 본 fixture / 본 req 본문 내 `coverage.exclude` / `*mock.` / `*.test.` / `.d.ts` 문자열 occurrence 는 FR-04·FR-05·FR-06 의 `src/**` 매치 cardinality 와 독립 — 측정 scope `vite.config.js` + `src/**` 한정 (I8 평서).
- [x] (NFR-06 패턴 의미 분리) 5 패턴 (P-1 ~ P-5) 의미 분리는 본 spec 행동 평서에 포함되되 어느 패턴의 우선순위/대표성 라벨 박제 0 — 5 패턴 동등 의미 carrier (I9 평서).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-19 | inspector 125차 tick / HEAD `0887a06` | REQ-20260518-012 흡수 — `vite.config.js` `test.coverage.exclude` 5 박제 glob 패턴 (P-1 root entry-point / P-2 web-vitals reporter / P-3 mock api / P-4 테스트 / P-5 ambient declaration) ↔ `src/**` 디스크 매치 집합 양면 정합 vacuous-zero (cardinality ≥ 1) 결과 효능 불변식 박제 (I1~I9 평서 + FR-01·02·03·04·05·06 ack baseline + FR-07 deferred 발화 채널). req 원본 baseline HEAD `41e26e0` P-4 51 hit → 본 spec 진입 시점 HEAD `0887a06` 56 hit drift 박제, ≥ 1 계약 유지. | all (신규) |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | C단계 마커 회수 — RULE-07 §수용 기준 문장 규약 적용. 판정 가능한 항목은 실측·주입 근거와 함께 flip, 미래 사건·미측정 NFR·자명 명제·별 축 위임 항목은 §참고 §미측정·비판정 항목 으로 강등. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |

## 참고

### deferred (blue 승격 시 강등)

> `[deferred]` 는 green 전용 상태다. blue 는 baseline 이므로 미결 태그를 갖지 않는다 (RULE-07 §promote).

- (Should / FR-07) 본 효능 게이트는 자동 채널 (`.github/workflows/*.yml` CI step / `.husky/*` git hook / `package.json check:*` script / 동등 효능 채널) 중 **최소 1+** 에 부착되어 (R-1)~(R-5) 회귀 시 fail-fast 한다. 측정: `grep -rnE "coverage-exclude|vacuous-zero" .github/workflows/ .husky/ scripts/` 또는 본 spec 박제 토큰 / 진단 script basename → 1+ hit. **[deferred: future-event-dependent — 발화 채널 도입 PR 미발생; 현 baseline 0 hit, 수단 선정 위임.]**. — **주입 검증**: 패턴 1개를 매치 0 인 값으로 바꾸면 1 failed / 8 passed 검출.


### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- 회귀 가설 (R-1)~(R-5) fixture 발화 채널 — vacuous 회귀 fixture 본문 미발화 (별 task / 별 spec 위임 영역).
