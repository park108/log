# async effect 의 unmount 이후 발화 0 (setter · 로그 · 에러리포트)

> **위치**: 프로덕션 컴포넌트의 `useEffect` 본문 중 `await` / `.then(` 을 거치는 전부. 현 미가드 표면은 `src/Monitor/{ContentItem,ApiCallItem,WebVitalsItem}.jsx`, `src/Log/{LogList,Writer}.jsx`, `src/File/{File,FileDrop}.tsx`, `src/Comment/Comment.tsx`. 기박제 표면은 `src/Image/ImageSelector.tsx`, `src/File/FileUpload.tsx`, `src/Monitor/VisitorMon.jsx`.
> **관련 요구사항**: REQ-20260517-093 (최초), REQ-20260824-002 (audit 대상 교정 + 발화 대상 확장).
> **최종 업데이트**: 2026-08-24 (by inspector — 거짓 `[x]` 되돌림 + 대상 집합 술어화 + 보장 대상 확장).

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

프로덕션 컴포넌트의 `useEffect` 본문에서 `await` (또는 `.then(`) 이후에 실행되는 코드는, 그 사이에 컴포넌트가 unmount 되었으면 **어떤 외부 발화도 하지 않는다** — state setter, `log()`, `reportError()`, 그 밖에 컴포넌트 경계를 넘는 호출 전부. 응답이 늦게 도착한다는 사실은 사용자가 떠난 화면 몫의 부수효과를 만들지 않는다.

**보장 대상은 setter 에 한정되지 않는다.** React 19 는 unmounted setState 를 조용히 무시하므로 setter 만 막는 것은 프레임워크 동작에 기대는 것이고, 같은 코드 경로의 `log()` / `reportError()` 는 프레임워크가 막아주지 않는다. 본 spec 은 **effect 가 unmount 후 실행되지 않는다** 를 요구한다.

관측 표면:

1. **떠난 화면 몫의 콘솔 출력.** `log()` 는 `src/common/common.ts` `isDev()` 분기 안에서 `console.log` 로, `reportError()` 는 `src/common/errorReporter.ts` 에서 `console.error` 로 나간다. dev 세션·테스트 런타임에서 실제로 발화한다. `reportError` 는 외부 리포터(Sentry 등) 위임 지점으로 선언돼 있어(같은 파일 주석), 위임이 붙는 순간 유령 에러가 외부로 전송된다.
2. **테스트 런타임 teardown 경합.** 테스트가 끝난 뒤 도착한 응답의 콘솔 발화는 vitest worker 의 `onUserConsoleLog` RPC 와 teardown 을 경합시킨다 (§참고 관측 이력).
3. **중복 요청·중복 상태 전이.** 가드가 없으면 재마운트 직후 이전 마운트의 응답이 늦게 도착해 최신 상태를 덮어쓸 수 있다.

**audit 대상 집합은 파일명 열거가 아니라 술어로 정의된다** — "프로덕션 파일 중 `useEffect` 를 등록하고 본문에 `await` 또는 `.then(` 이 있는 것 전수". wrapper/구현 분리(`*Mon.jsx` 가 `lazy(() => import('./*Item'))` 로 구현을 가져오는 구조)나 lazy import 로 대상이 새지 않는다. 열거로 대상을 고정하면 실제 fetch 표면이 검사 밖에 남는다 — 그 일이 이미 일어났다 (§참고 §blue baseline 정정 요구).

의도적으로 하지 않는 것: (i) 가드 **수단** 지정 — `AbortController` / cancelled-flag ref / cleanup return / React Query 이관 중 무엇이든 효능이 충족되면 된다, (ii) `src/Log/hooks/useLogList.js` 등 미사용 훅의 존폐 판단 (별 축), (iii) fetch 자체의 취소 여부 — 본 spec 이 요구하는 것은 **응답의 적용·발화 억제**이지 네트워크 취소가 아니다, (iv) 커버리지 provider·threshold 조정 (`specs/30.spec/green/foundation/coverage-per-file-attribution-monotonicity.md` 축).

## 공개 인터페이스

없음 (횡단 런타임 계약). 측정 채널:

