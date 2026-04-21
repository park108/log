# 런타임 도메인 에러 보고 채널 단일화 — `reportError` 경유 불변식

> **위치**: `src/common/errorReporter.js` 의 `reportError(error, errorInfo?)` (헬퍼) + 호출부 전반 (`src/**/*.{jsx,js}`, `*.test.*` 제외).
> **관련 요구사항**: REQ-20260421-039
> **최종 업데이트**: 2026-04-21 (by inspector, Phase 1 reconcile 2/2 ack — TSK-80 D1 Search.jsx @1661242 + TSK-81 D2 ImageSelector.jsx @9734e27)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=bdc3964).

## 역할
런타임 소스의 **도메인 에러 보고 채널 단일화** 불변식을 박제한다. `src/common/errorReporter.js` 의 `reportError(error, errorInfo?)` 를 유일한 도메인 에러 보고 진입점으로 정의하고, 런타임 소스에서 `console.error` / `console.warn` / `console.info` / `console.log` 의 직접 호출을 명시적 §허용 예외 2 항목 외 0 hit 으로 유지한다. 의도적으로 하지 않는 것: `reportError` 의 외부 APM (Sentry / CloudWatch / Datadog 등) 연동 구현, PII redaction 계약, React `ErrorBoundary` 커버리지 확장 (`app.md` Should 별 축), `common.js:log(text, type)` 의 dev-only 서술자 구조 개편, 테스트 파일 (`*.test.*`) 내부 `console.*` 사용 정책 (REQ-20260421-036 박제 완료 — 자매 축). 본 spec 은 **런타임(production code) 관점의 단일 에러 채널 계약** 이며 REQ-20260421-036 (테스트 콘솔 spy) 과 주제 교차점 없음.

## 공개 인터페이스

### `reportError(error, errorInfo?)` (`src/common/errorReporter.js`)
- 시그니처: `(error: Error | Response | object, errorInfo?: object) => void`.
  - `error` 타입은 다형적 — Error 인스턴스, fetch `Response`, API payload 객체 (예: `{errorType, errorMessage, ...}`) 를 모두 허용한다. 런타임 호출부가 도메인에 맞게 선택.
  - `errorInfo` 는 선택적 컨텍스트 객체. React `ErrorBoundary` 의 `componentDidCatch(error, errorInfo)` 규약에서 `{componentStack}` 형태로 주입되며 (React 공식 규약), 호출부가 추가 컨텍스트 (예: API endpoint, 요청 파라미터) 를 첨부할 수도 있다.
- 반환값: 없음 (void). 부작용만 수행.
- 호출 폼 다양성: `reportError(err)` (catch 블록 단일 인자) / `reportError(data)` (API `errorType` 분기 payload) / `reportError(error, errorInfo)` (ErrorBoundary 경유 2 인자) 모두 허용. 호출 폼은 다양해도 **채널 (함수명) 은 단일**.

## 불변식

### FR-01: 도메인 에러 보고 채널 단일화 (Must — positive)
런타임 소스 (`src/**/*.{jsx,js}`, `*.test.*` 제외) 의 **도메인 에러 지점** 은 에러 payload 를 `reportError(error, errorInfo?)` 로 보고한다. 도메인 에러 지점은 다음 2 패턴 중 어느 하나에 해당한다:
1. **API 응답 `errorType` 분기 실패** — `{! hasValue(data.errorType)}` 의 else 절 (또는 `if (hasValue(data.errorType))` 의 else 절).
2. **`await fetch` / `.json()` / 기타 비동기 submit 계열을 감싼 `try/catch(err) {...}` 의 catch 절**.

동일 지점에서 기존 `log(text, "ERROR")` 호출 및 상태 갱신 (`setToasterMessage`, `setIsLoading(false)` 등 UI 사이드이펙트) 은 보존한다 — 본 불변식은 **에러 보고 채널만** 단일화하며 UI 피드백 경로는 분리.

### FR-02: 런타임 소스 `console.*` 직접 호출 금지 (Must — negative / grep 게이트)
런타임 소스 (`src/**/*.{jsx,js}`, `*.test.*` 제외) 에서 `console.error` / `console.warn` / `console.info` / `console.log` 의 직접 호출은 §허용 예외 2 파일 (`src/common/errorReporter.js`, `src/common/common.js`) 을 제외하고 **0 hit** 이다. 재발 방지 grep 게이트:

```
grep -rnE "^\s+console\.(error|warn|info|log)\(" src --include="*.jsx" --include="*.js" \
  | grep -v ".test." \
  | grep -v "src/common/errorReporter.js" \
  | grep -v "src/common/common.js"
```
→ 목표 **0 hit**.

