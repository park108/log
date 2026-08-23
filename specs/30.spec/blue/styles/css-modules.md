# CSS Modules stage-1 enum + Skeleton.css 글로벌 classnames 의도 불변식 + `localsConvention: 'camelCaseOnly'` 단방향 변환 graph 무결성

> **위치**: `src/**/*.module.css` (stage-1 enum) + `src/common/Skeleton.css` (stage-1 비포함 의도) + `vite.config.js` (`css.modules.localsConvention` 토큰) + `src/**/*.{ts,tsx,js,jsx}` (`styles.<ident>` 접근 식별자 표면).
> **관련 요구사항**: REQ-20260517-076 FR-05, REQ-20260518-016
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: C단계 마커 회수 + green→blue promote)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`893cdea`).

## 역할
CSS Modules 도입 **stage-1 대상 enum** 박제 + **`src/common/Skeleton.css` 가 stage-1 비포함 (글로벌 classnames 유지)** 의도 박제 + **`vite.config.js:css.modules.localsConvention = 'camelCaseOnly'` 단방향 변환 graph 무결성** 박제 (vite 설정 토큰 ↔ `*.module.css` class 정의 ↔ `styles.<ident>` 단일 채널 접근 3 축 결과 효능). 단방향 contract 의 의도 분리: `'camelCaseOnly'` 는 caller dot-property 단일 채널 (`styles.divToasterCenter`) — bracket access (`styles["div--toaster-center"]`) 0 hit 박제. `'camelCase'` (양면 export — bracket+dot 둘 다) / `'dashes'` / `'dashesOnly'` 와 의도 분리. 의도적으로 하지 않는 것: stage-2/3 확장 계획 (별 req — 단계적 마이그레이션 우선순위 결정 영역), CSS Modules 의 다른 정책 (예: `:global()` 사용 정책 / classnames hash 알고리즘 / SSR 정합 / `composes:` / `generateScopedName` / `hashPrefix` — 필요 시 별 spec), 글로벌 classnames 명명 컨벤션 (`.skeleton__block` 등 BEM 변형 — caller 영역), CSS-in-JS 도입 / 전환 (out-of-scope), `*.module.css` class 정의 input 표기 enum 박제 (kebab `--` 강제 vs underscore vs ASCII — 변환 input 자유도 허용; 표기 강제는 별 axis = stylelint rule), 발화 채널 (pre-commit/pre-push/CI/신규 `check:*` script) 선정 — 모두 수단 영역, TypeScript 측 `*.module.css` ambient type declaration 의 string indexer vs typed object 정밀도 (별 axis).

## 공개 인터페이스
- 없음 (CSS 계층 계약). 본 spec 은 측정 게이트 박제만 — `find src -name "*.module.css"` 결과 enum + `src/common/Skeleton.css` 헤더 주석 박제.

## 동작
1. **(I1) stage-1 enum 박제**: `find src -name "*.module.css"` 결과는 현 시점 다음 4개로 한정:
   - `src/Toaster/Toaster.module.css`
   - `src/Comment/Comment.module.css`
   - `src/Image/ImageSelector.module.css`
   - `src/Search/Search.module.css`
