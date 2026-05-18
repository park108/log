# `scripts/check-*.sh` 5 진단 script fail-fast prelude 3 옵션 토큰 cross-script 정합 — `set -e` × `set -u` × `set -o pipefail` 결과 효능 시스템 불변식

> **ID**: REQ-20260518-027
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요

`scripts/check-*.sh` 5 건의 진단 script (deps / node-version / package-manager / spec / vite-env coherence) 의 셸 prelude 가 fail-fast 3 옵션 (`set -e` errexit + `set -u` nounset + `set -o pipefail`) 중 어느 부분 집합을 채택하든 — **5 script 전원이 동일 부분 집합을 박제** 한다는 cross-script 토큰 동치 결과 효능 + **부분 집합이 fail-fast 충분 조건** (errexit 1+ axis 활성) 을 만족한다는 시스템 불변식을 spec 으로 박제할 후보로 요청. 1회성 patch 명세 아님 — 반복 검증 가능한 prelude 토큰 정합 axis. 부분 집합 선정 (3 옵션 풀 채택 vs `set -e` + `set -u` 2 옵션 채택 vs `set -u` 단독 + 명시적 `|| true` 회피 이디엄) 자체는 inspector/planner 영역.

## 배경

- 현 시점 baseline (HEAD 작업 트리, 2026-05-18 측정):
  - `scripts/check-deps-coherence.sh:1` `#!/usr/bin/env bash` + `:14` `set -u`
  - `scripts/check-node-version-coherence.sh:1` `#!/usr/bin/env bash` + `:22` `set -u`
  - `scripts/check-package-manager-coherence.sh:1` `#!/usr/bin/env bash` + `:18` `set -u`
  - `scripts/check-spec-coherence.sh:1` `#!/usr/bin/env bash` + `:13` `set -u`
  - `scripts/check-vite-env-coherence.sh:1` `#!/usr/bin/env bash` + `:15` `set -u`
  - 5/5 = `set -u` 단독. 0/5 = `set -e`. 0/5 = `set -o pipefail`.
- 격차 신호: 5 script 의 task plan (`60.done/2026/05/17/task/node-modules-extraneous-ci-gate/TSK-20260517-09-...md:22` "α: `scripts/check-deps-coherence.sh` 셸 스크립트. **`set -euo pipefail`** + ...") 은 `set -euo pipefail` (3 옵션 풀 채택) 을 명세하였으나 현물 5/5 가 `set -u` 단독 = 박제 의도 ↔ 현물 drift 2 axis (`set -e` + `set -o pipefail` 부재).
- 실 위험 채널 (vacuous-pass 표면):
  - (a) errexit 부재 — 각 script 의 중간 명령 (예: `check-deps-coherence.sh` 의 `npm ls --depth=0 2>&1` 캡처 + `grep -cE " extraneous$"` + `node -e "..."` 멀티 라인 측정) 중 어느 한 명령이 rc ≠ 0 으로 실패해도 script 가 계속 진행하여 마지막 명령 (`exit 0` 분기 또는 진단 echo) 의 rc 가 그대로 외부 채널 (CI step / husky hook / `npm run check:<name>` wrapper) 로 노출 → fail-fast 우회. `set -u` 단독은 **undefined variable** 만 차단할 뿐, 명령 실패 자체는 무시.
  - (b) pipefail 부재 — `npm ls --depth=0 2>&1 | grep -cE " extraneous$"` 형태의 pipe 가 `npm ls` 측 실패 (예: `node_modules` 누락) 시 `grep -c` 의 rc=0 (또는 1) 가 최종 rc 로 결정 → 측정 의도와 무관한 vacuous 0 출력 → 게이트 우회. pipefail 박제 부재 시 모든 pipe 측정이 동일 vacuous-pass 표면.
  - (c) cross-script drift — 5 script 중 일부만 (예: 1~2건) `set -e` 또는 `set -o pipefail` 을 박제하면 동일 진단 카테고리 내 fail-fast 효능 비대칭 발생. 운영자가 "어느 script 가 fail-fast 가능한지" 를 매 script 마다 본문 확인해야 하는 채널 검증 부담 증가.
