# Husky hook 진입점 — 메이저 버전 지원 & deprecated shim 금지 불변식

> **위치**: `.husky/pre-commit`, `.husky/pre-push`, `package.json` (`"prepare"`, `devDependencies.husky`), `node_modules/husky/package.json` (설치 실측).
> **관련 요구사항**: REQ-20260422-044, REQ-20260422-047 (FR-06 재박제)
> **최종 업데이트**: 2026-04-22 (by inspector, REQ-047 흡수 재등록)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`ca4bb37`).

## 역할
Git hook 진입점이 husky (또는 동류 도구) 메이저 버전의 **deprecated shim 경로에 의존하지 않는다** 는 시스템 계약을 박제한다. hook 이 호출하는 실제 커맨드 (`npx lint-staged`, `npm test`) 의 관찰 계약을 유지하는 한에서 메이저 업그레이드가 반복 적용 가능하게 한다. 의도적으로 하지 않는 것: hook 커맨드 자체 치환 (regression-gate.md / coverage-determinism.md 관할), lint-staged / 기타 도구 메이저 업그레이드, 다른 Git hook 도구로의 치환.

## 공개 인터페이스
- 소비 파일 / 엔트리:
  - `.husky/pre-commit` — `git commit` 시 실행. 본 spec 하에서는 deprecated shim 없이 `npx lint-staged` 를 실행.
  - `.husky/pre-push` — `git push` 시 실행. 본 spec 하에서는 deprecated shim 없이 `npm test` 를 실행.
  - `package.json` `scripts.prepare` — husky 현행 메이저의 **공식 권장 형태** 와 일치.
  - `package.json` `devDependencies.husky` — 현행 유지 지원 메이저 (본 spec 기준 `>=9`) 에 포함되는 SemVer range.
- 관찰 계약 (외부 호출자 관점):
  - `git commit` → lint-staged 실행 & 실패 시 commit 차단.
  - `git push` → `npm test` 실행 & 실패 시 push 차단.

## 동작

### 1. Deprecated shim 금지 불변식 (REQ-044 FR-01)
`.husky/pre-commit`, `.husky/pre-push` 두 파일은 husky 메이저에서 **deprecated 표식된 shim 구문** 을 포함하지 않는다. 구체 금지 패턴:
- `_/husky.sh` source 라인 (예: `. "$(dirname "$0")/_/husky.sh"`).
- `#!/usr/bin/env sh` 형태 shebang (v9 에서 불필요 & deprecated 경로에 동반 박제).

hook 본문의 실제 실행 커맨드 (`npx lint-staged`, `npm test`) 는 첫 번째 non-empty · non-comment 라인에서 시작 가능하다.

### 2. `prepare` 스크립트 현행 권장 형태 불변식 (REQ-044 FR-02)
`package.json` 의 `"prepare"` 값은 현재 설치된 husky 메이저의 **공식 문서 권장 형태** 와 일치한다. 본 spec 박제 시점 (husky v9 기준) 권장 형태는 `"prepare": "husky"`. 메이저 상향 시 §변경 이력 에 해당 메이저의 권장 형태를 갱신 박제하며, 이전 메이저의 deprecated 형태 (`husky install` 등) 는 잔존하지 않는다.

### 3. husky dep range 유지 지원 메이저 불변식 (REQ-044 FR-03)
`package.json` 의 `"husky"` dev dependency SemVer range 는 **deprecated 메이저 (v8 이하) 를 만족시키지 않는다**. 본 spec 박제 시점 기준 허용 range 는 husky `>=9`. `npm install` 후 `node_modules/husky/package.json.version` 실측이 해당 range 를 만족한다. 유지 지원 메이저 하한 숫자는 husky 업스트림 deprecation 정책 변동에 따라 §변경 이력 에서 갱신한다 (수단 중립성 — FR-05 참고).

### 4. 관찰 계약 보존 불변식 (REQ-044 FR-04)
FR-01~03 적용은 다음 외부 호출자 관점 관찰 계약을 변경하지 않는다:
- (a) `git commit` 트리거 경로에서 `npx lint-staged` 가 staged 파일에 대해 실행되고 lint 실패 시 commit 이 차단된다.
- (b) `git push` 트리거 경로에서 `npm test` 가 실행되고 테스트 실패 시 push 가 차단된다.
- (c) `npm test` 의 4축 coverage (Statements/Branches/Functions/Lines) 수치는 `coverage-determinism.md` FR-01 의 결정론 조건 하에서 전환 전후 range 0.00 을 만족한다.

