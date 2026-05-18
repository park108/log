# `node_modules` ↔ `package.json` declared deps 일관성 — extraneous 0 hit 정합

> **위치**: 횡단 시스템 불변식 — `package.json` 의 `dependencies + devDependencies` 선언 집합과 `node_modules/` 의 top-level installed 집합. 단일 식별자 없음 (게이트는 `npm ls --depth=0` 출력 측정). 자동 게이트 시점 분포 채널: `.github/workflows/ci.yml:29` + `.husky/pre-push:1` + `.husky/pre-commit` (REQ-007 흡수 후 채택, baseline 0 hit) + `package.json:26 scripts.check:deps` 진입점.
> **관련 요구사항**: REQ-20260517-073, REQ-20260518-007
> **최종 업데이트**: 2026-05-18 (by inspector, 87차 tick — REQ-007 흡수, §역할 line 33 역의존 pre-commit 채택 확장 + §동작 G6 verification-point symmetry 시점 정합 axis 신규 박제 + §테스트 현황 G7 + §수용 기준 4건 + §스코프 규칙 grep-baseline (af)(ag)(ah)(ai)(aj) 5건 추가)

> 본 spec 은 시스템 횡단 게이트. 라인 번호 박제 없음 — 837 extraneous / `N=29 / M=866` baseline 은 §스코프 규칙 grep-baseline 에 박제 (시점 비의존, RULE-07 §양성 기준 정합).

## 역할
`package.json` 의 `dependencies + devDependencies` 에 선언되지 않은 패키지가 `node_modules/` (top-level depth=0) 에 잔존하지 않는다는 **상시 시스템 정합** 박제 — "선언 = 설치" 등식 불변식. 본 spec 은 (G1) extraneous 0 + (G2) `N == M` 등식 + (G6) **verification-point symmetry — drift 가 commit 시점에 첫 차단된다는 시점 정합 불변식** 3축 결과 효능 박제. 의도적으로 하지 않는 것: transitive dependency tree 정합 (depth>0), 메이저 버전 정합 (REQ-20260517-063 영역), binary 가용성 (REQ-20260517-064 영역), typescript devDep 정합 (REQ-20260517-061 영역), `msw@0.47.4 ↔ ^2.13.4` 메이저 invalid 신호 (runtime-dep-version-coherence 영역), lockfile (`package-lock.json`) 정합, `npm audit` vulnerability 0, 회수 수단 선정 (`npm prune` / `rm -rf node_modules && npm ci` / 패키지 매니저 전환 중 어느 경로든 valid), 자동 게이트 hook 본문 위치·순서·실행 형태 (`npm run` vs `bash` 직접) / 조건부 vs 무조건 부착 / lint-staged 와의 직렬 순서 / `--no-verify` 우회 정책 (RULE-02 박제) / hook 호출 latency NFR / drift 자동 회수 (`npm install` 자동 트리거).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `npm ls --depth=0` 단일 명령 결과로 검증.

## 동작
1. (G1) extraneous 0 hit 게이트
   - 명령: `npm ls --depth=0 2>&1 | grep -cE " extraneous$"` → **0**.
   - 의미: `node_modules/` top-level 에 선언 없는 패키지가 존재하지 않는다. extraneous 가 0 이면 (a) 새 작업자의 `npm ci` 결과와 현 환경 사이 root entries 수가 일치 (NFR-01 환경 재현성), (b) `npm audit` 노이즈 수렴 (NFR-02), (c) 빌드 산출물에 의도치 않은 모듈 포함 위험 0 (의도된 import 만 graph 진입).
2. (G2) 선언 ↔ 설치 등식 게이트
   - 절차: `N = node -e "const p=require('./package.json'); console.log(Object.keys({...(p.dependencies||{}),...(p.devDependencies||{})}).length)"`. `M = npm ls --depth=0 2>&1 | grep -cE "^[├└]"`. **`N == M`** 등식 유지.
   - 의미: declared 항목 수와 installed top-level entries 수가 정확히 일치. `N < M` 은 extraneous, `N > M` 은 미설치 (declared but missing) — 본 게이트는 양방향 검출.
