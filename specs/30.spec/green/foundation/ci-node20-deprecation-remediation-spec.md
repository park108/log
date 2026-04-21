# CI Node.js 20 deprecation 해소 — actions v4→v6 + node-version 20→24

> **위치**: `.github/workflows/ci.yml` L16 (`actions/checkout@v4`), L19 (`actions/setup-node@v4`), L21 (`node-version: '20'`)
> **관련 요구사항**: REQ-20260421-012 (ci-node20-deprecation-remediation; 동일 ID 사용 req `layer2-cold-start-race-root-cause-rediagnosis` 와 id 충돌 — 원본 req 파일명으로 식별)
> **최종 업데이트**: 2026-04-21 (by inspector, Phase 3 신규 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=e1a9bef).

## 역할
GitHub Actions 러너에서 Node.js 20 deprecation warning (2026-06-02 강제 전환, 2026-09-16 제거) 이 매 run 마다 출력되는 상황을 `.github/workflows/ci.yml` 3 라인 변경으로 해소한다. action 런타임 바이너리 (`actions/checkout@v4`→`@v6`, `actions/setup-node@v4`→`@v6`) 과 애플리케이션 런타임 (`node-version: '20'`→`'24'`) 을 단일 변경 창구로 묶어 처리. **의존성 업그레이드·engines 필드 추가·워크플로 구조 변경·다른 파일 수정은 범위 밖**.

## 공개 인터페이스
변경 대상: `.github/workflows/ci.yml` 단일 파일 3 라인.
- L16: `uses: actions/checkout@v4` → `uses: actions/checkout@v6`
- L19: `uses: actions/setup-node@v4` → `uses: actions/setup-node@v6`
- L21: `node-version: '20'` → `node-version: '24'`

변경 불변:
- cache 전략 (`cache: 'npm'` L22), TZ env (L13), trigger branches (L5/L7), step 순서/이름/구성 (steps L14~34), job matrix 없음 유지.
- action 태그 형식: 메이저 floating (`@v6`). `@v6.0.2` / `@v6.4.0` 같은 sha-pin 은 본 spec 밖.

## 동작
1. (FR-01) `.github/workflows/ci.yml:16` — `uses: actions/checkout@v4` → `uses: actions/checkout@v6`.
2. (FR-02) `.github/workflows/ci.yml:19` — `uses: actions/setup-node@v4` → `uses: actions/setup-node@v6`.
3. (FR-03) `.github/workflows/ci.yml:21` — `node-version: '20'` → `node-version: '24'`. 문자열 인용 형태(single quote) 유지.
4. (FR-04) `git diff .github/workflows/ci.yml` → 3 라인 변경, 타 라인 불변. `--stat` 집계 1 파일 / 3 insertions(+) / 3 deletions(-).
5. (FR-05) master push 후 CI run annotation 조회 — `Node.js 20 actions are deprecated` 0 건.
6. (FR-06) 동일 CI run 에서 `lint` / `test` / `build` 3 단계 모두 PASS.
7. (FR-07) `package.json` / `package-lock.json` 불변 확인. `engines.node` 필드 추가 금지.
8. (FR-08, Should) CI run 에서 `test` 단계 실패 시 원인 분석을 followup 으로 발행, 본 spec 에서 수정 확장 금지.

### 대안 (§참고만)
- **Node 22 LTS 한정**: Active LTS 안정성 우선. 기각 — 2026-06-02 이후 GitHub 러너 기본값이 Node 24 이므로 Node 22 채택 시 단기 재전환 비용 발생. 핵심 deps (`vite@8.0.8`, `vitest@4.1.4`, `eslint@9.39.4`) 전원 Node 24 지원 확인.
- **sha-pin (`actions/checkout@<sha>`)**: 보안 관점 권장. 기각 — 본 REQ 는 경고 해소 단일 목표로 범위 최소화. 별건 REQ 로 후속 검토.
- **`engines.node` 도입**: 런타임 계약 명시화. 기각 — 본 REQ 의 변경 최소화 원칙과 상충, 별건 후속 검토.

## 의존성
- 내부: `.github/workflows/ci.yml` (단일 변경 파일).
- 외부:
  - `actions/checkout@v6` — v6.0.2 (2026-01-09 릴리스, Node.js 24 기반).
  - `actions/setup-node@v6` — v6.4.0 (2026-04-20 릴리스, Node.js 24 기반).
  - Node.js 24 러너 바이너리 (GitHub Actions ubuntu-latest).
  - 핵심 deps engines.node 실측:
    - `vite@8.0.8` — `^20.19.0 || >=22.12.0` → Node 24 충족.
    - `vitest@4.1.4` — `^20.0.0 || ^22.0.0 || >=24.0.0` → Node 24 명시.
    - `eslint@9.39.4` — `^18.18.0 || ^20.9.0 || >=21.1.0` → Node 24 충족.
