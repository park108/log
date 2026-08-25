# 평가 라벨과 상태 막대는 서로소인 클래스 네임스페이스를 가진다

> **위치**: `src/Monitor/WebVitalsItem.jsx` — `HEADER_STYLE` `:9-15`(평가 라벨) · 막대 렌더 `:213-219`. 슬롯 CSS `src/Monitor/Monitor.css:50-67`, 역할 기하 `:38`(`bar`) · `:43`(`evaluation`). 라인은 HEAD=`5b2ed3b` 스냅샷이며 **식별자 우선**.
> **관련 요구사항**: REQ-20260825-009
> **최종 업데이트**: 2026-08-25 (by inspector — tick 225 최초 등록)

## 역할

`src/Monitor/**` 의 렌더 트리에서 **역할이 다른 요소는 서로소인 클래스 집합을 갖는다.** 따라서 색상 슬롯 클래스 1개짜리 단독 선택자는 **정확히 하나의 역할**만 선택하며, 그 선택 결과가 DOM 문서 순서에 의존하지 않는다.

핵심 명제 — **식별 가능성은 마크업의 책임이지 소비자의 책임이 아니다.** 현행은 "슬롯 클래스만으로는 요소를 식별할 수 없으니 소비자가 항상 복합 선택자를 써야 한다" 는 **암묵 규칙**에 의존하는데, 그 규칙은 어디에도 강제돼 있지 않고 위반해도 아무것도 붉어지지 않는다.

의도적으로 하지 **않는** 것:
- (i) **색상 값·CSS 변수 자체를 바꾸지 않는다.** 동일 변수 재사용은 허용이며 시각 결과는 불변이어야 한다 (§동작 (N-3)).
- (ii) **집계 로직·평가 분기를 다루지 않는다.** 막대 폭의 **값** 유효성은 slug `components/monitor` 계열의 집계 계약 소관이며, 본 계약은 막대의 **식별** 결정성이다 — 판정 대상이 다르다.
- (iii) **`src/Monitor` 밖으로 일반화하지 않는다.** 다른 컴포넌트의 역할-슬롯 공유 여부는 미측정이다 (§참고).

## 공개 인터페이스

- 평가 라벨: `span--monitor-evaluation` + 역할 전용 슬롯.
- 상태 막대: `span--monitor-bar` + 역할 전용 슬롯 + 인라인 `style.width`.
- 두 역할이 공유해도 되는 것은 **명시 제외된 공통 유틸리티 클래스(`span`)뿐**이다. 명시되지 않은 공유는 위반이다.

## 동작

### (N-1) 오선택이 예외가 아니라 무해한 값으로 관측되므로 조용하다

`document.querySelector('.span--monitor-poor')` 는 **헤더**를 집는다 — 헤더가 `:205` 에서, 막대가 `:213-219` 에서 렌더돼 문서 순서상 헤더가 앞서기 때문이다.

헤더에는 인라인 `style` 이 없으므로 `style.width` 가 예외를 던지지 않고 **빈 문자열**로 읽힌다. 즉 잘못된 요소를 집었다는 사실이 오류로 드러나지 않는다.

tick 225 실측 (HEAD=`5b2ed3b`): 헤더 슬롯 4종 · 막대 슬롯 3종 · **공유 3종** (`span--monitor-good` · `span--monitor-poor` · `span--monitor-warn`).

### (N-2) 0 경계에서만 통과하는 비대칭이 검출을 늦춘다

**0 집계에서는 헤더 슬롯이 `span--monitor-none`** 이라 막대 슬롯(`good`·`warn`·`poor`)과 충돌하지 않는다. 그래서 0 경계 케이스는 통과하고 **비-0 경로에서만** 어긋난다 — 경계값 테스트를 먼저 갖춘 스위트일수록 늦게 발견된다.

**방어 대상 (`RULE-07 §주제 우선순위` 축 1 — 사용자 관측 가능 렌더 결과)**: 슬롯 클래스로 막대를 지목하는 모든 소비자(테스트 · 스타일 · 향후 쿼리)가 **비-0 경로에서 조용히 헤더를 집는다.**

### (N-3) 역할 분리는 시각 결과를 바꾸지 않는다