### 5. 수단 중립성 (REQ-044 FR-05, Should)
본 spec 은 "husky" 라는 특정 도구를 강제하지 않는다. `package.json` 에 husky dep 가 존재하는 한 FR-01~04 는 husky 경로 규약을 따르며, 후속 교체 (lefthook, simple-git-hooks 등) 발생 시 본 spec 은 archive 후 대체 spec 이 동일 성질의 불변식 (진입점이 해당 도구 메이저의 deprecated 경로에 의존하지 않음) 을 박제한다.

### 6. Deprecated shim 산물 저장소 추적 금지 (REQ-044 FR-06, REQ-047 재정의, Should)
husky dispatcher 디렉터리 (`.husky/_/`) 의 **어떤 파일도 저장소에 추적되지 않는다**. 측정 축은 **저장소 (git 추적)** — `git ls-files .husky/_` → 0 lines 로 검증한다. 작업 트리 (`ls -d .husky/_`) 존재 여부는 husky 현행 메이저의 런타임 동작 (v9 기준 `prepare` 실행 시 dispatcher 재생성 + `.husky/_/.gitignore = *` 로 git 추적 제외) 에 귀속되므로 본 불변식 측정 대상에서 제외한다. 본 축 재정의 근거는 §변경 이력 참조.

### 회귀 중점
- hook 파일 첫 라인에 `_/husky.sh` source 재도입 시 deprecated 의존 부활 → 즉시 drift.
- `prepare` 스크립트를 과거 메이저 형태로 되돌림 → v10+ 에서 prepare 실행 실패 가능.
- husky dep range 를 `^8` 등 deprecated 메이저로 축소 → FR-03 위반.
- hook 본문 커맨드 (`npx lint-staged`, `npm test`) 를 치환·제거하면 FR-04 관찰 계약 회귀 → `regression-gate.md` FR-01 및 `coverage-determinism.md` FR-03 과 동시 위반.
- `.husky/_/` 하위 파일이 `git add -f` 등으로 강제 추적되면 FR-06 위반 (저장소 축).

## 의존성
- 외부: `husky` (Git hook 도구), `lint-staged` (pre-commit 커맨드), `npm` (pre-push 커맨드 runner), Git (hook 트리거러).
- 내부: `package.json` (`scripts.prepare`, `devDependencies.husky`, `scripts.test`), `.husky/pre-commit`, `.husky/pre-push`, `node_modules/husky/package.json` (설치 실측 — 간접), `.husky/_/.gitignore` (husky v9 자동 생성 — 간접).
- 역의존:
  - `foundation/regression-gate.md` — pre-push `npm test` 진입점 지속성 계약의 "진입점" 측을 본 spec 이 정의.
  - `foundation/coverage-determinism.md` FR-03 — `.husky/pre-push` L 의 `npm test` 가 coverage threshold 통과 조건임을 박제. hook 진입점 변경은 본 spec 범위이며 coverage 축은 별 spec.
  - `foundation/tooling.md` — lint-staged 가 pre-commit hook 에서 호출됨을 참조.
  - `foundation/dependency-set-integrity.md` — `.husky/**` 이 FR-02 (b) 축 설정 파일 화이트리스트 내 참조 지점.

## 스코프 규칙
- **expansion**: N/A (본 spec 자체는 grep 게이트 박제형 spec; 실제 hook / package.json 수정은 task 계층 `expansion` 결정).
- **grep-baseline** (inspector 발행 시점, HEAD=`ca4bb37` 실측):
  - (a) `grep -nE "\"husky\":\s*\"\^?8" package.json` → 1 hit (`package.json:55` → `"husky": "^8.0.1"`). FR-03 위반 상태 — 전환 필요.
  - (b) `grep -nE "\"prepare\":\s*\"husky install\"" package.json` → 1 hit (`package.json:25` → `"prepare": "husky install"`). FR-02 위반 상태 — 전환 필요.
  - (c) `grep -rn "_/husky.sh" .husky/pre-commit .husky/pre-push` → 2 hits (`.husky/pre-commit:2`, `.husky/pre-push:2`). FR-01 위반 상태 — 전환 필요.
  - (d) `git ls-files .husky/_` → 0 lines. FR-06 (재정의) 기 충족 상태 — 저장소에 `.husky/_/` 하위 파일 추적 없음. `.husky/_/.gitignore = *` 가 husky v9 기본 레이아웃으로 기 보장.
  - (e) `node -p "require('./node_modules/husky/package.json').version"` → `8.0.2`. FR-03 실측 위반 (설치 실측).
  - (f) `grep -nE "npx lint-staged|npm test" .husky/pre-commit .husky/pre-push` → 2 hits (`.husky/pre-commit:4 → npx lint-staged`, `.husky/pre-push:4 → npm test`). FR-04 관찰 계약 baseline.
