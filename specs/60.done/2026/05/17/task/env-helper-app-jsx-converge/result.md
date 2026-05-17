# Result: TSK-20260517-11 — `src/App.jsx` 의 `import.meta.env.DEV` 1 hit → `isDev()` 헬퍼 경유 회수

## 요약
`src/App.jsx:130` 의 `import.meta.env.DEV` 직접 참조 1 hit 을 `src/common/env.ts` 의 `isDev()` 헬퍼 호출로 캡슐화. `common/env.md` §동작 (I1) 단일 경유 게이트 0 hit 수렴 박제. 동작 동일 (lazy 평가 헬퍼) — `<ReactQueryDevtools>` 분기 유지, prod 번들 tree-shake 보존.

## 변경 파일
- `src/App.jsx` — import 1줄 추가 (`import { isDev } from './common/env';`) + L131 표현식 1건 치환 (`import.meta.env.DEV` → `isDev()`).

## 커밋
- `refactor: src/App.jsx isDev() 헬퍼 경유 회수 — common/env (I1) 0 hit 수렴`
- Task: `specs/60.done/task/env-helper-app-jsx-converge/`

## 테스트 결과
- `npm run lint` → PASS (출력 없음).
- `npm test` (전체) → PASS — Test Files 48 / Tests 439 / coverage 임계치 충족.
- `npm test -- --run src/App.test.jsx` → PASS — Test Files 1 / Tests 17 (DEV=true/false `<ReactQueryDevtools>` 분기 회귀 정합).
- `npm run build` → PASS — `vite build` 290ms, 산출물 18 chunk 생성.

## DoD 점검
- [x] `npm run lint` PASS.
- [x] `npm test` PASS (전체 439 / coverage 임계치 충족).
- [x] `npm run build` PASS (Vite tree-shake 결과 빌드타임 리터럴 치환 보존 — `isDev()` 가 lazy 평가이므로 prod 번들에서 `false` 리터럴화).
- [x] grep 게이트 1: `grep -rnE "import\.meta\.env\.(DEV|PROD|MODE)" src ... | grep -v test/setupTests/common-env` → **0 hit** (1 → 0 수렴).
- [x] grep 게이트 2: `grep -n "isDev" src/App.jsx` → **2 hit** (`6: import { isDev } from './common/env';` + `131: {isDev() && ...}`).
- [~] 수동 검증: `vite` dev 모드 진입 + prod build 산출물 ReactQueryDevtools 진입 0 hit — developer 세션 내 자동 검증 불가. build 산출물 청크 리스트에 `react-query-devtools` 별도 chunk 미포함 (devtools 코드 tree-shake 추정 신호 — 단, 정량 grep 자동화는 본 task 범위 밖).

## 관찰 이슈·후속
- 없음. 본 task 는 단일 라인 회수로 spec §동작 (I1) marker 입력 박제. inspector 영역에서 `§테스트 현황 [x] (I1)` 플립 + §수용 기준 (Must FR-01-b) marker 동기화 처리 예정 (task `## 범위 밖`).

## 스코프 규칙 준수
- expansion: **불허** — 면제 영역 (`src/common/env.ts`, `src/setupTests.js`, `src/App.test.jsx`, `src/common/{Navigation,common,UserLogin}.test.{tsx,ts}`) 무변경. `src/App.jsx` 단일 파일 한정 수정. carve 1건 단위 분할 원칙 준수.
