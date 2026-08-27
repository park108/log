# 도구 출력 판독은 색상 비종속이며 fail-closed 다

> **위치**: `package.json` 의 `scripts.check:*` 와 그 값이 가리키는 `scripts/*.sh` — 판독 지점 `scripts/check-deps-coherence.sh` 의 `ls_out`, `scripts/check-package-manager-coherence.sh` 의 `runtime_version`, 준수 예시 `scripts/check-build-artifact.sh` 의 `out` → `summary`.
> **관련 요구사항**: REQ-20260825-012
> **최종 업데이트**: 2026-08-27 (by inspector — 신규 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

게이트가 **다른 도구(vitest · npm · eslint · tsc · vite)의 출력을 패턴으로 판독**할 때, 그 판정은 (a) 호출 환경의 색상 설정과 무관하고 (b) 기대 형식이 검출되지 않으면 통과가 아니라 실패로 끝난다.

**방어 대상** (RULE-07 §주제 우선순위 2 — 명시 의무). 두 부류 모두 현 HEAD 의 어떤 자동 게이트도 검출하지 못하며, 주입 검증은 로컬이 무색이라 구조적으로 통과시킨다.

1. **환경 종속 검출력 붕괴** — 색상이 켜지면 위반 패턴이 매치하지 않아 게이트가 초록을 낸다. 현 HEAD 실측 (2026-08-27):

   ```
   $ FORCE_COLOR=1 npm run --silent check:deps
   scripts/check-deps-coherence.sh: line 50: [33m31[39m: syntax error: operand expected
   [deps] extraneous=0 declared=[33m31[39m installed=31 (PASS)   ← rc=0
   ```

   판정 산술이 붕괴했는데 결과는 `PASS` 이고 `rc=0` 이다. 무색 실행과 rc 가 같아서 CI 조차 이 붕괴를 붉게 만들지 않는다.

2. **형식 붕괴의 침묵 흡수** — 리포터 형식 변동·도구 교체로 판독이 공집합을 낼 때 그것을 "위반 0" 으로 읽는다. `scripts/check-deps-coherence.sh` 의 `extraneous_count` 는 매치 0 을 그대로 통과 근거로 쓴다 — "extraneous 가 없다" 와 "extraneous 를 볼 수 없다" 가 관측적으로 동일하다.

의도적으로 하지 않는 것:

- (i) 각 게이트가 판정하는 불변식의 **내용** — 본 계약은 판독 표면만 규정한다.
- (ii) 게이트가 **사람에게** 내는 ack 라인의 색상 사용 — 판독 대상이 아니다.
- (iii) 파일 텍스트만 스캔하는 게이트 — 색상 개념이 없어 모집단 밖이다.
- (iv) 종료 코드의 구체 숫자 배정 — 등급 **분리**만 규정하고 숫자는 각 스크립트 헤더 선언을 따른다 (`specs/30.spec/blue/foundation/gate-failure-classification-and-evidence-parity.md` 와 동일 원칙, 대상 집합은 다르다).
- (v) `scripts/pipeline-health.sh` — `check:*` 로 등재되지 않아 게이트가 아니다.

## 공개 인터페이스

프로세스 계약. 관측 표면은 **종료 코드**와 **stdout/stderr 판정 라인**이다.

- **모집단 도출 seam**: `package.json` 의 `check:` 접두 키 열거 → 각 값이 가리키는 `scripts/*.sh` 본문(경로 부재 시 인라인 값). 게이트 개수·스크립트명을 판정에 고정하지 않는다.
- **판독 게이트의 정의**: 위 본문에서 (a) 도구(`npx` · `npm`)를 명령 치환으로 캡처하고 (b) 그 캡처 변수를 `grep` · `case` · `sed` · `awk` 로 판정하는 것. 두 조건을 동시에 만족하는 키만 대상이다.
- **색상 방어의 정의**: 판독 전 `NO_COLOR` 설정 · `FORCE_COLOR=0` 설정 · ANSI 제거(`[0-9;]*m` 치환 또는 `[[:cntrl:]]` 제거) 중 최소 1개.

## 동작

### FR-01 — 판독 게이트는 색상 방어를 보유한다 (Must)

도출된 판독 게이트 전수가 §공개 인터페이스의 색상 방어 중 최소 1개를 보유한다. 미보유가 1건이라도 있으면 위반이며 판정은 **위반 키 이름을 열거**한다.

### FR-02 — 판정은 호출 환경의 색상 설정과 무관하다 (Must)

같은 트리에서 색상 강제 실행과 무색 실행의 **rc 가 같고 판정 출력이 문자열로 일치**한다. 색상 강제 하에서만 나타나는 셸 오류·수치 오염은 그 자체로 위반이다.

### FR-03 — 판독은 fail-closed 다 (Must)

기대 형식이 검출되지 않은 상태를 **통과로 읽지 않는다.** 판독 변수 계보 중 최소 1개에 대해 부재·형식 미매치 분기가 실재해야 한다 — 비어있음 가드(`-z`/`-n`) 또는 형식 미매치 fallback + 종료.

### FR-04 — 측정 실패와 위반 0 은 다른 사건이다 (Must)

"입력이 비었거나 형식이 어긋남" 과 "위반이 0" 은 서로 다른 등급으로 보고한다. 전자는 무판정이며 통과 등급을 쓰지 않는다 (측정 실패 `exit 2` 계열 · 위반 `exit 1` 계열 · 통과 `exit 0`).

### FR-05 — 라인 경계 앵커는 색상 제거 후에만 쓴다 (Should)

`^` · `$` 앵커에 의존하는 판독은 색상 제거를 거친 입력에 대해서만 수행한다. 색상이 켜지면 행두는 ESC 시퀀스이고 행말은 리셋 시퀀스라 앵커가 어긋난다.

### FR-06 — 모집단 도출은 동적이며 공집합은 초록이 아니다 (Must)

판정은 도출된 판독 게이트 수가 ≥ 1 임을 함께 단언한다. 도출이 비어 "미보유 0 건" 이 성립하는 형태를 자기 차단한다 (RULE-06 §열거 고정 금지 · §추출 실패 검출).

### FR-07 — 집행 게이트는 자기 자신에도 적용되며 등재와 배선은 동시다 (Must)

본 계약을 집행하는 게이트는 등재되는 순간 모집단 후보에 들어온다. 또한 `package.json` 등재만 하고 발화 채널을 붙이지 않으면 `specs/30.spec/blue/foundation/declared-gate-firing-channel-totality.md` 의 FR-01 이 그 키를 채널 0 으로 열거한다 — **등재와 배선은 한 단위로 착지**해야 한다.

### 발화 채널 (RULE-07 §promote 조건 4)

본 계약의 Must 판정은 집행 게이트 키 **`check:output-parsing-color-independence`** 로 발화한다. 실경로는 `package.json` → `scripts.check:output-parsing-color-independence` 등재 + `.github/workflows/ci.yml` 의 `run:` 실행 라인 또는 `.husky/*` 실행 라인 ≥ 1 이다. 현 HEAD 에 채널이 없으므로 **채널 부착이 promote 선행 조건**이다.

## 의존성

- 내부: `package.json` (`scripts.check:*`) · `scripts/*.sh` · `.github/workflows/ci.yml` · `.husky/*`.
- 외부: `npm` · `npx` (판독 대상 도구), `node` (판정 명령 실행기).
- 역의존: `specs/30.spec/blue/foundation/declared-gate-firing-channel-totality.md` (집행 게이트 등재 시 그 모집단에 진입).

## 테스트 현황

- [x] (특이도 대조군) 판독 게이트 모집단이 비어있지 않고, 그중 색상 방어를 갖춘 준수 예시가 최소 1건 검출된다 — `node -e 'const fs=require("fs");const s=JSON.parse(fs.readFileSync("package.json","utf8")).scripts;const R=/scripts\/[A-Za-z0-9._\/-]+\.sh/;const CUT=t=>t.split("\n").map(l=>l.replace(/#.*/,""));const TOOL=/\b(npx|npm)\s+\S/;const J=/\b(grep|case|sed|awk)\b/;const DEF=/NO_COLOR|FORCE_COLOR=0|\[0-9;\]\*m|\[\[:cntrl:\]\]/;const pass=[];let n=0;for(const k of Object.keys(s).filter(x=>x.startsWith("check:"))){const m=s[k].match(R);const f=m&&fs.existsSync(m[0])?m[0]:null;const L=CUT(f?fs.readFileSync(f,"utf8"):s[k]);const V=[];L.forEach(l=>{const a=l.match(/([A-Za-z_][A-Za-z0-9_]*)="?\$\(/);if(a&&TOOL.test(l))V.push(a[1])});const read=V.filter(v=>L.some(l=>l.includes("$"+v)&&J.test(l)));if(!read.length)continue;n++;if(L.some(l=>DEF.test(l)))pass.push(k)}console.log(n,pass.length,pass.join(","));process.exit(n>=1&&pass.length>=1?0:1)'` → 현 HEAD 출력 `3 1 check:build-artifact` / rc=0. 이 대조군이 통과한다는 사실이 §수용 기준 1항의 probe 가 **준수 형태를 위반으로 읽지 않음**(특이도)을 보인다.
- [ ] 색상 강제 환경에서의 위반 주입(민감도)은 spec 체크박스가 아니라 집행 게이트 신설 task 의 DoD 다 — §참고 > 게이트 실효 검증 이관.

## 수용 기준

- [ ] (FR-01·FR-06) 판독 게이트 전수가 색상 방어를 보유한다 — `node -e 'const fs=require("fs");const s=JSON.parse(fs.readFileSync("package.json","utf8")).scripts;const R=/scripts\/[A-Za-z0-9._\/-]+\.sh/;const CUT=t=>t.split("\n").map(l=>l.replace(/#.*/,""));const TOOL=/\b(npx|npm)\s+\S/;const J=/\b(grep|case|sed|awk)\b/;const DEF=/NO_COLOR|FORCE_COLOR=0|\[0-9;\]\*m|\[\[:cntrl:\]\]/;const bad=[];let n=0;for(const k of Object.keys(s).filter(x=>x.startsWith("check:"))){const m=s[k].match(R);const f=m&&fs.existsSync(m[0])?m[0]:null;const L=CUT(f?fs.readFileSync(f,"utf8"):s[k]);const V=[];L.forEach(l=>{const a=l.match(/([A-Za-z_][A-Za-z0-9_]*)="?\$\(/);if(a&&TOOL.test(l))V.push(a[1])});const read=V.filter(v=>L.some(l=>l.includes("$"+v)&&J.test(l)));if(!read.length)continue;n++;if(!L.some(l=>DEF.test(l)))bad.push(k)}console.log(n,bad.length,bad.join(","));process.exit(n>=1&&!bad.length?0:1)'` → 출력 `<n> 0` / rc=0. 첫 필드는 모집단 비공허 단언(FR-06), 둘째는 방어 미보유 키 수, 셋째는 그 이름이다. 현 HEAD 출력은 `3 2 check:deps,check:npm-coherence` / rc=1.
- [ ] (FR-03·FR-04) 판독 게이트 전수가 부재·형식 미매치 분기를 보유한다 — `node -e 'const fs=require("fs");const s=JSON.parse(fs.readFileSync("package.json","utf8")).scripts;const R=/scripts\/[A-Za-z0-9._\/-]+\.sh/;const CUT=t=>t.split("\n").map(l=>l.replace(/#.*/,""));const TOOL=/\b(npx|npm)\s+\S/;const J=/\b(grep|case|sed|awk)\b/;const G=[];let n=0;for(const k of Object.keys(s).filter(x=>x.startsWith("check:"))){const m=s[k].match(R);const f=m&&fs.existsSync(m[0])?m[0]:null;const L=CUT(f?fs.readFileSync(f,"utf8"):s[k]);const V=[];L.forEach(l=>{const a=l.match(/([A-Za-z_][A-Za-z0-9_]*)="?\$\(/);if(a&&TOOL.test(l))V.push(a[1])});const read=V.filter(v=>L.some(l=>l.includes("$"+v)&&J.test(l)));if(!read.length)continue;n++;const fam=new Set(read);read.forEach(v=>L.forEach(l=>{const a=l.match(/([A-Za-z_][A-Za-z0-9_]*)="?\$\(/);if(a&&l.includes("$"+v))fam.add(a[1])}));const ok=[...fam].some(w=>L.some(l=>new RegExp("-[zn][ \\t]+\\x22\\$\\{?"+w+"(\\}|\\x22)").test(l))||L.some((l,i)=>new RegExp("case[ \\t]+\\x22\\$\\{?"+w+"(\\}|\\x22)").test(l)&&L.slice(i,i+8).some(x=>/\*\)/.test(x)&&/exit/.test(x))));if(!ok)G.push(k)}console.log(n,G.length,G.join(","));process.exit(n>=1&&!G.length?0:1)'` → 출력 `<n> 0` / rc=0. 판독 변수와 그 1-hop 파생 변수 중 하나라도 가드 또는 fallback 종료를 가지면 충족이다. 현 HEAD 출력은 `3 1 check:deps` / rc=1.
- [ ] (FR-02) 색상 대조 — `bash -c 'T="${TMPDIR:-/tmp}"; FORCE_COLOR=1 npm run --silent check:deps >"$T/oc-c.out" 2>&1; a=$?; NO_COLOR=1 npm run --silent check:deps >"$T/oc-n.out" 2>&1; b=$?; d=$(diff "$T/oc-c.out" "$T/oc-n.out" | wc -l | tr -d " "); echo "$a $b $d"; [ "$a" = "$b" ] && [ "$d" = "0" ]'` → 출력 `0 0 0` / rc=0. 세 필드는 색상 강제 rc · 무색 rc · 출력 차이 줄수다. 현 HEAD 출력은 `0 0 5` / rc=1 — rc 는 같은데 판정 라인이 다르다(§역할 실측). `check:deps` 는 판독 게이트 중 실행 비용이 가장 낮은 **증인**이며, 모집단 전수 축은 1·2항이 정적으로 덮는다.
- [ ] (FR-07) 집행 게이트가 등재되고 발화 채널 ≥ 1 을 갖는다 — `node -e 'const fs=require("fs"),R=/scripts\/[A-Za-z0-9._\/-]+\.sh/g,K="check:output-parsing-color-independence";const s=JSON.parse(fs.readFileSync("package.json","utf8")).scripts;const a=typeof s[K]==="string"&&s[K].trim().length>0?1:0;const cut=t=>t.split("\n").map(l=>l.replace(/#.*/,""));const L=cut(fs.readFileSync(".github/workflows/ci.yml","utf8")).concat(fs.readdirSync(".husky").filter(f=>fs.statSync(".husky/"+f).isFile()).map(f=>cut(fs.readFileSync(".husky/"+f,"utf8"))).flat());const own=a?(s[K].match(R)||[]):[];const ch=L.filter(l=>new RegExp("npm run "+K+"(\\s|$)").test(l)||own.some(x=>l.includes(x))).length;console.log(a,ch?1:0);process.exit(a&&ch&&L.length>=1?0:1)'` → 출력 `1 1` / rc=0. 채널 계수는 `#` 절단 후 실행 라인 한정이며 ci·훅 어느 쪽이든 1건이면 충족이다. 현 HEAD 출력은 `0 0` / rc=1 (등재·배선 모두 부재).

## 참고

### 비-중복 근거 (기존 게이트 열거)

- `check:gate-firing-channel` — 게이트가 **발화되는가**를 잰다. 발화된 게이트의 판독이 색상에 무너지는지는 보지 않는다.
- `check:gate-seam` — seam 선언 보유만 잰다.
- `check:acceptance-criteria` — spec 문장 형식을 잰다. 스크립트 본문은 모집단 밖이다.
- `npm test` (`vitest run --coverage`) — 수집 대상이 `src/**` 이며 `scripts/*.sh` 를 실행하지 않는다.
- `specs/30.spec/blue/foundation/gate-failure-classification-and-evidence-parity.md` — 대상이 `scripts/check-coverage-attribution-monotonicity.sh` **1개**로 한정되며(그 spec §역할 (iv)), 축도 실패 **등급 대칭**이다. 본 계약은 판독 표면의 색상·형식 축이고 모집단이 `check:*` 전수다.

### 미측정·비판정 항목

- **판독 게이트 전수의 런타임 색상 대조.** `check:coverage-attribution` 은 전수 커버리지 + 샤드 N회, `check:build-artifact` 는 빌드 산출물 실행을 요구해 대조 1회가 수 분 단위다. 정적 축(1·2항)으로 대체하며 런타임 대조는 저비용 증인 1건으로 한정한다.
- **`.github/workflows/ci.yml` 인라인 셸의 판독 지점.** 본 계약의 모집단 도출은 `package.json scripts.check:*` → `scripts/*.sh` 경로를 따르며 워크플로 인라인 판독으로의 확장은 규정하지 않는다.
- **`scripts/pipeline-health.sh`** 는 `check:*` 등재가 없어 게이트가 아니다. 색상 방어 부재는 동일하나 모집단 밖이다.
- **도구별 색상 활성 조건**(TTY 감지 · `CI` 환경변수 · 리포터 옵션)의 전수 목록. 계약은 "환경과 무관" 만 규정하고 활성 조건을 열거하지 않는다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증 · §음성 대조)

