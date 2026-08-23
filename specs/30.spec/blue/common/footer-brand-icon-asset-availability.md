# Footer 브랜드 아이콘 자산 가용성 ↔ 공급처 출처(provenance) ↔ CSP `img-src` allowlist 3-축 정합 시스템 불변식

> **위치**: `src/common/Footer.tsx` (브랜드 아이콘 3 발화 — AWS `<img>` / GitHub inline `<svg>` / LinkedIn `<img>`), `public/**` (vendored 브랜드 자산 배치 후보 경로), `index.html:9` `<meta http-equiv="Content-Security-Policy">` 의 `img-src` directive.
> **관련 요구사항**: (수동 등록 — 운영자 직접 관측, 2026-08-24)
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: 회수 완료 + green→blue promote)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-08-24, HEAD=`e1d3501`).

> 본 spec 은 자매 `foundation/csp-meta-dev-strip-prod-preserve.md` (green, REQ-098) 및 대기 중 `specs/20.req/20260518-csp-meta-img-src-allowlist-src-external-domain-token-coherence.md` 와 **동일 표면 (`index.html:9` `img-src`) 의 별 axis** 이다 — REQ-098 = CSP meta 의 dev/prod 출력 비대칭, REQ-20260518 = CSP allowlist ↔ `src/**` origin 집합의 *동치*, 본 spec = 브랜드 아이콘 자산의 *가용성 + 출처* 및 그 결과로서의 allowlist *축소 방향*. 세 축은 교집합 표면을 공유하나 판정 대상이 각각 (출력 보존 / 집합 동치 / 자산 렌더 가능성) 으로 직교한다.

## 역할

Footer 가 발화하는 모든 브랜드 아이콘 자산 참조는 **3-축 (가용성 / 출처 / 권한) 결과 효능 계약** 을 가진다.

- **(A) 가용성 (availability)** — Footer 가 발화하는 모든 아이콘은 배포된 프로덕션 문서에서 **실제로 렌더 가능** 해야 한다. 아이콘 참조가 깨진 상태 (HTTP 404 / non-image content-type / CSP 차단) 로 배포되는 것은 본 spec 위반이며, 위반은 **결정론적 게이트로 검출 가능** 해야 한다. 제3자 호스트의 URL 안정성에 가용성을 위임한 참조는 이 결정론을 만족시키지 못한다.
- **(B) 출처 (provenance)** — 브랜드 아이콘 자산의 형상·색상은 **권리자가 배포한 공식 패키지** 를 단일 공급원으로 하며, 저장소에 vendoring 된 자산은 그 공식 패키지 산출물과 **바이트 동일** 하다. 형상(shape) 변형·색상 변경·타 심볼 합성은 금지 (LinkedIn Brand Guidelines `[in]` Logo — "Do not modify the color or the shape").
- **(C) 권한 (CSP allowlist)** — 아이콘 자산의 발화 origin 집합과 `index.html:9` `img-src` directive 의 외부 origin allowlist 는 **동시 갱신** 된다. 자산이 `'self'` origin 으로 이관되면 대응 외부 origin 은 allowlist 에서 **제거** 되어야 하며 (vacuous 권한 잔존 금지), 이 제거는 CSP 문자열을 박제 중인 모든 표면에 1 PR 안에 동시 반영된다.

### 실증된 위반 (본 spec 박제 계기)

`src/common/Footer.tsx:52` 의 LinkedIn `[in]` 로고 참조
`https://brand.linkedin.com/content/dam/me/business/en-us/amp/brand-site/v2/bg/LI-Bug.svg.original.svg`
는 **HTTP 404 (`content-type: text/html;charset=utf-8`, 687 byte)** 를 반환한다 (2026-08-24 실측). LinkedIn 이 브랜드 자산 배포를 Adobe AEM delivery (`delivery-p143253-e1476319.adobeaemcloud.com/adobe/assets/urn:aaid:aem:<uuid>/...`) 로 이관하면서 기존 `brand.linkedin.com/content/dam/**` 경로의 안정성 보장이 소멸했다. 결과: 프로덕션 푸터에 **깨진 이미지 placeholder + `alt="[in]"` 텍스트** 노출 (§배경 스크린샷 관측). 동일 계열 `d0.awsstatic.com` 참조는 동 시점 HTTP 200 이나, **가용성을 제3자 URL 안정성에 위임한다는 구조적 성질은 동일** 하다.

