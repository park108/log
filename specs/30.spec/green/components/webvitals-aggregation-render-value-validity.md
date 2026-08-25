# WebVitals 집계 → 렌더 값 매핑의 유효성 계약 (0 경계 포함)

> **위치**: `src/Monitor/WebVitalsItem.jsx` 의 파생 값 매핑 함수쌍 `toRate` (`:31`) · `toStyle` (`:33`) 과 그 소비처 — `buildEvaluationResult` (`:36`) 가 세 슬롯(`good`/`needImprovement`/`poor`)의 `rate`·`style` 을 조립하고(`:76-78`), 렌더가 `:203`·`:206`·`:209` 에서 `style={...}` 로 인라인 적용한다.
> **관련 요구사항**: REQ-20260825-006 (webvitals-empty-aggregation-render-contract)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 220 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

`WebVitalsItem` 이 집계 결과로부터 만들어 DOM 에 싣는 값은 **집계 총량과 무관하게 언제나 유효한 값**이다. 특히 집계 대상이 0건인 정상 입력에서도 `NaN`·`Infinity`·`undefined` 가 렌더 결과에 실리지 않는다.

`RULE-07 §주제 우선순위` **1순위 (사용자 관측 가능 동작)** 귀속이다 — 판정 대상은 렌더된 DOM 의 속성값이며 설정·토큰 축이 아니다.

**0건은 예외가 아니라 설계된 정상 상태다.** `buildEvaluationResult` 는 `items` 가 falsy 이거나 어떤 항목도 세 평가 분류에 들지 않으면 `totalCount === 0` 을 만들고, `:66,:70` 계열 분기가 그 상태를 `evaluation = "None"` 으로 **명시적으로 취급**한다. 즉 코드는 이미 0건을 정상 입력으로 인정하고 있으며, 그 인정된 상태에서만 무효값이 발생한다. 계약이 없으면 "정상 입력이 무효 출력을 만든다" 는 모순이 조용히 유지된다.

**브라우저가 무효 CSS 를 버린다는 사실은 면제 사유가 아니다.** `width: NaN%` 는 렌더링을 깨뜨리지 않으므로 화면만 봐서는 발견되지 않는다. 그러나 (a) DOM 은 무효값을 실제로 보유하고, (b) 스냅샷·시각 회귀·접근성 도구 등 DOM 을 읽는 소비자는 그 값을 그대로 본다. **관측되지 않는다는 것이 유효하다는 뜻은 아니다.**

의도적으로 하지 않는 것:
- (i) 색상·레이아웃·CSS 클래스 변경.
- (ii) 백엔드 응답 스키마 변경과 `evaluation` 값 정규화(대소문자 변형 수용 등). 본 계약은 **결과의 안전성**만 규정하고 원인(응답 형상)은 규정하지 않는다.
- (iii) `totalCount > 0` 경로의 산술 변경. 본 계약은 0 경계만 규정한다 (G-4).
- (iv) fetch·상태 전이 경로 — 직교 spec `monitor-derived-state-immutability` (slug 식별) 의 축이다.
- (v) 가드의 **구현 수단** 선택(삼항·early return·기본값 등) — planner·developer 영역.

## 공개 인터페이스

없음 (내부 렌더 값 매핑 계약). 관측 표면은 세 상태 막대 `span.span--monitor-bar` 의 `style.width` (`:203` `span--monitor-good` · `:206` `span--monitor-warn` · `:209` `span--monitor-poor`) 와 그 안의 비율 텍스트(`:204`·`:207`·`:210`) 다.

## 동작

1. **(G-1) 렌더 값의 유효성** — 세 상태 막대의 `style.width` 는 항상 유효한 CSS 길이 문자열이다. `NaN`·`Infinity`·`undefined` 를 포함하는 문자열을 내지 않는다.
   - **HEAD=`8da63f6` 실측: 위반.** `toStyle` (`:33`) 은 `100 * count / totalCount + "%"` 이며 `totalCount === 0` 이면 `0/0 → NaN` 이다. 독립 재현 (inspector tick 220, 함수 본문 그대로 실행):
     ```
     toStyle(0, 0) → { width: "NaN%" }
     toStyle(1, 3) → { width: "33.333333333333336%" }
     ```
