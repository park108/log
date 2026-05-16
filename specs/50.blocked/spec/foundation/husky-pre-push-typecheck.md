# husky pre-push 훅 typecheck 보조 게이트 효능 불변식

> **위치**: `.husky/pre-push` 훅 본문 + `package.json:24` `"typecheck": "tsc --noEmit"` 스크립트. 게이트 효능은 push 단계 hook 종료 코드.
> **관련 요구사항**: REQ-20260517-060
> **최종 업데이트**: 2026-05-17 (inspector 신규 등록 · REQ-060 흡수)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. baseline 수치는 HEAD 스냅샷 (§참고 재현 가능).

## 역할
로컬 push 시점 (`git push`) 에 `.husky/pre-push` 훅이 typecheck 효능 명령을 호출하여 typecheck rc ≠ 0 시 push 단계를 차단한다는 **early signal 보조 게이트 효능 불변식** 을 박제. `foundation/typecheck-exit-zero` (REQ-20260422-054) FR-01 의 master HEAD rc=0 + 0 hit 불변식은 final guard 로 CI workflow typecheck step (`foundation/regression-gate` FR-01) 이 담당하며, 본 spec 은 그 final guard 보다 시점적으로 앞선 **early signal** 차원으로 보강한다. 의도적으로 하지 않는 것: (a) `.husky/pre-commit` 편입 (lint-staged 가 staged 파일 lint 만 담당하는 현 구조 유지 — pre-commit 시점에 full repo typecheck 는 부하 과대; lint-staged 가 typecheck 호출하는 경로는 별 축), (b) hook bypass (`--no-verify`) 정책 박제 — git/husky 자체 옵션이며 운영자 축, (c) CI workflow typecheck step 자체 (`foundation/regression-gate` FR-01 관할), (d) typecheck 결과 수렴 (`foundation/typecheck-exit-zero` FR-01 관할), (e) typecheck 시간 최적화 / 캐시 (`tsc --incremental` 등 별 축), (f) typecheck 호출 위치 (npm test 전 vs 후) / 실행 방식 (`&&` 직렬 vs `;` vs wrapper script) — FR-06 수단 중립성.

## 공개 인터페이스
본 spec 은 단일 모듈 인터페이스가 아닌 **저장소 축 불변식** 이다. 외부 관찰 계약:
- **정적 관찰 (호출 박제)**: `grep -nE "typecheck|tsc\s+--noEmit" .husky/pre-push` → 1+ hit.
- **정적 관찰 (기존 효능 보존)**: `grep -nE "npm test" .husky/pre-push` → 1+ hit 유지.
- **동적 관찰 (차단 효능)**: 임의 type 오류 도입 commit 의 `git push --dry-run` 또는 동등 시뮬레이션에서 훅 종료 코드 ≠ 0.
- **동적 관찰 (false-positive 부재)**: master HEAD 가 `typecheck-exit-zero` FR-01 충족 상태에서 동일 시뮬레이션 종료 코드 0.

## 동작

### FR-01: pre-push 훅 typecheck 호출 박제 (Must)
`.husky/pre-push` 훅 실행 중 `npm run typecheck` 또는 그와 의미상 동등한 명령 (`tsc --noEmit`) 이 호출되어야 한다. 측정: `grep -nE "typecheck|tsc\s+--noEmit" .husky/pre-push` → 1+ hit. 본 호출은 push 단계 hook 의 일부로 실행되어 hook 자체 종료 코드 전파 경로에 편입된다.

### FR-02: typecheck rc ≠ 0 push 차단 효능 (Must)
typecheck 호출 결과 종료 코드 ≠ 0 시 push 단계가 차단되어야 한다 — 훅 종료 코드 ≠ 0 전파 (`git push` 명령 자체 종료 코드 ≠ 0). 측정: 임의 type 오류 도입 commit (예: 임시 파일에 `const x: number = "str";`) staged + commit 후 `git push --dry-run` (또는 로컬 clone 으로 시뮬레이션 push) 시 훅 단계에서 종료 코드 ≠ 0 종결.

### FR-03: typecheck rc = 0 false-positive 부재 (Must)
typecheck 결과 종료 코드 0 시 push 단계가 통과해야 한다 — false-positive 없음. 측정: master HEAD 가 `typecheck-exit-zero` FR-01 충족 상태 (rc=0 + `error TS` 0 hit) 에서 `git push --dry-run` 훅 단계 종료 코드 0.

