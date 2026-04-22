# Vitest coverage 측정 결정론 (동일 커밋 → 동일 수치) 불변식

> **위치**: Vitest coverage 구성 (`vite.config.js` 또는 동급 `vitest.config.*`) + 테스트 실행 환경 (`src/setupTests.js`, MSW handler idiom) + coverage intermediate 산출물 경로 (`coverage/.tmp/coverage-*.json` 또는 `@vitest/coverage-v8` 등가물) + CI/hook 진입점 (`.husky/pre-push`, `.github/workflows/*.yml`).
> **관련 요구사항**: REQ-20260421-041, REQ-20260421-043, REQ-20260422-056, REQ-20260422-057
> **최종 업데이트**: 2026-04-22 (by inspector, REQ-20260422-057 흡수 — FR-11 coverage exclude src-root 엔트리 extension-glob 형식 불변식 증분 박제)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=690aa74 기준 REQ-041/043 박제, HEAD=996d25c 기준 REQ-056 증분 박제, HEAD=a2717fb 기준 REQ-057 증분 박제).

## 역할
본 spec 은 `npm test` (= `vitest run --coverage`) 의 **coverage 수치 측정 결정론** 을 시스템 불변식으로 박제한다. 동일 커밋 / 동일 테스트 집합 / 동일 런타임 환경 (OS·Node·패키지 lock) 에서 `npm test` 의 4축 coverage 수치 (lines/statements/functions/branches) 와 exit code 는 반복 실행 간 동일하다는 성질을 다룬다. 본 spec 은 **측정 결정론 자체** 를 불변식으로 박제하며, threshold 경계 마진 정책 (예: 실측 하한과 threshold 의 최소 간격) 은 본 spec 의 박제 대상이 아니다. 마진이 불필요할 만큼 결정론이 완벽하면 마진 = 0 이 허용된다 — 결정론이 우선이다 (FR-07). REQ-056 증분 (FR-08~FR-10) 은 **결정론 축의 확장 면** — 반복 실행 간 4축 수치 결정론 (FR-01) 에 더해, (i) intermediate 잔재에 대한 robustness, (ii) pre-push 호출 시 직전 로컬 실행 상태 독립성, (iii) non-0 exit 의 귀인이 실제 테스트 실패 또는 실제 threshold 미달에 한정되어야 한다는 **게이트 신호 품질** 경계를 동일 축 위에 박제한다. 의도적으로 하지 않는 것: threshold 수치 조정 (functions: 94 → 93 하향 또는 95 상향 결정), 결정론 달성 수단 중 특정 하나의 강제 지정, `vite.config.js` / `.husky/**` / `.github/workflows/**` / `src/**` 실제 편집 (planner/developer 영역), flake 원인 진단 task 발행 (planner 영역), coverage 보강 task 발행, per-file threshold / perFile 옵션 / watermarks 박제, 수치 변동의 허용 오차 숫자 박제 (결정론 불변식은 0 변동 이 이상치), `@vitest/coverage-v8` 메이저 bump (REQ-056 Out-of-Scope — `foundation/dependency-bump-gate` 축), tmp 디렉터리 경로·purge 시점·worker pool 모델 등 구체 수단 지정 (FR-09 수단 중립성 준수).

## 공개 인터페이스
- 소비 진입점 (계약 대상):
  - Vitest coverage 구성 객체 `test.coverage.thresholds = { lines, statements, functions, branches }` — 4축 수치 필드 (`regression-gate.md` FR-02 기존 박제).
  - 프로젝트 scripts 엔트리 `"test": "vitest run --coverage"` (`package.json:21` 현재 존재).
  - `.husky/pre-push` 의 `npm test` 단일 커맨드 (hook 통과 조건 = coverage threshold 통과 조건).
  - `.github/workflows/*.yml` 의 `npm test` step (`regression-gate.md` FR-01 typecheck step 과 병렬).
  - 테스트 setup (`src/setupTests.js`) + MSW server lifecycle + `vi.stubEnv` 등 런타임 환경 요소 (결정론 달성 수단의 적용 지점).
  - Coverage intermediate 산출물 디렉터리 (`coverage/.tmp/coverage-*.json` 또는 `@vitest/coverage-v8` 등가물 `coverage.reportsDirectory` 하위 tmp) — 본 spec 의 FR-08 robustness 및 FR-10 non-0 exit 귀인 경계 계약의 **상태 축 관찰 대상**. 구체 경로 리터럴 고정은 박제 대상 아님 (수단 중립성).

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

### FR-08: coverage intermediate 잔재 robustness (Must — REQ-20260422-056)
`npm test` 실행 시 coverage intermediate 산출물 경로 (`coverage/.tmp/` 또는 `@vitest/coverage-v8` 의 등가 intermediate 디렉터리) 에 **이전 실행 잔재** 가 존재하는 상태에서 실행이 시작되더라도, 해당 잔재로 인해 `ENOENT` 계열 Unhandled Error · Unhandled rejection · 비-0 exit 가 유발되지 않는다. 즉 반복 실행이 직전 실행의 intermediate 상태에 **의존적이지 않다**. 본 불변식은 동일 HEAD · 동일 테스트 집합 조건 하에서 "clean 시작" 과 "잔재 존재 시작" 두 진입 상태 모두 동일한 4축 수치 및 동일한 exit code (threshold 통과 시 rc=0) 로 수렴함을 요구한다. 달성 수단 (실행 시작 시 intermediate purge / unique 디렉터리 prefix / 파일 lock / `package.json` `"test"` 스크립트 선행 정리 훅 / provider 설정 중 어느 단일 수단도) 은 본 spec 박제 대상이 아니며 planner/developer 영역 (FR-09 수단 중립성 준수).

