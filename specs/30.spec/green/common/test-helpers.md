# typecheck island 흡수 헬퍼 단일 출처 — `src/test-utils/**` 횡단 일관성 불변식

> **위치**: `src/test-utils/**` (헬퍼 export 영역), `src/**/*.test.{ts,tsx,js,jsx}` (소비 영역).
> **관련 요구사항**: REQ-20260517-082
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제, REQ-082 흡수; Phase 1 reconcile (I1)(I2)(I3) + FR-01·FR-02·FR-03·FR-04·FR-06 + NFR-05 marker 9건 hook-ack 플립 by TSK-20260517-19 / `82bb7a4`)

> 본 spec 은 횡단 test 헬퍼 단일 출처 계약. 라인 번호 박제 없음 — baseline 은 §스코프 규칙 grep-baseline (작성 시 inspector 책임).

## 역할
typecheck island (strict mode + `noUncheckedIndexedAccess` 정책) 확장 시 회복 task 마다 반복되는 **공통 흡수 패턴 2종** — (a) jsdom `window.location` read-only setter 우회 패턴 (host object setter 회피 + 적절한 cast 타입), (b) vitest spy 의 `mock.calls[N]` strict narrow 패턴 (index access 의 `T | undefined` 추론을 narrow 형태로 흡수) — 이 `src/test-utils/**` 단일 모듈에서 export 박제되어 모든 test 파일이 동일 인터페이스를 소비해야 한다는 시스템 횡단 일관성 계약. 본 효능은 회복 task 마다 file-local 헬퍼 재발명 또는 inline 흡수 직접 표현을 0 으로 수렴시켜, 향후 정책 변경 / 라이브러리 버전 bump 시 단일 헬퍼 1 파일 갱신으로 흡수 비용이 수렴하도록 보장. 의도적으로 하지 않는 것: 헬퍼 module 이름 / 디렉터리 위치 / 시그니처 / API 형태 / aggregator 패턴 선정 (수단 영역), `noUncheckedIndexedAccess` 정책 자체의 도입/제거 (`tsconfig.json` 영역, `typecheck-island-extension.md` 별 축), 적절한 cast 타입 박제 위치 결정 (`src/types/` vs `src/test-utils/` vs in-place — 별 task 위임), `jsdom` 버전 bump 또는 `happy-dom` 전환 (별 req 축), vitest `mock.calls` 외 다른 spy API (`mock.results`, `mock.instances`) 의 strict narrow (동일 패턴 발견 시 별 followup → 별 req), test 파일 외부 (`src/**/*.{ts,tsx}` 비-test) 의 `window.location` 사용 (runtime 영역).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 test 헬퍼 단일 출처 게이트 박제만 — `src/test-utils/**` ↔ `src/**/*.test.{ts,tsx,js,jsx}` 간 흡수 패턴 일관성의 결과 효능을 grep 단일 명령으로 검증.

