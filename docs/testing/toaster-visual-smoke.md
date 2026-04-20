# Toaster CSS Modules 시각 스모크 체크리스트

> SSoT: `specs/30.spec/blue/testing/toaster-visual-smoke-spec.md`
> 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-css-modules-pilot-visual-checklist.md` (REQ-20260418-010, FR-01~06 / NFR-01~03)
> 도입 태스크: TSK-20260418-17
> 자매 문서: `docs/testing/markdown-render-smoke.md`, `docs/testing/styles-cascade-visual-smoke.md`, `docs/testing/tanstack-query-devtools-smoke.md`

## 목적

Toaster CSS Modules 이행(`src/Toaster/Toaster.jsx`, `src/Toaster/Toaster.module.css`) 은 `npm test` 의 jsdom 환경에서는 식별자 해시(`_divToasterBottom_<hash>` 등) 가 존재하는지까지만 확인할 수 있다. 실제 **layout / painting / fadeout** 시각 결과는 jsdom 범위 밖이며, DevTools 클래스 형식 비교를 강제하지 않으면 "눈으로 봤다" 가 주관 판단으로 흐르기 쉽다. 본 체크리스트는 **사람의 1분 점검** 으로 Toaster 또는 사용처 변경 PR 에서의 시각 회귀를 조기에 발견하고, 기대 클래스 형식(`_{camelCase}_<hash>`) 비교를 필수 항목으로 강제한다 (spec §1). Playwright / Storybook / Chromatic 등 자동 시각 회귀 도입은 별 후보이며, 본 문서는 그 도입 이전의 보완재로 운용한다.

## 적용 대상 변경

다음 중 하나라도 수정한 PR 에서 수행한다 (spec §3 재사용 범위).

- `src/Toaster/Toaster.jsx`, `src/Toaster/Toaster.module.css` — 렌더 구조, `className` 조합, `data-*` 속성, fadeout / hide 전환 로직 변경.
- 사용처 7종 Toaster 호출부 변경 — `src/File/FileUpload.jsx`, `src/File/FileItem.jsx`, `src/File/File.jsx`, `src/Comment/Comment.jsx`, `src/Log/Writer.jsx`, `src/Log/LogList.jsx`, `src/Log/LogSingle.jsx`, `src/Image/ImageSelector.jsx`, `src/Search/SearchInput.jsx` 에서 `position` / `type` / `duration` / `message` / `show` prop 변경.
- REQ-20260418-011 (Toaster `hideToaster` className 덮어쓰기 / `crypto.randomUUID()` 정리) 머지 — baseline 재기록 대상.
- `Toaster.module.css` 내 색상 / 위치 / transition 값 변경, CSS Modules `localsConvention`(`vite.config.js` → `css.modules.localsConvention: 'camelCaseOnly'`) 변경.

무관한 변경(서버 상태 리팩터, 백엔드 env 이관, 테스트 헬퍼 도입, 문서 편집 등) 은 수행 대상이 아니다.

## 사전 준비

1. 작업 브랜치 checkout, 변경사항 반영 상태.
2. `npm install` 로 의존성 최신화.
3. `npm run dev` 기동 → 기본적으로 `http://localhost:3000` (실제 로컬 URL 은 Vite dev 서버 기동 시 출력되는 값 기준).
4. 브라우저: Chrome 또는 Edge (DevTools Elements 패널 사용).
5. 로그인 필요 — Admin 메뉴 접근이 필요한 Writer / LogList 케이스는 운영자 세션에서 수행.
6. DevTools Elements 패널 열어두기. Toaster 루트 `<div role="alert">` 를 inspect 하여 `class`, `data-position`, `data-type` 속성을 확인.

## 골든 패스 4종

각 항목은 (재현 절차 / 기대 시각 / DevTools 확인 / 체크박스) 4 블록으로 구성. 체크박스는 `[ ]` 로 초기화된 상태를 템플릿으로 보관하며, 실제 baseline 수행 기록은 §Baseline 기록 섹션에 인라인으로 남긴다.

### 항목 1. File 업로드 성공 → bottom + success (spec §3.2.1, FR-02)

**재현 절차:**

1. `/` 진입 (File 업로드 영역이 노출되는 기본 라우트).
2. File 업로드 영역에 유효 파일을 드롭 또는 선택.
3. 업로드 성공.

**기대 시각:**

- 화면 **하단 중앙** 에 성공색(`--success-background-color` / `--success-text-color`) 배경의 Toaster 가 페이드-인.
- 약 5s(또는 `duration` prop 값) 후 페이드-아웃 transition (opacity 0.5s ease) 으로 사라짐.
- 하단 영역 전체 폭을 차지하는 1em 높이 띠 형태.