2. **(G-2) 0 경계의 값** — `totalCount === 0` 이면 세 막대의 `style.width` 는 `"0%"` 다. 폭이 없는 막대가 "집계 대상 없음" 의 표현이다.
3. **(G-3) 인접 축 보존** — `totalCount === 0` 일 때 헤더는 `"<지표명> (0)"`, 평가 라벨은 `"None"` 을 유지한다. G-2 도입이 이 두 축을 흔들지 않음을 고정한다 (직교 spec `monitor-derived-state-immutability` G-2 가 세운 동작의 회귀 방지).
4. **(G-4) 비-0 경로 불변** — `totalCount > 0` 인 경우의 폭 산술(`100 * count / totalCount`)은 변경되지 않는다. 0 경계 가드 도입이 정상 경로 값을 바꾸면 그것은 계약 충족이 아니라 회귀다.
   - 현 HEAD 실측 기준값 (`webVitalsProd` — good 1 / needImprovement 1 / poor 1, `totalCount` 3): 세 막대 전부 `width: "33.333333333333336%"`. **반올림·`toFixed` 도입은 이 값을 바꾸므로 G-4 위반이다.**
5. **(G-5) 함수쌍의 0 경계 대칭** — 비율 텍스트(`toRate`)와 막대 폭(`toStyle`)은 동일한 0 경계 가드를 갖는다. 같은 함수쌍의 인접 분기에서 한쪽만 방어된 상태를 계약 위반으로 본다.
   - **HEAD=`8da63f6` 실측: 비대칭.** `toRate` (`:31`) 는 `0 === count ? ""` 로 텍스트 축을 방어하지만 `toStyle` (`:33`) 에는 대응 가드가 없다. `:32` 주석 `"totalCount 가 0 이면 \"NaN%\" 가 되는 현행 산술을 그대로 이식한다 (스코프 밖)"` 이 이 비대칭을 코드에 박제하고 있다 — 알려진 채로 남겨진 상태다.
   - **대칭화의 경계 조건 (중요).** `toRate` 의 0 경로 반환값을 `""` 에서 바꾸면 **사용자 관측 텍스트가 바뀐다** — `:204`·`:207`·`:210` 이 `rate` 를 그대로 렌더하므로, 예컨대 `"0"` 을 반환하면 빈 막대에 `0` 이 표시된다. G-5 가 요구하는 것은 **가드의 존재 대칭**이지 반환값 통일이 아니다. `toRate` 의 현행 반환값 `""` 는 보존한다 (G-6).
   - 부수 확인: 평가 분기(`75 <= goodRate` / `25 < poorRate`)는 **문자열 `rate` 를 비교**한다. `""` → `0` 강제변환에 의존하므로 반환값 변경은 `evaluation` 산출까지 흔들 수 있다. 이 결합이 G-6 을 Must 로 두는 이유다.
6. **(G-6) 비율 텍스트 보존** — `toRate` 의 반환 표기는 현행을 유지한다: `count === 0` 이면 빈 문자열, 아니면 백분율 정수 문자열(`toFixed(0)`).

## 의존성

- 내부: `src/Monitor/WebVitalsItem.jsx` (계약 대상), `src/Monitor/__fixtures__/monitor.js` (`webVitalsProd` 외), `src/Monitor/api.mock.js` (`prodServerOk` / `prodServerEmpty`).
- 외부: `vitest` + `@testing-library/react`, `msw`, jsdom 의 `style` 속성 반영 의미론.
- 역의존 (사용처): `src/Monitor/WebVitalsMon.jsx` 가 지표별로 `WebVitalsItem` 을 렌더 — 0 경계 무효값은 6개 지표(CLS/FID/LCP/INP/FCP/TTFB) 전부에 동시에 나타난다.
- 직교 spec: `monitor-derived-state-immutability` (slug 식별) — 파생 state 의 불변 교체·필드 완전성 축. 본 spec 은 조립된 값의 **유효성** 축이라 직교한다.

