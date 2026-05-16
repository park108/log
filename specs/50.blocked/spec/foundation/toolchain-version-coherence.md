# Toolchain version coherence — typescript devDep ↔ installed ↔ tsconfig 옵션 enum 상시 정합 불변식

> **위치**: `package.json` (devDependencies), `node_modules/typescript/package.json` (installed version), `tsconfig.json` (compilerOptions enum 표기), `npm ls`/`npm run typecheck` (검출 경로).
> **관련 요구사항**: REQ-20260517-061
> **최종 업데이트**: 2026-05-17 (by inspector, REQ-061 흡수 — toolchain version coherence 신규 등록)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-061 초기 HEAD=`7477189`).

## 역할
`package.json` devDep 으로 선언된 `typescript` semver range, `node_modules/typescript/package.json` 에 실제 설치된 메이저, `tsconfig.json` 의 옵션 enum 표기 (`moduleResolution`, `resolveJsonModule`, `types`) 가 **동시에 정합** 해야 한다. 정합이 깨지면 `npm run typecheck` 가 preprocessing 단계 (TS6046/TS5070/TS2688) 에서 rc≠0 으로 실패하여 모든 typecheck/island/coverage 기반 게이트가 측정 불능에 빠진다. 본 spec 은 이 상태를 **반복 검증 가능한 상시 불변식** 으로 박제한다. 의도적으로 하지 않는 것: 특정 메이저로의 업/다운그레이드 자체 (수단 중립), 영향받는 blocked spec (`coverage-determinism`, `src-typescript-migration`, `tsconfig-test-ambient-globals`, `typecheck-exit-zero`) 의 baseline 재실측 (해소 후 inspector 책임), msw 메이저 업그레이드 자체 (별 spec 분기).

## 공개 인터페이스
- 소비 파일:
  - `package.json` — `devDependencies.typescript` semver range, `devDependencies.msw` 등 peer 의존.
  - `node_modules/typescript/package.json` — install 산출물의 `version`.
  - `tsconfig.json` — `compilerOptions.moduleResolution`, `compilerOptions.resolveJsonModule`, `compilerOptions.types`.
- 검출 명령 (반복 가능):
  - `npx tsc --version` — installed 메이저 확인.
  - `npm ls typescript` — peer 충돌 (`invalid: ... from <pkg>`) 검출.
  - `npm run typecheck` (= `tsc --noEmit`) — preprocessing error 카테고리 (TS6046/TS5070/TS2688) 검출.

## 동작

### 1. devDep ↔ installed 메이저 정합 불변식 (REQ-061 FR-01)
`package.json` 의 `devDependencies.typescript` semver range 와 `node_modules/typescript/package.json` 의 `version` 은 **동일 메이저** 에 속한다. 격차가 발생하면 `npm install` 또는 `npm ci` 단계에서 검출 가능한 상태 (peer 충돌 또는 install warning) 가 유지된다. 본 불변식의 결과:

- (1.1) `npx tsc --version` 출력 메이저 = `devDependencies.typescript` semver range 의 메이저 하한 (또는 캐럿 ^ 의 메이저 baseline).
- (1.2) `npm ls typescript` 출력의 root project 라인 메이저가 installed 트리 메이저와 일치 — `invalid: "<range>" from the root project` 패턴 0 hit.
- (1.3) lockfile (`package-lock.json`) 의 `node_modules/typescript` 엔트리 `version` 이 devDep range 와 동일 메이저.

### 2. tsconfig 옵션 enum ↔ installed 메이저 호환 불변식 (REQ-061 FR-02)
`tsconfig.json` 의 `compilerOptions.moduleResolution` 값은 installed typescript 메이저의 허용 enum 에 속한다. TS≤4.x 는 `node`/`classic` 만, TS5+ 는 추가로 `bundler`/`node16`/`nodenext` 를 허용한다. 본 불변식의 결과:

