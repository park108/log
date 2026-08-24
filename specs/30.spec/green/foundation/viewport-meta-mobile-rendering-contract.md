# `index.html` viewport 메타 ↔ 모바일 레이아웃 렌더 계약

> **위치**: `index.html:5` `<meta name="viewport" content="width=device-width, initial-scale=1" />` (보조: 라인). 산출물 보존 극은 `build/index.html` 의 동일 element.
> **관련 요구사항**: REQ-20260518-022
> **최종 업데이트**: 2026-08-24 (by inspector — 신규 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

문서는 모바일 브라우저에게 **layout viewport 를 기기 폭에 맞추고 초기 배율을 1 로 시작하라**고 지시하며, 그 지시가 prod 산출물까지 보존되고, **사용자 확대(pinch-zoom)를 차단하지 않는다**.

**방어 대상 (RULE-07 §주제 우선순위 2 — 명시 의무).** 본 spec 이 방어하는 silent regression 은 다음 두 가지이며, 둘 다 현 HEAD 의 어떤 자동 게이트로도 검출되지 않는다 (검출 부재는 §발화 채널에 실측 박제).

1. **viewport 메타 소실 → 모바일 전면 레이아웃 붕괴.** 메타가 사라지면 모바일 브라우저는 데스크톱 가정 폭(약 980 CSS px)으로 페이지를 렌더한 뒤 화면에 축소해 넣는다. 결과는 모든 모바일 방문자에게 즉시 관측되는 마이크로 텍스트 + 가로 스크롤이다. `tsc` / `eslint` / `vitest` / `vite build` 는 전부 통과한다 — HTML head 의 메타 1줄은 어느 게이트의 측정 대상도 아니다.
2. **확대 차단 토큰 유입 → 접근성 회귀.** `user-scalable=no` / `maximum-scale` / `minimum-scale` 이 content 에 들어오면 저시력 사용자의 확대가 차단된다 (WCAG 2.1 §1.4.4 Resize text AA / §1.4.10 Reflow AA). 시각적으로는 정상으로 보이므로 리뷰·테스트 어느 쪽도 잡지 못한다.

의도적으로 하지 않는 것: (i) viewport 이외 `<meta>` (`theme-color` / `description` / `robots` / CSP) — 각기 별 spec 영역, (ii) 반응형 CSS breakpoint·media query 정책 — 별 axis (본 spec 은 좌표계 선언 1줄 한정), (iii) `manifest.json` 의 `display` enum 값 자체의 형식 검증 — 본 spec 은 standalone 의도와의 **동행**만 서술하고 enum 게이트는 호출하지 않는다, (iv) 발화 채널(픽스처/스크립트) 수단 선정 — planner 영역.

## 공개 인터페이스

없음 (런타임 인터페이스 아님). 본 spec 은 정적 문서 토큰 계약이며 측정 대상은 `index.html` + `build/index.html` 본문 한정이다.

## 동작

1. **(G-A) 선언 단일성** — viewport 메타는 정확히 1회 선언된다.
   - 명령: `test "$(grep -cE '<meta[[:space:]]+name="viewport"[[:space:]]+content="[^"]*"' index.html)" -eq 1`
   - HEAD 실측: 1 hit (`index.html:5`). 2회 이상 선언 시 뒤 선언이 앞을 덮어써 의도 추적이 불가해진다.
2. **(G-B) content 토큰 동치** — content 는 기기폭 + 배율 1 조합이다.
   - 명령: `grep -qE '<meta[[:space:]]+name="viewport"[[:space:]]+content="width=device-width, initial-scale=1"[[:space:]]*/?>' index.html`
   - HEAD 실측: rc=0. `width=device-width` 가 layout viewport 를 기기 폭에 고정하고, `initial-scale=1` 이 CSS px ↔ 기기 독립 px 배율을 1 로 고정한다.
3. **(G-C) 확대 차단 토큰 0** — 사용자 확대를 막는 토큰이 존재하지 않는다.
   - 명령: `test "$(grep -cE 'user-scalable=no|maximum-scale=|minimum-scale=' index.html)" -eq 0`
   - HEAD 실측: 0 hit. 본 게이트가 §역할 방어 대상 (2) 의 직접 검출 채널이다.
4. **(G-D) 산출물 보존** — `vite build` 는 viewport element 를 변형하지 않는다.
   - 명령: `bash -c '[ -f build/index.html ] || exit 0; diff <(grep -oE "<meta[[:space:]]+name=\"viewport\"[^>]*>" index.html) <(grep -oE "<meta[[:space:]]+name=\"viewport\"[^>]*>" build/index.html)'`
   - HEAD 실측: rc=0 (`build/index.html:5` 동일 element). `build/` 는 gitignored 이므로 부재 시 rc=0 으로 skip 한다 — 이 skip 규약은 자매 픽스처 `src/__tests__/csp-meta-build-artifact-preservation.test.ts:59-62` 와 동일하다.
5. **(G-E) PWA standalone 의도 동행** — `public/manifest.json` 의 `display` 가 `standalone` 인 동안 G-A~G-C 는 필수다.
   - 근거: standalone 창은 브라우저 chrome 이 없어 페이지 자신의 viewport 선언에 **전적으로** 의존한다. 브라우저 탭에서는 UA 가 일부 보정하지만 standalone 에서는 보정 주체가 없다.
   - 명령: `grep -qE '"display":[[:space:]]*"standalone"' public/manifest.json` → HEAD 실측 rc=0.

## 의존성

- 내부 측정 대상: `index.html` (viewport element), `build/index.html` (산출물 극, 조건부), `public/manifest.json` (`display` 동행 극).
- 외부: 없음 (측정은 grep/diff 만 사용 — 추가 도구 도입 0).
- 역의존 (사용처):
  - `specs/30.spec/blue/foundation/index-html-public-asset-reference-coherence.md` — 동일 `index.html` 의 정적 자원 참조 axis. 본 spec (레이아웃 좌표계 선언) 과 직교.
  - `src/__tests__/csp-meta-build-artifact-preservation.test.ts` — 동일 파일의 CSP element 보존 axis. build skip 규약 선례.

## 회귀 중점

1. (R-1) viewport element 삭제 → G-A 가 `0 -eq 1` 로 FAIL. 모바일 전 방문자 레이아웃 붕괴 (§역할 방어 대상 1).
2. (R-2) `content="width=device-width, initial-scale=1, user-scalable=no"` 로 확대 차단 추가 → G-B FAIL + G-C FAIL. WCAG 1.4.4/1.4.10 회귀 (§역할 방어 대상 2).
3. (R-3) `initial-scale=0.5` 등 배율 변경 → G-B FAIL. 페이지가 축소된 상태로 기동.
4. (R-4) viewport element 중복 선언 → G-A FAIL.
5. (R-5) 빌드 파이프라인 플러그인이 head 를 재작성해 element 를 변형 → G-D FAIL (build 존재 시).

## 발화 채널

**현 HEAD 에 자동 발화 채널이 없다.** 실측 (2026-08-24):

```
grep -rn "viewport" src/__tests__/ src/common/Footer.test.tsx scripts/ .github/  → 0 hit
```

RULE-07 §promote 조건 4 에 따라 이는 promote 차단 사유가 아니라 **"채널 부착 task 발행"을 선행 조건**으로 한다. planner 는 본 spec 승격 전 G-A~G-E 5 게이트를 발화시키는 채널 1개 이상을 부착하는 task 를 발행한다. 수단은 위임한다 — vitest 픽스처(`src/__tests__/**`) / `scripts/check-*.sh` + `package.json scripts.check:*` + `ci.yml` step 중 택일.

## 테스트 현황

- [x] G-A 선언 단일성 — 명령 실행 rc=0 (2026-08-24 inspector 실측, 1 hit).
- [x] G-B content 토큰 동치 — 명령 실행 rc=0.
- [x] G-C 확대 차단 토큰 0 — 명령 실행 rc=0 (0 hit).
- [x] G-D 산출물 보존 — 명령 실행 rc=0 (`build/index.html` 실재, diff 무출력).
- [x] G-E standalone 동행 — 명령 실행 rc=0.
- [ ] 전용 자동 픽스처 — 부재 (§발화 채널 참조; 채널 부착 task 선행 조건).

## 수용 기준

- [x] (Must) G-A: `test "$(grep -cE '<meta[[:space:]]+name="viewport"[[:space:]]+content="[^"]*"' index.html)" -eq 1` → rc=0.
- [x] (Must) G-B: `grep -qE '<meta[[:space:]]+name="viewport"[[:space:]]+content="width=device-width, initial-scale=1"[[:space:]]*/?>' index.html` → rc=0.
- [x] (Must) G-C: `test "$(grep -cE 'user-scalable=no|maximum-scale=|minimum-scale=' index.html)" -eq 0` → rc=0.
- [x] (Should) G-D: `bash -c '[ -f build/index.html ] || exit 0; diff <(grep -oE "<meta[[:space:]]+name=\"viewport\"[^>]*>" index.html) <(grep -oE "<meta[[:space:]]+name=\"viewport\"[^>]*>" build/index.html)'` → rc=0.
- [x] (Should) G-E: `grep -qE '"display":[[:space:]]*"standalone"' public/manifest.json` → rc=0.

## 참고

- 외부 근거: MDN "Viewport meta tag" — 모바일 브라우저는 viewport 메타 부재 시 약 980px 데스크톱 폭으로 렌더 후 축소한다. WCAG 2.1 §1.4.4 Resize text (AA) / §1.4.10 Reflow (AA) — `user-scalable=no` 는 두 기준 위반 신호.
- 외부 근거: W3C Web App Manifest — `display: "standalone"` 은 브라우저 내비게이션 UI 를 제외한 자체 창을 연다.
- 직교 spec: `specs/30.spec/blue/foundation/index-html-public-asset-reference-coherence.md` (정적 자원 참조 axis).

### 미측정·비판정 항목

- 실기기 모바일 렌더 결과의 시각 회귀 (스크린샷 비교) — 측정 채널 부재. 본 spec 은 선언 토큰 계약까지만 판정한다.
- PWA 설치 후 standalone 창에서의 실제 레이아웃 — 설치 상태를 CI 에서 재현하는 채널 부재.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-24 | inspector tick / REQ-20260518-022 | 최초 등록. G-A~G-E 5 게이트 명령 전수 HEAD 실행 rc=0 확인 후 `[x]` 박제. 발화 채널 부재 실측 박제 (grep 0 hit). | all |
