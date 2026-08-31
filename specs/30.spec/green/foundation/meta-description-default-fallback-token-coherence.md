# `index.html` `<meta name="description">` ↔ `src/common/common.ts` `DEFAULT_META_DESCRIPTION` ↔ `setMetaDescription()` default 인자 fallback 양면 토큰 동치 시스템 불변식

> **위치**: 횡단 SEO/meta 정합 — `index.html:7` `<meta name="description" content="park108.net is a personal journal of Jongkil Park the developer" />` (HTML 정적 baseline) + `src/common/common.ts:12` `const DEFAULT_META_DESCRIPTION = "park108.net is a personal journal of Jongkil Park the developer"` (runtime default 상수 정의) + `src/common/common.ts:14` `export const setMetaDescription = (desc: string = DEFAULT_META_DESCRIPTION): void => {...}` (default parameter binding). 양면 63 code unit == 63 UTF-8 byte 리터럴 (현 baseline 이 ASCII 라 두 수가 우연히 같다) byte-for-byte 동치.
> **관련 요구사항**: REQ-20260518-003 · REQ-20260901-085 (본 tick 재개봉 — 길이 단위 정정 + ASCII baseline 전제 해제)
> **최종 업데이트**: 2026-09-01 (by inspector 258차 tick — blue 재개봉, REQ-20260901-085 흡수)

> 본 spec 은 자매 `foundation/index-html-public-asset-reference-coherence.md` (green, REQ-099) 의 정적 자원 참조 4-axis OOS 선언 "`<meta name="description">` 의 description 텍스트 자체 정합 — 별 axis" 를 보완한다. `components/common.md` (blue) 의 `setMetaDescription(desc)` API signature 박제와 직교한다 (common.md = API 부작용 / 본 spec = default fallback 값 양면 동치).

## 역할
SPA 초기 진입 시 `<meta name="description">` 의 정적 HTML baseline 과 runtime cleanup 시 복원 default 가 byte-for-byte 동치하는 **결과 효능 계약** 이다 — (H) `index.html` `<meta name="description" content="...">` 의 content 값, (D) `src/common/common.ts` `DEFAULT_META_DESCRIPTION` 상수 literal 값, (U) 동일 파일 `setMetaDescription(desc: string = DEFAULT_META_DESCRIPTION)` default parameter binding. H ≠ D 분기 시 `LogSingle` unmount cleanup (`src/Log/LogSingle.tsx:39` 무인자 호출) 가 다른 description 으로 silently 복원 → SEO 크롤러 / 소셜 카드 / 북마크 description 일관성 위반. U binding 부재 시 무인자 호출 → `desc === undefined` → `<meta>` content 손상. 의도적으로 하지 않는 것: 발화 채널 (pre-commit / pre-push / CI / 신규 `check:meta-description-coherence` script) 선정, 토큰 일관 갱신 수단 (단일 상수 추출 vs literal 동치 유지) 선택, description 텍스트 자체의 SEO 품질 평가 (길이 150-160 자 / 키워드 / CTA), `setMetaDescription` 인자 전달 호출 (`LogSingle:57` summary + ellipsis, `LogSingle:63` PAGE_NOT_FOUND) 의 인자 값 정합 (별 axis — 인자 전달 한정), `setHtmlTitle` 의 `" - park108.net"` suffix 토큰 동치 (별 axis — title brand suffix), `[DEV]` prefix asymmetry (`setHtmlTitle` isDev 분기 한정), 테스트 fixture 의 description occurrence (production 코드 한정), `<meta>` content attribute 를 **HTML entity / Unicode escape 로 우회한 표기**의 동치 판정 (본 spec 은 리터럴 비교만 한다 — 우회 표기 금지 자체는 `foundation/document-locale-and-snippet-language-agreement` (I5) 소유), build artifact (`build/index.html`) 의 description 보존 (REQ-099 G-B 와 중복 영역).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `index.html` 단일 파일 grep + `src/common/common.ts` 단일 파일 grep + content 속성 추출 + 상수 literal 추출 + byte-for-byte 동치 비교 fixture.