- (2.1) installed TS 메이저 변경 시 `moduleResolution` 값을 동일 PR/커밋 범위에서 점검하여 enum 호환을 유지한다.
- (2.2) `compilerOptions.resolveJsonModule: true` 는 module resolution strategy 가 `node` 계열일 때만 유효 — TS≤4.x 에서 `Bundler` 값을 채택할 경우 TS5070 ("Option '--resolveJsonModule' cannot be specified without 'node' module resolution strategy") 트리거. 본 종속성은 `moduleResolution` ↔ installed 메이저 호환의 부수 효과로 자동 충족된다.
- (2.3) `compilerOptions.types` 배열의 각 식별자 (`vitest/globals`, `node` 등) 는 installed 메이저에서 type lib 가 해석 가능한 상태 — TS2688 ("Cannot find type definition file for '<name>'") 0 hit.

### 3. typecheck preprocessing error 카테고리 0 hit 불변식 (REQ-061 FR-03)
`npm run typecheck` (= `tsc --noEmit`) 의 출력에서 **preprocessing 카테고리** (TS6046 invalid option / TS5070 option dependency / TS2688 type lib not found) error 가 0 hit 이다. src-level 진단 (TS2304 등) 은 본 불변식과 별도 게이트로 측정 가능하다. 본 불변식의 결과:

- (3.1) `npm run typecheck 2>&1 | grep -cE "TS6046|TS5070|TS2688"` → 0.
- (3.2) preprocessing error 0 상태에서 typecheck rc 가 0 이거나, 비-0 이라도 그 사유는 **src-level 진단** 으로만 설명 가능. rc≠0 이 preprocessing 으로 귀속되는 상태는 불변식 위반.
- (3.3) 본 불변식은 §동작 1·2 정합의 **결과** — devDep ↔ installed 메이저 동일 + tsconfig 옵션 enum 호환이면 preprocessing 카테고리는 자연 0 hit 으로 수렴.

### 4. peer 의존 typescript peerRange 호환 불변식 (REQ-061 FR-04)
`msw` 등 typescript 를 peerDependency 로 선언하는 패키지의 peerRange 가 devDep 선언과 양립한다. `npm ls typescript` 출력의 `invalid: ... from node_modules/<pkg>` 라인은 0 hit 이다. 본 불변식의 결과:

- (4.1) peer 다운그레이드 강제 (예: msw@0.47.4 가 `>= 4.2.x <= 4.8.x` peer 로 강제) 가 발생하지 않는다. devDep `msw` 선언 (`^2.13.4`) 과 `node_modules/msw` 실제 메이저가 동일하여 peer 의존 트리가 single major 로 수렴.
- (4.2) `npm ls typescript --json | jq '.. | select(.invalid? == true)'` 출력 노드 0 — install 시점 peer 충돌 검출 가능.

### 5. lockfile 무결성 ↔ 정합 재현 불변식 (REQ-061 FR-05)
`npm install` 또는 `npm ci` 가 lockfile (`package-lock.json`) 무결성을 유지한 채 §동작 1~4 정합을 재현한다. lockfile 박제 시점에 메이저 격차가 있다면 install 단계에서 검출되는 상태가 유지된다.

- (5.1) `npm ci` rc=0 + lockfile 변경 0 (`git status package-lock.json` clean).
- (5.2) lockfile 의 `node_modules/typescript` 엔트리가 devDep range 와 동일 메이저 — 격차 박제 금지.

### 회귀 중점
- `package.json` devDep `typescript` 의 semver range 와 `node_modules/typescript/package.json` 의 `version` 메이저가 격차로 박제될 경우 § 동작 1 위반 → § 동작 3 preprocessing error 카테고리 1+ hit 으로 자연 회귀.
- `tsconfig.json` 의 `moduleResolution` 값이 installed 메이저 enum 밖 (예: TS4.x 환경에서 `Bundler`) 으로 박제될 경우 TS6046 트리거 — § 동작 2.1 위반.
- `compilerOptions.resolveJsonModule: true` + `moduleResolution` 이 `node` 계열 아닐 때 TS5070 트리거 — § 동작 2.2 위반.
- `compilerOptions.types` 배열의 식별자가 installed 메이저에서 type lib 해석 불가일 때 TS2688 트리거 — § 동작 2.3 위반.
- `msw` 등 peer 의존이 devDep typescript range 와 충돌하는 메이저를 강제할 때 `npm ls typescript invalid:` 라인 1+ — § 동작 4 위반.
- lockfile 박제 시점에 메이저 격차가 잔존하면 `npm ci` 가 정합 재현 불능 — § 동작 5 위반.

