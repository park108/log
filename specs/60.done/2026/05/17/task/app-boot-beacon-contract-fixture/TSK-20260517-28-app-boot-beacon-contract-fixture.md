# Task: 루트 엔트리 부트 비콘 sendToAnalytics/sendCounter 4 불변식 fixture 박제

> **Task ID**: TSK-20260517-28
> **출처 spec**: `specs/30.spec/green/components/app.md` §동작 8 (B1~B4) + §수용 기준 (REQ-094, FR-01~FR-04) + §스코프 규칙 (G2 zero-point)
> **관련 요구사항**: REQ-20260517-094 (루트 엔트리 부트 비콘 `sendToAnalytics` / `sendCounter` URL/body 계약 + 가드 + 발화 카운트 4 불변식)
> **depends_on**: []
> **supersedes**: (carve 파생 아님 — REQ-094 회복 1차 task)

## 배경
`src/index.jsx` 부트 시점 2종 비콘 (`sendToAnalytics` reportWebVitals 콜백, `sendCounter` 모듈 즉시 호출) 의 4 불변식 (B1: sendToAnalytics URL/body 계약, B2: sendCounter URL/body + `/useragent` 접미, B3: `navigator.sendBeacon` 가드 falsy silent no-op, B4: 모듈 로드 1회 발화 카운트) 이 spec 박제는 완료되었으나 fixture 박제 zero-point (G2 = 0 hit). 본 task 는 단일 fixture 박제로 4 marker (B1~B4) + 4 marker (FR-01~FR-04) 동시 해소 + 거짓 박제 surface 차단 reference (FR-05 박제 정합 검증) 회복.

## 변경 범위
| 파일 | 동작 | 핵심 |
|------|------|------|
| `src/index.test.jsx` (신설) | 추가 | `src/index.jsx` 부트 분기 4 불변식 fixture — `vi.mock`(`./Monitor/api`, `./common/common`, `./reportWebVitals`, `react-dom/client`) + `vi.fn()` sendBeacon stub + `delete navigator.sendBeacon` undefined 가드 케이스 + 모듈 1회 import 후 호출 카운트 단언. afterEach: `vi.unstubAllGlobals` + `vi.resetModules` + sendBeacon 원복 |
| `specs/30.spec/green/components/app.md` | 수정 | §테스트 현황 (B1)(B2)(B3)(B4) 4 marker `[ ]`→`[x]` + §수용 기준 (FR-01)(FR-02)(FR-03)(FR-04) 4 marker `[ ]`→`[x]` + §변경 이력 본 task hook-ack 라인 추가. 단, spec 편집은 inspector writer 영역 — developer 는 src/ 변경만 commit. spec 편집은 본 task 회수 후 다음 inspector tick hook-ack chain 위임 (planner 박제 명시) |

> **Note**: spec marker 플립은 RULE-01 inspector writer 영역. developer 는 본 task 의 src/ 변경 (신설 fixture) 만 단일 commit. spec marker 플립은 inspector 가 다음 tick 진입 시 hook-ack chain 으로 처리 — TSK-25/26/27 회수 chain 과 동일 패턴 (file.md / runtime-fetch-unmount-safety.md hook-ack 정합).

## 구현 지시
1. **신설 `src/index.test.jsx`**:
   - `vi.mock("./Monitor/api", () => ({ getAPI: vi.fn(() => "https://analytics.example/api") }))`.
   - `vi.mock("./common/common", () => ({ userAgentParser: vi.fn(() => ({ ua: "test-agent" })) }))`.
   - `vi.mock("./reportWebVitals", () => ({ default: vi.fn() }))`.
   - `vi.mock("react-dom/client", () => ({ default: { createRoot: vi.fn(() => ({ render: vi.fn() })) } }))`.
   - `document.getElementById` stub: `vi.spyOn(document, "getElementById").mockReturnValue(document.createElement("div"))`.