### FR-04: final guard 보조 관계 (Must)
본 효능은 `foundation/typecheck-exit-zero` FR-01 의 master HEAD rc=0 불변식과 **보조 (early signal)** 관계이며 **final guard 가 아님**. 근거: (i) hook bypass (`--no-verify`) 가능 — 운영자가 의도적 우회 시 hook 효능 0, (ii) 로컬에서만 작동 — fork 외부 contributor 의 push 는 본 hook 미작동 (origin 측 hook 부재), (iii) hook 미설치 환경 (clone 직후 `npm install` 전, husky `prepare` 미실행 상태) 에서도 미작동. 따라서 master HEAD rc=0 의 **final guard 는 CI workflow typecheck step (`foundation/regression-gate` FR-01)** 이며 본 spec 은 그 final guard 보다 시점적으로 앞선 **early signal 보조 게이트** 차원 박제. 본 강도 분리 평서문은 본 spec 본문에 명시되어야 한다 — final guard 오인 방지.

### FR-05: 기존 `npm test` 호출 효능 보존 (Should)
pre-push 훅의 typecheck 호출은 기존 `npm test` 호출 (`.husky/pre-push:4` 현재 명령) 의 **추가** 이며 대체 아니다 — `npm test` 회귀 보호 효능 (vitest 실행 + coverage threshold 게이트) 은 보존된다. 측정: `grep -nE "npm test" .husky/pre-push` → 1+ hit (기존 유지) + `grep -nE "typecheck|tsc\s+--noEmit" .husky/pre-push` → 1+ hit (신규). 두 호출의 직렬 결합 방식 (`&&` vs `;` vs wrapper script) 은 FR-06 수단 중립성 박제 대상 아님.

### FR-06: 수단 중립성 (Must)
본 spec · 파생 task · 파생 PR · 커밋 메시지에서 typecheck 호출 위치 (`npm test` 전 vs 후) · 실행 방식 (`&&` 직렬 vs `;` 무조건 실행 vs 별도 wrapper script) · 명령 형태 (`npm run typecheck` vs `npx tsc --noEmit` vs `node_modules/.bin/tsc --noEmit`) · 결합 방식에 "기본값" / "권장" / "우선" / "default" / "best" / "먼저" / "순서" 류 라벨을 부여하지 않는다 (`foundation/typecheck-exit-zero` FR-04 · `foundation/island-regression-guard` FR-05 동일 원리). 본 spec 은 **결과 효능 (호출 박제 + rc 전파)** 만 박제한다.

### FR-07: typecheck 미수렴 시점 발행 차단 (Must)
본 spec 의 파생 task 발행 (실제 `.husky/pre-push` 편집 작업지시서 발행) 은 `foundation/typecheck-exit-zero` FR-01 수렴 완료 (`npm run typecheck` rc = 0 + `grep -cE "error TS"` 0 hit) 후에만 가능하다. 근거: typecheck rc ≠ 0 상태에서 본 효능 도입 시 모든 push 가 즉시 차단되어 개발 자체 불능 (false-block 전체 차단) — `typecheck-exit-zero` FR-01 수렴이 본 게이트 도입의 전제 조건. 본 의존 관계는 spec 박제 시점 (현재 — typecheck rc=2 잔존 환경 회귀) 과 task 발행 시점의 분리를 명시한다 — spec 은 박제 가능 (불변식 자체는 시점 비의존), task 는 전제 미충족.

### 회귀 중점
- pre-push 훅이 typecheck 미호출 상태에서 strict 타입 회귀 도입 commit push 시 CI workflow 도달 후에만 검출 → master red. 본 spec 효능 도입 후 push 단계 차단으로 master red 도달 빈도 감소.
- `typecheck-exit-zero` FR-01 미수렴 (rc ≠ 0) 상태에서 본 게이트 도입 시 모든 push 차단 → 개발 불능. FR-07 의존 관계 위반.
- hook 미설치 환경 (clone 직후) 또는 hook bypass (`--no-verify`) 시 본 효능 0 — FR-04 보조 관계 명시.
- typecheck 명령 변경 (`tsc --noEmit` → `tsc -b` 등) 시 호출 박제 grep 패턴 유지 검증 — FR-01 게이트 grep regex `typecheck|tsc\s+--noEmit` 는 두 형태 모두 매치.

