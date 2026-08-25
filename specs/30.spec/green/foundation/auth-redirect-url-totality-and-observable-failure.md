# 인증 리디렉트 URL 도출은 총함수이며, 실패는 무발화로 흡수되지 않는다

> **위치**: `src/common/UserLogin.tsx` 의 `getLoginUrl` · `getLogoutUrl` · `handleLoginClick`. 키 선언은 `src/types/env.d.ts`, 값은 추적되는 `.env*`, mode 술어는 `src/common/env.ts`.
> **관련 요구사항**: REQ-20260825-022 (auth-redirect-url-totality-and-observable-failure)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 223 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`139cd78`).

## 역할

사용자가 직접 밟는 **인증 진입점**(로그인·로그아웃)의 리디렉트 URL 도출은 총함수이며, 도출이 실패했을 때 그 실패는 **관측 가능**하다. 버튼이 눌렸는데 아무 일도 일어나지 않는 상태가 정상 동작으로 취급되지 않는다.

`RULE-07 §주제 우선순위` 귀속은 **1순위 (사용자 관측 가능 동작)** 다. 이 계약이 막는 것은 다음 상태다 — `role="button"` 과 `tabIndex={0}` 이 그대로 남아 클릭·Enter·Space 에 전부 반응하는 것처럼 보이는데, 핸들러가 `if (url)` 에서 조용히 빠져나가 **화면·콘솔·네트워크 어디에도 흔적이 남지 않는다**. 사용자에게 이것은 "로그인이 고장났다" 가 아니라 "내가 잘못 눌렀나" 로 관측된다.

동시에 이 계약은 **2순위 (토큰·설정 정합)** 축을 하나 포함한다 (`§역할` 이 요구하는 방어 대상 명시): `env.d.ts` 가 선언한 `VITE_COGNITO_*` 4 키는 어떤 자동 게이트의 모집단에도 들어가 있지 않다. 그 사각이 위 무발화 상태의 **공급원**이다.

이 계약이 의도적으로 하지 않는 것:
- (i) Cognito 인증 흐름·토큰 검증·쿠키 정책.
- (ii) 리디렉트 URL 의 **값** 정합 (도메인·`redirect_uri` 일치). 판정 대상은 실재이지 정확성이 아니다.
- (iii) 실패 관측의 **수단** 지정 (오류 보고 / 비활성 표시 / 로그 발화 / 예외). planner·developer 영역이며, 요구하는 것은 "무발화가 아님" 이다.
- (iv) `*_API_BASE` 6 키 — `foundation/api-base-url-assembly-totality §동작 (A-5)` 가 이미 덮는다.
- (v) 배포 플랫폼(Amplify)이 주입하는 환경변수의 실재. 저장소에 관측 채널이 없다.

## 공개 인터페이스

- `export const getLoginUrl = (): string | undefined` — `src/common/UserLogin.tsx:6`.
- `export const getLogoutUrl = (): string | undefined` — `:12`.
- 컴포넌트 `UserLogin` — `role="button"` · `data-testid="login-button"` · `tabIndex={0}` · `onClick` · `onKeyDown={activateOnKey(handleLoginClick)}`.

관측 표면은 (a) 버튼 활성 후 일어나는 일, (b) `env.d.ts` 선언 키에 대해 검증 채널이 내는 판정 목록이다.

## 동작

### (U-0) 무발화의 성립 경로

```ts
// src/common/UserLogin.tsx:6-10
export const getLoginUrl = (): string | undefined => {
	if (isProd()) return import.meta.env.VITE_COGNITO_LOGIN_URL_PROD;
	if (isDev()) return import.meta.env.VITE_COGNITO_LOGIN_URL_DEV;
	return undefined;
}
// :28-33
const url = getLogoutUrl();
if (url) window.location.href = url;
...
const url = getLoginUrl();
if (url) window.location.href = url;
```

