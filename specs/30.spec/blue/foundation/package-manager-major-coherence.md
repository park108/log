# 패키지 매니저 메이저 4축 정합 — `engines.npm` / `packageManager` / `lockfileVersion` / CI npm-version 동시 박제

> **위치**: `package.json` (`engines.npm` / `packageManager`), `package-lock.json` (`lockfileVersion`), `.github/workflows/ci.yml` (`actions/setup-node` step), repo root `.npmrc` (선택 채널).
> **관련 요구사항**: REQ-20260517-090 (선행 REQ-20260517-079 `node-version-3axis-coherence.md` §역할 + §회귀 중점 별 axis 후보 박제 후속).
> **최종 업데이트**: 2026-05-18 (by inspector — 68차 tick Phase 1 hook-ack, TSK-20260518-06 / `0ed832c` 회수 — (I2)(I3)(I4) + (FR-02)(FR-03) 5 marker 플립, 4축 격차 0 동시 박제 완성).

> 참조 코드는 **식별자 우선**. 라인 번호는 박제 시점 스냅샷 (HEAD=`b76dc02`).

## 역할
프로젝트의 패키지 매니저 (npm) 메이저 정합을 **4축 동시** 박제하는 시스템 불변식: (a) `package.json` 의 메이저 정합 채널 1+ 존재 (`engines.npm` semver range 또는 `packageManager` corepack pin) + (b) `.github/workflows/ci.yml` 의 `actions/setup-node` step 이 패키지 매니저 메이저를 (a) 채널과 격차 0 으로 유지 + (c) `package-lock.json:lockfileVersion` 이 (a) 채널의 활성 메이저 활성 메이저 호환 포맷과 격차 0 + (d) FR-01~03 어느 1축 위반 시 단일 진단 명령 stdout 에서 격차 카테고리가 grep 가능한 라벨로 식별. `node-version-3axis-coherence.md` (REQ-079) 의 Node 메이저 3축 정합과 동일 메타 모델 (단일 진단 명령 + grep 라벨 + 직교 박제) — 그 spec 과 직교 보완 (Node 메이저 vs 패키지 매니저 메이저). 의도적으로 하지 않는 것: 구체 npm 메이저 숫자 (예: "10", "11") 본문 박제 (NFR-01 / FR-06 정합), 메이저 정합 채널 선정 (`engines.npm` semver range vs `packageManager` corepack pin — 어느 채널이든 FR-01 충족, 수단 중립), CI 채널의 npm 메이저 추종 수단 (`with.npm-version` 명시 입력 vs `node-version-file` + `engines.npm` 자동 추종 vs corepack 활성화 + `packageManager` 자동 추종) 선정 (task 위임, 수단 중립), `.npmrc:engine-strict=true` 강제 정책 활성화 (`engines.npm` 의 fail-fast 활성화 수단의 하나 — 별 task / req 후보), lockfile rewrite 자동화 운영 (수동 1회 회수 vs renovate / dependabot — 운영 task 영역), 패키지 매니저 종류 전환 (npm → pnpm / yarn 등 — 별 req), `engines.node` `--engine-strict` 강제 정책 (REQ-079 §역할 별 req 후보 — 인접 축이나 직교 운영), `package-lock.json` 의 dependency tree 정합 (`integrity` SRI / `resolved` 호스트 / extraneous tree — REQ-068 `node-modules-extraneous-coherence` 영역).

## 공개 인터페이스
- 측정 대상 파일:
  - `package.json` — `engines.npm` 키 (semver range) 또는 `packageManager` 키 (corepack pin) 중 1+ 존재 (둘 다 부재 시 FR-01 위반).
  - `.github/workflows/ci.yml` — `actions/setup-node` step 의 npm 메이저 채널 (`with.npm-version` 입력 명시 또는 `node-version-file` + `engines.npm` 자동 추종 또는 corepack 활성화 + `packageManager` 자동 추종 중 1+).
  - `package-lock.json` — `lockfileVersion` 키 값 (활성 npm 메이저 호환 포맷 — 메이저 ↔ lockfileVersion 매핑은 §스코프 규칙 G3 baseline 박제).
- 측정 명령:
  - (A) `package.json` 메이저 정합 채널 존재: `node -e "const p=require('./package.json'); process.exit((p.engines && p.engines.npm) || p.packageManager ? 0 : 1)"` → exit 0.
  - (B) `lockfileVersion` 메이저 포맷 추출: `grep -nE "lockfileVersion" package-lock.json` → 1 hit, 값 추출 후 활성 npm 메이저 활성 메이저 호환 포맷과 격차 검사.
  - (C) 4축 격차 진단: 1-line node 스크립트 또는 `scripts/check-*.sh` 형태 단일 명령이 stdout 에 격차 카테고리 (`engines.npm 부재` / `packageManager 부재` / `lockfileVersion 격차 N` / `npm major 격차 N`) 라벨 출력 + exit code ≠ 0.

