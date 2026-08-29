# 게이트 배선 실행 표면 정합

## 역할

`package.json scripts.check:*` · `.husky/pre-commit` · `scripts/**` 3자의 배선 정합을 **실행 표면**에서 규정한다.

**방어 대상** (RULE-07 §주제 우선순위 2 요건):

1. **실행 라인 삭제 + 주석 잔존** — 게이트 호출이 훅에서 빠졌는데 문자열 `grep` 기반 배선 판정은 주석 한 줄로 초록을 유지한다.
2. **게이트 스크립트 자체 회귀** — pre-commit 발화 조건이 `^scripts/` 를 포함하지 않아 정규식 오타·가드 제거가 로컬 커밋에서 무발화 통과한다.
3. **훅 호출과 npm script 의 경로 분기** — 훅이 낡은 경로를 부르거나 이름이 어긋나도 양쪽을 개별로 보면 정상으로 보인다.
4. **선언 파일 표기 변경에 의한 판정 정지** — `package.json` 의 직렬화 형태가 바뀌면 원문 교차 검증의 라인 계수가 0 이 되어 배선 판정 전체가 무판정으로 멈춘다. 배선이 실제로 깨졌는지 여부와 무관하게 **관측이 사라진다** (FR-06).

네 부류 모두 기존 자동 게이트로 검출되지 않는다.

## 동작

### FR-01 — `check:*` 진입점은 전부 파일 호출이다 (Must)

모든 `check:*` npm script 값은 `scripts/` 아래 **실재 파일**을 호출하는 단일 형태다. 셸 로직이 `package.json` 문자열 안에 인라인되지 않는다.

- 값 형태: `bash scripts/<name>.sh`.
- 도출된 각 경로는 현 HEAD 트리에 실재한다.

### FR-02 — 훅 호출 경로 ⊆ npm script 경로 (Must)

`.husky/pre-commit` 이 호출하는 스크립트 경로 집합은 `scripts.check:*` 가 가리키는 경로 집합의 부분집합이다. 훅에만 존재하거나 이름이 어긋난 호출은 위반이다.

### FR-03 — 배선 판정의 관측 표면은 실행 라인이다 (Must)

배선 실재 판정은 **실행 라인**에서만 성립한다. 주석·문서 문자열은 배선을 충족시키지 않는다.

- 실행 라인을 제거하고 주석만 남기면 판정은 `rc≠0`.
- 판정 대상 라인에서 `#` 이후 구간은 계수에서 제외된다.

### FR-04 — 발화 조건은 자기 게이트 스크립트를 포함한다 (Must)

`.husky/pre-commit` 의 각 조건 블록의 발화 조건 정규식은, 같은 블록이 호출하는 스크립트 경로에 **매치**한다. 게이트 스크립트의 변경은 그 게이트의 발화 조건이다.

### FR-05 — 게이트는 staged 집합이 아니라 트리를 측정한다 (Should)

게이트 스크립트가 자신의 변경으로 발화할 때, 측정 대상 경로가 staged 가 아니어도 정상 판정한다. 게이트의 측정 대상은 staged diff 가 아니라 작업 트리다.

### FR-06 — 선언 파일 교차 검증은 직렬화 형태에 비종속이다 (Must)

회피 경로 차단을 위한 원문 교차 검증(파싱된 키 수 ↔ 선언 파일 원문의 키 계수)은 `package.json` 의 **직렬화 형태**에 종속되지 않는다. 들여쓰기 규약 변경이나 1줄 직렬화가 원문 계수를 0 으로 만들어 게이트를 **무판정**(`exit 2`)으로 떨어뜨려서는 안 된다.

