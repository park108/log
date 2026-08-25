# Monitor 컴포넌트 (관리자 대시보드)

> **위치**: `src/Monitor/` (Monitor.jsx, ContentMon.jsx, ContentItem.jsx, ApiCallMon.jsx, ApiCallItem.jsx, WebVitalsMon.jsx, WebVitalsItem.jsx, VisitorMon.jsx, api.js, api.mock.js, Monitor.css)
> **관련 요구사항**: — (셸 축은 as-is 서술) / REQ-20260825-001 (파생 state 축)
> **최종 업데이트**: 2026-08-25 (by operator — `monitor-derived-state-immutability` 병합. `components/` 는 구현 단위 1:1 이므로 같은 스코프(`src/Monitor/**`)의 계약을 별 파일로 두지 않는다)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (셸 축 2026-04-20 · 파생 state 축 `8da63f6`).

## 역할

`/monitor` 페이지. 관리자 전용 지표 대시보드 셸. 마운트 시 `setHtmlTitle("monitor")`, `setFullscreen(true)` 를 실행하고, 언마운트 시 `setFullscreen(false)` 로 원복한다. 4개 패널을 순서대로 렌더: `ContentMon` (콘텐츠 통계), `ApiCallMon` (API 호출 히트맵), `WebVitalsMon` (CLS/FID/LCP/INP/FCP/TTFB), `VisitorMon` (방문자 추이). 각 패널은 lazy 로드되며 `Suspense` 로 감싸져 있다. 히트맵 색상은 모듈 상수 `CHART_PALLETS` (Red-to-Green / Olive) 를 패널별로 주입.

아울러 이 영역의 컴포넌트가 `useState` 로 보유한 **객체 state 는 in-place 로 변이되지 않고 새 참조로 교체**되며, 교체 객체는 **렌더 경로가 읽는 필드를 전수 포함**한다.

뒤의 두 명제는 하나의 사슬이다. in-place 변이는 "빠진 필드"를 **은폐**한다 — 기존 객체를 그대로 두고 일부 키만 덮어쓰므로, 갱신 경로가 어떤 키를 잊어도 그 키는 초기값을 단 채 살아남아 화면에 표시된다. 새 객체를 조립했다면 같은 누락이 `undefined` 로 즉시 드러난다. 따라서 불변 교체(G-1)는 완전성(G-3)의 **검출 수단**이고, 사용자 관측 동작(G-2)은 그 사슬이 끊겼을 때 나타나는 **증상**이다.

파생 state 축은 `RULE-07 §주제 우선순위` **1순위 (사용자 관측 가능 동작)** 귀속이다. 등록 시점(`1c9f94d`)에 이 사슬은 실제로 끊겨 있었고, **HEAD=`8da63f6` 에서 복구됐다** — TSK-20260825-02·03 착지 (§변경 이력).

파생 state 축이 의도적으로 하지 않는 것:
- (i) unmount 후 발화 차단 — `cancelled` ref 가드는 이미 도입돼 있고 (`WebVitalsItem.jsx:50,:132`) 본 축과 독립이다. `useRef` 의 `.current` 대입은 **변이가 아니다** — ref 는 렌더를 유발하지 않는 가변 상자이며 대상이 아니다.
- (ii) fetch 응답으로 받은 **지역 배열·객체**의 변이 (`ApiCallItem.jsx:80-81` `item.date = ...`, `VisitorMon.jsx:63-64,:90`, `ContentItem.jsx:102`). 이들은 state 가 아니라 set 직전에 조립되는 지역값이므로 참조 동일성 문제가 없다.
- (iii) Monitor 이외 영역(Log/Image/Search/Comment)으로의 확대 — 위반 0 이 확인된 영역까지 스코프를 넓히지 않는다.
- (iv) `useMemo`·reducer 도입 여부 등 **구현 수단** 선택 — planner·developer 영역. 결과 계약만 박제한다.

## 공개 인터페이스

- `Monitor` (default export).
  - props: `{ contentHeight?: object }`.
- 하위 패널 기본 export: `ContentMon`, `ApiCallMon`, `WebVitalsMon`, `VisitorMon`.
  - 모두 `{ stackPallet?: Array<{color, backgroundColor}> }` 를 받을 수 있으며, `WebVitalsMon` 만 props 없이 렌더.
