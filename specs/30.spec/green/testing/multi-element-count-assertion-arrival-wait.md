# 복수 개수 단언의 대기 조건은 개수 도달이다

> **출처 req**: REQ-20260825-019
> **상태**: green (WIP)

## 역할

테스트가 "요소 N 개(N>1)" 를 단언할 때, 그 단언에 선행하는 **대기 조건이 N 개 도달과 일치**함을 계약으로 세운다.

`findAllBy*` 는 매치가 **1개 이상** 생기는 즉시 resolve 한다. 그 반환값에 곧바로 `toHaveLength(N)` (N>1) 을 거는 형태는 대기 조건(≥1)과 단언 조건(=N)이 어긋난 상태이며, 세어야 할 요소들이 서로 독립인 비동기 경계에서 도착할 때 그 간극이 스케줄링 창에 노출된다. 이 spec 이 방어하는 것은 **단언의 강도가 아니라 대기 조건의 정합**이다.

이 정합 위반은 기존 자동 게이트로 검출되지 않는다 — 위반 테스트는 단독 실행에서 통과하고 전량 실행의 부하 조건에서만 red 가 되므로, 통과하는 CI 가 계약 위반을 은폐한다.

## 동작

### (1) 대기 조건 ≥ 단언 조건

복수 개수 단언(`toHaveLength(N)` · `.length` 비교, N>1)이 성립하려면, 그 시점까지 **N 개 도달이 대기된 상태**여야 한다. 대기 조건이 ≥1 resolve 인 API 의 반환값 스냅샷에 개수를 거는 형태는 계약 위반이다.

정합 대기의 형태는 다음 중 하나다:

- `await waitFor(() => expect(screen.getAllByRole(...)).toHaveLength(N))` — 개수 도달 자체가 대기 술어.
- 세어야 할 요소 **각각**을 개별적으로 `findBy*` 로 대기한 뒤 동기 `getAllBy*` 로 계수.
- 세는 요소 전부가 **단일 비동기 경계의 한 커밋**에서 함께 나타남이 구조적으로 보장 — 이 경우 경합 창이 없으므로 `findAllBy*` 직후 계수가 허용된다.

### (2) 경계 귀속이 판정 기준이다

위반 여부는 문법 형태가 아니라 **세어야 할 요소들이 몇 개의 독립 비동기 경계에 귀속되는가**로 판정한다. 귀속 경계가 ≥2 이면 위반, 1 이면 허용이다.

`src/Monitor/Monitor.jsx` 는 패널마다 별도 `lazy()` + 별도 `<Suspense>` 를 두므로, 그 패널들이 기여하는 요소를 세는 단언의 귀속 경계는 패널 수와 같다. 이 경계 독립성은 별도 계약(`Monitor` 셸 축 (4))이 보존 대상으로 세우고 있으며, 본 계약은 그것을 전제로 한다 — 경계를 합치는 방향의 수리는 본 계약의 해법이 아니다.

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

## 수용 기준

> 아래 명령은 전부 **rc=0 == 계약 충족** 으로 통일돼 있다 (0 hit 을 요구하는 항목은 `! grep -q` 형태). 판정은 hit 수 육안 대조가 아니라 종료 코드로 한다.

- [x] (Must, 동작 1·2) Given 패널 개수 단언 지점, When `bash -c '! grep -qE "await screen\.findAllByRole" src/Monitor/Monitor.test.jsx'`, Then rc=0 (≥1 resolve 스냅샷 계수 형태 부재).
- [x] (Must, 동작 4) Given 동일 파일, When `bash -c 'grep -qE "toHaveLength\(PANEL_HEADINGS_IN_ORDER\.length\)" src/Monitor/Monitor.test.jsx'`, Then rc=0 (개수 단언 보존).
- [x] (Must, 동작 4) Given 동일 파일, When `bash -c 'grep -qE "toEqual\(PANEL_HEADINGS_IN_ORDER\)" src/Monitor/Monitor.test.jsx'`, Then rc=0 (순서 단언 보존).
- [x] (Must, 동작 3) Given 동일 파일, When `bash -c '! grep -qE "setTimeout|advanceTimersByTime|await new Promise" src/Monitor/Monitor.test.jsx'`, Then rc=0 (고정 지연 부재 — req 는 셸 축 블록 한정이었으나 파일 전역으로 상향, 현 HEAD 에서 충족).
- [ ] (Must, 동작 1) Given 현 HEAD, When `npx vitest run src/Monitor/Monitor.test.jsx`, Then rc=0.
- [ ] (Must, 동작 1) Given 현 HEAD, When `npm test`, Then rc=0 (경합 창은 전량 실행 부하에서만 노출된다 — 이쪽이 판별 채널이다).