- 역의존: 없음 — `ci.yml` 은 다른 워크플로 / 소스 / 테스트가 참조하지 않음.
- baseline CI run: master HEAD `1bbdbb0` run `24700462600` — 46 files / 376 tests PASS, annotation `Node.js 20 actions are deprecated` 1 건.

## 테스트 현황
- [x] 현 HEAD `.github/workflows/ci.yml` 실측: L16 `actions/checkout@v4`, L19 `actions/setup-node@v4`, L21 `node-version: '20'` 확인 (HEAD=e1a9bef).
- [x] CI run `24699204973` / `24700462600` 에서 Node.js 20 deprecation warning annotation 재현 박제 (REQ 배경).
- [x] 핵심 deps engines.node Node 24 호환 실측 박제 (REQ 배경).
- [ ] FR-01/02/03 변경 적용 후 `git diff --stat .github/workflows/ci.yml` → 1 file / 3 insertions / 3 deletions.
- [ ] FR-05 변경 후 CI run annotation 에서 `Node.js 20 actions are deprecated` 0 건.
- [ ] FR-06 변경 후 CI run 에서 `lint` / `test` / `build` 3 단계 PASS (baseline 46 files / 376 tests).
- [ ] FR-07 `package.json` / `package-lock.json` 변경 0 건.

## 수용 기준
- [ ] (Must) FR-01 — `.github/workflows/ci.yml:16` `uses: actions/checkout@v6`.
- [ ] (Must) FR-02 — `.github/workflows/ci.yml:19` `uses: actions/setup-node@v6`.
- [ ] (Must) FR-03 — `.github/workflows/ci.yml:21` `node-version: '24'`.
- [ ] (Must) FR-04 — `git diff --stat` 1 파일 / 3 라인 변경, diff 초과분 0.
- [ ] (Must) FR-05 — CI run annotation 에서 `Node.js 20 actions are deprecated` 0 건 (result.md 에 run ID 박제).
- [ ] (Must) FR-06 — `lint` / `test` / `build` 3 단계 모두 PASS (result.md 에 run ID + 각 단계 결과 박제).
- [ ] (Must) FR-07 — `package.json` / `package-lock.json` 변경 0 건.
- [ ] (Should) FR-08 — `test` 단계 실패 시 followup 발행 방침 1~2 줄 result.md 에 명시 (성공 시 자동 충족).
- [ ] (NFR-01) 변경 파일 1 개 / 변경 라인 3 줄 (diff stat 기준).
- [ ] (NFR-02) `test` 단계 실패 수 baseline 대비 동일 또는 개선.
- [ ] (NFR-03) `Node.js 20 actions are deprecated` 0 회.
- [ ] (NFR-04) Node 24 환경에서 `npm ci` / `npm run lint` / `npm test` / `npm run build` 4 명령 성공 (CI run 이 정본).
- [ ] (NFR-05) 단일 revert commit 으로 원복 가능 (3 라인 diff 범위 내).
- [ ] (NFR-06) result.md 에 (a) CI run ID, (b) 변경 전/후 annotation 개수, (c) 변경 전/후 test files/tests 합계, (d) 사용된 actions 태그(`@v6`) + node-version 값 박제.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=e1a9bef):
  - `grep -n "actions/checkout@v4" .github/workflows/ci.yml` → 1 hit at `:16` (변경 후 0 hits 예상).
  - `grep -n "actions/setup-node@v4" .github/workflows/ci.yml` → 1 hit at `:19` (변경 후 0 hits 예상).
  - `grep -n "node-version: '20'" .github/workflows/ci.yml` → 1 hit at `:21` (변경 후 0 hits 예상).
  - `grep -n "actions/checkout@v6" .github/workflows/ci.yml` → 0 hits (변경 후 1 hit at `:16` 예상).
  - `grep -n "actions/setup-node@v6" .github/workflows/ci.yml` → 0 hits (변경 후 1 hit at `:19` 예상).
  - `grep -n "node-version: '24'" .github/workflows/ci.yml` → 0 hits (변경 후 1 hit at `:21` 예상).
  - `grep -c "engines" package.json` → 확인용 (변경 후에도 동일 유지 — 추가 금지).
- **rationale**: `.github/workflows/ci.yml` 단일 파일 3 라인 수정만 허용. `package.json` / `package-lock.json` / 런타임 소스 / 테스트 / 다른 워크플로 / `.nvmrc` / secrets / permissions / env 변경 0 건. Node 22 절충안·sha-pin·engines 도입은 별건 REQ 경로. `test` 실패 시 본 spec 에서 패치 확장 금지 — followup 분리 (FR-08).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-012 ci-node20-deprecation-remediation 반영). `.github/workflows/ci.yml` 3 라인 변경 (actions v4→v6 + node-version 20→24) 단일 변경 창구. NFR-01 diff 3 라인 강제. | all |
