# 인증 진입점 실패의 사용자 관측 가능 표면

> **위치**: `src/common/UserLogin.tsx` 의 `UserLogin` — 실패 갈래 `:40-43`(로그아웃) · `:51-54`(로그인), 진입점 `:60-71`, 실패 표면 `:66`(`aria-disabled`) · `:72-74`(`role="alert"`). 라인은 HEAD=`5b2ed3b` 스냅샷이며 **식별자 우선**.
> **관련 요구사항**: REQ-20260825-023
> **최종 업데이트**: 2026-08-26 (by inspector — tick 226 green 판본, (S-2) 극성 구별 교정)

## 역할

인증 진입점(로그인·로그아웃)의 리디렉트 URL 도출이 실패하면, **최종 사용자가 관측할 수 있는 귀결**이 발생한다. 렌더 결과가 성공 갈래와 구별되며 그 구별이 **접근성 트리에 도달**한다.

핵심 명제 — **로그 발화는 사용자 관측 표면이 아니다.** `reportError` 의 도달처는 개발자 콘솔이고, 배포 빌드의 관측자 집합에는 개발자가 없다. 두 관측자는 서로 다른 집합이며 상류 계약이 요구한 "무발화가 아님" 은 전자만 보장한다.

의도적으로 하지 **않는** 것:
- (i) **표면 수단을 단일 지정하지 않는다.** 진입점 비활성 표시 / 실패 알림 표면 / 그 밖의 형태 중 구현자 선택이다. 배제하는 것은 특정 수단의 부재가 아니라 **무변화**다.
- (ii) **리디렉트 URL 의 값 정합을 다루지 않는다.** slug `foundation/auth-redirect-url-totality-and-observable-failure` 가 소유한다.
- (iii) **`reportError` 의 배선(Sentry 등)을 다루지 않는다.** 그것이 붙어도 사용자 표면은 아니다 — 이 계약의 논지가 정확히 그것이다.
- (iv) **다른 컴포넌트의 실패 표면을 일반화하지 않는다.** 위반 모집단이 `UserLogin` 1건이라 전칭 계약은 위반 0 인 상태에서 세워진다 (§동작 (O-3)).

## 공개 인터페이스

- Props: 없음 (`UserLogin` 은 무인자 컴포넌트).
- 렌더 결과: 진입점 요소 (`role="button"` · `tabIndex={0}` · `onClick` · `onKeyDown`) + 본 계약이 요구하는 실패 표면.
- 활성 경로: 클릭 · Enter · Space (`activateOnKey` 경유 — blue `components/common.md` §a11y).

## 동작

### (O-1) 관측자 구분이 이 계약의 전부다

| 관측자 | 현행 도달 여부 | 도달 채널 |
|---|---|---|
| 개발자 (콘솔) | **도달** | `reportError` → `errorReporter.ts:7-10` `console.error` |
| 최종 사용자 (화면) | **미도달** | 없음 |
| 스크린리더 사용자 (접근성 트리) | **미도달** | 없음 |

상류 계약 slug `foundation/auth-redirect-url-totality-and-observable-failure` §역할 (iii) 은 실패 관측의 **수단**을 명시 중립으로 두고 "무발화가 아님" 만 요구했고, 그 요구는 TSK-20260825-29 (`7465638`) 의 `reportError` 부착으로 **이미 충족**됐다. 본 계약은 그 재선언이 아니라, 중립으로 남은 지점 — **관측자가 누구인가** — 를 좁힌다.

### (O-2) 실패 상태에서 진입점이 활성으로 남으면 오귀인이 발생한다

진입점은 실패 상태에서도 `role="button"` · `tabIndex={0}` 를 유지하고 렌더 텍스트는 `isLoggedIn()` 에만 의존한다 — URL 도출 성패와 무관하다. 따라서 사용자에게는 **"눌리는 버튼인데 아무 일도 안 일어남"** 으로 관측되고, 그 관측은 자기 조작 실수로 해석된다.

`window.location.href` 가 불변이라는 사실은 사용자 시점에서 정확히 "아무 일도 일어나지 않음" 이다. **그것을 관측 단언으로 계수하면 기준이 현 HEAD 에서 이미 참이 되어 아무것도 요구하지 않는다** (§수용 기준 (O-2) 항 참조).

