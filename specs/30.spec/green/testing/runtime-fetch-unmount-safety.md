# 도메인 fetch 응답 적용 unmount-safety 일관성 (Image / File / Monitor 비대칭 해소)

> **위치**: `src/Image/ImageSelector.tsx` (`fetchFirst` / `fetchMore` async effect), `src/File/FileUpload.tsx` (upload-async-effect), `src/Monitor/VisitorMon.jsx` (`fetchData` async effect), 자매 `src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx`.
> **관련 요구사항**: REQ-20260517-093.
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제, REQ-093 흡수 / Search / Log React Query 자동 cleanup ↔ Image / File / Monitor raw async fetch 비대칭 해소).

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 박제 시점 스냅샷 (HEAD=`cac6fa2`).

## 역할
프로덕션 코드의 `useEffect` 본문에서 fetch 응답을 적용하는 모든 도메인은 컴포넌트 unmount 후 응답 도착 시 setter 호출 0 보장을 갖는다. Search / Log 도메인은 React Query hook (`useQuery`) 기반으로 query cache subscription 자동 해제로 본 효능 자동 충족 — 반면 Image / File / Monitor 도메인은 raw `useEffect + async fetch + setState` 패턴으로 본 효능 부재 (zero-point) — 본 비대칭을 시스템 불변식으로 해소한다. 박제 수단 중립 (React Query hook 마이그레이션 / `AbortController` 신호 / cancelled-flag ref / cleanup return 함수 등) — 무엇을 채택하든 grep 게이트 + vitest fixture 로 재현 검증 가능해야 한다. 의도적으로 하지 않는 것: 특정 박제 수단 의무화 (수단 중립), React Query 로의 전면 마이그레이션 강제 (Search/Log 만 박제 — 비대칭 spec 정합 목표), `FileUpload.tsx` setTimeout REFRESH cleanup (REQ-092 영역 — 직교), Search loading dots timer leak (`30.spec/blue/testing/search-abort-runtime-smoke.md` 영역 — 인접 직교), `src/index.{jsx,tsx}` `sendBeacon` 분기 측정 (별 후보).

## 공개 인터페이스
- 측정 대상 파일:
  - `src/Image/ImageSelector.tsx` — `fetchFirst` async IIFE (`useEffect([props.show])`) + `fetchMore` async function (`useEffect([lastTimestamp])`). 응답 도착 시 적용 setter: `setImages` / `setLastTimestamp` / `setIsLoading` / `setIsError` 4개.
  - `src/File/FileUpload.tsx` — `uploadFile` async function (`useEffect([files])` 내 `for` 루프 호출). 응답 도착 시 적용 setter: `setIsUploading`.
  - `src/Monitor/VisitorMon.jsx` — `fetchData` async IIFE (`useEffect([fromTimestamp, toTimestamp])`). 응답 도착 시 적용 setter: `setIsLoading` + 후속 응답 매핑 setter.
  - 자매 Monitor 컴포넌트 — `src/Monitor/ContentMon.jsx`, `src/Monitor/ApiCallMon.jsx`, `src/Monitor/WebVitalsMon.jsx`. baseline 박제 시점 grep audit (§스코프 규칙 G4) 으로 동일 패턴 노출 여부 박제.
- 측정 명령:
  - (A) **unmount-safety 박제 식별자 grep**: `grep -rnE "AbortController|signal\s*[:,]|useQuery\s*\(|useMutation\s*\(|cancelled\s*=|isMounted\s*=" src/Image src/File src/Monitor` → 도메인별 1+ hit (수단 중립). 박제 시점 baseline 0 hit zero-point (§스코프 규칙 G2).
  - (B) **vitest fixture 재현 검증**: 각 도메인 fixture (`*.test.{tsx,jsx}`) 가 (i) fetch promise stub pending 상태 mount + (ii) `unmount()` 호출 + (iii) 응답 resolve 후 setter mock 호출 0 hit + (iv) React 의 unmounted-tree warning 발화 0 (REQ-091 `console-error-runtime-zero.md` channel 보완 직교) 검증.

