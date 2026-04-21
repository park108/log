# file-test-multi-scenario-split-spec blocked reason

- **slug**: `file-test-multi-scenario-split-spec`
- **source**: `specs/30.spec/green/components/file-test-multi-scenario-split-spec.md`
- **hash**: `6488570be7d4c6586fdcc912c53a5cfeaf8020ff5add354ba34ea760df280197`
- **stale cycles**: 3 (planner ledger: 1 → 2 → 3; hash 불변 유지)
- **관련 요구사항**: REQ-20260421-008
- **관련 task (blocked)**: `specs/50.blocked/task/TSK-20260421-50-file-test-multi-scenario-split.md` (+_reason.md)
- **의존 task (blocked)**: `specs/50.blocked/task/TSK-20260421-49-test-isolation-shuffle-safety-cold-start.md` (depends_on; TSK-50 reason 참조)

## 사유
planner 사이클 2026-04-22(2차) 에서 hash 불변 stale=3 도달. 승격 4조건 미충족:
- `[WIP]` = 0, `^#+ .*To-Be` = 0, 변경 이력 박제 OK.
- unchecked `- [ ]` = 19건 중 `[deferred]` 태깅 7건 (테스트 현황 FR-01~05/07/09), **수용 기준 섹션 12건 (L56~67) 태깅 부재** → 승격 경로 미완.
- hash 동일(`6488570…`) 이 3사이클 연속 유지 → RULE-01 정체 격리 임계 도달.

동일 범위 carve (`src/File/File.test.jsx` `prodServerOk` describe 분할) 는 이미 TSK-20260421-50 으로 발행되어 blocked 상태 — 재carve 는 멱등/fail-fast 위반 (RULE-02).

## 해제 경로 (RULE-05 운영자 관할)
1. **옵션 A — inspector 가 spec 보강 후 복귀**:
   - 수용 기준 12건 (L56~67) 에 `[deferred]` 태깅을 확산하면 4조건 충족 → green 에서 blue 승격 가능.
   - 전제: TSK-20260421-50 reason.md 에 기재된 depends_on (TSK-49) 재평가 결과 반영.
2. **옵션 B — depends_on 선해결 후 task 재가동**:
   - 운영자가 TSK-20260421-49 blocked 원인 제거 → TSK-50 을 `40.task/ready/` 로 복귀 → developer 가 실측 후 결과 박제 → green spec 이 자연 박제되어 승격.
3. **옵션 C — 스펙 폐기**:
   - REQ-20260421-008 이 더 이상 유효하지 않을 경우 본 파일 + 관련 task 문서 삭제. 감사 기록은 req done 아카이브에 1~2줄 남김.

## 참고
- 이전 사이클 ledger: `common/test-isolation-shuffle-safety-cold-start-spec.md` 는 stale=0 리셋(hash 변동) → 1 로 증가 (승격 불가 지속).
- inspector 가 shuffle-safety-cold-start 의 수용 기준 섹션에 `[deferred]` 태깅을 확산하면 해당 spec 도 승격 경로 진입.