## 동작
1. **(I1) location-mock 단일 출처**: jsdom `window.location` read-only setter 우회 헬퍼는 `src/test-utils/**` 단일 모듈에서 export 박제. test 파일 (`src/**/*.test.{ts,tsx,js,jsx}`) 내부에서 동일 흡수 패턴 (host object `delete` + 재할당 + 적절한 cast) 의 file-local 헬퍼 또는 inline 직접 표현 0 hit — 단일 헬퍼 import 형태로만 소비.
2. **(I2) mock-narrow 단일 출처**: vitest spy 의 `mock.calls[N]` strict narrow 헬퍼 (예: 첫번째 호출 narrow, N번째 호출 narrow — 시그니처는 수단 영역) 는 `src/test-utils/**` 단일 모듈에서 export 박제. test 파일 내부에서 `mock.calls[<int>]!` non-null assertion 직접 표현 0 hit — 단일 헬퍼 import 형태로만 소비.
3. **(I3) 단일 출처 정합**: 본 효능 도입 후 (I1)(I2) 헬퍼 박제 모듈은 `src/test-utils/**` 한 곳만. 동일 효능의 file-local `const` 정의 또는 module-level 재정의가 `src/test-utils/**` 외부에 박제되면 단일 출처 위반.
4. **(I4) typecheck island 확장 흡수 비용 수렴**: typecheck island (strict mode + `noUncheckedIndexedAccess`) 확장 task 가 새 영역 (예: 신규 회복 대상 디렉터리) 진입 시 본 헬퍼를 import 만으로 동일 흡수 완료. 회복 task result.md 의 변경 표면에서 `src/test-utils/**` 외부에 location/mock-narrow 헬퍼 module-level 정의 0 hit.
5. **(I5) test-idioms 패턴 동질**: 본 두 헬퍼는 `30.spec/blue/common/test-idioms.md` 의 (4) MSW 수명주기 (`useMockServer` 단일 출처) 와 동질 — "test 헬퍼는 `src/test-utils/` 단일 출처, ad-hoc 재발명 금지" 의 typecheck island 영역 확장 축. 본 spec 분리는 영역 직교 (env/render/MSW/fake-timer/console 9 축 vs location/mock-narrow 2 축) + 변경 영향 분리 효능.
6. **(I6) 확장성 평서**: 향후 동등 패턴 (host object 의 read-only setter 우회 — `URL` constructor / `URLSearchParams` / `Storage` / `Notification` 등, 또는 spy 의 index access strict narrow — `mock.results[N]` / `mock.instances[N]` 등) 발견 시 동일 단일 출처 원칙이 적용. 본 spec 은 현 2 패턴 한정 효능 박제, 일반 형식 확장은 별 req 후보.
7. **(I7) 자매 spec 직교 정합**: 본 단일 출처 효능은 (a) `typecheck-island-extension.md` (REQ-066) 의 island 확장 자체 효능 (typecheck error 0) 와 직교 (회복 효능 vs 회복 흡수 헬퍼 단일 출처), (b) `test-idioms.md` (REQ-021) 의 9 이디엄 박제와 동질 + 영역 직교, (c) `lint-warning-zero-gate.md` (REQ-080) 의 warning level 효능과 직교 (`mock.calls[0]!` non-null assertion 은 ESLint warning 표면 아님 — TypeScript 정책 표면). 어느 한 축 위반이 다른 축 게이트를 자동 충족시키지 않는다.
8. **(I8) 수단 중립 (RULE-07)**: 본 spec 본문 어느 곳에서도 헬퍼 module 이름 / 시그니처 / 디렉터리 위치 / aggregator 패턴 등 수단 선택지에 선호 라벨 부여 0. 효능 박제는 "단일 출처 + ad-hoc 흡수 0" 평서 한정. 라벨 hit 자기 검증은 §스코프 규칙 게이트 박제.
9. **(I9) 시점 비의존 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 현 시점 ad-hoc 흡수 hit 분포 또는 구체 test 파일명 박제 0. baseline 매트릭스 (현 시점 ad-hoc 흡수 hit count + 파일 분포) 는 §스코프 규칙 grep-baseline 한정 (감사성).

### 회귀 중점
- 새 회복 task 가 본 헬퍼 import 대신 file-local 헬퍼 또는 inline 직접 표현으로 흡수하면 (I1)(I2)(I3) 위반 — ad-hoc 흡수 누적.
- 기존 file-local 헬퍼 (특정 test 파일의 module-local 정의 등) 가 `src/test-utils/**` 로 이주되지 않은 채 다른 test 파일에서 재정의되면 (I3) 위반 — 단일 출처 분기.
- `noUncheckedIndexedAccess` 정책이 추가 영역에 적용되며 `mock.calls[N]!` 패턴이 신규 hit 누적되면 (I2) 위반 — 헬퍼 import 미경유 회복.
- `MockableLocation` 또는 동등 cast 타입이 헬퍼 외부 (test 파일 본문) 에서 재정의되면 (I1) 위반 가능성 — 적절한 cast 타입 단일 출처 또한 효능 일부.
- 본 spec 본문에 구체 ad-hoc 흡수 hit 수 또는 test 파일명 박제 시 (I9) 위반 — 시점 비의존성 무력화 (test 파일 추가/삭제 이벤트 시 spec 본문 갱신 의무 발생).
- 본 spec 본문에 헬퍼 시그니처 / module 이름 라벨 박제 시 (I8) 위반 — RULE-07 정합 무력화.