### 의도적으로 하지 않는 것

- `src/common/Footer.tsx:19` AWS (`d0.awsstatic.com/logos/powered-by-aws.png`) 자산의 self-host 이관 결정 — **별 axis 위임**. 본 spec 은 해당 참조를 (A) 축의 baseline 측정 대상으로만 박제하며, 현 시점 HTTP 200 이므로 게이트 위반이 아니다. AWS 자산의 vendoring 여부는 별 req/spec 축으로 분리한다 (본 spec 의 In-Scope 게이트는 LinkedIn 발화 1건 + 그에 결합된 CSP 표면 한정).
- `img-src` allowlist ↔ `src/**` 외부 origin 집합의 **양방향 집합 동치** 계약 — `specs/20.req/20260518-csp-meta-img-src-allowlist-src-external-domain-token-coherence.md` 영역. 본 spec 은 그 중 "자산 이관 시 allowlist 축소" 라는 **단방향 결과** 만 다룬다.
- 아이콘 발화 수단 (inline `<svg>` vs `public/**` vendored raster) 의 **강제 선택** — 수단 위임. 본 spec 은 두 수단 모두가 (A)(B)(C) 를 만족시킬 수 있음을 박제하고, 각 수단별 판정 절차를 정의한다.
- 푸터 레이아웃·정렬·반응형 breakpoint (`span--footer-right`, `hidden--width-350px`) 의 시각 회귀 — 별 axis (`styles/css-modules.md`).
- 브랜드 사용 권한 자체의 법적 판정 (LinkedIn Brand & User Agreements 준수 여부) — 본 spec 은 "공식 패키지 산출물과 바이트 동일" 이라는 **기계 검증 가능한 대리 지표** 만 박제한다.

## 공개 인터페이스

없음 (런타임 API 아님). 본 spec 은 측정 게이트 + 렌더 계약 박제 — `src/common/Footer.tsx` grep + `public/**` filesystem stat + PNG IHDR 파싱 + sha256 비교 + `index.html` CSP 문자열 grep + React Testing Library 렌더 단언 fixture.

## 동작

1. **(G-A) 브랜드 마케팅 호스트 hotlink 0 게이트** — FR-01
   - 명령: `grep -rnE 'src="https?://(brand|content)\.linkedin\.com' src --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js"` → **0 lines + rc=1**.
   - 의미: LinkedIn 브랜드 마케팅 사이트(`brand.linkedin.com` / `content.linkedin.com`) 는 자산 CDN 이 아니라 문서 사이트이며, 그 `/content/dam/**` 경로는 URL 안정성 계약을 제공하지 않는다 (404 실증). 런타임 코드에서의 직접 참조 0 hit 이 본 게이트.
   - baseline (HEAD `e1d3501`): **1 hit** (`src/common/Footer.tsx:52`) — **위반 상태**.

2. **(G-B) LinkedIn 아이콘 self-origin 발화 게이트** — FR-02
   - 절차: `src/common/Footer.tsx` 의 LinkedIn 앵커 (`href="https://www.linkedin.com/in/..."`) 하위 아이콘 노드가 다음 둘 중 **정확히 하나** 를 만족.
     - **(수단 1) inline `<svg>`** — 외부 참조 0. GitHub 아이콘 (`Footer.tsx:34-42`) 과 동일 패턴.
     - **(수단 2) `'self'` origin `<img src>`** — `src` 값이 `/` 로 시작하는 절대 경로이며 `test -f public/<basename>` → exit 0.
   - 의미: 아이콘 렌더 가능성이 저장소 내부 상태만으로 결정된다 (외부 네트워크 비의존 → CI 결정론 확보).
   - baseline: 미충족 (외부 origin `<img>`).

