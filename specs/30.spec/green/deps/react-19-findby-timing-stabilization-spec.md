# React 19 잔존 findBy* 타이밍 안정화 (4 케이스 재선정 정비)

> **위치**: `src/File/File.test.jsx` (117 인근), `src/Log/LogSingle.test.jsx` (113, 179, 327 인근), 공통 후보 `src/test-utils/timing.js` (timeout 상수/헬퍼)
> **관련 요구사항**: REQ-20260420-008, REQ-20260421-002
> **최종 업데이트**: 2026-04-21 (by inspector, post-TSK-39 reject, range +LogSingle:113)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20, HEAD=3f9e590).

## 역할
REQ-20260420-004 (react-19-test-layer-adaptation) 완료 이후에도 React 19 재bump 시 `findByText` 기반 4 케이스 (`File.test.jsx:117`, `LogSingle.test.jsx:113`, `:179`, `:327`) 가 기본 1000ms 및 1차 상향값 3000ms 로도 실패하여 TSK-20260420-30 이 `50.blocked/task/` 에 격리되고 TSK-20260420-39 가 rejected→followup→REQ-20260421-002 로 재진입한 상태를 해소한다. 본 spec 은 fake-timer·MSW teardown 이 아닌 **렌더/MSW resolution 지연을 흡수하는 타이밍 안정화 패턴** 의 **재선정** — 옵션 α (timeout 상향 5000~10000ms, 이디엄 B 유지), 옵션 β (이디엄 C — `waitFor` + 중간 assertion), 옵션 γ (StrictMode 이중 render × toaster `setTimeout` / MSW resolve 상호작용 제거) 중 단일 채택 — 을 통해 React 18 baseline green 을 보존한 채 React 19.2.5 rebump 경로를 재개한다. 런타임 소스 수정, MSW 수명주기 변경, 다른 모듈 findBy* 감사는 본 spec 밖. **[deferred: TSK-20260420-39 실측에서 3000ms 부족 입증 — α/β/γ 중 재선정 필요. LogSingle:113 을 In-Scope 승격.]**

## 공개 인터페이스
- **선택 옵션 1종** (planner 가 spec 승격 시점에 고정; 옵션 α/β/γ 중 1안 — 혼용 금지):
  - **α (상향, 최소 변경)**: `await screen.findByText(..., { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` 유지하되 `ASYNC_ASSERTION_TIMEOUT_MS` 값을 5000~10000ms 로 상향. `src/test-utils/timing.js` 단일 지점에서만 변경. 하드코딩 금지.
  - **β (waitFor 전환)**: `await waitFor(() => expect(screen.getByText(...)).toBeInTheDocument(), { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` 형태. polling 주기 testing-library 기본값 (50ms) 유지, 실패 진단 메시지가 `findByText` 기본보다 명시적. React 19 StrictMode effect double-invoke 영향 구간 흡수.
  - **γ (근본 원인 제거)**: StrictMode 이중 render × toaster `setTimeout` / MSW resolve 상호작용 구간에 중간 단계 assertion (list refetch 완료 대기 등) 을 명시. 블록 경계에 1줄 주석으로 근거 박제.
- **TIMEOUT_MS 상수** (Must): `src/test-utils/timing.js` 에 `ASYNC_ASSERTION_TIMEOUT_MS` 상수 export. 모든 참조처는 import 유지 — 하드코딩 숫자 금지.
- **패턴 적용 범위**: `File.test.jsx:117` 1건 + `LogSingle.test.jsx:113, 179, 327` 3건 = 총 **4건** (기존 3건 + `:113` In-Scope 승격, REQ-20260421-002 FR-02). 이외 `findByText` 호출 (File 10건, LogSingle 13건 — 섹션 baseline 참조) 는 React 18 baseline green 이라 변경 대상 아님.

## 동작
1. 선택된 이디엄으로 3 케이스 각각을 재작성. 파일 내 다른 `findByText` 호출과 혼합되지 않도록 블록 경계 명시 (주석 1줄 이상, REQ 참조 포함).
2. 이디엄 A 채택 시 `import { waitFor } from '@testing-library/react'` 선언 중복 점검 — 이미 import 중인 파일이면 추가 불필요.
3. `TIMEOUT_MS` 상수를 도입할 경우 `src/test-utils/timing.js` (또는 동급 위치) 신규 생성 + 2개 test 파일에서 `import { ASYNC_ASSERTION_TIMEOUT_MS } from '@/test-utils/timing'` 사용. 2회 중복 이내 제한 (NFR-04).
4. React 18.x baseline 에서 `npm test` — 46 files / 368 tests 전원 green 유지. 3 케이스에서 timeout 상향이 실제 사용되지 않고도 통과해야 함 (polling 은 조건 충족 즉시 반환).
5. React 19.2.5 재bump (npm install `react@19.2.5 react-dom@19.2.5 @testing-library/react@16.3.2 @types/react@19.2.14 @types/react-dom@19.2.3`) 시 3 케이스가 green 으로 전환됨을 단발성 실측 (본 spec 작업 내 재bump 는 사후 검증 노트로 박제; 재bump 자체는 TSK-30 재개 사이클에서 수행).
6. `npm run lint` 경고·오류 증감 0.

