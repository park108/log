# 명세: Content Security Policy (CSP) — defense-in-depth 방어 계층

> **위치**: `index.html` (`<meta http-equiv="Content-Security-Policy">`) + 관련 Vite 빌드 산출물
> **유형**: Security Policy / Configuration
> **최종 업데이트**: 2026-04-20 (inspector — 67794e1 flip: FR-01~FR-13 + NFR-03/04/06 충족 박제)
> **상태**: WIP — meta 태그 도입 완료 (67794e1), dev/prod 분기 + 수동 smoke baseline 잔여
> **관련 요구사항**: REQ-20260419-040 (CSP meta 태그 도입 — defense-in-depth; 본 라운드 FR-01~FR-13 + NFR-03/04/06 flip)

> 본 spec 은 `sanitizeHtml-spec.md` 의 **1차 방어 (input sanitize)** 와 짝을 이루는 **2차 방어 (browser-level policy)** 를 박제한다. 두 계층이 독립 실패해도 한 계층이 XSS / 외부 리소스 주입을 차단하는 **defense-in-depth** 구조.

> 관련 요구사항: REQ-20260419-040 FR-01 ~ FR-15, US-01 ~ US-04 (서버 헤더 CSP 는 별 REQ; 본 spec 은 meta 태그 한정)

---

## 1. 역할 (Role & Responsibility)
- 브라우저 레벨 XSS / clickjacking / 외부 리소스 주입 방어 정책의 SSoT.
- `sanitizeHtml` (DOMPurify 기반 1차 방어) 이 실패했을 때 브라우저가 최후 방어선으로 동작.
- CDN / 외부 이미지 호스트 / API 엔드포인트 화이트리스트를 명문화.

- 주 책임:
  - `index.html` meta 태그를 통한 enforce 모드 CSP 배포
  - directive 별 정책 근거 박제
  - 호스트 화이트리스트 유지 (AWS API Gateway / Footer 외부 이미지 2개 + 업로드 CDN)
- 의도적으로 하지 않는 것:
  - 서버 응답 헤더 CSP (별 REQ / 인프라 영역)
  - `report-uri` / `report-to` 원격 수집 엔드포인트 (백엔드 필요)
  - `trusted-types` directive (DOMPurify 통합 필요, Chrome 전용)

## 2. 현재 상태 (As-Is, 2026-04-20, post-67794e1)

- `index.html:9` 에 CSP meta 태그 **도입 완료** (commit `67794e1`, TSK-20260420-08) — `grep -c "Content-Security-Policy" index.html` → 1.
- `build/index.html` 에도 meta 태그 보존 확인 — `grep -c "Content-Security-Policy" build/index.html` → 1 (task result.md §테스트 결과).
- 9 directive 모두 §3.1 정의대로 반영 (`default-src 'self'; script-src 'self'; connect-src 'self' https://*.execute-api.ap-northeast-2.amazonaws.com; img-src 'self' data: https://d0.awsstatic.com https://brand.linkedin.com; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';`).
- 서버 응답 헤더 CSP 부재 (AWS CloudFront 또는 Amplify 설정 미적용 추정) — 별 REQ 트랙.
- `sanitizeHtml` (DOMPurify) 1차 방어는 `src/common/sanitizeHtml.js` 존재 + `LogItem`/`Writer preview` 통합 완료 (REQ-20260418-102 머지).
- `src/**` 에서 inline `<script>` 사용 0 (module script 단일 진입 `<script type="module" src="/src/index.jsx">`).
- `style={{}}` inline 스타일 prop 6 hits 존재 → `style-src 'unsafe-inline'` 필요.
- 외부 리소스:
  - Footer 이미지 2 호스트: `https://d0.awsstatic.com`, `https://brand.linkedin.com` — `img-src` 반영 완료.
  - API Gateway: `*.execute-api.ap-northeast-2.amazonaws.com` 와일드카드 — `connect-src` 반영 완료.
  - 업로드 CDN: 운영자 확인 후 `img-src` 추가 필요 (FR-15 Should, 미결).

**잔여 항목**:
- FR-12 (수동 smoke 체크리스트 `docs/testing/csp-smoke.md` 신설) — 별 task `20260420-csp-smoke-checklist` 큐잉 (task result.md §관찰).
- FR-14 (dev/prod 분기) — 별 task `20260420-csp-dev-prod-branch` 분리 (task result.md §관찰).
- FR-15 (업로드 CDN 도메인 확인) — 운영자 followup.
- NFR-01 (securityheaders.com / Mozilla Observatory 스캔) — 운영자 세션 deferred.
- NFR-02 (주요 경로 수동 smoke violation 0) — FR-12 docs 기반 별 세션 deferred.

