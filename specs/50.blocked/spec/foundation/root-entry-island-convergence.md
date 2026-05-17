# src 루트 진입 파일 island 수렴 — `App`/`index`/`reportWebVitals`/`setupTests` `.jsx`/`.js` → `.tsx`/`.ts` 박제

> **위치**: `src/` 직계 (`-maxdepth 1`) 7 파일 — `App.jsx`, `App.test.jsx`, `index.jsx`, `reportWebVitals.js`, `reportWebVitals.test.js`, `setupTests.js`, `setupTests.timer-idiom.test.jsx`
> **관련 요구사항**: REQ-20260517-070 (root-entry-island-convergence)
> **최종 업데이트**: 2026-05-17 (by inspector)

> 참조 코드는 **식별자 우선**, 라인 번호 보조 (REQ-070 발행 HEAD=`b42e36f`, 본 spec 박제 HEAD=`64babbd`).

## 역할
`src/` 직계 (maxdepth=1) 7 비-TS 파일 — 엔트리 컴포넌트 (`App.jsx`, `index.jsx`) + 엔트리 테스트 (`App.test.jsx`, `setupTests.timer-idiom.test.jsx`) + 보조 모듈 + test 쌍 (`reportWebVitals.js`, `reportWebVitals.test.js`) + 테스트 셋업 (`setupTests.js`) — 을 island 정의에 수렴시키는 **결과 효능 박제**. 본 7 파일은 `src-typescript-migration` (구 REQ-051) 의 island 정의 (`find src -name "*.jsx" \| wc -l` 단축형이 0 으로 수렴하는 종착 조건) 의 마지막 잔존 카테고리. 수렴 수단 (rename / codemod / 부분 분할 / 단일 PR 일괄 / 변환 순서) 은 본 spec 비박제 — task 계층 위임.

