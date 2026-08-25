# async continuation 의 unmount 이후 발화 0 (setter · 로그 · 에러리포트)

> **위치**: 프로덕션 컴포넌트에서 `await` / `.then(` 을 거치는 코드 전부 — **effect 본문·이벤트 핸들러 무관**. HEAD=`8da63f6` 확장 술어 대상 **12 파일**, 전수 가드 보유 / 미보유 **0** (등록 시점 `b14cd3a` 는 미보유 1 = `src/File/FileItem.tsx`). effect 한정 선행 술어 대상도 **12 파일**로 확장 술어와 일치한다 (차집합 공집합) — `src/Monitor/{VisitorMon,ContentItem,ApiCallItem,WebVitalsItem}.jsx`, `src/File/{File,FileDrop,FileUpload}.tsx`, `src/Comment/Comment.tsx`, `src/Image/ImageSelector.tsx`, `src/Log/{Writer,LogList}.jsx`.
> **관련 요구사항**: REQ-20260517-093 (최초), REQ-20260824-002 (audit 대상 교정 + 발화 대상 확장), REQ-20260825-002 (선언 범위 확장 + 관측 강도 대칭).
> **선행 판본**: 동일 slug `runtime-fetch-unmount-safety` 의 blue 판본 (동일 상대 경로 — 승격 시 대체된다).
> **최종 업데이트**: 2026-08-25 (by inspector — tick 221 Phase 1 reconcile @ HEAD=`6f58541`. TSK-20260825-09 착지 반영: FR-09 **충족**. 동시에 G-F 판정의 새 사각 (B5) 를 실측 발견해 **FR-11** 을 신설했다 — 수용 기준 **9/10**).

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

프로덕션 컴포넌트의 **async continuation** — `await` (또는 `.then(`) 이후에 실행되는 코드 — 은, 그 사이에 컴포넌트가 unmount 되었으면 **어떤 외부 발화도 하지 않는다**. state setter, `log()`, `reportError()`, 그 밖에 컴포넌트 경계를 넘는 호출 전부. 응답이 늦게 도착한다는 사실은 사용자가 떠난 화면 몫의 부수효과를 만들지 않는다.

**continuation 이 effect 본문에 있는지 이벤트 핸들러에 있는지는 무관하다.** 선행 판본은 주어를 "`useEffect` 본문에서" 로 한정했으나, 아래 관측 표면 1·2·3 은 어느 쪽에서 발화하든 동일하게 성립한다 — 떠난 화면 몫의 콘솔 출력, teardown 경합, 늦은 응답의 상태 덮어쓰기는 발화 지점의 문법적 위치를 구분하지 않는다. 삭제 버튼을 누르고 곧바로 이탈하는 것은 페이지가 로드되자마자 이탈하는 것과 같은 부류의 사건이다. 한정어는 위험의 경계가 아니라 **최초 측정 수단의 경계**였다 (§참고 §선언 범위 정정).

**보장 대상은 setter 에 한정되지 않는다.** unmounted setState 는 프레임워크가 **경고 없이** 무시한다 — 현 HEAD 의 React `18.2.0` 에서 `dispatchSetState` 는 `enqueueConcurrentHookUpdate` 가 `root === null` 을 반환하면 `scheduleUpdateOnFiber` 를 건너뛰고 조용히 끝난다 (`node_modules/react-dom/cjs/react-dom.development.js:17523-17529`, inspector tick 219 실측). 따라서 setter 만 막는 것은 프레임워크 동작에 기대는 것이고, 같은 코드 경로의 `log()` / `reportError()` 는 프레임워크가 막아주지 않는다.

이 침묵에는 **측정 측 귀결**이 하나 더 있다. 발화가 setter 뿐인 표면에서는 `console` spy 단정이 코드 상태와 무관하게 항상 0 hit 이므로, 가드를 제거해도 fixture 가 통과한다 — **민감도 0**. 관측 강도는 발화 종류에 따라 비대칭이며, 그 비대칭을 계약이 명시하지 않으면 fixture 의 초록은 안전이 아니라 무측정을 뜻한다 ((I8)).

관측 표면:

1. **떠난 화면 몫의 콘솔 출력.** `log()` 는 `src/common/common.ts` `isDev()` 분기 안에서 `console.log` 로, `reportError()` 는 `src/common/errorReporter.ts` 에서 `console.error` 로 나간다. dev 세션·테스트 런타임에서 실제로 발화한다. `reportError` 는 외부 리포터(Sentry 등) 위임 지점으로 선언돼 있어(같은 파일 주석), 위임이 붙는 순간 유령 에러가 외부로 전송된다.
2. **테스트 런타임 teardown 경합.** 테스트가 끝난 뒤 도착한 응답의 콘솔 발화는 vitest worker 의 `onUserConsoleLog` RPC 와 teardown 을 경합시킨다 (§참고 관측 이력).
3. **중복 요청·중복 상태 전이.** 가드가 없으면 재마운트 직후 이전 마운트의 응답이 늦게 도착해 최신 상태를 덮어쓸 수 있다.

**audit 대상 집합은 파일명 열거가 아니라 술어로 정의된다** — "프로덕션 파일 중 **훅을 사용하고**(= React 컴포넌트·커스텀 훅) 본문에 `await` 또는 `.then(` 이 있는 것 전수". **`useEffect` 등록 여부로 배제하지 않는다** — 선행 판본의 술어는 `useEffect` 를 요구했고 그 결과 이벤트 핸들러에서만 async 를 만드는 파일이 통째로 빠졌다 ((I7)). wrapper/구현 분리(`*Mon.jsx` 가 `lazy(() => import('./*Item'))` 로 구현을 가져오는 구조)나 lazy import 로 대상이 새지 않는다. 열거로 대상을 고정하면 실제 fetch 표면이 검사 밖에 남는다 — 그 일이 이미 일어났다 (§참고 §blue baseline 정정 요구).

의도적으로 하지 않는 것: (i) 가드 **수단** 지정 — `AbortController` / cancelled-flag ref / cleanup return / React Query 이관 중 무엇이든 효능이 충족되면 된다, (ii) `src/Log/hooks/useLogList.js` 등 미사용 훅의 존폐 판단 (별 축), (iii) fetch 자체의 취소 여부 — 본 spec 이 요구하는 것은 **응답의 적용·발화 억제**이지 네트워크 취소가 아니다, (iv) 커버리지 provider·threshold 조정 (`coverage-per-file-attribution-monotonicity` 축).

## 공개 인터페이스

없음 (횡단 런타임 계약). 측정 채널:

- **(M-A) 대상 집합 술어 audit** — 술어로 도출한 파일 전수에 unmount 가드 식별자가 있는지 판정. 훅 판정은 **`useEffect` 가 아니라 훅 호출 일반**이며, TS 타입 인자 표기(`useState<boolean>(false)`)를 포함한다.
  ```
  n=0; for f in $(grep -rlE "await |\.then\(" --include="*.jsx" --include="*.tsx" src | grep -v "\.test\."); do
    grep -qE "\buse[A-Z][A-Za-z]*(<[^()]*>)?[[:space:]]*\(" "$f" || continue
    grep -qE "cancelled|AbortController|isMounted|signal" "$f" || { echo "$f"; n=$((n+1)); }
  done; exit $((n>0))
  ```
  - `(<[^()]*>)?` 는 생략 가능한 절이 아니다. 이것이 없으면 `useState<boolean>(false)` 만 쓰는 파일이 훅 미사용으로 판정돼 대상에서 빠진다 — 실제로 그 상태에서 확장 표면이 11 로 나와 선행 술어와 같아졌고 "경계 문제 없음" 으로 오보고됐다 (교정 후 12). `RULE-06 §fixture 대표성` 이 겨냥한 부류의 실사례다 ((I10)).
- **(M-B) unmount race fixture** — pending 응답 상태에서 `unmount()` 후 응답을 resolve 시켜 무발화를 단정하는 테스트. 관측기는 **대상 파일의 post-await 발화 종류를 전수 덮어야** 한다 ((I8)) — console 계열 발화가 0 인 setter-only 표면에서는 `console` spy 가 아니라 setter 호출 계수기로 판정한다.
- **(M-D) 관측 강도의 무필터성** — (M-B) 의 무발화 단정은 **필터링되지 않은 전량**에 대해 이뤄진다. 특정 경고 문구 정규식으로 부분집합을 거른 뒤 0 을 단정하는 형태는 관측으로 계수하지 않는다 ((I9)).
- **(M-C) 판정 채널의 저장소 등재** — (M-A) 또는 (M-B) 가 `package.json` `scripts.check:*` / `.husky/*` / `.github/workflows/ci.yml` step / vitest 수집 경로 중 1+ 에서 발화.

## 동작

