# 런타임 process.env.NODE_ENV → common/env.js 헬퍼 치환

> **위치**: `src/common/common.js` (9건), `src/Log/api.js` (2건) / 헬퍼 `src/common/env.js:1-9`
> **관련 요구사항**: REQ-20260420-002
> **최종 업데이트**: 2026-04-21 (by inspector, drift reconcile — blue 대비 green carve)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
런타임 소스 2파일에 잔존하던 `process.env.NODE_ENV` 참조 11건을 canonical 헬퍼(`isDev()` / `isProd()`) 호출로 치환하여 환경 분기 단일 진입점 확보. 테스트 파일(`**/*.test.*`) stub 용도는 범위 외. 동등성(semantic equivalence) 보존.

## 공개 인터페이스
변경 없음. 다음 공개 함수는 입출력 불변:
- `setHtmlTitle(title)` — `src/common/common.js:1-8`
- `log(text, type)` — `src/common/common.js:29-41`
- `getUrl()` — `src/common/common.js:65-72`
- `auth()` — `src/common/common.js:112-144`
- `isAdmin()` — `src/common/common.js:151-173`
- `getApiUrl()` (내부), `getLogs/getLog/postLog/putLog/deleteLog` — `src/Log/api.js:5-74`

## 동작
- `src/common/common.js` 상단에 `import { isDev, isProd } from './env';` 추가.
- `src/Log/api.js` 상단에 `import { isDev, isProd } from '../common/env';` 추가.
- 각 분기 치환:
  - `process.env.NODE_ENV === 'production'` → `isProd()`
  - `process.env.NODE_ENV === 'development'` → `isDev()`
  - `'production' === process.env.NODE_ENV` → `isProd()`
  - `'development' === process.env.NODE_ENV` → `isDev()`
- 분기 결과와 console 출력·문서 title·URL·쿠키 site·admin 판정 모두 bump 전과 동일.

### 치환 위치 요약 (grep baseline 2026-04-20, 11건)
- `src/common/common.js:2` (production → isProd)
- `src/common/common.js:5` (development → isDev)
- `src/common/common.js:30` (development → isDev)
- `src/common/common.js:66` (production → isProd)
- `src/common/common.js:69` (development → isDev)
- `src/common/common.js:127` (production → isProd)
- `src/common/common.js:130` (development → isDev)
- `src/common/common.js:163` (production → isProd)
- `src/common/common.js:167` (development → isDev)
- `src/Log/api.js:6` (production → isProd)
- `src/Log/api.js:7` (development → isDev)

## 의존성
- 내부: `src/common/env.js:1-9` (헬퍼), `src/common/env.test.js` (헬퍼 단위 테스트).
- 외부: `import.meta.env.DEV` / `import.meta.env.PROD` (Vite 제공 정적 치환).
- 역의존: `src/Log/api.js`, 앱 전반의 `setHtmlTitle/getUrl/auth/isAdmin/log` 호출처.

## 테스트 현황
- [x] `src/common/env.test.js` — 헬퍼 동작 (green baseline).
- [x] `src/common/common.test.js`, `src/Log/api.*` 테스트 — green baseline.
- [x] 치환 후 재실행 — 분기 결과 동등 (TSK-20260420-37 / a95f1bb, 368/368 pass).

## 수용 기준
- [x] (Must) `grep -rn "process\.env\.NODE_ENV" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."` → 0 매칭. *(재실측 2026-04-21 HEAD: 0 hits)*
- [x] (Must) `npm run test` green — 특히 `src/common/common.test.js`, `src/Log/api.*` 관련. *(a95f1bb result.md: 368/368 pass; 현 HEAD 377/377 pass — d798635/기준 회귀 0)*
- [x] (Must) `npm run lint` 경고·오류 증가 0. *(재실측 2026-04-21 HEAD: 0 warn / 0 error)*
- [x] (Must) `setHtmlTitle('foo')` production 모드 호출 시 `document.title === 'foo - park108.net'`. *(common.test.js > prod title 통과, a95f1bb)*
- [x] (Must) `getUrl()` production / development 각 모드 호출 시 `'https://www.park108.net/'` / `'http://localhost:3000/'` 반환. *(common.test.js > test URL / prod URL 통과, a95f1bb)*
- [x] (Should) `vi.stubEnv` 를 사용한 헬퍼 간접 분기 테스트 동작 보장 문서화. *(`src/setupTests.js` 헤더 주석에 이디엄 규칙 박제 — a95f1bb)*
- [ ] (NFR) gzip 번들 크기 회귀 ±1% 내. **[deferred: NFR 수치 재측정 별건 carve 필요 — result.md 에 gzip 비교 수치 없음]**

## 스코프 규칙
- **expansion**: 불허
- **grep-baseline**:
  - `grep -rn "process\.env\.NODE_ENV" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."` → 0 hits in 0 files (재실측 2026-04-21 HEAD, drift reconcile 시점 — 기존 baseline 11 hits 전량 해소).
- **rationale**: 테스트 stub 용도(`**/*.test.*`) 는 요구사항 Out-of-Scope. scope 밖(예: `vite.config.js`, `eslint.config.js`) 에서 `process.env.NODE_ENV` 가 추가로 나타나도 본 spec 에서 치환 금지. 현 HEAD 기준 추가 drift 없음.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-002 반영) | all |
| 2026-04-21 | inspector / TSK-20260420-37 · a95f1bb | drift reconcile — Must 6/6 + Should 1/1 ack (HEAD 재실측 grep 0 hits, lint clean, test green). NFR gzip 미측정 deferred. | 테스트 현황 / 수용 기준 / 스코프 규칙 |
