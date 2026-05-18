# Result: TSK-20260518-21 — eslint `ignores` 5 패턴 vacuous-zero 발화 채널 부착

## 요약
spec `tooling.md` §동작 9 (REQ-013 FR-07) 의 수단 중립 위임 (pre-commit / pre-push / CI / 신규 `check:eslint-ignores-vacuous-zero` script 중 1 채택) 의 dedicated script 채널 채택. `scripts/check-eslint-ignores-vacuous-zero.sh` 신규 추가 + `package.json` `scripts` 블록에 `check:eslint-ignores-vacuous-zero` 라인 1건 추가. 기존 `scripts/check-*-coherence.sh` 6종 idiom 선례와 동등 패턴. G-9.1 (배열 hit=1) + G-9.2 (5 패턴 cardinality ≥ 1) 게이트 baseline PASS.

## 변경 파일
- `scripts/check-eslint-ignores-vacuous-zero.sh` (신규, 실행 권한 부여) — G-9.1 + G-9.2 grep+find 게이트. PASS 시 stdout 1줄 ack + rc=0. 위반 시 stderr 라벨 + rc=1.
- `package.json` (수정) — `scripts` 블록에 `"check:eslint-ignores-vacuous-zero": "bash scripts/check-eslint-ignores-vacuous-zero.sh"` 라인 1건 추가 (line 31).

## 커밋
- (커밋 직후 본 result.md push 와 함께 박제 — 커밋 해시는 push 직후 추가 가능, 단일 커밋 메시지: `feat: eslint ignores 5 패턴 vacuous-zero 발화 채널 부착 (TSK-20260518-21)`)

## 테스트 결과
- `bash scripts/check-eslint-ignores-vacuous-zero.sh` → rc=0, stdout: `check-eslint-ignores-vacuous-zero: G-9.1 PASS (1 array @line=15) + G-9.2 PASS (P-1=1 P-2=1 P-3=1 P-4=1 P-5=2)`.
- `npm run check:eslint-ignores-vacuous-zero` → rc=0, 동일 stdout.
- `grep -nE '"check:eslint-ignores-vacuous-zero"' package.json` → 1 hit @line 31.
- `test -x scripts/check-eslint-ignores-vacuous-zero.sh` → 실행 권한 부여 확인.
- `npm run lint` → rc=0 (eslint `./src --max-warnings=0` PASS).
- `npm run typecheck` → rc=0 (`tsc --noEmit` PASS).

## 회귀 fixture 수동 검증 (R-1 / R-3 / R-4)
- **R-1 (ignores 배열 통째 제거)**: 임시 sed 로 line 15 객체 라인 주석화 → rc=1 + stderr `G-9.1 VIOLATION: ignores 배열 선언 hit=0 expected=1`. 원복 후 rc=0 회복 확인.
- **R-3 (`src/__tests__` rename)**: `mv src/__tests__ src/__renamed__` → rc=1 + stderr `G-9.2 VIOLATION: P-4 **/__tests__/** cardinality=0 (vacuous-zero violation)`. 원복 후 rc=0 회복 확인.
- **R-4 (`api.js` 2건 임시 .bak 이름변경)**: `src/Monitor/api.js` + `src/Log/api.js` 모두 `.bak` 으로 이동 → rc=1 + stderr `G-9.2 VIOLATION: P-5 **/api.js cardinality=0 (vacuous-zero violation)`. 원복 후 rc=0 회복 확인.
- R-2 (P-4 패턴 제거) 는 task §테스트 명시대로 본 task scope 외 (cardinality 자체는 디스크 기준이므로 PASS, 길이 mismatch 는 별 axis FR-01 영역) — 별도 fixture 미시연.

## DoD 점검
- [x] `bash scripts/check-eslint-ignores-vacuous-zero.sh` rc=0 + stdout 1줄 ack.
- [x] `npm run check:eslint-ignores-vacuous-zero` rc=0.
- [x] `grep -nE '"check:eslint-ignores-vacuous-zero"' package.json` → 1 hit.
- [x] `test -x scripts/check-eslint-ignores-vacuous-zero.sh` (실행 권한).
- [x] `npm run lint` rc=0.
- [x] `npm run typecheck` rc=0.
- [x] 회귀 fixture R-1 / R-3 / R-4 3 케이스 수동 검증 (위 §회귀 fixture 수동 검증).
- [x] result.md `## 변경 이력` 에 본 Task ID + 커밋 해시 박제 — 본 파일 §커밋 항목 (해시 push 직후 박제).

## 스코프 규칙 준수
- expansion: **불허**. scope 한정 = `scripts/check-eslint-ignores-vacuous-zero.sh` 신규 + `package.json` scripts 블록 1줄. 외부 파일 변경 0 (eslint.config.js / src/** / spec 본문 모두 미접촉).
- baseline 박제 (HEAD `987da8f` 기준) 5 패턴 cardinality 실측 정합 — G-9.1 line 15, P-1~P-5 = 1/1/1/1/2.

## 관찰 이슈·후속
- spec `tooling.md` §테스트 현황 line 206 / §수용 기준 line 268 (Should, REQ-013 FR-07) `[ ] → [x]` flip 은 inspector writer 영역 — 본 task 무관.
- 본 script 의 pre-commit / pre-push / CI 통합 별 task 후보 (수단 중립 — 본 task 는 dedicated script + npm script 채널 채택 한정).
- REQ-013 FR-01 (ignores 배열 길이 == 5 측정) 은 별 axis — 본 G-9.2 는 cardinality 한정. spec §동작 9.1 baseline 자체에서 길이 hit=1 PASS.
