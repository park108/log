# File 컴포넌트 (관리자 파일 업로드 · 목록)

> **위치**: `src/File/` (File.tsx, FileItem.tsx, FileDrop.tsx, FileUpload.tsx, api.ts, api.mock.ts, File.css)
> **관련 요구사항**: REQ-20260517-092 (FileUpload setTimeout cleanup 불변식) · REQ-20260831-048 FR-03·FR-05·NFR-01 (첫 조회 실패의 관측 표면과 재시도 경로 — 부분 흡수, §참고 §REQ-048 부분 흡수 판정).
> **최종 업데이트**: 2026-08-31 (by inspector — Phase 1 drift reconcile, HEAD=`b1cbf5c`).

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 박제 시점 스냅샷 (REQ-092 분 HEAD=`cac6fa2`, REQ-048 분 HEAD=`643be56`).

> **측정 기준**: 본 문서의 REQ-048 분 rc 는 전부 HEAD=`b1cbf5c` 에서 재실행한 결과다 (`8b95ae5` = `TSK-20260831-03` 이후). REQ-092 분은 `7b15126` 회복 시점 박제에 HEAD=`b1cbf5c` 재실측을 병기했다.

## 역할
`/file` 페이지의 루트 셸. 관리자 전용 (`isAdmin()` 가 false 면 `/log` 로 `navigate`). 데스크탑에서는 `FileDrop` (드래그&드롭), 모바일(`isMobile()` true, 터치 환경) 에서는 `FileUpload` (파일 선택 input) 를 노출한다. S3 메타데이터(`api.getFiles` · `getNextFiles`) 를 커서 기반으로 페이지네이션하여 `FileItem` 목록으로 렌더하고, 업로드/삭제 성공 시 1차 목록을 다시 페치한다. 중앙 Toaster 로 로딩, 하단 Toaster 로 에러를 표시. `FileUpload` 의 `setTimeout` 기반 상태 전이 cleanup 불변식 (REQ-092) 박제 — unmount / effect 재실행 시 pending timer 누수 차단.

## 공개 인터페이스
- `File` (default export).
  - props: `{ contentHeight?: object }`.
- 하위 컴포넌트 기본 export: `FileItem`, `FileDrop`, `FileUpload`.
  - `FileItem` props: `{ fileName, lastModified, size, url, deleted(fn) }`.
  - `FileDrop` / `FileUpload` props: `{ callbackAfterUpload(fn) }`.
- API 모듈 (`src/File/api.ts`): `getFiles`, `getNextFiles`, (업로드/삭제 엔드포인트는 구현 파일 기준).

## 동작
1. 마운트 시 `isAdmin()=false` 이면 즉시 `/log` 로 `useNavigate()` 리다이렉트 + `setHtmlTitle("file")` 스킵.
2. admin 인 경우 `setHtmlTitle("file")` 후 `isGetData=true` 로 1차 `getFiles()` 호출. 성공 시 `files` · `lastTimestamp` 세팅, 실패 시 하단 에러 토스트.
3. `See more` 클릭 → `getNextFiles(lastTimestamp)` 로 이어붙임. 동일 에러 토스트 규약.
4. `isLoading` 상태에 따라 중앙 Toaster 표시 1/2 전이 (`isShowToaster`).
5. 환경 분기 UI 선택은 `useMemo(() => isMobile(), [])` 로 마운트 시 1회 결정.
   - 모바일 → `<FileUpload callbackAfterUpload={...}/>`.
   - 데스크탑 → `<FileDrop callbackAfterUpload={...}/>`.
6. 업로드 콜백 / `FileItem.deleted()` 는 공히 `setIsGetData(true)` 로 1차 재페치.
8. **(REQ-20260831-048) 첫 조회의 세 결과는 서로 구별되고, 실패는 빠져나갈 길을 남긴다.** 첫 조회는 세 상태로 끝난다 — 성공·0건 / 성공·N건 / 실패. 이 셋은 렌더 결과로 서로 구별되며, 실패 상태는 그 사실을 **사라지지 않는 표면**으로 말하고 **다시 시도할 경로**를 포함한다.
   - **(F1) "비어 있다" 는 첫 조회가 성공적으로 끝난 뒤에만 말한다.** 목록을 실제로 받은 시점을 상태로 세우고(`hasListArrived`) 그때만 안내한다 — 조회 착수 전과 조회 실패 후에는 렌더되지 않는다. **현 HEAD 에서 이미 참이며 자동 게이트가 지킨다** (`src/File/File.test.tsx` — `'조회에 착수하기 전에는 없다고 말하지 않는다'`(커밋 단위 `React.Profiler` 관측) · `'조회가 실패하면 없다고 말하지 않는다'`). 따라서 본 절은 이 명제에 **새 체크박스를 두지 않는다** — 위반 시 기존 게이트가 즉시 실패하므로 중복 게이트다 (RULE-07 §반려 시그널). 계약으로 남기는 이유는 그 게이트가 무엇을 지키는지의 귀속처가 필요해서다.
   - **(F2) 실패의 표면은 사라지지 않는다.** 하단 Toaster 는 `duration=2000` 뒤 fadeout 으로 시야에서 사라진다. 토스터가 유일한 실패 표면이면 그 시점 이후 화면은 실패를 말하지 않는다 — 목록도 없고 안내도 없는 빈 영역만 남는다. 알림 채널의 **존재**(§수용 기준 Should 하단 Toaster)와 실패 상태의 **지속 표면**은 다른 요구다.
   - **(F3) 실패 상태는 재시도 경로를 포함한다.** 같은 저장소에 선례가 둘 있다 — `src/Log/LogList.tsx` 의 `isError && 0 === logs.length` 전면 오류 + `Retry`, `src/Image/ImageSelector.tsx` 의 동형 분기. 다섯 목록 화면 중 `File` 하나만 이 축에서 빠져 있다. 빠져나갈 길이 없으면 새로고침이 유일한 수단이 된다.
   - **(F4) 실패는 접근성 트리에서 관측된다.** `role="alert"` 발화(기존 `<Toaster>` 경유 포함) 또는 `aria-live`. 시각 전용 변화(class 교체만)는 충족이 아니다 — `30.spec/blue/components/comment.md` §동작 과 동일 기준.
   - **(F5) 실패 갈래는 둘 다 같은 상태로 간다.** 첫 조회 실패는 `errorType` 갈래(비-2xx 본문)와 `catch` 갈래(네트워크 예외) 둘이며, (F2)(F3)(F4) 는 **양쪽 모두**에 성립한다. 한쪽만 전이하면 나머지 한쪽이 정확히 종전 상태로 남는다.
   - **범위 밖**: 다음 페이지(`getNextFiles`) 실패는 별 축이다 (하단 Toaster 로 이미 처리). 안내·오류 문구의 표현·위치·스타일, 렌더 커밋 횟수(성능)도 범위 밖이다 — 커밋이 몇 번이든 그 커밋들이 **거짓을 말하지 않는 것**이 계약이다.