1. **(I1) await 후 발화의 unmount 가드** — 프로덕션 컴포넌트의 async continuation(`await` / `.then(` 이후 코드)은, 그것이 **effect 본문이든 이벤트 핸들러든**, unmount 되었으면 setter 를 호출하지 않는다.
2. **(I2) 발화 대상의 확장** — 같은 지점에서 `log()` · `reportError()` 등 컴포넌트 외부로 나가는 호출도 하지 않는다. setter 만 막고 로그·에러리포트를 남기는 부분 가드는 본 불변식을 충족하지 않는다.
3. **(I3) 대상 집합의 술어 도출** — audit 은 파일명 목록을 하드코딩하지 않고 술어("`useEffect` 등록 + 본문 `await`/`.then(`")로 대상을 산출한다. 신규 컴포넌트는 목록 갱신 없이 자동으로 대상에 든다.
   - 최초 등록 시점(`414e66b`) 실측: 술어 대상 11 파일 중 가드 보유 3, 미가드 **8 파일**. (M-A) rc=1.
   - **HEAD=`8da63f6` 실측: 충족.** 확장 술어 대상 **12 파일** 전수 가드 보유, 미가드 **0**. (M-A) rc=0. 회복 경로는 TSK-20260824-07-a (`9c86492`, Monitor 3) → -07-b (`290fcca`, File 2 + Comment 1) → -07-c (`15de04c`, Log 2 + `LogList.test.jsx` 신설) → TSK-20260825-04 (`35f21fd`, `FileItem` 핸들러 가드 + race fixture).
3b. **(I7) 선언 범위 = 측정 대상 집합** — audit 술어가 산출하는 대상 집합과 (I1) 이 선언한 범위의 **차집합이 공집합**이다. 술어가 `useEffect` 등록 여부로 파일을 배제하면 이벤트 핸들러 async 표면이 통째로 관측 밖에 남는다.
   - **HEAD=`8da63f6` 실측: 충족.** 선행 술어(`useEffect` 요구) 대상 **12 파일**, 확장 술어(훅 사용 + post-await 발화) 대상 **12 파일**, 차집합 **공집합**. 등록 시점(`b14cd3a`)에는 11 vs 12 로 차집합이 `src/File/FileItem.tsx` 1건이었다.
   - 차집합이 닫힌 경로에 주의할 점이 있다 — `FileItem` 이 확장 술어 쪽으로 끌려온 것이 아니라, 가드 도입이 `useEffect` 를 **함께 들여와** 선행 술어 대상이 11 → 12 로 늘어난 결과다. 즉 이번 회복은 두 술어를 같은 값으로 만들었지만 **선행 술어의 구조적 한계(파일 단위 · effect 등록 요구)를 제거하지는 않았다.** 핸들러 async 만 있고 훅 가드를 `useRef` 로만 구현한 파일이 생기면 차집합은 다시 벌어진다. 그래서 집행 대상은 계속 확장 술어여야 하며, audit 채널도 G-B/G-C/G-D 의 대상을 확장 술어로 두고 있다 (TSK-20260825-05, `9b3f774`).
   - 등록 시점 그 파일은 가드가 없었다 — `useEffect` 0 · 가드 식별자 0 이면서 `:34` `await deleteFile(...)` · `:35` `await res.json()` 이후 `log()`/`reportError()` 계열 6 hit + setter 다수, `:59` `await copyToClipboard(...)` 이후 setter 3. **삭제 버튼을 누른 직후 이탈하면 계약이 금지한 post-unmount 발화가 그대로 났다.** 선행 (M-A) 는 이 파일을 계수하지 않아 rc=0 을 냈다. **HEAD=`8da63f6` 실측: 가드 식별자 9 hit** (TSK-20260825-04 / `35f21fd`).
   - 회복 순서는 예고대로 `FileItem` 가드(TSK-20260825-04) → 술어 확장·집행 대상 이관(TSK-20260825-05) 이었다. 역순이었다면 첫 실행부터 red 다.
   - `src/Comment/Comment.tsx` 의 submit 핸들러가 회복된 것은 술어가 잡아서가 아니라 회복 task 가 명시 지목했기 때문이다 — 같은 파일에 별도 async effect 가 있어 **파일 단위**로 대상에 들었을 뿐, 핸들러 자체는 관측 범위 밖이었다. 파일 단위 술어의 구조적 한계다.
4b. **(I8) 관측 강도의 발화 종류 대칭** — race fixture 의 관측기는 대상 파일의 post-await 발화 종류를 전수 덮는다. `console` 계열 발화가 0 인 **setter-only 표면**은 `console` spy 로 판정할 수 없다 (§역할 — 프레임워크가 조용히 무시한다).
   - 실측 대조: `src/Log/LogList.jsx` 는 post-await `log()` 11 hit + setter → console spy 로 검출 가능. `src/Log/Writer.jsx` 의 `copyMarkdownString` 은 **setter 3건뿐** → 가드를 제거해도 console spy 0 hit, 검출 불가.
   - 선행 회복 task 의 주입 6건이 전부 `log()` 로 잡힌 것은 그 6 파일에 마침 `log()` 가 있었기 때문이지 관측기가 강해서가 아니다. setter 관측 수단(`vi.mock('react')` 로 `useState` 를 감싼 recorder — `vi.spyOn(React,'useState')` 는 ESM namespace 비설정으로 불가)은 한 task 에서 실제로 쓰였으나 **계약 어디에도 기록되지 않았다.** 본 판본이 (M-B) 에 박제했다.
   - **HEAD=`8da63f6` 실측: 충족.** `src/File/FileItem.test.tsx:16` `const setterRec = vi.hoisted(() => ({ calls: 0 }))` + `:18-28` `vi.mock('react')` wrapper 가 setter recorder 를 등재하고, `:425` (F2) 가 `copyToClipboard` 의 **setter-only 표면**에서 호출 0 을 단정한다. 관측기의 민감도는 `:447` (F2b) 가 별도로 세운다 — 마운트 상태의 성공 경로에서 setter 가 **실제로 발화함**을 단정하므로, recorder 가 죽어 항상 0 을 세는 상태면 F2b 가 red 다. **가드 분기 양쪽 도달을 한 쌍으로 묶은 형태**이며 (I8) 이 요구한 관측 강도의 실물이다.
4c. **(I9) 무발화 단정의 무필터성** — fixture 의 무발화 단정은 필터링되지 않은 전량에 대해 이뤄진다. 특정 경고 문구로 부분집합을 거른 뒤 0 을 단정하는 형태는 **도달 불가 필터**이며 관측으로 계수하지 않는다.
   - 등록 시점 실측: 위반 3 파일 / 10 line — `src/Image/ImageSelector.test.tsx`(3) · `src/File/FileUpload.test.tsx`(4) · `src/Monitor/VisitorMon.test.jsx`(3) 이 `return /update.*was not wrapped|cannot update a component|unmounted/i.test(msg)` 로 거른 뒤 0 을 단정했다. React 18.2 는 그 경고를 발화하지 않으므로 **필터 결과는 코드 상태와 무관하게 항상 0** 이었다.
   - **HEAD=`8da63f6` 실측: 부분 충족 — 리터럴 문구 층 0 line, 그러나 (I9) 는 미충족.** TSK-20260825-06 (`8da63f6`) 이 위 3 파일의 필터를 제거하고 무필터 단정으로 교체했으며, 리터럴 grep 은 0 line 이다. **그러나 같은 부류가 1건 살아 있다** — `src/Search/Search.test.tsx:218`:
     ```
     const warn = errorSpy.mock.calls.find(args => String(args[0]).includes('unmounted'));
     expect(warn).toBeUndefined();
     ```
     `unmount()` 직후 무발화를 단정하는 자리(`:209`~`:220`)이면서 발화 기록을 문구로 좁힌 뒤 공집합을 단정한다. React 18.2 가 그 문구를 내지 않으므로 **코드 상태와 무관하게 항상 통과**한다 — 등록 시점 3 파일과 정확히 같은 결함이다.
   - **원 계수 "3 파일" 이 애초에 과소 계수였다** (inspector tick 220 실측). 리터럴 문구 grep 은 `.includes('unmounted')` 변형을 보지 못하므로 이 4번째 파일을 세지 못했다. FR-09 의 판정 명령이 그 grep 이었기 때문에 **명령은 0 을 내면서 불변식은 위반된 상태**가 성립한다 — 측정 수단이 불변식보다 좁은 전형이며 §발화 채널 (B3) 이 그대로 재현된 것이다. 본 판본에서 FR-09 의 판정 명령을 2층(리터럴 + 선택자)으로 교정했다.
   - 세 대상의 콘솔류 발화는 실재한다 — `grep -cE "\blog\(|reportError\(|console\.(log|error)"` 로 `ImageSelector.tsx` **11** · `FileUpload.tsx` **11** · `VisitorMon.jsx` **6** (inspector tick 219 실측, 파일 전체 기준). 단 하나도 단정되지 않는다. 원 req 는 같은 축을 **12 / 9 / 6** 으로 보고했는데, 이는 "post-await 발화 한정" 이라는 더 좁은 계수로 보이나 산출 명령이 기록돼 있지 않아 **본 판본에서 재현하지 못했다**. 두 수치의 차이는 계약 판정에 영향을 주지 않는다 — (I9) 가 요구하는 것은 발화 건수가 아니라 **필터가 걸러낸 뒤 남는 단정 대상이 0 이라는 사실**이며, 그것은 필터 정규식만으로 판정된다. 계수 정합은 §미측정·비판정 항목으로 넘긴다.
   - 회복 3 task 가 신설한 8 파일 fixture 는 무필터 `expect(logSpy).not.toHaveBeenCalled()` 형태라 같은 강화에서 전수 통과한다. 등록 시점에 존재하던 **선행 시대 fixture 와 신설 fixture 사이의 관측 강도 단층**은 TSK-20260825-06 으로 3 파일에서 해소됐고, `Search.test.tsx:218` 1건만 남았다.
   - 구조 게이트 G-F (`src/__tests__/post-unmount-emission-audit.test.ts:572`) 가 같은 부류를 문구가 아닌 **구조**로 잡도록 신설됐으나, 그 판정도 이 잔존 1건을 놓친다 — 상세는 §발화 채널 (B4).
