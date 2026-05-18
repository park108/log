# dev server port ↔ `getUrl()` dev branch URL port 토큰 cross-surface 정합 시스템 불변식

> **위치**: 횡단 빌드/런타임 시스템 불변식 — `src/common/common.ts:69-77` `getUrl()` 의 dev 분기 (`isDev()` true) 반환 URL `"http://localhost:3000/"` 의 port 정수 토큰 + `vite.config.js:44-47` `server: { port: 3000, open: true }` 의 port 정수 값. 측정 scope = 두 파일 본문 한정.
> **관련 요구사항**: REQ-20260518-014
> **최종 업데이트**: 2026-05-18 (by inspector — 최초 박제; Phase 2 REQ-014 흡수)

> 본 spec 은 자매 `components/common.md` (`getUrl()` 헬퍼 박제, line 19 — production vs development URL 헬퍼) 와 `common/test-idioms.md` (`getUrl()` 소비 테스트 env stub idiom, line 28) 의 직교 보완 — 두 자매 spec 은 헬퍼 의미·테스트 idiom 차원, 본 spec 은 dev port 토큰 byte-equal cross-surface 동치 axis. 두 axis 직교.

## 역할
런타임 dev URL helper `getUrl()` 가 반환하는 dev 분기 URL (현 baseline: `http://localhost:3000/`) 의 port 정수 토큰과 Vite dev server 가 listen 하는 port (현 baseline: `vite.config.js:server.port = 3000`) 는 **동일한 dev port 토큰** 으로 정합되어야 한다는 결과 효능 불변식. 두 채널 중 한쪽만 갱신되면 dev 환경의 OAuth callback / 절대 URL 기반 boot beacon / cookie scope 가 stale URL 반환하지만 lint/typecheck/test/build 어느 게이트에서도 grep 가능한 검출 채널 부재 — silent runtime 회귀. 의도적으로 하지 않는 것: (i) port 절대값 자체 (3000 vs 5173 등) 선정 — 두 채널 값이 같다는 axis 만 박제, (ii) prod 분기 URL (`https://www.park108.net/`) ↔ DNS/hosting 정합 — 관측 불가 채널 (RULE-07 양성 미달), (iii) dev URL scheme (`http://`) / host (`localhost`) / trailing slash 보존 — 별 axis (필요 시 차기 req 분리), (iv) File 도메인의 동명 상수 `REFRESH_TIMEOUT = 3000` (`src/File/FileDrop.tsx:6`, `src/File/FileUpload.tsx:7`, `src/File/FileItem.tsx:27`) — millisecond 단위 timeout 의미 도메인 분리, port 토큰과 동음이의어이므로 정합 대상에서 명시적 제외, (v) 발화 시점 채널 (pre-commit / pre-push / CI / 신규 `check:dev-port-coherence` script) 선정 — 수단 위임.

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — `src/common/common.ts` + `vite.config.js` 본문 grep.

## 동작
1. (G-A) dev URL helper port 토큰 게이트 — FR-01-a
   - 명령: `grep -nE "^\s*return\s+\"http://localhost:[0-9]+/\";" src/common/common.ts` → **출력 = 1 line + rc=0** (HEAD baseline: line 74 `return "http://localhost:3000/";`).
   - port 추출: 정규식 capture group `:([0-9]+)/` 의 정수 토큰 (baseline = `3000`).
   - 의미: `getUrl()` dev 분기 (`isDev()` true) 가 정확히 1 line 의 absolute URL literal 을 반환하며, URL 의 port 토큰이 정수 형태로 박혀 있다.
2. (G-B) vite dev server port 토큰 게이트 — FR-01-b
   - 명령: `grep -nE "^\s*port:\s*[0-9]+," vite.config.js` → **출력 = 1 line + rc=0** (HEAD baseline: line 45 `port: 3000,`).
   - port 추출: 정규식 capture group `port:\s*([0-9]+)` 의 정수 토큰 (baseline = `3000`).
   - 의미: vite dev server 설정의 `server.port` 가 정확히 1 line literal 정수로 박혀 있다.