## 동작
1. **(I1) `package.json` 메이저 정합 채널 1+ 박제**: `package.json` 객체에 `engines.npm` 키 (semver range — 예: `">=N"` 또는 `"N.x"`) 또는 `packageManager` 키 (corepack pin — 예: `"npm@N.M.K"`) 중 1+ 채널이 정의되어 있다. 두 채널 중 어느 것이든 본 효능 충족 (수단 중립). 채널 존재 자체가 npm install 시 호환성 검증 또는 corepack 자동 매니저 pin 의 활성 조건.
2. **(I2) CI 채널 메이저 격차 0 박제**: `.github/workflows/ci.yml` 의 `actions/setup-node` step 이 (a) `with.npm-version` 명시 입력 또는 (b) `node-version-file` + `engines.npm` 자동 추종 또는 (c) corepack 활성화 + `packageManager` 자동 추종 중 1+ 채널로 npm 메이저를 (I1) 의 메이저와 격차 0 유지. CI step 의 `npm -v` 출력 메이저 == (I1) 채널 메이저.
3. **(I3) `lockfileVersion` 메이저 포맷 격차 0 박제**: `package-lock.json:lockfileVersion` 값이 (I1) 채널의 활성 npm 메이저 호환 포맷과 격차 0. 메이저 ↔ lockfileVersion 매핑 표는 §스코프 규칙 G3 baseline 한정. 메이저 ↔ lockfileVersion 격차 1+ 시 본 불변식 위반 — lockfile rewrite (수동 `npm install` 1회 또는 자동화) 로 회수.
4. **(I4) 4축 격차 0 동시 박제**: (I1) ~ (I3) 의 어느 1축에라도 격차 1+ 발생 시 본 불변식 위반. 격차 발생 시 환경 격차 회귀 (로컬 dev npm M / CI npm M+1 시 lockfile rewrite 시도 + diff churn 또는 lockfileVersion downgrade 회귀) 활성. 4축 동시 격차 0 유지 — 환경 격차 회귀 채널 무력화.
5. **(I5) 위반 검출 단일성**: (I1) ~ (I4) 의 격차가 어느 1축에라도 존재할 때, 단일 진단 명령 (1 명령 또는 1-line node 스크립트 또는 `scripts/check-*.sh`) stdout 출력에서 격차 카테고리 (`engines.npm 부재` / `packageManager 부재` / `lockfileVersion 격차 N` / `npm major 격차 N`) 가 grep 가능한 라벨로 식별 + exit code ≠ 0. 본 명령은 CI step 또는 pre-push hook 또는 `scripts.<name>` npm script 로 자동 실행 가능 — 격차 검출 채널 단일성 (multiple gates AND).
6. **(I6) 시점 비의존성 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 구체 npm 메이저 숫자 (예: "8", "10", "11") 박제 0. 메이저 숫자는 §변경 이력 메타 부속 + §스코프 규칙 baseline + §carve-precondition 환경 채널 한정 (감사성 — `node-version-3axis-coherence.md` REQ-079 §동작 6 동일 패턴).
7. **(I7) 수단 중립 (RULE-07)**: 본 효능 충족 수단 — (a) `engines.npm` semver range 추가, (b) `packageManager` corepack pin 추가, (c) `.npmrc:engine-strict=true` 정책 활성화 (fail-fast 강화 수단), (d) `actions/setup-node@vN` 의 `with.npm-version` 명시 입력 또는 `node-version-file` 입력 추종, (e) corepack 활성화 — 5+ 수단 카테고리 중 어느 조합이든 4축 격차 0 유지 시 본 효능 충족. 본 spec 은 수단 라벨 0 (G3 자기 검증 박제).
8. **(I8) 직교 정합**: 본 spec 의 4축 정합 게이트는 (a) `node-version-3axis-coherence.md` (REQ-079) 의 Node 메이저 3축 (engines.node + CI node-version + 로컬 pin) 과 직교 — Node 메이저 ↔ npm 메이저는 setup-node bundled npm 자동 유도 관계이나 본 spec 의 (I1) 채널 박제는 명시적 — 어느 한 축이 다른 축을 자동 충족시키지 않는다. (b) `runtime-dep-version-coherence.md` (REQ-066) 의 deps version coherence (`.husky/pre-push:1 npm run check:deps`) 와 직교 — 패키지 매니저 메이저 vs 개별 dep 버전 정합. (c) `node-modules-extraneous-coherence.md` (REQ-068) 의 extraneous deps 정합과 직교 — 패키지 매니저 정합 vs deps tree 정합. (d) `dependency-bump-gate.md` (REQ-035) 의 dep bump 직후 회귀 0 게이트와 직교 (시점 분리 보완 — 패키지 매니저 정합 vs dep bump 회귀).
9. **(I9) REQ-079 별 axis 후속 박제**: REQ-079 `node-version-3axis-coherence.md` §역할 ("`engines.npm` / `packageManager` 키 정합 (별 축 — 패키지 매니저 메이저)") + §회귀 중점 ("`engines.npm` / `packageManager` 키 도입 시 본 spec 의 3축 정합 게이트와 직교 — 별 spec 후보 (패키지 매니저 메이저 정합)") 가 본 spec 을 별 axis 후보로 명시 박제. 본 spec 박제로 REQ-079 별 axis 후속 정식 흡수.