4d. **(I10) 술어 구현의 표기 변형 내성** — 술어의 식별자 판정 패턴은 실코드에 존재하는 표기 변형을 포함한다. 최소 1건의 변형을 포함한 fixture 로 검증된다.
   - 실측: 훅 판정 `\buse[A-Z]\w*\s*\(` 는 `useState<boolean>(false)` 를 놓쳐 확장 표면을 **11** 로 냈다 (= 선행 술어와 동일 → 차집합 공집합 → "경계 문제 없음" 오보고). `(<[^()]*>)?` 교정 후 **12**. inspector tick 219 에서 양쪽을 모두 실행해 재현했다.
4. **(I4) wrapper 는 대상이 아니라 통과점** — `src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` 는 fetch 를 하지 않는 wrapper 이며(각 35/34/37 행, `await`/`fetch` 0 hit), 실제 fetch 는 `lazy` 로 가져오는 `*Item.jsx` 에 있다(각 `await` 2 hit). **wrapper 에 대한 0 hit 는 구현의 안전을 뜻하지 않는다.**
5. **(I5) 도메인 자동 충족 주장은 프로덕션 import 경로로 판정한다** — "React Query 를 쓰므로 자동 충족" 은 해당 훅이 **라우팅되는 컴포넌트에서 실제로 import 될 때만** 성립한다. 훅 파일의 존재나 `useQuery` grep hit 는 근거가 아니다.
   - 현 HEAD: `src/Log/hooks/useLogList.js` 의 프로덕션 import 0 (정의·자기 export 뿐), 라우팅 경로는 `src/Log/Log.jsx` → `lazy(() => import('./LogList'))` → `src/Log/LogList.jsx` 가 `./api` 의 `getLogs`/`getNextLogs` 를 직접 호출하는 raw fetch 다. Search (`src/Search/hooks/useSearchList.ts`) 는 `Search.tsx` 에서 실제로 소비된다.
6. **(I6) 판정 채널의 저장소 등재** — (M-A) 또는 (M-B) 가 자동 발화 경로 1+ 를 갖는다.
   - 최초 등록 시점(`414e66b`) 실측: 0 hit.
   - **현 HEAD(`a48339d`) 실측: 충족.** `src/__tests__/post-unmount-emission-audit.test.ts` (TSK-20260824-07-d / `eb8270a`) 가 G-A~G-E 5 게이트로 (M-A) 를 판정하며, `src/__tests__/**` 산하이므로 `npm test` 수집 → `ci.yml` Test step + `.husky/pre-push` 2 지점에서 발화한다. 대상 11 파일 전수가 형제 race fixture 를 보유한다 ((M-B)).

## 의존성

- 내부: 술어 대상 11 파일 (§동작 3), `src/common/common.ts` (`log`), `src/common/errorReporter.ts` (`reportError`), `src/setupTests.js` (전역 `afterEach` 의 `vi.restoreAllMocks()` — 이 시점 이후 도착한 발화는 spy 없이 실제 콘솔로 나간다).
- 외부: `@testing-library/react` (`unmount()`), `vitest`, `AbortController` 표준 (선택 수단), `@tanstack/react-query` (자동 충족 비교 대상).
- 역의존:
  - `console-error-runtime-zero` (testing) — 전역 `console.error` fail-fast 채널. 그 패턴 집합(`Failed prop type` / list key / cross-component update / hook order)에 post-unmount 발화는 **없다**. 본 축을 대신 검출하지 않는다.
  - `search-abort-runtime-smoke` (testing) — Search 타이머 cleanup. 직교.
  - `coverage-per-file-attribution-monotonicity` (foundation) — 가드 도입이 만드는 분기의 커버리지 귀속. 직교하되 §회귀 중점 R-4 로 연결.

## 회귀 중점

1. (R-1) 미가드 표면 확산 — 신규 컴포넌트가 가드 없이 async effect 를 등록. (M-A) 가 술어 기반이므로 목록 갱신 없이 잡힌다.
2. (R-2) 부분 가드 — setter 앞에만 가드를 두고 `log()` / `reportError()` 는 그대로 두는 회귀. (M-B) 의 console spy 단정이 검출 지점이다.
3. (R-3) wrapper 측정 회귀 — 구현이 lazy 로 분리된 상태에서 wrapper 만 측정해 0 hit 를 얻는 회귀. (I4)(M-A) 술어가 차단한다.
5. (R-5) 술어가 선언 범위보다 좁아짐 — 새 문법 형태(핸들러 async, top-level await, 커스텀 훅 내부 fetch)가 술어 밖으로 샌다. (I7) 이 차집합 공집합을 요구하므로 술어 확장 없이는 red 다.
6. (R-6) 관측기가 발화 종류를 못 덮음 — 대상 파일이 setter-only 로 리팩터링되면 기존 console spy fixture 는 조용히 민감도 0 이 된다. **코드가 나빠지지 않아도 게이트만 약해지는 부류**라 눈에 띄지 않는다. (I8) 이 겨눈다.
7. (R-7) 단정에 필터가 재도입됨 — "노이즈 억제" 명분의 정규식 필터가 무발화 단정 앞에 붙는 회귀. (I9) 가 차단한다.
4. (R-4) 가드 도입이 도달 불가 분기를 남김 — 선행 회복 시도(`2eddb50`)가 남긴 종료 가드의 true 분기 3건이 본질적 unreachable 이었고, 그것이 `branches 93.89% < 94` 로 revert 사유가 됐다. 회복 수단은 분기 증가를 최소화하거나 도입 분기가 fixture 로 도달 가능해야 한다. **본 항목은 회복 task 의 제약이며 spec 체크박스가 아니다** (§참고 §미측정·비판정 항목).

## 발화 채널

**채널 실재 — `src/__tests__/post-unmount-emission-audit.test.ts`** (TSK-20260824-07-d / `eb8270a`, 이후 TSK-20260825-05 `9b3f774` · -06 `8da63f6` 로 확장). 게이트 **6종**: G-A 대상 집합 술어 산출 · G-B 가드 보유 · G-C race fixture 존재 · G-D 관측 표면 정합 · G-E 두 술어 정합 · **G-F 무필터 단정** (`:572`). G-B/G-C/G-D 의 집행 대상은 TSK-20260825-05 에서 선행 술어 → **확장 술어**로 이관됐다. `src/__tests__/**` 산하라 `npm test` 수집 경로에 자동 등재되며 `ci.yml` Test step + `.husky/pre-push` 2 지점에서 발화한다 (`package.json`/`ci.yml` 무변경).

**채널의 검출력은 주입 왕복으로 확인한다** — 정상 트리의 초록은 민감도 0 인 채널도 낸다. 현 HEAD=`a48339d` inspector 재실측 (2 방향):

| 주입 | (M-A) grep | audit 채널 | 형제 race fixture |
|---|---|---|---|
| (D1) `ContentItem.jsx` 의 가드 식별자·guard return 전부 제거 | **rc=1** | **rc=1** (`가드 없는 async effect 표면:`) | **rc=1** (2 failed) |
| (D2) 부분 가드 — `log()` 만 가드 앞으로 이동 (setter 는 가드 안) | rc=0 | rc=0 | **rc=1** (`expected "log" to not be called at all, but actually been called 1 times`) |

**채널의 사각 3종 (본 판본 신규 박제).** 위 (D1)(D2) 는 채널이 *보는* 범위 안에서의 검출력이다. 그 범위 자체에 구멍이 있다:

| 사각 | 내용 | 겨누는 불변식 | HEAD=`8da63f6` |
|---|---|---|---|
| (B1) 대상 집합 | 술어가 `useEffect` 를 요구해 핸들러 async 전용 파일(`src/File/FileItem.tsx`)이 계수되지 않는다 | (I7) / FR-07·FR-08 | **해소** — 확장 술어가 집행 대상 (TSK-20260825-05) |
| (B2) 관측 강도 | setter-only 표면에서 `console` spy 단정이 항상 0 hit — 가드를 제거해도 통과 | (I8) / FR-10 | **해소** — setter recorder + 양방향 fixture (F2/F2b) |
| (B3) 필터 | 선행 시대 fixture 3건이 React 18 이 내지 않는 경고로 필터링한 뒤 0 을 단정 | (I9) / FR-09 | **부분 해소** — 3 파일 제거, 1건 잔존 ((B4)) |
| **(B4) 필터 판정의 선택자·영단정 어휘** *(inspector tick 220 신규)* | G-F 가 필터 형태를 `.filter(` **선택자 하나**로만 찾고, 영단정 어휘에 `toBeUndefined` 계열이 없다. `.find(...)` + `expect(x).toBeUndefined()` 조합은 통과한다 | (I9) / FR-09 | **해소** — 두 축 모두 deny-by-default 로 전환 (TSK-20260825-09 / `4bcfddf`) |
| **(B5) 필터 판정의 좁힘~단정 위상** *(inspector tick 221 신규)* | G-F 가 좁힘 토큰 **뒤로만** 400자 창을 열고 그 창의 첫 `expect(` 를 판정 대상으로 삼는다. 좁힘이 `expect(` **안에** 있는 인라인 형태는 창에 `expect(` 가 없어 "단정 없는 좁힘" 으로 분류돼 통과한다. 기록 식별 축(`spy.mock.calls` 직결 / `const x = spy.mock.calls` 별칭)은 deny 전환에서 제외돼 여전히 **열거**이므로 구조분해(`const { calls } = spy.mock`)도 샌다 | (I10) / FR-11 | **미해소** — 실물 0건이나 채널 부재 |

