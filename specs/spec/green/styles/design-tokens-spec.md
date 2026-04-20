# 명세: 디자인 토큰 재구성 / App.css 분할 (2단계)

> **위치**: `src/App.css` → `src/styles/{tokens,fonts,reset,typography,utilities,syntax,index}.css`
> **유형**: 스타일 아키텍처 / 토큰 체계
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-014 반영)
> **상태**: Active (styles 분할 완료 / 컴포넌트 import 정리 단계)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260417-design-tokens-restructure.md`
> - `specs/requirements/ready/20260418-component-css-redundant-global-imports-removal.md` (REQ-20260418-014)
> - `specs/requirements/done/2026/04/18/20260418-focus-visible-css-policy-keyboard-activatables.md` (REQ-20260418-023) — `--color-focus-ring` 토큰 신설 (WIP)

> 본 문서는 1단계(CSS Modules) 완료 후 진행되는 전역 스타일 토큰화 정책.
> 1단계 정책: `specs/spec/green/styles/css-modules-spec.md`.

---

## 1. 역할 (Role & Responsibility)
전역 디자인 토큰을 카테고리화하고 `App.css` 를 역할별 파일로 분할.

- 주 책임:
  - CSS 변수 카테고리 프리픽스(color/space/font/layout) 표준화
  - `App.css` (361줄) 를 역할별 파일로 분리
  - Navigation 소유 스타일을 컴포넌트 Module 로 이전
  - 전역 유틸리티 의도를 명시적으로 구분
- 의도적으로 하지 않는 것:
  - 다크모드 / 테마 전환 메커니즘
  - Sass / PostCSS nesting 도입
  - Style Dictionary 등 토큰 소스 관리 도구 도입
  - Tailwind / CSS-in-JS 전환

## 2. 전제 조건
- **1단계(CSS Modules) 완료** — 8개 컴포넌트 CSS 가 `*.module.css` 로 이전된 상태
- 전역 공유 유틸리티(`.button`, `.article`, `.p`, `.textarea`, `.li`, `.footer`, `.hidden--width-*`) 는 여전히 `App.css` 에 있음
- 네비게이션 관련 스타일(`.nav--nav-bar`, `.ul--nav-tabs`, `.li--nav-*`) 은 1단계에서 남겨두었을 가능성 → 이번 과제에서 정리

## 3. 디렉토리 구조
**[deferred: CSS Modules 1단계(8개 컴포넌트) 완료 후 가능 — styles/css-modules-spec §10 진행 의존. 단일 태스크 단위 carve 불가한 2단계 cross-cutting 리스트럭처링]**
```
src/styles/
  index.css          # 진입점. 아래 파일들을 @import 순서대로
  tokens.css         # :root CSS 변수 (디자인 토큰)
  fonts.css          # @font-face 선언
  reset.css          # body, a, ul, ol, img, hr 등 태그 리셋
  typography.css     # h1~h6, blockquote, code, pre, .p, .article
  utilities.css      # .button, .textarea, .hidden--width-*, .show--width-*, .li
  syntax.css         # .span--kotlin-*, .span--yml-* (코드 하이라이터 색상)
```
`App.jsx` 의 `import './App.css'` → `import './styles/index.css'` 로 변경.

## 4. 토큰 재명명 (tokens.css)

### 4.1 기존 → 신규 매핑
```
--normal-text-color         → --color-text-primary
--inactive-text-color       → --color-text-muted
--sub-text-color            → --color-text-sub
--active-text-color         → --color-text-active
--normal-background-color   → --color-bg-primary
--hover-background-color    → --color-bg-hover
--active-background-color   → --color-bg-active
--loading-background-color  → --color-bg-loading
--info-background-color     → --color-bg-info
--disabled-background-color → --color-bg-disabled
--normal-border-color       → --color-border-primary
--hover-border-color        → --color-border-hover
--active-border-color       → --color-border-active
--shadow-color              → --color-shadow
--success-text-color        → --color-status-success-text
--success-background-color  → --color-status-success-bg
--warning-text-color        → --color-status-warning-text
--warning-background-color  → --color-status-warning-bg
--error-text-color          → --color-status-error-text
--error-background-color    → --color-status-error-bg
--sub-font-size             → --font-size-sub
--info-font-size            → --font-size-info
```

### 4.2 신규 추가
```
--font-size-base: 1rem
--font-size-h1 ~ --font-size-h6   # 기존 하드코딩(1.5rem~0.8rem) 이동
--space-1: 0.5em
--space-2: 1em
--space-3: 1.5em
--space-4: 2em
--layout-max-width: 800px
--layout-max-width-wide: 1600px
```

### 4.3 [WIP] 접근성 토큰 (REQ-20260418-023)
**[deferred: REQ-20260418-023 토큰 명명 규약 §13 미결 — upstream `accessibility-spec.md` §4.A focus-visible 정책 확정 및 토큰명 후보 3종(`--color-focus-ring` vs `--focus-ring-color` vs `--ring-color`) 중 합의 전까지 carve 불가. planner 는 본 §4.3 을 승격 게이트 계산에서 제외.]**
> 관련 요구사항: REQ-20260418-023 FR-02, US-01, US-03

focus-visible 정책 (`accessibility-spec.md` §4.A) 을 위한 outline 색상 토큰.

**토큰 이름**: `--color-focus-ring` (잠정)
- 대안 후보: `--focus-ring-color`, `--ring-color`
- §13 미결 (REQ-023) — 디자인 토큰 명명 규약 합의 필요.

**값 (잠정)**:
```css
:root {
  /* light (기본) */
  --color-focus-ring: #2563eb;  /* 잠정: accessible on light bg (대비 ≥ 3:1) */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-focus-ring: #60a5fa;  /* 잠정: accessible on dark bg */
  }
}

