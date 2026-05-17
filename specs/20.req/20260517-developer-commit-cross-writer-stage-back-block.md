# developer commit cross-writer stage-back 차단 불변식 (lint-staged backup/restore 사이클 경유 자동 stage 침범)

> **ID**: REQ-20260517-095
> **작성일**: 2026-05-17
> **상태**: Draft

## 개요
developer 가 RULE-02 세션 시작 절차에 따라 `git reset HEAD -- <cross-writer-path>` 로 자기 writer 영역 외 변경을 unstage 한 후 `git commit` 을 실행할 때, lint-staged backup/restore 사이클이 working tree 의 cross-writer 변경을 결과 commit 에 자동 stage-back 하지 않아야 한다는 시스템 불변식을 박제한다. 본 req 는 followup `specs/10.followups/20260517-2041-lint-staged-hook-cross-writer-stage.md` (source_task: TSK-20260517-25) 의 관찰을 RULE-07 양성 평서로 재구성해 흡수한다.

## 배경
- 코드/이벤트 사실 (HEAD `7477189` 기준):
  - `.husky/pre-commit:1` — `npx lint-staged`. 이후 spec-coherence / vite-env-boundary gate 호출 (`.husky/pre-commit:3-12`).
  - `package.json:41-43` — `"lint-staged": { "src/**/*.{js,jsx,ts,tsx,d.ts}": "eslint" }`. glob 은 `src/**` 한정.
  - `package.json:59` — `"lint-staged": "^16.4.0"`. lint-staged 16.x 는 `git stash --include-untracked` + `--hide-partially-staged` 기반 backup → 작업 후 `git stash pop` 으로 restore.
- 관찰된 incident (감사 단서, 본 불변식 박제의 트리거):
  - 커밋 `7b15126` (`fix: FileUpload setTimeout cleanup 불변식 회복`) — `git log -1 --stat 7b15126` 결과:
    - 자기 writer 영역 4 파일 (`src/File/FileUpload.tsx`, `src/File/FileUpload.test.tsx`, `60.done/.../result.md`, `60.done/.../TSK-25.md`).
    - **cross-writer 침범 1 파일**: `specs/30.spec/green/.planner-seen` (+73 insertions) — planner writer 영역 marker. developer 가 `git reset HEAD --` 로 unstage 했으나 commit 에 포함됨.
    - cross-writer 비침범 1 파일: `specs/30.spec/green/.inspector-seen` — unstage 유지 (동일 unstage 처리에도 결과가 갈림 — 사이클 내부 비결정).
  - followup 본문 `specs/10.followups/20260517-2041-lint-staged-hook-cross-writer-stage.md:18-26` 가 stat 박제. 직전 incident `2293592` (planner 58차 tick promote 보완) 도 commit message 에 "lint-staged hook chain 영향" 명시 — 재현 surface 의 반복 가능성 시사.
- 기존 박제 점검:
  - `grep -rln "git reset HEAD\|stage-back\|stage\.back\|writer 영역.*위반" specs/30.spec/ specs/20.req/` → 0 hit. cross-writer stage-back 차단 불변식 **미박제**.
  - REQ-20260517-075 (`specs/60.done/2026/05/17/req/20260517-lint-staged-untracked-preservation.md`) 는 **untracked 파일 보존** 불변식 — backup 사이클이 untracked 파일을 drop 하지 않아야 함. 본 req 와 surface 분리:
    - REQ-075: untracked → drop 방지 (사라지지 않게).
    - 본 req: unstage → 자동 stage-back 방지 (저절로 포함되지 않게).
  - `30.spec/blue/foundation/tooling.md` §동작 1 (REQ-028 FR-01) — lint-staged glob 대상 불변식만 박제. backup/restore 사이클의 **cross-writer 침범 차단** 은 미박제.
  - RULE-02 §커밋 (`.claude/rules/RULE-02-AUTONOMY.md`) — "자기 영역 밖 staged 항목은 `git reset HEAD -- <path>` 로 언스테이지" 만 규정. **사이클이 unstage 결과를 보존해야 한다** 는 시스템 책임 박제는 부재 (RULE 은 행동 규약, 시스템 계약은 spec).
- RULE-07 양성 기준 자기검증:
  - (1) 평서문: "developer 가 `git reset HEAD -- <cross-writer-path>` 로 unstage 한 변경은 동일 `git commit` 의 결과에 포함되지 않는다" — ✓.
  - (2) 반복 검증: 재현 fixture (cross-writer marker working-tree 변경 + `git reset HEAD --` + `git commit` → `git log -1 --name-only HEAD` 에 marker 부재) 로 박제 가능 — ✓.
  - (3) 시점 비의존: TSK-25 incident 는 단서일 뿐, 모든 developer commit 사이클에 보편 적용. lint-staged 16.x / husky 9.x 마이너 업그레이드 시에도 동일 계약 유지 — ✓.
