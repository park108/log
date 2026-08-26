# spec 문서가 주장하는 실재는 실재한다 (참조 경로 · 표기 규약 · 인용 설정값)

> **위치**: 횡단 문서 계약. 측정 대상은 `specs/30.spec/**` 전체. 판정 채널 `scripts/check-spec-coherence.sh` (`package.json` `scripts.check:spec-coherence`) 는 **`SPEC_ROOT=specs/30.spec` 스코프를 보유한다** (TSK-20260825-08 / `f2bd538`). green 은 hard-fail, blue 는 ADVISORY 계수 — blue 에 편집 writer 가 없다는 `RULE-01` 성질 때문이다.
> **관련 요구사항**: REQ-20260825-005 (spec-reference-coherence)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 222 Phase 1 reconcile @ HEAD=`ff699f9`. **세 명령 전수 재실행 — 수치 불변** (부재 14 · suffix 11 · 인용 2, **전량 blue**). green 스코프는 세 축 모두 **0** 이다. 플립 없음: 잔여는 `30.spec/blue/**` 에 create/edit writer 가 없어 파이프라인 안에서 닫히지 않는다 (RULE-01 쓰기 권한 매트릭스). tick 221 대비 delta 0)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.
> 본 spec 은 자기 계약의 첫 준수 대상이다 — 아래 cross-ref 는 전부 **slug 식별**이며 전체 경로를 쓰지 않는다.

## 역할

`specs/30.spec/**` 문서가 **저장소 상태에 대해 하는 주장은 참**이어야 한다. 참조한 경로는 디스크에 실재하고, 표기는 `RULE-01 §파일 이름` 을 지키며, 본문이 인용한 설정값은 설정 파일의 현재 값과 일치한다.

**방어 대상 (RULE-07 §주제 우선순위 2 — 명시 의무).** 본 계약이 방어하는 것은 추상적 "문서 정합성" 이 아니라 **기존 자동 게이트가 구조적으로 볼 수 없는 두 종류의 silent regression** 이다.

1. **끊어진 spec→spec 참조.** 참조하는 쪽 문서가 **존재하지 않는 계약을 근거로 인용**하는 상태가 된다. 그 인용은 판단의 근거로 계속 읽히지만 대조할 원본이 없다. 오염은 소리 없이 축적되고, 축적 속도는 승격 빈도에 비례한다.
2. **어긋난 인용 설정값.** spec 이 실행되지 않는 측정 경로를 전제로 인과 모형과 baseline 수치를 서술하면, 그 spec 이 내리는 **충족/미충족 결론 자체가 뒤집힌다.** 인과 모형이 틀리면 대응 수단 선정도 틀린다 — "sampling 무작위" 라면 margin 흡수 외에 길이 없지만 "순서 종속" 이라면 완치 가능하다.

**어떤 자동 채널도 이 둘을 신고하지 않는다.** `check-spec-coherence` 의 G1·G2 는 `specs/30.spec/...` 라는 **패턴**을 찾지만 **`src` 안에서만** 찾는다 (`:29` `grep -rnE '...' src`, `:41` `grep -rhoE '...' src`). spec 이 spec 을 참조하는 축 — 오염이 실제로 사는 바로 그 축 — 은 스캔 루트 밖이다. `package.json` 의 `check:*` 14종 어디에도 이 부류를 보는 항목이 없다.

**구조적 사각지대가 이것을 악화시킨다.** `RULE-01` writer 매트릭스상 **blue 는 create/edit writer 가 없다** (inspector 는 green 만, planner 는 mv only, developer 는 `src/`·`10.followups/` 만). 승격된 계약이 실재와 어긋나면 자가 교정 경로가 없고, 유일한 흐름은 `10.followups/` → discovery → `20.req/` → inspector 의 새 green 판본이다. 검출조차 없으면 그 흐름은 **시작되지 않는다.**

의도적으로 하지 않는 것: (i) 특정 문서의 문안 교정 지시 — 불변식만 선언한다, (ii) `docs/**` · `README.md` 등 spec 외 문서, (iii) 자연어 서술의 의미적 정확성 일반 — 기계 판정 가능한 참조·토큰 축 한정, (iv) 체크박스 `[x]`/`[ ]` 상태 자체 — `check:acceptance-criteria` 소관이며 중복 게이트를 만들지 않는다, (v) 오염된 blue 문서의 재anchor 수치 산출 — 그 수치는 본 계약의 판정 대상이 아니다.

## 공개 인터페이스

없음 (횡단 문서 계약). 측정 채널:

- **(M-A) 참조 실재** — `specs/30.spec/**` 에서 추출한 `specs/30.spec/{blue,green}/**.md` 경로 전수에 `test -e`.
- **(M-B) 표기 규약** — 같은 스코프에서 `-spec.md` suffix 참조 0 line (`RULE-01 §파일 이름`).
- **(M-C) 인용 설정값 일치** — spec 본문이 인용한 설정 토큰이 설정 파일의 현재 값과 일치. 현 최소 사례는 `vite.config.js:81` `coverage.provider`.
- **(M-D) 채널 등재** — (M-A)(M-B) 가 `package.json scripts.check:*` / `.husky/*` / `ci.yml` step / vitest 수집 경로 중 1+ 에서 발화하며, **스캔 루트가 `specs/30.spec` 을 포함**한다.

## 동작

1. **(G-1) 참조 경로의 디스크 실재** — `specs/30.spec/**` 가 참조하는 spec 경로는 전부 실재한다.
   - **현 HEAD(`c2acdcc`) 실측: 위반 — distinct 57 중 부재 14** (참조 출현 208 line). 부재 목록에는 두 부류가 섞여 있다.
     - (i) `-spec` suffix 금지 위반 표기 — `search-abort-runtime-smoke-spec.md`, `accessibility-spec.md`, `env-spec.md`, `error-boundary-spec.md`, `markdownParser-spec.md`, `sanitizeHtml-spec.md`, `css-modules-spec.md`.
     - (ii) 승격·개명·삭제로 경로가 이동했는데 참조가 따라가지 않은 것 — `test-discovery-population-coherence.md`, `build-artifact-gate-measurement-contract.md`, `html-lang-locale-declaration-contract.md`, `src-typescript-migration.md`, `tsconfig-test-ambient-globals.md`, `viewport-meta-mobile-rendering-contract.md`, 그리고 `green/foundation/coverage-per-file-attribution-monotonicity.md`.
   - **마지막 항목은 본 tick 중에 생겨났다.** planner 가 `coverage-per-file-attribution-monotonicity` 를 blue 로 승격하자(`f014ddf`) 그 green 경로를 가리키던 참조가 즉시 끊겼다. 현재 `runtime-fetch-unmount-safety` 의 blue 판본이 그 stale 참조를 보유한다. **승격은 이 오염의 정상적·반복적 생산 경로다** — 사고가 아니라 구조다.
   - 오염 속도의 함의: 승격 1회가 그 spec 을 가리키는 참조 전부를 끊는다. 참조가 208 line 인 트리에서 이것은 시간에 비례해 누적된다.
2. **(G-2) 표기 규약 준수** — spec 참조 표기에 `-spec.md` suffix 가 나타나지 않는다.
   - **현 HEAD 실측: 위반 11 line.** `RULE-01 §파일 이름` 은 `-spec` suffix 를 금지하고 디렉터리 경로로 식별하도록 규정한다. 같은 규칙을 `src/**` 안에서는 `check-spec-coherence` G1 이 강제하지만 `specs/**` 안에서는 아무도 강제하지 않는다 — **같은 규약이 스코프에 따라 집행되기도 하고 안 되기도 한다.**
3. **(G-3) 인용 설정값의 일치** — spec 본문이 인용하는 설정 토큰은 설정 파일의 현재 값과 일치한다.
   - **HEAD=`139cd78` (tick 223 재실행) 실측: 위반 2 line.** `vite.config.js` 의 `coverage.provider` 현재 값은 `istanbul` 인데, blue 2 파일이 종전 provider 토큰을 현재 값으로 인용한다 — `blue/foundation/regression-gate.md:91` · `blue/foundation/vitest-coverage-exclude-pattern-vacuous-zero-axis.md:10`. 실행되지 않는 측정 경로를 전제로 인과 모형과 baseline 수치를 서술한다.
   - **본 절과 (G-3) 판정 명령은 그 토큰의 리터럴을 쓰지 않는다.** 쓰면 spec 자신이 위반 계수에 잡혀 어떤 시정으로도 0 에 도달하지 못한다 — tick 220 판본이 실제로 그 상태였고 4 hit 중 2 건이 자기 문장이었다 (inspector tick 221 실측). 판정 명령은 토큰을 `"v""8"` 로 조립해 자기참조를 끊는다.
   - 이 축이 §역할 방어 대상 2 다 — 서술이 낡은 것이 아니라 **그 서술 위에 세워진 결론이 재판정 대상**이 된다.
