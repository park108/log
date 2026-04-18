# 마크다운 렌더 수동 스모크 체크리스트

> SSoT: `specs/spec/blue/testing/markdown-render-smoke-spec.md`
> 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-markdown-render-visual-smoke-checklist.md` (REQ-20260418-008)
> 도입 태스크: TSK-20260418-15

## 목적

파서 단위 테스트(`src/common/markdownParser.test.js` 등)는 HTML 문자열 레벨만 검증할 뿐, 실제 브라우저에서 `App.css` / `Log.css` / `Writer.css` / `Toaster.css` 의 cascade 가 적용된 시각 결과까지 방어하지 못한다. 본 체크리스트는 **사람의 1분 점검** 으로 렌더 경로 변경(파서 / 마크다운 / 관련 CSS) 후 시각 회귀를 조기에 발견하기 위한 표준 절차다. Playwright / Storybook / Chromatic 등 자동 시각 회귀 도입은 별건이며, 본 문서는 그 도입 이전의 보완재로 운용한다.

## 적용 대상 변경

다음 중 하나라도 수정한 PR 에서 수행한다.

- `src/common/markdownParser.js`, `src/common/sanitizeHtml.js` 또는 그 테스트의 입력/출력 형식을 바꾸는 변경.
- `src/App.css`, `src/Log/Log.css`, `src/Log/Writer.css`, `src/Toaster/Toaster.css` 및 하위 `*.module.css` 중 마크다운 렌더 결과에 영향을 주는 셀렉터(리스트 마커, 들여쓰기, 코드 블록, 인용문, 이미지/링크) 변경.
- `Writer.jsx` / `LogSingle.jsx` / `LogItem.jsx` 의 렌더 경로 변경.

무관한 변경(서버 상태 리팩터, 모듈 도입, 문서 편집 등)은 수행 대상이 아니다.

## 사전 준비

1. 작업 브랜치 checkout, 변경사항 반영 상태.
2. `npm install` 로 의존성 최신화.
3. `npm run dev` 기동 → 기본적으로 `http://localhost:3000` (Vite 구성 기준; 실제 로그는 개발 서버 시작 시 출력되는 URL 사용).
4. 브라우저:
   - Writer 경로: `/log/write` — 상단 에디터에 Markdown 입력 → 하단 `Markdown Converted` 미리보기에서 시각 확인.
   - LogSingle 경로: 발행된 글 상세 페이지 `/log/:timestamp` — 실제 렌더 결과 시각 확인.
5. DevTools Elements 패널 열어두고 리스트 마커 / 들여쓰기 / 폰트 / 링크 색상 확인에 활용.

## 픽스처 6종

각 픽스처는 (입력 Markdown / 기대 시각 / 체크박스 / 접근성 메모) 4 블록으로 구성. Writer 미리보기와 LogSingle 렌더를 모두 확인한다.

### 픽스처 1. 평탄 UL

**입력:**

```markdown
- a
- b
- c
```

**기대 시각:**

- 세 개의 항목이 동일한 좌측 들여쓰기로 나열된다.
- 각 항목 앞에 동일한 디스크(`•`) 마커가 같은 크기로 표시된다.
- 줄간격이 균일하며 아래쪽 항목이 위쪽에 겹치지 않는다.

**체크박스:**

- [ ] Writer preview pass
- [ ] LogSingle pass
- [ ] regressed: ____________

**접근성 메모:** 스크린리더가 `<ul>` 로 구조를 읽도록 semantic list 가 유지되어야 한다 (DevTools 에서 `<ul><li>…</li></ul>` 확인).

### 픽스처 2. 평탄 OL

**입력:**

```markdown
1. a
2. b
3. c
```

**기대 시각:**

- `1.` / `2.` / `3.` 마커가 순서대로 표시된다.
- 마커와 텍스트 사이 간격이 일정하다.
- 텍스트는 좌측 정렬, 마커는 CSS 정책에 따라 일관된 위치에 있다.

**체크박스:**

- [ ] Writer preview pass
- [ ] LogSingle pass
- [ ] regressed: ____________

**접근성 메모:** `<ol>` 의 암묵적 순서가 스크린리더에 전달되어야 하며, 마커가 `list-style: none` 등으로 의미를 잃지 않았는지 확인.

### 픽스처 3. 중첩 UL

**입력:**

```markdown
- a
	- b
- c
```

