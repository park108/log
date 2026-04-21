# react-hooks 린트 게이트 (eslint-plugin-react-hooks 채택) — 정적 검출 불변식

> **위치**: `package.json` (devDependencies), `eslint.config.js` (flat config).
> **관련 요구사항**: REQ-20260422-049
> **최종 업데이트**: 2026-04-22 (by inspector, 신규 등록)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=73bb995).

## 역할

React 18 런타임 기반 코드베이스에서 Rules of Hooks / exhaustive-deps **정적 검출 게이트의 존재** 를 불변식으로 박제한다. `eslint-plugin-react-hooks` 가 의존성·ESLint flat config 양쪽에 활성화되어 있고 `npm run lint` 실행 경로에서 해당 rule 이 인식되는 상태를 계약으로 고정한다. 의도적으로 하지 않는 것:
- 기존 코드 `useEffect` / Hook deps 정정 (별 task 관할; `foundation/useeffect-timer-cleanup.md`·`common/router-redirect-reentry-guard.md` 자매 축).
- React 19 런타임 bump (`foundation/dependency-bump-gate.md` 관할).
- `eslint-plugin-jsx-a11y` / 커스텀 rule / codemod 작성 (별 req 필요).
- rule severity 최종값 고정 (§FR-04 Should — task 계층에서 baseline 회귀 수 기반 판정).

## 공개 인터페이스

- 소비 파일:
  - `package.json` — `devDependencies` 에 `eslint-plugin-react-hooks` (React 18 호환 major 버전) 엔트리 존재.
  - `eslint.config.js` — flat config 배열 중 `src/**/*.{js,jsx,ts,tsx}` 블록에서 플러그인 등록 + `react-hooks/rules-of-hooks` 및 `react-hooks/exhaustive-deps` rule 항목 존재.
  - `scripts.lint` — `package.json` `"lint": "eslint ./src"` 진입점 유지 (별도 CI workflow 추가 금지).

## 동작

### 1. FR-01 — 플러그인 의존성 불변식 (Must)

`package.json` devDependencies 는 `eslint-plugin-react-hooks` 엔트리를 1건 이상 포함한다. `grep -nE "\"eslint-plugin-react-hooks\"" package.json` 결과가 1 hit 이상이면 충족. 버전 범위는 설치된 `react` major (현 18) 와 peer 호환 매트릭스를 따른다 (`eslint-plugin-react-hooks` v4+ 또는 최신 flat-config 호환 major). 엔트리 부재는 본 FR 위반.

### 2. FR-02 — ESLint flat config 활성화 불변식 (Must)

`eslint.config.js` 는 아래 셋을 동시에 만족한다.

- (a) `eslint-plugin-react-hooks` 를 import (ESM 기본 import 또는 네임드) 하여 flat config 블록의 `plugins` 키에 `'react-hooks'` 네임스페이스로 등록.
- (b) `files: ['src/**/*.{js,jsx,ts,tsx}']` 에 매치되는 블록의 `rules` 객체에 `'react-hooks/rules-of-hooks'` 키가 `error` 레벨로 존재.
- (c) 동일 블록의 `rules` 객체에 `'react-hooks/exhaustive-deps'` 키가 `error` 또는 `warn` 레벨로 존재 (§FR-04 Should 에 따라 baseline 회귀 수 기준 선택).

세 조건 중 하나라도 누락이면 FR-02 위반.

### 3. FR-03 — 회귀 가시성 불변식 (Must)

`npm run lint` 실행 시 `react-hooks/*` 카테고리 rule id 가 최소 1회 이상 **실제 규칙으로 인식** 되어야 한다. 검증은 신규 Hook 위반 fixture (예: 조건부 `useEffect` 호출 또는 빈 deps 배열 누락) 로 dry-run lint 수행 → rule id 가 출력에 1회 이상 포함되면 충족. 본 FR 은 `eslint` resolver 가 플러그인을 로드하고 rule map 에 `react-hooks/*` 키를 노출하는 상태를 박제한다. fixture 는 실제 `src/**` 소스 변경을 요구하지 않으며, 임시 파일 or `--stdin` 입력으로 재현 가능해야 한다 (시점 비의존).

### 4. FR-04 — severity 선택 정책 (Should)

`react-hooks/exhaustive-deps` severity 는 **현 HEAD 시점 baseline 회귀 수** 에 따라 선택된다.
- baseline violation count 가 0 이면 `error` 로 고정.
- baseline violation count 가 1 이상이면 `warn` 으로 설정하고, **회귀 증가 금지 게이트** (baseline 수치를 별도 문서 또는 CI 스텝에 박제 → 초과 시 실패) 를 task 계층에서 수립한다.

`react-hooks/rules-of-hooks` 는 React 공식 가이드 기준 **항상 `error`** 로 고정 (조건부 Hook 호출은 런타임 파손을 야기하므로 warn 허용 안 됨).

