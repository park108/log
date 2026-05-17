# Task: FileUpload setTimeout cleanup 불변식 회복 — effect cleanup + unmount race fixture

> **Task ID**: TSK-20260517-25
> **출처 spec**: `specs/30.spec/green/components/file.md` §수용 기준 (Must FR-01)(Must FR-02)(Should FR-03) + §스코프 규칙 (G2)(G3)
> **관련 요구사항**: REQ-20260517-092
> **depends_on**: []
> **supersedes**: -

## 배경

`src/File/FileUpload.tsx` 의 두 `setTimeout` 분기 (COMPLETE / FAILED) 는 effect cleanup 채널 부재 — unmount 후 `REFRESH_TIMEOUT` (3000ms) 경과 시점에 `setIsUploading("READY")` + `refreshFiles()` 가 stale 호출될 수 있다. React 19 의 unmounted setState silent ignore 정책 하에서 정적 탐지 불가 — `clearTimeout` cleanup 채널 1+ 박제로 timer leak 차단 surface 회복. spec REQ-092 §스코프 규칙 G2 (clearTimeout 0 hit zero-point) + G3 (`unmount() / useFakeTimers / runAllTimers` test 시나리오) 동시 회복 대상.

## 변경 범위

| 파일 | 동작 | 핵심 |
|------|------|------|
| `src/File/FileUpload.tsx` | 수정 | 두 `setTimeout` 핸들을 변수로 보관 + `useEffect` cleanup return 함수에서 `clearTimeout(handle)` 호출 (COMPLETE / FAILED 두 분기 통합 또는 분리 cleanup). |
| `src/File/FileUpload.test.tsx` | 수정 | `unmount()` 호출 + `vi.useFakeTimers()` + `vi.runAllTimers()` (또는 `vi.advanceTimersByTime(REFRESH_TIMEOUT)`) + `refreshFiles` mock 0회 호출 검증 시나리오 1+ 추가. |

## 구현 지시

1. `src/File/FileUpload.tsx` line 98-135 의 `useEffect([isUploading, refreshFiles])` 분기 (COMPLETE @line 115 + FAILED @line 129) — 각 `setTimeout(...)` 호출 결과를 변수 (`const handle = setTimeout(...)` 또는 ref) 로 보관 + 동일 effect 의 cleanup return 함수에서 `clearTimeout(handle)` 호출. 두 분기 통합 cleanup 또는 분기별 cleanup 둘 다 grep 게이트 정합 — 수단 중립 (spec REQ-092 §스코프 규칙 expansion 허용).
2. `src/File/FileUpload.test.tsx` — pending upload 상태에서 (또는 COMPLETE/FAILED 전이 직후) `unmount()` 호출 + `vi.useFakeTimers()` + `vi.advanceTimersByTime(REFRESH_TIMEOUT + 100)` 또는 `vi.runAllTimers()` 호출 후 `refreshFiles` mock 호출 0회 + `setIsUploading` 발화 없음 검증. 시나리오 1+ 추가 (COMPLETE 분기 + FAILED 분기 둘 다 권장 — 단일 시나리오로 통합 cleanup 검증 가능 시 1+ 정합).
3. 시간 상수 `REFRESH_TIMEOUT = 3000` 은 본 task 범위 밖 — 본 task 는 cleanup 채널 박제만 (RULE-07 수단 중립). 필요 시 test 에서 `REFRESH_TIMEOUT` import 또는 상수 직접 박제.
4. `clearTimeout` 호출 결과 effect 가 deps 변경으로 재실행 시 직전 분기 pending timer 가 새 effect 진입 전에 취소되는지 검증 (spec §동작 7 마지막 문장).

## 테스트

- 신규: `src/File/FileUpload.test.tsx` — unmount race 시나리오 1+ 추가 (COMPLETE 분기 + FAILED 분기 권장 2 시나리오).
- 회귀: 기존 FileUpload.test.tsx 시나리오 전체 PASS 유지 (line 86 `vi.useFakeTimers({ shouldAdvanceTime: true })` + line 114 `await vi.runAllTimersAsync()` + line 161 동일 + line 189 동일 4 hit 기존 fixture 정합).
- 전수: `npm test` rc=0 (회귀 0).

## 검증/DoD

