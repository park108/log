# Blocked: admin-gate-recovery-and-env-config-spec

## 사유
spec 정의 기준 재정립 (2026-04-21) 불충족. **혼합 케이스**: 일부(FR-01/02) 는 진단 체크리스트·원인 확정 보고 **task 성격**, 반면 FR-03 (admin user ID 환경 변수 외부화) / FR-05 (쿠키 SameSite/expires 정정) / FR-07 (isAdmin 매트릭스 회귀 테스트) 는 지속되는 **계약 조각**. 현 문서는 task 서사가 주를 이루므로 본체는 blocked, 계약 조각은 차후 흡수 필요.

## 근거
> **FR-01 (Must) — 진단 체크리스트 박제 (C1~C5)**: §동작 에 DevTools 경유 5단계 진단 절차 박제. ...
> **FR-02 (Must) — 원인 확정 보고**: C1~C5 중 실제 원인 1개 이상 확정 + 재현 경로 + 증거 ... 박제.

진단 플로우·원인 확정 보고는 1회성 incident response — task. 계약 API (`isAdmin()` 매트릭스, 쿠키 속성, admin user ID env 변수) 는 별도.

완료 참조: TSK-20260421-61 / 572009f PASS (FR-03/04/05/07 + NFR-01/02/04 완료).

## 후속
- 완료분 → `/revisit` close 감사노트 경로. TSK-20260421-61 / 572009f 박제.
- **계약 조각은 차후 `components/common-spec.md` 로 흡수 필요** (흡수 작업은 이 task 의 범위 아님; 후속 discovery/inspector 가 followup 경로로 처리):
  - `isAdmin()` 공개 API 동작 (cookie 유/무, parseJwt 성공/실패, username 매치, isProd/isDev 분기 6 케이스)
  - admin user ID 가 `import.meta.env.VITE_ADMIN_USER_ID_{PROD,DEV}` 로 외부화됨 + 빈 값이면 false 로 귀결
  - `setCookie` 는 `sameSite` / `expires` / `max-age` 명시 (Cognito access_token TTL 정합)