**DevTools 확인:**

- Elements 탭에서 Toaster 루트 `<div>` 선택 → class/속성이 다음 형식과 일치하는지 확인:
  ```
  <div class="_divToasterBottom_<hash> _divToasterSuccess_<hash>"
       role="alert"
       data-position="bottom"
       data-type="success"
       data-show="1">
  ```
- 해시 접미사 `_<6자 이상 영숫자>` 존재.
- position 클래스(`_divToasterBottom_...`) 와 type 클래스(`_divToasterSuccess_...`) 가 **공존** (one-hot 금지).
- Computed → `background-color` 가 `--success-background-color` 토큰 값, `position: fixed`, `bottom: 0`.

**체크박스:**

- [ ] DevTools class 해시 형식 확인
- [ ] position/type 클래스 공존 확인
- [ ] `role="alert"` + `data-position="bottom"` + `data-type="success"` 일치
- [ ] 하단 성공색 페이드-인/아웃 시각 동등

### 항목 2. File 업로드 실패 → bottom + error (spec §3.2.2, FR-02)

**재현 절차:**

1. `/` 진입.
2. 잘못된/과대/허용 외 확장자 파일을 업로드 시도.
3. 업로드 실패 (오류 toaster 트리거).

**기대 시각:**

- 화면 **하단 중앙** 에 에러색(`--error-background-color` / `--error-text-color`) 배경의 Toaster 페이드-인.
- 약 5s 후 페이드-아웃.

**DevTools 확인:**

- class/속성 형식:
  ```
  <div class="_divToasterBottom_<hash> _divToasterError_<hash>"
       role="alert"
       data-position="bottom"
       data-type="error"
       data-show="1">
  ```
- Computed → `background-color` 가 `--error-background-color` 토큰 값.

**체크박스:**

- [ ] DevTools class 해시 형식 확인
- [ ] position/type 클래스 공존 확인
- [ ] `role="alert"` + `data-position="bottom"` + `data-type="error"` 일치
- [ ] 하단 에러색 페이드-인/아웃 시각 동등

### 항목 3. Comment 등록 → center + success (spec §3.2.3, FR-02)

**재현 절차:**

1. LogSingle 경로(`/log/:timestamp`) 진입. 발행된 글 중 댓글 가능한 임의의 항목 선택.
2. 본문 하단 Comment 입력 영역에 텍스트 입력.
3. 등록 버튼 클릭 → 등록 성공.

**기대 시각:**

- 화면 **정중앙** 에 성공색 배경의 Toaster 팝업.
- padding `1em 2em`, border-radius 10px, box-shadow 가 있는 카드 형태.
- 약 5s 후 페이드-아웃.

**DevTools 확인:**

- class/속성 형식:
  ```
  <div class="_divToasterCenter_<hash> _divToasterSuccess_<hash>"
       role="alert"
       data-position="center"
       data-type="success"
       data-show="1">
  ```
- Computed → `position: fixed`, `top: 50%`, `left: 50%`, `transform: translateX(-50%) translateY(-50%)`.

**체크박스:**

- [ ] DevTools class 해시 형식 확인
- [ ] position/type 클래스 공존 확인
- [ ] `role="alert"` + `data-position="center"` + `data-type="success"` 일치
- [ ] 중앙 성공색 카드 시각 동등

### 항목 4. Writer 저장 → bottom + success 또는 error (spec §3.2.4, FR-02)

**재현 절차:**

1. Admin 로그인 세션에서 Writer 경로(`/log/write`) 진입.
2. 본문 작성 후 저장 버튼 클릭.
3. 재현 가능한 경로를 기록:
   - **성공 경로**: 정상 본문 저장 성공 → `bottom + success`.
   - **실패 경로**: 저장 실패 케이스(네트워크 에러 시뮬, 서버 400/500 등) 가 재현 가능하다면 `bottom + error` 까지 확인. 재현 불가 시 성공 경로만 기록.

**기대 시각:**

- 화면 하단 중앙에 재현된 type 에 맞는 색상 Toaster.
- 약 5s 후 페이드-아웃.

**DevTools 확인:**

- class/속성 형식(성공 경로):
  ```
  <div class="_divToasterBottom_<hash> _divToasterSuccess_<hash>"
       role="alert"
       data-position="bottom"
       data-type="success"
       data-show="1">
  ```
