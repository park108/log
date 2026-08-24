# Monitor 파생 state 불변 교체 · 렌더 필드 완전성 계약

> **위치**: `src/Monitor/**` 의 `useState` 보유 객체 state. 최소 재현 사례는 `src/Monitor/WebVitalsItem.jsx` 의 `evaluationResult` (`useState` 초기값 `:29`, in-place 대입 `:83-105`, 동일 참조 set `:108`, 렌더 소비 `:175`). 준수 대조군은 `src/Monitor/ApiCallItem.jsx:100` `setRateColor({ ... })`.
> **관련 요구사항**: REQ-20260825-001 (monitor-derived-state-immutability)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 219 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

Monitor 영역 컴포넌트가 `useState` 로 보유한 **객체 state 는 in-place 로 변이되지 않고 새 참조로 교체**되며, 교체 객체는 **렌더 경로가 읽는 필드를 전수 포함**한다.

두 명제는 하나의 사슬이다. in-place 변이는 "빠진 필드"를 **은폐**한다 — 기존 객체를 그대로 두고 일부 키만 덮어쓰므로, 갱신 경로가 어떤 키를 잊어도 그 키는 초기값을 단 채 살아남아 화면에 표시된다. 새 객체를 조립했다면 같은 누락이 `undefined` 로 즉시 드러난다. 따라서 불변 교체(G-1)는 완전성(G-3)의 **검출 수단**이고, 사용자 관측 동작(G-2)은 그 사슬이 끊겼을 때 나타나는 **증상**이다.

`RULE-07 §주제 우선순위` **1순위 (사용자 관측 가능 동작)** 귀속이다. 현 HEAD 에서 이 사슬은 실제로 끊겨 있다 — §동작 (G-2) 참조.

의도적으로 하지 않는 것:
- (i) unmount 후 발화 차단 — `cancelled` ref 가드는 이미 도입돼 있고 (`WebVitalsItem.jsx:50,:132`) 본 계약과 독립이다. `useRef` 의 `.current` 대입은 **변이가 아니다** — ref 는 렌더를 유발하지 않는 가변 상자이며 본 계약의 대상이 아니다.
- (ii) fetch 응답으로 받은 **지역 배열·객체**의 변이 (`ApiCallItem.jsx:80-81` `item.date = ...`, `VisitorMon.jsx:63-64,:90`, `ContentItem.jsx:102`). 이들은 state 가 아니라 set 직전에 조립되는 지역값이므로 참조 동일성 문제가 없다.
- (iii) Monitor 이외 영역(Log/Image/Search/Comment)으로의 확대 — 위반 0 이 확인된 영역까지 스코프를 넓히지 않는다.
- (iv) `useMemo`·reducer 도입 여부 등 **구현 수단** 선택 — planner·developer 영역. 본 spec 은 결과 계약만 박제한다.

## 공개 인터페이스

없음 (내부 state 관리 계약). 관측 표면은 `WebVitalsItem` 이 렌더하는 지표 헤더 텍스트 `"<description> (<totalCount>)"` (`WebVitalsItem.jsx:175`) 와 평가 라벨 (`:176`) 이다.

## 동작

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
   - **현 HEAD(`1c9f94d`) 실측: 13 line — 위반.** 전량 `src/Monitor/WebVitalsItem.jsx` 의 `evaluationResult` (`:83,84,85,87,88,89,91,92,93,96,99,102,105`). 다른 7개 `.jsx` 는 0 line.
   - **검출 경계 (과신 금지)**: 위 패턴은 **행 선두 앵커 + 점 표기 대입** 한정이다. `state[key] = ...` (대괄호 표기) · `Object.assign(state, ...)` · 여러 줄에 걸친 대입은 매치하지 않는다. 현 HEAD 에서 그 세 형태는 `src/Monitor/**` 에 0건이므로 실측 13 은 위반 전량이지만, **게이트로 승격할 때는 이 세 방향을 검출 선언에 포함할지 먼저 정해야 한다** (`RULE-06 §게이트 실효 검증` — 선언한 방향 수만큼 주입).
