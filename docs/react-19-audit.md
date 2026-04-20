# React 19 Upgrade — Pre-Flight Audit

> **Task**: TSK-20260418-08 — React 19 업그레이드 사전 감사
> **Spec**: `specs/30.spec/green/build/react-version-spec.md` §2, §4
> **Requirement**: `specs/requirements/done/2026/04/18/20260417-upgrade-react-19.md`
> **Audited**: 2026-04-18
> **Scope**: 코드 변경 없음. 본 문서는 React 19 bump 전 영향 범위 파악용 스냅샷.

---

## 1. 요약

| 영역 | 결과 | 후속 필요 |
|------|------|-----------|
| `forwardRef` import/사용 | **0건** | 없음 (spec §4 수용 기준 충족) |
| Legacy ReactDOM API (`render`, `hydrate`, `unmountComponentAtNode`, `findDOMNode`) | **0건** | 없음 |
| `defaultProps` | **0건** | 없음 |
| `prop-types` / `propTypes` | **21 파일, 42 매칭** | React 19 에서 경고 가능 — TypeScript spec 과 교차 (§2.4 미채택) |
| React / React DOM | `^18.2.0` | bump 필요 |
| `@testing-library/react` | `^13.4.0` | 16+ 로 bump 필요 |
| 서드파티 (`react-router-dom`) | `^7.14.1` (React 19 호환) | 없음 |

**결론**: `forwardRef` 제거 등 코드 수정은 선행 불필요. React 19 bump 는 의존성 교체 + 테스트 리바인딩 + strict mode 회귀 검증이 주 작업. `prop-types` 는 TypeScript 전환 spec 의존이므로 본 계열에서는 out-of-scope.

---

## 2. Grep 스냅샷

### 2.1 `forwardRef` 사용처

```bash
$ grep -rn "forwardRef" src/
# (no output — 0 matches)
$ grep -rn "React.forwardRef\|React\.forwardRef" src/
# (no output — 0 matches)
```

- spec §4 수용 기준(`forwardRef` import 0 건) **충족**.
- 추가 관찰: `useRef` 는 3건 존재(`src/` 내), 이는 ref 를 내부에서만 사용하는 케이스로 forwardRef 와 무관.

### 2.2 Legacy ReactDOM API

```bash
$ grep -rn "ReactDOM.render\|ReactDOM.unmountComponentAtNode\|ReactDOM.hydrate\|findDOMNode" src/
# (no output — 0 matches)
```

- 엔트리는 이미 `ReactDOM.createRoot` 사용 (`src/index.jsx:8`).
- `React.StrictMode` 로 감싸짐 (`src/index.jsx:10-12`) — React 19 strict mode 의 effect double-invocation 변화 영향 검증 대상.

### 2.3 `defaultProps` (함수형 컴포넌트)

```bash
$ grep -rn "defaultProps" src/
# (no output — 0 matches)
```

- React 19 의 함수형 컴포넌트 `defaultProps` deprecation 경고 대상 **없음**.

### 2.4 `prop-types` 잔재

```bash
$ grep -rn "propTypes\|prop-types" src/
# 42 matches across 21 files
```

파일 목록(21개):

| 카테고리 | 파일 | 매칭 |
|---------|------|------|
| Comment | `src/Comment/Comment.jsx`, `CommentForm.jsx`, `CommentItem.jsx` | 6 |
| File | `src/File/File.jsx`, `FileDrop.jsx`, `FileItem.jsx`, `FileUpload.jsx` | 8 |
| Image | `src/Image/ImageItem.jsx`, `ImageSelector.jsx` | 4 |
| Log | `src/Log/Log.jsx`, `LogItem.jsx`, `LogItemInfo.jsx`, `LogList.jsx`, `LogSingle.jsx` | 10 |
| Monitor | `src/Monitor/ApiCallItem.jsx`, `ApiCallMon.jsx`, `ContentItem.jsx`, `ContentMon.jsx`, `Monitor.jsx`, `VisitorMon.jsx`, `WebVitalsItem.jsx` | 14 |
| Toaster | `src/Toaster/Toaster.jsx` | 2 |
| common | `src/common/ErrorBoundary.jsx` | 2 |

- `package.json` 에 `prop-types@^15.8.1` 여전히 선언됨 (runtime dep).
- React 19 자체는 `prop-types` 를 **제거하지 않음** (외부 패키지로 유지). 경고/크래시는 없음.
- 다만 spec §2.4 "미채택" 에 따라 본 감사 범위에서 제거는 out-of-scope. TypeScript spec 완료 후 전용 태스크로 분할.

---

## 3. 런타임 / 툴체인 버전

### 3.1 현재 snapshot (`npm ls react react-dom @testing-library/react`)