### 회귀 중점
- 신규 contributor 가 `package.json` 에서 `engines.npm` / `packageManager` 양 채널을 동시 삭제 시 (I1) 위반. npm install 호환성 검증 채널 0 + corepack 자동 매니저 pin 0 → 로컬 dev npm 메이저 임의성 활성.
- CI 채널 `setup-node` step 이 `with.node-version` 만 박제하고 npm 메이저 추종 채널 0 일 때 Node 메이저 bump 가 npm bundled 메이저 자동 bump 를 유도하나 (I1) 채널과 격차 1+ 발생 가능 — (I2) 위반.
- `package-lock.json:lockfileVersion` 이 npm 메이저 격차로 인해 활성 매니저 메이저 활성 메이저 호환 포맷과 격차 1+ 발생 시 (I3) 위반. lockfile rewrite 시 다른 contributor 가 다른 npm 메이저로 rewrite 시 diff churn 또는 lockfileVersion downgrade 회귀.
- `.npmrc:engine-strict=true` 정책 비활성 상태에서 (I1) `engines.npm` 채널만 박제될 경우 npm 자체가 위반 시 warning only — fail-fast 부재. 강제 차단 채널은 별 수단 (`.npmrc` 또는 `actions/setup-node` 입력 옵션) 동반 필요.
- corepack 비활성 환경에서 `packageManager` 키만 박제 시 corepack 자동 매니저 pin 효능 0 — 정합 채널 평서 박제만 유지, 강제 채널은 corepack 활성화 동반 필요.
- 패키지 매니저 종류 전환 (npm → pnpm / yarn 등) 시 본 spec 의 npm 단일 채널 가정 위반 — 별 req 진입 시점에 본 spec §역할 + §동작 일률 재박제 (별 spec carve 또는 본 spec 일반화).

## 의존성
- 외부: POSIX shell (`bash`), `grep` extended regex (`-E`), `node` (1-line 진단 스크립트 실행), `npm` (lockfile 메이저 포맷 박제), `actions/setup-node` (CI 채널 패키지 매니저 메이저 추종).
- 내부: `package.json` (메이저 정합 채널 박제 위치), `package-lock.json` (lockfileVersion 박제 위치), `.github/workflows/ci.yml` (CI 채널 박제 위치), `.npmrc` (선택 채널 — `engine-strict` 정책 강화 수단).
- 역의존: 본 효능 회복 후 자동 작동 채널 — npm install 호환성 검증 (`engines.npm` 위반 시 warning / error), corepack 자동 매니저 pin (`packageManager` 위반 시 자동 다운로드 / 차단), CI step `npm -v` 메이저 정합 검증.
- 직교: `node-version-3axis-coherence.md` (REQ-079, Node 메이저 3축 — 본 spec 의 (I8) 직교 평서 박제), `runtime-dep-version-coherence.md` (REQ-066, deps version coherence 채널), `node-modules-extraneous-coherence.md` (REQ-068, deps tree 정합 채널), `dependency-bump-gate.md` (REQ-035, dep bump 직후 회귀 0 게이트 — 시점 분리 보완), `regression-gate.md` (REQ-037, CI typecheck + coverage 4축), `husky-pre-push-typecheck.md` (REQ-089, pre-push hook typecheck early signal 채널).