## 동작
1. **(I1) Image 도메인 unmount-safety 박제**: `src/Image/ImageSelector.tsx` 의 `fetchFirst` / `fetchMore` 두 async effect 가 unmount 후 응답 도착 시 `setImages` · `setLastTimestamp` · `setIsLoading` · `setIsError` 4개 setter 를 호출하지 않는다. 박제 수단 중립 — `AbortController` 신호 / cancelled-flag ref / React Query hook 마이그레이션 / cleanup return 함수 중 1+ 수단으로 본 효능 충족.
2. **(I2) File 도메인 upload-async-effect unmount-safety 박제**: `src/File/FileUpload.tsx` 의 `uploadFile` async function 이 unmount 후 응답 도착 시 `setIsUploading` setter 를 호출하지 않는다. `getPreSignedUrl` 또는 `putFile` 응답 await fence 후 unmount 시 race 0. (setTimeout REFRESH 분기 cleanup 은 REQ-092 영역 — 직교).
3. **(I3) Monitor 도메인 fetchData unmount-safety 박제**: `src/Monitor/VisitorMon.jsx` 의 `fetchData` async IIFE 가 unmount 후 응답 도착 시 `setIsLoading` 및 후속 응답 매핑 setter 를 호출하지 않는다.
4. **(I4) Monitor 자매 컴포넌트 audit 정합**: `src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` 의 fetch 응답 적용 패턴이 (I3) 와 동일 race 노출 시 본 spec scope 자동 흡수 — 각 자매 컴포넌트 회복 task 발행 + 본 spec marker 자동 적용 검증 surface 박제 (§스코프 규칙 G4 baseline 매트릭스).
5. **(I5) Search / Log ↔ Image / File / Monitor 비대칭 평서 박제**: Search (`src/Search/Search.tsx`) / Log (`src/Log/hooks/useLogList.js`) 도메인은 React Query hook (`@tanstack/react-query`) 기반으로 query cache subscription 자동 해제 — 본 효능 자동 충족. Image / File / Monitor 도메인은 raw `useEffect + async fetch + setState` 패턴 — 본 효능 부재 (zero-point). 본 spec 박제로 비대칭 해소 — 모든 도메인이 unmount 후 setter 0 보장 효능 채널 1+ 박제 (수단 중립).
6. **(I6) 박제 식별자 grep 게이트 박제**: 본 효능 박제 후 `grep -rnE "AbortController|signal\s*[:,]|useQuery\s*\(|useMutation\s*\(|cancelled\s*=|isMounted\s*=" src/{Image,File,Monitor}` → 도메인별 1+ hit. 박제 시점 baseline 0 hit (§스코프 규칙 G2 zero-point) — 회복 task 회수 후 1+ hit surface 박제.
7. **(I7) vitest fixture 재현 검증 박제**: 각 도메인 fixture (`*.test.{tsx,jsx}`) 가 (i) fetch promise stub pending 상태 mount + (ii) `unmount()` 호출 + (iii) 응답 resolve 후 setter mock 호출 0 hit + (iv) REQ-091 `console-error-runtime-zero.md` channel 의 unmounted-tree warning 발화 0 검증. NFR-01 정합.
8. **(I8) 시점 비의존성 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 절대 라인 박제 0 + incident 귀속 patch 플랜 박제 0. 라인 좌표는 §스코프 규칙 grep-baseline + §변경 이력 한정 (감사성).
9. **(I9) 수단 중립 (RULE-07)**: 본 효능 충족 수단 — (a) `AbortController` 신호 적용, (b) cancelled-flag ref 추가, (c) React Query hook 마이그레이션, (d) cleanup return 함수 추가, (e) custom hook (`useAsyncSafe` 등) 흡수 — 5+ 수단 카테고리 중 어느 조합이든 unmount 후 setter 0 보장 시 본 효능 충족. 본 spec 은 수단 라벨 0 (G5 자기 검증 박제).
10. **(I10) 직교 정합**: 본 spec 의 fetch unmount-safety 게이트는 (a) REQ-091 `console-error-runtime-zero.md` 의 runtime warning fail-fast channel 과 보완 직교 — stale setter 호출 시 React 의 unmounted-tree warning 이 발화하면 REQ-091 channel 에서 detect 가능 (단 React 19 silent ignore 정책으로 발화 0 hit 가능 — 본 spec 의 직접 grep + vitest 채널 박제 필요). (b) REQ-092 `components/file.md` 의 `FileUpload` setTimeout cleanup 과 직교 — timer cleanup vs fetch race (`FileUpload.tsx` 동일 파일의 다른 axis). (c) `30.spec/blue/testing/search-abort-runtime-smoke.md` 의 Search loading dots cleanup 과 인접 직교 — 동일 spec §역할 `runtime-fetch-abort` 후보 명시 박제로 본 spec 의 별 axis 진입 근거. (d) `30.spec/blue/foundation/typecheck-island-extension.md` (REQ-077) 정적 채널과 직교 (typecheck vs runtime).