**(B4) 실측 (inspector tick 220).** G-F 판정 함수 `filteredEmissionZeroAssertions` (`post-unmount-emission-audit.test.ts:379`) 의 두 축을 형태별로 검사했다 — 선택자는 `:397` 의 `\b<record>\s*\.filter\s*\(` 로 **`.filter` 고정**이고, 영단정 어휘는 `:135` `RE_ZERO_ASSERT_NEAR` = `toBe(0)|toHaveLength(0)|not.toHaveBeenCalled|length === 0|toBeFalsy(` 다.

| 형태 | G-F 판정 | 비고 |
|---|---|---|
| `.filter(...)` + `toHaveLength(0)` | **검출** | 선언 형태 |
| `.find(...)` + `toBeUndefined()` | 미검출 | **`Search.test.tsx:218` 실존** — 선택자·어휘 **양쪽** 모두 밖 |
| `.some(...)` + `toBe(false)` | 미검출 | 선택자·어휘 양쪽 밖 |
| `.filter(...)` + `toBeUndefined()` | 미검출 | 선택자는 안, **어휘만** 밖 |
| 무필터 `not.toHaveBeenCalled()` | 미검출 (정상) | 위반 아님 |

두 원인은 **독립**이다 — 선택자만 넓혀도 `toBeUndefined` 조합은 여전히 새고, 어휘만 넓혀도 `.find`/`.some` 은 새는다. 확대 시 두 축을 함께 다뤄야 한다.

이 사각이 특히 값진 이유는 **G-F 가 바로 그 파일을 동기로 삼아 만들어졌다**는 데 있다 — 판정 함수 주석 `:373` 이 "`.includes('unmounted')` 변형을 놓쳤다 (실측 — `src/Search/Search.test.tsx`)" 라고 적고 있다. 문구 축은 구조로 옮겨 해결했으나 **선택자 축이 새로운 문구 축이 됐다.** 리터럴 열거를 구조 판정으로 바꿔도, 그 구조 판정이 다시 열거(선택자 1종·어휘 5종)이면 같은 부류의 사각이 한 단계 아래에서 재생산된다.

**(B5) 실측 (inspector tick 221).** 판정 함수 `filteredEmissionZeroAssertions` 를 현 HEAD 소스 그대로 추출해 형태별 입력으로 호출했다 (`result.md` 주장 미인용 — 함수 본문 직접 실행).

| 형태 | G-F 판정 | 비고 |
|---|---|---|
| `const w = spy.mock.calls.filter(…); expect(w.length).toBe(0)` | **검출** | 기존 양성 fixture (대조군) |
| `expect(spy.mock.calls.filter(…)).toHaveLength(0)` | **미검출** | 인라인 — 좁힘이 `expect(` 안 |
| `expect(spy.mock.calls.filter(…)).toEqual([])` | **미검출** | 인라인 |
| `expect(spy.mock.calls.find(…)).toBeUndefined()` | **미검출** | 인라인. `Search.test.tsx:218` 을 한 줄로 접기만 하면 이 형태다 |
| `const { calls } = spy.mock; calls.filter(…)` + 영단정 | **미검출** | 구조분해 별칭 — `RE_MOCK_CALLS_ALIAS` 밖 |

**원인은 deny-by-default 의 미적용 축 2개다.** TSK-20260825-09 는 (축 1) 좁힘 선택자와 (축 2) 영단정 어휘를 기본 위반으로 뒤집었으나, (축 3) **기록 표현식 식별**과 (축 4) **좁힘~단정 위상**은 그대로 열거·단방향으로 남았다. 특히 (축 4) 의 통과 경로는 의도된 것이다 — `nearestAssertion` 이 `null` 을 반환하면 "좁히기만 하고 단정하지 않는 코드" 로 보아 위반이 아니라고 판정한다 (음성 fixture 5). 인라인 형태는 **단정이 있는데도** 그 분기로 떨어진다.

**이것은 (B4) 와 같은 형태의 재생산이다.** 문구 열거 → 선택자 열거 → 위상 단방향. 축을 하나 뒤집을 때마다 남은 축이 새 사각이 된다. 그래서 FR-11 은 "인라인도 잡아라" 가 아니라 **판정이 좁힘~단정 관계를 위상 무관하게 본다** 를 요구하고, 검출 확인은 비열거성 probe 로 한다 ((Dir-E)).

**나머지 사각은 전부 "정상 트리에서 초록" 이다.** dry-run·재실행·CI 어느 것도 이들을 신고하지 않는다 — 민감도 0 게이트의 정의 그대로다 (`RULE-06 §게이트 실효 검증`).

**게이트 실효 검증의 이관처.** (B1)(B2)(B3) 을 닫는 게이트 수정 task 는 `## 검증/DoD` 에 아래 3 방향 주입을 명기하고 developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다 (`RULE-07 §처리` — 이관처 없는 강등 금지).

- (Dir-A 대상 집합 누락) 핸들러 전용 async 파일에 미가드 발화 1건 주입 → `rc≠0` + 그 경로 출력. 원복 → `rc=0`.
- (Dir-B setter-only 무관측) setter-only 표면의 가드 1건 제거 → race fixture `rc≠0`. console spy 만으로는 잡히지 않음을 같은 주입으로 대조 박제한다 (수정 전/후 rc 대조).
- (Dir-C 필터 우회) 무발화 단정 앞에 문구 필터를 재도입 → `rc≠0` (필터 재도입 자체가 FR-09 위반으로 검출).
- **(Dir-D 선택자 우회 — tick 220 신규)** (B4) 를 닫는 task 는 위 표의 미검출 3형태를 **각각** 주입해 `rc≠0` 을 확인한다. `RULE-06 §게이트 실효 검증` 의 "선언한 방향 수만큼 주입" 에 따라 선택자 축(`.find` / `.some`)과 영단정 어휘 축(`toBeUndefined` / `toBe(false)`)을 **분리 계수**한다 — 두 원인이 독립이므로 한 형태의 통과가 다른 축의 검출력을 보증하지 않는다. 게이트 자신의 양성 fixture(`:706`·`:714`·`:725`)에 형태별 1건을 추가하는 것이 자연스러운 부착점이다.
- **(Dir-E 위상·기록 우회 — tick 221 신규)** (B5) 를 닫는 task 는 **4 방향**을 각각 주입해 `rc≠0` 을 확인한다: (E1) 인라인 `expect(record.filter(…)).toHaveLength(0)`, (E2) 인라인 `expect(record.find(…)).toBeUndefined()`, (E3) 구조분해 별칭 경유 좁힘+영단정, (E4) **비열거성** — 판정 소스 어디에도 없는 메서드·매처 조합을 인라인으로 주입. (E4) 는 (B4) 의 양성 6 과 같은 취지로 "열거 확장이 아니라 전환" 임을 증명한다. 원복 후 전 방향 `rc=0`.

**두 층의 분업이 (D2) 에서 드러난다.** 정적 게이트((M-A)/audit)는 "가드 식별자가 파일에 있는가" 까지만 보므로 부분 가드를 통과시킨다 — (I2) 위반의 검출 지점은 (M-B) race fixture 의 무발화 단정이다. 어느 한 층만으로는 본 spec 이 성립하지 않으며, 그래서 FR-01(정적 표면)과 FR-03(대상 전수 fixture)이 **함께** Must 다.

## 테스트 현황