### (O-3) 저장소의 기존 이디엄은 로그와 사용자 표면을 동반시킨다

실패를 사용자에게 알리는 형태가 11 컴포넌트에 정착해 있다 — 대표형 `src/File/FileItem.tsx:66-69` 는 사용자 표면 설정 **직후** `reportError` 를 호출한다. `Toaster` 는 `src/Toaster/Toaster.tsx:79` 에서 `role="alert"` 을 내므로 접근성 트리에 도달한다.

즉 이 저장소의 관용 계약은 **동반**이며 `UserLogin` 만 후자가 빠져 있다. 위반 모집단이 1건이므로 전칭 계약(§역할 (iv))이 아니라 **확정 위반 1건**만 다룬다.

### (O-4) 시각 전용 변화는 충족이 아니다

class 교체만으로는 접근성 트리에 아무 변화가 없다. 요구되는 형태는 `role="alert"` 발화 또는 `aria-disabled="true"` — 둘 다 접근성 트리 노출 형태다.

### (O-5) 부재 단언은 존재 단언과 같은 문자열을 포함하므로, 정적 판정만으로는 표면 유무가 구별되지 않는다

`.not.toHaveAttribute('aria-disabled')` 는 `toHaveAttribute('aria-disabled'` 를 **부분문자열로 포함한다.** §수용 기준 (S-2) 의 ERE 는 앵커가 없어 부정 접두 `not.` 를 보지 못하고, (S-1) 은 소스 grep 이라 주석 한 줄로 충족된다. 따라서 **표면 미부착 + 주석 1줄 + 실패 케이스가 부재 단언만 보유** 인 트리는 (S-1)(S-2)(S-3) 과 보고 채널과 `npm test` 를 **전부 rc=0 으로 통과하면서 사용자 표면 라인은 0** 이다.

tick 225 가 이 오답 트리를 스크래치패드 픽스처로 **재구성해 독립 확인**했다 — (S-2) `failure-cases=1 unobserved=0` rc=0, (S-1) 주석 단독 rc=0. 저장소 트리는 건드리지 않았다.

**이것은 본 계약의 판정력 경계이며 감추지 않는다.** 세 기준의 논리곱은 *필요조건*이지 충분조건이 아니다. 오답 트리를 실제로 분리하는 것은 §참고 §게이트 실효 검증 이관의 **(Dir-1) 민감도 주입 하나뿐**이며, 그래서 그 절이 강등이 아니라 **이관**으로 존치돼야 한다 (`RULE-07 §처리`). 현 HEAD 가 충족인 근거도 판정식 rc 가 아니라 **실패 3 블록의 양성 단언을 직접 읽어 대조한 것**이다 (§테스트 현황).

## 의존성

- 내부: `src/common/UserLogin.tsx`, `src/common/errorReporter.ts`, `src/common/a11y.js` (`activateOnKey`), (수단 선택 시) `src/Toaster/Toaster.tsx`.
- 역의존: `src/common/Navigation.tsx` 가 진입점을 렌더.
- 인접 계약: slug `foundation/auth-redirect-url-totality-and-observable-failure` (URL 도출 전수성) · blue `components/toaster` (Toaster 3-state 머신) · blue `components/common` (a11y 활성 경로).

## 발화 채널

상시 채널은 **vitest 수집 경로**(`src/common/UserLogin.test.tsx`)다 — 실패 갈래 3 케이스가 `aria-disabled` 와 `role="alert"` 를 **양성 단언**하므로 표면을 제거하면 그 케이스들이 붉어진다. 그 경로는 `vite.config.js:63,68` 수집 범위 안이며 `npm test` · CI 에서 발화한다. tick 225 실행 `1 passed (1) / 16 passed (16)` rc=0.

**채널 부착 전 상태의 박제 (감사성)** — tick 224 시점에는 위반이 어떤 게이트도 붉게 만들지 못했다. 당시 3 케이스가 단언하는 것은 `href` 불변과 `reportError` 호출뿐이었고 둘 다 결함 구현에서 참이었다 (tick 224 실측 `failure-cases=3 unobserved=3`). `check:*` 19종 중 렌더 결과를 보는 것은 지금도 0건이므로, 본 축의 유일한 상시 채널은 위 vitest 경로다.

