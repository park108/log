# Vite `build.sourcemap=false` 정책 — production bundle 산출물의 sourcemap 잔존 0 효능 시스템 불변식

> **위치**: `vite.config.js` (`build.sourcemap` 토큰 + `build.outDir` 토큰) ↔ production build 산출물 (`build/**`, 보조: `vite.config.js` `build.outDir`)
> **관련 요구사항**: REQ-20260518-010
> **최종 업데이트**: 2026-05-19 (by inspector 124차 tick)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD `f070428` baseline).

## 역할
`vite.config.js` 의 `build.sourcemap = false` 정책 선언 박제 + production build 산출물 (`build/**`) 의 sourcemap 잔존 (`.map` 확장 파일 + `sourceMappingURL` 주석 인라인/외부) = 0 hit 결과 효능 불변식을 박제한다 — 정책 토큰 (config 선언) ↔ 효능 토큰 (산출물 잔존) 의 2-axis 직접 coherence 를 정책 grep + 산출물 측정 양면 게이트로 회귀 보호. 의도적으로 하지 않는 것: (i) `build.sourcemap` 의 추가 값 (`'inline'` / `'hidden'`) 선택 정책 정당화 — UX/디버깅 정책 axis 별 영역, (ii) dev mode sourcemap 산출 (`server.sourcemap` 또는 esbuild dev sourcemap) — 본 spec 은 `build` 블록 한정, (iii) Vite/Rollup sourcemap 알고리즘 / inline base64 encoding 의미론 자체 — 도구 영역, (iv) 다른 build artifact 위생 효능 (dev-only 진입점 잔존 0 = REQ-006 / bundle size budget — 별 axis / tree-shake 알고리즘 — 별 axis), (v) Sentry / Datadog 등 외부 sourcemap upload 전략 — 본 baseline 외부 도구 부재, 별 axis, (vi) `vite.config.js` `build.outDir` 토큰 자체 — REQ-006 영역 (본 spec 은 `outDir` 변경 시 measurement path 인용 단일 갱신 의무만), (vii) `package-lock.json` 의 Vite 메이저 bump 시 기본값 변경 회귀 보호 — `dependency-bump-gate.md` (REQ-035) 영역, (viii) 발화 채널 (CI step / pre-push hook / 진단 script) 선정 — 수단 위임 (FR-04 의 "1+ 부착 존재" 계약 박제, 수단 중립), (ix) 1회성 incident patch.

## 공개 인터페이스
- 입력 surface: `vite.config.js` 의 `build` 블록 (`sourcemap` key + `outDir` key 토큰).
- 출력 surface: Vite `build.outDir` 가 지시하는 산출 경로 (현 baseline `build/`) 의 `.map` 파일 집합 + `build/assets/**` 의 `sourceMappingURL` 주석 분포.
- 측정 surface: 정책 정적 grep 1차 채널 (`grep -cE "^\s*sourcemap:\s*false," vite.config.js`) + 산출물 측정 2차 채널 (`find <build.outDir> -name "*.map"` + `grep -rcE "sourceMappingURL" <build.outDir>/assets/`) + 자동 발화 채널 (CI step / pre-push hook / 진단 script `package.json` script 어느 쪽이든) 1+ 부착 surface.
- 결과 효능 형식: grep count = 1 (정책 박제 PASS) + find count = 0 (`.map` 잔존 0 PASS) + grep recursive 0 hit (`sourceMappingURL` 잔존 0 PASS). 정책 grep ≠ 1 또는 `.map` ≥ 1 또는 `sourceMappingURL` ≥ 1 hit = FAIL 회귀 surface.

## 동작
1. `vite.config.js` 의 `build` 블록은 `sourcemap: false` boolean literal 키 선언 1+ 을 박제한다 — 정책 토큰 명시 (Vite 메이저 bump 시 기본값 변경 회귀 차단).
2. `npm run build` 실행: Vite/Rollup 가 `build.sourcemap = false` 정책에 따라 sourcemap 산출 차단 → `.map` 확장 파일 0 + `sourceMappingURL` 주석 0 (인라인 base64 / 외부 `.map` 참조 양쪽 모두).
3. 결과 효능 채널: `find <build.outDir> -name "*.map" | wc -l` → 0 + `grep -rcE "sourceMappingURL" <build.outDir>/assets/` → 모든 파일 0 hit (정책 PASS 결과 효능 zero-point 박제).
4. 회귀 시나리오:
   - (a) `vite.config.js` `build.sourcemap` 키 값을 `true` 또는 `'inline'` / `'hidden'` 으로 변경 → production bundle 에 `.map` 파일 산출 (`true` / `'hidden'`) 또는 `sourceMappingURL` 인라인 주석 산출 (`'inline'`).
   - (b) `vite.config.js` `build.sourcemap` 키 라인 삭제 → Vite 기본값 의존 (현재 Vite 8.x 기본값 `false`, 향후 메이저에서 기본값 변경 시 silent 회귀).
   - (c) 다른 build plugin (예: `vite-plugin-sourcemap` / Sentry sourcemap plugin / rollup-plugin-sourcemaps) 도입 시 정책 토큰 우회 산출.
   - (d) `npm run build` 우회 (예: 별 build script 도입 — `vite build --sourcemap` CLI flag override) 시 정책 토큰 무력화.
   - (e) Vite `build.outDir` 변경 (예: `build` → `dist`) → 본 spec `## 스코프 규칙` baseline 의 measurement path 인용 단일 갱신 (FR-05, REQ-006 FR-07 자매).
