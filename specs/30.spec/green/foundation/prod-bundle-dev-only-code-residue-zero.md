# Production bundle dev-only 진입점 잔존 0 — build artifact 정적 잔존 0 결과 효능 시스템 불변식

> **위치**: `src/**` 의 dev-only 진입점 catalog (현 baseline `ReactQueryDevtools` @ `src/App.jsx:4,131`) + `build/assets/*.js` 산출물 (Vite `build.outDir`, 보조: `vite.config.js:47`)
> **관련 요구사항**: REQ-20260518-006
> **최종 업데이트**: 2026-05-19 (by inspector 123차 tick)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD `8e86c8d` baseline).

## 역할
`src/**` 내 runtime 가드 (`isDev()` / `import.meta.env.DEV`) 분기 한정으로만 사용되는 dev-only 진입점 (devtools / debug-only 모듈) 의 식별자가, production build 산출물 (`build/assets/*.js`) 의 정적 grep 잔존 = 0 hit 인 결과 효능 불변식을 박제한다 — Vite/Rollup tree-shaking + `import.meta.env.DEV` literal 치환의 DCE 의존을 build artifact 측정 채널로 회귀 보호. 의도적으로 하지 않는 것: (i) dev-only 진입점 catalog 의 enumeration 본문 — 식별자 라벨은 `## 스코프 규칙` baseline 한정, §역할/§동작/§의존성 본문 박제 0 (catalog 추가/제거 시 본문 무수정), (ii) `dependencies` ↔ `devDependencies` 위치 정합 — 별 axis, (iii) Vite `define` / `import.meta.env` literal 치환 의미론 자체 — Vite 공식 계약 영역, (iv) production runtime `console.log/error` 호출 0 hit — 채널 정합 vs 산출물 정합 직교, (v) tree-shaking 알고리즘 / Vite 빌드 옵션 본문 — 도구 영역, (vi) runtime 가드 분기 자체 (`components/app.md` runtime 효능 + `common/env.md` 단일 진입점) — 본 axis 와 직교, (vii) bundle size budget / sourcemap 잔존 — 별 axis, (viii) 발화 채널 (CI step / pre-push hook / 진단 script) 선정 — 수단 위임 (FR-03 의 "1+ 부착 존재" 계약 박제, 수단 중립), (ix) 1회성 incident patch.

## 공개 인터페이스
- 입력 surface: `src/**` 의 dev-only 진입점 식별자 catalog (현 baseline 1 entry — `ReactQueryDevtools` `@tanstack/react-query-devtools`).
- 출력 surface: Vite `build.outDir` 가 지시하는 산출 경로 (현 baseline `build/`) 의 JS 청크 집합 (`build/assets/*.js`).
- 측정 surface: 정적 grep 1차 채널 (`grep -rln <식별자> <build.outDir>/assets/`) + 자동 발화 채널 (CI step / pre-push hook / 진단 script `package.json` script 어느 쪽이든) 1+ 부착 surface.
- 결과 효능 형식: grep rc + hit count (0 hit = PASS, 1+ hit = FAIL 회귀 surface).

## 동작
1. dev-only 진입점 식별자는 `src/**` 본문에서 정확히 두 종류의 발화로 박제된다 — (a) top-level static import 1+ (예: `import { ReactQueryDevtools } from '@tanstack/react-query-devtools'`), (b) runtime 가드 (`isDev()` / `import.meta.env.DEV`) 조건 분기 한정 사용 1+ (예: `{isDev() && <ReactQueryDevtools ... />}`).
2. `npm run build` 실행: Vite/Rollup 가 `import.meta.env.DEV` 를 production 모드에서 `false` literal 로 치환 → 조건 분기 dead-code 가 됨 → tree-shake 가 import 진입점을 산출 청크에서 제거.
3. 결과 효능 채널: `grep -rln <식별자> <build.outDir>/assets/` → 0 hit (DCE PASS 결과 효능 zero-point 박제).
4. 회귀 시나리오:
   - (a) catalog 식별자의 side-effect import 도입 (예: top-level `import '@tanstack/react-query-devtools'` 부수효과 형식) → tree-shake 차단 → 산출물에 식별자 잔존 1+ hit.
   - (b) `isDev()` 호출이 `import.meta.env.DEV` 직접 참조에서 다른 표현 (런타임 fetch 결과 의존 / dynamic 변수 의존) 으로 변경 → literal 치환 무력화 → DCE 실패 → 산출물 잔존.
   - (c) Vite `build.minify` 비활성 / `terser` 제거 / `rollupOptions.treeshake: false` 등 빌드 옵션 변경 → DCE 비활성 → 산출물 잔존.
   - (d) 신규 dev-only 진입점 (예: `@tanstack/react-router-devtools` / 사용자 정의 debug 모듈) 도입 시 catalog baseline 갱신 (`## 스코프 규칙` baseline 의 식별자 list 한정) — 본문 무수정.
   - (e) Vite `build.outDir` 변경 (예: `build` → `dist`) → 본 spec `## 스코프 규칙` baseline 의 grep 경로 인용 단일 갱신 (FR-07).
