# 부재·숨김 단언은 관측 대상이 도달한 뒤에만 판정한다 — 부재는 숨김의 증거가 아니다

> **위치**: `src/test-utils/toaster.ts` 의 `waitForToasterHidden` (`:41-54`) · `getToasterElement` (`:31-35`) · `waitForToasterVisible` (`:59-72`, 반대 극성 대비군). 계약 박제처는 `src/test-utils/toaster.test.ts` (`:55-78`). 사용처: `src/File/File.test.tsx:125` · `src/Comment/Comment.test.tsx:627`.
> **관련 요구사항**: REQ-20260828-045
> **최종 업데이트**: 2026-08-28 (by inspector — tick 240 최초 등록, 골격)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`ec82e08`).

## 역할

**부재·숨김을 주장하는 비동기 단언은 그 표면이 관측 가능해진 뒤에 판정한다. 관측 불가는 충족이 아니라 무판정이다.**

`waitForToasterHidden` 은 대상 노드가 DOM 에 없으면 즉시 resolve 한다 (`:48` `if (!el) return;`). 그래서 "실패 토스터가 뜨지 않았다" 를 검증하려는 대기가, 대상이 **아직 마운트되지 않아서** 통과한다 — 관측된 것은 "숨김 도달" 이 아니라 "관측 시점이 일렀다" 이다.

이 spec 이 방어하는 것은 **단언의 강도가 아니라 판정 시점의 도달성**이다.

`RULE-07 §주제 우선순위` 귀속은 **1순위 (사용자 관측 가능 동작 — 에러 배너 표시)** 이며, 방어 대상은 다음 사건이다:

> **Comment/File 의 실패 배너가 사용자에게 뜨는 회귀가, 그것을 금지한 테스트가 초록인 채로 통과하는 사건.** 이것은 가설이 아니라 주입으로 관측됐다 — `TSK-20260827-11-b` Dir-4 주입(성공 갈래에 상시 오류 배너)에서 `waitForToasterHidden('error','bottom')` 는 **통과**했고, 검출은 전적으로 그 다음 줄 `expect(getToasterElement('error','bottom')).toBeNull()` 이 우연히 늦게 평가된 덕이었다.

**게이트는 붉어졌지만 붉어진 이유가 틀렸다.** 도달 대기 역할을 맡은 호출이 위반을 한 건도 잡지 못했고, 대기가 먼저 통과하면 뒤따르는 동기 단언이 평가되는 시점 역시 이르다. 지금 초록인 것은 계약이 아니라 타이밍이다.

경합은 구조적으로 열려 있다 — `src/Comment/Comment.tsx:9` 가 Toaster 를 `lazy()` + `Suspense` 로 마운트하므로 chunk 해석이 최소 1 tick 늦는다 (대비: `src/File/File.tsx:6` 은 정적 import). 두 사용처가 **같은 헬퍼에 대해 서로 다른 마운트 지연 특성**을 갖는다는 것이 이 계약이 호출처 규율로 닫히지 않는 이유다.

**하지 않는 것**: Toaster 컴포넌트의 표시 로직 변경, `lazy()`/`Suspense` 채택 여부의 재검토, `waitForToasterVisible` 의 극성 변경(부재를 재시도로 읽는 현 시맨틱은 보존), 개별 테스트 케이스의 광범위한 재작성. 본 계약은 **대기 API 의 도달 전제**만 다룬다.

## 공개 인터페이스

`src/test-utils/toaster.ts` 는 **극성이 다른 세 대기 경로**를 서로 구별되는 이름으로 노출한다.

| 경로 | 의미 | 미도달 시 |
|---|---|---|
| `waitForToasterVisible` | 표시 도달 | reject (현행 유지) |
| `waitForToasterHidden` | **도달 후 소멸** | reject — 무판정 (본 계약이 바꾸는 지점) |
| `waitForToasterAbsent` | **끝내 나타나지 않음** | 관측 창을 소진한 뒤 resolve (신설) |