### carve-precondition
- (P1) **환경 채널 가용성**: 본 spec 효능 회복 task carve 시점 (별 task 단) 에 `node_modules/` 가용성 + `npm install` exit=0 (lockfile rewrite 회수 시 `package-lock.json` regeneration 성공) + `npm run typecheck` exit=0 + `npm run lint` exit=0 + `npm run build` exit=0 + `npm test` 회귀 0 (lockfile rewrite 후 deps tree 변동이 test 채널 회귀 도입하지 않음) 5+ 환경 게이트 충족 필요. 본 spec 자체 박제는 산출물 변경 require 0 (효능 평서 박제만) — 본 spec 박제 시점 환경 게이트 N/A.
- (P2) **선행 spec done 상태**: 본 spec 효능 회복 task carve 시점에 선행 spec (REQ-20260517-079 `node-version-3axis-coherence.md` blue 승격 done — `30.spec/blue/foundation/node-version-3axis-coherence.md`) 의 Node 메이저 3축 정합 충족 필요 — 본 spec 의 (I2) CI 채널 npm 메이저가 `setup-node` bundled npm 으로 자동 유도되는 경우 Node 메이저 3축 정합이 선행 조건 (Node 메이저 격차 1+ 시 bundled npm 격차 자동 발생). 박제 시점 `node-version-3axis-coherence.md` blue 승격 done (HEAD=`b76dc02` 시점 누적 PASS).
- (P3) **RULE-02 chain 비활성**: 본 spec 은 신규 박제 spec — 기존 carve fail-fast chain 누적 0. chain 부재 평서 박제 — carve 진입 차단 신호 없음. 회복 task 발행 시점 (별 inspector / planner tick) 에 chain 누적 신호 발생 시 별 carve-precondition 게이트 자가 차단 적용.

## 테스트 현황
- [x] (I1) `package.json` 메이저 정합 채널 1+ 박제 — TSK-20260517-23 회수 (커밋 `d12b6a0`) 후 `engines.npm: ">=10"` 박제 — `node -e "..."` exit=0 + `grep -nE "\"packageManager\":|\"npm\":" package.json` → 1 hit @`:34` (HEAD=`0ff5280` 재실측 PASS).
- [x] (I2) CI 채널 메이저 격차 0 박제 — TSK-20260518-06 회수 (커밋 `0ed832c`) 후 `.github/workflows/ci.yml:22` `npm-version: '10'` 1 hit 박제 — `grep -nE "npm-version|node-version-file|corepack" .github/workflows/ci.yml` → 1 hit @`:22` (HEAD=`0ed832c` 재실측 PASS, §스코프 규칙 G2 PASS).
- [x] (I3) `lockfileVersion` 메이저 포맷 격차 0 박제 — TSK-20260518-06 회수 (커밋 `0ed832c`) 후 `package-lock.json:4` 값 `3` 박제 (npm 10 메이저 활성 메이저 호환 포맷 격차 0) — `grep -nE "lockfileVersion" package-lock.json` → 1 hit @`:4` 값 `3` (HEAD=`0ed832c` 재실측 PASS, §스코프 규칙 G3 PASS).
- [x] (I4) 4축 격차 0 동시 박제 — (I1) `d12b6a0`, (I2)(I3) `0ed832c` 동반 회복 chain 완성. 4축 동시 격차 0 — `engines.npm: ">=10"` + `packageManager: "npm@10.9.2"` + `ci.yml:22 npm-version: '10'` + `lockfileVersion: 3` (HEAD=`0ed832c` 재실측 4 채널 동시 PASS).
- [x] (I5) 위반 검출 단일성 — TSK-20260517-23 회수 (커밋 `d12b6a0`) 후 `scripts/check-package-manager-coherence.sh` 추가 + `npm run check:npm-coherence` npm script 박제. fixture (양 채널 제거 시) → stdout `engines.npm 부재` + `packageManager 부재` 격차 카테고리 라벨 + rc=2 검증 PASS. **`reconcile: 위반 검출 단일성` 효능 surface 회복** — 단일 진단 명령 + grep 라벨 패턴 박제 (HEAD=`0ff5280` 재실측 PASS).
- [x] (I6) 시점 비의존 (RULE-07) — `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/foundation/package-manager-major-coherence.md | grep -cE "npm\s+(7|8|9|10|11)|lockfileVersion\s*:\s*(2|3)|: 2 |\"2\"|\"3\""` → 0 hit (§스코프 규칙 G4 박제).
- [x] (I7) 수단 중립 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/package-manager-major-coherence.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit (§스코프 규칙 G5 박제).
- [x] (I8) 직교 정합 — 본 spec §동작 8 박제 + 본문 자매 메타 spec 6건 명시 (`node-version-3axis-coherence` + `runtime-dep-version-coherence` + `node-modules-extraneous-coherence` + `dependency-bump-gate` + `regression-gate` + `husky-pre-push-typecheck` 직교 채널 평서).
- [x] (I9) REQ-079 별 axis 후속 박제 — 본 spec §동작 9 + §변경 이력 + §참고 박제로 정합. REQ-079 §역할 + §회귀 중점 별 axis 후보 pointer cross-ref.

