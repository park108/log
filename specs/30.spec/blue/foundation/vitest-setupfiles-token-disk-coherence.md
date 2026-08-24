# vitest `setupFiles` 토큰 ↔ 디스크 파일 양면 정합 + boot 시점 의미 동치 시스템 불변식

> **위치**: `vite.config.js` 의 `test.setupFiles` 토큰 + `src/setupTests.js` 디스크 파일 (보조: `vite.config.js:69`, `src/setupTests.js:14-15`)
> **관련 요구사항**: REQ-20260519-001
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: C단계 마커 회수 + green→blue promote)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD `9cba124` baseline).

## 역할
`vite.config.js` 의 `test.setupFiles` 단일 string 토큰 (= `'./src/setupTests.js'`) 과 디스크 파일 (`src/setupTests.js`) 간 양면 동치 + 디스크 파일 본문의 전역 `afterEach(() => vi.unstubAllEnvs())` cleanup 등록 점유 의미 동치 를 시스템 불변식으로 박제한다. 의도적으로 하지 않는 것: (i) 발화 채널 (pre-commit / pre-push / CI / `package.json check:*` script) 선정 — 수단 위임, (ii) `src/setupTests.js` 본문의 env-stub idiom 자체 (`vi.stubEnv` 호출 패턴 / MODE/DEV/PROD 짝맞춤) — 별 spec (`common/env.md` / `common/test-idioms.md`), (iii) vitest globals 식별자 채널 (`describe` / `it` / `vi` alias) — 자매 axis (`REQ-20260518-021`, done), (iv) `vite.config.js:test.*` 의 다른 magic number (environment / css / testTimeout / fileParallelism / coverage thresholds) — 별 axis, (v) `tsconfig.json:include` scope 영향 — 별 typecheck scope axis, (vi) 1회성 incident patch.

## 공개 인터페이스
- 토큰 surface: `vite.config.js` 의 `test.setupFiles` key (vitest `UserConfig.test.setupFiles` API surface).
- 토큰 형식: single string (array 형식 변경 시 본 spec §변경 이력 갱신 신호 — FR-01).
- disk surface: 토큰 path 가 지시하는 단일 파일 (현 baseline = `src/setupTests.js`).
- 본문 점유 surface: disk 파일 module 최상위에 등록된 전역 `afterEach` 콜백 + `vi.unstubAllEnvs()` 호출 (단일 등록).
- 검출 surface: 정적 명령 (`grep` + `test -f` + `wc -c`) 1차 채널 + `npm test` boot 시점 fail-signal 보조 채널.

## 동작
1. vitest boot 단계: `vite.config.js` 로드 → `test.setupFiles` path 값 resolve → 해당 파일 module load + execute.
2. resolve fail 시 boot fail (`Cannot find module ...` stderr + rc≠0) — FR-04 의 간접 검출 채널.
3. boot 통과 시: 디스크 파일 module 최상위 코드 실행 → 전역 `afterEach` 콜백 등록 (각 it 종료 직후 발화).
4. 후속 테스트 본문에서 `vi.stubEnv('MODE', ...)` / `DEV` / `PROD` 류 stub 호출 → it 종료 시 등록된 cleanup (`vi.unstubAllEnvs()`) 가 모든 stub 을 reset → 다음 테스트 진입 시 env state 격리 보장.
5. 회귀 시나리오:
   - (a) 토큰 path 값 typo (`'./src/setupTests.ts'`) + disk 파일 `.js` 유지 → boot fail (1차 fail-signal).
   - (b) disk 파일 삭제 → boot fail (1차 fail-signal).
   - (c) disk 파일 본문이 빈 파일 또는 `afterEach(() => vi.unstubAllEnvs())` 라인 삭제 → boot 통과, env-stub idiom leak (silent regression) → FR-03 의 정적 grep 채널 으로 1차 검출 (`grep -cE "afterEach\s*\(\s*\(\s*\)\s*=>\s*vi\.unstubAllEnvs\s*\(\s*\)\s*\)" src/setupTests.js` → 0 hit).
   - (d) 토큰 형식 array 확장 (`['./src/setupTests.js', './src/extra.js']`) → FR-01 단일 string baseline 변동 신호 (본 spec §변경 이력 갱신 발화).
   - (e) `setupFiles` API surface 자체가 vitest major bump 으로 deprecate / rename → FR-06 의 갱신 신호.

