# Task: eslint `ignores` 5 패턴 vacuous-zero 발화 채널 부착 (`scripts/check-eslint-ignores-vacuous-zero.sh` + `npm run check:eslint-ignores-vacuous-zero`)

> **Task ID**: TSK-20260518-21
> **출처 spec**: `specs/30.spec/green/foundation/tooling.md` §동작 9 (REQ-013, `eslint.config.js:15` `ignores` 5 패턴 단일 표면 vacuous-zero) + §테스트 현황 line 206 (REQ-013 FR-07) + §수용 기준 line 268 (Should, REQ-013 FR-07)
> **관련 요구사항**: REQ-20260518-013
> **depends_on**: []
> **supersedes**: (해당 없음 — 최초 carve)

## 배경
spec `tooling.md` §동작 9 는 `eslint.config.js:15` `ignores` 배열 길이 5 + 각 패턴 P-1 (`build/**`) / P-2 (`coverage/**`) / P-3 (`node_modules/**`) / P-4 (`**/__tests__/**`) / P-5 (`**/api.js`) 의 vacuous-zero (cardinality ≥ 1) 단일 표면 baseline 을 박제. §테스트 현황 line 206 + §수용 기준 line 268 (Should, REQ-013 FR-07) 는 자동 검출 채널 (단위 테스트 + glob 매처 또는 `find` + cardinality count fixture) 부착을 요구하나 spec 본문은 수단 중립 (pre-commit / pre-push / CI / 신규 `package.json` `check:eslint-ignores-vacuous-zero` script 중 1 채택 — spec 본문 후보 명시 인용). 본 task 는 기존 `scripts/check-*-coherence.sh` 6종 idiom 선례와 동등 패턴으로 `scripts/check-eslint-ignores-vacuous-zero.sh` + `npm run check:eslint-ignores-vacuous-zero` 채널을 부착해 FR-07 마커를 자연 수렴 가능 상태로 만든다. 156차 TSK-20260518-19 (dev-port-coherence) 동형 양식.

## 변경 범위
| 파일 | 동작 | 핵심 |
|------|------|------|
| `scripts/check-eslint-ignores-vacuous-zero.sh` | 추가 | spec §동작 9.1 (배열 길이 5) + §동작 9.2 (5 패턴 cardinality ≥ 1) grep+find 게이트. 위반 시 stderr 에 `G-X VIOLATION: <category> (cardinality=<N> expected≥1)` 형식 출력 후 rc=1. PASS 시 1줄 ack stdout 후 rc=0. |
| `package.json` | scripts 추가 | `"check:eslint-ignores-vacuous-zero": "bash scripts/check-eslint-ignores-vacuous-zero.sh"` 라인 1건. |

## 구현 지시
1. `scripts/check-eslint-ignores-vacuous-zero.sh` 생성. 헤더 주석에 spec 경로 + 본 Task ID + 게이트 9.1+9.2 의미 박제.
2. 본문:
   - `set -u`.
   - `ROOT="$(cd "$(dirname "$0")/.." && pwd)"` 후 `cd "$ROOT" || exit 1`.
   - 대상 파일 존재 사전 검증: `eslint.config.js` 미존재 시 stderr + rc=1.
   - **G-9.1 (배열 위치/길이)**: `grep -nE "^\s*\{\s*ignores:" eslint.config.js` → 1 hit expected. hit 수 != 1 → stderr `G-9.1 VIOLATION: ignores 배열 선언 hit=<N> expected=1` rc=1.
   - **G-9.2 (5 패턴 cardinality)** — 5 axis 평가:
     - P-1 `build/**`: `find . -maxdepth 2 -type d -name "build" -not -path "./node_modules/*"` cardinality ≥ 1 검증.
     - P-2 `coverage/**`: `find . -maxdepth 2 -type d -name "coverage" -not -path "./node_modules/*"` ≥ 1.
     - P-3 `node_modules/**`: `find . -maxdepth 2 -type d -name "node_modules"` ≥ 1.
     - P-4 `**/__tests__/**`: `find . -type d -name "__tests__" -not -path "./node_modules/*" -not -path "./build/*" -not -path "./coverage/*"` ≥ 1.
     - P-5 `**/api.js`: `find ./src -type f -name "api.js"` ≥ 1.
   - 각 패턴 cardinality 0 → stderr `G-9.2 VIOLATION: P-<i> <pattern> cardinality=0 (vacuous-zero violation)` rc=1.
   - PASS: stdout `check-eslint-ignores-vacuous-zero: G-9.1 PASS (1 array @line=<L>) + G-9.2 PASS (P-1=<n1> P-2=<n2> P-3=<n3> P-4=<n4> P-5=<n5>)` rc=0.
3. 실행 권한 부여: `chmod +x scripts/check-eslint-ignores-vacuous-zero.sh`.
4. `package.json` `scripts` 블록에 `"check:eslint-ignores-vacuous-zero": "bash scripts/check-eslint-ignores-vacuous-zero.sh"` 추가.

