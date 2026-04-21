# Blocked: geturl-render-path-test-audit-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "getUrl()/userAgentParser() 직·간접 사용처 전수 감사 → 4열 표 박제 → 누락 지점 stubMode 적용" 서사로 **task 성격**.

## 근거
> **감사 산출물 (FR-01, Must)**: `grep -rn "getUrl()\|userAgentParser(" src/` 결과를 파일:라인 · 렌더/비렌더 · 대응 test 파일 · stubMode 명시 유무 4열 표로 result.md 에 박제.
> 렌더 경로 + stubMode 누락 항목 각각에 `describe`-scoped `beforeEach(() => stubMode('test'))` 추가.

1회성 감사·가드 주입 배치 — spec 이 아니라 task.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 잔존 이디엄 규약 ("env-dependent URL 헬퍼를 렌더 경로에서 소비하는 테스트는 describe-scoped `stubMode(...)` 로 env 전제 박제") 은 차후 common 테스트 이디엄 spec 으로 1~2줄 흡수 필요.
