# Task: 픽스처 — 앞선 사유서 처방을 스코프에 담은 재발행 (준수)

> **Task ID**: TSK-20260101-03
> **출처 spec**: slug `foundation/fixture-prior-isolated-axis`
> **depends_on**: []

## 배경

같은 축의 앞선 발행이 격리됐다. 본 문서는 그 사유서가 파일 경로로 지목한 대상 전수를
변경 범위에 담는다. 링크는 식별자가 아니라 출처 slug 일치로 성립한다.

## 변경 범위

| 파일 | 동작 |
|------|------|
| `package.json` | 수정 |
| `.husky/pre-commit` | 수정 |

## 스코프 규칙

- **expansion**: 불허