7. **(REQ-092) `FileUpload` timer cleanup 불변식**: `FileUpload` 가 `useEffect([isUploading, refreshFiles])` 분기 (COMPLETE / FAILED) 에서 등록한 모든 `setTimeout` 핸들은 effect cleanup (`return () => clearTimeout(...)`) 또는 컴포넌트 unmount 시 취소된다. unmount 후 `REFRESH_TIMEOUT` 경과 시점에 `setIsUploading` · `refreshFiles` 가 발화하지 않는다 (stale callback 0 hit). effect 가 deps 변경으로 재실행 시 직전 분기 pending timer 가 새 effect 진입 전에 `clearTimeout` 으로 취소된다.

### 회귀 중점
- **(REQ-048) 실패 표면을 토스터 하나로 되돌리는 변경** — `duration` 경과 후 화면에 실패를 말하는 노드가 0 이 되면 (F2) 위반이다. 토스터가 떠 있는 동안만 재는 단언은 이 방향의 검출력이 0 이다.
- **(REQ-048) `hasListArrived` 를 조회 착수 시점으로 옮기는 변경** — 성공 시점이 아니라 착수 시점에 세우면 (F1) 이 조용히 무너진다. 이름은 같고 의미만 바뀌므로 리뷰에서 보이지 않는다.
- **(REQ-048) 실패 갈래 한쪽만 고치는 변경** — `errorType` 갈래와 `catch` 갈래는 현재 같은 두 줄을 각각 갖고 있다. 한쪽에만 전이를 더하면 (F5) 위반이며, 테스트가 `mockRejectedValue` 한 갈래만 태우면 통과한다.
- 관리자 판정 실패 경로의 `navigate("/log")` + `setHtmlTitle` 스킵 순서 (side-effect 누수 방지).
- `useMemo` 환경 결정이 리렌더마다 재평가되지 않아야 함 (React 19 deps 경고 포함).
- `FileDrop` 의 drop 이벤트 · `FileUpload` 의 input change → 성공 시 `callbackAfterUpload` 호출 경로.
- **(REQ-092) `FileUpload` timer cleanup**: `src/File/FileUpload.tsx` 의 모든 `setTimeout` hit (현 baseline §스코프 규칙 G1 baseline) 가 동일 effect 내 cleanup 회수 흐름 (`return () => clearTimeout(handle)` 또는 동등 패턴) 에 포함되어야 한다. cleanup 패턴 0 hit 시 본 불변식 위반. React 19 의 unmounted setState silent ignore 정책으로 인해 명시적 timer 취소 채널 부재 시 timer leak 정적 탐지 불가 — 본 불변식 박제로 회복 task 진입 후 grep 가능 surface 박제.
- **(REQ-092 직교) `FileUpload` 외 timer / fetch race 신호**: `FileDrop` · `Image*` · `Log` · `Monitor` 의 timer 또는 fetch unmount race / `AbortController` 미사용은 본 spec scope 외 (별 req 후보 — req §참고 신호 (a)(b) 박제).

## 의존성
- 외부: `react`, `react-router-dom`, `prop-types`.
- 내부: `common/common` (`log`, `hasValue`, `isAdmin`, `isMobile`, `setHtmlTitle`), `Toaster/Toaster`, `./api`, `./FileItem`, `./FileDrop`, `./FileUpload`, `File.css`.
- 역의존: `App.tsx` (또는 `App.jsx`) 의 `/file` 라우트.
- 직교: `30.spec/green/foundation/island-proptypes-zero.md` (REQ-088 — `src/File/` island 정의 3축 정합 채널), `30.spec/green/testing/console-error-runtime-zero.md` (REQ-091 — TS island runtime `console.error` 0 hit 채널, fail-fast assertion 활성 시 stale callback 의 `setIsUploading` 호출이 React unmounted-tree warning 발화 시 본 channel 에서 검출 가능 — 보완 직교).