4. **(G-4) 판정 채널의 스코프 포함** — (G-1)(G-2) 를 판정하는 채널이 등재돼 있고 그 **스캔 루트가 `specs/30.spec` 을 포함**한다.
   - **현 HEAD 실측: 미충족.** `scripts/check-spec-coherence.sh` 는 실재하고 `check:spec-coherence` 로 등재돼 있으나 스캔 루트가 `src` 다 (`:29` · `:41`). 헤더 `:8` 이 `범위 (G4): src/** 한정` 으로 그 사실을 명시한다.
   - **판정 방법에 주의가 필요하다.** "스크립트가 `specs/30.spec` 을 스코프에 포함하는가" 를 `grep -c "specs/30.spec" scripts/check-spec-coherence.sh` 로 재면 **현 HEAD 에서 이미 4** 다 — 그 4 hit 은 주석(`:3` `:7`)·G1 진단 문구(`:32`)·ack 출력(`:62`) 이고 **스캔 루트와 무관하다**. 즉 그 형태의 판정은 아무것도 고치지 않은 상태에서 통과한다. 채널의 스코프는 **텍스트가 아니라 관측된 산출**로 판정해야 한다 ((G-5)).
5. **(G-5) 판정의 비공허성** — 채널은 대상 집합을 열거로 고정하지 않고 디렉터리 열거로 산출하며, **대상 0건일 때 통과하지 않는다.**
   - 측정 대상이 비면 (G-1)(G-2) 는 자명하게 참이 되고 게이트는 초록을 낸다 — 커버리지 귀속 축에서 이미 관측된 부류다 (`coverage-per-file-attribution-monotonicity` 의 전수 공허 차단).
   - 따라서 채널은 **판정한 distinct 참조 수를 출력**하고, 그 수가 하한 미만이면 실패한다. 현 HEAD distinct **57**.

## 의존성

- 판정 대상: `specs/30.spec/**` 전체 (blue 61 + green 3 — 디렉터리 열거로 산출, 열거 고정 금지).
- 현 채널: `scripts/check-spec-coherence.sh` + `package.json` `scripts.check:spec-coherence` + `.husky/pre-commit` 발화. **스코프 확장의 대상이지 신규 파일이 필수는 아니다** (수단은 위임).
- 설정 파일 (G-3 대상): `vite.config.js` (`test.coverage.provider`).
- 역의존: `src-spec-reference-coherence` (foundation) — 동일 게이트의 `src/**` 축. 본 계약은 그 스코프를 `specs/30.spec/**` 로 넓히는 자매 축이며 게이트 구현을 공유할 수 있다.

## 회귀 중점

1. (R-1) 승격이 참조를 끊음 — 가장 빈번한 생산 경로. `f014ddf` 가 실사례다. slug 식별 표기가 이 부류에 불변이다.
2. (R-2) `-spec` suffix 표기의 재유입 — `src/**` 에서는 막히고 `specs/**` 에서는 안 막히는 비대칭이 원인.
3. (R-3) 설정 이관이 서술을 낡게 함 — provider `v8` → `istanbul` 이 실사례. 이관 task 는 src 만 보고 spec 서술을 남긴다.
4. (R-4) 채널의 공허화 — 스코프 확장 시 추출 패턴이 어긋나 distinct 0 이 되면 전 항목이 자동 통과한다. (G-5) 가 겨눈다.
5. (R-5) 스코프 판정의 텍스트화 — (G-4) 를 스크립트 본문 grep 으로 재는 형태로 회귀하면 주석만으로 통과한다 (§동작 4 실측).

## 발화 채널

**현 HEAD 에 이 축의 자동 발화 채널이 없다.** `check:spec-coherence` 는 등재돼 있으나 스캔 루트가 `src` 라 본 계약의 대상을 보지 않는다.

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착(여기서는 기존 채널의 스코프 확장) task 발행을 선행 조건**으로 한다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** "위반 1건 주입 → `rc≠0` → 원복 → `rc=0`" 은 '가정 주입 요구' 부류라 본 spec 의 체크박스가 아니다. **검출 방향을 보존해 스코프 확장 task 의 `## 검증/DoD` 로 이관**한다. developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다.

- (Dir-1 참조 부재) 임의 spec 에 실재하지 않는 spec 경로 참조 1행 주입 → `rc≠0` + 그 경로 출력. 원복 → `rc=0`.
- (Dir-2 suffix 표기) `...-spec.md` 형태 참조 1행 주입 → `rc≠0`.
- (Dir-3 공허) 추출 패턴이 0건을 내도록 스코프를 비움 → `rc≠0` (vacuous-zero 차단이 실제로 발화하는지).
- (Dir-4 스코프 회귀) 스캔 루트를 `src` 로 되돌림 → 현 HEAD 의 실재 위반 14건을 놓치므로 `rc=0` 이 되어야 하고, **그것이 곧 (G-4) 위반으로 검출**돼야 한다. 이 방향은 §동작 4 가 지적한 텍스트 판정 함정을 직접 겨눈다.

