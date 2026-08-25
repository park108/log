# spec 의 선언 범위와 실제 측정 표면은 양방향으로 일치한다

> **위치**: 횡단 계약. 현 판정 대상은 `src/__tests__/react-query-test-queryclient-single-source.test.ts` (게이트) · `scripts/check-test-double-shape-fidelity.sh` (게이트) · 대응 spec 의 §수용 기준 판정 명령.
> **관련 요구사항**: REQ-20260825-021 (spec-claim-measurement-surface-agreement)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 223 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`139cd78`).

## 역할

spec 이 선언한 계약과, 그 spec 을 대리해 실제로 측정하는 표면(부착 게이트 · spec 자신의 판정 명령 · 본문 실측 인용)의 범위가 **양방향으로 일치**한다. 게이트가 spec 보다 넓게 재서 정당한 변경을 봉쇄하지 않고, spec 의 판정 명령이 게이트보다 좁게 도출해 위반을 놓치지 않는다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 `§역할` 이 요구하는 대로 **방어 대상을 명시한다**: 이 계약이 막는 것은 두 방향의 silent regression 이다.

- **초과 방향** — 게이트가 소유 spec 의 명시 제외 축을 강제하면, 그 축의 정당한 확장이 **영구 봉쇄**된다. 게이트는 초록이고 테스트도 초록이며, 막힌 사실은 오직 그 확장을 시도한 task 가 red 를 만날 때만 드러난다. 실현된 사례가 1건 있다 (§동작 (S-1)).
- **미달 방향** — spec 의 판정 명령이 부착 게이트보다 좁게 도출하면, 두 수치가 갈린 채로 `RULE-07 §promote 조건 2` 의 전수 재실행이 **어긋난다**. 실현된 사례가 1건 있었고 tick 223 Phase 1 이 정정했다 (§동작 (S-3)).

**이 축이 기존 자동 게이트로 검출되지 않는 이유**는 `RULE-06 §게이트 실효 검증` 이 **민감도만 요구하고 특이도를 요구하지 않는다**는 비대칭에 있다. 위반 주입으로 `rc≠0` 을 확인하는 절차는 게이트가 **너무 많이 잡는 것**을 전혀 보지 않는다. 초과 강제는 정상 트리에서 늘 초록이므로 dry-run·Phase 1 재실행·developer 검증을 전부 통과한다.

이 계약이 의도적으로 하지 않는 것:
- (i) 게이트가 재는 **불변식 자체의 변경**. 단일 출처 정책·더블 형상 정책은 그대로 보존한다. 좁히는 것은 판정 **범위**이지 계약이 아니다.
- (ii) blue spec 본문 편집 — `RULE-01` 상 create/edit writer 가 없다 (§회귀 중점 (R-3)).
- (iii) 게이트 배선 (REQ-20260825-010) · 출력 판독 (REQ-20260825-012) — 별 축이다. 본 계약은 게이트가 **무엇을 재는가** 만 다룬다.
- (iv) 새 게이트 신설.
- (v) 저장소 전체의 초과 강제 지점 전수 감사 (§미측정·비판정 항목).

## 공개 인터페이스

본 계약은 공개 인터페이스를 갖지 않는다 (게이트 범위 계약). 관측 표면은 (a) 게이트가 판정하는 모집단, (b) 그 게이트를 대리로 삼는 spec 의 선언 범위다.

## 동작

### (S-1) 게이트 ⊆ 소유 spec — 초과 강제 금지

게이트가 강제하는 제약은 소유 spec 이 선언한 계약의 **부분집합**이다. spec 이 §역할에서 명시 제외한 축을 게이트가 강제하지 않는다.

HEAD=`139cd78` 실측 위반 1건 — `src/__tests__/react-query-test-queryclient-single-source.test.ts:85`:

```js
const inFactory = /createQueryTestWrapper\s*=\s*\(\)[^{]*\{[\s\S]*?new\s+QueryClient/;
expect(inFactory.test(helper)).toBe(true);
```

