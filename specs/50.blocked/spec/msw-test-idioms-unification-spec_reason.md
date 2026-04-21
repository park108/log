# Blocked: msw-test-idioms-unification-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "scenario 팩토리 정규화 + inline handler 추출 + 테스트 이디엄 일원화" 전환 서사로 **task 성격**.

## 근거
> (A) Comment scenario 팩토리를 `SetupServerApi` 호환 서브셋 또는 `{ onUnhandledRequest }` 옵션 수용 형태로 정규화하고, (B) `Comment.test.jsx` 를 `useMockServer(() => mock.xxx)` 로 통일, (C) File/Image inline handler 를 `api.mock.js` 명명 export 로 추출해 테스트 fixture 이디엄을 1종으로 수렴시킨다.

수렴 전환 plan — spec 이 아니라 task.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 수렴된 이디엄 ("MSW 기반 테스트는 `useMockServer(scenario)` 로 수명주기 위임; handler 는 `api.mock.js` 명명 export 로 재사용") 은 차후 테스트 이디엄 spec 으로 1~2줄 흡수 필요.