### carve-precondition
- (P1) **환경 채널 가용성**: 본 spec 효능 회복 task carve 시점 (별 task 단) 에 `node_modules/` 가용성 + `npm run typecheck` exit=0 + `npm run lint` exit=0 + `npm run build` exit=0 + `npm test` 회귀 0 4+ 환경 게이트 충족 필요 (`src/File/` 6 island 디렉터리 중 1개로 typecheck error 0 hit baseline 박제 — `30.spec/blue/foundation/typecheck-island-extension.md` REQ-077 정합). 본 spec 박제 시점 환경 게이트 N/A (효능 평서 박제만 — 산출물 변경 require 0).
- (P2) **선행 spec done 상태**: 본 spec 효능 회복 task carve 시점에 선행 spec (REQ-088 `island-proptypes-zero.md` blue 승격 done 또는 green carve-active) + (REQ-091 `console-error-runtime-zero.md` green carve-active — 본 inspector tick (I1)~(I4) marker 플립 surface) 정합 — `src/File/FileUpload.tsx` 가 TS island 정의 3축 충족 + runtime channel fail-fast assertion 활성 상태에서 회복 task 진입. 박제 시점 두 spec 다 green carve-active (HEAD=`cac6fa2`).
- (P3) **RULE-02 chain 비활성**: 본 spec 은 blue→green 복사 + 흡수 — 기존 green spec carve fail-fast chain 누적 0. chain 부재 평서 박제 — carve 진입 차단 신호 없음. 회복 task 발행 시점 chain 누적 신호 발생 시 별 carve-precondition 게이트 자가 차단 적용.

## 테스트 현황
- [x] `src/File/File.test.tsx` — admin/non-admin 분기, 1차/추가 페치, 에러 토스트, 모바일/데스크탑 업로드 UI 스위치.
- [x] `FileItem.test.tsx`, `FileDrop.test.tsx`, `FileUpload.test.tsx` — 단위 테스트.
- [x] `src/File/__fixtures__/` 샘플 응답 박제.
- [x] (REQ-092, I1) `FileUpload` timer cleanup 등록 채널 1+ 박제 — `grep -nE "clearTimeout" src/File/FileUpload.tsx` → **1 hit** (HEAD=`7b15126` 회복 시점 박제. HEAD=`b1cbf5c` 재실측 **1 hit @line 100** — 효능 불변).
- [x] (REQ-092, I2) `FileUpload.test.tsx` unmount race 시나리오 1+ 박제 — `grep -nE "unmount\s*\(\s*\)" src/File/FileUpload.test.tsx` → **2 hit** + `grep -nE "useFakeTimers|runAllTimers" src/File/FileUpload.test.tsx` → **8 hit** (HEAD=`7b15126` 회복 시점 박제. HEAD=`b1cbf5c` 재실측 `unmount()` **8 hit** · fake-timer **8 hit** — 회복 방향 유지).

- [x] (REQ-048, F1) 첫 조회 성공 시점 상태가 실재: `bash -c 'test "$(grep -c "hasListArrived" src/File/File.tsx)" -ge 2'` → HEAD=`b1cbf5c` 재실측 rc=0 (2 hit — 선언 `File.tsx:70` + 렌더 조건 `File.tsx:290`).
- [x] (REQ-048, F1) 커밋 단위 관측 채널 실재: `bash -c 'grep -rlq "Profiler" src --include="*.test.tsx"'` → HEAD=`b1cbf5c` 재실측 rc=0 (`src/File/File.test.tsx` · `src/Log/LogList.test.tsx`). `render()` 반환 후 한 점만 재는 단언은 이 축의 검출력이 0 이라 채널 자체가 요구다.
- [x] (REQ-048, F2·F3) 실패 지속 표면 + 재시도: `bash -c 'grep -qF "조회에 실패하면 다시 시도할 길을 남긴다" src/File/File.test.tsx && npx vitest run src/File/File.test.tsx >/dev/null 2>&1'` → HEAD=`b1cbf5c` 재실측 **rc=0** (26 tests). `8b95ae5` (TSK-20260831-03) 가 `isError` 지속 표면 + `Retry` 를 세웠다. 재시도 표면 `grep -cE "Retry|retry" src/File/File.tsx` → **3 hit** (직전 0). 직전 측정(HEAD=`643be56`)은 rc=1 이었다.
- [x] (REQ-048, F5) 두 실패 갈래 모두 전이: `bash -c 'grep -qF "errorType 갈래도 같은 실패 표면을 낸다" src/File/File.test.tsx && npx vitest run src/File/File.test.tsx >/dev/null 2>&1'` → HEAD=`b1cbf5c` 재실측 **rc=0**. `8b95ae5` 가 `errorType` 갈래 전용 케이스를 신설했다 — 종전에는 `mockRejectedValue` 로 `catch` 갈래만 태워 이 방향의 검출력이 0 이었다.