### Baseline (2026-04-21, HEAD=afe109e)
- `src/File/File.test.jsx:117` — `const copiedToast = await screen.findByText(/URL copied\.$/);` (토글·delete 후 copy 성공 토스터). 파일 내 `findByText` 총 10 hits (:55, :87, :117, :149, :173, :200, :238, :257, :270, :284 — HEAD=afe109e 실측, 2건 라인 drift). React 18 현 HEAD 에서 전원 green.
- `src/Log/LogSingle.test.jsx:113` — `findByText("The log is deleted.")` (delete 성공 토스터). REQ-20260421-002 In-Scope 승격 (REQ-008 Out-of-Scope 재평가).
- `src/Log/LogSingle.test.jsx:179` — `findByText("Lorem ipsum dolor sit amet,")` 본문 resolve (`useMockServer(() => mock.devServerGetOkDeleteFailed)`). REQ-008 원 `:174` 는 it 선언 라인 추정, 현 HEAD 실측 `:179`.
- `src/Log/LogSingle.test.jsx:327` — `findByText("Test Contents")` 본문 resolve (`useMockServer(() => mock.devServerOk)`). REQ-008 원 `:326` 는 HEAD=afe109e 에서 `:327` 로 1 라인 drift.
- 파일 내 `findByText` 총 13 hits (`LogSingle.test.jsx`: :94, :105, :113, :120, :149, :179, :182, :190, :225, :244, :262, :280, :327 — HEAD=afe109e 실측, REQ-008 baseline 12 → 13 drift).
- React 19.2.5 재bump 관찰 실패 (REQ-20260421-002 배경): 4 failed / 366 passed (TSK-39 적용 후 시도, 3000ms 로도 부족). 재bump 자체는 `git checkout -- package.json package-lock.json && npm install` 로 원복.
- 참고 blocker: `specs/50.blocked/task/TSK-20260420-30-react-19-upgrade.md` — 본 spec 완료 후 수동 개입으로 재개 가능.
- TSK-20260420-39 실측 기록: `specs/60.done/2026/04/21/followups/20260420-1513-react-19-findby-timing-stabilization-from-blocked.md` (원복 증거·재현 커맨드 포함).

## 의존성
- 내부: `src/File/File.test.jsx` (117 인근), `src/Log/LogSingle.test.jsx` (113, 179, 327 인근), `src/test-utils/timing.js` (TSK-39 가 도입한 기존 파일, `ASYNC_ASSERTION_TIMEOUT_MS` 상수 재선정), `src/test-utils/msw.js` (기존 `useMockServer`).
- 외부: `@testing-library/react` (`waitFor`, `screen.findByText` options), `vitest` (`expect`).
- 역의존: `specs/50.blocked/task/TSK-20260420-30-react-19-upgrade.md` — 본 spec 완료 후 수동 개입(RULE-05) 으로 복귀 가능. `specs/30.spec/blue/deps/react-19-upgrade-spec.md`, `deps/react-19-test-layer-adaptation-spec.md` (타 축).

## 테스트 현황
- [x] React 18.x (`react@18.2.0`) 현 HEAD `npm test` — 46 files / 370 tests green (HEAD=afe109e, TSK-38/40 반영).
- [x] `File.test.jsx:117`, `LogSingle.test.jsx:113, 179, 327` React 18 green baseline.
- [ ] 4 케이스 옵션 전환 후 React 18 baseline green 유지 (FR-01, FR-02, NFR-01).
- [ ] React 19.2.5 재bump 시 4 케이스 green (NFR-02) — 단발성 실측.
- [ ] `npm run lint` 0 warn / 0 error.

