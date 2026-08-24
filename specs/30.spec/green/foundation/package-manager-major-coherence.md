# 패키지 매니저 메이저 4축 정합 — `engines.npm` / `packageManager` / `lockfileVersion` / CI 런타임 실측 메이저 동시 박제

> **위치**: `package.json` (`engines.npm` / `packageManager`), `package-lock.json` (`lockfileVersion`), `.github/workflows/ci.yml` (`actions/setup-node` step), repo root `.npmrc` (선택 채널).
> **관련 요구사항**: REQ-20260517-090 (선행 REQ-20260517-079 `node-version-3axis-coherence.md` §역할 + §회귀 중점 별 axis 후보 박제 후속).
> **최종 업데이트**: 2026-08-24 (by inspector — 215차 tick 드리프트 회수. TSK-20260824-01-a (`267505e`, 선언 메이저를 실행 런타임에 정합) + TSK-20260824-01-b (`9e06afa`, 판정 채널을 런타임 실측 게이트로 교체) 회수로 (I2)(I4)(I5)(I10)(I11)(I13) + (Must FR-02)(FR-04)(FR-08)(FR-09) 10 marker 플립. 잔여 미충족 1건 — (I12) 워크플로 입력 키 유효성 (판정 채널 부재).)

> 참조 코드는 **식별자 우선**. 라인 번호는 박제 시점 스냅샷 (HEAD=`b76dc02`).

## 역할
프로젝트의 패키지 매니저 (npm) 메이저 정합을 **4축 동시** 박제하는 시스템 불변식: (a) `package.json` 의 메이저 정합 채널 1+ 존재 (`engines.npm` semver range 또는 `packageManager` corepack pin) + (b) `.github/workflows/ci.yml` 의 `actions/setup-node` step 이 패키지 매니저 메이저를 (a) 채널과 격차 0 으로 유지 + (c) `package-lock.json:lockfileVersion` 이 (a) 채널의 활성 메이저 활성 메이저 호환 포맷과 격차 0 + (d) FR-01~03 어느 1축 위반 시 단일 진단 명령 stdout 에서 격차 카테고리가 grep 가능한 라벨로 식별. 여기에 (e) **판정 근거의 실행성** — (b) 축의 격차 0 은 워크플로 파일의 토큰 존재가 아니라 CI 잡 안에서 실행된 매니저 버전 출력으로 판정한다 — 을 동반 조건으로 둔다. `node-version-3axis-coherence.md` (REQ-079) 의 Node 메이저 3축 정합과 동일 메타 모델 (단일 진단 명령 + grep 라벨 + 직교 박제) — 그 spec 과 직교 보완 (Node 메이저 vs 패키지 매니저 메이저). 의도적으로 하지 않는 것: 구체 npm 메이저 숫자 (예: "10", "11") 본문 박제 (NFR-01 / FR-06 정합), 메이저 정합 채널 선정 (`engines.npm` semver range vs `packageManager` corepack pin — 어느 채널이든 FR-01 충족, 수단 중립), CI 채널의 npm 메이저 추종 수단 (corepack 활성화 + `packageManager` 추종 vs 매니저 전역 설치 step vs `node-version-file` 추종 vs 액션이 정의한 입력을 통한 지정) 선정 (task 위임, 수단 중립), `.npmrc:engine-strict=true` 강제 정책 활성화 (`engines.npm` 의 fail-fast 활성화 수단의 하나 — 별 task / req 후보), lockfile rewrite 자동화 운영 (수동 1회 회수 vs renovate / dependabot — 운영 task 영역), 패키지 매니저 종류 전환 (npm → pnpm / yarn 등 — 별 req), `engines.node` `--engine-strict` 강제 정책 (REQ-079 §역할 별 req 후보 — 인접 축이나 직교 운영), `package-lock.json` 의 dependency tree 정합 (`integrity` SRI / `resolved` 호스트 / extraneous tree — REQ-068 `node-modules-extraneous-coherence` 영역).

**방어 대상** (RULE-07 — 토큰·설정 정합 축이 spec 자격을 얻는 조건; 절 이름은 §참고 인용): 선언 채널 메이저와 실행 런타임 메이저가 어긋나도 저장소의 자동 게이트 전부가 초록을 유지하는 silent regression. `scripts/check-package-manager-coherence.sh` 는 `package.json` 두 키의 **존재만** 읽으므로 이 격차에 구조적으로 무력하고 (선언과 선언을 비교해 정합 라벨을 출력한다), `actions/setup-node` 는 액션이 정의하지 않은 입력 키를 경고 annotation 으로만 알리고 step 은 성공으로 종료한다. 두 채널 어디에도 red 가 발생하지 않는다. 격차는 lockfile rewrite churn · CI 와 로컬의 install 결과 불일치 · 재현 불가 회귀로 하류에 전이한다.

## 공개 인터페이스
- 측정 대상 파일:
  - `package.json` — `engines.npm` 키 (semver range) 또는 `packageManager` 키 (corepack pin) 중 1+ 존재 (둘 다 부재 시 FR-01 위반).
  - `.github/workflows/ci.yml` — CI 잡이 실행하는 매니저 메이저를 (I1) 채널에 맞추는 채널. 수단은 지정하지 않는다 — 단, 워크플로에 지정하는 입력 키는 해당 액션이 정의한 입력 집합의 원소여야 한다 ((I12)). 액션 입력 집합 밖의 키는 채널이 아니다.
  - `package-lock.json` — `lockfileVersion` 키 값 (활성 npm 메이저 호환 포맷 — 메이저 ↔ lockfileVersion 매핑은 §스코프 규칙 G3 baseline 박제).