## 동작
1. **확장자 수렴 (FR-01)**: src 직계 (`-maxdepth 1`) 의 `.jsx`/`.js` (단, `.d.ts` 제외) 파일이 0 hit. 측정: `find src -maxdepth 1 \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit. baseline = **7 hit** (`App.jsx`, `App.test.jsx`, `index.jsx`, `reportWebVitals.js`, `reportWebVitals.test.js`, `setupTests.js`, `setupTests.timer-idiom.test.jsx`).
2. **typecheck error 수렴 (FR-02)**: src 직계 7 파일의 typecheck error 가 0 hit. 측정: `npm run typecheck 2>&1 | grep -E "^src/(App|index|reportWebVitals|setupTests)\." | grep -cE "error TS"` → 0 hit. precondition: REQ-064 (devbin-install-integrity, 격리) 충족.
3. **PropTypes 수렴 (FR-03)**: src 직계 7 파일의 PropTypes 잔존이 0 hit. 측정: `grep -rn --include="*.tsx" --include="*.ts" "PropTypes\|prop-types" src/App.* src/index.* src/reportWebVitals.* src/setupTests.*` → 0 hit. 현 baseline 시점 잔존 여부는 env 회복 후 inspector 또는 task 발행 시 실측 후 박제.
4. **test 어설션 효능 보존 (FR-04)**: src 직계 기존 test 4건 (`App.test.jsx`, `reportWebVitals.test.js`, `setupTests.timer-idiom.test.jsx` — `setupTests.js` 자체는 setup 파일이며 test 아님) 의 어설션 효능이 변환 전후 동일. baseline 박제 — 변환 직전 `npm test` 통과 it 수 실측 후 task 발행 시점 §스코프 규칙 grep-baseline 에 박제.
5. **entrypoint resolver 동치 (FR-05)**: `index.jsx` → `index.tsx` 변환 시 `package.json:21` `"test": "vitest run --coverage"` / `index.html` entrypoint 의 명시적 확장자 참조가 fail-fast 없이 동작 — vite default entry 처리 + `index.html:<script type="module" src="...">` 패턴 검증. extensions auto-resolution 활성 상태에서 entry 변경 시 명시 확장자 참조가 있다면 fail-fast.
6. **setupFiles 동치 (FR-06)**: `setupTests.js` → `setupTests.ts` 변환 시 `vite.config.js:test.setupFiles` 또는 default 패턴이 신규 경로를 fail-fast 없이 인식. 측정: `npm test -- --run` rc=0 (또는 변환 전후 통과 it 수 동일). REQ-067 (test-discovery-population-coherence) 의 4축 매트릭스 박제와 정합.
7. **모듈 + test 쌍 동시 스위칭 (FR-07)**: `reportWebVitals.js` + `reportWebVitals.test.js` 쌍 변환 시 동시 스위칭 — 한쪽만 변환 시 import 경로 또는 test discovery 비대칭 발생 신호.
8. **src 전역 island 종착 (FR-08)**: 본 효능 도입 후 src 전역 island 종착 — `find src \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit. 단, 본 게이트는 본 spec 단독 충족 게이트 아니며 [[log-island-convergence]] + [[monitor-island-convergence]] AND 충족 시 자동 진입 박제.
9. **수단 라벨 금지 (RULE-07 정합 / FR-09)**: 본 spec 및 본 spec 파생 task 본문에서 마이그레이션 수단 (rename / codemod / 부분 분할 / 단일 PR / 변환 순서 — entry `index.jsx` 먼저 vs leaf `reportWebVitals.js` 먼저) 에 라벨 ("기본값" / "권장" / "우선" / "default" / "best" / "root cause" / "가장 효과적") 박제 부재.
   - (9.1) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/root-entry-island-convergence.md` 매치는 다음 카테고리 한정 — (i) 본 § 동작 9 의 정의 본문, (ii) 자기 검증 게이트 본문, (iii) 외부 라이브러리 API 동작 인용 (예: TypeScript `.ts`/`.tsx` 의미, Vite `index.html` entry resolver default, Vitest `test.setupFiles` default entry detection), (iv) 템플릿 메타 텍스트. 본 카테고리 외 매치는 § 동작 9.1 위반.

## 의존성
- 내부 (선행/전제):
  - `specs/60.done/2026/05/17/req/20260517-island-prop-types-removal.md` (REQ-062) — island 정의 3 축.
  - `specs/50.blocked/spec/foundation/devbin-install-integrity.md` (REQ-064, 격리) — `node_modules/typescript` 존재 — FR-02 precondition.
  - `specs/50.blocked/spec/foundation/path-alias-resolver-coherence.md` (REQ-065, 격리) — alias ↔ paths 동치 — FR-05/06 전제.
  - `specs/30.spec/green/foundation/test-discovery-population-coherence.md` (REQ-067) — 도구 4축 모집단 매트릭스. FR-06 의 `setupFiles` resolver 정합.
  - `specs/60.done/2026/05/17/followups/20260516-2154-src-typescript-migration-from-blocked.md` — env 회복 후 carve 후보 3건 명시 (index / reportWebVitals 쌍 / setupTests). 본 spec 은 동 carve 후보 + `App.jsx`/`App.test.jsx`/`setupTests.timer-idiom.test.jsx` 잔존 3건 추가 흡수.
- 내부 (직교 축 spec):
  - `specs/30.spec/blue/components/app.md` — `src/App.jsx` 라우팅·진입 점 박제. 본 spec 의 island 수렴은 동 spec 의 contract 비파괴 보장 하에 수행.
  - `specs/30.spec/blue/common/test-idioms.md` — `setupTests.timer-idiom.test.jsx` 의 timer idiom 의미 박제. 본 spec 의 확장자 변경은 동 spec 의 idiom 의미 변경 동반 불가.
  - `specs/30.spec/green/foundation/log-island-convergence.md` (REQ-068) — `src/Log/` 수렴. src 전역 종착 (FR-08) AND 조건.
  - `specs/30.spec/green/foundation/monitor-island-convergence.md` (REQ-069) — `src/Monitor/` 수렴. src 전역 종착 (FR-08) AND 조건.
- 외부:
  - TypeScript 공식 — `.ts`/`.tsx` 의미.
  - Vite 공식 — `index.html` entry resolver + extensions auto-resolution.
  - Vitest 공식 — `test.setupFiles` 패턴 + default entry detection.
- 역의존: 본 spec 효능 도입 후 src 전역 island 종착 — [[island-prop-types-removal]] FR-02 게이트가 src 전 디렉터리 집합으로 확장 가능.

## 테스트 현황
- [x] baseline 7 hit 실측 (`find src -maxdepth 1 \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` = 7, HEAD=`64babbd`).
- [x] 분포 박제 — 엔트리 컴포넌트 2 (`App.jsx`, `index.jsx`) + 엔트리 테스트 2 (`App.test.jsx`, `setupTests.timer-idiom.test.jsx`) + 보조 모듈 + test 2 (`reportWebVitals.js`, `reportWebVitals.test.js`) + 테스트 셋업 1 (`setupTests.js`).
- [ ] FR-01: `find src -maxdepth 1 \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → 0 hit (효능 도입 후).
- [ ] FR-02: typecheck grep 0 hit (REQ-064 precondition).
- [ ] FR-03: PropTypes 0 hit (실측 baseline 박제 후).
- [ ] FR-04: `npm test` 통과 it 수 변환 전후 동일.
- [ ] FR-05: `index.jsx → index.tsx` 변환 시 entry resolver fail-fast 없음.
- [ ] FR-06: `setupTests.js → setupTests.ts` 변환 시 setupFiles 인식.
- [ ] FR-07: `reportWebVitals` 쌍 동시 스위칭.
- [ ] FR-08: src 전역 island 종착 (본 spec + Log + Monitor AND 충족 시).
- [ ] FR-09: 본 spec § 동작 9.1 자기 grep — 카테고리 (i)~(iv) 내부 한정.

