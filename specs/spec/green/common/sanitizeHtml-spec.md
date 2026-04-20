# 컴포넌트 명세: sanitizeHtml

> **위치**: `src/common/sanitizeHtml.js` (신규, WIP)
> **유형**: Util (Pure function module)
> **최종 업데이트**: 2026-04-20 (by inspector, drift reconcile — REQ-102 LogItem/Writer 호출부 통합 완료 ACK)
> **상태**: Active (모듈 도입 + 호출부 2곳 통합 완료 / 측정 + drift 정정 + 앵커 하위 정책 + 운영자 baseline 잔여)
> **관련 요구사항**:
> - REQ-20260418-001 (`specs/requirements/done/2026/04/18/20260418-sanitize-markdown-html-output.md`) — 모듈 도입
> - REQ-20260418-102 (`specs/requirements/done/2026/04/18/20260418-sanitize-html-logitem-writer-integration.md`) — LogItem/Writer 호출부 통합
> - REQ-20260418-103 (`specs/requirements/done/2026/04/18/20260418-sanitize-html-perf-bundle-measurement.md`) — 성능·번들 측정
> - REQ-20260418-104 (`specs/requirements/done/2026/04/18/20260418-sanitize-html-uri-safe-attr-spec-drift.md`) — §5.2 `ADD_URI_SAFE_ATTR` drift 정정
> - REQ-20260418-021 (`specs/requirements/done/2026/04/18/20260418-markdown-anchor-text-escape-and-manual-smoke.md`) — 앵커 텍스트 escape 정책 결정 (옵션 B 채택 시 본 spec §6 영향)
> - REQ-20260418-027 (`specs/requirements/done/2026/04/18/20260418-logitem-sanitize-runtime-smoke-baseline.md`) — LogItem sanitize 통합 후 `/log` 렌더 런타임 수동 스모크 baseline (WIP)

> 본 문서는 컴포넌트의 **현재 구현 상태 + 진행 중 변경 계획(WIP)** 을 기술하는 SSoT.
> WIP 항목은 `[WIP]` 또는 `> 관련 요구사항:` 헤더로 표시.

---

## 1. 역할 (Role & Responsibility)
`markdownParser` 가 산출한 HTML 문자열을 DOM 에 주입하기 직전에 **화이트리스트 기반으로 정제**하여 XSS 벡터를 무력화한다.

- 주 책임:
  - 허용 태그/속성만 통과시킴
  - URL 스킴 화이트리스트 적용 (`http`, `https`, `mailto`, 상대경로 `/`, 프래그먼트 `#`)
  - 외부 링크(`target="_blank"`) 에 `rel="noopener noreferrer"` 자동 보정
  - 정책을 단일 모듈에 고정 (정책 변경은 본 모듈에서만)
- 의도적으로 하지 않는 것:
  - 마크다운 파싱 (markdownParser 책임)
  - DOM 직접 주입 (호출부 `dangerouslySetInnerHTML` 책임)
  - 서버측 sanitize (서버 영역)
  - 자체 마크다운 엔진 교체 (별건)

> 관련 요구사항: REQ-20260418-001 §3.1 (In-Scope), §3.2 (Out-of-Scope)

## 2. 공개 인터페이스 (Public Interface)

### 2.1 Props / Arguments
| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `dirtyHtml` | `string` | Y | - | sanitize 대상 HTML 문자열 (markdownParser 출력) |

### 2.2 이벤트 / 콜백
없음 (순수 함수)

### 2.3 Exports
- default: `sanitizeHtml(dirtyHtml: string): string`
- named: 없음 (정책 상수는 모듈 내부 비공개)

## 3. 내부 상태 (Internal State)
모듈 레벨 상태 없음. DOMPurify 인스턴스/설정만 모듈 스코프 상수.

| 상태 | 타입 | 초기값 | 변경 트리거 |
|------|------|--------|-------------|
| `ALLOWED_TAGS` | `string[]` | (아래 §6) | 정책 변경 시만 |
| `ALLOWED_ATTR` | `string[]` | (아래 §6) | 정책 변경 시만 |
| `ALLOWED_URI_REGEXP` | `RegExp` | `/^(https?:|mailto:|\/|#)/i` | 정책 변경 시만 |

## 4. 의존성 (Dependencies)

### 4.1 내부 의존
- 없음 (markdownParser 와 호출부 사이 위치)

### 4.2 외부 의존
- 패키지: `dompurify` (런타임 dependency, FR-01)
  - 후보 대안: `isomorphic-dompurify` (브라우저 전용이므로 일반 `dompurify` 우선)