- [x] (M-A) 술어 audit 실행 가능 — HEAD=`8da63f6` 재실행 rc=0 / 미가드 0 파일 (등록 시점 rc=1 / 8 파일).
- [x] 기박제 3 도메인 fixture 실재 — `src/Image/ImageSelector.test.tsx` · `src/File/FileUpload.test.tsx` · `src/Monitor/VisitorMon.test.jsx` 가 `unmount()` 를 사용한다.
- [x] (M-A) rc=0 — **확장 술어 대상 12 파일** 전수 가드 보유 (TSK-20260824-07-a/-b/-c / `9c86492`·`290fcca`·`15de04c` + TSK-20260825-04 / `35f21fd`).
- [x] (M-B) 대상 전수의 unmount race fixture — **12/12** 파일이 형제 테스트에서 `unmount()` 왕복을 보유. `src/Log/LogList.test.jsx` 는 `15de04c` 로 신설됐다. 부분 가드 주입 시 `log` 무발화 단정이 검출한다 (§발화 채널 D2).
- [x] (M-C) 판정 채널 등재 — `src/__tests__/post-unmount-emission-audit.test.ts` (`eb8270a`, G-A~G-F 6 게이트), `npm test` 수집 경로 발화. HEAD=`8da63f6` 재실행 rc=0.
- [x] **(I7) 선언 범위 = 술어 대상** — HEAD=`8da63f6` 차집합 **공집합** (선행 12 / 확장 12). 집행 대상이 확장 술어로 이관됐다 (TSK-20260825-05 / `9b3f774`).
- [x] **(I1/FR-02) `src/File/FileItem.tsx` 의 핸들러 가드** — 가드 식별자 **9 hit** (등록 시점 0). TSK-20260825-04 / `35f21fd`.
- [x] **(M-B) `FileItem` 의 unmount race fixture** — `src/File/FileItem.test.tsx` `unmount()` **4 hit** (`:337`·`:380`·`:410`·`:435`), 케이스 F1/F1b/F1c(콘솔 계열) + F2/F2b(setter-only 양방향). 등록 시점 0 hit.
- [x] **(I8) setter-only 표면의 관측** — 계약 (M-B) 에 수단 박제 + fixture 실물 등재 (`FileItem.test.tsx:16` `vi.hoisted` 카운터 / `:18-28` `vi.mock('react')` wrapper / `:425` F2 무발화 · `:447` F2b 발화 확인).
- [x] **(I9) 무필터 단정** — 리터럴 층 0 (TSK-20260825-06) + 선택자 층 0 (TSK-20260825-09 / `4bcfddf`). 구조 게이트 G-F 는 열거에서 **deny-by-default** 로 전환됐다 (`RECORD_ACCESS_ALLOWLIST` 공집합 + 비열거성 probe). **다만 G-F 의 검출 표면은 아직 전체가 아니다 — 인라인 좁힘을 놓친다** (FR-11 / §발화 채널 (B5)).
- [ ] **(I10) 재도입 차단의 표면 완전성** — G-F 가 인라인 좁힘(`expect(spy.mock.calls.filter(…)).toHaveLength(0)`)·구조분해 별칭(`const { calls } = spy.mock`)을 검출하지 못한다. HEAD 트리에 해당 형태의 실물은 0건이나, 그 0 을 지키는 채널이 없다. FR-11 의 부착 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 주입·자기서술 부류는 §참고 §미측정·비판정 항목으로 강등했다. **HEAD=`6f58541` 기준 9/10 rc=0** — inspector tick 220 이 아홉 명령을 전수 재실행해 확인했다 (`result.md` 주장 미인용). 미충족 1건은 **FR-11** 이며, tick 221 이 G-F 판정 함수를 형태별로 직접 호출해 인라인 좁힘·구조분해 별칭 미검출을 관측한 결과 신설된 항목이다 (§발화 채널 (B5)). tick 220 의 미충족 항목이던 FR-09 는 TSK-20260825-09 착지로 충족됐고, 그 자리를 **같은 게이트의 한 층 위 사각**이 이어받은 형태다.
>
> **순서 의존이 있다** (역순 부착은 첫 실행부터 red): (FR-06 `FileItem` 가드) → (FR-07 술어 확장) 는 TSK-20260825-04 → -05 로 그 순서대로 착지했다. FR-09 도 같은 이유로 **필터 제거와 G-F 검출 확대를 한 task 로 묶어** 착지했다 (TSK-20260825-09). 남은 FR-11 은 **게이트 단독 task 다** — 트리에 인라인·구조분해 실물이 0건이라 판정 확대가 첫 실행부터 green 이며, 선행 제거 작업이 없다.

- [x] (Must, FR-01/FR-02) **effect 표면 한정** 미가드 0 — `bash -c 'test "$(for f in $(grep -rln "useEffect" --include="*.jsx" --include="*.tsx" src | grep -v "\.test\."); do grep -q "await \|\.then(" "$f" && ! grep -qE "cancelled|AbortController|isMounted|signal" "$f" && echo "$f"; done | wc -l)" -eq 0'` → rc=0. **HEAD=`a48339d` 실측 rc=0 / 미가드 0 파일** (착수 전 8 파일). 술어 대상 집합이 비면 공허하게 rc=0 이 되므로 vacuous-zero 를 별도 확인했다 — 대상 **11 파일** (0 아님). 역주입(`ContentItem.jsx` 가드 제거) 시 rc=1 + 파일 경로 출력. **본 명령은 파일 단위 토큰 존재만 보므로 부분 가드((I2) 위반) 는 통과시킨다 — 그 층은 FR-03 이 담당한다** (§발화 채널 D2).
- [x] (Must, FR-03) **effect 술어 대상** 파일마다 unmount race fixture 존재 — `bash -c 'n=0; for f in $(grep -rln "useEffect" --include="*.jsx" --include="*.tsx" src | grep -v "\.test\."); do grep -q "await \|\.then(" "$f" || continue; b="${f%.*}"; grep -lq "unmount()" "$b".test.jsx "$b".test.tsx 2>/dev/null || { echo "$f"; n=$((n+1)); }; done; exit $((n>0))'` → rc=0. **HEAD=`a48339d` 실측 rc=0 / 11 파일 전수 보유** (착수 전 8 파일 미보유). 이 fixture 층이 부분 가드를 잡는 유일한 지점이다 — `log()` 를 가드 밖으로 옮기는 주입에서 `ContentItem.test.jsx` 가 rc=1 (`expected "log" to not be called at all`) 로 검출했다.
- [x] (Must, FR-04) 판정 채널 등재 — `bash -c 'grep -qE "\"check:[a-z-]*unmount[a-z-]*\"" package.json || ls src/__tests__/*unmount* >/dev/null 2>&1'` → rc=0. **HEAD=`a48339d` 실측 rc=0** — `src/__tests__/post-unmount-emission-audit.test.ts` (TSK-20260824-07-d / `eb8270a`). 파일 실재만으로는 검출력이 서지 않으므로 가드 제거를 주입해 채널이 rc=1 을 내는 것을 확인했다 (§발화 채널 D1).
- [x] (Must, FR-05) 채널이 대상을 열거로 고정하지 않음 — unmount 판정에 관여하는 파일 **전수**에 대상 파일명 하드코딩 0: `bash -c 'n=0; for f in $(grep -rlE "unmount" scripts src/__tests__ 2>/dev/null); do grep -qE "ContentItem|ApiCallItem|WebVitalsItem|LogList|FileDrop" "$f" && { echo "$f"; n=$((n+1)); }; done; exit $((n>0))'` → rc=0. **HEAD=`a48339d` 실측 rc=0 / 대상 1 파일 (`post-unmount-emission-audit.test.ts`), 열거 hit 0.** 역주입(채널에 `ContentItem` 등 이름 열거 추가) 시 rc=1.
  - **구 명령의 `head -1` 을 제거했다** — 매칭 파일 중 첫 1건만 재는 형태는 채널이 2개 이상이 되는 순간 어느 파일을 쟀는지가 정렬 순서에 좌우된다. 현재는 매칭이 1건이라 두 형태의 판정이 일치하지만(주입 시 둘 다 rc=1 확인), 열거 고정은 **어느 채널 파일에서도** 금지이므로 전수 순회가 계약에 맞다.
- [x] (Must, FR-06) `src/File/FileItem.tsx` 의 async 핸들러가 unmount 가드를 보유 — `grep -cE "cancelled|AbortController|isMounted|signal" src/File/FileItem.tsx` → **1 이상**. **HEAD=`8da63f6` 실측 9 → 충족** (등록 시점 0). 토큰 존재만으로는 부분 가드를 통과시키므로 동작 층은 FR-10 이 함께 잡는다.
- [x] (Must, FR-07) 확장 술어의 미가드 표면 0 — §공개 인터페이스 (M-A) 의 확장 술어 블록 → **rc=0**. **HEAD=`8da63f6` 실측 rc=0 / 미가드 0 파일 → 충족** (등록 시점 rc=1 / 1 파일). vacuous-zero 를 함께 차단한다: 같은 루프의 **대상 집합 크기 ≥ 12** — 실측 **12** (0 아님, 공허 통과 아님).
- [x] (Must, FR-08) 선언 범위와 술어 대상의 차집합 공집합 — 확장 술어 대상과 선행(`useEffect` 요구) 술어 대상의 차집합이 회복 후에도 **계약상 대상 전수**임을 유지. 판정: 확장 술어 대상 수 ≥ 선행 술어 대상 수 이고, 확장 대상 전수가 FR-07 을 통과. **HEAD=`8da63f6` 실측 확장 12 · 선행 12 (12 ≥ 12) + FR-07 rc=0 → 충족** (등록 시점 12 vs 11, 차집합 미가드). 차집합이 닫힌 경위는 §동작 3b — 선행 술어의 구조적 한계가 제거된 것이 아니므로 집행 대상은 계속 확장 술어다.
- [x] (Must, FR-09) 도달 불가 필터 0 — **판정 명령은 2층이다** (inspector tick 220 교정. 종전 1층 명령은 리터럴 문구만 봐서 `.includes(...)` 변형을 놓쳤고, 그 결과 불변식이 위반된 상태에서 rc=0 을 냈다):
  ```
  bash -c 'grep -rn "update.*was not wrapped\|cannot update a component" src --include="*.test.tsx" --include="*.test.jsx" | grep -q . && exit 1;
           grep -rnE "\.mock\.calls[[:space:]]*\.(filter|find|some)[[:space:]]*\(.*includes\(.unmounted" src --include="*.test.tsx" --include="*.test.jsx" | grep -q . && exit 1;
           exit 0'
  ```
  **HEAD=`6f58541` 실측 rc=0 → 충족** (tick 220 시점 rc=1). 1층(리터럴) 0 line — TSK-20260825-06. 2층(선택자) 0 hit — TSK-20260825-09 (`4bcfddf`) 가 `src/Search/Search.test.tsx:218`·`:317` 의 `.find(...includes('unmounted')) + toBeUndefined()` 를 무필터 `expect(errorSpy).not.toHaveBeenCalled()` 로 교체했다. 2층은 정상 용례를 오탐하지 않음을 함께 확인했다 (`src/App.test.jsx:176-185` 의 `.mock.calls.filter(([event]) => ...)` 4건 미매치 — 이벤트 계수 용례라 좁힘-후-영단정이 아니다).
  - **관측 창 축소가 함께 들어왔다.** 교체된 단정은 무필터라 마운트 중 발화까지 세므로 `errorSpy.mockClear()` 를 `unmount()` 직전에 둔다. 이 축소는 계약이 규정한 관측 창(= unmount 이후)과 일치하며 민감도를 낮추지 않는다 — 창 밖 발화를 세지 않을 뿐 창 안 발화는 전수 계수한다. 무필터 단정을 도입하면서 창을 정의하지 않으면 첫 실행부터 red 가 되므로, **무필터화와 창 정의는 한 쌍**이다 (FR-11 이 이 쌍을 재도입 층에서 고정한다).
