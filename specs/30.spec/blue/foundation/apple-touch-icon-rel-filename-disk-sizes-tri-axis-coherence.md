# apple-touch-icon rel ↔ href filename suffix ↔ disk PNG sizes 3-axis synonym coherence

> **위치**: `index.html` 의 `<link rel="apple-touch-icon" ...>`, `public/apple-icon-precomposed.png`
> **관련 요구사항**: REQ-20260518-017
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: 게이트 구현 + 3축 회수 + green→blue promote)

> 참조는 식별자 우선, 라인 번호 보조. 라인 번호는 스냅샷.

## 역할

`index.html` 의 `apple-touch-icon` 계열 `<link>` 가 가리키는 자산은 (a) `rel` 토큰, (b) `href` 파일명 어미, (c) `public/<basename>` 디스크 PNG 의 IHDR 픽셀 사이즈 — 세 축이 동일한 의미 (rel 토큰 = 어미 기호 = 사이즈 규약) 를 박제해야 한다. 동음이의 (rel 모던 + 어미 레거시 + 사이즈 비표준) 잔존 시 fail-fast.

의도적 비범위: PNG 자산 디자인 교체, manifest `icons[]` 에 apple-icon 포함 여부 정책 결정, HTTP 헤더·CSP·캐시.

## 공개 인터페이스

해당 spec 은 시스템 산출물 (HTML + 디스크 PNG) 의 정합 게이트이며 런타임 코드 인터페이스가 아니다. 게이트 입력·출력은 §동작 참조.

## 동작

### 동의어 매핑 표 (단일 출처)

| rel 토큰 | href 어미 규약 | 디스크 sizes (px) | 의미 |
|---------|---------------|-----------------|------|
| `apple-touch-icon` | 어미 무접미 또는 `-precomposed` (호환) | 180x180 | 모던 iOS 7+, 시스템 후처리 (광택/마스크) 적용 |
| `apple-touch-icon-precomposed` | 어미 `-precomposed` (권장) | 180x180 | 레거시 iOS ≤6, 사전 합성 완료 (시스템 후처리 금지) |

- 사이즈 표준 단일 출처: **180x180** (Apple HIG iPhone @3x). rel 의미는 시스템 후처리 여부와 직교, 사이즈와는 무관.
- 192x192 는 Android/PWA `logo192.png` 와 동축이며 iOS apple-touch-icon 자산 축과 분리된다.

### 게이트 입력·출력

- 입력: `index.html` (head `<link>` 목록), `public/*.png` (IHDR 헤더).
- 출력: PASS / fail-fast 메시지 (관측 4-tuple).

### 게이트 절차 (의사코드)

```
1. index.html 파싱 → rel ∈ {"apple-touch-icon", "apple-touch-icon-precomposed"} 인 <link> 집합 L 추출.
2. for each link ℓ ∈ L:
     basename = parse_basename(ℓ.href)  // 선행 슬래시 무시
     suffix   = "-precomposed" if basename ends with "-precomposed.png" else "none"
     disk_path = "public/" + basename
     if not exists(disk_path): fail FR-05(iii) with (ℓ.rel, suffix, "—", "expected " + lookup_row(ℓ.rel).size)
     (w,h) = read_png_ihdr(disk_path)  // offset 16..23, BE u32 x 2
     row = lookup_row(ℓ.rel)
     if w != 180 or h != 180:
        // 180 표준 위반 — 모던 rel + 어미 모순 시 (i), 그 외 (ii) 분기
        if ℓ.rel == "apple-touch-icon" and suffix == "-precomposed":
            fail FR-05(i) with (ℓ.rel, suffix, w, "expected 180")
        else:
            fail FR-05(ii) with (ℓ.rel, suffix, w, "expected 180")
3. if |{ℓ ∈ L : ℓ.rel == r}| > 1 for any r: fail FR-05(iv) with (r, count, "—", "expected 1").
4. else PASS.
```

### PNG IHDR 결정론 경로