## 테스트 현황

- [ ] (G-1) 참조 실재 — HEAD=`d7b08dd` (tick 226 재실행) 부재 **13 distinct, 전량 blue** — tick 223~226 동수 불변 — tick 223·224 와 동수 불변 (tick 222 의 14 에서 1 감소 — planner 승격으로 참조 대상 1건이 실재하게 됐다). green 스코프는 **0**. 미충족 (blue 편집 writer 부재 — §미측정·비판정 항목).
- [ ] (G-2) suffix 표기 0 — HEAD=`d7b08dd` (tick 226 재실행) **11 line, 전량 blue** — 불변. green 스코프는 **0**. 미충족 (동일 사유).
- [ ] (G-3) 인용 설정값 일치 — HEAD=`d7b08dd` (tick 226 재실행) 종전 provider 토큰 인용 **2 line (전량 blue)** vs 실제 `istanbul`. 미충족. tick 220 판본의 4 hit 중 2 건은 본 spec 자신의 문장이었고 tick 221 이 제거했다.
- [x] (G-4) 채널 스코프 포함 — `SPEC_ROOT=specs/30.spec` 스코프 보유 + 산출 출력 (TSK-20260825-08 / `f2bd538`).
- [x] (G-5) 비공허 단언 — 채널이 `SPEC_MIN_FILES` / `SPEC_MIN_DISTINCT=50` 하한을 **보유하고 하드 실패**한다 (`check-spec-coherence.sh:59`·`:191`).

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). **HEAD=`139cd78` (tick 223 재실행) 기준 2/5** — inspector tick 223 이 다섯 명령을 전수 재실행했다 (tick 221·222 와 동일 결과). 측정 명령은 `specs/30.spec` 트리와 `vite.config.js`·`package.json` 만 참조하며 **본 spec 자신의 파일 경로를 참조하지 않는다** (RULE-07 §promote 조건 2).
>
> **tick 221 명령 교정 2건 (판정 결과를 바꾼다).**
> 1. **확장자 제한 `--include="*.md"` 를 (G-1)(G-2)(G-5) 에 추가했다.** 종전 명령은 `specs/30.spec` 아래를 확장자 무관으로 훑어 **gitignored 에이전트 상태 파일**(`green/.inspector-seen` · `green/.planner-seen`)까지 계수했다. 그 파일들은 spec 경로를 본문에 기록하므로, 승격·병합으로 사라진 green 경로가 seen 파일에 남아 있으면 **에이전트 자신의 부기가 게이트를 뒤집는다** — 실측: 확장자 무관 distinct **58 / 부재 15**, `*.md` 한정 distinct **55 / 부재 14**. 증분 1건은 `.inspector-seen` 의 tick 220 잔존 행이었다. 등재 채널은 이미 확장자를 제한하고 있어(`check-spec-coherence.sh:33` 주석) **spec 문면과 채널이 어긋난 상태**였고, 이 교정으로 일치시킨다.
> 2. **(G-3) 의 자기참조를 끊었다.** 종전 명령은 판정 토큰의 리터럴을 그대로 담고 있어 **명령 문장 자신이 위반으로 계수**됐다 (4 hit 중 2 건이 본 파일 `:45`·`:97`). 어떤 시정으로도 0 에 도달할 수 없는 자기봉쇄 기준이었다. 토큰을 `"v""8"` 로 조립해 리터럴을 소거했고, 실측 위반은 **2 line (전량 blue)** 로 확정됐다.

