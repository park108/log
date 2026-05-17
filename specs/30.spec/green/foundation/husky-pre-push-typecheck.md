# husky pre-push typecheck — local early signal 효능 불변식

> **위치**: `.husky/pre-push` 훅 본문 (POSIX shell, husky `>=9` 실행기 경유) + `package.json:scripts.typecheck` 진입점 (`tsc --noEmit`) + `tsconfig.json:compilerOptions` (strict 정책 — `typecheck-island-extension.md` 박제 시점 가정).
> **관련 요구사항**: REQ-20260517-089 (선행 REQ-20260517-060 spec 박제 미흡수 audit 회수).
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제, REQ-089 흡수 / REQ-060 pre-push typecheck 효능 박제 미완료 audit 회수).

> 참조 코드는 **식별자 우선**. 라인 번호는 박제 시점 스냅샷 (HEAD=`e7d6e92`).

## 역할
`.husky/pre-push` 훅 실행 중 typecheck 효능 명령 (`npm run typecheck` 또는 `tsc --noEmit` 같은 동등 효능 명령) 이 1+ 회 호출되어, type 오류 도입 시 push 차단을 발생시킨다는 시스템 불변식. 본 효능은 **local early signal** 채널 — `regression-gate.md` (REQ-20260421-037 §FR-01) CI workflow typecheck step (final guard) 과 **시점 분리 보완 관계** 이며, 어느 한 축 위반이 다른 축의 게이트를 자동 충족시키지 않는다. 본 게이트는 (a) `regression-gate.md` (CI typecheck step — final guard) 와 직교, (b) `coverage-determinism.md` (REQ-20260422-041, `.husky/pre-push` `npm test` 측정 결정론) 와 직교 — typecheck rc 보조 vs coverage 측정 결정론 별 채널, (c) `typecheck-island-extension.md` (REQ-077, island 정의 후반부 typecheck error 0 효능) 의 **로컬 시점 보조** — typecheck 게이트 시점 (local pre-push vs CI workflow) 의 다층 분리 정합. 의도적으로 하지 않는 것: typecheck 호출 위치 선정 (`npm test` 전 vs 후 vs 별 wrap script), 호출 형태 (`npm run typecheck` vs `npx tsc --noEmit` vs `tsc --noEmit`), 직렬화 방식 (`&&` 직렬 vs `;` 무조건 vs 별 줄 + `|| exit 1`), `.husky/pre-commit` typecheck 편입 (lint-staged staged 파일 lint 채널 유지 — REQ-060 Out-of-Scope), `git push --no-verify` hook 우회 정책 (local hook 의 본질적 우회 가능성 — final guard 는 CI 영역), typecheck 시간 최적화 (`tsc --incremental` 등 — 별 축), master HEAD typecheck rc=0 수렴 자체 (REQ-20260422-054 `typecheck-exit-zero` 관할 — 본 spec FR-06 의존), `.husky/pre-push` 호출 명령 갯수 / 순서 / 직렬화 정책 (본 spec 은 typecheck 명령 1+ hit 효능만 박제), dep bump 후 3 명령 회귀 0 게이트 (REQ-035 관할 — typecheck 미포함 별 축), CI workflow typecheck step 자체 (REQ-037 관할 — 별 시점 게이트).

## 공개 인터페이스
- 측정 대상: `.husky/pre-push` 훅 본문 (POSIX shell) + `git push --dry-run` rc (보조 게이트).
- 측정 명령 (selector):
  - **(M-A) hook 본문 typecheck 호출 정량**: `grep -nE "typecheck|tsc" .husky/pre-push` → hit count 측정. 본 spec 효능 도입 후 1+ hit 수렴.
  - **(M-B) 기존 명령 보존 정량**: `grep -nE "npm test|check:deps" .husky/pre-push` → 2+ hit 유지 (FR-05 보존 baseline).
  - **(M-C) push 차단 효능 (보조)**: type 오류 도입 fixture commit 후 `git push --dry-run` rc ≠ 0 (실제 push 차단 효능 측정 — 별 task fixture 영역).
- 게이트 표현:
  - **local early signal**: 측정 명령 (M-A) → 1+ hit. type 오류 도입 시 `git push` rc ≠ 0 (hook 종료 코드 ≠ 0 → push 차단 husky `>=9` 공통 계약).
  - **기존 채널 보존**: 측정 명령 (M-B) → 2+ hit 유지 (REQ-066 `check:deps` 회수 + REQ-041 `coverage-determinism` `npm test` 의존 보존).