- 하위 아이템 기본 export: `ContentItem`, `ApiCallItem`, `WebVitalsItem`.
- API 모듈 (`src/Monitor/api.js`): 패널별 GET 엔드포인트 (`getVisitors`, `getApiCalls`, `getContents`, `getWebVitals` 등 — 구현 파일 기준).

파생 state 축은 공개 인터페이스를 갖지 않는다 (내부 state 관리 계약). 관측 표면은 `WebVitalsItem` 이 렌더하는 지표 헤더 텍스트 `"<description> (<totalCount>)"` (`WebVitalsItem.jsx:194`) 와 평가 라벨 (`:195`) 이다.

## 동작

### 페이지 셸

1. 마운트 시 `isAdmin()=false` 이면 즉시 `/log` 로 리다이렉트하고 타이틀·fullscreen 설정을 스킵.
2. admin 이면 `setHtmlTitle("monitor")`, `setFullscreen(true)` 후 4개 패널을 렌더.
3. 언마운트 시 `setFullscreen(false)` 를 호출하여 루트 class 를 기본으로 복원.
4. `CHART_PALLETS[0]` (Red to Green) 은 `ApiCallMon` 에, `CHART_PALLETS[1]` (Olive) 은 `ContentMon` · `VisitorMon` 에 주입. `WebVitalsMon` 은 자체 색을 사용.
5. 각 패널은 내부적으로 자체 페치/집계/차트 렌더 루프 (CSS 그리드 + 숫자 타일) 를 보유.

### 파생 state 계약

최소 재현 사례는 `src/Monitor/WebVitalsItem.jsx` 의 `evaluationResult` (등록 시점 `1c9f94d`: `useState` 초기값 `:29` · in-place 대입 `:83-105` · 동일 참조 set `:108` · 렌더 소비 `:175`. HEAD=`8da63f6`: 팩토리 `:22` · 순수 조립 `:36` · 교체 set `:125` · 렌더 소비 `:194`). 준수 대조군은 `src/Monitor/ApiCallItem.jsx:100` `setRateColor({ ... })`.

1. **(G-1) 파생 state 의 불변 교체** — `src/Monitor/**` 의 컴포넌트는 `useState` 로 선언한 식별자를 좌변 루트로 갖는 속성 대입(`state.x = ...` / `state.x.y = ...`)을 하지 않는다. 갱신은 항상 새 객체 리터럴을 `set*` 에 전달한다.
   - 판정 (파일별 `useState` 바인딩명을 **열거하지 않고 도출**한다 — RULE-06 §열거 고정 금지):
     ```
     for f in $(find src/Monitor -name '*.jsx' ! -name '*.test.jsx' | sort); do
       grep -oE 'const \[[A-Za-z_$][A-Za-z0-9_$]*' "$f" | sed 's/const \[//' | sort -u \
       | while IFS= read -r id; do
           [ -n "$id" ] && grep -nE "^[[:space:]]*${id}(\.[A-Za-z0-9_\$]+)+[[:space:]]*=[^=]" "$f" \
             | sed "s|^|${f}:|"
         done
     done
     ```
   - **HEAD=`8da63f6` 실측: 0 line — 충족.** 등록 시점 `1c9f94d` 는 13 line 위반이었고 전량 `src/Monitor/WebVitalsItem.jsx` 의 `evaluationResult` (`:83~:105`) 였다. TSK-20260825-02 가 순수 조립 함수 `buildEvaluationResult` (`WebVitalsItem.jsx:36`) + 팩토리 `createInitialEvaluationResult` (`:22`) 로 교체해 in-place 대입이 소거됐다. 스캔 8개 `.jsx` 전부 0 line.
   - **검출 경계 (과신 금지)** — 게이트 `scripts/check-monitor-state-immutability.sh` 가 검출 방향을 헤더에 선언한다. 등록 시점 "미매치" 였던 대괄호 표기·`Object.assign` 은 게이트 신설로 **검출 범위에 편입**됐고, inspector tick 220 이 실측 신규 발견한 복합 대입 `+=` · 증감 `++` · 논리 대입 `||=` · 배열 변이 메서드 `.push()` 4형태는 TSK-20260825-10 (`d672a28`) 이 검출 방향을 확대해 흡수했다. 남은 미선언 형태(멀티라인 대입 · 별칭 경유 변이)는 게이트 헤더에 **기록된 채로** 미검출이다 — 선언과 구현의 불일치가 아니라 선언된 경계다. 게이트는 선언·구현 정합 자가 단언을 내장해 **미검출일지언정 미기록일 수 없다** (§발화 채널).