## 스코프 규칙
- **expansion**: 불허 — 본 spec 효능 도입은 src 직계 7 파일 한정. 외부 (`public/`, `index.html`, `package.json`, `vite.config.js`) 변경 동반 없음 — 단, `vite.config.js:test.setupFiles` 패턴 또는 `index.html` 의 명시적 확장자 참조가 본 7 파일을 가리키는 경우 (FR-05·06) 는 동반 변경 허용.
- **grep-baseline**:
  - `find /Users/park108/Dev/log/src -maxdepth 1 \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` → **7**
  - 분포 (7 파일):
    - **엔트리 컴포넌트 2**: `src/App.jsx`, `src/index.jsx`
    - **엔트리 테스트 2**: `src/App.test.jsx`, `src/setupTests.timer-idiom.test.jsx`
    - **보조 모듈 + test 2**: `src/reportWebVitals.js`, `src/reportWebVitals.test.js`
    - **테스트 셋업 1**: `src/setupTests.js`
  - `grep -rn --include="*.jsx" --include="*.js" "PropTypes\|prop-types" src/App.* src/index.* src/reportWebVitals.* src/setupTests.*` — baseline 박제 필요 (env 회복 후 inspector 또는 task 발행 시 재실측).
  - `npm run typecheck 2>&1 | grep -E "^src/(App|index|reportWebVitals|setupTests)\." | grep -cE "error TS"` — baseline 박제 필요 (REQ-064 충족 후 활성).
  - `grep -nE "\"test\"" package.json` → `package.json:21` `"test": "vitest run --coverage"`.
  - `grep -nE "setupFiles" vite.config.js` — baseline 박제 필요 (현 `vite.config.js:66-98` `test` 블록 내 `setupFiles` 키 존재 여부 — REQ-067 박제 시점 base "default" 가능성, FR-06 측정 시 확인).
  - `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/root-entry-island-convergence.md` — § 동작 9.1 자기 검증 baseline.
- **rationale**: src 직계 7 파일은 src-typescript-migration 의 island 정의 단축형 (`find src -name "*.jsx" | wc -l`) 의 마지막 잔존 카테고리. 본 spec 효능 도입은 src 디렉터리 단위 island 종착 (FR-08) 의 필요 조건이며 [[log-island-convergence]] + [[monitor-island-convergence]] AND 충족 시 충분 조건 진입. `index.jsx` 의 vite entry resolver 와 `setupTests.js` 의 vitest setupFiles 는 extensions auto-resolution 활성 상태에서 명시 확장자 참조 부재 시 fail-fast 없이 단방향 스위칭 가능 — 명시 참조 존재 시 동반 정정 필요 (FR-05·06).

