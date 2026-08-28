# Task: 픽스처 — 비공허 대조를 동반한 조건 해소 주장 (준수)

> **Task ID**: TSK-20260101-01
> **출처 spec**: slug `foundation/fixture-conforming-axis-a`
> **depends_on**: []

## 배경

- 선행 조건 확인 — `grep -rn 'FIXTURE_COUPLING_SYMBOL' scripts/` → 0 hit.
  같은 패턴이 적중을 내는 범위를 함께 박제한다: `grep -rn 'FIXTURE_COUPLING_SYMBOL' src/` → 4 hits in 1 file.
  두 수치의 비대칭이 곧 확인 범위가 비공허하다는 증거다.

## 변경 범위

| 파일 | 동작 |
|------|------|
| `package.json` | 수정 |

## 스코프 규칙

- **expansion**: 불허