2. **(G-2) 지표 헤더 카운트의 응답 반영** — `WebVitalsItem` 헤더는 응답 `body.Items` 중 `evaluation` 이 `GOOD` · `POOR` · `NEEDS IMPROVEMENT` 인 항목 수의 **합**을 표시한다. 그 밖의 `evaluation` 값은 세지 않는다. 응답이 비었을 때만 `0` 이다.
   - **HEAD=`8da63f6` 실측: 충족.** 등록 시점에는 헤더가 응답과 무관하게 영구 `(0)` 이었다 — `totalCount` 가 지역 `const` 로만 계산돼 `useState` 초기값 `0` 이 그대로 렌더됐다. 현재는 `buildEvaluationResult` 가 `totalCount` 를 포함한 새 객체를 조립하고 (`WebVitalsItem.jsx:125` `setEvaluationResult(buildEvaluationResult(...))`) `:194` 가 그 값을 렌더한다.
   - 등록 시점 테스트가 놓친 이유: `WebVitalsItem.test.jsx` 에 헤더 카운트 단언이 **0건**이고 `totalCount` 낱말이 등장하는 유일한 지점이 케이스명 `empty result set (totalCount = 0)` 였다 — **0 을 기대하는 경로만 존재**해 영구 0 결함이 통과했다. TSK-20260825-02 가 비어있지 않은 응답의 헤더 단언을 추가해 이 비대칭을 해소했다.
   - 판별 픽스처: `webVitalsProd` (`src/Monitor/__fixtures__/monitor.js:3`) 는 `Items` 4건 중 1건이 `"BAD DATA"` 라 **기대 카운트가 `Items.length`(4) 가 아니라 3** 이다. 이 픽스처는 "응답 항목 수" 와 "평가 항목 수" 를 구분하므로 G-2 의 판별력이 있다.
3. **(G-3) 교체 객체의 렌더 필드 완전성** — `set*` 에 전달되는 파생 객체의 키 집합은 `useState` 초기값의 키 집합을 **포함**한다. 갱신 경로가 잊은 키가 초기값을 단 채 렌더 표면에 남는 상태를 허용하지 않는다.
   - 이것이 `totalCount` 부류의 **재발 방지 축**이다. G-2 는 이미 알려진 1개 필드를 고정하지만, G-3 은 아직 추가되지 않은 필드까지 덮는다.
   - 판정은 정적 grep 으로 불가하다 (객체 조립은 런타임 값). 테스트로 박제한다 — §수용 기준 (G-3).
4. **(G-4) effect deps 의 자기 참조 배제** — fetch effect 의 deps 배열은 **그 effect 자신이 갱신하는 state** 를 포함하지 않는다.
   - 등록 시점: `WebVitalsItem.jsx:134` `}, [isMount, name, evaluationResult]);` — effect 가 `setEvaluationResult` 를 호출하면서 `evaluationResult` 를 deps 에 뒀다. 동일 참조 set 이라 `Object.is` bail-out 으로 재실행이 없었을 뿐, G-1 을 충족시켜 새 참조로 바꾸는 순간 무한 재fetch 루프가 되는 구조였다. **HEAD=`8da63f6`: `:153` `}, [isMount, name]);` — 자기 참조 제거 완료.** G-1 과 G-4 의 순서 의존은 TSK-20260825-02 에서 함께 처리됐다.
   - `eslint` 는 이것을 잡지 않는다 — `react-hooks/exhaustive-deps` 는 `'warn'` (`eslint.config.js:70`) 이고 **불필요한 deps 추가**는 그 규칙의 검출 대상이 아니다. 따라서 G-4 는 기존 자동 게이트와 중복이 아니다.

## 의존성

