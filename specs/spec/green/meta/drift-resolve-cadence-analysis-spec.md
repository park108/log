# 명세: planner green→blue 승격 "head 실제 반영 확인" 게이트 강화 진단 (drift-resolve 5회 누적 분석)

> **위치**:
> - `specs/spec/green/meta/drift-resolve-cadence-analysis-spec.md` (본 spec, SSoT)
> - 참조 규약: `.claude/agents/planner.md` (Cond-1 / Cond-2 green→blue 승격 조건), `.claude/agents/inspector.md` (head SHA 참조 섹션), `.claude/rules/RULE-01-PIPELINE.md` (§2 쓰기 권한 매트릭스 + §4 Immutable Handoff)
> - 참조 태스크: TSK-20260420-16 작업지시서 §9 L217 risk memo ("drift-resolve 5번째 인스턴스 … planner 규약 재검토 시그널")
> **유형**: Meta / Diagnostic (파이프라인 규약 분석)
> **최종 업데이트**: 2026-04-20 (by inspector, WIP — REQ-20260420-027 초기 반영)
> **상태**: Experimental (도입 전, 진단 전용)
> **관련 요구사항**:
> - `specs/requirements/ready/20260420-planner-blue-promotion-head-realization-gate.md` (REQ-20260420-027, 진단 전용)
> - drift-resolve 5건 (모두 done):
>   - `specs/requirements/done/2026/04/19/20260419-app-online-offline-rebind-bug-code-realization.md` (REQ-038 realization)
>   - `specs/requirements/done/2026/04/19/20260419-env-helper-functional-getter-code-realization.md` (REQ-034 realization)
>   - `specs/requirements/done/2026/04/19/20260419-cross-domain-msw-lifecycle-isolation-phase2-code-realization.md` (realization 류)
>   - `specs/requirements/done/2026/04/19/20260419-logitem-setitemclass-declarative-code-realization.md`
>   - `specs/requirements/done/2026/04/20/20260420-search-loadingdots-cleartimeout-code-realization.md` (REQ-004 realization)
> - followup 원전: `specs/followups/consumed/2026/04/20/20260420-0854-planner-drift-resolve-5th-instance-signal.md`

> 본 문서는 **진단 전용** — `.claude/agents/*.md` 또는 `.claude/rules/*.md` 의 실제 편집은 본 spec 범위 **밖**이며, 변경 필요 판정 시 별 REQ 로 carve.
> "단정 금지" 원칙: 현 설계가 **의도된 관용** 일 가능성을 기본 50% 가중치로 유지.

---

## 1. 역할 (Role & Responsibility)

최근 5 사이클에 걸쳐 "spec blue 로 승격됐으나 코드가 head 에 미반영" 상태를 해소하는 `*-code-realization` REQ 가 누적 발화된 패턴의 root-cause 를 **단정 없이** 분석하고, planner/inspector 규약 변경 **제안서** 를 작성한다.

- 주 책임:
  - 5 drift-resolve REQ 의 timeline (spec blue 승격 커밋 SHA → realization task 커밋 SHA → 소요일) 수집.
  - 가설 (a)/(b)/(c) 에 대해 양면 분석 (지지 근거 + 반례).
  - "규약 변경 carve 필요" / "의도된 설계 — no-change" 중 하나로 분기 결론 박제.
  - 변경 필요 판정 시 후속 REQ 스켈레톤 (파일명, 주제) 제안.
- 의도적으로 하지 않는 것:
  - `.claude/agents/planner.md` / `.claude/agents/inspector.md` / `.claude/rules/*.md` 실제 편집 — 별 REQ carve.
  - `src/**` 코드 수정 — 메타 규약 분석 범위 밖.
  - 6번째 drift-resolve 의 사후 처리 — 별 REQ (본 진단이 선행).
  - discovery 규약 주석 추가 (변경 필요 판정 시 별 REQ carve).

> 관련 요구사항: REQ-20260420-027 §3 (Goals, Phase A — 진단만)

---

## 2. 현재 상태 (As-Is)

### 2.1 planner 승격 조건 (현행)

- **Cond-1**: 모든 FR DoD 통과 (spec 문서 기준).
- **Cond-2**: green→blue diff 확정 (spec 문서 중심).
- head 실제 코드 반영은 developer 가 spec blue 승격 이후 별 task 로 처리.

### 2.2 drift-resolve 5건 누적 (2026-04-19 ~ 2026-04-20)

