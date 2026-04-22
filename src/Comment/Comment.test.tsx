import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock';
import * as common from '../common/common';
import * as errorReporter from '../common/errorReporter';
import Comment from './Comment';
import CommentItem from './CommentItem';
import { useMockServer } from '../test-utils/msw';

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
		vi.spyOn(common, "isAdmin").mockResolvedValue(true); // User is admin in this case.

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
	});
});

describe('Comment render failed when network error on dev server', () => {
	useMockServer(() => mock.devServerNetworkError);

	test('render failed when network error on dev server', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<Comment />);
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

		// Failed server: GET returns 500 → error UI (no comment list). Open form via the
		// failure-path toggle (same "N comment" button renders 0 when GET fails).
		// To reach the post-fail flow directly, open the form then populate name/comment.
		const toggle = await screen.findByText(/comment/);
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

		const toggle = await screen.findByText(/comment/);
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
			const firstArg = reportErrorSpy.mock.calls[0]![0];
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
