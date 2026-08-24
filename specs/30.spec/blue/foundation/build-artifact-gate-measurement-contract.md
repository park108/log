# build 산출물 게이트의 측정 계약 — 공허 green 금지 · skip 3상태 구분

> **위치**: `.github/workflows/ci.yml` step 순서 (`- name: Test` `:72` → `- name: Build` `:75`) + `src/__tests__/` 의 build 조건부 픽스처군 (`PATH_BUILD*` 참조 6 파일).
> **관련 요구사항**: REQ-20260824-003 (FR-01~FR-04).
> **최종 업데이트**: 2026-08-24 (by inspector — Phase 1 reconcile tick 217. C-1~C-4 회복을 현 HEAD 재실행 + 주입으로 확인해 marker 전수 플립. FR-02 명령이 vacuous 로 전락한 것을 주입으로 적발해 교체).

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

`build/` 산출물을 측정 대상으로 삼는 게이트는 **산출물이 존재하는 상태에서 실제로 한 번 이상 측정된다**. 산출물이 없어 건너뛴 실행은 green 의 근거가 되지 않으며, 건너뛰었다는 사실 자체가 실행 출력에 남는다.

**방어 대상 (RULE-07 §주제 우선순위 2 — 명시 의무).** 본 계약이 방어하는 회귀는 **빌드가 `index.html` 의 head 선언(로케일 · viewport · CSP meta · mount id)이나 `public/**` 자산을 산출물에서 변형·소실시키는 것** 이다. 이 회귀는 prod 표면에서만 관측되고 `tsc`·`eslint`·`vitest`(원본 극)·`vite build`(rc) 를 전부 통과한다. 저장소는 이를 겨냥한 픽스처를 6 파일 10 지점 보유한다. **최초 등록 시점(HEAD=`414e66b`)에는 그 게이트들이 CI 에서 단 한 번도 측정되지 않았다** — 아래 1~3 이 그 상태의 실측이며, 현재는 TSK-20260824-08-a/-b 로 전부 해소됐다 (§발화 채널 · §변경 이력).

1. **CI 는 `Test` 를 `Build` 앞에 실행한다** (`ci.yml:72` → `:75`). `build/` 는 gitignored (`.gitignore:12`) 이므로 fresh runner 의 `npm test` 시점에 산출물이 존재하지 않는다. 따라서 build 조건부 분기는 CI 에서 100% 미측정 경로로 들어간다.
2. **미측정이 skip 으로 세어지지도 않는다.** 현 구현은 `expect(true).toBe(true); return;` 형태의 자명 단언으로 대체한다 (6 지점 실측). vitest 는 이를 통과한 단언으로 계수하므로 CI 로그에는 "측정했다" 와 구별되지 않는 초록만 남는다.
3. 결과적으로 이 회귀 부류에 대한 자동 검출력은 **실질 0** 이며, 검출력이 0 이라는 사실을 신고하는 상위 채널도 없다.

동일 사유는 저장소에서 이미 한 번 인정됐다 — `ci.yml:78-79` 주석은 `Check eslint ignores vacuous-zero` step 을 "`build/` 와 `coverage/` 가 디스크에 있어야 성립한다" 는 이유로 `Test`+`Build` **뒤에** 배치했다. 같은 배려가 vitest 픽스처군에는 적용되지 않았다.

의도적으로 하지 않는 것: (i) **수단 선택** — CI step 재배치인지 별도 job 인지 픽스처 내부 빌드 트리거인지는 planner/developer 영역, (ii) 각 산출물의 **내용 계약** (csp-meta / mount-id / viewport / html-lang / public-asset / robots 각 축 spec 소관), (iii) 루트 태그 **토큰 추출 패턴의 특이도** — `specs/30.spec/green/foundation/html-lang-locale-declaration-contract.md` 축, (iv) `build/` 를 git 추적 대상으로 바꾸는 결정 (별 축).

## 공개 인터페이스

없음. 측정 대상은 `.github/workflows/ci.yml` step 순서와 `src/__tests__/**` 의 build 조건부 분기 구현이다.

## 동작

