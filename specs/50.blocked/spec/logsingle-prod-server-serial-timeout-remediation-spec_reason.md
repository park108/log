# Reason: isolated from 30.spec/green/common/

> **Moved by**: 사용자 수동 개입 (RULE-05) on 2026-04-21
> **Original path**: `specs/30.spec/green/common/logsingle-prod-server-serial-timeout-remediation-spec.md`

## 격리 근거
위 diagnosis spec 의 쌍으로, §역할 이 "flake 를 해소한다" + "it-scoped `{ timeout: 10000 }` override 를 1차 경로로 채택하고 fallback (B)(C) 를 박제" 로 명시되어 있다. **특정 test 파일에 대한 remediation plan** 이며, 완료 후 유지되는 불변식은 "LogSingle prod render 는 cold-start 에서 10s 예산을 넘지 않는다" 정도로 한 줄 응축 가능.

## 후속 처리 제안 (/revisit 판정 예상)
- **close + condense**: remediation 이 구현된 후에는 결과(적용된 timeout override 위치) 만 `components/log-spec.md` 의 해당 test 섹션에 "alternate timeout budget" invariant 로 1줄 응축. 본 파일은 감사노트 후 정리.
- **revive (대안)**: 아직 remediation 이 적용되지 않았다면 `10.followups/` 승격 후 discovery 가 task 로 재등록.

## Scope 정화 배경
diagnosis (격리됨) 와 함께 한 쌍으로 다뤄야 일관성 유지. spec 계층을 **component-scoped contract** 중심으로 재정비하는 선행 작업의 일부.
