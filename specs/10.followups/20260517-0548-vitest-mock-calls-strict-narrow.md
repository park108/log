---
source_task: TSK-20260517-15
category: type-debt
severity: low
observed_at: 2026-05-17T05:48Z
---

# vitest `mock.calls[N]` 의 `noUncheckedIndexedAccess` 회귀 빈도

## 관찰
TSK-20260517-15 회복 시 `useHoverPopup.test.tsx` 의 `probe.mock.calls[0]` 가 `any[] | undefined` 로 추론되어 `[idA, idB] = mock.calls[0]` 구조분해 시 TS2488. `!` non-null assertion 으로 흡수.

동일 패턴이 `ErrorBoundary.test.tsx` 의 `fallback.mock.calls[0][0]` / `onError.mock.calls[0]` 에도 노출.

## 관심사
- `noUncheckedIndexedAccess` 정책 하에서 `mock.calls[N]` 패턴은 **모든** vitest 사용처에서 잠재 회귀. typecheck island 확대 시 동일 흡수 반복.
- 헬퍼 유틸 (`firstCall<T>(spy)` 등) 박제 시 박제 위치 단일화 가능.

## 후보 액션
- discovery: REQ 후보 — "vitest mock.calls 의 strict narrow 헬퍼 박제 (모듈 횡단)".
- 영향: `src/**/*.test.{ts,tsx}` 전반 (typecheck island 확장 시 노출).

## 박제 위치 후보
- `src/test-utils/mock-narrow.ts` (헬퍼).
- spec `30.spec/blue/foundation/test-strictness.md` 신규.