1. **(C-1) 측정 실행 보장** — build 산출물 대상 게이트는 산출물이 존재하는 상태에서 자동 채널 1회 이상 실행된다. 산출물 부재로 인한 미측정만으로 green 이 성립하지 않는다.
   - 최초 등록 시점(`414e66b`) 실측: `Build` step 이후에 픽스처를 실행하는 step 0건.
   - **현 HEAD(`a48339d`) 실측: 충족.** `ci.yml:84-85` `- name: Check build artifact fixtures measured` / `run: npm run check:build-artifact` 가 `Build`(`:75-76`) 뒤에 있다. 대상 목록은 하드코딩이 아니라 `vite.config.js` 의 `outDir` + 헬퍼 import + build 경로 표현으로 도출되며, 도출이 공집합이면 스스로 exit 1 한다 (vacuous-zero 자기 차단).
2. **(C-2) skip 술어의 입도** — 조건부 skip 술어는 **해당 게이트가 실제로 읽는 파일** 의 존재로 판정한다. 디렉터리 존재를 빌드 완료로 간주하지 않는다. 부분 산출 상태(디렉터리는 있고 대상 파일은 없음)는 위반이 아니라 미측정이다.
   - 최초 등록 시점(`414e66b`) 실측: `public-asset-reference-coherence.test.ts:102` 가 `existsSync(PATH_BUILD)` — 디렉터리 존재로 판정. `build/index.html` 만 없애면 rc=1 (FAIL) 이 됐다.
   - **현 HEAD(`a48339d`) 실측: 충족.** 판정이 `src/test-utils/buildArtifactGate.ts` 1 곳으로 수렴했고, 호출부는 `artifacts` 목록에 **읽는 파일 경로를 반드시 포함**한다 (디렉터리 열거가 필요한 2 지점은 `[PATH_BUILD, PATH_BUILD_INDEX_HTML]` / `[BUILD_DIR, PATH_BUILD_INDEX_HTML]` 처럼 디렉터리와 파일을 함께 넣는다). inspector 재주입: `build/index.html` 만 부재 → FAIL 아닌 **미측정(skip)** 으로 떨어졌다 (§변경 이력 INJ-B).
3. **(C-3) 3 상태 구분 보고** — 게이트는 다음 셋을 구분해 보고한다.
   - (i) **미빌드** — 산출물 부재. 위반 아님, 미측정.
   - (ii) **stale** — 원본이 산출물보다 최신. 위반 아님, 재빌드 필요를 지시한다.
   - (iii) **변형** — 원본과 산출물이 동시대인데 내용이 다르다. 위반.
   (ii) 를 (iii) 으로 보고하지 않는다. `build/` 가 gitignored 인 이상 "원본 편집 직후 재빌드 전" 창은 로컬에서 일상적이며, 그 창에서 현행 게이트는 "빌드가 루트 요소의 로케일 선언을 변형·소실시켰다" 는 메시지를 낸다 (`src/__tests__/html-lang-locale-declaration.test.ts:222`) — 원인 지목이 틀렸다.
   - 최초 등록 시점(`414e66b`) 실측: 6 파일 중 mtime 을 읽는 파일 0 — (ii)/(iii) 을 구분할 입력 자체가 없었다.
   - **현 HEAD(`a48339d`) 실측: 충족.** 6/6 파일이 stale 판정 입력을 보유한다 (`mtimeMs|.mtime` 11 hit). inspector 가 tick 217 세션 중 `index.html` 의 mtime 을 갱신했을 때 게이트는 8건을 `미측정 (stale — 재빌드 필요) — 원본 index.html 이 산출물보다 최신이다 … 위반 아님` 으로 보고했다 — (ii) 를 (iii) 으로 오보하지 않는 계약이 실환경에서 발화한 관측이다.
