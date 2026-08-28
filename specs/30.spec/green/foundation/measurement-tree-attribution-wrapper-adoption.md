# 측정 창이 다회 실행에 걸치는 게이트는 측정 트리 귀속 래퍼를 경유한다

> **위치**: 게이트 채택 표면 — `package.json` `scripts.check:*` 에서 도출되는 스크립트 집합. 래퍼는 `scripts/check-measurement-tree-attribution.sh`.
> **관련 요구사항**: REQ-20260828-038 (measurement-tree-attribution-wrapper-adoption-completeness)
> **최종 업데이트**: 2026-08-28 (by inspector — tick 238 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`559dde0`).
> cross-ref 는 **slug 로만** 쓴다 — 전체 경로를 쓰면 참조 대상이 승격될 때 dangling 이 된다 (green `foundation/spec-reference-coherence` §역할 1).

## 역할

**측정 창이 단일 프로세스 호출을 넘어 다회 서브프로세스 실행에 걸치는 게이트는, 그 측정을 트리 귀속 래퍼로 감싼다.** 채택 대상은 선언된 게이트 집합에서 **도출**하며, 미채택 잔여는 수치로 발화된다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 `§역할` 이 요구하는 대로 **방어 대상을 명시한다**:

> **긴 측정 창 안에서 워킹트리가 변해, 게이트가 존재하지 않는 트리의 `rc` 를 증거로 보고하고 그 오보가 트리 결함으로 오귀인되는 사건.**

**이 사건은 이미 발생했다** (§동작 §실현된 오보). 그리고 **어떤 자동 채널도 이것을 신고하지 않는다** — 래퍼는 실재하지만 실측정 호출자 채택이 0 이므로, 채택률을 재는 주체가 없다. `RULE-06 §게이트 실효 검증` 이 기술한 **민감도 0** 이 게이트 로직 층이 아니라 **채택 층**에서 재현되는 자리다: 래퍼 자신은 주입 5방향 검출로 착지했는데(`TSK-20260825-39`), 감싸는 대상이 없어 그 검출력이 어디에도 닿지 않는다.

이 계약이 의도적으로 하지 **않는** 것:

- (i) **래퍼 자체의 신설·로직 변경.** 이미 존재하고 착지했다. 계약 소유권은 blue `foundation/measurement-tree-attribution` 이며 본 계약은 그것을 **소비할 뿐 바꾸지 않는다**.
- (ii) **작업 파괴 방지.** 래퍼 헤더 `:11` 이 명시적으로 배제한다. 막는 것은 파괴된 트리의 `rc` 가 **증거로 승격되는 것**이다.
- (iii) **채택 대상 게이트의 판정 로직** — 샤드 열거·단조성 판정은 blue `foundation/coverage-per-file-attribution-monotonicity` 소관이다.
- (iv) **측정 시간 단축·샤드 병렬화.** 측정이 긴 것은 결함이 아니다. 결함은 그 창이 관측되지 않는 것이다.
- (v) **`check:*` 전종 일괄 적용.** 채택 모집단은 **도출식이 정한 부분집합**이며, 도출식 밖 게이트에 래퍼를 강제하지 않는다 — 강제하면 짧은 게이트마다 지문 2회 비용(§비기능)이 붙어 채택이 되돌려진다.

## 공개 인터페이스

본 계약은 공개 인터페이스를 갖지 않는다 (채택 계약). 관측 표면은 셋이다.

- **(A-POP) 채택 모집단** — `package.json` `scripts.check:*` 각 키가 가리키는 스크립트 파일 중, **행 선두 주석을 절단한 실행 라인**에서 `for`/`while` 루프 **본문 안**에 `npx` · `vitest` 호출이 1회 이상 있는 것.
- **(A-ROUTE) 채택 여부** — 그 키의 스크립트 문자열이 래퍼 식별자를 경유하는가.
- **(A-REST) 미채택 잔여** — (A-POP) ∖ (A-ROUTE). **이 수치가 계약의 판정량이다.**

세 수치는 **동시에** 발화된다. 채택 수만 세면 이후 추가되는 게이트가 조용히 채택 밖에 남는다 — 현 상태가 정확히 그 형태다.

## 동작

