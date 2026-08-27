# 발화 관측기 판정은 이름 열거가 아니라 술어로 결정된다

> **위치**: `src/__tests__/post-unmount-emission-audit.test.ts` 의 `CONSOLE_SPY_METHODS` (`:119`) 와 그 소비 지점 `:410` · `:503`, 그리고 단락 지점 `filteredEmissionZeroAssertions` (`:615`).
> **관련 요구사항**: REQ-20260825-018
> **최종 업데이트**: 2026-08-27 (by inspector — 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`399c1d4`).

## 역할

post-unmount 발화 감사 게이트가 **"무엇이 발화 관측기(spy)인가"** 를 정할 때, 그 판정은 메서드 이름의 하드코딩 열거가 아니라 술어로 결정되며, 판정 대상 집합이 조용히 비는 상태를 통과로 읽지 않는다.

이 축은 게이트의 **상류**다. `filteredEmissionZeroAssertions` 는 관측기로 인식된 이름이 0 이면 즉시 빈 배열을 반환하므로(`:615`), 이 판정의 false-negative 는 그 파일의 좁힘·어휘·기록·위상 판정(축 1~4)을 **한 건도 수행하지 않은 채** 초록으로 만든다. 축 1~4 를 전부 deny-by-default 로 뒤집어도 이 문 하나가 열리면 전부 우회된다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 `§역할` 이 요구하는 대로 **방어 대상을 명시한다**:

> **게이트 판정 대상 집합의 조용한 축소** — 목록 밖 이름의 발화 관측기(`vi.spyOn(customLogger, "emit")` · `vi.spyOn(telemetry, "capture")`)가 도입되어 그 파일이 통째로 판정 밖으로 빠지는 사건.

이 사건은 현행 채널 어디에서도 붉어지지 않는다 — `npm test` · `tsc` · `eslint` · `check:*` 26종 어느 것도 "이 게이트가 몇 개의 파일·관측기를 실제로 판정했는가" 를 묻지 않는다. 대상 집합이 0 으로 줄어도 게이트는 `rc=0` 이고, 그 상태는 "위반 없음" 과 **관측적으로 동일**하다. 소스 주석 `:604` 가 이 열거를 "남은 열거 1건" 으로 자백해 둔 상태다.

이 계약이 의도적으로 하지 않는 것:

- (i) **판정 수단을 특정하지 않는다.** 술어 재정의 · AST 파싱 · 관측기 등록 규약 중 무엇이든 무방하다 (REQ §Out-of-Scope — planner·developer 영역). 계약이 고정하는 것은 **방향(deny)** 과 **대상 집합의 관측 가능성**이다.
- (ii) **축 1~4 의 잔여 false-negative 를 다루지 않는다.** 그 축들은 `specs/30.spec/blue/testing/runtime-fetch-unmount-safety.md` 의 (I9)(I10) 소관이다.
- (iii) **가드 분해능을 다루지 않는다.** `testing/post-await-guard-individual-observability` 는 같은 판정 표면 위에 서지만 대상이 **src 컴포넌트의 post-await 가드 수 대비 fixture 관측 지점 수** 이며, 그 spec §역할 (iii) 이 발화 종류 분류를 "입력으로 쓴다" 고 선언한다. 본 계약은 **그 입력을 만드는 술어** 를 규정한다 — 층이 다르다.
- (iv) **`RECORD_ACCESS_ALLOWLIST` 공집합 죽은 분기 정리**(followup `20260825-1015`) 와 `scripts/check-monitor-state-immutability.sh` 로의 별칭 추적 이식(followup `20260825-1105`) 은 모집단 밖이다.

## 공개 인터페이스

본 계약은 공개 인터페이스를 갖지 않는다 (게이트 판정 술어 계약). 관측 표면은 셋이다.