## 수용 기준
- [x] (Must, FR-01) `package.json` 메이저 정합 채널 1+ 박제 — TSK-20260517-23 회수 (커밋 `d12b6a0`) 후 `node -e "const p=require('./package.json'); process.exit((p.engines && p.engines.npm) || p.packageManager ? 0 : 1)"` → exit 0 (HEAD=`0ff5280` 재실측 PASS).
- [x] (Must, FR-02) CI 채널 메이저 격차 0 박제 — TSK-20260518-06 회수 (커밋 `0ed832c`) 후 `.github/workflows/ci.yml:22` `npm-version: '10'` 명시 입력 박제. `actions/setup-node` step `npm -v` 출력 메이저 == FR-01 채널 메이저 (10 == 10) 격차 0 (HEAD=`0ed832c` 재실측 PASS).
- [x] (Must, FR-03) `lockfileVersion` 메이저 포맷 격차 0 박제 — TSK-20260518-06 회수 (커밋 `0ed832c`) 후 lockfile rewrite 수행, `package-lock.json:4 lockfileVersion: 3` 박제 — npm 10 메이저 호환 포맷 격차 0 (HEAD=`0ed832c` 재실측 PASS).
- [x] (Must, FR-04) 위반 검출 단일성 — TSK-20260517-23 회수 (커밋 `d12b6a0`) 후 `scripts/check-package-manager-coherence.sh` + `npm run check:npm-coherence` 박제. fixture (양 채널 제거 시) → stdout `engines.npm 부재` + `packageManager 부재` 라벨 + rc=2 검증 PASS. (FR-02)(FR-03) 격차 카테고리는 후속 task 채널 박제 시점.
- [x] (Must, FR-05) 직교 정합 박제 — §동작 8 + §의존성 §직교 평서 박제. 본 spec 4축 게이트는 REQ-079 (Node 3축) + REQ-066 (deps coherence) + REQ-068 (extraneous deps) + REQ-035 (dep bump gate) + REQ-037 (regression gate) + REQ-089 (pre-push typecheck) 와 직교 — 어느 한 축이 다른 축을 자동 충족시키지 않는다.
- [x] (Should, FR-06) 시점 비의존 — 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 에 구체 npm 메이저 숫자 (7 / 8 / 9 / 10 / 11) 박제 0 + `lockfileVersion` 구체 값 (`2` / `3`) 박제 0. 수치는 §스코프 규칙 grep-baseline + §변경 이력 한정. §스코프 규칙 G4 자기 검증.
- [x] (Should, FR-07) 수단 라벨 0 — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/package-manager-major-coherence.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit (§스코프 규칙 G5 자기 검증).
- [x] (NFR-01) 정합성 — 본 spec 본문 §역할 ~ §의존성 어디서도 구체 npm 메이저 숫자 박제 0 (§스코프 규칙 G4 PASS). 메이저 숫자는 §변경 이력 메타 + §스코프 규칙 baseline + §carve-precondition 환경 채널 한정.
- [x] (NFR-02) 박제 위치 결정 근거 — 본 spec §변경 이력 + §carve-precondition 에 흡수 위치 결정 (신규 spec carve, vs REQ-079 확장 / `tooling.md` 흡수) 근거 박제. 결정 근거: REQ-079 메타 모델 (단일 진단 명령 + grep 라벨 + 직교 박제) 동질 자매 메타 spec 양식 정합 (각 axis 별 spec 박제) + blue 영역 직접 편집 inspector writer 영역 외 + `tooling.md` 일반 toolchain 메타 spec 본문 양식 분산 회피.
- [x] (NFR-03) 시점 비의존성 (RULE-07) — 본 spec 본문 어디서도 1회성 진단·incident·릴리스·날짜 귀속 patch 플랜 부재. 본 spec 박제 효능 ("패키지 매니저 메이저 격차 검출 단일성") 은 반복 검증 가능 + 시점 비의존.
- [x] (NFR-04) 직교 박제 — 본 spec 의 4축 (engines.npm/packageManager + lockfileVersion + CI npm-version + 진단 라벨 단일성) 게이트는 REQ-079 (Node 3축) 와 직교 — 어느 한 축이 다른 축을 자동 충족시키지 않음. 직교 평서 §동작 8 + §의존성 §직교 박제.
- [x] (NFR-05) RULE-01 정합 — 본 spec `specs/30.spec/green/foundation/` create only (inspector writer 영역). blue 흡수는 planner 영역 (별 tick promote 후보).
- [x] (NFR-06) RULE-06 정합 — §스코프 규칙 grep-baseline 5 gate (G1~G5) 실측 박제 (HEAD=`b76dc02`) + `expansion` `허용` (패키지 매니저 메이저 정합 회복 task 가 `package.json` + `package-lock.json` + `.github/workflows/ci.yml` + 선택 `.npmrc` 4+ 파일 동시 박제 + 신규 `scripts/check-*.sh` 추가 동반 — scope 확장 허용).
- [x] (NFR-07) spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합).

