# 커버리지 per-file 분기 귀속 단조성 계약

> **위치**: 횡단 측정 계약 — `vite.config.js:80-97` `test.coverage` (현 HEAD provider `istanbul`, thresholds branches 94) + `package.json:21` `scripts.test` (`vitest run --coverage`). 관측 최소 사례는 `src/Toaster/Toaster.tsx` 의 `branchMap` 슬롯 (구 v8 체제의 위반 귀속처).
> **관련 요구사항**: REQ-20260824 (coverage-per-file-branch-aggregation-determinism)
> **최종 업데이트**: 2026-08-24 (by inspector — Phase 1 tick 217. G-A 위반 해소를 독립 재현해 플립, G-B 는 주입 부류로 강등, G-C 는 채널 부재로 유지)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

커버리지 집계는 **테스트 집합에 대해 단조**여야 한다 — 어떤 분기 슬롯이 테스트 부분집합 실행에서 covered 로 기록되면, 그 부분집합을 포함하는 전수 실행에서도 covered 여야 한다. 집계는 실행 사실을 잃지 않는다.

**방어 대상 (RULE-07 §주제 우선순위 2 — 명시 의무).** 본 계약이 방어하는 손상은 **커버리지 게이트 자신의 무력화**이며, 게이트가 무력화된 사실을 잡아내는 상위 게이트가 없다.

1. **CI 게이트 판정이 코드와 무관한 요인으로 뒤집힌다.** `vite.config.js:95` `thresholds.branches: 94` 는 현 HEAD 분모 1131 에서 covered ≥ 1064 를 요구한다. 실측 covered 1080 — margin 16 슬롯. 구 v8 체제에서 이 계약이 검출한 소실은 4 슬롯이었고 당시 margin 은 8 (1008/1063) 이었다 — **소실량이 margin 과 같은 자릿수면 통과 여부가 집계 경로에 좌우된다.** 그 상태에서는 빌드가 붉어지거나 초록이 되는 이유를 diff 로 설명할 수 없다. margin 이 회복된 지금도 명제는 유효하다: 단조성이 깨지는 순간 게이트 판정은 다시 집계 경로의 함수가 된다.
2. **per-file 수치가 잘못된 파일을 지목한다.** "어느 파일에 테스트를 더 넣을 것인가" 판단의 유일한 근거가 파일별 표다. 실행된 분기가 uncovered 로 보고되면 이미 덮인 코드에 테스트를 쓰고, 실제 빈 곳은 방치된다. 투입이 조용히 낭비된다.

두 손상 모두 어떤 자동 채널도 신고하지 않는다 — 커버리지 수치는 게이트의 **출력**이지 검증 대상이 아니기 때문이다.

의도적으로 하지 않는 것: (i) 반복 실행 간 **합계** 동일성 — `specs/30.spec/blue/foundation/coverage-determinism.md` 영역, (ii) 반복 실행 간 **exit code** 단일성 — `specs/30.spec/blue/foundation/coverage-gate-exit-code-determinism-margin-axis.md` 영역, (iii) threshold 절대값(94) 의 타당성 — 별 axis, (iv) 소실의 근본 원인 규명 및 수정 수단(v8 provider 설정 / 격리 모드 / 업스트림 이슈) 선정 — planner·developer 영역. 본 spec 은 **결과 효능(단조성)** 만 박제한다.

## 공개 인터페이스

없음. 측정 대상은 `vitest --coverage` 의 `coverage-final.json` (json reporter) 산출물이다.

## 동작