역할별 슬롯이 분리돼도 두 역할의 색은 **동일 CSS 변수**(`--success-*` · `--warning-*` · `--error-*` · `--normal-*`)를 참조한다. 현행 슬롯 규칙은 색 리터럴을 하나도 쓰지 않으며(tick 225 실측 `slot-rules=4 color-literals=0`), 분리 과정에서 리터럴로 재구현하면 시각 회귀가 조용히 들어온다 — (N-6) 이 그 방향을 막는다.

### (N-4) 우회는 이미 소비자 쪽에 들어와 있다

`TSK-20260825-12` 의 T-3 이 이 함정에 걸려 red 였다 (`expected '' to be '33.333333333333336%'`). 우회는 `.span--monitor-bar.<slot>` **복합 선택자로 테스트에 들어갔고**(`WebVitalsItem.test.jsx:419` `BAR_SELECTOR`), 원인인 마크업은 그대로다.

**따라서 복합 선택자의 잔존은 이 계약의 미충족 지표다** — 계약이 충족되면 소비자는 역할 모호성 회피 목적의 복합 선택자를 **필요로 하지 않는다**.

## 의존성

- 내부: `src/Monitor/WebVitalsItem.jsx` · `src/Monitor/Monitor.css` · `src/Monitor/WebVitalsItem.test.jsx` (writer = developer).
- 인접 계약 (별건): 막대 폭 **값**의 유효성 축 — 본 계약은 막대 **식별**의 결정성이라 판정 대상이 다르다.

## 발화 채널

**vitest 수집 경로** `src/Monitor/WebVitalsItem.test.jsx` (`vite.config.js:63,68` 수집 범위 안, `npm test` · CI 발화).

**현 채널의 한계를 명시한다** — 이 축의 위반은 현재 스위트를 붉게 만들지 않는다. 소비자가 복합 선택자로 **이미 우회했기 때문**이며, 우회가 유지되는 한 마크업이 계약을 위반해도 초록이다. 따라서 §수용 기준 (N-5)(N-6) 의 정적 판정이 현재 유일한 상시 판정 채널이고, (N-7) 은 그 위에 서는 전제다.

## 테스트 현황

- [x] `WebVitalsItem` 스위트 실재 — `src/Monitor/WebVitalsItem.test.jsx`.
- [x] 공유 실측 — tick 225 `header=4 bar=3 shared=3`.
- [ ] 역할 서로소 — HEAD 미충족. (N-5) 의 부착 대상.
- [ ] 복합 선택자 불요 — HEAD 1 hit (`:419`). (N-6) 의 부착 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (`RULE-07 §수용 기준 문장 규약`). 명령은 `src/**` 만 참조하며 **spec 경로를 어느 것도 참조하지 않는다** (`§promote 조건 2`). **HEAD=`5b2ed3b` (tick 225 등록) 기준 2/4.**

- [ ] (Must, N-5) 역할 간 슬롯 토큰이 서로소다 — 두 집합을 파일에서 **도출**해 교집합을 잰다 (`RULE-06 §열거 고정 금지`). 판정:
  ```
  bash -c 'f=src/Monitor/WebVitalsItem.jsx; h=$(sed -n "/HEADER_STYLE/,/^};/p" "$f" | grep -oE "span--monitor-(good|warn|poor|none)" | sort -u); b=$(grep -oE "span--monitor-bar[[:space:]]+span--monitor-(good|warn|poor|none)" "$f" | grep -oE "span--monitor-(good|warn|poor|none)" | sort -u); [ -n "$h" ] && [ -n "$b" ] || { echo "derive=0 vacuous" >&2; exit 2; }; sh=$(comm -12 <(printf "%s\n" "$h") <(printf "%s\n" "$b")); n=$(printf "%s" "$sh" | grep -c .); echo "header=$(printf "%s\n" "$h" | grep -c .) bar=$(printf "%s\n" "$b" | grep -c .) shared=$n"; [ -n "$sh" ] && echo "shared-tokens: $(echo $sh)" >&2; [ "$n" -eq 0 ]'
  ```
  → **rc=0**. **HEAD=`5b2ed3b` (tick 225) 실측 rc=1 / `header=4 bar=3 shared=3` (`good`·`poor`·`warn`) → 미충족.** **공허 통과 가드 내장** — 어느 한쪽 도출이 0 이면 `exit 2` 로, 슬롯 표기가 바뀌어 조용히 교집합이 비는 상태를 충족으로 읽지 않는다. ack 라인이 `header=4 bar=3` 으로 비공허임을 수치로 낸다. **`bash -c` 필수** — 명령이 프로세스 치환 `<(...)` 를 쓰므로 POSIX `sh` 에서는 동작하지 않는다.
