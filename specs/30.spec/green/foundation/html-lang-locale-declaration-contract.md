# `index.html` `<html lang>` 문서 로케일 선언 계약

> **위치**: `index.html:2` `<html lang="en">` (보조: 라인). 산출물 보존 극은 `build/index.html` 의 동일 요소.
> **관련 요구사항**: REQ-20260518-025
> **최종 업데이트**: 2026-08-24 (by inspector — 신규 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

문서는 자신의 자연어 로케일을 **루트 요소에서 1회, 유효한 BCP 47 태그로** 선언하며, 그 선언이 prod 산출물까지 보존된다.

**방어 대상 (RULE-07 §주제 우선순위 2 — 명시 의무).** 본 spec 이 방어하는 silent regression 은 `lang` 속성의 소실·공백화·형식 붕괴이며, 현 HEAD 의 어떤 자동 게이트로도 검출되지 않는다 (검출 부재는 §발화 채널에 실측 박제). 위반 시 관측 가능한 손상은 다음과 같다.

1. **스크린리더 발음 규칙 붕괴.** `lang` 이 없으면 보조기술은 문서 언어를 추측하거나 OS 기본 음성으로 폴백한다. 영어 본문이 다른 언어 음소 규칙으로 읽히면 청취 이해가 사실상 불가능해진다 (WCAG 2.1 §3.1.1 Language of Page, Level A).
2. **로케일 의존 렌더 분기 상실.** CSS `:lang()` 선택자, `<q>` 의 인용부호 글리프 선택, `hyphens: auto` 의 하이픈 알고리즘은 모두 상속된 언어 값에 의존한다. 값이 사라지면 조용히 기본 분기로 떨어진다.
3. **검색·번역 휴리스틱 폴백.** 검색엔진과 자동 번역은 명시 선언이 없을 때 본문 추론에 의존하며, 추론 실패는 오분류로 이어진다.

세 손상 모두 화면상 즉시 드러나지 않고 `tsc` / `eslint` / `vitest` / `vite build` 를 전부 통과한다 — 이것이 본 명제를 2순위 spec 자격으로 만드는 근거다.

의도적으로 하지 않는 것: (i) 로케일 **값 자체의 결정** (왜 `en` 인지 / 다국어 분기 도입 여부) — i18n 정책 별 axis. 본 spec 은 "유효한 태그가 1개 존재한다"만 박제하며 값이 바뀌어도(예: `ko`) 계약은 유지된다, (ii) `manifest.json` 의 `lang` 키 — 현재 부재이며 별 axis, (iii) 페이지 내 부분 언어 전환(`<span lang="ko">`) — 별 axis, (iv) 발화 채널 수단 선정 — planner 영역.

## 공개 인터페이스

없음 (런타임 인터페이스 아님). 측정 대상은 `index.html` + `build/index.html` + `src/**` 본문 한정이다.

## 동작

1. **(G-A) 선언 단일성** — `lang` 속성을 가진 `<html>` 시작 태그가 정확히 1개다.
   - 명령: `test "$(grep -cE '<html[[:space:]]+lang="[^"]+"' index.html)" -eq 1`
   - HEAD 실측: 1 hit (`index.html:2`). 값이 비어 있으면 (`lang=""`) `[^"]+` 가 매치하지 않아 0 으로 떨어져 FAIL 한다 — 공백화 회귀의 직접 검출 지점이다.
2. **(G-B) BCP 47 형식 적합** — 값이 RFC 5646 primary-subtag 문법을 만족한다.
   - 명령: `grep -oE '<html[[:space:]]+lang="[^"]+"' index.html | sed -E 's/.*lang="([^"]+)".*/\1/' | grep -qE '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'`
   - HEAD 실측: rc=0, 추출값 `en`. `english` / `en_US`(언더스코어) / `EN-` 등 흔한 오형식은 UA 가 조용히 무시하므로 형식 게이트가 필요하다.
3. **(G-C) 루트 요소 단일성** — `<html>` 시작 태그 자체가 1개다.
   - 명령: `test "$(grep -cE '<html[[:space:]>]' index.html)" -eq 1`
   - HEAD 실측: 1 hit. G-A 와 함께 두면 "lang 없는 `<html>` 이 하나 더 있다"는 형태를 배제한다.
4. **(G-D) 런타임 재정의 부재** — 애플리케이션 코드가 선언을 덮어쓰지 않는다.
   - 명령: `test "$(grep -rn 'documentElement.lang' src --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' | wc -l)" -eq 0`
   - HEAD 실측: 0 hit. 정적 선언이 유일한 진실 공급원임을 보장한다. 향후 i18n 도입으로 런타임 전환이 필요해지면 본 게이트가 그 시점의 명시적 합의 지점이 된다.
5. **(G-E) 산출물 보존** — `vite build` 는 `lang` 선언을 변형하지 않는다.
   - 명령: `bash -c '[ -f build/index.html ] || exit 0; diff <(grep -oE "<html[[:space:]]+lang=\"[^\"]+\"" index.html) <(grep -oE "<html[[:space:]]+lang=\"[^\"]+\"" build/index.html)'`
   - HEAD 실측: rc=0 (`build/index.html:2` 동일). `build/` 는 gitignored 이므로 부재 시 rc=0 으로 skip 한다 — 자매 픽스처 `src/__tests__/csp-meta-build-artifact-preservation.test.ts:59-62` 의 skip 규약과 동일하다.

## 의존성

- 내부 측정 대상: `index.html` (루트 요소), `build/index.html` (산출물 극, 조건부), `src/**` (런타임 재정의 부재 극).
- 외부: 없음 (측정은 grep/sed/diff 만 사용).
- 역의존 (사용처):
  - `specs/30.spec/blue/foundation/index-html-public-asset-reference-coherence.md` — 동일 파일의 자원 참조 axis. 직교.
  - `src/__tests__/meta-description-token-coherence.test.ts` — 동일 파일 `<head>` 메타 axis. 직교 (본 spec 은 루트 요소 속성).

## 회귀 중점

1. (R-1) `<html lang="en">` → `<html>` (속성 삭제) → G-A FAIL. WCAG 3.1.1 위반 (§역할 손상 1).
2. (R-2) `lang=""` 공백화 → G-A FAIL (`[^"]+` 미매치).
3. (R-3) `lang="english"` / `lang="en_US"` 오형식 → G-B FAIL. UA 는 조용히 무시한다.
4. (R-4) `src/**` 에 `document.documentElement.lang = ...` 도입 → G-D FAIL. 정적 선언과 런타임 값의 이중 진실 공급원 발생.
5. (R-5) 빌드 플러그인이 루트 요소를 재작성 → G-E FAIL (build 존재 시).

## 발화 채널

**현 HEAD 에 자동 발화 채널이 없다.** 실측 (2026-08-24):

```
grep -rn "html lang\|documentElement.lang" src/__tests__/ scripts/ .github/  → 0 hit
```

RULE-07 §promote 조건 4 에 따라 promote 차단 사유가 아니라 **"채널 부착 task 발행"을 선행 조건**으로 한다. planner 는 승격 전 G-A~G-E 를 발화시키는 채널 1개 이상을 부착하는 task 를 발행한다. 수단은 위임한다 — vitest 픽스처 / `check:*` 스크립트 + `ci.yml` step 중 택일. 자매 spec `foundation/viewport-meta-mobile-rendering-contract.md` 와 동일 파일(`index.html`)을 측정하므로 채널 1개로 합쳐 부착하는 것이 합리적이다 (수단 판단은 planner).

## 테스트 현황

- [x] G-A 선언 단일성 — 명령 실행 rc=0 (2026-08-24 inspector 실측, 1 hit).
- [x] G-B BCP 47 형식 — 명령 실행 rc=0 (추출값 `en`).
- [x] G-C 루트 요소 단일성 — 명령 실행 rc=0.
- [x] G-D 런타임 재정의 부재 — 명령 실행 rc=0 (0 hit).
- [x] G-E 산출물 보존 — 명령 실행 rc=0 (`build/index.html` 실재, diff 무출력).
- [ ] 전용 자동 픽스처 — 부재 (§발화 채널 참조; 채널 부착 task 선행 조건).

## 수용 기준

- [x] (Must) G-A: `test "$(grep -cE '<html[[:space:]]+lang="[^"]+"' index.html)" -eq 1` → rc=0.
- [x] (Must) G-B: `grep -oE '<html[[:space:]]+lang="[^"]+"' index.html | sed -E 's/.*lang="([^"]+)".*/\1/' | grep -qE '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'` → rc=0.
- [x] (Must) G-C: `test "$(grep -cE '<html[[:space:]>]' index.html)" -eq 1` → rc=0.
- [x] (Should) G-D: `test "$(grep -rn 'documentElement.lang' src --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' | wc -l)" -eq 0` → rc=0.
- [x] (Should) G-E: `bash -c '[ -f build/index.html ] || exit 0; diff <(grep -oE "<html[[:space:]]+lang=\"[^\"]+\"" index.html) <(grep -oE "<html[[:space:]]+lang=\"[^\"]+\"" build/index.html)'` → rc=0.

## 참고

- 외부 근거: WCAG 2.1 §3.1.1 Language of Page (Level A) — 각 웹 페이지의 기본 자연어는 프로그램적으로 결정 가능해야 한다.
- 외부 근거: RFC 5646 (BCP 47) — 언어 태그 문법. HTML Living Standard §3.2.6 `lang` 속성.
- 직교 spec: `specs/30.spec/green/foundation/viewport-meta-mobile-rendering-contract.md` (동일 파일, 레이아웃 좌표계 axis).

### 미측정·비판정 항목

- 스크린리더 실제 발음 결과 — 보조기술 실행 채널 부재. 본 spec 은 선언 존재·형식까지만 판정한다.
- 선언된 로케일과 본문 실제 언어의 의미 일치 (`lang="en"` 인데 본문이 한국어인 경우) — 자연어 판별 채널 부재.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-24 | inspector tick / REQ-20260518-025 | 최초 등록. G-A~G-E 5 게이트 명령 전수 HEAD 실행 rc=0 확인 후 `[x]` 박제. 발화 채널 부재 실측 박제 (grep 0 hit). | all |
