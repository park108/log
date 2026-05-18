# `src/common/sanitizeHtml.ts` — ALLOWED_* 단일 모듈 정책 + DOM 주입 전 sanitize 경유 불변식

> **위치**: `src/common/sanitizeHtml.ts` 의 `ALLOWED_TAGS` / `ALLOWED_ATTR` / `ALLOWED_URI_REGEXP` 정책 상수 + `sanitize` (또는 모듈 default export) 진입점 + `ensureHook` 멱등 가드 (`@:24-34`) + `afterSanitizeAttributes` rel upgrade 본문.
> **관련 요구사항**: REQ-20260418-001 NFR-01, REQ-20260517-076 FR-02, REQ-20260518-018 (S2 단 sanitize 단일 모듈 + hook upgrade 양방향 + 멱등 + cross-surface defense-in-depth)
> **최종 업데이트**: 2026-05-18 (by inspector — 84차 tick / REQ-018 흡수: S2 단 DOMPurify import 단일 모듈 + hook upgrade `rel='noreferrer'` → `'noopener noreferrer'` 양방향 단조 강화 + `hookRegistered` 멱등 + `removeHook` 부재 + sanitize 멱등 fixture 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`893cdea`).

## 역할
`markdownParser` 산출 HTML 의 **DOM 주입 직전 sanitize 경유** + **ALLOWED_TAGS / ALLOWED_ATTR / ALLOWED_URI_REGEXP 정책 상수의 단일 모듈 (`src/common/sanitizeHtml.ts`) 박제** 두 축 시스템 불변식. 의도적으로 하지 않는 것: DOMPurify 의 다른 옵션 (예: `WHOLE_DOCUMENT`, `SANITIZE_DOM`) 정책 (필요 시 별 spec), sanitize 호출 후 추가 변환 (caller 영역), sanitize 결과의 React `dangerouslySetInnerHTML` 사용 패턴 (caller 영역), DOMPurify 라이브러리 버전 정합 (`runtime-dep-version-coherence.md` 영역), XSS 회귀 fixture 본문 (`src/common/sanitizeHtml.test.ts` 영역 — 본 spec 은 fixture pointer 만 박제).

## 공개 인터페이스
- `sanitize(input: string): string` — markdownParser 산출 HTML 을 정제. `DOMPurify.sanitize(input, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP, ... })` 호출.
- 모듈 내부:
  - `ALLOWED_TAGS: string[]` — 허용 태그 enum (18 항목 — `p` / `br` / `hr` / `strong` / `em` / `del` / `code` / `pre` / `blockquote` / `h1`~`h6` / `ul` / `ol` / `li` / `a` / `img` / `span`).
  - `ALLOWED_ATTR: string[]` — 허용 속성 enum (7 항목 — `href` / `src` / `alt` / `title` / `target` / `rel` / `class`).
  - `ALLOWED_URI_REGEXP: RegExp` — 허용 URI scheme (`/^(https?:|mailto:|\/|#)/i` — `javascript:` / `data:` / `vbscript:` 차단).
  - `afterSanitizeAttributes` 훅 — `<a target="_blank">` 에 `rel="noopener noreferrer"` 자동 보정 (멱등 — 모듈 로드 시 1회 등록).

세 상수는 **internal** (export 금지) — 정책 변경은 본 모듈에서만. 외부 모듈이 ALLOWED_* 를 import 하면 단일 모듈 정책 위반.

