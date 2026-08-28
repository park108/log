import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import * as mock from './api.mock';
import * as api from './api';
import * as common from '../common/common';
import * as errorReporter from '../common/errorReporter';
import Comment from './Comment';
import CommentItem from './CommentItem';
import { useMockServer } from '../test-utils/msw';
// TSK-20260517-19 / REQ-20260517-082 — `mock.calls[N]` strict narrow 단일 출처
// (`src/test-utils/mockCalls`). non-null assertion 흡수는 본 import 로 회수.
import { firstCall } from '../test-utils/mockCalls';
// TSK-20260827-11-b / REQ-20260827-034 — Toaster 표시/숨김 관찰은 `src/test-utils/toaster`
// 헬퍼만 경유한다 (그 파일 헤더가 테스트 본문의 DOM 셀렉터 직접 호출을 금지한다).
import { waitForToasterVisible, waitForToasterAbsent, getToasterElement } from '../test-utils/toaster';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

// Comment api.mock.js scenario() 는 SetupServerApi 호환 서브셋을 노출 (TSK-20260420-41).
// 본 스위트는 useMockServer(() => mock.xxx) 단일 이디엄으로 통일한다.

describe('Comment render list and post on dev server (ok)', () => {
	useMockServer(() => mock.devServerOk);

	test('render comment list and post comment correctly on dev server', async () => {

		vi.spyOn(window, 'alert').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
		});

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);
		vi.spyOn(common, "isAdmin").mockReturnValue(true); // User is admin in this case.

		render(<Comment />);

		const togglebutton = await screen.findByText("10 comments");
		expect(togglebutton).toBeInTheDocument();
		fireEvent.click(togglebutton);

		// Validation error -> No name and comment
		const submitButton = await screen.findByText("Submit Comment");
		expect(submitButton).toBeDefined();
		fireEvent.click(submitButton);

		// Add name
		const nameInput = await screen.findByPlaceholderText("Type your name");
		expect(nameInput).toBeDefined();
		fireEvent.change(nameInput, {target: {value: 'Test name'}});

		// Validation error -> No comment
		const submitButton2 = await screen.findByText("Submit Comment");
		expect(submitButton2).toBeDefined();
		fireEvent.click(submitButton2);

		// Add comment
		const textArea = await screen.findByPlaceholderText("Write your comment");
		expect(textArea).toBeDefined();
		fireEvent.change(textArea, {target: {value: 'Test comment'}});

		// Ok!
		const submitButton3 = await screen.findByText("Submit Comment");
		expect(submitButton3).toBeDefined();
		fireEvent.click(submitButton3);

		// Change comment
		const textArea2 = await screen.findByPlaceholderText("Write your comment");
		expect(textArea2).toBeDefined();
		fireEvent.change(textArea2, {target: {value: ''}});

		// Ok!
		const submitButton4 = await screen.findByText("Submit Comment");
		expect(submitButton4).toBeDefined();
		fireEvent.click(submitButton4);

		// Open reply form
		const replyButtons = await screen.findAllByText("🪃");
		const firstReplyButton = replyButtons[0]!;

		fireEvent.mouseOver(firstReplyButton);
		fireEvent.mouseOver(firstReplyButton); // Already class changed
		fireEvent.mouseMove(firstReplyButton);
		fireEvent.mouseOut(firstReplyButton);
		fireEvent.mouseOut(firstReplyButton); // Already class changed

		expect(firstReplyButton).toBeDefined();
		fireEvent.click(firstReplyButton);

		// Write reply form contents
		const textArea3 = await screen.findByPlaceholderText("Write your Reply");
		expect(textArea3).toBeDefined();
		fireEvent.change(textArea3, {target: {value: 'This is message for you!'}});

		// OK!
		const replySendButton = await screen.findByText("Send Reply");
		expect(replySendButton).toBeDefined();
		fireEvent.click(replySendButton);
	});
});