## 의존성
- 내부 (전제 계약):
  - `specs/30.spec/green/foundation/typecheck-exit-zero.md` (REQ-20260422-054) §동작 FR-01 — master HEAD `npm run typecheck` rc=0 + 0 hit. 본 spec FR-03 false-positive 부재 + FR-07 task 발행 전제.
  - `specs/30.spec/green/foundation/typecheck-exit-zero.md` §동작 FR-06 (d) — "pre-commit / pre-push 훅 편입을 의도적으로 하지 않는다". 본 spec 이 out-of-scope 축으로 분리 보강 — 본 spec 박제 후 `typecheck-exit-zero` FR-06 (d) 평서문은 unchanged (참조 관계 유지).
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) FR-01 — CI workflow typecheck step 존재 계약. 본 spec FR-04 final guard 관계.
  - `specs/30.spec/blue/foundation/regression-gate.md` §참고 baseline line 89-90 — `.husky/pre-push:4` `npm test` 단일 명령 (typecheck 미연동) 관찰만 박제. 본 spec 이 그 관찰을 효능 박제로 승격.
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028) — lint-staged glob `src/**/*.{js,jsx,ts,tsx,d.ts}` (pre-commit 축). 본 spec 과 직교 (lint-staged 는 staged 파일 lint 축 / 본 spec 은 pre-push typecheck 보조 축).
- 외부:
  - husky (`.husky/pre-push` 훅 — push 단계 hook 종료 코드 ≠ 0 시 push 차단).
  - git (`git push --no-verify` 로 hook 우회 가능 — FR-04 보조 관계 근거).
  - TypeScript (`tsc --noEmit` — 타입 검사만 수행).
- 역의존 (본 spec 을 전제로 하는 축):
  - `foundation/typecheck-exit-zero` FR-01 의 final guard (`foundation/regression-gate` FR-01 CI step) 보조 차원으로 본 spec 효능 fire — master red 도달 빈도 감소.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 결과 효능 평서형 불변식 박제 + baseline 수치 박제 문서이며, grep 게이트 계약 문서가 아님).
- **grep-baseline** (inspector 세션 시점 HEAD=`a1755b5` 실측):

  (a) FR-01 측 positive (목표) — `grep -nE "typecheck|tsc\s+--noEmit" .husky/pre-push` → **목표 1+ hit**. 현 시점: **0 hit** (`.husky/pre-push:4` 단일 명령 `npm test`).
  (b) FR-05 측 기존 효능 보존 — `grep -nE "npm test" .husky/pre-push` → **1 hit** @`.husky/pre-push:4` (현 baseline · 효능 도입 후 유지 요구).
  (c) typecheck 스크립트 현장 근거 — `grep -nE '"typecheck":\s*"tsc' package.json` → **1 hit** @`package.json:24` `"typecheck": "tsc --noEmit"` (FR-01 호출 대상 스크립트 존재).
  (d) final guard 현장 근거 — `grep -nE "typecheck" .github/workflows/ci.yml` → **1 hit** @`.github/workflows/ci.yml:31` `run: npm run typecheck` (`foundation/regression-gate` FR-01 박제 · 본 spec FR-04 final guard 관계).
  (e) husky 환경 현장 근거 — `grep -nE '"husky":\s*"\^' package.json` → **1 hit** (`package.json:46` `"husky": "^9.0.0"` devDep) + `grep -nE '"prepare":\s*"husky"' package.json` → **1 hit** (`package.json:35` husky v9+ 신규 install 경로).
  (f) `typecheck-exit-zero` FR-01 전제 baseline (FR-07 의존) — `npm run typecheck; echo $?` → **rc=2 잔존** (HEAD=`a1755b5` 실측 — TS2688 vitest/globals + TS6046 moduleResolution + TS5070 resolveJsonModule 3 hit / `src/**` 0 hit). 본 spec FR-07 의존 관계 — task 발행은 rc=0 수렴 후.

