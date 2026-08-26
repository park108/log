# 선언된 게이트의 발화 채널 총성

## 역할

`package.json scripts.check:*` 에 **선언된 게이트는 전부 자동 발화 채널을 최소 1개 갖는다** 는 총성(totality)을 규정한다. 선언·파일 실재와 **실행 여부**를 분리해 계약화한다.

`30.spec/green/foundation/gate-wiring-execution-surface-coherence.md` 와 **인접하되 축이 다르다** — 그 계약은 `훅 호출 경로 ⊆ npm script 경로` 라는 **한 방향 포함관계**를 규정하고, `.github/workflows/ci.yml` step 집합과 `check:*` 집합의 정합을 §미측정·비판정 항목으로 **명시 제외**한다. 본 계약이 그 제외된 축이며, 제외 문구는 본 spec 을 이관처로 지목하도록 정정됐다.

**방어 대상** (RULE-07 §주제 우선순위 2 요건):

1. **게이트 신설 커밋의 채널 부착 누락** — npm script + 스크립트 파일만 추가하면 종수는 늘고 문서는 "게이트 있음" 으로 읽히지만 자동 실행은 0회다. `d7b08dd` 가 정확히 이 형태이며 54 커밋 동안 어떤 게이트도 붉어지지 않았다. 하필 그 게이트(`check:measurement-tree-attribution`)는 측정 귀속 래퍼여서, 거짓 양성 오보를 막을 채널이 한 번도 돌지 않은 채 사고가 났다.
2. **기존 채널의 조용한 탈락** — `ci.yml` 실행 라인 1건이 리팩터링·병합으로 사라져도 그 게이트가 훅에 없으면 무발화로 전환된다. 스크립트 파일은 그대로이므로 `check:gate-seam` · `npm test` · 훅 전부 초록이다.
3. **주석에 의한 배선 위장** — `ci.yml` 에는 게이트 이름이 주석으로만 등장하는 라인이 실재한다. 문자열 포함 계수로 채널을 세면 주석 한 줄이 배선을 충족시킨다.

세 부류 모두 기존 자동 게이트로 검출되지 않는다 (§참고 > 비-중복 근거).

## 동작

### FR-01 — 선언된 모든 `check:*` 는 발화 채널 ≥ 1 을 갖는다 (Must)

`package.json scripts.check:*` 로 선언된 키 중 자동 발화 채널이 0 인 키가 **1건이라도 있으면 위반**이다. 판정은 위반 키의 **이름을 출력에 열거**한다.

### FR-02 — 발화 채널의 정의 (Must)

발화 채널은 아래 셋의 **합집합**이다.

- (a) `.github/workflows/ci.yml` 의 `run:` 실행 라인에 있는 `npm run <key>`.
- (b) `.husky/` 하위 훅 파일의 실행 라인에 있는 `npm run <key>`.
- (c) 같은 실행 라인에서 그 키가 가리키는 `scripts/*.sh` 경로를 직접 호출.

### FR-03 — 관측 표면은 주석 절단 후 실행 라인이다 (Must)

각 라인의 `#` 이후 구간은 계수 전에 제거한다. 주석에 적힌 게이트 이름은 채널을 충족시키지 않는다.

### FR-04 — 모집단과 채널 파일 목록은 도출된다 (Must)

대상 키는 `package.json` 의 `check:` 접두 키 열거에서, 훅 파일은 `.husky/` 디렉터리 열거에서 산출한다. 스크립트명·훅명·게이트 개수를 판정에 하드코딩하지 않는다 (RULE-06 §열거 고정 금지).

### FR-05 — 공집합은 초록이 아니다 (Must)

대상 키 수 · 훅 파일 라인 수 · ci 라인 수가 각각 ≥ 1 임을 단언한다. 도출이 비어 "배선 0 건 = 0" 이 성립해 초록으로 읽히는 형태를 자기 차단한다 (RULE-06 §추출 실패 검출).

### FR-06 — 집행 게이트는 자기 자신에도 FR-01 을 적용한다 (Must)

본 계약을 집행하는 게이트는 등재되는 순간 모집단에 들어오며, 채널 미부착이면 자기 자신을 위반 키로 열거한다.

### FR-07 — 게이트 개수의 절대값은 계약이 아니다 (Should)

종수 증감은 위반이 아니다. 판정은 비율·차집합으로만 성립한다.

### 발화 채널 (RULE-07 §promote 조건 4)

