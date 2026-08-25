# 테스트 실행의 네트워크 격리 — 미핸들 요청은 지연이 아니라 즉시 실패한다

> **위치**: 횡단 테스트 런타임 계약. 경계는 `src/setupTests.js` (전역 setup) 과 `src/test-utils/msw.ts` (`useMockServer`). 관측 대상은 프로덕션 컴포넌트가 렌더 중 발생시키는 HTTP 요청 전부.
> **관련 요구사항**: REQ-20260825-004 (test-network-egress-isolation)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 222 Phase 1 reconcile @ HEAD=`ff699f9`. TSK-20260825-14 착지 반영: (N-1)(N-1b)(N-3) **충족** — 수용 기준 **3/3**, unchecked 0. 동시에 tick 221 이 세운 세 판정 명령의 **민감도 0 결함을 실측 발견해 교체**했다 — §수용 기준 교정)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

테스트 프로세스가 발생시키는 HTTP 요청은 **전량 테스트 경계 안에서 처리되거나 즉시 실패한다.** 실제 소켓·DNS 조회로 나가는 요청은 0 이며, 핸들러가 없는 요청의 실패 판정은 **시간 예산이 아니라 구조**로 결정된다.

**방어 대상 (RULE-07 §주제 우선순위 2 — 명시 요건).** 기존 자동 게이트가 검출하지 못하는 silent regression 은 **"테스트 결과의 실행 환경 종속"** 이다. `npm test` · `tsc` · `eslint` · `check:*` 15종 어느 것도 "요청이 프로세스 밖으로 나갔는가" 를 묻지 않는다. 나간 요청은 resolver 가 빠른 환경에서는 빠르게 실패해 예산 안에 들어오므로 **로컬은 언제나 초록**이고, resolver 가 느린 환경에서만 예산을 잠식해 실패한다. 즉 이 결함의 신호는 **환경 차이로만** 나타나며 코드에는 어떤 흔적도 남기지 않는다.

**비용은 이미 실현됐다.** CI run `32713632648` (commit `6f01fde`) 이 동일 SHA 에서 attempt 1 실패 / attempt 2 성공했다 — 재실행만으로 초록이 된 flake 다.

```
FAIL src/Log/LogSingle.test.jsx > render LogSingle on prod server
Error: Test timed out in 5000ms.
[reportError] [TypeError: fetch failed] { [cause]: Error: getaddrinfo EAI_AGAIN monitor-api.test.local
```

**실패 지점과 발생원이 다르다는 점이 이 축의 핵심이다.** 타임아웃으로 신고된 것은 `LogSingle.test.jsx` 지만, 유출된 호스트는 `monitor-api.test.local` 로 **Monitor 축**의 것이다. 느린 DNS 조회는 워커 이벤트 루프를 점유하므로 **비용이 발생원이 아닌 이웃 테스트에 청구된다.** 따라서 이 축은 개별 테스트 파일의 수정으로 닫히지 않으며, 프로세스 경계에 서는 계약이어야 한다.

의도적으로 하지 않는 것:
- (i) 렌더·단정 시간 예산 값의 조정 (`ASYNC_ASSERTION_TIMEOUT_MS` / render budget) — 예산 상향은 원인을 가린다. 예산은 별 축이며 그 축의 수단이 될 수 없다.
- (ii) 격리 **수단** 지정 — 전역 msw 서버 · fetch 스텁 · undici agent 고정 · resolver 고정 중 무엇이든 효능이 충족되면 된다. planner·developer 영역이다.
- (iii) CI 간헐 실패의 다른 두 축 — teardown unhandled rejection (`EnvironmentTeardownError`, 실패 0) 과 실제 로직 FAIL. 서명이 다르고 판독 규칙이 다르다.
- (iv) `.env.test` 의 호스트명 선택. 가짜 호스트명 자체는 옳다 — 문제는 그것이 **조회 가능성을 전제한 채 실 resolver 로 나간다**는 것이다.

