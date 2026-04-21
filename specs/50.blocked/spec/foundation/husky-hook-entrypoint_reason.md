# Blocked reason: `foundation/husky-hook-entrypoint.md` (REQ-20260422-044)

- **slug**: `husky-hook-entrypoint`
- **blocked_at**: 2026-04-21T19:08Z (41st cycle, planner)
- **from**: `specs/30.spec/green/foundation/husky-hook-entrypoint.md`
- **to**: `specs/50.blocked/spec/foundation/husky-hook-entrypoint.md`

## 근거 (RULE-01 + RULE-03 + RULE-07)

### 1. Stale=3 도달 — planner 승격 판정 4조건 3회 연속 미충족

`.planner-seen` ledger 기록 (39th/40th/41st cycle):

| cycle | [WIP] | unchecked `- [ ]` | `^#+ To-Be` | §변경 이력 TSK/commit 박제 | stale |
|-------|-------|-------------------|-------------|---------------------------|-------|
| 39th  | 0     | 9                 | 0           | 없음                      | 1     |
| 40th  | 0     | 9                 | 0           | 없음                      | 2 (held) |
| 41st  | 0     | 9                 | 0           | 없음                      | **3** |

RULE-03 선결 점검은 stale 임계치 직접 박제 없음. 본 ledger 는 **2회 이상 정체** 를 planner 관행으로 삼아왔고 40th cycle 에서 "dev active" 판단으로 격리 유보했던 전례. 41st cycle 시점의 실측 관찰 (아래 §2) 은 "dev active" 가정이 깨졌음을 증거.

### 2. Developer 세션이 이미 blocked 판정 + `/revisit` 으로 followups 승격 상태

- `specs/10.followups/20260421-1841-husky-v9-shim-dir-regeneration-spec-drift.md` (dev 발행, 2026-04-21T18:41Z, HEAD=06a8fb9).
- `specs/10.followups/20260421-1847-husky-v9-migration-spec-drift-from-blocked.md` (revisit 처리, 2026-04-21T18:47Z).

두 followup 은 TSK-20260421-90 의 **FR-06 구조적 spec-reality drift** 를 dev 가 재현·격리하고 `/revisit` 이 discovery 경로로 공식 이관했음을 박제. 결과:

- `40.task/`: 비어 있음 (TSK-90 원본 이동 완료).
- `50.blocked/task/`: 비어 있음 (`/revisit` 삭제 후 followups 로 승격).
- 파이프라인 상 husky green 의 승격 경로는 **dev → followups → discovery → 신규 req → inspector → 신규 green** 재진입만 유효.

### 3. RULE-07 잠재적 위반 — FR-06 스펙 자체의 재현성 결함

followup 2건의 상세 분석:

- v9 `.husky/_/` 는 **런타임 dispatcher** (`h` + 39B shim 17개 + v10 deprecation 경고 `husky.sh`) 로서 v8 `_/husky.sh` shim 과 의미·역할이 다름.
- `.husky/_/.gitignore` `*` 규칙으로 git 추적 제외 (`git ls-files .husky/_` → 0 lines).
- spec FR-06 본문 "**v8 shim 산물 잔존 금지**" + DoD `ls -d .husky/_` → not found 는 **husky v9 업스트림 동작과 구조적 충돌** — FR-01 (deprecated shim source 금지) 이 이미 의미를 커버하므로 FR-06 은 중복 방어이며, 현실에서는 달성 불가 (수단 치환 없이).
- RULE-07 "반복 검증 가능 & 시점 비의존" 기준으로 FR-06 은 husky v9+ 런타임에서는 항상 위반. 이는 spec 양성 기준 결함.

### 4. Planner 권한 경계

- RULE-01 매트릭스: planner mv 권한 = `30.spec/green/F → 30.spec/blue/F` + `30.spec/** → 50.blocked/spec/`. 본 격리는 후자에 해당.
- planner 는 **spec 내용 수정 금지** (FR-06 삭제/재박제 제안만). 실질 재박제는 followups → discovery → 신규 req → inspector 경로로 수행되어야 함 (RULE-05).

## 해제 경로 (RULE-05)

정식 경로: `50.blocked/spec/foundation/husky-hook-entrypoint.md` → **`10.followups/` 재진입** (운영자 `/revisit`). 10.followups/ 에 이미 2건 박제되어 있어 discovery 가 다음 주기에 다음 3 옵션 중 1 택한 신규 req 로 승격 예상:

1. FR-06 재박제 (저장소 기준) — `git ls-files .husky/_` → 0 lines 로 교체.
2. FR-06 삭제 — FR-01 중복 방어.
3. 수단 치환 (FR-05) — lefthook / simple-git-hooks.

신규 req 승격 시 inspector 가 새 green 재작성하고 planner 가 신규 task carve (TSK 신규 ID, `supersedes: TSK-20260421-90` 메타).

## 역이동 금지 (RULE-01)

`20.req/*` 또는 `40.task/*` 로 원복 금지. 본 blocked 디렉터리 → 10.followups/ 재진입만 허용.

## 동반 잔존 파일

- `specs/10.followups/20260421-1841-husky-v9-shim-dir-regeneration-spec-drift.md` (dev 발행).
- `specs/10.followups/20260421-1847-husky-v9-migration-spec-drift-from-blocked.md` (revisit 처리).

discovery 가 두 followup 을 기반으로 신규 req 작성 시 본 blocked spec 본문 내 FR-01~05 은 보존 가능 — 재진입 green 에서 반영.
