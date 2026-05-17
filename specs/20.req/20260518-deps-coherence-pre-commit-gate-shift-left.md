# `check:deps` 게이트 pre-commit 시점 부착 — drift commit 차단 (shift-left)

> **ID**: REQ-20260518-007
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요
선행 REQ-20260517-073 (`node-modules-extraneous-coherence`, done → blue) 와 TSK-20260517-09 (`node-modules-extraneous-ci-gate`, `7d085a3`) 가 `npm ls --depth=0` 기반 (G1) extraneous=0 + (G2) declared ↔ installed 등식 게이트를 `package.json:26` `scripts.check:deps` → `scripts/check-deps-coherence.sh` 단일 진입점으로 박제하고 **CI workflow (`.github/workflows/ci.yml:28`) + pre-push hook (`.husky/pre-push:1`) 2 채널** 자동 게이트 부착을 수렴 완료했으나, HEAD=`760a491` (2026-05-18 실측) 시점 **`.husky/pre-commit` 에는 `check:deps` 호출이 없으며** (`grep -nE "check:deps|check-deps" .husky/pre-commit` → 0 hit), 이로 인해 deps coherence drift (extraneous 패키지 발생 또는 N≠M 등식 위반) 는 **commit 시점에는 통과**하고 **push 시점에 처음 surface** 되어 작업자가 (a) 작업 완료 후 push 차단을 만나 (b) 별 followup 발행 + (c) 별 task carve + (d) blocked 격리 후 정상 경로 회복이 필요한 작업 손실/리워크 risk 가 누적된다. 2026-05-17 TSK-20260518-04 (`visitormon-fetch-unmount-safety`) push 시도 시 `eslint-plugin-react-hooks@5.2.0` extraneous 1 + `N=29 / M=30 / diff=-1` G1+G2 동시 위반으로 push 차단 → 50.blocked 격리 → followup `20260517-1758-deps-coherence-extraneous-eslint-plugin-react-hooks.md` 회수 경로 surface 가 실 사례. 본 req 는 inspector 에게 **"deps coherence 게이트 (`check:deps` 또는 동등 효능 명령) 는 commit 단계 hook 에도 부착되어 drift 가 commit 시점에 첫 차단된다" 의 시점 정합 (verification-point symmetry / shift-left) 불변식 박제 + REQ-073 의 `node-modules-extraneous-coherence.md` §역할 line 33 역의존 후보 (CI / pre-commit / pre-push / npm script) 중 pre-commit 채널 박제 채택 + baseline grep-baseline 재실측 수치 흡수**의 처리를 요청한다. 본 req 는 결과 효능 (commit 단계 게이트 1+ 호출 + drift 도입 시 commit 차단) 만 박제 후보로 신호하며, 수단 (hook 위치 — `.husky/pre-commit` 본문 line 위치 / 조건부 vs 무조건 / lint-staged 와 직렬 순서, 실행 형태 — `npm run check:deps` vs `bash scripts/check-deps-coherence.sh`, fail 정책 — `|| exit 1` / 별도 wrap) 선정은 inspector 가 결정하지 않으며 별도 task 위임.

## 배경
- **현장 근거 (HEAD=`760a491`, 2026-05-18 실측)**:
  - **`.husky/pre-commit` `check:deps` 잔존 grep** — `grep -nE "check:deps|check-deps" .husky/pre-commit` → **0 hit**. 본문 분기 3건:
    - line 1: `npx lint-staged` (staged 파일 한정 lint).
    - line 4-7: `git diff --cached --name-only --diff-filter=ACMR | grep -qE '^(src/|specs/30\.spec/)'` 조건부 → `bash scripts/check-spec-coherence.sh || exit 1` (REQ-20260517-076 `src-spec-reference-path-coherence` 박제).
    - line 11-13: `git diff --cached --name-only --diff-filter=ACMR | grep -qE '^src/'` 조건부 → `bash scripts/check-vite-env-coherence.sh || exit 1` (REQ-20260517-083 `vite-env-boundary-typing` 박제).
    - → deps coherence 채널 부재.
  - **`.husky/pre-push:1` `check:deps` 잔존 grep** — `grep -nE "check:deps|check-deps" .husky/pre-push` → **1 hit** @`:1` `npm run check:deps || exit 1` (TSK-20260517-09 `7d085a3` 박제).
  - **`.github/workflows/ci.yml:28` `check:deps` 잔존 grep** — `grep -nE "check:deps|check-deps" .github/workflows/ci.yml` → **1 hit** @`:28` `run: npm run check:deps` (TSK-20260517-09 `7d085a3` 박제).
  - **`package.json:26` `scripts.check:deps`** — `"check:deps": "bash scripts/check-deps-coherence.sh"` 단일 진입점 (REQ-073 G4 자동 게이트 박제).
  - **자동 게이트 시점 분포 현황** — { CI: ✓, pre-push: ✓, pre-commit: ✗, lint-staged staged-only: ✗ } — 4 채널 중 2 부착 / 2 미부착. 비대칭 축: commit 단계 미부착.
