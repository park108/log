# markdownParser `escapeHtmlAttr` ↔ sanitizeHtml DOMPurify 2단 방어 효능 시스템 불변식 — `<img>`/`<a>` attribute escape + `<a target='_blank'>` rel upgrade 계약

> **ID**: REQ-20260518-018
> **작성일**: 2026-05-18
> **상태**: Draft

## 개요
사용자 입력 markdown 이 DOM 으로 주입되기까지는 두 단의 보안 경계를 거친다 — (S1) `src/common/markdownParser.ts:7-15` `escapeHtmlAttr` 가 `<img>`/`<a>` emit 시점에 attribute value (`url`/`alt`/`title`/`href`) 의 5문자 (`&`, `<`, `>`, `"`, `'`) 를 HTML entity 로 변환하여 single-quoted attribute context 탈출을 차단하고, (S2) `src/common/sanitizeHtml.ts:37-54` `sanitizeHtml` 가 DOMPurify `ALLOWED_TAGS`/`ALLOWED_ATTR`/`ALLOWED_URI_REGEXP` 정책으로 정제하며 `afterSanitizeAttributes` hook 이 `<a target="_blank">` 의 `rel` 값을 `'noopener noreferrer'` 로 upgrade 한다. 두 단은 **defense-in-depth** 관계 — markdownParser 가 emit 한 `rel='noreferrer'` (`:315`) 는 sanitizeHtml hook (`sanitizeHtml.ts:28-32`) 이 `'noopener noreferrer'` 로 덮어쓰는 단조 강화 경로이며, 어느 한 단이 회피·우회 되어도 다른 단이 회귀를 차단한다. 본 req 는 1회성 진단 (특정 incident 사후 검토) 이 아니라 **반복 검증 가능한 상시 불변식** — (a) markdownParser 의 `<img>`/`<a>` emit 본문이 escape 함수 경유 + (b) sanitizeHtml 정책 토큰 단일 모듈 박제 + (c) `<a target="_blank">` rel upgrade 양방향 효능 — 을 시스템 계약으로 박제할 것을 요청한다. 본 req 는 결과 효능 (escape 호출 5+ hit + sanitize 단일 모듈 + rel upgrade 양방향) 만 박제하며, 발화 채널 (단위 테스트 / CI / pre-push) 선정 및 vacuous 발생 시 해소 수단 선택은 inspector/planner 영역.

## 배경
- HEAD `64d7432404fafd6e2b18db00dec9c2c91c9efa43` 실측.
- S1 단 — markdownParser escape 본문:
  - `src/common/markdownParser.ts:7-15` — `escapeHtmlAttr = (s: unknown): string => { ... .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }`. 5문자 HTML entity 변환 — single-quoted attribute context 의 탈출 문자 전부 차단.
  - `src/common/markdownParser.ts:6` 주석 — `"on top of sanitizeHtml at render time (REQ-20260418-001 FR-07)"`. defense-in-depth 의도 박제.
  - `src/common/markdownParser.ts:275-277` `<img>` emit — `"<img src='" + escapeHtmlAttr(url) + "' alt='" + escapeHtmlAttr(alt) + "' title='" + escapeHtmlAttr(title) + "' />"`. 3 호출.
  - `src/common/markdownParser.ts:313-315` `<a>` emit — `"<a href='" + escapeHtmlAttr(url) + "' title='" + escapeHtmlAttr(title) + "' target='_blank' rel='noreferrer'>" + text + "</a>"`. 2 호출.
  - escape 호출 누적: 5 hit (`grep -cE "escapeHtmlAttr\(" src/common/markdownParser.ts` = 5).
  - escape 정의 모듈 — `src/common/markdownParser.ts:7` 단일 (`grep -rn "const escapeHtmlAttr\s*=\|function escapeHtmlAttr" src` = 1 hit).