## 의존성
- 외부: `typescript` (devDep), `msw` (peer 의존 예), `npm`/`npm ls`/`tsc`.
- 내부: `package.json`, `node_modules/typescript/package.json`, `tsconfig.json`, `package-lock.json`.
- 역의존: `npm run typecheck` 를 게이트로 박제하는 모든 spec — `husky-pre-push-typecheck` (FR-07), `coverage-determinism`, `src-typescript-migration`, `tsconfig-test-ambient-globals`, `typecheck-exit-zero`, `island-regression-guard` (간접).

## 스코프 규칙
- **expansion**: N/A (본 spec 은 task 발행이 아니라 불변식 박제 — grep 게이트는 baseline 실측 박제 목적).
- **grep-baseline** (REQ-061 발행 시점, HEAD=`7477189` 실측):
  - (a) `grep -nE "\"typescript\"" package.json` → 1 hit (`package.json:59` → `"typescript": "^6.0.3"`). devDep semver range 박제.
  - (b) `grep -nE "\"msw\"" package.json` → 1 hit (`package.json:58` → `"msw": "^2.13.4"`). peer 의존 devDep 선언 박제.
  - (c) `grep -nE "\"version\"" node_modules/typescript/package.json | head -1` → `"version": "4.9.3"`. installed 메이저 박제 — devDep range 의 메이저 baseline `6` 과 격차 2 메이저 (§동작 1 위반 baseline 상태).
  - (d) `grep -nE "moduleResolution|resolveJsonModule|\"types\"" tsconfig.json` → 3 hits (`tsconfig.json:6` `moduleResolution: "Bundler"`, `:15` `resolveJsonModule: true`, `:18` `types: ["vitest/globals", "node"]`). §동작 2 enum 표기 박제 — `Bundler` 는 TS5+ enum 이므로 installed 4.9.3 에서 TS6046 트리거 baseline.
  - (e) `npm run typecheck 2>&1 | grep -cE "TS6046|TS5070|TS2688"` → 3 hits (TS6046 × 1 @tsconfig.json:6, TS5070 × 1 @tsconfig.json:15, TS2688 × 1 vitest/globals lib 해석 실패). §동작 3 preprocessing error 카테고리 baseline — § 동작 3.1 목표 0 hit 미달 상태.
  - (f) `npm ls typescript 2>&1 | grep -cE "invalid:"` → baseline 1+ hit (`invalid: "^6.0.3" from the root project, ">= 4.2.x <= 4.8.x" from node_modules/msw`). §동작 4 peer 충돌 검출 baseline.

- **rationale**: gate (a)(b)(d) 는 devDep / peer / tsconfig 옵션 선언의 현재 박제값 (semver / enum 표기) — 시점 비의존 인터페이스. gate (c) 는 installed 메이저 baseline — `7477189` 시점에서 devDep range 의 메이저와 격차로 § 동작 1 위반 baseline. gate (e)(f) 는 § 동작 3·4 의 위반 baseline 수치로, 본 spec 박제 후 해소 task 가 발행될 때 0 hit 으로 수렴해야 함. 본 spec 은 불변식 박제만 수행하고 해소 수단 (devDep 다운그레이드 vs installed 업그레이드 vs lockfile 재정합) 은 task 계층 결정 (수단 중립).

