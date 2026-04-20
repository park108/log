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

## 6. Task ID 명명 & carve 규약

Task ID = `TSK-YYYYMMDD-NN` (NN = 2자리 10진수). planner 가 유일한 발급 주체. ID ↔ artifact 1:1 매핑이 깨지면 감사/롤백 추적이 훼손되므로 아래 5규칙은 必 준수.

### 6.1 생성 시 grep 선검증
신규 태스크 파일 작성 **직전**, planner 는 `grep -rn "TSK-YYYYMMDD-NN" specs/task/` (범위: `ready/`, `blocked/`, `done/` 전체)을 1회 실행:
- hits == 0 → NN 할당 확정.
- hits ≥ 1 → 자기 자신(현 세션 임시 파일) 제외 후 재판정. 여전히 ≥ 1 이면 NN++ 후 재실행.

### 6.2 carve 시 접미사 분기
기존 태스크(`TSK-YYYYMMDD-NN`)를 재분할(carve)하는 경우, 파생 태스크는 **원본 ID 를 재사용하지 않는다**.
- 파생 ID 형식: `TSK-YYYYMMDD-NN-a`, `-b`, ... (알파벳 소문자 단일 문자, 5단계 이상 필요 시 `-aa`).
- 원본 지시서 본문에 `carved: TSK-YYYYMMDD-NN-a, TSK-YYYYMMDD-NN-b` 1줄 박제.
- 파생 지시서 상단 메타(`> **Task ID**:` 부근)에 `supersedes: TSK-YYYYMMDD-NN` 필드 필수.

### 6.3 접미사 분기 불가 시 slot 재배정
원본이 이미 published(커밋/푸시 완료)되어 접미사 분기가 불가능한 경우:
- 다음 미사용 NN 슬롯(§6.1 grep 검증 통과)으로 재배정.
- 신규 지시서에 `supersedes: TSK-YYYYMMDD-NN` 박제 (§6.2 와 동일 필드).

### 6.4 사후 처리 (rewrite 금지)
이미 발생한 ID 충돌(예: `TSK-20260420-11` 중복 배정)은 `RULE-02` §2.2 에 따라 **artifact rewrite 금지**. 대응은 다음 중 하나:
- 신규 지시서 생성 시 §6.1 로 중복 방지 (재발 차단).
- 필요 시 감사용 disambiguation 주석만 관련 폴더에 추가 (기존 본문 수정 없이).

### 6.5 carve 보고
planner 세션에서 carve 가 발생하면 `RULE-04` report `notes` 에 `carve: TSK-YYYYMMDD-NN -> TSK-YYYYMMDD-NN-a,TSK-YYYYMMDD-NN-b` 1줄 기록.
