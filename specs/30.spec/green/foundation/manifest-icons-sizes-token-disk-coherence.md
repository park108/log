# `public/manifest.json.icons[*].sizes` 선언 토큰 집합 ↔ 자원 실재 픽셀 크기 집합 양방향 부분집합 정합 시스템 불변식

> **위치**: 횡단 빌드/자원 시스템 불변식 — `public/manifest.json` (`icons[*].sizes` + `icons[*].src` + `icons[*].type` 키) + `public/<icons[*].src>` 가 가리키는 binary 자원 (baseline: `public/favicon.ico` ICO 4 entry / `public/logo192.png` PNG single-IHDR) + 형식별 픽셀 추출 파서 (ICONDIR 헤더 + IHDR 헤더 또는 `file` / `sips` 동등 picker).
> **관련 요구사항**: REQ-20260517-100
> **최종 업데이트**: 2026-05-18 (by inspector — 최초 박제; Phase 2 REQ-100 흡수)

> 본 spec 은 자매 `foundation/index-html-public-asset-reference-coherence.md` (REQ-099) 와 동일 파일 (`public/manifest.json`) 의 별 axis (REQ-099 = `icons[*].src` path 의 디스크 실재 정합 + `theme_color` 값 동치 / 본 spec = `icons[*].sizes` 토큰 집합 ↔ 자원 실재 픽셀 크기 집합 이진 콘텐츠 측정 정합). REQ-099 의 OOS 박제 (green spec line 10) 에 본 spec axis 가 명시적 별 axis 로 사전 박제됨.

## 역할
`public/manifest.json.icons[*]` 의 각 항목에 대해 **선언 토큰 집합 D = sizes 키 값을 공백 split 한 `<W>x<H>` 토큰들** 과 **실재 픽셀 집합 A = `src` 가 가리키는 자원의 형식별 픽셀 추출 결과** 는 **양방향 부분집합 관계 D = A (D ⊆ A ∧ A ⊆ D)** 를 만족한다. 의도적으로 하지 않는 것: 게이트 발화 채널 (pre-commit / pre-push / CI / 신규 `package.json` `check:manifest-icons-coherence` script) 선정, 격차 해소 방향 결정 (manifest 토큰 수정 vs 자원 재생성 vs ICO entry 추가 vs `logo512.png` 등 신규 자원 추가), `icons[*].purpose` (`"any maskable"` baseline) 의 maskable safe-zone 80% inner circle 보장 정합 (별 axis), `icons[*].type` (MIME) ↔ 자원 실제 파일 형식 정합 (별 axis), `<link rel="apple-touch-icon">` 의 `apple-icon-precomposed.png` 의 sizes 정합 (현 `index.html:12` 에 `sizes` attribute 부재 — `manifest.json.icons` 외부 채널), PNG 의 multi-resolution embedding (APNG / ICNS — 본 baseline 미사용), `public/manifest.json` ↔ `build/manifest.json` 의 byte-equal 정합 (REQ-099 FR-06 영역), `icons[*].src` 자체의 디스크 실재 정합 (REQ-099 영역).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `public/manifest.json` JSON parse + `icons[*].sizes` 공백 split + `icons[*].src` 가 가리키는 자원의 형식별 binary 헤더 파싱 (ICONDIR 또는 IHDR) + 양방향 부분집합 비교 fixture.

## 동작
1. (G-A) `public/manifest.json` JSON 유효성 + `icons` 배열 추출 게이트 — FR-01 선결
   - 명령: `jq -r '.icons[] | "\(.src)|\(.sizes)|\(.type)"' public/manifest.json` → **rc=0** + 출력 줄 수 = `icons` 배열 길이.
   - baseline (HEAD `030331020063106ae698e5fe2a59c95ff5d99abe`): 2 줄
     - `favicon.ico|64x64 32x32 24x24 16x16|image/x-icon`
     - `logo192.png|192x192 512x512|image/png`
   - 의미: `manifest.json` 이 valid JSON 이고 `icons` 배열의 각 항목이 (src, sizes, type) 3 키를 가진다. JSON parse 실패 또는 키 부재는 본 spec 위반.
