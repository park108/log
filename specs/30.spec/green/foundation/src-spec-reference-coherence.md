# src → spec 참조 경로 정합 (RULE-01 `-spec` suffix 금지 + 부재 경로 0 hit)

> **위치**: 횡단 시스템 불변식 — `src/**` 내 spec 참조 주석 전체. 단일 식별자 없음 (게이트는 grep / `test -e` 측정).
> **관련 요구사항**: REQ-20260517-071
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제)

> 본 spec 은 시스템 횡단 게이트. 라인 번호 박제 없음 — 11 hit baseline 은 §스코프 규칙 grep-baseline 에 박제 (작성 시 inspector 책임).

## 역할
`src/**` 내 소스/테스트/CSS 파일 주석이 `specs/30.spec/**` 문서를 참조할 때 (a) RULE-01 (`30.spec/{blue,green}/**/<slug>.md`) `-spec` suffix 금지 규약을 준수하고 (b) 참조 경로가 디스크 상 실재 파일로 해석되어야 한다는 **상시 시스템 계약**. 의도적으로 하지 않는 것: 부재 spec 의 신규 박제, 회수 수단 선정 (정합 spec 신규 박제 vs 참조 주석 삭제 vs 경로 갱신), `docs/**`·`README.md` 등 src 외부 문서 참조, 비-spec 경로 (`docs/...`, MDN URL 등).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `src/**` ↔ `specs/30.spec/**` 간 참조 정합의 결과 효능을 grep / `test -e` 단일 명령으로 검증.

## 동작
1. (G1) RULE-01 suffix 정합 게이트
   - 명령: `grep -rnE "specs/30\.spec/[^\"\` ]*-spec\.md" src` → **0 hit**.
   - 의미: `src/**` 내 어떤 주석도 `<slug>-spec.md` 형식으로 spec 을 참조하지 않는다 (RULE-01 `-spec` suffix 금지 정합).
2. (G2) 디스크 실재 게이트
   - 절차: `src/**` 에서 `specs/30\.spec/(blue|green)/.*\.md` 패턴 매칭 경로를 모두 추출 → 각 경로에 `test -e` → **전원 EXISTS**.
   - 의미: src 주석이 가리키는 spec 파일이 모두 디스크 상 실재한다 (dead-link 0).
3. (G3) 시점 비의존
   - G1 ∧ G2 는 spec 신규 박제·삭제·이동·rename·green→blue promote 등 어떤 이벤트 직후에도 동일 측정으로 0 hit / 0 MISSING 유지. 이벤트 발생 시 1 PR 안에 src 주석 동기화 (G2 회복) 또는 src 참조 주석 삭제 (G2 회피).
4. (G4) 범위 제한
   - 본 게이트는 `src/**` 한정. `docs/**`, `README.md`, `eslint.config.js`, `vite.config.ts`, `vitest.config.ts`, `package.json` 등 src 외부의 spec 참조는 본 게이트 범위 밖.

## 의존성
- 내부: `src/**` (게이트 입력 영역). `specs/30.spec/{blue,green}/**` (G2 디스크 검증 대상).
- 외부: 없음 (런타임 의존 0). 게이트 실행은 `grep`, `test`, POSIX shell 만 요구.
- 역의존 (사용처): RULE-01 PIPELINE 파일명 규약, RULE-07 SPEC CONTENT 양성 기준. CI lint step 또는 pre-commit 훅 또는 `npm run lint` 부속 스텝 (수단은 task 위임).

## 테스트 현황
- [x] (G1) `grep -rnE "specs/30\.spec/[^\"\` ]*-spec\.md" src` → 0 hit 게이트 — TSK-20260517-05 회수 (11 hit → 0 hit, HEAD=`7154b8e` 실측 0 hit).
- [x] (G2) src 추출 spec 참조 경로 전원 `test -e` 통과 — TSK-20260517-05 회수 (7 MISSING → 0, 참조 자체 삭제로 추출 paths 비어짐, HEAD=`7154b8e` 실측 0 path).
- [ ] (G3) CI / pre-commit 훅 / `npm run lint` 부속 스텝 박제 — 회귀 방지 자동 게이트 (TSK-20260517-06 발행, 미시행 — 40.task 큐 잔존).