- 브라우저 API: `window` (DOMPurify 가 내부적으로 사용)

### 4.3 역의존 (사용처)
> 관련 요구사항: REQ-20260418-102 FR-01, FR-02, FR-05

- `src/Log/LogItem.jsx:83` — 본문 렌더 (REQ-001 FR-03, REQ-102 FR-01). **통합 완료** → `dangerouslySetInnerHTML={{ __html: sanitizeHtml(parser.markdownToHtml(contents)) }}` (commit `879e5d1`, task `20260418-sanitize-html-logitem-integration`; 2026-04-20 inspector drift reconcile).
- `src/Log/Writer.jsx:249` — 미리보기 렌더 (REQ-001 FR-04, REQ-102 FR-02). **통합 완료** → `dangerouslySetInnerHTML={{ __html: sanitizeHtml(convertedArticle) }}` (commit `9f06a0c`, task `20260418-sanitize-html-writer-integration`; 2026-04-20 inspector drift reconcile).
- (잠재) `src/Comment/*` — 향후 마크다운 도입 시

**[WIP] 통합 목표 패턴 (REQ-20260418-102)**:
```jsx
import sanitizeHtml from '../common/sanitizeHtml';
// ...
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(parser.markdownToHtml(contents)) }} />
```

- 두 파일 모두 동일 import / 호출 패턴 (분기 금지 — REQ-102 §8 제약).
- 호출부 변경 라인 수 ≤ 5 / 파일 (NFR-03 from REQ-102).
- sanitize 호출 1회 보장 (FR-06 Could): 동일 contents 렌더 사이클당 `useMemo` 로 재계산 방지 — 성능 측정(REQ-103) 후 결정.
- Writer 의 `isConvertedHTML === true` 분기 (텍스트 모드) 의 sanitize 필요성은 REQ-102 §13 미결 — 현재 raw string 표시이면 불필요, HTML 주입이면 필요.

**통합 후 검증 (REQ-102 §10)**: `grep -n "dangerouslySetInnerHTML" src/` 결과 2건 모두 sanitize 통과. 본 §4.3 의 "현재 상태: 미통합" 표기는 통합 완료 시 "통합 완료" 로 갱신 (REQ-102 FR-05).

## 5. 동작 (Current Behavior)

### 5.1 [WIP] 호출 흐름
> 관련 요구사항: REQ-20260418-001 FR-02, FR-03, FR-04

1. 호출부가 `markdownParser.markdownToHtml(text)` 결과를 `sanitizeHtml(...)` 에 전달
2. 모듈 내부에서 DOMPurify.sanitize 호출 (옵션은 §6 정책)
3. 후처리 훅: `target="_blank"` 가 있는 anchor 의 `rel` 에 `noopener` 과 `noreferrer` 보정 (FR-06)
4. 정제된 문자열 반환

### 5.2 [WIP] DOMPurify 옵션
> 관련 요구사항: REQ-20260418-104 FR-01, FR-04

```js
DOMPurify.sanitize(dirtyHtml, {
  ALLOWED_TAGS: [...],
  ALLOWED_ATTR: [...],
  ALLOWED_URI_REGEXP: /^(https?:|mailto:|\/|#)/i,
  ADD_ATTR: ['target', 'rel'],
  ADD_URI_SAFE_ATTR: ['target', 'rel'],   // REQ-20260418-104: DOMPurify 가 target 등 비URL 속성도 ALLOWED_URI_REGEXP 로 검사하므로 URI_SAFE 로 우회
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
});
```
DOMPurify 의 `afterSanitizeAttributes` 훅으로 `target=_blank` anchor 의 `rel` 보정.

**구현과 1:1 일치 (NFR-01, REQ-104 FR-04)**: 본 옵션 키 집합은 `src/common/sanitizeHtml.js:44-53` 의 두 번째 인자와 정확히 동일해야 한다. 키 추가/변경 시 spec 과 코드를 같은 PR 에서 갱신.