정규식이 헬퍼 시그니처를 **빈 괄호로 못박는다**. `createQueryTestWrapper` 에 매개변수를 추가하면 이름·기본값과 무관하게 이 단언이 실패한다. 소유 blue spec `testing/react-query-test-queryclient-default-options-single-source-coherence` §역할은 그 제약을 선언하지 않으며, 오히려 의도적으로 하지 않는 것으로 **`(c) per-test 인스턴스 갯수 정책 (1 vs N)` 을 명시 제외**한다. 게이트가 재려던 불변식("모듈 스코프 싱글턴이 아니라 호출마다 생성")은 **매개변수 유무와 직교**하다.

> **비용은 이미 실현됐다.** TSK-20260825-18 이 `createQueryTestWrapper` 에 선택적 `defaultOptions` 오버라이드 인자를 추가하라고 지시했고, 문면대로 수행하면 이 게이트가 반드시 red 가 된다. 픽스처가 그 task 의 scope 밖이라 developer 는 `queryClient.setQueryDefaults` 로 우회했다 (`src/Log/hooks/log-detail-cache-key-identity.test.jsx:52`). **planner 가 지시한 확장 경로가 게이트에 의해 봉쇄돼 있으며, 같은 확장을 요구하는 후속 task 는 동일하게 막힌다.**

### (S-2) 패턴 게이트의 산문 면역

파일 전문을 훑는 패턴 게이트는 **주석·문자열 리터럴 안의 토큰을 위반으로 계수하지 않는다**. 최소한 행 선두 `//` · `*` 는 제외한다.

HEAD=`139cd78` 실측 — 같은 파일 `:40`:

```js
testFiles().filter(f => /new\s+QueryClient\s*\(/.test(readFileSync(join(ROOT, f), "utf8")));
```

제외 규칙이 없다. 따라서 **"이 패턴을 쓰지 말라" 는 금지를 코드 주석으로 설명하는 행위 자체**가 위반으로 계수된다. `EXEMPTIONS` 는 빈 배열이므로 상한이 0 이고, in-scope 테스트 파일의 주석 1줄이 곧 red 다.

TSK-20260825-18 에서 실제로 그렇게 계수됐다. 현 HEAD 에서 그 파일의 주석이 통과하는 이유는 규칙이 생겼기 때문이 아니라 **저자가 문장을 고쳐 토큰을 피했기 때문**이다 — 기전은 그대로 있다.

> **왜 이것이 (S-1) 과 같은 축인가.** 둘 다 "게이트가 spec 보다 넓게 잰다" 이며, 방향이 각각 시그니처 축과 산문 축일 뿐이다. 소유 spec 은 `QueryClient` 인스턴스화를 금지했지 **그 토큰의 언급**을 금지하지 않았다.

### (S-3) spec 판정 명령 = 부착 게이트 도출

spec §수용 기준의 판정 명령이 도출하는 모집단은 그 spec 에 부착된 게이트가 도출하는 모집단과 같다. **어느 한쪽이 좁으면 결함이다** — 넓은 쪽이 옳고 좁은 쪽이 사각이라는 뜻이 아니라, 갈린 상태 자체가 promote 판정을 불가능하게 만든다.

`testing/test-double-return-shape-fidelity` 축의 사례 — tick 222 판본의 spec 도출 정규식이 반환형 문자 클래스에 쉼표를 빠뜨려 `src/common/common.ts:47` `export function parseJwt (token: unknown): Record<string, unknown> | null` 이 조용히 탈락했다. spec 은 `sync-predicates=12`, 부착 게이트 `scripts/check-test-double-shape-fidelity.sh` 는 `predicates=13`.

두 수치가 갈린 상태에서 선택지는 둘뿐이었고 **둘 다 나쁘다**:

