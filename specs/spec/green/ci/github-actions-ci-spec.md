# 명세: GitHub Actions CI

> **위치**:
> - `.github/workflows/ci.yml` (도입 완료, `d7f78e2`)
> - `.github/pull_request_template.md` (WIP)
> - `docs/operations/branch-protection.md` (WIP, 위치 가변)
> - `docs/operations/ci-smoke-verification.md` (WIP, 위치 가변)
> **유형**: CI / 자동화
> **최종 업데이트**: 2026-04-18 (by inspector, WIP)
> **상태**: Active (워크플로 도입 완료, 운영 마감 진행 중)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260417-setup-github-actions-ci.md` (워크플로 도입)
> - `specs/requirements/done/2026/04/18/20260418-ci-rollout-finalization.md` (PR 템플릿 / 브랜치 보호 / 스모크 검증)
> - `specs/requirements/done/2026/04/18/20260418-eslint-jsx-extension-coverage-fix.md` (REQ-20260418-024, Lint 잡 확장자 커버리지)
> - `specs/requirements/done/2026/04/18/20260418-log-test-flaky-listitem-msw-isolation.md` (REQ-20260418-027, flaky 감시 잡 검토 — Could)
> - `specs/requirements/done/2026/04/18/20260418-ci-devtools-bundle-grep-step.md` (REQ-20260418-038, PROD 번들 Devtools 유입 차단)
> - `specs/requirements/done/2026/04/18/20260418-spec-code-reference-anti-drift-convention.md` (REQ-20260418-039, spec 참조 코드 식별자 우선 컨벤션 — `tanstack-query-devtools-smoke-spec.md:4` 의 `src/App.jsx` 라인 drift (+30) 사례)
> - `specs/requirements/done/2026/04/19/20260419-eslint-v9-flat-config-migration.md` (REQ-20260419-003, Lint 잡 ESLint v9 + flat config CI 영향)
> - `specs/requirements/done/2026/04/19/20260419-ci-bundle-gzip-size-diff-guard.md` (REQ-20260419-006, CI 번들 청크별 gzip 사이즈 diff 가드 도입 — PR base/head 자동 비교 단계)

> 본 문서는 PR / push 자동 검증 워크플로 SSoT.
> 배포 워크플로 / Lighthouse CI 는 범위 밖.

---

## 1. 역할 (Role & Responsibility)
PR 및 master push 시점에 lint / test / build 를 자동 실행하여 회귀를 차단.

- 주 책임:
  - Node 20 LTS 환경에서 install → lint → test → build
  - npm cache 활용으로 빌드 시간 단축
  - 실패 시 PR 머지 차단 (브랜치 보호와 연계)
- 의도적으로 하지 않는 것:
  - 배포 워크플로 (S3 / CloudFront 등 인프라 정보 필요)
  - 성능 예산 (Lighthouse CI 등)
  - Dependabot 설정 변경 (이미 활성화, 유지)

## 2. 현재 상태 (As-Is) — 2026-04-18 기준
- [x] `.github/workflows/ci.yml` 존재 (lint/test/build 3-job, `d7f78e2`)
- [ ] `.github/pull_request_template.md` 부재 (REQ-20260418-006 FR-01)
- [ ] `master` 브랜치 보호 규칙 미설정 — `ci` job 이 required status check 로 등록되지 않음 (REQ-20260418-006 FR-03)
- [ ] 운영 가이드 문서 부재 — 트리거/실패/캐시 검증 미수행 (REQ-20260418-006 FR-02, FR-04, FR-05)
- pre-commit (`eslint`), pre-push (`npm test`) 그대로 유지 (보완 안전망)

> 관련 요구사항: REQ-20260418-006 §2 배경

## 3. 워크플로 정의
> 관련 요구사항: 20260417-setup-github-actions-ci

### 3.1 `.github/workflows/ci.yml`
- 트리거:
  - `pull_request` (target branches: master)
  - `push` (branches: master)
- Job: `ci`
  - `runs-on`: `ubuntu-latest`
  - 단계:
    1. `actions/checkout@v4`
    2. `actions/setup-node@v4` — `node-version: 20`, `cache: npm`
    3. `npm ci`
    4. `npm run lint` (ESLint)
    5. `npm test -- --run` (또는 `npm test`; CI 모드)
    6. `npm run build`

### 3.1.1 [WIP] Lint 단계 확장자 커버리지 (REQ-20260418-024)

> 관련 요구사항: REQ-20260418-024 FR-01 ~ FR-06, US-01~US-03

**현재 결함**: `.github/workflows/ci.yml:25-26` 의 `Lint` 스텝은 `npm run lint` (= `eslint ./src`) 를 호출한다. ESLint 8 기본 `--ext` 가 `.js` 만 포함하므로 **모든 `.jsx` 파일이 CI Lint 잡에서 실질 스캔되지 않는다**. PR 이 `Lint` green 으로 머지돼도 jsx 회귀(a11y / 스타일) 가 차단되지 못함 — 잡 신호 가치 침해.

**목표**: 본 잡 자체는 변경하지 않는다. `package.json` 의 `lint` 스크립트를 `eslint ./src --ext .js,.jsx` (또는 flat config 동등) 로 수정하면 CI Lint 스텝이 자동으로 jsx 검사 수행. 상세 정책은 `specs/spec/green/common/accessibility-spec.md` §3.4.1 (REQ-024) 단일 출처.

**검증 방법 (스모크)**:
- 의도적 `.jsx` 위반(예: `no-mixed-spaces-and-tabs`) 을 포함한 PR → `Lint` 잡 red 관측.
- 수정 후 동일 PR → `Lint` 잡 green.
- `.github/workflows/ci.yml` 의 `Lint` 스텝 로그에 `.jsx` 파일 검사 라인 존재.

**수용 기준 (CI 측면)**:
- [ ] `npm run lint` 변경 후 CI `Lint` 잡 로그에서 `.jsx` 검사 수행 확인
- [ ] 의도적 jsx 위반 PR 1회로 red→green 전환 스모크 수행 (FR-05, Could)
- [ ] baseline cleanup 후 CI `Lint` 잡 연속 green 유지

**범위 밖**: CI workflow 파일(`.github/workflows/ci.yml`) 자체 변경, `--cache` / `--max-warnings 0` 등 CI 친화 옵션 (별 후보).

### 3.1.3 [WIP] ESLint v9 + flat config 마이그레이션 CI 영향 (REQ-20260419-003)

> 관련 요구사항: REQ-20260419-003 FR-07, NFR-05

**맥락 (2026-04-19 관측)**: 프로젝트 ESLint 가 `8.28.0` 설치 / `8.57.1` wanted / `10.2.1` latest 로 2 메이저 뒤처짐. ESLint 8.x 는 2024-10-05 EOL 이후 6개월+ 경과. `.eslintrc.yml` legacy config 는 v9 에서 `ESLINT_USE_FLAT_CONFIG=false` 로만 가능하며 v10 옵션화 / v11 제거 예정. 본 §3.1.3 은 accessibility-spec §3.4.2 (REQ-003 SSoT) 의 CI 측면 영향을 박제.

**목표 (CI 측면)**:
- `.github/workflows/ci.yml` 의 `Lint` 스텝 **자체는 변경 없음** (`npm run lint` 호출 유지).
- `package.json` 의 `lint` 스크립트 + 설정 파일(`.eslintrc.yml` → `eslint.config.js`/`.mjs`) 이관만으로 v9 흡수.
- CI Lint 잡 로그에서 legacy config deprecation warning (`Use Of .eslintrc.yml Has Been Deprecated`) 이 **0 회** 가 되는지 검증.
- Node 버전 호환: ESLint v9 최소 Node >=18.18, 현 CI `actions/setup-node@v4` `node-version: 20` 통과 — 변경 없음.

**§3.1.1 (REQ-024) 와의 관계**:
- REQ-024 의 `--ext .js,.jsx` 는 legacy eslintrc 하 CLI 플래그. flat config 로 이관 시 **`files: ['**/*.{js,jsx}']`** 로 동등 표현 (설정 파일 내 `files` 필드).
- REQ-024 머지가 선행되면 flat config 이관 시 이미 정리된 `.jsx` 위반 baseline 이 유지됨 → REQ-003 의 "마이그레이션 전/후 결과 동등성" 검증이 안정.
- REQ-024 미머지 상태에서 REQ-003 먼저 진행 시 `.jsx` 위반 대량 신규 검출 가능 — planner 가 순서 결정 (REQ-024 선행 권장).

**§3.5.2 (REQ-038) 와의 관계**:
- REQ-038 의 `Verify Devtools is not in production bundle` 스텝은 ESLint 와 무관 — v9 전환 영향 0.

**검증 (스모크)**:
- 마이그레이션 PR 의 CI `Lint` 잡 로그에서 deprecation warning 검색 → 0 hits.
- 마이그레이션 전/후 로컬 `npm run lint --format json` 산출물 diff → 에러/경고 수 ±0 (FR-06).
- husky pre-commit 의 `eslint` 호출이 신 설정으로 동작 (pre-commit dry-run 1회).

**수용 기준 (CI 측면, REQ-003 §10 부분)**:
- [ ] CI `Lint` 잡 green 유지 (마이그레이션 PR)
- [ ] CI Lint 로그에 legacy config deprecation warning 0
- [ ] `.github/workflows/ci.yml` 변경 0 line (설정 파일 이관만)
- [ ] Node 20 유지 전제 충족
- [ ] (선택) 마이그레이션 전/후 CI `Lint` 잡 실행 시간 변화 ≤+10% (NFR-02 of REQ-003)

**범위 밖**:
- CI workflow 파일 자체 변경 — 본 §은 설정 파일 이관만 전제.
- ESLint v10 으로의 점프 — flat-only enforcement, 별 후속 spec.
- `@typescript-eslint/*` 도입 — TS 마이그레이션 의존, 별 spec.
- husky v9 동시 업그레이드 — 별 후보.

### 3.2 캐시 전략
- `actions/setup-node` 의 `cache: npm` 으로 `package-lock.json` 해시 기반 캐시
- 별도 `actions/cache` 불필요

### 3.3 PR 템플릿 — **[WIP]** REQ-20260418-006 FR-01 (Must)
> 관련 요구사항: REQ-20260418-006 FR-01, US-01
- 위치: `.github/pull_request_template.md`
- 최소 3 섹션:
  - `## 변경 요약`
  - `## 테스트 방법`
  - `## 관련 이슈`
- (옵션) 스크린샷 / DoD 체크리스트 섹션 추가 여부는 §13 미결.

### 3.4 Dependabot
- 이미 활성화됨 (최근 머지 이력 기준) — 그대로 유지
- 본 spec 에서 변경하지 않음

### 3.5 브랜치 보호 운영 가이드 — **[WIP]** REQ-20260418-006 FR-02, FR-03 (Must)
> 관련 요구사항: REQ-20260418-006 FR-02 (가이드 작성), FR-03 (운영자 적용), US-02
- 위치: `docs/operations/branch-protection.md` (또는 동등 위치 — planner 결정, §13 미결)
- 내용:
  - `master` 에 `ci` job 을 required status check 로 등록하는 절차
  - 검증 명령: `gh api repos/:owner/:repo/branches/master/protection` 출력 예시
  - "Require branches to be up to date" 옵션 활성
  - 필요한 토큰 scope (`repo`, `admin:repo_hook`)
- 운영자(park108) 가 GitHub Settings 에서 1회 적용 (에이전트 직접 수행 불가, RULE-02 §2.3 와 일치).

### 3.5.1 [WIP] Flaky 감시 잡 (REQ-20260418-027, Could)

> 관련 요구사항: REQ-20260418-027 FR-08 (Could), US-01

**맥락**: `src/Log/Log.test.jsx:46` 의 `findAllByRole("listitem")` 타임아웃 1건이 flaky 로 관측 (2026-04-18). `state/server-state-spec.md` §3.6 이 MSW/spy/env stub 격리 표준화를 기술. 본 §3.5.1 는 그 결과가 CI 에서 회귀하지 않는지 **장기 감시** 하는 잡을 정의.

**목표 패턴 (Could, planner 결정)**:
- weekly (예: 월요일 새벽) 또는 nightly cron 잡으로 `npm test` 를 3회 연속 실행.
- 3회 중 1회라도 실패하면 `specs/followups/` 에 자동 팔로업 생성 (운영자 수동 또는 discovery 재가공).
- vitest `--retry=0` 명시로 무의식적 재시도 의존 차단.

**최소 수용 기준 (본 REQ 범위)**:
- [ ] (Could) weekly 또는 nightly 잡 추가 vs ad-hoc 점검 결정 — planner / 운영
- [ ] REQ-027 본 PR 의 5회 반복 baseline 박제 (로컬 또는 CI)

**범위 밖**: `--threads` 병렬도 조정, 테스트 shard 분산 — 별 후보.

### 3.5.2 [WIP] PROD 번들 Devtools 유입 차단 스텝 (REQ-20260418-038, FR-01 ~ FR-07)

> 관련 요구사항: REQ-20260418-038 FR-01 ~ FR-07, US-01~US-03

**맥락 (2026-04-18 관측)**: REQ-20260418-016 (Devtools 스모크 체크리스트, done) 의 FR-08 (Could) 는 "빌드 후 스텝에 `! grep -l \"ReactQueryDevtools\\|react-query-devtools\" build/assets/*.js` 1줄 추가" 를 제안했으나 CI 자동화는 미반영 상태 — PROD 번들 회귀 자동 차단이 수동 grep 에 의존.

**목표 스텝 정의 (FR-01, FR-02)**: `.github/workflows/ci.yml` 의 `Build` 스텝 뒤에 다음 스텝 1개 추가:

```yaml
- name: Verify Devtools is not in production bundle
  run: |
    ! grep -l "ReactQueryDevtools\|react-query-devtools" build/assets/*.js
```

- `Build` 스텝이 `npm run build` 를 이미 수행 → `build/assets/` 존재 보장.
- `grep -l` exit code: 매치 시 0, 미매치 시 1.
- `!` invert → 매치 없음 = step PASS (exit 0), 매치 있음 = step FAIL (exit 1).
- GitHub Actions default `bash` 의 `set -e` 에서 정상 동작 (FR-07 bash 안전성).

**docs 갱신 트리거 (FR-03)**: `docs/testing/tanstack-query-devtools-smoke.md` §항목 4 (번들 grep) 상단에 "CI 자동 수행 — 수동 단계 생략 가능 (`.github/workflows/ci.yml` "Verify Devtools is not in production bundle" step)" 1줄 주석 + §CI 통합 후보 마커를 `Could → 마감 — REQ-038` 로 갱신.

**검증 (FR-04)**:
- 본 PR 의 CI run 에서 신규 스텝 정상 PASS (현 PROD 번들에 Devtools 미유입 — REQ-016 baseline).
- (Should/FR-06) Negative test: Devtools 분기 일시 제거 PR → CI 빨갛게 FAIL → 원상복구 (별 PR 또는 별 commit).

**inspector cross-link (FR-05)**:
- `specs/spec/blue/testing/tanstack-query-devtools-smoke-spec.md` §3.5 (번들 grep 자동 백업) 의 "CI 통합 후보 (FR-08, Could)" 문구를 본 스텝 도입 후 `마감 (본 spec §3.5.2)` 로 박제 (별 라운드, blue→green 승격 필요).

**수용 기준 (REQ-20260418-038 §10)**:
- [ ] `.github/workflows/ci.yml` 에 "Verify Devtools is not in production bundle" step 추가 (Build 뒤)
- [ ] step 정의가 `! grep -l "ReactQueryDevtools\|react-query-devtools" build/assets/*.js` 정확
- [ ] `docs/testing/tanstack-query-devtools-smoke.md` §항목 4 상단에 "CI 자동 수행" 주석 1줄
- [ ] `docs/testing/tanstack-query-devtools-smoke.md` §CI 통합 후보 마커 갱신 (`Could → 마감 — REQ-038`)
- [ ] 본 PR 의 CI run 정상 PASS (신규 step 포함)
- [ ] CI step 실행 시간 ≤2초 (NFR-06)
- [ ] CI workflow 변경 line ≤5 (NFR-04)
- [ ] (Should) Negative test 1회 — Devtools 분기 일시 제거 → CI FAIL 가시 (별 PR / 별 commit)
- [ ] (Should) inspector 가 `tanstack-query-devtools-smoke-spec.md` §3.5 박제 (별 트리거)

**범위 밖**:
- 다른 sec-policy 스텝 (bundle size / dependency audit / sanitizeHtml 정책) — 별 후보.
- CI workflow 의 기존 스텝 (Lint/Test/Build) 변경 — 본 §은 Build 뒤 추가만.
- Husky pre-push 훅에 동등 grep 추가 — 별 후보.
- Negative test 자동화 — 별 PR (planner).

### 3.5.3 [WIP] 번들 청크별 gzip 사이즈 diff 가드 (REQ-20260419-006)

> 관련 요구사항: REQ-20260419-006 FR-01 ~ FR-11, US-01 ~ US-03

**맥락 (2026-04-19 관측)**: 직전 3건의 task(`TSK-MUT-CREATE`, `TSK-MUT-DELETE`, `TSK-A11Y-SWEEP-MONITOR`) 의 DoD 에 "청크 크기 변동 ±X KB gzip 이내" 조건이 명시됐으나 **base 빌드 자동 박제 인프라 부재** 로 developer 에이전트의 비대화형 세션에서 사후 검증이 불가능. 3건의 동일 followup 누적:
- Writer chunk regression (`20260419-0221`): +0.97 kB (2.28 → 3.25 kB), DoD ±0.5 kB 초과
- LogItem chunk regression watch (`20260418-1811`): 이전 빌드 baseline 없어 delta 단정 불가
- Monitor chunk regression watch (`20260418-1752`): 5개 Monitor chunk sweep 이전 baseline 미수집

**목표 스텝 정의 (FR-01 ~ FR-04)**: `.github/workflows/ci.yml` 에 **번들 gzip 사이즈 diff** 단계 추가:
- PR 의 base 브랜치(`master`) 또는 직전 커밋 빌드 산출물 청크별 gzip 측정.
- 본 PR 빌드 산출물과 비교 → **delta 표** (chunk / base / head / diff [kB, %]) 생성.
- PR 코멘트 또는 GitHub Actions summary(`$GITHUB_STEP_SUMMARY`) 에 출력 (둘 중 하나 Must, 둘 다 Should).

**도구 선택 (FR-10)**: `size-limit` / `bundlewatch` / 자작 스크립트(`jq` + bash + `gzip -c | wc -c`) 중 planner 결정. `rollup-plugin-visualizer` 는 참고용 분석으로 별 후속.

**측정 대상 청크 우선순위 (FR-05, FR-06)**:
- **Tier 1 (Must)**: `index-*.js`, `Writer-*.js`, `LogItem-*.js`, `QueryClientProvider-*.js`, `Monitor-*.js` — 항상 표 표시.
- **Tier 2 (Should)**: 모든 lazy chunk 자동 트래킹 (신규 청크 자동 감지).

**임계치 정책 (FR-07, FR-08)**:
- 청크별 ±0.5 kB gzip 이내: 경고 없음.
- +0.5 ~ +2 kB: 경고 (스크립트 출력 / PR 코멘트 라벨).
- +2 kB 초과 또는 +10% 초과: 강조 경고.
- **기본 exit code 정책: 경고만 (잡 PASS)** — 실패 강제는 별 후속 spec (4주 baseline 후 planner 결정).

**캐시 전략 (NFR-02)**:
- `actions/cache@v4` 로 `node_modules` + `build/` 캐시. 키는 `package-lock.json` hash + `master` SHA.
- base 브랜치 빌드 추가 시 CI 총 시간 +≤2분 이내 목표.
- `master` 직접 푸시 / PR 부재 시 `if: github.event_name == 'pull_request'` 로 skip.

**청크 해시 매칭 (위험 완화)**:
- 파일명 해시(`Writer-abc123.js`) 의 "청크 이름"(`Writer`) 부분으로 정규식 매칭.
- 매칭 실패 청크는 "신규/제거" 컬럼으로 별도 표시 — 청크 분리/병합 시에도 표 유효.

**developer 에이전트 영향**:
- task result.md 의 "## DoD 검증" 섹션이 GitHub Actions URL / PR 코멘트 링크 1줄로 대체 가능 (수동 박제 자체는 metadata 보존 측면에서 병존 허용).
- `*-chunk-gzip-regression-watch` followup 누적 목표: 머지 후 6주 내 0건 (`ls specs/followups/*regression*` 측정).

**§3.5.2 (REQ-038) 와의 관계**: REQ-038 의 `Verify Devtools is not in production bundle` 스텝과 직교. 본 스텝은 Build 산출물 사이즈만 측정 — devtools grep 은 별 검증 목적. 동시 운영 가능.

**§3.1.1 / §3.1.3 (REQ-024 / REQ-003) 와의 관계**: ESLint / Lint 스텝 변경 없음. 본 스텝은 Build 잡 단계 추가만.

**수용 기준 (REQ-20260419-006 §10)**:
- [ ] FR-01 ~ FR-11 충족
- [ ] `.github/workflows/ci.yml` 에 본 잡 또는 단계 추가
- [ ] 본 요구사항 머지 PR 의 GitHub Actions summary 또는 PR 코멘트에 delta 표 1회 출력 (chunk/base/head/diff 3~5 컬럼, Tier 1 청크 5개 이상 row)
- [ ] 인위적 회귀 PR (dry-run, 별 commit) 에서 경고 라벨 출력 검증
- [ ] 기본 exit code 정책(경고만) 이 spec 또는 워크플로 주석에 명시
- [ ] `npm run lint` / `npm test` / `npm run build` 회귀 0
- [ ] 본 잡 추가 후 CI 총 시간 +≤2분 (NFR-02)
- [ ] followup 3건(`*-chunk-gzip-regression-watch.md`) 의 변환 출처가 본 요구사항으로 명시 (REQ-006 §14)
- [ ] (Should) PR 코멘트 + summary 둘 다 출력
- [ ] (Could) 6주 후 followup 누적 0 박제 — 별 운영 점검

**범위 밖**:
- coverage 사이즈 회귀(`@vitest/coverage-v8`) — production 번들만.
- Critical 경로(LCP/FCP) 회귀 측정 — `web-vitals` 별 spec.
- 빌드 시간 회귀 측정 — 별 후속.
- Source map 분석 / 의존성 별 사이즈 분해 (`vite-plugin-bundle-analyzer`) — 별 후속.
- `package.json` 의 `size-limit` config 추가 시 lint / pre-commit hook 동시 도입 — 별 후속.
- 빌드 산출물 git LFS 저장 — 본 요구사항 무관.
- 실패 강제(exit code 1 enforcement) — 본 요구사항 후 4주 baseline 운영 → 별 후속 spec.

### 3.6 스모크 검증 체크리스트 — **[WIP]** REQ-20260418-006 FR-04, FR-05 (Should)
> 관련 요구사항: REQ-20260418-006 FR-04, FR-05, US-03
- 위치: `docs/operations/ci-smoke-verification.md` (또는 동등 위치)
- 검증 3 항목 (각 항목에 GitHub Actions run URL 또는 스크린샷 슬롯):
  1. PR 생성 시 워크플로 자동 트리거 캡처
  2. 의도적 lint 실패 PR 로 job red + 머지 차단 관측 후 PR close/branch 삭제
  3. 캐시 적중 시 `Install dependencies` 단계 시간이 첫 실행 대비 단축
- 결과는 해당 task 의 `result.md` 에 URL 기록.

## 4. 의존성
- 없음 (저장소가 GitHub 에 있고 Actions 사용 가능 환경 전제)

## 5. 수용 기준 (Acceptance)
- [x] PR 생성 시 CI 자동 실행 (워크플로 파일 도입 완료, `d7f78e2`)
- [ ] [WIP] 실패한 테스트는 머지 차단 — 브랜치 보호로 강제 (REQ-20260418-006 FR-03)
- [ ] [WIP] 캐시 적중 시 install 시간 단축 검증 (REQ-20260418-006 FR-04 #3)
- [x] master push 시도 워크플로 실행 (도입 시 트리거 정의 완료)
- [ ] [WIP] PR 템플릿 prefill 확인 (REQ-20260418-006 §10)
- [ ] [WIP] `gh api ...protection` 으로 required status check 에 `ci` 포함 확인 (REQ-20260418-006 §10)
- [ ] [WIP] 의도 실패 PR → 머지 버튼 비활성 검증 (REQ-20260418-006 §10)

### 5.1 REQ-20260419-006 수용 기준 (번들 청크별 gzip 사이즈 diff 가드) — §3.5.3
> 관련 요구사항: REQ-20260419-006 §10 — 상세는 본 spec §3.5.3

- [ ] `.github/workflows/ci.yml` 에 번들 gzip diff 스텝 추가 (Build 뒤 또는 별 잡)
- [ ] PR 의 base 브랜치 대비 청크별 delta 표 (chunk / base / head / diff) 생성
- [ ] 본 요구사항 머지 PR 의 summary/PR 코멘트에 표 1회 이상 출력 (Tier 1 청크 5개 이상 row)
- [ ] Tier 1 청크(`index`, `Writer`, `LogItem`, `QueryClientProvider`, `Monitor`) 5개 항상 표시
- [ ] 기본 exit code 정책: 경고만 (잡 PASS) — spec / 워크플로 주석에 명시
- [ ] 도구 선택(`size-limit` / `bundlewatch` / 자작) planner 결정 반영
- [ ] 본 잡 추가 후 CI 총 시간 +≤2분 (NFR-02)
- [ ] (Should) 인위적 회귀 dry-run PR 로 경고 라벨 노출 검증
- [ ] (Should) `master` 직접 푸시 시 skip (`if: github.event_name == 'pull_request'`)
- [ ] `npm run lint` / `npm test` / `npm run build` 회귀 0

## 6. 알려진 제약 / 이슈
- 브랜치 보호 규칙 (필수 status check 지정) 은 GitHub 설정 — 워크플로 자체로는 강제 불가. 운영자가 수동 설정 필요. **REQ-20260418-006 으로 운영 마감 진행 중.**
- 테스트 러너 마이그레이션 (Jest → Vitest) 시 명령어 `npm test -- --run` / `npm test -- --watchAll=false` 등이 달라질 수 있음 — 변경 시 본 spec 갱신.
- 운영 가이드 문서 위치 (`docs/operations/` vs `README` 부속 vs `.github/CONTRIBUTING.md`) — REQ-20260418-006 §13 미결.

## 7. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (done) | GitHub Actions CI 워크플로 도입 (`d7f78e2`) | 3.1, 3.2 |
| 2026-04-18 | (pending, REQ-20260418-006) | PR 템플릿 / 브랜치 보호 / 스모크 검증 마감 (WIP) | 3.3, 3.5, 3.6, 5 |
| 2026-04-18 | (pending, REQ-20260418-024) | Lint 단계 `.jsx` 확장자 커버리지 §3.1.1 신설 — jsx-a11y 실효성 선결, accessibility-spec §3.4.1 cross-link (WIP) | 3.1.1 |
| 2026-04-18 | (pending, REQ-20260418-027) | Flaky 감시 잡 §3.5.1 신설 (Could) — weekly/nightly `npm test ×3`, server-state-spec §3.6 cross-link (WIP) | 3.5.1 |
| 2026-04-18 | (pending, REQ-20260418-038) | PROD 번들 Devtools 유입 차단 스텝 §3.5.2 신설 — `! grep -l ReactQueryDevtools build/assets/*.js`, tanstack-query-devtools-smoke-spec §3.5 cross-link (WIP) | 3.5.2 |
| 2026-04-18 | (pending, REQ-20260418-039) | 헤더 관련 요구사항에 REQ-039 (spec 참조 코드 식별자 우선 컨벤션) 등재 — template.md 에 컨벤션 헤더 주석, inspector 가 tanstack-query-devtools-smoke-spec.md:4 "참조 코드" 필드 식별자 기반 보정 (별 라운드) (WIP) | (링크만) |
| 2026-04-19 | (pending, REQ-20260419-003) | ESLint v9 + flat config CI 영향 §3.1.3 신설 — Lint 잡 자체 변경 없음 + 설정 파일 이관 전제, legacy deprecation warning 0, accessibility-spec §3.4.2 cross-link, Node 20 유지 (WIP) | 3.1.3 |
| 2026-04-19 | (pending, REQ-20260419-006) | 번들 청크별 gzip 사이즈 diff 가드 §3.5.3 신설 — PR base/head 자동 비교 + Tier 1 청크 5개(`index`/`Writer`/`LogItem`/`QueryClientProvider`/`Monitor`) 항상 표 노출, 기본 경고만 exit code, `size-limit`/`bundlewatch`/자작 중 planner 결정, CI 시간 +≤2분 (WIP) | 3.5.3, 5.1 |
| 2026-04-20 | (inspector drift reconcile) | §3 헤더 rename: "(To-Be, WIP)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3 |

## 8. 관련 문서
- 기원 요구사항:
  - `specs/requirements/done/2026/04/18/20260417-setup-github-actions-ci.md` (도입)
  - `specs/requirements/done/2026/04/18/20260418-ci-rollout-finalization.md` (마감)
  - `specs/requirements/done/2026/04/18/20260418-eslint-jsx-extension-coverage-fix.md` (REQ-024, Lint 확장자 커버리지)
  - `specs/requirements/done/2026/04/18/20260418-log-test-flaky-listitem-msw-isolation.md` (REQ-027, flaky 감시 잡 Could)
- 관련 followups (consumed):
  - `specs/followups/consumed/2026/04/18/20260418-0542-pr-template.md`
  - `specs/followups/consumed/2026/04/18/20260418-0542-branch-protection-setup.md`
  - `specs/followups/consumed/2026/04/18/20260418-0542-ci-manual-verify.md`
- 외부 참고: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