### 5.3 에러 / 엣지 케이스
- 빈 입력 (`""` / `null` / `undefined`): 빈 문자열 반환
- DOMPurify 미로드(서버 환경): 빈 문자열 반환 (브라우저 전용)
- 이미 sanitize 된 입력: 멱등 (재차 호출해도 동일 결과)
- **DOMPurify `URI_SAFE_ATTRIBUTES` 분기 (REQ-20260418-104 FR-02)**: DOMPurify v3.4.0 은 URL 이 아닌 속성값(`target` 등) 도 `ALLOWED_URI_REGEXP` 로 검사한다. `target="_blank"` 는 `/^(https?:|mailto:|\/|#)/i` 에 매칭되지 않아 제거됨. 이를 회피하려면 `ADD_URI_SAFE_ATTR: ['target', 'rel']` 옵션으로 해당 속성을 URI 검사에서 제외 처리. 본 옵션을 제거하면 단위 테스트 `adds rel=noopener noreferrer to target=_blank anchor` 가 실패하며, 사용자 화면에서 `target=_blank` 링크가 깨진다.

## 6. 데이터 스키마 (Data Shape)

### 6.1 [WIP] 허용 태그 화이트리스트
> 관련 요구사항: REQ-20260418-001 §3.1
```
p, br, hr, strong, em, del,
code, pre,
blockquote,
h1, h2, h3, h4, h5, h6,
ul, ol, li,
a, img,
span
```

### 6.2 [WIP] 허용 속성 화이트리스트
```
href, src, alt, title, target, rel, class
```
- `class` 는 syntax highlighter 가 만드는 `span--kotlin-*`, `span--yml-*` 보존 목적.
- 미해결 이슈(§13): `class` 를 모든 요소에 허용할지 `span` 한정으로 제한할지 — 본 spec 은 **전 요소 허용** 기본값으로 출발하되 정책 강화 여지를 둠.

### 6.3 [WIP] URL 스킴
```
^(https?:|mailto:|\/|#)/i
```
`javascript:`, `data:`, `vbscript:` 등 모두 차단.
- 단, `img[src]` 의 `data:image/*;base64` 허용 여부는 §13 미결.

### 6.4 [WIP] `<a>` 하위 태그 정책 (REQ-20260418-021)
> 관련 요구사항: REQ-20260418-021 FR-01, FR-02, FR-04 (옵션 B 분기), FR-09

**현재 상태** (Phase 1 분석 대상)
- `<a>` 하위 허용 태그 범위는 §6.1 `ALLOWED_TAGS` 전체에 대해 암묵적으로 열려 있다 — DOMPurify 는 `ALLOWED_TAGS` 에 없는 태그만 제거하므로 `<a>` 내부에 `<strong>`/`<em>`/`<code>`/`<del>` 외의 허용 태그(`<ul>`/`<ol>`/`<img>` 등) 가 들어와도 통과한다. 실제 마크다운 파서가 이런 구조를 산출하진 않지만 **정책 레벨로는 좁혀져 있지 않다**.
- 파서 측에서 앵커 표시 텍스트(`text`) 가 escape 되지 않음 (`markdownParser-spec.md` §5.5) → 사용자 입력에 `<script>` 등이 섞여도 sanitize 가 유일한 방어선이다.

**정책 결정 분기 (REQ-20260418-021 Phase 2)**
- **옵션 A / C 채택 시**: 본 §6.4 에 현 정책이 `ALLOWED_TAGS` 전역 + URL 스킴 화이트리스트 단일 방어임을 명시. sanitize 단위 테스트 추가(FR-04/FR-05)로 `<script>` 텍스트화를 회귀 차단.
- **옵션 B 채택 시**: `<a>` 하위 허용 태그를 `strong`/`em`/`code`/`del` 로 명시 제한. 구현 방식은 아래 둘 중 하나(태스크에서 결정):
  - DOMPurify `afterSanitizeElements` 훅으로 `<a>` 내부를 순회하며 비허용 태그를 `outerHTML`→`textContent` 치환
  - 또는 `ALLOWED_TAGS` 는 유지한 채 `uponSanitizeElement` 훅 내부에서 `element.parentElement?.tagName === 'A'` 이면 화이트리스트 재검사
- 옵션 B 채택 시 sanitize 단위 테스트 신규 1건 (`[<script>...](https://x)` 입력 → `<script>` 텍스트화, 정상 inline 마크업 `[**bold**](https://x)` 은 `<strong>` 유지) 필수 (REQ-20260418-021 FR-04, NFR-05 from 본 spec).

**기록**
- 채택 옵션: (A|B|C) — 결정 기록은 `markdownParser-spec.md` §5.5 단일 출처. 본 §6.4 는 참조만 유지하되 옵션 B 채택 시 구체 정책을 §6.1 `ALLOWED_TAGS` 및 §5.2 옵션 블록에 반영.
- 결정 사유 / 일자: (Phase 1 분석 완료 후)