2. **(I2) Skeleton.css 글로벌 의도 박제**: `src/common/Skeleton.css` 는 CSS Module 이 아니다 (`.module.css` 접미사 미보유). 글로벌 classnames `.skeleton` / `.skeleton--<variant>` / `.skeleton__block` 사용. 이 의도는 파일 헤더 주석 (`/* Intentionally not a CSS Module — not part of the stage-1 modules targets. */` 형태) 으로 박제.
3. **(I3) stage-1 enum 변경 정합 계약**: 신규 `*.module.css` 추가 / 기존 모듈화 / Skeleton.css 모듈 전환 시 본 spec §동작 (I1) enum + §변경 이력 동기 갱신. enum 과 실 disk 상태 불일치 시 즉시 회귀 표면.
4. **(I4) Skeleton.css 모듈 전환 시 보고 계약**: `src/common/Skeleton.css` 가 `.module.css` 로 전환되면 (I2) 헤더 주석 + 본 spec §역할 갱신 + caller (`<div className="skeleton">` 등 글로벌 className 사용처) 전수 회수. 단순 파일명 변경 금지.
5. **(I5) 범위 제한**: 본 게이트는 `src/**/*.css` (글로벌) + `src/**/*.module.css` (모듈) 한정. `node_modules/**` / 빌드 산출물 / 외부 라이브러리 CSS 는 본 게이트 범위 밖. CSS 의 다른 측면 (animation / color / responsive 등) 은 별 spec.
6. **(I6) `localsConvention: 'camelCaseOnly'` 토큰 단일 채널 박제** (REQ-016 FR-01): `vite.config.js` 의 `css.modules.localsConvention` 토큰이 정확히 `'camelCaseOnly'` 문자열로 박제. 명령: `grep -cE "localsConvention\s*:\s*'camelCaseOnly'" vite.config.js` → **출력 = 1 + rc=0**. 다른 enum 값 (`'camelCase'` 양면 / `'dashes'` 양면 / `'dashesOnly'` 단방향 hyphen→camel / 부재 (no transform)) 은 본 spec 갱신 신호 — caller 측 접근 채널 양면 ↔ 단방향 의도와 정합 회수 필요.
7. **(I7) class 정의 ↔ caller 접근 graph 무결성** (REQ-016 FR-02): `src/**/*.module.css` 의 class 정의 (`^\s*\.[a-zA-Z_][a-zA-Z0-9_-]*` 캡처) 가 `camelCaseOnly` 변환 후 식별자 집합을 형성하며, caller 측 `styles.<ident>` 접근의 `<ident>` 집합 ⊆ 변환 결과 집합 (정의 측 dead-style 허용, caller 측 undefined 접근 0 hit). caller 가 정의 측에 미존재하는 식별자를 접근하면 런타임 `undefined` 반환 → className `"div undefined"` silent regression — 본 (I7) 위반 검출 채널.
8. **(I8) caller bracket access 0 hit 단방향 정합** (REQ-016 FR-04): `src/**/*.{ts,tsx,js,jsx}` 의 styles bracket access 가 0 hit. 명령: `grep -rnE "styles\[\"[^\"]+\"\]|styles\['[^']+'\]" src` → **출력 0 hit + rc=1**. bracket access 1+ 도입은 양면 export (`'camelCase'`) 의도와 정합해야 하므로 (I6) 토큰 동시 갱신 신호. 본 baseline 의 단방향 `'camelCaseOnly'` + bracket 0 hit + dot 단일 채널 graph 가 시스템 효능 박제.
9. **(I9) caller dot-property 식별자 camelCase 규칙 정합** (REQ-016 FR-03): `src/**/*.{ts,tsx,js,jsx}` 의 `styles.<ident>` 접근에서 `<ident>` 가 모두 camelCase 규칙 (첫 글자 lowercase + 이후 alphanumeric, hyphen `-` / underscore `_` 직접 포함 0) 을 만족. caller 측에 hyphen/underscore 직접 포함 식별자 dot-access (`styles.div--toaster-center`) 가 등장하면 JS syntax error — 본 게이트는 정적 분석으로 회귀 차단.
10. **(I10) 변환 input 표기 자유도 + 갱신 신호 분리**: `*.module.css` class 정의의 input 표기 (kebab `--` / underscore `_` / ASCII identifier 어느 쪽이든) 는 본 spec 범위 외 — `'camelCaseOnly'` 변환이 input 표기 차이를 단방향 흡수. 단 `vite.config.js:css.modules` 객체에 다른 키 (`generateScopedName` / `hashPrefix` / `globalModulePaths`) 추가 시 (I6) 토큰 자체는 위반 아니나 본 spec §변경 이력 갱신 신호 — 다른 키 추가는 별 axis (필요 시 별 spec).