- 은닉 차단 목적은 유지한다 — 파싱 결과와 원문의 교차 검증 자체는 남는다. 바뀌는 것은 **계수 단위**이며, 라인 단위가 아니라 선언 토큰 단위여야 한다.
- 현 구현은 `scripts/check-gate-wiring.sh` 의 `pkgRaw.split("\n") … /^\s*"check:[^"]*"\s*:/` (`:159-163`) 로 **라인 기반**이며, 불일치 시 `:178-182` 가 `NO-JUDGEMENT: key-count-incoherent` 를 낸다.
- 계수 단위가 선언 토큰이면 **같은 행 중복 선언**도 관측된다. 한 줄에 같은 키가 두 번 선언되면 파싱 결과는 뒤가 앞을 가려 1건이지만 원문 선언 토큰은 2건이므로 교차 검증이 불일치를 낸다. 라인 계수는 이 부류를 원리적으로 보지 못한다 — 줄이 1개라 파싱 수와 우연히 일치하기 때문이다. 즉 토큰 단위는 무판정 회피(형태 비종속)뿐 아니라 **은닉 차단의 검출력 자체를 넓힌다**.
- 방향은 fail-closed 라 조용한 초록은 아니다. 그러나 **표기 우연이 판정을 멈춘다** — 판정이 대상의 구조가 아니라 줄바꿈 위치에 걸려 있는 형태이며, 채택 술어 층의 이름 우연(`measurement-tree-attribution-wrapper-adoption` §이름은 채널이 아니다)과 같은 부류다.

### 발화 채널 (RULE-07 §promote 조건 4)

본 계약의 Must 판정은 아래 실경로에서 발화한다.

- `package.json` → `scripts.check:gate-wiring`
- `.github/workflows/ci.yml` → 해당 step
- `.husky/pre-commit` → `^(package\.json|\.husky/pre-commit|scripts/)` 발화 블록

## 수용 기준

