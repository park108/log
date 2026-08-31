# 다른 채널 부수효과 단언의 대기 조건은 그 채널이다

> **관련 요구사항**: REQ-20260901-082 FR-01~FR-05 · NFR-01~NFR-04
> **출처**: developer followup `20260831-2320-await-render-then-assert-side-effect` (CI run `33399143440` · 수정 `06425e7`)
> **참조 코드는 식별자·도출 우선.** 줄 번호는 HEAD=`c82c629` 스냅샷 보조다.

## 역할

테스트가 **비-DOM 채널**(`sessionStorage` · `localStorage` · `document.title` · spy 호출)의 부수효과를 단언할 때, 그 단언에 선행하는 **대기 조건이 같은 채널의 도달**임을 계약으로 세운다.

`waitFor` 로 렌더/DOM 조건을 기다린 뒤 다른 채널을 즉시 단언하는 형태는, 그 채널을 쓰는 것이 **별도 effect** 일 때 대기와 단언이 어긋난다. 목록 렌더는 `logs` 상태가, 커서 쓰기는 `lastTimestamp` 를 deps 로 하는 다른 effect 가 한다 — **렌더를 기다리는 것은 그 effect 를 기다리는 것이 아니다.**

**방어 대상 (기존 자동 게이트로 검출되지 않는 silent regression — `RULE-07 §주제 우선순위 2`)**: 위반은 로컬에서 영원히 초록이고 CI 부하에서만 산발적으로 붉는다. 그때 **실패가 그 커밋의 변경에 귀속되지 않는다** — master 가 무관한 파일에서 붉어 이후 커밋의 신호가 망가진다. 실물 표본: CI run `33399143440`, `LogList.test.tsx > 더 남아 있으면 커서를 지키다`, 로컬 재현 0회(단독 3 · 전체 1).

이 계약은 도달-대기 가족의 **비-DOM 채널 판본**이다. 같은 명제의 DOM 판본은 `blue/testing/absence-assertion-arrival-precondition`(부재 도달) 과 `blue/testing/multi-element-count-assertion-arrival-wait`(N 개 도달) 이 소유하며, 셋 중 어느 것도 이 축을 판정하지 않는다.

### 이 계약이 하지 않는 것

- **문법 패턴을 금지하지 않는다.** `await waitFor(...)` 뒤에 `expect` 가 오는 표기 자체는 위반이 아니다. 현 HEAD 도출 15 자리 중 **11 이 SAME-CHANNEL** — `waitFor` 가 뒤에 단언할 바로 그 채널을 이미 기다린 자리다. 그 형태를 세는 게이트는 특이도가 4/15 다.
- **잔존 정리를 요구하지 않는다.** 현 HEAD 의 저장 채널 불일치는 **0** 이다 (`06425e7` 이 실측된 2곳을 닫았다). 본 계약은 회귀 방지다.
- CI 러너 자원·타임아웃·`vitest` 설정 축은 다루지 않는다.
- **DOM 채널의 도달 대기**는 위 두 blue 계약 소유다. 겹치면 중복 게이트다.

## 공개 인터페이스
- 없음 (테스트 계약). 판정면은 `src/**` 테스트 소스의 **대기 조건과 단언 채널의 관계**이며, 발화 채널은 `scripts/check-*.sh` + `package.json` `check:*` 저장소 관용을 따른다.

## 동작

