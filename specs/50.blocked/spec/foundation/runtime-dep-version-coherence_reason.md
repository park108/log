# runtime-dep-version-coherence — blocked reason

- **격리 tick**: 2026-05-17 planner 13th @HEAD=389afee
- **spec hash (격리 시점)**: `9e2c0f9e7614f25d1f99d3aacf30e7d1eeda2b98` (11th tick 1차 노출 박제와 동일)
- **정체 카운트**: 11th 1차 노출 → 12th 1회차 → 13th **2회차 누적** (11차 행동지침 (3) 의 "정체 2회차 진입 = 13th tick 도달 + hash 동일 + 환경 미회복 시 격리 후보" 시계열 정합 — toolchain-version-coherence 5th-7th tick 격리 패턴 동일 적용).
- **격리 사유 (수단 중립 메타 spec 패턴 — toolchain-version-coherence 5th-7th tick 격리 사유 재발)**:
  - (i) 수단 중립 박제: § 역할 "의도적으로 하지 않는 것: 특정 메이저 ... 업/다운그레이드 운영 task (수단 중립 — `package.json` 다운그레이드 vs `npm install <pkg>@<major>` vs lockfile 재정합 모두 허용)" — spec 자체가 수단 결정 권한을 의도적으로 보류. planner 가 단일 원자 task 로 carve 결정 불능.
  - (ii) developer writer 영역 (`src/`, `10.followups/`) 밖 산출물 침투 우려: § 동작 1~3 수렴 산출물 = `package.json` (declared semver range) / `node_modules/<pkg>/` (installed version) / `package-lock.json` (lockfile) / `specs/30.spec/blue/components/*.md` (blue 박제 메이저 변경 — inspector writer 영역). RULE-01 writer 매트릭스 위반 잠재.
  - (iii) 환경 회귀 미회복: pre-commit hook `@eslint/js` resolve 실패 chain 잔존 (devbin-install-integrity REQ-064 본문 8+ 커밋 박제 동일 패턴). carve 시 즉시 50.blocked/task/ 재진입 예측.
  - (iv) hash 2 tick 미변경 + 정체 2회차 누적: 11th-13th 동일 hash `9e2c0f9e` 유지 — inspector 미터치. 12차 행동지침 (4) 의 "정체 3회차 진입" 변형 카운팅과 11차 행동지침 (3) 의 "정체 2회차 진입 = 13th tick" 정합 검증 — 후자가 실제 시계열 (11th 1차 노출 = 정체 0회차).
- **carve 부적합 근거**: 5th-7th tick toolchain-version-coherence 격리 패턴 동일 — 수단 중립 메타 spec 의 task 분할은 (a) 수단 결정 권한 부재 + (b) 산출물 경계 충돌 + (c) 환경 회복 의존 (§ 동작 1~3 자연 수렴이 § 동작 1·2 정합 결과) 3 요인 모두 충족.
- **승격 부적합 근거**: §테스트 현황 17 + §수용 기준 11 = unchecked `- [ ]` 28건 잔존 — RULE-01 승격 4조건 (`[WIP]` 0 + unchecked 0 + `^#+ .*To-Be` 0 + 변경 이력 박제) 중 unchecked == 0 위반.
- **RULE-07 정합 검증**: § 동작 1~7 평서형·반복 검증 가능·시점 비의존·incident 귀속 부재 — 격리는 RULE-07 위반 (spec 콘텐츠 결함) 아님. 격리 사유는 수단 중립 메타 spec 의 writer 경계 충돌 + 환경 회귀 의존성.
- **정식 복귀 경로 (RULE-05)**: `/revisit` 스킬이 본 reason 판정 후 (a) revive 시 `10.followups/` 승격 (운영자 수단 결정 + 환경 회복 선행 후 재흡수), (b) close 시 `60.done/2026/05/17/revisit/` 감사노트. planner 영역 미접촉 (writer 경계).
- **운영자 행동지침**:
  - (i) 수단 결정: § 동작 1~3 수렴은 (a) devDep semver range 다운그레이드 (lock), (b) installed `npm install <pkg>@<major>` 업그레이드, (c) lockfile 재정합 — 세 수단 중 하나 선택 필요. 본 spec 자체는 선택 권한 보류 → 운영자 결정 또는 별 spec 분기.
  - (ii) 환경 회복 후 inspector 가 본 spec § 테스트 현황 + § 수용 기준 측정 통과 처리 + § 변경 이력 박제 → /revisit revive 경로로 followups 진입 → 재흡수 가능.
  - (iii) 본 spec 의 후속 spec (devbin-install-integrity 등) 토폴로지 의존성: install 정합 + 메이저 정합 + alias 정합 사슬에서 root cause 가 본 spec 일 수 있음. 격리 해소 우선순위는 토폴로지 분석 후 결정.