**채널의 판정력 한계는 §동작 (O-5)** — 이 채널은 *부재 단언으로 갈아끼운* 회귀를 잡지 못한다. 그 방향은 (Dir-1) 주입에만 걸린다.

## 테스트 현황

- [x] 채워진 값 아래의 로그인·로그아웃 리디렉트 4 케이스 — `src/common/UserLogin.test.tsx`.
- [x] a11y 활성 경로 (클릭·Enter·Space) 케이스 실재.
- [x] 실패 3 케이스의 실재 — tick 224 실측 `failure-cases=3` (`reportErrorSpy).toHaveBeenCalledTimes` 보유 `it` 블록 도출).
- [x] 실패 3 케이스의 **렌더 결과 단언** — tick 225 재실행 `failure-cases=3 unobserved=0` (TSK-20260825-32 / `42ee3e7`). 3 케이스 각각이 `toHaveAttribute('aria-disabled','true')` + `getByRole('alert')` 양성 단언을 보유한다 (`UserLogin.test.tsx:185-186` · `:202-203` · `:218-219` 직접 확인).
- [x] 성공 갈래의 표면 **부재 단언** — tick 225 재실행 2 hit (`UserLogin.test.tsx:235-236`). 해당 `it` 은 `reportErrorSpy` 를 세우지 **않아** (S-2) 실패 케이스 모집단에 들어가지 않는다 — 부재 단언만으로 `unobserved=0` 이 되는 사각을 구현이 명시적으로 회피했다 (`:224-225` 주석).

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (`RULE-07 §수용 기준 문장 규약`). 명령은 `src/**` 만 참조하며 **spec 경로를 참조하지 않는다** (`§promote 조건 2`). **HEAD=`5b2ed3b` (tick 225 재실행) 기준 3/3 — 전수 충족.**