## 7. 테스트 현황 (Current Coverage)
- 테스트 파일: `src/common/sanitizeHtml.test.js` (17건 PASS 기준선 — REQ-001 모듈 단위)
- 커버된 시나리오 (NFR-01 의 OWASP XSS 카탈로그 10종 + `target=_blank` 자동 보정):
  - [x] `<script>alert(1)</script>` 제거
  - [x] `<img src=x onerror="alert(1)">` 의 `onerror` 제거
  - [x] `[x](javascript:alert(1))` 의 href 제거 또는 무해화
  - [x] `<iframe src=...>` 제거
  - [x] `<svg onload=...>` 제거
  - [x] HTML 엔티티 우회(`&lt;script&gt;`) 무해
  - [x] 대소문자 우회(`<ScRiPt>`) 무해
  - [x] 공백 우회(`<img src = "x" onerror = "...">`) 의 `onerror` 제거
  - [x] CSS expression 우회 (`<style>` 자체가 ALLOWED_TAGS 에 없음으로 제거)
  - [x] `target="_blank"` anchor 에 `noopener noreferrer` 자동 추가

### 7.1 [WIP] 호출부 통합 회귀 테스트 (REQ-20260418-102 FR-03, FR-04)
> 관련 요구사항: REQ-20260418-102 FR-03, FR-04; US-01, US-02, US-03

- [x] `LogItem.jsx` 렌더 회귀: XSS 페이로드 스크립트 / 이벤트 속성 2건 PASS — commit `879e5d1` (`src/Log/LogItem.test.jsx` `LogItem sanitizes rendered markdown HTML` describe 블록, 2026-04-20 inspector drift reconcile)
- [x] `Writer.jsx` 미리보기 렌더 회귀: 페이로드 2건 PASS — commit `9f06a0c` (2026-04-20 inspector drift reconcile)
- [x] 빈/널 입력 회귀 (FR-04): `sanitizeHtml(...)` 빈 문자열 안전 처리 — `sanitizeHtml.test.js` 17건으로 커버 (2026-04-20 inspector drift reconcile)
- [~] 골든 픽스처 스냅샷 (US-03): `target=_blank` rel 보정 포함 — LogItem 통합 테스트에서 `noreferrer` → `noopener noreferrer` 기대값 갱신 확인 (commit `879e5d1`, result.md 박제); Writer 골든 스냅샷은 별 라운드
- **총 신규 테스트 4건 달성** (LogItem 2 + Writer 2) — commits `879e5d1` / `9f06a0c` (2026-04-20 inspector drift reconcile, REQ-102 §10).

### 7.1.1 [WIP] LogItem 런타임 수동 스모크 baseline (REQ-20260418-027)
> 관련 요구사항: REQ-20260418-027 FR-01~07, US-01~04

TSK-20260418-23 (commit `879e5d1`) 으로 `src/Log/LogItem.jsx:94` 가 sanitize 경유로 통합됐고 자동 회귀 테스트(242 PASS) 는 HTML 문자열 레벨에서 확인됐으나, **실제 `/log` 임의 항목의 시각 / 외부 링크 동작 / 이미지 렌더 / 코드 하이라이트** 는 자동 테스트 범위 밖. 본 요구사항은 운영자 1회 baseline 박제를 수행한다.

**문서 위치 (잠정)**: `docs/testing/logitem-sanitize-runtime-smoke.md` 단독 vs `docs/testing/markdown-render-smoke.md` 의 §LogItem 통합 — §13 미결 (REQ-027). 기본 권장: **`markdown-render-smoke.md` §LogItem 으로 통합** (markdown 렌더 스모크 세션 재활용, REQ-024 와 동일 세션).

**픽스처 4종 (FR-01~04)**:
1. **F1 — 헤더 / 리스트 / 코드블록 / blockquote**: `/log` 임의 항목에서 4 요소가 전역 CSS 와 매끄럽게 적용됨.
2. **F2 — 외부 링크**: 임의 외부 링크가 새 탭에서 열리고, DevTools Elements 에서 `target="_blank"` + `rel="noopener noreferrer"` 가 sanitize 후에도 보존.
3. **F3 — 이미지**: 임의 `<img>` 의 src / alt / title 모두 보존, broken image 0.
4. **F4 — 코드 하이라이트 (Should)**: 백틱 인라인 / 펜스 코드 블록의 시각 폰트 / 배경 / 줄바꿈 회귀 0. 파서가 하이라이트를 지원하지 않으면 `N/A` 마크 (§13 미결).

