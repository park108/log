# 명세: Post-merge 시각 스모크 체크리스트 통합 (배치 1: Skeleton/ErrorFallback + Search Modules + bindListItem / 배치 2: Writer preview sanitize + ImageSelector + Keyboard activation)

> **위치**:
> - 신규 체크리스트 문서 3건 (WIP):
>   1. `docs/testing/skeleton-errorfallback-visual-smoke.md`
>   2. `docs/testing/search-visual-smoke.md`
>   3. `docs/testing/markdown-nested-list-smoke.md`
> - 참조 소스:
>   - `src/common/Skeleton.jsx`, `src/common/Skeleton.css`, `src/common/ErrorFallback.jsx`, `src/common/ErrorFallback.css`
>   - `src/common/markdownParser.js:360+` (`bindListItem`), `src/Log/LogSingle.jsx`, `src/Log/Writer.jsx:271`
>   - `src/Search/Search.jsx:134-167`, `src/Search/SearchInput.jsx:72-126`, `src/Search/Search.module.css`
> - 형식 선례: `docs/testing/toaster-visual-smoke.md`, `docs/testing/markdown-render-smoke.md`
> **유형**: Test / Operational Checklist (수동 스모크, 재사용)
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-020 초기화)
> **상태**: Experimental (도입 전, 신규 명세)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260418-post-merge-visual-smoke-consolidation.md` (REQ-20260418-020, 배치 1)
> - `specs/requirements/done/2026/04/18/20260418-post-merge-visual-and-kbd-smoke-consolidation-batch2.md` (REQ-20260418-028, 배치 2 — Writer preview sanitize / ImageSelector / Keyboard activation)
> - `specs/requirements/done/2026/04/18/20260418-comment-domain-visual-smoke-checklist.md` (REQ-20260418-035, 배치 3 — Comment 시각)
> - `specs/requirements/done/2026/04/18/20260418-error-boundary-runtime-smoke-checklist-doc.md` (REQ-20260418-037, 배치 3 — ErrorBoundary 런타임)
> - `specs/requirements/done/2026/04/18/20260418-writer-dev-only-failure-simulation-toggle.md` (REQ-20260418-041, Writer 저장 실패 경로 dev-only 시뮬레이션 토글 — toaster-visual-smoke §골든 패스 4 실패 경로 재현 가능성 확보)

> 본 문서는 **직전 3개 followup (Skeleton/ErrorFallback, Search Modules, bindListItem) 의 시각 검증을 재사용 가능한 `docs/testing/` 체크리스트로 통합** 하는 정책 SSoT.
> 자매 체크리스트 (`toaster-visual-smoke-spec`, `markdown-render-smoke-spec`, `styles-cascade-visual-smoke-spec`, `tanstack-query-devtools-smoke-spec`) 와 디렉토리/형식을 일치시킨다.

---

## 1. 역할 (Role & Responsibility)
자동 검증 통과 후에도 jsdom 한계로 잡지 못하는 **layout / painting / 미디어 쿼리 / 토큰 해상도 / 색 / 페이드 / 들여쓰기** 같은 시각 회귀를 1회용 즉흥 작업이 아니라 **재사용 가능한 형식화 체크리스트** 로 정착시킨다.

- 주 책임:
  - 3건의 신규 체크리스트 문서 구조 정의
  - 기존 체크리스트 (`toaster-visual-smoke.md`, `markdown-render-smoke.md`) 와 동일 섹션 구조 (`Pre-conditions` / `Golden Path Checklist` / `Failure Notes`) 강제
  - 각 체크리스트의 골든 패스 / 픽스처 / 검증 포인트 명시
- 의도적으로 하지 않는 것:
  - Playwright / Storybook / Chromatic 자동화 도입 (별 후보)
  - 실제 컴포넌트 / CSS 변경 — 본 spec 은 문서만 신설 요구
  - 토큰 재정의 또는 Skeleton/ErrorFallback 디자인 변경
  - bindListItem 출력 HTML 구조 추가 변경
  - Search CSS Modules 클래스 추가 정리

> 관련 요구사항: REQ-20260418-020 §3 (Goals)

---

## 2. 현재 상태 (As-Is)

### 2.1 3건의 시각 미검증 영역
| 영역 | 자동 검증 상태 | jsdom 한계 (미검증) |
|------|----------------|---------------------|
| Skeleton / ErrorFallback | 단위 테스트 12건 PASS, 토큰 의존 (`--color-bg-loading`, `--error-border-color`, `--error-background-color`) | 토큰 해상도 결과, 블록 높이 / 색 / 버튼 호버 |
| bindListItem (markdownParser) | 28/28 PASS, HTML 문자열 단언 검증 | 들여쓰기 폭, bullet 정렬, 번호 리셋, 마진 |
| Search CSS Modules | `build/assets/Search-*.css` 10개 해시 클래스 확인 (단위) | 미디어 쿼리 활성화 경로, 명령형 `setAttribute` 분기 painting |

### 2.2 형식 선례
- `docs/testing/toaster-visual-smoke.md` (REQ-20260418-010, done) — 골든 패스 4종
- `docs/testing/markdown-render-smoke.md` (REQ-20260418-008, done) — 6종 픽스처
- `specs/spec/blue/testing/toaster-visual-smoke-spec.md`, `markdown-render-smoke-spec.md` — 형식 SSoT

### 2.3 원본 followups (이동 후)
- `specs/followups/consumed/2026/04/18/20260417-2237-skeleton-errorfallback-visual-unverified.md`
- `specs/followups/consumed/2026/04/18/20260418-0752-bindlistitem-manual-visual-check.md`
- `specs/followups/consumed/2026/04/18/20260418-0810-search-modules-visual-verify-unverified.md`

> 관련 요구사항: REQ-20260418-020 §2 배경

---

## 3. 체크리스트 구성 (To-Be, WIP)
> 관련 요구사항: REQ-20260418-020 FR-01~06

### 3.1 공통 형식 (FR-04)
3개 문서 모두 기존 `toaster-visual-smoke.md` / `markdown-render-smoke.md` 와 **동일 섹션 구조**:
- `## Pre-conditions` — 실행 환경 / 진입 URL / DevTools 설정 등
- `## Golden Path Checklist` — 체크박스 `[ ] pass / [ ] regressed (코멘트)` 형태 항목들
- `## Failure Notes` — 회귀 발견 시 followup 작성 유도 섹션