describe('Comment render failed when internal error on dev server', () => {
	useMockServer(() => mock.devServerFailed);

	test('render failed when internal error on dev server', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<Comment />);

		// REQ-20260827-034 FR-01·FR-02·FR-03 (spec `components/comment` §동작 7) — errorType 갈래.
		// 조회 실패는 "댓글 0건 성공" 과 **구별되는** 표면을 낸다. 도달 조건(문구 노드 부착)을
		// 먼저 세운 뒤 판정한다 — blue `multi-element-count-assertion-arrival-wait`.
		await screen.findByText('Failed to load comments.');
		await waitForToasterVisible('error', 'bottom');

		const alertEl = getToasterElement('error', 'bottom');
		expect(alertEl).not.toBeNull();
		expect(alertEl).toHaveAttribute('role', 'alert'); // FR-02 접근성 트리 관측
		expect(alertEl).toHaveTextContent('Failed to load comments.');

		// FR-06 — 작성 실패 문구를 재사용하지 않는다.
		expect(screen.queryByText('The comment posted failed.')).toBeNull();

		// 토글 라벨은 "0건 성공" 과 동일하다 — 구별을 담당하는 것은 위 실패 표면이다.
		// `findByTestId` 는 라벨 전이를 기다리지 않고 즉시 반환하므로 도달 조건을 명시한다.
		await waitFor(() => {
			expect(screen.getByTestId('comment-toggle-button')).toHaveTextContent('Add a comment');
		});
	});
});

describe('Comment render failed when network error on dev server', () => {
	useMockServer(() => mock.devServerNetworkError);

	test('render failed when network error on dev server', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<Comment />);

		// REQ-20260827-034 FR-01·FR-02·FR-03 — catch 갈래. errorType 갈래와 **독립으로** 판정한다
		// (한쪽만 단언하면 다른 갈래의 누락이 통과한다 — spec §게이트 실효 검증 Dir-1/Dir-2).
		await screen.findByText('Failed to load comments for network issue.');
		await waitForToasterVisible('error', 'bottom');

		const alertEl = getToasterElement('error', 'bottom');
		expect(alertEl).not.toBeNull();
		expect(alertEl).toHaveAttribute('role', 'alert'); // FR-02 접근성 트리 관측
		expect(alertEl).toHaveTextContent('Failed to load comments for network issue.');

		// FR-06 — 작성 실패 문구를 재사용하지 않는다.
		expect(screen.queryByText('The comment posted failed for network issue.')).toBeNull();

		// 라벨 전이 도달 조건 (위 케이스와 동일 사유).
		await waitFor(() => {
			expect(screen.getByTestId('comment-toggle-button')).toHaveTextContent('Add a comment');
		});
	});
});

// ---------------------------------------------------------------------------
// prod server 시나리오 체인 3 단계.
// 원본 단일 test 는 `ok -> failed -> networkError` 를 하나의 본문에서 chain swap 했으나,
// 본문 내 `.listen()` 잔존 금지 이디엄을 충족하기 위해 단계별 describe 로 분리한다.
// (spec §수용기준 "case/assert 수 감소 0" — 분할 증가는 허용, 원본 assert 들을 모두 보존.)
// ---------------------------------------------------------------------------

describe('Comment render list and post on prod server (ok scenario — validation flow)', () => {
	useMockServer(() => mock.prodServerOk);

	test('render comment list and post comment failed on prod server — ok stage', async () => {

		vi.spyOn(window, 'alert').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
		});

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<Comment />);

		const togglebutton = await screen.findByText("1 comment");
		expect(togglebutton).toBeInTheDocument();
		fireEvent.click(togglebutton);

		// Validation error -> No name and comment
		const submitButton = await screen.findByText("Submit Comment");
		expect(submitButton).toBeDefined();
		fireEvent.click(submitButton);

		// Add name
		const nameInput = await screen.findByPlaceholderText("Type your name");
		expect(nameInput).toBeDefined();
		fireEvent.change(nameInput, {target: {value: 'Test name'}});

		// Validation error -> No comment
		const submitButton2 = await screen.findByText("Submit Comment");
		expect(submitButton2).toBeDefined();
		fireEvent.click(submitButton2);

		// Add comment
		const textArea = await screen.findByPlaceholderText("Write your comment");
		expect(textArea).toBeDefined();
		fireEvent.change(textArea, {target: {value: 'Test comment'}});
	});
});

