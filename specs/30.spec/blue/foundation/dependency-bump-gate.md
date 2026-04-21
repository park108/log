# Dependency bump 결과 게이트 — 회귀 0 + 런타임 deprecated API 경고 0

> **위치**: `package.json`, `.github/workflows/*.yml`, 테스트 전 스위트
> **관련 요구사항**: REQ-20260421-035
> **최종 업데이트**: 2026-04-21 (by inspector, REQ-035 흡수 — followup (b) 갈래 발행)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=28bbf26).

## 역할

모든 `package.json` 의존성 bump (`dependencies` / `devDependencies`, minor · major 포함) 직후에 충족돼야 하는 **두 시스템 불변식** 한정 — (1) lint/test/build 3 스위트의 회귀 0 유지, (2) 테스트 실행 중 React 런타임-발 deprecated API 경고가 콘솔 채널 (`console.warn`/`console.error`) 에 0 회 매치. 본 spec 은 특정 의존성·특정 버전·특정 bump 이벤트에 귀속되지 않으며, 런타임 버전에도 무관하게 적용되는 결과 계약이다. React 런타임 자체의 bump 수행과 같은 운영성 작업은 본 spec 본문 외 (운영 task / 별 req) 에서 관리되며, 본 spec 은 **bump 후 충족돼야 하는 결과 게이트** 만 박제한다. 본 두 불변식은 `components/common.md` / `components/toaster.md` 의 React 계열 deprecated API 정적 미사용 NFR 과 **차원 분리** — 전자는 grep-time 정적 차원, 본 spec 은 런타임 경고 차원 (정적 미사용은 런타임 경고 0 의 필요조건이나 충분조건 아님).

## 기능 불변식

### FR-01 — 의존성 bump 회귀 0 게이트

`package.json` 의 `dependencies` 또는 `devDependencies` 단일/복수 항목의 버전 필드를 bump (minor · major 포함) 한 직후, 다음 4 명령은 bump 이전 baseline 대비 회귀 0 을 만족한다.

```
npm ci
npm run lint
npm test -- --run
npm run build
```

구체적으로:

- **lint error 수 회귀 0** — `npm run lint` 의 error 수가 bump 이전 baseline 이하로 유지 (증가 없음).
- **test 실패 수 회귀 0** — bump 이전 baseline 이 N PASS / 0 FAIL 이면 bump 이후도 ≥ N PASS + 0 FAIL. PASS 수 감소 + FAIL ≥ 1 은 본 불변식 위반.
- **build exit code = 0** — `npm run build` 가 0 으로 종료.

본 불변식은 특정 의존성이나 특정 버전에 귀속되지 않으며 모든 dep bump 에 적용되는 결과 게이트이다.

### FR-02 — React 런타임 deprecated API 경고 0 게이트

`npm test -- --run` 실행 중 `console.error` / `console.warn` 채널로 발행된 메시지에 React 런타임-발 deprecated API 경고 — 다음 패턴의 정규식 union — 은 0 회 매치한다.

```
/findDOMNode is deprecated|Warning: .* deprecated.*(defaultProps|string ref|legacy context|findDOMNode)|Warning: Use of the deprecated.*string ref|Warning: Support for defaultProps will be removed from function components|Warning: Legacy context API has been detected/i
```

본 불변식은 React 런타임 버전에 무관 (React 17/18/19 공통 게이트) 하게 적용된다. 기존 `specs/30.spec/blue/components/common.md` / `specs/30.spec/blue/components/toaster.md` 의 React 계열 deprecated API 미사용 NFR 은 **grep-time 정적 차원** 이고, 본 불변식은 **런타임 콘솔 경고 차원** 으로 분리된다 (정적 미사용이 런타임 경고 0 의 필요조건이나 충분조건은 아님 — 예: 타사 라이브러리가 소스에 잔존해 런타임 경고를 유발하는 경우).

## 스코프 규칙