- **(Q-A) 관측기 판정 술어** — 어떤 `vi.spyOn(owner, method)` 호출이 발화 관측기인지를 정하는 판정. 소유자 이름·메서드 이름의 리터럴 집합에 의존하지 않는다.
- **(Q-B) 단락 신호** — (Q-A) 가 어떤 파일에서 관측기를 0 개로 도출했을 때 그 사실이 통과와 구별되어 발화되는 채널.
- **(Q-C) 대상 집합 하한** — 게이트가 실제로 판정한 관측기 보유 파일 수. 하드코딩 상수가 아니라 동적 산출값과 대조된다.

## 동작

### FR-01 — 관측기 판정은 deny-by-default 다 (Must)

(Q-A) 는 소유자·메서드 이름의 하드코딩 열거에 의존하지 않는다. 허용 목록을 두더라도 기본 방향은 deny 이며 목록은 예외에만 쓰인다 (축 1~4 와 동일 방향). 현 HEAD 의 `CONSOLE_SPY_METHODS` 는 이 방향의 반대다.

### FR-02 — 관측기 0 도출은 초록과 구별된다 (Must)

(Q-A) 가 어떤 파일에서 관측기를 0 개로 도출해 그 파일의 축 1~4 판정이 단락되면, 그 사실은 **통과와 구별되는 신호**를 낸다. 현 HEAD 의 `:615` 는 조용히 `[]` 를 반환한다 — "관측기가 없다" 와 "관측기를 볼 수 없다" 가 관측적으로 동일하다.

### FR-03 — 대상 집합의 하한이 동적으로 고정된다 (Must)

게이트가 실제로 판정한 관측기 보유 파일 수 (Q-C) 의 하한이 고정되어, 대상 집합이 조용히 축소되면 `rc≠0` 이 된다. 하한은 하드코딩 열거가 아니라 **동적 산출과 대조**된다 (`RULE-06 §열거 고정 금지`).

### FR-04 — 축 5 전환은 축 1~4 를 퇴행시키지 않는다 (Must)

전환 전후로 축 1~4 의 기존 위반 검출이 보존된다. 판정 표면의 양성·음성 fixture 전수가 전환 후에도 같은 방향으로 판정된다.

### 발화 채널 (RULE-07 §promote 조건 4)

본 계약의 Must 판정은 판정 표면 `src/__tests__/post-unmount-emission-audit.test.ts` 자체가 vitest 수집 대상이라는 사실로 발화한다. 실경로는 `.github/workflows/ci.yml` 의 `run: npm test` (`:84`) 이며 현 HEAD 에서 실재한다. 별도 `check:*` 키를 신설하지 않는다 — 판정이 이미 테스트 파일 내부에 있기 때문이다.

## 의존성

- 내부: `src/__tests__/post-unmount-emission-audit.test.ts` (판정 표면) · `src/common/common.ts` (`log`) · `src/common/errorReporter.ts` (`reportError`) — 후자 둘은 현행 열거가 겨눈 발화 지점의 예시이며 판정 대상 목록이 아니다.
- 외부: `vitest`.
- 역의존 (사용처): `testing/post-await-guard-individual-observability` (본 계약의 판정 결과를 입력으로 소비) · `specs/30.spec/blue/testing/runtime-fetch-unmount-safety.md` (축 1~4 가 본 술어의 하류).

## 테스트 현황

- [x] (특이도 대조군) 판정 술어 도출 seam 이 실재하며 공허하지 않다 — `bash -c 'f=src/__tests__/post-unmount-emission-audit.test.ts; test -s "$f" || exit 2; n=$(grep -cE "emissionSpyNames|filteredEmissionZeroAssertions" "$f"); echo "$n"; [ "$n" -ge 1 ]'` → 현 HEAD 출력 `31` / rc=0 (**실측 2026-08-28: `35` / rc=0** — 술어 전환으로 seam 증가, 하한 단언이라 판정 불변). 이 대조군이 통과한다는 사실이 아래 수용 기준의 미충족이 **표면 부재가 아니라 실제 축 미전환**임을 보인다.
- [x] 축 1~4 의 deny 전환 (TSK-20260825-09 · TSK-20260825-13) — `specs/30.spec/blue/testing/runtime-fetch-unmount-safety.md` (I9)(I10) 이 판정.

