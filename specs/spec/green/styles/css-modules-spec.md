# 명세: CSS Modules 마이그레이션 (1단계)

> **위치**: `src/**/*.css` → `src/**/*.module.css`, `src/App.css` (전역 유지)
> **유형**: 스타일 아키텍처 / 마이그레이션 정책
> **최종 업데이트**: 2026-04-20 (by inspector, WIP — REQ-20260420-024 §10.10 신설: SearchInput.test substring→anchored regex 어서트 강화)
> **상태**: Active (마이그레이션 진행 중)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260417-css-modules-migration.md`
> - `specs/requirements/done/2026/04/18/20260418-imageitem-imperative-dom-react-refactor.md` (REQ-20260418-026, ImageItem 명령형 DOM → 선언적 React 리팩터; CSS Modules 마이그레이션 사후 위생 작업)
> - `specs/requirements/done/2026/04/18/20260418-comment-module-css-dead-class-removal.md` (REQ-20260418-034, Comment 도메인 dead class 4종 제거)
> - `specs/requirements/done/2026/04/19/20260419-filedrop-imperative-dom-classlist-react-refactor.md` (REQ-20260419-010, FileDrop 명령형 DOM → 선언적 React 리팩터; REQ-026 패턴 재적용)
> - `specs/requirements/done/2026/04/19/20260419-comment-replypopup-log-global-class-policy.md` (REQ-20260419-011, Comment ↔ Log 전역 클래스 정책 결정)
> - `specs/requirements/done/2026/04/19/20260419-cross-domain-modules-dead-class-audit.md` (REQ-20260419-012, Image/Search/Toaster 도메인 dead class audit)
> - `specs/requirements/done/2026/04/19/20260419-stylelint-no-unused-selectors-introduction.md` (REQ-20260419-013, stylelint + unused-selectors 자동 감지 룰 도입)
> - `specs/requirements/done/2026/04/19/20260419-logitem-setitemclass-declarative-refactor.md` (REQ-20260419-019, LogItem `setItemClass` 명령형 className state → 선언적 React, REQ-026/010/015 패턴 4차 재적용 — Log 도메인 마무리)
> - `specs/requirements/ready/20260420-searchinput-test-substring-regex-tightening.md` (REQ-20260420-024, SearchInput.test 어서트를 substring `toContain` → anchored 정규식 `toMatch(/_divSearchMobile(?!hide)/)` 로 강화 — CSS Modules hash 접미에서 `search-mobile ⊂ search-mobilehide` substring 중첩 blind spot 해소; §10.10 신설)

> 본 문서는 컴포넌트 국소 스타일을 `*.module.css` 로 이전하는 1단계 정책을 기술.
> 디자인 토큰 재구성/`App.css` 분할 (2단계) 은 별도 spec (`design-tokens-spec.md`).

---

## 1. 역할 (Role & Responsibility)
컴포넌트 단위 CSS 의 전역 충돌 위험을 자동 스코핑으로 제거.

- 주 책임:
  - 컴포넌트 소유 스타일 → `*.module.css` 로 이전
  - 명명 규칙(파일명, import 식별자, 클래스명) 표준화
  - 전역 유지 대상 (`App.css`) 명확화
- 의도적으로 하지 않는 것:
  - `App.css` 의 분할 / 토큰 재명명 (2단계)
  - 디자인 토큰 체계 재설계 (2단계)
  - 다크모드 / 테마 전환 (후속)
  - Tailwind / CSS-in-JS 도입 (후속)

## 2. 현재 상태 (As-Is)
- 9개 컴포넌트 CSS 파일 모두 전역 import (`import './X.css'`)
- BEM 유사 프리픽스(`.li--nav-title`, `.span--footer-left`) 로 충돌 회피
- 짧은 클래스명(`.button`, `.article`, `.p`) 을 여러 컴포넌트가 공유 → 영향 범위 추적 곤란
- Vite 환경 — `*.module.css` 별도 설정 없이 동작

## 3. 목표
> 관련 요구사항: 20260417-css-modules-migration

### 3.1 마이그레이션 대상 (8개)
1. `Toaster.css` (가장 작음, 의존 없음 — 시작)
2. `Search.css`
3. `ImageSelector.css`
4. `Comment.css`
5. `File.css`
6. `Monitor.css`
7. `Writer.css`
8. `Log.css`

### 3.2 전역 유지 대상
- `App.css` — 이번 범위 밖
  - `@font-face`, `:root` 변수
  - 태그 셀렉터 (`body`, `a`, `ul`, `ol`, `img`, `blockquote`, `code`, `pre`, `hr`, `h1~h6`)
  - `div#root`, `div#root.fullscreen`
  - 전역 `@media` 유틸리티 (`.hidden--width-640px` 등)
  - 범용 클래스 (`.button`, `.article`, `.p`, `.textarea`, `.li`, `.footer`)

### 3.3 네이밍 컨벤션
- 파일명: `X.module.css`
- Import 식별자: `styles` (예: `import styles from './X.module.css'`)
- 클래스명: camelCase 변환만 수행 (`.li--nav-title` → `styles.liNavTitle`)
- BEM 프리픽스 제거는 **이번 과제 범위 밖** (리네이밍 최소화)

## 4. 변환 절차 (파일당)
1. `X.css` → `X.module.css` 로 rename
2. 컴포넌트의 `import './X.css'` → `import styles from './X.module.css'`
3. 클래스 사용처: `className="foo foo--bar"` → ``className={`${styles.foo} ${styles.fooBar}`}``
4. 조건부 클래스: 템플릿 리터럴 또는 배열 `.filter(Boolean).join(' ')`
5. 타 컴포넌트 클래스를 셀렉터 내부에서 참조하는 경우 (예: `.ul--nav-tabs a`) → `:global(...)` 로 명시
6. 테스트 영향 검토:
   - `getByText` / `getByRole` 기반 → 무영향
   - `container.querySelector('.foo')` → 해시된 클래스명으로 깨짐 → 쿼리 방식 변경

## 5. 크로스-컴포넌트 클래스 처리
범용 클래스(`.button`, `.article`, `.p`, `.textarea`, `.li`, `.footer`) 는 여러 컴포넌트가 공유.
- 이번 단계: **전역 유지** (각 컴포넌트가 중복 선언하지 않도록)
- JSX 사용: ``className={`${styles.myThing} button`}`` (문자열 그대로)
- Modules 화 또는 `composes` 활용은 2단계 검토

## 6. CSS 변수 참조
`var(--normal-text-color)` 등 변수 참조는 Modules 내에서도 그대로 동작 (전역 `:root` 상속). 변경 불필요.

> **단일 진입점 정책** (REQ-20260418-014): 컴포넌트 CSS / Modules 가 `@import url(../styles/index.css);` 등으로 전역 styles 를 자체 끌어오는 행위는 금지. 전역은 `src/App.jsx` 만 1회 import. 상세는 `design-tokens-spec.md` §5.1.

## 7. 검증
- `npm run dev` 시각 회귀 확인 — 골든 패스: Log 목록 → 단건 → 작성, Monitor 탭, File 업로드
- `npm test` 전체 통과 — `className` 문자열 매칭 테스트 수정
- `npm run build` 성공 + 번들 내 해시 클래스 확인 (`dist/assets/*.css`)
- DevTools 에서 컴포넌트 루트 요소 클래스가 `_fooBar_abc12` 형태로 해시되었는지

## 8. 회귀 기준
- 기존 스냅샷/시각적 UI 변화 없음
- 전역 `.button`, `.article` 등 정상 동작
- Suspense lazy 로딩(`App.jsx:6-11`) 깨지지 않음 — Log/File/Monitor 첫 진입 시 스타일 플래시 없음

## 9. 구현 순서 (권장)
1. `Toaster` 마이그레이션 → 빌드/테스트 통과 → 커밋
2. 패턴 안정 후 나머지 7개 순차 처리 (컴포넌트당 1 커밋)
3. 완료 후 `grep -r "import.*\.css'" src/` → 잔여 부수효과 import 가 `App.css` 만인지 확인

## 10. 범위 밖 (2단계 이관)
- `App.css` 분할 (`tokens.css`, `reset.css`, `typography.css`, `utilities.css`, `syntax.css`, `fonts.css`)
- CSS 변수 재명명 / 디자인 토큰화 (`--color-text-primary`, `--space-2` 등)
- 전역 유틸리티 클래스 Modules 화 또는 `composes` 활용
- 다크모드 / 런타임 테마 전환

## 10.1 [WIP] ImageItem 명령형 DOM → 선언적 React (REQ-20260418-026)

> 관련 요구사항: REQ-20260418-026 FR-01 ~ FR-09, US-01~US-03

**맥락 (2026-04-18 관측)**: CSS Modules 마이그레이션 (`60ef1c9`) 직후 `src/Image/ImageItem.jsx:23-38` 의 `onClick` 이 `e.target.setAttribute("class" | "src" | "enlarged", ...)` 로 **React 가 모르는 DOM mutation** 을 수행. CSS Modules hash 클래스 식별자(`baseClass`, `selectedClass`) 가 명령형으로 토글되므로, 부모 `ImageSelector` 리렌더 시 React 가 `className={baseClass}` 를 재적용하면 **사용자 확대 상태(isEnlarged) 가 사라지는 시각 회귀** 가능. React 19 strict mode 의 effect double-invocation 과 결합 시 회귀 확률 상승.

**현재 결함 요약**:
- `grep -n "setAttribute" src/Image/ImageItem.jsx` → 6 hits (3 props × 2 분기; `class`, `src`, `enlarged`).
- 단위 테스트 `src/Image/ImageItem.test.jsx` 는 `getAttribute("enlarged")` 에 의존 — jsdom 은 setAttribute 를 반영하므로 PASS 하지만 실 브라우저 부모 리렌더 시나리오는 미커버.
- `.eslintrc.yml:33-37` 의 `react/no-unknown-property` ignore 에 `imageurl`, `thumbnailurl`, `enlarged` 3건 — custom HTML 속성 잔존.

**목표 패턴 (To-Be)**:
```jsx
const [isEnlarged, setIsEnlarged] = useState(false);
const className = isEnlarged ? selectedClass : baseClass;
const src = isEnlarged ? fullsizeImageUrl : thumbnailImageUrl;
return (
  <img
    className={className}
    data-testid="imageItem"
    role="listitem"
    src={src}
    alt={props.fileName}
    title={props.fileName}
    data-enlarged={isEnlarged ? 'Y' : 'N'}
    onClick={(e) => {
      if (isEnlarged) props.copyMarkdownString(e);
      setIsEnlarged((prev) => !prev);
    }}
  />
);
```
- `setAttribute` 호출 0건. 부모 리렌더 시 React 가 `className`/`src` 를 상태 기반으로 유지.
- `enlarged="Y|N"` → `data-enlarged="Y|N"` (HTML5 `data-*` 표준). 테스트는 `getAttribute("data-enlarged")` 로 동등 보존.
- `copyMarkdownString(e)` 호출은 축소 전환 직전 1회 보존 (기존 동작 동일).

