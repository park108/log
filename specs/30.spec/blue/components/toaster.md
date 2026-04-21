# Toaster 컴포넌트 (공통 알림 토스트)

> **위치**: `src/Toaster/` (Toaster.jsx, Toaster.module.css, Toaster.test.jsx)
> **관련 요구사항**: — (as-is 서술 spec)
> **최종 업데이트**: 2026-04-20 (by operator, as-is snapshot)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
전역 공용 토스트. `show` prop 이 제어하는 3-state 머신(0 hide / 1 show / 2 fadeout) 으로 노출·페이드아웃·숨김을 구현한다. `position` (center/bottom), `type` (information/success/warning/error) 에 따라 CSS class 조합을 결정. `duration` 만료 시 `completed` 콜백을 상위로 올려 `show=2` 전이를 호출자 쪽에서 수행하도록 한다 (타이머 소유자는 Toaster). 사용처는 `Log`, `File`, `Comment`, `Image`, `Search` 등 거의 모든 페이지.

## 공개 인터페이스
- `Toaster` (default export).
  - props:
    - `show: number` — 0 숨김, 1 표시+타이머 시작, 2 페이드아웃.
    - `duration: number` — ms. `show=1` 일 때 `setTimeout(completed, duration)`.
    - `position: 'center' | 'bottom'` (default `center`).
    - `type: 'information' | 'success' | 'warning' | 'error'` (default `information`).
    - `message: string` — 본문.
    - `completed: () => void` — duration 만료 시 호출 (상위에서 보통 `setShow(2)`).
  - DOM: `role="alert"` + data attributes (`data-position`, `data-type`, `data-show`).

## 동작
1. `show` 가 변할 때마다 이전 타이머 (`timerRef.current`) 를 `clearTimeout` 으로 소거.
2. `show === 1` 이고 `duration > 0` 이면 `setTimeout(completed, duration)` 를 새 타이머로 등록.
3. `show === 2` 이면 1초(`setTimeout(..., 1000)`) 후 DOM 에 직접 `divToasterHide` 클래스를 추가 (페이드아웃 종료).
4. 언마운트/재렌더 cleanup 에서 활성 타이머 정리 (누수 방지).
5. CSS 클래스 조합: `[POSITION_STYLE[position], TYPE_STYLE[type], SHOW_STYLE[show]].filter(Boolean).join(' ')`.

### 회귀 중점
- 연속 `1 → 2 → 1` 전이 시 타이머 경합 없음 (매 전이에서 clearTimeout 후 재등록).
- React 19 StrictMode 이중 마운트에서 타이머 쌍이 정확히 취소됨.
- `completed` 콜백이 undefined 인 사용처 (예: 일부 "Loading..." 중앙 토스트) 에서는 `duration` 0 운영 규약으로 `setTimeout` 등록 자체가 생략됨.

## 의존성
- 외부: `react`, `prop-types`.
- 내부: `Toaster.module.css` (divToasterCenter, divToasterBottom, divToasterInformation/Success/Warning/Error, divToasterHide, divToasterFadeout).
- 역의존: `Log/LogList`, `File/File`, `Comment/Comment`, `Image/ImageSelector`, `Search/SearchInput` 등 다수.

## 테스트 현황
- [x] `src/Toaster/Toaster.test.jsx` — show 0/1/2 전이, duration 만료 시 completed 호출, fadeout 클래스 부착, position/type 분기, `role=alert` 존재.

## 수용 기준 (현재 상태)
- [x] (Must) `show=1` + `duration>0` 시 `duration` ms 후 `completed` 가 정확히 1회 호출.
- [x] (Must) `show=2` 진입 시 1초 후 `divToasterHide` 클래스가 DOM 에 부착.
- [x] (Must) 전이마다 이전 타이머를 clearTimeout 으로 정리.
- [x] (Must) 언마운트 cleanup 이 활성 타이머를 반드시 소거.
- [x] (Should) `position`/`type` 미지정 시 각각 `center` / `information` 기본값.
- [x] (Should) `data-position`, `data-type`, `data-show` 가 DOM 에 박제되어 테스트·스크린리더가 상태를 식별 가능.
- [x] (NFR) React 19 deprecated API 경고 0 (레거시 lifecycle/ref string 미사용).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