## 회귀 중점

1. (R-1) 0 경계 무효값 재발 — 새 파생 필드가 같은 `count / totalCount` 꼴로 추가되면서 가드를 빠뜨리는 부류. G-1 이 값 형태로, G-5 가 함수쌍 대칭으로 잡는다.
2. (R-2) 가드 도입이 정상 경로를 바꿈 — 반올림·`toFixed`·문자열 포맷 변경. G-4 가 기준값을 고정한다.
3. (R-3) 대칭화가 텍스트를 바꿈 — `toRate` 의 `""` 를 `"0"` 등으로 통일. G-6 이 차단한다. **가장 실현 가능성이 높은 회귀**다. "대칭" 을 반환값 통일로 읽으면 자연스럽게 도달하는 오답이기 때문이다.
4. (R-4) 관측 공백 — `style.width` 를 단언하는 테스트가 HEAD 에 **0건**이다 (`grep -c "width" src/Monitor/WebVitalsItem.test.jsx` → 0). 이 축은 현재 어떤 채널도 보지 않으므로, 값이 무효로 돌아가도 전 게이트가 초록이다.

## 발화 채널

**HEAD=`8da63f6` 에 이 축의 발화 채널이 없다.** `WebVitalsItem.test.jsx` 에 `width`·`style` 단언 0건이며, 정적 게이트도 없다.

| 게이트 | HEAD 채널 | 상태 |
|---|---|---|
| G-1 / G-2 (0 경계 값) | 없음 | **부착 필요** — 렌더 단언 신설 |
| G-3 (인접 축 보존) | `WebVitalsItem.test.jsx:309` (`(0)` + `None`) | 존재 — 본 spec 은 재사용만 한다 |
| G-4 (비-0 불변) | 없음 | **부착 필요** — 기준값 단언 신설 |
| G-5 / G-6 (대칭·표기) | 없음 | **부착 필요** |

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** "0 경계 가드를 제거하면 `rc≠0`" 은 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니다. 검출 방향을 보존한 채 **채널 부착 task 의 `## 검증/DoD`** 로 이관한다 — developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다.

- (Dir-1) `toStyle` 의 0 가드 제거 → 0 경계 테스트 `rc≠0` (`NaN%` 검출). 원복 → `rc=0`.
- (Dir-2) `toRate` 의 0 경로 반환을 `"0"` 으로 변경 → G-6 단언 `rc≠0`. **대칭화 오답을 실제로 잡는지 확인하는 방향**이며 (R-3) 의 직접 대응이다.
- (Dir-3) 비-0 경로에 `toFixed(0)` 주입 → G-4 기준값 단언 `rc≠0`.

> 관측 표면 주의 (`RULE-06 §관측 표면`) — 단언은 `buildEvaluationResult` 반환값 단위 격리만으로 끝내지 않고 **렌더된 DOM 노드의 `style.width`** 를 최소 1건 포함한다. 조립 함수가 옳아도 렌더 경로가 그 값을 싣지 않는 회귀는 단위 단언이 보지 못한다.

## 테스트 현황

- [x] 빈 응답의 헤더·라벨 — `src/Monitor/WebVitalsItem.test.jsx:309` (`"Cumulative Layout Shift (0)"` + `None`). G-3 이 재사용한다.
- [x] 비어있지 않은 응답의 헤더 카운트 — `:293`.
- [ ] 0 경계의 `style.width` 단언 — HEAD 0건. G-1/G-2 의 부착 대상.
- [ ] 비-0 경로 폭 기준값 단언 — HEAD 0건. G-4 의 부착 대상.
- [ ] `toRate` 0 경로 표기 단언 — HEAD 0건. G-6 의 부착 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 측정 명령은 `src/**` 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2). **HEAD=`8da63f6` 기준 0/5** — 신규 등록이며 전 항목 미충족이 정상이다.

