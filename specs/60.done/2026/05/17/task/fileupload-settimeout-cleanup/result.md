# Result: TSK-20260517-25 — FileUpload setTimeout cleanup 불변식 회복

## 요약

`src/File/FileUpload.tsx` 의 두 `setTimeout(REFRESH_TIMEOUT)` 분기 (COMPLETE @line 117, FAILED @line 131) 가 effect cleanup 채널 부재 — unmount 후 stale `setIsUploading("READY")` + `refreshFiles()` 호출 surface. `useEffect` 내부에 `let refreshHandle: ReturnType<typeof setTimeout>` 변수 도입 + cleanup return 함수에서 `clearTimeout(refreshHandle)` 호출로 timer leak 차단. `FileUpload.test.tsx` 에 COMPLETE 분기 + FAILED 분기 unmount race 시나리오 2건 신규 추가 — `unmount()` 직후 `vi.runAllTimersAsync()` 진행해도 `refreshSpy` 0회 호출 검증으로 cleanup 정합 박제.

## 변경 파일

- `src/File/FileUpload.tsx` — `useEffect([isUploading, refreshFiles])` 분기에 `let refreshHandle` 변수 도입 + COMPLETE / FAILED 두 분기에서 핸들 보관 + cleanup return 함수에서 조건부 `clearTimeout` 호출. 기존 `else` 분기를 `else if("FAILED" === isUploading)` 로 좁혀 type-narrow 정합 (UploadState 4 상태 전수 명시).
- `src/File/FileUpload.test.tsx` — `describe('FileUpload unmount race — setTimeout cleanup (REQ-20260517-092 FR-01/FR-02)')` 신규 블록 + COMPLETE 분기 시나리오 1건 + FAILED 분기 시나리오 1건. 각 시나리오는 (i) `vi.useFakeTimers({ shouldAdvanceTime: true })` + (ii) `render(<FileUpload callbackAfterUpload={refreshSpy} />)` + (iii) 전이 완료 대기 + (iv) `unmount()` + (v) `vi.runAllTimersAsync()` + (vi) `expect(refreshSpy).not.toHaveBeenCalled()`.

## 커밋

`{type}: {task title}` — `fix: FileUpload setTimeout cleanup 불변식 회복 — effect cleanup + unmount race fixture`
Task: `specs/60.done/task/fileupload-settimeout-cleanup/`

## 테스트 결과

- `npm run typecheck` rc=0
- `npm run lint` (`--max-warnings=0`) rc=0
- `npm test` rc=0 — **Test Files 48 passed (48) / Tests 442 passed (442)** (직전 baseline 대비 +2 신규 unmount race 시나리오 흡수, 회귀 0).
- `npm run build` rc=0 — `built in 300ms`.

## DoD 점검

- [x] `npm run typecheck` exit=0 (rc=0)
- [x] `npm run lint` exit=0 (max-warnings=0)
- [x] `npm test` exit=0 (회귀 0 — 442/442)
- [x] `npm run build` exit=0
- [x] **G2 회복**: `grep -nE "clearTimeout" src/File/FileUpload.tsx` → **1 hit** (zero-point 0 → 1).
  - `src/File/FileUpload.tsx:139` (`clearTimeout(refreshHandle);`)
- [x] **G3 회복**: `grep -nE "unmount\s*\(\s*\)" src/File/FileUpload.test.tsx` → **2 hits** (zero-point 0 → 2).
  - `src/File/FileUpload.test.tsx:235` (COMPLETE 분기 시나리오)
  - `src/File/FileUpload.test.tsx:280` (FAILED 분기 시나리오)
- [x] **수동 검증 fixture** (본 result.md 박제):
  - (i) `clearTimeout` hit 수치: **1 hit** @ `src/File/FileUpload.tsx:139`.
  - (ii) `unmount()` test 시나리오 라인 좌표: `src/File/FileUpload.test.tsx:235` (COMPLETE) + `:280` (FAILED).
  - (iii) `vi.runAllTimersAsync()` 후 `refreshSpy` mock 호출 0회: 두 신규 시나리오 모두 `expect(refreshSpy).not.toHaveBeenCalled()` 단언 PASS — `npm test -- --run src/File/FileUpload.test.tsx` 출력 `Test Files 1 passed (1) / Tests 9 passed (9)` (기존 7 + 신규 2).

## grep 게이트 최종 실측 (HEAD 직전 — pre-commit)

```
$ grep -nE "setTimeout\s*\(" src/File/FileUpload.tsx
117:			refreshHandle = setTimeout(function() {
131:			refreshHandle = setTimeout(function() {

$ grep -nE "clearTimeout" src/File/FileUpload.tsx
139:				clearTimeout(refreshHandle);

$ grep -nE "unmount\s*\(\s*\)" src/File/FileUpload.test.tsx
235:			unmount();
280:			unmount();

$ grep -nE "useFakeTimers|runAllTimers" src/File/FileUpload.test.tsx
86:		vi.useFakeTimers({ shouldAdvanceTime: true });
114:			await vi.runAllTimersAsync();
161:		vi.useFakeTimers({ shouldAdvanceTime: true });
189:			await vi.runAllTimersAsync();
206:			vi.useFakeTimers({ shouldAdvanceTime: true });
239:			await vi.runAllTimersAsync();
251:			vi.useFakeTimers({ shouldAdvanceTime: true });
284:			await vi.runAllTimersAsync();
```

`setTimeout` 2 hit 보존 + `clearTimeout` 0 → 1 + `unmount()` 0 → 2 + `useFakeTimers/runAllTimers` 4 → 8 (신규 시나리오 2건 × 각 useFakeTimers + runAllTimersAsync 호출).

## 관찰 이슈 / 후속

- 범위 밖 (task §범위 밖 명시): `Image / Monitor` 도메인 fetch unmount race 는 REQ-20260517-093 `30.spec/green/testing/runtime-fetch-unmount-safety.md` 영역 — 별 후속 task carve 대기.
- 범위 밖: `REFRESH_TIMEOUT` 상수 외부 추출 또는 `useSafeTimeout` helper hook 흡수는 RULE-07 수단 중립 — 본 task 비박제. 필요 시 별 task 발행.
- 범위 밖: `FileDrop.tsx` 의 timer / fetch race 신호는 REQ-092 §회귀 중점 4번째 bullet 직교 명시 — 별 req 후보.
- 본 task 수행 중 발견된 부수적 관찰: 기존 `else` 분기를 `else if("FAILED" === isUploading)` 로 좁히면서 UploadState 4 상태 전수가 명시적으로 분기 처리됨 — type-narrow 정합 (의도하지 않은 fallthrough 제거). 회귀 0 (기존 7 시나리오 + 신규 2 시나리오 모두 PASS).
