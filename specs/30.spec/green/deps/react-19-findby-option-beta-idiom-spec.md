# React 19 findBy* 타임아웃 β 이디엄 — waitFor + 중간 assertion + 하이브리드 스코프

> **위치**: `src/File/File.test.jsx` (`:113`), `src/Log/LogSingle.test.jsx` (`:113, :179, :327`), `src/test-utils/timing.js` (신규/재도입 후보)
> **관련 요구사항**: REQ-20260421-005 (선행 REQ-20260421-002 의 옵션 α 를 구조적 실패로 확정하고 β 재설계)
> **최종 업데이트**: 2026-04-21 (by inspector, Phase 3 seed; TSK-20260421-43 blocked 원복 후 재진입)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=01e5d42).

## 역할
옵션 α (`ASYNC_ASSERTION_TIMEOUT_MS = 10000ms` 상향) 가 React 19.2.5 rebump 실측에서 **시간 부족 아닌 구조적 실패** (노드 detach / toaster 상태 미전이) 로 3 케이스 fail → TSK-20260421-43 blocked 로 확정됐다. 본 spec 은 α 폐기 + β (`waitFor` 내부 getter 재실행 + 단정 통합) 전환 + `File.test.jsx:113` toaster 경로 한정 하이브리드 (중간 상태 polling 선행) 를 규정한다. React 18 baseline green 유지 + React 19.2.5 rebump 1회 실측에서 4 케이스 green 을 수용 기준으로 박제한다. **런타임 소스 (Toaster / useLog / MSW 등) 수정, React 19 실제 승격, 4 케이스 외 findBy* 전수 감사, `.claude/rules/` 규약 변경은 본 spec 밖**.

## 공개 인터페이스
- **FR-01 (Must) — 옵션 α 잔존 0건**: `grep -rnE "findByText\([^)]+,\s*\{\s*timeout:\s*ASYNC_ASSERTION_TIMEOUT_MS" src/File/ src/Log/` → **0 hits**. 현 HEAD baseline 0 hits (TSK-43 원복 후) → 유지.
- **FR-02 (Must) — β 이디엄 (4 케이스 중 `LogSingle:113, :179, :327` 3건)**: `await waitFor(() => { const node = screen.getByText(<match>); expect(node).toBeInTheDocument(); }, { timeout: ASYNC_ASSERTION_TIMEOUT_MS });` 형태. 외부 변수 cache 후 `expect(node)` 패턴 금지 — StrictMode detached-reference 대응. 이디엄 선택 근거 1~2줄을 result.md 에 박제.
- **FR-03 (Must) — 하이브리드 (`File.test.jsx:113` toaster 경로)**: URL copied 토스터 단정 **직전** 에 중간 상태 polling 2건을 선행:
  1. `await waitFor(() => expect(screen.queryByText(/Loading files/i)).not.toBeInTheDocument(), { timeout: ASYNC_ASSERTION_TIMEOUT_MS });`
  2. `await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(N), { timeout: ASYNC_ASSERTION_TIMEOUT_MS });` (N 은 mock fixture 의 첫 페이지 항목 수; `api.mock` 참조해 확정).
  그 이후 `await waitFor(() => expect(screen.getByText(/URL copied\.$/)).toBeInTheDocument(), ...)` 로 toaster 단정. 단일 `findByText` 금지.
- **FR-04 (Must) — `ASYNC_ASSERTION_TIMEOUT_MS` 단일 지점**: `src/test-utils/timing.js` 에 상수 재도입 (또는 등가 경로). 모든 참조처는 import 유지 — `3000`/`5000`/`10000` 하드코딩 금지 (대상 3 파일 내 리터럴 0). 헬퍼 함수 (`waitForStable` / `assertEventually`) 도입은 **선택** — 채택 시 `timing.js` 에 JSDoc 주석으로 β 이디엄 레퍼런스 박제.
- **FR-05 (Must) — 런타임 소스 불변**: `git diff --stat` 에서 `src/**` 중 `*.test.*` / `src/test-utils/timing.js` 외 파일 변경 0. Toaster.jsx, useLog.js, MSW 소스, vite.config 은 본 spec 수정 대상 아님.
- **FR-06 (Must) — React 18 baseline 회귀 0**: `npm test` → **46 files / 369 tests green** (현 HEAD 수치).
- **FR-07 (Must) — React 19.2.5 rebump 실측**: `npm install react@19.2.5 react-dom@19.2.5 @testing-library/react@16.3.2 @types/react@19.2.14 @types/react-dom@19.2.3 && npm test` 결과 수치 (pass/fail/files) 를 result.md 에 박제. 4 대상 케이스 green + 46 files / 369 tests green 확인 후 `git checkout -- package.json package-lock.json && npm install` 로 원복. 원복 후 `npm test` 재실측 값도 박제.
- **FR-08 (Should) — 린트**: `npm run lint` → 0 warn / 0 error.