**단위 테스트 갱신 (FR-06)**:
- 기존 토글 / copyMarkdownString 1회 호출 어서트 → `data-enlarged` 기반으로 동등 이전.
- 신규 **부모 리렌더 후 상태 유지** 회귀 테스트 1건 (`rerender` 후 `data-enlarged="Y"` 지속) — NFR-01.
- React 18 `<StrictMode>` 안에서 토글 PASS 회귀 테스트 (Should, FR-07).

**부수 효과 (FR-08, Could — planner 결정)**:
- `imageurl` / `thumbnailurl` 도 `data-imageurl` / `data-thumbnailurl` 로 동시 표준화 → `.eslintrc.yml` 의 `react/no-unknown-property` ignore 목록에서 3건 모두 제거 가능.
- 본 REQ 에서 묶을지 별 PR 로 분리할지는 planner.

**CSS Modules 정합**: `ImageSelector.module.css` 의 `imgImageImageitem`, `imgImageSelected` 해시 식별자는 컴포넌트 scope 내부에서만 사용 — 본 리팩터가 declarative 로 전환해도 hash 식별자 그대로 참조 가능 (동일 scope). `:global(...)` 사용 불필요.

**수용 기준 (REQ-20260418-026 §10)**:
- [ ] `src/Image/ImageItem.jsx` 가 `useState` + 선언적 `className`/`src`/`data-enlarged` 사용
- [ ] `grep -n "setAttribute" src/Image/ImageItem.jsx` → 0 hits
- [ ] 부모 리렌더 후 상태 유지 회귀 테스트 1건 PASS
- [ ] React 18 StrictMode 안에서 토글 정상
- [ ] 번들 영향 ≤ ±0.2KB gzip
- [ ] `imageurl`/`thumbnailurl` 동시 표준화 시 `.eslintrc.yml` ignore 3건 → 0~2건 감소
- [ ] `npm test` 100% PASS, `npm run lint` / `npm run build` 회귀 0
- [ ] ImageSelector 시각 스모크 baseline 1회 (REQ-20260418-028 `image-selector-visual-smoke.md` 와 세션 통합 권장)

**범위 밖**: ImageSelector 의 명령형 패턴(별 후보), `src/Search/SearchInput.jsx:118-126` 의 `setAttribute("class", ...)` 분기(별 후보), ImageItem 시각 디자인 변경, Storybook/Playwright 도입, TypeScript 변환.

## 10.2 [WIP] Comment 도메인 dead class 4종 제거 (REQ-20260418-034)

> 관련 요구사항: REQ-20260418-034 FR-01 ~ FR-08, US-01~US-03

**맥락 (2026-04-18 관측)**: Comment 도메인 CSS Modules 마이그레이션 (`38c456e`) 직후 followup 박제 결과, `src/Comment/Comment.module.css` 에 정의되어 있으나 어디에서도 참조되지 않는 dead class 4종 확인:

| 클래스 | 라인 | 정의 크기 | 비고 |
|--------|------|-----------|------|
| `.div--comment-name` | `:30-37` | 8 라인 | `grep -rn "divCommentName" src/` → 0 hit |
| `.div--comment-form` | `:93-95` | 3 라인 | `grep -rn "divCommentForm" src/` → 0 hit |
| `.div--comment-replypopup` | `:102-113` | 12 라인 | 현 JSX 는 `Log.css` 전역 `.div--logitem-linkmessage` 사용 중 |
| `.textarea--comment-reply` | `:162-164` | 3 라인 | `grep -rn "textareaCommentReply" src/` → 0 hit |

**목표 (FR-01 ~ FR-04)**: dead class 4종 모두 제거. 약 26 라인 + 공백 감소.

**삭제 직전 재검증 (FR-05)**:
- `grep -rn "divCommentName\|divCommentForm\|divCommentReplypopup\|textareaCommentReply" src/` → 0 hit 재확인.
- `grep -rn "div--comment-name\|div--comment-form\|div--comment-replypopup\|textarea--comment-reply" src/` → 4 정의 라인 외 0 hit.

**회귀 검증**:
- `npm test` 100% PASS (Comment 도메인 6 케이스 + 전체 289+ 케이스).
- `npm run build` PASS, `npm run lint` 0 warn.
- 빌드 산출물 byte 비교: `build/assets/Comment-*.css` 감소량 result.md 박제 (FR-06).

**inspector 트리거 (FR-07)** — `.div--comment-replypopup` ↔ Log 전역 의존 정책:
- 현재 `src/Comment/CommentItem.jsx:51` 는 `Log.css:92` 의 전역 `.div--logitem-linkmessage` 클래스 문자열을 직접 사용 (Modules 스코핑 회피 — §5 격리 원칙 잠재 위반).
- 본 §5 (또는 신규 §5.1) 에 "도메인간 클래스 재사용" 정책 박제 (별 라운드):
  - 옵션 (a): 현행 전역 재사용 허용 — `:global(.div--logitem-linkmessage)` 명시적 wrapper 도입.
  - 옵션 (b): Modules 이전 — `Comment.module.css` 안에 자체 클래스로 정의.
- 본 spec 업데이트에서는 옵션 선택 미결 (inspector 다음 라운드). 현 로케이션에서는 (a) 현행 허용 + `:global()` 명시적 wrapper 가 변경 폭이 작아 유력.

**수용 기준 (REQ-20260418-034 §10)**:
- [ ] `src/Comment/Comment.module.css` 에서 4 dead class 삭제
- [ ] `grep -rn "divCommentName\|divCommentForm\|divCommentReplypopup\|textareaCommentReply" src/` → 0 hit (result.md 박제)
- [ ] `grep -rn "div--comment-name\|div--comment-form\|div--comment-replypopup\|textarea--comment-reply" src/` → 0 hit (result.md 박제)
- [ ] `npm test` 100% PASS, `npm run lint` 0 warn, `npm run build` PASS
- [ ] `build/assets/Comment-*.css` byte 변화 result.md 박제 (감소량)
- [ ] Comment.module.css 라인 수 169 → ≤143 (≥26 라인 감소)
- [ ] (Should) inspector 가 `.div--comment-replypopup` ↔ Log 전역 의존 정책 §5 또는 §5.1 박제 (별 트리거)
- [ ] (Could) 운영자 1회 시각 회귀 — REQ-20260418-035 (`comment-visual-smoke-checklist`) 2회 슬롯과 동시 검증 가능

**범위 밖**:
- `.div--logitem-linkmessage` 자체의 Modules 이전 — **§10.3 (REQ-20260419-011)** 으로 후속 정책 결정 범위 확장.
- 다른 도메인 (Image/Search/Toaster) dead class 정리 — **§10.4 (REQ-20260419-012)** 로 승격.
- `stylelint-no-unused-selectors` 등 자동 감지 lint 룰 — **§10.5 (REQ-20260419-013)** 로 승격.

## 10.3 [WIP] Comment ↔ Log 전역 클래스 정책 결정 (REQ-20260419-011)

> 관련 요구사항: REQ-20260419-011 FR-01 ~ FR-08, US-01~US-03

**맥락 (2026-04-19 관측)**: §10.2 후속 inspector 라운드 영역으로 박제된 `.div--comment-replypopup` ↔ Log 전역 `.div--logitem-linkmessage` 의존 정책을 본 §10.3 으로 승격. `src/Comment/CommentItem.jsx:56` 이 Log 도메인 plain CSS 클래스 문자열 `div--logitem-linkmessage` 를 직접 참조 (`className="div div--logitem-linkmessage"`). Comment 는 CSS Modules 화 됐으나 Log 는 plain CSS 미마이그레이션 (§10 범위 밖) — cascade 단일 출처가 모호한 상태. `Log.css` 측 selector 명 / 값 변경 시 Comment reply popup 의 textstyle 이 silently 회귀할 잠재.

**현재 결함 요약**:
- `grep -n "div--logitem-linkmessage" src/`:
  - `src/Comment/CommentItem.jsx:56` — className 리터럴 (CSS Modules 밖 참조).
  - `src/Log/Log.css` 의 selector 정의 (정확 라인 planner 확인).
- jsdom 단위 테스트는 cascade 미계산 — silent 회귀 비검출.
- §5 격리 원칙 잠재 위반: Modules 도메인의 hash scope 효과가 Comment 측에서만 작동, Log 측 무의미.

**3 옵션 trade-off (planner 결정)**:
| 옵션 | 변경 범위 | 장점 | 단점 | 결합 의존 |
|------|-----------|------|------|-----------|
| (a) `:global(.div--logitem-linkmessage)` wrapper | 1 라인 (Comment.module.css 또는 JSX) | 비용 최소, 의도 코드 가시화 | silent 회귀 완전 차단은 아님 | 없음 |
| (b) Modules 이전 (Log → Log.module.css) | Log 도메인 마이그레이션 필요 | 도메인 경계 강화, import 그래프 가시화 | Log 도메인 전체 마이그레이션 의존 | §10 (8단계 마이그레이션 대상) |
| (c) 현 상태 유지 + 의도 박제 | 0 코드 + spec 박제 | 결정 비용 최소 | 회귀 차단 효과 약함 | 없음 |

**권장 (discovery)**: (a) 가 비용/효과 균형 최적. (b) 는 Log Modules 마이그레이션 결합 시 자연. (c) 는 본질적으로 "결정 보류" 와 동등 — §10.2 의 현 상태 연장.

**옵션별 적용 (채택 후)**:
- **(a) 채택 시**: `src/Comment/Comment.module.css` 또는 `CommentItem.jsx` 의 className 합성 부에 `:global(.div--logitem-linkmessage)` wrapper 도입. `data-testid="reply-popup-..."` 유지 — 외부 contract 변경 0. §10.3 에 "선택 (a) — commit `<hash>`" 로 마감 박제 (inspector).
- **(b) 채택 시**: `Log.css` 의 `.div--logitem-linkmessage` selector 를 `Log.module.css` (또는 `src/styles/global-text.module.css`) 로 이전. Comment 가 import 하는 형태로 변환. REQ-022 §10 (8단계 마이그레이션 Log) 와 결합 가능 — planner 가 머지 순서 결정. §10.3 에 "선택 (b) — commit `<hash>`" 로 마감.
- **(c) 채택 시**: `design-tokens-spec.md` (또는 본 §10.3) 에 "Comment 도메인의 Log 전역 `.div--logitem-linkmessage` 차용 — 의도적 전역 텍스트 styling 공유" 명시 박제. `Log.css` 의 해당 selector 에 `/* Used by Comment domain — see css-modules-spec §10.3 */` 코멘트 추가. §10.3 에 "선택 (c) — spec 박제 완료" 로 마감.

**회귀 검증 (옵션 무관)**:
- `Comment.test.jsx`, `LogItem.test.jsx` 기존 케이스 100% PASS.
- Comment reply popup 의 시각 결과 3 옵션 모두 동등 (font/color/border/padding).
- (Should) 운영자 1회 hover 동작 확인 — 머지 PR 본문 또는 REQ-028 의 Comment 행 확장과 결합.