- **(M-A) 대상 집합 술어 audit** — 술어로 도출한 파일 전수에 unmount 가드 식별자가 있는지 판정.
  ```
  test "$(for f in $(grep -rln "useEffect" --include="*.jsx" --include="*.tsx" src | grep -v "\.test\."); do \
    grep -q "await \|\.then(" "$f" && ! grep -qE "cancelled|AbortController|isMounted|signal" "$f" && echo "$f"; done | wc -l)" -eq 0
  ```
- **(M-B) unmount race fixture** — pending 응답 상태에서 `unmount()` 후 응답을 resolve 시켜 setter mock 0 hit + `console.log` / `console.error` spy 0 hit 를 단정하는 테스트.
- **(M-C) 판정 채널의 저장소 등재** — (M-A) 또는 (M-B) 가 `package.json` `scripts.check:*` / `.husky/*` / `.github/workflows/ci.yml` step / vitest 수집 경로 중 1+ 에서 발화.

## 동작

1. **(I1) await 후 발화의 unmount 가드** — 프로덕션 `useEffect` 본문에서 `await` / `.then(` 이후에 실행되는 코드는 unmount 되었으면 setter 를 호출하지 않는다.
2. **(I2) 발화 대상의 확장** — 같은 지점에서 `log()` · `reportError()` 등 컴포넌트 외부로 나가는 호출도 하지 않는다. setter 만 막고 로그·에러리포트를 남기는 부분 가드는 본 불변식을 충족하지 않는다.
3. **(I3) 대상 집합의 술어 도출** — audit 은 파일명 목록을 하드코딩하지 않고 술어("`useEffect` 등록 + 본문 `await`/`.then(`")로 대상을 산출한다. 신규 컴포넌트는 목록 갱신 없이 자동으로 대상에 든다.
   - **현 HEAD 실측 (2026-08-24, `414e66b`)**: 술어 대상 11 파일 중 가드 보유 3 (`ImageSelector.tsx` / `FileUpload.tsx` / `VisitorMon.jsx`), 미가드 **8 파일** — `Monitor/{ContentItem,ApiCallItem,WebVitalsItem}.jsx`, `File/{File,FileDrop}.tsx`, `Comment/Comment.tsx`, `Log/{LogList,Writer}.jsx`. (M-A) rc=1.
4. **(I4) wrapper 는 대상이 아니라 통과점** — `src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` 는 fetch 를 하지 않는 wrapper 이며(각 35/34/37 행, `await`/`fetch` 0 hit), 실제 fetch 는 `lazy` 로 가져오는 `*Item.jsx` 에 있다(각 `await` 2 hit). **wrapper 에 대한 0 hit 는 구현의 안전을 뜻하지 않는다.**
5. **(I5) 도메인 자동 충족 주장은 프로덕션 import 경로로 판정한다** — "React Query 를 쓰므로 자동 충족" 은 해당 훅이 **라우팅되는 컴포넌트에서 실제로 import 될 때만** 성립한다. 훅 파일의 존재나 `useQuery` grep hit 는 근거가 아니다.
   - 현 HEAD: `src/Log/hooks/useLogList.js` 의 프로덕션 import 0 (정의·자기 export 뿐), 라우팅 경로는 `src/Log/Log.jsx` → `lazy(() => import('./LogList'))` → `src/Log/LogList.jsx` 가 `./api` 의 `getLogs`/`getNextLogs` 를 직접 호출하는 raw fetch 다. Search (`src/Search/hooks/useSearchList.ts`) 는 `Search.tsx` 에서 실제로 소비된다.
6. **(I6) 판정 채널의 저장소 등재** — (M-A) 또는 (M-B) 가 자동 발화 경로 1+ 를 갖는다. 현 HEAD 실측 0 hit (`grep -nE '"check:.*unmount' package.json` 0 hit, `unmount()` 를 쓰는 테스트는 8 미가드 파일 중 0 개).

## 의존성