- [ ] (Must) G-1/G-2: `prodServerEmpty` 렌더에서 `span--monitor-good` · `span--monitor-warn` · `span--monitor-poor` 세 노드의 `style.width` 가 각각 `"0%"` 다. 판정: `npx vitest run src/Monitor/WebVitalsItem.test.jsx` → `rc=0` **이면서** 그 파일에 `width` 단언이 실재 — `grep -c "width" src/Monitor/WebVitalsItem.test.jsx` → **1 이상**. **HEAD 실측 0 → 미충족** (명령은 rc=0 이나 이 축을 측정하지 않는 공허 통과 상태).
- [ ] (Must) G-1 (무효값 전수): `prodServerEmpty` 렌더 결과의 `span--monitor-bar` 전 노드를 순회해 `style.width` 에 `NaN` 을 포함하는 것이 **0건**임을 단언하는 테스트가 실재하고 통과한다. 순회는 클래스 선택자 열거로 하고 노드 수 하한(≥ 3)을 함께 단언한다 — 대상 집합이 비면 "0건" 은 무조건 참이 된다 (공허 통과 차단). **HEAD 미충족** (0건).
- [ ] (Must) G-3: 같은 렌더에서 헤더 `"Cumulative Layout Shift (0)"` 와 라벨 `"None"` 이 그대로 관측된다. 판정: 위 vitest rc=0 + `grep -c '(0)' src/Monitor/WebVitalsItem.test.jsx` → **1 이상** (HEAD 실측 충족 — 본 항목은 G-2 도입 후에도 유지됨을 요구하므로 `[x]` 는 G-2 착지와 함께 판정한다).
- [ ] (Must) G-4: `prodServerOk` (`webVitalsProd`, `totalCount` 3) 렌더에서 세 막대의 `style.width` 가 **`"33.333333333333336%"`** 로 현행과 동일하다. 판정: 위 vitest rc=0 + 해당 리터럴 단언 실재 — `grep -c "33.333333333333336" src/Monitor/WebVitalsItem.test.jsx` → **1 이상**. **HEAD 실측 0 → 미충족.**
- [ ] (Must) G-6: 0 집계에서 **비율 텍스트가 빈 문자열로 보존**됨을 단언하는 테스트가 실재하고 통과한다. 판정 대상은 이미 export 된 표면이다 — `buildEvaluationResult(undefined)` 의 `good.rate`/`needImprovement.rate`/`poor.rate` 가 각각 `""` (inspector tick 220 실측: `toRate(0, 0)` → `""`). 판정: `npx vitest run src/Monitor/WebVitalsItem.test.jsx` → `rc=0` **이면서** `grep -c "\.rate" src/Monitor/WebVitalsItem.test.jsx` → **1 이상**. **HEAD 실측 0 → 미충족.**
  - G-5(함수쌍 0 경계 대칭)는 **별도 명령을 두지 않는다.** 대칭은 두 축이 각각 0 경계에서 단언될 때 성립하며, 폭 축은 위 G-1/G-2 가, 텍스트 축은 본 항목이 잡는다 — 두 항목이 함께 `[x]` 인 상태가 곧 G-5 충족이다.
  - **가드 토큰 grep 을 판정에 쓰지 않는 이유**: `grep -qE "0 === count \?|totalCount === 0"` 류는 **현 HEAD 에서 이미 매치한다** — `toRate` (`:31`) 의 기존 가드가 걸리기 때문이다 (inspector tick 220 실측). 구현 토큰은 어느 함수의 가드인지 구분하지 못해 미충족 상태에서 통과를 내므로, 판정은 값 단언으로만 한다.

## 참고