## 수용 기준
- [ ] (Must) 옵션 α/β/γ 중 단일 이디엄 채택 — 혼용 금지 (REQ-20260421-002 FR-01).
- [ ] (Must) `src/File/File.test.jsx:117` 인근 토스터 대기 assertion 이 선택 옵션으로 전환. 주석 1줄 이상에 REQ-20260420-008 / REQ-20260421-002 참조.
- [ ] (Must) `src/Log/LogSingle.test.jsx:113` ("The log is deleted."), `:179` ("Lorem ipsum"), `:327` ("Test Contents") 세 위치에서 동일 이디엄 전환. 주석 동일 형식 (REQ-20260421-002 FR-02 — `:113` In-Scope 승격).
- [ ] (Must) 옵션 α 시 `ASYNC_ASSERTION_TIMEOUT_MS` 상수 값을 `src/test-utils/timing.js` 단일 파일에서만 변경. 모든 참조처는 상수 import 유지 (하드코딩 숫자 금지) — REQ-20260421-002 FR-03.
- [ ] (Must) 옵션 β 시 `waitFor(() => expect(...).toBeInTheDocument(), { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` 형태로 통일 — REQ-20260421-002 FR-04.
- [ ] (Should) 옵션 γ 시 StrictMode 이중 render × toaster `setTimeout` / MSW resolve 상호작용을 1줄 주석으로 블록 경계에 박제 — REQ-20260421-002 FR-05.
- [ ] (Must) React 18.x (`npm test`) — 46 files / 370 tests 전원 green + flake 0 (REQ-20260421-002 FR-06 / NFR-01).
- [ ] (Must) React 19.2.5 재bump 1회 실측 (`npm install react@19.2.5 react-dom@19.2.5 @testing-library/react@16.3.2 @types/react@19.2.14 @types/react-dom@19.2.3 && npm test`) → 4 케이스 green + 46/370 green. 결과 수치를 `result.md` 에 박제 후 `git checkout -- package.json package-lock.json && npm install` 로 원복 (REQ-20260421-002 FR-07).
- [ ] (Should) `npm run lint` 경고·오류 증감 0.
- [ ] (NFR) `npm test` wall-clock 증분 ±10% 내 (timeout 상향의 실질 대기 시간은 조건 충족 즉시 반환되므로 영향 미미 기대) — REQ-20260421-002 NFR-05.
- [ ] (NFR) 수정 파일 3개 이내 (`File.test.jsx`, `LogSingle.test.jsx`, `test-utils/timing.js`) — REQ-20260421-002 NFR-03.
- [ ] (NFR) `src/**` 런타임 파일 0건 수정 — REQ-20260421-002 NFR-03.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=afe109e):
  - `grep -n "findByText" src/File/File.test.jsx` → 10 hits at `:55, :87, :117, :149, :173, :200, :238, :257, :270, :284`.
  - `grep -n "findByText" src/Log/LogSingle.test.jsx` → 13 hits at `:94, :105, :113, :120, :149, :179, :182, :190, :225, :244, :262, :280, :327`.
  - `grep -rn "ASYNC_ASSERTION_TIMEOUT_MS" src` → TSK-39 원복 후 0 hits (timing.js 미존재 또는 상수 미도입 상태). 옵션 α/β 시 재도입.
  - `grep -n "waitFor(" src/File/File.test.jsx src/Log/LogSingle.test.jsx` → 0 hits (옵션 β 채택 시 증가 허용; α/γ 시 혼용 방지).
  - `git diff --stat` (완료 후 기대): `src/File/File.test.jsx`, `src/Log/LogSingle.test.jsx`, `src/test-utils/timing.js` 만 수정.
- **rationale**: 런타임 소스 (`src/File/*.jsx`, `src/Log/*.jsx`, `src/common/common.js` 등) 는 React 18 baseline 에서 전원 green 이므로 본 spec 수정 범위 밖 (REQ-20260420-008 / REQ-20260421-002 §Out-of-Scope). 다른 테스트 파일의 `findByText` 는 React 19 에서도 green 이 관찰되어 감사 대상 아님 (확장 시 별도 followup). MSW 수명주기·fake-timer teardown 은 REQ-004 / REQ-007 이 담당, 본 spec 과 중복 없음. File 파일 내 다른 9건 findBy* 는 React 18/19 양쪽 green 이라 불변 유지. `LogSingle:113` 은 REQ-20260421-002 FR-02 에서 In-Scope 승격됨.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-008 반영) | all |
| 2026-04-21 | inspector / — | REQ-20260421-002 재진입 반영: 3000ms 부족 실증 (TSK-39 rejected) 박제 + 옵션 α/β/γ 재선정 요구 + 범위 +LogSingle:113 승격 + baseline grep 재측정 (HEAD=afe109e, File 10 hits / LogSingle 13 hits). | 역할·공개 인터페이스·Baseline·수용 기준·스코프 규칙 |
