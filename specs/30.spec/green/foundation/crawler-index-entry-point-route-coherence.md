# 크롤러의 색인 진입점은 존재하며, 그 URL 집합은 비인증 라우트 정의에서 도출된다

> **위치**: `public/robots.txt` 의 `Sitemap:` 선언과 `public/sitemap.xml`, 그리고 그 URL 집합의 진실 공급원인 `src/App.tsx` · `src/Log/Log.tsx` 의 라우트 정의.
> **관련 요구사항**: REQ-20260901-087
> **최종 업데이트**: 2026-09-01 (by inspector 258차 tick — 최초 박제)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

이 사이트에는 크롤러가 **JS 를 실행하지 않고** 페이지 목록을 얻을 수 있는 경로가 하나도 없다. 내부 링크는 전부 클라이언트 렌더 결과이고 정적 문서의 body 는 빈 `<div id="root">` 뿐이다. 본 계약은 **색인 진입점의 실재**와, 그 진입점이 나열하는 **URL 집합이 라우트 정의에서 도출**되며 **인증 전용 경로를 포함하지 않음**을 시스템 불변식으로 세운다.

**이 표면의 다른 항목들과 달리 이 계약은 배경 상수에 깎이지 않는다.** `og:*`·`description` 은 크롤러가 **문서를 이미 가져온 뒤** 소비하므로 URL 을 알고 있어야 쓸모가 있다. 사이트맵은 **URL 을 알아내는 채널 자체**이고 `robots.txt` 처럼 별도 fetch 로 전달되므로 JS 렌더링과 무관하다. 그리고 이 사이트에는 URL 을 알아낼 다른 경로가 없다.

**손으로 적은 목록을 판정면으로 쓰지 않는다** (`RULE-06 §열거 고정 금지`). 손 목록은 라우트가 바뀌면 조용히 낡지만, 도출된 목록은 갈리는 순간 붉는다. **`/log/write` 제외는 장식이 아니다** — 관리자 전용 작성 화면이 사이트맵에 실리면 검색 결과에 노출되며, 손으로 적는 사이트맵에서 가장 흔한 사고다.

**의도적으로 하지 않는 것**:
- **글 단위 URL(`/log/:timestamp`) 등재** — 빌드가 로그 API 에 의존하게 되며 그 의존 도입은 배포 구조 결정이다. **다만 URL 집합을 "도출된 정적 라우트" 로 열어 두어 그 확장을 막지 않는다.**
- `<link rel="canonical">` — **순진한 구현이 현상보다 나쁘다.** 정적 `index.html` 에 홈 canonical 을 넣으면 모든 URL 이 `/` 의 중복본이라고 선언하게 되어 개별 글이 색인에서 통합·탈락하는 방향이다. 올바른 형태는 라우트별 canonical 이고 그것은 런타임 주입인데, 런타임 주입은 배경 상수가 지목한 바로 그 크롤러들에게 도달하지 않는다 — **효과는 한 부류에만, 위험은 전 부류에** 걸린다. **본 계약이 서면 정규 주소 집합이 사이트맵에 명시되므로 재평가한다.**
- JSON-LD — 정적으로 유효한 사이트 수준 스키마가 담는 정보(사이트 이름·URL·저자)를 `index.html` 의 `og:site_name`·`og:title`·`og:url` 이 이미 같은 크롤러에게 같은 값으로 제공한다. 새로 지킬 불변식이 없다. **프리렌더 도입 시 글 수준 `BlogPosting` 이 유효해지며 이 판정은 뒤집힌다.**
- `<meta name="robots">` ↔ `robots.txt` 의미 동치 — `foundation/meta-robots-robotstxt-policy-semantic-coherence` 소유. **그 spec 의 sitemap 배제 선언을 뒤집지 않는다**: 그것은 색인 *의도* 동치를 소유하고 사이트맵은 색인 *발견* 이라 다른 명제다. 넘어오는 것은 배제 결정이 아니라 **측정 상수 하나**(§(I6))다.
- `lastmod`·`changefreq`·`priority` 값의 정확성 · 검색 콘솔 제출 (저장소 밖).