- 외부: `react`, `react-router-dom`, `prop-types`. 파생 state 축은 React `useState` / `useEffect` 참조 동일성 의미론 (`Object.is` bail-out), `msw` (테스트 서버), `vitest` + `@testing-library/react`.
- 내부: `common/common` (`log`, `isAdmin`, `setFullscreen`, `setHtmlTitle`), `./ContentMon`, `./ApiCallMon`, `./WebVitalsMon`, `./VisitorMon`, `./api`, `Monitor.css`. 파생 state 축은 추가로 `src/Monitor/api.js` `getWebVitals`, `src/Monitor/__fixtures__/monitor.js` (`webVitalsProd` 외 3), `src/Monitor/api.mock.js` (`prodServerOk` / `prodServerEmpty` 외).
- 역의존: `App.jsx` 의 `/monitor` 라우트. `WebVitalsMon.jsx` 가 `WebVitalsItem` 을 지표별로 렌더하므로 헤더 카운트 결함은 6개 지표(CLS/FID/LCP/INP/FCP/TTFB) 전부에 동시에 나타난다.

## 회귀 중점

### 페이지 셸
- 라우트 진입/이탈 시 `setFullscreen` 의 true→false 짝이 StrictMode 하에서 리스너 누수 없이 수행되는지.
- `navigate("/log")` 후에도 언마운트 cleanup 이 예상대로 동작 (fullscreen off).
- lazy 패널의 `Suspense fallback` 이 각 패널마다 독립되어, 느린 패널 하나가 전체를 막지 않음.

### 파생 state
1. (R-1) `totalCount` 영구 0 재발 — 파생 객체 조립에서 키가 누락되는 부류. G-2 가 값을, G-3 이 구조를 잡는다.
2. (R-2) G-1 충족 후의 **무한 재fetch** — 새 참조 set + 자기 참조 deps 의 조합. G-4 가 겨눈다. 회귀 시 증상은 조용하지 않다 (네트워크 폭주) 지만, 테스트에서는 `msw` 핸들러가 계속 응답해 타임아웃으로만 보일 수 있다.
3. (R-3) 위반의 타 컴포넌트 확산 — G-1 판정이 `src/Monitor/**` 전체를 도출 열거로 훑으므로 신규 파일도 자동 포함된다.
4. (R-4) 검출 경계 밖 형태로의 우회. 대괄호 표기 · `Object.assign` 은 게이트 신설로, 복합 대입 `+=` · 증감 `++` · 논리 대입 `||=` · 배열 변이 `.push()` 는 TSK-20260825-10 으로 **검출 범위에 편입**됐다. 남은 사각은 게이트 헤더가 미선언으로 **박제한** 형태(멀티라인 대입 · 별칭 경유 변이)뿐이며, 선언·구현 정합 자가 단언이 "기록되지 않은 공백" 의 재발을 막는다.

## 발화 채널

**HEAD=`8da63f6` 에서 파생 state 축의 네 게이트 전부 발화 채널을 갖는다** (등록 시점에는 전무했다). `RULE-07 §promote 조건 4` 의 실경로 박제 요건 충족.

| 게이트 | 채널 | 상태 |
|---|---|---|
| G-1 (정적) | `package.json` `scripts.check:monitor-state-immutability` → `scripts/check-monitor-state-immutability.sh` · `ci.yml` step · `.husky/pre-commit` (3채널) | 부착 완료 |
| G-2 (동작) | `src/Monitor/WebVitalsItem.test.jsx` — 비어있지 않은 응답 헤더 `(3)` · 빈 응답 `(0)` + `None` | 부착 완료 |
| G-3 (구조) | `WebVitalsItem.test.jsx` — 키 집합 포함 · 새 참조 반환 · `BAD DATA` 미계수 · falsy 입력 | 부착 완료 |
| G-4 (정적) | `WebVitalsItem.test.jsx` — `getWebVitals` 호출 1회 단언 (재fetch 폭주 검출). 정적 grep 은 §수용 기준 (G-4) | 부착 완료 |

게이트 스크립트는 **공허 통과 가드**를 내장한다 — 스캔 파일 0건 또는 도출 바인딩 0건이면 `exit 1`. 대상 집합이 비었는데 "위반 0" 으로 초록을 내는 검출력 0 상태를 구조적으로 차단한다. 현 HEAD ack 라인은 `files=8 bindings=25 shadowed=2 directions=6` 으로 비공허이며, 섀도잉 계수(`shadowed`)를 함께 내어 조용한 skip 을 배제한다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증) — 이관 완료.** "위반 1건을 주입하면 `rc≠0`, 원복하면 `rc=0`" 은 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니며, 그 검출 방향은 게이트 신설 task `TSK-20260825-03` (`c89f6dc`, `injection: 6/6 detect`) 과 확대 task `TSK-20260825-10` (`d672a28`, `injection: 14/14 detect`) 의 `## 검증/DoD` 로 이관돼 착지했다.