- 측정 명령:
  - (A) `package.json` 메이저 정합 채널 존재: `node -e "const p=require('./package.json'); process.exit((p.engines && p.engines.npm) || p.packageManager ? 0 : 1)"` → exit 0.
  - (B) `lockfileVersion` 메이저 포맷 추출: `grep -nE "lockfileVersion" package-lock.json` → 1 hit, 값 추출 후 활성 npm 메이저 활성 메이저 호환 포맷과 격차 검사.
  - (C) 4축 격차 진단: 1-line node 스크립트 또는 `scripts/check-*.sh` 형태 단일 명령이 stdout 에 격차 카테고리 (`engines.npm 부재` / `packageManager 부재` / `lockfileVersion 격차 N` / `npm major 격차 N`) 라벨 출력 + exit code ≠ 0.
  - (D) 선언 채널 ↔ 실행 런타임 메이저 격차: `node -e "const p=require('./package.json'); const d=String(p.packageManager||p.engines.npm).match(/\d+/)[0]; const r=require('child_process').execSync('npm -v').toString().match(/\d+/)[0]; console.log('declared='+d,'runtime='+r); process.exit(d===r?0:1)"` → exit 0. 본 명령은 **실행 환경의 매니저를 실측**하므로 CI step 으로 등재되면 CI 런타임을 판정하고, 로컬에서 실행되면 로컬 런타임을 판정한다.
  - (E) 판정 채널의 런타임 측정 여부: `grep -cE "npm -v|npm --version" scripts/check-package-manager-coherence.sh` → 1 hit 이상. 0 hit 이면 그 채널은 선언끼리만 비교하는 채널이며 (I2) 의 근거가 될 수 없다.
  - (F) 워크플로 입력 키 유효성: 각 `uses:` 액션의 `action.yml` `inputs` 키 집합과 해당 step 의 `with:` 키 집합의 차집합 → 공집합.

