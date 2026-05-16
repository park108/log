# src/** 런타임 TypeScript 전환 불변식

> **위치**: `src/**` (`foundation/tooling` REQ-028 계약의 **실행 축**)
> **관련 요구사항**: REQ-20260422-051 (src/** 런타임/테스트 소스 확장자 수렴 + 혼재 허용 중 green CI 유지 + 시맨틱 보존)
> **최종 업데이트**: 2026-04-22 (inspector 신규 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. baseline 수치는 스냅샷 (본 문서 §참고 · 재현 가능).

## 역할
`src/**` 런타임·테스트 소스의 **최종 정상 확장자** 를 `.ts` / `.tsx` / `.d.ts` 로 수렴시키며, 그 전환 과정의 **임의 중간 혼재 상태** 에서도 green CI (lint · vitest · 4축 coverage · vite build) 가 깨지지 않도록 하는 **시스템 불변식** 을 박제한다. `foundation/tooling` (REQ-028) 이 도입한 ESLint ts/tsx/d.ts 블록 · `@/types/*` ambient alias · typescript-eslint 파서 · Vitest coverage include 의 4개 계약이 **실제 런타임 소스 전환** 으로 완결되는 축을 커버한다. 진행 기법 선정 (codemod vs 수동, jscodeshift vs ts-migrate, `// @ts-expect-error` vs `any` 과도기 등) 및 carve 순서는 본 spec 의 계약 범위 밖이며 planner · task · 개별 PR 에 위임한다.

## 공개 인터페이스
본 spec 은 단일 모듈의 인터페이스가 아닌 **저장소 축 불변식** 이다. 외부 관찰 계약:
- **정적 관찰**: `find src ...` / `grep -rn ...` 의 확장자 기반 결과 수치.
- **동적 관찰**: `npm run lint` · `npm test` · `vite build` 의 종료 코드 및 4축 coverage 보고.
- **의미 보존 관찰**: 개별 PR diff 에서 타입 표현 증강 외 런타임 변경 부재.

## 동작
### 최종 정상 상태 (수렴 후 불변식)
1. **FR-01 런타임 소스 확장자 수렴**: `find src -name "*.jsx"` 결과 0 건, `find src -name "*.js" ! -name "*.test.js" ! -name "*.d.ts"` 결과 0 건. 즉 런타임 소스는 `.ts` 또는 `.tsx` 만 존재.
2. **FR-02 테스트 소스 확장자 수렴**: `find src -name "*.test.jsx"` 결과 0 건, `find src -name "*.test.js"` 결과 0 건. 테스트 수집 글로브 (`vitest include`) 가 `.ts/.tsx` 만으로 수렴 가능.
3. **ambient 타입 정의 보존**: `find src -name "*.d.ts"` 결과는 foundation/tooling FR-02 의 `src/types/**` · `src/**/env.d.ts` 규칙을 준수하는 집합. 본 spec 은 이 집합의 원소 수를 고정하지 않으며 위치 규칙만 참조.

### 전환 과정 (혼재 허용 중 유지 계약)
4. **FR-04 혼재 허용 (partial adoption)**: 전환 진행 중의 임의 중간 상태에서 `.js`/`.jsx` 와 `.ts`/`.tsx` 가 `src/**` 에 **공존** 할 수 있다. 공존 상태에서도 다음 4개 항목이 동시에 성립:
   - (a) `npm run lint` 종료 코드 0.
   - (b) `npm test` 전체 PASS (실행된 `it` 개수 감소 0, 건너뜀 0).
   - (c) 4축 coverage threshold (`foundation/regression-gate` · `foundation/coverage-determinism`) 충족.
   - (d) `vite build` 종료 코드 0.
   혼재 허용 수단 (ESLint overrides · `tsconfig.allowJs` · lint-staged 패턴 확장 등) 은 `foundation/tooling` REQ-028 계열로 이미 박제됨 — 본 spec 은 그 전제 위에 서있다.

### 시맨틱 보존 (개별 전환 단위 계약)
5. **FR-03 시맨틱 보존**: 개별 전환 단위 (파일·디렉터리) PR 의 diff 는 **타입 도입 및 확장자 변경만** 포함한다. 다음 변경은 본 spec 파생 task 내에서 금지:
   - (a) 함수 시그니처의 **런타임 의미** 변경 (런타임 인자 추가·제거·순서 변경 등).
   - (b) 공개 export 이름 변경·추가·제거.
   - (c) import 경로 변경. 단 `@/types/*` ambient alias 해석으로 인한 타입 측면 변화는 허용.
   - (d) 기존 런타임 분기 로직 삭제·병합·추가.
   허용되는 타입 표현 증강: 타입 주석, generic 파라미터화, type guard 추가, `as` 단언, `satisfies`, type-only import/export.

### 점진 승격 체크포인트 (디렉터리 단위 island 계약)
6. **FR-05 type-safe island**: 하위 디렉터리 `<dir>` 전환이 완결되면 해당 디렉터리는 다음 조건을 만족하는 **island** 로 간주된다.
   - 조건: `find <dir> \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` 결과 0 건.
   - 계약: island 확정 후 해당 디렉터리에 `.jsx`/`.js` 런타임/테스트 파일을 재도입하는 변경은 회귀로 간주되어 차단 대상이다. 차단 수단 (ESLint `no-restricted-syntax` · CI guard · PR template 등) 의 선정은 본 spec 관할 밖 · 별도 task.

### 수단 중립성
7. **FR-06 수단 라벨 금지**: 본 spec · 파생 task 본문 · 파생 PR 커밋 메시지 에서 전환 수단 선정에 "기본값" / "권장" / "우선" / "default" 류 라벨을 부여하지 않는다. 본 spec 은 **결과** (확장자 수렴 + 혼재 허용 중 green CI 유지 + 시맨틱 보존) 만 박제하며 **기법** 은 박제하지 않는다.

## 의존성
- 내부 (전제 계약):
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028) §동작 1~4: ESLint ts/tsx/d.ts 블록, `@/types/*` ambient alias, typescript-eslint 파서, Vitest coverage include. 본 spec 의 전제.
  - `specs/30.spec/blue/foundation/regression-gate.md`: 4축 coverage threshold. FR-04 (c) 의 게이트 정의.
  - `specs/30.spec/blue/foundation/coverage-determinism.md`: 4축 coverage 결정성. FR-04 (c) 인접.
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md`: TypeScript devDep 버전 축. 본 spec 파생 task 진행 중 TypeScript 업그레이드 동반 시 정합 대상 (별도 req 축).
  - `specs/30.spec/blue/common/test-idioms.md`: 테스트 이디엄. `.test.ts/.test.tsx` 전환 시 준수 대상.
- 외부:
  - `typescript` (tsconfig `allowJs: true` 유지 전제 — `foundation/tooling` 관할).
  - `vite` (native `.ts/.tsx` 해석 — 전환 전제).
  - `vitest` (`.test.ts/.test.tsx` 수집 글로브 포함 — `foundation/tooling` include 규칙).
  - `eslint` + `typescript-eslint` (파서 · 규칙 — `foundation/tooling` 관할).
- 역의존 (본 spec 을 전제로 하는 축):
  - `foundation/tooling` 의 ts/tsx 블록이 "contract without enforcement" 상태를 벗어나기 위한 실행 축.

## 테스트 현황
- [ ] FR-01 게이트: `find src -name "*.jsx"` → 0 · `find src -name "*.js" ! -name "*.test.js" ! -name "*.d.ts"` → 0.
- [ ] FR-02 게이트: `find src -name "*.test.jsx"` → 0 · `find src -name "*.test.js"` → 0.
- [ ] FR-04 혼재 허용: 전환 진행 중 임의 HEAD 에서 `npm run lint` · `npm test` · `vite build` PASS + 4축 coverage 유지.
- [ ] FR-05 island 회귀 차단: 디렉터리별 island 확정 후 `.jsx`/`.js` 재도입 PR 이 CI/lint 에서 차단됨 (수단 · 게이트 별도 task).
- [ ] FR-06 수단 라벨 0: `grep -rnE "기본값|권장|우선|default" specs/30.spec/green/foundation/src-typescript-migration.md specs/40.task/**/*src-typescript* specs/60.done/**/*src-typescript*` 결과가 예시/참고 인용을 제외하면 0.

## 수용 기준
- [ ] (Must) 파생 task 전원 완료 후 FR-01 게이트 실측 0/0.
- [ ] (Must) 파생 task 전원 완료 후 FR-02 게이트 실측 0/0.
- [ ] (Must) 파생 task 임의 진입/퇴출 시점에 FR-04 (a)~(d) 4개 항목 동시 성립.
- [ ] (Must) 파생 PR diff 에서 FR-03 (a)~(d) 위반 0 (타입 표현 증강만 존재).
- [ ] (Should) 디렉터리 단위 island 확정 후 `.jsx`/`.js` 재도입 시도 차단 수단 1건 이상 박제.
- [ ] (Should) FR-06 수단 라벨 박제 0 건.

## 참고

### baseline 스냅샷 (재현 가능 · NFR-01)
- HEAD=`b9e22be` (2026-04-22 inspector 승격 시점) 실측:
  - `src/**/*.jsx` 전체: 66 / 런타임(test 제외): **36** / 테스트: **30**.
  - `src/**/*.js` 전체: 56 / 런타임(test·d.ts 제외): **39** / 테스트: **17**.
  - `src/**/*.tsx`: **0**.
  - `src/**/*.ts` (non-`.d.ts`): **0**.
  - `src/**/*.d.ts`: 2 (`src/types/env.d.ts`, `src/common/env.d.ts`).
  - 전환 대상 합계: **런타임 75 + 테스트 47 = 122**.
- 이 수치는 진행 추이 관찰 · 회귀 감지 baseline 이며 본 spec 의 불변식 조건이 아니다. 최종 수렴 조건은 §동작 1~2 의 0-hit 선언.

### 관련 계약
- `specs/30.spec/blue/foundation/tooling.md` — ESLint ts/tsx/d.ts 블록 · `@/types/*` ambient alias · typescript-eslint 파서 · Vitest coverage include (본 spec 전제).
- `specs/30.spec/blue/foundation/regression-gate.md` — 4축 coverage threshold (FR-04 (c)).
- `specs/30.spec/blue/foundation/coverage-determinism.md` — 4축 coverage 결정성 (FR-04 (c) 인접).
- `specs/30.spec/blue/common/test-idioms.md` — 테스트 이디엄 (FR-02 전환 준수 대상).

### RULE 준수
- **RULE-07**: FR-01~06 모두 평서형 시스템 불변식. 최종 정상 상태 선언 · 혼재 허용 중 green CI 유지 계약 · 시맨틱 보존 계약. 반복 검증 가능 (`find`·`grep`·`npm test`·`vite build`). 시점 비의존. req 본문의 FR-07 진행 우선순위 힌트는 **planner 참고용** 으로 spec 박제 대상이 아님을 req 작성자가 명시 — 본 spec 은 이를 준수하여 진행 순서를 박제하지 않는다.
- **RULE-06**: 본 spec 파생 task 는 §스코프 규칙 grep-baseline 박제 시 확장자 기반 게이트 (예: `find <dir> -name "*.jsx" → 0`) 정합 필수.
- **RULE-01**: inspector writer 영역 (`30.spec/green/**`) 내 생성.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-22 | inspector / (this commit) | 최초 등록 — REQ-20260422-051 흡수. FR-01~06 불변식 박제, FR-07 진행 힌트는 spec 박제 제외 (req 명시 + RULE-07). baseline HEAD=`b9e22be` 실측 박제. | all |
