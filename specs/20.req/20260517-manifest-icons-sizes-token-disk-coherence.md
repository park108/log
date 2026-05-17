# `public/manifest.json` `icons[*].sizes` 선언 토큰 집합 ↔ 자원 실재 픽셀 크기 집합 양방향 정합 시스템 불변식

> **ID**: REQ-20260517-100
> **작성일**: 2026-05-17
> **상태**: Draft

## 개요
`public/manifest.json` 의 `icons[*]` 항목은 `src` (자원 path) + `sizes` (공백 구분 픽셀 토큰 집합 — W3C Web App Manifest §icons) + `type` (MIME) 3 키 contract 를 가진다. 본 req 는 **자원 path 의 디스크 실재** axis (REQ-099 영역) 가 이미 박제된 상태에서 미박제된 **`sizes` 토큰 집합 ↔ 자원 실재 픽셀 크기 집합** 의 양방향 정합 (선언 토큰 ⊆ 자원 실재 픽셀 집합 + 자원 실재 픽셀 집합 ⊆ 선언 토큰) 결과 효능 계약을 시스템 불변식으로 박제할 것을 요청한다. 본 req 는 결과 효능 (양방향 정합 + 자체 진단 가능) 만 박제하며, 발화 채널 (CI / pre-push / `package.json` `check:*` script) 선정 및 격차 해소 수단 (manifest 토큰 수정 vs 자원 자체 재생성) 선택은 inspector/planner 영역.

## 배경
- HEAD `6a699fb` 실측 — `public/manifest.json` 의 `icons` 2 항목과 실제 자원의 픽셀 크기 집합 사이에 양방향 격차가 정착되어 있으나 `30.spec/**` 및 `20.req/` 박제 부재.
- `public/manifest.json` (`public/manifest.json:4-17`) 의 `icons` 2 항목 선언:
  - `icons[0]` (`public/manifest.json:5-10`):
    - `src = "favicon.ico"` — REQ-099 영역 (디스크 실재 박제 완료).
    - `sizes = "64x64 32x32 24x24 16x16"` — **본 req axis** (선언 토큰 집합 = {64x64, 32x32, 24x24, 16x16}, 4 개).
    - `type = "image/x-icon"`.
    - `purpose = "any maskable"`.
  - `icons[1]` (`public/manifest.json:11-16`):
    - `src = "logo192.png"` — REQ-099 영역 (디스크 실재 박제 완료).
    - `sizes = "192x192 512x512"` — **본 req axis** (선언 토큰 집합 = {192x192, 512x512}, 2 개).
    - `type = "image/png"`.
    - `purpose = "any maskable"`.
- 자원 실재 픽셀 크기 집합 (HEAD `6a699fb` 실측):
  - `public/favicon.ico` — `file public/favicon.ico` → `MS Windows icon resource - 4 icons, 64x64, 32 bits/pixel, 48x48, 32 bits/pixel`. ICONDIR 파싱 (python3 `struct.unpack('<HHH', data[0:6])` 및 `<BBBBHHII'` per-entry):
    - `reserved=0 type=1 count=4`.
    - `entry[0]: 64x64 bpp=32`.
    - `entry[1]: 48x48 bpp=32`.
    - `entry[2]: 32x32 bpp=32`.
    - `entry[3]: 16x16 bpp=32`.
    - 자원 실재 픽셀 집합 = {64x64, 48x48, 32x32, 16x16}, 4 개.
  - `public/logo192.png` — `file public/logo192.png` → `PNG image data, 192 x 192, 8-bit colormap, non-interlaced`. `sips -g pixelWidth -g pixelHeight public/logo192.png` → `pixelWidth: 192 / pixelHeight: 192`. 자원 실재 픽셀 집합 = {192x192}, 1 개 (PNG 은 single-file multi-size 불가 — 1 file = 1 dimension).
