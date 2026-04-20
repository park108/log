# 명세: App 셸 사이드이펙트 런타임 수동 스모크 체크리스트

> **위치**:
> - `docs/testing/app-shell-side-effects-smoke.md` (신규, WIP — 위치는 planner 조정 가능)
> - 참조 컴포넌트: `src/App.jsx:23-44` (useEffect 본체), `src/common/common.js:101-130` (`auth()`)
> - 참조 테스트: `src/App.test.jsx`, `src/common/common.test.js`
> **유형**: Test / Operational Checklist (수동 스모크)
> **최종 업데이트**: 2026-04-19 (by inspector, WIP — REQ-20260419-022 online/offline 반영)
> **상태**: Experimental (도입 전, 신규 명세)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260418-app-shell-side-effects-runtime-smoke-and-auth-idempotency.md` (REQ-20260418-025)
> - `specs/requirements/done/2026/04/19/20260419-app-online-offline-useeffect-rebind-bug.md` (REQ-20260419-022) — online/offline useEffect 의존성 `[isOnline]` → `[]` 정리 + cleanup 정합 박제
> - 선행: REQ-20260418-009 (`specs/requirements/done/2026/04/18/20260418-app-render-side-effects-cleanup.md`) — App.jsx useEffect 격리 완료
> - 패턴 참조: `specs/spec/blue/testing/markdown-render-smoke-spec.md`, `specs/spec/green/common/clipboard-spec.md` §3.7

> 본 문서는 `App.jsx` + `common.auth()` 의 **런타임 사이드이펙트(resize, Cognito 콜백, listener 등록, StrictMode 이중 마운트)** 가 자동 테스트(jsdom) 범위 밖이라는 전제하에 **운영자 1회 baseline 박제** 체계의 SSoT.

---

## 1. 역할 (Role & Responsibility)
jsdom 자동 테스트가 잡지 못하는 App 셸의 런타임 사이드이펙트 4 시나리오를 운영자 1분 관찰로 baseline 박제한다.

- 주 책임:
  - 4 시나리오 (resize minHeight / Cognito 콜백 쿠키 / 새로고침 멱등성 / resize listener 카운트) 절차 표준화
  - Baseline 수행 예시 섹션으로 운영자/일자/해시/브라우저 영구 기록
  - 회귀 시나리오 섹션으로 재수행 트리거 명시
- 의도적으로 하지 않는 것:
  - Cognito 인증 흐름 자체 (PKCE, refresh token) — 별 후보
  - `common.auth()` 리팩터링 (URL fragment 정리 로직 추가 등) — 별 후보
  - 자동 시각 회귀 (Playwright 등) — 별 후보
  - 모바일 디바이스 회전 / 가상 키보드 영향 — Could (별 후보)

> 관련 요구사항: REQ-20260418-025 §3 (Goals)

---

## 2. 현재 상태 (As-Is)
- [ ] `docs/testing/app-shell-side-effects-smoke.md` **부재**
- 자동 검증 현황:
  - `src/App.test.jsx` 의 `'render body has no direct side effects'` describe → `authSpy.mock.calls.length >= 1` 호출 카운트만 어서트
  - `src/common/common.test.js` → `auth()` cookie 결과 등가성 테스트 **미존재** (REQ-025 FR-01 로 추가 예정)
  - jsdom 한계: `window.innerHeight` 변경, DevTools "Event Listeners" 패널, `navigator.sendBeacon` 실측 모두 범위 밖
- 운영자 수동 체크리스트 공백: resize / Cognito flow / listener 누수 / 새로고침 멱등성 모두 "있을 것으로 예상" 수준

> 관련 요구사항: REQ-20260418-025 §2 배경

---

## 3. 체크리스트 구성
> 관련 요구사항: REQ-20260418-025 FR-03, FR-04, US-02, US-03

### 3.1 문서 위치
- 기본: `docs/testing/app-shell-side-effects-smoke.md`
- 대안: `specs/` 하위 — planner 결정.

### 3.2 환경 / 사전 준비
- `npm run dev` 기동
- Chrome/Edge (권장) DevTools 오픈: Elements 패널, Event Listeners 패널, Network 패널, Application > Cookies
- 시크릿 모드 권장 (기존 쿠키 영향 배제)
- 운영자 / 일자 / 커밋 해시 (`git rev-parse HEAD`) / 브라우저+버전 / OS / 뷰포트 초기 폭 기록 준비

### 3.3 시나리오 1 — 브라우저 resize → `main--main-contents` minHeight 갱신 (FR-04 ①)
> 관련 요구사항: REQ-20260418-025 US-02 수용 기준 2

**절차**:
1. 페이지 마운트 후 DevTools Elements 에서 `<main class="main--main-contents">` 선택
2. 브라우저 창 크기 변경 (예: 1200→800 폭, 800→600 높이)
3. Elements 패널에서 `style="min-height: XXXpx"` 값 관찰
4. 기대값: `window.innerHeight - 57 - 80` 에 정합 갱신

**기록 자리**: 변경 전 innerHeight / 변경 후 innerHeight / 관측된 min-height / 일치 여부.

### 3.4 시나리오 2 — Cognito 콜백 URL 진입 시 쿠키 설정 (FR-04 ②)
> 관련 요구사항: REQ-20260418-025 US-03 수용 기준 1

**절차**:
1. 새 창(시크릿)에서 Cognito 콜백 URL `https://.../#id_token=X&access_token=Y` 진입 (실사용 플로우 또는 test URL)
2. DevTools Application > Cookies 에서 `access_token`, `id_token` 존재 확인
3. Navigation 주소창에서 URL fragment 잔존 정책 관찰 (현재는 정리 안 함)

