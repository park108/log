# 명세: web-vitals 런타임 수동 스모크 체크리스트

> **위치**:
> - `docs/testing/web-vitals-runtime-smoke.md` (신규, WIP — 위치는 planner 조정 가능)
> - 참조 코드: `src/reportWebVitals.js`, `src/index.jsx:28`, `src/Monitor/WebVitalsMon.jsx`, `src/Monitor/WebVitalsItem.jsx`
> - 참조 테스트: `src/reportWebVitals.test.js`, `src/Monitor/WebVitalsMon.test.jsx`
> **유형**: Test / Operational Checklist (수동 스모크)
> **최종 업데이트**: 2026-04-20 (by inspector, drift reconcile + Phase 2 defer-tag — §5 수용 기준 5 행 완료 ACK, operator baseline 2 행 defer-tag)
> **상태**: Active (문서 신설 + 자동 영역 완료 / 운영자 baseline 1회 수행 대기 — defer-tag)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260418-web-vitals-inp-runtime-smoke-doc-and-baseline.md` (REQ-20260418-022)
> - 선행: REQ-20260418-003 (`specs/requirements/done/2026/04/18/20260418-upgrade-web-vitals-inp.md`) — v5 + INP 도입 완료 (TSK-14, commit `60c0cd3`)
> - 패턴 참조: `specs/spec/green/testing/markdown-render-smoke-spec.md`, `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md`, `specs/spec/green/common/clipboard-spec.md` §3.7

> 본 문서는 web-vitals 5종 메트릭(`onCLS`, `onFCP`, `onINP`, `onLCP`, `onTTFB`) 의 **실제 브라우저 `sendBeacon` 전송 경로** 가 jsdom 자동 테스트 범위 밖이라는 전제하에 **운영자 1회 baseline 박제** 체계의 SSoT.

---

## 1. 역할 (Role & Responsibility)
web-vitals 5종 메트릭이 사용자 상호작용 / `visibilitychange` 시점에 `navigator.sendBeacon` 페이로드로 정상 전송되는지 운영자 1회 검증으로 baseline 박제한다.

- 주 책임:
  - 5 메트릭(INP/LCP/CLS/FCP/TTFB) 각각의 트리거 절차 표준화
  - DevTools Network 패널에서 `sendBeacon` 페이로드(`name`, `value`, `id`, `delta`, `rating`) 검증
  - Baseline 수행 예시 + 회귀 시나리오 섹션으로 재수행 자동 트리거
- 의도적으로 하지 않는 것:
  - web-vitals v5 → v6 bump (별 후보)
  - `sendToAnalytics` endpoint URL / 인증 정책 변경 (별 후보)
  - 자동 시각/성능 회귀 (Playwright + web-vitals 통합) (별 후보)
  - RUM 백엔드 연결 변경 (별 후보)
  - 사용자 임의 상호작용 패턴(스크롤 깊이, hover dwell) (범위 외)

> 관련 요구사항: REQ-20260418-022 §3 (Goals)

---

## 2. 현재 상태 (As-Is) — 2026-04-20 기준 (drift reconcile)
- [x] `docs/testing/web-vitals-runtime-smoke.md` **존재** — 신설 완료 (commit `2ec132e`, task `20260418-web-vitals-runtime-smoke-checklist-doc`; 2026-04-20 inspector drift reconcile). 운영자 Baseline 수행 슬롯만 pending manual session
- 자동 검증 현황:
  - `src/reportWebVitals.test.js` — `vi.mock('web-vitals', ...)` 기반 → 라이브러리 내부 보고 트리거 검증 안 됨
  - `src/Monitor/WebVitalsMon.test.jsx` — LIST 라벨 5종 어서트 (TSK-14 완료)
  - jsdom 의 `PerformanceObserver` 가 `event` / `first-input` / `layout-shift` entry types 를 부분 stub 만 지원 → `onINP` 콜백 실제 발화 재현 불가
- `docs/testing/markdown-render-smoke.md` (TSK-15, commit `8d30b12`) 가 "수동 스모크 + baseline 마감" 패턴으로 안착 → 본 체크리스트가 동일 패턴 적용

> 관련 요구사항: REQ-20260418-022 §2 배경

---

## 3. 체크리스트 구성 (To-Be, WIP)
> 관련 요구사항: REQ-20260418-022 FR-01, FR-02, FR-04, FR-07, US-01~03

### 3.1 문서 위치
- 기본: `docs/testing/web-vitals-runtime-smoke.md`
- 대안: `specs/` 하위 — planner 결정.

### 3.2 환경 / 사전 준비
- `npm run dev` 기동
- Chrome/Edge (권장) — Safari 는 일부 INP 미발화 가능성 절차 주석
- DevTools Network 패널 오픈, `Preserve log` 체크, `sendBeacon` 필터 적용
- 광고 차단기 / 추적 차단 기능 OFF (또는 private window)
- 운영자 / 일자 / 커밋 해시 / 브라우저+버전 / OS / 라우트 기록 준비

### 3.3 5 메트릭 트리거 절차 (FR-02, FR-07)

각 메트릭은 (절차 / 기대 페이로드 필드 / 체크박스) 3 블록으로 구성.

#### 3.3.1 **INP** (Interaction to Next Paint)
> 관련 요구사항: REQ-20260418-022 US-01

**절차**:
1. 기본 라우트 진입 (`/log`)
2. 버튼 클릭 / 키 입력 / 탭 등 사용자 상호작용 **1회 이상**
3. 페이지 이탈 또는 탭 전환 (`visibilitychange` 발화)
4. DevTools Network → `sendBeacon` 필터 → payload 확인

**기대 페이로드**:
```json
{
  "name": "INP",
  "value": "<ms>",
  "id": "<uuid>",
  "delta": "<ms>",
  "rating": "<good|needs-improvement|poor>"
}
```

**체크**: `[ ] INP 페이로드 1건 이상 수신 + name === "INP"`.

#### 3.3.2 **LCP** (Largest Contentful Paint)
**절차**: 페이지 진입 → 가장 큰 컨텐트 페인트 후 페이지 이탈 → payload 확인.
**기대**: `name === "LCP"` 1건 이상.

#### 3.3.3 **CLS** (Cumulative Layout Shift)
**절차**: 페이지 진입 → 스크롤 / 레이아웃 변화 유발 → 페이지 이탈 → payload 확인.
**기대**: `name === "CLS"` 1건 이상 (값 0 도 허용).

#### 3.3.4 **FCP** (First Contentful Paint)
**절차**: 새 세션 / 새 창에서 페이지 진입 직후 → payload 확인.
**기대**: `name === "FCP"` 1건.

#### 3.3.5 **TTFB** (Time to First Byte)
**절차**: 새 세션 / 새 창에서 페이지 진입 직후 → payload 확인.
**기대**: `name === "TTFB"` 1건.

### 3.4 페이로드 포맷 명시 (FR-07)
공통 필드: `name`, `value`, `id`, `delta`, `rating`, (optional) `navigationType`, `entries` (v5 `Metric` 타입). 개인정보/세션 ID 가 포함될 수 있어 발췌 시 민감 필드 redact 권장.

### 3.5 Baseline 수행 예시 섹션 (FR-03, FR-05)
markdown-render-smoke 동일 형식:

```
## Baseline 수행 예시
- 운영자:
- 일자: YYYY-MM-DD
- 커밋 해시:
- 브라우저 + 버전:
- OS:
- 라우트:
- 결과:
  - INP: [x] / payload 발췌
  - LCP: [x] / payload 발췌
  - CLS: [x] / payload 발췌
  - FCP: [x] / payload 발췌
  - TTFB: [x] / payload 발췌
