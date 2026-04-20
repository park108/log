# 컴포넌트 명세: web-vitals reporter & Monitor

> **위치**:
> - `src/reportWebVitals.js`
> - `src/Monitor/WebVitalsMon.jsx`
> - `src/Monitor/WebVitalsItem.jsx`
> **유형**: Util + UI Components
> **최종 업데이트**: 2026-04-20 (by inspector, drift reconcile — §4.2 version pin + §5.1/5.2/5.3 WIP→완료 ACK post TSK-14 `60c0cd3`)
> **상태**: Active (v5 + INP 업그레이드 완료 / 런타임 스모크 baseline 운영자 대기)
> **관련 요구사항**:
> - REQ-20260418-003 (`specs/requirements/done/2026/04/18/20260418-upgrade-web-vitals-inp.md`) — v5 업그레이드 + INP 도입
> - REQ-20260418-022 (`specs/requirements/done/2026/04/18/20260418-web-vitals-inp-runtime-smoke-doc-and-baseline.md`) — 런타임 수동 스모크 체크리스트 + baseline (WIP)

> 본 문서는 컴포넌트의 **현재 구현 상태 + 진행 중 변경 계획(WIP)** 을 기술하는 SSoT.
> WIP 항목은 `[WIP]` 또는 `> 관련 요구사항:` 헤더로 표시.

---

## 1. 역할 (Role & Responsibility)
브라우저에서 Core Web Vitals 측정값을 수집하여 서버로 전송(`reportWebVitals.js`)하고, Monitor 페이지(`WebVitalsMon.jsx`/`WebVitalsItem.jsx`)에서 24시간 집계를 시각화한다.

- 주 책임:
  - `web-vitals` 라이브러리 콜백을 등록하고 `navigator.sendBeacon` 으로 페이로드 전송
  - 지표별 GOOD / NEEDS IMPROVEMENT / POOR 분포 시각화
- 의도적으로 하지 않는 것:
  - 서버측 저장 스키마 정의 (별건, 람다)
  - attribution 데이터 수집 (`web-vitals/attribution`, 본 spec 범위 밖)
  - 대시보드 UX 재설계

> 관련 요구사항: REQ-20260418-003 §3 (Goals), §3.2 (Out-of-Scope)

## 2. 공개 인터페이스 (Public Interface)

### 2.1 reportWebVitals (Util)

#### Arguments
| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `onPerfEntry` | `(metric: Metric) => void` | Y | - | web-vitals 콜백. 일반적으로 `sendToAnalytics` |

#### Exports
- default: `reportWebVitals(onPerfEntry)`

### 2.2 WebVitalsMon (UI)
- Props: 없음
- Renders: `WEB_VITAL_LIST` 를 순회하며 `<WebVitalsItem>` 출력
- Suspense fallback 사용 (`<WebVitalsItem>` 은 lazy)

### 2.3 WebVitalsItem (UI)
- Props:
  | 이름 | 타입 | 필수 | 기본값 | 설명 |
  |------|------|------|--------|------|
  | `name` | `string` | Y | - | metric name (예: `LCP`, `INP`) |
  | `description` | `string` | Y | - | 설명 라벨 |
- 내부 fetch: `getWebVitals(name)` → `Monitor/api.js`

## 3. 내부 상태 (Internal State)

### WebVitalsItem
| 상태 | 타입 | 초기값 | 변경 트리거 |
|------|------|--------|-------------|
| `isLoading` | `boolean` | `false` | fetch 시작/종료 |
| `isMount` | `boolean` | `false` | 최초 mount 후 fetch 1회 |
| `isError` | `boolean` | `false` | fetch 실패 |
| `evaluationResult` | `object` | (count=0, evaluation=None) | fetch 성공 시 집계값 산출 |

## 4. 의존성 (Dependencies)

### 4.1 내부 의존
- `src/Monitor/api.js` — `getWebVitals(name)` API 호출
- `src/common/common.js` — `log`, `hasValue`, `hoverPopup`

### 4.2 외부 의존
- 패키지: **`web-vitals`** — 2026-04-20 관측 `^5.2.0` (post TSK-14, commit `60c0cd3`; 2026-04-20 inspector drift reconcile)
- 브라우저 API: `navigator.sendBeacon` (전송), `lazy`/`Suspense`
- 외부 시스템: 수신측 Lambda + DynamoDB (스키마 변경 없음 가정)

### 4.3 역의존 (사용처)
- `src/index.jsx:28` — `reportWebVitals(sendToAnalytics)` 부트스트랩 호출
- `src/Monitor/Monitor.jsx` — `WebVitalsMon` 렌더

## 5. 동작 (Current Behavior)