3. (G3) 시점 비의존
   - G1 ∧ G2 는 신규 dep 추가 / 제거 / 메이저 bump 후에도 1 PR 안에 동시 충족. dep 1 항목 추가 시 `package.json` declared 행 +1 + `npm install` 실행 → `M` +1 동기. 어느 쪽 한쪽만 변경되면 즉시 게이트 위반.
4. (G4) 수단 중립
   - 회수 수단은 `rm -rf node_modules && npm ci` / `npm install` / `npm prune` / lockfile 재생성 / 패키지 매니저 (yarn/pnpm) 전환 중 어느 경로든 valid. 본 spec 은 결과 게이트만 박제 — 단일 수단 강제 없음.
5. (G5) 범위 제한
   - 본 게이트는 top-level (`depth=0`) 한정. transitive tree (depth>0) 정합, 메이저 버전 정합, lockfile 정합, binary 가용성 등은 본 게이트 범위 밖 (각각 별 spec).
   - 본 게이트는 "선언 = 설치" 두 축만 측정. `npm audit` vulnerability 0, `du -sh node_modules` 절대값 등은 본 게이트 범위 밖 (NFR 측면 결과 효능으로만 언급).
6. (G6) verification-point symmetry — drift commit 시점 차단 시점 정합
   - 6.1 채널 분포 — deps coherence 게이트 (`check:deps` 또는 동등 효능 명령) 의 자동 부착 채널 4 후보: { CI workflow / pre-push hook / pre-commit hook / npm `scripts.<name>` 진입점 }. 본 게이트는 4 채널 중 **commit 단계 hook 부착이 1+ 채널 박제됨을 시점 정합 결과 효능으로 박제** — `grep -nE "check:deps|check-deps" .husky/pre-commit` → **≥ 1 hit** (HEAD=`cd75eed` baseline 0 hit, 회수 후 1+ hit).
   - 6.2 결과 효능 — deps coherence drift (G1 extraneous ≠ 0 또는 G2 `N ≠ M`) 도입 commit 시도 시 `pre-commit` hook rc ≠ 0 → commit object 미생성 + stderr 에 extraneous 라인 또는 `N ≠ M` diff. drift 미도입 commit (G1=0 ∧ G2 `N=M`) 은 pre-commit 게이트 통과 (rc=0, false-positive 0).
   - 6.3 시점 정합 — drift 가 commit 시점에 첫 surface 되어 작업자 `git reset HEAD` / `npm install` 즉시 회수 가능. push 차단 후 followup → blocked → revisit 경로 (3+ 사이클) 회피. surface 시점이 작업 단계 초기로 이동 (shift-left).
   - 6.4 수단 중립 — hook 호출 위치 (`lint-staged` 전 vs 후 vs `check-spec-coherence` 인접) / 실행 형태 (`npm run check:deps` vs `bash scripts/check-deps-coherence.sh` 직접) / 조건부 부착 (staged path 조건부 vs 무조건) / lint-staged 통합 vs 분리 — 어느 경로든 valid. (G6.1) grep 1+ hit 충족 시 모두 PASS. 본 spec 은 단일 수단 강제 안 함.
   - 6.5 scope 분리 — 본 G6 는 deps coherence 채널 한정. typecheck / lint / test 등 다른 게이트의 pre-commit 부착 (예: `husky-pre-push-typecheck.md` 의 `typecheck` axis) 은 본 G6 영역 밖 — 패턴 동치 직교 축. pre-push 채널 (G4 박제) + CI step (G4 박제) 제거는 본 G6 영역 밖 (본 G6 는 commit 단계 추가 박제, 다른 채널 유지 의무는 G4 박제).