2. **(G-2) 지표 헤더 카운트의 응답 반영** — `WebVitalsItem` 헤더는 응답 `body.Items` 중 `evaluation` 이 `GOOD` · `POOR` · `NEEDS IMPROVEMENT` 인 항목 수의 **합**을 표시한다. 그 밖의 `evaluation` 값은 세지 않는다. 응답이 비었을 때만 `0` 이다.
   - **현 HEAD 실측: 위반 — 헤더가 응답과 무관하게 영구 `(0)` 이다.** `evaluationResult.totalCount` 에 대입하는 라인이 존재하지 않는다 (`grep -cE 'evaluationResult\.totalCount[[:space:]]*=' src/Monitor/WebVitalsItem.jsx` → **0**). `totalCount` 는 `:81` 에서 **지역 `const`** 로만 계산돼 비율(`:87-89`)·막대 폭(`:91-93`)·평가 분기(`:101`) 에만 쓰이고, `useState` 초기값 `totalCount: 0` (`:29`) 이 그대로 `:175` 에서 렌더된다. 비율 막대는 정확한데 **옆의 총계만 0 으로 굳어 있다** — 부분적으로 맞는 화면이라 눈에 덜 띈다.
   - 기존 테스트가 놓친 이유: `src/Monitor/WebVitalsItem.test.jsx` 에 헤더 카운트를 단언하는 케이스가 **0건**이고, `totalCount` 라는 낱말이 등장하는 유일한 지점은 `:118` 의 케이스명 `empty result set (totalCount = 0)` 다. **0 을 기대하는 경로만 존재**하므로 영구 0 결함이 통과한다.
   - 판별 픽스처: `webVitalsProd` (`src/Monitor/__fixtures__/monitor.js:3`) 는 `Items` 4건 중 1건이 `"BAD DATA"` 라 **기대 카운트가 `Items.length`(4) 가 아니라 3** 이다. 이 픽스처는 "응답 항목 수" 와 "평가 항목 수" 를 구분하므로 G-2 의 판별력이 있다.
3. **(G-3) 교체 객체의 렌더 필드 완전성** — `set*` 에 전달되는 파생 객체의 키 집합은 `useState` 초기값의 키 집합을 **포함**한다. 갱신 경로가 잊은 키가 초기값을 단 채 렌더 표면에 남는 상태를 허용하지 않는다.
   - 이것이 `totalCount` 부류의 **재발 방지 축**이다. G-2 는 이미 알려진 1개 필드를 고정하지만, G-3 은 아직 추가되지 않은 필드까지 덮는다.
   - 판정은 정적 grep 으로 불가하다 (객체 조립은 런타임 값). 테스트로 박제한다 — §수용 기준 (G-3).
4. **(G-4) effect deps 의 자기 참조 배제** — fetch effect 의 deps 배열은 **그 effect 자신이 갱신하는 state** 를 포함하지 않는다.
   - 현 HEAD: `WebVitalsItem.jsx:134` `}, [isMount, name, evaluationResult]);` — effect 가 `setEvaluationResult` 를 호출하면서 `evaluationResult` 를 deps 에 둔다. 현재는 동일 참조 set 이라 `Object.is` bail-out 으로 재실행이 없지만, **G-1 을 충족시켜 새 참조로 바꾸는 순간 이 항목은 무한 재fetch 루프가 된다.** G-1 과 G-4 는 함께 처리해야 하며 순서 의존이 있다.
   - `eslint` 는 이것을 잡지 않는다 — `react-hooks/exhaustive-deps` 는 `'warn'` (`eslint.config.js:70`) 이고 **불필요한 deps 추가**는 그 규칙의 검출 대상이 아니다. `npx eslint src/Monitor/WebVitalsItem.jsx` 는 현 HEAD 에서 무출력(clean)이다. 따라서 G-4 는 기존 자동 게이트와 중복이 아니다.

## 의존성

- 내부: `src/Monitor/WebVitalsItem.jsx` (계약 대상), `src/Monitor/api.js` `getWebVitals`, `src/Monitor/__fixtures__/monitor.js` (`webVitalsProd` 외 3), `src/Monitor/api.mock.js` (`prodServerOk` / `prodServerEmpty` 외), `src/common/common` (`log`).
- 외부: React `useState` / `useEffect` 참조 동일성 의미론 (`Object.is` bail-out), `msw` (테스트 서버), `vitest` + `@testing-library/react`.
- 역의존 (사용처): `src/Monitor/WebVitalsMon.jsx` 가 `WebVitalsItem` 을 지표별로 렌더한다 — 헤더 카운트 결함은 6개 지표(CLS/FID/LCP/INP/FCP/TTFB) 전부에 동시에 나타난다.

## 회귀 중점

1. (R-1) `totalCount` 영구 0 재발 — 파생 객체 조립에서 키가 누락되는 부류. G-2 가 값을, G-3 이 구조를 잡는다.
2. (R-2) G-1 충족 후의 **무한 재fetch** — 새 참조 set + 자기 참조 deps 의 조합. G-4 가 겨눈다. 회귀 시 증상은 조용하지 않다 (네트워크 폭주) 지만, 테스트에서는 `msw` 핸들러가 계속 응답해 타임아웃으로만 보일 수 있다.
3. (R-3) 위반의 타 컴포넌트 확산 — G-1 판정이 `src/Monitor/**` 전체를 도출 열거로 훑으므로 신규 파일도 자동 포함된다.
4. (R-4) 검출 경계 밖 형태로의 우회 — `state[key] = ` · `Object.assign(state, ...)` · 멀티라인 대입. 현 HEAD 0건이나 G-1 판정이 보지 못한다 (§동작 1 검출 경계).