- spec 수치를 유지하려면 게이트가 spec 의 정규식 결함을 **재현**해야 하고, 그러면 `parseJwt` 는 영구 사각이 된다 (`vi.spyOn(common, 'parseJwt').mockResolvedValue(…)` 가 위반으로 계수되지 않는다).
- 게이트만 옳으면 spec 은 거짓 수치를 든 채 `RULE-07 §promote 조건 2` 의 전수 rc=0 재실행에서 어긋나 **승격 판정을 통과할 수 없다**.

**tick 223 Phase 1 이 spec 쪽을 13 으로 정정해 이 사례는 닫혔다.** 계약으로 남기는 것은 재발 방지다 — 같은 형태(문자 클래스·앵커·확장자 필터의 미세한 차이)는 도출 판정을 쓰는 어느 축에서도 발생한다.

### (S-4) 본문 실측 인용의 재현 가능성

spec 본문이 인용한 실측·전칭 단언은 현 HEAD 재실행과 일치한다. 재현되지 않는 단언은 삭제하거나 **참인 범위로 한정 수식**한다.

`testing/test-double-return-shape-fidelity` §동작 (T-3) 의 사례 — *"`Monitor.jsx:46` · `File.tsx:68` 의 비-admin 차단 경로는 어떤 테스트에서도 실행된 적이 없다"* 는 전칭이 `src/File/File.test.tsx:45` `vi.spyOn(common, "isAdmin").mockReturnValue(false)` (`df62c28` 이래 존속) 과 `src/Monitor/Monitor.test.jsx:88`+`:112` 의 정합한 동기 더블로 **거짓**이었다. **tick 223 Phase 1 이 조건부 명제로 축소해 닫혔다.**

> **이 부류가 파이프라인 어디에서도 붉어지지 않는다는 것이 핵심이다.** 게이트는 이 문장을 재지 않고, planner 는 실측 매핑으로 대체했으며, developer 는 task 만 본다. **측정 표면이 없는 문장은 spec 안에서 조용히 거짓이 된다.** 그래서 (S-4) 의 판정은 개별 문장 검사가 아니라 **Phase 1 재실행에서 본문 인용을 함께 대조한다**는 절차 계약이다 (§발화 채널).

### (S-5) 특이도의 명시적 지위

게이트 실효 검증은 **민감도(위반을 잡는다)와 특이도(정상을 잡지 않는다)를 각각 확인**한다. 한쪽만으로 충족하지 않는다.

`RULE-06 §게이트 실효 검증` 은 민감도만 요구한다. 그 비대칭이 (S-1)(S-2) 를 통과시켰으므로, 본 계약을 대리하는 게이트·픽스처는 **정상 상태를 붉게 만들지 않음의 증인**을 트리에 남긴다. 증인은 주석이나 문서가 아니라 **게이트가 실제로 훑는 위치의 산출물**이어야 한다 — 그렇지 않으면 증인 자신이 관측되지 않는다.

## 의존성

- 외부: `vitest` (게이트가 테스트로 구현돼 있다), Node `fs`.
- 내부: `src/test-utils/queryWrapper.tsx` (`createQueryTestWrapper`), `src/common/common.ts` (도출 진리원), `scripts/check-test-double-shape-fidelity.sh`.
- 소유 spec:
  - blue `testing/react-query-test-queryclient-default-options-single-source-coherence` — (S-1)(S-2) 의 소유 계약. **blue 이므로 편집 writer 가 없다** ((R-3)).
  - `testing/test-double-return-shape-fidelity` — (S-3)(S-4) 의 대상. tick 223 Phase 1 에서 양쪽 정정 완료.
- 인접 계약: `foundation/gate-failure-classification-and-evidence-parity`, `foundation/diagnostic-script-auto-channel-coverage`.

## 회귀 중점