## 수용 기준

- [x] (Must · FR-01) 관측기 판정에 메서드 이름 리터럴 집합이 0 건이다 — `bash -c 'f=src/__tests__/post-unmount-emission-audit.test.ts; test -s "$f" || exit 2; n=$(grep -cE "SPY_METHODS|new Set\(\[.(log|error|warn|info|reportError)." "$f"); echo "$n"; [ "$n" = 0 ]'` → **실측 2026-08-28 (HEAD `dac5a60`): 출력 `0` / rc=0 → 충족** (`7423ef7` = TSK-20260827-10-b 가 이름 열거를 술어로 전환). 첫 필드는 열거 잔존 라인 수다. 비어있음 가드(`-s`)는 판정 표면이 사라져 모집단이 비는 상태를 통과가 아니라 무판정(`exit 2`)으로 끝낸다.
- [x] (Must · FR-02) 관측기 0 도출의 무신호 단락이 0 건이다 — `bash -c 'f=src/__tests__/post-unmount-emission-audit.test.ts; test -s "$f" || exit 2; n=$(grep -cE "spies\.size === 0\) return \[\];" "$f"); echo "$n"; [ "$n" = 0 ]'` → **실측 2026-08-28 (HEAD `dac5a60`): 출력 `0` / rc=0 → 충족** (`a1c2972` = TSK-20260827-10-a 가 `auditEmissionZeroAssertions` 로 단락을 신호화). 과거 `:615` 의 조용한 `[]` 반환이 그 1 건이었다.
- [x] (Must · FR-03) 판정 출력이 관측기 보유 파일 수를 낸다 — `bash -c 'f=src/__tests__/post-unmount-emission-audit.test.ts; test -s "$f" || exit 2; o=$(npx vitest run "$f" 2>&1); n=$(printf "%s" "$o" | grep -cE "관측기 보유 파일[[:space:]]*[:=][[:space:]]*[0-9]+|spy-bearing[[:space:]]*[:=][[:space:]]*[0-9]+"); echo "$n"; [ "$n" -ge 1 ]'` → **실측 2026-08-28 (HEAD `dac5a60`): 출력 `1` / rc=0 → 충족** (`[G-F] spy-bearing: 24 / short-circuit: 48 / judged: 72 / enumerated: 73`). 대상 수가 출력에 나타나지 않으면 (Q-C) 의 하한은 관측할 채널이 없다.
- [x] (Must · FR-04) 판정 표면 전수가 통과한다 — `npx vitest run src/__tests__/post-unmount-emission-audit.test.ts` → 현 HEAD rc=0 (1 file / 8 tests, 749ms). 전환 후에도 이 값이 보존되어야 한다. **실측 2026-08-28 (HEAD `dac5a60`): rc=0 (1 file / 10 tests) → 보존** (테스트 수는 G-G 신설분 증가이며 계약이 고정하는 값이 아니다).

## 참고

### 비-중복 근거 (인접 spec 열거)

- `testing/post-await-guard-individual-observability` — 같은 판정 표면이나 대상이 **가드 분해능** ((P-A)(P-B)(P-C)) 이고, 그 §역할 (iii) 이 발화 종류 분류를 "입력으로 쓴다" 고 명시해 본 축을 자기 모집단 밖으로 선언한다. 본 계약이 그 입력의 생산자다.
- `specs/30.spec/blue/testing/runtime-fetch-unmount-safety.md` — 축 1~4 ((I8)(I9)(I10)) 와 audit **대상 파일 집합**(프로덕션 파일 술어)을 규정한다. 본 계약은 그 대상 파일 안에서 **어떤 spy 가 관측기인지** 를 규정하며 층이 다르다. 그 spec 의 사각 표 (B4)(B5) 에 축 5 는 등재돼 있지 않다.
- `foundation/gate-output-parsing-color-independent-fail-closed` — 모집단이 `package.json scripts.check:*` → `scripts/*.sh` 이며 그 §역할 (iii) 이 "파일 텍스트만 스캔하는 게이트" 를 모집단 밖으로 둔다. 본 계약의 판정 표면은 vitest 테스트 파일이라 그 모집단 밖이다.
- 실측: `grep -rln "CONSOLE_SPY_METHODS|emissionSpyNames|발화 관측기" specs/30.spec/` → **0 hit** (등록 직전). 어떤 spec 도 본 축을 덮지 않았다.
- 표기: 위 인접 spec 중 미승격(green) 항목은 lifecycle 경로(`30.spec/{blue,green}/…`) 가 아니라 **slug** 로 지칭한다 — 승격으로 경로가 바뀌어도 참조가 끊기지 않아야 하기 때문이다 (RULE-01 §파일 이름: spec 은 디렉터리 경로로 식별).

