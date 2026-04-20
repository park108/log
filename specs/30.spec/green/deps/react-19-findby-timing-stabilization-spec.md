# React 19 잔존 findBy* 타이밍 안정화 (3 케이스 선결 정비)

> **위치**: `src/File/File.test.jsx` (117 인근), `src/Log/LogSingle.test.jsx` (174, 326 인근), 공통 후보 `src/test-utils/` (timeout 상수/헬퍼)
> **관련 요구사항**: REQ-20260420-008
> **최종 업데이트**: 2026-04-20 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20, HEAD=3f9e590).

## 역할
REQ-20260420-004 (react-19-test-layer-adaptation) 완료 이후에도 React 19 재bump 시 `findByText` 기반 3 케이스 (`File.test.jsx:117`, `LogSingle.test.jsx:174`, `LogSingle.test.jsx:326`) 가 기본 1000ms 타임아웃으로 실패하여 TSK-20260420-30 이 `50.blocked/task/` 에 격리된 상태를 해소한다. 본 spec 은 fake-timer·MSW teardown 이 아닌 **렌더/MSW resolution 지연을 흡수하는 타이밍 안정화 패턴** (waitFor 전환, 명시 timeout 상향, 중간 assertion 추가 중 단일 이디엄) 을 채택해 React 18 baseline green 을 보존한 채 React 19.2.5 rebump 경로를 재개한다. 런타임 소스 수정, MSW 수명주기 변경, 다른 모듈 findBy* 감사는 본 spec 밖.

## 공개 인터페이스
- **선택 이디엄 1종** (planner 가 spec 승격 시점에 고정):
  - **A (권장)**: `await waitFor(() => expect(screen.getByText(...)).toBeInTheDocument(), { timeout: TIMEOUT_MS })` — polling 주기 testing-library 기본값 (50ms) 유지, 실패 진단 메시지가 `findByText` 기본보다 명시적.
  - **B**: `await screen.findByText(..., { timeout: TIMEOUT_MS })` — 호출 형태 최소 변경. 단, React 19 StrictMode effect double-invoke 와의 상호작용 확인 필요.
  - **C**: 중간 단계 assertion 추가 (list refetch 완료 대기 등) 로 race 원인 구간 명시 — `File.test.jsx:117` 의 seeMore→delete→first-file 클릭 연쇄에만 국한 적용 가능.
- **TIMEOUT_MS 상수** (Should): `src/test-utils/timing.js` (신규) 또는 `src/test-utils/msw.js` 에 `ASYNC_ASSERTION_TIMEOUT_MS = 3000` 상수 export. 2개 파일에서 동일 상수 참조.
- **패턴 적용 범위**: `File.test.jsx:117` 1건 + `LogSingle.test.jsx:174, 326` 2건 = 총 3건. 이외 `findByText` 호출 (File 10건, LogSingle 12건 — 섹션 baseline 참조) 는 React 18 baseline green 이라 변경 대상 아님.

## 동작
1. 선택된 이디엄으로 3 케이스 각각을 재작성. 파일 내 다른 `findByText` 호출과 혼합되지 않도록 블록 경계 명시 (주석 1줄 이상, REQ 참조 포함).
2. 이디엄 A 채택 시 `import { waitFor } from '@testing-library/react'` 선언 중복 점검 — 이미 import 중인 파일이면 추가 불필요.
3. `TIMEOUT_MS` 상수를 도입할 경우 `src/test-utils/timing.js` (또는 동급 위치) 신규 생성 + 2개 test 파일에서 `import { ASYNC_ASSERTION_TIMEOUT_MS } from '@/test-utils/timing'` 사용. 2회 중복 이내 제한 (NFR-04).
4. React 18.x baseline 에서 `npm test` — 46 files / 368 tests 전원 green 유지. 3 케이스에서 timeout 상향이 실제 사용되지 않고도 통과해야 함 (polling 은 조건 충족 즉시 반환).
5. React 19.2.5 재bump (npm install `react@19.2.5 react-dom@19.2.5 @testing-library/react@16.3.2 @types/react@19.2.14 @types/react-dom@19.2.3`) 시 3 케이스가 green 으로 전환됨을 단발성 실측 (본 spec 작업 내 재bump 는 사후 검증 노트로 박제; 재bump 자체는 TSK-30 재개 사이클에서 수행).
6. `npm run lint` 경고·오류 증감 0.

### Baseline (2026-04-20, HEAD=3f9e590)
- `src/File/File.test.jsx:117` — `const copiedToast = await screen.findByText(/URL copied\.$/);` (토글·delete 후 copy 성공 토스터). 파일 내 `findByText` 총 10 hits (:55, :87, :117, :149, :173, :202, :240, :259, :272, :286). React 18 현 HEAD 에서 전원 green.
- `src/Log/LogSingle.test.jsx:174` — `useMockServer(() => mock.devServerGetOkDeleteFailed)` 시나리오의 `"Lorem ipsum dolor sit amet,"` 본문 resolve. (181 라인 근처 — REQ 본문의 `:174` 는 it 블록 시작 추정).
  - 파일 내 현재 `findByText "Lorem ipsum"` = :181. REQ 참조 :174 는 it 선언 라인 (근사). 본 spec 은 해당 it 블록 1건 단위로 표기.