- 양방향 격차 baseline (HEAD `6a699fb`):
  - `icons[0]` (favicon.ico):
    - 선언 ⊄ 실재 : 선언 토큰 `24x24` 가 실재 ICO entry 에 부재 (선언 4 토큰 중 3 만 실재).
    - 실재 ⊄ 선언 : ICO 실재 entry `48x48` 이 선언 토큰 집합에 부재 (실재 4 entry 중 3 만 선언).
    - 양방향 정합 위반 (양쪽 모두 부분집합 관계 미충족).
  - `icons[1]` (logo192.png):
    - 선언 ⊄ 실재 : 선언 토큰 `512x512` 가 실재 PNG dimension 에 부재 (PNG = 192x192 단일).
    - 실재 ⊆ 선언 : PNG 실재 `192x192` 는 선언 토큰 집합 {192x192, 512x512} 에 포함 (단방향만 만족).
    - 양방향 정합 위반 (선언 ⊄ 실재 단방향 위반).
- 중복 회피 grep (RULE-01 writer 영역 외 read-only):
  - `grep -rln -iE "icons\[|icon.*sizes|sizes.*\".*x.*\"|maskable|purpose" specs/{30.spec,20.req,60.done} 2>/dev/null` → 2 hit:
    - `specs/30.spec/green/foundation/index-html-public-asset-reference-coherence.md` (REQ-099 의 green spec) — `icons[*].src` axis 만 박제, `sizes` / `type` / `purpose` 미박제. spec 본문 line 10 의 OOS 박제 인용: `"public/" 자원 자체의 콘텐츠 정합 (예: "favicon.ico" 의 multi-size 구성 — 파일 존재만 다룸)` — 본 req axis 가 명시적으로 별 axis 로 박제됨.
    - `specs/60.done/2026/05/17/req/20260517-index-html-public-asset-reference-coherence.md` (REQ-099) — line 79 의 OOS 인용: `"public/" 자원 자체의 콘텐츠 정합 (예: "favicon.ico" 가 실제로 16x16 / 32x32 multi-size 인지) — 본 req 는 파일 존재만 다루며 콘텐츠 비교는 별 axis.` — 본 req axis 가 명시적으로 별 axis 로 박제됨.
  - `grep -rln -iE "ICONDIR|pixelWidth|pixelHeight|sips.*-g|multi.size|ico.*entry|512x512" specs/{30.spec,20.req,60.done} 2>/dev/null` → 0 hit (자원 픽셀 측정 axis 부재 확인).
- 폐해 (시스템 효능 기준):
  - (a) `manifest.json.icons[*].sizes` 토큰 집합과 실제 자원 픽셀 집합 사이의 격차가 자동 검출 채널 부재 — PWA install 시점에서 browser 가 manifest 선언을 신뢰하여 해당 픽셀의 icon 을 요청 → 실재 부재 시 fallback 또는 broken icon. 빌드/CI/lint 단계 검출 0.
  - (b) ICO multi-size 자원의 내장 entry 가 manifest 선언과 격차가 발생해도 silent — 예: favicon.ico 가 16x16 단일로 재생성되어도 manifest 의 `"64x64 32x32 24x24 16x16"` 선언은 불변, browser 는 64x64 요청 시 16x16 stretch 또는 fallback.
  - (c) PNG single-file 의 단일 dimension 자원이 manifest 의 multi-size 선언과 격차 — `logo192.png` 가 `sizes = "192x192 512x512"` 로 선언되어 있으나 실제 PNG 은 single-dimension. browser 가 512x512 PWA install icon 요청 시 192x192 stretch 또는 fallback (PWA install banner 의 시각 품질 저하).
  - (d) 격차의 해소 방향 (manifest 토큰 수정 vs 자원 재생성) 결정 채널 부재 — 본 req 는 효능 (양방향 정합) 만 박제하며 해소 수단은 위임.