- **(R-1) 불변식을 함께 지우는 오회복.** (S-1) 수리 시 `inFactory` 판정 자체를 삭제하면 모듈 스코프 싱글턴이 무검출이 된다. 좁히는 대상은 **시그니처 고정**이지 팩토리 내부 생성 판정이 아니다.
- **(R-2) 면제 목록으로의 도피.** (S-2) 를 `EXEMPTIONS` 에 파일을 추가해 해결하면 그 파일의 **실제 위반까지** 함께 면제된다. 수리 방향은 제외 규칙이지 면제 등재가 아니다.
- **(R-3) blue 편집으로의 도피.** (S-1) 을 "소유 spec 에 FR 을 추가해 게이트를 정당화" 하는 방향으로 풀 수 없다 — blue 에 create/edit writer 가 없어 `RULE-01` 상 실행 불가다. 수리는 **게이트를 spec 문면으로 좁히는 방향으로만** 가능하다.
- **(R-4) 특이도 증인의 소멸.** (S-2) 를 고쳐도 증인이 트리에 없으면 다음 수정자가 제외 규칙을 지우고 정상 트리에서 초록을 얻는다. 증인은 **게이트가 훑는 위치**에 있어야 한다 — 게이트 파일 자신의 주석은 스캔 대상 밖(`src/__tests__/**` 제외)이라 증인이 되지 못한다.
- **(R-5) 도출 대조를 리터럴로 박는 회귀.** (S-3) 을 "게이트 산출이 `13` 이다" 로 판정하면 `common.ts` 에 함수가 추가될 때 정상 변경이 붉어진다. 대조는 **양쪽 도출의 일치**여야 하며 어느 쪽도 상수가 아니다.
- **(R-6) (S-4) 를 문장 grep 으로 대리하는 회귀.** "어떤 테스트에서도" 같은 특정 문구를 금지 토큰으로 두면 표현만 바꾼 거짓 전칭이 통과한다. (S-4) 의 대리는 문구 금지가 아니라 **재실행 대조 절차**다.

## 발화 채널

**HEAD=`139cd78` 에 (S-1)(S-2) 의 발화 채널이 없다** — 두 결함은 게이트 **자신** 안에 있고, 그 게이트는 현 상태에서 rc=0 이다.

| 게이트 | HEAD=`139cd78` 채널 | 상태 |
|---|---|---|
| S-1 (초과 강제 금지) | 없음 — 정적 판정은 §수용 기준 | **부착 필요** (게이트 수정 task) |
| S-2 (산문 면역) | 없음 — 특이도 증인 0건 | **부착 필요** |
| S-3 (도출 일치) | `scripts/check-test-double-shape-fidelity.sh` 산출 `predicates=` ↔ 진리원 도출 대조 (§수용 기준) | **부착 완료** (대조 명령) |
| S-4 (본문 인용 재현) | inspector Phase 1 절차 — 게이트 재실행 시 본문 인용 대조 | 절차 계약 |
| S-5 (특이도 지위) | 없음 — `RULE-06` 이 요구하지 않는다 | 계약 서술 + (S-2) 증인 |

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다.

> **관측 표면 주의** (`RULE-06 §관측 표면`) — (S-2) 의 판정은 "게이트 소스에 주석 제외 규칙이 있는가" 가 아니라 **주석에 금지 토큰을 담은 in-scope 파일이 실재하는 상태에서 게이트가 rc=0 인가** 다. 소스 grep 은 제외 규칙을 흉내 낸 죽은 코드로 통과한다. 증인 기반 판정은 규칙이 **작동함**을 재며, 동시에 (R-4) 의 증인 소멸도 막는다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** 아래는 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니며, 검출 방향을 보존한 채 **게이트 수정 task 의 `## 검증/DoD`** 로 이관한다. `RULE-04` notes 에 `injection: 4/4 detect` 박제. **이관처 task 가 발행되기 전까지 귀속처는 이 절의 명시적 지시다** (이관처 없는 강등 금지).

