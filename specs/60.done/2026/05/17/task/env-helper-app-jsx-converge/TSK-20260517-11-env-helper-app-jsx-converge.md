# Task: `src/App.jsx` 의 `import.meta.env.DEV` 1 hit → `isDev()` 헬퍼 경유 회수

> **Task ID**: TSK-20260517-11
> **출처 spec**: `specs/30.spec/green/common/env.md` §동작 (I1) + §수용 기준 (Must FR-01-b)
> **관련 요구사항**: REQ-20260418-002 FR-01, REQ-20260517-076 FR-01
> **depends_on**: []
> **supersedes**: (해당 없음 — 신규 carve)

## 배경
`common/env.md` (I1) 단일 경유 게이트는 `src/**` non-test 영역에서 `import.meta.env.{DEV,PROD,MODE}` 직접 참조 0 hit 을 박제한다. 본 spec 발행 시점 baseline 은 **1 hit (`src/App.jsx:130`)** 으로, `src/common/env.ts` 의 `isDev()` 헬퍼 도입에도 불구하고 caller 측 회수가 누락된 상태다. 본 task 는 단일 라인 회수로 게이트 0 hit 수렴 + spec §테스트 현황 (I1) marker 플립 입력 박제.

## 변경 범위
| 파일 | 동작 | 핵심 |
|------|------|------|
| `src/App.jsx` | 수정 | `import.meta.env.DEV` 표현식 1 hit → `isDev()` 헬퍼 호출로 치환 + `src/common/env` import 추가. |

## 구현 지시
1. `src/App.jsx` 최상단 import 그룹에 `import { isDev } from './common/env';` 추가 (기존 `./common/...` 다른 import 와 동일 그룹). 경로 alias 사용 시 일관성 유지 — 현 시점 `src/App.jsx` 의 다른 `./common/X` import 패턴과 동일 form.
2. L130 의 `{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}` 를 `{isDev() && <ReactQueryDevtools initialIsOpen={false} />}` 로 치환.
3. `src/common/env.ts` 본문은 무변경 — `isDev()` 가 lazy 평가 (모듈 최상단 캡처 없음) 이므로 caller 측 호출 시점에 `import.meta.env.DEV` 가 빌드타임 리터럴로 치환되어 tree-shake 보존 (spec §동작 I2·I3).
4. `src/App.test.jsx` (또는 동급 회귀 테스트) 의 `vi.stubEnv('DEV', ...)` 패턴은 무변경 — `isDev()` 가 lazy 평가이므로 기존 stub 시퀀스 정합.

## 테스트
- 회귀: `npm test src/App.test.jsx` PASS — `<ReactQueryDevtools>` 분기 (DEV=true / DEV=false) 시나리오가 기존 `vi.stubEnv` 패턴으로 정합 유지.
- 신규 케이스 불필요 — 본 task 는 단일 라인 캡슐화 회수 (동작 동일, 단일 진입점 박제).

## 검증/DoD
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build` (해당 — Vite tree-shake 결과 `isDev()` 호출이 빌드타임 리터럴로 치환되어 prod 번들에서 ReactQueryDevtools 진입 0 hit 유지)
- [ ] grep 게이트 1: `grep -rnE "import\.meta\.env\.(DEV|PROD|MODE)" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "\.test\." | grep -v "setupTests\." | grep -v "common/env\."` → **0 hit** (현 1 hit → 0 hit 회수).
- [ ] grep 게이트 2: `grep -n "isDev" src/App.jsx` → **1+ hit** (import + 호출 — caller 측 헬퍼 경유 박제 확인).
- [ ] 수동 검증: dev 모드 (`vite`) 진입 시 ReactQueryDevtools 표시 + prod build 산출물 (`vite build`) 에서 ReactQueryDevtools 진입 0 hit (tree-shake 보존).

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (HEAD=`81928e1`, 2026-05-17, 본 task 발행 시점 planner dry-run 실측):
  - `grep -rnE "import\.meta\.env\.(DEV|PROD|MODE)" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "\.test\." | grep -v "setupTests\." | grep -v "common/env\."` → **1 hit in 1 file**:
    - `src/App.jsx:130:			{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}`
  - `grep -n "isDev\|from.*common/env" src/App.jsx` → **0 hit** (헬퍼 경유 미진입 baseline).
  - 본 게이트 면제 영역 (전 영역 측정 시점): `src/common/env.ts:5-7` (3 hits — 헬퍼 본문 자체), `src/setupTests.js:8,19` + `src/App.test.jsx:10` + `src/common/{Navigation,common,UserLogin}.test.{tsx,ts}` (test/setupTests 영역 — 6 hits, `vi.stubEnv` 의도 주석 / 인용).
- **rationale**: 본 task 는 `src/App.jsx:130` 1 hit 회수 한정 — 면제 영역 (test / setupTests / common/env 본 모듈) 은 expansion 불허로 무변경. 회수 후 게이트 0 hit 으로 spec §테스트 현황 (I1) marker flip 입력 박제. carve 1건 단위로 분할 — `src/**` 다른 모듈에서 신규 `import.meta.env.{DEV,PROD,MODE}` 발견 시 (현 시점 없음) 별 task carve.

## 롤백
단일 `git revert <sha>` 로 가능 — `src/App.jsx` 단일 파일 단일 라인 + import 1줄 변경.

## 범위 밖
- env.md §동작 (I2)(I3)(I4)(I5) marker 는 본 spec 박제 시점 PASS — inspector 영역.
- env.md §수용 기준 (Must FR-01-a) lazy 평가 marker 플립 — inspector 영역 (`§테스트 현황 [x] (I2)` 박제 후 §수용 기준 marker 동기화).
- `vite.config.{js,ts}` / `vitest.config.{js,ts}` / 빌드 스크립트의 `import.meta.env` 참조 — spec §동작 (I5) 범위 밖.
- `VITE_*` 키 진입점 (`vite-env-boundary-typing.md` 영역) — 별 spec / 직교.