## 의존성
- 내부: `vite.config.js` (단일 토큰 surface), `src/setupTests.js` (디스크 파일 + 본문 cleanup 등록 surface).
- 외부: vitest UserConfig `test.setupFiles` API (string | string[] 형식), `vi.stubEnv` / `vi.unstubAllEnvs` API (env stub cleanup 채널), Node fs (boot 시점 module resolve).
- 역의존 (사용처): 모든 vitest 테스트 파일이 boot 시점 cleanup 등록의 보호 범위 안에서 실행.
- 직교 spec: `common/env.md` (env-stub idiom 본문), `common/test-idioms.md` (test helper idiom), `foundation/coverage-determinism.md` (vitest 측정 결정론 axis), `foundation/dependency-bump-gate.md` (bump 후 4 scripts exit 0 axis), `testing/console-error-runtime-zero.md` (console.error 런타임 채널 0 axis).
- 자매 패턴 (vite.config.js token ↔ 다른 surface 양면 정합): REQ-20260518-011 (`dev-server-port-getUrl-token-coherence`, done), REQ-20260518-006 (`index-html-root-mount-id-token-coherence`, done).

## 테스트 현황
- [x] `vite.config.js:69` `setupFiles: './src/setupTests.js',` 단일 string 토큰 등록 baseline (HEAD `9cba124` 실측 — `grep -nE "setupFiles" vite.config.js` → 1 hit @ line 69).
- [x] `src/setupTests.js` 디스크 파일 실재 + 8240 byte (HEAD `9cba124` 실측 — `test -f src/setupTests.js && wc -c src/setupTests.js` → exit 0 + 8240).
- [x] `src/setupTests.js` 본문 전역 `afterEach(() => vi.unstubAllEnvs())` 단일 등록 (HEAD `9cba124` 실측 — `grep -cE "afterEach\s*\(\s*\(\s*\)\s*=>\s*vi\.unstubAllEnvs\s*\(\s*\)\s*\)" src/setupTests.js` → 1 hit).
- [x] boot 시점 간접 검출 채널 — vitest 자체가 path resolve fail 시 boot fail (FR-04 의 보조 채널).
- [x] FR-04 의 1차 정적 명령 검출 채널 — `package.json` 신규 `check:setup-files-coherence` script 또는 `.husky/pre-commit` 진입점 부재 (현 baseline `grep -n "setupFiles\|setupTests\.js" .husky/* scripts/*.sh package.json` → 0 hit). 발화 채널 도입은 수단 위임 영역. — **회수**: `src/__tests__/build-policy-and-vitest-config-coherence.test.ts` 가 토큰 ↔ 디스크 실재 + `afterEach` 등록 본문을 함께 검사한다.

