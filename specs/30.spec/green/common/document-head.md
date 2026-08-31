# 문서 머리 계약

> **위치**: `index.html` · `public/robots.txt` · `public/sitemap.xml` · `src/common/common.ts`(`DEFAULT_META_DESCRIPTION` · `getUrl`) · `src/Log/LogSingle.tsx`(런타임 description)
> **게이트**: `src/__tests__/` 의 `link-preview-coherence` · `meta-description-token-coherence` · `csp-origin-coverage` · `sitemap-route-coherence` · `share-card-dimensions` (5파일 31 케이스)
> **최종 업데이트**: 2026-09-01 (운영자 — 문서 머리·SEO 계약 8건 통합)

## 역할

문서가 **자기가 무엇인지 정확히 선언하고, 그 선언이 산출물까지 보존된다.**

**방어 대상**: 선언이 조용히 어긋나는 회귀. 이 축의 독자는 사람이 아니라 **크롤러와 공유 미리보기**이므로 화면에서 확인되지 않는다 — 검색 결과와 카톡 미리보기에서만 드러나고 그때는 이미 나간 뒤다.

**전제 (범위 밖)**: 이 사이트는 클라이언트 렌더이고 프리렌더가 없다. `build/index.html` 의 body 는 `<div id="root"></div>` 뿐이므로 **JS 를 돌리지 않는 크롤러는 아래 선언만 받는다.** 글 단위 미리보기는 서버 렌더나 프리렌더가 선행 조건이며 본 계약은 그것을 요구하지 않는다.

## 동작 — 문서 정체성

1. **로케일 선언**: `lang` 속성을 가진 `<html>` 시작 태그가 **정확히 1개**이고 값이 BCP 47 primary-subtag 문법을 만족한다. 애플리케이션 코드가 런타임에 덮어쓰지 않는다.

2. **뷰포트 선언**: viewport 메타가 정확히 1회 선언되고 content 는 기기폭 + 배율 1 조합이다. **사용자 확대를 막는 토큰이 없다** — `manifest.json` 의 `display` 가 `standalone` 인 동안 이 셋은 필수다.

## 동작 — 색인

3. **색인 의도는 두 채널에서 같다**: `<meta name="robots">` (페이지 수준) 와 `public/robots.txt` (path 수준) 가 의미상 동치다 — 양쪽 다 허용이거나 양쪽 다 차단이다. 한쪽만 바뀌면 크롤러가 어느 쪽을 따르는지에 결과가 갈린다.

4. **크롤러 진입점이 실재한다**: `sitemap.xml` 이 sitemaps.org 스키마로 파싱 가능하고, `robots.txt` 에 `Sitemap: <절대 URL>` 이 **정확히 1회** 있으며 그 URL 이 실재 파일에 대응한다.

5. **사이트맵 URL 집합은 라우트에서 도출한다**: `src/App.tsx` 최상위 `<Route path>` 와 `src/Log/Log.tsx` 비인증 분기의 중첩 경로에서 계산한다. `*`(404)·리디렉트 전용 경로는 제외하고, **인증 분기에만 있는 경로(`/log/write`)도 제외**한다. 모든 `<loc>` 의 오리진은 `common.getUrl()` 의 운영 도메인과 같다.

6. **사이트맵 부재는 통과가 아니다.** 없으면 무판정이며 "불일치 0" 으로 읽지 않는다. `Sitemap:` 선언 추가가 색인 의도(현 baseline: 전면 허용)를 바꾸지 않는다.

## 동작 — 요약문과 공유 카드

7. **요약문은 한 문장이고 네 곳이 같다**: `index.html` 의 `description` content · `og:description` · `DEFAULT_META_DESCRIPTION` · 그 값을 리터럴로 못 박은 게이트. **기대 요약문을 리터럴로 박은 게이트는 요약문이 사는 모든 발화점을 함께 읽는다** — 일부만 읽으면 나머지가 조용히 갈린다.

