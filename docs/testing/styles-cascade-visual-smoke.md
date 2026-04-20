# 전역 styles cascade 시각 baseline 체크리스트

> SSoT: `specs/30.spec/blue/testing/styles-cascade-visual-smoke-spec.md`
> 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-styles-cascade-visual-baseline-checklist.md` (REQ-20260418-015)
> 도입 태스크: TSK-20260418-23
> 자매 문서: `docs/testing/markdown-render-smoke.md`, `docs/testing/toaster-visual-smoke.md` (도입 예정), `docs/testing/tanstack-query-devtools-smoke.md` (도입 예정)

## 목적

`src/App.css` 단일 파일을 `src/styles/{index,tokens,fonts,reset,typography,syntax,utilities}.css` 로 분할한 리팩터(`ffb6677`) 는 **코드상 규칙·값 변경 0** 을 전제로 했으나, jsdom 기반 단위 테스트(`npm test`) 는 layout / painting / cascade 결과를 평가하지 못한다. `@import` 순서 변경과 컴포넌트 CSS 진입 정리가 기존 `App.css` 단일 파일 cascade 와 **시각적으로 동등** 함을 1회 7분 수동 스모크로 baseline 박제하고, 자매 REQ-20260418-014(컴포넌트 CSS 의 중복 `@import` 제거) 및 향후 토큰 재명명·다크모드·CSS Modules 2단계에서 재사용한다 (spec §1).

자동 시각 회귀(Playwright / Storybook / Chromatic) 도입은 별 후보 (§자동화 후속 후보). 본 문서는 그 도입 이전 보완재로 운용한다.

## 적용 대상 변경

다음 중 하나라도 수정한 PR 에서 수행한다.

- `src/styles/*.css` 변경 (파일 추가·삭제·진입 순서 변경; `src/styles/index.css` 의 `@import` 순서 포함).
- 컴포넌트 CSS 의 전역 진입 변경 — `src/{Log,File,Monitor}/**.css`, `src/Log/Writer.css` 의 `@import url(../styles/index.css)` 추가·제거.
- `src/App.jsx` 의 `import './styles/index.css'` 라인 변경.
- 토큰 재명명(`--normal-*` → `--color-*` 등), 다크모드 도입, CSS Modules 2단계 이행.
- 신규 브레이크포인트 추가 또는 기존 `350 / 400 / 640 px` 값 변경 (`src/styles/utilities.css`).
- 전역 `@font-face` 또는 `font-display` 정책 변경 (`src/styles/fonts.css`).

무관한 변경(서버 상태 리팩터, 백엔드 env 이관, 문서 편집 등)은 수행 대상이 아니다.

## 사전 준비

1. 작업 브랜치 checkout, 변경사항 반영 상태.
2. `npm install` 로 의존성 최신화.
3. `npm run dev` 기동 → 기본적으로 `http://localhost:3000` (실제 로컬 URL 은 Vite dev 서버 기동 시 출력되는 값 기준).
4. 브라우저: Chrome 또는 Edge (DevTools Elements → Computed, Device Toolbar, Network 사용).
5. 확인 URL 4종 — `/log`, `/log/:timestamp`, `/file`, `/monitor`. `/log/:timestamp` 는 최근 발행 글의 timestamp 값 사용.
6. DevTools Elements 패널 + Device Toolbar 열어두기. Network 패널은 폰트 로딩 확인 시 사용.

## 체크리스트 5 항목

각 항목은 (확인 지점 / 기대 변수·computed style / DevTools 확인 / 체크박스) 4 블록으로 구성한다. 체크박스는 `[ ]` 로 초기화된 상태를 템플릿으로 보관하며, 실제 baseline 수행 기록은 §Baseline 기록 섹션에 인라인으로 남긴다.

### 항목 1. 배경 / 텍스트 / 보더 색상 (spec §3.2)

**확인 지점 / 기대 변수 / DevTools 확인:**

| # | 확인 지점 | 기대 변수 (현재) | 토큰 재명명 후 (가정) | DevTools 확인 방법 |
|---|----------|------------------|------------------------|--------------------|
| 1 | Log 목록 카드(`article.article--main-item`) 배경 | `var(--normal-background-color)` | `var(--color-bg-primary)` | Elements → 카드 article 선택 → Computed → `background-color` |
| 2 | 본문 텍스트 (Log 목록 / LogSingle 본문) | `var(--normal-text-color)` | `var(--color-text-primary)` | Computed → `color` |
| 3 | 단락 보더 (네비 하단 active 탭 등) | `var(--normal-border-color)` | `var(--color-border-primary)` | Computed → `border-color` / `border-bottom-color` |
| 4 | Writer 입력 영역(`textarea`) 배경 / placeholder 색 | `var(--normal-background-color)` / `var(--inactive-text-color)` | `var(--color-bg-primary)` / `var(--color-text-muted)` | textarea inspect → Computed → `background-color`, `::placeholder` 선택 후 `color` |
| 5 | Footer 텍스트색 + 배경 | `var(--sub-text-color)` / `var(--normal-background-color)` | `var(--color-text-sub)` / `var(--color-bg-primary)` | footer inspect → Computed → `color`, `background-color` |

**체크박스 (5 포인트):**

- [ ] 1. Log 카드 배경 = 기대 변수 값 (Computed 캡처 또는 색코드)
- [ ] 2. 본문 텍스트 색 = 기대 변수 값
- [ ] 3. 단락 보더 색 = 기대 변수 값
- [ ] 4. Writer 입력 영역 배경 / placeholder 색 = 기대 변수 값
- [ ] 5. Footer 텍스트색 + 배경 = 기대 변수 값

> `[x]` 남발 방지를 위해 각 체크에는 Computed 패널에서 읽은 실제 색 값(hex 또는 rgb) 을 1 줄씩 병기 권장 (spec §7 위험 1 완화).

### 항목 2. 네비게이션 상태 active / hover / inactive (spec §3.3)

**확인 지점:**

- 관리자 메뉴(로그인 시 상단에 노출되는 Admin 메뉴) 3 상태: active / hover / inactive.
- 일반 메뉴(Log / File / Monitor 등) 3 상태.
- Search 입력창 포커스 상태: 포커스 링 가시 + 기대 보더 색.
- `.li--nav-active` / `.li--nav-inactive` 클래스 적용 색.

**기대 변수:**

| 상태 | 기대 변수 (현재) | 토큰 재명명 후 (가정) |
|------|------------------|------------------------|
| nav active (`.li--nav-active`) 텍스트·배경 | `var(--active-text-color)` / `var(--active-background-color)` | `var(--color-text-active)` / `var(--color-bg-active)` |
| nav active 하단 보더 | `var(--normal-border-color)` | `var(--color-border-primary)` |
| nav inactive 텍스트 | `var(--inactive-text-color)` | `var(--color-text-muted)` |
| nav inactive hover 텍스트 + shadow | `var(--normal-text-color)` / `var(--shadow-color)` | `var(--color-text-primary)` / `var(--color-shadow-primary)` |
| Search 입력창 포커스 링·보더 | `var(--active-border-color)` | `var(--color-border-active)` |

**DevTools 확인:**

- Elements 패널에서 `<li>` 선택 → Styles 탭에서 `:hover` / `:focus` toggle (`:hov` 버튼) 로 상태 강제 전환 → Computed 에서 `color`, `background-color`, `border-*-color` 확인.

**체크박스:**

- [ ] 관리자 메뉴 active 상태 색 일치
- [ ] 관리자 메뉴 hover 상태 전환 (shadow 포함) 확인
- [ ] 관리자 메뉴 inactive 상태 색 일치
- [ ] 일반 메뉴 active / hover / inactive 3 상태 색 일치
- [ ] Search 입력 포커스 시 포커스 링 + 기대 보더 색 일치

### 항목 3. 반응형 브레이크포인트 350 / 400 / 640 px (spec §3.4)

**확인 지점:**

- DevTools Device Toolbar 로 viewport 너비를 각각 351 → 350, 401 → 400, 641 → 640 px 로 전환.
- Navigation 좁아짐: 해당 너비에서 `.hidden--width-640px` / `.hidden--width-400px` / `.hidden--width-350px` 가 적용되어 메뉴 항목 일부가 숨겨짐.
- 본문 영역(`main--main-contents`, `article--main-item`) 좌우 패딩 변화.
- `src/styles/utilities.css` 의 `@media screen and (max-width: N)` 값이 `specs/30.spec/green/styles/design-tokens-spec.md` §5 의 브레이크포인트와 일치.

**기대 동작:**

| 너비 | 기대 클래스 적용 | 시각 변화 |
|------|------------------|-----------|
| ≤ 640 px | `.hidden--width-640px { display: none; }` | 640 px 이하에서 숨김 대상 메뉴 항목 사라짐 |
| ≤ 400 px | `.hidden--width-400px { display: none; }` 추가 적용 | 400 px 이하에서 추가 숨김, `.show--width-400px` 는 `min-width: 399px` 이상에서 숨김(모바일 전용 노출) |
| ≤ 350 px | `.hidden--width-350px { display: none; }` 추가 적용 | 350 px 이하에서 최소 모바일 레이아웃 |

**DevTools 확인:**

- Device Toolbar → Responsive → 각 너비로 전환하며 숨김 요소 Elements 탭에서 `computed display: none` 확인.
- 각 브레이크포인트 전환 순간에 본문 영역 좌우 패딩 / 네비 wrap 여부 시각 비교.

**체크박스:**

- [ ] 640 px 전환: `.hidden--width-640px` 적용 + Navigation 좁아짐 시각 동등
- [ ] 400 px 전환: `.hidden--width-400px` 추가 적용 + `.show--width-400px` 노출 전환 동등
- [ ] 350 px 전환: `.hidden--width-350px` 추가 적용 + 최소 모바일 레이아웃 동등

### 항목 4. 토스트 상태 색 (spec §3.5)

**확인 지점 — 4 변형:**

| 변형 | 재현 경로 | 기대 변수 (현재) | 토큰 재명명 후 (가정) |
|------|-----------|------------------|------------------------|
| bottom + success | `/log/write` → Writer 저장 성공 또는 File 업로드 성공 | `var(--success-background-color)` / `var(--success-text-color)` | `var(--color-status-success-bg)` / `var(--color-status-success-text)` |
| bottom + error | File 업로드 실패 또는 Writer 저장 실패 | `var(--error-background-color)` / `var(--error-text-color)` | `var(--color-status-error-bg)` / `var(--color-status-error-text)` |
| center + success | Comment 등록 성공 | `var(--success-background-color)` / `var(--success-text-color)` | `var(--color-status-success-bg)` / `var(--color-status-success-text)` |
| center + information | Writer → `setToasterType("information")` 경로 (예: ImageSelector 보조 안내) | `var(--normal-background-color)` / `var(--normal-text-color)` | `var(--color-bg-primary)` / `var(--color-text-primary)` |

**DevTools 확인:**

- Elements 탭에서 토스트 컨테이너(`.div--toaster-bottom` / `.div--toaster-center`) 선택 → Computed → `background-color`, `color`.
- 상태 클래스(`div--toaster-success` 등) 가 position 클래스와 **공존** 하는지 확인 (자매 `toaster-visual-smoke.md` 의 DevTools 원칙과 중복 허용).
- 페이드아웃 transition(`.div--toaster-fadeout { opacity: 0; transition: opacity 0.5s ease; }`) 이 시각적으로 보존되는지 관찰 (hide 전/후 0.5s 내 opacity 전환).

**체크박스 (4 변형):**

- [ ] bottom + success 색 및 페이드아웃 시각 동등
- [ ] bottom + error 색 및 페이드아웃 시각 동등
- [ ] center + success 색 및 페이드아웃 시각 동등
- [ ] center + information 색 및 페이드아웃 시각 동등

### 항목 5. 폰트 로딩 FOUT 인식 (spec §3.6)

**확인 지점:**

- `src/styles/fonts.css` 의 `@font-face { font-family: 'Jeju Myeongjo'; font-display: swap; ... }` 적용 타이밍.
- Network 패널에서 웹폰트(`fonts.gstatic.com/ea/jejumyeongjo/v3/JejuMyeongjo-Regular.*`) 다운로드 요청 확인.
- fallback 폰트(Helvetica) → 웹폰트 전환이 `font-display: swap` 정책(즉시 fallback 노출 후 교체) 대로 작동.

**DevTools 확인:**

- Network 탭 → Font 필터 → 새로고침 → `JejuMyeongjo-Regular.woff2` 또는 대체 포맷 1건 이상 200/304 응답 확인.
- Elements → 본문 텍스트 선택 → Computed → `font-family` 가 `'Jeju Myeongjo', Helvetica` 체인 포함 확인.
- 새로고침 직후 Helvetica fallback → Jeju Myeongjo 로의 전환 순간 플리커 허용 범위를 육안 관찰 (수 ms ~ 수백 ms).

**체크박스:**

- [ ] 웹폰트 Network 다운로드 1건 이상 성공
- [ ] fallback → 웹폰트 전환이 `font-display: swap` 정책과 일치
- [ ] 본문 Computed `font-family` 가 `'Jeju Myeongjo'` 체인 포함

## DevTools 확인 필수 원칙 (FR-03, NFR-04)

- 항목 1~5 **모두** 에 대해 DevTools Computed / Elements / Device Toolbar / Network 패널 중 **최소 1 종의 실측 값(CSS 변수명 또는 computed 값 hex/rgb)** 을 체크박스 옆에 병기한다.
- "눈으로 봤다" 만으로는 통과 불가. `[x]` 남발 방지를 위해 Computed 창에서 읽은 실제 값 또는 Network response URL 을 baseline 섹션에 간단히 인라인 기록 (REQ §12 위험 1 완화).
- 체크박스 형식 미준수(`[v]`, `[O]` 등) 는 지양. 통일해 `[x]` / `[ ]` 만 사용.

## 재실행 트리거 (FR-04, spec §3.7)

다음 변경 PR 마다 본 체크리스트를 재수행하고 결과를 `specs/task/done/YYYY/MM/DD/{slug}/result.md` 에 링크로 첨부한다.

- `src/styles/*.css` 의 파일 추가 / 삭제 / 진입 순서 변경 (`src/styles/index.css` 의 `@import` 순서 포함).
- 컴포넌트 CSS 의 전역 진입 `@import url(../styles/index.css)` 추가 · 제거 (자매 REQ-20260418-014 대상).
- 토큰 재명명(예: `--normal-*` → `--color-*`) 작업.
- 다크모드 도입 / CSS Modules 2단계 이행.
- 신규 브레이크포인트 추가 (`src/styles/utilities.css` 의 `@media` 값 변경 또는 추가) — 이 경우 §항목 3 에 새 너비 행 **의무적으로 추가** (REQ §12 위험 2 완화).
- `font-display` 정책 또는 `@font-face` 선언 변경.

## Baseline 기록 (FR-05, spec §3.8)

### baseline 양식

```
## Baseline 수행
- 운영자: <이름/이메일>
- 일자: YYYY-MM-DD
- 커밋 해시: <7자 해시>
- 환경: <OS> / <브라우저 + 버전> / <해상도>
- 라우트: /log, /log/:timestamp, /file, /monitor
- 결과:
  - [ ] 항목 1. 색상 (5 포인트)
  - [ ] 항목 2. 네비 상태 (3 세부 + Search)
  - [ ] 항목 3. 반응형 (350 / 400 / 640 px)
  - [ ] 항목 4. 토스트 4 변형
  - [ ] 항목 5. 폰트 로딩 (FOUT)
- 비고: Computed 값, Network 응답 요약, 관찰된 이상(있을 경우) 기록.
```

### baseline 1회 (2026-04-18, styles 분할 직후)

본 문서 도입 태스크(TSK-20260418-23) 는 **런타임 코드 변경 0 / 문서 1개 신규** 이며, 브라우저 앞에서의 실제 viewport 전환·Computed 확인·Network 검증은 운영자(park108) 의 로컬 Chrome/Edge 브라우저 환경에서만 수행 가능하다. 본 커밋 시점(자동화된 SDD 파이프라인 내) 에서는 해당 브라우저 세션이 **수동 검증 불가** 이므로, 아래 양식을 1 슬롯으로 비워두고 운영자가 다음 로컬 세션에서 체크하도록 예약한다. 자매 REQ-20260418-014(컴포넌트 `@import` 정리) 머지 직후 2회째 baseline 을 동일 양식으로 추가한다.

```
## Baseline 수행 (1회, styles 분할 기준)
- 운영자: (park108, pending manual session)
- 일자: 2026-04-18
- 커밋 해시: ffb6677 (styles 분할) 기준 → 본 문서 도입 커밋 으로 재측정 가능
- 환경: (pending)
- 라우트: /log, /log/:timestamp, /file, /monitor
- 결과:
  - [ ] 항목 1. 색상 (5 포인트)
  - [ ] 항목 2. 네비 상태 (3 세부 + Search)
  - [ ] 항목 3. 반응형 (350 / 400 / 640 px)
  - [ ] 항목 4. 토스트 4 변형
  - [ ] 항목 5. 폰트 로딩 (FOUT)
- 비고: 본 태스크는 문서 신규 추가만 포함하며 파이프라인 실행 환경에 브라우저 세션이 없어 baseline 이 미수행 상태로 출고. 운영자 다음 로컬 세션에서 수행하고 결과를 동일 양식으로 아래 슬롯에 채움.
```

### baseline 2회 (REQ-20260418-014 머지 후, 예약)

```
## Baseline 수행 (2회, 컴포넌트 @import 정리 후)
- 운영자:
- 일자:
- 커밋 해시:
- 환경:
- 라우트:
- 결과:
  - [ ] 항목 1. 색상 (5 포인트)
  - [ ] 항목 2. 네비 상태
  - [ ] 항목 3. 반응형
  - [ ] 항목 4. 토스트 4 변형
  - [ ] 항목 5. 폰트 로딩
- 비고:
```

## 자동화 후속 후보 (FR-07, Could)

| 도구 | 성격 | 후보 시나리오 | 외부 참고 |
|------|------|---------------|-----------|
| Playwright snapshots | E2E 브라우저 스크린샷 diff | 4 라우트 × 3 viewport(350/400/640/desktop) × 2 상태(default/hover) 스냅샷 고정 | https://playwright.dev/docs/test-snapshots |
| Storybook visual | 컴포넌트 단위 스토리 + 시각 회귀 | Navigation / Toaster / Writer 등 격리 후 항목 2·4 시나리오 이식 | https://storybook.js.org/docs/writing-tests/visual-testing |
| Chromatic | Storybook 호스팅 + PR 별 diff 리뷰 | Storybook 도입 후 2단계로 연결, 토큰 재명명 PR 에서 diff 자동 리뷰 | https://www.chromatic.com/ |

**도입 난이도·유지비·ROI 비교(요약):**

| 항목 | Playwright | Storybook visual | Chromatic |
|------|-----------|------------------|-----------|
| 초기 도입 난이도 | 중 (브라우저 바이너리·CI 이미지) | 중~상 (스토리 작성 필요) | 저 (Storybook 선행 시) |
| 유지비 | 중 (스냅샷 drift 관리) | 중 (스토리 유지) | 저 (호스팅 비용) |
| ROI (본 5 항목 커버) | 항목 1·3·4 강함, 항목 2 약함 | 항목 2·4 강함 | Storybook 의존 |

본 체크리스트는 어느 도구 도입 이후에도 **1회 baseline** 및 **새 브레이크포인트·토큰 추가 시** 의 보완 수동 절차로 남는다.

## 갱신 규칙

- 본 문서의 체크리스트 항목 추가·삭제는 **별 PR** 로 분리 (NFR-02). 항목 수정은 styles 변경 PR 과 함께 포함 허용.
- `src/styles/utilities.css` 의 `@media` 브레이크포인트가 추가되면 §항목 3 에 **너비 행을 반드시 추가** 한다 (REQ §12 위험 2 완화).
- 토큰 재명명 PR(예: `--normal-*` → `--color-*`) 에서는 §항목 1·2·4 의 "기대 변수 (현재)" 열을 교체하고, "토큰 재명명 후 (가정)" 열은 삭제한다.
- Playwright / Storybook / Chromatic 등 자동 도구 도입 시 해당 항목 상단에 자동 테스트 경로를 링크하고 중복 수행 여부(수동 vs 자동) 를 명시한다.
- 자매 체크리스트(`markdown-render-smoke.md`, `toaster-visual-smoke.md`(예정), `tanstack-query-devtools-smoke.md`(예정)) 와 디렉토리 / 형식 일관성 유지 (NFR-03). 형식이 갈라지면 먼저 머지된 쪽으로 정렬.

## 관련 문서

- SSoT spec: `specs/30.spec/blue/testing/styles-cascade-visual-smoke-spec.md`
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-styles-cascade-visual-baseline-checklist.md` (REQ-20260418-015, FR-01~07, NFR-01~04)
- 원 followup: `specs/followups/consumed/2026/04/18/20260417-2153-visual-regression-manual-check-pending.md`
- 상위 정책 spec:
  - `specs/30.spec/green/styles/design-tokens-spec.md` §5 (브레이크포인트), §5.1, §9
  - `specs/30.spec/green/styles/css-modules-spec.md` §7
- 자매 spec:
  - `specs/30.spec/blue/testing/toaster-visual-smoke-spec.md`
  - `specs/30.spec/blue/testing/markdown-render-smoke-spec.md`
- 자매 REQ:
  - `specs/requirements/ready/20260418-component-css-redundant-global-imports-removal.md` (REQ-014, 본 체크리스트로 회귀 방어 예정)
  - `specs/requirements/ready/20260418-tanstack-query-devtools-smoke-checklist.md` (REQ-016, 동일 형식)
- 직전 태스크: `specs/task/done/2026/04/18/20260418-styles-directory-split/` (`ffb6677`)
- 외부: web.dev CSS cascade, MDN `font-display`, Playwright snapshots, Storybook visual, Chromatic
