# Task: 픽스처 — 범위 도출로 지탱되는 조건 해소 주장 (준수)

> **Task ID**: TSK-20260101-02
> **출처 spec**: slug `foundation/fixture-conforming-axis-b`
> **depends_on**: []

## 배경

선행 조건은 손 열거가 아니라 전수 범위에서 확인했다.
`git ls-files | xargs grep -n 'FIXTURE_ABSENT_SYMBOL'` → 0 hits.
열거자가 결합의 존재를 몰라도 범위가 좁아지지 않는 형태다.

## 변경 범위

| 파일 | 동작 |
|------|------|
| `package.json` | 수정 |

## 스코프 규칙

- **expansion**: 불허