키 부재는 `undefined`, 빈 값(`KEY=`)은 `""` 를 만들고 **둘 다 falsy** 이므로 `if (url)` 가 거짓이 된다. 대입이 일어나지 않고 else 갈래가 없으므로 핸들러는 `preventDefault()` 만 하고 종료한다. `.env.example:13-16` 이 정확히 그 빈 값 형태이므로 **템플릿을 그대로 복사해 빌드하면 인증 진입점 전체가 무발화로 죽는다**.

### (U-1) 선언 키의 전수 검증 대상성

`src/types/env.d.ts` 가 선언한 `VITE_*` 키는 전부 어떤 검증 채널의 **판정 대상**이며, 그 사실이 채널 산출에서 관측된다. 선언만 되고 아무 게이트도 보지 않는 키가 0 이다.

HEAD=`139cd78` 실측 — 선언 **10 키** 중 검증 채널 모집단 진입:

| 군 | 개수 | 모집단 진입 | 산출에서 관측 가능 |
|---|---|---|---|
| `VITE_*_API_BASE` (`env.d.ts:4-9`) | 6 | `check:env-api-base` | **아니오** — 산출이 `keys=6` 수치뿐 |
| `VITE_COGNITO_{LOGIN,LOGOUT}_URL_{PROD,DEV}` (`:10-13`) | 4 | **없음** | 아니오 |

기존 두 게이트가 구조적으로 4 키를 보지 못하는 이유:

- `scripts/check-env-api-base-presence.sh:70` 의 도출 패턴이 `readonly[[:space:]]+VITE_[A-Z_]*API_BASE` 라 모집단 자체에 들어오지 않는다. 같은 파일 `:37` 이 이 공백을 **미선언 방향으로 자백**해 두었다 — "`VITE_COGNITO_*` 4 키의 실재. 본 축은 `*_API_BASE` 한정이다."
- `scripts/check-vite-env-coherence.sh:47` 의 G2 는 `src/**` 참조 키 ⊆ `env.d.ts` **선언** 키만 본다. 선언이 있으면 통과하므로 값 실재는 판정 대상이 아니다.
- `tsc` 는 `env.d.ts` 의 `readonly …: string` 을 참으로 가정한다. `string` 으로 좁혀 놓았으므로 `undefined` 가능성이 **타입에서 사라진다** — 선언이 검증을 대체하는 것이 아니라 검증을 **불가능하게** 만든다.

> **왜 "모집단 진입" 이 아니라 "산출에서 관측 가능" 까지 요구하는가.** 커버리지 주장 자체가 관측되지 않으면 다음 사각도 같은 방식으로 생긴다 — 누군가 도출 패턴을 좁혀도 `keys=N` 의 N 이 줄 뿐 어떤 키가 빠졌는지는 산출에 남지 않는다. 실제로 현 HEAD 는 6 키를 정상 판정하면서도 **어떤 키를 판정했는지 말하지 않는다.**

### (U-2) 두 층위 판정

검증은 **키 행 존재**와 **값 비공란** 두 층으로 나뉜다. 두 층의 파일 범위는 다르다 — 인접 계약 `foundation/api-base-url-assembly-totality §동작 (A-5)` 가 확정한 범위를 그대로 상속한다.

- **키 행의 실재**: 추적되는 `.env*` **전 파일** (`.env.example` 포함). 템플릿의 존재 이유가 "어떤 키가 필요한가" 의 선언이므로 키가 빠지면 템플릿이 거짓말을 한다.
- **값의 실재**: `*.example` 을 **제외한** 파일. 템플릿에 값을 싣지 않는 것이 관례이며, 값을 요구하면 정상 트리가 붉어진다.
- 제외 후 대상 파일이 0개가 되는 상태는 **무판정**이므로 공허 가드로 하드 실패한다.

HEAD 실측 — `.env.test:11-14` 4 키 전부 비공란, `.env.example:13-16` 4 키 전부 공란. **현재 위반 상태는 아니다. 방어가 없을 뿐이다.**

### (U-3) 도출 실패의 관측 가능성