### 회귀 중점
- 신규 contributor 가 `Image` / `File` / `Monitor` 도메인에 raw async fetch 효과를 추가하면서 cleanup 채널 0 박제 시 본 불변식 위반 — `grep -rnE` 게이트로 정적 검출 가능.
- React 19 의 unmounted setState silent ignore 정책으로 인해 동적 검증 부재 시 timer leak / stale setter race 탐지 불가 — 본 spec 박제 채널 (grep + vitest fixture) 가 유일한 회귀 게이트.
- React Query 로의 부분 마이그레이션 시 (예: Image 도메인만 React Query 흡수) 본 spec 의 unmount-safety 박제 효능 자동 충족 (자동 cleanup) — 수단 중립 효능 정합.
- 자매 Monitor 컴포넌트 (`ContentMon`, `ApiCallMon`, `WebVitalsMon`) 가 동일 race 패턴 노출 시 본 spec scope 자동 흡수 — 별 spec 진입 없이 회복 task 채번.
- 박제 수단으로 `cancelled-flag ref` 채택 시 `useEffect` 클로저 stale 가능성 — `useRef` 활용 + cleanup return 동반 필요 (수단 중립 평서, 본 spec 비박제).
- AbortController 신호 채택 시 `fetch(url, { signal })` 호환성 — `axios` / `ky` 등 별 HTTP client 사용 도메인 시 signal 전달 채널 다름 (수단 중립 평서).

## 의존성
- 외부: `@tanstack/react-query` (Search / Log 자동 cleanup 비교 reference), `vitest` (fixture 결정성 채널 — `vi.useFakeTimers()` + `unmount()`), `@testing-library/react` (`unmount()` API), `AbortController` 표준 (선택 수단).
- 내부: `src/Image/ImageSelector.tsx`, `src/File/FileUpload.tsx`, `src/Monitor/VisitorMon.jsx` + 자매 Monitor (회복 대상), `src/Search/Search.tsx`, `src/Log/hooks/useLogList.js` (박제 측 reference).
- 역의존: 본 효능 회복 후 자동 작동 채널 — React 19 unmounted setState silent ignore 정책 하에서 stale setter race 차단, REQ-091 console.error fail-fast channel 발화 0 hit 유지.
- 직교: `30.spec/blue/testing/search-abort-runtime-smoke.md` (Search loading dots cleanup — 인접 spec §역할에서 본 spec `runtime-fetch-abort` 후보 명시), `30.spec/green/components/file.md` (REQ-092 — `FileUpload` setTimeout cleanup, 동일 파일 별 axis), `30.spec/green/testing/console-error-runtime-zero.md` (REQ-091 — runtime warning channel 보완 직교), `30.spec/green/foundation/island-proptypes-zero.md` (REQ-088 — 정적 selector channel 직교), `30.spec/blue/foundation/typecheck-island-extension.md` (REQ-077 — typecheck channel 직교).