1. `package.json` 의 `scripts` 에서 `check:` 접두 키를 **열거**한다. 게이트명 하드코딩을 판정 입력으로 쓰지 않는다 (`RULE-06 §열거 고정 금지`).
2. 각 키의 명령 문자열에서 스크립트 경로를 추출하고, 실재하지 않으면 모집단에서 제외한다.
3. 스크립트를 읽어 **행 선두 주석을 절단**한 뒤 루프 깊이를 세고, 깊이 > 0 인 라인의 `npx`/`vitest` 호출을 계수한다 → (A-POP).
4. (A-POP) 원소 중 명령 문자열이 래퍼 식별자를 포함하지 않는 것을 (A-REST) 로 열거한다.
5. (A-REST) ≠ 0 이면 그 키들을 **이름으로** 발화하고 위반으로 종료한다. 수치만 내면 어느 게이트가 빠졌는지 관측되지 않는다.
6. `check:*` 키 수가 하한 미만이거나 (A-POP) 이 공집합이면 **무판정**(`exit 2`)이다. 공허를 충족으로 읽지 않는다.

### 주석은 채널이 아니다 (3번 단계의 이유)

주석을 절단하지 않으면 도출이 **틀린 대상**을 고른다. 현 HEAD 실측 — 주석 절단 없이 "실행 라인의 서브프로세스 호출 수 ≥ 2" 로 도출하면 `check:acceptance-criteria` 와 `check:output-parsing-color-independence` 가 모집단에 들어온다. 전자의 2 hit 은 **`Hint:` 문자열**(`:286`)과 **`awk` 프로그램 텍스트 안의 리터럴**(`:180`)이고 실제 서브프로세스 호출이 아니다. 루프 본문 한정 + 주석 절단 도출은 이 둘을 정확히 배제한다 (§동작 §도출 실측).

### 실현된 오보 — 이 계약이 없어서 실제로 난 사고

`check:coverage-attribution` 은 전수 실행 1회 + 샤드 실행 12회를 4~6분에 걸쳐 수행하고 두 결과를 대조한다. 2026-08-25, 그 창 안에서 테스트 파일이 커밋됐다.

```
샤드 12 / 파일 합 68 (전수 74) / 테스트 합 639 (전수 704)
[FAIL] 완전성 붕괴 (등급 4): 샤드 열거가 전수 수집을 재현하지 못했다
```

트리가 정지한 다음 날 **동일 HEAD** 재측정은 `파일 합 74 / 테스트 합 704 / rc=0` 이었다. 동일 HEAD·동일 스크립트에서 `rc` 가 `4` 와 `0` 을 오갔다 — 게이트가 **자기 측정 창이 만든 불일치를 트리 결함으로 보고**했고, "6 파일·65 테스트가 샤드 열거 밖" 이라는 **존재하지 않는 결함**이 carve 후보로 승격됐다. 이것을 잡은 것은 게이트가 아니라 정지 상태 재측정이었다. 래퍼 헤더 `:20` 의 *"우연에 의존하는 검출은 계약이 아니다"* 가 그대로 재현된 자리다.

이는 `RULE-02 §멱등` 위반이기도 하다 — 같은 입력에서 같은 결과가 나오지 않았다.

### 도출 실측 (HEAD=`559dde0`, tick 238)

| 층 | 수치 |
|---|---|
| `check:*` 키 | **27** |
| 래퍼 경유 키 (A-ROUTE) | **1** (`check:measurement-tree-attribution` — 자기 자신) |
| 루프 본문 서브프로세스 호출 게이트 (A-POP) | **1** |
| 미채택 잔여 (A-REST) | **1** — `check:coverage-attribution` |

**채널은 있고 소비자가 없다.** followup 관측 시점(2026-08-26)의 `21종 중 1` 에서 게이트가 6종 늘어나는 동안 채택은 1 에 머물렀다. (A-POP) 이 현재 1 원소라는 것은 도출식이 **사고가 실제로 난 지점을 정확히, 그리고 그 지점만** 집는다는 뜻이다 — 이름을 적어 넣어서가 아니라 구조로 집는다 (§참고 §도출 실재 주입).

## 의존성

- 내부: `scripts/check-measurement-tree-attribution.sh` (래퍼), `package.json` `scripts.check:*`, 채택 0순위 대상 `scripts/check-coverage-attribution-monotonicity.sh`.
- 외부: `node` (도출), POSIX `grep` · `sed`.
- 역의존: blue `foundation/measurement-tree-attribution` (래퍼 자체 계약 — 본 계약이 소비), blue `foundation/coverage-per-file-attribution-monotonicity` (채택 대상의 판정 로직).

## 발화 채널

