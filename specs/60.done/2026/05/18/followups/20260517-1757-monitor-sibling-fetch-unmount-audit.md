---
source_task: TSK-20260518-04
category: spec-followup
severity: should
observed_at: 2026-05-17T17:57Z
---

# Monitor 자매 컴포넌트 (ContentMon / ApiCallMon / WebVitalsMon) fetch unmount-safety audit

## 출처
TSK-20260518-04 (`src/Monitor/VisitorMon.jsx` fetchData unmount-safety 박제) 회수 시 §변경 범위 = `VisitorMon.jsx` + `VisitorMon.test.jsx` 2 파일 한정 (RULE-06 expansion 불허). spec `30.spec/green/testing/runtime-fetch-unmount-safety.md` §수용 기준 (Should FR-05) + §스코프 규칙 G4 baseline 은 자매 Monitor 3 컴포넌트 audit + 회복을 요구한다.

## 관찰
- HEAD=`pending` (TSK-04 회수 직후) 시점 `grep -rnE "AbortController|signal\s*[:,]|useQuery|cancelled|isMounted" src/Monitor` → 8 hit @ `VisitorMon.jsx` 한정. 자매 `ContentMon.jsx` / `ApiCallMon.jsx` / `WebVitalsMon.jsx` 동일 패턴 노출 여부 audit 미수행.
- spec §수용 기준 (Should FR-05): `grep -rnE "useEffect|async|await|setIs" src/Monitor` audit 으로 race 노출 여부 확인 후 본 spec scope 자동 흡수 + 회복 task 채번.
- spec §테스트 현황 (I4) marker 도 자매 audit 후 플립 대기.

## 후속 액션 (discovery / inspector 영역)
- 자매 3 컴포넌트 audit (raw `useEffect` + async fetch + setState 패턴 노출 여부) → 노출 시 회복 task 후보 발행.
- React Query 마이그레이션 또는 cancelled-flag ref 박제 수단 채택 (수단 중립 — 본 spec G5 정합).

## 직교
- 본 followup 은 REQ-093 spec §수용 기준 (Should FR-05) 영역. (Must FR-03) 은 본 task 로 회수 완료.
