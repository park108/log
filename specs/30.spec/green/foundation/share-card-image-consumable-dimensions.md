# 공유 카드 그림은 실재만이 아니라 소비처가 요구하는 규격을 만족한다

> **위치**: `index.html` 의 `og:image` · `twitter:card` 선언과 그것이 가리키는 `public/**` 자산의 **이미지 헤더**.
> **관련 요구사항**: REQ-20260901-086
> **최종 업데이트**: 2026-09-01 (by inspector 258차 tick — 최초 박제)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

공유 카드 그림의 판정면은 **실재가 아니라 소비 가능성**이다. 파일이 디스크에 있다는 것은 카드가 그려진다는 뜻이 아니다 — 소비처는 최소 치수를 문서화해 두었고 그 아래는 카드를 **그리지 않는다**. 본 계약은 `og:image` 대상 자산의 **실제 픽셀 치수·종횡비·용량**과 `twitter:card` 종류와의 정합을 시스템 불변식으로 세운다.

**판정면은 이미지 바이너리 헤더다** (PNG IHDR). 파일명(`logo192.png`)·manifest 의 `sizes` 문자열·`og:image:width` 선언값은 전부 **대리 표면**이며 실물과 갈릴 수 있다 — 갈리는 것이 바로 이 계약이 막으려는 것이다.

**의도적으로 하지 않는 것**:
- **글 단위 공유 그림** — 프리렌더·SSR 선행 조건(배포 구조 결정). 현재는 사이트 수준 카드 하나가 모든 공유에 쓰이므로 **그 하나의 규격이 곧 전부**다.
- 그림의 **디자인·내용** (무엇을 그릴지) — 취향 사안.
- `favicon` · `apple-touch-icon` · manifest icons 의 규격 — 각각 소유 spec 이 있는 별 axis.
- manifest 의 `sizes` 토큰 ↔ 디스크 픽셀 동치 — `foundation/manifest-icons-sizes-token-disk-coherence` 소유. **본 계약은 그것을 재소유하지 않고 (I9) 로 두 계약의 결합면만 계수한다.**

## 공개 인터페이스

없음 (런타임 인터페이스 아님). 판정면은 `index.html` 의 `og:image`·`twitter:card`·(선택) `og:image:width|height` 선언과 대상 자산의 바이너리 헤더다.

## 동작

1. **대상 도출** — `index.html` 의 `og:image` content 에서 **경로만** 취해 `public/` 아래 로컬 자산에 매핑한다. 네트워크 접근은 없다. 선언이 없거나 자산이 없으면 **무판정(`exit 2`)** 이다.
2. **치수 판독** — PNG 시그니처 뒤 IHDR 청크의 width·height 를 바이트에서 읽는다. 헤더를 24 바이트 못 읽으면 무판정이다.
3. **최소 요건** — 양 축 ≥ 200 px. 이것은 권장이 아니라 **문서화된 최소치**다.
4. **카드 종류 정합** — 종횡비와 `twitter:card` 값이 한 벌로 움직인다. 1.91:1 계열이면 `summary_large_image`, 정사각이면 `summary`. 한쪽만 바꾸면 그림이 잘리거나 여백이 남는다.
5. **선언-실물 동치** — `og:image:width|height` 가 **있으면** 실제 픽셀과 같아야 한다. 없으면 이 항은 공허하게 통과하며 그 사실을 출력에 적는다.
6. **용량·산출물** — 보수적 상한 5 MB 이하이고, 크롤러가 실제로 받는 `build/**` 에서도 같은 결과여야 한다.

## 의존성