- 본 격차는 **반복 검증 가능** — `grep -cE "^set\s+-e\b" scripts/check-*.sh` / `grep -cE "set\s+-o\s+pipefail" scripts/check-*.sh` / `grep -cE "^set\s+-u\b" scripts/check-*.sh` 3 측정의 5 script 별 hit 분포가 시간 경과에 무관히 결정론적 동치 박제 대상.
- 자매 spec / req 직교성:
  - REQ-20260517-076 / `30.spec/green/foundation/diagnostic-script-auto-channel-coverage.md` (I1) — 진단 script 1+ 박제 시 **외부 자동 채널 (`.github/workflows/*.yml` step / `.husky/*` hook / `npm run` wrapper) 부착** 효능 axis. 본 req 는 동일 5 script 의 **내부 prelude 옵션 토큰** axis — 외부 발화 채널 부착과 내부 fail-fast 활성은 별 axis (자동 채널 부착 1+ 이어도 진단 script 자체 vacuous-pass 시 결과 효능 0).
  - REQ-099 / REQ-20260517-100 / REQ-20260518-006 등 token-coherence 계열은 모두 박제 대상 토큰 (HTML/manifest/lockfile 등) 의 cross-surface 동치 axis 로 본 req (script 내부 옵션 동치) 와 표면 직교.
  - REQ-20260518-008 (`husky-hook-line-anchored-fixture-baseline-fragility-axis`) — `.husky/*` hook 본문 line-number fixture 회복 axis. 본 req 는 `scripts/check-*.sh` 본문 (다른 파일 집합) 의 prelude 토큰 — 직교.
  - REQ-20260518-026 vacuous-pass 계열 (browserslist / coverage exclude) — **선언 토큰 ↔ 소비 채널 실재** axis. 본 req 는 **fail-fast 옵션 박제 ↔ 충분 조건 활성** axis — 둘 다 vacuous 카테고리이나 측정 대상 표면 다름.

## 목표

### In-Scope
- `scripts/check-*.sh` 디스크 5 건 (glob `scripts/check-*.sh` 매치) 의 prelude (shebang 행 직후 ~ 본문 첫 명령 행 사이) 에 박제된 `set -e` / `set -u` / `set -o pipefail` 3 옵션 토큰 분포 측정 + 5 script 동치 결과 효능.
- "5 script 가 모두 동일 prelude 부분 집합 (cross-script identical token set)" 박제.
- "박제된 부분 집합이 fail-fast 충분 조건" 박제 (errexit 1+ axis 또는 명시적 `|| { ... exit 1; }` 이디엄으로 모든 측정 명령의 rc ≠ 0 가 외부 채널로 전파됨 — 수단 중립).
- baseline drift fixture: 5 script 의 prelude 변경 (어느 한 script 의 `set -u` 단독 ↔ `set -euo pipefail` 비대칭, 또는 새로 추가되는 `scripts/check-*.sh` 가 prelude 미박제) 시 fail-fast.

### Out-of-Scope
- `set -e` vs `set -euo pipefail` 중 어느 부분 집합을 채택할지의 **선정** (수단 영역 — inspector/planner 단계).
- `scripts/check-*.sh` 외 다른 셸 script (예: `.husky/*` 본문 — 별 prelude 영역, REQ-20260518-008 fixture axis 자매).
- 진단 script 의 외부 자동 채널 (CI step / husky hook / npm wrapper) 부착 — REQ-20260517-076 영역.
- 진단 script 본문 측정 로직 자체의 의미 정합 (예: `check-deps-coherence.sh` 의 G1/G2 의미 — `30.spec/green/foundation/node-modules-extraneous-coherence.md` 영역).
- 비-bash 진단 script (`.mjs` / Node CLI 형식 — vacuous baseline 5/5 bash) — 향후 신규 채택 시 본 req 갱신 신호.
- 진단 script rc ≠ 0 시 stderr 진단 메시지 포맷 (별 라벨 영역).

