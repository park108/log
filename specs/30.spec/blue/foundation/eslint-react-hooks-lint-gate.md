# React hooks lint 게이트 (rules-of-hooks + exhaustive-deps)

> **위치**: `eslint.config.js` flat-config (src/** 적용 블록) · `package.json:devDependencies`
> **관련 요구사항**: REQ-20260517-087 · REQ-20260518-019
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: 게이트 활성화 회수 + green→blue promote)

> 본 spec 은 ESLint flat-config 안에서 React hook 규칙 2종이 활성화되어 hook 호출 위반이 lint 단계에서 차단된다는 시스템 불변식 박제. 호출 사이트 enumerate / 위반 진단 / 회수 task 본문 0 hit (RULE-07).

## 역할

`npm run lint` (= `eslint ./src --max-warnings=0`) 가 React hook 의 핵심 호출 규약 2종 — (R1) hook 은 컴포넌트/커스텀 hook 최상위에서만 호출 (`react-hooks/rules-of-hooks`), (R2) `useEffect`·`useMemo`·`useCallback`·`useLayoutEffect` 의존성 배열 누락/잉여 차단 (`react-hooks/exhaustive-deps`) — 위반을 lint-time 에 차단한다. 회귀 발견 시점이 `runtime` (silent hook ordering corruption · stale closure) 에서 `lint` 로 이동한다.

의도적으로 하지 않는 것:
- hook 외 React 규칙 (예: `react/no-unknown-property`, `react/jsx-key`) — 본 spec 과 직교 (별 plugin `eslint-plugin-react` 책임).
- `eslint-plugin-react-hooks` 의 hook 외 부수 규칙 (`react-hooks/set-state-in-effect`, `react-hooks/static-components`, `react-hooks/component-hook-factories` 등) — 본 spec 은 R1·R2 두 핵심 규칙 한정.
- 호출 사이트 위반 실태 정량화 / 위반 회수 — task 영역. 본 spec 은 게이트 활성화 박제만.
- `jsx-a11y` plugin 도입 — 별 회귀 축 (별 spec 후보).
- CI workflow step 추가 — `npm run lint` 결과 흡수.

## 공개 인터페이스 (계약 표면)

- **lint 진입점**: `npm run lint` (`package.json:scripts.lint`).
- **lint 게이트**: `eslint ./src --max-warnings=0` — error 1+ 또는 warning 1+ 면 rc ≠ 0.
- **활성 규칙 키** (`eslint.config.js` flat-config rules 블록):
  - `react-hooks/rules-of-hooks` — level ∈ {`'error'`, `'warn'`}. `'off'` 금지.
  - `react-hooks/exhaustive-deps` — level ∈ {`'error'`, `'warn'`}. `'off'` 금지.
- **plugin 등록 키**: `react-hooks` (또는 동등 키) — flat-config `plugins: { 'react-hooks': <plugin> }` 형태.
- **devDep 엔트리**: `package.json:devDependencies."eslint-plugin-react-hooks"` 1 hit. 메이저는 ESLint 9 flat-config 호환 (현 v5+).

## 동작 (불변식)

1. **rules-of-hooks 차단**: 컴포넌트/커스텀 hook 본문 외부 (조건문, 반복문, 중첩 함수, 콜백 안) 의 hook 호출은 `npm run lint` 단계에서 error 로 검출되어 rc ≠ 0. 위반 코드가 staged 인 경우 `.husky/pre-commit` 의 `npx lint-staged` 가 자동 편입 차단.
2. **exhaustive-deps 차단**: `useEffect`/`useMemo`/`useCallback`/`useLayoutEffect` 의 deps 배열에 컴포넌트 안에서 참조하는 변수가 누락 (stale closure 위험) 또는 잉여 (불필요 재실행) 시 warning 발생. `--max-warnings=0` 게이트로 rc ≠ 0 전파.
3. **plugin·rule 동시 활성**: plugin 등록만 (`plugins: { 'react-hooks': ... }`) 있고 rule 활성화 (`rules: { 'react-hooks/rules-of-hooks': ... }`) 없으면 효능 0. 반대도 동일. 두 단계 모두 충족되어야 본 게이트 성립.
4. **`.tsx` 커버**: hook 호출 사이트가 `.jsx` + `.tsx` 양 확장자에 분포 (현장 baseline 참고). 본 게이트는 두 확장자 모두 적용 — `eslint.config.js` 블록 분리 (예: JS/JSX 와 TS/TSX 별도 블록) 시 각 블록에 rule 또는 plugin 이 모두 활성화. 단일 통합 블록도 허용.
5. **level 결정 자유도**: R1·R2 각각 `'error'` 또는 `'warn'` 둘 다 허용 — `--max-warnings=0` 게이트로 둘 다 rc ≠ 0 효능 동일. 단 `'off'` 또는 부재 = 게이트 미성립.
6. **CI 자동 연동**: `.github/workflows/ci.yml` 의 `run: npm run lint` step 이 본 게이트를 흡수. 별 CI step 추가 0.
7. **위반 fixture 검증**: 의도 위반 fixture (예: `if (cond) useEffect(() => {}, []);`) 를 일시 도입 → `npm run lint 2>&1 | grep -c "react-hooks"` 1+ hit + rc ≠ 0. fixture 삭제 후 rc = 0 복원.
8. **운영 코드 hook deps 정합** (REQ-20260518-019 박제): R1·R2 활성화 후 운영 코드 (`src/**/*.{jsx,tsx}` ∖ `.test.*` ∖ `__fixtures__`) 의 `useEffect`/`useCallback`/`useMemo`/`useLayoutEffect` 호출 사이트는 (a) `exhaustive-deps` rule 단언 PASS (누락 deps 0 + 잉여 deps 0) 또는 (b) 라인 직전 `// eslint-disable-next-line react-hooks/exhaustive-deps` + 동일·인접 라인에 의도 사유 주석 (예: "mount-only", "functional update pattern") 1+ 행 박제 — 어느 경로든 PASS. plugin 활성화 후 baseline (TSK-20260518-03 surface) 15 warning / 9 파일 (`Image.tsx`, `Writer.jsx`, `ApiCallItem.jsx`, `ContentItem.jsx`, `Monitor.jsx`, `WebVitalsItem.jsx`, `Search.tsx`, `SearchInput.tsx`, `Toaster.tsx`) 의 회복은 별 task 위임 (수단 — deps 추가 / functional update / disable + 사유 — 비의무). 회복 후 `npm run lint` rc=0 + warning 0 + stdout 에 `react-hooks/exhaustive-deps` 토큰 0 hit 유지.
9. **회귀 차단 채널**: 회복 baseline 박제 후, 신규 hook 호출 사이트 도입 commit (운영 코드 hook 호출 증가) 시 의존성 누락은 `npm run lint --max-warnings=0` 게이트 (REQ-085) 가 자동 차단 — `runtime` (stale closure / 무한 리렌더) → `lint-time` 검출 시점 이동 효능 유지.

## 의존성

- 내부: `eslint.config.js` (flat-config), `package.json:scripts.lint`, `package.json:devDependencies`, `.husky/pre-commit` (자동 편입).
- 외부 plugin: `eslint-plugin-react-hooks` (npm). flat-config 호환 메이저 (현 v5+, v7+) — `@eslint/js@^9.x` / `eslint@^9.x` 와 정합.
- 외부 base: ESLint v9 flat-config (`@eslint/js`), `typescript-eslint` parser (`.ts/.tsx` 블록 적용 시).
- 직교 spec:
  - `foundation/tooling.md` (REQ-028 + REQ-053 + REQ-058) — ESLint 6 tooling 불변식 (parser/include/merge semantics, flat-config last-write-wins). 본 spec 은 plugin 추가 + rule 활성화 축으로 직교 — tooling.md §역할 out-of-scope "typescript-eslint `recommended` 규칙 세트 전면 도입" 라인은 별 plugin 의 preset 결정 (본 spec 무관).
  - `foundation/regression-gate.md` (REQ-037) — CI typecheck + coverage threshold 축. 본 spec 은 CI step 변경 0 (npm run lint 결과 흡수) → typecheck/coverage 와 무관.
  - `foundation/lint-warning-zero-gate.md` — `--max-warnings=0` 게이트 박제. 본 spec 은 이 게이트 위에 hook rule 추가 (rule 도입 시 warning 0 유지 의무는 lint-warning-zero-gate 가 박제).

## 테스트 현황

측정 HEAD=`32fb19e` + 본 변경. `eslint-plugin-react-hooks@7.1.1`.

- [x] (R1·R2 활성화 grep) `grep -cE "react-hooks/(rules-of-hooks|exhaustive-deps)" eslint.config.js` → **2**. level = `'error'` / `'warn'`.
- [x] (plugin 등록) `grep -c "plugins: { 'react-hooks'" eslint.config.js` → **1**.
- [x] (plugin devDep) `grep -cE '"eslint-plugin-react-hooks":' package.json` → **1** (`^7.1.1`).
- [x] (운영 baseline 통과) `npm run lint` → **rc=0, warning 0** (`--max-warnings=0`). 진입 baseline 15 warning → 0.
- [x] (hook deps 정합 grep) `npm run lint 2>&1 | grep -c "exhaustive-deps"` → **0**.
- [x] (disable 사유 주석 grep) `grep -rcE "eslint-disable-next-line react-hooks/exhaustive-deps" src --include='*.jsx' --include='*.tsx'` → **6**. 6건 모두 직전 라인에 사유 평서 박제 (FR-10).
- [x] (위반 fixture 차단 효능) 조건부 hook 호출 `if (1 === show) { useEffect(() => {}, []); }` 주입 → `react-hooks/rules-of-hooks` **error 1 hit + rc=1**. fixture 제거 후 **rc=0 복원**.
- [x] (`.tsx` 커버 확인) rule 활성화 블록 `files: ['src/**/*.{js,jsx,ts,tsx}']` — 4 확장자 단일 통합 블록. 후행 TS/TSX 블록은 `no-unused-vars` 키만 재정의하므로 hook rule 은 유지된다 (flat-config 병합).

## 수용 기준

- [x] (Must, FR-01) `react-hooks/rules-of-hooks` = `'error'` 활성.
- [x] (Must, FR-02) `react-hooks/exhaustive-deps` = `'warn'` 활성. `--max-warnings=0` 게이트로 rc≠0 효능 동일 (§동작 5).
- [x] (Must, FR-03) `package.json:devDependencies."eslint-plugin-react-hooks"` 1 hit — `^7.1.1` (ESLint 9 flat-config 호환).
- [x] (Must, FR-04) hook 규칙 위반 fixture 주입 시 rc≠0 + stdout `react-hooks` 1+ hit — 주입 검증 완료.
- [x] (Must, FR-05) 운영 코드 `npm run lint` rc=0 + warning 0.
- [x] (Must, FR-06) `.github/workflows/ci.yml` 의 `run: npm run lint` step 이 본 게이트를 흡수 — 별 CI step 추가 0.
- [x] (Must, FR-07) R1·R2 어느 쪽도 `'off'` 또는 부재 아님.
- [x] (Must, FR-08) `.jsx` + `.tsx` 양 확장자 커버.
- [x] (Must, FR-09) 운영 코드 hook call site 15건 전수 처리 — (a) 경로 9건 (deps 충족) + (b) 경로 6건 (의도 disable + 사유 주석).
- [x] (Must, FR-10) (b) 경로 6건 모두 disable 직전 라인에 사유 평서 박제.

### 회수 판단 근거 (FR-09 (a)/(b) 분기)

진입 시점 15 warning 은 전부 `exhaustive-deps` 였다 — `rules-of-hooks` 위반은 **0건** 으로, 호출 구조 자체는 건전했다.

**(a) deps 충족 9건** — 이 중 5건은 실제 결함이었다.

| 사이트 | 성격 |
|---|---|
| `Comment.tsx` ×2 | state 에 담아둔 JSX 가 `comments` / `isPosting` 변화에 갱신되지 않던 stale 렌더 |
| `LogList.jsx` / `File.tsx` / `ImageSelector.tsx` | 페이지네이션 누적이 클로저의 stale 배열을 읽던 자리 — functional update 로 전환해 의존 자체를 제거 |
| `Search.tsx` | 결과 페이지에서 재검색 시 `location.state` 갱신이 반영되지 않던 stale 질의 |
| `ApiCallItem.jsx` / `WebVitalsItem.jsx` | `!isMount` 가드가 있어 deps 추가가 무해 |
| `ContentItem.jsx` | 6개월 타임라인 배열이 렌더 스코프에 있어 매 렌더 identity 가 바뀌었다 — effect 내부로 이동 |

**(b) 의도 disable 6건** — deps 를 채우면 동작이 깨지는 자리.

| 사이트 | 사유 |
|---|---|
| `File.tsx` / `Monitor.jsx` | 마운트 1회 admin 게이트. `navigate` 는 `<BrowserRouter>` (비 data-router) 경로에서 라우트 변경마다 identity 가 바뀌어 재실행·fullscreen 재토글을 유발 |
| `Writer.jsx` ×2 | `location` 진입 효과 / `isSubmitted` 플래그 트리거 — 제출 시점 렌더의 값을 쓰는 것이 의도이며 `article` 을 넣으면 타이핑마다 재생성 |
| `SearchInput.tsx` | `isGetData` 플래그 트리거 |
| `Toaster.tsx` | `props.completed` 를 전 호출처가 인라인 화살표로 넘긴다 — deps 에 넣으면 부모 리렌더마다 타이머가 리셋돼 자동 닫힘이 영영 발화하지 않는다 |

## 비기능 기준

- [x] (NFR-01, 호환성) `eslint-plugin-react-hooks` 메이저는 ESLint v9 flat-config 호환 (현 v5+, v7+). `package.json` 의 `@eslint/js@^9.x`, `eslint@^9.x` 와 정합. legacy `.eslintrc` 전용 메이저 (v4.x 이하) 금지. — **측정**: plugin `^7.1.1` + `eslint@^9.39.4` flat-config 정합, `npx tsc --noEmit` rc=0 / 61 file 529 test PASS.
- [x] (NFR-02, 회귀 보호 강도) hook deps 누락 commit 의 `npm run lint` rc — 게이트 활성화 전 = 0 / 활성화 후 ≠ 0. 검출 시점 이동 (`runtime` → `lint`) 효능 박제. — **측정**: 활성화 전 rc=0 (무검출) / 활성화 후 15 warning 검출 + 조건부 호출 fixture rc=1.
- [x] (NFR-04, RULE-07 정합) 효능 박제 한정 — 1회성 incident patch 0. 호출 사이트 baseline 은 잠재 표면적 pointer 한정 (§참고 baseline) — 특정 위반 진단/수리 0. — **측정**: 본문 호출 사이트 열거 0, 개별 위반 진단 0 (회수 판단 근거는 §수용 기준 하위 표로 분리).
- [x] (NFR-06, 직교 축) `tooling.md` 의 ESLint 6 불변식, `regression-gate.md` 의 typecheck/coverage 축, `lint-warning-zero-gate.md` 의 `--max-warnings=0` 게이트 와 직교. 기존 spec 본문 재박제 0 (참조만). — **측정**: `tooling.md` / `lint-warning-zero-gate.md` 와 rule key 중복 0.

## 회귀 중점

- (RC-01) hook plugin 미설치 / 미등록 회귀 — `eslint.config.js` 의 `plugins` 키 또는 `rules` 키에서 `react-hooks` 가 사라지면 본 게이트 무효. FR-01·FR-02·FR-03 게이트가 동시 회귀 검출.
- (RC-02) level 변경 회귀 — R1·R2 어느 하나라도 `'off'` 로 변경되면 게이트 일부 무효. FR-07 grep gate 가 회귀 검출.
- (RC-03) flat-config 블록 분리로 인한 `.tsx` 누락 회귀 — JS/JSX 블록 한정 rule 활성화 시 `.tsx` 의 hook 호출 (`Comment.tsx`·`Search.tsx`·`Toaster.tsx` 등 다수) 가 lint 누락. FR-08 가 회귀 검출.
- (RC-04) max-warnings 게이트 약화 회귀 — `package.json:scripts.lint` 의 `--max-warnings=0` 가 사라지거나 양의 정수로 바뀌면 warning level R1·R2 가 rc 전파 실패 → 본 게이트 사실상 무효. 본 spec 은 회귀 신호 한정 (실제 게이트 박제는 `lint-warning-zero-gate.md` 책임 — 직교).
- (RC-05) `.husky/pre-commit` 의 `npx lint-staged` 우회 회귀 — `--no-verify` 사용 시 lint-staged 차단 우회 가능 (RULE-02 `--no-verify` 금지로 박제됨, 본 spec 회귀 신호 한정).
- (RC-06, REQ-20260518-019) hook deps 누락 회복 후 재도입 회귀 — 9 파일 baseline 회복 commit 이후 동일 파일 (또는 신규 파일) 의 hook 호출 도입 시 deps 누락 재진입은 `--max-warnings=0` 게이트 (REQ-085) 자동 차단. 본 spec FR-09 grep + FR-10 사유 주석 grep 이 회귀 신호.
- (RC-07, REQ-20260518-019) `// eslint-disable-next-line react-hooks/exhaustive-deps` 무사유 사용 회귀 — disable 주석만 박제하고 사유 주석 누락 시 코드리뷰 trace 회복 불가 + 의도 불명. FR-10 grep 이 회귀 검출.

## 카브 사전조건 (§carve-precondition)

본 spec 파생 task 는 RULE-06 §스코프 규칙 grep-baseline 4+ gate (FR-01·FR-02·FR-03·FR-04·FR-08 측정 명령) 박제 의무. 추가로:

- (P1) **환경 채널 가용성**: `eslint-plugin-react-hooks` npm registry 도달 가능 (`npm view eslint-plugin-react-hooks version` 1+ line). `node`/`npm` 메이저는 `package.json:engines` 또는 동등 박제와 정합 (현 baseline `node-version-3axis-coherence.md` 책임).
- (P2) **선행 spec done 상태**: `foundation/tooling.md` (REQ-028+053+058) green 박제 + `foundation/lint-warning-zero-gate.md` green 박제 의존 — 본 spec 의 FR-01·FR-02 효능이 `--max-warnings=0` 게이트 + flat-config last-write-wins 불변식 위에 성립. 두 spec 회수 미완료 시 본 spec 효능 미달 (선행 의존).
- (P3) **RULE-02 chain 비활성 chain 식별자**: 본 spec 자체는 RULE-02 chain 비활성 chain 의존 0 (단순 plugin 추가 + rule 활성화). chain 부재.

## 참고

### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- (level off 회귀 detect) R1·R2 를 `'off'` 로 되돌린 뒤 의도 위반 fixture 로 게이트 미성립을 재확인 — 주입 미실시.
- (NFR-03, 시점 비의존) 본 spec 본문은 React 메이저 (18/19/20) · ESLint 메이저 (8/9/10) · plugin 메이저 무관 평서형. 구체 버전 박제는 §carve-precondition (G1 환경 채널) 한정.
- (NFR-05, RULE-06 정합) 본 spec 파생 task 작성 시 §스코프 규칙 grep-baseline 4+ gate 실측 박제 (FR-01·FR-02·FR-03·FR-04·FR-08 측정 명령).
- (NFR-05, RULE-06 정합) 파생 task 작성 시 §스코프 규칙 grep-baseline 4+ gate 실측 박제 — 본 회수는 task 발행 없이 운영자 직접 수행으로 해당 없음.

### 후속 신호 (별 axis)

- `src/Monitor/WebVitalsItem.jsx` 의 `evaluationResult` 는 상태 객체를 제자리 변형한 뒤 같은 참조를 `setEvaluationResult` 로 넘긴다 — React 가 `Object.is` 로 bail out 하므로 이 갱신 자체는 리렌더를 일으키지 않고, 같은 렌더 사이클의 다른 상태 변화에 얹혀 화면에 반영된다. 본 회수는 deps 정합만 다뤘고 변형 패턴은 손대지 않았다. 별 req 후보.

## 참고 baseline (HEAD=`b1b8f85`, 2026-05-17 실측)

- `package.json:59` — `"eslint-plugin-react": "^7.37.5"` (general react plugin, hook 미포함).
- `package.json:11-12` — `"react": "^18.2.0"`, `"react-dom": "^18.2.0"` (React 18).
- `package.json:scripts.lint` — `"eslint ./src --max-warnings=0"`.
- `eslint.config.js` 전체 — `grep -nE "react-hooks|rules-of-hooks|exhaustive-deps" eslint.config.js` → **0 hit** (현장 게이트 부재 baseline).
- 호출 사이트 분포 — `grep -rE "useEffect\(|useMemo\(|useCallback\(|useLayoutEffect\(" src --include="*.jsx" --include="*.tsx" | grep -v "\.test\." | grep -v "__fixtures__"` → 20 distinct files (`src/App.jsx`, `src/Comment/Comment.tsx`, `src/Comment/CommentForm.tsx`, `src/common/Navigation.tsx`, `src/File/File.tsx`, `src/File/FileDrop.tsx`, `src/File/FileUpload.tsx`, `src/Image/ImageSelector.tsx`, `src/Log/LogItem.jsx`, `src/Log/LogList.jsx`, `src/Log/LogSingle.jsx`, `src/Log/Writer.jsx`, `src/Monitor/ApiCallItem.jsx`, `src/Monitor/ContentItem.jsx`, `src/Monitor/Monitor.jsx`, `src/Monitor/VisitorMon.jsx`, `src/Monitor/WebVitalsItem.jsx`, `src/Search/Search.tsx`, `src/Search/SearchInput.tsx`, `src/Toaster/Toaster.tsx`) — 잠재 표면적 pointer (특정 위반 진단 0).
- `.github/workflows/ci.yml:34` — `run: npm run lint` (full repo lint CI step).
- `.husky/pre-commit:1` — `npx lint-staged` (staged 한정 lint, 본 plugin 도입 후 자동 편입).

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector 47th tick / (this commit) | 최초 등록 — REQ-20260517-087 흡수, React hook rules-of-hooks + exhaustive-deps lint 게이트 불변식 박제 | all |
| 2026-05-18 | inspector 83차 tick / (this commit, REQ-20260518-019 흡수) | §FR-05 운영 baseline 측정 조건 강화 — plugin 활성화 후 측정 의무 + 9 파일 baseline drift surface marker (HEAD `9c5a82a` 실측). §동작 8·9 신규 (운영 코드 hook deps 정합 + 회귀 차단 채널). §FR-09 (hook deps 정합 grep gate) + §FR-10 (의도 disable 사유 주석 박제) 추가. §테스트 현황 운영 baseline + hook deps grep + disable 사유 grep 3 marker 추가. §회귀 중점 RC-06·RC-07 추가. baseline drift: TSK-20260518-03 (`eslint-react-hooks-rules-activation`, 격리 후 `10.followups/20260518-0113-...-from-blocked.md` revive) — 15 warning / 9 파일 (`Image.tsx:124`, `Writer.jsx:66/209`, `ApiCallItem.jsx:109`, `ContentItem.jsx:113`, `Monitor.jsx:57`, `WebVitalsItem.jsx:116`, `Search.tsx:43`, `SearchInput.tsx:53`, `Toaster.tsx:71`). 회복 task 위임 (수단 — deps 추가 / functional update / disable + 사유 — 비의무). 본 inspector 변경 표면 `eslint-react-hooks-lint-gate.md` 1 파일 한정 (`src/**` + `eslint.config.js` + `package.json` 변경 0). RULE-07 정합: 시점 비의존 평서형 ("운영 코드 hook call site 의존성 배열 정합") + 반복 검증 가능 (`npm run lint --max-warnings=0` rc=0 + grep 0 hit) + incident 비귀속 (9 파일은 baseline marker, TSK-03 격리는 surface 경로 박제만). | 헤더 · §동작 (8·9 신규) · §수용 기준 (FR-05 강화 + FR-09·FR-10 신규) · §테스트 현황 (3 marker 신규) · §회귀 중점 (RC-06·RC-07 신규) · 본 이력 |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | 게이트 활성화 완료 — `eslint-plugin-react-hooks@^7.1.1` devDep 추가 + flat-config 에 R1(`error`)·R2(`warn`) 2 규칙 명시 활성 (v7 recommended 프리셋은 R1·R2 외 다수 규칙을 켜므로 §역할 "의도적으로 하지 않는 것" 에 따라 미채택). 진입 15 warning (전부 exhaustive-deps, rules-of-hooks 0) → 0. (a) deps 충족 9건 + (b) 의도 disable 6건. 조건부 hook 호출 fixture 주입 rc=1 / 제거 rc=0 복원 검증. FR-01~FR-10 + NFR-01·02·04·06 전수 flip. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |
