# Blocked: msw-test-sibling-it-shuffle-race-dedicated-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "3개 sibling `it` race 를 테스트 파일 단독 수정으로 해소" 서사로 **task 성격** (carve-out).

## 근거
> `src/test-utils/msw.test.js` 의 3개 sibling `it` 어서트(`:29, :37, :57`) 가 `vi.fn()` 호출 횟수 누적/소거에 의존해 `vitest --sequence.shuffle --sequence.seed=3` 에서만 재현되는 race 를 **테스트 파일 단독 수정 (≤ 1 파일)** 로 해소한다.

단일 파일 1회성 해소 plan — 1 PR 사이즈 task.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 잔존 계약 조각 ("msw 계약 테스트의 어서트는 호출 횟수 가정을 금지, `최소 1회` 및 값 전달만 검증") 은 차후 msw 테스트 이디엄 spec 으로 1~2줄 흡수 필요.