모든 체크박스는 `[ ]` 형태로 명시 (NFR-03).

### 3.2 체크리스트 1: `docs/testing/skeleton-errorfallback-visual-smoke.md` (FR-01)
> 관련 요구사항: REQ-20260418-020 FR-01, FR-05; US-01

**골든 패스 3종**:
1. **lazy 라우트 진입 시 `<Skeleton variant="page" />` 노출** — 절차: `npm run dev` → 라우트 이동 → DevTools Network Throttle(Slow 3G) → 스켈레톤 노출 확인.
2. **Skeleton variant 별 (`page` / `list` / `detail`) 블록 배치 / 높이 / 색상** — 각 variant 마운트 후 Computed 스타일 비교.
3. **ErrorFallback 네트워크 / 렌더 에러 텍스트 분기 + 버튼 호버 상태** — 의도적 throw 컴포넌트 + 네트워크 차단 시나리오.

**토큰 검증 항목 (FR-05)**:
- `--color-bg-loading` (fallback `--loading-background-color`) — 정의값 vs 폴백 두 케이스 확인
- `--error-border-color` (fallback `#dddddd`) — 동일
- `--error-background-color` — 동일

### 3.3 체크리스트 2: `docs/testing/search-visual-smoke.md` (FR-02)
> 관련 요구사항: REQ-20260418-020 FR-02; US-03

**골든 패스 6종**:
1. 헤더 검색 인풋 폰트 / 보더 / 여백 baseline
2. `< 399px` 미디어 쿼리 활성화 시 `span--nav-searchbutton` / `divSearchMobile` 노출
3. `button--search-submit` 크기 유지
4. 결과 요약 박스 여백 / 보더
5. 키워드 하이라이트 배경
6. querystring 밑줄 강조

**절차**: 라우트 `/log` 진입 → 헤더 검색 인풋 사용 → DevTools Responsive 모드로 뷰포트 토글 → `/?q=...` 결과 페이지로 이동.

**명령형 분기 검증**: `src/Search/SearchInput.jsx:118-126` 의 `setAttribute("class", \`div ${styles.divSearchMobile}\`)` 가 모바일 뷰포트에서 동작하는지 Elements 패널로 확인.

### 3.4 체크리스트 3: `docs/testing/markdown-nested-list-smoke.md` (FR-03)
> 관련 요구사항: REQ-20260418-020 FR-03; US-02

**골든 패스 4종 (픽스처)**:
1. `- a\n\t- b` — 1단 들여쓰기 `<ul><li>a<ul><li>b</li></ul></li></ul>`
2. `- a\n\t- b\n- c` — 형제 리스트 복귀
3. `1. a\n\t1. b` — 번호 리셋
4. `- a\n\t- b\nText` — 부모 ul 종료 후 텍스트 노드 마진

**검증 위치**: Writer 미리보기 + LogSingle 본문 양쪽 확인 (`src/Log/Writer.jsx:271` `dangerouslySetInnerHTML` + `src/Log/LogSingle.jsx` 렌더).

**기대 시각**:
- 들여쓰기 폭 (브라우저 기본 또는 CSS 오버라이드) 일관
- bullet / 번호 정렬
- 리스트 종료 후 텍스트 노드의 `margin-top` 자연스러움

### 3.5 result.md 링크 권장 (FR-06, Could)
- 본 영역 변경 task 의 `result.md` 작성 시 해당 체크리스트의 마감 스냅샷(또는 PR 링크) 첨부 권장.
- template 변경은 본 요구사항 범위 밖 (Could) — planner 결정.

### 3.6 baseline 수행 (Must)
- 운영자(park108) 가 3개 체크리스트 모두 [x] 로 마감.
- REQ-20260418-005 (error-boundary-app-integration, done) 의 App.jsx 통합 머지 직후가 Skeleton/ErrorFallback 체크리스트 baseline 캡처에 가장 신선한 시점.

### 3.7 문서 위치 (NFR-01, REQ §13 미결)
- 기본: `docs/testing/` 하위 — 기존 2개 선례와 동일.
- 대안: `docs/testing/visual-smoke/` 하위 통합 디렉토리 — planner 가 자매 체크리스트와 함께 이동 결정 가능.

---

## 3.B 배치 2 체크리스트 구성 (To-Be, WIP — REQ-20260418-028)

> 관련 요구사항: REQ-20260418-028 FR-01 ~ FR-10, US-01~US-03

**맥락 (2026-04-18)**: 직전 4개 followup (모두 consumed 이동 완료) 이 동일 패턴 — 자동 검증은 통과했으나 jsdom 한계로 시각 / 키보드 동작 미커버:
- `20260418-0438-writer-preview-visual-verify` (TSK-30 sanitize 통합 후 미리보기 시각)
- `20260418-1321-imageselector-modules-visual-verify` (`60ef1c9` CSS Modules 후 다이얼로그 layout/색)
- `20260418-0708-apicallitem-retry-manual-keyboard-unverified` (TSK-29 Tab/Enter/Space)
- `20260418-0722-contentitem-retry-keyboard-manual-verify` (TSK-27 commit `d8cd8bb` Tab/Enter/Space + 로딩 전환 체감)