- S2 단 — sanitizeHtml 정책 본문:
  - `src/common/sanitizeHtml.ts:1-3` 주석 — `"단일 sanitize 모듈. markdownParser 산출 HTML 을 DOM 주입 직전 정제한다. // 정책은 이 파일에서만 변경한다 (FR-06). // 관련: REQ-20260418-001"`. 정책 단일 모듈 박제 의도.
  - `src/common/sanitizeHtml.ts:7-15` `ALLOWED_TAGS` — `['p', 'br', 'hr', 'strong', 'em', 'del', 'code', 'pre', 'blockquote', 'h1', ..., 'h6', 'ul', 'ol', 'li', 'a', 'img', 'span']`. 16 종 enum.
  - `src/common/sanitizeHtml.ts:17` `ALLOWED_ATTR` — `['href', 'src', 'alt', 'title', 'target', 'rel', 'class']`. 7 종 enum.
  - `src/common/sanitizeHtml.ts:20` `ALLOWED_URI_REGEXP` — `/^(https?:|mailto:|\/|#)/i`. `http(s)`/`mailto`/`relative`/`fragment` 4 prefix 허용 — `javascript:`/`data:`/`vbscript:` 등 5 종 위험 prefix 차단.
  - `src/common/sanitizeHtml.ts:24-34` `ensureHook` — `DOMPurify.addHook('afterSanitizeAttributes', (node) => { ... node.setAttribute('rel', 'noopener noreferrer'); })`. `<a target="_blank">` 매치 시 `rel='noopener noreferrer'` 강제. `hookRegistered = true` 멱등 가드.
  - `src/common/sanitizeHtml.ts:37-54` `sanitizeHtml(dirtyHtml)` 본문 — null/undefined/`window===undefined`/DOMPurify 부재 4 분기 short-circuit + `DOMPurify.sanitize(dirtyHtml, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP, ADD_ATTR: ['target', 'rel'], ADD_URI_SAFE_ATTR: ['target', 'rel'], KEEP_CONTENT: true, RETURN_TRUSTED_TYPE: false })` 단일 호출.
  - sanitize 정의 모듈 — `src/common/sanitizeHtml.ts` 단일 (`grep -rln "import DOMPurify\|from 'dompurify'" src` = 1 hit, `src/common/sanitizeHtml.ts:5`).
- 검증 fixture 위치:
  - `src/common/sanitizeHtml.test.ts:1-119` — OWASP XSS 10 대표 벡터 + edge case + allowed content pass-through. 특히 `:66-71` `"adds rel=noopener noreferrer to target=_blank anchor"` 가 hook upgrade 효능을 잠금.
  - `src/common/sanitizeHtml.test.ts:88-93` — `"is idempotent (double sanitize equals single)"` — sanitize 멱등 검증.
- 2단 정합 표 (HEAD `64d7432` 실측):
  | 단 | 위치 | 책임 | 호출/정의 수 |
  |----|------|------|-------------|
  | S1 | `src/common/markdownParser.ts:7` | attribute value escape (5문자) | 정의 1 + 호출 5 |
  | S2 | `src/common/sanitizeHtml.ts:5,7,17,20,24,37` | DOMPurify 정책 + hook + 4 short-circuit | 정의 1 |
  | hook | `src/common/sanitizeHtml.ts:28-32` | `<a target="_blank">` rel upgrade | hook 등록 1 (멱등) |
- 회귀 시나리오 (HEAD `64d7432` baseline PASS, 미래 변경 가능):
  - (R-1) markdownParser `<img>`/`<a>` emit 본문에서 escape 호출이 누락되거나 raw 문자열 보간 (예: `"<img src='" + url + "'>"`) 으로 회귀 — S2 가 ALLOWED_URI_REGEXP 로 `javascript:` 등을 차단하더라도 single-quoted attribute context 탈출 (예: `url = "x' onerror='alert(1)"`) 은 S1 부재 시 sanitize 단계 도달 전에 emit HTML 자체가 깨질 수 있음 (DOMPurify 가 깨진 HTML 을 fix-up 하더라도 의도 surface 분기).
  - (R-2) markdownParser 가 `rel='noreferrer'` 대신 `rel=''` 또는 `rel` 미지정 emit 으로 변경 — S2 hook 이 여전히 `noopener noreferrer` 로 upgrade 하지만, sanitizeHtml 미경유 경로 (예: 다른 모듈의 raw HTML 주입) 가 신설될 경우 회귀.
  - (R-3) `sanitizeHtml.ts` 의 `ALLOWED_URI_REGEXP` 가 `javascript:` 또는 `data:` prefix 를 허용으로 확장 — XSS 표면 즉시 노출. S1 escape 는 entity 변환만 담당하므로 javascript: prefix 자체는 escape 후에도 유효.
  - (R-4) `sanitizeHtml.ts` hook 이 `removeHook` 호출 또는 `hookRegistered` 가드 회귀로 멱등 깨짐 — 동일 hook 다중 등록 시 `rel` 속성 중첩 (`"noopener noreferrer noopener noreferrer"`) 회귀.
  - (R-5) DOMPurify dep 가 `dependencies` 에서 제거되거나 다른 sanitizer (sanitize-html, xss-filters) 로 swap — `src/common/sanitizeHtml.ts:5` import 변경 + 정책 토큰 호환성 미보장.
  - (R-6) markdownParser `<a>` emit 의 `target='_blank'` 가 제거되어 hook 트리거 0 — `<a>` 클릭 시 referrer leak 회귀 (S2 hook 의 효능 대상 없어짐).
  - (R-7) escape 함수가 `src/common/markdownParser.ts` 외 모듈로 이동·복제 (DRY 의도 또는 별 emitter 분기) — 정책 단일 모듈 박제 위반 + S1 정책 변경 시 다중 위치 동기 누락 위험.