## 3. 정책

### 3.1 directive 설계 (REQ-040 FR-01 ~ FR-10)

| Directive | 값 | 근거 |
|-----------|-----|------|
| `default-src` | `'self'` | fallback — 다른 directive 미정의 시 자기 도메인만 |
| `script-src` | `'self'` | 모듈 스크립트 단일 진입. inline/CDN 차단 |
| `connect-src` | `'self' <AWS_API_HOSTS>` | `VITE_*_API_BASE` 도메인 1~2 또는 와일드카드 `*.execute-api.ap-northeast-2.amazonaws.com` |
| `img-src` | `'self' data: https://d0.awsstatic.com https://brand.linkedin.com <UPLOAD_CDN?>` | Footer 2 + inline SVG data: + self favicon/logo + 업로드 CDN |
| `style-src` | `'self' 'unsafe-inline'` | `style={{}}` inline prop 6곳 지원. nonce/해시 전환은 별 REQ |
| `object-src` | `'none'` | `<object>`/`<embed>`/`<applet>` 차단 |
| `base-uri` | `'self'` | `<base href>` 주입 공격 방지 |
| `frame-ancestors` | `'none'` | clickjacking 방어. 관리자 페이지 iframe 임베드 금지 |
| `form-action` | `'self'` | 폼 액션 자기 도메인 한정 |

### 3.2 Dev/Prod 분기 (FR-14)

- **Prod (`npm run build`)**: 본 §3.1 정책 100% 적용.
- **Dev (`npm run dev`)**: 두 옵션 중 1 선택 (planner 결정):
  - (a) dev 환경 meta 태그 제거 — Vite plugin `transformIndexHtml` 로 제외.
  - (b) dev 한정 `script-src 'self' 'unsafe-eval'` — HMR `eval` 기반 모듈 교체 허용.

### 3.3 Build 무결성 검증 (FR-11)

- `npm run build` 후 `grep -c "Content-Security-Policy" build/index.html` == 1.
- `grep "script-src 'self'" build/index.html` == 1 (prod 기준).
- Vite HTML transform 이 태그를 제거/변경하지 않음을 CI 단계에서 grep 검증.

### 3.4 수동 smoke 체크리스트 (FR-12, Should)

- **문서 위치**: `docs/testing/csp-smoke.md` 신설 (자매 `docs/testing/*.md` 동일 형식).
- **시나리오 매트릭스**: 주요 경로 5개 `/log`, `/log/writer`, `/admin/file`, `/monitor`, `/search` 에서 DevTools Console 의 CSP violation 로그 0 확인.
- **환경 매트릭스**: Chrome / Firefox 최신 + Prod build (`npm run build && npm run preview`).
- **baseline**: 운영자 1회 수행 + 결과 PR 본문 또는 문서 하단 박제.

## 4. 의존성

### 4.1 내부 의존
- `src/common/sanitizeHtml.js` (1차 방어, 짝)
- `index.html` (meta 태그 배치 대상)
- `vite.config.js` (dev 분기 plugin, FR-14 옵션 (a) 채택 시)
- `package.json` 의 `VITE_*_API_BASE` 환경변수 규약

### 4.2 외부 의존
- MDN CSP reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
- OWASP ASVS V14.4
- securityheaders.com / Mozilla Observatory 스캐너

### 4.3 하류 영향
- `style={{}}` inline 스타일 6곳 → CSS Modules 이관 시 `style-src 'unsafe-inline'` 제거 가능 (별 REQ).
- `report-uri` / `report-to` 원격 수집 도입 시 별 백엔드 엔드포인트 필요.
- 향후 외부 스크립트 (GA/GTM 등) 추가 시 `script-src` 갱신 필요.

## 5. 수용 기준 (Acceptance)

