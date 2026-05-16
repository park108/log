# Island PropTypes removal — TS island 확정 디렉터리 PropTypes 0 hit 상시 불변식

> **위치**: `src/Comment/`, `src/File/`, `src/Image/`, `src/Toaster/`, `src/common/` (현 island 확정 5 디렉터리) — `import PropTypes`, `from 'prop-types'`, `<Component>.propTypes = {...}` selector, `PropTypes.<kind>` 사용 잔존 여부.
> **관련 요구사항**: REQ-20260517-062
> **최종 업데이트**: 2026-05-17 (by inspector, REQ-062 흡수 — island 정의의 세 번째 축 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-062 발행 시점 HEAD=`e01605d`, 본 spec 박제 시점 HEAD=`80e2b4c`).

## 역할
TS island 확정 디렉터리 (`src-typescript-migration` FR-05 + `typecheck-exit-zero` FR-03 정합 — `.jsx`/`.js` 부재 AND typecheck error 0 hit) 내부에서 **런타임 PropTypes 검증 selector** (`import PropTypes`, `from 'prop-types'`, `<Component>.propTypes = {...}`, `PropTypes.<kind>`) 가 **0 hit** 이어야 한다. TS `interface XxxProps` / `type XxxProps = ...` 정적 계약과 동일 prop 의 PropTypes 런타임 selector 가 공존하면 정의 drift 위험·이중 검증·island 정의의 "TS 정적 검증 단일화" 의도 불일치가 발생한다. 본 spec 은 이 상태를 **반복 검증 가능한 상시 불변식** 으로 박제한다. 의도적으로 하지 않는 것: 비-island 디렉터리 (`src/Log/`, `src/Monitor/`) 의 PropTypes 잔존 박제 (해당 축 = `src-typescript-migration` FR-01/FR-02), `package.json` `prop-types` deps 제거 자체 (모든 island 0 hit + 비-island island 수렴 완료 후 가능), PropTypes 제거 수단 라벨링 (단순 삭제 vs codemod vs ESLint rule — RULE-07 수단 중립), React 19 bump 자체 (별 spec 분기), 런타임 검증 대체 도입 (예: `zod` schema — 본 spec 외부).

## 공개 인터페이스
- 소비 파일 (island 확정 디렉터리 — 박제 시점 5개, 정의 확장 시 자동 포함):
  - `src/Comment/**` — `Comment.tsx`, `CommentItem.tsx`, `CommentForm.tsx` 등.
  - `src/File/**` — `File.tsx`, `FileItem.tsx`, `FileDrop.tsx`, `FileUpload.tsx` 등.
  - `src/Image/**` — `ImageItem.tsx`, `ImageSelector.tsx` 등.
  - `src/Toaster/**` — `Toaster.tsx` 등.
  - `src/common/**` — `ErrorBoundary.tsx` 등.
- 검출 명령 (반복 가능, 단일 grep 단위 — NFR-02 정합):
  - `grep -rnE "PropTypes|prop-types" <island-dirs>` — selector / import / 식별자 통합 검출.
  - `grep -rnE "^import\s+PropTypes|from\s+['\"]prop-types['\"]" <island-dirs>` — import 한정.
  - `grep -rnE "\.propTypes\s*=" <island-dirs>` — selector 등록 한정.

## 동작

### 1. island 확정 디렉터리 PropTypes 0 hit 불변식 (REQ-062 FR-02)
island 확정 디렉터리 내부의 어떤 소스 파일도 `prop-types` 패키지를 import 하지 않으며 `<Component>.propTypes = {...}` selector 를 등록하지 않는다. 본 불변식의 결과:

- (1.1) `grep -rnE "PropTypes|prop-types" src/Comment src/File src/Image src/Toaster src/common` → 0 hit (정의된 island 디렉터리 목록 갱신 시 동일 명령 패턴 적용).
- (1.2) `grep -rnE "^import\s+PropTypes|from\s+['\"]prop-types['\"]" <island-dirs>` → 0 hit (import 잔존 부재).
- (1.3) `grep -rnE "\.propTypes\s*=" <island-dirs>` → 0 hit (selector 등록 잔존 부재).

