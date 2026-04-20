# toaster-conditional-mount-or-helper-spec — blocked reason

- **이동 일자(UTC)**: 2026-04-21
- **mover**: planner
- **source**: `specs/30.spec/green/components/toaster-conditional-mount-or-helper-spec.md`
- **current hash (sha256)**: `23bfc9260ee53be3135e18f2826876ab761b28db2a7ad37ee3a7696d62aa6ba5`
- **stale cycles**: 3 (ledger 기준 1 → 2 → 3 연속 hash 불변)

## 원인
4조건 승격 (`[WIP]`=0, unchecked=0, To-Be=0, 변경 이력 TSK/커밋 박제) 중 **unchecked 2건이 미해소**:

- `L97`  `- [ ] FR-09 shuffle seed {1,2,3} 0 fail. — *… TSK-20260421-49 범위로 이관.*`
- `L107` `- [ ] (Must) FR-09 — ... shuffle … TSK-20260421-49 범위로 이관.`

두 줄 모두 이관 사유를 **인라인 서술**로만 적었고 RULE 관용 토큰 `[deferred: TSK-...]` 이 박제되어 있지 않아 `[deferred]` 제외 정책이 적용되지 않는다. ledger 3 사이클 연속 hash 불변 → RULE-01/RULE-03 관점에서 "정체" 판정.

의존 태스크 `TSK-20260421-49` 는 `50.blocked/task/` 격리 상태 (Layer 2 mutation race 미해소, RULE-05 운영자 관할). 즉 spec 자체 진행 불가 + 실측 경로 차단.

## 해제 경로 (RULE-05 운영자)
다음 둘 중 하나를 수행 후 본 파일과 spec 을 `30.spec/green/components/` 로 되돌린다.

1. **`[deferred]` 토큰 박제** (가장 가벼운 경로): inspector 가 L97/L107 의 인라인 서술을 `**[deferred: TSK-20260421-49 blocked — Layer 2 race 미해소; 50.blocked/task/TSK-20260421-49 _reason.md 참조]**` 형식으로 교체. 4조건 즉시 충족 → 차기 planner 사이클이 `30.spec/blue/components/` 로 승격.
2. **TSK-49 해소**: 운영자가 shuffle spec 재개정(Layer 2 서사) + TSK-49 blocked 해제. developer 가 shuffle seed {1,2,3} 0 fail 박제 후 inspector 가 FR-09 2건을 `[x]` 로 전환. 4조건 충족 → 승격.

해제 후 본 `_reason.md` 파일은 삭제 (RULE-05 §잔존 금지). 감사 기록이 필요하면 spec `## 변경 이력` 에 1~2줄 남긴다.

## 부가 메모
- 본 이동은 **spec 작성 품질 문제가 아니라 외부 의존(TSK-49)** 에 의한 정체. spec 본문(FR-01~08, NFR-02, NFR-04)은 TSK-48 에서 ack 완료 — 즉 "FR-09 + 그 의존" 만 열려 있다.
- 재carve 금지 (TSK-49 는 RULE-05 관할).