inspector tick 220 이 **결과를 받아쓰지 않고 독립 재현**했다 — 저장소 트리를 건드리지 않고 `MONITOR_STATE_SCAN_ROOT` 로 스캔 루트를 격리 디렉터리에 돌려 형태별 1건씩 주입했고, 선언 방향은 전수 검출·정상 트리 rc=0 을 확인했다. 그때 미기록으로 드러난 4형태는 TSK-20260825-10 이 흡수했다.

## 테스트 현황

### 페이지 셸
- [x] `src/Monitor/Monitor.test.jsx` — non-admin 리다이렉트, fullscreen on/off, 4 패널 마운트.
- [x] 각 패널 / 아이템 `.test.jsx` (ApiCallMon/Item, ContentMon/Item, WebVitalsMon/Item, VisitorMon).
- [x] `src/Monitor/__fixtures__/` 지표 응답 박제.

### 파생 state
- [x] `WebVitalsItem` 의 평가 라벨 분기 — `GOOD` / `POOR` / `NEEDS IMPROVEMENT` / `None`.
- [x] 빈 응답 경로 — `prodServerEmpty` 에서 `None` 라벨 (`empty result set (totalCount = 0)`).
- [x] **비어있지 않은 응답에서 헤더 카운트 단언** — `findByText("Cumulative Layout Shift (3)")`. 등록 시점 0건 → 부착 완료 (TSK-20260825-02).
- [x] 파생 객체 키 집합 완전성 단언 — `arrayContaining` 포함 관계 + 중첩 3객체, 공허 통과 가드 동반. 부착 완료 (TSK-20260825-02).
- [x] G-1 정적 판정의 저장소 등재 — `scripts/check-monitor-state-immutability.sh` + `package.json` + `ci.yml` + `.husky/pre-commit`. 부착 완료 (TSK-20260825-03).

## 수용 기준

> 파생 state 축 전 항목은 명령 1회로 rc 판정 가능하다 (RULE-07 §수용 기준 문장 규약). **HEAD=`8da63f6` 기준 4/4 충족** — inspector tick 220 이 네 명령을 전수 재실행해 확인했고 (result.md 주장 미인용), planner tick 12 가 승격 직전 8/8 을 독립 재실행했다. 측정 명령은 `src/**` · `package.json` script 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2).

### 페이지 셸 (현재 상태)
- [x] (Must) non-admin 진입 시 `/log` 로 리다이렉트하고 fullscreen · title 미설정.
- [x] (Must) admin 진입 시 `setFullscreen(true)` 적용, 라우트 이탈 시 `setFullscreen(false)` 로 복원.
- [x] (Must) 4 패널 순서: ContentMon → ApiCallMon → WebVitalsMon → VisitorMon.
- [x] (Must) 각 패널은 독립 `Suspense fallback=<div/>` 로 감싼 lazy 로드.
- [x] (Should) 패널별 색 팔레트 주입은 `CHART_PALLETS` 모듈 상수에서 참조.
- [x] (NFR) 페이지 레이아웃은 `main--main-contents` + 상위 `<main style={contentHeight}>` 로 오프라인/온라인 공용 셸과 높이 계산 일관성 유지.

