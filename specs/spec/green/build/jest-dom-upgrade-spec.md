# 명세: `@testing-library/jest-dom` v5 → v6 업그레이드

> **위치**: `package.json:43` (`@testing-library/jest-dom` 의존), `src/setupTests.js:4` (matcher 등록), `vite.config.js:46-60` (Vitest setup)
> **유형**: Build / Test runtime baseline
> **최종 업데이트**: 2026-04-19 (by inspector, WIP — REQ-20260419-025 초안)
> **상태**: Active (업그레이드 계획 단계)
> **관련 요구사항**:
> - `specs/requirements/done/2026/04/19/20260419-testing-library-jest-dom-v5-to-v6-upgrade.md` (REQ-20260419-025, v5.17.0 → v6.9.1 업그레이드 실행)
> - `specs/requirements/done/2026/04/18/20260418-react-19-bump-execution-drift-resolve.md` (REQ-20260418-040, §13 Open Questions — jest-dom@6 분리 권장)
> - `specs/requirements/done/2026/04/18/20260418-react-19-bump-and-testing-library.md` (REQ-20260418-012, RTL v16 bump)

> 본 문서는 `@testing-library/jest-dom` matcher 라이브러리 버전 정책의 SSoT.
> `@testing-library/react` 등 다른 testing-library 패키지 버전 정책은 `react-version-spec.md` §2~§3 이 담당. 본 spec 은 **`jest-dom` matcher 라이브러리 단독 범주**.

---

## 1. 역할 (Role & Responsibility)

Vitest + jsdom 환경에서 DOM 어서트 matcher (`toBeInTheDocument`, `toHaveTextContent`, `toHaveClass` 등) 제공 라이브러리의 버전·import 방식·제거된 matcher 정책을 단일 출처로 명시.

- 주 책임:
  - `@testing-library/jest-dom` 메이저 버전 baseline 명시
  - Vitest 통합 방식 (`/vitest` 진입점 사용 여부) 명시
  - v5 → v6 사이 제거된 matcher 목록 및 대체 matcher 매핑 유지
  - 테스트 파일에서의 사용 규약 명시
- 의도적으로 하지 않는 것:
  - `@testing-library/react` 버전 정책 — `react-version-spec.md` §2
  - Vitest 자체 업그레이드 — 별 baseline (Vitest v4 유지)
  - 테스트 헬퍼(`renderWithQuery`) — `server-state-spec.md` §4.3.1

> 관련 요구사항: REQ-20260419-025 §3 (Goals)

---

## 2. 현재 상태 (As-Is)

### 2.1 현재 baseline (2026-04-19)

- `package.json:43` — `"@testing-library/jest-dom": "^5.17.0"` (`^5.x` 캐럿은 메이저 고정 → 자동 bump 불가)
- `node_modules/@testing-library/jest-dom/package.json` → `5.17.0`
- `src/setupTests.js:4` — `import '@testing-library/jest-dom'` (v5 범용 진입점)
- `vite.config.js:46-60` — `test.setupFiles: ['./src/setupTests.js']`, `test.environment: 'jsdom'`
- `npm outdated`: `@testing-library/jest-dom: 5.17.0 → 6.9.1 (latest)` (2026-04-19)

### 2.2 관측 사용 matcher (grep baseline)

- `toBeInTheDocument()`, `toHaveTextContent(...)`, `toHaveClass(...)`, `toHaveAttribute(...)` 등 공통 matcher 다수 사용.
- v6 에서 제거된 matcher (`toBeEmpty`, `toBeInTheDOM`) 의 현재 사용 여부는 FR-03 사전 grep 에서 확정 (예상 0 또는 소수).

### 2.3 맥락 (drift 근거)

- `react-version-spec.md` §3.1 은 "`@testing-library/jest-dom@5.17.0` / `vitest@4.1.4` + `@vitest/coverage-v8@4.1.4` 는 React 19 에서 안정 동작 가정 (검증 필요)" 로 명시하고, §5 는 "`5.17.0 → 6.9.1` 도 함께 bump 검토 — 본 요구사항 범위 밖, 별 후보" 로 분리 의사 박제.
- REQ-20260418-040 §13 "Open Questions" 에 "`jest-dom@5 → 6` 을 본 PR 에 포함할지 별 요구사항으로 분리할지 — 기본은 분리" 결정 기록.
- REQ-20260419-025 가 이 별 후보를 실행 요구사항으로 승격.