## 공개 인터페이스

없음 (횡단 런타임 계약). 측정 채널:

- **(M-A) 전역 차단 채널** — `src/setupTests.js` 가 미인터셉트 요청을 **동기적으로 실패**시키는 장치를 보유하는가. HEAD=`6f58541` 실측 **부재**: 행 주석을 제거하면 `onUnhandledRequest`·`setupServer`·`undici`·`dns` 어느 토큰도 남지 않는다 (`sed "s://.*::" src/setupTests.js | grep -cE "onUnhandledRequest|setupServer|undici|dns"` → **0**).
  - **주석 미제거 grep 은 이 파일에서 오탐한다** — `:51` 의 이디엄 주석이 `onUnhandledRequest` 를 담고 있어 장치가 없는데도 hit 한다. 측정은 항상 주석 제거 후에 한다.
- **(M-B) msw 미보유 렌더 파일 열거** — `render(` 를 쓰면서 `useMockServer`/`setupServer` 를 쓰지 않는 테스트 파일 수. 이 집합의 파일들에는 **어떤 인터셉터도 설치되지 않으므로** 렌더가 유발한 요청은 그대로 프로세스 밖으로 나간다.
  ```
  for f in $(grep -rl "render(" src --include="*.test.jsx" --include="*.test.tsx"); do
    grep -q "useMockServer\|setupServer" "$f" || echo "$f"
  done | wc -l
  ```
  HEAD=`6f58541` 실측 **19 파일** (전체 `render(` 보유 33 파일 중). 그중 `src/Monitor/Monitor.test.jsx` · `src/Monitor/WebVitalsMon.test.jsx` 는 lazy 패널이 마운트되면 `monitor-api.test.local` 로 나가는 경로를 보유한다 — CI 로그의 유출 호스트와 일치한다.

## 동작

1. **(N-1) 전역 fail-closed 차단** — 테스트 프로세스에는 미인터셉트 요청을 **즉시 오류**로 만드는 전역 장치가 있다. 개별 테스트 파일이 msw 서버를 설치했는지와 **무관하게** 성립한다.
   - **HEAD 실측: 위반.** 차단은 `useMockServer` 를 호출한 파일 안에서만 성립하고, 호출하지 않은 19 파일에서는 성립하지 않는다. 격리가 **파일 단위 opt-in** 이므로 신규 테스트 파일은 기본적으로 격리 밖에서 시작한다 — 이것이 **기본값의 방향이 틀린** 상태다.
2. **(N-2) 실패 판정의 예산 비종속** — 미핸들 요청의 실패는 시간 경과가 아니라 거부로 판정된다. 테스트 타임아웃 예산을 낮춰도 같은 판정이 난다.
   - 현행 `useMockServer` 는 `onUnhandledRequest: 'error'` 를 기본값으로 전달하므로 (`src/test-utils/msw.ts`), **인터셉터가 설치된 범위 안에서는 이미 이 성질을 갖는다.** 위반은 인터셉터 밖에서만 발생한다 — 즉 (N-2) 의 잔여는 (N-1) 의 잔여와 같은 집합이다.
3. **(N-3) 결과의 환경 무관성** — 같은 트리의 `npm test` 결과는 실행 환경의 resolver 응답 시간·오프라인 여부에 무관하다.
   - 이것이 (N-1)(N-2) 가 겨누는 **관측 가능한 귀결**이다. 동일 SHA 재실행 간 pass/fail 이 갈리는 상태를 계약 위반으로 본다.
4. **(N-4) 비용 귀속의 정확성** — 격리 위반의 신고 지점은 발생원과 다를 수 있다. 따라서 이 축의 판정은 **개별 실패 테스트의 초록화**로 종결되지 않는다.
   - 실측 사례: 신고 `LogSingle.test.jsx` / 유출 `monitor-api.test.local`. `LogSingle.test.jsx` 만 고쳐도 (N-1) 은 그대로 위반이며 다음 flake 는 다른 파일에 청구된다.