본 계약의 Must 판정은 집행 게이트 키 **`check:gate-firing-channel`** 로 발화한다. 실경로는 `package.json` → `scripts.check:gate-firing-channel` 등재 + `.github/workflows/ci.yml` 의 `run:` 실행 라인 또는 `.husky/*` 실행 라인 ≥ 1 이다. 현 HEAD 에 채널이 없으면 promote 차단이 아니라 **채널 부착 task 발행이 선행 조건**이다.

## 수용 기준

- [ ] (FR-01·02·03·04·05) 발화 채널 0 인 `check:*` 가 없다 — `node -e "const fs=require('fs'),R=/scripts\/[A-Za-z0-9._\/-]+\.sh/g;const s=require('./package.json').scripts;const K=Object.keys(s).filter(k=>k.startsWith('check:'));const cut=t=>t.split('\n').map(l=>l.replace(/#.*/,''));const ci=cut(fs.readFileSync('.github/workflows/ci.yml','utf8'));const H=fs.readdirSync('.husky').filter(f=>fs.statSync('.husky/'+f).isFile()).map(f=>cut(fs.readFileSync('.husky/'+f,'utf8'))).flat();const key=new Set(),pth=new Set();ci.forEach(l=>{const m=l.match(/run:\s*npm run (check:[A-Za-z0-9:._-]+)/);if(m)key.add(m[1])});H.forEach(l=>{const m=l.match(/npm run (check:[A-Za-z0-9:._-]+)/);if(m)key.add(m[1]);(l.match(R)||[]).forEach(x=>pth.add(x))});const dead=K.filter(k=>!key.has(k)&&!(s[k].match(R)||[]).some(x=>pth.has(x)));console.log(K.length>=1&&H.length>=1&&ci.length>=1?1:0,dead.length,dead.join(','));process.exit(K.length&&H.length&&ci.length&&!dead.length?0:1)"` → 출력 `1 0` / rc=0. 첫 필드는 세 도출(대상 키 · 훅 라인 · ci 라인)이 전부 비어있지 않음을 단언한다(FR-05). 둘째 필드는 채널 0 키의 개수, 셋째는 그 키 이름 열거다(FR-01). 대상 키는 `check:` 접두 열거, 훅 파일은 `.husky/` 디렉터리 열거로 도출하며 개수·이름을 고정하지 않는다(FR-04·07). 모든 라인은 `#` 이후 절단 후 계수한다(FR-03).
- [ ] (FR-06) 집행 게이트 `check:gate-firing-channel` 이 `package.json scripts` 에 등재되고 자신도 발화 채널 ≥ 1 을 갖는다 — `node -e "const fs=require('fs'),R=/scripts\/[A-Za-z0-9._\/-]+\.sh/g,K='check:gate-firing-channel';const s=require('./package.json').scripts;const a=typeof s[K]==='string'&&s[K].trim().length>0?1:0;const cut=t=>t.split('\n').map(l=>l.replace(/#.*/,''));const L=cut(fs.readFileSync('.github/workflows/ci.yml','utf8')).concat(fs.readdirSync('.husky').filter(f=>fs.statSync('.husky/'+f).isFile()).map(f=>cut(fs.readFileSync('.husky/'+f,'utf8'))).flat());const own=a?(s[K].match(R)||[]):[];const ch=L.filter(l=>new RegExp('npm run '+K+'(\\s|$)').test(l)||own.some(x=>l.includes(x))).length;console.log(a,ch?1:0);process.exit(a&&ch?0:1)"` → 출력 `1 1` / rc=0. 등재된 순간 그 키는 1항 판정의 모집단에 들어오므로, 채널 미부착이면 1항이 자기 자신을 dead 로 열거한다. 채널 계수는 주석 절단 후 실행 라인 한정이며 ci·훅 어느 쪽이든 1건이면 충족이다(FR-02 합집합, 수단 미지정).
- [ ] (FR-04·07) 집행 게이트 스크립트 본문에 타 게이트 스크립트명·훅 파일명 리터럴이 없다 — `node -e "const fs=require('fs'),K='check:gate-firing-channel';const s=require('./package.json').scripts;const m=(s[K]||'').match(/scripts\/[A-Za-z0-9._\/-]+\.sh/);const f=m&&fs.existsSync(m[0])?m[0]:null;const own=f?f.split('/').pop():'';const body=f?fs.readFileSync(f,'utf8').split('\n').map(l=>l.replace(/#.*/,'')).join('\n').split(own).join(''):'';const hits=f?(body.match(/check-[a-z-]+\.sh|pre-commit|pre-push/g)||[]):[];console.log(f?1:0,hits.length,[...new Set(hits)].join(','));process.exit(f&&!hits.length?0:1)"` → 출력 `1 0` / rc=0. 대상 경로는 `scripts.check:gate-firing-channel` 값에서 **도출**하며 경로를 본문에 적지 않는다. **제외 규칙**: (a) 각 라인의 `#` 이후 주석 구간, (b) 자기 파일명(도출된 basename) 전 출현. 그 뒤 남은 `check-<name>.sh` · `pre-commit` · `pre-push` 매치가 0 이어야 한다. 첫 필드 0 은 도출 실패(키 미등재 또는 파일 부재)이며 그 자체로 `rc≠0` 이다 — 공집합이 초록으로 읽히지 않는다(FR-05).