- [ ] (Must, G-1) 참조 실재 — `bash -c 'n=0; for p in $(grep -rhoE --include="*.md" "specs/30\.spec/(blue|green)/[A-Za-z0-9._/-]+\.md" specs/30.spec | sort -u); do [ -e "$p" ] || { echo "$p"; n=$((n+1)); }; done; exit $((n>0))'` → **rc=0**. **HEAD=`139cd78` (tick 223 재실행) 실측 rc=1 / 부재 13 distinct → 미충족.** 부재 13 은 **전량 blue** 이며 green 스코프 부재는 **0** 이다 (등재 채널 출력 `green(missing=0 …) blue(missing=13 · ADVISORY)` 와 일치). blue 에는 create/edit writer 가 없으므로 이 항목의 잔여는 파이프라인 안에서 닫히지 않는다 — 시정 경로는 운영자 편집 또는 `RULE-01` 개정이다. 그 사실을 감추지 않기 위해 항목을 `[x]` 로 완화하거나 green 한정으로 축소하지 않는다.
- [x] (Must, G-5) 비공허 — 등재 채널이 **하한 단언을 보유하고 위반 시 하드 실패**한다: `bash -c 'grep -qE "SPEC_MIN_DISTINCT=[0-9]+" scripts/check-spec-coherence.sh && npm run check:spec-coherence 2>&1 | grep -qE "distinct=[0-9]+"'` → rc=0, 그리고 순회 distinct 수 ≥ **50**: `bash -c 'test "$(grep -rhoE --include="*.md" "specs/30\.spec/(blue|green)/[A-Za-z0-9._/-]+\.md" specs/30.spec | sort -u | wc -l)" -ge 50'` → rc=0. **HEAD=`139cd78` (tick 223 재실행) 실측 채널 `SPEC_MIN_DISTINCT=50` (`:59`) + `:191` `G5 VIOLATION (vacuous)` 하드 실패 + 출력 `distinct=52`, 독립 재측정 **52** → 충족.** tick 219 가 `[ ]` 로 둔 이유("채널이 단언을 보유하지 않는다")가 해소됐다 — 충족 형태는 값의 크기가 아니라 **채널의 보유**이므로 판정 명령도 그 형태로 교정했다.
- [ ] (Must, G-2) suffix 표기 0 — 판정:
  ```
  test "$(grep -rnE --include="*.md" "specs/30\.spec/[^\"\` ]*-spec\.md" specs/30.spec | wc -l)" -eq 0
  ```
  → **rc=0**. **HEAD=`61ce5ab` (tick 227 재실행) 실측 rc=1 / 11 line → 미충족.** 11 line 은 **전량 blue** 이며 green 스코프는 **0** 이다 (채널 출력 `green(… suffix=0) blue(… suffix=11 · ADVISORY)`). G-1 과 동일한 writer 부재 제약을 받는다.
  - **tick 227 이 판정 문면을 인라인 스팬에서 펜스로 옮겼다 (측정 내용 변경 0).** 종전 문면은 명령을 홑백틱 인라인 스팬에 담았는데, 그 명령의 문자 클래스 `[^\"\` ]` 가 **백틱을 리터럴로 포함**한다. 인라인 스팬은 백틱으로 구분되므로 그 백틱이 스팬을 조기 종료시켰고, 문면 추출은 `bash -c 'test "$(grep -rnE --include="*.md" "specs/30\.spec/[^\"\` 까지의 **잘린 조각**만 산출했다. 그 조각을 실행하면 `unexpected EOF while looking for matching quote` 로 **rc=2** 가 나며, 이는 위반(1)도 충족(0)도 아닌 **도달 불가**다 — green `testing/acceptance-command-measures-declared-subject` (C-3) 가 겨눈 부류의 신규 실사례이고, tick 223~226 이 이 항목을 4 cycle 동안 `rc=1 / 11 line` 으로 보고해 온 것은 **추출이 아니라 손으로 옮겨 실행**했기 때문이다. 펜스는 행 선두 ``` 로만 토글되므로 본문 백틱이 경계를 깨지 않는다. 교체 후 추출 실행 실측 `rc=1` · 11 line 으로 **종전 수기 실행과 동일** — 계약을 완화하지 않았다.
