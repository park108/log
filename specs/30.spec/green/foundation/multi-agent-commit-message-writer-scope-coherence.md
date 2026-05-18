# 다중 에이전트 commit 진입 시 메시지 scope ↔ 변경 path writer 영역 일치 시스템 불변식

> **위치**: 횡단 commit transaction 표면 — `git log -1 --name-only <hash>` (변경 path set) + `git log -1 --format=%s <hash>` (메시지 prefix) + RULE-01 §writer 매트릭스 (writer 영역 박제 본).
> **관련 요구사항**: REQ-20260518-028
> **최종 업데이트**: 2026-05-18 (by inspector — 104차 Phase 2 REQ-028 흡수, 신규 박제)

> 참조: writer 영역 매트릭스는 `.claude/rules/RULE-01-PIPELINE.md` §쓰기 권한 박제 본을 inputs 로 사용. 본 spec 은 그 매트릭스를 commit transaction 단위로 적용한 결과 효능 평서.

## 역할
**단일 git commit 1개의 메시지 prefix scope 와 그 commit 에 포함된 변경 path 집합의 writer 영역이 일치한다** 는 결과 효능 불변식. `spec(planner): ...` 메시지 commit 의 변경 path 집합은 planner writer 영역 (`30.spec/green/.planner-seen` + `30.spec/{blue,green}/**` mv + `40.task/` create) 한정. `feat:` / `fix:` / `refactor:` / `chore:` / `test:` / `docs:` 메시지 (developer scope) commit 의 변경 path 집합은 developer writer 영역 (`10.followups/` + `src/**` + `60.done/task/{slug}/` mv + `50.blocked/task/` mv) 한정. `spec(inspector): ...` 메시지 commit 의 변경 path 집합은 inspector writer 영역 (`30.spec/green/**` create/edit + `20.req/* → 60.done/req/` 또는 `50.blocked/req/` mv) 한정. `req(discovery): ...` 메시지 commit 의 변경 path 집합은 discovery writer 영역 (`20.req/` create + `10.followups/* → 60.done/followups/` mv) 한정. `followup(developer): ...` 메시지는 developer writer 영역 (`10.followups/` create) 한정. 의도적으로 하지 않는 것: (i) 동시 commit 진입 자체를 사전 차단하는 lock 메커니즘 (`.claude/locks/commit.busy`, `flock /tmp/repo-commit.lock` 등) 의 채택 결정 — 수단 중립, 운영자/별 req 영역, (ii) husky / lint-staged / git-index 직렬화 메이저 bump 결정 — 외부 의존성 영역, (iii) lint-staged hook 의 staged set 보존 동작 자체 (stage-back 의미 변경) 수정 — 외부 도구 영역, (iv) 본 불변식 위반 commit 의 사후 정정 (`git revert <hash>`) 의무화 결정 — 운영자 RULE-05 영역, (v) writer 영역 매트릭스 자체 변경 결정 — RULE-01 영역 (본 spec 은 매트릭스 inputs consumer 만), (vi) 발화 채널 (post-commit hook / pre-push hook / CI / 신규 `check:commit-writer-coherence` script 등) 선정 — 수단 영역.

## 공개 인터페이스
- 없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `git log -1 --name-only <hash>` + `git log -1 --format=%s <hash>` 의 두 출력을 RULE-01 §writer 매트릭스 inputs 로 cross-validation.

## 동작
1. **(C1) 메시지 prefix 추출 → writer 영역 매핑**: `git log -1 --format=%s <hash>` stdout 의 첫 token 패턴 매칭:
   - `^(feat|fix|refactor|chore|test|docs)(\(.*\))?:` → **developer** writer 영역.
   - `^spec\(planner\):` → **planner** writer 영역.
   - `^spec\(inspector\):` → **inspector** writer 영역.
   - `^req\(discovery\):` → **discovery** writer 영역.
   - `^followup\(developer\):` → **developer** writer 영역 (followup mode).
   - 위 패턴 어느 것에도 매치하지 않으면 "unscoped" 라벨 — 본 불변식 평가 대상 아님 (운영자 수동 commit, merge commit 등). 단, 본 표면이 운영 commit 수단으로 정상 사용되지 않는 한 baseline 측정 모집단은 에이전트 commit 한정.