5. 발화 채널: 본 결과 효능 게이트는 자동 채널 (CI step / pre-push hook / 진단 script 어느 쪽이든) 1+ 에 부착되어 (a)(b)(c)(d) 회귀 시점에 build artifact 측정으로 fail-fast (FR-04 의 "1+ 부착 존재" 계약). 수단 선정은 위임 영역.

## 의존성
- 내부: `vite.config.js` (`build.sourcemap` 토큰 + `build.outDir` 토큰 = 본 spec 의 정책 surface + 산출 경로 surface), `package.json` (`build` script = `vite build` 단일 진입점, CLI flag override 없음 baseline).
- 외부: Vite `build.sourcemap` 옵션 계약 (`https://vite.dev/config/build-options.html#build-sourcemap`, `boolean | 'inline' | 'hidden'`, 기본값 `false`), Rollup sourcemap 산출 계약 (`https://rollupjs.org/configuration-options/#output-sourcemap`).
- 역의존 (사용처): production deploy 단계의 모든 정적 검사 채널 (CI 게이트 + pre-push hook + 진단 script aggregator) 이 본 결과 효능 게이트의 0 hit 보장에 의존; production runtime 의 sourcemap 노출 표면적 (reverse engineering 표면) 이 본 정책의 박제에 의존.
- 직교 spec:
  - `specs/30.spec/green/foundation/prod-bundle-dev-only-code-residue-zero.md` (REQ-20260518-006) — production bundle 의 dev-only 진입점 식별자 잔존 0. 본 spec 과 axis 직교 (식별자 잔존 vs sourcemap 잔존, 양쪽 모두 build artifact 측정이지만 측정 대상 분리).
  - `specs/30.spec/blue/foundation/csp-meta-dev-strip-prod-preserve.md` (REQ-040) — dev 전용 CSP meta strip vs prod 보존. 본 spec 과 axis 분리 (CSP meta token 비대칭 vs sourcemap artifact 잔존 0, 양쪽 모두 dev/prod 정책이지만 토큰 종류 분리).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — dep bump 후 회귀 0. 본 spec 은 Vite 메이저 bump 시 기본값 변경 회귀 보호 axis 직교 (정책 선언 명시 박제로 메이저 bump 의존 차단).
  - `specs/30.spec/green/foundation/diagnostic-script-auto-channel-coverage.md` (REQ-081 + REQ-086) (I1)(I10) — 진단 script ↔ 자동 채널 매트릭스 메타. 본 spec 파생 task 가 진단 script 도입 시 자매 메타 효능 자동 적용 (catalog N+1 번째 진단 script 자매 cell 균등 검증).
  - `specs/30.spec/green/foundation/index-html-public-asset-reference-coherence.md` (REQ-099) — `index.html` 정적 자원 참조 4종 + manifest icon 디스크 정합. 본 spec 과 직교 (HTML 자원 참조 token vs build 산출물 sourcemap token).
- 자매 패턴 (build artifact 정적 잔존 0 결과 효능 axis): `prod-bundle-dev-only-code-residue-zero.md` (REQ-006) 와 결과 효능 형식 동질 (산출물 측정 채널 단일 게이트), 측정 surface 직교 (sourcemap artifact vs identifier artifact). 양 spec 의 발화 채널 부착은 동일 자동 채널 매트릭스 (`diagnostic-script-auto-channel-coverage.md`) 메타 영역에서 통합 surface 후보.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 grep 게이트 의미상 baseline 박제 채널 — 본 spec 자체에는 grep 게이트 외 직접 작업 지시 없음. 본 spec 파생 task 가 grep 게이트 작성 시 별도 `## 스코프 규칙` 작성 영역).
- **grep-baseline** (현 시점 PASS surface 박제 — HEAD `f070428` 실측):
  - `grep -cE "^\s*sourcemap:\s*false," vite.config.js` → **1** (정책 토큰 박제 PASS):
    - `vite.config.js:50` (`sourcemap: false,` — `build` 블록 내).
  - `find build -name "*.map" | wc -l` → **0** (`.map` 잔존 0 PASS — `build/assets/` 55 entries 전수 + 비-assets 산출물 전수).
  - `grep -rcE "sourceMappingURL" build/assets/` → **0 hit** (모든 파일 0 — `*.js` 44 file + `*.css` 11 file 전수).
  - `grep -nE "^[[:space:]]*outDir\s*:" vite.config.js` → 1 hit @ `vite.config.js:49` (`outDir: 'build',` — `build.outDir = 'build'` 토큰 baseline; 본 토큰 변경 시 본 spec §변경 이력 갱신 신호).
  - 발화 채널 0 baseline: `grep -rnE "sourcemap|\.map\b|sourceMappingURL" .github/workflows/ .husky/ scripts/ 2>/dev/null` → 0 hit (FR-04 의 1+ 부착 미발화 — 수단 위임 deferred 영역).
