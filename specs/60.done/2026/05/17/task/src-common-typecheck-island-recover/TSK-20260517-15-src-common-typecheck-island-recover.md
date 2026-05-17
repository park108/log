# Task: `src/common/` typecheck island 자격 회복 (109 error → 0 hit, 10 file)

> **Task ID**: TSK-20260517-15
> **출처 spec**: `specs/30.spec/green/foundation/typecheck-island-extension.md` §동작 1·2·3 + §수용 기준 Must FR-01·FR-03 + §테스트 현황 I2·I3 (부분)
> **관련 요구사항**: REQ-20260517-077
> **depends_on**: []
> **supersedes**: (없음)

## 배경
HEAD=`79d28cc` baseline 실측 (npx tsc --noEmit): `src/common/` 109 error / 10 file / 17 unique TS code. spec §스코프 규칙 (G4) 박제 분포 정합. 5 카테고리 패턴 — (a) URL/Location mock 비호환 (`TS2322`/`TS2339`/`TS2790` 13+13+13), (b) `delete` operator 비-optional 피연산자 (`TS2790` 일부), (c) implicit any (`TS7005`/`TS7006`/`TS7034` 13+13+12 = 38건), (d) possibly undefined optional chaining (`TS18047`/`TS18048`/`TS2722` 6+4+3), (e) CSS Module 인덱스 (`TS2769` Toaster 와 공통 — common 영역에는 미진입). 본 task 는 `src/common/` 109 hit → 0 hit + `tsc --noEmit` 영역 격리 PASS 수렴으로 (I2) marker 회복 + (I3) 의 common 영역 회수 chain 진입.

NFR-04 (회피 정책): `@ts-expect-error` / `@ts-ignore` baseline 0 hit (HEAD=`79d28cc` 실측). 본 task 회복 후 ≤ 0 유지 — 우회 주석 일괄 도입 시 NFR-04 위반 = 본 task DoD 미충족.

회복 수단은 spec §동작 5 박제 4 카테고리 (CSS Module 헬퍼 / `as string` cast / non-null assertion / tsconfig 정책 예외) 어느 쪽이든 수용 (수단 중립) — 단 본 task 의 common 영역은 CSS Module 패턴 (TS2769) 0 hit 이므로 카테고리 (a)~(d) 회복 수단이 실효.

## 변경 범위
| 파일 | 동작 | 핵심 |
|------|------|------|
| `src/common/common.test.ts` | 수정 | 62 error 회복 — URL/Location mock 패턴 재설계 (5 카테고리 (a)(b)(c)(d) 분포). 본 task 의 최다 hit 파일. |
| `src/common/common.ts` | 수정 | 11 error 회복 — implicit any + possibly undefined 패턴. |
| `src/common/ErrorBoundary.test.tsx` | 수정 | 9 error 회복 — mock 시그니처 + possibly undefined. |
| `src/common/Navigation.test.tsx` | 수정 | 8 error 회복 — implicit any + mock. |
| `src/common/UserLogin.test.tsx` | 수정 | 6 error 회복 — implicit any + mock. |
| `src/common/a11y.audit.test.ts` | 수정 | 6 error 회복 — implicit any + DOM 인덱스 패턴. |
| `src/common/UserLogin.tsx` | 수정 | 3 error 회복 — possibly undefined + cast. |
| `src/common/markdownParser.ts` | 수정 | 2 error 회복 — possibly undefined. |
| `src/common/useHoverPopup.ts` | 수정 | 1 error 회복 — possibly undefined. |
| `src/common/ErrorBoundary.tsx` | 수정 | 1 error 회복 — possibly undefined. |

10 file 단일 PR — 영역 정합 (모두 `src/common/`). 카테고리 통일 (typecheck 0 hit 수렴 단일 효능). rollback 단위 = 1 commit revert.

## 구현 지시
1. **카테고리 (a) URL/Location mock 패턴 재설계** (`common.test.ts` + `*.test.tsx` 다수):
   - `Object.defineProperty(window, 'location', { value: { ... } })` 형태에서 `URL` 객체 호환 모킹으로 전환. `replace()` / `assign()` 메서드 시그니처 (`(url: string | URL) => void`) 충족.
   - 또는 `@testing-library` 권장 패턴 — `vi.spyOn(window.location, ...)` (수단 자유).
