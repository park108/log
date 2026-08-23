# 브라우저 타깃 정책 선언 ↔ 실재 소비 채널 vacuous-declared-policy 부재 시스템 불변식

> **위치**: `package.json` (`browserslist` 키) · `.browserslistrc` (외부화 표면) ↔ build/lint/test toolchain 측 소비 채널 (`devDependencies` consumer / `vite.config.js` `build.target`)
> **관련 요구사항**: REQ-20260518-024
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: vacuous 선언 제거 회수 + green→blue promote)

> 참조 코드는 **식별자 우선, 라인 번호 보조**.

## 역할

선언된 브라우저 타깃 정책 토큰은 **실재 소비 채널 ≥ 1** 을 동반해야 한다. 소비자 없이 남은 선언은 어떤 산출물에도 영향을 주지 못하면서 정책이 살아 있는 것처럼 읽히는 **silent policy island** 가 된다 — 읽는 사람은 그 값이 빌드를 규율한다고 믿지만 실제로는 아무 일도 하지 않는다.

본 불변식은 선언의 **존재를 요구하지 않는다**. 요구하는 것은 존재와 소비의 동행이다:

- 선언이 있다 ∧ 소비 채널 0 → **위반** (vacuous-declared-policy)
- 선언이 있다 ∧ 소비 채널 ≥ 1 → 충족
- 선언이 없다 → 충족 (vacuous 자체가 성립하지 않음)

현 baseline 은 세 번째 상태다. 브라우저 타깃 정책의 단일 출처는 Vite `build.target` (미설정 → Vite 기본 정책) 이며, TypeScript 출력 타깃 `tsconfig.json` `target: "ES2020"` 은 별 toolchain 축으로 직교한다.

의도적으로 하지 않는 것: 브라우저 지원 범위 자체의 결정 (제품 정책 영역), Vite `build.target` 값 선정, `.browserslistrc` 외부화 채택 여부, PostCSS/autoprefixer 도입 여부.

## 공개 인터페이스

없음 (런타임 인터페이스 아님). 측정 표면 3종 — `package.json` (`browserslist` 키 유무 + `dependencies`/`devDependencies` consumer 식별), `.browserslistrc` (외부화 파일 실재), `vite.config.js` (`build.target` 의 browserslist 파생 여부).

## 동작

1. **(I1) 선언 표면 관측** — `package.json` 의 `browserslist` 키 유무 + `.browserslistrc` 실재. 둘 중 하나라도 있으면 "선언됨".
2. **(I2) 소비 채널 관측** — 합 = C-1 + C-2.
   - **C-1** `dependencies` / `devDependencies` 의 standard browserslist consumer (`@babel/preset-env` / `autoprefixer` / `postcss-preset-env` / `eslint-plugin-compat`) 식별 수.
   - **C-2** `vite.config.js` 가 `build.target` 을 browserslist 에서 파생하는지 (Vite 기본 target 은 browserslist 를 참조하지 않으므로 명시적 opt-in 필요).
   - **C-3** `.browserslistrc` 는 선언 표면이지 소비 채널이 아니다 — (I1) 에 계수되고 (I2) 에는 계수되지 않는다.
3. **(I3) vacuous 판정** — 선언됨 ∧ 소비 채널 합 = 0 → 위반. 그 외 충족.
4. **(I4) 전이 의존 비계수** — `npx browserslist` 가 해석된다는 사실은 소비 채널이 아니다. `browserslist` 패키지는 다른 devDep 의 전이 의존으로 설치될 수 있으며, 그 존재는 이 프로젝트의 선언을 누가 읽는지에 대해 아무것도 말해주지 않는다.
5. **(I5) 회귀 시나리오**
   - (R-1) `browserslist` 키를 소비자 없이 재도입 → (I3) 위반.
   - (R-2) `.browserslistrc` 외부화만 도입 → (I3) 위반.
   - (R-3) consumer 도입 후 선언 삭제 → consumer 측 fallback (`defaults` 쿼리) 으로 조용히 동작 — 선언 없음이므로 본 불변식은 충족이나, 타깃 정책 단일 출처가 흐려지는 별 신호.
   - (R-4) `package.json` 선언 + `.browserslistrc` 동시 존재 → 정책 표면 2 위치 분기 (외부 파일 우선). 본 불변식과 직교한 별 축.