**기록 자리**: 쿠키 목록 스크린샷 또는 cookie 문자열 발췌 / URL fragment 상태.

### 3.5 시나리오 3 — 새로고침 / 라우트 전환 시 부작용 0 (FR-04 ③)
> 관련 요구사항: REQ-20260418-025 US-03 수용 기준 2

**절차**:
1. 시나리오 2 완료 후 쿠키 스냅샷 캡처 (A)
2. 브라우저 새로고침 (F5) 또는 `/log` ↔ `/file` 라우트 전환 반복 3회
3. DevTools Application > Cookies 에서 쿠키 재캡처 (B)
4. 기대: A == B (추가 부작용 없음)

**기록 자리**: A/B 쿠키 비교 결과 / `auth()` 호출 흔적 (console.log(`log(...)`) 로 간접 관찰 가능).

### 3.6 시나리오 4 — `window` resize listener 1개만 등록 (FR-04 ④)
> 관련 요구사항: REQ-20260418-025 US-02 수용 기준 1

**절차**:
1. 페이지 마운트 완료 후 DevTools Sources 또는 Elements 의 "Event Listeners" 패널
2. `window` 객체 선택 → "resize" 항목 확장
3. 등록 리스너 개수 확인
4. 기대: 1개 (StrictMode 이중 마운트 이후에도 cleanup 이 동작)

**기록 자리**: listener 개수 / listener 함수 소스 위치 (`App.jsx:XX`).

### 3.7 Baseline 수행 예시 섹션 (FR-05)
markdown-render-smoke 와 동일 형식:

```
## Baseline 수행 예시
- 운영자:
- 일자: YYYY-MM-DD
- 커밋 해시:
- 브라우저 + 버전:
- OS:
- 뷰포트 (초기):
- 결과:
  - 시나리오 1: [x] / 관측 min-height, 기대치 일치
  - 시나리오 2: [x] / 쿠키 목록
  - 시나리오 3: [x] / A==B
  - 시나리오 4: [x] / listener 1개
- 노트:
```

### 3.8 회귀 시나리오 섹션 (FR-06)
본 체크리스트를 재수행해야 하는 트리거:
- `src/App.jsx` 의 useEffect 재구조화 (특히 의존성 배열 변경)
- `src/common/common.js` 의 `auth()` 변경 (URL fragment 정리, PKCE 전환 등)
- Cognito 인증 흐름 변경
- React 19 bump 후 StrictMode effect 더블 invocation 영향 확인
- Cognito 콜백 URL 포맷 / 도메인 변경

