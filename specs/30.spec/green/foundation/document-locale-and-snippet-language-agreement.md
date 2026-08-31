# 문서가 선언한 로케일과 그 문서가 노출하는 요약문의 자연어는 같다

> **위치**: `index.html` 의 루트 `<html lang>` 선언과 같은 문서의 `<meta name="description">` content — 두 값은 **한 문서의 두 자기 서술**이다.
> **관련 요구사항**: REQ-20260901-085
> **최종 업데이트**: 2026-09-01 (by inspector 258차 tick — 최초 박제)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

한 문서가 자기 자연어를 두 번 선언한다 — 한 번은 `<html lang>` 로 기계에게, 한 번은 `<meta name="description">` 로 사람에게. **이 둘이 갈리면 문서가 자기를 부정한다.** 본 계약은 그 일치를 시스템 불변식으로 세운다.

**판정면은 문자 체계(script) 일치다.** 로케일 primary subtag 가 `ko` 면 요약문에 한글이 있어야 하고, `ko` 가 아니면 없어야 한다. 완전한 자연어 식별(NLP)이 아니라 **저장소 안에서 네트워크·외부 라이브러리 없이 결정론으로 판정 가능한 필요조건**을 판정면으로 삼는다 — 이 선택 자체가 계약의 일부이며, 더 강한 판정면을 원하면 언어 식별 채널 도입이 선행 조건이다.

**의도적으로 하지 않는 것**:
- **요약문의 문장 선택·SEO 품질** (길이·키워드·CTA) — 소유 spec `foundation/meta-description-default-fallback-token-coherence` 가 이미 범위 밖으로 선언했고 그 판단을 승계한다. 무엇을 쓸지는 취향 사안이다.
- **(H)(O)(D) 세 발화점의 토큰 동치 자체** — 이미 두 게이트가 잠근다 (`src/__tests__/meta-description-token-coherence.test.ts` G-D 가 (H)↔(D), `src/__tests__/link-preview-coherence.test.ts` 의 `it('공유 설명과 검색 설명이 같은 문장이다')` 가 (H)↔(O)). **현재 이미 참이고 위반 시 기존 게이트가 즉시 붉으므로 여기서 다시 소유하면 중복 게이트다** (`RULE-07 §반려 시그널`). 본 계약은 그 동치를 **전제로 승계**하고 §의존성 에 적는다.
- 글 단위 요약문 (프리렌더·SSR 선행 조건) · 다국어(`hreflang`) · `setHtmlTitle` 의 브랜드 suffix 축.
- `<html lang>` 값 자체의 BCP 47 유효성 — `foundation/html-lang-locale-declaration-contract` 소유.

## 공개 인터페이스

없음 (런타임 인터페이스 아님). 본 계약의 판정면은 `index.html` 의 두 선언과, 그 선언을 재는 게이트 자신의 상수 표기다.

## 동작

1. **로케일 도출** — `index.html` 루트 `<html>` 시작 태그의 `lang` 속성 값을 뽑고 primary subtag 를 취한다. 값이 없으면 **무판정(`exit 2`)** 이며 통과가 아니다.
2. **요약문 도출** — 같은 문서의 `name="description"` content 속성 값을 뽑는다. 없으면 무판정.
3. **문자 체계 대조** — primary subtag 가 `ko` 면 요약문의 한글 문자 수 ≥ 1, 아니면 = 0.
4. **단위 정합** — 요약문의 길이를 단언하는 상수는 **이름이 말하는 단위로 산출된 값**과만 비교된다. `String.prototype.length` 는 UTF-16 code unit 수이고 UTF-8 byte 수가 아니다. 둘은 ASCII 에서만 우연히 같다.
5. **하드코딩 커버리지** — 기대 요약문을 리터럴로 못 박은 게이트가 있으면, 그 게이트는 요약문이 사는 **모든** 발화점을 함께 읽는다. 일부만 읽으면 나머지가 조용히 갈린다.
6. **산출물 보존** — 크롤러가 실제로 받는 것은 `build/index.html` 이므로 소스 판정 결과가 산출물에서도 같아야 한다. 산출물이 없으면 무판정이다 — 소스 결과로 대체 추정하지 않는다.