## 동작
1. **(I1) 단일 모듈 정책 박제**: `ALLOWED_TAGS` / `ALLOWED_ATTR` / `ALLOWED_URI_REGEXP` 3 상수는 **`src/common/sanitizeHtml.ts` 한정** 으로 정의. 다른 모듈은 이 정책을 인용·재정의·우회하지 않는다. `grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src` 의 결과가 `src/common/sanitizeHtml.{ts,test.ts}` 한정.
2. **(I2) DOM 주입 직전 sanitize 경유 계약**: markdownParser 산출 HTML 을 DOM 에 주입하는 모든 caller (React `dangerouslySetInnerHTML` / 직접 DOM 조작 / SSR HTML 출력 등) 는 `sanitize(input)` 결과만 사용. raw markdownParser 결과를 DOM 에 직접 주입 금지.
3. **(I3) URI scheme 화이트리스트 계약**: `ALLOWED_URI_REGEXP` 는 `https?:` / `mailto:` / 상대경로 (`/`) / 프래그먼트 (`#`) 만 허용. `javascript:` / `data:` / `vbscript:` 등 활성 콘텐츠 scheme 차단.
4. **(I4) `<a target="_blank">` rel 자동 보정**: 모듈 로드 시 1회 `afterSanitizeAttributes` 훅 등록 (멱등 — `hookRegistered` 가드). `<a target="_blank">` 발견 시 `rel="noopener noreferrer"` 자동 부여. 훅 해제 (`removeHook`) 금지.
5. **(I5) OWASP XSS Filter Evasion 회귀 fixture pointer**: 회귀 fixture 는 `src/common/sanitizeHtml.test.ts` (별 모듈) 에 박제. 본 spec 은 fixture **존재 + 10 대표 벡터 (OWASP XSS Filter Evasion Cheat Sheet) 커버** 두 사실만 박제. 벡터 본문 enumeration 은 fixture referer (테스트 spec) 위임.
6. **(I6) 정책 변경 단일 진입점**: 신규 태그 / 속성 / URI scheme 도입 시 (a) `ALLOWED_*` 본문 수정 + (b) 회귀 fixture (`sanitizeHtml.test.ts`) 갱신 동일 PR 정합. 두 파일 외부에서의 정책 우회 금지.
7. **(I7) S2 단 DOMPurify import 단일 모듈 계약**: DOMPurify import 는 `src/common/sanitizeHtml.ts:5` 한정 — `grep -rln "import DOMPurify\|from 'dompurify'" src` = 1 hit. 다른 모듈 직접 import (예: 별 sanitizer wrapper, 별 도메인의 직접 호출) 금지 — sanitize 정책 단일 진입점 박제. dompurify ↔ 다른 sanitizer (sanitize-html / xss-filters) 로 swap 결정은 본 spec 비박제 (수단 중립) — swap 시 본 게이트 baseline 변경 자체가 spec 갱신 신호.
8. **(I8) hook upgrade `<a target='_blank'>` rel 양방향 단조 강화 계약**: `afterSanitizeAttributes` hook (`:24-34`) 이 `<a target="_blank">` 매치 시 `rel='noopener noreferrer'` 로 setAttribute. markdownParser 가 emit 한 `rel='noreferrer'` (`markdownParser.ts:315`) 는 본 hook 이 `rel='noopener noreferrer'` 로 덮어쓰는 **단조 강화 경로** — `noreferrer` 토큰은 양 단 모두 보존, `noopener` 토큰은 S2 단에서만 추가. fixture (`sanitizeHtml.test.ts:66-71` `"adds rel=noopener noreferrer to target=_blank anchor"`) 가 효능 잠금. markdownParser 단 fall-back `rel='noreferrer'` 부재 시에도 S2 hook 이 `<a target="_blank">` 발견 즉시 양방향 정합 유지.
9. **(I9) hook 등록 멱등 + `removeHook` 부재 계약**: `ensureHook()` (`:24-34`) 가 `hookRegistered` boolean 가드로 다중 호출 시 hook 추가 등록 0 — `grep -nE "addHook\('afterSanitizeAttributes'" src/common/sanitizeHtml.ts` = 1 hit. `removeHook` 호출 부재 — `grep -nE "removeHook" src/common/sanitizeHtml.ts` = 0 hit. 멱등 깨짐 시 (예: `hookRegistered` 가드 제거 또는 `removeHook` 후 재등록) `rel` 속성 중첩 (`"noopener noreferrer noopener noreferrer"`) 회귀 표면. 가드 수단 (`hookRegistered` boolean / Set / WeakMap) 은 수단 중립 — 멱등 효능만 박제.
10. **(I10) sanitize 멱등 계약**: `sanitizeHtml(sanitizeHtml(x))` = `sanitizeHtml(x)` — 동일 입력 반복 sanitize 시 추가 escape / strip 0. fixture (`sanitizeHtml.test.ts:88-93` `"is idempotent (double sanitize equals single)"`) 가 효능 잠금. 본 효능은 sanitize 가 자체 출력을 재입력 받아도 새로 escape/strip 하지 않음을 보장 — caller 측 sanitize 중복 호출 (방어 코드) 안전성 baseline.
11. **(I11) cross-surface 2단 방어 defense-in-depth 계약**: S1 단 (`markdownParser.md` (I8)~(I10)) escape + S2 단 (본 spec (I1)(I3)(I4)(I7)(I8)(I9)) sanitize 양 단이 **독립적으로** XSS 회귀를 차단 — 어느 한 단이 회피·우회 되어도 다른 단이 차단. (a) markdownParser escape 누락 → DOMPurify 가 single-quoted attribute context 손상 emit 을 fix-up + ALLOWED_URI_REGEXP 가 `javascript:` 차단; (b) sanitize 우회 raw HTML 주입 → markdownParser 단 `escapeHtmlAttr` 가 5 문자 entity 변환 + `<a>` `rel='noreferrer'` fall-back 가 referrer leak 방어. 양 단 동시 회귀 시에만 XSS 진입 — 단 한 단 회귀 시 fail-safe 활성.

