# 격리 사유 — toolchain-version-coherence (planner 7th tick @HEAD=f136f21)

## 격리 시점 baseline (실측)
- HEAD: `f136f21` (직전 6th tick `eac3549` → 1 ahead — 본 spec 파일은 미터치).
- 본 spec 파일 git log 마지막 커밋: `946dca1` (inspector REQ-061 흡수 신규 박제 — 이후 inspector / planner 모두 본문 미터치).
- 본 spec blob hash: `813b6cf3bb705b14e61fbfaebc2863dc9bf54d30` (6th tick 박제 `813b6cf3` 와 prefix 동일 — content unchanged 검증).
- working tree clean (`git status --short` 빈 상태 — 이동 직전).

## 환경 회귀 baseline (실측, 7th tick)
- `node_modules/typescript@4.9.3` 잔존 (devDep `^6.0.3` ↔ installed 메이저 격차 2).
- `npm run typecheck` rc=2 + preprocessing 카테고리 `TS6046|TS5070|TS2688` 3 hit 잔존 (3rd/4th/5th/6th tick 박제와 동일 — tsconfig 경로, src/** 0 hit).
- `npm ls typescript` `invalid:` 라인 7 hit 잔존 (msw peer 등 — 5th/6th tick 박제와 동일 패턴).

## 정체 누적
| tick | HEAD | spec hash | 환경 | 처리 |
|------|------|-----------|------|------|
| 5th | `946dca1` | `82bf016d` (prefix) | 회귀 | 1차 노출 / carve 보류 / 격리 보류 |
| 6th | `eac3549` | `813b6cf3` | 회귀 | 정체 1회차 재카운트 / carve 보류 / 격리 보류 |
| 7th | `f136f21` | `813b6cf3` (동일) | 회귀 (동일) | **정체 2회차 진입 → 격리** |

## 격리 결정 근거
6th tick `.planner-seen` 박제 행동지침 (1) 충족:
> toolchain-version-coherence hash 가 본 tick 박제 (813b6cf3) 와 동일 + 환경 미회복 유지 시 → 정체 2회차 진입 → 50.blocked/spec/foundation/toolchain-version-coherence.md 격리 + _reason.md 박제.

본 spec 의 박제 자체는 정합 (RULE-07 양성 — § 동작 1~5 평서형·반복 검증 가능·시점 비의존·incident patch 아님). 격리 사유는 **수단 결정 권한 부재 + developer writer 영역 침투 우려 + 환경 회복 의존** 의 메타 spec 성질로 인한 planner carve 절차 적용 불능 누적:

1. **수단 중립 메타 spec**: § 역할 박제 ("의도적으로 하지 않는 것: 특정 메이저로의 업/다운그레이드 자체") — § 동작 1~5 정합 수렴 수단 (devDep 다운그레이드 vs installed 업그레이드 vs lockfile 재정합) 결정 권한이 본 spec 에 부재. planner 가 task 발행 시 어느 수단을 채택할지 결정 불능.
2. **developer writer 영역 침투 우려**: 본 spec 의 수렴 산출물 (`package.json`, `node_modules/typescript/package.json`, `tsconfig.json`, `package-lock.json`) 은 RULE-01 developer writer 영역 (`src/`, `10.followups/`) 밖. task 발행 시 developer 가 영역 침범으로 fail-fast 격리 가능.
3. **환경 회복 의존**: § 동작 3 의 preprocessing 0 hit 자연 수렴은 § 동작 1·2 정합 의 결과 — 환경 회복 (`npm install` 또는 devDep 정합) 이 선행되어야 inspector 가 § 테스트 현황 + § 수용 기준 측정 통과 처리 가능. planner 단계에서 carve 결정 불능.
4. **정체 누적**: 5th tick 1차 노출 + 6th tick 정체 1회차 + 7th tick 정체 2회차 — 6th tick 행동지침 (1) 충족.

## 정식 복귀 경로 (RULE-05)
- `/revisit` 스킬이 본 `_reason.md` 판정 → `10.followups/` 승격 (revive) → discovery → inspector 흡수 후 재발행.
- planner 영역으로 직접 재진입 금지 (writer 경계 — `30.spec/green/` 재이동 불가).
- 환경 회복 (운영자가 `npm install` 또는 devDep 다운그레이드 또는 installed 업그레이드 또는 lockfile 재정합 중 1개 수단 채택) 선행 시 inspector 가 본 spec 의 § 테스트 현황 + § 수용 기준 항목 측정 통과 처리 후 § 변경 이력 박제 → /revisit revive 경로로 followups 진입 → 재흡수 가능.

## 부수 정합
- 본 spec 의 역의존 spec (husky-pre-push-typecheck, island-regression-guard) 은 이미 5th tick 격리 후 6th tick /revisit 으로 `10.followups/` 승격 완료 — 본 격리는 토폴로지상 root cause spec 의 격리 (역의존 followups 와 동일 root cause 해소를 기다림).
- 영향받는 추가 blocked spec: `coverage-determinism`, `src-typescript-migration`, `tsconfig-test-ambient-globals` (모두 동일 root cause — typescript 환경 회귀) 는 4c84b86 `chore(revisit)` 로 followup 승격 후 삭제 완료. 본 root cause spec 의 환경 회복 시 4건 모두 동시 해소 가능.

## RULE 준수
- **RULE-01**: planner mv `30.spec/green/F → 50.blocked/spec/foundation/F` (writer 경계 정합). suffix `-spec` 미부여. `_reason.md` 동일 디렉터리 박제.
- **RULE-02**: 자기 영역 (`30.spec/**`) 내 변경만 단일 커밋. push 없음.
- **RULE-04**: 본 세션 보고 블록 stdout 박제 — `no-op: false` / `blocked: 1` / `notes: 7th tick stagnation 2nd cycle`.
- **RULE-05**: 정식 복귀 경로 `/revisit` 박제. planner 재진입 금지 명시.
- **RULE-07**: 본 spec 의 박제 자체는 양성 기준 충족 — 격리 사유는 평서문 위반이 아니라 planner carve 절차 적용 불능 누적.