## 참고

### 비-중복 근거 (기존 게이트 전수 열거)

- `check:gate-seam` — 분모를 `scripts/check-*.sh` glob 으로 정확히 세지만 재는 것은 **seam 선언 보유**이지 발화 여부가 아니다.
- green `gate-wiring-execution-surface-coherence` FR-02 — **훅 → npm script 한 방향**만 규정한다. 채널 0 게이트는 훅에 없으므로 그 부분집합 관계를 위반하지 않는다.
- `npm test` (`vitest run --coverage`) — 수집 대상이 `src/**` 이며 게이트 스크립트를 실행하지 않는다.
- `check:commit-writer-coherence` — 커밋 diff 의 writer 경계만 본다. 배선 여부와 무관.

### 미측정·비판정 항목

- **역방향(채널 → 선언) 정합** — 채널이 미등재 키를 부르면 `npm run` 이, 미실재 경로를 부르면 `bash` 가 즉시 rc≠0 이다. 이미 자동 검출되는 명제라 계약에 넣으면 중복 게이트다 (RULE-07 §반려 시그널).
- **게이트별 적정 채널 선택** (CI 인지 훅인지, 훅이면 어느 트리거인지) — 본 계약은 개수 하한 1 만 규정하고 수단을 지정하지 않는다.
- `check:measurement-tree-attribution` **래퍼의 채택률** — 별 축이며 `10.followups/20260826-1200-measurement-wrapper-zero-adoption-misattribution.md` 에 존치한다.
- **본 계약 축의 주입·대조** (가정 주입 요구 부류 — RULE-07 §수용 기준 문장 규약). 검출 4방향을 선언으로 보존하며 집행 게이트 신설 task 의 `## 검증/DoD` 로 이관한다 (RULE-06 §게이트 실효 검증 · §음성 대조).
  - (민감도 S-1) `ci.yml` 의 `run: npm run <key>` 실행 라인 1건을 **주석으로 내린** 변형 트리 — 훅 병행 배선이 없는 키를 골라야 한다 → `rc≠0` 이며 출력에 그 키가 열거된다.
  - (민감도 S-2) `package.json` 에 채널 미부착 `check:*` 키 1건을 추가한 변형 트리 → `rc≠0`. `d7b08dd` 가 만든 실제 형태다.
  - (특이도 C-1) 원복 트리 → `rc=0`.
  - (특이도 C-2) 정상 변형 대조 — `ci.yml` 에 주석 라인만 1건 추가한 트리, 그리고 이미 배선된 게이트에 채널을 하나 더 부착한 트리 → 양쪽 `rc=0`.
  - `RULE-04` notes 에 `injection: 2/2 detect` 와 `control: 2/2 pass` 를 나란히 박제한다.
- **승계 이관** — `gate-wiring-execution-surface-coherence` §미측정·비판정 항목이 이관처를 요구한 FR-03 주석-비의존 판정 2방향과 FR-05(staged 비의존)는 같은 task 가 인수한다.
- **실효 검증 격리** — 주입·대조는 저장소 밖 격리 클론에서 수행한다. probe setup 은 멱등해야 한다 (`10.followups/20260827-0340-agent-probe-node-modules-symlink-hazard.md`).

### 관측 근거

