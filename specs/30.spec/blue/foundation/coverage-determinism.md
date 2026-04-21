# Vitest coverage 측정 결정론 (동일 커밋 → 동일 수치) 불변식

> **위치**: Vitest coverage 구성 (`vite.config.js` 또는 동급 `vitest.config.*`) + 테스트 실행 환경 (`src/setupTests.js`, MSW handler idiom) + CI/hook 진입점 (`.husky/pre-push`, `.github/workflows/*.yml`).
> **관련 요구사항**: REQ-20260421-041, REQ-20260421-043
> **최종 업데이트**: 2026-04-21 (by inspector, REQ-20260421-043 흡수 — FR-02 수단 허용 집합에 (g) 테스트 pool/worker 병행성 제어 축 증분 박제)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=690aa74).

## 역할
본 spec 은 `npm test` (= `vitest run --coverage`) 의 **coverage 수치 측정 결정론** 을 시스템 불변식으로 박제한다. 동일 커밋 / 동일 테스트 집합 / 동일 런타임 환경 (OS·Node·패키지 lock) 에서 `npm test` 의 4축 coverage 수치 (lines/statements/functions/branches) 와 exit code 는 반복 실행 간 동일하다는 성질을 다룬다. 본 spec 은 **측정 결정론 자체** 를 불변식으로 박제하며, threshold 경계 마진 정책 (예: 실측 하한과 threshold 의 최소 간격) 은 본 spec 의 박제 대상이 아니다. 마진이 불필요할 만큼 결정론이 완벽하면 마진 = 0 이 허용된다 — 결정론이 우선이다 (FR-07). 의도적으로 하지 않는 것: threshold 수치 조정 (functions: 94 → 93 하향 또는 95 상향 결정), 결정론 달성 수단 중 특정 하나의 강제 지정, `vite.config.js` / `.husky/**` / `.github/workflows/**` / `src/**` 실제 편집 (planner/developer 영역), flake 원인 진단 task 발행 (planner 영역), coverage 보강 task 발행, per-file threshold / perFile 옵션 / watermarks 박제, 수치 변동의 허용 오차 숫자 박제 (결정론 불변식은 0 변동 이 이상치).

## 공개 인터페이스
- 소비 진입점 (계약 대상):
  - Vitest coverage 구성 객체 `test.coverage.thresholds = { lines, statements, functions, branches }` — 4축 수치 필드 (`regression-gate.md` FR-02 기존 박제).
  - 프로젝트 scripts 엔트리 `"test": "vitest run --coverage"` (`package.json:21` 현재 존재).
  - `.husky/pre-push` 의 `npm test` 단일 커맨드 (hook 통과 조건 = coverage threshold 통과 조건).
  - `.github/workflows/*.yml` 의 `npm test` step (`regression-gate.md` FR-01 typecheck step 과 병렬).
  - 테스트 setup (`src/setupTests.js`) + MSW server lifecycle + `vi.stubEnv` 등 런타임 환경 요소 (결정론 달성 수단의 적용 지점).

## 불변식

### FR-01: coverage 측정 결정론 (Must — positive 평서문)
동일 코드·동일 테스트 집합·동일 런타임 환경 (OS·Node·패키지 lock) 에서 `npm test` (= `vitest run --coverage`) 의 coverage 수치 (lines/statements/functions/branches 4축) 및 exit code 는 **결정론적** 이다. 동일 커밋에 대한 반복 실행 간 exit code 차이는 발생하지 않으며, coverage 수치 차이 역시 발생하지 않는다 (`thresholds` 필드에 의한 pass/fail 판정 포함). 해당 성질 위반은 flake 가 아니라 **회귀 게이트 설계 결함** 이다.