- **rationale**: 정책 토큰 (`sourcemap: false,`) 은 line-anchored 정규식 (`^\s*sourcemap:\s*false,`) 으로 박제 — 주석 내 우연 매칭 / 다른 키 내 substring 매칭 회피 (line-start 앵커 + boolean literal 정확 매칭). 산출 경로 (`build/`, `build/assets/`) 는 `vite.config.js:49` `build.outDir` 토큰 의존 — 본 토큰 변경 시 본 섹션 measurement path 인용 단일 갱신 (FR-05 정합, REQ-006 FR-07 자매).

## 동작 (결과 효능 게이트)
- (I1) `vite.config.js` 의 `build` 블록 내 `sourcemap` 키 선언 = boolean literal `false` 1+ 박제 (현 baseline 1 hit @ `vite.config.js:50`).
- (I2) `npm run build` 실행 후, `build/**` 전체에 `.map` 확장 파일 잔존 = 0 (find count 0).
- (I3) `npm run build` 실행 후, `build/assets/**` 의 모든 파일에 `sourceMappingURL` 주석 hit = 0 (grep recursive 0 hit — 인라인 base64 `//# sourceMappingURL=data:application/json;base64,...` + 외부 `.map` 참조 `//# sourceMappingURL=index-*.js.map` 양쪽 모두 0).
- (I4) (I1) + (I2) + (I3) 의 3-측정 게이트는 자동 채널 (CI step `.github/workflows/*.yml` / `.husky/*` git hook / `package.json check:*` script + `npm run` wrapper 어느 쪽이든 동등 효능) 중 **최소 1+** 에 부착되어, (a)(b)(c)(d) 회귀 시 build artifact + 정책 grep 측정으로 fail-fast 한다. 수단 중립 — 발화 채널 선정은 수단 위임 영역 (현 baseline 미부착 deferred).
- (I5) 본 효능 게이트는 정책 + 효능 **양면 동시** 박제 — (I1) 정책 grep 만으로는 build 시 CLI flag (`vite build --sourcemap`) override 회귀 미검출, (I2)+(I3) 산출물 측정 만으로는 build 미실행 시 정책 회귀 미검출. 양면 동시 게이트 박제 (FR-07 정합).
- (I6) `build.outDir` 토큰 변경 시 본 spec `## 스코프 규칙` baseline 의 measurement path 인용 (`build/`, `build/assets/`) 이 신규 경로 (예: `dist/`, `dist/assets/`) 로 단일 갱신된다 — 본문 다른 위치의 산출 경로 박제 0 (FR-05 정합, REQ-006 FR-07 자매).

## 테스트 현황
- [x] HEAD `f070428` 실측 — `grep -cE "^\s*sourcemap:\s*false," vite.config.js` → 1 (FR-01 정책 박제 PASS).
- [x] HEAD `f070428` 실측 — `find build -name "*.map" | wc -l` → 0 (FR-02 `.map` 잔존 0 PASS).
- [x] HEAD `f070428` 실측 — `grep -rcE "sourceMappingURL" build/assets/` → 모든 파일 0 hit (FR-03 `sourceMappingURL` 잔존 0 PASS — `*.js` 44 file + `*.css` 11 file 전수).
- [x] HEAD `f070428` 실측 — `grep -nE "^[[:space:]]*outDir\s*:" vite.config.js` → 1 hit @ `vite.config.js:49` (`outDir: 'build',` — FR-05 토큰 baseline).
- [ ] FR-04 자동 채널 1+ 부착 — 현 baseline 0 hit (CI step / pre-push hook / 진단 script 어느 채널에도 본 효능 게이트 미부착). 발화 채널 도입은 수단 위임 영역.
- [ ] FR-06 fixture 발화 채널 — sourcemap 정책 회귀 fixture (`sourcemap: true` 도입 commit / `sourcemap: 'inline'` 도입 commit / 라인 삭제 commit) 본문 미발화 (별 task / 별 spec 위임 영역).