> 테스트 이름 문자열은 본 spec 이 확정한 계약면이다. `vitest run -t "<name>"` 은 이름 미매치 시 실패가 아니라 전건 skip + rc=0 이라 테스트 소멸에 민감도가 0 이므로, 위 판정은 `grep -qF <이름>` 과의 **논리곱** 형태를 유지한다.

## 수용 기준 (현재 상태)
- [x] (Must) non-admin 진입 시 `/log` 로 리다이렉트하고 네트워크 호출·`setHtmlTitle` 미발생.
- [x] (Must) 1차 페치 성공 경로에서 `files` · `lastTimestamp` 모두 반영.
- [x] (Must) `lastTimestamp` 존재 시만 `See more` 버튼 렌더.
- [x] (Must) 모바일(`isMobile()=true`) 에서 `FileUpload`, 그 외 `FileDrop` 렌더.
- [x] (Should) `getFiles` / `getNextFiles` 에러 시 하단 Toaster (position=bottom, type=error, duration=2000) 표시.
- [x] (Should) `FileItem.deleted()` · 업로드 성공 콜백은 1차 목록 리페치를 일으킨다.
- [x] (NFR) `isMobile()` 판정은 마운트 1회에 박제 (`useMemo(..., [])`).
- [x] (REQ-092, Must, FR-01) `FileUpload` 가 등록한 모든 `setTimeout` 핸들은 effect cleanup 또는 unmount 시 `clearTimeout` 으로 취소된다. HEAD=`7b15126` 회복: `grep -nE "setTimeout\s*\(" src/File/FileUpload.tsx` → **2 hit** (G1) + `grep -nE "clearTimeout" src/File/FileUpload.tsx` → **1 hit** (G2 zero-point 회복). HEAD=`b1cbf5c` 재실측 setTimeout @line 78, 92 · clearTimeout @line 100. §변경 이력 hook-ack 박제.
- [x] (REQ-092, Must, FR-02) 컴포넌트 unmount 후 `REFRESH_TIMEOUT` 경과 시점에 `setIsUploading` · `refreshFiles` 가 호출되지 않는다. `vi.useFakeTimers()` + `unmount()` 후 `vi.runAllTimers()` 호출 시 `refreshFiles` mock 호출 0회. HEAD=`7b15126` 회복: `unmount()` 2 hit + `useFakeTimers|runAllTimers` 8 hit (FileUpload.test.tsx, TSK-25 fixture). §변경 이력 hook-ack 박제.
- [x] (REQ-092, Should, FR-03) `isUploading` 이 `COMPLETE` 또는 `FAILED` 로 전이된 직후 다시 다른 상태로 전환되면, 이전 분기에서 등록한 timer 는 재발화되지 않는다 (effect 재실행 시 cleanup 패턴 회수). HEAD=`7b15126` 회복: effect cleanup return `() => clearTimeout(refreshHandle)` 패턴 (HEAD=`b1cbf5c` 재실측 `FileUpload.tsx:100`) + test 시나리오 박제. §변경 이력 hook-ack 박제.
- [x] (REQ-092, NFR-01) 테스트 결정성 — `vi.useFakeTimers()` + `unmount()` + `vi.runAllTimers()` + `refreshFiles` mock 호출 0회 검증 패턴 (Must FR-02 회복 task DoD 게이트 박제).
- [x] (REQ-048, Must, FR-03·F2) `File` 의 첫 조회 실패는 하단 Toaster 의 `duration` 경과 후에도 화면에 남는 표면으로 관측된다. 판정: 위 §테스트 현황 (F2·F3) 명령 rc=0. HEAD=`b1cbf5c` 재실측 rc=0 — `8b95ae5`.
- [x] (REQ-048, Should, FR-05·F3) 그 표면은 다시 시도할 경로를 포함한다 (`LogList` · `ImageSelector` 선례). 판정: 동일 명령 rc=0 + `bash -c 'test "$(grep -cE "Retry|retry" src/File/File.tsx)" -ge 1'` → HEAD=`b1cbf5c` 재실측 **rc=0 (3 hit)**.
- [x] (REQ-048, Must, F5) 실패 갈래 둘(`errorType` · `catch`) 모두 같은 표면으로 전이한다. 판정: 위 §테스트 현황 (F5) 명령 rc=0. HEAD=`b1cbf5c` 재실측 rc=0 — `8b95ae5` 의 Dir-3 주입이 `1 failed | 25 passed` 로 이 비대칭을 실제로 잡음을 보였다.
- [x] (REQ-048, Must, NFR-02 비퇴행) 세 목록 화면 스위트가 초록이다: `bash -c 'npx vitest run src/Log/LogList.test.tsx src/File/File.test.tsx src/Image/ImageSelector.test.tsx >/dev/null 2>&1'` → HEAD=`b1cbf5c` 재실측 rc=0 (3 files / 70 tests). 구현 후에도 rc=0 이어야 한다 — **안내를 없애는 방식의 해결은 불가**하며 기존 `'파일이 하나도 없으면 그렇다고 알린다'` 는 그대로 통과해야 한다.
- [x] (REQ-048, Must, F1 현행 충족) 빈 안내의 선결 조건은 현 HEAD 에서 참이다: `bash -c 'grep -qF "조회가 실패하면 없다고 말하지 않는다" src/File/File.test.tsx && grep -qF "조회에 착수하기 전에는 없다고 말하지 않는다" src/File/File.test.tsx'` → HEAD=`b1cbf5c` 재실측 rc=0. 이 항목은 **게이트의 실재**를 재는 것이지 명제를 다시 재는 것이 아니다 (§참고 §REQ-048 부분 흡수 판정).
- [x] (REQ-092, NFR-02) 정적 검증 — 본 §회귀 중점 "(REQ-092) `FileUpload` timer cleanup" 절 + §스코프 규칙 G2 baseline (`grep -nE "setTimeout\s*\("` 모든 hit 의 cleanup 회수 흐름 포함 박제). 본 spec 본문 박제 자체로 회복 task 의 정적 검증 grep 채널 안내 surface 박제.