- 선행 spec 영역:
  - `30.spec/green/common/sanitizeHtml.md` — inspector 박제 진행 중. 본 req 와의 분담: 본 req 는 **S1 ↔ S2 양단 연결 효능** (escape 호출 5+ hit + hook upgrade 양방향 + 정책 모듈 단일성) 의 cross-surface 박제, green sanitizeHtml.md 는 **S2 단 내부 정책 enum** (ALLOWED_TAGS/ATTR/URI_REGEXP 토큰 + DOMPurify 호출 계약) 박제. 직교.
  - `30.spec/green/common/markdownParser.md` — `bindListItem` 알고리즘 속성 박제. 본 req 의 `<img>`/`<a>` emit 단계와 별 단계 (list grouping). 직교.
  - `30.spec/blue/components/common.md:30` — `copyToClipboard(text)` 의 navigator.clipboard.writeText 래퍼만 박제. 본 req 의 markdown 단계 외.
  - `30.spec/blue/components/common.md:56` — `"sanitizeHtml.js — DOMPurify 기반 살균"` 1줄 박제. 본 req 의 2단 효능 + hook upgrade + escape 5 hit cross-surface 박제 부재.
- 외부 출처:
  - **OWASP XSS Prevention Cheat Sheet** — "RULE #2: Attribute Encode Before Inserting Untrusted Data into HTML Common Attributes" — `&`, `<`, `>`, `"`, `'`, `` ` ``, `=` 등 escape 권고. 본 req 의 S1 5 문자 정책 (`& < > " '`) 은 single-quoted attribute context 한정 부분집합 — markdownParser 가 single-quote 로 attribute 를 감싸므로 `'` 가 핵심 escape.
  - **MDN — `target="_blank"` 와 `rel="noopener noreferrer"`** — `noopener` 가 새 탭의 `window.opener` 차단 (reverse tabnabbing), `noreferrer` 가 referrer 헤더 차단 + opener 차단 (noopener 포함). 두 토큰 동시 부여가 안전 기본값.
  - **DOMPurify 공식** — `addHook('afterSanitizeAttributes', fn)` 의 attribute 정제 후 hook 호출 계약. hook 등록은 모듈 로드 시 1회 권장 (멱등성은 caller 책임).
