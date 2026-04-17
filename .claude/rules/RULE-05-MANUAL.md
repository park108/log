# RULE-05 수동 개입 (Manual Intervention)

> 적용 범위: 사람 운영자 (에이전트는 **재시도 안 함**)

## 1. Blocked 해제

에이전트가 자동 처리 불가로 격리한 항목:
- `specs/requirements/blocked/*.md` — inspector 매핑 실패
- `specs/spec/blocked/**/*.md` — planner 부분 승격 불가
- `specs/task/blocked/*.md` — developer 선행/환경/구현 실패

절차:
1. 같은 폴더의 `{slug}_reason.md` 로 사유 확인.
2. 원인 제거 (의존 태스크 완료, 스펙 보강, 환경 수정 등).
3. 원본을 원래 큐(`ready/` 등)로 `mv` 되돌리거나 삭제.
4. `_reason.md` 는 감사 로그용으로 남기거나 함께 삭제.

에이전트는 blocked 를 **스스로 다시 시도하지 않는다**.

## 2. 긴급 롤백

직전 developer 작업을 되돌리려면:
1. `specs/task/done/YYYY/MM/DD/{slug}/result.md` 의 `## 커밋` 섹션에서 해시 확인.
2. `git revert <hash>` 로 revert 커밋 생성.
3. 태스크 문서는 이동하지 않고, revert 사실만 동일 폴더 `result.md` 하단에 추가 기록.

`git reset --hard` 는 `RULE-02` §2.2 에 의해 금지. 반드시 `revert`.

## 3. 일시 정지

- 전체: `.claude/locks/pipeline.pause` 파일 생성.
- 특정 에이전트: `.claude/locks/<agent>.pause`.
- 해제: 해당 파일 삭제.
- 파일 내용은 무시 — 비워도 되고 사유 메모 넣어도 됨.

## 4. 임계치 override

`RULE-03` backpressure 기본값을 바꾸려면 `.claude/pipeline.json`:

```json
{
  "REQUIREMENTS_READY_MAX": 30,
  "GREEN_PENDING_MAX": 40,
  "TASK_READY_MAX": 20
}
```

파일 없으면 기본값 사용.
