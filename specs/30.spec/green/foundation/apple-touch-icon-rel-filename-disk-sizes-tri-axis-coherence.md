# apple-touch-icon rel ↔ href filename suffix ↔ disk PNG sizes 3-axis synonym coherence

> **위치**: `index.html` 의 `<link rel="apple-touch-icon" ...>`, `public/apple-icon-precomposed.png`
> **관련 요구사항**: REQ-20260518-017
> **최종 업데이트**: 2026-05-21 (by inspector Phase 3 absorption)

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

- [ ] 게이트 구현 + 4 위반 분기 + 1 PASS 경로 (planner 회수 대상)
- [ ] 매핑 표 grep singleton 검증 (`grep -rn "apple-touch-icon-precomposed" specs/30.spec/` 의 매핑 행 정의는 본 spec 1개 파일에 한정)

## 수용 기준

- [ ] (Must, FR-02) 동의어 매핑 표가 본 spec §동작 에 단일 출처로 박제 — `grep -rn "apple-touch-icon-precomposed" specs/30.spec/` 의 매핑 정의 행은 본 파일에만 등장.
- [ ] (Must, FR-03) 매핑 표가 2행 (`apple-touch-icon`, `apple-touch-icon-precomposed`) × 3축 (rel, 어미, sizes) 완전 박제, 사이즈 표준 180x180 단일 출처.
- [ ] (Must, FR-04) PNG IHDR 사이즈 검출 경로 (file(1) 또는 node:fs 24-byte read) 가 본 spec 에 단일 출처로 박제, 외부 도구 비의존.
- [ ] (Must, FR-05-i) 현재 디스크 상태 (rel="apple-touch-icon" + href 어미 `-precomposed` + 사이즈 192) 입력 시 fail-fast, 메시지 4-tuple `(apple-touch-icon, -precomposed, 192, expected 180)`.
- [ ] (Must, FR-05-ii) rel="apple-touch-icon" + 디스크 사이즈 180 + 어미 `-precomposed` 잔존 시 fail-fast (의미 충돌).
- [ ] (Must, FR-05-iii) href 가 가리키는 디스크 PNG 부재 시 fail-fast (기 박제 `index-html-public-asset-reference-coherence` 와 직교).
- [ ] (Must, FR-05-iv) 동일 rel 의 `<link>` 가 2개 이상 등장 시 fail-fast (다중 자산 모호성).
- [ ] (Should, FR-06) spec 은 manifest `icons[]` 와 apple-touch-icon `<link>` 의 자산 집합 분리/통합 정책에 대해 중립 — 현재 디스크 상태가 어느 정책을 박제하는지만 결정론적으로 식별.
- [ ] (NFR-01) 게이트 실행 N=5 회 반복 시 출력 분기 0건 (결정론).
- [ ] (NFR-02) `file(1)` 또는 `node:fs` 외 추가 의존 0건.
- [ ] (NFR-03) 게이트 실행 시간 ≤ 500ms (단일 `index.html` 파싱 + N개 PNG IHDR 24-byte read).
- [ ] (NFR-04) 위반 메시지에 (관측 rel, 관측 어미, 관측 사이즈, 기대 매핑 행) 4-tuple 박제.

## 스코프 규칙

- **expansion**: N/A (spec 시점 grep 게이트 미정의 — planner 회수 시 결정).
- **rationale**: 본 spec 은 불변식 박제만 수행. 게이트 구현 경로 (file(1) vs node:fs) 결정은 planner 단계.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-21 | inspector Phase 3 / REQ-20260518-017 | 최초 등록 (apple-touch-icon 3축 동의어 정합성 박제, 동의어 매핑 표 단일 출처) | all |