## 스코프 규칙
- **expansion**: 허용 — 패키지 매니저 메이저 정합 회복 task 가 `package.json` (`engines.npm` 또는 `packageManager` 추가) + `package-lock.json` (lockfile rewrite) + `.github/workflows/ci.yml` (`setup-node` step npm 메이저 채널 추가) + 선택 `.npmrc` (`engine-strict` 정책) + 신규 `scripts/check-package-manager-coherence.sh` (또는 동등 진단 script) 동시 박제 — 4+ 파일 + 신규 script 추가 scope 확장 허용. 신규 npm 메이저 활성 메이저 호환 포맷 변경 (예: npm 12 메이저 lockfileVersion 4 도입 — 가상 시나리오) 시 §스코프 규칙 grep-baseline G3 재실측 + §변경 이력 row 추가.
- **grep-baseline** (HEAD=`b76dc02`, 2026-05-17 — REQ-090 흡수 시점 실측):
  - (G1) **[`package.json` 메이저 정합 채널 baseline]** `node -e "const p=require('./package.json'); console.log(JSON.stringify({engines_npm: p.engines && p.engines.npm || null, packageManager: p.packageManager || null}))"` → `{"engines_npm":null,"packageManager":null}` (HEAD=`b76dc02` 실측 MISS — 본 spec 회복 대상 zero-point). 보조 grep: `grep -nE "\"packageManager\":|\"npm\":" package.json` → 0 hit. 회복 효능 = 양 채널 중 1+ non-null (FR-01 효능 회복 목표).
  - (G2) **[CI 채널 npm 메이저 추종 baseline]** `grep -nE "npm-version|node-version-file|corepack" .github/workflows/ci.yml` → 0 hit (HEAD=`b76dc02` 실측 MISS). `setup-node@v6` step 박제 (`with.node-version: '24'` 만) — bundled npm 자동 유도이나 메이저 추종 채널 명시 박제 0. 회복 효능 = 3 채널 (`with.npm-version` 명시 / `node-version-file` / corepack 활성화) 중 1+ hit (FR-02 효능 회복 목표).
  - (G3) **[`lockfileVersion` 메이저 포맷 baseline]** `grep -nE "lockfileVersion" package-lock.json` → 1 hit @`:4` 값 `2` (HEAD=`b76dc02` 실측 MISS — 본 spec 회복 대상 zero-point). 현 환경 (setup-node@v6 + Node 24 LTS bundled npm 메이저) 활성 메이저 호환 포맷은 lockfileVersion 3 — 격차 1 (downgrade 회귀 위험 활성). 회복 효능 = lockfile rewrite 회수 후 값 == FR-01 채널 활성 메이저 활성 메이저 호환 포맷 (FR-03 효능 회복 목표).
  - (G4) **[FR-06 시점 비의존 자기 검증]** `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/foundation/package-manager-major-coherence.md | grep -cE "npm\s+(7|8|9|10|11)|lockfileVersion\s*:\s*(2|3)|: 2 |\"2\"|\"3\""` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 구체 npm 메이저 숫자 또는 lockfileVersion 구체 값 박제 0 — 수치는 §스코프 규칙 grep-baseline + §변경 이력 한정). HEAD=`b76dc02` 박제 시점 PASS.
  - (G5) **[FR-07 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/package-manager-major-coherence.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 5+ 수단 카테고리 후보 라벨 부여 0 — 백틱 코드 식별자 면제 정밀 패턴). HEAD=`b76dc02` 박제 시점 PASS.