- [x] (Must, S-1) 표면 실재 — 실패 갈래가 접근성 트리에 도달하는 표면을 렌더한다. 판정: `bash -c 'grep -qE "aria-disabled=|role=\"alert\"|<Toaster" src/common/UserLogin.tsx'` → **rc=0**. **HEAD=`5b2ed3b` (tick 225 재실행) 실측 rc=0 / 3 hit → 충족** (`UserLogin.tsx:66` `aria-disabled={entryFailure ? "true" : undefined}` · `:73` `<span role="alert">`; `:65` 는 주석 hit). **검출 경계 (과신 금지)** — 이것은 소스 grep 이라 `RULE-06 §관측 표면` 이 경고하는 형태이며 주석 한 줄로 통과할 수 있다. **단독으로는 판정력이 없고 (S-2) 와 동반해야 의미를 갖는다** — (S-2) 는 렌더 결과를 단언하는 테스트의 실재를 요구하고 그 테스트는 `npm test` 에서 실제로 실행된다. 두 항목을 분리해 둔 이유는 착지 순서(구현 → 테스트)를 관측 가능하게 남기기 위함이다.
- [x] (Must, S-2) 실패 갈래 케이스의 렌더 결과 단언 — 모집단을 테스트 파일에서 **도출**하고 단언의 **극성을 구별**해 대조한다 (`RULE-06 §열거 고정 금지`). 판정:
  ```
  awk '/^[[:space:]]*it\(/ { b++ } /reportErrorSpy\)\.toHaveBeenCalledTimes/ { rep[b]=1 } /toHaveAttribute\((.)aria-disabled|ByRole\((.)alert|toBeDisabled\(\)/ { if ($0 !~ /not\./ && $0 !~ /queryByRole/) obs[b]=1 } END { for (i=1;i<=b;i++) if (rep[i]) { f++; if (!obs[i]) m++ } printf "failure-cases=%d unobserved=%d\n", f, m; exit (f==0 ? 2 : (m>0 ? 1 : 0)) }' src/common/UserLogin.test.tsx
  ```
  → **rc=0**. **HEAD=`d7b08dd` (tick 226 재실행) 실측 rc=0 / `failure-cases=3 unobserved=0` → 충족.** 판정식 결과를 받아쓰지 않고 `UserLogin.test.tsx` 3 실패 블록을 **직접 읽어** 양성 단언 실재를 대조했다 (tick 225·226).
  **tick 226 이 판정식의 극성 무구별을 교정했다 (`대상 이탈` 위음성).** 종전 관측 계수 패턴 `toHaveAttribute\((.)aria-disabled|ByRole\((.)alert|toBeDisabled\(\)` 은 **부정형 단언을 부분 문자열로 포함**한다 — `.not.toHaveAttribute('aria-disabled')` 는 `toHaveAttribute\((.)aria-disabled` 를 매치하고, `queryByRole('alert')).toBeNull()` 은 `ByRole\((.)alert` 를 매치한다. 즉 **"표면이 없음을 단언한 행"이 "표면을 관측했다"로 계수**됐고, 이 항목이 겨누는 회귀(실패 갈래에서 관측 단언이 부재형으로 퇴행하는 것)만 구조적으로 보지 못했다.
  **양방향 실측 (tick 226)** — 실 `src/common/UserLogin.test.tsx`: 종전 `failure-cases=3 unobserved=0` rc=0 / 교정판 `failure-cases=3 unobserved=0` rc=0 (**특이도 동일 — 계약을 완화하지 않았다**). 실패 블록의 양성 단언을 부재형으로 치환한 픽스처(`getByRole`→`queryByRole`, `toHaveAttribute('aria-disabled','true')`→`not.toHaveAttribute('aria-disabled')`): 종전 **`unobserved=0` rc=0 (검출 실패)** / 교정판 **`unobserved=3` rc=1 (검출)**. **민감도를 얻으면서 특이도를 잃지 않는다.**
  **공허 통과 가드 내장** — 실패 케이스 도출이 0 이면 `exit 2` 로, 케이스가 사라져 조용히 참이 되는 상태를 충족으로 읽지 않는다. ack 라인이 `failure-cases=3` 으로 비공허임을 수치로 낸다. **인용 부호 비의존** — 패턴이 `\((.)` 형태라 `'alert'` · `"alert"` 양쪽을 받는다. **`window.location.href` 불변 단언을 관측으로 계수하지 않는 이유**는 §동작 (O-2) — 그 상태가 곧 결함이므로 인정하면 기준이 현 HEAD 에서 이미 참이 된다. **(S-3) 과의 경계** — (S-3) 은 *성공* 갈래에서 부재 단언의 **실재**를 요구하므로 부정형을 계수하는 것이 정상이다. 본 항목은 *실패* 갈래에서 **양성** 단언을 요구하므로 극성이 반대이며, 두 항목이 같은 패턴을 공유하던 것이 결함의 원인이었다.
- [x] (Should, S-3) 특이도 — 성공 갈래 부재 단언. 판정: `bash -c 'grep -qE "(queryByRole\((.)alert(.)\)\)\.(toBeNull|not\.toBeInTheDocument)|not\.toHaveAttribute\((.)aria-disabled)" src/common/UserLogin.test.tsx'` → **rc=0**. **HEAD=`5b2ed3b` (tick 225 재실행) 실측 rc=0 / 2 hit (`:235` `queryByRole('alert')).toBeNull()` · `:236` `not.toHaveAttribute('aria-disabled')`) → 충족.** **이 항목이 없으면 "항상 표시되는 배너" 가 (S-1)(S-2) 를 통과한다** — 실패 갈래에서 표면이 보이는 것만 재고 성공 갈래에서 안 보이는 것을 재지 않기 때문이다. slug `testing/declared-branch-discriminating-assertion` 의 구별 단언 요구와 같은 구조이며, 그 spec 의 모집단(`isAdmin` 계열 23 지점)에는 본 지점이 **포함되지 않는다**.

## 참고

### 게이트 실효 검증 이관 (RULE-07 §처리 · RULE-06 §게이트 실효 검증)

