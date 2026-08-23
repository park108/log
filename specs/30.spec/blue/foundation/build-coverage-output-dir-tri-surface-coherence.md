# `vite.build.outDir` / `vitest.coverage.reportsDirectory` (default) ↔ `.gitignore` ↔ `eslint.config.js.ignores` 산출 디렉터리 명 3극 표면 동치 시스템 불변식

> **위치**: 횡단 빌드/도구 시스템 불변식 — `vite.config.js:49` `build.outDir` (산출 디렉터리 #1 명시 토큰) + `vite.config.js:80-97` `test.coverage` 블록 (산출 디렉터리 #2 default 의존) + `.gitignore:9,12` (git 추적 제외 측 2 line) + `eslint.config.js:15` `ignores` 배열 (정적 분석 무시 측 2 패턴 P-1, P-2) + repo root 디스크 디렉터리 (`./build/`, `./coverage/`) 실재. 측정 scope = 네 파일 본문 + repo root maxdepth 1 디렉터리 카운트 한정.
> **관련 요구사항**: REQ-20260518-021
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: C단계 마커 회수 + green→blue promote)

> 본 spec 은 자매 `foundation/tooling.md` §동작 9 (REQ-013, `eslint.config.js:15` `ignores` 5 패턴 단일 표면 vacuous-zero) 의 직교 축 — P-1 (`build/**`) / P-2 (`coverage/**`) 두 패턴을 **다른 두 표면** (`vite.config.js`, `.gitignore`) 과 cross-surface 의미 동치로 확장. tooling.md §동작 9 는 단일 표면 내부 vacuous-zero, 본 spec 은 3 표면 cross-surface set-equality. 두 axis 직교.

## 역할
프로젝트의 두 산출 디렉터리 (`build`, `coverage`) 명 토큰은 **세 표면** — (a) 산출 측 도구 설정 (`vite.config.js` `build.outDir` literal + `vitest.coverage.reportsDirectory` default 의존), (b) git 추적 제외 측 (`.gitignore` anchored line), (c) 정적 분석 무시 측 (`eslint.config.js` `ignores` glob) — 에 박혀 있으며, 세 표면 사이의 디렉터리 명 부분 **byte-equal 동치** 라는 결과 효능 불변식을 갖는다. 비대칭 baseline 사실: 디렉터리 #1 `build` 는 산출 측 (a-1) 에 string literal 명시 / 디렉터리 #2 `coverage` 는 산출 측 (a-2) 가 vitest default 의존 (외부 출처 박제로 동치 성립). 의도적으로 하지 않는 것: (i) 두 산출 디렉터리 명 결정 (`build` ↔ `dist` swap / `coverage` ↔ `reports/coverage` swap) 수단 중립, (ii) `coverage.reportsDirectory` 명시화 결정 (default 의존 유지 vs `'./coverage'` 명시) 수단 중립, (iii) 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:*` script 등) 선정 수단 위임, (iv) 신규 산출 디렉터리 (storybook, vite preview cache, vitest snapshot 등) 박제 — baseline 2 디렉터리 한정, 신규 도입은 본 spec 갱신 신호, (v) `eslint.config.js:15` glob 형식 자체 (`**` recursive 의미) — REQ-20260518-020 / micromatch 영역, (vi) `.gitignore` `/` anchor 형식 의미 — git ignore semantics 영역, (vii) 산출물 내용물 검증 (sourcemap 부재, dev-only 잔재 0, bundle size) — REQ-20260518-007 / REQ-20260518-008 영역.

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `vite.config.js` / `.gitignore` / `eslint.config.js` 본문 grep + repo root maxdepth=1 디렉터리 `find`.

## 동작
1. (G-A) 산출 디렉터리 #1 산출 측 토큰 capture 게이트 — FR-01 (의미 (B) value-agnostic capture)
   - 명령: `grep -nE "^\s*outDir:\s*'([^']+)',\s*$" vite.config.js` → **출력 ≥ 1 line + rc=0** (capture group 1 = `<X>`).
   - 의미: vite build 산출 측 토큰 (a-1) 이 quoted string literal 로 박혀 있다 (값 X 는 capture). 토큰 부재 또는 quoted literal 아닌 동적 형식 (변수 / template literal) 시 rc=1.
   - baseline (HEAD): `<X>` = `build`. 값 swap (`build` → `dist`) 만으로는 G-A rc=0 보존 (단일 surface swap 은 G-D 에서 검출).
