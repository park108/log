# post-unmount 발화 감사의 판정 대상 집합은 전수다 — Log · Monitor 의 비동기 완료 경로가 판정을 받는다

> **위치**: `src/__tests__/post-unmount-emission-audit.test.ts` 의 `EMISSION_OBSERVATION_DEBT` (`:765-769`) · 죽은 부채 항목 차단 (`:1198-1202`) · 부채 차감 소비 지점 (`:1206`). 제품 귀속: `src/Log/LogItem.jsx` 의 `deleteMutation` 콜백 · `src/Log/LogItemInfo.jsx` 의 `handleDelete` abort 콜백 · `src/Monitor/Monitor.jsx` 의 admin 게이트 effect.
> **관련 요구사항**: REQ-20260828-040
> **최종 업데이트**: 2026-08-28 (by inspector — tick 239 최초 등록, 골격)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`8189a07`).

## 역할

post-unmount 발화 감사가 판정하는 **대상 집합은 전수여야 한다**. 발화하는 프로덕션 파일의 형제 테스트가 관측기를 갖지 않아 축 1~4 가 단락되는 상태, 그리고 축소 대조의 모집단이 관측기 보유 파일을 담지 못하는 상태는 둘 다 **어떤 판정도 받지 않으면서 초록**이다.

`RULE-07 §주제 우선순위` 귀속은 **1순위 (사용자 관측 가능 동작 — 상태 전이 · effect cleanup)** 이다. 게이트 모집단 문제는 그 동작이 **왜 지금 관측되지 않는지**를 설명하는 종속 사실이며, 본 계약은 2순위(토큰·설정 정합) 쿼터에 계수하지 않는다.

제품 측 위험은 실재한다. `src/Log/LogItem.jsx` 의 삭제 mutation `onError` 는 **발화 3건(`log` ×3) + 상태 setter 3건(`setToasterMessage` · `setToasterType` · `setIsShowToaster`)** 을 한 콜백에서 수행하며, mutation 이 언마운트 이후 결착하면 그 전부가 떠난 화면 몫으로 실행된다. 이 창의 존재는 **파일 자신이 이미 주석으로 박제**하고 있다 (`:20-23` — 구독이 "이 컴포넌트의 passive effect 가 커밋된 뒤에 생긴다"). `src/Log/LogItemInfo.jsx` 의 abort 콜백은 정의상 사용자가 화면을 떠나는 흐름과 겹치고, `src/Monitor/Monitor.jsx` 는 하나의 effect 안에 `log` → `navigate` → `setFullscreen(false)` cleanup 을 함께 묶는다.

**하지 않는 것**: 감사 축 1~4 의 **판정 로직(술어)** 변경. 본 계약은 **대상 집합**만 다룬다. `src/Log` · `src/Monitor` 의 프로덕션 동작 변경도 밖이다 — 관측을 붙이는 것이 먼저이며, 관측 없이 고치면 고쳤다는 증거가 없다. 실제 post-unmount 발화가 **검출되면** 그 시정은 별도 요구로 분리한다. `src/App.jsx` 에 발화를 추가해 모집단에 넣는 해법도 금지한다 — 모집단을 맞추려 제품 코드를 바꾸지 않는다.

## 공개 인터페이스

- 부채 집합: `EMISSION_OBSERVATION_DEBT` — **상한**이며 고정점이 아니다 (관측기가 붙어 부채가 갚아져도 실패하지 않는다).
- 축소 대조 출력 토큰: `spy-bearing` · `short-circuit` · `judged` · `enumerated` 계수.
- 죽은 부채 항목 차단: `deadDebt` 단언.

## 동작

### FR-01 — 세 형제 테스트가 판정 대상이 된다 (Must)
`src/Log/LogItem.test.jsx` · `src/Log/LogItemInfo.test.jsx` · `src/Monitor/Monitor.test.jsx` 가 발화 관측기를 보유해 post-unmount 발화 감사 축 1~4 의 판정 대상이 된다.

> 판정은 AC-3 이 수행한다 — 세 파일이 감사의 **단락 목록에 나타나지 않음**이 곧 축 1~4 의 판정 대상이 됐다는 뜻이다. 관측기 보유를 이름 열거로 별도 계수하지 않는다.

### FR-02 — 부채 집합이 공집합이 된다 (Must)
`EMISSION_OBSERVATION_DEBT` 는 공집합이 된다. 부채 목록은 상한이므로 **관측기를 붙이는 방향의 변경은 게이트를 깨지 않는다**.

### FR-03 — 축소 대조 모집단이 전수다 (Must)
축소 대조는 **관측기 보유 파일 전수**를 모집단으로 삼거나, **모집단 밖 보유 파일 수 == 0** 을 게이트가 스스로 단언한다. 둘 중 어느 쪽이든 `src/App.test.jsx` 의 관측기 이탈이 검출돼야 한다.