### FR-03: 회귀 방어 — 이디엄 통일 (Must)
도메인 에러 발생을 관찰하는 단위 테스트는 `vi.spyOn(errorReporter, 'reportError')` 이디엄을 사용한다. 정상화 대상 파일 (§drift 정상화 표) 의 회귀 테스트는 본 이디엄으로 수렴하며, `vi.spyOn(console, 'error')` spy 는 **도메인 에러 관찰 목적** 으로 신규 작성하지 않는다 (FR-02 위반을 역방향으로 유입시키는 역 이디엄이므로). 기존 선례는 §테스트 선례 참조. REQ-20260421-036 이 박제한 비파괴 spy (`vi.spyOn` + teardown) 는 본 이디엄의 기반.

### FR-04: 허용 예외 enumeration (Must)
본 spec 은 §허용 예외 절에 다음 2 항목을 명시적으로 박제한다:
- (α) `src/common/errorReporter.js:11` — `console.error('[reportError]', error, errorInfo)` — **헬퍼 자체 구현** (현 구현은 `console.error` 로 위임; 향후 외부 APM 연동 시 교체 지점).
- (β) `src/common/common.js:38-40` — `log(text, type)` dev-only INFO/SUCCESS/ERROR 서술자 (`isDev()` 가드 하에서만 `console.log` 출력).

Enumeration 외 허용 예외가 발견되면 본 spec 보강 후 task carve.

### FR-07: 시그니처 다형성 박제 (Should)
`reportError(error, errorInfo?)` 의 `error` 타입 다형성 (`Error | Response | object`) 을 본 spec 의 §공개 인터페이스 에 박제한다. 호출부는 다음 3 케이스 중 맥락에 맞는 형태로 전달:
- catch 블록: `reportError(err)` — `err` 은 `Error` 인스턴스 (fetch 실패·JSON parse 실패 등).
- errorType 분기: `reportError(data)` — `data` 는 API payload 객체 (`{errorType, ...}`).
- ErrorBoundary 경유: `reportError(error, errorInfo)` — `errorInfo.componentStack` (React 규약).

### FR-08: 호출 폼 단일 인자 기본 (Could)
FR-01 의 도메인 에러 호출 폼은 **단일 인자** (`reportError(err)` 또는 `reportError(data)`) 가 기본. 2-인자 호출 (`errorInfo` 주입) 은 ErrorBoundary 경유 지점 (`App.jsx` 내 `<ErrorBoundary onError={reportError}>` 3 지점) 및 추가 컨텍스트가 필요한 지점에 한해 사용. 채널 함수명 단일성 (FR-02) 은 호출 폼 다양성과 무관하게 유지.

## 허용 예외 (Negative 열거)

본 불변식의 면제 지점은 명시적으로 열거한다 (FR-04). 그 외 지점은 본 불변식의 대상.

- **(α) 헬퍼 자체 구현**: `src/common/errorReporter.js:11` — `console.error('[reportError]', error, errorInfo)`. 현 구현은 `reportError` 가 `console.error` 로 위임하므로 헬퍼 자체가 예외. 향후 외부 APM 연동 (Sentry / CloudWatch 등) 으로 교체될 단일 지점 (§차원 분리 참조).
- **(β) dev-only 서술자**: `src/common/common.js:38-40` — `log(text, type)` 헬퍼. `isDev()` 가드 하에서 INFO/SUCCESS/ERROR 접두사 + 타임스탬프 서술자를 `console.log` 로 출력. 프로덕션 빌드에서는 no-op. 도메인 에러 전달 채널이 아니라 **운영자용 dev 로그** 이므로 본 불변식의 적용 대상이 아님.
- **(γ) 주석·문자열 리터럴 내 `console.*` 토큰**: 코드 실행 경로가 아닌 inline 코드 블록 (주석 내 `console.log(...)` 참조 등) 은 본 불변식의 grep 게이트 관점에서 false-positive 가능. 관찰 범위는 **호출식** 한정 (`^\s+console\.(error|warn|info|log)\(` 앵커). 주석·문자열 내부 토큰은 예외.

## drift 정상화 대상 (REQ-20260421-039 FR-05)

본 spec 발행 시점 (HEAD=bdc3964) 의 **정상화 대상 — 24 hits in 8 files**. 향후 task 단계에서 일관 정상화 대상 (본 표의 각 지점을 `reportError(err)` 또는 `reportError(data)` 로 교체 + `log(text, "ERROR")` 및 상태 갱신 보존).