## 의존성
- 내부: `package.json` (G2 declared 입력), `node_modules/` (G1·G2 installed 입력).
- 외부: `npm` CLI (G1·G2 측정 명령), `node` (G2 declared 카운트), `grep` (G1·G2 라인 카운트).
- 역의존 (사용처): `specs/30.spec/blue/foundation/regression-gate.md` (CI 정합 게이트 일반 — 본 spec 의 자동 게이트 박제 위치 후보), `specs/30.spec/blue/foundation/dependency-bump-gate.md` (dep bump 시 검증 게이트 — 메이저 bump 정합 영역으로 인접, 본 spec 은 "선언 = 설치 등식" 직교 영역), `specs/30.spec/blue/foundation/husky-pre-push-typecheck.md` (pre-push typecheck 효능 박제 — 본 spec G6 의 직교 축 패턴 동치 비교 대상). CI workflow step / pre-commit / pre-push 훅 / `scripts.<name>` npm script — 4 채널 전수 자동 게이트 후보 (수단은 task 위임). G6 는 4 채널 중 commit 단계 (pre-commit) 채택 박제 axis.
- 직교 (영역 분리): REQ-20260517-061 (`toolchain-version-coherence` — typescript devDep ↔ installed 메이저 정합), REQ-20260517-063 (`runtime-dep-version-coherence` — React 계열 + 비-React 계열 메이저 정합), REQ-20260517-064 (`devbin-install-integrity` — binary resolve 가용성). 본 spec 은 위 3 영역의 보완 — "선언 = 설치 등식" 횡단 게이트.

## 테스트 현황
- [x] (G1) `npm ls --depth=0 2>&1 | grep -cE " extraneous$"` → 0 게이트 — HEAD=`9e5f00a` 실측 0 (baseline 837 → 0 회수).
- [x] (G2) `N == M` 등식 — HEAD=`9e5f00a` 실측 `N=29 / M=29 / diff=0` (baseline `N=29 / M=866 / diff=837` → 회수).
- [ ] (G3) 신규 dep 추가/제거 후 동일 PR 안에 G1·G2 동시 충족 — 단일 사례 (환경 회복 시점) 박제, 차기 dep 이벤트 후 재검증으로 marker 플립 누적.
- [x] (G4) CI / pre-commit / pre-push 훅 / `scripts.<name>` npm script 박제 — 회귀 방지 자동 게이트. hook-ack TSK-20260517-09 (`node-modules-extraneous-ci-gate`) `7d085a3` — `.github/workflows/ci.yml:28→:29` `run: npm run check:deps` + `.husky/pre-push:1` `npm run check:deps || exit 1` 2 채널 박제. `scripts/check-deps-coherence.sh` POSIX shell + `package.json:26` `scripts.check:deps` 진입점. HEAD=`cd75eed` 재실측 PASS — `grep -nE "check:deps|check-deps" .github/workflows/ci.yml .husky/pre-push` → `.husky/pre-push:1` + `.github/workflows/ci.yml:29` 2 hit 박제 (req baseline `:28` vs HEAD 측정 `:29` 는 1 line shift 정합).
- [ ] (G6.1) `grep -nE "check:deps|check-deps" .husky/pre-commit` → **≥ 1 hit**. HEAD=`cd75eed` baseline **0 hit** (gate (af) 박제). 회수 후 marker 플립 — task carve 후 developer 영역 회수 대기.
- [ ] (G6.2) drift fixture (extraneous 1+ 또는 `N ≠ M`) 상태 `git commit -m "test"` → rc=1 + commit object 미생성 + stderr 메시지. fixture: `npm install --no-save <extraneous-pkg>` 후 commit 시도. 회수 후 marker 플립.
- [ ] (G6.3) drift 미도입 (G1=0 ∧ G2 N=M) 상태 `git commit -m "test"` → rc=0 + commit object 생성. false-positive 0. 회수 후 marker 플립.