## 동작
1. **(I1) `package.json` 메이저 정합 채널 1+ 박제**: `package.json` 객체에 `engines.npm` 키 (semver range — 예: `">=N"` 또는 `"N.x"`) 또는 `packageManager` 키 (corepack pin — 예: `"npm@N.M.K"`) 중 1+ 채널이 정의되어 있다. 두 채널 중 어느 것이든 본 효능 충족 (수단 중립). 채널 존재 자체가 npm install 시 호환성 검증 또는 corepack 자동 매니저 pin 의 활성 조건.
2. **(I2) CI 채널 메이저 격차 0 박제**: CI 잡이 실행하는 npm 메이저가 (I1) 채널의 메이저와 격차 0 이다. 수단은 지정하지 않으며 (corepack 활성화 + `packageManager` 추종 / 매니저 전역 설치 step / `node-version-file` 추종 / 액션이 정의한 매니저 지정 입력 등 — (I12) 를 만족하는 어느 조합이든), 액션 입력 집합 밖의 키를 워크플로에 적는 것은 채널이 아니라 (I12) 위반이다. CI step 의 `npm -v` 출력 메이저 == (I1) 채널 메이저. 이 동치의 판정 근거는 (I10) 이 정한다.
3. **(I3) `lockfileVersion` 메이저 포맷 격차 0 박제**: `package-lock.json:lockfileVersion` 값이 (I1) 채널의 활성 npm 메이저 호환 포맷과 격차 0. 메이저 ↔ lockfileVersion 매핑 표는 §스코프 규칙 G3 baseline 한정. 메이저 ↔ lockfileVersion 격차 1+ 시 본 불변식 위반 — lockfile rewrite (수동 `npm install` 1회 또는 자동화) 로 회수.
4. **(I4) 4축 격차 0 동시 박제**: (I1) ~ (I3) 의 어느 1축에라도 격차 1+ 발생 시 본 불변식 위반. 격차 발생 시 환경 격차 회귀 (로컬 dev npm M / CI npm M+1 시 lockfile rewrite 시도 + diff churn 또는 lockfileVersion downgrade 회귀) 활성. 4축 동시 격차 0 유지 — 환경 격차 회귀 채널 무력화.
5. **(I5) 위반 검출 단일성**: (I1) ~ (I4) 의 격차가 어느 1축에라도 존재할 때, 단일 진단 명령 (1 명령 또는 1-line node 스크립트 또는 `scripts/check-*.sh`) stdout 출력에서 격차 카테고리 (`engines.npm 부재` / `packageManager 부재` / `lockfileVersion 격차 N` / `npm major 격차 N`) 가 grep 가능한 라벨로 식별 + exit code ≠ 0. 본 명령은 CI step 또는 pre-push hook 또는 `scripts.<name>` npm script 로 자동 실행 가능 — 격차 검출 채널 단일성 (multiple gates AND).
6. **(I6) 시점 비의존성 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 구체 npm 메이저 숫자 (예: "8", "10", "11") 박제 0. 메이저 숫자는 §변경 이력 메타 부속 + §스코프 규칙 baseline + §carve-precondition 환경 채널 한정 (감사성 — `node-version-3axis-coherence.md` REQ-079 §동작 6 동일 패턴).
7. **(I7) 수단 중립 (RULE-07)**: 본 효능 충족 수단 — (a) `engines.npm` semver range 추가, (b) `packageManager` corepack pin 추가, (c) `.npmrc:engine-strict=true` 정책 활성화 (fail-fast 강화 수단), (d) `actions/setup-node@vN` 이 **그 메이저에서 실제로 정의한** 입력을 통한 추종 (`node-version-file` 등 — 입력 집합은 액션 메이저마다 다르므로 채용 시점에 상류 `action.yml` 로 확인), (e) corepack 활성화 — 5+ 수단 카테고리 중 어느 조합이든 4축 격차 0 유지 시 본 효능 충족. 본 spec 은 수단 라벨 0 (G3 자기 검증 박제).
8. **(I8) 직교 정합**: 본 spec 의 4축 정합 게이트는 (a) `node-version-3axis-coherence.md` (REQ-079) 의 Node 메이저 3축 (engines.node + CI node-version + 로컬 pin) 과 직교 — Node 메이저 ↔ npm 메이저는 setup-node bundled npm 자동 유도 관계이나 본 spec 의 (I1) 채널 박제는 명시적 — 어느 한 축이 다른 축을 자동 충족시키지 않는다. (b) `runtime-dep-version-coherence.md` (REQ-066) 의 deps version coherence (`.husky/pre-push:1 npm run check:deps`) 와 직교 — 패키지 매니저 메이저 vs 개별 dep 버전 정합. (c) `node-modules-extraneous-coherence.md` (REQ-068) 의 extraneous deps 정합과 직교 — 패키지 매니저 정합 vs deps tree 정합. (d) `dependency-bump-gate.md` (REQ-035) 의 dep bump 직후 회귀 0 게이트와 직교 (시점 분리 보완 — 패키지 매니저 정합 vs dep bump 회귀).
9. **(I9) REQ-079 별 axis 후속 박제**: REQ-079 `node-version-3axis-coherence.md` §역할 ("`engines.npm` / `packageManager` 키 정합 (별 축 — 패키지 매니저 메이저)") + §회귀 중점 ("`engines.npm` / `packageManager` 키 도입 시 본 spec 의 3축 정합 게이트와 직교 — 별 spec 후보 (패키지 매니저 메이저 정합)") 가 본 spec 을 별 axis 후보로 명시 박제. 본 spec 박제로 REQ-079 별 axis 후속 정식 흡수.
10. **(I10) 판정 근거의 실행성**: (I2) 의 격차 0 판정 근거는 CI 잡 안에서 실제로 실행된 패키지 매니저의 버전 출력이다. 워크플로 파일 또는 설정 파일에 특정 토큰이 존재한다는 사실은 (I2) 충족 근거가 되지 않는다 — 토큰이 해당 액션이 정의하지 않은 입력 키이면 실행 결과를 바꾸지 않으면서도 토큰 grep 은 hit 을 반환하므로, 토큰 근거는 위반 상태와 충족 상태를 구별하지 못한다.
11. **(I11) 격차의 실패 전이**: (I1)~(I3) 어느 축에라도 격차 1+ 가 존재할 때 CI 잡은 rc≠0 으로 종료한다. 경고 annotation 만 남기고 잡이 성공으로 종료하는 상태는 본 불변식 위반이다.
12. **(I12) 워크플로 입력 키 유효성**: `.github/workflows/**` 의 `uses:` step 이 지정한 `with:` 입력 키는 해당 액션이 정의한 입력 집합의 원소다. 집합 밖 입력 키는 검출 대상이며, 경고 annotation 은 검출로 계수하지 않는다.
13. **(I13) 진단 출력의 양측 동시 박제**: 격차 진단 stdout 은 선언 채널 메이저와 실측 런타임 메이저를 **동시에** 포함하고, 격차 상태는 grep 가능한 라벨로 식별된다. 한쪽만 출력하는 진단은 (I5) 의 검출 단일성을 충족하지 않는다.

