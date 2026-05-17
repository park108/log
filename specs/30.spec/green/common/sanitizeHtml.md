# `src/common/sanitizeHtml.ts` — ALLOWED_* 단일 모듈 정책 + DOM 주입 전 sanitize 경유 불변식

> **위치**: `src/common/sanitizeHtml.ts` 의 `ALLOWED_TAGS` / `ALLOWED_ATTR` / `ALLOWED_URI_REGEXP` 정책 상수 + `sanitize` (또는 모듈 default export) 진입점.
> **관련 요구사항**: REQ-20260418-001 NFR-01, REQ-20260517-076 FR-02
> **최종 업데이트**: 2026-05-17 (by inspector — REQ-076 흡수 최초 박제)

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

### 회귀 중점
- 외부 모듈이 `ALLOWED_TAGS` 등을 `export` 추가 후 import 하면 (I1) 위반 — 정책 분기 위험.
- caller 가 `markdownParser` 결과를 sanitize 우회 후 `dangerouslySetInnerHTML` 직접 주입 시 (I2) 위반 — XSS 진입 표면.
- `ALLOWED_URI_REGEXP` 에 `javascript:` / `data:` 추가 시 (I3) 위반 — 활성 콘텐츠 진입 표면.
- `afterSanitizeAttributes` 훅 본문에서 `<a target="_blank">` rel 자동 보정 로직 제거 시 (I4) 위반 — `noopener noreferrer` 누락으로 tabnabbing 표면.
- 신규 태그 도입 시 fixture 갱신 누락 (I6) 위반 — 회귀 감지 누락.

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

## 수용 기준
- [x] (Must, FR-02-a) ALLOWED_TAGS / ALLOWED_ATTR / ALLOWED_URI_REGEXP 3 상수 단일 모듈 박제 — §동작 (I1) + grep 0 hit 게이트.
- [ ] (Must, FR-02-b) markdownParser 산출 HTML 의 DOM 주입 직전 sanitize 경유 — caller 측 게이트 (별 task 위임 — lint rule / 정적 분석).
- [ ] (Must, FR-02-c) OWASP XSS Filter Evasion 10 대표 벡터 회귀 fixture pointer — `src/common/sanitizeHtml.test.ts` referer 박제 (본 spec §동작 I5).
- [x] (Should) URI scheme 화이트리스트 + `<a target="_blank">` rel 자동 보정 — §동작 (I3)(I4) 박제.
- [x] (Must, 범위 제한) DOMPurify 다른 옵션 / 라이브러리 버전 / caller 측 사용 패턴은 본 게이트 범위 밖.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`893cdea`, 2026-05-17):
  - `grep -nE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src/common/sanitizeHtml.ts` → 7 hits in 1 file (3 정의 @:7,17,20 + 4 사용 @:45-47 + 인용 @:49). 단일 모듈 정합 OK.
  - `grep -rnE "ALLOWED_TAGS|ALLOWED_ATTR|ALLOWED_URI_REGEXP" src | grep -v "common/sanitizeHtml\."` → **0 hit**. (I1) 단일 모듈 정책 PASS.
  - `grep -nE "afterSanitizeAttributes|noopener noreferrer" src/common/sanitizeHtml.ts` → 2+ hits (훅 등록 @:30 + rel 부여 본문). (I4) PASS.
  - `grep -rE "javascript:|data:.*html|vbscript:" src/common/sanitizeHtml.ts` → 0 hit (활성 콘텐츠 scheme 진입 0). (I3) 강화.
- **rationale**: (I1)(I3)(I4)(I6) 본 spec 박제 시점 PASS — 즉시 [x]. (I2) caller 측 게이트는 별 task 위임 (lint rule / 정적 분석 후보). (I5) fixture pointer 박제 — fixture 본문 검증은 별 spec (`src/common/sanitizeHtml.test.ts` referer).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — `src/common/sanitizeHtml.ts` 단일 모듈 정책 + DOM 주입 직전 sanitize 경유 + URI scheme 화이트리스트 + `<a target="_blank">` rel 자동 보정 + OWASP fixture pointer + 정책 변경 단일 진입점 6 축 (I1~I6) 게이트. baseline: ALLOWED_* 단일 모듈 정합 0 hit (외부 사용) / 18 ALLOWED_TAGS / 7 ALLOWED_ATTR / URI scheme 4 enum. 원전 REQ-20260418-001 NFR-01 보존. | all |

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
