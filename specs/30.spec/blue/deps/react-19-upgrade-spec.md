# React 19 업그레이드 (package.json bump 및 testing-library 동반)

> **위치**: `package.json:11-12, 45, 47-48` / 엔트리 `src/index.jsx:8-13`, `src/App.jsx:1-135`
> **관련 요구사항**: REQ-20260420-001
> **최종 업데이트**: 2026-04-20 (by inspector, pre-TSK)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
런타임 `react` / `react-dom` 을 `^18.2.0` → `^19.2.x` 로, 동반 devDep `@testing-library/react` 를 v13 → v16 으로, 타입 정의 `@types/react` / `@types/react-dom` 을 v19 라인으로 정렬한다. 앱 동작 회귀 0, 신규 API (`use`, actions, `<form action>`) 및 React Compiler 도입은 하지 않는다.

## 공개 인터페이스
- `package.json` 변경 필드:
  - `dependencies.react`: `^18.2.0` → `^19.2.x`
  - `dependencies.react-dom`: `^18.2.0` → `^19.2.x`
  - `devDependencies.@testing-library/react`: `^13.4.0` → `^16.x`
  - `devDependencies.@types/react`: `^18.3.28` → `^19.x`
  - `devDependencies.@types/react-dom`: `^18.3.7` → `^19.x`
- 코드 측 인터페이스: 변경 없음. `ReactDOM.createRoot` (`src/index.jsx:8`) / `React.StrictMode` (`src/index.jsx:10`) 형태 유지.

## 동작
1. `package.json` 필드 업데이트 후 `npm install` → `package-lock.json` 의 `react` 해소 버전이 `19.x` 로 갱신.
2. `npm run test` (vitest run --coverage) — 전 스위트 green, 신규 실패 0.
3. `npm run build` (vite build) — exit 0, `build/` 산출물 생성.
4. `npm run lint` — 경고·오류 증감 0 (base vs post-bump).
5. 콘솔 경고 캡처 어서트로 React 19 deprecated API 경고 0 확인.

### 회귀 중점
- `src/App.jsx:39-44, 50-64` — `useEffect` online/offline 토글 & production-only sendAppError side-effect.
- `src/index.jsx:15-40` — `reportWebVitals` → `navigator.sendBeacon` 경로, `sendCounter` 호출.
- `React.StrictMode` 하 effect double-invoke 행동 변화 — `App.test.jsx:329` 근처 online/offline 스위트 및 `Log.test.jsx` production 모드 스위트 기준으로 확인.

## 의존성
- 내부: `src/App.jsx`, `src/index.jsx`, `src/common/ErrorBoundary.jsx`, `src/Log/**/*.jsx`.
- 외부: `react`, `react-dom`, `@testing-library/react`, `@types/react`, `@types/react-dom`, `react-router-dom ^7.14.1` (호환 확인됨), `web-vitals ^5.2.0`.
- 역의존: 앱 전 컴포넌트 트리.

## 테스트 현황
- [x] 기존 스위트 (`npm run test`) — bump 전 green baseline.
- [x] `docs/react-19-audit.md:13-23, 30-57` — `forwardRef` / `ReactDOM.render` / `findDOMNode` / `defaultProps` 사용처 0건 (감사 완료).
- [ ] bump 후 전 스위트 재실행 green.
- [ ] 콘솔 경고 캡처 어서트 (deprecated API 경고 0).

## 수용 기준
- [ ] (Must) `npm install` exit 0 + `package-lock.json` 내 `react` 해소 버전 `19.x`.
- [ ] (Must) `npm run test` 전 스위트 green + coverage 보고서 생성.
- [ ] (Must) `npm run build` exit 0 + `build/` 산출물 생성.
- [ ] (Must) `grep -rn "forwardRef\|ReactDOM\.render\|findDOMNode\|defaultProps" src/` → 0 매칭 유지.
- [ ] (Should) `npm run lint` 경고·오류 건수 bump 전과 동일.
- [ ] (Should) 콘솔 경고 캡처 어서트 — React 19 deprecated API 경고 0.
- [ ] (Should) `App.test.jsx` online/offline 토글 및 `Log.test.jsx` production 모드 스위트 재실행 회귀 0.
- [ ] (NFR) `npm audit` 고·치명 취약점 0건 유지.
- [ ] (NFR) Vite 빌드 시간 ±10% 내, 메인 번들 크기 ±5% 내.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | inspector / — | 최초 등록 (REQ-20260420-001 반영) | all |
