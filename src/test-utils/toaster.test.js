// toaster-conditional-mount-or-helper-spec (REQ-20260421-009) / TSK-20260421-48 FR-06
// -------------------------------------------------------------------------------
// `waitForToasterHidden` / `waitForToasterVisible` / `getToasterElement` sanity.
//
// 본 테스트는 runtime Toaster 컴포넌트를 렌더하지 않고 `document.body.innerHTML` 을 직접 조작하여
// data-attribute 계약만 검증한다. 목적: 헬퍼가 data-show ∈ {"0","1","2","none"} / DOM 부재 를
// 각각 어떻게 해석하는지 잠금(locking).

import { describe, it, expect, afterEach } from 'vitest';
import {
	getToasterElement,
	waitForToasterHidden,
	waitForToasterVisible,
} from './toaster';

afterEach(() => {
	document.body.innerHTML = '';
});

/**
 * 단일 toaster 노드 생성 헬퍼 (test-local).
 * data-show 값이 `undefined` 면 attribute 자체를 생략 (data-show=null 케이스).
 */
function mountToaster({ type = 'information', position = 'center', show }) {
	const el = document.createElement('div');
	el.setAttribute('role', 'alert');
	el.setAttribute('data-type', type);
	el.setAttribute('data-position', position);
	if (show !== undefined) el.setAttribute('data-show', String(show));
	document.body.appendChild(el);
	return el;
}

describe('getToasterElement', () => {
	it('매칭되는 type/position 조합의 엘리먼트를 반환한다', () => {
		mountToaster({ type: 'information', position: 'center', show: '0' });
		const el = getToasterElement('information', 'center');
		expect(el).not.toBeNull();
		expect(el.getAttribute('data-type')).toBe('information');
		expect(el.getAttribute('data-position')).toBe('center');
	});

	it('매칭이 없으면 null 을 반환한다', () => {
		mountToaster({ type: 'information', position: 'center', show: '0' });
		expect(getToasterElement('error', 'bottom')).toBeNull();
	});
});

describe('waitForToasterHidden', () => {
	it('즉시 숨김 상태(data-show="0") 에서 resolve', async () => {
		mountToaster({ type: 'information', position: 'center', show: '0' });
		await expect(waitForToasterHidden('information', 'center')).resolves.toBeUndefined();
	});

	it('엘리먼트가 없으면 resolve (숨김으로 해석)', async () => {
		await expect(waitForToasterHidden('information', 'center')).resolves.toBeUndefined();
	});

	it('data-show="1" → "0" 전환 후 resolve', async () => {
		const el = mountToaster({ type: 'information', position: 'center', show: '1' });
		// 50ms 뒤 attribute 를 "0" 으로 전이.
		setTimeout(() => el.setAttribute('data-show', '0'), 50);
		await expect(waitForToasterHidden('information', 'center')).resolves.toBeUndefined();
	});

	it('data-show="1" 계속 유지 시 timeout 으로 reject', async () => {
		mountToaster({ type: 'information', position: 'center', show: '1' });
		await expect(
			waitForToasterHidden('information', 'center', { timeout: 100 })
		).rejects.toThrow(/Toaster still visible/);
	});
});

describe('waitForToasterVisible', () => {
	it('data-show="1" 에서 resolve', async () => {
		mountToaster({ type: 'error', position: 'bottom', show: '1' });
		await expect(waitForToasterVisible('error', 'bottom')).resolves.toBeUndefined();
	});

	it('엘리먼트가 없으면 timeout reject', async () => {
		await expect(
			waitForToasterVisible('error', 'bottom', { timeout: 100 })
		).rejects.toThrow(/Toaster not visible/);
	});
});