- 영향 위험:
  - cross-writer marker (`.planner-seen`, `.inspector-seen`) 가 developer commit 에 흡수되면 planner / inspector 의 tick 멱등성 침해. 두 에이전트가 자기 marker 의 HEAD blob hash 를 기준으로 정체/진행 판단하므로 외부 commit 이 marker 를 갱신/리셋하면 자기 보고에 false drift 발생.
  - 향후 cross-writer 침범이 marker 외 spec 본문/task 본문으로 확장될 경우 RULE-01 writer 매트릭스 침해 — SDLC 자율 운영 신뢰 손상.

## 목표
- **In-Scope**:
  - `30.spec/{blue,green}/foundation/tooling.md` 에 다음 두 불변식 박제 (또는 인근 신설 절):
    - (a) **cross-writer stage-back 차단 불변식**: developer 가 `git reset HEAD -- <path>` 로 unstage 한 working-tree 변경은 동일 `git commit` 의 결과 (`git log -1 --name-only HEAD`) 에 포함되지 않는다.
    - (b) **lint-staged backup/restore 사이클 책임 경계**: `npx lint-staged` 호출은 staged 영역 (lint-staged glob 매칭분) 의 lint/format 만 책임지며, glob 외 working-tree 변경을 `git add` 또는 동등 명령으로 staged 영역에 자동 승격하지 않는다.
  - 재현 fixture 박제 (1회 task result.md 에 hook-ack 후 spec 본문은 pointer 인용 가능):
    - (1) cross-writer marker (`specs/30.spec/green/.planner-seen` 또는 동등 cross-writer path) working-tree 변경 1건 준비.
    - (2) src 자기 영역 staged 변경 1건 준비.
    - (3) `git reset HEAD -- <cross-writer-path>` 로 unstage 확인 (`git status --short` 에서 cross-writer 가 `??` 또는 ` M` 으로 표시, 좌측 staged column 공백).
    - (4) `git commit -m "<msg>"` 실행.
    - (5) 사이클 완료 후 `git log -1 --name-only HEAD` 출력에 cross-writer path **부재** 확인.
  - 회귀 게이트 박제: 본 불변식 위반 재발 시 inspector 가 `30.spec/{blue,green}/foundation/tooling.md` §변경 이력 에 hook-ack 갱신 + developer 가 followups 발행 (TSK-25 incident 의 followup 처리 경로 표준화).
- **Out-of-Scope**:
  - lint-staged 라이브러리 내부 stash/restore 로직 패치 (외부 dep — 본 시스템 책임 밖).
  - husky / lint-staged 메이저 버전 업그레이드 계획 (별도 REQ-058 라인).
  - planner / inspector marker (`*.planner-seen`, `*.inspector-seen`) 파일 형식·내용 표준화 (별도 req 후보).
  - `.husky/pre-commit` 본문에 cross-writer 차단 가드 스크립트 추가 (본 req 는 spec 계약 박제 한정; 가드 구현은 task 계층 별도 carve).

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `30.spec/blue/foundation/tooling.md` (또는 신설 절) 에 평서문 박제: "developer 가 `git reset HEAD -- <cross-writer-path>` 로 unstage 한 working-tree 변경은 동일 `git commit` 의 결과에 포함되지 않는다." | Must |
| FR-02 | 동일 spec 에 평서문 박제: "`npx lint-staged` 호출은 lint-staged glob (`src/**/*.{js,jsx,ts,tsx,d.ts}`) 외 working-tree 변경을 staged 영역으로 자동 승격하지 않는다." | Must |
| FR-03 | 재현 fixture 박제 (cross-writer marker 변경 + `git reset HEAD --` + `git commit` → `git log -1 --name-only HEAD` 에 marker path 0 hit). 본 fixture 는 `60.done/task/**/result.md` 1회 박제 후 spec 본문은 hook-ack pointer 로 인용 가능. | Should |
| FR-04 | `.husky/pre-commit` 본문이 `git add -A`, `git add .`, `git stash drop`, `git stash pop` 등 사이드이펙트 명령을 직접 호출하지 않는다 — `grep -nE "git add -A\|git add \.\|git stash drop\|git stash pop" .husky/pre-commit` → 0 hit. lint-staged 내부 backup/restore 만 위임. | Should |
| FR-05 | 본 불변식 위반 회귀 시 (cross-writer 침범 재발) inspector 가 `30.spec/{blue,green}/foundation/tooling.md` §변경 이력 에 hook-ack 갱신, developer 는 followup 발행 — `50.blocked/req/` 격리 경로 미사용 (본 불변식은 시스템 계약 박제, 격리는 RULE-07 양성 위반 시에만). | Could |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | SDLC writer 무결성 | `git log --pretty=format:"%H" --since=<inspector-tick-window> -- specs/30.spec/green/.planner-seen` 결과의 author 가 planner commit ID 만 포함 (developer / inspector commit 부재). 동일 게이트가 `.inspector-seen` 에도 적용. |
| NFR-02 | 회귀 안정성 | FR-03 fixture 는 cross-writer path 1건 단위로 결정적 PASS — 사이클 내부 비결정성 (incident 에서 `.planner-seen` 침범 + `.inspector-seen` 비침범 동시 관찰) 없이 stage-back 0건 일관. |
| NFR-03 | spec 정합 (RULE-07) | 본 req 박제 토큰은 시점 비의존 평서문 + 반복 검증 가능. TSK-25 / commit `7b15126` 은 §배경 의 발견 경로로만 언급, §기능 요구사항 본문 불변식은 보편 계약. |