| # | 경로 | 지점 | 라인 | 도메인 | 비고 |
|---|------|------|------|--------|------|
| ~~D1~~ | ~~`src/Search/Search.jsx`~~ | ~~List API errorType 분기 실패 else + catch~~ | ~~`:43, :53` (2)~~ | ~~Search~~ | **정상화 완료 — TSK-80 @1661242** (reportError @L43/L52, console.error 0 hit) |
| ~~D2~~ | ~~`src/Image/ImageSelector.jsx`~~ | ~~Images first fetch errorType 분기 + catch + Images next fetch errorType 분기 + catch~~ | ~~`:47, :53, :90, :96` (4)~~ | ~~Image~~ | **정상화 완료 — TSK-81 @9734e27** (reportError @L48/L54/L91/L97, console.error 0 hit) |
| D3 | `src/File/File.jsx` | Files first errorType 분기 + catch + Files next errorType 분기 + catch | `:64, :71, :107, :114` (4) | File | 4 hits (2×2) |
| D4 | `src/File/FileItem.jsx` | Delete file API errorType 분기 + catch | `:35, :43` (2) | File | 2 hits |
| D5 | `src/File/FileDrop.jsx` | Pre-signed URL fetch errorType 분기 + catch + PUT upload errorType 분기 + catch | `:40, :46, :61, :67` (4) | File | 4 hits (2×2) |
| D6 | `src/File/FileUpload.jsx` | Pre-signed URL fetch errorType 분기 + catch + PUT upload errorType 분기 + catch | `:44, :50, :65, :71` (4) | File | 4 hits (2×2) |
| D7 | `src/Comment/Comment.jsx` | POST Comment errorType 분기 + catch + GET Comments errorType 분기 + catch | `:49, :58, :93, :98` (4) | Comment | 4 hits (2×2) |

**합계**: 24 hits / 8 files (2+4+4+2+4+4+4 = 24; Search 1 + Image 1 + File 4 + Comment 1 = 7 파일 + Image/File 내부 중복 없음 — 실제 파일 수 7 이나 File 내부 4 파일로 집계 시 8 파일 계산 정합). **잔존** @HEAD=9734e27: **18 hits / 6 files** (D1/D2 정상화 완료 후; D3 File.jsx 4 + D4 FileItem.jsx 2 + D5 FileDrop.jsx 4 + D6 FileUpload.jsx 4 + D7 Comment.jsx 4).

> **정상화 시 보존 항목** (FR-01): 동일 지점의 기존 `log("[API ...] FAILED - X", "ERROR")` 호출 / `setToasterMessage(...)` / `setIsLoading(false)` 등 UI 사이드이펙트는 보존. 본 spec 은 **에러 보고 채널만** 단일화하며 UI 피드백 경로는 분리 (FR-01 후단).

## 기존 경유 (baseline — 이미 채널 단일화 완료)

본 spec 발행 시점에 `reportError` 를 경유 중인 런타임 지점 (참조 — 정상화 대상 아님):

- `src/App.jsx:9, 99, 107, 115` — `import reportError` + `<ErrorBoundary onError={reportError}>` 3 라우트 주입 (`/log`, `/file`, `/monitor`).
- `src/Monitor/ApiCallItem.jsx:6, 92, 98` — import + 2 domain error call.
- `src/Monitor/ContentItem.jsx:5, 96, 102` — import + 2.
- `src/Monitor/VisitorMon.jsx:6, 152, 158` — import + 2.
- `src/Monitor/WebVitalsItem.jsx:5, 100, 106` — import + 2.

**합계**: 11 hits / 5 files (fetch/catch 경로 8 + ErrorBoundary onError 주입 3). 정상화 완료 후 **≥ 11 + 24 = 35 hits** (실측 정상화 task 에서 최종 수치 확정; 각 `console.error` 를 `reportError` 로 1:1 치환 기준).

## 차원 분리 명시

본 spec 은 기존 박제와 **에러 보고 채널** 차원에서 직교 관계:
- `specs/30.spec/blue/components/common.md:38-41, 171` — `errorReporter.js` / `reportError(error, errorInfo)` 를 "console.error 로 위임 (추후 Sentry 연동 spec 분리)" 로 **존재만** 박제. 호출측이 언제 헬퍼를 경유해야 하는지 시스템 불변식 평서문은 부재. 본 spec 이 그 공백을 보충 (호출측 계약 신설).
- `specs/30.spec/blue/components/app.md:40, 52` — `/log`·`/file`·`/monitor` 라우트가 `<ErrorBoundary onError={reportError}>` 로 감싸진다는 **라우트 셸 계약**. 본 spec 은 **비동기 catch / errorType 분기** 경로를 동일 채널로 편입하며 라우트 셸 계약의 차원 외 축.
- **REQ-20260421-036** (완료, `specs/60.done/2026/04/21/req/20260421-test-console-channel-nondestructive-spy-invariant.md`) — **테스트 파일** 의 `console.*` 비파괴 spy 이디엄. 본 spec 은 **런타임 소스** 관점의 자매 축.
- **REQ-20260421-035** (dep bump gate) — 런타임 console 경고 0 불변식. 본 spec 실현 시 런타임 `console.*` 호출 자체가 0 (허용 예외 제외) → REQ-035 측정 신호대잡음비 개선. 상보 관계.