### 2. 이중 검증 모순 부재 불변식 (REQ-062 FR-03)
TS `interface XxxProps` / `type XxxProps = ...` 로 정의된 props 와 동일 prop 의 PropTypes selector 가 **동일 파일** 또는 **동일 컴포넌트** 단위로 공존하지 않는다. § 동작 1 의 PropTypes 0 hit 이 성립하면 본 불변식은 자동 충족된다. 본 불변식의 결과:

- (2.1) island 디렉터리 내부에서 `interface\s+\w+Props` / `type\s+\w+Props\s*=` 패턴이 존재하는 파일과 `\.propTypes\s*=` 패턴이 존재하는 파일의 **교집합** 이 공집합.
- (2.2) TS 정적 계약 (`interface XxxProps` / `type XxxProps`) 은 island 의 정상 박제 수단으로 유지된다 — 본 불변식은 TS 계약 제거가 아니라 PropTypes 런타임 selector 제거를 박제.

### 3. island 정의 정합 — 세 번째 축 불변식 (REQ-062 FR-01, FR-04)
island 확정 디렉터리 정의는 세 축의 AND 로 구성된다 — `src-typescript-migration` FR-05 (확장자 `.jsx`/`.js` 부재) + `typecheck-exit-zero` FR-03 (typecheck error 0 hit) + 본 spec § 동작 1 (PropTypes 0 hit). 세 축은 직교하며 어느 한 축의 성립이 다른 축을 자동 충족시키지 않는다. 본 불변식의 결과:

- (3.1) 신규 island 확정 디렉터리 (예: `src/Log/`, `src/Monitor/` 후행 수렴 시점) 가 확장자 + typecheck 두 축으로 island 박제되는 시점에 본 PropTypes 0 hit 게이트가 **수동 디렉터리 목록 갱신 없이** 적용된다 — 게이트 측정 명령은 island 디렉터리 목록을 하드코딩하지 않고 island 정의 패턴 (확장자 + typecheck 0 hit 통과 디렉터리 목록) 과 정합한 형태로 박제 가능.
- (3.2) 세 축 중 한 축이라도 위반된 디렉터리는 island 확정 상태가 아니다 — 본 spec § 동작 1 위반 단독으로도 island 정의 위반 (`.jsx` 부재 + typecheck 0 hit 만 충족해도 island 확정 아님).
- (3.3) 본 spec 의 효능 게이트는 island 정의 확장 (디렉터리 추가) 에 대해 패턴 기반 적용을 유지하며, 디렉터리 목록 갱신은 island 정의 spec 군 (`src-typescript-migration` FR-05) 의 단일 책임으로 박제된다.

### 4. false-positive 부재 불변식 (REQ-062 FR-05)
비-island 디렉터리 (`src/Log/`, `src/Monitor/`) 의 PropTypes 잔존은 본 spec 의 effort 게이트에서 검출되지 않는다. 비-island 의 PropTypes 잔존은 `src-typescript-migration` FR-01/FR-02 의 island 수렴 축에서 부수적으로 해소되며, 본 spec 의 직접 검증 대상 아니다. 본 불변식의 결과:

- (4.1) 본 spec § 동작 1 게이트를 비-island 디렉터리에 적용하면 비-0 hit 이 검출될 수 있다 — 그것은 island 게이트의 fail 신호가 아니라 비-island 의 island 수렴 미완료 신호.
- (4.2) 본 spec 의 게이트는 island 확정 디렉터리 목록 (현 5개, 정의 확장 시 자동 갱신) 한정으로 0 hit 을 박제하며, 비-island 디렉터리는 명시적으로 효능 범위 외부.

### 5. bundle 영향 평서 불변식 (REQ-062 FR-06)
본 spec § 동작 1 의 island 내부 PropTypes 0 hit 도달이 **즉시 production bundle 의 `prop-types` 코드 제거** 를 의미하지 않는다. `package.json:10` `"prop-types": "^15.8.1"` runtime dependency 는 비-island 디렉터리 (`src/Log/`, `src/Monitor/`) 가 import 하는 동안 production bundle 에 포함된다. bundle 사이즈 감소는 다음 세 조건의 **동시 성립** 시점에 측정 가능:

- (5.1) 모든 island 확정 디렉터리 PropTypes 0 hit (본 spec § 동작 1).
- (5.2) 비-island 디렉터리의 island 수렴 완료 (`src-typescript-migration` FR-01/FR-02).
- (5.3) `package.json` `dependencies` 에서 `prop-types` 제거 (별 spec / task 위임).

