# Task: 픽스처 — 대조도 범위 도출도 없는 영 결과 주장 (리스트 항목 형태)

> **Task ID**: TSK-20260102-02
> **출처 spec**: slug `foundation/fixture-violation-axis-b`
> **depends_on**: []

## 배경

확인 범위는 스코프 규칙 baseline 에 열거했다.

## 변경 범위

| 파일 | 동작 |
|------|------|
| `package.json` | 수정 |

## 스코프 규칙

- **expansion**: 불허
- **grep-baseline**:
  - `grep -cE '^if git diff --cached' .husky/pre-commit` → **14**
  - `grep -rn 'FIXTURE_COUPLING_SYMBOL' scripts/ .github/` → **0 hits** (선행 조건 해소 확인)