2. (G-B) `icons[i].sizes` 토큰 집합 D 추출 게이트 — FR-04
   - 절차: 각 항목에 대해 `jq -r '.icons[i].sizes' public/manifest.json | tr ' ' '\n' | sort -u` → 집합 D.
   - baseline: `D[0] = {16x16, 24x24, 32x32, 64x64}` (4 토큰) / `D[1] = {192x192, 512x512}` (2 토큰).
   - 의미: W3C Web App Manifest §icons.sizes 규약에 따라 공백 구분된 `<W>x<H>` 정수 쌍을 집합으로 추출. `"any"` (SVG/vector 전용) 토큰은 baseline 미사용 — 출현 시 본 spec 갱신 신호.
3. (G-C) ICO 자원 픽셀 집합 A 추출 게이트 — FR-02
   - 절차: `icons[i].src` 가 ICO 형식 (`type = "image/x-icon"` 또는 `.ico` 확장자) 인 경우, ICONDIR 헤더 (offset 0..5: reserved=0 + type=1 + count=N) + per-entry (offset 6 + i*16, byte width / byte height — 값 0 은 256 으로 해석) 파싱.
   - baseline (`public/favicon.ico`, 32038 byte): `reserved=0 type=1 count=4` + entry 픽셀 집합 `A[0] = {(64,64), (48,48), (32,32), (16,16)}` 를 `{16x16, 32x32, 48x48, 64x64}` 토큰 집합으로 정규화.
   - 의미: ICO multi-icon 자원의 내장 entry 전수가 A 의 원소. width/height = 0 인 entry 는 256 으로 해석 (ICO 규약).
4. (G-D) PNG 자원 픽셀 집합 A 추출 게이트 — FR-03
   - 절차: `icons[i].src` 가 PNG 형식 (`type = "image/png"` 또는 `.png` 확장자) 인 경우, IHDR 헤더 (file signature 8 byte + IHDR length 4 byte + "IHDR" 4 byte + offset 16..19 big-endian uint32 = width + offset 20..23 big-endian uint32 = height) 파싱 또는 `file <path>` 의 `PNG image data, W x H` 패턴 또는 `sips -g pixelWidth -g pixelHeight <path>`.
   - baseline (`public/logo192.png`, 2005 byte): IHDR width=192 height=192 → `A[1] = {192x192}` (single-IHDR single-dimension — PNG 은 single-file multi-size 불가).
   - 의미: PNG 자원의 단일 dimension 이 A 의 유일 원소. multi-resolution 표현이 필요하면 별 자원 분리 (예: `logo512.png`) — 본 baseline 미적용.
5. (G-E) 양방향 부분집합 비교 게이트 — FR-01
   - 절차: 각 항목 i 에 대해 `D[i] ⊆ A[i] ∧ A[i] ⊆ D[i]` 동치 비교 → 만족 시 rc=0, 위반 시 위반 격차 항목 (`<index>:declared-missing-actual=<token>` 또는 `<index>:actual-missing-declared=<token>`) 명시 + rc=1.
   - baseline (HEAD `030331020063106ae698e5fe2a59c95ff5d99abe`) — 양방향 정합 위반 상태 박제 (회귀 차단 channel baseline):
     - `icons[0]` favicon.ico: `D[0] - A[0] = {24x24}` (declared-missing-actual) + `A[0] - D[0] = {48x48}` (actual-missing-declared) — 양쪽 부분집합 관계 모두 위반.
     - `icons[1]` logo192.png: `D[1] - A[1] = {512x512}` (declared-missing-actual) + `A[1] - D[1] = {}` — 선언 단방향 위반 (실재는 선언의 부분집합이나 역은 미충족).
   - 의미: 본 baseline 의 격차 자체는 본 spec 위반 상태로 분류되며, 격차 해소 (manifest 토큰 수정 vs 자원 재생성 등) 는 별 task 의 수단 영역. 본 spec 은 회귀 차단 채널 박제만.
