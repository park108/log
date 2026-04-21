# href/URL 어설션 의도 기반 재설계 (env 전제 분리)

> **위치**: `src/common/Navigation.test.jsx` (38 인근), `src/Log/LogItemInfo.test.jsx` (46-51), 후보 Footer/Copyright/setHtmlTitle 호출 테스트, `src/test-utils/` (env stub 헬퍼 후보)
> **관련 요구사항**: REQ-20260420-009
> **최종 업데이트**: 2026-04-20 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20, HEAD=3f9e590).

## 역할
`getUrl()` / `setHtmlTitle()` 등 env-dependent URL 헬퍼를 렌더 경로에 소비하는 테스트가 현재 vitest 기본 `import.meta.env.MODE === 'test'` (DEV=false, PROD=false) 에서 **`getUrl()` 이 undefined 를 반환하는 우연한 경로** 에 의존해 `<a></a>` 스냅샷 동등성을 검증한다. TSK-20260420-36 (node-env-helper 런타임 치환) 재발행 시 `isDev()/isProd()` 가 정상 분기를 타면 기본값이 바뀌어 회귀한다. 본 spec 은 어설션을 **의도 기반 (intent-based query) 또는 env stub 명시** 중 단일 이디엄으로 재설계해 env 전제와 치환 경로를 분리한다. 런타임 소스 (common.js 의 `getUrl()` 반환 경로, env.js 의 `isDev/isProd`) 수정은 본 spec 범위 밖 (TSK-20260420-36 관할).

## 공개 인터페이스
- **선택 이디엄 1종** (planner 가 spec 승격 시점에 고정):
  - **A (권장)**: intent-based query — `screen.getByRole('link', { name: 'park108.net' }).getAttribute('href')` → `null | /^http/` 중 의도에 맞는 단언. 스냅샷 대신 attribute 존재·형식 검증.
  - **B**: env stub 명시 — `beforeEach(() => { vi.stubEnv('MODE', 'test'); vi.stubEnv('DEV', false); vi.stubEnv('PROD', false); })`. 기존 스냅샷 유지 가능하나 test 환경 전제를 파일에 박제.
- **공통 헬퍼 (Should, 이디엄 B 선택 시)**: `src/test-utils/env.js` (신규) 또는 `src/setupTests.js` 에 `stubEnvMode(mode)` / `stubTestEnv()` 유틸 export. `Navigation.test.jsx` 외 Footer/Copyright/setHtmlTitle 테스트가 소비.
- **대상 파일**:
  - `src/common/Navigation.test.jsx:38` — `toStrictEqual(<a></a>)` 경로.
  - `src/Log/LogItemInfo.test.jsx:46-51` — `previousNodeEnv` 백업·복원 패턴으로 이미 우회 중 (REQ-20260420-005 / env-test-stub 어댑테이션 범위와 중첩). 본 spec 에서는 **getUrl() 렌더 assert 경로에 한해** 점검.
  - Footer/Copyright/setHtmlTitle `<head>` 반영 테스트 — `grep -rn "getUrl\b" src --include="*.test.*"` 결과 기준 전수 점검.

## 동작
1. `grep -rn "getUrl\b" src --include="*.test.*"` 로 모든 test 소비처 열거 (baseline 아래 참조). 각 소비처가 intent-based query 또는 env stub 중 어느 이디엄 적용 대상인지 분류.
2. 선택된 이디엄 1종을 전수 적용. 이디엄 A 선택 시 `toStrictEqual(<a></a>)` → `expect(link.getAttribute('href')).toBeNull()` 또는 `expect(link.getAttribute('href')).toMatch(/^http/)` 등 의도 표현으로 전환. 이디엄 B 선택 시 각 대상 파일 `beforeEach` 에 `vi.stubEnv('DEV', false); vi.stubEnv('PROD', false);` 박제.
3. `src/setupTests.js` 의 전역 `afterEach(() => vi.unstubAllEnvs())` 가 이미 존재하므로 추가 teardown 불필요 (중복 스탭 금지).
4. React 18.x baseline 에서 `npm test` — 46 files / 368 tests 전원 green 유지.
5. TSK-20260420-36 재적용 시나리오 검증 (선결):
   - 일시적으로 `src/common/common.js` 의 `getUrl()` 을 `process.env.NODE_ENV` → `isProd()/isDev()` 로 치환 (로컬 branch, 커밋 금지) 하거나, `vi.stubEnv('DEV', true)` 로 `isDev()` 를 활성화해 렌더 경로가 `"http://localhost:3000/"` 를 반환하는 상황을 시뮬레이트 → 본 spec 수정 후 테스트 green 유지.
   - 실측 결과를 `result.md` 에 "TSK-36 선결 시나리오 PASS" 로 박제.
