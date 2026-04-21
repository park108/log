# Blocked: react-19-test-layer-adaptation-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "React 19 bump 차단 두 패턴 (fake-timer 41 hits + MSW listen/close) 을 테스트 레이어에서 선행 해제" 서사로 **task 성격**.

## 근거
> React 19 bump(TSK-20260420-30) 를 차단한 **테스트 레이어 두 패턴** 을 React 18 현행 green 을 유지하면서 선행 해제한다.
> 41 hits (`vi.useFakeTimers(` 현행 baseline) 전 건 중 **인자 없는 호출** 과 `'modern'` 문자열 인자 호출을 다음 중 하나로 전환: ...

hits 단위 전환 작업 — 1회성 어댑테이션.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 잔존 이디엄 규약 ("fake-timer 진입점은 옵션 객체 호출; MSW 수명주기는 `beforeEach/afterEach listen/close` 또는 `useMockServer`") 는 차후 테스트 이디엄 spec 으로 1~2줄 흡수 필요.
