# Blocked: node-env-helper-migration-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. spec 은 컴포넌트/시스템의 as-is 서술·invariant·공개 API·이디엄 규약이어야 하며, 본 문서는 "런타임 2파일 11건 `process.env.NODE_ENV` 참조를 `isDev()/isProd()` 호출로 치환" 서사로 **task 성격**.

## 근거
> 런타임 소스 2파일에 잔존하던 `process.env.NODE_ENV` 참조 11건을 canonical 헬퍼(`isDev()` / `isProd()`) 호출로 치환하여 환경 분기 단일 진입점 확보.
> 각 분기 치환: `process.env.NODE_ENV === 'production'` → `isProd()` ...

11건 hits 치환 마이그레이션 — 1회성 배치.

## 후속
- 완료분 → `/revisit` close 감사노트 경로
- 잔존 계약 조각 ("환경 분기 단일 진입점은 `src/common/env.js` 의 `isDev/isProd/mode`; 런타임에서 `process.env.NODE_ENV` 직접 참조 금지") 는 차후 `components/common-spec.md` 이디엄 규약으로 1~2줄 흡수 필요.