- **expansion**: 불허 — 본 spec 의 불변식 적용 범위는 `package.json` 의존성 bump 직후의 4 명령 결과 + 테스트 실행 중 console 채널 매치. 신규 워크플로 / 신규 lint 룰 추가 시 본 불변식을 자동 계승하며 별 spec 불필요. CI 자동화 (워크플로 grep step 추가) 는 별 req / 운영 task.
- **grep-baseline** (REQ-035 FR-03 재실행, HEAD=28bbf26 실측):

  (a) **FR-01 측 — `package.json` 필드 존재** — `grep -nE "\"(dependencies|devDependencies)\":" package.json` → 2 hits in 1 file:
  - `package.json:6` `"dependencies": {`
  - `package.json:42` `"devDependencies": {`

  (b) **FR-02 측 — React 계열 deprecated API 소스 정적 0 hit** (기존 `components/common.md` grep-time 불변식 재검증) — `grep -rnE "findDOMNode|\"ref\":\s*['\"][^'\"]+['\"]|defaultProps\s*=\s*\{" src --include="*.js" --include="*.jsx" --exclude="*.test.*"` → **0 hit** (exit 1 = no match → PASS).

  (c) **FR-02 측 — 런타임 경고 채널 현황** — `grep -nE "console\.(warn|error)" src/setupTests.js` → **0 hit**. 본 spec 발행 시점 `src/setupTests.js` 에는 console 후킹이 부재. 본 부재 자체는 FR-02 위반이 아니며 (FR-02 는 런타임 결과만 박제), 후킹 도입은 FR-02 의 자동 검증 수단으로 별 req / 별 task 에서 관리.

- **rationale**: gate (a) 는 FR-01 의 대상 식별 (dep bump 지점) 확인. gate (b) 는 FR-02 의 grep-time 차원 재검증 — 본 게이트 값이 0 을 벗어나면 정적 차원 박제 자체가 회귀. gate (c) 는 FR-02 의 런타임 차원 검증 수단의 현황 — 본 spec 은 결과만 박제하므로 수단 부재가 불변식 위반이 아님을 명시.

## 의존성

- 내부: `package.json` (`dependencies`, `devDependencies`), `src/**/*.test.{js,jsx}` 전체, `src/setupTests.js`.
- 외부: npm, `vitest`, `@testing-library/react`, React 런타임 (`react`, `react-dom`). React 공식 문서의 deprecated API 경고 문자열.
- 역의존: `.github/workflows/ci.yml` 의 lint/test/build 단계 (본 불변식 위반 시 CI fail 기대).

## 테스트 현황

- [x] `.github/workflows/ci.yml` — lint/test/build 3 단계가 CI 에서 실행됨 (현 시점 `npm ci` + `npm run lint && npm test -- --run && npm run build` 파이프라인). FR-01 측 수단 확보.
- [x] `package.json` — `dependencies` (1 hit @ line 6) + `devDependencies` (1 hit @ line 42) 필드 존재 (§스코프 규칙 gate (a)).
- [x] `src/**/*.jsx` — findDOMNode / 문자열 ref / functional component `defaultProps` 정적 grep 0 hit (§스코프 규칙 gate (b)).
- [x] FR-02 의 정규식 union 패턴은 React 공식 문서 (deprecated API 경고 문자열) 와 `docs/react-19-audit.md:1-40` 사전 감사 스냅샷에 근거.

## 수용 기준

- [x] (Must, FR-01) 본 spec §기능 불변식 FR-01 에 `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build` 4 명령이 평서형 선언. "회귀 0", "lint error", "test 실패" 키워드 박제.
- [x] (Must, FR-02) 본 spec §기능 불변식 FR-02 에 `findDOMNode`, `defaultProps`, `string ref`, `legacy context`, `console.warn`, `console.error` 키워드 박제. 정규식 union 패턴 박제.
- [x] (Must, FR-03) §스코프 규칙 grep-baseline 에 3 gate (a)(b)(c) 실측 수치 + `파일:라인` 박제.
- [x] (Must, FR-04) 본 spec §역할 + FR-02 본문에 "grep-time 정적 차원" vs "런타임 경고 차원" 분리 명시.
- [x] (Must, FR-05) §변경 이력 에 REQ-20260421-035 + consumed followup + 원 blocked req 경로 + 선행 done req (`20260420-upgrade-react-19.md` archive) 참조 박제. §참고 에 `docs/react-19-audit.md:1-40` 교차 참조.
- [x] (Should, FR-06) §역할 말미 + §참고 하단에 "React 런타임 bump 자체는 본 spec 본문 외 (운영 task / 별 req) 에서 관리" 경계 1문장 박제.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 28bbf26 (REQ-20260421-035 흡수) | 최초 등록. `/revisit` 이 복원한 `react-19-runtime-bump-reattempt` followup 의 (b) 갈래 — 원 REQ-20260421-031 에서 RULE-07 반려된 1회성 마이그레이션 FR 를 제외하고, "의존성 bump 후 회귀 0 유지" (FR-04 류) + "런타임 deprecated API 경고 0" (FR-07 류) 두 축을 spec-grade 불변식으로 추출 — 을 foundation 레이어 spec 으로 박제. blue 부재 → green 신규. RULE-07 자기검증: 본문은 (a) FR-01 회귀 0 게이트 4 명령 + 3 측정 지표 평서형 선언, (b) FR-02 런타임 경고 0 정규식 union 평서형 선언, (c) grep-time vs 런타임 차원 분리 명시, (d) §스코프 규칙 3 gate 실측 수치 박제 (2 hits / 0 hit / 0 hit), (e) `docs/react-19-audit.md:1-40` 교차 참조, (f) 운영 task 경계 박제 — 시스템 불변식·계약 한정. 1회성 진단/incident patch 플랜 부재, 특정 React 런타임 버전·특정 bump 이벤트 귀속 없음. followup (a) 갈래 (React 18→19 런타임 bump 운영 task) 는 본 spec Out-of-Scope — 별 경로. consumed followup `specs/10.followups/20260421-0731-react-19-runtime-bump-reattempt-from-blocked.md`. 원 blocked req `specs/50.blocked/req/20260421-react-19-runtime-bump-reattempt.md` (이미 삭제, followup 내 history 박제). 선행 done req `specs/60.done/2026/04/20/req/20260420-upgrade-react-19.md` (archive 상태 — 본 spec 은 그 rollback/재개가 아닌 결과 게이트 박제). | 신설 전 섹션 |