- **drift 발생 → surface 시점 비대칭 사례 (참고 — 1회 incident 가 아닌 패턴 신호로만 박제)**:
  - 2026-05-17 TSK-20260518-04 push 시도 시 `eslint-plugin-react-hooks@5.2.0` extraneous 1 + `N=29 / M=30 / diff=-1` G1+G2 동시 위반 → push 차단 → followup `20260517-1758-deps-coherence-extraneous-eslint-plugin-react-hooks.md` 발행 → blocked 격리 + 별 회수 task carve 후보. 작업 완료 commit 1건 (`760a491`) + 선행 unpushed commits 2건 (`1d0fb70` + `9372da0`) 모두 송출 차단 (3 commit lag).
  - 본 req 는 본 incident 진단을 박제하지 않으며 (RULE-07 1회성 incident 회피), **drift 검증 시점 비대칭** 자체를 시스템 불변식으로 박제한다 — pre-commit 부재로 인해 drift 가 commit 통과 후 push 시점 surface 되는 구조적 risk.
- **선행 박제 (REQ-073 라인 추적)**:
  - `specs/30.spec/blue/foundation/node-modules-extraneous-coherence.md:9-10` §역할 — "선언 = 설치 등식 불변식".
  - `specs/30.spec/blue/foundation/node-modules-extraneous-coherence.md:33` §의존성 역의존 (사용처) — "CI workflow step / pre-commit / pre-push 훅 / `scripts.<name>` npm script (수단은 task 위임)". → **pre-commit 채널이 §역할 자동 게이트 후보로 명시 박제** 됐으나 현재 부착 0 hit. 본 req 는 이 후보 중 pre-commit 채택을 박제 요청.
  - `specs/30.spec/blue/foundation/node-modules-extraneous-coherence.md:40` §테스트 현황 (G4) — "hook-ack TSK-20260517-09 (`node-modules-extraneous-ci-gate`) `7d085a3` — `.github/workflows/ci.yml:28` + `.husky/pre-push:1` 2 채널 박제". → 2 채널 박제만 marker `[x]`, pre-commit 채널은 marker 외 영역.
  - `specs/30.spec/blue/foundation/node-modules-extraneous-coherence.md:47` §수용 기준 (Should 자동 게이트) `[x]` — "CI workflow step 또는 pre-commit/pre-push 훅 또는 `scripts.<name>` npm script ... 수단 선정은 task 위임". → "또는" 박제로 1+ 채널 충족 시 marker 플립 — 본 req 는 marker 재오픈이 아니라 **시점 정합 강화 불변식 (추가 채널) 박제 요청**.
- **선행 spec (관련 — 본 req 흡수 후보 spec 들)**:
  - `specs/30.spec/blue/foundation/node-modules-extraneous-coherence.md` (REQ-073) — 본 req 직접 선행. 흡수 후보 #1 (§역할 line 33 + §동작 G4 + §테스트 현황 G4 + §수용 기준 Should 자동 게이트 영역 강화).
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — CI typecheck step (FR-01) + Vitest coverage threshold (FR-02) 박제. 본 req 의 pre-commit 보조 게이트는 CI guard 의 **시점 보조** — inspector 가 (a) `node-modules-extraneous-coherence.md` 흡수, (b) `regression-gate.md` §동작 게이트 시점 분포 일반화, (c) 신규 spec carve (verification-point symmetry 횡단 spec) 중 결정.
  - `specs/30.spec/blue/foundation/husky-pre-push-typecheck.md` (REQ-089 absorption, blue) — `.husky/pre-push:2` `npm run typecheck || exit 1` 효능 박제. 본 req 와 패턴 동치 (typecheck 시점 보조 vs deps 시점 보조) 직교 축. typecheck 도 pre-commit 부재이나 본 req 영역 밖 (별 req 후보 — 채택 안 함).