### 회귀 중점
- `find src -name "*.module.css"` 결과가 §동작 (I1) enum 과 불일치 시 (I3) 위반 — enum 갱신 누락 / 신규 모듈 추가 / 기존 모듈 삭제 시점에 본 spec §변경 이력 박제 누락.
- `src/common/Skeleton.css` 가 `.module.css` 로 rename 되며 caller 측 className 사용처 회수 누락 시 (I4) 위반 — 글로벌 className 의 빈 매칭으로 스타일 미적용.
- `src/common/Skeleton.css` 헤더의 "stage-1 비포함" 의도 주석 제거 시 (I2) 위반 — 의도 박제 소실.
- `vite.config.js:54` (또는 동등 위치) 의 `'camelCaseOnly'` 토큰이 `'camelCase'` / `'dashes'` / `'dashesOnly'` / 부재 로 변경 시 (I6) 위반 — caller 측 dot-property 접근 채널 (`styles.divX`) 의 변환 graph 정합 깨짐, silent runtime regression 위험. 토큰 변경 단독으로는 typecheck/lint 통과 (string literal 자체는 valid enum) — grep gate 외 자동 검출 채널 부재.
- caller 측에 신규 `styles.divFooMissing` dot-access 추가 시 정의 측 미존재면 (I7) 위반 — `styles` 객체에 해당 키 부재로 `undefined` 반환 + className 직렬화 시 `"div undefined"` 출력. 자동 검출은 변환 graph 비교 게이트 (vite build 또는 별 script) 필요.
- caller 측 bracket access (`styles["div--foo"]`) 신규 도입 시 (I8) 위반 — 단방향 `'camelCaseOnly'` 환경에서 `undefined` 반환. 양면 export (`'camelCase'`) 로 의도 전환 시 (I6) 토큰 + 본 (I8) 동시 갱신 필요.
- caller 측 dot-access 식별자에 hyphen/underscore 직접 포함 (`styles.div-foo`) 도입 시 (I9) 위반 — JS syntax error (parser 단계 reject) 로 정적 안전망 존재하나, transpiler 가 bracket access 로 자동 변환할 경우 (I8) 위반과 동치.

## 의존성
- 내부: `src/**/*.module.css` (stage-1 enum 입력 + (I7) class 정의 캡처), `src/common/Skeleton.css` (글로벌 의도 박제), `vite.config.js` ((I6) `css.modules.localsConvention` 토큰 + `css.modules` 객체 변경 신호), `src/**/*.{ts,tsx,js,jsx}` ((I7)(I8)(I9) caller 측 styles 접근 표면).
- 외부: Vite CSS Modules 빌드 (자동 인식 — `.module.css` 접미사 기반 + `localsConvention` enum 변환 — `'camelCaseOnly'` 단방향 / `'camelCase'` 양면 / `'dashes'` / `'dashesOnly'`), `find` / `grep` (enum 및 token 측정), css-loader (Vite 내부 가공 기반 — `modules.exportLocalsConvention` 동명 옵션).
- 역의존 (사용처): stage-1 enum 의 4 모듈을 import 하는 JSX/TSX 컴포넌트 (각 컴포넌트 내부 `import styles from './X.module.css'`) — 해당 컴포넌트 각각이 (I7)(I8)(I9) graph 무결성 게이트의 측정 대상.
- 직교: `tooling.md` (ESLint), `accessibility.md` (focus-visible — 본 spec 과 직교 cosmetic 영역), `foundation/build-coverage-output-dir-tri-surface-coherence.md` (Vite/Vitest 산출 디렉터리 — 본 spec 의 CSS 변환 graph 와 별 axis), `foundation/typecheck-island-extension.md` (CSS module ambient type — 별 axis), `60.done/2026/05/17/req/20260517-vite-jsx-transform-channel-coherence.md` (REQ-066, vite jsx 변환 — 본 spec 의 CSS Modules transform 단계와 별 vite 파이프라인 stage), `60.done/2026/05/17/req/20260517-path-alias-resolver-coherence.md` (REQ-067, module resolution graph — 본 spec 의 intra-module identifier graph 와 직교).