- **rationale**: gate (a) 는 본 spec FR-01 의 **목표값** (호출 박제) · 현 시점 미수렴. gate (b) 는 FR-05 기존 효능 보존 baseline. gate (c)(d) 는 호출 대상 스크립트 + final guard 의 현장 근거 — 본 spec 효능 도입 시 호출 명령은 (c) 의 스크립트, final guard 는 (d) 의 step. gate (e) 는 husky 환경 현장 근거 — 본 효능 도입은 husky 환경에 의존. gate (f) 는 FR-07 의존 관계의 현 시점 미충족 baseline — task 발행 전제 미달.

## 테스트 현황
- [ ] (Must, FR-01) `grep -nE "typecheck|tsc\s+--noEmit" .husky/pre-push` → 1+ hit (현 baseline 0 hit). 호출 박제 후 task 수렴 시 ack.
- [ ] (Must, FR-02) 임시 type 오류 도입 commit + `git push --dry-run` (또는 로컬 clone 시뮬레이션) → 훅 단계 종료 코드 ≠ 0. 게이트 활성화 후 game-day 재현 픽스처 task 검증.
- [ ] (Must, FR-03) `typecheck-exit-zero` FR-01 충족 master HEAD 에서 `git push --dry-run` → 훅 단계 종료 코드 0 (false-positive 0).
- [ ] (Must, FR-04) 본 spec 본문에 final guard 보조 관계 평서문 명시 — "본 효능은 보조 (early signal) 이며 final guard 는 CI workflow typecheck step". 박제 완료 (§동작 FR-04 line).
- [ ] (Should, FR-05) `grep -nE "npm test" .husky/pre-push` → 1+ hit 유지 (게이트 활성화 후 기존 효능 보존 검증).
- [ ] (Must, FR-06) `grep -rnE "기본값|권장|우선|default|best|먼저|순서" specs/30.spec/green/foundation/husky-pre-push-typecheck.md specs/40.task/**/*husky-pre-push* specs/60.done/**/*husky-pre-push*` → 예시/참고/인용 제외 0 hit.
- [ ] (Must, FR-07) 파생 task 발행 시점 `npm run typecheck; echo $?` → 0 + `grep -cE "error TS"` → 0 (`typecheck-exit-zero` FR-01 수렴 검증 — 현 baseline 미충족 rc=2 / 3 hit).

## 수용 기준
- [ ] (Must, FR-01) 본 spec §동작 FR-01 에 호출 박제 평서문 + 측정 명령 (`grep -nE "typecheck|tsc\s+--noEmit" .husky/pre-push`) + 목표 1+ hit 박제 — 박제 완료 (현 본문).
- [ ] (Must, FR-02) 본 spec §동작 FR-02 에 차단 효능 평서문 박제 + 측정 시뮬레이션 박제 — 박제 완료 (현 본문).
- [ ] (Must, FR-03) 본 spec §동작 FR-03 에 false-positive 부재 평서문 박제 + master HEAD 충족 상태 측정 박제 — 박제 완료 (현 본문).
- [ ] (Must, FR-04) 본 spec §동작 FR-04 에 final guard 보조 관계 평서문 + 3 근거 (i)(ii)(iii) 박제 — 박제 완료 (현 본문).
- [ ] (Should, FR-05) 본 spec §동작 FR-05 에 기존 효능 보존 평서문 + 두 grep 측정 박제 — 박제 완료 (현 본문).
- [ ] (Must, FR-06) 본 spec · 파생 task · 파생 PR 에서 호출 위치/순서/방식 라벨 박제 0 건.
- [ ] (Must, FR-07) 본 spec §동작 FR-07 에 의존 관계 (typecheck rc=0 수렴 후 task 발행) 평서문 박제 + 현 시점 미충족 baseline 박제 — 박제 완료 (현 본문 + §스코프 규칙 (f)).
- [x] (NFR-01) hook 실행 시간 — 본 spec 은 wall-clock 시간 강제 임계값 박제 0 (운영자 baseline 만 — `< 30s on M1 dev` 등 수치는 NFR baseline 권고이며 강제 게이트 아님). FR-06 수단 중립성 정합 — 측정 시간 최적화는 별 축 (`tsc --incremental` 등).
- [x] (NFR-02) 회귀 보호 효능 강도 — 본 효능 도입 전/후 master HEAD `error TS` > 0 hit commit 수 비교는 운영자 감사 축. 본 spec 박제 대상 아님.
- [x] (NFR-03) 시점 비의존 — 본 spec 은 husky/Node/TypeScript 버전 무관 평서형 박제. `husky@^9.0.0` (`package.json:46`) 특정 버전 인용은 §참고 현장 근거 한정 — §동작 FR-01~07 본문 버전 고정 표현 0.
- [x] (NFR-04) RULE-07 정합 — 결과 효능 (호출 박제 + rc 전파) 만 박제. 1회성 진단·release patch 배제. 수단 박제 0.
- [x] (NFR-05) 추적성 — `grep -rn "REQ-20260517-060" specs/30.spec/green/foundation/husky-pre-push-typecheck.md` → 2+ hit + consumed req 경로 1 hit (`specs/60.done/2026/05/17/req/20260517-husky-pre-push-typecheck-coverage.md`).
- [x] (NFR-06) baseline 재현 — 동일 HEAD (`a1755b5`) 에서 §스코프 규칙 gate (a)~(f) 실측 수치 재현 가능 — git tree immutable.
- [x] (NFR-07) 범위 제한 — inspector 세션 diff = `specs/30.spec/green/foundation/husky-pre-push-typecheck.md` 신설 + `20.req → 60.done/req` mv. `.husky/**`, `package.json`, `tsconfig.json`, `.github/workflows/**`, `src/**` 변경 0.
- [x] (NFR-08) 차원 분리 — `foundation/regression-gate` (CI workflow step 존재 — final guard) / `foundation/typecheck-exit-zero` (master HEAD rc=0 효능) / `foundation/coverage-determinism` (측정 결정론) / `foundation/dependency-bump-gate` (dep bump 회귀 0) / `foundation/island-regression-guard` (island 재도입 차단 lint 게이트) / `foundation/tooling` (ESLint·alias·파서·coverage include) 와 축 분리 — 교집합 문장 재박제 0 (참조만).