2. **카테고리 (b) `delete` operator 비-optional 피연산자**:
   - `delete obj.requiredKey` → `(obj as Partial<typeof obj>).requiredKey` 또는 `delete (obj as any).requiredKey` (후자 NFR-04 회피 주의 — `as any` cast 는 우회 주석 아니므로 NFR-04 미해당, 단 RULE-07 수단 중립 정합).
3. **카테고리 (c) implicit any** (`TS7005`/`TS7006`/`TS7034` 38건):
   - 함수 인자 / 변수 / 반환 타입에 명시적 타입 annotation 추가. 가장 흔한 패턴 = `(arg) => ...` → `(arg: SomeType) => ...`.
   - inference 가 가능한 경우 변수 초기화 형태로 변경 (`let x;` → `let x: SomeType = ...;`).
4. **카테고리 (d) possibly undefined** (`TS18047`/`TS18048`/`TS2722` 13건):
   - optional chaining 결과에 non-null assertion (`!`) 또는 명시적 null 체크 (`if (x) { ... }`) 또는 `as Type` cast.
5. **수단 라벨 0** (spec FR-04): 본 task 구현 시 commit message / code comment 에 "기본값" / "권장" / "우선" / "default" / "best practice" 부여 금지. spec FR-04 (G7) 정합 — 본 task 회복 후 spec §스코프 규칙 (G7) 자기 검증 PASS 유지 (spec 본문 한정 0 hit, 본 task code 는 영역 밖이나 동일 정책 권장).
6. **우회 주석 회피** (NFR-04 / G8): `@ts-expect-error` / `@ts-ignore` 일괄 도입 금지. 회복 후 `grep -rn "@ts-expect-error\|@ts-ignore" src/Toaster src/common` → 0 hit 유지 의무.
7. **회복 검증 — `src/common/` 영역 격리**:
   - 본 task PR 시점에 `npx tsc --noEmit 2>&1 | grep -E "^src/common/" | grep -cE "error TS"` → 0 hit 수렴.
   - `src/Toaster/` 19 error 는 TSK-20260517-16 영역 (별 PR) — 본 task 미관여. 전반 `npm run typecheck` exit=0 은 TSK-16 동반 머지 후 도래.

## 테스트
- **회복 검증** (단일 PR 적용 후):
  1. `npx tsc --noEmit 2>&1 | grep -E "^src/common/" | grep -cE "error TS"` → **0 hit** (현 baseline 109 hit → 0 hit, I2 marker flip).
  2. `npm test src/common` → 모든 기존 케이스 PASS 유지 (회복 수단이 시맨틱 회귀 0 — 테스트 패턴 재설계가 동일 효능 유지).
  3. `grep -rn "@ts-expect-error\|@ts-ignore" src/common` → **0 hit** (NFR-04 baseline 유지).
- **회귀 검증** (의도 위반 fixture):
  4. `src/common/` 에 `.jsx` / `.js` 파일 추가 시 — REQ-059 island 정의 전반부 위반 (별 게이트). 본 task 미관여.
  5. `tsconfig.json` `strict` / `noImplicitAny` / `noUncheckedIndexedAccess` 정책 약화 시 — spec §회귀 중점 정책 유지 가정 위반. 본 task 도입 시점 정책 유지 검증 (`grep -nE "\"strict\"\s*:\s*true" tsconfig.json` 1 hit).