### 회귀 중점
- 외부 모듈이 `ALLOWED_TAGS` 등을 `export` 추가 후 import 하면 (I1) 위반 — 정책 분기 위험.
- caller 가 `markdownParser` 결과를 sanitize 우회 후 `dangerouslySetInnerHTML` 직접 주입 시 (I2) 위반 — XSS 진입 표면.
- `ALLOWED_URI_REGEXP` 에 `javascript:` / `data:` 추가 시 (I3) 위반 — 활성 콘텐츠 진입 표면.
- `afterSanitizeAttributes` 훅 본문에서 `<a target="_blank">` rel 자동 보정 로직 제거 시 (I4) 위반 — `noopener noreferrer` 누락으로 tabnabbing 표면.
- 신규 태그 도입 시 fixture 갱신 누락 (I6) 위반 — 회귀 감지 누락.
- DOMPurify 가 `dependencies` 에서 제거되거나 다른 sanitizer 로 swap 시 (I7) 위반 — `src/common/sanitizeHtml.ts:5` import 변경 + 정책 토큰 호환성 미보장 → spec 갱신 신호 (수단 중립 박제).
- markdownParser 단 `rel='noreferrer'` 제거 → S2 hook 이 여전히 upgrade 하나, sanitize 미경유 raw HTML 주입 경로의 fall-back 무력화 시 (I8) 위반 — cross-surface 양방향 정합 깨짐.
- `hookRegistered` 가드 제거 또는 `removeHook` 호출 도입 시 (I9) 위반 — hook 중첩 등록으로 `rel` 속성 중첩 (`"noopener noreferrer noopener noreferrer"`) 회귀.
- sanitize 가 자체 출력 재입력 시 추가 escape / strip (예: DOMPurify 메이저 bump 의 정책 변경) 발생 시 (I10) 위반 — caller 측 방어 코드 (sanitize 중복 호출) 비정합.
- S1 단 (markdownParser escape) + S2 단 (sanitize 정책) 동시 회귀 시 (I11) 위반 — defense-in-depth 양 단 동시 무력화 = XSS 진입 (단 한 단 회귀 만으로는 fail-safe 활성).

## 의존성
- 내부: `src/common/sanitizeHtml.ts` (단일 진입점), `src/common/markdownParser.ts` (입력), `src/common/sanitizeHtml.test.ts` (회귀 fixture).
- 외부: `dompurify` (devDep / dep — `runtime-dep-version-coherence.md` 영역).
- 역의존 (사용처): markdownParser 결과를 DOM 에 주입하는 모든 caller (Log / Comment 등 도메인 모듈 — caller 측은 sanitize 호출 의무).
- 직교: `markdownParser.md` (파싱 알고리즘 영역), `runtime-dep-version-coherence.md` (dompurify 버전 정합).