### 5.1 현재 구현 (v5 기준, post TSK-14 `60c0cd3`; 2026-04-20 inspector drift reconcile)
```js
// src/reportWebVitals.js (실측, 2026-04-20)
import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
  onCLS(onPerfEntry);
  onINP(onPerfEntry);
  onFCP(onPerfEntry);
  onLCP(onPerfEntry);
  onTTFB(onPerfEntry);
});
```
- `onXXX` v5 API 사용. `getFID`/`onFID` 완전 제거.
- `onINP` 도입 — Google Core Web Vitals 2024-03 표준 정합.

`WebVitalsMon.jsx` 의 `WEB_VITAL_LIST` 가 `LCP, INP, CLS, FCP, TTFB` 5개 정적 매핑 (FID 미포함).

### 5.2 v5 업그레이드 — 완료 (TSK-14 `60c0cd3`)
> 관련 요구사항: REQ-20260418-003 FR-01, FR-02, FR-03

**완료 (2026-04-20 drift reconcile)**: §5.1 코드와 동일. 콜백 시그니처는 v3 → v5 동일 형태 (`(metric) => void`). `metric.name`, `metric.value`, `metric.id`, `metric.rating` 보존. attribution 미사용(가정) 유지.

### 5.3 WebVitalsMon 라벨 — 완료 (TSK-14 `60c0cd3`)
> 관련 요구사항: REQ-20260418-003 FR-04

**완료 (2026-04-20 drift reconcile, src/Monitor/WebVitalsMon.jsx:5-7 실측)**:
```js
const WEB_VITAL_LIST = [
  {name: "LCP",  description: "Largest Contentful Paint"},
  {name: "INP",  description: "Interaction to Next Paint"},   // FID 대체
  {name: "CLS",  description: "Cumulative Layout Shift"},
  {name: "FCP",  description: "First Contentful Paint"},
  {name: "TTFB", description: "Time to First Byte"},
];
```
- `FID` 항목 제거 (신규 수집 중단). `WebVitalsItem` 의 fetch (`getWebVitals(name)`) 는 임의 name 을 받으므로 과거 FID 레코드는 별도 조회 가능 (US-03, FR-04 호환성 유지).
- INP 임계치 표시 여부는 §13 미결.

### 5.4 [WIP] sendToAnalytics 페이로드 검증
> 관련 요구사항: REQ-20260418-003 FR-05
- `sendToAnalytics(metric)` 가 `metric.name` 을 그대로 포함해 서버로 전송하는지 재검증.
- 현재 동작 가정: `index.jsx:28` 의 callback 이 `metric` 객체를 JSON 으로 직렬화 → `sendBeacon` (구체 구현은 별건 점검).

### 5.5 에러 / 엣지 케이스
- `web-vitals` 동적 import 실패: 콘솔 에러만 (현재 동작 유지).
- `navigator.sendBeacon` 미지원/차단: 페이로드 손실 (기존 동작).
- Monitor `getWebVitals(name)` 실패: 재시도 버튼 노출 (기존).
- 과거 FID 레코드: list 에서 빠지지만 서버 데이터는 유지 (US-03, NFR-04).

## 6. 데이터 스키마 (Data Shape)

### 6.1 web-vitals Metric (v5)
```
Metric = {
  name: 'CLS' | 'INP' | 'FCP' | 'LCP' | 'TTFB',  // FID 제거 (WIP)
  value: number,
  rating: 'good' | 'needs-improvement' | 'poor',
  id: string,
  delta: number,
  entries: PerformanceEntry[],
  navigationType: string,
}
```

### 6.2 evaluationResult (WebVitalsItem 내부)
```
{
  totalCount: number,
  evaluation: 'GOOD' | 'NEEDS IMPROVEMENT' | 'POOR' | 'None',
  good:            { count, rate, style },
  needImprovement: { count, rate, style },
  poor:            { count, rate, style },
}
```

## 7. 테스트 현황 (Current Coverage)
- 테스트 파일:
  - `src/Monitor/WebVitalsItem.test.jsx` (존재)
  - `src/Monitor/WebVitalsMon.test.jsx` (LIST 라벨 5종 어서트)
  - `src/reportWebVitals.test.js` (TSK-14 로 등록, `vi.mock('web-vitals', ...)` 기반)
- 커버된 시나리오:
  - [x] WebVitalsItem fetch 성공/실패 분기
  - [x] reportWebVitals 가 v5 API (`onCLS/onINP/onFCP/onLCP/onTTFB`) 호출 (TSK-14)
  - [x] WebVitalsMon LIST 에 `INP` 포함, `FID` 미포함 (TSK-14)
- 미커버 / 추가 (jsdom 한계):
  - [ ] [WIP] 런타임 `sendBeacon` 경로 실측 검증 — **REQ-022 의 수동 스모크 체크리스트로 커버** (`specs/spec/green/testing/web-vitals-runtime-smoke-spec.md`)
  - [ ] [WIP] INP 콜백 실제 발화(사용자 클릭 + visibilitychange) — jsdom 범위 밖