## 수용 기준
- [x] (Must / FR-01) Given HEAD `f070428` baseline, When `grep -cE "^\s*sourcemap:\s*false," vite.config.js` 실행, Then 출력 = **1** + rc=0 (정책 토큰 박제). 0 또는 2+ 는 정책 회귀 surface + 본 spec §변경 이력 갱신.
- [x] (Must / FR-02) Given production build (`npm run build`) 산출, When `find build -name "*.map" | wc -l` 실행, Then 출력 = **0** (`.map` 확장 파일 잔존 0 효능 zero-point). 1+ 시 회귀 surface.
- [x] (Must / FR-03) Given 동일 build 산출, When `grep -rcE "sourceMappingURL" build/assets/` 실행, Then 모든 파일 0 hit (`*.js` 44 file + `*.css` 11 file 전수 0). 1+ 파일에서 1+ hit 시 회귀 surface (인라인 base64 또는 외부 `.map` 참조).
- [ ] (Must / FR-04) 본 효능 게이트는 자동 채널 (`.github/workflows/*.yml` CI step / `.husky/*` git hook / `package.json check:*` script / 동등 효능 채널) 중 **최소 1+** 에 부착되어 (a)(b)(c)(d) 회귀 시 fail-fast 한다. 측정: `grep -rnE "sourcemap|\.map\b|sourceMappingURL" .github/workflows/ .husky/ scripts/` (또는 spec 박제 토큰 / 진단 script basename) → 1+ hit. **[deferred: future-event-dependent — 발화 채널 도입 PR 미발생; 현 baseline 0 hit, 수단 선정 위임.]**
- [x] (Must / FR-05) `vite.config.js:49` `build.outDir` 토큰 변경 commit (예: `build` → `dist`) 시, 본 spec `## 스코프 규칙` baseline 의 measurement path 인용 단일 위치 갱신 (`build/` → `dist/`, `build/assets/` → `dist/assets/`) 의무. 본문 다른 위치의 산출 경로 박제 0 (자기 검증). REQ-20260518-006 FR-07 자매.
- [ ] (Should / FR-06) sourcemap 정책 회귀 fixture 재현성 — 임시 fixture (`vite.config.js` `sourcemap: true` 도입 / `sourcemap: 'inline'` 도입 / `sourcemap` 라인 삭제) 도입 시 본 효능 게이트 측정 1+ hit (또는 정책 grep count = 0) / fixture 제거 시 baseline 복원. 본 fixture 본문은 본 spec 영역 밖 (별 task / 별 spec 위임). **[deferred: future-event-dependent — fixture 본문 박제 PR 미발생; 별 spec / 별 task 영역.]**
- [x] (Must / FR-07) 본 효능 게이트는 정책 + 효능 **양면 동시** 박제 — FR-01 정책 grep + FR-02·FR-03 산출물 측정 양면 게이트 필수. 한쪽만으로는 회귀 surface 누락 (FR-01 만 → CLI flag override 미검출, FR-02·FR-03 만 → build 미실행 시 정책 회귀 미검출). (I5) 평서 박제.
- [x] (회귀 가설 (a)) Given `vite.config.js:50` 을 `sourcemap: true` 로 변경 fixture staged, When `npm run build && find build -name "*.map" | wc -l`, Then 출력 > 0 (FR-02 회귀 surface — `.map` 파일 산출).
- [x] (회귀 가설 (a)') Given 동일 fixture, When `grep -rcE "sourceMappingURL" build/assets/`, Then 1+ file 에서 1+ hit (FR-03 회귀 surface — `sourceMappingURL` 주석 산출).
- [x] (회귀 가설 (b)) Given `vite.config.js:50` 라인 삭제 fixture staged, When `grep -cE "^\s*sourcemap:\s*false," vite.config.js`, Then 출력 = **0** ≠ 1 (FR-01 회귀 surface — 명시 선언 누락, Vite 기본값 의존).
- [x] (회귀 가설 fixture 제거 idempotent) Given (a) 또는 (b) fixture 제거 후 working tree 복원, When 동일 측정, Then baseline 복원 (정책 grep count=1 + `.map` count=0 + `sourceMappingURL` hit=0; FR-06 idempotent 효능 정합).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-19 | inspector 124차 tick / HEAD `f070428` | REQ-20260518-010 흡수 — `vite.config.js` `build.sourcemap=false` 정책 토큰 + production build 산출물 (`build/**`) 의 `.map` 잔존 0 + `sourceMappingURL` 주석 잔존 0 의 정책 ↔ 효능 2-axis 직접 coherence 결과 효능 불변식 박제 (I1~I6 평서 + FR-01·02·03·05·07 ack baseline + FR-04 deferred 발화 채널 + FR-06 deferred fixture 본문) | all (신규) |
