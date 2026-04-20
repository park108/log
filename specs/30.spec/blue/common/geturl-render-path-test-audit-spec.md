# getUrl() 렌더 경로 테스트 감사 — stubMode 누락 탐지 및 가드

> **위치**: `src/App.jsx:77` (렌더 소비), `src/App.test.jsx` (대응 테스트 감사), `src/common/Navigation.jsx:39` (가드 완료 참조), `src/Log/LogItemInfo.jsx:34, 43, 47` (가드 완료 참조), `src/common/common.js:357` (간접 `userAgentParser` 경유), 후보 `Footer/Copyright`
> **관련 요구사항**: REQ-20260421-003
> **최종 업데이트**: 2026-04-21 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=afe109e).

## 역할
TSK-20260420-37 이후 `getUrl()` 런타임이 `process.env.NODE_ENV` → `isDev()/isProd()` (= `import.meta.env.DEV/PROD`) 로 전환되어 vitest 기본 `import.meta.env.DEV=true` 에서 `getUrl()` 이 `http://localhost:3000/` 를 기본 반환한다. `Navigation.test.jsx`, `LogItemInfo.test.jsx` 는 각각 `stubMode('test')` / `stubMode('production')` 로 가드되었고 `common.test.js` 는 단위 테스트 층에서 가드 완료이나, `App.jsx:77` 렌더 경로 (`App.test.jsx` 3 hit) 는 `stubMode` 미명시 상태이다. 본 spec 은 `getUrl()` / `userAgentParser()` 직·간접 사용처를 전수 감사해 DOM/snapshot assertion 대상의 `stubMode` 명시 유무를 교차검증하고, 누락 지점에 TSK-37 승계 이디엄 (describe-scoped `beforeEach(() => stubMode('test'|'production'|'development'))`) 을 적용한다. 런타임 소스 수정, `isDev()/isProd()` 분기 자체 변경, stub 이디엄 자체 변경 (REQ-005 관할), 신규 테스트 케이스 추가는 본 spec 밖.

## 공개 인터페이스
- **감사 산출물 (FR-01, Must)**: `grep -rn "getUrl()\|userAgentParser(" src/` 결과를 파일:라인 · 렌더/비렌더 · 대응 test 파일 · stubMode 명시 유무 4열 표로 result.md 에 박제.
- **가드 패턴 (FR-02, Must)**: 렌더 경로 + stubMode 누락 항목 각각에 `describe`-scoped `beforeEach(() => stubMode('test'))` 추가. 특정 분기 검증이 목적이면 `it` 내부 `stubMode('production' | 'development' | 'test')`. 이디엄은 `src/common/Navigation.test.jsx:19-26` 이 정본.
- **stubMode 헬퍼 (Should, FR-03)**: 파일 내부에 TSK-37 의 2줄 스캐폴딩 (`const stubMode = (mode) => { vi.stubEnv('MODE', mode); vi.stubEnv('DEV', mode === 'development'); vi.stubEnv('PROD', mode === 'production'); }`) 재사용. `src/test-utils/env.js` 공통화는 Could (현 범위에서 생략 권장, REQ-005 관할).
- **주석 박제 (Should, FR-03)**: 추가된 가드마다 "REQ-20260421-003" 참조 주석 1줄. 기존 `Navigation.test.jsx:13` 주석 형식 승계.

## 동작
1. (FR-01) `grep -rn "getUrl()\|userAgentParser(" src/` 실측 (현 HEAD = afe109e, baseline 섹션 참조) → 각 사용처의 렌더/비렌더 분류 + 대응 test 파일 매핑.
2. (FR-02) 표에서 "렌더 경로 + stubMode 누락" 항목 발견 시 describe-scoped `beforeEach` 가드 추가:
   - `src/App.test.jsx` (`:36, :317, :376` `findByText('park108.net')` — `App.jsx:77` 렌더 경로) 에 `stubMode` 헬퍼 + `beforeEach(() => stubMode('test'))` 박제. 기존 스위트가 `MODE='test'` 묵시 전제로 green 이므로 test 모드 가드가 회귀 위험 최저.
   - 기타 후보 (Footer/Copyright 등 SEO/메타) 는 현 baseline 에서 `getUrl()` 직접 소비 0 hit 이라 가드 불필요. FR-04 재현 0 판정으로 종결 허용.
