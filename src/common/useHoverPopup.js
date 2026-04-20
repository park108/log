// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-01, FR-04, FR-05
//
// `useHoverPopup` — 선언적 hover/focus/touch 팝업 훅.
//
// 기존 `src/common/common.js` 의 `hoverPopup(e, popupElementId)` (명령형 DOM mutation,
// `document.getElementById` + `style.display|left|top` 직접 조작) 를 대체한다.
//
// 반환값:
//   - `triggerProps` : 팝업을 띄우는 요소(예: 라벨/아이콘) 에 spread.
//   - `contentProps` : 팝업 본문 컨테이너(div, span 등) 에 spread.
//   - `isVisible`    : 현재 표시 여부 (boolean).
//   - `id`           : 훅 인스턴스별 고유 ID (`useId()` 기반, 호출자 간 중복 안전).
//
// 접근성 (WCAG 2.1 SC 1.4.13 Content on Hover or Focus):
//   - 포커스 가능(`onFocus`/`onBlur`) — 키보드 사용자 접근.
//   - `Escape` 로 닫힘(dismissible).
//   - `role="tooltip"` + `aria-describedby` 로 보조기기 안내.
//
// 터치 대안 (REQ-20260420-001 FR-05):
//   - `onTouchStart` 로 표시 — hover 가 없는 모바일 기기에서 기능 회귀 방지.

import { useCallback, useEffect, useId, useRef, useState } from 'react';

const HIDE_DELAY_MS = 100;

export function useHoverPopup({ closeOnEscape = true } = {}) {
	const [isVisible, setIsVisible] = useState(false);
	const id = useId();
	const timerRef = useRef(null);

	const clearPendingHide = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const show = useCallback(() => {
		clearPendingHide();
		setIsVisible(true);
	}, [clearPendingHide]);

	const hide = useCallback(() => {
		// 짧은 딜레이 — trigger → content 간 포인터 이동 시 깜빡임 방지.
		clearPendingHide();
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			setIsVisible(false);
		}, HIDE_DELAY_MS);
	}, [clearPendingHide]);

	// Escape 키 → 즉시 닫힘 (WCAG 2.1 SC 1.4.13 "dismissible").
	useEffect(() => {
		if (!closeOnEscape || !isVisible) return undefined;
		const onKey = (e) => {
			if (e.key === 'Escape') {
				clearPendingHide();
				setIsVisible(false);
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [closeOnEscape, isVisible, clearPendingHide]);

	// 언마운트 정리 — 보류 중인 hide 타이머 취소.
	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, []);

	const triggerProps = {
		onMouseEnter: show,
		onMouseLeave: hide,
		onFocus: show,
		onBlur: hide,
		onTouchStart: show,
		'aria-describedby': isVisible ? id : undefined,
	};

	const contentProps = {
		id,
		role: 'tooltip',
		'aria-hidden': !isVisible,
		onMouseEnter: show,
		onMouseLeave: hide,
	};

	return { triggerProps, contentProps, isVisible, id };
}

export default useHoverPopup;