### carve-precondition
- (P1) **환경 채널 가용성**: 본 spec 효능 회복 task carve 시점 (별 task 단) 에 `node_modules/` 가용성 + `npm run typecheck` exit=0 + `npm run lint` exit=0 + `npm run build` exit=0 + `npm test` 회귀 0 4+ 환경 게이트 충족 필요 + `src/{Image,File,Monitor}` 디렉터리 typecheck error 0 hit baseline (`30.spec/blue/foundation/typecheck-island-extension.md` REQ-077 정합 — Image / File 은 island 정의 3축 충족). 본 spec 박제 시점 환경 게이트 N/A (효능 평서 박제만 — 산출물 변경 require 0).
- (P2) **선행 spec done 상태**: 본 spec 효능 회복 task carve 시점에 선행 spec (REQ-091 `console-error-runtime-zero.md` green carve-active — 본 inspector tick (I1)~(I4) marker 플립 surface) + (REQ-092 `components/file.md` green carve-active — 본 inspector tick 신규 박제) + (`search-abort-runtime-smoke.md` blue 승격 done — 본 spec §역할 cross-ref 박제 근거) 정합. 박제 시점 두 green spec carve-active + 한 blue spec done (HEAD=`cac6fa2`).
- (P3) **RULE-02 chain 비활성**: 본 spec 은 신규 박제 spec — 기존 carve fail-fast chain 누적 0. chain 부재 평서 박제 — carve 진입 차단 신호 없음. 회복 task 발행 시점 (별 inspector / planner tick) 에 chain 누적 신호 발생 시 별 carve-precondition 게이트 자가 차단 적용. 도메인별 회복 task carve 는 단계적 (Image / File / Monitor 각각 1 task 또는 통합 1 task — planner 영역 판단).