- `file(1)` POSIX 출력 또는 `node:fs` 로 24-byte 헤더 read 후 offset 16..23 BE u32 x 2 파싱 — 둘 중 하나의 결정론 경로를 본 spec 의 단일 출처로 박제. 도구 비의존 (ImageMagick / sharp / probe-image-size 미사용).

## 의존성

- 내부 (불변식 의존): `index.html` (head 영역), `public/apple-icon-precomposed.png` 등 PNG 자산.
- 외부: POSIX `file(1)` 또는 Node 표준 라이브러리 `node:fs` (PNG IHDR 24-byte 헤더 read). 추가 의존 0건.
- 역의존: `index-html-public-asset-reference-coherence` (link href ↔ public 자산 2축 — 본 spec 의 FR-01 위임 대상), `manifest-icons-sizes-token-disk-coherence` (manifest icons[].sizes ↔ PNG IHDR — apple-touch-icon 미커버 사각지대).

## 테스트 현황

게이트: `src/__tests__/apple-touch-icon-tri-axis-coherence.test.ts` (10 `it`, 전수 PASS). 측정 HEAD=`26d91b1` + 본 변경.

- [x] 게이트 구현 + 4 위반 분기 + 1 PASS 경로 — 의사코드 1~4 를 순수 함수 `evaluate(html, exists, pngSize)` 로 구현. 위반 분기는 합성 입력으로 통과시켜 저장소를 깨뜨리지 않는다.
- [x] 매핑 표 grep singleton 검증 — `grep -rln "apple-touch-icon-precomposed" specs/30.spec/` → **1 파일** (본 spec).

## 수용 기준

- [x] (Must, FR-02) 동의어 매핑 표가 본 spec §동작 에 단일 출처로 박제 — `specs/30.spec/` 내 매핑 정의 행은 본 파일에만 등장 (1 파일).
- [x] (Must, FR-03) 매핑 표 2행 × 3축 완전 박제 + 사이즈 표준 180x180 단일 출처 — fixture 의 `MAPPING` / `STANDARD_SIZE` 가 표를 그대로 옮기고 단언한다.
- [x] (Must, FR-04) PNG IHDR 검출 경로 = `node:fs` 24-byte read + offset 16..23 BE u32 ×2. ImageMagick / sharp / probe-image-size 비의존.
- [x] (Must, FR-05-i) 모던 rel + `-precomposed` 어미 + 비표준 사이즈 → fail-fast. 회수 전 실제 상태(`apple-touch-icon` / `-precomposed` / 192) 를 합성 입력으로 넣어 4-tuple `("apple-touch-icon", "-precomposed", "192", "expected 180")` 박제 확인.
- [x] (Must, FR-05-ii) 그 외 어미 조합의 사이즈 표준 위반 → fail-fast. 무접미 192 / 레거시 rel 152 두 경로 확인.
- [x] (Must, FR-05-iii) href 가 가리키는 디스크 PNG 부재 → fail-fast. 부재 시 IHDR 를 읽지 않음도 단언 (읽으면 throw 하는 stub).
- [x] (Must, FR-05-iv) 동일 rel `<link>` 2개 이상 → fail-fast (다중 자산 모호성).
- [x] (Should, FR-06) manifest `icons[]` ↔ apple-touch-icon `<link>` 자산 집합 정책 중립 — 본 게이트는 `manifest.json` 을 읽지 않는다. 현 디스크 상태(분리: `apple-icon-precomposed.png` ∉ `icons[*].src`) 는 자매 spec `index-html-public-asset-reference-coherence` §G-G 가 박제.
- [x] (NFR-01) 게이트 5회 반복 실행 시 출력 분기 0 — 결정론 단언 포함.
- [x] (NFR-02) `node:fs` / `node:path` 외 추가 의존 0.
- [x] (NFR-04) 위반 메시지 4-tuple `(관측 rel, 관측 어미, 관측 사이즈, 기대 매핑 행)` 박제 — 5 위반 분기 전수 단언.

### 회수 내용

