# `src/Log/` 컴포넌트 island 수렴 — `.jsx`/`.js` → `.tsx`/`.ts` 단방향 박제

> **ID**: REQ-20260517-068
> **작성일**: 2026-05-17
> **상태**: Draft

## 개요
`src/Log/` 디렉터리는 본 작성 시점 (HEAD=`b42e36f`) 에 `.jsx` 13건 + `.js` 11건 = **총 24 hit** 의 비-TS 파일을 보유하며, 기 island 확정 6 디렉터리 (`src/Comment/`, `src/File/`, `src/Image/`, `src/Search/`, `src/Toaster/`, `src/common/`) 와 함께 `src-typescript-migration` (구 REQ-051) FR-01 의 "Log 후행 수렴" 축으로 박제되어 있었으나, 동 spec 이 2026-05-17 환경 회귀로 `50.blocked/` → followup 승격 → 처리 완료된 후 `30.spec/green/foundation/` 로 복귀 박제되지 않은 상태이다. 본 req 는 `src/Log/` 단일 디렉터리를 island 정의 (확장자 0 hit + typecheck error 0 hit + PropTypes 0 hit — [[20260517-island-prop-types-removal]] FR-01 의 세 축) 에 수렴시키는 결과 효능을 박제 후보로 요청한다. 수단 (rename + tsc 통과 vs codemod vs 점진적 cohort 분할) 선정은 inspector 가 결정하지 않으며 별도 task 위임 — 본 req 는 결과 효능만 박제.

## 배경
- **현장 근거 (HEAD=`b42e36f`, 2026-05-17 실측)**:
  - `find src/Log -name "*.jsx" -o -name "*.js"` → **24 hit**:
    - 컴포넌트 13: `Log.jsx`, `Log.test.jsx`, `LogItem.jsx`, `LogItem.test.jsx`, `LogItemInfo.jsx`, `LogItemInfo.test.jsx`, `LogList.jsx`, `LogSingle.jsx`, `LogSingle.test.jsx`, `Writer.jsx`, `Writer.test.jsx`, `api.js`, `api.mock.js`.
    - 훅 10: `hooks/useCreateLog.js`, `hooks/useCreateLog.test.js`, `hooks/useDeleteLog.js`, `hooks/useDeleteLog.test.js`, `hooks/useLog.js`, `hooks/useLog.test.js`, `hooks/useLogList.js`, `hooks/useLogList.test.js`, `hooks/useUpdateLog.js`, `hooks/useUpdateLog.test.js`.
    - 픽스처 1: `__fixtures__/logs.js`.
  - `grep -rn "PropTypes\|prop-types" src/Log` → 비-island 41 hit (`[[20260517-island-prop-types-removal]]` 배경 baseline 의 `src/Log + src/Monitor` 합산치 중 Log 분; req 파생 spec 박제 시 재실측).
  - `npm run typecheck 2>&1 | grep -E "^src/Log/" | grep -cE "error TS"` → 측정 baseline 박제 필요 (env 회복 직후 inspector 가 박제).
- **선행 박제 (역사)**:
  - `specs/30.spec/blue/foundation/tooling.md:153` 참조 — `specs/30.spec/green/foundation/src-typescript-migration.md` (REQ-051 FR-05) — 현재 경로 부재 (2026-05-17 followup 처리 후 미복귀).
  - `specs/60.done/2026/05/17/followups/20260516-2154-src-typescript-migration-from-blocked.md` — 환경 회귀 해소 후 `src/index.jsx`, `src/reportWebVitals.*`, `src/setupTests.js` carve 후보 명시. 본 req 는 동 followup 의 carve 후보 외부 (Log 별 디렉터리 단위).
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062) — island 정의 3 축 박제 (확장자 + typecheck error 0 + PropTypes 0).
- **선행 spec (관련 컴포넌트)**:
  - `specs/30.spec/blue/components/log.md` — `src/Log/` 컴포넌트 계약·외부 의존성 박제. 본 req 의 island 수렴은 동 spec §외부 의 `prop-types` 항목 제거를 부수 효과로 동반 (단, 본 req 는 island 수렴 단일 축 박제, prop-types 제거는 [[20260517-island-prop-types-removal]] FR 의 island 확장 시 자동 적용에 위임).
