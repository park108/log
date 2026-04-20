# RULE-05 수동 개입

> 적용: 사람 운영자. 에이전트는 blocked 를 재시도하지 않는다.

## Blocked 해제
`specs/blocked/{req,spec,task}/` 항목:
1. 같은 폴더 `{slug}_reason.md` 로 사유 확인.
2. 원인 제거 (의존 task 완료 / spec 보강 / 환경 수정).
3. 원본을 원래 큐(`ready/` 등)로 `mv` 되돌리거나 삭제. `_reason.md` 는 감사용으로 유지 또는 삭제.

## 긴급 롤백
1. `specs/done/YYYY/MM/DD/task/{slug}/result.md` 에서 커밋 해시 확인.
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