- 실패 경로 재현 시 `_divToasterError_<hash>` / `data-type="error"` 로 교체.
- 대체 사용처(`src/Log/LogList.jsx` / `src/Image/ImageSelector.jsx` / `src/Search/SearchInput.jsx`) 에서 재현 가능한 경로가 있으면 해당 케이스로 대체 기록 가능.

**체크박스:**

- [ ] 재현 경로(성공 또는 실패) 기록 + DevTools class 해시 형식 확인
- [ ] position/type 클래스 공존 확인
- [ ] `role="alert"` + `data-position` + `data-type` 일치
- [ ] 하단 색상 + 페이드-인/아웃 시각 동등

## DevTools 확인 필수 원칙 (FR-03, NFR-01)

- 항목 1~4 **모두** 에 대해 Elements 패널에서 실측한 class 문자열(해시 포함) 을 체크박스 옆 또는 §Baseline 기록 섹션에 1줄로 병기한다. "눈으로 봤다" 만으로는 통과 불가.
- 다음 3 가지 불변식을 DevTools 에서 항상 확인:
  1. **해시 접미사 존재** — `_<6자 이상 영숫자>` 가 class 이름에 포함. CSS Modules 적용이 깨지면 `div--toaster-bottom` 원문이 그대로 노출됨 → 즉시 regressed.
  2. **position + type 공존** — 두 클래스가 하나의 `<div>` 에 **동시에** 적용 (one-hot 금지). `.filter(Boolean).join(' ')` 로직이 깨지면 한쪽만 남음.
  3. **속성 일관성** — `role="alert"` 항상 존재, `data-position` / `data-type` 이 렌더 시점의 prop 과 일치. `data-show` 는 `"0"` / `"1"` / `"2"` / `"none"` 중 하나.
- hide 직전 → 직후 전환에서 class 변화 관찰:
  - `show === 1` (노출): position + type 만.
  - `show === 2` (fadeout): position + type + `_divToasterFadeout_<hash>` → 1s 후 `_divToasterHide_<hash>` 추가.
  - `show === 0` (hide): position + type + `_divToasterHide_<hash>`.
- REQ-20260418-011(`hideToaster` className 덮어쓰기 정리) 머지 후 본 섹션의 class 전환 패턴을 재검증하고 baseline 을 갱신한다 (spec §3.3, §7 위험 2).
- 체크박스 형식 미준수(`[v]`, `[O]` 등) 지양. 통일해 `[x]` / `[ ]` 만 사용.

## 다른 컴포넌트 이행 시 템플릿 복제 방법 (FR-04, spec §3.4)

CSS Modules 2단계(다른 컴포넌트 이행) 에서 본 체크리스트를 템플릿으로 복제한다.

**복제 규칙:**

1. **파일명 규칙** — `docs/testing/{component}-visual-smoke.md` (예: `header-visual-smoke.md`, `filelist-visual-smoke.md`).
2. **4 블록 구조 유지** — 각 골든 패스 항목은 반드시 `(재현 절차 / 기대 시각 / DevTools 확인 / 체크박스)` 4 블록.
3. **기대 클래스 형식 교체** — `_{camelCaseClass}_<hash>` 패턴 유지, 실제 CSS 파일의 클래스명에 맞춰 camelCase 로 변환 (Vite `css.modules.localsConvention: 'camelCaseOnly'` 기준). 예: `.header--nav-active` → `_headerNavActive_<hash>`.
4. **DevTools 불변식 3개 유지** — 해시 존재 / 다클래스 공존 / 속성 일관성. 컴포넌트 특성상 one-hot 이 맞는 경우 불변식 2 를 삭제하고 그 사유를 문서 §DevTools 확인 원칙에 기록.
5. **자매 문서 cross-link** — `## 관련 문서` 섹션에 `docs/testing/markdown-render-smoke.md`, `docs/testing/styles-cascade-visual-smoke.md`, `docs/testing/tanstack-query-devtools-smoke.md`, `docs/testing/toaster-visual-smoke.md` 를 모두 나열해 일관성 유지 (NFR-03).
6. **baseline 양식 복제** — §Baseline 기록 양식을 복사, "Toaster" → 컴포넌트명 교체, 골든 패스 항목 수에 맞춰 체크박스 조정.

**첫 재사용 시 형식 회고 (REQ §12 위험 3 완화):**

- 첫 번째 재사용 PR 의 `result.md` 또는 본 문서 하단에 1줄 회고를 남긴다. 예: "Header 컴포넌트 이행 시 4 블록 구조가 그대로 적용 가능했음 / nav 상태 4종을 골든 패스 4종으로 매핑 / one-hot 이 아닌 다클래스 공존 패턴 유지".
- 4 블록 구조가 부적합한 컴포넌트가 발견되면 별 태스크로 스펙 갱신 제안.