## 의존성

- 내부: `src/setupTests.js` (전역 setup — `vite.config.js` `setupFiles`), `src/test-utils/msw.ts` (`useMockServer`), `.env.test` (`VITE_*_API_BASE` 6종이 `*.test.local` 호스트).
- 외부: `vitest` (`environment: 'jsdom'`), `msw` (`setupServer` · `onUnhandledRequest`), Node resolver (`getaddrinfo`).
- 직교 spec: `runtime-fetch-unmount-safety` (testing) — 응답 도착 **이후**의 발화 억제 축. 본 계약은 요청이 **나가는지** 의 축이라 직교한다. 다만 두 축은 같은 증상(워커 teardown 경합)을 공유할 수 있다.

## 회귀 중점

1. (R-1) 신규 테스트 파일이 인터셉터 없이 fetch 유발 컴포넌트를 렌더 — 기본값이 opt-in 인 한 자동 재생산된다. (N-1) 이 기본값을 뒤집어야 닫힌다.
2. (R-2) **로컬 초록에 의한 은폐** — resolver 가 빠른 환경에서는 유출이 예산 안에 들어와 전 게이트가 초록이다. 로컬 재현 실패를 "해결됨" 으로 읽는 것이 이 축의 주된 오판이다.
3. (R-3) 예산 상향으로의 오회복 — 타임아웃을 올리면 증상만 사라지고 유출은 남는다. (N-2) 가 예산 비종속을 요구해 이 우회를 계약 위반으로 만든다.
4. (R-4) 개별 파일 패치로의 축소 — (N-4) 가 차단한다.

## 발화 채널

**HEAD=`ff699f9` 에서 이 축의 발화 채널이 부착됐다** (tick 221 시점 `6f58541` 에는 전무했다 — `src/setupTests.js` 실행 코드에 네트워크 토큰 0, `check:*` 15종 중 egress 0). 채널은 `src/__tests__/network-egress-isolation.test.ts` 이며 `npm test` 수집 경로에서 발화한다 (`npx vitest list` 실측 **5 tests**).

| 게이트 | HEAD=`ff699f9` 채널 | 상태 |
|---|---|---|
| N-1 (전역 차단) | `src/setupTests.js` 의 `globalThis.fetch = blockUninterceptedEgress` (동기 rejected promise) + 채널의 `(N-1)` 케이스가 **주석 제거 후** 실행 코드 실재 + `vite.config.js` `setupFiles` 등재를 함께 단언 | 부착 완료 (TSK-20260825-14) |
| N-2 (예산 비종속) | 채널의 `(N-2)` 케이스 — 실 요청 1건을 내고 거부를 단정, 나아가 **마이크로태스크 2회 안에 settle** 됨을 단언 | 부착 완료 |
| N-1b (표면 열거) | 채널의 `(N-1b)` 케이스 — `render(` 보유 테스트 파일을 **glob 산출**로 열거하고 하한 `≥ 20` 을 단언 (공허 통과 차단) | 부착 완료 |
| N-3 (환경 무관성) | 위 채널이 `npm test` 수집 경로에 등재 | 부착 완료 |
| N-4 (귀속 정확성) | 없음 | 계약 서술로만 |

**차단은 "지연"이 아니라 "거부"다.** 채널 `(N-2)` 의 세 번째 단언이 이 축을 지킨다 — 거부가 마이크로태스크 안에 완결되지 않으면 red 다. 이 단언이 없으면 **DNS 실패를 기다렸다가 거부하는 형태**, 즉 결함의 원형 그 자체가 앞의 두 단언을 통과한다. 실시간 예산(`< N ms`) 대신 마이크로태스크 경계로 재므로 부하에 흔들리지 않는다.