### FR-02: 결정론 달성 수단 허용 집합 (Must — enumeration, 택1 이상 결합)
FR-01 의 결정론 성질은 다음 수단 집합 중 하나 이상의 결합으로 달성된다. **어느 하나도 필수 지정하지 않으며**, 본 열거는 완전 집합이 아니며 향후 발견되는 수단 추가 가능하다:
- (a) **테스트 실행 순서 결정론화** — `test.sequence.shuffle` off 또는 `test.sequence.seed` 고정.
- (b) **환경 stub 타이밍 동기화** — `vi.stubEnv` / `process.env` mutation 이 측정 전 확정 (env 의존 분기 함수의 "실행됨/미실행됨" 상태가 측정 시점에 고정).
- (c) **MSW handler swap 결정론화** — `server.use(...)` 로 handler 를 교체한 직후 `waitFor` 기반 어설션 동기화로 이전 handler 함수의 마지막 호출이 측정 전에 완결.
- (d) **async cleanup 완결 보장** — `afterEach` 에서 `await Promise.resolve()` 또는 동등 microtask flush 로 마지막 이벤트 루프 틱의 callback 실행 보장.
- (e) **반복 실행 수치의 중앙값/최솟값 채택** — `vitest run --reporter=json` 산출을 N회 (N ≥ 3) 재실행 후 median 또는 worst 채택.
- (f) **threshold 와 실측 범위 간 마진 정책 명문화** — (단, 본 spec 은 마진 정책 자체는 박제 대상 아님 — FR-07 참조. 결정론 달성 수단으로서의 "마진 채택" 만 허용 집합에 포함).
- (g) **테스트 pool/worker 병행성 제어** — Vitest `test.pool` (`threads` / `forks` / `vmThreads` / `vmForks`) 및 파일 병렬성 축 (예: `test.poolOptions.*.singleFork`, `--no-file-parallelism` 동등 경로) 의 구성으로 multi-worker 간 V8 coverage 프로파일 병합 경계의 결정성을 고정 (single-process 순차 실행 또는 multi-worker 경계에서 프로파일 병합 동기화 보장 중 택1 이상).

### FR-03: 회귀 게이트 축과의 관계 — 전제 조건 (Must)
본 결정론 불변식은 `foundation/regression-gate.md` (REQ-20260421-037) FR-01 (typecheck step 포함) / FR-02 (thresholds 4축 선언 존재) 의 **전제 조건 (precondition)** 이다. 측정 결정론 없이 thresholds 만 존재할 때 회귀 게이트는 flake 로 인해 신뢰 게이트 기능을 상실한다. 본 spec 의 FR-01 이 성립하면 `regression-gate.md` 의 FR-02 thresholds 는 의미 있는 pass/fail 판정을 산출한다.

