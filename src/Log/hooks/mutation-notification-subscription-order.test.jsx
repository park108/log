import { fireEvent, render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Writer from '../Writer';
import * as api from '../api';
import * as common from '../../common/common';
import { createQueryTestWrapper } from '../../test-utils/queryWrapper';

// `postLog` / `putLog` 만 수동 제어 가능한 스텁으로 바꾼다 (나머지 api 는 원본 유지 —
// lazy 하위 `LogItem` / `ImageSelector` 가 같은 모듈을 공유한다).
vi.mock('../api', async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, postLog: vi.fn(), putLog: vi.fn() };
});

/**
 * REQ-20260825-014 / spec `components/log` §뮤테이션 완료 알림 계약 (M-1)(M-2) **발화 채널**.
 *
 * per-call `mutate(vars, { onSuccess })` 콜백은 MutationObserver 가 구독자를 보유할 때만
 * 발화한다 (`@tanstack/query-core` mutationObserver —
 * `if (this.#mutateOptions && this.hasListeners())`). 구독은 호출 컴포넌트의 passive effect
 * 커밋 시점에 생기므로, lazy 청크(`LogItem` / `ImageSelector`) + Suspense 경계 아래에서는
 * 응답이 그 창 안에 도착할 수 있고 그러면 알림이 조용히 버려진다 — 글은 저장됐는데 폼은
 * 멈춘 채 아무 것도 알리지 않는다.
 *
 * **관측 표면**(`RULE-06`): 판정 대상은 훅이 콜백 인자를 받는가가 아니라 **호출처(`Writer`)의
 * 알림 동작이 구독 없는 창에서 1회 실행되는가** 다. 그래서 이 채널은 훅을 격리 렌더하지 않고
 * `Writer` 를 실제로 렌더한다 — 훅 격리 픽스처는 `Writer` 가 per-call 로 되돌아가도 초록이다.
 *
 * 구독 지연은 `unmount()` 로 **결정적으로 강제**한다 ((R-M2) — 자연 발생 경합 의존 금지).
 * 언마운트 이후에는 토스터·DOM 이 남지 않으므로 알림 발화는 각 콜백의 첫 문장인
 * `common.log(...)` 호출로 관측한다 (`Writer.jsx` create/update 성공·실패 콜백 4곳 모두 동일).
 */

const countLogCalls = (spy, message, level) =>
	spy.mock.calls.filter(([m, l]) => m === message && l === level).length;

const CREATE_ENTRY = { pathname: '/log/write', state: null };

const EDIT_ENTRY = {
	pathname: '/log/write',
	state: {
		from: {
			logs: [{ contents: 'Current contents', timestamp: 1655737033793 }],
			temporary: true,
			timestamp: 1234567890,
		},
	},
};

const renderWriter = (entry) => {
	const { Wrapper } = createQueryTestWrapper();
	return render(
		<Wrapper>
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[entry]}>
					<Writer />
				</MemoryRouter>
			</div>
		</Wrapper>
	);
};

describe('뮤테이션 완료 알림은 구독 성립 시점에 종속되지 않는다 (M-1)(M-2)', () => {

	let logSpy;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(common, 'isLoggedIn').mockReturnValue(true);
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(common, 'setFullscreen').mockReturnValue(true);
		logSpy = vi.spyOn(common, 'log').mockImplementation(() => {});
	});

	it('(M-1) 생성 — 구독자가 없는 창에서 200 이 도착해도 성공 알림이 1회 발화한다', async () => {
		let resolvePost;
		api.postLog.mockReturnValueOnce(new Promise((resolve) => { resolvePost = resolve; }));

		const { unmount } = renderWriter(CREATE_ENTRY);

		const textInput = await screen.findByTestId('writer-text-area');
		fireEvent.change(textInput, { target: { value: 'Create Log!' } });
		fireEvent.click(await screen.findByTestId('submit-button'));

		await waitFor(() => expect(api.postLog).toHaveBeenCalledTimes(1));

		// 옵저버 구독 해제 = per-call 콜백이 버려지는 조건의 결정적 재현.
		unmount();

		await act(async () => {
			resolvePost({ json: async () => ({ statusCode: 200 }) });
		});

		await waitFor(() =>
			expect(countLogCalls(logSpy, '[API POST] OK - Log', 'SUCCESS')).toBe(1));
	});

	it('(M-2) 생성 — 구독자가 없는 창에서 실패해도 실패 알림이 1회 발화한다', async () => {
		let rejectPost;
		api.postLog.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectPost = reject; }));

		const { unmount } = renderWriter(CREATE_ENTRY);

		const textInput = await screen.findByTestId('writer-text-area');
		fireEvent.change(textInput, { target: { value: 'Create Log!' } });
		fireEvent.click(await screen.findByTestId('submit-button'));

		await waitFor(() => expect(api.postLog).toHaveBeenCalledTimes(1));
		unmount();

		await act(async () => {
			rejectPost(new Error('network'));
		});

		await waitFor(() =>
			expect(countLogCalls(logSpy, '[API POST] FAILED - Log', 'ERROR')).toBe(1));
	});

	it('(M-1) 수정 — 구독자가 없는 창에서 200 이 도착해도 성공 알림이 1회 발화한다', async () => {
		let resolvePut;
		api.putLog.mockReturnValueOnce(new Promise((resolve) => { resolvePut = resolve; }));

		const { unmount } = renderWriter(EDIT_ENTRY);

		fireEvent.click(await screen.findByTestId('submit-button'));

		await waitFor(() => expect(api.putLog).toHaveBeenCalledTimes(1));
		unmount();

		await act(async () => {
			resolvePut({ json: async () => ({ statusCode: 200 }) });
		});

		await waitFor(() =>
			expect(countLogCalls(logSpy, '[API PUT] OK - Log', 'SUCCESS')).toBe(1));
	});

	it('(M-2) 수정 — 구독자가 없는 창에서 비-200 이 도착해도 실패 알림이 1회 발화한다', async () => {
		let resolvePut;
		api.putLog.mockReturnValueOnce(new Promise((resolve) => { resolvePut = resolve; }));

		const { unmount } = renderWriter(EDIT_ENTRY);

		fireEvent.click(await screen.findByTestId('submit-button'));

		await waitFor(() => expect(api.putLog).toHaveBeenCalledTimes(1));
		unmount();

		await act(async () => {
			resolvePut({ json: async () => ({ statusCode: 500 }) });
		});

		await waitFor(() =>
			expect(countLogCalls(logSpy, '[API PUT] FAILED - Log', 'ERROR')).toBe(1));
	});
});