1. **(I1) 저장 채널 단언의 대기 조건은 같은 채널이다**: `sessionStorage` · `localStorage` · `document.title` 을 단언하는 자리는, 선행 대기 조건이 **그 채널의 도달**이어야 한다. 렌더·DOM·훅 상태를 기다리고 저장 채널을 단언하는 자리는 위반이며, 그 수는 **0** 이어야 한다.
2. **(I2) 판정면은 문법이 아니라 채널 일치다**: SAME-CHANNEL 자리 — `waitFor` 본문이 뒤에 단언할 같은 채널을 이미 기다린 자리 — 는 **위반이 아니다**. 게이트가 그것을 세면 과잉 표집이다 (`RULE-06 §음성 대조`).
3. **(I3) spy 채널 불일치는 정적 위반으로 세지 않는다 — 주입으로 판정한다**: DOM·훅 상태를 기다리고 spy 호출을 단언하는 자리는 대기 조건이 단언 대상을 **인과적으로 함의**할 수 있다 (렌더되었다면 데이터가 왔고, 데이터가 왔다면 API 가 불렸다). 이 부류의 판정은 **부수효과를 한 틱 늦추고 붉어지는지 보는 주입**이며 정적 계수가 아니다. 현 HEAD 의 이 부류는 4 자리다 (§스코프 규칙 표).
4. **(I4) 모집단은 도출한다**: 손 열거 금지 (`RULE-06 §열거 고정 금지`). 도출 대상은 `find src \( -name "*.test.ts" -o -name "*.test.tsx" \)` 이며 HEAD=`c82c629` 실측 **117 파일**이다. **`npx vitest run` 이 보고하는 `Test Files 118` 은 이 모집단이 아니다** — 루트 `vite.config.test.js` 가 vitest 기본 include 에 걸려 1건 더 잡힌다. 두 수를 같은 것으로 쓰면 모집단이 1 어긋난다. 어느 수를 쓰는지 게이트 출력에 이름으로 박제한다 (`src-test-files` / `vitest-test-files`).
5. **(I5) `waitFor` 문 경계는 괄호 균형으로 찾고, 채널 일치는 낱말 경계로 판정한다**: 단일 줄 정규식은 여러 줄 `waitFor` 를 놓친다. 그리고 **식별자 일치를 부분 문자열로 하면 오분류가 난다** — 실측: `expect(get.mock.calls.length)` 의 식별자 `get` 이 대기 본문의 `screen.getByTestId(...)` 에 부분 매치해 **불일치 자리가 SAME-CHANNEL 로 분류됐다** (`src/Comment/Comment.load-failure-surface.test.tsx:111`). 낱말 경계(`\bget\b`)로 바꾸자 같은 자리가 DIFF 로 뒤집혔고 전체 분류가 `same=12` → `same=11` 로 정정됐다.
6. **(I6) 게이트는 발화 채널에 실재한다**: 위 판정은 `scripts/check-side-effect-wait-channel.sh` + `package.json` `check:side-effect-wait-channel` 로 발화한다 (`RULE-07 §promote 조건 4`). 게이트는 도출이 비면 통과가 아니라 **무판정 실패**(`exit 2`)로 닫는다.

### 회귀 중점

- **정적 패턴만 세는 게이트는 11/15 오탐이다.** 이 방향은 오늘 `(I8)`·`(I12)` 가 정상 용법을 위반으로 계수해 승격이 거부된 것과 **같은 실패 형태**다 (REQ-20260901-083).
- **반대로 저장 채널까지 면제하면 검출력이 0 이 된다.** 유일한 실물 양성 표본이 저장 채널이다.
- **대기 조건을 `waitFor` 한 줄만 보고 판정하면 여러 줄 형태를 통째로 놓친다** — 실측 15 자리 중 다수가 여러 줄 `waitFor` 다.
- **모집단을 `vitest` 보고 파일 수(118)로 잡으면 1 어긋난다** — `src/**` 는 117 이다. 어긋난 모집단은 게이트가 아니라 계수 오류를 낸다.

## 의존성
- 내부: `src/**` 테스트 소스 (도출 모집단) · `scripts/` (발화 채널) · `package.json` (`check:*` 등록).
- 실물 표본: `06425e7` (*test: 커서 단언이 목록 렌더가 아니라 커서 쓰기를 기다린다*) — 그 **부모 트리**가 이 축의 유일한 양성 표본이며 `git show 06425e7^:src/Log/LogList.test.tsx` 로 언제나 재현 가능하다.
- 직교/경계: `blue/testing/absence-assertion-arrival-precondition` · `blue/testing/multi-element-count-assertion-arrival-wait` (**같은 명제의 DOM 판본**) · `blue/testing/post-await-guard-individual-observability` (가드 분해능 — 채널 일치 축이 아니다).

## 테스트 현황

> 각 명령은 HEAD=`c82c629` 에서 **파일에서 추출해** 실행했고 rc 를 박제한다. 실행은 `git archive c82c629` 격리 사본(`src` 실사본)에서 했고 메인 워킹트리 `src` 는 읽기만 했다 (developer 동시 작업 중 — `RULE-02 §교차 작업 파괴`).