아래는 **'가정 주입 요구' 부류**라 체크박스로 두지 않으며, 검출 방향을 보존한 채 **수리 task 의 `## 검증/DoD`** 로 이관한다. developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다. **이관처 task 가 발행되기 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

- **(Dir-1) 민감도** — `UserLogin.tsx` 실패 갈래에서 새 표면 렌더를 제거(또는 성공 갈래와 동일하게 되돌림) → 해당 테스트 `rc≠0` → 원복 → `rc=0`.
- **(Dir-2) 특이도** — 주입 없이 그대로 실행 → `rc=0`. 이 방향이 없으면 "항상 실패하는 단언" 이 (Dir-1) 을 통과한다.
- **(Dir-3) 갈래 구별** — 성공 갈래에서 표면이 나타나도록 조건을 반전 → (S-3) 의 특이도 단언 `rc≠0` → 원복.
- **(Dir-4) 부재 단언 치환 (§동작 (O-5) 직결)** — 실패 3 케이스의 양성 단언 `toHaveAttribute('aria-disabled','true')` · `getByRole('alert')` 를 부재형(`not.toHaveAttribute` · `queryByRole(...).toBeNull`)으로 **치환**하고 표면 렌더를 제거 → 해당 테스트 `rc≠0` → 원복 → `rc=0`. **이 방향이 없으면 §수용 기준 3항 전부와 `npm test` 가 사용자 표면 0 인 트리를 초록으로 통과한다** (tick 225 픽스처 재구성으로 확인).

### 미측정·비판정 항목

- **(미측정) 표면의 문구·시각 형태.** 본 계약은 접근성 트리 도달 여부만 판정하며 메시지 문안·색·위치를 규정하지 않는다.
- **(별 축) 다른 10 컴포넌트의 실패 표면.** 이미 동반 형태를 갖고 있어 위반 모집단이 0 이다. 전칭 계약은 위반 0 인 상태에서 세워지므로 본 계약에 포함하지 않는다 (§역할 (iv)).
- **(별 축) `reportError` 의 배선.** REQ-20260418-005 §13.
- **(중복 게이트 — 체크박스 제외) `npm test` · `lint` · `typecheck` rc=0.** 위반 시 husky·CI 가 즉시 실패하므로 `RULE-07 §반려 시그널` 의 중복 게이트 부류다. 단 본 계약의 착지 채널이 vitest 수집 경로라는 점에서 **전제**이므로 여기 평서문으로 남긴다.

### 관련

