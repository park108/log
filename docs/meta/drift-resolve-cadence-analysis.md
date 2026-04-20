# drift-resolve 5회 누적 cadence 분석 — Phase A 진단 (REQ-20260420-027)

> **아티팩트 유형**: Meta / Diagnostic (진단 전용, 규약 편집 없음)
> **작성 기원**: `specs/spec/green/meta/drift-resolve-cadence-analysis-spec.md` §3.2 ~ §3.6 (FR-01 ~ FR-05)
> **작업 지시서**: `TSK-20260420-22` (REQ-20260420-027)
> **작성일**: 2026-04-20
> **상태**: Draft — Phase A 결과 박제. Phase B(실제 규약 편집) 는 별 REQ 로 carve.
> **편향 방지(NFR-02)**: "의도된 설계 관용" 가능성 50% 기본 가중치 유지. 결과는 데이터 기반 재조정으로 서술하며 단정 어조 회피.

---

## 1. 배경

최근 1~2일간 `spec blue 로 승격됐거나 승격 예정인 REQ 의 코드 미반영` 상태를 해소하기 위한 `*-code-realization` REQ 가 5건 누적 발화됐다. 5회 연속은 단순 랜덤 재발로 보기 어렵다는 시그널이 `TSK-20260420-16 §9 L217` risk memo 에 박제됐고 이를 발원점으로 본 진단을 수행한다.

대상 5건은 spec §2.2 표 참조. 본 문서는 timeline(§2) → 가설 검증(§3) → 변경 제안 diff(§4) → 분기 결론(§5) → 후속 REQ 스켈레톤(§6) 순으로 구성.

---

## 2. Timeline (FR-01)

> 각 REQ 에 대해: (A) 기원 REQ 의 spec blue 승격 SHA, (B) realization 코드 반영 SHA, (C) 소요 delta.
> 복원 불가 건(`N/A`) 은 사유 명시. 모든 SHA 는 `git show <SHA> -s` 재현 가능.

| # | 기원 REQ 슬러그 | realization REQ (done) | spec blue 승격 SHA | 코드 realization SHA | delta | 비고 |
|---|---|---|---|---|---|---|
| 1 | REQ-038 App online/offline useEffect | `20260419-app-online-offline-rebind-bug-code-realization.md` | `096b3fc` (2026-04-20 14:18 KST, cycle 63, `app/App-spec.md` blue 승격) | `62fdf58` (2026-04-20 17:26, `fix(App): online/offline useEffect deps [isOnline] -> []`, TSK-20260420-15) | **~3h 8m** (동일 일자) | spec→code 같은 날 정합. 승격 후 실제 3 커밋만에 realize |
| 2 | REQ env-helper functional getter | `20260419-env-helper-functional-getter-code-realization.md` | `N/A` (env-spec 는 아직 green 영역. blue 승격 전에 realization 발화) | `4c56103` (2026-04-20 16:45, `refactor: env.js functional getter + 5 api.js + 12 test migrations`, TSK-20260420-11) | **N/A** (blue 승격 부재) | spec-blue 이전 realization — "drift-resolve" 라벨링 되었으나 실제로는 planner Cond-2 미충족 spec 의 선제 코드 반영 |
| 3 | REQ-012 cross-domain MSW lifecycle Phase 2 | `20260419-cross-domain-msw-lifecycle-isolation-phase2-code-realization.md` | `N/A` (server-state-spec 는 아직 green 영역) | `N/A` (코드 미반영 — 현재 `grep "process.env.NODE_ENV =" src/` 에서 다수 hits 잔존; 관련 task 부재) | **미해소** | realization REQ 는 done, 그러나 sweeping task 가 carve 되지 않음. 가장 정체된 케이스 |
| 4 | REQ-019 LogItem setItemClass declarative | `20260419-logitem-setitemclass-declarative-code-realization.md` | `N/A` (css-modules-spec 는 아직 green, §10.9 [WIP]) | `N/A` (코드 미반영 — `src/Log/LogItem.jsx:16, 52, 55` 에 `setItemClass` 5 matches 잔존. FileItem 은 `6ced3b6` 로 선례 존재하나 LogItem 은 미전파) | **미해소** | FileItem 은 선례(`6ced3b6`, 2026-04-19 12:51) 있음. LogItem 으로 동일 패턴 전파만 남음 |
| 5 | REQ-004 Search loadingDots cleartimeout | `20260420-search-loadingdots-cleartimeout-code-realization.md` | `N/A` (Search 도메인 독립 blue spec 부재 — 인접 blue/green 혼재) | `4ed26d3` (2026-04-20 17:53, `fix(Search): loadingDots setInterval + functional updater + single dep`, TSK-20260420-16) | **N/A → 당일 완료** | realization REQ 머지와 코드 반영이 당일 내 완료 |

