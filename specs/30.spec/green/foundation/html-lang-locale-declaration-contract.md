# `index.html` `<html lang>` 문서 로케일 선언 계약

> **위치**: `index.html:2` `<html lang="en">` (보조: 라인). 산출물 보존 극은 `build/index.html` 의 동일 요소.
> **관련 요구사항**: REQ-20260518-025 (최초), REQ-20260824-003 (토큰 추출 특이도)
> **최종 업데이트**: 2026-08-24 (by inspector — REQ-20260824-003 흡수. 루트 태그 토큰 추출 패턴을 속성 순서 비의존으로 확장하고, spec 명령 ↔ fixture 정규식 동시 갱신을 계약으로 박제.)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷.

## 역할

문서는 자신의 자연어 로케일을 **루트 요소에서 1회, 유효한 BCP 47 태그로** 선언하며, 그 선언이 prod 산출물까지 보존된다.

**방어 대상 (RULE-07 §주제 우선순위 2 — 명시 의무).** 본 spec 이 방어하는 silent regression 은 `lang` 속성의 소실·공백화·형식 붕괴이며, 현 HEAD 의 어떤 자동 게이트로도 검출되지 않는다 (검출 부재는 §발화 채널에 실측 박제). 위반 시 관측 가능한 손상은 다음과 같다.

1. **스크린리더 발음 규칙 붕괴.** `lang` 이 없으면 보조기술은 문서 언어를 추측하거나 OS 기본 음성으로 폴백한다. 영어 본문이 다른 언어 음소 규칙으로 읽히면 청취 이해가 사실상 불가능해진다 (WCAG 2.1 §3.1.1 Language of Page, Level A).
2. **로케일 의존 렌더 분기 상실.** CSS `:lang()` 선택자, `<q>` 의 인용부호 글리프 선택, `hyphens: auto` 의 하이픈 알고리즘은 모두 상속된 언어 값에 의존한다. 값이 사라지면 조용히 기본 분기로 떨어진다.
3. **검색·번역 휴리스틱 폴백.** 검색엔진과 자동 번역은 명시 선언이 없을 때 본문 추론에 의존하며, 추론 실패는 오분류로 이어진다.

4. **게이트 오탐에 의한 오귀속.** 추출 패턴이 `lang` 을 **첫 속성**으로 가정하면 `<html data-theme="dark" lang="en">` 처럼 유효하고 선언이 살아 있는 표기가 count 0 으로 떨어져 FAIL 한다. 그 CI red 는 "로케일 선언 손상" 이라는 실패 메시지를 달고 나오므로, 원인이 게이트 특이도임을 읽어내지 못하면 멀쩡한 마크업을 되돌리는 방향으로 수렴한다.

세 손상 모두 화면상 즉시 드러나지 않고 `tsc` / `eslint` / `vitest` / `vite build` 를 전부 통과한다 — 이것이 본 명제를 2순위 spec 자격으로 만드는 근거다. 손상 4 는 게이트 자신의 특이도 문제이며, 본 spec 이 추출 패턴을 계약의 일부로 박제하는 이유다.

의도적으로 하지 않는 것: (i) 로케일 **값 자체의 결정** (왜 `en` 인지 / 다국어 분기 도입 여부) — i18n 정책 별 axis. 본 spec 은 "유효한 태그가 1개 존재한다"만 박제하며 값이 바뀌어도(예: `ko`) 계약은 유지된다, (ii) `manifest.json` 의 `lang` 키 — 현재 부재이며 별 axis, (iii) 페이지 내 부분 언어 전환(`<span lang="ko">`) — 별 axis, (iv) 발화 채널 수단 선정 — planner 영역, (v) build 조건부 게이트가 **언제 측정되는가** (CI 전수 skip 해소 · skip 술어 입도 · stale/변형 구분) — `specs/30.spec/green/foundation/build-artifact-gate-measurement-contract.md` (REQ-20260824-003) 축.

## 공개 인터페이스

없음 (런타임 인터페이스 아님). 측정 대상은 `index.html` + `build/index.html` + `src/**` 본문 한정이다.

## 동작

1. **(G-A) 선언 단일성** — `lang` 속성을 가진 `<html>` 시작 태그가 정확히 1개다.
   - 명령: `test "$(grep -cE '<html[^>]*[[:space:]]lang="[^"]+"' index.html)" -eq 1`
   - HEAD 실측: 1 hit (`index.html:2`). 값이 비어 있으면 (`lang=""`) `[^"]+` 가 매치하지 않아 0 으로 떨어져 FAIL 한다 — 공백화 회귀의 직접 검출 지점이다.
   - **속성 순서 비의존**: `[^>]*` 는 시작 태그 경계(`>`)를 넘지 못하므로 `lang` 앞에 임의 속성이 와도 인식하고, 후속 태그(`<body lang=...>`)로는 새지 않는다. 선행 토큰 `[[:space:]]` 는 `data-lang` 류 접미 일치를 배제한다.