3. **(G-C) 공식 패키지 출처 바이트 동일 게이트** — FR-03
   - 절차 (수단 2 선택 시): vendored 자산이 LinkedIn 공식 배포 패키지
     `https://brand.linkedin.com/downloads` → `https://content.linkedin.com/content/dam/me/business/en-us/amp/xbu/linkedin-revised-brand-guidelines/logos/in-logo.zip`
     의 엔트리와 **sha256 동일**.
   - 공식 패키지 baseline (2026-08-24 취득, zip 47,771 byte, 유효 엔트리 4):

     | 엔트리 | 픽셀 (W×H) | 종횡비 | 주 색상 (RGBA) | 비고 |
     |---|---|---|---|---|
     | `in-logo/LI-In-Bug.png` | 635×540 | 1.17593 | `(40,103,178,255)` = `#2867B2` | 청색 — 흰 배경 권장 변형 |
     | `in-logo/InBug-Black.png` | 840×779 | 1.07830 | `(0,0,0,255)` | 흑색 변형 |
     | `in-logo/InBug-White.png` | 840×779 | 1.07830 | `(255,255,255,255)` | 백색 변형 |
     | `in-logo/LI-China-In-Bug.png` | 1663×536 | 3.10261 | — | 중국 법인용 — **본 spec scope 외** |

     - `sha256(in-logo/LI-In-Bug.png)` = `3c0149f26168b5fe0f43e68664abe40341a6443b3cd435d18a73e12f64f8b600`
     - 4 엔트리 모두 PNG color type 6 (RGBA 8bit), 배경 알파 0 (투명) — 글자 `in` 은 투명 컷아웃이므로 **밝은 단색 배경 위에서만** 사용 (Brand Guidelines: blue on solid white 우선).
   - 의미: 저장소의 브랜드 자산이 권리자 배포본과 바이트 동일함이 기계 검증된다 → 형상/색상 무변형이 sha256 1건으로 박제된다.
   - 수단 1 선택 시 대응 절차: inline path 데이터의 색상 토큰이 승인 3색 (`#2867B2` 계열 청색 / `#000000` / `#FFFFFF`) 중 하나이며, 형상은 공식 패키지 산출물과 시각 동치 — sha256 대리 지표 부재이므로 **수단 2 대비 출처 강도가 낮음** (§수용 기준 FR-03 참조).

4. **(G-D) 종횡비 보존 게이트** — FR-04
   - 절차: 아이콘 발화 노드의 선언 `width` / `height` 속성 비율이 자산 intrinsic 종횡비와 **|declared − intrinsic| ≤ 0.02** 이내.
   - 의미: `[in]` bug 는 정사각형이 아니다 (`LI-In-Bug.png` = 635×540, 1.17593). 현행 `Footer.tsx:54-55` 의 `width="27" height="27"` (비율 1.00000, 오차 0.17593) 는 형상 왜곡 — Brand Guidelines "Do not modify the shape" 위반이자, 자산 교체 시 그대로 승계되면 안 되는 값이다.
   - 적합 후보 (GitHub 아이콘 27px 높이 정렬 기준): `width="32" height="27"` → 1.18519, 오차 **0.00926** (≤ 0.02 충족).
   - 명시 `width`/`height` 부재 (CSS 전적 위임) 는 본 게이트 미판정이 아니라 **위반** — CLS 방지 목적의 intrinsic size 선언은 유지한다.