- 내부: 술어 대상 11 파일 (§동작 3), `src/common/common.ts` (`log`), `src/common/errorReporter.ts` (`reportError`), `src/setupTests.js` (전역 `afterEach` 의 `vi.restoreAllMocks()` — 이 시점 이후 도착한 발화는 spy 없이 실제 콘솔로 나간다).
- 외부: `@testing-library/react` (`unmount()`), `vitest`, `AbortController` 표준 (선택 수단), `@tanstack/react-query` (자동 충족 비교 대상).
- 역의존:
  - `specs/30.spec/blue/testing/console-error-runtime-zero.md` — 전역 `console.error` fail-fast 채널. 그 패턴 집합(`Failed prop type` / list key / cross-component update / hook order)에 post-unmount 발화는 **없다**. 본 축을 대신 검출하지 않는다.
  - `specs/30.spec/blue/testing/search-abort-runtime-smoke.md` — Search 타이머 cleanup. 직교.
  - `specs/30.spec/green/foundation/coverage-per-file-attribution-monotonicity.md` — 가드 도입이 만드는 분기의 커버리지 귀속. 직교하되 §회귀 중점 R-4 로 연결.

## 회귀 중점

1. (R-1) 미가드 표면 확산 — 신규 컴포넌트가 가드 없이 async effect 를 등록. (M-A) 가 술어 기반이므로 목록 갱신 없이 잡힌다.
2. (R-2) 부분 가드 — setter 앞에만 가드를 두고 `log()` / `reportError()` 는 그대로 두는 회귀. (M-B) 의 console spy 단정이 검출 지점이다.
3. (R-3) wrapper 측정 회귀 — 구현이 lazy 로 분리된 상태에서 wrapper 만 측정해 0 hit 를 얻는 회귀. (I4)(M-A) 술어가 차단한다.
4. (R-4) 가드 도입이 도달 불가 분기를 남김 — 선행 회복 시도(`2eddb50`)가 남긴 종료 가드의 true 분기 3건이 본질적 unreachable 이었고, 그것이 `branches 93.89% < 94` 로 revert 사유가 됐다. 회복 수단은 분기 증가를 최소화하거나 도입 분기가 fixture 로 도달 가능해야 한다. **본 항목은 회복 task 의 제약이며 spec 체크박스가 아니다** (§참고 §미측정·비판정 항목).

## 발화 채널

**현 HEAD 에 자동 발화 채널이 없다** ((I6) 0 hit). RULE-07 §promote 조건 4 에 따라 promote 차단 사유가 아니라 **"채널 부착 task 발행"이 선행 조건**이다.

planner 는 (a) 판정 채널 부착((M-A) 를 `check:*` 로 등재하거나 (M-B) fixture 를 vitest 수집 경로에 두는 것) 과 (b) 미가드 8 파일의 회복, 두 갈래로 발행한다. (a) 는 게이트 신설이므로 **RULE-06 §게이트 실효 검증(주입)** 이 DoD 로 따라붙는다.

## 테스트 현황

- [x] (M-A) 술어 audit 실행 가능 — 2026-08-24 inspector 실측, rc=1 / 8 파일 출력.
- [x] 기박제 3 도메인 fixture 실재 — `src/Image/ImageSelector.test.tsx` · `src/File/FileUpload.test.tsx` · `src/Monitor/VisitorMon.test.jsx` 가 `unmount()` 를 사용한다.
- [ ] (M-A) rc=0 — 현재 미가드 8 파일.
- [ ] (M-B) 미가드 표면의 unmount race fixture — 8 파일 중 `unmount()` 를 쓰는 테스트 0. `src/Log/LogList.jsx` 는 테스트 파일 자체가 부재하다.
- [ ] (M-C) 판정 채널 등재 — 부재.

## 수용 기준

> 전 항목 HEAD=`414e66b` 에서 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 주입·자기서술 부류는 §참고 §미측정·비판정 항목으로 강등했다.

