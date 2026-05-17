# Node 런타임 메이저 3축 정합 — `engines.node` 존재 + CI `with.node-version` + 로컬 dev pin 동시 박제

> **위치**: `package.json` (`engines.node`), `.github/workflows/ci.yml` (`actions/setup-node with.node-version`), repo root pin 파일 (`.nvmrc` / `.node-version` / `.tool-versions`).
> **관련 요구사항**: REQ-20260517-079
> **최종 업데이트**: 2026-05-17 (by inspector — Phase 1 reconcile I2 marker 1건 self-ack 플립 — CI `with.node-version` 박제 본 spec 발행 시점 PASS marker 회수)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`79d28cc` 박제 시점).

## 역할
프로젝트의 Node.js 런타임 메이저 정합을 **3축 동시** 박제하는 시스템 불변식: (a) `package.json:engines.node` 키 존재 + (b) `.github/workflows/ci.yml` 의 `actions/setup-node` `with.node-version` + (c) repo root 의 로컬 dev pin 채널 (`.nvmrc` / `.node-version` / `.tool-versions` 중 1+) — 세 축의 메이저 격차 0. `foundation/ci.md` §3 호환성 원칙의 "`engines.node` 존재 시" 조건부 박제를 **존재 박제** 로 강화 + 로컬 dev 채널을 신규 박제 — 그 spec 과 보완 관계 (CI 단일 채널 vs 3축 동시 박제). 의도적으로 하지 않는 것: 특정 Node 메이저 (22 vs 24) 본문 박제 (NFR-01 정합), CI ↔ 로컬 동기 수단 (`setup-node@vN` `node-version-file` 입력 vs renovate 자동화 vs 수동 sync) 선정 (task 위임 + 수단 라벨 0), Node 메이저 상향 (bump) 운영 (`dependency-bump-gate` 영역), `engines.node` `--engine-strict` 강제 정책 (npm 설정 영역, 별 req 후보), `engines.npm` / `packageManager` 키 정합 (별 축 — 패키지 매니저 메이저), 로컬 dev pin 파일 선택 (`.nvmrc` vs `.node-version` vs `.tool-versions` 어느 쪽이든 수용 — 수단 중립).

## 공개 인터페이스
- 측정 대상 파일:
  - `package.json` — `engines.node` 키 (없으면 FR-01 위반).
  - `.github/workflows/ci.yml` — `actions/setup-node` step 의 `with.node-version` 값.
  - repo root — `.nvmrc` 또는 `.node-version` 또는 `.tool-versions` 중 1+ (없으면 FR-03 위반).
- 측정 명령:
  - (A) `engines.node` 존재: `node -e "const p=require('./package.json'); process.exit(p.engines && p.engines.node ? 0 : 1)"` → exit 0.
  - (B) 로컬 pin 존재: `ls .nvmrc .node-version .tool-versions 2>/dev/null | wc -l` → ≥ 1.
  - (C) 3축 격차 진단: 1-line node 스크립트 (또는 동등 shell pipeline) 로 3축 메이저 추출 후 동치 비교, 격차 카테고리 (`engines.node 부재` / `local-pin 부재` / `major 격차 N`) 검출.