## 기능 요구사항

| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `scripts/check-*.sh` glob 매치 모든 script (현 baseline = 5건) 의 prelude 에 박제된 옵션 토큰 분포가 cross-script 동치. 측정: 3 측정 (`grep -cE "^set\s+-e\b" scripts/check-*.sh`, `grep -cE "set\s+-o\s+pipefail" scripts/check-*.sh`, `grep -cE "^set\s+-u\b" scripts/check-*.sh`) 각각의 5 script 별 출력이 **전원 동일** (즉 5/5 hit 또는 0/5 hit 의 이진 분포 — 부분 박제 1/5 ~ 4/5 분포 금지). | Must |
| FR-02 | 박제된 부분 집합이 fail-fast 충분 조건을 충족. 충분 조건의 정의 (수단 중립): (a) `set -e` (errexit) 1+ axis 활성, 또는 (b) script 본문의 모든 측정 명령 (rc ≠ 0 가능한 명령) 다음에 명시적 `[ $? -eq 0 ] \|\| exit 1` / `&& exit 1` / `\|\| { ... exit 1; }` 이디엄 박제 — 둘 중 1+ 채널로 모든 측정 실패가 script rc 로 전파. baseline 측정 (HEAD): (a) 0/5 (`set -e` 부재) + (b) script 본문의 명시적 rc 검사 분포는 inspector 단계에 baseline 박제. | Must |
| FR-03 | pipe (`\|`) 사용 script 는 pipefail 충분 조건 충족. 충분 조건: (a) `set -o pipefail` 박제 (1+ axis 활성), 또는 (b) 모든 pipe 표현식이 1 명령으로 단순화 (pipe 0 hit), 또는 (c) pipe 결과를 명시적으로 `PIPESTATUS[0]` 또는 동등 변수로 검사. baseline (HEAD): (a) 0/5 (`pipefail` 부재) + (b)(c) 분포 inspector 단계 박제. | Must |
| FR-04 | FR-01 / FR-02 / FR-03 게이트는 자동 채널 (`.github/workflows/*.yml` CI step / `.husky/*` git hook / `scripts/check-*.sh` 추가 진단 script + npm run wrapper / 동등 효능 채널) 중 **최소 1+** 에 부착되어, 5 script prelude drift 발생 시 fail-fast. 수단 중립 — 채널 종류는 본 req 비대상. `foundation/diagnostic-script-auto-channel-coverage.md` (I1) 메타 효능 자매 적용. | Must |
| FR-05 | `scripts/check-*.sh` glob 에 새로 추가되는 script (count 5 → 6+) 는 FR-01 의 cross-script 동치 부분 집합을 그대로 박제해야 한다 (신규 script 가 단독 비대칭 박제 시 FR-01 위반으로 발화). 본 강제는 spec 갱신 없이 신규 진단 script 가 표면 확장될 때 fail-fast 결과 효능 보전. | Should |

## 비기능 요구사항

| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 결정성 | 3 측정 (`set -e` / pipefail / `set -u` hit) 의 5 script 별 출력은 동일 입력 (HEAD) 에 대해 시간/환경 무관 동일 — rc + stdout/stderr 결정론. |
| NFR-02 | 수단 중립 | "어느 부분 집합 채택" 자체는 inspector/planner 영역. 본 req 는 부분 집합의 **cross-script 동치** + **fail-fast 충분 조건** 결과 효능만 박제. |
| NFR-03 | 회귀 검출력 | drift fixture (5 script 중 어느 한 script 의 prelude 토큰 변경) 시 FR-01 또는 FR-02/FR-03 게이트 중 1+ 발화. |
| NFR-04 | 직교성 | 본 req 는 `scripts/check-*.sh` 내부 prelude 한정. 외부 발화 채널 (REQ-076), 외부 토큰 정합 (REQ-099/100/006 계열), `.husky/*` 본문 fixture (REQ-20260518-008) 와 cross-cut 부재. |
| NFR-05 | 박제 안정성 | 부분 집합 선정이 본 spec 채택 후 변경 (예: `set -u` 단독 → `set -euo pipefail` 풀 채택) 되어도, 변경된 토큰 집합이 5/5 동치 + fail-fast 충분 조건 보전 시 spec 갱신 불필요. spec 본문은 토큰 집합 자체를 enumerate 하지 않음 (수단 중립 NFR-02 정합). |