## 수용 기준
- [x] (Must) `npm ls --depth=0 2>&1 | grep -cE " extraneous$"` → **0**. baseline 837 hits → HEAD=`9e5f00a` 실측 0 (회수, inspector Phase 1 ack).
- [x] (Must) `N == M` 등식 — `N = Object.keys({...deps,...devDeps}).length`, `M = npm ls --depth=0 2>&1 | grep -cE "^[├└]"`. baseline `N=29 / M=866 / diff=837` → HEAD=`9e5f00a` 실측 `N=29 / M=29 / diff=0` (회수, inspector Phase 1 ack).
- [ ] (Must) 본 두 게이트는 신규 dep 추가·제거·메이저 bump 이벤트 후 1 PR 안에 동시 충족 (시점 비의존) — 단일 사례 박제, 차기 dep 이벤트 후 재검증으로 marker 플립 누적.
- [ ] (Should) 회수 수단 (`rm -rf node_modules && npm ci` / `npm install` / `npm prune` / lockfile 재생성 / 패키지 매니저 전환) 택1 — task 단계 planner / developer 가 본 spec §변경 이력에 박제. 어느 경로든 G1·G2 동시 충족.
- [x] (Should) 본 게이트는 CI workflow step 또는 pre-commit/pre-push 훅 또는 `scripts.<name>` npm script (예: `npm run check:deps`) 로 자동 실행 — PR 단계 회귀 검출. 수단 선정은 task 위임 — TSK-20260517-09 `7d085a3` 수렴 ack (수단 복합: `scripts/check-deps-coherence.sh` POSIX shell + `package.json scripts.check:deps` + `.github/workflows/ci.yml:28→:29` CI step + `.husky/pre-push:1` pre-push 호출 2 채널 박제). REQ-007 흡수 후 pre-commit 채널 추가 박제 axis (G6) — marker 재오픈이 아니라 시점 분포 강화.
- [x] (Must, 회귀 0) extraneous 0 수렴 후 `npm run build` exit=0 / `npm test` exit=0 / `npm run lint` exit=0 유지 — 회수 과정에서 의존성 의도 graph 절단 0. HEAD=`9e5f00a` 실측 PASS (build 311ms / test 439 pass / lint clean).
- [x] (Must, 범위 제한) transitive tree (depth>0), 메이저 버전 정합, lockfile 정합, binary 가용성, `npm audit` vulnerability 0 은 본 게이트 위반으로 카운트되지 않음 (각각 별 spec / 별 req) — 정의상 항상 참, marker 플립.
- [ ] **(Must, G6.1 — REQ-007 흡수)** `.husky/pre-commit` 본문에 `check:deps` 효능 명령 (`npm run check:deps` 또는 `bash scripts/check-deps-coherence.sh` 직접 호출 등) 이 1+ 회 호출된다. `grep -nE "check:deps|check-deps" .husky/pre-commit` → **≥ 1 hit**. HEAD=`cd75eed` baseline **0 hit** (회수 task carve 후 developer 영역 marker 플립 — gate (af) 박제).
- [ ] **(Must, G6.2 — REQ-007 흡수)** deps coherence drift 도입 commit (G1 extraneous ≠ 0 또는 G2 N ≠ M) 시도 시 `pre-commit` hook rc ≠ 0 → commit object 미생성 + stderr extraneous/diff 메시지. fixture 환경 재현 가능 — `npm install --no-save <extraneous-pkg>` 또는 `package.json` declared 1 항목 제거 후 `git commit -m "test"` → rc=1.
- [ ] **(Must, G6.3 — REQ-007 흡수)** drift 미도입 (G1=0 ∧ G2 N=M) 상태 `git commit -m "test"` → rc=0 + commit object 생성. false-positive 0. 본 게이트가 정상 commit 차단을 도입하지 않음.
- [ ] **(Must, G6.4 — REQ-007 흡수, 회귀 0)** pre-commit 채널 추가 후 기존 hook 분기 — `npx lint-staged` (line 1) + `check-spec-coherence` 조건부 (line 4-7, REQ-076) + `check-vite-env-coherence` 조건부 (line 11-13, REQ-083) — rc 와 grep 정합 유지. REQ-076 / REQ-080 / REQ-083 효능 회귀 0.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 시스템 횡단 게이트 박제 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`7477189`, 2026-05-17 — REQ-073 §배경 실측 인용. 본 inspector 세션은 환경 회귀로 `npm ls` 재실행 불가 — req 측 baseline 채택):
  - `package.json:6-15` (dependencies 8 항목) + `:42-64` (devDependencies 21 항목) → declared `N = 29`.
  - `npm ls --depth=0 2>&1 | wc -l` → 868 lines (헤더 2 + root entries 866).
  - `npm ls --depth=0 2>&1 | grep -cE "^[├└]"` → root entries `M = 866`.
  - `npm ls --depth=0 2>&1 | grep -cE " extraneous$"` → **extraneous = 837**.
  - 표본 extraneous (대표 5건, 전수 박제는 비현실적):
    - `react-scripts@5.0.1` — CRA 진입점, package.json 미선언.
    - `fork-ts-checker-webpack-plugin@6.5.2` — CRA TS 체커.
    - `tsutils@3.21.0` — TS utility.
    - `@aws-sdk/client-cognito-identity@3.213.0` — AWS SDK (Cognito 호출용 잔재).
    - `@ampproject/remapping@2.2.0` — webpack sourcemap util.
  - 카테고리 분포 (top-level, 표본 enumerate): CRA / react-scripts 계열, `@babel/*` 다수, `@aws-crypto/*` + `@aws-sdk/*` 다수, webpack/sourcemap util — 모두 vite 전환 (REQ-20260420-016 추정) 후 정리되지 않은 잔재.
  - 부수 신호 (본 spec 외): `npm ls typescript` 결과에 `msw@0.47.4 invalid: "^2.13.4"` — `msw` declared 2.x ↔ installed 0.x 메이저 invalid. 본 spec 의 extraneous 와 직교, REQ-20260517-063 (`runtime-dep-version-coherence`) 영역 분리.