본 spec 은 (5.1) 만 박제하며 (5.2)(5.3) 은 직교 spec / 후행 task 책임으로 위임한다.

### 6. 수단 중립 불변식 (REQ-062 FR-07, RULE-07 정합)
본 spec § 동작 1 의 PropTypes 0 hit 도달 **수단** (단순 import/selector 삭제 vs codemod vs ESLint rule 도입 vs lint-staged 통합 등) 에 "기본값" / "권장" / "우선" / "default" / "best practice" 라벨이 박제되지 않는다. 본 spec 은 **결과 효능** 만 박제하며, 수단 선정은 task 계층 (planner / developer) 결정.

- (6.1) `grep -rnE "기본값|권장|우선|default|best" specs/30.spec/green/foundation/island-proptypes-removal.md` → 0 hit (본 spec 본문 자기 검증).
- (6.2) 수단 라벨이 박제된 spec 은 RULE-07 위반으로 inspector 가 차기 세션에서 `50.blocked/spec/` 격리 + reason 박제.

### 회귀 중점
- `src/Comment/CommentItem.tsx:134` `CommentItem.propTypes = {...}` 등 island 디렉터리 내 selector 등록 1+ 라인 잔존 → § 동작 1.3 위반 baseline → § 동작 1.1 자연 비-0 hit.
- island 디렉터리 내 `import PropTypes from 'prop-types'` 1+ 파일 잔존 → § 동작 1.2 위반 → § 동작 1.1 자연 비-0 hit.
- TS `interface XxxProps` 와 동일 컴포넌트 `<X>.propTypes = {...}` 공존 → § 동작 2.1 위반 (정의 drift 위험).
- island 정의 확장 시점에 신규 디렉터리에 PropTypes 잔존이 있는데 § 동작 1 게이트가 디렉터리 목록 하드코딩으로 자동 적용되지 않음 → § 동작 3.1 위반.
- 본 spec 본문에 PropTypes 제거 수단 라벨 박제 → § 동작 6.1 위반.

## 의존성
- 외부: `prop-types@^15.8.1` (runtime dep — § 동작 5 평서 박제 대상), `react`, TypeScript 정적 타입 시스템.
- 내부: `src/Comment/**`, `src/File/**`, `src/Image/**`, `src/Toaster/**`, `src/common/**` (island 확정 5 디렉터리), `package.json` `dependencies.prop-types`.
- 역의존:
  - `src-typescript-migration` (`50.blocked/spec/foundation/`) FR-05 — island 확정 정의 (확장자 축). 본 spec 은 세 번째 축 (PropTypes 0 hit) 박제 — 정의 spec 군은 직교.
  - `typecheck-exit-zero` (`50.blocked/spec/foundation/`) FR-03 — island 확정 정의 (typecheck error 0 hit 축). 본 spec 과 직교.
  - `island-regression-guard` (`50.blocked/spec/foundation/`) — `.jsx`/`.js` 재도입 차단 게이트. 본 spec 과 직교 (확장자 vs PropTypes selector 축).
  - `toolchain-version-coherence` (`50.blocked/spec/foundation/`) — typescript 환경 정합. 본 spec § 동작 1 의 grep 게이트는 typescript 환경 회귀와 무관하게 측정 가능 — typescript 환경 해소 전에도 본 spec § 동작 1 baseline 측정·박제 가능.
  - `specs/30.spec/blue/components/{file,common,monitor,image,toaster,comment,log,app}.md` "외부: `prop-types`" 박제 — 컴포넌트 의존성 관찰만, 본 spec 효능 도입 후 island 디렉터리 컴포넌트 spec 의 "외부: `prop-types`" 라인 갱신은 별 task 책임.
  - `specs/30.spec/blue/common/test-idioms.md:53,61` — PropTypes validation 도 포함하는 React 런타임 `console.error/warn` 채널 비파괴 보장. 본 spec 효능 도입 후 island 디렉터리에서는 PropTypes validation 채널이 사라지나 다른 React 런타임 경고 채널은 유효 — test-idioms 박제와 직교.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 task 발행이 아니라 불변식 박제 — grep 게이트는 baseline 실측 박제 목적. 효능 도입 task 발행 시점에 task 의 §스코프 규칙 expansion 결정).