### 3.9 1회 baseline 수행 (FR-07)
- 4 시나리오 모두 `[x]` 마감 + §3.7 박제 섹션 항목 100% 작성 + commit.
- REQ-022 / REQ-023 / REQ-024 와 같은 운영자 세션으로 묶어 검증 비용 분담 권장.

### 3.10 [WIP] online/offline 이벤트 리스너 cleanup 패턴 (REQ-20260419-022)

> 관련 요구사항: REQ-20260419-022 FR-01 ~ FR-06, US-01 ~ US-03

**맥락 (2026-04-19 관측)**: `src/App.jsx:50-64` 의 `online`/`offline` 이벤트 리스너 useEffect 가 의존성 배열 `[isOnline]` 을 가져 `isOnline` toggle 시마다 addEventListener/removeEventListener 사이클이 재실행된다. 같은 파일의 다른 2 useEffect (resize `:38-44`, auth `:46-48`) 는 `[]` 의존 — **본 useEffect 만 state 의존성** 으로 일관성 위반. React 18 strict mode 에서 double-invocation 시 add-remove-add 4 사이클 + 매 toggle 마다 재실행 → 메모리 churn + cleanup/re-add 사이 microtask 동안 native online/offline 이벤트 미처리 잠재성 (race). listener 본문 (`setIsOnline(navigator.onLine)`) 이 state 읽기 0 + setter 만 호출하므로 `[]` 의존이 안전한 stable closure — 의존성 배열 변경 1줄이 정합 정답.

**결함 패턴 (As-Is)**:
```jsx
useEffect(() => {
    const handleStatusChange = () => { setIsOnline(navigator.onLine); };
    window.addEventListener("online", handleStatusChange);
    window.addEventListener("offline", handleStatusChange);
    return () => {
        window.removeEventListener('online', handleStatusChange);
        window.removeEventListener('offline', handleStatusChange);
    }
}, [isOnline]);  // ← 의존성 결함 — rebind churn
```

**정합 패턴 (To-Be)**: 의존성 배열 `[isOnline]` → `[]` (1줄 변경). listener / addEventListener / removeEventListener / 함수 정의 위치 변경 0. 다른 2 useEffect 와 패턴 완전 일관.

```jsx
useEffect(() => {
    const handleStatusChange = () => { setIsOnline(navigator.onLine); };
    window.addEventListener("online", handleStatusChange);
    window.addEventListener("offline", handleStatusChange);
    return () => {
        window.removeEventListener('online', handleStatusChange);
        window.removeEventListener('offline', handleStatusChange);
    }
}, []);  // ← 마운트 시 1회 바인딩 + 언마운트 시 cleanup
```

**안티패턴 인식 체크 (본 spec 의 cleanup 정합 SSoT 역할)**:
- [ ] listener 본문이 setter 외부 state 를 읽지 않는다면 의존성 배열에 state 추가 금지 (rebind churn 불필요).
- [ ] listener 를 재등록해야 하는 유일한 경우는 handler 자체가 의존성 변경으로 재생성되는 경우 (예: prop handler) — 현재 App.jsx 는 해당 없음.
- [ ] addEventListener ↔ removeEventListener 는 **같은 함수 reference** 여야 하므로 함수 정의를 effect 안에 두어 cleanup scope 일치 보장.
- [ ] React 18 strict mode 의 double-invocation 시에도 cleanup 정합이 유지되면 최종 상태 정상.

**회귀 테스트 (FR-02 / FR-03, Must / Should)**:
- `src/App.test.jsx` 신규 ≥1 케이스:
  - `'subscribes to online/offline events once on mount'` — `vi.spyOn(window, 'addEventListener')` 호출 횟수 검증 (mount 시 online + offline 2회; strict mode 시 4회 예상).
  - `rerender(<App />)` 후 add 호출 횟수 변경 0.
- (Should) `'updates isOnline state on online/offline event'` — `window.dispatchEvent(new Event('online'))` / `'offline'` → UI 분기(`div--offline-contents`) 전환 어서트.
- (Should) `removeEventListener` 호출 횟수 — 언마운트 시 2회 (strict mode 시 2+ 정합).

**grep 수용 기준**:
- `grep -n "\[isOnline\]" src/App.jsx` → 0.
- `grep -c "useEffect.*\[\]" src/App.jsx` → 3 (resize + auth + online/offline).
- `grep -n "addEventListener.*online\|offline" src/App.jsx` → 2 (변경 없음).