- 노트:
```

### 3.6 회귀 시나리오 섹션 (FR-04)
본 체크리스트를 재수행해야 하는 트리거:
- `src/reportWebVitals.js` 변경 (콜백 등록 패턴, 옵션 전달 등)
- `src/index.jsx` 부트스트랩 변경 (`reportWebVitals(sendToAnalytics)` 호출 지점)
- `sendToAnalytics` 의 `navigator.sendBeacon` vs `fetch` 방식 전환
- web-vitals 라이브러리 bump (v5 → v6 등)
- React 19 bump 후 strict mode effect 더블 invocation 변화 확인

### 3.7 1회 baseline 수행 (FR-05)
- 5 메트릭 모두 `[x]` 마감 + §3.5 박제 섹션 항목 100% 작성 + commit.
- REQ-20260418-023 (focus-visible), REQ-20260418-024 (markdown baseline), REQ-20260418-025 (app 셸 스모크) 와 같은 운영자 세션 통합 권장.

---

## 4. 의존성

### 4.1 내부 의존
- `src/reportWebVitals.js` (콜백 등록)
- `src/index.jsx:28` (부트스트랩 호출)
- `src/Monitor/WebVitalsMon.jsx`, `src/Monitor/WebVitalsItem.jsx` (UI 표시)
- `specs/spec/green/monitor/web-vitals-spec.md` §7.1 (cross-link)

### 4.2 외부 의존
- 운영자 로컬 환경
- Chrome/Edge DevTools Network 패널 + `sendBeacon` 필터
- web-vitals v5 (TSK-14 완료)

### 4.3 역의존 (사용처)
- REQ-20260418-003 (v5 + INP) 의 FR-05 (런타임 INP 보고) 검증 근거
- 미래 web-vitals v6 bump 시 본 체크리스트 재사용
- React 19 bump 후 strict mode 영향 검증 도구

---

## 5. 수용 기준 (Acceptance — REQ-20260418-022)
- [x] `docs/testing/web-vitals-runtime-smoke.md` 신규 파일 존재 — commit `2ec132e` (task `20260418-web-vitals-runtime-smoke-checklist-doc`, 332 lines)
- [x] 5 메트릭(INP/LCP/CLS/FCP/TTFB) 각각 트리거 절차 + 페이로드 검증 단계 + 체크박스 포함 — 문서 `## 체크리스트 5 메트릭` §3.3.1~3.3.5 (5 metric sections with per-metric checkboxes)
- **[deferred: REQ-20260418-022 FR-03 운영자 수동 baseline 1회 수행 대기 — `docs/testing/web-vitals-runtime-smoke.md` §Baseline 수행 (web-vitals-runtime, 1회) 슬롯 5 메트릭 `[x]` 0/5 관측 (2026-04-20). 자동 테스트 영역 밖 operator. planner 는 본 항목을 승격 게이트 계산에서 제외.]**
- [ ] [WIP] "Baseline 수행 예시" 섹션 신규 + 5 메트릭 모두 `[x]` 마감 (운영자/일자/해시/환경 기록)
- [x] "회귀 시나리오" 섹션이 `reportWebVitals.js`/`index.jsx`/web-vitals lib bump 트리거 명시 — 문서 `## 회귀 시나리오 (spec §3.6, FR-04)` 7 트리거 항목(reportWebVitals.js 변경 / index.jsx bootstrap / sendToAnalytics 전송 메서드 / web-vitals bump / React 19 bump / endpoint / 브라우저 정책)
- [x] `web-vitals-spec.md` §7.1 cross-link — 본 spec §7.1 cross-link 존재 + 문서 §관련 문서 역참조 1행 (doc line 307)
- [x] `npm test`, `npm run lint`, `npm run build` 영향 0 (문서 변경만) — task `20260418-web-vitals-runtime-smoke-checklist-doc` result.md 검증 PASS
- **[deferred: operator baseline 세션 직후 산출물. REQ-022 result.md baseline reference 는 위 FR-03 baseline 수행과 동시 박제.]**
- [ ] 본 REQ-022 result.md 에 baseline 수행 사실 + 박제 위치 reference

