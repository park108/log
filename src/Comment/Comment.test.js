import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock';
import * as common from '../common/common';
import Comment from './Comment';
import CommentItem from './CommentItem';

console.log = jest.fn();
console.error = jest.fn();

test('render comment list and post comment correctly on dev server', async () => {

	mock.devServerOk.listen();
	jest.spyOn(window, 'alert').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
	});

	process.env.NODE_ENV = 'development';
	common.isAdmin = jest.fn().mockResolvedValue(true); // User is admin in this case.

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

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});

test('render failed when internal error on dev server', async () => {

	mock.devServerFailed.listen();

	process.env.NODE_ENV = 'development';

	render(<Comment timestamp={1655302060414} />);

	mock.devServerFailed.resetHandlers();
	mock.devServerFailed.close();
});

test('render failed when network error on dev server', async () => {

	mock.devServerNetworkError.listen();

	process.env.NODE_ENV = 'development';

	render(<Comment timestamp={1655302060414} />);

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});

test('render comment list and post comment failed on prod server', async () => {

	mock.prodServerOk.listen();
	jest.spyOn(window, 'alert').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
	});

	process.env.NODE_ENV = 'production';

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

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();

	// Change server status to failed
	mock.prodServerFailed.listen();

	// Failed!
	jest.useFakeTimers();

	const submitButton4 = await screen.findByText("Submit Comment");
	expect(submitButton4).toBeDefined();
	fireEvent.click(submitButton4);

	const toasterMessage = await screen.findByText("The comment posted failed.");

	act(() => {
		jest.runAllTimers();
	});

	expect(toasterMessage).toBeDefined();

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();

	// Change server status to network error
	mock.prodServerNetworkError.listen();

	// Add comment again
	const textArea2 = await screen.findByPlaceholderText("Write your comment");
	expect(textArea2).toBeDefined();
	fireEvent.change(textArea2, {target: {value: 'Test comment'}});

	// Failed!
	const submitButton5 = await screen.findByText("Submit Comment");
	expect(submitButton5).toBeDefined();
	fireEvent.click(submitButton5);

	const toasterMessage2 = await screen.findByText("The comment posted failed for network issue.");

	act(() => {
		jest.runAllTimers();
	});

	expect(toasterMessage2).toBeDefined();
	
	jest.useRealTimers();

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
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