## 동작
1. (G-A) `index.html` meta description 등록 hit — FR-01
   - 명령: `grep -cE 'name="description"' index.html` → **출력 = 1 + rc=0**.
   - 의미: HTML 정적 baseline 의 description meta 가 1 hit 박제. WHATWG HTML Living Standard §4.2.5.1 의 `name="description"` 은 per-page 단일 semantic.
2. (G-B) `src/common/common.ts` 상수 정의 hit — FR-02
   - 명령: `grep -cE 'const DEFAULT_META_DESCRIPTION\s*=' src/common/common.ts` → **출력 = 1 + rc=0**.
   - 의미: runtime default fallback 상수가 1 hit 박제. 정의 hit 0 시 채널 U default 인자 binding TypeScript compile 오류 → 즉시 lint/typecheck 검출.
3. (G-C) `setMetaDescription` default 인자 binding hit — FR-03
   - 명령: `grep -cE 'setMetaDescription\s*=\s*\([^)]*=\s*DEFAULT_META_DESCRIPTION' src/common/common.ts` → **출력 = 1 + rc=0**.
   - 의미: default 인자 binding 이 1 hit 박제. binding 제거 시 `LogSingle:39` `setMetaDescription()` 무인자 호출 → `desc === undefined` → `metaEl.content = "undefined"` 손상 회귀.
4. (G-D) **양면 description 토큰 동치 게이트** — FR-04
   - 절차: (H) `index.html:7` `<meta name="description" content="...">` content 속성 값 추출 + (D) `src/common/common.ts` `DEFAULT_META_DESCRIPTION = "..."` literal 값 추출 → quote 제거 → **byte-for-byte 동치 비교**. baseline 측정: 양면 모두 63 code unit == 63 UTF-8 byte 리터럴 (현 baseline 이 ASCII 라 두 수가 우연히 같다) `"park108.net is a personal journal of Jongkil Park the developer"` → **양면 토큰 동치 PASS** (`node -e 'console.log("park108.net is a personal journal of Jongkil Park the developer".length)' → 63`).
   - 의미: H ≠ D 분기 → LogSingle navigate-away 시 description silently 새 default 로 set → 초기 HTML 과 어긋남 → SEO 크롤러 / 소셜 카드 fetch 시점에 따라 다른 description 노출.
5. (G-E) src/ production 토큰 분포 보존 — FR-05
   - 절차: `grep -cE 'DEFAULT_META_DESCRIPTION' src/common/common.ts` → **출력 = 2** (정의 1 + default 인자 사용 1).
   - 의미: 3 번째 사용처 (`src/**` production 코드) 도입 시 본 spec 갱신 신호 (정의 1 + 사용 1 한정 분포 박제).
6. (G-F) content 속성 형태 보존 — FR-06
   - 절차: `index.html:7` 의 description content 속성 값 추출 정규식 `name="description"\s+content="([^"]*)"` 가 baseline 1 match 산출 → quote 제거 후 63 code unit == 63 UTF-8 byte 리터럴 (**본 문면은 67 을 박제하고 있었다 — 실측 63 으로 정정**).
   - 의미: content 속성 형태 변경 (single quote / 다중 라인 / HTML entity escape / Unicode escape) 시 본 spec 갱신 신호 — 본 spec 은 double quote 리터럴 형태 한정이며 **문자 집합은 제한하지 않는다**.