**결정**: 배치 1 (§3.1 ~ §3.7) 와 **동일 형식** 으로 3개 체크리스트 신설. ApiCallItem (followup #3) + ContentItem (followup #4) 는 accessibility-spec §2.1 의 9곳 패턴 B 중 2행 → 단일 `keyboard-activation-smoke.md` 에 흡수 (향후 다른 7곳이 적용될 때도 동일 매트릭스 확장).

### 3.B.1 공통 형식 (FR-04)
배치 1 §3.1 동일: `## Pre-conditions` / `## Golden Path Checklist` / `## Failure Notes`. 모든 체크박스 `[ ]` 형태.

### 3.B.2 체크리스트 4: `docs/testing/writer-preview-sanitize-visual-smoke.md` (FR-01)
> 관련 요구사항: REQ-20260418-028 FR-01; US-01

**픽스처 6종 (인라인 마크다운 블록)**:
1. 평문 + 마크다운 (ATX 제목, 강조)
2. 코드 블록 (`js`, `bash`, `python` — highlight.js 스킨 확인)
3. 외부 링크 `https://example.com` — sanitize 후 `target="_blank" rel="noopener noreferrer"` 정규화
4. 평탄 리스트 + 중첩 리스트
5. 이미지 (`![alt](url)`) — alt + (있으면) lazy 로딩 확인
6. **XSS 시도** — `<script>alert(1)</script>`, `<img src=x onerror=...>` → sanitize 후 미렌더

**기대 시각**: 픽스처별 서술 (코드 폰트/배경, 링크 색, 리스트 들여쓰기, 이미지 max-width). 선택 스크린샷 슬롯.

**관련 소스**: `src/Log/Writer.jsx:258-275` (`dangerouslySetInnerHTML`), `src/common/sanitizeHtml.js:7-17`, `src/Log/Writer.test.jsx:121-166`.

**cross-link**: `sanitizeHtml-spec.md` §9.1.1 본 체크리스트 링크 추가 (inspector 영역, 본 업데이트로 반영).

### 3.B.3 체크리스트 5: `docs/testing/image-selector-visual-smoke.md` (FR-02)
> 관련 요구사항: REQ-20260418-028 FR-02; US-02

**시나리오 5단계**:
1. 다이얼로그 open — trigger 클릭 → fade-in, 75% max-width 중앙 정렬, 배경 dim
2. 썸네일 grid — 4장+ 이미지가 float 또는 grid 로 정렬, hover 시 `box-shadow`
3. 이미지 클릭 — 강조 색(`var(--normal-border-color)` border + 배경) 적용, 75% max-width fixed overlay 확대
4. 재클릭 (확대 → 축소) — 토스트 "Markdown copy" 노출 + 썸네일 복귀
5. 다이얼로그 close — 다른 영역 클릭 또는 ESC (지원 시)

**관련 소스**: `src/Image/ImageSelector.jsx`, `src/Image/ImageSelector.module.css`, `src/Image/ImageItem.jsx:1-49`.

**REQ-026 연계**: ImageItem 리팩터 (선언적 React) 머지 후 본 체크리스트 동일 baseline 으로 회귀 검증 → 시각 회귀 0 확인.

### 3.B.4 체크리스트 6: `docs/testing/keyboard-activation-smoke.md` (FR-03, FR-10)
> 관련 요구사항: REQ-20260418-028 FR-03, FR-10; US-03

**매트릭스**: accessibility-spec §2.1 의 9곳 × 4 키 (Tab / Enter / Space / 비-타겟) 매트릭스. 미적용 위치는 `TBD`.

**시나리오 (각 위치)**:
- 페이지 로드 → Tab 순회로 대상 요소 도달 가능
- Enter → onClick 핸들러 1회 호출 (예: Retry → 재요청)
- Space → 동일 핸들러 호출, 페이지 스크롤 없음 (`preventDefault`)
- 비-타겟 키(임의 영문, Esc) → 핸들러 호출 없음
- REQ-023 자매: 키보드 포커스 시 `:focus-visible` outline 가시 + 마우스 클릭 시 미발생

**followup #4 특화 (FR-10)**: ContentItem 행에 "Enter/Space 시 시각적 로딩 재진입 전환 체감 (스피너 → 에러/콘텐츠 재표시)" 항목 명시.

**followup #3/#4 수용 4항목** (US-03 수용 기준): ApiCallItem / ContentItem 행에서 (a) Tab 도달 (b) Enter/Space 트리거 (c) 로딩 전환 체감 (d) focus-visible 가시 모두 PASS.

**관련 소스**:
- `src/Monitor/ApiCallItem.jsx:188-197`, `src/Monitor/Monitor.css:69-74` (`.span--monitor-retrybutton`)
- `src/Monitor/ContentItem.jsx:19-27` (헬퍼), `:162-172` (적용, commit `d8cd8bb`)
- 미정 5곳 (FileItem×2, ImageSelector, SearchInput, WebVitalsItem) → TBD 행 플레이스홀더

**cross-link**:
- `accessibility-spec.md` §2.3 / §4.A.7 본 체크리스트 링크 추가 (inspector 영역).
- 향후 `activateOnKey` 공통 헬퍼 (REQ-025) 도입 시 본 매트릭스에 import 일관성 검증 추가 가능.

### 3.B.5 spec 박제 (FR-05)
배치 1 선례 따라 **본 green spec (`post-merge-visual-smoke-spec.md`) 내 §3.B 섹션 추가** 방식 채택. 별 `specs/spec/blue/testing/*.md` 분리 여부는 planner 가 배치 1 머지 결정 따름 (REQ-020 §13 미결과 동일 패턴).

### 3.B.6 연계 spec 갱신 (FR-06, FR-07)
- `sanitizeHtml-spec.md` §9.1.1 (REQ-102) 에 `writer-preview-sanitize-visual-smoke.md` cross-link (본 업데이트로 반영)
- `accessibility-spec.md` §2.3 / §4.A.7 에 `keyboard-activation-smoke.md` cross-link (본 업데이트로 반영)
- 배치 1 (§3.2 ~ §3.4) 와 배치 2 (§3.B.2 ~ §3.B.4) 의 INDEX (FR-09) — 현 §3 본문 순차 나열로 대체, 별 INDEX.md 는 별 후보

### 3.B.7 baseline 수행 (Must)
- 운영자(park108) 가 3개 체크리스트 1회 수행 → [x] 마감. REQ-028 §10 수용 기준.
- 세션 통합 권장:
  - Writer preview — TSK-30 머지 직후
  - ImageSelector — REQ-026 리팩터 머지 직후
  - Keyboard 9곳 — REQ-023 focus-visible 마감 baseline 과 동시

### 3.B.8 수용 기준 (REQ-20260418-028 §10)
- [ ] `docs/testing/writer-preview-sanitize-visual-smoke.md` 존재 + 6 픽스처 + XSS 1건 + 기대 시각
- [ ] `docs/testing/image-selector-visual-smoke.md` 존재 + 5단계 시나리오 + 기대 시각
- [ ] `docs/testing/keyboard-activation-smoke.md` 존재 + 9곳 × 4 키 매트릭스 (TBD 포함), ApiCallItem + ContentItem 행 데이터 포함
- [ ] 3개 체크리스트 모두 기존 5개 선례와 형식 동등 (`## Pre-conditions` / `## Golden Path Checklist` / `## Failure Notes`)
- [ ] 본 §3.B 섹션이 green spec 내 박제 (본 업데이트로 반영)
- [ ] `sanitizeHtml-spec.md` §9.1.1 cross-link 반영 (inspector 후속)
- [ ] `accessibility-spec.md` §2.3 / §4.A.7 cross-link 반영 (inspector 후속)
- [ ] REQ-020 배치 1 의 인덱스 갱신 (본 §3.B 추가로 완료)
- [ ] 운영자 1회 baseline 박제
- [ ] `npm test` / `npm run lint` / `npm run build` 영향 0 (문서만)

### 3.B.9 범위 밖
- Storybook / Playwright / Percy 등 자동 시각 회귀 도구 (별 후보)
- 9곳 패턴 B 적용이 미완료된 위치의 패턴 적용 자체 (accessibility-spec §2.1 별 태스크)
- ImageSelector 다이얼로그의 모달 a11y (focus trap, Esc 닫기) — 별 후보
- 모바일 뷰포트 (max-width 800px) 별도 체크리스트 — 별 후보
- highlight.js 의 다양한 언어 스킨 망라 — 본 요구사항은 3종 표본만

---

## 3.C 배치 3 체크리스트 구성 (To-Be, WIP — REQ-20260418-035, REQ-20260418-037)

> 관련 요구사항: REQ-20260418-035 FR-01 ~ FR-09, REQ-20260418-037 FR-01 ~ FR-08

**맥락 (2026-04-18)**: Comment 도메인 CSS Modules 마이그레이션(`38c456e`) 과 ErrorBoundary App 통합(REQ-026, done) 은 자동 검증 통과했으나 GUI 브라우저 런타임 검증이 자동 SDD 파이프라인에서 불가. 본 배치는 배치 1/2 와 **동일 형식**으로 2개 체크리스트 추가 — Comment 도메인 시각 / ErrorBoundary 런타임.

### 3.C.1 공통 형식 (FR-04 공통)
배치 1/2 §3.1 / §3.B.1 동일: `## Pre-conditions` / `## Golden Path Checklist` / `## Failure Notes`. 모든 체크박스 `[ ]` 형태.

### 3.C.2 체크리스트 7: `docs/testing/comment-visual-smoke.md` (REQ-20260418-035 FR-01~08)
> 관련 요구사항: REQ-20260418-035 FR-01 ~ FR-08, US-01~US-03

**환경**: 운영자 로컬 Chrome / Edge 최신. 350 / 400 / 640 px 브레이크포인트 (Log 단건 페이지 컨테이너 — Comment 는 내부 렌더). admin 로그인 + 비로그인 2 세션.

**픽스처 5종 (필수)**:
1. **스레드 진입 레이아웃 0 변동** — `/log/:timestamp` → 댓글 영역 펼침 → 스레드 / 아이템 / 메시지 / 시간 / reply 버튼 정렬·간격 확인.
2. **hidden 메시지 admin 모드 색상** — admin 로그인 → hidden 댓글 노출 시 `.div--comment-revealhidden` `color: crimson` 적용 + `.div--comment-adminhidden` 결합 시 우선순위 정확 (DevTools Computed).
3. **reply 버튼 팝업 위치** — hover 시 `.div--comment-replybutton` (`width: 20px; padding: 12px 0px 5px 5px`) 위치 / 색상 / hover 전환.
4. **Form 입력 / hidden 체크박스** — name input (admin 모드 disabled) / hidden 체크박스 / textarea / submit 버튼 정렬 + disabled 상태 색.
5. **CSS Modules 해시 스코핑** — DevTools Elements → 댓글 div 클래스가 `_div--comment-*_1wfib_*` 형태 + 다른 도메인은 전역 형태 (`.div--logitem-linkmessage` 등).

**관련 소스**:
- `src/Comment/Comment.jsx:174-193` (`section.sectionLogitemComment` 루트)
- `src/Comment/CommentItem.jsx:65-89` (`messageClassName` 5 분기)
- `src/Comment/CommentForm.jsx` (form / hidden 체크박스)
- `src/Comment/Comment.module.css:44-72` (message/hidden/reveal/visitor/admin), `:74-76` (reply 조합 셀렉터)
- 빌드: `build/assets/Comment-U7oCLWgA.css` (해시 prefix `_1wfib_`)

**baseline 슬롯** (최소 2 + 향후):
1. 1회 슬롯 — 본 checklist 머지 직후 park108 1회 — 날짜 / 환경 / 해상도 / 해시 prefix / 5 항목 `[x]`.
2. 2회 슬롯 — REQ-20260418-034 (Comment dead class 제거) 머지 후 회귀 0 baseline.
3. 향후 슬롯 — 디자인 토큰 변경 / hidden 정책 변경 등.

**수용 기준 (REQ-20260418-035 §10)**:
- [ ] `docs/testing/comment-visual-smoke.md` 신설 — 5 픽스처 + `## Pre-conditions` / `## Golden Path Checklist` / `## Failure Notes`
- [ ] Baseline 1회 슬롯 명시 + (Should) 운영자 수행
- [ ] Baseline 2회 슬롯 명시 (REQ-034 회귀 0)
- [ ] `grep -rn "_div--comment-" build/assets/Comment-*.css` → 활성 클래스 수 baseline 박제
- [ ] 자매 체크리스트 (toaster / markdown-render / styles-cascade / tanstack-devtools / skeleton-errorfallback / search / markdown-nested-list / writer-preview / image-selector / keyboard-activation) 와 형식 동등
- [ ] `npm test` / `npm run lint` / `npm run build` 영향 0 (문서만)

**범위 밖**:
- Playwright / Storybook 자동 시각 회귀 — 별 트랙.
- `.div--comment-replypopup` 자체의 Modules 이전 — `css-modules-spec.md` §10.2 inspector 트리거 영역.
- 다른 도메인(Image / Search) 시각 체크리스트 — Image 는 배치 2 §3.B.3 완료, Search 는 배치 1 §3.3 완료.
- 반응형 디자인 변경 / i18n / TypeScript / Comment API 변경 — 별 트랙.

### 3.C.3 체크리스트 8: `docs/testing/error-boundary-runtime-smoke.md` (REQ-20260418-037 FR-01~08)
> 관련 요구사항: REQ-20260418-037 FR-01 ~ FR-08, US-01~US-05

**맥락**: ErrorBoundary 의 App.jsx 통합 (REQ-026, done — `src/App.jsx:88` Suspense fallback 교체 + `:93-119` 3 라우트 ErrorBoundary 래핑) 의 런타임 (lazy 라우트 Skeleton 플리커 / throw 시 ErrorFallback / 이웃 라우트 유지 / reset 재마운트 / reportError 호출) 은 jsdom 범위 밖 — 운영자 수동 스모크 필요.

**환경**: 운영자 로컬 Chrome / Edge 최신. DevTools Console + Elements + Network.

**사전 준비**: `npm install`, `npm run dev`, 의도 throw 트리거 (React DevTools "Force throw" 또는 임시 throw 코드 — 운영자 결정).

**픽스처 5종 (필수)**:
1. **Skeleton 가시 (라우트 전환)** — 첫 진입 시 `/log`/`/file`/`/monitor` 각 라우트 lazy 로드 동안 `<Skeleton variant="page" />` 노출. Network throttle "Slow 3G" 로 지연 가능.
2. **의도 throw 시 ErrorFallback 노출** — `Log` 컴포넌트에 임시 throw → `ErrorFallback` UI 노출 + Navigation / Footer 유지.
3. **이웃 라우트 정상 동작** — throw 상태에서 Navigation 클릭 → `/file` 정상 렌더 (라우트 격리 검증).
4. **Reset 버튼 후 재마운트** — ErrorFallback reset 버튼 클릭 → `Log` 컴포넌트 재마운트 → throw 제거 후 정상 렌더.
5. **`reportError` (onError 훅) 호출 가시** — DevTools Console 에 `reportError` 의 `console.error` / 향후 Sentry stub 호출 가시.

**관련 소스**:
- `src/App.jsx:88` (Suspense fallback)
- `src/App.jsx:93-119` (3 라우트 ErrorBoundary 래핑)
- `src/common/ErrorBoundary.jsx`, `src/common/ErrorFallback.jsx`, `src/common/Skeleton.jsx`
- `src/common/errorReporter.js` (`reportError`)
- 단위 테스트 4 케이스: `src/common/ErrorBoundary.test.jsx`
- App smoke: `src/App.test.jsx:193-220` (REQ-026 신규)

**의도 throw 가이드 (FR-05)**:
- (a) React DevTools Components 패널의 "Throw error" 디버그 도구, 또는
- (b) `src/Log/Log.jsx` 에 임시 `throw new Error('runtime smoke')` 추가 → 검증 후 원상복구 (git stash), 또는
- (c) `__DEV__` query string `?throw=true` 토글 — 별 후보 (본 REQ out-of-scope).
- 권장: (a) 가 코드 변경 0 이라 우선. 체크리스트에 (a)/(b)/(c) 중 1개 방법 택1 기록.

**DevTools Console 가이드 (FR-06)**: `reportError` 가 현재 `console.error` 만 호출 (Sentry 미연결, REQ-026 §3.2 별건). Console 탭에서 "reportError" 또는 error message 로 검색 가시.

**baseline 슬롯** (최소 2 + 향후):
1. 1회 슬롯 — 본 checklist 머지 직후 park108 1회 — 날짜 / 환경 / React 버전 / Suspense 변경 commit 해시 / 5 항목 `[x]`.
2. 2회 슬롯 — REQ-20260418-012 (React 19 bump) 머지 후 회귀 0 baseline.
3. 향후 슬롯 — Sentry 연결 / Suspense Query 도입 등.

**cross-link (FR-08)**: `error-boundary-spec.md` §5 (수용 기준) 또는 §6 (운영) 에 본 체크리스트 reference 박제 — 본 업데이트로 반영 (§7.2 참조).

**수용 기준 (REQ-20260418-037 §10)**:
- [ ] `docs/testing/error-boundary-runtime-smoke.md` 신설 — 5 픽스처 + `## Pre-conditions` / `## Golden Path Checklist` / `## Failure Notes`
- [ ] 5 항목: Skeleton / ErrorFallback / 이웃 라우트 / Reset / reportError
- [ ] Baseline 1회 슬롯 명시 + (Should) 운영자 수행
- [ ] Baseline 2회 슬롯 명시 (REQ-012 React 19 bump 회귀 0)
- [ ] 의도 throw 가이드 (a/b/c 중 1) 명시
- [ ] DevTools Console 가이드 (reportError 호출 캡처)
- [ ] 자매 체크리스트 (배치 1/2/3 합산 10+ 개) 와 형식 동등
- [ ] `npm test` / `npm run lint` / `npm run build` 영향 0 (문서만)
- [ ] (Should) `error-boundary-spec.md` cross-link 반영 (inspector 후속, §7.2)

**범위 밖**:
- Sentry 등 외부 리포팅 SDK 연결 — REQ-026 §3.2 별건.
- Playwright / Storybook 자동 시각 회귀 — 별 트랙.
- ErrorBoundary 클래스 자체 변경 — REQ-026 마감.
- React 19 마이그레이션 시 ErrorBoundary 동작 변경 검증 — REQ-012 영역 (본 체크리스트는 reference baseline).
- Suspense Query 도입 — 별 트랙.
- i18n 다국어 ErrorFallback 메시지 / `__DEV__` throw 토글 / CSS Modules / TypeScript — 별 트랙 / 별 후보.

### 3.C.4 spec 박제 정책 (FR-05 공통)
배치 1/2 선례 따라 **본 green spec 내 §3.C 섹션 추가** 방식. 별 `specs/spec/blue/testing/*.md` 분리 여부는 planner (REQ-020 / REQ-028 §13 미결과 동일 패턴).

### 3.D [WIP] Writer 저장 실패 경로 dev-only 시뮬레이션 토글 (REQ-20260418-041)

> 관련 요구사항: REQ-20260418-041 FR-01 ~ FR-12, US-01~US-03

**맥락 (2026-04-18 관측)**: `docs/testing/toaster-visual-smoke.md` §골든 패스 4 의 **실패 경로** (`bottom + error` Toaster) 가 운영자 재현 매우 어려움 — 백엔드 의도 변조 / DevTools Network block / mitmproxy 등 비용 큰 방법만 가능. `src/Log/Writer.jsx` 의 `createLog`/`editLog` (참조: 식별자 `createLog` / `editLog`, 보조 라인 `:124-216`) 안 `setToasterType("error")` 분기 4 지점 (post 4xx/5xx `:148-155`, post network `:157-164`, put 4xx/5xx `:197-204`, put network `:206-213`) 진입 트리거 부재. 결과: `specs/spec/blue/testing/toaster-visual-smoke-spec.md` §3.2.4 의 "성공/실패 중 재현 가능한 경로" 완화 정책에 실패 경로가 영구 누락.

**관련 spec (blue)**: `specs/spec/blue/testing/toaster-visual-smoke-spec.md` §3.2.4 (Writer 항목). 본 체크리스트의 운영 갱신은 planner 의 blue→green 승격 결정 시 동시에 적용 — 본 §3.D 는 트리거 / 정책 박제.

**목표 (FR-01 ~ FR-12)**:
- dev-only 토글 인프라 도입 — **방식 A (`?mock=writer-fail-*` 쿼리 파라미터 + Writer 코드 내 `import.meta.env.DEV` 가드 분기)** vs **방식 B (MSW worker 의 dev-only 자동 시작 + 동일 쿼리 파라미터 → `postLog` / `putLog` 응답 변조)** 중 1 안 PR 본문 결정 사유 박제.
- 4 분기 (post 4xx/5xx / post network / put 4xx/5xx / put network) 모두 토글 활성 시 1~2 클릭으로 진입 가능.
- `import.meta.env.DEV` 가드 — prod 빌드에서 dead-code-eliminate 검증. `grep -l "writer-fail\|MOCK_WRITER" build/assets/*.js` → 0 hit.
- prod 환경에서 `?mock=writer-fail-*` 쿼리 진입 시 무반응 (정상 동작) — 보안 노출 0.
- `src/Log/Writer.test.jsx` 회귀 테스트 1건 추가 — 토글 활성 시 `setToasterType("error")` 분기 진입 어서트.
- `docs/testing/toaster-visual-smoke.md` §골든 패스 4 갱신 — 토글 사용법 1줄 + 실패 경로를 **baseline 필수** 로 승격.
- (Could) `.github/workflows/ci.yml` build 뒤 grep 스텝 1줄 — §3.5.2 (REQ-038) 의 `ReactQueryDevtools` 패턴과 동일 구조 (`! grep -l "writer-fail" build/assets/*.js`).

**NFR (REQ-20260418-041 §7)**: prod 번들 토글 코드 0 (NFR-01), 4 분기 1세션 ≤3분 (NFR-02, baseline 영구 누락 → 1세션 ≤3분 회수), 토글 코드 격리 (NFR-03, dev 1 곳 + prod 0 곳), 번들 크기 ±0.5% 이내 DCE 검증 후 기대 0 (NFR-04), jsdom 단위 테스트 flaky 0 (NFR-05).

**방식 비교 (PR 작성자 결정, REQ-041 §3.1)**:
- 방식 A: Writer 코드 침습 — 1 라인 분기 (`:128` 직전 `import.meta.env.DEV && location.search.includes('mock=writer-fail') && ...`). 단위 테스트 호환 ↑ (`vi.stubEnv('DEV', true)` + URL 모의). MSW worker 인프라 없음.
- 방식 B: MSW worker dev-only — Writer 코드 변경 0. `src/index.jsx` dev 가드 안에서 `msw@^2.13.4` (이미 devDependency) worker 시작. 쿼리 파라미터에 따라 `src/Log/api.js` 의 `postLog`/`putLog` 응답 변조. 기존 테스트 (`vitest`) 의 MSW 사용과 분리 필수.
- 기본 권장: 방식 A (코드 침습 최소 1 라인, 단위 테스트 호환). 방식 B 채택 시 MSW worker 시작 위치 격리 + 테스트 환경 충돌 회피 필수.

**자매 분기 통일 (FR-12 범위 밖, 별 REQ)**: `src/File/FileItem.jsx` (URL 복사 실패) 및 `src/Image/ImageSelector.jsx` (이미지 마크다운 복사 실패) 분기는 본 §3.D 범위 외 — 별 후보 (1~2 사이클 관측 후 발굴).

**clipboard-spec 정합**: `clipboard-spec.md` §3.2.1 의 ImageSelector / FileItem 실패 톤 분기는 clipboard API 거부 (`navigator.clipboard.writeText` reject) 기반으로 이미 jsdom mock 으로 회귀 검증됨. 본 §3.D 는 **`setToasterType("error")` 분기 자체가 아니라 운영자 시각 baseline 재현 가능성** 을 담당 — 레이어 구분 명시.

**수용 기준 (REQ-20260418-041 §10)**:
- [ ] FR-01~05 구현 — 4 분기 모두 토글 활성 시 진입 가능
- [ ] FR-06: dev-only 가드 (prod 영향 0)
- [ ] FR-07: `grep -l "writer-fail" build/assets/*.js` → 0 hit
- [ ] FR-08: prod 환경 토글 시도 무반응
- [ ] FR-09: `src/Log/Writer.test.jsx` 단위 테스트 신규 1건 이상 PASS
- [ ] FR-10: `docs/testing/toaster-visual-smoke.md` §골든 패스 4 갱신 (토글 사용법 + 실패 경로 baseline 필수 승격)
- [ ] (Could) FR-11: `.github/workflows/ci.yml` build 뒤 grep 스텝 추가 (REQ-038 패턴 재사용)
- [ ] FR-12: 4 분기 분리 인터페이스 (`?mock=writer-fail-status` / `...-network` 등)
- [ ] 방식 A vs B 결정 사유 PR 본문 (1~3 문장)
- [ ] NFR-04 번들 ±0.5% 이내 측정값 박제
- [ ] `npm run lint` PASS, `npm run build` PASS

**범위 밖 (REQ-20260418-041 §3.2)**: FileItem / ImageSelector 실패 분기 시뮬레이션 (별 REQ), E2E (Playwright/Cypress), 백엔드 mock server (json-server / miragejs), prod 환경 토글 노출, Writer 외 도메인 debug toggle 전반 정책 (별 spec), Sentry 등 외부 에러 리포팅.

### 3.C.5 연계 spec 갱신 (FR-06, FR-07 공통)
- `css-modules-spec.md` §10.2 (REQ-034) cross-link: comment-visual-smoke 체크리스트 참조 (본 업데이트로 반영).
- `error-boundary-spec.md` §7.2 (신규, REQ-037) cross-link: error-boundary-runtime-smoke 참조 (본 업데이트로 반영).

### 3.C.6 baseline 수행 (Must)
- 운영자(park108) 가 2개 체크리스트 1회 수행 → `[x]` 마감.
- 세션 통합 권장:
  - Comment 시각 — Comment Modules 마이그레이션 직후 + REQ-034 dead class 제거 후 (2 슬롯).
  - ErrorBoundary 런타임 — REQ-026 머지 직후 + REQ-012 React 19 bump 후 (2 슬롯).

---

## 4. 의존성

### 4.1 내부 의존
- 관찰 대상:
  - `src/common/Skeleton.jsx`, `src/common/Skeleton.css`
  - `src/common/ErrorFallback.jsx`, `src/common/ErrorFallback.css`
  - `src/common/markdownParser.js` (`bindListItem`)
  - `src/Log/LogSingle.jsx`, `src/Log/Writer.jsx:271`
  - `src/Search/Search.jsx`, `src/Search/SearchInput.jsx`, `src/Search/Search.module.css`
- 상위 spec:
  - `specs/spec/green/common/error-boundary-spec.md` (ErrorBoundary / ErrorFallback 통합)
  - `specs/spec/green/common/markdownParser-spec.md` (bindListItem 스택 재작성 결과)

### 4.2 외부 의존
- 패키지: 없음 (수동 절차)
- 브라우저: 운영자 로컬 Chrome / Edge DevTools (Network throttle, Responsive mode, Computed styles)

### 4.3 역의존 (사용처)
- REQ-20260418-005 (`error-boundary-app-integration`, done) 의 App.jsx 통합 태스크 — 체크리스트 #1 baseline 캡처 시점
- REQ-20260418-014 (컴포넌트 CSS 중복 import 제거) — 체크리스트 #2/#3 와 함께 cascade 영향 검증
- 자매 `styles-cascade-visual-smoke-spec` — cascade 측면 검증 보완

---

## 5. 수용 기준 (Acceptance — REQ-20260418-020)
- [ ] `docs/testing/skeleton-errorfallback-visual-smoke.md` 존재 + 골든 패스 3종 + 토큰 폴백 검증 항목 포함
- [ ] `docs/testing/search-visual-smoke.md` 존재 + 골든 패스 6종 포함
- [ ] `docs/testing/markdown-nested-list-smoke.md` 존재 + 픽스처 4종 포함
- [ ] 3개 문서 모두 `## Pre-conditions`, `## Golden Path Checklist`, `## Failure Notes` 섹션 보유
- [ ] 모든 체크박스가 `[ ]` 형태 (NFR-03)
- [ ] baseline 1회 수행 (운영자 park108 가 모든 항목 [x] 마감)
- [ ] `npm test` 영향 0 (본 spec 은 문서만 신설, 코드 변경 없음)
- [ ] 자매 체크리스트 (toaster, markdown-render, styles-cascade, tanstack-devtools) 와 디렉토리 / 형식 일관

---

## 6. 비기능 특성 (NFR Status)

| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 유지보수성 | 3건 followup 이 임시 처리 | 5개 시각 체크리스트 동일 섹션 구조 | NFR-01 |
| 사용성 | N/A | 운영자 1회 점검 ≤ 2분/체크리스트 | NFR-02 |
| 신뢰성 | N/A | 절차 누락 즉시 식별 가능 (모든 체크박스 `[ ]`) | NFR-03 |

---

## 7. 알려진 제약 / 이슈
- `npm run dev` 가 에이전트 환경에서 기동 불가 → 본 체크리스트는 운영자(사람) 수행 (REQ §8 제약).
- `docs/testing/` 위치는 planner 가 조정 가능 (REQ §13 미결).
- 5개 체크리스트 누적 시 `docs/testing/INDEX.md` 진입점 추가 여부 — 별 후보 (REQ §13 미결).
- 향후 Playwright / Storybook 도입 시 본 체크리스트의 fixture 텍스트를 그대로 import 할 수 있는 구조로 확장 가능한지 — 별건.
- 운영자가 절차 누락 위험 → 모든 단계 체크박스 + Failure Notes 섹션으로 followup 작성 유도 (REQ §12 위험 3).

---

## 8. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending, REQ-20260418-020) | 3개 신규 시각 체크리스트 (Skeleton/ErrorFallback, Search Modules, bindListItem) 형식 spec 초기화 (WIP) | all |
| 2026-04-18 | (pending, REQ-20260418-028) | 배치 2 — Writer preview sanitize / ImageSelector / Keyboard activation 3개 체크리스트 §3.B 신설 (WIP) | 3.B, all (제목) |
| 2026-04-18 | (pending, REQ-20260418-035, REQ-20260418-037) | 배치 3 — Comment 시각 / ErrorBoundary 런타임 2개 체크리스트 §3.C 신설 (WIP) | 3.C, all (제목) |
| 2026-04-18 | (pending, REQ-20260418-041) | §3.D 신설 — Writer 저장 실패 경로 dev-only 시뮬레이션 토글 (쿼리 파라미터 / MSW worker 방식 A/B 결정, `import.meta.env.DEV` 가드 + DCE 검증, toaster-visual-smoke §골든 패스 4 실패 경로 baseline 필수 승격) (WIP) | 3.D |

---

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-post-merge-visual-smoke-consolidation.md` (이동 후, 배치 1)
- 배치 2 요구사항: `specs/requirements/done/2026/04/18/20260418-post-merge-visual-and-kbd-smoke-consolidation-batch2.md` (REQ-028)
- 원본 followups (이동 후):
  - 배치 1:
    - `specs/followups/consumed/2026/04/18/20260417-2237-skeleton-errorfallback-visual-unverified.md`
    - `specs/followups/consumed/2026/04/18/20260418-0752-bindlistitem-manual-visual-check.md`
    - `specs/followups/consumed/2026/04/18/20260418-0810-search-modules-visual-verify-unverified.md`
  - 배치 2:
    - `specs/followups/consumed/2026/04/18/20260418-0438-writer-preview-visual-verify.md`
    - `specs/followups/consumed/2026/04/18/20260418-1321-imageselector-modules-visual-verify.md`
    - `specs/followups/consumed/2026/04/18/20260418-0708-apicallitem-retry-manual-keyboard-unverified.md`
    - `specs/followups/consumed/2026/04/18/20260418-0722-contentitem-retry-keyboard-manual-verify.md`
- 형식 선례 spec:
  - `specs/spec/blue/testing/toaster-visual-smoke-spec.md`
  - `specs/spec/blue/testing/markdown-render-smoke-spec.md`
- 자매 spec (동일 형식):
  - `specs/spec/green/testing/styles-cascade-visual-smoke-spec.md`
  - `specs/spec/green/testing/tanstack-query-devtools-smoke-spec.md`
- 관련 spec:
  - `specs/spec/green/common/error-boundary-spec.md`
  - `specs/spec/green/common/markdownParser-spec.md`
  - `specs/spec/green/common/sanitizeHtml-spec.md` §9.1.1 (배치 2 Writer preview 체크리스트)
  - `specs/spec/green/common/accessibility-spec.md` §2.3 / §4.A.7 (배치 2 Keyboard activation 체크리스트)
  - `specs/spec/green/styles/css-modules-spec.md` §10.1 (REQ-026 ImageItem 리팩터 — 배치 2 ImageSelector 체크리스트 활용처)
- 직전 태스크: `specs/requirements/done/2026/04/18/20260418-error-boundary-app-integration.md` (REQ-005)