## 동작
1. **(I1) `engines.node` 존재 박제**: `package.json` 객체에 `engines.node` 키가 정의되어 있다. 값은 메이저 범위 (semver range 표현 — 예: `">=N"` 또는 `"N.x"`). 존재 자체가 npm install 시 호환성 검증 채널 (`--engine-strict=true` 옵션 또는 기본 경고) 의 활성 조건.
2. **(I2) CI `with.node-version` 메이저 박제**: `.github/workflows/ci.yml` 의 `actions/setup-node` step 에 `with.node-version: '<N>'` 형태로 메이저 값이 박제된다. 이 채널의 메이저 값은 `foundation/ci.md` §2 Node 버전 원칙 (LTS 최신 지목) 의 운영 결과.
3. **(I3) 로컬 dev pin 채널 존재**: repo root 에 `.nvmrc` / `.node-version` / `.tool-versions` 중 1+ 파일 존재. 선택 채널은 자유 (nvm / asdf / volta 등 toolchain 매니저 무관) — 본 spec 은 채널 종류를 강제하지 않는다.
4. **(I4) 3축 메이저 격차 0**: (a) `engines.node` semver range 의 최하한 메이저 == (b) CI `with.node-version` 메이저 == (c) 로컬 dev pin 메이저. 세 채널 어디서든 격차 1+ 발생 시 본 불변식 위반. 격차 발생 시 환경 격차 회귀 (로컬 PASS / CI FAIL 또는 역) 가능성 활성.
5. **(I5) 위반 검출 단일성**: FR-01~04 의 격차가 어느 1축에라도 존재할 때, 단일 진단 명령 (1 명령 또는 1-line node 스크립트) stdout 출력에서 격차 카테고리 (`engines.node 부재` / `local-pin 부재` / `major 격차 N`) 가 grep 가능한 라벨로 식별된다. 본 명령은 CI step 또는 pre-push hook 또는 `scripts.<name>` npm script 로 자동 실행 가능.
6. **(I6) 시점 비의존성 (RULE-07)**: 본 spec 본문 어디서도 구체 Node 메이저 숫자 (예: "22", "24") 박제 0. 메이저 숫자는 §변경 이력 메타 부속 1회 + §스코프 규칙 baseline 한정 (감사성 — `foundation/ci.md` NFR-02 동일 패턴).
7. **(I7) 수단 중립**: 격차 해소 수단 — (a) `actions/setup-node@vN` 의 `node-version-file: '.nvmrc'` 입력 사용 (CI ↔ 로컬 pin 단일 진실원), (b) renovate / dependabot 자동화 (3축 동시 PR), (c) 수동 sync script — 어느 쪽이든 본 효능 충족. 본 spec 은 수단 라벨 0.
8. **(I8) 직교 정합**: 본 spec 의 3축 정합 게이트는 `foundation/ci.md` §1 (action floating 태그) 및 §2 (LTS 최신 원칙) 와 직교 — 어느 한 축이 다른 축을 자동 충족시키지 않는다. `dependency-bump-gate.md` (REQ-035) 의 dep bump 직후 게이트와도 직교 (Node 메이저 bump 시점 vs 3축 정합 시점).

### 회귀 중점
- `package.json` 에서 `engines.node` 키가 제거되면 (I1) 위반 — npm install 호환성 검증 채널 비활성.
- 로컬 dev pin 파일 (`.nvmrc` 등) 이 모두 제거되면 (I3) 위반 — 신규 contributor 의 Node 메이저 임의성 → 비결정적 install 결과.
- `.github/workflows/ci.yml` 의 `with.node-version` 메이저가 `engines.node` 또는 로컬 pin 과 격차 1+ 발생 시 (I4) 위반 — 환경 격차 회귀 활성.
- `actions/setup-node@vN` 메이저 floating 추종 (REQ-023 / REQ-012) 이 자동으로 (I4) 를 충족시키지 않음 — `.nvmrc` / `engines.node` 가 별 채널이므로 별도 sync 필요. 자동화 부재 시 격차 누적.
- `engines.npm` / `packageManager` 키 도입 시 본 spec 의 3축 정합 게이트와 직교 — 별 spec 후보 (패키지 매니저 메이저 정합).

## 의존성
- 외부: Node.js LTS 릴리스 (Even 메이저), npm `engines.node` 호환성 검증 채널, `actions/setup-node` action, nvm / asdf / volta 등 toolchain 매니저.
- 내부: `package.json` (`engines.node`), `.github/workflows/ci.yml` (`actions/setup-node`), repo root pin 파일.
- 역의존: `foundation/ci.md` §3 호환성 원칙 (본 spec 이 "존재 시" 조건을 존재 박제로 강화), `dependency-bump-gate.md` (REQ-035 — Node 메이저 bump 직후 게이트, 본 spec 과 직교).

