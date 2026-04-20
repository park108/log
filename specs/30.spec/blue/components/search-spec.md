# Search 컴포넌트 (검색 입력 · 결과)

> **위치**: `src/Search/` (Search.jsx, SearchInput.jsx, hooks/useSearchList.js, api.js, api.mock.js, Search.module.css)
> **관련 요구사항**: — (as-is 서술 spec)
> **최종 업데이트**: 2026-04-20 (by operator, as-is snapshot)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
전체 검색 UI 의 두 축:
- `SearchInput` — 상단 내비게이션에 상주. admin 은 데스크탑/모바일 듀얼 인풋 + `search` 토글 + `go` 버튼, non-admin 은 단일 인풋. Enter 또는 `go` 클릭으로 `/log/search` 로 `navigate(queryString)`. 빈 입력일 땐 하단 warning Toaster 로 안내.
- `Search` — `/log/search` 라우트. `useSearchList(queryString)` (TanStack Query v5) 훅으로 서버 검색 결과를 조회하고, 로딩 중 "Searching ..." + 도트 애니메이션, 0건 → "No search results." + To list, N건 → 키워드 하이라이트된 리스트 렌더. NFR-05 로그 계약(성공/실패) 을 `useEffect(..., [data])` 및 `[isError, error]` 로 재현한다 (v5 에서 제거된 `onSuccess/onError` 대체).

## 공개 인터페이스
- `SearchInput` (default export, props 없음). 내부에서 `isAdmin()` 분기, `useNavigate` 사용.
- `Search` (default export, props 없음). `useLocation().state.queryString` 을 초기 쿼리로 사용.
- 훅: `useSearchList(queryString, { enabled })` — TanStack `useQuery` 래퍼. `data`, `isLoading`, `isError`, `error` 반환. query key 는 `[ 'search', queryString ]` 등 구현 기준.
- API (`src/Search/api.js`): `searchLogs(queryString)` 또는 동등 (구현 파일 기준).

## 동작 — SearchInput
1. 마운트 시 props 없음. `isAdmin()` 으로 듀얼/단일 렌더 선택.
2. 인풋 `onKeyUp` 에서 keyCode 13(Enter) → `setIsGetData(true)` → effect 에서 `queryString.length === 0` 이면 warning Toaster, 아니면 `navigate('/log/search', { state: { queryString } })` 실행 후 모바일 검색창 닫힘.
3. 모바일 검색 토글: `search` 버튼 클릭 시 `isMobileSearchOpen` 토글. `go` 버튼은 `setIsGetData(true)`.
4. Toaster 는 Suspense lazy 로드.

## 동작 — Search
1. 마운트 시 `location.state.queryString` 이 있으면 초기 쿼리로 세팅. `setHtmlTitle("search results for " + queryString)` 를 쿼리 변동마다 적용.
2. `useSearchList` 로 서버 조회 (`enabled: queryString.length > 0`).
3. `data` 변화: `errorType` 이 있으면 ERROR 로그 + `console.error(data)`, 아니면 SUCCESS 로그. `isError` 변화 시 ERROR 로그 + `console.error(error)`.
4. 로딩 상태: `setInterval(..., 300ms)` 로 점 1개씩 추가 (최대 3개). 로딩 종료 시 interval 정리.
5. 결과 분기:
   - `isLoading` → `<h1>Searching "q"<span>...</span></h1>`.
   - `totalCount === 0` → "0 result for q - N milliseconds" + "No search results." + `To list` 버튼.
   - N건 → 헤더(건수 + 처리 시간) + 리스트. 각 아이템은 `<Link to={{ pathname: '/log/'+timestamp, search: 'search=true' }}>` + 본문 내 키워드 하이라이트 span.
6. `To list` 버튼은 `#query-string-by-enter` · `#query-string-by-button` 인풋 값을 비우고 `/log` 로 이동.

### 회귀 중점
- v5 `onSuccess/onError` 제거 대응: 로그 계약은 `useEffect([data])` + `useEffect([isError, error])` 로만 발화.
- 로딩 도트 `setInterval` 의 cleanup (`clearInterval`) — React 19 StrictMode 이중 마운트 하에서 누수 금지.
- 모바일 검색 토글이 route navigation 후 닫히는지.

## 의존성
- 외부: `react`, `react-router-dom`, `@tanstack/react-query`.
- 내부: `common/common` (`log`, `getFormattedDate`, `hasValue`, `setHtmlTitle`, `isAdmin`), `./hooks/useSearchList`, `./api`, `Toaster/Toaster` (lazy), `Search.module.css`.
- 역의존: `App.jsx` / `Log.jsx` 에서 `SearchInput` · `Search` 라우트로 사용.

## 테스트 현황
- [x] `src/Search/Search.test.jsx` — 로딩 · 0건 · N건 분기, 키워드 하이라이트, To list 동작, NFR-05 로그 계약.
- [x] `src/Search/SearchInput.test.jsx` — Enter/go/빈 쿼리/모바일 토글, admin/non-admin 분기.
- [x] `src/Search/hooks/useSearchList.test.js` — query key, enabled gating, 응답 파싱.
- [x] `__fixtures__/` 샘플 박제.

## 수용 기준 (현재 상태)
- [x] (Must) 빈 쿼리 상태에서 Enter/go 시 warning Toaster + navigate 미발생.
- [x] (Must) 유효 쿼리 Enter/go 시 `/log/search` 로 `state.queryString` 전달하며 이동.
- [x] (Must) `Search` 페이지는 로딩/0건/N건 3분기를 정확히 그린다.
- [x] (Must) NFR-05 로그 계약 (성공/실패 로그) 은 `data` / `isError` 변화에 의해 정확히 1회씩 발화.
- [x] (Should) N건 결과의 본문 내 키워드는 `spanSearchKeyword` 로 하이라이트.
- [x] (Should) To list 버튼은 두 개의 인풋 DOM 값을 비운 뒤 `/log` 로 이동.
- [x] (NFR) `useSearchList` 는 TanStack v5 스타일 (`onSuccess/onError` 미사용). deprecated API 경고 0.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