- (Dir-A1) **특이도** — `createQueryTestWrapper` 에 매개변수 1개를 추가 → 게이트 `rc=0` (정상 통과) → 원복.
- (Dir-A2) **민감도** — 헬퍼를 모듈 스코프 단일 인스턴스로 변경 → 게이트 `rc≠0` → 원복 → `rc=0`.
- (Dir-B1) **특이도** — in-scope 테스트 파일 주석에 `new QueryClient(` 문자열 삽입 → 게이트 `rc=0` → 원복.
- (Dir-B2) **민감도** — 같은 파일 **본문**에 실제 `new QueryClient(` 호출 삽입 → 게이트 `rc≠0` → 원복 → `rc=0`.

> 네 방향이 **특이도 2 · 민감도 2 로 짝지어진 것**이 이 축의 요점이다 (§동작 (S-5)). (Dir-A2)(Dir-B2) 만 수행하면 현 HEAD 게이트가 그대로 통과하며, 그것이 이 결함이 여기까지 온 경로다.

## 테스트 현황

- [x] 단일 출처 게이트 실재 + 공허 가드 — `src/__tests__/react-query-test-queryclient-single-source.test.ts:40`(스캔) · `:52`(파일 수 > 20 단언).
- [x] 더블 형상 게이트 실재 + `predicates=` 산출 — `scripts/check-test-double-shape-fidelity.sh`.
- [ ] 시그니처 고정 제거 — HEAD=`5b2ed3b` (tick 225 재실행) **1 hit** (`:85` 빈 괄호 리터럴, `grep -cF`). (S-1) 의 부착 대상. 델타 무관 영역이라 tick 224 와 동일.
- [ ] 산문 면역의 특이도 증인 — HEAD=`5b2ed3b` (tick 225 재실행) `witness=0`. (S-2)(R-4) 의 부착 대상.
- [x] 도출 대조 — tick 223 실측 게이트 `predicates=13` = 진리원 도출 13. (S-3).

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 측정 명령은 `src/**` · `scripts/**` · `package.json` 만 참조한다 — **spec 파일 경로는 어느 것도 참조하지 않는다** (RULE-07 §promote 조건 2; green/blue 는 승격으로 경로가 바뀐다). **HEAD=`139cd78` 기준 2/4.**

- [ ] (Must, S-1) 시그니처 고정 제거 + 불변식 보존 — `bash -c 'test "$(grep -cF "createQueryTestWrapper\s*=\s*\(\)" src/__tests__/react-query-test-queryclient-single-source.test.ts)" -eq 0 && test "$(grep -cE "inFactory" src/__tests__/react-query-test-queryclient-single-source.test.ts)" -ge 1'` → **rc=0**. **HEAD=`139cd78` 실측 rc=1 / 빈 괄호 리터럴 1 hit (`:85`) → 미충족.** **`grep -F` 여야 한다** — 파일에 담긴 것은 정규식 **리터럴 텍스트**라 `-E` 로 해석하면 `\s*` 가 메타로 풀려 HEAD 에서도 **0 hit** 이 나오고 false negative 가 된다 (실측: `-F` → 1, `-E` → 0). 두 번째 조건은 (R-1) 대응 — 시그니처 고정만 지우고 팩토리 내부 생성 판정은 남긴다.
- [ ] (Must, S-2) 산문 면역의 특이도 증인 — 게이트가 훑는 in-scope 테스트 파일 중 **주석에 금지 토큰을 담은 파일이 ≥1 실재**하고, 그 상태에서 게이트가 rc=0 이다. 판정:
  ```
  bash -c 'w=$(grep -rlE "^[[:space:]]*(//|\*).*new QueryClient\(" src --include="*.test.js" --include="*.test.jsx" --include="*.test.ts" --include="*.test.tsx" | grep -v "^src/__tests__/"); [ -n "$w" ] || { echo "witness=0" >&2; exit 1; }; echo "witness=$(echo "$w" | wc -l | tr -d " ")"; npx vitest run src/__tests__/react-query-test-queryclient-single-source.test.ts >/dev/null 2>&1'
  ```
  → **rc=0**. **HEAD=`139cd78` 실측 rc=1 / `witness=0` → 미충족.** **게이트 소스에서 제외 규칙을 grep 하지 않는 이유**는 §발화 채널 §관측 표면 주의 참조 — 죽은 코드가 통과한다. `src/__tests__/` 를 증인 후보에서 빼는 이유는 게이트 자신이 그 디렉터리를 스캔 대상에서 제외하기 때문이다(`:36` FR-09) — 거기 둔 주석은 증인이 되지 못한다 ((R-4)). 증인은 인위적 산물이 아니라 **자연스러운 서술의 복원**이다: `src/Log/hooks/log-detail-cache-key-identity.test.jsx` 의 제약 설명 주석이 토큰을 피해 우회 표현으로 쓰여 있다.