## 테스트 현황
- [ ] (I1) `engines.node` 존재 게이트: `node -e "const p=require('./package.json'); process.exit(p.engines && p.engines.node ? 0 : 1)"` → exit 0. 현재 baseline: exit 1 (HEAD=`79d28cc` 실측, **FR-01 위반**). task 수행 후 marker 플립.
- [x] (I2) CI `with.node-version` 메이저 박제: `grep -nE "node-version:" .github/workflows/ci.yml` → 1 hit @`.github/workflows/ci.yml:21` (HEAD=`472611f` 실측 PASS, `79d28cc` baseline 무변동 — `foundation/ci.md` §2 정합). self-ack — 본 spec 박제 시점 PASS marker 회수.
- [ ] (I3) 로컬 dev pin 존재: `ls .nvmrc .node-version .tool-versions 2>/dev/null | wc -l` ≥ 1. 현재 baseline: 0 (HEAD=`79d28cc` 실측, **FR-03 위반**). task 수행 후 marker 플립.
- [ ] (I4) 3축 메이저 격차 0: 진단 명령 stdout 에 격차 카테고리 0 hit. 현재 baseline: `engines.node 부재` + `local-pin 부재` 2 hit (HEAD=`79d28cc` 실측, **FR-02 + FR-04 위반 — FR-01·FR-03 위반에 종속**). task 수행 후 marker 플립.
- [ ] (I5) 위반 검출 단일성: 진단 명령 1 명령 박제 + grep 가능한 라벨 박제. 본 spec 박제 자체로 정합 박제 가능 (§동작 5 명령 정의) — task 단 진단 명령 실현 후 marker 플립.
- [x] (I6) 시점 비의존성: 본 spec 본문 (§역할 + §동작 + §회귀 중점) 어디서도 구체 Node 메이저 숫자 박제 0 — `grep -nE "Node\s+(2[0-9]|18|19)" specs/30.spec/green/foundation/node-version-3axis-coherence.md` → 0 hit in 본문 (감사성 §변경 이력 메타는 별도). HEAD=`79d28cc` 박제 시점 PASS.
- [x] (I7) 수단 중립: §역할 + §동작 7 에 수단 후보 3 카테고리 박제, 라벨 0. RULE-07 정합.
- [x] (I8) 직교 정합: §역할 + §동작 8 에 `foundation/ci.md` §1·§2 + `dependency-bump-gate.md` 와의 직교 평서 박제. 본 spec 박제 자체로 정합 박제.

## 수용 기준
- [ ] (Must, FR-01) `engines.node` 존재 박제 효능 — task 수행 후 `node -e "const p=require('./package.json'); process.exit(p.engines?.node ? 0 : 1)"` → exit 0. 현재 baseline: exit 1.
- [ ] (Must, FR-02) `engines.node` 메이저 == CI `with.node-version` 메이저. FR-01 도입에 종속.
- [ ] (Must, FR-03) 로컬 dev pin 채널 1+ 존재 — `ls .nvmrc .node-version .tool-versions 2>/dev/null | wc -l` ≥ 1.
- [ ] (Must, FR-04) 로컬 dev pin 메이저 == FR-02 의 2채널 메이저 (3축 격차 0). FR-01·FR-03 도입에 종속.
- [ ] (Should, FR-05) 위반 검출 단일성 — 1 명령 stdout 에서 격차 카테고리 라벨 grep 가능. task 단 진단 명령 실현 후 marker 플립.
- [x] (Should, FR-06) 본 효능 박제 위치 — inspector 결정으로 별도 spec (`foundation/node-version-3axis-coherence.md`) 분리. `foundation/ci.md` 흡수 대비 (a) 3축 동시 박제로 본 spec 단독 게이트 단일성 + (b) `foundation/ci.md` §3 "존재 시" 조건부 보존 (정합 강화는 본 spec 책임) + (c) 변경 영향 분리 (Node 메이저 정합 vs CI workflow 일반) 효능.
- [x] (Must, FR-07) 시점 비의존 — 본 spec 본문 (§역할 + §동작 + §회귀 중점) 에 구체 Node 메이저 숫자 박제 0. §변경 이력 메타 / §스코프 규칙 baseline 한정. `grep -nE "Node\s+(2[0-9]|18|19)" specs/30.spec/green/foundation/node-version-3axis-coherence.md` 본문 한정 0 hit (§스코프 규칙 gate (G7) 박제).
- [x] (Must, FR-08) 수단 라벨 0 — 본 spec 본문에 "기본값" / "권장" / "우선" / "default" / "best practice" 부여 0. `grep -nE "기본값|권장|우선|default|best practice" specs/30.spec/green/foundation/node-version-3axis-coherence.md` 본문 한정 0 hit (§스코프 규칙 gate (G8) 박제).
- [x] (NFR-01) 시점 비의존 — FR-07 동치. 본문 박제 0 + 감사성 메타 1회 부속 (§변경 이력) 정합.
- [x] (NFR-02) 게이트 단일성 — §동작 5 위반 검출 단일성 평서. 진단 명령 1건 박제 (실현은 task 위임).
- [x] (NFR-03) RULE-07 정합 — 결과 효능 (3축 메이저 격차 0 + `engines.node` 존재 + local-pin 존재) 만 박제. 1회성 진단 / 릴리스 귀속 patch 0.
- [x] (NFR-04) 직교 정합 — §동작 8 + §회귀 중점 에 `foundation/ci.md` §1·§2 + `dependency-bump-gate.md` 와의 직교 평서.
- [ ] (NFR-05) 환경 재현성 — 본 효능 도입 후 신규 contributor 의 `nvm use` / `asdf install` → `npm ci` 가 `engines.node` 호환 경고 0 + CI 동일 Node 메이저 사용. task 수행 후 hook-ack.