## 공개 인터페이스

없음 (런타임 인터페이스 아님). 판정면은 `public/robots.txt` · `public/sitemap.xml` · 라우트 정의 소스 · 빌드 산출물이다.

## 동작

1. **라우트 도출** — `src/App.tsx` 의 최상위 `<Route path>` 와 `src/Log/Log.tsx` 의 **마지막 `<Routes>` 블록**(비인증 분기)의 중첩 경로에서 정적 URL 집합을 계산한다. `*`(404) · `/`(리다이렉트 출발점) · 파라미터(`:`) 는 제외하고, `/log/*` 는 접두사로 전개한다. 도출이 비면 **무판정(`exit 2`)** 이다.
2. **인증 분기 차집합** — 인증 분기에만 있는 경로가 인증 전용이다. 현 트리에서 그 집합은 정확히 `/write` 하나이며, 전개하면 `/log/write` 다.
3. **진입점 실재** — `sitemap.xml` 이 실재하고 sitemaps.org 스키마로 파싱 가능하며, `robots.txt` 에 `Sitemap: <절대 URL>` 이 정확히 1 회 있고 그 URL 경로가 실재 파일과 대응한다.
4. **집합 대조** — 사이트맵의 `<loc>` 경로 집합과 도출 집합이 **양방향으로 일치**한다. 사이트맵이 없으면 무판정이다 — 없음을 "불일치 0" 으로 읽지 않는다.
5. **오리진 일치** — 모든 `<loc>` 의 오리진이 `common.getUrl()` 의 운영 도메인과 같다.
6. **의도 불변** — `Sitemap:` 선언 추가가 `robots.txt` 의 색인 **의도**(현 baseline: 전면 허용)를 바꾸지 않는다.

## 의존성

