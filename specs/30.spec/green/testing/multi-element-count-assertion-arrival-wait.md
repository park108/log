# 복수 개수 단언의 대기 조건은 개수 도달이다

> **출처 req**: REQ-20260825-019 (원 계약) · REQ-20260827-035 (판정 기준 정밀화)
> **상태**: green (WIP — blue 판본에서 carry-over, REQ-20260827-035 흡수)
> **최종 업데이트**: 2026-08-29 (by inspector — tick 241, REQ-20260827-035 흡수)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`0e5b39e`).

## 역할

테스트가 "요소 N 개(N>1)" 를 단언할 때, 그 단언에 선행하는 **대기 조건이 N 개 도달과 일치**함을 계약으로 세운다.

`findAllBy*` 는 매치가 **1개 이상** 생기는 즉시 resolve 한다. 그 반환값에 곧바로 `toHaveLength(N)` (N>1) 을 거는 형태는 대기 조건(≥1)과 단언 조건(=N)이 어긋난 상태이며, 세어야 할 요소들이 서로 독립인 비동기 경계에서 도착할 때 그 간극이 스케줄링 창에 노출된다. 이 spec 이 방어하는 것은 **단언의 강도가 아니라 대기 조건의 정합**이다.

이 정합 위반은 기존 자동 게이트로 검출되지 않는다 — 위반 테스트는 단독 실행에서 통과하고 전량 실행의 부하 조건에서만 red 가 되므로, 통과하는 CI 가 계약 위반을 은폐한다.

**더 나아가 이 계약은 자기 판정 기준으로도 은폐된 적이 있다.** 아래 (2) 의 "독립 비동기 경계" 가 두 갈래로 읽혔고, 위반 1건이 분류 절차를 정상 통과해 **허용으로 분류**됐다 (REQ-20260827-035 §배경 a). 사람·에이전트 판정을 통과한 위반이므로 수리 대상은 그 지점이 아니라 **판정 기준 자체**다. 아래 (2) 의 명확화와 (2-a) 의 증가 부류 신설이 그 수리다.

## 동작

### (1) 대기 조건 ≥ 단언 조건

복수 개수 단언(`toHaveLength(N)` · `.length` 비교, N>1)이 성립하려면, 그 시점까지 **N 개 도달이 대기된 상태**여야 한다. 대기 조건이 ≥1 resolve 인 API 의 반환값 스냅샷에 개수를 거는 형태는 계약 위반이다.

정합 대기의 형태는 다음 중 하나다:

- `await waitFor(() => expect(screen.getAllByRole(...)).toHaveLength(N))` — 개수 도달 자체가 대기 술어.
- 세어야 할 요소 **각각**을 개별적으로 `findBy*` 로 대기한 뒤 동기 `getAllBy*` 로 계수.
- 세는 요소 전부가 **단일 비동기 경계의 한 커밋**에서 함께 나타남이 구조적으로 보장 — 이 경우 경합 창이 없으므로 `findAllBy*` 직후 계수가 허용된다.

### (2) 경계 귀속이 판정 기준이다

위반 여부는 문법 형태가 아니라 **세어야 할 요소들이 몇 개의 독립 비동기 경계에 귀속되는가**로 판정한다. 귀속 경계가 ≥2 이면 위반, 1 이면 허용이다.

**"독립 비동기 경계" 는 데이터 도착 이벤트 수로 센다 — 렌더 사이트 수가 아니다.** 두 수는 일치하지 않으며, 일치한다고 읽으면 이 계약이 방어한다고 선언한 간극이 그대로 통과한다.

| | 렌더 사이트 | 도착 이벤트 |
|---|---|---|
| 무엇을 세는가 | 요소를 그리는 JSX 지점 | 세는 요소의 개수를 바꾸는 상태 커밋 지점 |
| `ImageSelector` | **1** — `src/Image/ImageSelector.tsx:215` 의 단일 `images.map()` | **2** — `:85` `setImages(...)` (최초 `getImages`, `:63` useEffect) · `:140` `setImages(prev => prev.concat(...))` (See more, `:118` useEffect) |
| 이 기준에서의 판정 | 경계 1 → 허용 | 경계 2 → **위반** |