- [x] `check:*` 값이 전부 `bash scripts/<name>.sh` 단일 형태다 — `node -e "const s=require('./package.json').scripts;const e=Object.entries(s).filter(([k])=>k.startsWith('check:'));const bad=e.filter(([k,v])=>!/^bash scripts\/[A-Za-z0-9._-]+\.sh$/.test(v.trim()));console.log(e.length>=1?1:0,bad.length);process.exit(e.length&&!bad.length?0:1)"` → 출력 `1 0` / rc=0. 첫 필드는 측정 대상 집합이 공집합이 아님을 단언한다 — 도출 0 이면 위반 0 이 되어 초록으로 읽히는 형태를 차단한다. `check:*` 종수 절대값은 고정하지 않는다.
- [x] `check:*` 가 지시하는 모든 스크립트 파일이 실재한다 — `node -e "const fs=require('fs');const s=require('./package.json').scripts;const p=[...new Set(Object.entries(s).filter(([k])=>k.startsWith('check:')).flatMap(([,v])=>v.match(/scripts\/[A-Za-z0-9._\/-]+\.sh/g)||[]))];const miss=p.filter(f=>!fs.existsSync(f));console.log(miss.length);process.exit(miss.length?1:0)"` → 출력 `0` / rc=0.
- [x] `.husky/pre-commit` 실행 라인에서 호출되는 `scripts/*.sh` 경로 집합이 `scripts.check:*` 도출 경로 집합의 부분집합이다 — `node -e "const fs=require('fs');const R=/scripts\/[A-Za-z0-9._\/-]+\.sh/g;const s=require('./package.json').scripts;const D=new Set(Object.entries(s).filter(([k])=>k.startsWith('check:')).flatMap(([,v])=>v.match(R)||[]));const H=[...new Set(fs.readFileSync('.husky/pre-commit','utf8').split('\n').map(l=>l.replace(/#.*/,'')).join('\n').match(R)||[])];const d=H.filter(x=>!D.has(x));console.log(d.length);process.exit(H.length&&!d.length?0:1)"` → 출력 `0` / rc=0. 각 라인의 `#` 이후 구간은 계수 전에 절단하며(FR-03), 훅 도출 개수 0 이면 `rc≠0`.
- [ ] `.husky/pre-commit` 의 각 발화 조건 블록에 대해, 같은 블록이 호출하는 스크립트 경로가 그 조건 정규식에 매치한다 — `node -e "const fs=require('fs');const R=/scripts\/[A-Za-z0-9._\/-]+\.sh/g;const L=fs.readFileSync('.husky/pre-commit','utf8').split('\n').map(l=>l.replace(/#.*/,''));let b=0,pr=0,bad=0,re=null,cur=[];const fl=()=>{if(re)for(const q of cur){pr++;if(!new RegExp(re).test(q))bad++}re=null;cur=[]};for(const l of L){const m=l.match(/grep -qE '(.*)'/);if(m){fl();re=m[1];b++;continue}if(/^\s*fi\b/.test(l)){fl();continue}if(re)cur.push(...(l.match(R)||[]))}fl();console.log(b>=1&&pr>=1?1:0,bad);process.exit(b&&pr&&!bad?0:1)"` → 출력 `1 0` / rc=0. 각 라인의 `#` 이후 구간은 계수 전에 절단한다(FR-03). 첫 필드는 조건 블록 수와 (블록, 스크립트) 쌍 수가 모두 ≥1 임을 단언한다 — 어느 한쪽이 0 이면 불일치 0 이 되어 초록으로 읽히므로 위반이다. 블록·쌍 절대값은 고정하지 않는다. **실측 2026-08-28 (HEAD `ec82e08`, tick 240 재실행): `1 4` rc=1 → 미충족 유지.** `TSK-20260828-08` 이 `.husky/pre-commit` 에 조건 블록 1개(`:155-156` `check-task-precondition-scope`)를 추가했음에도 둘째 필드가 4 로 불변이다 — 신규 블록은 자기 조건 정규식에 매치하므로 불일치를 늘리지 않았다. 즉 이 4 는 신규 유입이 아니라 **기존 잔여**이며, 훅에 블록이 늘어도 악화되지 않는 축임이 delta 를 가진 tick 에서 관측됐다 (직전 실측 HEAD `dac5a60` 과 동일 문자열).
- [x] 배선 정합 게이트가 `package.json scripts.check:*` 에 등재되고 `.github/workflows/ci.yml` 에서 실행 라인으로 호출된다 — `node -e "const fs=require('fs');const K='check:gate-wiring';const s=require('./package.json').scripts;const a=typeof s[K]==='string'&&s[K].trim().length>0?1:0;const ci=fs.readFileSync('.github/workflows/ci.yml','utf8').split('\n').map(l=>l.replace(/#.*/,'')).filter(l=>/run:\s*npm run check:gate-wiring(\s|$)/.test(l)).length;console.log(a,ci?1:0);process.exit(a&&ci?0:1)"` → 출력 `1 1` / rc=0. ci 측 계수는 주석 절단 후 `run:` 실행 라인에 한정한다 — 단순 문자열 포함 계수는 `ci.yml` 주석에 적힌 게이트 이름을 배선으로 오인한다(FR-03). **실측 2026-08-28 (HEAD `dac5a60`): `1 1` rc=0 → 충족** (`scripts.check:gate-wiring` = `bash scripts/check-gate-wiring.sh`, `ci.yml:167`).
- [x] 배선 정합 게이트가 `.husky/pre-commit` **실행 라인**에서 호출된다 (§발화 채널 3경로 중 훅) — `node -e "const fs=require('fs');const K='check-gate-wiring.sh';const n=fs.readFileSync('.husky/pre-commit','utf8').split('\n').map(l=>l.replace(/#.*/,'')).filter(l=>l.includes('scripts/'+K)).length;console.log(n?1:0);process.exit(n?0:1)"` → 출력 `1` / rc=0. 주석 절단 후 계수하므로 훅의 설명 주석(`# npm script 동치: check:gate-wiring`)은 배선을 충족시키지 않는다(FR-03). **실측 2026-08-28 (HEAD `dac5a60`): `1` rc=0 → 충족** (`.husky/pre-commit:141` 실행 라인; 주석 `:129`·`:131` 은 계수 제외). 음성 대조(인메모리, 트리 무변경): 해당 실행 라인을 주석으로 내린 변형에서 계수 0 → rc=1.
- [x] 도출 명령이 공집합을 초록으로 읽지 않는다 — `node -e "const s=require('./package.json').scripts;const p=[...new Set(Object.entries(s).filter(([k])=>k.startsWith('check:')).flatMap(([,v])=>v.match(/scripts\/[A-Za-z0-9._\/-]+\.sh/g)||[]))];console.log(p.length>=1?1:0);process.exit(p.length?0:1)"` → 출력 `1` / rc=0 (RULE-06 §추출 실패 검출). 도출 개수 절대값은 고정하지 않는다.
- [x] (FR-06) `package.json` 을 1줄로 직렬화한 probe root 에서 배선 판정이 `key-count-incoherent` 무판정으로 멈추지 않는다 — 판정: (펜스)
  ```
  S=$(mktemp -d) || exit 2
  [ -n "$S" ] || exit 2
  cp -R scripts "$S/scripts" || exit 2
  cp -R .husky "$S/.husky" || exit 2
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[1]+"/package.json",JSON.stringify(JSON.parse(fs.readFileSync("package.json","utf8")))+"\n")' "$S" || exit 2
  o=$(GATE_WIRING_SCAN_ROOT="$S" bash scripts/check-gate-wiring.sh 2>&1); r=$?
  printf '%s\n' "$o" | grep -q 'key-count-incoherent' && exit 1
  [ "$r" -eq 0 ] || exit 1
  ```
  → **rc=0**. **HEAD=`5a697f8` (tick 243) 실측 rc=0 → 충족.** 1줄 직렬화 probe root 산출이 정상 트리와 동일하다 (`check-keys=28 derived-paths=28 hook-paths=15 hook-comment-paths=0 (PASS)` rc=0, 2회 재실행 동일 — 멱등). `TSK-20260829-06` (`5a697f8`) 이 `scripts/check-gate-wiring.sh:159-163` 의 라인 계수 `pkgRaw.split("\n") … /^\s*"check:[^"]*"\s*:/` 를 전문 전역 토큰 계수 `(pkgRaw.match(/"check:[^"]*"\s*:/g) || []).length` 로 교체했고 수치명도 `raw-lines=` → `raw-decls=` 로 바뀌었다. probe root 는 `mktemp -d` 아래에 구성되고 `scripts/` · `.husky/` 는 현 트리 사본이며 저장소 트리를 건드리지 않는다.