- **grep-baseline** (REQ-062 발행 시점 HEAD=`e01605d` + 본 spec 박제 시점 HEAD=`80e2b4c` 실측 — 두 HEAD 사이 src 변경 0):
  - (a) `grep -rn "PropTypes" src/Comment src/File src/Image src/Toaster src/common` → **46 hits in 11 files**:
    - `src/Comment/CommentItem.tsx` (interface line 20 + propTypes line 134 등 multiple)
    - `src/Comment/CommentForm.tsx`
    - `src/Comment/Comment.tsx`
    - `src/File/FileItem.tsx`
    - `src/File/File.tsx`
    - `src/File/FileDrop.tsx`
    - `src/File/FileUpload.tsx`
    - `src/Image/ImageSelector.tsx`
    - `src/Image/ImageItem.tsx`
    - `src/Toaster/Toaster.tsx` (interface line 10 + propTypes line 87)
    - `src/common/ErrorBoundary.tsx`
  - (b) `grep -rnE "^import\s+PropTypes|from\s+['\"]prop-types['\"]" src/Comment src/File src/Image src/Toaster src/common` → **11 hits in 11 files** (각 파일 1 import).
  - (c) `grep -rnE "\.propTypes\s*=" src/Comment src/File src/Image src/Toaster src/common` → 11 files (selector 등록).
  - (d) `grep -rnE "interface\s+\w+Props" src/Comment src/File src/Image src/Toaster src/common` → 15 hits (TS interface 정적 계약 박제 — § 동작 2 이중 검증 모순 baseline 분모).
  - (e) `grep -rn "PropTypes" src/Log src/Monitor` → **41 hits in 12 files** (비-island, § 동작 4 false-positive 부재 baseline — 본 게이트 적용 범위 외부).
  - (f) `grep -nE "\"prop-types\"" package.json` → 1 hit (`package.json:10` `"prop-types": "^15.8.1"`). § 동작 5 bundle 영향 baseline — runtime dep 분류 박제.
- **rationale**: gate (a)(b)(c) 는 § 동작 1 위반 baseline (도입 전 46/11/11 → 도입 후 0/0/0 으로 수렴 목표). gate (d) 는 § 동작 2 이중 검증 모순의 분모 (TS 계약 측 — 본 spec 효능 도입 후에도 유지). gate (e) 는 § 동작 4 false-positive 부재 baseline — island 게이트 적용 범위 외부 검증. gate (f) 는 § 동작 5 bundle 영향 평서의 분기 조건 (runtime dep 분류). 모든 baseline 은 시점 의존 수치 (46/11/11/15/41) 가 아닌 **0 hit 도달 효능 자체** 가 본 spec 의 박제 대상이며, baseline 수치는 위반 상태 식별 보조 — NFR-01 시점 비의존 정합.

## 테스트 현황
- [ ] § 동작 1.1 `grep -rnE "PropTypes|prop-types" <island-dirs>` → 0 hit.
- [ ] § 동작 1.2 `grep -rnE "^import\s+PropTypes|from\s+['\"]prop-types['\"]" <island-dirs>` → 0 hit.
- [ ] § 동작 1.3 `grep -rnE "\.propTypes\s*=" <island-dirs>` → 0 hit.
- [ ] § 동작 2.1 `interface\s+\w+Props` / `type\s+\w+Props\s*=` 존재 파일과 `\.propTypes\s*=` 존재 파일 교집합 = 공집합.
- [ ] § 동작 2.2 TS `interface XxxProps` / `type XxxProps` 정적 계약 박제 유지 (제거 대상 아님).
- [ ] § 동작 3.1 island 정의 확장 시점에 § 동작 1 게이트가 디렉터리 목록 패턴 기반 자동 적용.
- [ ] § 동작 3.2 세 축 (확장자 + typecheck 0 + PropTypes 0) 중 한 축 위반 디렉터리는 island 확정 상태 아님.
- [ ] § 동작 3.3 island 디렉터리 목록 갱신은 island 정의 spec 군 (`src-typescript-migration` FR-05) 단일 책임.
- [ ] § 동작 4.1 본 spec § 동작 1 게이트의 비-island 적용 시 비-0 hit 은 island guard fail 신호 아님.
- [ ] § 동작 4.2 본 게이트의 효능 범위 = island 확정 디렉터리 한정.
- [ ] § 동작 5.1 모든 island 확정 디렉터리 PropTypes 0 hit 도달.
- [ ] § 동작 5.2 비-island 디렉터리의 island 수렴 완료 (직교 spec 책임).
- [ ] § 동작 5.3 `package.json` `dependencies` 에서 `prop-types` 제거 (별 spec / task 위임).
- [ ] § 동작 6.1 `grep -rnE "기본값|권장|우선|default|best" specs/30.spec/green/foundation/island-proptypes-removal.md` → 0 hit (본 spec 본문 자기 검증).