## 테스트 현황
- [ ] § 동작 1.1 `npx tsc --version` 출력 메이저 = devDep range 메이저 baseline 동일.
- [ ] § 동작 1.2 `npm ls typescript` `invalid: ... from the root project` 0 hit.
- [ ] § 동작 1.3 `package-lock.json` 의 `node_modules/typescript` 엔트리 메이저 = devDep range 메이저.
- [ ] § 동작 2.1 installed TS 메이저에서 `moduleResolution` 값이 허용 enum 에 속함.
- [ ] § 동작 2.2 `resolveJsonModule: true` ↔ `moduleResolution` 값 호환 — TS5070 0 hit.
- [ ] § 동작 2.3 `types` 배열 식별자 전원 해석 가능 — TS2688 0 hit.
- [ ] § 동작 3.1 `npm run typecheck 2>&1 | grep -cE "TS6046|TS5070|TS2688"` → 0.
- [ ] § 동작 3.2 preprocessing error 0 상태에서 typecheck rc 가 0 또는 src-level 사유로만 비-0.
- [ ] § 동작 4.1 peer 다운그레이드 강제 0 — devDep msw 메이저 = installed msw 메이저.
- [ ] § 동작 4.2 `npm ls typescript --json` 의 `invalid: true` 노드 0.
- [ ] § 동작 5.1 `npm ci` rc=0 + `package-lock.json` clean.
- [ ] § 동작 5.2 lockfile `node_modules/typescript` 엔트리 메이저 = devDep range 메이저.

