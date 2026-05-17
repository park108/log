# `index.html` `<meta name="robots">` content 색인 정책 ↔ `public/robots.txt` `User-agent`/`Disallow` 색인 정책 양면 의미 동치 시스템 불변식

> **위치**: 횡단 빌드/색인 정책 시스템 불변식 — `index.html:8` (`<meta name="robots" content="...">` HTML 페이지-수준 색인 지시 채널 A) + `public/robots.txt` (`User-agent` + `Disallow` HTTP path 수준 crawl 정책 채널 B) + 형식별 토큰/본문 파싱 → 색인 의도 의미 매핑 → 양면 동치 비교 fixture.
> **관련 요구사항**: REQ-20260518-001
> **최종 업데이트**: 2026-05-18 (by inspector — 최초 박제; Phase 2 REQ-20260518-001 흡수)

> 본 spec 은 자매 `foundation/index-html-public-asset-reference-coherence.md` (REQ-099, green) 의 OOS 박제 (green spec line 10 의 "`<meta name="robots">` ↔ `public/robots.txt` 의미 정합 (별 axis)") 와 §G-B `public/` 5 파일 중 `robots.txt` 제외 주석 (green spec line 91) 에 의해 명시적 별 axis 로 사전 박제된 axis 를 정합한다. 자매 `foundation/csp-meta-dev-strip-prod-preserve.md` (REQ-098, green) 는 동일 `<meta>` element 공유 (`index.html:9` CSP) 이나 dev/prod 출력 비대칭 vs 본 spec 양면 의미 동치 의 직교 axis. 자매 `foundation/manifest-icons-sizes-token-disk-coherence.md` (REQ-100, green) 와도 직교 (manifest icons 픽셀 정합 vs robots 색인 정책).

## 역할
저장소 root `index.html:8` 의 `<meta name="robots" content="...">` (채널 A — HTML 페이지-수준 색인 지시) 와 `public/robots.txt` (채널 B — HTTP path 수준 crawl 정책) 는 두 개의 독립 발화 채널이며 **두 채널이 표현하는 색인 의도가 의미적으로 동치 (양쪽 모두 permissive OR 양쪽 모두 deny-all)** 라는 시스템 불변식을 가진다. 의도적으로 하지 않는 것: 게이트 발화 채널 (pre-commit / pre-push / CI / 신규 `package.json` `check:robots-policy-coherence` script) 선정, 격차 해소 방향 결정 (meta content 갱신 vs robots.txt 본문 갱신 / 어느 채널을 진실 공급원으로 둘지), `<meta name="robots">` IANA registered 토큰 전수 의미 매핑 (`noimageindex` / `nosnippet` / `max-snippet:N` / `unavailable_after:DATE` — 본 spec 은 `index|noindex` + `follow|nofollow` 2 axis 한정), `robots.txt` 의 `User-agent` group 별 정책 분기 (baseline `User-agent: *` 단일 group 한정 — 다중 group 도입 시 spec 갱신 신호), `<link rel="canonical">` / `<meta name="googlebot">` / sitemap.xml 등 다른 색인 정책 신호 채널, HTTP response `X-Robots-Tag` header (server 영역 — src 외부), `index.html` 정적 자원 참조 4 hit 디스크 실재 정합 (REQ-099 영역), manifest.json icons 픽셀 정합 (REQ-100 영역), CSP meta dev/prod 비대칭 (REQ-098 영역), browser 기본값 (`<meta name="robots">` 부재 = `index, follow` 가정) 의 박제 (본 spec 은 명시 박제 axis 한정 — meta 부재 회귀는 REQ-099 의 grep count axis 와 결합 검출), build artifact 의 직접 byte-equal 보존 검증 (REQ-099 G-C 영역에 위임 — 본 spec 은 의미 동치 axis 가 build 측에서도 보존됨만 박제).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `grep` (메타 등록 hit 수) + `test -f` + `wc -l` + `<meta content>` 속성 값 토큰 split + `robots.txt` 본문 `User-agent` group 별 `Disallow` value 추출 + 의미 매핑 + 양면 동치 비교 fixture.

## 동작
1. (G-A) `index.html` `<meta name="robots">` 등록 hit 수 게이트 — FR-01 선결
   - 명령: `grep -cE "<meta\s+name=\"robots\"" index.html` → **rc=0** + **출력 = 1**.
   - baseline (HEAD `7477189`): 1 hit (`index.html:8` `<meta name="robots" content="index, follow">`).
   - 의미: `<meta name="robots">` element 가 정확히 1회 등록되어 있다. 0 (삭제) 또는 2 이상 (중복) 은 본 spec 갱신 신호 (1 이외 hit 수는 채널 A 의 명시 박제 부재 또는 다중 정의 모호 신호).