### 회귀 중점
- 신규 contributor 가 `package.json` 에서 `engines.npm` / `packageManager` 양 채널을 동시 삭제 시 (I1) 위반. npm install 호환성 검증 채널 0 + corepack 자동 매니저 pin 0 → 로컬 dev npm 메이저 임의성 활성.
- CI 채널 `setup-node` step 이 `with.node-version` 만 박제하고 npm 메이저 추종 채널 0 일 때 Node 메이저 bump 가 npm bundled 메이저 자동 bump 를 유도하나 (I1) 채널과 격차 1+ 발생 가능 — (I2) 위반.
- `package-lock.json:lockfileVersion` 이 npm 메이저 격차로 인해 활성 매니저 메이저 활성 메이저 호환 포맷과 격차 1+ 발생 시 (I3) 위반. lockfile rewrite 시 다른 contributor 가 다른 npm 메이저로 rewrite 시 diff churn 또는 lockfileVersion downgrade 회귀.
- `.npmrc:engine-strict=true` 정책 비활성 상태에서 (I1) `engines.npm` 채널만 박제될 경우 npm 자체가 위반 시 warning only — fail-fast 부재. 강제 차단 채널은 별 수단 (`.npmrc` 또는 `actions/setup-node` 입력 옵션) 동반 필요.
- corepack 비활성 환경에서 `packageManager` 키만 박제 시 corepack 자동 매니저 pin 효능 0 — 정합 채널 평서 박제만 유지, 강제 채널은 corepack 활성화 동반 필요.
- 패키지 매니저 종류 전환 (npm → pnpm / yarn 등) 시 본 spec 의 npm 단일 채널 가정 위반 — 별 req 진입 시점에 본 spec §역할 + §동작 일률 재박제 (별 spec carve 또는 본 spec 일반화).
- 판정 채널이 선언 채널끼리만 비교하고 실행 런타임을 읽지 않으면, 선언과 실행이 어긋난 상태에서도 정합 라벨과 rc=0 을 출력한다 — (I10) 위반이자 (I5) 검출 단일성의 공동화. 이 상태에서는 게이트의 초록이 정합의 증거가 아니다.
- `actions/setup-node` 가 정의하지 않는 입력 키로 매니저 메이저를 지정하면 step 은 성공하고 토큰 grep 은 hit 을 반환하나 실행 메이저는 변하지 않는다 — (I2) 가 토큰 근거로 충족 처리되는 false-positive 경로 ((I12) 위반). 액션 입력 집합은 액션 메이저 bump 시 변할 수 있으므로 이 경로는 시간이 지나며 재도래한다.
- corepack 비활성 상태에서 `packageManager` pin 은 실행 매니저를 강제하지 않는다 — pin 의 존재가 (I2) 를 자동 충족시키지 않는다.

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

> 재실측 기준: HEAD=`510ae0f` (2026-08-24, Node `v24.19.0` / npm `11.17.0`). `<SPEC>` 는 본 파일 경로 (green/blue 어디에 있든 동일 명령).
>
> 본 tick 의 플립은 **게이트 재실행 결과**다 — 커밋 메시지·`result.md` 의 자기 신고가 아니라 현 HEAD 에서 각 marker 의 명령을 직접 실행한 출력이 근거다. 검출력을 요구하는 marker ((I5)(I11)(FR-04)) 는 정상 트리의 rc=0 이 아니라 **격차 주입 후 rc≠0** 으로 판정했다 (아래 각 marker 에 주입 명령·출력 박제).

- [x] (I1) `package.json` 메이저 정합 채널 1+ 박제 — `node -e "const p=require('./package.json'); process.exit((p.engines && p.engines.npm) || p.packageManager ? 0 : 1)"` → rc=0. `grep -nE "\"packageManager\":|\"npm\":" package.json` → 2 hit (`:42` `:44`). 재실측 PASS.
- [x] (I2) CI 채널 메이저 격차 0 박제 — **CI 잡 실행 출력으로 판정**. TSK-20260824-01-a (`267505e`) 가 선언 채널을 실행 런타임에 정합시켰다 (`package.json:42 "npm": ">=11"` + `:44 "packageManager": "npm@11.17.0"`). 현 HEAD 의 CI run `32685135180` (headSha `510ae0f`, conclusion=success) 의 `Check package manager coherence` step stdout: `package-manager coherence: engines.npm=>=11 packageManager=npm@11.17.0 declared=11 runtime=11 lockfileVersion=3 aligned` — **CI 러너 안에서 실행된 매니저 메이저가 11 로 실측**되어 선언 메이저와 격차 0. 판정 근거가 (I10) 요구대로 토큰 존재가 아니라 실행 출력이다. 과거 이 marker 를 거짓으로 플립시켰던 `ci.yml:22 npm-version: '10'` 토큰은 현 HEAD 에 부재하며 (`grep -cE "npm-version|node-version-file|corepack" .github/workflows/ci.yml` → 0 hit), 그 부재가 본 marker 에 영향을 주지 않는다는 것이 실행 근거 전환의 요점이다.
- [x] (I3) `lockfileVersion` 메이저 포맷 격차 0 박제 — `grep -nE '"lockfileVersion"' package-lock.json` → 1 hit @`:4` 값 `3`. 재실측 PASS.
- [x] (I4) 4축 격차 0 동시 박제 — **4/4 축 PASS** (I1 채널 존재 + I2 CI 실행 메이저 격차 0 + I3 lockfileVersion 격차 0 + I5 검출 단일성). 단일 명령 재실측: `npm run --silent check:npm-coherence` → rc=0 / `engines.npm=>=11 packageManager=npm@11.17.0 declared=11 runtime=11 lockfileVersion=3 aligned` — 4축 값이 한 줄에 동시 출력된다.
- [x] (I5) 위반 검출 단일성 — **주입 재실행으로 확인**. 정상 트리 rc=0 은 근거가 아니므로 inspector 가 현 HEAD 에서 2 방향을 주입해 재판정했다.
  - 선언 메이저 주입 (`packageManager` `npm@11.17.0` → `npm@10.9.2`): rc=**3**, stdout 1행 `npm major 격차 1` + 요약 `... declared=10 runtime=11 ... FAIL (격차 1)` — 격차 카테고리 라벨 grep 1 hit.
  - lockfile 축 주입 (`lockfileVersion` `3` → `2`): rc=**3**, stdout `lockfileVersion 격차 1 (expected 3 for npm major 11)` + 동일 요약 — 라벨 grep 1 hit.
  - 두 주입 모두 원복 후 `git status --porcelain` 무출력 · 게이트 rc=0 복귀 확인.
  진단 채널 3 지점 실재 (`scripts/check-package-manager-coherence.sh` + `package.json` `scripts.check:npm-coherence` + `.github/workflows/ci.yml:43` CI step).