## 동작
1. **timing.js 재도입** — `src/test-utils/timing.js` 가 현 HEAD 에 부재 (TSK-43 원복 결과). 다음 중 하나로 복원:
   ```js
   // β 이디엄 전용 타임아웃 상수 (REQ-20260421-005)
   // waitFor polling 과 함께 사용한다. findByText options.timeout 으로 단독 사용 금지.
   export const ASYNC_ASSERTION_TIMEOUT_MS = 5000; // planner 가 실측 기반으로 최종값 확정 (3000~10000 범위)
   ```
   초기값 5000ms 권장 — α 10000ms 는 실측에서 시간 부족이 아닌 구조적 실패였으므로 불필요. polling 조건 충족 즉시 반환이므로 wall-clock 영향 미미.
2. **LogSingle.test.jsx β 전환** — `:113`, `:179`, `:327` 3건 각각:
   ```js
   // before (α/기본)
   const afterDelete = await screen.findByText("The log is deleted.");
   expect(afterDelete).toBeInTheDocument();
   // after (β — getter 재실행 + 단정 통합)
   await waitFor(
     () => expect(screen.getByText("The log is deleted.")).toBeInTheDocument(),
     { timeout: ASYNC_ASSERTION_TIMEOUT_MS }
   );
   ```
   외부 변수에 노드 cache 금지. React 19 StrictMode 이중 effect 로 첫 render commit 의 DOM 노드가 detach 되어도 다음 polling iteration 에서 재조회되어 최신 노드 기준 단정.
3. **File.test.jsx:113 하이브리드** — toaster 경로 (γ 성격 의심: StrictMode 이중 render × Toaster `setTimeout` × MSW resolve 경합) 는 중간 상태 polling 2건 선행:
   ```js
   // before
   const copiedToast = await screen.findByText(/URL copied\.$/);
   expect(copiedToast).toBeInTheDocument();
   // after (하이브리드 — Loading 소멸 + listitem 렌더 → toaster 단정)
   await waitFor(
     () => expect(screen.queryByText(/Loading files/i)).not.toBeInTheDocument(),
     { timeout: ASYNC_ASSERTION_TIMEOUT_MS }
   );
   await waitFor(
     () => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0),
     { timeout: ASYNC_ASSERTION_TIMEOUT_MS }
   );
   await waitFor(
     () => expect(screen.getByText(/URL copied\.$/)).toBeInTheDocument(),
     { timeout: ASYNC_ASSERTION_TIMEOUT_MS }
   );
   ```
   클릭 (`fireEvent.click(firstFile)`) 은 listitem 렌더 완료 직후에 수행하도록 순서 재조정 (현 `:110-111` 의 `buttons[0]` 참조 시점이 listitem 미렌더 구간이면 문제). task 단계에서 실측 기반 미세 조정.
4. **imports 점검** — `waitFor` 를 현 2 파일에서 import 추가 (현재 미import). `@testing-library/react` 기존 import line 에 추가 허용 (스코프 내 edit).
5. **React 18 실측** — `npm test` 46/369 green 유지.
6. **React 19.2.5 rebump 실측** — 단발. 4 케이스 green + 전체 46/369 green 확인 후 원복. 결과 수치·재현 커맨드 `result.md` 박제.
7. **lint** — 0 warn / 0 error.

