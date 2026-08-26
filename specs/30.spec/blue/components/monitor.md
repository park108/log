# Monitor 컴포넌트 (관리자 대시보드)

> **위치**: `src/Monitor/` (Monitor.jsx, ContentMon.jsx, ContentItem.jsx, ApiCallMon.jsx, ApiCallItem.jsx, WebVitalsMon.jsx, WebVitalsItem.jsx, VisitorMon.jsx, api.js, api.mock.js, Monitor.css)
> **관련 요구사항**: — (셸 축은 as-is 서술) / REQ-20260825-001 (파생 state 축) / REQ-20260825-006 (렌더 값 유효성 축) / REQ-20260825-009 (렌더 역할 네임스페이스 축)
> **최종 업데이트**: 2026-08-27 (by operator — `components/monitor-render-role-class-namespace-disjointness` 를 4번째 축으로 병합. `components/` 는 `src/` 구현 단위와 1:1 이라는 운영자 원칙에 따른다. 이전 갱신: 2026-08-25 tick 222. 셸 축 6항에 판정 명령을 부착하고 §테스트 현황 2항의 거짓 서술을 정정했다. 이로써 세 축 27 항목이 전부 명령 1회 rc 판정 가능하며 unchecked 는 0 이다. 이전: tick 221. blue 판본을 green 으로 내려 **렌더 값 유효성 축(V-1~V-6)을 병합**했다. 운영자가 세운 `components/` = 구현 단위 1:1 원칙의 두 번째 적용이며, 축의 스코프가 `src/Monitor/WebVitalsItem` 이라 `monitor` 에 귀속된다. 승격 시 blue 판본을 그대로 대체한다 — 셸·파생 state 축은 손대지 않았다)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (셸 축 2026-04-20 · 파생 state 축 `8da63f6` · 렌더 값 유효성 축 `6f58541`).

> **식별자 네임스페이스**: 파생 state 축은 `G-n`, 렌더 값 유효성 축은 `V-n` 이다. 두 축이 한 문서에 들어오면서 `G-1` 이 충돌했기 때문이며, 외부 참조 호환은 §참고 §식별자 대응표가 맡는다 (`REQ-20260825-006 G-n` ↔ `V-n`).

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

또한 이 영역의 컴포넌트가 집계 결과로부터 만들어 DOM 에 싣는 값은 **집계 총량과 무관하게 언제나 유효한 값**이다. 집계 대상이 0건인 정상 입력에서도 `NaN`·`Infinity`·`undefined` 에서 파생된 표기가 렌더 결과에 실리지 않는다.

**0건은 예외가 아니라 설계된 정상 상태다.** `buildEvaluationResult` 는 `items` 가 falsy 이거나 어떤 항목도 세 평가 분류에 들지 않으면 `totalCount === 0` 을 만들고, 분기가 그 상태를 `evaluation = "None"` 으로 **명시적으로 취급**한다. 코드가 이미 0건을 정상 입력으로 인정하고 있으므로, 그 인정된 상태에서 무효값이 나오는 것은 "정상 입력이 무효 출력을 만든다" 는 모순이다.

**렌더러가 무효 CSS 를 버린다는 사실은 면제 사유가 아니라 관측 문제다** (2026-08-25 실측 — 아래가 tick 220 판본의 근거 오류를 정정한다). `width: "NaN%"` 를 세팅하면 선언이 **통째로 폐기**된다:

```
el.style.width = 'NaN%'
  → el.style.width === ""   ·   el.getAttribute('style') === null
```

따라서 tick 220 판본이 적은 "DOM 은 무효값을 실제로 보유하고 스냅샷·접근성 도구가 그것을 읽는다" 는 **거짓**이다. 실제 귀결은 두 가지이며 둘 다 더 나쁘다:

1. **막대가 폭 선언을 잃는다.** 인라인 `width` 가 사라지므로 폭은 스타일시트·기본값이 결정한다 — 0건 상태의 의도된 표현(`"0%"`, 폭 없는 막대)과 다른 결과가 나올 수 있고, 화면만 봐서는 원인을 알 수 없다.
2. **`NaN` 문구를 찾는 단정은 민감도 0 이다.** `expect(style.width).not.toContain('NaN')` 류는 폐기 때문에 **가드 유무와 무관하게 항상 참**이다. 이 축을 문구 부재로 판정하면 검출력 0 게이트가 정상 트리에서 초록을 내고 그대로 정착한다. 그래서 판정은 **유효성**(백분율 표기 매치)으로만 한다 — 폐기돼 빈 문자열이 된 상태도 그 패턴에서 탈락한다.

렌더 값 유효성 축도 `RULE-07 §주제 우선순위` **1순위 (사용자 관측 가능 동작)** 귀속이다 — 판정 대상은 렌더된 DOM 의 속성값이다.

렌더 값 유효성 축이 의도적으로 하지 않는 것:
- (i) 색상·레이아웃·CSS 클래스 변경.
- (ii) 백엔드 응답 스키마 변경과 `evaluation` 값 정규화(대소문자 변형 수용 등). 본 축은 **결과의 안전성**만 규정하고 원인(응답 형상)은 규정하지 않는다.
- (iii) `totalCount > 0` 경로의 산술 변경. 0 경계만 규정한다 (V-4).
- (iv) 가드의 **구현 수단** 선택(삼항·early return·기본값 등) — planner·developer 영역.

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

렌더 값 유효성 축도 공개 인터페이스를 갖지 않는다 (내부 렌더 값 매핑 계약). 관측 표면은 세 상태 막대 `span.span--monitor-bar` 의 `style.width` (`span--monitor-good` · `span--monitor-warn` · `span--monitor-poor`) 와 그 안의 비율 텍스트다.

**슬롯 클래스 단독 선택자는 관측 표면이 아니다.** 평가 헤더 span 이 같은 슬롯 클래스를 공유하고(`HEADER_STYLE` 의 `span--monitor-evaluation span--monitor-poor`) 막대보다 **앞에** 렌더되므로, `.span--monitor-poor` 만으로 고르면 헤더가 잡힌다. 헤더에는 인라인 style 이 없어 폭이 `""` 로 읽히고, 0 경계에서는 헤더가 `-none` 이라 충돌하지 않아 **비-0 경로에서만** 어긋난다 — 조용한 방향의 오측정이다. 선택자는 `.span--monitor-bar.<슬롯>` 으로 교차 한정한다 (TSK-20260825-12 실측).

### 렌더 값 유효성 계약

대상은 `src/Monitor/WebVitalsItem.jsx` 의 파생 값 매핑 함수쌍 `toRate` · `toStyle` 과 그 소비처 — `buildEvaluationResult` 가 세 슬롯(`good`/`needImprovement`/`poor`)의 `rate`·`style` 을 조립하고 렌더가 `style={...}` 로 인라인 적용한다.

1. **(V-1) 렌더 값의 유효성** — 세 상태 막대의 `style.width` 는 항상 유효한 CSS 백분율 문자열(`^\d+(\.\d+)?%$`)이다.
   - 등록 시점(`8da63f6`) 실측: **위반.** `toStyle` 이 `100 * count / totalCount + "%"` 이며 `totalCount === 0` 이면 `0/0 → NaN` 이라 `{ width: "NaN%" }` 를 반환했다 (inspector tick 220 이 함수 본문 그대로 실행해 재현). **HEAD=`6f58541`: 해소** — TSK-20260825-12 (`4014c66`) 가 `Number.isFinite(totalCount) && 0 !== totalCount` 가드를 넣었다.
2. **(V-2) 0 경계의 값** — `totalCount === 0` 이면 세 막대의 `style.width` 는 `"0%"` 다. 폭이 없는 막대가 "집계 대상 없음" 의 표현이다.
3. **(V-3) 인접 축 보존** — `totalCount === 0` 일 때 헤더는 `"<지표명> (0)"`, 평가 라벨은 `"None"` 을 유지한다. V-2 도입이 파생 state 축 (G-2) 가 세운 동작을 흔들지 않음을 고정한다.
4. **(V-4) 비-0 경로 불변** — `totalCount > 0` 인 경우의 폭 산술(`100 * count / totalCount`)은 변경되지 않는다. 0 경계 가드 도입이 정상 경로 값을 바꾸면 그것은 계약 충족이 아니라 회귀다.
   - 기준값 (`webVitalsProd` — good 1 / needImprovement 1 / poor 1, `totalCount` 3): 세 막대 전부 `width: "33.333333333333336%"`. **반올림·`toFixed` 도입은 이 값을 바꾸므로 V-4 위반이다.**
5. **(V-5) 함수쌍의 0 경계 대칭** — 비율 텍스트(`toRate`)와 막대 폭(`toStyle`)은 **둘 다** 0 경계 가드를 갖는다. 같은 함수쌍의 인접 분기에서 한쪽만 방어된 상태를 계약 위반으로 본다.
   - 등록 시점 실측: **비대칭.** `toRate` 는 `0 === count ? ""` 로 텍스트 축을 방어했으나 `toStyle` 에는 대응 가드가 없었고, 주석 `"totalCount 가 0 이면 \"NaN%\" 가 되는 현행 산술을 그대로 이식한다 (스코프 밖)"` 이 그 비대칭을 코드에 박제하고 있었다 — 알려진 채로 남겨진 상태다. **HEAD=`6f58541`: 해소.**
   - **분기 변수가 서로 다른 것은 정상이다.** `toRate` 는 표기상 `count` 로 분기하고 `toStyle` 은 `totalCount` 로 분기한다 — `NaN` 을 만드는 것은 **분모**이기 때문이다. V-5 가 요구하는 것은 분기식의 동일성이 아니라 **가드의 존재 대칭**이다.
   - **대칭화의 경계 조건 (중요).** `toRate` 의 0 경로 반환값을 `""` 에서 바꾸면 **사용자 관측 텍스트가 바뀐다** — 렌더가 `rate` 를 그대로 싣으므로 `"0"` 을 반환하면 빈 막대에 `0` 이 표시된다. V-5 는 반환값 통일을 요구하지 않으며, 현행 `""` 는 V-6 이 보존한다.