> **RULE-07 자기 검증 재실측 (HEAD=`cac6fa2`)**: G4 시점 비의존 0 hit PASS. G5 수단 라벨 1 hit @line 5 (`default export` — React 표준 API 식별자, 수단 선호 라벨 0 — 면제 grep -vE 박제, 정합 PASS surface 유지).

## 스코프 규칙
- **expansion**: 허용 — REQ-092 회복 task 가 `src/File/FileUpload.tsx` (effect cleanup return 패턴 추가) + `src/File/FileUpload.test.tsx` (unmount race fake-timer 시나리오 추가) 2 파일 동시 박제. 신규 helper hook (예: `useSafeTimeout`) 추가 시 `src/common/` 진입 동반 가능 — scope 확장 허용 (단 helper hook 추가는 RULE-07 수단 중립 — 본 spec 비박제).
- **grep-baseline** (HEAD=`cac6fa2`, 2026-05-17 — REQ-092 흡수 시점 실측):
  - (G1) **[`FileUpload.tsx` setTimeout 등록 baseline]** `grep -nE "setTimeout\s*\(" src/File/FileUpload.tsx` → **2 hit** @line 115, 129 (HEAD=`cac6fa2` 실측). COMPLETE 분기 + FAILED 분기 2 호출 박제. 본 spec 회복 대상 = 2 hit 모두 cleanup 회수 흐름 포함 (또는 helper hook 으로 흡수 후 hit 0 — 수단 중립).
  - (G2) **[`FileUpload.tsx` cleanup 패턴 baseline]** `grep -nE "clearTimeout" src/File/FileUpload.tsx` → **0 hit** (HEAD=`cac6fa2` 실측 MISS — 본 spec 회복 대상 zero-point). 회복 효능 = 1+ hit (effect cleanup return 또는 helper hook 흡수 후 동등 호출 채널 박제).
  - (G3) **[`FileUpload.test.tsx` unmount race 시나리오 baseline]** `grep -nE "unmount\s*\(\s*\)" src/File/FileUpload.test.tsx` → **0 hit** (HEAD=`cac6fa2` 실측 MISS). `grep -nE "useFakeTimers|runAllTimers" src/File/FileUpload.test.tsx` → **0 hit** (회복 대상 zero-point). 회복 효능 = `unmount()` + `useFakeTimers()` + `runAllTimers()` 조합 1+ 시나리오 박제 (FR-02 NFR-01 정합).
  - (G4) **[RULE-07 시점 비의존 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/blue/components/file.md | grep -cE ":115|:129|:7\b|HEAD\s*=|REFRESH_TIMEOUT\s*=\s*3000"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 절대 라인 / 상수 값 박제 0 — 수치는 §스코프 규칙 grep-baseline + §변경 이력 한정). HEAD=`cac6fa2` 박제 시점 PASS.
  - (G5) **[RULE-07 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/blue/components/file.md | grep -vE '\`[^\`]*(default|먼저)[^\`]*\`' | grep -vE 'default export' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 cleanup 수단 (`return () => clearTimeout` vs `useSafeTimeout` helper vs `useEffect` ref 흡수 등) 후보 라벨 부여 0 — `default export` 는 React 표준 API 식별자 면제). HEAD=`cac6fa2` 박제 시점 PASS. **재실측 정정**: 1 hit @line 5 (`` `File` (default export)`` — React 표준 API 식별자, 수단 선호 라벨 0 — RULE-07 정합 surface 유지, 자기 검증 패턴에 React 표준 식별자 면제 grep -vE 추가 박제).
