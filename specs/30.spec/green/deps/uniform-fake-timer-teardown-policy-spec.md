# Fake-timer teardown convention 통일 (전역 afterEach + setupTests 단일화)

> **위치**: `src/setupTests.js` (전역 setup), `src/setupTests.timer-idiom.test.jsx` (메타 어서트), 17개 `.test.{js,jsx}` (fake-timer 사용처)
> **관련 요구사항**: REQ-20260420-007
> **최종 업데이트**: 2026-04-20 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20, HEAD=14696b3).

## 역할
`vi.useFakeTimers({ shouldAdvanceTime: true })` 사용처에서 `useRealTimers()` 해제 지점이 4가지 convention 으로 흩어져 있어 신규 테스트 추가 시 누락 위험이 있고, 1회성 `src/Log/LogSingle.test.jsx` flake 의 유력 경로인 fake-timer carry-over 가 열려 있다. 본 spec 은 `src/setupTests.js` 에 전역 `afterEach(() => vi.useRealTimers())` 를 **정확히 1회** 추가하여 teardown 을 단일 지점으로 박제하고, 파일 본문(`it`/`test` 내부) 직접 `vi.useRealTimers()` 호출을 20건 이상 감소시킨다. REQ-20260420-004 §FR-01 (이디엄) / §NFR-03 (주석) 의 teardown 축 후속 보강이며, 런타임 소스와 MSW 수명주기는 범위 밖.

## 공개 인터페이스
- **`src/setupTests.js` 변경 규약**:
  - 기존 `afterEach(() => { vi.unstubAllEnvs(); })` 블록 내부에 `vi.useRealTimers()` 를 병합하거나, 독립 `afterEach` 블록 1개를 신설. 본 파일 외 setup 재정의 금지.
  - 호출 순서: env stub 해제와 무관(독립 idempotent). 병합 시 `vi.unstubAllEnvs()` → `vi.useRealTimers()` 순서 권장 (env 분기 의존 테스트 보호).
  - 헤더 주석 (fake-timer idiom 문단, 현 `:7-20`) 에 "전역 `afterEach` 가 `vi.useRealTimers()` 해제를 담당하므로 파일별 `afterEach(() => vi.useRealTimers())` 추가는 선택 사항" 1줄 이상 박제.
- **메타 어서트** — `src/setupTests.timer-idiom.test.jsx` 또는 동급 파일에 "임의 테스트가 `vi.useFakeTimers({ shouldAdvanceTime: true })` 호출 후 종료 → 다음 테스트 시작 시점에 `vi.isFakeTimers() === false`" 단정 1건 추가 (기존 FR-01 어서트 하단 또는 동일 describe 내부).
- **파일 본문 직접 호출 정리 (Should)** — `grep -rn "vi\.useRealTimers\(\)" src --include="*.test.js" --include="*.test.jsx"` 의 각 `it`/`test` 본문 내부 직접 호출을 20건 이상 감소. `afterEach(() => vi.useRealTimers())` 블록 형태의 잔존은 허용.

## 동작
1. `src/setupTests.js` 를 수정하여 전역 `afterEach` 에 `vi.useRealTimers()` 가 정확히 1회 포함되도록 한다. `grep -n "useRealTimers" src/setupTests.js` → 1 매칭.
2. 헤더 주석 fake-timer idiom 문단에 전역 teardown 규칙 문장을 1줄 이상 추가 (FR-04, REQ-20260420-004 §NFR-03 정합).
3. `src/setupTests.timer-idiom.test.jsx` 또는 동등 메타 스위트에 `vi.isFakeTimers() === false` 를 직접 단정하는 어서트 1건 추가. 어서트는 직전 테스트에서 `vi.useFakeTimers({ shouldAdvanceTime: true })` 를 호출하고 전역 afterEach 통과 후 다음 테스트 시작 시점의 상태를 검증하는 순서로 기술.
4. 17개 `.test.jsx` 파일 중 **본문 직접 `vi.useRealTimers()`** 호출 (총 baseline 41 hits) 의 최소 20건을 제거. `afterEach` 블록 인자 위치 호출은 제거 대상 아님. 파일 단위 판단은 developer 자율이되 호출 제거 후 해당 describe 의 다음 테스트가 `vi.isFakeTimers() === false` 로 시작함이 구조적으로 보장되는지 검토.
5. `npm run test` 전 스위트 green. 기존 pass 수 (`Tests: 361 passed` 기준 — 현 HEAD 368/368 green 상회 수치 사용 가능) 유지, FR-03 어서트 추가로 +1 허용.
6. `npm run test` 10회 연속 실행 모두 green. flake 0.
7. `npm run lint` 경고·오류 증감 0.