## 테스트 현황
- [x] (I1) 단일 모듈 정책: `grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\."` → 0 hit. HEAD=`893cdea` 실측 PASS.
- [ ] (I2) DOM 주입 직전 sanitize 경유: caller 측 게이트 (별 task 위임 — 정적 분석 / lint rule 후보).
- [x] (I3) URI scheme 화이트리스트: `grep -nE "ALLOWED_URI_REGEXP" src/common/sanitizeHtml.ts` → 1 hit @:20 (`/^(https?:|mailto:|\/|#)/i`). 활성 콘텐츠 scheme (`javascript:` / `data:` / `vbscript:`) 0 hit. HEAD=`893cdea` 실측 PASS.
- [x] (I4) `<a target="_blank">` rel 자동 보정: `grep -nE "afterSanitizeAttributes|noopener noreferrer" src/common/sanitizeHtml.ts` → 2+ hits (훅 등록 + rel 부여). HEAD=`893cdea` 실측 PASS.
- [ ] (I5) OWASP XSS Filter Evasion fixture: `src/common/sanitizeHtml.test.ts` 존재 + 10 대표 벡터 박제. fixture pointer 박제 (본 spec) — fixture 본문 검증은 별 task / 별 spec.
- [x] (I6) 정책 변경 단일 진입점: 본 spec 박제로 PR 정합 계약 명시. HEAD=`893cdea` 실측 PASS (정책 변경 0 이벤트).
- [x] (I7) DOMPurify import 단일 모듈: `grep -rln "import DOMPurify\|from 'dompurify'" src` → 1 hit (`src/common/sanitizeHtml.ts:5`). HEAD=`64d7432` 실측 PASS. REQ-018 흡수 시점.
- [x] (I8) hook upgrade `<a target='_blank'>` rel 양방향: fixture `src/common/sanitizeHtml.test.ts:66-71` `"adds rel=noopener noreferrer to target=_blank anchor"` HEAD=`64d7432` PASS. markdownParser emit `rel='noreferrer'` → sanitize 후 `rel='noopener noreferrer'` 단조 강화 정합. REQ-018 흡수 시점.
- [x] (I9) hook 멱등 + `removeHook` 부재: `grep -nE "addHook\('afterSanitizeAttributes'" src/common/sanitizeHtml.ts` = 1 hit (`:30`) + `grep -nE "removeHook" src/common/sanitizeHtml.ts` = 0 hit. `hookRegistered` 가드 `:24,33` 박제. HEAD=`64d7432` 실측 PASS. REQ-018 흡수 시점.
- [x] (I10) sanitize 멱등: fixture `src/common/sanitizeHtml.test.ts:88-93` `"is idempotent (double sanitize equals single)"` HEAD=`64d7432` PASS. REQ-018 흡수 시점.
- [x] (I11) cross-surface 2단 방어 baseline: S1 단 `markdownParser.md` (I8)~(I10) + S2 단 본 spec (I1)(I3)(I4)(I7)(I8)(I9) 양 단 독립 박제 완료. HEAD=`64d7432` 실측 PASS (양 단 baseline 모두 활성). REQ-018 흡수 시점.

## 수용 기준
- [x] (Must, FR-02-a) ALLOWED_TAGS / ALLOWED_ATTR / ALLOWED_URI_REGEXP 3 상수 단일 모듈 박제 — §동작 (I1) + grep 0 hit 게이트.
- [ ] (Must, FR-02-b) markdownParser 산출 HTML 의 DOM 주입 직전 sanitize 경유 — caller 측 게이트 (별 task 위임 — lint rule / 정적 분석).
- [ ] (Must, FR-02-c) OWASP XSS Filter Evasion 10 대표 벡터 회귀 fixture pointer — `src/common/sanitizeHtml.test.ts` referer 박제 (본 spec §동작 I5).
- [x] (Should) URI scheme 화이트리스트 + `<a target="_blank">` rel 자동 보정 — §동작 (I3)(I4) 박제.
- [x] (Must, 범위 제한) DOMPurify 다른 옵션 / 라이브러리 버전 / caller 측 사용 패턴은 본 게이트 범위 밖.
- [x] (Must, REQ-018 FR-03) DOMPurify import 단일 모듈 — §동작 (I7) + grep 1 hit 게이트 박제.
- [x] (Must, REQ-018 FR-04) hook upgrade `<a target='_blank'>` rel='noopener noreferrer' — §동작 (I8) + fixture `sanitizeHtml.test.ts:66-71` referer 박제.
- [x] (Must, REQ-018 FR-05) hook 멱등 + `removeHook` 부재 — §동작 (I9) + grep 1 hit (addHook) + 0 hit (removeHook) 게이트 박제.
- [x] (Should, REQ-018 FR-07) sanitize 멱등 — §동작 (I10) + fixture `sanitizeHtml.test.ts:88-93` referer 박제.
- [x] (Must, REQ-018 cross-surface) S1 단 (markdownParser) + S2 단 (본 spec) 2단 defense-in-depth — §동작 (I11) + 양 spec baseline 정합 박제.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`893cdea`, 2026-05-17):
  - `grep -nE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src/common/sanitizeHtml.ts` → 7 hits in 1 file (3 정의 @:7,17,20 + 4 사용 @:45-47 + 인용 @:49). 단일 모듈 정합 OK.
  - `grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\."` → **0 hit**. (I1) 단일 모듈 정책 PASS.
  - `grep -nE "afterSanitizeAttributes|noopener noreferrer" src/common/sanitizeHtml.ts` → 2+ hits (훅 등록 @:30 + rel 부여 본문). (I4) PASS.
  - `grep -rE "javascript:|data:.*html|vbscript:" src/common/sanitizeHtml.ts` → 0 hit (활성 콘텐츠 scheme 진입 0). (I3) 강화.