- **rationale**: (G1) setTimeout 등록 baseline — 2 hit @line 115, 129 (REQ-092 §배경 실측). (G2) clearTimeout cleanup 패턴 baseline — 0 hit zero-point (본 spec 회복 대상). (G3) test 시나리오 baseline — unmount race + fake-timer 0 hit zero-point (FR-02/NFR-01 회복 대상). (G4) RULE-07 시점 비의존 자기 검증 — 본 spec 본문에 절대 라인 / 상수 값 박제 0. (G5) RULE-07 수단 중립 자기 검증 — cleanup 수단 후보 라벨 0. 매트릭스: 5 baseline 채널 (G1 setTimeout 등록 + G2 cleanup 패턴 + G3 test 시나리오 + G4/G5 본 spec 본문 자기 검증) — 회복 후 G2 1+ hit + G3 1+ hit + G4/G5 박제 시점 PASS.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector (Phase 3, REQ-20260831-048 **부분** 흡수) / pending (HEAD=`643be56`) | blue→green 복사 + §동작 8 (첫 조회 세 결과의 구별 · 실패의 지속 표면 · 재시도 경로 · 접근성 · 갈래 대칭 F1~F5) 추가. req 의 FR-01·02·04·06·07 은 `f8f9592` 로 이미 참이 됐고 그 커밋이 함께 부착한 게이트가 지키므로 **중복 게이트로 반려**(RULE-07 §반려 시그널) — 흡수분은 FR-03·FR-05·NFR-01 뿐이다. 근거는 §참고 §REQ-048 부분 흡수 판정. 신규 unchecked 3 (F2·F3·F5), 신규 checked 3 (F1 게이트 실재 · 커밋 관측 채널 · 회귀 baseline). | 동작·회귀 중점·테스트 현황·수용 기준·참고 |
| 2026-08-31 | inspector (Phase 1 reconcile) / `8b95ae5` @ HEAD=`b1cbf5c` | 마커 플립 5 — REQ-048 분 §테스트 현황 (F2·F3)·(F5) 와 §수용 기준 (FR-03·F2)·(FR-05·F3)·(F5). `TSK-20260831-03` 이 `isError` 지속 표면 + `Retry` + `errorType` 갈래 케이스를 세웠다 (`Retry|retry` 0→3 hit, `File.test.tsx` 26 tests rc=0, 세 목록 스위트 70 tests rc=0). **REQ-048 흡수분 3/3 `[x]` → 본 spec 수용 기준 전수 `[x]`** (promote 후보). 동기화: §REQ-048 부분 흡수 판정 의 `Retry` 0 hit 서술을 해소 사실로 정정, §주입 이관 을 이관처 완료 결과표로 교체하고 **Ctrl-2 미통과의 원인(판정 명령 입도)과 그 followup 라우팅을 박제**, REQ-092 분 재실측 스탬프 갱신. | 테스트 현황·수용 기준·참고 |
| 2026-05-17 | inspector (Phase 1 hook-ack, TSK-20260517-25 회수 commit `7b15126`) / pending | REQ-092 5 marker 전수 PASS 플립 — (I1) `clearTimeout` 1 hit @FileUpload.tsx:139 (G2 zero-point → 1+ 회복) + (I2) `unmount()` 2 hit @FileUpload.test.tsx:235,280 + `useFakeTimers|runAllTimers` 8 hit (G3 zero-point → 1+ 회복) + (Must FR-01) effect cleanup return 패턴 박제 + (Must FR-02) `vi.useFakeTimers + unmount + runAllTimersAsync + refreshFiles mock 0회` fixture 박제 + (Should FR-03) effect 재실행 시 cleanup 회수 평서 박제. baseline 박제 시점 g-bullet G1=2/G2=0/G3=0 → 회복 시점 G1=2/G2=1/G3=10 (unmount 2 + useFakeTimers/runAllTimers 8). hook-ack 근거: `7b15126` HEAD 의 조상 정합 + commit 메시지 "fix: FileUpload setTimeout cleanup 불변식 회복 — effect cleanup + unmount race fixture" + 후행 planner self-commit `52efc66` (HEAD=`7b15126` 진입 시점 baseline 정정 박제) 정합. RULE-07 자기 검증 — 5 marker 모두 평서·반복 검증 가능 (grep G1/G2/G3 단일 명령 + vi.useFakeTimers 결정적 검증). RULE-01 inspector writer 영역만 (`30.spec/green/components/file.md` marker 플립만, src/ 영역 0 touch). | 테스트 현황·수용 기준·변경 이력 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-092 흡수) / pending (HEAD=`cac6fa2`) | blue→green 복사 + `FileUpload` setTimeout cleanup 불변식 흡수. 박제 추가: §동작 7 (timer cleanup 효능 평서) + §회귀 중점 4번째 bullet (`grep -nE "setTimeout\s*\("` 모든 hit cleanup 회수 흐름 포함 박제) + §의존성 §직교 (REQ-088 + REQ-091 채널 cross-ref) + §carve-precondition (P1)(P2)(P3) + §테스트 현황 (I1)(I2) 2 marker + §수용 기준 (Must FR-01)(Must FR-02)(Should FR-03)(NFR-01)(NFR-02) 5 marker + §스코프 규칙 5 gate (G1~G5) 실측 baseline. 본 spec 분리 결정 근거: (a) blue 직접 편집 inspector writer 영역 외 (RULE-01) — blue→green 복사 후 흡수 경로 (req §수용 기준 마지막 항목 명시). (b) 신규 spec carve 부적합 — `FileUpload` 는 `File` 컴포넌트 하위 구조 — 별 spec 분리 시 spec 본문 양식 분산 + REQ-091 (testing/) / REQ-088 (foundation/) 와 달리 components/ 영역 단일 spec 단위 (`file.md`) 흡수 정합. (c) `30.spec/green/foundation/island-proptypes-zero.md` 흡수 부적합 — 본 spec 의 effect cleanup 불변식은 React lifecycle 채널 (도메인) — selector / runtime 채널 (REQ-088/REQ-091) 과 직교. consumed req: `specs/20.req/20260517-fileupload-settimeout-cleanup.md` (REQ-092) → `60.done/2026/05/17/req/` mv. RULE-07 자기검증 — (FR-01)(FR-02)(FR-03)(NFR-01)(NFR-02) 모두 평서형·반복 검증 가능 (`grep -nE` G1/G2/G3 단일 명령 + `vi.useFakeTimers()` + `runAllTimers()` 결정적 검증)·시점 비의존 (G4 0 hit — 본문에 절대 라인 / 상수 값 박제 0)·incident 귀속 부재 (REQ-092 §배경 의 baseline audit 는 §변경 이력 / §스코프 규칙 한정 박제)·수단 중립 (G5 0 hit — cleanup 수단 후보 라벨 0). RULE-06 §스코프 규칙 5 gate (G1~G5) 실측 박제 + `expansion` `허용` (`FileUpload.tsx` + `FileUpload.test.tsx` 2 파일 동시 박제 + helper hook 추가 시 `src/common/` 진입 가능 — scope 확장 허용). RULE-01 inspector writer 영역만 (`30.spec/green/components/file.md` create — blue→green 복사 후 흡수, blue 영역 0 touch). spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합). | all |
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |

## 참고

### REQ-048 부분 흡수 판정 (RULE-07 §반려 시그널 적용)

REQ-20260831-048 이 세운 명제는 하나다 — "'비어 있다' 는 첫 조회가 성공적으로 끝난 뒤에만 렌더된다". **그 명제는 흡수 시점에 이미 참이다.** `f8f9592` 가 `LogList` · `File` 양쪽에 `hasListArrived` 를 세워 조건을 좁혔고, **같은 커밋이 게이트도 함께 부착**했다. 현 HEAD=`643be56` 재실측:

| req 항목 | 판정 명령 | rc | 처리 |
|---|---|---|---|
| FR-01 · FR-06 (`LogList` D1 + 세션 캐시) | `grep -qF '조회에 착수하기 전에는 없다고 말하지 않는다' src/Log/LogList.test.tsx` · `grep -qF '세션 캐시에서 복원할 때도 없다고 말하지 않는다' …` | 0 · 0 | **반려 (중복 게이트)** |
| FR-02 · FR-04 (`File` D1/D2) | `grep -qF '조회에 착수하기 전에는 없다고 말하지 않는다' src/File/File.test.tsx` · `grep -qF '조회가 실패하면 없다고 말하지 않는다' …` | 0 · 0 | **반려 (중복 게이트)** |
| FR-07 (커밋 단위 관측 채널) | `grep -rlq "Profiler" src --include="*.test.tsx"` | 0 | **반려 (중복 게이트)** — §테스트 현황에 실재만 박제 |
| FR-08 (실패 문구 재사용 금지) | `grep -rnE "setToasterMessage\(" src/File --include="*.tsx"` → 첫 조회 `"Get files failed."` · 다음 페이지 `"Get more files failed…"` · 업로드 `"Upload failed."` (`FileUpload.tsx`) · 삭제 `"Delete file failed."` (`FileItem.tsx`) — 전건 구별 | — | **반려 (이미 참)** |
| FR-03 · FR-05 · NFR-01 | 아래 §수용 기준 3 항목 | 1 | **흡수** |

반려한 항목들은 위반 시 기존 게이트가 즉시 실패한다 — 그 게이트는 이름만 겨누고 아무것도 재지 않던 종전 단언과 달리, `React.Profiler` 로 **커밋마다** 안내 노드를 관측하고 `expect(seen.length).toBeGreaterThan(0)` 로 공허 통과까지 막는다. 여기에 체크박스를 다시 다는 것은 검출을 늘리지 않고 promote 조건만 늘린다.

**흡수분이 남았던 이유**는 `f8f9592` 가 (D2) 를 절반만 닫았기 때문이다. 거짓말(`No files yet.`)은 사라졌으나 그 자리에 **아무것도 들어서지 않았다** — 하단 Toaster 는 `duration=2000` 뒤 fadeout 되고, 그 뒤 관리자가 보는 것은 이유도 재시도 경로도 없는 빈 목록 영역이었다. `LogList` 와 `ImageSelector` 는 같은 상황에서 전면 오류 + `Retry` 를 낸다. 흡수 시점(HEAD=`643be56`) 실측 `grep -cE "Retry|retry" src/File/File.tsx` → **0**. **HEAD=`b1cbf5c` 에서는 3 hit** — `8b95ae5` (TSK-20260831-03) 가 `isError` 지속 표면(`File.tsx:271`)과 `Retry`(`:282`)를 세워 이 축을 닫았다. 위 표의 반려 판정은 그대로 유효하다.

### 주입 이관 (RULE-06 §게이트 실효 검증 — 구현 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관했다. **이관처는 `TSK-20260831-03` 이며 수행이 끝났다** (`8b95ae5` — `injection: 3/3 detect` · `control: 2/3 pass`). 아래는 그 왕복의 결과 박제다.