- [x] (FR-06 음성 대조) 원문 교차 검증의 **은닉 차단 목적이 퇴행하지 않는다** — 현 HEAD 에서 배선 판정이 `rc=0` 이고 발화된 `check-keys` 가 `package.json` 파싱 키 수와 일치한다 — 판정: (펜스)
  ```
  o=$(bash scripts/check-gate-wiring.sh 2>&1) || exit 1
  n=$(node -e 'console.log(Object.keys(require(process.cwd()+"/package.json").scripts).filter(k=>k.startsWith("check:")).length)')
  [ -n "$n" ] && [ "$n" -ge 1 ] || exit 2
  printf '%s\n' "$o" | grep -q "check-keys=$n " || exit 1
  ```
  → **rc=0**. **HEAD=`5a697f8` (tick 243) 재실행 rc=0 — 보존** (`check-keys=28 derived-paths=28 hook-paths=15 hook-comment-paths=0 (PASS)`, 파싱 키 수 28). 절대 종수를 고정하지 않고 **두 계수의 일치**를 요구한다 — FR-06 수리가 교차 검증을 느슨하게 해서 통과시키는 경로를 이 항목이 막는다. 라인 계수 → 토큰 계수 교체가 이 일치를 깨지 않았음이 delta 를 가진 tick 에서 관측됐다. 이 항목이 특이도(정상 트리에서 계수가 여전히 맞는가)를 지고, 앞 항목이 무판정 회피(형태 변경에서 멈추지 않는가)를, 다음 항목이 민감도(은닉 주입에서 발화하는가)를 진다.
