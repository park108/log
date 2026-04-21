# Blocked: test-isolation-shuffle-safety-cold-start-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. **혼합 케이스**: Layer 1 옵션 A 해결 경로, Layer 2 후보 B1'/B2/B4/B5/B6 열거와 fallback chain, TSK-57 재진단 4시점 타임라인 등 전체가 race 해소 **plan** 으로 **task 성격**. 잔존 invariant 는 1~2줄 수준.

## 근거
> 본 spec 은 Layer 1 의 옵션 A 채택은 유지하고, Layer 2 에 대해 후보 B1' / B2 / B4 / B5 / B6 를 §대안 섹션에 열거, 1차 추천안과 fallback 순서를 §동작에 확정한다.
> **FR-11 (Must, REQ-010 + REQ-012 재진단 반영) — Layer 2 후보 B1' / B2 / B4 / B5 / B6 열거**: ...

옵션 채택·fallback chain·재진단 서사는 해소 plan — task 성격.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- **`LogItem DELETE 테스트는 shuffle seed={1,2,3} 에서 race 없이 pass` 수준 invariant 만 `components/log-spec.md §회귀 중점` 으로 1~2줄 흡수 필요** (흡수는 이 task 의 범위 아님; 후속 discovery/inspector 가 followup 경로로 처리). 추가 후보:
  - common 테스트 이디엄 spec: "DOM 쿼리는 React 19 concurrent 환경에서 `findBy*` 계열 async query 사용을 기본 이디엄으로 한다"
  - msw.test.js sibling-it race 는 별도 REQ-011 carve-out 으로 이미 분리됨
