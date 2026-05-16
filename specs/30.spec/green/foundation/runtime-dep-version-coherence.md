# 런타임 의존성 버전 정합 — declared range major ↔ installed major ↔ blue spec 박제 major 3축 격차 0 상시 불변식

> **위치**: `package.json` (`dependencies` / `devDependencies` 의 React 런타임 계열: `react`, `react-dom`, `react-router-dom`, `@testing-library/react`), `node_modules/<pkg>/package.json` (installed `version`), `specs/30.spec/blue/components/*.md` (외부 의존성 박제 라인).
> **관련 요구사항**: REQ-20260517-063
> **최종 업데이트**: 2026-05-17 (by inspector, REQ-063 흡수 — 런타임 dep 정합 메타 패턴 확장 축 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-063 발행 시점 HEAD=`2de68c8`, 본 spec 박제 시점 HEAD=`07eaf10`).

## 역할
React 런타임 계열 의존성 (`react`, `react-dom`, `react-router-dom`, `@testing-library/react`) 의 **세 축 메이저 정합** — (a) `package.json` 의 semver range 선언 메이저 하한, (b) `node_modules/<pkg>/package.json` 의 installed `version` 메이저, (c) `specs/30.spec/blue/components/*.md` 가 박제한 외부 메이저 — 가 격차 0 으로 동시 성립해야 한다는 **반복 검증 가능한 상시 불변식** 을 박제. `@testing-library/react` 의 경우 root API mode (production `ReactDOM.createRoot` 와 동일 모드) 가 메이저 ≥ 14 로 확보됨을 부가 박제. 본 정합이 깨지면 (a) `npm ci` 가 lockfile 재정합 또는 peer 경고 동반 install 로 분기되고, (b) blue spec 의 NFR (예: "React 19 StrictMode 이중 마운트 cleanup") 가 런타임에서 실증 불능이 되며, (c) `@testing-library/react@13.x` 의 legacy `ReactDOM.render` 기본 사용으로 React 18+ concurrent 회귀 검출 채널이 손실된다. 의도적으로 하지 않는 것: 특정 메이저 (예: React 19) 로의 업/다운그레이드 운영 task (수단 중립 — `package.json` 다운그레이드 vs `npm install <pkg>@<major>` vs lockfile 재정합 모두 허용), bump 직후 회귀 0 + deprecated 경고 0 게이트 (직교 spec `dependency-bump-gate.md` 책임), typescript devDep/installed/tsconfig 정합 (직교 spec — 본 spec 의 typescript 축 박제 부재), 비 React 계열 dep (`@tanstack/react-query`, `dompurify`, `web-vitals`, `msw`, `vite`, `vitest`) 메이저 정합 (본 spec 외부 — 별 req 분기), 본 spec 파생 task 본문에서의 수단 라벨 부여 (RULE-07 정합).

## 공개 인터페이스
- 소비 파일:
  - `package.json` `dependencies.react` / `dependencies.react-dom` / `dependencies.react-router-dom` / `devDependencies.@testing-library/react` — semver range 선언.
  - `node_modules/<pkg>/package.json` `version` 필드 — installed 실측 메이저.
  - `specs/30.spec/blue/components/*.md` 의 "외부:" 라인 — blue spec 박제 메이저.