**시나리오 4 (§3.6) 와의 관계**:
- §3.6 resize listener 1개 카운트 관찰과 같은 방식으로 online/offline 리스너가 **각 1개** (strict mode 후 cleanup 정합 기준) 등록됐음을 DevTools Event Listeners 패널로 보조 관찰 가능. 본 §3.10 가 §3.6 과 동일 방법론 확장.

**일관성 수용 (NFR 정합)**:
- App.jsx 3 useEffect 의 의존 패턴 일관 (`[]` × 3).
- listener 바인딩 수 = 마운트 1쌍 + 언마운트 1쌍 (strict mode 시 2배).
- 사용자 visible 회귀 0 (시각 동작 변경 0, cleanup 정합 + race 차단만).

**수용 기준 (REQ-20260419-022 §10)**:
- [ ] FR-01 `src/App.jsx:50-64` useEffect 의 의존성 배열 `[]` (1줄 변경).
- [ ] FR-02 회귀 테스트 `'subscribes to online/offline events once on mount'` PASS.
- [ ] (Should) FR-03 회귀 테스트 `dispatchEvent(new Event('online'))` / `'offline'` → UI 분기 전환 PASS.
- [ ] FR-04 본 §3.10 spec 박제 (본 반영으로 완료).
- [ ] FR-05 / FR-06 listener / cleanup 함수 변경 0 (함수 정의 / addEventListener / removeEventListener 호출 그대로).
- [ ] NFR 일관성: `grep -c "useEffect.*\[\]" src/App.jsx` → 3.
- [ ] NFR LOC 변경 ±2 이내.
- [ ] `npm run lint` clean (eslint-plugin-react-hooks exhaustive-deps 통과 — setter-only 호출이므로 `[]` 합법).
- [ ] 사용자 visible 회귀 0.

**범위 밖**:
- App.jsx 의 다른 useEffect (resize, auth) 변경 — 본 §3.10 범위 밖.
- `isOnline` UI 분기 (offline 페이지) 시각 디자인 변경.
- Service Worker / PWA 도입 — 별 후속 후보.
- `navigator.onLine` 초기값 검증 시점 / listener 외부 추출 (useCallback) — 본 §은 단순도 유지.
- React 19 bump (REQ-040) 자체 — 본 §은 bump 전 사전 정리 효과.
- TypeScript 변환.

---

## 4. 자동 테스트 보완 범위 (REQ-025 FR-01, FR-02)
본 체크리스트와 별개로 `common.auth()` **cookie 결과 등가성** 자동 테스트 1건을 `src/common/common.test.js` (또는 `src/App.test.jsx`) 에 추가 — 상세는 `specs/spec/green/app/App-spec.md` §5.2.1 참조. 자동 테스트는 StrictMode 이중 마운트 후 쿠키 상태의 단위 검증, 본 체크리스트는 시각/런타임 환경 baseline 박제 — 상호 보완.

---

## 5. 의존성

### 5.1 내부 의존
- `src/App.jsx` (useEffect resize + auth)
- `src/common/common.js` (`auth()`)
- `src/common/common.test.js`, `src/App.test.jsx` (자동 테스트 보완)

### 5.2 외부 의존
- 운영자 로컬 환경
- Chrome/Edge DevTools (Elements, Event Listeners, Cookies 패널)
- 선택적 Cognito test URL

### 5.3 역의존 (사용처)
- REQ-020 (React 19 bump, done) 머지 후 StrictMode 영향 재검증 시
- Cognito flow 개선 PR 의 회귀 기준선
- REQ-022 (web-vitals INP smoke), REQ-023 (focus-visible), REQ-024 (markdown baseline) 와 같은 세션 통합 가능

---

