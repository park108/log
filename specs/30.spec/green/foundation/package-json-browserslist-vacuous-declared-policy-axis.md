# `package.json` `browserslist` 박제 토큰 ↔ build/lint/test 측 소비 채널 vacuous-declared-policy 결과 효능 시스템 불변식

> **위치**: `package.json` (`browserslist` 키 — 2 env × 3 쿼리 = 6 박제 쿼리 토큰) ↔ build/lint/test toolchain 측 소비 채널 hit 집합
> **관련 요구사항**: REQ-20260518-024
> **최종 업데이트**: 2026-05-19 (by inspector 126차 tick)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD `dbbff6d` baseline).

## 역할
`package.json` `browserslist` 키에 박제된 6 쿼리 토큰 (2 env × 3 쿼리) 이 build/lint/test toolchain 의 **실재 소비 채널 ≥ 1 hit** 을 유지한다는 결과 효능 (vacuous-declared-policy 부재) 양면 정합 계약을 박제한다 — 박제된 명목 (= browserslist 정책 선언) ↔ 실재 (= consumer toolchain hit 집합) 의 명목·실재 격차가 0 으로 유지됨을 grep + consumer 식별 sweep 양면 게이트로 회귀 보호. 의도적으로 하지 않는 것: (i) vacuous-declared 진입 시 해소 수단 선정 (consumer 도입 vs `browserslist` 키 제거 vs `.browserslistrc` 외부화) — 수단 위임 (inspector/planner 영역), (ii) 발화 채널 (CI step / pre-push / `check:*` script / build-time runtime parse) 선정 — 수단 위임 (FR-04 의 "발화 채널 존재" 계약 박제, 수단 중립), (iii) browserslist 쿼리 콘텐츠 결정 (왜 `>0.2%` / 왜 `not op_mini all` / 왜 `last 1 X version`) — 별 axis (UX 정책 / 지원 정책), (iv) `.browserslistrc` 외부화 vs `package.json` inline 표면 위치 선택 — 별 axis, (v) `tsconfig.json:3` `target: "ES2020"` ↔ `browserslist` 의미 동치 — 별 axis (TypeScript 출력 타깃은 browserslist 비참조 — 독립 toolchain), (vi) Vite `build.target` 콘텐츠 결정 — 별 axis (Vite 8 기본 `'baseline-widely-available'`, browserslist 자동 참조 아님), (vii) 의존성 bump 직후 회귀 게이트 — REQ-20260421 계열 `dependency-bump-gate.md` 영역, (viii) browserslist npm DB 정합 (`caniuse-lite` 갱신 주기) — 별 axis, (ix) 1회성 incident patch.

## 공개 인터페이스
- 입력 surface: `package.json:43-54` `browserslist` 객체 (2 env: `production` / `development`, 각 env 3 쿼리 배열 = 6 쿼리 토큰).
- 출력 surface: build/lint/test toolchain 의 standard browserslist consumer 모듈 (`@babel/preset-env` / `autoprefixer` / `postcss-preset-env` / `eslint-plugin-compat` / Vite `build.target` 의 `'modules'` 또는 명시적 browserslist 옵션 / 동등 효능 consumer) 의 import resolution + runtime 참조 hit 집합 cardinality.
- 측정 surface: 정책 측 채널 (`grep -nE "browserslist" package.json` → 1 hit 키 + 6 쿼리 토큰 표면) + consumer 측 채널 (`grep -nE "babel|autoprefixer|postcss-preset|eslint-plugin-compat" package.json` devDeps 영역 + `grep -nE "browserslist|target:" vite.config.js` build 옵션 영역 + `.browserslistrc` 외부화 표면 + `npx browserslist` runtime 출력 채널 + 동등 효능 consumer 식별 채널 어느 쪽이든) + 자동 발화 채널 (CI step / pre-push hook / `check:*` script / build-time runtime parse 어느 쪽이든) 1+ 부착 surface.
- 결과 효능 형식: 정책 키 존재 + 6 쿼리 cardinality 보존 (FR-01) + consumer 측 채널 hit 합 ≥ 1 (FR-02 vacuous-declared-policy 부재) + 자체 진단 가능 (FR-03) + 발화 채널 1+ 부착 (FR-04) → vacuous-declared-policy zero-point PASS. 어느 1+ 조건 위반 시 vacuous 회귀 또는 silent policy island surface FAIL.

