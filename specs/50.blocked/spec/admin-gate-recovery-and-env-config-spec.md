# Admin 게이트 진단·복구 — isAdmin() 진단 체크리스트 + admin user ID 환경 변수 외부화

> **위치**: `src/common/common.js:153-175` (`isAdmin()`), `src/common/common.js:136-145` (`auth()` setCookie), `src/common/env.js:6-8` (`isProd/isDev`), `src/common/Navigation.jsx:6-33` (`ADMIN_MENU`), `src/Log/Log.jsx:17-33` (`newlog-button`), `src/File/File.jsx:30` (non-admin redirect), `src/Search/SearchInput.jsx:68` (admin Search 분기).
> **관련 요구사항**: REQ-20260421-017 (admin-gate-recovery-diagnostic-and-env-config)
> **최종 업데이트**: 2026-04-21 (by inspector, drift reconcile ack — TSK-20260421-61 / 572009f PASS, FR-03/04/05/07 + NFR-01/02/04 완료)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (HEAD=fc656a7). REQ-017 ID 충돌 메모: 같은 날 두 req 가 `REQ-20260421-017` 사용 (test-isolation 재등록 + 본 admin-gate). 본 spec 은 admin-gate 분기 책임. discovery 측 ID 정정은 본 spec 범위 외.

## 역할
운영자 관측 — Navigation 의 `log/file/mon` 메뉴, `/log` 의 신규 작성(`+`) 버튼, `/file` 접근, 관리자 전용 Search 확장 등 admin-gated UI 가 동시 소멸. 코드상 모든 admin 기능은 `isAdmin()` 단일 함수(`src/common/common.js:153-175`) 를 관문으로 공유 → 증상은 `isAdmin() === false` 귀결. 본 spec 은 (a) 게이트 실패 원인 5개 후보 (C1~C5) 를 DevTools 진단 순서로 박제하고, (b) 하드코딩된 admin user ID 를 `import.meta.env.VITE_ADMIN_USER_ID_*` 로 외부화하고, (c) 쿠키 속성 결함 (`site` 비표준) 을 정정한다. 의도적으로 하지 않는 것: IAM 권한화 (`// TODO: change user id hard coding to IAM authorization` 의 정식 후속), Cognito user pool 변경.

## 공개 인터페이스
- **FR-01 (Must) — 진단 체크리스트 박제 (C1~C5)**: §동작 에 DevTools 경유 5단계 진단 절차 박제. 각 단계 (a) 관찰 방법, (b) 판정 문구, (c) 다음 단계 여부 기준. 사용자 단독 수행 가능한 구체성. 운영자 2026-04-21 실측 — `https://www.park108.net` 쿠키 0건 → C1 hit, 근본 원인 C5 연장 (`setCookie` `expires`/`max-age` 미지정 + `site` 비표준 속성).
- **FR-02 (Must) — 원인 확정 보고**: C1~C5 중 실제 원인 1개 이상 확정 + 재현 경로 + 증거 (쿠키 덤프 / console 출력 / 빌드 mode) 박제. 복수 원인 혼재 시 모두 열거. 본 spec 은 운영자 실측 증거 (C1 hit + C5 연장) 를 §동작 §3 에 박제.
- **FR-03 (Must) — admin user ID 외부화**: `src/common/common.js:166,170` 의 하드코딩 UUID 2개를 `import.meta.env.VITE_ADMIN_USER_ID_PROD` / `VITE_ADMIN_USER_ID_DEV` (또는 동등 Vite env) 로 치환. 빈 값이면 admin false 로 귀결 (현 동작 보존). `// TODO: change user id hard coding to IAM authorization` 주석은 본 patch 로 해소되지 않으므로 후속 IAM 권한화 마일스톤 참조 주석으로 변경 박제.
- **FR-04 (Should) — 진단 보조 로깅**: `isDev()` 분기 한정 `log("isAdmin: cookie=<bool> parseJwt=<bool> username=<str> env=<prod|dev|none>", "DEBUG")` 1회 출력. 기존 `log()` 헬퍼 재사용, prod 출력 차단. 프로덕션 콘솔 오염 금지.
- **FR-05 (Should) — 쿠키 속성 정정**: `setCookie(..., { site: ... })` 호출 2곳 (`src/common/common.js:138,143`) 의 의도 확인 후 `SameSite` 또는 `Domain` 으로 치환. 추가로 `expires` / `max-age` 미지정으로 인한 세션 쿠키 소멸 (운영자 실측 근본 원인) 을 해소 — Cognito access_token TTL 과 동일하거나 유사한 만료 시간 설정. 테스트에서 `document.cookie` 문자열 내 속성명 단순 검증.
- **FR-06 (Could) — username 클레임 fallback**: Cognito 가 `cognito:username` / `username` / `sub` 중 하나로 반환 가능하므로 우선순위 fallback (`payload.username ?? payload['cognito:username'] ?? payload.sub`). 단 C3 판정이 선행되어야 불필요 확장 방지.
- **FR-07 (Must) — 회귀 방어 테스트**: `src/common/common.test.js` 에 isAdmin 분기 매트릭스 추가 — (cookie 무, cookie 유 + parseJwt null, parseJwt ok + username mismatch, parseJwt ok + username match + isProd, parseJwt ok + username match + isDev, parseJwt ok + username match + 둘 다 false) 6 케이스. 기존 stub 관용구 (`src/setupTests.js` 의 `isDev/isProd` stub) 재사용. FR-03 환경 변수 외부화 후에는 환경 변수 stub 도 추가.