- [ ] (Must, G-3) 인용 설정값 일치 — `bash -c 'v=$(sed -n "s/.*provider:[[:space:]]*.\([a-z0-9]*\).*/\1/p" vite.config.js | head -1); tok="v""8"; c=$(grep -rn --include="*.md" "provider: .$tok." specs/30.spec | wc -l); [ "$v" = "$tok" ] || [ "$c" -eq 0 ]'` → **rc=0**. **HEAD=`139cd78` (tick 223 재실행) 실측 `v=istanbul` · `c=2` → rc=1 미충족.** 잔존 2 line 은 **전량 blue** 다. **tick 221 교정**: 종전 명령은 판정 토큰의 리터럴을 명령 문장에 담고 있어 본 파일이 스스로 2 hit 을 만들었다 (`c=4` 중 2). 토큰을 `"v""8"` 로 조립해 자기참조를 끊었고, 이로써 이 항목은 blue 시정만으로 0 에 도달할 수 있게 됐다 — 교정 전에는 어떤 시정으로도 도달 불가한 자기봉쇄 기준이었다. 확장자 제한도 함께 붙였다 (seen 파일 오염 차단, §수용 기준 교정 1).
- [x] (Must, G-4) 채널 스코프 포함 — 등재 채널을 실행했을 때 **`specs/30.spec` 트리를 실제로 판정**한다. 판정: `bash -c 'npm run check:spec-coherence >/tmp/sc.out 2>&1 || exit 1; grep -qE "spec-scope root=specs/30\.spec .*distinct=([5-9][0-9]|[1-9][0-9]{2,})" /tmp/sc.out'` → rc=0. **HEAD=`139cd78` (tick 223 재실행) 실측 rc=0 → 충족** — 출력 `check-spec-coherence: spec-scope root=specs/30.spec files=68 distinct=52 green(missing=0 suffix=0) blue(missing=13 suffix=11 · ADVISORY)`. TSK-20260825-08 (`f2bd538`) 이 `SPEC_ROOT` 스코프를 신설했다. **스크립트 본문 grep 으로 판정하지 않는다** — `grep -c "specs/30.spec" scripts/check-spec-coherence.sh` 는 tick 219 시점에 이미 **4** 였고 전부 주석·진단 문구라 아무것도 고치지 않은 상태에서 통과하는 공허 기준이었다 (§동작 4). 판정은 **관측된 산출**(스캔 루트 리터럴 + distinct 하한)으로만 한다.
  - **green hard-fail / blue ADVISORY 분업을 채널이 채택했다.** 이는 (G-1)(G-2) 의 판정을 완화한 것이 아니라 **집행 가능성의 경계를 산출에 드러낸 것**이다 — blue 위반 14+11 은 매 실행마다 수치로 보고되며, 다만 `rc` 에 반영되지 않는다. 본 spec 의 (G-1)(G-2) 는 여전히 트리 전체를 요구하므로 그 둘은 미충족으로 남는다. 채널이 rc 에 싣지 않는 것과 계약이 요구하지 않는 것은 다르다.

## 참고

- 본 spec 은 자기 계약의 첫 준수 대상이다. cross-ref 를 slug 로만 쓴 것이 그 준수이며, 전체 경로를 썼다면 승격 즉시 (G-1) 위반을 스스로 만들었을 것이다.
- 소비한 followup 2건: provider 이관이 남긴 blue stale 서술 (방어 2 의 주 근거), 충족 후에도 `[ ]` 로 남은 거짓 미충족 표기 (반대 방향 오염 사례 — 거짓 `[ ]` 는 거짓 `[x]` 보다 덜 위험하나 planner 가 **이미 끝난 일에 대한 task 를 재발행**하게 만든다).
- 자매 축: `src-spec-reference-coherence` (foundation) — 동일 규약의 `src/**` 스코프. 게이트 구현 공유가 자연스럽다.
- 인용 축 관련: `coverage-determinism` · `coverage-gate-exit-code-determinism-margin-axis` (foundation) 가 (G-3) 오염의 현 보유처다. 재anchor 수치 산출은 본 계약의 판정 대상이 아니다.

### 미측정·비판정 항목

- **(관측 — 미판정) `SPEC_MIN_DISTINCT` 하한의 형태 문제.** 순회 distinct 는 spec 총량과 승격 진행도에 종속되며 tick 221→223 사이 55 → 52 로 감소했다 (하한 50). 상수 하한은 "게이트가 아무것도 세지 않는 상태" 와 "셀 것이 정상적으로 줄어든 상태" 를 구별하지 못한다. 판정 형태의 교체(예: 트리 파일 수 대비 비율, 또는 0 여부만)는 본 spec 의 범위 밖이며 별 축이다 — 여기서는 관측만 남긴다.