## 동작
1. **(I1) local early signal 효능**: `.husky/pre-push` 훅 본문에 typecheck 효능 명령 (`npm run typecheck` 또는 `tsc --noEmit` 같은 동등 효능 명령) 이 1+ 회 호출되어, type 오류 도입 시 hook 종료 코드 ≠ 0 → push 차단. 측정 명령 (M-A) `grep -nE "typecheck|tsc" .husky/pre-push` → 1+ hit. 본 게이트는 husky `>=9` 의 hook 실행 계약 (exit code ≠ 0 시 git operation 차단) 에 의존 — husky 메이저 버전 무관 (husky 메이저 bump 시점에 hook 실행 계약 호환성 유지 가정).
2. **(I2) CI final guard 와 시점 분리 보완**: 본 효능은 `regression-gate.md` (REQ-037) §FR-01 CI workflow typecheck step (`.github/workflows/ci.yml` `run: npm run typecheck`) 와 **시점 분리 보완 관계** — (a) pre-push hook 은 `git push --no-verify` 로 우회 가능, (b) local 환경에서만 작동, (c) fork 외부 contributor 의 push 는 hook 미작동. 따라서 master HEAD typecheck rc=0 의 **final guard 는 CI workflow typecheck step** 이며, pre-push 훅은 **early signal 보조**. 어느 한 축 위반 (pre-push 우회 또는 CI step 제거) 이 다른 축의 게이트를 자동 충족시키지 않는다.
3. **(I3) 기존 명령 보존 (FR-05 정합)**: 본 효능 도입은 `.husky/pre-push` 기존 명령 (REQ-066 `npm run check:deps || exit 1` runtime dep coherence 게이트 + REQ-041 `npm test` coverage 측정 결정론 게이트) 호출의 **추가** 이며 대체 아니다. 두 기존 명령 회귀 보호 효능은 보존. 측정 명령 (M-B) `grep -nE "npm test|check:deps" .husky/pre-push` → 각 1+ hit 유지.
4. **(I4) 수단 중립 (RULE-07)**: 본 효능 보장은 (a) `npm run typecheck` 호출 (package.json:scripts.typecheck 경유), (b) `npx tsc --noEmit` (직접 호출), (c) `tsc --noEmit` (node_modules/.bin PATH 의존), (d) 별 wrap script (`bash scripts/check-typecheck.sh`) — 어느 수단이든 수용. 본 spec 본문 어느 곳에서도 수단 후보 (호출 위치, 호출 형태, 직렬화 방식) 에 선호 라벨 (RULE-07 수단 중립 게이트 위반어 카테고리) 부여 0. 라벨 hit 자기 검증은 §스코프 규칙 G3 박제.
5. **(I5) typecheck 수렴 의존 (FR-06 정합)**: 본 효능 도입은 typecheck 미수렴 (REQ-20260422-054 `typecheck-exit-zero` FR-01 미달 — master HEAD `error TS` 잔존) 시점에는 박제 미달. 본 spec 파생 task 는 `typecheck-exit-zero` FR-01 수렴 완료 (rc 0 + error TS 잔존 0) 후에만 발행 가능 — 미수렴 상태에서 본 게이트 도입 시 무관한 push 가 일률 차단되어 false-positive 회귀 신호 (게이트 noise → 운영자 우회 학습 → 게이트 효능 무력화).
6. **(I6) hook 단일성 (NFR-02 정합)**: 본 효능은 단일 grep 명령 (M-A) hit count 1+ 로 측정 가능. 보조 게이트 (type 오류 도입 fixture push 차단) 도 명령 단일성 유지 (`git push --dry-run` rc) — 복수 게이트 AND 필수 (M-A vs M-C 분기) 는 본 §동작 1 + §스코프 규칙 분기 박제.
7. **(I7) `.husky/pre-commit` 채널 분리**: `.husky/pre-commit` 훅은 staged 파일 lint 채널 (`npx lint-staged`) + spec coherence 조건부 게이트 (TSK-06) + vite env boundary 조건부 게이트 (TSK-08) 분기 유지. 본 spec 효능은 `.husky/pre-commit` 편입 영역 외 — pre-commit 은 staged 파일 단위 lint 채널, pre-push 은 전체 trunk 단위 typecheck 채널 — 시점 + scope 분리. `grep -nE "typecheck|tsc" .husky/pre-commit` 호출 잔존 부재 (channel 분리 박제).
8. **(I8) 시점 비의존 (RULE-07)**: 본 spec 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 어디서도 현 시점 typecheck hit count 절대 수치 또는 `.husky/pre-push` 본문 라인 수 또는 특정 HEAD hash 박제 0. baseline 매트릭스 (현 시점 hit count + 라인 분포) 는 §스코프 규칙 grep-baseline 한정 (감사성). 본 spec 본문 평서형 게이트는 "pre-push 훅 typecheck 1+ hit + type 오류 도입 시 push 차단" 추상 표현.
9. **(I9) REQ-060 → REQ-089 audit 회수**: REQ-20260517-060 (`60.done/2026/05/17/req/20260517-husky-pre-push-typecheck-coverage.md`) 흡수 시점 (inspector mv) 에 pre-push typecheck 효능의 spec 박제 부재 — inspector mv 시점에 `60.done/req/` 이동과 spec 박제 동반 의무가 RULE 차원 강제 아닌 메타 인식 (REQ-088 §배경 패턴 동치). 본 spec 박제로 audit 회수. REQ-060 §수용 기준 5건 marker [ ] 미플립은 본 spec 효능 회복 task 발행 + 수행 후 별 inspector tick hook-ack 영역.