`package.json` `scripts.check:measurement-tree-attribution` → `scripts/check-measurement-tree-attribution.sh`. 현 HEAD 에서 실재하며 지문 모드 `rc=0`.

**채택률을 재는 채널은 현 HEAD 에 없다.** `RULE-07 §promote 조건 4` 상 이는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다 — (W-2) 가 그 task 의 부착 대상이다.

## 테스트 현황

- [x] 래퍼 실재 — 지문 모드 `rc=0`, `fingerprint=… tracked=421 untracked=0` 발화.
- [x] 래퍼 rc 전파 — 감싼 명령 `exit 3` → `rc=3`.
- [x] 래퍼 무판정 등급 — `--` 뒤 명령 부재 시 `rc=2` (fail-closed).
- [x] 래퍼 드리프트 검출 — 측정 창 안 트리 변경 주입 시 `rc=1` + `category: measurement-tree-drift` + 지문 2개 (§참고 §검출 방향 실측).
- [ ] 채택률 측정 채널 — HEAD 부재. (W-2) 의 부착 대상.

## 수용 기준

> 전 항목 **명령 1회로 rc 판정 가능** (`RULE-07 §수용 기준 문장 규약`). 명령은 `package.json` · `scripts/**` · 래퍼 산출만 참조하며 **어떤 spec 의 green/blue 경로 리터럴도 참조하지 않는다** (`§promote 조건 2`). **무거운 게이트(`check:coverage-attribution`, 측정 4~6분)를 구동하지 않는다** — 채택 여부는 호출 형태의 성질이지 측정 결과의 성질이 아니다.
>
> **펜스 항목 실행 규약** — 펜스 본문을 추출해 `bash -c "$(추출)"` 로 실행한다. 펜스를 쓰는 이유는 명령이 정규식·따옴표를 중첩해 홑백틱 인라인 스팬에 담기지 않기 때문이다.
>
> **HEAD=`559dde0` (tick 238) 기준 3/4** — 미충족 1건은 (W-2) 이며 이것이 본 계약의 판정량이다.

- [x] (Must, W-1) 채택 모집단이 **도출**되고 세 수치가 발화된다 — 판정: (펜스 — 실행 규약은 본 절 머리말)
  ```
  o=$(node -e 'const s=require(process.cwd()+"/package.json").scripts;const ks=Object.keys(s).filter(k=>k.startsWith("check:"));const w=ks.filter(k=>/check-measurement-tree-attribution/.test(s[k]));console.log("total="+ks.length+" wrapper-routed="+w.length);') || exit 2
  printf '%s\n' "$o" | grep -qE '^total=[0-9]+ wrapper-routed=[0-9]+$' || exit 1
  t=$(printf '%s\n' "$o" | sed -nE 's/^total=([0-9]+).*/\1/p')
  [ -n "$t" ] && [ "$t" -ge 20 ] || exit 2
  ```
  → **rc=0**. **HEAD=`559dde0` 실측 rc=0 / `total=27 wrapper-routed=1`.** 하한 `total ≥ 20` 은 "`scripts` 파싱이 깨져 아무것도 세지 않은" 상태를 `exit 2` **무판정**으로 가른다 — 그 상태에서 `wrapper-routed=0` 은 위반이 아니라 무의미다. **이 항목 단독으로는 판정력이 약하다** (수치가 나오기만 하면 통과). 판정량은 (W-2) 이며 이 항목은 그 **전건**이다.