### Baseline (2026-04-20, HEAD=14696b3)
- `src/setupTests.js` 현재 상태:
  - 전역 `afterEach(() => { vi.unstubAllEnvs(); })` 1개 등록 (:39-41).
  - `vi.useRealTimers` 0 매칭. **추가 대상**.
  - 헤더 주석 fake-timer idiom 문단 (:7-20) 존재. `:18` 에 "`vi.useRealTimers()` 해제를 각 스위트의 `afterEach` 또는 `afterAll` 에 반드시 포함" — 본 spec 완료 시 전역 afterEach 언급 1줄로 갱신.
- `vi.useRealTimers()` in `*.test.{js,jsx}` — 41 hits in 18 files:
  - Body 직접 호출 (선두 탭/스페이스·`it` 블록 내부): `Comment/Comment.test.jsx:227, 274`, `Comment/CommentItem.test.jsx:17`, `File/File.test.jsx:181, 289`, `File/FileDrop.test.jsx:140, 215`, `File/FileUpload.test.jsx:116, 193`, `Log/LogItem.test.jsx:102, 322, 381`, `Log/LogItemInfo.test.jsx:52`, `Log/LogSingle.test.jsx:115, 188, 225`, `Log/Writer.test.jsx:96, 145, 194, 245, 296, 346, 471`, `Monitor/ContentItem.test.jsx:40, 60, 82, 102, 123, 145, 168, 191, 212`, `Monitor/VisitorMon.test.jsx:57`, `Search/Search.test.jsx:220`, `Search/SearchInput.test.jsx:140`, `Toaster/Toaster.test.jsx:95, 116, 180, 210`, `common/useHoverPopup.test.jsx:7`.
  - `afterEach(...)` 블록 인자 위치 (계속 허용): `setupTests.timer-idiom.test.jsx:27`, `Toaster/Toaster.test.jsx:8`.
- `vi.useFakeTimers({ shouldAdvanceTime: true })` 사용처 (참고): 17 files — `Comment.test.jsx` ×2, `CommentItem.test.jsx` ×1, `File.test.jsx` ×2, `FileDrop.test.jsx` ×2, `FileUpload.test.jsx` ×2, `LogItem.test.jsx` ×3, `LogItemInfo.test.jsx` ×1, `LogSingle.test.jsx` ×1, `Writer.test.jsx` ×7, `ContentItem.test.jsx` ×9, `VisitorMon.test.jsx` ×1, `SearchInput.test.jsx` ×1, `Toaster.test.jsx` ×5, `useHoverPopup.test.jsx` ×4, `setupTests.timer-idiom.test.jsx` ×1 (메타), `Search.test.jsx` ×1 (`shouldAdvanceTime: false` — debounce 예외).

## 의존성
- 내부: `src/setupTests.js:7-20,38-41` (fake-timer idiom 주석 + 전역 afterEach), `src/setupTests.timer-idiom.test.jsx:25-47` (기존 메타 스위트), 17개 `.test.jsx` fake-timer 사용처, `src/test-utils/msw.js` (MSW 수명주기 — 본 spec 과 무관, 동 파일 편집 금지).
- 외부: `vitest` (`vi.useFakeTimers`, `vi.useRealTimers`, `vi.isFakeTimers`, `afterEach`).
- 역의존: REQ-20260420-004 / blue `deps/react-19-test-layer-adaptation-spec.md` (§FR-01 이디엄 + §NFR-03 주석). 본 spec 은 teardown 축 후속 보강으로 중복 없음.

## 테스트 현황
- [x] `src/setupTests.timer-idiom.test.jsx` — 기존 FR-01 어서트 1건 green (TSK-20260420-35-a, commit e4a470b).
- [x] 현 HEAD `npm run test` 368/368 green (commit 08a64f6 — MSW pair 이후).
- [ ] 전역 afterEach 추가 후 전 스위트 green 유지 (FR-05).
- [ ] 메타 어서트 `vi.isFakeTimers() === false` 1건 추가 및 green (FR-03).
- [ ] `npm run test` 10회 연속 모두 green (FR-06).
- [ ] `grep -rn "vi\.useRealTimers\(\)" src --include="*.test.js" --include="*.test.jsx"` — body 직접 호출 20건 이상 감소 (FR-02 / Should).