## 검증/DoD
<!-- RULE-06 grep 게이트: spec §스코프 규칙 (G2)(G4)(G6)(G8) 대응 -->
- [ ] (G2 유지) `find src/common \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → **0 hit** (island 정의 전반부 PASS 유지 — REQ-059 정합, 현 baseline PASS 보존).
- [ ] (G4 회복) `npx tsc --noEmit 2>&1 | grep -E "^src/common/" | grep -cE "error TS"` → **0 hit** (현 baseline 109 hit → 0 hit, I2 marker flip).
- [ ] (G6 부분 회복) `npx tsc --noEmit 2>&1 | grep -oE "error TS[0-9]+" | sort | uniq -c | sort -rn` → 본 task 회복 후 common 분포 0 (Toaster 19건 TS2769 잔존, TSK-16 회수 대기).
- [ ] (G8 유지) `grep -rn "@ts-expect-error\|@ts-ignore" src/Toaster src/common` → **0 hit** (NFR-04 baseline 유지 — 우회 주석 일괄 도입 금지).
- [ ] `npm test src/common` → 모든 기존 테스트 PASS.
- [ ] `npm run lint` → 0 error (코드 변경 영역).
- [ ] 수동 검증: PR diff 에 `@ts-expect-error` / `@ts-ignore` 0 추가 (NFR-04 자기 검증).

## 스코프 규칙
- **expansion**: 불허 (영역 정합 — `src/common/` 디렉터리 한정. `src/Toaster/` 는 TSK-16, `src/Log/` · `src/Monitor/` 등 비-island typecheck error 는 별 spec `src-typescript-migration` 영역 — scope 밖 변경 시 PR 분리).
- **grep-baseline** (HEAD=`79d28cc`, 2026-05-17 — planner carve 시점 실측 `npx tsc --noEmit`):
  - `npx tsc --noEmit 2>&1 | grep -E "^src/common/" | grep -cE "error TS"` → **109 hit** (HEAD=`79d28cc` 실측 — 본 task 회복 대상).
  - 파일 분포 (`awk -F'[(:]' '{print $1}' | sort | uniq -c`):
    - `src/common/common.test.ts` 62
    - `src/common/common.ts` 11
    - `src/common/ErrorBoundary.test.tsx` 9
    - `src/common/Navigation.test.tsx` 8
    - `src/common/UserLogin.test.tsx` 6
    - `src/common/a11y.audit.test.ts` 6
    - `src/common/UserLogin.tsx` 3
    - `src/common/markdownParser.ts` 2
    - `src/common/useHoverPopup.ts` 1
    - `src/common/ErrorBoundary.tsx` 1
  - error code 분포 (`grep -oE "error TS[0-9]+" | sort | uniq -c`, src/common 영역만): `TS7006` 13 / `TS7005` 13 / `TS2790` 13 / `TS2339` 13 / `TS2322` 13 / `TS7034` 12 / `TS18047` 6 / `TS2365` 4 / `TS2362` 4 / `TS2345` 4 / `TS18048` 4 / `TS2722` 3 / `TS2532` 3 / `TS7031` 2 / `TS2704` 1 / `TS2488` 1.
  - `find src/common \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → **0 hit** (G2 island 정의 전반부 PASS — 본 task 시점 유지 의무).
  - `grep -rn "@ts-expect-error\|@ts-ignore" src/Toaster src/common` → **0 hit** (G8 NFR-04 baseline — 본 task 회복 후 유지 의무).
- **rationale**: spec §스코프 규칙 G4 의 회복 대상 (`src/common/` 109 hit / 10 file) 단일 PR 회수. G2 / G8 은 baseline PASS 유지 의무 (각각 island 정의 전반부 / NFR-04 우회 정책). expansion 불허 — `src/Toaster/` 영역 변경 시 PR 분리 (TSK-16 chain). 회복 수단은 spec §동작 5 박제 4 카테고리 자유 — 수단 중립 (RULE-07 정합).

## 롤백
단일 `git revert <sha>` 로 가능. revert 시 10 파일 일괄 baseline (109 error / 17 unique TS code) 복귀 — `tsc --noEmit` 종료 코드 ≠ 0 회귀 신호. CI `regression-gate.md` FR-01 (typecheck step) 의 baseline 보존 — 본 task 도입 전 = exit ≠ 0 상태, 도입 후 (TSK-16 동반) = exit 0 도래.

## 범위 밖
- `src/Toaster/` 19 hit (`TS2769` CSS Module 인덱스) 회복 — TSK-20260517-16 영역.
- `src/Log/` · `src/Monitor/` 잔존 비-island typecheck error — 별 spec `src-typescript-migration` 영역 (REQ-061 흡수 후 별 task chain).
- `tsconfig.json` `strict` / `noImplicitAny` / `noUncheckedIndexedAccess` 정책 변경 — spec §역할 정책 유지 가정, 변경 시 별 req 후보.
- ErrorBoundary fallback skeleton a11y/copy 계약 — REQ-074 관할 (`30.spec/blue/components/common.md` §스코프 규칙 (d/e)).
- `@ts-expect-error` / `@ts-ignore` 우회 주석 일괄 도입 — NFR-04 회피 정책 위반 영역.
- 후속 followups: 본 task 머지 후 `src/common/common.test.ts` 의 URL/Location mock 패턴 재설계 시 inspector 가 `spec common/env.md` 또는 신규 mock 패턴 spec 박제 후보 검토 (모듈 횡단 mock 패턴 일관성).