> 현행 병리: `src/App.test.jsx` 는 형제 `src/App.jsx` 에 발화 호출이 0이라 "발화 파일의 형제" 정의에 걸리지 않아 모집단 밖이다. 그래서 그 파일의 관측기가 목록 밖 이름으로 바뀌어도 `spy-bearing` 계수가 1 줄 뿐 **어떤 단언도 붉어지지 않는다**.

### FR-04 — 지우기만 하는 우회 경로는 막힌다 (Must)
부채 해소는 **관측기 부착**으로 달성한다. 부채 항목을 목록에서 지우기만 해 통과시키는 경로는 금지하며, 그 경우 축 1~4 가 붉어지는 것으로 즉시 드러나야 한다.

### FR-05 — 관측 부착이 red 를 초록으로 덮지 않는다 (Must)
세 파일에 관측기를 붙인 결과 **실제 post-unmount 발화가 검출되면** 그 사실은 통과 처리하지 않고 발화한다. 본 계약은 "검출되면 발화한다" 까지만 요구하며 **"발화가 0" 을 요구하지 않는다**.

### FR-06 — 죽은 부채 항목 검사는 유지된다 (Should)
`deadDebt` 단언(`:1198-1202`)은 부채가 공집합이 되어도 남아 장래 재추가를 감시한다.

### 발화 채널 (RULE-07 §promote 조건 4)
vitest 수집 경로 `src/__tests__/post-unmount-emission-audit.test.ts` — **현 HEAD 실재**. 별도 채널 부착 불요.

## 의존성
- 내부: `src/__tests__/post-unmount-emission-audit.test.ts` · `src/Log/{LogItem,LogItemInfo}.{jsx,test.jsx}` · `src/Monitor/Monitor.{jsx,test.jsx}` · `src/App.test.jsx`.
- 외부: vitest · `@testing-library/react`.
- 인접 계약: `testing/emission-observer-identification-deny-by-default` (blue) · `testing/runtime-fetch-unmount-safety` (blue) · `testing/post-await-guard-individual-observability` (blue).

## 테스트 현황
- [x] 감사 게이트 자체는 실재하고 수집된다 (`src/__tests__/post-unmount-emission-audit.test.ts`).
- [ ] 세 형제 테스트의 발화 관측기 — HEAD 부재 (부채로 단락 중).
- [ ] 모집단 밖 관측기 보유 파일 수의 자기 단언 — HEAD 부재.

## 수용 기준

> 전 항목 **명령 1회로 rc 판정 가능** (`RULE-07 §수용 기준 문장 규약`). 펜스 항목은 본문을 추출해 `bash -c "$(추출)"` 로 실행한다 — 명령이 정규식·따옴표를 중첩해 홑백틱 인라인 스팬에 담기지 않기 때문이다.
>
> **AC-2 는 결번이다.** req 원문의 AC-2("세 형제 테스트가 관측기 3/3 보유")는 AC-3 과 **동일한 판정을 다른 문면으로 요구**하므로 중복 게이트(`RULE-07 §반려 시그널`)로 보고 통합했다 — FR-01 의 판정은 AC-3 이 수행한다. 관측기 보유 여부를 이름 열거로 따로 재지 않는 것은 인접 blue `emission-observer-identification-deny-by-default` 가 그 술어를 소유하기 때문이기도 하다.