## 의존성

- 내부: `index.html` (`<html lang>` · `name="description"` · `og:description`), `src/common/common.ts` (`DEFAULT_META_DESCRIPTION`), `src/__tests__/meta-description-token-coherence.test.ts` (기대 토큰·기대 길이 상수), `src/__tests__/link-preview-coherence.test.ts` ((H)↔(O) 잠금), `src/__tests__/html-lang-locale-declaration.test.ts` (로케일 선언 실재·BCP 47).
- 외부: WHATWG HTML Living Standard §3.2.6.2 (`lang` 속성 — 요소 내용의 자연어), §4.2.5.1 (`name="description"`), BCP 47 / RFC 5646 (primary subtag), Unicode Hangul 블록 (U+AC00–D7A3 음절 · U+1100–11FF 자모 · U+3130–318F 호환 자모), ECMA-262 §6.1.4 (String 은 UTF-16 code unit 열 — `length` 의 단위), POSIX `grep`/`test`/`find`, `perl` (멀티라인 속성 추출).
- 역의존 (사용처): 본 계약을 참조하는 spec 은 아래로 도출한다 — `bash -c 'set -- $(grep -rl "document-locale-and-snippet-language-agreement" specs/30.spec/green specs/30.spec/blue --include="*.md"); echo "revdep-docs=$#"; test "$#" -ge 1'` (자기 언급 1 건 포함 — 자기 문서가 모집단에서 빠지면 도출이 공허해지므로 제외하지 않는다).

## 테스트 현황

