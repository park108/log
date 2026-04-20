# 명세: 접근성 (Accessibility) 정책

> **위치**:
> - 대상 소스: `src/{Monitor,File,Image,Search,Log,Comment}/*.jsx` (키보드 활성화 9곳)
> - 도구: `.eslintrc.yml`, `package.json` (eslint-plugin-jsx-a11y)
> - 선택적 문서: `docs/a11y/` 또는 본 spec 단일 출처
> **유형**: 정책 / 공통 패턴 + 린트 규칙
> **최종 업데이트**: 2026-04-20 (by inspector, drift reconcile — §2.1 REQ-029 잔여 3곳 [WIP]→머지 ACK)
> **상태**: Experimental (신규 spec, 도입 전)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260418-non-button-onclick-keyboard-a11y.md` (REQ-20260418-017)
> - `specs/requirements/done/2026/04/18/20260418-eslint-jsx-a11y-plugin-adoption.md` (REQ-20260418-018)
> - `specs/requirements/done/2026/04/18/20260418-focus-visible-css-policy-keyboard-activatables.md` (REQ-20260418-023) — focus-visible 정책 + CSS 일괄 도입 (WIP)
> - `specs/requirements/done/2026/04/18/20260418-activateonkey-helper-extraction.md` (REQ-20260418-025) — `activateOnKey` 공통 헬퍼 추출 (WIP)
> - `specs/requirements/done/2026/04/19/20260419-a11y-pattern-b-sweep-inline-activateonkey.md` (REQ-20260419-001) — pattern B 6 컴포넌트 인라인 `activateOnKey` 제거 + `@/common/a11y` import 일원화 sweep (WIP)
> - `specs/requirements/done/2026/04/18/20260418-a11y-remaining-3-callers-file-image.md` (REQ-20260418-029) — 잔여 3곳(FileItem×2, ImageSelector) 9곳 매트릭스 마감 (WIP)
> - `specs/requirements/done/2026/04/18/20260418-button-ua-style-reset-css-pattern-a.md` (REQ-20260418-030) — 패턴 A UA 기본 스타일 reset 정책 (WIP)
> - `specs/requirements/done/2026/04/18/20260418-e2e-keyboard-a11y-playwright-evaluation.md` (REQ-20260418-031) — 키보드/시각 a11y E2E (Playwright/Cypress) 도입 평가 (WIP)
> - `specs/requirements/done/2026/04/19/20260419-keyboard-a11y-runtime-smoke-checklist-doc.md` (REQ-20260419-002) — `docs/testing/keyboard-a11y-runtime-smoke.md` 수동 스모크 체크리스트 신설 (WIP)
> - `specs/requirements/done/2026/04/19/20260419-eslint-v9-flat-config-migration.md` (REQ-20260419-003) — ESLint v9 + flat config 마이그레이션, legacy `.eslintrc.yml` 종료 (WIP)
> - `specs/requirements/done/2026/04/19/20260419-eslintrc-enlarged-ignore-dead-config-removal.md` (REQ-20260419-014) — `react/no-unknown-property` ignore 목록 dead 항목 `enlarged` 1줄 제거 (REQ-026 후속 정리; WIP)
> - `specs/requirements/done/2026/04/19/20260419-commentform-writer-alert-replace-with-toaster-a11y.md` (REQ-20260419-021) — CommentForm / Writer 의 `window.alert(...)` 입력 검증 모달 → Toaster + inline `aria-invalid` / `aria-describedby` / `role="alert"` 인라인 에러 메시지 (WCAG 3.3.1 / 3.3.3, WIP)

> 본 문서는 프로젝트의 **a11y (접근성) 공통 정책** SSoT. WCAG 2.1 AA 를 기준선으로 한다.
> 시각 대비 / 스크린리더 실기 검증 / ARIA live region 등 세부 카테고리는 후속 spec 에 분할 가능.

---

## 1. 역할 (Role & Responsibility)
키보드 접근성 / 포커스 가시성 / 역할-동작 일치 를 포함한 기본 a11y 수준을 유지하고, 신규 회귀를 자동 차단한다.

- 주 책임:
  - 클릭 가능 요소의 키보드 활성화 패턴 정의 (REQ-017)
  - `eslint-plugin-jsx-a11y` 규칙셋 관리 (REQ-018)
  - 비활성화 / 완화 규칙에 대한 사유 기록
  - WCAG 2.1 AA 대응 현황 가시화
- 의도적으로 하지 않는 것:
  - 색 대비 / 폰트 크기 자동 검증 (별 후보)
  - 스크린리더 실기 검증 (NVDA / VoiceOver) — 수동 체크리스트로 분리
  - 라우팅 시 포커스 관리 / ARIA live region 확대 — 별 후보
  - TS-aware 린트 (`@typescript-eslint/*`) — TS 마이그레이션 의존, 별 spec

---

## 2. [WIP-A] 키보드 접근성 패턴 (REQ-20260418-017)

> 관련 요구사항: REQ-20260418-017 FR-01~08, US-01~04

### 2.1 현재 결함 (9곳)
코드 grep 기반. 모두 `<span>` / `<div>` 가 `onClick` 을 가졌으나 `tabIndex` / `onKeyDown` 부재 → 키보드 사용자 접근 불가.

| # | 파일:라인 | 동작 | 기존 속성 | 진행 |
|---|-----------|------|-----------|------|
| 1 | `src/Monitor/VisitorMon.jsx:278` | Retry | onClick 만 | **머지** (`2f1427b`, 패턴 B) |
| 2 | `src/Monitor/VisitorMon.jsx:286` | Retry | onClick 만 | **머지** (`2f1427b`, 패턴 B) |
| 3 | `src/Monitor/ContentItem.jsx:154` | Retry | onClick 만 | **머지** (`d8cd8bb`, 패턴 B) |
| 4 | `src/Monitor/WebVitalsItem.jsx:131` | Retry | onClick 만 | **머지** (`1289201`, 패턴 B) |
| 5 | `src/Monitor/ApiCallItem.jsx:180` | Retry | onClick 만 | **머지** (`179a37b`, 패턴 B) |
| 6 | `src/File/FileItem.jsx:71` | filename 복사 (copyFileUrl) | `<div role="button" onClick>` | **머지** (`24493bb`, 패턴 B — REQ-029 §2.1.1) |
| 7 | `src/File/FileItem.jsx:85` | 삭제 (confirmDelete) | `<span onClick role="button">` | **머지** (`24493bb`, 패턴 B — REQ-029 §2.1.1) |
| 8 | `src/Image/ImageSelector.jsx:137-141` | Retry | `<span onClick>` | **머지** (`695e65d`, 패턴 B — REQ-029 §2.1.1) |
| 9 | `src/Search/SearchInput.jsx:91-99` | 모바일 검색 토글 | (패턴 A 전환됨) | **머지** (`f980c1a`, 패턴 A) |

추가 관찰:
- `grep -rn "tabIndex" src/` → **0건** (프로젝트 전역 0; 9곳 마감 시 패턴 B 채택분만큼 증가)
- `grep -rn "onKeyDown\|onKeyPress\|onKeyUp" src/` → 5곳 패턴 B 머지 + SearchInput 의 검색 입력 `onKeyUp`. 잔여 3곳 처리 후 재측정.
- **현 진행률: 9/9 머지** (REQ-017 + `f980c1a` 패턴 A 전환분 1곳 + REQ-029 잔여 3곳 머지: `24493bb` FileItem×2 + `695e65d` ImageSelector — 2026-04-20 inspector drift reconcile). 9/9 매트릭스 마감.

### 2.1.1 [WIP] 잔여 3곳 마감 (REQ-20260418-029)

> 관련 요구사항: REQ-20260418-029 FR-01 ~ FR-11, US-01~US-04

**맥락 (2026-04-18 관측)**: REQ-017 정책 정의 후 6곳(Monitor 4 + SearchInput 1 + ContentItem 1) 이 6개 PR 로 점진 머지됐고 **3곳 잔존**. followup `20260418-0752-a11y-remaining-callers-grep-progress` 의 grep 박제:
```
src/File/FileItem.jsx:66:				<div className="div div--fileitem-filename" role="button" onClick={copyFileUrl} >
src/File/FileItem.jsx:80:						<span onClick={confirmDelete} className="span span--fileitem-delete" role="button">✕</span>
src/Image/ImageSelector.jsx:137:					<span onClick={(e) => {
```
이후 포맷팅 반영으로 실제 라인은 `FileItem.jsx:71`, `:85`, `ImageSelector.jsx:137-141` (§2.1 표 반영).

**목표 패턴 (위치별 결정, planner 영역)**:
- **행 #6 (FileItem filename 복사)**: 패턴 A (`<button>` 교체) 또는 B (`tabIndex={0}` + `onKeyDown={activateOnKey(copyFileUrl)}`) — 둘 다 허용. `role="button"` 기존 부착 → 패턴 B 로 최소 변경 가능.
- **행 #7 (FileItem 삭제 ✕)**: **패턴 A 권장** — ✕ 한 글자 작은 버튼은 native `<button>` 이 자연스러움. UA 기본 스타일 reset 은 REQ-030 (§2.2.2) 정책에 의해 적용 의무.
- **행 #8 (ImageSelector Retry)**: **패턴 B 권장** — 다른 Retry 패턴(VisitorMon, ContentItem, WebVitalsItem, ApiCallItem) 과 일관, `activateOnKey` 헬퍼(§2.2.1) 재사용. 패턴 A 선택 시 `<button>` 으로 복귀하면 native focus + cursor 자연 획득.

**단위 테스트 요구 (REQ-029 FR-04, FR-05)**:
- `src/File/FileItem.test.jsx` (현재 부재) **신규 파일** 또는 동등 위치 — 키보드 a11y 케이스 ≥3건:
  - filename Enter → `copyFileUrl` 1회 + Toaster 노출 + scrollY 0
  - filename Space → 동등
  - 삭제 ✕ Enter/Space → `confirmDelete` 호출
  - (패턴 A 채택 시) `expect(element.tagName).toBe('BUTTON')` + native focus 가능
  - (패턴 B 채택 시) `tabIndex === 0` + `onKeyDown` 바인딩 어서트
- `src/Image/ImageSelector.test.jsx` — Retry Enter/Space 케이스 ≥1건 추가.

**수용 grep (§2.4 와 일관)**:
- 본 잔여 3곳 머지 후 `grep -rn "<span\|<div\|<li" src/ | grep "onClick" | grep -v "\.test\." | grep -v "tabIndex"` → **0 lines** (§2.4 FR-06).
- 패턴 B 채택 위치는 `import { activateOnKey } from '@/common/a11y'` 사용 (REQ-025 머지 후) — 헬퍼 미머지 시 인라인 정의 허용, REQ-025 후속 sweep.

**운영자 baseline (REQ-028 매트릭스)**:
- `docs/testing/keyboard-activation-smoke.md` (REQ-028 §3.B.4) 매트릭스의 잔존 3행(FileItem×2, ImageSelector Retry) 이 TBD → 데이터 로 채워짐. 본 REQ 머지 후 운영자 1회 순회 baseline.

**수용 기준 (REQ-20260418-029 §10)**:
- [ ] 행 #6, #7, #8 에 패턴 A 또는 B 적용 (1~3 PR, planner 분할)
- [ ] `grep -rn "<span\|<div\|<li" src/ | grep "onClick" | grep -v "\.test\." | grep -v "tabIndex"` → 0 lines (result.md 박제)
- [ ] FileItem / ImageSelector 키보드 a11y 단위 테스트 ≥4건 PASS
- [ ] `npm test` / `npm run lint` / `npm run build` 회귀 0
- [ ] §2.1 표 진행 열이 9/9 "머지" 로 갱신 (본 REQ 머지 후 inspector 후속 또는 본 섹션 유지)
- [ ] §2.4 수용 grep 결과 박제
- [ ] REQ-028 `keyboard-activation-smoke.md` 매트릭스 9/9 데이터
- [ ] 번들 영향 ≤+0.5KB gzip
- [ ] (패턴 A 채택 시) §2.2.2 UA reset 정책 자동 준수

**범위 밖**: 9곳 외 위치 발굴, modal a11y (focus trap / Esc), NVDA/VoiceOver 실기, React 19 strict mode 영향, `activateOnKey` 헬퍼 추출 자체 (REQ-025 영역).

### 2.2 목표 패턴 (두 선택지)
각 위치마다 아래 두 패턴 중 하나를 적용. planner 가 시각 회귀 영향과 함께 위치별 결정.

**패턴 A (선호, 시각 영향 작은 곳):** `<button type="button">` 교체.
- 시각 유지를 위해 기존 클래스(`.span--monitor-retrybutton` 등) 를 `.button--...` 로 옮기거나 기존 그대로 버튼에 적용.
- `type="button"` 명시 — form 내부에서 실수 submit 방지.
- 기본적으로 `<button>` 은 포커스 가능 + Enter/Space 활성화 → 추가 핸들러 불필요.

**패턴 B (시각 강제 보존 필요시):** 기존 태그 유지 + `tabIndex={0}` + `role="button"` (있으면 유지) + `onKeyDown`:
```jsx
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handler();
  }
}}
```
- `onClick` 과 `onKeyDown` 이 같은 `handler` 를 호출 — DRY.
- `e.preventDefault()` 로 Space 페이지 스크롤 충돌 방지.

**패턴 표준화 (FR-07)**: 9곳에 같은 패턴 1개 권장. 분기가 필요하면 사유를 코드 코멘트에 기록.

### 2.2.1 [WIP] `activateOnKey` 공통 헬퍼 (REQ-20260418-025)

> 관련 요구사항: REQ-20260418-025 FR-01 ~ FR-08, US-01~US-03

**현재 상태 (2026-04-18 관측)**:
- `grep -rn "activateOnKey" src/` → `src/Monitor/VisitorMon.jsx:23` 정의 (`:293`, `:307` 사용), `src/Monitor/ApiCallItem.jsx:33` 정의 (`:195` 사용). 두 정의 본문은 **byte-단위 동일** (22 byte 함수).
- 미정 5곳(ContentItem, WebVitalsItem, FileItem×2, ImageSelector, SearchInput) 이 패턴 B 로 머지되면 최대 9중 중복 가능.

**목표 (To-Be)**:
- `src/common/a11y.js` 신설 — named export `activateOnKey(handler)` 단일 정의:
  ```js
  // 패턴 B 공통 헬퍼 — accessibility-spec §2.2 기반
  export const activateOnKey = (handler) => (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  };
  ```
- `src/common/a11y.test.js` 신설 — Enter / Space / preventDefault / 비-타겟 키 무시 / handler 방어 4~5 케이스 집중 검증.
- `src/Monitor/VisitorMon.jsx`, `src/Monitor/ApiCallItem.jsx` 의 인라인 정의 제거 → `import { activateOnKey } from '@/common/a11y'` 로 교체. 호출 사이트 변경 없음.
- path alias: `@/common/a11y` (vite.config.js 의 `@/common` alias 활용).
- export 형태: **named** (tree-shake + IDE 자동완성). default export 미사용.
- JSDoc 1~2줄 권장 (목적 + 본 §2.2 링크).

**§2.2 본문 정정**: 본 §2.2.1 도입 후 §2.2 의 "패턴 B" 본문은 **인라인 정의가 아닌 import 예시**로 정정:
```jsx
import { activateOnKey } from '@/common/a11y';
// ...
onKeyDown={activateOnKey(handler)}
```
미정 5곳 패턴 B 적용 시 동일 import 의무. 인라인 정의 재등장 0건 (FR-03 수용 기준).

**테스트 정리 가이드 (FR-08, Could)**:
- 컴포넌트별 Enter/Space 단위 테스트 중복은 smoke 1 케이스로 축약 가능. 정밀 검증은 `a11y.test.js` 에 집중.
- 현 단위 테스트 유지도 허용 (점진 정리).

**Keydown 정책**: `keydown` 사용 통일 (`keyup` 금지). Space 의 페이지 스크롤 충돌 차단을 위해 `preventDefault()` 필수. 입력 필드(`<input>`, `<textarea>`) 위 헬퍼 사용 금지 (사용 위치 책임).

**수용 기준 (REQ-20260418-025 §10)**:
- [ ] `src/common/a11y.js` 존재, named export `activateOnKey`
- [ ] `src/common/a11y.test.js` 4~5 케이스 PASS
- [ ] `grep -rn "const activateOnKey" src/Monitor/` → 0 hits (인라인 제거)
- [ ] `grep -rn "import.*activateOnKey.*@/common/a11y" src/Monitor/` → 2 hits (VisitorMon, ApiCallItem)
- [ ] accessibility-spec §2.2 본문이 import 패턴으로 정정됨 (본 §2.2.1 추가와 함께 완료)
- [ ] 번들 영향 ≤ +0.5KB gzip
- [ ] `npm test` / `npm run lint` / `npm run build` 회귀 0

**범위 밖**: 패턴 A (`<button>` 교체) 는 네이티브 포커스/키보드 지원으로 헬퍼 무관. 미정 5곳 패턴 B 적용 자체는 §2.1 의 별 태스크. `useFocusTrap`/`liveAnnounce` 등 타 a11y 헬퍼는 별 후보. TypeScript 타입(`a11y.ts`) 은 TS 마이그레이션 의존.

### 2.2.1.1 [WIP] 인라인 `activateOnKey` 정의 6 컴포넌트 sweep (REQ-20260419-001)

> 관련 요구사항: REQ-20260419-001 FR-01 ~ FR-06, US-01~US-03

**맥락 (2026-04-19 관측)**: REQ-20260418-025 (커밋 `9065aee`) 가 `src/common/a11y.js` 단일 출처(SSoT) 와 단위 테스트 5건을 도입했으나, pattern B 를 사용하는 **6개 컴포넌트는 여전히 인라인 정의** 보유 — `a11y.js` 모듈은 dead export. 결과적으로 정책 변경(Space 외 키 추가, 모바일 터치 분리 등) 이 7곳(인라인 6 + helper 1) 동시 수정 강제 → SSoT 가치 미발현.

**참조 (식별자 기반, 라인 번호는 보조 — §참고: 라인 번호는 작성 시점 스냅샷)**:
| 파일 | 식별자 | 보조 라인 |
|------|--------|-----------|
| `src/Monitor/VisitorMon.jsx` | `const activateOnKey` 정의 | `:23` (사용: `:293`, `:307`) |
| `src/Monitor/ContentItem.jsx` | `const activateOnKey` 정의 | `:20` |
| `src/Monitor/WebVitalsItem.jsx` | `const activateOnKey` 정의 | `:15` |
| `src/Monitor/ApiCallItem.jsx` | `const activateOnKey` 정의 | `:33` (사용: `:195`) |
| `src/File/FileItem.jsx` | `const activateOnKey` 정의 | `:16` |
| `src/Image/ImageSelector.jsx` | `const activateOnKey` 정의 | `:11` |
| `src/common/a11y.js` | `const activateOnKey` 정의 (유지) | `:12` |

**목표 (FR-01 ~ FR-04)**:
- 6 파일의 인라인 `const activateOnKey = (handler) => (event) => {...}` 제거.
- 각 파일 상단에 `import { activateOnKey } from '@/common/a11y';` 추가 (vite alias `@/common`).
- 호출부(`onKeyDown={activateOnKey(handler)}`) 바이트 동등 유지 — 정책 변경 0.
- `src/common/a11y.js` 가 번들 청크 ≥1개에 포함되도록 dead export 해제 확인.

**검증 (FR-05)**:
- `grep -rn "const activateOnKey" src/` → `src/common/a11y.js` 1건만.
- `grep -rn "import.*activateOnKey.*@/common/a11y" src/` → 6 hits (VisitorMon / ContentItem / WebVitalsItem / ApiCallItem / FileItem / ImageSelector).
- `npm test` 100% PASS (컴포넌트 테스트 VisitorMon/ApiCallItem/ContentItem/WebVitalsItem/ImageSelector/FileItem 유지).
- `npm run build` 후 `grep -rn "activateOnKey" build/assets/` → ≥1 hit.

**§2.1 표 영향**: 본 sweep 는 §2.1 의 행 #1~#5 (머지된 5곳) 에 영향 0 (호출부 바이트 동등). 잔여 3곳(REQ-029 영역) 중 FileItem×2 + ImageSelector 에 미리 import 가 들어가면 REQ-029 머지 시 import 재추가 0. planner 가 REQ-029 와 본 sweep 순서를 결정.

**단일 PR / 분할 PR (FR-06, planner)**:
- 권장: 단일 PR / 단일 커밋 — 6 파일 동시 변경으로 중간 상태 테스트 깨짐 0.
- 분할: planner 가 파일별 6 서브태스크로 나눌 수도 있음 (각 서브태스크 바이트 동등 보장).

**accessibility-spec §2.1 진행 열 갱신**: 본 sweep 머지 후 별 트리거로 §2.1 표 추가 없음 (행 #1~#5 이미 "머지"). 잔여 3곳 마감은 REQ-029 의 §2.1.1 영역.

**수용 기준 (REQ-20260419-001 §10)**:
- [ ] 6 파일 인라인 정의 제거
- [ ] 6 파일 `import { activateOnKey } from '@/common/a11y';` 추가
- [ ] `grep -rn "const activateOnKey" src/` → 1 match (helper only)
- [ ] `npm run lint && npm test` 전부 통과
- [ ] `npm run build` 후 산출물 청크에 `activateOnKey` 본문 1회 이상
- [ ] 호출부 시그니처 무변경 (US-03 회귀 0)
- [ ] 번들 크기 NFR-02 (변화 ≤ +0.2KB / -0KB)

**범위 밖**:
- `activateOnKey` 정책 변경 (Space 외 키 / 모바일 터치 / long-press) — 별 후보.
- 패턴 A 전환 — 별 spec / 별 REQ.
- pattern B 외 신규 호출부 추가 — 별 REQ.
- 단위 테스트 추가 — 기존 `src/common/a11y.test.js` 5건 유지.

### 2.2.2 [WIP] 패턴 A UA 기본 스타일 reset 정책 (REQ-20260418-030)

> 관련 요구사항: REQ-20260418-030 FR-01 ~ FR-08, US-01 ~ US-03

**배경**: 패턴 A (`<button type="button">` 교체) 채택 시 className 만 옮기는 관례가 `f980c1a` (SearchInput 모바일 토글 commit) 에서 정착. 그러나 `<button>` 의 UA 기본 스타일 (`background-color: ButtonFace`, `border: 2px outset`, `padding: 1px 6px`, `font-family: -webkit-small-control`, `-webkit-appearance: button` 등) 이 className 을 통해 reset 되지 않으면 기존 `<span>` / `<div>` 외관과 시각 drift 발생. 특히 모바일 viewport (<400px) 또는 iOS Safari 의 native gradient/radius 변형이 체감됨.

**정책 결정 (planner 영역 — REQ-030 FR-01)**:
- **옵션 A (글로벌 유틸리티 클래스, 권장)**: `src/styles/role/buttons.css` (또는 합의 위치) 에 `.button--unstyled { ... }` 를 `:global(.button--unstyled)` 형태로 1회 정의. 패턴 A 채택 시 `<button className={`${styles.X} button--unstyled`}>` 로 사용.
- **옵션 B (모듈 CSS 속성 직접 명시)**: 각 모듈 CSS 파일이 reset 속성을 매번 명시. 전역 의존 없음. 일관성 ↔ 보일러플레이트 trade-off.
- **옵션 C (전역 selector)**: `button[class*="..."]` 형태 — 비권장 (의도치 않은 영향).

inspector 권장: 옵션 A. 이유: 신규 패턴 A 채택 시 보일러플레이트 ≤ 1라인 (className 추가), 표준 스니펫이 spec SSoT 로 고정.

**표준 reset 스니펫 (FR-08, 옵션 A 채택 시 본문)**:
```css
/* src/styles/role/buttons.css — :global (CSS Modules 정책 준수) */
:global(.button--unstyled) {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
```
- `appearance: none` + `-webkit-appearance: none`: iOS Safari 의 native gradient / rounded border 제거.
- `font: inherit`, `color: inherit`: 부모 context 외관 자연 상속.
- focus-visible outline 은 §4.A 글로벌 규칙이 흡수 (본 reset 은 `outline` 미지정 → 브라우저 기본 유지 + §4.A override).
- iOS Safari `-webkit-tap-highlight-color` 제어는 별 후보 (범위 밖).

**적용 의무 (FR-01, FR-02)**: 본 §2.2.2 가 spec 에 박제된 이후, 패턴 A 로 `<button>` 교체하는 모든 위치는 reset 을 적용해야 한다. 미적용 PR 은 spec 위배 → 리뷰 차단.

**현 패턴 A 적용 위치 (2026-04-18 관측)**:
| # | 위치 | commit | reset 적용 | 비고 |
|---|------|--------|-----------|------|
| 1 | `src/Search/SearchInput.jsx:91-99` | `f980c1a` | [WIP] | 현재 `.span--nav-searchbutton` 만 — 본 §2.2.2 머지 후 reset 적용 |

**css-modules-spec 정합 (FR-06)**:
- 옵션 A 채택 시 `:global(.button--unstyled)` 패턴 — `css-modules-spec.md` 의 `:global` 사용 정책과 정합.
- 신설 위치 `src/styles/role/buttons.css` 는 `css-modules-spec.md` §5 (글로벌 규칙 위치 정책) 와 교차 참조 (inspector 후속 — 별 태스크 또는 본 REQ-030 머지 후 동시).

**운영자 baseline (REQ-20260418-028 매트릭스와 통합)**:
- `docs/testing/keyboard-activation-smoke.md` 매트릭스에 SearchInput 행 1건 — 화면 폭 <400px + admin 로그인 상태에서 네비 search 토글 외관이 기존 `<span>` 과 시각 동등 (background 투명, border 0, padding 0, font 상속, cursor pointer) 확인.
- baseline 결과 박제 시 §2.1 진행 열 업데이트 병행 (inspector 후속).

**단위 테스트 (REQ-030 FR-07, Could)**:
- `src/Search/SearchInput.test.jsx` 에 `getComputedStyle(button).backgroundColor === 'rgba(0, 0, 0, 0)' || 'transparent'` 등 선언적 어서트 — jsdom 한계 인지, 운영자 baseline 보완 필수.

**수용 기준 (REQ-20260418-030 §10)**:
- [ ] 옵션 A/B/C 결정 + 결정 사유 PR 본문 박제 (권장 = A)
- [ ] (옵션 A 시) `src/styles/role/buttons.css` (또는 합의 위치) 에 `:global(.button--unstyled)` 표준 reset 1회 정의
- [ ] `src/Search/SearchInput.jsx` 또는 `Search.module.css` 가 reset 적용 (외관 회귀 0)
- [ ] `npm test`, `npm run lint`, `npm run build` 통과
- [ ] REQ-028 `keyboard-activation-smoke.md` 매트릭스 SearchInput 행 baseline 박제 (운영자 1회)
- [ ] §4 WCAG 2.4.7 항목 영향 0 (focus-visible 글로벌 규칙과 공존)
- [ ] 번들 영향 ≤+0.3KB gzip
- [ ] (Could) `getComputedStyle` 어서트 추가
- [ ] css-modules-spec 정합 cross-link (inspector 후속)
- [ ] result.md 에 변경 전/후 외관 비교 박제

**범위 밖**:
- 9곳 외 위치의 button 시각 표준화 (Comment / Writer submit 등) — 별 후보.
- hover / active 시각 표준 — 별 후보.
- iOS Safari `-webkit-tap-highlight-color` — 별 후보.
- 디자인 토큰 기반 button 컴포넌트 / 다크모드 button 시각 — 별 spec.

### 2.2.3 [WIP] 키보드/시각 a11y E2E (Playwright/Cypress) 도입 평가 (REQ-20260418-031)
**[deferred: 평가/도입 결정 선행 — REQ-029 (9곳 마감) 완료 후 Phase 1 평가 진입. 단일 태스크 단위 carve 불가한 cross-cutting]**

> 관련 요구사항: REQ-20260418-031 FR-01 ~ FR-12, US-01 ~ US-04

**배경**: jsdom (vitest + jsdom@29) 은 `dispatchEvent(KeyboardEvent('keydown', { key: 'Enter' }))` → `<button>` native click 합성을 수행하지 않음. 따라서 "실 사용자가 Enter/Space 로 9곳을 활성화한다" 는 end-to-end 주장을 PR 단계 자동 회귀망에 포함 불가 — §2.3 정책적 수용 + 운영자 매트릭스 (REQ-028) 로 흡수 중. 9곳이 마감(REQ-029)되고 후속 a11y 위치(Comment/Writer/Modal) 확대 시 매트릭스 운영 비용이 증가하면 자동화 가치 역전.

**Phase 1 — 평가 (Must, REQ-031 §3.1 Phase 1)**:
- Playwright vs Cypress cost/benefit 표 (테스트 작성 비용 / CI 시간 / cross-browser / TS 통합 / 시각 회귀 통합 / 학습 곡선 / 유지보수 부담).
- 도입 운영 비용 (CI runner 분, dependency ~50MB) vs 도입 가치 (자동 회귀 회수율, 매트릭스 부담 감소, 신규 a11y 위치 확대 비용 감소) 정량화.
- 평가 결정 출력 (4 옵션 중 1): "도입 (Playwright, 권장)" / "도입 (Cypress)" / "보류 (현 정책 유지)" / "단계적 도입 (시각 우선 / 키보드 후속)".
- 평가 결과는 PR 본문 또는 `docs/decisions/` 박제.

**Phase 2 — 도입 (Must, 평가 결과 도입 시)**:
- `npm i -D @playwright/test` (또는 Cypress 동등) + browsers 설치.
- `e2e/a11y-keyboard.spec.ts` 신설 — 9곳 매트릭스 자동화 (페이지 로드 → Tab 순회 → Enter/Space 활성화 → 핸들러 결과 어서트).
- `e2e/visual-smoke.spec.ts` (선택, Could) — REQ-028 5개 시각 체크리스트 자동화 1차 시드.
- `vite preview` 기반 정적 빌드 대상 (기본) 또는 `vite dev` 기반 (planner 결정).
- `package.json` scripts: `e2e`, `e2e:headed`, `e2e:ci`.
- `.github/workflows/ci.yml` 에 `e2e` 잡 추가 (PR 트리거 또는 nightly cron — planner 결정).

**Phase 3 — 정책 마이그레이션 (Should, 도입 시)**:
- §2.3 "jsdom 한계 수용" 정책을 "E2E 자동화로 보완" 으로 진화 — 포커스 어서트 허용 문구 유지 + E2E 자동화가 click 합성 / Tab 순서 / focus-visible / Space preventDefault 자동 검증 추가.
- REQ-028 매트릭스 (`keyboard-activation-smoke.md` 9×4) 갱신: 자동화된 행은 "E2E 커버" 표기, 미커버 행만 운영자 수동 잔존.
- `github-actions-ci-spec.md` 갱신 — `e2e` 잡 정책 (실행 시점, 실패 시 머지 차단 여부, 재시도 정책).

**Phase 4 — 확장 (Could)**:
- 시각 회귀 도구 통합 (Percy / Argos / Chromatic) — 별 후보.
- axe-core 통합 (`@axe-core/playwright`) — 자동 a11y 룰 검사.
- 모바일 viewport (max-width 800/400) 매트릭스 자동화.
- 다크/라이트 모드 매트릭스.

**의존성**:
- 상류: REQ-029 (9곳 마감, 자동화 시드 baseline 안정) / REQ-028 (매트릭스 SSoT, 시드 데이터) / TypeScript baseline (`3846058`) / GitHub Actions CI 안정화 (`d7f78e2`).
- 하류: 미래 a11y 위치 확대, 시각 회귀 자동화 (Phase 4), axe-core 통합, React 컴포넌트 마이그레이션 회귀 자동 감지.

**NFR 목표 (REQ-031 §7)**:
- E2E 잡 실행 시간: ≤5분 (PR 트리거) / ≤15분 (nightly + 시각).
- E2E flakiness: <2% (10회 반복 중 ≤2회 false negative).
- 신규 a11y 위치 추가 시 E2E 케이스 작성 비용: ≤10라인 / 위치.
- cross-browser: Chrome / Firefox / Safari (Playwright 자연 지원).
- 번들 영향: 0 (devDependency).

**수용 기준 (REQ-20260418-031 §10)**:
- [ ] **Phase 1**: cost/benefit 표 작성 + 4 옵션 중 1 결정 + 사유 박제 (PR 본문 또는 `docs/decisions/`)
- [ ] **(도입 시) Phase 2**: 도구 설치 + `e2e/a11y-keyboard.spec.ts` 9곳 자동화 PASS
- [ ] **(도입 시) Phase 2**: `package.json` scripts + CI 잡 추가 + 의도적 회귀 PR red → 수정 green 1회 검증
- [ ] **(도입 시) Phase 3**: §2.3 + REQ-028 매트릭스 + `github-actions-ci-spec.md` 갱신 트리거 (inspector 후속)
- [ ] **(보류 시)**: 재평가 트리거 명시 (예: 9곳 → 15곳 확대 시 / React 20 bump 시) + done 이동
- [ ] `npm test` 100% PASS, `npm run lint`, `npm run build` 회귀 0
- [ ] (도입 시) E2E 잡 실행 시간 NFR 만족 / 번들 영향 0

**범위 밖**: 단위 테스트의 E2E 대체 / BDD 도구 (Cucumber) / Selenium·WebdriverIO 평가 / 부하·성능 테스트 (k6, Lighthouse CI) / API 계약 테스트 / TS 마이그레이션 자체 / 평가 단계에서 도구 도입 결정 (Phase 1 결과 따름).

### 2.2.4 [WIP] 키보드 a11y 런타임 수동 스모크 체크리스트 문서 신설 (REQ-20260419-002)

> 관련 요구사항: REQ-20260419-002 FR-01 ~ FR-08, US-01 ~ US-03

**배경 (2026-04-19 관측)**: pattern B (`<span>`/`<div>` + `tabIndex` + `activateOnKey`) 키보드 활성화 경로는 vitest + jsdom 단위 테스트에서 `event.preventDefault()` 호출을 검증하지만 **실제 브라우저에서 Space 키 페이지 스크롤 미발생**, **focus ring 시각**, **screen reader role 인식** 은 자동 테스트 사각지대 (§2.3 jsdom 한계 수용 정책과 일치). `docs/testing/` 하위에는 이미 4종 manual smoke checklist (markdown-render, web-vitals-runtime, styles-cascade-visual, tanstack-query-devtools) 가 자리잡고 있으나 **키보드 a11y 전용 체크리스트는 부재** — REQ-20260418-025 followup `20260418-1707-a11y-extract-helper-unverified-ui.md` 가 "수동 QA 슬롯 1건" 을 명시 요청.

**목표 (FR-01 ~ FR-08)**:
- 신규 파일 `docs/testing/keyboard-a11y-runtime-smoke.md` 생성 (실제 파일 생성은 별 task, 본 §2.2.4 는 정책·구조 SSoT).
- §2.1 9곳 매트릭스(sweep 진행분 반영) 기반으로 항목별 수동 검증 단계 정의:
  - Tab 으로 포커스 도달 가능 (tab stop)
  - Enter 활성화 → onClick 동등 동작
  - Space 활성화 → onClick 동등 + 페이지 스크롤 미발생 (preventDefault 실효)
  - focus ring 시각 확인 (§4.A focus-visible 정책 준수)
  - 화면 리더(NVDA / VoiceOver) 의 role 인식 라벨 (있으면 보고, Should)
- 테스트 환경 매트릭스: 브라우저(Chrome/Firefox/Safari) × OS(macOS/Windows) — 최소 1조합(Chrome/macOS) 필수 + 선택 추가.
- 항목 식별자: `KA-01` ~ `KA-09` (혹은 sweep 시점 매트릭스 행 수). §2.1 표 "진행" 열과 1:1 매핑.
- 결과 기록 포맷: "PASS / FAIL / N/A / 노트" 칸 × 5 검증 단계.
- 신규 항목 추가 가이드: 새 onClick 요소 추가 시 채워야 할 메타 (파일:라인, role, key 바인딩, 해당 pattern A/B) 안내 섹션.
- 본 §2 상단(또는 §2.3)에서 `docs/testing/keyboard-a11y-runtime-smoke.md` 로 명시적 cross-link.

**§2.3 / §2.1 표 통합**:
- §2.3 jsdom 한계 수용 정책은 유지 — 본 체크리스트가 **수동 보완** 역할 명시.
- §2.1 표 "진행" 열과 식별자 매핑은 체크리스트 신설 시점 snapshot; sweep/추가로 매트릭스 drift 발생 시 식별자(`KA-XX`) 를 불변 유지하고 파일:라인 별표로 보정 (§12 위험 완화).

**기존 4종 smoke 문서 구조 정합 (NFR-02)**:
- 섹션 헤더 ≥80% 일치 — `## Pre-conditions`, `## Golden Path Checklist`, `## Environment` (또는 `## Matrix`), `## Failure Notes`, `## Baselines` (선택).
- 자매 체크리스트: `docs/testing/markdown-render-smoke.md` (REQ-014), `docs/testing/web-vitals-runtime-smoke.md` (REQ-035), `docs/testing/styles-cascade-visual-smoke.md` (REQ-023), `docs/testing/tanstack-query-devtools-smoke.md` (REQ-022).

**§4.A focus-visible 정책과의 관계**:
- "focus ring 시각 확인" 단계가 §4.A.7 "키보드 포커스 시 outline 가시 + 마우스 클릭 시 미발생" 검증을 **1회 순회로 동시 흡수** → 운영자 baseline 중복 제거.
- post-merge-visual-smoke-spec §3.B.4 (REQ-028 keyboard-activation-smoke 배치 2) 는 운영자 baseline 수행 위치; 본 체크리스트는 문서 뼈대 (반복 실행 가능한 자립형 체크리스트) 역할 — 두 문서는 상호 보완.

**REQ-20260418-031 (E2E Playwright/Cypress 평가) 와의 관계 (§2.2.3)**:
- 본 체크리스트는 **수동 baseline SSoT**. E2E 자동화 도입(Phase 2) 시 자동 커버 행은 "E2E 커버" 표기로 이관하고 미커버 행만 수동 잔존 (§2.2.3 Phase 3 정책 진화와 일치).
- 자동화 도구 도입 여부와 무관하게 본 체크리스트는 한동안 공존 — 자동화 flakiness / 신규 위치 확대 / cross-browser 범위 밖 항목 흡수.

**수용 기준 (REQ-20260419-002 §10)**:
- [ ] `docs/testing/keyboard-a11y-runtime-smoke.md` 파일 존재 (FR-01)
- [ ] §2.1 9곳 매트릭스 항목 수록 (FR-02) — sweep 시점 진행분 반영
- [ ] Tab / Enter / Space / focus ring 4 검증 단계 + Screen reader 보조 단계 (FR-03)
- [ ] 환경 매트릭스(브라우저 × OS) 입력 칸 (FR-04)
- [ ] "PASS / FAIL / N/A / 노트" 결과 기록 포맷 (FR-05)
- [ ] 본 §2 (또는 §2.3) 에서 신규 체크리스트로 명시적 링크 (FR-06 / inspector 영역 — 본 §2.2.4 도입으로 마감)
- [ ] 신규 항목 추가 가이드 섹션 (FR-07)
- [ ] "자동화는 REQ-031 영역, 본 문서는 수동" 비-목표 명시 (FR-08)
- [ ] 자매 체크리스트 4종과 섹션 헤더 ≥80% 일치 (NFR-02)
- [ ] 항목 식별자 `KA-XX` ↔ §2.1 표 1:1 매핑 (NFR-03)
- [ ] `npm test` / `npm run lint` / `npm run build` 회귀 0 (문서 변경만, 코드 회귀 없음)

**범위 밖**:
- 자동화(Playwright/Cypress) 도입 — REQ-031 영역.
- 색 대비 / 폰트 크기 등 시각 a11y — 별 카테고리.
- ARIA live region / 라우팅 시 포커스 관리 — §1 "의도적으로 하지 않는 것" + 별 후보.
- 체크리스트 1차 실행 (PASS 보고) — 본 요구사항은 **문서 신설** 한정; 실행은 별 task (REQ-001 sweep 머지 직후 트리거 가능, planner 영역).

### 2.3 테스트 요구 (FR-05)
- 각 위치당 단위 테스트 1건 이상:
  - `fireEvent.keyDown(el, { key: 'Enter' })` → handler 1회 호출
  - `fireEvent.keyDown(el, { key: ' ' })` → handler 1회 호출
  - `<button>` 교체 시: 포커스 가능 (native default).
  - 패턴 B: `tabIndex` 속성이 `0` 임을 어서트.
- 시각 회귀는 jsdom 범위 밖 → 자매 `styles-cascade-visual-smoke` 또는 컴포넌트별 체크리스트로 운영자 수동.
- **9곳 키보드 활성화 운영자 수동 baseline**: `docs/testing/keyboard-activation-smoke.md` (REQ-20260418-028 §3.B.4, 배치 2). 9곳 × 4 키 매트릭스 (Tab 도달 / Enter / Space / 비-타겟). ApiCallItem (TSK-29) + ContentItem (TSK-27 `d8cd8bb`) 행 데이터 포함, 미정 5곳 TBD 플레이스홀더. 상세: `specs/spec/green/testing/post-merge-visual-smoke-spec.md` §3.B.4.

### 2.4 수용 기준 grep (REQ-017 §10)
- `grep -rn "<span\|<div\|<li" src/ | grep "onClick" | grep -v "\.test\." | grep -v "tabIndex"` → 9곳 모두 사라짐 또는 기대 패턴 일치
- `grep -rn "onKeyDown" src/ | grep -v "\.test\."` → 9곳 (또는 `<button>` 교체만큼 감소)
- 키보드 활성화 단위 테스트 9건 이상 PASS
- `npm test` 전체 100% PASS

---

## 3. [WIP-B] ESLint 회귀 차단 (REQ-20260418-018)

> 관련 요구사항: REQ-20260418-018 FR-01~08, US-01~03

### 3.1 현재 설정 (As-Is)
```yaml
# .eslintrc.yml
extends:
  - eslint:recommended
  - plugin:react/recommended
plugins:
  - react
```
- `npm ls eslint-plugin-jsx-a11y` → 미설치.
- a11y 룰 **0 개** — REQ-017 의 9건이 빌드/CI 에서 검출되지 않은 원인.

### 3.2 목표 설정
- 패키지: `eslint-plugin-jsx-a11y@^6.x` (ESLint 8 호환).
- `.eslintrc.yml` 갱신:
  - `extends` 에 `plugin:jsx-a11y/recommended` 추가
  - `plugins` 에 `jsx-a11y` 추가
- `recommended` 룰셋을 기본 적용. `strict` 는 별 후보 (도입 후 회고).
- `rules` 섹션에 프로젝트 컨텍스트(한국어 콘텐츠, SPA, 관리자 화면) 에 맞는 비활성 / 완화 기록 — 각 항목에 **1줄 사유 코멘트** 필수 (FR-05).

### 3.3 주요 룰 기대 커버리지 (REQ-017 재발 방지)
- `jsx-a11y/click-events-have-key-events` — `<span onClick>` 에 `onKeyDown` 없으면 에러
- `jsx-a11y/no-static-element-interactions` — `<div onClick>` 에 `role` 없으면 에러
- `jsx-a11y/tabindex-no-positive` — `tabIndex > 0` 금지
- `jsx-a11y/alt-text` — `<img>` alt 누락 금지
- `jsx-a11y/anchor-is-valid` — `<a href="#">` 잘못된 사용 차단
- `jsx-a11y/label-has-associated-control` — form 라벨 연결
- 기타 recommended ~30개

### 3.4 CI 통합
- 기존 `.github/workflows/ci.yml` 의 `npm run lint` 스텝이 a11y 룰을 포함해 실행되는지 검증.
- lint 실행 시간 baseline 측정 후 증가분 ≤+5초 (NFR-02).
- 의도적 위반 PR 으로 red 상태 1회 확인 (FR-08, Could).

### 3.4.1 [WIP] lint 확장자 커버리지 (REQ-20260418-024)

> 관련 요구사항: REQ-20260418-024 FR-01 ~ FR-06, US-01~US-03

**현재 결함 (2026-04-18 관측)**:
- `package.json:23` `"lint": "eslint ./src"` — ESLint 8 기본 `--ext` 는 `.js` 만 포함. **모든 `.jsx` 파일이 `npm run lint` / CI Lint 잡에서 실질 스캔되지 않음**.
- `.eslintrc.yml` 전체에 `overrides.files` / jsx 확장자 명시 없음.
- husky `lint-staged` (`src/**/*.{js,jsx}`) 는 파일 명시 패턴이라 pre-commit 은 잡음 — CI/로컬 `npm run lint` 와 결과 불일치.
- 재현: `npx eslint ./src` → 0 errors vs `npx eslint src/Log/Writer.test.jsx` → 7 errors (`no-mixed-spaces-and-tabs`). `--debug` 로 "Didn't match: Writer.test.jsx" 확인됨.

**파급 (jsx-a11y 실효성)**:
- §3 의 `plugin:jsx-a11y/recommended` 도입은 `--ext .jsx` 가 빠지면 `.jsx` 파일을 검사하지 못해 **a11y 룰 도입 가치 0%**. 본 REQ-024 는 §3 실효성 **선결 조건**.

**목표 (To-Be)**:
- `package.json` 의 `lint` 스크립트를 `eslint ./src --ext .js,.jsx` 로 수정 (ESLint 8.x 유지) — **또는** ESLint 9 flat config 마이그레이션 시 `files: ['**/*.{js,jsx}']` 명시 (flat config 자체는 본 REQ 범위 밖, 별 후보).
- 변경 후 1회 `npm run lint` baseline 측정 → 누적된 `.jsx` 위반 (파일 × 룰 × 건수) 표 박제 (PR 본문 또는 result.md).
- 자동 수정 가능 룰(`no-mixed-spaces-and-tabs` 등) 은 `--fix` 로 일괄, 그 외 수동 정리 → 변경 후 `npm run lint` → 0 errors 달성.
- 본 REQ 는 **확장자 커버리지 + 누적 cleanup 만** 담당. jsx-a11y 룰 신규 검출은 별 PR (REQ-018 머지 선후와 충돌 회피).

**CI 영향**:
- `.github/workflows/ci.yml` 의 `Lint` 잡이 동일 `npm run lint` 를 호출하므로 워크플로 변경 없이 jsx 검사 자동 반영. ci-spec §3.1 의 Lint 단계 의미 회복.
- 확장자 커버리지 항목은 ci-spec `github-actions-ci-spec.md` §3.1.1 (lint 확장자 커버리지) 와 교차 참조.

**수용 기준 (REQ-20260418-024 §10)**:
- [ ] `package.json` `lint` 스크립트가 `--ext .js,.jsx` (또는 flat config 동등) 포함
- [ ] 변경 직전 `.jsx` 위반 baseline 표 박제 (파일 × 룰 × 건수)
- [ ] 변경 직후 `npm run lint` → 0 errors
- [ ] CI `Lint` 잡 로그에서 `.jsx` 검사 수행 확인
- [ ] 본 §3.4.1 추가로 accessibility-spec "확장자 커버리지" 항목 반영 (본 업데이트로 완료)
- [ ] ci-spec §3.1.1 cross-link 반영 (inspector 후속)
- [ ] husky `lint-staged` 와 `npm run lint` 결과 일관성 확인
- [ ] `npm test` / `npm run build` 회귀 0

**범위 밖**:
- ESLint 9 flat config 마이그레이션 자체 (별 후보).
- TypeScript 파일(`.ts/.tsx`) lint (TS 마이그레이션 의존).
- `--cache` / `--max-warnings 0` / Prettier 도입 / 들여쓰기 룰 표준화 (별 후보).

### 3.4.2 [WIP] ESLint v9 + flat config 마이그레이션 (REQ-20260419-003 / REQ-20260420-022 재집행)

> 관련 요구사항: REQ-20260419-003 FR-01 ~ FR-09, US-01~US-03; **REQ-20260420-022** FR-01 ~ FR-10, US-01 ~ US-03 (drift 2차 재집행)

**[REQ-20260420-022 drift 재집행 맥락 — 2026-04-20 관측]**: REQ-003 이 done 처리됐으나 `.eslintrc.yml` 잔존 + `eslint@8.28.0` + `eslint-plugin-jsx-a11y` 미설치 (실태 0% 이행) 로 확인. 동시에 REQ-20260418-018 (`eslint-plugin-jsx-a11y` 도입) 도 done 인데 `node_modules/eslint-plugin-jsx-a11y/` 미존재 — 두 REQ 모두 본 §3.4.2 를 통해 **물리 이행 재집행**. REQ-020260420-021 (React 19 2차 drift) 와 동일한 메타 회귀 패턴 — 같은 사이클에 처방한다. 세부 FR 은 `specs/requirements/done/2026/04/20/20260420-eslint-v9-flat-config-and-jsx-a11y-drift-resolve.md` (REQ-022) 참조.

**현재 결함 (2026-04-19 관측, `npm outdated --json`)**:
- `eslint` current `8.28.0`, wanted `8.57.1`, latest `10.2.1` — 2 메이저 뒤처짐.
- `eslint-plugin-react` current `7.31.11`, wanted/latest `7.37.5` — minor 갭.
- 설정 파일: `.eslintrc.yml` (legacy eslintrc). ESLint v9 부터 **flat config (`eslint.config.js` / `.mjs`)** 가 기본, legacy 는 v10 에서 옵션화 / v11 에서 제거 예정.
- ESLint 8.x EOL 은 2024-10-05 — 2026-04-19 기준 **6개월+ unsupported**, 보안 패치 미적용 위험.

**파급 (§3 실효성)**:
- REQ-024 (§3.4.1 확장자 커버리지) 머지 후에도 ESLint 8 legacy config 유지 시 deprecation warning 이 CI 로그에 누적 → "Lint 잡 green" 신호가 침해.
- v10 강제 flat 전환 시점까지 쌓이는 legacy 의존 부담을 현 시점(§2.2.1 sweep + §3.4.1 cleanup 이후) 에 흡수하는 편이 유리.
- REQ-019 (TypeScript baseline, 머지 완료) 와 향후 `@typescript-eslint/*` 도입이 같은 flat config 파일에서 자연스럽게 결합.

**목표 설정 (To-Be)**:
- `eslint` devDependency 를 v9.x LTS 로 승격 (정확 minor 는 planner 영역, v9.x latest stable 권장).
- `eslint-plugin-react` 를 v7.37.x 로 minor 갱신 (v9 flat 호환 임계 통과: v7.34+).
- `eslint-plugin-jsx-a11y` (REQ-018 도입분) 를 v6.10+ 로 (이미 해당 minor 이상이면 no-op) — v9 flat 호환 확인.
- `.eslintrc.yml` → `eslint.config.js` 또는 `.mjs` 로 이관. 본 프로젝트는 `package.json:type=module` → `.mjs` 또는 `.js` 택1 (planner 결정, REQ-003 §13 미결).
- `.eslintignore` → flat config 의 `ignores` 필드로 흡수 — 기존 패턴 (`build/`, `coverage/`, `node_modules/`, `**/__test__/*.js`, `**/api.js`) 동등.
- 기존 4개 사용자 룰 동등 표현:
  - `react/react-in-jsx-scope: off`
  - `react/prop-types: off`
  - `no-unused-vars: warn`
  - `react/no-unknown-property` 의 `ignore: [imageurl, thumbnailurl, enlarged]`
- `package.json:scripts.lint`: 현 `eslint ./src` 또는 `eslint ./src --ext .js,.jsx` (REQ-024 머지 후 형태) 를 flat config 에서 동등 표현 (`files: ['**/*.{js,jsx}']`).
- `package.json:lint-staged` 가 v9 flat config 로 작동.

**룰셋 동등성 검증 (FR-06)**:
- 마이그레이션 전 `npm run lint --format json` 산출물 박제 (파일 × 룰 × 건수).
- 마이그레이션 후 동일 형식 산출물과 diff — 에러/경고 수 ±0 기대.
- 차이가 발생하면 의도 룰 변경 분리 검토 (본 REQ 는 **동등 변환** 한정).

**§3 본문 정정 (FR-09 / 본 §3.4.2 머지 후)**:
- §3.1 (`.eslintrc.yml` As-Is) 박스는 legacy 스냅샷으로 유지 + "→ §3.4.2 로 대체 진행" 주석 추가.
- §3.2 To-Be 의 `extends` / `plugins` yml 문법을 flat config `import`/`export default` 로 갱신 (별 라운드, 본 §3.4.2 도입 후 inspector 후속).

**CI 영향 (github-actions-ci-spec §3.1.3 cross-link)**:
- `.github/workflows/ci.yml` 의 `Lint` 스텝 자체는 변경 없음 (`npm run lint` 호출). 설정 파일 이관만으로 v9 흡수.
- CI Lint 잡에서 legacy deprecation warning 이 0 이 되는지 로그 검증.
- 상세: `specs/spec/green/ci/github-actions-ci-spec.md` §3.1.3 (REQ-20260419-003).

**husky / lint-staged 호환 (FR-08)**:
- `lint-staged@16.4` 는 ESLint v9 호출 호환 (외부 릴리즈 노트 기준).
- pre-commit dry-run 으로 1회 검증 후 머지 권장.

**Node 버전 호환 (NFR-05)**:
- ESLint v9 최소 Node 요구: >=18.18. 현 CI 매트릭스(`.github/workflows/ci.yml` Node 20 LTS) 통과.
- Node 20 유지 전제 — CI Node 매트릭스 변경은 본 REQ 범위 밖.

**수용 기준 (REQ-20260419-003 §10)**:
- [ ] `package.json:devDependencies.eslint` 가 v9.x LTS
- [ ] `eslint-plugin-react` 가 v7.37.x, `eslint-plugin-jsx-a11y` 가 v9 호환 minor
- [ ] `eslint.config.js` (또는 `.mjs`) 존재, `.eslintrc.yml` 부재 (또는 명시적 archive)
- [ ] `.eslintignore` 내용이 flat config `ignores` 로 흡수, 파일 삭제 또는 archive
- [ ] 기존 4개 사용자 룰 동등 표현 (특히 `react/no-unknown-property` ignore 옵션)
- [ ] 마이그레이션 전/후 `npm run lint` 결과 동등 (에러/경고 수, 파일별 분포 ±0)
- [ ] `eslint --version` 이 v9.x
- [ ] `npm run lint` 출력에 legacy deprecation warning 0
- [ ] CI `Lint` 잡 green 유지, 로그에 deprecation warning 0
- [ ] husky pre-commit `eslint` 호출 정상
- [ ] `npm test`, `npm run build` 회귀 0
- [ ] §3.1 / §3.2 본문 flat config 형식으로 후속 갱신 (별 라운드, inspector 후속)
- [ ] `github-actions-ci-spec.md` §3.1.3 cross-link 반영 (inspector 후속)
- [ ] 번들 영향 0 (devDependency 만)

**REQ-20260420-022 추가 수용 기준 (drift 2차 해소)**:
- [ ] `ls .eslintrc.yml` → `No such file` (제거 확인)
- [ ] `ls eslint.config.*` → 1건 이상
- [ ] `grep -rn '"eslint": "\^8' package.json` → 0 lines
- [ ] `ls node_modules/eslint-plugin-jsx-a11y/package.json` → 존재 (REQ-018 물리 이행)
- [ ] 의도적 a11y 위반 smoke 파일에 lint 가 반응 (확인 후 제거)
- [ ] lint-staged 가 flat config 로 무수정 작동 (husky v8 pre-commit 포맷 유지)

**범위 밖**:
- `@typescript-eslint/*` 도입 — TS 마이그레이션 의존, 별 spec (§1 "의도적으로 하지 않는 것" 참조).
- 신규 룰 추가 / 룰셋 강화 — 본 마이그레이션은 동등 변환 한정.
- `eslint --fix` 자동 수정 일괄 적용 — 별 task.
- ESLint v10 으로의 점프 — flat-only enforcement, 별 후속 spec.
- husky v9 동시 업그레이드 — 별 후보 (`prepare` 스크립트 형식 변경).

### 3.4.3 [WIP] `react/no-unknown-property` ignore 목록의 dead `enlarged` 제거 (REQ-20260419-014)

> 관련 요구사항: REQ-20260419-014 FR-01 ~ FR-07, US-01~US-03

**맥락 (2026-04-19 관측)**: REQ-20260418-026 (ImageItem 명령형 DOM → 선언적 React 리팩터, done — `css-modules-spec.md` §10.1) 가 `enlarged="..."` 커스텀 속성을 표준 `data-enlarged` 로 이전한 후, `.eslintrc.yml:41` 의 `react/no-unknown-property` ignore 목록에 남은 `enlarged` 항목이 **dead config** 가 됐다. §3.4.2 (REQ-003 flat config 마이그레이션) 의 "기존 4개 사용자 룰 동등 표현 — `react/no-unknown-property` 의 `ignore: [imageurl, thumbnailurl, enlarged]`" 박제가 **본 §3.4.3 머지 후 `ignore: [imageurl, thumbnailurl]` 2건으로 축소** 됨을 명시.

**현재 결함**:
- `grep -n "enlarged" .eslintrc.yml` → `.eslintrc.yml:41 - enlarged` (ignore 목록의 3 항목 중 마지막).
- `grep -rn "enlarged=\"" src/` → 0 hits (REQ-026 후 `data-enlarged` 만 사용).
- `src/Image/ImageItem.test.jsx` 도 `data-enlarged` 만 어서트.
- dead config 잔존으로 향후 `enlarged="true"` 같은 잘못된 사용이 lint silent 통과 위험.

**목표 (FR-01)**:
- `.eslintrc.yml` (또는 §3.4.2 REQ-003 flat config 마이그레이션 후 `eslint.config.js` / `.mjs`) 의 `react/no-unknown-property` ignore 목록에서 `enlarged` 1줄 제거.
- 다른 2 항목 (`imageurl`, `thumbnailurl`) 은 활성 사용 중 → 보존 (FR-07).

**위치 검증 (FR-06)**:
- 본 PR 머지 시점에 REQ-003 flat config 마이그레이션 완료 상태라면 `eslint.config.js` 측 동등 라인에서 제거.
- legacy `.eslintrc.yml` 잔존 시 그쪽에서 제거.
- 두 위치 모두 존재 시 일관성 보장 — 양쪽 동시 제거.

**회귀 검증 (FR-02 / FR-03 / FR-04)**:
- `npm run lint` 0 warning/error (변경 전후 동등).
- `npm test` 100% PASS (변경 전후 동등).
- `npm run build` PASS.

**grep 박제 (FR-05, Should)**:
- 변경 전 `grep -n "enlarged" .eslintrc.yml eslint.config.js 2>/dev/null` 결과 1줄 박제.
- 변경 후 0줄 박제.
- `grep -rn "enlarged=\"" src/` → 0 hits 박제 (본 PR 무관 baseline, 신호 검증용).

**§3.4.2 연동 (동등 변환 정합성)**:
- §3.4.2 의 ignore 목록 박제 `[imageurl, thumbnailurl, enlarged]` 는 본 §3.4.3 머지 후 `[imageurl, thumbnailurl]` 로 축소 — 별 inspector 후속 라운드에서 §3.4.2 본문 갱신 (본 라운드에서는 본 §3.4.3 신설로 충분, cross-link 확보).
- 본 §3.4.3 과 §3.4.2 의 머지 순서:
  - (A) REQ-003 선행 → 본 §3.4.3 은 `eslint.config.js` 측 1줄 제거 (단순).
  - (B) 본 §3.4.3 선행 → `.eslintrc.yml` 측 1줄 제거, REQ-003 마이그레이션 시 이미 정리된 2항목 ignore 가 자연 복제.
  - 순서 무관 결과 동등 (planner 결정).

**silent 회귀 차단 효과 (US-01)**:
- 본 §3.4.3 머지 후 `enlarged="..."` 잘못된 사용 추가 시 `react/no-unknown-property` 가 error 발화 → CI lint 차단.
- 의도된 재도입 (예: 신규 컴포넌트 prop) 시 ignore 재추가 — 의도 명시 주석 강제.

**수용 기준 (REQ-20260419-014 §10)**:
- [ ] FR-01: ignore 목록에서 `enlarged` 1줄 제거 (`.eslintrc.yml` 또는 `eslint.config.js`)
- [ ] FR-02: `npm run lint` 0 warning/error
- [ ] FR-03: `npm test` 100% PASS
- [ ] FR-04: `npm run build` PASS
- [ ] FR-05: 변경 전후 grep 결과 PR 본문 또는 result.md 박제 (Should)
- [ ] FR-06: REQ-003 마이그레이션 후 위치에서도 정리 — 두 위치 동기
- [ ] FR-07: `imageurl`, `thumbnailurl` 보존 (활성 사용 중)
- [ ] `grep -n "enlarged" .eslintrc.yml eslint.config.js 2>/dev/null` → 0 hits
- [ ] `grep -rn "enlarged=\"" src/` → 0 hits (baseline 재확인)
- [ ] §3.4.2 본문의 ignore 목록 박제 갱신 별 inspector 후속 (본 §3.4.3 cross-link 로 충분)

**범위 밖**:
- `imageurl`, `thumbnailurl` 의 동등 sweep — 두 항목은 활성 사용 중. 향후 해당 props 가 `data-imageurl` / `data-thumbnailurl` 로 표준화되면 별 REQ.
- ESLint v9 flat config 의 추가 룰 정리 — 별 후속.
- `react/no-unknown-property` 룰 자체의 강화 (예: ignore 목록 0 축소) — 별 spec.
- 다른 dead config 항목 sweep (`tsconfig.json` 의 사용되지 않는 옵션 등) — 별 후속.
- React 19 의 `data-*` 속성 lint 강화 — 별 spec.

### 3.5 PR 순서 (REQ-017 ↔ REQ-018)
- **권장**: REQ-017 (9건 수정) → REQ-018 (린트 도입) 순서.
- REQ-018 을 먼저 머지하면 기존 9건이 lint 실패로 PR 차단 → 본 PR 에서 9건을 함께 수정해야 하는 부담.
- planner 가 단일 PR 로 묶을지 / 순차 분리할지 결정 (REQ-018 §13 미결).

### 3.6 수용 기준 (REQ-018 §10)
- `package.json` devDependencies 에 `eslint-plugin-jsx-a11y` 추가
- `.eslintrc.yml` 의 `extends` 에 `plugin:jsx-a11y/recommended` 포함
- `.eslintrc.yml` 의 `plugins` 에 `jsx-a11y` 포함
- `npm run lint` 통과 (REQ-017 머지 기준)
- 비활성/완화 룰마다 1줄 사유 코멘트
- `npm test` 100% PASS
- CI 로그에서 a11y 룰 실행 확인

---

## 4. WCAG 2.1 AA 대응 현황

| 항목 | 상태 | 근거 / 메모 |
|------|------|-------------|
| 2.1.1 Keyboard | [ ] 9건 미수정 (REQ-017 대상) | `<span onClick>` 9곳, tabIndex 0건 |
| 2.4.7 Focus Visible | [ ] 부분 미흡 (REQ-023 대상) | `<span>` 에는 포커스 링 없음; `<button>` 교체 후 native focus ring; 프로젝트 전역 `:focus-visible` 룰 0건 |
| 4.1.2 Name, Role, Value | [ ] 부분 위배 | `role="button"` 만 있고 키보드 활성화 미지원 |
| 1.1.1 Non-text Content (alt) | [ ] 미측정 | eslint-jsx-a11y 도입 후 baseline 측정 |
| 1.3.1 Info & Relationships | [ ] 미측정 | (별 후보) |
| 색 대비 / 확대 / 모션 | [ ] 범위 밖 | 별 spec |

REQ-017 + REQ-018 머지 후 2.1.1 / 4.1.2 는 `[x]`. 2.4.7 는 **REQ-023** 머지 후 `[x]`.

---

## 4.A [WIP] focus-visible 정책 (REQ-20260418-023)

> 관련 요구사항: REQ-20260418-023 FR-01~08, US-01~03

### 4.A.1 현재 결함
- `grep -rn "focus-visible\|:focus" src/ --include='*.css'` → **프로젝트 전역 0건**.
- `src/Monitor/Monitor.css:69` `.span--monitor-retrybutton { display: inline-block; cursor: pointer; text-decoration: underline; }` — focus 스타일 부재.
- 패턴 B (tabIndex + role + onKeyDown) 로 전환된 요소에는 네이티브 `<button>` 의 기본 포커스 링이 없으므로 WCAG 2.4.7 "Focus Visible" 의 공식 pass 를 단언하려면 **명시적 CSS 규칙 필수**.

### 4.A.2 적용 대상
모든 키보드 활성화 가능 요소:
- 네이티브 `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`
- `tabIndex={0}` 을 가진 임의 요소 (패턴 B 채택분)
- `role="button"` 을 가진 요소

### 4.A.3 표준 outline 사양
```css
*:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```
- **`:focus-visible` 우선** (FR-08): 마우스 클릭 후에는 브라우저가 링을 렌더하지 않도록 (UX 표준). `:focus` 폴백은 `:focus-visible` 미지원 브라우저(매우 구형) 대비 optional (NFR-05).
- `outline` (border 아님): 레이아웃 영향 0.
- `outline-offset: 2px`: 요소 경계와 링 사이 여백으로 가시성 증가.

### 4.A.4 디자인 토큰
`specs/spec/green/styles/design-tokens-spec.md` §4.3 의 `--color-focus-ring` (또는 동등) 토큰을 참조. light/dark 변형 포함 (상세는 tokens spec).

### 4.A.5 CSS 적용 위치
- **글로벌 규칙**: `src/styles/` 의 적절한 파일 (`reset.css` 또는 신규 `a11y.css`) 에 `*:focus-visible` 1개 규칙 추가. 네이티브 `<button>` (패턴 A) 위치는 글로벌 규칙으로 흡수.
- **컴포넌트별 변형 (Should)**: 패턴 B 채택 CSS 파일 (예: `src/Monitor/Monitor.css` `.span--monitor-retrybutton`) 에 시각 대비 보강이 필요하면 컴포넌트별 `:focus-visible` 규칙 추가. 기본은 글로벌 규칙으로 충분.

### 4.A.6 대상 위치 (9곳)
§2.1 의 키보드 활성 9곳과 동일. 패턴 A (`<button>`) 는 글로벌 규칙으로 흡수, 패턴 B 는 컴포넌트 CSS 에 변형 검토.

### 4.A.7 검증 (FR-05, FR-07)
- [ ] 프로젝트 전역 `grep -rn ":focus-visible" src/ --include='*.css'` → ≥1 (글로벌 규칙)
- [ ] 9곳 모두 운영자 Tab 순회 시 포커스 링 시각 가시 1회 마감
- [ ] 라이트/다크 테마(또는 `prefers-color-scheme`) 양쪽에서 포커스 링 가시
- [ ] 마우스 클릭 시 포커스 링이 발생하지 않거나 `:focus-visible` false 로 미발생 (US-02)
- [ ] styles cascade visual baseline 재수행 — 포커스 외 시각 회귀 0
- [ ] `npm test`, `npm run lint`, `npm run build` 통과
- [ ] **운영자 수동 체크리스트 통합**: `docs/testing/keyboard-activation-smoke.md` (REQ-20260418-028 §3.B.4) 내 focus-visible 행이 "키보드 포커스 시 outline 가시 + 마우스 클릭 시 미발생" 항목을 포함 — 한 번의 운영자 순회로 본 §4.A 와 §2.3 동시 마감. 상세: `specs/spec/green/testing/post-merge-visual-smoke-spec.md` §3.B.4.

### 4.A.8 신규 수동 스모크 체크리스트 (선택)
- `docs/testing/focus-visible-smoke.md` 신설 vs 기존 styles cascade visual checklist 에 흡수 — planner 결정 (REQ-023 §13 미결).
- 신설 시 운영자 절차: 9곳 순회 + 라이트/다크 양쪽 + 마우스 vs 키보드 비교 + 결과 박제.

### 4.A.9 [WIP] Monitor 도메인 tabIndex focus-visible CSS + Tab 순서 경량화 (REQ-20260420-021)

> 관련 요구사항: REQ-20260420-021 FR-01 ~ FR-05, US-01 ~ US-02

**맥락 (2026-04-20 관측 post-6881e1d)**: Monitor 도메인 hoverPopup 이관(`6881e1d`)에서 `useHoverPopup` 의 focus 경로(`onFocus`/`onBlur`) 활성화를 위해 3 컴포넌트의 popup trigger 요소에 `tabIndex={0}` 이 부여됐다:
- `src/Monitor/ApiCallItem.jsx` 의 Pillar `div.div--monitor-pillar` (참조: `:150-158` 스냅샷).
- `src/Monitor/WebVitalsItem.jsx` 의 statusBar `div.div--monitor-statusbar` (참조: `:154-161` 스냅샷).
- `src/Monitor/VisitorMon.jsx` 의 EnvStack `div.div--monitor-pillar` (참조: `:213-221` 스냅샷).

WCAG 2.1 SC 1.4.13 (Content on Hover or Focus) 관점의 **개선**이지만:
- (a) 기존 CSS 에 `.div--monitor-pillar:focus-visible`, `.div--monitor-statusbar:focus-visible` 규칙이 **없어** 키보드 포커스 시 시각 피드백 부재 (WCAG 2.4.7 Focus Visible 취약).
- (b) `/monitor` 페이지 Tab 순서에 최대 17개(7-pillar chart + 3 stack × 3 category + 1 statusbar) 신규 focus stop 추가 → 탐색 비용 증가.

§4.A 의 글로벌 `*:focus-visible` 규칙이 있지만 Monitor pillar/statusbar 는 **div 기반 trigger** 이므로 §4.A.1 대상 9곳(button/interactive 위주) 과 겹치지 않아 보강 필요.

**정합 패턴 (To-Be)**:

**FR-01 (Must) — focus-visible CSS 규칙 추가**:
- `.div--monitor-pillar:focus-visible`, `.div--monitor-statusbar:focus-visible` 규칙을 도메인 CSS (`src/Monitor/*.css` 또는 `src/index.css`) 에 추가.
- outline 또는 border 강조. 색·두께는 **기존 디자인 토큰 재사용** (`specs/spec/blue/styles/design-tokens-spec.md` 참조). `§4.A.3 표준 outline 사양` 일관.
- 예시:
  ```css
  .div--monitor-pillar:focus-visible,
  .div--monitor-statusbar:focus-visible {
    outline: 2px solid var(--color-focus-ring, currentColor);
    outline-offset: 2px;
  }
  ```

**FR-02 (Should) — Tab 순서 경량화**:
- pillar 7개 중 **컨테이너만** `tabIndex={0}`, 내부 7 bar 는 `tabIndex={-1}` 로 전환. WebVitals/VisitorMon 3 stack 도 동일.
- 목표: `/monitor` Tab stop 수 17 → 3~5 수준. 컨테이너 tooltip 이 개별 pillar 의 value 열거를 포함하는지 **사전 확인 필수** (포함되지 않으면 FR-02 는 보류 — tooltip 구조 재설계가 선행되어야 함).
- 또는 동등 대안 (group role + `aria-activedescendant`) — inspector/planner 판정.

**FR-03 (Could) — 디자인 smoke 체크리스트**:
- 운영자 1회 육안 smoke — light/dark 모드 각 1회 focus 링 가시성 확인. 결과를 task result.md 체크 박제.

**grep 수용 기준 (FR-04)**:
- `grep -rn ":focus-visible" src/Monitor/ src/index.css 2>/dev/null | grep -E "monitor-pillar|monitor-statusbar"` — expected ≥ 2 hits (pillar + statusbar 각 1 이상).
- `grep -c "tabIndex={0}" src/Monitor/{ApiCallItem,WebVitalsItem,VisitorMon}.jsx` — expected ≥ 3 (현 baseline 유지, 제거 금지).
- (FR-02 적용 시) `grep -c "tabIndex={-1}" src/Monitor/{ApiCallItem,WebVitalsItem,VisitorMon}.jsx` — expected ≥ 1.

**FR-05 (Should) — 접근성 도구 확인**:
- axe / Lighthouse 1회 `/monitor` 검사 → WCAG 2.4.7 Focus Visible 경고 **0 확인**.

**수용 기준 (REQ-20260420-021 §10)**:
- [ ] FR-01 `.div--monitor-pillar:focus-visible`, `.div--monitor-statusbar:focus-visible` 규칙 존재.
- [ ] (Should) FR-02 경량화 적용 시 `/monitor` Tab stop ≤ 5.
- [ ] `npm test` PASS, `npm run lint` PASS.
- [ ] FR-04 grep 수용 3종 / FR-05 axe 검사 충족.
- [ ] `tabIndex={0}` 제거되지 않음 (1.4.13 회귀 방지).
- [ ] 디자인 토큰 신규 추가 없음 (기존 재사용).

**§4.A 와의 관계**:
- §4.A.3/4.A.5 의 글로벌 `*:focus-visible` 규칙은 네이티브 button(패턴 A) 위주. **div 기반 trigger** 인 Monitor pillar/statusbar 는 §4.A.5 의 "컴포넌트별 변형" 경로로 보강 — 본 §4.A.9 가 해당 경로의 **첫 구체 사례**.
- 본 §은 Monitor 도메인 한정. 차기 도메인(`/log`, `/image` 등) 의 hoverPopup 이관 시 동일 패턴 수평 전개 — 별 REQ.

**범위 밖**:
- `role="tooltip"` + `aria-describedby` 구조 재설계 (이미 설치된 상태로 가정).
- 다른 도메인의 focus-visible 정책 검토 — 별 REQ.
- Playwright e2e 키보드 탐색 시나리오 추가 — 별 REQ (§2.2.3 참조).
- `tabIndex={0}` 제거 (regression — WCAG 1.4.13 위반).

---

## 4.B [WIP] 폼 검증 에러 표시 정책 (REQ-20260419-021)

> 관련 요구사항: REQ-20260419-021 FR-01 ~ FR-11, US-01 ~ US-04
> 기원: REQ-20260418-017 §13 "Comment / Writer 의 `alert(...)` 사용 — 별 후보 검토" 후속 분리

### 4.B.1 정책 (Must)

프로젝트의 모든 폼 입력 검증 실패는 **`window.alert(...)` 브라우저 모달 금지**. 대체 패턴은 아래 3 요소 동시 적용:

1. **인라인 에러 메시지 (WCAG 3.3.1 Error Identification)**
   - 입력 필드 직하 `<p id="{field}-error" role="alert">{메시지}</p>`.
   - `role="alert"` (즉시 announce) 권장 / `aria-live="polite"` 허용.
2. **ARIA 속성 (WCAG 4.1.2 Name, Role, Value)**
   - 잘못된 필드에 `aria-invalid="true"`.
   - `aria-describedby="{field}-error"` 로 메시지 연결.
3. **Toaster 보조 (도메인 일관)**
   - 기존 `src/Toaster/Toaster.jsx` (`role="alert"` 내장) 를 `warning` 톤으로 호출 — 컨텍스트 보강.
   - Comment / Writer 가 이미 보유한 Toaster state 재사용 권장 (중복 인스턴스 회피).

### 4.B.2 As-Is 결함 매트릭스 (3건)

| # | 파일:라인 | 검증 조건 | 기존 메시지 | 상태 |
|---|-----------|----------|-------------|------|
| 1 | `src/Comment/CommentForm.jsx:24-28` | `userName.length === 0` | "Please input your name." | [WIP] REQ-021 §4.B |
| 2 | `src/Comment/CommentForm.jsx:30-34` | `message.length < 5` | "Please comment at least 5 characters." | [WIP] REQ-021 §4.B |
| 3 | `src/Log/Writer.jsx:212-215` | `article.length < 5` | "Please note at least 5 characters." | [WIP] REQ-021 §4.B |

추가 관찰 (테스트 mock):
- `src/Comment/Comment.test.jsx:13` — `vi.spyOn(window, 'alert').mockImplementation(...)`.
- `src/Comment/Comment.test.jsx:115` — 동일.
- `src/Log/Writer.test.jsx:407` — 동일.
- 본 §4.B 마감 시 3 mock 모두 제거 대상 (FR-08).

### 4.B.3 표준 구현 스니펫 (FR-04, FR-05)

```jsx
// 신규 useState (per-field 또는 fieldErrors 객체)
const [fieldErrors, setFieldErrors] = useState({ name: "", message: "" });

// 검증 분기 — alert 제거, setFieldErrors + Toaster 토글
const onSubmit = () => {
    if (userName.length === 0) {
        setFieldErrors(prev => ({ ...prev, name: "Please input your name." }));
        // (기존 패턴 유지) props.showToaster("warning", "...") 또는 Comment 상위 Toaster 토글
        userNameRef.current.focus();  // focus 이동 보존 (FR-07)
        return;
    }
    // ...
};

// onChange 시 error clear (FR-06, Should)
const onChangeName = (e) => {
    setUserName(e.target.value);
    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: "" }));
};

// 입력 필드 + 인라인 에러 JSX
<input
    ref={userNameRef}
    value={userName}
    onChange={onChangeName}
    aria-invalid={!!fieldErrors.name}
    aria-describedby={fieldErrors.name ? "comment-name-error" : undefined}
/>
{fieldErrors.name && (
    <p id="comment-name-error" role="alert" className={styles.fieldError}>
        {fieldErrors.name}
    </p>
)}
```

**필드 ID 매핑 권장**:
- CommentForm name → `comment-name-error`.
- CommentForm message → `comment-message-error`.
- Writer article → `writer-article-error`.

### 4.B.4 focus 이동 보존 (FR-07, Must)

기존 `userNameRef.current.focus()` / `messageRef.current.focus()` / `document.getElementById("textarea--writer-article").focus()` 호출을 **그대로 보존**. alert 모달은 제거하지만 첫 invalid 필드로 자동 focus 이동은 키보드 사용자 흐름에 필수.

### 4.B.5 회귀 테스트 (FR-08, FR-09)

**alert mock 제거**:
- `src/Comment/Comment.test.jsx:13, 115` / `src/Log/Writer.test.jsx:407` 의 `vi.spyOn(window, 'alert')` 블록 제거.
- 검증: `grep -n "spyOn(window, 'alert')" src/Comment/Comment.test.jsx src/Log/Writer.test.jsx` → 0.

**신규 어서트 (필드당 최소 2건)**:
- `expect(screen.getByRole('alert')).toHaveTextContent("Please ...")` (인라인 에러 메시지).
- `expect(nameInput).toHaveAttribute('aria-invalid', 'true')`.
- `expect(nameInput).toHaveAttribute('aria-describedby', 'comment-name-error')`.
- Toaster 노출 어서트 (기존 Toaster 패턴 — per-domain 헬퍼 재사용).
- (Should) `onChange` 후 `aria-invalid="false"` 회복 (FR-06).
- (Should) Toaster `type="warning"` 속성 어서트.

### 4.B.6 CSS (.fieldError, FR-11 Should)

- `src/Comment/Comment.module.css` (CSS Modules) 에 `.fieldError { color: #d32f2f; font-size: 0.85em; margin-top: 2px; }` 등 추가.
- `src/Log/Writer.css` (plain CSS) 에 동일 시각적 의도의 규칙 추가.
- 디자인 토큰 합의 시 `var(--color-error)` 치환 (design-tokens-spec cross-link, Could).

### 4.B.7 grep 수용 기준 (FR-01 ~ FR-05)

- `grep -n "alert(" src/Comment/CommentForm.jsx src/Log/Writer.jsx` → 0.
- `grep -n "aria-invalid" src/Comment/CommentForm.jsx src/Log/Writer.jsx` → ≥ 3 (3 필드).
- `grep -n "role=\"alert\"" src/Comment/CommentForm.jsx src/Log/Writer.jsx` → ≥ 3 (Toaster 제외).
- `grep -n "spyOn(window, 'alert')" src/Comment/Comment.test.jsx src/Log/Writer.test.jsx` → 0.

### 4.B.8 jsx-a11y 정책 연동 (§3)

- `jsx-a11y/alt-text` / `jsx-a11y/label-has-associated-control` 와 독립 — 본 §4.B 는 **동적/패턴** 차원 (정적 lint 로 alert 자체를 잡기는 어려움).
- 후속 (Could): 커스텀 eslint rule `no-alert` 도입으로 `window.alert(` 매치 차단 — REQ-021 §13 미결. 본 §4.B 는 정책 박제 + grep 수용 기준으로 선제 차단.

### 4.B.9 WCAG 대응

- **WCAG 3.3.1 Error Identification** — 인라인 메시지 + `role="alert"` 로 직접 식별.
- **WCAG 3.3.3 Error Suggestion** — 메시지 본문이 수정 제안 내포 ("at least 5 characters" 등).
- **WCAG 4.1.2 Name, Role, Value** — `aria-invalid` / `aria-describedby` 로 상태 노출.

§4 WCAG 대응 현황 표 (§4 참조) 의 3.3.x 행은 본 §4.B 머지 후 `[x]` 로 갱신 (별 inspector 라운드).

### 4.B.10 범위 밖

- Toaster 컴포넌트 자체 인터페이스 변경 — 기존 `type`/`message` props 그대로 사용.
- 검증 로직 자체 변경 (5 character minimum, name required 등) — 본 §은 표시 방식만.
- `src/common/UserLogin.jsx` 등 다른 도메인의 `window.alert()` 점검 — 현 grep 으로 0 매치 (3 호출 모두 본 §범위).
- 폼 검증 라이브러리 (react-hook-form, formik) 도입 — 본 §은 native 검증만.
- React 19 bump (REQ-040) 자체 — 본 §은 bump 전 사전 정리.
- TypeScript 변환.

### 4.B.11 수용 기준 (REQ-20260419-021 §10)

- [ ] FR-01 ~ FR-03 3 호출 모두 `alert()` 제거 + 대체 패턴 적용.
- [ ] FR-04 `aria-invalid` 3 필드 적용 (grep ≥ 3).
- [ ] FR-05 `aria-describedby` + 인라인 `<p role="alert">` 3 필드 (grep ≥ 3).
- [ ] (Should) FR-06 `onChange` 시 error clear 테스트 PASS.
- [ ] FR-07 focus 이동 보존 (ref / getElementById 변경 0) 테스트 PASS.
- [ ] FR-08 `spyOn(window, 'alert')` 3 mock 제거 (grep 0).
- [ ] FR-09 Toaster / aria-invalid / aria-describedby 신규 어서트 6건+ PASS.
- [ ] FR-10 본 §4.B 박제 (본 반영으로 완료).
- [ ] (Should) FR-11 `.fieldError` CSS 추가 + 운영자 manual smoke 시각 확인.
- [ ] `npm run lint` clean (jsx-a11y 통과).
- [ ] `npm run test` 전체 PASS.
- [ ] NFR-06 LOC ≤ +30 (3 파일 합산).

---

## 5. 의존성

### 5.1 내부 의존
- 영향 컴포넌트: `src/Monitor/*`, `src/File/*`, `src/Image/*`, `src/Search/*` (§2.1 9곳)
- 린트 설정: `.eslintrc.yml`, `package.json` devDependencies
- CI: `.github/workflows/ci.yml` (lint 스텝)

### 5.2 외부 의존
- 패키지: `eslint@^8.x`, `eslint-plugin-jsx-a11y@^6.x`
- GitHub Actions

### 5.3 하류 영향
- 향후 모든 React 컴포넌트 PR 이 자동 점검됨
- ESLint 9 bump 시 jsx-a11y 도 함께 bump (별 후보)
- 자매 `styles-cascade-visual-smoke-spec` / 컴포넌트별 체크리스트 — 시각 회귀 검증 보완

---

## 6. 수용 기준 통합 (REQ-017 + REQ-018 + REQ-023)
- [ ] (REQ-017) 9곳 모두 패턴 A 또는 B 적용, 시각 회귀 0
- [ ] (REQ-017) 키보드 활성화 단위 테스트 9건 이상 PASS
- [ ] (REQ-018) `eslint-plugin-jsx-a11y` 설치 + `.eslintrc.yml` 에 `plugin:jsx-a11y/recommended` 반영
- [ ] (REQ-018) `npm run lint` 0 error (REQ-017 머지 이후 기준)
- [ ] (REQ-018) 비활성 룰마다 사유 코멘트
- [ ] CI lint 스텝이 a11y 룰을 실행
- [ ] (REQ-023) `accessibility-spec.md` §4.A "focus-visible 정책" 섹션 신설 (본 개정)
- [ ] (REQ-023) `design-tokens-spec.md` 에 `--color-focus-ring` (또는 동등) 토큰 정의 + light/dark 변형
- [ ] (REQ-023) `src/styles/` 에 글로벌 `*:focus-visible { outline: ... }` 규칙 추가
- [ ] (REQ-023) 패턴 B 채택 위치 CSS 에 필요한 변형 규칙 추가 (또는 글로벌로 충분 명시)
- [ ] (REQ-023) 9곳 운영자 Tab 순회 baseline 1회 마감 + 결과 박제
- [ ] (REQ-023) §4 WCAG 2.4.7 항목 `[x]` 또는 검증 reference 추가
- [ ] (REQ-023) styles cascade visual baseline 재확인 → 시각 회귀 0

---

## 7. 비기능 특성 (NFR Status)

| 항목 | 현재 | 목표 | 출처 |
|------|------|------|------|
| 키보드 활성화 | 0 / 9 | 9 / 9 | REQ-017 NFR-01 |
| 포커스 가시 (정책) | 0 | spec §4.A + 디자인 토큰 + 글로벌 규칙 | REQ-023 NFR-01 |
| 포커스 가시 (9곳 시각 검증) | 0 / 9 | 9 / 9 baseline | REQ-023 NFR-01 |
| a11y 린트 활성 룰 | 0 | ~30 (recommended) | REQ-018 |
| lint 실행 시간 증가 | - | ≤+5초 | REQ-018 NFR-02 |
| false positive | - | ≤2 (비활성 + 사유) | REQ-018 NFR-04 |
| 비활성 룰 사유 명시율 | - | 100% | REQ-018 NFR-05 |
| 프로젝트 전역 `:focus-visible` 룰 | 0 | ≥1 (글로벌) | REQ-023 §11 |
| 디자인 토큰 outline 색 | 0 | 1 (light + dark 변형) | REQ-023 §11 |

---

## 8. 알려진 제약 / 이슈
- `<button>` 교체 시 디폴트 폼/패딩 차이로 시각 회귀 가능 — 시각 검증 후 패턴 B 로 전환 고려.
- `<button>` 이 form 안에 있을 때 `type="button"` 누락 시 submit 회귀.
- `onKeyDown` 의 Space 가 페이지 스크롤과 충돌 → `e.preventDefault()` 강제.
- ESLint 9 bump 는 별 후보 — 본 정책은 8.x 기준.
- recommended 룰의 false positive 는 `rules` 섹션 비활성 + 사유 코멘트 (FR-05 of REQ-018).
- `strict` 룰셋은 도입 후 회고로 승격 검토.
- REQ-017 먼저 머지 미완료 상태로 REQ-018 단독 진행 시 9건 lint 실패 부담 (FR-04 of REQ-018 + §3.5 참조).

---

## 9. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-017) | 9곳 onClick 키보드 접근성 정책 초기화 (WIP) | 2, 4 |
| 2026-04-18 | (pending, REQ-20260418-018) | `eslint-plugin-jsx-a11y` 회귀 차단 정책 초기화 (WIP) | 3, 6 |
| 2026-04-18 | (pending, REQ-20260418-023) | focus-visible 정책 §4.A 신설 + 디자인 토큰 cross-link + 글로벌 CSS 규칙 계획 (WIP) | 4, 4.A, 6, 7 |
| 2026-04-18 | (pending, REQ-20260418-025) | `activateOnKey` 공통 헬퍼 추출 §2.2.1 신설 + §2.2 본문을 import 패턴으로 정정 계획 (WIP) | 2.2, 2.2.1 |
| 2026-04-18 | (pending, REQ-20260418-024) | ESLint 확장자 커버리지 §3.4.1 신설 — `--ext .js,.jsx` 갭 보정 (WIP, jsx-a11y 실효성 선결) | 3.4, 3.4.1 |
| 2026-04-18 | (pending, REQ-20260418-028) | §2.3 및 §4.A.7 에 `keyboard-activation-smoke.md` (배치 2) cross-link 추가 (WIP) | 2.3, 4.A.7 |
| 2026-04-18 | (pending, REQ-20260418-030) | 패턴 A UA 기본 스타일 reset 정책 §2.2.2 신설 — `:global(.button--unstyled)` 표준 스니펫 + css-modules-spec 정합 트리거 (WIP) | 2.2.2 |
| 2026-04-18 | (pending, REQ-20260418-031) | 키보드/시각 a11y E2E (Playwright/Cypress) 도입 평가 §2.2.3 신설 — Phase 1~4 로드맵 + §2.3 jsdom 한계 정책 진화 계획 (WIP) | 2.2.3 |
| 2026-04-19 | (pending, REQ-20260419-001) | 인라인 `activateOnKey` 6 컴포넌트 sweep §2.2.1.1 신설 — `@/common/a11y` import 일원화 + dead export 해제 + 번들 청크 검증 (WIP) | 2.2.1.1 |
| 2026-04-19 | (pending, REQ-20260419-002) | 키보드 a11y 런타임 수동 스모크 체크리스트 §2.2.4 신설 — `docs/testing/keyboard-a11y-runtime-smoke.md` 정책·구조 SSoT, `KA-XX` 식별자, §2.1 1:1 매핑, §4.A focus-visible 정책 1회 순회 흡수 (WIP) | 2.2.4 |
| 2026-04-19 | (pending, REQ-20260419-003) | ESLint v9 + flat config 마이그레이션 §3.4.2 신설 — `eslint.config.js` 이관, legacy `.eslintrc.yml` 종료, 플러그인 v9 호환, 룰셋 동등성 검증, Node 20 유지, github-actions-ci-spec §3.1.3 cross-link (WIP) | 3.4.2 |
| 2026-04-19 | (pending, REQ-20260419-014) | `react/no-unknown-property` ignore 목록 dead `enlarged` 1줄 제거 §3.4.3 신설 — REQ-026 후속 정리, `[imageurl, thumbnailurl, enlarged]` → `[imageurl, thumbnailurl]` 축소, REQ-003 flat config 위치 동시 정리 (WIP) | 3.4.3 |
| 2026-04-19 | (pending, REQ-20260419-021) | 폼 검증 에러 표시 정책 §4.B 신설 — `window.alert(...)` 금지 + `aria-invalid` / `aria-describedby` / `role="alert"` 인라인 메시지 + Toaster 보조 표준 패턴 박제, CommentForm×2 + Writer×1 결함 매트릭스 (WCAG 3.3.1/3.3.3/4.1.2, REQ-017 §13 후속) (WIP) | 4.B |
| 2026-04-20 | (inspector drift reconcile) | §2.1 표 행 #6/#7/#8 (FileItem filename + 삭제 + ImageSelector Retry) 를 "[WIP] REQ-029 §2.1.1" → "**머지**" 로 ACK: commits `24493bb` (FileItem filename+delete 패턴 B, tasks `20260418-a11y-fileitem-keyboard-activation`) / `695e65d` (ImageSelector Retry 패턴 B, task `20260418-a11y-imageselector-retry-keyboard`); src 관측: `FileItem.jsx` `activateOnKey` import + `tabIndex={0}` + `onKeyDown={activateOnKey(copyFileUrl)}` / `onKeyDown={activateOnKey(confirmDelete)}` 확인, `ImageSelector.jsx:147` `onKeyDown={activateOnKey(handleRetry)}` 확인. 진행률 6/9 → 9/9 마감. REQ-029 §2.1.1 수용 체크박스 및 §2.4 수용 grep 자체는 본 ACK 범위 밖 (아래 §2.1.1 섹션 별 라운드 정리 필요). 커밋 영향: 본 spec 단독. | 2.1 |
| 2026-04-20 | (inspector drift reconcile) | §3.2 헤더 rename: "(To-Be)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3.2 |
| 2026-04-20 | (pending, REQ-20260420-021) | §4.A.9 신설 — Monitor 도메인 tabIndex focus-visible CSS + Tab 순서 경량화. 6881e1d (hoverPopup Monitor 이관) 직후 신규 tabIndex={0} 3 컴포넌트(ApiCallItem pillar / WebVitalsItem statusBar / VisitorMon EnvStack)에 대해 `.div--monitor-pillar:focus-visible` + `.div--monitor-statusbar:focus-visible` 규칙 + 컨테이너 grouping 으로 Tab stop 17 → 3~5 축소. 디자인 토큰 재사용. §4.A 글로벌 규칙의 "컴포넌트별 변형" 경로 첫 사례 (WIP) | 4.A.9 |
| 2026-04-20 | (pending, REQ-20260420-022) | §3.4.2 확장 — REQ-003 (flat config) + REQ-018 (jsx-a11y) 둘 다 done 이지만 실태 미반영 drift (`.eslintrc.yml` + `eslint@8.28.0` + `eslint-plugin-jsx-a11y` 미설치) 2차 재집행. REQ-022 전용 수용 기준 6건 추가 (`.eslintrc.yml` 부재, `eslint.config.*` 존재, eslint v8 버전 스트링 0 hits, jsx-a11y 물리 설치, a11y smoke 반응, lint-staged 호환). 동일 메타 패턴 병렬: REQ-021 (React 19 2차 drift). (WIP) | 3.4.2 |

## 10. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260418-non-button-onclick-keyboard-a11y.md` (REQ-017)
  - `specs/requirements/done/2026/04/18/20260418-eslint-jsx-a11y-plugin-adoption.md` (REQ-018)
  - `specs/requirements/done/2026/04/18/20260418-focus-visible-css-policy-keyboard-activatables.md` (REQ-023)
  - `specs/requirements/done/2026/04/18/20260418-activateonkey-helper-extraction.md` (REQ-025)
  - `specs/requirements/done/2026/04/19/20260419-a11y-pattern-b-sweep-inline-activateonkey.md` (REQ-20260419-001, 후속 sweep)
  - `specs/requirements/done/2026/04/18/20260418-eslint-jsx-extension-coverage-fix.md` (REQ-024)
  - `specs/requirements/done/2026/04/18/20260418-post-merge-visual-and-kbd-smoke-consolidation-batch2.md` (REQ-028, 배치 2 keyboard-activation-smoke)
- 관련 spec:
  - `specs/spec/green/styles/design-tokens-spec.md` §4.3 (`--color-focus-ring` 토큰, REQ-023 연계)
  - `specs/spec/green/ci/github-actions-ci-spec.md` (lint 스텝)
  - `specs/spec/green/testing/styles-cascade-visual-smoke-spec.md` (시각 회귀 검증 보완)
  - `specs/spec/blue/testing/toaster-visual-smoke-spec.md` (자매 체크리스트)
- 외부:
  - WCAG 2.1.1 Keyboard: https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
  - WCAG 2.4.7 Focus Visible: https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html
  - WCAG 4.1.2 Name, Role, Value: https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html
  - `eslint-plugin-jsx-a11y`: https://github.com/jsx-eslint/eslint-plugin-jsx-a11y
  - React a11y: https://react.dev/learn/accessibility