- [x] (FR-06 민감도) 원문 교차 검증이 **같은 행 중복 선언**을 무판정으로 잡는다 — 판정: (펜스)
  ```
  S=$(mktemp -d) || exit 2
  [ -n "$S" ] || exit 2
  cp -R scripts "$S/scripts" || exit 2
  cp -R .husky "$S/.husky" || exit 2
  node -e 'const fs=require("fs");const S=process.argv[1];const j=JSON.parse(fs.readFileSync("package.json","utf8"));const k=Object.keys(j.scripts).filter(x=>x.startsWith("check:"))[0];if(!k)process.exit(2);let o=JSON.stringify(j,null,2);const L=o.split("\n").find(l=>l.trim().startsWith(JSON.stringify(k)+":"));if(!L)process.exit(2);o=o.replace(L,L.replace(/,\s*$/,"")+", "+L.trim());JSON.parse(o);fs.writeFileSync(S+"/package.json",o+"\n")' "$S" || exit 2
  o=$(GATE_WIRING_SCAN_ROOT="$S" bash scripts/check-gate-wiring.sh 2>&1); r=$?
  printf '%s\n' "$o" | grep -q 'key-count-incoherent' || exit 1
  [ "$r" -ne 0 ] || exit 1
  ```
  → **rc=0**. **HEAD=`5a697f8` (tick 243) 실측 rc=0 → 충족.** 주입은 기존 `check:*` 키 1건을 같은 줄에 두 번 선언하는 형태이며 JSON 으로 유효하다(뒤가 앞을 가림). 파싱 키 수는 28 로 불변이고 원문 선언 토큰은 29 가 되어 `NO-JUDGEMENT: key-count-incoherent — parsed=28 raw-decls=29` `rc=2` 가 발화한다. 주입 키는 `check:*` 집합의 첫 원소로 도출하며 이름을 고정하지 않는다. 이 항목이 앞 두 항목과 함께 3방향을 이룬다 — 형태 변경에서 멈추지 않음(무판정 회피) · 정상 트리에서 계수 일치(특이도) · 은닉 주입에서 불일치 발화(민감도).

## 참고

### 미측정·비판정 항목

- `.github/workflows/ci.yml` step 집합과 `check:*` 집합의 정합은 인접 축이나 본 계약은 규정하지 않는다. 그 축(선언된 게이트의 발화 채널 총성)은 `30.spec/green/foundation/declared-gate-firing-channel-totality.md` 가 인수한다 — 본 항목은 미측정이 아니라 **이관 완료**다.
- `check:build-artifact` 를 파일로 추출한 뒤의 동작 동일성은 추출 task 의 DoD 로 판정한다.
- FR-03 의 주석-비의존 판정은 게이트 도입 시점 1회 주입으로만 확인된다. 검출 방향 2축을 선언으로 보존한다 — (민감도) 훅의 스크립트 호출 실행 라인 1건을 주석으로 내린 변형 트리에서 게이트는 `rc≠0` 이어야 한다. (특이도) 원복 트리 및 주석만 늘어난 정상 변형 트리에서는 `rc=0` 이어야 한다. 이 주입은 배선 정합 게이트 도입 task 의 DoD 로 이관한다 (RULE-06 §게이트 실효 검증, RULE-07 §처리).
- 위 두 이관 항목(FR-03 · FR-05)의 이관처 task 는 현 HEAD 에 아직 없다. 이관처는 `declared-gate-firing-channel-totality` 가 요구하는 **발화 채널 총성 게이트 신설 task** 로 지정한다 (그 spec §미측정·비판정 항목 > 승계 이관). 배선 정합 게이트 도입 task 발행이 필요하며, 그 task 의 `## 검증/DoD` 에 두 방향 주입을 `injection: 2/2 detect` 로 박제한다.
- FR-05 (Should) 의 "staged 아님에도 정상 판정" 은 게이트 도입 시점 1회 주입으로만 확인 가능하므로, 그 주입은 게이트 도입 task 의 DoD 로 이관한다 (RULE-06 §게이트 실효 검증, RULE-07 §처리 — 이관처: 배선 정합 게이트 도입 task).
- `scripts/check-commit-writer-coherence.sh` 의 경로 분류 12갈래 중 8갈래(`10.followups` · `20.req` · `40.task` · `50.blocked/{req,task}` · `60.done/*/{req,task,followups}`)는 해당 경로가 gitignore 대상이라 커밋 diff 에 실릴 수 없어 구조적으로 도달 불가다. 배선은 살아 있으나 집행 대상이 공집합인 형태 — 본 계약 방어 대상 (1) 의 사촌 축이며 별도 req 로 다룬다.
- 기존 게이트 회귀 0(`npm test` rc=0)은 본 계약의 수용 기준에서 제외한다. 회귀 부재는 이미 pre-commit·ci 가 집행하는 명제라 여기 체크박스로 두면 중복 게이트이며(RULE-07 §반려 시그널), 본 계약은 코드 변경을 스스로 만들지 않아 판정 시점도 계약에 귀속되지 않는다. 회귀 검증의 귀속처는 배선 정합 게이트 도입 task 의 `## 검증/DoD` 다 — 그 task 발행 요청은 `specs/10.followups/20260826-1830-gate-wiring-coherence-gate-issuance.md` 에 이미 있다.

