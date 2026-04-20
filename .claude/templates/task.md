# Task: {{제목}}

> **Task ID**: TSK-YYYYMMDD-NN
> **출처 spec**: `specs/30.spec/blue/.../X.md` §{{섹션}}
> **관련 요구사항**: REQ-...
> **depends_on**: [] 또는 [TSK-...]
> **supersedes**: (carve 파생 시만)

## 배경
1~3줄.

## 변경 범위
| 파일 | 동작 | 핵심 |
|------|------|------|
| `src/...` | 추가/수정/삭제 | ... |

## 구현 지시
1. ...
2. ...

## 테스트
- 신규 케이스, 회귀 기준.

## 검증/DoD
<!-- grep 게이트 예: rg -nE "afterEach\s*\([^)]*<fn>\s*\(\s*\)" src --glob="*.test.{js,jsx}" → 0 hits -->
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build` (해당 시)
- [ ] 수동 검증: ...

## 스코프 규칙
<!-- RULE-06. grep 게이트 있으면 필수. 없으면 섹션 삭제. -->
- **expansion**: 허용 | 불허 | N/A
- **grep-baseline**:
  - `grep -rn "<pattern>" <path>` → N hits in M files:
    - `src/...:LL`
- **rationale**: <1~2줄>

## 롤백
단일 `git revert <sha>` 로 가능.

## 범위 밖
- 후속: TSK-...