- [ ] (Must, FR-01/FR-02) 미가드 표면 0 — `bash -c 'test "$(for f in $(grep -rln "useEffect" --include="*.jsx" --include="*.tsx" src | grep -v "\.test\."); do grep -q "await \|\.then(" "$f" && ! grep -qE "cancelled|AbortController|isMounted|signal" "$f" && echo "$f"; done | wc -l)" -eq 0'` → rc=0. **2026-08-24 실측 rc=1 / 8 파일.**
- [ ] (Must, FR-03) 술어 대상 파일마다 unmount race fixture 존재 — `bash -c 'n=0; for f in $(grep -rln "useEffect" --include="*.jsx" --include="*.tsx" src | grep -v "\.test\."); do grep -q "await \|\.then(" "$f" || continue; b="${f%.*}"; grep -lq "unmount()" "$b".test.jsx "$b".test.tsx 2>/dev/null || { echo "$f"; n=$((n+1)); }; done; exit $((n>0))'` → rc=0. **2026-08-24 실측 rc=1 / 8 파일** (기가드 3 파일은 통과).
- [ ] (Must, FR-04) 판정 채널 등재 — `bash -c 'grep -qE "\"check:[a-z-]*unmount[a-z-]*\"" package.json || ls src/__tests__/*unmount* >/dev/null 2>&1'` → rc=0. **2026-08-24 실측 rc=1 (0 hit).**
- [ ] (Must, FR-05) 채널이 대상을 열거로 고정하지 않음 — 채널 등재 후, 그 채널 파일에 대상 파일명 하드코딩 0: `bash -c 'f=$(grep -rlE "unmount" scripts src/__tests__ 2>/dev/null | head -1); test -n "$f" && test "$(grep -cE "ContentItem|ApiCallItem|WebVitalsItem|LogList|FileDrop" "$f")" -eq 0'` → rc=0. **채널 부재로 현재 rc≠0** — FR-04 충족 후 판정된다.

## 스코프 규칙

- **expansion**: 허용 — 회복이 컴포넌트 `*.jsx`/`*.tsx` + 대응 `*.test.{jsx,tsx}` + 신규 판정 채널(`scripts/` 또는 `src/__tests__/`) 을 동시에 건드린다. `src/Log/LogList.jsx` 는 테스트 파일 신규 생성이 필요하다. 공통 헬퍼(`src/common/`) 도입도 허용하되 수단은 지정하지 않는다.
- **grep-baseline** (HEAD=`414e66b`, 2026-08-24 실측):
  - (G1) **[술어 대상 집합]** `for f in $(grep -rln "useEffect" --include="*.jsx" --include="*.tsx" src | grep -v "\.test\."); do grep -q "await \|\.then(" "$f" && echo "$f"; done` → **11 파일**. 가드 식별자(`cancelled|AbortController|isMounted|signal`) 보유 3 / 미보유 8.
  - (G2) **[미가드 8 파일]** `src/Monitor/ContentItem.jsx`, `src/Monitor/ApiCallItem.jsx`, `src/Monitor/WebVitalsItem.jsx`, `src/File/File.tsx`, `src/File/FileDrop.tsx`, `src/Comment/Comment.tsx`, `src/Log/LogList.jsx`, `src/Log/Writer.jsx`. `useEffect(` 등록 수 / `return () =>` cleanup 수: ContentItem 1/0, ApiCallItem 1/0, WebVitalsItem 1/0, File 4/0, FileDrop 2/1, Comment 5/1, LogList 7/0, Writer 5/2. **cleanup 이 존재하는 3 파일도 async effect 쪽 cleanup 은 아니다** (FileDrop/Comment/Writer 의 cleanup 은 인접 동기 effect 소속).
  - (G3) **[wrapper 0 hit 반례]** `grep -cE "await |\.then\(" src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` → 각 **0**, 대응 `*Item.jsx` → 각 **2**. `grep -rnE "useEffect.*async|async\s*\(\s*\)\s*=>" src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` → **0 hit, rc=1** (blue 가 `[x]` 근거로 삼은 그 명령).
  - (G4) **[프로덕션 React Query 소비]** `grep -rn "useLogList" src | grep -v "\.test\."` → **2 hit, 둘 다 `src/Log/hooks/useLogList.js` 자기 파일** (`:14` 정의, `:25` default export). 프로덕션 import 0.
  - (G5) **[판정 채널]** `grep -nE '"check:[a-z-]*unmount' package.json` → **0 hit**. `grep -rln "unmount()" src --include="*.test.*"` → 8 파일이나 미가드 8 파일과 교집합 0.
- **rationale**: (G1)(G2) 회복 대상의 zero-point. (G3) 은 열거 고정 게이트가 어떻게 false-negative 를 내는지의 반례 — RULE-06 §열거 고정 금지 / §관측 표면 의 실사례다. (G4) 는 "훅 존재 = 자동 충족" 추론의 반례. (G5) 는 채널 부재.

## 참고