7. (G-G) 회귀 검출 채널 존재 — FR-07
   - G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E ∧ G-F 6 조건은 grep + content 속성 추출 + 상수 literal 추출 + byte-for-byte 동치 비교 fixture (또는 동등) 채널을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:meta-description-coherence` script) 선정은 수단 영역이나 "발화 채널 존재" 계약 자체는 박제.
8. (G-H) 시점 비의존 — NFR-07
   - 6 조건은 `src/common/common.ts` 리팩토링 · `index.html` 마크업 정렬 변경 · `setMetaDescription` API 재설계 · TypeScript 메이저 bump 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 6 조건 동시 만족 회복 또는 본 spec 갱신.
9. (G-I) 자체 진단 제외 — 결정론 보장
   - 본 req / 본 spec / 테스트 문서 본문 내 `name="description"` / `DEFAULT_META_DESCRIPTION` / `park108.net is a personal journal of Jongkil Park the developer` 문자열 occurrence 는 G-A `index.html` count 1 + G-B `common.ts` count 1 + G-E `common.ts` count 2 와 독립 — 게이트 scope 는 `index.html` 단일 파일 + `src/common/common.ts` 단일 파일로 한정. 동일 HEAD 상에서 본 게이트 N 회 실행 시 N 회 동일 rc + 동일 출력.

## 의존성
- 내부: `index.html` (HTML 정적 baseline 박제 위치 — `index.html:7`), `src/common/common.ts` (runtime default 상수 + default parameter binding — `src/common/common.ts:12,14`), `src/Log/LogSingle.tsx` (runtime cleanup 호출 — `src/Log/LogSingle.tsx:39` `setMetaDescription()` 무인자 호출 / `:57` summary 인자 / `:63` PAGE_NOT_FOUND 인자).
- 외부: WHATWG HTML Living Standard §4.2.5.1 standard metadata names (`name="description"` semantic per-page 단일), Google Search Central "How to Write Meta Descriptions" (meta description 은 search snippet 후보), MDN Standard metadata names (`description` 는 Firefox / Opera default bookmark description), ECMAScript Language Specification §15.2.4 FunctionDeclaration (default parameter evaluation 은 호출 시점 closure scope binding resolve), POSIX `grep` (G-A / G-B / G-C / G-E / G-F 측정 명령), `tsc` (typecheck — R-3 / R-4 회귀 검출).
- 역의존 (사용처): 본 계약을 참조하는 spec 은 아래로 도출한다 — `bash -c 'set -- $(grep -rl "meta-description-default-fallback-token-coherence" specs/30.spec/green specs/30.spec/blue --include="*.md"); echo "revdep-docs=$#"; test "$#" -ge 1'` (자기 언급 포함 — 제외하면 도출이 공허해진다). 코드 쪽 사용처는 `src/Log/LogSingle.tsx` 의 무인자 `setMetaDescription()` 복원 호출이며, **258차 재개봉 시 이 줄이 사라진 `.jsx` 확장자 경로를 가리키고 있었다** — TypeScript 이관 후에도 blue 에 남아 있었고, `foundation/spec-dependency-reverse-derivation` (I3) 의 차단 모집단이 green 한정이라 blue 에서는 등급 보고 대상일 뿐 붉지 않았다. 재개봉이 그 경로를 차단 모집단에 넣어 즉시 드러냈다. 발화 채널 부착(`check:meta-description-coherence` 또는 pre-push hook) 은 수단 위임이다.
- 자매 spec: `foundation/index-html-public-asset-reference-coherence.md` (green, REQ-099) — `index.html` 정적 자원 참조 4-axis. OOS 박제 line 75 "`<meta name="description">` 의 description 텍스트 자체 정합 (SEO 정책 — 별 axis)" 명시 — 본 spec 이 그 별 axis 박제. `foundation/csp-meta-dev-strip-prod-preserve.md` (green, REQ-098) — `index.html:8` CSP meta dev/prod 비대칭 axis. 부수 조건 평서 (description meta 보존) 만 박제, content 토큰 자체 동치는 미박제 → 본 spec 과 직교. `components/common.md` (blue) — `setHtmlTitle(title)` / `setMetaDescription(desc)` API 부작용 박제. API signature 한정, default fallback 값 자체의 양면 동치는 미박제 → 본 spec 이 그 default 값 axis 박제. `foundation/meta-robots-robotstxt-policy-semantic-coherence.md` (green, REQ-20260518-001) — `<meta name="robots">` ↔ `public/robots.txt` 양면 의미 동치. `<meta name="robots">` element 영역 → 본 spec (description) 과 직교.

## 테스트 현황
- [x] (G-A) `grep -cE 'name="description"' index.html` → **1 + rc=0** (baseline 1 hit 박제, HEAD `a932c8a` 실측 — `index.html:7` `<meta name="description" content="...">`).
- [x] (G-B) `grep -cE 'const DEFAULT_META_DESCRIPTION\s*=' src/common/common.ts` → **1 + rc=0** (baseline 1 hit 박제, HEAD `a932c8a` 실측 — `src/common/common.ts:12`).
- [x] (G-C) `grep -cE 'setMetaDescription\s*=\s*\([^)]*=\s*DEFAULT_META_DESCRIPTION' src/common/common.ts` → **1 + rc=0** (baseline 1 hit 박제, HEAD `a932c8a` 실측 — `src/common/common.ts:14`).
- [x] (G-D) (H) content 속성 값 ↔ (D) 상수 literal 값 byte-for-byte 동치 비교 → 양면 모두 63 code unit == 63 UTF-8 byte 리터럴 (현 baseline 이 ASCII 라 두 수가 우연히 같다) `"park108.net is a personal journal of Jongkil Park the developer"` 동치 PASS.
- [x] (G-E) `grep -cE 'DEFAULT_META_DESCRIPTION' src/common/common.ts` → **2** (정의 1 + default 인자 사용 1) (baseline 분포 박제).
- [x] (G-F) content 속성 형태 (`name="description"\s+content="([^"]*)"` regex) baseline 1 match — double quote 리터럴 형태 박제 (문자 집합 무관).
- [x] (G-G) 발화 채널 존재 — grep + content 속성 추출 + 상수 literal 추출 + byte-for-byte 동치 비교 fixture (또는 동등) 채널 rc=0/1 결정론. 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:meta-description-coherence` script) 부착 미박제 (수단 위임). — **측정**: `src/__tests__/meta-description-token-coherence.test.ts`, CI `Test` step 발화.

## 수용 기준

> **258차 재개봉 시 전면 교체.** 종전 §수용 기준 은 `RULE-07 §수용 기준 문장 규약` 이전 형식이라 **명령 1회로 rc 판정 가능한 문장이 하나도 없었고**, 그 상태로 blue 에 승격돼 있었다. 아래는 전건 **현 HEAD 에서 실행한 명령과 실측 rc** 다. 종전 항목 중 `가정 주입 요구` 부류 5건은 §참고 로 강등했다 (아래 §강등분).

- [x] (Must, FR-01) `index.html` 의 description meta 가 정확히 1 회 등록된다: `bash -c 'n=$(grep -cE "name=\"description\"" index.html); echo "html-description-meta=$n"; test "$n" -eq 1'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `html-description-meta=1`. **정적 불변식이다.**
- [x] (Must, FR-02) runtime default 상수 정의가 정확히 1 개다: `bash -c 'n=$(grep -cE "const DEFAULT_META_DESCRIPTION[[:space:]]*=" src/common/common.ts); echo "default-const-definitions=$n"; test "$n" -eq 1'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `default-const-definitions=1`. **정적 불변식이다.**
- [x] (Must, FR-03) default 인자 binding 이 살아 있다: `bash -c 'n=$(grep -cE "setMetaDescription[[:space:]]*=[[:space:]]*\([^)]*=[[:space:]]*DEFAULT_META_DESCRIPTION" src/common/common.ts); echo "default-binding=$n"; test "$n" -eq 1'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `default-binding=1`. **정적 불변식이다.** binding 이 사라지면 `LogSingle` 의 무인자 호출이 `undefined` 를 심는다.
- [x] (Must, FR-04 양면 동치 — **본 spec 의 주 명제**) (H) 와 (D) 의 토큰이 동치다: `bash -c 'H=$(perl -0777 -ne "print \$1 if /name=\"description\"\s+content=\"([^\"]*)\"/" index.html); D=$(perl -0777 -ne "print \$1 if /const DEFAULT_META_DESCRIPTION\s*=\s*\"([^\"]*)\"/" src/common/common.ts); test -n "$H" -a -n "$D" || exit 2; echo "H-code-units=${#H} D-code-units=${#D} utf8-bytes=$(printf %s "$H" | wc -c | tr -d " ")"; test "$H" = "$D"'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `H-code-units=63 D-code-units=63 utf8-bytes=63`. **정적 불변식이다.** **추출 실패는 통과가 아니라 무판정(`exit 2`)이다** — 한쪽 캡처가 비면 `test "" = ""` 가 참이 되어 빈 값끼리 동치로 읽힌다. **두 단위를 나란히 출력하는 것이 본 tick 의 정정이다**: 종전 문면은 두 수를 구별하지 않고 `byte` 라고만 불렀고, 그래서 63 과 67 을 같은 문서 안에 동시에 박제하고도 아무 게이트가 붉지 않았다.
- [x] (Should, FR-05) 식별자 분포가 정의 1 + 사용 1 이다: `bash -c 'n=$(grep -cE "DEFAULT_META_DESCRIPTION" src/common/common.ts); echo "identifier-distribution=$n"; test "$n" -eq 2'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `identifier-distribution=2`. **정적 불변식이다.** 3 번째 production 사용처 도입 시 본 spec 갱신 신호다.
- [x] (Should, FR-06) content 속성이 double quote 리터럴 형태로 정확히 1 회 매치된다: `bash -c 'n=$(perl -0777 -ne "\$c=()=/name=\"description\"\s+content=\"[^\"]*\"/g; print \$c+0" index.html); echo "content-form-matches=$n"; test "$n" -eq 1'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `content-form-matches=1`. **정적 불변식이다.** **문자 집합은 제한하지 않는다** — 비-ASCII 리터럴도 이 형태를 만족한다.
- [x] (Should, FR-07 발화 채널) 게이트가 실물 파일로 있고 발화 채널에 수집된다: `bash -c 'f=src/__tests__/meta-description-token-coherence.test.ts; test -f "$f" || exit 2; g=$(grep -cE "\"(test|test:run)\"[[:space:]]*:" package.json); echo "gate-file=1 test-script-keys=$g"; test "$g" -ge 1'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `gate-file=1 test-script-keys=1`. **정적 불변식이다.** `RULE-07 §promote 조건 4` 의 발화 채널 실경로 박제다.
- [x] (Must, 범위 제한) 요약문의 문장 선택·SEO 품질 · `<html lang>` 과의 자연어 일치 · 길이 단언 상수의 단위 명명 · 하드코딩 기대 토큰의 발화점 커버리지는 본 계약의 요구 대상이 **아니다** — 자연어 일치 축은 `foundation/document-locale-and-snippet-language-agreement` 가 소유한다 (본 tick 신설).