## 수용 기준
- [ ] Given `30.spec/blue/foundation/tooling.md`, When inspector 가 본 req 흡수, Then "developer `git reset HEAD --` unstage 결과는 동일 commit 결과에 포함되지 않는다" 평서문이 본문에 박제된다 (FR-01).
- [ ] Given 본 req 흡수 후 spec, When `grep -nE "stage-back\|cross-writer\|reset HEAD" specs/30.spec/blue/foundation/tooling.md`, Then ≥1 hit (FR-01/FR-02).
- [ ] Given `.husky/pre-commit`, When `grep -nE "git add -A\|git add \.\|git stash drop\|git stash pop" .husky/pre-commit`, Then 0 hit (FR-04).
- [ ] Given 재현 fixture (FR-03), When task result.md 박제, Then cross-writer path 가 `git log -1 --name-only HEAD` 출력에 0 hit (재현 PASS).
- [ ] Given `git log --name-only --since="2026-05-17" -- specs/30.spec/green/.planner-seen specs/30.spec/green/.inspector-seen`, When 본 불변식 박제 후 첫 cycle, Then author 가 planner / inspector commit 만 포함하고 developer commit (`fix:` / `feat:` / `chore:` 등 prefix) 부재 (NFR-01 게이트).

## 참고
- followup: `specs/10.followups/20260517-2041-lint-staged-hook-cross-writer-stage.md` (source_task: TSK-20260517-25, category: tooling, severity: low).
- 트리거 incident: commit `7b15126` (`fix: FileUpload setTimeout cleanup 불변식 회복`) — `git log -1 --stat 7b15126` 에서 `specs/30.spec/green/.planner-seen` +73 insertions 박제. 직전 incident `2293592` (planner 58차 tick) commit message 에 "lint-staged hook chain 영향으로 add side + .planner-seen 누락" 명시.
- src referer:
  - `.husky/pre-commit:1` — `npx lint-staged` 호출 (cross-writer 침범 surface 의 entry point).
  - `.husky/pre-commit:3-12` — spec-coherence + vite-env-boundary gate (본 req 의 hook 자체는 분리 surface, 본 불변식과 무관).
  - `package.json:41-43` — lint-staged glob 정의.
  - `package.json:59` — `lint-staged@^16.4.0` (backup/restore 사이클 책임 라이브러리).
- 선행 done (관련, 본 req 와 분리):
  - REQ-20260517-075 `lint-staged-untracked-preservation` — untracked 파일 drop 방지 (drop ≠ stage-back, surface 분리).
  - REQ-20260517-070 `husky-pre-push-typecheck-coverage` — pre-push 훅 typecheck 게이트.
  - REQ-20260517-028 (선행 line) `30.spec/blue/foundation/tooling.md` §동작 1 — lint-staged glob 대상 불변식 (cross-writer 차단 미박제).
- RULE 정합:
  - RULE-02 §커밋: "자기 영역 밖 staged 항목은 `git reset HEAD -- <path>` 로 언스테이지" — developer 행동 규약. 본 req 는 시스템이 그 행동의 효과를 보존해야 한다는 **계약** 박제.
  - RULE-01 writer 매트릭스: developer 는 `src/`, `10.followups/`, `40.task/* → 60.done/task/{slug}/ | 50.blocked/task/` 만. cross-writer marker stage-back 은 매트릭스 침범.
  - RULE-07 양성 자기검증 박제 (위 §배경 참조).
- 외부 참조:
  - lint-staged 16.x 문서: `--hide-partially-staged` 기본 활성화 + `git stash --include-untracked` 기반 backup → 작업 후 `git stash pop` 으로 restore. pop 사이클에서 working-tree 변경 처리 동작이 incident 표면.
  - husky 9.x 문서: `.husky/pre-commit` 은 shell script 직접 실행 (husky v9 deprecation 후 `_/husky.sh` source 불요).