5. **(G-E) CSP allowlist 동시 축소 게이트** — FR-05
   - 절차: G-A 충족 (LinkedIn hotlink 0) 시점에 `brand.linkedin.com` 토큰이 **CSP 를 박제 중인 전 표면에서 동시 제거** 되고, 잔존 hit 은 0.
   - 결합 표면 전수 (HEAD `e1d3501` 실측, `brand.linkedin.com` 4 hit):

     | # | 표면 | 라인 | 성격 |
     |---|---|---|---|
     | 1 | `index.html` | `:9` `img-src 'self' data: https://d0.awsstatic.com https://brand.linkedin.com` | 원본 CSP directive |
     | 2 | `src/__tests__/csp-meta-build-artifact-preservation.test.ts` | `:49` | build artifact 보존 fixture 의 directive 문자열 박제 |
     | 3 | `specs/30.spec/blue/foundation/csp-meta-dev-strip-prod-preserve.md` | `:19` | 자매 spec §동작 의 원본 directive 박제 |
     | 4 | `src/common/Footer.tsx` | `:52` | 발화 원점 (G-A 대상) |

   - 추가 stale 후보 (게이트 대상 아님, 갱신 신호): `specs/20.req/20260518-csp-meta-img-src-allowlist-src-external-domain-token-coherence.md` 의 §baseline (`{d0.awsstatic.com, brand.linkedin.com}` 2-origin 집합) — 본 spec 이행 시 해당 req 의 baseline 은 1-origin 집합으로 재측정 필요. **req 큐 파일은 내용 수정 금지 (RULE-01)** 이므로, 정합 회복은 inspector 흡수 시점 재측정으로 위임한다.
   - 의미: 사용되지 않는 origin 이 allowlist 에 잔존하면 CSP 는 실효 없는 권한을 계속 승인한다 (vacuous 권한). 자산 이관과 권한 축소는 **원자적** 이다.
   - 이행 후 목표 문자열: `img-src 'self' data: https://d0.awsstatic.com` (외부 origin 2 → 1).

6. **(G-F) 접근성 · 링크 계약 보존 게이트** — FR-06
   - 절차: LinkedIn 앵커는 다음을 유지 — `href="https://www.linkedin.com/in/jongkil-park-48019576/"` / `rel="noopener noreferrer"` / `target="_blank"` / `title="LinkedIn Profile"`. 아이콘 노드는 접근 가능 이름을 제공 (`<img alt>` 비어있지 않음 — 수단 1 의 경우 `<title>` 또는 `aria-label` + `role="img"`).
   - 의미: 자산 교체는 **자산 축만** 바꾼다. 링크 대상·보안 속성·접근성 이름은 불변. 현행 `alt="[in]"` 은 깨진 이미지 fallback 텍스트로 노출되던 값이며, 교체 후에는 `alt="LinkedIn Profile"` 등 서술적 값이 바람직하나 **텍스트 자체는 수단 영역** (비어있지 않음만 박제).
   - Brand Guidelines 적합 용도 확인: "As a hyperlink to your LinkedIn profile" — 현 용도(개인 프로필 링크) 는 허용 용도에 해당.

7. **(G-G) 회귀 검출 채널 존재 게이트** — FR-07
   - G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E ∧ G-F 6 조건은 단위 테스트 (RTL 렌더 단언 + filesystem stat + sha256 + grep) 채널을 통해 rc=0/1 결정론으로 판정된다.
   - baseline: `src/common/Footer.test.tsx` **부재** (`ls src/common/*.test.*` → 14 파일, Footer 대응 0). 본 spec 이행은 Footer 전용 fixture 신설을 동반한다.
   - 발화 시점 채널 (pre-commit / pre-push / CI) 선정은 수단 영역이나 "발화 채널이 존재해야 한다" 는 계약 자체는 박제.

8. **(G-H) 네트워크 비의존 결정론** — NFR-01
   - G-A~G-F 판정은 **네트워크 호출 0** 으로 수행된다. 외부 URL 의 HTTP 상태 probe 는 게이트 조건이 아니다 (외부 가용성은 저장소가 통제하지 못하는 변수이며, CI 를 flaky 하게 만든다). 본 spec 은 "외부 상태를 감시" 하는 대신 **"외부 상태에 의존하지 않는 구조"** 를 강제하는 방식으로 (A) 축을 달성한다.
   - 동일 HEAD 상에서 N 회 실행 시 N 회 동일 rc + 동일 출력.