## 참고

### baseline 스냅샷 (재현 가능 · NFR-06)
- HEAD=`a1755b5` (2026-05-17 inspector 신규 등록 시점) 실측:
  - `.husky/pre-push:4` — `npm test` 단일 명령 (`grep -nE "typecheck|tsc" .husky/pre-push` → **0 hit**).
  - `.husky/pre-commit:4` — `npx lint-staged` 단일 명령 (typecheck 미연동 · 본 spec out-of-scope).
  - `.github/workflows/ci.yml:31` — `run: npm run typecheck` step 존재 (`foundation/regression-gate` FR-01 박제 — 본 spec FR-04 final guard).
  - `package.json:24` — `"typecheck": "tsc --noEmit"` 스크립트 존재 (FR-01 호출 대상).
  - `package.json:46` — `"husky": "^9.0.0"` devDep.
  - `package.json:35` — `"prepare": "husky"` (husky v9+ 신규 install 경로).
  - `npm run typecheck` rc=**2** + `grep -cE "error TS"` **3 hit** (TS2688 vitest/globals + TS6046 moduleResolution + TS5070 resolveJsonModule — 전원 tsconfig 경로 / `src/**` 0 hit) — `typecheck-exit-zero` FR-01 미수렴 상태 (`50.blocked/spec/foundation/*_reason.md` 박제 typescript 환경 회귀 원인).
- 본 수치는 baseline 박제이며 본 spec 의 불변식 조건이 아니다. 최종 수렴 조건은 §동작 FR-01~05 의 효능 박제 + FR-07 의존 관계 (typecheck rc=0 수렴 후 task 발행).

### Consumed req (1 건, NFR-05 박제)
- `specs/60.done/2026/05/17/req/20260517-husky-pre-push-typecheck-coverage.md` — REQ-20260517-060. discovery 세션 (HEAD=`a1755b5` 실측 baseline pre-push hook typecheck 0 hit + CI workflow typecheck step 존재 → 갭 식별) 산출. inspector 흡수 경로: **신규 spec 신설 (`foundation/husky-pre-push-typecheck.md`)** (근거: §참고 "축 귀속 판단 근거").