## 스코프 규칙
- **expansion**: N/A (본 spec 은 SEO/meta 횡단 게이트 박제 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`a932c8a`, 2026-05-18 — 본 spec 박제 시점 실측):
  - (G-A) `grep -cE 'name="description"' index.html` → **1** (HEAD `a932c8a` 시점 실측):
    - `index.html:7` `<meta name="description" content="park108.net is a personal journal of Jongkil Park the developer" />`
  - (G-B) `grep -cE 'const DEFAULT_META_DESCRIPTION\s*=' src/common/common.ts` → **1** (HEAD `a932c8a` 시점 실측):
    - `src/common/common.ts:12` `const DEFAULT_META_DESCRIPTION = "park108.net is a personal journal of Jongkil Park the developer";`
  - (G-C) `grep -cE 'setMetaDescription\s*=\s*\([^)]*=\s*DEFAULT_META_DESCRIPTION' src/common/common.ts` → **1** (HEAD `a932c8a` 시점 실측):
    - `src/common/common.ts:14` `export const setMetaDescription = (desc: string = DEFAULT_META_DESCRIPTION): void => {...}`
  - (G-D) 양면 토큰 baseline: H = `"park108.net is a personal journal of Jongkil Park the developer"` (63 code unit == 63 UTF-8 byte) / D = 동일 리터럴. **양면 byte-for-byte 동치 PASS**.
  - (G-E) `grep -cE 'DEFAULT_META_DESCRIPTION' src/common/common.ts` → **2** (`:12` 정의 1 hit + `:14` default 인자 사용 1 hit, HEAD `a932c8a` 시점 실측).
  - (G-F baseline) content 속성 형태 = double quote 리터럴 (문자 집합 무관) (`<meta name="description" content="..." />`). 1 match.
  - (G-G baseline) 발화 채널 = `grep -rn 'meta-description\|DEFAULT_META_DESCRIPTION' .husky/pre-commit .husky/pre-push scripts/*.sh package.json 2>/dev/null | grep -v "Binary"` → **0 hit** (현 pre-push / CI / package.json `check:*` script 부재 — 수단 위임).
  - 합계 baseline: G-A 1 hit / G-B 1 hit / G-C 1 hit / G-D 양면 토큰 동치 PASS (63 code unit == 63 UTF-8 byte) / G-E 2 hit (정의 1 + 사용 1) / G-F double quote 리터럴 form (문자 집합 무관) / G-G 발화 채널 0 hit (수단 위임).