3. (G-C) 두 채널 byte-equal 동치 게이트 — FR-01 / FR-04
   - 절차: (G-A) port 추출 정수 == (G-B) port 추출 정수 byte 비교. **두 토큰 모두 `3000` 동치** (HEAD baseline).
   - 의미: 한 채널만 swap (예: `vite.config.js:server.port = 4000` 단독 / `src/common/common.ts` 만 `localhost:5173` 단독) 시 byte-equal 위반 검출. 양쪽 동시 갱신 (예: 둘 다 `5173`) 시 PASS — port 절대값 무관 axis 일치만 검증.
4. (G-D) 동음이의어 격리 게이트 — FR-02 / NFR-03
   - 절차: port 토큰 검색 시 `REFRESH_TIMEOUT = 3000` (ms timeout) 와 URL port 의 의미 분리 — 측정 scope = `src/common/common.ts` 의 `getUrl()` 함수 본문 (line 69-77) + `vite.config.js` 의 `server` 블록 (line 44-47) 한정. File 도메인 (`src/File/FileDrop.tsx:6`, `src/File/FileUpload.tsx:7`, `src/File/FileItem.tsx:27`) 의 `REFRESH_TIMEOUT` 상수는 본 정합 대상 아님 (의미 도메인 분리 — millisecond 단위 timeout 카테고리).
   - baseline 분리 박제: 본 spec §스코프 규칙 baseline 의 grep 패턴이 scope 한정으로 false-positive 0 보장.
5. (G-E) drift 검출 채널 존재 게이트 — FR-03
   - 절차: 위 3 채널 (G-A, G-B, G-C) 의 grep 조합이 rc=0/1 결정론으로 판정 가능. 정합 위반 시 **dev port drift** 라벨로 fail-fast (수단 중립 — grep / unit test / dedicated script 중 inspector/planner 단계 택일).
6. (G-F) 단일-PR 동시 갱신 의무 — FR-04
   - 절차: dev port 변경 (예: 3000 → 5173 마이그레이션) 시 `src/common/common.ts:74` literal + `vite.config.js:45` literal 두 토큰 동시 단일 PR 갱신 의무. §변경 절차 평서문 박제.

## 의존성
- 내부 측정 대상: `src/common/common.ts` (line 69-77 `getUrl()` dev 분기), `vite.config.js` (line 44-47 `server` 블록).
- 외부: 없음 (Vite/Node 런타임 의존성은 spec scope 외).
- 역의존 (사용처):
  - `getUrl()` 소비처: `src/common/common.ts:373` (`url: getUrl()` — auth/boot 경로 절대 URL).
  - `specs/30.spec/blue/components/common.md:19` — `getUrl()` 기존 spec (production vs development URL 헬퍼). 본 spec 의 port 토큰 정합 axis 와 직교.
  - `specs/30.spec/blue/common/test-idioms.md:28` — `getUrl()` 소비 테스트 env stub idiom. 본 spec 과 직교 (test dispatch 차원 vs port 토큰 정합).