- **본 req 가 박제하지 않는 것 (RULE-07 정합)**:
  - 마이그레이션 수단 — rename + 점진적 type 추가 vs codemod vs cohort 분할 vs strict mode 점진 도입 (수단 중립).
  - 변환 순서 — api 먼저 vs 컴포넌트 먼저 vs 훅 먼저 (수단 중립).
  - 타입 정의 상세 — `LogProps` interface 의 구체 필드 시그니처 (구현 위임).
  - test 파일 변환 (`.test.jsx` → `.test.tsx`) 의 RTL/vitest API 시그니처 변경 — 별 spec 후보 (test-idioms 영역).
  - typescript devDep 버전·tsconfig 설정 — `[[20260517-toolchain-version-coherence]]` 영역.
  - bundle 사이즈 영향 — `[[20260517-island-prop-types-removal]]` FR-06 영역.

## 목표
- **In-Scope**:
  - `src/Log/` 디렉터리 island 수렴 — 확장자·typecheck·PropTypes 3 축 동시 0 hit.
  - 훅 (`src/Log/hooks/`) 및 픽스처 (`src/Log/__fixtures__/`) 도 수렴 대상에 포함.
  - 본 수렴 후 [[20260517-island-prop-types-removal]] FR-02 의 island 디렉터리 집합에 `src/Log/` 가 자동 진입.
