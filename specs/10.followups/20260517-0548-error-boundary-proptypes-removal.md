---
source_task: TSK-20260517-15
category: type-debt
severity: low
observed_at: 2026-05-17T05:48Z
---

# ErrorBoundary 의 PropTypes 의존 제거

## 관찰
TSK-20260517-15 에서 `src/common/ErrorBoundary.tsx` 의 정적 `propTypes` 할당이 TypeScript class 정적 형상에 `propTypes` 키가 없어 typecheck error (TS2339). `(ErrorBoundary as unknown as { propTypes: object }).propTypes = {...}` cast 로 흡수했음.

## 관심사
- TypeScript 컴포넌트는 props 타입을 인터페이스 (`ErrorBoundaryProps`) 로 박제하고 있어 PropTypes 의 런타임 검사는 중복 안전망.
- cast 흡수는 임시 정합 — 장기 유지보수 시 직관성 저해.

## 후보 액션
- discovery: REQ 후보 — "PropTypes 의존 제거 (TypeScript 인터페이스 단일 박제)".
- 영향 범위: `src/common/ErrorBoundary.tsx` (+ 동일 패턴 다른 영역 검색 필요).
- 외부 영향: `prop-types` 의존성 제거 가능 → `package.json` 정리.

## 박제 위치 후보
- spec `30.spec/blue/components/common.md` §타입 가드 (PropTypes 사용 정책).
