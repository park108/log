# RULE-07 Spec 콘텐츠

`30.spec/{blue,green}/**` 는 **시스템 불변식·계약** 만. 1회성 진단·조사·감사·incident patch 플랜 금지.

## 반려 시그널
§동작/FR 이 관측·측정·분석·재현·TODO 나열 중심 → spec 아님.
특정 incident·릴리스·날짜에 귀속된 patch 제안 → spec 아님.

## 양성 기준
- 시스템이 **무엇이어야 하는가** 를 평서문 선언.
- 반복 검증 가능 (테스트로 박제).
- 시점·사건 의존성 없음 (재현 픽스처 제외).

## 처리
- **inspector**: 반려 시 `20.req/*` → `50.blocked/req/{slug}_reason.md`.
- **수동 발견**: `30.spec/**` → `50.blocked/spec/{slug}_reason.md` → RULE-05 경로.

예: ❌ "logsingle prod serial timeout 진단" / ✅ "logsingle 은 serial mode 에서 `LOG_SERIAL_TIMEOUT_MS` 초과 시 fail-fast + 후속 차단".
