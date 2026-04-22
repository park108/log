/**
 * 패턴 B (accessibility-spec §2.2) 공통 헬퍼.
 * `<span>` / `<div>` 등 non-button 요소에 `onClick` 을 둘 때,
 * Enter 또는 Space 로도 같은 핸들러를 활성화하기 위한 `onKeyDown` 래퍼.
 *
 * Space 의 페이지 스크롤 충돌을 막기 위해 `preventDefault()` 를 호출한다.
 * `<input>` / `<textarea>` 위에서는 사용 금지 (호출부 책임).
 */

// KeyboardEvent 의 `key` / `preventDefault` 만 참조하는 구조적 부분 타입.
// native KeyboardEvent · React.KeyboardEvent · vitest mock 객체 모두 호환.
type ActivateOnKeyEventLike = {
	key: string;
	preventDefault: () => void;
};

export const activateOnKey =
	<E extends ActivateOnKeyEventLike>(handler: (event: E) => void) =>
	(event: E): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handler(event);
		}
	};

export default activateOnKey;