**§10.2 마감 트리거 연동**: §10.2 의 "후속 inspector 라운드 영역" 이 본 §10.3 으로 승격됐음을 §10.2 풋노트에 반영 (별 inspector 후속 — 본 라운드에서는 본 §10.3 신설로 충분).

**수용 기준 (REQ-20260419-011 §10)**:
- [ ] FR-01: 옵션 (a)/(b)/(c) 중 1 선택 + 근거 PR 본문 박제 (planner 결정)
- [ ] 채택 옵션의 FR (FR-02 또는 FR-03 또는 FR-04) 충족
- [ ] FR-05: `npm test` 100% PASS, 커버리지 ±0.5pp
- [ ] FR-06: 본 §10.3 이 "결정 완료 — commit `<hash>`" 로 마감 (inspector 영역)
- [ ] FR-07: grep 검증 결과 박제 (채택 옵션별)
- [ ] (Should) FR-08: 운영자 hover 1회 확인

**범위 밖**:
- Log 도메인 전체 CSS Modules 마이그레이션 — §10 (8단계 마이그레이션 Log) 의 미완 영역 / 별 spec.
- Comment 도메인의 다른 styling 정리 — 별 후속.
- 다른 도메인의 동일 패턴 sweep (예: Search ↔ Toaster 전역 차용) — 본 결정의 reference 가 정착된 후 별 audit REQ.
- 시각 회귀 자동화 — REQ-028 (visual smoke 통합, done) 의 Comment 행 확장으로 별 PR.

## 10.4 [WIP] Image/Search/Toaster 도메인 dead class audit (REQ-20260419-012)

> 관련 요구사항: REQ-20260419-012 FR-01 ~ FR-10, US-01~US-03

**맥락 (2026-04-19 관측)**: §10.2 의 Comment 도메인 dead class 4 종 정리(REQ-20260418-034, commit `4c0cff8`) 패턴을 다른 3 CSS Modules 도메인으로 확장. "마이그레이션 후 JSX 참조가 사라졌으나 `.module.css` 정의는 잔존" 패턴이 Image/Search/Toaster 도메인에도 통계적으로 존재할 가능성 높음. 자동 감지 lint 룰(§10.5 REQ-013) 도입 전의 **수동 grep 1회 sweep** 으로 baseline 확보.

**audit 대상 도메인 및 selector 목록**:
- **ImageSelector** (`src/Image/ImageSelector.module.css`, 7 selectors):
  - `.div--image-selector`, `.div--image-selectorhide`, `.div--image-loading`, `.img--image-imageitem`, `.img--image-imageitem:hover`, `.img--image-selected`, `.button--image-seemorebutton`
- **Search** (`src/Search/Search.module.css`, 12 selectors):
  - `.li--nav-search`, `.span--nav-searchbutton`, `.input--search-string`, `.input--search-string::placeholder`, `.div--search-mobilehide`, `.div--search-mobile`, `.input--search-mobile`, `.input--search-mobile::placeholder`, `.button--search-submit`, `.div--search-result`, `.span--search-querystring`, `.span--search-keyword`
- **Toaster** (`src/Toaster/Toaster.module.css`, 8 selectors):
  - `.div--toaster-information`, `.div--toaster-success`, `.div--toaster-warning`, `.div--toaster-error`, `.div--toaster-center`, `.div--toaster-bottom`, `.div--toaster-fadeout`, `.div--toaster-hide`

**범위 밖 도메인**: Log/Monitor/File/Writer — CSS Modules 미마이그레이션 (§10 대상 목록의 미완 영역). 본 sweep 은 Modules 도메인 한정.

**audit 절차 (도메인당)**:
1. 위 selector 목록 각각에 대해 camelCase + kebab 양쪽 검색:
   - `grep -rn "divImageSelector\|div--image-selector" src/ --include="*.jsx" --include="*.tsx" --include="*.js" --include="*.ts"`
   - CSS Modules 의 자동 camelCase 변환 규칙 (vite/postcss) 확인 1회.
2. 0 hits 식별된 selector 를 dead 로 분류 — 정의 삭제 후보.
3. 도메인당 별 task 로 슬라이스 (planner 영역, §10.2 Comment 선례 패턴 — 도메인당 1 커밋, 단일 도메인, 정의 삭제 + 빌드 PASS + byte 감소 박제).
4. 0 hits 0 인 도메인은 "no dead class" 명시적 박제 — 별 task 불필요.

**별 task 슬라이스 원칙** (planner 영역):
- 도메인당 1 task (Comment 사례와 동일 — 4 selectors 를 단일 커밋으로 묶음).
- 각 task 의 수용 기준: (a) 0 hits 재확인, (b) 정의 삭제, (c) `npm test` / `npm run lint` / `npm run build` PASS, (d) byte 감소량 result.md 박제.

**spec §10.2 마감 트리거 연동**: 본 §10.4 의 3 도메인 audit 결과(dead class 수, 슬라이스 task, 총 byte 절감) 가 확정되면 §10.2 의 "다른 도메인 (Image/Search/Toaster) dead class 정리 — 도메인별 별 후보" 범위 밖 항목이 마감됨. 마감 박제는 별 inspector 후속.

**stylelint 도입 baseline 연동 (§10.5 REQ-013)**: 본 sweep 후 모든 Modules 도메인의 dead class = 0 → §10.5 도입 시 initial noise 0 → warn-then-error 단계 진입 비용 절감.

**수용 기준 (REQ-20260419-012 §10)**:
- [ ] FR-01 ~ FR-03: 3 도메인 audit 완료, selector 별 grep 결과 박제 (본 §10.4 또는 result.md 또는 별 `docs/css-modules-dead-class-audit.md`)
- [ ] FR-04: grep 패턴 정형화 (camelCase + kebab)
- [ ] FR-05: 0 hits selector 가 식별되면 도메인당 별 task 생성 (planner 영역)
- [ ] FR-06: 본 §10.4 가 audit 결과로 갱신 (inspector 영역)
- [ ] FR-07: 도메인별 + 총합 byte 감소 박제 (Should)
- [ ] FR-08: 0 hits 0 인 도메인은 "no dead class" 명시적 보고
- [ ] FR-09: grep 명령 reproducibility 박제 (Should)
- [ ] FR-10: §10.5 도입 시 noise 0 검증 (별 후속, Should)

**범위 밖**:
- Log/Monitor/File/Writer 도메인 — CSS Modules 미마이그레이션 (§10 대상의 미완 영역). 본 sweep 은 Modules 한정.
- stylelint-no-unused-selectors 자동 감지 도입 — §10.5 (REQ-20260419-013).
- selector 의 의미적 dead 검출 (특정 prop 분기에서만 사용) — 본 sweep 은 텍스트 grep 한정.
- Comment 도메인 재 audit — §10.2 (REQ-20260418-034) 로 완료.
- 시각 회귀 baseline — 별 후속 (REQ-028 의 도메인별 행 확장).

## 10.5 [WIP] stylelint + unused-selectors 자동 감지 룰 도입 (REQ-20260419-013)

> 관련 요구사항: REQ-20260419-013 FR-01 ~ FR-10, US-01~US-03

**맥락 (2026-04-19 관측)**: §10.2 (Comment dead class 4 종 제거, done) 가 사후 수동 grep 으로 dead class 를 발굴·제거했으나, 동일 회귀를 막을 자동 검증 룰이 부재. `package.json` 에 `stylelint` 의존성 0, CI lint 잡은 eslint 한정, lint-staged 에 CSS 미포함. §10.2 의 "stylelint-no-unused-selectors 등 자동 감지 lint 룰 — 별 후보 (discovery 후속)" 범위 밖 항목을 본 §10.5 로 승격.

**현재 결함**:
- `grep "stylelint" package.json` → 0 hits.
- `.github/workflows/ci.yml` 의 lint 잡은 `npm run lint` (eslint) 한정 — CSS 측 lint 0.
- `.husky/pre-commit` lint-staged config — `src/**/*.{js,jsx}: eslint` 한정 (CSS 미포함).
- §10.4 (REQ-012) 의 3 도메인 sweep 이 완료되지 않으면 본 룰 도입 시 initial noise 존재 가능.

**목표 도구 후보 (planner 결정)**:
- **stylelint** (v16 LTS 권장) — devDependency 신규.
- **unused-selectors 플러그인 후보**:
  - `stylelint-no-unused-selectors` — CSS selector 의 JSX/TSX/HTML 검색 지원.
  - `@isnotdefined/stylelint-no-unused-classes` — CSS Modules 특화.
  - `stylelint-css-modules-no-global-scoped-selector` — cascade 안전성 보강 (본 REQ 범위 밖, 별 후속).
- 도구 선택 기준: (a) CSS Modules camelCase 자동 변환 인식 가능, (b) JSX/TSX 파일 검색 지원, (c) vite 8 + `type=module` ESM 호환.

**설정 파일 (FR-03)**:
- `.stylelintrc.cjs` 또는 `stylelint.config.js` — vite 8 + ESM 호환성 고려 (`.cjs` 우선 권장 — vite + `type=module` 조합에서 안정).
- 초기 룰셋: `unused-selectors` 1건 한정 — 추가 룰(색 정규화, cascade, media query 정렬 등) 은 별 후속.
- `ignoreFiles`: `node_modules`, `build`, `coverage`, `dist`.

**scripts 및 CI 통합 (FR-04 / FR-05)**:
- `package.json:scripts.lint:css` — `stylelint "src/**/*.module.css"` (본 PR 한정, plain CSS 는 cascade 정책 다름 — 범위 밖).
- `package.json:scripts.lint` — 기존 eslint 호출 + `lint:css` 병합 패턴 (`npm run lint:js && npm run lint:css` 또는 동등). 구체 형식은 planner 결정.
- `.github/workflows/ci.yml` 의 lint 잡에 `npm run lint:css` 스텝 추가 (기존 `npm run lint` 통합 vs 별 스텝 분리 — fail-isolation 측면에서 별 스텝 권장, planner 결정).

**lint-staged 통합 (FR-06, Should)**:
- `.husky/pre-commit` lint-staged config 에 `src/**/*.module.css: stylelint` 추가.
- `--cache` 옵션 검토 — commit 시간 +500ms 초과 회피.

**초기 도입 정책 (phased rollout, FR-07 / FR-08)**:
- **1단계 (본 §10.5 / 본 PR)**: severity = `warning`. §10.4 (REQ-012) 의 sweep 이 미완 상태여도 도입 가능 — 초기 noise 수를 PR 본문 또는 본 §10.5 에 박제.
- **2단계 (별 후속)**: §10.4 (REQ-012) 머지 후 baseline 0 warning 확인. 룰을 `error` 로 승격. 승격 트리거는 본 §10.5 에 박제 또는 별 PR.
- §10.4 미완 시 본 §10.5 도입 후 noise 존재를 명시적 박제 (PR 본문 또는 `docs/stylelint-initial-noise.md`).