### 관측 근거

- 실측 (HEAD `4014c66`): `.husky/pre-commit:23` 주석 `# npm script 동치: check:monitor-state-immutability`, `:26` 실행 `bash scripts/check-monitor-state-immutability.sh || exit 1`. `:26` 제거 + `:23` 잔존 시 배선 grep 판정 초록.
- 실측 (HEAD `abefbb8`) — pre-commit 조건 블록 **9건** 중 **4건**이 FR-04 위반이다. 자기 스크립트 경로를 발화 조건에 포함하지 않는 블록:

| 조건 라인 | 발화 조건 | 호출 라인 | 스크립트 | FR-04 |
|---|---|---|---|---|
| `:5` | `^(src/\|specs/30\.spec/)` | `:6` | check-spec-coherence.sh | 위반 |
| `:11` | `^src/` | `:12` | check-vite-env-coherence.sh | 위반 |
| `:17` | `^(package\.json\|package-lock\.json)$` | `:18` | check-deps-coherence.sh | 위반 |
| `:25` | `^src/Monitor/` | `:26` | check-monitor-state-immutability.sh | 위반 |
| `:34` | `^(src/\|scripts/check-test-double-shape-fidelity\.sh$)` | `:35` | check-test-double-shape-fidelity.sh | 충족 |
| `:43` | `^(src/\|scripts/check-api-base-url-totality\.sh$)` | `:44` | check-api-base-url-totality.sh | 충족 |
| `:52` | `^(\.env\|src/types/env\.d\.ts$\|scripts/check-env-api-base-presence\.sh$)` | `:53` | check-env-api-base-presence.sh | 충족 |
| `:63` | `^(src/common/Navigation\|scripts/check-declared-branch-discrimination\.sh$)` | `:64` | check-declared-branch-discrimination.sh | 충족 |
| `:74` | `^(scripts/check-\|scripts/fixtures/)` | `:75` | check-gate-seam-coverage.sh | 충족 |