## 스코프 규칙
- **expansion**: N/A (3축 동시 박제 게이트 — task 발행 시점에 planner 가 scope 규칙 재계산).
- **grep-baseline** (HEAD=`79d28cc`, 2026-05-17 — REQ-079 흡수 시점 실측):
  - (G1) **[engines.node 존재]** `node -e "const p=require('./package.json'); process.exit(p.engines?.node ? 0 : 1)"` → **exit 1** (HEAD=`79d28cc` 실측 MISS — FR-01 위반 baseline).
  - (G2) **[engines.node grep baseline]** `grep -c "\"engines\"" /Users/park108/Dev/log/package.json` → **0 hit** (`engines` 키 자체 부재 박제).
  - (G3) **[CI with.node-version 박제]** `grep -nE "node-version:" .github/workflows/ci.yml` → **1 hit** @`.github/workflows/ci.yml:21` (HEAD=`79d28cc` 실측 PASS — `foundation/ci.md` §2 정합).
  - (G4) **[로컬 dev pin 존재]** `ls .nvmrc .node-version .tool-versions 2>/dev/null | wc -l` → **0** (HEAD=`79d28cc` 실측 MISS — FR-03 위반 baseline).
  - (G5) **[운영자 로컬 Node 메이저]** `node -v` → 메이저 N (HEAD=`79d28cc` 측정 시점 운영자 환경) — CI 메이저 (G3) 와 격차 1 (FR-04 위반 baseline — FR-01·FR-03 위반에 종속). 구체 메이저 숫자는 §변경 이력 메타 1회 부속 (RULE-07 NFR-01 정합).
  - (G6) **[3축 격차 카테고리 baseline]** 현 시점 진단 명령 시뮬레이션 (`engines.node 부재` + `local-pin 부재` 2 카테고리 + `major 격차 N` 1 카테고리 = 총 3 카테고리 활성). task 단 진단 명령 실현 후 baseline 재측정.
  - (G7) **[FR-07 시점 비의존성 자기 검증]** `awk '/^## 역할/,/^## 변경 이력/' specs/30.spec/green/foundation/node-version-3axis-coherence.md | grep -nE "Node\s+(2[0-9]|18|19)"` → **0 hit** (본 spec 본문 한정 — §역할 + §동작 + §회귀 중점 + §의존성 + §테스트 현황 + §수용 기준 + §스코프 규칙 어디서도 구체 Node 메이저 숫자 박제 0). HEAD=`79d28cc` 박제 시점 실측 PASS.
  - (G8) **[FR-08 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/node-version-3axis-coherence.md | grep -nE "기본값|권장|우선|default|best practice"` → **0 hit** (본 spec 본문 §역할 + §동작 + §회귀 중점 한정 — 수단 후보 라벨 부여 0; gate 정의 자체 라인 — §수용 기준 + 본 §스코프 규칙 — 은 자기 참조 평서이므로 제외). HEAD=`79d28cc` 박제 시점 실측 PASS.
- **rationale**: (G1)(G2)(G4) 본 spec 핵심 회복 대상 baseline — FR-01 + FR-03 위반 즉시 식별. (G3) 본 spec 박제 시점 PASS — `foundation/ci.md` §2 정합. (G5) 운영자 로컬 Node 메이저는 본 spec 본문 박제 0 (NFR-01 정합), §변경 이력 메타 1회 부속 한정. (G6) 진단 명령 카테고리 baseline — task 단 실현 후 재측정. (G7)(G8) RULE-07 정합 자기 검증.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-079 흡수) / pending (HEAD=`79d28cc`) | 최초 박제 — Node 런타임 메이저 3축 동시 정합 (engines.node 존재 + CI with.node-version + 로컬 dev pin) 8 축 (I1~I8) 게이트. baseline: engines.node 부재 (G1 exit 1 / G2 0 hit) + 로컬 pin 부재 (G4 0 file) + CI Node 24 (G3 `.github/workflows/ci.yml:21`) + 운영자 로컬 Node 22 (메이저 격차 1). FR-06 inspector 결정: 별도 spec 분리 (foundation/ci.md 흡수 대비 효능 — 게이트 단일성 + ci.md §3 보존 + 변경 영향 분리). consumed req: `specs/20.req/20260517-node-runtime-version-3axis-coherence.md` (REQ-079) → `60.done/2026/05/17/req/` mv. 선행 done req (메타 패턴): REQ-20260421-023 (ci.md 출처) + REQ-20260421-034 (재발행 — §3 조건부 보존) + REQ-20260517-061 (toolchain) + REQ-20260517-063 (runtime dep) + REQ-20260517-073 (node_modules). RULE-07 자기검증 — (I1)~(I8) 모두 평서형·반복 검증 가능 (`node -e` + `grep` + `ls` 단일 명령)·시점 비의존 (구체 Node 메이저 본문 박제 0 — G7 0 hit)·incident 귀속 부재·수단 중립 (격차 해소 수단 3 카테고리 라벨 0 — G8 0 hit). RULE-06 §스코프 규칙 8 gate (G1~G8) 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/node-version-3axis-coherence.md` create). | all |
| 2026-05-17 | inspector (Phase 1 reconcile, self-ack) / HEAD=`472611f` | (I2) marker 1건 `[ ]→[x]` 플립. self-ack 근거: §테스트 현황 본문 "HEAD=`79d28cc` 실측 PASS — 본 spec 박제 시점 PASS — 마커 즉시 `[x]`" 평서 + §스코프 규칙 (G3) "실측 PASS" + `foundation/ci.md` §2 정합 — 본 spec 발행 시점 PASS marker 회수 (직전 세션 누락분). HEAD=`472611f` 재실측 `grep -nE "node-version:" .github/workflows/ci.yml` → 1 hit @`:21` 무변동. 본 spec 본문 / 게이트 / baseline 수치 변경 0 — marker 정합 회수만 박제. 잔여 (I1)(I3)(I4)(I5) marker 는 TSK-20260517-14 (`node-version-3axis-coherence-recover`) 회수 대기 유지. | §테스트 현황 (I2) |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-node-runtime-version-3axis-coherence.md` (REQ-079 — 본 세션 mv).
- **선행 done req (메타 패턴 공유)**:
  - `specs/60.done/2026/04/21/req/20260421-ci-foundation-spec-ltsnode-floating-tag.md` (REQ-20260421-023) — `foundation/ci.md` 3 요소 선언 출처.
  - `specs/60.done/2026/04/21/req/20260421-ci-foundation-spec-reissue-runbook-separation.md` (REQ-20260421-034) — `foundation/ci.md` 재발행 (§3 조건부 박제 보존 — 본 spec 의 강화 출발점).
  - `specs/60.done/2026/04/21/req/20260421-ci-node20-deprecation-remediation.md` (REQ-20260421-012) — Node 메이저 deprecation 운영 (별 축).
  - `specs/60.done/2026/05/17/req/20260517-runtime-dep-version-coherence.md` (REQ-20260517-063) — React 계열 dep 메이저 3축 정합 메타 패턴.
  - `specs/60.done/2026/05/17/req/20260517-toolchain-version-coherence.md` (REQ-20260517-061) — TypeScript devDep ↔ installed ↔ tsconfig 정합.
  - `specs/60.done/2026/05/17/req/20260517-node-modules-extraneous-coherence.md` (REQ-20260517-073) — `node_modules` ↔ declared deps 등식 (직교).
- **관련 spec** (직교 / 보완):
  - `specs/30.spec/blue/foundation/ci.md` §3 호환성 원칙 (`:19`) — 본 spec 이 "존재 시" 조건을 존재 박제로 강화. §1 (action floating 태그) + §2 (LTS 최신 원칙) 와 직교.
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) — Node 메이저 bump 직후 회귀 0 게이트 (직교).
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — CI workflow typecheck step 존재 (직교).
- **외부 레퍼런스**:
  - Node.js 릴리스 스케줄 — `https://nodejs.org/en/about/previous-releases` (Even 메이저 = LTS).
  - npm `engines.node` 동작 — `https://docs.npmjs.com/cli/v10/configuring-npm/package-json#engines`.
  - `actions/setup-node` `node-version-file` 입력 — `https://github.com/actions/setup-node#supported-version-syntax` (`.nvmrc` / `.node-version` / `.tool-versions` / `package.json` 인식).
  - asdf `.tool-versions` — `https://asdf-vm.com/manage/configuration.html#tool-versions`.
- **감사성 메타 (1회 부속, NFR-01 정합)**: HEAD=`79d28cc` 측정 시점 실측 — CI `with.node-version` 메이저 = 24, 운영자 로컬 메이저 = 22 (격차 1). 본문 박제 0 — 본 §참고 한정.
- **RULE 준수**:
  - RULE-07: 8 불변식 (I1~I8) 모두 시점 비의존 (G7 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`node -e` + `grep` + `ls` 1-line) · incident 귀속 부재. 수단 박제 0 (G8 0 hit 자기 검증).
  - RULE-06: grep-baseline 8 gate (G1~G8) 실측 박제 (HEAD=`79d28cc`).
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/node-version-3axis-coherence.md` create).