## 발화 채널

**현 HEAD 에 자동 발화 채널이 없다.** G-1 은 `package.json` `scripts.check:*` 에도 `.husky/*` 에도 `ci.yml` 에도 등재돼 있지 않고, G-2·G-3 를 단언하는 테스트도 존재하지 않는다.

| 게이트 | 현 HEAD 채널 | 상태 |
|---|---|---|
| G-1 (정적) | 없음 | **부착 필요** — `check:*` script 신설 |
| G-2 (동작) | 없음 — `WebVitalsItem.test.jsx` 에 헤더 카운트 단언 0건 | **부착 필요** — 테스트 신설 |
| G-3 (구조) | 없음 | **부착 필요** — 테스트 신설 |
| G-4 (정적) | `eslint` 무출력 (검출 대상 아님) | **부착 필요** 또는 G-1 게이트에 병합 |

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** "G-1 게이트에 위반 1건을 주입하면 `rc≠0`, 원복하면 `rc=0`" 은 **위반을 만들어야 판정되는 '가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니다. 그 검출 방향은 **G-1 게이트를 신설하는 task 의 `## 검증/DoD`** 로 이관한다 — planner 는 그 task 에 아래를 명기하고 developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다.

- (Dir-1) `state.x = v` 점 표기 대입 1건 주입 → `rc≠0` + 그 파일·라인 출력.
- (Dir-2) 신규 `.jsx` 파일에 위반 주입 → `rc≠0` (도출 열거가 신규 파일을 포함함을 확인 — 하드코딩 회귀 방지).
- (Dir-3) 정상 트리 원복 → `rc=0`.
- §동작 1 의 검출 경계 3형태(`state[key] =` · `Object.assign` · 멀티라인)를 **검출 선언에 포함한다면** 각각 1방향씩 추가한다. 포함하지 않기로 정했다면 그 사실을 게이트 주석에 박제한다 — 선언하지 않은 방향은 주입하지 않지만, 선언하지 않았다는 사실이 기록돼야 한다.

## 테스트 현황

- [x] `WebVitalsItem` 의 평가 라벨 분기 — `GOOD` / `POOR` / `NEEDS IMPROVEMENT` / `None` (`src/Monitor/WebVitalsItem.test.jsx`).
- [x] 빈 응답 경로 — `prodServerEmpty` 에서 `None` 라벨 (`:118-` `empty result set (totalCount = 0)`).
- [ ] **비어있지 않은 응답에서 헤더 카운트 단언** — 현 HEAD 0건. G-2 의 부착 대상.
- [ ] 파생 객체 키 집합 완전성 단언 — 현 HEAD 0건. G-3 의 부착 대상.
- [ ] G-1 정적 판정의 저장소 등재 — 현 HEAD 0건.

## 수용 기준

> 전 항목 HEAD=`1c9f94d` 에서 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). **현 시점 0/4** — 본 spec 은 To-Be 를 박제한 신규 등록이며 네 항목 모두 미충족이 정상이다. 측정 명령은 `src/**` 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2).

- [ ] (Must) G-1: §동작 1 의 도출 열거 판정이 **0 line**. **HEAD=`1c9f94d` 실측 13 line → 미충족** (전량 `src/Monitor/WebVitalsItem.jsx` 의 `evaluationResult`, 행 `83,84,85,87,88,89,91,92,93,96,99,102,105`). 보조 단언 — `grep -c "setEvaluationResult(evaluationResult)" src/Monitor/WebVitalsItem.jsx` → **0** (현 HEAD **1**, `:108`).
- [ ] (Must) G-2: `prodServerOk` (`webVitalsProd` — `GOOD`/`POOR`/`NEEDS IMPROVEMENT` 각 1건 + `BAD DATA` 1건) 응답에서 `WebVitalsItem` 로드가 끝나면 헤더 텍스트가 `"Cumulative Layout Shift (3)"` 를 포함하고, `prodServerEmpty` 에서는 `"(0)"` + 라벨 `None` 이다. 판정: `npx vitest run src/Monitor/WebVitalsItem.test.jsx` → `rc=0`. **현 HEAD 미충족** — 해당 단언이 테스트 파일에 존재하지 않아 명령은 rc=0 이나 **계약을 측정하지 않는다** (공허 통과). 충족 조건은 rc=0 **이면서** 위 두 단언이 실재하는 것이며, 실재는 `grep -c '(3)' src/Monitor/WebVitalsItem.test.jsx` ≥ 1 로 함께 확인한다.
- [ ] (Must) G-3: 파생 객체 키 집합이 `useState` 초기값 키 집합을 포함함을 단언하는 테스트가 실재하고 통과한다. 판정: `npx vitest run src/Monitor/WebVitalsItem.test.jsx` → `rc=0` **이면서** 그 파일에 키 집합 비교 단언이 1건 이상 존재. **현 HEAD 미충족** (0건).
- [ ] (Should) G-4: `grep -cE "\}, \[isMount, name, evaluationResult\]\)" src/Monitor/WebVitalsItem.jsx` → **0**. **현 HEAD 실측 1 → 미충족** (`:134`). 회귀 없음 확인: `npx vitest run src/Monitor/` → `rc=0`.

