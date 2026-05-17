# `src/Monitor/` 컴포넌트 island 수렴 — `.jsx`/`.js` → `.tsx`/`.ts` 단방향 박제

> **위치**: `src/Monitor/**` 디렉터리 (직계 + `__fixtures__/`)
> **관련 요구사항**: REQ-20260517-069 (monitor-island-convergence)
> **최종 업데이트**: 2026-05-17 (by inspector)

> 참조 코드는 **식별자 우선**, 라인 번호 보조 (REQ-069 발행 HEAD=`b42e36f`, 본 spec 박제 HEAD=`64babbd`).

## 역할
`src/Monitor/` 디렉터리를 [[island-prop-types-removal]] (REQ-20260517-062, 60.done) FR-01 의 island 정의 3 축 — (a) 확장자 0 hit + (b) typecheck error 0 hit + (c) PropTypes 0 hit — 에 수렴시키는 **결과 효능 박제**. 수렴 수단 (rename / codemod / cohort 분할 / 변환 순서 — Mon 집약 컴포넌트 먼저 vs Item 요소 컴포넌트 먼저 vs api 먼저) 은 본 spec 비박제 — task 계층 위임. 본 spec 은 디렉터리 단위 island 정합만 박제, 컴포넌트 계약 (`specs/30.spec/blue/components/monitor.md`) 과 직교.

## 동작
1. **확장자 수렴 (FR-01)**: `src/Monitor/` 직계 + 하위 디렉터리 (`__fixtures__/`) 모두에서 `.jsx`/`.js` (단, `.d.ts` 제외) 파일이 0 hit. 측정: `find src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit. baseline = **17 hit** (직계 16 + `__fixtures__/` 1). 본 효능 도입 후 baseline 17 hit → 0 hit 단방향 수렴.
2. **typecheck error 수렴 (FR-02)**: `src/Monitor/` 의 typecheck error 가 0 hit. 측정: `npm run typecheck 2>&1 | grep -E "^src/Monitor/" | grep -cE "error TS"` → 0 hit. precondition: REQ-064 (devbin-install-integrity, 격리) 충족 → `node_modules/typescript` 존재.
3. **PropTypes 수렴 (FR-03)**: `src/Monitor/` 의 PropTypes 잔존이 0 hit. 측정: `grep -rn "PropTypes\|prop-types" src/Monitor` → 0 hit. [[island-prop-types-removal]] FR-02 의 island 집합 확장으로 자동 충족.
4. **test 어설션 효능 보존 (FR-04)**: `src/Monitor/` 의 모든 기존 test (`*.test.jsx` → `*.test.tsx`) 가 변환 후 동일 어설션 효능 유지 — `npm test -- src/Monitor` 의 통과 it 수가 변환 전후 동일. baseline 박제 — 변환 직전 `npm test -- src/Monitor --reporter=verbose 2>&1 | grep -cE "✓"` 실측 후 task 발행 시점 §스코프 규칙 grep-baseline 에 박제.
5. **island 집합 자동 합류 (FR-05)**: `src/Monitor/` island 수렴 후 동 디렉터리가 [[island-prop-types-removal]] FR-02 의 island 디렉터리 집합 에 자동 합류 — island 확장 자동 추종 게이트 ([[island-prop-types-removal]] FR-04) 와 정합.
6. **외부 import resolver 동치 (FR-06)**: 본 효능 도입 후 `src/Monitor/` 외부 파일의 `import` 경로가 정상 resolver 동치 ([[path-alias-resolver-coherence]], 격리) 로 동작 — 확장자 변경 시 외부 import 의 명시적 확장자 fail-fast 신호 검출.
7. **수단 라벨 금지 (RULE-07 정합 / FR-07)**: 본 spec 및 본 spec 파생 task 본문에서 마이그레이션 수단 (rename / codemod / cohort 분할 / 변환 순서 — Mon vs Item vs api) 에 라벨 ("기본값" / "권장" / "우선" / "default" / "best" / "root cause" / "가장 효과적") 박제 부재.
   - (7.1) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/monitor-island-convergence.md` 매치는 다음 카테고리 한정 — (i) 본 § 동작 7 의 정의 본문 (수단 라벨 셋 박제), (ii) 자기 검증 게이트 본문 (수용 기준 / 회귀 중점 / 변경 이력 정책 명시), (iii) 외부 라이브러리 API 동작 인용 (예: TypeScript `.ts`/`.tsx` 의미, Vite extensions auto-resolution default), (iv) 템플릿 메타 텍스트 ("식별자 우선"). 본 카테고리 외 매치는 § 동작 7.1 위반.