**Baseline 박제 섹션 (FR-05)**: 운영자 / 일자 / 해시 / 브라우저+버전 / OS / 디스플레이 모드 + F1~F4 결과 (PASS/FAIL/관찰 노트).

**회귀 가이드 (FR-07)**: 본 baseline 을 재수행해야 하는 트리거:
- `src/common/sanitizeHtml.js` 정책 변경 (ALLOWED_TAGS / ALLOWED_ATTR / URL 스킴)
- `src/common/markdownParser.js` 변경
- `src/Log/LogItem.jsx` 렌더 경로 변경
- 글로벌 CSS (App.css / Log.css / styles/index.css) 변경

**제약**: 코드 변경 0줄 (문서 신규/수정만), `git diff --stat src/` 빈 출력 (NFR-02).

**세션 통합**: REQ-024 (마크다운 스모크 baseline) 와 같은 운영자 세션 묶기 권장. REQ-025 (Clipboard 런타임 스모크) 와도 묶기 가능.

**TSK-23 DoD 연계 (NFR-01)**: 본 REQ-027 완료 시 TSK-23 result.md `## DoD 점검` 의 마지막 미완 항목(`수동: npm run dev → /log ... 1회`)을 `[x]` 또는 "본 REQ-027 의 baseline 박제로 해소" reference 로 마감 — 추적성 100% 회복.

**수용 기준 (REQ-027 §10)**:
- [ ] `docs/testing/logitem-sanitize-runtime-smoke.md` (또는 `markdown-render-smoke.md` §LogItem) 추가/확장
- [ ] F1~F4 픽스처 정의 + baseline 박제 슬롯 포함
- [ ] 운영자 1회 수행 후 환경 정보 + 4 픽스처 결과 commit
- [ ] TSK-23 DoD 미완 항목 해소 (`[x]` 또는 reference)
- [ ] 본 REQ-027 처리 PR 의 `npm test` / `npm run lint` / `npm run build` 회귀 0

### 7.2 [WIP] 성능 / 번들 측정 (REQ-20260418-103)
> 관련 요구사항: REQ-20260418-103 FR-01, FR-02, FR-03

본 측정은 REQ-102 통합 완료 후 단발성 태스크로 수행. 결과는 §8 NFR Status 표와 §11 관련 문서에 링크.

- **번들 측정 (FR-01)**: `npm run build` 를 통합 전 / 후 각 1회 실행, `build/assets/` 의 LogItem 청크 (또는 sanitizeHtml 별도 청크) 의 gzip 크기 diff 기록. 명령: `gzip -c build/assets/LogItem-*.js | wc -c`.
  - 목표: REQ-001 NFR-03 (+30KB gzip 이내) 충족 여부 판정.
- **마이크로 벤치 (FR-02)**: jsdom + `performance.now()` 환경에서 1KB / 4KB / 16KB 입력으로 1000회 반복 측정 → P50 / P75 / P95 산출.
  - 목표: REQ-001 NFR-02 (1KB 입력 P75 ≤ 1ms) 충족 여부 판정.
  - 벤치 위치 (REQ-103 §13 미결): vitest 별도 디렉토리 vs 일회성 스크립트 — planner 결정.
- **INP 샘플 (FR-04, Could)**: `src/reportWebVitals.js` 를 통해 `/log` 첫 진입 시 INP 1회 수집 (DevTools Performance 또는 web-vitals 콜백) — 수동.
- **결과 보관 (FR-03, REQ-103 §13 미결)**: `sanitizeHtml-spec.md` §8 / §11 에 inline 표로 추가 vs 신규 `docs/perf/sanitize-html-perf.md` — inspector 결정. 기본 권장: §8 NFR Status 표에 수치 추가 + 상세는 task `result.md`.

> 관련 요구사항: REQ-20260418-001 NFR-01 (10/10 pass, 통과 중), REQ-20260418-102 §10, REQ-20260418-103 §10

## 8. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 보안 | 모듈 도입 완료 / 호출부 미통합 (2건 미적용) | OWASP XSS 10종 100% 차단 + 호출부 0건 미적용 | NFR-01; 호출부 통합은 REQ-20260418-102 |
| 성능 | 미측정 | 1KB 입력 P75 ≤ 1ms | NFR-02 — 측정은 REQ-20260418-103 |
| 번들 크기 | 미측정 (모듈은 호출부 미통합으로 tree-shake 됨) | +30KB(gzip) 이내 | NFR-03 — 측정은 REQ-20260418-103 |
| 유지보수성 | 정책 단일 모듈 집약 | 정책 변경은 sanitizeHtml.js 에서만 | NFR-04 |
| 호환성 | markdownParser 단위 테스트 PASS | markdownParser 기존 테스트 전부 통과 | NFR-05 |
| 관측가능성 | 미적용 | sanitize 비활성 회귀 감지 (단위/통합 1건 이상 실패) | REQ-102 NFR-04 |