가정 주입 요구 부류이므로 집행 게이트 `check:output-parsing-color-independence` 신설 task 의 `## 검증/DoD` 로 이관한다. 이관처 task 가 발행되기 전에는 본 절이 검출 방향의 보존처다.

- (민감도 S-1) 색상 방어를 가진 판독 게이트에서 그 방어 라인을 제거한 변형 트리 → `rc≠0` 이며 출력에 그 키가 열거된다.
- (민감도 S-2) 판독 게이트에 부재 가드도 fallback 종료도 없는 캡처-판정 쌍을 추가한 변형 트리 → `rc≠0` (FR-03).
- (민감도 S-3) 모집단 도출을 공집합으로 만드는 변형(`check:` 접두 키 전부 비판독화) → 통과가 아니라 무판정 등급으로 종료 (FR-06).
- (특이도 C-1) 원복 트리 → `rc=0`.
- (특이도 C-2) 정상 변형 대조 — 판독하지 않는 `check:*` 를 1건 추가한 트리, 그리고 색상 방어를 하나 더 얹은 트리 → 양쪽 `rc=0`.
- `RULE-04` notes 에 `injection: 3/3 detect` 와 `control: 2/2 pass` 를 나란히 박제한다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-27 | inspector / REQ-20260825-012 | 최초 등록 — 판독 게이트 색상 비종속·fail-closed 계약 흡수 | all |
