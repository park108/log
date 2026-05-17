---
source_task: TSK-20260518-04
category: env-drift
severity: high
observed_at: 2026-05-17T17:58Z
---

# pre-push hook deps coherence drift (`eslint-plugin-react-hooks@5.2.0` extraneous)

## 출처
TSK-20260518-04 (`src/Monitor/VisitorMon.jsx` unmount-safety) push 시도 시 `scripts/check-deps-coherence.sh` G1 + G2 위반:
```
G1 VIOLATION: extraneous=1 (expected 0)
├── eslint-plugin-react-hooks@5.2.0 extraneous
G2 VIOLATION: declared N=29 != installed M=30 (diff=-1)
Hint: run "npm install" (or "npm ci") to reconcile.
husky - pre-push script failed (code 1)
```

## 영향
- TSK-20260518-04 `push` 차단 → task 50.blocked 격리 (`specs/50.blocked/task/visitormon-fetch-unmount-safety/`).
- 본 task 외 선행 unpushed commits 2건 (`1d0fb70` spec inspector + `9372da0` spec planner) + 본 commit `760a491` 3건 모두 송출 차단.
- 차기 developer 세션도 동일 drift 유지 시 push 차단 — 파이프라인 차단 누적.

## 관찰
- `node_modules/eslint-plugin-react-hooks@5.2.0` extraneous (package.json devDependencies 비등록 상태로 설치됨).
- declared 29 / installed 30 → 1 패키지 over-install.
- 원인 후보: 직전 세션 (또는 외부 도구) 의 임시 npm 설치, lockfile 동기화 누락, 의존성 정리 누락.

## 해결 방향 (discovery / planner / developer 영역 — 별 task 후보)
1. **빠른 해소**: `npm install` (lockfile 기반 reconcile) 또는 `npm ci` (clean install) → `node_modules` 재정렬.
2. **근본 정정**: 만약 `eslint-plugin-react-hooks` 가 실제 lint/typecheck 채널에서 필요 → `package.json` devDependencies 명시 후 `npm install --save-dev` + lockfile commit.
3. **drift 재발 방지**: pre-commit hook (또는 husky) 에 `check-deps-coherence.sh` 부착 — 현재는 pre-push 만 등록 → drift 가 commit 단계 통과 후 push 차단으로 surface.

## 직교
- RULE-02 `--no-verify` 우회 금지 정합 — 본 followup 정식 회수 후에야 push 재시도 가능.
- 본 followup 회수 시 `760a491` (VisitorMon unmount-safety) commit 도 함께 송출 — TSK-20260518-04 50.blocked 격리 해제 후보 surface.
