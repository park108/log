# Blocked: env-test-stub-adaptation-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "6개 파일 44 hits 의 `process.env.NODE_ENV` 재할당을 Vite-native stub (`vi.stubEnv` 또는 `vi.mock`) 으로 어댑테이션" 서사로 **task 성격**.

## 근거
> 6개 테스트 파일 44 hits 의 `process.env.NODE_ENV = ...` 런타임 재할당을 Vite-native stub (`vi.stubEnv` **또는** `vi.mock('@/common/env', ...)`) 으로 어댑테이션한다.
> 6개 테스트 파일의 `process.env.NODE_ENV = '...'` 재할당 44 hits 를 전량 제거하고 선택된 stub 전략의 호출로 치환.

hits 단위 마이그레이션 작업지시 — 이디엄 규약이 아니라 1회성 치환 배치.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 잔존 이디엄 규약 ("테스트에서 환경 분기 stub 은 `vi.stubEnv` 로 표현한다") 은 차후 `components/common-spec.md` 혹은 테스트 이디엄 spec 으로 1~2줄 흡수 필요. 흡수는 discovery/inspector followup 경로.