## 수용 기준
- [x] (Must) `grep -rnE "specs/30\.spec/[^\"\` ]*-spec\.md" src` → 0 hit. baseline 11 hit / 8 file → TSK-20260517-05 회수 후 0 hit (HEAD=`7154b8e` 실측, inspector Phase 1 ack).
- [x] (Must) src 내 `specs/30\.spec/(blue|green)/.*\.md` 패턴 매칭 경로 N 개 추출 후 각 경로에 `test -e` → 전원 통과. baseline 7 경로 / 7 MISSING → TSK-20260517-05 회수 후 0 path / 0 MISSING (HEAD=`7154b8e` 실측, inspector Phase 1 ack).
- [ ] (Must) 본 두 게이트는 spec 박제·삭제·이동·rename·green→blue promote 등 이벤트 후 1 PR 안에 0 hit / 0 MISSING 유지 — 단일 사례 (TSK-20260517-05) 박제, 차기 이벤트 후 재검증으로 marker 플립 누적.
- [ ] (Should) 본 게이트는 CI lint step 또는 pre-commit 훅 또는 `npm run lint` 부속 스텝으로 자동 실행 — PR 단계 회귀 검출. 수단 (custom ESLint rule / npm script / husky hook) 선정은 task 위임 (TSK-20260517-06 발행, 미시행).
- [x] (Must, 범위 제한) `docs/**`, `README.md`, `eslint.config.js`, `vite.config.ts`, `vitest.config.ts`, `package.json` 등 src 외부 spec 참조는 본 게이트 위반으로 카운트되지 않음 (필요 시 별도 spec) — 정의상 항상 참, marker 플립.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 시스템 횡단 게이트 박제 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`a4037ec`, 2026-05-17):
  - `grep -rnE "specs/30\.spec/[^\"\` ]*-spec\.md" src` → **11 hits in 8 files**:
    - `src/Monitor/Monitor.css:122` → `specs/30.spec/green/common/accessibility-spec.md §4.A.9`
    - `src/Search/Search.test.tsx:252` → `specs/30.spec/blue/testing/search-abort-runtime-smoke-spec.md §3.11`
    - `src/common/ErrorFallback.tsx:10` → `specs/30.spec/green/common/error-boundary-spec.md §3.3`
    - `src/common/markdownParser.ts:385` → `specs/30.spec/green/common/markdownParser-spec.md §5.3.3`
    - `src/common/errorReporter.ts:7` → `specs/30.spec/green/common/error-boundary-spec.md §4.3`
    - `src/common/env.test.ts:4` → `specs/30.spec/green/common/env-spec.md §7, §5.3`
    - `src/common/sanitizeHtml.ts:3` → `specs/30.spec/green/common/sanitizeHtml-spec.md §5, §6`
    - `src/common/sanitizeHtml.test.ts:4` → `specs/30.spec/green/common/sanitizeHtml-spec.md §7`
    - `src/common/env.ts:4` → `specs/30.spec/green/common/env-spec.md §2.3, §5.1`
    - `src/common/Skeleton.tsx:10` → `specs/30.spec/green/common/error-boundary-spec.md §3.2`
    - `src/common/Skeleton.css:4` → `specs/30.spec/green/styles/css-modules-spec.md §3.1`
  - 부재 경로 검증 — `for p in <위 7 unique paths>; do test -e "$p" && echo EXISTS || echo MISSING; done` → **7/7 MISSING**.
  - `ls specs/30.spec/green/` → `foundation/` 단일 (common/styles/testing 부재).
  - `ls specs/30.spec/blue/` → `common/ components/ foundation/` (testing 부재).
- **rationale**: G1·G2 baseline 은 본 spec 발행 시점 박제 — 향후 회귀 분석 시 위반 hit 수 변화 추적 기준. 11 hit / 8 file / 7 path / 7 MISSING 은 §배경 측정값 기록일 뿐, 본 spec 의 §수용 기준은 hit 수 비의존 (RULE-07 정합).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-071 흡수) / `a4037ec` | 최초 박제 — `src/**` ↔ `specs/30.spec/**` 참조 경로 정합 두 축 게이트 (RULE-01 suffix 금지 + 디스크 실재). baseline 11 hit / 7 path / 7 MISSING. | all |
| 2026-05-17 | inspector (Phase 1 ack, TSK-20260517-05 회수) / `7154b8e` | G1 11 hit → 0 hit / G2 7 MISSING → 0 MISSING 실측 PASS. 테스트현황 G1·G2 + 수용기준 Must G1·Must G2·Must 범위제한 marker 플립. Should CI 게이트 (G3) 는 TSK-20260517-06 미시행으로 `[ ]` 유지. | 테스트 현황, 수용 기준 |
