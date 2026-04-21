# Blocked: uniform-fake-timer-teardown-policy-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "`setupTests.js` 전역 afterEach 추가 + 본문 직접 호출 20건 감소" 수치 목표 서사로 **task 성격**.

## 근거
> `src/setupTests.js` 에 전역 `afterEach(() => vi.useRealTimers())` 를 **정확히 1회** 추가하여 teardown 을 단일 지점으로 박제하고, 파일 본문(`it`/`test` 내부) 직접 `vi.useRealTimers()` 호출을 20건 이상 감소시킨다.
> 17개 `.test.jsx` 파일 중 **본문 직접 `vi.useRealTimers()`** 호출 (총 baseline 41 hits) 의 최소 20건을 제거.

20건 감소 수치 타겟 — 1회성 정리 배치.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 잔존 이디엄 규약 ("fake-timer teardown 은 `src/setupTests.js` 전역 `afterEach` 가 담당; 파일별 명시는 선택") 은 차후 테스트 이디엄 spec 으로 1~2줄 흡수 필요.
