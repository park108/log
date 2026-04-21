# Comment 컴포넌트 (로그 단건 코멘트 스레드 / 폼)

> **위치**: `src/Comment/` (Comment.jsx, CommentItem.jsx, CommentForm.jsx, api.js, api.mock.js, Comment.module.css)
> **관련 요구사항**: REQ-20260422-045
> **최종 업데이트**: 2026-04-21 (by inspector, REQ-20260422-045 흡수 — §접근성 a11y 패턴 B 상호참조 신설)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
특정 로그(`logTimestamp`) 에 달린 코멘트 스레드를 접힘/펼침 UI 로 노출하고, 신규 작성 · 답글을 서버에 POST 한다. 토글 버튼 텍스트는 로딩 상태 · 개수에 따라 "... comments" / "Add a comment" / "1 comment" / "N comments" 로 바뀐다. 성공/실패 토스트 (`Toaster position="bottom"`) 로 사용자에 피드백을 준다. `React.memo` 로 export.

## 공개 인터페이스
- `Comment` (default export, `React.memo` 래핑).
  - props: `{ logTimestamp: number }` (필수).
- 하위 컴포넌트:
  - `CommentItem` — 단일 코멘트 + 답글 폼 토글.
    - props: `{ isAdminComment, message, name, logTimestamp, commentTimestamp, timestamp, isHidden, openReplyForm(fn), reply(postFn) }`.
  - `CommentForm` — 신규 코멘트 입력.
    - props: `{ logTimestamp, post(fn), isPosting: bool }`.
- API (`src/Comment/api.js`): `getComments(logTimestamp, isAdmin)`, `postComment(comment)`, (숨김 처리 / 삭제 API 가 `api.js` 에 존재할 수 있음 — 구현이 진실).

## 동작
1. 마운트 시 토글은 접힘 (`isShow=false`), 버튼 텍스트 "... comments". 최초 `reload=true` 로 `getComments(logTimestamp, isAdmin())` 호출.
2. 응답 `body.Items` 를 `sortKey` 오름차순 정렬 후 `comments` 상태에 저장.
3. 로딩·개수 변화 시 버튼 텍스트 업데이트 (0 → "Add a comment", 1 → "1 comment", N → "N comments").
4. 사용자가 토글 버튼 클릭 → `isShow=true` 시 `commentThread` 컴포넌트 트리 lazy 렌더. 다시 클릭하면 언마운트.
5. `isShow=true && !isOpenReplyForm` 인 동안 `CommentForm` 이 표시된다. 하위 `CommentItem` 이 `openReplyForm(true)` 로 올리면 폼을 숨긴다 (한 번에 하나의 입력창 규약).
6. `postNewComment(comment)` 실행 시 POST → 성공이면 `reload=true` 로 리페치 + 성공 토스트, 실패/네트워크 오류는 에러 토스트.

### 회귀 중점
- StrictMode 하 mount 시 cleanup `setIsLoading(false)` (`Comment.jsx:67-69`) 가 React 19 에서 예상대로 트리거되는지.
- `Suspense` 내 `CommentItem` lazy 로드 지연 동안 polling 중복 호출 방지.
- `Toaster` 의 `show` 1↔2 라이프사이클 재진입 (연속 post 시 토스트 재노출).

### 접근성 (REQ-20260422-045 FR-01)
- 토글·답글·폼 제출 등 `div`/`span` 기반 클릭 핸들러는 키보드 활성화 경로로 공통 헬퍼 `activateOnKey` (패턴 B) 를 경유한다. 헬퍼 본체 및 Enter/Space 키 계약 박제 위치: `components/common.md` §a11y (`a11y.js`) (선행 done: REQ-20260421-033).
- 토스트 경유 상태 변화는 접근성 경로와 독립이며, `activateOnKey` 는 `<input>`/`<textarea>` 에는 사용하지 않는다 (호출부 책임; `components/common.md` §수용 기준 Should).

## 의존성
- 외부: `react`, `prop-types`.
- 내부: `common/common` (`log`, `hasValue`, `isAdmin`), `Toaster/Toaster` (lazy), `./api` (`getComments`, `postComment`), `Comment.module.css`.
- 역의존: `Log/LogSingle.jsx` 가 로그 단건 하단에 마운트.

## 테스트 현황
- [x] `src/Comment/Comment.test.jsx` — 토글, 개수 라벨, 에러 흡수, Toaster 전이.
- [x] `src/Comment/CommentItem.test.jsx` — 답글 폼 노출·닫힘, isAdminComment 분기.
- [x] `src/Comment/__fixtures__/` 에 API 응답 박제.

## 수용 기준 (현재 상태)
- [x] (Must) `logTimestamp` prop 이 없으면 PropTypes 경고 (필수 선언은 아님, `PropTypes.number`).
- [x] (Must) 마운트 직후 한 번 `getComments` 호출. `reload` flip 시에만 재호출.
- [x] (Must) 정렬은 `sortKey` 오름차순.
- [x] (Must) 토글 버튼 텍스트는 {로딩, 0, 1, N} 4가지 분기.
- [x] (Must) POST 성공 시 성공 토스트 + 목록 리페치, 실패 시 에러 토스트.
- [x] (Should) 답글 폼 활성화 중에는 상단 `CommentForm` 을 숨긴다.
- [x] (Should) `Toaster position="bottom"` · `duration=2000` · `completed` 콜백으로 `show=2` 진입.
- [x] (NFR) `Comment` 는 `React.memo` 로 export — 부모 리렌더 시 props 변화 없으면 재렌더 회피.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
| 2026-04-21 | inspector / REQ-20260422-045 | **REQ-045 FR-01 흡수** — blue `components/comment.md` → green carry-over 후 §동작 하위 §접근성 소절 신설 (2줄). `activateOnKey` / 패턴 B 식별자 + `components/common.md` §a11y 상호참조 박제. 기존 §공개 인터페이스·§동작·§회귀 중점·§의존성·§수용 기준 서술 수정 0 (NFR-02 준수). 선행 done: REQ-20260421-033 FR-07 "blue 승격 시 comment/log/common/image.md §접근성 상호참조" Should 항 — writer 매트릭스상 blue 직접 편집 불가로 영구 미충족 상태였던 것을 본 green 경유 경로로 해소. RULE-07 자기검증: 상호참조 문장 존재는 `grep -c` 로 반복 검증 가능한 시스템 관찰 불변식, 1회성 incident patch 아님. | §최종 업데이트, §관련 요구사항, §동작 (§접근성 신설), 본 이력 |