describe('Comment render list and post on prod server (failed scenario — post failure toast)', () => {
	useMockServer(() => mock.prodServerFailed);

	test('render comment list and post comment failed on prod server — failed stage', async () => {

		vi.spyOn(window, 'alert').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
		});

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<Comment />);

		// Failed server: GET returns 500 → 조회 실패 표면(토스터)가 함께 뜨고 토글 라벨은 "Add a comment" 로
		// 남는다 (spec `components/comment` §동작 7). 두 표면이 모두 /comment/ 에 걸리므로
		// 텍스트 쿼리는 다중 매치로 throw 할 수 있다 — 토글은 data-testid 로 특정한다.
		// 본 케이스가 판정하는 것은 POST 실패 토스트다 (진입 경로만 교체).
		const toggle = await screen.findByTestId("comment-toggle-button");
		expect(toggle).toBeInTheDocument();
		fireEvent.click(toggle);

		const nameInput = await screen.findByPlaceholderText("Type your name");
		fireEvent.change(nameInput, {target: {value: 'Test name'}});
		const textArea = await screen.findByPlaceholderText("Write your comment");
		fireEvent.change(textArea, {target: {value: 'Test comment'}});

		vi.useFakeTimers({ shouldAdvanceTime: true });

		const submitButton = await screen.findByText("Submit Comment");
		expect(submitButton).toBeDefined();
		fireEvent.click(submitButton);

		const toasterMessage = await screen.findByText("The comment posted failed.");

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		expect(toasterMessage).toBeDefined();
	});
});

describe('Comment render list and post on prod server (network-error scenario — post failure toast)', () => {
	useMockServer(() => mock.prodServerNetworkError);

	test('render comment list and post comment failed on prod server — networkError stage', async () => {

		vi.spyOn(window, 'alert').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
		});

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<Comment />);

		// 진입 경로만 교체 (위 prodServerFailed 케이스와 동일 사유).
		const toggle = await screen.findByTestId("comment-toggle-button");
		expect(toggle).toBeInTheDocument();
		fireEvent.click(toggle);

		const nameInput = await screen.findByPlaceholderText("Type your name");
		fireEvent.change(nameInput, {target: {value: 'Test name'}});
		const textArea2 = await screen.findByPlaceholderText("Write your comment");
		expect(textArea2).toBeDefined();
		fireEvent.change(textArea2, {target: {value: 'Test comment'}});

		vi.useFakeTimers({ shouldAdvanceTime: true });

		// Failed!
		const submitButton5 = await screen.findByText("Submit Comment");
		expect(submitButton5).toBeDefined();
		fireEvent.click(submitButton5);

		const toasterMessage2 = await screen.findByText("The comment posted failed for network issue.");

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		expect(toasterMessage2).toBeDefined();
	});
});

it('render comment item correctly', () => {
	const message = "Wow, this is message";
	render(
		<CommentItem
			isHidden={false}
			isAdminComment={false}
			message={message}
			name="Tester"
			logTimestamp={1655302060414}
			commentTimestamp={1655302099999}
			timestamp={1655302060414}
			openReplyForm={() => {}}
			reply={() => {}}
		/>
	);
	const messageText = screen.getByText(message);
	expect(messageText).toBeInTheDocument();
});

it('render hidden comment item correctly', () => {
	vi.spyOn(common, "isAdmin").mockReturnValue(false);
	const message = "Wow, this is message";
	render(
		<CommentItem
			isHidden={true}
			isAdminComment={false}
			message={message}
			name="Tester"
			logTimestamp={1655302060414}
			commentTimestamp={1655302099999}
			timestamp={1655302060414}
			openReplyForm={() => {}}
			reply={() => {}}
		/>
	);
	const messageText = screen.getByText("🥷 Hidden Message 🥷");
	expect(messageText).toBeInTheDocument();
});