| # | 원 REQ | realization REQ (done) | realization 방향 |
|---|--------|----------------------|----------------------|
| 1 | REQ-038 (App online/offline useEffect) | `20260419-app-online-offline-rebind-bug-code-realization.md` | spec → code |
| 2 | REQ-034 (env helper functional getter) | `20260419-env-helper-functional-getter-code-realization.md` | spec → code |
| 3 | (cross-domain MSW Phase 2) | `20260419-cross-domain-msw-lifecycle-isolation-phase2-code-realization.md` | spec → code |
| 4 | (LogItem setItemClass declarative) | `20260419-logitem-setitemclass-declarative-code-realization.md` | spec → code |
| 5 | REQ-004 (search loadingDots cleartimeout) | `20260420-search-loadingdots-cleartimeout-code-realization.md` | spec → code |

> (유사 범주 — `20260419-react-version-spec-jest-dom-v6-baseline-sync.md` jest-dom v6 선행 baseline sync)

### 2.3 시그널 품질

- 5회 누적은 **단순 랜덤 재발**으로 설명하기 어려운 cadence.
- 단, 동일 기간 drift-free 로 수렴한 사례 (e.g. React 19 render 토글 TSK-20260420-19, CSS modules §10 시리즈) 존재 → **root-cause 편향 검증 필수**.

---

## 3. 진단 정책

> 관련 요구사항: REQ-20260420-027 FR-01 ~ FR-05

### 3.1 가설 3종 (양면 분석)

- **가설 (a) — inspector 미발행**: inspector 가 spec 작성 시 head SHA 를 참조하지만 spec→code 전환 task 발행을 누락.
- **가설 (b) — planner 승격 기준 gap**: planner 가 green→blue 승격을 "task 완료" 와 무관하게 spec diff 기준으로 수행 → 코드 미반영 상태로 승격 가능.
- **가설 (c) — 의도된 설계 관용**: developer task 가 spec 범위 밖이라 realization 작업이 별 REQ 로 분기되는 것은 **설계 의도 일치** (승격/realization 분리 원칙).

### 3.2 FR-01 Timeline 수집 (Must)

- 5 drift-resolve REQ 각각에 대해:
  - spec blue 승격 커밋 SHA (planner `spec: promote ... green→blue` 커밋).
  - realization task 커밋 SHA (developer task/done/**/result.md §커밋 필드).
  - 날짜 delta (승격 → realization) 일 단위.
- 수집 방법: `git log --oneline --grep "promote"` + task result.md `grep -rn "커밋"`.
- 재현성: 인용된 커밋 SHA 박제 (NFR-03). 복원 불가 건은 "N/A" 명시.

### 3.3 FR-02 Root-cause 가설 검증 (Must)

- 각 가설 (a)/(b)/(c) 에 대해:
  - **지지 근거**: timeline 데이터에서 해당 가설을 지지하는 인스턴스 수 / 패턴.
  - **반례**: 해당 가설로 설명 불가한 인스턴스.
- 가장 많이 설명하는 가설을 "주 가설" 로 선정, 단 50% 이하 설명력이면 "복합 원인" 결론.

### 3.4 FR-03 변경 제안서 작성 (Must)

- `.claude/agents/planner.md` 또는 `.claude/agents/inspector.md` 의 어느 섹션에 어떤 게이트를 추가할지 **diff 제안**.
- 비채택 판정도 포함 가능 (= "diff 0 라인, 사유").
- 제안서 diff 는 ≤ 30줄 (NFR 성공 지표 §11).
- 구체적 문구 예시:
  - planner Cond-3 추가: "realization task 가 spec blue 승격 전에 task/done/ 에 존재" — 강한 게이트.
  - inspector 의무 확장: "spec 작성 시 realization task 동시 발행" — 약한 게이트.
  - 또는 "no-change" 결론 + discovery 에 "drift-resolve 는 정상 path" 박제 제안.

### 3.5 FR-04 분기 결론 (Must)

- "규약 변경 carve 필요" **vs** "의도된 설계 — no-change" **vs** "복합 원인 — 부분 carve" 중 하나로 명시.
- 편향 방지 (NFR-02): 의도된 설계 가능성을 기본 50% 가중치로 유지. 양면 분석을 통해 가중치 재조정.

### 3.6 FR-05 후속 REQ 스켈레톤 (Should)

- 변경 필요 판정 시 후속 REQ 제목/파일명 스켈레톤 박제.
- 예시:
  - `specs/requirements/ready/YYYYMMDD-planner-cond3-realization-task-gate.md` — planner Cond-3 추가.
  - `specs/requirements/ready/YYYYMMDD-inspector-spec-realization-task-pairing.md` — inspector 발행 의무 확장.
  - `specs/requirements/ready/YYYYMMDD-discovery-drift-resolve-noise-filter.md` — discovery 집계 생략 (의도된 설계 판정 시).