- 내부: `public/robots.txt`, `public/sitemap.xml`(미착지), `src/App.tsx` (최상위 라우트), `src/Log/Log.tsx` (인증/비인증 분기 중첩 라우트), `src/common/common.ts` (`getUrl()` 운영 도메인), `index.html` (`og:url` 오리진).
- 외부: sitemaps.org 프로토콜 (<https://www.sitemaps.org/protocol.html> — `urlset`/`url`/`loc` 스키마, `Sitemap:` 선언이 *"works independently of user-agent lines and can appear anywhere in the file"*, 파일 한도 50,000 URL / 50 MB 비압축), RFC 9309 §2.2.2 (`Disallow:` 빈 값 = 전면 허용), Vite `publicDir` 복사 규칙, POSIX `grep`/`sed`/`sort`/`uniq`/`wc`, `perl`.
- 역의존 (사용처): 본 계약을 참조하는 spec 은 아래로 도출한다 — `bash -c 'set -- $(grep -rl "crawler-index-entry-point-route-coherence" specs/30.spec/green specs/30.spec/blue --include="*.md"); echo "revdep-docs=$#"; test "$#" -ge 1'` (자기 언급 포함 — 제외하면 도출이 공허해진다).

## 테스트 현황

- [x] (I9 라우트 도출 건전성 — **다른 모든 항의 선행 조건**) 두 분기가 실재하고 인증 전용 차집합이 비어 있지 않다: `bash -c 'f=src/Log/Log.tsx; test -f "$f" || exit 2; n=$(perl -0777 -ne "\$c=()=/<Routes>.*?<\/Routes>/gs; print \$c+0" "$f"); test "$n" -eq 2 || exit 2; A=$(perl -0777 -ne "if(/<Routes>(.*?)<\/Routes>/s){ print join(qq{\n}, \$1=~/<Route path=\"([^\"]*)\"/g), qq{\n} }" "$f" | sort -u); B=$(perl -0777 -ne "my @b; while(/<Routes>(.*?)<\/Routes>/gs){ push @b,\$1 } print join(qq{\n}, \$b[-1]=~/<Route path=\"([^\"]*)\"/g), qq{\n}" "$f" | sort -u); a=$(printf "%s\n" "$A" | grep -c .); b=$(printf "%s\n" "$B" | grep -c .); D=$(printf "%s\n%s\n" "$A" "$B" | sort | uniq -u | grep .); d=$(printf "%s\n" "$D" | grep -c .); echo "route-blocks=$n auth-routes=$a unauth-routes=$b auth-only=$d [$(printf "%s" "$D" | tr "\n" " ")]"; test "$a" -gt "$b" -a "$b" -ge 1 -a "$d" -ge 1'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `route-blocks=2 auth-routes=4 unauth-routes=3 auth-only=1 [/write]`. **정적 불변식이다.** **하한을 셋에 건다** — 블록 2 개(`-eq 2`), 비인증 집합 비공허, 인증 전용 비공허. 셋 중 하나라도 무너지면 도출이 공허해지고 그 위에 선 모든 판정이 자명하게 통과한다. **주입 왕복 실측**: 비인증 블록에 `/write` 를 넣자 `auth-only` 가 1 → 0 이 되고 rc=1, 원복 시 rc=0. 손 목록이 아니라 소스가 진실 공급원임을 이 왕복이 보인다.
- [ ] (I1 진입점 실재) `sitemap.xml` 이 실재하고 스키마로 파싱된다: `bash -c 's=public/sitemap.xml; if [ ! -f "$s" ]; then echo "sitemap-file=absent"; exit 1; fi; perl -0777 -ne "exit 1 unless /<urlset[^>]*>/ && /<url>/ && /<loc>/" "$s" || exit 1; n=$(grep -cE "<loc>" "$s"); echo "sitemap-file=present loc-count=$n"; test "$n" -ge 1'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `sitemap-file=absent`. **정적 불변식이다.** **부재를 `exit 2` 무판정이 아니라 `exit 1` 위반으로 닫는다** — 본 계약이 세우는 명제가 바로 *"실재한다"* 이므로, 없는 것은 못 잰 것이 아니라 어긴 것이다. 뒤따르는 (I3)(I4)(I5) 는 반대로 무판정이다: 그것들은 사이트맵의 *내용*에 관한 명제라 사이트맵이 없으면 잴 대상이 없다.
- [ ] (I2 선언-파일 대응) `robots.txt` 의 `Sitemap:` 선언이 정확히 1 회이고 실재 파일과 대응한다: `bash -c 'r=public/robots.txt; test -f "$r" || exit 2; n=$(grep -cE "^Sitemap:[[:space:]]+https?://" "$r"); echo "robots-sitemap-decls=$n"; test "$n" -eq 1 || exit 1; u=$(grep -E "^Sitemap:" "$r" | head -1 | sed "s/^Sitemap:[[:space:]]*//"); p="public/${u##*/}"; echo "declared=$u expects=$p"; test -f "$p"'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `robots-sitemap-decls=0`. **정적 불변식이다.** 선언과 파일 중 한쪽만 있는 상태가 가장 나쁘다 — 크롤러가 404 를 받거나, 파일이 있어도 발견되지 않는다.
- [ ] (I3 집합 도출 대조 — **본 계약의 주 명제**) 사이트맵 URL 집합이 라우트 정의에서 도출된 집합과 양방향으로 일치한다: `bash -c 'a=src/App.tsx; l=src/Log/Log.tsx; test -f "$a" -a -f "$l" || exit 2; E=$(perl -e "local \$/; open my \$A,q{<},\$ARGV[0] or exit 2; my \$x=<\$A>; open my \$L,q{<},\$ARGV[1] or exit 2; my \$y=<\$L>; my @t=\$x=~/<Route\s+path=\"([^\"]*)\"/g; my @b=\$y=~/<Routes>(.*?)<\/Routes>/gs; exit 2 unless @t && @b; my @u=\$b[-1]=~/<Route path=\"([^\"]*)\"/g; exit 2 unless @u; my %o; for my \$t (@t){ next if \$t eq q{*} or \$t eq q{/}; if(\$t=~m{^(.*)/\\*\$}){ my \$p=\$1; for my \$q (@u){ next if \$q=~/:/; \$o{\$q eq q{/} ? \$p : \$p.\$q}=1 } next } next if \$t=~/:/; \$o{\$t}=1 } print join(qq{\n}, sort keys %o), qq{\n}" "$a" "$l"); test -n "$E" || exit 2; e=$(printf "%s\n" "$E" | grep -c .); s=public/sitemap.xml; if [ ! -f "$s" ]; then echo "derived-urls=$e [$(printf "%s" "$E" | tr "\n" " ")] sitemap=absent (무판정)"; exit 2; fi; S=$(grep -oE "<loc>[^<]*</loc>" "$s" | sed -E "s#</?loc>##g; s#^https?://[^/]+##" | sed -E "s#^\$#/#" | sort -u); d=$(printf "%s\n%s\n" "$E" "$S" | sort | uniq -u | grep -c .); echo "derived-urls=$e sitemap-urls=$(printf "%s\n" "$S" | grep -c .) mismatch=$d"; test "$d" -eq 0'` → HEAD=`eb62529` 실측 **rc=2 (무판정 — 사이트맵 부재)**, 출력 `derived-urls=4 [/file /log /log/search /monitor] sitemap=absent (무판정)`. **정적 불변식이다.** **도출은 사이트맵 없이도 돌고 그 결과를 출력에 박제한다** — 무판정이어도 *무엇과 대조할 것인지*는 이미 계산돼 보인다. **주입 왕복 실측 (판정 창 밖과 무감의 구별)**: 비인증 블록에 `/write` 를 주입하자 rc 는 2 로 **불변**이지만 출력이 `derived-urls=4 [...]` → `derived-urls=5 [/file /log /log/search /log/write /monitor]` 로 움직였다. **rc 만 봤다면 미주입·창 밖·무감이 구별되지 않았을 것이다** — 게이트 출력 수치를 rc 와 함께 본 것이 그 셋을 갈랐다. 원복 시 4 로 복귀.
- [ ] (I4 인증 전용 경로 제외) 인증 전용 경로가 사이트맵에 없다: `bash -c 's=public/sitemap.xml; if [ ! -f "$s" ]; then echo "sitemap-file=absent (무판정)"; exit 2; fi; n=$(grep -cE "<loc>[^<]*/log/write" "$s"); echo "auth-only-in-sitemap=$n"; test "$n" -eq 0'` → HEAD=`eb62529` 실측 **rc=2 (무판정 — 사이트맵 부재)**. **정적 불변식이다.** **부재를 통과로 읽지 않는 것이 이 항의 요점이다** — 사이트맵이 없으면 *"인증 경로가 안 실려 있다"* 는 공허하게 참이고, 그 공허를 `[x]` 로 적으면 사이트맵이 생긴 뒤에도 아무도 다시 보지 않는다.
- [ ] (I5 오리진 일치) 모든 `<loc>` 오리진이 코드의 운영 도메인과 같다: `bash -c 's=public/sitemap.xml; if [ ! -f "$s" ]; then echo "sitemap-file=absent (무판정)"; exit 2; fi; O=$(perl -0777 -ne "print \$1 if /return\s+\"(https:\/\/[^\"]+)\"/" src/common/common.ts); test -n "$O" || exit 2; H=$(printf "%s" "$O" | sed -E "s#^(https?://[^/]+).*#\1#"); bad=$(grep -oE "<loc>[^<]*</loc>" "$s" | sed -E "s#<loc>(https?://[^/]+).*#\1#" | grep -vc "^$H$"); echo "prod-origin=$H foreign-origin-locs=$bad"; test "$bad" -eq 0'` → HEAD=`eb62529` 실측 **rc=2 (무판정 — 사이트맵 부재)**. **정적 불변식이다.** 도메인의 진실 공급원은 `common.getUrl()` 이며 (`link-preview-coherence` 가 `og:url` 과의 오리진 동치를 이미 잠근다), 사이트맵이 옛 도메인에 남으면 죽은 주소 목록을 제출하게 된다.
- [ ] (I6 소유 spec 측정 상수 정합) 인접 계약이 박제한 `robots.txt` 행 수 baseline 이 실측과 같다: `bash -c 'f=$(find specs/30.spec/green specs/30.spec/blue -name "meta-robots-robotstxt-policy-semantic-coherence.md" | head -1); test -n "$f" || exit 2; test -f public/robots.txt || exit 2; a=$(wc -l < public/robots.txt | tr -d " "); c=$(grep -F "wc -l < public/robots.txt" "$f" | grep -oE "출력 = [0-9]+" | grep -oE "[0-9]+" | head -1); echo "robots-wc-l=$a owner-claim=${c:-none}"; test -n "$c" || exit 2; test "$a" -eq "$c"'` → HEAD=`eb62529` 실측 **rc=1**, 출력 `robots-wc-l=2 owner-claim=3`. **정적 불변식이다.** **요구사항의 전제를 실측이 정정했다**: req 는 *"현재 3 이고 `Sitemap:` 줄을 더하면 4 가 되어 붉는다"* 고 적었으나, **`wc -l` 은 지금 이미 2 이고 소유 spec 의 주장 3 과 갈려 있다** — 파일에 trailing newline 이 없어 `wc -l` 이 개행 수 2 를 센다. 소유 spec 은 이 격차를 산문으로 인정하면서(*"trailing newline 부재로 2 보고"*) 명령의 기대값은 3 으로 남겨 두었다. **즉 이 baseline 은 사이트맵과 무관하게 이미 낡았고**, `Sitemap:` 줄 추가는 그것을 4 로 만드는 것이 아니라 **이미 틀린 값을 한 칸 더 밀 뿐**이다. 정합 회복은 소유 spec 을 green 으로 재개봉해 **행 수 대신 정책 구조**를 재는 형태로 바꾸는 것이며, 그 재개봉은 사이트맵 착지 task 와 **같은 단위**에 있어야 한다 (`RULE-06 §계약을 뒤집는 task`).
- [x] (I8 색인 의도 불변) `Sitemap:` 추가가 색인 의도를 바꾸지 않는다: `bash -c 'r=public/robots.txt; test -f "$r" || exit 2; g=$(grep -cE "^User-agent:" "$r"); d=$(grep -cE "^Disallow:" "$r"); v=$(grep -E "^Disallow:" "$r" | sed "s/^Disallow:[[:space:]]*//" | tr -d " "); echo "user-agent-groups=$g disallow-lines=$d disallow-value=[$v]"; test "$g" -eq 1 -a "$d" -eq 1 -a -z "$v"'` → HEAD=`eb62529` 실측 **rc=0**, 출력 `user-agent-groups=1 disallow-lines=1 disallow-value=[]`. **정적 불변식이다.** 이 항은 **`Sitemap:` 줄 추가 전후로 값이 같아야 하는 안전장치**다 — `Sitemap:` 은 `User-agent` group 에 속하지 않으므로 group 수도 `Disallow` 값도 건드리지 않는다. 착지 후 이 항이 갈리면 그 변경은 의도를 바꾼 것이고 소유 spec 의 영역을 침범한 것이다.
- [ ] (I7 산출물 보존) 빌드 산출물에도 진입점이 보존된다: `bash -c 'test -f build/robots.txt || { echo "build=absent (무판정)"; exit 2; }; test -f build/sitemap.xml || exit 1; n=$(grep -cE "^Sitemap:" build/robots.txt); echo "build-sitemap-decls=$n"; test "$n" -eq 1'` → HEAD=`eb62529` 실측 **rc=2 (무판정 — `build/` 부재)**. **정적 불변식이다.** Vite `publicDir` 복사 결과가 판정 대상이며, 소스 결과로 추정하지 않는다.

## 수용 기준

- [x] (Must, FR-03 선행 조건 · NFR-03) 위 §테스트 현황 (I9 라우트 도출 건전성) 명령 → rc=0. HEAD=`eb62529` 실측 rc=0 (`auth-only=1 [/write]`).
- [ ] (Must, FR-01) 위 §테스트 현황 (I1 진입점 실재) 명령 → rc=0.
- [ ] (Must, FR-02) 위 §테스트 현황 (I2 선언-파일 대응) 명령 → rc=0.
- [ ] (Must, FR-03) 위 §테스트 현황 (I3 집합 도출 대조) 명령 → rc=0 (`mismatch` = 0). **현재 rc=2 무판정.**
- [ ] (Must, FR-04) 위 §테스트 현황 (I4 인증 전용 경로 제외) 명령 → rc=0. **현재 rc=2 무판정 — 공허 통과를 충족으로 읽지 않는다.**
- [ ] (Must, FR-05) 위 §테스트 현황 (I5 오리진 일치) 명령 → rc=0. **현재 rc=2 무판정.**
- [ ] (Must, FR-06) 위 §테스트 현황 (I6 소유 spec 측정 상수 정합) 명령 → rc=0 (`robots-wc-l` == `owner-claim`).
- [x] (Must, FR-09) 위 §테스트 현황 (I8 색인 의도 불변) 명령 → rc=0. HEAD=`eb62529` 실측 rc=0.
- [ ] (Must, FR-07) 위 §테스트 현황 (I7 산출물 보존) 명령 → rc=0. **현재 rc=2 무판정.**
- [x] (Must, 범위 제한) 글 단위 URL 등재 · canonical · JSON-LD · `lastmod`/`changefreq`/`priority` 값 · 검색 콘솔 제출 · `<meta name="robots">` 의미 동치는 본 계약의 요구 대상이 아니다 — §역할 · §참고.

## 스코프 규칙

- **expansion**: 불허 — 판정 대상은 `public/robots.txt` · `public/sitemap.xml` · `src/App.tsx` · `src/Log/Log.tsx` · `src/common/common.ts` · `build/**` · 인접 소유 spec 문서로 한정한다.
- **grep-baseline**: HEAD=`eb62529` 실측 (격리 사본 `git clone --local`)
  - `find . -name "sitemap*" -not -path "./node_modules/*"` → **0 hit**
  - `grep -cE "^Sitemap:" public/robots.txt` → **0**
  - `wc -l < public/robots.txt` → **2** · `wc -c` → **67** (trailing newline 없음, 내용상 3 행)
  - `<Route path>` — `src/App.tsx` 5 개(`/`, `/log/*`, `/file`, `/monitor`, `*`) · `src/Log/Log.tsx` 인증 4 개 / 비인증 3 개
  - 도출 정적 URL 집합 → **4** (`/file`, `/log`, `/log/search`, `/monitor`) · 인증 전용 차집합 → **1** (`/write`)
  - `getUrl()` 운영 도메인 → `https://www.park108.net/` · `og:url` 오리진 동일
- **rationale**: 색인 진입점은 두 파일이고 그 내용의 진실 공급원은 라우트 정의 두 파일이다. 인접 계약 확인은 읽기 전용 계수다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 258차 tick (Phase 3, REQ-20260901-087 흡수) / — @ HEAD=`eb62529` | 최초 박제 — 색인 진입점 9 축 (I1~I9). **별 spec 을 세우고 인접 계약을 넓히지 않은 것이 첫 판단**: `meta-robots-robotstxt-policy-semantic-coherence` 는 색인 *의도* 동치를 소유하고 사이트맵은 색인 *발견* 이라 다른 명제이며, 한 spec 이 둘을 나눠 가지면 중복이 된다. 넘어오는 것은 배제 결정이 아니라 측정 상수 하나다. **무판정과 위반을 갈라 둔 것이 둘째**: (I1) 은 *"실재한다"* 가 명제 자신이므로 부재가 `exit 1` 위반이고, (I3)(I4)(I5) 는 사이트맵 *내용*에 관한 명제라 부재가 `exit 2` 무판정이다 — 특히 (I4) 는 사이트맵이 없으면 공허하게 참이 되므로 그 공허를 `[x]` 로 적지 않는 것이 요점이다. **(I9) 를 선행 조건으로 세운 것이 셋째**: 도출이 공허하면 그 위의 모든 판정이 자명하게 통과하므로 하한을 셋(블록 2 · 비인증 비공허 · 인증 전용 비공허)에 건다. **요구사항 전제 1건을 실측이 정정했다**: req 는 소유 spec 의 `wc -l` baseline 이 3 이고 사이트맵 착지로 4 가 되어 깨진다고 적었으나, **실측 2 라 이미 깨져 있다** — 사이트맵과 무관하게 낡은 상수이며 (I6) 이 그것을 잰다. **주입 왕복 1건을 격리 사본에서 실행**했고, 그 왕복이 rc 불변·출력 변동이라는 형태로 *"판정 창 밖"* 과 *"무감"* 의 구별 필요성을 실물로 보였다. | all |

## 참고

- 요구사항: `specs/60.done/2026/09/01/req/20260901-crawler-index-entry-point-route-coherence.md` (REQ-20260901-087). **신고 5 격차 전체의 채택·기각 판정표가 그 문서 §소유·범위 판정 에 있다.**
- 인접 계약 (측정 상수 갱신 대상): `foundation/meta-robots-robotstxt-policy-semantic-coherence` §동작 G-B (행 수 baseline) · G-D (의도 매핑 — 불변 확인 대상, (I8)).
- 라우트 정의: `src/App.tsx` (`<Route path>` 5) · `src/Log/Log.tsx` (인증/비인증 두 `<Routes>` 블록).
- 도메인 출처: `src/common/common.ts` `getUrl()` — `src/__tests__/link-preview-coherence.test.ts` 의 `it('공유 주소의 도메인이 코드의 운영 도메인과 같다')` 가 `og:url` 과의 오리진 동치를 이미 잠근다.
- 형제 계약: `foundation/document-locale-and-snippet-language-agreement` (REQ-085) · `foundation/share-card-image-consumable-dimensions` (REQ-086).

### 미측정·비판정 항목

- 검색 엔진이 사이트맵을 실제로 크롤링·색인했는지 · 색인된 페이지 수의 증감 — 저장소 밖 관측(검색 콘솔 영역)이며 측정 채널이 없다. 판정면은 파일의 실재·정합까지다.
- `/log/:timestamp` 글 URL 의 등재 — API 의존 도입 여부가 미결이라 판정 대상이 아니다. 도입 시 (I3) 의 도출 집합을 확장하는 형태가 된다.
- **프로토콜 한도(50,000 URL / 50 MB)** — 현 도출 집합이 4 라 한도 판정이 자명하다. 글 URL 등재로 집합이 커지면 그때 판정면이 생긴다.
- **`/` 리다이렉트 출발점을 도출에서 뺀 것** — `<Navigate replace to="/log">` 이므로 목적지만 싣는 것이 맞다. 다만 이 판단은 도출 규칙에 하드코딩돼 있고, 리다이렉트가 아닌 실 페이지로 바뀌면 규칙이 낡는다. 그 변경은 (I9) 의 `route-blocks`/`auth-routes` 수치를 흔들지 않으므로 **자동으로 검출되지 않는다.**