## 참고

- 대조군 (준수 사례): `src/Monitor/ApiCallItem.jsx:100` `setRateColor({ color: ... })` — 새 객체 리터럴 set.
- 원 followup: `specs/10.followups/20260824-2020-webvitalsitem-state-object-mutation.md` (source_task `TSK-20260824-07-a`, severity low). 그 task 는 `## 스코프 규칙` expansion **불허** 였으므로 developer 가 정당하게 이관했다 — 스코프 규칙이 설계대로 작동한 사례다.
- 헤더 카운트 결함은 followup 원문에 없었고 discovery 가 req 작성 중 추가 발견했다. inspector 가 tick 219 에서 독립 재현했다 (대입 라인 0건 · 렌더 소비 `:175` · 테스트 공백 확인).
- 직교 spec: `specs/30.spec/blue/components/monitor.md` — Monitor 페이지 셸·패널 구성 축. 본 spec 은 아이템 컴포넌트의 state 관리 축이라 직교하며, 승격 시 별 파일로 남는다.

### 미측정·비판정 항목

- **`<React.StrictMode>` / concurrent 재실행에서의 누적 변이 관측.** 측정 채널이 없어 체크박스로 두지 않는다. G-1 을 충족하면 구조적으로 발생 불가하므로 별도 방어가 필요하지 않다.
- **`Object.is(prev, next) === true` bail-out 자체의 관측.** 현 HEAD 에서 같은 effect 의 `setIsLoading(false)` 가 리렌더를 일으켜 변이 결과가 화면에 반영되므로 bail-out 은 사용자에게 직접 보이지 않는다. 관측 가능한 귀결만 박제했다 — G-2 (`totalCount` 영구 0).
- **G-1 게이트의 주입 검출력.** '가정 주입 요구' 부류 — §발화 채널의 (Dir-1)~(Dir-3) 로 게이트 신설 task DoD 에 이관했다.
- **검출 경계 3형태의 현 HEAD 부재.** `state[key] =` · `Object.assign(state,` 는 `src/Monitor/**` 에서 0건으로 실측됐으나, "앞으로도 0건" 은 게이트가 그 방향을 선언해야 판정 가능하다. 선언 여부는 게이트 신설 task 가 정한다 (§발화 채널).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-001 (inspector tick 219) | 최초 등록. followup `20260824-2020-webvitalsitem-state-object-mutation` → discovery req 를 **불변식으로 재정식화**해 흡수 (RULE-07 §결함 신고 재정식화). req 의 FR-01 판정 grep 은 그대로 쓰지 않았다 — 원안은 `src/Monitor` 전체 점 표기 대입을 훑어 **34 line** 을 내며 그중 21 line 이 정당한 코드(`propTypes` 대입 · `useRef` 의 `.current` · 지역 응답 객체 변이)라 "0 line" 이 될 수 없고, 남은 필터가 사람 판단이라 `RULE-07 §수용 기준 문장 규약`(명령 1회 rc 판정)을 위반한다. 파일별 `useState` 바인딩명을 **도출**하는 판정으로 교체해 실측 **13 line** (위반 전량, 오탐 0) 을 얻었다 — RULE-06 §열거 고정 금지 준수. 아울러 그 판정의 검출 경계 3형태를 명시하고 주입 방향을 게이트 신설 task DoD 로 이관했다. req 의 NFR-02(주입 검증)는 '가정 주입 요구' 부류라 체크박스로 두지 않았다. G-1↔G-4 의 **순서 의존**(새 참조 set 으로 바꾸면 자기 참조 deps 가 무한 재fetch 가 된다)을 신규 명시했다 — req 에는 없던 항목이며 함께 처리하지 않으면 수정이 회귀를 만든다. | all |