- [ ] (Must, N-6) 소비자가 역할 모호성 회피용 복합 선택자를 필요로 하지 않는다 — 판정: `bash -c 'test "$(grep -c "span--monitor-bar\." src/Monitor/WebVitalsItem.test.jsx)" -eq 0'` → **rc=0**. **HEAD=`5b2ed3b` (tick 225) 실측 rc=1 / 1 hit (`:419` `BAR_SELECTOR`) → 미충족.** **`\.` 이스케이프가 요점** — 이스케이프 없이 `grep -c "span--monitor-bar."` 로 쓰면 `.` 가 임의 1문자가 되어 `span--monitor-bar ` (공백 포함 일반 사용)까지 매치해 항상 hit 이 난다. 이 항목이 재는 것은 **클래스 연접(`.`)** 뿐이다.
- [x] (Must, N-7) Monitor 스위트가 초록이다 — 판정: `npx vitest run src/Monitor` → **rc=0**. **HEAD=`5b2ed3b` (tick 225) 실측 rc=0 → 충족.** **본 항목의 판정 의미는 (N-5)(N-6) 착지 *후* 에 발생한다** — 현재의 초록은 소비자가 복합 선택자로 우회한 결과이며 계약 충족의 증거가 아니다 (§발화 채널). 역할 분리 후에도 초록이어야 한다는 요구로서 존치한다.
- [x] (Must, N-8) 슬롯 색상이 CSS 변수 참조로만 구성된다 — 판정: `bash -c 'n=$(awk "/^\.span--monitor-(good|warn|poor|none)[[:space:]]*\{/,/^\}/" src/Monitor/Monitor.css | grep -cE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\("); s=$(grep -cE "^\.span--monitor-(good|warn|poor|none)[[:space:]]*\{" src/Monitor/Monitor.css); echo "slot-rules=$s color-literals=$n"; [ "$s" -gt 0 ] || exit 2; [ "$n" -eq 0 ]'` → **rc=0**. **HEAD=`5b2ed3b` (tick 225) 실측 rc=0 / `slot-rules=4 color-literals=0` → 충족.** **`RULE-07 §반려 시그널` 의 중복 게이트 부류가 아닌 경계** — 위반해도 붉어지는 기존 게이트가 없다 (`check:css-modules-coherence` 는 모듈 경계를 보지 색 리터럴을 보지 않는다). 이 항목이 겨누는 회귀는 **역할 분리 과정에서 슬롯을 리터럴 색으로 재구현하는 것**이며, 그 상태에서 (N-5)(N-6)(N-7) 은 전부 통과한다 — 서로소도 되고 복합 선택자도 사라지고 테스트도 초록인데 시각만 달라진다. **공허 통과 가드 내장** — 슬롯 규칙 도출이 0 이면 `exit 2`.

## 참고

### 게이트 실효 검증 이관 (RULE-07 §처리 · RULE-06 §게이트 실효 검증)

아래는 **'가정 주입 요구' 부류**라 체크박스로 두지 않으며, 검출 방향을 보존한 채 **수리 task 의 `## 검증/DoD`** 로 이관한다. developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다. **이관처 task 가 발행되기 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