## 테스트 현황
- [x] (I1) stage-1 enum: `find src -name "*.module.css"` → 4 hits (`src/Toaster/Toaster.module.css` / `src/Comment/Comment.module.css` / `src/Image/ImageSelector.module.css` / `src/Search/Search.module.css`). HEAD=`893cdea` 실측 PASS.
- [x] (I2) Skeleton.css 글로벌 의도 박제: `head -5 src/common/Skeleton.css` → "Intentionally not a CSS Module — not part of the stage-1 modules targets." 주석 박제. HEAD=`893cdea` 실측 PASS.
- [x] (I5) 범위 제한: 정의상 항상 참.
- [x] (I6) `localsConvention: 'camelCaseOnly'` 토큰: `grep -cE "localsConvention\s*:\s*'camelCaseOnly'" vite.config.js` → 1 hit @`:54`. HEAD=`f695bb0` 실측 PASS.
- [x] (I8) caller bracket access 0 hit: `grep -rcE "styles\[\"[^\"]+\"\]|styles\['[^']+'\]" src` → 합산 0. HEAD=`f695bb0` 실측 PASS.
- [x] (I10) 변환 input 표기 자유도 + 갱신 신호 분리: 정의상 항상 참 (input 표기 enum 박제 미요청).

## 수용 기준
- [x] (Must, FR-05-a) CSS Modules stage-1 enum 박제 — §동작 (I1) + 4 hits 실측.
- [x] (Must, FR-05-b) `src/common/Skeleton.css` 가 stage-1 비포함 (글로벌 classnames `.skeleton` / `.skeleton--<variant>` / `.skeleton__block`) 박제 — §동작 (I2).
- [x] (Must, 범위 제한) `node_modules/**` / 빌드 산출물 / 외부 라이브러리 CSS / CSS 다른 측면은 본 게이트 범위 밖.
- [x] (Must, REQ-016 FR-01) `localsConvention: 'camelCaseOnly'` 토큰 1 hit — §동작 (I6) + HEAD=`f695bb0` 실측 PASS.
- [x] (Must, REQ-016 FR-03) caller dot-property 식별자 camelCase 정합 — §동작 (I9) baseline static safety 만 PASS (JS parser reject + 현 baseline hyphen/underscore 직접 포함 0 hit). 자동 검출 fixture 박제는 별 task.
- [x] (Must, REQ-016 FR-04) caller bracket access 0 hit — §동작 (I8) + HEAD=`f695bb0` 실측 PASS.
- [x] (Must, REQ-016 FR-05) drift 발생 시 단일 진단 명령 stdout 격차 카테고리 라벨 출력 + exit code ≠ 0 — TSK-20260518-23 / `9b95b73` `scripts/check-css-modules-coherence.sh` + `npm run check:css-modules-coherence` (4 게이트 G-I1+G-I2+G-I6+G-I8 fail-fast + 카테고리 라벨 R-1 stage-1-enum-shrink / R-2 skeleton-global-intent-loss / R-3 convention-token-drift / R-4 bracket-access-leak).
- [x] (Should, REQ-016 FR-06) `css.modules` 객체의 다른 키 추가는 본 spec 갱신 신호이되 위반 아님 — §동작 (I10) 박제.
- [x] (Should, REQ-016 FR-07) 단방향 변환 contract semantic 자체 박제 — §역할 + §동작 (I6) + (I8) (camelCaseOnly 단방향 / camelCase 양면 / dashes 양면 / dashesOnly 단방향 hyphen) 의도 분리 1 hit 등장.
- [x] (Should, REQ-016 FR-08) FR-01~FR-07 회귀 자동 검출 채널 rc=0/1 결정론 + 발화 시점 채널 (pre-commit/pre-push/CI) 존재 — 수단 영역, planner 영역 대기. — **측정**: `check:css-modules-coherence` 가 CI `Check CSS Modules coherence` step 에 부착됨 (rc=0).
- [x] (Must, REQ-016 NFR-01) 결정론 — grep + find rc/출력 멱등.
- [x] (Must, REQ-016 NFR-02) 멱등성 — read-only 게이트.
- [x] (Must, REQ-016 NFR-03) 성능 — 전체 게이트 < 2 s (현 baseline 측정 기준 < 100 ms).
- [x] (Must, REQ-016 NFR-04) 단방향 ↔ 양면 의도 분리 박제 — §역할 + §동작 (I6)(I8) 박제, 우선/권장 라벨 0.
- [x] (Must, REQ-016 NFR-05) 자체 진단 제외 — 본 spec §스코프 규칙 (J-self) 박제: `specs/**` 본문 내 `localsConvention` / `camelCaseOnly` / `styles.` / `.module.css` 토큰 occurrence 가 measure scope 외.
- [x] (Must, REQ-016 NFR-06) 외부 비파괴 — 본 효능 도입은 `vite.config.js` / `src/**/*.module.css` / `src/**/*.{ts,tsx,js,jsx}` 변경 동반 0 (수단 영역만 별 task).