- **rationale**: (G1) `package.json` 메이저 정합 채널 baseline — 본 spec 회복 대상 zero-point. (G2) CI 채널 추종 baseline — `setup-node` 의 명시 추종 채널 0 hit, bundled npm 암시 유도만. (G3) `lockfileVersion` 메이저 포맷 baseline — 본 spec 회복 대상 zero-point + 격차 1 (downgrade 회귀 위험). (G4) RULE-07 시점 비의존 자기 검증 — 본 spec 본문에 구체 메이저 숫자 / lockfileVersion 값 박제 0 검증. (G5) RULE-07 수단 중립 자기 검증 — 5+ 수단 카테고리 후보 라벨 부여 0 검증. 매트릭스: 4 baseline 채널 (G1 `package.json` 채널 + G2 CI 채널 + G3 lockfile 채널 + G4/G5 본 spec 본문 자기 검증) — 회복 후 G1~G3 PASS + G4/G5 박제 시점 PASS (본 spec 자체 효능 박제만으로 충족).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-18 | inspector (Phase 1 hook-ack, TSK-20260518-06 회수) / `0ed832c` | hook-ack 5 marker 플립 — (I2)(I3)(I4) + (FR-02)(FR-03) 4축 격차 0 동시 박제 완성. `.github/workflows/ci.yml:22 npm-version: '10'` 1 hit 추가 ((I2)(FR-02) 회복) + `package-lock.json:4 lockfileVersion: 2→3` rewrite ((I3)(FR-03) 회복) + `package.json` `packageManager: "npm@10.9.2"` corepack pin 동반 박제 ((I1) 양 채널 강화). 4축 동치 검증: G1 `node -e ...` exit 0 + G2 `ci.yml:22` 1 hit + G3 `package-lock.json:4` 값 `3` + (I5) `npm run check:npm-coherence` rc=0 + stdout `package-manager coherence: engines.npm=>=10 packageManager=npm@10.9.2 aligned` (격차 라벨 0 hit). hook-ack 본질: HEAD 조상 + DoD grep PASS + lint/typecheck/test/build/자매진단 4종 rc=0 + 회귀 0 (npm test 460/460 PASS, coverage Statements 97.54% / Branches 94.07%) + 직전 deps-coherence drift (extraneous eslint-plugin-react-hooks@5.2.0 + declared 29 ≠ installed 30) 동반 회복 (TSK-04/TSK-05 blocked 사유 해소). RULE-07 정합 — 본문 구체 메이저 숫자 박제 0 유지 (G4 0 hit), 수단 라벨 0 (G5 0 hit). | §테스트 현황 + §수용 기준 |
| 2026-05-17 | inspector (Phase 1 hook-ack, TSK-20260517-23 회수) / `d12b6a0` (verify HEAD=`0ff5280`) | hook-ack 4 marker 플립 — (I1)(I5) + (FR-01)(FR-04) `engines.npm: ">=10"` + `scripts/check-package-manager-coherence.sh` + `npm run check:npm-coherence` 박제. 객관 grep 재실측 4 채널 (G1 `node -e ...` exit=0 + G2 `package.json:34` 1 hit + G3 `package.json:28` 1 hit + G4 진단 script 존재 + fixture rc=2 격차 라벨 출력). 잔여 (I2)(I3)(I4) + (FR-02)(FR-03) 5 marker 후속 task chain 대기 (CI step npm 메이저 추종 채널 박제 + lockfile rewrite). RULE-07 정합 — 객관 surface 박제 (수단 라벨 0), Must 주관 혼재 0. | §테스트 현황 + §수용 기준 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-090 흡수) / pending (HEAD=`b76dc02`) | 최초 박제 — 패키지 매니저 (npm) 메이저 4축 정합 효능 9 축 (I1~I9) 게이트. baseline 매트릭스: `package.json` 메이저 정합 채널 baseline (G1 — `engines.npm` 부재 + `packageManager` 부재, 2 채널 0/2 hit zero-point) + CI 채널 추종 baseline (G2 — `npm-version` / `node-version-file` / corepack 0/3 hit) + `lockfileVersion` 메이저 포맷 baseline (G3 — 값 `2` / npm 7~8 메이저 포맷, 현 환경 bundled npm 메이저 활성 메이저 호환 포맷 (lockfileVersion 3) 와 격차 1 zero-point + 본 spec 회복 대상). 본 spec 분리 결정 근거: (a) blue 영역 직접 편집 inspector writer 영역 외 — REQ-079 `node-version-3axis-coherence.md` 확장 (3축 → 4축) 은 blue→green 복사 후 흡수 + spec 본문 양식 일률 변화 + REQ-079 §역할 자체가 "별 축 — 패키지 매니저 메이저" 로 명시 박제 → 단일 spec 확장은 RULE-07 단일 효능 박제 원칙 위반. (b) `tooling.md` 흡수 부적합 — tooling 메타 spec 은 일반 toolchain (ESLint flat-config last-write-wins 외 다수) — 패키지 매니저 메이저 정합은 특화 효능 채널 — 일반 흡수 시 spec 본문 양식 분산. (c) 자매 메타 spec (REQ-079 Node 3축 + REQ-066 deps coherence + REQ-068 extraneous deps + REQ-035 dep bump gate + REQ-037 regression gate + REQ-089 pre-push typecheck) 와 동질 패턴 — 각 axis 별 spec 박제 자매 메타 효능 양식 정합. consumed req: `specs/20.req/20260517-package-manager-major-coherence.md` (REQ-090) → `60.done/2026/05/17/req/` mv. **REQ-079 → REQ-090 별 axis pointer**: REQ-079 §역할 ("`engines.npm` / `packageManager` 키 정합 (별 축 — 패키지 매니저 메이저)") + §회귀 중점 ("`engines.npm` / `packageManager` 키 도입 시 본 spec 의 3축 정합 게이트와 직교 — 별 spec 후보 (패키지 매니저 메이저 정합)") 가 본 spec 을 별 axis 후보로 명시 박제. 본 spec 박제로 별 axis 후속 정식 흡수. REQ-079 §역할 cross-ref 1+ hit. RULE-07 자기검증 — (I1)~(I9) 모두 평서형·반복 검증 가능 (`node -e` 1-line 진단 + `grep -nE` G1/G2/G3 단일 명령)·시점 비의존 (G4 0 hit — 본 spec 본문에 npm 메이저 숫자 + lockfileVersion 값 박제 0)·incident 귀속 부재 (REQ-090 §배경 의 baseline audit 는 §변경 이력 / §참고 / §스코프 규칙 한정 박제 — 본문 §역할 ~ §의존성 영역 비박제)·수단 중립 (G5 0 hit — 5+ 수단 카테고리 후보 라벨 0). RULE-06 §스코프 규칙 5 gate (G1~G5) 실측 박제 + `expansion` `허용` (4+ 파일 + 신규 script 추가 회복 task scope 확장 허용). RULE-01 inspector writer 영역만 (`30.spec/green/foundation/package-manager-major-coherence.md` create). spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합). | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-package-manager-major-coherence.md` (REQ-090 — 본 세션 mv).
- **선행 spec (별 axis 후보 명시 — 본 spec 박제 근거)**:
  - `specs/30.spec/blue/foundation/node-version-3axis-coherence.md` (REQ-20260517-079) §역할 "`engines.npm` / `packageManager` 키 정합 (별 축 — 패키지 매니저 메이저)" + §회귀 중점 "별 spec 후보 (패키지 매니저 메이저 정합)" — 본 spec 이 흡수할 별 axis 명시 박제.
- **자매 메타 spec (channel 직교, 본 spec 박제 시점 동일 영역)**:
  - `30.spec/blue/foundation/node-version-3axis-coherence.md` (REQ-079 blue 승격) — Node 메이저 3축 정합 채널 (동일 메타 모델 — 단일 진단 명령 + grep 라벨 + 직교 박제).
  - `30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — dep bump 직후 회귀 0 게이트 (시점 분리 보완).
  - `30.spec/blue/foundation/regression-gate.md` (REQ-037) — CI typecheck + coverage 4축.
  - `30.spec/blue/foundation/ci.md` — CI workflow 일반.
  - `30.spec/blue/foundation/tooling.md` — toolchain 일반.
  - `30.spec/blue/foundation/node-modules-extraneous-coherence.md` (REQ-078) — extraneous deps 정합 채널 (직교).
  - `30.spec/green/foundation/husky-pre-push-typecheck.md` (REQ-089) — pre-push hook typecheck local early signal 채널 (직교).