- [x] (I1 로케일 도출) 문서가 로케일을 선언하고 그 값이 primary subtag 로 도출된다: `bash -c 'L=$(perl -0777 -ne "print \$1 if /<html[^>]*lang=\"([^\"]+)\"/" index.html); test -n "$L" || exit 2; echo "document-locale=$L primary=${L%%-*}"; printf "%s" "$L" | grep -qE "^[A-Za-z]{2,3}([-][A-Za-z0-9]+)*$"'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `document-locale=ko primary=ko`. **정적 불변식이다.** **하한은 도출(`test -n`)에 걸고 판정은 문법에 건다** — 선언이 없으면 통과가 아니라 무판정이다.
- [ ] (I2 로케일 ↔ 요약문 문자 체계 일치 — **본 계약의 주 명제**) 선언한 로케일과 요약문의 문자 체계가 같다: `bash -c 'L=$(perl -0777 -ne "print \$1 if /<html[^>]*lang=\"([^\"]+)\"/" index.html); H=$(perl -0777 -ne "print \$1 if /name=\"description\"\s+content=\"([^\"]*)\"/" index.html); test -n "$L" -a -n "$H" || exit 2; K=$(printf "%s" "$H" | perl -CS -ne "\$n+=()=/[\x{AC00}-\x{D7A3}\x{1100}-\x{11FF}\x{3130}-\x{318F}]/g; END{print \$n+0}"); echo "locale=${L%%-*} snippet-hangul=$K snippet-len=${#H}"; if [ "${L%%-*}" = "ko" ]; then test "$K" -ge 1; else test "$K" -eq 0; fi'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `locale=ko snippet-hangul=0 snippet-len=63`. **정적 불변식이다.** **이것이 현 위반이다** — 문서는 `ko` 를 선언하고 요약문은 한글을 한 자도 담지 않는다. **양방향 판정이다**: `ko` 인데 한글 0 도, `ko` 가 아닌데 한글이 있는 것도 붉는다 — 한쪽만 재면 로케일을 `en` 으로 바꾸는 반대 방향 회귀가 통과한다.
- [ ] (I3 길이 단언 단위 정합) `byte` 를 이름에 담은 상수가 code unit 산출과 비교되지 않는다: `bash -c 'f=src/__tests__/meta-description-token-coherence.test.ts; test -f "$f" || exit 2; n=$(grep -cE "[A-Z_]*BYTE[A-Z_]*" "$f"); test "$n" -ge 1 || exit 2; bad=$(grep -cE "\.length\)?[^)]*\)\.toBe\([A-Za-z_]*BYTE[A-Za-z_]*\)" "$f"); echo "byte-named-consts=$n codeunit-compared=$bad"; test "$bad" -eq 0'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `byte-named-consts=3 codeunit-compared=2`. **정적 불변식이다.** **하한은 모집단(`n>=1`)에, 0 은 산출(`bad`)에 건다** — 이름에 `BYTE` 를 담은 상수가 하나도 없으면 이 게이트는 자명하게 통과하므로 무판정으로 닫는다. 현 위반은 `:102`·`:103` 의 `expect(H.length).toBe(EXPECTED_BYTE_LENGTH)` 두 줄이다. **ASCII 에서는 63 == 63 이라 어느 게이트도 붉지 않는다** — 한국어로 바꾸는 순간 값과 이름이 동시에 틀린다.
- [ ] (I4 하드코딩 기대 토큰의 발화점 커버리지) 기대 요약문을 리터럴로 못 박은 게이트는 모든 발화점을 함께 읽는다: `bash -c 'f=src/__tests__/meta-description-token-coherence.test.ts; test -f "$f" || exit 2; H=$(perl -0777 -ne "print \$1 if /name=\"description\"\s+content=\"([^\"]*)\"/" index.html); test -n "$H" || exit 2; hard=$(grep -cF "\"$H\"" "$f"); echo "hardcoded-token-literals=$hard"; test "$hard" -eq 0 && exit 0; grep -qF "og:description" "$f"'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `hardcoded-token-literals=1`. **정적 불변식이다.** **하드코딩을 금지하지 않는다 — 하드코딩의 대가를 요구한다**: 리터럴을 못 박았으면 (H)(O)(D) 를 한 파일에서 함께 재거나, 도출로 바꿔 리터럴을 없애거나 둘 중 하나다. 현재는 (H)(D) 만 읽고 (O) `og:description` 은 다른 파일이 잠그므로 **네 발화점을 한 단위로 강제하는 게이트가 없다.**
- [x] (I5 요약문 리터럴 표기) 요약문이 HTML entity·Unicode escape 우회 없이 리터럴로 적혀 있다: `bash -c 'H=$(perl -0777 -ne "print \$1 if /name=\"description\"\s+content=\"([^\"]*)\"/" index.html); test -n "$H" || exit 2; e=$(printf "%s" "$H" | grep -cE "&[A-Za-z#][A-Za-z0-9]*;|\\\\u[0-9A-Fa-f]{4}"); echo "snippet-escapes=$e"; test "$e" -eq 0'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `snippet-escapes=0`. **정적 불변식이다.** 비-ASCII 요약문을 entity 로 우회하면 (H)↔(D) byte 동치가 형식적으로만 성립하고 사람이 읽는 값은 갈린다 — 그 우회로를 미리 닫는다.
- [ ] (I6 산출물 보존) 크롤러가 받는 문서에서도 같은 요약문이다: `bash -c 'test -f build/index.html || exit 2; S=$(perl -0777 -ne "print \$1 if /name=\"description\"\s+content=\"([^\"]*)\"/" index.html); B=$(perl -0777 -ne "print \$1 if /name=\"description\"\s+content=\"([^\"]*)\"/" build/index.html); test -n "$S" -a -n "$B" || exit 2; echo "src-len=${#S} build-len=${#B}"; test "$S" = "$B"'` → HEAD=`eb62529` 실측 **rc=2 (무판정 — `build/` 부재)**. **정적 불변식이다.** **`exit 2` 로 닫는 이유**: 산출물이 없는 상태를 "차이 없음 = 통과" 로 읽으면 이 항이 조용히 빠진다. 소스 결과로 산출물을 추정하지 않는다 (`RULE-06 §관측 표면`).
- [x] (I7 소유 spec 전제 정정) 요약문 토큰을 소유하는 계약이 **비-ASCII 를 배제하지 않고** 길이 박제 오류를 담지 않는다: `bash -c 'f=$(find specs/30.spec/green specs/30.spec/blue -name "meta-description-default-fallback-token-coherence.md" | head -1); test -n "$f" || exit 2; n=$(grep -cF "67 byte" "$f"); echo "stale-byte-claims=$n owner=$f"; test "$n" -eq 0'` → HEAD=`eb62529` 흡수 **전** 실측 **rc=1** (`stale-byte-claims=3`), 같은 tick 의 green 재개봉 후 재실측 **rc=0** (`stale-byte-claims=0`, owner 가 green 경로로 도출됨). **정적 불변식이다.** 소유 spec 이 자기 안에서 63 과 67 을 둘 다 박제하고 있고 실측은 63 이다. **경로를 못 박지 않고 `find` 로 도출하며 green 을 먼저 본다** — 같은 slug 가 두 브랜치에 동시에 있을 때 승격 baseline 이 아니라 편집 중인 green 을 읽어야 한다.

## 수용 기준

- [x] (Must, FR-01 전제) 위 §테스트 현황 (I1 로케일 도출) 명령 → rc=0. HEAD=`eb62529` 실측 rc=0 (`document-locale=ko`).
- [ ] (Must, FR-01) 위 §테스트 현황 (I2 로케일 ↔ 요약문 문자 체계 일치) 명령 → rc=0.
- [ ] (Must, FR-04) 위 §테스트 현황 (I3 길이 단언 단위 정합) 명령 → rc=0 (`codeunit-compared` = 0).
- [ ] (Must, FR-03) 위 §테스트 현황 (I4 하드코딩 기대 토큰의 발화점 커버리지) 명령 → rc=0.
- [x] (Must, NFR-02) 위 §테스트 현황 (I5 요약문 리터럴 표기) 명령 → rc=0. HEAD=`eb62529` 실측 rc=0.
- [ ] (Should, FR-06 · NFR-03) 위 §테스트 현황 (I6 산출물 보존) 명령 → rc=0. **현재 rc=2 무판정** — `build/` 산출 후에 판정 가능해진다.
- [x] (Must, FR-05) 위 §테스트 현황 (I7 소유 spec 전제 정정) 명령 → rc=0 (`stale-byte-claims` = 0). HEAD=`eb62529` 재개봉 후 실측 rc=0 (`stale-byte-claims=0`).
- [x] (Must, 승계 — 재소유하지 않음) (H)(O)(D) 세 발화점의 토큰 동치는 기존 두 게이트가 잠그며 본 계약은 그것을 전제로 승계한다: `bash -c 'a=src/__tests__/meta-description-token-coherence.test.ts; b=src/__tests__/link-preview-coherence.test.ts; test -f "$a" -a -f "$b" || exit 2; grep -qF "byte-for-byte" "$a" || grep -qF "EXPECTED_TOKEN" "$a" || exit 1; grep -qF "공유 설명과 검색 설명이 같은 문장이다" "$b"'` → HEAD=`eb62529` 실측 **rc=0**. **정적 불변식이다.** 승계 대상 게이트가 사라지면 본 계약의 전제가 무너지므로 그 실재를 여기서 잰다 — **동치 자체를 다시 재지는 않는다.**
- [x] (Must, 범위 제한) 요약문의 문장 선택·SEO 품질 · 글 단위 요약문 · 다국어 · `<html lang>` 값의 BCP 47 유효성 · (H)(O)(D) 동치의 재소유는 본 계약의 요구 대상이 아니다 — §역할 · §참고.

## 스코프 규칙

- **expansion**: 불허 — 판정 대상은 `index.html` · `src/common/common.ts` · 위 두 게이트 파일 · 소유 spec 문서로 한정한다.
- **grep-baseline**: HEAD=`eb62529` 실측 (격리 사본 `git clone --local`)
  - `perl` 추출 `<html lang>` → 1 값 `ko`
  - `perl` 추출 `name="description"` content → 1 값 (63 code unit / 63 UTF-8 byte — ASCII 라 우연히 같다)
  - `grep -cE "[A-Z_]*BYTE[A-Z_]*" src/__tests__/meta-description-token-coherence.test.ts` → 3 hits
  - `grep -cE "\.length\)?[^)]*\)\.toBe\([A-Za-z_]*BYTE[A-Za-z_]*\)" …` → 2 hits (`:102`, `:103`)
  - `grep -cF "67 byte" <소유 spec>` → 3 hits
- **rationale**: 요약문이 사는 곳은 넷이고 그 넷 밖의 파일을 정상화 목적으로 바꿀 이유가 없다. 게이트 상수 정정도 그 게이트 파일 안에서 끝난다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 258차 tick (Phase 3, REQ-20260901-085 흡수) / — @ HEAD=`eb62529` | 최초 박제 — 로케일 ↔ 요약문 자연어 일치 7 축 (I1~I7). **신설한 판단**: 요구사항이 건드리는 넷 중 (H)(O)(D) 동치는 이미 두 게이트가 잠그고 있어 재소유하면 `RULE-07 §반려 시그널` 의 중복 게이트가 된다. 남는 새 명제는 **로케일과 요약문의 자연어 일치**(소유처 없음) · **길이 단언의 단위 정합** · **하드코딩 기대 토큰의 발화점 커버리지** 셋이며 그것만 소유한다. **판정면 선택도 계약의 일부로 박제했다**: 완전한 자연어 식별이 아니라 문자 체계 일치를 잰다 — 저장소 안에서 네트워크·라이브러리 없이 결정론으로 판정 가능한 필요조건이기 때문이다. 소유 spec 의 63/67 자기모순 정정은 (I7) 로 걸고 그 정정 자체는 같은 tick 의 green 재개봉분에서 수행한다. | all |

## 참고

- 요구사항: `specs/60.done/2026/09/01/req/20260901-document-locale-and-snippet-language-agreement.md` (REQ-20260901-085).
- 소유 spec (전제 승계 + (I7) 정정 대상): `foundation/meta-description-default-fallback-token-coherence` — 본 tick 에 green 으로 재개봉해 63/67 박제 오류와 *"ASCII literal baseline 한정"* 전제를 정정했다.
- 인접 계약: `foundation/html-lang-locale-declaration-contract` (로케일 선언 실재·BCP 47 — 값의 **유효성**을 소유하고 본 계약은 값의 **일치**를 소유한다).
- 형제 계약 (같은 신고에서 분리): `foundation/share-card-image-consumable-dimensions` (REQ-086) · `foundation/crawler-index-entry-point-route-coherence` (REQ-087).

### 미측정·비판정 항목

- 검색 엔진이 이 스니펫을 그대로 노출하는지 — Google 은 질의에 따라 본문에서 재생성한다. 저장소 밖 관측이며 판정 대상이 아니다.
- 한국어 요약문이 영어 요약문보다 "좋은지" — 소유 spec 이 범위 밖으로 선언한 축이다.
- **문자 체계 일치가 자연어 일치의 충분조건은 아니다.** 한글을 담은 일본어 문장 같은 병리적 입력은 (I2) 를 통과한다. 필요조건으로 충분한 이유는 이 저장소의 요약문이 사람이 쓴 한 문장이고 표기 혼용이 없기 때문이며, 그 전제가 깨지면 언어 식별 채널 도입이 선행 조건이 된다.
- **`build/index.html` 판정은 현재 무판정(`exit 2`)이다** — 산출물이 저장소에 없다. `RULE-07 §수용 기준 문장 규약` 의 미측정 부류가 아니라 **측정 채널은 있고 입력이 없는** 상태이며, 빌드 산출 후 같은 명령으로 판정된다.
