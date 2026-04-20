# TypeScript 점진 도입 — foundation 파일 배치

> **위치**: `tsconfig.json:1-26`, `vite.config.js:31-43`, `eslint.config.js:23-62`, `package.json:24,39-40,43-62`, `src/types/` (신설), `src/common/env.js:1-9`
> **관련 요구사항**: REQ-20260420-003
> **최종 업데이트**: 2026-04-20 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
이미 strict 로 설정된 `tsconfig.json` / 설치된 `typescript` 와 `@types/*` 패키지를 실제 동작하게끔 **최소 `.ts` 파일 + ESLint/lint-staged glob 확장 + typecheck 스크립트 실효화** foundation 을 도입한다. 기존 `.jsx` 대량 변환이나 `prop-types` 제거는 하지 않는다. `typescript-eslint` 파서/플러그인 도입도 하지 않는다.

## 공개 인터페이스
- `src/types/env.d.ts` (신규): Vite env 변수 타입 선언 (최소 `VITE_LOG_API_BASE` 등 실제 사용 변수).
- `src/common/env.js` → `src/common/env.ts` 이식 **또는** 동명 `src/common/env.d.ts` 보조. 둘 중 하나 선택. 시그니처 동일:
  - `isDev(): boolean`
  - `isProd(): boolean`
  - `mode(): string`
- `eslint.config.js:30`: `files: ['src/**/*.{js,jsx,ts,tsx}']`
- `package.json:40`: `"src/**/*.{js,jsx,ts,tsx}": "eslint"`
- `@/types/*` alias 를 최소 1곳 import 로 실사용 (dead alias 제거).

## 동작
1. `src/types/` 디렉토리 생성 + `env.d.ts` 최소 1 파일 추가.
2. `src/common/env.js` 를 TypeScript 로 노출 (확장자 전환 **또는** `.d.ts` 보조). 의미 불변.
3. `eslint.config.js` 의 `files:` 패턴 확장 — 이후 `.ts/.tsx` 파일도 lint 대상.
4. `package.json` 의 `lint-staged` glob 확장 — `.ts/.tsx` staging 시 pre-commit 훅이 ESLint 를 돌린다.
5. `npm run typecheck` 실행 → exit 0 + 실제로 `.ts` 파일이 처리됨 (`tsc --noEmit --listFiles | grep -c "src/.*\.ts"` ≥ 1).
6. `npm run test` / `npm run build` 는 Vite `react()` 플러그인(`vite.config.js:31-33`) 이 `.ts/.tsx` 인식하므로 green 유지.
7. `@/types/*` alias 사용 import 1건 이상 등장 → dead alias 해소.

## 의존성
- 내부: `tsconfig.json` (strict 설정), `vite.config.js` (alias 정합), `eslint.config.js` (flat config), `package.json` (scripts/lint-staged/devDep).
- 외부: `typescript ^6.0.3`, `@types/node`, `@types/react ^18.3.28` (REQ-20260420-001 완료 시 `^19.x` 로 먼저 전환됨 — 본 spec 은 해당 bump 완료 여부와 독립).
- 역의존: 추후 컴포넌트 `.tsx` 전환 작업 (별도 요구사항).

## 테스트 현황
- [x] `tsconfig.json` 존재 + strict 설정 완료 (baseline).
- [x] `npm run typecheck` 현재 noop 에 가까움 — `.ts/.tsx` 파일 0건 (baseline 2026-04-20).
- [ ] foundation 도입 후 `npm run typecheck` exit 0 + `.ts` 파일 ≥1 처리.
- [ ] foundation 도입 후 `npm run lint` 신규 `.ts` 대상 포함 + pass.
- [ ] `lint-staged` 훅이 `.ts` staging 시 ESLint 실행.

## 수용 기준
- [ ] (Must) `src/types/env.d.ts` 생성 후 `npm run typecheck` exit 0.
- [ ] (Must) `find src -name "*.ts" -o -name "*.tsx" | wc -l` ≥ 1.
- [ ] (Must) `eslint.config.js:30` 의 `files` 가 `src/**/*.{js,jsx,ts,tsx}` 로 확장.
- [ ] (Must) `package.json` `lint-staged` glob 이 `src/**/*.{js,jsx,ts,tsx}` 로 확장.
- [ ] (Must) `npm run typecheck` 가 exit 0 + `tsc --noEmit --listFiles | grep -c "src/.*\.ts"` ≥ 1.
- [ ] (Must) `npm run test` / `npm run build` green 유지.
- [ ] (Should) `@/types` alias 를 최소 1 import 에서 사용 (dead alias 제거).
- [ ] (NFR) 기존 `.jsx` 파일 0 수정 (`.d.ts` 로만 타입 주입 가능 시 우선).
- [ ] (NFR) Vite 빌드 시간 회귀 ±5% 내.
- [ ] (NFR) `vite.config.js:73-75` coverage `include` 는 최소 not-break 유지 (필요 시 `.ts` 확장 여부 검토).

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `find src -name "*.ts" -o -name "*.tsx"` → 0 files (baseline, 2026-04-20).
  - `ls src/types 2>/dev/null` → absent (baseline).
- **rationale**: 본 foundation 은 파일·설정 신설 + glob 확장만 수행. 기존 `.jsx` / `.js` 파일 본문은 불변. `typescript-eslint` 플러그인, `prop-types` 제거, `.tsx` 대량 전환은 별도 요구사항.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-003 반영) | all |
