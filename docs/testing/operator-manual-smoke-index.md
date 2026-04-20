# 운영자 수동 브라우저 스모크 체크리스트 Index

> 생성일: 2026-04-20
> 출처 spec: [`specs/spec/green/testing/operator-manual-smoke-index-spec.md`](../../specs/spec/green/testing/operator-manual-smoke-index-spec.md) (SSoT — 표 스키마/등록 프로세스)
> 출처 REQ: REQ-20260420-026 (`specs/requirements/done/2026/04/20/20260420-operator-manual-smoke-checklist-index.md`, gitignore 상 로컬 전용)
> 관련 Task: TSK-20260420-21

## 1. 목적

릴리스 직전 / 분기말 / 환경 변경 후 운영자가 **한 번에 돌려야 할** 수동 smoke 체크리스트의 단일 진입점 색인. 자동화(vitest + jsdom) 경계 밖의 브라우저 전제 검증을 한 표로 수렴하여 누락 반복과 "미수행(unverified)" 상태 체류를 줄인다. 개별 체크리스트 본문은 수정하지 않으며, 링크·실행 트리거·마지막 실행일만 관리한다. 출처 spec §1, §3 참조.

## 2. 체크리스트 인덱스

실행 순서는 운영자 재량. "마지막 실행일 = `unverified`" 인 row 는 우선 점검 대상 (§4 참고).

| 영역 | 체크리스트 파일 | 자동화 공백 요지 | 실행 트리거 | 마지막 실행일 | 담당 후보 | 출처 REQ/followup |
|------|----------------|-------------------|-------------|--------------|-----------|-------------------|
| Search (SA-05 loadingDots) | [docs/testing/search-abort-runtime-smoke.md](./search-abort-runtime-smoke.md), [spec/blue](../../specs/spec/blue/testing/search-abort-runtime-smoke-spec.md) | `setInterval` throttle drift — jsdom timer 정밀도 한계, 실제 프레임 기반 dot 애니메이션 관측 불가 | 릴리스 직전 / 기능 변경 직후 | `unverified` [^sa05] | 운영자 | REQ-20260420-026, [followup SA-05](../../specs/followups/consumed/2026/04/20/20260420-0854-search-loadingdots-sa05-manual-unverified.md) |
| LogSingle 라우팅/Skeleton | [spec/blue](../../specs/spec/blue/testing/logsingle-runtime-smoke-spec.md) | dynamic import + Suspense fallback 실제 paint — jsdom async boundary 시각화 불가 | 릴리스 직전 / 기능 변경 직후 | `unverified` [^logsingle] | 운영자 | REQ-20260420-026, [followup LogSingle Skeleton](../../specs/followups/consumed/2026/04/20/20260420-1802-manual-ui-verify-logsingle-skeleton.md) |
| LogList SeeMore | [spec/blue](../../specs/spec/blue/testing/loglist-seemore-runtime-smoke-spec.md) | infinite scroll 트리거 실제 스크롤 — jsdom scroll event 한계 | 릴리스 직전 | (미수행) | 운영자 | REQ-20260420-026 |
| FileItem 삭제 Visual | [spec/blue](../../specs/spec/blue/testing/fileitem-delete-visual-smoke-spec.md) | 삭제 애니메이션/토스트 연쇄 — 브라우저 렌더 타이밍 필요 | 릴리스 직전 / 기능 변경 직후 | (미수행) | 운영자 | REQ-20260420-026 |
| Markdown 렌더 | [docs/testing/markdown-render-smoke.md](./markdown-render-smoke.md), [spec/blue](../../specs/spec/blue/testing/markdown-render-smoke-spec.md) | 코드블록 하이라이트 + HTML sanitize 시각 검증 — jsdom 스타일 계산 부재 | 릴리스 직전 / 분기말 | (미수행) | 운영자 | REQ-20260420-026 |
| Log Mutation 런타임 | [docs/testing/log-mutation-runtime-smoke.md](./log-mutation-runtime-smoke.md), [spec/blue](../../specs/spec/blue/testing/log-mutation-runtime-smoke-spec.md) | optimistic update 롤백 시 UI 깜빡임 — 실제 네트워크 지연 재현 불가 | 릴리스 직전 / 분기말 | (미수행) | 운영자 | REQ-20260420-026 |
| Styles Cascade Visual | [docs/testing/styles-cascade-visual-smoke.md](./styles-cascade-visual-smoke.md), [spec/blue](../../specs/spec/blue/testing/styles-cascade-visual-smoke-spec.md) | CSS Modules + global 병합 시각 회귀 — 스타일 시트 계산 부재 | 릴리스 직전 / 환경 변경 후 | (미수행) | 릴리스 담당 | REQ-20260420-026 |
| TanStack Query Devtools | [docs/testing/tanstack-query-devtools-smoke.md](./tanstack-query-devtools-smoke.md), [spec/blue](../../specs/spec/blue/testing/tanstack-query-devtools-smoke-spec.md) | Devtools 플로팅 UI / production 분기 — 빌드 산출물 동작 검증 | 릴리스 직전 / 환경 변경 후 | (미수행) | 릴리스 담당 | REQ-20260420-026 |
| Toaster Visual | [docs/testing/toaster-visual-smoke.md](./toaster-visual-smoke.md), [spec/blue](../../specs/spec/blue/testing/toaster-visual-smoke-spec.md) | 토스트 애니메이션/스태킹 — 실제 브라우저 레이아웃 필요 | 릴리스 직전 | (미수행) | 운영자 | REQ-20260420-026 |
| Web Vitals 런타임 | [docs/testing/web-vitals-runtime-smoke.md](./web-vitals-runtime-smoke.md), [spec/blue](../../specs/spec/blue/testing/web-vitals-runtime-smoke-spec.md) | LCP/INP/CLS 실측 — 브라우저 PerformanceObserver 전제 | 릴리스 직전 / 분기말 / 환경 변경 후 | (미수행) | 릴리스 담당 | REQ-20260420-026 |
| Error Boundary 런타임 | [docs/testing/error-boundary-runtime-smoke.md](./error-boundary-runtime-smoke.md) | 런타임 에러 발생 시 fallback UI 실측 — jsdom 렌더 트리 한계 | 릴리스 직전 / 기능 변경 직후 | (미수행) | 운영자 | REQ-20260420-026 |
| App Shell Side Effects | [spec/blue](../../specs/spec/blue/testing/app-shell-side-effects-smoke-spec.md) | 라우팅/테마/로케일 side-effect 실측 — jsdom 전역 훅 한계 | 릴리스 직전 / 환경 변경 후 | (미수행) | 운영자 | REQ-20260420-026 |
| Post-Merge Visual | [spec/blue](../../specs/spec/blue/testing/post-merge-visual-smoke-spec.md) | 머지 직후 레이아웃/아이콘 회귀 — 실제 빌드 산출물 필요 | 릴리스 직전 / 기능 변경 직후 | (미수행) | 릴리스 담당 | REQ-20260420-026 |