### 회귀 중점
- `.husky/pre-push` 훅 본문에서 typecheck 호출 라인이 누락 / 주석 처리 / 별 hook 으로 이동 시 (I1) 위반. 측정 명령 (M-A) hit count 부재 회귀 신호.
- `.husky/pre-push` 훅 본문에서 `npm test` 또는 `npm run check:deps` 라인이 누락 시 (I3) 위반. 측정 명령 (M-B) hit count < 2 회귀 신호 — REQ-041 coverage 측정 결정론 또는 REQ-066 runtime dep coherence 채널 보호 효능 손실.
- CI workflow typecheck step (`.github/workflows/ci.yml` `run: npm run typecheck`) 제거 시 본 spec 의 시점 분리 보완 관계 위반 — `regression-gate.md` (REQ-037) §FR-01 별 회귀로 detection. 본 spec 단독으로는 final guard 효능 회복 불가 (pre-push 만 박제될 경우 fork 외부 contributor push 차단 0).
- `git push --no-verify` 운영자 학습 우회 패턴 정착 시 본 spec 효능 무력화 인접 신호. 본 spec 영역 외 (`--no-verify` 정책 박제는 RULE-02 + REQ-060 FR-04 한정) — final guard 는 CI 영역.
- husky 메이저 버전 bump (예: `husky@10`) 가 hook 실행 계약 (exit code ≠ 0 시 차단) 을 변경할 경우 본 spec 효능 손실 — `package.json:devDependencies.husky` bump 시점에 hook 실행 계약 호환성 재검증 필요. 본 spec 의 husky 메이저 인용 회피 — `>=9` 공통 계약 평서.
- `.husky/pre-commit` 에 typecheck 호출이 도입될 경우 본 spec 의 (I7) 채널 분리 위반. pre-commit 은 staged 파일 단위 lint 채널 유지 — typecheck 는 전체 trunk 단위 측정 (staged 단위 부분 typecheck 는 type cross-reference 무력화).

## 의존성
- 외부: POSIX shell (`bash`), `grep` extended regex (`-E`), TypeScript (`tsc --noEmit` 효능 명령 — `typecheck-island-extension.md` 박제 시점 가정), husky `>=9` (hook 실행 계약 — exit code ≠ 0 시 git operation 차단).
- 내부: `.husky/pre-push` 훅 본문 (POSIX shell), `package.json:scripts.typecheck` 진입점 (`tsc --noEmit`), `tsconfig.json:compilerOptions` (strict 정책 — REQ-077 `typecheck-island-extension` precondition 가정), `package.json:engines.node` (`>=24` baseline — REQ-070 `node-version-3axis-coherence`).
- 역의존 (회복 후 자동 작동): `typecheck-island-extension.md` (REQ-077, island 정의 후반부 typecheck error 0 효능의 로컬 시점 보조), 미래 신규 island 수렴 spec (typecheck error 0 효능 자동 적용 + 본 spec local 시점 보조 도달).
- 직교: `regression-gate.md` (REQ-037, CI workflow typecheck step — final guard 시점 직교), `coverage-determinism.md` (REQ-041, `.husky/pre-push` `npm test` 측정 결정론 — typecheck rc 보조 vs coverage 결정론 별 채널), `runtime-dep-version-coherence` (REQ-066, `.husky/pre-push:1` `check:deps` 게이트 — deps coherence vs typecheck 별 축), `node-version-3axis-coherence` (REQ-070, hook 실행 환경 Node 24+ precondition).