- RULE-07 양성 기준 자기 검증:
  - (1) 평서문 시점 비의존: "`manifest.json.icons[i].sizes` 토큰 집합과 `icons[i].src` 가 가리키는 자원의 실재 픽셀 크기 집합은 양방향 부분집합 관계를 만족한다" — 특정 incident/날짜/릴리스 귀속 부재. baseline 픽셀값들 (`64x64`, `48x48`, `192x192` 등) 은 baseline 박제 (§참고) 로만 사용되며 효능 평서문은 "양 집합이 정합" 의 동치 관계.
  - (2) 반복 검증 가능: ICO entry 파싱 (POSIX `python3 struct.unpack` 또는 동등 ICONDIR 파서) + PNG dimension 추출 (`file <path>` grep 또는 `sips -g pixelWidth -g pixelHeight`) + manifest sizes 토큰 split (`jq -r '.icons[].sizes' | tr " " "\n"`) — 매 빌드/매 테스트 반복 검증 가능. rc=0/1 결정론.
  - (3) incident 비의존: 현 HEAD `6a699fb` 의 양방향 격차 자체는 **baseline 측정값** 으로 박제 — 본 req 는 회귀 차단 채널 신규 박제. 격차 해소 자체는 별도 task (수단) 의 영역. 1회성 진단/마이그레이션/release patch 귀속 부재.
- 기 등록 req 와의 직교성:
  - **REQ-20260517-099 (index-html-public-asset-reference-coherence)** — `index.html` 정적 자원 참조 4종 + `public/**` 디스크 실재 + `build/**` 보존 + `manifest.json.icons[*].src` 디스크 실재 + `theme_color` 의미 동치 (4 axis). 본 req 와 동일 파일 (`manifest.json`) 의 **별 axis**: REQ-099 = `src` path + `theme_color` 값 (path/문자열 동치 영역), 본 req = `sizes` 토큰 집합 + 자원 실재 픽셀 집합 (이진 콘텐츠 측정 영역). REQ-099 의 OOS 박제 (line 79) 에 본 req axis 가 명시적으로 별 axis 로 분리되어 있음.
  - **REQ-20260517-098 (csp-meta-dev-strip-prod-preserve-asymmetry)** — `index.html:9` CSP meta 출력 비대칭. 본 req 와 별 파일 (manifest.json vs index.html) + 별 axis.
  - **REQ-20260517-097 (root-config-spec-reference-path-coherence)** — root-level 파일군 spec 참조 path 정합. 본 req 와 별 axis.
  - **REQ-root-entry-island-convergence** — src 진입점/island 박제. NFR-06 baseline 으로 `public/` 언급. 본 req 는 그 baseline 자원의 이진 콘텐츠 정합 axis — 직교.

## 목표
- **In-Scope** (req 단위):
  - `public/manifest.json.icons[*]` 의 각 항목에 대해 `sizes` 토큰 집합 ↔ `src` 가 가리키는 자원의 실재 픽셀 크기 집합의 양방향 부분집합 관계 결과 효능 게이트 박제 후보 신호.
  - 자원 형식별 픽셀 집합 추출 방법 박제:
    - ICO 자원 — ICONDIR 헤더 파싱으로 내장 entry 의 (width, height) 전수 열거. POSIX `python3 -c "import struct; ..."` 또는 동등 파서.
    - PNG 자원 — `file <path>` 의 `PNG image data, W x H` grep 또는 `sips -g pixelWidth -g pixelHeight <path>` (macOS) 또는 PNG IHDR 헤더 파싱 (12..15 byte width / 16..19 byte height) — single-file single-dimension.
  - 본 게이트 측정 단일 명령 후보 박제:
    - (g-1) `jq -r '.icons[] | "\(.src)|\(.sizes)"' public/manifest.json` 로 항목별 (src, declared sizes) pair 추출.
    - (g-2) 각 src 에 대해 자원 형식별 픽셀 집합 추출.
    - (g-3) 양방향 부분집합 비교 (declared ⊆ actual ∧ actual ⊆ declared) → 위반 시 exit 1.
  - 양방향 정합 위반 baseline 측정값 박제 (`icons[0]` favicon.ico = `{24x24 declared-missing-actual, 48x48 actual-missing-declared}` / `icons[1]` logo192.png = `{512x512 declared-missing-actual}`) — 현 시스템 회귀 차단 channel 도입의 baseline 출발점.