### FR-09: non-0 exit 귀인 경계 (Must — REQ-20260422-056)
`npm test` 의 non-0 exit 는 다음 두 사유 중 하나로만 발생해야 한다: (i) 테스트 **실제 실패** (assertion failure · error · timeout 등) · (ii) `foundation/regression-gate.md` FR-02 thresholds 4축 선언에 의한 **실제 threshold 미달**. Coverage provider 내부의 intermediate file race (`ENOENT: .../coverage/\.tmp/coverage-.*\.json` 패턴 또는 `V8CoverageProvider.readCoverageFiles` · 등가 상위 진입점에서 발생하는 Unhandled Error) 로 인한 rc=1 은 본 계약 아래 발생하지 않는다. 이 경계는 `regression-gate.md` FR-02 ("미달 시 `npm test` non-0 exit") 의 의미를 **관측 결정론 전제 위** 로 재명시하는 것이며, 회귀 게이트의 신호대잡음비 보강 축으로 기록된다.

### FR-10: pre-push 직전 실행 상태 독립성 (Must — REQ-20260422-056)
`.husky/pre-push` 훅이 호출하는 `npm test` 는 **개발자 로컬 직전 실행의 `coverage/` 디렉터리 상태에 무관** 하게 동일 rc 를 산출한다. 즉 동일 HEAD 에 대해 "방금 로컬에서 `npm test` 를 수행한 직후 `git push`" 진입 경로와 "`coverage/` 디렉터리가 없는 clean 진입 경로" 가 동일한 pass/fail 판정을 내리며, 직전 실행의 intermediate 잔재가 pre-push rc 를 흔들지 않는다. 본 불변식은 FR-08 (intermediate 잔재 robustness) 의 훅 경로 시나리오 구체화이며, CI runner 에서 동일 HEAD 를 clean 진입으로 재실행할 때의 rc 와 로컬 pre-push rc 가 동일해야 함을 의미한다.

### FR-11: coverage exclude src-root 엔트리 extension-glob 형식 불변식 (Must — REQ-20260422-057)
Vitest coverage 구성 (`vite.config.js` 또는 동급 `vitest.config.*`) 의 `test.coverage.exclude` 배열에서 **`src/` root 파일 엔트리** (하위 디렉터리가 없는 단일 파일을 지시하는 엔트리) 는 **단일 확장자 literal 금지** — `src/<name>.{js,jsx,ts,tsx}` 형태의 extension-glob 으로만 기술된다. 본 불변식은 coverage include 글로브 (`src/**/*.{js,jsx,ts,tsx}`) 의 **확장자 4종 동등 취급** 성질과 exclude 엔트리 형식을 대칭화하여, 특정 파일을 `.jsx↔.tsx` / `.js↔.ts` 등으로 **확장자 스위칭** 하는 변경이 발생할 때 exclude miss → include 재포착 → 4축 수치 변동을 유발하지 않도록 한다. `src/**/*.test.{js,jsx,ts,tsx}` · `src/**/*mock.{js,jsx,ts,tsx}` · `src/**/*.d.ts` 같이 이미 `**` glob 을 포함하는 엔트리는 본 불변식의 대상이 아니다 — 본 불변식은 **src root 단일 파일을 지시하는 literal 경로** 에만 적용된다. 본 불변식은 FR-01 (반복 실행 간 수치 결정론) 의 **시간 차원** 을 **확장자 차원** 으로 확장한 것 — 동일 커밋·동일 환경 뿐 아니라 "동일 파일의 확장자 스위칭 후" 에도 coverage 수치 축이 체계적으로 보존되어야 한다는 extension-agnostic 계약.