> 관련 요구사항: REQ-20260418-022 §10

---

## 6. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 가시성 (5 메트릭) | 0/5 baseline | 5/5 `[x]` | REQ-022 NFR-01 |
| 회귀 검출 | 없음 | 회귀 시나리오 섹션 존재 | REQ-022 NFR-02 |
| 추적성 | N/A | 박제 항목 (운영자/일자/해시) 100% | REQ-022 NFR-03 |
| 재현성 | N/A | 다른 운영자 재현 가능 (절차 1회 검증) | REQ-022 NFR-04 |

---

## 7. 알려진 제약 / 이슈
- jsdom 한계로 자동 테스트 대체 불가 — 본 체크리스트가 근거 역할.
- INP 가 Safari 일부 버전에서 미발화 가능 → Chrome/Edge 권장 + Safari 한계 주석 (REQ-022 §12 위험 2).
- `sendBeacon` 가 광고 차단기 / 추적 차단 / 개인정보 모드에서 차단 가능 → 절차에 차단기 OFF / private window 사용 명시 (REQ-022 §12 위험 3).
- 향후 `sendToAnalytics` 가 `fetch` 로 바뀌면 절차 무효 → 회귀 시나리오 섹션에 "전송 메서드 변경 시 절차 갱신" 명시 (REQ-022 §12 위험 4).
- 페이로드에 세션 ID / 개인정보 포함 가능 — 발췌 시 redact 권장 (REQ-022 §13 미결).