6. **(I6) 자체 진단 제외** — 게이트 scope 는 `package.json` / `.browserslistrc` / `vite.config.js` 세 표면으로 한정. 본 spec / fixture 본문의 문자열 occurrence 는 게이트 입력이 아니다.
7. **(I7) 타깃 정책 축 직교** — `tsconfig.json` `target` (TypeScript 출력 타깃) ↔ Vite `build.target` (번들 다운레벨 타깃) ↔ browserslist (브라우저 질의 정책) 는 별 toolchain 이다. 본 불변식은 셋의 값 정합을 요구하지 않는다.

## 의존성
- 내부: `package.json:43-54` (`browserslist` 객체 = 본 spec 의 정책 surface), `package.json:56-78` (`devDependencies` = 본 spec 의 consumer 식별 surface), `vite.config.js:48-60` (`build` 블록 `target` 키 = 본 spec 의 보조 consumer surface), `.browserslistrc` (외부화 표면, 현 baseline 부재).
- 외부: [browserslist 공식 README](https://github.com/browserslist/browserslist#queries) (env 키 / 쿼리 문법 / consumer 자동 발견 규약), [Vite Config — `build.target`](https://vitejs.dev/config/build-options.html#build-target) (Vite 8 기본 `'baseline-widely-available'`, browserslist 자동 참조 아님), `caniuse-lite` npm DB (쿼리 평가 데이터 공급원).
- 역의존 (사용처): build artifact lowering / polyfill 주입 결정이 본 spec 의 6 쿼리 토큰 active 보장에 부분 의존 (vacuous-declared-policy 상태에서는 build artifact 0 영향 — silent island).
- 직교 spec:
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-053 / REQ-058 / REQ-076) — Vite/oxc/esbuild/eslint 도구 채널 박제. browserslist 미박제 (별 axis — 도구 식별 vs 도구 입력 정책).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421 계열) — 의존성 bump 회귀 게이트 (lint/test/build 회귀 0 + React deprecated runtime warning 0). 본 spec 과 직교 (bump 게이트 vs 박제 토큰 active 보장).
  - `specs/60.done/2026/05/17/req/20260517-node-runtime-version-3axis-coherence.md` (REQ-20260517) — Node 런타임 버전 3축 정합. 같은 "정책 토큰 cross-surface" 패턴, 별 토큰 (Node 런타임 vs 브라우저 타깃) — 직교.
- 자매 패턴 (정책 토큰 vacuous-zero 결과 효능 axis): `vitest-coverage-exclude-pattern-vacuous-zero-axis.md` (REQ-20260518-012) 와 결과 효능 형식 동질 (박제 토큰 ↔ 실재 매치/소비 표면 양면 정합), 측정 surface 직교 (build target 정책 ↔ consumer toolchain vs test coverage exclude ↔ 디스크 매치).

## 스코프 규칙

- **expansion**: 불허 — 본 게이트 충족 목적 변경은 `package.json`, `.browserslistrc`, `vite.config.js`, `src/__tests__/browserslist-vacuous-declared-policy.test.ts` 로 한정.
- **grep-baseline** (2026-08-24 실측, 회수 후):
  - `node -e "console.log('browserslist' in require('./package.json'))"` → **false** (선언 표면 부재).
  - `ls .browserslistrc` → **부재**.
  - C-1 `dependencies` + `devDependencies` 내 consumer 식별 → **0**.
  - C-2 `grep -c browserslist vite.config.js` → **0**.
  - `grep -nE "^\s*target:" vite.config.js` → **0 hit** (Vite 기본 정책).
  - `tsconfig.json` `compilerOptions.target` → `"ES2020"` (별 축).
  - 회수 전 baseline (HEAD `9cc2f70`): 선언 6 쿼리 (2 env × 3) / C-1 0 / C-2 0 → **vacuous-declared-policy 위반 상태**.
- **rationale**: 선언 유무는 JSON 키 존재로, 소비 채널은 의존성 이름 집합과 `vite.config.js` 텍스트로 판정한다 — 셋 다 결정론이며 네트워크·산출물 비의존.

## 테스트 현황

게이트: `src/__tests__/browserslist-vacuous-declared-policy.test.ts` (10 `it`, 전수 PASS).

- [x] (I1) 선언 표면 관측 — `package.json` `browserslist` 키 **부재** + `.browserslistrc` **부재**.
- [x] (I2) 소비 채널 관측 — C-1 = 0, C-2 = 0.
- [x] (I3) vacuous 판정 — 선언 없음 → 충족. 판정 함수 `isVacuousDeclaredPolicy(surfaces)` 를 순수 함수로 두고 5 분기를 합성 입력으로 검증 (선언만 / 외부화만 / C-1 동반 / C-2 동반 / 미선언).
- [x] (I4) 전이 의존 비계수 — `browserslist@4.28.8` 은 `eslint-plugin-react-hooks → @babel/core → @babel/helper-compilation-targets` 경로로 설치돼 있으나 소비 채널로 계수하지 않는다.
- [x] (I6) 자체 진단 제외 — 게이트 scope 3 표면 한정.
- [x] (I7) 타깃 정책 축 직교 — `vite.config.js` `target` 미명시 + `tsconfig` `target: "ES2020"` 동시 단언.