- [x] (Must, FR-10) `FileItem` 의 unmount race fixture 실재 — `grep -c "unmount()" src/File/FileItem.test.tsx` → **1 이상**, 그리고 `npx vitest run src/File/FileItem.test.tsx` → rc=0. **HEAD=`8da63f6` 실측 4 hit + rc=0 → 충족** (등록 시점 0). 관측기는 (I8) 대로 `log`/`reportError` spy **와** setter recorder 를 함께 둔다 — `copyFileUrl` 갈래는 setter-only 라 console spy 만으로는 민감도 0 이다. 실물: `:321` F1 · `:361` F1b(두 번째 await 경계) · `:395` F1c(catch 경로) 가 콘솔 계열, `:425` F2 가 setter 계열 무발화, `:447` F2b 가 마운트 상태의 setter **발화**를 단정해 관측기의 민감도를 세운다.
- [ ] (Must, FR-11) **재도입 차단의 표면 완전성** — 도달 불가 필터의 구조 판정이 좁힘~단정의 **위상**과 기록 표현식의 **표기**에 무관하다. 판정:
  ```
  bash -c 'npx vitest run src/__tests__/post-unmount-emission-audit.test.ts >/dev/null 2>&1 || exit 1;
           grep -qE "expect\(\s*[A-Za-z_]+\.mock\.calls\s*\.[A-Za-z]+\(" src/__tests__/post-unmount-emission-audit.test.ts || exit 1;
           grep -qE "const[[:space:]]*\{[^}]*calls[^}]*\}[[:space:]]*=" src/__tests__/post-unmount-emission-audit.test.ts || exit 1;
           exit 0'
  ```
  **HEAD=`6f58541` 실측 rc=1 → 미충족** — 채널은 rc=0 이나 두 grep 이 각각 **0 hit**. 판정을 "인라인·구조분해 형태를 **양성 fixture 로 보유한 채** 채널이 통과한다" 로 둔 이유는, 그 파일의 자가 검증이 이미 `expect(filteredEmissionZeroAssertions(fixture)).toContain(record)` 형태이기 때문이다 — fixture 실재 + 채널 rc=0 이 곧 검출 성립이다. fixture 없이 채널만 초록인 상태는 검출력 0 과 구별되지 않는다.
  - **토큰 grep 을 판정에 쓰지 않는 대안을 검토했고 기각했다.** `RECORD_ACCESS_ALLOWLIST` 나 `nearestAssertion` 의 본문 형태를 grep 하는 판정은 구현 수단을 지정하게 되고(§역할 (i)), 동시에 "그 토큰이 있으면 통과" 라 검출력과 무관해진다. 판정 대상은 **형태별 입력에 대한 판정 함수의 출력**이며 그것을 관측하는 유일한 채널이 자가 검증 fixture 다.
  - inspector tick 221 실측 근거는 §발화 채널 (B5) 표. 주입 4방향은 (Dir-E) 로 이관했다.

## 스코프 규칙

- **expansion**: 허용 — 회복이 컴포넌트 `*.jsx`/`*.tsx` + 대응 `*.test.{jsx,tsx}` + 신규 판정 채널(`scripts/` 또는 `src/__tests__/`) 을 동시에 건드린다. `src/Log/LogList.jsx` 는 테스트 파일 신규 생성이 필요하다. 공통 헬퍼(`src/common/`) 도입도 허용하되 수단은 지정하지 않는다.
- **grep-baseline** (HEAD=`414e66b`, 2026-08-24 실측 — **task 발행 시점 baseline. 현 HEAD=`a48339d` 재실측은 각 항목 말미 `→ 현재:` 로 병기**):
  - (G1) **[술어 대상 집합]** `for f in $(grep -rln "useEffect" --include="*.jsx" --include="*.tsx" src | grep -v "\.test\."); do grep -q "await \|\.then(" "$f" && echo "$f"; done` → **11 파일**. 가드 식별자(`cancelled|AbortController|isMounted|signal`) 보유 3 / 미보유 8. → 현재: 대상 **11 파일 불변**, 보유 **11** / 미보유 **0**.
  - (G2) **[미가드 8 파일]** `src/Monitor/ContentItem.jsx`, `src/Monitor/ApiCallItem.jsx`, `src/Monitor/WebVitalsItem.jsx`, `src/File/File.tsx`, `src/File/FileDrop.tsx`, `src/Comment/Comment.tsx`, `src/Log/LogList.jsx`, `src/Log/Writer.jsx`. `useEffect(` 등록 수 / `return () =>` cleanup 수: ContentItem 1/0, ApiCallItem 1/0, WebVitalsItem 1/0, File 4/0, FileDrop 2/1, Comment 5/1, LogList 7/0, Writer 5/2. **cleanup 이 존재하는 3 파일도 async effect 쪽 cleanup 은 아니다** (FileDrop/Comment/Writer 의 cleanup 은 인접 동기 effect 소속). → 현재: 8 파일 전수 회복 (TSK-20260824-07-a `9c86492` / -07-b `290fcca` / -07-c `15de04c`), 형제 race fixture 전수 보유.
  - (G3) **[wrapper 0 hit 반례]** `grep -cE "await |\.then\(" src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` → 각 **0**, 대응 `*Item.jsx` → 각 **2**. `grep -rnE "useEffect.*async|async\s*\(\s*\)\s*=>" src/Monitor/{ContentMon,ApiCallMon,WebVitalsMon}.jsx` → **0 hit, rc=1** (blue 가 `[x]` 근거로 삼은 그 명령).
  - (G4) **[프로덕션 React Query 소비]** `grep -rn "useLogList" src | grep -v "\.test\."` → **2 hit, 둘 다 `src/Log/hooks/useLogList.js` 자기 파일** (`:14` 정의, `:25` default export). 프로덕션 import 0.
  - (G5) **[판정 채널]** `grep -nE '"check:[a-z-]*unmount' package.json` → **0 hit**. `grep -rln "unmount()" src --include="*.test.*"` → 8 파일이나 미가드 8 파일과 교집합 0. → 현재: 판정 채널 `src/__tests__/post-unmount-emission-audit.test.ts` 실재 (`eb8270a`), 술어 대상 11 파일과 race fixture 의 교집합 **11/11**.
- **rationale**: (G1)(G2) 회복 대상의 zero-point. (G3) 은 열거 고정 게이트가 어떻게 false-negative 를 내는지의 반례 — RULE-06 §열거 고정 금지 / §관측 표면 의 실사례다. (G4) 는 "훅 존재 = 자동 충족" 추론의 반례. (G5) 는 채널 부재.

## 참고

- **REQ 원문**: `specs/60.done/2026/08/24/req/20260824-post-unmount-async-effect-emission-zero.md` (REQ-20260824-002), `specs/60.done/2026/05/17/req/` (REQ-20260517-093, 최초).
- **선행 회복 시도 (revert 됨)**: `TSK-20260520-01-monitor-items-fetch-unmount-safety` — `2eddb50` → `fcb062e`. 단일 차단 사유 `branches 93.89% < 94`. followup: `specs/60.done/2026/05/20/followups/20260519-2240-TSK-20260520-01-monitor-items-fetch-unmount-safety-from-blocked.md`.
- **관측 이력 (teardown 경합)**: `specs/60.done/2026/08/24/followups/20260824-1330-vitest-worker-teardown-unhandled-rejection.md` — CI run `32689865968` (sha `7912860`) attempt 1 failure / attempt 2 success, 코드 변경 0. `EnvironmentTeardownError: [vitest-worker]: Closing rpc while "onUserConsoleLog" was pending`, 귀속 `src/Monitor/Monitor.test.jsx`.

### 선언 범위 정정 (inspector tick 219 — 원 req 의 진단 교정)

