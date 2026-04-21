# TypeScript 점진 도입 — foundation 파일 배치

> **위치**: `tsconfig.json:1-26`, `vite.config.js:31-43`, `eslint.config.js:23-62`, `package.json:24,39-40,43-62`, `src/types/` (신설), `src/common/env.js:1-9`, `src/common/env.d.ts:1-10`
> **관련 요구사항**: REQ-20260420-003
> **최종 업데이트**: 2026-04-21 (by inspector, drift reconcile — blue 대비 green carve)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
이미 strict 로 설정된 `tsconfig.json` / 설치된 `typescript` 와 `@types/*` 패키지를 실제 동작하게끔 **최소 `.ts` 파일 + ESLint/lint-staged glob 확장 + typecheck 스크립트 실효화** foundation 을 도입한다. 기존 `.jsx` 대량 변환이나 `prop-types` 제거는 하지 않는다. `typescript-eslint` 파서/플러그인 **전면** 도입은 하지 않는다 (후속 TSK-20260420-33 에서 `.d.ts` 한정 파서 블록만 추가됨, 규칙 세트 미적용).

## 공개 인터페이스
- `src/types/env.d.ts` (신규): Vite env 변수 타입 선언. `/// <reference types="vite/client" />` + `export {}` 로 ambient 보강 지점 확보.
- `src/common/env.js` → `src/common/env.ts` 이식 **또는** 동명 `src/common/env.d.ts` 보조 — 후자 채택. 시그니처 동일:
  - `isDev(): boolean`
  - `isProd(): boolean`
  - `mode(): string`
- `eslint.config.js:45`: `files: ['src/**/*.{js,jsx,ts,tsx}']` (사용자 규칙 블록).
- `eslint.config.js:34`: `files: ['src/**/*.{ts,tsx}', 'src/**/*.d.ts']` (typescript-eslint 파서 블록 — TSK-20260420-33 에서 추가, 규칙 세트 없음).
- `package.json:40`: `"src/**/*.{js,jsx,ts,tsx}": "eslint"` (lint-staged glob 확장).
- `@/types/*` alias 를 최소 1곳 `import type` 로 실사용 (`src/common/env.d.ts:5` → `import type {} from '@/types/env';`).

## 동작
1. `src/types/` 디렉토리 생성 + `env.d.ts` 최소 1 파일 추가.
2. `src/common/env.js` 를 TypeScript 로 노출 — `.d.ts` 보조 채택 (`src/common/env.d.ts`). 의미 불변, 런타임 `.js` 본문 0 수정 (NFR 충족).
3. `eslint.config.js` 의 `files:` 패턴 확장 — `.ts/.tsx` 파일도 lint 대상 (`src/**/*.{js,jsx,ts,tsx}`).
4. `package.json` 의 `lint-staged` glob 확장 — `.ts/.tsx` staging 시 pre-commit 훅이 ESLint 를 돌린다.
5. `npm run typecheck` 실행 → exit 0 + 실제로 `.ts` 파일이 처리됨 (`tsc --noEmit --listFiles | grep -c "src/.*\.ts"` ≥ 1).
6. `npm run test` / `npm run build` 는 Vite `react()` 플러그인(`vite.config.js:31-33`) 이 `.ts/.tsx` 인식하므로 green 유지.
7. `@/types/*` alias 사용 import 1건 이상 등장 → dead alias 해소 (`src/common/env.d.ts:5`).

## 의존성
- 내부: `tsconfig.json` (strict 설정), `vite.config.js` (alias 정합), `eslint.config.js` (flat config), `package.json` (scripts/lint-staged/devDep).
- 외부: `typescript ^6.0.3`, `@types/node ^25.6.0`, `@types/react ^18.3.28` (REQ-20260420-001 완료 시 `^19.x` 로 먼저 전환됨 — 본 spec 은 해당 bump 완료 여부와 독립).
- 역의존: 추후 컴포넌트 `.tsx` 전환 작업 (별도 요구사항).

## 테스트 현황
- [x] `tsconfig.json` 존재 + strict 설정 완료 (baseline).
- [x] `npm run typecheck` 현재 noop 에 가까움 — `.ts/.tsx` 파일 0건 (baseline 2026-04-20).
- [x] foundation 도입 후 `npm run typecheck` exit 0 + `.ts` 파일 ≥1 처리. *(TSK-20260420-32 / ceb9c60 — listFiles grep 2, find 2)*
- [x] foundation 도입 후 `npm run lint` 신규 `.ts` 대상 포함 + pass. *(TSK-20260420-32 / ceb9c60 — 0 warn / 0 error)*
- [x] `lint-staged` 훅이 `.ts` staging 시 ESLint 실행. *(TSK-20260420-32 result.md: husky pre-commit 훅 glob 매칭 2 files + `eslint COMPLETED` 로그 간접 확인)*