## 의존성
- 내부 (선행/전제):
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062) — island 정의 3 축. 본 spec FR-01~03 정합 근거.
  - `specs/50.blocked/spec/foundation/devbin-install-integrity.md` (REQ-064, 격리) — `node_modules/typescript` 존재 — 본 spec FR-02 측정 환경 precondition.
  - `specs/50.blocked/spec/foundation/path-alias-resolver-coherence.md` (REQ-065, 격리) — alias ↔ paths 동치 — 본 spec FR-06 전제.
- 내부 (직교 축 spec):
  - `specs/30.spec/blue/components/monitor.md` — `src/Monitor/` 컴포넌트 계약·외부 의존성 박제. 본 spec 의 디렉터리 island 수렴은 동 spec 의 contract 비파괴 보장 + § 외부 `prop-types` 항목 제거를 부수 효과로 동반.
  - `specs/30.spec/green/foundation/log-island-convergence.md` (REQ-068) — `src/Log/` 수렴. 본 spec 과 디렉터리 직교.
  - `specs/30.spec/green/foundation/root-entry-island-convergence.md` (REQ-070) — src 루트 진입 파일 수렴. 본 spec 과 위치 직교.
- 외부:
  - TypeScript 공식 — `.ts`/`.tsx` 의미.
  - React 공식 — `.tsx` JSX 포함 식별.
- 역의존: 본 spec 효능 도입 후 island 디렉터리 집합 확장 — [[island-prop-types-removal]] FR-02 게이트의 자동 진입.

