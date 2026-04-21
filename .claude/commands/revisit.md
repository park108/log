---
description: specs/50.blocked/** 를 스캔해 blocked 항목을 분류(이미 해소 / 해소방안 있음 / 불분명)하고, followup 승격은 자동, 삭제는 승인 받아 처리한다.
---

# /revisit — blocked 큐 정리

50.blocked/ 에 쌓인 항목을 읽어 현재 파이프라인 상태와 대조하고 정리.

## 전제
- `specs/50.blocked/{req,spec,task}/**` 는 `.gitignore` 대상. 삭제 시 git 이력 없음 → **복구 불가**.
- 삭제는 사용자 승인 필수. followup 승격(원본 삭제 + followup 생성) 은 자동.

## 입력 스캔
1. `ls specs/50.blocked/{req,spec,task}/` 로 잔존 항목 목록화.
2. 각 항목마다 `{slug}_reason.md` 동반 여부 확인.
   - 없으면 스캔 결과에 `anomaly` 로 표시 (임의 행동 금지).

## 스킵 조건 (우선순위 순)
1. `.claude/locks/revisit.pause` 존재 → 전체 no-op.
2. 같은 폴더 `{slug}_keep.marker` 존재 → 해당 항목 건드리지 않음.

## 분류 (per item)

reason.md 를 완독하고 아래 순서로 판정.

### A. 이미 해소됨 (→ 삭제 후보)
판정 근거 (복수 조건):
- reason.md 의 `## 후속 필요 사항` / `## 참고` 에 지목된 REQ/TSK ID 가 `60.done/YYYY/MM/DD/{req,task}/**` 에 존재.
- 또는 지목된 spec 이 `30.spec/blue/` 로 승격됨.
- 또는 reason.md 의 재현 절차가 현재 코드 상태(`git log` · 관련 `src/**` 식별자 grep) 로 재현 불가.

### B. 해소방안 있음 (→ followup 자동 승격)
판정 근거:
- reason.md 에 `## 후속 필요 사항` / `## 제안` / `## 해소 방안` 중 1개 이상 존재 + actionable 내용.
- A 에 해당하지 않음 (대응 REQ 아직 없음).

### C. 해소방안 없음 / 불분명 (→ 보류 또는 삭제 후보)
- "flake 재현 실패", "외부 원인 해소", "중복 격리" 등 후속 무의미 명시.
- 또는 판정 근거 부족.

## 행동

### B 경로 — 자동 실행
1. `10.followups/{YYYYMMDD-HHMM}-{slug}-from-blocked.md` 생성.
   - frontmatter:
     ```yaml
     ---
     source_blocked: specs/50.blocked/{type}/{slug}.md
     category: blocked-revisit
     severity: {reason.md 의 원 severity 또는 medium 기본}
     observed_at: {ISO-8601 UTC}
     ---
     ```
   - 본문: reason.md 의 `## 관찰` / `## 재현` / `## 후속 필요 사항` 를 정리해 전달. 원 reason.md 의 구체 라인 번호·식별자 **박제 유지**.
2. `specs/50.blocked/{type}/{slug}.md` 및 `{slug}_reason.md` 삭제.
3. 세션 말미 보고에 `to-followup: [<slug>]` 기재.

### A / C 경로 — 승인 필요
1. 사용자에게 제시:
   ```
   <slug> — 분류: {A|C}
   근거: <1~2줄>
   제안: 삭제 + 감사노트 `60.done/YYYY/MM/DD/triage/<slug>.md` 1줄 사유
   ```
2. 승인 받은 항목만 실행:
   - 감사노트 생성 (경로: `specs/60.done/YYYY/MM/DD/triage/<slug>.md`, 내용: `- blocked reason 요약 1~2줄 + 삭제 근거 1줄`).
   - 원본 + reason.md 삭제.
3. 거부된 항목은 `skipped` 로 기록.

## 안전장치
- `rm` 은 단일 파일씩. `rm -rf` 금지 (RULE-02).
- B 경로의 followup 생성이 실패하면 blocked 원본 삭제하지 않음 (fail-safe).
- 의심되면 항상 스킵하고 보고에 `ambiguous: <slug>` 표기.

## 보고 (세션 말미 stdout, RULE-04 형식 준용)

```
## /triage @ <UTC ISO-8601>
- scanned: <n>
- to-followup: [<slug>, ...]        # B 자동 실행
- proposed-delete: [<slug>(A), ...] # 승인 대기 또는 승인 후 삭제
- skipped: [<slug> (<reason>), ...]
- anomaly: [<slug> (no reason.md)]  # reason 없는 격리물
- notes: <one-line>
```

## 커밋
- followup 은 gitignore → 커밋 대상 아님.
- 감사노트 (`60.done/.../triage/**`) 는 tracked → 세션 말미 단일 커밋:
  `chore(triage): {scanned=N, followup=K, deleted=M}`
- push 금지 (사용자 또는 developer 가 처리).