## 수용 기준
- [x] (Must) `src/types/env.d.ts` 생성 후 `npm run typecheck` exit 0. *(재실측 2026-04-21 HEAD: exit 0)*
- [x] (Must) `find src -name "*.ts" -o -name "*.tsx" | wc -l` ≥ 1. *(재실측 2026-04-21 HEAD: 2)*
- [x] (Must) `eslint.config.js` 의 사용자 규칙 `files` 가 `src/**/*.{js,jsx,ts,tsx}` 로 확장. *(재실측 HEAD `eslint.config.js:45`)*
- [x] (Must) `package.json` `lint-staged` glob 이 `src/**/*.{js,jsx,ts,tsx}` 로 확장. *(재실측 HEAD `package.json:40`)*
- [x] (Must) `npm run typecheck` 가 exit 0 + `tsc --noEmit --listFiles | grep -c "src/.*\.ts"` ≥ 1. *(재실측 2026-04-21 HEAD: exit 0, grep 결과 2)*
- [x] (Must) `npm run test` / `npm run build` green 유지. *(TSK-20260420-32 / ceb9c60 — 360/360 pass, build 335ms; 이후 HEAD d798635 377/377 pass 유지 — 회귀 0)*
- [x] (Should) `@/types` alias 를 최소 1 import 에서 사용 (dead alias 제거). *(재실측 HEAD `src/common/env.d.ts:5` — `import type {} from '@/types/env';`)*
- [x] (NFR) 기존 `.jsx` 파일 0 수정 (`.d.ts` 로만 타입 주입 가능 시 우선). *(TSK-20260420-32 변경 파일: `src/types/env.d.ts`, `src/common/env.d.ts`, `eslint.config.js`, `package.json` — `.jsx` 0 수정)*
- [ ] (NFR) Vite 빌드 시간 회귀 ±5% 내. **[deferred: 빌드 시간 baseline 수치 박제 없음 — 후속 task 에서 수치 비교 필요]**
- [ ] (NFR) `vite.config.js:73-75` coverage `include` 는 최소 not-break 유지 (필요 시 `.ts` 확장 여부 검토). **[deferred: coverage include `.ts` 확장은 TSK-20260420-32 §관찰 2 에 followup 스텁으로 큐잉됨]**

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `find src -name "*.ts" -o -name "*.tsx"` → 2 files (재실측 2026-04-21 HEAD — 기존 baseline 0 → 2):
    - `src/common/env.d.ts`
    - `src/types/env.d.ts`
  - `tsc --noEmit --listFiles | grep -c "src/.*\.ts"` → 2 (재실측 2026-04-21 HEAD, ≥1 충족).
  - `grep -n "files:" eslint.config.js` → 2 hits (`:34` 파서 블록, `:45` 사용자 규칙 블록).
  - `grep -rn "from '@/types" src/` → 1 hit (`src/common/env.d.ts:5` — `import type` 구문).
- **rationale**: 본 foundation 은 파일·설정 신설 + glob 확장만 수행. 기존 `.jsx` / `.js` 파일 본문은 불변. `typescript-eslint` 파서/플러그인 **전면** 도입, `prop-types` 제거, `.tsx` 대량 전환은 별도 요구사항. 후속 TSK-20260420-33 이 `.ts/.tsx/.d.ts` 한정 파서 블록 (규칙 세트 미적용) 을 추가함 — 본 spec 의 "파서/플러그인 도입 불허" 는 "규칙 세트 적용 금지" 로 해석 가능.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-003 반영) | all |
| 2026-04-21 | inspector / TSK-20260420-32 · ceb9c60 (+ TSK-20260420-33 부수) | drift reconcile — Must 6/6 + Should 1/1 + NFR 1/3 ack (HEAD 재실측 typecheck exit 0, find 2 files, lint-staged/eslint files glob 확장 확인, @/types alias 실사용 확인, test/build green). NFR 빌드 시간/coverage include deferred. | 테스트 현황 / 수용 기준 / 스코프 규칙 |