리디렉트 URL 도출이 실패한 조건(키 부재 또는 값 공란)에서 인증 버튼을 활성하면 **무발화가 아니다**. 수단은 지정하지 않는다 (§역할 (iii)) — 요구는 다음 둘뿐이다.

1. 그 조건이 테스트로 **구성 가능**하고 실제로 구성돼 있다.
2. 그 조건에서 관측되는 결과가 **아무 일도 일어나지 않음과 구별된다**.

> 2 를 별도로 쓰는 이유 — 조건만 구성하고 단언이 침묵을 허용하면 그 테스트는 무발화를 **승인**한다. `testing/test-double-return-shape-fidelity §동작 (T-3)` 이 같은 형태의 초록을 기록해 두었다: 선언한 분기와 무관하게 참이 되는 단언은 분기가 뒤집혀도 붉어지지 않는다.

기존 테스트가 이 상태를 잡지 못하는 이유 — `src/common/UserLogin.test.tsx` 의 4 케이스(`:70-91`)는 `.env.test` 의 **채워진 값**을 전제로 `toContain("localhost:3000")` · `toContain("park108.net")` 을 잰다. a11y 케이스(`:114-149`)도 채워진 값 아래에서 `window.location.href` 를 확인한다. 공란 조건을 구성하는 케이스가 0 이고, `getLoginUrl` 의 세 번째 갈래(`return undefined`)를 실행하는 테스트도 0 이다.

### (U-4) 도출의 열거 고정 금지

판정 대상 키 목록은 `env.d.ts` **선언으로부터 도출**한다 (`RULE-06 §열거 고정 금지`). 새 `VITE_*` 키가 선언되면 자동으로 모집단에 들어온다. 도출 결과가 공집합이면 통과가 아니라 실패다.

## 의존성

- 외부: Vite (`import.meta.env`), 브라우저 `window.location`.
- 내부: `src/common/env.ts` (`isDev`/`isProd`), `src/types/env.d.ts`, `src/common/a11y.ts` (`activateOnKey`).
- 인접 계약:
  - `foundation/api-base-url-assembly-totality` §동작 (A-5) — **같은 병리의 다른 키군**. 그쪽 귀결은 데이터 패치 실패이고 본 계약의 귀결은 사용자가 직접 밟는 경로의 무발화 정지다. (U-2) 의 파일 범위는 그 계약에서 상속한다.
  - `foundation/vite-env-boundary-typing` §G2 — 선언 존재만 보는 축.
  - `testing/console-error-runtime-zero` · `component-runtime-warning-zero` — (U-3) 의 관측 수단이 콘솔 발화를 택할 경우의 제약 (§회귀 중점 (R-4)).
  - `common/accessibility` — `activateOnKey` 경로도 같은 핸들러를 공유하므로 (U-3) 은 클릭·키보드 양쪽에 성립한다.

## 회귀 중점

- **(R-1) 열거 고정으로의 회귀.** 4 키를 리터럴로 박아 게이트를 넓히면 5번째 인증 키가 그대로 사각이 된다. 현 사각이 **정확히 그 방식으로** 생겼다 — `*_API_BASE` 라는 리터럴 접미사가 도출 패턴에 박혀 있었다.
- **(R-2) 산출 침묵으로의 회귀.** 모집단만 넓히고 산출은 `keys=N` 수치로 두면 (U-1) 의 후반부가 무효가 된다. 커버리지 주장이 관측되지 않으면 다음 사각은 같은 방식으로 다시 조용해진다.
- **(R-3) `.env.example` 값 채우기로의 오회복.** 템플릿에 더미 값을 넣으면 (U-2) 값 층이 초록이 되지만 계약은 아무것도 얻지 못하고 **템플릿의 의미만 훼손**된다. 값 층의 파일 범위는 계약이지 구현 편의가 아니다.
- **(R-4) 관측 수단이 기존 발화 0 게이트와 충돌하는 오회복.** (U-3) 을 `console.error` 로 해결하면 `console-error-runtime-zero` 가 붉어진다. 무발화를 고치려다 다른 계약을 깨는 것은 회복이 아니다.
- **(R-5) 단언이 침묵을 허용하는 오회복.** 공란 조건 케이스를 추가하되 단언을 `expect(button).toBeInTheDocument()` 류로 두면 그 케이스는 (U-3) 을 재지 않으면서 체크박스를 초록으로 만든다. 단언은 **무발화와 구별되는 결과**를 겨눠야 한다.
- **(R-6) 타입 선언 강화로의 오회복.** `env.d.ts` 를 `string | undefined` 로 바꾸면 `tsc` 는 소비 지점을 붉게 만들지만, 그것은 **키 실재**를 판정하지 않는다. 값이 빈 문자열인 경로는 타입으로 잡히지 않는다.

