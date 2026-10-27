import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import * as mock from '../Log/api.mock';
import * as common from '../common/common';
import Log from '../Log/Log';
import UserLogin from '../common/UserLogin';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';
import { useMockServer } from '../test-utils/msw';

// 세션이 만료되면 **로그인을 말하는 표면이 모두 함께** 걷혀야 한다.
//
// 토큰 쿠키는 한 시간이면 만료된다. 글 화면은 새로 그려질 때마다 판정하므로
// Edit·Delete 를 걷었는데, 푸터의 로그인 표시("👨‍💻")와 글쓰기 버튼(+)은
// 경로가 바뀌어도 다시 그려지지 않아 그대로 남았다. 운영 사이트 실측
// (2026-10-28, 만료를 흉내 낸 뒤 목록에서 글을 누름):
//
//   로그인 표시  👨‍💻 Jongkil Park   ← 그대로
//   글쓰기 버튼  있음                ← 그대로
//   글 도구막대  "2026-10-28"        ← Edit·Delete 없음
//
// 화면은 로그인돼 있다고 말하는데 글을 고칠 수 없었다. 다시 로그인해야
// 한다는 신호가 어디에도 없었다.
//
// 재판정의 계기는 이동이다. 그래서 단언은 `rerender` 가 아니라 **링크 클릭**
// 뒤에 한다 — `rerender` 는 무엇이든 다시 그리므로 구독이 없어도 통과한다.

const stubProd = (): void => {
	vi.stubEnv('MODE', 'production');
	vi.stubEnv('DEV', false);
	vi.stubEnv('PROD', true);
};

const renderShell = (): void => {
	const { Wrapper } = createQueryTestWrapper();
	render(
		<Wrapper>
			<MemoryRouter initialEntries={['/log']}>
				<Link to="/log/search">move</Link>
				<Routes>
					<Route path="/log/*" element={<Log />} />
				</Routes>
				<UserLogin />
			</MemoryRouter>
		</Wrapper>
	);
};

const move = (): void => { fireEvent.click(screen.getByText('move')); };

describe('세션 만료 뒤 이동', () => {

	useMockServer(() => mock.prodServerOk);

	beforeEach(() => {
		stubProd();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		sessionStorage.removeItem("logList");
		sessionStorage.removeItem("logListLastTimestamp");
	});

	afterEach(() => { vi.restoreAllMocks(); });

	const login = () => ({
		loggedIn: vi.spyOn(common, 'isLoggedIn').mockReturnValue(true),
		admin: vi.spyOn(common, 'isAdmin').mockReturnValue(true),
	});

	const expire = (s: ReturnType<typeof login>): void => {
		s.loggedIn.mockReturnValue(false);
		s.admin.mockReturnValue(false);
	};

	it('로그인 표시가 걷힌다', async () => {

		const s = login();
		renderShell();
		expect(screen.getByTestId('login-button').textContent).toBe('👨‍💻 Jongkil Park');

		expire(s);
		move();

		expect(await screen.findByText('Jongkil Park', { exact: true })).toBeInTheDocument();
	});

	it('글쓰기 버튼이 걷힌다', async () => {

		const s = login();
		renderShell();
		expect(screen.getByTestId('newlog-button')).toBeInTheDocument();

		expire(s);
		move();

		await screen.findByRole('main');
		expect(screen.queryByTestId('newlog-button')).toBeNull();
	});

	// 대조 — 이동 자체가 표면을 걷는 것이 아니다. 위 두 단언이 "이동하면
	// 무엇이든 사라진다" 로 공허하게 충족되는 것을 막는다.
	it('세션이 살아 있으면 이동해도 그대로다', async () => {

		login();
		renderShell();

		move();

		await screen.findByRole('main');
		expect(screen.getByTestId('login-button').textContent).toBe('👨‍💻 Jongkil Park');
		expect(screen.getByTestId('newlog-button')).toBeInTheDocument();
	});
});
