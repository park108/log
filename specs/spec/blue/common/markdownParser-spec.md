# 컴포넌트 명세: markdownParser

> **위치**: `src/common/markdownParser.js`
> **유형**: Util (Pure function module)
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-021 반영)
> **상태**: Active (확장 진행 중)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260417-multi-level-list.md`
> - REQ-20260418-021 (`20260418-markdown-anchor-text-escape-and-manual-smoke.md`) — 앵커 텍스트 escape 정책 결정 + 속성 escape 수동 스모크 (WIP)

> 본 문서는 컴포넌트의 **현재 구현 상태 + 진행 중 변경 계획(WIP)** 을 기술하는 SSoT.
> WIP 항목은 `[WIP]` 또는 `> 관련 요구사항:` 헤더로 표시.

---

## 1. 역할 (Role & Responsibility)
사용자가 작성한 마크다운 텍스트를 HTML 문자열로 변환하는 순수 파서.

- 주 책임:
  - 헤딩, 단락, 리스트(UL/OL), 코드 블록, 인용 등 핵심 마크다운 토큰을 HTML 노드로 변환
  - feature별 pass 를 순차 적용하여 점진적으로 노드 트리를 정제
- 의도적으로 하지 않는 것:
  - DOM 직접 조작 (호출부에서 `dangerouslySetInnerHTML` 처리)
  - 외부 마크다운 라이브러리 의존 (자체 구현)
  - CommonMark/GFM 의 모든 엣지 케이스 (실용 부분집합만)

## 2. 공개 인터페이스 (Public Interface)

### 2.1 Props / Arguments
| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `text` | `string` | Y | - | 변환 대상 마크다운 원문 |

### 2.2 이벤트 / 콜백
없음 (순수 함수)

### 2.3 Exports
- default: `markdownParser` (text → HTML string)
- named: 내부 헬퍼는 비공개

## 3. 내부 상태 (Internal State)
함수 호출 단위로 생성되는 `parsed` 배열만 존재. 모듈 레벨 상태 없음.

| 상태 | 타입 | 초기값 | 변경 트리거 |
|------|------|--------|-------------|
| `parsed` | `Node[]` | `[]` | 입력 텍스트 줄 단위 분할 → pass 별 splice |

### 3.1 노드 스키마
```
{ type, text, closure, itemOf?, depth? }
```

> 관련 요구사항: 20260417-multi-level-list — `itemOf` 노드에 한해 `depth?: number` 필드 추가 (WIP)

## 4. 의존성 (Dependencies)

### 4.1 내부 의존
- `src/common/codeHighlighter.js` — 코드 블록 syntax highlight (간접)

### 4.2 외부 의존
- 패키지: 없음 (자체 구현)

### 4.3 역의존 (사용처)
- `src/Log/LogSingle.jsx` — 본문 렌더
- `src/Log/Writer.jsx` — 미리보기
- `src/Comment/*` — 댓글 본문 렌더 (해당 시)

## 5. 동작 (Current Behavior)

### 5.1 파이프라인 개요
1. 원문을 줄 단위로 분리 → `parsed` 배열 초기화
2. feature별 탐지 pass (`index++` + `splice`) 순차 적용
3. `bindListItem` 등 그루핑 pass 실행
4. 노드를 HTML 문자열로 직렬화

### 5.2 리스트 처리 (현재 구현)
- UL 탐지 pass (`:98-115`), OL 탐지 pass (`:119-156`) 가 `node.text.charAt(0)` 만 검사
- `bindListItem`(`:321-348`) 이 연속된 `itemOf` 구간 앞뒤에 `<ul>`/`</ul>` (또는 `<ol>`/`</ol>`) 한 쌍을 감쌈
- depth 개념 없음 → 평탄(flat) 리스트만 가능

### 5.3 [WIP] 중첩 리스트 지원
> 관련 요구사항:
> - 20260417-multi-level-list (depth 메타데이터 부여 — 완료, 직전 커밋 `40887c5`)
> - REQ-20260418-004 (`20260418-markdown-bindlistitem-stack-rewrite.md`) — §5.3.3 알고리즘의 실제 구현 (WIP)

#### 5.3.1 들여쓰기 규약
- 탭 1개 또는 스페이스 2개 = depth +1
- 혼용 시 탭 우선, 스페이스는 2로 나눈 몫을 depth 로 환산

#### 5.3.2 탐지 pass 변경 — 완료 (`40887c5`)
- UL/OL 탐지 pass 모두 선행 `\t`/스페이스를 스캔해 `depth` 산출 후 marker 검사
- `splice` 로 삽입하는 `<li>`/value/`</li>` 세 노드 **모두**에 동일 `depth` 부여
- 위치: `src/common/markdownParser.js:141-144` (UL), `:181-184` (OL), `computeDepth` 헬퍼

#### 5.3.3 `bindListItem` 재작성 (스택 기반) — [WIP] REQ-20260418-004
> 관련 요구사항: REQ-20260418-004
> **현재 상태**: `src/common/markdownParser.js:360-387` 의 `bindListItem` 은 여전히 `isStarted` 단일 boolean 평탄 알고리즘. depth 메타데이터가 부여돼도 출력은 평탄(`<ul><li>a</li><li>b</li></ul>`).
> **목표**: 아래 의사코드대로 스택 기반 재작성. 시그니처 `(parsed, tagName)` 유지, 호출부(`:151`,`:197`) 변경 없음.

시그니처 `bindListItem(parsed, tagName)` 유지, 내부 알고리즘 교체:
```
depthStack = []
prevItemOpen = false
output = []

for node of parsed:
  if node is <li> open and node.itemOf === tagName:
    d = node.depth
    if depthStack.top === undefined:
      push <tagName>; depthStack.push(d)
    else if d > depthStack.top:
      push <tagName>; depthStack.push(d)   // 직전 </li> 방출하지 않음 = 중첩
    else:
      if prevItemOpen: push </li>
      while d < depthStack.top:
        push </tagName>; depthStack.pop()
        push </li>
    push <li>; prevItemOpen = true

  else if node.itemOf === tagName:          // value, </li>
    push node
    if node is </li>: prevItemOpen = false

  else:                                      // 리스트 바깥
    while depthStack.length:
      if prevItemOpen: push </li>; prevItemOpen = false
      push </tagName>; depthStack.pop()
      if depthStack.length: push </li>
    push node

// 종료 후 동일 플러시
```
**핵심**: depth 증가 시 직전 `</li>` 를 방출하지 않는 것이 중첩의 전부.

#### 5.3.4 호출 구조
`bindListItem(parsed, "ul")` (`:117`), `bindListItem(parsed, "ol")` (`:158`) 두 호출 유지. **UL/OL 혼합 중첩은 범위 밖** (후속).

### 5.5 [WIP] 앵커 텍스트 escape 정책
> 관련 요구사항: REQ-20260418-021 (FR-01 ~ FR-10, US-01, US-03, NFR-01, NFR-04)

**배경**
- `src/common/markdownParser.js:267-269` (이미지 emitter) 는 `url` / `alt` / `title` 모두 `escapeHtmlAttr` 을 통과시킨다 (TSK-20260418-20 반영).
- `src/common/markdownParser.js:303-308` (앵커 emitter) 는 `href` / `title` 만 escape 하고 표시 텍스트(`text`) 는 원문 그대로 `<a>` 안에 삽입한다.
- 이유: `markdownParser.js:318-` 의 inline 치환 (`**bold**`, `*em*`, `` `code` ``, `~~del~~`) 이 전체 노드 텍스트에 대해 동작 → 앵커 `text` 가 사전 escape 되면 inline 치환이 엔티티화된 토큰을 못 찾아 마크업이 깨진다.
- 후단 `sanitizeHtml` (REQ-20260418-001) 이 방어하지만, 파서 레벨의 다층 방어 1겹이 결손된 상태이며 의도가 코드 주석/spec 어디에도 명시돼 있지 않다.

**결정 대상 옵션 (Phase 1 — 분석)**

| 옵션 | 내용 | 다층 방어 효과 | 구현 비용 | 회귀 위험 | 유지보수성 |
|------|------|----------------|-----------|-----------|------------|
| A | **파서 2-pass 재구조화**: inline 치환 후 남은 리터럴 텍스트 구간만 escape | 강함 (파서+sanitize 양단) | 중~상 (inline 치환 파이프라인 재작성) | 중 (기존 inline 마크업 회귀 위험) | 중 (파서 복잡도 상승) |
| B | **sanitize 정책 강화**: `<a>` 하위 허용 태그를 `strong`/`em`/`code`/`del` 로 명시 제한 (훅 또는 `FORBID_*`) | 중 (sanitize 경로만, 파서는 여전히 결손) | 하 (sanitizeHtml.js 정책 + 테스트 1건) | 낮음 (정상 마크업 범위 명확) | 상 (정책이 sanitizeHtml 단일 모듈에 집약) |
| C | **현 상태 + 사유 문서화**: 파서 변경 없음, 코드 주석 + spec 명시 | 약함 (sanitize 단일 방어 유지) | 최저 | 0 | 중 (정책이 주석·spec 에 분산) |

평가 축: 다층 방어 효과 / 구현 비용 / 회귀 위험 / 유지보수성. Phase 1 분석 결과 `sanitizeHtml.js` 의 `ALLOWED_TAGS`/`ALLOWED_ATTR` 실측 (REQ-20260418-021 FR-01) 및 `<a>` 하위 현행 처리 파악 후 본 표의 "다층 방어 효과" / "유지보수성" 항목을 **확정**해 결정 사유로 기록한다.

**결정 사유** (Phase 1 완료 후 채움)
- 채택 옵션: (A|B|C) — (planner/developer 분석 결과 기입)
- 근거: (sanitize 정책 실측 결과 + 회귀 비용 비교)
- 기록 일자 / TSK: (결정 PR 머지 시점)

**옵션별 구현 분기** (Phase 2)
- **옵션 A 채택 시**: inline 치환 이후 리터럴 텍스트 escape 2-pass 구조 + 단위 테스트 (`<script>` 류 입력이 `&lt;script&gt;` 로 출력). 인라인 마크업 회귀 테스트 (§7 FR-10 대상).
- **옵션 B 채택 시**: `sanitizeHtml.js` 의 `<a>` 하위 정책 강화 (후크 또는 `FORBID_TAGS`/재정의) + sanitize 단위 테스트 (`[<script>...](https://x)` 입력이 `<script>` 텍스트화). 본 spec 변경 없음(코드 주석/본 §5.5 참조). `sanitizeHtml-spec.md` §6/§10 동기화 필수 (FR-09).
- **옵션 C 채택 시**: 파서 코드 변경 없음. `src/common/markdownParser.js:303-308` 헤드에 의도 1줄 코멘트 (FR-08) + 본 §5.5 가 단일 출처. sanitize 단위 테스트로 회귀 차단 충분한지 어서트 (FR-04/FR-05).

**공통 필수 (옵션 무관)**
- FR-05 XSS 회귀 단위 테스트 1건 이상 추가 — `<script>` 입력이 최종 DOM 에서 실행되지 않고 텍스트화됨을 어서트.
- FR-06 속성 escape 사용자 가시 수동 스모크 1회 — Writer preview + LogSingle 양쪽에서 아래 픽스처 렌더 결과가 원문과 일치 확인:
  - `![a'b](u.png "t\"v")`
  - `[x](https://a.com/?a=1&b=2 "t")`
  - `[<script>alert(1)</script>](https://x.com)` — 옵션 결정 결과에 따라 기대 출력 확정 후 수행.
- FR-07 `docs/testing/markdown-render-smoke.md` 에 "속성 escape 회귀" 픽스처 1종 영구 추가 + baseline 체크박스 마감.
- FR-08 `src/common/markdownParser.js:303-308` 헤드 1줄 의도 코멘트 (본 §5.5 참조).

**참고 코드 경로**
- `src/common/markdownParser.js:267-269` (이미지 emitter, escape 적용)
- `src/common/markdownParser.js:303-308` (앵커 emitter, text escape 미적용)
- `src/common/markdownParser.js:318-` (inline 치환 진입점)
- `src/common/sanitizeHtml.js` — 후단 방어 정책 (옵션 B 영향점)

### 5.4 에러 / 엣지 케이스
- 빈 입력: 빈 문자열 반환
- depth 3단 이상: 동일 알고리즘으로 처리됨 (검증 필요 — REQ-20260418-004 §13 미결)
- 종료 플러시: 입력 끝까지 열려 있는 모든 `<tagName>`/`<li>` 닫기 (REQ-20260418-004 FR-05)
- UL/OL 혼합 입력: 평탄으로 떨어지더라도 예외 없이 산출 (NFR-04)

## 6. 데이터 스키마 (Data Shape)
```
Node = {
  type: 'p' | 'h1' | ... | 'ul' | 'ol' | 'li' | ...,
  text: string,
  closure: boolean,
  itemOf?: 'ul' | 'ol',
  depth?: number   // [WIP] itemOf 노드에서만 의미 있음
}
```

## 7. 테스트 현황 (Current Coverage)
- 테스트 파일: `src/common/markdownParser.test.js`
- 커버된 시나리오:
  - [x] 평탄 UL (`test parsing UL and Text`)
  - [x] 평탄 OL (`test parsing OL`)
  - [x] 헤딩, 단락, 코드 블록 (해당 케이스)
  - [x] 탭 들여쓰기 인식 (depth 부여) — 단, expected 가 평탄 출력으로 임시 고정 (`recognises a tab-indented UL marker as a list item (bindListItem still flat)`). REQ-20260418-004 FR-04 로 갱신 예정.
- 미커버 / 취약 (REQ-20260418-004 FR-03 추가 대상):
  - [ ] [WIP] 동일 타입 UL 중첩 — 출력 `<ul><li>a<ul><li>b</li></ul></li></ul>`
  - [ ] [WIP] depth 2단 복귀 — `- a\n\t- b\n- c` → `<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>`
  - [ ] [WIP] OL 중첩 — `1. a\n\t1. b` → `<ol><li>a<ol><li>b</li></ol></li></ol>`
  - [ ] [WIP] 리스트 뒤 일반 텍스트 — `- a\n\t- b\nText`
  - [ ] [WIP] 스페이스 2칸 들여쓰기 = 탭 1개 동등성
- 미커버 (REQ-20260418-021 FR-05, FR-10 추가 대상):
  - [ ] [WIP] 앵커 텍스트 XSS 회귀 — `[<script>alert(1)</script>](https://x.com)` 입력 시 최종 DOM 에서 `<script>` 가 실행되지 않음을 어서트 (옵션 A/B/C 공통)
  - [ ] [WIP] 옵션 A 채택 시: `<a>` 내부 `**bold**`/`*em*`/`` `code` ``/`~~del~~` 가 정상 렌더 (inline 마크업 회귀 0)
  - [ ] [WIP] 옵션 A 채택 시: `[<script>...]` 입력이 `&lt;script&gt;` 로 출력되는 문자열 어서트 (파서 단위)
  - [ ] [WIP] 옵션 B 채택 시: sanitize 단위 테스트 — `[<script>...](https://x)` → `<script>` 텍스트화 (sanitizeHtml 단위)

> 관련 요구사항:
> - 20260417-multi-level-list "테스트 추가" 절
> - REQ-20260418-004 §10 수용 기준, §11 성공 지표 (테스트 +5 이상)
> - REQ-20260418-021 §10 수용 기준 (XSS 회귀 테스트 ≥1, inline 마크업 회귀 0)

## 8. 비기능 특성 (NFR Status)
| 항목 | 현재 상태 | 목표 (NFR) | 메모 |
|------|-----------|------------|------|
| 성능 | O(N * pass수) | 동일 | pass 가 늘면 선형 증가 |
| 정확성 | 평탄 리스트만 | 동일 타입 중첩 지원 (WIP) | CommonMark 호환은 비목표 |
| 번들 사이즈 | 외부 의존 0 | 동일 | 자체 구현 유지 |

## 9. 알려진 제약 / 이슈
- UL/OL 혼합 중첩 미지원 (탐지 pass 분리 구조의 한계). 통합 pass + `{tag, depth}` 스택으로 확장 필요.
- 느슨한 목록(빈 줄 포함), task list(`- [ ]`), 3단계 초과 depth 의 CommonMark 세부 규칙 미지원.
- 들여쓰기 혼용(탭+스페이스) 시 사용자가 의도한 depth 와 어긋날 위험.
- **HTML 출력 escape 미흡** — 이미지/앵커 tag 가 문자열 concat 으로 만들어져 `url`/`alt`/`title`/`href` 의 `<>`/`'`/`"`/`&` 가 이스케이프되지 않음. 후단 `sanitizeHtml` 으로 무해화하되 파서 단계 escape 보강은 별도 task.
  > 관련 요구사항: REQ-20260418-001 FR-07 (파서 레벨 escape, Should)
- **앵커 표시 텍스트(`text`) 파서 escape 결손** — `<a>` 안 inline 치환(`**`/`*`/`` ` ``/`~~`) 을 보존하기 위해 의도적으로 escape 미적용. 현재는 후단 sanitize 단독 방어 → 다층 방어 1겹 결손. 정책 결정은 §5.5 (옵션 A/B/C) 에 단일 출처로 기록.
  > 관련 요구사항: REQ-20260418-021 FR-01 ~ FR-10 (WIP)

## 10. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-18 | (pending) | 동일 타입 중첩 리스트 지원 — depth 메타데이터 부여 + 탐지 pass | 3, 5.3, 6, 7 |
| 2026-04-18 | (pending, REQ-20260418-004) | `bindListItem` 스택 알고리즘 재작성 (WIP) | 5.3.3, 5.4, 7 |
| 2026-04-18 | (pending, REQ-20260418-021) | §5.5 앵커 텍스트 escape 정책 신설 (옵션 A/B/C 비교 + 공통 필수 항목) + §7/§9 WIP 항목 추가 | 5.5, 7, 9 |

## 11. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260417-multi-level-list.md`
  - `specs/requirements/done/2026/04/18/20260418-sanitize-markdown-html-output.md` (FR-07 파서 escape 보강)
  - `specs/requirements/done/2026/04/18/20260418-markdown-bindlistitem-stack-rewrite.md` (§5.3.3 구현)
  - `specs/requirements/done/2026/04/18/20260418-markdown-anchor-text-escape-and-manual-smoke.md` (REQ-20260418-021, §5.5 정책 결정)
- 관련 컴포넌트 명세:
  - `specs/spec/green/common/sanitizeHtml-spec.md` (출력 후단 sanitize 의존; 옵션 B 채택 시 §6/§10 동기화)
- 테스트/스모크 문서:
  - `docs/testing/markdown-render-smoke.md` (§5.5 FR-06, FR-07 의 속성 escape 픽스처 영구화)
- 진행 중/예정 task: (planner 가 생성 예정)
- 외부 참고: CommonMark 0.30 (참조용, 100% 준수 비목표)
