# src 루트 진입 파일 island 수렴 — `App`/`index`/`reportWebVitals`/`setupTests` `.jsx`/`.js` → `.tsx`/`.ts` 박제

> **ID**: REQ-20260517-070
> **작성일**: 2026-05-17
> **상태**: Draft

## 개요
`src/` 직계 (maxdepth=1) 는 본 작성 시점 (HEAD=`b42e36f`) 에 `.jsx` 3건 + `.js` 4건 = **총 7 hit** 의 비-TS 파일을 보유한다: `App.jsx`, `App.test.jsx`, `index.jsx`, `reportWebVitals.js`, `reportWebVitals.test.js`, `setupTests.js`, `setupTests.timer-idiom.test.jsx`. 이 7 파일은 `src-typescript-migration` (구 REQ-051) 의 island 정의 (`find src -name "*.jsx" \| wc -l` 단축형이 0 으로 수렴하는 종착 조건) 의 마지막 잔존 카테고리이며, `60.done/2026/05/17/followups/20260516-2154-src-typescript-migration-from-blocked.md` 의 carve 후보 (1) `src/index.jsx → src/index.tsx`, (2) `src/reportWebVitals.{js→ts}` + test 동시, (3) `src/setupTests.{js→ts}` 단독 — 으로 명시되어 있으나 `App.jsx` + `App.test.jsx` + `setupTests.timer-idiom.test.jsx` 는 동 followup 에 미열거된 추가 잔존이다. 본 req 는 src 직계 7 파일 일괄을 island 정의에 수렴시키는 결과 효능을 박제 후보로 요청한다. 수단 선정은 inspector 가 결정하지 않는다.

## 배경
- **현장 근거 (HEAD=`b42e36f`, 2026-05-17 실측)**:
  - `find src -maxdepth 1 \( -name "*.jsx" -o -name "*.js" \)` → **7 hit**:
    - 엔트리 컴포넌트 2: `App.jsx`, `index.jsx`.
    - 엔트리 테스트 2: `App.test.jsx`, `setupTests.timer-idiom.test.jsx`.
    - 보조 모듈 + test 2: `reportWebVitals.js`, `reportWebVitals.test.js`.
    - 테스트 셋업 1: `setupTests.js`.
  - `grep -rn "PropTypes\|prop-types" src/App.jsx src/index.jsx src/reportWebVitals.js src/setupTests.js` → baseline 박제 필요 (env 회복 직후 inspector 박제).
  - `npm run typecheck 2>&1 | grep -E "^src/(App|index|reportWebVitals|setupTests)\." | grep -cE "error TS"` → 측정 baseline 박제 필요.
- **선행 박제 (역사)**:
  - `specs/60.done/2026/05/17/followups/20260516-2154-src-typescript-migration-from-blocked.md` — env 회복 후 carve 후보 3건 명시 (index / reportWebVitals 쌍 / setupTests). 본 req 는 동 후보를 포함 + `App.jsx`/`App.test.jsx`/`setupTests.timer-idiom.test.jsx` 잔존 3건을 추가.
  - `specs/30.spec/blue/components/app.md` (존재 확인 필요) — `src/App.jsx` 의 라우팅·진입 점 박제. 본 req 의 island 수렴은 동 spec 의 contract 비파괴 보장 하에 수행.
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062) — island 정의 3 축.
- **본 req 가 박제하지 않는 것 (RULE-07 정합)**:
  - 마이그레이션 수단 (rename / codemod / 부분 분할 / 단일 PR 일괄).
  - 변환 순서 — entry (`index.jsx`) 먼저 vs leaf (`reportWebVitals.js`) 먼저.
  - 타입 정의 상세 — `App` 컴포넌트의 props 시그니처 (props 없음 가정 검증 별도).
  - `setupTests.ts` 의 ambient global declaration 박제 — `[[20260517-tsconfig-test-ambient-globals]]` (followup 처리 완료 항목) 영역.
  - `vite.config.test.js` (프로젝트 루트, src 외) — `[[20260517-test-discovery-population-coherence]]` (REQ-067) 영역.
  - `setupTests.timer-idiom.test.jsx` 의 timer idiom 의미 변경 — `specs/30.spec/blue/common/test-idioms.md` 영역.
  - typescript 환경 — `[[20260517-toolchain-version-coherence]]` 영역.

