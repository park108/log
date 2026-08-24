# `index.html` `<html lang>` 문서 로케일 선언 계약

> **위치**: `index.html:2` `<html lang="en">` (보조: 라인). 산출물 보존 극은 `build/index.html` 의 동일 요소.
> **관련 요구사항**: REQ-20260518-025
> **최종 업데이트**: 2026-08-24 (by inspector — 215차 tick. TSK-20260824-03 (`52e1b52`) 로 발화 채널이 부착돼 §테스트 현황 마지막 marker 를 `[x]` 로 플립. G-A~G-E 5 게이트 + 채널 실재를 현 HEAD=`510ae0f` 에서 전수 재실행 확인.)

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

**채널 실재 — `src/__tests__/html-lang-locale-declaration.test.ts`** (TSK-20260824-03 / `52e1b52`, 7 케이스). 현 HEAD=`510ae0f` 재실측 (2026-08-24 inspector):

```
grep -rn "html lang\|documentElement.lang" src/__tests__/ scripts/ .github/  → 6 hit
npx vitest run src/__tests__/html-lang-locale-declaration.test.ts            → 7 passed (rc=0)
```

발화 경로는 `npm test` 수집 → `.github/workflows/ci.yml:72-73` (`- name: Test` / `run: npm test`) + `.husky/pre-push:3` 2 지점. 채널 신규 등록 표면 0.

**채널의 검출력은 주입 왕복으로 확인한다** — 정상 트리의 초록은 민감도 0 인 픽스처도 낸다. TSK-20260824-03 이 6 방향 (R-1~R-5 + G-C) 을 주입해 `injection: 6/6 detect` 를 박제했고, inspector 는 현 HEAD 에서 그중 1 방향을 재확인했다: `index.html:2` `<html lang="en">` → `<html>` 주입 시 픽스처 rc=1 (7 케이스 중 3 FAIL), 원복 후 rc=0.

G-D 자기 무효화 회피는 **경로 제외가 아니라 토큰 런타임 조립**으로 이뤄졌다 — 픽스처는 자기 자신을 포함해 어떤 파일도 스캔에서 빼지 않으며, 따라서 `grep -rn 'documentElement.lang' src --include=...` 원 명령이 픽스처 추가 후에도 0 hit 을 유지한다 (현 HEAD 재실측 0 hit). 제외 과잉으로 다른 파일의 위반을 삼키는 경로가 구조적으로 없다.

## 테스트 현황

- [x] G-A 선언 단일성 — 명령 실행 rc=0 (2026-08-24 inspector 실측, 1 hit).
- [x] G-B BCP 47 형식 — 명령 실행 rc=0 (추출값 `en`).
- [x] G-C 루트 요소 단일성 — 명령 실행 rc=0.
- [x] G-D 런타임 재정의 부재 — 명령 실행 rc=0 (0 hit).
- [x] G-E 산출물 보존 — 명령 실행 rc=0 (`build/index.html` 실재, diff 무출력).
- [x] 전용 자동 픽스처 — `src/__tests__/html-lang-locale-declaration.test.ts` 실재 (TSK-20260824-03 / `52e1b52`, 7 케이스 PASS). 채널 grep 6 hit, `npm test` 수집 경로 발화. 검출력은 주입 6/6 detect + inspector 현 HEAD 1 방향 재확인 (§발화 채널).

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
| 2026-08-24 | TSK-20260824-03 / `52e1b52` (inspector Phase 1 reconcile @ HEAD=`510ae0f`) | 발화 채널 부착 확인 → §테스트 현황 "전용 자동 픽스처" `[ ]` → `[x]`. G-A~G-E 5 게이트 + 채널 grep (6 hit) + 픽스처 실행 (7 passed) 전수 재실행 PASS. 주입 1 방향 (`lang` 속성 삭제 → rc=1) 재확인 후 원복. RULE-07 §promote 조건 4 "발화 채널 실경로 박제 + 현 HEAD 실재" 충족. | §발화 채널, §테스트 현황 |
