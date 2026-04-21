# Blocked reason — foundation/ci.md

> **격리 일자**: 2026-04-21 (by planner, 19th cycle)
> **원 경로**: `specs/30.spec/green/foundation/ci.md`
> **이동 경로**: `specs/50.blocked/spec/foundation/ci.md`
> **stale 누적**: 3 cycles (17th/18th/19th — planner 사이클 기준).

## 판정 요지

green spec 4조건 중 **unchecked=0 조건** 미충족. `§테스트 현황` line 48:

```
- [ ] (수동) Node LTS 상향 주기 시점 engine 호환성 확인 (별 task 대상).
```

이 항목이 17·18·19 차 planner 사이클 3회 연속 동일 해시 (`626e1330c6535a7b2fe3b493e377298b39ae3d78ad5140850d3c8de5ea7ea74f`) 로 정체되어 승격 불가.

## 격리 근거 (RULE-07 적용)

- "Node LTS 상향 주기 시점 engine 호환성 확인" 은 **시점 의존·운영자 판단 의존** 작업. `package.json` `engines.node` vs GitHub Actions `setup-node` 주입 버전 정합성은 **Node.js 재단 릴리스 캘린더** (짝수 메이저의 Active LTS 지정 시점) 에 종속되며, spec 본문 불변식 "LTS 최신 정책" (§동작 2절) 은 이미 박제되어 있어 **추가 inspector 개입 여지 없음**.
- 남은 unchecked 1행은 **운영 runbook 영역** (정기 점검 task) 으로, spec (`30.spec/**`) 에 잔존시키면 3조건 (unchecked=0) 이 영구 미충족 → 승격 불가 상태 지속.
- 현행 구현 (Node 24 사용; Odd 메이저 → LTS 아님) 과 spec 불변식 ("LTS 최신") 간 **정합성 판정** 자체도 운영자 책임으로, planner 가 carve 로 흡수하면 "구체 Node 메이저 숫자" 를 task 에 박제하게 되어 RULE-07 의 "구체 메이저 숫자 박제 금지 정책" (ci.md §역할 3줄) 과 충돌.

## 후속 경로 (RULE-05)

운영자 `/revisit` 스킬 판정:

- **revive**: 본 reason 파일을 근거로 `specs/10.followups/20260421-<HHMM>-ci-node-lts-cadence-runbook-from-blocked.md` 로 승격 → 차기 discovery 세션이 "Node LTS 점검 runbook 분리 req" 로 번역 (spec 본문 불변식 유지 + 운영 runbook 은 별도 artifact — `docs/runbook/` 또는 README 섹션 — 으로 분리 제안).
- **close**: 운영자가 "불변식 자체는 유지하고 unchecked marker 를 제거 (inspector 가 green 재발행) + runbook 은 별도 레포 외부 tracker 에서 관리" 로 판단하면 `60.done/2026/04/21/revisit/ci.md` 감사노트 1~2줄 후 본 파일 + ci.md 삭제.

## 복원 안내

planner 는 직접 원복 금지 (writer 경계). 반드시 RULE-05 경로 (blocked → 10.followups/ → discovery → ...) 로 재진입. `ci.md` 본문은 본 파일과 동일 디렉터리에 보존됨 — 내용 변경 금지 상태 유지.

## 보존 지표

- ci.md 본문 해시 (이동 시점 snapshot): `626e1330c6535a7b2fe3b493e377298b39ae3d78ad5140850d3c8de5ea7ea74f`.
- 본문 내 불변식 3건 (REQ-023 FR-01 계열) 은 **spec-grade** 로 여전히 유효하므로 운영자가 revive 결정 시 inspector 가 §테스트 현황 unchecked 1행만 제거한 판본으로 재발행하면 즉시 승격 가능.
- 관련 선행 done req 보존: `specs/60.done/2026/04/21/req/20260421-ci-foundation-spec-ltsnode-floating-tag.md`.

## RULE 참조

- RULE-01: planner writer `30.spec/** → 50.blocked/spec/` 이동 권한 정합.
- RULE-05: blocked 해제 경로 강제 (writer 경계 보존).
- RULE-07: 본 spec 본문은 불변식 한정 (OK). 본 격리는 **운영 runbook 항목의 spec 본문 잔존** 을 해소하기 위한 메커니즘.