`src/Monitor/Monitor.jsx` 는 패널마다 별도 `lazy()` + 별도 `<Suspense>` 를 두므로, 그 패널들이 기여하는 요소를 세는 단언의 귀속 경계는 패널 수와 같다. 이 경계 독립성은 별도 계약(`Monitor` 셸 축 (4))이 보존 대상으로 세우고 있으며, 본 계약은 그것을 전제로 한다 — 경계를 합치는 방향의 수리는 본 계약의 해법이 아니다.

> **왜 갈렸는가**: 이 절의 유일한 예시가 `Monitor` 의 `lazy()` + `<Suspense>` 였고 그 둘은 렌더 사이트이면서 동시에 도착 경계라 **두 해석이 같은 답을 낸다**. 분류자는 그 예시에서 렌더 사이트 기준을 읽었고, 두 해석이 갈리는 첫 사례(`ImageSelector`)에서 위반을 허용으로 분류했다. 위 표는 두 수가 갈리는 반례를 계약 본문에 박제해 예시가 기준을 대신하지 못하게 한다.

### (2-a) 개수 **증가** 단언에서 간극이 최대가 된다

동일 selector 에 대한 선행 계수 N₁ 과 후행 계수 N₂ 가 **N₁ < N₂** 인 쌍(개수 증가 단언)은, 증가를 유발한 상호작용과 후행 계수 **사이**에 증가분 도착 대기를 ≥1 갖는다.

**`findAllBy*` 자체는 그 대기로 계수하지 않는다.** 세는 요소가 이미 비어있지 않은 모집단에서 증가할 때 `findAllBy*` 의 대기량은 경계 수와 무관하게 **정확히 0** 이다 — 기존 N₁ 개가 즉시 술어(매치 ≥1)를 만족시키기 때문이다. 이 부류가 통과하는 것은 도착을 기다려서가 아니라 상호작용 처리 경로가 그 시점까지 플러시되기 때문이며, 그것은 (3) 이 배제한 "벽시계 결박" 과 같은 부류의 우연이다.

정합 형태는 (1) 의 세 가지와 같다. 저장소에 선례가 이미 2건 있다 — `src/File/File.test.tsx:111` (`findByText("308142rg.jpg")` 로 8번째 파일 도착 대기 후 `:117` 에서 10 계수) · `src/Log/Log.test.jsx:89` (`findByText` 후 `:93` 에서 10 계수). **계약을 발명하는 것이 아니라 이미 지켜지는 형태를 판정 가능하게 만드는 일이다.**

### (3) 고정 지연은 대기가 아니다

대기 조건 상향을 `setTimeout` · `await new Promise(r => setTimeout(r, ms))` · 임의값 `vi.advanceTimersByTime(ms)` 로 대체하지 않는다. 고정 지연은 경합 창을 좁힐 뿐 제거하지 않으며, 대기 조건을 도착 사실이 아니라 벽시계에 결박시킨다.

### (4) 개수 단언 자체는 보존한다

수리 방향은 단언 완화가 아니다. 개수 단언이 사라지면 동반하는 순서 단언(`toEqual(<expected array>)`)이 0건 배열에서 공허하게 참이 되어 판별력을 잃는다. 개수 단언과 순서 단언은 함께 보존된다.

### (5) 모집단은 열거로 산출한다

본 계약의 측정 모집단은 하드코딩 목록이 아니라 소스 트리 열거로 산출한다:

```
bash -c 'grep -rn -A4 "await screen.findAllBy" src --include="*.test.jsx" --include="*.test.tsx" | grep -E "toHaveLength|\.length"'
```

모집단의 각 지점은 (a) 개수 도달 대기로 정합화됨 또는 (b) 세는 요소가 단일 비동기 경계 귀속이라 경합 창 없음 중 하나로 분류된다. 미분류 지점은 계약 미충족 상태다.