@media (prefers-contrast: more) {
  :root {
    --color-focus-ring: Highlight;  /* 시스템 highlight 색 활용 */
  }
}
```

- light/dark 변형 필수 (NFR: 두 모드 모두 가시성).
- `prefers-contrast` 미디어 쿼리 활용 또는 별 토큰 분리 가능 — 범위 좁혀 변형 2종(light/dark) 만 Must, 고대비는 Should.
- 사용처: 글로벌 `*:focus-visible { outline: 2px solid var(--color-focus-ring); }` (상세는 `accessibility-spec.md` §4.A.3).

**검증**:
- `grep -rn "var(--color-focus-ring)" src/` → ≥1 (글로벌 규칙)
- 라이트/다크 테마 모두 9곳 포커스 링 가시 (`accessibility-spec.md` §4.A.7 baseline)

## 5. 변수 참조 마이그레이션
- Modules 및 전역 CSS 전체에서 변수명 치환
- `grep -rn "var(--normal-text-color)" src/` 로 사용처 일괄 확인 후 교체
- 일괄 `sed` 보다 파일별 확인 권장 (의도치 않은 치환 방지)
- 검증: `grep -rE "var\(--(normal|sub|active|inactive|hover|success|warning|error|info|disabled|loading|shadow)-" src/` 결과 0건

### 5.1 전역 styles 단일 진입점 정책 (REQ-20260418-014)
> 관련 요구사항: REQ-20260418-014 FR-01, FR-02, FR-03, US-01

- **정책**: 전역 styles(`src/styles/index.css`) 는 `src/App.jsx` 가 **단 1회만** import 한다.
- **금지**: 컴포넌트 CSS 파일이 자체적으로 `@import url(../styles/index.css);` 또는 동등 구문을 통해 전역 styles 를 끌어오는 것.
  - 위반 시: 토큰/리셋/타이포 규칙이 컴포넌트 청크마다 중복 포함 → 번들 비대 + cascade 중복 평가.
- **현재 위반 지점 (REQ-014 정리 대상, 총 7건)**:
  - `src/Monitor/Monitor.css:1`
  - `src/File/File.css:1`
  - `src/Comment/Comment.css:1`
  - `src/Image/ImageSelector.css:1`
  - `src/Search/Search.css:1`
  - `src/Log/Log.css:1`
  - `src/Log/Writer.css:1`
- **검증 grep (정리 후 기대값)**:
  - `grep -rn "@import.*styles/index.css" src/` → 0
  - `grep -rn "styles/index.css" src/` → 2 (App.jsx + PageNotFound.jsx 의심 — 단독 진입 시나리오 없으면 App.jsx 만)
- **선택 사항 (Should)**: stylelint / regex 룰로 신규 `@import url(../styles/...)` 추가 차단. 도입 여부는 planner 결정 (REQ-014 §13 미결).
- **가정**: SPA 구조 — 모든 라우트가 `App.jsx` 트리 내부에서 마운트 → 전역 styles 항상 로드됨. `src/common/PageNotFound.jsx` 단독 진입 시나리오 여부는 REQ-014 §13 미결 (현재 구조 검증 결과 불필요).
- **번들 크기 검증 매트릭스 (REQ-014 FR-06, US-02)**:
  - `du -sh build/assets/{Comment,File,Image,Log,Monitor,Search,Writer}-*.css` 변경 전후 비교
  - `grep -c ":root\|--color-" build/assets/Comment-*.css` 등으로 토큰 정의 중복 제거 확인 (기대: 0 또는 소수)
  - 결과는 해당 task `result.md` 에 수치 기록 (NFR-04 from REQ-014).

## 6. Navigation 스타일 이전
대상 셀렉터: `.nav--nav-bar`, `.ul--nav-tabs`, `.li--nav-title`, `.li--nav-right`, `.li--nav-active`, `.li--nav-inactive` 및 관련 hover.
- `App.css` → `src/common/Navigation.module.css` 로 이전
- `Navigation.jsx` 의 `className` 을 `styles.navNavBar` 등으로 수정
- 이동 후 `App.css` 에서 해당 규칙 제거

## 7. 전역 유틸리티 정리 (utilities.css)
그대로 이전하되 의도 주석 추가:
```css
/* 반응형 가시성 유틸리티 — 컴포넌트에서 직접 class 문자열로 사용 */
.hidden--width-640px { /* 기존 규칙 유지 */ }
```
`.button`, `.textarea`, `.li`, `.footer`, `.p`, `.article` 은 여러 컴포넌트가 문자열 그대로 참조하므로 전역 유지.

## 8. 메시지 박스 / 결과 표시 클래스
대상: `.section--message-box`, `.h1--notification-result`, `.h2--message-error`, `.div--message-description`, `.button--message-retrybutton`, `.span--footer-left`, `.span--footer-right`, `.span--login-text`.

판정 로직:
- 단일 컴포넌트 소유 → 해당 Module 로 이전
- 여러 곳 참조 → `utilities.css` 로 유지

조사: `grep -rn "section--message-box\|h1--notification-result" src/`

## 9. 검증
- `npm run dev` — 시각 회귀 없음 (배경/텍스트/보더 색상, 네비게이션, 반응형 브레이크포인트, 토스트 상태 색)
- `npm test` — 전체 통과
- `npm run build` — CSS 번들 크기 ±5% 이내
- DevTools 에서 `document.documentElement` 의 `computedStyle` 이 신규 변수 보유 확인
- 반응형: 350px, 400px, 640px 브레이크포인트에서 `hidden--width-*` 동작

## 10. 회귀 기준
- 토큰 네이밍 변경만으로 시각적 변화 발생 금지 (1:1 매핑)
- Navigation 의 active/hover/inactive 상태 보존
- 전역 `.button` hover/active 효과 보존

## 11. 구현 순서 (권장)
1. `src/styles/` 생성 + 6개 파일로 현재 `App.css` 내용 **그대로** 분할 (이름만 이동, 변수명 미변경) → 빌드/시각 확인 → 커밋
2. `tokens.css` 내 변수 재명명 + 전역 참조 일괄 교체 → 시각 확인 → 커밋
3. 컴포넌트 Module 내 변수 참조 교체 (컴포넌트당 분리 커밋 가능) → 커밋
4. Navigation 스타일 이전 → 커밋
5. 메시지 박스류 사용처 조사 후 이동 → 커밋
6. `App.css` 삭제 (또는 `styles/index.css` 로 대체됨 확인)

## 12. 범위 밖 (후속)
- 다크모드 / 테마 전환 (`[data-theme="dark"] :root { ... }`)
- Sass / PostCSS nesting
- 디자인 토큰 JSON 소스 관리 (style-dictionary 등)
- Tailwind / CSS-in-JS
- 유틸리티 클래스의 Modules `composes` 활용

## 13. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260417-design-tokens-restructure.md`
  - `specs/requirements/done/2026/04/18/20260418-focus-visible-css-policy-keyboard-activatables.md` (REQ-023) — §4.3
