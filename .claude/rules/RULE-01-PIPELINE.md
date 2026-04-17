# RULE-01 파이프라인 & 상태 전이 (Pipeline & State)

> 적용 범위: 모든 에이전트

4단계 큐 기반 단방향 파이프라인. 에이전트 간 **직접 호출 없음**. 통신은 오직 `specs/**` 하위 파일 생성/이동.
흐름 다이어그램은 [`.claude/CLAUDE.md`](../CLAUDE.md) 참조.

## 1. 디렉토리 레이아웃

```
specs/
├── followups/
│   ├── *.md                           # developer 작성
│   └── consumed/YYYY/MM/DD/*.md       # discovery 이동
├── requirements/
│   ├── ready/*.md                     # discovery → inspector
│   ├── blocked/*.md                   # inspector 매핑 실패 (수동 해제)
│   └── done/YYYY/MM/DD/*.md           # inspector 처리 완료
├── spec/
│   ├── blue/**/*.md                   # 기준선 (planner 만 승격)
│   ├── green/**/*.md                  # WIP (inspector 갱신)
│   └── blocked/**/*.md                # planner 부분 승격 불가 (수동)
└── task/
    ├── ready/*.md                     # planner → developer
    ├── blocked/*.md                   # developer 선행/환경 문제 (수동)
    └── done/YYYY/MM/DD/{slug}/
        ├── {slug}.md                  # 원본 지시서 (이동본)
        └── result.md                  # 결과 보고서
```

## 2. 쓰기 권한 매트릭스

| 경로 | writer | reader |
|------|--------|--------|
| `followups/*.md` | **developer** (create) | discovery |
| `followups/consumed/**` | **discovery** (mv) | — |
| `requirements/ready/*.md` | **discovery** (create) | inspector |
| `requirements/blocked/*.md` | **inspector** (mv) | manual |
| `requirements/done/**` | **inspector** (mv) | discovery (중복 회피) |
| `spec/green/**` | **inspector** (create/edit) | planner |
| `spec/blue/**` | **planner** (mv, 승격) | inspector, developer |
| `spec/blocked/**` | **planner** (mv) | manual |
| `task/ready/*.md` | **planner** (create) | developer |
| `task/blocked/*.md` | **developer** (mv) | manual |
| `task/done/**` | **developer** (mv + result.md) | — |

약어: `mv` = 이동만 허용 / `create` = 신규 생성만 / `edit` = 내용 수정 허용 (inspector 의 green 만 예외).

## 3. 이동 원자성

- `mkdir -p <dst> && mv <src> <dst>` 순서 고정.
- 내용 편집은 이동 **전**에 완료.
- 이동 실패 시 원본 유지. 이동 후 검증 실패 시 역이동 후 blocked.

## 4. 내용 불변 (Immutable Handoff)

다음 파일은 **어떤 에이전트도 내용 수정 금지**. 이동만 허용:
- `followups/*.md`
- `requirements/ready/*.md`
- `task/ready/*.md`

큐 파일은 상류가 확정한 "계약"이며 하류가 재해석하면 추적성이 깨진다.

## 5. 스키마 변경 시

- 디렉토리·쓰기 매트릭스를 바꾸려면 **4개 에이전트 문서를 동시 갱신**.
- 본 문서가 **단일 출처**. 에이전트 문서는 참조만.
