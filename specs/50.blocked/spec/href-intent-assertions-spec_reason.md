# Blocked: href-intent-assertions-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "어설션을 intent-based query 또는 env stub 명시 중 단일 이디엄으로 재설계" 서사로 **task 성격**.

## 근거
> 본 spec 은 어설션을 **의도 기반 (intent-based query) 또는 env stub 명시** 중 단일 이디엄으로 재설계해 env 전제와 치환 경로를 분리한다.
> 선택된 이디엄 1종을 전수 적용. ... `toStrictEqual(<a></a>)` → `expect(link.getAttribute('href')).toBeNull()` 또는 `expect(link.getAttribute('href')).toMatch(/^http/)` 등 의도 표현으로 전환.

전수 재설계 작업지시 — 이디엄 선택 자체는 규약이 될 수 있으나 본 문서는 선택 + 적용 플랜.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 채택된 이디엄 ("env-dependent URL 렌더 어설션은 intent-based query 혹은 명시 env stub 로 표현") 은 차후 common 테스트 이디엄 spec 으로 1~2줄 흡수 필요.
