# TS island PropTypes 0 hit — island 정의 세 번째 축 효능 불변식

> **위치**: TS island 확정 디렉터리 (`src/**` 중 `find <dir> \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit AND `npm run typecheck 2>&1 | grep -E "^<dir>/" | grep -cE "error TS"` → 0 hit 두 축 동시 충족) 내부.
> **관련 요구사항**: REQ-20260517-088 (선행 REQ-20260517-062 spec 박제 미흡수 audit 회수).
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제, REQ-088 흡수 / REQ-062 island 정의 세 번째 축 (PropTypes 0) 효능 박제 미완료 audit 회수).

> 참조 코드는 **식별자 우선**. 라인 번호는 박제 시점 스냅샷 (HEAD=`3bc98e5`).

## 역할
TypeScript island 자격 (REQ-20260517-059 FR-01 정의 — `.jsx`/`.js` 0 hit + `npm run typecheck` error 0 hit 2축) 에 더하여 **island 디렉터리 내부 `PropTypes\|prop-types` selector 0 hit** 을 island 정의의 세 번째 축으로 박제하는 시스템 불변식. 본 효능은 (a) `typecheck-island-extension.md` (REQ-077) island 정의 후반부 (typecheck error 0) 와 직교 — 어느 한 축 위반이 다른 축의 게이트를 자동 충족시키지 않으며, (b) `eslint-react-hooks-lint-gate.md` (REQ-087) hook 규칙 게이트와 직교 — PropTypes vs hook 호출 규칙 별 채널. island 정의는 세 축 AND. 본 spec 의 회복 효능 도입으로, TS island 확정 디렉터리에서 런타임 dev-mode prop 검증 채널 (`prop-types` 패키지의 `MyComponent.propTypes = {...}` selector) 이 0 hit 수렴 — 정적 타입 계약 (TS `interface` / `type` Props) 과 런타임 dev-mode 경고 채널의 중복 박제가 island 디렉터리에서 제거된다 (TS Props 단일 출처). 의도적으로 하지 않는 것: PropTypes 제거 수단 선정 (단순 import/selector 삭제 vs codemod `jscodeshift` vs ESLint rule `react/forbid-prop-types` vs `react/prop-types: off` + `no-restricted-imports` — task 단 위임, 수단 중립), `package.json:dependencies` `prop-types` 패키지 자체의 위치 (deps vs devDeps) 또는 제거 (비-island `src/Log/`, `src/Monitor/` 가 import 하는 동안 production 포함 유지 필요 — `node-modules-extraneous-coherence.md` 영역), React 19 bump (현 `react ^18.2.0` 유지 가정 — `runtime-dep-version-coherence` 별 축), `<Component>.propTypes` selector 의 React 18 vs React 19 동작 차이 (외부 패키지 동작 변경 0), test 파일 (`*.test.tsx`) 의 PropTypes 잔존 (본 baseline 측정 결과 test 파일 PropTypes 0 hit — out-of-scope), bundle 사이즈 영향 수치 (REQ-062 FR-06 영역 — 모든 island PropTypes 0 + 비-island island 수렴 + `package.json` deps 에서 `prop-types` 제거 3 조건 동시 성립 시점 측정), `src/common/{ErrorFallback,Skeleton}.tsx` 의 자기 진단 주석 `Props (prop-types intentionally omitted, TS migration pending):` 처리 정책 (FR-06 분기 — 본 spec §스코프 규칙 G2 정밀 패턴으로 selector 한정 측정 박제), 비-island 디렉터리 (`src/Log/`, `src/Monitor/`) PropTypes 잔존 (본 게이트 적용 영역 외 — `src-typescript-migration` 후행 island 수렴 축), `eslint-plugin-react` rule `react/prop-types` 활성화 자체 (tooling/lint 영역 — `eslint-react-hooks-lint-gate.md` 와 유사 메타 효능 후보지만 별 spec carve 결정은 본 spec 영역 외).

## 공개 인터페이스
- 측정 대상 디렉터리: TS island 확정 디렉터리 (island 정의 2축 동시 충족 디렉터리 — 본 spec 박제 시점 `src/Toaster/`, `src/Comment/`, `src/File/`, `src/Image/`, `src/common/`, `src/Search/` 6 디렉터리 island 정의 전반부 (확장자) + 후반부 (typecheck) 동시 PASS).
- 측정 명령 (selector 정밀):
  - **(M-A) 광역 grep (자기 진단 주석 포함)**: `grep -rn "PropTypes\|prop-types" <island-dir>` → hit count 측정.
  - **(M-B) selector 정밀 grep (FR-06 정합)**: `grep -rnE "import.*from\s+['\"]prop-types['\"]|PropTypes\.|\.propTypes\s*=" <island-dir>` → hit count 측정 (자기 진단 주석 미포함, runtime selector 한정).
- 게이트 표현:
  - **island 정의 제 3 축**: 측정 명령 (M-B) selector 정밀 grep → 0 hit (자기 진단 주석은 selector 가 아니므로 측정 외 — FR-06 분기).
  - **광역 0 hit (강한 형태)**: 측정 명령 (M-A) → 0 hit (자기 진단 주석 동시 제거 또는 주석 양식 변경 — task 단 결정).

## 동작
1. **(I1) island 정의 세 번째 축 효능**: TS island 확정 디렉터리 (island 정의 2축 동시 충족) 내부에서 `grep -rnE "import.*from\s+['\"]prop-types['\"]|PropTypes\.|\.propTypes\s*=" <island-dir>` → 0 hit. 측정 명령 (M-B) selector 정밀. 자기 진단 주석 (`// Props (prop-types intentionally omitted, ...)`) 은 selector 가 아니므로 본 게이트에 포함되지 않음. 본 게이트는 (a) `eslint-react-hooks-lint-gate.md` (hook 규칙) 와 직교, (b) `typecheck-island-extension.md` (typecheck error 0) 와 직교 — 어느 한 축 위반이 다른 축의 게이트를 자동 충족시키지 않는다.
2. **(I2) 자동 확장 효능 — island 정의 정합**: 본 게이트는 island 디렉터리 목록을 spec 본문에 하드코딩하지 않고, island 정의 (`find <dir> \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit AND `npm run typecheck 2>&1 | grep -E "^<dir>/" | grep -cE "error TS"` → 0 hit) 와 정합한 패턴으로 박제. 신규 island 확정 (예: 비-island `src/Log/` 또는 `src/Monitor/` 후행 수렴 시) 시 수동 디렉터리 목록 갱신 없이 본 게이트 자동 적용. 측정: 박제 시점 6 island 디렉터리 + 미래 신규 island 확정 → 동일 selector 정밀 grep 패턴 (M-B) 적용.
3. **(I3) 비-island false-positive 부재**: 본 게이트는 비-island 디렉터리 (`src/Log/`, `src/Monitor/` 등 island 정의 2축 중 1+ 축 미충족 디렉터리) 의 PropTypes 잔존을 검출하지 않는다. 측정: 비-island 디렉터리에 본 게이트 적용 시도 시 fail 신호 발생 0 — island 정의 2축 동시 충족 디렉터리만 본 게이트 적용 대상. (`src-typescript-migration` 후행 island 수렴 축으로 비-island 가 island 로 진입 시점에 본 게이트 자동 적용 — 사전 적용 부재로 false-positive 0.)
4. **(I4) 단일 출처 (TS Props 계약)**: TS island 확정 디렉터리 내부 Component Props 계약 출처는 TS `interface` / `type` Props 단일 — 런타임 dev-mode prop 검증 채널 (`prop-types`) 과의 이중 박제 제거. 본 효능 도입 후 island 디렉터리 Component 의 Props 계약은 정적 타입 단일 채널 (TS 컴파일 시점 error TS) — 런타임 채널 (`prop-types` console.error 경고) 중복 박제 0.
5. **(I5) 수단 중립 (RULE-07)**: 본 효능 보장은 (a) 단순 import + selector 삭제 (`import PropTypes from 'prop-types'` line 삭제 + `<Component>.propTypes = {...}` block 삭제), (b) codemod (`jscodeshift` rule), (c) ESLint rule (`react/forbid-prop-types`, `react/prop-types: off` + `no-restricted-imports` for `prop-types`), (d) 자기 진단 주석 양식 변경 — 어느 수단이든 수용. 본 spec 본문 어느 곳에서도 수단 후보에 선호 라벨 (RULE-07 수단 중립 게이트 위반어 카테고리) 부여 0. 라벨 hit 자기 검증은 §스코프 규칙 G3 박제 (위반어 패턴 + 백틱 코드 식별자 면제 평서).
6. **(I6) 자기 진단 주석 처리 분기 (FR-06 정합)**: `src/common/ErrorFallback.tsx` + `src/common/Skeleton.tsx` 의 자기 진단 주석 `Props (prop-types intentionally omitted, TS migration pending):` 은 본 게이트의 selector 정밀 측정 (M-B) 에는 미포함 — 본 spec 의 (I1) 0 hit 효능과 무충돌. 단 광역 grep (M-A) 측정 시 본 주석은 hit 으로 잡힘 (현 baseline 2 hit / 2 파일 — §스코프 규칙 G1 참고). 본 주석 처리 정책 (제거 vs 주석 양식 변경 vs 유지) 은 task 단 결정 — 본 spec 비박제.
7. **(I7) 자매 메타 spec 정합**: 본 효능은 (a) `typecheck-island-extension.md` (REQ-077, island 정의 후반부 — typecheck error 0 채널) 와 island 정의 3 축 직교 (확장자 0 / typecheck 0 / PropTypes 0 — 세 축 AND), (b) `eslint-react-hooks-lint-gate.md` (REQ-087, hook 규칙 lint-time 차단 채널) 와 직교 — 채널 독립. 어느 한 채널 위반이 다른 채널 게이트를 자동 충족시키지 않는다.
8. **(I8) 시점 비의존 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 현 시점 PropTypes 잔존 절대 hit count 또는 디렉터리별 분포 또는 island 확정 디렉터리 6 파일명 일괄 박제 0. baseline 매트릭스 (현 시점 hit count + 디렉터리별 분포) 는 §스코프 규칙 grep-baseline 한정 (감사성). 본 spec §공개 인터페이스 박제의 island 디렉터리 6 파일명은 §공개 인터페이스 측정 대상 식별 한정 — 본문 평서형 게이트는 "island 디렉터리 내부" 추상 표현.
9. **(I9) REQ-062 → REQ-088 audit 회수**: REQ-20260517-062 (`60.done/2026/05/17/req/20260517-island-prop-types-removal.md`) 흡수 시점에 island 정의 세 번째 축 (PropTypes 0) 의 spec 박제 부재 — inspector mv 시점에 `60.done/req/` 이동과 spec 박제 동반 의무가 RULE 차원 강제 아닌 메타 인식. 본 spec 박제로 audit 회수. REQ-062 §수용 기준 5건 marker 미플립은 본 spec 효능 회복 task 발행 + 수행 후 별 inspector tick hook-ack 영역.

### 회귀 중점
- island 확정 디렉터리 내부 신규 Component 가 `import PropTypes from 'prop-types'` + `<Component>.propTypes = {...}` selector 박제 시 (I1) 위반. island 자격 (확장자 + typecheck) 은 유지되나 본 spec 의 PropTypes 0 hit 축 미달.
- 비-island 디렉터리 (`src/Log/`, `src/Monitor/`) 가 island 로 수렴 (확장자 0 hit + typecheck error 0 hit 동시 충족) 시점에 본 게이트 자동 적용 — 수렴 직전 PropTypes 잔존이 게이트 fail 신호. 수렴 task 발행 시점에 PropTypes 제거 동반 필요 (별 task carve 결정).
- 자기 진단 주석 `Props (prop-types intentionally omitted, ...)` 가 새 디렉터리에 confused-copy 되어 광역 grep (M-A) hit count 증가 시 (I6) 회귀 신호 — selector 정밀 (M-B) 는 무영향이나 광역 채널 noise.
- ESLint rule `react/prop-types` (Component Props 가 PropTypes 박제 강제) 가 활성화될 경우 본 spec 효능과 충돌 — 본 효능 도입 후 island 디렉터리에서 PropTypes 0 hit 수렴 시 `react/prop-types` 가 error 신호 → tooling 영역 별 spec carve (`react/prop-types: off for island dirs`).
- React 19 deprecation 영역의 `defaultProps` (함수형 컴포넌트 정적 selector) 박제가 island 디렉터리에 잔존 시 본 spec 영역 외이나 인접 신호 — `runtime-dep-version-coherence` 또는 `eslint-react-hooks-lint-gate` 영역 별 축.

## 의존성
- 외부: POSIX shell (`bash`), `grep` extended regex (`-E`), TypeScript (`tsc` — island 정의 후반부 게이트 측정).
- 내부: TS island 확정 디렉터리 (현 박제 시점 `src/Toaster/`, `src/Comment/`, `src/File/`, `src/Image/`, `src/common/`, `src/Search/` 6 디렉터리 + 미래 신규 island 수렴 디렉터리), `package.json:dependencies` `prop-types` 패키지 (런타임 import 출처 — 비-island `src/Log/`, `src/Monitor/` import 동안 유지 가정).
- 역의존 (회복 후 자동 작동): `typecheck-island-extension.md` (REQ-077, island 정의 후반부 게이트와 정합 — 세 축 AND 동시 측정), 미래 신규 island 수렴 spec (확장자 + typecheck + PropTypes 세 축 자동 적용).
- 직교: `eslint-react-hooks-lint-gate.md` (REQ-087, hook 규칙 채널 — Props 계약 채널과 직교), `lint-warning-zero-gate.md` (REQ-080, lint warning 채널 — PropTypes selector 잔존은 warning 채널과 직교), `node-modules-extraneous-coherence.md` (REQ-078, `package.json` extraneous dep 채널 — `prop-types` 패키지 자체 위치는 본 spec 영역 외).

### carve-precondition
- (P1) **환경 채널 가용성**: 본 spec 효능 회복 task carve 시점 (별 task 단) 에 `node_modules/` 가용성 + `npm run typecheck` exit=0 (island 정의 후반부 PASS) + `npm run lint` exit=0 (lint 채널 무회귀) + `npm run build` exit=0 (build 채널 무회귀) 4 환경 게이트 충족 필요. 본 spec 자체 박제는 산출물 변경 require 0 (효능 평서 박제만) — 본 spec 박제 시점 환경 게이트 N/A.
- (P2) **선행 spec done 상태**: 본 spec 효능 회복 task carve 시점에 선행 spec (REQ-20260517-077 `typecheck-island-extension.md` blue 승격 done — `30.spec/blue/foundation/typecheck-island-extension.md`) 의 island 정의 후반부 (typecheck error 0) 충족 필요. 박제 시점 `npm run typecheck` exit=0 + `grep -cE "error TS"` → 0 hit (HEAD=`4b5cc1d` 이후 누적 PASS). 본 spec 자체 박제는 효능 박제 한정 — 선행 spec 의존 없음 (자매 메타 효능과 직교).
- (P3) **RULE-02 chain 비활성**: 본 spec 은 신규 박제 spec — 기존 carve fail-fast chain 누적 0. chain 부재 평서 박제 — carve 진입 차단 신호 없음. 회복 task 발행 시점 (별 inspector / planner tick) 에 chain 누적 신호 발생 시 별 carve-precondition 게이트 자가 차단 적용.

## 테스트 현황
- [ ] (I1) island 정의 세 번째 축 효능 — 현 baseline 57 hit (selector 정밀 grep M-B, §스코프 규칙 G2 MISS — 본 spec 회복 대상 zero-point). 회복 task 발행 + 수행 후 marker 플립.
- [ ] (I2) 자동 확장 효능 — island 정의 정합 패턴 박제. 본 spec 박제 자체로 정합 — marker 플립은 신규 island 확정 (예: `src/Log/` 또는 `src/Monitor/` 수렴) 시점에 본 게이트 자동 적용 검증 후. 현 박제 시점 6 island 디렉터리 적용 baseline (§스코프 규칙 G2) 박제.
- [ ] (I3) 비-island false-positive 부재 — 본 spec 박제 자체로 평서 정합. marker 플립은 신규 island 확정 (비-island → island) 진입 시점에 본 게이트 fail 신호 발생 + 직전 비-island 시점 fail 신호 부재 검증 후.
- [ ] (I4) 단일 출처 (TS Props 계약) — (I1) 효능 회복 후 marker 플립 동반. 회복 후 island 디렉터리 Component Props 단일 출처 (TS interface/type) 검증.
- [x] (I5) 수단 중립 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/island-proptypes-zero.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice"` → 0 hit (§스코프 규칙 G3 박제).
- [x] (I6) 자기 진단 주석 처리 분기 — §동작 6 박제 + §스코프 규칙 G1 광역 baseline 박제 (M-A 48 hit) + G2 selector 정밀 baseline 박제 (M-B 57 hit, 광역 -2 자기 진단 주석 = 46 selector 박제 외 별도 +11 import 등 — §스코프 규칙 G2 분포 박제 한정). 본 spec 박제 자체로 평서 정합.
- [x] (I7) 자매 메타 spec 정합 — 본 spec §동작 7 박제 + 본문 자매 메타 spec 3건 명시 (`typecheck-island-extension.md` + `eslint-react-hooks-lint-gate.md` + `lint-warning-zero-gate.md` 직교 채널 평서).
- [x] (I8) 시점 비의존 (RULE-07) — 본 spec §동작 8 박제 + §스코프 규칙 G4 자기 검증 0 hit (본문 carve-active spec 파일명 / chain ID / 4 followups slug / 48 hit 절대 수치 박제 0).
- [x] (I9) REQ-062 → REQ-088 audit 회수 — 본 spec §동작 9 + §변경 이력 + §참고 박제로 정합. REQ-062 spec 박제 미흡수 audit pointer 평서 박제.

## 수용 기준
- [ ] (Must, FR-01) island 정의 세 번째 축 효능 박제 — 6 island 디렉터리 selector 정밀 grep (M-B) → 0 hit. 현 baseline 57 hit (§스코프 규칙 G2 MISS — 본 spec 회복 대상). 별 task 발행 + 수행 후 marker 플립.
- [x] (Must, FR-02) §스코프 규칙 grep-baseline 에 HEAD=`3bc98e5` 시점 실측 수치 박제 — island 6 디렉터리 광역 grep (M-A) 48 hit / 13 파일 + selector 정밀 grep (M-B) 57 hit + 파일별 분포. REQ-062 시점 baseline (46 hit / 11 파일, HEAD=`e01605d`) 와 +2 hit (자기 진단 주석 신규 박제) — 미수렴 상태 audit.
- [x] (Must, FR-03) §변경 이력 + §참고 에 REQ-062 → REQ-088 audit pointer 박제 — "REQ-062 `60.done/2026/05/17/req/20260517-island-prop-types-removal.md` 흡수 시점에 spec 박제 부재 → REQ-088 후속 박제" 평서 (§변경 이력 row + §참고 선행 done req).
- [x] (Should, FR-04) 자동 확장 효능 — island 정의 정합 패턴 (확장자 0 hit + typecheck 0 hit 동시 충족 디렉터리 대상 적용) 박제. §동작 2 + §공개 인터페이스 평서. 본 spec 박제 자체로 정합.
- [x] (Should, FR-05) 비-island false-positive 부재 — §동작 3 + §회귀 중점 평서 박제. 본 spec 박제 자체로 평서 정합.
- [x] (Should, FR-06) 자기 진단 주석 처리 분기 — §동작 6 + §스코프 규칙 G1/G2 측정 명령 (M-A vs M-B) 분기 박제. 본 게이트 적용은 selector 정밀 (M-B), 자기 진단 주석 (M-A 잔존) 은 측정 외.
- [x] (Must, FR-07) 수단 라벨 0 — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/island-proptypes-zero.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice"` → 0 hit (§스코프 규칙 G3 자기 검증).
- [x] (NFR-01) 시점 비의존 — 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 에 48 hit / 13 파일 / 57 hit 절대 수치 박제 0. 수치는 §스코프 규칙 grep-baseline 한정. 본문은 "island 디렉터리 PropTypes 0 hit" 평서형.
- [x] (NFR-02) 게이트 단일성 — §공개 인터페이스 + §스코프 규칙 G2 단일 grep 명령 (selector 정밀 M-B) hit count 0 로 측정 가능. 복수 게이트 AND 필수 (M-A vs M-B 분기) 는 §동작 6 + §스코프 규칙 분기 박제.
- [x] (NFR-03) island 정의 정합 — §동작 7 자매 메타 spec 정합 평서. island 정의 세 축 AND — 어느 한 축 위반이 다른 축의 게이트를 자동 충족시키지 않는다.
- [x] (NFR-04) RULE-07 정합 — "PropTypes 0 hit" 결과 효능만 박제. 1회성 진단·릴리스·incident 귀속 박제 배제. 본 spec 의 동기 (REQ-062 spec 박제 미흡수) 는 §참고/§변경 이력 한정, §역할 본문은 시스템 불변식 평서형.
- [x] (NFR-05) RULE-01 정합 — 본 spec `specs/30.spec/green/foundation/` create only (inspector writer 영역). blue 흡수는 planner 영역 (별 tick promote 후보).
- [x] (NFR-06) RULE-06 정합 — §스코프 규칙 grep-baseline 4 gate (G1~G4) 실측 박제 (HEAD=`3bc98e5`) + `expansion` `허용` (신규 island 수렴 시 본 효능 자동 적용 — scope 확장 허용).
- [x] (NFR-07) spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합).

## 스코프 규칙
- **expansion**: 허용 — TS island 정의 2축 (확장자 0 + typecheck error 0) 신규 충족 디렉터리 (예: 비-island `src/Log/`, `src/Monitor/` 후행 수렴) 진입 시 본 효능 자동 적용. scope 확장 시 §스코프 규칙 grep-baseline G1·G2 재실측 + 신규 island 디렉터리 추가 시 PropTypes 0 hit 효능 의무 surface.
- **grep-baseline** (HEAD=`3bc98e5`, 2026-05-17 — REQ-088 흡수 시점 실측):
  - (G1) **[광역 grep baseline — M-A 측정]** `grep -rn "PropTypes\|prop-types" src/Toaster src/Comment src/File src/Image src/common 2>/dev/null | wc -l` → **48 hit / 13 파일** (HEAD=`3bc98e5` 실측). REQ-062 시점 baseline (46 hit / 11 파일, HEAD=`e01605d`) 와 +2 hit / +2 파일 — 자기 진단 주석 (`src/common/{ErrorFallback,Skeleton}.tsx`) 박제 신규. 파일별 분포: `src/Comment/CommentItem.tsx` 10 / `src/Toaster/Toaster.tsx` 7 / `src/File/FileItem.tsx` 6 / `src/Comment/CommentForm.tsx` 5 / `src/Image/ImageItem.tsx` 4 / `src/common/ErrorBoundary.tsx` 4 / `src/Image/ImageSelector.tsx` 2 / `src/File/FileUpload.tsx` 2 / `src/File/FileDrop.tsx` 2 / `src/File/File.tsx` 2 / `src/Comment/Comment.tsx` 2 / `src/common/Skeleton.tsx` 1 / `src/common/ErrorFallback.tsx` 1. `src/Search/` = 0 hit (island 정의 2축 충족 + PropTypes 0 hit 정합 실증). 비-island baseline (out-of-scope): `grep -rn "PropTypes" src/Log src/Monitor` → 41 hit (REQ-062 §배경 동일 — `src-typescript-migration` 후행 영역).
  - (G2) **[selector 정밀 grep baseline — M-B 측정, 본 spec 회복 대상]** `grep -rnE "import.*from\s+['\"]prop-types['\"]|PropTypes\.|\.propTypes\s*=" src/Toaster src/Comment src/File src/Image src/common 2>/dev/null | wc -l` → **57 hit** (HEAD=`3bc98e5` 실측 MISS — 본 spec 회복 대상 zero-point). M-A (48 hit) 와 비교: selector 정밀 측정은 (a) 단일 라인 다수 selector (예: `propTypes = {a: PropTypes.string, b: PropTypes.number}` 1 라인 2 hit) 분리 카운트, (b) 자기 진단 주석 (`Props (prop-types intentionally omitted, ...)`) 미포함. 차이 (+9 hit) 는 selector dense 라인의 분리 카운트 + 주석 -2 보정. 회복 효능 = 57 → 0 hit (FR-01 효능 회복 목표).
  - (G3) **[FR-07 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/island-proptypes-zero.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 PropTypes 제거 수단 후보 라벨 부여 0). HEAD=`3bc98e5` 박제 시점 PASS.
  - (G4) **[NFR-01 시점 비의존 자기 검증]** `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/foundation/island-proptypes-zero.md | grep -cE "48 hit|57 hit|13 파일|46 hit|11 파일"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 절대 수치 박제 0 — 수치는 §스코프 규칙 grep-baseline 한정). HEAD=`3bc98e5` 박제 시점 PASS.
- **rationale**: (G1) M-A 광역 측정 — 자기 진단 주석 포함 hit count 박제, REQ-062 baseline 과 비교 audit (미수렴 + 주석 신규 박제). (G2) M-B selector 정밀 측정 — 본 spec 회복 대상 zero-point baseline. (G3) RULE-07 수단 중립 자기 검증. (G4) RULE-07 시점 비의존 자기 검증. 매트릭스: 6 island 디렉터리 (Toaster + Comment + File + Image + common + Search) / selector 정밀 hit 57 (5 디렉터리 — Search 제외) / 회복 후 6 디렉터리 전수 0 hit. 회귀 detection 의 zero-point — 본 baseline 박제로 (I1) 게이트 측정 가능.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-088 흡수) / pending (HEAD=`3bc98e5`) | 최초 박제 — TS island PropTypes 0 hit 효능 (island 정의 세 번째 축) 9 축 (I1~I9) 게이트. baseline 매트릭스: 6 island 디렉터리 (`src/Toaster/`, `src/Comment/`, `src/File/`, `src/Image/`, `src/common/`, `src/Search/`) — Search 자기 정합 (0 hit) + 5 디렉터리 회복 대상 (광역 M-A 48 hit / 13 파일 + selector 정밀 M-B 57 hit). REQ-062 시점 baseline (46 hit / 11 파일, HEAD=`e01605d`) 대비 +2 hit / +2 파일 — 자기 진단 주석 (`ErrorFallback.tsx` + `Skeleton.tsx`) 신규 박제. 본 spec 분리 결정 근거: `typecheck-island-extension.md` (REQ-077 blue 승격 done) 흡수 vs 신규 spec carve — 신규 spec carve 결정 근거: (a) blue 영역 직접 편집 inspector writer 영역 외 (blue→green 복사 후 흡수는 spec 본문 양식 일률 변화 + REQ-077 박제 시점 효능과 별 축 — 채널 직교 자매 메타 spec 양식 일관성), (b) island 정의 세 번째 축 (PropTypes 0) 은 typecheck 채널과 직교 (다른 도메인 — 정적 타입 vs 런타임 검증), (c) 자매 메타 spec (REQ-077 typecheck + REQ-087 hook 규칙) 와 동질 패턴 — 각 채널 별 spec 박제 자매 메타 효능 양식 정합. consumed req: `specs/20.req/20260517-island-proptypes-spec-absorption.md` (REQ-088) → `60.done/2026/05/17/req/` mv. **REQ-062 → REQ-088 audit pointer**: REQ-062 `60.done/2026/05/17/req/20260517-island-prop-types-removal.md` 흡수 시점 (inspector mv) 에 island 정의 세 번째 축 (PropTypes 0) 의 spec 박제 부재 — RULE 차원 mv 시점 spec 박제 동반 의무 강제 아님. REQ-088 후속 신호로 본 spec 박제. REQ-062 §수용 기준 5건 marker 미플립은 본 spec 효능 회복 task 발행 + 수행 후 별 inspector tick hook-ack 영역. RULE-07 자기검증 — (I1)~(I9) 모두 평서형·반복 검증 가능 (`grep` extended regex 단일 명령 G1/G2)·시점 비의존 (G4 0 hit — 본 spec 본문에 절대 수치 박제 0)·incident 귀속 부재 (REQ-088 §배경 의 REQ-062 spec 박제 미흡수 audit 는 §변경 이력 / §참고 한정 박제 — 본문 §역할 ~ §의존성 영역 비박제)·수단 중립 (G3 0 hit — PropTypes 제거 수단 후보 라벨 0). RULE-06 §스코프 규칙 4 gate (G1~G4) 실측 박제 + `expansion` `허용` (신규 island 수렴 자동 적용). RULE-01 inspector writer 영역만 (`30.spec/green/foundation/island-proptypes-zero.md` create). spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합). | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-island-proptypes-spec-absorption.md` (REQ-088 — 본 세션 mv).
- **선행 done req (audit pointer — REQ-062 spec 박제 미흡수 회수 트리거)**:
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-20260517-062) — island 정의 3 축 (확장자 + typecheck error 0 + **PropTypes 0**) 박제 요청. spec 박제 미흡수 + 현장 효능 미수렴 → 본 spec 이 후속 박제 (REQ-088 흡수). REQ-062 §수용 기준 5건 marker [ ] 미플립 — done 이동 시점 spec 박제 동반 의무 강제 아님 (RULE 차원 메타 인식).
  - `specs/60.done/2026/05/17/req/20260517-island-regression-guard-lint-block.md` (REQ-20260517-059) — island 정의 + 차단 효능 (확장자 0 hit + typecheck error 0 hit 2축). 본 spec 의 세 번째 축 (PropTypes 0) 추가로 island 정의 3 축 AND 완성.
  - `specs/60.done/2026/05/17/req/20260517-type-safe-island-typecheck-regression-recovery.md` (REQ-20260517-077) — island 정의 후반부 (typecheck error 0) 회복 — `30.spec/blue/foundation/typecheck-island-extension.md` 박제 (blue 승격 done). 본 spec 과 island 정의 3 축 직교.
  - `specs/60.done/2026/05/17/req/20260517-log-island-convergence.md` (REQ-068) — `src/Log/` island 수렴 요청. 본 spec 과 별개 축 (확장자 vs PropTypes), 수렴 후 본 게이트 자동 적용 대상.
  - `specs/60.done/2026/05/17/req/20260517-monitor-island-convergence.md` (REQ-069) — `src/Monitor/` island 수렴. 동일 — 수렴 후 본 게이트 자동 적용.