- **REQ 원문**: REQ-20260825-023 (slug `auth-entry-failure-user-observable-surface`).
- 소비한 followup: `20260825-2110-auth-redirect-failure-user-visible-feedback` (TSK-20260825-29 산출).
- 상류 계약: slug `foundation/auth-redirect-url-totality-and-observable-failure` (§역할 (iii) 이 수단을 중립으로 둔 지점을 본 계약이 좁힌다).
- 인접 축: slug `testing/declared-branch-discriminating-assertion` (구별 단언 일반형).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-023 (inspector tick 224) | 최초 등록. **req 수용 기준 3항을 전수 재실행해 수치를 독립 확인**한 뒤 흡수했다 (`failure-cases=3 unobserved=3` · AC-1 0 hit · AC-3 0 hit — req 박제와 일치). **위치는 `foundation/`** — `components/` 는 `src/` 구현 단위와 1:1 이라는 운영자 원칙상 `UserLogin` 의 귀속처는 blue `components/common` 이나, 본 계약은 그 as-is 서술과 축이 다르고 상류 slug `foundation/auth-redirect-url-totality-and-observable-failure` 와 **같은 실패 갈래를 공유**하므로 그 옆에 둔다. **§동작 (O-1) 신설** — req 의 논지를 관측자 3 집합 표로 재구성했다. 이 계약이 상류의 재탕이 아닌 근거가 바로 이 표이며, `reportError` 부착으로 상류가 **이미 충족된 상태**에서도 본 계약이 미충족이라는 사실이 그 독립성의 실측 증거다. **§동작 (O-2) 신설**: `href` 불변 단언을 관측으로 계수하지 않는 근거를 계약 본문에 고정했다 — 이 판단이 뒤집히면 (S-2) 는 현 HEAD 에서 이미 참이 되어 공허해진다. **§동작 (O-3)**: 위반 모집단이 1건임을 명시해 전칭 계약으로의 확대를 차단했다. **(S-1) 의 검출 경계를 항목 안에 박제** — 소스 grep 단독은 주석으로 통과하므로 (S-2) 동반이 필수임을 과신 금지 형태로 남겼다. | all |
| 2026-08-25 | TSK-20260825-32 (`42ee3e7`) / inspector tick 225 | **Phase 1 reconcile — 수용 기준 3/3 전수 ack, marker 5건 플립** (S-1·S-2·S-3 + §테스트 현황 2항). 게이트를 현 HEAD 에서 **실제 재실행**했고 `result.md` 주장은 받아쓰지 않았다: (S-1) rc=0 3 hit / (S-2) rc=0 `failure-cases=3 unobserved=0` / (S-3) rc=0 2 hit / `npx vitest run src/common/UserLogin.test.tsx` → `16 passed` rc=0. **판정식 rc 에 의존하지 않고 `UserLogin.test.tsx` 3 실패 블록을 직접 읽어** 양성 단언(`:185-186` · `:202-203` · `:218-219`)을 대조한 뒤 플립했다 — 그 대조가 필요한 이유가 신설된 **§동작 (O-5)** 다. **(O-5) 신설**: developer 가 DoD 밖에서 보고한 (S-2) 사각을 tick 225 가 스크래치패드 픽스처로 **독립 재현**해 확정했다 — `.not.toHaveAttribute('aria-disabled')` 가 `toHaveAttribute('aria-disabled'` 를 부분문자열로 포함하고 (S-2) 의 ERE 에 앵커가 없어, 표면 미부착 + 주석 1줄 + 부재 단언만인 트리가 3 기준과 `npm test` 를 전부 rc=0 으로 통과하면서 사용자 표면 라인은 0 이다. 판정력 경계를 완화·은폐하지 않고 계약 본문에 박제했고 **(Dir-4)** 를 이관 절에 신설해 그 방향의 귀속처를 만들었다. **§발화 채널 재작성**: 채널이 실제로 부착됐으므로 상시 채널을 vitest 수집 경로로 확정하고(`vite.config.js:63,68`), 부착 전 상태(`unobserved=3`)는 감사성 목적으로 별도 문단에 보존했다. **§위치 라인 갱신** — `42ee3e7` 로 라인이 밀려 종전 `:29-31`·`:34-36`·`:41-48` 이 전부 오지시였다. | §위치, §동작 (O-5), §발화 채널, §테스트 현황, §수용 기준, §참고 (Dir-4), 본 이력 |
| 2026-08-26 | REQ-20260826-027 FR-05·FR-06 (inspector tick 226) | **blue → green 판본 재등록. (S-2) 판정식 극성 구별 교정.** 관측 계수에서 `not.` 접두 행과 `queryByRole` 행을 제외해, **부재 단언이 '관측됨'으로 계수되던 위음성**을 닫았다. 실 파일 산출은 교정 전후 `failure-cases=3 unobserved=0` 으로 **동일**하고(특이도 보존), 실패 갈래 단언을 부재형으로 치환한 픽스처에서만 `unobserved=3` rc=1 로 갈린다(민감도 획득). 두 명령 모두 spec 파일에서 추출해 같은 트리에서 나란히 실행했다 (`REQ-20260826-027 NFR-03`). **blue 를 직접 편집하지 않았다** — `RULE-01` 매트릭스에 `30.spec/blue/**` 의 edit writer 가 없으므로, slug `foundation/spec-reference-coherence:21` 이 명시한 흐름(`10.followups → discovery → 20.req → inspector 의 새 green 판본 → planner 승격 mv`)을 따랐다. 본 건은 위반이 **단일 blue 파일에 국소화**돼 있어 이 경로로 닫히며, 위반이 ~20개 blue 파일에 흩어진 `spec-reference-coherence` (G-1)(G-2) 잔여와는 성격이 다르다. **계약 자체는 변경하지 않았다** — 교정 대상은 판정 **명령**이지 불변식이 아니다. | 수용 기준 (S-2) |