- 내부: `index.html` (`og:image` · `twitter:card` · `og:image:width|height`), `public/**` (대상 자산), `public/manifest.json` (자산 공유 여부 — (I9)), `src/__tests__/link-preview-coherence.test.ts` (현 실재 판정 게이트 — (I8) 의 대상).
- 외부: Open Graph protocol (`og:image` — <https://ogp.me/>), Facebook Sharing 문서 (*"The minimum allowed image dimension is 200 x 200 pixels"* · *"at least 1200 x 630"* · *"as close to 1.91:1 as possible"* · *"must not exceed 8 MB"* — <https://developers.facebook.com/docs/sharing/webmasters/images/>), X Cards 문서 (`summary` ↔ `summary_large_image`), W3C PNG 명세 §11.2.2 (IHDR — 시그니처 8 byte + length 4 + type 4 뒤 width·height 각 4 byte big-endian), POSIX `grep`/`test`/`wc`, `perl` (바이너리 `unpack`).
- 역의존 (사용처): 본 계약을 참조하는 spec 은 아래로 도출한다 — `bash -c 'set -- $(grep -rl "share-card-image-consumable-dimensions" specs/30.spec/green specs/30.spec/blue --include="*.md"); echo "revdep-docs=$#"; test "$#" -ge 1'` (자기 언급 포함 — 제외하면 도출이 공허해진다).

## 테스트 현황

- [ ] (I1 최소 규격 — **본 계약의 주 명제**) `og:image` 대상 자산의 실제 픽셀이 문서화된 최소치 이상이다: `bash -c 'P=$(perl -0777 -ne "print \$1 if /property=\"og:image\"\s+content=\"([^\"]*)\"/" index.html); test -n "$P" || exit 2; A="public/${P##*/}"; test -f "$A" || exit 2; set -- $(perl -e "open(F,q{<},\$ARGV[0]) or exit 2; binmode F; read(F,\$b,24)==24 or exit 2; my(\$w,\$h)=unpack(q{x16NN},\$b); print qq{\$w \$h\n}" "$A"); test "$#" -eq 2 || exit 2; echo "og-image=$A pixels=${1}x${2}"; test "$1" -ge 200 -a "$2" -ge 200'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `og-image=public/logo192.png pixels=192x192`. **정적 불변식이다.** **이것이 현 위반이며 등급은 권장 미달이 아니라 최소 미달이다** — 192 < 200 이고 **두 축 모두** 그렇다. **하한은 도출(`test -n`·`test -f`·헤더 24 byte)에, 판정은 픽셀에 건다** — 선언이나 파일이 없으면 통과가 아니라 무판정이다.
- [x] (I2 카드 종류 ↔ 종횡비 정합) 카드 종류와 그림 비율이 한 벌로 움직인다: `bash -c 'P=$(perl -0777 -ne "print \$1 if /property=\"og:image\"\s+content=\"([^\"]*)\"/" index.html); C=$(perl -0777 -ne "print \$1 if /name=\"twitter:card\"\s+content=\"([^\"]*)\"/" index.html); test -n "$P" -a -n "$C" || exit 2; A="public/${P##*/}"; test -f "$A" || exit 2; set -- $(perl -e "open(F,q{<},\$ARGV[0]) or exit 2; binmode F; read(F,\$b,24)==24 or exit 2; my(\$w,\$h)=unpack(q{x16NN},\$b); print qq{\$w \$h\n}" "$A"); test "$#" -eq 2 || exit 2; R=$(( $1 * 100 / $2 )); echo "twitter-card=$C pixels=${1}x${2} ratio-x100=$R"; if [ "$C" = "summary_large_image" ]; then test "$R" -ge 170 -a "$R" -le 210; else test "$R" -ge 90 -a "$R" -le 110; fi'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `twitter-card=summary pixels=192x192 ratio-x100=100`. **정적 불변식이다.** **양방향이다**: 1.91:1 그림에 `summary` 를 남겨도, 정사각 그림에 `summary_large_image` 를 붙여도 붉는다. **이 항이 (I1) 정상화의 안전장치다** — 그림만 1200x630 으로 바꾸고 카드 종류를 그대로 두면 정사각으로 잘려 교체 효과가 상쇄되는데, 그 상태를 이 항이 붉힌다.
- [ ] (I3 선언-실물 동치) `og:image:width|height` 가 선언돼 있으면 실제 픽셀과 같다: `bash -c 'n=$(grep -cE "property=\"og:image:(width|height)\"" index.html); echo "og-image-dimension-metas=$n"; test "$n" -eq 0 && exit 0; W=$(perl -0777 -ne "print \$1 if /property=\"og:image:width\"\s+content=\"([^\"]*)\"/" index.html); H=$(perl -0777 -ne "print \$1 if /property=\"og:image:height\"\s+content=\"([^\"]*)\"/" index.html); P=$(perl -0777 -ne "print \$1 if /property=\"og:image\"\s+content=\"([^\"]*)\"/" index.html); A="public/${P##*/}"; test -f "$A" || exit 2; set -- $(perl -e "open(F,q{<},\$ARGV[0]) or exit 2; binmode F; read(F,\$b,24)==24 or exit 2; my(\$w,\$h)=unpack(q{x16NN},\$b); print qq{\$w \$h\n}" "$A"); test "$#" -eq 2 || exit 2; echo "declared=${W}x${H} actual=${1}x${2}"; test "$W" = "$1" -a "$H" = "$2"'` → HEAD=`eb62529` 실측 **rc=0 (공허 통과 — 선언 0 건)**, 출력 `og-image-dimension-metas=0`. **정적 불변식이다.** **지금은 공허하고 그 사실을 출력이 말한다** — 조건부 계약이므로 선언이 도입되는 순간 실물이 된다. 마커를 `[x]` 로 두지 않는 이유는 **공허 통과를 충족으로 읽지 않기 위해서**다.
- [ ] (I4 권장 규격) 대상 자산이 권장 규격 이상이다: `bash -c 'P=$(perl -0777 -ne "print \$1 if /property=\"og:image\"\s+content=\"([^\"]*)\"/" index.html); test -n "$P" || exit 2; A="public/${P##*/}"; test -f "$A" || exit 2; set -- $(perl -e "open(F,q{<},\$ARGV[0]) or exit 2; binmode F; read(F,\$b,24)==24 or exit 2; my(\$w,\$h)=unpack(q{x16NN},\$b); print qq{\$w \$h\n}" "$A"); test "$#" -eq 2 || exit 2; echo "pixels=${1}x${2} recommended=1200x630"; test "$1" -ge 1200 -a "$2" -ge 630'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `pixels=192x192 recommended=1200x630`. **정적 불변식이다.** (I1) 과 갈라 둔 이유: **최소 미달과 권장 미달은 등급이 다르다.** 한 항으로 합치면 200x200 자산으로 고치고도 계속 붉어 "고쳤는데 왜 빨간가" 가 되고, 반대로 권장만 재면 최소 미달이라는 사실이 문면에서 사라진다.
- [x] (I5 용량) 대상 자산이 소비처 상한 이하다: `bash -c 'P=$(perl -0777 -ne "print \$1 if /property=\"og:image\"\s+content=\"([^\"]*)\"/" index.html); test -n "$P" || exit 2; A="public/${P##*/}"; test -f "$A" || exit 2; S=$(wc -c < "$A" | tr -d " "); echo "og-image-bytes=$S limit=5242880"; test "$S" -le 5242880'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `og-image-bytes=2005 limit=5242880`. **정적 불변식이다.** 상한은 페이스북 8 MB 가 아니라 **더 좁은 X/LinkedIn 5 MB** 로 잡는다 — 여러 소비처를 만족해야 하므로 교집합이 계약이다.
- [ ] (I6 산출물 보존) 크롤러가 받는 문서와 자산에서도 같다: `bash -c 'test -f build/index.html || exit 2; S=$(perl -0777 -ne "print \$1 if /property=\"og:image\"\s+content=\"([^\"]*)\"/" index.html); B=$(perl -0777 -ne "print \$1 if /property=\"og:image\"\s+content=\"([^\"]*)\"/" build/index.html); test -n "$S" -a -n "$B" || exit 2; test -f "build/${B##*/}" || exit 1; echo "src=$S build=$B"; test "$S" = "$B"'` → HEAD=`eb62529` 실측 **rc=2 (무판정 — `build/` 부재)**. **정적 불변식이다.** 소스 결과로 산출물을 추정하지 않는다 (`RULE-06 §관측 표면`).
- [x] (I7 인접 계약 무충돌) 신규 자산 추가가 정적 자원 참조 계수를 흔들지 않는다: `bash -c 'n=$(grep -cE "manifest|favicon|apple.touch.icon|theme.color" index.html); echo "asset-ref-lines=$n"; test "$n" -eq 4'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `asset-ref-lines=4`. **정적 불변식이다.** `index-html-public-asset-reference-coherence` **G-A** 는 `manifest|favicon|apple.touch.icon|theme.color` 네 토큰이 있는 행만 세므로 `og:image` 행은 어느 토큰과도 매치하지 않는다 — **경로를 바꾸거나 `<meta>` 를 더해도 4 로 불변**임을 여기서 잰다. G-B/G-C 는 네 파일을 **이름으로 열거**해 `test -f` 하므로 다섯 번째 파일 추가는 무영향이고, G-D 는 manifest → 디스크 **방향**이라 미등록 신규 자산은 무영향이다.
- [ ] (I8 판정면이 효력면인가) `og:image` 를 재는 게이트가 실재가 아니라 **치수를 읽는다**: `bash -c 'f=src/__tests__/link-preview-coherence.test.ts; test -f "$f" || exit 2; e=$(grep -cE "og:image" "$f"); test "$e" -ge 1 || exit 2; d=$(grep -cE "IHDR|readUInt32BE|unpack|치수|dimension" "$f"); echo "og-image-assertions=$e dimension-reads=$d"; test "$d" -ge 1'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `og-image-assertions=2 dimension-reads=0`. **정적 불변식이다.** **하한은 모집단(`e>=1`)에, 판정은 산출(`d`)에 건다** — `og:image` 를 아예 안 재는 파일이면 무판정이어야지 통과가 아니다. 현 게이트는 `existsSync` 뿐이라 **1x1 투명 PNG 로 바꿔도 초록이다.** 이것이 `foundation/gate-effective-surface-and-variant-battery` §역할 의 *"게이트는 대리 표면이 아니라 효력면을 잰다"* 의 미적용 사례다.
- [x] (I9 두 계약의 결합면 계수) `og:image` 대상이 manifest 에도 등록된 자산인지 계수한다: `bash -c 'P=$(perl -0777 -ne "print \$1 if /property=\"og:image\"\s+content=\"([^\"]*)\"/" index.html); B="${P##*/}"; test -n "$B" || exit 2; m=public/manifest.json; test -f "$m" || exit 2; n=$(grep -cF "$B" "$m"); echo "og-image-file=$B manifest-registrations=$n"; test "$n" -le 1'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `og-image-file=logo192.png manifest-registrations=1`. **정적 불변식이다.** **manifest 의 `sizes` ↔ 디스크 동치는 재지 않는다** (소유 spec 이 있다). 여기서 재는 것은 **결합 여부**뿐이며, 값이 1 이라는 것은 *"이 자산을 제자리에서 키우면 두 계약이 동시에 움직인다"* 는 뜻이다 — 그래서 **신규 자산 추가가 제자리 교체보다 싸다.** 값이 0 이 되면(신규 자산 채택) 결합이 끊긴 것이고 그때도 rc=0 이다: 이 항은 결합을 금지하지 않고 **보이게** 한다.

## 수용 기준

- [ ] (Must, FR-01·FR-02) 위 §테스트 현황 (I1 최소 규격) 명령 → rc=0 (양 축 ≥ 200).
- [x] (Must, FR-05) 위 §테스트 현황 (I2 카드 종류 ↔ 종횡비 정합) 명령 → rc=0. HEAD=`eb62529` 실측 rc=0.
- [ ] (Should, FR-04) 위 §테스트 현황 (I3 선언-실물 동치) 명령 → rc=0 **이면서 선언이 0 이 아닐 때** 충족으로 읽는다. 현재는 공허 통과다.
- [ ] (Should, FR-03) 위 §테스트 현황 (I4 권장 규격) 명령 → rc=0 (≥ 1200x630).
- [x] (Should, FR-06) 위 §테스트 현황 (I5 용량) 명령 → rc=0. HEAD=`eb62529` 실측 rc=0.
- [ ] (Must, FR-07 · NFR-03) 위 §테스트 현황 (I6 산출물 보존) 명령 → rc=0. **현재 rc=2 무판정** — `build/` 산출 후 판정 가능해진다.
- [x] (Must, FR-08) 위 §테스트 현황 (I7 인접 계약 무충돌) 명령 → rc=0. HEAD=`eb62529` 실측 rc=0 (`asset-ref-lines=4`).
- [ ] (Must, NFR-02 효력면) 위 §테스트 현황 (I8 판정면이 효력면인가) 명령 → rc=0 (`dimension-reads` ≥ 1).
- [x] (Must, FR-08 결합면) 위 §테스트 현황 (I9 두 계약의 결합면 계수) 명령 → rc=0. HEAD=`eb62529` 실측 rc=0.
- [x] (Must, 범위 제한) 글 단위 공유 그림 · 그림의 디자인·내용 · favicon/apple-touch-icon/manifest icons 의 규격 · manifest `sizes` ↔ 디스크 동치의 재소유는 본 계약의 요구 대상이 아니다 — §역할 · §참고.

## 스코프 규칙

- **expansion**: 불허 — 판정 대상은 `index.html` · `og:image` 가 가리키는 `public/**` 자산 1 개 · `public/manifest.json` · `src/__tests__/link-preview-coherence.test.ts` 로 한정한다.
- **grep-baseline**: HEAD=`eb62529` 실측 (격리 사본 `git clone --local`)
  - `og:image` content → `https://www.park108.net/logo192.png` (1 값)
  - `twitter:card` content → `summary` (1 값)
  - PNG IHDR (`public/logo192.png`) → **192 x 192**, 2005 byte
  - `grep -cE "property=\"og:image:(width|height)\"" index.html` → **0** hits
  - `grep -cE "manifest|favicon|apple.touch.icon|theme.color" index.html` → **4** hits
  - `grep -cE "og:image" src/__tests__/link-preview-coherence.test.ts` → **2** hits · 치수 판독 표현 → **0** hits
  - `grep -cF "logo192.png" public/manifest.json` → **1** hit (`icons[1].sizes: "192x192"`)
- **rationale**: 공유 그림은 하나이고 그것을 선언하는 곳도 한 파일이다. 인접 계약 확인은 읽기 전용 계수이며 그 계약들의 판정면을 건드리지 않는다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 258차 tick (Phase 3, REQ-20260901-086 흡수) / — @ HEAD=`eb62529` | 최초 박제 — 공유 그림 소비 가능성 9 축 (I1~I9). **최소 미달과 권장 미달을 갈라 둔 것이 첫 판단**: 192 < 200 은 문서화된 **최소치** 위반이라 등급이 한 칸 위이며, 한 항으로 합치면 200x200 로 고친 뒤에도 계속 붉어 등급 정보가 사라진다. **(I2) 를 Must 로 둔 것이 둘째 판단**: 그림만 키우고 `twitter:card` 를 `summary` 로 두면 정사각으로 잘려 교체 효과가 상쇄되므로, 두 값은 한 벌이고 그 결합을 게이트가 져야 한다. **(I9) 로 재소유 대신 결합면만 계수한 것이 셋째**: manifest `sizes` ↔ 디스크 동치는 소유 spec 이 있으므로 다시 재면 중복 게이트이고, 여기서 필요한 정보는 *"제자리 교체가 두 계약을 동시에 움직이는가"* 뿐이다 — 그 값이 1 이라는 사실이 **신규 자산 추가가 제자리 교체보다 싸다**는 판단의 근거다. **(I3) 을 `[x]` 로 두지 않은 것이 넷째**: 선언이 0 건이라 rc=0 이지만 그것은 공허 통과이고, 공허를 충족으로 읽으면 무판정이 통과가 된다. | all |

## 참고

- 요구사항: `specs/60.done/2026/09/01/req/20260901-share-card-image-consumable-dimensions.md` (REQ-20260901-086).
- 현 게이트 ((I8) 의 대상): `src/__tests__/link-preview-coherence.test.ts` 의 `it('공유 그림이 실재하는 파일을 가리킨다')` — `existsSync` 만 판정한다.
- 인접 계약: `foundation/index-html-public-asset-reference-coherence` (§동작 G-A~G-D) · `foundation/manifest-icons-sizes-token-disk-coherence`.
- 판정면 원칙: `foundation/gate-effective-surface-and-variant-battery` §역할.
- 형제 계약: `foundation/document-locale-and-snippet-language-agreement` (REQ-085) · `foundation/crawler-index-entry-point-route-coherence` (REQ-087).

### 미측정·비판정 항목

- 카카오톡·슬랙·트위터가 실제로 렌더한 카드의 시각적 결과 — 저장소 밖 관측이다. 판정면은 규격 준수까지다.
- 그림 교체가 공유 클릭률에 미치는 영향 — 측정 채널 부재.
- **JPEG·WebP 자산의 치수 판독** — 현 대상이 PNG 하나라 IHDR 만 읽는다. 다른 포맷을 채택하면 SOF/VP8X 판독이 선행 조건이며, 그때 (I1)(I2)(I4) 의 판독 단계를 확장한다. **지금 미리 넣지 않는 이유는 모집단이 1 이고 그 1 이 PNG 이기 때문**이며, 포맷이 바뀌면 헤더 24 byte 판독이 `exit 2` 무판정으로 닫혀 조용히 통과하지 않는다.
- **`og:image` 가 여러 개 선언된 경우** — 현재 1 개다. 복수 선언은 소비처마다 선택 규칙이 다르므로 계약을 세우려면 그 규칙을 먼저 정해야 한다.