## 발화 채널

**HEAD=`139cd78` 에 이 축의 발화 채널이 없다.**

| 게이트 | HEAD=`139cd78` 채널 | 상태 |
|---|---|---|
| U-1 (선언 전수 대상성) | 없음 — `check:env-api-base` 는 `*_API_BASE` 한정 모집단 | **부착 필요** (기존 게이트 도출 패턴 확장이 유력) |
| U-2 (두 층위 판정) | `*_API_BASE` 6 키에 한해 존재 (`check-env-api-base-presence.sh`) | 부분 존재 (인접 사각) |
| U-3 (실패 관측 가능성) | 없음 — `UserLogin.test.tsx` 에 공란 조건 케이스 0 | **부착 필요** |
| U-4 (도출 비공허) | 기존 게이트가 보유 — 확장 시 유지돼야 한다 | 상속 |

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다.

> **관측 표면 주의** (`RULE-06 §관측 표면`) — (U-1) 의 판정은 "게이트 스크립트에 `COGNITO` 문자열이 있는가" 가 아니라 **실행 산출이 그 키를 판정 대상으로 열거하는가** 다. 스크립트 본문 grep 은 주석 한 줄로 통과한다. 실제로 `check-env-api-base-presence.sh:37` 은 이미 `VITE_COGNITO_*` 를 **주석으로** 담고 있으므로, 본문 grep 게이트였다면 현 HEAD 가 그대로 초록이었다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** 아래는 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니며, 검출 방향을 보존한 채 **채널 부착 task 의 `## 검증/DoD`** 로 이관한다. `RULE-04` notes 에 `injection: 4/4 detect` 박제. **이관처 task 가 발행되기 전까지 귀속처는 이 절의 명시적 지시다** (이관처 없는 강등 금지).

- (Dir-1) `.env.test` 에서 `VITE_COGNITO_LOGIN_URL_PROD` 키 행을 삭제 → `rc≠0` → 원복 → `rc=0`.
- (Dir-2) 같은 키의 값을 공란으로 → `rc≠0` → 원복 → `rc=0`. (Dir-1) 과 **다른 층**을 겨눈다.
- (Dir-3) `env.d.ts` 에 신규 `VITE_*` 키 선언을 추가하고 `.env*` 에는 반영하지 않는다 → `rc≠0`. **이 방향이 "env 파일의 키를 훑는" 역방향 구현을 걸러낸다** — 선언에만 있는 키는 그 구현에게 보이지 않는다.
- (Dir-4) **특이도** — `.env.example` 의 `VITE_COGNITO_*` 4 키 공란(현 HEAD 상태)이 값 층 위반으로 계수되지 **않음**을 확인 → `rc=0` 유지. (R-3) 의 직접 대응이며, 이 방향이 없으면 템플릿을 붉게 만드는 게이트가 (Dir-1)~(Dir-3) 만으로 통과한다.

> (Dir-4) 를 명시 열거하는 것은 `RULE-06 §게이트 실효 검증` 이 민감도만 요구하고 특이도를 요구하지 않는 비대칭 때문이다 (REQ-20260825-021 이 지적한 축). 이 축은 **정상 트리가 이미 값 공란을 보유**하므로 특이도 붕괴가 즉시 정상 트리를 붉게 만든다.