2. **(G-B) BCP 47 형식 적합** — 값이 RFC 5646 primary-subtag 문법을 만족한다.
   - 명령: `grep -oE '<html[^>]*[[:space:]]lang="[^"]+"' index.html | sed -E 's/.*lang="([^"]+)".*/\1/' | grep -qE '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'`
   - HEAD 실측: rc=0, 추출값 `en`. `english` / `en_US`(언더스코어) / `EN-` 등 흔한 오형식은 UA 가 조용히 무시하므로 형식 게이트가 필요하다.
3. **(G-C) 루트 요소 단일성** — `<html>` 시작 태그 자체가 1개다.
   - 명령: `test "$(grep -cE '<html[[:space:]>]' index.html)" -eq 1`
   - HEAD 실측: 1 hit. G-A 와 함께 두면 "lang 없는 `<html>` 이 하나 더 있다"는 형태를 배제한다.
4. **(G-D) 런타임 재정의 부재** — 애플리케이션 코드가 선언을 덮어쓰지 않는다.
   - 명령: `test "$(grep -rn 'documentElement.lang' src --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' | wc -l)" -eq 0`
   - HEAD 실측: 0 hit. 정적 선언이 유일한 진실 공급원임을 보장한다. 향후 i18n 도입으로 런타임 전환이 필요해지면 본 게이트가 그 시점의 명시적 합의 지점이 된다.
5. **(G-E) 산출물 보존** — `vite build` 는 `lang` 선언을 변형하지 않는다.
   - 명령: `bash -c '[ -f build/index.html ] || exit 0; diff <(grep -oE "<html[^>]*[[:space:]]lang=\"[^\"]+\"" index.html) <(grep -oE "<html[^>]*[[:space:]]lang=\"[^\"]+\"" build/index.html)'`
   - HEAD 실측: rc=0 (`build/index.html:2` 동일). `build/` 는 gitignored 이므로 부재 시 rc=0 으로 skip 한다 — 자매 픽스처 `src/__tests__/csp-meta-build-artifact-preservation.test.ts:59-62` 의 skip 규약과 동일하다.

6. **(G-F) 추출 패턴의 양 표면 동기화** — 본 spec 의 §동작 명령(grep)과 자동 픽스처의 정규식(`RE_ROOT_WITH_LANG` / `RE_ROOT_LANG_CAPTURE`)은 **같은 집합을 인식한다**. 한쪽만 갱신해 두 표면의 판정이 갈리는 상태를 허용하지 않는다.
   - grep 표면: `<html[^>]*[[:space:]]lang="[^"]+"` (라인 단위).
   - JS 표면: `` new RegExp(`<html[^>\r\n]*${WS}lang="[^"]+"`) `` — `[^>]` 가 아니라 **`[^>\r\n]`** 이다. JS 문자 클래스는 개행을 포함하므로 `[^>]*` 로 두면 `<html\n  lang="en">` 을 매치해 grep(라인 단위, 0 hit)과 갈린다. 픽스처가 이미 그 동치를 케이스로 단정하고 있다.
   - HEAD 실측: 픽스처는 첫-속성 고정형(`<html${WS}+lang=`)을 2 지점에 보유한다 — 미동기 상태.
7. **(G-G) 픽스처의 표기 대표성** — 자동 픽스처의 케이스 표에는 `lang` 앞에 다른 속성이 오는 루트 태그가 최소 1건 포함된다 (RULE-06 §fixture 대표성). 공백 수 변형만으로는 순서 의존 결함이 관측되지 않는다.
   - HEAD 실측: 케이스 8건 전부 `lang` 이 첫 속성 — 0건.

## 의존성

- 내부 측정 대상: `index.html` (루트 요소), `build/index.html` (산출물 극, 조건부), `src/**` (런타임 재정의 부재 극), `src/__tests__/html-lang-locale-declaration.test.ts` (추출 패턴의 JS 표면).
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
6. (R-6) 루트 태그에 속성 추가 (`data-theme` / `class` / `dir`) → **선언은 온전한데** 첫-속성 고정 패턴이 count 0 을 내 G-A·G-B·G-E 가 동시 FAIL. 확장 패턴이 이 오탐을 제거한다.
7. (R-7) 한쪽 표면만 갱신 — spec 명령은 넓히고 픽스처 정규식은 그대로(또는 그 반대) → 두 표면이 다른 답을 낸다. G-F 가 검출 지점이다.

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

