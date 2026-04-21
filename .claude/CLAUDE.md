# SDLC Pipeline

4 agents (**discovery → inspector → planner → developer**) 가 각자 독립 세션에서 주기 트리거로 협업하는 SDD 파이프라인.

## 흐름

- 진행: `req → spec.blue → spec.green → task → code`
- 완료: `code ok → task done → green promote→blue → req done`
- 피드백 루프: `developer → followups → discovery`

agent 는 **자기 입력 큐만 읽고 자기 출력 큐에만 쓴다**.

## 규약 인덱스 (Single Source of Truth)

| 규칙 | 주제 |
|------|------|
| [RULE-01](rules/RULE-01-PIPELINE.md) | 레이아웃·쓰기 권한·이동 원자성·Task ID |
| [RULE-02](rules/RULE-02-AUTONOMY.md) | 독립 실행 원칙·공통 금지·커밋/푸시 |
| [RULE-03](rules/RULE-03-BACKPRESSURE.md) | 주기·임계치·pause lock·선결 점검 |
| [RULE-04](rules/RULE-04-REPORT.md) | stdout 보고 블록·관용 토큰 |
| [RULE-05](rules/RULE-05-MANUAL.md) | blocked 해제·긴급 롤백·정지·override |
| [RULE-06](rules/RULE-06-TASK-SCOPE.md) | 스코프 규칙 섹션·grep 게이트 정합성 |
| [RULE-07](rules/RULE-07-SPEC-CONTENT.md) | spec 콘텐츠 — 불변식/계약 한정, 1회성 진단 반려 |

에이전트 문서 ↔ rules 충돌 시 **rules 우선**. 규약은 `rules/` 에서만 변경.