- **기 등록 req 와의 직교성 (중복 회피 grep)**:
  - `grep -rln "REQ-20260518-007\|deps-coherence-pre-commit\|shift-left" specs/{20.req,60.done,30.spec,50.blocked,40.task}` → 0 hit (신규 ID free).
  - `REQ-20260517-073`: 본 req 의 직접 선행. 본 req 는 REQ-073 §역할 line 33 박제된 자동 게이트 후보 (pre-commit) 채택 확장.
  - `REQ-20260517-066` (`runtime-dep-version-coherence`, done → blue): `.husky/pre-push:1` `npm run check:deps || exit 1` 회수. 본 req 와 직교 (deps 메이저 정합 vs deps 시점 정합) — 호출 위치 추가는 본 req 영역.
  - `REQ-20260517-060/089` (`husky-pre-push-typecheck-spec-absorption`, done → blue): pre-push typecheck 효능 박제. 본 req 와 직교 (typecheck 시점 vs deps 시점) — 동일 hook 파일 영역 인접하지만 측정 축 분리.
  - `REQ-20260517-080` (`lint-staged-untracked-preservation`, done → blue): lint-staged hook cross-writer 안정성. 본 req 와 직교 (lint-staged staged-only 축 vs deps 채널 부착) — 동일 pre-commit 파일 영역 인접하지만 측정 축 분리.
  - `REQ-20260517-076` (`src-spec-reference-path-coherence`, done → blue): `.husky/pre-commit:4-7` `bash scripts/check-spec-coherence.sh` 조건부 부착. 본 req 와 직교 (spec ↔ src reference 축 vs deps coherence 축) — 동일 hook 파일 패턴 참조 가능.
  - `REQ-20260517-083` (`vite-env-boundary-typing`, done → blue): `.husky/pre-commit:11-13` `bash scripts/check-vite-env-coherence.sh` 조건부 부착. 본 req 와 직교 (env typing 축 vs deps 축) — 동일 hook 파일 패턴 참조 가능 (조건부 부착 패턴 차용 후보).
- **본 req 가 박제하지 않는 것 (RULE-07 정합)**:
  - hook 호출 위치 (`lint-staged` 전 vs 후 vs `check-spec-coherence` 인접) 및 실행 방식 (`&&` 직렬 / `;` 무조건 / 별도 wrap script / lint-staged 통합) — 수단 중립.
  - hook 명령 형태 (`npm run check:deps` vs `bash scripts/check-deps-coherence.sh` 직접 호출) — 수단 중립.
  - 조건부 부착 vs 무조건 부착 — REQ-076/083 은 staged 변경 path 조건부 부착, 본 req 의 deps coherence 는 staged 파일 무관 (node_modules / package.json 상태 측정) 이므로 무조건 부착이 적절하나, 무조건 / `package.json` staged 시만 / `package-lock.json` staged 시만 어느 경로든 valid — 수단 중립.
  - hook 실행 시간 비용 (deps check 평균 latency, pre-commit 단계 사용자 체감 비용) — 별 NFR 축, 본 req 영역 밖.
  - `--no-verify` hook 우회 정책 — RULE-02 박제 (우회 금지). 본 req 영역 밖.
  - lint-staged 와 deps check 직렬화 정책 — 본 req 는 deps check 1+ 호출 효능만 박제.
  - pre-push 채널 유지 여부 — 본 req 는 pre-commit 채널 추가 박제, pre-push 채널은 REQ-073 G4 이미 박제 (유지 의무 별 spec).
  - CI workflow step 유지 여부 — 본 req 는 commit 시점 보조 게이트 추가, CI final guard 는 REQ-073 G4 이미 박제 (유지 의무 별 spec).
  - drift 자동 회수 (`npm install` / `npm ci` 자동 트리거) — fail-fast 박제만, 회수는 작업자 수동 (REQ-073 G4 정합).