- [x] (I4 모집단 도출 비공허 — 파일) 도출 모집단이 비어 있지 않다: `bash -c 'n=$(find src \( -name "*.test.ts" -o -name "*.test.tsx" \) | wc -l | tr -d " "); echo "src-test-files=$n"; test "$n" -ge 100'` → HEAD=`c82c629` 실측 **rc=0** (`src-test-files=117`). **하한으로 닫는 이유**: 정확한 수로 못 박으면 테스트가 하나 늘 때마다 계약이 거짓이 된다. 판정 대상은 모집단의 실재이지 크기가 아니다.
- [x] (I4 모집단 도출 비공허 — 저장 채널) 저장 채널 단언이 실재한다: `bash -c 'n=$(grep -rlE "expect\(\s*(sessionStorage|localStorage|document\.title)" src --include="*.test.ts" --include="*.test.tsx" | wc -l | tr -d " "); echo "storage-assert-files=$n"; test "$n" -ge 1'` → HEAD=`c82c629` 실측 **rc=0** (`storage-assert-files=8`). 이 도출이 비면 (I1) 은 **공허 통과**한다.
- [x] (실물 양성 표본 실재) 유일한 양성 표본이 히스토리에 남아 있다: `bash -c 'git cat-file -e 06425e7^:src/Log/LogList.test.tsx'` → HEAD=`c82c629` **저장소 루트에서** 실측 **rc=0** (격리 사본은 `.git` 이 없어 `rc=128` — 이 항목만 저장소 루트가 판정 환경이다). 그 블롭에서 저장 채널 불일치 **2 자리**(`:336` · `:394`, 둘 다 `sessionStorage.getItem('logListLastTimestamp')`)가 도출되고 현 HEAD 의 같은 파일에서는 **0** 이다 (§스코프 규칙 실측).
- [ ] (I6 채널 실재) 게이트가 발화 채널에 등록돼 있다: `bash -c 'f=scripts/check-side-effect-wait-channel.sh; test -x "$f" || exit 1; grep -qE "\"check:side-effect-wait-channel\"" package.json'` → HEAD=`c82c629` 실측 **rc=1 (채널 부재)**. 미착수이며 이관처 task 는 미발행이다.
- [ ] (I1 저장 채널 불일치 0) 게이트가 저장 채널 불일치를 0 으로 판정한다: `bash -c 'f=scripts/check-side-effect-wait-channel.sh; test -x "$f" || exit 1; out=$("$f" 2>&1); rc=$?; echo "$out" | grep -qE "storage-mismatch=0" || exit 1; exit $rc'` → HEAD=`c82c629` 실측 **rc=1 (채널 부재)**. 게이트 착지 후 이 값은 **0** 이어야 한다 (현 트리 실측 0 — §스코프 규칙).
- [ ] (I2 특이도 — SAME-CHANNEL 비계수) 게이트가 SAME-CHANNEL 자리를 위반으로 세지 않는다: `bash -c 'f=scripts/check-side-effect-wait-channel.sh; test -x "$f" || exit 1; out=$("$f" 2>&1); echo "$out" | grep -qE "same-channel=[1-9]" || exit 1; echo "$out" | grep -qE "storage-mismatch=0"'` → HEAD=`c82c629` 실측 **rc=1 (채널 부재)**. **두 수를 함께 요구하는 이유**: `storage-mismatch=0` 만 요구하면 아무것도 도출하지 않는 게이트가 통과한다.
- [ ] (I4·I6 무판정 닫기) 도출이 비면 게이트가 통과가 아니라 실패한다: `bash -c 'f=scripts/check-side-effect-wait-channel.sh; test -x "$f" || exit 1; grep -qE "exit 2" "$f" && grep -qE "src-test-files|storage-assert-files" "$f"'` → HEAD=`c82c629` 실측 **rc=1 (채널 부재)**.
- [ ] (I5 판정 표현 요건) 게이트가 괄호 균형과 낱말 경계로 판정한다: `bash -c 'f=scripts/check-side-effect-wait-channel.sh; test -x "$f" || exit 1; grep -qE "tr/\(/|balance|괄호" "$f" && grep -qF "\\b" "$f"'` → HEAD=`c82c629` 실측 **rc=1 (채널 부재)**. 부분 문자열 일치는 실측 오분류를 냈다 (§동작 (I5)).

## 수용 기준