- **rationale**: baseline 게이트 (a)(b)(c)(e) 는 FR-01/02/03 위반 — 전환 task (supersedes TSK-20260421-90) 완료 후 0 hit 도달. (d) 는 FR-06 저장소 축 재정의 후 **기 충족** — 본 spec 은 해당 불변식이 husky v9 현실에서 항상 참임을 박제. (f) 는 관찰 계약 baseline, FR-04 회귀 검증 시 동일 2 hits 유지. 전환 task 는 expansion 불허로 carve 예상이며, 수정 파일은 `.husky/pre-commit`, `.husky/pre-push`, `package.json` 한정 (`.husky/_/` 작업 트리 제거는 더 이상 DoD 에 포함되지 않음 — v9 런타임이 재생성).

## 테스트 현황
- [ ] (f) FR-04 관찰 계약 baseline 은 박제됨; 실제 회귀 테스트 (commit/push 차단) 는 수동 검증 또는 task DoD 에서 커버.
- [ ] (a)(b)(c)(e) FR-01/02/03 위반 상태 — 전환 task (supersedes TSK-20260421-90) 완료 전까지 미충족.
- [x] (d) FR-06 저장소 축 재정의 — `git ls-files .husky/_` → 0 lines 기 충족 (husky v9 `.gitignore = *` 기본 레이아웃).
- [x] `coverage-determinism.md` FR-03 이 `.husky/pre-push` 의 `npm test` 진입점 지속성을 박제 (상호 정합).

## 수용 기준
- [ ] (Must, FR-01) `.husky/pre-commit`, `.husky/pre-push` 는 `_/husky.sh` source 및 `#!/usr/bin/env sh` shebang 을 포함하지 않는다.
- [ ] (Must, FR-02) `package.json.scripts.prepare` 는 현행 husky 메이저 (v9) 권장 형태 `"husky"` 와 일치하며 `"husky install"` 을 포함하지 않는다.
- [ ] (Must, FR-03) `package.json.devDependencies.husky` range 는 husky `>=9` 를 만족하고 `^8.*` / `~8.*` 등 deprecated 메이저를 만족하지 않는다. 설치 실측 major ≥ 9.
- [ ] (Must, FR-04) 전환 후 `git commit` 시 lint-staged 차단, `git push` 시 `npm test` 차단 관찰 계약 유지. 4축 coverage range 0.00.
- [ ] (Should, FR-05) spec 본문이 특정 Git hook 도구를 강제하지 않고, husky 가 dep 로 존재하는 한에서 husky 경로 규약을 따른다.
- [x] (Should, FR-06, REQ-047) `git ls-files .husky/_` → 0 lines. 저장소에 `.husky/_/` 하위 파일이 추적되지 않는다. 작업 트리 존재 여부는 측정 대상이 아니다.
- [ ] (Must, 스코프) 전환 task 수정 대상은 `package.json`, `.husky/pre-commit`, `.husky/pre-push` 한정. `src/**`, `vite.config.js`, `.github/workflows/**` 변경 0. `.husky/_/` 작업 트리 삭제는 DoD 에서 제거 (v9 런타임이 재생성하므로 시점 비의존 계약 불가).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / HEAD=d1a97a1 | 최초 등록 (REQ-20260422-044). Git hook 진입점이 husky 메이저의 deprecated shim 경로에 의존하지 않는다는 시스템 계약 박제. baseline 실측: `package.json:25` (`prepare: "husky install"`), `package.json:55` (`husky: "^8.0.1"`), `.husky/pre-commit:2` & `.husky/pre-push:2` (`_/husky.sh` source), `.husky/_/` 디렉터리 존재, 설치 실측 `8.0.2`. 유지 지원 메이저 하한 = v9 (husky 업스트림 deprecation 정책; 변동 시 본 이력에 갱신). | 신규 전 섹션 |
| 2026-04-21 | planner / HEAD=910b36d | stale=3 도달 — `30.spec/green/foundation/husky-hook-entrypoint.md` → `50.blocked/spec/foundation/husky-hook-entrypoint.md` 격리. 근거: FR-06 본문 ("`.husky/_/` 디렉터리 저장소에 잔존하지 않는다") + DoD (`ls -d .husky/_` → not found) 가 husky v9+ 런타임 (`.husky/_/` 자동 재생성 + `.gitignore = *`) 과 구조적 충돌로 RULE-07 "반복 검증 가능 & 시점 비의존" 기준 잠재 위반. FR-01 ~ FR-05 은 위반 없음. | FR-06, §수용 기준, §스코프 규칙 (d), §테스트 현황 |
| 2026-04-22 | inspector / HEAD=ca4bb37 | REQ-20260422-047 흡수 재등록. FR-06 측정 축을 **저장소 (git 추적)** 로 재정의 — `git ls-files .husky/_` → 0 lines. 선택 근거 (REQ-047 FR-01 = 재정의 택일): (i) 저장소 축은 husky v9.1.7 현실에서 `.husky/_/.gitignore = *` 로 기 충족되어 시점·버전 비의존 평서형 계약 성립 (RULE-07 양성 기준); (ii) 작업 트리 축 (`ls -d .husky/_`) 은 husky v9+ 에서 항상 위반 = spec 양성 기준 결함; (iii) FR-01 (`_/husky.sh` source 금지) + FR-03 (dep range `>=9`) 은 deprecated shim 경로 의존 방지를 커버하나, FR-06 저장소 축은 직교 불변식 (`git add -f .husky/_/*` 류 악의·실수 방어) 으로 중복 방어 아님 = 재정의 채택 (삭제 반려). baseline 실측 (HEAD=ca4bb37): (a) 1 hit, (b) 1 hit, (c) 2 hits, (d) 0 lines (FR-06 기 충족), (e) 8.0.2, (f) 2 hits. RULE-07 자기검증: FR-01~06 전원 평서형·반복 검증 가능·시점 비의존; "husky v9.1.7" 실측 버전은 §변경 이력 에서만 갱신 박제하고 본문에는 "현행 husky 메이저" 로 버전 중립 표현. 1회성 진단/incident patch 플랜 부재. RULE-06: (d) 게이트 측정법 교체 (`ls -d` → `git ls-files`), DoD 에서 작업 트리 제거 지시 삭제. | FR-06 본문, §수용 기준 FR-06, §스코프 규칙 (d), §테스트 현황 (d), §회귀 중점 |