### 8.1 REQ-20260418-103 측정 결과 기록 위치 (WIP)
> 관련 요구사항: REQ-20260418-103 FR-03, NFR-03

통합 완료 후 측정 결과는 아래 표를 `task/done/.../result.md` 또는 본 spec 에 채워 기록:

| 측정 항목 | 기준선 | 측정값 | NFR 판정 | 측정 방법 |
|-----------|--------|--------|----------|-----------|
| LogItem 청크 gzip | (통합 전 빌드) | (측정 예정) | NFR-03 (+30KB 이내) | `gzip -c build/assets/LogItem-*.js \| wc -c` |
| 1KB 입력 P75 | 미측정 | (측정 예정) | NFR-02 (≤ 1ms) | jsdom + `performance.now()` × 1000 |
| 4KB 입력 P75 | 미측정 | (측정 예정) | 보고 only | 동일 |
| 16KB 입력 P75 | 미측정 | (측정 예정) | 보고 only | 동일 |
| `/log` 첫 진입 INP (Could) | 미측정 | (수동) | 보고 only | web-vitals v3 콜백 |

측정 환경 명시 (NFR-01 from REQ-103): jsdom 버전, Node 버전, 빌드 해시.

## 9. 알려진 제약 / 이슈
- DOMPurify 는 브라우저 전용. 노드 환경 테스트는 jsdom 필요 (vitest 기본 환경 OK).
- code highlighter 의 `<span class>` 보존 위해 `class` 속성 허용. 클래스명 이스케이프는 DOMPurify 기본 동작에 위임.
- 자체 `markdownParser` 의 string concat escape 결함은 본 sanitizer 가 후단 방어. 그러나 파서 단계의 `<`/`>`/`'`/`"`/`&` 이스케이프 보강(FR-07)은 별도 task.

## 9.1 수용 기준 통합 (REQ-102 + REQ-103 + REQ-104)

### 9.1.1 REQ-20260418-102 (호출부 통합)
- [x] `LogItem.jsx`, `Writer.jsx` 양쪽이 `dangerouslySetInnerHTML` 직전에 `sanitizeHtml(...)` 호출 — commits `879e5d1` / `9f06a0c` (2026-04-20 inspector drift reconcile)
- [x] `grep -n "dangerouslySetInnerHTML" src/` 결과 2건 모두 sanitize 통과 — 2026-04-20 실측 `src/Log/LogItem.jsx:83` + `src/Log/Writer.jsx:249` 양쪽 sanitize 경유 확인
- [x] 신규 회귀 테스트 ≥ 4건 (LogItem 2 + Writer 2) — commits `879e5d1` / `9f06a0c`
- [x] `npm test` PASS + `npm run lint` PASS — 각 task result.md 박제
- [x] 본 §4.3 의 "현재 상태: 미통합" 표기가 "통합 완료" 로 갱신 — 2026-04-20 inspector drift reconcile
- [ ] Writer 미리보기 시각 baseline — `docs/testing/writer-preview-sanitize-visual-smoke.md` (REQ-20260418-028 §3.B.2, 배치 2) 운영자 1회 수행. 6 픽스처 (평문 / 코드블록 / 외부링크 `target=_blank rel="noopener noreferrer"` 정규화 / 리스트 / 이미지 / XSS 차단). 상세: `specs/spec/green/testing/post-merge-visual-smoke-spec.md` §3.B.2

### 9.1.2 REQ-20260418-103 (성능·번들 측정)
- [ ] 번들 diff 표 1건 (통합 전/후 chunk gzip)
- [ ] 마이크로 벤치 결과 표 1건 (1KB/4KB/16KB × P50/P75/P95)
- [ ] NFR-02 (1KB P75 ≤ 1ms) + NFR-03 (+30KB 이내) 충족/미달 판정 명시
- [ ] 결과가 `sanitizeHtml-spec.md` §8.1 표 또는 신규 perf 문서에 영구 기록 (NFR-03 from REQ-103)