2. (G-B) `public/robots.txt` 디스크 실재 + 본문 행 수 게이트 — FR-02
   - 명령: `test -f public/robots.txt && wc -l < public/robots.txt` → **exit 0** + **출력 = 3**.
   - baseline: 3 행 — `:1` 주석 (`# https://www.robotstxt.org/robotstxt.html`) + `:2` `User-agent: *` + `:3` `Disallow:` (empty value).
   - 의미: `public/robots.txt` 가 디스크에 실재하고 baseline 본문 구조 (주석 1 + `User-agent` 1 + `Disallow` 1) 를 유지한다. 본 spec 의 의미 매핑은 `User-agent:` + `Disallow:` 2 행 한정.
3. (G-C) 채널 A (`<meta name="robots" content>`) 토큰 → 의미 매핑 게이트 — FR-03
   - 절차: `index.html:8` `<meta name="robots">` element 의 `content` 속성 값 추출 → 콤마/공백 분리 → 소문자 정규화 → 토큰 집합 T 생성 → `index|noindex` axis 우세 토큰 + `follow|nofollow` axis 우세 토큰 추출 (Google Search Central 규약 — `noindex` ∈ T 시 `noindex` 우세, `nofollow` ∈ T 시 `nofollow` 우세). 토큰 집합이 비거나 axis 미지정 시 W3C/Google 기본값 (`index, follow`) 적용.
   - baseline: `content = "index, follow"` → T = {"index", "follow"} → 의미 매핑 **M_A = {index: allow, follow: allow}** (가장 permissive).
   - 의미: 채널 A 의 색인 의도가 토큰 우세 규칙으로 결정론 매핑된다. `noindex` 와 `index` 동시 출현 시 `noindex` 우세 (Google Search Central 명시).
4. (G-D) 채널 B (`public/robots.txt` `User-agent` group + `Disallow`) 본문 → 의미 매핑 게이트 — FR-04
   - 절차: `public/robots.txt` 본문에서 `User-agent: *` group 의 `Disallow:` value 추출 → 값에 따라 의미 매핑:
     - `Disallow:` value = "" (empty) → **M_B = {path: allow-all, crawl: allow}** (RFC 9309 §2.2.2 "An empty value means that all URLs can be crawled").
     - `Disallow: /` → **M_B = {path: deny-all, crawl: deny}** (모든 path 거부).
     - `Disallow: /<prefix>` (e.g. `/admin`) → **M_B = {path: partial-deny, crawl: partial-allow}** (부분 deny — baseline 외 회귀 분기).
   - baseline: `:3` `Disallow:` (empty value) → **M_B = {path: allow-all, crawl: allow}** (가장 permissive).
   - 의미: 채널 B 의 path-level crawl 정책이 RFC 9309 §2.2.2 규약으로 결정론 매핑된다.
5. (G-E) 양면 의미 동치 게이트 — FR-05
   - 절차: M_A (G-C 출력) 와 M_B (G-D 출력) 의 색인 의도 동치 비교:
     - 양쪽 모두 permissive (`M_A = {index: allow, follow: allow}` ∧ `M_B = {path: allow-all, crawl: allow}`) → **동치 PASS, rc=0**.
     - 양쪽 모두 deny-all (`M_A = {index: deny, follow: deny}` ∧ `M_B = {path: deny-all, crawl: deny}`) → **동치 PASS, rc=0**.
     - 그 외 모든 조합 (단방향 분기 — 예: A=allow ∧ B=deny-all OR 그 역) → **동치 위반, rc=1** + 위반 채널 + M_A / M_B 의미 명시.
   - baseline (HEAD `7477189`): M_A = `{index: allow, follow: allow}` ∧ M_B = `{path: allow-all, crawl: allow}` → **양면 의미 동치 PASS** (양쪽 모두 가장 permissive).
   - 의미: crawler 입장에서 두 채널 (DOM 파싱 후 / robots.txt fetch 즉시) 이 표현하는 색인 의도가 모호하지 않다.
6. (G-F) build artifact 측 동치 보존 게이트 — FR-06
   - 절차: `npm run build` 후
     - `diff public/robots.txt build/robots.txt` → **0 line** (Vite `publicDir` byte-for-byte 자동 복사 — REQ-099 G-C 동치 보존).
     - `grep -cE "<meta\s+name=\"robots\"" build/index.html` → **1** (G-A 와 동치 보존).
   - baseline (HEAD `7477189` + `npm run build` 산출): 양 조건 만족.
   - 의미: 본 spec 의 양면 의미 동치 axis 가 source (`index.html` + `public/robots.txt`) 와 build artifact (`build/index.html` + `build/robots.txt`) 양 측에서 동치 보존된다. byte-for-byte 보존 검증 자체는 REQ-099 G-C 에 위임.
