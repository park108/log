# RULE-05 수동 개입

> 적용: 사람 운영자. 에이전트는 blocked 를 재시도하지 않는다.

## Blocked 해제
정식 경로: **`blocked → 10.followups/ → discovery → ...`**. 원 큐(`20.req/` / `40.task/` / `30.spec/**`)로 `mv` 원복 금지 (writer 경계).

`/revisit` 스킬이 `{slug}_reason.md` 로 판정:
- **revive**: `10.followups/` 로 승격 후 원본+reason 삭제.
- **close**: `60.done/YYYY/MM/DD/revisit/{slug}.md` 1~2줄 감사노트 후 원본+reason 삭제 (승인 필요).

`{slug}.md` / `_reason.md` 는 동일 세션 삭제 (잔존 금지).

## 긴급 롤백
`result.md` 에서 커밋 해시 확인 → `git revert <hash>` → revert 사실을 `result.md` 하단 append. task 문서 이동 금지. `git reset --hard` 금지 — 반드시 `revert` (RULE-02).

## 결함 신고 (사람 → 파이프라인)

운영자가 관측한 제품 결함은 `specs/10.followups/{YYYYMMDD-HHMM}-{slug}.md` 로 직접 투입한다 (RULE-01 operator 행). discovery 가 다음 tick 에 소비한다.

필수 기재: **재현 절차**, **관측된 동작**, **기대 동작**, 관측 로그·스크린샷 경로. 파일:라인 추정은 선택.

> 이 입구가 없던 기간 동안 제품 신호의 유일한 공급원은 `developer → followups` 였고, developer 가 굶자 그 공급이 끊겨 discovery 는 설정·토큰 정합 req 만 재배했다. 실제 사용자 결함은 전부 파이프라인 밖에서 회수됐다.

## 일시 정지
- 전체: `.claude/locks/pipeline.pause` 생성.
- 특정 에이전트: `.claude/locks/<agent>.pause`.
- 해제: 파일 삭제 (내용 무시).

### 자가 생성 lock (RULE-03 §정체 감지)
에이전트는 `stall-<agent>` / `<agent>.pause` / `pipeline.pause` 를 **자가 생성할 수 있다**. **삭제는 운영자 전용** — 에이전트가 자기 lock 을 지우면 fail-stop 이 무의미해진다.

해제 전 `specs/50.blocked/pipeline/*_reason.md` 를 읽고 정체 원인을 판정한다.

## 임계치 override
`.claude/pipeline.json`:
```json
{"REQUIREMENTS_READY_MAX": 30, "GREEN_PENDING_MAX": 40, "TASK_READY_MAX": 20}
```
파일 없으면 기본값.