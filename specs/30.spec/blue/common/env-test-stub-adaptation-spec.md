# 테스트 환경 분기 stub — Vite-native 전환 (process.env.NODE_ENV 재할당 제거)

> **위치**: `src/common/common.test.js` (17 hits), `src/Log/Log.test.jsx` (5), `src/Log/Writer.test.jsx` (6), `src/Log/LogItem.test.jsx` (5), `src/Log/LogSingle.test.jsx` (8), `src/Log/LogItemInfo.test.jsx` (3) / 헬퍼 `src/common/env.js:1-9`, `src/common/env.test.js:1-36`
> **관련 요구사항**: REQ-20260420-005
> **최종 업데이트**: 2026-04-20 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
`src/common/env.js` 의 `isDev()/isProd()/mode()` 가 Vite `import.meta.env.DEV/PROD/MODE` 를 반환하도록 정리된 상태에서, 6개 테스트 파일 44 hits 의 `process.env.NODE_ENV = ...` 런타임 재할당을 Vite-native stub (`vi.stubEnv` **또는** `vi.mock('@/common/env', ...)`) 으로 어댑테이션한다. 재할당은 Vite 의 정적 `import.meta.env` 치환에 영향 없어 분기 의미가 깨진 상태임. 런타임 소스 치환(`src/common/common.js`, `src/Log/api.js`) 은 본 spec 범위 밖 (REQ-20260420-002 / blue `common/node-env-helper-migration-spec.md` 담당).

## 공개 인터페이스
- 선택된 stub 전략 1종 — planner 가 spec 승격 시점에 고정. 후보:
  - **A (권장)**: `vi.stubEnv('MODE', 'production' | 'development' | 'test')` + `afterEach(() => vi.unstubAllEnvs())`. `DEV`/`PROD` 는 `MODE` 로부터 Vite 가 파생하거나 별도 `vi.stubEnv('DEV', bool)` 병용.
  - **B**: `vi.mock('@/common/env', () => ({ isDev: vi.fn(), isProd: vi.fn(), mode: vi.fn() }))` + per-test `mockReturnValue`.
- 전략 A 채택 시 노출 헬퍼 (Should, 선택적):
  - `src/setupTests.js` 에 `stubEnvMode(mode)` / `restoreEnv()` 유틸 — 6개 파일에서 일관 사용.
- 전략 B 채택 시 선언부만 테스트 파일 상단에 배치 (헬퍼 불필요).

## 동작
1. 6개 테스트 파일의 `process.env.NODE_ENV = '...'` 재할당 44 hits 를 전량 제거하고 선택된 stub 전략의 호출로 치환.
2. 각 테스트 블록의 stub 은 `afterEach` 에서 `vi.unstubAllEnvs()` (전략 A) 또는 `vi.restoreAllMocks()`/`vi.unmock('@/common/env')` (전략 B) 로 해제. 누수 0.
3. `npm test` (vitest run --coverage) — 전 스위트 green 유지. 특히 `setHtmlTitle`, `getUrl`, `isAdmin`, `auth`, Log 스위트의 production/development 분기 기대값 불변.
4. `src/common/env.test.js:24-26` 단위 테스트 — vitest 기본 MODE `"test"` 단언 회귀 0.
5. 채택 이디엄 규칙을 `src/setupTests.js` 헤더 주석 또는 `docs/` 1곳에 박제 (NFR-03 + Should).
6. 본 spec 완료 근거를 후속 result.md 에서 `specs/50.blocked/task/TSK-20260420-31-node-env-helper-migration.md` 의 해제 조건 충족으로 박제 (Should).

### 대상 파일 (baseline 2026-04-20, `grep -rn "process\.env\.NODE_ENV" src --include="*.test.*"`)
- `src/common/common.test.js` — 17 hits (line 9, 19, 89, 95, 136, 139, 142, 158, 222, 234, 266, 283, 300, 317, 324, 463, 470).
- `src/Log/Log.test.jsx` — 5 hits (line 54, 96, 122, 147, 177).
- `src/Log/Writer.test.jsx` — 6 hits (line 54, 104, 154, 204, 256, 308).
- `src/Log/LogItem.test.jsx` — 5 hits (line 47, 155, 210, 265, 328).
- `src/Log/LogSingle.test.jsx` — 8 hits (line 46, 121, 151, 194, 231, 249, 267, 308).
- `src/Log/LogItemInfo.test.jsx` — 3 hits (line 46, 47, 51; 이 중 :46 은 `previousNodeEnv` 백업, :51 은 복원).
- **총**: 44 hits in 6 files.