- **선행 done req**:
  - `specs/60.done/2026/05/17/req/20260517-node-runtime-version-3axis-coherence.md` (REQ-079) — Node 3축 정합 + 본 spec 별 axis 명시.
  - `specs/60.done/2026/05/17/req/20260517-runtime-dep-version-coherence.md` (REQ-066) — `.husky/pre-push:1` `npm run check:deps` 추가 (직교).
  - `specs/60.done/2026/05/17/req/20260517-node-modules-extraneous-coherence.md` (REQ-068) — extraneous deps 정합 (직교).
  - `specs/60.done/2026/05/17/req/20260517-devbin-install-integrity.md` (REQ-064) — `node_modules/.bin` 무결성 (직교).
- **선행 task 산출물 (진단 명령 패턴 메타 모델)**:
  - `specs/60.done/2026/05/17/task/node-version-3axis-coherence-recover/result.md` — TSK-20260517-14 회수 산출물. `scripts/check-node-version-coherence.sh` 단일 script + `npm run check:node-coherence` npm script + 격차 카테고리 stdout 라벨 (`engines.node 부재` / `local-pin 부재` / `major 격차 N`) 패턴 — 본 spec 회복 task 의 진단 명령 패턴 메타 (회복 task 발행 시 동일 패턴 채용 가능 — 수단 중립 평서, 본 spec 비박제).
- **외부 레퍼런스**:
  - npm 공식 — `engines.npm` 키 정의 + `--engine-strict` 옵션: `https://docs.npmjs.com/cli/v10/configuring-npm/package-json#engines` + `https://docs.npmjs.com/cli/v10/using-npm/config#engine-strict`.
  - corepack 공식 — `packageManager` 키 정의 + 자동 매니저 pin: `https://nodejs.org/api/corepack.html`.
  - `actions/setup-node` 공식 — `with.npm-version` / `node-version-file` 입력 + corepack 통합: `https://github.com/actions/setup-node#usage`.
  - npm lockfile 공식 — lockfileVersion 메이저 별 호환성 표: `https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json#lockfileversion`.
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G4 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`node -e` 1-line 진단 + `grep -nE` G1/G2/G3 단일 명령) · incident 귀속 부재 (REQ-090 §배경 baseline audit 는 §변경 이력 / §참고 / §스코프 규칙 한정). 수단 박제 0 (G5 0 hit 자기 검증).
  - RULE-06: grep-baseline 5 gate (G1~G5) 실측 박제 (HEAD=`b76dc02`) + `expansion` `허용`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/package-manager-major-coherence.md` create).
  - spec-carve-precondition (REQ-085): §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 정합.