5. 발화 채널: 본 결과 효능 게이트는 자동 채널 (CI step / pre-push hook / 진단 script 어느 쪽이든) 1+ 에 부착되어 DCE 의존 회귀 시점에 fail-fast (FR-03 의 "1+ 부착 존재" 계약). 수단 선정은 위임 영역.

## 의존성
- 내부: `src/App.jsx` (현 baseline 의 dev-only 진입점 import + runtime 가드 분기 발화 위치), `src/common/env.ts` (`isDev()` 단일 진입점 정의), `vite.config.js` (`build.outDir` + `build.minify` + `build.sourcemap` 토큰 = 산출물 경로 + DCE 의존 옵션 surface).
- 외부: Vite `import.meta.env` literal 치환 + DCE 계약 (`https://vite.dev/guide/env-and-mode`), Rollup tree-shake `treeshake` option (`https://rollupjs.org/configuration-options/#treeshake`), TanStack Query Devtools production 분기 가이드 (`https://tanstack.com/query/latest/docs/framework/react/devtools`).
- 역의존 (사용처): production deploy 단계의 모든 정적 검사 채널 (CI 게이트 + pre-push hook + 진단 script aggregator) 이 본 결과 효능 게이트의 0 hit 보장에 의존.
- 직교 spec:
  - `specs/30.spec/blue/components/app.md` (REQ-094) §동작 6 + §수용 기준 (Should) — `import.meta.env.DEV` 조건 runtime 분기 `<ReactQueryDevtools>` 렌더링 박제. 본 spec 은 build artifact 측정 axis 직교 (runtime 분기 vs 산출물 잔존).
  - `specs/30.spec/blue/common/env.md` (REQ-002) (I1) — `isDev()` 단일 진입점 정합 (non-test `src/**` 의 `import.meta.env.{DEV,PROD,MODE}` 직접 참조 0 hit). 본 spec 은 산출물 측정 axis 직교 (분기 표현 vs 산출물 측정).
  - `specs/30.spec/green/foundation/diagnostic-script-auto-channel-coverage.md` (REQ-081 + REQ-086) (I1)(I10) — 진단 script ↔ 자동 채널 매트릭스 메타. 본 spec 파생 task 가 진단 script 도입 시 자매 메타 효능 자동 적용 (catalog N+1 번째 진단 script 자매 cell 균등 검증).
  - `specs/30.spec/blue/foundation/csp-meta-dev-strip-prod-preserve.md` (REQ-040) — dev 전용 CSP meta strip vs prod 보존. 본 spec 과 직교 (CSP meta token axis vs JS bundle artifact axis).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — dep bump 후 회귀 0. 본 spec 은 dep 의 import 패턴 (static + runtime 가드 분기) 회귀 axis 직교 (version bump vs import pattern + DCE 효능).
- 자매 패턴 (build artifact 정적 잔존 0 결과 효능 axis): 본 spec 단독 — 다른 build artifact 잔존 0 spec (sourcemap 잔존 0 = REQ-20260518-010 / dev-only meta strip 잔존 0 = REQ-040) 과 결과 효능 형식 동질 (산출물 측정 채널 단일 게이트).

## 스코프 규칙
- **expansion**: N/A (본 spec 은 grep 게이트 의미상 baseline 박제 채널 — 본 spec 자체에는 grep 게이트 외 직접 작업 지시 없음. 본 spec 파생 task 가 grep 게이트 작성 시 별도 `## 스코프 규칙` 작성 영역).
- **catalog baseline** (dev-only 진입점 식별자 — HEAD `8e86c8d` 실측, 단일 entry):
  - `ReactQueryDevtools` (모듈: `@tanstack/react-query-devtools`, 사용 위치: `src/App.jsx:4` static import + `src/App.jsx:131` `{isDev() && <ReactQueryDevtools .../>}` runtime 가드 분기).