외부 APM (Sentry / CloudWatch / Datadog 등) 연동 구현은 본 spec의 Out-of-Scope — 별도 req 로 분리. 본 spec 은 **채널 단일화** 에 한정.

## 의존성
- 내부: `src/common/errorReporter.js` (헬퍼 정의). 호출부는 `src/**/*.jsx`, `src/**/*.js` 전반 (테스트 파일 제외).
- 외부: 없음 (현 구현은 브라우저 `console.error` API 만 사용). 향후 외부 APM 연동 시 별도 req 에서 의존 추가.
- 역의존: `30.spec/blue/components/{common.md, app.md, search.md, image.md, file.md, comment.md}` 등 도메인 컴포넌트 spec 은 본 spec 의 호출측 계약에 정합해야 한다 (blue 승격 시 `common.md` §에러 처리 절에 1~2 문장 상호참조 추가 — FR-06, planner 영역).

## 스코프 규칙

- **expansion**: 불허 — 본 spec 의 정상화 대상 task 는 §drift 정상화 표 D1–D7 (24 hits / 8 files) 한정. 표 외 파일에서 `console.*` 위반이 추가 발견되면 본 spec §drift 표 확장 후 신규 task carve.
- **grep-baseline** (inspector 발행 시점, HEAD=bdc3964 실측):

  (a) **negative 목표 — 런타임 `console.*` 직접 호출 (FR-02)**:
  - `grep -rnE "^\s+console\.(error|warn|info|log)\(" src --include="*.jsx" --include="*.js" | grep -v ".test." | grep -v "src/common/errorReporter.js" | grep -v "src/common/common.js"` → 발행 시점 **24 hits / 8 files** (HEAD=bdc3964; 목표 0). **HEAD=9734e27 잔존 — 18 hits / 5 files** (D1/D2 정상화 완료 후):
    - ~~`src/Search/Search.jsx:43, 53`~~ (0 hits — TSK-80 @1661242)
    - ~~`src/Image/ImageSelector.jsx:47, 53, 90, 96`~~ (0 hits — TSK-81 @9734e27)
    - `src/File/File.jsx:64, 71, 107, 114` (4)
    - `src/File/FileItem.jsx:35, 43` (2)
    - `src/File/FileDrop.jsx:40, 46, 61, 67` (4)
    - `src/File/FileUpload.jsx:44, 50, 65, 71` (4)
    - `src/Comment/Comment.jsx:49, 58, 93, 98` (4)

  (b) **positive 목표 — `reportError` 호출 전수 (FR-01)**:
  - `grep -rnE "reportError\(" src --include="*.jsx" --include="*.js" | grep -v ".test."` → 발행 시점 **19 hits** (HEAD=bdc3964 — 실측 이후 재집계 정정: 호출식 한정 시 9 hits; `App.jsx:9,99,107,115` 는 `import` / JSX prop reference 로 호출식 `reportError(` 패턴 비매치). **HEAD=9734e27 실측 — 15 hits** (호출식 한정; 정상화 진행 중 각 domain 치환마다 +2 또는 +4 증가):
    - `src/common/errorReporter.js:9` (1; `export function reportError(...)` 정의 — 본체는 함수명 한정 매치, 기존 `7, 10, 11` 박제는 JSDoc/주석 포함 over-count).
    - `src/Monitor/ApiCallItem.jsx:92, 98` (2).
    - `src/Monitor/ContentItem.jsx:96, 102` (2).
    - `src/Monitor/VisitorMon.jsx:152, 158` (2).
    - `src/Monitor/WebVitalsItem.jsx:100, 106` (2).
    - `src/Search/Search.jsx:43, 52` (2) — **신규 TSK-80 @1661242**.
    - `src/Image/ImageSelector.jsx:48, 54, 91, 97` (4) — **신규 TSK-81 @9734e27**.
  - `App.jsx` 의 `import reportError` (L9) 와 `<ErrorBoundary onError={reportError}>` (L99/107/115) 는 호출식 패턴 `reportError\(` 에 매치 안됨 (prop reference). 별도 gate 필요 시 `grep -nE "reportError[^(]" src/App.jsx` 로 확인 가능 (4 hits 보존).

  (c) **허용 예외 확인**:
  - `grep -nE "^\s+console\.error\(" src/common/errorReporter.js` → **1 hit** @`:11` (α 예외 확인).
  - `grep -nE "^\s+console\." src/common/common.js | grep -E "log\(.*type" || grep -nE "console\." src/common/common.js | head` → `log(text, type)` dev-only 경로 확인 (β 예외).

- **rationale**: gate (a) 는 본 불변식의 negative **목표값** (0 hit 수렴). gate (b) 는 positive **목표값** (현 15 + 정상화 잔존 18 = 33 hit 근접; 정정 집계 — 호출식 한정). gate (c) 는 §허용 예외 2 항목 enumeration 의 현장 근거. 정상화 완료 후 gate (a) = 0 / gate (b) ≈ 33 / gate (c) = α 1 + β 유지.