- [x] (Must, FR-03 모집단) 위 §테스트 현황 (I4 모집단 도출 비공허 — 파일) 명령 → rc=0 (`src-test-files` ≥ 100). HEAD=`c82c629` 실측 rc=0 (117).
- [x] (Must, FR-01 모집단) 위 §테스트 현황 (I4 모집단 도출 비공허 — 저장 채널) 명령 → rc=0 (`storage-assert-files` ≥ 1). HEAD=`c82c629` 실측 rc=0 (8).
- [x] (Must, NFR-01 표본 실재) 위 §테스트 현황 (실물 양성 표본 실재) 명령 → rc=0. HEAD=`c82c629` 실측 rc=0.
- [ ] (Must, FR-01·NFR-03) 위 §테스트 현황 (I1 저장 채널 불일치 0) 명령 → rc=0.
- [ ] (Must, FR-04·NFR-02) 위 §테스트 현황 (I2 특이도 — SAME-CHANNEL 비계수) 명령 → rc=0.
- [ ] (Must, FR-03) 위 §테스트 현황 (I4·I6 무판정 닫기) 명령 → rc=0.
- [ ] (Must, FR-03) 위 §테스트 현황 (I5 판정 표현 요건) 명령 → rc=0.
- [ ] (Must, RULE-07 §promote 조건 4) 위 §테스트 현황 (I6 채널 실재) 명령 → rc=0.
- [x] (Must, 범위 제한) DOM 채널 도달 대기 · SAME-CHANNEL 자리의 재작성 · CI 러너 자원 · `vitest` 설정은 본 계약의 요구 대상이 아니다 — §역할 §이 계약이 하지 않는 것.

## 스코프 규칙

- **expansion**: 불허 — 신설 대상은 `scripts/check-side-effect-wait-channel.sh` 와 `package.json` `scripts` 블록 2 곳이다. **`src/**` 테스트는 읽기 대상**이며 본 계약은 현 HEAD 에서 그 어느 것도 고칠 것을 요구하지 않는다 (저장 채널 불일치 0). 게이트 위반이 이 밖에서 나오면 격리 대상이다.
- **grep-baseline** (HEAD=`c82c629` 격리 사본 실측):
  - 모집단: `find src \( -name "*.test.ts" -o -name "*.test.tsx" \) | wc -l` → **117**. `npx vitest run` 보고 → **118 Test Files** (루트 `vite.config.test.js` 포함). **두 수는 다른 것을 잰다.**
  - `grep -rlE "expect\(\s*(sessionStorage|localStorage|document\.title)" src --include="*.test.ts" --include="*.test.tsx"` → **8 파일** (`Search.test.tsx` 2 · `search-query-in-url.test.tsx` 3 · `common.test.ts` 3 · `LogSingle.test.tsx` 8 · `Writer.draft.test.tsx` 5 · `Writer.test.tsx` 3 · `LogList.test.tsx` 5 · `draft.test.ts` 1).
  - `grep -nE "\"check:side-effect-wait-channel\"" package.json` → **0 hit** · `ls scripts/check-side-effect-wait-channel.sh` → 부재. 이것이 (I6) 의 zero-point 다.
  - **도출 판정 실측** (괄호 균형 + 낱말 경계 분류, 117 파일 전수):

    | 지표 | 값 |
    |---|---|
    | 대기-후-즉시-단언 자리 (비-DOM 채널) | **15** in **9 파일** |
    | SAME-CHANNEL (위반 아님) | **11** |
    | 채널 불일치 | **4** |
    | 저장 채널 (`sessionStorage`·`localStorage`·`document.title`) | **5** — **전건 SAME-CHANNEL** |
    | spy 채널 | **10** |
    | **저장 채널 불일치 (I1 판정값)** | **0** |

  - **채널 불일치 4 자리** (전부 spy 채널 — (I3) 의 주입 판정 대상이지 정적 위반이 아니다):

    | 자리 | 기다린 것 | 단언한 것 |
    |---|---|---|
    | `src/Comment/Comment.load-failure-surface.test.tsx:111` | `getByTestId('comment-toggle-button')` 텍스트 | `get.mock.calls.length` |
    | `src/Log/LogItem.test.tsx:574` | `expect(article).toHaveClass(…)` | `deleteSpy` 호출 수 |
    | `src/Log/LogSingle.test.tsx:397` | `screen.getByText("Test Contents")` | `useLogSpy` 호출 여부 |
    | `src/Log/hooks/useLogList.test.ts:60` | `result.current.isSuccess` | `api.getLogs` 호출 인자 |

  - **양성 표본 대조** (같은 도출 프로그램을 히스토리 블롭에 적용):

    | 트리 | `src/Log/LogList.test.tsx` 저장 채널 불일치 |
    |---|---|
    | `06425e7^` (수정 전) | **2** (`:336` · `:394`) |
    | `c82c629` (현 HEAD) | **0** |