### 7.1 [WIP] REQ-20260418-022 런타임 스모크 연계
> 관련 요구사항: REQ-20260418-022 FR-01~07, US-01~03

자동 테스트는 콜백 등록과 LIST 라벨까지만 검증하며, **실제 브라우저에서 `onINP`/`onLCP`/`onCLS`/`onFCP`/`onTTFB` 가 사용자 상호작용/`visibilitychange` 시점에 `navigator.sendBeacon` 으로 전송되는지**는 jsdom 범위 밖. 본 spec 은 REQ-022 가 신설하는 `docs/testing/web-vitals-runtime-smoke.md` 체크리스트 및 `specs/spec/green/testing/web-vitals-runtime-smoke-spec.md` 를 **수용 기준 검증 근거** 로 참조한다. REQ-009 / REQ-003 의 FR-05 (runtime INP 보고) 도 동일 근거로 해석.

> 관련 요구사항: REQ-20260418-003 §10 (수용 기준), §11 (성공 지표 — deprecated API 0건); REQ-20260418-022 §10

## 8. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 신뢰성 | v5.2.0 build/test PASS (commit `60c0cd3`) | v5 업그레이드 후 build/test pass | NFR-01 — 달성 |
| 성능(번들) | v5 청크 (tree-shake `onXXX`) | ≤ 현재 (v5 tree-shake 개선) | NFR-02 — 달성 (TSK-14 post-build 확인) |
| 관측가능성 | INP 수집 활성 (WEB_VITAL_LIST 반영) | INP 수집, 일 1+ 레코드 | NFR-03 — 코드 경로 달성 / 운영 관측 baseline 은 REQ-022 운영자 |
| 호환성 | FID UI 제거 / 서버 레코드는 임의 name 조회 유지 | 레거시 FID 도 조회 가능 | NFR-04 — 달성 |

## 9. 알려진 제약 / 이슈
- v5 에서 `getFID`/`onFID` 완전 제거. 업그레이드 PR 머지 직후 깨질 수 있어 동시 변경 필요.
- `onINP` 의 기본 보고 트리거는 visibilitychange. `{ reportAllChanges: true }` 옵션은 현 spec 비활성화 (기본값 유지). §13 미결.
- 과거 FID 레코드의 UI 표기를 "Legacy" 로 명시할지 §13 미결.
- 서버측이 metric name 을 그대로 저장한다는 가정에 의존. 다르면 프론트에서 alias 전송 필요(Risk-1, FR-05 의 사전 검증으로 완화).

## 10. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-18 | (pending) | web-vitals v5 업그레이드 + INP 도입, FID 제거 (WIP) | 4.2, 5, 6, 7 |
| 2026-04-18 | TSK-20260418-14 (merged, commit `60c0cd3`) | web-vitals v5 + INP 적용 완료 (자동 테스트 포함) | 4.2, 5.2, 5.3, 6, 7 |
| 2026-04-18 | (pending, REQ-20260418-022) | 런타임 수동 스모크 체크리스트 cross-link 추가 + §7.1 섹션 신설 (WIP) | 7, 7.1, 11 |
| 2026-04-20 | (inspector drift reconcile) | §4.2 web-vitals 버전 pin `^3.0.4 (실설치 3.1.0)` → `^5.2.0` (post TSK-14, commit `60c0cd3`, package.json 실측). §5.1 "v3.1.0 deprecated" 코드 블록 → v5 onXXX 실측 코드로 교체. §5.2/§5.3 "[WIP]" → "완료" ACK. §8 NFR Status 4행 "달성" 갱신. 잔여: §5.4 sendToAnalytics 페이로드 재검증 (자동 테스트 영역), §7.1 운영자 런타임 스모크 baseline (REQ-022). 커밋 영향: 본 spec 단독. | 4.2, 5.1, 5.2, 5.3, 8 |

## 11. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-upgrade-web-vitals-inp.md` (REQ-003)
  - `specs/requirements/done/2026/04/18/20260418-web-vitals-inp-runtime-smoke-doc-and-baseline.md` (REQ-022)
- 관련 컴포넌트 명세:
  - `specs/spec/green/testing/web-vitals-runtime-smoke-spec.md` (REQ-022, 런타임 수동 스모크 체크리스트 정책)
  - `specs/spec/green/testing/markdown-render-smoke-spec.md` (패턴 참조, 세션 통합 후보)
- 진행 중/예정 task: (planner 가 생성 예정)
- 외부 참고:
  - web-vitals CHANGELOG: https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md
  - INP replaces FID (web.dev): https://web.dev/blog/inp-cwv
  - Core Web Vitals thresholds: https://web.dev/defining-core-web-vitals-thresholds/
  - sendBeacon API: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