6. **(V-6) 비율 텍스트 보존** — `toRate` 의 반환 표기는 현행을 유지한다: `count === 0` 이면 빈 문자열, 아니면 백분율 정수 문자열(`toFixed(0)`).
   - **tick 220 판본의 근거 1건을 정정한다.** 그 판본은 "평가 분기(`75 <= goodRate` / `25 < poorRate`)가 문자열 `rate` 를 비교하므로 반환값 변경이 `evaluation` 산출까지 흔든다" 를 V-6 의 주된 근거로 들었다. **재현되지 않는다** — `""` 와 `"0"` 은 관계 비교에서 **둘 다 `0` 으로 강제변환**되므로 두 분기 결과가 동일하고, 0 집계의 `evaluation` 은 어차피 `0 < totalCount` 가 거짓이라 `"None"` 으로 떨어진다. `count === 0` 인 슬롯은 `totalCount > 0` 인 경우에도 마찬가지로 두 표기가 같은 비교 결과를 낸다 (inspector tick 221 실측 · TSK-20260825-12 developer 최초 관측).
   - 따라서 V-6 을 Must 로 두는 이유는 **사용자에게 보이는 텍스트** 하나이며, 그것으로 충분하다. 잘못된 인과를 근거로 남겨두면 이후 판단이 그 위에 쌓인다.

### 렌더 역할 네임스페이스 계약

대상은 `src/Monitor/WebVitalsItem.jsx` 의 렌더 트리 — `HEADER_STYLE` `:9-15`(평가 라벨, 역할 전용 슬롯 `span--monitor-evaluation-*`) · 막대 렌더 `:213-219`(`span--monitor-bar` + `span--monitor-{good,warn,poor}`). 슬롯 CSS `src/Monitor/Monitor.css:50-67`(막대) · `:73-86`(헤더), 역할 기하 `:38`(`bar`) · `:43`(`evaluation`).

**역할이 다른 요소는 서로소인 클래스 집합을 갖는다.** 따라서 색상 슬롯 클래스 1개짜리 단독 선택자는 **정확히 하나의 역할**만 선택하며, 그 선택 결과가 DOM 문서 순서에 의존하지 않는다.

핵심 명제 — **식별 가능성은 마크업의 책임이지 소비자의 책임이 아니다.** 현행은 "슬롯 클래스만으로는 요소를 식별할 수 없으니 소비자가 항상 복합 선택자를 써야 한다" 는 **암묵 규칙**에 의존하는데, 그 규칙은 어디에도 강제돼 있지 않고 위반해도 아무것도 붉어지지 않는다.

이 축이 의도적으로 하지 **않는** 것:
- (i) **색상 값·CSS 변수 자체를 바꾸지 않는다.** 동일 변수 재사용은 허용이며 시각 결과는 불변이어야 한다 ((N-3)).
- (ii) **집계 로직·평가 분기를 다루지 않는다.** 막대 폭의 **값** 유효성은 위 §렌더 값 유효성 계약 소관이며, 이 축은 막대의 **식별** 결정성이다 — 판정 대상이 다르다.
- (iii) **`src/Monitor` 밖으로 일반화하지 않는다.** 다른 컴포넌트의 역할-슬롯 공유 여부는 미측정이다 (§참고).

1. **(N-1) 오선택이 예외가 아니라 무해한 값으로 관측되므로 조용하다** — `document.querySelector('.span--monitor-poor')` 는 **헤더**를 집는다 (헤더 `:205`, 막대 `:213-219` — 문서 순서상 헤더가 앞선다). 헤더에는 인라인 `style` 이 없으므로 `style.width` 가 예외를 던지지 않고 **빈 문자열**로 읽힌다. 즉 잘못된 요소를 집었다는 사실이 오류로 드러나지 않는다.
   - tick 225 실측 (HEAD=`5b2ed3b`): 헤더 슬롯 4종 · 막대 슬롯 3종 · **공유 3종** (`span--monitor-good` · `span--monitor-poor` · `span--monitor-warn`).
   - **착지 (TSK-20260826-34 / `627d8e6`, tick 226 ack)** — 헤더 슬롯이 `span--monitor-evaluation-*` 네임스페이스로 분리돼 **공유 0** 이다. 위 서술은 계약이 겨누는 **실패 형상**의 기록으로 존치한다 — 재발 시 같은 관측이 다시 성립한다.
2. **(N-2) 0 경계에서만 통과하는 비대칭이 검출을 늦춘다** — **0 집계에서는 헤더 슬롯이 `span--monitor-none`** 이라 막대 슬롯과 충돌하지 않는다. 그래서 0 경계 케이스는 통과하고 **비-0 경로에서만** 어긋난다 — 경계값 테스트를 먼저 갖춘 스위트일수록 늦게 발견된다.
   - **방어 대상 (`RULE-07 §주제 우선순위` 축 1 — 사용자 관측 가능 렌더 결과)**: 슬롯 클래스로 막대를 지목하는 모든 소비자(테스트 · 스타일 · 향후 쿼리)가 **비-0 경로에서 조용히 헤더를 집는다.**
3. **(N-3) 역할 분리는 시각 결과를 바꾸지 않는다** — 역할별 슬롯이 분리돼도 두 역할의 색은 **동일 CSS 변수**(`--success-*` · `--warning-*` · `--error-*` · `--normal-*`)를 참조한다. 현행 슬롯 규칙은 색 리터럴을 하나도 쓰지 않으며(tick 225 실측 `slot-rules=4 color-literals=0`), 분리 과정에서 리터럴로 재구현하면 시각 회귀가 조용히 들어온다 — **(N-8)** 이 그 방향을 막는다. **tick 226 착지 후 실측** `slot-tokens=9 css-rules=9 color-literals=0` — 분리된 헤더 슬롯 3종도 대응 막대 슬롯과 **같은 CSS 변수**를 참조한다 (`Monitor.css:73,:78,:83` vs `:50,:55,:60`).
4. **(N-4) 우회는 이미 소비자 쪽에 들어와 있다** — `TSK-20260825-12` 의 T-3 이 이 함정에 걸려 red 였다 (`expected '' to be '33.333333333333336%'`). 우회는 `.span--monitor-bar.<slot>` **복합 선택자로 테스트에 들어갔고**(`WebVitalsItem.test.jsx:419` `BAR_SELECTOR`), 원인인 마크업은 그대로였다.
   - **따라서 복합 선택자의 잔존은 이 축의 미충족 지표다** — 계약이 충족되면 소비자는 역할 모호성 회피 목적의 복합 선택자를 **필요로 하지 않는다**.
   - **착지 (tick 226 ack)** — `BAR_SELECTOR` 우회가 제거됐다. 현재 `:457` 은 `.span--monitor-bar` 단독으로 막대를 집고, `:494`·`:542` 는 **단독 슬롯 선택자로 집힌 요소가 막대임**을 역으로 단언한다 — 우회 지점이 계약의 측정 지점으로 뒤집혔다.

## 의존성

- 외부: `react`, `react-router-dom`, `prop-types`. 파생 state 축은 React `useState` / `useEffect` 참조 동일성 의미론 (`Object.is` bail-out), `msw` (테스트 서버), `vitest` + `@testing-library/react`.
- 내부: `common/common` (`log`, `isAdmin`, `setFullscreen`, `setHtmlTitle`), `./ContentMon`, `./ApiCallMon`, `./WebVitalsMon`, `./VisitorMon`, `./api`, `Monitor.css`. 파생 state 축은 추가로 `src/Monitor/api.js` `getWebVitals`, `src/Monitor/__fixtures__/monitor.js` (`webVitalsProd` 외 3), `src/Monitor/api.mock.js` (`prodServerOk` / `prodServerEmpty` 외).
- 렌더 값 유효성 축 추가 의존: jsdom 의 `style` 속성 반영 의미론 (**무효 CSS 선언 폐기** — §역할 실측), `src/Monitor/api.mock.js` `prodServerEmpty`.
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

### 렌더 값 유효성
1. (R-5) 0 경계 무효값 재발 — 새 파생 필드가 같은 `count / totalCount` 꼴로 추가되면서 가드를 빠뜨리는 부류. V-1 이 값 형태로, V-5 가 함수쌍 대칭으로 잡는다.
2. (R-6) 가드 도입이 정상 경로를 바꿈 — 반올림·`toFixed`·문자열 포맷 변경. V-4 가 기준값을 고정한다.
3. (R-7) 대칭화가 텍스트를 바꿈 — `toRate` 의 `""` 를 `"0"` 등으로 통일. V-6 이 차단한다. **가장 실현 가능성이 높은 회귀**다. "대칭" 을 반환값 통일로 읽으면 자연스럽게 도달하는 오답이기 때문이다.
4. (R-8) **판정이 문구 부재로 되돌아감** — `NaN` 문구를 찾는 단정으로 회귀하면 게이트는 초록인 채 검출력만 0 이 된다 (§역할 실측). 유효성 패턴 매치를 값 판정의 형태로 고정하는 것이 이 회귀의 유일한 방어다.
5. (R-9) **관측 표면이 헤더로 미끄러짐** — 슬롯 클래스 단독 선택자로 되돌아가면 비-0 경로에서만 헤더를 재는 상태가 된다 (§공개 인터페이스). 비-0 기준값 단언(V-4)이 이 미끄러짐을 함께 잡는다 — 헤더의 폭은 `""` 라 리터럴 단언에서 즉시 탈락한다.