```
log@0.1.0
├─┬ @testing-library/react@13.4.0
│ ├── react-dom@18.2.0 deduped
│ └── react@18.2.0 deduped
├─┬ react-dom@18.2.0
│ └── react@18.2.0 deduped
├─┬ react-router-dom@7.14.1
│ ├── react-dom@18.2.0 deduped
│ ├─┬ react-router@7.14.1
│ │ ├── react-dom@18.2.0 deduped
│ │ └── react@18.2.0 deduped
│ └── react@18.2.0 deduped
└── react@18.2.0
```

| 패키지 | 현재 | 목표 (spec §2.2) | 차이 |
|--------|------|-----------------|------|
| `react` | `^18.2.0` | `^19.x` | major bump |
| `react-dom` | `^18.2.0` | `^19.x` | major bump |
| `@testing-library/react` | `^13.4.0` | `^16.x` | **major bump 2단계** (13 → 14/15 건너뛰고 16) |
| `react-router-dom` | `^7.14.1` | (유지) | React 19 호환 (v7 공식) |

### 3.2 간접 React 의존 서드파티 (package.json 기반)

| 패키지 | React peer | React 19 호환성 메모 |
|--------|-----------|---------------------|
| `@testing-library/react@13.4.0` | React 18 | **bump 필수** → `^16.x` |
| `@testing-library/jest-dom@5.17.0` | (프레임워크 독립) | 영향 없음 |
| `react-router-dom@7.14.1` | React 18/19 | 호환 (v7 공식) |
| `@vitejs/plugin-react@6.0.1` | — | React 19 지원 |
| `msw@2.13.4` | — | 영향 없음 |
| `vitest@4.1.4` + `@vitest/coverage-v8@4.1.4` | — | 영향 없음 |
| `prop-types@15.8.1` | (external) | 경고 없이 동작, 장기 제거는 TS spec 의존 |
| `web-vitals@3.0.4` | — | 영향 없음 |

---

## 4. 엔트리 포인트 & StrictMode

- `src/index.jsx`:
  - L1: `import React from 'react';`
  - L2: `import ReactDOM from 'react-dom/client';`
  - L8: `const root = ReactDOM.createRoot(document.getElementById("root"));`
  - L10-12: `<React.StrictMode>` 래핑
- React 19 업그레이드 시 **엔트리 코드 변경 없이 그대로 동작** 예상.
- React 19 의 Strict Mode 는 effect double-invocation 동작이 동일하나 일부 내부 로깅 변경이 있어, 개발 콘솔 관찰 필요.

---

## 5. 제안 후속 태스크 (최소 3건)

spec §2.2 목표 baseline 달성을 위해 다음 단위로 분할 권장:

1. **TSK: `react` / `react-dom` 의존성 bump (^18 → ^19)**
   - 범위: `package.json` 업데이트, `npm install`, `npm test`/`npm run build` 회귀.
   - 롤백: 단일 커밋 revert.
   - 위험: strict mode effect 재실행으로 인한 테스트/런타임 regresssion.

2. **TSK: `@testing-library/react` 13 → 16 bump + 테스트 회귀**
   - 범위: devDep 교체, 브레이킹(구버전 `render` 반환 API 변화) 대응 수정.
   - 선행: (1) 과 같은 커밋에 번들해도 무방. 단 규모가 크면 분리.

3. **TSK: React 19 deprecation 콘솔 경고 제로화**
   - 범위: 업그레이드 후 `npm run build` + 개발 서버/테스트 콘솔 관찰, 경고 발생 지점 수정.
   - spec §4 "콘솔에 deprecation warning 없음" 수용 기준 충족용.

추가 후보 (필요 시):

4. **TSK: StrictMode effect double-invocation 회귀 검증 (React 19)**
   - 범위: `__fixtures__` 기반 통합 테스트 또는 수동 확인 체크리스트.

5. **TSK: `prop-types` 제거 (TypeScript spec 의존)**
   - 본 계열이 아닌 `typescript-spec` 계열에 속함. 감사 시점에는 별도 계열로 링크만.

---

## 6. Spec §4 수용 기준 현황

- [x] `forwardRef` import 0 건 (`grep -rn "forwardRef" src/` → 0 matches)
- [ ] 기존 기능 모두 정상 동작 — **업그레이드 본 작업 후 검증 필요**
- [ ] 테스트 전부 통과 — **업그레이드 본 작업 후 검증 필요**
- [ ] 콘솔 deprecation warning 없음 — **업그레이드 본 작업 후 검증 필요**

본 감사 태스크는 코드 변경 없이 위 4개 중 1번 기준을 **선행 확인**.

---

## 7. 참고

- 감사 일시: 2026-04-18
- 감사자: developer agent (TSK-20260418-08)
- 원본 작업지시서: `specs/task/done/2026/04/18/20260418-react-19-audit-forwardref/20260418-react-19-audit-forwardref.md` (완료 후 이동)