3. (FR-03) 추가된 가드 주변에 "REQ-20260421-003" 참조 주석 1줄. 기존 `Navigation.test.jsx:13-18` 블록 주석 형식 승계.
4. (FR-04, Could) 사용처 중 렌더 경로가 이미 가드되었거나 비-렌더 (unit / side-effect) 인 경우 "가드 불필요" 로 판정하고 result.md 에 근거 박제 후 종료 허용.
5. `npm test` → 46 files / 370 tests green 유지, `npm run lint` 0 warn/error.

### Baseline (2026-04-21, HEAD=afe109e)
- `grep -rn "getUrl()\|userAgentParser(" src --include="*.{js,jsx}"` 전 사용처:
  - 런타임 (non-test):
    - `src/App.jsx:77` — `<a href={common.getUrl()}>park108.net</a>` (렌더 경로).
    - `src/Log/LogItemInfo.jsx:34, 43, 47` — `getUrl() + "log/" + timestamp` (렌더 경로, 다중).
    - `src/common/Navigation.jsx:39` — `<a href={getUrl()}>park108.net</a>` (렌더 경로).
    - `src/common/common.js:357` — `url: getUrl()` (log() payload, side-effect).
    - `src/index.jsx:33` — `userAgentParser()` (reportWebVitals payload, side-effect).
    - `src/common/common.js` 내부 `userAgentParser` 정의 (baseline 섹션 범위 밖, REQ-005 관할).
  - 테스트 (직·간접 호출):
    - `src/common/common.test.js:100, 106` — `common.getUrl()` 단위 테스트 (stubMode 명시 `:99, :105`; REQ-005 관할, 본 spec 중복 금지).
    - `src/common/common.test.js:474, 481, 495, 511, 527, 543, 559, 575, 591, 607, 618, 629` — `common.userAgentParser()` 단위 테스트 (stubMode 명시 `:473, :480`; 이후 describe 내부 `beforeEach` 상속 확인).
    - `src/Log/LogItemInfo.test.jsx:50` — 주석 (렌더 경로 가드 완료 `stubMode('production')` `:53`).
    - `src/common/Navigation.test.jsx:13` — 주석 (렌더 경로 가드 완료 `beforeEach(() => stubMode('test'))` `:26`).
- 대응 테스트 미가드 후보:
  - `src/App.test.jsx` — `App.jsx:77` 렌더 경로 대응. `grep -n "findByText\|park108\.net" src/App.test.jsx` → `:36, :317, :376` 3건 `findByText('park108.net')`. 현재 `stubMode` 헬퍼 및 `beforeEach` 미설치. 현 HEAD green 이유: vitest 기본 `MODE='test'` → `isDev()=false && isProd()=false` → `getUrl()` undefined → `<a href>` 문자열 미포함이나 텍스트 매칭 기반 assertion 으로 통과.
- 현 HEAD `npm test` 46 files / 370 tests green (afe109e).

## 의존성
- 내부: `src/App.test.jsx` (가드 후보), `src/App.jsx:77` (렌더 경로, 불변), `src/common/Navigation.test.jsx:13-26` (가드 이디엄 참조 정본), `src/Log/LogItemInfo.test.jsx:7-10, :50-53` (승계 참조), `src/common/common.test.js:6-8` (stubMode 헬퍼 정본).
- 외부: `vitest` (`vi.stubEnv`, `vi.unstubAllEnvs`), `@testing-library/react` (`screen.findByText`).
- 역의존: REQ-20260420-002 (node-env 런타임 치환) 완료 선행, REQ-20260420-005 (env-test-stub 이디엄) 이 stubMode 정본 관할. 본 spec 은 그 이디엄을 렌더 경로 테스트로 확산. `src/setupTests.js:7-23` 전역 env stub 주석 블록 불변.

## 테스트 현황
- [x] 현 HEAD `npm test` 46 files / 370 tests green (afe109e).
- [x] `Navigation.test.jsx` / `LogItemInfo.test.jsx` 가드 완료 확인 (TSK-37 / TSK-40).
- [x] `App.test.jsx` stubMode 가드 추가 후 green 유지 (FR-02) — TSK-44 / 96c37df.
- [x] 감사 결과 표 박제 (FR-01) + 재현 0 판정 or 가드 N건 박제 (FR-04) — TSK-44 result.md 4열 표.
- [x] `npm run lint` 0 warn / 0 error — TSK-44 실측.

