# Path alias resolver 정합 — `vite.config.js` `resolve.alias` ↔ `tsconfig.json` `compilerOptions.paths` 키/타깃 동치 상시 불변식

> **위치**: `vite.config.js` `resolve.alias` 블록 (dev server / production build / Vitest 가 흡수), `tsconfig.json` `compilerOptions.paths` 블록 (typescript-eslint parser + `tsc --noEmit` + IDE LSP).
> **관련 요구사항**: REQ-20260517-065
> **최종 업데이트**: 2026-05-17 (by inspector, REQ-065 흡수 — alias resolver 양 채널 키/타깃 동치 메타 패턴 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (REQ-065 발행 시점 HEAD=`772f6c8`, 본 spec 박제 시점 HEAD=`389afee`).

## 역할
모듈 resolver 가 두 갈래 — (a) `vite.config.js` `resolve.alias` (dev server + production build + Vitest 가 top-level vite config 의 `resolve.alias` 를 그대로 흡수) 와 (b) `tsconfig.json` `compilerOptions.paths` (typescript-eslint parser + `tsc --noEmit` typecheck + IDE LSP) — 로 구성된 환경에서, 양쪽이 박제하는 **prefix 키 집합** 과 **대응 타깃 디렉터리** 가 격차 0 으로 동시 성립함을 **반복 검증 가능한 상시 불변식** 으로 박제. 본 정합이 깨지면 (1) `npm run build` 와 `npm run typecheck` 가 서로 다른 모듈 그래프를 보고, (2) `vi.mock('@/common/env', factory)` 같은 alias-기반 mock 토큰이 vitest 에서는 hit 되지만 `tsc` 에서는 unresolved 진단되며, (3) macOS (case-insensitive 기본) 로컬과 Linux CI (case-sensitive) 사이 한쪽만 fail 하는 양 모순이 발생한다. 의도적으로 하지 않는 것: 특정 alias 의 추가/삭제 자체 (RULE-07 수단 중립), alias prefix 컨벤션 (`@/` vs `~/` 등) 결정, alias 소비 디렉터리 확장 정책 (예: `@/Comment/*` 추가 여부), `eslint-plugin-import` resolver / `jsconfig.json` 도입 등 alias resolver 의 추가 채널 확장, 상대경로 import 금지 등 alias 소비 패턴 검증, Vitest `vite.config.js` `test` block 내부 별도 resolve 우회 도입 자체.

## 공개 인터페이스
- 소비 파일:
  - `vite.config.js` `resolve.alias` 블록 — dev server / production build / Vitest 흡수 채널.
  - `tsconfig.json` `compilerOptions.paths` 블록 — typescript-eslint parser / `tsc --noEmit` / IDE LSP 채널.
  - `src/**/*.{ts,tsx,d.ts}` — alias 소비 표면 (선언 정합과 직교 — § 동작 6 명시).
- 검출 명령 (반복 가능, 단일 진단 단위 — NFR-02 정합):
  - `node -e "const v=require('./vite.config.js'); const t=require('./tsconfig.json'); ..."` — 양쪽 키/타깃 추출.
  - `grep -nE "'@/[a-zA-Z]+'\\s*:" vite.config.js` — vite alias 키 추출 1-line.
  - `grep -nE "\"@/[a-zA-Z]+/\\*\":" tsconfig.json` — tsconfig paths 키 추출 1-line.
  - `node -p "Object.keys(require('./tsconfig.json').compilerOptions.paths).map(k => k.replace('/*','')).sort().join(',')"` — tsconfig 키 정규화 1-line.

## 동작

### 1. 양 채널 키 집합 동치 불변식 (REQ-065 FR-01)
`vite.config.js` `resolve.alias` 의 키 집합 (예: `'@/common'`, `'@/types'`, `'@/log'`) 과 `tsconfig.json` `compilerOptions.paths` 의 키 집합 (와일드카드 suffix `/*` 정규화 후, 예: `'@/common/*'` → `'@/common'`) 이 격차 0 동치이다 — 양쪽 대칭차 = 0. 본 불변식의 결과:

- (1.1) vite alias 키 N 개 ↔ tsconfig paths 키 N 개 (와일드카드 정규화 후 동일 수치).
- (1.2) 한쪽 단독 키 0 — vite 만 있는 alias 0, tsconfig 만 있는 paths 0.
- (1.3) 한쪽에만 신규 alias 가 추가된 PR/커밋은 본 불변식 위반 신호로 검출 가능.
- (1.4) 와일드카드 suffix `/*` 는 tsconfig paths 의 표기 관행 — vite alias 의 비-와일드카드 표기와 의미적으로 동치 (양쪽 모두 zero-or-more path segment 의 동일 매핑).

### 2. 대응 prefix 타깃 디렉터리 동치 불변식 (REQ-065 FR-02)
양쪽 동일 prefix 의 타깃 디렉터리가 절대경로 정규화 후 동치이다. tsconfig paths 의 `"@/foo/*": ["./src/Foo/*"]` 와 vite alias 의 `'@/foo': path.resolve(__dirname, 'src/Foo')` 는 의미적으로 동치 — 양쪽 모두 `<repo-root>/src/Foo/<rest>` 로 resolve. 본 불변식의 결과:

- (2.1) `path.resolve(__dirname, 'src/<dir>')` 출력 = `path.resolve(__dirname, './src/<dir>/*')` 의 prefix (와일드카드 제외) 출력.
- (2.2) 한쪽 타깃이 `src/Log/` 이고 다른 쪽이 `src/log/` 이면 본 불변식 위반 (case 축은 § 동작 3 분기).
- (2.3) tsconfig paths 의 `*` 와일드카드 suffix 와 vite alias 의 비-와일드카드 표기 동치 매핑 — `@/foo` 단독 import 는 vite 에서 디렉터리 resolve 되어 `index` 진입점을 찾고, tsconfig 의 `@/foo/*` 는 `*` 뒤가 비어 unresolved 가 될 위험. 본 spec 은 양쪽 표기 차이가 의미적 동치임을 박제하며, 실제 소비 표면에서 `@/foo` 단독 import 가 두 채널 모두에서 resolve 가능하려면 (a) 디렉터리 내 `index.{ts,tsx}` 존재 + tsconfig paths 에 `"@/foo": ["./src/foo/index"]` 별도 박제, 또는 (b) 모든 import 가 subpath 형태 (`@/foo/bar`) 사용 — 두 분기 중 어느 쪽으로 수렴해도 본 불변식의 동치 자체는 유지.

### 3. 타깃 디렉터리 case 정합 불변식 (REQ-065 FR-03)
alias 타깃 디렉터리 표기의 대소문자가 양 채널에서 일치한다 — `src/Log` 이면 양쪽 모두 `src/Log` (첫 글자 대문자 유지). Linux CI 의 case-sensitive 파일시스템과 macOS 의 case-insensitive 기본 사이 한쪽만 잘못된 case 인 경우 검출 가능. 본 불변식의 결과:

- (3.1) `path.resolve(__dirname, 'src/Log')` 와 `tsconfig.json` `paths` 의 `./src/Log/*` 가 문자열 비교 시 case 동일 (`L` 대문자 유지).
- (3.2) macOS 로컬에서는 case mismatch 가 false-negative (resolve 성공) 이지만 Linux CI 에서 fail 검출 — 본 spec 은 양쪽 case 비교를 정적 검증으로 박제하여 CI 도달 전 식별 가능.
- (3.3) 본 불변식은 § 동작 2 (타깃 동치) 의 부속 — 절대경로 정규화 후 비교 시 case 차이도 검출되지만, case 단독 식별 가능성을 별 게이트로 박제.

### 4. 위반 검출 단일성 불변식 (REQ-065 FR-04)
본 spec § 동작 1·2·3 위반은 두 파일 (`vite.config.js`, `tsconfig.json`) 의 단일 grep / 단일 `node -p` 출력으로 위반 카테고리 (키 누락 / 타깃 mismatch / case mismatch) 가 식별 가능하다. 외부 도구 의존 최소 — `node`, POSIX `grep`, 표준 `path` 모듈만 사용. 본 불변식의 결과:

- (4.1) `grep -nE "'@/[a-zA-Z]+'\\s*:" vite.config.js` 1-line 출력 — vite alias 키 추출.
- (4.2) `grep -nE "\"@/[a-zA-Z]+/\\*\":" tsconfig.json` 1-line 출력 — tsconfig paths 키 추출.
- (4.3) `node -p "JSON.stringify(Object.entries(require('./tsconfig.json').compilerOptions.paths))"` 1-line — tsconfig 키/타깃 쌍 추출.
- (4.4) 위반 시 두 출력의 set difference 가 위반 카테고리 식별 — 키 누락 (대칭차 ≠ 0) / 타깃 mismatch (양쪽 키는 동일하나 타깃 디렉터리 다름) / case mismatch (타깃 디렉터리 case 차이) 가 단일 단계로 분류.

### 5. 양 채널 동시 편집 게이트 불변식 (REQ-065 FR-05)
신규 alias 도입 / 기존 alias 삭제 / 타깃 디렉터리 변경은 양 파일 (`vite.config.js` + `tsconfig.json`) 의 동시 편집을 강제한다. 한쪽만 변경된 상태는 본 spec § 동작 1·2·3 위반으로 검출 — 게이트 단계에서 fail 신호. 본 불변식의 결과:

- (5.1) `vite.config.js` 에만 신규 alias 추가 → § 동작 1 위반 (한쪽 단독 키 1) → typecheck/IDE 가 unresolved 진단.
- (5.2) `tsconfig.json` 에만 신규 paths 추가 → § 동작 1 위반 (한쪽 단독 키 1) → 빌드/vitest 가 unresolved 진단.
- (5.3) `vite.config.js` 만 타깃 디렉터리 변경 → § 동작 2 위반 (양쪽 타깃 mismatch).
- (5.4) 본 게이트는 spec 차원 검증 — CI / pre-commit / pre-push 등 자동화 채널 도입은 후행 task 책임 (수단 중립).

### 6. 선언 정합 vs 소비 정합 직교 불변식 (REQ-065 FR-06)
본 spec 은 **선언 정합** (양 채널의 키/타깃 동치) 만 박제하며, **소비 정합** (실제 `import` 잔존 수) 과 직교한다. 소비 0 인 alias 도 양쪽 박제만 동치이면 본 게이트 통과. 본 불변식의 결과:

- (6.1) alias `@/common` 의 import 소비가 0 hit 이어도 양 채널 박제 동치이면 본 spec § 동작 1·2·3 통과.
- (6.2) alias `@/log` 의 import 소비가 0 hit 이어도 양 채널 박제 동치이면 통과 — 미래 import 추가 시점에 drift 위험이 가장 큰 표면이지만 본 spec 은 그 시점 이전 박제 단계에서 정합 보장.
- (6.3) alias 소비 패턴 검증 (상대경로 vs alias 우선 / alias 강제 등) 은 별 spec 위임 — 본 spec 외부.

### 7. ESLint resolver 정합 불변식 (REQ-065 FR-07)
`eslint.config.js` 가 본 spec § 동작 1 의 양 alias 집합과 별도의 모듈 resolver 설정을 갖지 않거나, 갖더라도 본 spec 의 양 alias 집합과 정합한 상태이다. 본 불변식의 결과:

- (7.1) 현 시점 `eslint.config.js` 에 resolver alias 설정 부재 — 본 FR 는 미래 도입 시점 게이트로 박제.
- (7.2) `eslint-plugin-import` resolver / `eslint-import-resolver-typescript` 도입 시 그 설정의 alias 집합도 양 채널과 정합.
- (7.3) 본 불변식은 직교 채널 — 도입 부재 시 자연 통과.

### 8. 수단 중립 불변식 (RULE-07 정합)
본 spec § 동작 1~7 의 효능 도달 **수단** (alias 추가/삭제/이름 변경 / pre-commit 자동화 도입 / CI 게이트 도입 / lint rule 도입 등) 에 "기본값" / "권장" / "우선" / "default" / "best practice" / "root cause" / "가장 효과적" 라벨이 박제되지 않는다. 본 spec 은 **결과 효능** 만 박제하며, 수단 선정은 task 계층 (planner / developer) 결정.

- (8.1) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/path-alias-resolver-coherence.md` 의 매치는 다음 카테고리에 한정된다 — (i) 본 § 동작 8 의 정의 본문 (수단 라벨 셋 박제), (ii) 자기 검증 게이트 본문 (수용 기준 / 테스트 현황 / 회귀 중점 / 변경 이력 정책 명시), (iii) 외부 라이브러리 API 동작 인용 (예: tsconfig paths 와일드카드 default 동작, vite resolve.alias default 동작), (iv) 템플릿 메타 텍스트 ("식별자 우선"). 본 카테고리 외 매치 (예: § 동작 본문 효능 평서문이 "권장 alias 도입 수단" / "best practice resolver" 등으로 수단을 라벨링) 는 § 동작 8.1 위반으로 inspector 가 차기 세션에서 격리 식별.
- (8.2) 수단 라벨이 효능 평서문에 박제된 spec 은 RULE-07 위반으로 inspector 가 차기 세션에서 `50.blocked/spec/` 격리 대상으로 식별. 본 spec 박제 시점 grep 매치는 (i)~(iv) 카테고리 내부 한정으로 분류 — 카테고리 분류 자체가 § 동작 8 의 효능 박제와 직교.

### 회귀 중점
- `vite.config.js:38-42` 에만 신규 alias `'@/foo': path.resolve(__dirname, 'src/Foo')` 추가, `tsconfig.json:19-23` 미갱신 → § 동작 1 위반 baseline (vite 단독 키 1, 대칭차 1).
- `tsconfig.json:19-23` 에만 신규 paths `"@/bar/*": ["./src/Bar/*"]` 추가, `vite.config.js:38-42` 미갱신 → § 동작 1 위반 baseline (tsconfig 단독 키 1).
- `vite.config.js:42` `'@/log': path.resolve(__dirname, 'src/log')` (소문자) vs `tsconfig.json:22` `"@/log/*": ["./src/Log/*"]` (대문자) → § 동작 3.1 위반 baseline (case mismatch — Linux CI fail).
- `vite.config.js:42` `'@/log': path.resolve(__dirname, 'src/Log')` vs `tsconfig.json:22` `"@/log/*": ["./src/log/*"]` (양쪽 case 반대) → § 동작 2.1 + § 동작 3.1 위반 baseline.
- 본 spec 본문에 alias 도입 수단 라벨 박제 (수단 라벨 토큰 셋 § 동작 8 정의 참조) → § 동작 8.1 위반.

## 의존성
- 외부: Node.js (`node -p` / `node -e` / `path` 모듈), POSIX shell (`grep`), TypeScript (`tsc` paths 해석), Vite (`resolve.alias` 해석), Vitest (top-level vite config 흡수), `eslint-import-resolver-*` (선택, § 동작 7).
- 내부: `vite.config.js` (§ 동작 1·2·3 좌변), `tsconfig.json` (§ 동작 1·2·3 우변), `src/**/*.{ts,tsx,d.ts}` (소비 표면 — § 동작 6 직교).
- 역의존:
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028/053/058) §2 ambient type alias 불변식 — `@/types/*` 한 alias 한정 ambient type 진입점. 본 spec 은 양 채널 (vite ↔ tsconfig) 동치 축 박제 — tooling.md 의 ambient type 축과 직교 (tooling.md:51 의 "tsconfig.json paths alias 변경은 런타임 번들러 (Vite resolve.alias) 와 정합 확인 필요" 평서 노트를 본 spec 이 게이트화).
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037) FR-01 — CI workflow typecheck step 회귀 게이트. 본 spec § 동작 1 위반 시 typecheck step 이 unresolved 진단 — 직교 (회귀 게이트 vs 선언 정합 축).
  - `specs/50.blocked/spec/foundation/toolchain-version-coherence.md` (REQ-061, 격리) — typescript devDep / installed / tsconfig 정합 (버전·enum 축). 본 spec 은 동일 메이저 가정 위에서 resolver 키/타깃 동치 축 — 직교.
  - `specs/30.spec/green/foundation/runtime-dep-version-coherence.md` (REQ-063) — React 런타임 메이저 정합 (버전 일치 축). 본 spec 은 resolver 선언 동치 축 — 직교.
  - `specs/30.spec/green/foundation/devbin-install-integrity.md` (REQ-064) — devbin install 존재 축. 본 spec 의 게이트 (`node -p`) 는 devbin precondition 위 — 본 spec § 동작 4 의 진단 명령이 `node` 진입 가능성 의존.
  - `specs/30.spec/green/foundation/island-proptypes-removal.md` (REQ-062) — TS island PropTypes 0 hit. 본 spec 과 직교 (콘텐츠 vs 설정 동치 축).
  - `specs/50.blocked/spec/foundation/{src-typescript-migration,typecheck-exit-zero,island-regression-guard,husky-pre-push-typecheck}.md` — island 정의 / typecheck 게이트 spec 군. 본 spec § 동작 1 위반 시 typecheck error 채널에서 resolver drift 가 false-negative/positive 신호로 혼입 — 직교.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 task 발행이 아니라 불변식 박제 — grep / `node -p` 게이트는 baseline 실측 박제 목적. 효능 도입 task 발행 시점에 task 의 §스코프 규칙 expansion 결정).
- **grep-baseline** (REQ-065 발행 시점 HEAD=`772f6c8` + 본 spec 박제 시점 HEAD=`389afee` 실측 — 두 HEAD 사이 `vite.config.js` / `tsconfig.json` / `src/types/env.d.ts` / `src/common/env.d.ts` 변경 0):
  - (a) `grep -nE "'@/[a-zA-Z]+'\\s*:" vite.config.js` → **3 hits in 1 file** (vite alias 키 추출):
    - `vite.config.js:39` `'@/common': path.resolve(__dirname, 'src/common')`
    - `vite.config.js:40` `'@/types': path.resolve(__dirname, 'src/types')`
    - `vite.config.js:41` `'@/log': path.resolve(__dirname, 'src/Log')`
  - (b) `grep -nE "\"@/[a-zA-Z]+/\\*\":" tsconfig.json` → **3 hits in 1 file** (tsconfig paths 키 추출):
    - `tsconfig.json:20` `"@/common/*": ["./src/common/*"]`
    - `tsconfig.json:21` `"@/types/*": ["./src/types/*"]`
    - `tsconfig.json:22` `"@/log/*": ["./src/Log/*"]`
  - (c) 키 집합 비교 (§ 동작 1 baseline):
    - vite 키 집합 (와일드카드 정규화 후 동일): `{@/common, @/types, @/log}` (3 항목).
    - tsconfig 키 집합 (와일드카드 `/*` 정규화 후): `{@/common, @/types, @/log}` (3 항목).
    - 대칭차 = 0 → § 동작 1 정합 baseline.
  - (d) 타깃 디렉터리 비교 (§ 동작 2 baseline):
    - `@/common` — vite `src/common` ↔ tsconfig `./src/common/*` → 절대경로 정규화 후 동치 (격차 0).
    - `@/types` — vite `src/types` ↔ tsconfig `./src/types/*` → 동치 (격차 0).
    - `@/log` — vite `src/Log` ↔ tsconfig `./src/Log/*` → 동치 (격차 0, 양쪽 case `L` 대문자 유지).
  - (e) 타깃 case 비교 (§ 동작 3 baseline):
    - 3 alias 모두 양쪽 case 동일 — § 동작 3 정합 baseline.
  - (f) alias 소비 표면 실측 (§ 동작 6 직교 baseline):
    - `grep -rnE "@/(common|types|log)" src` → **3 hits in 2 files** (REQ 본문 실측 2 hit 와 본 spec 박제 시점 측정 차이는 `src/common/env.d.ts:3` 라인 추가 매치 — REQ 본문이 라인 2,5 박제 / 본 spec 박제 시점은 라인 3 도 매치):
      - `src/types/env.d.ts:2` — `// Project-specific env extension (currently none). Ensures @/types/env resolves.` (주석)
      - `src/common/env.d.ts:3` — `` // `import type` from `@/types/env` also keeps the project-wide ambient env ``
      - `src/common/env.d.ts:5` — `import type {} from '@/types/env';`
    - `@/common`, `@/log` alias 의 실제 import 소비 0 — § 동작 6.2 baseline (미래 import 추가 시 drift 위험 표면).
  - (g) ESLint resolver 설정 부재 baseline (§ 동작 7 진입점):
    - `grep -nE "import.*resolver|alias" eslint.config.js` → 0 hit (resolver alias 설정 부재). § 동작 7.1 baseline.
  - (h) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/path-alias-resolver-coherence.md` — 본 spec 박제 시점 매치는 § 동작 8 정의 본문 / 자기 검증 게이트 본문 / 외부 라이브러리 API 인용 / 템플릿 메타 텍스트 카테고리에 한정 — § 동작 8.1 자기 검증 baseline.
- **rationale**: gate (a)(b) 는 § 동작 1 의 양 채널 키 추출 진입점. gate (c) 는 § 동작 1 의 대칭차 0 baseline (현 시점 3 alias 정합). gate (d) 는 § 동작 2 의 타깃 동치 baseline (3 alias 모두 격차 0). gate (e) 는 § 동작 3 의 case 정합 baseline. gate (f) 는 § 동작 6 의 소비 표면 직교 baseline — 선언 정합과 소비 정합 직교 박제. gate (g) 는 § 동작 7 의 ESLint resolver 직교 baseline (현 시점 도입 부재 — 자연 통과). gate (h) 는 § 동작 8.1 수단 중립 자기 검증 baseline. 모든 baseline 은 시점 의존 수치 (3 alias / 3 hits / 2 files) 가 아닌 **양 채널 키/타깃 동치 (격차 0) 동시 성립 효능 자체** 가 본 spec 의 박제 대상이며, baseline 수치는 위반 상태 식별 보조 — NFR-01 시점 비의존 정합.

## 테스트 현황
- [ ] § 동작 1.1 vite alias 키 N ↔ tsconfig paths 키 N (와일드카드 정규화 후 동일).
- [ ] § 동작 1.2 한쪽 단독 키 0.
- [ ] § 동작 1.3 한쪽 단독 신규 alias 추가 PR 의 위반 검출.
- [ ] § 동작 1.4 와일드카드 표기 의미적 동치.
- [ ] § 동작 2.1 양 채널 타깃 디렉터리 절대경로 정규화 후 동치.
- [ ] § 동작 2.2 타깃 case mismatch 위반 검출.
- [ ] § 동작 2.3 와일드카드 suffix `*` 의미적 매핑 동치.
- [ ] § 동작 3.1 alias 타깃 case 양 채널 일치.
- [ ] § 동작 3.2 macOS false-negative / Linux CI fail 정적 검증.
- [ ] § 동작 3.3 case 단독 게이트 식별.
- [ ] § 동작 4.1~4.4 단일 진단 명령으로 위반 카테고리 식별.
- [ ] § 동작 5.1~5.4 양 채널 동시 편집 게이트 강제.
- [ ] § 동작 6.1 alias 소비 0 hit 도 선언 정합 시 통과.
- [ ] § 동작 6.2 미래 import 추가 시 drift 위험 사전 박제.
- [ ] § 동작 6.3 alias 소비 패턴 검증은 별 spec 위임.
- [ ] § 동작 7.1 현 시점 ESLint resolver 부재 자연 통과.
- [ ] § 동작 7.2 ESLint resolver 도입 시 alias 집합 정합.
- [ ] § 동작 7.3 직교 채널 — 도입 부재 시 자연 통과.
- [ ] § 동작 8.1 `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/path-alias-resolver-coherence.md` 매치가 § 동작 8 카테고리 (i)~(iv) 내부에 한정.
- [ ] § 동작 8.2 수단 라벨 박제 spec 은 `50.blocked/spec/` 격리 대상.

## 수용 기준
- [ ] (Must, FR-01) `vite.config.js` `resolve.alias` 키 집합 ↔ `tsconfig.json` `compilerOptions.paths` 키 집합 (와일드카드 정규화 후) 대칭차 = 0 — § 동작 1.
- [ ] (Must, FR-02) 양 채널 대응 prefix 타깃 디렉터리 절대경로 정규화 후 동치 — § 동작 2.
- [ ] (Must, FR-03) alias 타깃 디렉터리 case 양 채널 일치 — § 동작 3.
- [ ] (Must, FR-05) 신규 alias 도입 / 기존 alias 삭제 / 타깃 변경 시 양 파일 동시 편집 강제 — § 동작 5.
- [ ] (Should, FR-04) 단일 grep / `node -p` 출력으로 위반 카테고리 식별 — § 동작 4.
- [ ] (Should, FR-06) 선언 정합과 소비 정합 직교 — § 동작 6.
- [ ] (Should, FR-07) ESLint resolver 설정 부재 또는 양 alias 집합과 정합 — § 동작 7.
- [ ] (NFR-01) 본 spec 본문에 특정 alias 이름 / 디렉터리 / 메이저 수치가 효능 평서문에 하드코딩되지 않음 — baseline 수치는 §스코프 규칙 grep-baseline 에만 박제 (위반 상태 식별 보조).
- [ ] (NFR-02) 본 효능 박제는 단일 진단 명령 (`grep -nE` / `node -p` 1-line) 으로 위반 카테고리 식별 가능.
- [ ] (NFR-03) 결과 효능 (양 채널 키/타깃 동치 동시 성립) 만 박제. 1회성 alias 추가/삭제 운영 task 배제.
- [ ] (NFR-04) `tooling.md` ambient type alias 축 / `regression-gate.md` CI typecheck step / REQ-061 typescript 메이저 / REQ-063 react 메이저 / REQ-064 devbin install 의 정합 축과 모두 직교.
- [ ] (NFR-05) 양 파일 내용 동일 상태에서 본 게이트 반복 적용 시 동일 결과 (RULE-02 멱등 정합).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-065 흡수). `vite.config.js` `resolve.alias` ↔ `tsconfig.json` `compilerOptions.paths` 의 양 채널 키/타깃 동치 (대칭차 0 + 타깃 절대경로 정규화 후 동치 + case 일치) 상시 불변식 박제 (§ 동작 1~8). REQ-061 (toolchain 버전·enum 축, 격리) / REQ-063 (runtime dep 버전 일치 축, green) / REQ-064 (devbin install 존재 축, green) 와 직교하는 **resolver 선언 동치** 메타 패턴. `tooling.md:51` "vite resolve.alias 정합 평서 노트" 의 게이트화. baseline 실측 @HEAD=`389afee` (REQ-065 발행 HEAD=`772f6c8` 와 vite.config.js / tsconfig.json / src/types,common/env.d.ts 영향 0): (a) vite alias 3 hits (`@/common`, `@/types`, `@/log`) / (b) tsconfig paths 3 hits (`@/common/*`, `@/types/*`, `@/log/*`) / (c) 와일드카드 정규화 후 대칭차 0 → § 동작 1 정합 baseline / (d) 3 alias 타깃 디렉터리 양쪽 절대경로 정규화 후 동치 (격차 0) / (e) 3 alias case 동일 (`src/Log` 양쪽 `L` 대문자 유지) → § 동작 3 정합 baseline / (f) alias 소비 표면 3 hits in 2 files (`@/types/env` 단독 import + 주석 2건) — `@/common`/`@/log` 실제 import 0 (§ 동작 6.2 drift 위험 표면) / (g) eslint.config.js resolver alias 설정 부재 → § 동작 7.1 자연 통과 / (h) § 동작 8.1 수단 라벨 매치는 § 동작 8 카테고리 (i)~(iv) 내부 한정. 수단 중립 정책 (§ 동작 8.1 자기 검증 — `기본값|권장|우선|default|best|root cause|가장 효과적` 매치 카테고리 분류). consumed req: `specs/20.req/20260517-path-alias-resolver-coherence.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `tooling.md` (ambient type alias 축 직교 / vite resolve.alias 평서 노트 게이트화), `regression-gate.md` (CI typecheck step 직교 — resolver drift 가 회귀 신호로 혼입 가능), `toolchain-version-coherence` (격리, 버전·enum 축 직교), `runtime-dep-version-coherence` (REQ-063, 버전 일치 축 직교), `devbin-install-integrity` (REQ-064, `node` 진입 precondition), `island-proptypes-removal` (REQ-062, 콘텐츠 vs 설정 동치 축 직교), 50.blocked/spec/foundation/{src-typescript-migration,typecheck-exit-zero,island-regression-guard,husky-pre-push-typecheck} (typecheck 게이트 spec 군 — resolver drift false-negative/positive 혼입 채널). RULE-07 자기검증 — § 동작 1~8 모두 평서형·반복 검증 가능 (`grep -nE` + `node -p` 1-line)·시점 비의존 (특정 alias 이름·디렉터리·수치는 §스코프 규칙 baseline 에만 박제, 효능 평서문은 "대칭차 0" / "격차 0" 자체)·incident 귀속 부재 (resolver 선언 정합은 spec ↔ runtime 의 상시 성질)·수단 중립 (alias 추가/삭제/이름 변경 / pre-commit / CI / lint rule 도입 등 어느 수단도 라벨 미박제). RULE-06 §스코프 규칙 gate (a)~(h) 8건 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/path-alias-resolver-coherence.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. | 전 섹션 (신규) |

## 참고
- **REQ 원문 (완료 처리)**:
  - `specs/60.done/2026/05/17/req/20260517-path-alias-resolver-coherence.md` (REQ-065 — 본 세션 mv).
- **선행 req (메타 패턴 직교 축)**:
  - `specs/60.done/2026/05/17/req/20260517-toolchain-version-coherence.md` (REQ-061, 격리) — typescript devDep / installed / tsconfig 정합 (버전·enum 축).
  - `specs/60.done/2026/05/17/req/20260517-runtime-dep-version-coherence.md` (REQ-063) — React 런타임 메이저 정합 (버전 일치 축).
  - `specs/60.done/2026/05/17/req/20260517-devbin-install-integrity.md` (REQ-064) — devbin install 존재 축.
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062) — TS island PropTypes 0 hit (콘텐츠 축).
- **관련 spec (역의존 — 모두 직교 축)**:
  - `specs/30.spec/blue/foundation/tooling.md:24-26` (ambient type alias 불변식 — `@/types/*` 한 alias 한정), `:51` (vite resolve.alias 정합 평서 노트 — 본 spec 이 게이트화).
  - `specs/30.spec/blue/foundation/regression-gate.md:92` (`paths 3 alias` 평서 참조 — 본 spec 이 동치 게이트화).
  - `specs/30.spec/green/foundation/runtime-dep-version-coherence.md` (REQ-063, React 메이저 정합 축).
  - `specs/30.spec/green/foundation/devbin-install-integrity.md` (REQ-064, devbin install 존재 축 — 본 spec `node -p` 진단 명령의 precondition).
  - `specs/30.spec/green/foundation/island-proptypes-removal.md` (REQ-062, 콘텐츠 vs 설정 동치 축 직교).
  - `specs/50.blocked/spec/foundation/{toolchain-version-coherence,src-typescript-migration,typecheck-exit-zero,island-regression-guard,husky-pre-push-typecheck}.md` (typecheck / island 게이트 spec 군 — resolver drift false-negative/positive 혼입 채널).
- **외부 레퍼런스**:
  - Vite `resolve.alias`: `https://vitejs.dev/config/shared-options.html#resolve-alias` — dev server / build / Vitest 흡수 동작.
  - TypeScript `compilerOptions.paths`: `https://www.typescriptlang.org/tsconfig#paths` — typescript-eslint parser / `tsc --noEmit` / IDE LSP 채널.
  - `eslint-import-resolver-typescript`: `https://github.com/import-js/eslint-import-resolver-typescript` — § 동작 7 미래 도입 시 진입점.
- **현장 근거 (HEAD=`772f6c8` REQ 발행 + `389afee` spec 박제, vite.config.js / tsconfig.json / src/types,common/env.d.ts 영향 0)**:
  - `vite.config.js:39-41` 3 alias.
  - `tsconfig.json:20-22` 3 paths.
  - `src/types/env.d.ts:2`, `src/common/env.d.ts:3,5` — alias 소비 표면 3 hits in 2 files.
  - `eslint.config.js` — resolver alias 설정 부재 (§ 동작 7.1 baseline).
- **RULE 준수**:
  - RULE-07: 8개 불변식 (§ 동작 1~8) 모두 시점 비의존·평서형·반복 검증 가능 (`grep -nE` + `node -p` 1-line)·incident 귀속 부재. 수단 라벨 박제 0 (§ 동작 8.1 자기 검증 — 매치는 카테고리 (i)~(iv) 내부 한정).
  - RULE-06: §스코프 규칙 grep-baseline 8개 gate (a)~(h) 실측 박제 @HEAD=`389afee`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/path-alias-resolver-coherence.md` 신규 create + req mv `20.req/* → 60.done/req/`).
