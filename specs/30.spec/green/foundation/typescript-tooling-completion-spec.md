# TypeScript 도구 체인 완성 — typescript-eslint 파서 도입 + Vitest coverage `.ts/.tsx` 포함

> **위치**: `eslint.config.js:10-13, 33` / `vite.config.js:71-81` / `package.json:42-63` / `src/types/env.d.ts`, `src/common/env.d.ts`
> **관련 요구사항**: REQ-20260420-006
> **최종 업데이트**: 2026-04-20 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
TSK-20260420-32 (TypeScript foundation bootstrap) 에서 의도적으로 유보한 두 gap 을 단일 단위로 메운다:
(1) typescript-eslint 파서/플러그인 부재 — 현재 `eslint.config.js:13` 가 `**/*.d.ts` 를 ignore 로 처리 중이라 실소스 `.ts/.tsx` 도입 시 `Parsing error: Unexpected token {` 가 발생 예고,
(2) Vitest coverage `include` 가 `['src/**/*.{js,jsx}']` 로 고정되어 `.ts/.tsx` 실소스가 coverage 통계에서 누락될 예고.
실소스 `.ts/.tsx` 전환 자체는 본 spec Out-of-Scope. 타입-인식(`type-checked`) 규칙 도입도 Out-of-Scope.

## 공개 인터페이스
- `package.json` devDependencies 추가 — 다음 중 1 선택 (planner 가 spec 승격 시 확정):
  - 통합: `typescript-eslint` (권장, `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` 재-export).
  - 분리: `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` 쌍 명시.
  버전 범위: ESLint v9 + TypeScript v6 호환 릴리즈 (2026-04 기준 최신 안정).
- `eslint.config.js`:
  - `:13` `ignores` 에서 `**/*.d.ts` 제거 + 관련 설명 주석 정리.
  - `.ts/.tsx/.d.ts` 를 대상으로 하는 블록 추가 — typescript-eslint `parser` 지정. 기존 `files: ['src/**/*.{js,jsx,ts,tsx}']` (`:33`) 블록은 JS/JSX 동작 유지.
  - typescript-eslint `recommended` 규칙 세트 — 채택 여부는 planner 결정. 본 spec 은 **규칙 세트 미적용 또는 비형-인식 `recommended` 1종 중 하나**만 허용.
- `vite.config.js:71-81`:
  - `include`: `['src/**/*.{js,jsx}']` → `['src/**/*.{js,jsx,ts,tsx}']`.
  - `exclude`: 현행 `.{js,jsx}` 리스트를 `.{js,jsx,ts,tsx}` 로 확장 + `src/**/*.d.ts` 명시 제외.

## 동작
1. devDep 추가 + `npm install` → exit 0 + `package-lock.json` 갱신.
2. `eslint.config.js` 편집 — 파서 블록 추가, `**/*.d.ts` ignore 제거, files glob 유지.
3. `vite.config.js` 편집 — coverage include/exclude 확장 + `.d.ts` 명시 제외.
4. 게이트 재실행:
   - `npm run lint` — exit 0 + `src/common/env.d.ts` / `src/types/env.d.ts` 파싱 에러 0 + 경고·오류 건수 변경 0.
   - `npm test` — 전 스위트 green + coverage 보고서 `coverage/lcov.info` 생성 + `.d.ts` 라인 0 (exclude 정합).
   - `npm run typecheck` — exit 0.
   - `npm run build` — exit 0 + 번들 크기 ±5% 내.
5. pre-commit 훅 dry-run: 임의 `.ts` 실소스 staging 시 husky + lint-staged 가 typescript-eslint 파서로 파싱 (followup `20260420-1214-ts-staging-precommit-dry-run-unverified.md` 시나리오 종결). 방법은 result.md 에 박제.
6. typescript-eslint 규칙 채택 결정은 planner 의 spec 승격 시점에 단일 값으로 고정 (FR-09).

## 의존성
- 내부: 선행 완료 `specs/30.spec/blue/foundation/typescript-bootstrap-spec.md` (REQ-20260420-003, commit `ceb9c60`). `src/types/env.d.ts`, `src/common/env.d.ts` 는 이미 존재 — 본 spec 은 이들을 lint 체인에 편입.
- 외부: `typescript ^6.0.3`, `eslint ^9.x`, `@vitest/coverage-v8`, 신규 `typescript-eslint`/`@typescript-eslint/*`.
- 역의존: 후속 요구사항 — `src/common/env.js → env.ts` 전환, 신규 `.tsx` 컴포넌트 도입.