- **grep-baseline (REQ-018 흡수)** (HEAD=`64d7432`, 2026-05-18):
  - `grep -rln "import DOMPurify\|from 'dompurify'" src` → 1 hit (`src/common/sanitizeHtml.ts:5`). (I7) DOMPurify import 단일 모듈 PASS.
  - `grep -nE "addHook\('afterSanitizeAttributes'" src/common/sanitizeHtml.ts` → 1 hit (`:30`). (I9) hook 1회 등록 PASS.
  - `grep -nE "removeHook" src/common/sanitizeHtml.ts` → 0 hit. (I9) `removeHook` 부재 PASS.
  - `grep -nE "hookRegistered" src/common/sanitizeHtml.ts` → 2 hits (`:24` 가드 + `:33` 설정). (I9) 멱등 가드 박제.
  - fixture pointer: `src/common/sanitizeHtml.test.ts:66-71` (FR-04 hook upgrade) + `:88-93` (FR-07 sanitize 멱등) — 두 fixture HEAD=`64d7432` PASS.
- **rationale**: (I1)(I3)(I4)(I6) 본 spec 박제 시점 PASS — 즉시 [x]. (I2) caller 측 게이트는 별 task 위임 (lint rule / 정적 분석 후보). (I5) fixture pointer 박제 — fixture 본문 검증은 별 spec (`src/common/sanitizeHtml.test.ts` referer). (I7)(I8)(I9)(I10) REQ-018 흡수 — S2 단 import 단일 모듈 + hook upgrade 양방향 + 멱등 + sanitize 멱등 4 게이트. (I11) cross-surface 2단 방어 baseline — `markdownParser.md` (I8)~(I10) S1 단 + 본 spec (I1)(I3)(I4)(I7)(I8)(I9) S2 단 양방향 정합 박제 (양 spec baseline 동시 활성 = defense-in-depth 활성).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — `src/common/sanitizeHtml.ts` 단일 모듈 정책 + DOM 주입 직전 sanitize 경유 + URI scheme 화이트리스트 + `<a target="_blank">` rel 자동 보정 + OWASP fixture pointer + 정책 변경 단일 진입점 6 축 (I1~I6) 게이트. baseline: ALLOWED_* 단일 모듈 정합 0 hit (외부 사용) / 18 ALLOWED_TAGS / 7 ALLOWED_ATTR / URI scheme 4 enum. 원전 REQ-20260418-001 NFR-01 보존. | all |
| 2026-05-18 | inspector 84차 tick (Phase 2, REQ-20260518-018 흡수) / pending | S2 단 sanitize cross-surface 효능 5 축 흡수 — (I7) DOMPurify import 단일 모듈 + (I8) hook upgrade 양방향 단조 강화 + (I9) hook 멱등 + `removeHook` 부재 + (I10) sanitize 멱등 + (I11) cross-surface 2단 방어 baseline. 양 spec 분담: `markdownParser.md` = S1 단 escape + S1↔S2 baseline literal / 본 spec = S2 단 + hook upgrade + 멱등. baseline (HEAD=`64d7432`): `grep -rln "import DOMPurify" src` = 1 hit + `grep -nE "addHook" sanitizeHtml.ts` = 1 hit + `grep -nE "removeHook"` = 0 hit + fixture 2 PASS (rel upgrade + idempotence). §역할 / §동작 (I7~I11) 5건 / §회귀 중점 5건 / §테스트 현황 5건 / §수용 기준 5건 / §스코프 규칙 grep-baseline (REQ-018) 5 추가. RULE-07 자기 검증 PASS — 평서형 + 반복 검증 가능 + 시점 비의존 + incident 비귀속. | §역할 §동작 §회귀 중점 §테스트 현황 §수용 기준 §스코프 규칙 |

## 참고
- **REQ 원문**: REQ-20260418-001 (sanitize 단일 모듈 정책), REQ-20260517-076 (본 세션 mv 후 `60.done/2026/05/17/req/`).
- **관련 spec**:
  - `specs/30.spec/green/common/markdownParser.md` (REQ-076 — 파싱 알고리즘 영역, 본 spec 의 input 생산자).
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (DOMPurify 버전 정합 — 본 spec 과 직교).
- **외부 레퍼런스**: OWASP XSS Filter Evasion Cheat Sheet — 회귀 fixture 출처.
- **RULE 준수**:
  - RULE-07: 6 불변식 (I1~I6) 모두 시점 비의존 평서문 + `grep` 단일 명령 재현 가능.
  - RULE-06: grep-baseline 4 gate 실측 박제.
  - RULE-01: inspector writer 영역만.