### 관련 계약 (직교 축 — 재박제 금지 · 참조만)
- `specs/30.spec/green/foundation/typecheck-exit-zero.md` (REQ-20260422-054) — master HEAD typecheck rc=0 효능 (final guard 효력). 본 spec 은 그 final guard 보조 (early signal) 차원 — FR-04 보조 관계 명시.
- `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — CI workflow typecheck step 존재 (final guard). 본 spec 은 그 final guard 보다 시점적으로 앞선 early signal 보조 — FR-04 강도 분리.
- `specs/30.spec/blue/foundation/coverage-determinism.md` — `.husky/pre-push` `npm test` 단일 명령 hook 통과 조건 박제. 본 spec 은 typecheck 호출 **추가** (FR-05 — 기존 `npm test` 효능 보존). 두 spec 은 같은 hook 파일을 다루나 축이 다름 (coverage 측정 결정론 vs typecheck 보조 게이트).
- `specs/30.spec/blue/foundation/tooling.md` (REQ-028) — lint-staged glob (pre-commit 축). 본 spec 과 직교 — lint-staged 는 staged 파일 lint / 본 spec 은 pre-push typecheck.
- `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) — dep bump 후 3 명령 회귀 0 (lint/test/build). typecheck 명령 미포함 — 본 spec 도입 후 dep bump 게이트도 typecheck 보조 (별 req 축).
- `specs/30.spec/green/foundation/island-regression-guard.md` (REQ-20260517-059) — island 재도입 차단 lint 게이트. 본 spec 과 게이트 시점 다름 (pre-push vs lint 자체 게이트) — 두 spec 은 보강 (둘 다 early signal · final guard 보완).

### 현장 근거 (HEAD=`a1755b5`, 2026-05-17 실측)
- `.husky/pre-push:4` — `npm test` 단일 명령 (typecheck 미연동).
- `.husky/pre-commit:4` — `npx lint-staged` 단일 명령.
- `.github/workflows/ci.yml:31` — `run: npm run typecheck` (final guard).
- `package.json:24` — `"typecheck": "tsc --noEmit"`.
- `package.json:35` — `"prepare": "husky"`.
- `package.json:46` — `"husky": "^9.0.0"`.
- `tsconfig.json:8-10` — `strict: true` / `noImplicitAny: true` / `noUncheckedIndexedAccess: true`.

### 외부 근거
- husky 공식 — `.husky/pre-push` 는 push 단계 hook, 종료 코드 ≠ 0 시 push 차단. `https://typicode.github.io/husky/`.
- Git 공식 — `git push --no-verify` 로 hook 우회 가능 (FR-04 보조 관계 근거). `https://git-scm.com/docs/githooks`.
- TypeScript 공식 — `tsc --noEmit` 은 타입 검사만 수행 (REQ-054 §참고 인용).

### RULE 준수
- **RULE-07**: FR-01~07 평서형 효능 / 시점 비의존 / 반복 검증 가능 (`grep` + `git push --dry-run` rc) / incident 귀속 부재. 수단 박제 0 (호출 위치/순서/명령 형태 박제 안 함). FR-07 의 의존 관계 명시는 시점 비의존 (spec 박제 시점과 task 발행 시점 분리 평서화 — 환경 회귀 해소 후 task 발행 가능).
- **RULE-06**: 본 spec 은 baseline 수치 박제 + 평서형 불변식 문서. `## 스코프 규칙` `expansion: N/A` + 6 gate (a~f) 실측 수치 박제. 파생 task 생성 시 planner 는 `.husky/pre-push` 변경 전/후 baseline + game-day type 오류 재현 픽스처 박제 필수.
- **RULE-01**: inspector writer 영역 (`30.spec/green/**`) 만 신설 (`foundation/husky-pre-push-typecheck.md`). `20.req/*` → `60.done/2026/05/17/req/` mv.
- **RULE-02**: 단일 커밋 `spec(inspector): ...`. push 금지.

