// toaster-conditional-mount-or-helper-spec (REQ-20260421-009) / TSK-20260421-48
// -----------------------------------------------------------------------------
// Toaster 표시/숨김 어설션 헬퍼.
//
// Toaster 는 `show` prop 을 CSS class(`divToasterHide` / `divToasterFadeout`) 로만
// 토글하고 메시지 텍스트와 DOM 노드가 hidden/fadeout 상태에서도 잔존한다. 따라서
// 테스트에서 `screen.queryByText(...).not.toBeInTheDocument()` 로 "사라짐" 을 단정할 수 없고
// `data-show` attribute 를 직접 관찰해야 한다. 본 헬퍼는 해당 attribute 관찰 로직을 캡슐화한다.
//
// 사용:
//   await waitForToasterHidden('information', 'center');
//   await waitForToasterVisible('error', 'bottom');
//   const el = getToasterElement('information', 'center');
//
// 금지:
//   • 테스트 본문에서 `document.querySelector('[data-type=...]')` 직접 호출 — 본 헬퍼로 치환한다.

import { waitFor } from '@testing-library/react';
import { ASYNC_ASSERTION_TIMEOUT_MS } from './timing';

/**
 * 지정 `type` / `position` 조합의 Toaster 엘리먼트 단일 조회.
 * 매칭되는 엘리먼트가 없으면 `null` 반환.
 */
export function getToasterElement(type, position) {
	return document.querySelector(
		`[role="alert"][data-type="${type}"][data-position="${position}"]`
	);
}

/**
 * Toaster 가 숨김 상태(`data-show` ∈ {"0", "2", "none"} 또는 DOM 부재) 에 도달할 때까지 대기.
 * `data-show="1"` 이면 재시도하다가 `timeout` 초과 시 reject.
 *
 * @param {string} type "information" | "success" | "warning" | "error"
 * @param {string} position "center" | "bottom"
 * @param {{ timeout?: number }} [opts]
 */
export function waitForToasterHidden(type, position, { timeout = ASYNC_ASSERTION_TIMEOUT_MS } = {}) {
	return waitFor(() => {
		const el = getToasterElement(type, position);
		if (!el) return;
		const show = el.getAttribute('data-show');
		if (show === '0' || show === '2' || show === 'none' || show == null) return;
		throw new Error(`Toaster still visible: data-show=${show}`);
	}, { timeout });
}

/**
 * Toaster 가 표시 상태(`data-show="1"`) 에 도달할 때까지 대기.
 * 엘리먼트 부재 또는 다른 값이면 재시도, `timeout` 초과 시 reject.
 *
 * @param {string} type
 * @param {string} position
 * @param {{ timeout?: number }} [opts]
 */
export function waitForToasterVisible(type, position, { timeout = ASYNC_ASSERTION_TIMEOUT_MS } = {}) {
	return waitFor(() => {
		const el = getToasterElement(type, position);
		const show = el?.getAttribute('data-show');
		if (show !== '1') {
			throw new Error(`Toaster not visible: data-show=${show ?? 'missing'}`);
		}
	}, { timeout });
}
