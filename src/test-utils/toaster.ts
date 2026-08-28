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
//   await waitForToasterVisible('error', 'bottom');   // 표시 도달
//   await waitForToasterHidden('information', 'center'); // 도달 후 소멸
//   await waitForToasterAbsent('error', 'bottom');       // 끝내 나타나지 않음
//   const el = getToasterElement('information', 'center');
//
// 극성 (absence-assertion-arrival-precondition / REQ-20260828-045):
//   부재는 숨김의 증거가 아니다. "한 번도 안 떴다" 는 `waitForToasterAbsent`,
//   "떴다가 사라졌다" 는 `waitForToasterHidden` 이다. 후자는 도달을 관측하지 못하면
//   충족이 아니라 **무판정(reject)** 으로 끝난다 (FR-01·FR-03).
//
// 금지:
//   • 테스트 본문에서 `document.querySelector('[data-type=...]')` 직접 호출 — 본 헬퍼로 치환한다.

import { waitFor } from '@testing-library/react';
import { ASYNC_ASSERTION_TIMEOUT_MS } from './timing';

/**
 * 부재 관측 창 — "끝내 나타나지 않음" 을 주장하기 위해 부재를 유지 관측하는 시간.
 * `ASYNC_ASSERTION_TIMEOUT_MS` 예산 **안**이어야 한다 (AC-4 — 예산 상한을 늘리지 않는다).
 */
const ABSENCE_OBSERVATION_WINDOW_MS = 200;
const ABSENCE_OBSERVATION_INTERVAL_MS = 20;

export type ToasterType = 'information' | 'success' | 'warning' | 'error';
export type ToasterPosition = 'center' | 'bottom';
export interface ToasterWaitOptions {
	timeout?: number;
}

/**
 * 지정 `type` / `position` 조합의 Toaster 엘리먼트 단일 조회.
 * 매칭되는 엘리먼트가 없으면 `null` 반환.
 */
export function getToasterElement(type: ToasterType, position: ToasterPosition): Element | null {
	return document.querySelector(
		`[role="alert"][data-type="${type}"][data-position="${position}"]`
	);
}

/** 남은 예산(ms). 도달 관측과 판정이 각각 상한을 소비해 예산이 2배로 늘어나는 것을 막는다. */
function remainingMs(deadline: number): number {
	return Math.max(1, deadline - Date.now());
}

/** `type` 무관 — 해당 `position` 에 Toaster 표면이 마운트됐는가 (도달 전제 관측용). */
function getToasterSurface(position: ToasterPosition): Element | null {
	return document.querySelector(`[role="alert"][data-position="${position}"]`);
}

/**
 * Toaster 가 **도달한 뒤** 숨김 상태(`data-show` ∈ {"0", "2", "none"} 또는 DOM 이탈) 로
 * 전이할 때까지 대기.
 *
 * 대상이 관측 창 안에서 한 번도 마운트되지 않으면 **resolve 하지 않고 reject** 한다 —
 * 관측 불가는 충족이 아니라 무판정이다 (FR-01·FR-03). "한 번도 안 떴다" 를 주장하려면
 * `waitForToasterAbsent` 를 쓴다.
 *
 * 도달 대기와 숨김 대기는 하나의 `timeout` 예산을 공유한다 (AC-4).
 */
export function waitForToasterHidden(
	type: ToasterType,
	position: ToasterPosition,
	{ timeout = ASYNC_ASSERTION_TIMEOUT_MS }: ToasterWaitOptions = {},
): Promise<void> {
	const deadline = Date.now() + timeout;
	return waitFor(() => {
		if (!getToasterElement(type, position)) {
			throw new Error(`Toaster never observed: type=${type} position=${position}`);
		}
	}, { timeout: remainingMs(deadline) }).then(() => waitFor(() => {
		const el = getToasterElement(type, position);
		if (!el) return;
		const show = el.getAttribute('data-show');
		if (show === '0' || show === '2' || show === 'none' || show == null) return;
		throw new Error(`Toaster still visible: data-show=${show}`);
	}, { timeout: remainingMs(deadline) }));
}

/**
 * `type` / `position` 조합의 Toaster 가 **끝내 나타나지 않음** 을 관측한다.
 *
 * 판정 절차:
 *   1. 도달 전제 — 같은 `position` 에 Toaster 표면이 마운트될 때까지 **type 무관**으로 대기한다.
 *      type 한정으로 기다리면 도달 조건과 판정이 뒤섞여, 실패 표면의 발화를 "부재 단언" 이 아니라
 *      "대기 실패" 로 잡게 된다 (FR-04 — 전제는 호출처가 아니라 헬퍼가 진다).
 *   2. 관측 창을 소진할 때까지 대상 부재를 유지하면 resolve. 창 안에서 한 번이라도 관측되면
 *      그 사실을 래치해 reject 한다 — 떴다가 사라진 것은 "나타나지 않음" 이 아니다 (FR-02).
 *
 * 표면 자체가 도달하지 않으면 reject — 무판정이다 (FR-03).
 */
export function waitForToasterAbsent(
	type: ToasterType,
	position: ToasterPosition,
	{ timeout = ASYNC_ASSERTION_TIMEOUT_MS }: ToasterWaitOptions = {},
): Promise<void> {
	const deadline = Date.now() + timeout;
	return waitFor(() => {
		if (!getToasterSurface(position)) {
			throw new Error(`Toaster surface never observed: position=${position}`);
		}
	}, { timeout: remainingMs(deadline) }).then(() => {
		const windowEnd = Math.min(Date.now() + ABSENCE_OBSERVATION_WINDOW_MS, deadline);
		let violation: Error | null = null;
		return waitFor(() => {
			const el = getToasterElement(type, position);
			if (el && !violation) {
				const show = el.getAttribute('data-show') ?? 'missing';
				violation = new Error(
					`Toaster appeared: type=${type} position=${position} data-show=${show}`
				);
			}
			if (violation) throw violation;
			if (Date.now() < windowEnd) throw new Error('Absence observation window not exhausted');
		}, {
			timeout: Math.min(remainingMs(deadline), ABSENCE_OBSERVATION_WINDOW_MS * 2 + 100),
			interval: ABSENCE_OBSERVATION_INTERVAL_MS,
		});
	});
}

/**
 * Toaster 가 표시 상태(`data-show="1"`) 에 도달할 때까지 대기.
 * 엘리먼트 부재 또는 다른 값이면 재시도, `timeout` 초과 시 reject.
 */
export function waitForToasterVisible(
	type: ToasterType,
	position: ToasterPosition,
	{ timeout = ASYNC_ASSERTION_TIMEOUT_MS }: ToasterWaitOptions = {},
): Promise<void> {
	return waitFor(() => {
		const el = getToasterElement(type, position);
		const show = el?.getAttribute('data-show');
		if (show !== '1') {
			throw new Error(`Toaster not visible: data-show=${show ?? 'missing'}`);
		}
	}, { timeout });
}