진입 시점 3축은 이렇게 어긋나 있었다.

| 축 | 관측 | 매핑 표 기대 |
|---|---|---|
| rel 토큰 | `apple-touch-icon` (모던) | — |
| href 어미 | `-precomposed` (레거시) | 모던 rel 과 **호환** — 위반 아님 |
| 디스크 sizes | **192x192** | **180x180** |

실제 위반은 사이즈 한 축이었다. 매핑 표가 모던 rel 에 무접미·`-precomposed` 두 어미를 모두 호환으로 두므로 파일명은 그대로 두고 `public/apple-icon-precomposed.png` 를 180x180 으로 정규화했다. 192x192 는 Android/PWA `logo192.png` 축이며 iOS 자산 축과 분리된다 (§동작 매핑 표 주석).

리사이즈는 `sips -z 180 180` 1회. 투명도 보존을 픽셀로 확인했다 — 모서리 alpha 0, 불투명 비율 12% 로 전후 동일. PNG color type 은 palette(3) → RGBA(6) 로 바뀌었고 `tRNS` 청크가 픽셀 알파로 대체됐다 (의미 동치).

## 스코프 규칙

- **expansion**: 불허 — 본 게이트 충족 목적 변경은 `index.html` (apple-touch-icon `<link>` 1행), `public/apple-icon-precomposed.png`, `src/__tests__/apple-touch-icon-tri-axis-coherence.test.ts` 로 한정.
- **grep-baseline** (HEAD=`26d91b1` + 본 변경 실측):
  - `grep -c 'rel="apple-touch-icon' index.html` → **1**.
  - `grep -rln "apple-touch-icon-precomposed" specs/30.spec/` → **1 파일** (본 spec — FR-02 singleton).
  - `public/apple-icon-precomposed.png` IHDR → **180x180** (회수 전 192x192).
  - `logo192.png` IHDR → **192x192** (별 축 — manifest `icons[1]`, 본 게이트 미대상).
- **rationale**: 게이트 구현 경로는 `node:fs` 24-byte read 로 확정 (FR-04 2 후보 중 택1). 사이즈 표준 180 은 매핑 표 단일 출처이며 fixture 가 그 값을 재선언하지 않고 `STANDARD_SIZE` 상수 1곳에서 참조한다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-21 | inspector Phase 3 / REQ-20260518-017 | 최초 등록 (apple-touch-icon 3축 동의어 정합성 박제, 동의어 매핑 표 단일 출처) | all |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | 게이트 구현 + 3축 정합 회수 — `src/__tests__/apple-touch-icon-tri-axis-coherence.test.ts` 신설 (10 `it`: 매핑 표 단언 / IHDR 경로 / PASS 2 / 위반 5 분기 / 결정론). `public/apple-icon-precomposed.png` 192x192 → 180x180 정규화 (투명도 보존 확인). 파일명은 매핑 표가 모던 rel 과 `-precomposed` 어미를 호환으로 두므로 유지 — 자매 spec `index-html-public-asset-reference-coherence` 및 그 fixture 의 파일명 박제 무변동. FR-02~FR-06 + NFR-01·02·04 전수 flip. green→blue promote. | §테스트 현황 / §수용 기준 / §스코프 규칙 |

## 참고

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- (NFR-03 성능) 게이트 실행 ≤ 500ms — 단독 분리 측정 미실시 (fixture 전체 Duration 698 ms 관측, `index.html` 파싱 + IHDR 1건 read 는 그 일부).

### 후속 신호 (별 axis)

- `public/apple-icon-precomposed.png` 은 배경이 투명하고 글자('P')가 검정이다. iOS 는 apple-touch-icon 의 알파를 지원하지 않고 검정 위에 합성하므로 홈 화면에서 검정 바탕에 검정 글자로 보인다. 본 회수는 3축 정합(사이즈)만 다뤘고 자산 내용은 손대지 않았다 — 불투명 배경 부여 여부는 디자인 결정이라 별 req 후보.
