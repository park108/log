# 명세: 클립보드 헬퍼 (`copyToClipboard`) — Clipboard API 마이그레이션

> **위치**:
> - 대상 헬퍼: `src/common/common.js:371-384` (async 비동기로 이미 이전됨, commit `4765eaf`)
> - 호출자 4종: `src/Log/Writer.jsx`, `src/Log/LogItem.jsx`, `src/File/FileItem.jsx`, `src/Image/ImageSelector.jsx`
> - 영향 테스트 8+건: `src/common/common.test.js`, `src/Log/Writer.test.jsx` (×7 stub), `src/Log/LogItem.test.jsx`, `src/File/File.test.jsx`, `src/Image/ImageSelector.test.jsx`
> - ESLint 설정: `.eslintrc.yml`
> - 런타임 스모크 체크리스트: `docs/testing/clipboard-runtime-smoke.md` (WIP — REQ-20260418-025)
> **유형**: Util (비동기 헬퍼) + 린트 규칙 + 수동 스모크 체크리스트
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-025 호출자 await + 런타임 스모크 추가)
> **상태**: Experimental (헬퍼 정의 완료 / 호출자 await 도입 WIP)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260418-clipboard-api-migration-execcommand-deprecation.md` (REQ-20260418-022) — 헬퍼 마이그레이션 (완료)
> - `specs/requirements/done/2026/04/18/20260418-clipboard-callers-await-and-runtime-smoke.md` (REQ-20260418-025) — 호출자 await + 테스트 stub 정리 + 런타임 스모크 baseline (WIP)
> - `specs/requirements/done/2026/04/18/20260418-execcommand-stub-residue-final-sweep.md` (REQ-20260418-034) — `document.execCommand = vi.fn()` 잔재 3+ 건 전역 sweep → §3.3 FR-05 0건 마감 (WIP)
> - `specs/requirements/done/2026/04/18/20260418-imageselector-toaster-tone-policy-unify-success.md` (REQ-20260418-036) — ImageSelector 성공 톤 warning → success 통일 + §3.2.1 정책 마감 (WIP)
> - 자매 REQ-20260418-018 (`eslint-plugin-jsx-a11y`) — 같은 ESLint 갱신 라운드 후보

> 본 문서는 `copyToClipboard` 헬퍼의 deprecated `document.execCommand("copy")` → `navigator.clipboard.writeText` 마이그레이션 정책 SSoT.

---

## 1. 역할 (Role & Responsibility)
클립보드 쓰기(텍스트 복사) 를 비동기 표준 API 로 일원화하고, 보안 컨텍스트 / 권한 / API 미지원 케이스에서 실패를 **조용히 삼키지 않는** 안전한 실패 신호를 제공.

- 주 책임:
  - `copyToClipboard(value)` 가 `Promise<boolean>` 을 반환 (성공=`true`, 실패=`false`).
  - 호출자는 반환값으로 사용자 피드백(Toaster 등) 분기.
  - ESLint 로 `document.execCommand` 재발 차단.
- 의도적으로 하지 않는 것:
  - 클립보드 읽기(`navigator.clipboard.read()`) — 사용처 0, 별 후보.
  - 권한 요청 UI 디자인 — 거부 케이스 메시지 정도만.
  - 클립보드 외 `execCommand` 의 다른 명령(`bold` 등) — 코드베이스 미사용.
  - 사용자 제스처 사전 검사(`permissions.query`) — UX 가치 평가 후 별 후보 (REQ §13).

> 관련 요구사항: REQ-20260418-022 §3 (Goals)

---

## 2. 현재 상태 (As-Is)

### 2.1 헬퍼 정의 (src/common/common.js:371-382)
```js
export const copyToClipboard = (valueToClipboard = "") => {
  const tempElem = document.createElement('textarea');
  tempElem.value = valueToClipboard;
  document.body.appendChild(tempElem);
  tempElem.select();
  document.execCommand("copy");
  document.body.removeChild(tempElem);
  log("Copy to Clipboard: " + valueToClipboard);
}
```
- `document.execCommand` 는 MDN/W3C 에서 **Deprecated** ("Not for use in new websites"). Chromium/WebKit/Gecko 모두 점진 제거 트랙.
- 동기 함수, 반환값 없음 → 실패를 호출자가 감지 못 함.

### 2.2 호출자 (grep)
- `src/Log/Writer.jsx`, `src/Log/LogItem.jsx`, `src/File/FileItem.jsx`, `src/Image/ImageSelector.jsx` 의 메뉴/액션.
- 일부는 직접 `execCommand` fallback 을 포함 (FileItem 등).

### 2.3 테스트 stub 8건 → 잔재 3건 (2026-04-18 관측)

**원 기준선 (REQ-022 시점, 8건)**:
- `src/common/common.test.js:466` `document.execCommand = vi.fn();`
- `src/Log/Writer.test.jsx:33,84,135,186,239,292,345` (7회)
- `src/Log/LogItem.test.jsx:28`
- `src/File/File.test.jsx:103`
- `src/Image/ImageSelector.test.jsx:31`

`document.execCommand` stub 이 8곳에 흩어져 있고 패턴이 일관되지 않음.

**[WIP] 잔재 현황 (REQ-20260418-034 Phase 1 `grep -rn "document.execCommand = vi.fn" src/` 결과)**:
- `src/Log/LogItem.test.jsx:28` — 모듈 최상단 공유 stub (잔재)
- `src/Log/LogItem.test.jsx:91` — 별도 it 블록 내 재선언 stub (잔재 — cleanup 누락)
- `src/Image/ImageSelector.test.jsx:31` — 모듈 최상단 공유 stub (잔재)
- (검증 필요 — REQ-034 Phase 1) `src/common/common.test.js:466` / `src/File/File.test.jsx:103` — REQ-022/025 머지 후 정리 여부 미확인 (REQ-034 Phase 1 grep 검증 필수)

REQ-025 머지 결과 (commit `4765eaf` `copyToClipboard` 비동기 전환 + 후속 PR) 로 `Writer.test.jsx` 의 7건이 0건으로 정리됨. **현 3건 잔재 + α** 를 REQ-20260418-034 가 §3.3 FR-05 `0건` 목표로 최종 sweep 한다.

### 2.4 ESLint 설정
- `.eslintrc.yml` 에 `document.execCommand` 호출을 차단하는 룰 없음. 자매 REQ-20260418-018 의 `eslint-plugin-jsx-a11y` 도입과 같은 라운드에서 처리 가능.

---

## 3. 도입 정책
> 관련 요구사항: REQ-20260418-022 FR-01~07

### 3.1 신규 시그니처 (FR-01, FR-02)
```js
// src/common/common.js
export const copyToClipboard = async (value = "") => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      log("Copy to Clipboard: " + value);
      return true;
    } catch (err) {
      log("Clipboard write rejected: " + err.message, "ERROR");
      return false;
    }
  }
  log("Clipboard API unavailable", "ERROR");
  return false;
};
```

- 반환: `Promise<boolean>`. `true` = 성공, `false` = fallback 필요 (호출자가 사용자 알림 띄울지 결정).
- 시그니처 breaking: 동기 → 비동기. 모든 호출자 `await` 또는 `.then(...)` 으로 갱신 필요 (FR-03).
- `log(... "ERROR")` 로 콘솔에 ERROR 로그 1회 (디버깅 신호).

### 3.2 호출자 갱신 (FR-03)
```jsx
const handleCopy = async () => {
  const ok = await copyToClipboard(value);
  if (!ok) {
    // FR-04: 사용자 피드백 (Toaster 등)
    showToast({ type: 'error', message: '클립보드 복사 실패' });
  }
};
```

- 대상 4종: `src/Log/Writer.jsx`, `src/Log/LogItem.jsx`, `src/File/FileItem.jsx`, `src/Image/ImageSelector.jsx`.
- 호출자마다 `await` 또는 Promise 체인 적용. 실패 시 FR-04 사용자 피드백 1곳 이상.

### 3.2.1 호출자별 Toaster 분기 매핑 (REQ-20260418-025 FR-01~03, FR-07 + REQ-20260418-036 FR-01~08)
> 관련 요구사항: REQ-20260418-025 §3.1 A, US-01, US-02; REQ-20260418-036 §3.1, US-01~US-04

TSK-25 에서 헬퍼는 이미 `Promise<boolean>` 시그니처로 전환됐으나(commit `4765eaf`) 호출자 3종은 여전히 동기 호출 형태를 유지해 반환값이 버려진다. 본 요구사항에서 호출자를 `async` 이벤트 핸들러로 전환하고 반환 boolean 으로 Toaster type/message 분기.

**호출자별 성공 톤 정책 (REQ-20260418-036 마감)** — 마크다운 / URL / 그 외 성공 복사 모두 `success` 사용. `warning` / `info` 는 부분 성공 / 권장 안 함 / 만료 등 **의미적 분기에만** (일반 복사 성공 경로에서 미사용).

| 호출자 | 호출 라인 | 성공 시 Toaster | 실패 시 Toaster (신규) |
|--------|-----------|----------------|-----------------------|
| `src/Log/Writer.jsx:247` (copyMarkdownString) | `await copyToClipboard(markdownString)` | `success` (정책 통일) — 기존 `success/info` 중 `info` 분기 정리는 별 후보 | `type="error"` + "Copy failed (permission denied or unavailable)." |
| `src/File/FileItem.jsx:54` (copyFileUrl) | `await copyToClipboard(props.url)` | `success` (표준 유지) | `type="error"` + 동등 메시지 |
| `src/Image/ImageSelector.jsx:156` (copyMarkdownString) | `await copyToClipboard(imageForMarkdown)` | **`success`** (REQ-036: 기존 `warning` → `success` 통일) | `type="error"` + 동등 메시지 |

에러 메시지 표준 텍스트 (FR-07, REQ-025): `"Copy failed (permission denied or unavailable)."` — 영문 단일. i18n/한국어 분리는 §13 미결. `Toaster` 는 이미 `type="error"` 지원(`src/Toaster/Toaster.jsx:16-18` `divToasterError`).

#### 3.2.1.1 [WIP] ImageSelector warning → success 통일 (REQ-20260418-036)
> 관련 요구사항: REQ-20260418-036 FR-01 ~ FR-08, US-01~US-04

**목표 (FR-01)**: `src/Image/ImageSelector.jsx:159` 의 `setToasterType("warning")` → `setToasterType("success")` (1줄 변경). 메시지 텍스트 `"Markdown string copied."` 보존 (FR-05). 거부 분기(`error`) 변경 0 (FR-06).

**회귀 테스트 보정 (FR-02)**: `src/Image/ImageSelector.test.jsx` 의 성공 분기 어서트가 `'success'` 와 정합 — `grep -n "warning" src/Image/ImageSelector.test.jsx` 에서 ImageSelector 의 성공 분기 어서트 0 확인.

**grep 회귀 차단 (FR-07)**: `grep -rn "setToasterType(\"warning\")" src/Image/` → 0 hit. result.md 박제.

**자매 호출자 검증 (FR-08)**: Writer / FileItem / ImageSelector 3 호출자 모두 success 톤 일관성 grep 보고 — `grep -rn "setToasterType(\"success\")" src/Image/ src/File/ src/Log/Writer.jsx` 출력 박제.

**Toaster 시각 smoke 재확인 (FR-04, Should)**: 운영자 1회 — `/log/:timestamp` 의 ImageSelector 진입 → 마크다운 복사 → 초록 토스트 가시. Toaster 색 baseline 자체는 변경 0 (단지 ImageSelector 가 다른 type 선택) — `specs/spec/blue/testing/toaster-visual-smoke-spec.md` 의 success 색 baseline 재사용.

**수용 기준 (REQ-20260418-036 §10)**:
- [ ] `src/Image/ImageSelector.jsx:159` `setToasterType("warning")` → `setToasterType("success")`
- [ ] `src/Image/ImageSelector.test.jsx` 의 성공 분기 어서트 `'success'` 와 정합
- [ ] `npm test` 100% PASS, `npm run lint` 0 warn, `npm run build` PASS
- [ ] `grep -rn "setToasterType(\"warning\")" src/Image/` → 0 hit (result.md 박제)
- [ ] 메시지 텍스트 `"Markdown string copied."` 보존
- [ ] 거부 분기 (`error`) 보존
- [ ] (Should) 운영자 1회 Toaster 시각 smoke — ImageSelector 마크다운 복사 → 초록 가시
- [ ] (Could) Writer / FileItem / ImageSelector 3 호출자 grep 결과 모두 success 톤 일관성 보고

**범위 밖**:
- Writer 의 `success/info` 분기 중 `info` 실제 사용 여부 정리 — 별 후보.
- Toaster 4 type 의 의미론 spec 신설 (`Toaster-spec.md` 로케이션에 명시) — 별 spec 후보.
- Toaster 컴포넌트 리팩터 / i18n / 마크다운 복사 UX 강화 — 별 트랙.

호출자 시그니처 변경 범위:
- 이벤트 핸들러 내부만 `async` 로 전환. 외부 props 시그니처 변경 금지 (REQ §8 제약).
- `copyToClipboard` 가 자체 `try/catch` 로 rejection 을 흡수하므로 호출자 `try/catch` 불필요 (REQ §12 위험 1 완화).

### 3.3 테스트 mock 통일 (FR-05)
**목표 패턴** (선호 - 공용):
```js
// src/setupTests.js (기존 setup 파일) 또는 각 테스트 beforeEach
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
```
- `document.execCommand = vi.fn();` 8회 제거.
- 공용 setup 에 단일 정의 vs 각 테스트 명시: 일관성 ↔ 격리 트레이드오프 — REQ §13 미결 (inspector 는 공용 setup 권장).

검증:
- `grep -rn "document.execCommand = vi.fn" src/` → 0건
- `grep -rn "navigator.clipboard" src/**/*.test.*` → 8개 테스트 커버 (또는 공용 setup 에서 1회 정의)

### 3.3.1 [WIP] 거부 분기 신규 테스트 케이스 (REQ-20260418-025 FR-04, US-03)
> 관련 요구사항: REQ-20260418-025 FR-04, US-03

호출자 4종(Writer/LogItem/FileItem/ImageSelector) 테스트에 거부 분기 ≥1건씩 신규 추가:

```js
// 예: Writer.test.jsx 거부 분기 케이스
beforeEach(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockRejectedValue(new Error('permission denied')),
    },
  });
});