> "체크리스트 파일" 컬럼은 docs/testing/ 내부 문서를 **앞에** 배치(상대 경로가 가장 안정적), 이어서 `spec/blue/testing/` SSoT 링크를 보조로 표기. `specs/requirements/done/**` 은 gitignore 상 로컬 전용이라 본 index 에서 링크 대상 제외 (spec §3.3 "또는" 분기에서 spec/blue 우선 원칙).

## 3. 자동화 공백 — 왜 수동인가

- jsdom 기반 vitest 환경은 실제 레이아웃 계산, `setInterval` 프레임 드리프트, PerformanceObserver, 스크롤/포커스/포인터 이벤트, CSS cascade 렌더, 네트워크 latency 등을 재현하지 못한다.
- Playwright / E2E 도입 전까지 본 index 가 유일한 통합 진입점. 도입 후 일부 row 는 자동화로 승격 후 제거 (출처 spec §3.8 open).

## 4. Unverified 우선순위 (4건)

REQ-20260420-026 도입 시점 followup 이 "미수행" 으로 남긴 항목들. 릴리스 직전 순회에서 최우선으로 수행 권장.

| # | 영역 | 출처 followup | 비고 |
|---|------|--------------|------|
| 1 | Search SA-05 loadingDots throttle | [20260420-0854-search-loadingdots-sa05-manual-unverified.md](../../specs/followups/consumed/2026/04/20/20260420-0854-search-loadingdots-sa05-manual-unverified.md) | `unverified` — REQ-20260420-026 시점 followup 지적 |
| 2 | parseJwt 손상 쿠키 DevTools 검증 | [20260420-1750-parsejwt-corrupted-cookie-manual-devtools-verification.md](../../specs/followups/consumed/2026/04/20/20260420-1750-parsejwt-corrupted-cookie-manual-devtools-verification.md) | `unverified` — REQ-20260420-026 시점 followup 지적 |
| 3 | SearchInput 모바일/matchMedia UX | [20260420-1757-searchinput-manual-verification-unperformed.md](../../specs/followups/consumed/2026/04/20/20260420-1757-searchinput-manual-verification-unperformed.md) | `unverified` — REQ-20260420-026 시점 followup 지적 |
| 4 | LogSingle Skeleton 수동 UI 검증 | [20260420-1802-manual-ui-verify-logsingle-skeleton.md](../../specs/followups/consumed/2026/04/20/20260420-1802-manual-ui-verify-logsingle-skeleton.md) | `unverified` — REQ-20260420-026 시점 followup 지적 |

> followup 경로는 `specs/followups/consumed/**` (gitignore 상 로컬 전용). 본 index 가 원격에 푸시되는 상황에서도 로컬 운영자 환경에서는 링크가 유효. 원격 뷰어에서 404 시 파일명으로 `git log --all --full-history -- <path>` 조회.

## 5. 실행 트리거 분류

출처 spec §3.5 토큰. row 의 "실행 트리거" 컬럼에서 사용.

- **릴리스 직전** (기본, 모든 row 최소 1회 권장)
- **분기말** — 누적 drift 점검용
- **환경 변경 후** — Vite / Node / React 메이저 버전 bump 시
- **보안 정책 변경 후** — CSP / Cognito / Auth 정책 수정 시
- **기능 변경 직후** — 해당 영역 REQ 머지 시 1회

## 6. 유지보수 프로세스

신규 체크리스트 추가 시 이 표에 row 추가 — 새 아티팩트 머지 후 row 1개 append, 출처 REQ/followup ID 박제, 초기 "마지막 실행일 = unverified".

## 7. 미결 / 후속

Playwright 도입 후 일부 row 는 자동화로 승격되어 별 REQ 로 제거 예정 (출처 spec §3.8 open). React 19 bump(REQ-040 이후) 과도기 운영 프로세스 — Playwright 도입 전까지 본 index 가 유일한 통합 진입점.

---

[^sa05]: `unverified` — REQ-20260420-026 시점 followup 지적 (spec §3.4 §1).
[^logsingle]: `unverified` — REQ-20260420-026 시점 followup 지적 (spec §3.4 §4).