### 렌더 역할 네임스페이스
1. (R-10) **역할 슬롯 재공유** — 헤더 슬롯을 `span--monitor-evaluation-*` 에서 되돌리거나, 신설 역할이 막대 슬롯 토큰을 재사용하는 부류. (N-5) 가 두 집합의 교집합으로 잡는다.
2. (R-11) **복합 선택자 우회의 재도입** — 소비자가 `.span--monitor-bar.<slot>` 로 모호성을 회피하면 마크업 결함이 가려진다. (N-6) 이 실행 라인 한정으로 잡는다 (주석은 제외한다 — 없앤 함정을 설명하는 주석까지 막으면 다음 사람이 맥락을 잃는다).
3. (R-12) **슬롯 색의 리터럴 재구현** — 역할 분리 과정에서 CSS 변수 대신 색 리터럴을 쓰면 나머지 판정을 전부 통과하면서 시각만 바뀐다. (N-8) 이 차단한다.

## 발화 채널

**HEAD=`ff699f9` 에서 셸 축 6항 전부 발화 채널을 갖는다** (tick 221 까지 전무했고, planner tick 13 이 정확히 그 사유로 승격을 거부했다 — "§수용 기준 셸 축 6항이 전부 `[x]` 인데 측정 채널이 없다"). `RULE-07 §promote 조건 4` 의 실경로 박제 요건 충족.

| 셸 축 항목 | 채널 (`src/Monitor/Monitor.test.jsx`) | 상태 |
|---|---|---|
| (1) non-admin 리다이렉트 | `redirect if not admin` — `/log` 라우트 **도착** + `setFullscreen`/`setHtmlTitle` 미호출 | 부착 완료 (TSK-20260825-16) |
| (2) fullscreen 왕복 | `shell axis 2` — 호출 순서열 `[true, false]` | 부착 완료 |
| (3) 4 패널 순서 | `shell axis 3` — `heading` level 1 열거의 개수 4 + 순서 배열 | 부착 완료 |
| (4) 독립 Suspense 경계 | `shell axis 4` — 미해소 고정 후 `main.childElementCount === 4` + 전 노드 `DIV`·빈 `innerHTML` | 부착 완료 |
| (5) `CHART_PALLETS` 주입 | `shell axis 5` — 패널 prop 기록기로 `stackPallet[0].backgroundColor` 고정값 대조 + `WebVitalsMon` 미수령 | 부착 완료 |
| (6) 레이아웃 셸 | `shell axis 6` — `main--main-contents` 클래스 + 주입 `contentHeight` 의 `style.height` | 부착 완료 |

**셸 축 채널의 두 함정과 그 회피 — tick 222 가 최종본에서 재확인했다.**

- **(4) 의 순서 종속.** `lazy` 의 미해소 상태에 기대면 판정이 **케이스 실행 순서에 종속**된다 — 파일 첫 케이스에서는 `lazy` 가 미해소라 빈 `<div>` 4개가 나오지만, 앞선 케이스가 한 번이라도 패널을 로드하면 모듈 캐시가 데워져 같은 코드가 `ARTICLE` 4개를 낸다. 최종본은 **패널 자신이 미해소를 만들게** 해 이 결합을 끊었다 (`panelProps.state.suspend`). tick 222 실측 — 파일 전체 실행 `rc=0` (7 passed) · 단독 실행 `-t "independent suspense"` `rc=0` (1 passed / 6 skipped). **양쪽 통과 = 순서 비종속.** 이 결합은 TSK-20260825-15 가 fixture baseline 에서 막 제거한 것과 같은 부류라 재도입되지 않은 것이 중요하다.
- **(5) 의 공허.** 렌더 결과(`background-color` 보유 요소)로 팔레트 주입을 판정하면 테스트 환경에 API 응답이 없어 대상이 **0개**이고, 판정은 데이터가 비는 한 언제나 공허하게 통과한다. 최종본은 `lazy` 대상 모듈을 **원본을 감싸는 기록기**로 대체해 prop 을 캡처한다 — 원본을 그대로 렌더하므로 heading 문구는 실제 패널의 것이고 (문구를 테스트가 지어내지 않는다) 캡처는 prop 축만 관측한다. 나아가 두 팔레트의 **고정 첫 색**(`#F8696B` / `#CAD2C5`)을 대조한다 — `ApiCall ≠ Content` 같은 구조 단언은 두 팔레트를 맞교환해도 참이라 교환을 못 잡는다.

**셸 축의 게이트 실효 검증 — inspector tick 222 가 독립 재현했다** (`result.md` 주장 미인용, 저장소 트리 미변경). `src/` 사본을 격리 디렉터리에 두고 `Monitor.jsx` 에 항목별 위반 1건씩을 주입해 `injection: 6/6 detect` 를 확인했다. 주입 후 `rc=1`, 원복 후 `rc=0` 이 6방향 전부에서 성립했다.

| 주입 방향 | 대상 | 결과 |
|---|---|---|
| (Dir-1) non-admin early return 제거 | `Monitor.jsx` admin 가드 | `rc=1` — `redirect if not admin` red |
| (Dir-2) unmount cleanup 제거 | `return () => {setFullscreen(false)}` | `rc=1` — `shell axis 2` red |
| (Dir-3) 패널 순서 교환 | `ContentMon` ↔ `ApiCallMon` | `rc=1` — `shell axis 3`·`5` red |
| (Dir-4) Suspense 4 경계 → 1 경계 병합 | JSX 트리 | `rc=1` — `shell axis 4` red |
| (Dir-5) 팔레트 교환 | `CHART_PALLETS[0]` ↔ `[1]` | `rc=1` — `shell axis 5` red |
| (Dir-6) `main--main-contents` 클래스 제거 | `<main className>` | `rc=1` — `shell axis 6` red |

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

**렌더 값 유효성 축의 채널 — HEAD=`6f58541` 부착 완료** (등록 시점 `8da63f6` 에는 전무했다: `WebVitalsItem.test.jsx` 에 `width`·`style` 단언 0건).

| 게이트 | 채널 | 상태 |
|---|---|---|
| V-1 / V-2 (0 경계 값) | `src/Monitor/WebVitalsItem.test.jsx` — `(T-1)` 세 막대 `style.width === "0%"` · `(T-2)` 막대 전 노드 유효성 순회 + 노드 수 하한 | 부착 완료 (TSK-20260825-12) |
| V-3 (인접 축 보존) | 같은 파일 — 헤더 `(0)` + 라벨 `None` (파생 state 축과 공유) | 존재 — 재사용 |
| V-4 (비-0 불변) | 같은 파일 — `(T-3)` 리터럴 `"33.333333333333336%"` | 부착 완료 |
| V-5 / V-6 (대칭·표기) | 같은 파일 — `(T-4)` `buildEvaluationResult(undefined)` 의 세 `rate` 가 `""` + `evaluation === "None"` | 부착 완료 |

**게이트 실효 검증의 이관처 — 이관 완료.** "0 경계 가드를 제거하면 `rc≠0`" 은 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니며, 검출 방향은 채널 부착 task `TSK-20260825-12` (`4014c66`, `injection: 4/4 detect`) 의 `## 검증/DoD` 로 이관돼 착지했다. 선언 방향은 (Dir-1) `toStyle` 0 가드 제거 → V-1/V-2 단언 `rc≠0`, (Dir-2) `toRate` 0 경로 반환을 `"0"` 으로 변경 → V-6 단언 `rc≠0` (**대칭화 오답을 실제로 잡는지 확인하는 방향**이며 (R-7) 의 직접 대응), (Dir-3) 비-0 경로에 `toFixed(0)` 주입 → V-4 기준값 단언 `rc≠0` 이었다.

> **관측 표면 주의** (`RULE-06 §관측 표면`) — 단언은 `buildEvaluationResult` 반환값 단위 격리만으로 끝내지 않고 **렌더된 DOM 노드의 `style.width`** 를 포함한다 (T-1/T-2/T-3). 조립 함수가 옳아도 렌더 경로가 그 값을 싣지 않는 회귀는 단위 단언이 보지 못한다. V-6 만 단위 표면인데, 그 축의 렌더 층은 V-2 의 `"0%"` 막대가 함께 관측한다.


### 렌더 역할 네임스페이스

**vitest 수집 경로** `src/Monitor/WebVitalsItem.test.jsx` (`vite.config.js:63,68` 수집 범위 안, `npm test` · CI 발화).

**tick 225 시점의 채널 한계는 해소됐다** — 당시에는 소비자가 복합 선택자로 우회한 탓에 이 축의 위반이 스위트를 붉게 만들지 못했다. TSK-20260826-34 (`627d8e6`) 가 `:494`·`:542` 에 **단독 슬롯 선택자 → 막대 여부** 역단언을 부착하면서 vitest 채널이 이 축의 실발화 채널이 됐다 (`npx vitest run src/Monitor` 65 passed). §수용 기준 (N-5)(N-6)(N-8) 의 정적 판정은 그와 **독립인 2차 채널**로 존치한다 — 테스트가 다시 우회 형태로 퇴행하는 방향은 정적 판정만이 잡는다.