- [ ] (Must, FR-02·AC-1) 부채 집합의 원소 수가 **0** 이다 — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  node -e 'const s=require("fs").readFileSync("src/__tests__/post-unmount-emission-audit.test.ts","utf8");const m=s.match(/EMISSION_OBSERVATION_DEBT = new Set\(\[([^\]]*)\]\)/);if(!m)process.exit(2);process.exit(m[1].replace(/\s|\/\/.*/g,"")===""?0:1)'
  ```
  → **실측 2026-08-28 (HEAD `8189a07`): rc=1 → 미충족** (부채 3원소). 모집단 추출 실패는 `rc=2` 로 통과와 구분한다 — 추출기가 낡아 빈 문자열을 얻는 상태를 충족으로 읽지 않는다.
- [ ] (Must, FR-01·FR-05·AC-3) 감사 테스트 단독 실행에서 `rc=0` 이고 세 파일이 단락 목록에 나타나지 않는다 — 판정: `npx vitest run src/__tests__/post-unmount-emission-audit.test.ts` (본 tick 미실행 — 아래 §미측정 참조).
- [ ] (Must, FR-03·AC-4) 게이트 출력에 **모집단 밖 관측기 보유 파일 수 == 0** 이 명시된다.
- [ ] (Should, FR-06·AC-6) `deadDebt` 단언이 잔존한다 — 부채가 공집합이 되어도 검사 자체는 남는다.
- [ ] (Must, NFR-02·AC-7) 관측기 부착 전후로 `Log` · `Monitor` 스위트의 통과/실패 집합이 동일하다 (관측은 부작용이 없어야 한다).

## 참고

### 비-중복 근거 (인접 spec · 인접 req)
`REQ-20260828-002` (`count-based-judgement-scope-reachability-monotonicity`) 는 **같은 감사 파일**을 다루지만 축이 다르다. 본 tick 에서 **병합하지 않고 분리 보존**으로 판정했다 — 근거는 아래 표이며, 앵커 라인이 겹치지 않고 제품 귀속이 분리되기 때문이다.

| | REQ-20260828-002 | 본 계약 (040) |
|---|---|---|
| 축 | 계수형 판정의 스코프·도달성·단조성 | 판정 **대상 집합의 전수성** |
| 앵커 | `:653` · `:917` · `:919` | `:765-769` · `:1198-1202` · `:1206` |
| 병리 | 세는 값이 겨냥한 사건을 재지 못함 | 대상이 집합에서 **빠져** 아예 안 재짐 |
| 제품 귀속 | `src/File/FileItem` race fixture | `src/Log` · `src/Monitor` 비동기 완료 경로 |

다만 둘 다 착지하면 **동일 파일을 수정**하므로 착지 순서 충돌 가능성이 있다 — planner 는 두 task 를 동시 in-flight 로 두지 않는 것이 안전하다.

blue 인접 계약과의 분리:
- `testing/emission-observer-identification-deny-by-default` — **무엇이 관측기인가**(술어 · 대상 집합 하한). 본 계약은 그 술어를 소비할 뿐 재정의하지 않으며, 다루는 것은 **어떤 파일이 모집단에 드는가**다.
- `testing/runtime-fetch-unmount-safety` — 프로덕션 async continuation 의 **발화 0 보장**. 본 계약은 그 보장의 **관측 가능성**을 다루며 발화 0 자체를 요구하지 않는다 (FR-05).

### 미측정·비판정 항목
- **실제 post-unmount 발화의 존재 여부** — 관측기를 붙이기 전에는 알 수 없다. 검출되면 시정은 별도 요구로 분리한다.
- **`EMISSION_OBSERVATION_DEBT` 재증가 금지의 영구 보장** — 미래 사건 대기 부류 (`RULE-07 §체크박스 부적격`). 목록이 상한인 구조는 유지하고 증가 시점의 판정은 그때의 리뷰에 맡긴다.
- **AC-3 의 실행 시간** — 본 tick 미측정 (단일 명령 60초 상한 제약으로 감사 테스트를 실행하지 않았다). 상한을 넘으면 그 사실 자체가 별도 followup 감이다.
- **AC-5(모집단 밖 관측기 이탈 주입) · AC-6(부채 무단 제거 주입)** — **가정 주입 요구** 부류이므로 체크박스로 두지 않고 아래 §게이트 실효 검증 이관 으로 내린다. 검출 방향은 보존된다.

### 배경 실측 (HEAD `8189a07`, tick 239)
- `EMISSION_OBSERVATION_DEBT` 3원소 — `Log/LogItem.test.jsx` · `Log/LogItemInfo.test.jsx` · `Monitor/Monitor.test.jsx` (`:765-769` 확인).
- 부채는 상한으로 운용된다 — `:1206` 이 `shortCircuitedRels` 에서 부채를 **차감**하므로 부채에 든 파일은 단락돼도 붉어지지 않는다. `deadDebt`(`:1198-1202`)는 목록이 **낡지 않음**만 보장할 뿐 목록이 **줄어들 것**은 보장하지 않는다.
- 선행 보류 해소: `20260827-2130` 이 유보 조건으로 지목한 `TSK-20260827-10-b` (술어 deny 전환) 는 착지했다 (`specs/60.done/2026/08/27/task/emission-observer-predicate-deny-by-default/`). 재평가 시점이 도래했고 본 계약이 그 재평가다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)
검출 방향은 **2종**이며 주입 왕복은 구현 task 의 DoD 에 귀속한다.

| 방향 | 위반 주입 | 기대 |
|---|---|---|
| Dir-1 (FR-03) | `src/App.test.jsx` 의 관측기를 목록 밖 이름으로 변경 | `rc≠0` + 파일명 지목. **현 HEAD 에서는 `rc=0` (미검출)** — 이것이 고쳐야 할 상태다. |
| Dir-2 (FR-04) | 부채 항목을 목록에서 제거하되 관측기 미부착 | `rc≠0` |

이관처 task DoD 는 `injection: 2/2 detect` 를 요구한다. **이관처 task 가 발행되지 않으면 그 사실을 `10.followups/` 에 남긴다** — 이관처 없는 강등은 금지다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-28 | inspector tick 239 | REQ-20260828-040 흡수 — 최초 등록 (골격). REQ-20260828-002 와 분리 보존 판정 | all |
