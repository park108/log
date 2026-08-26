# 게이트 배선 실행 표면 정합

## 역할

`package.json scripts.check:*` · `.husky/pre-commit` · `scripts/**` 3자의 배선 정합을 **실행 표면**에서 규정한다.

**방어 대상** (RULE-07 §주제 우선순위 2 요건):

1. **실행 라인 삭제 + 주석 잔존** — 게이트 호출이 훅에서 빠졌는데 문자열 `grep` 기반 배선 판정은 주석 한 줄로 초록을 유지한다.
2. **게이트 스크립트 자체 회귀** — pre-commit 발화 조건이 `^scripts/` 를 포함하지 않아 정규식 오타·가드 제거가 로컬 커밋에서 무발화 통과한다.
3. **훅 호출과 npm script 의 경로 분기** — 훅이 낡은 경로를 부르거나 이름이 어긋나도 양쪽을 개별로 보면 정상으로 보인다.

세 부류 모두 기존 자동 게이트로 검출되지 않는다.

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

### 발화 채널 (RULE-07 §promote 조건 4)

본 계약의 Must 판정은 아래 실경로에서 발화한다.

- `package.json` → `scripts.check:gate-wiring`
- `.github/workflows/ci.yml` → 해당 step
- `.husky/pre-commit` → `^(package\.json|\.husky/pre-commit|scripts/)` 발화 블록

## 수용 기준

- [ ] `check:*` 값이 전부 `bash scripts/<name>.sh` 단일 형태다 — `node -e "const s=require('./package.json').scripts;const e=Object.entries(s).filter(([k])=>k.startsWith('check:'));const bad=e.filter(([k,v])=>!/^bash scripts\/[A-Za-z0-9._-]+\.sh$/.test(v.trim()));console.log(e.length>=1?1:0,bad.length);process.exit(e.length&&!bad.length?0:1)"` → 출력 `1 0` / rc=0. 첫 필드는 측정 대상 집합이 공집합이 아님을 단언한다 — 도출 0 이면 위반 0 이 되어 초록으로 읽히는 형태를 차단한다. `check:*` 종수 절대값은 고정하지 않는다.
- [x] `check:*` 가 지시하는 모든 스크립트 파일이 실재한다 — `node -e "const fs=require('fs');const s=require('./package.json').scripts;const p=[...new Set(Object.entries(s).filter(([k])=>k.startsWith('check:')).flatMap(([,v])=>v.match(/scripts\/[A-Za-z0-9._\/-]+\.sh/g)||[]))];const miss=p.filter(f=>!fs.existsSync(f));console.log(miss.length);process.exit(miss.length?1:0)"` → 출력 `0` / rc=0.
- [x] `.husky/pre-commit` 실행 라인에서 호출되는 `scripts/*.sh` 경로 집합이 `scripts.check:*` 도출 경로 집합의 부분집합이다 — `node -e "const fs=require('fs');const R=/scripts\/[A-Za-z0-9._\/-]+\.sh/g;const s=require('./package.json').scripts;const D=new Set(Object.entries(s).filter(([k])=>k.startsWith('check:')).flatMap(([,v])=>v.match(R)||[]));const H=[...new Set(fs.readFileSync('.husky/pre-commit','utf8').split('\n').map(l=>l.replace(/#.*/,'')).join('\n').match(R)||[])];const d=H.filter(x=>!D.has(x));console.log(d.length);process.exit(H.length&&!d.length?0:1)"` → 출력 `0` / rc=0. 각 라인의 `#` 이후 구간은 계수 전에 절단하며(FR-03), 훅 도출 개수 0 이면 `rc≠0`.
- [ ] `.husky/pre-commit` 의 각 발화 조건 블록에 대해, 같은 블록이 호출하는 스크립트 경로가 그 조건 정규식에 매치한다 — `node -e "const fs=require('fs');const R=/scripts\/[A-Za-z0-9._\/-]+\.sh/g;const L=fs.readFileSync('.husky/pre-commit','utf8').split('\n').map(l=>l.replace(/#.*/,''));let b=0,pr=0,bad=0,re=null,cur=[];const fl=()=>{if(re)for(const q of cur){pr++;if(!new RegExp(re).test(q))bad++}re=null;cur=[]};for(const l of L){const m=l.match(/grep -qE '(.*)'/);if(m){fl();re=m[1];b++;continue}if(/^\s*fi\b/.test(l)){fl();continue}if(re)cur.push(...(l.match(R)||[]))}fl();console.log(b>=1&&pr>=1?1:0,bad);process.exit(b&&pr&&!bad?0:1)"` → 출력 `1 0` / rc=0. 각 라인의 `#` 이후 구간은 계수 전에 절단한다(FR-03). 첫 필드는 조건 블록 수와 (블록, 스크립트) 쌍 수가 모두 ≥1 임을 단언한다 — 어느 한쪽이 0 이면 불일치 0 이 되어 초록으로 읽히므로 위반이다. 블록·쌍 절대값은 고정하지 않는다.
- [ ] 배선 정합 게이트가 `package.json scripts.check:*` 에 등재되고 `.github/workflows/ci.yml` 에서 실행 라인으로 호출된다 — `node -e "const fs=require('fs');const K='check:gate-wiring';const s=require('./package.json').scripts;const a=typeof s[K]==='string'&&s[K].trim().length>0?1:0;const ci=fs.readFileSync('.github/workflows/ci.yml','utf8').split('\n').map(l=>l.replace(/#.*/,'')).filter(l=>/run:\s*npm run check:gate-wiring(\s|$)/.test(l)).length;console.log(a,ci?1:0);process.exit(a&&ci?0:1)"` → 출력 `1 1` / rc=0. ci 측 계수는 주석 절단 후 `run:` 실행 라인에 한정한다 — 단순 문자열 포함 계수는 `ci.yml` 주석에 적힌 게이트 이름을 배선으로 오인한다(FR-03).
- [x] 도출 명령이 공집합을 초록으로 읽지 않는다 — `node -e "const s=require('./package.json').scripts;const p=[...new Set(Object.entries(s).filter(([k])=>k.startsWith('check:')).flatMap(([,v])=>v.match(/scripts\/[A-Za-z0-9._\/-]+\.sh/g)||[]))];console.log(p.length>=1?1:0);process.exit(p.length?0:1)"` → 출력 `1` / rc=0 (RULE-06 §추출 실패 검출). 도출 개수 절대값은 고정하지 않는다.

## 참고

### 미측정·비판정 항목

- `.github/workflows/ci.yml` step 집합과 `check:*` 집합의 정합은 인접 축이나 본 계약은 규정하지 않는다.
- `check:build-artifact` 를 파일로 추출한 뒤의 동작 동일성은 추출 task 의 DoD 로 판정한다.
- FR-03 의 주석-비의존 판정은 게이트 도입 시점 1회 주입으로만 확인된다. 검출 방향 2축을 선언으로 보존한다 — (민감도) 훅의 스크립트 호출 실행 라인 1건을 주석으로 내린 변형 트리에서 게이트는 `rc≠0` 이어야 한다. (특이도) 원복 트리 및 주석만 늘어난 정상 변형 트리에서는 `rc=0` 이어야 한다. 이 주입은 배선 정합 게이트 도입 task 의 DoD 로 이관한다 (RULE-06 §게이트 실효 검증, RULE-07 §처리).
- 위 두 이관 항목(FR-03 · FR-05)의 이관처 task 는 현 HEAD 에 아직 없다. 배선 정합 게이트 도입 task 발행이 필요하며, 그 task 의 `## 검증/DoD` 에 두 방향 주입을 `injection: 2/2 detect` 로 박제한다.
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