**§10.2 마감 트리거 연동**: §10.2 의 "stylelint-no-unused-selectors 등 자동 감지 lint 룰 — 별 후보" 범위 밖 항목이 본 §10.5 도입으로 마감. 마감 박제는 별 inspector 후속 (본 라운드에서는 §10.5 신설로 충분).

**CI 시간 영향 (NFR-02)**:
- lint 잡 추가 시간 목표 ≤ 30초. stylelint 자체는 수십 ms 수준이나 플러그인별 JSX 검색 비용이 변수.
- CI 잡 측정 박제 (본 PR 머지 후 GitHub Actions 잡 시간 diff).

**보안 검증 (NFR-05)**:
- 도입 시 `npm audit` 1회 검증 — high/critical 0.

**수용 기준 (REQ-20260419-013 §10)**:
- [ ] FR-01: `stylelint@^16` devDependency 추가
- [ ] FR-02: unused-selectors 플러그인 1 도입 (planner 결정)
- [ ] FR-03: `.stylelintrc.cjs` 또는 동등 존재, ignoreFiles 설정
- [ ] FR-04: `package.json:scripts.lint:css` 신규, `lint` 통합
- [ ] FR-05: CI lint 잡에 `npm run lint:css` 추가 (별 스텝 권장)
- [ ] FR-06: `.husky/pre-commit` lint-staged 에 `.module.css` 추가 (Should)
- [ ] FR-07: 초기 severity = `warning`
- [ ] FR-08: warn → error 승격 트리거 본 §10.5 또는 별 PR 에 박제 (Should)
- [ ] FR-09: §10.4 sweep 후 0 noise 박제 (Should)
- [ ] FR-10: 본 §10.5 신설로 §10.2 의 자동화 룰 부재 항목 마감 (inspector)
- [ ] `npm audit` high/critical 0
- [ ] CI lint 잡 시간 +≤30초

**범위 밖**:
- stylelint 의 추가 룰 (cascade 정규화, 색/단위 정규화, media query 정렬) — 별 후속.
- plain CSS (Log/Monitor/File/Writer) 의 stylelint — 본 PR 은 CSS Modules 한정.
- `stylelint-config-standard` 등 shareable preset — 본 PR 은 unused-selectors 단독.
- React style props (inline `style={...}`) lint — 별 spec.
- stylelint v16 → v17 점프 — 별 후속.

## 10.6 [WIP] FileDrop 명령형 DOM → 선언적 React 리팩터 (REQ-20260419-010)

> 관련 요구사항: REQ-20260419-010 FR-01 ~ FR-10, US-01~US-03

**맥락 (2026-04-19 관측)**: §10.1 의 ImageItem 명령형 DOM → 선언적 React 리팩터 (REQ-20260418-026, done) 패턴을 `src/File/FileDrop.jsx` 에 재적용. FileDrop 은 dragenter/dragleave/drop 핸들러가 `e.target.classList.add("div--filedrop-dragenter")` / `classList.remove(...)` 로 DOM 을 직접 조작 (3건) + `setDropzoneStyle` 이 useEffect 안에서 className 문자열을 분기 합성 (4건) — 이중 출처 SSoT 위반 + Strict Mode 더블 인보케이션 회귀 위험. File 도메인은 CSS Modules 미마이그레이션 (§10 대상의 미완 영역) 이므로 className 은 plain CSS 클래스 문자열 유지.

**현재 결함 요약 (`grep -n "classList\|dropzoneStyle\|setDropzoneStyle" src/File/FileDrop.jsx`)**:
- `src/File/FileDrop.jsx:12` — `useState("div div--filedrop-dropzone div--filedrop-ready")` (클래스 합성 문자열을 state 에 보관).
- `src/File/FileDrop.jsx:80-107` — `useEffect([isUploading])` 안 `setDropzoneStyle(...)` 4 분기 (ready/uploading/complete 등). `isUploading` 의 단순 파생인데 state 로 분리 — DRY 위반.
- `src/File/FileDrop.jsx:113-115` — `onDragEnter` 가 `e.target.classList.add("div--filedrop-dragenter")` — React state 미경유.
- `src/File/FileDrop.jsx:117-120` — `onDragLeave` 가 `classList.remove(...)` — 동일 패턴.
- `src/File/FileDrop.jsx:121-132` — `onDrop` 가 `classList.remove(...)` 후 `setFiles(newFiles)` — 절반 명령형, 절반 선언적.
- 자동 테스트: `src/File/FileDrop.test.jsx` 존재 (회귀 baseline).

**목표 패턴 (To-Be)**:
```jsx
const [isDragOver, setIsDragOver] = useState(false);

// dropzoneStyle state 제거 → isUploading 파생값 (useMemo 또는 inline)
const dropzoneStyle = useMemo(() => {
  const base = "div div--filedrop-dropzone";
  if (isUploading === "uploading") return `${base} div--filedrop-uploading`;
  if (isUploading === "complete") return `${base} div--filedrop-complete`;
  return `${base} div--filedrop-ready`;
}, [isUploading]);

const className = isDragOver
  ? `${dropzoneStyle} div--filedrop-dragenter`
  : dropzoneStyle;

return (
  <div
    className={className}
    data-dragover={isDragOver ? 'Y' : 'N'}
    onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
    onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
    onDrop={(e) => {
      e.preventDefault();
      setIsDragOver(false);
      // ... setFiles(newFiles) 기존 로직
    }}
  >
```
- `classList.add/remove` 호출 0건. 부모 리렌더 시 React 가 className 을 state 기반으로 유지.
- `data-dragover="Y|N"` (HTML5 `data-*` 표준) — 테스트 셀렉터 안정성 + React DevTools 가시성.
- `isDragOver` state 는 dragenter/dragleave/drop 3 이벤트에서만 setter 호출.

**리팩터 세부 (FR-01 ~ FR-04)**:
- **FR-01**: `const [isDragOver, setIsDragOver] = useState(false);` 신규 1건.
- **FR-02**: dragenter/dragleave/drop 3 핸들러의 `classList.add/remove` 제거 → setter 호출로 교체.
- **FR-03**: `useState("div div--filedrop-dropzone div--filedrop-ready")` 제거 + `useEffect([isUploading])` 안의 `setDropzoneStyle(...)` 4건 제거 → `isUploading` 파생값으로 치환.
- **FR-04**: className 합성은 `useMemo` 또는 inline 배열 join 으로 파생화. 기존 시각 결과와 100% 동등.

**data-dragover 속성 (FR-05, Should)**:
- `data-dragover={isDragOver ? 'Y' : 'N'}` 선언적 속성 노출 — ImageItem 의 `data-enlarged` 패턴과 1:1 매칭. React DevTools 의 props 트리에서 식별 가능.
- `.eslintrc.yml` (또는 flat config — §3.4.2) 의 `react/no-unknown-property` ignore 추가 **불필요** — `data-*` 는 HTML5 표준이라 룰 pass.

**setDropzoneText JSX state 파생화 (FR-06, Should / planner 결정)**:
- `setDropzoneText(<>업로드 중입니다...</>)` 등 JSX 노드 state 도 `isUploading` 단순 파생 — 본 PR 범위 포함 vs 별 PR 분리 trade-off.
- 본 PR 범위 포함 시 코드 변경량 +3~5 LOC, 검증 단순화는 동일.
- 별 PR 분리 시 본 PR 은 className 파생만 집중 — 회귀 위험 국소화.

**회귀 테스트 갱신 (FR-07 / FR-08)**:
- 기존 `FileDrop.test.jsx` 케이스 100% PASS — drag&drop / upload 흐름 / 텍스트 전환 회귀 0.
- 신규 (Should): `dragenter` / `dragleave` / `drop` 이벤트 후 `data-dragover` 속성 토글 어서트 1+건 (`fireEvent.dragEnter` → `expect(element).toHaveAttribute('data-dragover', 'Y')` 패턴).
- 부모 리렌더 후 `isDragOver` 상태 유지 회귀 테스트 (Should, ImageItem §10.1 FR-06 패턴 재사용).

**grep 회귀 차단 (FR-09)**:
- `grep -c "classList\." src/File/FileDrop.jsx` → 0.
- `grep -c "setDropzoneStyle" src/File/FileDrop.jsx` → 0.
- `grep -c "setIsDragOver" src/File/FileDrop.jsx` → ≥ 3 (dragenter/dragleave/drop).

**시각 회귀 0 (FR-10, Should)**:
- dropzone 의 border / background (`.div--filedrop-dragenter` selector 효과) 가 변경 전과 100% 동등.
- 운영자 1회 dragover smoke 확인 — 별 manual smoke 슬롯 또는 PR 본문 박제.
- **REQ-20260419-017 로 묶음 baseline 예약(ready, WIP)** — 운영자 60분 세션에 (a) log-mutation MC-01~06 + MD-01~03 8 시나리오, (b) LogItem sanitize F1~F4 4 픽스처, (c) 본 §10.6 FR-10 FileDrop 시각 회귀 3 관찰점 (dropzone 경계 강조 / isUploading 전이 className / `data-dragover` 토글) 을 1회 수행. 결과는 `specs/task/done/2026/04/18/20260419-filedrop-declarative-dom-refactor/result.md` §DoD §수동 검증 3건 `[x]` 갱신. 상세는 §10.8.

**LOC drift 박제 (REQ-20260419-010 후 관측, 2026-04-19)**:
- 초기 예상 `FileDrop.jsx` 143 → 138~140 (−5 ~ −7 LOC) 대비 실측 **152 LOC** (+7~+12 초과, commit `2b35a8f`). 원인: 4-분기 useMemo 보존 + className 파생 1줄 + `data-dragover` 속성 1줄 + `useMemo` import 1줄.
- **REQ-20260419-018 로 단순화 예약(ready, WIP)** — `UPLOADING` 과 `FAILED` 가 동일 `div--filedrop-uploading` className 을 매핑하므로 `if("UPLOADING" === isUploading || "FAILED" === isUploading)` 단일 분기로 3-분기 단축 (~-3 LOC → ~149 LOC). 상세는 §10.6.1.
- **REQ-20260419-016 로 dropzoneText 파생화 예약(ready, WIP)** — `setDropzoneText(<span>...</span>)` useState + 4-분기 useEffect → `useMemo([isUploading])` 파생 (4 분기 JSX 인라인). 상세는 §10.6.2.
- REQ-018 + REQ-016 병합 시 ~140 LOC 까지 감소 가능. 본 §10.6 의 DoD LOC 예상 "135~140, 최대 145" 는 해당 머지 후 실측치로 inspector 가 박제 갱신.

#### 10.6.1 [WIP] FileDrop `useMemo` 4-분기 → 3-분기 단순화 (REQ-20260419-018)
> 관련 요구사항: REQ-20260419-018 FR-01 ~ FR-05, US-01 ~ US-03