## 수용 기준
- [ ] (Must, FR-01) `package.json` devDep `typescript` semver range 의 메이저 = `node_modules/typescript/package.json` `version` 메이저 (격차 0).
- [ ] (Must, FR-02) `tsconfig.json` `compilerOptions.moduleResolution` 값이 installed TS 메이저 허용 enum 에 속함 (TS≤4.x: `node`/`classic` / TS5+: 추가로 `bundler`/`node16`/`nodenext`).
- [ ] (Must, FR-03) `npm run typecheck` 의 preprocessing 카테고리 (TS6046 / TS5070 / TS2688) error 0 hit.
- [ ] (Should, FR-04) `npm ls typescript` 의 `invalid: ... from <pkg>` 라인 0 hit (peer 충돌 검출 가능).
- [ ] (Should, FR-05) `npm ci` rc=0 + lockfile 무결성 유지 (`git status package-lock.json` clean) + lockfile typescript 엔트리 메이저 = devDep range 메이저.
- [ ] (NFR-01) preprocessing error 0 hit 상태가 PR/푸시 게이트 (husky pre-push 또는 CI) 에서 검출 가능 — `husky-pre-push-typecheck` FR-07 또는 `.github/workflows/ci.yml` `npm run typecheck` 단계.
- [ ] (NFR-02) 정합 위반 시 단일 명령 (`npm run typecheck` 또는 `npm ls typescript`) 출력으로 위반 카테고리 식별 가능.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-061). toolchain version coherence — typescript devDep ↔ installed major ↔ tsconfig 옵션 enum 상시 정합 불변식 박제 (§동작 1~5). baseline 실측 @HEAD=`7477189`: (a) `package.json:59` `typescript: ^6.0.3` / (b) `package.json:58` `msw: ^2.13.4` / (c) `node_modules/typescript@4.9.3` 메이저 격차 2 / (d) `tsconfig.json:6,15,18` `moduleResolution: Bundler`, `resolveJsonModule: true`, `types: ["vitest/globals", "node"]` / (e) `npm run typecheck` preprocessing 카테고리 3 hit (TS6046+TS5070+TS2688) / (f) `npm ls typescript` `invalid:` 1+ hit (msw peer). 영향 spec (역의존): `husky-pre-push-typecheck` (FR-07 의존), `coverage-determinism` (blocked), `src-typescript-migration` (blocked), `tsconfig-test-ambient-globals` (blocked), `typecheck-exit-zero` (blocked→followups 승격), `island-regression-guard` (간접 의존). consumed req: `specs/20.req/20260517-toolchain-version-coherence.md` → `specs/60.done/2026/05/17/req/` mv. consumed followups (3건, 본 req 의 §배경 명시 root cause): `specs/10.followups/20260516-2154-coverage-determinism-from-blocked.md`, `specs/10.followups/20260516-2154-src-typescript-migration-from-blocked.md`, `specs/10.followups/20260516-2154-tsconfig-test-ambient-globals-from-blocked.md` (본 세션은 req 단독 소비 — followup 은 discovery 가 본 req 로 통합 발행한 근거이므로 별도 mv 0). 수단 중립 정책: devDep 다운그레이드 (4.9.x lock) 또는 installed 업그레이드 (6.x install) 또는 lockfile 재정합 모두 허용 — § 동작 1~5 동시 성립이 본 spec 의 박제 대상. RULE-07 자기검증 — § 동작 1~5 모두 평서형·반복 검증 가능 (`grep`·`npm ls`·`npm run typecheck`·`npm ci` 재현)·시점 비의존 (특정 릴리스 귀속 부재 — installed 메이저 변경 시 § 동작 2.1 트리거가 자동 적용)·incident patch 아님 (toolchain 정합은 환경 자체 성질, 특정 4.9.3 ↔ ^6.0.3 격차는 baseline 박제 목적이며 본 불변식은 임의 메이저 쌍에 적용)·수단 중립 (해소 수단 task 계층 결정). RULE-06 § 스코프 규칙 gate (a)~(f) 6건 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/toolchain-version-coherence.md`) 신규 create + `20.req/* → 60.done/req/` mv. RULE-02 단일 커밋. | 전 섹션 (신규) |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/05/17/req/20260517-toolchain-version-coherence.md` (REQ-061 — 본 세션 mv).
- **Consumed followups (req 통합 근거, mv 0)**:
  - `specs/10.followups/20260516-2154-coverage-determinism-from-blocked.md` (source: blocked coverage-determinism / typescript 환경 회귀 root cause).
  - `specs/10.followups/20260516-2154-src-typescript-migration-from-blocked.md` (source: blocked src-typescript-migration / 동 root cause).
  - `specs/10.followups/20260516-2154-tsconfig-test-ambient-globals-from-blocked.md` (source: blocked tsconfig-test-ambient-globals / 동 root cause).
- **관련 spec (역의존)**:
  - `specs/30.spec/green/foundation/husky-pre-push-typecheck.md` (FR-07 typecheck-exit-zero FR-01 수렴 후 task 발행 — 본 spec 정합 후 해소 가능).
  - `specs/30.spec/green/foundation/island-regression-guard.md` (간접 의존 — TS 환경 회복 후 src-typescript-migration 진행 가능).
  - `specs/50.blocked/spec/foundation/coverage-determinism.md` (typescript 환경 회귀 격리).
  - `specs/50.blocked/spec/foundation/src-typescript-migration.md` (동 격리).
  - `specs/50.blocked/spec/foundation/tsconfig-test-ambient-globals.md` (동 격리).
- **선행 done req**:
  - `specs/60.done/2026/04/20/req/20260420-typescript-foundation-bootstrap.md` (TS 도입 baseline).
  - `specs/60.done/2026/04/20/req/20260420-typescript-tooling-completion.md` (ESLint/tooling baseline).
- **외부 레퍼런스**:
  - TypeScript 공식 — `--moduleResolution` enum 표 (TS 4.x vs TS 5.x): `https://www.typescriptlang.org/tsconfig#moduleResolution`.
  - npm 공식 — `npm ls` peer 충돌 검출: `https://docs.npmjs.com/cli/v10/commands/npm-ls`.
- **RULE 준수**:
  - RULE-07: 5개 불변식 (§동작 1~5) 모두 시점 비의존·평서형·반복 검증 가능 (`grep`·`npm ls`·`npm run typecheck`·`npm ci` 재현).
  - RULE-06: grep-baseline 6개 gate (a)~(f) 실측 수치 박제 @HEAD=`7477189`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/toolchain-version-coherence.md` 신규 create + req mv).