6. `npm run lint` 0 warn / 0 error.

### Baseline (2026-04-20, HEAD=3f9e590)
- `grep -rn "getUrl\b" src --include="*.{js,jsx}"` non-test 소비처:
  - `src/App.jsx:77` — `<a href={common.getUrl()}>park108.net</a>`.
  - `src/common/Navigation.jsx:39` — `<a href={getUrl()}>park108.net</a>`.
  - `src/common/common.js:67` — export 정의.
  - `src/common/common.js:357` — `log(...)` payload `url` 필드.
  - `src/Log/LogItemInfo.jsx:34, 43, 47` — copy link · href · 표시용 URL.
- `grep -rn "getUrl\b" src --include="*.test.*"` test 소비처:
  - `src/common/common.test.js:100, 101, 106, 107` — `getUrl()` 반환값 자체 단위 테스트 (env stub 어댑테이션 REQ-005 범위, 본 spec 중복 금지).
  - `src/common/Navigation.test.jsx:13` — 주석 (REQ-20260420-002 / TSK-20260420-37 §C 참조).
  - `src/Log/LogItemInfo.test.jsx:50` — 주석 ("`getUrl()` 은 `isProd()/isDev()` 가 true 일 때만 URL 을 반환").
- `src/common/Navigation.test.jsx:38` — `toStrictEqual(<a></a>)` (현재 `getUrl()` undefined 우연 의존).
- React 18 + vitest 환경 `MODE='test'`: `isDev() === false && isProd() === false` → `getUrl()` return undefined → `<a href={undefined}>` → DOM `<a>` (href attribute 생략).
- 렌더 경로에서 `getUrl()` 소비 컴포넌트: `App.jsx`, `Navigation.jsx`, `LogItemInfo.jsx`. 이들의 test 파일이 1차 감사 대상.

## 의존성
- 내부: `src/common/Navigation.test.jsx`, `src/common/Navigation.jsx`, `src/Log/LogItemInfo.test.jsx`, `src/Log/LogItemInfo.jsx`, `src/common/common.js:65-72` (`getUrl()`), `src/common/env.js:6-7` (`isDev/isProd`), `src/setupTests.js:35-37` (`afterEach unstubAllEnvs`), (선택) `src/test-utils/env.js` 신규.
- 외부: `vitest` (`vi.stubEnv`, `vi.unstubAllEnvs`), `@testing-library/react` (`screen.getByRole`, `link.getAttribute`).
- 역의존: `specs/50.blocked/task/TSK-20260420-36-*` 재발행 시 본 spec 완료가 선결. REQ-20260420-005 (env-test-stub adaptation) 와 test 파일 스코프 일부 중첩 (`LogItemInfo.test.jsx`, `common.test.js`) 이나 본 spec 은 **렌더 경로 href assertion 한정**이라 중복 없음.

## 테스트 현황
- [x] React 18.x `npm test` — 46 files / 368 tests green (HEAD=3f9e590).
- [x] `Navigation.test.jsx:38` 현 HEAD green (우연 경로 의존).
- [x] 이디엄 전환 후 React 18 baseline green 유지 (FR-01, FR-02) — afe109e / 46/370 green.
- [x] `isDev()` true 시뮬레이트 시에도 green (NFR-03, 치환 경로 선결 검증) — `stubMode('development')` 실측 green.
- [x] `npm run lint` 0 warn / 0 error.