2. **케이스 1 (B1 + FR-01)**: `navigator.sendBeacon = vi.fn(() => true)` stub → `await import("./index.jsx")` → `sendBeacon` 호출 정확히 1회 (counter URL) + reportWebVitals 콜백 인자 (`sendToAnalytics`) 추출 후 직접 발화 (`{ id: "metric-1", value: 42 }`) → 2회차 호출 단언 (`url = "https://analytics.example/api"` + `body = JSON.stringify({id:"metric-1", value:42})`).
3. **케이스 2 (B2 + FR-02)**: 동일 stub → 모듈 import 시 sendCounter 1회 발화 단언 (`url = "https://analytics.example/api/useragent"` + `body = JSON.stringify({ua:"test-agent"})`).
4. **케이스 3 (B3 + FR-03)**: `Object.defineProperty(navigator, "sendBeacon", { value: undefined, configurable: true })` → `vi.resetModules()` 후 `await import("./index.jsx")` → throw 없이 resolve + (resetModules 후 별 sendBeacon spy) 호출 0회 단언. `reportWebVitals` 콜백 직접 발화 시도해도 throw 없음 단언.
5. **케이스 4 (B4 + FR-04)**: `vi.resetModules()` 후 동일 모듈 2회 import → 2번째 import 가 모듈 캐시 사용 시 `sendBeacon` 호출 증분 0 (모듈 즉시 실행 1회 발화 단언). `reportWebVitals` mock 의 mock.calls.length === 1 단언 (콜백 등록 1회).
6. **afterEach**: `vi.unstubAllGlobals()` + `vi.resetModules()` + 원래 `navigator.sendBeacon` descriptor 복원 + 모든 vi.mock 모듈 reset.
7. **격리 게이트** (NFR-01/NFR-02/NFR-03): jsdom 환경 단일 fixture 결정적 통과 + 다른 test 의 `App` 마운트 부수효과 누수 0 (`createRoot` mock + `getElementById` stub).

## 테스트
- 신규 fixture `src/index.test.jsx` 4 case (B1/B2/B3/B4) 결정적 통과.
- 회귀: `src/reportWebVitals.test.js` 기존 패스 유지 (본 task 미수정).
- `App.test.jsx` 기존 패스 유지 (createRoot mock 격리 — 본 fixture 외부 영향 0).

## 검증/DoD
- [ ] `npm run lint` (warning 0 hit 유지 — eslint flat-config 정합).
- [ ] `npm run typecheck` (rc=0 유지 — 본 fixture 는 `.jsx` 로 신설, TS 영향 0).
- [ ] `npm test -- src/index.test.jsx` 4 case 결정적 PASS.
- [ ] `npm test` 전체 회귀 0 fail.
- [ ] `npm run build` (해당 시 — 본 fixture 는 build artifact 영향 0, 검증만).
- [ ] **(G2 게이트)** `grep -rnE "sendBeacon" src --include="*.test.*"` → **1+ hit** (zero-point 회복, 본 task 회수 시점 효능 — fixture 박제 효능 평서). 박제 시점 기대 = `src/index.test.jsx` 내 sendBeacon spy/assert 토큰 ≥4 hit.
- [ ] **(G3 게이트 유지)** `grep -nE "index\.jsx|sendBeacon|sendToAnalytics|sendCounter" src/reportWebVitals.test.js` → **0 hit** (거짓 박제 surface 차단 유지 — 본 task 는 `src/reportWebVitals.test.js` 미수정).
- [ ] **(G1 게이트 무변동)** `grep -rcE "sendBeacon|sendToAnalytics|sendCounter" src/index.jsx` → **8** (HEAD baseline 무변동 — 본 task 는 `src/index.jsx` 미수정).
- [ ] 수동 검증: vitest watch 모드에서 4 case 단일 결정적 통과 (시드 변동 무관).