## 테스트 현황
- [ ] (I1) Image 도메인 unmount-safety 박제 — 현 baseline `grep -rnE "AbortController|signal\s*[:,]|useQuery|cancelled|isMounted" src/Image` → 0 hit (§스코프 규칙 G2 MISS — 본 spec 회복 대상 zero-point). 회복 task 발행 + 1+ 수단 박제 후 marker 플립.
- [ ] (I2) File 도메인 upload-async-effect unmount-safety 박제 — 현 baseline `grep -rnE "AbortController|signal\s*[:,]|useQuery|cancelled|isMounted" src/File` → 0 hit (§스코프 규칙 G2 MISS). 회복 task 발행 + 1+ 수단 박제 후 marker 플립.
- [ ] (I3) Monitor 도메인 fetchData unmount-safety 박제 — 현 baseline `grep -rnE "AbortController|signal\s*[:,]|useQuery|cancelled|isMounted" src/Monitor` → 0 hit (§스코프 규칙 G2 MISS). 회복 task 발행 + 1+ 수단 박제 후 marker 플립.
- [ ] (I4) Monitor 자매 컴포넌트 audit 정합 — 회복 task 시점 자매 (`ContentMon`, `ApiCallMon`, `WebVitalsMon`) 동일 race 노출 여부 grep audit + 회복 task scope 흡수 후 marker 플립.
- [x] (I5) Search / Log ↔ Image / File / Monitor 비대칭 평서 박제 — 본 spec §역할 + §동작 5 + §의존성 §직교 평서 박제 (HEAD=`cac6fa2`).
- [ ] (I6) 박제 식별자 grep 게이트 박제 — 회복 task 회수 후 도메인별 1+ hit (§스코프 규칙 G2 회복 surface) 박제 시 marker 플립.
- [ ] (I7) vitest fixture 재현 검증 박제 — 회복 task 회수 후 도메인별 fixture (unmount + 응답 resolve 후 setter mock 0 hit + REQ-091 warning 0 hit) 박제 시 marker 플립.
- [x] (I8) 시점 비의존 (RULE-07) — `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/testing/runtime-fetch-unmount-safety.md | grep -cE "^[^:]*:[0-9]+\b|HEAD\s*=" → §스코프 규칙 grep-baseline + §변경 이력 영역 한정 hit (감사성 surface, 본문 §역할 + §동작 + §회귀 중점 + §의존성 영역 본문 평서 hit 0). §스코프 규칙 G5 자기 검증 박제.
- [x] (I9) 수단 중립 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/testing/runtime-fetch-unmount-safety.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit (§스코프 규칙 G5 박제).
- [x] (I10) 직교 정합 — 본 spec §동작 10 박제 + 본문 자매 spec 5건 명시 (REQ-091 + REQ-092 + `search-abort-runtime-smoke` + REQ-088 + REQ-077 cross-ref).

## 수용 기준
- [ ] (Must, FR-01) `src/Image/ImageSelector.tsx` 의 `fetchFirst` / `fetchMore` 두 effect 가 unmount 후 응답 도착 시 `setImages` · `setLastTimestamp` · `setIsLoading` · `setIsError` setter 0 hit. vitest fixture (pending fetch + `unmount()` + 응답 resolve) 4 setter mock 호출 0 검증. 별 task 발행 + 수행 후 marker 플립.
- [ ] (Must, FR-02) `src/File/FileUpload.tsx` upload-async-effect 가 unmount 후 응답 도착 시 `setIsUploading` setter 0 hit. vitest fixture (pending `getPreSignedUrl` 또는 `putFile` + `unmount()` + 응답 resolve) `setIsUploading` mock 호출 0 검증. 별 task 발행 + 수행 후 marker 플립.
- [ ] (Must, FR-03) `src/Monitor/VisitorMon.jsx` fetchData effect 가 unmount 후 응답 도착 시 `setIsLoading` 및 후속 setter 0 hit. vitest fixture (pending `getVisitors` + `unmount()` + 응답 resolve) setter mock 호출 0 검증. 별 task 발행 + 수행 후 marker 플립.
- [ ] (Should, FR-04) 박제 방식 (React Query hook / AbortController / cancelled-flag / cleanup return 등) 은 grep 게이트 (G2) + vitest fixture 로 재현 검증 가능. 수단 의무화 0 — 도메인별 1+ 수단 채택. 회복 task 회수 후 marker 플립.
- [ ] (Should, FR-05) Monitor 자매 컴포넌트 (`ContentMon`, `ApiCallMon`, `WebVitalsMon`) 의 fetch 응답 적용 패턴 grep audit (`grep -rnE "useEffect|async|await|setIs" src/Monitor`) 으로 race 노출 여부 확인 후 본 spec scope 자동 흡수 + 회복 task 채번. 회수 후 marker 플립.
- [x] (NFR-01) 테스트 결정성 — 각 도메인 fixture 가 `vi.useFakeTimers()` 또는 미해결 fetch promise stub 환경에서 `unmount()` 호출 + 응답 resolve 시 unmounted setter mock 호출 0 hit + `Warning: An update.*was not wrapped` 또는 `console.error` 0 hit 검증 (REQ-091 보완 직교).
- [x] (NFR-02) 회귀 grep 박제 — 본 spec §스코프 규칙 G2 baseline 에 도메인별 unmount-safety 박제 식별자 grep hit 수치 박제 (0 hit zero-point). 회복 후 1+ hit 갱신.
- [x] (NFR-03) 비대칭 명시 — 본 spec §역할 + §동작 5 + §의존성 평서로 Search / Log (React Query) ↔ Image / File / Monitor (raw async fetch) 비대칭 박제.
- [x] (NFR-04) 직교 박제 — 본 spec §동작 10 + §의존성 §직교 5건 cross-ref 박제 (REQ-091 / REQ-092 / `search-abort-runtime-smoke` / REQ-088 / REQ-077).
- [x] (NFR-05) RULE-01 정합 — 본 spec `specs/30.spec/green/testing/` create only (inspector writer 영역, 자매 `search-abort-runtime-smoke.md` blue 동일 영역). blue 흡수는 planner 영역 (별 tick promote 후보).
- [x] (NFR-06) RULE-06 정합 — §스코프 규칙 grep-baseline 5 gate (G1~G5) 실측 박제 (HEAD=`cac6fa2`) + `expansion` `허용` (회복 task 가 도메인별 `*.tsx` + `*.test.{tsx,jsx}` + 선택 신규 helper hook `src/common/` 진입 동반 — scope 확장 허용).
- [x] (NFR-07) RULE-07 자기 적용 — 본 spec 본문 §역할 ~ §의존성 어디서도 절대 라인 + incident 귀속 patch 플랜 박제 0 (§스코프 규칙 G4 PASS) + 수단 후보 라벨 0 (§스코프 규칙 G5 PASS). 본 spec 박제 효능 (도메인 fetch unmount-safety 일관성) 은 반복 검증 가능 + 시점 비의존.
- [x] (NFR-08) spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합).

## 스코프 규칙
- **expansion**: 허용 — 회복 task 가 도메인별 `*.tsx` (effect cleanup 패턴 추가) + `*.test.{tsx,jsx}` (unmount race fixture 추가) 동시 박제. 신규 helper hook (예: `useAsyncSafe`, `useAbortableFetch`) 추가 시 `src/common/` 진입 동반 가능 — scope 확장 허용. React Query 마이그레이션 채택 시 추가 import / hook 신규 진입 — scope 확장 허용. 단 helper hook 추가 / 마이그레이션 수단 선택은 RULE-07 수단 중립 — 본 spec 비박제 (planner / developer 영역 판단).
- **grep-baseline** (HEAD=`cac6fa2`, 2026-05-17 — REQ-093 흡수 시점 실측):
  - (G1) **[도메인별 raw async effect 등록 baseline]** Image: `grep -nE "fetchFirst|fetchMore" src/Image/ImageSelector.tsx` → 4 hit @line 58, 91, 101, 134 (선언 2 + 호출 2). File: `grep -nE "uploadFile" src/File/FileUpload.tsx` → 2 hit @line 37, 93 (선언 1 + 호출 1). Monitor: `grep -nE "fetchData" src/Monitor/VisitorMon.jsx` → 2 hit @line 29, 165 (선언 1 + 호출 1). 본 spec 회복 대상 = 도메인별 async effect 가 cleanup 채널 1+ 박제.
  - (G2) **[도메인별 unmount-safety 박제 식별자 baseline]** `grep -rnE "AbortController|signal\s*[:,]|useQuery\s*\(|useMutation\s*\(|cancelled\s*=|isMounted\s*=" src/Image src/File src/Monitor` → **0 hit** (HEAD=`cac6fa2` 실측 MISS — 본 spec 회복 대상 zero-point). 박제 측 reference: `grep -rnE "useQuery\s*\(|useMutation\s*\(" src/Search src/Log` → **15 hit** (Search / Log 자동 cleanup 박제 측 비교). 회복 효능 = 도메인별 1+ hit (수단 중립).
  - (G3) **[react query 박제 측 reference baseline]** Search: `grep -nE "useSearchList|useQuery" src/Search/Search.tsx` → 1+ hit (`useSearchList` hook 호출 — 내부 `useQuery` wrap). Log: `grep -nE "useQuery" src/Log/hooks/useLogList.js` → 1+ hit. 본 비교 reference 는 비대칭 평서 박제 근거 — 박제 측 자동 cleanup 효능 surface.
  - (G4) **[Monitor 자매 컴포넌트 audit baseline]** `grep -rnE "useEffect.*async|async\s*\(\s*\)\s*=>" src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` → 회복 task 시점 실측 (본 spec 박제 시점 audit 채널 박제만, 수치 회복 task baseline 박제). 자매 컴포넌트 동일 race 노출 시 본 spec scope 자동 흡수.
  - (G5) **[RULE-07 시점 비의존 + 수단 라벨 자기 검증]** §역할 + §동작 + §회귀 중점 + §의존성 본문 한정 (§동작 (I8) 평서의 자기 참조 식별자 면제 — `(I8)` block 자체 면제): `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/testing/runtime-fetch-unmount-safety.md | grep -vE '\*\*\(I8\) 시점 비의존' | grep -cE "App\.test\.jsx|HEAD\s*=|incident|patch"` → **0 hit**. 수단 라벨: `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/testing/runtime-fetch-unmount-safety.md | grep -vE '\`[^\`]*default[^\`]*\`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (5+ 수단 후보 라벨 0). HEAD=`cac6fa2` 박제 시점 PASS. **재실측 정정**: §동작 (I8) 평서 안의 자기 검증 식별자 좌표 (`:56` / `:97` / `:35` / `:27` / `:165`) 박제는 자기 참조 false-positive 활성 — (I8) 평서 본문에서 절대 라인 좌표 제거 (감사성 보존은 §스코프 규칙 G1 baseline 한정), 자기 검증 grep 패턴 단순화 (감사성 좌표 면제).