## 의존성
- 내부: `src/common/env.js:1-9` (헬퍼), `src/common/env.test.js:1-36` (헬퍼 단위 테스트), `src/setupTests.js` (공통 setup), blue `common/node-env-helper-migration-spec.md:60` (`vi.stubEnv` 언급).
- 외부: `vitest` (`vi.stubEnv`, `vi.unstubAllEnvs`, `vi.mock`, `vi.restoreAllMocks`).
- 역의존: 블록된 `TSK-20260420-31` (`specs/50.blocked/task/TSK-20260420-31-node-env-helper-migration_reason.md:36-52`). 본 spec 완료 후 수동 개입(RULE-05) 으로 복귀 가능.

## 테스트 현황
- [x] 현행 `npm test` green (재할당 패턴은 Vite 환경에선 의미 없지만 분기가 우연히 동등 결과 → green 보존).
- [x] `src/common/env.test.js` — 헬퍼 단위 테스트 green baseline.
- [x] stub 전환 후 전 스위트 green 유지.
- [x] `grep -rn "process\.env\.NODE_ENV" src --include="*.test.*"` → 0 매칭.
- [~] `vitest run --sequence.shuffle` 에서 전 스위트 green (NFR-04 격리성) — baseline 대비 회귀 0 (동일 seed 기준, pre-existing MSW/render-order flake 는 본 scope 밖).

## 수용 기준
- [x] (Must) `grep -rn "process\.env\.NODE_ENV" src --include="*.test.*"` → 0 매칭.
- [x] (Must) `npm test` 전 스위트 green + 실패 0 + coverage 보고서 생성.
- [x] (Must) production stub 기준 `setHtmlTitle('foo')` → `document.title === 'foo - park108.net'`.
- [x] (Must) development stub 기준 `getUrl()` → `'http://localhost:3000/'`; production stub 기준 → `'https://www.park108.net/'`.
- [x] (Must) production stub 기준 `isAdmin()` — 인증 조건에 따라 기대대로 `true|false` (재할당 패턴과 동등).
- [x] (Must) `npm run lint` 경고·오류 건수 변경 0.
- [x] (Must) `src/common/env.test.js:24-26` — vitest 기본 MODE `"test"` 단언 회귀 0.
- [x] (Should) 6개 대상 파일에서 채택 stub 이디엄 동일 형태로 일관 적용 (혼용 금지 — inspector/planner 검증).
- [x] (Should) 이디엄 규칙을 `src/setupTests.js` 헤더 주석 또는 `docs/` 1곳에 박제.
- [x] (Should) 결과 result.md 에서 TSK-20260420-31 해제 조건 충족을 박제.
- [~] (NFR) `vitest run --sequence.shuffle` 에서 전 스위트 green — 테스트 간 환경 stub 누수 0 (env stub 누수 무관 pre-existing flake 존재, 후속 followup 큐잉됨).
- [x] (NFR) coverage line/statement 비율 회귀 ±0.5% 내.

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `grep -rn "process\.env\.NODE_ENV" src --include="*.test.*"` → 44 hits in 6 files:
    - `src/common/common.test.js:9, 19, 89, 95, 136, 139, 142, 158, 222, 234, 266, 283, 300, 317, 324, 463, 470`
    - `src/Log/Log.test.jsx:54, 96, 122, 147, 177`
    - `src/Log/Writer.test.jsx:54, 104, 154, 204, 256, 308`
    - `src/Log/LogItem.test.jsx:47, 155, 210, 265, 328`
    - `src/Log/LogSingle.test.jsx:46, 121, 151, 194, 231, 249, 267, 308`
    - `src/Log/LogItemInfo.test.jsx:46, 47, 51`
- **rationale**: 런타임 소스(`src/common/common.js`, `src/Log/api.js`) 의 `process.env.NODE_ENV` 치환은 REQ-20260420-002 / blue `common/node-env-helper-migration-spec.md` 담당. `vite.config.js`, `eslint.config.js` 의 `process.env.NODE_ENV` 참조는 빌드 시점 로직으로 본 scope 밖. 본 spec 은 `*.test.*` 한정 stub 이디엄 전환이며 grep 게이트 달성 목적의 런타임 파일 편집 금지.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-005 반영) | all |
| 2026-04-21 | TSK-20260420-37 / a95f1bb | Vite-native stub 전환 완료 (44 hits → 0) + Navigation 가드 + setupTests 이디엄 주석; Must/Should 전수 PASS, shuffle NFR 은 env 무관 pre-existing flake 로 `[~]` 유지 | 테스트 현황, 수용 기준 |