## 차원 분리 명시
- **REQ-20260421-037 (regression-gate)**: thresholds 4축 선언 **존재** 불변식. 본 spec 은 "동일 커밋 반복 실행이 동일 수치·동일 exit code 를 산출해야 한다" 는 **측정 결정론** 차원 — 회귀 게이트의 전제 조건이지만 서로 다른 축. FR-09 (non-0 exit 귀인 경계) 는 regression-gate FR-02 의 "non-0 exit" 의미를 본 측정 결정론 전제 위에서 재정의 — 교집합 문장 재박제 0 (참조 관계).
- **REQ-20260420-005 (test-idioms)**: 테스트 작성 레벨 idiom (격리·MSW·shuffle safety). 본 spec 은 CI/게이트 레벨 **측정 품질** 축으로 직교.
- **REQ-20260421-035 (dep-bump-gate)**: dep bump 후 회귀 0 게이트. 본 spec 의 결정론 보장은 dep bump 게이트가 관찰하는 `npm test` 의 신호대잡음비 개선에 상보 기여. `@vitest/coverage-v8` 메이저 bump 는 본 spec 이 박제하지 않으며 dep-bump-gate 축 관할 (REQ-056 Out-of-Scope).
- **REQ-20260422-056 (FR-08~FR-10)**: intermediate 잔재 robustness / non-0 exit 귀인 경계 / pre-push 직전 실행 상태 독립성. 본 spec FR-01 (반복 실행 간 4축 수치 동일성) 의 **확장 면** — 직전 실행 intermediate 상태가 반복 실행 결과를 오염시키지 않는다는 robustness + 게이트 신호 품질 경계. `.husky/pre-push` 의 `npm test` 시나리오 구체화 (FR-10) 는 훅 체계 개편이 아닌 **본 spec 측정 결정론 축의 경로 한정 서술**.
- **REQ-20260422-057 (FR-11)**: coverage exclude src-root 엔트리 extension-glob 형식. 본 spec FR-01 (반복 실행 결정론) 의 **확장자 차원 확장** — `npm test` 입력 (소스 파일 확장자) 이 `.js↔.ts` / `.jsx↔.tsx` 로 스위칭될 때 4축 수치가 체계적으로 보존되어야 한다는 extension-agnostic 불변식. `foundation/regression-gate.md` FR-02 (thresholds 4축 선언 존재) 와 직교 — thresholds 수치 자체가 아니라 coverage 입력 형식 계약. `foundation/src-typescript-migration.md` FR-04 (혼재 허용 중 4축 coverage threshold 충족) 의 **축 보조** — 확장자 전환 PR 의 scope 가 `vite.config.js` exclude 편집을 포함하지 않더라도 본 불변식이 선성립하면 coverage 축이 자동 보존 (RULE-06 expansion=불허 환경에서의 축 견고성).

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

  (d) **REQ-20260422-056 측 positive 목표 — intermediate 잔재 robustness + pre-push 독립성** (FR-08/FR-10):
  - 동일 HEAD clean wt 에서 `rm -rf coverage && npm test` 를 1회 실행 → `coverage/.tmp/` 잔재 존재 상태에서 `npm test` 재실행 → 두 실행 모두 rc=0 (또는 threshold 실제 미달 시 동일 threshold 로그와 함께 rc=1) + 두 실행 모두 `ENOENT: .*coverage/\.tmp/coverage-.*\.json` Unhandled Error 포함하지 않음.
  - 현 시점 baseline (REQ-056 본문 §재검증 증거, HEAD=`a1fedbc`): 첫 실행 rc=0 · Branches 94.62% / Statements 97.82% / Functions 94.45% / Lines 98.26% · Test Files 48 PASS. **두 번째 실행** (coverage/.tmp 잔재) rc=1 + `ENOENT: .../coverage/.tmp/coverage-{N}.json` Unhandled Error + `V8CoverageProvider.readCoverageFiles` (`@vitest/coverage-v8/dist/provider.js:32:3`) · `readCoverageFiles` (`vitest/dist/chunks/coverage.Da5gzbsu.js:757:23`) 스택 동반 + 4축 summary 출력 누락. → FR-08 **미수렴** baseline.

  (e) **REQ-20260422-056 측 negative fixture — non-0 exit 귀인 경계 현장 근거** (FR-09):
  - `grep -nE "ENOENT.*coverage/\\.tmp|readCoverageFiles|V8CoverageProvider" <npm-test-stderr>` — 본 패턴 매치 시 non-0 exit 의 귀인이 intermediate race 임을 지시. 본 불변식 성립 후 clean 또는 잔재 진입 모두에서 0 hit.
  - 현장 근거 파일: `specs/60.done/2026/04/22/req/20260422-npm-test-determinism-and-branch-threshold-re-measurement.md` §재검증 증거 + §재검증 수치 박제 블록 (본 세션 흡수 mv).
  - 선행 followup: `specs/10.followups/20260422-1310-tsk-20260422-13-toaster-typecheck-dod-blocked-by-pre-push-drift.md` (TSK-20260422-13 pre-push 차단) + `specs/60.done/2026/04/22/followups/20260422-0239-branch-coverage-pre-existing-drift-93-93.md` (TSK-20260422-08 선행 관찰). 두 followup 모두 "branch 93.93% drift" 로 표상되었으나 REQ-056 재검증이 **관측 비결정성 기원** 가설을 제기 (FR-09 경계 위반의 현장 실례).

  (f) **REQ-20260422-056 측 foundation 박제 존재 게이트** (FR-04):
  - `grep -rnE "coverage/\\.tmp|readCoverageFiles|ENOENT.*coverage" specs/30.spec/{blue,green}/foundation/` — 본 spec 본 흡수 후 최소 1 hit (본 §불변식 FR-08/FR-09 본문 + §스코프 규칙 (d)(e) 본문).

  (g) **REQ-20260422-057 측 positive 목표 — exclude 엔트리 extension-glob 형식** (FR-11), HEAD=`a2717fb` 실측:
  - `grep -nE "^\s*'src/[a-zA-Z_][a-zA-Z0-9_]*\.(js|jsx|ts|tsx)',?$" vite.config.js` — **목표 0 hit** (단일 확장자 literal 부재 · src root 한정 패턴).
  - 현 시점 baseline: **2 hit** @`vite.config.js:85` `'src/index.jsx'` + `:86` `'src/reportWebVitals.js'`. FR-11 **미수렴**.
  - exclude 배열 현장 (HEAD=`a2717fb`, `vite.config.js:84-90`): `'src/index.jsx'` (literal) + `'src/reportWebVitals.js'` (literal) + `'src/**/*mock.{js,jsx,ts,tsx}'` (glob) + `'src/**/*.test.{js,jsx,ts,tsx}'` (glob) + `'src/**/*.d.ts'` (glob). 총 5 엔트리 — 2 literal + 3 glob.
  - 목표 상태: `'src/index.{js,jsx,ts,tsx}'` + `'src/reportWebVitals.{js,jsx,ts,tsx}'` + 기존 3 glob 유지 — 총 5 엔트리 보존 (FR-11 수렴 + 집합 유지).
  - include 글로브는 이미 extension-agnostic: `'src/**/*.{js,jsx,ts,tsx}'` @`vite.config.js:83` (변경 대상 아님).

  (h) **REQ-20260422-057 측 src-typescript-migration 축 접합 현장 근거**, HEAD=`a2717fb` 실측:
  - `find src -maxdepth 1 \( -name "index.*" -o -name "reportWebVitals.*" \)` → `src/index.jsx` 1건 · `src/reportWebVitals.js` 1건 · `src/reportWebVitals.test.ts` 1건 · `src/setupTests.js` 1건 (별 축). 두 root 파일 아직 `.jsx`/`.js` 유지. FR-11 선성립 후 확장자 스위칭 PR 이 coverage 축 자동 보존.
  - `grep -n "reportWebVitals\.js" src/reportWebVitals.test.ts` — 현 시점 후속 fixture 문자열 (`reportWebVitals.test.ts:81` 근처). 확장자 스위칭 task 에서 `.ts` 로 정렬 (REQ-057 FR-05 직접 후속, 본 불변식 범위 밖).

