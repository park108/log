# File 컴포넌트 (관리자 파일 업로드 · 목록)

> **위치**: `src/File/` (File.tsx, FileItem.tsx, FileDrop.tsx, FileUpload.tsx, api.ts, api.mock.ts, File.css)
> **관련 요구사항**: REQ-20260517-092 (FileUpload setTimeout cleanup 불변식 흡수 — blue→green 복사 + 본 효능 박제).
> **최종 업데이트**: 2026-05-17 (by inspector — REQ-092 흡수 / blue→green 복사 후 timer cleanup 불변식 추가).

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 박제 시점 스냅샷 (HEAD=`cac6fa2`).

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
7. **(REQ-092) `FileUpload` timer cleanup 불변식**: `FileUpload` 가 `useEffect([isUploading, refreshFiles])` 분기 (COMPLETE / FAILED) 에서 등록한 모든 `setTimeout` 핸들은 effect cleanup (`return () => clearTimeout(...)`) 또는 컴포넌트 unmount 시 취소된다. unmount 후 `REFRESH_TIMEOUT` 경과 시점에 `setIsUploading` · `refreshFiles` 가 발화하지 않는다 (stale callback 0 hit). effect 가 deps 변경으로 재실행 시 직전 분기 pending timer 가 새 effect 진입 전에 `clearTimeout` 으로 취소된다.

### 회귀 중점
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
- [x] (REQ-092, I1) `FileUpload` timer cleanup 등록 채널 1+ 박제 — `grep -nE "clearTimeout" src/File/FileUpload.tsx` → **1 hit** (HEAD=`7b15126` 회복, §변경 이력 hook-ack 박제).
- [x] (REQ-092, I2) `FileUpload.test.tsx` unmount race 시나리오 1+ 박제 — `grep -nE "unmount\s*\(\s*\)" src/File/FileUpload.test.tsx` → **2 hit** + `grep -nE "useFakeTimers|runAllTimers" src/File/FileUpload.test.tsx` → **8 hit** (HEAD=`7b15126` 회복, §변경 이력 hook-ack 박제).