it('shows error Toaster when clipboard write rejects', async () => {
  // render Writer, fire copy click
  // expect setToasterType('error') + message 어서트
});
```

- 호출자당 성공 1건 + 거부 1건 = ≥2건.
- `document.execCommand` 참조는 테스트 코드 포함 0건 목표 (REQ-025 US-03 수용).
- 공용 setup stub 도입 시 rejection 은 `mockRejectedValueOnce` 로 케이스 개별 override.

### 3.3.2 [WIP] `document.execCommand = vi.fn()` 잔재 전역 sweep — §3.3 FR-05 0건 마감 (REQ-20260418-034)
> 관련 요구사항: REQ-20260418-034 FR-01 ~ FR-11, US-01 ~ US-03

**Phase 1 — 전역 sweep 검증 (Must, REQ-034 FR-01)**:
- `grep -rn "document.execCommand = vi.fn" src/ --include='*.test.js' --include='*.test.jsx'` 으로 모든 잔재 위치 박제 (PR 본문).
- `grep -rn "document.execCommand" src/ --include='*.js' --include='*.jsx' | grep -v '\.test\.'` 으로 실 코드 fallback 잔재 검증 (§2.1 에 따라 0건 예상).
- §2.3 의 3건 + α 실측치 확정 → 본 요구사항 범위 박제.

**Phase 2 — stub 치환 (Must, REQ-034 FR-02~FR-04)**:

대상 (§2.3):
- `src/Log/LogItem.test.jsx:28` (stub 1)
- `src/Log/LogItem.test.jsx:91` (stub 2 — 별도 의도 여부 사전 확인)
- `src/Image/ImageSelector.test.jsx:31` (stub 3)
- (Phase 1 결과 따름) `src/common/common.test.js` / `src/File/File.test.jsx` 잔재

**옵션 (REQ-034 FR-05, planner 결정, §13 미결 1 닫기)**:
- **옵션 A (파일별 `beforeEach`, 격리 우선)**:
  ```js
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });
  ```
- **옵션 B (`setupTests.js` 글로벌, 일관성 우선 — 권장)**: §3.3 목표 패턴 인용. `src/setupTests.js` 에 글로벌 `beforeEach` 1회 등록 → 모든 테스트 파일에 자동 적용.
- 권장 = **옵션 B** (inspector 권장, §3.3 이미 명시). 단, 거부 분기 (`mockRejectedValue`) 를 의도적으로 stub 하는 경우 파일별 override 허용 (옵션 A 부분 채택).

**Phase 3 — 회귀 검증 (Must, REQ-034 FR-11)**:
- `npx vitest run src/Log/LogItem.test.jsx src/Image/ImageSelector.test.jsx` PASS.
- `npm test` 100% PASS.
- `grep -rn "document.execCommand = vi.fn" src/` → **0건** 박제 (result.md).
- `grep -rn "document.execCommand" src/ --include='*.js' --include='*.jsx' | grep -v '\.test\.'` → 0건 (실 코드 fallback 잔재 0).

**Phase 4 — spec 갱신 (Must, REQ-034 FR-07~FR-09, inspector 트리거)**:
- §2.3 갱신: 8건 → 0건 마감 history 박제 (본 REQ 머지 후 inspector 후속).
- §3.3 `검증` 섹션: grep 결과 박제 (현재 `"document.execCommand = vi.fn" → 0건` 으로 최종 확정).
- §13 미결 1 닫기: 옵션 A vs B 결정 사유 박제 (아래 §13 참조).

**수용 기준 (REQ-20260418-034 §10)**:
- [ ] `grep -rn "document.execCommand = vi.fn" src/` → 0건 (result.md 박제)
- [ ] `grep -rn "document.execCommand" src/ --include='*.js' --include='*.jsx' | grep -v '\.test\.'` → 0건 (실 코드 fallback 잔재 0)
- [ ] `src/Log/LogItem.test.jsx` 2 stub 치환 (`:28` + `:91`)
- [ ] `src/Image/ImageSelector.test.jsx` 1 stub 치환 (`:31`)
- [ ] (Phase 1 결과) `src/common/common.test.js` / `src/File/File.test.jsx` 잔재 치환
- [ ] 옵션 A vs B 결정 (planner) + 사유 PR 본문
- [ ] (옵션 B 시) `src/setupTests.js` 에 글로벌 `beforeEach(navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined))` 등록
- [ ] `npm test` 100% PASS, `npm run lint` 0 warn, `npm run build` PASS
- [ ] §2.3 / §3.3 / §13 갱신 (inspector 후속)
- [ ] result.md 에 변경 전/후 grep + 회귀 검증 결과 박제

**범위 밖**:
- ESLint `document.execCommand` 호출 차단 룰 도입 (§2.4) — 본 요구사항 마감 (0건 도달) 후 별 후보.
- `execCommand` 외 deprecated API sweep.
- clipboard 거부 분기 신규 테스트 추가 (§3.3.1 REQ-025 영역).
- `navigator.clipboard.readText` / `write` stub 표준화 (현 코드베이스 미사용).
- 클립보드 권한 API (`navigator.permissions`) stub 표준화.

### 3.4 ESLint 회귀 차단 (FR-06, Should)
`.eslintrc.yml` 의 `rules` 섹션에 추가 (자매 REQ-018 라운드에 묶을 수 있음):

```yaml
rules:
  no-restricted-syntax:
    - error
    - selector: "CallExpression[callee.object.name='document'][callee.property.name='execCommand']"
      message: "Use navigator.clipboard.writeText instead (document.execCommand is deprecated)"