## 동작
1. (FR-01) **C1 — access_token cookie 누락**: `document.cookie` 에 `access_token` 부재 확인. 판정 = true 면 다음 단계 스킵, 운영자 액션 (UserLogin → Cognito 재로그인) 으로 즉시 복구. 재현 경로 = 로그인 버튼 → Cognito → 리디렉션 후 `👨‍💻` 이모지 확인 → admin 메뉴 즉시 가시.
2. (FR-01) **C2 — parseJwt null 귀결**: console 에서 `common.parseJwt(document.cookie.match(/access_token=([^;]*)/)[1])` 실행. null 반환 시 hit. `7daa83a` fail-safe 로 isAdmin false 로 수렴.
3. (FR-01) **C3 — payload.username 불일치**: 위 payload 출력 후 `username` 키 값 육안 대조. `df256e56-...` (prod) / `051fd5f9-...` (dev) 와 다르면 hit. Cognito user pool 변경, 테스트 계정, 클레임 필드명 변경 (`cognito:username` vs `username`) 가능. FR-06 fallback 검토.
4. (FR-01) **C4 — isProd()/isDev() 모두 false**: console 에서 `import.meta.env.PROD`, `import.meta.env.DEV`, `import.meta.env.MODE` 출력. 둘 다 false 면 hit. Vite preview · SSR 테스트 · 제3자 호스팅 fallback · mode override.
5. (FR-01) **C5 — 쿠키 속성 결함**: DevTools Cookies 패널에서 `access_token` 의 Domain / SameSite / Expires 확인. `site` 비표준 속성 (브라우저 무시) → Domain 미설정 (current host 한정), `expires` / `max-age` 미지정 → 세션 쿠키 (탭 닫힘 시 소멸). 운영자 2026-04-21 실측 = **C5 연장 (근본 원인)**.
6. (FR-02) 운영자 실측 증거 박제 — `https://www.park108.net` 쿠키 패널 park108.net 도메인 0건 (LinkedIn 트래킹만). access_token 부재 → C1 hit. C5 연장 = `setCookie` `expires`/`max-age` 미지정 + `site` 비표준 속성 (SameSite 오타 추정).
7. (FR-03) `src/common/common.js:166,170` 하드코딩 UUID → `import.meta.env.VITE_ADMIN_USER_ID_PROD` / `VITE_ADMIN_USER_ID_DEV` 치환. 빈 값일 때 false 귀결 보존 (`payload.username === (import.meta.env.VITE_ADMIN_USER_ID_PROD || '')` 형태). `.env.example` / `.env.local` 에 현 UUID 박제 (이미 public repo 노출 값, NFR-04). `.env.production` / `.env.development` 분기 권장.
8. (FR-04) `isAdmin()` 본문 첫 줄에 `if (isDev()) log(\`isAdmin: cookie=${!!cookie} parseJwt=${!!payload} username=${payload?.username ?? '-'} env=${isProd() ? 'prod' : isDev() ? 'dev' : 'none'}\`, "DEBUG");` 1회. prod 출력 차단 검증 — `log()` 헬퍼가 `isDev()` 가드 하면 자체 차단, 그렇지 않으면 명시 가드.
9. (FR-05) `setCookie(..., { secure: true, site: site })` 2곳 → `setCookie(..., { secure: true, sameSite: site, expires: <Cognito access_token TTL 동등 ms 또는 sec> })` 형태로 정정. 의도가 `Domain` 이었다면 `domain: site` + 별도 `sameSite: 'Lax'` (default) 명시.
10. (FR-06, 조건부) C3 hit 시 `payload.username ?? payload['cognito:username'] ?? payload.sub` fallback. C3 hit 부재면 미적용 (불필요 확장 방지).
11. (FR-07) `src/common/common.test.js` 에 `describe('isAdmin matrix (REQ-20260421-017)')` 추가, 6 케이스 + 환경 변수 stub.