- [ ] (Must, W-2) **미채택 잔여가 0** 이고 잔여는 **이름으로** 발화된다 — 판정: (펜스 — 실행 규약은 본 절 머리말)
  ```
  node -e '
  const fs=require("fs");const s=require(process.cwd()+"/package.json").scripts;
  const ks=Object.keys(s).filter(k=>k.startsWith("check:"));
  if(ks.length<20){console.error("모집단 붕괴 total="+ks.length);process.exit(2);}
  let pop=[],miss=[];
  for(const k of ks){
   const m=s[k].match(/scripts\/[A-Za-z0-9._-]+\.(sh|mjs|js|cjs)/);
   if(!m||!fs.existsSync(m[0]))continue;
   const lines=fs.readFileSync(m[0],"utf8").split("\n").map(l=>l.replace(/^\s*#.*$/,""));
   let d=0,hit=0;
   for(const l of lines){
    if(/^\s*(for|while)\b.*\bdo\b/.test(l)||/^\s*do\s*$/.test(l))d++;
    if(/^\s*done\b/.test(l))d=Math.max(0,d-1);
    if(d>0&&/(^|[^a-zA-Z-])(npx|vitest)\s/.test(l))hit++;
   }
   if(hit>0){pop.push(k);if(!/check-measurement-tree-attribution/.test(s[k]))miss.push(k);}
  }
  if(pop.length<1){console.error("도출 모집단 공허");process.exit(2);}
  console.log("loop-exec-population="+pop.length+" unwrapped="+miss.length+" -> "+miss.join(","));
  process.exit(miss.length===0?0:1);'
  ```
  → **rc=0**. **HEAD=`559dde0` 실측 rc=1 / `loop-exec-population=1 unwrapped=1 -> check:coverage-attribution` → 미충족.** 이것이 계약의 **판정량**이다. 잔여를 **이름으로** 내는 것이 필수다 — `unwrapped=1` 만으로는 어느 게이트가 빠졌는지 관측되지 않고, 수리 주체가 대상을 특정할 수 없다. 모집단 공집합은 `exit 2` 무판정으로 가른다: 도출식이 낡아 아무것도 집지 못하는 상태와 전수 채택된 상태는 **둘 다 `unwrapped=0`** 이며, 구분하지 않으면 도출기 부패가 충족으로 새어 나간다.
- [x] (Must, W-3) 래퍼가 감싼 명령의 `rc` 를 **그대로 전파**하고 지문을 발화한다 — 판정: (펜스 — 실행 규약은 본 절 머리말)
  ```
  out=$(bash scripts/check-measurement-tree-attribution.sh -- bash -c 'exit 3' 2>&1)
  rc=$?
  [ "$rc" -eq 3 ] || exit 1
  printf '%s' "$out" | grep -qE 'fingerprint=[0-9a-f]{8,} tracked=[0-9]+ untracked=[0-9]+ stable'
  ```
  → **rc=0**. **HEAD=`559dde0` 실측 rc=0** — 산출 `fingerprint=43830e28… tracked=421 untracked=0 stable — cmd rc=3`, 전파 `rc=3`. **채택이 기존 등급 계약을 삭감하지 않음**을 이 항목이 지킨다. `exit 3` 을 고른 이유는 채택 0순위 대상이 `0/1/2/3/4` 5등급을 선언하고 있어, 전파가 깨지면 그 등급 체계가 통째로 무너지기 때문이다. `rc` 를 **명령 치환 직후 `$?` 로** 잡는다 — 파이프 뒤에서 잡으면 마지막 명령의 `rc` 를 읽는다.
- [x] (Must, W-4) **무판정 등급이 위반 등급과 구분돼 실재**한다 — 판정: `bash -c 'bash scripts/check-measurement-tree-attribution.sh -- >/dev/null 2>&1; test $? -eq 2'` → **rc=0**. **HEAD=`559dde0` 실측 rc=0** (`--` 뒤 명령 부재 → fail-closed `rc=2`). "위반"(1) 과 "이 측정을 믿을 수 없음"(2) 을 합치면 **드리프트가 트리 결함으로 오귀인되는** 바로 그 사고가 등급 층에서 재발한다. 래퍼가 3분할(`0` 유효 / `1` 드리프트·전파 / `2` fail-closed)을 **보유**함을 관측 산출로 확인한다 — 스크립트 본문 `grep` 으로 판정하지 않는다 (주석에 등급을 적어 두면 통과하는 공허 기준이 된다).

## 참고

### 검출 방향 실측 (HEAD=`559dde0`, tick 238)

(W-1)(W-3)(W-4) 의 `rc=0` 은 **채널이 살아 있다**는 뜻이지 채택이 됐다는 뜻이 아니다. 채택 판정량은 (W-2) 이며 현재 **미충족**이다. 아래는 저장소 트리를 오염시키지 않고 실측한 결과다.

