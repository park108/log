# RULE-05 수동 개입

> 적용: 사람 운영자. 에이전트는 blocked 를 재시도하지 않는다.

## Blocked 해제

정식 경로: **`blocked → 10.followups/ → discovery → ...`**. 원 큐(`20.req/` / `40.task/` / `30.spec/**`)로 `mv` 원복 금지 (writer 경계).

`/revisit` 스킬이 `{slug}_reason.md` 로 판정:
- **revive**: `10.followups/` 로 승격 후 원본+reason 삭제.
- **close**: `60.done/YYYY/MM/DD/revisit/{slug}.md` 1~2줄 감사노트 후 원본+reason 삭제 (승인 필요).

잔존 금지 — `{slug}.md` / `_reason.md` 는 동일 세션에 삭제.

## 긴급 롤백
1. `specs/60.done/YYYY/MM/DD/task/{slug}/result.md` 에서 커밋 해시 확인.
2. `git revert <hash>` 로 revert 커밋 생성.
3. task 문서는 이동하지 않고, revert 사실을 `result.md` 하단에 append.

`git reset --hard` 금지 (RULE-02). 반드시 `revert`.

## 일시 정지
- 전체: `.claude/locks/pipeline.pause` 생성.
- 특정 에이전트: `.claude/locks/<agent>.pause`.
- 해제: 파일 삭제. 내용은 무시.

## 임계치 override
`.claude/pipeline.json`:
```json
{"REQUIREMENTS_READY_MAX": 30, "GREEN_PENDING_MAX": 40, "TASK_READY_MAX": 20}
```
파일 없으면 기본값.