- **(Dir-1) 식별 결정성 — 비-0 경로** — 비-0 집계 픽스처에서 **막대 슬롯 클래스 1개짜리 단독 선택자**로 조회한 요소가 인라인 `style.width` 를 보유한다(빈 문자열이 아니다). 역할 분리를 되돌리면 이 단언이 `rc≠0` → 원복 → `rc=0`.
- **(Dir-2) 0 경계 비대칭의 소멸** — 0 집계 픽스처에서도 같은 단독 선택자가 막대를 반환한다. **이 방향이 없으면 (Dir-1) 만으로는 "0 에서만 통과하던" 종전 비대칭이 반대 방향으로 재발한 것을 구별하지 못한다** (§동작 (N-2)).
- **(Dir-3) 특이도** — 주입 없이 현 트리 실행 → `npx vitest run src/Monitor` `rc=0` · `npm test` `rc=0`.
- **(Dir-4) 시각 불변 (NFR)** — 분리 전후 두 역할 요소의 `class` 를 CSS 규칙에 대입했을 때 적용되는 **선언 집합이 같다**. 리터럴 재구현 방향은 (N-8) 이 정적으로 잡으나, 변수는 유지한 채 **다른** 변수를 참조하는 방향은 이 주입에서만 드러난다.

### 미측정·비판정 항목

- **(미측정) `src/Monitor` 밖의 역할-슬롯 공유.** 본 계약은 일반화하지 않는다 (§역할 (iii)).
- **(미측정) 실제 렌더 색상의 픽셀 동일성.** jsdom 은 계산된 스타일을 완전히 해석하지 않으므로 (Dir-4) 는 **선언 집합** 수준에서 판정한다.
- **(중복 게이트 — 체크박스 제외) `npm test` 전체 rc=0.** 위반 시 husky·CI 가 즉시 실패하므로 `RULE-07 §반려 시그널` 의 중복 게이트 부류다. (N-7) 이 Monitor 범위로 좁혀 같은 축을 재므로 전체 스위트 항목은 전제로만 남긴다.

### 관련

- **REQ 원문**: REQ-20260825-009 (slug `monitor-render-role-class-namespace-disjointness`).
- 소비한 followup: `20260825-1215-monitor-slot-class-shared-between-header-and-bar` (TSK-20260825-12, markup-structure/low).
- 관측 위치: `src/Monitor/WebVitalsItem.jsx:9-15, 205, 213-219` · `src/Monitor/Monitor.css:38, 43, 50-67` · `src/Monitor/WebVitalsItem.test.jsx:419`.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-009 (inspector tick 225) | 최초 등록. **`RULE-07 §주제 우선순위` 축 1(사용자 관측 가능 렌더 결과)에 귀속하는 제품 도메인 계약**이며, 위치를 `components/` 에 둔 것은 `components/` 가 `src/` 구현 단위와 1:1 이라는 운영자 원칙에 따른다 (`src/Monitor/`). **req 수용 기준 5항을 그대로 쓰지 않았다.** (a) req 의 1항이 `grep ... | sort | uniq -c` **결과를 사람이 읽어 판정**하는 형태였다 — 명령 1회 rc 판정이 아니므로 두 집합을 도출해 교집합을 재는 (N-5) 로 재작성하고 공허 통과 가드를 넣었다. (b) req 의 Given/When/Then 항(비-0 집계에서 단독 선택자가 `style.width` 보유)은 **'가정 주입 요구' 부류**라 체크박스에서 내리고 **(Dir-1)** 로 이관했다 — 현 HEAD 에서 그 단언은 실재하지 않으므로 체크박스로 두면 어느 명령으로도 판정되지 않는다. (c) req 의 `npm test` 항은 중복 게이트 부류라 §참고 전제로 강등하고, Monitor 범위 (N-7) 만 남겼다. (d) **(N-8) 신규 추가** (req 에 없던 항목) — req 의 FR-03/NFR-01(시각 불변)은 체크박스 없이 서술만 있었는데, **역할 분리 과정에서 슬롯을 색 리터럴로 재구현하는 회귀**는 나머지 세 기준을 전부 통과하면서 시각만 바꾼다. 정적으로 잡히는 부분(리터럴 도입)을 (N-8) 로 세우고, 변수는 유지하되 **다른** 변수를 참조하는 방향은 (Dir-4) 로 이관했다. (e) **(Dir-2) 신규 추가** — 0 경계 비대칭이 반대 방향으로 재발하는 경우를 (Dir-1) 단독으로는 구별하지 못한다. **§발화 채널에 한계를 명시** — 이 축의 위반이 현재 스위트를 붉게 만들지 못하는 이유가 **소비자의 기존 우회**임을 박제했다. 그 사실을 적지 않으면 (N-7) 의 현 `rc=0` 이 계약 충족의 증거로 오독된다. | all |