**기대 시각:**

- `a` 와 `c` 는 같은 들여쓰기 레벨, `b` 는 `a` 안쪽으로 한 단계 더 들여써진다.
- 자식 `b` 의 마커가 부모 마커와 차별되거나(디스크/원/사각) 동일 디스크로 일관되게 표시된다 — 현재 CSS 정책 기준으로 비교.
- 부모/자식 줄간격이 붕괴하지 않는다.

**체크박스:**

- [ ] Writer preview pass
- [ ] LogSingle pass
- [ ] regressed: ____________

**접근성 메모:** 중첩 `<ul>` 이 부모 `<li>` 안쪽으로 올바르게 들어가 있어야 한다 (DevTools 에서 `<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>` 구조 확인).

### 픽스처 4. 중첩 OL

**입력:**

```markdown
1. a
	1. b
2. c
```

**기대 시각:**

- 자식 OL 의 카운터가 부모와 분리되어 `1.` 부터 재시작한다 (`counter-reset` 의도 일치).
- 부모 `2.` 는 자식 블록 뒤에도 `2.` 로 유지되어야 한다 (카운터가 셋 값이 아닌 둘 값).
- 부모/자식 들여쓰기 단차가 UL 3번 픽스처와 시각적으로 동일 레벨.

**체크박스:**

- [ ] Writer preview pass
- [ ] LogSingle pass
- [ ] regressed: ____________

**접근성 메모:** 중첩 `<ol>` 이 부모 `<li>` 안쪽에 들어가야 하며, CSS counter 재시작이 시각에만 영향을 주고 DOM 구조 자체가 평탄해지지 않도록 한다.

### 픽스처 5. 이미지 + 링크 조합

**입력:**

```markdown
[alt](https://example.com) ![cap](https://placehold.co/100)
```

**기대 시각:**

- `alt` 텍스트가 링크 스타일(색상/밑줄 등)로 표시되고, 클릭 시 새 창에서 `https://example.com` 이 열린다 (target/rel 정책 기준).
- `https://placehold.co/100` 이미지가 100×100 크기 placeholder 로 로드된다. 네트워크 실패 시 `alt="cap"` 텍스트가 노출된다.
- 같은 줄에 링크와 이미지가 공존해도 레이아웃이 깨지지 않는다.

**체크박스:**

- [ ] Writer preview pass
- [ ] LogSingle pass
- [ ] regressed: ____________

**접근성 메모:** 이미지 `alt` 가 비어 있지 않고(시각 장애인이 캡션을 이해할 수 있어야 함), 링크의 `rel="noopener noreferrer"` 가 외부 링크에 적용되는지 DevTools 에서 확인.

### 픽스처 6. 코드 블록 + 인용문 조합

**입력:**

````markdown
```js
console.log(1);
```
> note
````

**기대 시각:**

- 코드 블록이 등폭 폰트(monospace)로 표시되고, syntax highlight 가 적용되어 `console` / `log` / `1` 이 서로 다른 색상 또는 weight 로 구분된다.
- 코드 블록은 배경색이 본문과 달라 블록 경계가 분명하다.
- `> note` 인용문은 좌측 보더(일반적으로 회색/파스텔 막대)로 본문과 구분되며, 텍스트가 미세하게 들여써진다.

**체크박스:**

- [ ] Writer preview pass
- [ ] LogSingle pass
- [ ] regressed: ____________

**접근성 메모:** 코드 블록이 `<pre><code>` 로, 인용문이 `<blockquote>` 로 마크업되어 스크린리더가 영역을 안내할 수 있어야 한다.

## 실행 절차

1. `npm run dev` 기동. 콘솔에 출력된 로컬 URL 을 연다.
2. Writer 로 이동 (`/log/write`) → 각 픽스처 입력 → 하단 `Markdown Converted` 미리보기 시각 확인 → 체크박스의 `Writer preview pass` 에 표시.
3. 발행 시뮬(또는 기존 게시글 중 동일 픽스처를 담은 항목) 혹은 LogSingle 경로(`/log/:timestamp`)로 이동 후 새로고침 → 같은 픽스처 시각 확인 → `LogSingle pass` 체크. 차이가 있으면 `regressed: …` 줄에 관찰 내용을 적는다.
4. 6 픽스처 모두 완료 후 결과를 result.md 에 반영(아래 § result.md 연동 참고).

