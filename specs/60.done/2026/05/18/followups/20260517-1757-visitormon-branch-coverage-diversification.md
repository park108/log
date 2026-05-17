---
source_task: TSK-20260518-04
category: test-followup
severity: observation
observed_at: 2026-05-17T17:57Z
---

# VisitorMon.jsx branch coverage 다양화 (cancelled 가드 분기 도달 확장)

## 출처
TSK-20260518-04 회수 후 `src/Monitor/VisitorMon.jsx` 자체 branch coverage 92.85%, 전역 Branches 94.07% (≥94% threshold PASS, baseline 94.13% 대비 -0.06%p). cancelled 가드 3개 (line 53 try-fence 후 / line 169 catch 분기 / line 175 종료 가드) 중 line 53 이 가장 빠르게 unmount 케이스를 잡아 line 169 / 175 truthy 분기 도달 0.

## 관찰
- 신규 unmount fixture 2건 (resolve / reject) 추가 후 line 175 truthy 분기 (cancelled.current = true 진입) 도달 0 — 정상 응답 시 line 53 falsy → line 175 falsy 만 trace. unmount + resolve 케이스에서는 line 53 truthy 가 잡음.
- line 169 catch 분기 truthy 도 reject 케이스에서 line 53 가 미진입 (try 본문 await 직후 가드) — 즉 line 53 이 catch 도달 전 차단.

## 후속 액션 (developer 영역, 별 task 후보)
- line 169 / 175 truthy 분기 단독 도달 fixture 추가 — try 본문 진입 후 (await res.json() 와 마지막 setIsLoading 사이) unmount 트리거. 다만 microtask 타이밍 제어 어려움 — `vi.useFakeTimers()` + manual microtask flush 패턴 필요.
- 대안: line 53 가드 삭제 → line 169 / 175 만 유지. 단 race 보호 효능 일부 약화 — spec §수용 기준 (Must FR-03) 정합성 재검토 동반.

## 직교
- 본 followup 은 본 task 회수 후 코드 다양화 영역 — spec 효능 미충족 아님 (DoD 전수 PASS).
- TSK-20260518-03 (15 warning 운영 baseline) 영역과 직교.
