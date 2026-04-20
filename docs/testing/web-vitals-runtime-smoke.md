# web-vitals 런타임 수동 스모크 체크리스트

> SSoT: `specs/30.spec/green/testing/web-vitals-runtime-smoke-spec.md` (blue 승격 예정)
> 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-web-vitals-inp-runtime-smoke-doc-and-baseline.md` (REQ-20260418-022, FR-01~07 / US-01~03 / NFR-01~04)
> 도입 태스크: TSK-20260418-35
> 선행 태스크: `specs/task/done/2026/04/18/20260418-web-vitals-v5-inp-upgrade/` (TSK-14, commit `60c0cd3`) — web-vitals v5 API + INP 도입 완료
> 자매 문서: `docs/testing/markdown-render-smoke.md`, `docs/testing/toaster-visual-smoke.md`, `docs/testing/styles-cascade-visual-smoke.md`, `docs/testing/tanstack-query-devtools-smoke.md`

## 목적

web-vitals v5 의 5 메트릭(`onINP` / `onLCP` / `onCLS` / `onFCP` / `onTTFB`) 은 `src/reportWebVitals.js` 가 라이브러리 콜백을 등록하고, `src/index.jsx:28` 에서 `reportWebVitals(sendToAnalytics)` 로 부트스트랩되어, 사용자 상호작용 / `visibilitychange` 시점에 `navigator.sendBeacon` 으로 JSON 페이로드를 `Monitor.getAPI()` endpoint 에 전송한다. 이 런타임 경로는 다음 이유로 **jsdom 자동 테스트 범위 밖**이다:

- `src/reportWebVitals.test.js` 는 `vi.mock('web-vitals', ...)` 로 모듈 자체를 스텁해 콜백 등록 여부(`onCLS` / `onINP` / `onFCP` / `onLCP` / `onTTFB` 가 `onPerfEntry` 인자로 호출되었는가) 까지만 검증한다. 라이브러리 내부의 `PerformanceObserver` 발화·`sendBeacon` 호출은 재현되지 않는다.
- jsdom 의 `PerformanceObserver` 는 `event` / `first-input` / `layout-shift` entry types 를 부분 stub 만 지원해 `onINP` / `onCLS` 실제 발화가 재현 불가능하다.
- `navigator.sendBeacon` 은 jsdom 에서 기본 제공되지 않으며, 제공되더라도 실제 네트워크 송출을 검증할 수 없다.

본 체크리스트는 **운영자 1분 Chrome/Edge DevTools Network 검증** 으로 5 메트릭의 `sendBeacon` 전송 경로를 **1회 baseline 으로 박제**하고, 아래 §회귀 시나리오 트리거가 발생하면 재수행하는 표준 절차다 (REQ-20260418-022 FR-05 / NFR-01~04, spec §1 / §3).

> **jsdom 범위 밖 근거 (REQ-003 FR-05)**: REQ-20260418-003 (`upgrade-web-vitals-inp`) FR-05 "런타임 INP 보고 검증" 은 본 체크리스트의 baseline 수행 결과를 근거로 한다.

Playwright + web-vitals 통합 / RUM 백엔드 연결 / v5 → v6 bump 는 **범위 밖** 이며 본 문서는 그 자동화 도입 이전의 보완재로 운용한다 (spec §1 out-of-scope).

## 적용 대상 변경

다음 중 하나라도 수정한 PR 에서 수행한다 (spec §3.6 회귀 시나리오).

- `src/reportWebVitals.js` — 콜백 등록 패턴 변경 (예: `onINP(onPerfEntry)` → `onINP(onPerfEntry, { reportAllChanges: true })` 같은 옵션 전달), `onCLS` / `onINP` / `onFCP` / `onLCP` / `onTTFB` 중 하나라도 등록 누락 / 추가.
- `src/index.jsx:28` 부트스트랩 호출 지점 변경 — `reportWebVitals(sendToAnalytics)` 의 인자 / 호출 타이밍 / 조건 분기.
- `src/index.jsx` 의 `sendToAnalytics` 함수 — `navigator.sendBeacon(url, body)` → `fetch(url, { method: 'POST', body, keepalive: true })` 같은 전송 메서드 전환, 또는 endpoint URL / 헤더 / body serializer(`JSON.stringify(metric)`) 변경.
- `commonMonitor.getAPI()` endpoint URL 혹은 `.env` `VITE_API_URL` 변경 — 전송 대상 URL 이 바뀌면 DevTools Network 필터 기준이 바뀐다.
- `web-vitals` 라이브러리 bump (`package.json` dependency 버전 변경, v5 → v6 등) — `Metric` 타입·`value` 단위·새 metric 추가(예: v6 에서 `onTTI` 도입 가설) 영향.
- React 19 bump 후 `React.StrictMode` effect 더블 invocation 변화 — INP 등 상호작용 metric 이 개발 모드에서 2 회 보고될 수 있어 baseline 재검증 대상.
- `src/Monitor/WebVitalsMon.jsx` / `src/Monitor/WebVitalsItem.jsx` 의 UI 로 표출되는 값이 라이브러리 실제 보고 결과와 어긋나는 의심이 있을 때.

무관한 변경(테스트 헬퍼 추가, 문서 편집, 서버 상태 리팩터, 다른 도메인 CSS 이행 등) 은 수행 대상이 아니다.

## 사전 준비

1. 작업 브랜치 checkout, 변경사항 반영 상태.
2. `npm install` 로 의존성 최신화.
3. `npm run dev` 기동 → 기본 `http://localhost:3000` (Vite dev 서버 기동 시 출력되는 URL 기준).
4. 브라우저:
   - **Chrome 또는 Edge (권장)** — Chromium 기반은 5 메트릭 모두 안정적으로 발화.
   - **Safari** — INP 가 일부 버전에서 미발화할 수 있어 비권장. 사용 시 해당 메트릭 발췌는 "N/A (Safari)" 로 표기.
   - Firefox — 일부 metric(예: INP)이 여전히 experimental 이므로 본 체크리스트에서는 비권장 (운영자 재현 시 OK).