### 현 HEAD 실측 (2026-08-27, `49793e7`)

| 항목 | 결과 |
|---|---|
| `! grep -q "await screen\.findAllByRole"` | rc=0 — 충족 (`5be66f4` 가 `:165` 를 개수 도달 대기로 정합화) |
| `grep -q "toHaveLength(PANEL_HEADINGS_IN_ORDER.length)"` | rc=0 |
| `grep -q "toEqual(PANEL_HEADINGS_IN_ORDER)"` | rc=0 |
| `! grep -q "setTimeout\|advanceTimersByTime\|await new Promise"` | rc=0 |
| `npx vitest run src/Monitor/Monitor.test.jsx` | rc=0 (7 passed) — **비판별**, 아래 참고 |
| 동작 (5) 열거 명령 | 19 hits / 7 files (req 실측치와 일치) |

## 참고

- 위반 지점 (req 시점): `src/Monitor/Monitor.test.jsx:164-169` — 첫 패널만 `findByText` 로 대기한 뒤 `findAllByRole` 반환값에 4 를 요구.
- 경계 출처: `src/Monitor/Monitor.jsx` 의 `lazy()` 4건 · `<Suspense>` 4건.
- 인접 축 (중복 아님): 전역 상태 누출로 인한 **실행 순서** 종속은 별 축(REQ-20260825-003)이다. 본 계약은 비동기 도착 **시점** 종속을 다룬다.

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- **단일 파일 실행의 비판별성** — `npx vitest run src/Monitor/Monitor.test.jsx` 는 계약이 위반된 현 HEAD 에서도 rc=0 이다 (2026-08-26 실측 7 passed). 이 항목은 수리 후 회귀 바닥선이지 위반 검출 채널이 아니다. 검출은 전량 실행(`npm test`)과 형태 게이트(위 grep 4건)가 맡는다.
- **전량 실행 반복 결정성** — 부하 의존 flake 의 재현율은 러너 부하의 함수이므로 "N 회 반복 통과" 는 결정적 rc 판정이 아니다. 판정 대상에서 제외한다. 단일 `npm test` rc 로만 판정한다.
- **판별력 실효 (패널이 3개로 줄면 red)** — 가정 주입 요구 부류. 검출 방향은 "기여 패널 수 감소 → 개수 단언 red" 이며, 주입 판정은 본 계약을 수리하는 task 의 DoD 로 이관한다 (RULE-06 §게이트 실효 검증). 이관처 task 미발행 시 발행 요청을 `10.followups/` 에 남긴다.
- **모집단 전수 분류 (19건)** — 분류표의 등재 여부는 단일 명령 rc 로 판정되지 않는다. 동작 (5) 의 열거 명령이 산출하는 각 지점의 분류는 수리 task 의 산출물로 박제한다.
- **프로덕션 비파괴 (`src/Monitor/**` 변경 0)** — 변경 없음은 task 단위 diff 범위 조건이며 HEAD 단독 rc 판정 대상이 아니다.

## 변경 이력

- 2026-08-26 inspector: REQ-20260825-019 흡수, green 신규.
- 2026-08-26 inspector: 수용 기준 명령을 rc=0 == 충족 형태로 통일 (`! grep -q`), 현 HEAD 실측 박제, 단일 파일 실행의 비판별성 강등 표기.
- 2026-08-27 inspector: 동작 1·2 대기 조건 정합 항목 `[x]` — HEAD `49793e7` 재실행 rc=0 (수리 커밋 `5be66f4`).
- 2026-08-27 inspector: 동작 3·4 형태 보존 항목 3건 `[x]` — HEAD `49793e7` 재실행 전수 rc=0.