## Baseline 기록 (FR-05, spec §3.5)

### baseline 양식

```
## Baseline 수행 (toaster-visual)
- 운영자: <이름/이메일>
- 일자: YYYY-MM-DD
- 커밋 해시: <7자 해시>
- 환경: <OS> / <브라우저 + 버전> / <해상도>
- 라우트: /, /log/:timestamp, /log/write
- 결과:
  - [ ] 항목 1. File 업로드 성공 (bottom + success)
  - [ ] 항목 2. File 업로드 실패 (bottom + error)
  - [ ] 항목 3. Comment 등록 (center + success)
  - [ ] 항목 4. Writer 저장 (bottom + success/error)
- DevTools 실측 class (각 항목 1줄):
  - 1:
  - 2:
  - 3:
  - 4:
- 비고: 재현 불가 케이스(예: 실패 경로 재현 불가), 관찰된 이상(있을 경우) 기록.
```

### baseline 1회 (2026-04-18, CSS Modules Toaster 파일럿 + 본 문서 도입)

본 문서 도입 태스크(TSK-20260418-17) 는 **런타임 코드 변경 0 / 문서 1개 신규** 이며, 브라우저 앞에서의 실제 dev 서버 기동 · 파일 업로드 · Comment 등록 · Writer 저장 · DevTools Elements Inspect 는 운영자(park108) 의 로컬 Chrome/Edge 브라우저 환경에서만 수행 가능하다. 본 커밋 시점(자동화된 SDD 파이프라인 내) 에서는 해당 브라우저 세션이 **수동 검증 불가** 이므로, 아래 양식을 1 슬롯으로 비워두고 운영자가 다음 로컬 세션에서 체크박스를 채우도록 예약한다. 자매 REQ-20260418-011(`hideToaster` className / id 정리) 머지 직후 2회째 baseline 을 동일 양식으로 추가한다.

```
## Baseline 수행 (toaster-visual, 1회 — CSS Modules 파일럿 기준)
- 운영자: (park108, pending manual session)
- 일자: 2026-04-18
- 커밋 해시: 2fa3ac3 기준 → 본 문서 도입 커밋 으로 재측정 가능
- 환경: (pending)
- 라우트: /, /log/:timestamp, /log/write
- 결과:
  - [ ] 항목 1. File 업로드 성공 (bottom + success) — pending manual session
  - [ ] 항목 2. File 업로드 실패 (bottom + error) — pending manual session
  - [ ] 항목 3. Comment 등록 (center + success) — pending manual session
  - [ ] 항목 4. Writer 저장 (bottom + success/error) — pending manual session
- DevTools 실측 class:
  - 1: (pending)
  - 2: (pending)
  - 3: (pending)
  - 4: (pending)
- 비고: 본 태스크는 문서 신규 추가만 포함하며 파이프라인 실행 환경에 브라우저 세션이 없어 baseline 이 미수행 상태로 출고. 운영자 다음 로컬 세션에서 수행하고 결과를 아래 §baseline 2회 슬롯에 채움.
```

### baseline 2회 (REQ-20260418-011 머지 후, 예약)

`hideToaster` className 덮어쓰기 / `crypto.randomUUID()` 정리 변경 머지 직후 재수행. DevTools 확인에서 hide 전환 시 class 변화 패턴이 스펙(position + type + hide 3종 공존) 대로 유지되는지 재검증.

```
## Baseline 수행 (toaster-visual, 2회 — REQ-20260418-011 머지 후)
- 운영자:
- 일자:
- 커밋 해시:
- 환경:
- 라우트: /, /log/:timestamp, /log/write
- 결과:
  - [ ] 항목 1. File 업로드 성공 (bottom + success)
  - [ ] 항목 2. File 업로드 실패 (bottom + error)
  - [ ] 항목 3. Comment 등록 (center + success)
  - [ ] 항목 4. Writer 저장 (bottom + success/error)
- DevTools 실측 class:
  - 1:
  - 2:
  - 3:
  - 4:
- 비고: hide 전환 시 class 변화 패턴 재검증 결과 포함.
```

## 향후 자동화 후보 (FR-06, Could)