1. **(G-A) per-file 분기 covered 슬롯 단조성** — 부분집합 실행의 covered 슬롯은 전수 실행의 covered 슬롯에 포함된다.
   - 절차: (a) 전수 실행 `npx vitest run --coverage --coverage.reporter=json` → `coverage/coverage-final.json` 보존, (b) 단일 테스트 파일 실행 `npx vitest run <test-file> --coverage --coverage.reporter=json` → 별도 보존, (c) 파일별 `b` 맵에서 `count > 0` 인 `(branchId, slotIndex)` 집합을 만들어 `solo ⊆ full` 판정.
   - 판정: 포함 위반 슬롯이 1개라도 있으면 rc≠0 + 위반 파일 경로를 stdout 1행 이상 출력.
   - **구 측정 계기(v8) 실측 (HEAD `7912860` 이전, darwin/arm64, Node v24.19.0, vitest 4.1.4): rc=1 — 위반 4 슬롯, 전량 `src/Toaster/Toaster.tsx` (`0.1,2.1,3.1,4.0`).** 대응 소스 지점 — `0` = `Toaster.tsx:50` `if (timerRef.current)`, `2` = `:55` `if ((duration as number) > 0)`, `3` = `:58` `else if (2 === show)`, `4` = `:60` `if (divRef.current)`. 전수 3 표본 전부 rc=1 (1008/1063) 로 테스트 집합 구성에 불변이었다.
   - **현 HEAD(`a48339d`) 실측: 충족 — rc=0, 소실 0 슬롯.** inspector 가 tick 217 에서 planner 실측을 받아쓰지 않고 절차 (a)(b)(c) 를 직접 재실행했다 (전수 `70 files / 637 tests`, 단독 `src/Toaster/Toaster.test.tsx` `1 file / 10 tests`). 전수 분기 **1080/1131 = 95.49%**.
     구 위반 4 슬롯의 회복을 카운트 벡터로 대조한다 (v8 → istanbul 이관 = TSK-20260824-06 / `b0ea033`):
     | branch.slot | solo | full (구 v8) | full (현 istanbul) |
     |---|---|---|---|
     | 0.1 | 14 | **0** | **415** |
     | 2.1 | 5 | **0** | **87** |
     | 3.1 | 2 | **0** | **208** |
     | 4.0 | 4 | **0** | **6** |
     전수 실행은 단독 실행의 테스트를 포함하므로 covered 집합은 축소될 수 없다 — 네 슬롯 전부 그 관계를 회복했다.
   - **공허 통과 배제**: 이 판정은 단독 실행의 covered 집합이 비면 자동으로 rc=0 이 된다. 비공허를 별도 확인했다 — 단독 실행 covered 슬롯 **15개** (`Toaster.tsx`). 역주입으로 검출력도 확인했다: 전수 산출물의 `0.1` 슬롯 count 를 0 으로 되돌리면 rc=1 + 해당 파일 경로·슬롯(`0.1`) 출력.
2. **(G-B) 판정 채널의 관측 가능성** — 위반 시 rc≠0 이고 위반 파일 경로가 stdout 에 나온다.
   - 근거: 위 G-A 실측 출력이 파일 경로 + 소실 슬롯 목록을 1행으로 낸다. 침묵 실패(rc=0 인데 위반 존재)는 허용되지 않는다.
3. **(G-C) 판정 채널의 저장소 등재** — 판정이 `package.json` `scripts.check:*` 또는 vitest 수집 경로에 실재한다.
   - 명령: `grep -nE '"check:coverage-(attribution|monotonicity)' package.json` 또는 `ls src/__tests__/coverage-*attribution*`.
   - **현 HEAD(`a48339d`) 실측: 0 hit — 채널 여전히 부재.** 부착 task 는 발행됐다 — `specs/40.task/TSK-20260824-10-coverage-attribution-channel.md` (`supersedes: TSK-20260824-02-b`). 본 spec 의 유일한 미충족 Must 다.

## 의존성

- 내부 측정 대상: `vite.config.js` (`test.coverage` 블록), `package.json:21` (`scripts.test`), `coverage/coverage-final.json` (json reporter 산출물), `src/Toaster/Toaster.tsx` + `src/Toaster/Toaster.test.tsx` (현 최소 재현 사례).
- 외부: 커버리지 provider (현 HEAD `istanbul` — `vite.config.js:81`, TSK-20260824-06 / `b0ea033` 으로 `v8` 에서 이관), Node `v24`. **provider 는 현 HEAD 의 측정 컨텍스트 스냅샷이지 계약 조건이 아니다** — 단조성은 provider 중립 명제이고, provider 교체로 G-A 를 rc=0 으로 만드는 것은 §역할 (iv) 가 위임한 수단 선택에 속한다. 본 spec 은 어떤 provider 도 고정하지 않는다.
- 역의존 (사용처):
  - `specs/30.spec/blue/foundation/coverage-determinism.md` — 합계 결정성 axis. 본 spec 과 직교하며, 합계 결정성은 파일별 정확성의 충분조건이 아니다.
  - `specs/30.spec/blue/foundation/coverage-gate-exit-code-determinism-margin-axis.md` — exit code 단일성 axis. 직교.
  - `.husky/pre-push:3` + `.github/workflows/ci.yml` Test step — `npm test` 발화 지점. 본 계약 위반은 이 경로의 판정 신뢰도를 직접 훼손한다.