- **Out-of-Scope**:
  - 본 게이트의 발화 채널 선정 (pre-push 추가 vs CI 단계 부착 vs `package.json` 신규 `check:manifest-icons-coherence` script) — 모두 수단 영역.
  - 본 격차의 해소 방향 결정 (manifest 토큰 수정 vs 자원 재생성 vs ICO 의 24x24 entry 추가 + 48x48 manifest 토큰 추가 vs logo512.png 신규 자원 추가) — 별 task 의 수단 영역.
  - `purpose = "any maskable"` 의 maskable safe-zone 보장 정합 (자원 자체가 maskable safe-zone 80% inner circle 규약을 만족하는지) — 본 req 는 픽셀 크기 axis 만 다루며 maskable 의미 보장은 별 axis.
  - `type` (MIME) ↔ 자원 실제 파일 형식 정합 — 본 baseline 에서는 `image/x-icon` ↔ `MS Windows icon resource` / `image/png` ↔ `PNG image data` 로 일치하나, 본 req axis 는 sizes 만. type 정합은 별 axis (필요 시 별 req).
  - `manifest.json.icons[*].src` 디스크 실재 — REQ-099 영역 (이미 박제됨).
  - `<link rel="apple-touch-icon">` 의 `apple-icon-precomposed.png` 의 sizes 정합 — 본 자원은 `manifest.json.icons` 외부 채널 (REQ-099 의 양면 의도 분리 박제) 이며 본 req scope 는 `manifest.json.icons` 내부 항목 한정. `<link rel="apple-touch-icon">` 자체에 `sizes` attribute 부재 (`index.html:12`) 이므로 본 req axis 비적용.
  - PNG 의 multi-resolution embedding (Apple 의 `apng` 또는 `ICNS`) — 본 baseline 의 PNG 은 single-IHDR single-dimension 이며 본 req 는 표준 PNG 가정.
  - `build/manifest.json` ↔ `public/manifest.json` 의 byte-equal 정합 (Vite `publicDir` 자동 복사) — REQ-099 영역 (FR-06 에 byte-equal 박제 완료).

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `public/manifest.json.icons[*]` 의 각 항목에 대해 `sizes` 키 값에서 공백 구분 토큰을 추출하여 토큰 집합 D 를 구성하고, `src` 가 가리키는 자원에서 실재 픽셀 크기 집합 A 를 추출했을 때, **D = A** (양방향 부분집합 관계 D ⊆ A ∧ A ⊆ D) 가 성립한다. 베이스라인 측정 결과의 격차 (HEAD `6a699fb`) 는 본 spec 의 회귀 차단 baseline 으로 박제되며 본 spec 위반 상태로 분류된다 (격차 해소는 별 task 의 수단 영역). | Must |
| FR-02 | `icons[i].src` 의 자원이 ICO 형식 (`type = "image/x-icon"` 또는 `.ico` 확장자) 인 경우, ICONDIR 헤더 (offset 0..5: reserved/type/count, offset 6+: 16 byte per entry — width/height/colors/reserved/planes/bpp/size/offset) 파싱으로 내장 entry 전수의 (width, height) 쌍을 추출한 집합이 A 가 된다. width/height 가 0 인 경우 256 으로 해석한다 (ICO 규약). | Must |
| FR-03 | `icons[i].src` 의 자원이 PNG 형식 (`type = "image/png"` 또는 `.png` 확장자) 인 경우, IHDR 헤더 (offset 16..19 big-endian uint32 = width / offset 20..23 big-endian uint32 = height) 파싱 또는 `file` 명령의 `PNG image data, W x H` 패턴 추출 또는 `sips -g pixelWidth -g pixelHeight` (macOS) 의 단일 (width, height) 쌍이 집합 A 의 유일 원소가 된다. PNG single-file 은 single-dimension. | Must |
| FR-04 | `icons[i].sizes` 의 토큰 추출은 W3C Web App Manifest §icons.sizes 규약 (`<size>` = `<width>x<height>` 정수 쌍, `"any"` 는 SVG/vector 전용 특수 토큰 — 본 baseline 미사용) 에 따라 공백 구분으로 split 한 결과를 집합 D 로 한다. 토큰 정렬 / 중복은 baseline 박제 외 의미 없음 (집합 비교는 정렬 비독립). | Must |
| FR-05 | FR-01 의 양방향 부분집합 비교는 자동 검출 채널 (단위 테스트 + filesystem assertion + ICO/PNG 파서 또는 동등 fixture) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit/pre-push/CI) 선정은 수단 영역이나 "발화 채널이 존재해야 한다" 는 계약 자체는 Should. | Should |
| FR-06 | 본 게이트 출력은 위반 발생 시 격차 항목 (어느 icon index / 어느 픽셀 토큰이 declared-missing-actual 또는 actual-missing-declared) 을 명시적으로 식별하여 보고한다 — 자동 검출 채널의 진단 가능성 보장. 출력 포맷은 수단 영역 (예: `icons[0]:declared-missing-actual=24x24` / `icons[0]:actual-missing-declared=48x48`). | Should |
| FR-07 | `icons[*].purpose` 키 값 (`"any maskable"` baseline) 은 본 spec axis 와 직교 — 본 req 는 sizes 정합만 다루며 maskable 의미 보장 (safe-zone 80% inner circle) 은 미박제. baseline `purpose = "any maskable"` 자체는 시스템 측정값으로 참조만 (§참고). | Could |
| FR-08 | 자원 형식이 ICO/PNG 외 (예: SVG / WebP / AVIF) 로 확장되는 경우 본 spec 의 형식별 픽셀 추출 규약은 형식별 분기로 확장 박제 신호. baseline 은 ICO + PNG 2 형식 한정 (HEAD `6a699fb`). 형식 추가 시 본 spec 갱신 신호. | Could |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 결정론 | 동일 HEAD 상에서 FR-01~FR-04 의 ICO 파싱 + PNG dimension 추출 + sizes 토큰 split 결과가 N 회 반복 시 N 회 동일 rc + 동일 집합 출력. ICO/PNG 자원이 binary 결정론으로 byte-equal 한 한 항상 동일 픽셀 집합. |
| NFR-02 | 멱등성 | 본 게이트는 read-only — `public/manifest.json` / `public/favicon.ico` / `public/logo192.png` 의 파일을 수정하지 않는다. ICO/PNG 파서는 binary read-only access. |
| NFR-03 | 성능 | (a) ICO ICONDIR 파싱: header + per-entry × N (N=4 baseline) → < 50 ms. (b) PNG IHDR 파싱: 24 byte read → < 50 ms. (c) `jq` sizes 추출 + 토큰 split: < 100 ms. (d) 양방향 집합 비교: O(\|D\| + \|A\|) → < 50 ms. (e) 전체 게이트: `icons[*]` 항목 전수 × (파싱 + 비교) → < 500 ms (baseline 2 항목). |
| NFR-04 | 형식 독립성 | ICO 파싱 / PNG 파싱은 자원 형식별 분기 박제 — 형식 분기 외 본 effort 의 정합 평서문 자체는 형식 독립 (D = A 의 양방향 부분집합 관계). 자원 형식 추가/변경 시 형식별 분기 spec 갱신은 본 spec 의 maintenance signal. |
| NFR-05 | 자체 진단 제외 | 본 req / spec / 테스트 본문의 `sizes` / `192x192` / `512x512` / `64x64` 등 문자열 occurrence 는 FR-01 의 manifest 측정과 독립 — 게이트 scope 는 `public/manifest.json` 단일 파일 + `icons[*].src` 가 가리키는 자원 파일들 한정. |
| NFR-06 | 외부 비파괴 | 본 효능 도입은 `public/manifest.json` / `public/favicon.ico` / `public/logo192.png` / `index.html` / `vite.config.js` 의 src 외부 변경 동반 없음 — 단, FR-05 의 발화 채널 부착 수단 (예: `package.json` 의 `check:*` script 추가 또는 husky hook 부착) 은 본 req 의 In-Scope 가 아닌 수단 영역. baseline 격차 자체의 해소 (manifest 토큰 수정 vs 자원 재생성) 도 별 task 영역. |