- **rationale**: gate (a) 는 본 결정론 불변식의 **목표값** (0 lines diff). 현 시점 미수렴 — planner/developer 가 FR-02 수단 집합 중 택1 이상 결합으로 수렴 task 발행 예상. gate (b) 는 thresholds·test 커맨드·hook·setup 의 현장 근거 — `regression-gate.md` FR-02 와 교집합이나 본 spec 은 "4축 선언 존재" 재박제 배제 (NFR-04), thresholds 선언이 있어야 결정론의 pass/fail 판정 대상이 존재한다는 참조용만. gate (c) 는 원관측 / 재관측 followup 의 감사 pointer. gate (d) 는 FR-08/FR-10 의 목표값 (잔재 진입 경로 rc/Unhandled Error 없음) 과 현 시점 baseline 미수렴. gate (e) 는 FR-09 non-0 exit 귀인 경계의 negative fixture (`ENOENT` 패턴 매치 시 위반). gate (f) 는 REQ-056 §수용 기준 4번째 항목 ("foundation spec 1건 이상에 평서문 박제") 의 정합 게이트. gate (g) 는 FR-11 의 목표값 (src root literal 0 hit) 과 현 시점 baseline 미수렴 — 수렴 task 는 planner 영역 (`vite.config.js:85-86` 2 literal → 2 glob 치환 1-2 라인). gate (h) 는 FR-11 성립 후 `src-typescript-migration` FR-05 island 확장 (src root `.jsx/.js` → `.tsx/.ts` 전환) 이 coverage 축 자동 보존하는 접합 현장 근거. 결정론 + robustness + 귀인 경계 + extension-glob 달성 후 gate (a)/(d) = 0 lines diff + clean/잔재 rc 동일 / gate (e) = 0 hit / gate (f) = 1+ hit / gate (g) = 0 hit 유지.