- **rationale**: 이 축의 게이트는 **민감도와 특이도가 서로를 잡아먹는 자리**다 — 정적 패턴을 넓게 세면 11/15 오탐이고, 저장 채널까지 면제하면 유일한 실물 양성 표본을 놓친다. 그래서 baseline 을 부류별 계수로 박제하고 판정값을 **`storage-mismatch`** 하나로 좁혔다. `same-channel` 을 함께 출력하도록 요구한 것은 공허 통과(도출 0 인 게이트)를 막기 위해서다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 256차 tick (Phase 3, REQ-20260901-082 흡수) / pending @ HEAD=`c82c629` | **최초 박제 — 6 축.** 도달-대기 가족의 비-DOM 채널 판본. 모집단을 괄호 균형 도출로 직접 재산출해 **15 자리 / 9 파일**을 재현했고, 분류에서 **자체 오분류 1건을 검출·정정**했다 — 식별자 부분 문자열 매치가 `get` ↔ `getByTestId` 로 붙어 `same=12` 를 냈고 낱말 경계로 고쳐 `same=11` (discovery 산정과 일치). 판정값을 `storage-mismatch` 로 좁힌 것이 핵심 판단: 정적 패턴 계수는 11/15 오탐이고, spy 불일치 4건은 인과 함의라 **주입으로만 판정 가능**하다. 양성 표본은 `06425e7^` 블롭에서 **2 자리** 도출로 실증했고 현 HEAD 는 **0** 이다. 채널(`scripts/check-side-effect-wait-channel.sh`)은 부재이며 `RULE-07 §promote 조건 4` 에 따라 **채널 부착 task 발행이 선행 조건**이다. | all |

## 참고

### 주입 이관 (RULE-06 §게이트 실효 검증 — 게이트 신설 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. **이관처 task 는 미발행**이며, `scripts/check-side-effect-wait-channel.sh` 를 세우는 task 의 DoD 가 아래를 왕복해야 한다.

- **Dir-1 (민감도, I1 — 실물 표본)** — `git show 06425e7^:src/Log/LogList.test.tsx` 블롭을 판정 입력으로 넣는다 → `storage-mismatch≥1`, `rc≠0`. **고장을 낼 필요가 없는 주입이다** — 양성 표본이 히스토리에 이미 있다.
- **Dir-2 (민감도, I1 — 합성)** — 임의 테스트에서 `await waitFor(() => expect(screen.getByText(...)).toBeInTheDocument());` 다음 줄에 `expect(sessionStorage.getItem('x')).not.toBeNull();` 를 넣는다 → `rc≠0`.
- **Dir-3 (민감도, I4 — 공허)** — 도출 모집단을 비운다 (존재하지 않는 경로로 스캔) → `rc=2` (통과 아님).
- **Ctrl-1 (특이도, I2)** — SAME-CHANNEL 자리를 하나 더 만든다 (`await waitFor(() => expect(document.title).toContain('x')); expect(document.title).toBe('xy');`) → `rc=0`. **붉으면 게이트가 과잉 표집이다** — 게이트를 좁힌다.
- **Ctrl-2 (특이도, I3)** — spy 채널 불일치 자리를 하나 더 만든다 (DOM 대기 후 spy 호출 단언) → `rc=0`. 본 계약은 이 부류를 정적 위반으로 세지 않는다.
- **Ctrl-3 (특이도)** — 본 계약이 범위 밖으로 선언한 축(DOM 부재·개수 도달 대기)의 정상 변경 → `rc=0`.

### 미측정·비판정 항목

- **spy 채널 불일치 4 자리가 실제로 안전한지는 판정하지 않았다.** 넷 다 대기 조건이 단언 대상을 인과적으로 함의하는 형태로 **보이지만**, 확인은 부수효과 한 틱 지연 주입이며 그것은 게이트 도입 시점 1회 판정이라 §주입 이관 (Ctrl-2 인접) 으로 넘긴다. 넷을 위반으로 세지 않는다는 것이 계약이고, 넷이 안전하다는 것은 계약이 아니다.
- **CI 부하 재현은 측정 채널이 없다.** 플레이키는 정의상 로컬에서 재현되지 않으며(단독 3회·전체 1회 전부 초록), 본 계약이 재는 것은 실패의 발생이 아니라 **구조의 정합**이다.
- **`06425e7` 이전 상태로 전 스위트를 되돌려 붉음을 관측하지 않았다** — 그 관측은 `setTimeout(…, 0)` 지연 주입으로 developer 가 이미 수행해 followup 에 박제했다. 본 계약은 그 결과를 인용하되 재현을 요구하지 않는다.
- **판정 프로그램의 구현 언어·형태는 지정하지 않는다.** `perl`·`node`·셸 중 무엇이든 (I4)(I5)(I6) 의 요건을 만족하면 된다.