### 9.1.3 REQ-20260418-104 (spec drift 정정)
- [x] §5.2 옵션 블록에 `ADD_URI_SAFE_ATTR: ['target', 'rel']` 추가됨 (본 업데이트로 반영)
- [x] §5.3 에 DOMPurify `URI_SAFE_ATTRIBUTES` 분기 메모 1줄 이상 (본 업데이트로 반영)
- [x] spec 변경 이력 갱신 (본 업데이트로 반영)
- [ ] (FR-04 Should) §5.2 의 옵션 키 집합이 `src/common/sanitizeHtml.js:44-53` 와 1:1 일치 — inspector 수동 검토 완료 여부

### 9.1.5 REQ-20260418-027 (LogItem 런타임 수동 스모크 baseline)
> 관련 요구사항: REQ-20260418-027 §10

- [x] §7.1.1 섹션 신설 (본 업데이트로 반영)
- [x] `docs/testing/logitem-sanitize-runtime-smoke.md` 또는 `markdown-render-smoke.md` §LogItem sanitize runtime smoke 추가 (commit `cd8a1fe`, F1~F4 섹션 박제 완료)
- [x] F1~F4 픽스처 정의 + baseline 박제 슬롯 (commit `cd8a1fe`)
- [ ] 운영자 1회 수행 + 4 픽스처 결과 commit — **REQ-20260419-017 로 이관** (3 체크리스트 묶음 세션, 상세는 `specs/spec/green/styles/css-modules-spec.md` §10.8)
- [ ] TSK-23 DoD 미완 항목 해소 (`[x]` 또는 reference) — 위 운영자 수행 후 자동 해소
- [x] 코드 변경 0줄 (`git diff --stat src/` 빈 출력) — §7.1.1 + 문서 신설만
- [x] `npm test` / `npm run lint` / `npm run build` 회귀 0

### 9.1.6 REQ-20260419-017 (묶음 baseline 1차 운영자 수행)
> 관련 요구사항: REQ-20260419-017 §10; 상세는 `specs/spec/green/styles/css-modules-spec.md` §10.8

- [ ] `docs/testing/markdown-render-smoke.md` §LogItem sanitize runtime smoke §Baseline 수행 기록 테이블 1행 박제 (F1 / F2 / F3 / F4 PASS/FAIL).
- [ ] 환경 매트릭스 = Chrome 130+ + macOS 14 + `npm run dev` 1조합 (FR-09).
- [ ] 박제 형식 = 일자 / 운영자 (park108) / 환경 / 커밋 해시 / 결과 요약 / 노트 6칸 (FR-07).
- [ ] 본 §9.1.5 의 "운영자 1회 수행" 체크박스를 `[x]` 또는 REQ-20260419-017 commit reference 로 마감 (별 inspector 라운드).
- [ ] TSK-23 DoD 미완 항목 해소 — REQ-20260419-017 baseline 박제 commit reference.
- [ ] FAIL 픽스처 발견 시 `specs/followups/` 에 분기 항목 신규 생성 (FR-06).

### 9.1.4 REQ-20260418-021 (앵커 텍스트 escape 정책)
> 관련 요구사항: REQ-20260418-021 FR-01 ~ FR-10
- [x] §6.4 `<a>` 하위 태그 정책 섹션 신설 (본 업데이트로 반영)
- [ ] Phase 1 분석 결과 반영: 현 `ALLOWED_TAGS`/`ALLOWED_ATTR` 실측 + `<a>` 하위 허용 범위 확정 기록 (§6.4)
- [ ] 옵션 B 채택 시: `ALLOWED_TAGS`/정책 강화 구현 + 단위 테스트 ≥1건 (`[<script>...](https://x)` → `<script>` 텍스트화, 정상 inline `[**x**](https://x)` → `<strong>` 유지)
- [ ] 옵션 B 채택 시: §5.2 옵션 블록 및 §6.1 ALLOWED_TAGS 갱신 + 본 spec §10 changelog 엔트리
- [ ] 결정 단일 출처 참조 링크: 본 §6.4 ↔ `markdownParser-spec.md` §5.5 양방향 교차 참조 유지
- [ ] `npm test` PASS + `npm run lint` PASS