- 이름은 계약의 일부다. 호출처는 주장하려는 명제로 경로를 고른다 — "떴다가 사라졌다" 와 "한 번도 안 떴다" 는 다른 명제이며, 한 함수가 둘 다 참으로 만들면 어느 쪽도 판정되지 않는다.
- 대기 상한은 세 경로 공통으로 `ASYNC_ASSERTION_TIMEOUT_MS` (`src/test-utils/timing.ts:5`) 예산 안이다.

## 동작

### FR-01 — 숨김 도달 대기는 관측 대상 도달을 전제한다 (Must)
`waitForToasterHidden` 은 대상이 **한 번도 관측되지 않은 상태**에서 충족으로 끝나지 않는다. 도달을 먼저 관측하고, 그 뒤 숨김 전이를 판정한다.

### FR-02 — "부재" 와 "숨김" 은 서로 다른 판정이다 (Must)
부재를 주장하려는 호출처는 **부재 전용 경로**를 쓴다. 그 경로 역시 **도달 후 소멸**과 **미도달**을 구별해 보고하며, 두 상태를 같은 등급으로 뭉개지 않는다.

### FR-03 — 관측 불가는 무판정이다 (Must)
대상이 관측 창 안에서 한 번도 마운트되지 않았다면 숨김 경로는 **침묵 통과하지 않는다**. 이것이 등급 분리의 본체다 — "숨김을 확인했다"(충족) 와 "확인할 것이 없었다"(무판정) 가 같은 결과를 내면, 마운트 지연이 곧 초록이 된다.

> 이 시맨틱은 실수가 아니라 **선언된 계약**이었다 — `src/test-utils/toaster.test.ts:61-63` 이 `it('엘리먼트가 없으면 resolve (숨김으로 해석)')` 으로 박제하고 있다. 따라서 수리는 코드가 아니라 **계약을 바꾸는 것**이며, 그 박제를 함께 갱신하지 않으면 자기 테스트가 옛 계약을 지켜 새 계약을 붉게 만든다.

### FR-04 — 도달 전제는 헬퍼 계약이 진다 (Must)
전제를 호출처 규율로 세우지 않는다. 호출처가 선행 `waitFor` 를 두지 않아도 경합이 열리지 않아야 한다.

> 현행은 호출처가 손으로 세우고 있다 — `src/Comment/Comment.test.tsx:620-624` 가 `waitFor` 로 type 무관 도달을 먼저 확인한 뒤 `:627` 에서 헬퍼를 부른다. 그 주석(`:620`)은 전제가 없으면 "실패 표면 발화를 부재 단언이 아니라 대기 실패로 잡게 된다" 고 **이미 자백**한다. 규율은 다음 호출 1건이면 깨진다.

### FR-05 — 사용처 모집단은 열거로 도출한다 (Must)
호출처 목록을 하드코딩하지 않는다. 모집단은 `grep -rl` 등 열거로 산출하고, **열거 공집합은 통과가 아니라 무판정**이다 (`RULE-06 §열거 고정 금지`).

### FR-06 — 시맨틱 변경은 양방향 주입으로 증명한다 (Must)
`RULE-06 §게이트 실효 검증`. 주입 왕복은 spec 체크박스가 아니라 구현 task 의 DoD 에 귀속한다 (§게이트 실효 검증 이관).

### 발화 채널 (RULE-07 §promote 조건 4)
vitest 수집 경로 `src/test-utils/toaster.test.ts` — **현 HEAD 실재**. 별도 채널 부착 불요.

## 의존성
- 내부: `src/test-utils/toaster.ts` · `src/test-utils/toaster.test.ts` · `src/test-utils/timing.ts` · `src/Comment/Comment.test.tsx` · `src/File/File.test.tsx`.
- 외부: vitest · `@testing-library/react` (`waitFor`).
- 인접 계약: `testing/multi-element-count-assertion-arrival-wait` (blue — 같은 계열, **반대 극성**) · `testing/post-await-guard-individual-observability` (blue).
- 역의존: Comment · File 의 실패 표면 부재 테스트.