5. 광고 차단기 / 추적 차단 확장 OFF, 또는 **private / incognito window** 사용. 차단기가 `sendBeacon` 을 막으면 payload 가 Network 패널에 잡히지 않는다.
6. DevTools 준비:
   - Network 패널 오픈 → `Preserve log` 체크 (페이지 이탈 / `visibilitychange` 후에도 기록 유지).
   - 필터에 **endpoint URL 일부** 또는 `ping` method 입력 (`sendBeacon` 은 Network 패널에서 `Type: ping` 으로 표시된다). 예: `ping` 또는 `getAPI()` 가 반환하는 URL 의 path 일부.
   - `All` 탭에서 필터가 너무 좁으면 비우고 Type 컬럼을 `ping` 으로 정렬.
7. 기록 준비 (spec §3.2):
   - 운영자 (이름/이메일)
   - 일자 (YYYY-MM-DD)
   - 커밋 해시 (`git rev-parse HEAD` 의 앞 7자)
   - 브라우저 + 버전 (예: Chrome 131.0.6778.85)
   - OS (예: macOS 14.5)
   - 라우트 (예: `/log`, `/log/:timestamp`)

## 체크리스트 5 메트릭

각 메트릭은 (절차 / 기대 페이로드 / 체크박스) 3 블록으로 구성. 체크박스는 `[ ]` 로 초기화된 상태를 템플릿으로 보관하며, 실제 baseline 수행 기록은 §Baseline 수행 섹션에 인라인으로 남긴다.

### 메트릭 1. INP (Interaction to Next Paint) — spec §3.3.1, US-01

**절차:**