## 테스트 현황
- [x] `src/common/env.d.ts`, `src/types/env.d.ts` 존재 (REQ-20260420-003 완료 기준).
- [x] `npm run lint` 현재 green — 단 `**/*.d.ts` ignore 회피로 환경 가짜-green.
- [x] `npm test` 현재 green + coverage 보고서 생성 (baseline 2026-04-20, `.d.ts` 는 coverage 영향 없음).
- [x] `npm run typecheck` / `npm run build` exit 0 (baseline).
- [ ] typescript-eslint 도입 후 `npm run lint` 경고·오류 0 + `.d.ts` 파싱 pass.
- [ ] coverage include 확장 후 `.d.ts` 가 통계에 포함되지 않음 확인.
- [ ] `.ts` staging pre-commit 훅 — typescript-eslint 파서 호출 실증.

## 수용 기준
- [ ] (Must) `package.json` devDependencies 에 `typescript-eslint` (또는 `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`) 추가 + `npm install` exit 0 + `package-lock.json` 갱신.
- [ ] (Must) `grep -n "\*\*/\*\.d\.ts" eslint.config.js` → `ignores` 항목으로는 0 hits. 블록 구조상 그 외 참조(예: 파서 대상 패턴) 는 허용.
- [ ] (Must) `npm run lint` exit 0 + `src/common/env.d.ts`, `src/types/env.d.ts` 양쪽 파싱 에러 없음 + 경고·오류 건수 변경 0.
- [ ] (Must) `vite.config.js` coverage `include` = `['src/**/*.{js,jsx,ts,tsx}']`, `exclude` 도 `.{js,jsx,ts,tsx}` + `src/**/*.d.ts` 명시.
- [ ] (Must) `npm test` exit 0 + 전 스위트 green + coverage 보고서 생성 + `coverage/lcov.info` 에서 `.d.ts` 라인 0.
- [ ] (Must) `npm run typecheck` exit 0.
- [ ] (Must) `npm run build` exit 0 + 번들 크기 회귀 ±5% 내.
- [ ] (Should) 임의 `.ts` 파일 staging → husky pre-commit → lint-staged → ESLint (typescript-eslint 파서) 성공. 검증 스크립트와 로그 발췌를 result.md 에 박제.
- [ ] (Should) typescript-eslint `recommended` 규칙 세트 채택 여부를 planner 가 단일 값으로 고정 — spec 승격 시 본 문서 갱신.
- [ ] (NFR) `npm run lint` 실행 시간 회귀 +30% 내 (`recommended` 규칙 미적용 기준).
- [ ] (NFR) `npm audit` 고·치명 취약점 0 유지.
- [ ] (NFR) Vite 빌드 시간 회귀 ±5% 내.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `grep -n "\*\*/\*\.d\.ts" eslint.config.js` → 2 hits in 1 file:
    - `eslint.config.js:10` (주석 `// `**/*.d.ts` excluded: ...`)
    - `eslint.config.js:13` (`ignores: [...'**/*.d.ts']`)
  - `grep -n "include\|exclude" vite.config.js` — coverage 블록:
    - `vite.config.js:74` (`include: ['src/**/*.{js,jsx}']`)
    - `vite.config.js:75-80` (`exclude: ['src/index.jsx', 'src/reportWebVitals.js', 'src/**/*mock.{js,jsx}', 'src/**/*.test.{js,jsx}']`)
  - `grep -n "typescript-eslint\|@typescript-eslint" package.json` → 0 hits (baseline, 2026-04-20).
  - `grep -n "typescript\|@types" package.json` → typescript ^6.0.3 (`:59`), `@types/node ^25.6.0` (`:46`), `@types/react ^18.3.28` (`:47`), `@types/react-dom ^18.3.7` (`:48`).
- **rationale**: 본 spec 은 빌드·린트·coverage 설정 3개 파일과 `package.json` devDep 갱신만 수행. `src/**` 실소스 (`.js/.jsx`) 본문 변경 금지. `.ts/.tsx` **실소스** 도입(예: `env.js → env.ts` 전환, 신규 `.tsx`) 은 본 spec 밖 — 후속 요구사항. typescript-eslint `recommended-type-checked` 등 형-인식 규칙 활성화는 성능 영향 있어 별도 요구사항으로 분리.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-006 반영) | all |