- **grep-baseline G6** (HEAD=`cd75eed`, 2026-05-18 — REQ-007 흡수 시점 inspector 87차 tick 실측 박제):
  - (af) `grep -nE "check:deps|check-deps" .husky/pre-commit` → **0 hit** (commit 단계 미부착 = baseline FAIL — gate G6.1 위반 평서화).
  - (ag) `grep -nE "check:deps|check-deps" .husky/pre-push` → **1 hit** @`:1` `npm run check:deps || exit 1` (push 단계 부착 — G4 박제 유지).
  - (ah) `grep -nE "check:deps|check-deps" .github/workflows/ci.yml` → **1 hit** @`:29` `run: npm run check:deps` (CI 단계 부착 — G4 박제 유지; req 본문 박제 `:28` 와 1 line shift — HEAD 측정값 우선 박제).
  - (ai) `grep -nE "\"check:deps\":" package.json` → **1 hit** @`:26` `"check:deps": "bash scripts/check-deps-coherence.sh"` (진입점 박제 — G4 유지).
  - (aj) 자동 게이트 시점 분포 현황 — { CI: ✓ (ah) / pre-push: ✓ (ag) / pre-commit: ✗ (af) / npm script 진입점: ✓ (ai) } — 4 채널 중 3 부착 / 1 미부착. **비대칭 축: commit 단계 미부착**. G6.1 회수 후 4 채널 동시 부착 (CI ✓ + pre-push ✓ + pre-commit ✓ + npm script ✓) 박제 가능.