1. 기본 라우트 `/log` 진입.
2. 페이지 내에서 사용자 상호작용을 **1회 이상** 수행:
   - 버튼 클릭 (예: 상단 네비게이션 / 페이지네이션 / 검색 토글).
   - 키 입력 (예: SearchInput 에 문자 입력).
   - 탭 전환 또는 Focus 이동 (Tab 키).
3. 페이지 이탈 (다른 라우트로 이동, 탭 닫기, 또는 **다른 탭으로 전환** 으로 `visibilitychange` 이벤트 발화 유도 — web-vitals v5 는 `visibilitychange` 시점에 최종 INP 를 `sendBeacon` 으로 보고).
4. DevTools Network 패널 → Type `ping` 또는 endpoint URL 필터 → `sendBeacon` payload 확인.
5. payload Preview / Response 탭에서 JSON body 에 `"name":"INP"` 가 포함된 entry 를 찾는다.

**기대 페이로드:**

```json
{
  "name": "INP",
  "value": 120,
  "id": "v5-1234567890-0",
  "delta": 120,
  "rating": "good",
  "navigationType": "navigate",
  "entries": [ { "name": "pointerdown", "duration": 120, "startTime": 1234.5 } ]
}
```

- `name`: `"INP"` (고정).
- `value`: 측정된 ms (number). "good" ≤ 200ms, "needs-improvement" 200~500ms, "poor" > 500ms (web.dev INP 기준).
- `id`: web-vitals 가 발급하는 UUID 형식 문자열 (v5 는 `v5-<timestamp>-<n>` 형식).
- `delta`: 마지막 보고 이후 증분 (number, 최초 보고 시 `value` 와 동일).
- `rating`: `"good"` / `"needs-improvement"` / `"poor"` 중 하나.
- `navigationType`: `"navigate"` / `"reload"` / `"back-forward"` / `"back-forward-cache"` / `"prerender"` / `"restore"` (optional).
- `entries`: v5 `Metric` 타입의 PerformanceEntry 배열 (optional, 구현체 제공 시).

**체크박스:**

- [ ] INP 페이로드 **1건 이상** 수신 확인 (`name === "INP"`)
- [ ] `value` / `id` / `delta` / `rating` 4 필드 모두 존재
- [ ] Network 패널 Type 컬럼 `ping`, Request Method `POST` 확인
- [ ] payload 발췌 (민감 필드 redact 후) §Baseline 수행 에 기록

### 메트릭 2. LCP (Largest Contentful Paint) — spec §3.3.2

**절차:**

1. 새 창 / 새 incognito window 에서 `/log` 진입 (LCP 는 페이지 lifecycle 초기 metric).
2. 가장 큰 컨텐트 페인트가 완료될 때까지 대기 (첫 화면 이미지 / 텍스트 블록 로드).
3. 페이지 이탈 또는 다른 탭 전환 (`visibilitychange` → LCP 최종 보고).
4. Network 패널에서 `name === "LCP"` payload 확인.

**기대 페이로드:**

- `name`: `"LCP"`.
- `value`: ms. "good" ≤ 2500ms, "needs-improvement" 2500~4000ms, "poor" > 4000ms.
- `id` / `delta` / `rating`: 메트릭 1 참조.
- `entries`: LargestContentfulPaint entry (optional).

**체크박스:**

- [ ] LCP 페이로드 **1건 이상** 수신 확인 (`name === "LCP"`)
- [ ] `value` / `id` / `delta` / `rating` 4 필드 모두 존재
- [ ] payload 발췌 §Baseline 수행 에 기록

### 메트릭 3. CLS (Cumulative Layout Shift) — spec §3.3.3

**절차:**

1. 새 창 / 새 incognito window 에서 `/log` 진입.
2. 스크롤로 레이아웃 변화를 유발. 이미지 lazy-load, 폰트 swap, late 로드된 CSS 가 점프를 만드는지 관찰.
3. 페이지 이탈 또는 다른 탭 전환 (`visibilitychange` → CLS 최종 누적값 보고).
4. Network 패널에서 `name === "CLS"` payload 확인.