REQ-20260825-002 는 이 결함을 "**선언 범위보다 측정 표면이 좁다**" 로 진단하고 선행 판본 `:11` 을 "어떤 외부 발화도 하지 않는다" 는 무제한 선언으로 인용했다. **그 인용은 문장을 절반만 읽은 것이다.** 해당 문장의 주어는 "프로덕션 컴포넌트의 `useEffect` **본문에서** `await` 이후에 실행되는 코드" 이고, `## 동작` (I1) 도 동일하게 effect 로 한정한다. 즉 선행 판본에서는 **선언과 측정이 서로 정합했다** — 둘 다 effect 표면 한정이었다.

따라서 실제 결함은 범위 불일치가 아니라 **선언 자체가 위험보다 좁다** 는 것이다. 이 구분은 수사가 아니라 작업 지시를 바꾼다:

- 원 진단대로면 할 일은 술어 확장 1건이다 (문서는 이미 옳으므로).
- 실제로는 **§역할 선언 · §동작 (I1) · 술어 · fixture 를 함께** 넓혀야 하며, 그 중 하나만 넓히면 다시 선언·측정 불일치가 생긴다.

본 판본은 그래서 §역할과 (I1) 의 주어를 async continuation 일반으로 넓히고 (I7) 로 "선언 범위 = 술어 대상" 을 **불변식으로 승격**했다. 확장 근거는 §역할 관측 표면 1·2·3 이 발화 지점의 문법적 위치에 의존하지 않는다는 것이며, `src/File/FileItem.tsx` 가 그 반례를 실물로 제공한다.

원 req 의 나머지 진단(결함 2·3·4)은 전부 독립 재현됐다 — 차집합 1 파일, 필터 3 파일 / 10 line, TS 타입 인자 누락 시 11 vs 교정 후 12.

### blue baseline 정정 요구 (운영자 판단 근거)

현 blue 판본(동일 slug `runtime-fetch-unmount-safety`)은 아래 marker 를 `[x]` 로 유지한다. 전부 **현 HEAD 에서 거짓이거나 공허**하다.

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

**현 HEAD=`a48339d` 상태**: 위 표의 실측 근거는 전부 해소됐다 (미가드 8 → 0, 판정 채널 실재, `LogList` raw fetch 도 가드 + fixture 보유). 그러나 **blue 문서 자체는 여전히 거짓 근거로 `[x]` 를 유지한다** — inspector 는 blue 를 편집하지 않으므로 (RULE-01), 정정은 위 경로 1(본 green 의 승격) 로만 이뤄진다. 본 green 은 §수용 기준 4/4 rc=0 이므로 경로 1 의 선행 조건은 충족됐다.

### 미측정·비판정 항목

RULE-07 §수용 기준 문장 규약에 따라 체크박스에서 강등한 항목 (감사성 보존, promote 비차단).