## 수용 기준 (현재 상태)
- [x] (Must) non-admin 진입 시 `/log` 로 리다이렉트하고 네트워크 호출·`setHtmlTitle` 미발생.
- [x] (Must) 1차 페치 성공 경로에서 `files` · `lastTimestamp` 모두 반영.
- [x] (Must) `lastTimestamp` 존재 시만 `See more` 버튼 렌더.
- [x] (Must) 모바일(`isMobile()=true`) 에서 `FileUpload`, 그 외 `FileDrop` 렌더.
- [x] (Should) `getFiles` / `getNextFiles` 에러 시 하단 Toaster (position=bottom, type=error, duration=2000) 표시.
- [x] (Should) `FileItem.deleted()` · 업로드 성공 콜백은 1차 목록 리페치를 일으킨다.
- [x] (NFR) `isMobile()` 판정은 마운트 1회에 박제 (`useMemo(..., [])`).
- [x] (REQ-092, Must, FR-01) `FileUpload` 가 등록한 모든 `setTimeout` 핸들은 effect cleanup 또는 unmount 시 `clearTimeout` 으로 취소된다. HEAD=`7b15126` 회복: `grep -nE "setTimeout\s*\(" src/File/FileUpload.tsx` → **2 hit** @line 117, 131 (G1) + `grep -nE "clearTimeout" src/File/FileUpload.tsx` → **1 hit** @line 139 (G2 zero-point 회복). §변경 이력 hook-ack 박제.
- [x] (REQ-092, Must, FR-02) 컴포넌트 unmount 후 `REFRESH_TIMEOUT` 경과 시점에 `setIsUploading` · `refreshFiles` 가 호출되지 않는다. `vi.useFakeTimers()` + `unmount()` 후 `vi.runAllTimers()` 호출 시 `refreshFiles` mock 호출 0회. HEAD=`7b15126` 회복: `unmount()` 2 hit + `useFakeTimers|runAllTimers` 8 hit (FileUpload.test.tsx, TSK-25 fixture). §변경 이력 hook-ack 박제.
- [x] (REQ-092, Should, FR-03) `isUploading` 이 `COMPLETE` 또는 `FAILED` 로 전이된 직후 다시 다른 상태로 전환되면, 이전 분기에서 등록한 timer 는 재발화되지 않는다 (effect 재실행 시 cleanup 패턴 회수). HEAD=`7b15126` 회복: effect cleanup return `() => clearTimeout(refreshHandle)` 패턴 (FileUpload.tsx:139) + test 시나리오 박제. §변경 이력 hook-ack 박제.
- [x] (REQ-092, NFR-01) 테스트 결정성 — `vi.useFakeTimers()` + `unmount()` + `vi.runAllTimers()` + `refreshFiles` mock 호출 0회 검증 패턴 (Must FR-02 회복 task DoD 게이트 박제).
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
| 2026-05-17 | inspector (Phase 1 hook-ack, TSK-20260517-25 회수 commit `7b15126`) / pending | REQ-092 5 marker 전수 PASS 플립 — (I1) `clearTimeout` 1 hit @FileUpload.tsx:139 (G2 zero-point → 1+ 회복) + (I2) `unmount()` 2 hit @FileUpload.test.tsx:235,280 + `useFakeTimers|runAllTimers` 8 hit (G3 zero-point → 1+ 회복) + (Must FR-01) effect cleanup return 패턴 박제 + (Must FR-02) `vi.useFakeTimers + unmount + runAllTimersAsync + refreshFiles mock 0회` fixture 박제 + (Should FR-03) effect 재실행 시 cleanup 회수 평서 박제. baseline 박제 시점 g-bullet G1=2/G2=0/G3=0 → 회복 시점 G1=2/G2=1/G3=10 (unmount 2 + useFakeTimers/runAllTimers 8). hook-ack 근거: `7b15126` HEAD 의 조상 정합 + commit 메시지 "fix: FileUpload setTimeout cleanup 불변식 회복 — effect cleanup + unmount race fixture" + 후행 planner self-commit `52efc66` (HEAD=`7b15126` 진입 시점 baseline 정정 박제) 정합. RULE-07 자기 검증 — 5 marker 모두 평서·반복 검증 가능 (grep G1/G2/G3 단일 명령 + vi.useFakeTimers 결정적 검증). RULE-01 inspector writer 영역만 (`30.spec/green/components/file.md` marker 플립만, src/ 영역 0 touch). | 테스트 현황·수용 기준·변경 이력 |
| 2026-05-17 | inspector (Phase 2, REQ-20260517-092 흡수) / pending (HEAD=`cac6fa2`) | blue→green 복사 + `FileUpload` setTimeout cleanup 불변식 흡수. 박제 추가: §동작 7 (timer cleanup 효능 평서) + §회귀 중점 4번째 bullet (`grep -nE "setTimeout\s*\("` 모든 hit cleanup 회수 흐름 포함 박제) + §의존성 §직교 (REQ-088 + REQ-091 채널 cross-ref) + §carve-precondition (P1)(P2)(P3) + §테스트 현황 (I1)(I2) 2 marker + §수용 기준 (Must FR-01)(Must FR-02)(Should FR-03)(NFR-01)(NFR-02) 5 marker + §스코프 규칙 5 gate (G1~G5) 실측 baseline. 본 spec 분리 결정 근거: (a) blue 직접 편집 inspector writer 영역 외 (RULE-01) — blue→green 복사 후 흡수 경로 (req §수용 기준 마지막 항목 명시). (b) 신규 spec carve 부적합 — `FileUpload` 는 `File` 컴포넌트 하위 구조 — 별 spec 분리 시 spec 본문 양식 분산 + REQ-091 (testing/) / REQ-088 (foundation/) 와 달리 components/ 영역 단일 spec 단위 (`file.md`) 흡수 정합. (c) `30.spec/green/foundation/island-proptypes-zero.md` 흡수 부적합 — 본 spec 의 effect cleanup 불변식은 React lifecycle 채널 (도메인) — selector / runtime 채널 (REQ-088/REQ-091) 과 직교. consumed req: `specs/20.req/20260517-fileupload-settimeout-cleanup.md` (REQ-092) → `60.done/2026/05/17/req/` mv. RULE-07 자기검증 — (FR-01)(FR-02)(FR-03)(NFR-01)(NFR-02) 모두 평서형·반복 검증 가능 (`grep -nE` G1/G2/G3 단일 명령 + `vi.useFakeTimers()` + `runAllTimers()` 결정적 검증)·시점 비의존 (G4 0 hit — 본문에 절대 라인 / 상수 값 박제 0)·incident 귀속 부재 (REQ-092 §배경 의 baseline audit 는 §변경 이력 / §스코프 규칙 한정 박제)·수단 중립 (G5 0 hit — cleanup 수단 후보 라벨 0). RULE-06 §스코프 규칙 5 gate (G1~G5) 실측 박제 + `expansion` `허용` (`FileUpload.tsx` + `FileUpload.test.tsx` 2 파일 동시 박제 + helper hook 추가 시 `src/common/` 진입 가능 — scope 확장 허용). RULE-01 inspector writer 영역만 (`30.spec/green/components/file.md` create — blue→green 복사 후 흡수, blue 영역 0 touch). spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합). | all |
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |

## 참고
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