### 대안
- **하드코딩 UUID 유지 + IAM 권한화 즉시 (기각)**: NFR-01 3파일 초과, 본 spec 범위 초과. 별건 REQ.
- **Cognito custom claim 도입 (기각)**: user pool 변경 동반, 본 spec 범위 외.
- **isProd/isDev 단일화 (기각, 별건)**: REQ-20260418-002 (env helper) 의 후속 단순화 — 본 spec 은 admin user ID 외부화에 집중.
- **`site` 속성 단순 삭제 (기각)**: SameSite 의도가 있었다면 명시적 정정이 정합. 단순 삭제는 의도 손실.

### Baseline (2026-04-21, HEAD=fc656a7)
- `grep -nE "df256e56|051fd5f9" src/common/common.js` → 2 hits (FR-03 후 0 hits, env 변수로 치환).
- `grep -n "VITE_ADMIN_USER_ID" src/common/common.js` → 0 hits (FR-03 후 ≥2 hits).
- `grep -n "VITE_ADMIN_USER_ID" .env.example` → 0 hits (FR-03 후 ≥2 hits).
- `grep -n "site:" src/common/common.js` → 2 hits at `:138, :143` (FR-05 후 0 hits, sameSite/domain 으로 치환).
- `grep -n "sameSite\|expires\|max-age" src/common/common.js` → 0 hits (FR-05 후 ≥2 hits).
- `grep -n "isAdmin matrix" src/common/common.test.js` → 0 hits (FR-07 후 1 hit).
- `grep -n "describe.*isAdmin" src/common/common.test.js` → 2 hits at `:273, :318` (기존 `test isAdmin` + `isAdmin fail-safe`, FR-07 후 +1 = 3 hits).
- `grep -n "TODO: change user id hard coding to IAM authorization" src/common/common.js` → 1 hit (FR-03 후 후속 마일스톤 참조 주석으로 변경).

## 의존성
- 내부:
  - `src/common/common.js:148-175` (`isLoggedIn`, `isAdmin`, `parseJwt`) — 본문 수정 대상.
  - `src/common/common.js:136-145` (`auth()` `setCookie`) — FR-05 정정 대상.
  - `src/common/env.js:6-8` (`isDev`, `isProd`) — 불변.
  - `src/common/common.test.js` — FR-07 매트릭스 추가 대상.
  - `src/setupTests.js` — vitest env stub 패턴 재사용.
  - `.env.example` / `.env.local` / `.env.production` / `.env.development` — FR-03 신규 환경 변수 등록.
  - `src/common/Navigation.jsx`, `src/Log/Log.jsx`, `src/File/File.jsx`, `src/Search/SearchInput.jsx`, `src/Log/LogItemInfo.jsx`, `src/Comment/CommentForm.jsx`, `src/Comment/CommentItem.jsx`, `src/Log/api.js:13` — admin 게이트 소비자 (불변, isAdmin 결과 의존).
- 외부: `vite` (`import.meta.env`), Cognito JWT (access_token), 브라우저 쿠키 API.
- 역의존: REQ-20260418-032 (parseJwt guard), REQ-20260418-031 (auth URL fix), REQ-20260418-002 (env helper 전환), 1fc05e9 (`auth()` URL fix), 7daa83a (`parseJwt` input guard), a95f1bb (`isProd/isDev` 런타임 헬퍼).