## 수용 기준
- [x] (Must) `grep -rn "getUrl()\|userAgentParser(" src/` 결과를 파일:라인 · 렌더/비렌더 · 대응 test 파일 · stubMode 명시 유무 4열 표로 result.md 에 박제.
- [x] (Must) 표에서 "렌더 경로 + stubMode 누락" 항목 각각에 describe-scoped `beforeEach(() => stubMode('test'))` 또는 `it` 내부 stubMode 가드 추가. 현 baseline 에서 최소 `src/App.test.jsx` 1건.
- [x] (Should) 가드 패턴은 TSK-37 이디엄 승계 — `src/common/Navigation.test.jsx:13-26` 정본. 주석에 "REQ-20260421-003" 박제.
- [x] (Could) 재현 0건 확인 시 "감사 완료, 가드 불필요" 판정 + 근거 result.md 박제 후 종료 허용.
- [x] (Must) `npm test` 46 files / 369 tests green (spec 기재 370 은 TSK-42 가 `[A]/[B]` 2 it → 1 it 통합으로 -1; TSK-44 실측 369 박제).
- [x] (Must) `npm run lint` 0 warn / 0 error.
- [x] (NFR) 수정 파일 ≤ 5 (test 파일 한정). `src/**/*.{js,jsx}` 중 `*.test.*` 제외 런타임 0건 수정 — TSK-44 실측 1 파일 (App.test.jsx).
- [x] (NFR) 신규 테스트 케이스 추가 0 (가드 누락만 보강).
- [x] (NFR) env stub 이디엄 자체 변경 0 — REQ-20260420-005 관할 유지.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=afe109e):
  - `grep -rn "getUrl()" src --include="*.{js,jsx}"` → 6 hits in 5 files: `src/App.jsx:77`, `src/Log/LogItemInfo.jsx:34, 43, 47`, `src/common/Navigation.jsx:39`, `src/common/common.js:357`.
  - `grep -rn "userAgentParser(" src --include="*.{js,jsx}"` → 14 hits in 2 files: `src/index.jsx:33`, `src/common/common.test.js:474, 481, 495, 511, 527, 543, 559, 575, 591, 607, 618, 629` + 정의 (`src/common/common.js` 내부).
  - `grep -n "stubMode\|vi\.stubEnv('MODE'" src/App.test.jsx` → 0 hits (미가드).
  - `grep -n "stubMode" src/common/Navigation.test.jsx` → 기 존재 (가드 완료 참조).
  - `grep -n "findByText.*park108\|getByText.*park108" src/App.test.jsx` → 3 hits at `:36, :317, :376` (가드 대상 예상).
- **rationale**: 런타임 소스 (`src/App.jsx`, `src/common/Navigation.jsx`, `src/Log/LogItemInfo.jsx`, `src/common/common.js`, `src/common/env.js`, `src/index.jsx`) 는 본 spec 수정 범위 밖. `isDev()/isProd()` 분기 로직은 REQ-005 / TSK-37 관할. `src/common/common.test.js` 의 `getUrl() / userAgentParser()` 단위 테스트는 이미 stubMode 가드 완료 (REQ-005 범위), 본 spec 중복 금지. MSW 수명주기 · fake-timer teardown 은 REQ-004 / REQ-007 / REQ-20260421-001 관할, 본 spec 과 중복 없음. 신규 `it` 추가 금지 (기존 가드 누락만 보강).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-003 반영; TSK-20260420-37 이후 렌더 경로 감사 필요성 정식화 — App.test.jsx 가드 누락 baseline 박제) | all |
| 2026-04-21 | TSK-20260421-44 / 96c37df | 전 Must/Should/Could/NFR 기준 충족으로 DoD 전원 flip. `src/App.test.jsx` stubMode 2줄 헬퍼 + `beforeEach(() => stubMode('test'))` + `afterEach(() => vi.unstubAllEnvs())` 박제 (14+/0-), 감사 4열 표 result.md, `npm test` 46/369 green, lint 0/0. 런타임 0 수정. | 테스트 현황·수용 기준 |