## 3. 도입 정책 (To-Be, WIP)

> 관련 요구사항: REQ-20260419-025

### 3.1 목표 baseline

- `@testing-library/jest-dom`: `^6.9.1` (메이저 6)
- import 방식: `import '@testing-library/jest-dom/vitest'` 또는 범용 `import '@testing-library/jest-dom'` — FR-02 에서 v6 공식 vitest 가이드에 따라 결정.
  - v6 은 Vitest 의 `expect` 전역에 matcher 를 자동 등록하는 `/vitest` 진입점을 제공. Vitest 4.x 의 `test.globals: true` 여부와 호환성 검증 필요 (미결 §7).
- 제거된 matcher 목록 (v5 → v6):
  - `toBeEmpty` → `toBeEmptyDOMElement`
  - `toBeInTheDOM` → 비공개 API, 사용 지양 (대체는 `toBeInTheDocument` 또는 해당 노드 부모 containment 어서트)
- 기타 v6 변경점: TypeScript type 선언 구조 재편, deprecated matcher 제거, peer 의존 `@testing-library/react` v13+ 호환 유지 (호환 경고는 RTL v16 bump 후 해소).

### 3.2 Vitest 통합 방식 (FR-02 결정 지점)

- 전략 V1 (권장): `src/setupTests.js` 를 `import '@testing-library/jest-dom/vitest';` 로 교체. Vitest 의 `expect` 타입 확장이 가장 정확.
- 전략 V2 (fallback): 범용 `import '@testing-library/jest-dom';` 유지. 기존 동작과 가장 가깝고 마이그레이션 비용 최소. 단 TS 전환(`types/typescript-spec.md`) 후 type 확장 정확도에서 V1 대비 열위.
- 결정은 REQ-025 태스크 분할 시 1회 확정. 본 spec 은 기본 V1, fallback V2 허용 (미결 §7).

### 3.3 제거 matcher 사전 grep (FR-03)

- `grep -rn "toBeEmpty\b\|toBeInTheDOM" src/` — 발견 시 v6 대체 matcher 로 교체.
- 발견 매치 수 0 이면 sweep 불필요 (NFR-01 무영향).

### 3.4 peer 호환 매트릭스

| Package | 현재 | REQ-025 후 | REQ-040 후 (react-version-spec §2.2) |
|---------|------|-----------|--------------------------------------|
| `@testing-library/jest-dom` | `^5.17.0` | **`^6.9.1`** | `^6.9.1` |
| `@testing-library/react` | `^13.4.0` | `^13.4.0` (REQ-025 독립) | `^16.x` |
| `vitest` | `^4.1.4` | `^4.1.4` | `^4.1.4` |
| `jsdom` | `^29.0.2` | `^29.0.2` | `^29.0.2` |
| `react` / `react-dom` | `^18.2.0` | `^18.2.0` | `^19.x` |

- REQ-025 는 RTL / React 버전에 독립적으로 진행 가능 — peer 경고(`jest-dom@6` + RTL v13) 는 기능 동작에 영향 없음(REQ-025 §8 가정). RTL v16 + React 19 머지 후 peer 경고 0 로 수렴.

### 3.5 grep 회귀 차단 (NFR-01)

- `grep -rn "toBeEmpty\b\|toBeInTheDOM" src/` → 0 (또는 대체 완료 후 0).
- `grep -n "\"@testing-library/jest-dom\"" package.json` → `^6.x.x` 매치.
- `npm list @testing-library/jest-dom` → `6.x.y` 해결.

## 4. 의존성

### 4.1 상류 의존
- `vitest@^4.1.4` — v6 jest-dom 의 `/vitest` 진입점 지원 확인 (공식 changelog).
- `jsdom@^29.0.2` — DOM matcher 의 기반 환경.

### 4.2 하류 영향
- `src/setupTests.js` — FR-02 대상 단일 파일. 타 설정 파일 영향 없음.
- 각 `*.test.jsx` — matcher 호출부는 v6 에서 유지 (제거 matcher 사용처만 대체).
- `react-version-spec.md` §3.1 "`jest-dom@5.17.0`" 문구 — REQ-025 머지 (commit `9a477cf`) 후 REQ-20260419-033 에서 `^6.9.1` 로 갱신 완료.

### 4.3 TypeScript 전환 연동
- `types/typescript-spec.md` (REQ-20260417 전환 후) 의 `tsconfig.json` `compilerOptions.types` 배열에 `@testing-library/jest-dom` 항목 필요 시 본 spec 에서 명시 (미결 §7).