소요 시간 목표: **≤10 분/회** (NFR-01).

## result.md 연동

렌더 경로 변경 태스크(파서 / 마크다운 / 관련 CSS) 의 `specs/task/done/YYYY/MM/DD/{slug}/result.md` 에 아래 양식을 인라인으로 포함하거나, 이 문서로의 링크 + 픽스처 6종 체크 결과만 별도 섹션에 기록한다.

```
## 수동 스모크 (markdown-render)
- 운영자: <이름/이메일>
- 일자: YYYY-MM-DD
- 커밋 해시: <7자 해시>
- 환경: <OS> / <브라우저 버전> / viewport
- 결과:
  - [x] 픽스처 1 평탄 UL (Writer / LogSingle)
  - [x] 픽스처 2 평탄 OL (Writer / LogSingle)
  - [x] 픽스처 3 중첩 UL (Writer / LogSingle)
  - [x] 픽스처 4 중첩 OL (Writer / LogSingle)
  - [x] 픽스처 5 이미지+링크 (Writer / LogSingle)
  - [x] 픽스처 6 코드+인용 (Writer / LogSingle)
- 비고: regressed 가 있다면 관찰 사항·스크린샷·재현 단계 기술.
```

체크박스 형식 미준수 (예: `[v]`) 는 지양 — 형식적 [x] 남발 방지를 위해 운영자 / 해시 / 날짜를 반드시 병기한다 (REQ §12 위험 1 완화).

## 향후 자동화 후보

| 도구 | 성격 | 후보 시나리오 | 외부 참고 |
|------|------|---------------|-----------|
| Playwright snapshots | E2E 브라우저 기반 스크린샷 비교 | 본 6 픽스처를 per-page snapshot 테스트로 이식 | https://playwright.dev/docs/test-snapshots |
| Storybook visual testing | 컴포넌트 단위 스토리 기반 시각 회귀 | `Writer` / `LogItem` 을 스토리로 격리 후 픽스처 시나리오 고정 | https://storybook.js.org/docs/writing-tests/visual-testing |
| Chromatic | Storybook 호스팅 + PR 별 diff 리뷰 | Storybook 도입 후 2단계로 연결 | https://www.chromatic.com/ |

도입 시 본 문서는 자동 테스트의 부가 수동 절차(스모크)로 흡수되며, 새 픽스처/코너 케이스가 추가될 때 여기에 우선 기록한 뒤 자동 시나리오로 옮긴다.

## 갱신 규칙

- 파서(`markdownParser.js`) 또는 위 CSS 파일의 **메이저 변경** PR 에서 본 체크리스트를 함께 갱신 (NFR-02).
- 픽스처 추가/삭제는 별 PR 로 분리 권장. 추가 시 `(입력 / 기대 시각 / 체크박스 / 접근성 메모)` 4 블록 구성을 유지한다.
- Playwright/Storybook 등 자동 도구 도입 시 본 체크리스트의 해당 픽스처 섹션 상단에 자동 테스트 경로를 링크하고, 중복 수행을 금지한다.

## Baseline 수행 예시

초기 도입 기록. 본 체크리스트 자체는 시각 검증용 문서이며, 본 태스크(TSK-20260418-15)는 **런타임 코드 변경 0** 이기에 실제 브라우저 픽스처 렌더 확인은 본 커밋 단독으로 수행하지 않는다. 렌더 경로 변경 태스크(예: 파서/CSS 수정) 진입 시 아래 양식을 복사하여 result.md 에 채워 기록한다.

```
## 수동 스모크 (markdown-render)
- 운영자: (이름)
- 일자: 2026-04-18
- 커밋 해시: 2f1427b
- 환경: macOS 14 / Chrome 124 / 1440x900
- 결과:
  - [ ] 픽스처 1 평탄 UL
  - [ ] 픽스처 2 평탄 OL
  - [ ] 픽스처 3 중첩 UL
  - [ ] 픽스처 4 중첩 OL
  - [ ] 픽스처 5 이미지+링크
  - [ ] 픽스처 6 코드+인용
- 비고: 본 문서 도입 baseline. 본 태스크는 문서 추가만 포함하며 런타임 코드 변경이 없어 수동 픽스처 렌더 확인은 수행하지 않았음 (수행 불가가 아닌 범위 외; 다음 렌더 경로 변경 태스크에서 1회 수행 후 체크박스 채움).
```
