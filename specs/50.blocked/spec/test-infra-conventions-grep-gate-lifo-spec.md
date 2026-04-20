# 테스트 인프라 규약 보강 — grep 게이트 정밀 패턴 + vitest afterEach LIFO 박제

> **위치**: `.claude/rules/RULE-06-TASK-SCOPE.md`, `src/setupTests.js`, `.claude/templates/spec.md`, `.claude/templates/task.md`
> **관련 요구사항**: REQ-20260421-006 (TSK-20260421-42 수행 중 관측된 두 followup 병합)
> **최종 업데이트**: 2026-04-21 (by inspector, Phase 3 seed)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=01e5d42).

## 역할
TSK-20260421-42 수행에서 관측된 **테스트 인프라 규약 두 축의 사소한 결함** 을 한 REQ 로 병합해 보강한다. (A) RULE-06 §역할 에 `afterEach(...)` 등록과 `it` 본문 호출을 구분하는 **정밀 grep 패턴** 지침 1~3줄 박제 + ripgrep 샘플 커맨드. (B) `src/setupTests.js` 상단 주석에 **vitest `afterEach` 실행 순서 = inner → outer (LIFO)** 1~2줄 박제. (C) `.claude/templates/{spec,task}.md` DoD 예시에 정밀 패턴 샘플 1건 주석 추가. (D) 기존 `src/**/*.test.{js,jsx}` 중 "전역 teardown 사후 상태 의존 afterEach" 1회 감사 — 결과는 result.md 에 목록 박제 (수정 없음). **런타임 소스 수정, 테스트 파일 afterEach 리팩터, 발행된 `40.task/ready/**` rewrite, 신규 rule 파일 추가는 본 spec 밖**.

## 공개 인터페이스
- **FR-01 (Must) — RULE-06 정밀 패턴 지침**: `.claude/rules/RULE-06-TASK-SCOPE.md` 의 §역할 또는 §섹션 스펙 하단에 아래 형태의 지침 1~3줄 박제. ripgrep 샘플 커맨드 포함.
  ```markdown
  ## 정밀 패턴 권고 (afterEach vs 본문 호출)
  grep 게이트가 `afterEach` 등록 잔존을 검증할 때는 `afterEach\s*\([^)]*<fn>\s*\(\s*\)` 형태의 **등록 한정 패턴** 을 우선 사용한다. `it` 본문의 직렬화 호출을 잘못 잡지 않도록 한다.
  예: `rg -nE "afterEach\s*\([^)]*vi\.useRealTimers\s*\(\s*\)" src --glob="*.test.{js,jsx}"`
  멀티라인 블록은 `rg --multiline -U` 또는 `-A 3` 컨텍스트 + 수동 필터.
  ```
- **FR-02 (Must) — setupTests.js LIFO 박제**: `src/setupTests.js` 상단 기존 주석 블록 내부 또는 전역 `afterEach` 블록 직전에 1~2줄 추가:
  ```js
  //   • vitest `afterEach` 실행 순서는 inner (describe) → outer (setup 파일) = LIFO.
  //     전역 teardown 의 사후 상태를 로컬 describe 훅에서 단정하려면 `it` 본문
  //     직렬화 또는 `afterAll` 사용 (https://vitest.dev/api/#afterEach).
  ```
- **FR-03 (Should) — 템플릿 DoD 예시**: `.claude/templates/spec.md` 또는 `.claude/templates/task.md` 의 DoD/스코프 규칙 예시에 정밀 패턴 샘플 1건 주석 추가. 예:
  ```markdown
  <!-- grep 게이트 예: rg -nE "afterEach\s*\([^)]*<fn>\s*\(\s*\)" src --glob="*.test.{js,jsx}" → 0 hits -->
  ```
