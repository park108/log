# `index.html` 정적 자원 참조 ↔ `public/**` 디스크 자원 ↔ `build/**` 산출 자원 3-축 정합 + `manifest.json` icons / `theme-color` 양면 의미 동치 시스템 불변식

> **위치**: 횡단 빌드/도구 시스템 불변식 — 저장소 root `index.html` 의 4종 정적 자원 참조 (`index.html:6` `<meta name="theme-color">` + `index.html:10` `<link rel="manifest">` + `index.html:11` `<link rel="icon">` + `index.html:12` `<link rel="apple-touch-icon">`) + `public/**` 디스크 자원 4종 (`manifest.json` / `favicon.ico` / `apple-icon-precomposed.png` / `logo192.png`) + `build/**` 산출 자원 (Vite `publicDir` 자동 복사 결과) + `public/manifest.json` 본문 키 (`icons[*].src` / `theme_color`).
> **관련 요구사항**: REQ-20260517-099
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: C단계 마커 회수 + green→blue promote)

> 본 spec 은 자매 `foundation/csp-meta-dev-strip-prod-preserve.md` (REQ-098) 와 동일 파일 (`index.html`) 의 별 axis (REQ-098 = CSP meta 1 element 의 출력 비대칭 / 본 spec = 정적 자원 link/meta 4 element 의 3-축 참조 정합). 자매 `foundation/root-config-spec-reference-coherence.md` (REQ-097) 의 참조 정합 axis 와도 직교 (REQ-097 = spec `.md` 참조 path 정합 / 본 spec = `public/**` 정적 asset 참조 path 정합).

## 역할
저장소 root `index.html` 의 4종 정적 자원 참조는 **3-축 (디스크 실재 / 빌드 보존 / 의미 동치) 결과 효능 계약** 을 가진다 — (A) `index.html` 의 3종 `<link href>` 가 가리키는 path 가 모두 `public/**` 디스크에 실재한다, (B) `vite build` 산출물 `build/**` 에 동일 3종 자원이 byte-for-byte 보존된다 (Vite `publicDir` 자동 복사 정책), (C) `index.html:6` `<meta name="theme-color">` 의 content 값과 `public/manifest.json.theme_color` 의 JSON 문자열 값이 정확히 일치하고 `public/manifest.json.icons[*].src` 의 모든 항목이 `public/` 디스크에 실재한다. 의도적으로 하지 않는 것: 게이트 발화 채널 (pre-commit / pre-push / CI / 신규 `package.json` `check:public-asset-coherence` script) 선정, `<meta name="robots">` ↔ `public/robots.txt` 의미 정합 (별 axis), `<meta name="viewport">` / `<meta charset>` / `<meta name="description">` / `<title>` 의 텍스트 자체 정합 (별 axis), `manifest.json` 본문의 `short_name` / `name` / `start_url` / `display` / `background_color` 키 값 정합 (별 axis — 본 spec 은 `icons[*].src` + `theme_color` 2 키 한정), `public/` 자원 자체의 콘텐츠 정합 (예: `favicon.ico` 의 multi-size 구성 — 파일 존재만 다룸), `<link rel="apple-touch-icon">` 의 `manifest.json.icons` 외부 배치 자체의 변경 결정 (현 분리 상태 박제만), `index.html:8` CSP meta 의 출력 비대칭 (REQ-098 영역), `index.html:9` 의 다른 정적 자원 (현 baseline 부재 — 본 spec 은 baseline 4 hit 한정).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `index.html` 단일 파일 grep + `public/**` filesystem stat + `build/**` filesystem stat + `manifest.json` JSON parse + 값 추출 동치 비교 fixture.

## 동작
1. (G-A) `index.html` 참조 등록 수 보존 게이트 — FR-01
   - 명령: `grep -cE "manifest|favicon|apple.touch.icon|theme.color" index.html` → **출력 = 4 + rc=0**.
   - 의미: 4종 정적 자원 참조 (`<meta name="theme-color">` + 3종 `<link>`) 가 모두 1 hit 으로 등록되어 있다. 등록 수의 추가/감소는 본 spec 갱신 신호.
2. (G-B) `public/**` 디스크 실재 게이트 — FR-02 + FR-05
   - 명령: `test -f public/manifest.json && test -f public/favicon.ico && test -f public/apple-icon-precomposed.png && test -f public/logo192.png` → **exit 0**.
   - 의미: `index.html` 의 3종 `<link href>` 가 가리키는 3 파일 (`manifest.json` / `favicon.ico` / `apple-icon-precomposed.png`) + `manifest.json.icons[1].src` 가 가리키는 `logo192.png` 가 모두 `public/` 에 실재한다. `<meta name="theme-color">` 는 path 참조 없음 (값 자체가 hex color — G-C 영역).