**맥락**: `src/File/FileDrop.jsx:105-111` `dropzoneStyle = useMemo(...)` 의 4-분기 중 `UPLOADING` 과 `FAILED` 가 동일 `div--filedrop-uploading` className 을 반환 — "두 상태가 시각적으로 동등" 이라는 의도가 4-분기 중복 코드에 묻혀 명시성 ↓.

**목표**:
- **FR-01 useMemo 본문 3-분기 단순화**: `if("UPLOADING" === isUploading || "FAILED" === isUploading) return "${base} div--filedrop-uploading";` 단일 분기로 통합, 나머지 `COMPLETE` / default (`READY`) 2-분기 유지.
- **FR-02 className 결과값 0 변경**: 4 케이스(`READY`/`UPLOADING`/`COMPLETE`/`FAILED`) 모두 변경 전과 동일 문자열 반환.
- **FR-03 LOC 변동 박제**: result.md 에 `wc -l src/File/FileDrop.jsx` 변경 전후(152 → ~149).
- **FR-04 spec §10.6 LOC DoD 실측 박제 갱신 (inspector)**: "LOC 예상 135~140 (최대 145)" → "실측 ~149 (REQ-018 후)" 또는 "실측 ~140 (REQ-018 + REQ-016 병합 후)" — 본 요구사항 머지 후 별 라운드.
- **FR-05 REQ-016 병합 처리 옵션 (Could)**: 동일 PR 묶음 vs 별 PR — planner 결정.

**회귀 테스트 (FR-02)**:
- `src/File/FileDrop.test.jsx` 기존 케이스 변경 0 (className 문자열 매칭 부재).
- 신규 테스트 0 — className 결과값 동일 전제이므로 기존 케이스 PASS 로 검증 충분.

**grep 회귀 차단**:
- `grep -c "useMemo" src/File/FileDrop.jsx` — 1 (dropzoneStyle, REQ-016 병합 시 2).
- `grep -c "FAILED\"" src/File/FileDrop.jsx` — 2 → 1 (분기 통합 후 useMemo 내 1건만).

**수용 기준 (REQ-20260419-018 §10)**:
- [ ] FR-01 useMemo 본문 3-분기 (`UPLOADING || FAILED` 단일 분기).
- [ ] FR-02 className 결과값 4 케이스 변경 0.
- [ ] FR-03 result.md 에 LOC 변동 박제.
- [ ] (Should) FR-04 inspector 가 spec §10.6 LOC DoD 갱신.
- [ ] (Could) FR-05 REQ-016 와 병행 처리 (planner 결정).
- [ ] NFR-02 LOC 변경 -3 이상 (~149 이하).
- [ ] NFR-03 5회 연속 테스트 PASS.
- [ ] NFR-04 사용자 visible 회귀 0.
- [ ] `npm run lint` clean.

**범위 밖**:
- `useMemo` 본문의 `Record<state, className>` 룩업 테이블 변환 — 가독성 trade-off, 본 §미채택.
- spec §10.6 의 다른 메트릭 / 메모 갱신 — inspector 별 라운드.
- File 도메인 CSS Modules 마이그레이션 — §3.1 영역.
- `dropzoneText` useState → useMemo — §10.6.2 (병행 가능).
- 시각 디자인 변경.

#### 10.6.2 [WIP] FileDrop `dropzoneText` JSX useState → `useMemo` 파생 (REQ-20260419-016)
> 관련 요구사항: REQ-20260419-016 FR-01 ~ FR-07, US-01 ~ US-03

**맥락**: FR-06 (Should — JSX 파생화) 가 본 §10.6 에서 별 task 로 분리됨. `src/File/FileDrop.jsx:13` `[dropzoneText, setDropzoneText] = useState(<span>Drop files here!</span>)` 는 `isUploading` 1:1 파생 값이지만 별도 useState 로 보관되고 `src/File/FileDrop.jsx:80-103` useEffect 4 분기에서 `setDropzoneText(...)` 로 갱신됨. `dropzoneStyle` 파생 (REQ-010, commit `2b35a8f`) 는 이미 `useMemo` 파생으로 정리됐는데 `dropzoneText` 는 useState — 동일 `isUploading` 의존 두 파생값의 패턴 비일관.

**목표**:
- **FR-01 dropzoneText useState 제거**: `line 13` 1줄 제거.
- **FR-02 useEffect 분기 setDropzoneText 4건 제거**: `line 80-103` 4 분기 제거. `setTimeout + setIsUploading("READY") + refreshFiles()` 부수효과 (COMPLETE / FAILED) 는 분리된 useEffect 로 보존.
- **FR-03 useMemo 파생 추가**: `useMemo([isUploading])` 로 4 분기 JSX 직접 반환:
  ```jsx
  const dropzoneText = useMemo(() => {
      if("UPLOADING" === isUploading) return <span>Uploading...</span>;
      if("COMPLETE" === isUploading) return <span>Upload complete.</span>;
      if("FAILED" === isUploading) return <span>Upload failed.</span>;
      return <span>Drop files here!</span>;
  }, [isUploading]);
  ```
- **FR-04 부수효과 useEffect 보존**: `setTimeout + setIsUploading + refreshFiles` 분리 (COMPLETE / FAILED 단일 분기 통합 권장 — §10.6.1 와 패턴 일관).
- **FR-05 4 텍스트 selector 불변**: `"Drop files here!"`, `"Uploading..."`, `"Upload complete."`, `"Upload failed."` 4 문자열 변경 0 → `findByText(...)` 기존 4 selector PASS.
- **FR-06 LOC 변동 박제 (Should)**: wc -l 변경 전후 (152 → ~140 if §10.6.1 병합 / ~149 if 단독).
- **FR-07 spec §10.6 FR-06 갱신 트리거 (inspector)**: "Should — 별 task" → "REQ-20260419-016 done (commit `xxx`)".

**회귀 테스트 (FR-05)**:
- `src/File/FileDrop.test.jsx` 기존 `findByText("Drop files here!")` / `findByText("Uploading...")` / `findByText("Upload complete.")` / `findByText("Upload failed.")` 4 selector PASS.
- 신규 회귀 테스트 추가 0 (selector 동일).

**grep 회귀 차단**:
- `grep -n "setDropzoneText" src/File/FileDrop.jsx` → 0.
- `grep -n "useState.*dropzoneText" src/File/FileDrop.jsx` → 0.
- `grep -n "useMemo" src/File/FileDrop.jsx` → ≥ 2 (dropzoneStyle + dropzoneText).

**수용 기준 (REQ-20260419-016 §10)**:
- [ ] FR-01 dropzoneText useState 0 매치.
- [ ] FR-02 useEffect 안 setDropzoneText 0 매치.
- [ ] FR-03 useMemo 파생 동작.
- [ ] FR-04 부수효과 (setTimeout + setIsUploading + refreshFiles) 보존.
- [ ] FR-05 4 텍스트 selector 4건 PASS.
- [ ] (Should) FR-06 LOC 변동 박제.
- [ ] (Should) FR-07 inspector 가 spec §10.6 FR-06 갱신.
- [ ] NFR-04 5회 연속 테스트 PASS.
- [ ] NFR-05 사용자 visible 회귀 0.
- [ ] `npm run lint` clean.

**범위 밖**:
- `dropzoneStyle` (className) 파생 변경 — REQ-010 에서 이미 useMemo 파생 완료.
- FileDrop 의 다른 useState (`files`, `isUploading`, `isDragOver`) 정리.
- File 도메인 CSS Modules 마이그레이션 — §3.1 영역.
- `UPLOADING`/`FAILED` 분기 통합 — §10.6.1 (REQ-018) 영역 (병행 가능).
- 시각 디자인 변경.
- 4 텍스트 메시지 i18n.

**CSS Modules 정합성**: File 도메인은 CSS Modules 미마이그레이션 (§10 대상 목록의 미완 영역). 본 리팩터는 className 합성 단순화 한정 — `.div--filedrop-*` plain CSS 클래스 문자열 유지. File 도메인 Modules 마이그레이션(별 후속) 시 본 PR 의 파생화된 className 합성이 `styles.foo` hash 로 자연 치환 가능 — 마이그레이션 비용 감소.

**dragenter false-trigger (child bubbling) — 본 PR 범위 외 후속**:
- dragenter 가 child element 에서도 발화 → 중첩 요소 dragleave 의 false-trigger 가능.
- 카운터 패턴 (dragenter counter) 도입은 본 PR 범위 밖 — 실 사용자 영향 있을 시 별 후속 REQ.

**패턴 reference 연동**:
- `src/Image/ImageItem.jsx` (§10.1 REQ-026 후 baseline) — 선언적 state + `data-*` 속성 패턴 모범 (1차, `data-enlarged`).
- `src/File/FileDrop.jsx` (§10.6 본 절, REQ-010 done) — `useMemo` + `data-dragover` (2차).
- `src/File/FileItem.jsx:11, 50-51` 의 `setItemClass("div div--fileitem ...")` 동일 패턴 — **REQ-20260419-015 로 3차 재적용 예약(ready, WIP)** — 상세는 §10.7.
- `src/Log/LogItem.jsx:15, 38-45` 의 `setItemClass("article article--main-item ...")` 동일 패턴 — **REQ-20260419-019 로 4차 재적용 예약(ready, WIP)** — 상세는 §10.9. 4차 마감 시 Image / File / Log 3 도메인 모두 패턴 정착 → "도메인 일관 표준" 박제.

**수용 기준 (REQ-20260419-010 §10)**:
- [ ] FR-01 ~ FR-10 모두 충족 (Must 우선)
- [ ] `grep -c "classList\." src/File/FileDrop.jsx` → 0
- [ ] `grep -c "setDropzoneStyle" src/File/FileDrop.jsx` → 0
- [ ] `grep -c "useState.*isDragOver\|setIsDragOver" src/File/FileDrop.jsx` → ≥ 1
- [ ] `npm test` 100% PASS, 커버리지 ±0.5pp
- [ ] `npm run lint` 0 warning/error, `npm run build` PASS
- [ ] `FileDrop.test.jsx` 에 dragenter/dragleave/drop state/속성 어서트 1+건 신규 (Should — FR-08)
- [ ] (Should) 운영자 1회 dragover 시각 회귀 확인
- [ ] `FileDrop.jsx` LOC 현 143 → 138~140 (−5 ~ −7 LOC 추정)

**범위 밖**:
- File 도메인 CSS Modules 마이그레이션 — §10 (8단계 마이그레이션 File) 의 미완 영역 / 별 spec.
- `setDropzoneText` JSX state 파생화 — FR-06 Should, PR 분리 가능 (planner 결정).
- `FileItem.jsx` 의 `setItemClass` 동일 패턴 — 별 후속.
- dragenter false-trigger (child bubbling) 처리 — 별 후속.
- React Compiler 도입 / Suspense 최적화 — 별 spec.
- File API 의 mutation 훅화 (`useUploadFile` 등) — 별 spec.