**이 모집단은 rc 채널을 갖는다.** 선언만 있고 판정이 없으면 완전성 조항은 집행되지 않는다 — 실제로 그 상태가 유지됐다 (REQ-20260827-035 §배경 d: 모집단 18 지점에 대응하는 수용 기준이 0건이었고, §수용 기준이 참조하는 유일한 파일 `src/Monitor/Monitor.test.jsx` 는 그 모집단에 들어 있지도 않다 — AC-1 이 그 파일에서 `findAllByRole` 형태를 제거했기 때문이다).

rc 채널은 두 층으로 나뉜다:

- **모집단 자체** — 열거가 비공허하고 축소되지 않는다 (AC-8). 모집단을 줄여 위반을 없애는 값싼 해소를 막는다.
- **증가 부류 (2-a)** — 모집단 안에서 기계 판정이 가능한 부분집합을 전수 판정한다 (AC-6).

(a)/(b) 분류 자체는 단일 명령 rc 로 판정되지 않으므로 여전히 수리 task 의 산출물이다 (§미측정·비판정 항목). **모집단의 rc 채널은 분류의 대체물이 아니라 분류가 서 있을 바닥이다.**

## 수용 기준

> 아래 명령은 전부 **rc=0 == 계약 충족** 으로 통일돼 있다 (0 hit 을 요구하는 항목은 `! grep -q` 형태). 판정은 hit 수 육안 대조가 아니라 종료 코드로 한다.
>
> **표기 전환 (tick 241)**: blue 판본의 처음 5항은 `Given … When \`cmd\`, Then rc=0` 형태였다. green 축은 `0e5b39e` 부터 (P-D) 판정 선언 토큰 이탈이 rc 로 집행되므로(`foundation/advisory-channel-category-accounting-and-green-enforcement` FR-03), carry-over 시 `— 판정:` 형태로 전환했다. **명령·기대 rc·판정 내용은 전부 동일하며 전건 재실행으로 확인했다** — 전환은 표기이지 판정이 아니다. blue 에서 이것이 드러나지 않은 것은 blue 축이 ADVISORY 이기 때문이며, carry-over 가 그 부채를 가시화했다.

- [x] (Must, 동작 1·2) **패널 개수 단언 지점에 `≥1 resolve` 스냅샷 계수 형태가 없다** — 판정: `bash -c '! grep -qE "await screen\.findAllByRole" src/Monitor/Monitor.test.jsx'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): rc=0 — 보존됨** (`5be66f4` 가 `:165` 를 개수 도달 대기로 정합화).
- [x] (Must, 동작 4) **개수 단언이 보존된다** — 판정: `bash -c 'grep -qE "toHaveLength\(PANEL_HEADINGS_IN_ORDER\.length\)" src/Monitor/Monitor.test.jsx'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): rc=0 — 보존됨.**
- [x] (Must, 동작 4) **순서 단언이 보존된다** — 판정: `bash -c 'grep -qE "toEqual\(PANEL_HEADINGS_IN_ORDER\)" src/Monitor/Monitor.test.jsx'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): rc=0 — 보존됨.** 개수 단언(위 항목)과 함께 보존돼야 한다 — 개수 단언이 사라지면 순서 단언이 0건 배열에서 공허하게 참이 된다 (동작 4).
- [x] (Must, 동작 3) **원 수리 대상 파일에 고정 지연이 없다** — 판정: `bash -c '! grep -qE "setTimeout|advanceTimersByTime|await new Promise" src/Monitor/Monitor.test.jsx'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): rc=0 — 보존됨.** REQ-20260825-019 은 셸 축 블록 한정이었으나 파일 전역으로 상향한 판정이다.
- [x] (Must, 동작 1) **원 수리 대상 스위트가 초록** — 판정: `npx vitest run src/Monitor/Monitor.test.jsx`
  → **실측 2026-08-29 (HEAD `0e5b39e`): rc=0 / `Test Files 1 passed (1)` · `Tests 7 passed (7)` — 보존됨.** **비판별** — 계약이 위반된 상태에서도 rc=0 이다 (§미측정·비판정 항목). 회귀 바닥선이지 위반 검출 채널이 아니다.

