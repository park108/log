# Blocked Reason — test-isolation-shuffle-safety-spec

> **Spec**: `specs/50.blocked/spec/test-isolation-shuffle-safety-spec.md` (ex `30.spec/green/common/`)
> **Blocked at**: 2026-04-21 (planner session; stale 2 → 3 ≥3cycle, hash `bd27261f` 불변)
> **Blocked by**: 대응 태스크 TSK-20260421-45 가 `50.blocked/task/` 로 격리된 상태 (RULE-05 수동 개입 관할). planner 재carve 는 rules 상 금지. spec 자체가 stale ≥3cycle 누적되어 planner writer 영역 내 자연 해소 경로 없음.

## 경과 (planner ledger 기반)

| 세션 | hash | stale | 비고 |
|------|------|-------|------|
| N-3 (초기) | `bd27261f` | 0 | carve → TSK-20260421-45 발행 (20eb260, "spec(planner): carve TSK-44/45 ..."). |
| N-2 | `bd27261f` | 1 | TSK-45 ready 상태, developer 미소진. stale +1. |
| N-1 | `bd27261f` | 2 | 직전 세션 기록. TSK-45 는 ready 잔존. |
| **N (현 세션)** | `bd27261f` | **3 (≥3cycle)** | TSK-45 가 developer 세션에서 blocked 이동 (수용 기준 FR-04 달성 불가 — spec §동작 1 진단 가설 오류). planner 재carve 금지. **blocked 이동**. |

## RULE-05 근거

- RULE-01 writer matrix: planner 는 `30.spec/green/F` → `30.spec/blue/F` 승격 또는 `30.spec/**` → `50.blocked/spec/` 격리만 허용.
- RULE-05 §Blocked 해제: planner 는 blocked 를 재시도하지 않는다 — 사람 운영자 관할.
- TSK-20260421-45 reason (`specs/50.blocked/task/TSK-20260421-45-test-isolation-shuffle-safety_reason.md`) §"해제 가이드" 는 spec 재작성을 요구 — inspector/사람 개입 영역이며 planner writer 영역 밖.

## 해제 가이드 (운영자 / 차기 inspector)

1. **spec 재작성 필요** — TSK-45 reason §"해제 가이드" 요약:
   - (A) `src/Log/LogItem.test.jsx:210, 265, 321, 382` 의 `screen.getByTestId("delete-button")` → `await screen.findByTestId(...)` 전환 (React 19 concurrent commit cold-start race 대응). FR-01 범위 확장.
   - (B) `LogItem.test.jsx` 파일-level `beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))` 추가 — cold-start polling 환경 균일화.
   - FR-03 옵션 2 (`ASYNC_ASSERTION_TIMEOUT_MS`) 는 TSK-20260421-47 (react-19-findby-β) 이 `src/test-utils/timing.js` 재도입 완료 후 채택 가능.
2. spec 보강 → `30.spec/green/` 복귀 (`mv specs/50.blocked/spec/test-isolation-shuffle-safety-spec.md specs/30.spec/green/common/`). TSK-45 blocked 항목은 spec 보강 반영 후 새 task 로 재carve (`40.task/ready/`) 또는 TSK-45 문서 복귀 (RULE-05 §Blocked 해제).
3. 정리 완료 시 본 `_reason.md` 와 `TSK-20260421-45-*_reason.md` 삭제 + 후속 result.md 또는 spec 변경 이력에 사유 1~2줄 기록 (RULE-05 §4).

## 참고

- 관련 blocked task: `specs/50.blocked/task/TSK-20260421-45-test-isolation-shuffle-safety.md` + `_reason.md`.
- 관련 blocked spec: `specs/50.blocked/spec/react-19-findby-timing-stabilization-spec.md` (직전 세션 격리, 동일 원인 계열 — React 19 테스트 타이밍 race).
- 현 HEAD: `a01c0c4` (master).
- planner ledger: `specs/30.spec/green/.planner-seen` (stale 카운트 기록).