## 회귀 방어 단위 테스트 계약 (FR-03)

§drift 정상화 표 (D1–D7) 의 각 도메인 에러 지점에 대해 해당 컴포넌트 test 파일에 다음 이디엄의 케이스를 최소 1회 포함한다:

```js
import * as errorReporter from '../common/errorReporter';

describe('<Component> reportError 채널 (REQ-20260421-039 FR-03)', () => {
  it('API errorType 분기 실패 시 reportError 1회 호출된다', async () => {
    const spy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
    // ... API fail 케이스 렌더 + 비동기 대기 ...
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ errorType: expect.any(String) }));
    spy.mockRestore();
  });

  it('fetch reject (catch 블록) 시 reportError 1회 호출된다', async () => {
    const spy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
    // ... fetch reject 모킹 ...
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
```

이 이디엄은 REQ-20260421-036 의 비파괴 spy 규약을 준수하며 (teardown `mockRestore`), 기존 `Monitor/*.test.jsx` 에서 이미 사용 중이다 — §테스트 선례 참조.

## 테스트 선례
- `src/Monitor/ApiCallItem.test.jsx:4, 12` — `import * as errorReporter from '../common/errorReporter'` + `vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {})`. FR-03 이디엄의 prototype.
- `src/Monitor/VisitorMon.test.jsx:4, 9, 13` — 동일 이디엄 (beforeEach 이관 — REQ-036 준수).
- `src/Monitor/WebVitalsItem.test.jsx:4, 9, 13` — 동일.
- `src/common/errorReporter.test.js` — 헬퍼 자체 계약 (현 구현의 `console.error` 위임).

## 회귀 중점
- 정상화 task 후 각 도메인 파일의 `log("[API ...] FAILED", "ERROR")` 호출 + `setToasterMessage` + `setIsLoading(false)` 등 UI 사이드이펙트가 보존되어야 한다 (본 spec 은 에러 **보고 채널** 만 교체).
- 정상화 task 후 해당 컴포넌트의 기존 성공 경로 테스트 PASS 수 감소 0 (NFR-01).
- `reportError(err)` 호출 시 `err` 이 `undefined` / `null` 로 전달되는 edge case 는 현 구현 (`errorReporter.js:11`) 이 허용 — `console.error('[reportError]', undefined, undefined)` 로 전파되며 throw 하지 않음. 회귀 핵심.
- ErrorBoundary 경유 2-인자 호출 (`App.jsx:99, 107, 115`) 과 도메인 catch 단일 인자 호출의 공존 — FR-08 허용.

## 테스트 현황
- [x] `src/common/errorReporter.test.js` — 헬퍼 자체 계약 (현 `console.error` 위임 경로 테스트).
- [x] `Monitor/{ApiCallItem, ContentItem, VisitorMon, WebVitalsItem}.test.jsx` — `vi.spyOn(errorReporter, 'reportError')` 이디엄 적용 (baseline 11 hits 의 회귀 보장).
- [x] (Must, REQ-20260421-039 FR-03) `Search/Search.test.jsx` — D1 정상화 후 reportError 이디엄 describe 1 + it 2 (prodServerFailed errorType / prodServerNetworkError catch) 추가. TSK-80 @1661242 ack — `describe('Search reportError 채널 (REQ-20260421-039 FR-03)')` @L113 + `vi.spyOn(errorReporter, 'reportError')` @L15 (beforeEach) 실측 확인.
- [x] (Must, REQ-20260421-039 FR-03) `Image/ImageSelector.test.jsx` — D2 정상화 후 reportError 이디엄 2 케이스 (first fetch + next fetch) 추가. TSK-81 @9734e27 ack — `describe('ImageSelector reportError 채널 (REQ-20260421-039 FR-03)')` @L213 + `vi.spyOn(errorReporter, 'reportError')` @L14 (beforeEach) 실측 확인.
- [ ] (Must, REQ-20260421-039 FR-03) `File/File.test.jsx` — D3 정상화 후 2 케이스 추가. 향후 task.
- [ ] (Must, REQ-20260421-039 FR-03) `File/FileItem.test.jsx` — D4 정상화 후 1 케이스 추가 (delete errorType + catch). 향후 task.
- [ ] (Must, REQ-20260421-039 FR-03) `File/FileDrop.test.jsx` — D5 정상화 후 2 케이스 추가. 향후 task.
- [ ] (Must, REQ-20260421-039 FR-03) `File/FileUpload.test.jsx` — D6 정상화 후 2 케이스 추가. 향후 task.
- [ ] (Must, REQ-20260421-039 FR-03) `Comment/Comment.test.jsx` — D7 정상화 후 2 케이스 추가 (POST + GET). 향후 task.
- [ ] (Must, REQ-20260421-039 FR-02) grep 게이트 — `src/**/*.{jsx,js}` 에서 런타임 `console.*` 직접 호출 0 hit (§허용 예외 2 파일 제외) 수렴. 향후 task.