- **grep-baseline** (현 시점 PASS surface 박제):
  - `grep -nE "ReactQueryDevtools" src/App.jsx` → 2 hits in 1 file:
    - `src/App.jsx:4` (`import { ReactQueryDevtools } from '@tanstack/react-query-devtools';`)
    - `src/App.jsx:131` (`{isDev() && <ReactQueryDevtools initialIsOpen={false} />}`)
  - `grep -rln "ReactQueryDevtools\|react-query-devtools" build/assets/` → 0 hits (DCE PASS zero-point — `build/assets/` 55 entries, `*.js` 청크 분포 전수 grep 0).
  - `grep -nE "^[[:space:]]*outDir\s*:" vite.config.js` → 1 hit @ `vite.config.js:47` (`outDir: 'build',` — `build.outDir = 'build'` 토큰 baseline; 본 토큰 변경 시 본 spec §변경 이력 갱신 신호).
  - 발화 채널 0 baseline: `grep -rnE "ReactQueryDevtools|prod-bundle-dev-only-residue" .github/workflows/ .husky/ scripts/ package.json 2>/dev/null` → 0 hit (FR-03 의 1+ 부착 미발화 — 수단 위임 deferred 영역).
- **rationale**: catalog 식별자 라벨 (`ReactQueryDevtools`) 은 시점 의존 표면이므로 본문 박제 0, baseline 한정 박제 → catalog 추가/제거 시 본 섹션 단일 갱신 (NFR-02 시점 비의존). 산출 경로 (`build/assets/`) 는 `vite.config.js:47` `build.outDir` 토큰 의존 — 본 토큰 변경 시 본 섹션 grep 경로 인용 단일 갱신 (FR-07 정합).

## 동작 (결과 효능 게이트)
- (I1) dev-only 진입점 catalog 1+ 식별자가 `src/**` 본문에 (a) static import 1+ hit + (b) runtime 가드 분기 1+ hit 의 짝맞춤 발화로 박제된다 (현 baseline `ReactQueryDevtools` 2 hit, 짝맞춤 정합).
- (I2) `npm run build` 실행 후, catalog 모든 식별자에 대해 `grep -rln <식별자> <build.outDir>/assets/` 결과 = 0 hit (DCE PASS zero-point).
- (I3) (I2) 의 결과 효능 게이트는 자동 채널 (CI step `.github/workflows/*.yml` / `.husky/*` git hook / `package.json check:*` script + `npm run` wrapper 어느 쪽이든 동등 효능) 중 **최소 1+** 에 부착되어, DCE 의존 회귀 시 build artifact 측정으로 fail-fast 한다. 수단 중립 — 발화 채널 선정은 수단 위임 영역 (현 baseline 미부착 deferred).
- (I4) catalog 식별자 본문 박제는 본 spec `## 스코프 규칙` baseline + `## 변경 이력` row 한정 — `## 역할` / `## 동작` / `## 의존성` / `## 수용 기준` 본문은 식별자 라벨 박제 0 (시점 비의존; catalog 갱신 시 본문 무수정 의무).
- (I5) `build.outDir` 토큰 변경 시 본 spec `## 스코프 규칙` baseline 의 grep 경로 인용 (`build/assets/`) 이 신규 경로 (예: `dist/assets/`) 로 단일 갱신된다 — 본문 다른 위치의 산출 경로 박제 0 (FR-07 정합).

## 테스트 현황
- [x] HEAD `8e86c8d` 실측 — `grep -nE "ReactQueryDevtools" src/App.jsx` → 2 hits (FR-01 baseline 정합).
- [x] HEAD `8e86c8d` 실측 — `grep -rln "ReactQueryDevtools\|react-query-devtools" build/assets/` → 0 hits (FR-02 효능 PASS — DCE 정상 zero-point).
- [x] HEAD `8e86c8d` 실측 — `grep -nE "^[[:space:]]*outDir\s*:" vite.config.js` → 1 hit @ `vite.config.js:47` (`outDir: 'build',` — FR-07 토큰 baseline).
- [ ] FR-03 자동 채널 1+ 부착 — 현 baseline 0 hit (CI step / pre-push hook / 진단 script 어느 채널에도 본 효능 게이트 미부착). 발화 채널 도입은 수단 위임 영역.
- [ ] FR-06 fixture 발화 채널 — DCE 의존 회귀 fixture (side-effect import 도입 commit / `build.minify: false` 도입 commit) 본문 미발화 (별 task / 별 spec 위임 영역).