- **(주입 부류 — 이관 완료) 미가드 상태 주입 시 rc≠0.** **이관처 소화: TSK-20260824-07-d / `eb8270a` DoD (`injection: 2/2 detect`)**, 선행 회복 3 task 도 각각 주입을 박제했다 (07-a 12/12, 07-b 24/24, 07-c 전역 미가드 술어 8→0). inspector tick 217 재주입으로 두 방향을 독립 재현했다 — (D1) 가드 제거 → (M-A)·audit·fixture 3층 전부 rc=1, (D2) 부분 가드 → fixture 만 rc=1 (§발화 채널 표).
- **(미측정 NFR) `npm test` 의 unhandled error 0.** 원 req FR-06 이 요구한 "`Errors N errors` 행 부재 + rc=0" 은 (a) 현 HEAD 에서 이미 참인 실행이 있고 (b) 실패가 간헐적이라 1회 실행으로 판정되지 않는다 — "N 회 반복 동일 출력" 부류. 또한 `npm test` rc 는 이미 CI 게이트이므로 체크박스로 두면 중복 게이트다. 본 spec 의 판정 축은 발화 자체((M-A)(M-B))이고, teardown 경합은 그 **증상**으로 §역할 관측 표면 2 에 보존한다.
- **(회복 task 제약) 도달 불가 분기 0.** §회귀 중점 R-4. "가드가 만드는 신규 분기가 도달 불가를 남기지 않는다" 는 회복 수단에 대한 제약이며 시스템 불변식이 아니다. **이관처: 회복 task 의 DoD** — 도입 분기가 fixture 로 도달되거나 분기 증가 0 임을 `result.md` 에 박제한다.
- **(중복 게이트 부류) 회복 후 테스트 회귀 0.** "가드·fixture 추가 후 `npm test` rc=0" 은 현 HEAD 에서 이미 참이고, 위반 시 `.github/workflows/ci.yml` Test step 이 즉시 실패한다 — RULE-07 §반려 시그널의 중복 게이트다. 회복 task 의 DoD 에서 다루고 본 spec 체크박스로 두지 않는다.
- **(자명·자기서술 부류)** 구 blue 의 (I8)(I9)(NFR-01~NFR-08) — 본 spec 본문에 대한 자기 grep, writer 영역 정합, 직교 cross-ref 존재 확인. 판정 대상이 시스템이 아니라 문서다. §의존성·§스코프 규칙에 평서문으로 보존한다.
- **(주입 부류 — 이관 표기) (B1)(B2)(B3)(B4) 사각의 검출력.** "위반 1건 주입 → `rc≠0` → 원복 → `rc=0`" 은 '가정 주입 요구' 부류라 체크박스로 두지 않는다. **검출 방향을 보존한 채 §발화 채널 §게이트 실효 검증의 이관처 (Dir-A)(Dir-B)(Dir-C)(Dir-D) 로 이관했다** — planner 가 발행하는 게이트 수정 task 의 DoD 가 귀속처다. (Dir-A)(Dir-B) 는 TSK-20260825-04·05 에서 각 `injection: 2/2 detect` 로 소화됐고, **(Dir-D) 는 미발행 상태다** — (B4) 를 닫는 task 가 귀속처이며 이관처 없는 강등이 되지 않도록 여기에 명시한다.
- **G-F 판정의 선택자·어휘 확대 자체.** 어느 선택자·어휘까지 검출 선언에 넣을지는 게이트 설계 결정이며 시스템 불변식이 아니다. 본 spec 이 요구하는 것은 (I9) — 도달 불가 필터 0 — 이고, 그 수단은 게이트 수정 task 가 정한다. 다만 **현 선언이 실존 위반 1건을 놓친다는 사실**은 불변식 판정에 직결되므로 §발화 채널 (B4) 에 실측으로 박제했다.
- **선행 시대 fixture 3건의 현 민감도.** 각 파일의 가드를 1건씩 제거했을 때 `rc≠0` 이 되는지는 미측정이다 — (I9) 의 필터 정규식만으로 "단정 대상 0" 이 증명되므로 필터 제거의 근거로는 충분하나, 제거 **후** 의 민감도는 위 이관처 task 에서 판정된다.
- **콘솔류 발화 계수의 정합.** 원 req 의 12 / 9 / 6 과 inspector 실측 11 / 11 / 6 이 어긋난다 (§동작 (I9)). 원 req 의 산출 명령이 기록되지 않아 재현 불가이며, (I9) 판정은 계수가 아니라 필터 존재로 이뤄지므로 계약에 영향이 없다. 계수 축이 필요해지면 별도 측정 채널이 선행돼야 한다.
- **`src/Log/hooks/useLogList.js` 미사용 훅의 존폐.** 본 spec 은 프로덕션 경로 판정((I5))만 하고 훅 삭제·연결은 판단하지 않는다 (별 축).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | TSK-20260825-04 `35f21fd` · -05 `9b3f774` · -06 `8da63f6` (inspector tick 220 Phase 1) | **drift reconcile — 수용 기준 4/9 → 8/9, 테스트 현황 4건 플립.** 아홉 명령을 HEAD=`8da63f6` 에서 전수 재실행했다 (`result.md` 주장 미인용): FR-06 가드 식별자 0 → **9** / FR-07 확장 술어 rc=1 → **rc=0**, 대상 12 (공허 아님) / FR-08 차집합 1 → **공집합** (확장 12 · 선행 12) / FR-10 `unmount()` 0 → **4 hit** + rc=0. (B1)(B2) 사각 해소를 §발화 채널 표에 상태열로 박제하고, 차집합이 닫힌 **경위**를 §동작 3b 에 남겼다 — `FileItem` 이 가드와 함께 `useEffect` 를 들여와 선행 술어 쪽이 11→12 로 늘어난 결과이므로 선행 술어의 구조적 한계는 그대로다. **FR-09 는 플립하지 않았다.** 종전 판정 명령(리터럴 문구 grep)은 HEAD 에서 0 line 을 내지만, 같은 부류가 `src/Search/Search.test.tsx:218` 에 `.find(...includes('unmounted'))` + `toBeUndefined()` 형태로 살아 있다 — **명령이 불변식보다 좁아 위반 상태에서 rc=0 을 내던 것**이라 명령을 2층(리터럴 + 선택자)으로 교정했고 교정 후 rc=1 로 미충족이 확정됐다. 오탐 부재도 함께 확인했다(`App.test.jsx:176-185` 정상 `.filter` 4건 미매치). **신규 사각 (B4) 박제** — 구조 게이트 G-F 가 선택자를 `.filter` 하나로 고정(`post-unmount-emission-audit.test.ts:397`)하고 영단정 어휘(`:135`)에 `toBeUndefined` 계열이 없어 그 잔존 1건을 놓친다. 형태별 실측표(4형태 미검출 / 선언 형태만 검출)를 §발화 채널에 넣고 주입 방향 (Dir-D) 를 신설해 게이트 수정 task DoD 로 이관했다. 문구 열거를 구조 판정으로 바꿔도 그 구조 판정이 다시 열거이면 같은 사각이 한 단계 아래에서 재생산된다는 것이 이번 관측의 요지다. | §위치 + §동작 3·3b·4b·4c + §발화 채널 + §테스트 현황 + §수용 기준 + §참고 |
| 2026-08-25 | REQ-20260825-002 (inspector tick 219 흡수) | **spec→spec 참조를 slug 식별로 교체.** 본 판본의 cross-ref 5건이 `specs/30.spec/{blue,green}/...md` 전체 경로였다. 그 표기는 승격마다 끊긴다 — 실제로 본 tick 중 `coverage-per-file-attribution-monotonicity` 가 blue 로 승격되면서(`f014ddf`) 참조 2건이 즉시 stale 이 됐다. spec↔spec 참조는 무검증 구역이라(`check-spec-coherence.sh:8` 스코프 `src/**` 한정, `:41` G2 는 전체 경로만 추출) 파이프라인이 붉어지지 않고 조용히 끊긴다. slug 는 이동에 불변이고, `src/**` 안에 같은 표기가 쓰였을 때 G2 가 `MISSING` 으로 pre-commit 을 막는 부작용도 없다. | §위치 + §역할 + §의존성 + §참고 |
| 2026-08-25 | REQ-20260825-002 (inspector tick 219 흡수) | **선언 범위 확장 + 측정 표면 3 사각 박제. 신규 Must 5건(FR-06~FR-10) `[ ]`.** followup 4건(`2055`·`2125`·`2139`·`2140`)을 통합한 req 를 흡수했다. **원 req 의 진단을 교정했다** — req 는 "선언 범위 > 측정 표면" 으로 봤으나 선행 판본은 선언(`:11` · (I1))도 `useEffect` 한정이라 둘이 정합했다. 실제 결함은 **선언 자체가 위험보다 좁다** 는 것이고, 이 차이가 작업 범위를 바꾼다 (술어 1건 확장 → §역할·(I1)·술어·fixture 동시 확장). §역할과 (I1) 의 주어를 async continuation 일반으로 넓히고 (I7)~(I10) 을 신설했다. 실측 전수 재현: 확장 술어 대상 **12** vs 선행 **11**, 차집합 **`src/File/FileItem.tsx`** (useEffect 0 · 가드 0 · 콘솔류 발화 6 · `unmount()` fixture 0), 도달 불가 필터 **3 파일 / 10 line**, TS 타입 인자 `(<[^()]*>)?` 누락 시 확장 표면이 11 로 붕괴해 차집합이 공집합으로 오보고되는 것까지 재현했다. React 버전 표기도 정정 — 선행 판본의 "React 19" 는 현 HEAD `18.2.0` 이며 18.2 도 `enqueueConcurrentHookUpdate` 의 `root === null` 경로에서 **경고 없이** bail out 한다 (`react-dom.development.js:17523-17529` 실측). 그 침묵이 (I8) setter-only 무관측의 원인이므로 버전 정정은 표기가 아니라 논거다. 기존 `[x]` 4건은 **effect 표면 한정** 측정으로서 참이므로 유지하되 한정어를 명시했다 — 확장 범위를 잰 것으로 오독되면 마커 재배치와 같아진다. 주입 3방향은 게이트 수정 task DoD 로 이관했다. 순서 의존(FileItem 가드 → 술어 확장 / 필터 제거 → 강도 상향)을 §수용 기준 머리말에 박제했다. | §역할 + §공개 인터페이스 + §동작 1·3b·4b·4c·4d + §회귀 중점 R-5~R-7 + §발화 채널 + §테스트 현황 + §수용 기준 + §참고 |
| 2026-08-24 | TSK-20260824-07-a / `9c86492` · -07-b / `290fcca` · -07-c / `15de04c` · -07-d / `eb8270a` (inspector Phase 1 reconcile @ tick 217) | **FR-01~FR-05 · (M-A)(M-B)(M-C) `[ ]` → `[x]`.** 미가드 8 파일이 3 task 로 전수 회복되고(Monitor 3 → File 2 + Comment 1 → Log 2, `LogList.test.jsx` 신설), 판정 채널 `src/__tests__/post-unmount-emission-audit.test.ts` 가 부착됐다(G-A~G-E 5 게이트, `npm test` 수집 발화). planner 실측을 받아쓰지 않고 4/4 를 현 HEAD 에서 재실행한 뒤 2 방향을 역주입했다 — (D1) `ContentItem.jsx` 의 가드 식별자·guard return 제거 → (M-A) grep rc=1 · audit 채널 rc=1 · 형제 fixture rc=1 (3층 전부 검출), (D2) `log()` 만 가드 앞으로 이동한 부분 가드 → 정적 2층은 통과하고 **fixture 만 rc=1** (`expected "log" to not be called at all, but actually been called 1 times`). **(D2) 가 FR-01 과 FR-03 의 분업을 확정했다** — 파일 단위 토큰 게이트는 (I2) 위반을 구조적으로 못 잡으므로 두 Must 는 어느 하나로 대체될 수 없다. 이 분업을 §발화 채널에 표로 박제했다. 아울러 FR-05 명령의 `head -1` 을 전수 순회로 교체했다 — 채널이 2개 이상이 되면 정렬 순서가 판정을 좌우한다. §역할·§동작 3·6 의 "현 HEAD 실측" 문구는 등록 시점 표기로 내리고 현 HEAD 실측을 병기했다. | §역할 + §동작 3·6 + §발화 채널 + §테스트 현황 + §수용 기준 + §스코프 규칙 + §참고 |
| 2026-08-25 | inspector tick 221 / HEAD=`6f58541` (TSK-20260825-09 `4bcfddf`) | **FR-09 충족 플립 + FR-11 신설.** 2층 판정 명령 재실행 rc=0 — 리터럴 0 line · 선택자 0 hit (`Search.test.tsx:218`·`:317` 이 무필터 단정으로 교체). G-F 는 열거에서 deny-by-default 로 전환됐고 (B4) 가 해소됐다. **동시에 새 사각 (B5) 를 실측 발견했다** — 판정 함수를 현 HEAD 소스 그대로 추출해 형태별로 호출한 결과, 인라인 좁힘(`expect(record.filter(…)).toHaveLength(0)`) 3형태와 구조분해 별칭 1형태를 **전부 미검출**했다 (대조군 별칭 형태는 검출). 원인은 `nearestAssertion` 이 좁힘 토큰 **뒤로만** 창을 열어 인라인 형태가 "단정 없는 좁힘" 음성 분기로 떨어지는 것과, 기록 식별 축이 deny 전환에서 제외돼 열거로 남은 것 2개다. 트리에 실물은 0건이라 FR-09 자체는 충족이나 **재도입 차단이 성립하지 않으므로** FR-11 로 분리 박제하고 주입 4방향을 (Dir-E) 로 이관했다. |
| 2026-08-24 | inspector tick (REQ-20260824-002 흡수) / HEAD=`414e66b` | **거짓 `[x]` 되돌림 + 대상 집합 술어화 + 보장 대상 확장.** blue 의 (I4)(I5)(Should FR-05) 는 `*Mon.jsx` wrapper 3 파일을 측정해 0 hit 를 얻고 "race 노출 0" 으로 닫혔으나, 실제 fetch 는 `*Item.jsx` 에 있고 세 파일 모두 미가드다. 술어 도출((I3))로 재측정한 결과 미가드 **8 파일** — Monitor 3 + File 2 + Comment 1 + Log 2. "Log = React Query 자동 충족" 전제도 거짓 (`useLogList` 프로덕션 import 0). 보장 대상을 setter 에서 `log()`·`reportError()` 를 포함한 외부 발화 전부로 확장((I2)). 구 §수용 기준 25 marker 중 자기서술·자명 부류는 §참고 §미측정·비판정 항목으로 강등하고, 실행 가능한 Must 6건으로 교체했다. 주입 부류는 채널 부착 task DoD 로 이관 표기. | all |
| 2026-05-20 | inspector 203차 tick / `fed31ba` | (I4)+(I7)+(Should FR-05) 3 marker 플립. **(I4)/(FR-05) 근거는 본 개정에서 무효화됐다** — 위 2026-08-24 행 참조. (I7) fixture 박제 (Image/File/VisitorMon 3 도메인) 는 유효. | 테스트 현황, 수용 기준 |
| 2026-05-18 | inspector 67차 tick / `760a491` | (I3)+(I6)+(FR-03)+(FR-04) 플립 — `VisitorMon.jsx` cancelled-flag ref 박제 회수. 유효. | 테스트 현황, 수용 기준 |
| 2026-05-17 | inspector (REQ-20260517-093 흡수) / `cac6fa2` | 최초 박제 — Image/File/Monitor 3 도메인 unmount-safety 비대칭 해소. | all |
