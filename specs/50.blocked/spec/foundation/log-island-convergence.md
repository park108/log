# `src/Log/` 컴포넌트 island 수렴 — `.jsx`/`.js` → `.tsx`/`.ts` 단방향 박제

> **위치**: `src/Log/**` 디렉터리 (직계 + `hooks/` + `__fixtures__/`)
> **관련 요구사항**: REQ-20260517-068 (log-island-convergence)
> **최종 업데이트**: 2026-05-17 (by inspector)

> 참조 코드는 **식별자 우선**, 라인 번호 보조 (REQ-068 발행 HEAD=`b42e36f`, 본 spec 박제 HEAD=`64babbd`).
> **ID 충돌 주의**: discovery 측 발행 시점에 `eslint-linter-options-default-override` 와 `REQ-20260517-068` ID 중복 — 본 spec 은 `src/Log/` 디렉터리 island 수렴 축, eslint linter 옵션 spec 과는 직교 영역. 차기 discovery 세션에서 ID 재배정 또는 메타 정정 신호.

## 역할
`src/Log/` 디렉터리를 [[island-prop-types-removal]] (REQ-20260517-062, 60.done) FR-01 의 island 정의 3 축 — (a) 확장자 0 hit (`.jsx`/`.js` → `.tsx`/`.ts` 단방향) + (b) typecheck error 0 hit + (c) PropTypes 0 hit — 에 수렴시키는 **결과 효능 박제**. 수렴 수단 (rename + tsc 통과 vs codemod vs 점진적 cohort 분할 vs strict 점진 도입) 은 본 spec 비박제 — task 계층 위임. 본 spec 은 디렉터리 단위 island 정합만 박제, 컴포넌트 계약 (`specs/30.spec/blue/components/log.md`) 과 직교.