### 10.7 [WIP] FileItem `setItemClass` 명령형 className state → 선언적 React (REQ-20260419-015, REQ-026 / REQ-010 패턴 3차 재적용)
> 관련 요구사항: REQ-20260419-015 FR-01 ~ FR-08, US-01 ~ US-04

**맥락**: `src/File/FileItem.jsx:10-11, 48-52, 70` 의 `setItemClass("div div--fileitem ...")` 는 ImageItem (§10.1, REQ-20260418-026 done, commit `9efb9ad`) / FileDrop (§10.6, REQ-20260419-010 done, commit `2b35a8f`) 와 동일한 "className-state 안티패턴" — useState 로 className 문자열 보유 + useEffect 내부 분기 갱신. 본 §10.6 마지막 "패턴 reference 연동" 글머리 + `src/File/FileItem.jsx:11, 50-51` 의 "별 후속" 박제가 본 작업을 명시적으로 분리. 본 §은 해당 후속을 3차 재적용으로 마감한다.

**As-Is**:
```jsx
// src/File/FileItem.jsx:10-11
const [isDeleting, setIsDeleting] = useState(false);
const [itemClass, setItemClass] = useState("div div--fileitem");

// src/File/FileItem.jsx:48-52
useEffect(() => {
    (isDeleting)
        ? setItemClass("div div--fileitem div--fileitem-delete")
        : setItemClass("div div--fileitem");
}, [isDeleting]);

// src/File/FileItem.jsx:70
<div className={itemClass} role="listitem">
```

**To-Be**:
```jsx
// 단순 2 케이스 — 인라인 삼항 권장 (useMemo 도 가능, FileDrop 모범 일관)
const className = isDeleting
    ? "div div--fileitem div--fileitem-delete"
    : "div div--fileitem";

<div className={className} data-deleting={isDeleting ? 'Y' : 'N'} role="listitem">
```

**리팩터 세부 (FR-01 ~ FR-08)**:
- **FR-01**: `const [itemClass, setItemClass] = useState("div div--fileitem")` 1줄 제거.
- **FR-02**: `useEffect([isDeleting])` 의 `setItemClass` 분기 4~5줄 제거.
- **FR-03**: className 파생 — `useMemo([isDeleting])` 또는 인라인 삼항 (2-케이스 단순도 고려 인라인 권장, planner / developer 결정).
- **FR-04 (Should)**: `data-deleting={isDeleting ? 'Y' : 'N'}` 선언적 속성 추가 — ImageItem `data-enlarged` / FileDrop `data-dragover` 패턴 1:1.
- **FR-05 (Must)**: `'reflects deleting state via className transition'` 회귀 테스트 — `isDeleting=false` → `container.querySelector('.div--fileitem')` 존재 / delete confirm → `.div--fileitem-delete` 존재.
- **FR-06 (Should)**: `'preserves data-deleting attribute under parent rerender'` 회귀 테스트 — 부모 리렌더 트리거 후 `data-deleting` 동기 유지.
- **FR-07 (Should)**: spec §10.6 "패턴 reference 연동" 행 갱신 — 본 §10.7 신설 이후 `src/File/FileItem.jsx:11, 50-51` 의 "별 후속" 박제를 "REQ-20260419-015 done (commit `xxx`)" 로 마감 (별 inspector 라운드).
- **FR-08 (Could)**: LOC 변동 박제 — wc -l 변경 전후 (FileDrop 의 LOC drift 선례 의식, 현 118 → ±5 이내 예상).

**회귀 테스트 (FR-05, FR-06)**:
- `src/File/FileItem.test.jsx` 기존 케이스 (현재 className 어서트 부재, `getByText` / `findByText` 기반) 100% PASS.
- 신규 ≥ 1 케이스: className 전환 어서트 또는 `data-deleting` 속성 어서트 (RTL 권장 — 사용자 가시 어서트).
- per-test mock isolation + `vi.clearAllMocks` — toast / a11y 케이스 (line 100+) 와 mock leak 차단.

**grep 회귀 차단**:
- `grep -n "useState.*itemClass" src/File/FileItem.jsx` → 0.
- `grep -n "setItemClass" src/File/FileItem.jsx` → 0.
- `grep -n "data-deleting" src/File/FileItem.jsx` → ≥ 1 (루트 요소).
- 도메인 일관성: `grep -n "data-enlarged\|data-dragover\|data-deleting" src/Image/ImageItem.jsx src/File/FileDrop.jsx src/File/FileItem.jsx` → 3 파일 각 ≥ 1 hit (§10.1 / §10.6 / §10.7).

**CSS Modules 정합성**: File 도메인은 CSS Modules 미마이그레이션 (§10 대상 목록의 미완 영역). 본 리팩터는 className 합성 단순화 한정 — `.div--fileitem*` plain CSS 클래스 문자열 유지. File 도메인 Modules 마이그레이션(별 후속) 시 본 §의 파생화된 className 이 `styles.foo` hash 로 자연 치환 가능.

**수용 기준 (REQ-20260419-015 §10)**:
- [ ] FR-01 itemClass useState 0 매치 (grep).
- [ ] FR-02 setItemClass 0 매치 (grep).
- [ ] FR-03 className 파생 (useMemo 또는 삼항) 동작.
- [ ] FR-04 `data-deleting` 속성 노출 (DevTools 식별 가능).
- [ ] FR-05 회귀 테스트 PASS.
- [ ] (Should) FR-06 data-deleting 회귀 테스트 PASS.
- [ ] (Should) FR-07 inspector 가 §10.6 패턴 reference 글머리 갱신.
- [ ] NFR-02 LOC 변경 ±5 이내 (118 기준).
- [ ] NFR-04 3 파일 패턴 일관 검증 (§10.1 / §10.6 / §10.7).
- [ ] `npm run lint` clean.
- [ ] 사용자 visible 회귀 0.

**범위 밖**:
- File 도메인 CSS Modules 마이그레이션 — §3.1 영역 (8 마이그레이션 대상 중 File 미완).
- `FileItem` 의 다른 useState (`isShowToaster`, `toasterMessage`, `toasterType`) 정리 — 별 후속.
- `FileItem` 시각 디자인 변경.
- `File.jsx` 부모 리렌더 최적화.
- `Search/SearchInput.jsx:118-126` 의 `setAttribute("class", ...)` 분기 — 별 후속 (REQ-026 §10.1 "범위 밖" 명시).
- React 19 bump (REQ-040) — 본 §은 bump 전 사전 정리 효과.
- TypeScript 변환.

### 10.8 [WIP] 3 체크리스트 묶음 baseline 수행 (REQ-20260419-017)
> 관련 요구사항: REQ-20260419-017 FR-01 ~ FR-10, US-01 ~ US-04

**맥락**: 본 §10.6 FR-10 (FileDrop 시각 회귀 1회 수동 확인, 3 관찰점) / `specs/spec/green/testing/log-mutation-runtime-smoke-spec.md` §5 수용 기준 3번 (MC-01~06 + MD-01~03 8 시나리오 baseline 박제) / `specs/spec/green/common/sanitizeHtml-spec.md` §9.1.5 + `specs/spec/green/testing/markdown-render-smoke-spec.md` §3.6.1 (LogItem sanitize F1~F4 4 픽스처 baseline) 의 3 체크리스트가 모두 "테이블/체크박스 신설 + 수행 행 0건" 상태로 잔존. 자동 파이프라인은 GUI / DevTools / admin 자격증명 부재로 수행 불가 → 운영자(park108) 1회 60분 세션 묶음 처리.