- **FR-04 (Should) — 기존 test 파일 1회 감사**: `grep -rnE "afterEach" src --include="*.test.{js,jsx}"` 결과에서 "전역 teardown 사후 상태 의존" 구조를 1회 훑어 result.md §감사 결과 에 목록 박제. 0건 포함 가능. **수정 없음** — 위험 발견 시 followup 분기.
- **FR-05 (Must) — React 18 baseline 회귀 0**: `npm test` → **46 files / 369 tests green** 유지 (주석만 추가 예상이므로 동작 영향 0).
- **FR-06 (Must) — 린트**: `npm run lint` → 0 warn / 0 error.

## 동작
1. **RULE-06 보강** — 기존 본문 유지, §역할 직후 또는 §섹션 스펙 하단에 §"정밀 패턴 권고" 추가. 기존 §섹션 스펙·§expansion 의미·§역할 본문은 불변.
2. **setupTests.js 주석 추가** — 현 주석 블록은 이미 장문 (L1~L57). LIFO 박제는 §fake-timer 이디엄 규칙 섹션 (L26~L45) 하단 또는 전역 `afterEach` 선언 (L66~L69) 직전 행간 주석으로 추가. 코드 로직 변경 0 — 순수 comment.
3. **템플릿 업데이트** — `.claude/templates/spec.md` §수용 기준 하단 또는 `.claude/templates/task.md` §스코프 규칙 내 `grep-baseline` 예시 옆에 HTML 주석 (`<!-- ... -->`) 으로 정밀 패턴 샘플 1건 추가. 기존 템플릿 구조는 불변.
4. **감사** — `rg -nE "afterEach" src --glob="*.test.{js,jsx}"` 로 전체 afterEach 등록 지점 나열. 각 hit 에 대해 "전역 `setupTests.js` afterEach 의 사후 상태 (예: `vi.useRealTimers()` 해제 후 `vi.isFakeTimers() === false` 단정) 를 로컬 afterEach 에서 기대하는 구조" 여부를 점검. 대상 있으면 파일:라인 목록을 result.md 에 박제. 0건이면 "감사 완료 — 대상 0" 박제.
5. **실측** — `npm test` 46/369 green 유지 + `npm run lint` 0/0.

### Baseline (2026-04-21, HEAD=01e5d42)
- `.claude/rules/RULE-06-TASK-SCOPE.md` 현 길이 26 lines (§역할까지). §정밀 패턴 권고 섹션 부재.
- `src/setupTests.js` 현 길이 82 lines. 본문에 "LIFO" 문자열 0 hits (`grep -n "LIFO" src/setupTests.js` → 0).
- `grep -n "afterEach\\\\s\\*\\\\([^)]\\*" .claude/rules/RULE-06-TASK-SCOPE.md` → 0 hits (정밀 패턴 예시 부재).
- `.claude/templates/spec.md` / `.claude/templates/task.md` 에 grep 패턴 주석 예시 부재.
- `npm test` (현 HEAD) → 46 files / 369 tests green.
- 연관 TSK-42 완료 커밋: `c18132d` (fake-timer teardown 잔존 afterEach 제거 + 메타 어서트 순서 의존 제거).

## 의존성
- 내부: `.claude/rules/RULE-06-TASK-SCOPE.md`, `src/setupTests.js`, `.claude/templates/spec.md`, `.claude/templates/task.md`.
- 외부: vitest (`afterEach` 실행 모델), ripgrep (권장 grep 패턴 예시).
- 역의존: 추후 발행되는 모든 task 의 `## 스코프 규칙` §grep-baseline — 정밀 패턴 우선 권고를 따른다. `.claude/rules/RULE-01~05` 와 충돌 없음 (본 spec 은 RULE-06 내 보강만).

## 테스트 현황
- [x] 현 HEAD `npm test` → 46 files / 369 tests green (baseline).
- [x] RULE-06 본문 26 lines 파악 완료 (§정밀 패턴 권고 부재 확인).
- [x] setupTests.js 82 lines 파악 완료 (LIFO 박제 부재 확인).
- [ ] FR-01 적용 후 RULE-06 에 정밀 패턴 섹션 + ripgrep 샘플 존재.
- [ ] FR-02 적용 후 `grep -n "LIFO" src/setupTests.js` → ≥ 1 hit.
- [ ] FR-03 적용 후 `.claude/templates/{spec,task}.md` 에 정밀 패턴 주석 1건.
- [ ] FR-04 감사 결과 result.md 박제.
- [ ] FR-05 회귀 0 (46/369).
- [ ] FR-06 lint 0/0.