- 실측 (HEAD `9cf62a4`, discovery `REQ-20260827-030`): `check:*` **22종** / `scripts/check-*.sh` 실재 22개 (양방향 차집합 0) / `ci.yml` `run: npm run check:*` **21키** / `.husky/*` 의 `npm run check:*` **1키** / `.husky/pre-commit` 의 직접 호출 **10경로** → 발화 채널 0 **1건 = `check:measurement-tree-attribution`** (`package.json:43`).
- 도입 커밋 `d7b08dd` 의 변경 파일 5건에 `ci.yml` 과 `.husky/*` 가 **포함되지 않았다**. `git rev-list --count d7b08dd..HEAD` = **54**.
- 종수는 req 작성 시점 21종에서 22종으로 증가했다 — 판정은 절대 종수를 고정하지 않는다 (FR-07).
- 판정 (HEAD `9cf62a4`, inspector 재실행): 명령을 본 파일에서 추출(len=900, 비어있지 않음 단언 통과) 후 실행 → 출력 `1 1 check:measurement-tree-attribution` / rc=1 — **미충족**. 목표는 `1 0` / rc=0 이다. 첫 필드 1 은 세 도출이 전부 비공집합임을 뜻한다(FR-05 자기 차단 통과).
- 판정 2항 (HEAD `9cf62a4`): 명령 추출(len=631) 후 실행 → 출력 `0 0` / rc=1 — 집행 게이트 `check:gate-firing-channel` **미등재**. 판정력 대조 (같은 로직에 키만 치환): `check:deps` → `1 1` rc=0 (훅 배선), `check:gate-seam` → `1 1` rc=0 (ci 배선), `check:measurement-tree-attribution` → `1 0` rc=1 (등재됐으나 채널 0). 등재·채널 두 축을 각각 판별한다.
- 판정 3항 (HEAD `9cf62a4`): 명령 추출(len=520) 후 실행 → 출력 `0 0` / rc=1 — 도출 실패(집행 게이트 미등재)로 **fail-closed**. 특이도 대조 (같은 로직에 기존 키 치환): `check:gate-seam` · `check:node-coherence` · `check:npm-coherence` · `check:vite-env` 전부 `1 0` rc=0 — 현존 게이트는 타 스크립트명·훅명을 하드코딩하지 않는다. 민감도 대조 (인메모리, `scripts/check-node-version-coherence.sh` 사본에 주입): 실행 라인 `bash scripts/check-deps-coherence.sh` 추가 → hits=1(`check-deps-coherence.sh`), `pre-commit` 훅명 라인 추가 → hits=2. 제외 규칙 반대 방향도 확인 — 같은 내용을 **주석**으로 추가 → hits=0, **자기 파일명** 출현 추가 → hits=0.
- 특이도 인메모리 대조 (discovery `REQ-20260827-030` 실측, 재인용): `ci.yml` 에 `run:` **실행 라인** 추가 → `dead=0`, 같은 내용을 **주석**으로 추가 → `dead=1 check:measurement-tree-attribution`. 주석 절단(FR-03)이 실제로 작동한다.

### 관련 문서

- `specs/30.spec/green/foundation/gate-wiring-execution-surface-coherence.md` (인접 축 — §미측정 제외 문구의 이관처)
- `specs/10.followups/20260826-1830-gate-wiring-coherence-gate-issuance.md` (소비 followup — 게이트 발행 요청)
- `RULE-06 §게이트 실효 검증` · `§음성 대조` · `§열거 고정 금지` · `§추출 실패 검출`
- `RULE-07 §주제 우선순위 2` · `§promote 조건 4`

## 변경 이력

- 2026-08-27 inspector: REQ-20260827-030 흡수 — green 신규 등록 (골격). 판정 명령 박제·실행은 후속 단위 커밋.
- 2026-08-27 inspector: 수용 기준 1항 판정 명령 박제 후 추출·실행 — 출력 `1 1 check:measurement-tree-attribution` rc=1 로 `[ ]` 유지. 채널 부착 또는 집행 게이트 신설이 선행 조건.
- 2026-08-27 inspector: 수용 기준 2항(FR-06 집행 게이트 자기 발화) 판정 명령 박제 + 집행 게이트 키를 `check:gate-firing-channel` 로 지정 후 실행 — 출력 `0 0` rc=1 로 `[ ]` 유지. RULE-07 §promote 조건 4 상 채널 부착(게이트 신설) task 발행이 선행 조건이다.
- 2026-08-27 inspector: 수용 기준 3항(FR-04·07 리터럴 부재)을 도출 기반 판정 명령으로 재정식화 — 대상 경로를 `scripts.check:gate-firing-channel` 값에서 도출해 '판정 스크립트 신설 후' 라는 미래 사건 의존을 제거하고 fail-closed 화. 실행 결과 `0 0` rc=1 로 `[ ]` 유지.
