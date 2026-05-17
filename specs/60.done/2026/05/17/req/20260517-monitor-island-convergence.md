# `src/Monitor/` 컴포넌트 island 수렴 — `.jsx`/`.js` → `.tsx`/`.ts` 단방향 박제

> **ID**: REQ-20260517-069
> **작성일**: 2026-05-17
> **상태**: Draft

## 개요
`src/Monitor/` 디렉터리는 본 작성 시점 (HEAD=`b42e36f`) 에 `.jsx` 14건 + `.js` 3건 = **총 17 hit** 의 비-TS 파일을 보유하며, 기 island 확정 6 디렉터리 (`src/Comment/`, `src/File/`, `src/Image/`, `src/Search/`, `src/Toaster/`, `src/common/`) 와 함께 `src-typescript-migration` (구 REQ-051) FR-02 의 "Monitor 후행 수렴" 축으로 박제되어 있었으나, 동 spec 이 2026-05-17 환경 회귀로 `50.blocked/` → followup 승격 → 처리 완료된 후 `30.spec/green/foundation/` 로 복귀 박제되지 않은 상태이다. 본 req 는 `src/Monitor/` 단일 디렉터리를 island 정의 (확장자 0 hit + typecheck error 0 hit + PropTypes 0 hit — [[20260517-island-prop-types-removal]] FR-01 의 세 축) 에 수렴시키는 결과 효능을 박제 후보로 요청한다. 수단 선정은 inspector 가 결정하지 않으며 별도 task 위임.

## 배경
- **현장 근거 (HEAD=`b42e36f`, 2026-05-17 실측)**:
  - `find src/Monitor \( -name "*.jsx" -o -name "*.js" \)` → **17 hit**:
    - 컴포넌트 14: `Monitor.jsx`, `Monitor.test.jsx`, `ApiCallMon.jsx`, `ApiCallItem.jsx`, `ApiCallItem.test.jsx`, `ContentMon.jsx`, `ContentItem.jsx`, `ContentItem.test.jsx`, `VisitorMon.jsx`, `VisitorMon.test.jsx`, `WebVitalsMon.jsx`, `WebVitalsMon.test.jsx`, `WebVitalsItem.jsx`, `WebVitalsItem.test.jsx`.
    - api 2: `api.js`, `api.mock.js`.
    - 픽스처 1: `__fixtures__/monitor.js`.
  - `grep -rn "PropTypes\|prop-types" src/Monitor` → 비-island PropTypes 잔존 (`[[20260517-island-prop-types-removal]]` 배경의 `src/Log + src/Monitor` 합산 41 hit 중 Monitor 분).
  - `npm run typecheck 2>&1 | grep -E "^src/Monitor/" | grep -cE "error TS"` → 측정 baseline 박제 필요 (env 회복 직후 inspector 가 박제).
- **선행 박제 (역사)**:
  - `specs/30.spec/blue/foundation/tooling.md:153` 참조 — `specs/30.spec/green/foundation/src-typescript-migration.md` (REQ-051 FR-05) — 현재 경로 부재.
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062) — island 정의 3 축 박제.
- **선행 spec (관련 컴포넌트)**:
  - `specs/30.spec/blue/components/monitor.md` — `src/Monitor/` 컴포넌트 계약·외부 의존성 박제. 본 req 의 island 수렴은 동 spec §외부 의 `prop-types` 항목 제거를 부수 효과로 동반.
- **본 req 가 박제하지 않는 것 (RULE-07 정합)**:
  - 마이그레이션 수단 — rename 단방향 vs codemod vs cohort 분할 (수단 중립).
  - 변환 순서 — Mon (집약 컴포넌트) 먼저 vs Item (요소 컴포넌트) 먼저 vs api 먼저 (수단 중립).
  - 타입 정의 상세 — `MonitorProps`/`WebVitalsItemProps` interface 의 구체 필드.
  - test 파일 변환 (`.test.jsx` → `.test.tsx`) 의 RTL/vitest API 시그니처 변경 — 별 spec 후보.
  - typescript 환경 — `[[20260517-toolchain-version-coherence]]` 영역.
  - PropTypes 제거 자체 — `[[20260517-island-prop-types-removal]]` 영역의 island 확장 자동 적용.

## 목표
- **In-Scope**:
  - `src/Monitor/` 디렉터리 island 수렴 — 확장자·typecheck·PropTypes 3 축 동시 0 hit.
  - 픽스처 (`src/Monitor/__fixtures__/`) 도 수렴 대상 포함.
  - 본 수렴 후 [[20260517-island-prop-types-removal]] FR-02 의 island 디렉터리 집합에 `src/Monitor/` 자동 진입.