9. **(G-I) 시점 비의존** — NFR-02
   - G-A~G-F 는 LinkedIn 브랜드 자산 배포 인프라 변경 · `vite` 메이저 bump · CSP directive 갱신 · 푸터 아이콘 추가/삭제 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지. 이벤트 발생 시 1 PR 안에 6 조건 동시 만족 회복 또는 본 spec 갱신.

10. **(G-J) 자체 진단 제외**
    - 본 spec / 대응 테스트 본문의 `brand.linkedin.com` 문자열 occurrence 는 G-A / G-E 의 hit count 와 독립 — G-A scope 는 `src/**` 런타임 소스 (`*.test.*` 제외), G-E scope 는 §동작 5 의 결합 표면 4건으로 한정된다. 테스트 fixture 가 directive 문자열을 박제할 때는 **`'self' data: https://d0.awsstatic.com`** (이행 후 목표값) 을 박제하며 자기 자신을 위반 hit 으로 계수하지 않는다.

## 의존성

- **내부**: `src/common/Footer.tsx` (아이콘 3 발화 원점 — `:19` AWS `<img>`, `:34` GitHub inline `<svg>`, `:52` LinkedIn `<img>`), `index.html:9` (CSP `img-src` directive), `src/__tests__/csp-meta-build-artifact-preservation.test.ts:49` (directive 문자열 박제 fixture), `public/**` (수단 2 선택 시 vendored 자산 배치 경로), `src/styles/utilities.css:103,115` (`.footer` / `.span--footer-right` 레이아웃).
- **외부**: LinkedIn Brand Guidelines `[in]` Logo (`https://brand.linkedin.com/in-logo`) — 허용 용도 / 3색 변형 / shape·color 무변형 규정의 단일 공급원. LinkedIn 공식 배포 패키지 (`https://brand.linkedin.com/downloads` → `in-logo.zip`) — (B) 축 sha256 baseline 의 공급원. `d0.awsstatic.com` (AWS 자산 호스트 — 별 axis, 현 HTTP 200). POSIX `grep` / `test -f` / `shasum -a 256`, PNG IHDR 파싱 (G-C 픽셀 사이즈 판정).
- **역의존 (사용처)**: `foundation/csp-meta-dev-strip-prod-preserve.md` (green) — §동작 1 보조 절이 원본 directive 문자열을 박제하므로 G-E 이행 시 **동시 갱신 필수**. `specs/20.req/20260518-csp-meta-img-src-allowlist-src-external-domain-token-coherence.md` (ready) — 흡수 시점에 origin 집합 baseline 재측정 필요 (2-origin → 1-origin). `foundation/index-html-public-asset-reference-coherence.md` (green) — 수단 2 선택 시 `public/` 엔트리 수 baseline (§스코프 규칙 `ls public/` → 5 파일) 이 stale 화되나, 해당 spec 의 **게이트 조건 (G-A grep count 4 / G-B 4 파일 stat)** 은 불변이므로 위반 아님.
- **자매 spec**: `foundation/csp-meta-dev-strip-prod-preserve.md` — 동일 파일 (`index.html`) 의 별 axis (출력 비대칭 vs 자산 가용성). `common/test-helpers.md` — G-G fixture 신설 시 테스트 헬퍼 규약 준수 대상.

## 테스트 현황

회귀 fixture: `src/common/Footer.test.tsx` (8 `it`, 전수 PASS). 측정 HEAD=`f34203e` + 본 변경.