## 목표
- **In-Scope**:
  - `.husky/pre-commit` 본문에 `check:deps` 효능 명령 1+ 호출이 박제되어 deps coherence drift (G1 extraneous ≠ 0 또는 G2 N ≠ M) 도입 commit 이 `pre-commit` rc ≠ 0 으로 차단된다는 결과 효능 불변식.
  - drift 미도입 commit (G1 = 0 ∧ G2 N = M) 은 pre-commit 게이트를 통과한다는 양성 정합.
  - REQ-073 `node-modules-extraneous-coherence.md` §역할 line 33 역의존 (사용처) 박제된 4 후보 채널 (CI / pre-commit / pre-push / npm script) 중 pre-commit 채택 박제 + §테스트 현황 (G4) hook-ack 갱신 + §수용 기준 (Should 자동 게이트) 시점 분포 박제 강화.
  - HEAD=`760a491` 시점 baseline grep-baseline 재실측 수치 박제 (4 채널 분포: CI ✓ + pre-push ✓ + pre-commit ✗ + lint-staged ✗).
- **Out-of-Scope**:
  - hook 호출 위치·순서·형태·조건부 정책 (수단 중립 — 위 §배경 박제하지 않는 것 6건).
  - typecheck / lint / test 등 다른 게이트의 pre-commit 시점 부착 (별 req 후보 — 본 req 영역 밖).
  - drift 자동 회수 / lockfile 자동 갱신 (별 축).
  - pre-push 채널 또는 CI step 제거 (본 req 는 추가만 박제).

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `.husky/pre-commit` 실행 중 `check:deps` (또는 동등 효능 — `bash scripts/check-deps-coherence.sh` 직접 호출 등) 명령이 1+ 회 호출된다. `grep -nE "check:deps\|check-deps" .husky/pre-commit` → **≥ 1 hit** 박제. | Must |
| FR-02 | `package.json:26` `scripts.check:deps` → `bash scripts/check-deps-coherence.sh` 진입점 유지 (REQ-073 G4 박제). 본 req 는 진입점 변경하지 않음 — 호출 채널 1건 추가만. | Must |
| FR-03 | deps coherence drift 도입 commit (G1 extraneous ≠ 0 또는 G2 N ≠ M) 은 `pre-commit` hook rc ≠ 0 으로 차단 — 작업자 `git commit` 시도 시 에러 종료 + commit object 미생성. fixture: `node_modules` 에 extraneous 1+ 또는 `package.json` declared 1 항목 제거 (installed 잔존) 상태에서 `git commit -m "test"` → rc=1 + extraneous 라인 stderr. | Must |
| FR-04 | drift 미도입 commit (G1=0 ∧ G2 N=M) 은 pre-commit 게이트를 통과 (rc=0 / commit object 생성). 본 req 가 false-positive 차단을 도입하지 않음. fixture: HEAD=`760a491` 시점 (G1=0 ∧ G2 N=29 ∧ M=29 가정 — pre-push surface 시점 G1=1 / M=30 였으나 본 baseline 은 회수 후 가정) `git commit -m "test"` → rc=0. | Must |
| FR-05 | hook 호출 위치·순서·형태 (lint-staged 와의 직렬 순서, `npm run` vs `bash` 직접 호출, 조건부 vs 무조건 등) 는 본 req 박제 대상 아님 — 수단 중립. | Must (negative — 박제 부재) |
| FR-06 | 본 req 회수 시 REQ-073 `node-modules-extraneous-coherence.md` §테스트 현황 (G4) + §수용 기준 (Should 자동 게이트) 의 hook-ack baseline 갱신 — "pre-commit 채널 추가 박제" pointer + HEAD 재실측 수치 (`grep -nE ... .husky/pre-commit` → 1+ hit) 박제. | Should |
| FR-07 | 본 req 의 결과 효능 박제는 REQ-073 G4 자동 게이트 marker 재오픈이 아니라 동일 marker 의 시점 분포 강화 — 4 채널 (CI / pre-commit / pre-push / npm script) 중 pre-commit 채널 marker 추가. 다른 채널 marker 는 본 req 영역 밖. | Must |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 작업 손실 risk | drift 도입 → surface 시점이 commit 시점으로 shift-left 되어 commit object 미생성 + 작업자 `git reset HEAD` / `npm install` 즉시 회수 가능. push 차단 후 followup → blocked → revisit 경로 (3+ 사이클) 회피. |
| NFR-02 | hook 호출 latency | pre-commit 단계 `check:deps` 추가 호출이 작업자 commit 체감 latency 를 과도하게 증가시키지 않음. `npm ls --depth=0` 평균 latency 측정값 박제는 본 req 영역 밖 (별 NFR 축, task planner 결정). |
| NFR-03 | 시점 정합 (verification-point symmetry) | deps coherence 게이트 4 채널 (CI + pre-push + pre-commit + npm script) 중 pre-commit 채널 추가로 commit / push / CI 3 시점 분포 충족. 단일 시점 부착 (CI only / pre-push only) 대비 surface 시점이 작업 단계 초기로 이동. |
| NFR-04 | 수단 중립 | hook 본문 위치 / 호출 형태 / 조건부 정책 어느 경로든 valid — FR-01 grep hit 1+ 충족 시 모두 PASS. inspector 가 단일 수단 강제 안 함. |