4. **(C-4) 미측정의 관측 가능성** — 미측정 사실은 실행 출력에 드러난다. 자명 단언(`expect(true).toBe(true)`) 으로 대체하지 않는다 — 그것은 "측정했고 통과했다" 와 출력상 구별되지 않는다.
   - 최초 등록 시점(`414e66b`) 실측: 자명 단언 6 지점.
   - **현 HEAD(`a48339d`) 실측: 충족.** `expect(true).toBe(true)` 0 hit. 미측정은 러너의 skip 경로로 빠지고 사유가 note 로 남으며, `check:build-artifact` 는 요약에 `skipped`/`todo` 가 남으면 exit 1 한다 — 산출물이 있어야 할 시점의 skip 은 초록이 아니다.
   - 수단은 중립이다 — 러너의 skip 계수 경로(`ctx.skip()` 등) 든 명시적 미측정 로그든, 출력에서 측정과 구별되면 충족이다.
5. **(C-5) read-only 유지** — 산출물을 측정하기 위해 빌드를 유발하더라도 원본 트리는 변경하지 않는다. 게이트는 `build/` 밖의 어떤 파일도 쓰지 않는다.

## 의존성

- 내부: `.github/workflows/ci.yml` (`Test`/`Build` step), `.gitignore:12` (`/build`), `src/__tests__/{public-asset-reference-coherence,csp-meta-build-artifact-preservation,html-lang-locale-declaration,mount-id-token-coherence,viewport-meta-mobile-rendering,robots-policy-coherence}.test.ts`, `package.json` `scripts.test` / `scripts.build`.
- 외부: `vitest` (skip 계수 경로), `vite` (산출물 생성).
- 역의존 (사용처): 아래 축 spec 들은 전부 본 계약 위에 서 있다 — 본 계약이 깨져 있으면 그들의 "산출물 보존" marker 는 측정되지 않은 초록이다.
  - `specs/30.spec/blue/foundation/index-html-public-asset-reference-coherence.md`
  - `specs/30.spec/blue/foundation/index-html-root-mount-id-token-coherence.md`
  - `specs/30.spec/blue/foundation/csp-meta-dev-strip-prod-preserve.md`
  - `specs/30.spec/blue/foundation/viewport-meta-mobile-rendering-contract.md`
  - `specs/30.spec/green/foundation/html-lang-locale-declaration-contract.md` (같은 req 의 패턴 특이도 축과 짝)

## 회귀 중점

1. (R-1) 산출물 head 선언 변형이 CI 를 통과 — C-1 부재 시 구조적으로 발생한다. 현 HEAD 의 상태다.
2. (R-2) 부분 산출 상태의 오탐 FAIL — C-2 위반. 로컬에서 중단된 빌드 잔재로 재현된다.
3. (R-3) stale 을 변형으로 오보 — C-3 위반. 실패 메시지가 잘못된 원인을 지목해 조사 방향이 어긋난다.
4. (R-4) 새 build 조건부 픽스처가 자명 단언 관용구를 복제 — C-4 위반이 조용히 번진다. 현행 6 지점이 이미 서로의 선례로 인용돼 있다 (`html-lang-locale-declaration.test.ts:214` 주석 "선례: csp-meta-build-artifact-preservation.test.ts 의 skip 규약").
5. (R-5) 측정 보장을 중복 빌드로 달성 — CI 시간이 배증한다. `Build` step 산출물을 재사용한다.

## 발화 채널

**채널 실재 — `package.json` `scripts.check:build-artifact` + `.github/workflows/ci.yml:84-85`** (`- name: Check build artifact fixtures measured` / `run: npm run check:build-artifact`), `Build`(`:75-76`) 뒤 배치. 판정 헬퍼는 `src/test-utils/buildArtifactGate.ts` (전용 단위 픽스처 `src/test-utils/buildArtifactGate.test.ts` 동반). TSK-20260824-08-a (`8849063`) + TSK-20260824-08-b (`efa1047`, `cc22ef1`).

기존 발화 경로(`npm test` → `ci.yml:72-73` + `.husky/pre-push`) 는 그대로이며, 추가된 것은 **산출물이 존재하는 시점의 실행 1회** 다. 선례였던 `Check eslint ignores vacuous-zero` step (`:89-90`) 과 같은 배치 규칙을 따른다.

**채널의 검출력은 주입 왕복으로 확인한다** — 정상 트리의 초록은 민감도 0 인 스크립트도 낸다. 현 HEAD=`a48339d` inspector 재실측:

```
npm run check:build-artifact                 → rc=0, Tests 68 passed (68)          [산출물 실재]
mv build <tmp> && npm run check:build-artifact → rc=1, Tests 56 passed | 12 skipped  [미측정 잔존 검출]
mv build/index.html <tmp> && 재실행           → rc=1, Tests 60 passed |  8 skipped  [부분 산출 = 미측정, FAIL 아님]
```

`cc22ef1` 이 고친 것은 이 판정의 파싱 표면이다 — CI 색상 출력(ANSI escape)이 섞이면 요약 라인 `Tests …` 가 매치되지 않아 미측정이 통과할 수 있었다. 현행 스크립트는 `NO_COLOR=1` + escape 제거 후 요약을 읽고, 요약 자체가 검출되지 않으면 exit 1 한다 (판정 불능을 초록으로 읽지 않는다).

## 테스트 현황

- [x] 측정 계약 위반의 실측 — CI step 순서·gitignore·자명 단언 6 지점 전수 확인 (2026-08-24 inspector).
- [x] C-1 산출물 존재 상태의 실행 보장 — `ci.yml:84-85` `check:build-artifact` step (`Build` 뒤). TSK-20260824-08-b / `efa1047`+`cc22ef1`.
- [x] C-2 파일 단위 skip 술어 — 디렉터리 단독 `artifacts` 목록 0건. 판정은 `src/test-utils/buildArtifactGate.ts` 로 수렴. TSK-20260824-08-a / `8849063`.
- [x] C-3 stale/변형 구분 — 6/6 파일이 stale 판정 입력 보유 (`mtimeMs|.mtime` 11 hit), 3 상태 보고 문구 분리. TSK-20260824-08-a / `8849063`.
- [x] C-4 미측정의 관측 가능성 — 자명 단언 0 hit, 미측정은 러너 skip note 로 관측되며 잔존 skip 은 `check:build-artifact` 가 exit 1. TSK-20260824-08-a/-b.

## 수용 기준

> 전 항목 HEAD=`a48339d` 에서 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 상태 주입이 필요한 항목은 §참고 §미측정·비판정 항목으로 강등하고 이관처를 표기했다. **4/4 rc=0** — inspector 가 planner 실측을 받아쓰지 않고 현 HEAD 에서 전수 재실행하고, 각 게이트에 회귀를 역주입해 검출력을 재판정했다 (§변경 이력 tick 217).

- [x] (Must, FR-01) 산출물 존재 상태의 측정 step 실재 — `bash -c 'awk "/- name: Build/{b=1} b&&/run:/{print}" .github/workflows/ci.yml | grep -qE "vitest|npm test|check:build-artifact"'` → rc=0. **HEAD=`a48339d` 실측 rc=0** (`:85` `run: npm run check:build-artifact`). step 실재만으로는 측정을 보장하지 않으므로 스크립트 자체에 산출물 부재·부분 부재를 주입해 rc=1 을 확인했다 (§발화 채널 주입 3 회차).
- [x] (Must, FR-02) 디렉터리 존재를 빌드 완료로 읽는 술어 0 — `test "$(grep -rnE 'artifacts:[[:space:]]*\[[[:space:]]*(PATH_BUILD|BUILD_DIR)[[:space:]]*(,[[:space:]]*)?\]' src/__tests__/*.ts | wc -l)" -eq 0` → rc=0. **HEAD=`a48339d` 실측 0 hit → rc=0.** 역주입(`public-asset-reference-coherence.test.ts:112` 을 `artifacts: [PATH_BUILD]` 로 되돌림) 시 1 hit → rc=1 로 검출된다.
  - **구 명령 `grep -rn 'existsSync(PATH_BUILD)' src/__tests__/*.ts` 는 폐기한다 — 방어 대상을 잃었다.** 3 상태 판정이 `src/test-utils/buildArtifactGate.ts` 로 수렴하면서 `existsSync` 호출은 `src/__tests__/*.ts` 글롭 밖으로 이동했고, 구 명령은 위 역주입 상태에서도 0 hit → **rc=0 을 유지했다** (inspector 실측). 즉 "정상 트리에서 rc=0" 이 게이트 소멸과 구별되지 않는 vacuous-zero 였다. 신 명령은 술어의 현 소재지인 **호출부의 `artifacts` 목록 입도**를 직접 겨눈다.