- 원 followups: `20260825-0646-webvitals-empty-response-nan-width` (`category: latent-defect`, `source_task: TSK-20260825-02`) · `20260825-0645-webvitals-header-count-manual-verification` (헤더 `(0)` 축은 G-3 으로 흡수).
- **회귀가 아니라 선재 잠복 결함이다.** TSK-20260825-02 의 `## 범위 밖` 이 이 산술 정정을 명시 배제했고 developer 는 값을 바꾸지 않고 이식했다 (`:32` 주석이 그 사실을 코드에 박제). 파생 state 불변 교체 이전부터 존재하던 동작이므로 그 task 의 회귀가 아니며, **스코프 규칙이 설계대로 작동한 사례**다 — 범위 밖 결함을 임의 수정하지 않고 followup 으로 올렸다.
- inspector tick 220 이 `toRate`/`toStyle` 본문을 그대로 실행해 `NaN%` 를 독립 재현했고, `width` 단언 0건도 직접 확인했다 (req 주장 미인용).

### 미측정·비판정 항목

- **실백엔드 응답 형상과 픽스처의 일치.** prod 의 `Items[].evaluation` 이 픽스처와 다른 형상(대소문자 변형·필드 누락)을 가지면 집계가 0 으로 떨어진다. 브라우저·실 API 접근이 없어 현 HEAD 에서 명령 1회로 rc 판정할 수 없다 (미측정 NFR 부류). 다만 **그 갭이 실현되는 순간의 렌더 결과는 본 spec 이 규정한다** — 형상이 어긋나 집계가 0 이 되어도 화면에는 `NaN%` 대신 `0%` 막대와 `None` 라벨이 나온다. 본 spec 은 원인이 아니라 결과의 안전성을 고정한다.
- **실응답 스냅샷의 픽스처 승격 / 운영자 1회 육안 확인.** 별도 축(픽스처 대표성)이며 측정 채널이 정의된 뒤에 spec 자격을 얻는다.
- **0 경계 가드의 주입 검출력.** '가정 주입 요구' 부류 — §발화 채널의 (Dir-1)~(Dir-3) 으로 채널 부착 task DoD 에 이관했다.
- **`width: NaN%` 의 브라우저별 처리.** 무효 CSS 값의 폐기는 명세 동작이나 본 spec 은 브라우저 동작이 아니라 **DOM 이 보유한 값**을 판정한다. 렌더링 결과의 시각적 동일성은 측정 채널이 없어 체크박스로 두지 않는다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-006 (inspector tick 220) | 최초 등록. followup 2건(`0646`·`0645`)을 통합한 req 를 **불변식으로 재정식화**해 흡수. req 의 수용 기준 4번("막대 폭 합이 `100%` 에 해당하는 기존 값을 유지")은 그대로 쓰지 않았다 — `totalCount` 3 에서 세 막대는 각 `33.333333333333336%` 라 합이 `100%` 가 아니며(부동소수 잔차), "에 해당하는 기존 값" 은 명령 1회로 rc 판정되지 않는다 (`RULE-07 §수용 기준 문장 규약`). 현행 리터럴을 실측해 기준값으로 고정하는 G-4 로 교체했다. **신규 추가 (req 에 없던 항목)**: (a) G-6 — `toRate` 의 0 경로 반환값 `""` 보존. req 의 FR-05("동일한 0 경계 가드")를 반환값 통일로 읽으면 빈 막대에 `0` 텍스트가 표시되는 **사용자 관측 동작 변경**이 되고, 나아가 문자열 `rate` 를 비교하는 평가 분기(`75 <= goodRate` / `25 < poorRate`)까지 흔든다 — inspector tick 220 이 코드 실측으로 확인했다. (b) 공허 통과 차단 — "NaN 포함 0건" 단언에 노드 수 하한을 요구한다. (c) 관측 표면 조건 — 단위 격리 단언만으로 끝내지 않고 렌더된 DOM 노드를 최소 1건 포함한다 (`RULE-06 §관측 표면`). req 의 NFR-01(주입 부류 아님)은 G-1 에 흡수했고, 가드 제거 주입 3방향은 채널 부착 task DoD 로 이관했다. | all |