## 회귀 중점

1. (R-1) 슬롯 소실 재발 — 구 v8 체제에서 `src/Toaster/Toaster.tsx` 4 슬롯이 소실됐다 (현 HEAD 에서는 해소, G-A rc=0). 측정 계기 교체·업그레이드가 이 부류를 되돌릴 수 있으므로 R-1 은 유효한 회귀 축으로 남는다.
2. (R-2) 소실 사례가 다른 파일로 번짐 — G-A 가 파일 경로를 출력하므로 확산 범위가 즉시 보인다.
3. (R-3) 수정 후 재발 — 채널이 등재되면 `npm test` 경로에서 재차단된다.
4. (R-4) 분모(1063) 변동으로 margin 이 소실량 이하로 줄어듦 — 게이트 통과가 집계 경로에 완전히 종속된다. §역할 손상 1 의 악화 경로.

## 발화 채널

**현 HEAD 에 자동 발화 채널이 없다** (G-C 실측 0 hit). RULE-07 §promote 조건 4 에 따라 promote 차단 사유가 아니라 **"채널 부착 task 발행"을 선행 조건**으로 한다 — 그 task 는 발행됐다: `specs/40.task/TSK-20260824-10-coverage-attribution-channel.md` (`check:coverage-attribution` + CI step, 주입 4 방향 DoD).

위 (b) 갈래 — 현행 4 슬롯 위반의 해소 — 는 TSK-20260824-06 (`b0ea033`, provider `v8` → `istanbul`) 으로 닫혔다. 남은 것은 (a) 채널 부착뿐이다. 판정 로직의 참조 구현은 inspector tick 에서 두 차례 실행·검증됐다 — 전수/단독 `coverage-final.json` 두 개를 입력받아 파일별 covered 슬롯 집합의 포함 관계를 검사하고, 비공허(단독 covered > 0)를 단언한 뒤, 위반 시 rc=1 + 경로·슬롯 출력. 구현 위치·형태(스크립트 vs vitest 픽스처)는 위임한다.

**채널이 붙기 전까지 이 계약은 사람이 돌릴 때만 발화한다** — 단조성이 다시 깨져도 `npm test` 는 초록을 유지한다. 그것이 G-C 가 Must 인 이유다.

주의: 판정은 vitest 를 2회 이상 구동하므로 `npm test` 본체에 인라인으로 넣으면 CI 시간이 배증한다. 별도 `check:*` 로 분리하는 편을 권한다 (수단 판단은 planner).

## 테스트 현황

- [x] G-A 판정 절차 실행 가능 — inspector 실측. 구 v8 체제 rc=1 (4 슬롯 검출) → 현 HEAD `a48339d` rc=0. 두 방향 모두 절차가 동작함을 보인다.
- [x] G-B 관측 가능성 — 위반 시 파일 경로 + 소실 슬롯 stdout 출력 확인 (구 v8 실측 + 현 HEAD 역주입 재현).
- [x] G-A 통과 — 소실 0 슬롯 (전수 1080/1131). provider 이관 TSK-20260824-06 / `b0ea033` 로 해소, inspector 독립 재현 (tick 217).
- [ ] G-C 채널 등재 — **부재 (본 spec 의 유일한 미충족 Must)**. 부착 task 발행됨: `TSK-20260824-10` (`40.task/`).

## 수용 기준

> 전 항목 HEAD=`a48339d` 에서 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). **1/2 rc=0** — G-A 는 inspector 가 현 HEAD 에서 절차를 직접 재실행해 충족을 확인했고, G-C 는 미충족이다. 구 G-B 는 '가정 주입 요구' 부류라 §참고 §미측정·비판정 항목으로 강등했다 (이관처 표기 필수 — 아래).