## 수용 기준
- [ ] (Must, FR-02) island 확정 5 디렉터리 (`src/Comment/`, `src/File/`, `src/Image/`, `src/Toaster/`, `src/common/`) 내부 PropTypes / prop-types 0 hit — `grep -rnE "PropTypes|prop-types" <island-dirs>` → 0.
- [ ] (Must, FR-01) island 정의 세 축 (확장자 `.jsx`/`.js` 부재 + typecheck error 0 hit + PropTypes 0 hit) AND 박제 — 본 spec § 동작 3 박제로 정합.
- [ ] (Must, FR-07) 본 spec 본문에 PropTypes 제거 수단 라벨 ("기본값" / "권장" / "우선" / "default" / "best") 0 hit — § 동작 6.1 자기 검증.
- [ ] (Should, FR-03) island 디렉터리 내 `interface XxxProps` / `type XxxProps` 존재 파일과 `\.propTypes\s*=` 존재 파일 교집합 = 공집합 — § 동작 2.1.
- [ ] (Should, FR-04) island 정의 확장 시 본 게이트가 디렉터리 목록 하드코딩 없이 패턴 기반 자동 적용 — § 동작 3.1.
- [ ] (Should, FR-05) 비-island 디렉터리 (`src/Log/`, `src/Monitor/`) PropTypes 잔존은 본 게이트 fail 신호 아님 — § 동작 4.
- [ ] (Could, FR-06) bundle 영향 평서 — § 동작 5.1+5.2+5.3 세 조건 동시 성립 시점에 measurable; 본 spec 은 (5.1) 만 박제.
- [ ] (NFR-01) 본 spec 본문에 PropTypes 잔존 파일 목록 / hit 수치 (46/11) 가 효능 박제 평서문에 하드코딩되지 않음 — baseline 수치는 §스코프 규칙 grep-baseline 에만 박제 (위반 상태 식별 보조).
- [ ] (NFR-02) 본 효능 박제는 단일 grep 명령 (§ 동작 1.1) 으로 rc / hit count 0 측정 가능.
- [ ] (NFR-03) 본 spec § 동작 1 게이트는 island 정의의 다른 두 축 (확장자 / typecheck) 게이트와 직교 — 어느 한 축의 성립이 다른 축을 자동 충족시키지 않음.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-062 흡수). island 확정 디렉터리 PropTypes 0 hit 상시 불변식 박제 (§ 동작 1~6). island 정의 세 번째 축 (확장자 + typecheck error 0 hit + PropTypes 0 hit) 박제로 `src-typescript-migration` FR-05 / `typecheck-exit-zero` FR-03 와 직교 정합. baseline 실측 @HEAD=`80e2b4c` (REQ-062 발행 HEAD=`e01605d` 와 src 영향 0): (a) island 5 dir PropTypes 46 hit / 11 files / (b) PropTypes import 11 / 11 files / (c) propTypes selector 등록 11 files / (d) `interface XxxProps` 15 hit (이중 검증 모순 baseline 분모) / (e) 비-island Log/Monitor PropTypes 41 hit / 12 files (false-positive 부재 baseline — 본 게이트 적용 범위 외부) / (f) `package.json:10` `"prop-types": "^15.8.1"` runtime dep (bundle 영향 baseline). 수단 중립 정책 (§ 동작 6.1 자기 검증 — "기본값/권장/우선/default/best" 라벨 0 hit). consumed req: `specs/20.req/20260517-island-prop-types-removal.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `src-typescript-migration` (blocked, FR-05 확장자 축 직교), `typecheck-exit-zero` (blocked, FR-03 typecheck 축 직교), `island-regression-guard` (blocked, 확장자 재도입 차단 직교), `toolchain-version-coherence` (blocked, build 환경 직교 — typescript 환경 회복 전후 무관하게 본 게이트 측정 가능), blue/components/* "외부: `prop-types`" 박제 (별 task 갱신 책임), blue/common/test-idioms.md PropTypes validation 채널 직교. RULE-07 자기검증 — § 동작 1~6 모두 평서형·반복 검증 가능 (grep count + island 정의 패턴)·시점 비의존 (baseline 수치는 §스코프 규칙에만 박제, 효능 평서문은 0 hit 도달 자체)·incident patch 아님 (island 정의 정합은 spec 군의 상시 성질). RULE-06 §스코프 규칙 gate (a)~(f) 6건 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/island-proptypes-removal.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. | 전 섹션 (신규) |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062 — 본 세션 mv).
- **관련 spec (역의존 — 모두 직교 축)**:
  - `specs/50.blocked/spec/foundation/src-typescript-migration.md` (FR-05 island 확정 정의 — 확장자 축. 본 spec 은 세 번째 축 박제).
  - `specs/50.blocked/spec/foundation/typecheck-exit-zero.md` (FR-03 island 확정 정의 — typecheck error 0 hit 축).
  - `specs/50.blocked/spec/foundation/island-regression-guard.md` (`.jsx`/`.js` 재도입 PR 차단 — 본 spec 과 확장자 vs selector 축 직교).
  - `specs/50.blocked/spec/foundation/toolchain-version-coherence.md` (devDep/installed/tsconfig 정합 — build 환경 축 직교, 본 게이트는 환경 회복 전에도 측정 가능).
  - `specs/30.spec/blue/components/{comment,file,image,toaster,common,log,monitor,app}.md` ("외부: `prop-types`" 박제 — 컴포넌트 의존성 관찰. 본 spec 효능 도입 후 island 5 디렉터리 spec 의 해당 라인 갱신은 별 task 책임).
  - `specs/30.spec/blue/common/test-idioms.md:53,61` (React 런타임 `console.error/warn` 채널 비파괴 — PropTypes validation 채널 일부가 island 에서 사라져도 다른 React 런타임 경고 채널은 유효, test-idioms 박제와 직교).
- **선행 done req**:
  - `specs/60.done/2026/05/17/req/20260517-toolchain-version-coherence.md` (REQ-061 — build 환경 정합 축).
- **외부 레퍼런스**:
  - React 공식 — React 19 `defaultProps` 만 함수형 컴포넌트에서 제거, `propTypes` 자체 동작은 외부 패키지로 유지: `https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-proptypes-and-defaultprops-for-functions`. 본 spec 의 동기는 React 19 deprecation 이 아니라 **island 정의 정합** (TS 정적 검증 단일화).
  - TypeScript 공식 — `interface`/`type` props 정의 + 시그니처를 통한 정적 타입 계약 박제 수단: `https://www.typescriptlang.org/docs/handbook/2/everyday-types.html`.
  - prop-types 공식 — 런타임 dev-mode 경고 채널 + production no-op + import 자체 잔존의 tree-shaking 한계: `https://github.com/facebook/prop-types`.
- **현장 근거 (HEAD=`e01605d` REQ 발행 + `80e2b4c` spec 박제, src 영향 0)**:
  - 이중 검증 실증 — `src/Toaster/Toaster.tsx:10` `interface ToasterProps`, `src/Toaster/Toaster.tsx:87` `Toaster.propTypes = {...}`.
  - 이중 검증 실증 — `src/Comment/CommentItem.tsx:20` `interface CommentItemProps`, `src/Comment/CommentItem.tsx:134` `CommentItem.propTypes = {...}`.
- **RULE 준수**:
  - RULE-07: 6개 불변식 (§ 동작 1~6) 모두 시점 비의존·평서형·반복 검증 가능 (grep count + island 정의 패턴). 수단 라벨 박제 0 (§ 동작 6.1 자기 검증).
  - RULE-06: §스코프 규칙 grep-baseline 6개 gate (a)~(f) 실측 박제 @HEAD=`80e2b4c`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/island-proptypes-removal.md` 신규 create + req mv `20.req/* → 60.done/req/`).