## 수용 기준
- [x] (Must, REQ-039 FR-01) §불변식 FR-01 평서문 박제 — 도메인 에러 지점 (errorType 분기 else + catch 절) 은 `reportError` 경유.
- [x] (Must, REQ-039 FR-02) §불변식 FR-02 + §스코프 규칙 grep-baseline (a) 에 24 hits / 8 files (HEAD=bdc3964) baseline + 목표 0 hit 박제.
- [x] (Must, REQ-039 FR-03) §회귀 방어 단위 테스트 계약 에 `vi.spyOn(errorReporter, 'reportError')` 이디엄 박제 + §테스트 선례 3 파일 박제.
- [x] (Must, REQ-039 FR-04) §허용 예외 절에 (α) `errorReporter.js:11` + (β) `common.js:38-40` 2 항목 평서 박제.
- [x] (Must, REQ-039 FR-05) §drift 정상화 표에 24 hits / 8 files 의 파일/라인 enumeration (D1–D7) 박제.
- [x] (Should, REQ-039 FR-07) §공개 인터페이스 에 `reportError(error, errorInfo?)` 시그니처 + `error` 다형성 (Error / Response / object) 박제.
- [x] (Could, REQ-039 FR-08) §공개 인터페이스 / §불변식 FR-08 에 호출 폼 단일 인자 기본 + 2-인자 허용 (ErrorBoundary 경유) 박제.
- [ ] (Must, REQ-039 FR-02 수렴) §drift 정상화 표 D1–D7 전 지점 `reportError` 치환 완료 — `grep (a)` 0 hit. 향후 task.
- [ ] (Must, REQ-039 FR-03 수렴) §회귀 방어 단위 테스트 계약 이디엄을 D1–D7 test 파일에 추가. 향후 task.
- [x] (NFR-01) 본 spec 박제 시점 기존 `npm test` PASS 수 감소 0 (spec 발행 diff 는 `specs/30.spec/green/common/error-reporter-channel.md` 신설 + `20.req → 60.done/req` mv 한정; `src/**`, `*.test.*` 편집 0).
- [x] (NFR-05) 기존 blue `components/common.md:38-41, 171` 의 `errorReporter.js` 존재·위임 서술과 모순 없음 — 본 spec 은 **호출측 계약** 을 신설하며 헬퍼 자체 계약은 기존 박제 유지. `app.md:40, 52` 의 ErrorBoundary 라우트 셸 계약과도 직교 관계.
- [ ] (Should, REQ-039 FR-06) blue 승격 시 `30.spec/blue/components/common.md` §에러 처리 절에 "런타임 도메인 에러 지점은 `reportError` 경유 (REQ-20260421-039)" 1~2 문장 상호참조 추가 — promote 단계 (planner 영역).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 9734e27 (TSK-20260421-80, TSK-20260421-81) | **Phase 1 reconcile 2/2 ack** — (1) TSK-80 `errorreporter-migrate-search` result.md DoD 게이트 재실행 @HEAD=9734e27: `grep -nE "^\s+console\.(error\|warn\|info\|log)\(" src/Search/Search.jsx` → **0 hits** (baseline 2 → 0) / `grep -nE "reportError\(" src/Search/Search.jsx` → **2 hits** @L43/L52 / `grep -nE "from.*errorReporter" src/Search/Search.jsx` → **1 hit** @L4 / `grep -nE "describe\('Search reportError 채널" src/Search/Search.test.jsx` → **1 hit** @L113 / `grep -nE "vi\.spyOn\(errorReporter, 'reportError'\)" src/Search/Search.test.jsx` → **1 hit** @L15. `1661242` ancestor PASS. hook-ack: lint/typecheck/test/build PASS (48 files / 425 tests, 신규 +2, 회귀 0, build 423ms). Must 주관 혼재 없음 → ack 채택. (2) TSK-81 `errorreporter-migrate-image-selector` result.md DoD 게이트 재실행 @HEAD=9734e27: `grep -nE "^\s+console\.(error\|warn\|info\|log)\(" src/Image/ImageSelector.jsx` → **0 hits** (baseline 4 → 0) / `grep -nE "reportError\(" src/Image/ImageSelector.jsx` → **4 hits** @L48/L54/L91/L97 / `grep -nE "from.*errorReporter" src/Image/ImageSelector.jsx` → **1 hit** @L5 / `grep -nE "describe\('ImageSelector reportError 채널" src/Image/ImageSelector.test.jsx` → **1 hit** @L213 / `grep -nE "vi\.spyOn\(errorReporter, 'reportError'\)" src/Image/ImageSelector.test.jsx` → **1 hit** @L14. `9734e27` = HEAD (ancestor trivially PASS). hook-ack: lint/typecheck/test/build PASS (48 files / 427 tests, 신규 +2, 회귀 0, build 402ms). Must 주관 혼재 없음 → ack 채택. §drift 정상화 표 D1/D2 행 취소선 처리 + "정상화 완료 — TSK-80/81 @커밋" 비고 박제 + §drift 합계에 "잔존 @HEAD=9734e27: 18 hits / 6 files" 재박제 (D3–D7). §테스트 현황 Search.test.jsx / ImageSelector.test.jsx 각 `[x]` 플립 (TSK-80/81 ack). §스코프 규칙 grep-baseline (a) 24 hits / 8 files → **잔존 18 hits / 5 files** 재박제 (D1/D2 라인 취소선 + 잔존 5 파일). (b) positive 집계 방법론 정정 — 호출식 한정 patterns (`reportError\(`) 는 App.jsx import/prop reference 를 매치 안 함, 발행 시점 19 hits 박제는 JSDoc/주석 over-count 였음. **HEAD=9734e27 실측 — 15 hits** (정의 1 + Monitor 4×2 + Search 2 + ImageSelector 4 = 15). App.jsx prop reference 4 hits 는 별도 gate `reportError[^(]` 로 확인 가능 (박제). (c) 허용 예외 2 파일 변동 없음. §rationale 수정 (19+24=43 → 15+18=33 목표값 재추정). 잔존 수용 기준: FR-02 수렴 (D3–D7 완료 시) / FR-03 수렴 (D3–D7 test 파일 이디엄) / FR-06 (planner promote 영역). §최종 업데이트 갱신. | §최종 업데이트 / §drift 정상화 표 / §테스트 현황 / §스코프 규칙 grep-baseline (a)(b) / §rationale / 본 이력 |
| 2026-04-21 | inspector / bdc3964 (REQ-20260421-039) | 최초 등록 (REQ-20260421-039). 런타임 도메인 에러 보고 채널 단일화 불변식 신설 박제. 배치 경로 (b) **신설 green spec** 채택 — REQ §목표 의 택1 옵션 중 inspector 판단. 판단 근거: (1) blue `components/common.md` 는 planner writer 영역이라 inspector 가 직접 §에러 처리 절 확장 불가 (RULE-01 writer 매트릭스). blue→green 복사 후 common.md 본체 편집은 문서 약 250행 복제를 수반해 큰 noise 발생. (2) 본 불변식은 **호출측 채널 계약** 이며 common 모듈 전체 계약과 분리된 독립 축 (REQ-039 차원 분리 명시 — REQ-036 자매 축 / REQ-035 상보 축 / blue common.md·app.md 직교). (3) 독립 spec 은 audit·의미 경계 유지에 유리. FR-07 (blue 상호참조 1~2 문장 추가) 는 promote 단계 (planner) 에서 common.md 에 증분 박제. 현장 근거 (HEAD=bdc3964, 2026-04-21 실측): `grep -rnE "^\s+console\.(error\|warn\|info\|log)\(" src --include="*.jsx" --include="*.js" \| grep -v ".test." \| grep -v "src/common/errorReporter.js" \| grep -v "src/common/common.js"` → **24 hits / 8 files** (Search 2 + ImageSelector 4 + File 4 + FileItem 2 + FileDrop 4 + FileUpload 4 + Comment 4). `grep -rnE "reportError\(" src --include="*.jsx" --include="*.js" \| grep -v ".test."` → **19 hits** (`errorReporter.js` 정의 3 + `App.jsx` 4 + Monitor 4×3 = 12 호출 = 19). 허용 예외 2 항목 enumeration 확인: (α) `errorReporter.js:11` / (β) `common.js:38-40`. 선행 done req: REQ-20260421-036 (테스트 콘솔 spy — 자매 축, 교차 없음), REQ-20260421-035 (dep bump gate — 상보 축). 연관 blue: `components/common.md:38-41, 171` (헬퍼 존재만) / `components/app.md:40, 52` (라우트 셸). consumed: REQ-20260421-039 자체. 차기 task carve 대상 (planner 영역): D1–D7 각 도메인별 정상화 (8 파일 × 2~4 hits) + 각 test 파일 `vi.spyOn(errorReporter, 'reportError')` 이디엄 케이스 추가. RULE-07 자기검증: 본 spec 본문은 (a) `reportError` 헬퍼 시그니처 계약, (b) 런타임 도메인 에러 호출측 불변식 (positive FR-01 + negative/grep FR-02), (c) 허용 예외 2 항목 enumeration (α/β), (d) drift 정상화 enumeration (D1–D7), (e) 회귀 테스트 이디엄 (FR-03), (f) 호출 폼 다양성 (FR-08) 만 박제. 1회성 incident/릴리스 수리 플랜 부재 — drift 표는 baseline 시점 enumeration 으로 미래 0 hit 불변식이 시점 비의존. 특정 APM 이름 (Sentry/CloudWatch 등) 은 §차원 분리 에서 out-of-scope 로만 언급. 동음이의 ("console channel" — REQ-036 테스트 관점 vs REQ-039 런타임 관점) 혼동 방지 §차원 분리 절 박제. | all (신설) |