> 아래 3항은 REQ-20260827-035 흡수분이다. 위 5항은 **전부 보존**되며 본 판본은 추가만 한다.
> 펜스 항목은 본문을 추출해 `bash -c "$(추출)"` 로 실행한다.

- [x] (Must, 동작 2·2-a / Should, 동작 1 선례 보존) **증가 쌍 전수가 증가분 도착을 선행 관측한다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
    → **실측 2026-08-29 (HEAD `6503a78`): rc=0 / `count-increase-pairs=3 without-arrival-wait=0`.**
    위반 1건은 `src/Image/ImageSelector.test.tsx` 였다 — See more 클릭 직후 도착
    관측 없이 `toBe(6)` 을 단언했다. `findAllByTestId` 는 1개 이상이면 즉시
    반환하므로 아직 4개인 상태로 통과할 수 있고, 깨져도 원인이 "6개가 아니다"
    로만 보여 도착 미대기임이 드러나지 않는다. 증가분의 `title`(=`key`)을
    `findByTitle` 로 먼저 기다리도록 고쳤다 (File.test · Log.test 와 같은 이디엄).
  T=0; B=0
  for f in $(find src -name "*.test.jsx" -o -name "*.test.tsx" | sort); do
    r=$(awk -v F="$f" '
      { buf[NR]=$0 }
      /fireEvent\.|userEvent\./ { act=NR }
      /await screen\.findAllBy/ {
        a=$0; sub(/.*findAllBy[A-Za-z]*\(/,"",a); sub(/\).*/,"",a)
        p=a; pl=NR; pa=act+0; next
      }
      p != "" && (/toBe\(/ || /toHaveLength\(/) {
        n=$0; sub(/.*toBe\(/,"",n); sub(/.*toHaveLength\(/,"",n); sub(/[^0-9].*/,"",n)
        if (n != "") {
          if (seen[p] && n+0 > lastn[p]+0) {
            w=0
            for (i=pa+1; i<pl; i++) if (buf[i] ~ /await screen\.findBy|await waitFor\(/) w=1
            printf "%s:%d %s->%s sel=%s trigger@%d arrival-wait=%s\n", F, NR, lastn[p], n, p, pa, (w?"yes":"NO")
            t++; if (!w) b++
          }
          seen[p]=1; lastn[p]=n
        }
        p=""
      }
      END { printf "COUNT %d %d\n", t+0, b+0 }
    ' "$f")
    echo "$r" | grep -v "^COUNT" | grep -v "^$" || true
    c=$(echo "$r" | awk '/^COUNT/{print $2" "$3}')
    T=$((T+${c%% *})); B=$((B+${c##* }))
  done
  printf "count-increase-pairs=%d without-arrival-wait=%d\n" "$T" "$B"
  [ "$T" -ge 3 ] || exit 2
  [ "$B" -eq 0 ]
  ```
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `count-increase-pairs=3 without-arrival-wait=1` / rc=1 — 위반 baseline.** 위반 지점 `src/Image/ImageSelector.test.tsx:45` (`4->6`, `sel="imageItem"`, `trigger@43`, `arrival-wait=NO`). 정합 2건은 `src/File/File.test.tsx:117` (`7->10`, `trigger@109`) · `src/Log/Log.test.jsx:93` (`7->10`, `trigger@86`).
  > **분모 `T ≥ 3` 은 무판정 하한이자 래칫이다.** 이 축은 **모집단이 위반과 함께 줄어드는 형태**다 — `ImageSelector` 의 개수 단언을 지우면 `T` 가 2 로 떨어지고 `B` 는 0 이 되어 **삭제가 충족으로 읽힌다**. 하한이 그 경로를 `exit 2` 무판정으로 가른다. 동시에 도출식이 낡아 아무것도 못 집는 상태도 같은 하한이 막는다.
  > **`findAllBy*` 를 대기로 계수하지 않는 이유**는 그것이 정확히 이 항목이 겨눈 결함이기 때문이다 (동작 2-a). 계수하면 기준이 HEAD 에서 이미 참이 되어 아무것도 요구하지 않는다. 대기 탐색 창을 **트리거 상호작용 이후 ~ 계수 직전**으로 한정하고 `findAllBy` 를 패턴에서 제외한 것이 그 반영이다.
  > **선례 보존이 같은 명령에 포함된다** — `File.test.tsx` · `Log.test.jsx` 의 선행 대기를 제거하면 `B` 가 2~3 으로 올라 rc=1 이 된다. 별도 보존 기준이 필요 없고, 판정이 수리 지점 1곳에만 반응하는 하드코딩과도 구별된다.
  > **낱말 주의** — 이 항목 제목이 "도착 대기" 가 아니라 "증가분 도착을 선행 관측한다" 인 것은 표현 선호가 아니다. `check:acceptance-criteria` 의 G-2 미래형 술어(`scripts/check-acceptance-criteria.sh:157`)가 `대기` 를 토큰으로 갖는데, 그 술어가 겨냥하는 것은 "차기 이벤트를 기다린다" 는 미래 사건 의존인 반면 이 도메인에서 `대기` 는 `waitFor`/`findBy*` 를 가리키는 **명사**다. 두 용법이 토큰을 공유해 최초 작성 시 오탐으로 걸렸다 (실측 rc=1 → 낱말 교체 후 rc=0). **판정 내용은 바뀌지 않았다** — 펜스는 그대로 `await screen.findBy|await waitFor\(` 를 찾는다. 같은 충돌이 `testing/absence-assertion-arrival-precondition` 에서도 관측됐다.
  > **알려진 한계** — 트리거 판정이 `fireEvent.`/`userEvent.` 최근 출현 라인이라 한 테스트에 상호작용이 연속되면 창이 좁게 잡힐 수 있다. 좁게 잡히는 방향은 **위반을 더 많이 신고**하는 쪽(보수적)이므로 false-negative 를 만들지 않는다.

- [x] (Should, 동작 3) **수리 대상 파일에 고정 지연이 없다** — 판정: `bash -c '! grep -qE "setTimeout|advanceTimersByTime|await new Promise" src/Image/ImageSelector.test.tsx'`
  → **실측 2026-08-29 (HEAD `0e5b39e`): 0 hit / rc=0 — 보존 대상.** 위 4번째 항목이 `Monitor.test.jsx` 에 대해 갖는 동형 기준을 수리 대상 파일로 확장한다. 증가 부류 정합화가 (3) 을 우회해 벽시계 결박으로 이뤄지는 것을 막는다.

- [x] (Must, 동작 5) **모집단 열거가 비공허하고 축소되지 않는다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  h=$(grep -rn -A4 "await screen.findAllBy" src --include="*.test.jsx" --include="*.test.tsx" \
      | grep -E "toHaveLength|\.length")
  n=$(printf '%s\n' "$h" | grep -c .)
  f=$(printf '%s\n' "$h" | sed 's/-[0-9]*-.*$//' | sed 's/:.*$//' | sort -u | grep -c .)
  echo "population=$n files=$f"
  [ "$n" -ge 1 ] || exit 2
  [ "$n" -ge 15 ] && [ "$f" -ge 5 ]
  ```
  → **실측 2026-08-29 (HEAD `0e5b39e`): 출력 `population=18 files=5` / rc=0 — 보존 대상.** 5 파일 — `src/File/File.test.tsx` · `src/Image/ImageSelector.test.tsx` · `src/Log/Log.test.jsx` · `src/Log/LogList.test.jsx` · `src/Monitor/VisitorMon.test.jsx`.
  > **이 항목이 판정하는 것과 하지 않는 것.** 판정하는 것은 **모집단의 실재와 비축소**다. 판정하지 않는 것은 각 지점의 (a)/(b) 분류이며 그것은 단일 명령 rc 로 환원되지 않는다 (§미측정·비판정 항목). 이 둘을 섞어 "분류가 rc 로 판정된다" 고 쓰면 계약이 지키지 못할 말을 하게 된다.
  > **하한이 계약의 본체다.** 모집단 축소는 이 계약군 전체에서 가장 값싼 위장 해소 경로다 — 세는 테스트를 지우면 셀 것이 없어지고 모든 판정이 초록이 된다. `n ≥ 15` · `f ≥ 5` 는 그 방향에만 걸리는 래칫이며 증가 방향은 막지 않는다. 절대값을 현재값(18·5)이 아니라 15·5 로 둔 이유는 테스트 리팩터링의 정상 변동을 위반으로 읽지 않기 위함이다 — 파일 단위 삭제(f) 는 즉시, 지점 단위 삭제(n) 는 3건 초과부터 걸린다.
  > 모집단은 열거로 산출되며 파일 목록을 판정 입력으로 쓰지 않는다 (`RULE-06 §열거 고정 금지`). 위 5 파일 열거는 판정 입력이 아니라 실측 기록이다.

본 계약의 전량 실행 판별 채널은 아래 실경로에서 자동 발화한다 (RULE-07 §promote 조건 4):

- `.husky/pre-push:3` — `npm test` (스크립트 마지막 행이므로 그 rc 가 훅 rc 이며 실패 시 push 차단).
- `.github/workflows/ci.yml:84` — `- name: Test` / `run: npm test`.
- `package.json:21` — `"test": "vitest run --coverage"`.

### 현 HEAD 실측 (2026-08-27, `49793e7` — 원 계약 5항)

| 항목 | 결과 |
|---|---|
| `! grep -q "await screen\.findAllByRole"` | rc=0 — 충족 (`5be66f4` 가 `:165` 를 개수 도달 대기로 정합화) |
| `grep -q "toHaveLength(PANEL_HEADINGS_IN_ORDER.length)"` | rc=0 |
| `grep -q "toEqual(PANEL_HEADINGS_IN_ORDER)"` | rc=0 |
| `! grep -q "setTimeout\|advanceTimersByTime\|await new Promise"` | rc=0 |
| `npx vitest run src/Monitor/Monitor.test.jsx` | rc=0 (7 passed) — **비판별**, 아래 참고 (수리 후 재실행 동일) |
| 동작 (5) 열거 명령 | ~~19 hits / 7 files~~ → **18 hits / 5 files** (아래 §모집단 수치 정정) |

## 참고

- 위반 지점 (REQ-20260825-019 시점): `src/Monitor/Monitor.test.jsx:164-169` — 첫 패널만 `findByText` 로 대기한 뒤 `findAllByRole` 반환값에 4 를 요구. **해소됨** (`5be66f4`).
- 위반 지점 (REQ-20260827-035 시점, **현 HEAD 잔존**): `src/Image/ImageSelector.test.tsx:43-45` — `fireEvent.click(seeMoreButton)` 직후 `findAllByTestId("imageItem")` 반환값에 6 을 요구. 그 시점 DOM 에 이미 4개가 있으므로(`:36-37` 이 4 를 단언했다) `await` 는 즉시 통과하고 4 → 6 증가는 어떤 대기 조건에도 걸리지 않는다. 클릭과 계수 사이에 대기가 0 줄이다.
- 경계 출처: `src/Monitor/Monitor.jsx` 의 `lazy()` 4건 · `<Suspense>` 4건.
- 인접 축 (중복 아님): 전역 상태 누출로 인한 **실행 순서** 종속은 별 축(REQ-20260825-003)이다. 본 계약은 비동기 도착 **시점** 종속을 다룬다.

### 모집단 수치 정정 (2026-08-29, tick 241)

원 판본 §현 HEAD 실측 표가 동작 (5) 열거를 **`19 hits / 7 files`** 로 적었으나, 어느 시점에서도 file 수가 7 인 관측은 없다. 관측 이력:

| 시점 | 출처 | hits / files |
|---|---|---|
| `92b28d7` | developer followup | 19 / 6 |
| `5be66f4` | developer followup | 18 / 5 |
| `badcfe2` | REQ-20260827-035 실측 | 18 / 5 |
| `0e5b39e` | 본 판본 재실측 (AC-8) | **18 / 5** |

hits 는 시점차로 설명되나 files 는 설명되지 않는다 — 원 표기가 오기다. **열거 명령이 진실이고 본문 표는 스냅샷이다**, 이것이 (5) 가 열거 도출을 요구하는 이유이며 이제 AC-8 이 그 수치를 rc 와 함께 낸다. 이 정정은 REQ-20260827-035 §인접 spec 본문 오기 가 경유 기록으로 전달한 것을 흡수한 것이다 (discovery 는 spec writer 가 아니므로 FR 로 올리지 않고 경유만 했다).

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- **단일 파일 실행의 비판별성** — `npx vitest run src/Monitor/Monitor.test.jsx` 는 계약이 위반된 현 HEAD 에서도 rc=0 이다 (2026-08-26 실측 7 passed). 이 항목은 수리 후 회귀 바닥선이지 위반 검출 채널이 아니다. 검출은 전량 실행(`npm test`)과 형태 게이트(위 grep 4건)가 맡는다.
- **전량 실행 (`npm test`) rc** — 중복 게이트 부류 (RULE-07 §반려 시그널). 위반 시 `.husky/pre-push:3` 과 `.github/workflows/ci.yml:84` 가 즉시 실패하므로 수용 기준 체크박스가 더하는 검출력이 0 이다. 채널 자체는 위 실경로에 박제돼 있고 계약의 판별 채널로 유지된다 — 강등 대상은 채널이 아니라 체크박스다. 부가로 RULE-07 §promote 조건 2 는 promote 직전 수용 기준 명령 전수 재실행을 요구하므로, 7~8분 명령을 수용 기준에 두면 승격 시도마다 전량 실행 비용이 강제된다.
- **전량 실행 반복 결정성** — 부하 의존 flake 의 재현율은 러너 부하의 함수이므로 "N 회 반복 통과" 는 결정적 rc 판정이 아니다. 판정 대상에서 제외한다.
- **판별력 실효 (패널이 3개로 줄면 red)** — 가정 주입 요구 부류. 검출 방향은 "기여 패널 수 감소 → 개수 단언 red" 이며, 주입 판정은 본 계약을 수리하는 task 의 DoD 로 이관한다 (RULE-06 §게이트 실효 검증). 이관처 task 미발행 시 발행 요청을 `10.followups/` 에 남긴다.
- **모집단 전수 (a)/(b) 분류 (18건)** — 분류표의 등재 여부는 단일 명령 rc 로 판정되지 않는다. 동작 (5) 의 열거 명령이 산출하는 각 지점의 분류는 수리 task 의 산출물로 박제한다. AC-8 은 모집단의 **실재·비축소**만 판정하며 분류를 대신하지 않는다.
- **증가 부류 밖 지점의 대기 정합** — `src/Log/LogList.test.jsx` · `src/Monitor/VisitorMon.test.jsx` 는 모집단 5 파일에 속하나 증가 쌍이 도출되지 않는다 (선행·후행 계수가 동일). AC-6 의 판정 대상이 아니며 그 지점들의 (a)/(b) 분류는 동작 (5) 가 계속 소유한다.
- **개수가 감소·동일한 단언** — 대기 간극이 최대가 되는 조건이 아니다 (동작 2-a 는 증가 부류에 한정). 판정하지 않는다.
- **위반 지점이 전량 실행 부하에서 실제로 red 가 되는지** — 재현 채널이 없어 측정하지 않는다. 계약의 근거는 재현이 아니라 **대기 조건과 단언 조건의 정적 불일치**다.
- **(가정 주입 요구) 증가 부류 검출 방향 4종** — 체크박스로 두지 않고 아래 §게이트 실효 검증 이관 으로 내린다. 검출 방향은 보존된다.
- **프로덕션 비파괴 (`src/Monitor/**` 변경 0)** — 변경 없음은 task 단위 diff 범위 조건이며 HEAD 단독 rc 판정 대상이 아니다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)

AC-6 은 **판정 술어를 신설**한다. 검출 방향은 **4종**이며 주입 왕복은 구현 task 의 DoD 에 귀속한다. `RULE-04` notes 에 `injection: N/N detect` · `control: M/M pass` 박제.

| 방향 | 주입 | 기대 |
|---|---|---|
| Dir-1 (민감도 — 수리 대상) | `ImageSelector.test.tsx` 의 새 도착 대기를 제거 | `rc≠0` · `without-arrival-wait=1` → 원복 후 `rc=0` |
| Dir-2 (민감도 — 선례 보존) | `File.test.tsx:111` 의 `findByText` 를 제거 | `rc≠0` → 원복. 이 방향이 없으면 판정이 수리 지점 1곳에만 반응하는 하드코딩과 구별되지 않는다 |
| Dir-3 (특이도) | 주입 없이 실행 | `rc=0` |
| Dir-4 (공허 통과) | 증가 쌍이 0 인 트리(저장소 밖 probe 클론) | `rc=2` — 판정 불가가 통과로 읽히지 않음 |

Dir-4 는 `RULE-06` 이 기록한 **"잡으라는 drift 만 구조적으로 못 보는"** 부류를 겨눈다. Dir-2 는 `RULE-06 §음성 대조` 의 대조가 아니라 **두 번째 민감도 방향**임에 주의한다 — 대조(control)는 별도로 구성한다.

> **선행 이관 (REQ-20260825-019 판본, 미해소)**: "기여 패널 수 감소 → 개수 단언 red" 방향의 주입도 이관 상태이며 이관처 task 가 아직 발행되지 않았다. **이관처 task 발행 전까지 귀속처는 본 절의 명시적 지시이며, 발행 요청은 `10.followups/` 에 남긴다** (이관처 없는 강등 금지).

## 변경 이력

- 2026-08-26 inspector: REQ-20260825-019 흡수, green 신규.
- 2026-08-26 inspector: 수용 기준 명령을 rc=0 == 충족 형태로 통일 (`! grep -q`), 현 HEAD 실측 박제, 단일 파일 실행의 비판별성 강등 표기.
- 2026-08-27 inspector: 동작 1·2 대기 조건 정합 항목 `[x]` — HEAD `49793e7` 재실행 rc=0 (수리 커밋 `5be66f4`).
- 2026-08-27 inspector: 동작 3·4 형태 보존 항목 3건 `[x]` — HEAD `49793e7` 재실행 전수 rc=0.
- 2026-08-27 inspector: 단일 파일 실행 항목 `[x]` — HEAD `49793e7` rc=0 (7 passed). 판별력 없음은 §참고 기존 표기 유지.
- 2026-08-27 inspector: `npm test` 항목을 중복 게이트로 §참고 강등 + 발화 채널 실경로 3건 박제. §수용 기준 전수 `[x]`.
- 2026-08-27 planner: green → blue 승격.
- 2026-08-29 inspector tick 241: **REQ-20260827-035 흡수 — blue 판본에서 green carry-over.** (i) 동작 (2) 의 "독립 비동기 경계" 를 **도착 이벤트 기준**으로 명확화하고 렌더 사이트와 갈리는 반례(`ImageSelector.tsx:215` vs `:85`·`:140`)를 표로 박제 — 유일 예시였던 `Monitor` 가 두 해석에서 같은 답을 내 기준을 대신했던 것이 분류 오류의 원인이다. (ii) 동작 **(2-a) 증가 부류** 신설. (iii) 동작 (5) 에 **rc 채널 2층** 부여 (모집단 비축소 + 증가 부류 전수). (iv) 수용 기준 3항 추가 — AC-6 증가 쌍 도착 대기 (`3 / 1` rc=1 **미충족**, 본 판본의 판정량) · AC-7 고정 지연 부재 (rc=0) · AC-8 모집단 비축소 (`18 / 5` rc=0). 기존 5항은 전부 보존. (v) §모집단 수치 정정 신설 — 원 표기 `19 hits / 7 files` 는 오기이며 어느 시점에도 files=7 관측이 없다. (vi) 검출 방향 4종을 §게이트 실효 검증 이관 으로 박제. | all