- 본 req 가 박제하지 않는 것 (RULE-07 정합):
  - escape 함수의 5문자 외 추가 escape (예: `` ` ``, `=`) 도입 결정 — 별 task / 정책 변경.
  - sanitizeHtml `ALLOWED_TAGS`/`ALLOWED_ATTR`/`ALLOWED_URI_REGEXP` 토큰 enum 본문 (개별 16/7 enum 자체) — `30.spec/green/common/sanitizeHtml.md` 영역.
  - markdownParser 의 다른 emit 단계 (heading / code block / list / blockquote) 의 escape 적용 여부 — 본 req 는 `<img>`/`<a>` 한정.
  - DOMPurify 메이저 bump 결정 — `dependency-bump-gate` 직교.
  - `escapeHtmlAttr` 의 export 노출 결정 (현재 module-private const). 본 req 는 단일 모듈 정의 박제만.
  - 다른 sanitizer (sanitize-html / xss-filters) 로의 swap 정책 — 수단 중립.
  - `<a target="_blank">` 자체의 UX 정책 (외부 링크 새 탭 열기 결정) — 별 axis.

## 목표
- In-Scope:
  - `src/common/markdownParser.ts:7` `escapeHtmlAttr` 정의가 단일 모듈에서만 선언되며, `<img>`/`<a>` emit 본문에서 호출 카운트 ≥ 5 임이 박제.
  - `src/common/sanitizeHtml.ts` 가 DOMPurify import + 정책 토큰 + hook 등록의 **단일 모듈** 임이 박제 (DOMPurify import 1 hit).
  - `afterSanitizeAttributes` hook 이 `<a target="_blank">` 에 대해 `rel='noopener noreferrer'` 로 upgrade 한다 — markdownParser emit `rel='noreferrer'` 와 sanitize hook 출력 `rel='noopener noreferrer'` 의 양방향 정합 효능.
  - hook 등록의 멱등성 (`hookRegistered` 가드) 박제 — 다중 호출 시 hook 중첩 0.
  - `<a target="_blank">` 매치 시 `rel` 속성이 **반드시** `'noopener noreferrer'` 로 emit — sanitize fixture (`sanitizeHtml.test.ts:66-71`) referer 박제.
- Out-of-Scope:
  - escape 함수 5문자 enum 본문 변경 결정 (예: `` ` `` 추가) — 별 task / 정책 변경.
  - `ALLOWED_TAGS`/`ALLOWED_ATTR`/`ALLOWED_URI_REGEXP` enum 토큰 자체의 박제 — `30.spec/green/common/sanitizeHtml.md` 영역.
  - markdownParser 다른 emit (heading / code / list) escape 도입 — 별 단계.
  - DOMPurify 메이저 bump 결정 — `dependency-bump-gate` 직교.
  - `escapeHtmlAttr` export / 다른 모듈 재사용 결정 — 수단 중립.
  - `<a target="_blank">` UX 정책 (외부 링크 새 탭 강제 여부) — 별 axis.

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `src/common/markdownParser.ts:7` `escapeHtmlAttr` 정의가 **단일 모듈** 에서만 선언 — `grep -rnE "const escapeHtmlAttr\s*=\|function escapeHtmlAttr" src` = 1 hit. 정의 분산 (별 모듈 복제 또는 export 후 다른 모듈 재구현) 은 spec 갱신 신호. | Must |
| FR-02 | `escapeHtmlAttr` 호출 카운트 ≥ 5 — `<img src/alt/title>` 3 호출 (`:275-277`) + `<a href/title>` 2 호출 (`:313-315`). `grep -cE "escapeHtmlAttr\(" src/common/markdownParser.ts` ≥ 5. 호출 누락 (raw 문자열 보간 회귀) 은 (R-1) 회귀 신호. | Must |
| FR-03 | `src/common/sanitizeHtml.ts` 가 DOMPurify import + 정책 토큰 + hook 등록의 **단일 모듈** — `grep -rln "import DOMPurify\|from 'dompurify'" src` = 1 hit (`src/common/sanitizeHtml.ts:5`). dompurify 다중 import (별 모듈 직접 호출) 은 정책 단일 모듈 박제 위반 신호. | Must |
| FR-04 | `afterSanitizeAttributes` hook 이 `<a target="_blank">` 매치 시 `rel='noopener noreferrer'` 로 emit — sanitize 출력 단정. fixture: `src/common/sanitizeHtml.test.ts:66-71` `"adds rel=noopener noreferrer to target=_blank anchor"` (HEAD `64d7432` PASS). | Must |
| FR-05 | hook 등록 멱등 — `hookRegistered = true` 가드 (`src/common/sanitizeHtml.ts:24,33`) 가 다중 `ensureHook()` 호출 시 hook 추가 등록 0. `removeHook` 호출 부재 — `grep -nE "removeHook" src/common/sanitizeHtml.ts` = 0 hit. | Must |
| FR-06 | markdownParser 의 `<a>` emit 본문이 `target='_blank' rel='noreferrer'` 로 emit (`src/common/markdownParser.ts:315`) — sanitize 단의 hook upgrade 입력 baseline. `grep -nE "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` ≥ 1 hit. (markdownParser 단의 rel 부여는 sanitize 미경유 raw HTML 주입 경로의 fall-back 보호.) | Must |
| FR-07 | sanitize 멱등 — `sanitizeHtml(sanitizeHtml(x))` = `sanitizeHtml(x)` (idempotence). fixture: `src/common/sanitizeHtml.test.ts:88-93` PASS. 본 효능은 sanitize 가 자체 출력을 재입력 받아도 새로 escape/strip 하지 않음을 보장. | Should |
| FR-08 | 본 spec 의 박제는 `dompurify` 메이저 bump 자체를 강제하지 않는다 — bump 후 hook API (`addHook('afterSanitizeAttributes', ...)`) signature 변경 시 spec 갱신 신호. (dependency-bump-gate 와 간접 결합) | Should |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 검증 가능성 | 본 req 의 모든 FR 은 `src/common/markdownParser.ts` / `src/common/sanitizeHtml.ts` / `src/common/sanitizeHtml.test.ts` 의 정적 read + `grep` 단일 명령으로 검증 가능. 외부 네트워크 의존 없음. FR-04/FR-07 은 vitest fixture 가 잠금. |
| NFR-02 | 시점 비의존 | 본 req 의 효능 평서문은 특정 dompurify 메이저 (3.x) / DOMPurify hook API signature / 특정 React 메이저에 무관 — baseline 수치는 §스코프 규칙 grep-baseline 에만 박제. 효능 표현은 "escape 단일 모듈 + 호출 ≥ 5 + sanitize 단일 모듈 + hook rel upgrade" 형식. |
| NFR-03 | 수단 중립 | 본 req 는 escape 5문자 enum 확장 결정 / DOMPurify ↔ 다른 sanitizer swap 결정 / hook 멱등 구현 수단 (`hookRegistered` boolean vs Set vs WeakMap) 에 라벨 ("기본값" / "권장" / "default" / "best practice" / "root cause") 을 박제하지 않는다. |
| NFR-04 | 차원 분리 | 본 req 는 S1 ↔ S2 cross-surface 효능 만 박제하며, (a) S2 내부 정책 enum 본문 (REQ-20260418-001 영역 / `30.spec/green/common/sanitizeHtml.md`), (b) markdownParser 의 list grouping 알고리즘 (`30.spec/green/common/markdownParser.md`), (c) `copyToClipboard` 의 navigator.clipboard 표면 (`components/common.md`), (d) `<a target="_blank">` UX 정책 (별 axis) 의 축에 비박제. |
| NFR-05 | 멱등성 | 본 req 의 게이트는 `src/common/markdownParser.ts` / `src/common/sanitizeHtml.ts` 내용 동일 상태에서 반복 적용 시 동일 결과 (RULE-02 멱등 정합). FR-05 / FR-07 자체가 sanitize 단의 멱등 효능 박제. |
| NFR-06 | 자동 추종 | 본 spec 의 cross-surface 효능 박제는 escape 호출 카운트 baseline + sanitize import baseline + hook fixture referer 박제로 표현되며, 모듈 분할 / 함수 이동 / hook API 변경 시 baseline 변경 자체가 fail 신호. 특정 dompurify 메이저 번호 / 특정 hook signature 의 본문 효능 평서문 하드코딩 부재. |