- 검출 명령 (반복 가능, 단일 진단 단위 — NFR-02 정합):
  - `node -e "console.log(require('<pkg>/package.json').version)"` — installed 실측 메이저 1-line 추출.
  - `grep -nE "\"(react|react-dom|react-router-dom)\":" package.json` — 선언 라인 추출.
  - `grep -nE "\"@testing-library/react\":" package.json` — testing library 선언 라인 추출.
  - `grep -nE "외부:\s*\` + "`" + `react\s*\^[0-9]+" specs/30.spec/blue/components/*.md` — blue spec 박제 메이저 추출.

## 동작

### 1. 런타임 dep declared ↔ installed 메이저 격차 0 불변식 (REQ-063 FR-01)
`package.json` 의 `dependencies` 의 React 런타임 계열 (`react`, `react-dom`, `react-router-dom`) 각 semver range 메이저 하한과 `node_modules/<pkg>/package.json` 의 installed `version` 메이저가 격차 0 으로 동시 성립한다. 본 불변식의 결과:

- (1.1) `react` — `package.json` declared semver range (예: `^X.Y.Z`) 의 메이저 하한 = `require('react/package.json').version` 의 메이저 = X. 격차 0.
- (1.2) `react-dom` — 동일 형식의 격차 0.
- (1.3) `react-router-dom` — 동일 형식의 격차 0.
- (1.4) 메이저 격차 1 이상이 단일 pkg 에서 검출되면 본 불변식 위반 — `npm ci` 단계에서 lockfile 재정합 또는 peer 경고 동반 install 분기 가능성.

### 2. `@testing-library/react` 메이저 ≥ 14 불변식 — root API 모드 정합 (REQ-063 FR-02)
`package.json` `devDependencies.@testing-library/react` 의 semver range 메이저 하한이 14 이상이어야 한다. 이는 v14.0.0 (2023-04) 부터 `createRoot` 가 default 로 채택되어 production `ReactDOM.createRoot` 와 test runtime 의 root API mode 가 동일해지는 조건이다. v13.x 의 legacy `ReactDOM.render` 기본 사용은 React 18+ concurrent features (`useTransition`, `useDeferredValue`, automatic batching) 의 일부 회귀 검출 채널 손실로 이어진다. 본 불변식의 결과:

- (2.1) `node -e "console.log(require('@testing-library/react/package.json').version.split('.')[0])"` ≥ 14.
- (2.2) production root API (`ReactDOM.createRoot`, `src/index.jsx`) 와 test runtime root API 가 동일 모드 (`createRoot`) 로 일치 — root API 분기 부재.
- (2.3) React 런타임 메이저가 19 로 박제될 시 본 불변식의 하한은 16 (v16.1.0 부터 React 19 호환) 으로 자연 추종 — 본 spec 본문은 하한 14 만 박제하며, 19 호환 시 16 의 추종 조건은 `dependency-bump-gate` 직후 결과 게이트가 검출.

### 3. blue spec 박제 메이저 ↔ declared 메이저 격차 0 불변식 (REQ-063 FR-03)
`specs/30.spec/blue/components/*.md` 의 "외부: `<pkg> ^X.Y.Z`" 형식 박제 메이저와 `package.json` `dependencies.<pkg>` 의 semver range 메이저 하한이 격차 0 으로 정합한다. 본 불변식의 결과:

- (3.1) `grep -nE "외부:\s*\` + "`" + `react\s*\^[0-9]+" specs/30.spec/blue/components/*.md` 추출 메이저 = `package.json:dependencies.react` 메이저 하한.
- (3.2) `react-router-dom` 동일 형식의 격차 0.
- (3.3) blue spec 박제 메이저와 declared 메이저 격차 1 이상은 본 spec 위반 — blue spec 의 메이저별 NFR (예: "React 19 StrictMode 이중 마운트") 가 런타임에서 실증 불능 상태 신호.
- (3.4) 본 불변식은 3축 (blue spec 박제 ↔ declared ↔ installed) 의 격차 0 동시 성립으로 표현된다 — § 동작 1 + § 동작 3 의 AND.

### 4. 위반 검출 단일성 불변식 (REQ-063 FR-04)
세 축 중 어느 한 격차가 1 이상 존재할 때 단일 진단 명령으로 격차 카테고리 (declared vs installed 또는 spec 박제 vs declared) 가 식별 가능하다. 본 불변식의 결과:

- (4.1) `npm ls <pkg>` 또는 `node -p "require('<pkg>/package.json').version"` 1-line 출력으로 installed 메이저 확인.
- (4.2) `grep -nE "\"<pkg>\":" package.json` 1-line 출력으로 declared 메이저 확인.
- (4.3) `grep -nE "외부:.*<pkg>\s*\^[0-9]+" specs/30.spec/blue/components/*.md` 1-line 출력으로 blue spec 박제 메이저 확인.
- (4.4) 세 명령의 출력 비교가 격차 카테고리를 단일 단계로 식별 — 복수 게이트 AND 가 필요한 경우 본 spec § 동작 1/2/3 박제 분기 명시.

### 5. `npm ci` 무결성 재현 불변식 (REQ-063 FR-05)
본 효능 (§ 동작 1~3 격차 0 동시 성립) 도입 후 `npm ci` (lockfile 무결성 검증) 가 본 정합을 재현 가능하다. 격차 발생 시 install 단계에서 검출된다. 본 불변식의 결과:

- (5.1) `npm ci` 가 lockfile 무결성 검증 단계에서 declared semver range ↔ installed version 격차를 검출 — peer warning 또는 ENOENT/EAUDIT 분기.
- (5.2) `package-lock.json` 의 packages."" 의 `dependencies.<pkg>` 와 packages.node_modules/<pkg>.version 이 § 동작 1 의 격차 0 정합을 매개한다.
- (5.3) 본 불변식은 § 동작 1 의 실재 검증 채널로 기능하며, § 동작 1 위반은 `npm ci` 단계에서 1차 검출되어야 한다.

### 6. 수단 중립 불변식 (REQ-063 FR-06, RULE-07 정합)
본 spec § 동작 1~3 의 격차 0 도달 **수단** (lockfile 재정합 vs `npm install <pkg>@<major>` vs `package.json` 다운그레이드 vs PR scaffold vs codemod 도입 등) 에 "기본값" / "권장" / "우선" / "default" / "best practice" 라벨이 박제되지 않는다. 본 spec 은 **결과 효능** 만 박제하며, 수단 선정은 task 계층 (planner / developer) 결정.

- (6.1) `grep -rnE "기본값|권장|우선|default|best" specs/30.spec/green/foundation/runtime-dep-version-coherence.md` 의 매치는 다음 카테고리에 한정된다 — (i) 본 § 동작 6 의 정의 본문 (수단 라벨 셋 박제), (ii) 자기 검증 게이트 본문 (수용 기준 / 테스트 현황 / 회귀 중점 / 변경 이력 정책 명시), (iii) 외부 라이브러리 API 동작 인용 (예: `createRoot` default, `<NavLink>` `caseSensitive` default, `defaultProps` removal — § 동작 2 / § 동작 7.3 / 외부 레퍼런스 본문), (iv) 템플릿 메타 텍스트 ("식별자 우선"). 본 카테고리 외 매치 (예: § 동작 본문 효능 평서문이 "권장 수단" / "기본값 방식" / "best practice 도입" 등으로 수단을 라벨링) 는 § 동작 6.1 위반으로 inspector 가 차기 세션에서 격리 식별.
- (6.2) 수단 라벨이 효능 평서문에 박제된 spec 은 RULE-07 위반으로 inspector 가 차기 세션에서 `50.blocked/spec/` 격리 대상으로 식별. 본 spec 박제 시점 grep 매치 12 hit 은 모두 (i)~(iv) 카테고리에 속하며 (i) § 동작 6 정의 1 hit (line 64) / (ii) 자기 검증 본문 6 hit (line 66 정의 게이트, line 80 회귀 중점, line 132 테스트 현황, line 140 수용 기준, line 152 변경 이력 정책, line 64 정의 재포함) / (iii) 외부 라이브러리 인용 4 hit (line 34 `createRoot` default, line 74 동일, line 167 `defaultProps`, line 168 `caseSensitive` default, line 169 `createRoot` default) / (iv) 템플릿 메타 1 hit (line 7 "식별자 우선") 으로 분류된다. 카테고리 분류 자체가 § 동작 6 의 효능 박제와 직교한다.

### 7. blue spec 박제 메이저 자동 추종 불변식 (REQ-063 FR-07)
본 효능은 React 19 (또는 임의 메이저) bump 자체를 강제하지 않는다. blue spec (`specs/30.spec/blue/components/*.md`) 이 박제한 메이저가 변경되면 본 게이트의 정합 대상도 자연 추종한다 — § 동작 3 의 grep 기반 추출이 blue spec 본문 변경을 자동 수렴하기 때문. 본 불변식의 결과:

- (7.1) blue spec 메이저 박제가 19 → 20 으로 변경되면 § 동작 3 의 정합 대상도 20 으로 자동 추종 — 본 spec 본문 수정 없이.
- (7.2) 본 spec 본문은 특정 메이저 숫자 (19, 7, 14 등) 를 효능 평서문에 하드코딩하지 않는다 — baseline 수치는 §스코프 규칙 grep-baseline 에만 박제하며, 효능 평서문은 "격차 0" 자체로 표현 (NFR-01 시점 비의존 정합).
- (7.3) 단, § 동작 2 의 `@testing-library/react` 메이저 하한 14 는 root API 모드 정합 (createRoot default) 의 기술적 하한으로 본문에 박제 — 이는 React 메이저 추종이 아닌 React 18+ 채택 시점의 정합 한계.

### 회귀 중점
- `package.json:13` `"react-router-dom": "^7.14.1"` ↔ `node_modules/react-router-dom/package.json:version "6.4.3"` 메이저 격차 1 잔존 → § 동작 1.3 위반 baseline.
- `package.json:45` `"@testing-library/react": "^13.4.0"` 메이저 = 13 < 14 → § 동작 2.1 위반 baseline (root API mode 분기).
- `specs/30.spec/blue/components/app.md:39` `"외부: react ^19.2.x"` ↔ `package.json:11` `"react": "^18.2.0"` 메이저 격차 1 → § 동작 3.1 위반 baseline (blue 박제 ↔ declared 격차).
- 본 spec 본문에 격차 해소 수단 라벨 박제 (수단 라벨 토큰 셋 § 동작 6 정의 참조) → § 동작 6.1 위반.
- blue spec 박제가 갱신됐는데 § 동작 3 의 grep 추출 패턴이 디렉터리 / 라인 하드코딩으로 자동 추종 실패 → § 동작 7.1 위반.

## 의존성
- 외부: `react`, `react-dom`, `react-router-dom`, `@testing-library/react` (npm registry), `npm` (lockfile 무결성 검증), Node.js (`node -p` / `node -e`).
- 내부: `package.json`, `package-lock.json`, `node_modules/<pkg>/package.json` (installed 메이저 측정 매개), `specs/30.spec/blue/components/*.md` (blue 박제 측정 매개).
- 역의존:
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) — bump **직후** 결과 게이트 (회귀 0 + deprecated 경고 0). 본 spec 과 직교 — 본 spec 은 bump 미수행 상태의 spec ↔ runtime 격차, dependency-bump-gate 는 bump 직후 결과. 어느 한 축이 다른 축을 자동 충족시키지 않는다.
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028/053/058) — typescript / eslint tooling 계약. 본 spec 의 react 런타임 축과 직교 — 본 spec 은 typescript 축 박제 부재.
  - `specs/30.spec/blue/components/app.md` `:39` "외부: `react ^19.2.x`, `react-dom ^19.2.x`, `react-router-dom ^7.14.1`" — § 동작 3 의 박제 메이저 측정 진입점.
  - `specs/30.spec/blue/components/{search,monitor,common,toaster,comment,file,log,image}.md` — React 19 메이저별 NFR 박제 (StrictMode 이중 마운트, deprecated API 미사용 등). 본 spec § 동작 3 위반 시 해당 NFR 들의 런타임 실증 채널이 부재 상태.
  - `specs/30.spec/blue/common/test-idioms.md` — React 런타임 변환 (`@testing-library/react` 의 root API 모드) 박제. 본 spec § 동작 2 와 직교적으로 정합.
  - `specs/30.spec/green/foundation/island-proptypes-removal.md` (REQ-062) — `prop-types` 는 본 spec 의 React 런타임 계열 외부 (별 dep). 본 spec § 동작 1~3 의 4 pkg 집합에 포함되지 않는다.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 task 발행이 아니라 불변식 박제 — grep / `node -p` 게이트는 baseline 실측 박제 목적. 효능 도입 task 발행 시점에 task 의 §스코프 규칙 expansion 결정).
- **grep-baseline** (REQ-063 발행 시점 HEAD=`2de68c8` + 본 spec 박제 시점 HEAD=`07eaf10` 실측 — 두 HEAD 사이 `package.json` / `node_modules` / blue spec 변경 0):
  - (a) `grep -nE "\"(react|react-dom|react-router-dom)\":" package.json` → **3 hits in 1 file** (declared 메이저 추출):
    - `package.json:11` `"react": "^18.2.0"` (선언 메이저 = 18)
    - `package.json:12` `"react-dom": "^18.2.0"` (선언 메이저 = 18)
    - `package.json:13` `"react-router-dom": "^7.14.1"` (선언 메이저 = 7)
  - (b) `grep -nE "\"@testing-library/react\":" package.json` → **1 hit** (`package.json:45` `"@testing-library/react": "^13.4.0"`, 선언 메이저 = 13). § 동작 2 위반 baseline (< 14).
  - (c) `node -e "console.log(require('<pkg>/package.json').version)"` 실측:
    - `react` → `18.2.0` (installed 메이저 = 18). vs declared 18 → § 동작 1.1 격차 0.
    - `react-dom` → `18.2.0` (installed 메이저 = 18). vs declared 18 → § 동작 1.2 격차 0.
    - `react-router-dom` → `6.4.3` (installed 메이저 = 6). vs declared 7 → **§ 동작 1.3 격차 1 위반 baseline**.
    - `@testing-library/react` → `13.4.0` (installed 메이저 = 13). vs declared 13 → § 동작 1 차원에선 격차 0 이나 § 동작 2 차원에선 < 14 위반.
  - (d) `grep -nE "외부:\s*\` + "`" + `react\s*\^[0-9]+" specs/30.spec/blue/components/app.md` → **1 hit** (`specs/30.spec/blue/components/app.md:39` `"외부: \` + "`" + `react ^19.2.x\` + "`" + `, \` + "`" + `react-dom ^19.2.x\` + "`" + `, \` + "`" + `react-router-dom ^7.14.1\` + "`" + `"`). blue spec 박제 메이저: react = 19, react-dom = 19, react-router-dom = 7.
  - (e) blue 박제 ↔ declared 비교 (§ 동작 3 baseline):
    - `react` — blue 박제 19 vs declared 18 → **격차 1 위반 baseline**.
    - `react-dom` — blue 박제 19 vs declared 18 → **격차 1 위반 baseline**.
    - `react-router-dom` — blue 박제 7 vs declared 7 → 격차 0 정합. (단, installed 6 와는 § 동작 1.3 격차 1 위반 잔존.)
  - (f) `grep -rnE "React 19|React 18" specs/30.spec/blue/components/ | wc -l` → React 19 mention **8 lines** (app.md:39,50 / search.md:39 / file.md:32 / monitor.md:28 / common.md:190 / toaster.md:32,50 / comment.md:31). React 18 mention 0 hit. blue spec 의 React 메이저 박제는 19 단일 — § 동작 3 의 자동 추종 진입점은 19 (현 시점).
  - (g) `grep -rn "react-router-dom\|@testing-library/react" specs/30.spec/green/` → **0 hit** (본 spec 박제 전 green spec 부재 baseline). 본 spec create 후 1+ hit.
  - (h) `grep -n "ReactDOM.createRoot" src/index.jsx` → **1 hit** (`src/index.jsx:8` `const root = ReactDOM.createRoot(...)`). production root API mode 박제 — § 동작 2.2 정합 진입점.
- **rationale**: gate (a)(b) 는 declared 메이저 추출 — § 동작 1/2 의 좌변. gate (c) 는 installed 메이저 실측 — § 동작 1 의 우변. gate (d) 는 blue spec 박제 메이저 추출 — § 동작 3 의 좌변. gate (e) 는 § 동작 3 의 3축 격차 정합 baseline (react / react-dom 격차 1 / react-router-dom 격차 0). gate (f) 는 blue spec 박제의 React 메이저 단일성 (19) 확인 — § 동작 7 자동 추종 진입점. gate (g) 는 본 spec 박제 전 green 부재 baseline (본 세션 create 후 1+ hit). gate (h) 는 § 동작 2.2 production root API mode 박제 진입점. 모든 baseline 은 시점 의존 수치 (18 / 19 / 6 / 13) 가 아닌 **격차 0 도달 효능 자체** 가 본 spec 의 박제 대상이며, baseline 수치는 위반 상태 식별 보조 — NFR-01 시점 비의존 정합.

## 테스트 현황
- [ ] § 동작 1.1 `react` declared vs installed 메이저 격차 0.
- [ ] § 동작 1.2 `react-dom` declared vs installed 메이저 격차 0.
- [ ] § 동작 1.3 `react-router-dom` declared vs installed 메이저 격차 0.
- [ ] § 동작 1.4 어떤 단일 pkg 도 메이저 격차 1 이상 부재 — `npm ci` peer warning 채널 부재.
- [ ] § 동작 2.1 `@testing-library/react` 메이저 ≥ 14.
- [ ] § 동작 2.2 production root API (`ReactDOM.createRoot`) 와 test runtime root API mode 일치.
- [ ] § 동작 2.3 React 19 박제 시 `@testing-library/react` 메이저 ≥ 16 자동 추종.
- [ ] § 동작 3.1 `react` blue 박제 메이저 = declared 메이저.
- [ ] § 동작 3.2 `react-router-dom` blue 박제 메이저 = declared 메이저.
- [ ] § 동작 3.3 blue 박제 ↔ declared 격차 1 이상 부재.
- [ ] § 동작 3.4 3축 격차 0 AND 동시 성립.
- [ ] § 동작 4.1~4.4 단일 진단 명령으로 격차 카테고리 식별.
- [ ] § 동작 5.1 `npm ci` 가 § 동작 1 격차 검출 채널로 기능.
- [ ] § 동작 5.2 `package-lock.json` 의 declared vs node_modules version 매개.
- [ ] § 동작 6.1 `grep -rnE "기본값|권장|우선|default|best" specs/30.spec/green/foundation/runtime-dep-version-coherence.md` → 0 hit.
- [ ] § 동작 7.1 blue spec 메이저 변경 시 § 동작 3 정합 대상 자동 추종.
- [ ] § 동작 7.2 본 spec 본문에 특정 메이저 숫자 (19, 7) 효능 평서문 하드코딩 부재.

## 수용 기준
- [ ] (Must, FR-01) React 런타임 계열 dep (`react`, `react-dom`, `react-router-dom`) declared 메이저 = installed 메이저 (격차 0 동시 성립) — § 동작 1.
- [ ] (Must, FR-02) `@testing-library/react` 메이저 ≥ 14 (root API mode 정합) — § 동작 2.
- [ ] (Must, FR-03) blue spec 박제 메이저 (`react ^19.2.x` 등) = declared 메이저 (격차 0 동시 성립) — § 동작 3.
- [ ] (Must, FR-06) 본 spec 본문에 수단 라벨 ("기본값" / "권장" / "우선" / "default" / "best") 0 hit — § 동작 6.1 자기 검증.
- [ ] (Should, FR-04) 단일 진단 명령 (`node -p` / `grep -nE`) 으로 격차 카테고리 식별 — § 동작 4.
- [ ] (Should, FR-05) 본 효능 도입 후 `npm ci` 가 격차 검출 채널로 기능 — § 동작 5.
- [ ] (Should, FR-07) blue spec 박제 메이저 변경 시 본 게이트 정합 대상 자동 추종 — § 동작 7.
- [ ] (NFR-01) 본 spec 본문에 특정 메이저 숫자 (19, 7, 14 등) 가 효능 평서문에 하드코딩되지 않음 — baseline 수치는 §스코프 규칙 grep-baseline 에만 박제 (위반 상태 식별 보조). 단 § 동작 2 의 메이저 하한 14 는 root API 모드 정합의 기술적 하한으로 본문 박제 (React 메이저 추종이 아닌 기술적 정합 한계 — § 동작 7.3).
- [ ] (NFR-02) 본 효능 박제는 단일 진단 명령 (`node -p` 1-line 또는 `grep -nE` 1-line) 으로 격차 카테고리 식별 가능 — 복수 게이트 AND 필수 시 spec 박제 분기 명시.
- [ ] (NFR-03) 결과 효능 (3축 메이저 격차 0) 만 박제. 1회성 bump 진단·릴리스 귀속 patch 배제.
- [ ] (NFR-04) `dependency-bump-gate` (bump 직후 회귀 0 + deprecated 경고 0) 와 직교 — 본 spec 은 bump 미수행 상태의 spec ↔ runtime 격차, `dependency-bump-gate` 는 bump 직후 결과. 어느 한 축이 다른 축을 자동 충족시키지 않는다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-063 흡수). React 런타임 계열 dep (`react`, `react-dom`, `react-router-dom`, `@testing-library/react`) 의 3축 메이저 정합 — declared range major ↔ installed major ↔ blue spec 박제 major — 격차 0 동시 성립 상시 불변식 박제 (§ 동작 1~7). REQ-061 (toolchain-version-coherence, 격리됨) 의 typescript devDep 축에 대응되는 **런타임/테스트 dep 축 메타 패턴 확장**. baseline 실측 @HEAD=`07eaf10` (REQ-063 발행 HEAD=`2de68c8` 와 package.json / node_modules / blue spec 영향 0): (a) declared react/react-dom/react-router-dom 3 hits (18/18/7) / (b) declared @testing-library/react 13 (§ 동작 2 위반 baseline) / (c) installed react 18.2.0 / react-dom 18.2.0 / react-router-dom 6.4.3 (격차 1 위반 baseline) / @testing-library/react 13.4.0 / (d) blue 박제 react ^19.2.x, react-dom ^19.2.x, react-router-dom ^7.14.1 (app.md:39) / (e) 3축 격차: react 격차 1, react-dom 격차 1, react-router-dom blue↔declared 0 / declared↔installed 1 / (f) blue 박제 React 19 mention 8 lines (8 blue components spec) / (g) green 박제 0 hit baseline / (h) production root API `ReactDOM.createRoot` 1 hit (src/index.jsx:8). 수단 중립 정책 (§ 동작 6.1 자기 검증 — "기본값/권장/우선/default/best" 라벨 0 hit). consumed req: `specs/20.req/20260517-runtime-dep-version-coherence.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `dependency-bump-gate.md` (bump 직후 결과 축 직교), `tooling.md` (typescript/eslint tooling 축 직교 — 본 spec react 런타임 축 박제), blue/components/* "외부: react ^19.2.x" 박제 (§ 동작 3 정합 진입점), blue/common/test-idioms.md (root API 모드 직교 정합), green/foundation/island-proptypes-removal.md (`prop-types` 는 본 spec 4 pkg 집합 외부). RULE-07 자기검증 — § 동작 1~7 모두 평서형·반복 검증 가능 (`node -p` + grep count + blue spec 박제 추출)·시점 비의존 (특정 메이저 숫자는 §스코프 규칙 baseline 에만 박제, 효능 평서문은 "격차 0" 자체 — § 동작 2 의 하한 14 는 root API 모드 정합 기술적 한계로 예외)·incident patch 아님 (런타임 dep 정합은 spec ↔ runtime 의 상시 성질). RULE-06 §스코프 규칙 gate (a)~(h) 8건 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/runtime-dep-version-coherence.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. | 전 섹션 (신규) |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/05/17/req/20260517-runtime-dep-version-coherence.md` (REQ-063 — 본 세션 mv).
- **선행 req (메타 패턴 공유)**:
  - `specs/60.done/2026/05/17/req/20260517-toolchain-version-coherence.md` (REQ-061 — typescript devDep ↔ installed ↔ tsconfig 정합). 본 spec 은 동일 메타 패턴의 런타임/테스트 dep 축 확장 — typescript 정합 spec 은 현재 격리 상태이나 본 spec 의 박제와 직교.
- **관련 spec (역의존 — 모두 직교 축)**:
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-20260421-035) — bump **직후** 결과 게이트 (회귀 0 + deprecated 경고 0). 본 spec 은 bump 미수행 상태의 spec ↔ runtime 격차 (음영 지대). 두 spec 의 효능 직교.
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028/053/058) — typescript / eslint tooling 계약. 본 spec 의 react 런타임 축과 별 차원.
  - `specs/30.spec/blue/components/app.md` `:39` "외부: `react ^19.2.x`, `react-dom ^19.2.x`, `react-router-dom ^7.14.1`" — § 동작 3 박제 메이저 측정 진입점.
  - `specs/30.spec/blue/components/{search,monitor,common,toaster,comment,file,log,image}.md` — React 19 메이저별 NFR 박제 (StrictMode 이중 마운트, deprecated API 미사용 등). 본 spec § 동작 3 위반 시 해당 NFR 들의 런타임 실증 채널이 부재.
  - `specs/30.spec/blue/common/test-idioms.md:10` "React 19 런타임 변환 (REQ-024 분리)" — REQ-024 lineage 는 done/archive. 본 spec 은 그 lineage 의 운영 task (React 19 bump) 가 아니라 **dep 정합 불변식** 박제.
  - `specs/30.spec/green/foundation/island-proptypes-removal.md` (REQ-062) — `prop-types` 는 본 spec 의 React 런타임 계열 (4 pkg) 외부.
- **외부 레퍼런스**:
  - React 19 upgrade guide: `https://react.dev/blog/2024/04/25/react-19-upgrade-guide` — deprecated API 셋 (`defaultProps` 함수형, 문자열 ref, `findDOMNode`).
  - react-router-dom v7 changelog: `https://reactrouter.com/upgrading/v6` — data router unification, `<NavLink>` `caseSensitive` default.
  - `@testing-library/react` releases: `https://github.com/testing-library/react-testing-library/releases` — v14.0.0 `createRoot` default, v16.1.0 React 19 support, v16.3.2 (2026-01-19) `onCaughtError` 타입 추론 수정.
- **현장 근거 (HEAD=`2de68c8` REQ 발행 + `07eaf10` spec 박제, package.json/node_modules/blue 영향 0)**:
  - `package.json:11-13` `"react": "^18.2.0"`, `"react-dom": "^18.2.0"`, `"react-router-dom": "^7.14.1"`.
  - `package.json:45` `"@testing-library/react": "^13.4.0"`.
  - `node_modules/react/package.json` `version: "18.2.0"`, `node_modules/react-dom/package.json` `version: "18.2.0"`, `node_modules/react-router-dom/package.json` `version: "6.4.3"`, `node_modules/@testing-library/react/package.json` `version: "13.4.0"`.
  - `specs/30.spec/blue/components/app.md:39` "외부: `react ^19.2.x`, `react-dom ^19.2.x`, `react-router-dom ^7.14.1`".
  - `src/index.jsx:8` `const root = ReactDOM.createRoot(document.getElementById("root"))` (production).
- **RULE 준수**:
  - RULE-07: 7개 불변식 (§ 동작 1~7) 모두 시점 비의존·평서형·반복 검증 가능 (`node -p` 1-line + grep count + blue spec 박제 추출)·incident 귀속 부재. 수단 라벨 박제 0 (§ 동작 6.1 자기 검증). § 동작 2 의 하한 14 는 root API 모드 정합 기술적 한계 (§ 동작 7.3 명시).
  - RULE-06: §스코프 규칙 grep-baseline 8개 gate (a)~(h) 실측 박제 @HEAD=`07eaf10`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/runtime-dep-version-coherence.md` 신규 create + req mv `20.req/* → 60.done/req/`).