| 도구 | 성격 | 후보 시나리오 | 외부 참고 |
|------|------|---------------|-----------|
| Playwright snapshots | E2E 브라우저 기반 스크린샷 비교 | 4 골든 패스 (File 성공/실패, Comment, Writer) 를 per-flow snapshot 테스트로 이식; fadeout frame 시점은 `page.waitForTimeout` 으로 고정 | https://playwright.dev/docs/test-snapshots |
| Storybook visual testing | 컴포넌트 단위 스토리 기반 시각 회귀 | `Toaster` 를 `position × type × show` 매트릭스 스토리로 격리 후 스토리 단위 스냅샷 | https://storybook.js.org/docs/writing-tests/visual-testing |
| Chromatic | Storybook 호스팅 + PR 별 diff 리뷰 | Storybook 도입 후 2단계로 연결. Toaster 스토리 diff 자동 리뷰 | https://www.chromatic.com/ |

**도입 난이도·유지비·ROI 비교(요약):**

| 항목 | Playwright | Storybook visual | Chromatic |
|------|-----------|------------------|-----------|
| 초기 도입 난이도 | 중 (브라우저 바이너리·CI 이미지, 업로드/로그인 flow 재현 필요) | 중 (Toaster 스토리만 쓰면 단순) | 저 (Storybook 선행 시) |
| 유지비 | 중~상 (fadeout timing flaky 가능) | 중 (스토리 유지) | 저 (호스팅 비용) |
| ROI (본 4 골든 패스 커버) | 항목 1·2·4 강함, 항목 3 중간 (댓글 로그인 flow) | 항목 1~4 모두 강함 (matrix 스토리) | Storybook 의존 |

본 체크리스트는 어느 도구 도입 이후에도 **1회 baseline** 및 **새 사용처·새 type/position 추가 시** 의 보완 수동 절차로 남는다.

## 갱신 규칙 (NFR-02 / NFR-03)

- Toaster 또는 사용처 변경 PR (§적용 대상 변경 목록) 에서 본 체크리스트를 함께 갱신한다.
- REQ-20260418-011 머지 후 §DevTools 확인 필수 원칙 의 hide 전환 class 변화 패턴을 재검증하고 §baseline 2회 슬롯을 채운다.
- 새 `position` (예: `top`) 또는 새 `type` (예: `loading`) 이 추가되면 §골든 패스 항목을 추가하고, 대응하는 CSS Modules 클래스(`_divToasterTop_<hash>`, `_divToasterLoading_<hash>`) 기대 형식을 명시한다.
- `vite.config.js` 의 `css.modules.localsConvention` 변경 시 본 문서의 기대 class 형식(`_{camelCase}_<hash>`) 을 재검토하고 불일치 시 §DevTools 확인 필수 원칙 불변식 1 을 갱신한다.
- Playwright / Storybook / Chromatic 등 자동 도구 도입 시 해당 항목 상단에 자동 테스트 경로를 링크하고 중복 수행 여부(수동 vs 자동) 를 명시한다.
- 자매 체크리스트(`markdown-render-smoke.md`, `styles-cascade-visual-smoke.md`, `tanstack-query-devtools-smoke.md`) 와 디렉토리 / 형식 일관성 유지 (NFR-03). 형식이 갈라지면 먼저 머지된 쪽으로 정렬.

## 관련 문서

- SSoT spec: `specs/30.spec/blue/testing/toaster-visual-smoke-spec.md`
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-css-modules-pilot-visual-checklist.md` (REQ-20260418-010, FR-01~06, NFR-01~03)
- 원 followup: `specs/followups/consumed/2026/04/18/20260418-1422-toaster-modules-visual-verify.md`
- 직전 태스크: `specs/task/done/2026/04/18/20260418-css-modules-toaster-pilot/` (Toaster CSS Modules 파일럿)
- 자매 체크리스트:
  - `docs/testing/markdown-render-smoke.md` (TSK-20260418-15)
  - `docs/testing/styles-cascade-visual-smoke.md` (TSK-20260418-23)
  - `docs/testing/tanstack-query-devtools-smoke.md` (TSK-20260418-22)
- 자매 spec:
  - `specs/30.spec/blue/testing/markdown-render-smoke-spec.md`
  - `specs/30.spec/blue/testing/styles-cascade-visual-smoke-spec.md`
  - `specs/30.spec/blue/testing/tanstack-query-devtools-smoke-spec.md`
- 상위 정책 spec: `specs/30.spec/green/styles/css-modules-spec.md` §7 (DevTools 확인 항목)
- 관련 REQ: `specs/requirements/ready/` 또는 후속 — REQ-20260418-011 (`Toaster.hideToaster` className 정리) — 본 체크리스트로 회귀 방어
- 외부:
  - Playwright snapshots: https://playwright.dev/docs/test-snapshots
  - Storybook visual testing: https://storybook.js.org/docs/writing-tests/visual-testing
  - Chromatic: https://www.chromatic.com/