**기대 페이로드:**

- `name`: `"CLS"`.
- `value`: score (number, **ms 아님**). "good" ≤ 0.1, "needs-improvement" 0.1~0.25, "poor" > 0.25. **값 0 도 허용** (레이아웃 shift 없음 — 이상 아님).
- `id` / `delta` / `rating`: 메트릭 1 참조.
- `entries`: LayoutShift entry (optional).

**체크박스:**

- [ ] CLS 페이로드 **1건 이상** 수신 확인 (`name === "CLS"`)
- [ ] `value` (0 포함) / `id` / `delta` / `rating` 4 필드 모두 존재
- [ ] payload 발췌 §Baseline 수행 에 기록

### 메트릭 4. FCP (First Contentful Paint) — spec §3.3.4

**절차:**

1. **새 세션 / 새 창 / 새 incognito window** 에서 `/log` 진입 (FCP 는 최초 1회만 발화하므로 기존 세션으로는 재현 불가).
2. 진입 직후 자동으로 보고됨 (추가 상호작용 불필요).
3. 페이지 이탈 또는 다른 탭 전환 유도 필요 시 `visibilitychange` 로 확정.
4. Network 패널에서 `name === "FCP"` payload 확인.

**기대 페이로드:**

- `name`: `"FCP"`.
- `value`: ms. "good" ≤ 1800ms, "needs-improvement" 1800~3000ms, "poor" > 3000ms.
- `id` / `delta` / `rating`: 메트릭 1 참조.
- `entries`: PaintTiming entry (optional).

**체크박스:**

- [ ] FCP 페이로드 **1건** 수신 확인 (`name === "FCP"`)
- [ ] `value` / `id` / `delta` / `rating` 4 필드 모두 존재
- [ ] payload 발췌 §Baseline 수행 에 기록

### 메트릭 5. TTFB (Time to First Byte) — spec §3.3.5

**절차:**

1. **새 세션 / 새 창 / 새 incognito window** 에서 `/log` 진입 (TTFB 는 최초 응답 시점 metric, 세션당 1 회).
2. 네트워크 요청 → 첫 바이트 응답 직후 자동 보고.
3. Network 패널에서 `name === "TTFB"` payload 확인.

**기대 페이로드:**

- `name`: `"TTFB"`.
- `value`: ms. "good" ≤ 800ms, "needs-improvement" 800~1800ms, "poor" > 1800ms.
- `id` / `delta` / `rating`: 메트릭 1 참조.
- `entries`: NavigationTiming entry (optional).

**체크박스:**

- [ ] TTFB 페이로드 **1건** 수신 확인 (`name === "TTFB"`)
- [ ] `value` / `id` / `delta` / `rating` 4 필드 모두 존재
- [ ] payload 발췌 §Baseline 수행 에 기록

## 페이로드 포맷 (spec §3.4, FR-07)

`sendToAnalytics(metric)` 은 `src/index.jsx` 에서 `JSON.stringify(metric)` 으로 직렬화 후 `navigator.sendBeacon(url, body)` 로 전송한다. `url` 은 `commonMonitor.getAPI()` 반환값. 페이로드는 web-vitals v5 `Metric` 타입을 그대로 직렬화한 결과다.

**공통 필드 (모든 5 메트릭 공통):**

| 필드 | 타입 | 설명 | 필수 |
|------|------|------|------|
| `name` | `"CLS"` \| `"FCP"` \| `"INP"` \| `"LCP"` \| `"TTFB"` | 메트릭 식별자 | 필수 |
| `value` | number | 측정값 (CLS 는 score, 나머지는 ms) | 필수 |
| `id` | string | web-vitals v5 가 발급한 고유 ID (`v5-<timestamp>-<n>`) | 필수 |
| `delta` | number | 마지막 보고 이후 증분 (최초 보고 시 `value` 와 동일) | 필수 |
| `rating` | `"good"` \| `"needs-improvement"` \| `"poor"` | 임계값 기반 등급 | 필수 |
| `navigationType` | `"navigate"` \| `"reload"` \| `"back-forward"` \| `"back-forward-cache"` \| `"prerender"` \| `"restore"` | Navigation Timing L2 분류 | optional |
| `entries` | `PerformanceEntry[]` | 원 raw entries (타입별 상이) | optional |