## 테스트 현황
- [x] (Must, REQ-041 FR-01) 동일 HEAD 에서 `npm test -- --run --reporter=json` N회 (N ≥ 3) 연속 실행 후 coverage JSON diff = 0 lines. 수렴 — TSK-20260421-89 @e290e8c N=5 실측 4축 (Statements 97.72 / Branches 94.21 / Functions 94.45 / Lines 98.11) range 0.00 전수 / exit 5/5 = 0 전수 (result.md §테스트 결과).
- [x] (Must, REQ-041 FR-02) FR-02 수단 집합 (a~g) 중 택1 이상 결합 적용. 택 (g-2) `vite.config.js` `test.fileParallelism: false` 1행 박제 (TSK-20260421-89 @e290e8c).
- [ ] (Must, REQ-056 FR-08) clean 진입 (`rm -rf coverage && npm test`) 과 intermediate 잔재 진입 (`coverage/.tmp/` 보존 상태에서 `npm test` 재실행) 두 경로 모두 동일 rc + 동일 4축 수치 + `ENOENT: .*coverage/\\.tmp/coverage-.*\\.json` Unhandled Error 0 hit.
- [ ] (Must, REQ-056 FR-09) `npm test` non-0 exit 100% 가 (i) 테스트 실제 실패 또는 (ii) `regression-gate.md` FR-02 thresholds 4축 실제 미달 중 하나에 귀속. `V8CoverageProvider.readCoverageFiles` · `readCoverageFiles` 등 coverage provider 내부 race 원점 Unhandled Error 로 인한 rc=1 비율 0.
- [ ] (Must, REQ-056 FR-10) `.husky/pre-push` 호출 경로에서 `npm test` rc 가 직전 로컬 실행의 `coverage/` 디렉터리 상태에 의존적 변동 0 — "방금 `npm test` 직후 `git push`" 진입과 "`coverage/` 없는 clean 진입" 두 경로 rc 동일.
- [ ] (Should, REQ-056 FR-04 접합) `grep -rnE "coverage/\\.tmp\|readCoverageFiles\|ENOENT.*coverage" specs/30.spec/{blue,green}/foundation/` → 1+ hit (본 green spec FR-08/FR-09 + §스코프 규칙 (d)(e) 가 박제 근거).
- [ ] (Must, REQ-057 FR-11) `grep -nE "^\s*'src/[a-zA-Z_][a-zA-Z0-9_]*\.(js|jsx|ts|tsx)',?$" vite.config.js` → 0 hits (src root 단일 확장자 literal 부재). 현 baseline: **2 hit** (`vite.config.js:85-86`).
- [ ] (Should, REQ-057 FR-11) `src/index.{jsx→tsx}` / `src/reportWebVitals.{js→ts}` 확장자 스위칭 후 `npm test` coverage 4축 (Lines/Statements/Functions/Branches) 전원 threshold 이상 유지 — FR-11 선성립 조건 하 exclude miss 부재.

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
- [ ] (Must, REQ-056 FR-01 → green FR-08) 동일 HEAD clean wt 에서 `rm -rf coverage && npm test` 2회 연속 실행 시 4축 수치 · rc 동일 (본 green spec FR-01 의 반복 실행 결정론을 intermediate 잔재 경로 포함 버전으로 확장).
- [ ] (Must, REQ-056 FR-02 → green FR-08) intermediate 잔재 진입 경로에서 `ENOENT: .*coverage/\\.tmp/coverage-.*\\.json` Unhandled Error · Unhandled rejection · 비-0 exit 유발 0 건.
- [ ] (Must, REQ-056 FR-03 → green FR-10) `.husky/pre-push` 의 `npm test` rc 가 직전 로컬 실행 상태에 의존적 변동 0.
- [ ] (Should, REQ-056 FR-04 → green FR-09) `regression-gate.md` FR-02 의 "non-0 exit" 의미가 **관측 비결정성 없음 전제 위** 로 본 green spec 에서 참조 재서술 완료 (교집합 문장 재박제 0, 참조 관계만).
- [ ] (Should, REQ-056 FR-05) `ENOENT: .*coverage/\\.tmp/coverage-.*\\.json` 패턴 또는 `V8CoverageProvider.readCoverageFiles` 원점 Unhandled Error 재현 후 green FR-08 수렴 시 0 hit.
- [x] (NFR-07, REQ-056 NFR-03 → RULE-07 정합) 본 green spec 은 "bisect 하라", "TSK-20260422-13 재발행하라", "threshold 수치 93.5% 로 하향하라" 같은 1회성 incident patch 문언 박제 0 — FR-08/FR-09/FR-10 모두 평서형 결정성 불변식.
- [x] (NFR-08, REQ-056 NFR-04 → 수단 중립성) `@vitest/coverage-v8` 버전 bump · tmp 디렉터리 경로 리터럴 · worker pool 모델 선정은 본 green spec 이 박제하지 않음 (수단 중립 · `foundation/dependency-bump-gate` 축 참조).
- [ ] (Must, REQ-057 FR-11 → green FR-11) 본 spec §불변식 FR-11 에 "exclude src-root 엔트리는 `src/<name>.{js,jsx,ts,tsx}` extension-glob 형식" 평서문 박제 완료 (본 세션).
- [ ] (Should, REQ-057 FR-02 → green FR-11) FR-11 수렴 후 `vite.config.js` exclude 배열 총 엔트리 수 5 유지 (2 root-file glob + `*mock.{…}` + `*.test.{…}` + `*.d.ts`).
- [ ] (Should, REQ-057 FR-04 → green FR-11) src root `.jsx→.tsx` / `.js→.ts` 확장자 스위칭 task 실행 시 `npm test` coverage 4축 (Lines ≥ 98 · Statements ≥ 97 · Functions ≥ 94 · Branches ≥ 94) 전원 threshold 이상 유지 — FR-11 선성립의 extension-agnostic 효능.
- [x] (NFR, REQ-057 RULE-07 정합) FR-11 은 "exclude 형식 대칭" 평서형 구조 불변식 — incident patch · 특정 릴리스 귀속 부재. "bisect · 수치 하향 · 특정 task 재발행" 토큰 박제 0. 구체 threshold 수치 박제 (Lines 98/Statements 97/Functions 94/Branches 94) 는 §테스트 현황 · §수용 기준 의 baseline 감사 수치로 한정 (본 §불변식 FR-11 본문 내 threshold 수치 언급 0).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-22 | inspector / (this commit) | REQ-20260422-057 흡수 — **green 편집 경로** (본 spec 은 직전 세션 `9572a43` 에서 blue→green 이미 복사 완료). §불변식 FR-11 (coverage exclude src-root 엔트리 extension-glob 형식 불변식) 신규 박제. 본 불변식은 FR-01 (반복 실행 결정론) 의 **확장자 차원 확장** — 동일 커밋·동일 환경 뿐 아니라 "동일 파일의 확장자 스위칭 후" 에도 coverage 4축 수치가 체계적으로 보존되어야 한다는 extension-agnostic 계약. 적용 범위: src root 단일 파일을 지시하는 literal 경로만 (`**` glob 포함 엔트리는 대상 아님 — `src/**/*.test.{…}` · `src/**/*mock.{…}` · `src/**/*.d.ts` 이미 extension-glob). 현 시점 미수렴 baseline HEAD=`a2717fb` 실측: `grep -nE "^\s*'src/[a-zA-Z_][a-zA-Z0-9_]*\.(js|jsx|ts|tsx)',?$" vite.config.js` → **2 hit** (`:85` `'src/index.jsx'` + `:86` `'src/reportWebVitals.js'`). 수렴 target: 각 literal 을 `src/<name>.{js,jsx,ts,tsx}` extension-glob 으로 치환 (총 엔트리 수 5 유지). §차원 분리 명시 에 `foundation/regression-gate.md` FR-02 (thresholds 4축 선언 존재) · `foundation/src-typescript-migration.md` FR-04 (혼재 허용 중 4축 threshold) 와의 축 관계 박제 — thresholds 수치 재박제 0 (참조 관계만). §스코프 규칙 gate (g) · (h) 2건 실측 수치 박제 — FR-11 positive 목표 (src root literal 0 hit) + src-typescript-migration 접합 현장 근거 (src root 파일 현존 확장자 조사). §테스트 현황 2건 + §수용 기준 4건 증분. `foundation/src-typescript-migration.md` FR-05 island 확장 (src root TS 전환) 은 별 축 — 본 spec 은 exclude 형식 불변식만 담당하며 확장자 스위칭 task 발행 · scope 규칙 (RULE-06 expansion) 은 planner 관할. consumed req: `specs/20.req/20260422-coverage-exclude-glob-generalization.md` → `60.done/2026/04/22/req/` mv. consumed followup (감사 pointer, 본 세션은 req 단독 소비): `specs/10.followups/20260422-0459-coverage-exclude-ts-glob-generalization.md` (현재 10.followups/ 또는 60.done/, discovery 세션 REQ-057 발행 경유) + `specs/60.done/2026/04/22/revisit/TSK-20260422-11-src-root-ts-island.md` (관련 블록 기록). 차기 task carve 대상 (planner 영역): `vite.config.js:85-86` 2 literal → 2 extension-glob 치환 — scope 규칙 `expansion: 불허` (vite.config.js 1 파일 한정), grep-baseline `^\s*'src/[a-zA-Z_][a-zA-Z0-9_]*\.(js|jsx|ts|tsx)',?$` → 2→0 수렴. RULE-07 자기검증 — FR-11 평서형·반복 검증 가능 (`grep -nE` 단일 명령)·시점 비의존·incident patch 아님·수단 중립 (단일 line 치환 기법 박제 0). 수렴 후 "동일 파일의 확장자 스위칭이 coverage 축을 오염시키지 않는다" 라는 extension-agnostic 구조 불변식이 박제됨 — 1회성 진단/수리 플랜 아님. RULE-06 §스코프 규칙 gate (g)(h) 실측 수치 박제. RULE-01 inspector writer 영역 (`30.spec/green/**`) 편집만 + `20.req → 60.done/req` mv. RULE-02 단일 커밋 `spec(inspector)`. | 헤더 · §불변식 FR-11 · §차원 분리 명시 · §스코프 규칙 (g)(h) · §테스트 현황 · §수용 기준 · §참고 · §변경 이력 |
| 2026-04-22 | inspector / 9572a43 | REQ-20260422-056 흡수 — **blue→green 복사 후 편집 경로**. §불변식 FR-08 (coverage intermediate 잔재 robustness) · FR-09 (non-0 exit 귀인 경계 — 테스트 실제 실패 + threshold 실제 미달 한정) · FR-10 (pre-push 직전 실행 상태 독립성) 3 불변식 신규 박제. §역할 / §공개 인터페이스 / §차원 분리 명시 / §스코프 규칙 (d)(e)(f) gate / §테스트 현황 4건 + §수용 기준 7건 증분. `foundation/regression-gate.md` FR-02 의 "non-0 exit" 의미를 **관측 비결정성 없음 전제 위** 로 재서술 (교집합 문장 재박제 0 — 참조 관계). consumed req: `specs/20.req/20260422-npm-test-determinism-and-branch-threshold-re-measurement.md` → `60.done/2026/04/22/req/` mv. consumed followup 체인 (감사 pointer): `20260422-1310-tsk-20260422-13-toaster-typecheck-dod-blocked-by-pre-push-drift.md` (TSK-20260422-13 pre-push 차단) + `20260422-0239-branch-coverage-pre-existing-drift-93-93.md` (TSK-20260422-08 선행 관찰). req 본문 §재검증 증거 (HEAD=`a1fedbc` clean wt N=2 실행) 가 "branch 93.93% drift" 를 **관측 비결정성 기원** (coverage/.tmp ENOENT race) 으로 재귀인 — bisect 경로 · 수치 하향 경로 · 개별 테스트 보강 경로는 본 spec 박제 대상 아님 (Out-of-Scope 유지). baseline HEAD=`996d25c` inspector 세션 실측: working tree 에 src/common/** 대량 rename 잔존 (inspector 영역 밖 · 미-staged 유지), 본 세션 diff 는 green spec 1건 편집 + req mv 1건 한정. RULE-07 자기검증 — FR-08/FR-09/FR-10 모두 평서형·반복 검증 가능 (`npm test` clean/잔재 진입 비교 fixture)·시점 비의존·incident 귀속 부재·수단 중립 (`@vitest/coverage-v8` 버전·tmp 디렉터리 경로·purge 시점·worker pool 모델 박제 0). RULE-06 §스코프 규칙 grep-baseline (d)~(f) 3 gate 실측 수치 박제. RULE-01 inspector writer 영역 (`30.spec/green/**`) 신설 + `20.req/*` mv. RULE-02 단일 커밋. | 헤더 · §역할 · §공개 인터페이스 · §불변식 FR-08/FR-09/FR-10 · §차원 분리 명시 · §스코프 규칙 (d)(e)(f) · §테스트 현황 · §수용 기준 · §변경 이력 |
| 2026-04-21 | inspector / e290e8c (TSK-20260421-89) | §테스트 현황 2건 [ ]→[x] 플립 — FR-01 결정론 수렴 ack + FR-02 수단 집합 (g-2) 적용 ack. TSK-20260421-89 @e290e8c (chore: coverage 측정 결정론 수단 (g-2) fileParallelism false 박제) 가 `vite.config.js` `test` 블록 L79 `fileParallelism: false` 1행 + L76-L78 수단 선택 근거 주석 3행 박제. developer result.md §테스트 결과 N=5 동일 HEAD 실측: Statements 97.72 / Branches 94.21 / Functions 94.45 / Lines 98.11 — 4축 range 0.00 전수, exit 5/5 = 0 전수 — FR-01 (동일 코드·동일 환경 → 동일 수치·exit code 결정론) 수렴. 회귀 0 (48 files / 436 tests PASS, lint / build / typecheck 4축 threshold PASS, LogSingle render-budget margin=5000ms 보존). FR-03 precondition 관계 (regression-gate.md FR-02 의미있는 pass/fail 판정 전제) 충족. ack 게이트 재실행 @HEAD=e290e8c: `grep -nE "REQ-20260421-041" vite.config.js` → 1 hit (L76) / `grep -nE "(fileParallelism\|singleFork\|singleThread\|maxWorkers\|pool\\s*:\|--no-file-parallelism)" vite.config.js` → 2 hits (L77 주석 + L79 값). scope 준수: inspector 세션 diff = 본 green spec §테스트 현황 + §변경 이력 증분 + `.inspector-seen` 갱신. `src/**`·`vite.config.js`·`package.json`·`.husky/**`·`.github/workflows/**` 변경 0. RULE-07 정합 — 불변식 본문 (FR-01~FR-07) 수정 없음, `§테스트 현황` 박제 전환과 `§변경 이력` 감사 pointer 추가만. | §테스트 현황, §변경 이력 |
| 2026-04-21 | inspector / f3d53f2 (REQ-20260421-043) | FR-02 수단 허용 집합에 **(g) 테스트 pool/worker 병행성 제어** 축 1항 증분 박제. 근거 task: `TSK-20260421-87` (coverage-run-variance-root-cause-diagnosis @a2b9119), 근거 followup: `20260421-1401-coverage-variance-root-cause` (N=28 run 실측, `--no-file-parallelism` 경로 N=7 에서 4축 range 0.00 / exit=0 7/7 완전 수렴). (g) 서술은 FR-05 수단 중립성 (`권장`/`우선`/`기본값`/`default`/`주범`/`root cause`/`best`/`가장 효과적` 토큰 0) 및 FR-06 버전 무관성 (Vitest·MSW·Node 메이저 고정 표현 배제; API/CLI 이름 언급은 수단 언급 수준에 한정) 준수. FR-01/FR-03/FR-04/FR-05/FR-06/FR-07 본문 변경 0 — 본 증분은 FR-02 열거 1항 추가 + §참고 audit pointer 1건 + §최종 업데이트 갱신 + §관련 요구사항 라인에 REQ-20260421-043 추가 한정. §스코프 규칙 grep-baseline (c) 에 followup pointer 1 행 박제 (baseline 감사 교차참조 — NFR-02 정합: 구체 수치·CLI 리터럴·워커 수 고정 박제는 본문 §불변식 배제, §스코프 규칙/§참고 에만 허용). RULE-07 자기검증: (g) 는 "pool 병행성이 coverage 측정 결정론의 재현 가능한 결정적 변수" 라는 시스템 성질을 수단 집합 확장으로 박제 — 반복 검증 가능 (N=28 fixture), 시점 비의존, 1회성 incident patch 아님. scope 준수: `src/**`·`vite.config.js`·`package.json`·`.husky/**`·`.github/workflows/**` 변경 0 (inspector 영역 외). | 헤더, §불변식 FR-02, §스코프 규칙 (c), §변경 이력 |
| 2026-04-21 | inspector / 690aa74 (REQ-20260421-041) | 최초 등록. FR-06 택 **β 신설 경로** — `foundation/coverage-determinism.md` 독립 spec. 판단 근거: (1) 기존 `foundation/regression-gate.md` (REQ-20260421-037 done/promoted blue) 는 회귀 게이트 **존재** 축 (typecheck step + thresholds 4축 선언) 이 확립된 semantic 경계를 가지며, 본 REQ 의 2 불변식 (측정 결정론 + 수단 허용 집합) 은 **측정 품질** 축으로 직교. regression-gate.md 에 5번째 불변식 증분 시 "게이트 존재" vs "측정 품질" 의미 경계가 흐려질 우려. (2) blue 는 planner writer 영역이라 inspector 가 직접 증분 편집 불가 — blue→green 재복사 후 증분 시 큰 noise. (3) 독립 spec 은 FR-03 precondition 관계를 명시적으로 참조하는 평서문 1건만 유지하고, audit·의미 경계 유지에 유리. 현장 근거 (HEAD=690aa74, 2026-04-21 실측): `vite.config.js:82-87` thresholds 4축 선언 완료 (regression-gate FR-02 수렴) / `package.json:21` `"test": "vitest run --coverage"` / `.husky/pre-push:4` `npm test` / `.github/workflows/ci.yml` 4 step 내 `npm test` 존재 (regression-gate FR-01 수렴). followup 실측 (TSK-20260421-78 / 커밋 `6b083b7`, 동일 HEAD 3회 — Functions 93.66% → 94.45% → 94.19%, Stmts/Lines/Branches ±0.05~0.2%p 변동 — `specs/60.done/2026/04/21/followups/20260421-0730-coverage-functions-flake.md`). 재관측 (TSK-20260421-83 / 커밋 `690aa74` — coverage 런간 fluctuation 5회 실행 — Statements 97.72%, Branches 94.4~94.5%, Functions 94.45~94.72%, Lines 98.07~98.11% — `specs/10.followups/20260421-2245-coverage-run-variance.md`). 선행 done req: REQ-20260421-037 (regression-gate, 전제 조건 관계 FR-03) / REQ-20260421-035 (dep-bump-gate, `npm test` 공유 상보 관계 FR-04). 선행 state HEAD: `9734e27` (REQ-041 발행 직전 inspector HEAD, 본 seen 레저 갱신 참조). consumed: REQ-20260421-041 자체. 차기 task carve 대상 (planner 영역): FR-02 수단 집합 (a~f) 중 택1 이상 결합 적용 → FR-01 수렴 (반복 실행 0 lines diff). flake 원인 진단 task (env stub 타이밍 / MSW handler swap / async cleanup 3 가설 중 주범 식별) 은 별 task. RULE-07 자기검증: 본 spec 본문은 (a) 결정론 불변식 평서문 (FR-01), (b) 수단 허용 집합 열거 + 수단 중립성 (FR-02/FR-05), (c) precondition 관계 (FR-03), (d) 직교 축 (FR-04), (e) 버전 무관성 (FR-06), (f) 축 분리 (FR-07) 만 박제. 1회성 incident/릴리스 수리 플랜 부재 — followup 의 "Functions 94% 경계 하향 vs 커버리지 보강" 중 하나 특정 배제, 구체 shuffle seed 값·측정 reruns N·threshold 수치 조정은 Out-of-Scope. 동음이의 ("결정론" — 테스트 실행 순서 결정론 vs coverage 측정 결정론) 혼동 방지 FR-02 (a) 에서 "실행 순서 결정론화" 로 명시 + §역할 에서 "측정 결정론" 로 구분. | all (신설) |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/04/21/req/20260421-coverage-measurement-determinism-invariant.md` (REQ-20260421-041).
  - `specs/60.done/2026/04/22/req/20260422-npm-test-determinism-and-branch-threshold-re-measurement.md` (REQ-20260422-056).
  - `specs/60.done/2026/04/22/req/20260422-coverage-exclude-glob-generalization.md` (REQ-20260422-057 — 본 세션 mv).
- **소비 followup (감사 pointer)**:
  - `specs/60.done/2026/04/21/followups/20260421-0730-coverage-functions-flake.md` — TSK-20260421-78 @6b083b7 3회 Functions 변동 관측 원본 (REQ 발행 시 이미 `60.done/2026/04/21/followups/` 존재).
  - `specs/10.followups/20260421-2245-coverage-run-variance.md` — TSK-20260421-83 @690aa74 5회 fluctuation 재관측 (본 세션 시점 discovery 입력 큐, 별도 discovery 사이클에서 req 또는 close 처리 예정).
  - `specs/10.followups/20260422-1310-tsk-20260422-13-toaster-typecheck-dod-blocked-by-pre-push-drift.md` — REQ-056 트리거 followup (TSK-20260422-13 pre-push drift). 감사 경로만, 본 세션은 req 단독 소비.
  - `specs/60.done/2026/04/22/followups/20260422-0239-branch-coverage-pre-existing-drift-93-93.md` — 선행 관찰 (TSK-20260422-08 세션). REQ-056 재검증이 본 관찰의 귀인을 관측 비결정성으로 재지목.
- **선행 done / open req**:
  - `specs/60.done/2026/04/21/req/20260421-ci-typecheck-and-coverage-threshold-regression-gate.md` (REQ-20260421-037) — 회귀 게이트 존재 축. 본 spec FR-03 에서 precondition 관계 명시. `regression-gate.md` blue 승격 완료.
  - `specs/60.done/2026/04/21/req/20260421-test-isolation-shuffle-safety.md` (done) — 테스트 간 shuffle 격리. 축 분리 (격리 ≠ 수치 결정론).
  - REQ-20260421-035 (dep bump gate) — `npm test` 공유 상보 관계 (FR-04). open req 상태 참조. `@vitest/coverage-v8` 버전 bump 는 REQ-056 Out-of-Scope + 본 축 관할.
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