### 5. FR-05 — 재현성 · 수단 중립성 (NFR 축)

본 불변식은 정적 grep + `eslint --print-config` / `eslint` resolver 실행만으로 재현 검증 가능하며, 런타임 상태·시점·특정 릴리스 이벤트에 의존하지 않는다. 본 spec 은 **게이트 존재 (플러그인 + rule 등록)** 와 **`npm run lint` 경로 통합 여부** 만 박제하며, 기존 코드 회귀 정정 방식 (자동 fix · codemod · 수동 리팩터) 은 본 spec 관할 밖이다. `useeffect-timer-cleanup.md` / `router-redirect-reentry-guard.md` 가 "수단 예시" 로 언급한 `react-hooks/exhaustive-deps` 확장 rule 은 본 spec 활성화 이후 **실제 존재하는 수단** 으로 전환된다 — 두 자매 spec 의 결과 불변식 (cleanup return · 재진입 guard) 은 본 spec 과 **중첩 검증** 관계로 결합된다 (양 축 동시 위반은 별도 사건).

### 회귀 중점

- `package.json` devDependencies 에서 `eslint-plugin-react-hooks` 제거 → FR-01 위반 즉시 재발.
- `eslint.config.js` 에서 플러그인 import 제거 또는 `rules` 블록에서 `react-hooks/*` 키 삭제 → FR-02 위반.
- `react-hooks/rules-of-hooks` severity 를 `off` / `warn` 으로 하향 → FR-04 위반 (공식 가이드 미준수).
- `scripts.lint` 진입점 경로 변경 (예: `eslint ./src` → 별도 스크립트) 으로 플러그인 rule 이 실행 경로에서 누락 → FR-03 위반.
- `useeffect-timer-cleanup.md` §FR-05 or `router-redirect-reentry-guard.md` §FR-04 의 "수단 예시 부재 허용" 문장을 오독하여 본 게이트를 영구 유예로 해석 → 본 spec (REQ-049) 직접 위반.

## 의존성

- 외부: `eslint` ^9.x (flat config), `eslint-plugin-react-hooks` (React 18 peer 호환 major), `react` ^18.x 런타임.
- 내부: `eslint.config.js` (flat config 컨테이너), `package.json` (`devDependencies` + `scripts.lint` + `lint-staged`).
- 역의존:
  - `foundation/tooling.md` §1 (REQ-028 FR-01, ESLint / lint-staged 대상 불변식) — 본 spec 이 해당 대상 블록 위에 rule 추가로 구성되므로 블록 경계 계약 존속 조건.
  - `foundation/regression-gate.md` — `npm test` / `npm run lint` 진입점 지속성. 본 spec FR-03 은 해당 진입점 경로에서의 rule 인식을 요구.
  - `foundation/useeffect-timer-cleanup.md` §FR-05 — 수단 예시로 `react-hooks/exhaustive-deps` 언급. 본 spec 활성화 후 수단 현실 정합 달성.
  - `common/router-redirect-reentry-guard.md` §FR-04 — 동상.
  - `.husky/pre-commit` (lint-staged 경유) — `src/**/*.{js,jsx,ts,tsx,d.ts}` 에 `eslint` 트리거. 본 spec 활성화 후 pre-commit 에서도 `react-hooks/*` rule 검출 경로로 자동 편입.

## 스코프 규칙

- **expansion**: N/A.
- **grep-baseline** (inspector 발행 시점, HEAD=73bb995 실측):
  - (a) `grep -nE "eslint-plugin-react-hooks" package.json` → **0 hits** (FR-01 위반 baseline — 플러그인 미설치).
  - (b) `grep -nE "eslint-plugin-react-hooks|react-hooks/(rules-of-hooks|exhaustive-deps)" eslint.config.js` → **0 hits** (FR-02 위반 baseline — flat config 활성화 누락).
  - (c) `grep -nE "\"lint\":\s*\"eslint" package.json` → 1 hit (`package.json:21` `"lint": "eslint ./src"`) — FR-03 진입점 존재 baseline.
  - (d) `grep -rnE "useEffect\s*\(" src --include="*.jsx" --include="*.js" | wc -l` → **56 lines** (Hook deps 게이트 대상 면적 baseline). 활성화 후 `react-hooks/exhaustive-deps` 에 의해 cover 될 잠재 위반 후보 풀.
  - (e) `grep -nE "plugin:react-hooks|flat\.recommended" eslint.config.js` → 1 hit (`eslint.config.js:26` `reactPlugin.configs.flat.recommended` — eslint-plugin-react 만, react-hooks 플러그인 별도 추가 필요함을 박제).

