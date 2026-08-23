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

## 수용 기준 문장 규약

> 2026-08-24 추가 (수동 — 운영자). 계기: green 21건의 unchecked 213 항목 중 약 2/3 가 어느 시점에도 `[x]` 가 될 수 없는 문장이었고, 그 결과 planner promote 가 122 tick 동안 0 이었다.

`## 수용 기준` · `## 테스트 현황` 의 체크박스 항목은 **현재 HEAD 에서 명령 1회로 rc 판정 가능** 해야 한다. 판정 불가 문장은 체크박스로 두지 않는다.

### 체크박스 부적격 부류
| 부류 | 예 | 사유 |
|---|---|---|
| 미래 사건 대기 | `차기 dep 이벤트 후 marker 플립` / `회복 사례 누적 ≥ 2건` | 어느 시점에도 참이 되지 않음 |
| 가정 주입 요구 | `favicon.ico 삭제 가설 회귀 시 exit 1` | 고장을 내야 검증됨 |
| 미측정 NFR | `< 100 ms` / `N 회 반복 동일 출력` | 측정 채널 부재 |
| 자명 명제 | `자체 진단 제외` / `게이트는 read-only` | 판정 대상 아님 |

### 처리
부적격 항목은 삭제하지 않고 `## 참고` 하위 **`### 미측정·비판정 항목`** 으로 내려 평서문으로 박제한다. 감사성은 보존되고 promote 는 막지 않는다.

### promote 조건
`## 수용 기준` 의 체크박스가 전수 `[x]` 이면 promote 가능. 체크박스 0개인 spec 도 promote 가능 — 불변식 선언만으로 baseline 자격을 충족한다.