```

또는 `no-restricted-properties` 동등 패턴.

- 적용 후 `npm run lint` 0 violation.
- 자매 REQ-018 의 `eslint-plugin-jsx-a11y` 도입과 같은 PR 에 묶으면 ESLint 설정 충돌 최소화.

### 3.5 Legacy fallback (FR-07, Could / 범위 밖 기본)
- 보안 컨텍스트(`isSecureContext`) 미충족 시 textarea 기반 fallback 을 `copyToClipboardLegacy` 로 보존할지는 **§13 미결**. 현재로선 Clipboard API 로 충분 (Chrome ≥ 66, Edge ≥ 79, FF ≥ 63, Safari ≥ 13.1 에서 안정 지원, browserslist 충족).
- 보존 시 호출 규약: `copyToClipboard` 가 `false` 반환 시 호출자가 선택적으로 `copyToClipboardLegacy` 호출.

### 3.6 범위 밖 (Out-of-Scope)
- `navigator.clipboard.read()` 도입
- `navigator.permissions.query({name: 'clipboard-write'})` 사전 검사 UX
- iOS Safari 12 이전 버전 fallback (browserslist 이미 제외)
- 클립보드 외 `execCommand` 의 다른 명령

### 3.7 [WIP] 런타임 수동 스모크 체크리스트 (REQ-20260418-025 FR-06, US-04)
> 관련 요구사항: REQ-20260418-025 FR-06, US-04

자동 단위 테스트(jsdom) 는 `navigator.clipboard` mock 만 검증하고, 실제 브라우저의 `window.isSecureContext` / Permissions API / 사용자 제스처 요구 분기는 사람만 검증 가능. 본 spec 에 런타임 스모크 체크리스트를 신설한다.

**문서 위치 (잠정)**: `docs/testing/clipboard-runtime-smoke.md`
- 대안: `specs/` 하위 — planner 결정.

**픽스처 3종**:
1. **Writer 마크다운 템플릿 복사** — `src/Log/Writer.jsx:247`
2. **FileItem URL 복사** — `src/File/FileItem.jsx:54`
3. **ImageSelector 이미지 마크다운 복사** — `src/Image/ImageSelector.jsx:156`

**시나리오 (픽스처당)**:
- **성공 경로**: 정상 권한 부여 상태(HTTPS/localhost secure context) → 복사 트리거 → 외부 앱에 paste → 입력값 일치 + Toaster success 표시 (`divToasterSuccess` 등).
- **거부/미지원 경로**: DevTools Permissions panel 로 clipboard-write 거부 OR 시크릿 모드/HTTP insecure → 복사 트리거 → Toaster `divToasterError` 표시.

**baseline 수행 기록 섹션**: 운영자 / 일자 / 해시 (`git rev-parse HEAD`) / 브라우저+버전 / OS / secure context 여부 / 각 픽스처 결과 박제 (markdown-render-smoke 와 동일 형식, REQ-024 동일 세션 묶기 가능).

**회귀 시나리오 섹션**: 헬퍼 시그니처 변경 / 호출자 추가 / Toaster 타입 추가 / 권한 요청 UX 추가 시 재수행 트리거 명시.

검증:
- 6 시나리오(3 픽스처 × 2 경로) 모두 baseline `[x]` 또는 `[ ]` + 사유 기록.
- 런타임 코드 변경 0 (Phase 4 문서만).

---

## 4. 의존성

### 4.1 내부 의존
- `src/common/common.js` 의 `log(msg, level?)` 헬퍼 (ERROR 로그용)
- 호출자 4종 컴포넌트

### 4.2 외부 의존
- 브라우저 Clipboard API (`navigator.clipboard.writeText`)
- `window.isSecureContext` (HTTPS / localhost 에서 `true`)

### 4.3 역의존 (사용처)
- `src/Log/Writer.jsx` — 작성 중 콘텐츠 부분 복사
- `src/Log/LogItem.jsx` — 로그 항목 복사 액션
- `src/File/FileItem.jsx` — 파일명 / URL 복사
- `src/Image/ImageSelector.jsx` — 이미지 URL 복사

### 4.4 테스트 환경
- jsdom (vitest 기본) 은 `navigator.clipboard` 를 기본 제공하지 않음 → 공용 setup 또는 각 테스트에서 stub 필수.
- 권장: `src/setupTests.js` (존재 시) 에 `beforeEach` 로 기본 stub 추가. 특정 테스트가 실패/거부 시나리오 필요 시 `mockRejectedValueOnce` override.

---

## 5. 수용 기준 (Acceptance — REQ-20260418-022)
- [x] `src/common/common.js` 의 `copyToClipboard` 가 `navigator.clipboard.writeText` 사용 비동기 함수로 변경 (TSK-25, commit `4765eaf`)
- [x] 반환값이 `Promise<boolean>` (`true`/`false`) (TSK-25)
- [ ] 호출자 4종 (`Writer.jsx`, `LogItem.jsx`, `FileItem.jsx`, `ImageSelector.jsx`) 모두 `await` + 실패 분기 (최소 1곳에 사용자 피드백) — REQ-025 범위로 이동
- [ ] `grep -rn "document.execCommand" src/` → 0건 (production + test 코드 모두) — REQ-025 범위
- [ ] 테스트 8개 파일 모두 mock 갱신, `npm test` 100% 통과 — REQ-025 범위
- [ ] (FR-06, Should) `.eslintrc.yml` 에 `document.execCommand` 호출 금지 룰 활성화, `npm run lint` 0 violation
- [ ] 수동 검증: `npm run dev` → File 리스트 filename 복사 → 다른 앱에 붙여넣기 정상 — REQ-025 런타임 스모크 체크리스트로 대체
- [x] 보안 컨텍스트 미충족 / API 미지원 시 함수 `false` 반환 + 콘솔 ERROR 1회 (NFR-02) (TSK-25, 헬퍼 본체 catch 블록)

### 5.1 [WIP] 수용 기준 (REQ-20260418-025)
> 관련 요구사항: REQ-20260418-025 §10 Acceptance Criteria

- [ ] Writer/FileItem/ImageSelector 호출자 모두 `await copyToClipboard(...)` + 반환 boolean 분기 Toaster (FR-01~03)
- [ ] 호출자 테스트 4종에서 `document.execCommand` 참조 0건 (`grep -rn 'document.execCommand' src/` → 0) (FR-04)
- [ ] 호출자별 거부 분기 신규 테스트 ≥1건씩 PASS (FR-04)
- [ ] `docs/testing/clipboard-runtime-smoke.md` 추가 + baseline 1회 마감 commit (FR-06)
- [ ] error Toaster 표준 메시지 확정 (기본 "Copy failed (permission denied or unavailable).") (FR-07)
- [ ] `npm test` 전체 PASS, `npm run lint` PASS, `npm run build` 성공
- [ ] 운영자 수동 스모크 1회 (최소 Writer 성공 + Writer 거부) 결과가 baseline 섹션에 기록됨

---

## 6. 비기능 특성 (NFR Status)

| 항목 | 현재 | 목표 | 출처 |
|------|------|------|------|
| 호환성 (타깃 브라우저) | execCommand 점진 제거 트랙 | 모든 타깃 브라우저 정상 동작 | REQ NFR-01 |
| 보안 (실패 노출) | silent fallback | 반환 `false` + 사용자 알림 | REQ NFR-02 |
| 신뢰성 | `npm test` 100% (stub 8곳) | 100% (mock 갱신 후) | REQ NFR-03 |
| 유지보수성 | deprecated API 회귀 가능 | ESLint 룰로 차단 | REQ NFR-04 |

---

## 7. 테스트 현황 (Current Coverage)
- 기존 테스트 8곳이 `document.execCommand` 를 stub 함. 실제 헬퍼 동작은 stub 뒤에서 항상 no-op 으로 통과.
- **[WIP] 신규 테스트 요구**:
  - [ ] 성공 케이스: `navigator.clipboard.writeText` 호출 1회 + 반환 `true`
  - [ ] 실패 케이스 (rejection): 반환 `false` + `log("...", "ERROR")` 1회
  - [ ] API 미지원 케이스 (`navigator.clipboard` undefined): 반환 `false` + `log("...", "ERROR")` 1회
  - [ ] 호출자 대표 1건 (Writer 또는 FileItem): 실패 시 사용자 피드백 트리거 (mock Toaster)

---

## 8. 위험 / 알려진 제약
- 비동기 변경 → 호출자 race 가능. 모든 호출자 `await` 강제 + 테스트 (REQ §12 위험 1).
- jsdom 환경에서 `navigator.clipboard` 미정의 → 공용 stub 필수 (REQ §12 위험 2).
- 보안 컨텍스트 미충족 시 사용자 혼동 → 명시적 Toaster 메시지 (REQ NFR-02).
- ESLint 룰 selector 가 너무 광범위하면 false positive — `callee.object.name='document'` + `callee.property.name='execCommand'` 정확히 매칭 (REQ §12 위험 4).

---

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260418-clipboard-api-migration-execcommand-deprecation.md` (이동 후)
- 자매 REQ:
  - `specs/requirements/done/2026/04/18/20260418-eslint-jsx-a11y-plugin-adoption.md` (REQ-018, 같은 ESLint 라운드)
