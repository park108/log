# Result: TSK-20260517-28 — 루트 엔트리 부트 비콘 fixture 박제

> 회수: developer @ 2026-05-17

## 요약
`src/index.jsx` 부트 시점 2종 비콘 (`sendToAnalytics` reportWebVitals 콜백, `sendCounter` 모듈 즉시 호출) 의 4 불변식 (B1~B4 + FR-01~FR-04) 을 단일 신설 fixture (`src/index.test.jsx`) 로 박제. spec `components/app.md` §스코프 규칙 G2 zero-point (sendBeacon test fixture 0 hit → 34 hit) 회복. 거짓 박제 surface 차단 reference (G3 = `src/reportWebVitals.test.js` 의 `index.jsx|sendBeacon|sendToAnalytics|sendCounter` token 0 hit) 무변동 유지. baseline G1 (`src/index.jsx` 8 hit) 무변동.

## 변경 파일
- `src/index.test.jsx` (신설, 187 lines) — `vi.mock` 으로 `./Monitor/api` / `./common/common` / `./reportWebVitals` / `react-dom/client` / `./App` 격리 + `Object.defineProperty(navigator, 'sendBeacon', ...)` stub + 케이스별 `vi.resetModules()` 캐시 격리 + `beforeAll`/`afterAll` sendBeacon descriptor 원복.

## 커밋
- 단일 커밋 (해시: 커밋 후 추가).

## 테스트 결과
- `npm run lint` → rc=0, warning 0.
- `npm run typecheck` → rc=0.
- `npx vitest run src/index.test.jsx --no-coverage` → 4/4 PASS (B1/B2/B3/B4 결정적).
- `npm test` → 49 files / 453 tests 전원 PASS, 0 fail.
- `npm run build` → 314ms 성공.

## DoD 점검
- [x] `npm run lint` warning 0 hit.
- [x] `npm run typecheck` rc=0.
- [x] `npm test -- src/index.test.jsx` 4 case 결정적 PASS.
- [x] `npm test` 전체 회귀 0 fail (49/49 files, 453/453 tests).
- [x] `npm run build` 성공.
- [x] **(G2)** `grep -rnE "sendBeacon" src --include="*.test.*"` → 34 hits (1+ hit 회복, 박제 시점 ≥4 hit 기대 충족).
- [x] **(G3)** `grep -nE "index\.jsx|sendBeacon|sendToAnalytics|sendCounter" src/reportWebVitals.test.js` → 0 hit (무변동).
- [x] **(G1)** `grep -rcE "sendBeacon|sendToAnalytics|sendCounter" src/index.jsx` → 8 (HEAD baseline 무변동).
- [ ] 수동 검증 (vitest watch 모드 시드 변동 무관 결정적 통과) — 자동화 환경에서 watch 모드 실행 불가, `npx vitest run` 3회 반복 결정적 통과로 대체 단언 (시드 무관 결정 fixture: 모듈 import + mock 호출 카운트 단언만 사용).

## 스코프 정합 (RULE-06)
- expansion: 허용 — `src/common/` 진입은 본 task 미실행 (helper 미추가, RULE-07 수단 중립 유지).
- 변경 범위: `src/index.test.jsx` 신설 1 파일 한정. `src/index.jsx` / `src/reportWebVitals.test.js` 무변동.

## 관찰 이슈 / 후속
- spec `30.spec/green/components/app.md` §테스트 현황 (B1~B4) + §수용 기준 (FR-01~FR-04) 8 marker 플립은 RULE-01 inspector writer 영역 — 본 task 회수 후 다음 inspector tick Phase 1 hook-ack chain 위임 (planner 박제). 본 task 커밋에는 spec 변경 미포함.
- followups 발행 없음 — 본 task 회수는 zero-point 단일 회복으로 범위 밖 개선/잠재 결함 신호 0.