## 스코프 규칙
- **expansion**: 허용 — REQ-094 회복은 spec `components/app.md` §스코프 규칙 §expansion `허용` 명시 (신설 fixture + helper 추가 시 `src/common/` 진입 허용). 본 task 는 신설 fixture 1개 (`src/index.test.jsx`) 만 박제 — helper 미추가 (RULE-07 수단 중립 유지).
- **grep-baseline** (HEAD=`60d994f`, 2026-05-17 실측):
  - **(G1) src 등장 baseline**: `grep -rcE "sendBeacon|sendToAnalytics|sendCounter" src/index.jsx` → **8** hits in 1 file:
    - `src/index.jsx:15` (sendToAnalytics 선언)
    - `src/index.jsx:20` (navigator.sendBeacon 가드)
    - `src/index.jsx:21` (sendBeacon 호출)
    - `src/index.jsx:28` (sendToAnalytics reportWebVitals 등록)
    - `src/index.jsx:31` (sendCounter 선언)
    - `src/index.jsx:36` (navigator.sendBeacon 가드)
    - `src/index.jsx:37` (sendBeacon 호출)
    - `src/index.jsx:41` (sendCounter 호출)
  - **(G2) fixture spy/assert zero-point**: `grep -rnE "sendBeacon" src --include="*.test.*"` → **0 hits in 0 files** (HEAD=`60d994f` 실측 MISS — 본 task 회복 zero-point).
  - **(G3) reportWebVitals.test 커버 범위 zero-point**: `grep -nE "index\.jsx|sendBeacon|sendToAnalytics|sendCounter" src/reportWebVitals.test.js` → **0 hits in 0 files** (현 fixture 가 `src/index.jsx` / sendBeacon 분기 import/spy/assert 0 — 거짓 박제 차단 reference 박제).
  - **(G4) Task ID 중복 검증**: `grep -rEhn "TSK-20260517-28" specs/{60.done,50.blocked,10.followups,20.req} 2>/dev/null` → **0 hits** (본 task 파일 자기 박제 제외 — -01~-27 footprint 점유, -28 free 채번 검증). 본 task 파일 자기 박제 (`specs/40.task/TSK-20260517-28-*.md` 의 Task ID line + G4 본문 참조) 는 정의상 면제 — RULE-01 채번 정합.
- **rationale**: G1 baseline = REQ-094 회복 reference (본 task 미수정). G2 zero-point = 본 task 회복 효능 (1+ hit). G3 = 거짓 박제 차단 surface (본 task 무변동 검증). G4 = Task ID 중복 검증. 본 task scope = `src/index.test.jsx` 신설 1 파일 + spec marker 플립은 inspector hook-ack 위임. expansion 허용 — fixture 박제 helper 추가 시 `src/common/` 진입 가능 (단 본 task 미추가 — RULE-07 수단 중립).

## 롤백
단일 `git revert <sha>` 로 `src/index.test.jsx` 신설 commit 회수. 본 task 회수 후 spec marker 플립 chain 미진입 (developer 영역 한정) — RULE-05 정식 경로 (revert + result.md append) 정합.

## 범위 밖
- spec `components/app.md` §테스트 현황 + §수용 기준 marker 플립 (B1~B4 + FR-01~FR-04 8 marker) — RULE-01 inspector writer 영역. 본 task 회수 후 다음 inspector tick 의 Phase 1 hook-ack chain 위임 (TSK-25/26/27 회수 → file.md/runtime-fetch-unmount-safety.md marker 플립 패턴 정합).
- `sendBeacon` 미지원 브라우저 fetch keepalive / XHR 폴백 도입 (가드 falsy 분기 confluent 확장) — 별 req 후보 (REQ-094 §신호 a 박제).
- analytics 엔드포인트 스키마/페이로드 변경 (URL/body 계약 별 axis) — 별 req 후보 (REQ-094 §신호 b 박제).
- `src/Monitor/api.js` `getAPI` 시그니처 변경 / `userAgentParser` 반환 형태 변경 — 본 task 는 mock 으로 격리 (실 구현 변경 별 task).