- **rationale**: gate (a)(b) 는 현재 위반 상태 baseline (녹색 spec 등록 시점 FR-01/FR-02 미충족 = 정상 — task 수행 후 ack 전환). gate (c) 는 FR-03 진입점 경로가 기본적으로 존재함을 확인. gate (d) 는 면적 baseline (56 useEffect hits) — 활성화 후 `exhaustive-deps` rule 이 다룰 후보 수이며 FR-04 severity 판정 시 baseline 집계 대상. gate (e) 는 기존 eslint-plugin-react 와의 **독립** 플러그인임을 명시 (공식 분리 배포).

## 테스트 현황

- [ ] (FR-01) `package.json` devDependencies 에 `eslint-plugin-react-hooks` 엔트리 1건 이상.
- [ ] (FR-02) `eslint.config.js` flat config 에 플러그인 등록 + `react-hooks/rules-of-hooks` (error) + `react-hooks/exhaustive-deps` (error|warn) rule 존재.
- [ ] (FR-03) 신규 위반 fixture dry-run lint 에서 `react-hooks/*` rule id 가 결과에 1회 이상 출현.
- [ ] (FR-04 Should) severity 선택 근거 (baseline 회귀 수) 가 task 결과물 (`result.md` 또는 `docs/` 별 박제 위치) 에 수치로 박제.
- [ ] (NFR-03) `npm ci` clean install 시 peer dependency 경고 없이 완료.

## 수용 기준

- [ ] (Must, FR-01) `grep -nE "\"eslint-plugin-react-hooks\"" package.json` → 1 hit 이상.
- [ ] (Must, FR-02) `grep -nE "eslint-plugin-react-hooks|react-hooks/(rules-of-hooks|exhaustive-deps)" eslint.config.js` → 3 hits 이상 (import 1 + rule 2).
- [ ] (Must, FR-03) 신규 Hook 위반 fixture 로 `npx eslint --stdin --stdin-filename=fixture.jsx` dry-run 시 출력에 `react-hooks/rules-of-hooks` 또는 `react-hooks/exhaustive-deps` rule id 1회 이상 포함.
- [ ] (Must, FR-03) `scripts.lint` 값이 `eslint ./src` 경로 유지 — `grep -nE "\"lint\":\s*\"eslint" package.json` → 1 hit.
- [ ] (Should, FR-04) `react-hooks/rules-of-hooks` severity = `error` 박제 (`grep -n "rules-of-hooks" eslint.config.js` 인접 라인에 `error` 문자열).
- [ ] (Should, FR-04) `react-hooks/exhaustive-deps` severity 선택 근거 수치 (baseline violation count) 가 task `result.md` 또는 `docs/` 박제 위치에 명시.
- [ ] (Must, FR-05) §스코프 규칙 grep-baseline 에 5+ gate 실제 수치 박제 (본 세션 (a)~(e) 5건 충족).
- [ ] (Must, NFR-03) `npm ci` 실행 시 `eslint-plugin-react-hooks` peer warning 0 (React 18 매트릭스).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-22 | inspector / pending-commit | 최초 등록 (REQ-20260422-049). `eslint-plugin-react-hooks` 를 devDependencies + flat config 에 도입하고 `npm run lint` 경로에서 `react-hooks/*` rule 을 인식시키는 상태를 불변식으로 박제. baseline 실측 (HEAD=73bb995): `package.json` 플러그인 엔트리 0 hits, `eslint.config.js` react-hooks 참조 0 hits, `scripts.lint` 진입점 1 hit, `useEffect(` 면적 56 hits, `eslint-plugin-react flat.recommended` 1 hit (`eslint.config.js:26`). | 신규 전 섹션 |

## 참고

- **REQ 원문**: `specs/20.req/20260422-eslint-plugin-react-hooks-lint-gate-adoption.md` (세션 종료 시 `specs/60.done/2026/04/22/req/` 로 mv).
- **공식 가이드**: https://react.dev/reference/rules/rules-of-hooks (`eslint-plugin-react-hooks` 공식 권장).
- **npm 매트릭스**: https://www.npmjs.com/package/eslint-plugin-react-hooks.
- **자매 spec (중첩 검증 대상)**:
  - `specs/30.spec/green/foundation/useeffect-timer-cleanup.md` §FR-05 (수단 예시로 `exhaustive-deps` 언급).
  - `specs/30.spec/green/common/router-redirect-reentry-guard.md` §FR-04 (동상).
- **관련 blue spec**:
  - `specs/30.spec/blue/foundation/tooling.md` (ESLint / lint-staged 대상 불변식 — 본 spec 이 그 위에 rule 층 추가).
  - `specs/30.spec/blue/foundation/regression-gate.md` (`npm test`·`npm run lint` 진입점 지속성).
- **RULE 준수**:
  - RULE-07: FR-01~FR-05 는 시점 비의존·평서형·반복 grep 검증 가능. 특정 릴리스·incident·날짜 귀속 patch 아님.
  - RULE-06: §스코프 규칙 grep-baseline (a)~(e) 5개 gate 실측 수치 박제.
  - RULE-01: inspector writer 영역 (`30.spec/green/**`) 만 create.