- **(Dir-1) 드리프트 민감도 — 실측 완료.** 측정 창 안에서 미추적 파일 1건을 생성해 감쌌다: 감싼 명령이 `exit 0` 임에도 래퍼가 **`rc=1`** 을 냈고 `MEASUREMENT TREE DRIFT … (category: measurement-tree-drift)` + `before=`/`after=` **지문 2개** + `drift: <경로>` 를 발화했다. **감싼 명령의 `rc` 와 독립**임이 관측으로 확정된다 (rc=0 을 감쌌는데 rc=1 이 나왔다). 프로브 파일은 즉시 제거했고 `git status` 는 공란으로 복귀했다.
- **(Dir-2) 도출 실재 — 실측 완료.** `package.json` **사본**에 루프 실행 스크립트를 가리키는 합성 키 `check:__probe__` 를 추가하니 도출이 `loop-exec-population=1 unwrapped=1` → **`2 / 2`** 로 따라 올랐다 (`-> check:coverage-attribution,check:__probe__`). 즉 모집단은 **`package.json` 의 함수**이지 문서에 적힌 이름 목록이 아니다 — `RULE-06 §열거 고정 금지` 가 요구하는 성질을 **주장이 아니라 측정**으로 보인다. 저장소 `package.json` 은 건드리지 않았다.
- **(Dir-3) 주석 배제 특이도 — 실측 완료.** 주석 절단 없이 "서브프로세스 호출 ≥ 2" 로 도출하면 모집단이 **3** 으로 부풀고 `check:acceptance-criteria`(`Hint:` 문자열 + `awk` 프로그램 텍스트) 와 `check:output-parsing-color-independence`(루프 밖 고정 2회 호출) 가 섞여 들어온다. 루프 본문 한정 + 주석 절단 도출은 **1** 을 낸다.
- **(Dir-4) 미채택 잔여 민감도** — 채택이 완료돼 `unwrapped=0` 이 된 트리에서, 채택을 1건 되돌리면 `rc=1` + 그 키 이름이 발화되는가. **현 HEAD 에서는 주입 불가**다 (아직 채택이 0 이라 되돌릴 것이 없다). 이 방향은 `RULE-07 §처리` 에 따라 **채택 task 의 `## 검증/DoD` 로 이관**하며 developer 는 `RULE-04` notes 에 `injection: N/N detect` 를 박제한다. **이관처 task 발행 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지).

### 등급 충돌 — 채택 시 판별 채널은 `rc` 가 아니다 (tick 238 발견)

래퍼의 드리프트는 **`exit 1`** 이고, 채택 0순위 대상 `check:coverage-attribution` 의 **`exit 1` 은 "단조성 위반 (소실 슬롯 ≥ 1)"** 이다. 즉 채택하는 순간 두 사건이 **같은 `rc`** 로 나온다.

req 가 요구한 FR-05 (*"완전성 붕괴(등급 4) 와 귀속 실패(무판정) 는 같은 rc 로 표현하지 않는다"*) 는 `4 ≠ 1` 이라 문면상 충족되지만, **실제 충돌은 등급 4 가 아니라 등급 1 에서 난다.** req 가 이 쌍을 보지 못했다.

따라서 본 계약은 판별 채널을 `rc` 로 두지 않는다 — 판별은 **`category: measurement-tree-drift` 토큰과 지문 2개**다 (§검출 방향 실측 (Dir-1) 에서 관측). 채택 task 는 이 토큰을 소비자 측에서 읽도록 하거나, 래퍼 등급을 재배정해야 한다. **후자를 본 계약이 지정하지 않는 이유**는 래퍼 등급 체계의 소유권이 blue `foundation/measurement-tree-attribution` 에 있기 때문이다 — 여기서 바꾸면 두 계약이 같은 표면을 이중 소유한다.

### 미측정·비판정 항목

- **(측정치 정정 — req NFR-01 반증) 지문 산출 비용.** req 는 *"추적 파일 전량 해시 0.1s 미만 (followup 실측 승계)"* 을 적었으나 **현 HEAD 실측은 5.0s** 다 (추적 421 파일, 3회 반복 `5006 / 4991 / 4994 ms` — 콜드 스타트 아님). 래퍼는 지문을 2회 산출하므로 감싼 측정에 **약 10s** 가 붙는다. 채택 0순위 대상의 측정 창이 4~6분이므로 상대 비용은 **약 3%** 이고 채택의 제약이 아니다 — 결론은 req 와 같지만 **근거 수치는 다르다**. 인용을 받아쓰지 않고 재측정했다: 승계된 수치가 두 자릿수 배로 틀린 채 계약에 박히면, 이후 그 수치를 근거로 한 채택 범위 판단이 전부 틀린다. **(v) 가 `check:*` 전종 일괄 적용을 배제한 근거가 이 실측이다** — 짧은 게이트에 10s 를 붙이면 채택이 되돌려진다.
- **(미측정) 도출식이 놓치는 다회 실행 형태.** 현 도출은 `for`/`while` 루프 본문의 `npx`/`vitest` 만 집는다. 재귀 · `xargs` · `find -exec` · 백그라운드 잡으로 다회 실행하는 게이트가 생기면 모집단 밖이다. 현 HEAD 에 그런 게이트는 **0건**임을 27종 전수 순회로 확인했으나, 장래 유실 확률은 본 계약이 다루지 않는다 — 모집단이 좁다는 **사실의 가시화**는 (W-1) 의 `loop-exec-population` 발화가 담당한다.
- **(미측정) 2026-08-25 사고의 사후 재현.** 당시 트리 복원이 필요하고 시점 의존이라 판정 대상이 아니다. 계약은 **래퍼 경유 여부**로 한정한다.
- **(중복 게이트 — 체크박스 제외) `npm test` · `check:*` 전종 `rc=0`.** 위반 시 husky·CI 가 즉시 실패하므로 `RULE-07 §반려 시그널` 의 중복 게이트 부류다. 전제로만 남긴다.