- [x] (Must) G-A: 전수 실행과 단일 테스트 파일 실행의 `coverage-final.json` 을 비교해 `solo ⊆ full` 판정 시 rc=0 (위반 슬롯 0). **HEAD=`a48339d` 실측 rc=0 / 소실 0 슬롯** (전수 70 files·637 tests, 단독 `src/Toaster/Toaster.test.tsx` 10 tests, 분기 1080/1131 = 95.49%). 구 v8 체제 실측은 rc=1 / 4 슬롯이었다. 판정의 공허 통과를 배제하기 위해 단독 covered 슬롯 수 **15 > 0** 을 함께 단언한다.
- [ ] (Must) G-C: `grep -nE '"check:coverage-(attribution|monotonicity)' package.json` 또는 `ls src/__tests__/coverage-*attribution*` 가 1 hit 이상. **HEAD=`a48339d` 실측 0 hit → rc=1.** 부착 task `TSK-20260824-10` 발행됨 (`40.task/`, `supersedes: TSK-20260824-02-b`).

## 참고

- 최소 재현 사례: `src/Toaster/Toaster.tsx` — 저장소 전체 분기 소실이 이 파일 1개에 100% 귀속된다.
- 직교 spec: `specs/30.spec/blue/foundation/coverage-determinism.md`, `specs/30.spec/blue/foundation/coverage-gate-exit-code-determinism-margin-axis.md`.

### 미측정·비판정 항목

- **(가정 주입 요구 — 이관 완료) 구 (Must) G-B 판정 채널의 관측 가능성.** "G-A **위반 상태에서** 판정 실행 시 rc≠0 + stdout 에 위반 파일 경로 1행 이상" 은 **위반을 만들어야 판정된다** — 현 HEAD 는 G-A rc=0 이므로 이 문장은 정상 트리에서 참·거짓을 낼 수 없다 (RULE-07 §체크박스 부적격 §가정 주입 요구). 체크박스에서 내리되 **검출 방향은 보존해 이관한다**.
  - **이관처: `specs/40.task/TSK-20260824-10-coverage-attribution-channel.md` §검증/DoD 의 게이트 실효 검증 4 방향** — (Dir-1) 단일 파일 슬롯 소실 → rc≠0 + 그 파일 경로 1 hit, (Dir-2) 2개 이상 파일 확산 → **두 경로 모두** 출력, (Dir-3) 공허 샤드 → rc≠0, (Dir-4) 열거 누락 → rc≠0. `RULE-04` notes `injection: 4/4 detect` 가 그 task 의 필수 토큰이다. 이관처가 실재하므로 RULE-07 §처리의 "이관처 없는 강등 금지" 를 충족한다.
  - inspector 는 tick 217 에서 이 방향 중 (Dir-1) 을 참조 구현으로 재현했다 — 전수 산출물의 `Toaster.tsx` `0.1` 슬롯 count 를 0 으로 되돌리자 판정이 rc=1 + `/…/src/Toaster/Toaster.tsx [('0', 1)]` 를 출력했다. 저장소 채널로 등재된 것은 아니므로 G-C 는 여전히 미충족이다.
