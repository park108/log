# 작성기 문법 템플릿 계약

> **위치**: `src/Log/Writer.tsx` 의 `MARKDOWN_STRING_TEMPLATE` · `copyMarkdownString` · 툴바(`div--writer-toolbar`) · 보조: `src/Image/ImageSelector.tsx` 의 타일 템플릿 · `src/common/common.ts` `copyToClipboard`
> **관련 요구사항**: REQ-20261013-097 FR-01~FR-08 · NFR-01~NFR-03 (출처: 운영자 요청 `20261013-0741-writer-syntax-template-buttons`, 2026-10-13 사장님 지시)
> **게이트**: 신설 예정(§수용 기준 `[ ]`): `src/Log/Writer.syntax-templates.test.tsx` · 기존: `src/Image/ImageSelector.copied-markdown.test.tsx`
> **최종 업데이트**: 2026-10-13 (inspector — 최초 등록)

> 참조 코드는 식별자 우선. 줄 번호는 HEAD=`e1abfdd` 스냅샷이다.

## 역할

작성기 툴바가 내놓는 마크다운 템플릿은 **파서가 마크업으로 소화하는 문자열**이고, 붙여 넣은 자리의 앞 줄을 바꾸지 않으며, 지우기를 잊은 자리표시자가 발행된 글의 독자에게 보이는 속성으로 새지 않는다.

**방어 대상**: 템플릿과 파서는 서로를 모른다. 템플릿이 파서가 소화하지 못하는 표기를 담거나, 선택 항목에 자리표시자를 채우거나, 블록 템플릿이 앞 문단과 붙으면 — 어느 것도 테스트를 붉히지 않고 **발행된 글에서 독자가 먼저 본다.** 현 HEAD 의 두 템플릿이 이미 그 상태다 (§동작 3).

하지 않는 것: 커서 위치 삽입(복사 방식 유지 — 바꾸면 `ImageSelector` 동작도 함께 바뀐다) · 파서가 아직 소화하지 못하는 문법의 버튼(작업 목록 등) · 단축키 · 두 경로의 토스트 유형 차이(Writer `information` · ImageSelector `success`).

## 공개 인터페이스

- 툴바 버튼: 템플릿마다 `type="button"` 버튼 1개. 클릭 → 템플릿을 클립보드에 복사 → 토스트.
- 기존 `data-testid` `img-button` · `a-button` 과 그 단언은 유지된다.

## 동작

1. **툴바는 문법 템플릿 버튼을 가진다** — 제목 · 굵게 · 기울임 · 취소선 · 인라인 코드 · 코드 블록 · 인용 · 목록 · 번호 목록 · 표 · 가로줄, 그리고 기존 이미지 · 링크. 각 버튼은 비어 있지 않은 접근 이름을 갖는다.