### carve-precondition
- (P1) **환경 채널 가용성**: 본 spec 효능 회복 task carve 시점 (별 task 단) 에 `node_modules/` 가용성 + `npm run typecheck` exit=0 (REQ-054 `typecheck-exit-zero` FR-01 충족 — 본 spec FR-06 의존) + `npm test -- --run` exit=0 (coverage 회귀 0) + `npm run lint` exit=0 (lint 회귀 0) + `npm run build` exit=0 (build 회귀 0) 환경 게이트 충족 필요. 본 spec 자체 박제는 산출물 변경 require 0 (효능 평서 박제만) — 본 spec 박제 시점 환경 게이트 N/A.
- (P2) **선행 spec done 상태**: 본 spec 효능 회복 task carve 시점에 선행 spec (REQ-20260517-077 `typecheck-island-extension.md` blue 승격 done — `30.spec/blue/foundation/typecheck-island-extension.md` 박제) 의 island 정의 후반부 (typecheck error 잔존 부재) 충족 필요. 박제 시점 `npm run typecheck` exit 0 + `grep -cE "error TS"` 잔존 부재 (REQ-077 박제 시점 baseline 누적 PASS). 본 spec 자체 박제는 효능 박제 한정 — 선행 spec 의존 없음 (자매 메타 효능과 직교).
- (P3) **RULE-02 chain 비활성**: 본 spec 은 신규 박제 spec — 기존 carve fail-fast chain 누적 0. chain 부재 평서 박제 — carve 진입 차단 신호 없음. 회복 task 발행 시점 (별 inspector / planner tick) 에 chain 누적 신호 발생 시 별 carve-precondition 게이트 자가 차단 적용.

## 테스트 현황
- [ ] (I1) local early signal 효능 — 현 baseline 0 hit (M-A grep, §스코프 규칙 G2 MISS — 본 spec 회복 대상 zero-point). 회복 task 발행 + 수행 후 marker 플립.
- [ ] (I2) CI final guard 와 시점 분리 보완 — 본 spec 박제 자체로 평서 정합. marker 플립은 (I1) 회복 후 + CI workflow typecheck step 활성 동시 충족 검증 후.
- [x] (I3) 기존 명령 보존 (FR-05 정합) — 현 baseline (M-B grep) 2 hit (`npm run check:deps` line 1 + `npm test` line 2) 박제. (I1) 회복 task 발행 시 본 보존 baseline 유지 의무 동반 — 본 spec 박제 자체로 평서 정합.
- [x] (I4) 수단 중립 (RULE-07) — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/husky-pre-push-typecheck.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit (§스코프 규칙 G3 박제).
- [ ] (I5) typecheck 수렴 의존 (FR-06 정합) — 본 spec 박제 자체로 평서 정합. marker 플립은 task 발행 시점 검사 — `typecheck-exit-zero` FR-01 수렴 (rc=0 + 0 hit) 후 task ID 채번 확인 후.
- [x] (I6) hook 단일성 (NFR-02 정합) — 본 spec §공개 인터페이스 + §스코프 규칙 G2 단일 grep 명령 (M-A) hit count 1+ 로 측정 가능. 복수 게이트 AND 필수 (M-A vs M-B vs M-C 분기) 는 §동작 1·3 + §스코프 규칙 분기 박제.
- [x] (I7) `.husky/pre-commit` 채널 분리 — 현 baseline `grep -nE "typecheck|tsc" .husky/pre-commit` → 0 hit 박제 (§스코프 규칙 G1). 본 spec 박제 자체로 평서 정합 — pre-commit 편입 시 회귀 detection.
- [x] (I8) 시점 비의존 (RULE-07) — 본 spec §동작 8 박제 + §스코프 규칙 G4 자기 검증 0 hit (본문 carve-active spec 파일명 / chain ID / 절대 hit count 박제 0).
- [x] (I9) REQ-060 → REQ-089 audit 회수 — 본 spec §동작 9 + §변경 이력 + §참고 박제로 정합. REQ-060 spec 박제 미흡수 audit pointer 평서 박제.