## 수용 기준
- [ ] Given `src/common/markdownParser.ts:7`, When `grep -rnE "const escapeHtmlAttr\s*=\|function escapeHtmlAttr" src` 실행, Then 1 hit (단일 모듈 정의 박제).
- [ ] Given `src/common/markdownParser.ts:275-277,313-315`, When `grep -cE "escapeHtmlAttr\(" src/common/markdownParser.ts` 실행, Then ≥ 5 hit (`<img>` 3 + `<a>` 2 호출 — defense-in-depth S1 단 활성).
- [ ] Given `src/common/sanitizeHtml.ts:5`, When `grep -rlnE "import DOMPurify\|from 'dompurify'" src` 실행, Then 1 hit (sanitize 단일 모듈 박제 — S2 단 단일 진입).
- [ ] Given `src/common/sanitizeHtml.ts:24-34` hook 등록, When `grep -nE "addHook\('afterSanitizeAttributes'" src/common/sanitizeHtml.ts` 실행, Then 1 hit (hook 1회 등록 — FR-05 멱등 가드).
- [ ] Given `src/common/sanitizeHtml.ts`, When `grep -nE "removeHook" src/common/sanitizeHtml.ts` 실행, Then 0 hit (hook 해제 부재 — 멱등 유지).
- [ ] Given `src/common/sanitizeHtml.test.ts:66-71`, When vitest 실행, Then `"adds rel=noopener noreferrer to target=_blank anchor"` PASS (FR-04 hook upgrade 효능 잠금).
- [ ] Given `src/common/sanitizeHtml.test.ts:88-93`, When vitest 실행, Then `"is idempotent (double sanitize equals single)"` PASS (FR-07 sanitize 멱등).
- [ ] Given `src/common/markdownParser.ts:315`, When `grep -nE "target='_blank' rel='noreferrer'" src/common/markdownParser.ts` 실행, Then ≥ 1 hit (FR-06 markdownParser 단 fall-back 보호).
- [ ] Given 미래 PR (예: escape 함수가 다른 모듈로 export 되어 `src/common/escapeAttr.ts` 신설), When 동일 grep 실행, Then 정의 hit ≥ 2 — 본 spec FR-01 갱신 신호로 fail.