## 테스트 현황

- [x] 채워진 값 아래의 로그인·로그아웃 리디렉트 4 케이스 — `src/common/UserLogin.test.tsx:70-91`.
- [x] a11y 활성 경로 (클릭·Enter·Space) — `:114-149`.
- [ ] 공란 조건에서의 무발화 부재 — HEAD 0건. (U-3) 의 부착 대상.
- [ ] `getLoginUrl`/`getLogoutUrl` 미정의 갈래의 테스트 실행 — HEAD `toBeUndefined()` **0 hit**.
- [ ] `VITE_COGNITO_*` 4 키의 실재 검증 채널 — HEAD 0건. (U-1)(U-2) 의 부착 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 측정 명령은 `src/**` · `scripts/**` · `.env*` · `package.json` · `.husky/*` · `.github/**` 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2). **HEAD=`139cd78` 기준 1/5** — 신규 등록이며 (U-4) 상속분만 충족이다.

- [ ] (Must, U-1) 선언 전수 대상성 — `env.d.ts` 선언 `VITE_*` 키가 전부 검증 채널 **산출에 판정 대상으로 열거**된다. 판정:
  ```
  bash -c 'keys=$(grep -oE "readonly[[:space:]]+VITE_[A-Z_]+" src/types/env.d.ts | sed -E "s/.*(VITE_[A-Z_]+)/\1/" | sort -u); [ -n "$keys" ] || { echo "derive=0 vacuous" >&2; exit 2; }; out=$(npm run --silent check:env-api-base 2>&1); n=0; for k in $keys; do case "$out" in *"$k"*) : ;; *) echo "uncovered: $k" >&2; n=$((n+1));; esac; done; echo "declared=$(echo "$keys" | wc -w | tr -d " ") uncovered=$n"; exit $((n>0))'
  ```
  → **rc=0**. **HEAD=`139cd78` 실측 rc=1 / `declared=10 uncovered=10` → 미충족.** **`uncovered=10` 이 `4` 가 아닌 이유를 오독하지 말 것** — `*_API_BASE` 6 키는 모집단 안에 있으나 산출이 `keys=6` 수치뿐이라 **어떤 키를 판정했는지 관측되지 않는다**. 즉 이 판정은 사각 4건과 **커버리지 주장의 불투명성** 을 동시에 잰다 ((U-1) 후반부·(R-2)). **공허 통과 가드 내장** — 도출 0 이면 `exit 2`. ack 라인이 `declared=10` 으로 비공허임을 수치로 함께 낸다. 채널 식별자가 후속 task 에서 바뀌면 이 항목의 `check:env-api-base` 를 그 식별자로 갱신한다.
