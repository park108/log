import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import Navigation from './Navigation';
import * as common from './common';

// 관리자 메뉴는 **세우기만 하고 걷지 않았다.**
//
// `isAdmin()` 이 참일 때만 상태를 세우고 되돌리는 갈래가 없었다. 토큰 쿠키의
// 수명은 한 시간이므로(`common.setCookie` — `max-age: 3600`) 그 시간을 넘기면
// `isAdmin()` 은 거짓이 되는데 메뉴는 그대로 남는다. 실측:
//
//   로그인 상태  park108.net, log, file, mon
//   만료 후      park108.net, log, file, mon   ← 그대로
//
// 남은 메뉴를 누르면 `File`·`Monitor` 가 마운트 즉시 `/log` 로 되돌린다.
// 메뉴가 없는 문을 가리키고 있었다.

const ADMIN_ITEMS = ['log', 'file', 'mon'];

const renderAt = (path: string) =>
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes><Route path="*" element={<Navigation />} /></Routes>
		</MemoryRouter>
	);

const menuNames = (): string[] =>
	screen.queryAllByRole('link').map((a) => a.textContent ?? '');

describe('관리자 메뉴', () => {

	afterEach(() => { vi.restoreAllMocks(); });

	it('관리자에게는 보인다', () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);

		renderAt('/log');

		expect(menuNames()).toEqual(expect.arrayContaining(ADMIN_ITEMS));
	});

	it('방문자에게는 보이지 않는다', () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(false);

		renderAt('/log');

		for(const name of ADMIN_ITEMS) expect(menuNames()).not.toContain(name);
	});

	// 이 축이 핵심이다 — 한 번 세운 메뉴가 자격을 잃은 뒤에도 남아 있었다.
	it('자격을 잃으면 걷힌다', () => {

		const admin = vi.spyOn(common, 'isAdmin').mockReturnValue(true);

		const { rerender } = renderAt('/log');
		expect(menuNames()).toEqual(expect.arrayContaining(ADMIN_ITEMS));

		// 한 시간이 지나 쿠키가 만료됐다.
		admin.mockReturnValue(false);
		rerender(
			<MemoryRouter initialEntries={['/file']}>
				<Routes><Route path="*" element={<Navigation />} /></Routes>
			</MemoryRouter>
		);

		for(const name of ADMIN_ITEMS) expect(menuNames()).not.toContain(name);
	});

	// 블로그 이름은 자격과 무관하게 늘 있다 — 위 단언이 "아무것도 안 그림" 으로
	// 공허하게 충족되는 것을 막는다.
	it('블로그 이름은 어느 쪽이든 남는다', () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(false);

		renderAt('/log');

		expect(menuNames()).toContain('park108.net');
	});

	it('현재 위치의 메뉴만 활성 표시를 받는다', () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);

		renderAt('/file');

		const active = Array.from(document.querySelectorAll('.li--nav-active'));
		expect(active.map((li) => li.textContent)).toEqual(['file']);
	});
});
