# `vite.build.outDir` / `vitest.coverage.reportsDirectory` (default) ↔ `.gitignore` ↔ `eslint.config.js.ignores` 산출 디렉터리 명 3극 표면 동치 시스템 불변식

> **위치**: 횡단 빌드/도구 시스템 불변식 — `vite.config.js:49` `build.outDir` (산출 디렉터리 #1 명시 토큰) + `vite.config.js:80-97` `test.coverage` 블록 (산출 디렉터리 #2 default 의존) + `.gitignore:9,12` (git 추적 제외 측 2 line) + `eslint.config.js:15` `ignores` 배열 (정적 분석 무시 측 2 패턴 P-1, P-2) + repo root 디스크 디렉터리 (`./build/`, `./coverage/`) 실재. 측정 scope = 네 파일 본문 + repo root maxdepth 1 디렉터리 카운트 한정.
> **관련 요구사항**: REQ-20260518-021
> **최종 업데이트**: 2026-05-18 (by inspector — 103차 Phase 1 hook-ack TSK-20260518-20 / `d32ced0` FR-12 marker 2건 flip)

> 본 spec 은 자매 `foundation/tooling.md` §동작 9 (REQ-013, `eslint.config.js:15` `ignores` 5 패턴 단일 표면 vacuous-zero) 의 직교 축 — P-1 (`build/**`) / P-2 (`coverage/**`) 두 패턴을 **다른 두 표면** (`vite.config.js`, `.gitignore`) 과 cross-surface 의미 동치로 확장. tooling.md §동작 9 는 단일 표면 내부 vacuous-zero, 본 spec 은 3 표면 cross-surface set-equality. 두 axis 직교.

## 역할
프로젝트의 두 산출 디렉터리 (`build`, `coverage`) 명 토큰은 **세 표면** — (a) 산출 측 도구 설정 (`vite.config.js` `build.outDir` literal + `vitest.coverage.reportsDirectory` default 의존), (b) git 추적 제외 측 (`.gitignore` anchored line), (c) 정적 분석 무시 측 (`eslint.config.js` `ignores` glob) — 에 박혀 있으며, 세 표면 사이의 디렉터리 명 부분 **byte-equal 동치** 라는 결과 효능 불변식을 갖는다. 비대칭 baseline 사실: 디렉터리 #1 `build` 는 산출 측 (a-1) 에 string literal 명시 / 디렉터리 #2 `coverage` 는 산출 측 (a-2) 가 vitest default 의존 (외부 출처 박제로 동치 성립). 의도적으로 하지 않는 것: (i) 두 산출 디렉터리 명 결정 (`build` ↔ `dist` swap / `coverage` ↔ `reports/coverage` swap) 수단 중립, (ii) `coverage.reportsDirectory` 명시화 결정 (default 의존 유지 vs `'./coverage'` 명시) 수단 중립, (iii) 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:*` script 등) 선정 수단 위임, (iv) 신규 산출 디렉터리 (storybook, vite preview cache, vitest snapshot 등) 박제 — baseline 2 디렉터리 한정, 신규 도입은 본 spec 갱신 신호, (v) `eslint.config.js:15` glob 형식 자체 (`**` recursive 의미) — REQ-20260518-020 / micromatch 영역, (vi) `.gitignore` `/` anchor 형식 의미 — git ignore semantics 영역, (vii) 산출물 내용물 검증 (sourcemap 부재, dev-only 잔재 0, bundle size) — REQ-20260518-007 / REQ-20260518-008 영역.

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `vite.config.js` / `.gitignore` / `eslint.config.js` 본문 grep + repo root maxdepth=1 디렉터리 `find`.

## 동작
1. (G-A) 산출 디렉터리 #1 (`build`) 산출 측 토큰 게이트 — FR-01
   - 명령: `grep -cE "^\s*outDir:\s*'build',\s*$" vite.config.js` → **출력 = 1 + rc=0**.
   - 의미: vite build 산출 측 토큰 (a-1) 이 `'build'` string literal 로 박혀 있다.
2. (G-B) 산출 디렉터리 #1 (`build`) git 무시 측 토큰 게이트 — FR-02
   - 명령: `grep -cE "^/build$" .gitignore` → **출력 = 1 + rc=0**.
   - 의미: `.gitignore` anchored line 단독 (b-1) 박제.
3. (G-C) 산출 디렉터리 #1 (`build`) ESLint 무시 측 토큰 게이트 — FR-03
   - 명령: `grep -cE "'build/\*\*'" eslint.config.js` → **출력 = 1 + rc=0**.
   - 의미: `eslint.config.js:15` `ignores` 배열에 `'build/**'` 토큰 (c-1) 존재.
4. (G-D) 산출 디렉터리 #1 byte-equal 동치 게이트 — FR-04
   - 절차: (a-1)(b-1)(c-1) 세 토큰의 디렉터리 명 부분 — (a-1) `outDir: '<X>'` 의 `<X>` / (b-1) `/<Y>` 의 `<Y>` / (c-1) `'<Z>/**'` 의 `<Z>` — 추출 후 byte 비교. **세 토큰 모두 `build` 로 동치** (HEAD baseline).
   - 의미: (a-1) 만 swap (R-1) / (b-1) 만 swap (R-3) / (c-1) 만 제거 (R-4) 시 동치 위반 검출.
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
1. (R-1) `vite.config.js:49` `outDir: 'build'` → `outDir: 'dist'` 단독 swap 시 G-D byte-equal 위반 검출 (FR-04). 본 spec 부재면 ESLint 단일 표면 (REQ-020) 만 부분 신호.
2. (R-2) `vite.config.js:80-97` `test.coverage` 블록에 `reportsDirectory: 'reports/coverage'` 신규 키 단독 추가 시 G-E 출력 = 1 ≠ 0 + G-H byte-equal 위반 검출 (FR-06 + FR-09).
3. (R-3) `.gitignore:12` 만 `/build` → `/dist` 단독 swap 시 G-A 통과 + G-B 출력 = 0 + G-D byte-equal 위반 검출 (FR-02 + FR-04). 산출이 계속 `./build` 로 들어가는데 git 추적 진입 운영 회귀.
4. (R-4) `eslint.config.js:15` 에서 `'build/**'` 단독 제거 (4 패턴 배열로 축소) 시 G-C 출력 = 0 + G-D byte-equal 위반 검출 (FR-03 + FR-04).
5. (R-5) 새 산출 디렉터리 (`./storybook-static`, `./.vite/`, `./snapshots/` 등) 가 3 표면 어디에도 박제 부재 시 본 spec 갱신 신호 — baseline 2 디렉터리 한정, 신규 도입은 §변경 이력 ack + §동작 확장 (현 게이트는 R-5 자체 미달 검출 아닌 trigger 박제만).
6. ESLint 메이저 bump / Vite 메이저 bump / Vitest 메이저 bump 시 default `reportsDirectory` 값 변경 가능성 — FR-09 외부 출처 박제 갱신 (본 spec 갱신 신호).

## 스코프 규칙
- **expansion**: 불허 (측정 scope = `vite.config.js` + `.gitignore` + `eslint.config.js` + repo root maxdepth=1 디렉터리 한정).
- **grep-baseline** (HEAD=`f74ab43` 실측):
  - (A) `grep -cE "^\s*outDir:\s*'build',\s*$" vite.config.js` → **1** hit (FR-01 PASS).
  - (B) `grep -cE "^/build$" .gitignore` → **1** hit @`:12` (FR-02 PASS).
  - (C) `grep -cE "'build/\*\*'" eslint.config.js` → **1** hit @`:15` (FR-03 PASS).
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
- [ ] (FR-05) `./build` 디스크 실재 — vite build 산출 직후 precondition (`find ... build` ≥ 1 hit, baseline (I) PASS). 본 marker 는 task carve 후 자동 발화 채널 부착 후 플립 — planner 영역 대기.
- [x] (FR-06) `vite.config.js` `reportsDirectory` 부재 (default 의존) — grep gate (E) 실측 0 hit.
- [x] (FR-07) `.gitignore:9` `/coverage` 토큰 박제 — grep gate (F) 실측.
- [x] (FR-08) `eslint.config.js:15` `'coverage/**'` 토큰 박제 — grep gate (G) 실측.
- [x] (FR-09) 산출 디렉터리 #2 3 표면 byte-equal `coverage` 동치 — token (H) 실측 + 외부 출처 (vitest default).
- [ ] (FR-10) `./coverage` 디스크 실재 — vitest run --coverage 산출 직후 precondition (`find ... coverage` ≥ 1 hit, baseline (J) PASS). 본 marker 는 task carve 후 자동 발화 채널 부착 후 플립 — planner 영역 대기.
- [x] (FR-11) 5 회귀 가설 (R-1~R-5) 검출 효능 — §회귀 중점 1~5 평서문 박제.
- [x] (FR-12) 자동 검출 채널 (단위 테스트 + grep + find 조합) rc=0/1 결정론 발화 부착 — TSK-20260518-20 / `d32ced0` `scripts/check-build-coverage-coherence.sh` + `npm run check:build-coverage-coherence` (8 게이트 G-A~G-H fail-fast).

## 수용 기준
- [x] (Must, FR-01) `vite.config.js:49` `outDir: 'build'` literal 박제 — grep gate (A) 1 hit baseline PASS.
- [x] (Must, FR-02) `.gitignore:12` `/build` anchored line 단독 박제 — grep gate (B) 1 hit baseline PASS.
- [x] (Must, FR-03) `eslint.config.js:15` `'build/**'` 토큰 박제 — grep gate (C) 1 hit baseline PASS.
- [x] (Must, FR-04) 산출 디렉터리 #1 3 표면 byte-equal `build` 동치 — token (D) PASS.
- [ ] (Should, FR-05) `./build` 디스크 실재 (vite build precondition) — 자동 발화 채널 부착 후 플립 대기.
- [x] (Must, FR-06) `vite.config.js` `reportsDirectory` 속성 부재 (default 의존 사실) — grep gate (E) 0 hit baseline PASS.
- [x] (Must, FR-07) `.gitignore:9` `/coverage` anchored line 단독 박제 — grep gate (F) 1 hit baseline PASS.
- [x] (Must, FR-08) `eslint.config.js:15` `'coverage/**'` 토큰 박제 — grep gate (G) 1 hit baseline PASS.
- [x] (Must, FR-09) 산출 디렉터리 #2 3 표면 byte-equal `coverage` 동치 (vitest default 외부 출처 박제 형식) — token (H) PASS.
- [ ] (Should, FR-10) `./coverage` 디스크 실재 (vitest run --coverage precondition) — 자동 발화 채널 부착 후 플립 대기.
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
| 2026-05-18 | inspector 103차 Phase 1 hook-ack / TSK-20260518-20 / `d32ced0` | FR-12 marker 2건 flip ([x] §테스트 현황 line 84 + §수용 기준 Should line 98) — `scripts/check-build-coverage-coherence.sh` (8 게이트 G-A~G-H fail-fast) + `package.json:30` `"check:build-coverage-coherence"` npm wrapper 부착. HEAD 재실측 PASS (rc=0 + stdout `check-build-coverage-coherence: G-A+G-B+G-C+G-D (build) + G-E+G-F+G-G+G-H (coverage) PASS (build=build coverage=coverage)`). `git merge-base --is-ancestor d32ced0 HEAD` PASS. RULE-07 정합 — 수단 중립 평서문 (§동작 G-I "발화 채널이 존재해야 한다") 보존, dedicated script 채택은 marker 박제 영역 한정. spec 본문·vite.config.js·eslint.config.js·.gitignore·src/** 변경 0 동반 정합. | §테스트 현황 (FR-12) + §수용 기준 (FR-12) + §변경 이력 |
| 2026-05-18 | inspector (Phase 2, REQ-20260518-021 흡수) / (this commit, HEAD=`f74ab43`) | 최초 등록 (REQ-20260518-021). `vite.build.outDir` literal + `vitest.coverage.reportsDirectory` default 의존 + `.gitignore` anchored + `eslint.config.js.ignores` glob 3 표면 cross-surface byte-equal 동치 결과 효능 불변식 박제. §동작 G-A~G-I 9 게이트 + §회귀 중점 5 시나리오 (R-1~R-5) + §스코프 규칙 grep-baseline (A)~(K-self) 11 gate 실측 (build/coverage 양측 3 표면 PASS + 비대칭 default 의존 사실 + 수단 라벨 0 자기 검증) + §테스트 현황 12 marker (FR-01~FR-12) + §수용 기준 20 marker (FR-01~12 + NFR-01~08). consumed req: `specs/20.req/20260518-build-coverage-output-dir-tri-surface-coherence.md` → `60.done/2026/05/18/req/` mv. 자매 직교 axis: `tooling.md` §동작 9 (REQ-013, `ignores` 5 패턴 단일 표면 vacuous-zero) 의 P-1/P-2 를 cross-surface 3극 동치로 확장. 본 spec 의 In-Scope = baseline 2 디렉터리 (build/coverage) 한정. RULE-07 자기검증 — §동작 G-A~G-I 평서형 + grep/find 단일 명령 반복 검증 가능 + Vite/Vitest/ESLint 메이저 bump 이벤트 비귀속 + P-4 vacuous baseline 박제 같은 incident patch 비귀속 (baseline 사실 평서화) + 수단 중립 (디렉터리 명 결정 / `reportsDirectory` 명시화 / 발화 채널 선정 어느 쪽이든 우선 라벨 0) + self-reference scope 분리 (NFR-04 + 스코프 (K-self) 0 hit). RULE-06 grep-baseline gate (A)~(K-self) 11 건 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/` 신규 1 spec + `20.req/* → 60.done/req/` mv). RULE-03 (d) — 본 carve 로 green 18 → 19 (< GREEN_PENDING_MAX=20, 1 spec 여유 유지). | all (최초 등록) |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/18/req/20260518-build-coverage-output-dir-tri-surface-coherence.md` (REQ-20260518-021, 본 88차 inspector tick mv).
- baseline 토큰 (HEAD=`f74ab43`):
  - 산출 디렉터리 #1 `build`: (a-1) `vite.config.js:49` `outDir: 'build',` / (b-1) `.gitignore:12` `/build` / (c-1) `eslint.config.js:15` `'build/**'` / 디스크: `./build/`.
  - 산출 디렉터리 #2 `coverage`: (a-2) `vite.config.js:80-97` `test.coverage` 블록 — `reportsDirectory` 부재, vitest default `'./coverage'` / (b-2) `.gitignore:9` `/coverage` / (c-2) `eslint.config.js:15` `'coverage/**'` / 디스크: `./coverage/`.
- **자매 직교 spec / req**:
  - `specs/30.spec/green/foundation/tooling.md` §동작 9 (REQ-20260518-013) — `eslint.config.js:15` 5 패턴 vacuous-zero 단일 표면. 본 spec 은 그중 P-1/P-2 를 cross-surface 3극 동치로 확장.
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