## 수용 기준
- [ ] **Given** HEAD `6a699fb` (또는 동일 baseline 재현 HEAD), **When** `jq -r '.icons[].sizes' public/manifest.json` 실행, **Then** 출력 = 2 줄 (`"64x64 32x32 24x24 16x16"` + `"192x192 512x512"`) + rc=0 (FR-04 baseline 박제).
- [ ] **Given** 동일 HEAD, **When** `python3 -c "import struct; data=open('public/favicon.ico','rb').read(); r,t,c = struct.unpack('<HHH', data[0:6]); print(c)"` 실행, **Then** 출력 = `4` (ICO entry count baseline — FR-02 박제).
- [ ] **Given** 동일 HEAD, **When** ICO ICONDIR entry 전수 파싱 (offset 6 + i*16, width/height fields), **Then** {(64,64), (48,48), (32,32), (16,16)} 4 쌍 추출 (FR-02 baseline 박제).
- [ ] **Given** 동일 HEAD, **When** `file public/logo192.png` 또는 `sips -g pixelWidth -g pixelHeight public/logo192.png`, **Then** dimension = `192 x 192` 단일 (FR-03 baseline 박제).
- [ ] **Given** 동일 HEAD, **When** FR-01 의 양방향 비교를 `icons[0]` 에 대해 수행 (declared = {64x64, 32x32, 24x24, 16x16}, actual = {64x64, 48x48, 32x32, 16x16}), **Then** 격차 검출 (`24x24 declared-missing-actual` + `48x48 actual-missing-declared`) → 게이트 rc=1 (현 baseline 위반 상태 박제).
- [ ] **Given** 동일 HEAD, **When** FR-01 의 양방향 비교를 `icons[1]` 에 대해 수행 (declared = {192x192, 512x512}, actual = {192x192}), **Then** 격차 검출 (`512x512 declared-missing-actual`) → 게이트 rc=1 (현 baseline 위반 상태 박제).
- [ ] **Given** 가설 정상화 — `public/manifest.json.icons[0].sizes` 를 `"64x64 48x48 32x32 16x16"` 로 갱신 (또는 favicon.ico 를 declared 와 동일한 4 entry 로 재생성), **When** FR-01 게이트 실행, **Then** rc=0 (정합 회복).
- [ ] **Given** 가설 정상화 — `public/manifest.json.icons[1].sizes` 를 `"192x192"` 로 갱신 (또는 512x512 PNG 신규 자원 추가 + manifest 항목 분리), **When** FR-01 게이트 실행, **Then** rc=0 (정합 회복).
- [ ] **Given** 가설 회귀 — `public/favicon.ico` 의 entry 1 개 (예: 16x16) 삭제 후 재저장, **When** FR-01 게이트 실행, **Then** `16x16 declared-missing-actual` 격차 검출 → rc=1.
- [ ] **Given** 본 req 수렴 후 HEAD, **When** FR-05 의 발화 채널 (pre-push / CI 등) 에서 게이트 실행, **Then** rc=0/1 결정론 판정 + FR-06 의 위반 격차 항목 명시적 보고 (수단 중립 — 어떤 발화 채널을 채택하든 결과 효능 동일).

