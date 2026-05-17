# island-proptypes-removal — blocked reason

- **격리 tick**: 2026-05-17 planner 13th @HEAD=389afee
- **spec hash (격리 시점)**: `f5c84bbd2ac2b7da430c1d784593fb536eca4e85` (9th tick 박제와 동일)
- **정체 카운트**: 9th 1차 노출 → 10th 1회차 → 11th 2회차 → 12th 3회차 → 13th **4회차 누적** (≥3cycle stale 임계 의미적 초과)
- **격리 사유 (12차 행동지침 (2) AND 조건 충족)**:
  - (a) hash 4 tick 미변경: 9th-13th 동일 hash `f5c84bbd` 유지 — inspector 미터치.
  - (b) inspector 우선순위 분기 신호 정착 진척 + island 재진입 미수행: 12th tick 까지 inspector 가 devbin-install-integrity (REQ-064) 신규 green 박제 + 본 tick 시점 path-alias-resolver-coherence (REQ-065) 20.req/ 잔존. 후속 메타 spec 사슬 진척 중이나 island 자체의 §변경 이력 추가 또는 본문 갱신은 5 tick 연속 미수행.
  - (c) 환경 회귀 미회복 (chain 잔존): pre-commit hook `@eslint/js` resolve 실패 박제 chain 다세션 지속 (REQ-064 본문 8+ 커밋 박제). carve 시점 즉시 50.blocked/task/ 재진입 예측 (9th tick TSK-20260517-01 재현 패턴).
  - (d) Task ID 산정은 -02+ 단조 채번으로 결정 가능하나 (RULE-01 grep 전수: -01 만 점유, -02~99 미사용), spec hash 미변경 상태의 carve 재시도는 RULE-02 "재시도 없음" 위반 — 9th tick 회수 (5 task 폐기) 와 동일 결과 예측.
- **carve 부적합 근거**: RULE-02 fail-fast — 동일 spec 본문에 대한 carve 재시도는 9th tick 회수와 등가. 산출물 동일 (Toaster/Comment/File/Image/common 5 dir 분할) + 환경 게이트 동일 (lint baseline 실측 불가) + 산출물 검증 게이트 동일 (`npm run lint` rc=0 충족 불능).
- **승격 부적합 근거**: §테스트 현황 + §수용 기준 unchecked `- [ ]` 24건 잔존 (FR-01~06 + NFR-01~03) — RULE-01 승격 4조건 (`[WIP]` 0 + unchecked 0 + `^#+ .*To-Be` 0 + 변경 이력 박제) 중 unchecked == 0 위반.
- **RULE-07 정합 검증**: § 동작 평서형·반복 검증 가능·시점 비의존·incident 귀속 부재 — 격리는 RULE-07 위반 (spec 콘텐츠 결함) 아님. 격리 사유는 (i) RULE-02 재시도 금지 + (ii) inspector 우선순위 분기 정체 + (iii) 환경 회귀 미회복 + (iv) ≥4 tick stale 누적.
- **정식 복귀 경로 (RULE-05)**: `/revisit` 스킬이 본 reason 판정 후 (a) revive 시 `10.followups/` 승격 (운영자 환경 회복 + inspector spec hash 변경 선행 후 carve 재진입), (b) close 시 `60.done/2026/05/17/revisit/` 감사노트. planner 영역 미접촉 (writer 경계).
- **운영자 행동지침**:
  - (i) 환경 회복: `npm ci` 또는 `node_modules` 재설치 + pre-commit hook full pipeline (typecheck + lint + test) rc=0 확보 (50.blocked/spec/foundation/runtime-dep-version-coherence + 30.spec/green/foundation/devbin-install-integrity 와 토폴로지 의존).
  - (ii) inspector 가 본 spec 의 §변경 이력 추가 또는 본문 갱신 (REQ-062 후속 흡수) 후에만 carve 정합 — hash 변경 시 정체 카운트 리셋.
  - (iii) Task ID 재발행 시 RULE-01 grep 전수 (40.task + 60.done + 50.blocked + 10.followups + 20.req) 후 미충돌 `TSK-20260517-02` 부터 단조 채번 (60.done 영구 박제 `-01` 재사용 금지).