- [x] (I6) 시점 비의존 (RULE-07) — `awk '/^## 역할/,/^## 테스트 현황/' "<SPEC>" | grep -cE "npm\s+(7|8|9|10|11)|lockfileVersion\s*:\s*(2|3)|: 2 |\"2\"|\"3\""` → 0 hit (§스코프 규칙 G4).
- [x] (I7) 수단 중립 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' "<SPEC>" | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit (§스코프 규칙 G5).
- [x] (I8) 직교 정합 — §동작 8 박제 + 자매 메타 spec 6건 명시.
- [x] (I9) REQ-079 별 axis 후속 박제 — §동작 9 + §변경 이력 + §참고 cross-ref.
- [x] (I10) 판정 근거의 실행성 — TSK-20260824-01-b (`9e06afa`) 가 게이트를 런타임 실측으로 교체했다. `grep -cE "npm -v|npm --version" scripts/check-package-manager-coherence.sh` → **3 hit** (재실측). 게이트는 선언 2키를 서로 비교하지 않고 `npm -v` 출력을 실측 축으로 삼아 선언 메이저와 대조하며, lockfileVersion 기대값도 **실측 메이저** 기준으로 산출한다. `grep -c "ci.yml" ...` → 0 은 유지되나 이는 위반이 아니라 설계다 — 게이트 자신이 CI 잡 안에서 실행돼 그 러너의 매니저를 측정하므로, 워크플로 파일을 읽는 경로는 (I10) 이 배격한 토큰 근거로 회귀하는 길이다.
- [x] (I11) 격차의 실패 전이 — 주입 격차가 rc≠0 으로 전이함을 재실행 확인 (위 (I5) 2 방향 모두 rc=**3**). 전이 경로는 `npm run` 의 exit code 전파 (주입 시 `npm run --silent check:npm-coherence` 자체가 rc=3 반환) → `.github/workflows/ci.yml:43` step (`run: npm run check:npm-coherence`, `shell: /usr/bin/bash -e`) 이며, 경고 annotation 으로 강등되는 경로가 없다. **CI 잡을 실제로 red 로 만든 관측은 본 tick 에 없다** — 근거는 (게이트 rc=3 재실행) + (해당 게이트가 CI step 으로 등재됨) 의 합성이다.
- [ ] (I12) 워크플로 입력 키 유효성 — **판정 채널 부재**. 현 HEAD 의 `setup-node@v6` step 은 `node-version` (`:27`) / `cache` (`:28`) 2 키만 지정하며 두 키 모두 액션 입력 집합의 원소이므로 상태는 충족이나, 이를 판정하는 자동 채널이 저장소에 없다 (`actionlint` 등 미도입). 채널 부착 task 선행 (RULE-07 §promote 4).
- [x] (I13) 진단 출력의 양측 동시 박제 — `npm run --silent check:npm-coherence | grep -cE "runtime=|실측"` → **1 hit** (재실측). 성공 경로 stdout 이 `declared=11 runtime=11` 로 선언·실측을 동시에 낸다. 실패 경로도 동일 요약을 동반한다 — 위 (I5) 주입 출력 `... declared=10 runtime=11 ... FAIL (격차 1)` 이 양측 동시 박제의 실패측 사례다.

## 수용 기준

> 전 항목 HEAD=`ce15908` 에서 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 자기 참조·자명·주입 부류는 §참고 §미측정·비판정 항목으로 강등했다.

- [x] (Must, FR-01) `package.json` 메이저 정합 채널 1+ 박제 — `node -e "const p=require('./package.json'); process.exit((p.engines && p.engines.npm) || p.packageManager ? 0 : 1)"` → rc=0 (재실측 PASS).
- [x] (Must, FR-02) 선언 채널 메이저 == 실행 매니저 메이저 — `node -e "const p=require('./package.json'); const d=String(p.packageManager||p.engines.npm).match(/\d+/)[0]; const r=require('child_process').execSync('npm -v').toString().match(/\d+/)[0]; console.log('declared='+d,'runtime='+r); process.exit(d===r?0:1)"` → rc=**0** / `declared=11 runtime=11` (HEAD=`510ae0f` 재실측). CI 러너 실측은 run `32685135180` step stdout 의 `declared=11 runtime=11` — 토큰 존재 무관한 실행 환경 판정.
- [x] (Must, FR-03) `lockfileVersion` 메이저 포맷 격차 0 — `grep -nE '"lockfileVersion"' package-lock.json` → 1 hit @`:4` 값 `3` (재실측 PASS).
- [x] (Must, FR-04) 위반 검출 단일성 — 격차가 존재하는 상태에서 `npm run --silent check:npm-coherence` → rc≠0. **주입 재실측 rc=3** (선언 메이저 주입 → `npm major 격차 1` / lockfile 주입 → `lockfileVersion 격차 1 (expected 3 for npm major 11)`), 원복 후 rc=0. 정상 트리 rc=0 은 본 marker 의 근거가 아니다 (§테스트 현황 (I5) 주입 왕복 참조).
- [x] (Must, FR-08) 판정 채널의 런타임 실측 — `grep -cE "npm -v|npm --version" scripts/check-package-manager-coherence.sh` → 1 hit 이상. **재실측 3 hit** (TSK-20260824-01-b / `9e06afa`).
- [x] (Must, FR-09) 진단 stdout 의 양측 동시 출력 — `npm run --silent check:npm-coherence | grep -cE "runtime=|실측"` → 1 hit 이상. **재실측 1 hit** (`declared=11 runtime=11`).