- `src/Log/LogSingle.test.jsx:326` — `useMockServer(() => mock.devServerOk)` 시나리오의 `"Test Contents"` 본문 resolve. 현재 파일에서 `findByText("Test Contents")` = :333. 동일 맥락.
- 파일 내 `findByText` 총 12 hits (`LogSingle.test.jsx`: :94, :105, :113, :120, :151, :181, :192, :229, :250, :268, :286, :333).
- React 19 재bump 관찰 실패 (REQ-20260420-008 배경): 3 failed / 365 passed. 나머지 9 + 10 hits (total 19) 는 React 19 에서도 green.
- 참고 blocker: `specs/50.blocked/task/TSK-20260420-30-react-19-upgrade.md`, `_reason.md:23-45`.

## 의존성
- 내부: `src/File/File.test.jsx` (117 인근), `src/Log/LogSingle.test.jsx` (174, 326 인근), (선택) `src/test-utils/timing.js` 신규 또는 `src/test-utils/msw.js` 확장, `src/test-utils/msw.js` (기존 `useMockServer`).
- 외부: `@testing-library/react` (`waitFor`, `screen.findByText` options), `vitest` (`expect`).
- 역의존: `specs/50.blocked/task/TSK-20260420-30-react-19-upgrade.md` — 본 spec 완료 후 수동 개입(RULE-05) 으로 복귀 가능. `specs/30.spec/blue/deps/react-19-upgrade-spec.md`, `deps/react-19-test-layer-adaptation-spec.md` (타 축).

## 테스트 현황
- [x] React 18.x (`react@18.2.0`) 현 HEAD `npm test` — 46 files / 368 tests green (commit 3f9e590 / 08a64f6).
- [x] `File.test.jsx:117`, `LogSingle.test.jsx:181, 333` React 18 green baseline.
- [ ] 3 케이스 이디엄 전환 후 React 18 baseline green 유지 (FR-01, FR-02, NFR-01).
- [ ] React 19.2.5 재bump 시 3 케이스 green (NFR-02) — 단발성 실측.
- [ ] `npm run lint` 0 warn / 0 error.

## 수용 기준
- [ ] (Must) `src/File/File.test.jsx:117` 인근 토스터 대기 assertion 이 `waitFor(...)` 또는 `findByText(..., { timeout })` 또는 중간 단계 assertion 이디엄 중 1종으로 전환. 주석 1줄 이상에 REQ-20260420-008 참조.
- [ ] (Must) `src/Log/LogSingle.test.jsx:181` ("Lorem ipsum") 및 `:333` ("Test Contents") 두 위치에서 동일 이디엄 전환. 주석 동일 형식.
- [ ] (Must) React 18.x (`npm test`) — 46 files / 368 tests 전원 green + flake 0.
- [ ] (Must) React 19.2.5 재bump 1회 실측 (`npm install react@19.2.5 react-dom@19.2.5 @testing-library/react@16.3.2 @types/react@19.2.14 @types/react-dom@19.2.3 && npm test`) → 3 케이스 green. 결과 `result.md` 에 통과 수치 박제. 재bump 후 `package.json` 원복 여부는 TSK-30 재개 사이클에서 결정 (본 spec 은 단발성 검증만).
- [ ] (Should) 3 케이스가 동일 이디엄 (A/B/C 중 하나) 으로 적용 — 혼용 금지.
- [ ] (Should) `TIMEOUT_MS` 상수 도입 시 `src/test-utils/` 레이어로 공유, 2회 중복 이내 (NFR-04).
- [ ] (Should) `npm run lint` 경고·오류 증감 0.
- [ ] (NFR) `npm test` wall-clock 증분 ±5% 내 (timeout 상향의 실질 대기 시간은 조건 충족 즉시 반환되므로 영향 미미 기대).
- [ ] (NFR) 수정 파일 3개 이내 (`File.test.jsx`, `LogSingle.test.jsx`, `+ test-utils/timing.js` 선택).

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `grep -n "findByText" src/File/File.test.jsx` → 10 hits at `:55, :87, :117, :149, :173, :202, :240, :259, :272, :286`.
  - `grep -n "findByText" src/Log/LogSingle.test.jsx` → 12 hits at `:94, :105, :113, :120, :151, :181, :192, :229, :250, :268, :286, :333`.
  - `git diff --stat` (완료 후 기대): `src/File/File.test.jsx`, `src/Log/LogSingle.test.jsx`, 선택 `src/test-utils/timing.js` 만 수정.
- **rationale**: 런타임 소스 (`src/File/*.jsx`, `src/Log/*.jsx`, `src/common/common.js` 등) 는 React 18 baseline 에서 전원 green 이므로 본 spec 수정 범위 밖 (REQ-20260420-008 §Out-of-Scope). 다른 테스트 파일의 `findByText` 는 React 19 에서도 green 이 관찰되어 감사 대상 아님 (확장 시 별도 followup). MSW 수명주기·fake-timer teardown 은 REQ-004 / REQ-007 이 담당, 본 spec 과 중복 없음. File 파일 내 다른 9건 findBy* 는 React 18/19 양쪽 green 이라 불변 유지.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-008 반영) | all |
