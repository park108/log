# Toaster conditional mount 또는 test-utils 헬퍼 표준화

> **위치**: `src/Toaster/Toaster.jsx` 의 `Toaster` (보조: 항상 mount 되는 `<div role="alert" data-show=... />`). 소비자: `src/File/File.jsx:179, 184`, `src/File/FileItem.jsx:101`, `src/File/FileUpload.jsx:141`, `src/Comment/Comment.jsx:185`, `src/Search/SearchInput.jsx:56`, `src/Log/LogList.jsx:207`, `src/Log/Writer.jsx:373`. 테스트 우회: `src/File/File.test.jsx:99` `document.querySelector('[data-type="information"][data-position="center"]')`.
> **관련 요구사항**: REQ-20260421-009
> **최종 업데이트**: 2026-04-21 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=ae80e56).

## 역할
`Toaster` 는 `show` prop 을 CSS class(`divToasterHide` / `divToasterFadeout`) 로만 토글하므로 메시지 텍스트가 hidden(`data-show="0"`) / fadeout(`data-show="2"`) 상태에서도 DOM 에 잔존한다. 결과적으로 테스트는 `screen.queryByText(/Loading files/i).not.toBeInTheDocument()` 로 "로딩 완료" 를 assertion 할 수 없고, `document.querySelector('[data-type="information"][data-position="center"]')` 같은 data-attribute 우회를 강요받는다. 본 spec 은 (A) `Toaster` 를 conditional mount 로 변경하거나 (B) `src/test-utils/toaster.js` 에 `waitForToasterHidden(type, position)` 헬퍼를 공식화하는 두 옵션 중 **하나를 spec 단계에서 확정**하고, 선택되지 않은 옵션은 §대안으로 보존한다. 런타임 redesign(메시지 queue, 다중 인스턴스), Toaster CSS 리디자인, 단일 파일 초과 대규모 리팩터링은 본 spec 밖.

## 공개 인터페이스
- **FR-01 (Must) — 옵션 확정**: spec §동작 에 옵션 A(conditional mount) 또는 옵션 B(test-utils 헬퍼) 중 **하나를 채택**. 본 spec 은 **옵션 B 를 기본 채택** — 사유: NFR-04 비용 비교상 runtime 파일 0 변경 + 신규 helper 1건 + 우회 셀렉터 치환이 옵션 A(Toaster + 전체 소비자 변경 + fadeout 애니메이션 시퀀싱 재설계) 대비 훨씬 저비용. 옵션 A 는 §대안 섹션에 보존 — 시각적 DOM 오염이 QA 이슈로 승격되는 시점에 재평가.
- **FR-02 (Must, 옵션 B) — test-utils 헬퍼 신설**: `src/test-utils/toaster.js` 에 다음 export 제공:
  ```js
  // 숨김(data-show="0") 대기 — Loading 등 "사라져야 함" 단정용.
  export async function waitForToasterHidden(type, position, { timeout } = {}) { ... }
  // 표시(data-show="1") 대기 — 단정적으로 메시지 존재를 확인할 때.
  export async function waitForToasterVisible(type, position, { timeout } = {}) { ... }
  // 단일 조회(헬퍼 외부에서 attribute 직접 접근 필요 시).
  export function getToasterElement(type, position) { ... }
  ```
  내부 구현은 `waitFor(() => expect(document.querySelector(\`[data-type="${type}"][data-position="${position}"]\`)?.getAttribute('data-show')).toBe(expected))` 또는 동등 패턴. `timeout` 기본값은 `ASYNC_ASSERTION_TIMEOUT_MS` (`src/test-utils/timing.js` 재사용).
- **FR-03 (Must, 옵션 B) — 기존 우회 셀렉터 치환**: `src/File/File.test.jsx:99` 의 `document.querySelector('[data-type="information"][data-position="center"]')` 호출 + `getAttribute('data-show')` 조합을 `waitForToasterHidden("information", "center")` 또는 `getToasterElement(...)` 호출로 치환. grep 게이트 대상.
- **FR-04 (Must) — grep-baseline 박제 (사용처)**: spec 에 `grep -rn "<Toaster " src/` 결과 8건(`FileUpload.jsx:141`, `File.jsx:179, 184`, `FileItem.jsx:101`, `Comment.jsx:185`, `SearchInput.jsx:56`, `LogList.jsx:207`, `Writer.jsx:373`) 박제. 옵션 A 채택 시 이 전부가 수정 범위.
- **FR-05 (Must, 옵션 B) — grep 게이트**: `grep -rn 'document.querySelector.*data-type=' src --include="*.test.*"` → 0 hits. 단일 우회(`src/File/File.test.jsx:99`) 는 FR-03 에서 제거됨.
- **FR-06 (Should, 옵션 B) — 헬퍼 단위 테스트**: `src/test-utils/toaster.test.js` (또는 File.test.jsx 의 helper 호출 단정) 로 `waitForToasterHidden` / `waitForToasterVisible` 의 기본 동작 sanity 검증 — (1) 즉시 숨김 상태, (2) `data-show` 전환 후 resolve, (3) timeout 시 rejection.
- **FR-07 (Should, 옵션 B) — 다른 테스트 확산 가이드**: spec 에 "다른 Toaster 소비자 테스트에서 유사 패턴 발견 시 헬퍼 사용 권장" 가이드 박제. 전수 마이그레이션은 follow-up 로 분기 (본 spec 범위 밖).
- **FR-08 (Must) — 선택된 옵션 외의 옵션 보존**: 옵션 A 를 §대안 섹션에 1~2문단으로 보존. 기술: conditional mount 는 `{ isShow<Scope>Toaster !== 0 && <Toaster ... /> }` 형식 + fadeout 은 Toaster 내부에서 `useEffect` timeout 후 `onUnmount` callback 으로 parent 에게 unmount 신호 (또는 `show` 가 `2` 상태에서 1000ms 경과 후 parent 가 state 를 초기화).
- **FR-09 (Must) — 테스트 결정성**: `npm test -- --run` → 0 fail. `vitest run --sequence.shuffle --sequence.seed={1,2,3}` → 0 fail.