## 수용 기준
- [ ] (Must, FR-01) local early signal 효능 박제 — `.husky/pre-push` 본문에서 typecheck 효능 명령 (`npm run typecheck` 또는 `tsc --noEmit`) 이 1+ hit. 현 baseline 0 hit (§스코프 규칙 G2 MISS — 본 spec 회복 대상). 별 task 발행 + 수행 후 marker 플립.
- [x] (Must, FR-02) §스코프 규칙 grep-baseline 에 HEAD=`e7d6e92` 시점 실측 수치 박제 — `.husky/pre-push` typecheck (M-A) 0 hit / `.husky/pre-push` 기존 명령 (M-B) 2 hit (line 1 `npm run check:deps || exit 1` + line 2 `npm test`) / `.husky/pre-commit` typecheck 0 hit (G1) / `.github/workflows/ci.yml` typecheck step 1 hit @`:40` (`run: npm run typecheck`). REQ-060 시점 baseline (HEAD=`a1755b5`, `.husky/pre-push` typecheck 0 hit, 본문 1 행 `npm test`) 대비 추가 1 행 (`npm run check:deps || exit 1`, REQ-066 회수 산출물) — 미수렴 상태 audit.
- [x] (Must, FR-03) §변경 이력 + §참고 에 REQ-060 → REQ-089 audit pointer 박제 — "REQ-060 `60.done/2026/05/17/req/20260517-husky-pre-push-typecheck-coverage.md` 흡수 시점에 spec 박제 부재 → REQ-089 후속 박제" 평서 (§변경 이력 row + §참고 선행 done req).
- [x] (Must, FR-04) CI final guard 와 시점 분리 보완 관계 평서화 — §동작 2 + §회귀 중점 + §의존성 직교 박제. pre-push 우회 가능성 (`--no-verify`) + local 한정 작동 + fork 외부 contributor 미작동 3 분기 명시.
- [x] (Should, FR-05) 기존 명령 보존 — §동작 3 + §회귀 중점 + §스코프 규칙 G2 (M-B baseline 2 hit) 박제. (I1) 회복 task 발행 시 본 보존 baseline 유지 의무 동반.
- [x] (Must, FR-06) typecheck 수렴 의존 — §동작 5 + §carve-precondition (P1)/(P2) 박제. `typecheck-exit-zero` FR-01 (rc=0 + 0 hit) 수렴 후에만 본 spec 파생 task 발행 가능.
- [x] (Must, FR-07) 수단 라벨 0 — `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/husky-pre-push-typecheck.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit (§스코프 규칙 G3 자기 검증).
- [x] (NFR-01) 시점 비의존 — 본문 (§역할 + §동작 + §회귀 중점 + §의존성) 에 0 hit / 2 행 절대 수치 박제 0. 수치는 §스코프 규칙 grep-baseline 한정. 본문은 "pre-push 훅 typecheck 1+ hit + type 오류 도입 push 차단" 평서형.
- [x] (NFR-02) 게이트 단일성 — §공개 인터페이스 + §스코프 규칙 G2 단일 grep 명령 (M-A) hit count 1+ 로 측정 가능. 보조 게이트 (M-C) `git push --dry-run` rc 도 명령 단일성 유지.
- [x] (NFR-03) 시점 분리 정합 — 본 spec 의 pre-push 게이트는 `regression-gate.md` (REQ-037) CI typecheck step (final guard) 과 시점 분리 보완 — 어느 한 축 위반이 다른 축의 게이트를 자동 충족시키지 않는다. CI typecheck step 만 박제될 경우 pre-push 회귀 차단 0, pre-push 만 박제될 경우 fork 외부 contributor push 차단 0.
- [x] (NFR-04) RULE-07 정합 — "pre-push 훅 typecheck 1+ hit + type 오류 push 차단" 결과 효능만 박제. 1회성 진단·릴리스·incident 귀속 박제 배제. 본 spec 의 동기 (REQ-060 spec 박제 미흡수) 는 §참고 / §변경 이력 한정, §역할 본문은 시스템 불변식 평서형.
- [x] (NFR-05) RULE-01 정합 — 본 spec `specs/30.spec/green/foundation/` create only (inspector writer 영역). blue 흡수는 planner 영역 (별 tick promote 후보).
- [x] (NFR-06) RULE-06 정합 — §스코프 규칙 grep-baseline 4 gate (G1~G4) 실측 박제 (HEAD=`e7d6e92`) + `expansion` `허용` (typecheck 호출 위치 / 형태 / 직렬화 방식 수단 중립 — task scope 확장 허용).
- [x] (NFR-07) husky 버전 무관성 — 본 spec 본문 husky 메이저 버전 인용 회피 — `.husky/pre-push` 가 push 단계 hook 으로 동작하고 종료 코드 ≠ 0 시 push 차단을 발생시킨다는 husky `>=9` 공통 계약 평서 박제 (§역할 + §동작 1 + §의존성).
- [x] (NFR-08) spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합).

## 스코프 규칙
- **expansion**: 허용 — typecheck 호출 위치 (전/후), 호출 형태 (`npm run` vs `npx` vs 직접), 직렬화 방식 (`&&` vs `;` vs 별 줄) 수단 중립 — task 단 결정 시 선택 자유. scope 확장 시 §스코프 규칙 grep-baseline G2 재실측 + 본 spec §동작 1 (1+ hit) 효능 의무 유지.
- **grep-baseline** (HEAD=`e7d6e92`, 2026-05-17 — REQ-089 흡수 시점 실측):
  - (G1) **[`.husky/pre-commit` typecheck 채널 분리 baseline]** `grep -nE "typecheck|tsc" .husky/pre-commit` → **0 hit** (HEAD=`e7d6e92` 실측). 본 spec (I7) 채널 분리 박제 baseline — pre-commit 편입 시 회귀 detection. pre-commit 본문 3 분기 (`npx lint-staged` + spec coherence 조건부 + vite env boundary 조건부) — 모두 staged 파일 단위 lint 채널.
  - (G2) **[`.husky/pre-push` typecheck 효능 baseline — M-A 측정, 본 spec 회복 대상]** `grep -nE "typecheck|tsc" .husky/pre-push` → **0 hit** (HEAD=`e7d6e92` 실측 MISS — 본 spec 회복 대상 zero-point). 본문 2 행: line 1 `npm run check:deps || exit 1` (REQ-066 회수) + line 2 `npm test` (REQ-041 의존). REQ-060 시점 baseline (HEAD=`a1755b5`, 1 행 `npm test` 단일) 대비 +1 행 — typecheck 축 미수렴 audit. 회복 효능 = 0 → 1+ hit (FR-01 효능 회복 목표).
  - (G3) **[FR-07 수단 라벨 자기 검증]** `awk '/^## 역할/,/^## 의존성/' specs/30.spec/green/foundation/husky-pre-push-typecheck.md | grep -vE '`[^`]*default[^`]*`' | grep -cE "기본값|권장|우선|default|best practice|먼저"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 typecheck 호출 위치 / 호출 형태 / 직렬화 방식 후보에 선호 라벨 부여 0). HEAD=`e7d6e92` 박제 시점 PASS. 백틱 코드 식별자 (예: `defaultProps`) 면제 정밀 패턴 — RULE-06 §체크리스트 정밀 패턴 권고 정합.
  - (G4) **[NFR-01 시점 비의존 자기 검증]** `awk '/^## 역할/,/^## 테스트 현황/' specs/30.spec/green/foundation/husky-pre-push-typecheck.md | grep -cE "0 hit|1 hit|2 hit|2 행|line 1|line 2|:40|:31"` → **0 hit** (본 spec §역할 + §동작 + §회귀 중점 + §의존성 어디서도 절대 수치 / 라인 좌표 박제 0 — 수치는 §스코프 규칙 grep-baseline 한정). HEAD=`e7d6e92` 박제 시점 PASS.