3. (G-C) `build/**` 산출 보존 게이트 — FR-03
   - 절차: `npm run build` 후 `test -f build/manifest.json && test -f build/favicon.ico && test -f build/apple-icon-precomposed.png && test -f build/logo192.png && test -f build/index.html` → **exit 0** + `grep -cE "manifest|favicon|apple.touch.icon|theme.color" build/index.html` → **4** (G-A 와 동치 보존).
   - 의미: Vite `publicDir` 자동 복사 정책에 의해 `public/**` 4 자원이 `build/` 로 byte-for-byte 복사된다. `build/index.html` 의 4종 참조 grep count = 원본 `index.html` 동치.
4. (G-D) `theme-color` 양면 값 동치 게이트 — FR-04
   - 절차: `index.html:6` `<meta name="theme-color" content="...">` 의 content 값 추출 ↔ `public/manifest.json.theme_color` JSON 문자열 값 추출 → **두 값 문자열 동치** (baseline `"#000000"`).
   - 의미: PWA install banner 색상 (manifest 측) ↔ mobile browser address bar 색상 (HTML meta 측) 의 양면 채널이 동일 값으로 정렬. 두 값 분기는 본 spec 위반.
5. (G-E) `manifest.json.icons[*].src` 디스크 실재 게이트 — FR-05
   - 절차: `public/manifest.json` 의 `icons` 배열 항목 전수에 대해 `src` 키 값 추출 → 각 값에 `test -f public/<src>` → **모두 exit 0** (baseline `icons[0].src="favicon.ico"` + `icons[1].src="logo192.png"` 2 항목).
   - 의미: `icons` 배열의 모든 src 가 디스크 실재. 배열 항목 추가/삭제는 본 spec 갱신 신호 (배열 크기 자체는 미박제).
6. (G-F) `manifest.json` JSON 유효성 + build artifact byte-equal 게이트 — FR-06
   - 절차: `node -e "JSON.parse(require('fs').readFileSync('public/manifest.json'))"` 또는 `jq . public/manifest.json` → **exit 0** + `diff public/manifest.json build/manifest.json` → **0 lines diff** (Vite `publicDir` 복사가 byte-for-byte).
   - 의미: `public/manifest.json` 자체가 valid JSON + build artifact `build/manifest.json` 도 동일 valid + byte-equal. JSON parse 실패는 본 spec 위반.
7. (G-G) 3 채널 양면 의도 분리 박제 게이트 — FR-07
   - 절차: (1) `index.html` 의 `<link rel="apple-touch-icon" href="/apple-icon-precomposed.png">` 의 `apple-icon-precomposed.png` 가 `manifest.json.icons[*].src` 에 미포함 + (2) `<link rel="icon" href="/favicon.ico">` 의 `favicon.ico` 가 `manifest.json.icons[*].src` 에 포함 — 현 baseline 상태 박제. apple touch icon 의 manifest 등록 여부 변경 (포함 / 배제) 은 본 spec 갱신 신호.
   - 의미: manifest icon (PWA install 채널) / link rel=icon (browser tab favicon 채널) / link rel=apple-touch-icon (iOS home screen 채널) — 3 채널의 의도 분리 자체가 본 spec 의 한 element. 어느 채널의 우선순위 라벨 박제 금지 (수단 중립).