- **Out-of-Scope**:
  - `src/Log/` 수렴 — `[[20260517-log-island-convergence]]` 영역.
  - src 루트 진입 파일 — `[[20260517-root-entry-island-convergence]]` 영역.
  - typescript 환경 회귀 해소 — `[[20260517-toolchain-version-coherence]]` 영역.
  - React 19 bump.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `src/Monitor/` 직계 + 하위 디렉터리 (`__fixtures__/`) 모두에서 `.jsx`/`.js` (단 `.d.ts` 제외) 파일이 0 hit. 측정: `find src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit. baseline 17 hit. | Must |
| FR-02 | `src/Monitor/` 의 typecheck error 가 0 hit. 측정: `npm run typecheck 2>&1 \| grep -E "^src/Monitor/" \| grep -cE "error TS"` → 0 hit. | Must |
| FR-03 | `src/Monitor/` 의 PropTypes 잔존이 0 hit. 측정: `grep -rn "PropTypes\|prop-types" src/Monitor` → 0 hit. [[20260517-island-prop-types-removal]] FR-02 의 island 집합 확장으로 자동 충족. | Must |
| FR-04 | `src/Monitor/` 의 모든 기존 test (`*.test.jsx` → `*.test.tsx`) 가 변환 후 동일 어설션 효능 유지 — `npm test -- src/Monitor` 의 통과 it 수가 변환 전후 동일. baseline 박제 필수. | Must |
| FR-05 | `src/Monitor/` island 수렴 후 동 디렉터리가 island 정의 집합에 자동 합류 — island 확장 자동 추종 게이트 ([[20260517-island-prop-types-removal]] FR-04) 정합. | Must |
| FR-06 | 외부 import 경로 resolver 동치 — 확장자 변경 시 외부 코드의 명시적 확장자 import 가 fail-fast 신호로 검출. ([[20260517-path-alias-resolver-coherence]] 정합) | Should |
| FR-07 | 수단 라벨 금지 (RULE-07 정합) — 본 req 파생 spec/task 본문에서 마이그레이션 수단에 "기본값" / "권장" / "우선" / "default" / "best practice" 라벨 부여 금지. | Must |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 시점 비의존 | 17 파일 목록을 본문에 박제하지 않는다 — §스코프 규칙 grep-baseline 에만 박제. |
| NFR-02 | 게이트 단일성 | 3 축 각 단일 grep/find 명령으로 측정 가능. |
| NFR-03 | island 정의 정합 | FR-01·02·03 의 AND 충족 시 island 진입. |
| NFR-04 | 멱등성 | 동일 게이트 반복 시 동일 결과. |
| NFR-05 | RULE-07 정합 | 결과 효능만 박제. 1회성 진단 부재. |
| NFR-06 | 비-Monitor 비파괴 | `src/Monitor/` 외부 변경 동반 없음 (외부 import 의 확장자 명시 정정 제외). |

## 수용 기준
- [ ] Given HEAD=`b42e36f`, When `find src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" \| wc -l`, Then 17 hit (baseline).
- [ ] Given FR-01 효능 도입 완료, When 동일 find 명령, Then 0 hit.
- [ ] Given FR-02 효능 도입 완료, When `npm run typecheck 2>&1 \| grep -E "^src/Monitor/" \| grep -cE "error TS"`, Then 0 hit.
- [ ] Given FR-03 효능 도입 완료, When `grep -rn "PropTypes\|prop-types" src/Monitor`, Then 0 hit.
- [ ] Given FR-04 baseline 박제 후 변환 완료, When `npm test -- src/Monitor`, Then 통과 it 수 baseline 과 동일.
- [ ] Given 본 req 파생 spec, When `grep -nE "기본값|권장|우선|default|best" specs/30.spec/green/**/<spec>`, Then 0 hit (FR-07 자기 검증).
- [ ] Given `src/Monitor/` island 수렴 후, When [[20260517-island-prop-types-removal]] FR-02 측정, Then island 디렉터리 집합에 `src/Monitor/` 자동 포함.

## 참고
- **선행 (전제)**:
  - `[[20260517-island-prop-types-removal]]` (REQ-062) — island 정의 3 축 박제.
  - `[[20260517-toolchain-version-coherence]]` (REQ-061) — typescript devDep 정합 (FR-02 측정 환경 전제).
  - `[[20260517-path-alias-resolver-coherence]]` (REQ-065) — alias ↔ paths 동치 (FR-06 전제).
- **직교 축 (동등)**:
  - `[[20260517-log-island-convergence]]` (REQ-068) — `src/Log/` 수렴. 디렉터리 직교.
  - `[[20260517-root-entry-island-convergence]]` (REQ-070) — 루트 진입 파일 수렴. 위치 직교.
- **현장 근거 (HEAD=`b42e36f`, 2026-05-17 실측)**:
  - `find src/Monitor \( -name "*.jsx" -o -name "*.js" \) \| wc -l` → 17.
  - 직계: 16 hit (Monitor + 4 Mon (집약) + 4 Item (요소) + 각 test + api/api.mock).
  - `__fixtures__/`: 1 hit (monitor.js).
- **외부 레퍼런스**:
  - TypeScript 공식 — `.ts`/`.tsx` 의미.
  - React 공식 — `.tsx` JSX 포함 식별.
- **RULE 준수 자기 검증**:
  - RULE-07: FR-01~06 평서형 효능 / 시점 비의존 / 반복 검증 가능 / incident 귀속 부재. FR-07 자기 검증.
  - RULE-06: 파생 spec §스코프 규칙 grep-baseline 에 17 hit 박제 필수.
  - RULE-01: 본 req create only. 파생 spec 박제는 inspector writer 영역.