- [ ] (Must, U-2 값 층) 값 실재 — `bash -c 'd=$(grep -cE "readonly[[:space:]]+VITE_COGNITO_[A-Z_]+" src/types/env.d.ts); test "$d" -gt 0 && test "$(grep -cE "^VITE_COGNITO_[A-Z_]+=.+" .env.test)" -eq "$d"'` → rc=0. **HEAD=`139cd78` 실측 rc=0 / `4 == 4` → 충족이나 방어는 없다.** 이 항목을 `RULE-07 §반려 시그널` 의 "이미 참인 보존 명제" 로 반려하지 않은 이유는 명제의 참·거짓이 아니라 **위반 시 실패하는 기존 게이트가 존재하지 않는다**는 데 있다 — §동작 (U-1) 표의 세 게이트 어느 것도 이 조건을 보지 않는다. 기대 개수를 리터럴 `4` 가 아니라 선언 수 `d` 로 도출하는 것은 (R-1) 대응이며, `d` 가 0 이면 명제가 공허하게 참이 되므로 `-gt 0` 을 함께 요구한다.
- [ ] (Must, U-3) 공란 조건 케이스의 실재와 통과 — 리디렉트 URL 이 공란인 조건을 구성한 케이스가 `src/common/UserLogin.test.tsx` 에 실재하고 그 파일이 rc=0 이다. 판정:
  ```
  bash -c 'test "$(grep -cE "stubEnv\((.)VITE_COGNITO_[A-Z_]+\1,[[:space:]]*(.)\2\)" src/common/UserLogin.test.tsx)" -ge 1 && npx vitest run src/common/UserLogin.test.tsx >/dev/null 2>&1'
  ```
  → **rc=0**. **HEAD=`139cd78` 실측 rc=1 / 공란 stub 0 hit → 미충족.** 조건 **구성 수단**(`vi.stubEnv` + 빈 문자열)은 픽스처 기계장치이므로 고정하되, **관측 수단**은 고정하지 않는다 (§역할 (iii)). **검출 경계 (과신 금지)**: 이 명령은 케이스의 *실재*와 파일의 *통과*를 재며, 그 케이스의 단언이 실제로 무발화를 배제하는지는 재지 않는다 — 단언 품질은 (R-5) 와 §발화 채널 (Dir) 로 이관돼 있다. 미검출일지언정 미기록이 아니다. 파일을 `UserLogin.test.tsx` 로 고정하는 것은 수단 지정이 아니라 **구현 단위의 자기 테스트** 라는 위치 관례다.
- [ ] (Should, U-3 보조) 미정의 갈래의 테스트 실행 — `bash -c 'test "$(grep -cE "toBeUndefined\(\)" src/common/UserLogin.test.tsx)" -ge 1'` → rc=0. **HEAD=`139cd78` 실측 rc=1 / 0 hit → 미충족.** `getLoginUrl`/`getLogoutUrl` 의 세 번째 갈래(`return undefined`)가 어떤 테스트에서도 실행되지 않는 상태를 닫는다. 도달 가능성 자체는 §참고로 강등했다.
- [x] (Must, U-4 상속) 배선 실경로 — 검증 채널이 실행 표면에 **호출 라인**으로 등재된다: `bash -c 'grep -qE "^[[:space:]]*(bash scripts/check-env-api-base-presence\.sh|npm run check:env-api-base)" .husky/pre-commit .github/workflows/ci.yml'` → rc=0. **HEAD=`139cd78` 실측 rc=0 → 충족** (`.husky/pre-commit:53` · `ci.yml:78`). **호출 형태(`bash <경로>` / `npm run <식별자>`) + 행 시작 앵커를 함께 요구하는 이유** — 둘 중 하나라도 빠지면 주석이 통과시킨다. 실측: 식별자만으로 훑는 `grep -nE "check:env-api-base"` 는 `.husky/pre-commit:49` 의 주석 `# npm script 동치: check:env-api-base (…)` 를 hit 한다. 배선이 전부 지워져도 그 주석 한 줄이 남으면 초록이다. 채널 확장 시 이 등재가 유지돼야 한다.

## 참고

- **REQ 원문**: `20.req/20260825-auth-redirect-url-totality-and-observable-failure.md` (REQ-20260825-022, slug 식별).
- 소비한 followup: `20260825-2230-vite-cognito-key-presence-unguarded`.
- 관련 blue spec: `30.spec/blue/foundation/vite-env-boundary-typing.md`, `30.spec/blue/common/env.md`, `30.spec/blue/common/accessibility.md`, `30.spec/blue/testing/console-error-runtime-zero.md`.
- 기존 게이트 원문: `scripts/check-env-api-base-presence.sh:37`(자백 주석) · `:70`(도출 패턴), `scripts/check-vite-env-coherence.sh:47`(G2).

### 미측정·비판정 항목