## 스코프 규칙
- **expansion**: 불허 (측정 scope = `src/**/*.module.css` + `src/common/Skeleton.css` + `vite.config.js` (`css.modules` 블록) + `src/**/*.{ts,tsx,js,jsx}` 한정. `node_modules/**` / 빌드 산출물 / 외부 라이브러리 CSS / `specs/**` 본문은 measure scope 외).
- **grep-baseline** (HEAD=`f695bb0`, 2026-05-18 89차 tick 갱신; (I1)(I2)(I5) 는 직전 893cdea 측정 결과 동치):
  - (A) `find src -name "*.module.css"` → **4 hits** (enum 박제):
    - `src/Toaster/Toaster.module.css`,
    - `src/Comment/Comment.module.css`,
    - `src/Image/ImageSelector.module.css`,
    - `src/Search/Search.module.css`.
  - (B) `grep -nE "Intentionally not a CSS Module|stage-1 modules targets" src/common/Skeleton.css` → 1+ hit @:3 (글로벌 의도 박제). PASS.
  - (C) `grep -nE "\.skeleton|\.skeleton--|\.skeleton__" src/common/Skeleton.css` → multi-hit (글로벌 classnames 박제 확인 — 본 spec §역할 참조).
  - (D) `find src -name "*.css" -not -name "*.module.css" | wc -l` → 글로벌 CSS 파일 수 (참고 — 향후 stage 확장 baseline).
  - (E) `grep -cE "localsConvention\s*:\s*'camelCaseOnly'" vite.config.js` → **1 hit** @`:54` ((I6) FR-01 PASS).
  - (F) `grep -nE "css\.modules|css:\s*\{[^}]*modules" vite.config.js` 또는 동등 — `css: { modules: { localsConvention: 'camelCaseOnly' } }` 블록 위치 박제 (참고). HEAD=`f695bb0` 기준 `vite.config.js:52-56` 영역.
  - (G) `grep -rcE "styles\[\"[^\"]+\"\]|styles\['[^']+'\]" src` 합산 → **0 hit** ((I8) FR-04 PASS — `grep -rcE ... src | awk -F: '{s+=$2}END{print s}'` = 0).
  - (H) `grep -rnE "styles\.[a-zA-Z][a-zA-Z0-9]*" src` 의 hit 들에서 `<ident>` 추출 후 hyphen `-` / underscore `_` 직접 포함 검사 → **0 hit** ((I9) FR-03 baseline static safety). JS parser reject 로 추가 안전망 (정적).
  - (I) (I7) 변환 graph 비교 baseline: (a-class 정의) `find src -name "*.module.css" -exec grep -hE "^\s*\.[a-zA-Z_][a-zA-Z0-9_-]*\s*[,{:]" {} \;` 캡처 후 camelCase 변환 — 변환 결과 식별자 집합 ⊇ (b-caller 측) `grep -rhoE "styles\.[a-zA-Z][a-zA-Z0-9]*" src` 의 dot-property 식별자 집합. HEAD=`f695bb0` 기준 baseline graph 부분집합 관계 PASS (caller 측 undefined 접근 0 hit). 자동 측정 fixture 박제는 별 task (planner 영역).
  - (J-self) `grep -rcE "localsConvention|camelCaseOnly" specs/30.spec/blue/styles/css-modules.md` = 본 spec 자체 박제 hit 한정 (measure scope 외 — NFR-05 자체 진단 제외 박제).