### 미측정·비판정 항목

- **`npm test` 전수 rc=0.** REQ §수용 기준 4항이 요구하나 전수 실행은 본 spec 이 신설하는 표면이 아니며 기존 CI 채널(`.github/workflows/ci.yml:84`) 의 소관이다. 시점 의존 스냅샷(74 파일 / 704 테스트)을 체크박스로 두지 않는다.
- **AST 기반 판정 전환 시의 파서 의존성 비용과 실행 시간 증가폭.** 측정 채널이 없고 수단 선택은 planner 영역이다 (REQ §미측정·비판정 항목).
- **여섯 번째 사각의 존재 여부.** 앞선 네 축 전환이 모두 다음 사각을 드러냈으나 전환 전에는 식별할 수 없다 — 판정 대상이 아니다.
- **NFR-02 (민감도).** 목록 밖 이름의 관측기를 쓰면서 축 1~4 중 하나를 위반하는 픽스처가 `rc≠0` 으로 검출되는지는 가정 주입을 요구하므로 체크박스가 아니다. 검출 방향은 아래 §게이트 실효 검증 이관 절이 보존한다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)

FR-01·FR-02·FR-03 을 재는 게이트 **수정** task 는 아래 방향을 각각 주입해 `rc≠0` 을 확인하고 원복 후 `rc=0` 을 확인한다.

- (방향 1) 목록 밖 이름 관측기(`vi.spyOn(customLogger, "emit")`) + 축 1 위반 픽스처 주입 → `rc≠0` (FR-01).
- (방향 2) 관측기 0 인 파일을 주입해 (Q-B) 의 신호가 발화하는지 확인 → `rc≠0` (FR-02).
- (방향 3) 대상 수 하한을 1 낮춰 (Q-C) 대조가 발화하는지 확인 → `rc≠0` (FR-03).
- (특이도 C-1) 원복 트리 → `rc=0`.

`RULE-04` notes 에 `injection: 3/3 detect` 박제. **이관처 task 가 발행되지 않은 상태에서 본 절을 삭제하지 않는다** — 이관처 없는 강등은 RULE-07 이 금지한다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-27 | inspector / REQ-20260825-018 | 최초 등록 — 발화 관측기 판정 술어(축 5) deny-by-default 계약 흡수. (S4) TTL 10/14 결론: 인접 green `post-await-guard-individual-observability` 와 **축 중복 아님** (그 spec §역할 (iii) 이 본 축을 입력으로 선언), spec 전수 `CONSOLE_SPY_METHODS` grep 0 hit → 흡수 | all |
| 2026-08-28 | TSK-20260827-10-a / `a1c2972` · TSK-20260827-10-b / `7423ef7` | Phase 1 reconcile — FR-01 `4`→`0` rc=0 · FR-02 `1`→`0` rc=0 · FR-03 `0`→`1` rc=0 실측 후 3건 `[x]` 플립. FR-04 rc=0 보존, 특이도 대조군 `35` rc=0. 두 커밋 `merge-base --is-ancestor` HEAD 확인 | 수용 기준, 테스트 현황 |
