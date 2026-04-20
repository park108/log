# blocked reason — react-19-findby-timing-stabilization-spec

- **격리 경로**: `specs/30.spec/green/deps/react-19-findby-timing-stabilization-spec.md` → `specs/50.blocked/spec/react-19-findby-timing-stabilization-spec.md`
- **격리 시각**: 2026-04-21 (planner cycle)
- **hash**: `b5d9e93ed288177673e17ba1012d54fc77f26e20722a1071ac1b43d5c4b133a4` (불변 3 cycle)
- **stale**: 3 (≥3cycle, RULE-01 planner 규약 "2회 이상 정체 → blocked/spec" 충족)

## 사유
- green 스펙의 hash 가 3 cycle 연속 불변.
- 대응 task **TSK-20260421-43** (`react-19-findby-timing-reselection`) 는 developer 판단으로 `50.blocked/task/` 에 격리 상태 유지 (`TSK-20260421-43-react-19-findby-timing-reselection_reason.md` 잔존). RULE-05 에 따라 **planner 재carve 금지** (수동 개입 관할).
- spec 수용 기준 15건 전원 `- [ ]` unchecked. 4 케이스 옵션 α/β/γ 재선정 이 선행되어야 하나 planner writer 영역 (40.task/ready/) 에서 움직일 수 없음 → **파이프라인 진행 불가**.
- 직전 2 cycle 동안 동일 상태 지속 (ledger stale 1 → 2 → 3).

## 해제 조건 (RULE-05 수동 개입)
- TSK-20260421-43 의 blocked 원인 해소 후 수동으로 (a) task 를 ready 로 복귀하거나, (b) inspector 가 spec 을 옵션 확정 버전으로 재편집해 green 재진입.
- 복귀 방법: 원인 제거 후 `mv specs/50.blocked/spec/react-19-findby-timing-stabilization-spec.md specs/30.spec/green/deps/`.
- 본 `_reason.md` 는 RULE-05 에 따라 복귀·후속 처리 완료 시 삭제.

## 관련 산출물
- `specs/50.blocked/task/TSK-20260421-43-react-19-findby-timing-reselection.md` (blocked task)
- `specs/50.blocked/task/TSK-20260421-43-react-19-findby-timing-reselection_reason.md` (사유)
- followup 이력: `specs/60.done/2026/04/21/followups/20260420-1513-react-19-findby-timing-stabilization-from-blocked.md`
