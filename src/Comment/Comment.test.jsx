import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock';
import * as common from '../common/common';
import Comment from './Comment';
import CommentItem from './CommentItem';
import { useMockServer } from '../test-utils/msw';

console.log = vi.fn();
console.error = vi.fn();

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

		render(<Comment timestamp={1655302060414} />);

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
		const firstReplyButton = replyButtons[0];

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

		render(<Comment timestamp={1655302060414} />);
	});
});

describe('Comment render failed when network error on dev server', () => {
	useMockServer(() => mock.devServerNetworkError);

	test('render failed when network error on dev server', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<Comment timestamp={1655302060414} />);
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

		render(<Comment timestamp={1655302060414} />);

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

		render(<Comment timestamp={1655302060414} />);

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

		render(<Comment timestamp={1655302060414} />);

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
		/>
	);
	const messageText = screen.getByText("🥷 Hidden Message 🥷");
	expect(messageText).toBeInTheDocument();
});