## 참고
- **현장 근거 (HEAD=`64d7432404fafd6e2b18db00dec9c2c91c9efa43`, 2026-05-18 실측)**:
  - `src/common/markdownParser.ts:7-15` — `escapeHtmlAttr` 정의 (5문자 entity 변환).
  - `src/common/markdownParser.ts:6` — `"on top of sanitizeHtml at render time (REQ-20260418-001 FR-07)"` defense-in-depth 의도 주석.
  - `src/common/markdownParser.ts:275-277` — `<img>` emit + escape 3 호출.
  - `src/common/markdownParser.ts:313-315` — `<a>` emit + escape 2 호출 + `target='_blank' rel='noreferrer'`.
  - `src/common/sanitizeHtml.ts:5` — `import DOMPurify from 'dompurify'`.
  - `src/common/sanitizeHtml.ts:7-15` — `ALLOWED_TAGS` 16 종 enum.
  - `src/common/sanitizeHtml.ts:17` — `ALLOWED_ATTR` 7 종 enum.
  - `src/common/sanitizeHtml.ts:20` — `ALLOWED_URI_REGEXP /^(https?:|mailto:|\/|#)/i`.
  - `src/common/sanitizeHtml.ts:24-34` — `ensureHook` + `hookRegistered` 멱등 가드 + `addHook('afterSanitizeAttributes', ...)` `rel='noopener noreferrer'` upgrade.
  - `src/common/sanitizeHtml.ts:37-54` — `sanitizeHtml` 진입점 + 4 short-circuit + DOMPurify.sanitize 호출.
  - `src/common/sanitizeHtml.test.ts:66-71` — `"adds rel=noopener noreferrer to target=_blank anchor"` PASS fixture.
  - `src/common/sanitizeHtml.test.ts:88-93` — `"is idempotent (double sanitize equals single)"` PASS fixture.
  - `package.json:dependencies.dompurify` — `"^3.4.0"`.
- **선행 spec / req 직교 참조**:
  - `30.spec/green/common/sanitizeHtml.md` (inspector 박제 진행) — S2 단 내부 정책 enum 본문 박제. 본 req 의 S1 ↔ S2 cross-surface 효능 축과 직교.
  - `30.spec/green/common/markdownParser.md` — `bindListItem` stack-based grouping 알고리즘. 본 req 의 `<img>`/`<a>` emit 단계와 별 단계.
  - `30.spec/blue/components/common.md:56` — `"sanitizeHtml.js — DOMPurify 기반 살균"` 1줄 박제. 본 req 의 cross-surface 효능 미박제 — 본 req 가 그 공백 박제.
  - `60.done/2026/05/17/req/20260517-deleted-spec-restore-batch-2-7.md` (REQ-076) — sanitizeHtml + markdownParser spec 재발행 일괄. 본 req 와 박제 영역 분담 (REQ-076 은 각 모듈 내부 정책 enum, 본 req 는 두 모듈 cross-surface 효능).
  - REQ-20260418-001 (`60.done/...`) — markdownParser → sanitizeHtml 단일 모듈 정책 원전. 본 req 의 cross-surface 효능 박제의 의미적 기반.
- **외부 레퍼런스**:
  - OWASP XSS Prevention Cheat Sheet — Attribute Encode Before Inserting Untrusted Data: `https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html`.
  - MDN — `target="_blank"` 와 `rel="noopener noreferrer"`: `https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#target`.
  - DOMPurify 공식 — `addHook('afterSanitizeAttributes', fn)` API: `https://github.com/cure53/DOMPurify`.
- HEAD: `64d7432404fafd6e2b18db00dec9c2c91c9efa43` (실측 시점, 2026-05-18).