## 테스트 현황
- [x] 헬퍼 자기 테스트가 실재하고 수집된다 (`src/test-utils/toaster.test.ts`).
- [ ] 미도달 상태의 숨김 판정이 무판정으로 끝남 — HEAD 부재 (현재는 resolve 로 박제돼 있다).
- [ ] 부재 전용 경로 — HEAD 부재.

## 수용 기준

> 전 항목 **현 HEAD 에서 명령 1회로 rc 판정 가능** (`RULE-07 §수용 기준 문장 규약`). 펜스 항목은 본문을 추출해 `bash -c "$(추출)"` 로 실행한다.

- [ ] (Must, FR-01·FR-03·AC-1) **미마운트 대상에 대한 숨김 판정이 `resolve` 로 박제된 케이스가 0** 이다 — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  awk '
  /^[\t ]*it\(/ { inb=1; mount=0; hres=0; blocks++ }
  inb && /mountToaster/ { mount=1 }
  inb && /waitForToasterHidden/ && /\.resolves/ { hres=1 }
  inb && /^[\t ]*\}\);[\t ]*$/ { if (hres) { hidden++; if (!mount) bad++ } inb=0 }
  END { printf "it-blocks=%d hidden-resolve-blocks=%d absent-resolve=%d\n", blocks, hidden, bad;
        if (blocks < 1 || hidden < 1) exit 2; exit (bad == 0) ? 0 : 1 }
  ' src/test-utils/toaster.test.ts
  ```
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `it-blocks=8 hidden-resolve-blocks=3 absent-resolve=1` / rc=1 — 위반 baseline** (`src/test-utils/toaster.test.ts:61-63`).
  > **제목 문자열이 아니라 블록 구조로 판정한다.** `it` 제목의 한국어 문면(`엘리먼트가 없으면 resolve`)으로 세면 제목만 바꿔도 통과한다. 위 술어는 "`waitForToasterHidden` 을 `.resolves` 로 단언하면서 같은 블록에 `mountToaster` 가 없는 블록" 을 세므로 **마운트 없이 숨김이 충족되는 케이스**라는 의미 자체를 잡는다. `blocks < 1 || hidden < 1` 은 `exit 2` 무판정으로 가른다 — 파서가 낡아 아무것도 못 세면 `absent-resolve=0` 이 나오고 그것은 충족이 아니라 무의미다.

- [ ] (Must, FR-02·AC-2) **부재 전용 경로가 숨김 경로와 구별되는 이름으로 export 된다** — 판정: `bash -c 'n=$(grep -cE "^export function waitForToasterAbsent\(" src/test-utils/toaster.ts); echo "n=$n"; [ "$n" -eq 1 ]'`
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `n=0` / rc=1 — 위반 baseline.**
  > 이름을 수용 기준에 박는 것은 하드코딩이 아니라 **§공개 인터페이스 가 선언한 계약을 그대로 재는 것**이다 (`RULE-06 §관측 표면` — 게이트는 선언된 표면을 측정한다). 이름이 바뀌어야 한다면 spec 의 §공개 인터페이스 표가 먼저 바뀐다.

- [ ] (Must, FR-02·FR-04·FR-05·AC-3) **부재를 주장하는 호출처가 숨김 경로를 쓰지 않는다** — 판정: (펜스 — `bash -c "$(추출)"` 로 실행)
  ```
  t=0; a=0
  for f in $(grep -rl "waitForToasterHidden" src | grep -v "^src/test-utils/toaster"); do
    for n in $(grep -n "await waitForToasterHidden" "$f" | cut -d: -f1); do
      t=$((t+1))
      sed -n "$((n+1)),$((n+3))p" "$f" | grep -qE "toBeNull\(\)" && a=$((a+1))
    done
  done
  echo "hidden-calls=$t absence-claiming=$a"
  [ "$t" -ge 1 ] || exit 2
  [ "$a" -eq 0 ]
  ```
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `hidden-calls=2 absence-claiming=1` / rc=1 — 위반 baseline.** 지목되는 1건은 `src/Comment/Comment.test.tsx:627` (직후 `:628` 이 `toBeNull()` 부재 단언) 이며, 나머지 1건 `src/File/File.test.tsx:125` 는 Loading 토스터가 **실제로 떴다가 사라지는** 진짜 숨김 케이스이므로 숨김 경로에 남는다.
  > 모집단은 `grep -rl` 열거로 도출하며 하드코딩하지 않는다 (FR-05). `t < 1` 은 `exit 2` 무판정 — 사용처가 0 이면 "위반 0" 은 아무것도 뜻하지 않는다. 이 항목은 **모집단이 위반과 함께 줄어드는 축**이 아니다: 분모(`hidden-calls`)와 분자(`absence-claiming`)를 **함께 출력**하므로, 호출처를 통째로 지워 통과시키면 `t` 가 함께 떨어져 관측된다.

- [ ] (Must, NFR-01·AC-4) **도달 관측 추가가 비동기 단언 예산 상한을 늘리지 않는다** — 판정: `bash -c 'n=$(grep -cE "^export const ASYNC_ASSERTION_TIMEOUT_MS: number = 5000;$" src/test-utils/timing.ts); echo "n=$n"; [ "$n" -eq 1 ]'`
  → **실측 2026-08-28 (HEAD `ec82e08`): 출력 `n=1` / rc=0 — 보존 대상.** 도달 관측과 숨김 관측이 각각 상한을 소비해 예산이 2배로 늘어나는 형태를 금지한다.
  > **낱말 주의 (tick 240 실측)**: `check:acceptance-criteria` 의 G-2 미래형 술어(`scripts/check-acceptance-criteria.sh:157`)는 `대기` 를 토큰으로 갖는다. 그 술어가 겨냥하는 것은 "차기 이벤트를 기다린다" 는 미래 사건 의존이지만, 이 도메인에서 `대기` 는 `waitFor*` 헬퍼를 가리키는 **명사**다. 두 용법이 같은 토큰을 공유해 이 계약의 수용 기준 2건이 최초 작성 시 오탐으로 걸렸다 (실측 rc=1 → 낱말 교체 후 rc=0). 판정 내용은 바뀌지 않았다.

- [ ] (Must, NFR-02·AC-5) **관련 표면 스위트가 초록** — 판정: `npx vitest run src/test-utils/toaster.test.ts src/Comment/Comment.test.tsx src/File/File.test.tsx` → **실측 2026-08-28 (HEAD `ec82e08`): rc=0 / `Test Files 3 passed (3)` · `Tests 40 passed (40)` / 2.42s — 보존 대상.** 이 초록은 계약 준수의 증거가 아니라 **비악화 기준선**이다 (§역할 — 지금 초록인 것은 계약이 아니라 타이밍이다).

## 참고

### 비-중복 근거 (인접 blue)
`testing/multi-element-count-assertion-arrival-wait` (blue, REQ-20260825-019) 와 **극성이 반대**다. 병합하지 않았다.

| | multi-element-count (blue) | 본 계약 (045) |
|---|---|---|
| 단언 | 개수 **증가** (`toHaveLength(N)`, N>1) | **부재·숨김** |
| 조기 통과의 원인 | 대상이 **이미 있어서** (`findAllBy*` 가 ≥1 에 resolve) | 대상이 **아직 없어서** (부재 = 즉시 resolve) |
| 판정 기준 | 세는 요소의 귀속 비동기 경계 수 | 대상 표면의 **도달 관측 여부** |
| 수리 방향 | 대기 술어를 개수 도달로 강화 | 대기 술어에 **도달 전제**를 추가하고 부재를 별도 경로로 분리 |

두 계약은 같은 계열의 서로 다른 끝이며, 한쪽의 술어로 다른 쪽을 잡을 수 없다 — 개수 도달 술어는 부재를 판정하지 않고, 도달 전제는 개수를 세지 않는다.

### 미측정·비판정 항목
- **`lazy()` 마운트 지연의 실제 tick 수** — 스케줄러·번들러 구현에 종속하며 측정 채널이 없다. 계약은 지연의 **크기**가 아니라 **존재**만 전제한다.
- **현 초록이 계약 준수인지 타이밍 우연인지의 소급 판정** — HEAD 에서 판정 불가. `TSK-20260827-11-b` Dir-4 주입이 이미 "타이밍" 쪽을 실측으로 보였으므로 소급 판정 대신 그 관측을 근거로 채택한다.
- **부재 관측 창의 적정 길이** — 미측정 NFR 부류. 상한은 `ASYNC_ASSERTION_TIMEOUT_MS` 예산 안이라는 것만 계약한다 (AC-4).
- **AC-6(상시 에러 배너 주입) · AC-7(도달 전제 제거 주입)** — **가정 주입 요구** 부류이므로 체크박스로 두지 않고 §게이트 실효 검증 이관 으로 내린다. 검출 방향은 보존된다.

### 배경 실측 (HEAD `ec82e08`, tick 240)
```
grep -cE "if \(!el\) return;" src/test-utils/toaster.ts        → 1   (:48 — 부재 즉시 통과 분기)
grep -nE "\.rejects" src/test-utils/toaster.test.ts            → 2   (:76 hidden-still-visible, :89 visible-timeout)
awk 블록 판정 (AC-1)                                            → it-blocks=8 hidden-resolve-blocks=3 absent-resolve=1
열거 판정 (AC-3)                                                → hidden-calls=2 absence-claiming=1
```
`waitForToasterVisible` (`:59-72`) 은 `el?.getAttribute` 로 부재를 **재시도**로 읽어 정반대 극성을 이미 갖고 있다. 즉 저장소 안에 올바른 극성의 선례가 있으며, `waitForToasterHidden` 만 부재를 충족으로 읽는다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)
본 계약은 헬퍼 시맨틱 **수정**을 유발한다. 검출 방향은 **2종**이며 주입 왕복은 구현 task 의 DoD 에 귀속한다.

| 방향 | 위반 주입 | 기대 |
|---|---|---|
| Dir-1 (FR-01·FR-03) | Comment 성공 갈래에 **상시 에러 배너** 주입 (`TSK-20260827-11-b` Dir-4 와 동일 갈래) | `rc≠0` 이고 **붉어지는 지점이 부재 단언** 이다 — 도달 대기 타임아웃이 아니다 |
| Dir-2 (FR-04) | 호출처의 선행 `waitFor` 도달 전제(`Comment.test.tsx:620-624`)를 제거 | `rc=0` 유지 — 전제가 헬퍼로 이동했으므로 호출처 규율 없이도 경합이 열리지 않는다 |

Dir-1 은 **실패 지점의 귀속까지** 요구한다. 이것이 이 계약의 발단이므로 "붉어졌다" 만으로는 검증되지 않는다. Dir-2 는 특이도가 아니라 **FR-04 의 본체 판정**이다 — 호출처 규율을 지운 뒤에도 초록이어야 전제가 실제로 이전된 것이다.

이관처 task DoD 는 `injection: 2/2 detect` 를 요구한다. **이관처 task 가 발행되지 않으면 그 사실을 `10.followups/` 에 남긴다** — 이관처 없는 강등은 금지다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-28 | inspector tick 240 | REQ-20260828-045 흡수 — 최초 등록 (골격). blue `multi-element-count-assertion-arrival-wait` 와 극성 반대로 분리 보존 | all |