## 수용 기준

- [ ] Given `scripts/check-*.sh` glob 5 script (HEAD baseline), When `grep -cE "^set\s+-e\b" scripts/check-*.sh` + `grep -cE "set\s+-o\s+pipefail" scripts/check-*.sh` + `grep -cE "^set\s+-u\b" scripts/check-*.sh` 3 측정 실행, Then 3 측정의 5 script 별 출력이 각각 cross-script 동치 (5/5 또는 0/5 — 부분 박제 1/5 ~ 4/5 금지) — 현 baseline = (`set -e` 0/5) + (`pipefail` 0/5) + (`set -u` 5/5) 으로 3 axis 모두 동치 박제 PASS. (FR-01)
- [ ] Given 5 script 중 어느 한 script 의 prelude 가 `set -u` 단독 → `set -euo pipefail` 로 단독 변경 (drift fixture 도입), When 동일 3 측정 실행, Then 1 측정 (`set -e`) hit = 1/5 (cross-script 동치 위반 — 1/5 분포는 0/5 ≠ 5/5) 으로 FR-01 게이트 발화 fail. (FR-01 회귀 검출력)
- [ ] Given 현 baseline (5/5 `set -u` 단독), When script 본문의 측정 명령 실패 case fixture 도입 (예: 임의 진단 script 본문에 `false` 또는 `exit 1` 분기 추가) + 진단 script 실행, Then `set -e` 부재로 인한 vacuous-pass 발생 여부 측정. FR-02 의 충분 조건 (a) (`set -e` 1+ axis) 또는 (b) (명시적 rc 검사 이디엄) 중 1+ 박제 시 PASS, 둘 다 부재 시 FAIL. (FR-02 결과 효능 검증)
- [ ] Given 5 script 중 pipe (`\|`) 사용 script 셋 (baseline 분포 inspector 박제 대상), When pipe 표현식의 첫 명령이 rc ≠ 0 인 fixture 도입, Then FR-03 의 충분 조건 (a) (`pipefail` 1+) / (b) (pipe 0 hit) / (c) (`PIPESTATUS` 검사) 중 1+ 박제 script 는 rc ≠ 0 전파 PASS, 셋 다 부재 script 는 vacuous 0 출력 FAIL. (FR-03 결과 효능)
- [ ] Given `scripts/check-*.sh` glob count 가 5 → 6 증가 (신규 진단 script `scripts/check-foo-coherence.sh` 추가 fixture), When FR-01 측정 실행, Then 신규 script 의 prelude 가 기존 5 script 의 동치 부분 집합 채택 시 PASS, 단독 비대칭 prelude 박제 시 cross-script 동치 위반 발화 fail. (FR-05)
- [ ] Given FR-04 fail-fast 자동 채널 (수단 영역 — planner 단계 carve), When 5 script 중 1+ 의 prelude drift 발생, Then 1+ 채널에서 fail-fast 발화 (CI job fail / git operation 차단 / 동등 효능 채널) — 채널 종류 무관. (FR-04 메타 효능 — `diagnostic-script-auto-channel-coverage.md` (I1) 자매 적용)

## 참고

- baseline 현물 5건:
  - `scripts/check-deps-coherence.sh:1` `#!/usr/bin/env bash` + `:14` `set -u`
  - `scripts/check-node-version-coherence.sh:1` `#!/usr/bin/env bash` + `:22` `set -u`
  - `scripts/check-package-manager-coherence.sh:1` `#!/usr/bin/env bash` + `:18` `set -u`
  - `scripts/check-spec-coherence.sh:1` `#!/usr/bin/env bash` + `:13` `set -u`
  - `scripts/check-vite-env-coherence.sh:1` `#!/usr/bin/env bash` + `:15` `set -u`