## 수용 기준

- [x] (Must, FR-01) 선언 표면이 있으면 소비 채널 합 ≥ 1 이다. 현 baseline 은 선언 부재로 충족.
- [x] (Must, FR-02) vacuous-declared-policy 상태가 아니다 — 회수 전 위반 상태에서 선언 제거로 해소.
- [x] (Must, FR-03) 자체 진단 가능 — 3 표면 관측만으로 결정론 판정. 외부 명령·네트워크·빌드 산출물 비의존.
- [x] (Must, FR-04) 발화 채널 부착 — `npm test` (CI `Test` step) 이 본 게이트를 흡수.
- [x] (Must, FR-05) 회귀 (R-1)(R-2) 는 게이트가 검출한다 — 합성 입력 분기로 확인.
- [x] (Should, FR-06) 해소 수단 중립 — 본 불변식은 선언 제거 / consumer 도입 어느 쪽으로도 충족 가능하며, 본문은 어느 쪽에도 선호 라벨을 붙이지 않는다. 회수 시 선택한 경로와 근거는 §회수 근거 에 사실로 기록한다.

### 회수 근거

선언은 `071f1dd` (2021-03-01, *Initialize project using Create React App*) 이 남긴 것으로, 이후 5년간 값이 변경된 적이 없다. Vite 이관 후 어떤 채널도 읽지 않았다.

| 표면 | 회수 전 |
|---|---|
| `package.json` `browserslist` | production 3 쿼리 + development 3 쿼리 |
| C-1 devDeps consumer | 0 |
| C-2 Vite `build.target` browserslist 파생 | 0 |
| `.browserslistrc` | 부재 |

vacuous 임을 **산출물로 실증**했다 — 제거 전후 `build/**` 전체 파일 목록 동일 + 내용 해시 `146fc1164581b048d93bfc3a44f85e7ca106c7b5ef3cd9b4a25810b9fce8e51a` 로 바이트 동일.

소비자를 도입하는 경로(Vite `build.target` 파생 / autoprefixer)도 불변식을 충족시키지만 선택하지 않았다. `>0.2%, not dead` 는 `tsconfig` `target: "ES2020"` 보다 낮은 타깃을 끌어와 번들 다운레벨을 유발하며, 5년간 아무도 행사하지 않은 정책을 이제 와 실체화하는 것은 현 상태를 기록하는 것이 아니라 새 정책을 도입하는 결정이다. 브라우저 지원 범위는 제품 정책 영역이므로 본 spec 의 §역할 "의도적으로 하지 않는 것" 에 둔다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-19 | inspector 126차 tick / HEAD `dbbff6d` | REQ-20260518-024 흡수 — `package.json:43-54` `browserslist` 6 쿼리 토큰 (2 env × 3 쿼리) ↔ build/lint/test toolchain consumer 채널 (C-1 devDeps standard consumer 식별 + C-2 Vite build.target 명시 + C-3 `.browserslistrc` 외부화) hit 합 ≥ 1 양면 정합 vacuous-declared-policy 결과 효능 불변식 박제 (I1~I8 평서 + FR-01 ack baseline + FR-02 vacuous-declared-policy 자체 진단 FAIL surface 명시 박제 (현 baseline 0 hit) + FR-03/04/05 deferred 수단/발화 위임). 자매 패턴 직교 정합 (REQ-20260518-012 `vitest-coverage-exclude-pattern-vacuous-zero-axis.md` 결과 효능 형식 동질, 측정 surface 직교). | all (신규) |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | vacuous 선언 제거 회수 + 불변식 재정식화. §역할 을 "선언 존재 + 소비" 에서 "선언과 소비의 동행 (선언 없으면 충족)" 으로 바꿔 선언 부재 상태를 정상 baseline 으로 박제. `package.json` `browserslist` 6 쿼리 삭제 — 제거 전후 `build/**` 바이트 동일(`146fc116…`) 실증. `src/__tests__/browserslist-vacuous-declared-policy.test.ts` 신설 (10 `it`, 재도입 5 분기 합성 검증). (I1)~(I7) + FR-01~FR-06 전수 flip. green→blue promote. | §역할 / §동작 / §스코프 규칙 / §테스트 현황 / §수용 기준 |