**민감 필드 / redact 권장:**

- `id` 가 세션 식별 가능성이 낮지만, 발췌·공유 시에는 `"v5-<redacted>"` 형태로 마스킹 권장.
- `entries` 안에 URL / DOM selector / timestamp 가 포함될 수 있음. 발췌 시 내용 검토 후 민감 부분 redact.
- 실제 endpoint URL 은 `.env` 기반 (`VITE_API_URL` 로 치환) → 문서 공유 시 URL 전체 노출 금지, path 정도만 기록.

> **참고**: v5 → v6 bump 시 `Metric` 타입 필드가 바뀔 수 있으므로 (§회귀 시나리오 트리거) 본 표를 재검토한다.

## Baseline 수행 (FR-03, FR-05, spec §3.5)

### baseline 양식

```
## Baseline 수행 (web-vitals-runtime)
- 운영자: <이름/이메일>
- 일자: YYYY-MM-DD
- 커밋 해시: <7자 해시>
- 브라우저 + 버전: <Chrome/Edge + version>
- OS: <OS + 버전>
- 라우트: /log (기본), 필요 시 /log/:timestamp 등 추가
- 결과:
  - INP: [x] / payload 발췌 (민감 필드 redact)
  - LCP: [x] / payload 발췌
  - CLS: [x] / payload 발췌 (값 0 허용)
  - FCP: [x] / payload 발췌
  - TTFB: [x] / payload 발췌
- 노트: 차단기 OFF / private window 사용 여부, 재현 불가 메트릭(있을 경우 사유), 관찰된 이상.
```

### baseline 1회 (2026-04-18, TSK-20260418-35 — 본 문서 도입)

본 문서 도입 태스크(TSK-20260418-35) 는 **런타임 코드 변경 0 / 문서 1개 신규** 이며, 실제 `npm run dev` 기동 + Chrome/Edge 브라우저 세션 + DevTools Network `sendBeacon` payload 수집은 운영자(park108) 의 로컬 세션에서만 수행 가능하다. 본 커밋 시점(자동화된 SDD 파이프라인 내) 에서는 해당 브라우저 세션이 **수동 검증 불가** 이므로, 아래 양식을 1 슬롯으로 비워두고 운영자가 다음 로컬 세션에서 5 메트릭 payload 를 발췌하여 `[x]` 로 마감하도록 예약한다. 자매 체크리스트(TSK-17 / TSK-22 / TSK-23) 와 동일한 처리 패턴(운영자 세션 통합 권장 — spec §3.7).

```
## Baseline 수행 (web-vitals-runtime, 1회 — 본 문서 도입 기준)
- 운영자: (park108, pending manual session)
- 일자: 2026-04-18
- 커밋 해시: (본 커밋 기준, 커밋 직후 추가 기록)
- 브라우저 + 버전: (pending)
- OS: (pending)
- 라우트: /log
- 결과:
  - INP: [ ] / payload 발췌 (pending) — pending manual session
  - LCP: [ ] / payload 발췌 (pending) — pending manual session
  - CLS: [ ] / payload 발췌 (pending) — pending manual session
  - FCP: [ ] / payload 발췌 (pending) — pending manual session
  - TTFB: [ ] / payload 발췌 (pending) — pending manual session
- 노트: 본 태스크는 문서 신규 추가만 포함하며 파이프라인 실행 환경에 브라우저 세션이 없어 baseline 이 미수행 상태로 출고. 운영자 다음 로컬 세션에서 5 메트릭 payload 를 Chrome/Edge DevTools Network 패널에서 발췌 후 체크박스 [x] 로 마감. REQ-20260418-023(focus-visible) / REQ-20260418-024(markdown baseline) / REQ-20260418-025(app 셸 스모크) 세션과 통합 권장(spec §3.7).
```