## 동작
1. `package.json:43` `browserslist` 키는 JSON 객체 타입 + `production` / `development` 양 env 키 (각 배열 타입) 존재 — 변경 (단일 env / 배열 형식 / 키 삭제) 은 본 spec 갱신 신호.
2. `browserslist.production` 배열 = 정확히 **3 쿼리** (`>0.2%` / `not dead` / `not op_mini all`), `browserslist.development` 배열 = 정확히 **3 쿼리** (`last 1 chrome version` / `last 1 firefox version` / `last 1 safari version`) — 총 6 쿼리 토큰 cardinality 보존.
3. 박제된 6 쿼리 토큰의 **실재 소비 채널 hit 합 ≥ 1**:
   - **C-1** `package.json` `devDependencies` 영역 standard browserslist consumer 식별 hit (`@babel/preset-env` / `autoprefixer` / `postcss-preset-env` / `eslint-plugin-compat` / 동등 효능 consumer 어느 쪽이든).
   - **C-2** `vite.config.js` `build.target` 명시적 `'modules'` 또는 `browserslist` 옵션 hit (Vite 8 기본 `'baseline-widely-available'` 은 browserslist 비참조 — 명시적 opt-in 필요).
   - **C-3** `.browserslistrc` 외부화 파일 존재 (외부화 시 별 consumer 식별 surface — 본 spec scope 는 `package.json` inline 한정이므로 C-3 미적용; C-3 발생 시 본 spec ↔ 외부 파일 정합 별 spec 필요).
   - **C-4** runtime `npx browserslist` 명령 출력에 박제 토큰 ≥ 1 hit (자체 진단 채널 — 토큰 자체는 항상 hit, vacuous 측정 보조 surface).
   - C-1 + C-2 의 합 ≥ 1 → vacuous-declared-policy 부재 PASS. 합 = 0 → vacuous declared policy 상태 FAIL.
4. FR-02 의 consumer 측 채널 hit ≥ 1 상태는 자체 진단 가능 — 진단 명령 (예: `npx browserslist` 출력 비교 / `npm ls | grep -E "babel-preset-env|autoprefixer|postcss-preset-env|eslint-plugin-compat"` import resolution / `vite build --debug` 출력에 browserslist 입력 흔적 grep / 동등 효능 채널 어느 쪽이든) 으로 발화 채널에서 1+ hit 확인 가능 (FR-03).
5. 회귀 시나리오:
   - (R-1) `package.json:43` `browserslist` 키 삭제 → FR-01 위반 (정책 surface 소실, silent policy drift).
   - (R-2) `browserslist.production` 또는 `browserslist.development` 배열에서 쿼리 추가/제거 → 6 쿼리 cardinality drift, FR-01 갱신 신호.
   - (R-3) consumer 도입 없이 박제 유지 (현 baseline 상태) → FR-02 vacuous-declared-policy 위반 (silent policy island).
   - (R-4) consumer 도입 (`@babel/preset-env` / `autoprefixer` / `postcss-preset-env` / `eslint-plugin-compat` / Vite `build.target` 명시) 후 박제 토큰 삭제 → consumer 측 fallback 동작 (defaults query) 으로 silent target drift.
   - (R-5) `.browserslistrc` 외부화 도입 후 `package.json:browserslist` 잔존 → 정책 surface 2 위치 분기, 우선순위 (외부 파일 우선) 로 inline 토큰 silent override.