## 테스트 현황

### 페이지 셸
- [x] `src/Monitor/Monitor.test.jsx` — 셸 축 6항 전수 (`237` 행 · `it` 7 · `expect(` 24). **tick 222 정정**: 이 항목은 tick 221 까지 `non-admin 리다이렉트, fullscreen on/off, 4 패널 마운트` 라고 적혀 있었으나 **사실이 아니었다** — 착수 시점 파일은 `51` 행 · `it` 2 · `expect(` 총 1 이었고 `redirect if not admin` 케이스는 단언이 **0개**였다 (throw 가 없는 한 실패 불가). `setFullscreen` · `Suspense` · `CHART_PALLETS` · `main--main-contents` 는 **토큰조차 0 hit**. 없던 것은 동작이 아니라 채널이었고 TSK-20260825-16 (`a131c07`) 이 부착했다.
- [x] 아이템 단위 `.test.jsx` — `ApiCallItem` · `ContentItem` · `WebVitalsItem` · `WebVitalsMon` · `VisitorMon` 실재. **tick 222 정정**: 종전 문장은 `각 패널 / 아이템 (ApiCallMon/Item, ContentMon/Item, …)` 이었으나 `ApiCallMon.test.jsx` · `ContentMon.test.jsx` 는 **부재**다 (디렉터리 열거 실측). 두 패널의 렌더는 `Monitor.test.jsx` 셸 축 (3)(5) 가 heading 순서·prop 주입 축에서만 관측한다 — 패널 내부 집계 축은 미관측이며 별 축이다 (§참고 §미측정·비판정 항목).
- [x] `src/Monitor/__fixtures__/` 지표 응답 박제 — `monitor.js`.

### 파생 state
- [x] `WebVitalsItem` 의 평가 라벨 분기 — `GOOD` / `POOR` / `NEEDS IMPROVEMENT` / `None`.
- [x] 빈 응답 경로 — `prodServerEmpty` 에서 `None` 라벨 (`empty result set (totalCount = 0)`).
- [x] **비어있지 않은 응답에서 헤더 카운트 단언** — `findByText("Cumulative Layout Shift (3)")`. 등록 시점 0건 → 부착 완료 (TSK-20260825-02).
- [x] 파생 객체 키 집합 완전성 단언 — `arrayContaining` 포함 관계 + 중첩 3객체, 공허 통과 가드 동반. 부착 완료 (TSK-20260825-02).
- [x] G-1 정적 판정의 저장소 등재 — `scripts/check-monitor-state-immutability.sh` + `package.json` + `ci.yml` + `.husky/pre-commit`. 부착 완료 (TSK-20260825-03).

### 렌더 값 유효성
- [x] 0 경계의 `style.width` 단언 — `(T-1)` 세 막대 `"0%"`. 등록 시점 0건 → 부착 완료 (TSK-20260825-12).
- [x] 무효값 전수 순회 + 공허 통과 가드 — `(T-2)` `.span--monitor-bar` 열거 순회, 노드 수 하한 `≥ 3` 동반.
- [x] 비-0 경로 폭 기준값 단언 — `(T-3)` 리터럴 `"33.333333333333336%"`.
- [x] `toRate` 0 경로 표기 단언 — `(T-4)` 세 슬롯 `rate === ""` + `evaluation === "None"`.

### 렌더 역할 네임스페이스
- [x] `WebVitalsItem` 스위트 실재 — `src/Monitor/WebVitalsItem.test.jsx`.
- [x] 공유 실측 — tick 226 재실행 `header=5 bar=4 shared=0` (교정판). tick 225 는 `header=4 bar=3 shared=3` 이었으나 그 수치는 sed 범위 재시작이 만든 것이며 (N-5) 참고.
- [x] 역할 서로소 — tick 226 ack. `shared=0` (TSK-20260826-34 / `627d8e6`).
- [x] 복합 선택자 불요 — tick 226 ack. HEAD 0 hit (tick 225 는 1 hit `:419`).

## 수용 기준

> **세 축 전 항목이 명령 1회로 rc 판정 가능하다** (RULE-07 §수용 기준 문장 규약). 셸 축은 tick 221 까지 판정 명령이 **전무**했고 (planner tick 13 이 그 사유로 승격을 거부했다), TSK-20260825-16 이 채널을 부착해 tick 222 에서 6항 전부에 명령이 붙었다. 파생 state 축·렌더 값 유효성 축은 **파생 state 축 HEAD=`6f58541` 기준 4/4 충족** (tick 221 재실행: 도출 열거 0 line · 보조 단언 0 · G-4 grep 0 · `check:monitor-state-immutability` ack `files=8 bindings=25 shadowed=2 directions=6`). 등록 시점 기준은 `8da63f6` 4/4 였다 — inspector tick 220 이 네 명령을 전수 재실행해 확인했고 (result.md 주장 미인용), planner tick 12 가 승격 직전 8/8 을 독립 재실행했다. 측정 명령은 `src/**` · `package.json` script 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2).

### 페이지 셸 (현재 상태)

> 여섯 항목의 공통 채널은 `npx vitest run src/Monitor/Monitor.test.jsx` 다 — **HEAD=`ff699f9` 실측 `rc=0` / 7 tests passed**. 각 항목은 채널 `rc=0` **이면서** 그 항목을 재는 단언이 실재함을 함께 판정한다 (채널만 초록인 상태는 검출력 0 과 구별되지 않는다). `grep` 은 **`-F` (고정 문자열)** 로 지정한다 — 저장소 개발 환경의 `grep` 은 `ugrep` 이라 ERE 의 미이스케이프 괄호가 오류로 떨어진다 (tick 222 실측).
>
> **판정 순서 비종속** — 셸 축 (4) 는 tick 222 에서 파일 전체 실행(`rc=0`)과 단독 실행(`-t "independent suspense"` → 1 passed / 6 skipped)에서 **모두 통과**함을 확인했다. 모듈 캐시가 차가우면 `lazy` 가, 데워지면 패널 자신이 미해소를 만들어 어느 쪽이든 fallback 4개가 관측된다.