- [x] G-A 선언 단일성 — 확장 패턴으로 재실행 rc=0 (2026-08-24 inspector 실측, 1 hit).
- [x] G-B BCP 47 형식 — 확장 패턴으로 재실행 rc=0 (추출값 `en`).
- [x] G-C 루트 요소 단일성 — 명령 실행 rc=0.
- [x] G-D 런타임 재정의 부재 — 명령 실행 rc=0 (0 hit).
- [x] G-E 산출물 보존 — 확장 패턴으로 재실행 rc=0 (`build/index.html` 실재, diff 무출력).
- [ ] G-F 양 표면 동기화 — 픽스처가 첫-속성 고정형 2 지점 (`:66` `RE_ROOT_WITH_LANG`, `:67` `RE_ROOT_LANG_CAPTURE`).
- [ ] G-G 픽스처 표기 대표성 — 속성 선행 케이스 0건.
- [x] 전용 자동 픽스처 — `src/__tests__/html-lang-locale-declaration.test.ts` 실재 (TSK-20260824-03 / `52e1b52`, 7 케이스 PASS). 채널 grep 6 hit, `npm test` 수집 경로 발화. 검출력은 주입 6/6 detect + inspector 현 HEAD 1 방향 재확인 (§발화 채널).

## 수용 기준

> 전 항목 HEAD=`414e66b` 에서 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약).

- [x] (Must) G-A: `test "$(grep -cE '<html[^>]*[[:space:]]lang="[^"]+"' index.html)" -eq 1` → rc=0 (확장 패턴 재실측).
- [x] (Must) G-B: `grep -oE '<html[^>]*[[:space:]]lang="[^"]+"' index.html | sed -E 's/.*lang="([^"]+)".*/\1/' | grep -qE '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'` → rc=0 (추출값 `en`).
- [x] (Must) G-C: `test "$(grep -cE '<html[[:space:]>]' index.html)" -eq 1` → rc=0.
- [x] (Should) G-D: `test "$(grep -rn 'documentElement.lang' src --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' | wc -l)" -eq 0` → rc=0.
- [x] (Should) G-E: `bash -c '[ -f build/index.html ] || exit 0; diff <(grep -oE "<html[^>]*[[:space:]]lang=\"[^\"]+\"" index.html) <(grep -oE "<html[^>]*[[:space:]]lang=\"[^\"]+\"" build/index.html)'` → rc=0 (확장 패턴 재실측).
- [ ] (Must) G-F 양 표면 동기화 — 픽스처에 첫-속성 고정형 잔존 0: `test "$(grep -c 'WS}+lang=' src/__tests__/html-lang-locale-declaration.test.ts)" -eq 0` → rc=0. **2026-08-24 실측 2 hit (`:66`, `:67`) → rc=1.**
- [ ] (Must) G-G 픽스처 표기 대표성 — 루트 태그에 `lang` 이외 속성이 선행하는 케이스 1건 이상: `test "$(grep -cE '<html[[:space:]]+(data-|class=|id=|dir=)' src/__tests__/html-lang-locale-declaration.test.ts)" -ge 1` → rc=0. **2026-08-24 실측 0 hit → rc=1.**
- [ ] (Must) G-H 확장 후 회귀 0 — `npx vitest run src/__tests__/html-lang-locale-declaration.test.ts` → rc=0. 기존 7 케이스(공백 다중 · 값 공백화 · 오형식 3 · 개행 분리)의 기대 count 가 확장 패턴에서 전부 보존돼야 한다. **2026-08-24 실측 rc=0 (7 passed) — 확장 적용 후 재판정 대상.**

## 참고

- 외부 근거: WCAG 2.1 §3.1.1 Language of Page (Level A) — 각 웹 페이지의 기본 자연어는 프로그램적으로 결정 가능해야 한다.
- 외부 근거: RFC 5646 (BCP 47) — 언어 태그 문법. HTML Living Standard §3.2.6 `lang` 속성.
- 직교 spec: `specs/30.spec/green/foundation/viewport-meta-mobile-rendering-contract.md` (동일 파일, 레이아웃 좌표계 axis).

### 미측정·비판정 항목

- 스크린리더 실제 발음 결과 — 보조기술 실행 채널 부재. 본 spec 은 선언 존재·형식까지만 판정한다.
- 선언된 로케일과 본문 실제 언어의 의미 일치 (`lang="en"` 인데 본문이 한국어인 경우) — 자연어 판별 채널 부재.
- **(주입 부류 — 이관 필수) 확장 패턴의 오탐 0 주입 검증.** 루트 태그에 속성을 선행 주입한 상태에서 픽스처가 rc=0 을 유지하고, `lang` 을 삭제한 상태에서 rc≠0 이 되는지의 왕복. 고장·변형을 주입해야 판정되므로 spec 체크박스가 아니다. **이관처: G-F/G-G 를 충족시키는 픽스처 수정 task 의 DoD** — 게이트 수정 task 이므로 RULE-06 §게이트 실효 검증이 적용되며, 검출 방향 2 (속성 선행 → 오탐 0 / 선언 삭제 → 검출 1) 전수 주입 후 `RULE-04` notes `injection: 2/2 detect` 박제.