- [x] (G-A) `grep -rnE 'src="https?://(brand|content)\.linkedin\.com' src --exclude='*.test.*'` → **0 hit**. (박제 시점 baseline 1 hit → 회수 완료)
- [x] (G-B) LinkedIn 아이콘 = `'self'` 절대 경로 `<img src="/LI-In-Bug.png">` + `test -f public/LI-In-Bug.png` exit 0 (수단 2 채택).
- [x] (G-C) `shasum -a 256 public/LI-In-Bug.png` = `3c0149f26168b5fe0f43e68664abe40341a6443b3cd435d18a73e12f64f8b600` — 공식 패키지 `in-logo/LI-In-Bug.png` 와 바이트 동일.
- [x] (G-D) 선언 `32`×`27` = 1.18519 ↔ intrinsic 635×540 = 1.17593, 오차 **0.00926** ≤ 0.02. (박제 시점 baseline 27×27 오차 0.17593 → 회수 완료)
- [x] (G-E) `grep -rn "brand\.linkedin\.com" index.html src/ --exclude='*.test.*'` → **0 hit**. CSP `img-src` 외부 origin 집합 = `['https://d0.awsstatic.com']`. (박제 시점 baseline 4 hit → 회수 완료)
- [x] (G-F) 앵커 `href` / `rel="noopener noreferrer"` / `target="_blank"` / `title="LinkedIn Profile"` 4 속성 보존 + `alt` 비어있지 않음 (`"[in]"` → `"LinkedIn Profile"` 서술적 값으로 개선).
- [x] (G-G) 회귀 검출 채널 존재 — `src/common/Footer.test.tsx` 신설 (박제 시점 baseline: 파일 부재).
- [x] (G-J) 자체 진단 제외 — fixture 의 `grep` scope 가 `--exclude='*.test.*' --exclude-dir=__fixtures__` 로 런타임 소스 한정. 본 제외 없이는 fixture 자신의 문자열 occurrence 3 hit 이 게이트를 영구 FAIL 시킨다 (도입 시 실측).

## 수용 기준

- [x] (Must FR-01) `src/**` 런타임 소스에서 `brand.linkedin.com` / `content.linkedin.com` 을 향한 `<img src>` hotlink → **0 hit**.
- [x] (Must FR-02) LinkedIn `[in]` 아이콘은 `'self'` origin 절대 경로 `<img>` 로 발화되며 참조 basename 이 `public/` 에 실재한다.
- [x] (Must FR-03) vendored 자산이 LinkedIn 공식 배포 패키지 (`in-logo.zip`) 산출물과 sha256 동일 — 형상·색상 무변형의 기계 검증 대리 지표.
- [x] (Must FR-04) 아이콘 발화 노드가 명시 `width`/`height` 를 가지며 intrinsic 종횡비와의 차 ≤ 0.02.
- [x] (Must FR-05) `brand.linkedin.com` 토큰이 §동작 5 결합 표면 4건 전수에서 **동일 변경** 으로 제거됨. `index.html:9` = `img-src 'self' data: https://d0.awsstatic.com`.
- [x] (Must FR-06) LinkedIn 앵커의 링크 대상·보안 속성 4종 보존 + 아이콘 접근 가능 이름 비어있지 않음.
- [x] (Should FR-07) FR-01~FR-06 회귀가 `src/common/Footer.test.tsx` 8 `it` 로 rc=0/1 결정론 판정. CI 는 `npm test` step 으로 발화.
- [x] (Must NFR-01 네트워크 비의존) fixture 는 외부 HTTP 호출 0 — `readFileSync` / `execFileSync('grep')` / RTL 렌더만 사용. 외부 URL 라이브 probe 를 게이트 조건으로 삼지 않는다.
- [x] (Must NFR-04 수단 중립) inline `<svg>` / vendored raster 두 수단 모두 FR-02 를 만족한다. 본 회수는 sha256 출처 검증이 성립하는 vendored raster 를 채택했으며, 그 선택 근거는 라벨이 아니라 FR-03 판정 가능성이다.
- [x] (Must NFR-05 외부 비파괴) AWS 아이콘 (`Footer.tsx:19`) · GitHub inline `<svg>` (`Footer.tsx:34`) · 푸터 레이아웃 CSS 변경 0. `d0.awsstatic.com` 은 allowlist 에 잔존.
- [x] (Must, 회귀 가설 R-2) vendored 자산 변조 (1 byte append) 주입 → FR-03 sha256 불일치로 **검출 확인** (1 failed / 7 passed).
- [x] (Must, 회귀 가설 R-3) `width` 를 정사각 `27` 로 승계 주입 → FR-04 오차 0.17593 > 0.02 로 **검출 확인** (1 failed / 7 passed).
- [x] (Must, 회귀 가설 R-4) CSP allowlist 에 origin 재삽입 (vacuous 권한) 주입 → FR-05 **검출 확인** (2 failed / 6 passed — G-E 2 `it` 동시 발화).