### Baseline (2026-04-21, HEAD=01e5d42)
- `npm test` (React 18.2.0, 현 HEAD) → **46 files / 369 tests green** (TSK-44 geturl-audit flip 직후 수치; TSK-42 `[A]/[B]` 2 it → 1 it 통합 여파로 370 → 369).
- `grep -rnE "findByText\([^)]+,\s*\{\s*timeout:\s*ASYNC_ASSERTION_TIMEOUT_MS" src/File/ src/Log/` → **0 hits** (TSK-43 원복 결과; α 잔존 없음).
- `grep -n "findByText" src/File/File.test.jsx` → 10 hits at `:51, :83, :113, :145, :169, :196, :231, :250, :260, :274`.
- `grep -n "findByText" src/Log/LogSingle.test.jsx` → 13 hits at `:94, :105, :113, :120, :149, :179, :182, :190, :225, :244, :262, :280, :327`.
- `grep -n "ASYNC_ASSERTION_TIMEOUT_MS" src` → **0 hits** (상수 부재).
- `grep -nE "\b(3000|5000|10000)\b" src/File/File.test.jsx src/Log/LogSingle.test.jsx` → 0 hits (두 파일 현 HEAD 청정).
- `src/test-utils/timing.js` → **파일 부재** (TSK-43 blocked 원복 결과).
- React 19.2.5 이전 rebump 실측 (REQ-005 배경): 46 files 중 2 failed / 44 passed, 369 tests 중 3 failed / 366 passed (`File.test.jsx:113`, `LogSingle.test.jsx:179, :327` fail; `LogSingle.test.jsx:113` 은 α 10000ms 로 green 이었음).

## 의존성
- 내부: `src/test-utils/timing.js` (신규/재도입), `src/File/File.test.jsx`, `src/Log/LogSingle.test.jsx`, `src/setupTests.js` (불변 — 전역 `afterEach` 순서 유지), `src/test-utils/msw.js` (불변), `src/File/api.mock` (fixture 참조, 수정 없음).
- 외부: `@testing-library/react` (`waitFor`, `screen`), `vitest` (`expect`), `react@18.2.0` (baseline) / `react@19.2.5` (rebump 1회).
- 역의존: `specs/50.blocked/task/TSK-20260420-30-react-19-upgrade.md` — 본 spec 완료 + blue 승격 후 수동 개입 (RULE-05) 으로 승격 재개 가능. `specs/50.blocked/spec/react-19-findby-timing-stabilization-spec.md` — historical α 버전 (수동 정리 대상). `specs/50.blocked/task/TSK-20260421-43-react-19-findby-timing-reselection.md` — 본 spec 의 task 발행 후 수동 아카이브.

## 테스트 현황
- [x] 현 HEAD React 18.2.0 `npm test` → 46 files / 369 tests green (baseline, HEAD=01e5d42).
- [x] `findByText(..., { timeout: ASYNC_ASSERTION_TIMEOUT_MS })` 잔존 0 hits (FR-01 baseline 충족).
- [ ] FR-02 적용 — `LogSingle.test.jsx:113, :179, :327` 3건 β 이디엄 전환.
- [ ] FR-03 적용 — `File.test.jsx:113` 하이브리드 (중간 polling 2건 + toaster 단정).
- [ ] FR-04 적용 — `ASYNC_ASSERTION_TIMEOUT_MS` 재도입 + 하드코딩 숫자 0.
- [ ] FR-06 — React 18 baseline 회귀 0 (46/369).
- [ ] FR-07 — React 19.2.5 rebump 1회 실측 (4 케이스 green + 46/369 green) + 원복 실측.
- [ ] FR-08 — `npm run lint` 0 warn / 0 error.