- **rationale**: (I1)(I2)(I5) 본 spec 박제 시점 PASS. (I3)(I4) 는 이벤트 대기 marker — 차기 `*.module.css` 추가 / 삭제 또는 Skeleton.css 전환 시 본 spec §변경 이력 갱신. (I6)(I8)(I9)(I10) 89차 tick REQ-016 흡수 시점 baseline 실측 PASS. (I7) 변환 graph 자동 측정 fixture 는 별 task (planner 영역) — 본 spec 은 결과 효능 (graph 무결성) 평서 + 수단 중립 박제만.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — CSS Modules stage-1 enum 4 모듈 + Skeleton.css 글로벌 의도 5 축 (I1~I5) 게이트. baseline: `*.module.css` 4 hits (Toaster/Comment/ImageSelector/Search) / Skeleton.css 헤더 의도 주석 박제. | all |
| 2026-05-18 | inspector 89차 (Phase 2, REQ-20260518-016 흡수) / pending (`f695bb0` baseline) | §동작 (I6)~(I10) + 5 marker §테스트 현황 + 13 marker §수용 기준 신규 박제 — `localsConvention: 'camelCaseOnly'` 단방향 변환 graph 무결성 (vite.config.js 토큰 ↔ class 정의 ↔ caller 접근 3 축). baseline: (E) localsConvention=camelCaseOnly 1 hit @vite.config.js:54 / (G) bracket access 0 hit / (H) hyphen-underscore 직접 포함 0 hit / (I) 변환 graph 부분집합 관계 PASS. body-update 경로 — green 카운트 변동 0 (20 == GREEN_PENDING_MAX 유지). | 헤더, 역할, 동작, 회귀 중점, 의존성, 테스트 현황, 수용 기준, 스코프 규칙, 변경 이력, 참고 |
| 2026-05-18 | inspector 104차 Phase 1 hook-ack / TSK-20260518-23 / `9b95b73` | REQ-016 FR-05 marker 1건 flip ([x] §수용 기준 Must FR-05) — `scripts/check-css-modules-coherence.sh` (4 게이트 G-I1+G-I2+G-I6+G-I8 fail-fast + 4 카테고리 라벨 R-1~R-4) + `package.json:33` `"check:css-modules-coherence"` npm wrapper 부착. HEAD `1fe05f4` 재실측 PASS (rc=0 + stdout `check-css-modules-coherence: G-I1 (stage1=4) + G-I2 (intent=1) + G-I6 (convention=1) + G-I8 (bracket=0) PASS`). `git merge-base --is-ancestor 9b95b73 HEAD` PASS. result.md DoD — `npm run lint` rc=0 / `npm run typecheck` rc=0 / R-1~R-4 회귀 fixture 수동 검증 PASS + 결정론 5/5 byte-equal. RULE-07 정합 — 수단 중립 평서문 보존 ((I6)~(I10) 동작 영역 미접촉), dedicated script 채택은 §수용 기준 marker 박제 영역 한정. spec 본문·vite.config.js·src/**/*.module.css·src/common/Skeleton.css·src/**/*.{ts,tsx,js,jsx} 변경 0 동반 정합. 보류 marker 잔존: (I3)(I4) 이벤트 대기 + (I7) 변환 graph 비교 게이트 별 task + (I9) 정적 검출 fixture 별 task + Should FR-08 회귀 자동 검출 채널 별 task. | §수용 기준 (FR-05) + 헤더 + §변경 이력 |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | C단계 마커 회수 — RULE-07 §수용 기준 문장 규약 적용. 판정 가능한 항목은 실측·주입 근거와 함께 flip, 미래 사건·미측정 NFR·자명 명제·별 축 위임 항목은 §참고 §미측정·비판정 항목 으로 강등. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |

## 참고
- **REQ 원문**: REQ-20260517-076 (본 세션 mv 후), REQ-20260518-016 (89차 tick 흡수 — `60.done/2026/05/18/req/20260518-css-modules-localsconvention-camelcase-only-tri-axis-coherence.md`).
- **관련 spec**:
  - `specs/30.spec/blue/components/common.md` (Skeleton variant 영역 — 본 spec 과 직교 cosmetic 정책).
  - `specs/30.spec/blue/foundation/typecheck-island-extension.md` — typecheck 효능. CSS module ambient type (`*.module.css` declaration string indexer / typed object 정밀도) 은 별 axis.
  - `specs/30.spec/blue/components/{toaster,comment,image,search}.md` — 컴포넌트 spec. CSS module 사용은 implementation detail 로만 언급, 변환 contract axis 미박제 — 본 spec (I6)~(I10) 가 cross-component 단일 박제.
  - `specs/60.done/2026/05/17/req/20260517-vite-jsx-transform-channel-coherence.md` (REQ-066) — vite jsx 변환 채널. 본 spec 의 CSS Modules transform 단계와 별 vite 파이프라인 stage.
  - `specs/60.done/2026/05/17/req/20260517-path-alias-resolver-coherence.md` (REQ-067) — module resolution graph. 본 spec 의 intra-module identifier graph 와 직교.
- **외부 레퍼런스 (시점 비의존)**:
  - Vite CSS Modules `css.modules.localsConvention` 옵션 — `'camelCase'` (양면 export: 원본 + camelCase 키) / `'camelCaseOnly'` (단방향 export: camelCase 키만) / `'dashes'` / `'dashesOnly'` — <https://vite.dev/config/shared-options.html#css-modules>.
  - css-loader `modules.exportLocalsConvention` — vite 의 `localsConvention` 은 css-loader 의 동명 옵션으로 위임. 4 enum 의 semantic 동치.
  - W3C CSS Modules Level 1 — class selector 의 syntax 는 ASCII identifier + hyphen `-` + underscore `_` 허용 (변환 input 자유도 baseline).
- **RULE 준수**:
  - RULE-07: 10 불변식 (I1~I10) 모두 시점 비의존 평서문 + `find` / `grep` 단일 명령 재현 가능 + 수단 중립 (`localsConvention` enum 선택 / 발화 채널 선정 우선 라벨 0) + self-reference scope 분리 박제 (NFR-05).
  - RULE-06: grep-baseline 10 gate (A)~(J-self) 실측 박제. expansion 불허.
  - RULE-01: inspector writer 영역만 (`30.spec/green/styles/css-modules.md` body-update edit).
  - RULE-03 (d): 89차 tick body-update 경로 — green 카운트 20 == GREEN_PENDING_MAX 유지 (carve 회피로 임계 미초과 정합).

## 참고

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- (I3) enum 변경 정합: 신규 `*.module.css` 추가 / 삭제 이벤트 발생 시 본 spec §변경 이력 박제. 차기 이벤트 대기.
- (I4) Skeleton.css 모듈 전환 시 보고: 전환 이벤트 발생 시 본 spec §역할 + caller 회수 동기. 차기 이벤트 대기.
- (I7) class 정의 ↔ caller 접근 graph: 변환 graph 비교 게이트 (vite build 또는 별 script) 발화 채널 선정 + 자동 검출 fixture 박제. planner 영역 task 발행 대기.
- (I9) caller dot-property 식별자 camelCase 정합: 정적 검출 fixture (lint rule / grep gate) 발화 채널 선정. planner 영역 task 발행 대기.
- (Should) enum 변경 / Skeleton.css 모듈 전환 시 본 spec §변경 이력 박제 — 차기 이벤트 대기.
- (Must, REQ-016 FR-02) class 정의 ↔ caller 접근 graph 무결성 — §동작 (I7) + 자동 검출 채널 (vite build 또는 별 script) 발화 채널 선정 planner 영역 대기.