## 스코프 규칙
- **expansion**: 허용 — 패키지 매니저 메이저 정합 회복 task 가 `package.json` (`engines.npm` 또는 `packageManager` 추가) + `package-lock.json` (lockfile rewrite) + `.github/workflows/ci.yml` (`setup-node` step npm 메이저 채널 추가) + 선택 `.npmrc` (`engine-strict` 정책) + 신규 `scripts/check-package-manager-coherence.sh` (또는 동등 진단 script) 동시 박제 — 4+ 파일 + 신규 script 추가 scope 확장 허용. 신규 npm 메이저 활성 메이저 호환 포맷 변경 (예: npm 12 메이저 lockfileVersion 4 도입 — 가상 시나리오) 시 §스코프 규칙 grep-baseline G3 재실측 + §변경 이력 row 추가.
- **grep-baseline** (HEAD=`b76dc02`, 2026-05-17 — REQ-090 흡수 시점 실측):
  - (G1) **[`package.json` 메이저 정합 채널 baseline]** `node -e "const p=require('./package.json'); console.log(JSON.stringify({engines_npm: p.engines && p.engines.npm || null, packageManager: p.packageManager || null}))"` → `{"engines_npm":null,"packageManager":null}` (HEAD=`b76dc02` 실측 MISS — 본 spec 회복 대상 zero-point). 보조 grep: `grep -nE "\"packageManager\":|\"npm\":" package.json` → 0 hit. 회복 효능 = 양 채널 중 1+ non-null (FR-01 효능 회복 목표).
  - (G2) **[CI 채널 npm 메이저 추종 baseline]** `grep -nE "npm-version|node-version-file|corepack" .github/workflows/ci.yml` → 0 hit (HEAD=`b76dc02` 실측 MISS). `setup-node@v6` step 박제 (`with.node-version: '24'` 만) — bundled npm 자동 유도이나 메이저 추종 채널 명시 박제 0. 회복 효능 = 3 채널 (`with.npm-version` 명시 / `node-version-file` / corepack 활성화) 중 1+ hit (FR-02 효능 회복 목표).
  - (G3) **[`lockfileVersion` 메이저 포맷 baseline]** `grep -nE "lockfileVersion" package-lock.json` → 1 hit @`:4` 값 `2` (HEAD=`b76dc02` 실측 MISS — 본 spec 회복 대상 zero-point). 현 환경 (setup-node@v6 + Node 24 LTS bundled npm 메이저) 활성 메이저 호환 포맷은 lockfileVersion 3 — 격차 1 (downgrade 회귀 위험 활성). 회복 효능 = lockfile rewrite 회수 후 값 == FR-01 채널 활성 메이저 활성 메이저 호환 포맷 (FR-03 효능 회복 목표).
  - (G4) **[FR-06 시점 비의존 자기 검증]** `awk '/^## 역할/,/^## 테스트 현황/' "<SPEC>" | grep -cE "npm\s+(7|8|9|10|11)|lockfileVersion\s*:\s*(2|3)|: 2 |\"2\"|\"3\""` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 구체 npm 메이저 숫자 또는 lockfileVersion 구체 값 박제 0 — 수치는 §스코프 규칙 grep-baseline + §변경 이력 한정). HEAD=`b76dc02` 박제 시점 PASS.
  - (G5) **[FR-07 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' "<SPEC>" | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 5+ 수단 카테고리 후보 라벨 부여 0 — 백틱 코드 식별자 면제 정밀 패턴). HEAD=`b76dc02` 박제 시점 PASS.
  - (G2') **[CI 채널 토큰 baseline 재실측]** `grep -cE "npm-version|node-version-file|corepack" .github/workflows/ci.yml` → **0 hit** (HEAD=`ce15908`, 2026-08-24). 2026-05-18 에 1 hit 이던 `ci.yml:22 npm-version: '10'` 은 `actions/setup-node` 입력 집합에 없는 키였고 커밋 `e1d3501` 에서 제거됐다. **이 grep 은 (I2) 의 판정 근거가 아니다** — hit 수와 실행 메이저는 독립이다 (I10). 본 baseline 은 감사 기록으로만 보존한다.
  - (G6) **[선언 ↔ 실행 메이저 baseline]** `node -e "const p=require('./package.json'); const d=String(p.packageManager||p.engines.npm).match(/\d+/)[0]; const r=require('child_process').execSync('npm -v').toString().match(/\d+/)[0]; console.log('declared='+d,'runtime='+r); process.exit(d===r?0:1)"` → **rc=1 / `declared=10 runtime=11`** (HEAD=`ce15908` 실측 MISS — 본 개정의 회복 대상 zero-point). 환경: Node `v24.19.0` (CI `node-version: '24'` 동일 메이저), 번들 매니저 `11.17.0`. 회복 효능 = rc=0.
  - (G7) **[판정 채널 런타임 측정 baseline]** `grep -cE "npm -v|npm --version" scripts/check-package-manager-coherence.sh` → **0 hit** + `grep -c "ci.yml" scripts/check-package-manager-coherence.sh` → **0 hit** (HEAD=`ce15908` 실측 MISS). 게이트가 실행 채널을 참조하는 경로 0 — 회복 효능 = 1 hit 이상.
  - (G8) **[진단 stdout baseline]** `npm run --silent check:npm-coherence` → rc=0, stdout `package-manager coherence: engines.npm=>=10 packageManager=npm@10.9.2 aligned` — 실측 메이저 토큰 0 hit (`grep -cE "runtime=|실측"` → 0). 회복 효능 = 선언·실측 동시 출력 + 격차 시 rc≠0.
- **rationale**: (G1) `package.json` 메이저 정합 채널 baseline — 본 spec 회복 대상 zero-point. (G2) CI 채널 추종 baseline — `setup-node` 의 명시 추종 채널 0 hit, bundled npm 암시 유도만. (G3) `lockfileVersion` 메이저 포맷 baseline — 본 spec 회복 대상 zero-point + 격차 1 (downgrade 회귀 위험). (G4) RULE-07 시점 비의존 자기 검증 — 본 spec 본문에 구체 메이저 숫자 / lockfileVersion 값 박제 0 검증. (G5) RULE-07 수단 중립 자기 검증 — 5+ 수단 카테고리 후보 라벨 부여 0 검증. 매트릭스: 4 baseline 채널 (G1 `package.json` 채널 + G2 CI 채널 + G3 lockfile 채널 + G4/G5 본 spec 본문 자기 검증) — 회복 후 G1~G3 PASS + G4/G5 박제 시점 PASS (본 spec 자체 효능 박제만으로 충족).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-24 | inspector 214차 tick (REQ-20260824-002 흡수) / HEAD=`ce15908` | **거짓 `[x]` 되돌림 + 판정 근거 실행성 축 추가.** (I2)(I4)(I5) + (Must FR-02)(Must FR-04) 를 `[x]` → `[ ]` 로 되돌렸다 — 근거: 선언 메이저 10 ↔ 실행 매니저 `11.17.0` 격차 1 이 현존하고, 이 상태에서 `npm run check:npm-coherence` 는 rc=0 `aligned` 를 출력한다. 2026-05-18 에 5 marker 를 플립한 근거는 `ci.yml:22 npm-version: '10'` 의 grep 1 hit 이었으나 그 입력 키는 `actions/setup-node` 입력 집합에 없어 실행 효력이 0 이었다 — **박제 시점에도 (I2)/FR-02 는 거짓이었다.** 해당 라인은 커밋 `e1d3501` 에서 제거돼 현 HEAD 에 부재 (`grep -cE "npm-version|node-version-file|corepack" .github/workflows/ci.yml` → 0 hit). 신규: §역할 방어 대상 명시 (RULE-07 §주제 우선순위 2), §공개 인터페이스 측정 명령 (D)(E)(F), §동작 (I10) 판정 근거의 실행성 · (I11) 격차의 실패 전이 · (I12) 워크플로 입력 키 유효성 · (I13) 진단 출력 양측 동시 박제, §스코프 규칙 (G2')(G6)(G7)(G8) 실측 baseline, §수용 기준 Must FR-08 / FR-09. FR 번호 공백 (FR-05/06/07) 은 자기 참조·자명 부류 강등 자리 — §참고 §미측정·비판정 항목에 평서문 보존 (RULE-07 §수용 기준 문장 규약). **blue baseline 정정 필요**: `specs/30.spec/blue/foundation/package-manager-major-coherence.md` 의 `:54`(I2) `:56`(I4) `:65`(FR-02) 는 현 HEAD 에서 거짓인 `[x]` 를 유지한다. blue 는 inspector writer 영역이 아니므로 본 green 승격 (planner mv) 이 정정 경로다 — §참고 §blue baseline 정정 요구. | §역할 + §공개 인터페이스 + §동작 + §회귀 중점 + §테스트 현황 + §수용 기준 + §스코프 규칙 + §참고 |
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
  - `actions/setup-node` 공식 — 입력 집합 정의 (`https://raw.githubusercontent.com/actions/setup-node/main/action.yml` `inputs`) + 사용법 (`https://github.com/actions/setup-node#usage`). **`npm-version` 은 이 집합에 없다** (2026-08-24 확인, 12종).
  - npm lockfile 공식 — lockfileVersion 메이저 별 호환성 표: `https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json#lockfileversion`.
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G4 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`node -e` 1-line 진단 + `grep -nE` G1/G2/G3 단일 명령) · incident 귀속 부재 (REQ-090 §배경 baseline audit 는 §변경 이력 / §참고 / §스코프 규칙 한정). 수단 박제 0 (G5 0 hit 자기 검증).
  - RULE-06: grep-baseline 5 gate (G1~G5) 실측 박제 (HEAD=`b76dc02`) + `expansion` `허용`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/package-manager-major-coherence.md` create).
  - spec-carve-precondition (REQ-085): §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 정합.

### blue baseline 정정 요구 (운영자 판단 근거)
현 `specs/30.spec/blue/foundation/package-manager-major-coherence.md` 는 아래 3 marker 를 `[x]` 로 유지한다. 셋 다 **현 HEAD 에서 거짓**이다.

| blue 라인 | 박제 내용 | 현 HEAD 실측 |
|---|---|---|
| `:54` (I2) | "`ci.yml:22` `npm-version: '10'` 1 hit 박제 — 재실측 PASS" | 해당 라인 부재 (`e1d3501` 제거). grep 0 hit. 실행 메이저 11 ↔ 선언 10 — 격차 1. |
| `:56` (I4) | "4축 동시 격차 0 — … + `ci.yml:22 npm-version: '10'` + …" | 4축 중 CI 축 위반. 3/4. |
| `:65` (Must FR-02) | "`npm -v` 출력 메이저 == FR-01 채널 메이저 (10 == 10) 격차 0" | `npm -v` = `11.17.0` → 11 ≠ 10. 이 명제는 `0ed832c` 박제 시점에도 거짓이었다 (무효 입력 키). |

세 marker 는 **효과가 아니라 토큰의 존재**로 플립됐다 (`grep -nE "npm-version|node-version-file|corepack" ci.yml` → 1 hit). 토큰 hit 수와 실행 메이저는 독립 변수이므로, 그 grep 은 어떤 실행 상태에서도 동일한 답을 낸다.

**inspector 는 blue 를 편집하지 않는다** (RULE-01 — blue 는 planner mv only). 정정 경로는 둘 중 하나다:
1. 본 green spec 이 Must 4건 회복 후 planner 에 의해 blue 로 승격 — blue 의 거짓 marker 가 덮어써진다 (정규 경로).
2. 운영자가 즉시 정정을 원하면 RULE-05 경로로 blue 를 `50.blocked/spec/` 격리 후 재투입.

회복 전까지 blue 는 거짓 `[x]` 를 유지하므로, **`package-manager-major-coherence` 의 blue marker 를 근거로 한 판단은 이 절을 함께 읽어야 한다.**

### 미측정·비판정 항목
> 본 spec 의 자격 근거는 RULE-07 §주제 우선순위 2 (기존 자동 게이트로 검출되지 않는 silent regression 방어 — §역할 §방어 대상에 명시).

RULE-07 §수용 기준 문장 규약에 따라 체크박스에서 강등한 항목 (감사성 보존, promote 비차단).

- (구 Must FR-05, 직교 정합 박제) 본 spec 의 축 집합은 REQ-079 / REQ-066 / REQ-068 / REQ-035 / REQ-037 / REQ-089 과 직교한다 — 문서 자기 서술로 rc 판정 대상이 아니다 (자명 명제 부류). §동작 8 에 불변식으로 잔존.
- (구 Should FR-06, 시점 비의존 자기 검증) · (구 Should FR-07, 수단 라벨 0) — spec 자기 본문에 대한 grep 이며 판정 대상이 시스템이 아니라 본 문서다. §테스트 현황 (I6)(I7) + §스코프 규칙 (G4)(G5) 에 명령과 결과를 보존한다.
- (구 NFR-01 ~ NFR-05) 본문 수치 박제 0 · 흡수 위치 결정 근거 · 시점 비의존 · 직교 박제 · RULE-01 writer 정합 — 전부 문서 메타 자기 서술 (자명 명제 부류). 평서문으로 여기에 보존한다.
- (주입 부류 — 이관 필수) **격차 인위 주입 시 rc≠0 검출**: 선언 메이저 또는 실행 메이저를 한쪽만 바꿔 격차를 주입했을 때 판정 채널이 rc≠0 을 내는지의 검증. 고장을 내야 판정되므로 spec 체크박스가 아니다. **이관처: 본 spec 의 FR-08 / FR-09 회복 task (`scripts/check-package-manager-coherence.sh` 수정 = 게이트 수정 task) 의 DoD** — RULE-06 §게이트 실효 검증, `RULE-04` notes `injection: N/N detect` 필수. 검출 방향 2 (선언 상향 / 런타임 상향) 전수 주입.
- (판정 채널 부재 — 채널 부착 선행) **(I12) 워크플로 입력 키 유효성**: 현 상태는 충족이나 저장소에 판정 채널이 없다 (`actionlint` 등 미도입). RULE-07 §promote 4 에 따라 "채널 부착 task 발행" 이 선행 조건이며 promote 차단 사유는 아니다. 채널 후보는 수단 중립 — 본 spec 은 지정하지 않는다.

### 소비 req (본 개정)
- `specs/60.done/2026/08/24/req/20260824-ci-runtime-npm-major-effective-verification.md` (REQ-20260824-002).
- 상류 followup: `specs/60.done/2026/08/24/followups/20260824-0748-ci-npm-version-input-removal-i2-channel-gap.md`.
- 외부 출처 재확인 (2026-08-24): `https://raw.githubusercontent.com/actions/setup-node/main/action.yml` `inputs` 12종에 `npm-version` 부재. CI #226 Annotations 경고 본문과 동일 목록.