**inspector tick 222 가 채널의 검출력을 독립 재현했다** (`result.md` 주장 미인용, 저장소 트리 미변경 — `src/` 사본을 격리 디렉터리에 두고 주입).

| 주입 방향 | 조작 | 결과 |
|---|---|---|
| (Dir-2') 차단 장치 제거 | `globalThis.fetch = …` 블록 삭제 | 채널 `rc=1` — 5 중 **2 failed** |
| (Dir-3') fail-open 화 | `console.warn` 후 원본 `fetch` 위임 | 채널 `rc=1` — 5 중 **1 failed** |

`RULE-07 §promote 조건 4` 의 실경로 요건을 충족한다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** "차단을 제거하면 `rc≠0`" 은 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니다. 검출 방향을 보존한 채 **채널 부착 task 의 `## 검증/DoD`** 로 이관한다 — developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다.

- (Dir-1) 인터셉터 없는 테스트 파일에서 실 호스트로 나가는 요청 1건 주입 → 전역 차단 채널 `rc≠0`. 원복 → `rc=0`.
- (Dir-2) 전역 차단을 비활성화 → (Dir-1) 의 주입이 **통과**함을 대조 박제 (차단이 실제로 차단하고 있음의 증명).
- (Dir-3) 차단을 "경고 후 통과"(fail-open) 로 변경 → `rc≠0`. **fail-open 은 이 축에서 가장 실현 가능성이 높은 오답**이다 — 기존 테스트를 깨뜨리지 않으면서 도입할 수 있는 유일한 형태이기 때문이다.

> **관측 표면 주의** (`RULE-06 §관측 표면`) — 판정은 "차단 코드가 파일에 존재하는가" 가 아니라 **주입된 요청이 실제로 거부되는가** 로 한다. 토큰 존재 판정은 주석 한 줄로 충족된다.

## 테스트 현황

- [x] `useMockServer` 헬퍼가 `onUnhandledRequest: 'error'` 를 기본값으로 전달함이 단언돼 있다 — `src/test-utils/msw.test.ts:38`.
- [x] 전역 차단 장치의 실재·검출력 — `src/setupTests.js` 가 `globalThis.fetch` 를 **동기 rejected promise** 반환 래퍼로 교체한다 (`TestEgressBlockedError`). 검출력은 tick 222 가 (Dir-2')(Dir-3') 주입으로 독립 확인했다 (§발화 채널).
- [x] 인터셉터 미보유 렌더 파일이 **전역 차단으로 무해화**됐다 — 미보유 파일은 존재해도 되며 (파일별 opt-in 이 더 이상 격리의 전제가 아니다) 열거는 glob 산출 + 하한 `≥ 20` 으로 공허 통과를 차단한다. tick 221 시점 19 파일 미보유가 **유출 경로**였던 상태와 대비된다.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 측정 명령은 `src/**` 와 `package.json` 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2). **HEAD=`ff699f9` 기준 3/3 — unchecked 0.**
>
> **tick 222 교정 — 세 항목의 판정 명령을 전부 교체했다 (민감도 0 결함).** tick 221 판본의 세 명령은 모두 `ls src/__tests__/*egress* >/dev/null 2>&1 && exit 0` 을 선두 escape 로 갖고 있었다. 이는 **파일 이름만 보는 판정**이라, 채널 파일을 이름만 남기고 비우고 `src/setupTests.js` 의 차단 장치까지 삭제한 상태에서 **세 명령이 전부 `rc=0` 을 유지**했다 (tick 222 격리 사본 실측). 세 Must 기준이 빈 파일 하나로 충족되는 상태였고, 이는 `RULE-06 §게이트 실효 검증` 이 지목한 "정상 트리에서 기대대로 통과하는 검출력 0 게이트" 의 실물이다. 교체 명령은 **채널을 실제로 실행**하며, 같은 훼손 상태에서 전부 `rc=1` 로 떨어짐을 확인했다 (아래 각 항목의 민감도 실측). 아이러니하게도 그 escape 는 "토큰 존재 판정은 주석 한 줄로 충족된다" 는 본 문서 자신의 경고를 파일명 층위에서 반복한 것이었다.
>
> **환경 종속 명령을 수용 기준에 두지 않았다.** req 원안의 `npx vitest run src/Log/LogSingle.test.jsx` rc=0 · `npm test | grep -c "EAI_AGAIN"` → 0 · `--testTimeout=1500` rc=0 세 항목은 **현 HEAD 에서 이미 전부 통과한다** (inspector tick 221 실측: EAI_AGAIN 0회, `--testTimeout=1500` rc=0 / 9 passed). 불변식이 위반된 상태에서 통과하므로 그대로 두면 **0/3 이 아니라 3/3 인 거짓 충족**이 된다 — 위반이 로컬 resolver 의 속도에 가려지기 때문이다. 판정은 증상이 아니라 **차단 장치의 실재와 그 검출력**으로 한다.

- [x] (Must, N-1) 전역 fail-closed 차단의 실재 — 전역 setup 이 미인터셉트 요청을 거부하는 장치를 **실행 코드로** 보유하고, 그 거부가 등재된 판정 채널에서 실제로 관측된다. 판정:
  ```
  bash -c 'npx vitest run src/__tests__/network-egress-isolation.test.ts >/dev/null 2>&1 || exit 1;
           sed "s://.*::" src/setupTests.js | grep -qE "globalThis\.fetch[[:space:]]*="'
  ```
  **HEAD=`ff699f9` 실측 rc=0 → 충족** (tick 221 시점 rc=1). **민감도 실측** — 채널을 비우고 차단 장치를 삭제한 격리 사본에서 `rc=1`, 원복 후 `rc=0`. 두 절이 각각 필요하다: 앞 절은 **거부가 실제로 일어남**을, 뒤 절은 그 거부가 **주석이 아닌 실행 코드**에서 옴을 잰다.
  - **주석을 판정에서 제외한다 (tick 221 이 초안에서 실측한 오탐).** 주석 미제거 형태 `grep -qE "onUnhandledRequest|…" src/setupTests.js` 는 현 HEAD 에서 **rc=0 을 낸다** — `src/setupTests.js:51` 의 이디엄 주석 `listen({ onUnhandledRequest: 'error' })` 이 걸리기 때문이다. 아무 장치도 없는 상태에서 통과하는 공허 기준이었고, `RULE-06 §게이트 실효 검증` 이 말하는 "주석 한 줄로 충족되는 배선 grep" 의 실물이다. `sed "s://.*::"` 로 행 주석을 제거한 뒤 판정한다.
  - 토큰 존재는 **필요 조건일 뿐**이며 검출력은 (Dir-1)~(Dir-3) 주입이 채널 부착 task 에서 확인한다 (§발화 채널).
- [x] (Must, N-1b) 인터셉터 밖 렌더 표면의 무해화 — `render(` 보유 테스트 파일이 인터셉터를 설치하지 않아도 전역 차단 아래에 있고, 그 판정의 열거가 공허하지 않다. 판정:
  ```
  bash -c 'npx vitest run src/__tests__/network-egress-isolation.test.ts >/dev/null 2>&1 || exit 1;
           test "$(grep -rl "render(" src --include="*.test.jsx" --include="*.test.tsx" | wc -l)" -ge 20'
  ```
  **HEAD=`ff699f9` 실측 rc=0 / 열거 33 → 충족** (tick 221 시점 rc=1 / 미보유 19 파일). **민감도 실측** — 훼손 사본에서 `rc=1`, 원복 후 `rc=0`. **판정 형태를 바꾼 이유**: 전역 차단이 fail-closed 가 된 뒤로는 "미보유 파일 0" 이 더 이상 목표가 아니다 — 파일별 opt-in 이 격리의 전제에서 내려왔기 때문이다. 남는 요건은 (i) 무해화가 **실제로 성립**하고 (채널 실행), (ii) 열거가 **공허하지 않다** (하한 20) 두 가지다. 열거가 0 으로 무너지면 어떤 "미보유 0" 도 무조건 참이 된다.
  - **전역 차단으로의 무해화는 `src/setupTests.js` grep 이 아니라 등재 채널 파일의 실재로 판정한다.** 초안은 루프 안에서 setupTests 토큰을 보고 `continue` 했는데, 그 grep 이 주석에 걸려 **19 파일이 전부 스킵되고 rc=0** 이 나왔다 (tick 221 실측). 파일 단위 escape 절은 그 자체가 공허 통과 경로였다.
- [x] (Must, N-3) 판정 채널의 저장소 등재 — 위 차단이 `npm test` 수집 경로 또는 `check:*` script 중 **최소 1개 실경로**에서 발화한다. 판정: `bash -c 'npx vitest list 2>/dev/null | grep -q "network-egress-isolation"'` → rc=0. **HEAD=`ff699f9` 실측 rc=0 / 수집 5 tests → 충족** (tick 221 시점 rc=1 — `src/__tests__/` 14 파일 중 egress 축 0, `check:*` 15종 중 0). **민감도 실측** — 채널을 비운 사본에서 `vitest list` 히트 **0** → `rc=1`. 파일 존재(`ls`) 가 아니라 **runner 의 수집 결과**로 판정하는 이유가 여기 있다: 이름만 맞는 빈 파일은 수집되지 않는다. `src/setupTests.js` grep 을 이 항목의 대안 경로에서 **제외했다** — 주석 오탐 경로다. `RULE-07 §promote 조건 4` 의 실경로 요건이며, 채널 부재는 promote 차단이 아니라 채널 부착 task 발행의 선행 조건이다.

## 참고

- **REQ 원문**: `20.req/20260825-test-network-egress-isolation.md` (REQ-20260825-004, slug 식별).
- 소비한 followup: `20260824-1858-ci-logsingle-prod-server-timeout-dns-egress` (source_task `TSK-20260824-05`, testing/medium).
- CI 근거: run `32713632648` attempt 1 failure / attempt 2 success (동일 SHA `6f01fde`).
- **inspector tick 221 이 req 의 진단을 한 단계 밀어붙였다.** req 는 실패 지점 `LogSingle.test.jsx:53` 을 원인 위치로 서술했으나, 그 파일은 `useMockServer(() => mock.prodServerOk)` 로 인터셉터를 **보유**하고 있고 유출 호스트는 Monitor 축의 것이다. 실제 구조적 원인은 **격리가 파일 단위 opt-in** 이라는 것이며, 인터셉터 미보유 렌더 파일 19건을 실측해 그 집합을 §공개 인터페이스 (M-B) 에 박제했다. 이 재정식화가 없으면 task 는 `LogSingle.test.jsx` 를 고치고 닫히고, (N-4) 대로 다음 flake 가 다른 파일에 청구된다.

### 미측정·비판정 항목

- **(미측정 NFR) 오프라인 환경에서의 `npm test` 결과 일치.** 상시 오프라인 실행 채널이 CI·로컬 어느 쪽에도 없어 현 HEAD 에서 명령 1회로 rc 판정할 수 없다. (N-3) 의 판정은 차단 장치의 실재·발화로 대체한다.
- **(미측정 NFR) 동일 SHA CI 재실행 간 결과 불일치 0.** attempt 간 대조는 사후 관측이며 반복 판정 채널이 아니다. 관측 사실 자체는 §역할에 박제했다.
- **(자명·공허) `--testTimeout=1500` 하 rc=0.** 현 HEAD 에서 이미 통과한다 (실측 9 passed). 위반 상태에서 통과하므로 판정력이 없다 — resolver 속도가 빠른 환경에서는 어떤 코드 상태에서도 참이다.
- **(가정 주입 요구 — 이관 완료·착지) 차단 장치의 검출력.** (Dir-1)~(Dir-3) 으로 채널 부착 task DoD 에 이관했고 `TSK-20260825-14` (`ec5197f`, `injection: 3/3 detect`) 로 착지했다. inspector tick 222 가 격리 사본에서 독립 재현했다 — 결과는 §발화 채널에 박제. 상시 rc 판정 대상이 아니므로 계속 비체크박스로 둔다.
- **(미측정 NFR) 예산 축소 하 동일 판정.** tick 221 판본은 이를 §테스트 현황 체크박스로 두었으나 tick 222 가 강등했다 — 현 환경의 resolver 가 빨라 위반 상태에서도 통과하므로 측정은 가능하되 판정력이 0 이다. 같은 사유로 강등된 `--testTimeout=1500` 항목과 동일 부류다.
- **`.env.test` 호스트명의 조회 가능성.** 호스트명을 조회 가능한 것으로 바꾸는 것은 해법이 아니라 유출의 정상화다. 본 계약은 호스트명을 규정하지 않는다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | inspector tick 222 / HEAD=`ff699f9` (TSK-20260825-14 `ec5197f`) | **drift reconcile — (N-1)(N-1b)(N-3) 플립. 수용 기준 3/3, unchecked 0. 동시에 판정 명령 3건을 민감도 0 사유로 교체.** tick 221 판본의 세 명령은 전부 `ls src/__tests__/*egress*` 를 선두 escape 로 갖고 있어 **파일 이름만** 봤다 — 채널을 비우고 차단 장치까지 삭제한 격리 사본에서 세 명령이 전부 `rc=0` 을 유지했다 (실측). 세 Must 가 빈 파일 하나로 충족되는 상태였다. 교체본은 채널을 실제로 실행하고 (`npx vitest run` / `npx vitest list`) 같은 훼손 상태에서 전부 `rc=1` 로 떨어진다. 채널 자체의 검출력도 독립 재현했다 — 차단 장치 제거 시 2 failed, fail-open 화 시 1 failed. | 발화 채널, 테스트 현황, 수용 기준, 변경 이력 |
| 2026-08-25 | REQ-20260825-004 (inspector tick 221) | 최초 등록. followup 1건을 흡수한 req 를 불변식으로 재정식화. **req 의 수용 기준 5항 중 3항을 그대로 쓰지 않았다** — `LogSingle.test.jsx` rc=0 · `EAI_AGAIN` 0회 · `--testTimeout=1500` rc=0 은 현 HEAD 에서 **이미 전부 통과**하므로(tick 221 실측) 불변식이 위반된 채 3/3 거짓 충족을 낸다. 판정을 증상에서 **차단 장치의 실재와 검출력**으로 옮기고, 통과하는 세 명령은 §미측정·비판정 항목에 근거와 함께 강등했다. 나머지 2항(`test.local` grep · 오프라인 대조) 중 전자는 현 HEAD 에서 `src/**` hit **0** 이라(호스트는 `.env.test` 에만 있다) 판정 대상이 아니고, 후자는 채널 부재로 강등했다. **신규 추가 (req 에 없던 항목)**: (a) (M-B) 인터셉터 미보유 렌더 파일 **19건** 실측 — req 가 지목하지 않은 구조적 원인이며 (N-1b) 의 판정 대상이다. (b) (N-4) 비용 귀속의 정확성 — 신고 지점(`LogSingle`)과 유출 호스트(`monitor-api`)가 다르다는 실측에서 도출했고, 개별 파일 패치로의 축소를 차단한다. (c) (Dir-3) fail-open 오답 방향 — 기존 테스트를 깨뜨리지 않고 도입 가능한 유일한 형태라 가장 실현 가능성이 높다. | all |