- **REQ 원문**: `specs/60.done/2026/08/24/req/20260824-post-unmount-async-effect-emission-zero.md` (REQ-20260824-002), `specs/60.done/2026/05/17/req/` (REQ-20260517-093, 최초).
- **선행 회복 시도 (revert 됨)**: `TSK-20260520-01-monitor-items-fetch-unmount-safety` — `2eddb50` → `fcb062e`. 단일 차단 사유 `branches 93.89% < 94`. followup: `specs/60.done/2026/05/20/followups/20260519-2240-TSK-20260520-01-monitor-items-fetch-unmount-safety-from-blocked.md`.
- **관측 이력 (teardown 경합)**: `specs/60.done/2026/08/24/followups/20260824-1330-vitest-worker-teardown-unhandled-rejection.md` — CI run `32689865968` (sha `7912860`) attempt 1 failure / attempt 2 success, 코드 변경 0. `EnvironmentTeardownError: [vitest-worker]: Closing rpc while "onUserConsoleLog" was pending`, 귀속 `src/Monitor/Monitor.test.jsx`.

### blue baseline 정정 요구 (운영자 판단 근거)

현 `specs/30.spec/blue/testing/runtime-fetch-unmount-safety.md` 는 아래 marker 를 `[x]` 로 유지한다. 전부 **현 HEAD 에서 거짓이거나 공허**하다.

| blue 라인 | 박제 내용 | 현 HEAD 실측 |
|---|---|---|
| `:57` (I4) | "자매 3 컴포넌트 전수 wrapper-only, fetch/async effect/setter 부재 — race 노출 0. 회복 task carve 불필요" | 측정 대상이 틀렸다. fetch 는 `*Item.jsx` 에 있고 세 파일 모두 `await` 2 hit · 가드 0 · cleanup 0. **race 노출 3 파일.** |
| `:70` (Should FR-05) | 같은 audit 의 `[x]` (`grep -rnE "useEffect|async|await|setIs" src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` → 0 hit) | 동일. 0 hit 는 사실이나 **위반이 존재할 수 없는 표면을 측정한 0** 이다. |
| `:58` (I5) | "Search / Log 도메인은 React Query hook 기반으로 자동 충족" | Log 에 대해 거짓. `useLogList` 프로덕션 import 0, 라우팅 경로 `LogList.jsx` 는 raw fetch (§동작 5). |
| `:17` · `:26` | 자매 audit 대상을 `{ContentMon,ApiCallMon,WebVitalsMon}` 로 **열거 고정** | 열거가 구현 파일을 배제했다. 본 green 은 술어 도출로 교체한다 ((I3)). |

세 marker 는 **효능이 아니라 grep 0 hit** 로 플립됐다. `-Mon` 접미 3 파일만 겨냥한 패턴은 구현이 `-Item` 으로 분리된 이상 어떤 코드 상태에서도 0 을 낸다 — 민감도 0 게이트다 (RULE-06 §게이트 실효 검증).

**inspector 는 blue 를 편집하지 않는다** (RULE-01 — blue 는 planner mv only). 정정 경로는 둘:
1. 본 green 이 Must 회복 후 planner 에 의해 blue 로 승격 — 거짓 marker 가 덮어써진다 (정규 경로).
2. 운영자가 즉시 정정을 원하면 RULE-05 경로로 blue 를 `50.blocked/spec/` 격리 후 재투입.

회복 전까지 blue 는 거짓 `[x]` 를 유지하므로, **`runtime-fetch-unmount-safety` 의 blue marker 를 "Monitor 축 검증 완료" 로 읽는 판단은 이 절을 함께 읽어야 한다.** 실제로 이 `[x]` 가 사는 동안 같은 표면의 회복 task 는 revert 된 채 재발행되지 않았다.

### 미측정·비판정 항목

RULE-07 §수용 기준 문장 규약에 따라 체크박스에서 강등한 항목 (감사성 보존, promote 비차단).