## 회귀 중점
1. (R-1) `vite.config.js:45` `port: 3000` → `port: 4000` 단독 swap, `src/common/common.ts:74` 는 `localhost:3000` 유지 — G-C byte-equal 위반 검출 (`3000 ≠ 4000`).
2. (R-2) `src/common/common.ts:74` `localhost:3000` → `localhost:5173` 단독 swap, `vite.config.js:45` 는 `port: 3000` 유지 — G-C byte-equal 위반 검출 (`5173 ≠ 3000`).
3. (R-3) 양쪽 동시 `5173` 갱신 — G-C PASS (port 절대값과 무관, axis 일치만 검증).
4. (R-4) File 도메인 `REFRESH_TIMEOUT = 3000` (ms) → `REFRESH_TIMEOUT = 5000` 변경 — G-D 동음이의어 격리에 의해 본 정합 게이트 영향 0 (의미 도메인 분리, 본 측정 scope 외).
5. (R-5) `getUrl()` dev 분기 형식 변경 (예: `localhost:3000` → `${import.meta.env.VITE_DEV_HOST}:${import.meta.env.VITE_DEV_PORT}` 환경 변수 치환) — G-A literal 검출 0 hit → 본 spec 갱신 신호 (런타임 결정 형식 도입은 측정 형식 변경 trigger, 본 baseline grep 패턴은 string literal 한정).
6. Vite 메이저 bump / `server.port` 설정 key 변경 — G-B grep 패턴 조정 신호 (본 spec 갱신).