2. **(C2) 변경 path 집합 추출 → writer 영역 매핑**: `git log -1 --name-only --format= <hash>` stdout 의 각 line 을 RULE-01 §쓰기 권한 매트릭스 본 박제 prefix 와 prefix-match:
   - `src/**` → **developer**.
   - `10.followups/**` → **developer** create / **discovery** mv.
   - `20.req/**` → **discovery** create / **inspector** mv (`→ 60.done/req/` 또는 `→ 50.blocked/req/`).
   - `30.spec/green/**` (excluding `.planner-seen`) → **inspector** create/edit.
   - `30.spec/green/.planner-seen` / `30.spec/blue/**` → **planner**.
   - `40.task/**` → **planner** create / **developer** mv (`→ 60.done/task/{slug}/` 또는 `→ 50.blocked/task/`).
   - `50.blocked/**` → 해당 writer 의 mv 영역 (req → inspector, task → developer 또는 planner, spec → planner).
   - `60.done/**` → 해당 writer 의 mv 영역 + writer 의 후속 박제 (예: developer `60.done/task/{slug}/result.md` create).
   - `package.json` / `package-lock.json` / `scripts/**` / `vite.config.js` / `vitest.config.js` / `eslint.config.js` / `tsconfig.json` / `.husky/**` / `index.html` / `public/**` / `.github/**` / `.gitignore` → **developer** (코드/도구 영역).
   - `.claude/rules/**` / `.claude/templates/**` / `.claude/agents/**` / `.claude/skills/**` / `.claude/settings*.json` / `.claude/pipeline.json` / `CLAUDE.md` → **운영자/메타** (에이전트 writer 영역 외).
3. **(C3) 일치 판정**: (C1) 의 추출 writer 영역 라벨 = (C2) 의 각 path 라벨 의 union 집합 (운영자/메타 라벨 제외 후) 단일 원소 일치. 즉 commit 1개의 변경 path 라벨 union 이 메시지 prefix 라벨과 byte-equal 일치하면 본 불변식 PASS. 변경 path 라벨 union 의 cardinality 가 2+ 면 cross-writer mixing 위반 (writer 영역 위반 path 의 라벨 + 메시지 prefix 라벨 stderr 박제 후 rc=1).
4. **(C4) 단일 commit / commit range 양면 적용**: `<hash>` 단독 또는 `<base>..HEAD` commit range 모두에 (C1)~(C3) 적용 가능. range 에서 K 개 commit 위반 시 K 개 모두 stderr 박제 + rc=1 (K=0 일 때만 rc=0).
5. **(C5) 자기참조 false-positive 부재**: 본 불변식을 측정하는 발화 표면 자체의 commit (예: `scripts/check-commit-writer-coherence.sh` 신규 + `package.json` 1줄 추가 = developer writer 영역 + `feat:` 메시지) 은 자기 검증 시 PASS — 자기참조 false-positive 발생 0.