- 선행 spec: `specs/spec/green/styles/css-modules-spec.md` (1단계)
- 관련 spec: `specs/spec/green/common/accessibility-spec.md` §4.A (focus-visible 정책 소비)

## 14. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending) | 토큰 재구성 / App.css 분할 요구사항 등록 (WIP) | 3, 4, 6 |
| 2026-04-18 | (pending, REQ-20260418-014) | 컴포넌트 CSS 의 중복 전역 `@import` 제거 + 단일 진입점 정책 명시 (WIP) | 5.1 |
| 2026-04-18 | (pending, REQ-20260418-023) | `--color-focus-ring` 접근성 토큰 신설 + light/dark/고대비 변형 (WIP) | 4.3, 13 |
| 2026-04-20 | (inspector Phase 2 defer-tag) | §4.3 접근성 토큰 섹션에 `[deferred: REQ-023 토큰 명명 규약 §13 미결 — upstream accessibility-spec §4.A 확정 대기]` 태깅 — upstream 미결정 cross-cutting. §3 To-Be 디렉토리 구조는 이미 defer-tag(2026-04-18 prior cycle). 나머지 §4.1/4.2/5/6/7/8 token rename + migration + navigation 이전 + utilities 정리 섹션은 active 유지 (과태깅 방지). planner 의 승격 게이트 계산은 §3/§4.3 deferred 제외로 본 spec 다음 cycle 승격권 진입. 커밋 영향: 본 spec 단독. | 4.3, 14 |
| 2026-04-20 | (inspector Phase 1 drift reconcile) | §3 header rename: `## 3. 디렉토리 구조 (To-Be)` → `## 3. 디렉토리 구조` — "To-Be" 리터럴 제거 (planner §4 Cond-3 `^#+ .*To-Be` 매칭 해소). 섹션 본문 / `[deferred: CSS Modules 1단계 완료 후 가능 ...]` 태깅 / 의미 전부 유지, 헤더 문자열만 상태 중립화. deferred tag 는 이미 반영된 상태이므로 의미 동일. 다른 섹션·본문 "To-Be" 는 무관(Cond-3 헤더만 매칭). 커밋 영향: 본 spec 단독. | 3, 14 |