- [x] (Must, S-3) 도출 일치 — 부착 게이트 산출과 진리원 도출이 같다. 판정:
  ```
  bash -c 'total=$(grep -cE "^export function " src/common/common.ts); async=$(grep -cE "^export function [A-Za-z0-9_]+[^{]*:[[:space:]]*Promise" src/common/common.ts); test "$total" -gt 0 || exit 2; g=$(npm run --silent check:test-double-shape 2>&1 | sed -nE "s/.*predicates=([0-9]+).*/\1/p" | head -1); [ -n "$g" ] || exit 2; echo "truth=$((total-async)) gate=$g"; test "$g" -eq "$((total-async))"'
  ```
  → **rc=0**. **HEAD=`139cd78` 실측 rc=0 / `truth=13 gate=13` → 충족** (tick 223 Phase 1 이 spec 도출 정규식의 쉼표 누락을 정정한 결과). **양쪽 도출을 대조할 뿐 어느 쪽도 상수로 박지 않는다** ((R-5)) — `common.ts` 에 동기 export 가 추가되면 두 값이 함께 오른다. **공허 가드 내장** — 진리원 도출이 0 이거나 게이트가 `predicates=` 를 내지 않으면 `exit 2`.
- [x] (Must, NFR-01) 불변식 보존 — 좁히기 전후로 단일 출처 게이트가 통과한다: `bash -c 'npx vitest run src/__tests__/react-query-test-queryclient-single-source.test.ts >/dev/null 2>&1'` → rc=0. **HEAD=`139cd78` 실측 rc=0 → 충족.** 이 항목은 (S-1)(S-2) 와 **함께** `[x]` 일 때만 판정력을 갖는 **동반 조건**이다 — 단독으로는 "아직 아무것도 안 고쳤다" 도 통과시킨다. 명시해 두지 않으면 이 초록이 수리 완료로 오독된다.

## 참고

- **REQ 원문**: `20.req/20260825-spec-claim-measurement-surface-agreement.md` (REQ-20260825-021, slug 식별).
- 소비한 followup: `20260825-1745-queryclient-single-source-gate-overspecifies-helper-signature`, `20260825-1754-test-double-shape-spec-t3-universal-claim-false`, `20260825-1832-spec-sync-predicate-derivation-misses-comma-return-types`.
- 소유 blue spec: `30.spec/blue/testing/react-query-test-queryclient-default-options-single-source-coherence.md` §역할 명시 제외 (c).
- 게이트 원문: `src/__tests__/react-query-test-queryclient-single-source.test.ts:40`(산문 계수) · `:85`(시그니처 고정), `scripts/check-test-double-shape-fidelity.sh`.
- 규약: `RULE-06 §정밀 패턴 권고`(주석 제외 계산법 명시) · `RULE-06 §게이트 실효 검증`(민감도만 요구) · `RULE-07 §promote 조건 2`.

### 미측정·비판정 항목