## 참고
- **REQ 원문 (완료 이동)**:
  - `specs/60.done/2026/04/21/req/20260422-husky-v9-deprecated-hook-shim-migration.md` (상위 포괄 req, REQ-044).
  - `specs/60.done/2026/04/22/req/20260422-husky-v9-hook-entrypoint-fr06-respecification.md` (FR-06 재박제, REQ-047).
- **관련 spec**:
  - `specs/30.spec/blue/foundation/regression-gate.md` (FR-01 — `npm test` 진입점 지속성; 본 spec 은 진입점 측 불변식).
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (FR-03 — hook 통과 조건 = coverage threshold 통과 조건).
  - `specs/30.spec/blue/foundation/tooling.md` (lint-staged 가 `.husky` 호출됨을 참조).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (런타임 의존성 회귀 게이트 — 축 직교; 본 spec 은 **Git hook 도구 메이저 축**).
  - `specs/30.spec/green/foundation/dependency-set-integrity.md` (bump 전 집합 정합성 — `.husky/**` 을 설정 파일 화이트리스트로 포함).
- **선행 blocked (재진입 경로)**: `specs/50.blocked/spec/foundation/husky-hook-entrypoint.md` (+ `_reason.md`) — FR-01~FR-05 보존, FR-06 만 재박제한 본 green 이 재진입 spec.
- **선행 blocked task (supersedes 대상)**: `TSK-20260421-90` (planner 가 신규 task carve 시 `supersedes: TSK-20260421-90` 메타 기대).
- **외부 출처** (req 참조):
  - [typicode/husky releases (GitHub)](https://github.com/typicode/husky/releases) — v9 changelog, v10 deprecation removal 예정.
  - [Migrate from husky 8 to 9 (remarkablemark, 2024-02-04)](https://remarkablemark.org/blog/2024/02/04/how-to-migrate-from-husky-8-to-9/).
  - [Backwards compatibility with Husky 8.x (#1374)](https://github.com/typicode/husky/issues/1374).
  - [typicode/husky v9.0.0 release notes](https://github.com/typicode/husky/releases/tag/v9.0.0) — `.husky/_/` dispatcher 레이아웃 + `.gitignore = *` 기본.
- **RULE 준수**:
  - RULE-07: FR-01~06 은 husky 업스트림 deprecation 정책이 바뀌어도 반복 검증 가능한 평서형 계약 (시점 비의존). "v9 이상" 과 같은 구체 숫자는 §변경 이력 에서 갱신하는 방식으로 spec 본문의 시점 의존성을 최소화. FR-06 재정의로 husky v9 현실에서 항상 참인 측정 축으로 전환.
  - RULE-06: grep-baseline 6 gate 실측 수치 박제 (위반 상태 포함). 게이트 (d) 측정법 `ls -d .husky/_` → `git ls-files .husky/_` 교체.
  - RULE-01: inspector writer 영역만 (green/foundation 신규 + 20.req → 60.done/req mv). `.husky/*`, `package.json`, `src/**` 변경 0.
  - RULE-02: `src/**` / `package.json` / `docs/**` / `.github/**` / `.husky/**` 편집 부재 — 세션 diff 는 `30.spec/green/foundation/husky-hook-entrypoint.md` 신설 + `20.req/*` → `60.done/2026/04/22/req/` mv + `.inspector-seen` 갱신 한정.