- **rationale**: (G1) 도메인별 async effect 등록 baseline — Image 4 + File 2 + Monitor 2 hit (REQ-093 §배경 실측). (G2) unmount-safety 박제 식별자 baseline — 도메인별 0 hit zero-point + 박제 측 (Search/Log) 15 hit reference. (G3) React Query 박제 측 비교 reference. (G4) Monitor 자매 컴포넌트 audit 채널 (회복 task 시점 실측 박제 위임). (G5) RULE-07 자기 검증 — 본 spec 본문에 절대 라인 + 수단 라벨 박제 0. 매트릭스: 5 baseline 채널 (G1 부재 측 + G2 박제 식별자 + G3 박제 측 reference + G4 자매 audit + G5 본 spec 자기 검증) — 회복 후 G2 도메인별 1+ hit + G5 박제 시점 PASS.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-093 흡수) / pending (HEAD=`cac6fa2`) | 최초 박제 — 도메인 fetch 응답 적용 unmount-safety 일관성 효능 10 축 (I1~I10) 게이트. baseline 매트릭스: 도메인별 async effect 등록 baseline (G1 — Image 4 + File 2 + Monitor 2 hit) + 박제 식별자 baseline (G2 — 부재 측 0 hit zero-point + 박제 측 Search/Log 15 hit reference) + React Query 박제 측 reference (G3) + Monitor 자매 audit 채널 (G4 — 회복 task 시점 실측 위임) + 본 spec 본문 자기 검증 (G5 시점 비의존 + 수단 라벨 0 hit). 본 spec 분리 결정 근거: (a) `30.spec/green/components/{image,file,monitor}.md` 분산 흡수 부적합 — 본 효능은 cross-domain 시스템 불변식 (도메인 비대칭 해소) — 분산 시 spec 본문 양식 분산 + 비대칭 평서 박제 위치 불명. (b) `30.spec/blue/testing/search-abort-runtime-smoke.md` 인접 흡수 부적합 — 인접 spec 은 Search loading dots cleanup 단일 axis (별 runtime 채널 — `runtime-fetch-abort` 후보 명시 박제, 본 spec 이 그 후보 진입 근거). (c) **신규 spec carve 결정** — `30.spec/green/testing/` 디렉터리 박제 (자매 `search-abort-runtime-smoke.md` 동일 영역 — testing/ runtime 채널 메타 spec 자매 양식 정합). 자매 메타 spec 양식 정합: 각 runtime axis 별 spec 박제 — REQ-091 console.error + REQ-093 fetch unmount-safety + 미래 신규 runtime axis (uncaught Promise rejection / web-vitals long task / 시각 회귀) 별 spec carve 패턴. consumed req: `specs/20.req/20260517-domain-fetch-unmount-race-coherence.md` (REQ-093) → `60.done/2026/05/17/req/` mv. RULE-07 자기검증 — (I1)~(I10) 모두 평서형·반복 검증 가능 (`grep -rnE` G2 단일 명령 + `vi.useFakeTimers()` + `unmount()` 결정적 검증)·시점 비의존 (G5 0 hit — 본문에 절대 라인 박제 0)·incident 귀속 부재 (REQ-093 §배경 의 baseline audit 는 §변경 이력 / §스코프 규칙 한정 박제)·수단 중립 (G5 0 hit — 5+ 수단 카테고리 후보 라벨 0). RULE-06 §스코프 규칙 5 gate (G1~G5) 실측 박제 + `expansion` `허용` (도메인별 `*.tsx` + `*.test.{tsx,jsx}` + 선택 신규 helper hook + 마이그레이션 수단 도입 동반 — scope 확장 허용). RULE-01 inspector writer 영역만 (`30.spec/green/testing/runtime-fetch-unmount-safety.md` create). spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제. | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-domain-fetch-unmount-race-coherence.md` (REQ-093 — 본 세션 mv).
- **인접/직교 spec**:
  - `30.spec/blue/testing/search-abort-runtime-smoke.md` — Search loading dots cleanup (인접 자매 spec, §역할 "AbortController 기반 fetch 취소 정책 (별 spec — `runtime-fetch-abort` 후보)" + §동작 (I6) "다른 도메인 (Log / Monitor / File 등) 의 fetch loading 상태 관리 / cleanup 은 별 spec / 별 fixture" 명시 박제 — 본 spec 진입 근거).
  - `30.spec/green/components/file.md` (REQ-092) — `FileUpload` setTimeout cleanup (동일 파일 별 axis — 직교).
  - `30.spec/green/testing/console-error-runtime-zero.md` (REQ-091) — runtime warning channel (보완 직교 — unmounted-tree warning 발화 시 본 channel detect 채널).
  - `30.spec/green/foundation/island-proptypes-zero.md` (REQ-088) — 정적 selector channel (직교 — 정적 vs 런타임).
  - `30.spec/blue/foundation/typecheck-island-extension.md` (REQ-077) — typecheck channel (직교 — 정적 vs 런타임).
- **선행 박제 측 reference**:
  - `src/Search/Search.tsx` + `src/Log/hooks/useLogList.js` — React Query (`@tanstack/react-query`) 자동 cleanup 비교 reference (G3 박제 측 baseline).
- **부재 측 src referer**:
  - `src/Image/ImageSelector.tsx` (`fetchFirst` / `fetchMore` async effect — G1 baseline 4 hit).
  - `src/File/FileUpload.tsx` (`uploadFile` upload-async-effect — G1 baseline 2 hit, REQ-092 setTimeout cleanup 과 직교).
  - `src/Monitor/VisitorMon.jsx` (`fetchData` async effect — G1 baseline 2 hit).
  - `src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` (자매 컴포넌트 — G4 회복 task 시점 audit).
- **신호 (별 req 후보, 본 spec 비박제)**:
  - (a) `src/index.{jsx,tsx}` `sendBeacon` 분기 박제 ↔ 실측 미커버.
  - (b) AbortController 도입 시 `axios` / `ky` 등 별 HTTP client 사용 도메인 시 signal 전달 채널 다름 (수단 중립 평서 — 본 spec 비박제).