### 5.1 REQ-20260419-040 수용 기준 (CSP meta 도입)
- [x] FR-01: `index.html` 에 `<meta http-equiv="Content-Security-Policy" content="...">` 단일 태그 추가 (commit `67794e1`, index.html:9)
- [x] FR-02 ~ FR-10: §3.1 표의 9 directive 모두 정확한 값으로 포함 (commit `67794e1`, task result.md DoD 박제)
- [x] FR-11: `npm run build` 후 `build/index.html` 에 meta 태그 보존 (grep count=1, task result.md §테스트 결과)
- [ ] FR-12 (Should): `docs/testing/csp-smoke.md` 신설 + 운영자 1회 baseline (별 task `20260420-csp-smoke-checklist` 큐잉)
- [x] FR-13: 본 `csp-policy-spec.md` 존재 (본 문서로 충족)
- [ ] FR-14: dev/prod 분기 처리 (옵션 (a) 또는 (b) 중 1 선택 + 박제) (별 task `20260420-csp-dev-prod-branch` 분리)
- [ ] FR-15 (Should): 업로드 CDN 도메인 확인 → `img-src` 에 추가 (운영자 followup 스텁)
**[deferred: NFR-01 은 외부 스캐너(securityheaders.com / Mozilla Observatory) 결과 관측이 유일 검증 수단 — 코드 변경 아니라 운영자 세션에서 등급 확인 후 사인오프; 67794e1 머지 완료 → 운영자 1회 스캔 followup 스텁 생성]**
- [ ] NFR-01: securityheaders.com / Mozilla Observatory CSP 항목 통과 (F → A/B 이상)
**[deferred: NFR-02 는 DevTools Console CSP violation 수동 관측 — 자동화 불가(jsdom CSP 미지원, §7 알려진 제약 박제), 운영자 수동 smoke 세션에서 5 경로 위반 0 확인 사인오프]**
- [ ] NFR-02: 모든 주요 경로 렌더 회귀 0 (수동 smoke 0 violation)
- [x] NFR-03: `npm run build` 성공 (task result.md: 356ms 성공, `build/` 산출물 정상)
- [x] NFR-04: `npm test` 100% PASS (39 files / 317 tests, coverage Statements 97.96% / Branches 95.29%)
- [x] NFR-06: 번들 / gzipped size diff < 1KB (meta 태그 1줄 ~500 bytes)

## 6. 비기능 특성 (NFR Status)

| 항목 | 현재 | 목표 | 메모 |
|------|------|------|------|
| XSS 방어 | 1차만 (sanitize) | 1차 + 2차 (CSP) | defense-in-depth |
| clickjacking | 미방어 | `frame-ancestors 'none'` | iframe 임베드 금지 |
| 외부 리소스 주입 | 제한 없음 | 화이트리스트 기반 | 명시적 호스트만 |
| 보안 등급 | F (CSP 0) | A/B (Observatory) | NFR-01 |

## 7. 알려진 제약 / 이슈
- jsdom 은 CSP enforce 를 지원하지 않아 단위 테스트로 검증 불가 — 수동 smoke 필수.
- `'unsafe-inline'` in `style-src` 는 XSS 방어 완전성을 일부 손상 — 별 REQ 로 nonce/해시 전환 트랙.
- `report-uri` 부재 시 violation 관측 수단 없음 — DevTools Console 수동 확인 한정.
- dev HMR 호환성 — FR-14 옵션 (a)/(b) 중 선택 (planner).
- AWS API Gateway 호스트 확정 전에는 `connect-src` 값 확정 불가 — 운영자 확인 필요.

## 8. 변경 이력 (Changelog — via Task)
| 일자 | TSK | 요약 | 영향 섹션 |
|------|-----|------|-----------|
| 2026-04-19 | (pending, REQ-20260419-040) | CSP meta 태그 defense-in-depth 정책 spec 초기화 (9 directive 설계, dev/prod 분기, 수동 smoke 체크리스트, 빌드 무결성 검증) (WIP) | 전체 |
| 2026-04-20 | (inspector drift reconcile) | §3 헤더 rename: "(To-Be, WIP)" 제거 (planner §4 Cond-3 충족, d0d49c6 선례) | 3 |
| 2026-04-20 | §5.1 operator UNCHK 2행(NFR-01, NFR-02) defer-tag (planner §4 Cond-2 충족 목적) | inspector |
| 2026-04-20 | TSK-20260420-08 (67794e1) | CSP meta 태그 index.html 도입 (9 directive, build grep 검증 PASS, 317/317 PASS) — FR-01 ~ FR-11, FR-13 + NFR-03/04/06 flip | 2, 5.1 |

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/ready/20260419-csp-meta-defense-in-depth-introduction.md` (REQ-20260419-040)
- 1차 방어: `specs/spec/green/common/sanitizeHtml-spec.md`
- 관련 REQ:
  - REQ-20260418-001 (sanitize-markdown-html-output, done)
  - REQ-20260418-102 (sanitize-html-logitem-writer-integration, done)
  - REQ-20260418-104 (sanitize-html-uri-safe-attr-spec-drift, done)
- 외부:
  - MDN CSP reference
  - OWASP ASVS V14.4
  - securityheaders.com / Mozilla Observatory