- baseline 측정 (HEAD 2026-05-18):
  - `grep -cE "^set\s+-e\b" scripts/check-*.sh` → 0 hit (5/5 부재)
  - `grep -cE "set\s+-o\s+pipefail" scripts/check-*.sh` → 0 hit (5/5 부재)
  - `grep -cE "^set\s+-u\b" scripts/check-*.sh` → 5 hit (5/5 박제)
  - 결론: 3 axis 모두 cross-script 동치 박제 — FR-01 baseline PASS. 단 fail-fast 충분 조건 (FR-02) 의 (a) axis (errexit 0/5) 미충족 — (b) 이디엄 분포는 inspector baseline 박제 영역.
- 격차 신호 출처:
  - `60.done/2026/05/17/task/node-modules-extraneous-ci-gate/TSK-20260517-09-node-modules-extraneous-ci-gate.md:22` — task plan 본문 "α: `scripts/check-deps-coherence.sh` 셸 스크립트. **`set -euo pipefail`** + ..." 명세 ↔ 현물 `set -u` 단독 박제 = 2 axis (`set -e`, `pipefail`) drift.
  - `60.done/2026/05/17/task/node-version-3axis-coherence-recover/TSK-20260517-14-node-version-3axis-coherence-recover.md:32` — task plan "shebang `#!/usr/bin/env bash` + `set -euo pipefail`" 명세 ↔ 현물 `set -u` 단독 동일 drift.
- 자매 spec (직교 axis):
  - `30.spec/green/foundation/diagnostic-script-auto-channel-coverage.md` (REQ-076, green, I1) — 진단 script 외부 자동 채널 부착 메타 효능. 본 req 는 동 5 script 의 **내부 prelude 옵션 토큰** axis — 외부 부착 ↔ 내부 fail-fast 활성 별 axis. 효능 보완 관계 (둘 다 충족해야 결과 효능 = "drift 발생 시 자동 채널이 fail-fast 발화" 가 vacuous 없이 활성).
  - `30.spec/green/foundation/node-modules-extraneous-coherence.md` (REQ-20260517-085) — `check-deps-coherence.sh` G1/G2 의미 정합. 본 req 는 동 script 의 prelude 채널 — 의미 정합과 prelude fail-fast 활성은 직교.
- 자매 req (직교 axis):
  - REQ-20260518-008 (`20.req/20260518-husky-hook-line-anchored-fixture-baseline-fragility-axis.md`) — `.husky/*` hook 본문 line-number fixture 회복 axis. 본 req 는 다른 파일 집합 (`scripts/check-*.sh`) 의 prelude 토큰 — 직교.
  - REQ-20260518-018 (`20.req/20260518-package-json-browserslist-vacuous-declared-policy-axis.md`) — `package.json:browserslist` 선언 토큰 ↔ 빌드 파이프라인 실 소비 axis. 본 req 는 진단 script prelude 옵션 박제 ↔ fail-fast 실 활성 axis — 둘 다 vacuous 카테고리지만 측정 표면 다름.
  - REQ-20260518-026 (`20.req/20260518-vitest-coverage-exclude-pattern-vacuous-zero-axis.md`) — coverage exclude glob 5건 ↔ src 디스크 매치 vacuous 축. 본 req 는 5 script prelude — 동치 카테고리, 다른 파일 셋.
- RULE-07 정합 자기 점검:
  - "5 script 가 모두 동일 prelude 부분 집합을 박제해야 한다" + "박제된 부분 집합이 fail-fast 충분 조건을 만족해야 한다" 의 2 평서 선언 — 1회성 진단 (특정 commit / 특정 incident 귀속) 아닌 시간 무관 반복 검증 가능 시스템 불변식.
  - 박제 토큰 집합 자체 (예: `set -euo pipefail` 명세) 를 enumerate 하지 않음 — 수단 중립 NFR-02 정합. 5/5 동치 + 충분 조건만 박제.
  - 1회성 patch 플랜 / 진단 / 감사 / TODO 나열 부재.