6. 발화 채널: 본 결과 효능 게이트는 자동 채널 (CI step / pre-push hook / `package.json check:*` script / build-time runtime parse 어느 쪽이든) 1+ 에 부착되어 (R-1)~(R-5) 회귀 시점에 vacuous-declared-policy 검출 fail-fast (FR-04 의 "발화 채널 존재" 계약). 수단 선정 위임.

## 의존성
- 내부: `package.json:43-54` (`browserslist` 객체 = 본 spec 의 정책 surface), `package.json:56-78` (`devDependencies` = 본 spec 의 consumer 식별 surface), `vite.config.js:48-60` (`build` 블록 `target` 키 = 본 spec 의 보조 consumer surface), `.browserslistrc` (외부화 표면, 현 baseline 부재).
- 외부: [browserslist 공식 README](https://github.com/browserslist/browserslist#queries) (env 키 / 쿼리 문법 / consumer 자동 발견 규약), [Vite Config — `build.target`](https://vitejs.dev/config/build-options.html#build-target) (Vite 8 기본 `'baseline-widely-available'`, browserslist 자동 참조 아님), `caniuse-lite` npm DB (쿼리 평가 데이터 공급원).
- 역의존 (사용처): build artifact lowering / polyfill 주입 결정이 본 spec 의 6 쿼리 토큰 active 보장에 부분 의존 (vacuous-declared-policy 상태에서는 build artifact 0 영향 — silent island).
- 직교 spec:
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-053 / REQ-058 / REQ-076) — Vite/oxc/esbuild/eslint 도구 채널 박제. browserslist 미박제 (별 axis — 도구 식별 vs 도구 입력 정책).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421 계열) — 의존성 bump 회귀 게이트 (lint/test/build 회귀 0 + React deprecated runtime warning 0). 본 spec 과 직교 (bump 게이트 vs 박제 토큰 active 보장).
  - `specs/60.done/2026/05/17/req/20260517-node-runtime-version-3axis-coherence.md` (REQ-20260517) — Node 런타임 버전 3축 정합. 같은 "정책 토큰 cross-surface" 패턴, 별 토큰 (Node 런타임 vs 브라우저 타깃) — 직교.
- 자매 패턴 (정책 토큰 vacuous-zero 결과 효능 axis): `vitest-coverage-exclude-pattern-vacuous-zero-axis.md` (REQ-20260518-012) 와 결과 효능 형식 동질 (박제 토큰 ↔ 실재 매치/소비 표면 양면 정합), 측정 surface 직교 (build target 정책 ↔ consumer toolchain vs test coverage exclude ↔ 디스크 매치).

## 스코프 규칙
- **expansion**: N/A (본 spec 은 measurement 채널 baseline 박제 — 본 spec 자체에는 grep 게이트 외 직접 작업 지시 없음. 본 spec 파생 task 가 grep + consumer 식별 게이트 작성 시 별도 `## 스코프 규칙` 작성 영역).
- **grep-baseline** (현 시점 vacuous-declared-policy 자체 진단 baseline 박제 — HEAD `dbbff6d` 실측):
  - `grep -nE "browserslist" package.json` → **1 hit** (FR-01 정책 키 surface):
    - `package.json:43` `"browserslist": {`
  - 정책 키 본문 6 쿼리 토큰 cardinality (FR-01 보존):
    - `package.json:44-48` production 3 쿼리: `">0.2%"`, `"not dead"`, `"not op_mini all"`
    - `package.json:49-53` development 3 쿼리: `"last 1 chrome version"`, `"last 1 firefox version"`, `"last 1 safari version"`
  - `grep -nE "babel|autoprefixer|postcss-preset|eslint-plugin-compat" package.json` → **0 hit** (FR-02 C-1 consumer 식별 hit, vacuous declared policy 자체 진단).
  - `grep -nE "browserslist|^\s*target:" vite.config.js` → **0 hit** (FR-02 C-2 Vite build.target 명시 hit, vacuous declared policy 자체 진단).
  - `ls -la .browserslistrc` → **부재** (FR-02 C-3 외부화 표면 미적용 baseline).
  - 합산: C-1 (0) + C-2 (0) + C-3 (N/A) = **0 hit** → vacuous-declared-policy 자체 진단 baseline (FR-02 위반 surface 명시 박제, 현 baseline 상태).
  - 발화 채널 0 baseline: `grep -rnE "browserslist|vacuous-declared" .github/workflows/ .husky/ scripts/ 2>/dev/null` → 0 hit (FR-04 의 1+ 부착 미발화 — 수단 위임 deferred 영역).