---

## 8. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-022) | web-vitals 런타임 수동 스모크 spec 초기화 (WIP) | all |
| 2026-04-20 | (inspector drift reconcile) | §2 As-Is 정정: `docs/testing/web-vitals-runtime-smoke.md` 부재 → 존재 (commit `2ec132e`, task `20260418-web-vitals-runtime-smoke-checklist-doc`). 운영자 baseline 수행만 pending manual session. 커밋 영향: 본 spec 단독. | 2 |
| 2026-04-20 | (inspector drift reconcile + Phase 2 defer-tag) | §5 수용 기준 drift 정정: (a) "문서 신규 파일 존재" / "5 메트릭 트리거 절차" / "회귀 시나리오 섹션" / "§7.1 cross-link" / "npm 영향 0" 5 항목 `[ ][WIP]` → `[x]` 전환 (commit `2ec132e` 관측 근거). (b) 2 항목 (Baseline 5 메트릭 `[x]` 마감 + REQ-022 result.md baseline reference) 에 `[deferred: operator baseline 1회 수행 대기 — 현 baseline 0/5]` 태깅. 자동 영역 5 행은 완료, 운영자 영역 2 행은 defer-tag. 과태깅 방지: §1~4/§6/§7/§9 유지. planner 승격 게이트는 deferred 2 행 제외로 본 spec 승격권 진입. 커밋 영향: 본 spec 단독. | 5, 8 |

---

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-web-vitals-inp-runtime-smoke-doc-and-baseline.md`
- 관련 spec:
  - `specs/spec/green/monitor/web-vitals-spec.md` §7.1 (v5 업그레이드 + INP + 런타임 스모크 cross-link)
  - `specs/spec/green/testing/markdown-render-smoke-spec.md` (패턴 참조 + 세션 통합)
  - `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md` (세션 통합)
  - `specs/spec/green/common/clipboard-spec.md` §3.7 (세션 통합)
- 원 followup (이동 후): `specs/followups/consumed/2026/04/18/20260418-1140-web-vitals-v5-inp-runtime-verify.md`
- 관련 태스크: `specs/task/done/2026/04/18/20260418-upgrade-web-vitals-v5-inp/` (TSK-14, 추정)
- 외부 참고:
  - web-vitals v5 changelog: https://github.com/GoogleChrome/web-vitals/releases
  - INP 정의: https://web.dev/articles/inp
  - sendBeacon API: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