## 참고
- 원본 코드:
  - `public/manifest.json:4-17` — `icons` 2 항목 baseline (HEAD `6a699fb`).
  - `public/manifest.json:7` — `icons[0].sizes = "64x64 32x32 24x24 16x16"`.
  - `public/manifest.json:14` — `icons[1].sizes = "192x192 512x512"`.
  - `public/favicon.ico` — ICONDIR 파싱 결과 `count=4 / 64x64+48x48+32x32+16x16` (HEAD `6a699fb`).
  - `public/logo192.png` — PNG `192 x 192 single-IHDR` (HEAD `6a699fb`).
- 현 baseline 실측 (HEAD `6a699fb`):
  - `icons[0]` 격차: declared = {64x64, 32x32, 24x24, 16x16} / actual = {64x64, 48x48, 32x32, 16x16} → `declared-missing-actual = {24x24}` + `actual-missing-declared = {48x48}`.
  - `icons[1]` 격차: declared = {192x192, 512x512} / actual = {192x192} → `declared-missing-actual = {512x512}` + `actual-missing-declared = {}`.
  - `icons[*].purpose` = `"any maskable"` (양 항목 동일 — 본 req 직교).
  - `icons[*].type` = `image/x-icon` / `image/png` (자원 실제 형식과 일치 — 본 req 직교).