- **rationale**: 정책 키 측정 (`grep -nE "browserslist" package.json`) 은 단일 키 존재 + 라인 식별. 본문 6 쿼리 cardinality 는 키 구조 보조 식별 (`production` / `development` 양 env × 3 쿼리). consumer 측 채널 측정은 standard browserslist consumer 모듈명 OR + Vite build.target 명시 OR + 외부화 파일 부재 sweep 으로 vacuous-declared-policy 자체 진단 (현 baseline 0 hit 명시 박제). 본 spec / 본 fixture / 본 req 본문 내 `browserslist` 문자열 occurrence 는 `package.json` consumer 측정 scope 외 (specs/** 측정 scope 분리, NFR-05 자체 진단 제외 정합).

## 동작 (결과 효능 게이트)
- (I1) `package.json:43` `browserslist` 키 존재 + JSON 객체 타입 + `production` / `development` 양 env 키 (각 배열 타입) (현 baseline PASS, FR-01).
- (I2) `browserslist.production` 배열 = 정확히 **3 쿼리** + `browserslist.development` 배열 = 정확히 **3 쿼리** → 총 6 쿼리 토큰 cardinality 보존 (현 baseline PASS, FR-01).
- (I3) 박제 6 쿼리 토큰의 **실재 소비 채널 hit 합 ≥ 1** (vacuous-declared-policy 부재) — C-1 (devDeps consumer 식별) + C-2 (Vite build.target 명시) + C-3 (`.browserslistrc` 외부화) 합산 ≥ 1 (현 baseline 0 hit → vacuous-declared-policy 자체 진단 FAIL surface 명시 박제, FR-02).
- (I4) FR-02 의 consumer 측 채널 hit ≥ 1 상태가 자체 진단 가능 — 진단 명령 (`npx browserslist` / `npm ls | grep consumer` / `vite build --debug` browserslist 흔적 grep / 동등 효능 채널) 으로 발화 채널에서 1+ hit 확인 가능 (FR-03).
- (I5) (I1) ~ (I4) 게이트는 자동 채널 (CI step / pre-push hook / `package.json check:*` script + `npm run` wrapper / build-time runtime parse 어느 쪽이든) 중 **최소 1+** 에 부착되어 (R-1)~(R-5) 회귀 시 vacuous-declared-policy 검출으로 fail-fast 한다. 수단 중립 — 발화 채널 선정 위임 (현 baseline 미부착 deferred, FR-04).
- (I6) 박제 토큰 cardinality 변화 (env 추가/제거, 쿼리 수 변동) 시 FR-02/FR-03 재검증 자동 트리거 — drift 발생 시 fail-fast (FR-05).
- (I7) 본 spec / 본 fixture / 본 req 본문 내 `browserslist` / consumer 모듈명 (`@babel/preset-env` / `autoprefixer` / `postcss-preset-env` / `eslint-plugin-compat`) 문자열 occurrence 는 (I3)~(I4) 의 `package.json` consumer 측정 scope 와 독립 — 측정 scope 는 `package.json` + `vite.config.js` + `.browserslistrc` 한정 (specs/** 측정 scope 외, NFR-05 자체 진단 제외 정합).
- (I8) `tsconfig.json:3` `target: "ES2020"` (TypeScript 출력 타깃, browserslist 비참조 toolchain) ↔ 본 spec 의 `browserslist` 정책 토큰은 의미 직교 — 별 toolchain (NFR-03 직교성).

## 테스트 현황
- [x] HEAD `dbbff6d` 실측 — `grep -nE "browserslist" package.json` → 1 hit @ `:43` (FR-01 정책 키 surface PASS).
- [x] HEAD `dbbff6d` 실측 — `package.json:44-53` 6 쿼리 토큰 cardinality (production 3 + development 3) PASS (FR-01 보존).
- [ ] FR-02 C-1+C-2+C-3 합 ≥ 1 (현 baseline 0 hit, vacuous-declared-policy 자체 진단 FAIL surface 명시 박제) — 해소 수단 위임 deferred.
- [ ] FR-03 진단 명령 부착 (현 baseline 미부착) — 수단 위임 deferred.
- [ ] FR-04 자동 채널 1+ 부착 — 현 baseline 0 hit (CI step / pre-push hook / `check:*` script / build-time runtime parse 어느 채널에도 본 효능 게이트 미부착). 발화 채널 도입은 수단 위임 영역.
- [ ] FR-05 cardinality drift 재검증 자동 트리거 — 발화 채널 도입 후 활성 영역 (FR-04 와 결합).
- [ ] 회귀 가설 (R-1)~(R-5) fixture 발화 채널 — vacuous-declared 회귀 fixture 본문 미발화 (별 task / 별 spec 위임 영역).

## 수용 기준
- [x] (Must / FR-01) Given HEAD `dbbff6d` baseline, When `grep -nE "browserslist" package.json` 실행, Then 출력 = **1 hit @ `:43`** + `production`/`development` 양 env 배열 (각 3 쿼리) 존재 + 총 6 쿼리 cardinality 보존 → 정책 surface 박제 PASS. 키 삭제 또는 단일 env 또는 6 쿼리 cardinality drift 시 본 spec 갱신 신호.
- [ ] (Must / FR-02) Given HEAD `dbbff6d` baseline, When `grep -nE "babel|autoprefixer|postcss-preset|eslint-plugin-compat" package.json` + `grep -nE "browserslist|^\s*target:" vite.config.js` + `ls -la .browserslistrc` 합산 실행, Then 출력 합 ≥ **1** (vacuous-declared-policy 부재 PASS). **현 baseline 출력 합 = 0 → vacuous-declared-policy 자체 진단 FAIL surface 명시 박제 (silent policy island 상태).** **[deferred: 해소 수단 위임 — consumer 도입 vs `browserslist` 키 제거 vs `.browserslistrc` 외부화 중 택일, inspector/planner 영역.]**
- [ ] (Must / FR-03) Given consumer 채널 도입 후, When 진단 명령 (`npx browserslist` 출력 비교 / `npm ls | grep consumer` import resolution / `vite build --debug` browserslist 흔적 grep / 동등 효능 채널) 실행, Then 발화 채널에서 1+ hit 확인 + 결정론 (NFR-02) 만족. **[deferred: FR-02 해소 수단 도입 선행 — future-event-dependent.]**
- [ ] (Should / FR-04) 본 효능 게이트는 자동 채널 (`.github/workflows/*.yml` CI step / `.husky/*` git hook / `package.json check:*` script / build-time runtime parse / 동등 효능 채널) 중 **최소 1+** 에 부착되어 (R-1)~(R-5) 회귀 시 vacuous-declared-policy 검출으로 fail-fast 한다. 측정: `grep -rnE "browserslist|vacuous-declared" .github/workflows/ .husky/ scripts/` 또는 본 spec 박제 토큰 / 진단 script basename → 1+ hit. **[deferred: future-event-dependent — 발화 채널 도입 PR 미발생; 현 baseline 0 hit, 수단 선정 위임.]**
- [ ] (Should / FR-05) Given 6 쿼리 cardinality drift (env 추가/제거 또는 쿼리 수 변동) 발생, When 본 게이트 재실행, Then FR-02 / FR-03 재검증 자동 트리거 + drift 발생 시 fail-fast. **[deferred: FR-04 발화 채널 도입 선행.]**
- [x] (회귀 가설 (R-1)) Given `package.json:43` `browserslist` 키 삭제 fixture staged, When 본 게이트 실행, Then FR-01 출력 = **0 hit** (정책 surface 소실 검출, rc=1).
- [x] (회귀 가설 (R-2)) Given `browserslist.production` 또는 `browserslist.development` 배열에서 쿼리 추가/제거 fixture staged, When 본 게이트 실행, Then 6 쿼리 cardinality drift 검출 + FR-01 갱신 신호 발화.
- [ ] (회귀 가설 (R-3) 현 baseline) Given consumer 도입 없이 박제 유지 (현 baseline), When 본 게이트 실행, Then FR-02 합 = **0** (vacuous-declared-policy 자체 진단 FAIL surface 명시 박제) — **현 baseline 상태 자체 박제, 해소 수단 deferred.**
- [x] (회귀 가설 (R-4)) Given consumer 도입 후 박제 토큰 삭제 fixture staged, When 본 게이트 실행, Then consumer 측 fallback (defaults query) silent target drift 검출 + FR-01 위반 발화.
- [x] (회귀 가설 (R-5)) Given `.browserslistrc` 외부화 도입 후 `package.json:browserslist` 잔존 fixture staged, When 본 게이트 실행, Then 정책 surface 2 위치 분기 검출 + 우선순위 override 경고 발화 (별 spec 신호).
- [x] (NFR-01 진단 출력) 정합 위반 시 stdout/stderr 에 (a) 박제 토큰 표면 (`package.json:browserslist`), (b) 측정한 consumer 채널 hit 수, (c) vacuous-zero 여부 — 3 정보 모두 노출.
- [x] (NFR-02 측정 결정론) Given 동일 HEAD `dbbff6d`, When 본 게이트 N 회 실행, Then N 회 동일 rc + 동일 출력 (range 0).
- [x] (NFR-03 직교성) 본 spec 은 정책 토큰 active 보장 한정. `tsconfig.json:3` `target: "ES2020"` (별 toolchain), Vite `build.target` 콘텐츠 결정 (별 axis), browserslist 쿼리 의미 (별 axis), 의존성 bump 회귀 (REQ-20260421 계열), test coverage exclude vacuous-zero (REQ-20260518-012) 모두 직교 (I8 평서).
- [x] (NFR-04 추적성) 본 spec 박제 후 `grep -rn "REQ-20260518-024" specs/30.spec/{green,blue}/foundation/` → 2 hit 이상 (§관련 요구사항 + §변경 이력).
- [x] (NFR-05 자체 진단 제외) 본 spec / 본 fixture / 본 req 본문 내 `browserslist` / consumer 모듈명 문자열 occurrence 는 FR-02 의 `package.json` consumer 측정 scope 와 독립 — 측정 scope `package.json` + `vite.config.js` + `.browserslistrc` 한정 (I7 평서).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-19 | inspector 126차 tick / HEAD `dbbff6d` | REQ-20260518-024 흡수 — `package.json:43-54` `browserslist` 6 쿼리 토큰 (2 env × 3 쿼리) ↔ build/lint/test toolchain consumer 채널 (C-1 devDeps standard consumer 식별 + C-2 Vite build.target 명시 + C-3 `.browserslistrc` 외부화) hit 합 ≥ 1 양면 정합 vacuous-declared-policy 결과 효능 불변식 박제 (I1~I8 평서 + FR-01 ack baseline + FR-02 vacuous-declared-policy 자체 진단 FAIL surface 명시 박제 (현 baseline 0 hit) + FR-03/04/05 deferred 수단/발화 위임). 자매 패턴 직교 정합 (REQ-20260518-012 `vitest-coverage-exclude-pattern-vacuous-zero-axis.md` 결과 효능 형식 동질, 측정 surface 직교). | all (신규) |