- **(가정 주입 요구 — 이관 완료·착지) 채널의 민감도.** (Dir-1)~(Dir-4) 를 스코프 확장 task 의 DoD 로 이관했고, 그 task 는 **TSK-20260825-08 (`f2bd538`) 로 착지**했다. 이관처 부재 상태가 해소됐다.
- **(RULE-01 성질 — 명령 판정 불가) 승격된 계약의 자가 교정 경로 존재.** blue 에 create/edit writer 가 없다는 것은 writer 매트릭스의 성질이라 명령 1회로 판정할 수 없다. 평서문으로만 박제한다 — **자동 채널이 검출을 담당하면 시정 경로 부재의 비용이 "축적" 에서 "즉시 가시화" 로 바뀐다.** 경로를 만드는 것이 아니라 부재를 보이게 만드는 것이 본 계약의 기여다.
- **인용 설정값 축의 일반화.** (G-3) 은 현재 `coverage.provider` 1개 토큰만 판정한다. "spec 이 인용한 모든 설정 토큰" 으로 일반화하려면 인용 토큰을 기계적으로 식별하는 수단이 선행돼야 하며 현 HEAD 에 그 수단이 없다. 하한 1개 토큰으로 시작하고 확장은 별 task 로 둔다 — `RULE-06 §열거 고정 금지` 상 이 하드코딩은 **완전성 보조 단언을 함께 두지 못한 상태**이므로, 확장 전까지 (G-3) 은 "1개 토큰 이상" 의 약한 계약임을 명시한다.
- **오염된 blue 문서의 재anchor 수치.** istanbul 실측 baseline 재산출과 `margin-axis` 의 경로 재판정은 inspector 재측정을 요하며 본 계약의 판정 대상이 아니다 (§역할 (v)).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | inspector tick 223 / HEAD=`139cd78` | **drift reconcile — 재실행 3/3, ack 0 (플립 없음). stale 2 cycle.** G-1 부재 **14 → 13** · G-2 suffix **11** (불변) · G-3 인용 **2** (불변). 부재 1 감소는 시정이 아니라 planner 승격으로 참조 대상 1건이 실재하게 된 결과이며, 잔여 13 은 여전히 **전량 blue 귀속**이고 green 스코프는 세 축 모두 0 이다. **신규 관측 — 공허 하한과의 여유가 줄고 있다.** 채널 출력이 `files=65 distinct=55` 에서 `files=68 distinct=52` 로 이동했다. `SPEC_MIN_DISTINCT=50` 은 (G-5) 가 공허 통과를 막으려고 세운 하한인데, 승격이 진행될수록 green→blue 경로 참조가 소멸해 **distinct 가 하한 쪽으로 내려간다**. 52 는 하한과 2 밖에 차이 나지 않으므로, 다음 승격 몇 건이면 (G-5) 는 "위반을 잡아서" 가 아니라 **"셀 것이 줄어서" 하드 실패**할 수 있다. 하한을 올리는 것은 답이 아니다 — 이 수치는 spec 총량에 종속되므로 상수 하한 자체가 잘못된 형태다. §미측정·비판정 항목에 관측으로 박제하고 판정은 바꾸지 않는다. | 테스트 현황, 수용 기준, 변경 이력 |
| 2026-08-25 | inspector tick 222 / HEAD=`ff699f9` | **drift reconcile — 재실행 3/3, ack 0 (플립 없음).** G-1 부재 **14** · G-2 suffix **11** · G-3 인용 **2** 로 tick 221 과 동일하며 **전량 blue 귀속**이다. green 스코프는 세 축 모두 0. 미충족을 감추지 않기 위해 `[x]` 완화·green 한정 축소를 하지 않는다는 tick 221 판단을 유지한다 — 시정 경로는 운영자 편집 또는 `RULE-01` 개정이며, 그 사실이 항목에 보이는 것이 이 문서의 값이다. | 수용 기준, 변경 이력 |
| 2026-08-25 | inspector tick 221 / HEAD=`6f58541` (TSK-20260825-08 `f2bd538`) | **G-4·G-5 충족 플립 (0/5 → 2/5) + 판정 명령 교정 2건.** 채널이 `SPEC_ROOT=specs/30.spec` 스코프와 `SPEC_MIN_DISTINCT=50` 하한 하드 실패를 보유해 두 항목이 닫혔다. **교정 (1) 확장자 제한** — 종전 (G-1)(G-2)(G-5) 명령이 확장자 무관으로 훑어 gitignored `green/.inspector-seen` 을 계수했고, 그 파일에 남은 tick 220 잔존 행 하나가 부재 참조를 14 → **15** 로 부풀렸다 (실측). 에이전트 부기가 자기 게이트를 뒤집는 형태라 `--include="*.md"` 로 채널과 정합시켰다. **교정 (2) (G-3) 자기참조 절단** — 판정 토큰 리터럴이 명령 문장 안에 있어 본 파일이 스스로 2 hit 을 만들었고(`c=4` 중 2), 어떤 시정으로도 0 에 도달할 수 없는 자기봉쇄 기준이었다. 토큰 조립으로 리터럴을 소거해 실측 위반을 **2 line (전량 blue)** 로 확정했다. **잔존 (G-1)(G-2)(G-3) 은 전량 blue 귀속** — green 스코프 위반은 세 축 모두 0 이며, blue 에 create/edit writer 가 없어 파이프라인 안에서 닫히지 않는다. 완화하지 않고 미충족으로 유지한다. | 위치, 동작, 테스트 현황, 수용 기준, 참고 |
| 2026-08-25 | REQ-20260825-005 (inspector tick 219) | 최초 등록. discovery 가 followup 2건(A-6 provider stale + F html-lang 거짓 `[ ]`)을 흡수해 발행한 req 를 불변식으로 반영. 전 수치를 현 HEAD 에서 재측정했다 — req 의 distinct 55 / 부재 13 / 출현 207 은 **57 / 14 / 208** 로 갱신됐고, 증분 1건은 본 tick 중 `coverage-per-file-attribution-monotonicity` 승격(`f014ddf`)이 만든 것이다. **req 의 채널 판정 기준을 교정했다** — 원안 `grep -c "specs/30.spec" scripts/check-spec-coherence.sh ≥ 1` 은 현 HEAD 에서 이미 **4** 를 내며 그 4 hit 은 전부 주석·진단 문구라 **아무것도 고치지 않은 상태에서 통과하는 공허 기준**이었다. 스캔 루트는 `:29` `:41` 의 `src` 이므로, 판정을 스크립트 텍스트가 아니라 **관측된 산출**(출력에 spec-scope distinct 수 포함 + 하한)로 교체하고 그 함정을 (G-4)·(R-5)·(Dir-4) 세 곳에 박제했다. (G-5) 비공허 항목은 값이 이미 57 이지만 "채널이 그 단언을 보유한다" 가 충족 형태이므로 `[ ]` 로 두었다. (G-3) 이 1개 토큰 하드코딩이라 RULE-06 §열거 고정 금지를 완전히는 만족하지 못함을 §미측정 항목에 자백했다. | all |
| 2026-08-26 | (inspector tick 226) | **Phase 1 재실행 3/3 ack 0 — stale 5 cycle.** (G-1) 부재 13 distinct · (G-2) suffix 11 line · (G-3) 인용 2 line, 전부 tick 222~225 와 동수 불변이며 **전량 blue 귀속**이다. green 스코프는 세 항목 모두 **0** 으로 유지된다. 잔여가 닫히지 않는 이유는 측정이 아니라 **writer 부재**다 — `RULE-01` 매트릭스에 `30.spec/blue/**` 의 create/edit writer 가 없다. **본 spec 은 slug 단위 green 판본으로 닫히는 부류가 아니다** — 위반이 서로 다른 blue 파일 약 20건에 흩어져 있어 한 건의 green 판본 승격으로 해소되지 않는다. 단일 blue 파일에 국소화된 결함(예: 특정 spec 의 판정식 오류)은 `10.followups → discovery → 20.req → 동일 slug green 판본 → planner promote` 경로로 닫히지만, 본 축은 그 경로로 닫히지 않는다는 점이 다르다 (§FR-06/A-7 이 blue 직접 편집 0건을 강제). 이 구분을 흐리지 않기 위해 마커를 `[x]` 로 완화하거나 green 한정으로 축소하지 않는다. | 테스트 현황 (G-1)(G-2)(G-3) |
| 2026-08-26 | (inspector tick 227) | **Phase 1 재실행 5/5 — ack 0, marker 플립 0 (stale 6 cycle).** (G-1) 부재 13 distinct · (G-2) suffix 11 line · (G-3) 인용 2 line 이 전량 **blue** 이고 green 스코프는 셋 다 **0** 으로 tick 223~227 불변. `d7b08dd..61ce5ab` 델타(`src/` 2 + `scripts/` 1)는 이 축과 무관하므로 불변은 예상된 결과이며 **재실행은 실제로 수행했다** (no-delta 스킵 아님). **(G-2) 판정 문면을 인라인 스팬에서 펜스로 교체 — 측정 내용 변경 0, 도달 가능성 회복.** 종전 문면의 명령은 문자 클래스에 **리터럴 백틱**을 포함했고, 홑백틱 인라인 스팬이 그 백틱에서 조기 종료돼 **문면 추출 시 잘린 조각**만 나왔다. 그 조각은 실행하면 `unexpected EOF` 로 **rc=2** — 위반(1)도 충족(0)도 아닌 **도달 불가**다. tick 223~226 이 이 항목을 `rc=1 / 11 line` 으로 보고해 온 것은 추출이 아니라 **손으로 옮겨 실행**했기 때문이며, tick 227 에 추출 실행으로 바꾸자 즉시 드러났다. 펜스 교체 후 추출 실행 실측 `rc=1` · 11 line 으로 **종전 수기 실행과 동일** — 계약 완화 0. 같은 백틱 절단 부류가 blue 3건 (`husky-pre-push-typecheck:70` · `island-proptypes-zero:66` · `src-spec-reference-coherence:38`) 에 잔존하며 green `testing/judgement-command-derivation-completeness` §참고 §미측정 에 박제했다. **본 spec 은 수용 기준 2/5 로 promote 후보가 아니다.** | 수용 기준, 변경 이력 |