- **rationale**: (G1) `.husky/pre-commit` 채널 분리 baseline — pre-commit 편입 시 회귀 detection. (G2) `.husky/pre-push` typecheck 효능 baseline — 본 spec 회복 대상 zero-point + REQ-060 시점 대비 +1 행 (REQ-066 회수) audit. (G3) RULE-07 수단 중립 자기 검증 (백틱 면제 정밀 패턴 — `defaultProps` 등 식별자 보호). (G4) RULE-07 시점 비의존 자기 검증. 매트릭스: pre-push 본문 2 행 (check:deps + npm test) / typecheck 0 hit (회복 대상) / pre-commit typecheck 0 hit (채널 분리 유지) / CI workflow typecheck step 1 hit (final guard 활성 — REQ-037 박제 효능). 회귀 detection 의 zero-point — 본 baseline 박제로 (I1) 게이트 측정 가능.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-089 흡수) / pending (HEAD=`e7d6e92`) | 최초 박제 — `.husky/pre-push` 훅 typecheck local early signal 효능 9 축 (I1~I9) 게이트. baseline 매트릭스: `.husky/pre-push` typecheck 0 hit (M-A — 회복 대상 zero-point) + `.husky/pre-push` 기존 명령 2 hit (M-B — check:deps line 1 + npm test line 2) + `.husky/pre-commit` typecheck 0 hit (G1 — 채널 분리 유지) + CI workflow typecheck step 1 hit (REQ-037 final guard 활성). REQ-060 시점 baseline (HEAD=`a1755b5`, pre-push 본문 1 행 `npm test`) 대비 +1 행 (REQ-066 `check:deps` 회수) — typecheck 축 미수렴 audit. 본 spec 분리 결정 근거: `regression-gate.md` (REQ-037 blue 영역) 흡수 vs 신규 spec carve — 신규 spec carve 결정 근거: (a) `regression-gate.md` 의 CI workflow typecheck step (final guard) 와 본 spec 의 pre-push hook (early signal) 은 채널 직교 (시점 + scope 분리 보완) — 단일 spec 흡수 시 RULE-07 단일 효능 박제 원칙 위반 + 채널 혼합 검색 noise 증가, (b) blue 영역 직접 편집 inspector writer 영역 외 (blue→green 복사 후 흡수는 spec 본문 양식 일률 변화 + 자매 메타 spec 양식 일관성), (c) 자매 메타 spec (REQ-077 typecheck-island-extension + REQ-087 eslint-react-hooks-lint-gate + REQ-088 island-proptypes-zero) 와 동질 패턴 — 각 채널 별 spec 박제 자매 메타 효능 양식 정합. consumed req: `specs/20.req/20260517-husky-pre-push-typecheck-spec-absorption.md` (REQ-089) → `60.done/2026/05/17/req/` mv. **REQ-060 → REQ-089 audit pointer**: REQ-060 `60.done/2026/05/17/req/20260517-husky-pre-push-typecheck-coverage.md` 흡수 시점 (inspector mv) 에 pre-push typecheck 효능의 spec 박제 부재 — RULE 차원 mv 시점 spec 박제 동반 의무 강제 아님. REQ-089 후속 신호로 본 spec 박제. REQ-060 §수용 기준 5건 marker 미플립은 본 spec 효능 회복 task 발행 + 수행 후 별 inspector tick hook-ack 영역. RULE-07 자기검증 — (I1)~(I9) 모두 평서형·반복 검증 가능 (`grep` extended regex 단일 명령 G1/G2 + `git push --dry-run` rc 보조)·시점 비의존 (G4 0 hit — 본 spec 본문에 절대 수치 박제 0)·incident 귀속 부재 (REQ-089 §배경 의 REQ-060 spec 박제 미흡수 audit 는 §변경 이력 / §참고 한정 박제 — 본문 §역할 ~ §의존성 영역 비박제)·수단 중립 (G3 0 hit — typecheck 호출 위치 / 호출 형태 / 직렬화 방식 후보 라벨 0). RULE-06 §스코프 규칙 4 gate (G1~G4) 실측 박제 + `expansion` `허용`. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/husky-pre-push-typecheck.md` create). spec-carve-precondition 자기 적용 — §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 (`spec-carve-precondition.md` REQ-085 메타 효능 정합). | all |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/17/req/20260517-husky-pre-push-typecheck-spec-absorption.md` (REQ-089 — 본 세션 mv).
- **선행 done req (audit pointer — REQ-060 spec 박제 미흡수 회수 트리거)**:
  - `specs/60.done/2026/05/17/req/20260517-husky-pre-push-typecheck-coverage.md` (REQ-20260517-060) — pre-push typecheck 보조 게이트 효능 박제 요청. spec 박제 미흡수 + 현장 효능 미수렴 → 본 spec 이 후속 박제 (REQ-089 흡수). REQ-060 §수용 기준 5건 marker [ ] 미플립 — done 이동 시점 spec 박제 동반 의무 강제 아님 (RULE 차원 메타 인식).
  - `specs/60.done/2026/05/17/req/20260517-runtime-dep-version-coherence.md` (REQ-20260517-066) — `.husky/pre-push:1` `npm run check:deps || exit 1` 추가 회수 산출물. 본 spec 과 직교 (deps coherence vs typecheck) — 본 spec FR-05 (기존 명령 보존) baseline 의 line 1 출처.
  - `specs/60.done/2026/04/22/req/20260422-typecheck-exit-zero.md` (REQ-20260422-054, blocked/revisit 경로) — master HEAD typecheck rc=0 + 0 hit. 본 spec FR-06 의존.
  - `specs/60.done/2026/05/17/req/20260517-node-runtime-version-3axis-coherence.md` (REQ-20260517-070) — Node 메이저 3축 정합. 본 spec 의 hook 실행 환경 precondition (Node 24+ 보장).