## 목표
- **In-Scope**:
  - src 직계 (`-maxdepth 1`) 7 파일 모두 island 정의 진입 — 확장자 0 hit + typecheck error 0 hit + PropTypes 0 hit (해당 시).
  - 본 수렴 완료 후 `find src \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` 의 src 전역 잔존이 (Log + Monitor 수렴 전제 시) 0 hit 으로 수렴 — src-typescript-migration 의 단축형 island 정의 종착.
- **Out-of-Scope**:
  - `src/Log/` 수렴 — `[[20260517-log-island-convergence]]` 영역.
  - `src/Monitor/` 수렴 — `[[20260517-monitor-island-convergence]]` 영역.
  - 프로젝트 루트 `vite.config.test.js` — `[[20260517-test-discovery-population-coherence]]` 영역.
  - `setupTests.timer-idiom.test.jsx` 의 timer idiom 의미 (test-idioms 영역).
  - typescript 환경 회귀 해소.
  - React 19 bump.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | src 직계 (`-maxdepth 1`) 의 `.jsx`/`.js` (단, `.d.ts` 제외) 파일이 0 hit. 측정: `find src -maxdepth 1 \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit. baseline 7 hit. | Must |
| FR-02 | src 직계 7 파일의 typecheck error 가 0 hit. 측정: `npm run typecheck 2>&1 \| grep -E "^src/(App\|index\|reportWebVitals\|setupTests)\." \| grep -cE "error TS"` → 0 hit. | Must |
| FR-03 | src 직계 7 파일의 PropTypes 잔존이 0 hit. 측정: `grep -rn --include="*.tsx" --include="*.ts" "PropTypes\|prop-types" src/App.* src/index.* src/reportWebVitals.* src/setupTests.*` → 0 hit (현 baseline 시점 잔존 여부 inspector 가 실측 후 박제). | Should |
| FR-04 | src 직계 기존 test 4건 (`App.test.jsx`, `reportWebVitals.test.js`, `setupTests.timer-idiom.test.jsx`, `setupTests.js` 자체는 setup) 의 어설션 효능이 변환 전후 동일 — baseline 박제 후 `npm test` 통과 it 수가 동일. | Must |
| FR-05 | `index.jsx` → `index.tsx` 변환 시 `package.json:21` `"test": "vitest run --coverage"` / `index.html` entrypoint 의 명시적 확장자 참조가 fail-fast 없이 동작. (`vite.config.js` 의 default entry 처리 + `index.html:<script type="module" src="...">` 패턴 검증) | Should |
| FR-06 | `setupTests.js` → `setupTests.ts` 변환 시 `vite.config.js:test.setupFiles` 또는 default 패턴이 신규 경로를 fail-fast 없이 인식. 측정: `npm test -- --run` rc=0 (또는 변환 전후 통과 it 수 동일). | Should |
| FR-07 | `reportWebVitals.js` + `reportWebVitals.test.js` 쌍 변환 시 동시 스위칭 — 한쪽만 변환 시 import 경로 또는 test discovery 비대칭 발생 신호 (FR-05 와 동등 패턴). | Should |
| FR-08 | 본 효능 도입 후 src 전역 island 종착 (Log + Monitor + 본 req 모두 충족 가정 시) — `find src \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit. 단, 본 게이트는 본 req 단독 충족 게이트 아니며 [[20260517-log-island-convergence]] + [[20260517-monitor-island-convergence]] AND 충족 시 자동 진입 박제. | Should |
| FR-09 | 수단 라벨 금지 (RULE-07 정합) — 본 req 파생 spec/task 본문에서 마이그레이션 수단에 "기본값" / "권장" / "우선" / "default" / "best practice" 라벨 부여 금지. | Must |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 시점 비의존 | 본 req 파생 spec 은 7 파일 목록을 본문 §불변식 본문에 박제하지 않는다 — §스코프 규칙 grep-baseline 에만 박제. 효능은 "src 직계 island 수렴" 평서문. |
| NFR-02 | 게이트 단일성 | 확장자·typecheck·PropTypes 3 축 + entrypoint·setup·test discovery 보조 게이트 (FR-05·06·07) 가 분리 측정 가능. |
| NFR-03 | island 정의 정합 | FR-01·02·03 AND 충족 시 src 직계 island 진입. src 전역 island 종착 (FR-08) 은 본 req + Log + Monitor AND 충족 시 진입. |
| NFR-04 | 멱등성 | 동일 게이트 반복 시 동일 결과. |
| NFR-05 | RULE-07 정합 | 결과 효능만 박제. 1회성 진단·incident 귀속 부재. |
| NFR-06 | 외부 비파괴 | 본 효능 도입은 src 외부 (`public/`, `index.html`, `package.json`, `vite.config.js`) 변경 동반 없음 — 단, `vite.config.js:test.setupFiles` 패턴 또는 `index.html` 의 명시적 확장자 참조가 본 디렉터리 파일을 가리키는 경우 (FR-05·06) 는 동반 변경 허용. |