## 수용 기준
- [ ] (Must, FR-01) `grep -rnE "findByText\([^)]+,\s*\{\s*timeout:\s*ASYNC_ASSERTION_TIMEOUT_MS" src/File/ src/Log/` → **0 hits**.
- [ ] (Must, FR-02) `src/Log/LogSingle.test.jsx` 내 `:113, :179, :327` 3건이 `waitFor(() => { ... getByText ... ; expect(...).toBeInTheDocument(); })` 형태로 전환. `grep -nE "^\s*const\s+\w+\s*=\s*await\s+screen\.findByText\(\"(The log is deleted|Lorem ipsum|Test Contents)" src/Log/LogSingle.test.jsx` → **0 hits** (3 케이스 치환 완료 지표).
- [ ] (Must, FR-03) `src/File/File.test.jsx` 의 `URL copied` 단정 직전에 `waitFor` 호출 1건 이상 존재. `grep -c "waitFor" src/File/File.test.jsx` → **≥ 2** (Loading 소멸 + listitem + toaster 합산 기대).
- [ ] (Must, FR-04) `src/test-utils/timing.js` 존재 + `ASYNC_ASSERTION_TIMEOUT_MS` export. `grep -rnE "\b(3000|5000|10000)\b" src/test-utils/timing.js src/File/File.test.jsx src/Log/LogSingle.test.jsx` → `timing.js` 상수 정의 1 hit 외 **0 hits**.
- [ ] (Must, FR-05) `git diff --stat` 에서 변경 파일 ≤ 3 (`src/test-utils/timing.js` + `src/File/File.test.jsx` + `src/Log/LogSingle.test.jsx`). `src/**` 런타임 (Toaster, useLog, MSW, hooks 등) 0 변경.
- [ ] (Must, FR-06) React 18.2.0 baseline `npm test` → **46 files / 369 tests green**. flake 0.
- [ ] (Must, FR-07) `npm install react@19.2.5 react-dom@19.2.5 @testing-library/react@16.3.2 @types/react@19.2.14 @types/react-dom@19.2.3 && npm test` → **46 files / 369 tests green** (4 대상 케이스 green 포함). 결과 수치 result.md 박제. 이후 `git checkout -- package.json package-lock.json && npm install && npm test` → **46/369 green** 재확인.
- [ ] (Should, FR-08) `npm run lint` → 0 warn / 0 error.
- [ ] (NFR) `npm test` wall-clock 증분 ±10% 이내 (waitFor 는 조건 충족 즉시 반환; 실질 대기 영향 미미).

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=01e5d42):
  - `grep -rnE "findByText\([^)]+,\s*\{\s*timeout:\s*ASYNC_ASSERTION_TIMEOUT_MS" src/File/ src/Log/` → 0 hits in 0 files.
  - `grep -n "findByText" src/File/File.test.jsx` → 10 hits at `:51, :83, :113, :145, :169, :196, :231, :250, :260, :274`.
  - `grep -n "findByText" src/Log/LogSingle.test.jsx` → 13 hits at `:94, :105, :113, :120, :149, :179, :182, :190, :225, :244, :262, :280, :327`.
  - `grep -rn "ASYNC_ASSERTION_TIMEOUT_MS" src` → 0 hits (상수 파일 부재).
  - `grep -nE "\b(3000|5000|10000)\b" src/File/File.test.jsx src/Log/LogSingle.test.jsx` → 0 hits (두 파일 청정).
  - `grep -c "waitFor" src/File/File.test.jsx src/Log/LogSingle.test.jsx` → 각 0 / 0 (import 및 호출 부재).
- **rationale**: 본 spec 은 **테스트 코드 재조회 패턴 + 타임아웃 상수 단일 지점** 으로만 React 19 StrictMode / MSW 경합을 흡수한다. 런타임 소스 (`src/Toaster/`, `src/Log/useLog.js`, `src/common/common.js` 등) 수정은 REQ-005 §Out-of-Scope 로 명시 제외 — 근본 원인 해소는 본 spec 의 임무가 아님. `vite.config.js` 의 `sequence.shuffle`, MSW 수명주기 등은 각각 REQ-004 / REQ-20260420-004 관할로 중복 금지. 발행 task 에서 scope 밖 파일 변경이 게이트 위반으로 잡히면 developer 는 **즉시 `50.blocked/task/` 로 격리** (RULE-06 expansion=불허).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-005 반영; α 폐기 + β/하이브리드 재설계, `LogSingle:113, :179, :327` + `File:113` 4 케이스, `timing.js` 재도입) | all |