## 동작
1. (FR-01, FR-08) 옵션 B 를 spec §동작 에 확정. 옵션 A 는 §대안으로 보존 — conditional mount 는 fadeout 애니메이션 유지 설계 복잡도(Toaster 내부 타이머 완료 후 parent state 초기화)와 8개 소비자 동시 변경 리스크가 큼. 옵션 B 는 runtime 0 변경.
2. (FR-02) `src/test-utils/toaster.js` 신설. 예시 구현 골격:
   ```js
   import { waitFor } from '@testing-library/react';
   import { ASYNC_ASSERTION_TIMEOUT_MS } from './timing';

   export function getToasterElement(type, position) {
     return document.querySelector(
       `[role="alert"][data-type="${type}"][data-position="${position}"]`
     );
   }
   export function waitForToasterHidden(type, position, { timeout = ASYNC_ASSERTION_TIMEOUT_MS } = {}) {
     return waitFor(() => {
       const el = getToasterElement(type, position);
       const show = el?.getAttribute('data-show');
       // show === '0' (hide) 또는 '2' (fadeout) 또는 el 부재 = 숨김.
       if (!el) return;
       if (show === '0' || show === '2' || show === 'none') return;
       throw new Error(`Toaster still visible: data-show=${show}`);
     }, { timeout });
   }
   export function waitForToasterVisible(type, position, { timeout = ASYNC_ASSERTION_TIMEOUT_MS } = {}) {
     return waitFor(() => {
       const el = getToasterElement(type, position);
       const show = el?.getAttribute('data-show');
       if (show !== '1') throw new Error(`Toaster not visible: data-show=${show ?? 'missing'}`);
     }, { timeout });
   }
   ```
   (상세 구현은 task 단계에서 확정 — 위 예시는 spec 가이드.)
3. (FR-03) `src/File/File.test.jsx:97-103` 범위의 `waitFor(() => { const loadingToaster = document.querySelector('[data-type="information"][data-position="center"]'); expect(loadingToaster?.getAttribute('data-show')).not.toBe('1'); })` 를 `await waitForToasterHidden("information", "center")` 로 치환. 기존 `waitFor` 호출 + options 인자 전달 구조는 헬퍼 내부에서 흡수.
4. (FR-04, FR-05) grep-baseline 박제 + 게이트 대상 파일 확정.
5. (FR-06) `src/test-utils/toaster.test.js` 단위 테스트 3건 추가(또는 기존 File.test.jsx 내부 1건으로 대체). 헬퍼 호출 sanity.
6. (FR-07) spec 에 "다른 Toaster 소비자 테스트(FileUpload.test.jsx, Comment.test.jsx, SearchInput.test.jsx, LogList.test.jsx, Writer.test.jsx, FileItem.test.jsx) 에서 유사 우회 패턴 탐지 시 헬퍼 사용 권장" 가이드 박제.
7. (FR-09) 실측: `npm test -- --run` → 0 fail. `vitest run --sequence.shuffle --sequence.seed={1,2,3}` → 0 fail. 수치 result.md 박제.

### 대안 (§옵션 A 보존)
- **conditional mount**: 소비자에서 `show` state 가 `0` 또는 `undefined` 일 때 `<Toaster />` 를 렌더하지 않음 (`{ isShowToaster !== 0 && <Toaster ... /> }`). fadeout(`show === 2`) 은 Toaster 내부 `useEffect` timeout 완료 후 parent 에 `onComplete` callback 으로 unmount 요청. 8개 소비자 동시 변경 + fadeout 시퀀스 재설계 리스크. 본 spec 1차 버전에서는 미채택.
- 채택 재평가 트리거: (a) 시각적으로 잔존 DOM 이 a11y/스크린리더 이슈 유발, (b) 헬퍼 기반 테스트의 유지보수 비용이 conditional mount 단일 리팩터링 비용을 초과, (c) Toaster redesign 프로젝트 발생.