- 실측 (HEAD `abefbb8`) — FR-01 위반 **1건** (`check:build-artifact`), FR-02 차집합 **0건** (훅 호출 9 경로 ⊆ 도출 20 경로), 도출 경로 개수 **20 / `check:*` 21종**. 도출 실패 1건이 곧 FR-01 위반 1건과 동일 항목이다.
- `check:*` 종수는 req 작성 시점 15종에서 현재 21종으로 증가했다 — 수용 기준은 절대 종수를 고정하지 않는다.
- 실측 (HEAD `9cf62a4`) — FR-01 위반 **0건**. 도출 키 **22종** 전부 `bash scripts/<name>.sh` 단일 형태이며 비-경로 형태 0건이다. `TSK-20260827-01` (`c084b28`) 이 `check:build-artifact` 의 인라인 셸 13행을 `scripts/check-build-artifact.sh` 로 추출해 마지막 위반이 해소됐다. 판정 명령 2회 재실행 rc=0 동일(멱등). 음성 대조(인메모리) — 비-경로 값 키 1건 주입 시 출력 `1 1 check:__probe` rc=1 로 검출된다.
- 실측 (HEAD `dac5a60`) — `TSK-20260828-02` (`c8965a9`) 가 `check:gate-wiring` 을 신설·배선했다. 게이트 자체 실행 `npm run check:gate-wiring` → `check-keys=27 derived-paths=27 hook-paths=14 hook-comment-paths=0 (PASS)` rc=0. `check:*` 종수는 21 → 27 로 증가했고 수용 기준은 절대 종수를 고정하지 않는다. FR-04 위반 4건은 미해소이며 본 착지로 악화되지 않았다(`1 4` 불변).
- 실측 (HEAD `5a697f8`) — `TSK-20260829-06` 착지로 FR-06 이 해소됐다. 1줄 직렬화 probe root 판정 `rc=1 → rc=0` 전이, 산출 4수치는 정상 트리와 동일(`28/28/15/0`)이라 라벨·fail-closed 방향·절대 종수 비고정이 모두 보존됐다.
- 실측 (HEAD `5a697f8`) — 구·신 구현 교차 대조 (동일 probe root, 저장소 무변경). 같은 행 중복 선언 주입 시 **구 라인 계수 게이트는 `PASS` rc=0**(`check-keys=28 derived-paths=28 hook-paths=15 hook-comment-paths=0`), **신 토큰 계수 게이트는 `NO-JUDGEMENT: key-count-incoherent — parsed=28 raw-decls=29` rc=2**. 구 구현의 blind spot 은 라인이 1개라 파싱 수와 우연히 일치하는 데서 왔다 — `raw-lines=29` 류 불일치보다 강한 은닉이며 fail-closed 로도 걸러지지 않았다. 인접 관측은 `specs/10.followups/20260829-2140-gate-wiring-line-count-same-line-hiding.md` (discovery 소관).
- 소비 followup 3건 병합: `20260825-0700-pre-commit-wiring-observation-surface` (FR-03) · `20260825-1105-precommit-gate-trigger-excludes-gate-script` (FR-04·05) · `20260824-2236-check-script-logic-inlined-in-package-json` (FR-01).

## 변경 이력

- 2026-08-24 inspector: REQ-20260825-010 흡수 — green 신규 등록.
- 2026-08-26 inspector: §관측 근거 baseline 을 현 HEAD 실측으로 갱신 — pre-commit 조건 블록 9건 중 FR-04 위반 4건, FR-01 위반 1건, FR-02 차집합 0건, 도출 20/21.
- 2026-08-26 inspector: 가정 주입 요구 체크박스 1건(주석-비의존 판정)을 §미측정·비판정 항목으로 강등 — 검출 2축(민감도·특이도) 선언 보존 + 이관처 task 발행 필요 박제.
- 2026-08-26 inspector: 수용 기준 2항(도출 경로 실재) 판정 명령 박제 후 실행 — 결손 0건 rc=0, `[x]` 확정.
- 2026-08-26 inspector: 수용 기준 3항(훅 호출 ⊆ npm script 도출) 판정 명령 박제 후 실행 — 훅 실행 라인 도출 9건, 차집합 0건 rc=0, `[x]` 확정.
- 2026-08-26 inspector: 수용 기준 4항(FR-04 발화 조건 자기 포함) 판정 명령 박제 후 실행 — 블록 9건 중 불일치 4건 rc=1, `[ ]` 유지 (§관측 근거 표와 일치).
- 2026-08-26 inspector: 수용 기준 5항(발화 채널 실재) 판정 명령 박제 후 실행 — `check:gate-wiring` 미등재·ci step 부재로 출력 `0 0` rc=1, `[ ]` 유지. RULE-07 §promote 조건 4 상 채널 부착 task 발행이 선행 조건이다.
- 2026-08-26 inspector: 수용 기준 6항(공집합 비-초록) 판정 명령 박제 후 실행 — 도출 개수 ≥1 단언 rc=0, `[x]` 확정. 절대 개수는 고정하지 않는다.