- **자매 메타 spec (channel 직교, 본 spec 박제 시점 동일 green/blue foundation)**:
  - `30.spec/blue/foundation/regression-gate.md` (REQ-20260421-037 blue 승격) — CI workflow typecheck step (final guard) + Vitest coverage threshold 4축. 본 spec 의 pre-push hook (early signal) 과 시점 분리 보완.
  - `30.spec/blue/foundation/typecheck-island-extension.md` (REQ-077 blue 승격) — island 정의 후반부 (typecheck error 0) 채널. 본 spec 의 local 시점 보조 — typecheck 게이트 시점의 다층 분리 정합.
  - `30.spec/blue/foundation/coverage-determinism.md` (REQ-20260422-041 blue 승격) — `.husky/pre-push` `npm test` 호출 의존 (FR-02 측정 결정론 baseline). 본 spec 효능 도입 후에도 `npm test` 호출 보존 의무 (FR-05).
  - `30.spec/green/foundation/island-proptypes-zero.md` (REQ-088) — island 정의 세 번째 축 (PropTypes 0). 동질 자매 메타 spec 양식 (단일 효능 채널 박제).
  - `30.spec/green/foundation/eslint-react-hooks-lint-gate.md` (REQ-087) — React hook 규칙 (rules-of-hooks + exhaustive-deps) lint-time 차단 채널. 동질 자매 메타 spec 양식.
  - `30.spec/green/foundation/spec-carve-precondition.md` (REQ-085) — spec carve-precondition 자기 선언 메타 효능 채널.