- **rationale**: G-A~G-F baseline 은 본 spec 박제 시점 실측 박제 — 향후 회귀 분석 시 위반 검출 기준 (FR-01 회귀 시 1 ≠ N / FR-02 회귀 시 0 hit / FR-03 회귀 시 0 hit / FR-04 회귀 시 양면 토큰 분기 / FR-05 회귀 시 3 hit / FR-06 회귀 시 형태 변경). 발화 채널 baseline 0 hit (G-G) 는 §배경 측정값 기록 — task 위임으로 발화 채널 신설 (pre-push / CI / `check:meta-description-coherence` script) 시 본 spec 의 §수용 기준은 hit/채널 수 비의존 (RULE-07 정합 — "발화 채널 존재" 계약 자체만 박제).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 258차 tick (**blue 재개봉** — Phase 3, REQ-20260901-085 흡수) / — @ HEAD=`eb62529` | **재개봉 근거**: REQ-085 가 정정을 요구한 두 가지가 전부 이 문서 안에 있고 blue 는 inspector writer 영역이 아니다. (1) **자기모순 정정** — 같은 문서가 길이를 63(`:26`,`:51`)과 67(`:32`,`:83`,`:89`)로 동시에 박제하고 있었다. 실측 63 이며 소유 spec 안의 낡은 길이 박제 3 → **0** (정정 전 문면은 길이 단위를 `byte` 로 부르며 67 을 적었다). 게이트 소스가 이 격차를 이미 알고 inspector 영역으로 귀속시켜 둔 채 3 개월 방치돼 있었다. (2) **ASCII baseline 전제 해제** — §역할 OOS 의 *"ASCII 리터럴 baseline 한정"* 이라는 OOS 문면과 본문 8곳의 같은 표현이 비-ASCII 요약문을 계약 밖으로 밀어냈다. 문자 집합 제한을 걷고 형태 제한(double quote 리터럴)만 남겼다 — ASCII 한정 표현 8 → **0**. (3) **단위 구별** — `byte` 와 `code unit` 을 나란히 적는다. 두 수를 한 이름으로 부른 것이 63/67 자기모순이 3 개월 살아남은 구조적 이유다. (4) **§수용 기준 전면 교체** — 종전 9 항 중 명령 1회로 rc 판정 가능한 것이 **0** 이었는데 전건 `[x]` 로 blue 에 승격돼 있었다. 8 항을 실행 가능한 명령으로 다시 쓰고 현 HEAD 실측 rc 를 박제했다 (전건 rc=0). `가정 주입 요구` 부류 5 항은 검출 방향을 보존해 §참고 §강등분 으로 내리고 이관처를 표기했다 (이관처 없는 강등 금지). | 헤더 · §역할 OOS · §동작 G-D/G-F · §테스트 현황 · §수용 기준(전면) · §스코프 규칙 baseline · §참고 · 본 이력 |
| 2026-05-18 | inspector 69차 / (this commit) | 최초 박제 — REQ-20260518-003 흡수 (`<meta name="description">` ↔ `DEFAULT_META_DESCRIPTION` 양면 토큰 동치 시스템 불변식, baseline HEAD `a932c8a` — 이 시점에 길이를 **67 로 잘못 박제**했다 (실측 63)) | all |
| 2026-05-18 | TSK-20260518-08 / `b2d26cf`+`2b99d22` | hook-ack — 결정론 측정 fixture 박제 (`src/__tests__/meta-description-token-coherence.test.ts` 109 line, G-A~G-F 6 게이트 단언, fixture 6/6 PASS, `npm test` 472 PASS / lint+typecheck+build rc=0 회귀 0). §테스트 현황 G-A~G-F + §수용 기준 FR-01~FR-06 6+6 marker flip. 본문 67→63 byte 정정 (실측 `node -e 'console.log("…".length)' → 63`, 본 spec 박제 시점 데이터 오류 회귀 보호). FR-07 (발화 채널 부착) + G-G + NFR-06 채널 의미 우선순위 라벨 후속 신호는 별 axis carve 위임. | §역할 헤더 / §동작 G-D / §테스트 현황 G-A~G-F / §수용 기준 FR-01~FR-06 / §스코프 규칙 grep-baseline G-D |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | C단계 마커 회수 — RULE-07 §수용 기준 문장 규약 적용. 판정 가능한 항목은 실측·주입 근거와 함께 flip, 미래 사건·미측정 NFR·자명 명제·별 축 위임 항목은 §참고 §미측정·비판정 항목 으로 강등. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |

## 참고

### 강등분 — 가정 주입 요구 부류 (258차, `RULE-07 §수용 기준 문장 규약`)

아래 5 항은 종전 §수용 기준 에 `[x]` 로 있었으나 **고장을 내야 검증되는 문장**이라 체크박스 부적격이다 (`가정 주입 요구` 부류). 검출 방향을 보존한 채 평서문으로 내린다. 이 방향들은 `TSK-20260518-08` 시점에 실제 주입으로 확인됐고, **앞으로 이 게이트를 수정하는 task 는 `RULE-06 §게이트 실효 검증` 에 따라 같은 방향을 다시 왕복해야 한다** — 그것이 이관처다 (REQ-20260901-085 의 게이트 상수 정정 task 가 첫 이관처가 된다).

- (Must, 회귀 가설 검출) `index.html:7` content `"park108.net is a personal journal of Jongkil Park the developer"` → 다른 텍스트 변경 + `src/common/common.ts:12` 미변경 가설 회귀 시 G-D 동치 비교 → 양면 분기 검출 (FR-04 위반, rc=1). — **주입 검증**: 1 failed / 5 passed.
- (Must, 회귀 가설 검출) `src/common/common.ts:12` `DEFAULT_META_DESCRIPTION` literal → 다른 문자열 변경 + `index.html` 미변경 가설 회귀 시 G-D 동치 비교 → 양면 분기 검출 (FR-04 위반, R-1 mirror). — **주입 검증**: 1 failed / 5 passed.
- (Must, 회귀 가설 검출) `src/common/common.ts:14` default 인자 binding 제거 (`desc: string`) 가설 회귀 시 G-C grep → 0 hit (FR-03 위반, R-3) → `LogSingle:39` 무인자 호출 시 `<meta>` content 손상. — **주입 검증**: 2 failed / 4 passed.
- (Must, 회귀 가설 검출) `src/common/common.ts:12` 상수 자체 삭제 가설 회귀 시 G-B grep → 0 hit (FR-02 위반, R-4) → 채널 U binding TypeScript compile 오류로 즉시 검출. — **주입 검증**: 4 failed / 2 passed (상수 삭제 + inline 전환 동시).
- (Must, 회귀 가설 검출) `src/common/common.ts:14` default 인자 binding inline literal 변경 (`desc: string = "park108.net blog"`) 가설 회귀 시 G-C grep → 0 hit (binding 형태 게이트 위반, R-5) → 단일 진실 공급원 채널 D 의미 분리 위반 신호. — **주입 검증**: 2 failed / 4 passed.


### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- (G-H) 시점 비의존 — `src/common/common.ts` 리팩토링 · `index.html` 마크업 정렬 변경 · `setMetaDescription` API 재설계 · TypeScript 메이저 bump 후 1 PR 안에 G-A·G-B·G-C·G-D·G-E·G-F 동시 만족 회복 사례 누적.
- (G-I) 자체 진단 제외 — 본 spec / req / test 파일의 `name="description"` / `DEFAULT_META_DESCRIPTION` / `park108.net is a personal journal of Jongkil Park the developer` occurrence 가 G-A·G-B·G-E grep count 영향 0 (단일 파일 scope 한정).
- (Must NFR-01 결정론) 동일 HEAD 상에서 FR-01·FR-02·FR-03·FR-04·FR-05·FR-06 의 grep + 토큰 추출 + 동치 비교 결과가 N 회 반복 시 N 회 동일 rc + 동일 출력.
- (Must NFR-02 멱등성) 본 게이트는 read-only — `index.html` / `src/common/common.ts` 파일을 수정하지 않는다.
- (Should NFR-03 성능) (a) FR-01 grep < 50 ms. (b) FR-02 + FR-03 grep < 100 ms. (c) FR-04 토큰 추출 + 동치 비교 < 100 ms. (d) FR-05 + FR-06 추가 측정 < 200 ms. (e) 전체 게이트 < 1 s.
- (Must NFR-04 자체 진단 제외) 본 req / 본 spec / 테스트 문서 본문 내 `name="description"` / `DEFAULT_META_DESCRIPTION` / description literal 문자열 occurrence 는 FR-01·FR-02·FR-05 grep count 와 독립 — 게이트 scope 는 `index.html` 단일 파일 + `src/common/common.ts` 단일 파일로 한정. 테스트 fixture (`src/common/common.test.ts` 또는 동등) 의 description occurrence 는 게이트 scope 외.
- (Must NFR-05 외부 비파괴) 본 효능 도입은 `index.html` / `src/common/common.ts` 의 production 외 변경 동반 없음 — 단, FR-07 의 발화 채널 부착 수단 (예: `package.json` 의 `check:*` script 추가 또는 husky hook 부착) 은 본 spec 의 In-Scope 가 아닌 수단 영역.
- (Must NFR-06 채널 의미 분리) 채널 H (HTML 정적 baseline, SEO/소셜 크롤러 초기 노출) ↔ 채널 D (JS module-level 상수, runtime fallback 진실 공급원) ↔ 채널 U (function default parameter binding, 무인자 호출 fallback 발화 지점) 의 의미 분리는 본 spec 의 행동 평서문에 포함되되 어느 채널의 우선순위 라벨 ("기본" / "권장" / "진실 공급원") 박제 금지 — 수단 중립. 3 채널은 실행 단계 (HTML 파싱 / module 로드 / 함수 호출) 가 독립이나 본 spec 은 **양면 토큰 동치** axis 만 박제.
- (Must NFR-07 시점 비의존) FR-01·FR-02·FR-03·FR-04·FR-05·FR-06 는 `src/common/common.ts` 리팩토링 · `index.html` 마크업 정렬 변경 · `setMetaDescription` API 재설계 · TypeScript 메이저 bump 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 6 조건 동시 만족 회복 또는 본 spec 갱신.