### 회귀 중점
1. (R-1) `5639669` baseline 박제 사실 — 메시지 `spec(planner): 161차 tick HEAD=27e8c2e ...` + 변경 path = `package.json` (+1) / `scripts/check-eslint-ignores-vacuous-zero.sh` (+71 신규) / `specs/60.done/2026/05/18/task/eslint-ignores-vacuous-zero-check-script/TSK-20260518-21-*.md` (+75) / `specs/60.done/.../result.md` (+44). (C1) 메시지 → planner. (C2) path union → developer (`package.json` + `scripts/**` + `60.done/task/` result.md). (C3) planner ≠ developer 일치 위반 → rc=1 + stderr `commit 5639669: msg-scope=planner, paths=[package.json,scripts/check-eslint-ignores-vacuous-zero.sh,specs/60.done/2026/05/18/task/eslint-ignores-vacuous-zero-check-script/...] (developer)`.
2. (R-2) `7b15126` (TSK-20260517-25 가족 surface) — 메시지 developer + 변경 path 에 `specs/30.spec/green/.planner-seen` 1 파일 stage-back 포함 시 (C3) developer ≠ planner 일치 위반 → rc=1.
3. (R-3) normal single-writer commit — 예: `9b95b73` (`feat: CSS Modules drift ...` 메시지 + `package.json` + `scripts/check-css-modules-coherence.sh`) → (C1) developer, (C2) developer, (C3) 일치 PASS → rc=0.
4. (R-4) 발화 표면 자기 commit — `scripts/check-commit-writer-coherence.sh` 신규 + `package.json` 1줄 (developer writer 영역) + `feat: commit writer coherence ...` 메시지 → (C5) 자기참조 PASS → rc=0.
5. (R-5) commit range `<base>..HEAD` 가 5 commit 포함하고 그중 2 가 (R-1) 류 mismatch, 3 이 (R-3) 류 일치 → rc=1 + stderr 위반 2 commit 각각 박제 + 일치 3 commit silent. 자기 검증 시 자기 commit 미포함 baseline 보존.
6. (R-6) `.claude/locks/commit.busy` 류 lock 메커니즘 도입 시 (i) OOS 박제 보존 — 본 spec 은 lock 채택 자체를 평가하지 않고, lock 도입 후에도 mismatch 발생 시 (R-1) 류로 동일 발화. lock 부재 시에도 (R-1)~(R-5) 평가 자체는 유효.
7. (R-7) merge commit / cherry-pick / revert commit — 단순 (C1) 메시지 prefix 가 unscoped (예: `Merge branch ...` / `Revert "feat: ..."`) → 평가 대상 외 baseline. revert commit 의 변경 path 는 원본 commit 의 path 와 동치이므로 메시지 prefix 가 매트릭스 매칭 시 평가 대상.

## 의존성
- 내부 측정 대상: git history (`git log -1 --name-only --format=%s <hash>` + `<base>..HEAD` range 출력), RULE-01 §쓰기 권한 매트릭스 (writer 영역 prefix 박제 본).
- 외부 출처: git internals atomic index 직렬화 (`.git/index.lock`) — single-writer atomic 보장 (writer 영역 위반 사고는 동시 commit 의 race 가 아닌 단일 commit 내 cross-writer mixing 으로 한정).
- 역의존 (사용처):
  - `RULE-02 §commit` 규약 (`{scope}({agent}):` for non-developer / `{type}:` for developer) — 본 spec 의 (C1) 메시지 prefix 패턴 baseline inputs.
  - `RULE-01 §쓰기 권한 매트릭스` — 본 spec 의 (C2) path 라벨 매핑 baseline inputs.
  - `RULE-05 §긴급 롤백` (`git revert <hash>`) — 본 불변식 위반 commit 의 사후 정정 경로 (본 spec 은 정정 의무화 미박제, 단 정정 시 (R-1) 류 baseline 사실 보존).
- 직교:
  - `foundation/tooling.md` §동작 9 (REQ-013, ESLint flat-config `ignores` vacuous-zero) — tooling config 표면, 본 spec 의 commit transaction 표면과 별 axis.
  - `foundation/coverage-gate-exit-code-determinism-margin-axis.md` (REQ-20260518-008, β β) — coverage gate exit code 결정론, 본 spec 의 commit transaction 표면과 별 axis.
  - 가족 surface: `specs/60.done/2026/05/17/followups/20260517-2041-lint-staged-hook-cross-writer-stage.md` (lint-staged hook stage-back) — 본 (R-2) 의 baseline fixture.