2. **모든 템플릿은 파서가 마크업으로 소화한다.** 템플릿 t 마다 `sanitizeHtml(markdownToHtml(t))` 의 DOM 에 `p` 외 요소가 1개 이상 있고, 렌더 텍스트에는 **자리표시자 낱말**(영문 대문자로 시작하는 `[A-Z][A-Z0-9_]*`)만 남는다 — 문법 표기 문자(`*` `~` `` ` `` `#` `>` `-` `|` `[` 등)가 글자로 남지 않는다. 자리표시자 낱말은 이 한 관례를 따른다 (현 `url` · `LinkText` 는 관례 밖).

3. **선택 항목에 자리표시자를 채우지 않는다.** 이미지·링크 템플릿의 렌더 결과에 `title` 속성이 없다. HEAD=`e1abfdd` 위반 2건: `![ALT_TEXT](url "OPTIONAL_TITLE")` → `<img … title="OPTIONAL_TITLE">` · `[LinkText](https://example.com/ "TITLE")` → `<a … title="TITLE">`. `title` 은 마우스를 올리면 보이는 툴팁이다. **같은 수리가 `ImageSelector` 타일 경로에는 이미 있다** (`ImageSelector.tsx` 의 *"제목 자리표시자를 넣지 않는다"*, 게이트 `ImageSelector.copied-markdown.test.tsx`) — 템플릿 사본 둘이 갈라진 것이다. 필수 항목(`ALT_TEXT`)의 자리표시자는 남긴다.

4. **블록 템플릿은 붙여 넣는 자리의 앞 줄을 바꾸지 않는다.** 블록 템플릿 t(단독 산출의 최상위 요소가 `p` 가 아닌 것)마다 `markdownToHtml("문단 줄\n" + t)` 에서 `문단 줄` 은 `p` 에 남고 `h1`~`h6` 이 그것을 담지 않으며 t 의 블록 요소가 생긴다. HEAD=`e1abfdd` 실측: `문단 줄\n---` → `<h2>문단 줄</h2>` (`markdown-rendering` 2 — 파서는 옳다; 템플릿이 자기 경계를 갖지 않은 것이다). 같은 실측에서 제목·인용·목록·번호 목록·코드 블록·표 템플릿은 이미 `<p>문단 줄</p>` 뒤에 자기 블록을 낸다 — 위반은 가로줄 하나다.

5. **판정 모집단은 도출한다.** 템플릿·버튼 목록은 렌더된 툴바 또는 템플릿 맵에서 얻고 손으로 열거하지 않는다. 폼 비제출(`type="button"`)·접근 이름 단언이 **모든** 템플릿 버튼에 걸린다 — 현 `Writer.test.tsx` 의 *"마크다운 보조 버튼은 폼을 제출하지 않는다"* 는 `['img-button', 'a-button']` 열거라 새 버튼이 그 밖에 놓인다. 도출이 공집합이면 무판정 실패다.

6. **클릭 대상이 버튼의 자식이어도 올바른 템플릿이 복사되고, 키를 찾지 못하면 성공 토스트를 띄우지 않는다.** 현 `copyMarkdownString` 은 `e.target.value` 를 읽는다 — 자식 요소가 클릭 대상이면 `undefined` 이고 `copyToClipboard` 의 기본값 `""` 가 복사된 채 성공 토스트가 뜬다.

## 의존성

- 내부: `common/markdownParser` · `common/sanitizeHtml` (판정 경로) · `common/common` `copyToClipboard` · `Image/ImageSelector` (같은 원칙의 다른 사본).
- 계약: `markdown-rendering` — 템플릿이 소화되는지는 그 계약이 정한다. 그 계약에 새 문법(19~25)이 착지하면 동작 2 의 게이트가 템플릿 반영 시점을 판정한다.
- 역의존: `components/log` (Writer 일반 계약 — 툴바 템플릿은 다루지 않는다).

## 수용 기준

- [ ] 템플릿 계약 게이트 (동작 1~6): `bash -c 'npx vitest run src/Log/Writer.syntax-templates.test.tsx --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`e1abfdd` rc=1 (파일 부재). 렌더된 툴바에서 도출한 템플릿 버튼 13개 이상 · 각 `type="button"` · 접근 이름 비공백 · 동작 2·3·4 판정 · 자식 클릭 복사를 잰다.
- [x] 타일 경로의 같은 원칙 유지 (동작 3): `bash -c 'npx vitest run src/Image/ImageSelector.copied-markdown.test.tsx --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`e1abfdd` rc=0.

## 변경 이력

| 일자 | req / 커밋 | 요약 | 영향 |
|------|-----------|------|------|
| 2026-10-13 | REQ-20261013-097 / — | 최초 등록. 버튼 추가 요청을 템플릿↔파서 불변식으로 정식화했다. 현 두 템플릿의 제목 자리표시자 누출(동작 3)이 실측 위반이다 | all |

## 참고

### 주입 이관 (`RULE-06 §게이트 실효 검증` — 동작 2 게이트를 세우는 task 의 DoD)

이관처 task 는 미발행이다.

- **주입**: 템플릿 맵에 `- [ ] TODO` 를 넣는다 → rc≠0 (`[ ]` 가 글자로 남는다). 원복 → rc=0.
- **대조**: 소화되는 템플릿(`**BOLD**`)을 다른 키로 하나 더 넣는다 → rc=0. 붉으면 게이트가 과잉 특정이다.

### 관측된 blue 문면 drift

- `blue/components/image.md` 의 §역할 · §수용 기준은 타일 템플릿을 `![ALT_TEXT](<url> "OPTIONAL_TITLE")` 로 적고 있다. HEAD 코드와 그 게이트(`ImageSelector.copied-markdown.test.tsx`)는 제목 자리표시자를 넣지 않는다 — 동작 3 과 같은 쪽이다. 그 문서는 판정 명령이 없는 as-is 서술(2026-04-20)이라 이번 흡수에서 재개봉하지 않았다.

### 미측정·비판정 항목

- **375px 폭에서 툴바가 가로 스크롤 없이 줄바꿈된다.** jsdom 은 레이아웃을 계산하지 않아 `scrollWidth <= clientWidth` 가 공허하게 참이다. 측정 수단은 수동 도구 `scripts/measure-layout.mjs --width 375 --overflow` 이며 CI 채널이 없다. 현 CSS 는 `flex-wrap: wrap` 이다.
- 블록 템플릿의 경계를 앞 빈 줄로 낼지 다른 표기로 낼지는 수단이다. 요구는 동작 4 의 산출이다.
- 동작 2 의 판정은 소화 여부이지 템플릿의 문구가 아니다. 어떤 자리표시자 낱말을 쓸지는 정하지 않는다.