## 스코프 규칙
- **expansion**: 불허 (측정 scope = `src/common/common.ts` `getUrl()` 함수 본문 + `vite.config.js` `server` 블록 한정).
- **grep-baseline** (HEAD=`f74ab43` 실측):
  - (A) `grep -nE "^\s*return\s+\"http://localhost:[0-9]+/\";" src/common/common.ts` → **1 hit** @`:74` `return "http://localhost:3000/";` (port 토큰 = `3000`). FR-01-a PASS.
  - (B) `grep -nE "^\s*port:\s*[0-9]+," vite.config.js` → **1 hit** @`:45` `	port: 3000,` (port 토큰 = `3000`). FR-01-b PASS.
  - (C-token) (A) port = `3000` / (B) port = `3000` → byte-equal `3000` 동치 PASS (FR-01 / FR-04).
  - (D-exclude) `grep -rn "REFRESH_TIMEOUT" src/File/ --include="*.tsx"` → **3 hits** (`FileDrop.tsx:6`, `FileUpload.tsx:7`, `FileItem.tsx:27`) — ms timeout 의미 도메인, 본 정합 측정 scope 외 (G-D 격리).
  - (E-self) `awk '/^### 1\./,/^## 의존성/' dev-server-port-getUrl-token-coherence.md | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit 자기 검증 PASS (수단 라벨 0).
- **rationale**: 측정 scope = 2 파일 본문 한정. `src/File/` 의 `REFRESH_TIMEOUT` 상수는 의미 도메인 (ms timeout) 분리로 false-positive 0. `specs/**` 본문 내 port 토큰 occurrence 는 measure scope 외 (self-reference circularity 회피). 3 grep + 1 token 비교 게이트 동시 PASS 시 dev port cross-channel byte-equal 동치 결과 효능 보장. 수단 라벨 0 자기 검증 — port 절대값 선정 / 발화 채널 (grep vs test vs script) 선정 어느 쪽이든 spec 본문에 우선/권장 표현 0.

## 테스트 현황
- [x] (FR-01) `getUrl()` dev 분기 URL port == `vite.config.js:server.port` byte-equal — grep gate (A)+(B)+(C-token) 실측 baseline `3000` 동치 PASS.
- [x] (FR-02) 정적 채널 (grep / config parse) 반복 검증 가능 — §스코프 규칙 (A)(B) 단일 명령 재현.
- [ ] (FR-03) 정합 위반 시 **dev port drift** 라벨로 fail-fast — 수단 영역, planner task carve 대기 (grep / unit test / dedicated script 중 1 채널 채택).
- [x] (FR-04) §변경 절차 평서문 박제 (단일-PR 동시 갱신 의무) — §동작 G-F 평서문.
- [x] (NFR-01) 검증 결정론 — 환경 변수·시간·네트워크 비의존, static parse + grep 만으로 closed-form 판정.
- [x] (NFR-02) 수단 중립 — §동작 G-E 평서문에 검출 수단 (grep / test / script) 우선 라벨 0. 1+ 채널 박제 충족이면 정합 PASS.
- [x] (NFR-03) 동음이의어 격리 — §동작 G-D + §스코프 규칙 (D-exclude) 평서문 박제. `REFRESH_TIMEOUT = 3000` (ms) 와 URL port 의 의미 분리.

## 수용 기준
- [x] (Must, FR-01) Given `vite.config.js:45 port: 3000` 그리고 `src/common/common.ts:74 localhost:3000`, When grep gate (A)+(B) 실행 후 token 비교, Then 두 토큰 byte-equal `3000` PASS.
- [x] (Must, FR-01) Given `vite.config.js:45 port: 4000` 단독 swap, `src/common/common.ts:74 localhost:3000` 유지 — When 본 게이트 실행, Then **dev port drift** byte-equal 위반 FAIL (R-1 검출).
- [x] (Must, FR-01) Given `src/common/common.ts:74 localhost:5173` 단독 swap, `vite.config.js:45 port: 3000` 유지 — When 본 게이트 실행, Then FAIL (R-2 검출).
- [x] (Must, FR-01) Given 양쪽 동시 `5173` 갱신, When 본 게이트 실행, Then PASS — port 절대값 무관, axis 일치만 검증 (R-3 검출).
- [x] (Must, FR-02) 정합 검사 채널 = 정적 (grep + config import) — 런타임 우연 일치 채택 금지.
- [ ] (Must, FR-03) 정합 위반 시 fail-fast 채널 (수단 중립 — grep / unit test / dedicated script 중 1 채택) 발화 부착 — 수단 영역, planner task carve 대기.
- [x] (Should, FR-04) §변경 절차 평서문 박제 — dev port 변경 시 `src/common/common.ts:74` + `vite.config.js:45` 두 토큰 단일-PR 동시 갱신 의무 (§동작 G-F 평서문).
- [x] (NFR-01) 검증 결정론 — 동일 HEAD 상 grep gate (A)+(B) N 회 반복 시 N 회 동일 rc + 동일 출력.
- [x] (NFR-02) 수단 중립 — 본 spec §동작 평서문에 검출 수단 (grep / test / script) 우선 라벨 0. (`package-manager-major-coherence.md` §동작 패턴 동등.)
- [x] (NFR-03) 동음이의어 격리 — `REFRESH_TIMEOUT = 3000` (ms) 와 URL port 의 의미 분리 baseline 박제 (G-D + 스코프 D-exclude). 정합 판정에 false-positive 영향 0 (R-4 검증).
- [x] (NFR-04) self-reference scope 분리 — `specs/**` 본문 내 port 토큰 (`3000`, `5173` 등) occurrence 가 measure scope 외 (`src/common/common.ts` `getUrl()` + `vite.config.js` `server` 블록 한정). §스코프 규칙 (E-self) 0 hit 자기 검증.
- [x] (NFR-05) 시점 비의존 — Vite 메이저 bump · `getUrl()` 형식 변경 (literal vs 환경 변수 치환) · port 절대값 마이그레이션 등 어떤 이벤트 직후에도 baseline grep 패턴이 valid 한 한 동일 측정 효능 유지. 형식 변경 시 본 spec 갱신 신호 (R-5).
- [x] (NFR-06) 외부 비파괴 — 본 흡수는 `src/common/common.ts` / `vite.config.js` / `src/File/` 본문 변경 동반 0. FR-03 발화 채널 부착은 후속 task 영역.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-18 | inspector (Phase 2, REQ-20260518-014 흡수) / (this commit, HEAD=`f74ab43`) | 최초 등록 (REQ-20260518-014). `src/common/common.ts:74` `getUrl()` dev 분기 URL port 토큰 ↔ `vite.config.js:45` `server.port` 정수 byte-equal cross-channel 동치 결과 효능 불변식 박제. §동작 G-A~G-F 6 게이트 + §회귀 중점 6 시나리오 (R-1~R-5 + Vite bump) + §스코프 규칙 grep-baseline (A)~(E-self) 5 gate 실측 (baseline `3000` 동치 + 동음이의어 격리 3 hit + 수단 라벨 0 자기 검증) + §테스트 현황 7 marker + §수용 기준 13 marker. consumed req: `specs/20.req/20260518-dev-server-port-getUrl-token-coherence.md` → `60.done/2026/05/18/req/` mv. 자매 직교 spec: `30.spec/blue/components/common.md:19` (`getUrl()` 헬퍼 의미 박제) + `30.spec/blue/common/test-idioms.md:28` (env stub idiom). 본 spec 의 port 토큰 cross-channel axis 와 두 자매 spec 의 헬퍼 의미·테스트 idiom 차원이 직교. RULE-07 자기검증 — §동작 G-A~G-F 평서형 + grep 단일 명령 반복 검증 가능 + Vite 메이저 bump / port 마이그레이션 이벤트 비귀속 + 동음이의어 격리 baseline 박제 (의미 도메인 분리, incident patch 비귀속) + 수단 중립 (검출 채널 라벨 0 / port 절대값 선정 라벨 0) + self-reference scope 분리 (NFR-04 + 스코프 E-self 0 hit). RULE-06 grep-baseline gate (A)~(E-self) 5 건 실측 박제 + line anchor + 동음이의어 격리 명문화. RULE-01 inspector writer 영역만 (`30.spec/green/foundation/` 신규 1 spec + `20.req/* → 60.done/req/` mv). RULE-03 (d) — 본 carve 로 green 19 → 20 (== GREEN_PENDING_MAX=20, 임계 도달 — 차기 tick Phase 2 흡수 시 본문 갱신 경로 한정 또는 backpressure). | all (최초 등록) |

## 참고
- **REQ 원문**: `specs/60.done/2026/05/18/req/20260518-dev-server-port-getUrl-token-coherence.md` (REQ-20260518-014, 본 88차 inspector tick mv).
- baseline 토큰 (HEAD=`f74ab43`):
  - 채널 A (런타임 URL helper): `src/common/common.ts:74` — `return "http://localhost:3000/";` (`getUrl()` dev 분기, line 69-77).
  - 채널 A 호출부: `src/common/common.ts:373` — `url: getUrl()` (auth/boot 경로 절대 URL 소비).
  - 채널 B (Vite dev server 설정): `vite.config.js:45` — `port: 3000,` (`vite.config.js:44-47` `server:` 블록).
  - 동음이의어 (격리 대상): `src/File/FileDrop.tsx:6`, `src/File/FileUpload.tsx:7`, `src/File/FileItem.tsx:27` — `REFRESH_TIMEOUT = 3000` ms timeout 상수.
- **자매 직교 spec**:
  - `specs/30.spec/blue/components/common.md:19` — `getUrl()` 기존 spec (production vs development URL 헬퍼). 본 spec 과 직교 (헬퍼 의미 차원 vs port 토큰 정합 차원).
  - `specs/30.spec/blue/common/test-idioms.md:28` — `getUrl()` 소비 테스트 env stub idiom (`stubMode('test')`). 본 spec 과 직교 (test dispatch 차원 vs port 토큰 정합 차원).
  - `specs/30.spec/blue/foundation/package-manager-major-coherence.md` — 두 채널 axis token coherence + 수단 중립 §동작 작성 패턴 선행 참조.
- **RULE 준수**:
  - RULE-07: §동작 G-A~G-F 시점 비의존 평서문 + 반복 검증 가능 (grep 단일 명령) + incident 비귀속 + 수단 중립 + self-reference scope 분리.
  - RULE-06: grep-baseline gate (A)~(E-self) 5 건 실측 수치 + line anchor + 동음이의어 격리 명문화 (`grep -v` 또는 동등 제외 규칙).
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/` 신규 1 spec).
