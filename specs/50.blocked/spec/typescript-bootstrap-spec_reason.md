# Blocked: typescript-bootstrap-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "TypeScript 점진 도입 foundation 파일 배치" 1회성 배치 서사로 **task 성격**.

## 근거
> 이미 strict 로 설정된 `tsconfig.json` / 설치된 `typescript` 와 `@types/*` 패키지를 실제 동작하게끔 **최소 `.ts` 파일 + ESLint/lint-staged glob 확장 + typecheck 스크립트 실효화** foundation 을 도입한다.
> `src/types/` 디렉토리 생성 + `env.d.ts` 최소 1 파일 추가.

bootstrap 배치 — 1회성 foundation 구축 task.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 잔존 계약 조각 ("`src/**/*.{ts,tsx,d.ts}` 는 ESLint/lint-staged 대상; `@/types/*` alias 는 ambient type 진입점") 은 차후 foundation/tooling spec 으로 1~2줄 흡수 필요.