## 수용 기준
- [ ] (Must) `grep -n "useRealTimers" src/setupTests.js` → 정확히 1 매칭 + `afterEach` 블록 내부.
- [ ] (Must) `src/setupTests.timer-idiom.test.jsx` (또는 동급 메타 스위트) 에 `vi.isFakeTimers()` 단정 어서트 1건 추가 + green.
- [ ] (Must) `src/setupTests.js` 헤더 주석에 "전역 `afterEach` 가 `vi.useRealTimers()` 해제를 담당" 문구 1줄 이상 박제.
- [ ] (Must) `npm run test` 전 스위트 green + pass 수 baseline 동등 또는 +1 (메타 어서트 추가분).
- [ ] (Must) `for i in {1..10}; do npm run test; done` 10회 모두 green — fake-timer carry-over flake 재현 0 (FR-06).
- [ ] (Should) `grep -rn "vi\.useRealTimers\(\)" src --include="*.test.js" --include="*.test.jsx"` body 직접 호출 baseline 대비 20건 이상 감소. `afterEach(...)` 인자 위치 매칭은 제외.
- [ ] (Should) `npm run lint` 경고·오류 증감 0.
- [ ] (Should) 소비 followup 2건 (`60.done/2026/04/20/followups/20260420-2158-logsingle-flake-observed-once-during-carve.md`, `...-2159-uniform-aftereach-userealtimers-policy.md`) 의 구조적 해소를 result.md 에 명시.
- [ ] (NFR) `npm run test` wall-clock 변동 ±5% 내 (afterEach 1개 증가의 오버헤드 허용 범위).
- [ ] (NFR) REQ-20260420-004 §NFR-03 idiom 주석과 충돌 없음 — `src/setupTests.js:7-20` 수정 시 기존 MSW/env idiom 문단 불변.
- [ ] (NFR) 메타 어서트 실패 시 원인 식별 가능한 진단 메시지 (기본 `expect(vi.isFakeTimers()).toBe(false)` 로 충분).

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `grep -n "useRealTimers" src/setupTests.js` → 0 hits (기본 상태, FR-01 적용 후 1).
  - `grep -rn "vi\.useRealTimers\(\)" src --include="*.test.js" --include="*.test.jsx"` → 41 hits in 18 files:
    - `src/Comment/Comment.test.jsx:227, 274`
    - `src/Comment/CommentItem.test.jsx:17`
    - `src/File/File.test.jsx:181, 289`
    - `src/File/FileDrop.test.jsx:140, 215`
    - `src/File/FileUpload.test.jsx:116, 193`
    - `src/Log/LogItem.test.jsx:102, 322, 381`
    - `src/Log/LogItemInfo.test.jsx:52`
    - `src/Log/LogSingle.test.jsx:115, 188, 225`
    - `src/Log/Writer.test.jsx:96, 145, 194, 245, 296, 346, 471`
    - `src/Monitor/ContentItem.test.jsx:40, 60, 82, 102, 123, 145, 168, 191, 212`
    - `src/Monitor/VisitorMon.test.jsx:57`
    - `src/Search/Search.test.jsx:220`
    - `src/Search/SearchInput.test.jsx:140`
    - `src/Toaster/Toaster.test.jsx:8, 95, 116, 180, 210`
    - `src/common/useHoverPopup.test.jsx:7`
    - `src/setupTests.timer-idiom.test.jsx:27`
  - `grep -rn "vi\.useFakeTimers\(\s*\{\s*shouldAdvanceTime" src --include="*.test.js" --include="*.test.jsx"` → 45 hits in 17 files (참고 baseline, 본 spec 에서 변경 대상 아님).
- **rationale**: 런타임 소스 (`src/**/*.{js,jsx}` 중 `*.test.*` 제외) 의 어떤 변경도 본 spec 범위 밖. `vi.useFakeTimers(...)` 옵션·호출 형태 변경은 REQ-20260420-004 / `deps/react-19-test-layer-adaptation-spec` 관할로 중복 방지. MSW `setupServer()` 수명주기는 REQ-004 §FR-02 / `src/test-utils/msw.js` 에서 이미 처리됨. `src/Search/Search.test.jsx:216` 의 `{ shouldAdvanceTime: false }` 는 debounce 제어 목적 의도적 예외로 본 spec 은 teardown convention 만 다루므로 영향 없음. grep 게이트는 `*.test.*` 한정이며 `setupTests.js` 의 1 매칭은 FR-01 에 의해 허용되는 신규 등록.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-007 반영, followup 2건 merge 경로) | all |