## 의존성
- 외부: vitest (`Vi.Mock<T>` `mock.calls` 타입), TypeScript (`noUncheckedIndexedAccess` 정책), jsdom (`window.location` host object 제약).
- 내부: `src/test-utils/**` (헬퍼 export 영역 — 본 효능의 산출 측면), `src/**/*.test.{ts,tsx,js,jsx}` (소비 영역 — 본 효능의 입력 측면), `tsconfig.json` 또는 `tsconfig.<island>.json` (`noUncheckedIndexedAccess` 정책 입력).
- 역의존 (사용처): `typecheck-island-extension.md` (회복 task 흡수 비용 수렴 효능), `test-idioms.md` (test 헬퍼 단일 출처 패턴 동질 — 영역 직교).

## 테스트 현황
- [x] (I1) location-mock 단일 출처 — TSK-20260517-19 (`82bb7a4`) 회수: `src/test-utils/location.ts` 신규 export (`setLocation` / `restoreLocation` / `mockUrlLocation` + `MockableLocation` type) + 호출측 `src/App.test.jsx` 3 hit → 0 hit + `src/common/common.test.ts` file-local 3 const 제거. HEAD=`985c76e` 재실측: `grep -rnE "delete\s+window\.location|window\.location\s*=" src --include="*.test.*"` → 0 hit (baseline 3 hit / 1 file → 회수 PASS).
- [x] (I2) mock-narrow 단일 출처 — TSK-20260517-19 (`82bb7a4`) 회수: `src/test-utils/mockCalls.ts` 신규 export (`firstCall<Args>` / `nthCall<Args>`) + 호출측 5 file ad-hoc `mock.calls[N]!` 5 hit → 0 hit. HEAD=`985c76e` 재실측: `grep -rnE "\.mock\.calls\[[0-9]+\]!" src --include="*.test.ts" --include="*.test.tsx"` → 0 hit (baseline 5 hit / 5 file → 회수 PASS).
- [x] (I3) 단일 출처 정합 — TSK-20260517-19 (`82bb7a4`) 회수: HEAD=`985c76e` 재실측: `grep -rnE "const\s+(setLocation|mockUrlLocation|firstCall|nthCall)\s*=" src --include="*.{ts,tsx,js,jsx}"` → `src/test-utils/**` 외부 0 hit (5 export 모두 `src/test-utils/` 내부 — G6 정합). 단일 출처 분기 0.
- [ ] (I4) typecheck island 확장 흡수 비용 수렴 — 차기 island 확장 회복 task (예: 신규 회복 대상 디렉터리) result.md 에 헬퍼 import 만으로 흡수 완료 박제. 차기 이벤트 후 marker 플립.
- [x] (I5) test-idioms 패턴 동질 — 본 spec §동작 5 박제로 정합 (영역 직교 + 변경 영향 분리 효능 평서).
- [ ] (I6) 확장성 평서 — 본 spec §동작 6 박제. 차기 동등 패턴 (`URL` / `URLSearchParams` / `mock.results` 등) 발견 시 일반 형식 확장 별 req 후보. 차기 이벤트 후 marker 플립.
- [x] (I7) 자매 spec 직교 정합 — 본 spec §동작 7 박제로 정합 (3 spec 직교 평서).
- [x] (I8) 수단 중립 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/common/test-helpers.md | grep -cE "기본값|권장|우선|default|best practice"` → 0 hit (§스코프 규칙 G5 박제).
- [x] (I9) 시점 비의존 (RULE-07) — `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/common/test-helpers.md | grep -cE "common\.test\.ts|App\.test\.jsx|Comment\.test\.tsx|ErrorBoundary\.test\.tsx|useHoverPopup\.test\.tsx|useSearchList\.test\.ts"` → 0 hit (§스코프 규칙 G6 박제).

## 수용 기준
- [x] (Must, FR-01) `src/test-utils/**` 단일 모듈에서 location-mock 헬퍼 export 박제. HEAD=`985c76e` 재실측: `grep -rnE "export.*(setLocation|mockUrlLocation|restoreLocation|locationMock)" src/test-utils/` → **3 hit** @`src/test-utils/location.ts:28,39,52` (baseline 0 → 회수 PASS). TSK-20260517-19 (`82bb7a4`).
- [x] (Must, FR-02) `src/test-utils/**` 단일 모듈에서 mock-narrow 헬퍼 export 박제. HEAD=`985c76e` 재실측: `grep -rnE "export.*(firstCall|nthCall|getMockCall|narrowMockCall)" src/test-utils/` → **2 hit** @`src/test-utils/mockCalls.ts:19,34` (`nthCall` + `firstCall` — baseline 0 → 회수 PASS). TSK-20260517-19 (`82bb7a4`).
- [x] (Should, FR-03) test 파일 내부 location ad-hoc 흡수 0 — HEAD=`985c76e` 재실측: `grep -rnE "delete\s+window\.location|window\.location\s*=" src --include="*.test.{ts,tsx,js,jsx}"` → **0 hit** (baseline 3 hit / 1 file → 회수 PASS). TSK-20260517-19 (`82bb7a4`).
- [x] (Should, FR-04) test 파일 내부 `mock.calls[N]!` ad-hoc 흡수 0 — HEAD=`985c76e` 재실측: `grep -rnE "\.mock\.calls\[[0-9]+\]!" src --include="*.test.ts" --include="*.test.tsx"` → **0 hit** (baseline 5 hit / 5 file → 회수 PASS). TSK-20260517-19 (`82bb7a4`).
- [ ] (Should, FR-05) typecheck island 확장 task 흡수 비용 수렴 — 회복 task result.md 변경 표면에 `src/test-utils/**` 외부 location/mock-narrow 헬퍼 module-level 정의 0 hit. 차기 이벤트 후 marker 플립.
- [x] (Must, FR-06) 단일 출처 정합 — HEAD=`985c76e` 재실측: `grep -rnE "const\s+(setLocation|mockUrlLocation|firstCall|nthCall)\s*=" src --include="*.{ts,tsx,js,jsx}"` → `src/test-utils/**` 외부 **0 hit** (baseline `src/common/common.test.ts` module-local 3 const → 회수 PASS). TSK-20260517-19 (`82bb7a4`).
- [x] (Should, FR-07) test-idioms 패턴 동질 + 영역 직교 — 본 spec §동작 5 박제. 본 spec 분리 결정 자체로 정합 (별 spec 분리 vs test-idioms (10)(11) 신축 — inspector 분리 결정).
- [x] (Must, FR-08) 수단 라벨 0 — `awk` + `grep` 0 hit (§스코프 규칙 G5 자기 검증).
- [x] (Could, FR-09) 확장성 평서 — §동작 6 박제 (`URL` / `URLSearchParams` / `Storage` / `Notification` / `mock.results` / `mock.instances` 등 동등 패턴 발견 시 일반 형식 확장 별 req 후보).
- [x] (NFR-01) 시점 비의존 — I9 동치.
- [x] (NFR-02) 게이트 단일성 — §동작 1·2·6 박제 (2 grep 명령 AND 게이트 — location ad-hoc 0 + mock-narrow ad-hoc 0).
- [x] (NFR-03) RULE-07 정합 — 결과 효능 (test 파일 ad-hoc 흡수 0 + `src/test-utils/**` 단일 export 1+) 만 박제. 1회성 진단 (현 ad-hoc 흡수 분포) 은 §스코프 규칙 한정.
- [x] (NFR-04) RULE-06 정합 — §스코프 규칙 grep-baseline 6 gate (G1~G6) 실측 박제 (HEAD=`49f3f93`).
- [x] (NFR-05) RULE-02 정합 — TSK-20260517-19 (`82bb7a4`) 회수: 변경 표면 = `src/test-utils/location.ts` + `src/test-utils/mockCalls.ts` 2 신규 모듈 + 6 test 파일 import 치환 (`src/common/common.test.ts` + `src/App.test.jsx` + `src/Comment/Comment.test.tsx` + `src/Search/hooks/useSearchList.test.ts` + `src/common/ErrorBoundary.test.tsx` + `src/common/useHoverPopup.test.tsx`). `src/` runtime 코드 (`src/**/!(*.test.*)`) 변경 0 + `package.json` 변경 0 (vitest/jsdom 버전 영향 0). TSK-19 result.md DoD 박제 (`npm run lint` rc=0 + `npm test` 48 file / 440 test PASS / 회귀 0 + `npm run build` rc=0).
- [x] (NFR-06) test-idioms 직교 — 본 spec §동작 5·7 박제 (9 이디엄 ↔ 2 헬퍼 영역 직교).
- [x] (NFR-07) typecheck island 확장 분리 — 본 spec §동작 4·7 박제 (회복 효능 vs 회복 흡수 헬퍼 단일 출처 별 축).

## 스코프 규칙
- **expansion**: N/A (시스템 횡단 test 헬퍼 단일 출처 게이트 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`49f3f93`, 2026-05-17 — REQ-082 흡수 시점 실측):
  - (G1) **[location ad-hoc 흡수 baseline]** `grep -rnE "delete\s+window\.location|window\.location\s*=" src --include="*.test.{ts,tsx,js,jsx}"` → **3 hit / 1 file** (`src/App.test.jsx:251` `delete window.location;` + `:252` `window.location = mock;` + `:284` `window.location = originalLocation;`). FR-03 baseline MISS.
  - (G2) **[mock.calls[N]! ad-hoc 흡수 baseline]** `grep -rnE "\.mock\.calls\[[0-9]+\]!" src --include="*.test.ts" --include="*.test.tsx"` → **5 hit / 5 file** (`src/Comment/Comment.test.tsx:360` + `src/Search/hooks/useSearchList.test.ts:32` + `src/common/ErrorBoundary.test.tsx:61` + `:78` + `src/common/useHoverPopup.test.tsx:109`). FR-04 baseline MISS.
  - (G3) **[file-local location 헬퍼 baseline]** `grep -nE "const\s+(setLocation|restoreLocation|mockUrlLocation)\s*=" src/common/common.test.ts` → 3 hit / 1 file (`src/common/common.test.ts:29` `setLocation` + `:33` `restoreLocation` + `:37` `mockUrlLocation`). FR-06 baseline MISS — `src/test-utils/**` 외부 module-local 박제.
  - (G4) **[`src/test-utils/**` 현 export baseline]** `ls src/test-utils/` → `msw.ts` + `msw.test.ts` + `queryWrapper.tsx` + `timing.ts` + `toaster.ts` + `toaster.test.ts` (6 file). `grep -rnE "export.*(setLocation|mockUrlLocation|restoreLocation|firstCall|nthCall|getMockCall|narrowMockCall)" src/test-utils/` → 0 hit. FR-01·FR-02 baseline MISS — 본 spec 의 회복 대상 zero-point.
  - (G5) **[FR-08 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/common/test-helpers.md | grep -cE "기본값|권장|우선|default|best practice"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 헬퍼 시그니처 / module 이름 / aggregator 후보 라벨 부여 0). HEAD=`49f3f93` 박제 시점 PASS.
  - (G6) **[FR-06 시점 비의존성 자기 검증]** `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/common/test-helpers.md | grep -cE "common\.test\.ts|App\.test\.jsx|Comment\.test\.tsx|ErrorBoundary\.test\.tsx|useHoverPopup\.test\.tsx|useSearchList\.test\.ts"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 현 ad-hoc 흡수 test 파일명 박제 0). HEAD=`49f3f93` 박제 시점 PASS.
- **rationale**: (G1)(G2)(G3)(G4) 본 spec 핵심 회복 대상 baseline — 단일 출처 export 0 (G4) + ad-hoc 흡수 8 hit (G1 3 + G2 5) + file-local 헬퍼 3 const (G3). (G5)(G6) RULE-07 정합 자기 검증. typecheck island 확장 비용 측정: 현 회복 task 가 새 영역 진입 시 G1·G2 패턴 재흡수 가능성 (followup 시그널) — 본 spec 효능 도입으로 흡수 비용 1 import 로 수렴.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 1 reconcile) / `82bb7a4` (TSK-20260517-19) | (I1)(I2)(I3) + FR-01·FR-02·FR-03·FR-04·FR-06 + NFR-05 marker 9건 hook-ack 플립. HEAD=`985c76e` 재실측 전수 PASS — G1 0 hit (was 3) / G2 0 hit (was 5) / G3 0 hit (was 3) / G4 5 hit (was 0) / G6 외부 0 hit. `src/test-utils/location.ts` + `mockCalls.ts` 2 신규 모듈 박제 + 6 test 파일 import 치환 회수. runtime 변경 0 + package.json 변경 0. | 테스트 현황 + 수용 기준 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-082 흡수) / pending (HEAD=`49f3f93`) | 최초 박제 — typecheck island 흡수 헬퍼 단일 출처 9 축 (I1~I9) 게이트. baseline: ad-hoc 흡수 8 hit (G1 3 location / G2 5 mock.calls) + file-local 헬퍼 3 const (G3) + `src/test-utils/**` 단일 출처 export 0 (G4). 본 spec 분리 결정 근거: `30.spec/blue/common/test-idioms.md` (REQ-021) 9 이디엄과 패턴 동질 (test 헬퍼 단일 출처) + 영역 직교 (env/render/MSW/fake-timer/console 9 축 vs location/mock-narrow 2 축). test-idioms (10)(11) 신축 vs 별 spec 박제 → 별 spec 박제 결정: blue spec 확장 시 inspector 가 blue→green 복사 + 9 이디엄 본문 영향 평가 비용 누적 + 본 효능 (typecheck island 영역) 의 변경 영향 분리 효능 우선 — `30.spec/green/common/test-helpers.md` 신규 create. typecheck island 확장 후속 task (회복 task) 의 흡수 비용 수렴 효능 박제 (I4). consumed req: `specs/20.req/20260517-typecheck-island-test-helper-single-source.md` (REQ-082) → `60.done/2026/05/17/req/` mv. consumed followup (감사 pointer): `specs/60.done/2026/05/17/followups/20260517-0548-url-location-mock-helper-cross-cutting.md` (source_task: TSK-20260517-15, category: test-pattern, severity: low) + `specs/60.done/2026/05/17/followups/20260517-0548-vitest-mock-calls-strict-narrow.md` (source_task: TSK-20260517-15, category: type-debt, severity: low). RULE-07 자기검증 — (I1)~(I9) 모두 평서형·반복 검증 가능 (`grep` 단일 명령)·시점 비의존 (G6 0 hit — 구체 test 파일명 본문 박제 0)·incident 귀속 부재 (REQ-082 §배경 의 회귀 시나리오는 시점 비의존)·수단 중립 (G5 0 hit — 헬퍼 시그니처 / module 이름 / aggregator 후보 라벨 0). RULE-06 §스코프 규칙 6 gate (G1~G6) 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/common/test-helpers.md` create). | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-typecheck-island-test-helper-single-source.md` (REQ-082 — 본 세션 mv).
- **followup 흡수 (본 spec 의 트리거)**:
  - `specs/60.done/2026/05/17/followups/20260517-0548-url-location-mock-helper-cross-cutting.md` (source_task: TSK-20260517-15, category: test-pattern, severity: low).
  - `specs/60.done/2026/05/17/followups/20260517-0548-vitest-mock-calls-strict-narrow.md` (source_task: TSK-20260517-15, category: type-debt, severity: low).
- **선행 자매 spec (test 헬퍼 단일 출처 패턴 동질)**:
  - `specs/30.spec/blue/common/test-idioms.md` (REQ-20260421-021 + REQ-027/029/035/036) — 9 이디엄 패턴 박제 (env stub / render 가드 / href intent / MSW / fake-timer 진입점 / MSW 계약 어서트 / findBy / fake-timer teardown / console spy 비파괴). 본 spec 과 동질 (test 헬퍼 단일 출처) + 영역 직교.
- **관련 spec (보완 / 직교)**:
  - `specs/30.spec/blue/foundation/typecheck-island-extension.md` (REQ-20260517-066 + 077) — island 확장 정의 (typecheck error 0 게이트). 본 spec 의 회복 task 흡수 헬퍼 단일 출처와 직교.
  - `specs/30.spec/green/foundation/lint-warning-zero-gate.md` (REQ-20260517-080) — ESLint warning level 게이트. 본 spec 과 직교 (TypeScript 정책 표면 vs ESLint warning).
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028 등) — ESLint / lint-staged / `.husky/pre-commit` 진입점 박제. 본 spec 과 직교 (도구 측 계약 vs 헬퍼 단일 출처).
- **외부 레퍼런스**:
  - vitest 공식 — `mock.calls` 타입 (`https://vitest.dev/api/mock.html#mock-calls`).
  - TypeScript 공식 — `noUncheckedIndexedAccess` (`https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess`).
  - jsdom — `window.location` host object 제약 (`https://github.com/jsdom/jsdom/issues/3492`).
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G6 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`grep` 단일 명령) · incident 귀속 부재. 수단 박제 0 (G5 0 hit 자기 검증).
  - RULE-06: grep-baseline 6 gate (G1~G6) 실측 박제 (HEAD=`49f3f93`).
  - RULE-01: inspector writer 영역만 (`30.spec/green/common/test-helpers.md` create).