- [x] (Must, FR-03) 산출물 대상 픽스처 전수가 stale 판정 입력을 보유 — `bash -c 'n=0; for f in $(grep -rl "PATH_BUILD" src/__tests__/*.ts); do grep -qE "mtimeMs|\.mtime" "$f" || { echo "$f"; n=$((n+1)); }; done; exit $((n>0))'` → rc=0. **HEAD=`a48339d` 실측 rc=0 / 6 파일 전수 보유 (11 hit).** 이 루프는 도출 집합이 비면 공허하게 rc=0 이 되므로 vacuous-zero 를 별도 확인했다 — 도출 파일 수 **6** (0 아님). 역주입(1 파일에서 mtime 토큰 제거) 시 해당 파일을 출력하고 rc=1 로 검출된다.
- [x] (Must, FR-04) 미측정을 자명 단언으로 대체한 지점 0 — `test "$(grep -rn 'expect(true).toBe(true)' src/__tests__/*.ts | wc -l)" -eq 0` → rc=0. **HEAD=`a48339d` 실측 0 hit → rc=0** (착수 전 6 hit). 역주입(자명 단언 1 지점 추가) 시 rc=1 로 검출된다.

## 스코프 규칙

- **expansion**: 허용 — 회복이 `.github/workflows/ci.yml` (step 순서 또는 신규 step) + `src/__tests__/**` 6 파일 + 선택적으로 `package.json` `scripts.*` 를 동시에 건드린다. 공통 헬퍼(`src/test-utils/` 등) 도입도 허용하되 수단은 지정하지 않는다.
- **grep-baseline** (HEAD=`414e66b`, 2026-08-24 실측 — **task 발행 시점 baseline. 현 HEAD=`a48339d` 재실측은 각 항목 말미 `→ 현재:` 로 병기**):
  - (G1) **[CI step 순서]** `grep -nE "^\s+- name:|^\s+run:" .github/workflows/ci.yml` → `- name: Test` `:72` / `run: npm test` `:73` / `- name: Build` `:75` / `run: npm run build` `:76` / `- name: Check eslint ignores vacuous-zero` `:80`. `Build` 뒤에 픽스처 실행 step **0건**. → 현재: `- name: Check build artifact fixtures measured` `:84` / `run: npm run check:build-artifact` `:85` **1건**.
  - (G2) **[산출물 조건부 픽스처 집합]** `grep -rl "PATH_BUILD" src/__tests__/*.ts` → **6 파일**: `csp-meta-build-artifact-preservation`, `html-lang-locale-declaration`, `mount-id-token-coherence`, `public-asset-reference-coherence`, `robots-policy-coherence`, `viewport-meta-mobile-rendering`. `grep -c "existsSync(PATH_BUILD" ` 지점 합 **10** (2+1+1+2+2+2). 원 req 가 센 5 파일은 `if (!existsSync(PATH_BUILD` 관용구 한정 집계이며 `robots-policy-coherence.test.ts:259-260` 은 다른 형태로 같은 분기를 갖는다 — **집합은 관용구가 아니라 `PATH_BUILD` 참조로 도출한다** (RULE-06 §열거 고정 금지). → 현재: 6 파일 불변, 게이트 호출부는 `measureBuildArtifacts({ artifacts, sources })` 9 지점. `check:build-artifact` 는 이 집합을 `vite.config.js` 의 `outDir` 로부터 다시 도출하므로 파일 목록이 스크립트에 고정돼 있지 않다.
  - (G3) **[자명 단언 지점]** `grep -rn "expect(true).toBe(true)" src/__tests__/*.ts` → **6 hit** — `public-asset-reference-coherence.test.ts:105,:153`, `csp-meta-build-artifact-preservation.test.ts:62,:79`, `robots-policy-coherence.test.ts:263`, `mount-id-token-coherence.test.ts:130`. 나머지 2 파일은 `expect(source.length).toBe(1); return;` (`html-lang-locale-declaration.test.ts:216`) 형태로 **원본 극 단언을 skip 대체물로 재사용**한다 — 자명 단언은 아니나 산출물 극을 재지 않은 채 통과한다는 점은 동일하다. → 현재: **0 hit** (전 지점이 러너 skip + 사유 note 로 대체).
  - (G4) **[디렉터리 술어]** `grep -rn "existsSync(PATH_BUILD)" src/__tests__/*.ts` → **1 hit** (`public-asset-reference-coherence.test.ts:102`). 나머지는 파일 단위 상수(`PATH_BUILD_INDEX_HTML` 등)를 쓴다. → 현재: **0 hit이나 이 패턴은 vacuous 다** — `existsSync` 는 `src/test-utils/buildArtifactGate.ts` 로 이동했다. 술어 입도의 현 측정 지점은 호출부 `artifacts` 목록이다 (§수용 기준 FR-02).
  - (G5) **[stale 판정 입력]** `grep -rn "mtimeMs\|\.mtime" src/__tests__/*.ts` → **0 hit**. `statSync` 는 5 파일이 쓰지만 전부 디렉터리 순회(`isDirectory()`/`isFile()`) 용도이며 시각 비교에 쓰이지 않는다. → 현재: **11 hit / 6 파일 전수 보유**.
  - (G6) **[gitignore]** `git check-ignore -v build/index.html` → `.gitignore:12:/build`. fresh runner 에서 `npm test` 시점 산출물 부재의 근거.