**목표 (In-Scope)**:
- **FR-01 체크리스트 1 baseline (log-mutation, 8 시나리오)**: `docs/testing/log-mutation-runtime-smoke.md` §수행 로그 1행 박제 (MC-01 ~ MC-06 + MD-01 ~ MD-03).
- **FR-02 체크리스트 2 baseline (LogItem sanitize, 4 픽스처)**: `docs/testing/markdown-render-smoke.md` §LogItem sanitize runtime smoke §Baseline 수행 기록 1행 박제 (F1 / F2 / F3 / F4).
- **FR-03 체크리스트 3 baseline (FileDrop 시각 회귀, 3 관찰점)**: `specs/task/done/2026/04/18/20260419-filedrop-declarative-dom-refactor/result.md` §DoD §수동 검증 3건 `[ ]` → `[x]` 갱신 (dropzone 경계 강조 / isUploading 전이 className / `data-dragover` 토글).
- **FR-04 (Should) 1회 세션 워크플로 가이드**: setup (5분) + 1 (30분) + 2 (10분) + 3 (10분) + 박제 (5분) = ≤ 60분.
- **FR-05 (Should) MD-03 결과 → REQ-014 baseline 활용**: §10.6.2 와 대등하게 `server-state-spec.md` §3.3.1.9 REQ-014 의 우선순위 박제로 직접 활용 (PR 본문 / result.md 에 reference).
- **FR-06 (Should) FAIL 시 followup 분리**: 시나리오 ID (MC-XX / MD-XX / FX / FileDrop 관찰점 #) + 환경 + 재현 절차 + 예상/실제 를 `specs/followups/{date}-{slug}.md` 신설.
- **FR-07 (Must) 박제 형식 표준**: 일자 / 운영자 / 환경 (Chrome 130+ + macOS 14 Sonoma + `npm run dev`) / 커밋 해시 / 결과 요약 (PASS / FAIL count) / 노트 — 6칸 일관.
- **FR-08 (Should) spec 갱신 트리거 (inspector)**: 본 세션 마감 후 3 spec (log-mutation / sanitizeHtml §9.1.5 / 본 §10.6 FR-10) 의 "0 행" / "baseline 박제 슬롯 비어" 메모를 "REQ-017 로 박제 (commit `xxx`)" 로 갱신 (별 라운드).
- **FR-09 (Must) 환경 매트릭스 단일 baseline**: Chrome + macOS + dev 1조합 우선.
- **FR-10 (Could) 추가 환경 확장**: Edge / Firefox / Safari, Windows / Linux, prod 환경 — 별 후속.

**환경 (Preconditions)**:
- 운영자 로컬 macOS + Chrome 130+ + Node 20+ + admin 자격증명 (Cognito).
- `npm run dev` 1회 기동 (3 체크리스트 공유).
- DevTools Network / Console / React DevTools 동시 활성 가능 (메모리 충분).

**결함 발견 시**:
- MD-03 (DELETE 5xx → 토스터) FAIL 확인 → REQ-20260419-014 의 시급성 박제 (PR 본문 / result.md reference).
- 다른 시나리오 FAIL → 별 followup 신설 (시나리오 ID + 재현 절차 명시).

**수용 기준 (REQ-20260419-017 §10)**:
- [ ] FR-01 체크리스트 1 §수행 로그 1행 박제 (PASS / FAIL count + 노트).
- [ ] FR-02 체크리스트 2 §Baseline 수행 기록 1행 박제.
- [ ] FR-03 체크리스트 3 task result.md §DoD §수동 검증 3건 `[x]` 갱신.
- [ ] FR-07 박제 형식 (일자/운영자/환경/커밋/결과/노트) 6칸 일관.
- [ ] FR-09 환경 = Chrome + macOS + dev 1조합.
- [ ] (Should) FR-04 1회 60분 세션 워크플로 박제.
- [ ] (Should) FR-05 MD-03 결과 → REQ-20260419-014 의 baseline 으로 참조.
- [ ] (Should) FR-06 FAIL 시 followup 분리.
- [ ] (Should) FR-08 inspector 가 spec 미충족 메모 갱신.
- [ ] NFR-01 1회 ≤ 60분.

**범위 밖**:
- 자동화 (Playwright / Cypress) 도입 — REQ-031 영역.
- 추가 환경 매트릭스 확장 — FR-10 영역, 별 후속.
- 체크리스트 자체의 시나리오 추가/수정 — inspector 별 라운드.
- MD-03 의 결함 자체 수정 — §3.3.1.9 REQ-014 영역.
- 시각 회귀 자동화 (Percy / Chromatic) — 별 후속.
- prod 환경 (`vite preview`) 검증 — 별 후속.

### 10.9 [WIP] LogItem `setItemClass` 명령형 className state → 선언적 React (REQ-20260419-019 / REQ-20260420-029 재집행, REQ-026 / REQ-010 / REQ-015 패턴 4차 재적용 — Log 도메인 마무리)

> 관련 요구사항: REQ-20260419-019 FR-01 ~ FR-08, US-01 ~ US-04; **REQ-20260420-029** FR-01 ~ FR-06, US-01 ~ US-02 (drift 2차 재집행)

**[REQ-20260420-029 drift 재집행 맥락 — 2026-04-20 관측]**: REQ-20260419-019 realization task (`specs/requirements/done/2026/04/20/20260419-logitem-setitemclass-declarative-code-realization.md`) 가 done 처리됐음에도 `src/Log/LogItem.jsx:16, 52, 55, 73` 에 `setItemClass`/`itemClass` **4 hits 잔존** (실태 미반영). 선례: `src/File/FileItem.jsx` 는 commit `6ced3b6` 에서 동일 패턴을 선언적 (`className={...삼항}` + `data-deleting`) 로 전환 완료. 본 §10.9 는 FileItem 패턴을 **1:1 전파** 로 재집행. REQ-20260420-021 (React bump) / REQ-20260420-022 (eslint) 와 동일 메타 패턴 3번째 인스턴스 — 공통 "drift 재발 차단 게이트" 논의 대상.

**맥락**: `src/Log/LogItem.jsx:15, 38-45` 의 `setItemClass("article article--main-item ...")` 는 ImageItem (§10.1, REQ-026 done, commit `9efb9ad`) / FileDrop (§10.6, REQ-010 done, commit `2b35a8f`) / FileItem (§10.7, REQ-015 ready) 와 **동일한 className-state 안티패턴 4번째 인스턴스**. `useDeleteLog` 훅(`:13-14`)의 `isPending` 을 `isDeleting` 지역 상수로 파생 후, 별도 `useState("article article--main-item")` + `useEffect([isDeleting])` 의 if/else 분기로 `itemClass` 갱신 — **이중 SSoT** (TanStack Query state ↔ 로컬 state) + 1 tick 지연. 본 §은 해당 후속을 4차 재적용으로 마감하여 Image / File / Log 3 도메인 패턴 정착.

**As-Is**:
```jsx
// src/Log/LogItem.jsx:13-15
const deleteMutation = useDeleteLog();
const isDeleting = deleteMutation.isPending;
const [itemClass, setItemClass] = useState("article article--main-item");

// src/Log/LogItem.jsx:38-45
useEffect(() => {
    if (isDeleting) {
        setItemClass("article article--main-item article--logitem-delete");
    } else {
        setItemClass("article article--main-item");
    }
}, [isDeleting]);

// src/Log/LogItem.jsx:60-61
<article className={itemClass} role="listitem">
```

**To-Be**:
```jsx
// 단순 2 케이스 — 인라인 삼항 권장 (useMemo 도 가능, FileDrop 모범 일관 — §10.7 FileItem 과 패턴 동등)
const itemClass = isDeleting
    ? "article article--main-item article--logitem-delete"
    : "article article--main-item";

<article className={itemClass} data-deleting={isDeleting ? 'Y' : 'N'} role="listitem">
```

**리팩터 세부 (FR-01 ~ FR-08)**:
- **FR-01**: `[itemClass, setItemClass] = useState("article article--main-item")` 1줄 제거.
- **FR-02**: `useEffect([isDeleting])` 분기 setItemClass 7줄 제거 (useEffect 자체 제거 권장 — 단순도).
- **FR-03**: className 파생 — 인라인 삼항 권장 (2-케이스 단순, FileItem §10.7 패턴 동등). `useMemo([isDeleting])` 도 허용 (FileDrop §10.6 모범 일관).
- **FR-04 (Should)**: `data-deleting={isDeleting ? 'Y' : 'N'}` 선언적 속성 추가 — ImageItem `data-enlarged` / FileDrop `data-dragover` / FileItem `data-deleting` 패턴 1:1.
- **FR-05 (Must)**: `'reflects deleting state via className transition'` 회귀 테스트 — `isDeleting=false` → `container.querySelector('.article--logitem-delete')` 없음 / delete trigger → `isDeleting=true` → `.article--logitem-delete` 존재.
- **FR-06 (Should)**: `'preserves data-deleting attribute under parent rerender'` 회귀 테스트 — 부모 리렌더 트리거 후 `data-deleting` 동기 유지.
- **FR-07 (Should)**: spec §10.6 "패턴 reference 연동" 행 갱신 — 본 §10.9 신설 이후 `src/Log/LogItem.jsx:15, 38-45` 의 "별 후속" 박제를 "REQ-20260419-019 done (commit `xxx`)" 로 마감 (별 inspector 라운드).
- **FR-08 (Could)**: LOC 변동 박제 — wc -l 변경 전후 (FileDrop 의 LOC drift 선례 의식, 현 89 → ±5 이내 예상).

**회귀 테스트 (FR-05, FR-06)**:
- `src/Log/LogItem.test.jsx` 기존 케이스 (mutation 결과 success/failed 분기 중심, className 어서트 부재) 100% PASS.
- 신규 ≥ 1 케이스: className 전환 어서트 또는 `data-deleting` 속성 어서트 (RTL 권장 — 사용자 가시 어서트, `getByRole('listitem').getAttribute('data-deleting')` 패턴).
- per-test mock isolation + `makeQueryClient()` 회전 + `vi.clearAllMocks` — TanStack Query mutation mock leak 차단.

**grep 회귀 차단**:
- `grep -n "useState.*itemClass" src/Log/LogItem.jsx` → 0.
- `grep -n "setItemClass" src/Log/LogItem.jsx` → 0.
- `grep -n "data-deleting" src/Log/LogItem.jsx` → ≥ 1 (루트 요소).
- 도메인 일관성 4 파일: `grep -n "data-enlarged\|data-dragover\|data-deleting" src/Image/ImageItem.jsx src/File/FileDrop.jsx src/File/FileItem.jsx src/Log/LogItem.jsx` → 4 파일 각 ≥ 1 hit (§10.1 / §10.6 / §10.7 / §10.9).

**CSS Modules 정합성**: Log 도메인은 CSS Modules 미마이그레이션 (§10 대상 목록의 미완 영역) — plain CSS 클래스 문자열 `"article article--main-item"` / `"article article--main-item article--logitem-delete"` 그대로 유지. Log 도메인 Modules 마이그레이션(별 후속) 시 본 §의 파생화된 className 이 `styles.foo` hash 로 자연 치환 가능 — 마이그레이션 비용 감소.

**TanStack Query 정합**:
- `useDeleteLog.isPending` (TanStack Query 5.x 가 보장하는 stable boolean) 을 단일 SSoT 로 사용 → `itemClass` 별도 state 제거로 동기 timing 버그 0.
- mutation lifecycle (`idle` → `pending` → `success`/`error`) 동안 `isPending` frame-perfect 갱신 — React render commit 과 className 파생이 동일 commit 에서 발생 (1 frame lag 0).

**REQ-015 (FileItem) 와의 관계**:
- REQ-015 (§10.7) 와 본 §10.9 는 동일 안티패턴 — 직교. planner 는 묶음 PR vs 별 PR 결정 가능.
- 두 PR 동시 마감 시 Image / File / Log 3 도메인 + 4 파일 패턴 일관.
- 충돌 가능성 매우 낮음 — 서로 다른 파일.

**시각 회귀 위험 완화**:
- React 18 strict mode 에서 effect double-invocation 시 초기 className state → useEffect → setItemClass 의 1 tick 지연이 현 As-Is 의 잠재 회귀 원인. To-Be 는 인라인 파생으로 render commit 동시 반영 → 부모 리렌더 시 initial className 누락 window 제거.
- React 19 bump (REQ-040 미실행) 후 Concurrent 렌더 + strict mode 효과 ↑ 전 사전 정리.

**수용 기준 (REQ-20260419-019 §10)**:
- [ ] FR-01 itemClass useState 0 매치 (grep).
- [ ] FR-02 setItemClass 0 매치 (grep).
- [ ] FR-03 className 파생 (useMemo 또는 삼항) 동작.
- [ ] FR-04 `data-deleting` 속성 노출 (DevTools 식별 가능).
- [ ] FR-05 회귀 테스트 PASS.
- [ ] (Should) FR-06 data-deleting 회귀 테스트 PASS.
- [ ] (Should) FR-07 inspector 가 §10.6 패턴 reference 글머리 갱신.
- [ ] NFR-02 LOC 변경 ±5 이내 (현재 89 → ≤ 94).
- [ ] NFR-04 4 파일 패턴 일관 검증 (§10.1 / §10.6 / §10.7 / §10.9).
- [ ] `npm run lint` clean.
- [ ] 사용자 visible 회귀 0.

**범위 밖**:
- Log 도메인 CSS Modules 마이그레이션 — §3.1 영역 (8 마이그레이션 대상 중 Log 미완).
- `LogItem` 의 다른 useState 정리 — 별 후속.
- `useDeleteLog` 훅 자체 변경 — REQ-033 영역.
- `LogItem.jsx` 의 다른 렌더 분기 (LogItemInfo, Comment) 변경.
- `Search/SearchInput.jsx:118-126` 의 `setAttribute("class", ...)` 분기 — 별 후속 (REQ-026 §10.1 "범위 밖" 명시).
- React.memo 추가/제거.
- React 19 bump (REQ-040) — 본 §은 bump 전 사전 정리 효과.
- TypeScript 변환.
- LogItem 시각 디자인 변경 ("article article--logitem-delete" 클래스 그대로).

### 10.10 [WIP] SearchInput.test substring → anchored 정규식 어서트 강화 (REQ-20260420-024)

> 관련 요구사항: REQ-20260420-024 FR-01 ~ FR-04, US-01

**맥락 (2026-04-20 관측)**: `src/Search/SearchInput.test.jsx:93` 의 어서트 `expect(mobileSearch.getAttribute("class")).toContain("search-mobile")` 는 substring 매칭이라 CSS Module hash 체계 하에서 `search-mobile ⊂ search-mobilehide` 관계로 "hide" 상태에서도 통과한다 → 회귀 blind spot. `src/Search/Search.module.css` 는 `.divSearchMobile` / `.divSearchMobilehide` 두 class 정의, CSS Modules 자동 camelCase + hash 접미 형태 `_divSearchMobile__xxxxx` / `_divSearchMobilehide__xxxxx` 로 DOM 에 렌더. L114 (`toContain("search-mobilehide")`) 는 의도적으로 "닫힘" 검증이지만 L93 ("열림") 은 현재 hide 와 구분 못 함.

**CSS Modules 해시 정합 (본 spec §4.6 연동)**: 본 spec §4.6 "테스트 영향 검토" 는 `container.querySelector('.foo')` → 해시된 클래스명 깨짐을 지적. 본 §10.10 은 그 연장 — **hash 접미 class 의 어서트 포함 관계(`prefix ⊂ prefixhide`) 주의 정책**을 spec SSoT 로 박제. 향후 다른 Modules 도메인(Image/Toaster 등)의 유사 suffix(`hide` / `active` / `disabled`) 어서트 작성 시 기준점.

**현재 결함**:
- `src/Search/SearchInput.test.jsx:93` — `toContain("search-mobile")` substring → "hide" 상태 blind.
- `src/Search/SearchInput.test.jsx:114` — `toContain("search-mobilehide")` substring → 의도된 "닫힘" 검증, 현 시점 false-positive 없으나 비대칭.
- `src/Search/Search.module.css` 정의: `.divSearchMobile`, `.divSearchMobilehide` (kebab 소스 `.div--search-mobile` / `.div--search-mobilehide` 가 CSS Modules camelCase 변환).

**어서트 강화 원칙 (FR-01, FR-02)**:
- L93 ("열림") → `toMatch(/_divSearchMobile(?!hide)/)` **또는** `toContain + expect(...).not.toMatch(/divSearchMobilehide/)` 조합. negative lookahead 로 hide suffix 엄격 배제.
- L114 ("닫힘") → `toMatch(/_divSearchMobilehide/)` — prefix hash 포함 anchored 매칭으로 대칭 강화.
- 정규식 prefix 는 CSS Modules default (`_divSearchMobile`) 기준 — 빌드 환경별 hash 접미(`__xxxxx`) 는 `.+` 또는 가변 패턴으로 허용. vite/postcss 의 기본 `cssModules.localsConvention` (camelCase) + `scopeBehaviour: 'local'` 전제.

**회귀 가드 주석 (FR-03)**:
- 해당 테스트 블록 바로 위에 1줄:
  ```js
  // substring 대신 anchored 정규식 — search-mobile ⊂ search-mobilehide 중첩 방지 (REQ-20260420-024, css-modules-spec §10.10)
  ```
- 주석 내 spec pointer 로 후속 개발자가 정책 근거 역추적 가능.

**검증 (FR-04 probe, Could)**: 임시 probe 로 L93 어서트가 hide class 주입 시 FAIL 하는지 1회 확인 후 probe 제거. 영구 테스트 변경 없음.

**수용 기준 (REQ-20260420-024 §10)**:
- [ ] FR-01: L93 어서트 substring → anchored 정규식 (`/_divSearchMobile(?!hide)/`) 전환
- [ ] FR-02: L114 어서트 대칭 강화 (`/_divSearchMobilehide/`) — Should
- [ ] FR-03: 회귀 가드 주석 1줄 추가 (Should)
- [ ] FR-04: hide class 주입 probe 로 L93 FAIL 확인 후 probe 제거 (Could)
- [ ] `npm test -- --run src/Search/SearchInput.test.jsx` → 기존 카운트 PASS
- [ ] `npm test -- --run` 전체 PASS (회귀 0)

**범위 밖**:
- CSS class 이름 리네이밍 (`divSearchMobile` / `divSearchMobilehide` 구조 자체 변경) — 별 REQ.
- `src/Search/SearchInput.jsx` 컴포넌트 소스 수정 — 본 REQ 는 어서트 강화만.
- 전역 "모든 substring 어서트" sweep — 다른 도메인 테스트는 별 REQ (본 §10.10 은 SearchInput.test 한정, spec 정책만 가족 도메인에 재사용 가능).
- Vite CSS Modules hash 접미 규약 자체 변경.

**정책 재사용 (가족 도메인)**: 본 §10.10 은 Search 한정 picker 이나, Image/Toaster/Comment 도메인의 유사 suffix 패턴(`hide`/`active`/`disabled`) 어서트 작성 시 본 섹션을 reference. 추후 유사 요구 발견 시 별 REQ 로 승격하거나 본 §10.10 의 적용 도메인 목록을 확장.

**선례**:
- 본 spec §4.6 (테스트 영향 검토) — CSS Modules hash 로 인한 `querySelector('.foo')` 깨짐 주의.
- 본 spec §10.4 (REQ-20260419-012) — Search 도메인 selector 정의 `.div--search-mobilehide`, `.div--search-mobile` 열거.
- TSK-20260420-12 (REQ-20260420-026, commit `e735aea`) — SearchInput `setAttribute` → `className` 선언적 전환 (본 REQ-024 는 그 작업의 §9 "substring 매칭 주의" followup 승계).

## 11. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260417-css-modules-migration.md`
- 후속 요구사항: `specs/requirements/done/2026/04/18/20260418-imageitem-imperative-dom-react-refactor.md` (REQ-026, CSS Modules 마이그레이션 사후 위생)
- 후속 spec: `specs/spec/green/styles/design-tokens-spec.md` (2단계)
- 관련 spec: `specs/spec/green/build/react-version-spec.md` (REQ-026 의 React 19 strict mode 안전성 의존)
- 관련 체크리스트: `specs/spec/green/testing/post-merge-visual-smoke-spec.md` §3 `image-selector-visual-smoke.md` (REQ-028 배치 2)
- 연관 요구사항: `specs/requirements/ready/20260420-searchinput-test-substring-regex-tightening.md` (REQ-20260420-024, §10.10 소관)

## 12. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending) | CSS Modules 1단계 도입 (WIP) | 3, 4, 5 |
| 2026-04-18 | (pending, REQ-20260418-026) | ImageItem 명령형 DOM → 선언적 React 리팩터 §10.1 신설 (WIP) | 10.1 |
| 2026-04-18 | (pending, REQ-20260418-034) | Comment 도메인 dead class 4종 제거 §10.2 신설 (1~2 릴리즈 관찰 후 정리, replypopup Log 전역 의존 inspector 트리거) (WIP) | 10.2 |
| 2026-04-19 | (pending, REQ-20260419-011) | Comment ↔ Log 전역 클래스 정책 결정 §10.3 신설 (3 옵션 trade-off: `:global()` wrapper / Modules 이전 / 현 상태 + 박제) (WIP) | 10.3 |
| 2026-04-19 | (pending, REQ-20260419-012) | Image/Search/Toaster 도메인 dead class audit §10.4 신설 (3 도메인 수동 grep sweep, 도메인당 별 task 슬라이스) (WIP) | 10.4 |
| 2026-04-19 | (pending, REQ-20260419-013) | stylelint + unused-selectors 자동 감지 룰 도입 §10.5 신설 (warn → error phased rollout, §10.4 sweep 연동) (WIP) | 10.5 |
| 2026-04-19 | (pending, REQ-20260419-010) | FileDrop 명령형 DOM → 선언적 React 리팩터 §10.6 신설 (REQ-026 패턴 재적용, classList/setDropzoneStyle 제거, data-dragover 도입) (WIP) | 10.6 |
| 2026-04-19 | (pending, REQ-20260419-018) | FileDrop `useMemo` 4-분기 → 3-분기 단순화 §10.6.1 신설 (UPLOADING ‖ FAILED 통합, LOC drift 정합: 152 → ~149) (WIP) | 10.6, 10.6.1 |
| 2026-04-19 | (pending, REQ-20260419-016) | FileDrop `dropzoneText` JSX useState → `useMemo([isUploading])` 파생 §10.6.2 신설 (§10.6 FR-06 Should 후속 마감) (WIP) | 10.6, 10.6.2 |
| 2026-04-19 | (pending, REQ-20260419-015) | FileItem `setItemClass` 명령형 className state → 선언적 React §10.7 신설 (§10.6 마지막 글머리 "별 후속" 박제 3차 재적용, `data-deleting` 패턴 도입) (WIP) | 10.6, 10.7 |
| 2026-04-19 | (pending, REQ-20260419-017) | 3 체크리스트 묶음 baseline 수행 §10.8 신설 (log-mutation MC/MD 8 + LogItem sanitize F1~F4 + FileDrop 시각 회귀 3 관찰점, 운영자 60분 1회 세션) (WIP) | 10.6, 10.8 |
| 2026-04-19 | (pending, REQ-20260419-019) | LogItem `setItemClass` 명령형 className state → 선언적 React §10.9 신설 (§10.6 "패턴 reference 연동" 글머리 4차 재적용 박제, `data-deleting` 패턴 도입, Image/File/Log 3 도메인 마무리, useDeleteLog.isPending 단일 SSoT) (WIP) | 10.6, 10.9 |
| 2026-04-19 | (pending, REQ-20260419-029) | REQ-019 §10.9 To-Be 코드 실현 트리거 — `src/Log/LogItem.jsx` `setItemClass` state 제거 + `data-deleting` 선언적 className 파생, 머지 후 §10.9 WIP → 마감 + 수용 기준 체크박스 일괄 `[x]` | 10.9 |
| 2026-04-20 | (inspector drift reconcile) | §3 헤더 rename: "(To-Be, WIP)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3 |
| 2026-04-20 | (pending, REQ-20260420-024) | §10.10 신설 — SearchInput.test substring 어서트를 anchored 정규식 (`/_divSearchMobile(?!hide)/`) 로 강화. CSS Modules hash 접미 하에서 `search-mobile ⊂ search-mobilehide` 중첩 blind spot 해소. L93/L114 대칭 강화 + 회귀 가드 주석 1줄. 본 spec §4.6 (hash 깨짐 주의) + §10.4 (Search selector 정의) 연동. 가족 도메인(Image/Toaster/Comment) suffix 패턴 재사용 기준점. (WIP) | 10.10 |
| 2026-04-20 | (pending, REQ-20260420-029) | §10.9 확장 — REQ-20260419-019 realization done 상태에도 `LogItem.jsx` `setItemClass`/`itemClass` 4 hits 잔존 (실태 미반영) drift 2차 재집행. FileItem `6ced3b6` 선례 1:1 전파 (선언적 삼항 + `data-deleting` 속성). REQ-20260420-021/022 와 동일 메타 회귀 3번째 인스턴스. (WIP) | 10.9 |