## 동작
1. **확장자 수렴 (FR-01)**: `src/Log/` 직계 + 하위 디렉터리 (`hooks/`, `__fixtures__/`) 모두에서 `.jsx`/`.js` (단, `.d.ts` 제외) 파일이 0 hit. 측정: `find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit. baseline = **24 hit** (직계 13 + `hooks/` 10 + `__fixtures__/` 1). 본 효능 도입 후 baseline 24 hit → 0 hit 단방향 수렴.
2. **typecheck error 수렴 (FR-02)**: `src/Log/` 의 typecheck error 가 0 hit. 측정: `npm run typecheck 2>&1 | grep -E "^src/Log/" | grep -cE "error TS"` → 0 hit. precondition: REQ-064 (devbin-install-integrity, 격리) 충족 → `node_modules/typescript` 존재.
3. **PropTypes 수렴 (FR-03)**: `src/Log/` 의 PropTypes 잔존이 0 hit. 측정: `grep -rn "PropTypes\|prop-types" src/Log` → 0 hit. 본 게이트는 [[island-prop-types-removal]] FR-02 의 island 디렉터리 집합 확장으로 자동 충족 — `src/Log/` 가 island 정의 진입 시 PropTypes 0 hit 게이트 자동 적용.
4. **test 어설션 효능 보존 (FR-04)**: `src/Log/` 의 모든 기존 test (`*.test.jsx` → `*.test.tsx`, `hooks/*.test.js` → `hooks/*.test.ts`) 가 변환 후에도 동일 어설션 효능 유지 — `npm test -- src/Log` 의 통과 it 수가 변환 전후 동일. baseline 박제 — 변환 직전 `npm test -- src/Log --reporter=verbose 2>&1 | grep -cE "✓"` 실측 후 task 발행 시점 §스코프 규칙 grep-baseline 에 박제.
5. **island 집합 자동 합류 (FR-05)**: `src/Log/` island 수렴 후 동 디렉터리가 [[island-prop-types-removal]] FR-02 의 island 디렉터리 집합 (현 5~6 디렉터리: Comment / File / Image / Toaster / common — Search 박제 중) 에 자동 합류. island 확장 자동 추종 게이트 ([[island-prop-types-removal]] FR-04) 와 정합 — 별도 박제 행위 없이 island 정의 3 축 동시 충족만으로 진입.
6. **외부 import resolver 동치 (FR-06)**: 본 효능 도입 후 `src/Log/` 외부 파일의 `import` 경로가 정상 resolver 동치 ([[path-alias-resolver-coherence]], 격리) 로 동작 — 확장자 변경 시 외부 import 의 명시적 확장자 (`import Log from './Log/Log.jsx'`) 또는 절대 경로 (`import Log from 'src/Log/Log.jsx'`) 의 fail-fast 신호 검출. extensions auto-resolution 활성 상태에서 명시 확장자 import 가 발견되면 fail-fast.
7. **수단 라벨 금지 (RULE-07 정합 / FR-07)**: 본 spec 및 본 spec 파생 task 본문에서 마이그레이션 수단 (rename / codemod / cohort 분할 / strict 점진 / 컴포넌트 우선 vs 훅 우선 vs api 우선 변환 순서) 에 라벨 ("기본값" / "권장" / "우선" / "default" / "best" / "root cause" / "가장 효과적") 박제 부재.
   - (7.1) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/log-island-convergence.md` 매치는 다음 카테고리 한정 — (i) 본 § 동작 7 의 정의 본문 (수단 라벨 셋 박제), (ii) 자기 검증 게이트 본문 (수용 기준 / 회귀 중점 / 변경 이력 정책 명시), (iii) 외부 라이브러리 API 동작 인용 (예: TypeScript `.ts`/`.tsx` 의미, Vite extensions auto-resolution default), (iv) 템플릿 메타 텍스트 ("식별자 우선"). 본 카테고리 외 매치 (예: § 동작 본문 효능 평서문이 "권장 변환 순서" / "default rename 정책" 등으로 수단 라벨링) 는 § 동작 7.1 위반.

## 의존성
- 내부 (선행/전제):
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062) — island 정의 3 축 박제 (확장자 + typecheck error 0 + PropTypes 0). 본 spec FR-01~03 정합 근거.
  - `specs/50.blocked/spec/foundation/devbin-install-integrity.md` (REQ-064, 격리) — `node_modules/typescript` 존재 — 본 spec FR-02 측정 환경 precondition.
  - `specs/50.blocked/spec/foundation/path-alias-resolver-coherence.md` (REQ-065, 격리) — vite alias ↔ tsconfig paths 동치 — 본 spec FR-06 측정 환경 전제.
- 내부 (직교 축 spec):
  - `specs/30.spec/blue/components/log.md` — `src/Log/` 컴포넌트 계약·외부 의존성 박제. 본 spec 의 디렉터리 island 수렴은 동 spec 의 contract 비파괴 보장 + § 외부 `prop-types` 항목 제거를 부수 효과로 동반.
  - `specs/30.spec/green/foundation/monitor-island-convergence.md` (REQ-069) — `src/Monitor/` 수렴. 본 spec 과 디렉터리 직교.
  - `specs/30.spec/green/foundation/root-entry-island-convergence.md` (REQ-070) — src 루트 진입 파일 수렴. 본 spec 과 위치 직교.
- 내부 (역사 참조):
  - `specs/60.done/2026/05/17/followups/20260516-2154-src-typescript-migration-from-blocked.md` — 환경 회귀 해소 후 carve 후보 명시 (`src/index.jsx`, `src/reportWebVitals.*`, `src/setupTests.js` — root-entry-island-convergence 영역). 본 spec 은 동 followup 의 carve 후보 외부 (Log 별 디렉터리 단위).
- 외부:
  - TypeScript 공식 — `.ts`/`.tsx` 확장자 의미 + `allowJs` 옵션 (`tsconfig.json` 미설정 = `.ts`/`.tsx` 만 컴파일 모집단).
  - React 공식 — `.tsx` 확장자는 JSX 포함 TS 파일, `.ts` 는 JSX 미포함 TS 파일.
- 역의존: 본 spec 효능 도입 후 island 디렉터리 집합 확장 — [[island-prop-types-removal]] FR-02 게이트의 자동 진입.

## 테스트 현황
- [x] baseline 24 hit 실측 (`find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` = 24, HEAD=`64babbd`).
- [x] 분포 박제 — 직계 13 (`Log/LogItem/LogItemInfo/LogList/LogSingle/Writer` 의 `.jsx` + `.test.jsx` + `api.js` + `api.mock.js`) + `hooks/` 10 (`useCreateLog/useDeleteLog/useLog/useLogList/useUpdateLog` 의 `.js` + `.test.js`) + `__fixtures__/` 1 (`logs.js`).
- [ ] FR-01: `find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit (효능 도입 후).
- [ ] FR-02: `npm run typecheck 2>&1 | grep -E "^src/Log/" | grep -cE "error TS"` → 0 hit (효능 도입 후, REQ-064 precondition).
- [ ] FR-03: `grep -rn "PropTypes\|prop-types" src/Log` → 0 hit.
- [ ] FR-04: `npm test -- src/Log` 통과 it 수 변환 전후 동일 (baseline 박제 후).
- [ ] FR-05: [[island-prop-types-removal]] FR-02 측정 명령 실행 시 island 디렉터리 집합에 `src/Log/` 자동 포함.
- [ ] FR-06: 외부 import 명시 확장자 fail-fast 검출 (resolver extensions auto-resolution 활성 상태).
- [ ] FR-07: 본 spec § 동작 7.1 자기 grep — 카테고리 (i)~(iv) 내부 한정 매치.

## 스코프 규칙
- **expansion**: 불허 — 본 spec 효능 도입은 `src/Log/` 디렉터리 내부 변경 한정. 외부 import 의 확장자 명시 정정 (FR-06) 은 예외적 동반 변경 허용 (외부 import 가 본 디렉터리 파일을 가리키는 경우 한정). 외부 디렉터리 (`src/Monitor/`, `src/Comment/`, 루트 `App.jsx` 등) 의 island 게이트 위반은 본 spec 책임 외 — 별 spec (`monitor-island-convergence` / `root-entry-island-convergence`) 영역.
- **grep-baseline**:
  - `find /Users/park108/Dev/log/src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` → **24**
  - 분포 (24 파일):
    - **직계 13**:
      - `src/Log/Log.jsx`, `src/Log/Log.test.jsx`
      - `src/Log/LogItem.jsx`, `src/Log/LogItem.test.jsx`
      - `src/Log/LogItemInfo.jsx`, `src/Log/LogItemInfo.test.jsx`
      - `src/Log/LogList.jsx`
      - `src/Log/LogSingle.jsx`, `src/Log/LogSingle.test.jsx`
      - `src/Log/Writer.jsx`, `src/Log/Writer.test.jsx`
      - `src/Log/api.js`, `src/Log/api.mock.js`
    - **hooks/ 10**:
      - `src/Log/hooks/useCreateLog.js`, `src/Log/hooks/useCreateLog.test.js`
      - `src/Log/hooks/useDeleteLog.js`, `src/Log/hooks/useDeleteLog.test.js`
      - `src/Log/hooks/useLog.js`, `src/Log/hooks/useLog.test.js`
      - `src/Log/hooks/useLogList.js`, `src/Log/hooks/useLogList.test.js`
      - `src/Log/hooks/useUpdateLog.js`, `src/Log/hooks/useUpdateLog.test.js`
    - **__fixtures__/ 1**:
      - `src/Log/__fixtures__/logs.js`
  - `grep -rn "PropTypes\|prop-types" src/Log` — baseline 박제 필요 (env 회복 후 inspector 또는 task 발행 시 재실측). [[island-prop-types-removal]] 배경의 `src/Log + src/Monitor` 합산 41 hit 중 Log 분.
  - `npm run typecheck 2>&1 | grep -E "^src/Log/" | grep -cE "error TS"` — baseline 박제 필요 (REQ-064 충족 후 활성).
  - `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/log-island-convergence.md` — 본 spec 박제 시점 매치는 § 동작 7 정의 본문 / 자기 검증 게이트 본문 / 외부 라이브러리 API 인용 (TypeScript `.ts`/`.tsx` 의미, Vite extensions auto-resolution default) / 템플릿 메타 텍스트 카테고리 한정 — § 동작 7.1 자기 검증 baseline.
- **rationale**: 본 spec 효능 도입은 디렉터리 단위 island 수렴 — 외부 디렉터리 (`src/Monitor/` 등) 변경 동반 0. 외부 import 의 확장자 명시 정정은 FR-06 의 fail-fast 신호로 검출 → 별 PR / 별 task 위임 (본 spec 의 scope 외부). baseline 24 hit 분포는 향후 디렉터리 내부 신규 파일 추가 시 baseline 변경 자체가 본 spec 갱신 신호.

## 수용 기준
- [ ] (Must, FR-01) `src/Log/` 직계 + `hooks/` + `__fixtures__/` 의 `.jsx`/`.js` (단, `.d.ts` 제외) 파일 0 hit (baseline 24 → 0) — § 동작 1.
- [ ] (Must, FR-02) `src/Log/` typecheck error 0 hit — § 동작 2 (REQ-064 precondition).
- [ ] (Must, FR-03) `src/Log/` PropTypes 잔존 0 hit — § 동작 3 ([[island-prop-types-removal]] FR-02 자동 적용).
- [ ] (Must, FR-04) `npm test -- src/Log` 통과 it 수 변환 전후 동일 — § 동작 4 (baseline 박제 후).
- [ ] (Must, FR-05) [[island-prop-types-removal]] FR-02 island 디렉터리 집합에 `src/Log/` 자동 진입 — § 동작 5.
- [ ] (Should, FR-06) 외부 import 명시 확장자 fail-fast 신호 검출 — § 동작 6.
- [ ] (Must, FR-07 / RULE-07) § 동작 7.1 자기 grep — § 동작 7 카테고리 (i)~(iv) 내부 한정 매치 — § 동작 7.
- [ ] (NFR-01) 본 spec 본문에 24 파일 목록을 §불변식 본문에 박제하지 않음 — §스코프 규칙 grep-baseline 분포에만 박제. 효능 평서문은 "Log/ island 수렴" 형식.
- [ ] (NFR-02) 3 축 (확장자/typecheck/PropTypes) 각 단일 grep/find 명령으로 측정 가능 — island 정의 자체와 정합.
- [ ] (NFR-03) FR-01·02·03 AND 충족 시 `src/Log/` island 정의 진입. 한 축 위반은 다른 축의 게이트를 자동 충족시키지 않음.
- [ ] (NFR-04) 본 효능 도입 후 동일 게이트 반복 적용 시 동일 결과.
- [ ] (NFR-05) 결과 효능만 박제. 1회성 진단·incident 귀속 부재.
- [ ] (NFR-06) `src/Log/` 외부 파일 변경 동반 없음 — FR-06 의 외부 import 확장자 명시 정정만 예외.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-068 log-island-convergence 흡수). `src/Log/` 디렉터리 island 정의 3 축 (확장자 + typecheck + PropTypes 0 hit) 수렴 결과 효능 + test 어설션 효능 보존 + island 집합 자동 합류 + 외부 import resolver 동치 + 수단 라벨 금지 자기 검증 상시 불변식 박제 (§ 동작 1~7). REQ-062 (island 정의 3 축, 60.done) 정합 근거. baseline 실측 @HEAD=`64babbd` (REQ-068 발행 HEAD=`b42e36f` 와 `src/Log/` 영향 0): `find src/Log \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` = 24 / 분포 직계 13 (Log/LogItem/LogItemInfo/LogList/LogSingle/Writer + api/api.mock) + hooks/ 10 (useCreateLog/useDeleteLog/useLog/useLogList/useUpdateLog 의 .js + .test.js) + __fixtures__/ 1 (logs.js) / PropTypes·typecheck baseline 은 REQ-064 충족 후 실측 박제. consumed req: `specs/20.req/20260517-log-island-convergence.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `components/log.md` (직교 — 컴포넌트 계약 vs 디렉터리 island 수렴), `monitor-island-convergence.md` (REQ-069, 직교 디렉터리), `root-entry-island-convergence.md` (REQ-070, 직교 위치), `60.done/.../island-prop-types-removal.md` (REQ-062, FR-02 island 집합 자동 확장), `50.blocked/spec/foundation/{devbin-install-integrity,path-alias-resolver-coherence}.md` (격리, precondition 관계). RULE-07 자기검증 — § 동작 1~7 모두 평서형·반복 검증 가능 (`find` + `grep` + `npm test` 1-line)·시점 비의존 (24 파일 목록은 §스코프 규칙 grep-baseline 분포에만 박제, 효능 평서문은 "Log/ island 수렴")·incident 귀속 부재 (디렉터리 island 수렴은 src-typescript-migration 의 상시 결과 효능)·수단 중립 (rename / codemod / cohort 분할 / strict 점진 / 변환 순서 어느 수단도 라벨 미박제). RULE-06 §스코프 규칙 expansion 불허 + grep-baseline gate 24 파일 분포 + 3 보조 (PropTypes / typecheck / 자기 grep) 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/log-island-convergence.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. ID 충돌 주의: discovery 측 동일 세션 발행 `eslint-linter-options-default-override` 도 `REQ-20260517-068` 메타 박제 — ID 중복. 본 spec 직접 영향 0 (각 spec 영역 직교 — Log 디렉터리 vs ESLint linter 옵션), 차기 discovery 세션에서 ID 재배정 신호. | 전 섹션 (신규) |