## 수용 기준
- [x] (Must) `src/common/Navigation.test.jsx` href assertion 이 intent-based query (`getByRole('link').getAttribute('href')`) 또는 env stub 명시 (`vi.stubEnv('DEV', false); vi.stubEnv('PROD', false);` in `beforeEach`) 중 1종 이디엄으로 전환.
- [x] (Must) `grep -rn "getUrl\b" src --include="*.{jsx,js}" | grep -v "\.test\." | grep -v "common\.js:" | awk -F: '{print $1}' | sort -u` 결과 각 컴포넌트의 렌더 소비처에 대응하는 test 파일 (`Navigation.test.jsx`, `LogItemInfo.test.jsx` 등) 이 동일 이디엄 적용 완료.
- [x] (Must) React 18.x `npm test` — 46 files / 368 tests 전원 green + flake 0.
- [x] (Must) 치환 경로 선결 검증 — `vi.stubEnv('DEV', true)` 로 `isDev()` 활성화한 시뮬레이션 또는 로컬 `getUrl()` 치환 시 본 spec 수정 테스트 전원 green. 결과를 `result.md` 에 박제.
- [x] (Must) `npm run lint` 0 warn / 0 error.
- [x] (Should) 선택 이디엄 A/B 중 파일 전반 단일 적용 (혼용 금지) — 이디엄 A (intent-based) 고정.
- [x] (Should) 이디엄 B 선택 시 공통 헬퍼 (`src/test-utils/env.js::stubTestEnv()` 또는 `src/setupTests.js` 주석 가이드) 로 중복 선언 2회 이내 제한 — A 채택으로 B 제약 N/A.
- [x] (NFR) `src/**` 런타임 파일 수정 0건 (test 파일·test-utils 한정).
- [x] (NFR) `grep -rn "process.env.NODE_ENV\|import.meta.env.DEV\|import.meta.env.PROD" src --include="*.test.*"` 추가 증가 0 hits (본 spec 수정으로 선언이 증가해도 assertion 경로에 잔존하지 않아야 함 — env stub 선언은 `beforeEach` 내부만 허용, 판정은 `vi.stubEnv` 호출 라인 수로 측정).
- [x] (NFR) 회귀 안전 — REQ-20260420-005 (env-test-stub adaptation) 와 충돌 없음. 본 spec 수정이 `previousNodeEnv` 백업·복원 패턴을 새로 도입하지 않음 (RULE-06 grep baseline 참조).

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `grep -rn "getUrl\b" src --include="*.test.*"` → 6 hits in 3 files:
    - `src/common/common.test.js:100, 101, 106, 107` (단위 테스트 — REQ-005 범위)
    - `src/common/Navigation.test.jsx:13` (주석)
    - `src/Log/LogItemInfo.test.jsx:50` (주석)
  - `grep -rn "getUrl\b" src --include="*.jsx" --include="*.js"` non-test → 7 hits in 5 files:
    - `src/App.jsx:77`
    - `src/common/Navigation.jsx:39`
    - `src/common/common.js:67, 357`
    - `src/Log/LogItemInfo.jsx:34, 43, 47`
  - `grep -n "toStrictEqual" src/common/Navigation.test.jsx` → 확인 대상 (기대 ≥1, 이디엄 A 선택 시 0으로 감소 가능).
- **rationale**: 런타임 소스 (`src/common/common.js`, `src/common/env.js`, `src/common/Navigation.jsx`, `src/Log/LogItemInfo.jsx`, `src/App.jsx`) 는 본 spec 수정 범위 밖 — `getUrl()` 반환 경로 치환은 TSK-20260420-36 / REQ-20260420-002 관할. `src/common/common.test.js` 의 `getUrl()` 단위 테스트는 REQ-20260420-005 (env-test-stub adaptation) 에서 다루므로 본 spec 은 **렌더 경로 href assertion 한정**. env stub 자체의 이디엄은 REQ-005 가 주관, 본 spec 은 그 산출 이디엄을 소비. MSW·fake-timer 축과 무관. grep 게이트는 `*.test.*` 한정이며 render-path href assertion 전환 목적의 런타임 파일 편집 금지.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-009 반영) | all |
| 2026-04-21 | TSK-20260420-40 / afe109e | Navigation.test.jsx `:52` `toStrictEqual` 1건을 intent-based (anchor 존재 + `href===null \|\| /^https?:\/\//`) 2건으로 재설계 — env 전제와 assertion 의도 분리. `document.createElement("a")` 스캐폴딩 2줄 제거, 변수명 `html→link`. 46/370 green × 3회, lint clean, `stubMode('development')` 선결 시나리오 PASS. 8개 Must + 2개 Should + 3개 NFR 전원 `[x]`. | 테스트 현황·수용 기준 |