## 테스트
- **회귀 fixture 1 (R-1, ignores 배열 통째 제거)**: `eslint.config.js:15` 의 `{ ignores: [...] }` 객체 임시 제거 → rc=1 + `G-9.1 VIOLATION: ignores 배열 선언 hit=0 expected=1`. 원복 후 rc=0.
- **회귀 fixture 2 (R-2, P-4 패턴 제거)**: `eslint.config.js:15` 의 `'**/__tests__/**'` 임시 제거 (4 entry 배열로 축소) → rc=0 (cardinality count 자체는 디스크 기준이므로 PASS). 단 G-9.1 hit=1 + 길이 mismatch 는 본 task scope 외 (별 axis — spec FR-01 `[x]` baseline 박제, 본 task 는 vacuous-zero cardinality 만). 원복 필요.
- **회귀 fixture 3 (R-3, src/__tests__ 디렉터리 임시 이름 변경)**: `mv src/__tests__ src/__renamed__` → rc=1 + `G-9.2 VIOLATION: P-4 **/__tests__/** cardinality=0 (vacuous-zero violation)`. 원복 (`mv src/__renamed__ src/__tests__`) 후 rc=0.
- **회귀 fixture 4 (R-4, src/Monitor/api.js + src/Log/api.js 동시 임시 이동)**: 2 파일 모두 `.js.bak` 으로 임시 변경 → rc=1 + `G-9.2 VIOLATION: P-5 **/api.js cardinality=0`. 원복 후 rc=0.
- **결정론 (NFR-01)**: HEAD baseline 상태에서 N 회 반복 → N 회 동일 rc=0 + 동일 stdout (순서 안정 — `find` walk + maxdepth 한정).

## 검증/DoD
- [ ] `bash scripts/check-eslint-ignores-vacuous-zero.sh` rc=0 + stdout 1줄 ack.
- [ ] `npm run check:eslint-ignores-vacuous-zero` rc=0.
- [ ] `grep -nE '"check:eslint-ignores-vacuous-zero"' package.json` → 1 hit.
- [ ] `test -x scripts/check-eslint-ignores-vacuous-zero.sh` (실행 권한).
- [ ] `npm run lint` rc=0.
- [ ] `npm run typecheck` rc=0.
- [ ] 회귀 fixture R-1 / R-3 / R-4 3 케이스 수동 검증 (위 §테스트 시나리오).
- [ ] result.md `## 변경 이력` 에 본 Task ID + 커밋 해시 박제 → spec REQ-013 FR-07 marker 자연 수렴 가능 (단 spec 본문 `[ ]` → `[x]` flip 은 inspector writer 영역).

## 스코프 규칙
- **expansion**: 불허 (scope = `scripts/check-eslint-ignores-vacuous-zero.sh` 신규 1건 + `package.json` scripts 블록 라인 1건 추가 한정. spec 본문 / `eslint.config.js` 본문 / `src/**` 변경 금지).
- **grep-baseline** (HEAD=`987da8f` 실측):
  - `grep -nE "^\s*\{\s*ignores:" eslint.config.js` → **1 hit** @`:15` (G-9.1 baseline PASS).
  - `find . -maxdepth 2 -type d -name "build" -not -path "./node_modules/*"` → **1 hit** (`./build`; P-1 cardinality ≥ 1 PASS).
  - `find . -maxdepth 2 -type d -name "coverage" -not -path "./node_modules/*"` → **1 hit** (`./coverage`; P-2 PASS).
  - `find . -maxdepth 2 -type d -name "node_modules"` → **1 hit** (`./node_modules`; P-3 PASS).
  - `find . -type d -name "__tests__" -not -path "./node_modules/*" -not -path "./build/*" -not -path "./coverage/*"` → **1 hit** (`./src/__tests__`; P-4 PASS).
  - `find ./src -type f -name "api.js"` → **2 hits** (`./src/Monitor/api.js`, `./src/Log/api.js`; P-5 PASS).
  - `grep -cE '"check:eslint-ignores-vacuous-zero"' package.json` → **0 hits** (npm script 미부착 — 본 task 도입 baseline).
  - `ls scripts/check-eslint-ignores-vacuous-zero.sh` → **not found** (script 파일 미존재 — 본 task 도입 baseline).
  - 선례 idiom: `ls scripts/check-*-coherence.sh` → 6 hits — 본 task 가 동등 idiom 7번째 추가 (Note: 본 script 는 `-coherence` suffix 가 아닌 `-vacuous-zero` 어휘, 의미 도메인 충실 표현; 선례와 prefix `check-` 정합).
- **rationale**: 본 task 는 spec REQ-013 FR-07 수단 중립 위임의 dedicated script 채널 채택 (spec 본문 후보 명시 `check:eslint-ignores-vacuous-zero` 직접 인용). spec §동작 9.2 의 cardinality ≥ 1 게이트를 script 가 그대로 호출하므로 cross-spec drift 0. 발화 채널 추가만 — `eslint.config.js` / 디스크 트리 / `src/**` 변경 0.

## 롤백
단일 `git revert <sha>` 로 가능. 영향 = `scripts/check-eslint-ignores-vacuous-zero.sh` 삭제 + `package.json` scripts 블록 1줄 원복. 런타임 / 빌드 / 테스트 산출물 무관.

## 범위 밖
- spec §테스트 현황 line 206 / §수용 기준 line 268 (Should, REQ-013 FR-07) `[ ] → [x]` flip — inspector writer 영역.
- 본 script 의 pre-commit / pre-push / CI 통합 — 별 task (수단 중립).
- ignores 배열 길이 정합 (REQ-013 FR-01) 의 별 measure — 본 task 는 cardinality 한정. 길이 변화 검출은 spec §동작 9.1 G-9.1 hit 수로 위임.
- REQ-013 FR-08 (자체 진단 scope 분리) — 본 spec §스코프 gate (z) 자기 검증, 본 task 영향 0.
- 자매 axis `build-coverage-output-dir-tri-surface-coherence.md` FR-12 (TSK-20260518-20) — 4 표면 cross-surface 정합 측정과 직교 (본 task 는 단일 표면 vacuous-zero 한정).