- **(미측정) 실제 배포 환경의 4 키 실재.** `.env.production` 도 CI/호스팅 시크릿도 저장소에 없다. 본 계약은 **저장소가 보유한 env 파일**과 선언의 정합만 판정한다.
- **(미측정 NFR) `getLoginUrl` 세 번째 갈래의 런타임 도달 가능성.** Vite 에서 `import.meta.env.DEV` 와 `PROD` 는 상보적이므로 실 런타임 도달은 불가로 보인다. 판정 대상은 그 갈래의 **테스트 실행**이지 도달 가능성이 아니다 — 도달 불가라 해도 미실행 갈래는 리팩터링 시 조용히 깨진다.
- **(미측정) 리디렉트 URL 값의 정확성.** 도메인·`redirect_uri` 일치는 별 축이며 저장소에 판정 채널이 없다.
- **(가정 주입 요구 — 이관) 게이트의 민감도·특이도.** (Dir-1)~(Dir-4) 로 채널 부착 task DoD 에 이관했다 (§발화 채널). 이관처 task 가 발행되기 전까지 귀속처는 그 절의 명시적 지시다.
- **(별 축) 실패 관측 수단이 콘솔을 택할 때의 발화 0 계약과의 정합.** `testing/console-error-runtime-zero` 가 규정한다. 본 계약은 (R-4) 로 방향만 배제한다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-022 (inspector tick 223) | 최초 등록. followup 1건을 흡수한 req 를 불변식으로 반영. **req 수용 기준 9항을 그대로 쓰지 않았다**: (a) FR-01 의 `grep -cE "readonly VITE_[A-Z_]+" env.d.ts` → `10` 은 **선언 개수를 세는 자명 명제**라 커버리지를 재지 않는다 (10 은 지금도 참이다). 선언 키를 도출해 **채널 산출과 대조**하는 판정으로 교체했고, 그 결과 `uncovered=10` 이라는 실측을 얻어 사각 4건뿐 아니라 **기존 6 키의 커버리지 주장이 산출에서 관측되지 않는다**는 사실까지 드러났다 ((R-2) 로 승격). (b) FR-01/FR-04 의 "stdout 에 `VITE_COGNITO_LOGIN_URL_PROD` 가 열거된다" 는 1 키 리터럴 고정이라 (a) 의 전수 대조에 흡수했다. (c) FR-02 의 `.env.test` 기대값 리터럴 `4` 를 **선언 수 도출 + `-gt 0` 공허 가드**로 교체했다 (`RULE-06 §열거 고정 금지`). (d) "제외 규칙이 게이트 본문에 박제돼 있다" 는 **본문 grep 판정**이라 주석 한 줄로 통과한다 — 실제로 `check-env-api-base-presence.sh:37` 이 이미 `VITE_COGNITO_*` 를 주석으로 담고 있어 그 형태의 게이트는 현 HEAD 가 그대로 초록이었다. 특이도 방향 (Dir-4) 로 이관했다. (e) NFR-03 배선 판정 `grep -nE "^[[:space:]]*(bash\|npm run) .*env"` 는 **다른 게이트의 배선으로 충족된다** — 실측 결과 `.husky/pre-commit:12` `bash scripts/check-vite-env-coherence.sh` 가 hit 하므로, 본 축의 배선이 전부 지워져도 `≥1 hit` 이 참이다. 채널 식별자를 고정해 좁혔다. 앵커도 함께 유지한다 — 식별자만으로 훑으면 `.husky/pre-commit:49` 의 주석 `# npm script 동치: check:env-api-base` 가 hit 해 배선 없이 통과한다 (실측 확인). (f) `npm test` rc=0 · `npm run check:vite-env` rc=0 두 항은 **중복 게이트 부류**(위반 시 기존 husky·CI 가 즉시 실패)라 체크박스로 두지 않았다. **신규 추가 (req 에 없던 항목)**: (U-1) 후반부 "산출에서 관측 가능" 요건, (R-2) 산출 침묵 회귀, (R-5) 단언이 침묵을 허용하는 오회복 — 공란 케이스를 추가하되 단언이 무발화를 배제하지 않으면 그 테스트는 결함을 **승인**한다, (R-6) 타입 선언 강화로의 오회복 — `string \| undefined` 는 빈 문자열 경로를 잡지 못한다, (Dir-4) 특이도 방향. | all |