- 2026-08-26 inspector: 수용 기준 1항(FR-01 단일 형태) 판정 명령을 공집합 비-초록 단언 포함으로 박제 후 실행 — 출력 `1 1` rc=1, 위반 1건(`check:build-artifact` 인라인 셸)으로 `[ ]` 유지.
- 2026-08-26 inspector: 수용 기준 4항(FR-04) 판정 명령에 (블록, 스크립트) 쌍 수 ≥1 단언 추가 후 재실행 — 출력 `1 4` rc=1, 불일치 4건으로 `[ ]` 유지. 쌍 수 0 이면 불일치 0 이 되어 초록으로 읽히던 공집합 경로를 차단.
- 2026-08-26 inspector: 수용 기준 5항(발화 채널 실재) ci 계수를 주석 절단 후 `run: npm run <key>` 실행 라인 한정으로 좁힘 — 음성 대조 `check:gate-wiring` rc=1 (`0 0`), 양성 대조 `check:deps`·주석+실행 혼재 `check:commit-writer-coherence` rc=0 (`1 1`). `[ ]` 유지 — RULE-07 §promote 조건 4 상 채널 부착 task 발행이 선행 조건.
- 2026-08-26 inspector: 수용 기준 7항(`npm test` 회귀 0)을 §미측정·비판정 항목으로 강등 — 기존 자동 게이트 중복 명제이며 귀속처는 게이트 도입 task DoD (이관처 followup 기발행).
- 2026-08-27 inspector: §미측정 1행(ci step ↔ `check:*` 정합 제외)을 `declared-gate-firing-channel-totality` 이관 완료로 정정 + FR-03·FR-05 주입 이관처 task 지정.
- 2026-08-27 inspector: 수용 기준 1항(FR-01 단일 형태) 재실행 — `c084b28` 이후 출력 `1 0` rc=0 (도출 22종, 비-경로 0건), 멱등 2회 동일 + 음성 대조 rc=1 확인 후 `[x]` 확정.
- 2026-08-28 inspector: Phase 1 reconcile — 수용 기준 5항(발화 채널 실재) 재실행, `c8965a9` 착지로 출력 `0 0` rc=1 → `1 1` rc=0 전이 확인 후 `[x]` 확정. RULE-07 §promote 조건 4 의 채널 부착 선행 조건 해소.
- 2026-08-28 inspector: §발화 채널이 선언한 3경로 중 미측정이던 `.husky/pre-commit` 실행 라인 항목을 수용 기준에 추가 — 주석 절단 후 계수 `1` rc=0, 인메모리 음성 대조 rc=1. 등재와 배선을 함께 요구한다(`declared-gate-firing-channel-totality`).
- 2026-08-28 inspector: 수용 기준 1·2·3·6항 재실행 전수 rc=0 보존 확인 (`1 0` / `0` / `0` / `1`), 4항(FR-04) `1 4` rc=1 비악화 → `[ ]` 유지.
- 2026-08-29 inspector: REQ-20260829-046 흡수 — FR-06(선언 파일 교차 검증의 직렬화 형태 비종속) 신설 + 방어 대상 4번 추가. 수용 기준 2항 추가: 1줄 직렬화 probe root 판정 `rc=1` 미충족(`key-count-incoherent parsed=28 raw-lines=0` 재현) · 음성 대조 현 HEAD `check-keys` = 파싱 키 수 `rc=0`. FR-01 `VALUE_RE`(`:136`)는 완화하지 않는다 — req Out-of-Scope 명시.
- 2026-08-29 inspector: Phase 1 reconcile — FR-06 항목 재실행, `5a697f8` 착지로 `rc=1 → rc=0` 전이 확인 후 `[x]` 확정. 음성 대조 항목 rc=0 보존. 수용 기준 1·2·3·6항 재실행 전수 rc=0 보존(`1 0` / `0` / `0` / `1`), 4항(FR-04) `1 4` rc=1 불변 → `[ ]` 유지.
- 2026-08-29 inspector: FR-06 에 **같은 행 중복 선언** 부류를 명시하고 민감도 수용 기준 1항 신설 — 구 라인 계수 `rc=0` 위음성 / 신 토큰 계수 `rc=2` 검출을 동일 probe root 에서 대조 박제. 미충족은 FR-04 1건만 남는다.
