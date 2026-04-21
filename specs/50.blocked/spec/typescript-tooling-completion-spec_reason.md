# Blocked: typescript-tooling-completion-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "TSK-20260420-32 에서 의도적으로 유보한 두 gap 을 단일 단위로 메운다" 서사로 **task 성격**.

## 근거
> TSK-20260420-32 (TypeScript foundation bootstrap) 에서 의도적으로 유보한 두 gap 을 단일 단위로 메운다: (1) typescript-eslint 파서/플러그인 부재 ... (2) Vitest coverage `include` 가 `['src/**/*.{js,jsx}']` 로 고정되어 `.ts/.tsx` 실소스가 coverage 통계에서 누락될 예고.

gap-filling 1회성 remediation — 전형적 task.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 잔존 계약 조각 ("ESLint 는 `.ts/.tsx/.d.ts` 를 typescript-eslint 파서로 파싱; Vitest coverage 는 `src/**/*.{js,jsx,ts,tsx}` 를 포함하며 `.d.ts` 제외") 은 차후 foundation/tooling spec 으로 1~2줄 흡수 필요.