## 수용 기준
- [ ] Given HEAD=`b42e36f`, When `find src -maxdepth 1 \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" \| wc -l`, Then 7 hit (baseline).
- [ ] Given FR-01 효능 도입 완료, When 동일 find 명령, Then 0 hit.
- [ ] Given FR-02 효능 도입 완료, When typecheck grep, Then 0 hit.
- [ ] Given FR-04 baseline 박제 후 변환 완료, When `npm test -- --run`, Then 통과 it 수 baseline 과 동일.
- [ ] Given FR-05 효능 도입 (`index.jsx → index.tsx`), When `npm run build` 또는 `npm run dev` 시동, Then entry resolver fail-fast 없음.
- [ ] Given FR-06 효능 도입 (`setupTests.js → setupTests.ts`), When `npm test -- --run`, Then setup hook 정상 동작 (vitest beforeAll/afterEach 적용 확인).
- [ ] Given FR-07 효능 도입 (`reportWebVitals.{js,test.js}` → `.{ts,test.ts}`), When `npm test -- src/reportWebVitals`, Then 통과 it 수 변환 전후 동일.
- [ ] Given Log + Monitor + 본 req 모두 효능 도입 완료, When `find src \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"`, Then 0 hit (src 전역 island 종착).
- [ ] Given 본 req 파생 spec, When `grep -nE "기본값|권장|우선|default|best" specs/30.spec/green/**/<spec>`, Then 0 hit (FR-09 자기 검증).

## 참고
- **선행 (전제)**:
  - `[[20260517-island-prop-types-removal]]` (REQ-062) — island 정의 3 축.
  - `[[20260517-toolchain-version-coherence]]` (REQ-061) — typescript devDep 정합.
  - `[[20260517-path-alias-resolver-coherence]]` (REQ-065) — alias ↔ paths 동치.
  - `specs/60.done/2026/05/17/followups/20260516-2154-src-typescript-migration-from-blocked.md` — carve 후보 3건 명시 출처 (본 req 가 4건 추가 흡수).
- **직교 축 (동등)**:
  - `[[20260517-log-island-convergence]]` (REQ-068) — `src/Log/` 수렴.
  - `[[20260517-monitor-island-convergence]]` (REQ-069) — `src/Monitor/` 수렴.
  - `[[20260517-test-discovery-population-coherence]]` (REQ-067) — root 레벨 `vite.config.test.js` (src 외) 영역.
- **현장 근거 (HEAD=`b42e36f`, 2026-05-17 실측)**:
  - `find src -maxdepth 1 \( -name "*.jsx" -o -name "*.js" \) \| wc -l` → 7.
  - 분포: `App.jsx`, `App.test.jsx`, `index.jsx`, `reportWebVitals.js`, `reportWebVitals.test.js`, `setupTests.js`, `setupTests.timer-idiom.test.jsx`.
  - `package.json:21` `"test": "vitest run --coverage"`.
  - `vite.config.js:66-98` `test` 블록 (REQ-067 박제 영역).
- **외부 레퍼런스**:
  - TypeScript 공식 — `.ts`/`.tsx` 의미.
  - Vite 공식 — `index.html` entry resolver + extensions auto-resolution.
  - Vitest 공식 — `test.setupFiles` 패턴 + default entry detection.
- **RULE 준수 자기 검증**:
  - RULE-07: FR-01~08 평서형 효능 / 시점 비의존 / 반복 검증 가능 / incident 귀속 부재. FR-09 자기 검증.
  - RULE-06: 파생 spec §스코프 규칙 grep-baseline 에 7 hit + 분포 박제 필수.
  - RULE-01: 본 req create only. 파생 spec 박제는 inspector writer 영역.