## 테스트 현황
- [x] 운영자 실측 (2026-04-21) — `www.park108.net` 쿠키 0건, C1 hit + C5 연장 근본 원인 확정.
- [x] FR-01 진단 체크리스트 박제. **§동작 1~5 박제 완료**
- [x] FR-02 원인 확정 보고. **§동작 6 박제 완료**
- [x] FR-03 admin user ID 외부화 patch 적용. **TSK-20260421-61 / 572009f PASS — `grep -nE "df256e56|051fd5f9" src/common/common.js` 0 hits, `VITE_ADMIN_USER_ID` 2 hits**
- [x] FR-04 진단 보조 로깅 추가. **TSK-20260421-61 / 572009f PASS — `src/common/common.js:156` `if (isDev()) log("isAdmin: cookie=... env=...", "DEBUG")`**
- [x] FR-05 쿠키 속성 정정 + expires/max-age 추가. **TSK-20260421-61 / 572009f PASS — `site:` 0 hits, `sameSite:` 2 hits (`:138, :144`), `maxAge: 3600` 2 hits (`:139, :145`)**
- [ ] FR-06 username 클레임 fallback (조건부). **[deferred: C3 hit 미발동 → 선결 미성립]**
- [x] FR-07 isAdmin 매트릭스 6 케이스 회귀 방어 테스트. **TSK-20260421-61 / 572009f PASS — `describe.*isAdmin` 3 hits (`test isAdmin` + `isAdmin fail-safe ...` + `isAdmin matrix (REQ-20260421-017)` at L670)**
- [x] (NFR-02) `npm test -- --run` 0 fail, `npm run lint` 0 warn/error, `npm run build` OK. **TSK-20260421-61 / 572009f — 47 files / 381 tests PASS, lint 0 warn/error, build OK 357ms**

## 수용 기준
- [x] (Must) FR-01 — 진단 체크리스트 5단계 (C1~C5) 박제 완료.
- [x] (Must) FR-02 — 원인 확정 보고 박제 (C1 hit + C5 연장 근본 원인).
- [x] (Must) FR-03 — `src/common/common.js:170,174` 하드코딩 UUID 가 `import.meta.env.VITE_ADMIN_USER_ID_PROD` / `VITE_ADMIN_USER_ID_DEV` 로 치환. `grep -nE "df256e56|051fd5f9" src/common/common.js` → 0 hits. `.env.example` 에 두 변수 박제. **TSK-20260421-61 / 572009f PASS**
- [x] (Must) FR-07 — `src/common/common.test.js:670` 에 isAdmin 6 케이스 매트릭스 describe 추가. **TSK-20260421-61 / 572009f PASS**
- [x] (Should) FR-04 — `isAdmin()` 본문에 `isDev()` 가드 진단 로그 1줄 추가 (prod 차단). **TSK-20260421-61 / 572009f — `src/common/common.js:156`**
- [x] (Should) FR-05 — `src/common/common.js:138,144` `site:` 호출 2곳을 `sameSite: site, maxAge: 3600` 으로 정정. **TSK-20260421-61 / 572009f PASS. follow-up: `site` 변수값이 SameSite 표준값(Strict/Lax/None) 아님 — 실제 의도가 `domain: site` 였을 가능성은 developer result.md observed defect 후보로 기록.**
- [ ] (Could) FR-06 — C3 hit 시 username fallback 적용. **[deferred: 조건 미발동]**
- [x] (NFR-01) 런타임 소스 변경 = 3파일 (`src/common/common.js` + `src/common/common.test.js` + `.env.example`). 4파일 상한 준수. **TSK-20260421-61 / 572009f — `git show --stat` 3파일**
- [x] (NFR-02) `npm test -- --run` 0 fail (47 files / 381 tests), `npm run lint` 0 warn/error, `npm run build` OK (357ms). **TSK-20260421-61 / 572009f PASS**
- [ ] (NFR-03) 감사성 — 복구 커밋은 설정 변경과 로직 변경 분리 권장 (단일 task 묶음 가능, NFR-01 충족 시). **TSK-20260421-61 / 572009f — 단일 커밋 묶음, NFR-01 충족 범위 안쪽**
- [x] (NFR-04) 보안 — admin UUID public repo 노출 값이므로 `.env.example` 공개 무방. spec 주석에 후속 IAM 권한화 임시 조치 명시.