- **rationale**: (G1)(G6) 이 "CI 100% skip" 의 두 전제다. (G2) 는 대상 집합의 도출 규칙 — 관용구 grep 으로 세면 1 파일이 새므로 `PATH_BUILD` 참조로 도출한다. (G3)(G4)(G5) 는 각각 C-4·C-2·C-3 의 zero-point.

## 참고

- **REQ 원문**: `specs/60.done/2026/08/24/req/20260824-build-artifact-gate-measurement-and-skip-contract.md` (REQ-20260824-003). 같은 req 의 FR-05·FR-06 (토큰 추출 특이도) 은 `specs/30.spec/green/foundation/html-lang-locale-declaration-contract.md` 로 분리 흡수했다 — 전자는 **측정 시점·skip 계약**, 후자는 **패턴 특이도** 로 효능이 다르다.
- **상류 followup** (`specs/60.done/2026/08/24/followups/`): `20260824-1145-build-artifact-skip-predicate-granularity.md`, `20260824-1200-build-artifact-staleness-vs-mutation-ambiguity.md`.
- **선례**: `ci.yml:76-81` `Check eslint ignores vacuous-zero` — 동일 사유(산출물이 디스크에 있어야 성립)로 Test+Build 뒤에 배치된 step. 본 계약의 수단 후보 중 하나이나 spec 은 수단을 지정하지 않는다.

### 미측정·비판정 항목

RULE-07 §수용 기준 문장 규약에 따라 체크박스에서 강등한 항목 (감사성 보존, promote 비차단).