- **(미측정) 저장소 전체의 초과 강제 지점 총수.** 확정 2건(§동작 (S-1)(S-2), 같은 파일)의 수리와 계약 수립이 범위이며 전수 감사는 별 축이다. 전수 판정에는 "게이트 ↔ 소유 spec" 대응 관계가 기계 판독 가능해야 하는데 현재 그 매핑이 저장소에 없다.
- **(가정 주입 요구 — 이관) 게이트의 민감도·특이도.** (Dir-A1)~(Dir-B2) 로 게이트 수정 task DoD 에 이관했다 (§발화 채널). 이관처 task 가 발행되기 전까지 귀속처는 그 절의 명시적 지시다.
- **(관측 — 미판정) `RULE-06 §게이트 실효 검증` 의 단방향성.** 규약 개정은 `rules/` writer(운영자) 영역이라 spec 이 판정 대상으로 삼을 수 없다. 본 계약은 그 비대칭을 **spec 층에서 보상**할 뿐이며, 규약이 특이도를 요구하게 되면 (S-5) 는 중복이 된다.
- **(별 축) 게이트 배선·출력 판독.** REQ-20260825-010 · REQ-20260825-012 가 각각 다룬다.
- **(관측 — 미판정) task 의 `## 스코프 규칙` 이 grep 으로 인접 축 비회귀를 대리하는 관행.** TSK-20260825-18 에서 grep 2건을 전부 통과한 판본이 `npm test` 에서 red 였다. planner 작성 관행에 대한 관측이며 본 계약의 판정 대상이 아니다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-021 (inspector tick 223) | 최초 등록. followup 3건을 흡수한 req 를 불변식으로 반영. **req 수용 기준 11항을 그대로 쓰지 않았다**: (a) FR-05·FR-06 의 5항이 전부 slug `testing/test-double-return-shape-fidelity` 의 **green 경로를 문자열로 직접 참조**한다 — `RULE-07 §promote 조건 2` 는 승격으로 경로가 바뀌는 명령을 금지하며, 대상 spec 이 tick 223 에 promote 후보가 됐으므로 그 명령들은 곧 전부 깨진다. 다섯 항의 실체(도출 12→13 · 전칭 단언 철회)는 **tick 223 Phase 1 이 이미 정정 완료**했고, 재발 방지 계약만 (S-3)(S-4) 로 남기되 판정은 **경로 무관한 도출 대조**로 교체했다. (b) FR-04 의 "stdout `predicates=` 값이 spec 박제 값과 같다" 는 spec 파일을 읽어야 성립하므로 **진리원(`common.ts`) 도출 ↔ 게이트 산출** 대조로 환원했다 — 상수 고정을 피하는 부수 효과도 얻는다 ((R-5)). (c) FR-03 의 "행 선두 `*`·`//` 제외" 는 **게이트 소스 grep** 으로 판정되기 쉬운 형태라 **특이도 증인** 판정으로 교체했다 — 죽은 제외 코드가 소스 grep 을 통과하는 것이 이 축이 겨눈 병리 그 자체다. (d) `npm test` · `check:spec-coherence` · `check:acceptance-criteria` 3항은 **중복 게이트 부류**(위반 시 husky·CI 즉시 실패)라 체크박스로 두지 않았다. (e) NFR-01 항목은 단독 판정력이 없으므로 **동반 조건**임을 명시했다. **신규 추가 (req 에 없던 항목)**: (S-5) 특이도의 명시적 지위 — `RULE-06` 이 특이도를 요구하지 않는다는 비대칭을 spec 층에서 보상한다, (R-4) 증인 소멸 회귀 + 증인이 `src/__tests__/**` 에 있으면 게이트 스캔 밖이라 무효라는 실측 근거, (R-6) (S-4) 를 문구 금지 grep 으로 대리하는 회귀 — 표현만 바꾼 거짓 전칭이 통과한다. | all |