7. (G-G) 회귀 검출 채널 존재 게이트 — FR-07
   - G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E ∧ G-F 6 조건은 단위 테스트 + filesystem assertion + grep + 본문 토큰 파싱 + 의미 매핑 + 양면 동치 비교 fixture 채널을 통해 rc=0/1 결정론으로 판정된다. 위반 시 위반 게이트 + M_A / M_B 의미 + 격차 항목 명시 보고 (진단 가능성 보장). 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:robots-policy-coherence` script) 선정은 수단 영역이나 "발화 채널이 존재해야 한다" 는 계약 자체는 박제.
8. (G-H) 채널 의미 분리 박제 — NFR-06
   - 채널 A (HTML 페이지-수준 색인 지시 — DOM 파싱 후 발화) 와 채널 B (HTTP path 수준 crawl 정책 — `/robots.txt` HTTP fetch 즉시 발화) 는 crawler 입장에서 독립 발화 단계이나 본 spec 은 **의미 동치** axis 만 박제한다. 어느 채널의 우선순위 라벨 ("기본" / "권장" / "우선") 박제 금지 — 수단 중립.
9. (G-I) 시점 비의존 — NFR-07
   - G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E ∧ G-F 는 `vite` 메이저 bump · `index.html:8` meta content 변경 · `public/robots.txt` 본문 변경 · meta robots IANA 토큰 추가 · `User-agent` group 추가 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 6 조건 동시 만족 회복 또는 본 spec 갱신.
10. (G-J) 자체 진단 제외 — NFR-04
    - 본 req / 본 spec / 테스트의 본문 내 `<meta name="robots"`, `robots.txt`, `User-agent`, `Disallow`, `index, follow`, `noindex`, `nofollow` 등 문자열 occurrence 는 G-A 의 grep count 1 + G-B 의 행 수 3 측정과 독립 — 게이트 scope 는 `index.html` 단일 파일 + `public/robots.txt` 단일 파일 + `build/index.html` + `build/robots.txt` 로 한정. 동일 HEAD 상에서 본 게이트 N 회 실행 시 N 회 동일 rc + 동일 출력.
11. (G-K) 멱등성 — NFR-02
    - 본 게이트는 read-only — `index.html` / `public/**` / `build/**` 파일을 수정하지 않는다. `build/**` 재생성은 G-F 의 부수효과로 허용되나 본 spec 자체는 build 명령 강제하지 않음 (수단 영역). N 회 실행 후 source 파일 mtime + byte-equal 보존.

## 의존성
- 내부: `index.html:8` (`<meta name="robots" content="index, follow">` 채널 A baseline 박제 위치), `public/robots.txt` (3 행 본문 채널 B baseline 박제 위치 — `:1` 주석 + `:2` `User-agent: *` + `:3` `Disallow:` empty), `build/index.html` + `build/robots.txt` (Vite `publicDir` 자동 복사 산출물 — G-F 측정 대상, REQ-099 G-C 동치 보존 의존).
- 외부: RFC 9309 §2.2.2 (Robots Exclusion Protocol — `Disallow:` empty value semantics), W3C HTML Living Standard §4.2.5.3 named metadata (`<meta name="robots">` 정의), Google Search Central — `robots` meta tag spec (https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag — `index|noindex` + `follow|nofollow` 토큰 우세 규칙), Google Search Central — `robots.txt` Introduction (https://developers.google.com/search/docs/crawling-indexing/robots/intro — `User-agent: *` group + `Disallow:` empty value 의미), POSIX `grep` / `test` / `wc` / `diff` (G-A / G-B / G-F 게이트 명령), POSIX text parser (G-C / G-D 본문 토큰 추출).
- 역의존 (사용처): pre-push / CI 단계의 robots policy 정합 검증 hook 또는 `package.json` 신규 `check:robots-policy-coherence` script (수단 위임). `index.html:8` `<meta name="robots" content>` 값 갱신 또는 `public/robots.txt` 본문 갱신 (특히 `Disallow:` value 변경 또는 신규 `User-agent` group 추가) 또는 `<meta name="robots">` 삭제 또는 `public/robots.txt` 파일 삭제 모두 본 spec 위반 회귀 후보. 자매 spec `foundation/index-html-public-asset-reference-coherence.md` (REQ-099 green) 의 G-B `ls public/` 5 파일 axis (line 91) + 4 정적 자원 참조 grep count axis 와 결합 시 `<meta name="robots">` 부재 / `public/robots.txt` 삭제 회귀가 양측 axis 결합으로 검출된다.

## 테스트 현황
- [ ] G-A (`<meta name="robots">` 등록 hit 수 = 1) — baseline 1 hit 미회복 자동 검출 채널 부재.
- [ ] G-B (`public/robots.txt` `test -f` + `wc -l` = 3) — baseline 디스크 실재 + 3 행 본문 미회복 자동 검출 채널 부재.
- [ ] G-C (채널 A `content` 토큰 split + 의미 매핑 M_A) — baseline `M_A = {index: allow, follow: allow}` 미회복 자동 검출 채널 부재.
- [ ] G-D (채널 B `User-agent: *` group + `Disallow` value 의미 매핑 M_B) — baseline `M_B = {path: allow-all, crawl: allow}` (RFC 9309 §2.2.2 empty value) 미회복 자동 검출 채널 부재.
- [ ] G-E (양면 의미 동치 비교 M_A ≡ M_B) — baseline 양쪽 permissive PASS 미회복 자동 검출 채널 부재. 회귀 가설 (R-1 `noindex, nofollow` / R-2 `Disallow: /` / R-3 meta 삭제 / R-4 robots.txt 삭제) 시뮬레이션 fixture 부재.
- [ ] G-F build artifact 측 동치 보존 (`diff public/robots.txt build/robots.txt` 0 line + `grep build/index.html` 1) — REQ-099 G-C 동치 보존 의존 fixture 부재.
- [ ] G-G 회귀 검출 채널 존재 — 단위 테스트 + filesystem assertion + grep + 의미 매핑 + 양면 동치 비교 fixture 미도입.
- [ ] G-H 채널 의미 분리 박제 (어느 채널 우선순위 라벨 박제 금지 — 수단 중립) — 검증 채널 fixture 부재.
- [ ] G-I 시점 비의존 회복 — vite/meta-content/robots-body/IANA 토큰 추가/User-agent group 추가 이벤트 직후 6 조건 동시 만족 회복 fixture 부재.
- [ ] G-J 자체 진단 제외 — `index.html` + `public/robots.txt` + `build/index.html` + `build/robots.txt` 한정 scope baseline 박제 fixture 부재.
- [ ] G-K 멱등성 (read-only 보장) — N 회 게이트 실행 후 source mtime + byte-equal 보존 fixture 부재.

## 수용 기준
- [ ] (Must) FR-01 — `grep -cE "<meta\s+name=\"robots\"" index.html` = 1 + rc=0. 0 (삭제) 또는 2 이상 (중복) 은 본 spec 갱신 신호.
- [ ] (Must) FR-02 — `test -f public/robots.txt && wc -l < public/robots.txt` exit 0 + 출력 = 3. 본 spec 의미 매핑은 `User-agent:` + `Disallow:` 2 행 한정.
- [ ] (Must) FR-03 — `<meta name="robots" content>` 토큰 split → 소문자 정규화 → `index|noindex` + `follow|nofollow` axis 우세 토큰 추출 → 의미 매핑 M_A. `noindex` ∈ T 시 `noindex` 우세 (Google Search Central 규약). 토큰 미지정 시 W3C/Google 기본값 (`index, follow`).
- [ ] (Must) FR-04 — `public/robots.txt` `User-agent: *` group 의 `Disallow:` value 추출 → 의미 매핑 M_B. empty value → `{path: allow-all, crawl: allow}` (RFC 9309 §2.2.2). `/` → deny-all. `/<prefix>` → partial-deny.
- [ ] (Must) FR-05 — M_A 와 M_B 양면 의미 동치 비교 (양쪽 모두 permissive OR 양쪽 모두 deny-all) → PASS. 단방향 분기 → 본 spec 위반. baseline (HEAD `7477189`): 양쪽 모두 permissive → PASS.
- [ ] (Must) FR-06 — build artifact 측 (`build/robots.txt` byte-equal source + `build/index.html` meta robots 1 hit) 양면 의미 동치 보존. byte-for-byte 검증은 REQ-099 G-C 위임.
- [ ] (Should) FR-07 — FR-01·FR-02·FR-03·FR-04·FR-05·FR-06 회귀는 자동 검출 채널 (단위 테스트 + filesystem assertion + grep + 본문 토큰 파싱 + 의미 매핑 + 동치 비교 fixture) 을 통해 rc=0/1 결정론 판정. 발화 시점 채널 선정은 수단 영역이나 "발화 채널 존재" 자체는 박제.
- [ ] (Could) FR-08 — `<meta name="robots">` IANA registered 추가 토큰 (`noimageindex` / `nosnippet` / `max-snippet:N` / `unavailable_after:DATE`) 또는 `robots.txt` `User-agent` 다중 group 도입 시 본 spec 형식 분기 확장 박제 신호.

## 비기능 기준
- [ ] (NFR-01 결정론) 동일 HEAD 상에서 G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E 의 grep + `test -f` + `wc -l` + 본문 토큰 파싱 + 의미 매핑 + 동치 비교 결과 N 회 반복 시 N 회 동일 rc + 동일 출력. build artifact 측정은 `npm run build` 1 회 후 N 회 read-only 측정.
- [ ] (NFR-02 멱등성) 본 게이트는 read-only — `index.html` / `public/**` / `build/**` 파일을 수정하지 않는다.
- [ ] (NFR-03 성능) (a) FR-01 grep + FR-02 `test -f` + `wc -l` < 100 ms. (b) FR-03 + FR-04 본문 토큰 파싱 + 의미 매핑 < 200 ms. (c) FR-05 동치 비교 < 100 ms. (d) 전체 게이트 < 30 s (build 시간 포함 시) / < 1 s (build artifact 존재 가정 시).
- [ ] (NFR-04 자체 진단 제외) 본 req / spec / 테스트 본문의 `<meta name="robots"`, `robots.txt`, `User-agent`, `Disallow`, `index, follow` 등 문자열 occurrence 는 G-A grep count 1 + G-B 행 수 3 측정과 독립 — 게이트 scope `index.html` + `public/robots.txt` + `build/index.html` + `build/robots.txt` 한정.
- [ ] (NFR-05 외부 비파괴) 본 효능 도입은 `index.html` / `public/robots.txt` / `vite.config.js` 의 src 외부 변경 동반 없음. FR-07 발화 채널 부착 수단 (`package.json` `check:*` script / husky hook) 은 본 spec In-Scope 외 수단 영역.
- [ ] (NFR-06 채널 의미 분리) meta robots (HTML 페이지-수준) ↔ robots.txt (HTTP path 수준) 의 의미 분리는 본 spec 의 행동 평서문에 포함되되 어느 채널의 우선순위 라벨 박제 금지 — 수단 중립.
- [ ] (NFR-07 시점 비의존) FR-01·FR-02·FR-03·FR-04·FR-05·FR-06 은 vite 메이저 bump · meta content 변경 · robots.txt 본문 변경 · IANA 토큰 추가 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 6 조건 동시 만족 회복 또는 본 spec 갱신.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 시스템 불변식 박제 — 게이트는 read-only 측정 횡단, task 발행 시점에 planner 가 §스코프 규칙 재계산).
- **grep-baseline** (HEAD `7477189` 실측):
  - `grep -cE "<meta\s+name=\"robots\"" index.html` → **1 hit** (`index.html:8`: `<meta name="robots" content="index, follow">`).
  - `test -f public/robots.txt` → exit 0.
  - `wc -l < public/robots.txt` → **3** (`public/robots.txt:1-3`: `# ...` 주석 + `User-agent: *` + `Disallow:` empty).
  - `grep -nE "^User-agent|^Disallow" public/robots.txt` → 2 hits: `2:User-agent: *` + `3:Disallow:`.
  - `grep -rn "<meta name=\"robots\"" specs/30.spec/{blue,green}/` → 본 spec 외 0 hit (중복 박제 회피 확인).
- **rationale**: 본 spec 의 게이트는 source (`index.html` + `public/robots.txt`) + build artifact (`build/index.html` + `build/robots.txt`) 한정 read-only 측정 — `src/**` 디렉토리 횡단 게이트 부재. baseline 토큰/본문 측정값 (1 / 3 / empty value / permissive ≡ permissive) 은 RFC 9309 §2.2.2 + W3C HTML §4.2.5.3 + Google Search Central 규약에 의한 결정론 매핑. expansion N/A — task 발행 시점에 planner 가 발화 채널 (단위 테스트 vs pre-push hook vs CI step vs `package.json` `check:robots-policy-coherence` script) 선정과 함께 §스코프 규칙 재계산.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-18 | inspector (REQ-20260518-001 흡수) | 최초 박제 — `<meta name="robots">` (채널 A) ↔ `public/robots.txt` (채널 B) 양면 의미 동치 시스템 불변식 + 11 게이트 (G-A~G-K) + baseline HEAD `7477189` (M_A `{index: allow, follow: allow}` ≡ M_B `{path: allow-all, crawl: allow}` → PASS) | all |