- **반복 실행 간 per-file 수치 동일성.** 원 req 는 전수 실행 2회에서 1008/1063 ↔ 1011/1063 (`Toaster.tsx` 13/18 ↔ 16/18) 불일치를 보고했다. 본 tick 의 재측정 2회는 **둘 다 1008/1063, `Toaster.tsx` 13/18 로 동일**했고 파일별 covered 슬롯 집합 차이도 0 파일이었다. 즉 실행 간 변동은 간헐적이며 2 표본으로는 재현되지 않았다. RULE-07 §체크박스 부적격 부류가 "N 회 반복 동일 출력" 을 미측정 NFR 로 분류하므로 체크박스로 두지 않는다. 단조성(G-A)은 2 표본 모두에서 동일하게 위반됐으므로 그쪽이 안정된 판정 축이다.
  - **표본 추가 (2026-08-24, HEAD `7912860`)**: 전수 3 표본 전부 1008/1063 · `Toaster.tsx` 13/18 이고 파일별 covered 슬롯 집합 차이는 0 파일이었다. 강등 사유(표본 부족)는 유지된다.
  - **CI 실패 run 은 이 축의 표본이 아니다.** 동일 커밋 red -> green 사례(`7912860`)의 실패 run 은 커버리지 합계가 `94.82%` (= 1008/1063) 로 로컬과 일치했고, exit 1 의 원인은 `Errors 2 errors` — `EnvironmentTeardownError: [vitest-worker]: Closing rpc while "onUserConsoleLog" was pending` (`src/Monitor/Monitor.test.jsx` 귀속) 이다. 수치 변동이 아니라 **exit code 단일성** 사건이며, §역할 (ii) 가 본 spec 에서 명시적으로 배제한 `coverage-gate-exit-code-determinism-margin-axis` 영역이다.
- **CI(linux/x64) ↔ 로컬(darwin/arm64) per-file 격차.** 원 req 가 `src/Comment/CommentForm.tsx` 에서 CI 11/14 ↔ 로컬 14/14 격차를 보고했으나 Docker 부재로 재현 채널이 없다. 플랫폼 교차 측정 수단이 마련되기 전에는 판정 대상이 아니다.
- **소실의 근본 원인.** v8 provider 의 슬롯 인덱스 귀속 문제인지 워커 간 병합 문제인지 본 spec 은 판정하지 않는다. 원인 규명은 수정 task 의 조사 범위다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-24 | TSK-20260824-06 / `b0ea033` (inspector Phase 1 reconcile @ tick 217) | **G-A `[ ]` → `[x]` (소실 4 슬롯 → 0). G-B 는 '가정 주입 요구' 부류로 §참고 강등 + TSK-20260824-10 DoD 로 이관. G-C 는 `[ ]` 유지 — 채널 여전히 부재.** provider `v8` → `istanbul` 이관이 단조성 위반을 해소했다. planner 실측을 받아쓰지 않고 절차 (a)(b)(c) 를 직접 재실행했다 — 전수 70 files/637 tests, 단독 `Toaster.test.tsx` 10 tests, 소실 0 슬롯, 분기 1080/1131 = 95.49%. 구 위반 4 슬롯의 full count 가 전부 0 → 양수로 회복됐다 (`0.1` 0→415, `2.1` 0→87, `3.1` 0→208, `4.0` 0→6). **이 판정은 단독 covered 집합이 비면 자동으로 rc=0 이 되는 부류라 비공허(15 슬롯)를 함께 단언하고, 역주입(`0.1` 을 0 으로 되돌림)으로 rc=1 + 경로·슬롯 출력을 확인했다.** 아울러 §역할 손상 1 의 수치(분모 1063·covered 1008·margin 8)와 §위치의 provider 표기(`v8`), §회귀 중점 R-1 의 "현행 위반" 서술이 전부 현 HEAD 에서 거짓이 됐으므로 구 체제 실측으로 표기를 내리고 현 HEAD 값(분모 1131·covered 1080·margin 16)을 병기했다. | §위치 + §역할 + §동작 1·3 + §의존성 + §회귀 중점 + §발화 채널 + §테스트 현황 + §수용 기준 + §참고 |
| 2026-08-24 | inspector tick / HEAD 7912860 | Phase 1 재실행: G-A rc=1 (4 슬롯, 3 표본 불변) · G-C 0 hit — 마커 플립 없음. 반복 변동 축은 표본 3건 추가 후에도 강등 유지 (CI 실패 run 은 exit-code 축 사건으로 판정, 본 축 표본 아님). provider 고정이 계약 조건이 아님을 §의존성에 명시. | 동작, 의존성, 참고 |
| 2026-08-24 | inspector tick / REQ-20260824 | 결함 신고를 단조성 불변식으로 재정식화해 최초 등록 (RULE-07 §처리 결함 신고 재정식화). G-A 위반 4 슬롯 독립 재현. 반복 실행 변동은 2 표본 미재현으로 §미측정 항목 강등. | all |