## 수용 기준
- [ ] (Must, FR-01) src 직계 `.jsx`/`.js` (단, `.d.ts` 제외) 0 hit (baseline 7 → 0) — § 동작 1.
- [ ] (Must, FR-02) src 직계 7 파일 typecheck error 0 hit — § 동작 2 (REQ-064 precondition).
- [ ] (Should, FR-03) src 직계 7 파일 PropTypes 잔존 0 hit — § 동작 3.
- [ ] (Must, FR-04) `npm test` 통과 it 수 변환 전후 동일 — § 동작 4 (baseline 박제 후).
- [ ] (Should, FR-05) `index.jsx → index.tsx` 변환 시 entry resolver fail-fast 없음 — § 동작 5.
- [ ] (Should, FR-06) `setupTests.js → setupTests.ts` 변환 시 setupFiles 인식 — § 동작 6.
- [ ] (Should, FR-07) `reportWebVitals` 쌍 동시 스위칭 — § 동작 7.
- [ ] (Should, FR-08) src 전역 island 종착 (본 spec + Log + Monitor AND 충족 시) — § 동작 8.
- [ ] (Must, FR-09 / RULE-07) § 동작 9.1 자기 grep — § 동작 9 카테고리 (i)~(iv) 내부 한정 매치 — § 동작 9.
- [ ] (NFR-01) 본 spec 본문에 7 파일 목록을 §불변식 본문에 박제하지 않음 — §스코프 규칙 grep-baseline 분포에만 박제. 효능 평서문은 "src 직계 island 수렴" 형식.
- [ ] (NFR-02) 확장자·typecheck·PropTypes 3 축 + entrypoint·setup·test discovery 보조 게이트 (FR-05·06·07) 분리 측정 가능.
- [ ] (NFR-03) FR-01·02·03 AND 충족 시 src 직계 island 진입. src 전역 종착 (FR-08) 은 본 spec + Log + Monitor AND.
- [ ] (NFR-04) 동일 게이트 반복 시 동일 결과.
- [ ] (NFR-05) 결과 효능만 박제. 1회성 진단·incident 귀속 부재.
- [ ] (NFR-06) src 외부 변경 동반 없음 — FR-05·06 외부 import 확장자 명시 정정만 예외.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-070 root-entry-island-convergence 흡수). src 직계 7 파일 (`App.jsx`/`App.test.jsx`/`index.jsx`/`reportWebVitals.{js,test.js}`/`setupTests.js`/`setupTests.timer-idiom.test.jsx`) island 정의 3 축 (확장자 + typecheck + PropTypes 0 hit) 수렴 결과 효능 + test 어설션 효능 보존 + entrypoint resolver 동치 + setupFiles 동치 + 모듈+test 쌍 동시 스위칭 + src 전역 island 종착 (Log + Monitor AND) + 수단 라벨 금지 자기 검증 상시 불변식 박제 (§ 동작 1~9). REQ-062 (island 정의 3 축, 60.done) 정합 근거. baseline 실측 @HEAD=`64babbd` (REQ-070 발행 HEAD=`b42e36f` 와 `src/` 직계 영향 0): `find src -maxdepth 1 \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts" | wc -l` = 7 / 분포 엔트리 컴포넌트 2 + 엔트리 테스트 2 + 보조 모듈+test 2 + 테스트 셋업 1 / PropTypes·typecheck baseline 은 REQ-064 충족 후 실측 박제 / `package.json:21` `"test": "vitest run --coverage"` / `setupFiles` baseline 박제 필요. consumed req: `specs/20.req/20260517-root-entry-island-convergence.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `components/app.md` (직교 — 컴포넌트 계약 vs 디렉터리 island 수렴), `common/test-idioms.md` (직교 — timer idiom 의미 보존), `log-island-convergence.md` (REQ-068, src 전역 종착 AND 조건), `monitor-island-convergence.md` (REQ-069, src 전역 종착 AND 조건), `test-discovery-population-coherence.md` (REQ-067, FR-06 setupFiles resolver 정합), `60.done/.../island-prop-types-removal.md` (REQ-062, FR-02 island 집합 자동 확장 — src 전역 종착 시), `60.done/.../followups/.../src-typescript-migration-from-blocked.md` (carve 후보 명시 출처 — 본 spec 이 4건 추가 흡수), `50.blocked/spec/foundation/{devbin-install-integrity,path-alias-resolver-coherence}.md` (격리, precondition 관계). RULE-07 자기검증 — § 동작 1~9 모두 평서형·반복 검증 가능·시점 비의존 (7 파일 목록은 §스코프 규칙 grep-baseline 분포에만 박제)·incident 귀속 부재·수단 중립 (rename / codemod / 부분 분할 / 단일 PR / 변환 순서 어느 수단도 라벨 미박제). RULE-06 §스코프 규칙 expansion 불허 + grep-baseline gate 7 파일 분포 + 4 보조 (PropTypes / typecheck / package.json test / setupFiles / 자기 grep) 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/root-entry-island-convergence.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. | 전 섹션 (신규) |