## 스코프 규칙
- **expansion**: 불허 — 수정 범위는 `src/common/common.js`, `src/common/common.test.js`, `.env.*` 파일 군에 한정. admin 게이트 소비자 (Navigation.jsx, Log.jsx, File.jsx, SearchInput.jsx 등) 수정 0. `src/common/env.js` 불변. NFR-01 3~4파일 상한 강제.
- **grep-baseline** (2026-04-21, HEAD=fc656a7):
  - `grep -nE "df256e56|051fd5f9" src/common/common.js` → 2 hits (FR-03 후 0 hits).
  - `grep -n "VITE_ADMIN_USER_ID" src/common/common.js` → 0 hits (FR-03 후 ≥2 hits).
  - `grep -n "VITE_ADMIN_USER_ID" .env.example` → 0 hits (FR-03 후 ≥2 hits).
  - `grep -nE "^\s*site:" src/common/common.js` → 2 hits at `:138, :143` (FR-05 후 0 hits — sameSite/domain 로 치환).
  - `grep -n "describe.*isAdmin" src/common/common.test.js` → 2 hits at `:273, :318` (FR-07 후 +1 = 3 hits, `isAdmin matrix (REQ-20260421-017)`).
  - `grep -nE "expires|maxAge" src/common/common.js` → 0 hits (FR-05 후 ≥1 hit, Cognito TTL 동등 값).
  - `grep -n "TODO: change user id hard coding to IAM authorization" src/common/common.js` → 1 hit (FR-03 후 후속 마일스톤 참조 주석으로 갱신).
- **rationale**: admin 게이트 소비자 7+ 파일 (Navigation, Log, File, SearchInput, LogItemInfo, CommentForm, CommentItem, Log/api.js) 은 모두 `isAdmin()` 결과 의존 — 게이트 본체 1파일 정정으로 회귀 방어 충분. 환경 변수 외부화는 `.env.*` + 1 runtime + 1 test 의 3파일 + 쿠키 정정 시 동일 runtime 누적 (총 4파일 한도). 운영자 실측 근본 원인 (C5 연장) 은 FR-05 로 해소 — `site` 비표준 속성 정정 + `expires`/`max-age` 추가.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / — (REQ-20260421-017 admin-gate 반영, HEAD=fc656a7) | Phase 3 신규 등록 — admin 게이트 진단 (C1~C5) + admin user ID 외부화 (FR-03) + 쿠키 속성 정정 (FR-05) + 회귀 방어 매트릭스 (FR-07). 운영자 2026-04-21 실측 (C1 hit + C5 연장 근본 원인) 박제. ID 충돌 메모 (test-isolation REQ-017 과 동일 ID, discovery 측 정정 별도). | all |
| 2026-04-21 | inspector / — (marker-sync, HEAD=ec35206) | planner carve 반영 — §테스트 현황 FR-03/04/05 의 `후속 task carve 대기` 3 지점 → `TSK-20260421-61 ready 대기` 로 구체 TSK-ID 고정 (`40.task/20260421-admin-gate-userid-externalize-cookie-fix-regression-matrix.md` 발행). ack 0건 (working tree 에 REQ-017 WIP 존재하나 미커밋 — HEAD ancestor 아님, hooks ack 보류). | 테스트 현황, 변경 이력 |
| 2026-04-21 | TSK-20260421-61 / 572009f (drift reconcile ack) | FR-03 + FR-04 + FR-05 + FR-07 + NFR-01/02/04 + (NFR-03 부분) 수용 기준 PASS — admin UUID 외부화 (`VITE_ADMIN_USER_ID_*`), 쿠키 `site:` → `sameSite: site, maxAge: 3600`, `isAdmin()` 진단 로그 (`isDev()` 가드), `isAdmin matrix` 6 케이스 매트릭스 (common.test.js L670), `.env.example` 2 변수 추가. DoD grep 게이트 8/8 PASS + `npm test/lint/build` 전원 OK (47 files / 381 tests). 4파일 커밋은 HEAD 직계. | 테스트 현황, 수용 기준, 변경 이력 |