## 스코프 규칙

- **expansion**: 불허 — 본 spec 의 게이트 충족 목적 변경은 아래 baseline 열거 표면 (`src/common/Footer.tsx`, `index.html`, `src/__tests__/csp-meta-build-artifact-preservation.test.ts`, `specs/30.spec/blue/foundation/csp-meta-dev-strip-prod-preserve.md`) + 신규 파일 (`src/common/Footer.test.tsx`, 수단 2 선택 시 `public/<asset>`) 로 한정. `d0.awsstatic.com` 관련 표면은 scope 밖이며 위반 hit 발견 시 `50.blocked/task/` 격리.
- **grep-baseline** (HEAD=`e1d3501`, 2026-08-24 실측):
  - `grep -rnE 'src="https?://' src --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js"` → **2 hits in 1 file**:
    - `src/common/Footer.tsx:19` — `src="https://d0.awsstatic.com/logos/powered-by-aws.png"` (별 axis, HTTP 200)
    - `src/common/Footer.tsx:52` — `src="https://brand.linkedin.com/content/dam/me/business/en-us/amp/brand-site/v2/bg/LI-Bug.svg.original.svg"` (**HTTP 404 — 본 spec 대상**)
  - `grep -rnE 'src="https?://(brand|content)\.linkedin\.com' src --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js"` → **1 hit in 1 file**:
    - `src/common/Footer.tsx:52`
  - `grep -rn "brand\.linkedin\.com" index.html src/ specs/30.spec/green/` → **4 hits in 4 files**:
    - `index.html:9`
    - `src/__tests__/csp-meta-build-artifact-preservation.test.ts:49`
    - `src/common/Footer.tsx:52`
    - `specs/30.spec/blue/foundation/csp-meta-dev-strip-prod-preserve.md:19`
  - `grep -c "<svg" src/common/Footer.tsx` → **1** (GitHub 아이콘 — inline 수단의 기존 선례).
  - `ls src/common/*.test.*` → **14 파일**, `Footer` 대응 **0** (G-G fixture 부재 baseline).
  - `wc -l src/common/Footer.tsx` → **64**.
  - 외부 상태 실측 (게이트 아님 — §역할 실증 근거로만 박제, 2026-08-24):
    - `curl -sI -L 'https://brand.linkedin.com/content/dam/me/business/en-us/amp/brand-site/v2/bg/LI-Bug.svg.original.svg'` → **404**, `content-type: text/html;charset=utf-8`, 687 byte.
    - `curl -sI -L 'https://d0.awsstatic.com/logos/powered-by-aws.png'` → **200**, `content-type: image/png`, 3,596 byte.
    - `curl -sL 'https://content.linkedin.com/content/dam/me/business/en-us/amp/xbu/linkedin-revised-brand-guidelines/logos/in-logo.zip'` → **200**, `application/zip`, 47,771 byte, 유효 엔트리 4 (§동작 3 표).