### FR-04: 호환 축 (Should)
본 불변식은 다음 기존 박제와 **측정 결정론** 차원에서 직교 관계이다:
- `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — 회귀 게이트 **존재** 축. 본 spec 은 회귀 게이트 **측정 품질** 축으로 직교 + 전제 조건 관계 (FR-03).
- `specs/30.spec/blue/common/test-idioms.md` — 테스트 **작성 레벨** idiom (격리·MSW handler·shuffle safety). 본 spec 은 CI/게이트 레벨 **측정 품질** 축으로 직교.
- `specs/60.done/2026/04/21/req/20260421-test-isolation-shuffle-safety.md` (done) — 테스트 간 shuffle 격리. 본 spec 과 축 분리 (격리 ≠ 수치 결정론).
- `specs/30.spec/green/foundation/dependency-bump-gate.md` (REQ-20260421-035) — dep bump 후 3 명령 회귀 0 게이트. 본 spec 은 dep bump 축 외부 (동일 커밋 내 결정론 축) 이나 `npm test` 를 공유하므로 결정론 향상은 dep bump 게이트 신뢰도 상승에 간접 기여.

### FR-05: 수단 중립성 (Must — 강제 배제)
FR-02 열거된 수단 집합 (a~f) 중 어느 하나도 "기본값" / "권장" / "우선 적용" / "default" 로 표시하지 않는다. 모두 동등 허용이다. planner/developer 는 실측 원인 조사 후 idempotent 수렴 경로를 선택한다.

### FR-06: 버전 무관성 (Must)
FR-01/FR-02 본문은 Vitest 메이저 버전 (4.x/5.x), MSW 메이저 (2.x/3.x), Node 메이저 버전에 무관한 표현이다. 구체 API 이름 (`server.use`, `vi.stubEnv`, `--reporter=json`) 언급은 허용하되 메이저 버전 고정 표현은 배제.

### FR-07: 결정론 축과 경계 마진 정책의 분리 (Should)
본 spec 은 **측정 결정론 자체** 를 불변식으로 박제하며, threshold 경계 마진 정책 (예: 실측 하한과 threshold 의 최소 간격) 은 본 spec 의 박제 대상이 아니다. 마진이 불필요할 만큼 결정론이 완벽하면 마진 = 0 이 허용된다 — 결정론이 우선이다.

## 차원 분리 명시
- **REQ-20260421-037 (regression-gate)**: thresholds 4축 선언 **존재** 불변식. 본 spec 은 "동일 커밋 반복 실행이 동일 수치·동일 exit code 를 산출해야 한다" 는 **측정 결정론** 차원 — 회귀 게이트의 전제 조건이지만 서로 다른 축.
- **REQ-20260420-005 (test-idioms)**: 테스트 작성 레벨 idiom (격리·MSW·shuffle safety). 본 spec 은 CI/게이트 레벨 **측정 품질** 축으로 직교.
- **REQ-20260421-035 (dep-bump-gate)**: dep bump 후 회귀 0 게이트. 본 spec 의 결정론 보장은 dep bump 게이트가 관찰하는 `npm test` 의 신호대잡음비 개선에 상보 기여.

## 의존성
- 내부: `vite.config.js` (`test.coverage.thresholds`), `package.json` (`"test"` 스크립트), `.husky/pre-push`, `.github/workflows/*.yml`, `src/setupTests.js` (MSW server lifecycle + vitest globals).
- 외부: Vitest (`sequence.shuffle`, `sequence.seed`, `--reporter=json`, `@vitest/coverage-v8` provider='v8'), MSW (`server.use`, `server.resetHandlers`, `setupServer`), V8 엔진 실행 프로파일 (async microtask 완결 시점과 함수 "호출됨" 여부 race), GitHub Actions runner / pre-push hook.
- 역의존: `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — 본 spec 의 결정론 불변식이 전제 조건으로 연결. `specs/30.spec/blue/common/test-idioms.md` — 작성 레벨 idiom 과 직교.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 grep 게이트 계약 문서가 아니라 baseline 수치 박제).
- **grep-baseline** (inspector 세션 시점 HEAD=690aa74 실측):

  (a) **positive 목표 — 동일 HEAD 반복 실행 coverage JSON diff 0 lines** (FR-01):
  - `npm test -- --run --reporter=json` N회 (N ≥ 3) 연속 실행 후 산출 JSON 의 coverage summary diff → **목표 0 lines**.
  - 현 시점 baseline: **diff 존재** (followup 실측: Functions 93.66/94.45/94.19, Statements/Lines/Branches 0.05~0.2%p 변동; TSK-83 result.md §관찰 이슈 도 재관측 — Statements 97.72% 안정, Branches 94.4~94.5%, Functions 94.45~94.72%, Lines 98.07~98.11% 범위). 본 baseline 은 FR-01 목표 "0 변동" 대비 **미수렴** 상태.

  (b) **보조 (현장 근거)**:
  - `grep -nE "thresholds\s*:" vite.config.js` → **1 hit** @L82 (4축 선언 완료, `regression-gate.md` FR-02 수렴).
  - `grep -n '"test":' package.json` → **1 hit** @L21 `"test": "vitest run --coverage"` (coverage 무조건 활성).
  - `grep -n "npm test" .husky/pre-push` → **1 hit** @L4 (hook 통과 조건 = coverage threshold 통과 조건).
  - `grep -n "npm test" .github/workflows/ci.yml` → CI step 존재 (regression-gate.md 재박제 회피 — 참조만).
  - `grep -n "setupFiles" vite.config.js` → **1 hit** @L69 `setupFiles: './src/setupTests.js'` (jsdom + MSW 조합).

  (c) **보조 (followup 참조)**:
  - `specs/60.done/2026/04/21/followups/20260421-0730-coverage-functions-flake.md` — Functions 93.66/94.45/94.19 3회 관측 원본.
  - `specs/10.followups/20260421-2245-coverage-run-variance.md` — TSK-83 @690aa74 coverage run-variance 재관측 (discovery 입력 큐, 본 세션 시점).
  - `specs/60.done/2026/04/21/followups/20260421-1401-coverage-variance-root-cause.md` — TSK-20260421-87 @a2b9119 재현 실측 N=28 (baseline N=7 + 3가설 N=7×3). `npm test -- --run --no-file-parallelism` 경로 N=7 에서 4축 range 0.00 / exit=0 7/7 완전 수렴 (단일 process 순차 실행 경로가 측정 결정론 수단으로서 유효함을 baseline 감사 픽스처로 박제 — FR-02 (g) 허용 근거).

- **rationale**: gate (a) 는 본 결정론 불변식의 **목표값** (0 lines diff). 현 시점 미수렴 — planner/developer 가 FR-02 수단 집합 중 택1 이상 결합으로 수렴 task 발행 예상. gate (b) 는 thresholds·test 커맨드·hook·setup 의 현장 근거 — `regression-gate.md` FR-02 와 교집합이나 본 spec 은 "4축 선언 존재" 재박제 배제 (NFR-04), thresholds 선언이 있어야 결정론의 pass/fail 판정 대상이 존재한다는 참조용만. gate (c) 는 원관측 / 재관측 followup 의 감사 pointer. 결정론 달성 후 gate (a) = 0 lines diff / gate (b)(c) 는 변동 없음.

## 테스트 현황
- [x] (Must, REQ-041 FR-01) 동일 HEAD 에서 `npm test -- --run --reporter=json` N회 (N ≥ 3) 연속 실행 후 coverage JSON diff = 0 lines. 수렴 — TSK-20260421-89 @e290e8c N=5 실측 4축 (Statements 97.72 / Branches 94.21 / Functions 94.45 / Lines 98.11) range 0.00 전수 / exit 5/5 = 0 전수 (result.md §테스트 결과).
- [x] (Must, REQ-041 FR-02) FR-02 수단 집합 (a~g) 중 택1 이상 결합 적용. 택 (g-2) `vite.config.js` `test.fileParallelism: false` 1행 박제 (TSK-20260421-89 @e290e8c).

## 수용 기준
- [x] (Must, REQ-041 FR-01) 본 spec §불변식 FR-01 에 평서문 박제 — 동일 커밋 반복 실행 coverage 수치 / exit code 결정론 + 위반 = 설계 결함.
- [x] (Must, REQ-041 FR-02) 본 spec §불변식 FR-02 에 결정론 달성 수단 6종 (a~f) 열거 + "택1 이상 결합 허용" + "완전 집합 아님" 박제.
- [x] (Must, REQ-041 FR-03) 본 spec §불변식 FR-03 에 REQ-20260421-037 precondition 관계 1문장 박제.
- [x] (Must, REQ-041 FR-04) 본 spec §스코프 규칙 grep-baseline 에 3 gate (a)(b)(c) 박제.
- [x] (Must, REQ-041 FR-05) 본 spec §변경 이력 에 `REQ-20260421-041` + `TSK-20260421-78` + `6b083b7` + `REQ-20260421-037` + `9734e27` 5 토큰 박제.
- [x] (Must, REQ-041 FR-06) 본 spec §변경 이력 에 FR-07 택 β (coverage-determinism.md 신설) 판단 근거 1문장 박제.
- [x] (Should, REQ-041 FR-07) 본 spec §역할 + §불변식 FR-07 에 결정론 축과 경계 마진 정책 분리 명시 1문장 박제.
- [x] (NFR-01) 추적성 — `grep -rn "REQ-20260421-041" specs/30.spec/green/foundation/coverage-determinism.md` → 3+ hit (§관련 요구사항 + §변경 이력 본문 등).
- [x] (NFR-02) RULE-07 정합 — 본 결정론 본문 (§역할·§불변식·§차원 분리) 에 구체 수치 (93/94/95/96/97/98/99/100, ±0.5, ±1) 박제 0 (§스코프 규칙 grep-baseline / §변경 이력 의 현장 수치 재서술 제외 — baseline·이력 감사 교차참조). 구체 shuffle seed 리터럴 (`0x...`, `42` 등) 박제 0. "TODO" 토큰 0.
- [x] (NFR-03) 범위 제한 — inspector 세션 diff = `specs/30.spec/green/foundation/coverage-determinism.md` 신설 + `20.req → 60.done/req` mv. `.github/workflows/*`, `vite.config.js`, `package.json`, `.husky/**`, `src/**` 변경 0.
- [x] (NFR-04) 차원 분리 — 본 spec 어디에도 "thresholds 4축 선언 존재", "typecheck step 포함", "GitHub Actions 사용" 같은 REQ-037 영역 불변식 재박제 0 (참조만 허용). 본 spec 은 **측정 결정론 차원** 만 박제.
- [x] (NFR-05) 수단 중립성 — FR-02 열거 (a~f) 중 어느 하나를 "기본값" / "권장" / "우선 적용" / "default" 로 표시 0. 모두 동등.
- [x] (NFR-06) 버전 무관성 — FR-01/FR-02 본문이 Vitest 메이저 버전, MSW 메이저, Node 메이저에 무관한 표현. API 이름 언급 허용.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / e290e8c (TSK-20260421-89) | §테스트 현황 2건 [ ]→[x] 플립 — FR-01 결정론 수렴 ack + FR-02 수단 집합 (g-2) 적용 ack. TSK-20260421-89 @e290e8c (chore: coverage 측정 결정론 수단 (g-2) fileParallelism false 박제) 가 `vite.config.js` `test` 블록 L79 `fileParallelism: false` 1행 + L76-L78 수단 선택 근거 주석 3행 박제. developer result.md §테스트 결과 N=5 동일 HEAD 실측: Statements 97.72 / Branches 94.21 / Functions 94.45 / Lines 98.11 — 4축 range 0.00 전수, exit 5/5 = 0 전수 — FR-01 (동일 코드·동일 환경 → 동일 수치·exit code 결정론) 수렴. 회귀 0 (48 files / 436 tests PASS, lint / build / typecheck 4축 threshold PASS, LogSingle render-budget margin=5000ms 보존). FR-03 precondition 관계 (regression-gate.md FR-02 의미있는 pass/fail 판정 전제) 충족. ack 게이트 재실행 @HEAD=e290e8c: `grep -nE "REQ-20260421-041" vite.config.js` → 1 hit (L76) / `grep -nE "(fileParallelism\|singleFork\|singleThread\|maxWorkers\|pool\\s*:\|--no-file-parallelism)" vite.config.js` → 2 hits (L77 주석 + L79 값). scope 준수: inspector 세션 diff = 본 green spec §테스트 현황 + §변경 이력 증분 + `.inspector-seen` 갱신. `src/**`·`vite.config.js`·`package.json`·`.husky/**`·`.github/workflows/**` 변경 0. RULE-07 정합 — 불변식 본문 (FR-01~FR-07) 수정 없음, `§테스트 현황` 박제 전환과 `§변경 이력` 감사 pointer 추가만. | §테스트 현황, §변경 이력 |
| 2026-04-21 | inspector / f3d53f2 (REQ-20260421-043) | FR-02 수단 허용 집합에 **(g) 테스트 pool/worker 병행성 제어** 축 1항 증분 박제. 근거 task: `TSK-20260421-87` (coverage-run-variance-root-cause-diagnosis @a2b9119), 근거 followup: `20260421-1401-coverage-variance-root-cause` (N=28 run 실측, `--no-file-parallelism` 경로 N=7 에서 4축 range 0.00 / exit=0 7/7 완전 수렴). (g) 서술은 FR-05 수단 중립성 (`권장`/`우선`/`기본값`/`default`/`주범`/`root cause`/`best`/`가장 효과적` 토큰 0) 및 FR-06 버전 무관성 (Vitest·MSW·Node 메이저 고정 표현 배제; API/CLI 이름 언급은 수단 언급 수준에 한정) 준수. FR-01/FR-03/FR-04/FR-05/FR-06/FR-07 본문 변경 0 — 본 증분은 FR-02 열거 1항 추가 + §참고 audit pointer 1건 + §최종 업데이트 갱신 + §관련 요구사항 라인에 REQ-20260421-043 추가 한정. §스코프 규칙 grep-baseline (c) 에 followup pointer 1 행 박제 (baseline 감사 교차참조 — NFR-02 정합: 구체 수치·CLI 리터럴·워커 수 고정 박제는 본문 §불변식 배제, §스코프 규칙/§참고 에만 허용). RULE-07 자기검증: (g) 는 "pool 병행성이 coverage 측정 결정론의 재현 가능한 결정적 변수" 라는 시스템 성질을 수단 집합 확장으로 박제 — 반복 검증 가능 (N=28 fixture), 시점 비의존, 1회성 incident patch 아님. scope 준수: `src/**`·`vite.config.js`·`package.json`·`.husky/**`·`.github/workflows/**` 변경 0 (inspector 영역 외). | 헤더, §불변식 FR-02, §스코프 규칙 (c), §변경 이력 |
| 2026-04-21 | inspector / 690aa74 (REQ-20260421-041) | 최초 등록. FR-06 택 **β 신설 경로** — `foundation/coverage-determinism.md` 독립 spec. 판단 근거: (1) 기존 `foundation/regression-gate.md` (REQ-20260421-037 done/promoted blue) 는 회귀 게이트 **존재** 축 (typecheck step + thresholds 4축 선언) 이 확립된 semantic 경계를 가지며, 본 REQ 의 2 불변식 (측정 결정론 + 수단 허용 집합) 은 **측정 품질** 축으로 직교. regression-gate.md 에 5번째 불변식 증분 시 "게이트 존재" vs "측정 품질" 의미 경계가 흐려질 우려. (2) blue 는 planner writer 영역이라 inspector 가 직접 증분 편집 불가 — blue→green 재복사 후 증분 시 큰 noise. (3) 독립 spec 은 FR-03 precondition 관계를 명시적으로 참조하는 평서문 1건만 유지하고, audit·의미 경계 유지에 유리. 현장 근거 (HEAD=690aa74, 2026-04-21 실측): `vite.config.js:82-87` thresholds 4축 선언 완료 (regression-gate FR-02 수렴) / `package.json:21` `"test": "vitest run --coverage"` / `.husky/pre-push:4` `npm test` / `.github/workflows/ci.yml` 4 step 내 `npm test` 존재 (regression-gate FR-01 수렴). followup 실측 (TSK-20260421-78 / 커밋 `6b083b7`, 동일 HEAD 3회 — Functions 93.66% → 94.45% → 94.19%, Stmts/Lines/Branches ±0.05~0.2%p 변동 — `specs/60.done/2026/04/21/followups/20260421-0730-coverage-functions-flake.md`). 재관측 (TSK-20260421-83 / 커밋 `690aa74` — coverage 런간 fluctuation 5회 실행 — Statements 97.72%, Branches 94.4~94.5%, Functions 94.45~94.72%, Lines 98.07~98.11% — `specs/10.followups/20260421-2245-coverage-run-variance.md`). 선행 done req: REQ-20260421-037 (regression-gate, 전제 조건 관계 FR-03) / REQ-20260421-035 (dep-bump-gate, `npm test` 공유 상보 관계 FR-04). 선행 state HEAD: `9734e27` (REQ-041 발행 직전 inspector HEAD, 본 seen 레저 갱신 참조). consumed: REQ-20260421-041 자체. 차기 task carve 대상 (planner 영역): FR-02 수단 집합 (a~f) 중 택1 이상 결합 적용 → FR-01 수렴 (반복 실행 0 lines diff). flake 원인 진단 task (env stub 타이밍 / MSW handler swap / async cleanup 3 가설 중 주범 식별) 은 별 task. RULE-07 자기검증: 본 spec 본문은 (a) 결정론 불변식 평서문 (FR-01), (b) 수단 허용 집합 열거 + 수단 중립성 (FR-02/FR-05), (c) precondition 관계 (FR-03), (d) 직교 축 (FR-04), (e) 버전 무관성 (FR-06), (f) 축 분리 (FR-07) 만 박제. 1회성 incident/릴리스 수리 플랜 부재 — followup 의 "Functions 94% 경계 하향 vs 커버리지 보강" 중 하나 특정 배제, 구체 shuffle seed 값·측정 reruns N·threshold 수치 조정은 Out-of-Scope. 동음이의 ("결정론" — 테스트 실행 순서 결정론 vs coverage 측정 결정론) 혼동 방지 FR-02 (a) 에서 "실행 순서 결정론화" 로 명시 + §역할 에서 "측정 결정론" 로 구분. | all (신설) |

## 참고
- **REQ 원문 (완료 처리)**: `specs/60.done/2026/04/21/req/20260421-coverage-measurement-determinism-invariant.md` (REQ-20260421-041).
- **소비 followup (감사 pointer)**:
  - `specs/60.done/2026/04/21/followups/20260421-0730-coverage-functions-flake.md` — TSK-20260421-78 @6b083b7 3회 Functions 변동 관측 원본 (REQ 발행 시 이미 `60.done/2026/04/21/followups/` 존재).
  - `specs/10.followups/20260421-2245-coverage-run-variance.md` — TSK-20260421-83 @690aa74 5회 fluctuation 재관측 (본 세션 시점 discovery 입력 큐, 별도 discovery 사이클에서 req 또는 close 처리 예정).
- **선행 done / open req**:
  - `specs/60.done/2026/04/21/req/20260421-ci-typecheck-and-coverage-threshold-regression-gate.md` (REQ-20260421-037) — 회귀 게이트 존재 축. 본 spec FR-03 에서 precondition 관계 명시. `regression-gate.md` blue 승격 완료.
  - `specs/60.done/2026/04/21/req/20260421-test-isolation-shuffle-safety.md` (done) — 테스트 간 shuffle 격리. 축 분리 (격리 ≠ 수치 결정론).
  - REQ-20260421-035 (dep bump gate) — `npm test` 공유 상보 관계 (FR-04). open req 상태 참조.
- **현장 근거 (HEAD=690aa74, 2026-04-21 실측)**:
  - `vite.config.js:82-87` — `thresholds: { lines: 98, statements: 97, functions: 94, branches: 94 }` (값 감사 참조만 — NFR-02 본문 수치 배제).
  - `package.json:21` — `"test": "vitest run --coverage"`.
  - `package.json:24` — `"typecheck": "tsc --noEmit"` (regression-gate FR-01 참조).
  - `.husky/pre-push:4` — `npm test`.
  - `.husky/pre-commit:4` — `npx lint-staged` (coverage 미연동).
  - `vite.config.js:66-89` — `test` 블록 (`globals: true`, `environment: 'jsdom'`, `setupFiles: './src/setupTests.js'`).
  - `src/setupTests.js` 존재 — MSW server lifecycle + vitest globals 토글.
- **연관 spec**:
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037 promoted) — 회귀 게이트 존재 축. 본 spec 과 precondition 관계.
  - `specs/30.spec/blue/common/test-idioms.md` — 테스트 작성 레벨 idiom (격리·MSW·shuffle safety).
  - `specs/30.spec/green/foundation/dependency-bump-gate.md` (REQ-20260421-035) — dep bump 게이트. 본 spec 과 `npm test` 공유 상보 관계.
- **외부 근거**:
  - Vitest 공식 — `test.sequence.shuffle` / `test.sequence.seed` / `--reporter=json` — coverage 출력 machine-readable JSON 으로 반복 diff 가능.
  - `@vitest/coverage-v8` — provider='v8' 에서 함수 커버리지는 V8 엔진의 실행 프로파일 기반 수집. async microtask 완결 시점에 따라 함수 "호출됨" 여부 race 가능 (V8 공식 문서).
  - MSW 공식 — `server.use` / `server.resetHandlers` / `setupServer`. mid-test handler 교체 후 `waitFor` 어설션 동기화 관례.
- **RULE 준수**:
  - RULE-01: inspector writer 영역 (`30.spec/green/**`) 만 신설. `20.req/*` → `60.done/2026/04/21/req/` mv.
  - RULE-06: 본 spec 은 grep 게이트 계약 문서가 아니므로 §스코프 규칙 은 `expansion: N/A` + baseline 수치 박제에 한정.
  - RULE-07: 시스템 불변식 한정 — "동일 코드·동일 테스트 집합·동일 런타임 환경에서 `npm test` coverage 수치 / exit code 결정론" 평서형. 시점 비의존·반복 검증 가능·특정 incident 수리 계획 배제. 구체 threshold 숫자·shuffle seed 값·측정 reruns N·허용 오차 숫자는 Out-of-Scope 로 명시.
  - RULE-04: discovery 는 `REQUIREMENTS_READY_MAX=15` 대비 20.req 소비 후 여유 확인 별도 cycle. inspector 는 `GREEN_PENDING_MAX=20` 대비 현 green 3 specs (common/a11y + common/error-reporter-channel + foundation/coverage-determinism) < 20 — Phase 3 진행 가능.