## 수용 기준
- [ ] **(Must, FR-01)** `grep -nE "check:deps\|check-deps" .husky/pre-commit` → **≥ 1 hit**. HEAD=`760a491` baseline 0 hit → 회수 후 1+ hit.
- [ ] **(Must, FR-03)** drift fixture (extraneous 1+ 또는 N ≠ M) 상태에서 `git commit -m "test"` 시도 → rc=1 + commit object 미생성 + stderr 에 extraneous 라인 또는 declared/installed diff 메시지. 본 게이트는 작업자 환경에서 재현 가능 (fixture: `npm install --no-save <extraneous-pkg>` 후 commit 시도).
- [ ] **(Must, FR-04)** drift 미도입 상태 (G1=0 ∧ G2 N=M) 에서 `git commit -m "test"` 시도 → rc=0 + commit object 생성. 본 게이트는 false-positive 0.
- [ ] **(Should, FR-06)** REQ-073 `node-modules-extraneous-coherence.md` §테스트 현황 (G4) + §수용 기준 (Should 자동 게이트) hook-ack 영역에 pre-commit 채널 추가 박제 (HEAD 재실측 + grep 수치 + TSK ID + 커밋 해시).
- [ ] **(Must, FR-07)** 본 req 회수 후 게이트 시점 분포: CI ✓ / pre-push ✓ / pre-commit ✓ — 3 채널 박제. lint-staged staged-only 채널은 본 req 영역 밖.
- [ ] **(Must, 회귀 0)** pre-commit 채널 추가 후 기존 hook 분기 (`npx lint-staged` line 1 + `check-spec-coherence` 조건부 line 4-7 + `check-vite-env-coherence` 조건부 line 11-13) rc + grep 정합 유지 — REQ-076 / REQ-080 / REQ-083 효능 회귀 0.
- [ ] **(Must, RULE-07 정합)** 본 req 가 박제 요청한 효능은 시스템 불변식 (commit 단계 deps drift 차단) — 1회성 incident (TSK-20260518-04 push 차단) 진단 박제 아님. spec 흡수 시 `node-modules-extraneous-coherence.md` §동작 G4 또는 §의존성 역의존 또는 신규 spec carve 중 inspector 결정.

## 참고
- **선행 spec**:
  - `specs/30.spec/blue/foundation/node-modules-extraneous-coherence.md` (REQ-20260517-073) — 본 req 의 직접 선행. §역할 line 33 역의존 박제 + §테스트 현황 G4 + §수용 기준 Should 자동 게이트.
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) — CI gate 일반 spec.
  - `specs/30.spec/blue/foundation/husky-pre-push-typecheck.md` (REQ-20260517-089) — pre-push typecheck 효능 박제 (패턴 동치 직교 축).
- **선행 task**:
  - TSK-20260517-09 (`node-modules-extraneous-ci-gate`, `7d085a3`) — CI step + pre-push hook 2 채널 박제 회수.
- **followup 라인**:
  - `specs/60.done/2026/05/18/followups/20260517-1758-deps-coherence-extraneous-eslint-plugin-react-hooks.md` (본 req 회수 시 mv) — 1회 incident 박제. 본 req 는 incident 진단을 박제하지 않으며 시점 비대칭 시스템 불변식만 박제.
- **외부 레퍼런스**:
  - husky 공식 — `.husky/pre-commit` 는 commit object 생성 직전 hook, 종료 코드 ≠ 0 시 commit 차단 (https://typicode.github.io/husky/).
  - Git 공식 — `git commit --no-verify` 로 hook 우회 가능 (https://git-scm.com/docs/githooks). 본 req 는 우회 정책 박제하지 않음 (RULE-02 박제 — 우회 금지).
  - npm 공식 — `npm ls --depth=0` 출력 형식 + extraneous 표시 (https://docs.npmjs.com/cli/v10/commands/npm-ls).
- **HEAD baseline**: `760a491` (2026-05-18) — `feat: VisitorMon fetchData unmount-safety 박제 — REQ-093 (I3)(FR-03) 회복`.