- **(주입 부류 — 이관 필수) 미가드 상태 주입 시 rc≠0.** 가드를 1건 되돌린 상태에서 판정 채널이 rc≠0 + 해당 파일 경로를 stdout 에 내는지의 검증. 고장을 내야 판정되므로 spec 체크박스가 아니다. **이관처: 본 spec §발화 채널 (a) 판정 채널 부착 task 의 DoD** — RULE-06 §게이트 실효 검증, 검출 방향 2 (setter 가드 제거 / 로그·에러리포트만 가드 밖으로 이동) 전수 주입, `RULE-04` notes `injection: 2/2 detect` 필수.
- **(미측정 NFR) `npm test` 의 unhandled error 0.** 원 req FR-06 이 요구한 "`Errors N errors` 행 부재 + rc=0" 은 (a) 현 HEAD 에서 이미 참인 실행이 있고 (b) 실패가 간헐적이라 1회 실행으로 판정되지 않는다 — "N 회 반복 동일 출력" 부류. 또한 `npm test` rc 는 이미 CI 게이트이므로 체크박스로 두면 중복 게이트다. 본 spec 의 판정 축은 발화 자체((M-A)(M-B))이고, teardown 경합은 그 **증상**으로 §역할 관측 표면 2 에 보존한다.
- **(회복 task 제약) 도달 불가 분기 0.** §회귀 중점 R-4. "가드가 만드는 신규 분기가 도달 불가를 남기지 않는다" 는 회복 수단에 대한 제약이며 시스템 불변식이 아니다. **이관처: 회복 task 의 DoD** — 도입 분기가 fixture 로 도달되거나 분기 증가 0 임을 `result.md` 에 박제한다.
- **(중복 게이트 부류) 회복 후 테스트 회귀 0.** "가드·fixture 추가 후 `npm test` rc=0" 은 현 HEAD 에서 이미 참이고, 위반 시 `.github/workflows/ci.yml` Test step 이 즉시 실패한다 — RULE-07 §반려 시그널의 중복 게이트다. 회복 task 의 DoD 에서 다루고 본 spec 체크박스로 두지 않는다.
- **(자명·자기서술 부류)** 구 blue 의 (I8)(I9)(NFR-01~NFR-08) — 본 spec 본문에 대한 자기 grep, writer 영역 정합, 직교 cross-ref 존재 확인. 판정 대상이 시스템이 아니라 문서다. §의존성·§스코프 규칙에 평서문으로 보존한다.
- **`src/Log/hooks/useLogList.js` 미사용 훅의 존폐.** 본 spec 은 프로덕션 경로 판정((I5))만 하고 훅 삭제·연결은 판단하지 않는다 (별 축).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-24 | inspector tick (REQ-20260824-002 흡수) / HEAD=`414e66b` | **거짓 `[x]` 되돌림 + 대상 집합 술어화 + 보장 대상 확장.** blue 의 (I4)(I5)(Should FR-05) 는 `*Mon.jsx` wrapper 3 파일을 측정해 0 hit 를 얻고 "race 노출 0" 으로 닫혔으나, 실제 fetch 는 `*Item.jsx` 에 있고 세 파일 모두 미가드다. 술어 도출((I3))로 재측정한 결과 미가드 **8 파일** — Monitor 3 + File 2 + Comment 1 + Log 2. "Log = React Query 자동 충족" 전제도 거짓 (`useLogList` 프로덕션 import 0). 보장 대상을 setter 에서 `log()`·`reportError()` 를 포함한 외부 발화 전부로 확장((I2)). 구 §수용 기준 25 marker 중 자기서술·자명 부류는 §참고 §미측정·비판정 항목으로 강등하고, 실행 가능한 Must 6건으로 교체했다. 주입 부류는 채널 부착 task DoD 로 이관 표기. | all |
| 2026-05-20 | inspector 203차 tick / `fed31ba` | (I4)+(I7)+(Should FR-05) 3 marker 플립. **(I4)/(FR-05) 근거는 본 개정에서 무효화됐다** — 위 2026-08-24 행 참조. (I7) fixture 박제 (Image/File/VisitorMon 3 도메인) 는 유효. | 테스트 현황, 수용 기준 |
| 2026-05-18 | inspector 67차 tick / `760a491` | (I3)+(I6)+(FR-03)+(FR-04) 플립 — `VisitorMon.jsx` cancelled-flag ref 박제 회수. 유효. | 테스트 현황, 수용 기준 |
| 2026-05-17 | inspector (REQ-20260517-093 흡수) / `cac6fa2` | 최초 박제 — Image/File/Monitor 3 도메인 unmount-safety 비대칭 해소. | all |