6. (G-F) 회귀 검출 채널 존재 게이트 — FR-05 + FR-06
   - G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E 5 조건은 단위 테스트 + filesystem assertion + ICO/PNG 헤더 파서 (또는 동등 fixture) 채널을 통해 rc=0/1 결정론으로 판정된다. 위반 시 격차 항목을 명시적으로 식별하여 보고 (어느 `icons` index / 어느 픽셀 토큰이 declared-missing-actual 또는 actual-missing-declared 인지 — 진단 가능성 보장). 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:manifest-icons-coherence` script) 선정은 수단 영역이나 "발화 채널이 존재해야 한다" 는 계약 자체는 박제.
7. (G-G) 형식 분기 확장 박제 게이트 — FR-08
   - baseline 자원 형식은 ICO + PNG 2 형식 (HEAD `030331020063106ae698e5fe2a59c95ff5d99abe`). 자원 형식이 SVG / WebP / AVIF 등으로 확장되면 본 spec 의 형식별 픽셀 추출 규약은 형식별 분기로 확장 박제 신호 (G-C / G-D 외 G-C-svg / G-C-webp 등). SVG 자원에 한해 `sizes = "any"` 토큰 허용 (W3C 규약 — vector). 형식 추가/변경 시 본 spec 갱신 신호.
8. (G-H) 시점 비의존 — NFR-01
   - G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E 는 `vite` 메이저 bump · Vite `publicDir` 정책 변경 · `public/manifest.json` 본문 `icons` 키 갱신 · `public/favicon.ico` 재생성 · `public/logo192.png` 재생성 · `public/<신규>.png` 자원 추가 등 어떤 이벤트 직후에도 동일 측정으로 결과 효능 유지 (rc=0). 이벤트 발생 시 1 PR 안에 5 조건 동시 만족 회복 또는 본 spec 갱신.
9. (G-I) 자체 진단 제외 — 결정론 보장
   - 본 req / 본 spec / 테스트의 본문 내 `sizes` / `64x64` / `48x48` / `192x192` / `512x512` 등 문자열 occurrence 는 G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E 의 측정과 독립 — 게이트 scope 는 `public/manifest.json` 단일 파일 + `public/<icons[*].src>` 가 가리키는 자원 파일들 한정. 동일 HEAD 상에서 본 게이트 N 회 실행 시 N 회 동일 rc + 동일 출력.
10. (G-J) 멱등성 — NFR-02
    - 본 게이트는 read-only — `public/manifest.json` / `public/favicon.ico` / `public/logo192.png` 의 파일을 수정하지 않는다. ICO/PNG 파서는 binary read-only access. N 회 실행 후 자원 byte-equal 보존.

## 의존성
- 내부: `public/manifest.json` (`icons[*].sizes` + `icons[*].src` + `icons[*].type` 키 baseline 박제 위치), `public/favicon.ico` (ICO 4 entry binary 자원 — baseline 32038 byte), `public/logo192.png` (PNG single-IHDR binary 자원 — baseline 2005 byte).
- 외부: W3C Web App Manifest §icons.sizes (`<W>x<H>` 정수 쌍 공백 구분 토큰 규약 / `"any"` 는 vector 전용 특수 토큰), Microsoft ICO format (ICONDIR + ICONDIRENTRY 16 byte per entry / width-height 0 은 256 으로 해석), PNG IHDR (file signature 8 byte + IHDR length 4 byte + "IHDR" 4 byte + offset 16..19 width + offset 20..23 height big-endian uint32), POSIX `jq` (G-A / G-B 토큰 추출), POSIX `python3` 또는 동등 binary 파서 (G-C / G-D 헤더 파싱), POSIX `file` 또는 macOS `sips` (G-D 대체 picker).
- 역의존 (사용처): pre-push / CI 단계의 manifest-icons 정합 검증 hook 또는 `package.json` 신규 `check:manifest-icons-coherence` script (수단 위임). `public/manifest.json` 의 `icons[*].sizes` / `icons[*].src` 키 값 갱신 또는 `public/favicon.ico` / `public/logo192.png` / `public/<icons[*].src>` 자원 재생성/추가/삭제 모두 본 spec 위반 회귀 후보. 자매 spec `foundation/index-html-public-asset-reference-coherence.md` (REQ-099 green) 와 동일 파일 (`public/manifest.json`) 의 별 axis 박제 — 본 spec 의 격차 해소 task 가 manifest 본문을 수정하는 경우 REQ-099 의 G-E (`icons[*].src` 디스크 실재) 게이트 동시 만족 필수.

## 테스트 현황
- [ ] G-A (`jq` `icons` 배열 추출 + 3 키 본문 검증) — baseline 2 줄 (`favicon.ico|64x64 32x32 24x24 16x16|image/x-icon` + `logo192.png|192x192 512x512|image/png`) 미회복 자동 검출 채널 부재.
- [ ] G-B (sizes 토큰 split → 집합 D 추출) — baseline `D[0]` 4 토큰 / `D[1]` 2 토큰 미회복 자동 검출 채널 부재.
- [ ] G-C (ICO ICONDIR 파싱 → 집합 A 추출) — baseline `count=4` + `A[0] = {16x16, 32x32, 48x48, 64x64}` 미회복 자동 검출 채널 부재.
- [ ] G-D (PNG IHDR 파싱 → 집합 A 추출) — baseline `A[1] = {192x192}` 미회복 자동 검출 채널 부재.
- [ ] G-E (양방향 부분집합 비교 D = A) — baseline 위반 상태 박제 (`icons[0]`: `{24x24 declared-missing-actual, 48x48 actual-missing-declared}` / `icons[1]`: `{512x512 declared-missing-actual}`) — 회귀 차단 채널 미도입.
- [ ] G-F 회귀 검출 채널 존재 — 단위 테스트 + filesystem assertion + ICO/PNG 파서 fixture 미도입.
- [ ] G-G 형식 분기 확장 (ICO + PNG 외 신규 형식) — baseline 2 형식 한정, 확장 신호 채널 부재.
- [ ] G-H 시점 비의존 회복 — vite/publicDir/자원 재생성 이벤트 직후 5 조건 동시 만족 회복 fixture 부재.
- [ ] G-I 자체 진단 제외 — `public/manifest.json` + `public/<icons[*].src>` 한정 scope baseline 박제 미회복 (fixture 부재).
- [ ] G-J 멱등성 (read-only 보장) — N 회 게이트 실행 후 자원 byte-equal fixture 부재.

## 수용 기준
- [ ] (Must) FR-01 — `icons[*]` 의 각 항목에 대해 D ⊆ A ∧ A ⊆ D 양방향 부분집합 관계 만족. baseline 격차 (HEAD `030331020063106ae698e5fe2a59c95ff5d99abe`) 는 본 spec 위반 상태로 분류 — 격차 해소는 별 task 의 수단 영역.
- [ ] (Must) FR-02 — ICO 자원 (`type = "image/x-icon"` 또는 `.ico`) 의 ICONDIR 파싱으로 내장 entry 전수의 (width, height) 쌍 집합 A 추출. width/height = 0 → 256 해석.
- [ ] (Must) FR-03 — PNG 자원 (`type = "image/png"` 또는 `.png`) 의 IHDR 파싱 또는 `file` / `sips` 동등 picker 의 단일 (width, height) 쌍이 A 의 유일 원소.
- [ ] (Must) FR-04 — `icons[i].sizes` 공백 구분 split 으로 토큰 집합 D 추출. W3C §icons.sizes 규약 (`<W>x<H>` 정수 쌍 / `"any"` 는 vector 전용 — baseline 미사용).
- [ ] (Should) FR-05 — FR-01 의 양방향 비교는 자동 검출 채널 (단위 테스트 + filesystem assertion + ICO/PNG 파서 또는 동등 fixture) 을 통해 rc=0/1 결정론 판정. 발화 시점 채널 선정은 수단 영역이나 "발화 채널 존재" 자체는 박제.
- [ ] (Should) FR-06 — 게이트 출력은 위반 발생 시 격차 항목 (`<index>:declared-missing-actual=<token>` / `<index>:actual-missing-declared=<token>`) 을 명시적으로 식별하여 보고 — 진단 가능성 보장.
- [ ] (Could) FR-07 — `icons[*].purpose` (`"any maskable"` baseline) 의 maskable safe-zone 80% inner circle 의미 보장은 본 spec axis 와 직교 (별 axis — 필요 시 별 req).
- [ ] (Could) FR-08 — 자원 형식이 ICO/PNG 외 (SVG / WebP / AVIF) 로 확장 시 형식별 분기 spec 갱신 신호. SVG 한정 `sizes = "any"` 토큰 허용 (W3C 규약).

## 비기능 기준
- [ ] (NFR-01 결정론) 동일 HEAD 상에서 G-A ∧ G-B ∧ G-C ∧ G-D ∧ G-E 의 측정 N 회 반복 시 N 회 동일 rc + 동일 집합 출력. ICO/PNG 자원이 binary byte-equal 한 한 항상 동일 픽셀 집합.
- [ ] (NFR-02 멱등성) 본 게이트는 read-only — `public/manifest.json` / `public/favicon.ico` / `public/logo192.png` 의 파일을 수정하지 않는다.
- [ ] (NFR-03 성능) 전체 게이트 (ICONDIR + IHDR 파싱 + `jq` 추출 + 양방향 비교) — `icons[*]` 항목 전수 (baseline 2 항목) × (파싱 + 비교) < 500 ms.
- [ ] (NFR-04 형식 독립성) 정합 평서문 자체 (D = A) 는 형식 독립. 자원 형식별 분기 (G-C / G-D) 박제는 maintenance signal.
- [ ] (NFR-05 자체 진단 제외) 본 req/spec/테스트 본문의 토큰 occurrence 가 게이트 측정에 간섭하지 않는다 (게이트 scope = `public/manifest.json` + `public/<icons[*].src>` 한정).
- [ ] (NFR-06 외부 비파괴) `public/manifest.json` / `public/favicon.ico` / `public/logo192.png` / `index.html` / `vite.config.js` 의 src 외부 변경 동반 없음. 격차 해소 자체 (manifest 토큰 수정 vs 자원 재생성) 는 별 task 영역.

## 스코프 규칙
- **expansion**: N/A (자원 콘텐츠 정합 횡단 게이트 — task 발행 시점에 planner 재계산).
- **grep-baseline** (HEAD `030331020063106ae698e5fe2a59c95ff5d99abe` 실측):
  - `jq -r '.icons[] | "\(.src)|\(.sizes)|\(.type)"' public/manifest.json` → 2 줄:
    - `favicon.ico|64x64 32x32 24x24 16x16|image/x-icon`
    - `logo192.png|192x192 512x512|image/png`
  - `python3 -c "import struct; data=open('public/favicon.ico','rb').read(); r,t,c = struct.unpack('<HHH', data[0:6]); print(c)"` → `4`
  - ICONDIR entry 전수 파싱 (offset 6 + i*16, width/height byte): `{(64,64), (48,48), (32,32), (16,16)}` 4 쌍.
  - `file public/logo192.png` → `PNG image data, 192 x 192, 8-bit colormap, non-interlaced` (1 hit).
  - `python3 -c "import struct; data=open('public/logo192.png','rb').read(); print(struct.unpack('>I', data[16:20])[0], struct.unpack('>I', data[20:24])[0])"` → `192 192`.
  - 양방향 부분집합 비교 (`icons[0]`): `D[0] = {16x16, 24x24, 32x32, 64x64}` vs `A[0] = {16x16, 32x32, 48x48, 64x64}` → `D-A = {24x24}` (declared-missing-actual) + `A-D = {48x48}` (actual-missing-declared) → **양방향 위반 rc=1**.
  - 양방향 부분집합 비교 (`icons[1]`): `D[1] = {192x192, 512x512}` vs `A[1] = {192x192}` → `D-A = {512x512}` + `A-D = {}` → **단방향 위반 rc=1**.
  - 자원 byte size (멱등성 baseline): `public/manifest.json` 462 byte / `public/favicon.ico` 32038 byte / `public/logo192.png` 2005 byte.
  - 중복 회피 grep: `grep -rln -iE "ICONDIR|pixelWidth|pixelHeight|sips.*-g|512x512" specs/{30.spec/blue,30.spec/green} 2>/dev/null` → 0 hit (이전 spec 영역에 본 axis 박제 부재 — REQ-099 영역과 정확히 별 axis).
- **rationale**: 본 spec 은 binary 자원 콘텐츠 측정 (ICONDIR / IHDR 헤더 파싱) + JSON 토큰 split + 양방향 집합 비교의 횡단 게이트. baseline 자체가 위반 상태 (회귀 차단 channel 미도입) 로 박제되므로 task 발행 시점에 planner 가 grep-baseline 재계산하고, 격차 해소 수단 (토큰 수정 vs 자원 재생성) 은 별도 axis 의 task 로 carve.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-18 | inspector / new-req-100-absorb-`0303310` | 최초 박제 — REQ-100 흡수 (manifest.json.icons[*].sizes 토큰 집합 ↔ 자원 실재 픽셀 크기 집합 양방향 부분집합 정합 D = A 시스템 불변식 + ICO ICONDIR + PNG IHDR 형식별 파싱 + 양방향 격차 baseline 측정값 박제) | all |