- 인접 req:
  - `specs/60.done/2026/05/17/req/20260517-index-html-public-asset-reference-coherence.md` (REQ-099) — `icons[*].src` 디스크 실재 axis. 본 req 와 동일 파일의 별 axis (path 정합 vs sizes 정합). REQ-099 OOS line 79 인용: `"public/" 자원 자체의 콘텐츠 정합 (예: "favicon.ico" 가 실제로 16x16 / 32x32 multi-size 인지) — 본 req 는 파일 존재만 다루며 콘텐츠 비교는 별 axis.`
  - `specs/30.spec/green/foundation/index-html-public-asset-reference-coherence.md` (REQ-099 green spec) — `icons[*].src` axis 박제. 본 req 의 sizes axis 는 별 axis (spec 본문 line 10 OOS 박제).
  - `specs/60.done/2026/05/17/req/20260517-csp-meta-dev-strip-prod-preserve-asymmetry.md` (REQ-098) — index.html CSP meta axis. 본 req 와 별 파일 + 별 axis.
- 외부 레퍼런스 (시점 비의존):
  - W3C Web App Manifest §icons — `icons[*].sizes` = space-separated `<width>x<height>` 정수 쌍, `"any"` 는 vector. browser implementation 은 PWA install 시 선언 sizes 를 신뢰하여 해당 픽셀의 icon 을 요청.
  - Microsoft ICO format (ICONDIR + ICONDIRENTRY) — offset 0..5 = (reserved=0, type=1 for ICO, count=N), offset 6 + i*16 = (width: byte, height: byte, colors: byte, reserved: byte, planes: ushort, bpp: ushort, size: uint32, offset: uint32). width/height = 0 → 256 (256x256 표현).
  - PNG IHDR — file signature 8 byte + IHDR length 4 byte + "IHDR" 4 byte + width: big-endian uint32 (offset 16..19) + height: big-endian uint32 (offset 20..23). single-IHDR per file → single-dimension.
- RULE-01 §파일 이름: `specs/30.spec/{blue,green}/**/<slug>.md` — `-spec` suffix 금지 (`/Users/park108/Dev/log/.claude/rules/RULE-01-PIPELINE.md:25`). 본 req 의 향후 spec 박제 시 RULE-01 준수 필수.
- RULE-07 §양성 기준: 본 req 는 (1) 평서문 시점 비의존 (양방향 부분집합 관계 D = A) + (2) 반복 검증 가능 (ICONDIR/IHDR binary 파싱 + jq 토큰 split + 집합 비교) + (3) incident 비의존 (현 격차는 회귀 차단 channel baseline 측정값으로 박제; 격차 해소는 별 task 영역) 3 조건 자기 검증 완료.