## 수용 기준
- [x] (Must / FR-01) Given `vite.config.js`, When `grep -cE "^[[:space:]]*setupFiles\s*:" vite.config.js` 실행, Then **1 hit + rc=0** (단일 토큰 등록). 0 또는 2 이상 hit 은 본 spec §변경 이력 갱신 신호.
- [x] (Must / FR-01) Given `vite.config.js`, When `grep -nE "setupFiles\s*:\s*'\./src/setupTests\.js'" vite.config.js` 실행, Then **1 hit** (baseline 토큰 값 박제, HEAD `9cba124` 시점 line 69). 토큰 값 변경 또는 array 형식 변동 시 0 hit 또는 다른 line shift.
- [x] (Must / FR-02) Given 디스크, When `test -f src/setupTests.js` 실행, Then **exit 0**; When `wc -c src/setupTests.js` 실행, Then > 0 byte (빈 파일 불가 — FR-03 의 본문 점유 precondition).
- [x] (Must / FR-03) Given `src/setupTests.js`, When `grep -cE "afterEach\s*\(\s*\(\s*\)\s*=>\s*vi\.unstubAllEnvs\s*\(\s*\)\s*\)" src/setupTests.js` 실행, Then **1 hit** (전역 cleanup 단일 등록). 0 hit 시 env-stub idiom leak 회귀 신호.
- [x] (Should / FR-05) 본 spec 의 게이트는 `vite.config.js` 토큰 + disk 파일 + 본문 cleanup 3 surface 한정 — 다른 setupFiles array 항목 추가 / 다른 lifecycle hook (`beforeEach` / `beforeAll` 등) 본문 등록은 본 spec 의 §수용 기준 외 (array 형식 변경 시 본 spec §변경 이력 갱신 신호).
- [x] (Should / FR-06) 본 spec 의 박제는 `vitest` / `vite` 메이저 bump 자체를 강제하지 않는다 — bump 후 `setupFiles` API surface 변경 (예: `setupFiles` → 다른 옵션 이름 / array 의무화) 시 본 spec §변경 이력 갱신 신호 (FR-01 의 토큰 이름 / 형식 변동 박제).
- [x] (Must / 회귀 가설 (a)) Given `vite.config.js:69` 토큰을 `'./src/setupTests.ts'` 로 변경 (확장자 typo), When `npm test` 실행, Then vitest boot fail (`Cannot find module` 류 stderr) + rc≠0 — 간접 검출 신호 ≥1 (FR-04 의 검출 채널 존재 증명).
- [x] (Must / 회귀 가설 (c)) Given `src/setupTests.js` 본문에서 `afterEach(() => vi.unstubAllEnvs())` 라인 1행 삭제, When 본 spec §FR-03 의 grep 명령 실행, Then 0 hit (FR-03 위반 정적 검출).
- [x] (baseline 박제) Given `.husky/pre-commit` / `.husky/pre-push` / `scripts/*.sh` / `package.json`, When `grep -lE "setupFiles\|setupTests\.js" .husky/pre-commit .husky/pre-push scripts/*.sh package.json` 실행, Then 현 baseline 0 hit (수단 위임 — 발화 채널 존재 자체는 FR-04 의 should 영역).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-19 | inspector 122차 tick / HEAD `9cba124` | REQ-20260519-001 흡수 — setupFiles 토큰 ↔ disk 양면 + 본문 cleanup 등록 3축 결과 효능 계약 박제 (FR-01·02·03·05·06 ack baseline + FR-04 deferred future-event-dependent) | all (신규) |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | C단계 마커 회수 — RULE-07 §수용 기준 문장 규약 적용. 판정 가능한 항목은 실측·주입 근거와 함께 flip, 미래 사건·미측정 NFR·자명 명제·별 축 위임 항목은 §참고 §미측정·비판정 항목 으로 강등. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |

## 참고

### deferred (blue 승격 시 강등)

> `[deferred]` 는 green 전용 상태다. blue 는 baseline 이므로 미결 태그를 갖지 않는다 (RULE-07 §promote).

- (Should / FR-04) FR-01·FR-02·FR-03 3 조건의 회귀는 자동 검출 채널 (단위 fixture 또는 boot 시점 fail-signal 또는 `grep` + `test -f` 1-line 명령) 을 통해 rc=0/1 결정론으로 판정된다. 발화 시점 채널 (pre-commit / pre-push / CI / `package.json` 신규 script) 선정은 수단 영역, "검출 채널 존재" 계약 자체는 박제. **[deferred: future-event-dependent — 발화 채널 도입 PR 미발생; 현 baseline 은 boot fail 간접 채널만 존재.]**. — **주입 검증**: 경로 typo → `Cannot find module` boot 실패 rc=1 (1차 fail-signal) / `vi.unstubAllEnvs()` 등록 삭제 → 1 failed / 8 passed (2차 정적 채널).