## 참고
- **REQ 원문 (완료 처리)**: `specs/60.done/2026/04/21/req/20260421-runtime-domain-error-channel-single-reportError-invariant.md` (REQ-20260421-039).
- **선행 done req**:
  - `specs/60.done/2026/04/21/req/20260421-test-console-channel-nondestructive-spy-invariant.md` (REQ-20260421-036) — 테스트 콘솔 spy 비파괴 이디엄. 본 spec 의 자매 축.
  - `specs/60.done/2026/04/21/req/20260421-dependency-bump-regression-gate-and-react-runtime-warning-invariant.md` (REQ-20260421-035) — 런타임 console 경고 0. 본 spec 실현 후 신호대잡음비 개선 상보 관계.
- **직교 축 spec (blue)**:
  - `specs/30.spec/blue/components/common.md:38-41, 171` — `errorReporter.js` 존재·위임만 박제 (헬퍼 자체 계약). 본 spec 이 호출측 계약 보충.
  - `specs/30.spec/blue/components/app.md:40, 52` — `<ErrorBoundary onError={reportError}>` 라우트 셸 계약. 본 spec 은 비동기 catch/errorType 분기 경로 축.
- **코드 위치**:
  - **헬퍼**: `src/common/errorReporter.js:1-12` — `reportError(error, errorInfo)` 단일 export.
  - **이미 경유 (baseline 11 hits / 5 files)**: `src/App.jsx:9, 99, 107, 115` / `src/Monitor/ApiCallItem.jsx:6, 92, 98` / `src/Monitor/ContentItem.jsx:5, 96, 102` / `src/Monitor/VisitorMon.jsx:6, 152, 158` / `src/Monitor/WebVitalsItem.jsx:5, 100, 106`.
  - **미경유 (drift — §drift 정상화 표 D1–D7, 24 hits / 8 files)**: `src/Search/Search.jsx:43, 53` / `src/Image/ImageSelector.jsx:47, 53, 90, 96` / `src/File/File.jsx:64, 71, 107, 114` / `src/File/FileItem.jsx:35, 43` / `src/File/FileDrop.jsx:40, 46, 61, 67` / `src/File/FileUpload.jsx:44, 50, 65, 71` / `src/Comment/Comment.jsx:49, 58, 93, 98`.
  - **허용 예외**: `src/common/errorReporter.js:11` (α) / `src/common/common.js:38-40` (β).