- [x] (Must) non-admin 진입 시 `/log` 로 리다이렉트하고 fullscreen · title 미설정. 판정: 위 채널 `rc=0` **이면서** 리다이렉트 **도착** 단언 + 미호출 단언 실재 — `grep -cF "log route landing" src/Monitor/Monitor.test.jsx` → **1 이상** · `grep -cF "not.toHaveBeenCalled()" src/Monitor/Monitor.test.jsx` → **2 이상**. **HEAD 실측 rc=0 + 2 + 2 → 충족** (등록 시점 단언 0). 도착으로 판정하는 이유 — `navigate` 호출만 세면 대상 라우트가 없어도 통과한다.
- [x] (Must) admin 진입 시 `setFullscreen(true)` 적용, 라우트 이탈 시 `setFullscreen(false)` 로 복원. 판정: 위 채널 `rc=0` **이면서** 호출 **순서열** 단언 실재 — `grep -cF "toEqual([true, false])" src/Monitor/Monitor.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 1 → 충족.** 여부가 아니라 순서열로 재는 이유 — 호출 여부만 보면 cleanup 이 사라지고 mount 가 두 번 불린 형태와 구별되지 않는다.
- [x] (Must) 4 패널 순서: ContentMon → ApiCallMon → WebVitalsMon → VisitorMon. 판정: 위 채널 `rc=0` **이면서** 순서 배열 단언 + 개수 하한 실재 — `grep -cF "PANEL_HEADINGS_IN_ORDER" src/Monitor/Monitor.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 7 → 충족.** 개수 하한(`toHaveLength(4)`)을 동반하지 않으면 열거 0 에서 "순서 일치" 가 공허하게 참이 된다.
- [x] (Must) 각 패널은 독립 `Suspense fallback=<div/>` 로 감싼 lazy 로드. 판정: 위 채널 `rc=0` **이면서** 경계 **수** 단언 실재 — `grep -cF "childElementCount" src/Monitor/Monitor.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 1 → 충족.** 4 경계가 1 개로 병합되면 fallback 도 1 개가 되므로 이 수치가 독립성의 판별력을 갖는다.
- [x] (Should) 패널별 색 팔레트 주입은 `CHART_PALLETS` 모듈 상수에서 참조. 판정: 위 채널 `rc=0` **이면서** 주입 prop 단언 실재 — `grep -cF "stackPallet" src/Monitor/Monitor.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 1 → 충족.** 렌더 결과(`background-color` 보유 요소)로는 잴 수 없다 — 테스트 환경에 API 응답이 없어 그 요소가 **0개**라 데이터가 비는 한 언제나 공허 통과한다 (§발화 채널).
- [x] (NFR) 페이지 레이아웃은 `main--main-contents` + 상위 `<main style={contentHeight}>` 로 오프라인/온라인 공용 셸과 높이 계산 일관성 유지. 판정: 위 채널 `rc=0` **이면서** 클래스·주입 높이 단언 실재 — `grep -cF "main--main-contents" src/Monitor/Monitor.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 2 → 충족.** 클래스만 보지 않고 주입한 `contentHeight` 가 `main.style.height` 로 실린 것까지 함께 잰다.

### 파생 state
- [x] (Must) G-1: §동작 §파생 state 계약 1 의 도출 열거 판정이 **0 line**. **HEAD=`8da63f6` 실측 0 line → 충족** (등록 시점 `1c9f94d` 는 13 line). 보조 단언 — `grep -c "setEvaluationResult(evaluationResult)" src/Monitor/WebVitalsItem.jsx` → **0** (실측 0). 저장소 게이트 동치 확인 — `npm run check:monitor-state-immutability` → `rc=0`, ack 가 `files=8 bindings=25` 이상으로 **공허 통과 아님**을 수치로 확인.
- [x] (Must) G-2: `prodServerOk` (`webVitalsProd` — `GOOD`/`POOR`/`NEEDS IMPROVEMENT` 각 1건 + `BAD DATA` 1건) 응답에서 `WebVitalsItem` 로드가 끝나면 헤더 텍스트가 `"Cumulative Layout Shift (3)"` 를 포함하고, `prodServerEmpty` 에서는 `"(0)"` + 라벨 `None` 이다. 판정: `npx vitest run src/Monitor/WebVitalsItem.test.jsx` → `rc=0` (**실측 rc=0**). 등록 시점에는 단언 부재로 명령이 rc=0 이면서 계약을 측정하지 않는 **공허 통과** 상태였다. 충족 조건인 "rc=0 **이면서** 두 단언 실재" 를 함께 확인했다 — `grep -c '(3)' src/Monitor/WebVitalsItem.test.jsx` → **≥1**. **충족.**
- [x] (Must) G-3: 파생 객체 키 집합이 `useState` 초기값 키 집합을 포함함을 단언하는 테스트가 실재하고 통과한다. 판정: `npx vitest run src/Monitor/WebVitalsItem.test.jsx` → `rc=0` (실측) **이면서** 키 집합 비교 단언 실재 — `expect(Object.keys(built)).toEqual(expect.arrayContaining(Object.keys(initial)))` + 중첩 3객체. 단언 대상이 **production export** 임을 확인했다 (팩토리·조립 함수를 렌더 경로가 실제 소비 — RULE-06 §관측 표면, 죽은 export 아님). 기대 키 집합 공집합 시의 무조건 통과도 동반 가드가 차단한다. **충족.**
- [x] (Should) G-4: `grep -cE "\}, \[isMount, name, evaluationResult\]\)" src/Monitor/WebVitalsItem.jsx` → **0**. **HEAD=`8da63f6` 실측 0 → 충족** (등록 시점 1, `:134`). 현 deps 는 `:153` `}, [isMount, name]);`. 회귀 없음 확인: `npx vitest run src/Monitor/` → `rc=0` (실측 6 files / 53 tests). 동작 축 보강 — 로드 완료 후 `getWebVitals` 호출 **1회**를 단언해 재fetch 폭주를 정적 grep 밖에서도 잡는다.

### 렌더 값 유효성

> **HEAD=`6f58541` 기준 5/5 rc=0** — inspector tick 221 이 다섯 명령을 전수 재실행해 확인했다 (`result.md` 주장 미인용). tick 220 등록 시점은 0/5 였고 TSK-20260825-12 (`4014c66`) 가 전부 닫았다. 측정 명령은 `src/**` 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2).
>
> **tick 221 이 판정 형태를 1건 교정했다 (V-1 전수 항목).** tick 220 판본은 "`style.width` 에 `NaN` 을 포함하는 것이 0건" 을 요구했는데, 무효 CSS 선언은 렌더러가 폐기하므로 그 단정은 **가드 유무와 무관하게 항상 참**이다 (§역할 실측). 공허한 요구를 그대로 두면 그것을 문면대로 구현한 게이트가 검출력 0 인 채 정착한다 — TSK-20260825-12 developer 가 구현 중 측정으로 이를 발견하고 유효성 판정으로 뒤집었으며, 본 tick 이 그 판단을 계약에 반영한다. **지시를 문면대로 따랐으면 민감도 0 게이트가 남았을 자리다.**

- [x] (Must) V-1/V-2 (0 경계 값): `prodServerEmpty` 렌더에서 `span--monitor-good` · `span--monitor-warn` · `span--monitor-poor` 세 막대의 `style.width` 가 각각 `"0%"` 다. 판정: `npx vitest run src/Monitor/WebVitalsItem.test.jsx` → `rc=0` **이면서** 그 파일에 `width` 단언이 실재 — `grep -c "width" src/Monitor/WebVitalsItem.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 7 → 충족** (등록 시점 0).
- [x] (Must) V-1 (유효성 전수): `prodServerEmpty` 렌더 결과의 `span--monitor-bar` 전 노드를 순회해 **`^\d+(\.\d+)?%$` 에 매치하지 않는 것이 0건**임을 단언하는 테스트가 실재하고 통과한다. 순회는 클래스 선택자 열거로 하고 노드 수 하한(≥ 3)을 함께 단언한다 — 대상 집합이 비면 "0건" 은 무조건 참이 된다 (공허 통과 차단). 판정: 위 vitest rc=0 + 유효성 패턴 단언 실재 — `grep -cE "span--monitor-bar" src/Monitor/WebVitalsItem.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 2 → 충족** (등록 시점 0).
  - **판정을 문구 부재(`NaN` 미포함)로 쓰지 않는다.** 무효 선언이 폐기돼 `style.width === ""` 가 되므로 문구 부재는 언제나 참이고, 폐기된 상태 자체가 계약 위반인데 그 판정으로는 위반으로 보이지 않는다. 유효성 매치는 **빈 문자열도 탈락**시켜 두 상태를 함께 잡는다.
- [x] (Must) V-3: 같은 렌더에서 헤더 `"Cumulative Layout Shift (0)"` 와 라벨 `"None"` 이 그대로 관측된다. 판정: 위 vitest rc=0 + `grep -c '(0)' src/Monitor/WebVitalsItem.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 8 → 충족.**
- [x] (Must) V-4: `prodServerOk` (`webVitalsProd`, `totalCount` 3) 렌더에서 세 막대의 `style.width` 가 **`"33.333333333333336%"`** 로 현행과 동일하다. 판정: 위 vitest rc=0 + 해당 리터럴 단언 실재 — `grep -c "33.333333333333336" src/Monitor/WebVitalsItem.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 2 → 충족** (등록 시점 0).
- [x] (Must) V-6: 0 집계에서 **비율 텍스트가 빈 문자열로 보존**됨을 단언하는 테스트가 실재하고 통과한다. 판정 대상은 이미 export 된 표면이다 — `buildEvaluationResult(undefined)` 의 `good.rate`/`needImprovement.rate`/`poor.rate` 가 각각 `""`. 판정: 위 vitest rc=0 **이면서** `grep -c "\.rate" src/Monitor/WebVitalsItem.test.jsx` → **1 이상**. **HEAD 실측 rc=0 + 3 → 충족** (등록 시점 0).
  - V-5(함수쌍 0 경계 대칭)는 **별도 명령을 두지 않는다.** 대칭은 두 축이 각각 0 경계에서 단언될 때 성립하며, 폭 축은 위 V-1/V-2 가, 텍스트 축은 본 항목이 잡는다 — 두 항목이 함께 `[x]` 인 상태가 곧 V-5 충족이다.
  - **가드 토큰 grep 을 판정에 쓰지 않는 이유**: `grep -qE "0 === count \?|totalCount === 0"` 류는 등록 시점(미충족 상태)에서 **이미 매치했다** — `toRate` 의 기존 가드가 걸리기 때문이다 (inspector tick 220 실측). 구현 토큰은 어느 함수의 가드인지 구분하지 못해 미충족 상태에서 통과를 낸다.

### 렌더 역할 네임스페이스

> 전 항목 명령 1회로 rc 판정 가능. 명령은 `src/**` 만 참조하며 **spec 경로를 어느 것도 참조하지 않는다** (`§promote 조건 2`). **HEAD=`d7b08dd` (tick 226 재실행) 기준 4/4 전항 충족.** tick 225 등록 시점(HEAD=`5b2ed3b`)은 2/4 였고, **4 항목 중 2 건((N-5)(N-8))은 tick 226 이 판정 명령을 교정한 뒤에야 rc=0 이 됐다** — 실제 요구는 TSK-20260826-34 (`627d8e6`) 가 착지시켰고 미충족으로 보이던 것은 명령 쪽 결함이었다.

- [x] (Must, N-5) 역할 간 슬롯 토큰이 서로소다 — 두 집합을 파일에서 **도출**해 교집합을 잰다 (`RULE-06 §열거 고정 금지`). 판정:
  ```
  bash -c 'f=src/Monitor/WebVitalsItem.jsx; h=$(awk "/^const HEADER_STYLE/{i=1} i{print} i&&/^};/{exit}" "$f" | grep -oE "span--monitor-[a-z-]+" | sort -u); b=$(grep -oE "span--monitor-bar[[:space:]]+span--monitor-[a-z-]+" "$f" | grep -oE "span--monitor-[a-z-]+" | sort -u); [ -n "$h" ] && [ -n "$b" ] || { echo "derive=0 vacuous" >&2; exit 2; }; sh=$(comm -12 <(printf "%s\n" "$h") <(printf "%s\n" "$b")); n=$(printf "%s" "$sh" | grep -c .); echo "header=$(printf "%s\n" "$h" | grep -c .) bar=$(printf "%s\n" "$b" | grep -c .) shared=$n"; [ -n "$sh" ] && echo "shared-tokens: $(echo $sh)" >&2; [ "$n" -eq 0 ]'
  ```
  → **rc=0**. **HEAD=`d7b08dd` (tick 226 재실행) 실측 rc=0 / `header=5 bar=4 shared=0` → 충족** (TSK-20260826-34 / `627d8e6`). 헤더는 `span--monitor-evaluation-{good,warn,poor}` · `span--monitor-none`, 막대는 `span--monitor-bar` · `span--monitor-{good,warn,poor}` 로 갈라졌다.
  **tick 226 이 판정 명령 자체를 교정했다 (`RULE-07 §수용 기준 문장 규약` — 도달 불가 명령).** 종전 명령의 `sed -n "/HEADER_STYLE/,/^};/p"` 는 **범위가 재시작**한다: `HEADER_STYLE` 은 정의부 `:9` 와 **사용부 `:205`** 두 곳에서 매치하므로 sed 는 `:205`~EOF 를 두 번째 범위로 다시 열고, 그 안에 막대 span `:213-219` 가 들어와 막대 슬롯 3종이 **헤더 집합으로 계수**됐다. 그 결과 명령은 **착지 여부와 무관하게 항상 `shared=3` rc=1** 이었다 — tick 226 실측으로 준수 트리와 위반 픽스처가 **둘 다 rc=1** 임을 확인했다 (판정력 0). 교정판은 `awk "/^const HEADER_STYLE/{i=1} i{print} i&&/^};/{exit}"` 로 **단발 범위**를 구조적으로 보장한다 — `exit` 가 첫 `};` 에서 종료하므로 시작 패턴이 몇 번 더 등장해도 재시작이 없다.
  **토큰 열거도 함께 제거했다** — 종전은 `(good|warn|poor|none)` 4종을 명령에 **하드코딩**해 `RULE-06 §열거 고정 금지` 를 위반했고, 역할 분리로 신설된 `span--monitor-evaluation-*` 는 그 열거 밖이라 측정되지 않았다. 교정판은 `span--monitor-[a-z-]+` 로 양쪽 집합을 **도출**한다.
  **판정력 3분할 실측 (tick 226)** — 준수 트리 `rc=0 shared=0` / 헤더 슬롯을 분리 전으로 되돌린 픽스처 `rc=1 shared=3` / 슬롯 표기를 통째로 바꾼 픽스처 `rc=2 derive=0 vacuous`. **공허 통과 가드 내장** — 어느 한쪽 도출이 0 이면 `exit 2`. **`bash -c` 필수** — 프로세스 치환 `<(...)` 를 쓰므로 POSIX `sh` 에서는 동작하지 않는다.
- [x] (Must, N-6) 소비자가 역할 모호성 회피용 복합 선택자를 **실행 경로에서** 필요로 하지 않는다 — 판정: `bash -c 'f=src/Monitor/WebVitalsItem.test.jsx; tot=$(grep -c "span--monitor-bar" "$f"); [ "$tot" -gt 0 ] || { echo "derive=0 vacuous" >&2; exit 2; }; code=$(grep -nE "span--monitor-bar\." "$f" | grep -vE "^[0-9]+:[[:space:]]*(//|/\*|\*)"); n=$(printf "%s" "$code" | grep -c .); echo "bar-refs=$tot compound-in-code=$n"; [ -n "$code" ] && printf "%s\n" "$code" >&2; [ "$n" -eq 0 ]'` → **rc=0**. **HEAD=`d7b08dd` (tick 226 재실행) 실측 rc=0 / `bar-refs=3 compound-in-code=0` → 충족** (TSK-20260826-34 / `627d8e6`). tick 225 실측은 rc=1 / 1 hit (`:419` `BAR_SELECTOR`) 이었다. 현재 `WebVitalsItem.test.jsx:457` 은 `.span--monitor-bar` **단독** 선택자로 막대를 집고, `:494`·`:542` 는 **단독 슬롯 선택자로 집힌 요소가 막대인지**를 역으로 단언한다 — 우회 지점이 계약의 측정 지점으로 뒤집혔다.
  **tick 226 이 이 명령도 교정했다 — 종전 판본은 위양성이었다 (`대상 이탈`).** 이 항목이 재려는 것은 **실행되는 선택자**인데 종전 `grep -c` 는 **주석을 구별하지 못했다**. TSK-20260826-34 착지 시 코드에는 복합 선택자가 한 곳도 없었는데 *제거된 우회를 설명하는 주석 한 줄*이 유일한 hit 이 되어 rc=1 이었고, developer 는 게이트를 낮추는 대신 주석 문구를 바꿔 해소했다. **부작용의 방향이 나쁘다** — 없앤 함정을 설명하는 주석을 쓸 수 없게 되고, 그것은 회귀 재발 시 다음 사람이 맥락을 잃는 방향이다. 교정판은 `//` · `/*` · `*` 로 시작하는 라인을 계수에서 제외한다.
  **양방향 주입 실측 (tick 226)** — 주석 라인에 `.span--monitor-bar.span--monitor-good` 삽입: **종전 rc=1 (위양성) / 교정판 rc=0 `compound-in-code=0` (면역)**. 코드 라인에 같은 토큰 삽입: **종전 rc=1 / 교정판 rc=1 `compound-in-code=1`** — 위반 라인을 번호와 함께 stderr 로 낸다. 즉 특이도를 얻으면서 민감도를 잃지 않는다.
  **`\.` 이스케이프가 요점** — 이스케이프 없이 `grep "span--monitor-bar."` 로 쓰면 `.` 가 임의 1문자가 되어 `span--monitor-bar ` (공백 포함 일반 사용)까지 매치해 항상 hit 이 난다. 이 항목이 재는 것은 **클래스 연접(`.`)** 뿐이다. **공허 통과 가드 내장** — 파일에 `span--monitor-bar` 참조가 하나도 없으면 `exit 2` 로, 소비자가 통째로 사라진 상태를 충족으로 읽지 않는다 (`bar-refs=` 로 비공허를 수치 발화).
- [x] (Must, N-7) Monitor 스위트가 초록이다 — 판정: `npx vitest run src/Monitor` → **rc=0**. **HEAD=`5b2ed3b` (tick 225) 실측 rc=0 → 충족.** **본 항목의 판정 의미는 (N-5)(N-6) 착지 *후* 에 발생한다** — 현재의 초록은 소비자가 복합 선택자로 우회한 결과이며 계약 충족의 증거가 아니다 (§발화 채널). 역할 분리 후에도 초록이어야 한다는 요구로서 존치한다.
- [x] (Must, N-8) 슬롯 색상이 CSS 변수 참조로만 구성된다 — 판정: `bash -c 'j=src/Monitor/WebVitalsItem.jsx; c=src/Monitor/Monitor.css; t=$( { awk "/^const HEADER_STYLE/{i=1} i{print} i&&/^};/{exit}" "$j"; grep -oE "span--monitor-bar[[:space:]]+span--monitor-[a-z-]+" "$j"; } | grep -oE "span--monitor-[a-z-]+" | sort -u); [ -n "$t" ] || { echo "derive=0 vacuous" >&2; exit 2; }; tot=$(printf "%s\n" "$t" | grep -c .); s=0; n=0; miss=""; for k in $t; do blk=$(awk "/^\\.$k[[:space:]]*\\{/{i=1} i{print} i&&/^\\}/{exit}" "$c"); if [ -z "$blk" ]; then miss="$miss $k"; continue; fi; s=$((s+1)); n=$((n+$(printf "%s\n" "$blk" | grep -cE "#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\("))); done; echo "slot-tokens=$tot css-rules=$s color-literals=$n"; [ -n "$miss" ] && echo "no-css-rule:$miss" >&2; [ "$s" -eq "$tot" ] || exit 2; [ "$n" -eq 0 ]'` → **rc=0**. **HEAD=`d7b08dd` (tick 226 재실행) 실측 rc=0 / `slot-tokens=9 css-rules=9 color-literals=0` → 충족.**
  **tick 226 이 이 명령도 교정했다 — 종전 판본은 위음성이었다 (`대상 이탈`).** 종전 명령은 CSS 규칙을 `^\.span--monitor-(good|warn|poor|none)` 로 **열거 고정** 했는데, TSK-20260826-34 가 역할을 분리하면서 헤더 슬롯이 `span--monitor-evaluation-{good,warn,poor}` (`Monitor.css:73,:78,:83`) 로 **신설**돼 그 열거 밖으로 나갔다. 즉 이 항목이 겨누던 회귀(**역할 분리 과정에서 슬롯을 리터럴 색으로 재구현**)가 실제로 일어날 수 있는 자리가 분리 직후 **측정 범위 밖**이 됐다 — 게이트가 방어하려던 바로 그 변경이 게이트의 사각을 만들었다. **주입 실측 (tick 226)**: `.span--monitor-evaluation-good` 에 `color: #1a7f37;` 1행 주입 → 종전 명령 **rc=0 `slot-rules=4 color-literals=0` (검출 실패)** / 교정판 **rc=1 `slot-tokens=9 css-rules=9 color-literals=1` (검출)**. 교정판은 측정 대상을 `WebVitalsItem.jsx` 의 두 역할이 **실제로 렌더하는 클래스 집합에서 도출**하므로 (N-5) 와 같은 진리원을 공유하며, 슬롯이 또 신설·개명돼도 자동으로 따라간다. **공허 통과 가드 강화** — 도출 토큰 수와 CSS 규칙 수가 **불일치하면 `exit 2`** 다 (종전은 규칙 수 `>0` 만 봤다). 도출된 클래스에 대응 CSS 규칙이 없으면 `no-css-rule:` 로 이름을 낸다. **`RULE-07 §반려 시그널` 의 중복 게이트 부류가 아닌 경계** — 위반해도 붉어지는 기존 게이트가 없다 (`check:css-modules-coherence` 는 모듈 경계를 보지 색 리터럴을 보지 않는다).

## 참고

- 대조군 (준수 사례): `src/Monitor/ApiCallItem.jsx:100` `setRateColor({ color: ... })` — 새 객체 리터럴 set.
- 원 followup: `specs/10.followups/20260824-2020-webvitalsitem-state-object-mutation.md` (source_task `TSK-20260824-07-a`, severity low). 그 task 는 `## 스코프 규칙` expansion **불허** 였으므로 developer 가 정당하게 이관했다 — 스코프 규칙이 설계대로 작동한 사례다.
- 헤더 카운트 결함은 followup 원문에 없었고 discovery 가 req 작성 중 추가 발견했다. inspector 가 tick 219 에서 독립 재현했다 (대입 라인 0건 · 렌더 소비 확인 · 테스트 공백 확인).
- **문서 병합 경위**: 파생 state 축은 `components/monitor-derived-state-immutability` 로 별도 등록됐다가 (inspector tick 219, planner tick 12 승격 `b3f857b`) 2026-08-25 운영자 판단으로 본 문서에 병합됐다. `specs/30.spec/**/components/` 는 `src/` 구현 단위와 1:1 이어야 하며, 파생 state 축의 스코프(`src/Monitor/**`)가 본 문서와 동일하므로 별 파일로 둘 근거가 없다. 등록 당시 §참고의 "승격 시 별 파일로 남는다" 판단은 이 원칙에 의해 대체된다.

### 미측정·비판정 항목

- **`ApiCallMon` · `ContentMon` 의 패널 단위 집계 축.** 두 패널은 자기 `.test.jsx` 가 없어 (tick 222 디렉터리 열거 실측) 내부 페치·집계 루프가 어떤 채널에서도 관측되지 않는다. 셸 축 (3)(5) 가 heading 순서와 prop 주입만 잰다. 이는 본 문서가 규정하는 세 축 밖의 **별 축**이며, 채널이 정의되기 전에는 명령 1회로 rc 판정할 수 없어 체크박스로 두지 않는다.
- **`<React.StrictMode>` / concurrent 재실행에서의 누적 변이 관측.** 측정 채널이 없어 체크박스로 두지 않는다. G-1 을 충족하면 구조적으로 발생 불가하므로 별도 방어가 필요하지 않다.
- **`Object.is(prev, next) === true` bail-out 자체의 관측.** 현 HEAD 에서 같은 effect 의 `setIsLoading(false)` 가 리렌더를 일으켜 변이 결과가 화면에 반영되므로 bail-out 은 사용자에게 직접 보이지 않는다. 관측 가능한 귀결만 박제했다 — G-2 (`totalCount` 영구 0).
- **G-1 게이트의 주입 검출력.** '가정 주입 요구' 부류라 체크박스가 아니다 — 게이트 신설 task `TSK-20260825-03` 및 확대 task `TSK-20260825-10` 의 DoD 로 이관돼 착지했고, inspector tick 220 이 스캔 루트 격리로 독립 재현했다. 결과는 §발화 채널에 박제. 상시 판정 대상이 아니므로 계속 비체크박스로 둔다.
- **검출 경계 밖 형태의 현 HEAD 부재.** 남은 경계 밖 형태(멀티라인 대입 · 별칭 경유 변이)는 `src/Monitor/**` 실측 0건이나 "앞으로도 0건" 은 게이트가 그 방향을 선언해야 판정 가능하다 — 상시 rc 판정 대상이 아니므로 체크박스로 두지 않는다. 게이트의 선언·구현 정합 자가 단언이 이 경계가 **기록된 채로** 유지되도록 강제한다.

### 식별자 대응표 (외부 참조 호환)

병합 전 문서의 식별자를 그대로 찾아올 수 있게 둔다. 두 축이 각각 `G-1` 을 쓰고 있었으므로 렌더 값 유효성 축만 `V-n` 으로 이동했다.

| 병합 전 (`components/webvitals-aggregation-render-value-validity`, REQ-20260825-006) | 본 문서 |
|---|---|
| G-1 렌더 값의 유효성 | **V-1** |
| G-2 0 경계의 값 | **V-2** |
| G-3 인접 축 보존 | **V-3** |
| G-4 비-0 경로 불변 | **V-4** |
| G-5 함수쌍의 0 경계 대칭 | **V-5** |
| G-6 비율 텍스트 보존 | **V-6** |
| R-1 ~ R-4 (회귀 중점) | **R-5 ~ R-8** |

`src/Monitor/WebVitalsItem.test.jsx` 의 describe 문구 `REQ-20260825-006 G-1·G-4·G-6` 은 **req 식별자에 anchor 된 표기**라 유효하다 — req 원문의 G-n 을 가리키며, 본 문서로는 위 표를 거쳐 V-1·V-4·V-6 으로 해소된다.

- 렌더 값 유효성 축의 원 followups: `20260825-0646-webvitals-empty-response-nan-width` (`category: latent-defect`, `source_task: TSK-20260825-02`) · `20260825-0645-webvitals-header-count-manual-verification` (헤더 `(0)` 축은 V-3 으로 흡수).
- **그 축은 회귀가 아니라 선재 잠복 결함이었다.** TSK-20260825-02 의 `## 범위 밖` 이 산술 정정을 명시 배제했고 developer 는 값을 바꾸지 않고 이식했다 (주석이 그 사실을 코드에 박제했다). 파생 state 불변 교체 이전부터 존재하던 동작이므로 그 task 의 회귀가 아니며, **스코프 규칙이 설계대로 작동한 사례**다 — 범위 밖 결함을 임의 수정하지 않고 followup 으로 올렸다.

### 미측정·비판정 항목

- **실백엔드 응답 형상과 픽스처의 일치.** prod 의 `Items[].evaluation` 이 픽스처와 다른 형상(대소문자 변형·필드 누락)을 가지면 집계가 0 으로 떨어진다. 브라우저·실 API 접근이 없어 현 HEAD 에서 명령 1회로 rc 판정할 수 없다 (미측정 NFR 부류). 다만 **그 갭이 실현되는 순간의 렌더 결과는 본 문서가 규정한다** — 형상이 어긋나 집계가 0 이 되어도 화면에는 `0%` 막대와 `None` 라벨이 나온다. 원인이 아니라 결과의 안전성을 고정한다.
- **실응답 스냅샷의 픽스처 승격 / 운영자 1회 육안 확인.** 별도 축(픽스처 대표성)이며 측정 채널이 정의된 뒤에 spec 자격을 얻는다.
- **0 경계 가드의 주입 검출력.** '가정 주입 요구' 부류 — §발화 채널의 (Dir-1)~(Dir-3) 으로 채널 부착 task DoD 에 이관했고 `TSK-20260825-12` (`injection: 4/4 detect`) 로 착지했다.
- **무효 CSS 값의 브라우저별 처리.** 선언 폐기는 명세 동작이나 본 문서는 브라우저 구현 비교가 아니라 **렌더 경로가 싣는 값**을 판정한다. 렌더링 결과의 시각적 동일성은 측정 채널이 없어 체크박스로 두지 않는다.

### 게이트 실효 검증 이관 — 렌더 역할 네임스페이스 (RULE-07 §처리 · RULE-06 §게이트 실효 검증)

아래는 **'가정 주입 요구' 부류**라 체크박스로 두지 않으며, 검출 방향을 보존한 채 **수리 task 의 `## 검증/DoD`** 로 이관한다. developer 는 `RULE-04` notes 에 `injection: N/N detect` · `control: M/M pass` 를 박제한다. **이관처 task 가 발행되기 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

- **(Dir-7) 식별 결정성 — 비-0 경로** — 비-0 집계 픽스처에서 **막대 슬롯 클래스 1개짜리 단독 선택자**로 조회한 요소가 인라인 `style.width` 를 보유한다(빈 문자열이 아니다). 역할 분리를 되돌리면 이 단언이 `rc≠0` → 원복 → `rc=0`.
- **(Dir-8) 0 경계 비대칭의 소멸** — 0 집계 픽스처에서도 같은 단독 선택자가 막대를 반환한다. **이 방향이 없으면 (Dir-7) 만으로는 "0 에서만 통과하던" 종전 비대칭이 반대 방향으로 재발한 것을 구별하지 못한다** (§동작 (N-2)).
- **(Dir-9) 특이도** — 주입 없이 현 트리 실행 → `npx vitest run src/Monitor` `rc=0` · `npm test` `rc=0`.
- **(Dir-70) 시각 불변 (NFR)** — 분리 전후 두 역할 요소의 `class` 를 CSS 규칙에 대입했을 때 적용되는 **선언 집합이 같다**. 리터럴 재구현 방향은 (N-8) 이 정적으로 잡으나, 변수는 유지한 채 **다른** 변수를 참조하는 방향은 이 주입에서만 드러난다.

### 식별자 대응표 — 렌더 역할 네임스페이스 (외부 참조 호환)

병합 전 slug `components/monitor-render-role-class-namespace-disjointness` (REQ-20260825-009) 의 식별자 대응이다. **`N-n` 은 그대로 보존**했다 — 외부 게이트가 `:N-5` · `:N-6` 을 슬러그와 함께 지목하기 때문이다. 충돌한 것은 `Dir-n` 뿐이다 (본 문서가 렌더 값 유효성 축에서 `Dir-1`~`Dir-6` 을 이미 쓴다).

| 병합 전 | 본 문서 |
|---|---|
| (N-1) ~ (N-8) | **동일 — (N-1) ~ (N-8)** |
| (Dir-1) 식별 결정성 — 비-0 경로 | **(Dir-7)** |
| (Dir-2) 0 경계 비대칭의 소멸 | **(Dir-8)** |
| (Dir-3) 특이도 | **(Dir-9)** |
| (Dir-4) 시각 불변 (NFR) | **(Dir-10)** |
| 회귀 중점 (신설) | **R-10 ~ R-12** |

슬러그 참조 갱신 대상 2건: `blue/testing/acceptance-command-measures-declared-subject.md` (C-3 판정 명령이 slug 를 열거한다) · `green/testing/judgement-command-derivation-completeness.md`.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | inspector tick 222 / HEAD=`ff699f9` (TSK-20260825-16 `a131c07`) | **drift reconcile — 셸 축 6항에 판정 명령 부착 + 테스트 현황 2항 사실 정정.** 셸 축은 6항이 전부 `[x]` 인데 측정 명령이 없어 planner tick 13 이 승격을 거부한 자리였다. TSK-20260825-16 이 채널을 부착했고 (`51`행·`it` 2·`expect(` 1 → `237`행·`it` 7·`expect(` 24) 본 tick 이 **재측정 후** 명령을 박제했다 — `npx vitest run src/Monitor/Monitor.test.jsx` `rc=0` (7 passed) + 항목별 단언 실재 grep. **`result.md` 주장은 인용하지 않았다**: (a) 6방향 주입을 격리 사본에서 **독립 재현**해 `injection: 6/6 detect` 확인, (b) (4) 의 순서 비종속을 단독 실행(`1 passed / 6 skipped`)과 전체 실행 양쪽 `rc=0` 으로 확인, (c) (5) 가 공허하지 않음을 prop 기록기 + 고정 색 대조로 확인. **테스트 현황 정정 2건**: 종전 `[x] Monitor.test.jsx — non-admin 리다이렉트, fullscreen on/off, 4 패널 마운트` 는 사실이 아니었고 (착수 시점 `redirect if not admin` 은 단언 0개), 종전 `[x] 각 패널 / 아이템 .test.jsx (ApiCallMon/Item, ContentMon/Item, …)` 도 사실이 아니다 — `ApiCallMon.test.jsx`·`ContentMon.test.jsx` 는 **부재**다 (디렉터리 열거 실측). 파생 state 축·렌더 값 유효성 축은 HEAD=`ff699f9` 에서 전수 재실행해 불변 ack (`check:monitor-state-immutability` `files=8 bindings=25 shadowed=2 directions=6` · `npx vitest run src/Monitor/` 6 files / **62** tests rc=0). | 발화 채널, 테스트 현황, 수용 기준, 참고 |
| 2026-08-25 | inspector tick 221 / HEAD=`6f58541` (TSK-20260825-12 `4014c66`) | **`components/webvitals-aggregation-render-value-validity` (green) 병합 + 렌더 값 유효성 축 5/5 충족 플립.** 운영자가 세운 `components/` = `src/` 구현 단위 1:1 원칙을 두 번째로 적용했다 — 그 spec 의 스코프가 `src/Monitor/WebVitalsItem` 이라 `monitor` 에 귀속되며, 별 파일로 승격하면 `blue/components/` 에 구현 단위 아닌 이름이 다시 생긴다. 병합 방식은 운영자 판본을 따랐다: 식별자·측정 명령 보존, `§동작` 을 갈래로 분리, 회귀 중점·테스트 현황·수용 기준 동일 기준 분리, 계보 보존. **식별자만 `G-n` → `V-n` 으로 이동**했다 — 두 축이 각각 `G-1` 을 써서 한 문서 안에서 충돌하기 때문이며, 외부 참조는 §참고 §식별자 대응표가 해소한다. **근거 서술 정정 2건 (실측)**: (1) tick 220 판본의 "DOM 은 무효값을 실제로 보유한다" 는 거짓 — 렌더러가 무효 선언을 통째로 폐기해 `style.width === ""` · `getAttribute("style") === null` 이 된다. 귀결은 "막대가 폭 선언을 잃는다" + "`NaN` 문구 부재 단정은 민감도 0" 두 가지이며, 이에 따라 V-1 전수 항목의 판정을 **문구 부재에서 유효성 매치로 교체**했다. (2) tick 220 판본이 V-6 의 주 근거로 든 "`toRate` 반환값 변경이 `evaluation` 을 흔든다" 는 재현되지 않는다 — `""` 와 `"0"` 은 관계 비교에서 둘 다 `0` 으로 강제변환되고 0 집계의 `evaluation` 은 `0 < totalCount` 가 거짓이라 `"None"` 으로 떨어진다. V-6 의 근거는 **사용자 관측 텍스트** 하나로 축소했다. 두 정정 모두 TSK-20260825-12 developer 가 구현 중 측정으로 최초 관측한 것이며 (문면대로 구현하면 검출력 0 게이트가 남는 자리였다), 본 tick 이 독립 재현 후 계약에 반영했다. **관측 표면 함정 1건도 계약에 승격**했다 — 평가 헤더 span 이 슬롯 클래스를 공유하고 막대보다 앞서 렌더되므로 슬롯 단독 선택자는 비-0 경로에서만 헤더를 잰다 (§공개 인터페이스 · R-9). | all |
| 2026-08-25 | operator (수동) | **`components/monitor-derived-state-immutability` 병합.** `components/` 는 `src/` 구현 단위 1:1 원칙이며 파생 state 축의 스코프가 `src/Monitor/**` 로 본 문서와 동일하다. G-1~G-4 식별자와 측정 명령은 그대로 보존했고, 외부 참조 6곳(`scripts/check-monitor-state-immutability.sh`, `ci.yml`, `WebVitalsItem.jsx`, `WebVitalsItem.test.jsx`, green spec 2곳)의 slug 를 `monitor` 로 갱신했다. | all |
| 2026-08-25 | TSK-20260825-10 `d672a28` | 게이트 검출 방향 확대 — 복합 대입 `+=` · 증감 `++` · 논리 대입 `||=` · 배열 변이 `.push()` 를 흡수하고 선언·구현 정합 자가 단언을 부착 (`injection: 14/14 detect`). 섀도잉 계수 `shadowed=2` 를 ack 에 노출해 조용한 skip 배제. | 동작 §파생 state 1, 회귀 중점 R-4, 발화 채널 |
| 2026-08-25 | TSK-20260825-02 `9e93c23` · TSK-20260825-03 `c89f6dc` (inspector tick 220 Phase 1) | **drift reconcile — 파생 state 수용 기준 0/4 → 4/4, 테스트 현황 3건 플립.** 네 측정 명령을 HEAD=`8da63f6` 에서 전수 재실행해 확인했다 (`result.md` 주장 미인용): G-1 도출 열거 13 → **0 line** · 보조 `setEvaluationResult(evaluationResult)` 1 → **0** · `npm run check:monitor-state-immutability` rc=0 (비공허) / G-2·G-3 `npx vitest run src/Monitor/WebVitalsItem.test.jsx` rc=0 + 단언 실재·production export 소비 확인 / G-4 자기 참조 deps 1 → **0** (`:134` → `:153` `[isMount, name]`) + `npx vitest run src/Monitor/` rc=0. | 동작 §파생 state, 회귀 중점, 발화 채널, 테스트 현황, 수용 기준, 참고 |
| 2026-08-25 | REQ-20260825-001 (inspector tick 219) | 파생 state 축 최초 등록. followup `20260824-2020-webvitalsitem-state-object-mutation` → discovery req 를 **불변식으로 재정식화**해 흡수 (RULE-07 §결함 신고 재정식화). req 의 FR-01 판정 grep 은 그대로 쓰지 않았다 — 원안은 `src/Monitor` 전체 점 표기 대입을 훑어 **34 line** 을 내며 그중 21 line 이 정당한 코드라 "0 line" 이 될 수 없고, 남은 필터가 사람 판단이라 `RULE-07 §수용 기준 문장 규약`을 위반한다. 파일별 `useState` 바인딩명을 **도출**하는 판정으로 교체해 실측 **13 line** (위반 전량, 오탐 0) 을 얻었다. G-1↔G-4 의 **순서 의존**을 신규 명시했다 — req 에는 없던 항목이며 함께 처리하지 않으면 수정이 회귀를 만든다. | 동작 §파생 state, 역할 |
| 2026-04-20 | operator / — | 셸 축 최초 등록 (as-is 서술 spec) | 역할, 공개 인터페이스, 동작 §페이지 셸, 회귀 중점 §페이지 셸 |
| 2026-08-27 | (operator) | **`components/monitor-render-role-class-namespace-disjointness` 를 4번째 축으로 병합.** `components/` 는 `src/` 구현 단위와 1:1 이라는 운영자 원칙에 따른다 — 그 문서는 `src/Monitor/` 의 렌더 역할 계약이지 별도 구현 단위가 아니다. `N-n` 은 외부 게이트가 slug 와 함께 지목하므로 **보존**했고, 충돌한 `Dir-1`~`Dir-4` 만 `Dir-7`~`Dir-10` 으로 재배치했다 (본 문서가 `Dir-1`~`Dir-6` 사용 중). 회귀 중점 R-10~R-12 신설. **수용 기준 명령은 손으로 옮기지 않고 원본에서 프로그램으로 추출해 이식했다.** | 동작 · 회귀 중점 · 발화 채널 · 테스트 현황 · 수용 기준 · 참고 |
