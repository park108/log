import type React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Writer from './Writer';
import { DRAFT_KEY } from './draft';
import * as common from '../common/common';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';
import { useMockServer } from '../test-utils/msw';
import * as mock from './api.mock';

// 글쓰기 칸의 본문은 컴포넌트 state 에만 있었다. 상단 내비게이션을 한 번 누르면
// (같은 탭 안의 이동이라 경고도 없이) 컴포넌트가 언마운트되고 쓰던 글이 사라진다.
// 새로고침·탭 닫기도 같다. 복구 수단은 "Temporary Save" 를 **사고 전에** 눌러 두는
// 것뿐이었다.
//
// 안전망은 **새 글에만** 건다. 기존 글 수정 경로에서 초안을 잘못 되살리면 남의 글을
// 덮어쓰는 사고가 되고, 그것은 지금 막으려는 사고보다 나쁘다. 그래서 이 게이트는
// "되살린다" 와 "수정 경로는 건드리지 않는다" 를 **함께** 본다.

const stubMode = (mode: string) => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

const withQuery = (node: React.ReactNode) => {
	const { Wrapper } = createQueryTestWrapper();
	return <Wrapper>{node}</Wrapper>;
};

const asAdmin = () => {
	stubMode('production');
	vi.spyOn(common, 'isLoggedIn').mockReturnValue(true);
	vi.spyOn(common, 'isAdmin').mockReturnValue(true);
	vi.spyOn(common, 'setFullscreen').mockResolvedValue(undefined);
	vi.spyOn(console, 'log').mockImplementation(async () => true);
};

const EXISTING_LOG = {
	logs: [
		{ contents: 'Current contents', timestamp: 1655737033793 },
		{ contents: 'Previous contents', timestamp: 1655736946977 },
	],
	temporary: false,
	timestamp: 1655736946977,
};

const openWriter = (state: unknown) =>
	render(withQuery(
		<div id="root" className="div fullscreen">
			<MemoryRouter initialEntries={[{ pathname: '/log/write', state }]}>
				<Writer />
			</MemoryRouter>
		</div>
	));

describe('쓰다 만 새 글', () => {

	beforeEach(() => { localStorage.clear(); });
	afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

	it('타자한 본문이 저장소에 남는다', async () => {

		asAdmin();
		openWriter({ from: '/log' });

		const area = await screen.findByTestId('writer-text-area');
		fireEvent.change(area, { target: { value: '쓰다 만 글입니다.' } });

		expect(localStorage.getItem(DRAFT_KEY)).toBe('쓰다 만 글입니다.');
	});

	it('다시 들어오면 되살아난다', async () => {

		localStorage.setItem(DRAFT_KEY, '어제 쓰다 만 글');

		asAdmin();
		openWriter({ from: '/log' });

		expect(await screen.findByTestId('writer-text-area')).toHaveValue('어제 쓰다 만 글');
	});

	it('되살릴 때는 말없이 하지 않는다', async () => {

		localStorage.setItem(DRAFT_KEY, '어제 쓰다 만 글');

		asAdmin();
		openWriter({ from: '/log' });

		expect(await screen.findByText('Draft restored.')).toBeInTheDocument();
	});

	it('초안이 없으면 알리지 않는다', async () => {

		asAdmin();
		openWriter({ from: '/log' });

		await screen.findByTestId('writer-text-area');
		expect(screen.queryByText('Draft restored.')).toBeNull();
	});

	it('본문을 비우면 초안도 지워진다', async () => {

		localStorage.setItem(DRAFT_KEY, '지울 글');

		asAdmin();
		openWriter({ from: '/log' });

		const area = await screen.findByTestId('writer-text-area');
		fireEvent.change(area, { target: { value: '' } });

		// 지운 글이 다음에 되살아나면 안 된다.
		expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
	});

	// 이 축이 없으면 "모든 글을 저장한다" 는 구현도 통과한다 — 그 구현은 기존 글을
	// 고치다 나간 뒤 새 글을 쓸 때 남의 글을 되살린다.
	describe('기존 글 수정 경로는 건드리지 않는다', () => {

		it('수정 중 타자는 초안으로 남지 않는다', async () => {

			asAdmin();
			openWriter({ from: EXISTING_LOG });

			const area = await screen.findByTestId('writer-text-area');
			fireEvent.change(area, { target: { value: 'Current contents 를 고친다' } });

			expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
		});

		it('초안이 있어도 수정 본문을 덮지 않는다', async () => {

			localStorage.setItem(DRAFT_KEY, '남의 초안');

			asAdmin();
			openWriter({ from: EXISTING_LOG });

			expect(await screen.findByTestId('writer-text-area')).toHaveValue('Current contents');
			expect(screen.queryByText('Draft restored.')).toBeNull();
		});
	});
	// 글이 저장되면 안전망은 걷는다. 남겨 두면 다음 "새 글" 에 방금 올린 글이
	// 되살아난다 — 되살아난 글을 눈치 못 채고 다시 올리면 같은 글이 두 번 실린다.
	describe('저장이 끝나면', () => {

		useMockServer(() => mock.prodServerOk);

		it('초안을 걷는다', async () => {

			asAdmin();
			vi.useFakeTimers({ shouldAdvanceTime: true });

			openWriter(null);

			const area = await screen.findByTestId('writer-text-area');
			fireEvent.change(area, { target: { value: '올릴 글입니다.' } });
			expect(localStorage.getItem(DRAFT_KEY)).toBe('올릴 글입니다.');

			await act(async () => { await vi.runOnlyPendingTimersAsync(); });

			fireEvent.click(await screen.findByTestId('submit-button'));

			await act(async () => { await vi.runAllTimersAsync(); });
			await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toBeNull());

			vi.useRealTimers();
		});
	});
});
