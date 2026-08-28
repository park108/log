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
	waitForToasterAbsent,
	waitForToasterHidden,
	waitForToasterVisible,
} from './toaster';

afterEach(() => {
	document.body.innerHTML = '';
});

interface MountToasterOptions {
	type?: string;
	position?: string;
	show?: string | number | undefined;
}

/**
 * 단일 toaster 노드 생성 헬퍼 (test-local).
 * data-show 값이 `undefined` 면 attribute 자체를 생략 (data-show=null 케이스).
 */
function mountToaster({ type = 'information', position = 'center', show }: MountToasterOptions): HTMLDivElement {
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
		expect(el!.getAttribute('data-type')).toBe('information');
		expect(el!.getAttribute('data-position')).toBe('center');
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

	// 부재는 숨김의 증거가 아니다 — 미마운트는 충족이 아니라 무판정이다 (FR-01·FR-03).
	it('엘리먼트가 한 번도 관측되지 않으면 무판정(reject)', async () => {
		await expect(
			waitForToasterHidden('information', 'center', { timeout: 100 })
		).rejects.toThrow(/Toaster never observed/);
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

describe('waitForToasterAbsent', () => {
	it('표면은 떴으나 대상 조합이 끝내 없으면 resolve', async () => {
		mountToaster({ type: 'information', position: 'center', show: '1' });
		await expect(waitForToasterAbsent('error', 'center')).resolves.toBeUndefined();
	});

	it('대상이 마운트돼 있으면 reject (떴다가 사라진 것은 부재가 아니다)', async () => {
		mountToaster({ type: 'error', position: 'bottom', show: '1' });
		await expect(
			waitForToasterAbsent('error', 'bottom')
		).rejects.toThrow(/Toaster appeared/);
	});

	it('표면 자체가 도달하지 않으면 무판정(reject)', async () => {
		await expect(
			waitForToasterAbsent('error', 'bottom', { timeout: 100 })
		).rejects.toThrow(/Toaster surface never observed/);
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
