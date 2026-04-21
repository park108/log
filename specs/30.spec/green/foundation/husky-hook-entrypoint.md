# Husky hook 진입점 — 메이저 버전 지원 & deprecated shim 금지 불변식

> **위치**: `.husky/pre-commit`, `.husky/pre-push`, `package.json` (`"prepare"`, `devDependencies.husky`), `node_modules/husky/package.json` (설치 실측).
> **관련 요구사항**: REQ-20260422-044
> **최종 업데이트**: 2026-04-21 (by inspector, 신규 등록)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`d1a97a1`).

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

### 6. v8 shim 산물 잔존 금지 (REQ-044 FR-06, Should)
`.husky/_/` 디렉터리 (v8 shim 산물) 는 husky v9+ 설치 후 `prepare` 실행 결과로 재생성되지 않아야 한다. 저장소에 잔존 시 본 spec 의 FR-01 ~ FR-03 적용 부재로 간주하고 drift 로 처리한다.

### 회귀 중점
- hook 파일 첫 라인에 `_/husky.sh` source 재도입 시 deprecated 의존 부활 → 즉시 drift.
- `prepare` 스크립트를 과거 메이저 형태로 되돌림 → v10+ 에서 prepare 실행 실패 가능.
- husky dep range 를 `^8` 등 deprecated 메이저로 축소 → FR-03 위반.
- hook 본문 커맨드 (`npx lint-staged`, `npm test`) 를 치환·제거하면 FR-04 관찰 계약 회귀 → `regression-gate.md` FR-01 및 `coverage-determinism.md` FR-03 과 동시 위반.

## 의존성
- 외부: `husky` (Git hook 도구), `lint-staged` (pre-commit 커맨드), `npm` (pre-push 커맨드 runner), Git (hook 트리거러).
- 내부: `package.json` (`scripts.prepare`, `devDependencies.husky`, `scripts.test`), `.husky/pre-commit`, `.husky/pre-push`, `node_modules/husky/package.json` (설치 실측 — 간접).
- 역의존:
  - `foundation/regression-gate.md` — pre-push `npm test` 진입점 지속성 계약의 "진입점" 측을 본 spec 이 정의.
  - `foundation/coverage-determinism.md` FR-03 — `.husky/pre-push` L 의 `npm test` 가 coverage threshold 통과 조건임을 박제. hook 진입점 변경은 본 spec 범위이며 coverage 축은 별 spec.
  - `foundation/tooling.md` — lint-staged 가 pre-commit hook 에서 호출됨을 참조.

## 스코프 규칙
- **expansion**: N/A (본 spec 자체는 grep 게이트 박제형 spec; 실제 hook / package.json 수정은 task 계층 `expansion` 결정).
- **grep-baseline** (inspector 발행 시점, HEAD=`d1a97a1` 실측):
  - (a) `grep -nE "\"husky\":\s*\"\^?8" package.json` → 1 hit (`package.json:55` → `"husky": "^8.0.1"`). FR-03 위반 상태 — 전환 필요.
  - (b) `grep -nE "\"prepare\":\s*\"husky install\"" package.json` → 1 hit (`package.json:25` → `"prepare": "husky install"`). FR-02 위반 상태 — 전환 필요.
  - (c) `grep -rn "_/husky.sh" .husky/` → 2 hits (`.husky/pre-commit:2`, `.husky/pre-push:2`). FR-01 위반 상태 — 전환 필요.
  - (d) `ls -d .husky/_` → 1 hit (`.husky/_/` 디렉터리 존재). FR-06 위반 상태 — 전환 필요.
  - (e) `node -p "require('./node_modules/husky/package.json').version"` → `8.0.2`. FR-03 실측 위반.
  - (f) `grep -nE "npx lint-staged|npm test" .husky/pre-commit .husky/pre-push` → 2 hits (`.husky/pre-commit:4 → npx lint-staged`, `.husky/pre-push:4 → npm test`). FR-04 관찰 계약 baseline.
- **rationale**: baseline 게이트 (a)~(e) 는 본 spec 박제 시점에서 **모두 위반 상태** — 이는 spec 이 박제해야 하는 목표 계약과 현실 사이의 drift. (f) 는 관찰 계약 baseline 으로, FR-04 회귀 검증 시 수정 후에도 동일 2 hits 가 유지되어야 함. 전환 task (planner 관할) 는 expansion 불허로 carve 예상이며, 수정 파일은 `.husky/pre-commit`, `.husky/pre-push`, `package.json`, `.husky/_/` 제거 한정.