---

## 4. 의존성

### 4.1 상류 의존
- 5 drift-resolve REQ (§2.2, 모두 done).
- followup `20260420-0854-planner-drift-resolve-5th-instance-signal.md`.
- TSK-20260420-16 §9 L217 risk memo.

### 4.2 하류 영향
- 변경 필요 판정 시 별 REQ (planner/inspector 규약 편집 carve).
- 의도된 설계 판정 시 discovery 규약 주석 REQ (별 carve, optional).

### 4.3 인접 spec
- 없음 (meta 카테고리 단독).

---

## 5. 수용 기준 (Acceptance)

### 5.1 REQ-20260420-027 수용 기준

> 관련 요구사항: REQ-20260420-027 §10

- [ ] FR-01 구현 — 5 REQ timeline 표 (spec blue 승격 SHA / realization task SHA / delta) 박제.
- [ ] FR-02 구현 — 가설 (a)/(b)/(c) 각각 지지 근거 + 반례 1건 이상.
- [ ] FR-03 구현 — 변경 제안서 (diff ≤ 30줄 또는 "no-change + 사유").
- [ ] FR-04 구현 — "변경 필요" / "의도된 설계" / "복합 원인" 중 하나 명시.
- [ ] FR-05 구현 — 변경 필요 판정 시 후속 REQ 스켈레톤 (파일명, 주제).
- [ ] 진단 문서 산출물 1건 (본 spec 에 §6 분석 결과 섹션 추가 **또는** 별 아티팩트 `docs/meta/drift-resolve-cadence-analysis.md`).

### 5.2 NFR 박제 (REQ §7)

- [ ] NFR-01 분석 품질: 3 가설 모두 양면 분석 박제 완료.
- [ ] NFR-02 편향 방지: "의도된 설계" 가능성 50% 기본 가중치 유지 — 양면 분석 없이 단정 결론 금지.
- [ ] NFR-03 재현성: 인용된 커밋 SHA 모두 `git show <SHA>` 재현 가능.

### 5.3 grep 회귀 차단 (optional)

- `grep -rn "drift-resolve-cadence-analysis" specs/` ≥ 1 (본 spec).
- 6번째 drift-resolve 발화 감지 시 discovery 가 본 spec 을 참조하도록 링크 유지.

---

## 6. 진단 결과 (TBD — Phase A 진단 task 머지 후 박제)

> 본 섹션은 developer 가 진단 task 수행 후 결과를 박제하는 자리. 현 WIP 시점에는 공란.

- Timeline 표: _pending_
- 가설 (a) 지지/반례: _pending_
- 가설 (b) 지지/반례: _pending_
- 가설 (c) 지지/반례: _pending_
- 주 가설 (또는 복합 원인): _pending_
- 변경 제안서 diff: _pending_
- 최종 분기: _pending_ (변경 필요 / 의도된 설계 / 복합 원인)
- 후속 REQ 스켈레톤: _pending_

---

## 7. 알려진 제약 / 이슈

- 과잉 게이트 도입 시 파이프라인 정체 위험 (High 영향) — 완화: FR-04 에 "no-change" 경로 유지.
- 진단이 단정 결론으로 치우칠 위험 (Med) — NFR-02 양면 분석 강제.
- 5 REQ 중 일부 timeline 복원 불가 가능성 (task/done 아카이브 누락, Low) — "N/A" 박제.
- 6번째 drift-resolve 가 본 진단 전 발화될 가능성 — §13 미결. 본 spec 은 "5건 기준" 유지하고, 6번째 발화 시 진단 본문에 row 추가로 통합 가능 (rewrite 아님 — append).

---

## 8. 변경 이력

| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-20 | (pending, REQ-20260420-027) | 본 spec 초안 신설 — drift-resolve 5회 누적 시그널 진단 전용 블루프린트 (WIP) | all |

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/ready/20260420-planner-blue-promotion-head-realization-gate.md`
- 5 drift-resolve done REQ (§2.2 표 참조)
- 규약 참조: `.claude/agents/planner.md`, `.claude/agents/inspector.md`, `.claude/rules/RULE-01-PIPELINE.md`
- followup 원전: `specs/followups/consumed/2026/04/20/20260420-0854-planner-drift-resolve-5th-instance-signal.md`
- Risk memo: TSK-20260420-16 §9 L217