### 인접 계약 — 중복이 아닌 근거

- **blue `foundation/measurement-tree-attribution` (REQ-20260825-026)** — 래퍼 **자체**의 계약을 소유한다: 지문이 내용을 반영할 것, 종료 코드 3분할, read-only, 발화 채널 식별자. 본 계약은 그 래퍼를 **누가 경유하는가**를 소유한다. 그 spec 은 §역할 에서 채택률을 다루지 않으며, 실제로 그 계약이 4/4 충족인 상태에서 채택은 0 이었다 — **계약 충족과 계약 도달이 갈라진 자리**가 정확히 여기다.
- **blue `foundation/coverage-per-file-attribution-monotonicity`** — 채택 0순위 대상의 **판정 로직**(샤드 열거 · 소실 슬롯 · 등급 0~4)을 소유한다. 본 계약은 그 판정이 **어떤 트리에 귀속되는가**만 다루며 판정 내용에 개입하지 않는다.
- **green `testing/judgement-command-derivation-completeness` (REQ-20260826-028)** — "도출한 모집단이 참 모집단을 대표하는가" 라는 **같은 형상**을 spec 판정 명령 층에서 소유한다. 본 계약은 그 형상을 **게이트 채택 층**에서 재현한 것이며, 두 계약은 같은 실패 부류(민감도 0)를 서로 다른 표면에서 막는다. 그 spec §역할 (vi) 이 `check:*` 전종 일괄 적용을 배제한 판단을 본 계약도 (v) 에서 따른다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-28 | REQ-20260828-038 (inspector tick 238) | 최초 등록. **req 수용 기준 6항을 그대로 쓰지 않았다**: (a) req 3항 *"`check:coverage-attribution` 값에 래퍼가 포함된다"* 는 **스크립트명 리터럴을 판정 입력으로 쓰므로** req 자신의 FR-01(`RULE-06 §열거 고정 금지`)과 충돌한다 — (W-2) 의 **도출 기반 잔여 계수**로 흡수하고, 현 유일 원소가 `check:coverage-attribution` 이라는 사실은 §동작 실측표에 **관측으로** 박제했다. (b) req 5항 *"`grep -nE '무관하게' <래퍼>`"* 는 **스크립트 본문 grep** 이라 주석 문구만으로 충족되는 공허 기준이다 — 관측 산출 기반 (W-3)(W-4) 로 교체했다. (c) req 6항 *"하드코딩 여부를 검사"* 는 판정 형태가 정의되지 않아 체크박스에서 내리고, 대신 **사본 `package.json` 합성 키 주입**으로 도출 실재를 §참고 (Dir-2) 에 실측 박제했다. (d) req 4항의 지문·rc 전파를 (W-3) 하나로 합쳤다. (e) **req NFR-01 을 반증했다** — 승계된 `0.1s 미만` 은 현 HEAD 실측 `5.0s` 와 두 자릿수 배 차이이며 §미측정·비판정 항목 에 정정 박제했다 (결론은 불변, 근거 수치는 교체). (f) **req 가 보지 못한 등급 충돌을 발견해 §참고 에 신설했다** — FR-05 는 `등급 4 vs 무판정` 만 봤으나 실제 충돌은 래퍼 드리프트 `exit 1` 과 채택 대상 단조성 위반 `exit 1` 사이에 있다. (g) §동작 에 **주석 배제** 절을 신설했다 — 주석 미절단 도출은 모집단을 1 → 3 으로 부풀리고 `Hint:` 문자열·`awk` 프로그램 텍스트를 실호출로 오계수한다 (실측). | all |