## 10. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-18 | (pending) | 신규 sanitize 모듈 도입 (WIP) | all |
| 2026-04-18 | (pending, REQ-20260418-104) | §5.2 옵션 블록에 `ADD_URI_SAFE_ATTR` 추가 + §5.3 URI_SAFE_ATTRIBUTES 분기 메모 (spec drift 정정) | 5.2, 5.3 |
| 2026-04-18 | (pending, REQ-20260418-102) | LogItem/Writer 호출부 통합 (WIP) — §4.3 미통합 표기 + §7.1 회귀 테스트 계획 | 4.3, 7.1, 8, 9.1.1 |
| 2026-04-18 | (pending, REQ-20260418-103) | 성능·번들 측정 결과 기록 위치 + 측정 표 초기화 (WIP) | 7.2, 8.1, 9.1.2 |
| 2026-04-18 | (pending, REQ-20260418-021) | §6.4 `<a>` 하위 태그 정책 섹션 신설 (옵션 B 분기 플레이스홀더) + §9.1.4 수용 기준 추가 | 6.4, 9.1.4 |
| 2026-04-18 | TSK-20260418-23 (merged, commit `879e5d1`) | `src/Log/LogItem.jsx:94` sanitize 경유 통합 완료 (자동 회귀 242 PASS) | 4.3 (통합 완료로 갱신 예정), 7.1 |
| 2026-04-18 | (pending, REQ-20260418-027) | LogItem 런타임 수동 스모크 baseline §7.1.1 신설 + §9.1.5 수용 기준 추가 (WIP) | 7.1.1, 9.1.5 |
| 2026-04-18 | (pending, REQ-20260418-028) | §9.1.1 에 `writer-preview-sanitize-visual-smoke.md` (배치 2) cross-link 추가 (WIP) | 9.1.1 |
| 2026-04-19 | TSK-20260418-27 (merged, commit `cd8a1fe`) | `docs/testing/markdown-render-smoke.md` §LogItem sanitize runtime smoke (F1~F4) 섹션 신설 완료 — §9.1.5 "F1~F4 픽스처 정의 + baseline 박제 슬롯" 항목 충족 | 9.1.5 |
| 2026-04-19 | (pending, REQ-20260419-017) | §9.1.6 묶음 baseline 1차 운영자 수행 수용 기준 신설 (3 체크리스트 묶음 세션, LogItem sanitize F1~F4 baseline 박제) (WIP) | 9.1.5, 9.1.6 |
| 2026-04-20 | (inspector drift reconcile) | §4.3 LogItem/Writer 호출부 "미통합" → "통합 완료" ACK (commits `879e5d1` / `9f06a0c`, tasks `20260418-sanitize-html-logitem-integration` + `20260418-sanitize-html-writer-integration`). §7.1 회귀 테스트 4건 [x] 전환. §9.1.1 REQ-102 수용 5/6 [x] (Writer preview visual baseline 은 REQ-028 운영자 영역 잔여). 라인 번호 현행화: LogItem `:93` → `:83`, Writer `:271` → `:249`. 커밋 영향: 본 spec 단독. | 4.3, 7.1, 9.1.1 |

## 11. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-sanitize-markdown-html-output.md`
- 후속 요구사항 (모두 이동 후 `specs/requirements/done/2026/04/18/`):
  - REQ-20260418-102 (호출부 통합): `20260418-sanitize-html-logitem-writer-integration.md`
  - REQ-20260418-103 (성능·번들 측정): `20260418-sanitize-html-perf-bundle-measurement.md`
  - REQ-20260418-104 (spec drift 정정): `20260418-sanitize-html-uri-safe-attr-spec-drift.md`
  - REQ-20260418-021 (앵커 텍스트 escape 정책, 옵션 B 분기): `20260418-markdown-anchor-text-escape-and-manual-smoke.md`
  - REQ-20260418-027 (LogItem 런타임 수동 스모크 baseline): `20260418-logitem-sanitize-runtime-smoke-baseline.md`
- 관련 spec:
  - `specs/spec/green/testing/markdown-render-smoke-spec.md` (통합 후보 문서 위치)
  - `specs/spec/green/testing/app-shell-side-effects-smoke-spec.md` (세션 통합 후보)
- 관련 컴포넌트 명세:
  - `specs/spec/green/common/markdownParser-spec.md` (입력 산출자, 후단 방어 관계; §5.5 앵커 텍스트 escape 정책 단일 출처)
- 진행 중/예정 task: (planner 가 생성 예정 — REQ-102 선행, REQ-103 후행)
- 외부 참고:
  - DOMPurify: https://github.com/cure53/DOMPurify
  - DOMPurify `URI_SAFE_ATTRIBUTES` 옵션: DOMPurify README
  - OWASP XSS Filter Evasion: https://owasp.org/www-community/xss-filter-evasion-cheatsheet
  - React `dangerouslySetInnerHTML`: https://react.dev/reference/react-dom/components/common#dangerouslysetinnerhtml
  - web-vitals v3 (INP): https://web.dev/inp/