2. (G-B) 산출 디렉터리 #1 git 무시 측 토큰 capture 게이트 — FR-02 (의미 (B) value-agnostic capture)
   - 명령: `grep -nE "^/([a-zA-Z0-9_-]+)$" .gitignore` → **출력 ≥ 1 line + rc=0** (capture group 1 = `<Y>` for each anchored line; 본 spec 평가는 `<Y>` ∈ {산출 디렉터리 #1 후보, 산출 디렉터리 #2 후보} 필터링 후 비교).
   - 의미: `.gitignore` anchored line 단독 (b-1) 박제. 값 swap 시 G-B 자체 PASS, G-D 에서 cross-surface drift 검출.
   - baseline (HEAD): 산출 디렉터리 #1 후보 line `<Y>` = `build` @`:12`.
3. (G-C) 산출 디렉터리 #1 ESLint 무시 측 토큰 capture 게이트 — FR-03 (의미 (B) value-agnostic capture)
   - 명령: `grep -nE "'([a-zA-Z0-9_-]+)/\*\*'" eslint.config.js` → **출력 ≥ 1 line + rc=0** (capture group 1 = `<Z>` for each match).
   - 의미: `eslint.config.js:15` `ignores` 배열에 `'<Z>/**'` glob 토큰 (c-1) 존재. 값 swap 시 G-C 자체 PASS, G-D 에서 drift 검출.
   - baseline (HEAD): 산출 디렉터리 #1 후보 `<Z>` = `build`.
4. (G-D) 산출 디렉터리 #1 byte-equal 동치 게이트 — FR-04 (의미 (B) cross-surface comparator)
   - 절차: G-A 의 `<X>` / G-B 산출 디렉터리 #1 후보 `<Y>` / G-C 산출 디렉터리 #1 후보 `<Z>` 세 capture 값 byte 비교. `<X> == <Y> == <Z>` 일치 시 rc=0, 1개라도 mismatch 시 rc=1 + stderr `G-D VIOLATION: build dir drift (vite=<X> gitignore=<Y> eslint=<Z>)`.
   - 의미: 단일 표면 swap 검출 (R-1: vite swap → `<X>=dist, <Y>=build, <Z>=build` → G-D 위반 / R-3: gitignore swap → `<X>=build, <Y>=dist, <Z>=build` → G-D 위반 / R-4: eslint 제거 → `<Z>` 부재 → G-C rc=1 또는 `<Z>=null` → G-D 위반). 3 surface 동시 swap (R-6) 시 `<X>=<Y>=<Z>=dist` → rc=0 (axis 일치, 절대값 무관).
   - 의도: **디렉터리 명 자체** (`build` vs `dist`) 는 measure scope 외 (§역할 §의도적으로 하지 않는 것 (i) "swap 수단 중립" 박제 정합). 본 게이트는 3 surface 의 토큰 byte-equal 동치 결과 효능만 측정.
5. (G-E) 산출 디렉터리 #2 (`coverage`) default 의존 사실 게이트 — FR-06
   - 명령: `grep -cE "reportsDirectory" vite.config.js` → **출력 = 0 + rc=1**.
   - 의미: `vite.config.js.test.coverage` 블록에 `reportsDirectory` 속성 부재 — vitest default `'./coverage'` 의존 baseline 사실 박제. 속성 추가는 본 spec 갱신 신호 (단, 추가 시 값이 `'./coverage'` 또는 `'coverage'` 라면 FR-09 동치 유지).
6. (G-F) 산출 디렉터리 #2 (`coverage`) git 무시 측 토큰 게이트 — FR-07
   - 명령: `grep -cE "^/coverage$" .gitignore` → **출력 = 1 + rc=0**.
   - 의미: `.gitignore` anchored line 단독 (b-2) 박제.
7. (G-G) 산출 디렉터리 #2 (`coverage`) ESLint 무시 측 토큰 게이트 — FR-08
   - 명령: `grep -cE "'coverage/\*\*'" eslint.config.js` → **출력 = 1 + rc=0**.
   - 의미: `eslint.config.js:15` `ignores` 배열에 `'coverage/**'` 토큰 (c-2) 존재.
8. (G-H) 산출 디렉터리 #2 byte-equal 동치 게이트 (default 의존 형식) — FR-09
   - 절차: (a-2) vitest 외부 출처 default = `'./coverage'` + (b-2) `/coverage` + (c-2) `'coverage/**'` 세 토큰의 디렉터리 명 부분 추출. **세 토큰 모두 `coverage` 로 동치** (HEAD baseline). 비대칭 박제 형식: (a-2) 는 vite.config.js 본문 내 string literal 부재 — "vitest 4.x `coverage.reportsDirectory` default = `'./coverage'`" 라는 외부 출처 박제로 동치 성립. 추후 `reportsDirectory: 'coverage'` 명시 추가 시에도 byte-equal 유지 (값 동치).
9. (G-I) 회귀 검출 채널 존재 게이트 — FR-12
   - 절차: 위 8 채널 (FR-01~04, FR-06~09) 의 grep + find 조합이 rc=0/1 결정론으로 판정 가능. 자동 발화 채널 (pre-commit / pre-push / CI / npm script) 선정은 수단 영역, 본 spec 은 "발화 채널이 존재해야 한다" 는 계약만 박제.

## 의존성
- 내부 측정 대상: `vite.config.js`, `.gitignore`, `eslint.config.js`, repo root 디스크 (`./build/`, `./coverage/`).
- 외부 출처: Vite Configuration Reference `build.outDir` (default `'dist'`, 본 프로젝트 `'build'` 명시) / Vitest Coverage Configuration `coverage.reportsDirectory` (default `'./coverage'`) / Git `gitignore` Pattern Format leading slash anchor / ESLint flat config `ignores` (micromatch glob).
- 역의존 (사용처):
  - `tooling.md` §동작 9 (REQ-013, `ignores` 5 패턴 단일 표면 vacuous-zero) — 본 spec 의 P-1/P-2 cross-surface 확장 축 → §동작 9 OOS line 53 "신규 build/coverage 산출 디렉터리 ... 본 req 는 박제된 패턴의 vacuous-zero 한정" 가 본 spec 의 별 axis 박제 신호.

## 회귀 중점
1. (R-1) `vite.config.js:49` `outDir: 'build'` → `outDir: 'dist'` 단독 swap 시 G-A rc=0 보존 (capture `<X>=dist`) + G-B `<Y>=build` + G-C `<Z>=build` → G-D byte-equal 위반 검출 + stderr `G-D VIOLATION: build dir drift (vite=dist gitignore=build eslint=build)` (FR-04). 본 spec 부재면 ESLint 단일 표면 (REQ-020) 만 부분 신호.
2. (R-2) `vite.config.js:80-97` `test.coverage` 블록에 `reportsDirectory: 'reports/coverage'` 신규 키 단독 추가 시 G-E 출력 = 1 ≠ 0 + G-H byte-equal 위반 검출 (FR-06 + FR-09).
3. (R-3) `.gitignore:12` 만 `/build` → `/dist` 단독 swap 시 G-A `<X>=build` + G-B 산출 디렉터리 #1 후보 `<Y>=dist` + G-C `<Z>=build` → G-D byte-equal 위반 검출 + stderr `G-D VIOLATION: build dir drift (vite=build gitignore=dist eslint=build)` (FR-02 capture 보존 + FR-04 발화). 산출이 계속 `./build` 로 들어가는데 git 추적 진입 운영 회귀.
4. (R-4) `eslint.config.js:15` 에서 `'build/**'` 단독 제거 (4 패턴 배열로 축소) 시 G-C 산출 디렉터리 #1 후보 `<Z>` 부재 (capture group 1 list 에서 `build` 항목 미발견) + G-D byte-equal 위반 검출 (FR-03 + FR-04). stderr `G-D VIOLATION: build dir drift (vite=build gitignore=build eslint=<null>)`.
5. (R-5) 새 산출 디렉터리 (`./storybook-static`, `./.vite/`, `./snapshots/` 등) 가 3 표면 어디에도 박제 부재 시 본 spec 갱신 신호 — baseline 2 디렉터리 한정, 신규 도입은 §변경 이력 ack + §동작 확장 (현 게이트는 R-5 자체 미달 검출 아닌 trigger 박제만).
6. (R-6) 3 surface 동시 swap (예: `vite.config.js:49` `'build'` → `'dist'` + `.gitignore:12` `/build` → `/dist` + `eslint.config.js:15` `'build/**'` → `'dist/**'`) 시 G-A `<X>=dist` + G-B `<Y>=dist` + G-C `<Z>=dist` → G-D byte-equal `<X>==<Y>==<Z>=dist` 일치 → **rc=0** (axis 일치, 절대값 무관 — §역할 §의도적으로 하지 않는 것 (i) "swap 수단 중립" 박제 정합). 단, 동시 swap 후에도 산출물 disk 실재 자체 (`./dist/` 디스크 존재) 는 별 게이트 (FR-05 / FR-10) 영역.
7. ESLint 메이저 bump / Vite 메이저 bump / Vitest 메이저 bump 시 default `reportsDirectory` 값 변경 가능성 — FR-09 외부 출처 박제 갱신 (본 spec 갱신 신호).

## 스코프 규칙
- **expansion**: 불허 (측정 scope = `vite.config.js` + `.gitignore` + `eslint.config.js` + repo root maxdepth=1 디렉터리 한정).
- **grep-baseline** (HEAD=`f74ab43` 실측):
  - (A) `grep -nE "^\s*outDir:\s*'([^']+)',\s*$" vite.config.js` → **1** hit @`:49` (capture `<X>=build`) (FR-01 PASS, 의미 (B) capture).
  - (B) `grep -nE "^/([a-zA-Z0-9_-]+)$" .gitignore` → **2** hit @`:9` (`<Y>=coverage`) @`:12` (`<Y>=build`) — 산출 디렉터리 #1 후보 `<Y>=build` PASS (FR-02 PASS, 의미 (B) capture; 추가 `<Y>=node_modules` @`:4` 는 산출 디렉터리 후보 외 필터링).
  - (C) `grep -oE "'([a-zA-Z0-9_-]+)/\*\*'" eslint.config.js` → **3** hit @`:15` — capture group 1 list = {`build`, `coverage`, `node_modules`}. 산출 디렉터리 #1 후보 `<Z>=build` PASS (FR-03 PASS, 의미 (B) capture; `node_modules` 는 디렉터리 후보 외 필터링, `__tests__`/`api.js` 는 패턴 `<X>/**` 미일치).
  - (D-token) (a-1) `build` / (b-1) `build` / (c-1) `build` → byte-equal `build` 동치 PASS (FR-04).
  - (E) `grep -cE "reportsDirectory" vite.config.js` → **0** hit (FR-06 default 의존 사실 PASS).
  - (F) `grep -cE "^/coverage$" .gitignore` → **1** hit @`:9` (FR-07 PASS).
  - (G) `grep -cE "'coverage/\*\*'" eslint.config.js` → **1** hit @`:15` (FR-08 PASS).
  - (H-token) (a-2) vitest default `coverage` / (b-2) `coverage` / (c-2) `coverage` → byte-equal `coverage` 동치 PASS (FR-09).
  - (I) `find . -maxdepth 1 -type d -name "build" -not -path "./node_modules/*" \| wc -l` → **1** hit (FR-05 PASS, vite build 산출 직후 precondition).
  - (J) `find . -maxdepth 1 -type d -name "coverage" -not -path "./node_modules/*" \| wc -l` → **1** hit (FR-10 PASS, vitest run --coverage 산출 직후 precondition).
  - (K-self) `awk '/^### 1\./,/^## 의존성/' build-coverage-output-dir-tri-surface-coherence.md | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit 자기 검증 PASS (수단 라벨 0).
- **rationale**: 측정 scope 는 4 파일 + 2 디렉터리 한정. `specs/**` 본문 내 `build` / `coverage` 토큰 occurrence 는 measure scope 외 (self-reference circularity 회피). 8 grep + 2 find 게이트 동시 PASS 시 3 표면 cross-surface byte-equal 동치 결과 효능 보장. 수단 라벨 0 자기 검증 — 디렉터리 명 결정 / `reportsDirectory` 명시화 / 발화 채널 선정 어느 쪽이든 spec 본문에 우선/권장 표현 0.

## 테스트 현황
- [x] (FR-01) `vite.config.js:49` `outDir: 'build'` 토큰 박제 — grep gate (A) 실측.
- [x] (FR-02) `.gitignore:12` `/build` 토큰 박제 — grep gate (B) 실측.
- [x] (FR-03) `eslint.config.js:15` `'build/**'` 토큰 박제 — grep gate (C) 실측.
- [x] (FR-04) 산출 디렉터리 #1 3 표면 byte-equal `build` 동치 — token (D) 실측.
- [x] (FR-05) `./build` 디스크 실재 — vite build 산출 직후 precondition (`find ... build` ≥ 1 hit, baseline (I) PASS). 본 marker 는 task carve 후 자동 발화 채널 부착 후 플립 — planner 영역 대기. — **측정**: `npm run build` 후 `build/` 실재. `check:build-coverage-coherence` 가 CI 에 부착됨.
- [x] (FR-06) `vite.config.js` `reportsDirectory` 부재 (default 의존) — grep gate (E) 실측 0 hit.
- [x] (FR-07) `.gitignore:9` `/coverage` 토큰 박제 — grep gate (F) 실측.
- [x] (FR-08) `eslint.config.js:15` `'coverage/**'` 토큰 박제 — grep gate (G) 실측.
- [x] (FR-09) 산출 디렉터리 #2 3 표면 byte-equal `coverage` 동치 — token (H) 실측 + 외부 출처 (vitest default).
- [x] (FR-10) `./coverage` 디스크 실재 — vitest run --coverage 산출 직후 precondition (`find ... coverage` ≥ 1 hit, baseline (J) PASS). 본 marker 는 task carve 후 자동 발화 채널 부착 후 플립 — planner 영역 대기. — **측정**: `npm test` 후 `coverage/` 실재.
- [x] (FR-11) 5 회귀 가설 (R-1~R-5) 검출 효능 — §회귀 중점 1~5 평서문 박제.
- [x] (FR-12) 자동 검출 채널 (단위 테스트 + grep + find 조합) rc=0/1 결정론 발화 부착 — TSK-20260518-20 / `d32ced0` `scripts/check-build-coverage-coherence.sh` + `npm run check:build-coverage-coherence` (8 게이트 G-A~G-H fail-fast).

## 수용 기준
- [x] (Must, FR-01) `vite.config.js:49` `outDir: 'build'` literal 박제 — grep gate (A) 1 hit baseline PASS.
- [x] (Must, FR-02) `.gitignore:12` `/build` anchored line 단독 박제 — grep gate (B) 1 hit baseline PASS.
- [x] (Must, FR-03) `eslint.config.js:15` `'build/**'` 토큰 박제 — grep gate (C) 1 hit baseline PASS.
- [x] (Must, FR-04) 산출 디렉터리 #1 3 표면 byte-equal `build` 동치 — token (D) PASS.
- [x] (Should, FR-05) `./build` 디스크 실재 (vite build precondition) — 자동 발화 채널 부착 후 플립 대기. — **회수**: CI `Check build/coverage output dir coherence` step 부착 완료.
- [x] (Must, FR-06) `vite.config.js` `reportsDirectory` 속성 부재 (default 의존 사실) — grep gate (E) 0 hit baseline PASS.
- [x] (Must, FR-07) `.gitignore:9` `/coverage` anchored line 단독 박제 — grep gate (F) 1 hit baseline PASS.
- [x] (Must, FR-08) `eslint.config.js:15` `'coverage/**'` 토큰 박제 — grep gate (G) 1 hit baseline PASS.
- [x] (Must, FR-09) 산출 디렉터리 #2 3 표면 byte-equal `coverage` 동치 (vitest default 외부 출처 박제 형식) — token (H) PASS.
- [x] (Should, FR-10) `./coverage` 디스크 실재 (vitest run --coverage precondition) — 자동 발화 채널 부착 후 플립 대기. — **회수**: 위와 동일.
- [x] (Must, FR-11) 5 회귀 가설 (R-1~R-5) 본 게이트로 검출 효능 — §회귀 중점 평서문 박제.
- [x] (Should, FR-12) 자동 검출 채널 부착 (단위 테스트 + grep + find 조합 rc 결정론) — TSK-20260518-20 / `d32ced0` dedicated script 채택 (`scripts/check-build-coverage-coherence.sh` + `npm run check:build-coverage-coherence`).
- [x] (NFR-01) 결정론 — 동일 HEAD 상 8 grep + 2 find 게이트 N 회 반복 시 N 회 동일 rc + 동일 출력 (line anchor 한정 단일 명령).
- [x] (NFR-02) 멱등성 — 본 게이트는 read-only. 4 파일 + 2 디렉터리 mtime 변경 0.
- [x] (NFR-03) 성능 — 각 grep < 100 ms + 각 find maxdepth=1 < 100 ms + 전체 < 2 s.
- [x] (NFR-04) 자체 진단 scope 분리 — §스코프 규칙 (K-self) 0 hit 자기 검증. 본 spec 본문 내 `build` / `coverage` / `outDir` / `reportsDirectory` 토큰 occurrence 는 measure scope 외 (`vite.config.js` + `.gitignore` + `eslint.config.js` + repo root 디렉터리 한정).
- [x] (NFR-05) 외부 비파괴 — 본 흡수는 `vite.config.js` / `.gitignore` / `eslint.config.js` / `src/**` 변경 동반 0. FR-12 자동 발화 채널 부착은 후속 task 영역.
- [x] (NFR-06) 표면 의미 분리 — 3 표면 (산출 측 / git 무시 측 / ESLint 무시 측) 각 의미 (산출 디렉터리 위치 / git 추적 제외 / 정적 분석 무시) 가 본 spec 평서문에 포함되되 어느 표면의 "주" / "보조" 라벨 0. 3 표면 모두 동등 의미 carrier.
- [x] (NFR-07) 시점 비의존 — Vite 메이저 bump · Vitest 메이저 bump · ESLint 메이저 bump · `.gitignore` 포맷 변경 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지. 단, vitest 메이저 bump 가 `coverage.reportsDirectory` default 값을 변경하면 FR-09 외부 출처 박제 갱신 (본 spec 갱신 신호). 이벤트 발생 시 1 PR 안에 모든 조건 동시 만족 회복 또는 본 spec 갱신.
- [x] (NFR-08) 비대칭 박제 — 산출 디렉터리 #1 (`build`) 은 (a-1) string literal 명시 / #2 (`coverage`) 는 (a-2) vitest default 의존. baseline 사실로 기록, #2 명시화는 본 spec 갱신 트리거가 아닌 의미 보존 변경 (값 동치 유지 시).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-18 | inspector 106차 Phase 1 hook-ack / TSK-20260518-25 / `1a6db08` (body-update only) | `scripts/check-build-coverage-coherence.sh` 본체 의미 (B) value-agnostic capture-then-compare 재작업 회수 ack — G-A/G-B/G-C grep 패턴이 literal `'build',` / `^/build$` / `'build/\*\*'` 에서 capture group 형태 (`'([^']+)',` / `^/([a-zA-Z0-9_-]+)$` / `'([a-zA-Z0-9_-]+)/\*\*'`) 로 전환 (105차 spec 의미 (B) 결정과 정합 회복). HEAD=`1a6db08` 재실측: `bash scripts/check-build-coverage-coherence.sh` rc=0 + stdout `check-build-coverage-coherence: G-A+G-B+G-C+G-D (build) + G-E+G-F+G-G+G-H (coverage) PASS (build=build coverage=coverage)` 보존 + G-A capture pattern `grep -cE "outDir:\[\[:space:\]\]\*'\(\[\^'\]\+\)'" scripts/check-build-coverage-coherence.sh` → 2 hit + literal-pinned 0 hit + G-B capture pattern 1 hit + literal-pinned 0 hit + G-C capture pattern @`:69` `grep -oE "'([a-zA-Z0-9_-]+)/\*\*'" eslint.config.js` + literal-pinned 0 hit (result.md DoD 박제 정합). R-1/R-3/R-4/R-6 4 시나리오 result.md PASS 박제 (R-6 신규 `rc=0 + stdout PASS (build=dist coverage=coverage)` axis 일치 절대값 무관 검증 — §회귀 R-6 박제 effect 회복). `npm test` 57 files / 500 tests PASS / 회귀 0 + `npm run lint` rc=0 / warning 0 + `npm run typecheck` rc=0 박제. `git merge-base --is-ancestor 1a6db08 HEAD` PASS. RULE-07 정합 — 수단 중립 평서문 (§역할 §의도적으로 하지 않는 것 (i) "swap 수단 중립") 보존, script 본체 capture-then-compare 채택은 measure 도구 영역 한정 (spec 본문·vite.config.js·eslint.config.js·.gitignore·src/** 변경 0 동반 정합). FR-12 marker 잔존 [x] (TSK-20260518-20 / `d32ced0` ack 시 박제) — 본 ack 는 script 본체 의미 회복 박제 + §회귀 R-1/R-3/R-4/R-6 검출 효능 회복 박제 (marker flip 0; body-update §변경 이력 1행 박제). 105차 변경 이력 line 116 후속 신호 ("script 재작업 carve 후보 발화 baseline 진입 (별 task)") 회수 완료 baseline. | §변경 이력 + §헤더 |
| 2026-05-18 | inspector 105차 Phase 2 (REQ-20260518-029 흡수) | §동작 G-A/G-B/G-C 의미를 (B) value-agnostic capture-then-compare 일관화 — grep 패턴 literal `'build',` / `^/build$` / `'build/\*\*'` 형태에서 capture group 형태 (`'([^']+)',` / `^/([a-zA-Z0-9_-]+)$` / `'([a-zA-Z0-9_-]+)/\*\*'`) 정정. §회귀 R-1/R-3/R-4 의 기대 발화 형식 `G-D VIOLATION: build dir drift (vite=<X> gitignore=<Y> eslint=<Z>)` 명시 + R-6 신규 추가 (3 surface 동시 swap → rc=0 axis 일치 절대값 무관) — §역할 §의도적으로 하지 않는 것 (i) "swap 수단 중립" 박제와 정합. grep-baseline (A)(B)(C) capture 형태 + 실측 카운트 정정 (B 2 hit / C 3 hit). 결정 근거: spec 본문 다수 surface (§역할 (i) + §회귀 R-1/R-3 stderr 형식 + §의도적으로 하지 않는 것 (i) "swap 수단 중립") 가 의미 (B) value-agnostic 으로 self-anchored — 단지 §동작 G-A/G-B/G-C grep 패턴만 literal 형태로 mismatch 였던 불일치 회복. consumed req: `specs/20.req/20260518-build-coverage-tri-surface-gate-semantics-decision.md` → `60.done/2026/05/18/req/` mv. 후속 신호 (planner 영역, 본 inspector tick 영역 외): `scripts/check-build-coverage-coherence.sh` (TSK-20260518-20 / `d32ced0` 회수) 본체는 의미 (A) literal-pinned 채택 — spec 의미 (B) 와 mismatch → script 재작업 carve 후보 발화 baseline 진입 (별 task). FR-12 marker 잔존 의미: 본 spec 시점 dedicated script 부착 사실은 보존, 단 §회귀 R-1/R-3/R-6 새 기대치 PASS 회귀 검출 효능 회복은 후속 carve 영역. RULE-07 자기 검증 — 평서/반복 (grep + capture/compare 단일 명령) / 시점 비의존 (HEAD baseline 사실 인용) / incident 비귀속 (spec self-anchored 의미 결정, TSK-20 incident patch 아닌 spec 의미 결정 결과) / 수단 중립 보존 (디렉터리 명 `build` 자체 결정은 §역할 (i) "swap 수단 중립" 박제, 의미 (B) 채택은 결정 결과 보강) / self-reference scope 보존 (K-self 0 hit 영향 0). RULE-06 grep-baseline (A)(B)(C) 실측 카운트 + line anchor + capture group 형식 명시. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/` 1 spec body-update + `20.req/* → 60.done/req/` mv). RULE-03 (d) — body-update 형식 (green count 변동 0; 20 → 20 유지, GREEN_PENDING_MAX 정합). | §동작 G-A~G-D + §회귀 R-1/R-3/R-4 + §회귀 R-6 신규 + §스코프 grep-baseline (A)(B)(C) + §헤더 |
| 2026-05-18 | inspector 103차 Phase 1 hook-ack / TSK-20260518-20 / `d32ced0` | FR-12 marker 2건 flip ([x] §테스트 현황 line 84 + §수용 기준 Should line 98) — `scripts/check-build-coverage-coherence.sh` (8 게이트 G-A~G-H fail-fast) + `package.json:30` `"check:build-coverage-coherence"` npm wrapper 부착. HEAD 재실측 PASS (rc=0 + stdout `check-build-coverage-coherence: G-A+G-B+G-C+G-D (build) + G-E+G-F+G-G+G-H (coverage) PASS (build=build coverage=coverage)`). `git merge-base --is-ancestor d32ced0 HEAD` PASS. RULE-07 정합 — 수단 중립 평서문 (§동작 G-I "발화 채널이 존재해야 한다") 보존, dedicated script 채택은 marker 박제 영역 한정. spec 본문·vite.config.js·eslint.config.js·.gitignore·src/** 변경 0 동반 정합. | §테스트 현황 (FR-12) + §수용 기준 (FR-12) + §변경 이력 |
| 2026-05-18 | inspector (Phase 2, REQ-20260518-021 흡수) / (this commit, HEAD=`f74ab43`) | 최초 등록 (REQ-20260518-021). `vite.build.outDir` literal + `vitest.coverage.reportsDirectory` default 의존 + `.gitignore` anchored + `eslint.config.js.ignores` glob 3 표면 cross-surface byte-equal 동치 결과 효능 불변식 박제. §동작 G-A~G-I 9 게이트 + §회귀 중점 5 시나리오 (R-1~R-5) + §스코프 규칙 grep-baseline (A)~(K-self) 11 gate 실측 (build/coverage 양측 3 표면 PASS + 비대칭 default 의존 사실 + 수단 라벨 0 자기 검증) + §테스트 현황 12 marker (FR-01~FR-12) + §수용 기준 20 marker (FR-01~12 + NFR-01~08). consumed req: `specs/20.req/20260518-build-coverage-output-dir-tri-surface-coherence.md` → `60.done/2026/05/18/req/` mv. 자매 직교 axis: `tooling.md` §동작 9 (REQ-013, `ignores` 5 패턴 단일 표면 vacuous-zero) 의 P-1/P-2 를 cross-surface 3극 동치로 확장. 본 spec 의 In-Scope = baseline 2 디렉터리 (build/coverage) 한정. RULE-07 자기검증 — §동작 G-A~G-I 평서형 + grep/find 단일 명령 반복 검증 가능 + Vite/Vitest/ESLint 메이저 bump 이벤트 비귀속 + P-4 vacuous baseline 박제 같은 incident patch 비귀속 (baseline 사실 평서화) + 수단 중립 (디렉터리 명 결정 / `reportsDirectory` 명시화 / 발화 채널 선정 어느 쪽이든 우선 라벨 0) + self-reference scope 분리 (NFR-04 + 스코프 (K-self) 0 hit). RULE-06 grep-baseline gate (A)~(K-self) 11 건 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/` 신규 1 spec + `20.req/* → 60.done/req/` mv). RULE-03 (d) — 본 carve 로 green 18 → 19 (< GREEN_PENDING_MAX=20, 1 spec 여유 유지). | all (최초 등록) |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | C단계 마커 회수 — RULE-07 §수용 기준 문장 규약 적용. 판정 가능한 항목은 실측·주입 근거와 함께 flip, 미래 사건·미측정 NFR·자명 명제·별 축 위임 항목은 §참고 §미측정·비판정 항목 으로 강등. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/18/req/20260518-build-coverage-output-dir-tri-surface-coherence.md` (REQ-20260518-021, 본 88차 inspector tick mv).
- baseline 토큰 (HEAD=`f74ab43`):
  - 산출 디렉터리 #1 `build`: (a-1) `vite.config.js:49` `outDir: 'build',` / (b-1) `.gitignore:12` `/build` / (c-1) `eslint.config.js:15` `'build/**'` / 디스크: `./build/`.
  - 산출 디렉터리 #2 `coverage`: (a-2) `vite.config.js:80-97` `test.coverage` 블록 — `reportsDirectory` 부재, vitest default `'./coverage'` / (b-2) `.gitignore:9` `/coverage` / (c-2) `eslint.config.js:15` `'coverage/**'` / 디스크: `./coverage/`.
- **자매 직교 spec / req**:
  - `specs/30.spec/blue/foundation/tooling.md` §동작 9 (REQ-20260518-013) — `eslint.config.js:15` 5 패턴 vacuous-zero 단일 표면. 본 spec 은 그중 P-1/P-2 를 cross-surface 3극 동치로 확장.
  - `specs/20.req/20260518-vitest-coverage-exclude-pattern-vacuous-zero-axis.md` (REQ-20260518-012, ready) — `coverage.exclude` 5 패턴 vacuous-zero. 본 spec 과 직교 (coverage 내부 패턴 vs 산출 디렉터리 명).
  - `specs/20.req/20260518-vite-build-sourcemap-disabled-bundle-residue-zero.md` (REQ-20260518-008, ready) — `vite.config.js:50` `sourcemap: false`. 본 spec 과 직교 (sourcemap 부재 효능 vs outDir 토큰 cross-surface).
  - `specs/20.req/20260518-prod-bundle-dev-only-code-residue-zero.md` (REQ-20260518-006, ready) — prod 번들 내용물. 본 spec 과 직교 (디렉터리 명 vs 내용물).
- **외부 출처**:
  - Vite Configuration Reference, `build.outDir` (default `'dist'`, 본 프로젝트 `'build'` 명시) — https://vitejs.dev/config/build-options.html#build-outdir.
  - Vitest Coverage Configuration, `coverage.reportsDirectory` (default `'./coverage'`) — https://vitest.dev/config/#coverage-reportsdirectory.
  - Git `gitignore` Pattern Format (leading slash anchor) — https://git-scm.com/docs/gitignore#_pattern_format.
  - ESLint flat config `ignores` (micromatch glob) — https://eslint.org/docs/latest/use/configure/configuration-files#globally-ignoring-files-with-ignores.
- **RULE 준수**:
  - RULE-07: §동작 G-A~G-I 시점 비의존 평서문 + 반복 검증 가능 (grep/find 단일 명령) + incident 비귀속 (baseline 측정 anchor 한정) + 수단 중립.
  - RULE-06: grep-baseline gate (A)~(K-self) 11 건 실측 수치 + line anchor + self-reference scope 분리.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/` 신규 1 spec).