## 수용 기준
- [ ] (Must, FR-01) `grep -nE "afterEach" .claude/rules/RULE-06-TASK-SCOPE.md` → **≥ 1 hit** (정밀 패턴 섹션 도입). `grep -nE "ripgrep|rg -" .claude/rules/RULE-06-TASK-SCOPE.md` → ≥ 1 hit (샘플 커맨드 박제).
- [ ] (Must, FR-02) `grep -n "LIFO" src/setupTests.js` → **≥ 1 hit** (1~2줄 주석, 순수 comment 으로 동작 영향 0).
- [ ] (Should, FR-03) `grep -nE "afterEach\\\\s\\*\\\\(" .claude/templates/spec.md .claude/templates/task.md` → **≥ 1 hit** (둘 중 한 파일에 예시 주석 1건 이상).
- [ ] (Should, FR-04) result.md §감사 결과 에 "전역 teardown 사후 상태 의존 afterEach" 대상 파일 목록 (0건 포함 가능) 박제. 감사 명령어 `rg -nE "afterEach" src --glob="*.test.{js,jsx}"` 의 처리 기록 1줄 이상.
- [ ] (Must, FR-05) `npm test` → **46 files / 369 tests green** (주석·문서만 추가이므로 회귀 0).
- [ ] (Must, FR-06) `npm run lint` → 0 warn / 0 error.
- [ ] (NFR-01) RULE-06 기존 §섹션 스펙·§expansion 의미·§역할 본문 불변 (diff 는 추가만, 기존 라인 수정 금지).
- [ ] (NFR-02) `git diff --stat` 변경 파일 ≤ 4 (`.claude/rules/RULE-06-TASK-SCOPE.md` + `src/setupTests.js` + `.claude/templates/spec.md` + `.claude/templates/task.md`). `src/**` 런타임 (setupTests.js 제외) 0 변경.
- [ ] (NFR-03) 추가 문구 5줄 이내로 간결 — RULE-06 §정밀 패턴 권고 ≤ 5줄, setupTests.js 추가 주석 ≤ 2줄, 템플릿 추가 ≤ 1줄.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline** (2026-04-21, HEAD=01e5d42):
  - `grep -nE "afterEach" .claude/rules/RULE-06-TASK-SCOPE.md` → 0 hits.
  - `grep -nE "ripgrep|rg -" .claude/rules/RULE-06-TASK-SCOPE.md` → 0 hits.
  - `grep -n "LIFO" src/setupTests.js` → 0 hits.
  - `grep -nE "afterEach\\\\s\\*\\\\(" .claude/templates/spec.md .claude/templates/task.md` → 0 hits.
  - `rg -nE "afterEach" src --glob="*.test.{js,jsx}"` → (FR-04 감사 시점에 재실행해 결과 박제).
- **rationale**: 본 spec 은 **문서·주석 수준 보강** 만 허용한다. RULE-06 본문 rewrite, 신규 rule 파일 생성, 기존 test 파일의 afterEach 구조 수정은 Out-of-Scope. 발행 task 는 `.claude/rules/`, `src/setupTests.js`, `.claude/templates/` 외 파일 변경 시 **즉시 `50.blocked/task/` 로 격리** (RULE-06 expansion=불허). setupTests.js 수정은 주석만 허용 — 코드 라인 변경 시 게이트 위반.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — | 최초 등록 (REQ-20260421-006 반영; grep 정밀 패턴 지침 + vitest afterEach LIFO 박제 + 템플릿 샘플 + 기존 test 1회 감사) | all |