- **rationale**: G1·G2 baseline 은 본 spec 발행 시점 박제 — 향후 회귀 분석 시 위반 hit 수 변화 추적 기준. 837 extraneous / `N=29 / M=866` 는 §배경 측정값 기록일 뿐, 본 spec 의 §수용 기준은 hit 수 비의존 (RULE-07 정합). 본 inspector 세션은 `npm install` 미수행 환경 (사전 회귀) — `npm ls` 재실행 불가, req 측 baseline 채택 정합 (동일 HEAD 영역 측정). G6 baseline gate (af)/(ag)/(ah)/(ai)/(aj) 5건 HEAD=`cd75eed` 직접 실측 박제 — (af) 0 hit baseline FAIL 평서화는 위반 사실의 시스템 효능 계약 measure anchor 박제 (RULE-07 정합 — 1회성 incident 진단 아님, 시점 비대칭 시스템 불변식 측정값). 회수 수단 (hook 본문 어느 line / 조건부 vs 무조건 / `npm run` vs `bash` 직접 / lint-staged 직렬 순서) 은 모두 valid — G6.4 수단 중립 자기 검증 (수단 라벨 0 — `awk '/^### 6\.4/,/^### 6\.5/' node-modules-extraneous-coherence.md | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-073 흡수) / `8ae2242` | 최초 박제 — `node_modules` ↔ `package.json` declared 일관성 (G1 extraneous 0 + G2 `N == M` 등식) 두 축 게이트. baseline 837 extraneous / `N=29 / M=866`. | all |
| 2026-05-17 | inspector (Phase 1 ack, 환경 회복 시점) / `9e5f00a` | G1 837 → 0 / G2 `M=866 → 29 / diff=837 → 0` 실측 PASS (운영자 외부 수단 `npm install/prune` 회수, package.json 변경 0). 회귀 0 검증 `build 311ms / test 439 pass / lint clean` 동시 충족. 테스트현황 G1·G2 + 수용기준 Must G1·Must G2·Must 회귀 0·Must 범위제한 marker 플립. Should 수단 박제 / Should 자동 게이트 / G3 차기 이벤트 marker 유보. | 테스트 현황, 수용 기준 |
| 2026-05-17 | inspector (Phase 1 reconcile, hook-ack) / HEAD=`4b5cc1d` | (G4) 자동 게이트 marker + (Should) 자동 게이트 marker 2건 `[ ]→[x]` 플립. hook-ack 근거: TSK-20260517-09 `node-modules-extraneous-ci-gate` `7d085a3` (HEAD 조상) — `.github/workflows/ci.yml:28` `npm run check:deps` + `.husky/pre-push:1` `npm run check:deps || exit 1` + `scripts/check-deps-coherence.sh` POSIX shell + `package.json:26` `scripts.check:deps` 진입점 박제. HEAD=`4b5cc1d` 재실측: `grep -nE "check:deps\|check-deps" .github/workflows/ci.yml .husky/pre-push` → 2 hit 박제 PASS. G3 (시점 비의존 1 PR 동시 충족) marker 유보 — 차기 dep 이벤트 발생 후 재검증 누적 대기. | 테스트 현황 G4, 수용 기준 Should 자동 게이트 |
| 2026-05-18 | inspector (87차 tick, Phase 2 REQ-20260518-007 흡수) / HEAD=`cd75eed` | REQ-007 흡수 (deps coherence pre-commit shift-left axis) — 헤더 갱신 + §역할 G6 verification-point symmetry 추가 + §동작 G6.1~G6.5 5 sub-항목 신규 박제 + §의존성 역의존 확장 (husky-pre-push-typecheck 직교 축 추가 + 4 채널 명시) + §테스트 현황 G6.1/G6.2/G6.3 3 marker `[ ]` 신규 (회수 후 플립 대기) + §수용 기준 4건 (G6.1/G6.2/G6.3/G6.4 회귀 0) 신규 + §스코프 규칙 grep-baseline G6 (af)(ag)(ah)(ai)(aj) 5건 HEAD=`cd75eed` 직접 실측 박제 — (af) `.husky/pre-commit` 0 hit baseline FAIL 평서화 + (ag) `.husky/pre-push:1` 1 hit 유지 + (ah) `.github/workflows/ci.yml:29` 1 hit (req 본문 `:28` vs HEAD `:29` 1 line shift 박제) + (ai) `package.json:26` 진입점 1 hit 유지 + (aj) 4 채널 분포 3 부착 / 1 미부착 비대칭 평서화 + 수단 라벨 0 자기 검증. RULE-07 자기 검증 6 축 PASS (평서 + 반복 검증 + 시점 비의존 + incident 비귀속 + 수단 중립 + self-reference scope 분리). | 헤더, 역할, 동작 G6, 의존성 역의존, 테스트 현황 G6, 수용 기준 G6 4건, 스코프 규칙 G6 baseline |