## 5. 수용 기준 (Acceptance)

### 5.1 REQ-20260419-025 수용 기준 (`jest-dom` v5 → v6)
> 관련 요구사항: REQ-20260419-025 §10

- [ ] FR-01 `package.json` 의 `@testing-library/jest-dom` 버전이 `^6.x.x` 이상으로 설정
- [ ] FR-01 `package-lock.json` / `node_modules/@testing-library/jest-dom/package.json` 의 version 이 `6.x.y`
- [ ] FR-02 `src/setupTests.js` 가 v6 공식 import 방식으로 갱신 (§3.2 V1 우선, V2 fallback)
- [ ] FR-03 `grep -rn "toBeEmpty\b\|toBeInTheDOM" src/` → 0 (또는 v6 대체 완료)
- [ ] FR-04 `npm test` 전체 통과 (기준 35 파일 / ~292 PASS 또는 현 baseline 동등 이상)
- [ ] `npm run lint` 0 warn/error
- [ ] `npm run build` PASS
- [ ] `npm audit` 에서 jest-dom 관련 high+ 취약점 0 (NFR-03)
- [ ] RTL v13 상태의 peer 경고는 §3.4 에 예상 기록됨 — RTL v16 (REQ-040) 후 0 수렴 확인
- [x] 본 REQ 머지 후 inspector 가 `react-version-spec.md` §3.1 의 "`jest-dom@5.17.0`" 문구를 `^6.9.1` 로 갱신 — REQ-20260419-033 완료 (commit `9a477cf` 박제)

## 6. 알려진 제약 / 이슈

- `@testing-library/react` v13 + `jest-dom` v6 조합은 공식 peer 권고 범위(v14+) 밖일 수 있음 — 기능 동작은 v6 changelog 에서 독립성 유지 보장. peer 경고는 §3.4 허용.
- TypeScript 전환 전 단계에서는 jest-dom v6 의 type 확장이 `vi`/`expect` 에 반영되지 않아도 무해 (JS 파일은 type 미사용).
- v6 `/vitest` 진입점은 Vitest `globals: true` 가 아니어도 동작 — `expect` 전역 주입에 의존하지 않음. Vitest 4.x 공식 가이드 교차 확인 필수.
- `toBeInTheDOM` 은 v5 에서도 public API 아님 — 코드베이스 미사용 가정(FR-03 확인 후 fail-fast).

## 7. 미결 (Open Questions)

- Vitest 통합 방식 V1(`/vitest`) vs V2(범용) — REQ-025 태스크 분할 시 결정.
- `tsconfig.json` `types` 배열 반영 여부 — TypeScript 전환 REQ (`20260417-migrate-to-typescript`) 와 병행 또는 별 후보.
- jest-dom v6 + RTL v13 peer 경고 허용 기간 — RTL v16 bump (REQ-040) 후 해소 대기가 기본. 수용 기간 정책 별 후보.

## 8. 변경 이력
| 일자 | TSK | 요약 | 영향 |
|------|-----|------|------|
| 2026-04-19 | (pending, REQ-20260419-025) | 신규 spec 초안 — `@testing-library/jest-dom` v5.17.0 → v6.9.1 업그레이드, Vitest 통합 방식, 제거 matcher 매핑 (WIP) | 전체 |
| 2026-04-19 | REQ-20260419-033 | REQ-025 머지 (commit `9a477cf`) 후 `react-version-spec.md` §3.1 drift 해소 — §4.2 / §5.1 인계 체크박스 마감 | 4.2, 5.1, 8 |

## 9. 관련 문서
- 기원 요구사항: `specs/requirements/done/2026/04/19/20260419-testing-library-jest-dom-v5-to-v6-upgrade.md`
- 선행 분리 근거: `specs/requirements/done/2026/04/18/20260418-react-19-bump-execution-drift-resolve.md` §13 (`jest-dom@6` 별 후보 권장)
- 관련 spec: `specs/spec/green/build/react-version-spec.md` §3.1, §5 (jest-dom `^6.9.1` baseline — REQ-20260419-033 에서 drift 해소 완료)
- 관련 spec: `specs/spec/green/types/typescript-spec.md` (향후 `tsconfig.json` `types` 반영 검토)
- 외부: https://github.com/testing-library/jest-dom/releases (v6 changelog)
- 외부: https://vitest.dev/guide/ (Vitest + jest-dom 통합 가이드)