8. **요약문의 문자 체계는 로케일과 일치한다**: `lang` primary subtag 가 `ko` 면 요약문에 한글이 1자 이상, 아니면 0자다. **문서가 자기 언어를 두 곳에서 다르게 말하지 않는다.**

9. **길이 상수는 이름이 말하는 단위로 잰다**: `String.prototype.length` 는 UTF-16 code unit 수이지 UTF-8 byte 수가 아니다. 둘은 ASCII 에서만 우연히 같다.

10. **공유 카드 그림은 소비 가능한 규격이다**: 양 축 ≥ 200px — 권장이 아니라 문서화된 **최소치**다. 종횡비와 `twitter:card` 가 한 벌로 움직인다 (1.91:1 계열 → `summary_large_image`, 정사각 → `summary`). `og:image:width|height` 를 선언했으면 실제 픽셀과 같아야 한다.

## 동작 — 보안

11. **CSP 는 dev 에서 걷히고 prod 에서 보존된다.** `vite serve` 산출에는 0건, `vite build` 산출에는 보존된다. `frame-ancestors` 는 meta 로 전달되면 명세상 무시되므로 이 채널로 클릭재킹을 방어하지 않는다 — HTTP 응답 헤더(저장소 밖)의 몫이다.

## 동작 — 공통

12. **산출물 보존**: 위 선언은 `vite build` 를 거쳐 `build/index.html` 에서도 같아야 한다. **크롤러가 실제로 받는 것은 산출물이다.** 산출물이 없으면 무판정이며 소스 결과로 대체 추정하지 않는다.

13. **판정은 도출한다**: 대상 목록을 열거하지 않는다. 도출이 공집합이면 통과가 아니라 무판정 실패다.

## 수용 기준

- [x] 링크 미리보기 정합: `bash -c 'npx vitest run src/__tests__/link-preview-coherence.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 요약문 토큰 정합: `bash -c 'npx vitest run src/__tests__/meta-description-token-coherence.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 로케일 선언 단일성: `bash -c 'test "$(grep -c "<html lang=" index.html)" -eq 1'` → rc=0
- [x] 확대 차단 토큰 0: `bash -c '! grep -qE "user-scalable=no|maximum-scale=1" index.html'` → rc=0
- [x] 요약문 문자 체계 일치 (8): `bash -c 'npx vitest run src/__tests__/meta-description-token-coherence.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 크롤러 진입점 실재 (4)(5): `bash -c 'npx vitest run src/__tests__/sitemap-route-coherence.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 공유 카드 규격 (10): `bash -c 'npx vitest run src/__tests__/share-card-dimensions.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0

## 참고

### 통합 이력 (2026-09-01)

아래 8건을 합쳤다. 문서 머리는 한 파일(`index.html`)의 한 블록인데 계약이 여덟 곳에 흩어져 있었고, 그중 다섯이 `foundation/` 에 있어 제품 계약처럼 보이지 않았다.

`html-lang-locale-declaration-contract` · `viewport-meta-mobile-rendering-contract` · `meta-robots-robotstxt-policy-semantic-coherence` · `meta-description-default-fallback-token-coherence` · `csp-meta-dev-strip-prod-preserve` · `document-locale-and-snippet-language-agreement` · `crawler-index-entry-point-route-coherence` · `share-card-image-consumable-dimensions`

**게이트는 삭제하지 않았다.**

### 미측정·비판정 항목

- **프리렌더 부재** — 글 단위 공유 미리보기와 본문 색인은 배포 구조 결정이며 저장소 안에서 닫히지 않는다. 사장님 판단 사안.
- **canonical** — 정적으로 넣으면 모든 URL 을 `/` 의 중복이라 선언해 없는 것보다 나쁘다. 라우트별 형태는 런타임 주입이라 JS 크롤러에만 닿는다. 프리렌더 도입 시 재검토한다.
- **JSON-LD** — 정적으로 유효한 부분(`WebSite`·`Person`)이 지금 메타 태그가 같은 크롤러에게 이미 주는 사실을 반복한다. 프리렌더 도입 시 재검토한다.