- **Out-of-Scope**:
  - `src/Monitor/` 수렴 — `[[20260517-monitor-island-convergence]]` 영역.
  - src 루트 진입 파일 (`App.jsx`, `index.jsx`, `reportWebVitals.{js,test.js}`, `setupTests.js`, `setupTests.timer-idiom.test.jsx`, `App.test.jsx`) — `[[20260517-root-entry-island-convergence]]` 영역.
  - typescript 환경 회귀 해소 — `[[20260517-toolchain-version-coherence]]` 영역.
  - 비-Log 디렉터리의 PropTypes 제거 — `[[20260517-island-prop-types-removal]]` 영역.
  - React 19 bump.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `src/Log/` 직계 + 하위 디렉터리 (`hooks/`, `__fixtures__/`) 모두에서 `.jsx`/`.js` (단, `.d.ts` 제외) 파일이 0 hit 이어야 한다. 측정: `find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit. baseline 24 hit. | Must |
| FR-02 | `src/Log/` 의 typecheck error 가 0 hit 이어야 한다. 측정: `npm run typecheck 2>&1 \| grep -E "^src/Log/" \| grep -cE "error TS"` → 0 hit. | Must |
| FR-03 | `src/Log/` 의 PropTypes 잔존이 0 hit 이어야 한다. 측정: `grep -rn "PropTypes\|prop-types" src/Log` → 0 hit. 본 게이트는 [[20260517-island-prop-types-removal]] FR-02 의 island 디렉터리 집합 확장으로 자동 충족. | Must |
| FR-04 | `src/Log/` 의 모든 기존 test (`*.test.jsx` → `*.test.tsx`, `hooks/*.test.js` → `hooks/*.test.ts`) 가 변환 후에도 동일 어설션 효능을 유지하며 `npm test -- src/Log` 의 통과 it 수가 변환 전후 동일하다. baseline 박제 — 변환 직전 `npm test -- src/Log --reporter=verbose 2>&1 \| grep -cE "✓"` 실측 후 spec §스코프 규칙 grep-baseline 에 박제. | Must |
| FR-05 | `src/Log/` island 수렴 후 동 디렉터리는 [[20260517-island-prop-types-removal]] FR-02 의 island 디렉터리 집합 (현 5 디렉터리: Comment/File/Image/Toaster/common — 추가로 Search 박제 중) 에 자동 합류해야 한다. island 확장 자동 추종 게이트 ([[20260517-island-prop-types-removal]] FR-04) 와 정합. | Must |
| FR-06 | 본 효능 도입 후 `src/Log/` 외부 파일의 `import` 경로가 정상 resolver 동치 ([[20260517-path-alias-resolver-coherence]]) 로 동작해야 한다 — 확장자 변경이 외부 import 의 명시적 확장자 (`import Log from './Log/Log.jsx'`) 또는 절대 경로 (`import Log from 'src/Log/Log.jsx'`) 의 fail-fast 신호를 검출. | Should |
| FR-07 | 수단 라벨 금지 (RULE-07 정합) — 본 req 파생 spec/task 본문에서 마이그레이션 수단 (rename, codemod, cohort 분할, strict 점진) 에 "기본값" / "권장" / "우선" / "default" / "best practice" 라벨 부여 금지. | Must |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 시점 비의존 | 본 req 파생 spec 은 `src/Log/` 의 24 파일 목록을 본문에 박제하지 않는다. §스코프 규칙 grep-baseline 에만 박제. 효능은 "Log/ island 수렴" 평서문. |
| NFR-02 | 게이트 단일성 | 3 축 (확장자/typecheck/PropTypes) 각 단일 grep 또는 find 명령으로 측정 가능. island 정의 자체와 정합 ([[20260517-island-prop-types-removal]] FR-01). |
| NFR-03 | island 정의 정합 | FR-01·02·03 의 AND 충족 시 `src/Log/` 가 island 디렉터리 정의에 진입. 한 축 위반은 다른 축의 게이트를 자동 충족시키지 않는다. |
| NFR-04 | 멱등성 | 본 효능 도입 후 동일 게이트 반복 적용 시 동일 결과. |
| NFR-05 | RULE-07 정합 | island 수렴 결과 효능만 박제. 1회성 진단·incident 귀속 부재. |
| NFR-06 | 비-Log 비파괴 | 본 효능 도입은 `src/Log/` 외부 (`src/Monitor/`, `src/Comment/` 등) 파일 변경을 동반하지 않는다 — 단, 외부 import 의 확장자 명시가 본 디렉터리 파일을 가리키는 경우 (FR-06) 는 동반 변경 허용. |

## 수용 기준
- [ ] Given HEAD=`b42e36f`, When `find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" \| wc -l` 실행, Then 24 hit (baseline).
- [ ] Given FR-01 효능 도입 완료, When 동일 find 명령, Then 0 hit.
- [ ] Given FR-02 효능 도입 완료, When `npm run typecheck 2>&1 \| grep -E "^src/Log/" \| grep -cE "error TS"`, Then 0 hit.
- [ ] Given FR-03 효능 도입 완료, When `grep -rn "PropTypes\|prop-types" src/Log`, Then 0 hit.
- [ ] Given FR-04 baseline 박제 후 변환 완료, When `npm test -- src/Log` 실행, Then 통과 it 수가 baseline 과 동일.
- [ ] Given 본 req 파생 spec, When `grep -nE "기본값|권장|우선|default|best" specs/30.spec/green/**/<spec>`, Then 0 hit (FR-07 자기 검증).
- [ ] Given `src/Log/` island 수렴 후, When [[20260517-island-prop-types-removal]] FR-02 측정 명령 실행, Then island 디렉터리 집합에 `src/Log/` 자동 포함 (FR-05 자동 추종).

## 참고
- **선행 (전제)**:
  - `[[20260517-island-prop-types-removal]]` (REQ-062) — island 정의 3 축 박제. 본 req 의 FR-01~03 정합 근거.
  - `[[20260517-toolchain-version-coherence]]` (REQ-061) — typescript devDep ↔ installed major 정합. 본 req 의 FR-02 측정 환경 전제.
  - `[[20260517-path-alias-resolver-coherence]]` (REQ-065) — vite alias ↔ tsconfig paths 동치. 본 req FR-06 측정 환경 전제.
  - `specs/60.done/2026/05/17/followups/20260516-2154-src-typescript-migration-from-blocked.md` — 환경 회귀 해소 후 carve 후보 명시 (단, 본 req 는 followup 의 carve 후보 외부 — 디렉터리 단위 별 req).
- **직교 축 (동등)**:
  - `[[20260517-monitor-island-convergence]]` (REQ-069) — `src/Monitor/` 수렴. 본 req 와 디렉터리 직교.
  - `[[20260517-root-entry-island-convergence]]` (REQ-070) — src 루트 진입 파일 수렴. 본 req 와 위치 직교.
- **현장 근거 (HEAD=`b42e36f`, 2026-05-17 실측)**:
  - `find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" \| wc -l` → 24.
  - 직계: 13 hit (Log/LogItem/LogItemInfo/LogList/LogSingle/Writer 의 .jsx + .test.jsx + api.js + api.mock.js).
  - `hooks/`: 10 hit (useCreateLog/useDeleteLog/useLog/useLogList/useUpdateLog 의 .js + .test.js).
  - `__fixtures__/`: 1 hit (logs.js).
- **외부 레퍼런스**:
  - TypeScript 공식 — `.ts`/`.tsx` 확장자 의미 + `allowJs` 옵션 (`tsconfig.json` 미설정 = .ts/.tsx만 컴파일 모집단).
  - React 공식 — `.tsx` 확장자는 JSX 포함 TS 파일, `.ts` 는 JSX 미포함 TS 파일.
- **RULE 준수 자기 검증**:
  - RULE-07: FR-01~06 모두 평서형 효능 / 시점 비의존 / 반복 검증 가능 / incident 귀속 부재. FR-07 수단 라벨 금지 자기 검증.
  - RULE-06: 본 req 파생 spec 박제 시 §스코프 규칙 grep-baseline 에 24 hit + 디렉터리 분포 박제 필수.
  - RULE-01: 본 req `specs/20.req/` create only. 파생 spec 박제는 inspector writer 영역.