### 파생 state
- [x] (Must) G-1: §동작 §파생 state 계약 1 의 도출 열거 판정이 **0 line**. **HEAD=`8da63f6` 실측 0 line → 충족** (등록 시점 `1c9f94d` 는 13 line). 보조 단언 — `grep -c "setEvaluationResult(evaluationResult)" src/Monitor/WebVitalsItem.jsx` → **0** (실측 0). 저장소 게이트 동치 확인 — `npm run check:monitor-state-immutability` → `rc=0`, ack 가 `files=8 bindings=25` 이상으로 **공허 통과 아님**을 수치로 확인.
- [x] (Must) G-2: `prodServerOk` (`webVitalsProd` — `GOOD`/`POOR`/`NEEDS IMPROVEMENT` 각 1건 + `BAD DATA` 1건) 응답에서 `WebVitalsItem` 로드가 끝나면 헤더 텍스트가 `"Cumulative Layout Shift (3)"` 를 포함하고, `prodServerEmpty` 에서는 `"(0)"` + 라벨 `None` 이다. 판정: `npx vitest run src/Monitor/WebVitalsItem.test.jsx` → `rc=0` (**실측 rc=0**). 등록 시점에는 단언 부재로 명령이 rc=0 이면서 계약을 측정하지 않는 **공허 통과** 상태였다. 충족 조건인 "rc=0 **이면서** 두 단언 실재" 를 함께 확인했다 — `grep -c '(3)' src/Monitor/WebVitalsItem.test.jsx` → **≥1**. **충족.**
- [x] (Must) G-3: 파생 객체 키 집합이 `useState` 초기값 키 집합을 포함함을 단언하는 테스트가 실재하고 통과한다. 판정: `npx vitest run src/Monitor/WebVitalsItem.test.jsx` → `rc=0` (실측) **이면서** 키 집합 비교 단언 실재 — `expect(Object.keys(built)).toEqual(expect.arrayContaining(Object.keys(initial)))` + 중첩 3객체. 단언 대상이 **production export** 임을 확인했다 (팩토리·조립 함수를 렌더 경로가 실제 소비 — RULE-06 §관측 표면, 죽은 export 아님). 기대 키 집합 공집합 시의 무조건 통과도 동반 가드가 차단한다. **충족.**
- [x] (Should) G-4: `grep -cE "\}, \[isMount, name, evaluationResult\]\)" src/Monitor/WebVitalsItem.jsx` → **0**. **HEAD=`8da63f6` 실측 0 → 충족** (등록 시점 1, `:134`). 현 deps 는 `:153` `}, [isMount, name]);`. 회귀 없음 확인: `npx vitest run src/Monitor/` → `rc=0` (실측 6 files / 53 tests). 동작 축 보강 — 로드 완료 후 `getWebVitals` 호출 **1회**를 단언해 재fetch 폭주를 정적 grep 밖에서도 잡는다.

## 참고

- 대조군 (준수 사례): `src/Monitor/ApiCallItem.jsx:100` `setRateColor({ color: ... })` — 새 객체 리터럴 set.
- 원 followup: `specs/10.followups/20260824-2020-webvitalsitem-state-object-mutation.md` (source_task `TSK-20260824-07-a`, severity low). 그 task 는 `## 스코프 규칙` expansion **불허** 였으므로 developer 가 정당하게 이관했다 — 스코프 규칙이 설계대로 작동한 사례다.
- 헤더 카운트 결함은 followup 원문에 없었고 discovery 가 req 작성 중 추가 발견했다. inspector 가 tick 219 에서 독립 재현했다 (대입 라인 0건 · 렌더 소비 확인 · 테스트 공백 확인).
- **문서 병합 경위**: 파생 state 축은 `components/monitor-derived-state-immutability` 로 별도 등록됐다가 (inspector tick 219, planner tick 12 승격 `b3f857b`) 2026-08-25 운영자 판단으로 본 문서에 병합됐다. `specs/30.spec/**/components/` 는 `src/` 구현 단위와 1:1 이어야 하며, 파생 state 축의 스코프(`src/Monitor/**`)가 본 문서와 동일하므로 별 파일로 둘 근거가 없다. 등록 당시 §참고의 "승격 시 별 파일로 남는다" 판단은 이 원칙에 의해 대체된다.

### 미측정·비판정 항목