- **자매 메타 spec (channel 직교, 본 spec 박제 시점 동일 green foundation)**:
  - `30.spec/blue/foundation/typecheck-island-extension.md` (REQ-077 blue 승격) — island 정의 후반부 (typecheck error 0) 채널.
  - `30.spec/green/foundation/eslint-react-hooks-lint-gate.md` (REQ-087) — React hook 규칙 (rules-of-hooks + exhaustive-deps) lint-time 차단 채널.
  - `30.spec/green/foundation/lint-warning-zero-gate.md` (REQ-080) — ESLint warning 0 채널.
  - `30.spec/green/foundation/spec-carve-precondition.md` (REQ-085) — spec carve-precondition 자기 선언 메타 효능 채널.
- **현장 근거 (HEAD=`3bc98e5`, 2026-05-17 실측, 본 spec 박제 시점)**:
  - island 5 디렉터리 PropTypes 광역 (M-A) — `grep -rn "PropTypes\|prop-types" src/Toaster src/Comment src/File src/Image src/common` → **48 hit / 13 파일** (§스코프 규칙 G1 박제).
  - island 5 디렉터리 PropTypes selector 정밀 (M-B) — `grep -rnE "import.*from\s+['\"]prop-types['\"]|PropTypes\.|\.propTypes\s*=" src/Toaster src/Comment src/File src/Image src/common` → **57 hit** (§스코프 규칙 G2 박제, 본 spec 회복 대상).
  - `src/Search/` PropTypes (M-A) — `grep -rn "PropTypes" src/Search` → 0 hit (island + PropTypes 0 정합 실증).
  - 비-island PropTypes — `grep -rn "PropTypes" src/Log src/Monitor` → 41+ hit (out-of-scope baseline, REQ-062 §배경 일치).
  - typecheck 효능 — `npm run typecheck` exit=0 + `grep -cE "error TS"` → 0 hit (island 6 디렉터리 typecheck 축 PASS — `typecheck-island-extension.md` REQ-077 효능 박제).
  - island extension 효능 — `find src/{Toaster,Comment,File,Image,common,Search} \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit (6 디렉터리 island 정의 전반부 PASS).
- **외부 레퍼런스**:
  - React 공식 — React 19 가 `defaultProps` 만 함수형 컴포넌트에서 제거, `propTypes` 자체 동작은 외부 패키지로 유지: `https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-proptypes-and-defaultprops-for-functions`. 본 spec 의 동기는 React 19 deprecation 이 아니라 **island 정의 정합** (REQ-062 후속).
  - prop-types 공식 — `https://github.com/facebook/prop-types`. 런타임 dev-mode 경고 채널. production bundle 에서 selector 코드만 잔존, 검증 로직 no-op.
  - TypeScript 공식 — `interface`/`type` Props 정의가 정적 타입 계약 수단: `https://www.typescriptlang.org/docs/handbook/2/everyday-types.html`.
  - ESLint 공식 — `react/forbid-prop-types` / `react/prop-types` rule: `https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/forbid-prop-types.md`. 수단 후보 1건 (본 spec 비박제 — 수단 중립).
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G4 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`grep` extended regex 단일 명령 G1/G2) · incident 귀속 부재 (REQ-062 spec 박제 미흡수 audit 는 §변경 이력 / §참고 한정). 수단 박제 0 (G3 0 hit 자기 검증).
  - RULE-06: grep-baseline 4 gate (G1~G4) 실측 박제 (HEAD=`3bc98e5`) + `expansion` `허용`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/island-proptypes-zero.md` create).
  - spec-carve-precondition (REQ-085): §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 정합.