## 참고

- **발행 근거 REQ**: `specs/60.done/2026/04/21/req/20260421-dependency-bump-regression-gate-and-react-runtime-warning-invariant.md` (REQ-20260421-035).
- **Consumed followup**: `specs/10.followups/20260421-0731-react-19-runtime-bump-reattempt-from-blocked.md` (discovery 영역 `60.done/followups/` mv 대상).
- **원 blocked req (이미 삭제, followup 에 history 박제)**: `specs/50.blocked/req/20260421-react-19-runtime-bump-reattempt.md`.
- **선행 done req**:
  - `specs/60.done/2026/04/20/req/20260420-upgrade-react-19.md` — archive 상태. 본 spec 은 그 rollback/재개가 아닌 결과 게이트 박제.
- **기존 박제 (차원 분리 대상 — 본 spec 은 중복 박제 금지)**:
  - `specs/30.spec/blue/components/common.md:178` — grep-time deprecated API 미사용 NFR (정적 차원).
  - `specs/30.spec/blue/components/toaster.md:50` — grep-time deprecated API 경고 0 NFR (정적 차원).
  - `specs/30.spec/blue/common/test-idioms.md:64-80` — 테스트 이디엄 positive/negative grep baseline (FR-09 축 — 본 spec 에서 중복 박제 금지).
- **사전 감사**:
  - `docs/react-19-audit.md:1-40` — `forwardRef` / Legacy ReactDOM API / `defaultProps` / `prop-types` grep-time 감사 스냅샷. 본 spec FR-02 의 grep-time 측면 baseline 근거.
- **런타임 진입점 (참조용)**:
  - `src/index.jsx:9-10` — `createRoot` + `StrictMode`.
- **외부 근거**:
  - React 공식 문서 — deprecated API 경고 문자열 (`findDOMNode is deprecated`, `Warning: Support for defaultProps will be removed from function components`, `Warning: Use of the deprecated string ref`, `Warning: Legacy context API has been detected`).
- **운영 task 경계**: React 런타임 bump 및 동급 운영성 작업은 본 spec 본문 외 (운영 task / 별 req) 에서 관리되며, 본 spec 은 **모든 dep bump 후 충족돼야 하는 결과 게이트** 만 박제. followup (a) 갈래 (React 18→19 런타임 bump 운영 task 발행) 는 본 spec Out-of-Scope.
- **RULE 준수**:
  - RULE-01 (inspector writer `30.spec/green/**` 만 — 본 세션 diff = `30.spec/green/foundation/dependency-bump-gate.md` 신설 + `20.req/*` → `60.done/req/` mv).
  - RULE-02 (writer 경계 — `src/**` / `package.json` / `.github/workflows/**` / `docs/**` 변경 부재).
  - RULE-05 (blocked → followup → discovery → req → inspector 정식 경로).
  - RULE-07 (spec 본문 = 시스템 불변식·계약 한정, 1회성 patch 배제; 특정 React 메이저 숫자 본문 부재).
  - RULE-06 (§스코프 규칙 grep-baseline 실측 수치 + `파일:라인` + 3 gate 의미 명시).