### 축 귀속 판단 근거 (REQ-060 흡수 경로)
- 후보 경로: α (`regression-gate` 회귀 게이트 cluster 5번째 불변식 증분 — hook typecheck) / β (`typecheck-exit-zero` FR-06 (d) "hook 편입 out-of-scope" 평서문 제거 + FR 신설) / γ (`coverage-determinism` `.husky/pre-push` `npm test` 호출 baseline 증분) / δ (독립 spec 신설 — `foundation/husky-pre-push-typecheck.md`).
- **채택: δ 독립 spec 신설**.
- 근거:
  1. **축 독립성**: 본 효능은 "pre-push 시점 typecheck early signal 보조 게이트" 단일 축 — `regression-gate` (CI workflow step 존재) 와 `typecheck-exit-zero` (master HEAD rc=0 효능) 두 final guard 축과 layer 다름 (hook 시점 보조 게이트). cluster 내부 박제 시 final guard vs early signal 의미 경계 흐림.
  2. **α 경로 기각**: `regression-gate` 는 CI workflow step 존재 cluster (test/build/typecheck/coverage). hook 시점 보조는 시점 (push 직전 vs CI 도달 후) 이 본질적으로 다름 — cluster 내부 박제 시 "step 존재" 의미가 "step 존재 + hook 보조" 로 변질.
  3. **β 경로 기각**: `typecheck-exit-zero` FR-06 (d) 는 "hook 편입 out-of-scope" 명시 — 본 spec 이 그 out-of-scope 축으로 신규 박제 분리. FR-06 (d) 평서문 제거 + FR 추가 시 기존 `typecheck-exit-zero` 의 의미 경계 (저장소 축 항구 불변식 vs hook 시점 보조) 흐림.
  4. **γ 경로 기각**: `coverage-determinism` 은 `.husky/pre-push` `npm test` 호출을 hook 통과 조건 = coverage threshold 통과 조건 으로 박제. 본 spec 은 typecheck 호출 **추가** — coverage 측정 결정론 축과 typecheck 보조 축은 동일 hook 파일을 다루나 의미 layer 다름. cluster 내부 박제 시 측정 결정론 vs typecheck 보조 의미 경계 흐림.
  5. **δ 경로 채택 이유**: `foundation/typecheck-exit-zero` 선례 (rc=0 효능 축 독립 spec) · `foundation/coverage-determinism` 선례 (측정 결정론 축 독립 spec) · `foundation/island-regression-guard` 선례 (island 차단 효능 축 독립 spec) 와 동일 원리. 독립 spec 으로 audit · 의미 경계 유지 · 파일명 자체가 축 이름 역할 (pre-push hook typecheck 보조).
  6. **증분 관계 박제 방식**: `typecheck-exit-zero` FR-06 (d) 평서문 unchanged (참조 관계 유지) — 본 spec 이 out-of-scope 축으로 신규 박제 분리 후에도 `typecheck-exit-zero` 본문은 "본 spec 은 hook 편입을 의도적으로 하지 않는다" 박제 유지 (의미 변경 0). 본 spec 은 그 의도적 out-of-scope 영역을 독립 spec 으로 박제.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 — REQ-20260517-060 흡수. 흡수 경로 **δ 독립 spec 신설** 채택 (근거: §참고 "축 귀속 판단 근거" — α `regression-gate` 의미 경계 흐림 우려 기각 / β `typecheck-exit-zero` FR-06 (d) out-of-scope 평서문 unchanged 유지 위한 독립 분리 / γ `coverage-determinism` 동일 hook 파일이나 의미 layer 다름 기각 / δ 채택은 `typecheck-exit-zero` · `coverage-determinism` · `island-regression-guard` 선례 정합). FR-01~04 + FR-06 + FR-07 Must + FR-05 Should 박제. baseline HEAD=`a1755b5` 실측 — `.husky/pre-push:4` `npm test` 단일 명령 (typecheck 미연동 · 0 hit) + `.github/workflows/ci.yml:31` typecheck step 존재 (final guard) + `package.json:24` typecheck 스크립트 존재 + `package.json:46` `husky@^9.0.0` devDep + `npm run typecheck` rc=2 잔존 (3 hit 모두 tsconfig 경로 — `50.blocked/spec/foundation/*_reason.md` typescript 환경 회귀 원인). FR-04 final guard 보조 관계 (CI workflow typecheck step 이 final guard) 명시 — 본 spec 은 early signal 차원. FR-07 의존 관계 (`typecheck-exit-zero` FR-01 수렴 후 task 발행) 명시 — spec 박제 가능 + task 발행 전제 미충족 분리. consumed req: `specs/20.req/20260517-husky-pre-push-typecheck-coverage.md`. RULE-07 자기검증 — 결과 효능 평서형 · 반복 검증 가능 (`grep` + `git push --dry-run` rc) · 시점 비의존 (FR-07 의존 관계는 시점 분리 평서화) · incident 귀속 부재 · 수단 라벨 박제 0. RULE-06 §스코프 규칙 `expansion: N/A` + 6 gate (a~f) 실측 수치 박제. | all (신설) |