### baseline 2회 (web-vitals v5 → v6 bump 또는 sendToAnalytics 전송 메서드 전환 후, 예약)

아래 §회귀 시나리오 중 `web-vitals` 라이브러리 bump 또는 `navigator.sendBeacon` → `fetch(keepalive:true)` 전환이 머지되는 시점에 재수행. 5 메트릭 재검증 + `Metric` 타입 / 페이로드 필드 변화 확인.

```
## Baseline 수행 (web-vitals-runtime, 2회 — 회귀 시나리오 트리거 후)
- 운영자:
- 일자:
- 커밋 해시:
- 브라우저 + 버전:
- OS:
- 라우트: /log
- 결과:
  - INP: [ ] / payload 발췌
  - LCP: [ ] / payload 발췌
  - CLS: [ ] / payload 발췌
  - FCP: [ ] / payload 발췌
  - TTFB: [ ] / payload 발췌
- 노트: 트리거된 회귀 시나리오(예: web-vitals v5→v6 bump / sendToAnalytics fetch 전환 / React 19 bump) 명기. v5 대비 변경된 필드(있을 경우) 기록.
```

## 회귀 시나리오 (spec §3.6, FR-04)

본 체크리스트를 **재수행** 해야 하는 트리거:

1. **`src/reportWebVitals.js` 변경** — 콜백 등록 패턴 (옵션 전달, 메트릭 추가/누락, import 경로 변경).
2. **`src/index.jsx:28` 부트스트랩 호출 변경** — `reportWebVitals(sendToAnalytics)` 의 인자 / 호출 타이밍 / 조건 분기 변경.
3. **`sendToAnalytics` 전송 메서드 전환** — `navigator.sendBeacon(url, body)` → `fetch(url, { method: 'POST', body, keepalive: true })` / `XMLHttpRequest` / 기타. **전송 메서드 변경 시 본 문서의 §사전 준비 Network 필터 기준(`ping` → `fetch`/`xhr`) 과 §체크리스트 5 메트릭 절차를 함께 갱신** (REQ-022 §12 위험 4).
4. **web-vitals 라이브러리 bump** — v5 → v6 / v5.x 내 minor bump 중 `Metric` 타입·`value` 단위·새 metric(예: 가설 `onTTI`) 추가·기존 metric 동작 변경.
5. **React 19 bump 후 StrictMode effect 더블 invocation 변화** — INP / LCP 등이 개발 모드에서 2회 보고되거나 `id` 가 중복 발급되는지 확인. 프로덕션 빌드에는 영향 없음이 기대값.
6. **`commonMonitor.getAPI()` endpoint 변경** — 전송 대상 URL 이 바뀌면 Network 패널 필터 기준을 갱신. 인증 헤더 추가 시 `sendBeacon` 은 커스텀 헤더 미지원이므로 전송 메서드 전환이 수반됨.
7. **브라우저 정책 변경** — Safari / Chrome 의 `sendBeacon` 크기 한계, CORS / CSP, 광고 차단기 기본 동작 변화 — 1 년 주기 재확인 권장.

## 다른 런타임 메트릭 추가 시 템플릿 확장 방법

web-vitals 가 v6 등에서 새 metric (예: 가설 `onTTI` / `onLoAF`) 을 추가하거나, 자체 RUM metric (예: `customNavTime`) 을 `reportWebVitals` 에 추가하는 경우:

1. §체크리스트 5 메트릭 아래에 **새 섹션** `### 메트릭 N. <NAME> (<FullName>)` 추가. (절차 / 기대 페이로드 / 체크박스) 3 블록 구조 유지.
2. §페이로드 포맷 표의 `name` 열거에 새 식별자 추가, 단위(ms / score / bytes) 와 good/needs-improvement/poor 임계값 명기.
3. §Baseline 양식의 `결과:` 블록에 해당 metric 체크박스 1줄 추가.
4. `src/reportWebVitals.test.js` 에 대응 `onMETRIC(onPerfEntry)` 호출 assertion 추가 (라이브러리가 해당 export 를 제공하는 경우).
5. 본 문서 §회귀 시나리오 트리거 4 (web-vitals bump) 를 이미 포함하므로 추가 트리거 조항은 불필요. 필요시 해당 metric 고유 트리거만 추가.

## 관련 문서

- SSoT spec (green → blue 승격 예정): `specs/30.spec/green/testing/web-vitals-runtime-smoke-spec.md`
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-web-vitals-inp-runtime-smoke-doc-and-baseline.md` (REQ-20260418-022, FR-01~07 / US-01~03 / NFR-01~04)
- 선행 요구사항: `specs/requirements/done/2026/04/18/20260418-upgrade-web-vitals-inp.md` (REQ-20260418-003) — web-vitals v5 + INP 도입. FR-05 런타임 INP 보고 검증 근거.
- 선행 태스크: `specs/task/done/2026/04/18/20260418-web-vitals-v5-inp-upgrade/` (TSK-20260418-14, commit `60c0cd3`)
- cross-link spec: `specs/30.spec/green/monitor/web-vitals-spec.md` §7.1 (v5 + INP + 런타임 스모크 cross-link — 본 문서 머지와 함께 blue 승격 예상)
- 자매 체크리스트 (디렉토리/형식 일관 — NFR-03):
  - `docs/testing/markdown-render-smoke.md` (TSK-20260418-15)
  - `docs/testing/toaster-visual-smoke.md` (TSK-20260418-17)
  - `docs/testing/tanstack-query-devtools-smoke.md` (TSK-20260418-22)
  - `docs/testing/styles-cascade-visual-smoke.md` (TSK-20260418-23)
- 자매 spec:
  - `specs/30.spec/blue/testing/markdown-render-smoke-spec.md` (패턴 참조 — baseline 수행 양식 / 회귀 시나리오 섹션 구조)
  - `specs/30.spec/blue/testing/toaster-visual-smoke-spec.md`
  - `specs/30.spec/blue/testing/styles-cascade-visual-smoke-spec.md`
  - `specs/30.spec/blue/testing/tanstack-query-devtools-smoke-spec.md`
  - `specs/30.spec/green/testing/app-shell-side-effects-smoke-spec.md` (운영자 세션 통합 권장 — REQ-025)
  - `specs/30.spec/green/common/clipboard-spec.md` §3.7 (세션 통합)
- 참조 코드: `src/reportWebVitals.js`, `src/index.jsx:28`, `src/Monitor/WebVitalsMon.jsx`, `src/Monitor/WebVitalsItem.jsx`
- 참조 테스트: `src/reportWebVitals.test.js`, `src/Monitor/WebVitalsMon.test.jsx`
- 원 followup: `specs/followups/consumed/2026/04/**/20260418-*-web-vitals-v5-inp-runtime-verify.md`
- 외부 참고:
  - web-vitals GitHub (v5 changelog / Metric 타입): https://github.com/GoogleChrome/web-vitals
  - web-vitals v5 releases: https://github.com/GoogleChrome/web-vitals/releases
  - INP 정의 + 임계값: https://web.dev/articles/inp
  - LCP: https://web.dev/articles/lcp
  - CLS: https://web.dev/articles/cls
  - FCP: https://web.dev/articles/fcp
  - TTFB: https://web.dev/articles/ttfb
  - sendBeacon API: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
  - Page Lifecycle API (visibilitychange): https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