8. (G-H) 회귀 검출 채널 존재 게이트 — FR-08
   - G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E ∧ G-F ∧ G-G 7 조건은 단위 테스트 + filesystem assertion + JSON parse + 값 추출 동치 비교 (또는 동등 fixture) 채널을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:public-asset-coherence` script) 선정은 수단 영역이나 "발화 채널이 존재해야 한다" 는 계약 자체는 박제.
9. (G-I) 시점 비의존 — NFR-01
   - G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E ∧ G-F ∧ G-G 는 `vite` 메이저 bump · Vite `publicDir` 정책 변경 · `index.html` 정적 자원 참조 갱신 · `public/manifest.json` 본문 키 갱신 · `public/**` 자원 추가/삭제 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 7 조건 동시 만족 회복 또는 본 spec 갱신.
10. (G-J) 자체 진단 제외 — 결정론 보장
    - 본 req / 본 spec / 테스트의 본문 내 `manifest.json` / `favicon.ico` / `apple-icon-precomposed.png` / `theme-color` 문자열 occurrence 는 FR-01 의 `index.html` grep count 4 와 독립 — 게이트 scope 는 `index.html` 단일 파일 + `public/**` 디렉터리 + `build/**` 디렉터리로 한정된다. 동일 HEAD 상에서 본 게이트 N 회 실행 시 N 회 동일 rc + 동일 출력.

## 의존성
- 내부: `index.html` (원본 정적 자원 참조 4종 박제 위치 — `index.html:6,10-12`), `public/manifest.json` (원본 PWA manifest — `icons[*].src` + `theme_color` 키), `public/favicon.ico` / `public/apple-icon-precomposed.png` / `public/logo192.png` (정적 asset 자원), `build/index.html` + `build/manifest.json` + `build/favicon.ico` + `build/apple-icon-precomposed.png` + `build/logo192.png` (prod artifact — `vite build` 산출).
- 외부: `vite` (`publicDir` 자동 복사 정책 + `outDir` 산출), POSIX `grep` (G-A / G-C 측정 명령), POSIX `test -f` (G-B / G-C / G-E filesystem stat), `node` / `jq` (G-F JSON parse), W3C Web App Manifest (`icons[*].src` / `theme_color` 키 의미), HTML `<link rel="icon">` / `<link rel="manifest">` / `<link rel="apple-touch-icon">` / `<meta name="theme-color">` (browser implementation 측 PWA install / browser tab favicon / iOS home screen / mobile address bar 채널).
- 역의존 (사용처): pre-push / CI 단계의 정적 자원 정합 검증 hook 또는 `package.json` 신규 `check:public-asset-coherence` script (수단 위임). `index.html` 의 4종 정적 자원 참조 변경 (추가 / 삭제 / path 갱신) 또는 `public/**` 자원 추가/삭제/이름 변경 또는 `public/manifest.json` 의 `icons[*].src` / `theme_color` 키 값 갱신 모두 본 spec 위반 회귀 후보.
- 자매 spec: `foundation/csp-meta-dev-strip-prod-preserve.md` (green, REQ-098) — `index.html:8` CSP meta 의 출력 비대칭. 동일 파일 (`index.html`) 의 별 axis (CSP meta 1 element vs 정적 자원 link/meta 4 element 정합). `foundation/root-config-spec-reference-coherence.md` (green, REQ-097) — root-level 파일군의 spec 참조 path 정합 (`-spec` suffix + 디스크 실재 + promote 동기화). 본 spec 과 별 axis (spec 참조 정합 vs 정적 자원 참조 정합 — 두 정합은 "참조의 디스크 실재" 효능을 공유하나 참조 대상이 `specs/30.spec/**/*.md` vs `public/**` 정적 asset 인 점에서 별 축).

## 테스트 현황
- [x] (G-A) `grep -cE "manifest|favicon|apple.touch.icon|theme.color" index.html` → **4 + rc=0** (baseline 4 hit 박제, HEAD `60e8def` 실측 — REQ-099 §배경 HEAD `7477189` 이후 index.html 정적 자원 참조 영역 도입 차분 0).
- [x] (G-B) `test -f public/manifest.json && test -f public/favicon.ico && test -f public/apple-icon-precomposed.png && test -f public/logo192.png` → **exit 0** (baseline 4 파일 실재 박제).
- [x] (G-C) `npm run build` 후 `test -f build/{manifest.json,favicon.ico,apple-icon-precomposed.png,logo192.png,index.html}` + `grep -cE "manifest|favicon|apple.touch.icon|theme.color" build/index.html` → **exit 0 + 4** (baseline build artifact 보존 박제).
- [x] (G-D) `index.html:6` theme-color content 값 ↔ `public/manifest.json.theme_color` 값 추출 후 문자열 동치 → 동일 (`"#000000"` baseline).
- [x] (G-E) `public/manifest.json.icons[*].src` 전수 (`favicon.ico` + `logo192.png` 2 항목) 에 대해 `test -f public/<src>` → **모두 exit 0** (baseline 2 항목 실재 박제).
- [x] (G-F) `node -e "JSON.parse(require('fs').readFileSync('public/manifest.json'))"` exit 0 + `diff public/manifest.json build/manifest.json` 0 lines diff (baseline byte-equal 박제 — `public/manifest.json` 462 byte).
- [x] (G-G) `<link rel="apple-touch-icon" href="/apple-icon-precomposed.png">` 의 `apple-icon-precomposed.png` ∉ `manifest.json.icons[*].src` + `<link rel="icon" href="/favicon.ico">` 의 `favicon.ico` ∈ `manifest.json.icons[*].src` (baseline 양면 의도 분리 박제).
- [x] (G-H) 발화 채널 존재 — 단위 테스트 + filesystem assertion + JSON parse + 값 추출 동치 비교 (또는 동등 fixture) 채널을 통해 rc=0/1 결정론. 발화 시점 채널 (pre-push / CI / 신규 `check:public-asset-coherence` script) 부착 미박제 (수단 위임). — **측정**: `src/__tests__/public-asset-reference-coherence.test.ts` (7 `it`), CI `Test` step 발화.

## 수용 기준
- [x] (Must FR-01) `grep -cE "manifest|favicon|apple.touch.icon|theme.color" index.html` → **출력 = 4 + rc=0**. 등록 수의 추가/감소는 본 spec 갱신 신호 (배열 크기 자체는 변동 허용).
- [x] (Must FR-02) `test -f public/manifest.json && test -f public/favicon.ico && test -f public/apple-icon-precomposed.png` → **exit 0**. `<meta name="theme-color">` 는 path 참조 없음 (값 자체가 hex color — FR-04 영역).
- [x] (Must FR-03) `npm run build` 후 `test -f build/manifest.json && test -f build/favicon.ico && test -f build/apple-icon-precomposed.png && test -f build/index.html` → **exit 0** + `grep -cE "manifest|favicon|apple.touch.icon|theme.color" build/index.html` → **4** (G-A 와 동치 보존).
- [x] (Must FR-04) `index.html:6` `<meta name="theme-color" content="...">` 의 content 값 ↔ `public/manifest.json.theme_color` 의 JSON 문자열 값 → **정확히 일치** (baseline `"#000000"`).
- [x] (Must FR-05) `public/manifest.json.icons[*].src` 의 모든 항목이 `public/` 디스크에 실재 — baseline `icons[0].src="favicon.ico"` + `icons[1].src="logo192.png"` 2 항목 모두 `test -f public/favicon.ico && test -f public/logo192.png` 통과.
- [x] (Should FR-06) `public/manifest.json` 자체가 valid JSON (parse 가능) + build artifact `build/manifest.json` 도 valid + byte-equal (Vite `publicDir` 복사가 byte-for-byte).
- [x] (Should FR-07) 3 채널 양면 의도 분리 박제 — 현 baseline 상태 (apple-icon-precomposed.png ∉ manifest.json.icons / favicon.ico ∈ manifest.json.icons) 가 본 spec 의 한 element. 분리 상태 변경 (apple icon 의 manifest 포함 / favicon 의 manifest 배제 등) 은 본 spec 갱신 신호.
- [x] (Should FR-08) FR-01·FR-02·FR-03·FR-04·FR-05·FR-06·FR-07 7 조건의 회귀는 자동 검출 채널 (단위 테스트 + filesystem assertion + JSON parse + 값 추출 동치 비교 또는 동등 fixture) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:public-asset-coherence` script) 선정은 수단 영역, "발화 채널 존재" 계약 박제. — **주입 검증**: favicon 삭제 / theme_color 변경 / icons 부재 항목 추가 / apple-touch-icon link 삭제 4 가설 전수 검출 (각각 1~2 `it` fail).
- [x] (Must, 회귀 가설 검출) `public/favicon.ico` 삭제 가설 회귀 시 FR-02 게이트 → exit 1 (참조 격차 검출). — **주입 검증**: 2 failed / 5 passed.
- [x] (Must, 회귀 가설 검출) `public/manifest.json.theme_color` 를 `"#ffffff"` 로 변경 가설 회귀 시 FR-04 두 값 추출 후 비교 → 불일치 검출. — **주입 검증**: 2 failed / 5 passed.
- [x] (Must, 회귀 가설 검출) `public/manifest.json.icons[2]` 항목 추가 (`{"src": "non-existent.png", ...}`) 가설 회귀 시 FR-05 게이트 → `test -f public/non-existent.png` 실패로 exit 1. — **주입 검증**: 2 failed / 5 passed.
- [x] (Must, 회귀 가설 검출) `index.html:12` `<link rel="apple-touch-icon">` 삭제 가설 회귀 시 FR-01 게이트 → grep count = 3 (감소 검출). — **주입 검증**: 1 failed / 6 passed.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 빌드 시스템 횡단 게이트 박제 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`60e8def`, 2026-05-17 — 본 spec 박제 시점 실측, REQ-099 §배경 HEAD `7477189` 이후 index.html / public/ / build/ 영역 도입 차분 0):
  - (G-A) `grep -cE "manifest|favicon|apple.touch.icon|theme.color" index.html` → **4** (HEAD `60e8def` 시점 실측):
    - `index.html:6` `<meta name="theme-color" content="#000000" />`
    - `index.html:10` `<link rel="manifest" href="/manifest.json" />`
    - `index.html:11` `<link rel="icon" href="/favicon.ico" />`
    - `index.html:12` `<link rel="apple-touch-icon" href="/apple-icon-precomposed.png" />`
  - (G-B) `ls public/` → **5 파일** (`manifest.json` / `favicon.ico` / `apple-icon-precomposed.png` / `logo192.png` / `robots.txt`) — 본 spec scope 는 `robots.txt` 제외 4 파일.
  - (G-C) `ls build/` → **7 entry** (`apple-icon-precomposed.png` / `assets/` / `favicon.ico` / `index.html` / `logo192.png` / `manifest.json` / `robots.txt`) — `public/` 4 자원 + `index.html` 보존 + `assets/` (Vite transform 산출). `grep -cE "manifest|favicon|apple.touch.icon|theme.color" build/index.html` → **4** (G-A 와 동치).
  - (G-D) `index.html:6` theme-color content == `"#000000"` (HEAD `60e8def` 시점 실측). `public/manifest.json:20` theme_color == `"#000000"` (HEAD `60e8def` 시점 실측). **두 값 문자열 동치 baseline 박제**.
  - (G-E) `public/manifest.json.icons` 배열 = **2 항목** (`{src: "favicon.ico"}` + `{src: "logo192.png"}`). `test -f public/favicon.ico && test -f public/logo192.png` → exit 0.
  - (G-F) `public/manifest.json` byte = **462** (HEAD `60e8def` 시점 실측). `build/manifest.json` 도 byte-equal (Vite `publicDir` 자동 복사).
  - (G-G) `apple-icon-precomposed.png` ∉ `manifest.json.icons[*].src` (현 baseline 양면 분리) + `favicon.ico` ∈ `manifest.json.icons[*].src` (현 baseline 양면 일치).
  - (G-H baseline) 발화 채널 = `grep -rn "favicon\|manifest.json\|apple-icon-precomposed\|theme.color" .husky/pre-commit .husky/pre-push scripts/*.sh package.json 2>/dev/null | grep -v "^public/" | grep -v "Binary file"` → **0 hit** (현 pre-push / CI / package.json `check:*` script 부재 — 수단 위임).
  - 합계 baseline: G-A 4 hit (보존 baseline, **회귀 0**) / G-B 4 파일 실재 / G-C build artifact 4 자원 보존 + grep 4 hit / G-D 양면 값 동치 (`"#000000"`) / G-E icons 2 항목 실재 / G-F JSON valid + byte-equal / G-G 양면 분리 박제 / G-H 발화 채널 0 hit (수단 위임).
- **rationale**: G-A~G-G baseline 은 본 spec 박제 시점 실측 박제 — 향후 회귀 분석 시 위반 검출 기준 (FR-01 회귀 시 4 ≠ N / FR-02 회귀 시 1+ 파일 부재 / FR-03 회귀 시 build artifact 4 자원 손실 / FR-04 회귀 시 값 분기 / FR-05 회귀 시 icons src 디스크 부재 / FR-06 회귀 시 parse 실패 또는 byte-diff / FR-07 회귀 시 양면 분리 상태 변경). 발화 채널 baseline 0 hit (G-H) 는 §배경 측정값 기록 — task 위임으로 발화 채널 신설 (pre-push / CI / `check:public-asset-coherence` script) 시 본 spec 의 §수용 기준은 hit/채널 수 비의존 (RULE-07 정합 — "발화 채널 존재" 계약 자체만 박제).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / `60e8def` 직후 | REQ-099 흡수 — `index.html` 정적 자원 참조 ↔ `public/**` ↔ `build/**` 3-축 정합 + `manifest.json` icons / theme-color 양면 동치 4 계약 신규 박제. G-A 4 hit (`index.html` grep count) / G-B 4 파일 (`public/`) / G-C build artifact 4 자원 + grep 4 hit / G-D `theme-color` 양면 값 `"#000000"` / G-E icons 2 항목 / G-F JSON valid + 462 byte-equal / G-G 양면 분리 박제 / G-H 발화 채널 0 hit baseline. | all |
| 2026-05-18 | TSK-20260518-09 / `77b4223` | hook-ack — 결정론 측정 fixture 박제 (`src/__tests__/public-asset-reference-coherence.test.ts` 168 line, G-A~G-G 7 게이트 + 7 `it` 단언, fixture 7/7 PASS, `npm test` 479 PASS / lint+build rc=0 회귀 0, `countMatchingLines` 헬퍼 도입으로 grep `-c` 라인 단위 의미 정합). HEAD 재실측 (`77b4223`): G-A 4 hit / G-B 4 파일 PASS / G-D theme_color 양면 `#000000` 동치 PASS / G-F `public/manifest.json` ↔ `build/manifest.json` byte-equal PASS / fixture 7/7 PASS. §테스트 현황 G-A~G-G + §수용 기준 FR-01~FR-07 7+7 marker flip. FR-08 발화 채널 부착 (pre-push / CI / `check:public-asset-coherence` script) 후속 신호는 별 axis carve 위임. | §역할 헤더 / §테스트 현황 G-A~G-G / §수용 기준 FR-01~FR-07 |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | C단계 마커 회수 — RULE-07 §수용 기준 문장 규약 적용. 판정 가능한 항목은 실측·주입 근거와 함께 flip, 미래 사건·미측정 NFR·자명 명제·별 축 위임 항목은 §참고 §미측정·비판정 항목 으로 강등. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |

## 참고

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- (G-I) 시점 비의존 — `vite` 메이저 bump · `index.html` 정적 자원 참조 갱신 · `public/manifest.json` 본문 키 갱신 후 1 PR 안에 G-A·G-B·G-C·G-D·G-E·G-F·G-G 동시 만족 회복 사례 누적.
- (G-J) 자체 진단 제외 — 본 spec / req / test 파일의 `manifest.json` / `favicon.ico` / `apple-icon-precomposed.png` / `theme-color` occurrence 가 G-A grep count 영향 0 (단일 파일 scope `index.html`).
- (Must NFR-01 결정론) 동일 HEAD 상에서 FR-01~FR-05 의 grep + `test -f` + JSON parse 의 결과가 N 회 반복 시 N 회 동일 rc + 동일 출력. build artifact 측정은 `npm run build` 1회 후 N 회 read-only 측정.
- (Must NFR-02 멱등성) 본 게이트는 read-only — `index.html` / `public/**` / `build/**` 의 파일을 수정하지 않는다. `build/**` 재생성은 게이트 실행의 부수효과로 허용되나 본 spec 자체는 build 명령 강제하지 않음 (수단 영역).
- (Should NFR-03 성능) (a) FR-01·FR-02·FR-05 의 grep + `test -f`: 단일 파일 / 4 파일 stat 으로 < 100 ms. (b) FR-04 의 값 추출 + 문자열 동치: < 200 ms. (c) FR-06 의 JSON parse: < 100 ms. (d) 전체 게이트 < 30 s (build 시간 포함 시) / < 1 s (build artifact 존재 가정 시).
- (Must NFR-04 의도 분리) manifest icon (PWA install 채널) / link rel=icon (browser tab favicon 채널) / link rel=apple-touch-icon (iOS home screen 채널) — 3 채널의 의도 분리는 본 spec 의 행동 평서문에 포함되되 어느 채널의 우선순위 라벨 ("기본" / "권장" / "우선") 박제 금지 — 수단 중립.
- (Must NFR-05 자체 진단 제외) 본 req / spec / 테스트 본문의 `manifest.json` / `favicon.ico` / `apple-icon-precomposed.png` / `theme-color` 문자열 occurrence 는 FR-01 의 `index.html` grep count 4 와 독립 — 게이트 scope 는 `index.html` 단일 파일 + `public/**` 디렉터리 + `build/**` 디렉터리로 한정.
- (Must NFR-06 외부 비파괴) 본 효능 도입은 `index.html` / `public/**` / `vite.config.js` 의 src 외부 변경 동반 없음 — 단, FR-08 의 발화 채널 부착 수단 (예: `package.json` 의 `check:*` script 추가 또는 husky hook 부착) 은 본 spec 의 In-Scope 가 아닌 수단 영역.
- (Must, 시점 비의존) `vite` 메이저 bump 또는 `index.html` 정적 자원 참조 갱신 또는 `public/manifest.json` 본문 키 갱신 후 1 PR 안에 FR-01·FR-02·FR-03·FR-04·FR-05 동시 만족 회복 사례 누적 ≥ 1건.
