import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import Comment from './Comment';
import * as api from './api';
import * as common from '../common/common';
import * as errorReporter from '../common/errorReporter';
import { waitForToasterHidden } from '../test-utils/toaster';

// 댓글 조회가 실패했다는 사실이 2초만 살았다.
//
// 이 컴포넌트의 기존 테스트는 "토글 라벨은 0건 성공과 동일하다 — 구별을 담당하는
// 것은 실패 표면이다" 라고 적어 두었는데, 그 실패 표면이 `duration=2000` 인 하단
// 토스터였다. 2초가 지나면 구별할 것이 아무것도 남지 않는다. 남는 것은
// **"Add a comment"** 라고 적힌 토글 버튼뿐이고, 그것은 댓글이 0건이라는 뜻이다.
// 방문자는 이 글에 댓글이 없다고 읽는다 — 실제로는 몇 건인지 모르는 상태다.
//
// **판정은 토스터가 물러난 뒤에 한다.** 토스터가 떠 있는 순간만 재면 종전 상태도
// 통과한다 — 그것이 정확히 이 결함이 오래 남은 이유다.

const jsonResponse = (body: unknown, status = 200): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const ITEM = {
	sortKey: '1655392348834-0000000000000',
	logTimestamp: 1655302060414,
	timestamp: 1655392348834,
	message: '남아 있는 댓글',
	isHidden: false,
	isAdminComment: false,
	name: '방문자',
};

beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
	// `Comment` 계열은 렌더 중 `isAdmin()` 을 부른다 — 실제 쿠키에 기대면 결과가
	// 실행 환경에 따라 달라진다 (`__tests__/ambient-auth-render-determinism`).
	// 이 파일의 명제는 관리자 여부와 무관하므로 방문자로 고정한다.
	vi.spyOn(common, 'isAdmin').mockReturnValue(false);
	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);
});

afterEach(() => { vi.restoreAllMocks(); });

const ERROR_HEADING = "Couldn't load the comments.";

describe('댓글 조회 실패는 토스터보다 오래 남는다', () => {

	it('본문 오류 응답 — 토스터가 물러난 뒤에도 표면이 남는다', async () => {

		vi.spyOn(api, 'getComments').mockResolvedValue(
			jsonResponse({ errorType: 'InternalServerError' })
		);

		render(<Comment logTimestamp={ITEM.logTimestamp} />);

		await screen.findByText(ERROR_HEADING);
		await waitForToasterHidden('error', 'bottom');

		expect(screen.getByText(ERROR_HEADING)).toBeInTheDocument();
	});

	it('네트워크 실패 — 같은 표면이 남는다', async () => {

		// 한쪽 갈래만 고치면 나머지 한쪽이 종전 상태로 남는다.
		vi.spyOn(api, 'getComments').mockRejectedValue(new Error('network down'));

		render(<Comment logTimestamp={ITEM.logTimestamp} />);

		await screen.findByText(ERROR_HEADING);
		await waitForToasterHidden('error', 'bottom');

		expect(screen.getByText(ERROR_HEADING)).toBeInTheDocument();
	});

	// 접힌 상태에서도 내야 한다 — 펼치지 않은 독자에게 남는 유일한 글자가
	// "Add a comment" 이기 때문이다.
	it('펼치지 않아도 보인다', async () => {

		vi.spyOn(api, 'getComments').mockRejectedValue(new Error('network down'));

		render(<Comment logTimestamp={ITEM.logTimestamp} />);

		expect(await screen.findByText(ERROR_HEADING)).toBeInTheDocument();
		expect(screen.getByTestId('comment-toggle-button')).toHaveAttribute('aria-expanded', 'false');
	});

	it('Retry 가 다시 조회하고, 성공하면 표면이 걷힌다', async () => {

		const get = vi.spyOn(api, 'getComments')
			.mockRejectedValueOnce(new Error('network down'))
			.mockResolvedValue(jsonResponse({ body: { Items: [ITEM] } }));

		render(<Comment logTimestamp={ITEM.logTimestamp} />);

		await screen.findByText(ERROR_HEADING);
		fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

		// **성공 신호를 먼저 기다린다.** Retry 는 누르는 즉시 표면을 걷으므로
		// (재조회 결과를 알기 전이다), 표면 부재만 기다리면 그 `waitFor` 가 곧바로
		// 통과하고 뒤 단언이 응답을 앞지른다 — 실제로 그렇게 흔들렸다.
		await waitFor(() =>
			expect(screen.getByTestId('comment-toggle-button')).toHaveTextContent('1 comment')
		);

		expect(get.mock.calls.length).toBeGreaterThanOrEqual(2);
		expect(screen.queryByText(ERROR_HEADING)).toBeNull();
	});

	// 비어 있음과 고장은 다르다 — 이 단언이 없으면 "늘 오류를 낸다" 도 위를 통과한다.
	it('성공 0건에는 나타나지 않는다', async () => {

		vi.spyOn(api, 'getComments').mockResolvedValue(jsonResponse({ body: { Items: [] } }));

		render(<Comment logTimestamp={ITEM.logTimestamp} />);

		await screen.findByText('Add a comment');
		expect(screen.queryByText(ERROR_HEADING)).toBeNull();
	});

	// 이미 받은 댓글이 있으면 그 목록을 오류 화면으로 덮지 않는다.
	it('보여줄 댓글이 있으면 목록을 덮지 않는다', async () => {

		vi.spyOn(api, 'getComments')
			.mockResolvedValueOnce(jsonResponse({ body: { Items: [ITEM] } }))
			.mockRejectedValue(new Error('network down'));

		render(<Comment logTimestamp={ITEM.logTimestamp} />);

		await screen.findByText('1 comment');
		fireEvent.click(screen.getByTestId('comment-toggle-button'));

		expect(await screen.findByText(ITEM.message)).toBeInTheDocument();
		expect(screen.queryByText(ERROR_HEADING)).toBeNull();
	});
});