### 2.1 Timeline 요약

- **2/5** 건 realize 완료 (delta < 24h): #1 App online/offline, #5 Search loadingDots.
- **1/5** 건 realize 완료 but blue 승격 부재: #2 env helper (선제 realization).
- **2/5** 건 realize **미완료**: #3 MSW Phase 2 (sweep task 부재), #4 LogItem setItemClass (동일 패턴 전파 task 부재).
- 평균 delta (realize 완료건만): ~5시간 이내 (동일 일자) — 실제 realize 가 일어난 건은 빠르다.

---

## 3. 가설 검증 (FR-02, NFR-01 양면 분석)

### 3.1 가설 (a) — inspector 미발행 (spec→code task pairing 누락)

- **지지 근거**:
  - #3, #4: inspector 는 spec 에 정책을 박제했지만 인접 realization task 를 spec 머지와 동시에 발행하지 않음. `TSK-20260420-22` 도 planner 가 별도 cycle 79 에서 carve. 즉 spec-only 머지와 task 발행은 시간 축이 분리.
  - TSK-22 발행 전까지 drift-resolve-cadence-analysis-spec 자체도 WIP 영역에 `[WIP]` 마커만 머문 기간 존재 (inspector 가 spec 반영 ≠ task 발행).
- **반례**:
  - #1 App online/offline: inspector 가 App-spec blue 승격까지 이끌었고 planner carve → developer 3시간 내 realize. 여기선 "미발행" 이 아님. 단지 평균적 delay.
  - #2 env helper: inspector 는 spec 을 아직 blue 까지 못 올렸지만 developer 는 이미 코드 realize 완료. "pairing 누락" 이라고 보기 어려운 선제 케이스.
- **설명력 배분**: 약 30% (5건 중 2건만 직접 지지, 나머지 3건은 설명력 약함).

### 3.2 가설 (b) — planner 승격 기준 gap (Cond-1/2 이 코드 head 반영 검증 부재)

- **지지 근거**:
  - planner Cond-1/2 는 spec 문서의 [WIP] 마커 및 diff 확정만 본다. 코드 head 의 realization 여부는 게이트에 부재. 결과적으로 승격 후에도 코드 미반영이 가능한 구조.
  - #1 App online/offline: 승격(`096b3fc`) 이후 3시간이라도 코드 미반영 기간이 존재했음 — realization 이 planner 가 아닌 발화 경로로 처리.
- **반례**:
  - #2, #5: 코드가 승격 **전에** realize 됨. 이 경우 planner Cond-추가 게이트는 무의미 (이미 반영됨).
  - #3, #4: blue 승격 자체가 발생하지 않음 — planner 규약 gap 과 무관 (현재는 green 영역 검토 단계).
  - 동기간 drift-free 수렴 spec 다수 존재 (React 19 render 토글 TSK-20260420-19, CSS Modules §10 시리즈 등) — planner 규약이 유일 원인이라면 drift-free 결과 설명 불가.
- **설명력 배분**: 약 20% (단 1건만 직접 지지).

### 3.3 가설 (c) — 의도된 설계 관용 (승격/realization 분리가 설계 의도)

