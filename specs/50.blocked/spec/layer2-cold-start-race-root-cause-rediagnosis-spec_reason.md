# Reason: isolated from 30.spec/blue/common/

> **Moved by**: 사용자 수동 개입 (RULE-05) on 2026-04-21
> **Original path**: `specs/30.spec/blue/common/layer2-cold-start-race-root-cause-rediagnosis-spec.md`

## 격리 근거
본 파일은 시스템의 지속 계약(invariant/contract) 이 아니라 **특정 flake 의 root cause 재탐색을 위한 1회성 조사 플랜**이다. §동작 전 항목이 조사 행위(FR-01 "관측 훅 부착해 타임라인 측정", FR-02 "차감 분석", FR-03 "fallback 순서 재평가") 로 구성되어 있어 회귀 테스트로 지킬 수 있는 계약이 부재.

자체 §역할 에도 "re-diagnosis 결과 박제 와 spec 수정 지침 확정 만 수행 — 실제 해소(patch) 는 별건 task 로 carve" 로 명시되어 있어, 본질은 task 성격이다.

## 후속 처리 제안 (/revisit 판정 예상)
- **close**: 재진단은 이미 TSK-20260421-55/57 등에서 진행됐고, shuffle race 계약은 `test-isolation-shuffle-safety-cold-start-spec.md` 에 흡수 완료. 본 파일을 `60.done/.../revisit/` 로 감사노트 후 정리.
- **revive (대안)**: 재진단이 아직 진행 중이라면 `10.followups/` 로 승격해 discovery 가 task 로 재등록.

## Scope 정화 배경
동일 성격의 "진단 spec" 2건과 함께 격리되어, spec 계층을 **component-scoped contract** 중심으로 재정비하는 선행 작업의 일부.
