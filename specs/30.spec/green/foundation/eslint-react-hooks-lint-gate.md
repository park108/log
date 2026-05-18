# React hooks lint 게이트 (rules-of-hooks + exhaustive-deps)

> **위치**: `eslint.config.js` flat-config (src/** 적용 블록) · `package.json:devDependencies`
> **관련 요구사항**: REQ-20260517-087 · REQ-20260518-019
> **최종 업데이트**: 2026-05-18 (by inspector — 83차 tick: REQ-20260518-019 흡수, §FR-05 운영 baseline 단언 강화 + §FR-09 hook deps 정합 채널 + §FR-10 의도 disable 사유 주석 박제 추가)

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

- [ ] (R1·R2 활성화 grep) — 게이트 활성화 후 `grep -nE "react-hooks/rules-of-hooks|react-hooks/exhaustive-deps" eslint.config.js` 2+ hit 박제. 차기 task 회수 후 marker 플립.
- [ ] (plugin devDep) — `grep -nE "\"eslint-plugin-react-hooks\":" package.json` 1 hit 박제. 차기 task 회수 후 marker 플립.
- [ ] (운영 baseline 통과) — 활성화 후 운영 코드 (fixture 없음) `npm run lint` rc = 0 + warning 0 (max-warnings=0 통과). 차기 task 회수 후 marker 플립 또는 task 안에서 부분 회수 사례 박제. **REQ-20260518-019 박제**: TSK-20260518-03 (`eslint-react-hooks-rules-activation`, 격리 후 followup revive) 시점 surface — 15 warning / 9 파일 baseline drift. 회복 후 0 warning + rc=0.
- [ ] (hook deps 정합 grep) — FR-09 측정 자동화 — plugin 활성화 후 `npm run lint 2>&1 | grep -c "react-hooks/exhaustive-deps"` → 0 hit + rc=0. 차기 회복 task 회수 후 marker 플립.
- [ ] (disable 사유 주석 grep) — FR-10 측정 — `grep -rnE "eslint-disable-next-line react-hooks/exhaustive-deps" src --include='*.jsx' --include='*.tsx'` 모든 hit 의 인접 ±2 라인에 사유 주석 1+ hit (수동 검토 또는 부속 스크립트). 차기 회복 task 회수 후 marker 플립.
- [ ] (위반 fixture 차단 효능) — 임시 fixture `if (cond) useEffect(() => {}, []);` 도입 commit → `npm run lint` rc ≠ 0 + stdout 에 `react-hooks` 토큰 1+ hit. 차기 task 안에 fixture 검증 절차 (도입 → 측정 → 삭제) 박제 후 marker 플립.
- [ ] (`.tsx` 커버 확인) — `eslint.config.js` 의 `react-hooks` rule 활성화 블록 `files:` 패턴이 `.tsx` 포함 또는 통합 블록 위치 (양 확장자 모두 커버). 차기 task 회수 후 marker 플립.
- [ ] (level off 회귀 detect) — `react-hooks/rules-of-hooks: 'off'` 또는 부재 + 의도 위반 fixture 동반 시 rc = 0 → 게이트 미성립 신호. 본 마커는 회귀 의도 fixture (CI 또는 별 spec 부속) 안에서 검증 — 차기 회수 사례 후 marker 플립.

## 수용 기준

- [ ] (Must, FR-01) `eslint.config.js` 의 src/** 적용 블록에 `react-hooks/rules-of-hooks` 규칙이 `error` 또는 `warn` 으로 활성화. 측정: `grep -nE "'react-hooks/rules-of-hooks'\s*:\s*'(error|warn)'" eslint.config.js` 1+ hit.
- [ ] (Must, FR-02) 동일 블록에 `react-hooks/exhaustive-deps` 규칙이 `error` 또는 `warn` 으로 활성화. 측정: `grep -nE "'react-hooks/exhaustive-deps'\s*:\s*'(error|warn)'" eslint.config.js` 1+ hit.
- [ ] (Must, FR-03) `package.json:devDependencies` 에 `eslint-plugin-react-hooks` 엔트리 1 hit. 측정: `grep -nE "\"eslint-plugin-react-hooks\":" package.json` 1 hit.
- [ ] (Must, FR-04) hook 규칙 위반 fixture (예: 컴포넌트 본문에 `if (x) useEffect(() => {}, []);` 도입) 일시 삽입 후 `npm run lint` 실행 시 rc ≠ 0 + stdout 에 `react-hooks` 토큰 1+ hit. fixture 삭제 후 rc = 0 복원. 측정: 시나리오 trace (도입→측정→삭제).
- [ ] (Must, FR-05) 본 게이트 박제 후 운영 코드 (fixture 없음) `npm run lint` rc = 0 + warning 0 (max-warnings=0 통과). 측정: `npm run lint; echo $?` → 0. **REQ-20260518-019 측정 조건 강화**: plugin 활성화 + R1·R2 rule 도입 후 측정. baseline drift surface 시점 (`9c5a82a` 실측) 15 warning / 9 파일 분포 (`Image.tsx`, `Writer.jsx`, `ApiCallItem.jsx`, `ContentItem.jsx`, `Monitor.jsx`, `WebVitalsItem.jsx`, `Search.tsx`, `SearchInput.tsx`, `Toaster.tsx`) 회복 task 완료 후 PASS — 회복 commit 해시 + task ID 는 본 §변경 이력 마커 영역.
- [ ] (Must, FR-06) CI workflow (`.github/workflows/ci.yml` `run: npm run lint` step) 자동 연동 — 본 spec 회수 task 의 `.github/workflows/ci.yml` line 추가/삭제 0. 측정: `git diff <before>..<after> -- .github/workflows/ci.yml` 0 line.
- [ ] (Must, FR-07) R1·R2 둘 다 `'off'` 또는 부재 금지 — 둘 중 어느 하나라도 `'off'` 면 본 spec 효능 미달 (회귀 신호). 측정: `grep -nE "'react-hooks/(rules-of-hooks|exhaustive-deps)'\s*:\s*'off'" eslint.config.js` 0 hit.
- [ ] (Must, FR-08) `.tsx` 확장자도 hook rule 적용 — hook 호출 분포가 `.jsx` + `.tsx` 양 확장자에 박제 (현 baseline `.tsx` 분포 다수). flat-config 블록 분리 시 양 블록 모두 활성화, 통합 블록 시 단일 박제 충분. 측정: `eslint.config.js` 의 `react-hooks` rule 활성화 블록 `files:` 패턴이 `.tsx` 포함하거나, 동등 효능 통합 블록 위치 박제.
- [ ] (Must, FR-09, REQ-20260518-019) 운영 코드 hook call site 의존성 배열 정합 — `useEffect`/`useCallback`/`useMemo`/`useLayoutEffect` 호출 사이트는 (a) `exhaustive-deps` rule PASS (누락 deps 0 + 잉여 deps 0) 또는 (b) 라인 직전 `// eslint-disable-next-line react-hooks/exhaustive-deps` + 사유 주석 1+ 행 박제 — 어느 경로든 fail 0. 측정: plugin 활성화 후 `npm run lint 2>&1 | grep -c "react-hooks/exhaustive-deps"` → 0 hit + rc=0. 회복 task §스코프 grep-baseline 의무 (RULE-06 정합 — 9 파일 / 15 hits 실측).
- [ ] (Must, FR-10, REQ-20260518-019) 의도 disable 사유 주석 박제 — FR-09 (b) 경로 채택 시 `// eslint-disable-next-line react-hooks/exhaustive-deps` 직전·직후 라인 또는 동일 라인에 의도 사유 (예: "mount-only init", "functional update via setX(prev => ...)", "ref-based cleanup") 1+ 행 박제 의무. 사유 부재 disable 금지 (코드리뷰 trace 회복). 측정: `grep -nE "eslint-disable-next-line react-hooks/exhaustive-deps" src` 의 모든 hit 의 인접 ±2 라인에 비어있지 않은 주석 라인 1+ hit (수동 검토 또는 lint-staged 부속 스크립트).

## 비기능 기준

- [ ] (NFR-01, 호환성) `eslint-plugin-react-hooks` 메이저는 ESLint v9 flat-config 호환 (현 v5+, v7+). `package.json` 의 `@eslint/js@^9.x`, `eslint@^9.x` 와 정합. legacy `.eslintrc` 전용 메이저 (v4.x 이하) 금지.
- [ ] (NFR-02, 회귀 보호 강도) hook deps 누락 commit 의 `npm run lint` rc — 게이트 활성화 전 = 0 / 활성화 후 ≠ 0. 검출 시점 이동 (`runtime` → `lint`) 효능 박제.
- [ ] (NFR-03, 시점 비의존) 본 spec 본문은 React 메이저 (18/19/20) · ESLint 메이저 (8/9/10) · plugin 메이저 무관 평서형. 구체 버전 박제는 §carve-precondition (G1 환경 채널) 한정.
- [ ] (NFR-04, RULE-07 정합) 효능 박제 한정 — 1회성 incident patch 0. 호출 사이트 baseline 은 잠재 표면적 pointer 한정 (§참고 baseline) — 특정 위반 진단/수리 0.
- [ ] (NFR-05, RULE-06 정합) 본 spec 파생 task 작성 시 §스코프 규칙 grep-baseline 4+ gate 실측 박제 (FR-01·FR-02·FR-03·FR-04·FR-08 측정 명령).
- [ ] (NFR-06, 직교 축) `tooling.md` 의 ESLint 6 불변식, `regression-gate.md` 의 typecheck/coverage 축, `lint-warning-zero-gate.md` 의 `--max-warnings=0` 게이트 와 직교. 기존 spec 본문 재박제 0 (참조만).

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