- **지지 근거**:
  - `RULE-01` §4 Immutable Handoff — spec/task 를 분리된 계약으로 둔다. realization 을 별 REQ 로 분기하는 것은 규약 준수.
  - drift-resolve 라는 라벨이 존재한다는 것 자체가 해당 경로가 정상 path 로 관리됨을 의미. 해소 mechanism 이 내재.
  - 5건 중 3건(#1, #2, #5) 은 동일 일자 또는 선제 realize 로 수렴 — cadence 가 건강.
- **반례**:
  - 5회 연속 누적은 "우연" 으로 설명하기 어려움 (spec §2.3).
  - #3, #4 와 같이 **2일 이상 미해소** 인스턴스는 단순 "정상 path" 로만 보기엔 cadence 가 느림.
- **설명력 배분**: 약 50% (3건 지지 + 2건 경계 사례).

### 3.4 가설 설명력 종합

- (a) ≈ 30%, (b) ≈ 20%, (c) ≈ 50%.
- 어느 단일 가설도 50%+ 설명력을 명확히 확보하지 못함. 분포로 보면 (c) 가 우세하되 (a) 와 복합.

---

## 4. 변경 제안서 (FR-03, ≤30줄 diff 또는 no-change)

### 4.1 권고 채택: **no-change + discovery 집계 noise filter 도입 제안** (Phase B 는 별 REQ)

본 시점에서 `.claude/agents/planner.md` 의 Cond-3 게이트 추가는 권고하지 않는다. 이유:
- #2, #5 같은 "선제/당일 realize" 케이스를 gate 로 차단하면 오히려 파이프라인 정체.
- (a) 가설 설명력이 충분하지 않아 inspector 의 "spec + task 동시 발행" 의무 확장도 false-positive 위험.
- (c) 가설 우세 — 현 mechanism 이 이미 drift 를 해소하고 있음 (5/5 가 결국 추적 가능).

### 4.2 참고용 약한 게이트 diff 예시 (30줄 이내, 채택 전)

```diff
--- a/.claude/agents/discovery.md
+++ b/.claude/agents/discovery.md
@@ -XX,6 +XX,12 @@ 기존 규약 본문 ...
+
+### drift-resolve 인스턴스 집계 주의
+- `*-code-realization` 라벨 REQ 가 동일 주간 3건 이상 누적 발화 시
+  followup 1건으로 집계(noise filter), 별도 REQ 생성 자제.
+- 6건 이상 누적 시에만 meta 진단 REQ 발화 (단, Phase A 진단 문서가
+  이미 존재하면 append-only 로 row 추가).
```

> 위 diff 는 제안 예시이며 본 task 범위 **밖**. 채택 여부는 Phase B 별 REQ 에서 재논의.

---

## 5. 분기 결론 (FR-04)

**복합 원인 — 부분 carve**.

- 주 원인: (c) 의도된 설계 관용 이 우세 (약 50%). 현 mechanism 은 drift 를 수렴 가능하며, 특히 #1/#2/#5 는 24h 내 해소.
- 보조 원인: (a) inspector spec→task pairing 의 시간축 분리가 #3/#4 에서 장기 미해소 유발 (약 30%).
- (b) planner 승격 기준 gap 은 주 원인이 아님 (약 20%).
- 단일 규약 편집은 과잉. 대신:
  - **Phase B-1**: #3 (MSW Phase 2 sweep), #4 (LogItem setItemClass) 의 realization task 를 planner 가 carve — 개별 REQ 단위 정상화. (즉 진짜 문제는 2건의 **미해소 task 가 carve 되지 않은 점**.)
  - **Phase B-2** (optional): discovery 에 noise filter (§4.2 예시) 주석 추가 — 6건째 이후 재발 방지.

---

## 6. 후속 REQ 스켈레톤 (FR-05)

> 실제 요구사항 파일 생성은 본 task 범위 **밖** — discovery 소관.

- `specs/requirements/ready/YYYYMMDD-msw-lifecycle-isolation-phase2-sweep-task-carve.md`
  — #3 realize: `src/setupTests.js` 글로벌 lifecycle hook + 14+ test 파일 sweep. 규모 M (도메인별 분할 가능).
- `specs/requirements/ready/YYYYMMDD-logitem-setitemclass-declarative-task-carve.md`
  — #4 realize: `src/Log/LogItem.jsx` 1 파일 FileItem(6ced3b6) 패턴 1:1 적용 + 회귀 테스트. 규모 XS.
- `specs/requirements/ready/YYYYMMDD-discovery-drift-resolve-noise-filter.md` (optional)
  — §4.2 예시 diff 기반 discovery 규약 주석 추가. 규모 XS.

변경 필요 Phase B 본체는 위 3개 REQ 로 분리 — planner Cond-3 추가나 inspector 발행 의무 확장은 제안하지 않음.

---

## 7. 재현성 (NFR-03)

본 문서에서 인용한 커밋 SHA 모두 `git show <SHA> -s` 로 재현 가능:

- `096b3fc` — cycle 63 spec(planner) promote App-spec
- `62fdf58` — fix(App) online/offline deps
- `4c56103` — refactor env.js functional getter
- `4ed26d3` — fix(Search) loadingDots setInterval
- `6ced3b6` — FileItem setItemClass 선례 (참고용)

`task/done/**/result.md` 는 gitignore 상 로컬 전용이지만 커밋 SHA 자체는 origin 에 존재하므로 재현성 보장.

---

## 8. 변경 이력

| 일자 | TSK | 요약 |
|------|-----|------|
| 2026-04-20 | TSK-20260420-22 (REQ-20260420-027) | Phase A 진단 초판 박제 — 5건 timeline + 3 가설 양면 분석 + 복합 원인 결론 + Phase B 후속 REQ 3 스켈레톤 |
