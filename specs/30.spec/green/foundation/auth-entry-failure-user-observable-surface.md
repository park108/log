# 인증 진입점 실패의 사용자 관측 가능 표면

> **위치**: `src/common/UserLogin.tsx` 의 `UserLogin` — 실패 갈래 `:29-31`(로그아웃) · `:34-36`(로그인), 진입점 `:41-48`
> **관련 요구사항**: REQ-20260825-023
> **최종 업데이트**: 2026-08-25 (by inspector — tick 224 최초 등록)

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

## 의존성

- 내부: `src/common/UserLogin.tsx`, `src/common/errorReporter.ts`, `src/common/a11y.js` (`activateOnKey`), (수단 선택 시) `src/Toaster/Toaster.tsx`.
- 역의존: `src/common/Navigation.tsx` 가 진입점을 렌더.
- 인접 계약: slug `foundation/auth-redirect-url-totality-and-observable-failure` (URL 도출 전수성) · blue `components/toaster` (Toaster 3-state 머신) · blue `components/common` (a11y 활성 경로).

## 발화 채널

**위반이 현 HEAD 의 어떤 게이트도 붉게 만들지 않는다.** 실패 갈래가 화면에 아무것도 내지 않아도 `npm test` 는 초록이다 — 현 3 케이스가 단언하는 것은 `href` 불변과 `reportError` 호출뿐이고 둘 다 현 구현에서 참이다 (tick 224 실측 `failure-cases=3 unobserved=3`). `check:*` 18종 중 렌더 결과를 보는 것은 0건이다.

착지 후의 상시 채널은 **vitest 수집 경로**(`src/common/UserLogin.test.tsx`)다 — 이 축의 위반은 실패 갈래 테스트를 붉게 만들기 때문이다. 그 경로는 `vite.config.js` 수집 범위 안이며 `npm test` · CI 에서 발화한다.

## 테스트 현황

- [x] 채워진 값 아래의 로그인·로그아웃 리디렉트 4 케이스 — `src/common/UserLogin.test.tsx`.
- [x] a11y 활성 경로 (클릭·Enter·Space) 케이스 실재.
- [x] 실패 3 케이스의 실재 — tick 224 실측 `failure-cases=3` (`reportErrorSpy).toHaveBeenCalledTimes` 보유 `it` 블록 도출).
- [ ] 실패 3 케이스의 **렌더 결과 단언** — tick 224 실측 `unobserved=3`. (S-2) 의 부착 대상.
- [ ] 성공 갈래의 표면 **부재 단언** — tick 224 실측 0 hit. (S-3) 의 부착 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (`RULE-07 §수용 기준 문장 규약`). 명령은 `src/**` 만 참조하며 **spec 경로를 참조하지 않는다** (`§promote 조건 2`). **HEAD=`eb5019b` (tick 224 등록) 기준 0/3.**

- [ ] (Must, S-1) 표면 실재 — 실패 갈래가 접근성 트리에 도달하는 표면을 렌더한다. 판정: `bash -c 'grep -qE "aria-disabled=|role=\"alert\"|<Toaster" src/common/UserLogin.tsx'` → **rc=0**. **HEAD=`eb5019b` (tick 224) 실측 rc=1 / 0 hit → 미충족.** **검출 경계 (과신 금지)** — 이것은 소스 grep 이라 `RULE-06 §관측 표면` 이 경고하는 형태이며 주석 한 줄로 통과할 수 있다. **단독으로는 판정력이 없고 (S-2) 와 동반해야 의미를 갖는다** — (S-2) 는 렌더 결과를 단언하는 테스트의 실재를 요구하고 그 테스트는 `npm test` 에서 실제로 실행된다. 두 항목을 분리해 둔 이유는 착지 순서(구현 → 테스트)를 관측 가능하게 남기기 위함이다.
- [ ] (Must, S-2) 실패 갈래 케이스의 렌더 결과 단언 — 모집단을 테스트 파일에서 **도출**해 대조한다 (`RULE-06 §열거 고정 금지`). 판정:
  ```
  awk '/^[[:space:]]*it\(/ { b++ } /reportErrorSpy\)\.toHaveBeenCalledTimes/ { rep[b]=1 } /toHaveAttribute\((.)aria-disabled|ByRole\((.)alert|toBeDisabled\(\)/ { obs[b]=1 } END { for (i=1;i<=b;i++) if (rep[i]) { f++; if (!obs[i]) m++ } printf "failure-cases=%d unobserved=%d\n", f, m; exit (f==0 ? 2 : (m>0 ? 1 : 0)) }' src/common/UserLogin.test.tsx
  ```
  → **rc=0**. **HEAD=`eb5019b` (tick 224 재실행) 실측 rc=1 / `failure-cases=3 unobserved=3` → 미충족.** **공허 통과 가드 내장** — 실패 케이스 도출이 0 이면 `exit 2` 로, 케이스가 사라져 조용히 참이 되는 상태를 충족으로 읽지 않는다. ack 라인이 `failure-cases=3` 으로 비공허임을 수치로 낸다. **인용 부호 비의존** — 패턴이 `\((.)` 형태라 `'alert'` · `"alert"` 양쪽을 받는다. **`window.location.href` 불변 단언을 관측으로 계수하지 않는 이유**는 §동작 (O-2) — 그 상태가 곧 결함이므로 인정하면 기준이 현 HEAD 에서 이미 참이 된다.
- [ ] (Should, S-3) 특이도 — 성공 갈래 부재 단언. 판정: `bash -c 'grep -qE "(queryByRole\((.)alert(.)\)\)\.(toBeNull|not\.toBeInTheDocument)|not\.toHaveAttribute\((.)aria-disabled)" src/common/UserLogin.test.tsx'` → **rc=0**. **HEAD=`eb5019b` (tick 224) 실측 rc=1 / 0 hit → 미충족.** **이 항목이 없으면 "항상 표시되는 배너" 가 (S-1)(S-2) 를 통과한다** — 실패 갈래에서 표면이 보이는 것만 재고 성공 갈래에서 안 보이는 것을 재지 않기 때문이다. slug `testing/declared-branch-discriminating-assertion` 의 구별 단언 요구와 같은 구조이며, 그 spec 의 모집단(`isAdmin` 계열 23 지점)에는 본 지점이 **포함되지 않는다**.

## 참고

### 게이트 실효 검증 이관 (RULE-07 §처리 · RULE-06 §게이트 실효 검증)

아래는 **'가정 주입 요구' 부류**라 체크박스로 두지 않으며, 검출 방향을 보존한 채 **수리 task 의 `## 검증/DoD`** 로 이관한다. developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다. **이관처 task 가 발행되기 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

- **(Dir-1) 민감도** — `UserLogin.tsx` 실패 갈래에서 새 표면 렌더를 제거(또는 성공 갈래와 동일하게 되돌림) → 해당 테스트 `rc≠0` → 원복 → `rc=0`.
- **(Dir-2) 특이도** — 주입 없이 그대로 실행 → `rc=0`. 이 방향이 없으면 "항상 실패하는 단언" 이 (Dir-1) 을 통과한다.
- **(Dir-3) 갈래 구별** — 성공 갈래에서 표면이 나타나도록 조건을 반전 → (S-3) 의 특이도 단언 `rc≠0` → 원복.

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