## 스코프 규칙
- **expansion**: 불허 (측정 scope = `git log` 출력 + RULE-01 §쓰기 권한 매트릭스 박제 본 한정. `.git/objects/**` / working tree 디스크 상태 / lint-staged 내부 staged set 은 measure scope 외).
- **grep-baseline** (HEAD=`1fe05f4` 실측):
  - (A) `git log -1 --format=%s 5639669` → `spec(planner): 161차 tick HEAD=27e8c2e ...` → (C1) planner 매핑 PASS.
  - (B) `git log -1 --name-only --format= 5639669` → `package.json` / `scripts/check-eslint-ignores-vacuous-zero.sh` / `specs/60.done/2026/05/18/task/eslint-ignores-vacuous-zero-check-script/TSK-20260518-21-eslint-ignores-vacuous-zero-check-script.md` / `specs/60.done/2026/05/18/task/eslint-ignores-vacuous-zero-check-script/result.md` → (C2) union = {developer} → (C3) planner ≠ developer 위반 PASS (R-1 baseline 박제).
  - (C) `git log -1 --format=%s 9b95b73` → `feat: CSS Modules drift 단일 진단 명령 발화 채널 부착 (...)` → (C1) developer 매핑 PASS.
  - (D) `git log -1 --name-only --format= 9b95b73` → `package.json` / `scripts/check-css-modules-coherence.sh` → (C2) union = {developer} → (C3) developer = developer 일치 PASS (R-3 baseline 박제).
  - (E) `git log -1 --format=%s 7b15126` → developer 매핑 (구체 메시지 head record 의존) + (B) 와 동일 형식 path 추출 검증 — 본 spec 시점 baseline 평가는 `60.done/2026/05/17/followups/20260517-2041-...` 박제 인용.
  - (F-self) `awk '/^## 역할/,/^## 공개 인터페이스/' multi-agent-commit-message-writer-scope-coherence.md | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit 자기 검증 PASS (수단 라벨 0 — 발화 채널 / lock 메커니즘 / 정정 의무 어느 쪽이든 우선/권장 표현 0).
  - (G-self) `awk '/^## 역할/,/^## 공개 인터페이스/' multi-agent-commit-message-writer-scope-coherence.md | grep -cE "major version|메이저 버전|husky 9|lint-staged 16"` → 0 hit 자기 검증 PASS (메이저 버전 고정 표현 0).
  - (H-self) `awk '/^## 역할/,/^## 공개 인터페이스/' multi-agent-commit-message-writer-scope-coherence.md | grep -cE "incident|patch|HEAD `[0-9a-f]+`|회복"` → 0 hit 자기 검증 PASS (incident patch 평서 0 — `5639669` 등 baseline fixture 인용은 §회귀 중점 / §스코프 규칙 한정).
- **rationale**: (A)~(E) 5 게이트는 본 baseline HEAD `1fe05f4` 에서 git history 단일 명령 측정 가능 + RULE-01 §쓰기 권한 매트릭스 prefix 박제 본 inputs 로 합산 평가 가능. (F-self)~(H-self) 3 자기 검증 게이트는 §역할 한정 measure scope (NFR-04 self-reference scope 분리 박제) 로 본 spec 본문이 자기 fixture 가 되어 발생할 false-positive 회피. self-reference scope 분리 ratio = 본 baseline `awk` filter 결과 line 수 / 본문 전체 line 수.

## 테스트 현황
- [x] (C1) 메시지 prefix → writer 영역 매핑 baseline 5 prefix (developer/planner/inspector/discovery/followup-developer) — §동작 (C1) + grep-baseline (A)(C) 실측.
- [x] (C2) 변경 path → writer 영역 매핑 baseline 7 prefix 클래스 (`src/**` / `10.followups/**` / `20.req/**` / `30.spec/**` / `40.task/**` / `50.blocked/**` / `60.done/**`) + 8 도구 영역 path (`package.json` 등) — §동작 (C2) + grep-baseline (B)(D) 실측.
- [x] (C3) commit 1개 union 일치 판정 baseline — §동작 (C3) + (R-1)(R-3) 실측.
- [x] (C4) 단일/range 양면 적용 baseline — §동작 (C4) 평서문.
- [x] (C5) 자기참조 false-positive 부재 baseline — §동작 (C5) + (R-4) 평서문.
- [ ] (FR-03) 자동 검출 채널 (post-commit hook / pre-push hook / CI / `check:commit-writer-coherence` script 등) rc=0/1 결정론 발화 부착 — 수단 영역, planner task carve 대기.
- [x] (FR-04) HEAD 1 commit 단독 + commit range `<base>..HEAD` 양면 적용 baseline — §동작 (C4) + (R-5) 평서문.
- [ ] (FR-05) `.claude/locks/commit.busy` 또는 `flock /tmp/repo-commit.lock` 류 lock 메커니즘 채택 시 stale lock cleanup 의미 박제 — Could, 도입 결정 시 별 spec 또는 본 spec §동작 확장.
- [x] (R-1) `5639669` baseline 위반 박제 — grep-baseline (A)(B) 실측 PASS.
- [x] (R-3) `9b95b73` baseline 일치 박제 — grep-baseline (C)(D) 실측 PASS.

## 수용 기준
- [x] (Must, FR-01) 각 commit 의 변경 path set 은 단일 writer 영역에만 속해야 한다 — §동작 (C2) + (R-1)(R-3) baseline 박제.
- [x] (Must, FR-02) 각 commit 의 메시지 prefix 는 변경 path 의 writer 영역과 일치해야 한다 — §동작 (C1) + (C3) + (R-1)(R-3) baseline 박제.
- [ ] (Must, FR-03) FR-01/FR-02 위반 commit 을 결정론적으로 검출하는 시스템 표면 (예: `scripts/check-commit-writer-coherence.sh` 또는 post-commit hook) 존재 — 수단 중립, planner task carve 대기.
- [x] (Should, FR-04) 검증 표면은 HEAD 1 commit 단독 또는 commit range (`<base>..HEAD`) 모두에 적용 가능 — §동작 (C4) 평서문.
- [ ] (Could, FR-05) 동시 commit 진입 차단 lock 표면 채택 시 stale lock cleanup 의미 박제 — 도입 결정 시 별 spec 또는 본 spec §동작 확장.
- [x] (Must, NFR-01) 결정론 — 동일 commit `<hash>` 입력 → 항상 동일 rc / 동일 stderr 박제. 시간·환경 비의존.
- [x] (Must, NFR-02) 추적성 — 위반 commit 의 stderr 출력 형식 `commit <hash>: msg-scope=<X>, paths=[<p1>,<p2>,...] (<Y>)` 박제. §동작 (R-1) baseline.
- [x] (Must, NFR-03) 자기검증 — 검증 표면 자체의 commit (`scripts/check-commit-writer-coherence.sh` + `package.json` developer 영역 + `feat:` 메시지) 평가 시 false-positive 발생 0. §동작 (C5) + (R-4) baseline.
- [x] (Must, NFR-04) 자체 진단 scope 분리 — 본 spec §스코프 규칙 (F-self)(G-self)(H-self) 0 hit 자기 검증. §역할 한정 measure scope.
- [x] (Must, NFR-05) 외부 비파괴 — 본 흡수는 `.git/**` / `.husky/**` / `package.json` / `lint-staged` 설정 변경 동반 0. FR-03 자동 발화 채널 부착은 후속 task 영역.
- [x] (Must, NFR-06) RULE-01 / RULE-02 inputs 비파괴 — 본 spec 은 RULE-01 §쓰기 권한 매트릭스 + RULE-02 §commit 메시지 규약 박제 본을 inputs 로만 사용. inputs 자체 변경 결정은 본 spec 영역 외 (§의도적으로 하지 않는 것 (v)).
- [x] (Must, NFR-07) 시점 비의존 — git 메이저 bump / husky 메이저 bump / lint-staged 메이저 bump 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지. 외부 의존성 변경 시 (F-self)(G-self) 자기 검증 0 hit 보존 의무.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-18 | inspector 104차 (Phase 2, REQ-20260518-028 흡수) / (this commit, HEAD=`1fe05f4`) | 최초 등록 (REQ-20260518-028). commit transaction 단위 메시지 prefix ↔ 변경 path writer 영역 일치 시스템 불변식 박제. §동작 (C1)~(C5) 5 게이트 + §회귀 중점 7 시나리오 (R-1~R-7) + §스코프 규칙 grep-baseline (A)~(H-self) 8 gate 실측 (baseline mismatch `5639669` + baseline 일치 `9b95b73` 양면 박제 + 자기참조 false-positive 부재 + 3 self-check 0 hit) + §테스트 현황 10 marker (C1~C5 + FR-03~FR-05 + R-1/R-3) + §수용 기준 12 marker (FR-01~FR-05 + NFR-01~07). consumed req: `specs/20.req/20260518-multi-agent-commit-serialization-invariant.md` → `60.done/2026/05/18/req/` mv. 자매 직교: `foundation/tooling.md` §ESLint flat-config last-write-wins (REQ-20260422-058) + `foundation/coverage-gate-exit-code-determinism-margin-axis.md` (REQ-20260518-008, β). RULE-07 자기검증 — §동작 (C1)~(C5) 평서형 + git log/awk/grep 단일 명령 반복 검증 가능 + git/husky/lint-staged 메이저 bump 이벤트 비귀속 + `5639669` mismatch 같은 incident patch 비귀속 (baseline fixture 인용 한정 §회귀 + §스코프 규칙) + 수단 중립 (lock 메커니즘 / 정정 의무 / 발화 채널 어느 쪽이든 우선 라벨 0) + self-reference scope 분리 (NFR-04 + 스코프 (F-self)(G-self)(H-self) 0 hit). RULE-06 grep-baseline gate (A)~(H-self) 8 건 실측 박제. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/` 신규 1 spec + `20.req/* → 60.done/req/` mv). RULE-03 (d) — 본 carve 로 green 19 → 20 (= GREEN_PENDING_MAX, 차기 tick carve 보류 의무 진입). | all (최초 등록) |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/18/req/20260518-multi-agent-commit-serialization-invariant.md` (REQ-20260518-028, 본 104차 inspector tick mv).
- baseline fixtures (HEAD=`1fe05f4`):
  - mismatch: `5639669ae7ff9866700e9c64540a981f3cc44a71` — 메시지 `spec(planner): 161차 tick HEAD=27e8c2e ...` + 변경 path = `package.json` (+1) / `scripts/check-eslint-ignores-vacuous-zero.sh` (+71 신규) / `specs/60.done/2026/05/18/task/eslint-ignores-vacuous-zero-check-script/TSK-20260518-21-eslint-ignores-vacuous-zero-check-script.md` (+75) / `specs/60.done/.../result.md` (+44). (C1) planner ≠ (C2) developer.
  - 일치: `9b95b735d94df3ff4d1a621688efa2eda56900fd` — 메시지 `feat: CSS Modules drift 단일 진단 명령 발화 채널 부착 (scripts/check-css-modules-coherence.sh + npm script)` + 변경 path = `package.json` / `scripts/check-css-modules-coherence.sh`. (C1) developer = (C2) developer.
  - 가족 stage-back: `7b15126` (TSK-20260517-25 가족 surface) — `specs/60.done/2026/05/17/followups/20260517-2041-lint-staged-hook-cross-writer-stage.md` 박제 인용.
- **자매 직교 spec / req**:
  - `specs/30.spec/green/foundation/tooling.md` §ESLint flat-config last-write-wins 불변식 (REQ-20260422-058, 7477189 박제). 본 spec 과 직교 (tooling config 표면 vs commit transaction 표면).
  - `specs/30.spec/blue/foundation/coverage-gate-exit-code-determinism-margin-axis.md` (REQ-20260518-008, β β 신설 후 promote). 본 spec 과 직교 (coverage gate exit code 표면 vs commit transaction 표면).
  - `specs/60.done/2026/05/17/followups/20260517-2041-lint-staged-hook-cross-writer-stage.md` — lint-staged hook stage-back 가족 surface (본 R-2 baseline fixture 출처).
  - `specs/10.followups/20260518-1154-developer-planner-commit-race-message-mismatch.md` — 본 req §개요 baseline 신호 출처 (R-1 baseline fixture).
- **외부 출처**:
  - Git internals `.git/index.lock` (atomic index 직렬화) — https://git-scm.com/docs/git-index.
  - husky v9 hook chain — https://typicode.github.io/husky/.
  - lint-staged v16 staged set 보존 의미 — https://github.com/lint-staged/lint-staged.
- **RULE 준수**:
  - RULE-07: §동작 (C1)~(C5) 시점 비의존 평서문 + 반복 검증 가능 (git log/awk/grep 단일 명령) + incident 비귀속 (baseline mismatch `5639669` / baseline 일치 `9b95b73` 모두 측정 anchor 한정) + 수단 중립 (lock 메커니즘 / 정정 의무 / 발화 채널 어느 쪽이든 우선 라벨 0).
  - RULE-06: grep-baseline gate (A)~(H-self) 8 건 실측 수치 + line anchor + self-reference scope 분리 (NFR-04).
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/` 신규 1 spec + `20.req/* → 60.done/req/` mv).
  - RULE-03 (d): 본 carve 로 green 19 → 20 (= GREEN_PENDING_MAX, 차기 tick carve 보류 의무 진입).
