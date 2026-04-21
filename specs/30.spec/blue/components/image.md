# Image 컴포넌트 (이미지 선택기 / 마크다운 삽입)

> **위치**: `src/Image/` (ImageSelector.jsx, ImageItem.jsx, api.js, api.mock.js, ImageSelector.module.css)
> **관련 요구사항**: — (as-is 서술 spec)
> **최종 업데이트**: 2026-04-20 (by operator, as-is snapshot)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
`Writer` (로그 작성기) 에 종속된 모달형 이미지 선택기. `show` prop 에 따라 등장/숨김 CSS 클래스를 스위치한다. 표시될 때 S3 이미지 목록을 페치하고, 커서 기반으로 `See More` 를 노출한다. 각 `ImageItem` 클릭 시 `![ALT_TEXT](<url> "OPTIONAL_TITLE")` 형식의 마크다운 문자열을 `navigator.clipboard` 에 복사하고 하단 Toaster 로 결과를 안내 (success / error).

## 공개 인터페이스
- `ImageSelector` (default export).
  - props: `{ show: boolean }`.
- `ImageItem` (default export).
  - props: `{ fileName, url, copyMarkdownString(e) }`.
- API 모듈 (`src/Image/api.js`): `getImages`, `getNextImages`.

## 동작
1. `props.show=true` 로 전이하면 `fetchFirst()` 를 호출해 `images` · `lastTimestamp` 세팅, 컨테이너 클래스가 `divImageSelector` (노출) 로 바뀐다.
2. `show=false` 이면 숨김 클래스 (`divImageSelectorhide`) 로 전환 (DOM 은 유지, 네트워크 호출 없음).
3. `isLoading` 상태에서 "Loading..." 플레이스홀더 렌더.
4. `isError` 상태에서 실패 메시지 + Retry. Retry 클릭 시 `isError=false` 로 내려 재시도 조건을 복원.
5. `See More` 클릭 → `getNextImages(lastTimestamp)` 로 이어붙임. 새 배열은 이전 `images` 와 `concat`.
6. 이미지 타일 클릭 → `copyToClipboard(markdown)` 결과에 따라 Toaster 가 success / error 로 표시 (`duration=2000`, `position=bottom`).
7. 키보드 접근: Retry span 은 `tabIndex=0`, `onKeyDown={activateOnKey(handleRetry)}` (a11y 패턴 B).

### 회귀 중점
- `show=true → false → true` 토글 시 `fetchFirst` 재호출 (캐시 없음 — 매 오픈마다 최신 목록 재요청).
- `navigator.clipboard` 미지원 환경에서 `copyToClipboard` 의 error 분기 → Toaster "Copy failed (permission denied or unavailable)".
- `lastTimestamp` null/undefined 시 `See More` 미노출.

## 의존성
- 외부: `react`, `prop-types`.
- 내부: `common/common` (`log`, `hasValue`, `copyToClipboard`), `common/a11y` (`activateOnKey`), `./api`, `./ImageItem`, `Toaster/Toaster`, `ImageSelector.module.css`.
- 역의존: `Log/Writer.jsx` 가 글 작성기 내부에서 `show` 상태로 제어.

## 테스트 현황
- [x] `src/Image/ImageSelector.test.jsx` — show 토글 클래스, 페치/에러/retry, See More, 클립보드 성공/실패 토스트.
- [x] `src/Image/ImageItem.test.jsx` — 단일 타일 click → `copyMarkdownString(e)` 호출.
- [x] `src/Image/__fixtures__/` 응답 박제.

## 수용 기준 (현재 상태)
- [x] (Must) `show=true` 진입 시 `getImages()` 1회 호출, `show=false` 이면 미호출.
- [x] (Must) 에러 상태에서 Retry 클릭 시 `isError` 리셋되어 재페치 가능 (현재 구현은 다음 `show` 전이에서 재페치).
- [x] (Must) 타일 클릭 시 클립보드에 `![ALT_TEXT](<url> "OPTIONAL_TITLE")` 포맷 문자열 복사.
- [x] (Must) 클립보드 실패 (권한 거부 · 미지원) 시 에러 Toaster, 성공 시 success Toaster.
- [x] (Should) `lastTimestamp` 값이 있을 때만 `See More` 버튼 노출.
- [x] (Should) Retry span 은 키보드(Enter/Space) 로 활성화 가능 (`activateOnKey`).
- [x] (NFR) 컨테이너 show/hide 는 unmount 대신 CSS 클래스 스왑 — 재오픈 시 리마운트 비용 회피.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
