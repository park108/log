# Reason: isolated from 30.spec/blue/common/

> **Moved by**: 사용자 수동 개입 (RULE-05) on 2026-04-21
> **Original path**: `specs/30.spec/blue/common/logsingle-prod-server-serial-timeout-diagnosis-spec.md`

## 격리 근거
본 파일은 `src/Log/LogSingle.test.jsx:56` flake 의 **관측·결정론화 플랜** 으로, §동작 (FR-01 "10회 serial run 실측 실패율 수치화", FR-02 "handler 경로 확인", FR-03 "전역 상태 차감 분석", FR-04 "최소 침습 patch 제안") 이 전부 1회성 조사·제안 행위다. 시스템 불변식이 아니므로 spec 계층이 아닌 task/followup 계층 소속이 맞다.

## 후속 처리 제안 (/revisit 판정 예상)
- **close**: 쌍 파일 `logsingle-prod-server-serial-timeout-remediation-spec.md` 에서 TSK-20260421-58 baseline 실측 (10회 중 1회, 10%) 과 it-scoped `{ timeout: 10000 }` override 경로까지 확정되었고, 관련 후속 task 도 발행된 상태. 감사노트 후 정리.
- **revive (대안)**: LogSingle 의 cold-start 허용 예산이 지속 계약으로 필요하면 `components/log-spec.md` 에 1~2줄 "alternate timeout budget" 로 응축.

## Scope 정화 배경
spec 계층을 **component-scoped contract** 중심으로 재정비하는 선행 작업의 일부. 동일 성격의 diagnosis/remediation 3건 중 1건.
