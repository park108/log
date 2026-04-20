# File 컴포넌트 (관리자 파일 업로드 · 목록)

> **위치**: `src/File/` (File.jsx, FileItem.jsx, FileDrop.jsx, FileUpload.jsx, api.js, api.mock.js, File.css)
> **관련 요구사항**: — (as-is 서술 spec)
> **최종 업데이트**: 2026-04-20 (by operator, as-is snapshot)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
`/file` 페이지의 루트 셸. 관리자 전용 (`isAdmin()` 가 false 면 `/log` 로 `navigate`). 데스크탑에서는 `FileDrop` (드래그&드롭), 모바일(`isMobile()` true, 터치 환경) 에서는 `FileUpload` (파일 선택 input) 를 노출한다. S3 메타데이터(`api.getFiles` · `getNextFiles`) 를 커서 기반으로 페이지네이션하여 `FileItem` 목록으로 렌더하고, 업로드/삭제 성공 시 1차 목록을 다시 페치한다. 중앙 Toaster 로 로딩, 하단 Toaster 로 에러를 표시.

## 공개 인터페이스
- `File` (default export).
  - props: `{ contentHeight?: object }`.
- 하위 컴포넌트 기본 export: `FileItem`, `FileDrop`, `FileUpload`.
  - `FileItem` props: `{ fileName, lastModified, size, url, deleted(fn) }`.
  - `FileDrop` / `FileUpload` props: `{ callbackAfterUpload(fn) }`.
- API 모듈 (`src/File/api.js`): `getFiles`, `getNextFiles`, (업로드/삭제 엔드포인트는 구현 파일 기준).

## 동작
1. 마운트 시 `isAdmin()=false` 이면 즉시 `/log` 로 `useNavigate()` 리다이렉트 + `setHtmlTitle("file")` 스킵.
2. admin 인 경우 `setHtmlTitle("file")` 후 `isGetData=true` 로 1차 `getFiles()` 호출. 성공 시 `files` · `lastTimestamp` 세팅, 실패 시 하단 에러 토스트.
3. `See more` 클릭 → `getNextFiles(lastTimestamp)` 로 이어붙임. 동일 에러 토스트 규약.
4. `isLoading` 상태에 따라 중앙 Toaster 표시 1/2 전이 (`isShowToaster`).
5. 환경 분기 UI 선택은 `useMemo(() => isMobile(), [])` 로 마운트 시 1회 결정.
   - 모바일 → `<FileUpload callbackAfterUpload={...}/>`.
   - 데스크탑 → `<FileDrop callbackAfterUpload={...}/>`.
6. 업로드 콜백 / `FileItem.deleted()` 는 공히 `setIsGetData(true)` 로 1차 재페치.

### 회귀 중점
- 관리자 판정 실패 경로의 `navigate("/log")` + `setHtmlTitle` 스킵 순서 (side-effect 누수 방지).
- `useMemo` 환경 결정이 리렌더마다 재평가되지 않아야 함 (React 19 deps 경고 포함).
- `FileDrop` 의 drop 이벤트 · `FileUpload` 의 input change → 성공 시 `callbackAfterUpload` 호출 경로.

## 의존성
- 외부: `react`, `react-router-dom`, `prop-types`.
- 내부: `common/common` (`log`, `hasValue`, `isAdmin`, `isMobile`, `setHtmlTitle`), `Toaster/Toaster`, `./api`, `./FileItem`, `./FileDrop`, `./FileUpload`, `File.css`.
- 역의존: `App.jsx` 의 `/file` 라우트.

## 테스트 현황
- [x] `src/File/File.test.jsx` — admin/non-admin 분기, 1차/추가 페치, 에러 토스트, 모바일/데스크탑 업로드 UI 스위치.
- [x] `FileItem.test.jsx`, `FileDrop.test.jsx`, `FileUpload.test.jsx` — 단위 테스트.
- [x] `src/File/__fixtures__/` 샘플 응답 박제.

## 수용 기준 (현재 상태)
- [x] (Must) non-admin 진입 시 `/log` 로 리다이렉트하고 네트워크 호출·`setHtmlTitle` 미발생.
- [x] (Must) 1차 페치 성공 경로에서 `files` · `lastTimestamp` 모두 반영.
- [x] (Must) `lastTimestamp` 존재 시만 `See more` 버튼 렌더.
- [x] (Must) 모바일(`isMobile()=true`) 에서 `FileUpload`, 그 외 `FileDrop` 렌더.
- [x] (Should) `getFiles` / `getNextFiles` 에러 시 하단 Toaster (position=bottom, type=error, duration=2000) 표시.
- [x] (Should) `FileItem.deleted()` · 업로드 성공 콜백은 1차 목록 리페치를 일으킨다.
- [x] (NFR) `isMobile()` 판정은 마운트 1회에 박제 (`useMemo(..., [])`).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
