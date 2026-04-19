# 명세: React Runtime Version

> **위치**: `package.json` (의존성), `src/index.jsx` (createRoot 사용)
> **유형**: Build / Runtime baseline
> **최종 업데이트**: 2026-04-18 (by inspector, WIP — REQ-20260418-012 반영)
> **상태**: Active (업그레이드 실행 단계)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/18/20260417-upgrade-react-19.md` (사전 감사)
> - `specs/requirements/ready/20260418-react-19-bump-and-testing-library.md` (REQ-20260418-012, 실행 + RTL + deprecation audit)
> - `specs/requirements/done/2026/04/18/20260418-react-19-bump-execution-drift-resolve.md` (REQ-20260418-040, REQ-012 done 상태와 실태 drift 해소 — 물리 bump 재실행 + post-bump audit §7 박제)
> - `specs/requirements/done/2026/04/18/20260418-imageitem-imperative-dom-react-refactor.md` (REQ-20260418-026, React 19 strict mode 안전성 — 명령형 DOM mutation 제거, bump 선행 권장)

> 본 문서는 React 런타임 버전과 그에 따른 사용 패턴의 SSoT.
> 컴포넌트 단위 명세는 별도 spec 에서 관리. 본 문서는 **버전 baseline 및 채택 기능 정책**.

---

## 1. 역할 (Role & Responsibility)
프로젝트가 사용하는 React 메이저 버전과 그에 수반되는 API 채택/제거 정책을 단일 출처로 명시.

- 주 책임:
  - React/ReactDOM 메이저 버전 명시
  - 채택한 신규 API 와 의도적으로 미채택한 API 구분
  - 테스트 라이브러리 호환 버전 명시
  - post-bump deprecation 관측 결과의 축적 지점 명시
- 의도적으로 하지 않는 것:
  - 컴포넌트별 구현 디테일 (각 컴포넌트 spec)
  - 빌드 도구 선택 (별도 spec)

## 2. [WIP] 버전 정책

> 관련 요구사항: 20260417-upgrade-react-19, **REQ-20260418-012**, **REQ-20260418-040** (drift 해소 실행)

### 2.1 현재 baseline
- `react`: `^18.2.0` — **drift 주의**: REQ-012 는 done 이지만 `package.json:11-12` / `node_modules/react/package.json:7` 모두 `18.2.0` 그대로. `npm outdated` 가 `18.2.0 → 19.2.5` 격차를 보고. REQ-20260418-040 이 물리 bump 를 재실행하여 본 행을 `^19.x` 로 갱신 예정 (inspector 는 REQ-040 머지 후 본 행 baseline 을 갱신).
- `react-dom`: `^18.2.0` — 동일 drift.
- `@testing-library/react`: `^13.4.0` (React 18 peer) — 동일 drift (`16.3.2` 목표).

### 2.2 목표 baseline (WIP — REQ-20260418-012 실행 범위)
- `react`: `^19.x` (예: 19.2.5)
- `react-dom`: `^19.x`
- `@testing-library/react`: `^16.x` (React 19 호환)
- **bump 3건은 단일 커밋/인접 시퀀스로 강제** — 중간 상태(예: react 19 + RTL 13) 에서 테스트 깨짐 회피.

### 2.3 채택할 신규 API
- `ref` 가 일반 prop → `forwardRef` 사용처 제거
- 문서 메타데이터 내장 (`<title>`, `<meta>`) — 필요 시 사용
- `use()` 훅 — Promise/Context 소비
- Actions + `useActionState`, `useFormStatus`, `useOptimistic` — 폼 작성 흐름에 점진 적용

### 2.4 미채택 (Out-of-Scope)
- React Compiler 본격 도입 → 안정화 후 별건
- React Server Components / Server Actions → SPA 구조 유지 전제로 도입 안 함
- `prop-types` 제거 → TypeScript 전환 후 (별 spec 의존)
- 신규 API 채택 요구사항 (`use`, `useActionState`, …) — 본 bump 범위 밖, 별 요구사항

## 3. 의존성

### 3.1 상류 의존
- **빌드 도구**: Vite (`^8.0.8`) + `@vitejs/plugin-react@^6.0.1` — React 19 지원 확인됨 (사전 감사 §3.1).
- **테스트 환경**: `@testing-library/react` 16+ 가 React 19 와 호환. `@testing-library/jest-dom@5.17.0` / `vitest@4.1.4` + `@vitest/coverage-v8@4.1.4` 는 React 19 에서 안정 동작 가정 (검증 필요).
- **라우터**: `react-router-dom@^7.14.1` 은 React 19 호환 (사전 감사 §3.1).

### 3.2 하류 영향
- 모든 컴포넌트 spec — `forwardRef` 사용처 (없음, 감사 §2.1) 갱신
- TanStack Query Suspense 패턴 (`server-state-spec.md` §2.4) — React 19 후 고려
- `@types/react` / `@types/react-dom` 핀 (`typescript-spec.md` §3.x) — REQ-20260418-019 (A) 와 동기 bump

## 4. 수용 기준 (Acceptance — REQ-20260418-012)
- [ ] 기존 기능 모두 정상 동작 (`npm run dev` 기본 라우트 수동 클릭)
- [ ] 테스트 전부 통과 (`npm test` 100% PASS — 기준 25 파일 / 185 PASS)
- [ ] 콘솔 deprecation warning 0 (또는 §5 알려진 제약 에 사유 + followup)
- [x] `forwardRef` import 0 건 — 사전 감사 §2.1 확인 (`grep -rn "forwardRef" src/` → 0)
- [ ] `npm ls react react-dom` → `19.x`; `npm ls @testing-library/react` → `16.x`
- [ ] `npm run build` 성공 + 번들 크기 ±5% 이내
- [ ] `npm run lint` 통과
- [ ] 변경 파일이 `package.json`, `package-lock.json`, 본 spec, `docs/react-19-audit.md` 로 한정 (소스 변경 시 합리적 사유)
- [ ] post-bump 관측 결과가 `docs/react-19-audit.md` §7 에 기록 (경고 0 이어도 명시)
- [ ] 경고가 즉시 수정 불가일 때 `specs/followups/` 에 분기 항목 존재

## 4.0.1 [WIP] REQ-012 done/실태 drift 해소 재실행 (REQ-20260418-040)

> 관련 요구사항: REQ-20260418-040 FR-01 ~ FR-10, US-01~US-03

**맥락 (2026-04-18 관측)**: REQ-20260418-012 (`react-19-bump-and-testing-library`) 가 `specs/requirements/done/2026/04/18/` 에 머물러 있어 "처리 완료" 로 간주되지만, 실제 물리 bump 는 미수행. 증거:
- `package.json:11-12`: `"react": "^18.2.0"`, `"react-dom": "^18.2.0"`.
- `package.json:44`: `"@testing-library/react": "^13.4.0"`.
- `node_modules/react/package.json:7`: `"version": "18.2.0"`.
- `npm outdated` (2026-04-18): `react 18.2.0 → 19.2.5`, `react-dom 18.2.0 → 19.2.5`, `@testing-library/react 13.4.0 → 16.3.2`, `@types/react 18.3.28 → 19.2.14`, `@types/react-dom 18.3.7 → 19.2.3`.
- 본 spec §2.1 (현재 baseline) 도 여전히 `^18.2.0` 표기 — spec 자체가 "미반영 WIP" 를 인지 중.
- `docs/react-19-audit.md` §7 (Post-bump observations) 슬롯 — 미작성.

**하류 차단 리스크**: REQ-012 done 가정에 적층된 후속 작업들(`useActionState` 도입 후보, TanStack Query Suspense 패턴 §3.2 server-state-spec, React Compiler 평가, `@types/react@19.x` 정합 등) 이 React 18 위에서 잘못된 전제로 진행되면 strict mode 효과 / Suspense 동작 가정 회귀.

**목표 (FR-01 ~ FR-10)**:
- 단일 코히어런트 bump (1 PR / 1 커밋) 로 react / react-dom / @testing-library/react / @types/react / @types/react-dom 동시 갱신. 분리 시 중간 상태(예: react 19 + RTL 13) 에서 테스트 깨짐 강제 차단.
- `npm install` 후 `package-lock.json` 일관성 유지.
- 회귀 검증: `npm test` 35 파일 / ~292 PASS, `npm run build` ±5% 번들 크기, `npm run lint` PASS.
- 본 spec §2.1 baseline 갱신 트리거는 **inspector 가 REQ-040 머지 후 담당** (본 PR 의 코드/의존 변경 범위 밖).
- `docs/react-19-audit.md` §7 Post-bump observations 신설/갱신 — `npm test` / `npm run build` / `npm run dev` 콘솔의 deprecation 경고 (0 이어도 "0건 확인") 박제.
- 즉시 수정 가능한 경고 ≤3 건은 본 PR 안에서 처리. 4건 이상 또는 수정 비용 큰 항목은 `specs/followups/` 분기.

**범위 밖 (REQ-040 §3.2)**: React 19 신규 API 채택 (`use()`, `useActionState`, `useFormStatus`, `useOptimistic`, 문서 메타), React Compiler 본격 도입, React Server Components / Actions, `prop-types` 제거 (TS 의존), StrictMode 임시 비활성, `@testing-library/jest-dom@5 → 6`, `eslint@8 → 10` / `husky@8 → 9` 동반 bump — 모두 별 REQ.

**수용 기준 (REQ-20260418-040 §10)**:
- [ ] `package.json` 의 `react`, `react-dom`, `@testing-library/react`, `@types/react`, `@types/react-dom` 핀이 모두 `^19.x` 또는 `^16.x` (RTL)
- [ ] `npm ls react react-dom` → `19.x.y`; `npm ls @testing-library/react` → `16.x.y`
- [ ] `npm test` 35 파일 100% PASS (어서트 수정 시 사유 PR 본문 기록)
- [ ] `npm run build` PASS, 번들 크기 ±5% 이내 (NFR-01)
- [ ] `npm run lint` PASS
- [ ] `docs/react-19-audit.md` §7 신설 — 3 단계 deprecation 경고 박제 (0 이어도 명시)
- [ ] 4건 이상 또는 수정 비용 큰 deprecation 은 `specs/followups/` 에 분기
- [ ] inspector 가 본 spec §2.1 / §4 를 갱신 (체크박스 마감, 현재 baseline = `^19.x`)
- [ ] 본 REQ 머지 후 REQ-037 (`error-boundary-runtime-smoke`) / REQ-035 (`comment-visual-smoke`) baseline 2회 슬롯 운영자 수행 (cascade 검증)

**NFR 목표 (REQ-20260418-040 §7)**: 번들 ±5% (NFR-01), `npm test` 35 파일 / 100% (NFR-02), `docs/react-19-audit.md` §7 deprecation 박제 (NFR-03), `react-router-dom@^7.14.1` / `@vitejs/plugin-react@^6.0.1` 호환 영향 0 (NFR-04), spec §2.1 = 코드 실태 post-merge (NFR-05).

## 4.1 [WIP] bump 선행 위생 작업 (REQ-20260418-026)

> 관련 요구사항: REQ-20260418-026 FR-01~07, US-03

React 19 strict mode 의 effect double-invocation / concurrent 렌더 / fiber suspend 는 **명령형 DOM mutation** 과 충돌 위험이 높다. 본 bump 를 안전하게 수행하려면 미리 명령형 `setAttribute` 사용처를 선언적 상태로 전환하는 것이 권장된다.

**확인된 사용처 (2026-04-18)**:
- `src/Image/ImageItem.jsx:23-38` — `e.target.setAttribute("class" | "src" | "enlarged", ...)` 6건. **REQ-026 에서 리팩터 진행 중** (상세는 `styles/css-modules-spec.md` §10.1).
- 유사 패턴 (별 후보 대상):
  - `src/Image/ImageSelector.jsx` — 명령형 패턴 추가 검토 필요.
  - `src/Search/SearchInput.jsx:118-126` — `setAttribute("class", ...)` 분기.

**권장 머지 순서**: REQ-026 (ImageItem 리팩터) → REQ-012 (React 19 bump). bump 전 선행 시 strict mode 회귀 감지 부담 감소 (NFR-01 of REQ-026).

**검증 연계 (REQ-028 배치 2)**: `docs/testing/image-selector-visual-smoke.md` (REQ-028 후속) 는 REQ-026 리팩터 후 동일 baseline 으로 ImageSelector 시각 회귀 1회 체크 가능 — bump 회귀 감시 겸용.

## 5. 알려진 제약 / 이슈
- React 19 의 strict mode 변화 (effect double-invocation) 가 일부 테스트에 영향 줄 수 있음 — 회귀 검사 필수. 큰 수정이면 별 followup.
- **명령형 `setAttribute` 잔존 위치** (`src/Image/ImageItem.jsx` 외 ImageSelector/SearchInput 가능성) 가 bump 후 상태 회귀를 일으킬 수 있음 — REQ-20260418-026 선행 권장.
- 서드파티 라이브러리 React 19 호환 확인 (`react-router-dom`, `@testing-library/*`) — 감사 §3.1 통과.
- `@testing-library/jest-dom@5.17.0 → 6.9.1` 도 함께 bump 검토 — 본 요구사항 범위 밖, 별 후보.
- `prop-types` 가 React 19 에서 런타임은 동작하되 deprecation 경고 가능 — 본 PR 에서 제거하지 않음 (TS 마이그레이션 의존).
- StrictMode 일시 비활성 옵션은 정책 판단 필요 — REQ-012 §13 미결.

## 6. Post-bump 관측 축적 지점 (REQ-20260418-012 Phase C)
> 관련 요구사항: REQ-20260418-012 FR-07, FR-08, FR-09, US-03

- bump 직후 실행 루틴 (단일 PR 안에서):
  - `npm test` stderr/stdout 의 deprecation 경고 수집
  - `npm run build` 콘솔 수집
  - `npm run dev` 기본 라우트(`/log`, `/log/:timestamp`, `/file`, `/monitor`) 수동 진입 → 브라우저 콘솔 수집
- 결과 기록 위치: `docs/react-19-audit.md` §7 "Post-bump observations" (경고 0 이어도 섹션 작성).
- 즉시 수정 가능한 경고는 같은 PR 에서 정리. 수정량이 크면 `specs/followups/` 로 분기 (임계치는 REQ §13 미결, 기본: ≤3 건이면 같은 PR, 4 건 이상이면 분기 권장).
- 본 섹션이 "콘솔 deprecation warning 0" 수용 기준의 근거.

## 7. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-18 | (pending) | React 19 업그레이드 요구사항 등록 (WIP) | 2 |
| 2026-04-18 | (pending, REQ-20260418-012) | React 19 + RTL 16 실행 범위, post-bump deprecation 관측 루틴 추가 (WIP) | 2, 4, 5, 6 |
| 2026-04-18 | (pending, REQ-20260418-026) | ImageItem 명령형 DOM 선행 위생 §4.1 신설 — bump 선행 권장 (WIP) | 4.1, 5 |
| 2026-04-18 | (pending, REQ-20260418-040) | REQ-012 done/실태 drift 해소 §4.0.1 신설 — 물리 bump 재실행 + post-bump audit §7 박제 + inspector baseline 갱신 트리거 (WIP) | 2.1, 4.0.1 |

## 8. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/18/20260417-upgrade-react-19.md`
- 실행 요구사항: `specs/requirements/done/2026/04/18/20260418-react-19-bump-and-testing-library.md` (이동 후)
- 선행 권장 요구사항: `specs/requirements/done/2026/04/18/20260418-imageitem-imperative-dom-react-refactor.md` (REQ-026, 명령형 DOM 제거)
- 관련 spec: `specs/spec/green/styles/css-modules-spec.md` §10.1 (REQ-026 상세 정책)
- 관련 spec: `specs/spec/green/types/typescript-spec.md` (`@types/react` 핀 — REQ-20260418-019 A)
- 관련 spec: `specs/spec/green/state/server-state-spec.md` (Suspense Query 패턴)
- 사전 감사: `docs/react-19-audit.md` §1, §3, §4, §7 (신규)
- 외부: https://react.dev/blog/2024/12/05/react-19