- **`<React.StrictMode>` / concurrent 재실행에서의 누적 변이 관측.** 측정 채널이 없어 체크박스로 두지 않는다. G-1 을 충족하면 구조적으로 발생 불가하므로 별도 방어가 필요하지 않다.
- **`Object.is(prev, next) === true` bail-out 자체의 관측.** 현 HEAD 에서 같은 effect 의 `setIsLoading(false)` 가 리렌더를 일으켜 변이 결과가 화면에 반영되므로 bail-out 은 사용자에게 직접 보이지 않는다. 관측 가능한 귀결만 박제했다 — G-2 (`totalCount` 영구 0).
- **G-1 게이트의 주입 검출력.** '가정 주입 요구' 부류라 체크박스가 아니다 — 게이트 신설 task `TSK-20260825-03` 및 확대 task `TSK-20260825-10` 의 DoD 로 이관돼 착지했고, inspector tick 220 이 스캔 루트 격리로 독립 재현했다. 결과는 §발화 채널에 박제. 상시 판정 대상이 아니므로 계속 비체크박스로 둔다.
- **검출 경계 밖 형태의 현 HEAD 부재.** 남은 경계 밖 형태(멀티라인 대입 · 별칭 경유 변이)는 `src/Monitor/**` 실측 0건이나 "앞으로도 0건" 은 게이트가 그 방향을 선언해야 판정 가능하다 — 상시 rc 판정 대상이 아니므로 체크박스로 두지 않는다. 게이트의 선언·구현 정합 자가 단언이 이 경계가 **기록된 채로** 유지되도록 강제한다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | operator (수동) | **`components/monitor-derived-state-immutability` 병합.** `components/` 는 `src/` 구현 단위 1:1 원칙이며 파생 state 축의 스코프가 `src/Monitor/**` 로 본 문서와 동일하다. G-1~G-4 식별자와 측정 명령은 그대로 보존했고, 외부 참조 6곳(`scripts/check-monitor-state-immutability.sh`, `ci.yml`, `WebVitalsItem.jsx`, `WebVitalsItem.test.jsx`, green spec 2곳)의 slug 를 `monitor` 로 갱신했다. | all |
| 2026-08-25 | TSK-20260825-10 `d672a28` | 게이트 검출 방향 확대 — 복합 대입 `+=` · 증감 `++` · 논리 대입 `||=` · 배열 변이 `.push()` 를 흡수하고 선언·구현 정합 자가 단언을 부착 (`injection: 14/14 detect`). 섀도잉 계수 `shadowed=2` 를 ack 에 노출해 조용한 skip 배제. | 동작 §파생 state 1, 회귀 중점 R-4, 발화 채널 |
| 2026-08-25 | TSK-20260825-02 `9e93c23` · TSK-20260825-03 `c89f6dc` (inspector tick 220 Phase 1) | **drift reconcile — 파생 state 수용 기준 0/4 → 4/4, 테스트 현황 3건 플립.** 네 측정 명령을 HEAD=`8da63f6` 에서 전수 재실행해 확인했다 (`result.md` 주장 미인용): G-1 도출 열거 13 → **0 line** · 보조 `setEvaluationResult(evaluationResult)` 1 → **0** · `npm run check:monitor-state-immutability` rc=0 (비공허) / G-2·G-3 `npx vitest run src/Monitor/WebVitalsItem.test.jsx` rc=0 + 단언 실재·production export 소비 확인 / G-4 자기 참조 deps 1 → **0** (`:134` → `:153` `[isMount, name]`) + `npx vitest run src/Monitor/` rc=0. | 동작 §파생 state, 회귀 중점, 발화 채널, 테스트 현황, 수용 기준, 참고 |
| 2026-08-25 | REQ-20260825-001 (inspector tick 219) | 파생 state 축 최초 등록. followup `20260824-2020-webvitalsitem-state-object-mutation` → discovery req 를 **불변식으로 재정식화**해 흡수 (RULE-07 §결함 신고 재정식화). req 의 FR-01 판정 grep 은 그대로 쓰지 않았다 — 원안은 `src/Monitor` 전체 점 표기 대입을 훑어 **34 line** 을 내며 그중 21 line 이 정당한 코드라 "0 line" 이 될 수 없고, 남은 필터가 사람 판단이라 `RULE-07 §수용 기준 문장 규약`을 위반한다. 파일별 `useState` 바인딩명을 **도출**하는 판정으로 교체해 실측 **13 line** (위반 전량, 오탐 0) 을 얻었다. G-1↔G-4 의 **순서 의존**을 신규 명시했다 — req 에는 없던 항목이며 함께 처리하지 않으면 수정이 회귀를 만든다. | 동작 §파생 state, 역할 |
| 2026-04-20 | operator / — | 셸 축 최초 등록 (as-is 서술 spec) | 역할, 공개 인터페이스, 동작 §페이지 셸, 회귀 중점 §페이지 셸 |
