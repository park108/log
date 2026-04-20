# Log 컴포넌트 (로그 목록 / 단건 / 작성기 서브 라우트)

> **위치**: `src/Log/` (Log.jsx, LogList.jsx, LogSingle.jsx, LogItem.jsx, LogItemInfo.jsx, Writer.jsx, api.js, api.mock.js, hooks/**, Log.css, Writer.css)
> **관련 요구사항**: — (as-is 서술 spec)
> **최종 업데이트**: 2026-04-20 (by operator, as-is snapshot)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
`/log/*` 하위 서브 라우트 셸. `isAdmin()` 분기로 글 작성 진입 (`+` 버튼 → `/log/write`) 을 노출하고, 목록(`LogList`) · 단건(`LogSingle`) · 검색 결과(`Search`) · 작성기(`Writer`) 를 lazy 로드한다. `LogList` 는 1차 페치 + `seeMoreButton` 으로 커서 기반 페이지네이션 (DynamoDB `LastEvaluatedKey.timestamp`) 을 수행하며, `sessionStorage` 를 캐시로 사용한다. `LogSingle` 은 단건 + `Comment` 스레드. `Writer` 는 새 글·편집·삭제·이미지 삽입을 담당한다. 데이터 훅은 TanStack Query v5 기반 (`useLogList`, `useLog`, `useCreateLog`, `useUpdateLog`, `useDeleteLog`).

## 공개 인터페이스
- 진입 컴포넌트: `Log` (default export).
  - props: `{ contentHeight?: object }` (상위 `App` 이 전달한 `<main>` 인라인 스타일).
- 하위 라우트 (`src/Log/Log.jsx:24-29, 38-42`):
  - `/log/` → `LogList`
  - `/log/search` → `Search`
  - `/log/:timestamp` → `LogSingle`
  - `/log/write` → `Writer` (admin 전용; non-admin 은 라우트 자체를 노출하지 않음).
- 하위 컴포넌트 기본 export: `LogList`, `LogItem`, `LogItemInfo`, `LogSingle`, `Writer`.
- API 모듈 (`src/Log/api.js`): `getLogs`, `getNextLogs`, `getLog`, `postLog`, `putLog`, `deleteLog` (fetch 기반, `api.mock.js` 는 테스트용 stub).
- 훅 모듈 (`src/Log/hooks/`): `useLogList`, `useLog`, `useCreateLog`, `useUpdateLog`, `useDeleteLog` (TanStack Query `useQuery` / `useMutation` 래퍼).

## 동작
1. `Log` 마운트 시 `isAdmin()` 판정으로 작성 진입 버튼 노출 여부 결정.
2. `LogList`
   - 마운트 직후 `sessionStorage.logList` 가 있으면 그대로 렌더 (네트워크 회피).
   - 없으면 `getLogs()` → 성공 시 `logs`, `lastTimestamp` 세팅, 실패 시 에러 섹션 + Retry 버튼.
   - `See more` 클릭 시 `getNextLogs(lastTimestamp)` 로 이어붙임.
   - 로딩 중 `Toaster` 에 "Loading logs..." 노출 (`isShowToasterCenter` 1→2 라이프사이클).
   - `isPostSuccess` prop 변경 시 목록 리페치 트리거.
   - `logs` / `lastTimestamp` 변화 시 각각 `sessionStorage` 에 박제.
3. `LogSingle`
   - `useParams().timestamp` 로 `getLog` 호출, 본문 렌더 후 `Comment` 섹션 마운트.
4. `Writer`
   - admin 전용. 새 글 작성 · 기존 글 편집 · 삭제 · 이미지 삽입 (`ImageSelector`) 을 포함.

### 회귀 중점
- `App.test.jsx:329` 근처 online/offline 토글 동안 `Log` 가 마운트·언마운트되며 TanStack Query 캐시가 일관되게 정리되는지.
- `Log.test.jsx` production 모드 (isAdmin=false) 스위트: `+` 버튼 미노출, `/log/write` 라우트 미노출.
- `LogList` 의 sessionStorage 캐시 회피 경로: 캐시 존재 시 `getLogs` 미호출.

## 의존성
- 외부: `react`, `react-router-dom`, `prop-types`, `@tanstack/react-query`.
- 내부: `common/common` (`log`, `getFormattedDate`, `hasValue`, `setHtmlTitle`, `isAdmin`), `Toaster/Toaster`, `Comment/Comment` (via `LogSingle`), `Image/ImageSelector` (via `Writer`), `Search/Search` (lazy).
- 역의존: `App.jsx` 가 `/log/*` 라우트로 렌더.

## 테스트 현황
- [x] `src/Log/Log.test.jsx`, `LogList` / `LogSingle` / `LogItem` / `LogItemInfo` / `Writer` 각 `.test.jsx`.
- [x] 훅 테스트: `hooks/useLog.test.js`, `useLogList.test.js`, `useCreateLog.test.js`, `useUpdateLog.test.js`, `useDeleteLog.test.js`.
- [x] `__fixtures__/` 에 API 응답 샘플 박제.

## 수용 기준 (현재 상태)
- [x] (Must) `/log/` 접근 시 `LogList` 렌더. 세션 캐시가 있으면 네트워크 호출 0.
- [x] (Must) 에러 분기에서 Retry 버튼 클릭 시 `sessionStorage.logList` · `logListLastTimestamp` 삭제 후 리페치.
- [x] (Must) `lastTimestamp` 존재 시 `See more` 버튼 노출. 비어 있으면 null.
- [x] (Must) `isAdmin()=true` 에서만 `+` 버튼과 `/log/write` 라우트 노출.
- [x] (Must) `/log/:timestamp` 진입 시 `LogSingle` + `Comment` 렌더.
- [x] (Should) 로딩 중 중앙 `Toaster` 메시지 "Loading logs..." 노출.
- [x] (Should) `props.isPostSuccess` true 변화 시 `LogList` 재페치 트리거.
- [x] (NFR) 모든 하위 라우트는 `React.lazy` + `Suspense(fallback=<div/>)` 로 코드 스플릿.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