## 테스트 현황
- [ ] (f) FR-04 관찰 계약 baseline 은 박제됨; 실제 회귀 테스트 (commit/push 차단) 는 수동 검증 또는 task DoD 에서 커버.
- [ ] (a)~(e) FR-01/02/03/06 위반 상태 — 전환 task 완료 전까지 미충족.
- [x] `coverage-determinism.md` FR-03 이 `.husky/pre-push` 의 `npm test` 진입점 지속성을 박제 (상호 정합).

## 수용 기준
- [ ] (Must, FR-01) `.husky/pre-commit`, `.husky/pre-push` 는 `_/husky.sh` source 및 `#!/usr/bin/env sh` shebang 을 포함하지 않는다.
- [ ] (Must, FR-02) `package.json.scripts.prepare` 는 현행 husky 메이저 (v9) 권장 형태 `"husky"` 와 일치하며 `"husky install"` 을 포함하지 않는다.
- [ ] (Must, FR-03) `package.json.devDependencies.husky` range 는 husky `>=9` 를 만족하고 `^8.*` / `~8.*` 등 deprecated 메이저를 만족하지 않는다. 설치 실측 major ≥ 9.
- [ ] (Must, FR-04) 전환 후 `git commit` 시 lint-staged 차단, `git push` 시 `npm test` 차단 관찰 계약 유지. 4축 coverage range 0.00.
- [ ] (Should, FR-05) spec 본문이 특정 Git hook 도구를 강제하지 않고, husky 가 dep 로 존재하는 한에서 husky 경로 규약을 따른다.
- [ ] (Should, FR-06) `.husky/_/` 디렉터리 저장소에 잔존하지 않는다.
- [ ] (Must, 스코프) 전환 task 수정 대상은 `package.json`, `.husky/pre-commit`, `.husky/pre-push`, `.husky/_/` (제거) 한정. `src/**`, `vite.config.js`, `.github/workflows/**` 변경 0.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / HEAD=d1a97a1 | 최초 등록 (REQ-20260422-044). Git hook 진입점이 husky 메이저의 deprecated shim 경로에 의존하지 않는다는 시스템 계약 박제. baseline 실측: `package.json:25` (`prepare: "husky install"`), `package.json:55` (`husky: "^8.0.1"`), `.husky/pre-commit:2` & `.husky/pre-push:2` (`_/husky.sh` source), `.husky/_/` 디렉터리 존재, 설치 실측 `8.0.2`. 유지 지원 메이저 하한 = v9 (husky 업스트림 deprecation 정책; 변동 시 본 이력에 갱신). | 신규 전 섹션 |

## 참고
- **REQ 원문 (완료 이동)**: `specs/60.done/YYYY/MM/DD/req/20260422-husky-v9-deprecated-hook-shim-migration.md`.
- **관련 spec**:
  - `specs/30.spec/blue/foundation/regression-gate.md` (FR-01 — `npm test` 진입점 지속성; 본 spec 은 진입점 측 불변식).
  - `specs/30.spec/blue/foundation/coverage-determinism.md` (FR-03 — hook 통과 조건 = coverage threshold 통과 조건).
  - `specs/30.spec/blue/foundation/tooling.md` (lint-staged 가 `.husky` 호출됨을 참조).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (런타임 의존성 회귀 게이트 — 축 직교; 본 spec 은 **Git hook 도구 메이저 축**).
- **외부 출처** (req 참조):
  - [typicode/husky releases (GitHub)](https://github.com/typicode/husky/releases) — v9 changelog, v10 deprecation removal 예정.
  - [Migrate from husky 8 to 9 (remarkablemark, 2024-02-04)](https://remarkablemark.org/blog/2024/02/04/how-to-migrate-from-husky-8-to-9/).
  - [Backwards compatibility with Husky 8.x (#1374)](https://github.com/typicode/husky/issues/1374).
- **RULE 준수**:
  - RULE-07: FR-01~04 는 husky 업스트림 deprecation 정책이 바뀌어도 반복 검증 가능한 평서형 계약 (시점 비의존). "v9 이상" 과 같은 구체 숫자는 §변경 이력 에서 갱신하는 방식으로 spec 본문의 시점 의존성을 최소화.
  - RULE-06: grep-baseline 6 gate 실측 수치 박제 (위반 상태 포함).
  - RULE-01: inspector writer 영역만 (green/foundation 신규 + 20.req → 60.done/req mv). `.husky/*`, `package.json`, `src/**` 변경 0.