| 방향 | 요지 | 결과 |
|---|---|---|
| **Dir-1** (F2) | 실패 표면을 하단 Toaster 하나로 되돌린다 (지속 표면 제거) | rc=1 — 신설 2 케이스 동시 실패 |
| **Dir-2** (F3) | 지속 표면은 두되 재시도 경로만 제거 | rc=1 — `role=button` / 이름 `/retry/i` 미발견. Dir-1 과 분리됨을 잔존 hit 로 박제 |
| **Dir-3** (F5) | `errorType` 갈래에서만 전이 제거 (`catch` 갈래 유지) | rc=1 — **`1 failed / 25 passed`**. `mockRejectedValue` 케이스는 초록으로 남고 신설 케이스만 붉어져 이 축의 비대칭이 실증됐다 |
| **Ctrl-1** (특이도) | 빈 안내 노드에 `aria-live="polite"` 추가 (접근성 = 범위 밖 축) | **rc=0** — 성공·0건 과 실패의 구별 유지 |
| **Ctrl-2** (특이도) | 범위 밖 축의 문구 재서술 | **rc≠0 — 아래 주** |

> **Ctrl-2 는 통과하지 못했고, 원인은 본 spec 의 판정 명령 입도다.** developer 가 두 축으로 분해 재측정한 결과: 첫 조회 실패 표면(본 계약의 표면)의 문구만 재서술하면 rc=0 이고(Ctrl-2a), 다음 페이지(`getNextFiles`) 실패 문구를 재서술하면 rc=1 이다(Ctrl-2b). Ctrl-2b 에서도 **본 계약의 신설 2 케이스는 통과한다** — rc=1 을 만든 것은 `File.test.tsx:310`·`:351`·`:382` 의 선행 테스트가 토스터 문구 리터럴을 `findByText` 로 잡기 때문이다. 즉 과잉 특정된 것은 신설 게이트가 아니라 **판정 명령이 `File.test.tsx` 파일 전체를 도는 입도**이며, 그 결합은 `specs/10.followups/20260831-0155-file-test-judging-command-couples-out-of-scope-wording.md` 로 라우팅됐다. `RULE-06 §음성 대조` 의 처분("좁힐 수 없으면 격리")은 "대조 실패 = 그 task 의 게이트가 과잉 특정" 이라는 전제 위에 서 있는데 위 분해가 그 전제를 반증하므로 격리하지 않았다. **본 spec 이 승계할 것**: 위 §테스트 현황 (F2·F3)·(F5) 의 판정 명령은 `vitest -t` 로 좁히면 이름 미매치 시 전건 skip + rc=0 이 되어 민감도가 0 이 되므로, 좁히는 방향은 따로 판정돼야 한다. 그때까지 이 결합은 알려진 한계로 남는다.

### 미측정·비판정 항목

- **브라우저 실페인트는 측정되지 않았다.** (F1) 이 재는 것은 "안내를 포함한 커밋이 존재하는가" 이고, 그 커밋이 실제로 페인트되는지는 React 가 passive effect 를 `MessageChannel` 스케줄러 콜백으로 미룬다는 기전으로부터의 추론이다. 불변식의 성립은 페인트와 무관하다 — 컴포넌트가 모르는 사실을 단언하는 커밋을 내보내지 않는 것이 계약이다.
- **`src/Image/ImageSelector.tsx` 는 같은 조건식(`!isLoading && 0 === images.length`)을 그대로 쓰지만 창이 없다.** 루트 초기 클래스가 숨김이라 첫 커밋이 보이지 않을 뿐이다 (REQ-048 §참고 PROBE-7 — 가시 커밋 0). **우연한 배치에 기댄 안전**이므로 초기값이 바뀌면 같은 창이 열린다. 본 spec 의 모집단은 `src/File/` 이라 여기서는 사실만 박제하고 요구하지 않는다.
- **레거시 자기 검증 baseline (G4)(G5) 의 경로 인용은 blue 를 가리킨다.** `awk … specs/30.spec/blue/components/file.md` 는 green 상태에서 blue 사본을 재므로 본 흡수분을 보지 않는다. REQ-092 흡수 시점 박제라 그대로 두되, 재작성 시 spec 자신의 green/blue 경로를 참조하지 않는 형태로 고친다 (RULE-07 §promote 조건 2).

- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-fileupload-settimeout-cleanup.md` (REQ-092 — 본 세션 mv).
- **blue 원본**: `specs/30.spec/blue/components/file.md` (2026-04-20 operator 최초 등록 — 본 spec 의 blue 기준).
- **직교 채널 spec**:
  - `30.spec/green/foundation/island-proptypes-zero.md` (REQ-088) — `src/File/` island 정의 3축 정합 (selector M-B 0 hit) — 본 spec 의 effect cleanup 불변식과 직교 (정적 selector vs React lifecycle).
  - `30.spec/green/testing/console-error-runtime-zero.md` (REQ-091) — TS island runtime `console.error` 0 hit (fail-fast assertion 활성) — stale callback 의 `setIsUploading` 호출이 React unmounted-tree warning 발화 시 본 channel 에서 검출 가능 — 보완 직교.
- **선행 done req**:
  - `specs/60.done/2026/05/17/req/20260517-island-proptypes-spec-absorption.md` (REQ-088) — selector M-B 정적 채널 박제.
  - `specs/60.done/2026/05/17/req/20260517-component-runtime-warning-zero-channel.md` (REQ-091) — runtime warning 채널 박제 (직교 보완).
- **신호 (별 req 후보, 본 spec 비박제)**:
  - (a) `src/File/api.ts`, `src/Image/`, `src/Monitor/` fetch unmount race / `AbortController` 미사용.
  - (b) `src/index.jsx` 또는 `src/index.tsx` `sendBeacon` 분기 박제 ↔ 실측 미커버.