## 테스트 현황
- [x] baseline 17 hit 실측 (`find src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` = 17, HEAD=`64babbd`).
- [x] 분포 박제 — 직계 16 (Monitor + ApiCallMon/ContentMon/VisitorMon/WebVitalsMon 의 .jsx + 4 Item 의 .jsx/.test.jsx + api/api.mock.js) + `__fixtures__/` 1 (monitor.js).
- [ ] FR-01: `find src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit (효능 도입 후).
- [ ] FR-02: `npm run typecheck 2>&1 | grep -E "^src/Monitor/" | grep -cE "error TS"` → 0 hit (REQ-064 precondition).
- [ ] FR-03: `grep -rn "PropTypes\|prop-types" src/Monitor` → 0 hit.
- [ ] FR-04: `npm test -- src/Monitor` 통과 it 수 변환 전후 동일.
- [ ] FR-05: [[island-prop-types-removal]] FR-02 island 디렉터리 집합에 `src/Monitor/` 자동 포함.
- [ ] FR-06: 외부 import 명시 확장자 fail-fast 검출.
- [ ] FR-07: 본 spec § 동작 7.1 자기 grep — 카테고리 (i)~(iv) 내부 한정.

## 스코프 규칙
- **expansion**: 불허 — 본 spec 효능 도입은 `src/Monitor/` 디렉터리 내부 변경 한정. 외부 import 의 확장자 명시 정정 (FR-06) 은 예외적 동반 변경 허용.
- **grep-baseline**:
  - `find /Users/park108/Dev/log/src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` → **17**
  - 분포 (17 파일):
    - **직계 16**:
      - `src/Monitor/Monitor.jsx`, `src/Monitor/Monitor.test.jsx`
      - `src/Monitor/ApiCallMon.jsx`
      - `src/Monitor/ApiCallItem.jsx`, `src/Monitor/ApiCallItem.test.jsx`
      - `src/Monitor/ContentMon.jsx`
      - `src/Monitor/ContentItem.jsx`, `src/Monitor/ContentItem.test.jsx`
      - `src/Monitor/VisitorMon.jsx`, `src/Monitor/VisitorMon.test.jsx`
      - `src/Monitor/WebVitalsMon.jsx`, `src/Monitor/WebVitalsMon.test.jsx`
      - `src/Monitor/WebVitalsItem.jsx`, `src/Monitor/WebVitalsItem.test.jsx`
      - `src/Monitor/api.js`, `src/Monitor/api.mock.js`
    - **__fixtures__/ 1**:
      - `src/Monitor/__fixtures__/monitor.js`
  - `grep -rn "PropTypes\|prop-types" src/Monitor` — baseline 박제 필요 (env 회복 후 재실측). [[island-prop-types-removal]] 배경의 `src/Log + src/Monitor` 합산 41 hit 중 Monitor 분.
  - `npm run typecheck 2>&1 | grep -E "^src/Monitor/" | grep -cE "error TS"` — baseline 박제 필요 (REQ-064 충족 후 활성).
  - `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/monitor-island-convergence.md` — 본 spec 박제 시점 매치는 § 동작 7 정의 본문 / 자기 검증 게이트 본문 / 외부 라이브러리 API 인용 / 템플릿 메타 텍스트 카테고리 한정 — § 동작 7.1 자기 검증 baseline.
- **rationale**: 디렉터리 단위 island 수렴 — 외부 디렉터리 변경 동반 0. baseline 17 hit 분포는 향후 디렉터리 내부 신규 파일 추가 시 baseline 변경 자체가 본 spec 갱신 신호. `Monitor.jsx` 의 4 Mon 집약 컴포넌트 + 4 Item 요소 컴포넌트 + `api`/`api.mock`/`__fixtures__` 구조는 island 수렴 시 의존 그래프 보존 (Mon → Item → api 의 import 방향).

## 수용 기준
- [ ] (Must, FR-01) `src/Monitor/` 직계 + `__fixtures__/` 의 `.jsx`/`.js` (단, `.d.ts` 제외) 파일 0 hit (baseline 17 → 0) — § 동작 1.
- [ ] (Must, FR-02) `src/Monitor/` typecheck error 0 hit — § 동작 2 (REQ-064 precondition).
- [ ] (Must, FR-03) `src/Monitor/` PropTypes 잔존 0 hit — § 동작 3 ([[island-prop-types-removal]] FR-02 자동 적용).
- [ ] (Must, FR-04) `npm test -- src/Monitor` 통과 it 수 변환 전후 동일 — § 동작 4 (baseline 박제 후).
- [ ] (Must, FR-05) [[island-prop-types-removal]] FR-02 island 디렉터리 집합에 `src/Monitor/` 자동 진입 — § 동작 5.
- [ ] (Should, FR-06) 외부 import 명시 확장자 fail-fast 신호 검출 — § 동작 6.
- [ ] (Must, FR-07 / RULE-07) § 동작 7.1 자기 grep — § 동작 7 카테고리 (i)~(iv) 내부 한정 매치 — § 동작 7.
- [ ] (NFR-01) 본 spec 본문에 17 파일 목록을 §불변식 본문에 박제하지 않음 — §스코프 규칙 grep-baseline 분포에만 박제. 효능 평서문은 "Monitor/ island 수렴" 형식.
- [ ] (NFR-02) 3 축 각 단일 grep/find 명령으로 측정 가능.
- [ ] (NFR-03) FR-01·02·03 AND 충족 시 island 진입.
- [ ] (NFR-04) 동일 게이트 반복 시 동일 결과.
- [ ] (NFR-05) 결과 효능만 박제. 1회성 진단 부재.
- [ ] (NFR-06) `src/Monitor/` 외부 변경 동반 없음 — FR-06 의 외부 import 확장자 명시 정정만 예외.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-069 monitor-island-convergence 흡수). `src/Monitor/` 디렉터리 island 정의 3 축 (확장자 + typecheck + PropTypes 0 hit) 수렴 결과 효능 + test 어설션 효능 보존 + island 집합 자동 합류 + 외부 import resolver 동치 + 수단 라벨 금지 자기 검증 상시 불변식 박제 (§ 동작 1~7). REQ-062 (island 정의 3 축, 60.done) 정합 근거. baseline 실측 @HEAD=`64babbd` (REQ-069 발행 HEAD=`b42e36f` 와 `src/Monitor/` 영향 0): `find src/Monitor \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` = 17 / 분포 직계 16 (Monitor + 4 Mon 집약 + 4 Item 요소 + 각 test + api/api.mock) + __fixtures__/ 1 (monitor.js) / PropTypes·typecheck baseline 은 REQ-064 충족 후 실측 박제. consumed req: `specs/20.req/20260517-monitor-island-convergence.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `components/monitor.md` (직교 — 컴포넌트 계약 vs 디렉터리 island 수렴), `log-island-convergence.md` (REQ-068, 직교 디렉터리), `root-entry-island-convergence.md` (REQ-070, 직교 위치), `60.done/.../island-prop-types-removal.md` (REQ-062, FR-02 island 집합 자동 확장), `50.blocked/spec/foundation/{devbin-install-integrity,path-alias-resolver-coherence}.md` (격리, precondition 관계). RULE-07 자기검증 — § 동작 1~7 모두 평서형·반복 검증 가능·시점 비의존 (17 파일 목록은 §스코프 규칙 grep-baseline 분포에만 박제)·incident 귀속 부재·수단 중립 (rename / codemod / cohort 분할 / Mon vs Item vs api 변환 순서 어느 수단도 라벨 미박제). RULE-06 §스코프 규칙 expansion 불허 + grep-baseline gate 17 파일 분포 + 3 보조 (PropTypes / typecheck / 자기 grep) 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/monitor-island-convergence.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. | 전 섹션 (신규) |