- **rationale**: G-A / G-E baseline 은 본 spec 박제 시점 실측 — 이행 후 두 값은 모두 0 이 되어야 하며, 0 이 아닌 값은 위반 검출 신호다. 외부 HTTP 실측은 **§역할 (A) 축의 실증 근거** 로만 박제하고 게이트 조건에서 배제한다 (NFR-01 — 외부 상태 의존은 CI 결정론을 깨뜨리며, 본 spec 의 해법은 "감시" 가 아니라 "의존 제거"). 공식 패키지 sha256 은 (B) 축의 유일한 기계 검증 대리 지표이므로 zip 취득 시점 (2026-08-24) 과 함께 박제한다 — 권리자가 패키지를 갱신하면 sha256 은 변경되며, 그 시점이 본 spec §동작 3 표의 갱신 신호다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-24 | (수동 등록) / HEAD `e1d3501` | 신규 박제 — Footer 브랜드 아이콘 자산의 가용성 / 출처 / CSP 권한 3-축 계약. LinkedIn `[in]` 로고 hotlink (`brand.linkedin.com/content/dam/**`) HTTP 404 회귀 실측 (LinkedIn 브랜드 자산 배포의 Adobe AEM 이관) 을 계기로, "외부 URL 안정성 비의존" 구조 불변식 + 공식 패키지 sha256 출처 박제 + 종횡비 보존 (`[in]` bug 는 정사각형 아님 — 635×540) + CSP `img-src` allowlist 원자적 축소 (4 결합 표면) + Footer 전용 회귀 fixture 신설 (현 부재) 을 박제. G-A 1 hit / G-D 오차 0.17593 / G-E 4 hit / G-G 파일 부재 — 4 게이트 위반 baseline. AWS 자산 (`d0.awsstatic.com`, HTTP 200) 은 별 axis 위임. | all (신규) |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | 회수 완료 — `public/LI-In-Bug.png` vendoring (공식 `in-logo.zip` 바이트 동일) + `Footer.tsx:52` self-origin 발화 + `32`×`27` 종횡비 보존 + `alt` 서술값 개선 + CSP `img-src` allowlist 축소 (외부 origin 2 → 1, 결합 표면 4건 동시) + `src/common/Footer.test.tsx` 신설 (8 `it`). R-2·R-3·R-4 회귀 주입 검출 확인. G-A~G-G + G-J / FR-01~FR-07 + NFR-01·04·05 전수 flip. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |

## 참고

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

아래는 미래 사건 또는 미부착 측정 채널을 전제하므로 체크박스로 두지 않는다.

- (G-H / NFR-02) 결정론·멱등 — 동일 HEAD 상 N 회 반복 시 동일 rc. 반복 측정 채널 미부착.
- (G-I / 시점 비의존) LinkedIn 브랜드 자산 배포 인프라 변경 후 1 PR 안에 G-A~G-F 동시 만족 회복 — 차기 이벤트 대기.
- (NFR-03 성능) grep + sha256 + IHDR 파싱 < 300 ms / 전체 < 2 s. 단독 분리 측정 미실시 (fixture 전체 Duration 672 ms 관측).
- (회귀 가설 R-1) 신규 브랜드 아이콘을 제3자 마케팅 사이트 hotlink 로 추가 → FR-01 검출. 주입 미실시.
- (회귀 가설 R-5) CSP 만 축소하고 `Footer.tsx` 는 hotlink 유지 → FR-01 + FR-05 동시 위반 검출. 주입 미실시 (R-4 주입 시 2 `it` 동시 발화로 원자성은 간접 확인).
- (회귀 가설 R-6) `rel="noopener noreferrer"` 누락 → FR-06 검출. 주입 미실시 (G-F 단언이 속성 4종을 직접 판정).

### 외부 출처
- LinkedIn Brand Guidelines `[in]` Logo — https://brand.linkedin.com/in-logo (허용 용도 / 승인 3색 / shape·color 무변형).
- 공식 배포 패키지 — https://brand.linkedin.com/downloads → `in-logo.zip` (2026-08-24 취득, 47,771 byte, 유효 엔트리 4).

### 별 axis 위임
- `src/common/Footer.tsx:19` AWS 자산 (`d0.awsstatic.com`, 취득 시점 HTTP 200) 의 self-host 이관 — 구조적 취약성은 동일하나 본 spec scope 외.
- `specs/20.req/20260518-csp-meta-img-src-allowlist-src-external-domain-token-coherence.md` (ready) — origin 집합 baseline 이 2-origin 에서 1-origin 으로 변경됨. 흡수 시점 재측정 필요.