### Baseline (2026-04-21, HEAD=ae80e56)
- `grep -rn "<Toaster " src` → 8 hits in 8 files:
  - `src/File/FileUpload.jsx:141`
  - `src/File/File.jsx:179, 184` (같은 파일 2건)
  - `src/File/FileItem.jsx:101`
  - `src/Comment/Comment.jsx:185`
  - `src/Search/SearchInput.jsx:56`
  - `src/Log/LogList.jsx:207`
  - `src/Log/Writer.jsx:373`
- `grep -rn "document.querySelector.*data-type=" src` → 1 hit at `src/File/File.test.jsx:99` (FR-03/FR-05 대상).
- `grep -rn "waitForToasterHidden\\|waitForToasterVisible\\|getToasterElement" src` → 0 hits (FR-02 후 ≥3 hits 예상).
- `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → ≥1 hit (FR-02 의존성).

## 의존성
- 내부: `src/test-utils/toaster.js` (신규), `src/test-utils/timing.js` (`ASYNC_ASSERTION_TIMEOUT_MS` 재사용), `src/File/File.test.jsx` (FR-03 치환 대상), `src/Toaster/Toaster.jsx` (runtime 불변, `data-type` / `data-position` / `data-show` attribute contract 준수).
- 외부: `@testing-library/react` (`waitFor`).
- 역의존: REQ-20260421-008 (File.test.jsx 시나리오 분할) — FR-03 치환이 같은 파일 수정이므로 REQ-008 병합 시 순서 명시 (REQ-009 먼저 헬퍼 도입 + 기존 우회 치환 → REQ-008 의 분할은 헬퍼 호출 상태에서 수행). REQ-20260421-007 (shuffle-safety cold-start) — 독립이나 `ASYNC_ASSERTION_TIMEOUT_MS` 공유.

## 테스트 현황
- [x] 현 HEAD `npm test` (serial) → 0 fail (ae80e56).
- [x] 우회 셀렉터 1건 존재 확인 (`src/File/File.test.jsx:99`).
- [ ] FR-02 헬퍼 3종 export.
- [ ] FR-03 우회 치환 (grep 게이트 0 hits).
- [ ] FR-06 헬퍼 sanity test.
- [ ] FR-09 shuffle seed {1,2,3} 0 fail.
- [ ] `npm run lint` 0 warn/error.

## 수용 기준
- [ ] (Must) FR-01 — spec §동작 에 옵션 B 채택 명시.
- [ ] (Must) FR-02 — `src/test-utils/toaster.js` 가 `waitForToasterHidden`, `waitForToasterVisible`, `getToasterElement` 3종 export.
- [ ] (Must) FR-03 — `src/File/File.test.jsx:99` 우회 셀렉터 제거, 헬퍼 호출로 치환.
- [ ] (Must) FR-04 — spec §Baseline 에 `<Toaster ` 사용처 8건 박제.
- [ ] (Must) FR-05 — `grep -rn 'document.querySelector.*data-type=' src --include="*.test.*"` → 0 hits.
- [ ] (Must) FR-08 — 옵션 A 가 §대안 섹션에 보존됨.
- [ ] (Must) FR-09 — `npm test -- --run` → 0 fail. `vitest run --sequence.shuffle --sequence.seed={1,2,3}` → 0 fail.
- [ ] (Should) FR-06 — 헬퍼 sanity test ≥ 1건.
- [ ] (Should) FR-07 — 다른 Toaster 소비자 테스트 확산 가이드 1문단 박제.
- [ ] (NFR) NFR-04 — runtime 소스(`src/Toaster/Toaster.jsx`, `src/File/File.jsx` 등 8개 소비자) 변경 0 라인.
- [ ] (NFR) NFR-02 — 헬퍼 timeout 기본값 `ASYNC_ASSERTION_TIMEOUT_MS` 준수.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=ae80e56):
  - `grep -rn "<Toaster " src` → 8 hits in 8 files (FR-04 박제; runtime 불변).
  - `grep -rn "document.querySelector.*data-type=" src` → 1 hit at `src/File/File.test.jsx:99` (FR-05 게이트 대상).
  - `grep -rn "waitForToasterHidden\\|waitForToasterVisible\\|getToasterElement" src` → 0 hits (FR-02 후 ≥3 hits).
  - `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src/test-utils/timing.js` → ≥1 hit (FR-02 선결 의존).
- **rationale**: 옵션 B 채택으로 수정 범위는 `src/test-utils/toaster.js`(신규) + `src/File/File.test.jsx` 한 파일 치환 + 선택적 단위 테스트. runtime 소스(`src/Toaster/Toaster.jsx`, `src/File/File.jsx`, `src/File/FileItem.jsx`, `src/File/FileUpload.jsx`, `src/Comment/Comment.jsx`, `src/Search/SearchInput.jsx`, `src/Log/LogList.jsx`, `src/Log/Writer.jsx`) 변경 금지. 다른 테스트 파일의 유사 패턴 전수 치환은 follow-up 분기 (본 spec 범위 밖). 옵션 A 채택을 차기 spec revision 에서 평가할 수 있도록 §대안 보존.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-009 반영; 옵션 B(test-utils 헬퍼) 채택, 옵션 A 는 대안 보존. runtime 0 변경 + File.test.jsx 우회 1건 치환 + grep 게이트 확정) | all |