## 6. 수용 기준 (Acceptance — REQ-20260418-025)
- [ ] [WIP] `docs/testing/app-shell-side-effects-smoke.md` (또는 정한 위치) 존재
- [ ] [WIP] 4 시나리오 각각 (환경/절차/기대값/기록 자리) 구비
- [ ] [WIP] "Baseline 수행 예시" 섹션 신규
- [ ] [WIP] "회귀 시나리오" 섹션 신규 + 트리거 enum
- [ ] [WIP] 4 시나리오 모두 운영자 1회 baseline `[x]` 마감 + 결과 박제
- [ ] [WIP] `auth()` 결과 등가성 자동 테스트 1건 PASS (`src/common/common.test.js` 또는 `src/App.test.jsx`)
- [ ] [WIP] `App-spec.md` 에 본 체크리스트 1줄 reference 추가 (FR-08, 완료 — §11)
- [ ] 본 REQ result.md 에 baseline 수행 사실 + 박제 위치 reference
- [ ] `src/App.jsx`, `src/common/common.js` 런타임 변경 0 (Phase 1 자동 테스트 + Phase 2~4 문서만) — `git diff -- src/{App.jsx,common/common.js}` 검증
- [ ] `npm test` 100% PASS, `npm run lint`, `npm run build` 통과

> 관련 요구사항: REQ-20260418-025 §10

---

## 7. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 회귀 검출 (`auth()` 멱등) | 자동 테스트 0건 | 1건 PASS | REQ-025 NFR-01 |
| 가시성 (4 시나리오) | 0/4 baseline | 4/4 `[x]` | REQ-025 NFR-02 |
| 추적성 | N/A | 운영자/일자/해시/브라우저 100% 작성 | REQ-025 NFR-03 |
| 영향 (런타임 코드) | N/A | 변경 0 (Phase 1 테스트만) | REQ-025 NFR-04 |

---

## 8. 알려진 제약 / 이슈
- jsdom 의 `document.cookie` 가 `secure` / `site` attribute 를 부분만 반영 → 자동 등가성 비교는 cookie 본체 문자열 또는 파싱 객체 기준 (사유 inline 코멘트).
- DevTools Listener count 가 브라우저별 차이 가능 → Chrome/Edge 권장 + 다른 브라우저 별 baseline 추가 옵션.
- 운영자 baseline 세션 미수행 지속 위험 → REQ-022/023/024 와 단일 세션으로 묶음 권장.
- Cognito 콜백 시나리오의 정확한 fragment 정리 정책이 spec 부재 → 본 체크리스트 범위는 "현재 동작 박제" 만, 정책 결정은 별 후보.

---

## 9. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-025) | App 셸 사이드이펙트 수동 스모크 spec 초기화 (WIP) | all |
| 2026-04-19 | (pending, REQ-20260419-022) | online/offline 이벤트 리스너 cleanup 패턴 §3.10 신설 — `[isOnline]` → `[]` 의존성 정합 + rebind churn 방지 + race 차단 박제, App.jsx 3 useEffect 일관 (WIP) | 3.10 |
| 2026-04-19 | (pending, REQ-20260419-039) | REQ-022 §3.10 To-Be 코드 실현 트리거 — `src/App.jsx:64` `[isOnline]` → `[]` 1 LOC + App.test.jsx 회귀 가드 2 케이스 (addEventListener once / online-offline dispatch); 머지 후 §3.10 WIP 마감 + FR-01~03 수용 기준 `[x]` | 3.10 |
| 2026-04-20 | (inspector drift reconcile) | §3 헤더 rename: "(To-Be, WIP)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3 |

---

## 10. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-app-shell-side-effects-runtime-smoke-and-auth-idempotency.md`
- 관련 spec:
  - `specs/spec/green/app/App-spec.md` §5.2.1 (`auth()` 등가성 자동 테스트)
  - `specs/spec/green/common/clipboard-spec.md` §3.7 (런타임 스모크 패턴 참조)
  - `specs/spec/blue/testing/markdown-render-smoke-spec.md` (체크리스트 형식 참조)
- 원 followups (이동 후):
  - `specs/followups/consumed/2026/04/18/20260418-0322-app-auth-strictmode-side-effect-equivalence.md`
  - `specs/followups/consumed/2026/04/18/20260418-0322-app-resize-auth-manual-check.md`
- 외부 참고:
  - React StrictMode: https://react.dev/reference/react/StrictMode
  - MDN `Event Listeners` panel: https://developer.chrome.com/docs/devtools/dom/