- **(가정 주입 요구 — 이관 완료) `build/` 전체 부재 상태의 미측정 보고.** **이관처 소화: TSK-20260824-08-a (`8849063`) / TSK-20260824-08-b (`efa1047`) DoD.** inspector tick 217 재주입: `build/` 를 치우면 `check:build-artifact` rc=1 (`Tests 56 passed | 12 skipped`) — 미측정이 초록으로 통과하지 않는다.
- **(가정 주입 요구 — 이관 완료) `build/index.html` 만 부재하고 `build/` 는 잔존하는 부분 산출 상태.** 최초 등록 시점에는 rc=1 (FAIL 오보). **이관처 소화: 같은 2 task.** inspector tick 217 재주입: `Tests 60 passed | 8 skipped` — **FAIL 이 아니라 미측정** 으로 떨어지고(C-2 충족), 잔존 skip 때문에 `check:build-artifact` 는 rc=1 로 보고한다(C-4 충족). 두 방향 모두 검출 — `injection: 2/2 detect`.
- **(가정 주입 요구 — 이관 완료) 원본이 산출물보다 최신인 상태에서 "재빌드 필요" 로 보고.** **이관처 소화: TSK-20260824-08-a DoD.** tick 217 에서는 주입이 아니라 **실환경 발생**으로 재현됐다 — inspector 가 `index.html` 을 되돌리며 mtime 을 갱신하자 8건이 `미측정 (stale — 재빌드 필요) … 위반 아님` 으로 보고됐고, `npm run build` 후 68/68 measured 로 복귀했다. "빌드가 선언을 변형·소실시켰다" 는 오보는 나오지 않았다.
- **(미측정 NFR) CI 전체 소요 증가 ≤ 기존 `Build` step 1회분.** 측정 채널(러너 시간 계측)이 없다. 중복 빌드 금지는 §회귀 중점 R-5 에 평서로 보존한다.
- **(자명 명제) 게이트의 read-only 유지.** C-5 는 판정 대상이 아니라 설계 제약이다. §동작 5 에 불변식으로 잔존한다.
- **(축 분리) `build/` 를 git 추적 대상으로 전환.** 본 계약은 gitignored 전제 위에서 성립하며 추적 여부는 판단하지 않는다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-24 | TSK-20260824-08-a / `8849063` · TSK-20260824-08-b / `efa1047`+`cc22ef1` (inspector Phase 1 reconcile @ tick 217) | **FR-01~FR-04 · C-1~C-4 `[ ]` → `[x]`.** 판정이 `src/test-utils/buildArtifactGate.ts` (3 상태 `unbuilt`/`stale`/`current`) 로 수렴하고, `ci.yml:84-85` 가 `Build` 뒤에서 `npm run check:build-artifact` 를 1회 실행한다. planner 실측을 받아쓰지 않고 4/4 를 현 HEAD 에서 재실행한 뒤 **각 게이트에 회귀를 역주입**해 검출력을 재판정했다 — (INJ-A) `build/` 전체 부재 → rc=1 (12 skipped), (INJ-B) `build/index.html` 만 부재 → rc=1 (8 skipped, FAIL 아님 = C-2), (INJ-C) 1 파일 mtime 입력 제거 → FR-03 rc=1, (INJ-D) 자명 단언 1 지점 주입 → FR-04 rc=1, (INJ-F) 호출부를 `artifacts: [PATH_BUILD]` 로 되돌림 → FR-02 rc=1. **(INJ-F) 가 구 FR-02 명령의 vacuous-zero 를 적발했다** — `existsSync` 가 헬퍼로 이동해 `src/__tests__/*.ts` 글롭 밖으로 나간 결과, C-2 회귀를 주입해도 구 명령은 0 hit → rc=0 을 유지했다. 술어의 현 소재지인 호출부 `artifacts` 목록 입도를 겨누도록 명령을 교체했다. 아울러 §역할·§동작 1~4 의 "현 HEAD 실측" 문구가 전부 착수 전 상태를 가리키고 있었으므로 등록 시점 실측으로 표기를 내리고 현 HEAD 실측을 병기했다. | §역할 + §동작 1~4 + §발화 채널 + §테스트 현황 + §수용 기준 + §스코프 규칙 + §참고 |
| 2026-08-24 | inspector tick (REQ-20260824-003 FR-01~FR-04 흡수) / HEAD=`414e66b` | 최초 등록. CI 가 `Test`(`:72`) 를 `Build`(`:75`) 앞에 두고 `build/` 가 gitignored (`.gitignore:12`) 인 결과, 산출물 조건부 픽스처 **6 파일 10 지점이 CI 에서 100% 미측정** 임을 실측 박제. 미측정이 자명 단언 6 지점으로 대체돼 skip 으로 세어지지도 않는다. C-1(측정 실행 보장) · C-2(파일 단위 skip 술어) · C-3(미빌드/stale/변형 3상태) · C-4(미측정 관측 가능성) · C-5(read-only) 5 불변식과 정적 판정 Must 4건을 박제했다. 상태 주입이 필요한 3 항목은 게이트 수정 task DoD 로 이관 표기. 대상 집합은 관용구가 아니라 `PATH_BUILD` 참조로 도출한다 — 관용구 grep 은 `robots-policy-coherence.test.ts` 를 놓친다. | all |
