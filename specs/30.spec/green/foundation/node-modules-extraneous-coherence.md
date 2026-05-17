# `node_modules` ↔ `package.json` declared deps 일관성 — extraneous 0 hit 정합

> **위치**: 횡단 시스템 불변식 — `package.json` 의 `dependencies + devDependencies` 선언 집합과 `node_modules/` 의 top-level installed 집합. 단일 식별자 없음 (게이트는 `npm ls --depth=0` 출력 측정).
> **관련 요구사항**: REQ-20260517-073
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제)

> 본 spec 은 시스템 횡단 게이트. 라인 번호 박제 없음 — 837 extraneous / `N=29 / M=866` baseline 은 §스코프 규칙 grep-baseline 에 박제 (시점 비의존, RULE-07 §양성 기준 정합).

## 역할
`package.json` 의 `dependencies + devDependencies` 에 선언되지 않은 패키지가 `node_modules/` (top-level depth=0) 에 잔존하지 않는다는 **상시 시스템 정합** 박제 — "선언 = 설치" 등식 불변식. 의도적으로 하지 않는 것: transitive dependency tree 정합 (depth>0), 메이저 버전 정합 (REQ-20260517-063 영역), binary 가용성 (REQ-20260517-064 영역), typescript devDep 정합 (REQ-20260517-061 영역), `msw@0.47.4 ↔ ^2.13.4` 메이저 invalid 신호 (runtime-dep-version-coherence 영역), lockfile (`package-lock.json`) 정합, `npm audit` vulnerability 0, 회수 수단 선정 (`npm prune` / `rm -rf node_modules && npm ci` / 패키지 매니저 전환 중 어느 경로든 valid).

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

## 의존성
- 내부: `package.json` (G2 declared 입력), `node_modules/` (G1·G2 installed 입력).
- 외부: `npm` CLI (G1·G2 측정 명령), `node` (G2 declared 카운트), `grep` (G1·G2 라인 카운트).
- 역의존 (사용처): `specs/30.spec/blue/foundation/regression-gate.md` (CI 정합 게이트 일반 — 본 spec 의 자동 게이트 박제 위치 후보), `specs/30.spec/blue/foundation/dependency-bump-gate.md` (dep bump 시 검증 게이트 — 메이저 bump 정합 영역으로 인접, 본 spec 은 "선언 = 설치 등식" 직교 영역). CI workflow step / pre-commit / pre-push 훅 / `scripts.<name>` npm script (수단은 task 위임).
- 직교 (영역 분리): REQ-20260517-061 (`toolchain-version-coherence` — typescript devDep ↔ installed 메이저 정합), REQ-20260517-063 (`runtime-dep-version-coherence` — React 계열 + 비-React 계열 메이저 정합), REQ-20260517-064 (`devbin-install-integrity` — binary resolve 가용성). 본 spec 은 위 3 영역의 보완 — "선언 = 설치 등식" 횡단 게이트.

## 테스트 현황
- [x] (G1) `npm ls --depth=0 2>&1 | grep -cE " extraneous$"` → 0 게이트 — HEAD=`9e5f00a` 실측 0 (baseline 837 → 0 회수).
- [x] (G2) `N == M` 등식 — HEAD=`9e5f00a` 실측 `N=29 / M=29 / diff=0` (baseline `N=29 / M=866 / diff=837` → 회수).
- [ ] (G3) 신규 dep 추가/제거 후 동일 PR 안에 G1·G2 동시 충족 — 단일 사례 (환경 회복 시점) 박제, 차기 dep 이벤트 후 재검증으로 marker 플립 누적.
- [ ] (G4) CI / pre-commit / pre-push 훅 / `scripts.<name>` npm script 박제 — 회귀 방지 자동 게이트.

## 수용 기준
- [x] (Must) `npm ls --depth=0 2>&1 | grep -cE " extraneous$"` → **0**. baseline 837 hits → HEAD=`9e5f00a` 실측 0 (회수, inspector Phase 1 ack).
- [x] (Must) `N == M` 등식 — `N = Object.keys({...deps,...devDeps}).length`, `M = npm ls --depth=0 2>&1 | grep -cE "^[├└]"`. baseline `N=29 / M=866 / diff=837` → HEAD=`9e5f00a` 실측 `N=29 / M=29 / diff=0` (회수, inspector Phase 1 ack).
- [ ] (Must) 본 두 게이트는 신규 dep 추가·제거·메이저 bump 이벤트 후 1 PR 안에 동시 충족 (시점 비의존) — 단일 사례 박제, 차기 dep 이벤트 후 재검증으로 marker 플립 누적.
- [ ] (Should) 회수 수단 (`rm -rf node_modules && npm ci` / `npm install` / `npm prune` / lockfile 재생성 / 패키지 매니저 전환) 택1 — task 단계 planner / developer 가 본 spec §변경 이력에 박제. 어느 경로든 G1·G2 동시 충족.
- [ ] (Should) 본 게이트는 CI workflow step 또는 pre-commit/pre-push 훅 또는 `scripts.<name>` npm script (예: `npm run check:deps`) 로 자동 실행 — PR 단계 회귀 검출. 수단 선정은 task 위임.
- [x] (Must, 회귀 0) extraneous 0 수렴 후 `npm run build` exit=0 / `npm test` exit=0 / `npm run lint` exit=0 유지 — 회수 과정에서 의존성 의도 graph 절단 0. HEAD=`9e5f00a` 실측 PASS (build 311ms / test 439 pass / lint clean).
- [x] (Must, 범위 제한) transitive tree (depth>0), 메이저 버전 정합, lockfile 정합, binary 가용성, `npm audit` vulnerability 0 은 본 게이트 위반으로 카운트되지 않음 (각각 별 spec / 별 req) — 정의상 항상 참, marker 플립.

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
- **rationale**: G1·G2 baseline 은 본 spec 발행 시점 박제 — 향후 회귀 분석 시 위반 hit 수 변화 추적 기준. 837 extraneous / `N=29 / M=866` 는 §배경 측정값 기록일 뿐, 본 spec 의 §수용 기준은 hit 수 비의존 (RULE-07 정합). 본 inspector 세션은 `npm install` 미수행 환경 (사전 회귀) — `npm ls` 재실행 불가, req 측 baseline 채택 정합 (동일 HEAD 영역 측정).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-073 흡수) / `8ae2242` | 최초 박제 — `node_modules` ↔ `package.json` declared 일관성 (G1 extraneous 0 + G2 `N == M` 등식) 두 축 게이트. baseline 837 extraneous / `N=29 / M=866`. | all |
| 2026-05-17 | inspector (Phase 1 ack, 환경 회복 시점) / `9e5f00a` | G1 837 → 0 / G2 `M=866 → 29 / diff=837 → 0` 실측 PASS (운영자 외부 수단 `npm install/prune` 회수, package.json 변경 0). 회귀 0 검증 `build 311ms / test 439 pass / lint clean` 동시 충족. 테스트현황 G1·G2 + 수용기준 Must G1·Must G2·Must 회귀 0·Must 범위제한 marker 플립. Should 수단 박제 / Should 자동 게이트 / G3 차기 이벤트 marker 유보. | 테스트 현황, 수용 기준 |