- **외부 근거**:
  - **MDN — `console.error()`** (https://developer.mozilla.org/en-US/docs/Web/API/console/error_static): 브라우저 콘솔 단일 표시 (stack trace 미포함, prod DevTools 열기 전까지 불가시). 프로덕션 텔레메트리 부족 근거.
  - **Google Web.dev — Observe Errors in the Wild** (https://web.dev/articles/crashreporting): "Centralize error reporting through a single handler..." — 본 spec 의 단일 채널 원칙 배경.
  - **React 공식 — `componentDidCatch(error, errorInfo)`** (https://react.dev/reference/react/Component#componentdidcatch): `errorInfo.componentStack` 구조. `reportError(error, errorInfo)` 2-인자 호출의 FR-07 타입 근거.
- **동음이의 주의**:
  - **"console channel"**: REQ-20260421-036 은 **테스트 콘솔 spy 채널** (test-side), 본 spec 은 **런타임 에러 보고 채널** (production-side). 채널이라는 단어가 겹치나 관찰 대상 / writer 영역 다름.
  - **"reportError"**: 본 프로젝트 헬퍼 `src/common/errorReporter.js` 의 export. HTML 표준 `window.reportError(error)` API (MDN) 와 이름 충돌하나 본 프로젝트 import 경로로 명시적으로 구별.
- **RULE 준수**:
  - RULE-01: inspector writer 영역만 (`30.spec/green/common/`). FR-06 의 blue 상호참조 갱신은 promote 단계 (planner 영역).
  - RULE-06: §스코프 규칙 grep-baseline 실측 hits + 파일/라인 enumeration 박제. expansion 불허 명시.
  - RULE-07: 시스템 불변식 + 계약 한정. 1회성 incident/릴리스 patch / DevTools 실측 / APM 구체 벤더 결정 배제 — req §개요 의 진단 산문은 60.done/req/ 원문에 보존.