describe('Comment a11y 패턴 B (REQ-20260421-033 FR-03) — M7 toggle', () => {
	useMockServer(() => mock.devServerOk);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('comment-toggle-button 에 tabIndex=0 과 role="button" 이 부여된다', async () => {
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<Comment logTimestamp={1655302060414} />);

		const el = await screen.findByTestId('comment-toggle-button');
		expect(el).toHaveAttribute('role', 'button');
		expect(el).toHaveAttribute('tabIndex', '0');
	});

	it('comment-toggle-button 이 Enter 키로 활성된다 (click 과 동일 핸들러)', async () => {
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<Comment logTimestamp={1655302060414} />);

		const el = await screen.findByTestId('comment-toggle-button');
		// 초기: isShow=false → CommentForm 미렌더.
		expect(screen.queryByPlaceholderText('Write your comment')).toBeNull();

		fireEvent.keyDown(el, { key: 'Enter' });

		// Enter → toggleShow → isShow=true → CommentForm 렌더.
		const textArea = await screen.findByPlaceholderText('Write your comment');
		expect(textArea).toBeInTheDocument();
	});

	it('comment-toggle-button 이 Space 키로 활성된다 (preventDefault)', async () => {
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<Comment logTimestamp={1655302060414} />);

		const el = await screen.findByTestId('comment-toggle-button');

		const spaceEvent = fireEvent.keyDown(el, { key: ' ', cancelable: true });
		// activateOnKey 가 preventDefault 호출 → fireEvent 반환값이 false (cancelled).
		expect(spaceEvent).toBe(false);
	});
});

// REQ-20260421-039 FR-03 / TSK-20260421-86 — errorReporter 채널 단일화 D7.
// `console.error` → `reportError` 치환 검증. M7 a11y describe 와 직교한 별개 블록.
describe('Comment reportError 채널 (REQ-20260421-039 FR-03)', () => {
	describe('GET Comments errorType 분기 (devServerFailed)', () => {
		useMockServer(() => mock.devServerFailed);

		it('errorType 가 존재하면 reportError 1회 호출', async () => {
			const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

			// devServerFailed: GET returns ERROR_500 JSON ({ errorType: "500", ... })
			// → hasValue(newData.errorType) === true → Comment.jsx:93 분기 → reportError(newData).
			vi.stubEnv('DEV', true);
			vi.stubEnv('PROD', false);

			render(<Comment logTimestamp={1655302060414} />);

			// initial GET 완료 대기 — 버튼 텍스트가 "... comments" → "Add a comment" 로 전이.
			await screen.findByText('Add a comment');

			expect(reportErrorSpy).toHaveBeenCalledTimes(1);
			const [firstArg] = firstCall(reportErrorSpy);
			expect(firstArg).toHaveProperty('errorType');

			reportErrorSpy.mockRestore();
		});
	});

	describe('POST Comment non-200 분기 (prodServerFailed)', () => {
		useMockServer(() => mock.prodServerFailed);

		it('POST 응답 statusCode 가 200 아니면 reportError 추가 호출', async () => {
			const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

			// prodServerFailed: GET returns ERROR_500, POST returns ERROR_500.
			// 초기 GET 실패 시점에도 reportError 가 호출되므로 POST 분기는 그 "이후" 호출 로 구분.
			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<Comment logTimestamp={1655302060414} />);

			// 초기 GET 실패로 reportError 최소 1회 호출 (`:93` 분기). count 0 확정까지 대기.
			await screen.findByText('Add a comment');
			const getPhaseCallCount = reportErrorSpy.mock.calls.length;
			expect(getPhaseCallCount).toBeGreaterThanOrEqual(1);

			// POST 경로: 폼을 열어 name/comment 채우고 Submit → POST 실패 (statusCode != 200)
			// → Comment.jsx:49 분기 → reportError(res) 추가 호출.
			const toggle = screen.getByTestId('comment-toggle-button');
			fireEvent.click(toggle);

			const nameInput = await screen.findByPlaceholderText('Type your name');
			fireEvent.change(nameInput, { target: { value: 'Test name' } });
			const textArea = await screen.findByPlaceholderText('Write your comment');
			fireEvent.change(textArea, { target: { value: 'Test comment' } });

			vi.useFakeTimers({ shouldAdvanceTime: true });
			try {
				const submitButton = await screen.findByText('Submit Comment');
				fireEvent.click(submitButton);

				// POST 실패 토스터 렌더 → `:49` 분기 통과 보장.
				await screen.findByText('The comment posted failed.');

				await act(async () => {
					await vi.runAllTimersAsync();
				});
			} finally {
				vi.useRealTimers();
			}

			expect(reportErrorSpy.mock.calls.length).toBeGreaterThan(getPhaseCallCount);

			reportErrorSpy.mockRestore();
		});
	});
});

// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-b —
// async unmount race 박제. `getComments` (effect `:99` 경로) 와 `postComment`
// (`postNewComment` submit 핸들러 경로) 를 `vi.spyOn` 으로 외부 resolve/reject 가능한
// deferred 로 바꾼 뒤 `unmount()` → 응답 도착 왕복을 만든다.
// 단정 3종: (a) state 전이 0 (토스터 문구 DOM 부재), (b) `console.log` 0 hit,
// (c) `console.error` 0 hit. spy 는 unmount 직후 `mockClear()` 로 기준점을 잡아
// unmount **이전** 발화와 분리한다. DEV stub 필수 — `log()` 는 `isDev()` 분기 안에서만
// `console.log` 로 나가므로 PROD stub 이면 (b) 단정이 공허해진다.
describe('Comment unmount-safety (REQ-20260517-093 (I1)(I2))', () => {

	const OK_COMMENTS = (): Response => new Response(JSON.stringify({
		body: { Items: [] },
	}), { status: 200, headers: { 'Content-Type': 'application/json' } });

	const flushAfterResponse = async (): Promise<void> => {
		await act(async () => {
			await new Promise<void>(resolve => setTimeout(resolve, 0));
		});
	};

	beforeEach(() => {
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
	});

	it('pending getComments 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		let resolveResp!: (r: Response) => void;
		const pending = new Promise<Response>((resolve) => { resolveResp = resolve; });
		const getCommentsSpy = vi.spyOn(api, 'getComments').mockReturnValue(pending);

		const { unmount } = render(<Comment logTimestamp={1655302060414} />);

		await waitFor(() => expect(getCommentsSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		resolveResp(OK_COMMENTS());
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('pending getComments 중 unmount 후 reject → catch 경로도 어떤 발화도 하지 않는다', async () => {

		let rejectResp!: (e: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		const getCommentsSpy = vi.spyOn(api, 'getComments').mockReturnValue(pending);

		const { unmount } = render(<Comment logTimestamp={1655302060414} />);

		await waitFor(() => expect(getCommentsSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		rejectResp(new Error('comments network down'));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('pending postComment 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다 (핸들러 경로)', async () => {

		vi.spyOn(api, 'getComments').mockResolvedValue(OK_COMMENTS());

		let resolvePost!: (r: Response) => void;
		const pendingPost = new Promise<Response>((resolve) => { resolvePost = resolve; });
		const postCommentSpy = vi.spyOn(api, 'postComment').mockReturnValue(pendingPost);

		const { unmount } = render(<Comment logTimestamp={1655302060414} />);

		fireEvent.click(await screen.findByTestId('comment-toggle-button'));

		const textArea = await screen.findByPlaceholderText('Write your comment');
		fireEvent.change(textArea, { target: { value: 'Test comment' } });
		fireEvent.click(await screen.findByText('Submit Comment'));

		await waitFor(() => expect(postCommentSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		resolvePost(new Response(JSON.stringify({ statusCode: 200 }), {
			status: 200, headers: { 'Content-Type': 'application/json' },
		}));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(screen.queryByText('The comment posted.')).toBeNull();
	});

	it('pending postComment 중 unmount 후 reject → 핸들러 catch 경로도 어떤 발화도 하지 않는다', async () => {

		vi.spyOn(api, 'getComments').mockResolvedValue(OK_COMMENTS());

		let rejectPost!: (e: unknown) => void;
		const pendingPost = new Promise<Response>((_, reject) => { rejectPost = reject; });
		const postCommentSpy = vi.spyOn(api, 'postComment').mockReturnValue(pendingPost);

		const { unmount } = render(<Comment logTimestamp={1655302060414} />);

		fireEvent.click(await screen.findByTestId('comment-toggle-button'));

		const textArea = await screen.findByPlaceholderText('Write your comment');
		fireEvent.change(textArea, { target: { value: 'Test comment' } });
		fireEvent.click(await screen.findByText('Submit Comment'));

		await waitFor(() => expect(postCommentSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		rejectPost(new Error('post network down'));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(screen.queryByText('The comment posted failed for network issue.')).toBeNull();
	});
});

// REQ-20260827-034 FR-05 (spec `components/comment` §동작 7 특이도) / TSK-20260827-11-b —
// 조회가 **성공**하면 실패 표면이 나타나지 않는다. 이 방향이 없으면 "상시 표시되는 오류 배너" 가
// FR-01 을 형식 통과한다. 부재 단언은 반드시 **도달 조건 뒤**에 둔다 — `<Toaster>` 는 lazy 라
// chunk 해석 전에는 어떤 부재 단언도 무조건 통과한다 (경합 승리로 통과하는 단언 금지,
// blue `testing/multi-element-count-assertion-arrival-wait`).
describe('Comment GET 성공 시 조회 실패 표면 부재 (REQ-20260827-034 FR-05)', () => {
	useMockServer(() => mock.devServerOk);

	const expectNoGetFailureSurface = async (): Promise<void> => {
		// 도달 조건 — Toaster lazy chunk 가 실제로 마운트될 때까지 대기한다.
		// **type 무관**으로 기다린다: "success" 한정으로 기다리면 도달 조건과 판정이 뒤섞여
		// 실패 표면 발화를 "부재 단언" 이 아니라 "대기 실패" 로 잡게 된다.
		await waitFor(() => {
			expect(
				getToasterElement('success', 'bottom') ?? getToasterElement('error', 'bottom')
			).not.toBeNull();
		});

		// 실패 표면 부재 (FR-05) — 부재 전용 경로. 숨김 경로는 "떴다가 사라짐" 이라 명제가 다르다.
		await waitForToasterAbsent('error', 'bottom');
		expect(getToasterElement('error', 'bottom')).toBeNull();
		expect(screen.queryByText('Failed to load comments.')).toBeNull();
		expect(screen.queryByText('Failed to load comments for network issue.')).toBeNull();
	};

	test('GET 성공(10건) 이면 조회 실패 표면이 나타나지 않는다', async () => {
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(<Comment logTimestamp={1655302060414} />);

		// 도달 조건 — 초기 GET 완료 (라벨 전이).
		expect(await screen.findByText('10 comments')).toBeInTheDocument();

		await expectNoGetFailureSurface();
	});

	test('GET 성공이고 0건이면 조회 실패 표면이 나타나지 않는다 (빈 상태 ≠ 실패 상태)', async () => {
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		// 0건 성공 응답. 실패 갈래와 **같은** 토글 라벨("Add a comment")로 도달하므로
		// 라벨만으로는 두 상태가 구별되지 않는다 — 구별은 오직 실패 표면의 유무다.
		vi.spyOn(api, 'getComments').mockResolvedValue(new Response(
			JSON.stringify({ body: { Items: [] } }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		));

		render(<Comment logTimestamp={1655302060414} />);

		// 도달 조건 — 초기 GET 완료 (라벨 전이).
		expect(await screen.findByText('Add a comment')).toBeInTheDocument();

		await expectNoGetFailureSurface();
	});
});