### 확장 패턴 실측 매트릭스 (2026-08-24, inspector)

`old = <html${WS}+lang="[^"]+"` (현행), `new = <html[^>\r\n]*${WS}lang="[^"]+"` (확장). JS `RegExp` 로 실행.

| 입력 | old | new | 판정 |
|---|---|---|---|
| `<html lang="en">` | 1 | 1 | 기존 케이스 보존 |
| `<html   lang="en-US">` | 1 | 1 | 기존 케이스 보존 |
| `<html lang="">` | 0 | 0 | R-2 검출 보존 |
| `<html lang="english">` / `<html lang="en_US">` / `<html lang="EN-">` | 1 | 1 | R-3 형식 판정은 G-B 소관 — 추출은 성공 |
| `<html\n  lang="en">` | 0 | 0 | grep 라인 단위 동치 보존 (**`[^>]*` 로 쓰면 1 이 되어 갈린다** — G-F 의 `[^>\r\n]` 근거) |
| `<html data-theme="dark" lang="en">` | **0** | **1** | R-6 오탐 제거 |
| `<html class="no-js" lang="ko-KR">` | **0** | **1** | R-6 오탐 제거 |
| `<html>` + 후속 `<body lang="en">` | 0 | 0 | 경계 미침범 (FR-06 greedy 검증) |
| `<html data-lang="x">` | 0 | 0 | 접미 일치 배제 (`[[:space:]]lang` 선행 토큰) |

grep 표면 동일 매트릭스는 파일 픽스처로 재실행해 동일 결과를 확인했다 (`<html[^>]*[[:space:]]lang="[^"]+"`).

### 소비 req
- `specs/60.done/2026/08/24/req/20260824-build-artifact-gate-measurement-and-skip-contract.md` (REQ-20260824-003) FR-05 · FR-06. 같은 req 의 FR-01~FR-04 는 `specs/30.spec/green/foundation/build-artifact-gate-measurement-contract.md` 로 분리 흡수했다 — 전자는 **패턴 특이도**, 후자는 **측정 시점·skip 계약** 으로 효능이 다르다.
- 상류 followup: `specs/60.done/2026/08/24/followups/20260824-1145-html-lang-attribute-order-false-positive.md`.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-24 | inspector tick (REQ-20260824-003 FR-05/FR-06 흡수) / HEAD=`414e66b` | **토큰 추출 패턴을 속성 순서 비의존으로 확장.** 현행 `<html[[:space:]]+lang=` 은 `lang` 이 첫 속성일 것을 요구해 `<html data-theme="dark" lang="en">` 에서 count 0 → FAIL 한다 (실측: 현행 0 / 확장 1). 지금은 `index.html:2` 가 `<html lang="en">` 이라 오탐 0 이지만, 속성 추가 시 CI red 가 "로케일 선언 손상" 으로 오독된다. §동작 1·2·5 명령과 §수용 기준 G-A/G-B/G-E 를 `<html[^>]*[[:space:]]lang="[^"]+"` 로 교체하고, 두 표면 동기화(G-F) · 픽스처 표기 대표성(G-G) · 확장 후 회귀 0(G-H) 3 Must 를 신설했다. **JS 표면은 `[^>\r\n]*` 여야 한다** — `[^>]*` 로 두면 개행 분리 케이스에서 grep 과 갈린다 (§참고 실측 매트릭스). 주입 부류는 픽스처 수정 task DoD 로 이관 표기. | §역할 + §동작 + §회귀 중점 + §테스트 현황 + §수용 기준 + §참고 |
| 2026-08-24 | inspector tick / REQ-20260518-025 | 최초 등록. G-A~G-E 5 게이트 명령 전수 HEAD 실행 rc=0 확인 후 `[x]` 박제. 발화 채널 부재 실측 박제 (grep 0 hit). | all |
| 2026-08-24 | TSK-20260824-03 / `52e1b52` (inspector Phase 1 reconcile @ HEAD=`510ae0f`) | 발화 채널 부착 확인 → §테스트 현황 "전용 자동 픽스처" `[ ]` → `[x]`. G-A~G-E 5 게이트 + 채널 grep (6 hit) + 픽스처 실행 (7 passed) 전수 재실행 PASS. 주입 1 방향 (`lang` 속성 삭제 → rc=1) 재확인 후 원복. RULE-07 §promote 조건 4 "발화 채널 실경로 박제 + 현 HEAD 실재" 충족. | §발화 채널, §테스트 현황 |