- [ ] `npm run typecheck` exit=0 (rc=0)
- [ ] `npm run lint` exit=0 (max-warnings=0)
- [ ] `npm test` exit=0 (회귀 0)
- [ ] `npm run build` exit=0
- [ ] **grep 게이트 G2 회복**: `grep -nE "clearTimeout" src/File/FileUpload.tsx` → **1+ hit** (zero-point 0 → 1+).
- [ ] **grep 게이트 G3 회복**: `grep -nE "unmount\s*\(\s*\)" src/File/FileUpload.test.tsx` → **1+ hit** (zero-point 0 → 1+).
- [ ] **수동 검증 fixture**: 본 task `result.md` 에 (i) `clearTimeout` hit 수치 + 라인 좌표 + (ii) `unmount()` test 시나리오 라인 좌표 + (iii) `vi.runAllTimers()` 후 `refreshFiles` mock 호출 0회 검증 출력 박제.

## 스코프 규칙

- **expansion**: 허용 — `FileUpload.tsx` + `FileUpload.test.tsx` 2 파일 동시 박제. 신규 helper hook (예: `useSafeTimeout`) 추가 시 `src/common/` 진입 동반 가능 — scope 확장 허용 (단 helper hook 추가는 RULE-07 수단 중립 — 본 task 비박제). React 표준 cleanup return 패턴 (`return () => clearTimeout(handle)`) 또는 ref-based cleanup 또는 helper hook 흡수 — 수단 중립, 세 수단 중 어느 조합이든 G2 + G3 grep 게이트 회복 시 DoD 충족.
- **grep-baseline** (HEAD=`cac6fa2`, 2026-05-17 — TSK-25 발행 시점 실측):
  - `grep -nE "setTimeout\s*\(" src/File/FileUpload.tsx` → **2 hits in 1 file**:
    - `src/File/FileUpload.tsx:115` (COMPLETE 분기)
    - `src/File/FileUpload.tsx:129` (FAILED 분기)
  - `grep -nE "clearTimeout" src/File/FileUpload.tsx` → **0 hits** (zero-point — 본 task 회복 대상).
  - `grep -nE "unmount\s*\(\s*\)" src/File/FileUpload.test.tsx` → **0 hits** (zero-point — 본 task 회복 대상).
  - `grep -nE "useFakeTimers|runAllTimers" src/File/FileUpload.test.tsx` → **4 hits in 1 file**:
    - `src/File/FileUpload.test.tsx:86` (`vi.useFakeTimers({ shouldAdvanceTime: true })`)
    - `src/File/FileUpload.test.tsx:114` (`await vi.runAllTimersAsync()`)
    - `src/File/FileUpload.test.tsx:161` (동일 useFakeTimers)
    - `src/File/FileUpload.test.tsx:189` (동일 runAllTimersAsync) — 기존 4 hit 유지 + `unmount()` 시나리오 신규 추가 시 5+ hit 도달 가능.
- **rationale**: setTimeout 2 hit (COMPLETE + FAILED) 가 clearTimeout cleanup 0 hit zero-point — REQ-092 §스코프 규칙 G2 MISS 회복 대상. `useFakeTimers / runAllTimers` 는 기존 4 hit 유지 (회귀 0) + `unmount()` 0 hit 회복 대상 (G3). expansion 허용 — `FileUpload.tsx` + `FileUpload.test.tsx` 2 파일 동시 박제 + 신규 helper hook 추가 시 `src/common/` scope 진입 동반 가능 (RULE-07 수단 중립 — 본 task 비박제, planner / developer 영역 판단).

## 롤백

단일 `git revert <sha>` 로 가능 — `FileUpload.tsx` effect cleanup return 함수 추가 + `FileUpload.test.tsx` unmount 시나리오 추가는 단일 commit 박제. 회귀 발생 시 revert 후 `30.spec/green/components/file.md` (REQ-092) marker 재가시화.

## 범위 밖

- 후속: `FileUpload.tsx` 외 도메인 (`Image / Monitor`) fetch unmount race 는 별 spec REQ-093 `30.spec/green/testing/runtime-fetch-unmount-safety.md` 영역 — 별 후속 task carve.
- 후속: `REFRESH_TIMEOUT` 상수 외부 추출 또는 `useSafeTimeout` helper hook 흡수는 RULE-07 수단 중립 — 본 task 비박제. 도입 시 별 task 발행.
- 후속: `FileDrop.tsx` 의 timer / fetch race 신호는 REQ-092 §회귀 중점 4번째 bullet "FileUpload 외 timer / fetch race 신호" 직교 명시 — 별 req 후보, 본 task 비박제.