- 외부:
  - MDN `Document.execCommand`: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand (Deprecated)
  - MDN `Clipboard.writeText`: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
  - W3C Clipboard API: https://www.w3.org/TR/clipboard-apis/

---

## 10. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-18 | (pending, REQ-20260418-022) | `copyToClipboard` 헬퍼의 Clipboard API 마이그레이션 spec 초기화 (WIP) | all |
| 2026-04-18 | TSK-20260418-25 (merged, commit `4765eaf`) | 헬퍼 정의를 `async () => Promise<boolean>` 으로 마이그레이션 완료 | 2.1, 3.1 |
| 2026-04-18 | (pending, REQ-20260418-025) | 호출자 3종 `await` 도입 + 테스트 stub 정리 + 거부 분기 테스트 + 런타임 수동 스모크 baseline (WIP) | 3.2.1, 3.3.1, 3.7, 5.1 |
| 2026-04-18 | (pending, REQ-20260418-034) | §2.3 잔재 현황 갱신 (8건 → 3건 + α) + §3.3.2 전역 sweep 섹션 신설 (옵션 A/B 결정, Phase 1~4 로드맵, §3.3 FR-05 0건 마감) (WIP) | 2.3, 3.3.2 |
| 2026-04-18 | (pending, REQ-20260418-036) | §3.2.1 호출자별 성공 톤 정책 마감 (warning → success 통일) + §3.2.1.1 ImageSelector 1줄 변경 + 회귀 테스트 보정 + grep 차단 (WIP) | 3.2.1, 3.2.1.1 |
| 2026-04-20 | (inspector drift reconcile) | §3 헤더 rename: "(To-Be, WIP)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3 |