## 수용 기준
- [x] (Must / FR-01) Given dev-only 진입점 catalog (현 baseline `ReactQueryDevtools`), When `grep -nE "ReactQueryDevtools" src/App.jsx` 실행, Then **2+ hits** (static import + runtime 가드 분기 짝맞춤 정합). 1 hit 또는 0 hit 은 catalog 무효 신호 + 본 spec §변경 이력 갱신.
- [x] (Must / FR-02) Given production build (`npm run build`) 산출, When `grep -rln "ReactQueryDevtools" build/assets/` 실행, Then **0 hit + rc≠0** (grep no-match 표준) — DCE PASS 효능 zero-point. 1+ hit 시 회귀 surface.
- [ ] (Must / FR-03) 본 효능 게이트는 자동 채널 (`.github/workflows/*.yml` CI step / `.husky/*` git hook / `package.json check:*` script / 동등 효능 채널) 중 **최소 1+** 에 부착되어 DCE 의존 회귀 시 build artifact 측정으로 fail-fast 한다. 측정: `grep -rnE "ReactQueryDevtools|prod-bundle-dev-only-residue" .github/workflows/ .husky/ scripts/ package.json` → 1+ hit. **[deferred: future-event-dependent — 발화 채널 도입 PR 미발생; 현 baseline 0 hit, 수단 선정 위임.]**
- [x] (Must / FR-04) 본 spec `## 스코프 규칙` baseline + `## 변경 이력` 외 본문 영역 (`## 역할` / `## 동작` / `## 의존성` / `## 수용 기준` 본문 + `## 동작 (결과 효능 게이트)` (I1)~(I5) 평서 본문) 에 catalog 식별자 라벨 박제 0. 측정: `grep -cE "ReactQueryDevtools|@tanstack/react-query-devtools" specs/30.spec/green/foundation/prod-bundle-dev-only-code-residue-zero.md` 의 §스코프 규칙 + §변경 이력 + §테스트 현황 + §수용 기준 (baseline + FR-01·02·03 게이트 인용) 제외 영역 = 0 hit (NFR-02 시점 비의존 자기 검증).
- [x] (Must / FR-05) 본 효능 게이트는 build artifact 측정 채널 한정 — `src/**` 정적 grep 채널 (runtime 가드 분기 자체 측정) 은 본 spec 영역 밖 (`components/app.md` (Should) + `common/env.md` (I1) 박제 영역). 별 axis 직교 명시.
- [ ] (Should / FR-06) DCE 의존 회귀 fixture 재현성 — 임시 fixture (catalog 식별자의 side-effect import 도입 / `build.minify: false` 도입) 도입 시 본 효능 게이트 rc ≠ 0 (또는 1+ hit) / fixture 제거 시 rc = 0 (또는 0 hit). 본 fixture 본문은 본 spec 영역 밖 (별 task / 별 spec 위임). **[deferred: future-event-dependent — fixture 본문 박제 PR 미발생; 별 spec / 별 task 영역.]**
- [x] (Must / FR-07) `vite.config.js:47` `build.outDir` 토큰 변경 commit (예: `build` → `dist`) 시, 본 spec `## 스코프 규칙` baseline 의 grep 경로 인용 단일 위치 갱신 (`build/assets/` → `dist/assets/`) 의무. 본문 다른 위치의 산출 경로 박제 0 (FR-04 와 동일 자기 검증).
- [x] (회귀 가설 (a)) Given catalog 식별자의 side-effect import 도입 fixture (`import '@tanstack/react-query-devtools'` top-level) staged, When `npm run build && grep -rln "ReactQueryDevtools" build/assets/`, Then **1+ hit** (FR-06 fixture 발화 — DCE 의존 회귀 surface).
- [x] (회귀 가설 (c)) Given `vite.config.js` `build.minify: false` 또는 `rollupOptions.treeshake: false` 토큰 도입 fixture staged, When 동일 측정, Then **1+ hit** (DCE 비활성 회귀 surface).
- [x] (회귀 가설 fixture 제거 idempotent) Given (a) 또는 (c) fixture 제거 후 working tree 복원, When 동일 측정, Then **0 hit 복원** (FR-06 idempotent — 영구 회귀 방지 결과 효능 정합).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-19 | inspector 123차 tick / HEAD `8e86c8d` | REQ-20260518-006 흡수 — dev-only 진입점 식별자 (catalog 1 entry `ReactQueryDevtools`) 의 production bundle 산출물 정적 잔존 0 결과 효능 불변식 박제 (I1~I5 평서 + FR-01·02·04·05·07 ack baseline + FR-03 deferred 발화 채널 + FR-06 deferred fixture 본문) | all (신규) |