- **현장 근거 (HEAD=`e7d6e92`, 2026-05-17 실측, 본 spec 박제 시점)**:
  - `.husky/pre-push` typecheck (M-A) — `grep -nE "typecheck|tsc" .husky/pre-push` → **0 hit** (§스코프 규칙 G2 박제, 본 spec 회복 대상).
  - `.husky/pre-push` 기존 명령 (M-B) — `grep -nE "npm test|check:deps" .husky/pre-push` → 2 hit (line 1 `npm run check:deps || exit 1` + line 2 `npm test`). FR-05 보존 baseline.
  - `.husky/pre-commit` typecheck — `grep -nE "typecheck|tsc" .husky/pre-commit` → 0 hit (§스코프 규칙 G1 박제, 채널 분리 유지).
  - `.github/workflows/ci.yml` typecheck step — `grep -nE "typecheck|tsc --noEmit" .github/workflows/ci.yml` → 1 hit @`:40` `run: npm run typecheck` (REQ-037 final guard 활성).
  - `package.json:scripts.typecheck` — `tsc --noEmit` (진입점).
  - `package.json:engines.node` — `>=24` (Node 24 baseline — REQ-070).
  - `tsconfig.json:compilerOptions` — `strict: true` + `noImplicitAny: true` + `noUncheckedIndexedAccess: true` (REQ-077 precondition 가정).
  - spec 박제 부재 (REQ-089 발행 직전 baseline) — `grep -rln "REQ-20260517-060|husky-pre-push-typecheck|pre-push.*typecheck|pre-push.*tsc" specs/30.spec/{blue,green}` → 4 hit (단순 참조 / out-of-scope 박제 / baseline 관찰 / §참고 audit pointer — 효능 박제 0). 본 spec 박제 후 효능 박제 1+ surface.
- **외부 레퍼런스**:
  - husky 공식 — `.husky/pre-push` 는 push 단계 hook, 종료 코드 ≠ 0 시 push 차단: `https://typicode.github.io/husky/`. REQ-060 §참고 인용 동치.
  - Git 공식 — `git push --no-verify` 로 hook 우회 가능 (FR-04 보조 관계 근거): `https://git-scm.com/docs/githooks`.
  - TypeScript 공식 — `tsc --noEmit` 은 타입 검사만 수행: `https://www.typescriptlang.org/docs/handbook/compiler-options.html` (`noEmit`).
- **RULE 준수**:
  - RULE-07: 9 불변식 (I1~I9) 모두 시점 비의존 (G4 0 hit 자기 검증) · 평서형 · 반복 검증 가능 (`grep` extended regex 단일 명령 G1/G2 + `git push --dry-run` rc 보조) · incident 귀속 부재 (REQ-060 spec 박제 미흡수 audit 는 §변경 이력 / §참고 한정). 수단 박제 0 (G3 0 hit 자기 검증).
  - RULE-06: grep-baseline 4 gate (G1~G4) 실측 박제 (HEAD=`e7d6e92`) + `expansion` `허용`.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/husky-pre-push-typecheck.md` create).
  - spec-carve-precondition (REQ-085): §carve-precondition 절 (P1)(P2)(P3) 3 차원 평서 박제 정합.
